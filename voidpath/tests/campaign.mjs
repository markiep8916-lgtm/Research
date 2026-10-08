// Campaign balance simulator (TECH_PLAN 10.4, 11.7): `npm run balance [-- --check] [options]`.
// Node only: registers every pure content module (src/content/data.js) and plays each chapter's
// critical path with the human-like policy (tests/policy.mjs).
//
// For each chapter with a ROUTE below:
//   route    R seeded playthroughs from buildJumpState(chapter) (the chapter's start level and kit):
//            scripted fights, zone fights rolled from the zone tables, party joins, Med-Station
//            rests, chests (the chapter's maps; gear goes on through Optimize), shopping (weapon
//            upgrades, a consumable restock, armor) and the boss. HP and EP carry between fights and
//            field items patch the party up like a person would. XP, credits and levels accumulate.
//   regular  every encounter of each zone the route visits, and every scripted fight: N
//            fresh-party battles with the party, levels, gear and bestiary the reference route has
//            at that point (the zone's middle fight)
//   bosses   N battles at the chapter's end level after a rest, with the reference route's gear
//   economy  credits earned against one weapon upgrade per member plus a consumable restock
//   kits     the next chapter's kit (REG.kits) against the gear and credits the route ends with
//   report   mechanic frequencies per boss and zone: telegraphs (lock-on, charge) answered by Defend
//            or cancelled by a Break, dives and the attack that follows them, enemy heals, summons,
//            ultimates awakened and used on a Break
//
// Content a chapter needs that no location has registered yet (zones, encounters, enemy kinds,
// boss scripts, the binding gear chests of TECH_PLAN 5.5) comes from PLACEHOLDERS, written from the
// plan (7.8, 7.9, 12.5) with statLine; the report lists every placeholder id it used.
//
// Options:
//   --check                 exit 1 when a target fails
//   --chapter <id>          only that chapter (repeatable)
//   --n <battles>           per encounter (default 120; bosses play max(400, 3n))
//   --runs <playthroughs>   route runs (default 80)
//   --placeholders          use the placeholders even where content exists (tune against the plan)
//   --try <enc>=<kind,...>  what-if formation for an encounter (repeatable), for content owners
//   --verbose               one row per encounter
//
// Targets (--check, 10.4): regular fights win >= 98%, median 2-4 rounds, 15-35% party HP lost;
// bosses win 85-95% in a median of 6-10 rounds (Warden 10-14 across both forms); the route has
// 8-12 fights and reaches the next chapter's start level +-1; the credits a chapter earns buy one
// weapon upgrade per member (the cheapest better weapon its shops sell, none for a member who finds
// one) plus a restock of the consumables it used; Severance and Gardener heals cancelled by a Break
// in 30-70% of casts. Deviation: regular fights run at the level the route reaches each zone (the
// plan's "chapter level"), not only at the chapter's start and end levels.

import { registerAllData, REG } from '../src/content/data.js';
import { applyBalance, statLine } from '../src/content/balance.js';
import { ENEMIES, ENCOUNTERS, ENCOUNTER_TABLES, ITEMS, SKILLS } from '../src/battle/data.js';
import { BOSS_SCRIPTS, registerBossScript } from '../src/battle/scripts.js';
import { BattleModel } from '../src/battle/model.js';
import { gameState, healParty, joinParty, addItem, useItemOutOfBattle, itemCount } from '../src/core/state.js';
import { optimize, equip, canEquip, ULTIMATES } from '../src/core/progression.js';
import { shopStock, buy } from '../src/core/shop.js';
import { buildJumpState, applyJumpState, setMemberLevel } from '../src/story/jump.js';
import { CHAPTERS, chapterDef } from '../src/content/chapters.js';
import { makeRng } from '../src/core/util.js';
import { policyAction, observe } from './policy.mjs';

// ------------------------------------------------------------------ options

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] != null ? args[i + 1] : def;
};
const CHECK = args.includes('--check');
const VERBOSE = args.includes('--verbose');
const FORCE_PLACEHOLDERS = args.includes('--placeholders');
const N = Math.max(10, Number(opt('--n', 120)) || 120);
const RUNS = Math.max(10, Number(opt('--runs', 80)) || 80);
const ONLY = args.flatMap((a, i) => (args[i - 1] === '--chapter' ? [a] : []));
const TRY = args.flatMap((a, i) => (args[i - 1] === '--try' ? [a.split('=')] : []));
const BOSS_N = Math.max(400, N * 3);   // boss win rates need the bigger sample
const MAX_ROUNDS = 40;
const REF_SEED = 7;

const TARGETS = {
  regular: { win: 0.98, rounds: [2, 4], hpLost: [0.15, 0.35] },
  boss: { win: [0.85, 0.95], rounds: [6, 10] },
  bossRounds: { heart_boss_warden: [10, 14] },
  fights: [8, 12],
  levelSlack: 1,
  cancel: [0.3, 0.7],
};
// Break-cancel windows (10.4): encounter -> the boss kind and the telegraph its Breaks should cancel
// (the Gardener's Photosynthesis is assumed to be a charge; bind it to C4's design in C-beta).
const CANCEL_CHECKS = {
  vault_boss_echo: { kind: 'echo', mech: 'charge', label: 'Severance cancelled by a Break' },
  arb_boss_gardener: { kind: 'gardener', mech: 'charge', label: 'Gardener heals cancelled by a Break' },
};

// ------------------------------------------------------------------ critical paths (WRITING.md 5.2-5.3)

// Steps: { battle } scripted fight; { zone, fights } random fights rolled from the zone table;
// { join } cs.join(member) at the default level; { rest: mapId } a Med-Station or inn of that map
// on the way (skipped while the map has none); { chests: [mapId] } every chest of those maps that
// belongs to the chapter; { shop: [shopId] } see shopVisit; { boss } the boss after a rest.
const ROUTES = {
  prologue: [
    { battle: 'pro_tutorial' },
    { join: 'sera' },
    { rest: 'halcyon' },
    { zone: 'pro_corridor', fights: 2 },
    { battle: 'pro_orion_rescue' },
    { join: 'orion' },
    { zone: 'pro_engineering', fights: 2 },
    { chests: ['halcyon'] },
    { shop: ['fabricator'] },
    { rest: 'halcyon' },
    { join: 'nyx' },
    { battle: 'pro_sentinel_squad' },
    { boss: 'pro_boss_sentinel' },
  ],
  ch1: [
    { shop: ['fabricator', 'ruse'] },
    { zone: 'shoals_tunnels', fights: 3 },
    { chests: ['shoals'] },
    { zone: 'shoals_deep', fights: 3 },
    { zone: 'meridian_spine', fights: 4 },
    { chests: ['meridian'] },
    { boss: 'shoals_boss_maw' },
    { shop: ['ruse', 'fabricator'] },
  ],
};

