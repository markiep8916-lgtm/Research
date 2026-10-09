// Balance (PURE, TECH_PLAN 7.1, 10.4, 11.7). Owned by S3 in Wave S, then tuned by C10 and I2c.
// Imports only battle/data.js. Content writes enemy numbers through statLine:
//
//   { kind, name, art, ...statLine(12, 'brute'), shield: 5, weaknesses, actions, drops }
//
// statLine(level, archetype) -> { level, maxHp, stats: { atk, def, mag, res, spd }, xp, credits }
// archetypes: swarm standard brute caster armored boss elite
// xpAt(level), creditsAt(level)   rewards of a standard enemy (archetypes scale them)
//
// applyBalance() (called by the registry after every location is registered) mutates in place:
//   BATTLE_RULES   deep-merged with overrides.rules
//   ENEMIES[kind]  scaled by overrides.scale[kind] (multipliers on the registered numbers), then
//                  merged with overrides.enemies[kind] (any field; `stats` merges per stat)
//   PARTY_DEFS[id] base / growth merged with overrides.party[id] (core/progression.js statsAt)
//   ZONE_RATE_DEFAULT merged with overrides.zoneRate
// It is idempotent, so registering twice changes nothing (scale always starts from the numbers
// the content registered).
//
// How the curves were tuned (C10-alpha and C10-beta, tests/campaign.mjs: `npm run balance`): a
// standard enemy of the party's level takes about as many party hits to kill at every level
// (`tough`), hits about as hard against party HP and defences (`fierce`: steeper, because party HP
// and gear grow faster than party ATK) and acts early enough in the round to land its blows before a
// Break (`quick`). Past level 12 (`LATE`) foes gain a little more HP and offence per level, because
// area skills, tier-3/4 gear and ultimates make the party stronger faster than its stats grow.
// Rewards follow the level curve on the fights the maps deliver (G2 C10-1/C10-2: the simulator
// derives each chapter's fight count from its critical-path distance and zone rates): the party
// meets each boss at its chapter's end level, and a boss is worth about half a level.
//
// Lines the chapters use (regular enemies sit 1-4 levels above the chapter's start level, its boss
// at its end level, elites 2 above the boss's level with `elite`):
//   prologue  pro_drone_glitch 1 swarm, pro_drone 3 standard, pro_crawler 4 brute, pro_turret 5
//             armored, sentinel_mk1 6 brute, pro_sentinel 7 boss
//   ch1       ice_mite 8 swarm, void_eel 9, rime_golem 10 armored, salvage_bot 11, maw 12 boss
//   ch2       spore_drone 13 caster, rootling 13 swarm, bloom_mantis 14 brute, feral_caretaker 15,
//             gardener 17 boss
//   ch3       sec_trooper 18, riot_drone 18 caster, laser_turret 19 armored, sentinel_mk3 20 brute,
//             voss / voss_overclock 22 boss (+ voss_escort 20)
//   ch4       data_wraith 23 caster, glitch_swarm 23, firewall_golem 24 armored, corrupted_memory 25
//             caster, echo 27 boss
//   finale    warden_seraph 28 caster, dream_eater 29, choir_guardian 30 armored, the four elites 31
//             elite, warden_lock 31 / warden_unbound 32 boss
// Per-kind `overrides` below carry what the curves cannot: lesson foes that must live long enough,
// chapter XP that lands the party on each boss's level, and every boss's 8-10 rounds with two
// Breaks against a first-timer's gear (G2 C10-3, bar rule 7).

import { BATTLE_RULES, ENEMIES, PARTY_DEFS } from '../battle/data.js';

// Field encounter hazard (world/explore.js): grace units of walking before the first roll, then
// about one encounter per `sigma` more (about one per 42 units in total, 11.7).
export const ZONE_RATE_DEFAULT = { grace: 12, sigma: 24 };

// Standard enemy at level 10: the POC Sec-Drone (1500 HP; the unit tests pin it).
const ANCHOR = { level: 10, maxHp: 1500, atk: 52, def: 34, mag: 56, res: 32, spd: 50 };
const OFFENSE = 1.35;   // ATK and MAG at level 10 against the POC drone
const SPEED = 1.45;     // SPD at level 10 against the POC drone
const tough = (level) => (level + 9.3) / 19.3;               // HP, DEF, RES
const fierce = (level) => (OFFENSE * (level + 5)) / 15;      // ATK, MAG
const quick = (level) => (SPEED * (level + 30)) / 40;        // SPD
// Past level 12 the party gains area skills, tier-3 and tier-4 gear and ultimates faster than the
// curves above grow, so foes of the later chapters get a little more HP and offence per level.
const LATE = { hp: 0.03, offense: 0.015 };
const late = (level, k) => 1 + k * Math.max(0, level - 12);

