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
// How the curves were tuned (C10-alpha, tests/campaign.mjs: `npm run balance`): a standard enemy
// of the party's level takes about as many party hits to kill at every level (`tough`), hits about
// as hard against party HP and defences (`fierce`: steeper, because party HP and gear grow faster
// than party ATK) and acts early enough in the round to land its blows before a Break (`quick`).
// Rewards follow the level curve: about 0.15 of a level per standard enemy from level 8 on, more in
// the prologue (a level a fight while the party forms); a boss is worth a little under a level.
//
// Lines the alpha chapters use (a chapter's regular enemies sit 1-4 levels above its start level,
// its boss at its end level, elites 2 above the boss's level with `elite`):
//   prologue  pro_drone_glitch 1 swarm, pro_drone 3 standard, pro_crawler 4 brute, pro_turret 5
//             armored, sentinel_mk1 6 brute, pro_sentinel 7 boss (shield 6, cap 12)
//   ch1       ice_mite 8 swarm, void_eel 9 caster, rime_golem 10 armored, salvage_bot 11 standard,
//             maw 12 boss (shield 8, cap 14, two actions)

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
  const f = fierce(level);
  const stat = (key, k) => Math.max(1, Math.round(ANCHOR[key] * k * a[key]));
  return {
    level,
    maxHp: Math.max(1, Math.round((ANCHOR.maxHp * t * a.hp) / 10) * 10),
    stats: { atk: stat('atk', f), def: stat('def', t), mag: stat('mag', f), res: stat('res', t), spd: stat('spd', quick(level)) },
    xp: Math.round(xpAt(level) * a.xp),
    credits: Math.round(creditsAt(level) * a.credits),
  };
}

const PROLOGUE_XP = 1.35;   // the party forms over eight fights and still reaches level 7

// Every key is optional.
//   party:    { [memberId]: { base?: { maxHp, ... }, growth?: { ... } } }
//   scale:    { [kind]: { maxHp?, atk?, def?, mag?, res?, spd?, xp?, credits? } }   multipliers
//   enemies:  { [kind]: { maxHp?, stats?: { atk, ... }, shield?, xp?, ... } }        absolute values
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
    pro_sentinel: { xp: PROLOGUE_XP, maxHp: 1.07, atk: 1.11, mag: 1.11 },
    rime_golem: { maxHp: 1.5 },                        // must be Broken, not just outlasted
    maw: { maxHp: 0.85, atk: 1.1, mag: 1.1 },          // two actions a round: shorter, sharper
  },
  enemies: {
    pro_drone_glitch: { xp: 100 },   // the tutorial levels Kade up before Sera joins
    sentinel_mk1: { shield: 5 },     // its rail charge must sometimes fire: the Defend lesson
    rime_golem: { shield: 5 },       // breakable before it falls: the Break-timing lesson
  },
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
  for (const [kind, mult] of Object.entries(overrides.scale || {})) {
    const def = enemyDef(kind);
    if (def) scaleEnemy(def, mult);
  }
  for (const [kind, o] of Object.entries(overrides.enemies)) {
    const def = enemyDef(kind);
    if (def) mergeDeep(def, o);
  }
}