// Consumables a person tops up to at every shop, by role: the essentials before any gear, the
// rest of the restock after the weapons.
const ESSENTIALS = { heal: 3, ep: 1, revive: 1, cure: 1 };
const RESTOCK = { heal: 5, ep: 3, revive: 2, cure: 2 };

// ------------------------------------------------------------------ placeholders (TECH_PLAN 7.8, 7.9)

const act = (id, name, kind, extra) => ({
  id, name, kind, power: 0, type: null, target: 'one', anim: 'enemyShot', weight: 0, desc: name, ...extra,
});
const shot = (id, name, type, power, weight, extra = {}) => act(id, name, 'attack', { type, power, weight, ...extra });
const foe = (kind, name, art, line, extra) => ({ kind, name, art, ...line, drops: [], ...extra });
const enc = (id, enemies, extra = {}) => ({ id, enemies, backdrop: 'corridor', boss: false, canFlee: true, music: 'battle', ...extra });
const bossEnc = (id, enemies, extra = {}) => enc(id, enemies, { boss: true, canFlee: false, music: 'boss', ...extra });

const PLACEHOLDERS = {
  prologue: {
    enemies: {
      pro_drone: foe('pro_drone', 'Sec-Drone', 'drone', statLine(2, 'standard'), {
        shield: 2, weaknesses: ['rifle', 'lance', 'volt'],
        actions: [
          shot('pro_laser_bolt', 'Laser Bolt', 'thermal', 1.1, 70),
          act('pro_target_lock', 'Target Lock', 'debuff', { anim: 'enemyBeam', weight: 30, effect: { stats: ['def'], stage: -1, turns: 2 } }),
        ],
        drops: [{ id: 'medigel', chance: 0.2, n: 1 }],
      }),
      pro_crawler: foe('pro_crawler', 'Hull Crawler', 'crawler', statLine(4, 'brute'), {
        shield: 3, weaknesses: ['blade', 'gauntlet', 'thermal', 'cryo'],
        actions: [
          shot('pro_rend', 'Rend', 'blade', 1.2, 60, { anim: 'enemyMelee' }),
          shot('pro_acid_spit', 'Acid Spit', 'void', 0.7, 40, { anim: 'enemySpit', effect: { stats: ['def'], stage: -1, turns: 2 } }),
        ],
        drops: [{ id: 'medigel', chance: 0.3, n: 1 }, { id: 'ether', chance: 0.1, n: 1 }],
      }),
      pro_turret: foe('pro_turret', 'Aegis Turret', 'turret', statLine(5, 'armored'), {
        shield: 4, weaknesses: ['lance', 'gauntlet', 'cryo', 'void'],
        actions: [
          shot('pro_suppressive_fire', 'Suppressive Fire', 'rifle', 0.7, 40, { target: 'all' }),
          shot('pro_piercing_round', 'Piercing Round', 'rifle', 1.4, 60),
        ],
        drops: [{ id: 'ether', chance: 0.25, n: 1 }],
      }),
      sentinel_mk1: foe('sentinel_mk1', 'Sentinel Mk-I', 'sentinel_mk1', statLine(6, 'standard'), {
        shield: 3, weaknesses: ['blade', 'volt', 'photon'],
        actions: [
          shot('mk1_burst', 'Pulse Burst', 'thermal', 1.0, 65),
          act('mk1_charge', 'Charge', 'charge', { anim: 'enemyCharge', weight: 35, cooldown: 3, fires: 'mk1_heavy_shot',
            telegraph: 'Sentinel Mk-I is charging...' }),
          shot('mk1_heavy_shot', 'Heavy Shot', 'photon', 2.1, 0, { anim: 'enemyBeam' }),
        ],
        drops: [{ id: 'medigel', chance: 0.25, n: 1 }],
      }),
      pro_sentinel: foe('pro_sentinel', 'SENTINEL', 'sentinel', statLine(7, 'boss'), {
        boss: true, ai: 'sentinel', shield: 5, maxShieldCap: 9, actionsPerRound: 2,
        weaknesses: ['lance', 'rifle', 'volt', 'photon'],
        actions: [
          shot('plasma_cannon', 'Plasma Cannon', 'thermal', 1.5, 50),
          shot('sweep_laser', 'Sweep Laser', 'photon', 0.85, 38, { target: 'all', anim: 'enemyBeam' }),
          act('overcharge', 'Overcharge', 'buff', { target: 'self', anim: 'enemyCharge', weight: 12,
            effect: { stats: ['atk', 'mag'], stage: 1, turns: 3 } }),
          act('lock_on', 'Lock-On', 'lockOn', { anim: 'enemyCharge' }),
          shot('annihilator_beam', 'Annihilator Beam', 'void', 3.2, 0, { anim: 'enemyBeam' }),
        ],
        drops: [{ id: 'revive', chance: 1, n: 1 }],
      }),
    },
    encounters: {
      pro_tutorial: enc('pro_tutorial', ['pro_drone'], { canFlee: false }),
      pro_orion_rescue: enc('pro_orion_rescue', ['pro_drone', 'pro_drone'], { canFlee: false, backdrop: 'engineering' }),
      pro_sentinel_squad: enc('pro_sentinel_squad', ['sentinel_mk1', 'sentinel_mk1', 'sentinel_mk1'], { canFlee: false }),
      pro_boss_sentinel: bossEnc('pro_boss_sentinel', ['pro_sentinel'], { backdrop: 'bridge' }),
      pro_c_drone: enc('pro_c_drone', ['pro_drone']),
      pro_c_drones: enc('pro_c_drones', ['pro_drone', 'pro_drone']),
      pro_c_crawler: enc('pro_c_crawler', ['pro_crawler']),
      pro_c_mixed: enc('pro_c_mixed', ['pro_crawler', 'pro_drone']),
      pro_e_crawlers: enc('pro_e_crawlers', ['pro_crawler', 'pro_crawler'], { backdrop: 'engineering' }),
      pro_e_turret: enc('pro_e_turret', ['pro_drone', 'pro_turret'], { backdrop: 'engineering' }),
      pro_e_mixed: enc('pro_e_mixed', ['pro_crawler', 'pro_drone', 'pro_drone'], { backdrop: 'engineering' }),
      pro_e_bunker: enc('pro_e_bunker', ['pro_turret', 'pro_crawler'], { backdrop: 'engineering' }),
    },
    zones: {
      pro_corridor: ['pro_c_drone', 'pro_c_drones', 'pro_c_crawler', 'pro_c_mixed'],
      pro_engineering: ['pro_e_crawlers', 'pro_e_turret', 'pro_e_mixed', 'pro_e_bunker'],
    },
    chests: [{ map: 'halcyon', item: 'eq_x_stim_chip' }],
  },
  ch1: {
    enemies: {
      ice_mite: foe('ice_mite', 'Ice Mite', 'ice_mite', statLine(8, 'swarm'), {
        shield: 1, weaknesses: ['thermal', 'blade'],
        actions: [shot('mite_bite', 'Frost Bite', 'blade', 0.9, 70, { anim: 'enemyMelee' }), shot('mite_spray', 'Rime Spray', 'cryo', 0.75, 30, { anim: 'enemySpit' })],
        drops: [{ id: 'medigel', chance: 0.1, n: 1 }],
      }),
      void_eel: foe('void_eel', 'Void Eel', 'void_eel', statLine(9, 'standard'), {
        shield: 3, weaknesses: ['thermal', 'lance', 'rifle'], untargetableStyle: 'submerge',
        actions: [
          shot('eel_lash', 'Void Lash', 'void', 1.1, 70, { anim: 'enemyMelee' }),
          act('eel_dive', 'Dive', 'submerge', { anim: 'enemyCharge', weight: 30, cooldown: 3, untargetable: 1, then: 'eel_surge' }),
          shot('eel_surge', 'Surge', 'cryo', 1.4, 0, { anim: 'enemyMelee' }),
        ],
        drops: [{ id: 'ether', chance: 0.15, n: 1 }],
      }),
      rime_golem: foe('rime_golem', 'Rime Golem', 'rime_golem', statLine(10, 'armored'), {
        shield: 5, weaknesses: ['thermal', 'gauntlet', 'volt'],
        actions: [
          shot('golem_slam', 'Glacier Slam', 'gauntlet', 1.3, 75, { anim: 'enemyMelee' }),
          act('frost_shell', 'Frost Shell', 'buff', { target: 'self', anim: 'enemyCharge', weight: 25, effect: { stats: ['def', 'res'], stage: 1, turns: 3 } }),
        ],
        drops: [{ id: 'medigel', chance: 0.3, n: 1 }],
      }),
      salvage_bot: foe('salvage_bot', 'Salvage Bot', 'salvage_bot', statLine(9, 'caster'), {
        shield: 3, weaknesses: ['volt', 'rifle', 'cryo'],
        actions: [
          shot('bot_zap', 'Arc Welder', 'volt', 1.05, 65, { anim: 'enemyBeam' }),
          act('bot_repair', 'Self-Repair', 'heal', { target: 'self', anim: 'enemyCharge', weight: 35, cooldown: 2, heal: 0.25 }),
        ],
        drops: [{ id: 'ether', chance: 0.2, n: 1 }],
      }),
      maw: foe('maw', 'The Maw', 'maw', statLine(12, 'boss'), {
        boss: true, ai: 'basic', script: 'maw', shield: 6, maxShieldCap: 12, actionsPerRound: 2,
        weaknesses: ['thermal', 'lance', 'rifle'],
        actions: [
          shot('ice_breath', 'Ice Breath', 'cryo', 0.8, 40, { target: 'all', anim: 'enemyBeam', fx: 'maw.ice_breath' }),
          shot('tail_slam', 'Tail Slam', 'blade', 1.35, 60, { anim: 'enemyMelee', effect: { stats: ['def'], stage: -1, turns: 2 } }),
          act('submerge', 'Submerge', 'submerge', { anim: 'enemyCharge', untargetable: 1, then: 'breach' }),
          shot('breach', 'Breach', 'void', 1.25, 0, { target: 'all', anim: 'enemyBeam', fx: 'maw.breach' }),
        ],
        drops: [{ id: 'revive', chance: 1, n: 1 }],
      }),
    },
    encounters: {
      shoals_mites: enc('shoals_mites', ['ice_mite', 'ice_mite', 'ice_mite', 'ice_mite']),
      shoals_eel_mites: enc('shoals_eel_mites', ['void_eel', 'ice_mite', 'ice_mite']),
      shoals_eels: enc('shoals_eels', ['void_eel', 'void_eel']),
      shoals_bot_mites: enc('shoals_bot_mites', ['salvage_bot', 'ice_mite', 'ice_mite']),
      shoals_golem: enc('shoals_golem', ['rime_golem']),
      shoals_golem_mites: enc('shoals_golem_mites', ['rime_golem', 'ice_mite', 'ice_mite']),
      shoals_eel_bot: enc('shoals_eel_bot', ['void_eel', 'salvage_bot']),
      shoals_eels_mite: enc('shoals_eels_mite', ['void_eel', 'void_eel', 'ice_mite']),
      meridian_bots: enc('meridian_bots', ['salvage_bot', 'salvage_bot']),
      meridian_golem_bot: enc('meridian_golem_bot', ['rime_golem', 'salvage_bot']),
      meridian_eel_golem: enc('meridian_eel_golem', ['void_eel', 'rime_golem']),
      meridian_mites_bot: enc('meridian_mites_bot', ['ice_mite', 'ice_mite', 'ice_mite', 'salvage_bot']),
      shoals_boss_maw: bossEnc('shoals_boss_maw', ['maw'], { backdrop: 'maw_lair' }),
    },
    zones: {
      shoals_tunnels: ['shoals_mites', 'shoals_eel_mites', 'shoals_eels', 'shoals_bot_mites'],
      shoals_deep: ['shoals_golem', 'shoals_golem_mites', 'shoals_eel_bot', 'shoals_eels_mite'],
      meridian_spine: ['meridian_bots', 'meridian_golem_bot', 'meridian_eel_golem', 'meridian_mites_bot'],
    },
    bossScripts: {
      // TECH_PLAN 7.3's example: a telegraphed dive every third round, Nyx awakens at 50%.
      maw: {
        thresholds: [0.5],
        chooseAction(api, e) {
          if (api.round > 1 && api.round % 3 === 0 && !e.broken && !api.mem.dove) {
            api.mem.dove = true;
            api.telegraph(e.id, null, 'The ice groans beneath the squad...');
            return { actionId: 'submerge' };
          }
          if (api.round % 3 !== 0) api.mem.dove = false;
          return null;
        },
        onThreshold(api, e) {
          api.say('NYX', 'Great-grandma fought worse than you. I read her log.');
          api.grantUltimate('nyx');
          api.status(e.id, { stats: ['atk'], stage: 1, turns: 3 });
        },
      },
    },
    chests: [
      { map: 'shoals', item: 'eq_x_frost_charm' },
      { map: 'meridian', item: 'eq_w_nyx_3' },
      { map: 'meridian', item: 'eq_x_varo_compass' },
    ],
  },
};

