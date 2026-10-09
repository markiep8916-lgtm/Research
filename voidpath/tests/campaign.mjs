// Campaign balance simulator (TECH_PLAN 10.4, 11.7; gate G2 C10-1..C10-3): `npm run balance [-- --check] [options]`.
// Node only: registers every pure content module (src/content/data.js) and plays each chapter's
// critical path with the human-like policy (tests/policy.mjs).
//
// For each chapter with a ROUTE below:
//   geometry  the fights the maps deliver: each `walk` step's waypoints are joined by the shortest
//            walkable path on the registered map, split by zone, and the encounter rules of
//            world/explore.js (W-1) turn the zone distance into random fights (C10-1)
//   route    R seeded playthroughs. A chapter starts where the previous chapter's route ended
//            (levels, gear, items, credits; the prologue starts from New Journey): scripted fights,
//            field encounters on the path, random fights rolled while walking, party joins,
//            Med-Station rests, chests (gear goes on through Optimize), shopping and the boss. HP and
//            EP carry between fights and field items patch the party up. XP, credits, levels add up.
//   regular  every encounter of each zone the route crosses, and every scripted fight: N
//            fresh-party battles with the party, levels, gear and bestiary the reference route has
//            there (the zone's middle fight)
//   bosses   two checks per boss (C10-3): the route check (N battles at the chapter's end level
//            after a rest with the route's gear) and the first-timer check (a second route that
//            leaves the chapter's chest gear in the bag and buys only shop gear with its credits, at
//            the level that route delivers)
//   economy  credits earned against one weapon upgrade per member plus a consumable restock
//   kits     the next chapter's kit (REG.kits) against the gear and credits the route ends with
//   report   mechanic frequencies per boss and zone: telegraphs (lock-on, charge) answered by Defend
//            or cancelled by a Break, dives and the attack that follows them, enemy heals, summons,
//            ultimates awakened and used on a Break
//
// Content a chapter needs that no location has registered yet (maps, zones, encounters, enemy
// kinds, boss scripts, shops, the binding gear chests of TECH_PLAN 5.5) comes from PLACEHOLDERS,
// written from the plan (7.8, 7.9, 11.7, 12.5) with statLine; the report lists every placeholder.
//
// Options:
//   --check                 exit 1 when a target fails
//   --fights                only the geometry: zone distance and expected fights per chapter (fast)
//   --chapter <id>          only that chapter (repeatable; earlier routes still run for the carry-over)
//   --n <battles>           per encounter (default 120; bosses play max(400, 3n))
//   --runs <playthroughs>   route runs (default 80)
//   --placeholders          use the placeholders even where content exists (tune against the plan)
//   --try <enc>=<kind,...>  what-if formation for an encounter (repeatable), for content owners
//   --rate <zone>=<g>,<s>   what-if encounter rate { grace, sigma } for a zone (repeatable)
//   --scale <kind>.<stat>=<x>   what-if multiplier on a kind's registered number (balance.js
//                           overrides.scale: maxHp, atk, def, mag, res, spd, xp, credits; repeatable)
//   --enemy <kind>.<field>=<v>  what-if absolute field (overrides.enemies: shield, shieldGain, ...)
//   --verbose               one row per encounter, every walk leg
//
// Targets (--check, 10.4, 11.7, G2): regular fights win >= 98%, median 2-4 rounds, 15-35% party HP
// lost; route boss check 85-95% in a median of 6-10 rounds (Warden 10-14 across both forms);
// first-timer boss check >= 75% first-try wins, a median of 8-10 rounds and 2+ Breaks, the boss
// untargetable on under 25% of the party's turns; the fights a chapter delivers (scripted + field +
// expected random + boss) inside 11.7 (prologue 7-9, ch1 10-12, ch2-ch4 8-10); the party arrives at
// the boss at the chapter's end level (mean level -0.1 to +0.6, counting the share of the next level)
// and ends the chapter at the next start level (+-1);
// the credits a chapter earns buy one weapon upgrade per member (the cheapest better weapon its
// shops sell, none for a member who finds one) plus a restock of the consumables it used; Severance
// and Gardener heals cancelled by a Break in 30-70% of casts.

import { registerAllData, REG, getMap } from '../src/content/data.js';
import { applyBalance, statLine, overrides, ZONE_RATE_DEFAULT } from '../src/content/balance.js';
import { ENEMIES, ENCOUNTERS, ENCOUNTER_TABLES, ITEMS, SKILLS } from '../src/battle/data.js';
import { BOSS_SCRIPTS, registerBossScript } from '../src/battle/scripts.js';
import { BattleModel } from '../src/battle/model.js';
import { gameState, healParty, joinParty, addItem, useItemOutOfBattle, itemCount, xpToNext } from '../src/core/state.js';
import { optimize, equip, canEquip, ULTIMATES } from '../src/core/progression.js';
import { shopStock, buy } from '../src/core/shop.js';
import { buildJumpState, applyJumpState, setMemberLevel } from '../src/story/jump.js';
import { CHAPTERS, chapterDef } from '../src/content/chapters.js';
import { testCond } from '../src/world/cond.js';
import { makeRng } from '../src/core/util.js';
import { policyAction, observe } from './policy.mjs';

// ------------------------------------------------------------------ options

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] != null ? args[i + 1] : def;
};
const multi = (name) => args.flatMap((a, i) => (args[i - 1] === name ? [a] : []));
const CHECK = args.includes('--check');
const VERBOSE = args.includes('--verbose');
const FIGHTS_ONLY = args.includes('--fights');
const FORCE_PLACEHOLDERS = args.includes('--placeholders');
const N = Math.max(10, Number(opt('--n', 120)) || 120);
const RUNS = Math.max(10, Number(opt('--runs', 80)) || 80);
const CARRY_RUNS = 40;   // routes run only for the next chapter's start
const ONLY = multi('--chapter');
const TRY = multi('--try').map((a) => a.split('='));
const RATE_TRY = Object.fromEntries(multi('--rate').map((a) => {
  const [zone, v] = a.split('=');
  const [grace, sigma] = String(v).split(',').map(Number);
  if (!zone || !(grace >= 0) || !(sigma > 0)) throw new Error(`campaign: --rate needs <zone>=<grace>,<sigma> ("${a}")`);
  return [zone, { grace, sigma }];
}));
// --scale / --enemy: [kind, field, number]
const whatIf = (name) => multi(name).map((a) => {
  const [lhs, v] = a.split('=');
  const [kind, field] = lhs.split('.');
  if (!kind || !field || !Number.isFinite(Number(v))) throw new Error(`campaign: ${name} needs <kind>.<field>=<number> ("${a}")`);
  return [kind, field, Number(v)];
});
const SCALE_TRY = whatIf('--scale');
const ENEMY_TRY = whatIf('--enemy');
const BOSS_N = Math.max(400, N * 3);   // boss win rates need the bigger sample
const MAX_ROUNDS = 40;
const REF_SEED = 7;

const TARGETS = {
  regular: { win: 0.98, rounds: [2, 4], hpLost: [0.15, 0.35] },
  boss: { win: [0.85, 0.95], rounds: [6, 10] },
  firstTimer: { win: 0.75, rounds: [8, 10], breaks: 2, hidden: 0.25 },
  bossRounds: { heart_boss_warden: [10, 14] },
  // 11.7 (prologue: G2 C1-2's 7-9 around the plan's 8)
  fights: { prologue: [7, 9], ch1: [10, 12], ch2: [8, 10], ch3: [8, 10], ch4: [8, 10], finale: [8, 10] },
  units: { ch2: [300, 380], ch3: [300, 380], ch4: [300, 380], finale: [300, 380] },
  bossLevel: [-0.1, 0.6],   // mean party level (with the share of the next level) at the boss, against the plan
  levelSlack: 1,
  cancel: [0.3, 0.7],
};
// Break-cancel windows (10.4): the boss kind and what its Breaks should cancel. With a `cue`, on the
// rounds that open with it (the Gardener's dome light: a window is cancelled when the boss is Broken
// in it before it heals); otherwise on the boss's `charge` telegraphs (Echo's Severance).
const CANCEL_CHECKS = {
  vault_boss_echo: { kind: 'echo', label: 'Severance cancelled by a Break' },
  arb_boss_gardener: { kind: 'gardener', cue: 'domeLight', label: 'Gardener heals cancelled by a Break' },
};

// ------------------------------------------------------------------ critical paths (WRITING.md 5.2-5.6)