export function xpAt(level) {
  return Math.round((8.5 * level + 10) * (1 + 0.1 * Math.max(0, 8 - level)));
}

export function creditsAt(level) {
  return Math.round(8 * level + 20);
}

export const ARCHETYPES = {
  swarm:    { hp: 0.55, atk: 1, def: 0.8, mag: 1, res: 0.8, spd: 1.15, xp: 0.5, credits: 0.5 },
  standard: { hp: 1, atk: 1, def: 1, mag: 1, res: 1, spd: 1, xp: 1, credits: 1 },
  brute:    { hp: 1.4, atk: 1.2, def: 1.1, mag: 0.8, res: 0.85, spd: 0.75, xp: 1.3, credits: 1.3 },
  caster:   { hp: 0.9, atk: 0.75, def: 0.85, mag: 1.25, res: 1.2, spd: 1, xp: 1.1, credits: 1.1 },
  armored:  { hp: 1.25, atk: 1, def: 1.6, mag: 0.8, res: 1.1, spd: 0.6, xp: 1.3, credits: 1.4 },
  elite:    { hp: 2.2, atk: 1.25, def: 1.2, mag: 1.25, res: 1.2, spd: 1.05, xp: 1.8, credits: 3 },
  boss:     { hp: 6, atk: 1, def: 1.15, mag: 1, res: 1.15, spd: 1, xp: 2, credits: 5 },
};

export function statLine(level, archetype = 'standard') {
  const a = ARCHETYPES[archetype];
  if (!a) throw new Error(`balance: unknown archetype "${archetype}"`);
  const t = tough(level);
  const f = fierce(level) * late(level, LATE.offense);
  const stat = (key, k) => Math.max(1, Math.round(ANCHOR[key] * k * a[key]));
  return {
    level,
    maxHp: Math.max(1, Math.round((ANCHOR.maxHp * t * late(level, LATE.hp) * a.hp) / 10) * 10),
    stats: { atk: stat('atk', f), def: stat('def', t), mag: stat('mag', f), res: stat('res', t), spd: stat('spd', quick(level)) },
    xp: Math.round(xpAt(level) * a.xp),
    credits: Math.round(creditsAt(level) * a.credits),
  };
}

const PROLOGUE_XP = 1.31;   // the party forms over eight fights and reaches level 7 at the SENTINEL

// The enemies battle/data.js defines (the POC's): their numbers stay the POC's.
const POC_KINDS = new Set(Object.keys(ENEMIES));