// ------------------------------------------------------------------ setup

registerAllData();
for (const [id, kinds] of TRY) {
  if (!ENCOUNTERS[id] || !kinds) throw new Error(`campaign: --try needs <known encounter>=<kind,...> ("${id}")`);
  ENCOUNTERS[id] = { ...ENCOUNTERS[id], enemies: kinds.split(',') };
}
const placeholderIds = {};   // chapter -> [ 'enemy:ice_mite', ... ]
const placeholderChests = {}; // chapter -> [{ map, item }]

// Placeholders fill only what the chapter's route needs and no location registered: a missing
// zone or scripted fight brings its placeholder encounters, those bring their enemy kinds, and an
// enemy with an unregistered boss script brings that script. --placeholders forces all of them.
function installPlaceholders(chapter) {
  const p = PLACEHOLDERS[chapter] || {};
  const used = (placeholderIds[chapter] = []);
  placeholderChests[chapter] = [];
  const missing = (table, id) => FORCE_PLACEHOLDERS || !table[id];
  const addEnemy = (kind) => {
    if (!p.enemies?.[kind] || !missing(ENEMIES, kind)) return;
    ENEMIES[kind] = p.enemies[kind];
    used.push(`enemy:${kind}`);
  };
  const addEncounter = (id) => {
    if (!p.encounters?.[id] || !missing(ENCOUNTERS, id)) return;
    ENCOUNTERS[id] = p.encounters[id];
    used.push(`encounter:${id}`);
    for (const kind of p.encounters[id].enemies) addEnemy(kind);
  };
  for (const step of ROUTES[chapter]) {
    const zone = step.zone;
    if (zone && p.zones?.[zone] && missing(ENCOUNTER_TABLES, zone)) {
      ENCOUNTER_TABLES[zone] = p.zones[zone];
      used.push(`zone:${zone}`);
      for (const id of new Set(p.zones[zone])) addEncounter(id);
    }
    if (step.battle || step.boss) addEncounter(step.battle || step.boss);
  }
  for (const [id, script] of Object.entries(p.bossScripts || {})) {
    const wanted = Object.values(ENEMIES).some((d) => d.script === id);
    if (!wanted || !(FORCE_PLACEHOLDERS || !BOSS_SCRIPTS[id])) continue;
    registerBossScript(id, script);
    used.push(`script:${id}`);
  }
  const given = new Set(allChests().map((c) => c.item));
  for (const c of p.chests || []) {
    if (given.has(c.item)) continue;
    placeholderChests[chapter].push(c);
    used.push(`chest:${c.map}:${c.item}`);
  }
}