// Steps:
//   { battle }              a scripted fight
//   { walk: mapId, path, flags, plan }   walking on a map (see walkPlan): random fights from geometry
//   { join }                cs.join(member) at the default level
//   { rest: mapId }         a Med-Station or inn of that map on the way (skipped while the map has none)
//   { chests: [mapId] }     every chest of those maps that belongs to the chapter
//   { shop: [shopId] }      see shopVisit
//   { boss }                the boss after a rest
// Walk paths list waypoints: [x, z]; 'spawn:id', 'anchor:id', 'chest:id', 'inter:id', 'boss:id',
// 'npc:id', 'trigger:id', 'exit:id', 'area:id'; 'kind:<interactable kind>' (every one of that kind
// whose `when` holds, nearest first); { battle: enc, at?: ref } a scripted fight where the walk is
// (or at `at` when that resolves); { set: [flags] } flags that hold from there on (a switch's own
// flag is set when the walk reaches it). `flags` hold for the whole walk on top of the chapter's
// start flags. `plan` ({ zone: units }) stands in while the map is not registered.
const ROUTES = {
  prologue: [
    { battle: 'pro_tutorial' },
    { join: 'sera' },
    { rest: 'halcyon' },
    { walk: 'halcyon', flags: ['story:kade_awake', 'pro:medbay_alarm', 'story:sera_joined'],
      path: ['spawn:medbay', [7, 20], [7, 14.5], { battle: 'pro_spine_drones', at: 'trigger:spine_drones' },
        [20.5, 14.5], [20.5, 19.5], 'trigger:orion_rescue'] },
    { battle: 'pro_orion_rescue' },
    { join: 'orion' },
    { walk: 'halcyon', flags: ['story:kade_awake', 'story:sera_joined', 'story:orion_joined'],
      path: ['trigger:orion_rescue', { battle: 'pro_gallery_ambush', at: 'trigger:gallery_ambush' }, 'chest:brandt',
        [29.5, 31], 'chest:eng_2', [20.5, 19], [20.5, 14.5], 'spawn:antechamber'] },
    { chests: ['halcyon'] },
    { shop: ['fabricator'] },
    { rest: 'halcyon' },
    { join: 'nyx' },
    { battle: 'pro_sentinel_squad' },
    { boss: 'pro_boss_sentinel' },
  ],
  ch1: [
    { shop: ['fabricator', 'ruse'] },
    { walk: 'shoals', path: ['spawn:from_driftmarket', [36.5, 5.5], [37, 15.5], [11, 18], [10.5, 30], [62.5, 35.5], 'exit:to_meridian'] },
    { chests: ['shoals'] },
    { walk: 'meridian', path: ['spawn:from_shoals', 'inter:lever_a', 'inter:lever_b', { set: ['story:meridian_power'] },
      'inter:varo_log', { set: ['story:varo_log'] }, 'inter:med'] },
    { chests: ['meridian'] },
    { rest: 'meridian' },
    { boss: 'shoals_boss_maw' },
    { shop: ['ruse', 'fabricator'] },
  ],
  // ch2-ch4 follow WRITING 5.4-5.6 with the binding spawns, bosses and interactable kinds of 12.5;
  // `plan` splits 11.7's 340 units over the zones until the maps land.
  ch2: [
    { shop: ['fabricator', 'ruse'] },
    // valve A, valve B (the twist), then the sluice: left (C) then right (D)
    { walk: 'arboretum', path: ['spawn:dock', 'inter:valve_a', 'inter:valve_b', 'inter:valve_c', 'inter:valve_d',
      { set: ['arb:sluice', 'story:channels_drained'] }, 'spawn:stasis'], plan: { arb_gardens: 190 } },
    { walk: 'arboretum', flags: ['story:channels_drained'], path: ['spawn:stasis', 'boss:gardener'], plan: { arb_stasis: 150 } },
    { chests: ['arboretum'] },
    { rest: 'arboretum' },
    { boss: 'arb_boss_gardener' },
  ],
  ch3: [
    { shop: ['fabricator', 'ruse'] },
    // the grids: one terminal, the swap terminal, Kade's override; the cells; then up by lift
    { walk: 'spire', path: ['spawn:dock', 'inter:grid_t1', 'inter:grid_t2', 'inter:grid_t3', 'inter:cells',
      { set: ['story:cadets_freed'] }], plan: { spire_barracks: 170 } },
    { shop: ['quartermaster'] },
    { rest: 'spire' },
    { walk: 'spire', flags: ['story:cadets_freed'],
      path: ['inter:cells', 'inter:kade_desk', 'inter:recording', { set: ['story:flare_report'] }, 'trigger:voss'],
      plan: { spire_upper: 170 } },
    { chests: ['spire'] },
    { rest: 'spire' },
    { boss: 'spire_boss_voss' },
  ],
  ch4: [
    { shop: ['quartermaster', 'fabricator', 'ruse'] },
    // the firewall (its guards, then its switch), the west, north and east bridges and their
    // crystals; the core bridge opens with the BOLT reveal
    { walk: 'vault', path: ['spawn:entry', 'boss:wraiths', 'boss:firewall', { set: ['vault:firewall_down'] }, 'inter:sw_fw',
      'inter:sw_w', 'inter:crystal_a', 'inter:sw_n1', 'inter:sw_n2', 'inter:crystal_b', 'inter:sw_e', 'inter:crystal_c',
      { set: ['story:memory_launch', 'story:memory_lullaby', 'story:memory_severance', 'story:bolt_seed'] }],
      plan: { vault_grid: 200 } },
    { walk: 'vault', flags: ['story:memory_launch', 'story:memory_lullaby', 'story:memory_severance', 'story:bolt_seed',
      'vault:firewall_down', 'sw:vault:fw', 'sw:vault:w', 'sw:vault:n1', 'sw:vault:n2', 'sw:vault:e'],
      path: ['inter:crystal_c', 'inter:med_core', 'boss:echo'], plan: { vault_core: 140 } },
    { chests: ['vault'] },
    { rest: 'vault' },
    { boss: 'vault_boss_echo' },
  ],
};

// Consumables a person tops up to at every shop, by role: the essentials before any gear, the
// rest of the restock after the weapons.
const ESSENTIALS = { heal: 3, ep: 1, revive: 1, cure: 1 };
const RESTOCK = { heal: 5, ep: 3, revive: 2, cure: 2 };

// ------------------------------------------------------------------ placeholders (TECH_PLAN 7.8, 7.9, 12.5)

const act = (id, name, kind, extra) => ({
  id, name, kind, power: 0, type: null, target: 'one', anim: 'enemyShot', weight: 0, desc: name, ...extra,
});
const shot = (id, name, type, power, weight, extra = {}) => act(id, name, 'attack', { type, power, weight, ...extra });
const foe = (kind, name, art, line, extra) => ({ kind, name, art, ...line, drops: [], ...extra });
const enc = (id, enemies, extra = {}) => ({ id, enemies, backdrop: 'corridor', boss: false, canFlee: true, music: 'battle', ...extra });
const bossEnc = (id, enemies, extra = {}) => enc(id, enemies, { boss: true, canFlee: false, music: 'boss', ...extra });
const sleepFx = (chance, turns = 2) => ({ stats: ['sleep'], stage: 1, turns, chance });
// The enemy that teaches a boss mechanic uses it by script in its first rounds (G2 bar rule 6).
const opener = (actionId, round = 1) => ({
  chooseAction(api, e) {
    if (api.round !== round || api.mem[e.id]) return null;
    api.mem[e.id] = true;
    return { actionId };
  },
});