// Every key is optional.
//   party:    { [memberId]: { base?: { maxHp, ... }, growth?: { ... } } }
//   scale:    { [kind]: { maxHp?, atk?, def?, mag?, res?, spd?, xp?, credits? } }   multipliers
//   enemies:  { [kind]: { maxHp?, stats?: { atk, ... }, shield?, xp?, ... } }        absolute values
//   xpByLevel: [[fromLevel, toLevel, factor]]   XP of every content enemy (not the POC's) of that
//             level band, on top of `scale`: each chapter's foes sit in its own band, so this lands
//             the party on the chapter's boss level with the fights its maps deliver (G2 C10-2)
//   rules:    { partyScale?, difficulty?, ultimateBp? }
//   zoneRate: { grace?, sigma? }
// A kind that no location registers is reported (console.error), so list registered kinds only.
export const overrides = {
  party: {},
  scale: {
    pro_drone_glitch: { maxHp: 2.75 },                 // lives long enough for the tutorial's Break
    pro_drone: { xp: PROLOGUE_XP },
    pro_drone_ram: { xp: PROLOGUE_XP },
    pro_crawler: { xp: PROLOGUE_XP },
    pro_turret: { xp: PROLOGUE_XP },
    sentinel_mk1: { xp: PROLOGUE_XP, maxHp: 1.4 },     // the squad lasts until a rail charge fires
    pro_sentinel: { maxHp: 1.07, atk: 1.11, mag: 1.11 },  // no PROLOGUE_XP: a boss is worth about half a level
    rime_golem: { maxHp: 1.5 },                        // must be Broken, not just outlasted
    maw: { maxHp: 1.25, atk: 1.12, mag: 1.12 },        // 8-10 rounds against a first-timer (G2 C10-3)
    // the Arboretum's foes sleep and summon more than they hit: they hit harder to cost 15-35% HP
    spore_drone: { atk: 1.35, mag: 1.35, maxHp: 1.15 },
    bloom_mantis: { atk: 1.35, mag: 1.35, maxHp: 1.15 },
    rootling: { atk: 1.35, mag: 1.35, maxHp: 1.15 },
    feral_caretaker: { atk: 2, mag: 2, maxHp: 1.4 },
    gardener: { xp: 0.3 },                             // the chapter ends at 17 (her numbers are C4's)
    honour_guard: { xp: 0.35 },                        // three of them: worth about a level, like the other rare finds
    // Voss: the overclock is the dangerous half, so a squad in the chapter's chest gear still loses
    // about one fight in ten (route check 85-95%) and a first-timer who bought the Security Plate
    // wins four in five, while a weaker squad still lives to see the overclock (spire.test seeds)
    voss: { xp: 0.6, atk: 1.14, mag: 1.14 },
    voss_overclock: { xp: 0.6, atk: 1.4, mag: 1.4 },
    voss_escort: { xp: 0.15 },
    corrupted_memory: { mag: 0.85 },                   // the Overwrite lesson costs at most a third of the squad's HP
    echo: { maxHp: 1.5, atk: 1.22, mag: 1.22, xp: 0.75 },   // 9-10 rounds, two Severances, a third cancelled
    // the Heart: a guardian's cradle rings already make its formations the longest of the game
    choir_guardian: { maxHp: 0.6 },
  },
  enemies: {
    pro_drone_glitch: { xp: 100 },   // the tutorial levels Kade up before Sera joins
    sentinel_mk1: { shield: 5 },     // its rail charge must sometimes fire: the Defend lesson
    sec_trooper: { shield: 6 },      // the checkpoint pair lasts long enough to cost 15% of the squad's HP
    rime_golem: { shield: 5 },       // breakable before it falls: the Break-timing lesson
    maw: { shieldGain: 1 },          // two Breaks in a first-timer's fight (G2 bar rule 7)
    voss_overclock: { shield: 3 },   // her second form breaks once more before she falls
    echo: { shield: 5, shieldGain: 1 },   // two Breaks against a first-timer, one in time for a Severance
  },
  // chapter 1, 2, 3 and 4 foes (their bosses too)
  xpByLevel: [[8, 12, 0.85], [13, 17, 0.94], [18, 22, 1.18], [23, 27, 0.86], [28, 33, 0.72]],
  // Duos lack area skills and a spare healer, so their foes shrink more than in the POC.
  rules: { partyScale: { hp: [0, 0.45, 0.5, 0.85, 1], dmg: [0, 0.7, 0.7, 0.92, 1] } },
  zoneRate: {},
};

function mergeDeep(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      mergeDeep(target[k], v);
    } else {
      target[k] = Array.isArray(v) ? [...v] : v;
    }
  }
  return target;
}

// The numbers each EnemyDef was registered with, so `scale` multiplies them only once.
const registered = new WeakMap();

function scaleEnemy(def, mult) {
  let base = registered.get(def);
  if (!base) registered.set(def, (base = { maxHp: def.maxHp, xp: def.xp, credits: def.credits, stats: { ...def.stats } }));
  Object.assign(def, { maxHp: base.maxHp, xp: base.xp, credits: base.credits });
  Object.assign(def.stats, base.stats);
  for (const [key, m] of Object.entries(mult)) {
    if (key in base.stats) def.stats[key] = Math.max(1, Math.round(base.stats[key] * m));
    else if (key === 'maxHp') def.maxHp = Math.max(10, Math.round((base.maxHp * m) / 10) * 10);
    else if (key in base) def[key] = Math.round(base[key] * m);
  }
}

function enemyDef(kind) {
  const def = ENEMIES[kind];
  if (!def) console.error(`balance: overrides name an unknown enemy kind "${kind}"`);
  return def;
}

export function applyBalance() {
  mergeDeep(BATTLE_RULES, overrides.rules);
  Object.assign(ZONE_RATE_DEFAULT, overrides.zoneRate);
  for (const [id, o] of Object.entries(overrides.party)) {
    const def = PARTY_DEFS[id];
    if (!def) {
      console.error(`balance: overrides.party names an unknown member "${id}"`);
      continue;
    }
    if (o.base) Object.assign(def.base, o.base);
    if (o.growth) Object.assign(def.growth, o.growth);
  }
  for (const kind of Object.keys(overrides.scale || {})) enemyDef(kind);
  for (const [kind, def] of Object.entries(ENEMIES)) {
    const mult = { ...(overrides.scale?.[kind] || {}) };
    const band = !POC_KINDS.has(kind) && (overrides.xpByLevel || []).find(([lo, hi]) => def.level >= lo && def.level <= hi);
    if (band) mult.xp = (mult.xp ?? 1) * band[2];
    if (Object.keys(mult).length || registered.has(def)) scaleEnemy(def, mult);
  }
  for (const [kind, o] of Object.entries(overrides.enemies)) {
    const def = enemyDef(kind);
    if (def) mergeDeep(def, o);
  }
}