// Every registered chest: base map chests belong to the owning location's chapter, `extends`
// chests to the extending location's chapter.
function allChests() {
  const out = [];
  for (const [mapId, def] of Object.entries(REG.maps)) {
    const loc = Object.values(REG.locations).find((l) => l.maps?.[mapId]);
    for (const c of def.chests || []) out.push({ ...c, map: mapId, chapter: loc?.chapter });
  }
  for (const [mapId, list] of Object.entries(REG.extends)) {
    for (const { chapter, ext } of list) for (const c of ext.chests || []) out.push({ ...c, map: mapId, chapter });
  }
  return out;
}

// ------------------------------------------------------------------ helpers

const hasMedStation = (mapId) => (REG.maps[mapId]?.interactables || []).some((i) => i.kind === 'med');

const sum = (list, f = (x) => x) => list.reduce((s, x) => s + f(x), 0);
const mean = (list, f) => (list.length ? sum(list, f) / list.length : 0);
const median = (list) => {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};
const pct = (x) => `${(100 * x).toFixed(0)}%`;
const pct1 = (x) => `${(100 * x).toFixed(1)}%`;
const clone = (o) => JSON.parse(JSON.stringify(o));
const inRange = (v, [lo, hi]) => v >= lo && v <= hi;
const ultimateIds = new Set(Object.values(ULTIMATES));

function startChapter(chapter) {
  applyJumpState(buildJumpState(chapter, REG));
  gameState.story.chapter = chapter;
}

function snapshot() {
  return {
    party: gameState.party.map((m) => m.id),
    levels: Object.fromEntries(gameState.party.map((m) => [m.id, m.level])),
    equip: Object.fromEntries(gameState.party.map((m) => [m.id, { ...m.equip }])),
    items: Object.fromEntries(Object.entries(gameState.inventory).filter(([id]) => !ITEMS[id]?.equip && !ITEMS[id]?.key)),
    flags: { ...gameState.flags },
    bestiary: clone(gameState.bestiary),
  };
}

// The party of a snapshot at full HP/EP; `level` overrides every member's level.
function restore(chapter, snap, level) {
  const js = buildJumpState(chapter, REG);
  Object.assign(js, {
    party: [...snap.party], leader: snap.party[0], level: level ?? 1,
    equip: clone(snap.equip), items: { ...snap.items }, flags: { ...snap.flags },
  });
  applyJumpState(js);
  if (level == null) for (const m of gameState.party) setMemberLevel(m, snap.levels[m.id]);
  Object.assign(gameState.bestiary, clone(snap.bestiary));
  gameState.story.chapter = chapter;
}

// Field patch-up between fights: Revive Kits on the fallen, Medi-Gels below half HP, an Ether
// below a quarter EP (a cautious person keeps one of each).
function patchUp(used) {
  const use = (id, memberId) => {
    if (!useItemOutOfBattle(id, memberId).ok) return false;
    used[id] = (used[id] || 0) + 1;
    return true;
  };
  for (const m of gameState.party) {
    if (!m.alive) use(itemCount('revive_plus') ? 'revive_plus' : 'revive', m.id);
    const gels = ['medigel_plus', 'medigel'];
    while (m.alive && m.hp < m.maxHp * 0.5) {
      const id = gels.find((g) => itemCount(g) > 0);
      if (!id || !use(id, m.id)) break;
    }
    if (m.alive && m.ep < m.maxEp * 0.25 && itemCount('ether') > 1) use('ether', m.id);
  }
}