const PLACEHOLDERS = {
  prologue: {
    encounters: {
      pro_spine_drones: enc('pro_spine_drones', ['pro_drone', 'pro_drone'], { canFlee: false }),
      pro_gallery_ambush: enc('pro_gallery_ambush', ['pro_drone', 'pro_drone', 'pro_drone'], { canFlee: false, backdrop: 'engineering' }),
    },
  },
  ch2: {
    enemies: {
      spore_drone: foe('spore_drone', 'Spore Drone', 'spore_drone', statLine(13, 'caster'), {
        shield: 3, weaknesses: ['thermal', 'blade', 'volt'], script: 'ph_spore_drone',
        actions: [
          shot('spore_dart', 'Spore Dart', 'void', 1.0, 70),
          act('pollen', 'Pollen', 'debuff', { target: 'all', anim: 'enemySpit', weight: 30, cooldown: 3, effect: sleepFx(0.35) }),
        ],
      }),
      bloom_mantis: foe('bloom_mantis', 'Bloom Mantis', 'bloom_mantis', statLine(15, 'brute'), {
        shield: 4, weaknesses: ['thermal', 'gauntlet', 'photon'], actionsPerRound: 2,
        actions: [shot('scythe', 'Scythe', 'blade', 0.8, 70, { anim: 'enemyMelee' }), shot('petal_storm', 'Petal Storm', 'photon', 0.5, 30, { target: 'all' })],
      }),
      rootling: foe('rootling', 'Rootling', 'rootling', statLine(13, 'swarm'), {
        shield: 1, weaknesses: ['thermal', 'blade'], actions: [shot('root_jab', 'Root Jab', 'blade', 0.8, 100, { anim: 'enemyMelee' })],
      }),
      feral_caretaker: foe('feral_caretaker', 'Feral Caretaker', 'feral_caretaker', statLine(14, 'caster'), {
        shield: 4, weaknesses: ['volt', 'rifle', 'void'], script: 'ph_caretaker',
        actions: [
          shot('pruning_beam', 'Pruning Beam', 'thermal', 1.0, 55),
          act('sow', 'Sow Rootling', 'summon', { anim: 'enemyCharge', weight: 25, cooldown: 3, summon: { kind: 'rootling', count: 1 } }),
          act('tend', 'Tend', 'heal', { target: 'ally', anim: 'enemyCharge', weight: 20, cooldown: 2, heal: 0.3 }),
        ],
      }),
      gardener: foe('gardener', 'The Gardener', 'gardener', statLine(17, 'boss'), {
        boss: true, ai: 'basic', script: 'gardener', shield: 6, maxShieldCap: 12, actionsPerRound: 2,
        weaknesses: ['thermal', 'blade', 'void'],
        actions: [
          shot('thorn_lash', 'Thorn Lash', 'blade', 1.3, 55, { anim: 'enemyMelee' }),
          act('garden_pollen', 'Pollen', 'attack', { type: 'void', power: 0.55, target: 'all', anim: 'enemySpit', weight: 30, cooldown: 2, effect: sleepFx(0.3) }),
          act('call_rootlings', 'Summon Rootlings', 'summon', { anim: 'enemyCharge', weight: 15, cooldown: 4, summon: { kind: 'rootling', count: 1 } }),
          act('dome_bask', 'Photosynthesis', 'charge', { anim: 'enemyCharge', fires: 'photosynthesis', chargeRounds: 0,
            telegraph: 'The dome light pours over the Gardener...' }),
          act('photosynthesis', 'Photosynthesis', 'heal', { target: 'self', anim: 'enemyCharge', heal: 0.12 }),
        ],
      }),
    },
    encounters: {
      arb_spores: enc('arb_spores', ['spore_drone', 'spore_drone']),
      arb_mantis: enc('arb_mantis', ['bloom_mantis']),
      arb_caretaker: enc('arb_caretaker', ['feral_caretaker', 'rootling', 'rootling']),
      arb_mixed: enc('arb_mixed', ['spore_drone', 'bloom_mantis']),
      arb_stasis_mantis: enc('arb_stasis_mantis', ['bloom_mantis', 'spore_drone', 'rootling']),
      arb_stasis_tend: enc('arb_stasis_tend', ['feral_caretaker', 'spore_drone']),
      arb_stasis_pair: enc('arb_stasis_pair', ['bloom_mantis', 'bloom_mantis']),
      arb_stasis_swarm: enc('arb_stasis_swarm', ['spore_drone', 'rootling', 'rootling', 'rootling']),
      arb_boss_gardener: bossEnc('arb_boss_gardener', ['gardener'], { backdrop: 'choir_gate', winOn: 'boss' }),
    },
    zones: {
      arb_gardens: ['arb_spores', 'arb_mantis', 'arb_caretaker', 'arb_mixed'],
      arb_stasis: ['arb_stasis_mantis', 'arb_stasis_tend', 'arb_stasis_pair', 'arb_stasis_swarm'],
    },
    bossScripts: {
      ph_spore_drone: opener('pollen'),
      ph_caretaker: opener('sow'),
      // the dome light opens every other round; Photosynthesis (a charge that heals in the Gardener's
      // last slot of the round) only works under it, so a Break that round cancels it
      gardener: {
        thresholds: [0.5],
        onRoundStart(api, round) {
          if (round % 2 === 0) api.cue('domeLight', { value: true });
        },
        chooseAction(api, e) {
          if (api.round % 2 !== 0 || e.broken || api.mem.bask === api.round || e.hp >= e.maxHp) return null;
          api.mem.bask = api.round;
          return { actionId: 'dome_bask' };
        },
        onThreshold(api) {
          api.summon('rootling', { count: 2 });
          api.say('SERA', 'They\'re not seedlings. They\'re people.');
          api.grantUltimate('sera');
        },
      },
    },
    chests: [
      { map: 'arboretum', item: 'eq_w_sera_3' },
      { map: 'arboretum', item: 'eq_x_ember_charm' },
      { map: 'arboretum', item: 'eq_x_photon_prism' },
    ],
  },
  ch3: {
    enemies: {
      sec_trooper: foe('sec_trooper', 'Security Trooper', 'sec_trooper', statLine(18, 'standard'), {
        shield: 4, weaknesses: ['blade', 'cryo', 'photon'], script: 'ph_trooper',
        actions: [
          shot('trooper_burst', 'Burst Fire', 'rifle', 1.0, 70),
          act('paint', 'Paint Target', 'debuff', { anim: 'enemyBeam', weight: 30, cooldown: 3, effect: { stats: ['marked'], stage: 1, turns: 2 } }),
        ],
      }),
      riot_drone: foe('riot_drone', 'Riot Drone', 'riot_drone', statLine(19, 'caster'), {
        shield: 3, weaknesses: ['rifle', 'volt', 'void'], script: 'ph_riot_drone',
        actions: [
          shot('stun_baton', 'Stun Baton', 'volt', 0.95, 65, { anim: 'enemyMelee' }),
          act('jammer', 'Jammer', 'debuff', { anim: 'enemyBeam', weight: 35, cooldown: 3, effect: { stats: ['jam'], stage: 1, turns: 2, chance: 0.6 } }),
        ],
      }),
      sentinel_mk3: foe('sentinel_mk3', 'Sentinel Mk-III', 'sentinel_mk3', statLine(20, 'brute'), {
        shield: 5, weaknesses: ['gauntlet', 'volt', 'void'],
        actions: [
          shot('mk3_cannon', 'Pulse Cannon', 'thermal', 1.0, 70),
          act('mk3_lock', 'Lock-On', 'lockOn', { anim: 'enemyCharge', weight: 30, cooldown: 4, fires: 'mk3_beam' }),
          shot('mk3_beam', 'Lance Beam', 'photon', 2.0, 0, { anim: 'enemyBeam' }),
        ],
      }),
      laser_turret: foe('laser_turret', 'Laser Turret', 'laser_turret', statLine(21, 'armored'), {
        shield: 5, weaknesses: ['lance', 'cryo', 'void'], script: 'ph_turret',
        actions: [
          shot('turret_bolt', 'Laser Bolt', 'photon', 1.0, 65),
          act('turret_charge', 'Charge', 'charge', { anim: 'enemyCharge', weight: 35, cooldown: 3, fires: 'piercing_beam', chargeRounds: 1,
            telegraph: 'The Laser Turret\'s barrel glows white...' }),
          shot('piercing_beam', 'Piercing Beam', 'photon', 1.3, 0, { target: 'all', anim: 'enemyBeam' }),
        ],
      }),
      voss: foe('voss', 'Commander Voss', 'voss', statLine(22, 'boss'), {
        boss: true, ai: 'basic', script: 'voss', shield: 6, maxShieldCap: 12, actionsPerRound: 1,
        weaknesses: ['blade', 'rifle', 'cryo', 'photon'],
        phases: [{ at: 0.5, transform: 'voss_overclock', keepHp: true }],
        actions: [
          shot('halberd_sweep', 'Halberd Sweep', 'lance', 0.8, 45, { target: 'all', anim: 'enemyMelee' }),
          act('focus_fire', 'Command: Focus Fire', 'debuff', { anim: 'enemyBeam', weight: 30, cooldown: 3, effect: { stats: ['marked'], stage: 1, turns: 2 } }),
          shot('execution_arc', 'Execution Arc', 'lance', 1.7, 25, { anim: 'enemyMelee', minRound: 2 }),
        ],
      }),
      voss_overclock: foe('voss_overclock', 'Voss, Overclocked', 'voss_overclock', statLine(22, 'boss'), {
        boss: true, ai: 'basic', script: 'voss', shield: 6, maxShieldCap: 12, actionsPerRound: 2,
        weaknesses: ['lance', 'volt', 'void'],
        actions: [
          shot('oc_sweep', 'Halberd Sweep', 'lance', 0.75, 45, { target: 'all', anim: 'enemyMelee' }),
          act('oc_focus', 'Command: Focus Fire', 'debuff', { anim: 'enemyBeam', weight: 25, cooldown: 3, effect: { stats: ['marked'], stage: 1, turns: 2 } }),
          shot('oc_arc', 'Execution Arc', 'lance', 1.5, 30, { anim: 'enemyMelee' }),
        ],
      }),
    },
    encounters: {
      spire_troopers: enc('spire_troopers', ['sec_trooper', 'sec_trooper']),
      spire_riot: enc('spire_riot', ['riot_drone', 'riot_drone', 'sec_trooper']),
      spire_focus: enc('spire_focus', ['sec_trooper', 'riot_drone']),
      spire_turret: enc('spire_turret', ['laser_turret', 'sec_trooper']),
      spire_mk3: enc('spire_mk3', ['sentinel_mk3', 'riot_drone']),
      spire_mk3_pair: enc('spire_mk3_pair', ['sentinel_mk3', 'sentinel_mk3']),
      spire_turrets: enc('spire_turrets', ['laser_turret', 'laser_turret']),
      spire_squad: enc('spire_squad', ['sec_trooper', 'sentinel_mk3', 'riot_drone']),
      spire_boss_voss: bossEnc('spire_boss_voss', ['sentinel_mk3', 'voss', 'sentinel_mk3'], { backdrop: 'spire_command', winOn: 'boss' }),
    },
    zones: {
      spire_barracks: ['spire_troopers', 'spire_riot', 'spire_focus', 'spire_turret'],
      spire_upper: ['spire_mk3', 'spire_mk3_pair', 'spire_turrets', 'spire_squad'],
    },
    bossScripts: {
      ph_trooper: opener('paint'),
      ph_riot_drone: opener('jammer'),
      ph_turret: opener('turret_charge'),
      voss: {
        onTransform(api) {
          api.say('KADE', 'Then we make somewhere.');
          api.grantUltimate('kade');
        },
      },
    },
    shops: {
      quartermaster: {
        name: 'Quartermaster', keeper: 'MIKA OKAFOR', portrait: null, greeting: 'Quartermaster\'s open, sir.', sellRate: 0.5,
        stock: [{ item: 'medigel_plus' }, { item: 'ether_plus' }, { item: 'revive' }, { item: 'stim' }, { item: 'nanomist' },
          { item: 'eq_a_4' }, { item: 'eq_x_ground_coil' }],
      },
    },
    chests: [
      { map: 'spire', item: 'eq_w_kade_4' },
      { map: 'spire', item: 'eq_x_vital_core' },
    ],
  },
  ch4: {
    enemies: {
      data_wraith: foe('data_wraith', 'Data Wraith', 'data_wraith', statLine(23, 'caster'), {
        shield: 3, weaknesses: ['photon', 'volt', 'blade'], untargetableStyle: 'phase', script: 'ph_wraith',
        actions: [
          shot('wraith_touch', 'Cold Touch', 'void', 1.05, 70),
          act('wraith_phase', 'Phase', 'submerge', { anim: 'enemyCharge', weight: 30, cooldown: 3, untargetable: 1, then: 'wraith_strike' }),
          shot('wraith_strike', 'Phase Strike', 'void', 1.4, 0),
        ],
      }),
      firewall_golem: foe('firewall_golem', 'Firewall Golem', 'firewall_golem', statLine(25, 'armored'), {
        shield: 6, weaknesses: ['gauntlet', 'cryo', 'lance'], script: 'ph_firewall',
        actions: [shot('firewall_slam', 'Packet Slam', 'gauntlet', 1.25, 100, { anim: 'enemyMelee' })],
      }),
      glitch_swarm: foe('glitch_swarm', 'Glitch Swarm', 'glitch_swarm', statLine(24, 'swarm'), {
        shield: 2, weaknesses: ['thermal', 'volt'], weaknessPool: [['thermal', 'volt'], ['cryo', 'rifle'], ['photon', 'blade']], shiftOnRecover: true,
        actions: [shot('glitch_bite', 'Bit Rot', 'void', 0.9, 100, { anim: 'enemyMelee' })],
      }),
      corrupted_memory: foe('corrupted_memory', 'Corrupted Memory', 'corrupted_memory', statLine(26, 'standard'), {
        shield: 4, weaknesses: ['photon', 'thermal', 'rifle'], script: 'ph_memory',
        actions: [
          shot('memory_lash', 'Static Lash', 'volt', 1.0, 65),
          act('overwrite_charge', 'Overwrite', 'charge', { anim: 'enemyCharge', weight: 35, cooldown: 4, fires: 'overwrite', chargeRounds: 1,
            telegraph: 'Corrupted Memory begins to Overwrite...' }),
          shot('overwrite', 'Overwrite', 'void', 1.2, 0, { target: 'all', anim: 'enemyBeam' }),
        ],
      }),
      echo: foe('echo', 'ECHO', 'echo', statLine(27, 'boss'), {
        boss: true, ai: 'basic', script: 'echo', shield: 7, maxShieldCap: 13, actionsPerRound: 2, untargetableStyle: 'phase',
        weaknesses: ['blade', 'gauntlet', 'photon', 'volt'],
        actions: [
          shot('mirror_strike', 'Mirror', 'void', 1.15, 70),
          shot('grief_wave', 'Grief Wave', 'void', 0.7, 30, { target: 'all', anim: 'enemyBeam' }),
          act('glitch_phase', 'Glitch Phase', 'submerge', { anim: 'enemyCharge', untargetable: 1, then: 'severance_charge' }),
          act('severance_charge', 'Severance', 'charge', { anim: 'enemyCharge', fires: 'severance', chargeRounds: 1,
            telegraph: 'ECHO relives the Severance...' }),
          shot('severance', 'Severance', 'void', 1.9, 0, { target: 'all', anim: 'enemyBeam' }),
        ],
      }),
    },
    encounters: {
      vault_wraiths: enc('vault_wraiths', ['data_wraith', 'data_wraith']),
      vault_golem: enc('vault_golem', ['firewall_golem', 'glitch_swarm']),
      vault_swarm: enc('vault_swarm', ['glitch_swarm', 'glitch_swarm', 'glitch_swarm']),
      vault_memory: enc('vault_memory', ['corrupted_memory', 'data_wraith']),
      vault_core_golem: enc('vault_core_golem', ['firewall_golem', 'data_wraith']),
      vault_core_memories: enc('vault_core_memories', ['corrupted_memory', 'corrupted_memory']),
      vault_core_swarm: enc('vault_core_swarm', ['glitch_swarm', 'glitch_swarm', 'corrupted_memory']),
      vault_core_mixed: enc('vault_core_mixed', ['firewall_golem', 'glitch_swarm', 'data_wraith']),
      vault_boss_echo: bossEnc('vault_boss_echo', ['echo'], { backdrop: 'vault_core' }),
    },
    zones: {
      vault_grid: ['vault_wraiths', 'vault_golem', 'vault_swarm', 'vault_memory'],
      vault_core: ['vault_core_golem', 'vault_core_memories', 'vault_core_swarm', 'vault_core_mixed'],
    },
    bossScripts: {
      ph_wraith: opener('wraith_phase', 2),
      ph_memory: opener('overwrite_charge'),
      // resists the last element used against it for a round (setResist values are multipliers)
      ph_firewall: {
        onPartyAction(api, actor, action) {
          const type = action?.damageType;
          if (!type) return;
          for (const e of api.enemies()) if (e.key === 'firewall_golem' && e.alive) api.setResist(e.id, { [type]: 0.5 }, { rounds: 1 });
        },
      },
      // Mirror: resists the party's last element for a round and answers with it; Glitch Phase every
      // fourth round, then the Severance charge; Orion's ultimate at 50%
      echo: {
        thresholds: [0.5],
        onPartyAction(api, actor, action) {
          const type = action?.damageType;
          if (!type) return;
          api.mem.mirror = type;
          const e = api.enemy('echo');
          if (e?.alive) api.setResist(e.id, { [type]: 0.5 }, { rounds: 1 });
        },
        chooseAction(api, e) {
          if (api.round % 4 === 0 && !e.broken && api.mem.phased !== api.round) {
            api.mem.phased = api.round;
            return { actionId: 'glitch_phase' };
          }
          if (api.mem.mirror && api.rng() < 0.6) return { actionId: 'mirror_strike', override: { type: api.mem.mirror } };
          return null;
        },
        onThreshold(api) {
          api.say('ORION', 'Grief isn\'t an error.');
          api.grantUltimate('orion');
        },
      },
    },
    chests: [
      { map: 'vault', item: 'eq_w_nyx_4' },
      { map: 'vault', item: 'eq_w_orion_4' },
      { map: 'vault', item: 'eq_x_null_ward' },
      { map: 'vault', item: 'eq_x_ether_core' },
    ],
  },
};

