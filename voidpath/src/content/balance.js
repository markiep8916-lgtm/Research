// Balance (PURE, TECH_PLAN 7.1, 10.4, 11.7). Owned by S3 in Wave S, then tuned by C10 and I2c.
// Imports only battle/data.js. Content writes enemy numbers through statLine:
//
//   { kind, name, art, ...statLine(12, 'brute'), shield: 5, weaknesses, actions, drops }
//
// statLine(level, archetype) -> { level, maxHp, stats: { atk, def, mag, res, spd }, xp, credits }
// archetypes: swarm standard brute caster armored boss elite
//
// applyBalance() (called by the registry after every location is registered) mutates in place:
//   BATTLE_RULES   deep-merged with overrides.rules
//   ENEMIES[kind]  merged with overrides.enemies[kind] (any field; `stats` merges per stat)
//   PARTY_DEFS[id] base / growth merged with overrides.party[id] (core/progression.js statsAt)
//   ZONE_RATE_DEFAULT merged with overrides.zoneRate
// It is idempotent, so registering twice changes nothing.

import { BATTLE_RULES, ENEMIES, PARTY_DEFS } from '../battle/data.js';

// Field encounter hazard (world/explore.js): grace units of walking before the first roll, then
// about one encounter per `sigma` more (about one per 42 units in total, 11.7).
export const ZONE_RATE_DEFAULT = { grace: 12, sigma: 24 };

// Standard enemy at level 10 (anchored on the POC Sec-Drone, level 10, 1500 HP).
const ANCHOR = { level: 10, maxHp: 1500, atk: 52, def: 34, mag: 56, res: 32, spd: 50 };
// Party ATK grows roughly as (level + 9.3); enemy HP and stats follow it so hits-to-kill and
// damage taken stay comparable across the campaign.
const curve = (level) => (level + 9.3) / (ANCHOR.level + 9.3);

export const ARCHETYPES = {
  swarm:    { hp: 0.45, atk: 0.85, def: 0.8, mag: 0.85, res: 0.8, spd: 1.15, xp: 0.5, credits: 0.5 },
  standard: { hp: 1, atk: 1, def: 1, mag: 1, res: 1, spd: 1, xp: 1, credits: 1 },
  brute:    { hp: 1.4, atk: 1.2, def: 1.1, mag: 0.8, res: 0.85, spd: 0.75, xp: 1.3, credits: 1.3 },
  caster:   { hp: 0.9, atk: 0.75, def: 0.85, mag: 1.25, res: 1.2, spd: 1, xp: 1.1, credits: 1.1 },
  armored:  { hp: 1.25, atk: 1, def: 1.6, mag: 0.8, res: 1.1, spd: 0.6, xp: 1.3, credits: 1.4 },
  elite:    { hp: 2.2, atk: 1.25, def: 1.2, mag: 1.25, res: 1.2, spd: 1.05, xp: 3, credits: 3 },
  boss:     { hp: 5, atk: 1.2, def: 1.15, mag: 1.2, res: 1.15, spd: 1, xp: 10, credits: 12 },
};

export function statLine(level, archetype = 'standard') {
  const a = ARCHETYPES[archetype];
  if (!a) throw new Error(`balance: unknown archetype "${archetype}"`);
  const k = curve(level);
  const stat = (key) => Math.max(1, Math.round(ANCHOR[key] * k * a[key]));
  return {
    level,
    maxHp: Math.max(1, Math.round((ANCHOR.maxHp * k * a.hp) / 10) * 10),
    stats: { atk: stat('atk'), def: stat('def'), mag: stat('mag'), res: stat('res'), spd: stat('spd') },
    xp: Math.round((8 * level + 16) * a.xp),
    credits: Math.round((5 * level + 10) * a.credits),
  };
}

// C10 fills these (Wave C); every key is optional.
//   party:    { [memberId]: { base?: { maxHp, ... }, growth?: { ... } } }
//   enemies:  { [kind]: { maxHp?, stats?: { atk, ... }, shield?, xp?, ... } }
//   rules:    { partyScale?, difficulty?, ultimateBp? }
//   zoneRate: { grace?, sigma? }
export const overrides = { party: {}, enemies: {}, rules: {}, zoneRate: {} };

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
  for (const [kind, o] of Object.entries(overrides.enemies)) {
    const def = ENEMIES[kind];
    if (!def) {
      console.error(`balance: overrides.enemies names an unknown enemy kind "${kind}"`);
      continue;
    }
    mergeDeep(def, o);
  }
}