// A person hands out new gear first to whoever deals the type it boosts (Varo's Compass to Nyx),
// then presses Optimize for everyone (the Equip tab's button), leader first.
function optimizeParty() {
  for (const [id, n] of Object.entries(gameState.inventory)) {
    const boost = Object.keys(ITEMS[id]?.equip?.boost || {});
    if (!(n > 0) || !boost.length) continue;
    const m = gameState.party.find((p) => boost.every((t) => dealt(p).has(t)) && improves(p, id));
    if (m) equip(m, ITEMS[id].equip.slot, id);
  }
  for (const m of gameState.party) {
    const best = optimize(m);
    for (const slot of ['weapon', 'armor', 'accessory']) if (best[slot] && best[slot] !== m.equip[slot]) equip(m, slot, best[slot]);
  }
}

// Does `itemId` beat what the member wears in its slot (by the Optimize score)?
function improves(m, itemId) {
  const slot = ITEMS[itemId]?.equip?.slot;
  if (!slot || m.equip[slot] === itemId || !canEquip(m, itemId)) return false;
  return optimize(m, { [itemId]: 1 })[slot] === itemId;
}

// Damage types a member deals: weapons and attack skills.
function dealt(m) {
  return new Set([...m.weapons, ...m.skills.filter((id) => SKILLS[id]?.kind === 'attack').map((id) => SKILLS[id].type)]);
}

// Restock: the best heal, ether, revive and cure in stock topped up to `targets`.
function restockList(stock, targets) {
  const pick = (pred, better) => [...stock.keys()].filter((id) => pred(ITEMS[id])).sort(better)[0];
  const fx = (id) => ITEMS[id].effect || {};
  const roles = {
    heal: pick((it) => it.target === 'ally' && it.effect?.heal, (a, b) => fx(b).heal - fx(a).heal),
    ep: pick((it) => it.target === 'ally' && it.effect?.ep, (a, b) => fx(b).ep - fx(a).ep),
    revive: pick((it) => it.target === 'koAlly', (a, b) => stock.get(a) - stock.get(b)),
    cure: pick((it) => it.effect?.cleanse, (a, b) => stock.get(a) - stock.get(b)),
  };
  const out = [];
  for (const [role, id] of Object.entries(roles)) {
    if (!id) continue;
    const n = targets[role] - itemCount(id);
    if (n > 0) out.push({ item: id, n, price: stock.get(id) });
  }
  return out;
}

function stockOf(shopIds) {
  const stock = new Map();
  for (const id of shopIds) {
    const shop = REG.shops[id];
    if (!shop) continue;
    for (const s of shopStock(shop)) if (s.price > 0 && (!stock.has(s.item) || s.price < stock.get(s.item))) stock.set(s.item, s.price);
  }
  return stock;
}

// A person at the counter: the essentials, the best weapon upgrade each member can afford, the
// rest of the restock, then armor upgrades and an accessory for an empty slot with what is left.
function shopVisit(shopIds, st) {
  const stock = stockOf(shopIds);
  const spend = (id, n, price) => {
    if (!buy(id, n, price).ok) return false;
    st.spent += n * price;
    return true;
  };
  const restock = (targets) => {
    for (const b of restockList(stock, targets)) {
      const n = Math.min(b.n, Math.floor(gameState.credits / b.price));
      if (n > 0) spend(b.item, n, b.price);
    }
  };
  const upgrade = (slot, emptyOnly = false) => {
    for (const m of gameState.party) {
      if (emptyOnly && m.equip[slot]) continue;
      const affordable = [...stock].filter(([id, price]) => price <= gameState.credits && ITEMS[id].equip?.slot === slot && improves(m, id));
      const pick = optimize(m, Object.fromEntries(affordable.map(([id]) => [id, 1])))[slot];
      if (!affordable.some(([id]) => id === pick) || !spend(pick, 1, stock.get(pick))) continue;
      equip(m, slot, pick);
      if (slot === 'weapon') st.boughtWeapons.push(`${m.id}:${pick}`);
    }
  };
  restock(ESSENTIALS);
  upgrade('weapon');
  restock(RESTOCK);
  upgrade('armor');
  upgrade('accessory', true);
}

function collectChests(chapter, mapIds, st) {
  const list = [...allChests(), ...placeholderChests[chapter].map((c) => ({ ...c, chapter, n: 1 }))]
    .filter((c) => c.chapter === chapter && mapIds.includes(c.map));
  for (const c of list) {
    if (c.credits) {
      gameState.credits += c.credits;
      st.earned += c.credits;
    }
    if (!c.item || ITEMS[c.item]?.key) continue;
    if (!ITEMS[c.item]) {
      console.warn(`campaign: chest ${c.map}:${c.id} holds unknown item "${c.item}"`);
      continue;
    }
    addItem(c.item, c.n || 1);
    if (ITEMS[c.item].equip?.slot === 'weapon') st.chestWeapons.push(c.item);
  }
  optimizeParty();
}

// ------------------------------------------------------------------ battles and mechanic tallies

function tallyFor(tally, kind) {
  return (tally[kind] ||= {
    battles: 0, lockOn: 0, lockFired: 0, lockCancel: 0, charge: 0, chargeFired: 0, chargeCancel: 0,
    dives: 0, diveFollow: 0, telegraphHits: 0, telegraphDefended: 0, heals: 0, summons: 0, breaks: 0,
  });
}

