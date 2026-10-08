// Party progression (PURE, TECH_PLAN 5.3-5.5): level curve, learnsets, ultimates, equipment math.
//
//   LEARNSETS[id]                    [{ level, skill }] in learn order (table 5.4)
//   ULTIMATES[id]                    the member's ultimate skill id (granted by the ult:<id> flag)
//   statsAt(id, level)               { maxHp, maxEp, atk, def, mag, res, spd } before equipment:
//                                    PARTY_DEFS base + (level - def.level) * growth, floored
//   makeMemberAt(id, level, { flags }) -> PartyMember (campaign: true, full HP/EP, no gear,
//                                    every skill up to `level` plus flag-granted ultimates)
//   refreshMember(member)            recompute effective maxHp/maxEp/stats/mods from level and gear,
//                                    keeping the HP/EP deficit (KO'd members stay at 0 HP)
//   learnByLevel(member) -> ids      newly learned learnset skills (levels <= member.level)
//   learnFromFlags(member, flags)    ultimates from ult:<member> flags -> ids
//   canEquip(member, itemId)
//   equip(member, slot, itemId | null, inventory = gameState.inventory) -> { ok, message }
//                                    moves items between the inventory and the member, then refreshes
//   equipDelta(member, slot, itemId) -> { maxHp, maxEp, atk, def, mag, res, spd }   (UI arrows)
//   equipBonus(member) -> { stats, resist, boost, immune, ailmentResist, startBp, encounterRate }
//   optimize(member, inventory = gameState.inventory) -> { weapon, armor, accessory }   (ids, not applied)
//
// Gear ItemDefs come from ITEMS (battle/data.js), into which content registration merges
// src/content/common/data.js. member.maxHp/maxEp/stats always hold effective values, so the
// BattleModel reads members exactly as in the POC.

import { PARTY_DEFS, SKILLS, ITEMS, DAMAGE_TYPES } from '../battle/data.js';
import { gameState, xpToNext } from './state.js';

export const MAX_LEVEL = 40;
export const SLOTS = ['weapon', 'armor', 'accessory'];
export const STAT_KEYS = ['maxHp', 'maxEp', 'atk', 'def', 'mag', 'res', 'spd'];
const FLOORS = { maxHp: 120, maxEp: 20, atk: 8, def: 8, mag: 8, res: 8, spd: 8 };

const learnset = (pairs) => pairs.map(([level, skill]) => ({ level, skill }));

export const LEARNSETS = {
  kade: learnset([[1, 'arc_slash'], [3, 'cross_edge'], [5, 'provoke'], [8, 'lance_charge'], [12, 'rally'],
    [16, 'storm_lance'], [20, 'aegis_stance'], [25, 'thunder_rend'], [29, 'skyfall']]),
  nyx: learnset([[1, 'scatter_shot'], [1, 'cryo_round'], [3, 'expose'], [6, 'void_round'], [10, 'quickdraw'],
    [15, 'frost_volley'], [20, 'dead_eye'], [25, 'event_horizon'], [28, 'ringbreaker']]),
  orion: learnset([[1, 'thermal_burst'], [2, 'cryo_field'], [4, 'volt_chain'], [6, 'overclock'], [10, 'static_field'],
    [14, 'inferno'], [19, 'recompile'], [24, 'absolute_zero'], [30, 'entropy']]),
  sera: learnset([[1, 'nanoheal'], [1, 'photon_lance'], [4, 'restore_field'], [6, 'revive'], [9, 'clarity'],
    [14, 'radiant_spear'], [19, 'aegis_field'], [23, 'triage'], [29, 'dawnsong']]),
};

export const ULTIMATES = { kade: 'oathblade', nyx: 'ringfire_barrage', orion: 'singularity', sera: 'lifebloom' };

const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(v)));
const zeroStats = () => ({ maxHp: 0, maxEp: 0, atk: 0, def: 0, mag: 0, res: 0, spd: 0 });

export function emptyEquip() {
  return { weapon: null, armor: null, accessory: null };
}

export function emptyMods() {
  return { resist: {}, boost: {}, immune: [], ailmentResist: {}, startBp: 0, encounterRate: 1 };
}

export function statsAt(id, level) {
  const def = PARTY_DEFS[id];
  if (!def) throw new Error(`progression: unknown member "${id}"`);
  const out = {};
  for (const k of STAT_KEYS) {
    out[k] = Math.max(FLOORS[k], Math.round(def.base[k] + (level - def.level) * (def.growth[k] || 0)));
  }
  return out;
}