// ------------------------------------------------------------------ setup

for (const [kind, field, v] of SCALE_TRY) (overrides.scale[kind] ||= {})[field] = v;
for (const [kind, field, v] of ENEMY_TRY) (overrides.enemies[kind] ||= {})[field] = v;
registerAllData();
for (const [id, kinds] of TRY) {
  if (!ENCOUNTERS[id] || !kinds) throw new Error(`campaign: --try needs <known encounter>=<kind,...> ("${id}")`);
  ENCOUNTERS[id] = { ...ENCOUNTERS[id], enemies: kinds.split(',') };
}
const placeholderIds = {};   // chapter -> [ 'enemy:ice_mite', ... ]
const placeholderChests = {}; // chapter -> [{ map, item }]

// Placeholders fill only what the chapter's route needs and no location registered: a missing zone
// or scripted fight brings its placeholder encounters, those bring their enemy kinds (and kinds they
// summon or transform into), and an enemy with an unregistered boss script brings that script.
// --placeholders forces all of them.
function installPlaceholders(chapter) {
  const p = PLACEHOLDERS[chapter] || {};
  const used = (placeholderIds[chapter] = []);
  placeholderChests[chapter] = [];
  const missing = (table, id) => FORCE_PLACEHOLDERS || !table[id];
  const addEnemy = (kind) => {
    if (!p.enemies?.[kind] || !missing(ENEMIES, kind) || used.includes(`enemy:${kind}`)) return;
    ENEMIES[kind] = p.enemies[kind];
    used.push(`enemy:${kind}`);
    const def = p.enemies[kind];
    for (const a of def.actions || []) if (a.summon) addEnemy(a.summon.kind);
    for (const ph of def.phases || []) if (ph.transform) addEnemy(ph.transform);
  };
  const addEncounter = (id) => {
    if (!p.encounters?.[id] || !missing(ENCOUNTERS, id)) return;
    ENCOUNTERS[id] = p.encounters[id];
    used.push(`encounter:${id}`);
    for (const kind of p.encounters[id].enemies) addEnemy(kind);
  };
  const addZone = (zone) => {
    if (!zone || !p.zones?.[zone] || !missing(ENCOUNTER_TABLES, zone) || used.includes(`zone:${zone}`)) return;
    ENCOUNTER_TABLES[zone] = p.zones[zone];
    used.push(`zone:${zone}`);
    for (const id of new Set(p.zones[zone])) addEncounter(id);
  };
  for (const [i, step] of ROUTES[chapter].entries()) {
    if (step.walk) {
      for (const z of walkZones(chapter, i)) addZone(z);
      for (const item of step.path) if (item?.battle) addEncounter(item.battle);
    }
    if (step.battle || step.boss) addEncounter(step.battle || step.boss);
    for (const id of step.shop || []) {
      if (p.shops?.[id] && missing(REG.shops, id)) {
        REG.shops[id] = p.shops[id];
        used.push(`shop:${id}`);
      }
    }
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

// An unregistered map stands in with the plan's Med-Station before every boss (7.9).
const hasMedStation = (mapId) => !REG.maps[mapId] || (REG.maps[mapId].interactables || []).some((i) => i.kind === 'med');

const sum = (list, f = (x) => x) => list.reduce((s, x) => s + f(x), 0);
const mean = (list, f = (x) => x) => (list.length ? sum(list, f) / list.length : 0);
const median = (list) => {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};
const mode = (list) => {
  const counts = new Map();
  for (const x of list) counts.set(x, (counts.get(x) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
};
const pct = (x) => `${(100 * x).toFixed(0)}%`;
const pct1 = (x) => `${(100 * x).toFixed(1)}%`;
const f1 = (x) => x.toFixed(1);
const clone = (o) => JSON.parse(JSON.stringify(o));
const inRange = (v, [lo, hi]) => v >= lo && v <= hi;
const ultimateIds = new Set(Object.values(ULTIMATES));
const levelOf = (m) => m.level + (m.xp || 0) / xpToNext(m.level);

// buildJumpState without its console.warn for a start map that is not registered yet (ch4's
// spire:antechamber until C5's map lands): the simulator never uses the map.
function jumpState(chapter) {
  const warn = console.warn;
  console.warn = () => {};
  try {
    return buildJumpState(chapter, REG);
  } finally {
    console.warn = warn;
  }
}

// A fractional level: the integer level plus that share of the way to the next one.
function setLevel(m, level) {
  const whole = Math.floor(level);
  setMemberLevel(m, whole);
  m.xp = Math.round((level - whole) * xpToNext(whole));
}

// ------------------------------------------------------------------ fights from map geometry (C10-1)
// A port of shots/G2/design/tools/expected-fights.mjs. Each `walk` step's waypoints are joined by
// the shortest 8-way cell path (no corner cutting) over the cells the leader can walk with the
// walk's flags (floors, open gates, open doors, drained water). A piece of path belongs to the zone
// of the area its start lies in (world.areaAt: the first area holding the point; puzzle and zoneless
// areas have none). The encounter rules are world/explore.js's after W-1: the walked distance pauses
// in zoneless and puzzle areas and resets after any fight, on a map change and on entering a
// different zone; past `grace` units the hazard is Rayleigh with scale `sigma`, times the party's
// lowest equipment encounterRate; Skip weak (on by default) rolls nothing in a zone whose strongest
// enemy is 5+ levels below the party's average level. A field encounter (a FieldBossDef whose
// encounter is not a boss or elite) within its trigger radius of the path is a forced fight there.

const STEP = 0.25;                     // units walked per hazard roll
const POC_ZONE_RATE = { grace: 8, sigma: 13.5 };
const POC_ZONES = new Set(['corridor', 'engineering']);
const WEAK_GAP = 5;
const hazard = (s, sigma) => (s * s) / (2 * sigma * sigma);
const inRect = (r, x, z) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
const mid = (r) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];

const zoneRate = (zone) => RATE_TRY[zone] || REG.zoneRates[zone] || (POC_ZONES.has(zone) ? POC_ZONE_RATE : ZONE_RATE_DEFAULT);

function condState(chapter, flags) {
  return { flags, story: { chapter }, party: ['kade', 'sera', 'orion', 'nyx'], leader: 'kade', inventory: {} };
}

function zoneOf(area, state) {
  if (!area || area.puzzle) return null;
  if (!Array.isArray(area.zone)) return area.zone || null;
  for (const e of area.zone) if (!e.when || testCond(e.when, state)) return e.zone || null;
  return null;
}

// Walkable cells under `state`: floors (unless behind a closed gate), doors (unless locked), water
// once drained.
function walkGrid(map, state) {
  const test = (cond) => !cond || testCond(cond, state);
  const shut = new Set();
  for (const g of map.gates || []) {
    if (test(g.open)) continue;
    const cells = g.cells || [];
    if (g.rect) for (let r = g.rect[1]; r <= g.rect[3]; r++) for (let c = g.rect[0]; c <= g.rect[2]; c++) cells.push([c, r]);
    for (const [c, r] of cells) shut.add(r * map.w + c);
  }
  const closedGate = (id) => (map.gates || []).some((g) => g.id === id && !test(g.open));
  return (c, r) => {
    if (c < 0 || r < 0 || c >= map.w || r >= map.h) return false;
    const spec = map.legend[map.grid[r][c]];
    if (!spec || shut.has(r * map.w + c)) return false;
    if (spec.t === 'floor') return !(spec.gate && closedGate(spec.gate));
    if (spec.t === 'door') return !spec.lock || test(spec.lock.flag);
    if (spec.t === 'water') return !!spec.drain && test(spec.drain);
    return false;
  };
}

function refPos(map, ref) {
  if (Array.isArray(ref)) return ref;
  const at = ref.indexOf(':');
  const kind = ref.slice(0, at);
  const id = ref.slice(at + 1);
  const xz = (o) => (!o ? null : o.box ? mid(o.box) : o.rect ? mid(o.rect) : [o.x ?? o[0], o.z ?? o[1]]);
  const find = (list) => (list || []).find((o) => o.id === id);
  switch (kind) {
    case 'spawn': return xz(map.spawns?.[id]);
    case 'anchor': return xz(map.anchors?.[id]);
    case 'chest': return xz(find(map.chests));
    case 'inter': return xz(find(map.interactables));
    case 'boss': return xz(find(map.bosses));
    case 'npc': return xz(find(map.npcs));
    case 'exit': return xz(find(map.exits));
    case 'area': return xz(find(map.areas));
    case 'trigger': {
      const t = find(map.triggers);
      return t && (t.rect ? mid(t.rect) : xz((map.areas || []).find((a) => a.id === t.area)));
    }
    default: return null;
  }
}

// The walkable cell nearest to a point (props and terminals often sit on wall cells).
function snapCell(open, x, z) {
  const c0 = Math.floor(x);
  const r0 = Math.floor(z);
  let best = null;
  for (let d = 0; d <= 5 && !best; d++) {
    for (let r = r0 - d; r <= r0 + d; r++) {
      for (let c = c0 - d; c <= c0 + d; c++) {
        if (Math.max(Math.abs(c - c0), Math.abs(r - r0)) !== d || !open(c, r)) continue;
        const dist = Math.hypot(c + 0.5 - x, r + 0.5 - z);
        if (!best || dist < best.dist) best = { c, r, dist };
      }
    }
  }
  return best && [best.c, best.r];
}

// Dijkstra over cells, 8-way without cutting corners, plus `jumps` (cell index -> cell indices: lift
// rides); returns cell centres from a to b, or null.
function cellPath(map, open, a, b, jumps = null) {
  const W = map.w;
  const idx = (c, r) => r * W + c;
  const dist = new Float64Array(W * map.h).fill(Infinity);
  const prev = new Int32Array(W * map.h).fill(-1);
  const heap = [];
  const push = (d, i) => {
    heap.push([d, i]);
    for (let k = heap.length - 1; k > 0;) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let k = 0; ;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  const start = idx(a[0], a[1]);
  const goal = idx(b[0], b[1]);
  dist[start] = 0;
  push(0, start);
  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    if (i === goal) break;
    const c = i % W;
    const r = (i - c) / W;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (!open(nc, nr) || (dc && dr && (!open(c + dc, r) || !open(c, r + dr)))) continue;
      const nd = d + (dc && dr ? Math.SQRT2 : 1);
      const j = idx(nc, nr);
      if (nd < dist[j]) {
        dist[j] = nd;
        prev[j] = i;
        push(nd, j);
      }
    }
    for (const j of jumps?.get(i) || []) {
      if (d + 1 >= dist[j]) continue;
      dist[j] = d + 1;
      prev[j] = i;
      push(d + 1, j);
    }
  }
  if (!Number.isFinite(dist[goal])) return null;
  const out = [];
  for (let i = goal; i >= 0; i = i === start ? -1 : prev[i]) out.push([(i % W) + 0.5, Math.floor(i / W) + 0.5]);
  return out.reverse();
}

// Lift interactables (kind 'lift', `to` a spawn of the same map) whose `when` holds, as jumps.
function liftJumps(map, open, state) {
  const jumps = new Map();
  for (const it of map.interactables || []) {
    if (it.kind !== 'lift' || (it.when && !testCond(it.when, state))) continue;
    const to = map.spawns?.[it.to];
    const a = snapCell(open, it.x, it.z);
    const b = to && snapCell(open, to.x, to.z);
    if (!a || !b) continue;
    const from = a[1] * map.w + a[0];
    if (!jumps.has(from)) jumps.set(from, []);
    jumps.get(from).push(b[1] * map.w + b[0]);
  }
  return jumps;
}

const pathLength = (cells) => sum(cells.slice(1), (p, k) => Math.hypot(p[0] - cells[k][0], p[1] - cells[k][1]));

// The walk of route step `i`: { map, placeholder, events, notes } where events are, in order,
// { zone, len } pieces of path (zone null: the count pauses), { battle, field } fights and { lift }
// rides (the walked distance resets, as on any arrival). Cached.
const walkCache = new Map();
const fieldDone = new Map();   // chapter -> field encounters met by its earlier walks
function walkPlan(chapter, i) {
  const key = `${chapter}:${i}`;
  if (walkCache.has(key)) return walkCache.get(key);
  // walks share the chapter's field encounters, so plan the earlier ones first
  for (let k = 0; k < i; k++) if (ROUTES[chapter][k].walk && !walkCache.has(`${chapter}:${k}`)) walkPlan(chapter, k);
  const step = ROUTES[chapter][i];
  const map = REG.maps[step.walk] && getMap(step.walk);
  const out = { map: step.walk, placeholder: false, events: [], notes: [], distance: 0 };
  walkCache.set(key, out);
  const fallback = (why) => {
    out.placeholder = true;
    out.events = [];
    for (const item of step.path) if (item?.battle) out.events.push({ battle: item.battle, field: false });
    for (const [zone, len] of Object.entries(step.plan || {})) out.events.push({ zone, len });
    out.distance = sum(Object.values(step.plan || {}));
    out.notes.push(why);
    return out;
  };
  if (!map) return fallback(`map ${step.walk} not registered: plan distance`);

  const flags = { ...jumpState(chapter).flags };
  for (const f of step.flags || []) flags[f] = true;
  const state = condState(chapter, flags);
  if (!fieldDone.has(chapter)) fieldDone.set(chapter, new Set());
  const met = fieldDone.get(chapter);
  let pos = null;
  let missing = 0;
  const addPiece = (zone, len) => {
    const last = out.events[out.events.length - 1];
    if (last && 'zone' in last && last.zone === zone) last.len += len;
    else out.events.push({ zone, len });
    out.distance += len;
  };
  const route = (from, target) => {
    const open = walkGrid(map, state);
    const a = snapCell(open, from[0], from[1]);
    const b = snapCell(open, target[0], target[1]);
    return a && b && cellPath(map, open, a, b, liftJumps(map, open, state));
  };
  const walkTo = (target, label) => {
    if (!pos) {
      pos = target;
      return true;
    }
    let cells = route(pos, target);
    if (!cells) {
      // a gate or door the route's flags do not open yet: walk through it, but say so
      const all = condState(chapter, new Proxy({}, { get: () => true }));
      const open = walkGrid(map, all);
      const a = snapCell(open, pos[0], pos[1]);
      const b = snapCell(open, target[0], target[1]);
      cells = a && b && cellPath(map, open, a, b, liftJumps(map, open, all));
      out.notes.push(cells ? `blocked before ${label}: walked through` : `no path to ${label}`);
      if (!cells) return false;
    }
    for (let k = 0; k + 1 < cells.length; k++) {
      const [x, z] = cells[k];
      if (Math.hypot(cells[k + 1][0] - x, cells[k + 1][1] - z) > 1.5) {
        out.events.push({ lift: true });
        continue;
      }
      for (const fb of map.bosses || []) {
        const encDef = ENCOUNTERS[fb.encounter];
        if (!encDef || encDef.boss || met.has(`${map.id}:${fb.id}`)) continue;
        if (fb.when && !testCond(fb.when, state)) continue;
        if (Math.hypot(fb.x - x, fb.z - z) > (fb.triggerRadius ?? 3.4)) continue;
        met.add(`${map.id}:${fb.id}`);
        out.events.push({ battle: fb.encounter, field: true });
      }
      const area = map.areas.find((ar) => inRect(ar.rect, x, z));
      addPiece(zoneOf(area, state), Math.hypot(cells[k + 1][0] - x, cells[k + 1][1] - z));
    }
    pos = cells[cells.length - 1];
    return true;
  };
  const reach = (ref) => {
    const p = refPos(map, ref);
    if (!p) {
      missing++;
      out.notes.push(`missing waypoint ${ref}`);
      return;
    }
    walkTo(p, String(ref));
    if (typeof ref === 'string' && ref.startsWith('inter:')) {
      const it = map.interactables.find((o) => o.id === ref.slice(6));
      if (it?.flag) flags[it.flag] = true;
    }
  };
  for (const item of step.path) {
    if (item && item.set) for (const f of item.set) flags[f] = true;
    else if (item && item.battle) {
      if (item.at) {
        const p = refPos(map, item.at);
        if (p) walkTo(p, item.at);
        else out.notes.push(`${item.battle}: ${item.at} not registered, fought where the walk is`);
      }
      out.events.push({ battle: item.battle, field: false });
    } else if (typeof item === 'string' && item.startsWith('kind:')) {
      const kind = item.slice(5);
      const todo = (map.interactables || []).filter((o) => o.kind === kind && (!o.when || testCond(o.when, state)));
      if (!todo.length) {
        missing++;
        out.notes.push(`no ${kind} interactables`);
      }
      // nearest by walking distance under the flags so far (straight-line when none is reachable)
      while (todo.length) {
        const here = pos || [todo[0].x, todo[0].z];
        const cost = (o) => {
          const cells = route(here, [o.x, o.z]);
          return cells ? pathLength(cells) : 1e6 + Math.hypot(o.x - here[0], o.z - here[1]);
        };
        todo.sort((p, q) => cost(p) - cost(q));
        reach(`inter:${todo.shift().id}`);
      }
    } else reach(item);
  }
  if (missing && out.distance === 0 && step.plan) return fallback(`map ${step.walk} incomplete (${out.notes.join('; ')}): plan distance`);
  return out;
}

// Zones a walk can cross (for placeholders: before the walk is planned, any zone its map's areas
// name, or the plan's zones).
function walkZones(chapter, i) {
  const step = ROUTES[chapter][i];
  if (!REG.maps[step.walk]) return Object.keys(step.plan || {});
  const zones = new Set(Object.keys(step.plan || {}));
  for (const a of getMap(step.walk).areas || []) {
    if (Array.isArray(a.zone)) for (const e of a.zone) e.zone && zones.add(e.zone);
    else if (a.zone) zones.add(a.zone);
  }
  return [...zones];
}

// Expected fights of a chapter's route by geometry alone (no Skip weak, no Ghost Signal): the
// route's walks, with every fight (route battles too) resetting the count. { zone: fights }.
function expectedFights(chapter, samples = 4000) {
  const rng = makeRng(424242);
  const byZone = {};
  for (let n = 0; n < samples; n++) {
    const walk = { map: null, zone: null, walked: 0 };
    for (const [i, step] of ROUTES[chapter].entries()) {
      if (step.battle || step.boss) walk.walked = 0;
      if (!step.walk) continue;
      const plan = walkPlan(chapter, i);
      if (walk.map !== plan.map) Object.assign(walk, { map: plan.map, zone: null, walked: 0 });
      for (const ev of plan.events) {
        if (ev.battle || ev.lift) Object.assign(walk, { zone: ev.lift ? null : walk.zone, walked: 0 });
        else if (ev.zone) walkPiece(walk, ev, rng, () => 1, (zone) => { byZone[zone] = (byZone[zone] || 0) + 1; });
      }
    }
  }
  for (const z of Object.keys(byZone)) byZone[z] /= samples;
  return byZone;
}

// Walks one piece of path; `onFight(zone)` runs for each roll that starts a fight.
function walkPiece(walk, piece, rng, factor, onFight) {
  if (piece.zone !== walk.zone) Object.assign(walk, { zone: piece.zone, walked: 0 });
  const { grace, sigma } = zoneRate(piece.zone);
  for (let d = 0; d < piece.len; d += STEP) {
    const k = factor(piece.zone);
    const s0 = Math.max(0, walk.walked - grace);
    walk.walked += Math.min(STEP, piece.len - d);
    const s1 = Math.max(0, walk.walked - grace);
    if (k > 0 && s1 > s0 && rng() < 1 - Math.exp(-(hazard(s1, sigma) - hazard(s0, sigma)) * k)) {
      walk.walked = 0;
      onFight(piece.zone);
    }
  }
}

// explore.js's hazard factor for the current party: equipment encounterRate and Skip weak.
function encounterFactor(zone) {
  let k = 1;
  for (const m of gameState.party) if (m.alive !== false && m.mods?.encounterRate) k = Math.min(k, m.mods.encounterRate);
  const avg = mean(gameState.party, (m) => m.level || 1);
  let level = 0;
  for (const id of ENCOUNTER_TABLES[zone] || []) for (const kind of ENCOUNTERS[id]?.enemies || []) level = Math.max(level, ENEMIES[kind]?.level || 0);
  return level && level <= avg - WEAK_GAP ? 0 : k;
}

function geometryLines(chapter) {
  const lines = [];
  for (const [i, step] of ROUTES[chapter].entries()) {
    if (!step.walk) continue;
    const plan = walkPlan(chapter, i);
    const byZone = {};
    let stretches = 0;
    let last = null;
    for (const ev of plan.events) {
      if (ev.battle || ev.lift) {
        last = null;
        continue;
      }
      if (!ev.zone) continue;
      byZone[ev.zone] = (byZone[ev.zone] || 0) + ev.len;
      if (ev.zone !== last) stretches++;
      last = ev.zone;
    }
    const zones = Object.entries(byZone).map(([z, len]) => `${z} ${len.toFixed(0)}`).join(', ') || 'no zone';
    const fights = plan.events.filter((e) => e.battle).map((e) => `${e.battle}${e.field ? ' (field)' : ''}`);
    lines.push(`    ${plan.map.padEnd(10)} ${plan.distance.toFixed(0).padStart(4)} units walked; zones: ${zones}` +
      `${stretches > Object.keys(byZone).length ? ` (${stretches} stretches)` : ''}${fights.length ? `; fights on the way: ${fights.join(', ')}` : ''}` +
      `${plan.placeholder ? ' [placeholder]' : ''}`);
    for (const n of new Set(plan.notes)) if (VERBOSE || plan.placeholder || /missing|no path|blocked|no /.test(n)) lines.push(`               note: ${n}`);
  }
  return lines;
}

function zoneUnits(chapter) {
  const byZone = {};
  for (const [i, step] of ROUTES[chapter].entries()) {
    if (!step.walk) continue;
    for (const ev of walkPlan(chapter, i).events) if (ev.zone) byZone[ev.zone] = (byZone[ev.zone] || 0) + ev.len;
  }
  return byZone;
}

// ------------------------------------------------------------------ party state

function snapshot() {
  return {
    party: gameState.party.map((m) => m.id),
    levels: Object.fromEntries(gameState.party.map((m) => [m.id, levelOf(m)])),
    equip: Object.fromEntries(gameState.party.map((m) => [m.id, { ...m.equip }])),
    items: Object.fromEntries(Object.entries(gameState.inventory).filter(([id, n]) => n > 0 && !ITEMS[id]?.key)),
    credits: gameState.credits,
    flags: { ...gameState.flags },
    bestiary: clone(gameState.bestiary),
  };
}

// Applies a chapter start, then a snapshot's party: gear, items (bag gear included), levels (or
// `level`: one number or { member: level }), bestiary; full HP/EP.
function restore(chapter, snap, level) {
  const js = jumpState(chapter);
  const equipped = new Set(Object.values(snap.equip).flatMap((e) => Object.values(e)));
  Object.assign(js, {
    party: [...snap.party], leader: snap.party[0], level: 1, equip: clone(snap.equip),
    items: Object.fromEntries(Object.entries(snap.items).filter(([id]) => !equipped.has(id) || !ITEMS[id]?.equip)),
    credits: snap.credits ?? 0, flags: { ...snap.flags, ...js.flags },
  });
  applyJumpState(js);
  for (const [id, n] of Object.entries(snap.items)) {
    if (equipped.has(id) && ITEMS[id]?.equip) addItem(id, Math.max(0, n - (gameState.inventory[id] || 0)));
  }
  for (const m of gameState.party) {
    const lv = level == null ? snap.levels[m.id] : typeof level === 'number' ? level : level[m.id];
    setLevel(m, lv ?? snap.levels[m.id] ?? 1);
  }
  Object.assign(gameState.bestiary, clone(snap.bestiary));
  gameState.story.chapter = chapter;
}

// A chapter starts from New Journey (prologue) or from the carry-over of the previous chapter's
// route (its members' mean end levels, the most common end gear, its mean items and credits), with
// the members the chapter starts with.
function startChapter(chapter, carry) {
  if (!carry) {
    applyJumpState(jumpState(chapter));
    gameState.story.chapter = chapter;
    return;
  }
  const js = jumpState(chapter);
  const party = js.party;
  restore(chapter, {
    ...carry, party,
    equip: Object.fromEntries(party.map((id) => [id, carry.equip[id] || js.equip[id] || {}])),
    levels: Object.fromEntries(party.map((id) => [id, carry.levels[id] ?? js.level])),
  });
}

// The typical state of many runs at one point: members' mean levels, the most common gear per
// slot, mean items and credits; flags and bestiary from the reference snapshot.
function consensus(snaps, ref) {
  const members = ref.party;
  const items = {};
  for (const sn of snaps) for (const [id, n] of Object.entries(sn.items)) items[id] = (items[id] || 0) + n / snaps.length;
  return {
    party: members,
    levels: Object.fromEntries(members.map((id) => [id, mean(snaps, (sn) => sn.levels[id])])),
    equip: Object.fromEntries(members.map((id) => [id, Object.fromEntries(['weapon', 'armor', 'accessory']
      .map((slot) => [slot, mode(snaps.map((sn) => sn.equip[id][slot] || null))]))])),
    items: Object.fromEntries(Object.entries(items).map(([id, n]) => [id, Math.round(n)]).filter(([, n]) => n > 0)),
    credits: Math.round(mean(snaps, (sn) => sn.credits)),
    flags: ref.flags,
    bestiary: ref.bestiary,
  };
}
const carryOf = (runs, refRun) => consensus(runs.map((r) => r.end), refRun.end);

// Field patch-up between fights: Revive Kits on the fallen, Medi-Gels below half HP, an Ether
// below a quarter EP (a cautious person keeps one of each). A traveler still down after that sends
// the party back to a Med-Station of the map, when it has one (true when it did).
function patchUp(used, mapId) {
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
    const ether = ['ether', 'ether_plus'].find((id) => itemCount(id) > 1);
    if (m.alive && m.ep < m.maxEp * 0.25 && ether) use(ether, m.id);
  }
  if (!mapId || gameState.party.every((m) => m.alive) || !hasMedStation(mapId)) return false;
  healParty();
  return true;
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
// Bought gear goes on at once (the shop's "Equip now?").
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

// Chests of the chapter on those maps. A first-timer leaves the gear in the bag (G2 C10-3).
function collectChests(chapter, mapIds, st, firstTimer) {
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
  if (!firstTimer) optimizeParty();
}

// ------------------------------------------------------------------ battles and mechanic tallies

function tallyFor(tally, kind) {
  return (tally[kind] ||= {
    battles: 0, lockOn: 0, lockFired: 0, lockCancel: 0, charge: 0, chargeFired: 0, chargeCancel: 0,
    dives: 0, diveFollow: 0, telegraphHits: 0, telegraphDefended: 0, heals: 0, summons: 0, breaks: 0,
    windows: 0, windowCancel: 0, windowHeal: 0,
  });
}

// Plays one battle with gameState.party (mutated in place). `tally`: mechanic counters by enemy kind.
// Returns the result plus, for bosses, Breaks on them and the party turns they were untargetable on.
function fight(encounterId, seed, tally = null) {
  const m = new BattleModel({ party: gameState.party, encounterId, rng: makeRng(seed) });
  const memo = new Map();
  const maxHp = sum(m.party, (p) => p.maxHp);
  const hp0 = sum(m.party, (p) => p.hp);
  const out = { items: {}, invalid: 0, ultGranted: 0, ultUsed: 0, ultOnBreak: 0, bossBreaks: 0 };
  let turns = 0;
  let hidden = 0;
  const windows = new Map();   // round -> { broken, healed } (cue windows, CANCEL_CHECKS)
  const transformed = new Set(m.enemies.map((e) => e.key));   // kinds already counted
  const isBoss = (id) => String(id).startsWith('e') && !!m.get(id)?.boss;
  const feed = (events) => {
    observe(memo, events);
    for (const ev of events) {
      const foeHit = String(ev.targetId).startsWith('e');
      if (ev.type === 'break' && foeHit) {
        if (tally) tallyFor(tally, m.get(ev.targetId).key).breaks++;
        if (isBoss(ev.targetId)) {
          out.bossBreaks++;
          const w = windows.get(m.round);
          if (w && !w.healed) w.broken = true;
        }
      }
      if (ev.type === 'cue' && ev.value !== false && Object.values(CANCEL_CHECKS).some((c) => c.cue === ev.name)) {
        const boss = m.enemies.find((e) => e.alive && e.boss);
        windows.set(m.round, { broken: !!boss?.broken, healed: false, kind: boss?.key });
      }
      if (ev.type === 'heal' && isBoss(ev.targetId)) {
        const w = windows.get(m.round);
        if (w && !w.broken) w.healed = true;
      }
      if (ev.type === 'learn' && ev.ultimate) out.ultGranted++;
      if (tally && (ev.type === 'transform' || ev.type === 'summon') && !transformed.has(ev.kind)) {
        transformed.add(ev.kind);
        tallyFor(tally, ev.kind).battles++;
      }
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
    turns++;
    if (m.enemies.some((e) => e.alive && e.boss && e.untargetable > 0)) hidden++;
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
  if (tally) {
    for (const w of windows.values()) {
      if (!w.kind) continue;
      const t = tallyFor(tally, w.kind);
      t.windows++;
      if (w.broken) t.windowCancel++;
      if (w.healed) t.windowHeal++;
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
    ...out, result, rounds: m.round, hpLost: (hp0 - hp1) / maxHp, xp, credits, turns, hidden,
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

// One playthrough. `ref` collects snapshots for the regular and boss checks; `firstTimer` leaves
// chest gear in the bag; `carry` is where the previous chapter's route ended.
function runRoute(chapter, seed, { ref = null, firstTimer = false, carry = null } = {}) {
  const rng = makeRng(seed);
  startChapter(chapter, carry);
  const st = {
    losses: 0, lostTo: {}, backToRest: 0, earned: 0, xp: 0, spent: 0, used: {}, boughtWeapons: [], chestWeapons: [], bossWin: false,
    fights: { scripted: 0, field: 0, random: 0, boss: 0, byZone: {} },
    startWeapons: Object.fromEntries(gameState.party.map((m) => [m.id, m.equip.weapon])),
  };
  let seq = 0;
  const walk = { map: null, zone: null, walked: 0 };
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
      st.lostTo[id] = (st.lostTo[id] || 0) + 1;
      healParty(); // game over: Retry (scripted) or the last save (field)
    }
    walk.walked = 0;
    if (patchUp(st.used, walk.map)) st.backToRest++;
    return res;
  };
  for (const [i, step] of ROUTES[chapter].entries()) {
    if (step.battle) {
      battle(step.battle, `battle:${step.battle}`);
      st.fights.scripted++;
    } else if (step.walk) {
      const plan = walkPlan(chapter, i);
      if (walk.map !== plan.map) Object.assign(walk, { map: plan.map, zone: null, walked: 0 });
      for (const ev of plan.events) {
        if (ev.lift) {
          Object.assign(walk, { zone: null, walked: 0 });
          continue;
        }
        if (ev.battle) {
          battle(ev.battle, `battle:${ev.battle}`);
          st.fights[ev.field ? 'field' : 'scripted']++;
          continue;
        }
        if (!ev.zone) continue;
        if (ref && ev.zone !== walk.zone) (ref.zoneSnaps[ev.zone] ||= []).push(snapshot());
        walkPiece(walk, ev, rng, encounterFactor, (zone) => {
          const table = ENCOUNTER_TABLES[zone] || [];
          if (!table.length) return;
          if (ref) (ref.zoneSnaps[zone] ||= []).push(snapshot());
          battle(table[Math.floor(rng() * table.length)]);
          st.fights.random++;
          st.fights.byZone[zone] = (st.fights.byZone[zone] || 0) + 1;
        });
      }
    } else if (step.join) {
      if (!gameState.party.some((m) => m.id === step.join)) {
        const m = joinParty(step.join);
        st.startWeapons[m.id] = m.equip.weapon;
      }
    } else if (step.rest) {
      if (hasMedStation(step.rest)) healParty();
    } else if (step.chests) collectChests(chapter, step.chests, st, firstTimer);
    else if (step.shop) shopVisit(step.shop, st);
    else if (step.boss) {
      healParty();
      st.bossLevels = Object.fromEntries(gameState.party.map((m) => [m.id, m.level]));
      st.bossLevel = mean(gameState.party, levelOf);
      st.bossSnap = snapshot();
      if (ref) ref.snaps[`boss:${step.boss}`] = st.bossSnap;
      const credits = gameState.credits;
      const res = fight(step.boss, seed * 977 + 3);
      for (const [k, n] of Object.entries(res.items)) st.used[k] = (st.used[k] || 0) + n;
      st.bossWin = res.result === 'victory';
      st.fights.boss++;
      if (!st.bossWin) {
        st.losses++;
        st.lostTo[step.boss] = (st.lostTo[step.boss] || 0) + 1;
        healParty();
        const again = fight(step.boss, seed * 977 + 4);
        for (const [k, n] of Object.entries(again.items)) st.used[k] = (st.used[k] || 0) + n;
        if (again.result === 'victory') st.xp += again.xp;
      } else st.xp += res.xp;
      st.earned += gameState.credits - credits;
      walk.walked = 0;
      patchUp(st.used, walk.map);
    }
  }
  st.end = snapshot();
  return st;
}

const fightCount = (r) => r.fights.scripted + r.fights.field + r.fights.random + r.fights.boss;

// Route runs per chapter, cached: the normal route and the first-timer route each chain from the
// same kind of route of the chapter before.
const routeCache = new Map();
function routes(chapter, firstTimer, n = RUNS) {
  const key = `${chapter}:${firstTimer ? 'ft' : 'route'}`;
  const hit = routeCache.get(key);
  if (hit && hit.runs.length >= n) return hit;
  const idx = CHAPTERS.findIndex((c) => c.id === chapter);
  const prev = idx > 0 && ROUTES[CHAPTERS[idx - 1].id] ? CHAPTERS[idx - 1].id : null;
  // a first-timer starts each chapter where the ordinary route left the last one (by then the
  // menus have offered the old chests' gear) and leaves only this chapter's chest gear in the bag
  let carry = null;
  if (prev) {
    const p = routes(prev, false, CARRY_RUNS);
    carry = carryOf(p.runs, p.refRun);
  }
  prepare(chapter);
  const runs = [];
  for (let i = 0; i < n; i++) runs.push(runRoute(chapter, 1000 + i * 104729, { firstTimer, carry }));
  const ref = { snaps: {}, zoneSnaps: {} };
  const refRun = runRoute(chapter, REF_SEED, { ref, firstTimer, carry });
  const out = { runs, refRun, ref, carry, prev };
  routeCache.set(key, out);
  return out;
}

const prepared = new Set();
function prepare(chapter) {
  if (prepared.has(chapter)) return;
  prepared.add(chapter);
  installPlaceholders(chapter);
  applyBalance();
}

// ------------------------------------------------------------------ chapter report

const failures = [];
function verdict(ok, label, detail) {
  const mark = ok === 'warn' ? 'warn' : ok ? 'ok  ' : 'FAIL';
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
    breaks: median(res.map((r) => r.bossBreaks)),
    hidden: sum(res, (r) => r.hidden) / Math.max(1, sum(res, (r) => r.turns)),
  };
}

function mechanicLines(tally) {
  const out = [];
  for (const [kind, t] of Object.entries(tally)) {
    const bits = [];
    const per = (n) => (n / t.battles).toFixed(2);
    if (t.lockOn) bits.push(`lock-on ${per(t.lockOn)}/battle (fired ${per(t.lockFired)}, cancelled by a Break ${per(t.lockCancel)})`);
    if (t.charge) bits.push(`charge ${per(t.charge)}/battle (fired ${per(t.chargeFired)}, cancelled by a Break ${pct(t.chargeCancel / t.charge)})`);
    if (t.windows) bits.push(`cue windows ${per(t.windows)}/battle (healed ${per(t.windowHeal)}, cancelled by a Break ${pct(t.windowCancel / t.windows)})`);
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

function fightsLine(runs) {
  const zones = {};
  for (const r of runs) for (const [z, n] of Object.entries(r.fights.byZone)) zones[z] = (zones[z] || 0) + n / runs.length;
  const avg = (k) => mean(runs, (r) => r.fights[k]);
  return {
    total: mean(runs, fightCount),
    text: `scripted ${f1(avg('scripted'))}, field ${f1(avg('field'))}, random ${f1(avg('random'))} ` +
      `[${Object.entries(zones).map(([z, n]) => `${z} ${n.toFixed(2)}`).join(', ') || 'none'}], boss ${f1(avg('boss'))}`,
  };
}

function bossCheck(chapter, snap, step, level, tally) {
  const res = battleGroup(chapter, snap, [step.boss], { level, tally, seedBase: 90000, n: BOSS_N })[0].res;
  const s = summarize(res);
  const lv = Object.entries(typeof level === 'number' ? Object.fromEntries(snap.party.map((id) => [id, level])) : level);
  const lvText = [...new Set(lv.map(([, l]) => l))].length === 1 ? `L${lv[0][1]}` : `L${lv.map(([id, l]) => `${id[0]}${l}`).join('/')}`;
  const gear = snap.party.map((id) => `${id} ${snap.equip[id].weapon || '-'}${snap.equip[id].accessory ? `+${snap.equip[id].accessory}` : ''}`).join(', ');
  return { s, res, lvText, gear };
}

function reportChapter(chapter) {
  const def = chapterDef(chapter);
  const route = ROUTES[chapter];
  const next = CHAPTERS[CHAPTERS.findIndex((c) => c.id === chapter) + 1];
  prepare(chapter);
  console.log(`\n=== ${def.kicker}: ${def.title} (${chapter}, levels ${def.levels.join('-')}) ===`);
  const ph = placeholderIds[chapter];
  console.log(ph.length ? `  placeholders: ${ph.join(', ')}` : '  placeholders: none (all content registered)');

  // geometry (C10-1)
  console.log('  geometry (critical path):');
  for (const line of geometryLines(chapter)) console.log(line);
  const units = zoneUnits(chapter);
  const exp = expectedFights(chapter);
  const rates = Object.keys(units).map((z) => {
    const r = zoneRate(z);
    return `${z} ${units[z].toFixed(0)} units at { grace ${r.grace}, sigma ${r.sigma} }${RATE_TRY[z] ? ' (--rate)' : REG.zoneRates[z] ? '' : ' (default)'} -> ${(exp[z] || 0).toFixed(2)}`;
  });
  console.log(`  expected random fights by geometry: ${rates.join('; ') || 'none'}`);
  const totalUnits = sum(Object.values(units));
  if (TARGETS.units[chapter]) {
    verdict(inRange(totalUnits, TARGETS.units[chapter]) || 'warn', 'zone walking (11.7)', `${totalUnits.toFixed(0)} units (${TARGETS.units[chapter].join('-')})`);
  }
  if (FIGHTS_ONLY) {
    const fixed = sum(route.map((s, i) => (s.battle || s.boss ? 1 : s.walk ? walkPlan(chapter, i).events.filter((e) => e.battle).length : 0)));
    const random = sum(Object.values(exp));
    verdict(inRange(Math.round(fixed + random), TARGETS.fights[chapter]), 'fights delivered (11.7)',
      `${f1(fixed + random)}: scripted, field and boss ${fixed}, random ${f1(random)} (${TARGETS.fights[chapter].join('-')})`);
    return;
  }

  // routes
  const { runs, refRun, ref, carry, prev } = routes(chapter, false);
  const ft = routes(chapter, true);
  const members = Object.keys(runs[0].end.levels);
  const levels = Object.fromEntries(members.map((id) => [id, mean(runs, (r) => r.end.levels[id])]));
  const nextStart = next ? next.levels[0] : def.levels[1];
  const delivered = fightsLine(runs);
  if (carry) console.log(`  start: ${prev} route end, levels ${Object.entries(carry.levels).map(([id, l]) => `${id} ${f1(l)}`).join(', ')}, ${carry.credits} credits`);
  const lostTo = {};
  for (const r of runs) for (const [id, n] of Object.entries(r.lostTo)) lostTo[id] = (lostTo[id] || 0) + n;
  console.log(`  route x${RUNS}: fights delivered ${f1(delivered.total)} (${delivered.text}), losses ${sum(runs, (r) => r.losses)}` +
    `${Object.keys(lostTo).length ? ` [${Object.entries(lostTo).map(([id, n]) => `${id} ${n}`).join(', ')}]` : ''}, ` +
    `walks back to rest a KO ${f1(mean(runs, (r) => r.backToRest))}, boss won first try ${pct(mean(runs, (r) => (r.bossWin ? 1 : 0)))}`);
  verdict(inRange(Math.round(delivered.total), TARGETS.fights[chapter]), 'fights delivered (11.7)', `${f1(delivered.total)} (${TARGETS.fights[chapter].join('-')})`);
  const bossLevel = mean(runs, (r) => r.bossLevel || 0);
  verdict(inRange(bossLevel - def.levels[1], TARGETS.bossLevel), `level at the boss (plan ${def.levels[1]})`,
    `${bossLevel.toFixed(2)} (whole levels ${mean(runs, (r) => mean(Object.values(r.bossLevels || { x: 0 }))).toFixed(2)}) after ${mean(runs, (r) => r.xp).toFixed(0)} XP`);
  verdict(members.every((id) => Math.abs(levels[id] - nextStart) <= TARGETS.levelSlack), `levels at the end (next start ${nextStart} +-1)`,
    members.map((id) => `${id} ${f1(levels[id])}`).join(', '));

  // regular fights
  const tally = {};
  console.log('  regular fights (fresh party at the route\'s level, gear and bestiary):');
  const groups = [];
  const seen = new Set();
  for (const [i, step] of route.entries()) {
    const battles = step.battle ? [step.battle] : step.walk ? walkPlan(chapter, i).events.filter((e) => e.battle).map((e) => e.battle) : [];
    for (const b of battles) if (ENCOUNTERS[b] && !seen.has(b)) groups.push({ label: b, snap: ref.snaps[`battle:${b}`], ids: [b] });
    battles.forEach((b) => seen.add(b));
    if (!step.walk) continue;
    for (const ev of walkPlan(chapter, i).events) {
      if (!ev.zone || seen.has(ev.zone) || !ENCOUNTER_TABLES[ev.zone]?.length) continue;
      seen.add(ev.zone);
      const snaps = ref.zoneSnaps[ev.zone] || [];
      groups.push({ label: ev.zone, snap: snaps[snaps.length >> 1], ids: [...ENCOUNTER_TABLES[ev.zone]] });
    }
  }
  for (const g of groups) {
    if (!g.snap) continue;
    const rows = battleGroup(chapter, g.snap, g.ids, { tally, seedBase: 50000 });
    const s = summarize(rows.flatMap((r) => Array.from({ length: r.weight }, () => r.res).flat()));
    const lv = Object.values(g.snap.levels).map(Math.floor);
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

  // bosses: the route check and the first-timer check (C10-3)
  const bossTally = {};
  for (const step of route.filter((s) => s.boss)) {
    const bossSnaps = (list) => list.map((r) => r.bossSnap).filter(Boolean);
    const snap = ref.snaps[`boss:${step.boss}`] && consensus(bossSnaps(runs), ref.snaps[`boss:${step.boss}`]);
    if (snap) {
      const b = bossCheck(chapter, snap, step, def.levels[1], bossTally);
      const rt = TARGETS.bossRounds[step.boss] || TARGETS.boss.rounds;
      verdict(inRange(b.s.win, TARGETS.boss.win) && inRange(b.s.rounds, rt), `boss ${step.boss} (route, ${b.lvText})`,
        `win ${pct1(b.s.win)}, median ${b.s.rounds} rounds (${rt.join('-')}), Breaks ${b.s.breaks}, HP lost ${pct(b.s.hpLost)}, KOs ${b.s.kos.toFixed(2)}`);
      console.log(`         gear: ${b.gear}`);
      const granted = mean(b.res, (r) => (r.ultGranted ? 1 : 0));
      const used = sum(b.res, (r) => r.ultUsed);
      const detail = `used ${(used / b.res.length).toFixed(2)}/battle, on a Break ${used ? pct(sum(b.res, (r) => r.ultOnBreak) / used) : '-'}`;
      // 5.4 and 7.9: the chapter's traveler awakens their ultimate inside this fight
      if (def.traveler) verdict(granted >= 0.9, `${def.traveler}'s ultimate awakens (7.9)`, `in ${pct(granted)} of battles; ${detail}`);
      else if (granted || used) console.log(`         ultimate awakened in ${pct(granted)} of battles, ${detail}`);
    }
    const ftSnap = ft.ref.snaps[`boss:${step.boss}`] && consensus(bossSnaps(ft.runs), ft.ref.snaps[`boss:${step.boss}`]);
    if (ftSnap) {
      // stats follow the whole level: each member at the median whole level the route delivers
      const lv = Object.fromEntries(ftSnap.party.map((id) => [id, Math.floor(median(ft.runs.map((r) => r.bossLevels?.[id]).filter((x) => x != null)))]));
      const b = bossCheck(chapter, ftSnap, step, lv, {});
      const t = TARGETS.firstTimer;
      const rt = TARGETS.bossRounds[step.boss] || t.rounds;
      const ok = b.s.win >= t.win && inRange(b.s.rounds, rt) && b.s.breaks >= t.breaks && Math.round(100 * b.s.hidden) <= 100 * t.hidden;
      verdict(ok, `boss ${step.boss} (first-timer, ${b.lvText})`,
        `win ${pct1(b.s.win)} (>= ${pct(t.win)}), median ${b.s.rounds} rounds (${rt.join('-')}), Breaks ${b.s.breaks} (>= ${t.breaks}), ` +
        `untargetable on ${pct(b.s.hidden)} of party turns, HP lost ${pct(b.s.hpLost)}`);
      console.log(`         gear: ${b.gear}; credits ${ftSnap.credits}; in the bag: ${Object.keys(ftSnap.items).filter((id) => ITEMS[id]?.equip).join(', ') || 'nothing'}`);
      console.log(`         route: boss won first try ${pct(mean(ft.runs, (r) => (r.bossWin ? 1 : 0)))}, fights ${f1(mean(ft.runs, fightCount))}`);
    }
    const cancel = CANCEL_CHECKS[step.boss];
    const t = cancel && bossTally[cancel.kind];
    if (cancel?.cue && t?.windows) verdict(inRange(t.windowCancel / t.windows, TARGETS.cancel), cancel.label, `${pct(t.windowCancel / t.windows)} of ${t.windows} windows`);
    else if (t?.charge) verdict(inRange(t.chargeCancel / t.charge, TARGETS.cancel), cancel.label, `${pct(t.chargeCancel / t.charge)} of ${t.charge} casts`);
    else if (cancel) verdict(false, cancel.label, 'never cast');
  }

  // economy
  const earned = mean(runs, (r) => r.earned);
  const restock = mean(runs, (r) => sum(Object.entries(r.used), ([id, n]) => n * (ITEMS[id]?.price || 0)));
  const shops = [...new Set(route.flatMap((s) => s.shop || []))];
  startChapter(chapter, carry);
  const up = weaponUpgradeCost(chapter, shops, members, refRun.chestWeapons, refRun.startWeapons);
  verdict(earned >= up.cost + restock, 'credits buy a weapon each + a restock',
    `earned ${earned.toFixed(0)} vs ${up.cost} weapons [${up.detail.join(', ') || 'none for sale'}] + ${restock.toFixed(0)} restock`);
  const bought = {};
  for (const r of runs) for (const w of r.boughtWeapons) bought[w] = (bought[w] || 0) + 1;
  console.log(`         spent ${mean(runs, (r) => r.spent).toFixed(0)}, ends with ${mean(runs, (r) => r.end.credits).toFixed(0)} credits; ` +
    `weapons bought: ${Object.entries(bought).map(([w, n]) => `${w} ${pct(n / RUNS)}`).join(', ') || 'none'}`);
  const usedAvg = {};
  for (const r of runs) for (const [id, n] of Object.entries(r.used)) usedAvg[id] = (usedAvg[id] || 0) + n / RUNS;
  console.log(`         items used per run: ${Object.entries(usedAvg).map(([id, n]) => `${id} ${n.toFixed(1)}`).join(', ') || 'none'}`);

  // kits: the next chapter's starter kit against how the route ends
  if (next && REG.kits[next.id]) {
    const kit = REG.kits[next.id];
    const end = carryOf(runs, refRun);
    const diffs = [];
    for (const id of members) {
      for (const slot of ['weapon', 'armor', 'accessory']) {
        const k = kit.equip?.[id]?.[slot] || '-';
        const r = end.equip[id][slot] || '-';
        if (r !== k) diffs.push(`${id}.${slot} kit ${k} / route ${r}`);
      }
    }
    const fmt = (o) => Object.entries(o).filter(([id]) => !ITEMS[id]?.equip).map(([id, n]) => `${id} ${n}`).join(', ');
    console.log(`  kit ${next.id}: credits ${kit.credits} / route ${end.credits}; gear ${diffs.length ? diffs.join(', ') : 'matches the route'}`);
    console.log(`         items: kit ${fmt(kit.items || {})} / route ${fmt(end.items)}`);
    if (VERBOSE) {
      const gear = members.map((id) => `${id}: ['${end.equip[id].weapon}', ${end.equip[id].accessory ? `'${end.equip[id].accessory}'` : 'null'}]`);
      const armor = mode(members.map((id) => end.equip[id].armor));
      const odd = members.filter((id) => end.equip[id].armor !== armor).map((id) => `${id}.armor '${end.equip[id].armor}'`);
      const items = Object.entries(end.items).filter(([id]) => !ITEMS[id]?.equip).map(([id, n]) => `${id}: ${n}`);
      console.log(`         route as a kit: outfit('${armor}', { ${gear.join(', ')} })${odd.length ? ` with ${odd.join(', ')}` : ''}, ` +
        `items: { ${items.join(', ')} }, credits: ${Math.round(end.credits / 50) * 50}`);
    }
  }

  // mechanic frequencies
  console.log('  mechanics (regular fights):');
  for (const line of mechanicLines(tally)) console.log(line);
  console.log('  mechanics (bosses, route check):');
  for (const line of mechanicLines(bossTally)) console.log(line);
}

// ------------------------------------------------------------------ main

console.log(`VOIDPATH campaign balance: ${FIGHTS_ONLY ? 'geometry only' : `${N} battles per encounter, ${RUNS} route runs`}` +
  `${FORCE_PLACEHOLDERS ? ', placeholders forced' : ''}` +
  TRY.map(([id, kinds]) => `, trying ${id} = ${kinds}`).join('') +
  Object.entries(RATE_TRY).map(([z, r]) => `, trying ${z} at { grace ${r.grace}, sigma ${r.sigma} }`).join('') +
  [...SCALE_TRY.map(([k, f, v]) => `, ${k}.${f} x${v}`), ...ENEMY_TRY.map(([k, f, v]) => `, ${k}.${f} = ${v}`)].join(''));
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