// Plays one battle with gameState.party (mutated in place). `tally`: mechanic counters by enemy kind.
function fight(encounterId, seed, tally = null) {
  const m = new BattleModel({ party: gameState.party, encounterId, rng: makeRng(seed) });
  const memo = new Map();
  const maxHp = sum(m.party, (p) => p.maxHp);
  const hp0 = sum(m.party, (p) => p.hp);
  const out = { items: {}, invalid: 0, ultGranted: 0, ultUsed: 0, ultOnBreak: 0 };
  const feed = (events) => {
    observe(memo, events);
    for (const ev of events) {
      if (tally && ev.type === 'break' && String(ev.targetId).startsWith('e')) tallyFor(tally, m.get(ev.targetId).key).breaks++;
      if (ev.type === 'learn' && ev.ultimate) out.ultGranted++;
    }
    return events;
  };
  if (tally) for (const k of new Set(m.enemies.map((e) => e.key))) tallyFor(tally, k).battles++;
  feed(m.begin());
  for (let guard = 0; guard < 4000 && !m.isOver() && m.round <= MAX_ROUNDS; guard++) {
    feed(m.nextTurn());
    if (m.isOver()) break;
    const actor = m.current;
    if (m.phase === 'enemyTurn') {
      const pend = { lock: actor.lockOnTarget ? actor.lockFires || 'annihilator_beam' : null, charge: actor.charge?.fires, then: actor.then };
      const ev = feed(m.enemyTurn());
      if (tally) tallyEnemy(tally, m, actor, pend, ev);
      continue;
    }
    if (m.phase !== 'playerInput') continue;
    const armed = m.enemies.filter((e) => e.alive && (e.charge || e.lockOnTarget)).map((e) => [e, !!e.charge]);
    const a = { actorId: actor.id, ...policyAction(m, actor.id, memo) };
    const target = a.targetId ? m.get(a.targetId) : null;
    let ev = m.act(a);
    if (ev.length === 1 && ev[0].type === 'message') {
      out.invalid++;
      ev = m.act({ kind: 'defend' });
    }
    feed(ev);
    if (a.kind === 'item') out.items[a.itemId] = (out.items[a.itemId] || 0) + 1;
    if (a.kind === 'skill' && ultimateIds.has(a.skillId)) {
      out.ultUsed++;
      if (target?.broken || ev.some((e) => e.type === 'break')) out.ultOnBreak++;
    }
    if (tally) {
      for (const [e, wasCharge] of armed) {
        if (!e.broken || e.charge || e.lockOnTarget) continue;
        tallyFor(tally, e.key)[wasCharge ? 'chargeCancel' : 'lockCancel']++;
      }
    }
  }
  const result = m.result || 'timeout';
  const hp1 = sum(m.party, (p) => (p.alive ? p.hp : 0));
  let xp = 0;
  let credits = 0;
  if (result === 'victory') {
    ({ xp, credits } = m.rewards());
    m.applyRewards();
  }
  return {
    ...out, result, rounds: m.round, hpLost: (hp0 - hp1) / maxHp, xp, credits,
    kos: m.party.filter((p) => !p.alive).length,
  };
}

function tallyEnemy(tally, m, actor, pend, events) {
  const t = tallyFor(tally, actor.key);
  const action = events.find((e) => e.type === 'action' && e.actorId === actor.id);
  if (!action) return;
  const hitsOn = () => events.filter((e) => e.type === 'hit' && e.actorId === actor.id && !String(e.targetId).startsWith('e'));
  const follow = (fired) => {
    t[fired]++;
    for (const h of hitsOn()) {
      t.telegraphHits++;
      if (m.get(h.targetId)?.defending) t.telegraphDefended++;
    }
  };
  if (action.kind === 'lockOn') t.lockOn++;
  else if (action.kind === 'charge') t.charge++;
  else if (action.kind === 'submerge') t.dives++;
  else if (action.kind === 'summon') t.summons++;
  else if (action.kind === 'heal') t.heals++;
  if (pend.lock && action.actionId === pend.lock) follow('lockFired');
  else if (pend.charge && action.actionId === pend.charge) follow('chargeFired');
  else if (pend.then && action.actionId === pend.then) follow('diveFollow');
}

// ------------------------------------------------------------------ the route

function runRoute(chapter, seed, ref = null) {
  const rng = makeRng(seed);
  startChapter(chapter);
  const st = {
    losses: 0, earned: 0, xp: 0, spent: 0, used: {}, boughtWeapons: [], chestWeapons: [], bossWin: false,
    startWeapons: Object.fromEntries(gameState.party.map((m) => [m.id, m.equip.weapon])),
  };
  let seq = 0;
  const battle = (id, snapKey) => {
    if (ref && snapKey && !ref.snaps[snapKey]) ref.snaps[snapKey] = snapshot();
    let res;
    for (let attempt = 0; attempt < 2; attempt++) {
      const credits = gameState.credits;
      res = fight(id, seed * 131 + seq++);
      for (const [k, n] of Object.entries(res.items)) st.used[k] = (st.used[k] || 0) + n;
      if (res.result === 'victory') {
        st.earned += gameState.credits - credits;
        st.xp += res.xp;
        break;
      }
      st.losses++;
      healParty(); // game over: Retry (scripted) or the last save (field)
    }
    patchUp(st.used);
    return res;
  };
  for (const step of ROUTES[chapter]) {
    if (step.battle) battle(step.battle, `battle:${step.battle}`);
    else if (step.zone) {
      const table = ENCOUNTER_TABLES[step.zone] || [];
      for (let i = 0; i < step.fights && table.length; i++) {
        battle(rng.pick(table), i === step.fights >> 1 ? `zone:${step.zone}` : null);
      }
    } else if (step.join) {
      if (!gameState.party.some((m) => m.id === step.join)) {
        const m = joinParty(step.join);
        st.startWeapons[m.id] = m.equip.weapon;
      }
    } else if (step.rest) {
      if (hasMedStation(step.rest)) healParty();
    } else if (step.chests) collectChests(chapter, step.chests, st);
    else if (step.shop) shopVisit(step.shop, st);
    else if (step.boss) {
      healParty();
      st.bossLevels = gameState.party.map((m) => m.level);
      if (ref) ref.snaps[`boss:${step.boss}`] = snapshot();
      const credits = gameState.credits;
      const res = fight(step.boss, seed * 977 + 3);
      for (const [k, n] of Object.entries(res.items)) st.used[k] = (st.used[k] || 0) + n;
      st.bossWin = res.result === 'victory';
      if (!st.bossWin) {
        st.losses++;
        healParty();
        const again = fight(step.boss, seed * 977 + 4);
        for (const [k, n] of Object.entries(again.items)) st.used[k] = (st.used[k] || 0) + n;
      }
      st.earned += gameState.credits - credits;
      patchUp(st.used);
    }
  }
  st.levels = Object.fromEntries(gameState.party.map((m) => [m.id, m.level]));
  st.endEquip = Object.fromEntries(gameState.party.map((m) => [m.id, { ...m.equip }]));
  st.endCredits = gameState.credits;
  st.endItems = Object.fromEntries(Object.entries(gameState.inventory).filter(([id]) => !ITEMS[id]?.equip && !ITEMS[id]?.key));
  return st;
}

// ------------------------------------------------------------------ chapter report