// Gear ItemDef of an equipped id, or null (unknown ids are ignored, not fatal).
function gearDef(itemId) {
  const it = itemId ? ITEMS[itemId] : null;
  return it && it.equip ? it : null;
}

function bonusOf(equipSet) {
  const b = { stats: zeroStats(), ...emptyMods() };
  for (const slot of SLOTS) {
    const it = gearDef(equipSet?.[slot]);
    if (!it) continue;
    const e = it.equip;
    for (const [k, v] of Object.entries(e.stats || {})) if (k in b.stats) b.stats[k] += v;
    // Resists and boosts add up (resist capped at 90%); ailment resists combine as independent chances.
    for (const [t, v] of Object.entries(e.resist || {})) b.resist[t] = Math.min(0.9, (b.resist[t] || 0) + v);
    for (const [t, v] of Object.entries(e.boost || {})) b.boost[t] = (b.boost[t] || 0) + v;
    for (const s of e.immune || []) if (!b.immune.includes(s)) b.immune.push(s);
    for (const [s, v] of Object.entries(e.ailmentResist || {})) b.ailmentResist[s] = 1 - (1 - (b.ailmentResist[s] || 0)) * (1 - v);
    b.startBp += e.startBp || 0;
    if (e.encounterRate != null) b.encounterRate *= e.encounterRate;
  }
  return b;
}

export function equipBonus(member) {
  return bonusOf(member.equip);
}

function effectiveStats(member, equipSet) {
  const base = statsAt(member.id, member.level);
  const bonus = bonusOf(equipSet).stats;
  const out = {};
  for (const k of STAT_KEYS) out[k] = Math.max(1, base[k] + bonus[k]);
  return out;
}

export function refreshMember(member) {
  if (!member.equip) member.equip = emptyEquip();
  const eff = effectiveStats(member, member.equip);
  const hpDeficit = Math.max(0, (member.maxHp || 0) - (member.hp || 0));
  const epDeficit = Math.max(0, (member.maxEp || 0) - (member.ep || 0));
  member.maxHp = eff.maxHp;
  member.maxEp = eff.maxEp;
  member.hp = member.alive ? clampInt(eff.maxHp - hpDeficit, 1, eff.maxHp) : 0;
  member.ep = clampInt(eff.maxEp - epDeficit, 0, eff.maxEp);
  const stats = member.stats || (member.stats = {});
  for (const k of ['atk', 'def', 'mag', 'res', 'spd']) stats[k] = eff[k];
  const { stats: _ignored, ...mods } = bonusOf(member.equip);
  member.mods = mods;
  member.xpNext = xpToNext(member.level);
  return member;
}

export function learnByLevel(member) {
  const learned = [];
  for (const { level, skill } of LEARNSETS[member.id] || []) {
    if (level > member.level || member.skills.includes(skill) || !SKILLS[skill]) continue;
    member.skills.push(skill);
    learned.push(skill);
  }
  return learned;
}

export function learnFromFlags(member, flags = {}) {
  const ult = ULTIMATES[member.id];
  if (!ult || !flags[`ult:${member.id}`] || member.skills.includes(ult)) return [];
  member.skills.push(ult);
  return [ult];
}

export function makeMemberAt(id, level, { flags } = {}) {
  const def = PARTY_DEFS[id];
  if (!def) throw new Error(`progression: unknown member "${id}"`);
  const lv = clampInt(level, 1, MAX_LEVEL);
  const m = {
    id: def.id, name: def.name, cls: def.cls, level: lv, xp: 0, xpNext: xpToNext(lv),
    hp: 0, maxHp: 0, ep: 0, maxEp: 0, stats: {}, weapons: [...def.weapons], skills: [],
    accent: def.accent, alive: true,
    campaign: true, equip: emptyEquip(), mods: emptyMods(),
  };
  refreshMember(m);
  learnByLevel(m);
  learnFromFlags(m, flags || {});
  return m;
}

export function canEquip(member, itemId) {
  const it = gearDef(itemId);
  if (!it || !member || !PARTY_DEFS[member.id]) return false;
  const owners = it.equip.for;
  return !owners || owners.includes(member.id);
}

function takeOne(inventory, id) {
  const n = inventory[id] || 0;
  if (n <= 1) delete inventory[id];
  else inventory[id] = n - 1;
}

