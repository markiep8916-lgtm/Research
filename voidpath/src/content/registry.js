// Content registry (TECH_PLAN 2.6). PURE: imports battle data, the boss-script table, balance,
// the MapDef helpers and the chapter table, never three.js, the DOM or src/art/*. Browser parts
// (textures, characters, enemy art, particles, props, arenas, action fx) reach their registries
// through registrars that content/index.js installs with setRegistrars(), so this file stays
// importable in node (tests, scriptcheck, the balance simulator).
//
// export const REG                       merged story/economy tables (TECH_PLAN 2.6), plus:
//   REG.scenes[i], REG.destinations[i]   carry `loc` (the registering location); destinations sorted by order
//   REG.extends[mapId]                   [{ loc, chapter, ext }] in registration order (getMap merges them)
//   REG.preload[mapId]                   [{ key, loc }] ('npc:theo'), so prewarm can gate them by chapter
//   REG.doneFlags[chapter]               the union of every location's list
// export function registerData(pure)     data + story + maps of one LocationDef; true when new
// export function registerLocation(loc)  registerData(loc) + its browser parts; true when new
// export function finishRegistration()   applyBalance() when anything new was registered (aggregators)
// export function getMap(id) -> MapDef   normalized, every `extends[id]` merged; cached; null if unknown
// export function locationOfMap(mapId) -> locId | null
// export function locationOfArt(kind, key) -> locId | 'core'   kind: tex, npc/field/portrait (characters),
//                                        enemy/icon, preset, prop, arena, fx; key may carry ':expr' or ':scale'
// export function ownerOf(table, id) -> locId | 'core' | null  who registered an id (lints, prewarm)
// export function setRegistrars({ texture, character, enemyArt, preset, prop, arena, actionFx })
// export function createRegistry(opts) -> isolated registry with the same API (lint fixtures)
// export const registry              the default instance as one object (lints and scriptcheck take it)
//
// Rules: registering the same location object again is a no-op; so is registering a location's
// index.js object after its pure.js object (they share data, story and maps). Another object with
// a taken id throws Error('content: duplicate <table> id "<id>" (<locA> vs <locB>)'), checked for
// every table before anything is merged, so a failed registration leaves the registry unchanged.
//
// getMap merge order (TECH_PLAN 2.6): arrays of every `extends[mapId]` append in chapter order (ties
// by location id); plain objects (anchors, viewpoints) merge shallowly; `talk: { id: [entry] }` is
// prepended to the TalkSpec of the NPC or interactable with that id, latest chapter first (ties by
// location id). The merged talk of every id also lands in `map.talk` (companions such as BOLT have
// no NpcDef on the map; ExploreState reads `map.talk.bolt`).

import { ENEMIES, ENCOUNTERS, ITEMS, ENCOUNTER_TABLES } from '../battle/data.js';
import { BOSS_SCRIPTS, registerBossScript } from '../battle/scripts.js';
import { applyBalance } from './balance.js';
import { normalizeMap, normalizeTalk } from '../world/mapdef.js';
import { chapterIndex } from './chapters.js';

// story tables keyed by id: StoryDef key -> REG key
const STORY_TABLES = ['scripts', 'objectives', 'speakers', 'jumps', 'recaps', 'partyTalks', 'tips', 'companions'];
// art kinds accepted by locationOfArt -> claim table
const ART_TABLE = {
  tex: 'textures', texture: 'textures', npc: 'characters', char: 'characters', character: 'characters',
  field: 'characters', battle: 'characters', portrait: 'characters', portraitURL: 'characters',
  enemy: 'enemyArt', enemyIcon: 'enemyArt', icon: 'enemyArt', preset: 'particles', particles: 'particles',
  prop: 'props', arena: 'arenas', fx: 'actionFx',
};
const REGISTRAR_KINDS = ['texture', 'character', 'enemyArt', 'preset', 'prop', 'arena', 'actionFx'];

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const entriesOf = (o) => (isObj(o) ? Object.entries(o) : []);