const failures = [];
function verdict(ok, label, detail) {
  const mark = ok ? 'ok  ' : 'FAIL';
  if (!ok) failures.push(`${label}: ${detail}`);
  console.log(`  ${mark} ${label.padEnd(44)} ${detail}`);
}

// N battles per encounter id; `weights` (the zone table) repeats each result by how often the
// table rolls that encounter, so the group summary matches what a player meets.
function battleGroup(chapter, snap, ids, { level, tally, seedBase, weights = ids, n = N }) {
  const rows = [];
  for (const id of new Set(ids)) {
    const res = [];
    for (let i = 0; i < n; i++) {
      restore(chapter, snap, level);
      res.push(fight(id, seedBase + i * 7919, tally));
    }
    rows.push({ id, res, weight: weights.filter((w) => w === id).length });
  }
  return rows;
}

function summarize(res) {
  const wins = res.filter((r) => r.result === 'victory');
  return {
    win: wins.length / res.length,
    rounds: median(wins.map((r) => r.rounds)),
    hpLost: mean(res, (r) => Math.max(0, r.hpLost)),
    kos: mean(wins, (r) => r.kos),
    invalid: sum(res, (r) => r.invalid),
  };
}

function mechanicLines(tally) {
  const out = [];
  for (const [kind, t] of Object.entries(tally)) {
    const bits = [];
    const per = (n) => (n / t.battles).toFixed(2);
    if (t.lockOn) bits.push(`lock-on ${per(t.lockOn)}/battle (fired ${per(t.lockFired)}, cancelled by a Break ${per(t.lockCancel)})`);
    if (t.charge) bits.push(`charge ${per(t.charge)}/battle (fired ${per(t.chargeFired)}, cancelled by a Break ${pct(t.chargeCancel / t.charge)})`);
    if (t.dives) bits.push(`dives ${per(t.dives)}/battle (blows after a dive ${per(t.diveFollow)})`);
    if (t.telegraphHits) bits.push(`telegraphed hits answered by Defend ${pct(t.telegraphDefended / t.telegraphHits)}`);
    if (t.heals) bits.push(`heals ${per(t.heals)}/battle`);
    if (t.summons) bits.push(`summons ${per(t.summons)}/battle`);
    bits.push(`Breaks ${per(t.breaks)}/battle`);
    out.push(`    ${kind.padEnd(16)} ${bits.join('; ')}`);
  }
  return out;
}

function weaponUpgradeCost(chapter, routeShops, endParty, chestWeapons, startWeapons) {
  const stock = new Map();
  startChapter(chapter);
  for (const [id, price] of stockOf(routeShops)) stock.set(id, price);
  let cost = 0;
  const detail = [];
  for (const id of endParty) {
    const start = startWeapons[id];
    // a member equipped with a found weapon needs no purchase
    if (chestWeapons.some((w) => ITEMS[w].equip.for?.includes(id))) {
      detail.push(`${id} found`);
      continue;
    }
    const probe = { id, equip: { weapon: start, armor: null, accessory: null }, skills: [], weapons: [] };
    const better = [...stock].filter(([w]) => ITEMS[w].equip?.slot === 'weapon' && canEquip(probe, w)
      && optimize(probe, { [w]: 1 }).weapon === w).sort((a, b) => a[1] - b[1]);
    if (!better.length) continue;
    cost += better[0][1];
    detail.push(`${id} ${better[0][0]} ${better[0][1]}`);
  }
  return { cost, detail };
}

