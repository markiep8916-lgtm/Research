// Save format, slots and storage (TECH_PLAN 6.1). Node-safe: every storage call is wrapped, and
// without a working localStorage (Artifact iframe, private mode, quota, node) saves live in an
// in-memory map for the session.
//
//   SAVE_VERSION, SLOTS ['auto', 'slot1', 'slot2', 'slot3']
//   serialize(state = gameState, pos /* { map, x, z, facing } */) -> SaveData
//   deserialize(data, { keep } = {}) -> { pos, checkpoint } | null
//        migrates and validates, then writes into gameState in place (the party array, roster
//        member objects, inventory, flags, story and stats objects keep their identity).
//        keep: ['stats', 'played'] leaves those as they are (Retry). Returns null, touching
//        nothing, when the data is not a usable save.
//   writeSlot(slot, data) -> { ok, storage: 'local' | 'memory', error? }
//   readSlot(slot) -> SaveData | null          (null for empty and for damaged slots)
//   listSlots() -> [{ slot, empty, damaged, summary, savedAt }]
//   latestSlot() -> slot | null                newest savedAt among readable slots
//   deleteSlot(slot)
//   migrate(data) -> data | null               version chain v0 -> v1
//   storageMode() -> 'local' | 'memory'        'memory' once localStorage failed (show the notice once)
//   markCleared(); isCleared() -> bool         the `voidpath.cleared` marker (title variant)
//
// Derived values are not stored: stats, max HP/EP, mods and skills are rebuilt on load from level,
// gear and flags (makeMemberAt + refreshMember + learnFromFlags), so balance changes reach old saves.
// Load validation: an unknown, `transit` or `scene` map falls back to the checkpoint, then to the
// map's location dock (its Starchart destination), then to halcyon:start; unknown items are dropped
// with console.warn; unknown flags are kept; HP/EP are clamped; members missing from PARTY_DEFS are
// dropped.

import { PARTY_DEFS, ITEMS } from '../battle/data.js';
import { gameState, makeMember } from './state.js';
import { makeMemberAt, refreshMember, canEquip, emptyEquip, SLOTS as GEAR_SLOTS } from './progression.js';
import { REG, locationOfMap } from '../content/registry.js';
import { CHAPTERS } from '../content/chapters.js';

export const SAVE_VERSION = 1;
export const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
export const SAVE_PREFIX = 'voidpath.save.';
export const CLEARED_KEY = 'voidpath.cleared';
const STAT_KEYS = ['battles', 'breaks', 'maxDamage', 'steps', 'playTime'];
const DEFAULT_POS = { map: 'halcyon', spawn: 'start' };
// POC flag names (TECH_PLAN 2.9) -> full-game names; null drops the flag.
const V0_FLAGS = { bridge_unlocked: 'story:bridge_unlocked', talked_bolt: 'talk:halcyon:bolt', rested: null };

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const copy = (v) => JSON.parse(JSON.stringify(v));

// ------------------------------------------------------------------ storage

const memory = new Map();
let mode = 'local';

function local() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null; // sandboxed iframes throw on access
  }
}

function storeRaw(key, value) {
  memory.set(key, value);
  if (mode !== 'local') return { ok: true, storage: 'memory' };
  const ls = local();
  try {
    if (!ls) throw new Error('localStorage is unavailable');
    ls.setItem(key, value);
    return { ok: true, storage: 'local' };
  } catch (e) {
    mode = 'memory';
    return { ok: true, storage: 'memory', error: String(e?.message || e) };
  }
}

function loadRaw(key) {
  if (mode === 'memory' && memory.has(key)) return memory.get(key);
  let raw = null;
  try {
    raw = local()?.getItem(key) ?? null;
  } catch {
    raw = null;
  }
  return raw ?? memory.get(key) ?? null;
}

function removeRaw(key) {
  memory.delete(key);
  try {
    local()?.removeItem(key);
  } catch {
    // nothing to remove when storage is blocked
  }
}

export function storageMode() {
  return mode;
}

export function markCleared() {
  storeRaw(CLEARED_KEY, '1');
}

export function isCleared() {
  return loadRaw(CLEARED_KEY) === '1';
}