// TalkSpec -> entry list ([] when empty).
const talkEntries = (spec) => normalizeTalk(spec) || [];

function chapterRank(loc) {
  const i = chapterIndex(loc?.chapter);
  return i < 0 ? 1e3 : i;
}

/**
 * An isolated registry. The default instance (exported functions below) merges into the live
 * battle tables; lint fixtures pass fresh copies.
 */
export function createRegistry({
  tables = { enemies: ENEMIES, encounters: ENCOUNTERS, items: ITEMS, zones: ENCOUNTER_TABLES, bossScripts: BOSS_SCRIPTS },
  onBossScript = registerBossScript, // null: write tables.bossScripts directly (fixtures)
  balance = applyBalance,
} = {}) {
  const REG = {
    locations: {}, maps: {}, scripts: {}, scenes: [], objectives: {}, speakers: {}, destinations: [],
    jumps: {}, doneFlags: {}, preload: {}, recaps: {}, partyTalks: {}, tips: {}, companions: {},
    extends: {}, credits: [], newJourney: null, zoneRates: {}, shops: {}, kits: {}, props: {},
    arenas: {}, actionFx: {},
  };

  const owners = new Map(); // table -> Map(id -> locId)
  const own = (table) => {
    if (!owners.has(table)) owners.set(table, new Map());
    return owners.get(table);
  };
  // POC entries already in the battle tables belong to 'core'.
  for (const [table, obj] of Object.entries(tables)) for (const id of Object.keys(obj)) own(table).set(id, 'core');

  const registrars = {};
  const missingRegistrar = new Set();
  const artDone = new Set();
  const mapCache = new Map();
  let pendingBalance = false;

  function ownerOf(table, id) {
    return owners.get(table)?.get(id) ?? null;
  }

  function sameLocation(a, b) {
    return a === b || (a.data === b.data && a.story === b.story && a.maps === b.maps);
  }

  // Throws on the first id another location already owns. claims: [[table, id], ...]
  function checkClaims(locId, claims) {
    const seen = new Map();
    for (const [table, id] of claims) {
      const prev = ownerOf(table, id);
      if (prev && prev !== locId) throw new Error(`content: duplicate ${table} id "${id}" (${prev} vs ${locId})`);
      const key = `${table}\u0000${id}`;
      if (seen.has(key)) throw new Error(`content: duplicate ${table} id "${id}" (${locId} vs ${locId})`);
      seen.set(key, true);
    }
  }

  function applyClaims(locId, claims) {
    for (const [table, id] of claims) own(table).set(id, locId);
  }

  function dataClaims(loc) {
    const d = loc.data || {};
    const s = loc.story || {};
    const c = [];
    for (const [key, table] of [['enemies', 'enemies'], ['encounters', 'encounters'], ['items', 'items'],
      ['zones', 'zones'], ['zoneRates', 'zoneRates'], ['shops', 'shops'], ['bossScripts', 'bossScripts'], ['kits', 'kits']]) {
      for (const [id] of entriesOf(d[key])) c.push([table, id]);
    }
    for (const t of STORY_TABLES) for (const [id] of entriesOf(s[t])) c.push([t, id]);
    for (const sc of Array.isArray(s.scenes) ? s.scenes : []) if (sc?.id) c.push(['scenes', sc.id]);
    for (const de of Array.isArray(s.destinations) ? s.destinations : []) if (de?.id) c.push(['destinations', de.id]);
    if (Array.isArray(s.credits) && s.credits.length) c.push(['credits', 'credits']);
    if (s.newJourney) c.push(['newJourney', 'newJourney']);
    for (const [id] of entriesOf(loc.maps)) c.push(['maps', id]);
    return c;
  }

  function registerData(loc) {
    if (!isObj(loc) || typeof loc.id !== 'string' || !loc.id) throw new Error('content: a LocationDef needs a string id');
    const prev = REG.locations[loc.id];
    if (prev) {
      if (sameLocation(prev, loc)) return false;
      throw new Error(`content: duplicate locations id "${loc.id}" (${loc.id} vs ${loc.id})`);
    }
    const claims = dataClaims(loc);
    checkClaims(loc.id, claims);
    applyClaims(loc.id, claims);
    REG.locations[loc.id] = loc;

    const d = loc.data || {};
    Object.assign(tables.enemies, d.enemies || {});
    Object.assign(tables.encounters, d.encounters || {});
    Object.assign(tables.items, d.items || {});
    Object.assign(tables.zones, d.zones || {});
    Object.assign(REG.zoneRates, d.zoneRates || {});
    Object.assign(REG.shops, d.shops || {});
    Object.assign(REG.kits, d.kits || {});
    for (const [id, script] of entriesOf(d.bossScripts)) {
      if (onBossScript) onBossScript(id, script);
      else tables.bossScripts[id] = script;
    }

    const s = loc.story || {};
    for (const t of STORY_TABLES) Object.assign(REG[t], s[t] || {});
    for (const sc of Array.isArray(s.scenes) ? s.scenes : []) REG.scenes.push({ ...sc, loc: loc.id });
    for (const de of Array.isArray(s.destinations) ? s.destinations : []) REG.destinations.push({ ...de, loc: loc.id });
    REG.destinations.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id)));
    for (const [mapId, ext] of entriesOf(s.extends)) (REG.extends[mapId] ||= []).push({ loc: loc.id, chapter: loc.chapter, ext });
    for (const [ch, flags] of entriesOf(s.doneFlags)) {
      const list = (REG.doneFlags[ch] ||= []);
      for (const f of flags || []) if (!list.includes(f)) list.push(f);
    }
    for (const [mapId, keys] of entriesOf(s.preload)) (REG.preload[mapId] ||= []).push(...(keys || []).map((key) => ({ key, loc: loc.id })));
    if (Array.isArray(s.credits) && s.credits.length) REG.credits = s.credits;
    if (s.newJourney) REG.newJourney = s.newJourney;
    for (const [mapId, def] of entriesOf(loc.maps)) {
      if (def?.id && def.id !== mapId) console.error(`content: map key "${mapId}" holds MapDef id "${def.id}" (${loc.id})`);
      REG.maps[mapId] = def;
    }
    mapCache.clear();
    pendingBalance = true;
    return true;
  }

  function artClaims(loc) {
    const art = loc.art || {};
    const c = [];
    for (const [name] of entriesOf(art.textures)) c.push(['textures', name]);
    for (const [id] of entriesOf(art.characters)) c.push(['characters', id]);
    for (const [key] of entriesOf(art.enemyArt)) c.push(['enemyArt', key]);
    for (const [key] of entriesOf(loc.enemyArt)) c.push(['enemyArt', key]);
    for (const [name] of entriesOf(art.particles)) c.push(['particles', name]);
    for (const [type] of entriesOf(loc.props)) c.push(['props', type]);
    for (const [name] of entriesOf(loc.arenas)) c.push(['arenas', name]);
    for (const [id] of entriesOf(loc.actionFx)) c.push(['actionFx', id]);
    return c;
  }

  function call(kind, locId, ...args) {
    const fn = registrars[kind];
    if (fn) return fn(...args);
    if (!missingRegistrar.has(kind)) {
      missingRegistrar.add(kind);
      console.error(`content: no ${kind} registrar installed (location ${locId}); call setRegistrars() first`);
    }
    return undefined;
  }

  function registerLocation(loc) {
    const fresh = registerData(loc);
    if (artDone.has(loc.id)) return fresh;
    const claims = artClaims(loc);
    checkClaims(loc.id, claims);
    applyClaims(loc.id, claims);
    artDone.add(loc.id);
    const art = loc.art || {};
    for (const [name, def] of entriesOf(art.textures)) call('texture', loc.id, name, def);
    for (const [id, def] of entriesOf(art.characters)) call('character', loc.id, id, def);
    for (const [key, def] of [...entriesOf(art.enemyArt), ...entriesOf(loc.enemyArt)]) call('enemyArt', loc.id, key, def);
    for (const [name, layers] of entriesOf(art.particles)) call('preset', loc.id, name, ...(Array.isArray(layers) ? layers : [layers]));
    for (const [type, def] of entriesOf(loc.props)) { REG.props[type] = def; call('prop', loc.id, type, def); }
    for (const [name, def] of entriesOf(loc.arenas)) { REG.arenas[name] = def; call('arena', loc.id, name, def); }
    for (const [id, fn] of entriesOf(loc.actionFx)) { REG.actionFx[id] = fn; call('actionFx', loc.id, id, fn); }
    return true;
  }

  function finishRegistration() {
    if (!pendingBalance) return false;
    pendingBalance = false;
    balance?.();
    return true;
  }

  function mergeExtends(base, list) {
    const out = { ...base };
    const byChapter = [...list].sort((a, b) => chapterRank(a) - chapterRank(b) || a.loc.localeCompare(b.loc));
    for (const { ext } of byChapter) {
      for (const [key, val] of entriesOf(ext)) {
        if (key === 'talk') continue;
        if (Array.isArray(val)) out[key] = [...(Array.isArray(out[key]) ? out[key] : []), ...val];
        else if (isObj(val)) out[key] = { ...(isObj(out[key]) ? out[key] : {}), ...val };
      }
    }
    // talk: latest chapter first, ties by location id
    const latestFirst = [...list].sort((a, b) => chapterRank(b) - chapterRank(a) || a.loc.localeCompare(b.loc));
    const talk = {};
    for (const { ext } of latestFirst) {
      for (const [id, spec] of entriesOf(ext.talk)) (talk[id] ||= []).push(...talkEntries(spec));
    }
    if (Object.keys(talk).length) {
      const withTalk = (e) => (e && talk[e.id] ? { ...e, talk: [...talk[e.id], ...talkEntries(e.talk)] } : e);
      if (Array.isArray(out.npcs)) out.npcs = out.npcs.map(withTalk);
      if (Array.isArray(out.interactables)) out.interactables = out.interactables.map(withTalk);
      const merged = { ...(isObj(base.talk) ? base.talk : {}) };
      for (const [id, entries] of Object.entries(talk)) merged[id] = [...entries, ...talkEntries(merged[id])];
      out.talk = merged;
    }
    return out;
  }

  function getMap(id) {
    if (mapCache.has(id)) return mapCache.get(id);
    const base = REG.maps[id];
    if (!base) return null;
    const map = normalizeMap(mergeExtends(base, REG.extends[id] || []));
    mapCache.set(id, map);
    return map;
  }

  function locationOfMap(mapId) {
    return ownerOf('maps', mapId);
  }

  function locationOfArt(kind, key) {
    const table = ART_TABLE[kind];
    if (!table || key == null) return 'core';
    const id = String(key).split(':')[0];
    return ownerOf(table, id) || 'core';
  }

  function setRegistrars(map) {
    for (const [k, fn] of Object.entries(map || {})) {
      if (!REGISTRAR_KINDS.includes(k)) console.warn(`content: unknown registrar "${k}"`);
      else if (typeof fn === 'function') registrars[k] = fn;
    }
  }

  return {
    REG, registerData, registerLocation, finishRegistration, getMap, locationOfMap, locationOfArt,
    ownerOf, setRegistrars, tables,
  };
}

const main = createRegistry();

export const registry = main;

export const REG = main.REG;
export const registerData = main.registerData;
export const registerLocation = main.registerLocation;
export const finishRegistration = main.finishRegistration;
export const getMap = main.getMap;
export const locationOfMap = main.locationOfMap;
export const locationOfArt = main.locationOfArt;
export const ownerOf = main.ownerOf;
export const setRegistrars = main.setRegistrars;