function reportChapter(chapter) {
  const def = chapterDef(chapter);
  const route = ROUTES[chapter];
  const next = CHAPTERS[CHAPTERS.findIndex((c) => c.id === chapter) + 1];
  installPlaceholders(chapter);
  applyBalance();
  console.log(`\n=== ${def.kicker}: ${def.title} (${chapter}, levels ${def.levels.join('-')}) ===`);
  const ph = placeholderIds[chapter];
  console.log(ph.length ? `  placeholders: ${ph.join(', ')}` : '  placeholders: none (all content registered)');

  // routes
  const ref = { snaps: {} };
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(runRoute(chapter, 1000 + i * 104729));
  const refRun = runRoute(chapter, REF_SEED, ref);
  const fightsPlanned = sum(route, (s) => (s.battle || s.boss ? 1 : s.zone ? s.fights : 0));
  const members = Object.keys(runs[0].levels);
  const levels = Object.fromEntries(members.map((id) => [id, mean(runs, (r) => r.levels[id])]));
  const nextStart = next ? next.levels[0] : def.levels[1];
  console.log(`  route x${RUNS}: ${fightsPlanned} fights, losses ${sum(runs, (r) => r.losses)}/${RUNS * fightsPlanned}, ` +
    `boss won first try ${pct(mean(runs, (r) => (r.bossWin ? 1 : 0)))}`);
  console.log(`  levels at the boss ${mean(runs, (r) => mean(r.bossLevels || [0], (x) => x)).toFixed(1)} (end level ${def.levels[1]}) ` +
    `after ${mean(runs, (r) => r.xp).toFixed(0)} XP, ` +
    `at the end: ${members.map((id) => `${id} ${levels[id].toFixed(1)}`).join(', ')} (next start ${nextStart})`);
  verdict(inRange(fightsPlanned, TARGETS.fights), 'route fight count (11.7)', `${fightsPlanned} (8-12)`);
  verdict(members.every((id) => Math.abs(levels[id] - nextStart) <= TARGETS.levelSlack), 'levels reach the next start +-1',
    members.map((id) => levels[id].toFixed(1)).join(' / '));

  // regular fights
  const tally = {};
  console.log('  regular fights (fresh party at the route\'s level, gear and bestiary):');
  const groups = [];
  for (const step of route) {
    if (step.zone && ENCOUNTER_TABLES[step.zone]) groups.push({ label: step.zone, snap: ref.snaps[`zone:${step.zone}`], ids: [...ENCOUNTER_TABLES[step.zone]] });
    if (step.battle && ENCOUNTERS[step.battle]) groups.push({ label: step.battle, snap: ref.snaps[`battle:${step.battle}`], ids: [step.battle] });
  }
  for (const g of groups) {
    if (!g.snap) continue;
    const rows = battleGroup(chapter, g.snap, g.ids, { tally, seedBase: 50000 });
    const s = summarize(rows.flatMap((r) => Array.from({ length: r.weight }, () => r.res).flat()));
    const lv = Object.values(g.snap.levels);
    const label = `${g.label} (${g.snap.party.length} at L${Math.min(...lv)}-${Math.max(...lv)})`;
    const ok = s.win >= TARGETS.regular.win && inRange(s.rounds, TARGETS.regular.rounds) && inRange(s.hpLost, TARGETS.regular.hpLost);
    verdict(ok, label, `win ${pct1(s.win)}, median ${s.rounds} rounds, HP lost ${pct(s.hpLost)}, KOs ${s.kos.toFixed(2)}${s.invalid ? `, invalid ${s.invalid}` : ''}`);
    if (VERBOSE || !ok) {
      for (const r of rows) {
        const e = summarize(r.res);
        console.log(`         ${r.id.padEnd(24)} [${ENCOUNTERS[r.id].enemies.join(' ')}] win ${pct1(e.win)} rounds ${e.rounds} HP lost ${pct(e.hpLost)}`);
      }
    }
  }

  // bosses
  const bossTally = {};
  for (const step of route.filter((s) => s.boss)) {
    const snap = ref.snaps[`boss:${step.boss}`];
    if (!snap) continue;
    const res = battleGroup(chapter, snap, [step.boss], { level: def.levels[1], tally: bossTally, seedBase: 90000, n: BOSS_N })[0].res;
    const s = summarize(res);
    const roundsTarget = TARGETS.bossRounds[step.boss] || TARGETS.boss.rounds;
    const gear = snap.party.map((id) => `${id} ${snap.equip[id].weapon || '-'}`).join(', ');
    verdict(inRange(s.win, TARGETS.boss.win) && inRange(s.rounds, roundsTarget), `boss ${step.boss} at L${def.levels[1]}`,
      `win ${pct1(s.win)}, median ${s.rounds} rounds (${roundsTarget.join('-')}), HP lost ${pct(s.hpLost)}, KOs ${s.kos.toFixed(2)}`);
    console.log(`         gear: ${gear}`);
    const granted = mean(res, (r) => (r.ultGranted ? 1 : 0));
    const used = sum(res, (r) => r.ultUsed);
    if (granted || used) {
      console.log(`         ultimate awakened in ${pct(granted)} of battles, used ${(used / res.length).toFixed(2)}/battle, ` +
        `on a Break ${used ? pct(sum(res, (r) => r.ultOnBreak) / used) : '-'}`);
    }
    const cancel = CANCEL_CHECKS[step.boss];
    const t = cancel && bossTally[cancel.kind];
    if (t?.[cancel.mech]) {
      const ratio = t[`${cancel.mech}Cancel`] / t[cancel.mech];
      verdict(inRange(ratio, TARGETS.cancel), cancel.label, `${pct(ratio)} of ${t[cancel.mech]} casts`);
    }
  }

  // economy
  const earned = mean(runs, (r) => r.earned);
  const restock = mean(runs, (r) => sum(Object.entries(r.used), ([id, n]) => n * (ITEMS[id]?.price || 0)));
  const shops = [...new Set(route.flatMap((s) => s.shop || []))];
  const up = weaponUpgradeCost(chapter, shops, Object.keys(refRun.levels), refRun.chestWeapons, refRun.startWeapons);
  verdict(earned >= up.cost + restock, 'credits buy a weapon each + a restock',
    `earned ${earned.toFixed(0)} vs ${up.cost} weapons [${up.detail.join(', ') || 'none for sale'}] + ${restock.toFixed(0)} restock`);
  const bought = {};
  for (const r of runs) for (const w of r.boughtWeapons) bought[w] = (bought[w] || 0) + 1;
  console.log(`         spent ${mean(runs, (r) => r.spent).toFixed(0)}, ends with ${mean(runs, (r) => r.endCredits).toFixed(0)} credits; ` +
    `weapons bought: ${Object.entries(bought).map(([w, n]) => `${w} ${pct(n / RUNS)}`).join(', ') || 'none'}`);
  const usedAvg = {};
  for (const r of runs) for (const [id, n] of Object.entries(r.used)) usedAvg[id] = (usedAvg[id] || 0) + n / RUNS;
  console.log(`         items used per run: ${Object.entries(usedAvg).map(([id, n]) => `${id} ${n.toFixed(1)}`).join(', ') || 'none'}`);

  // kits: the next chapter's starter kit against how the route ends
  if (next && REG.kits[next.id]) {
    const kit = REG.kits[next.id];
    const diffs = [];
    for (const id of members) {
      for (const slot of ['weapon', 'armor', 'accessory']) {
        const counts = {};
        for (const r of runs) counts[r.endEquip[id][slot] || '-'] = (counts[r.endEquip[id][slot] || '-'] || 0) + 1;
        const [mode] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        const k = kit.equip?.[id]?.[slot] || '-';
        if (mode !== k) diffs.push(`${id}.${slot} kit ${k} / route ${mode}`);
      }
    }
    const credits = mean(runs, (r) => r.endCredits);
    const items = {};
    for (const r of runs) for (const [id, n] of Object.entries(r.endItems)) items[id] = (items[id] || 0) + n / RUNS;
    const fmt = (o) => Object.entries(o).map(([id, n]) => `${id} ${Number.isInteger(n) ? n : n.toFixed(1)}`).join(', ');
    console.log(`  kit ${next.id}: credits ${kit.credits} / route ${credits.toFixed(0)}; gear ${diffs.length ? diffs.join(', ') : 'matches the route'}`);
    console.log(`         items: kit ${fmt(kit.items || {})} / route ${fmt(items)}`);
  }

  // mechanic frequencies
  console.log('  mechanics (regular fights):');
  for (const line of mechanicLines(tally)) console.log(line);
  console.log('  mechanics (bosses):');
  for (const line of mechanicLines(bossTally)) console.log(line);
}

// ------------------------------------------------------------------ main

console.log(`VOIDPATH campaign balance: ${N} battles per encounter, ${RUNS} route runs${FORCE_PLACEHOLDERS ? ', placeholders forced' : ''}` +
  TRY.map(([id, kinds]) => `, trying ${id} = ${kinds}`).join(''));
for (const c of CHAPTERS) {
  if (!ROUTES[c.id] || (ONLY.length && !ONLY.includes(c.id))) continue;
  reportChapter(c.id);
}
if (failures.length) {
  console.log(`\n${failures.length} target(s) missed:`);
  for (const f of failures) console.log(`  - ${f}`);
}
if (CHECK && failures.length) process.exit(1);
console.log(CHECK ? '\nbalance --check passed' : '');