// ------------------------------------------------------------------ format

function titleCase(s) {
  return String(s || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function chapterLabel(chapterId) {
  const c = CHAPTERS.find((ch) => ch.id === chapterId);
  return c ? `${titleCase(c.kicker)} · ${titleCase(c.title)}` : titleCase(chapterId);
}

function mapName(mapId) {
  const loc = mapId ? locationOfMap(mapId) : null;
  return REG.maps[mapId]?.name || (loc && REG.locations[loc]?.name) || mapId || '';
}

function summarize(d) {
  const chapter = d.story?.chapter || 'prologue';
  return {
    chapter,
    chapterLabel: chapterLabel(chapter),
    location: mapName(d.pos?.map || d.checkpoint?.map),
    playTime: Math.floor(num(d.stats?.playTime)),
    leader: d.leader,
    party: (d.party || []).filter((id) => d.roster?.[id]).map((id) => ({ id, level: d.roster[id].level })),
    cleared: !!d.flags?.['story:game_clear'],
  };
}

export function serialize(state = gameState, pos = null) {
  const members = new Map(Object.values(state.roster || {}).map((m) => [m.id, m]));
  for (const m of state.party) members.set(m.id, m);
  const roster = {};
  for (const m of members.values()) {
    roster[m.id] = {
      level: m.level, xp: m.xp, hp: m.hp, ep: m.ep, alive: !!m.alive,
      equip: { ...emptyEquip(), ...(m.equip || {}) },
      ...(m.campaign ? {} : { legacy: true }), // POC member: PARTY_DEFS skills, no learnset
    };
  }
  const cp = state.checkpoint;
  const data = {
    v: SAVE_VERSION,
    game: 'voidpath',
    savedAt: new Date().toISOString(),
    summary: null,
    pos: pos ? { map: pos.map, x: pos.x, z: pos.z, facing: pos.facing } : null,
    checkpoint: cp ? { map: cp.map ?? pos?.map ?? null, x: cp.x, z: cp.z, facing: cp.facing } : null,
    party: state.party.map((m) => m.id),
    leader: state.leader ?? state.party[0]?.id ?? null,
    roster,
    inventory: { ...state.inventory },
    credits: state.credits,
    flags: { ...state.flags },
    story: copy(state.story || { chapter: 'prologue', objective: null, done: [] }),
    played: [...(state.played || [])],
    stats: { ...state.stats },
    bestiary: copy(state.bestiary || {}),
  };
  data.summary = summarize(data);
  return data;
}

// ------------------------------------------------------------------ migration

// v0: the POC gameState shape (no `v`): party is an array of full PartyMember objects, flags use the
// POC names, positions carry no map (everything was on the Halcyon).
function fromV0(d) {
  const members = (Array.isArray(d.party) ? d.party : []).filter((m) => isObj(m) && m.id);
  const roster = {};
  for (const m of members) {
    roster[m.id] = { level: m.level, xp: m.xp ?? 0, hp: m.hp, ep: m.ep, alive: m.alive !== false, equip: emptyEquip(), legacy: true };
  }
  const flags = {};
  for (const [k, v] of Object.entries(isObj(d.flags) ? d.flags : {})) {
    if (k.startsWith('crate_')) flags[`chest:halcyon:${k.slice(6)}`] = v;
    else if (k in V0_FLAGS) {
      if (V0_FLAGS[k]) flags[V0_FLAGS[k]] = v;
    } else flags[k] = v;
  }
  if (flags.boss_defeated) flags['defeated:pro_boss_sentinel'] = true;
  const onHalcyon = (p) => (isObj(p) ? { map: p.map || 'halcyon', x: p.x, z: p.z, facing: p.facing } : null);
  const out = {
    v: 1,
    game: 'voidpath',
    savedAt: typeof d.savedAt === 'string' ? d.savedAt : new Date(0).toISOString(),
    pos: onHalcyon(d.pos) || onHalcyon(d.checkpoint),
    checkpoint: onHalcyon(d.checkpoint),
    party: members.map((m) => m.id),
    leader: members[0]?.id ?? null,
    roster,
    inventory: isObj(d.inventory) ? d.inventory : {},
    credits: num(d.credits),
    flags,
    story: isObj(d.story) ? d.story : { chapter: 'prologue', objective: null, done: [] },
    played: [],
    stats: isObj(d.stats) ? d.stats : {},
    bestiary: isObj(d.bestiary) ? d.bestiary : {},
  };
  out.summary = summarize(out);
  return out;
}

export function migrate(data) {
  if (!isObj(data)) return null;
  const v = data.v == null ? 0 : data.v;
  if (!Number.isInteger(v) || v < 0) return null;
  if (v > SAVE_VERSION) console.warn(`save: version ${v} is newer than this build (${SAVE_VERSION}); loading what it can`);
  if (v !== 0 && data.game !== 'voidpath') return null;
  let d = copy(data);
  if (v === 0) d = fromV0(d);
  return d;
}

// ------------------------------------------------------------------ load

function playableMap(id) {
  const m = id ? REG.maps[id] : null;
  return !!m && !m.transit && !m.scene;
}

function validPos(p) {
  return isObj(p) && playableMap(p.map) && Number.isFinite(p.x) && Number.isFinite(p.z);
}

function spawnPos(map, spawn) {
  const s = REG.maps[map]?.spawns?.[spawn];
  return s && Number.isFinite(s.x) ? { map, x: s.x, z: s.z, facing: s.facing || 'down' } : { map, spawn };
}

function dockOf(mapId) {
  const loc = mapId ? locationOfMap(mapId) : null;
  const dest = loc ? REG.destinations.find((de) => de.loc === loc && playableMap(de.map)) : null;
  return dest ? spawnPos(dest.map, dest.spawn) : null;
}

function cleanPos(p) {
  return { map: p.map, x: p.x, z: p.z, facing: typeof p.facing === 'string' ? p.facing : 'down' };
}

function buildMember(id, e, flags, inventory) {
  const level = clamp(Math.round(num(e.level, PARTY_DEFS[id].level)), 1, 40);
  let m;
  if (e.legacy) {
    m = makeMember(PARTY_DEFS[id]);
    m.level = level;
  } else {
    m = makeMemberAt(id, level, { flags });
  }
  const equip = emptyEquip();
  for (const slot of GEAR_SLOTS) {
    const itemId = e.equip?.[slot];
    if (!itemId) continue;
    const it = ITEMS[itemId];
    if (!it) {
      console.warn(`save: dropped unknown gear "${itemId}" (${id})`);
    } else if (it.equip?.slot !== slot || !canEquip(m, itemId)) {
      console.warn(`save: ${id} can't wear "${itemId}" in ${slot}; moved to the inventory`);
      inventory[itemId] = (inventory[itemId] || 0) + 1;
    } else {
      equip[slot] = itemId;
    }
  }
  m.equip = equip;
  refreshMember(m); // full HP/EP at the effective maxima
  m.xp = clamp(Math.floor(num(e.xp)), 0, Math.max(0, m.xpNext - 1));
  m.alive = e.alive !== false && num(e.hp, m.maxHp) > 0;
  m.hp = m.alive ? clamp(Math.round(num(e.hp, m.maxHp)), 1, m.maxHp) : 0;
  m.ep = clamp(Math.round(num(e.ep, m.maxEp)), 0, m.maxEp);
  return m;
}

function replaceObject(target, src) {
  for (const k of Object.keys(target)) delete target[k];
  Object.assign(target, src);
}

export function deserialize(data, { keep = [] } = {}) {
  const d = migrate(data);
  if (!d || !isObj(d.roster)) return null;

  // Build everything first; gameState is only written once the save is known to be usable.
  const flags = isObj(d.flags) ? { ...d.flags } : {};
  const inventory = {};
  for (const [id, n] of Object.entries(isObj(d.inventory) ? d.inventory : {})) {
    if (!ITEMS[id]) {
      console.warn(`save: dropped unknown item "${id}"`);
      continue;
    }
    const count = Math.floor(num(n));
    if (count > 0) inventory[id] = count;
  }
  const built = {};
  for (const [id, e] of Object.entries(d.roster)) {
    if (!PARTY_DEFS[id] || !isObj(e)) {
      console.warn(`save: dropped unknown party member "${id}"`);
      continue;
    }
    built[id] = buildMember(id, e, flags, inventory);
  }
  const partyIds = [...new Set(Array.isArray(d.party) ? d.party : [])].filter((id) => built[id]).slice(0, 4);
  if (!partyIds.length) {
    const first = Object.keys(built)[0];
    if (!first) return null;
    partyIds.push(first);
  }

  // Write into gameState in place; existing roster member objects are reused.
  const roster = gameState.roster;
  const members = {};
  for (const [id, m] of Object.entries(built)) {
    const target = roster[id] || {};
    replaceObject(target, m);
    members[id] = target;
  }
  replaceObject(roster, members);
  gameState.party.length = 0;
  for (const id of partyIds) gameState.party.push(members[id]);
  gameState.leader = partyIds.includes(d.leader) ? d.leader : partyIds[0];
  replaceObject(gameState.inventory, inventory);
  gameState.credits = Math.max(0, Math.floor(num(d.credits)));
  replaceObject(gameState.flags, flags);
  const story = isObj(d.story) ? d.story : {};
  gameState.story.chapter = typeof story.chapter === 'string' ? story.chapter : 'prologue';
  gameState.story.objective = story.objective ?? null;
  gameState.story.done = Array.isArray(story.done) ? [...story.done] : [];
  if (!keep.includes('played')) {
    gameState.played.length = 0;
    if (Array.isArray(d.played)) gameState.played.push(...d.played.filter((s) => typeof s === 'string'));
  }
  if (!keep.includes('stats')) {
    const stats = isObj(d.stats) ? d.stats : {};
    for (const k of STAT_KEYS) gameState.stats[k] = num(stats[k]);
  }
  const bestiary = {};
  for (const [kind, list] of Object.entries(isObj(d.bestiary) ? d.bestiary : {})) {
    if (Array.isArray(list)) bestiary[kind] = list.filter((t) => typeof t === 'string');
  }
  replaceObject(gameState.bestiary, bestiary);

  const cp = isObj(d.checkpoint) && Number.isFinite(d.checkpoint.x) && Number.isFinite(d.checkpoint.z)
    && (d.checkpoint.map == null || playableMap(d.checkpoint.map)) ? cleanPos(d.checkpoint) : null;
  if (cp && cp.map == null) delete cp.map;
  gameState.checkpoint = cp;
  const checkpoint = cp ? { ...cp } : null;

  let pos;
  if (validPos(d.pos)) pos = cleanPos(d.pos);
  else if (cp && cp.map) pos = { ...cp };
  else pos = dockOf(d.pos?.map) || spawnPos(DEFAULT_POS.map, DEFAULT_POS.spawn);
  return { pos, checkpoint };
}

// ------------------------------------------------------------------ slots

function parse(raw) {
  if (raw == null) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeSlot(slot, data) {
  if (!SLOTS.includes(slot)) return { ok: false, storage: mode, error: `unknown slot "${slot}"` };
  let json;
  try {
    json = JSON.stringify(data);
  } catch (e) {
    return { ok: false, storage: mode, error: String(e?.message || e) };
  }
  return storeRaw(SAVE_PREFIX + slot, json);
}

export function readSlot(slot) {
  if (!SLOTS.includes(slot)) return null;
  return parse(loadRaw(SAVE_PREFIX + slot));
}

export function listSlots() {
  return SLOTS.map((slot) => {
    const raw = loadRaw(SAVE_PREFIX + slot);
    if (raw == null) return { slot, empty: true, damaged: false, summary: null, savedAt: null };
    const d = parse(raw);
    if (!d || !isObj(d.roster)) return { slot, empty: false, damaged: true, summary: null, savedAt: null };
    return { slot, empty: false, damaged: false, summary: d.summary || summarize(d), savedAt: d.savedAt || null };
  });
}

export function latestSlot() {
  let best = null;
  for (const s of listSlots()) {
    if (s.empty || s.damaged) continue;
    if (!best || String(s.savedAt) > String(best.savedAt)) best = s;
  }
  return best ? best.slot : null;
}

export function deleteSlot(slot) {
  if (SLOTS.includes(slot)) removeRaw(SAVE_PREFIX + slot);
}
