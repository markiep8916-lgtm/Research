// Location prewarm (TECH_PLAN 11.5): paints a location's art behind covers so map loads and
// encounters never stall on procedural painting. Painted canvases live in the art cache
// (art/cache.js), which evicts them later; prewarm only calls the cached builders.
//
// export function collectArt(locId, { chapter }) -> [{ kind, key }]   kind: 'tex' | 'npc' | 'enemy' | 'portrait'
//     follows the location's MapDefs (legend and wall textures, backdrop, sky, underlay, props and the
//     registered prop types' textures/sprites, NPCs, field bosses, zones), the `extends` other
//     locations add to those maps, companions, every encounter's enemies through `art`,
//     `phases[].transform`, `onDefeat.transform` and `actions[].summon.kind`, arena textures,
//     portrait expressions and spawned sprites its scripts use, and `story.preload`. Additions from
//     other locations (extends, preload) count only once their chapter is current or past
//     (`chapter` defaults to gameState.story.chapter), so boot paints no epilogue art.
// export function prewarmLocation(locId, { idle = false, chapter } = {}) -> Promise<{ jobs, painted, ms }>
//     behind a cover: paints in time slices (one heavy job per macrotask). idle: only light jobs
//     (< 30 ms: textures that are not backdrops, portraits) in idle callbacks, for the next destination.
//     Concurrent calls for the same location share one run.
// export function paintJob(job)             paints one { kind, key } (also used for preload keys)
// export function parseArtKey('npc:theo') -> { kind, key }

import { REG, getMap, ownerOf } from './registry.js';
import { chapterIndex } from './chapters.js';
import { ENEMIES, ENCOUNTERS, ENCOUNTER_TABLES } from '../battle/data.js';
import { gameState } from '../core/state.js';
import * as tiles from '../art/tiles.js';
import * as characters from '../art/characters.js';
import * as enemies from '../art/enemies.js';

const NPC_SHEETS = new Set(['bolt', 'holo']);
const PARTY_SPEAKERS = { KADE: 'kade', NYX: 'nyx', ORION: 'orion', SERA: 'sera', BOLT: 'bolt', HALCYON: 'holo' };
const KIND_ORDER = { tex: 0, npc: 1, enemy: 2, portrait: 3 };
const SLICE_MS = 12;      // time slice before yielding to the event loop
const LIGHT_MS = 30;      // idle prewarm runs only jobs expected under this

export function parseArtKey(s) {
  const i = String(s).indexOf(':');
  if (i < 0) return { kind: 'tex', key: String(s) };
  return { kind: s.slice(0, i), key: s.slice(i + 1) };
}

function makeCollector() {
  const seen = new Set();
  const jobs = [];
  const add = (kind, key) => {
    if (!key || typeof key !== 'string') return;
    if (kind === 'char') kind = 'npc';
    const id = `${kind}:${key}`;
    if (seen.has(id)) return;
    seen.add(id);
    jobs.push({ kind, key });
  };
  return { add, jobs };
}

function addTex(add, v) {
  if (!v) return;
  if (typeof v === 'string') add('tex', v);
  else if (Array.isArray(v)) for (const x of v) addTex(add, x);
  else if (typeof v === 'object') for (const x of Object.values(v)) if (typeof x === 'string') add('tex', x);
}

function addSheet(add, sheet) {
  if (typeof sheet !== 'string') return;
  const { kind, key } = parseArtKey(sheet);
  add(kind === 'enemy' ? 'enemy' : 'npc', key);
}

function addRegisteredProp(add, type) {
  const def = REG.props[type];
  if (!def) return;
  for (const t of def.textures || []) add('tex', t);
  for (const s of def.sprites || []) addSheet(add, s.includes(':') ? s : `npc:${s}`);
}

function addEnemy(add, kind, depth = 0) {
  const e = ENEMIES[kind];
  if (!e || depth > 4) {
    if (!e) add('enemy', kind);
    return;
  }
  add('enemy', e.art || kind);
  for (const ph of e.phases || []) if (ph?.transform) addEnemy(add, ph.transform, depth + 1);
  if (e.onDefeat?.transform) addEnemy(add, e.onDefeat.transform, depth + 1);
  for (const a of e.actions || []) if (a?.summon?.kind) addEnemy(add, a.summon.kind, depth + 1);
}

function addEncounter(add, id) {
  const enc = ENCOUNTERS[id];
  if (!enc) return;
  for (const kind of enc.enemies || []) addEnemy(add, kind);
  for (const t of REG.arenas[enc.backdrop]?.textures || []) add('tex', t);
}

function addZone(add, zone) {
  if (typeof zone === 'string') for (const id of ENCOUNTER_TABLES[zone] || []) addEncounter(add, id);
  else if (Array.isArray(zone)) for (const z of zone) addZone(add, z?.zone);
}

// Everything one MapDef (or one `extends` part of it) shows.
function addMapPart(add, m) {
  if (!m) return;
  const used = new Set((m.grid || []).join(''));
  for (const [ch, cell] of Object.entries(m.legend || {})) {
    if (!used.has(ch) || !cell) continue;
    addTex(add, [cell.tex, cell.side, cell.cap, cell.low, cell.bank, cell.path, cell.edge, cell.backdrop]);
    for (const mx of cell.mix || []) addTex(add, mx?.[0]);
  }
  addTex(add, m.wallTex);
  for (const k of ['backdrop', 'sky', 'underlay']) if (m[k]) addTex(add, [m[k].texture, m[k].stars]);
  for (const p of m.props || []) {
    if (!p) continue;
    addTex(add, p.tex);
    addSheet(add, p.sheet);
    addRegisteredProp(add, p.t);
  }
  for (const list of [m.chests, m.interactables, m.gates]) {
    for (const e of list || []) if (e?.prop) addRegisteredProp(add, e.prop);
  }
  for (const n of m.npcs || []) if (n?.sprite) add('npc', n.sprite);
  for (const b of m.bosses || []) {
    if (b?.art) add('enemy', b.art);
    if (b?.encounter) addEncounter(add, b.encounter);
  }
  for (const a of m.areas || []) addZone(add, a?.zone);
}