export function equip(member, slot, itemId, inventory = gameState.inventory) {
  if (!SLOTS.includes(slot)) return { ok: false, message: 'Unknown slot.' };
  if (!member.equip) member.equip = emptyEquip();
  const current = member.equip[slot];
  if (itemId == null) {
    if (!current) return { ok: false, message: 'Nothing is equipped there.' };
    inventory[current] = (inventory[current] || 0) + 1;
    member.equip[slot] = null;
    refreshMember(member);
    return { ok: true, message: `${member.name} removed the ${ITEMS[current]?.name || current}.` };
  }
  const it = ITEMS[itemId];
  if (!it) return { ok: false, message: 'Unknown item.' };
  if (!it.equip) return { ok: false, message: `The ${it.name} isn't equipment.` };
  if (it.equip.slot !== slot) return { ok: false, message: `The ${it.name} doesn't go in that slot.` };
  if (!canEquip(member, itemId)) return { ok: false, message: `${member.name} can't use the ${it.name}.` };
  if (current === itemId) return { ok: false, message: `${member.name} already has the ${it.name} equipped.` };
  if (!(inventory[itemId] > 0)) return { ok: false, message: `No ${it.name} left.` };
  takeOne(inventory, itemId);
  if (current) inventory[current] = (inventory[current] || 0) + 1;
  member.equip[slot] = itemId;
  refreshMember(member);
  return { ok: true, message: `${member.name} equipped the ${it.name}.` };
}

export function equipDelta(member, slot, itemId) {
  const set = member.equip || emptyEquip();
  const now = effectiveStats(member, set);
  const next = effectiveStats(member, { ...set, [slot]: itemId ?? null });
  const out = {};
  for (const k of STAT_KEYS) out[k] = next[k] - now[k];
  return out;
}

// Damage types a member actually deals (weapons and known attack skills), for scoring boosts.
function typesUsed(member) {
  const types = new Set(member.weapons || []);
  for (const id of member.skills || []) if (SKILLS[id]?.kind === 'attack') types.add(SKILLS[id].type);
  return types;
}

// Heuristic gear score for Optimize: the member's main offensive stat counts most, then defenses;
// each effect is worth a fixed amount (boosts only when the member deals that type).
function gearScore(member, itemId) {
  const it = gearDef(itemId);
  if (!it) return 0;
  const def = PARTY_DEFS[member.id];
  const magUser = def.base.mag > def.base.atk;
  const e = it.equip;
  const s = { ...zeroStats(), ...e.stats };
  let score = (magUser ? s.mag : s.atk) * 1.0 + (magUser ? s.atk : s.mag) * 0.25
    + s.def * 0.6 + s.res * 0.6 + s.spd * 0.5 + s.maxHp / 10 + s.maxEp / 5;
  const used = typesUsed(member);
  for (const [t, v] of Object.entries(e.boost || {})) score += v * (used.has(t) ? 120 : 10);
  for (const v of Object.values(e.resist || {})) score += v * 30;
  score += (e.immune || []).length * 12;
  for (const v of Object.values(e.ailmentResist || {})) score += v * 16;
  score += (e.startBp || 0) * 18;
  return score;
}

export function optimize(member, inventory = gameState.inventory) {
  const out = {};
  for (const slot of SLOTS) {
    const current = member.equip?.[slot] || null;
    let best = current;
    let bestScore = current ? gearScore(member, current) : -Infinity;
    for (const [id, n] of Object.entries(inventory)) {
      if (!(n > 0) || id === current) continue;
      const it = gearDef(id);
      if (!it || it.equip.slot !== slot || !canEquip(member, id)) continue;
      const sc = gearScore(member, id);
      if (sc > bestScore || (sc === bestScore && best && id < best)) {
        best = id;
        bestScore = sc;
      }
    }
    out[slot] = best;
  }
  return out;
}

// Effect signature of a gear piece: its non-stat effects as sorted keys ('boost:rifle', 'startBp').
// The personality lint (tests/progression.test.mjs) and the Equip UI tags use it.
export function gearEffects(itemId) {
  const e = gearDef(itemId)?.equip;
  if (!e) return [];
  const out = [];
  for (const key of ['boost', 'resist', 'ailmentResist']) for (const t of Object.keys(e[key] || {})) out.push(`${key}:${t}`);
  for (const s of e.immune || []) out.push(`immune:${s}`);
  if (e.startBp) out.push('startBp');
  if (e.encounterRate != null && e.encounterRate !== 1) out.push('encounterRate');
  return out.sort();
}

// Sanity helper for content lints: every damage type a gear effect names must exist.
export function gearTypesValid(itemId) {
  const e = gearDef(itemId)?.equip;
  if (!e) return false;
  return [...Object.keys(e.boost || {}), ...Object.keys(e.resist || {})].every((t) => DAMAGE_TYPES.includes(t));
}