// Speakers, expressions and spawned sprites named in a script's source.
function addScript(add, fn) {
  if (typeof fn !== 'function') return;
  const src = fn.toString();
  const exprs = new Set();
  for (const mm of src.matchAll(/expr\s*:\s*['"`]([a-z_]+)['"`]/g)) exprs.add(mm[1]);
  const portraits = new Set();
  for (const mm of src.matchAll(/['"`]([A-Z][A-Z0-9_-]{1,23})['"`]/g)) {
    const p = REG.speakers[mm[1]]?.portrait || PARTY_SPEAKERS[mm[1]];
    if (p) portraits.add(p.split(':')[0]);
  }
  for (const mm of src.matchAll(/portrait\s*:\s*['"`]([a-z0-9_]+)(?::([a-z_]+))?['"`]/g)) {
    portraits.add(mm[1]);
    if (mm[2]) add('portrait', `${mm[1]}:${mm[2]}`);
  }
  for (const p of portraits) {
    add('portrait', p);
    for (const e of exprs) add('portrait', `${p}:${e}`);
  }
  for (const mm of src.matchAll(/sprite\s*:\s*['"`]([a-z0-9_]+)['"`]/g)) add('npc', mm[1]);
}

function visibleTo(chapter) {
  const now = chapterIndex(chapter);
  return (locId) => {
    const c = chapterIndex(REG.locations[locId]?.chapter);
    return c < 0 || now < 0 || c <= now;
  };
}

export function collectArt(locId, { chapter = gameState.story?.chapter || 'prologue' } = {}) {
  const loc = REG.locations[locId];
  const { add, jobs } = makeCollector();
  if (!loc) return jobs;
  const shown = visibleTo(chapter);
  for (const mapId of Object.keys(loc.maps || {})) {
    const base = REG.maps[mapId];
    // the base map with its normalized legend (DEFAULT_LEGEND merged), extends parts gated below
    if (base) addMapPart(add, { ...base, legend: getMap(mapId)?.legend || base.legend });
    for (const part of REG.extends[mapId] || []) if (part.loc === locId || shown(part.loc)) addMapPart(add, part.ext);
    for (const { key, loc: from } of REG.preload[mapId] || []) {
      if (from === locId || shown(from)) {
        const j = parseArtKey(key);
        add(j.kind, j.key);
      }
    }
  }
  for (const c of Object.values(REG.companions)) if (c?.sprite) add('npc', c.sprite);
  for (const id of Object.keys(loc.data?.encounters || {})) addEncounter(add, id);
  for (const [id, fn] of Object.entries(REG.scripts)) if (ownerOf('scripts', id) === locId) addScript(add, fn);
  return jobs.sort((a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9));
}

export function paintJob({ kind, key }) {
  switch (kind) {
    case 'tex': return tiles.buildTexture(key);
    case 'npc': return NPC_SHEETS.has(key) ? characters.buildNpcSprite(key) : characters.buildFieldSprite(key);
    case 'portrait': return characters.buildPortrait(key);
    case 'enemy':
      enemies.buildEnemyIcon(key);
      return enemies.buildEnemySprite(key);
    default:
      console.warn(`prewarm: unknown art kind "${kind}" (${key})`);
      return null;
  }
}

function isLight({ kind, key }) {
  if (kind === 'portrait') return true;
  return kind === 'tex' && !key.startsWith('bd_') && key !== 'space_backdrop' && key !== 'stars_layer';
}

let channel = null;
const waiters = [];
function nextTask() {
  if (typeof MessageChannel === 'undefined') return new Promise((r) => setTimeout(r, 0));
  if (!channel) {
    channel = new MessageChannel();
    channel.port1.onmessage = () => waiters.shift()?.();
  }
  return new Promise((r) => { waiters.push(r); channel.port2.postMessage(0); });
}
function idleTask() {
  if (typeof requestIdleCallback === 'function') return new Promise((r) => requestIdleCallback(() => r(), { timeout: 500 }));
  return new Promise((r) => setTimeout(r, 40));
}

const running = new Map();

export function prewarmLocation(locId, { idle = false, chapter } = {}) {
  const runKey = `${locId}|${idle ? 'idle' : 'cover'}`;
  if (running.has(runKey)) return running.get(runKey);
  const run = (async () => {
    const t0 = performance.now();
    const jobs = collectArt(locId, chapter ? { chapter } : undefined).filter((j) => !idle || isLight(j));
    let painted = 0;
    let slice = performance.now();
    for (const job of jobs) {
      const t = performance.now();
      try {
        paintJob(job);
        painted++;
      } catch (e) {
        console.warn(`prewarm: ${job.kind}:${job.key} failed: ${e?.message || e}`);
      }
      const now = performance.now();
      if (idle ? now - t > LIGHT_MS || now - slice > LIGHT_MS / 3 : now - slice > SLICE_MS) {
        await (idle ? idleTask() : nextTask());
        slice = performance.now();
      }
    }
    return { jobs: jobs.length, painted, ms: Math.round(performance.now() - t0) };
  })();
  running.set(runKey, run);
  const done = () => running.delete(runKey);
  run.then(done, done);
  return run;
}
