// Byte-budgeted art cache (TECH_PLAN 11.5). Every painted canvas set (textures, character and
// enemy sheets, fx sheets, portraits, glow sheets) is stored here with its size in bytes and the
// location that owns it, so finished chapters can be evicted and the total stays under budget.
//
//   artCache.get(key)                         -> value | undefined (marks it recently used)
//   artCache.set(key, value, { bytes, loc, onEvict })
//        bytes defaults to 4 bytes per pixel of every canvas found in value (depth 2);
//        loc defaults to artCache.locate(kind, name) for keys shaped '<kind>:<name>', else 'core';
//        onEvict(value) runs when the entry is dropped (default: releaseCanvas on its canvases)
//   artCache.acquire(key) / release(key)      in use by a live World / BattleStage: never evicted
//   artCache.evictLocation(locId)             drop every unacquired entry of that location
//   artCache.trim()                           drop least-recently-used entries that are neither
//                                             acquired nor pinned until bytes <= budget
//   artCache.bytes, artCache.budget           (150 MB on touch devices, 400 MB otherwise)
//   artCache.pinned                           Set of always-kept locations ('core', 'common', 'prologue')
//   artCache.current                          the current location (kept by trim)
//   artCache.locate                           (kind, name) -> locId; wire it to registry.locationOfArt
//   artCache.stats()                          { entries, bytes, byLoc: { loc: bytes }, acquired }
//   artCache.onDrop(fn)                       fn(key, value) before an entry's canvases are released
//
//   releaseCanvas(canvas)                     width = height = 0, so WebKit frees the backing store
//   noteMissingArt(kind, key) -> bool         record an art fallback; true the first time (warn once)
//   missingArt() -> [{ kind, key }]           every fallback used so far (debug.missingArt)
//
// The cache never touches the DOM at import time, so node tools can import it.

const MB = 1024 * 1024;

function touchDevice() {
  if (typeof window === 'undefined') return false;
  try {
    return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  } catch {
    return false;
  }
}

function isCanvas(v) {
  if (!v || typeof v !== 'object') return false;
  if (typeof HTMLCanvasElement !== 'undefined' && v instanceof HTMLCanvasElement) return true;
  if (typeof OffscreenCanvas !== 'undefined' && v instanceof OffscreenCanvas) return true;
  return false;
}

/** Every distinct canvas in value (the value itself, its properties, arrays of them; depth 2). */
export function canvasesOf(value, depth = 2, out = new Set()) {
  if (isCanvas(value)) { out.add(value); return out; }
  if (!value || typeof value !== 'object' || depth <= 0) return out;
  for (const v of Array.isArray(value) ? value : Object.values(value)) {
    if (isCanvas(v)) out.add(v);
    else if (v && typeof v === 'object' && depth > 1) canvasesOf(v, depth - 1, out);
  }
  return out;
}

/** Bytes held by the canvases of a value (4 per pixel). */
export function canvasBytes(value) {
  let n = 0;
  for (const c of canvasesOf(value)) n += c.width * c.height * 4;
  return n;
}

/** Free a canvas's backing store (WebKit keeps it alive until the size drops to zero). */
export function releaseCanvas(canvas) {
  if (!canvas) return;
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // detached OffscreenCanvas (transferred): nothing to free
  }
}

const entries = new Map();   // key -> { value, bytes, loc, refs, last, canvases, onEvict }
const dropListeners = new Set();
let total = 0;
let tick = 0;

function drop(key, e) {
  entries.delete(key);
  total -= e.bytes;
  // GPU owners (SpriteActor's per-sheet textures) free their uploads before the canvases go
  for (const fn of dropListeners) fn(key, e.value);
  if (e.onEvict) e.onEvict(e.value);
  else for (const c of e.canvases) releaseCanvas(c);
}

function keyLoc(key) {
  const i = key.indexOf(':');
  if (i < 0) return 'core';
  try {
    return artCache.locate(key.slice(0, i), key.slice(i + 1)) || 'core';
  } catch {
    return 'core';
  }
}

export const artCache = {
  budget: (touchDevice() ? 150 : 400) * MB,
  pinned: new Set(['core', 'common', 'prologue']),
  current: null,
  locate: () => 'core',

  get(key) {
    const e = entries.get(key);
    if (!e) return undefined;
    e.last = ++tick;
    return e.value;
  },

  has(key) {
    return entries.has(key);
  },

  set(key, value, { bytes, loc, onEvict } = {}) {
    const old = entries.get(key);
    if (old) { entries.delete(key); total -= old.bytes; }
    const canvases = [...canvasesOf(value)];
    const e = {
      value,
      bytes: bytes ?? canvases.reduce((n, c) => n + c.width * c.height * 4, 0),
      loc: loc || keyLoc(key),
      refs: old ? old.refs : 0,
      last: ++tick,
      canvases,
      onEvict: onEvict || null,
    };
    entries.set(key, e);
    total += e.bytes;
    return value;
  },

  /** Cached value for key, or make() it, store it and return it. */
  getOrSet(key, make, opts) {
    const hit = this.get(key);
    return hit !== undefined ? hit : this.set(key, make(), opts);
  },

  delete(key) {
    const e = entries.get(key);
    if (e) drop(key, e);
  },

  acquire(key) {
    const e = entries.get(key);
    if (e) { e.refs++; e.last = ++tick; }
    return !!e;
  },

  release(key) {
    const e = entries.get(key);
    if (e && e.refs > 0) e.refs--;
  },

  refs(key) {
    return entries.get(key)?.refs || 0;
  },

  locOf(key) {
    return entries.get(key)?.loc || null;
  },

  evictLocation(locId) {
    let n = 0;
    for (const [key, e] of [...entries]) {
      if (e.loc === locId && e.refs === 0) { drop(key, e); n++; }
    }
    return n;
  },

  trim() {
    if (total <= this.budget) return 0;
    const keep = (e) => e.refs > 0 || this.pinned.has(e.loc) || e.loc === this.current;
    const victims = [...entries].filter(([, e]) => !keep(e)).sort((a, b) => a[1].last - b[1].last);
    let n = 0;
    for (const [key, e] of victims) {
      if (total <= this.budget) break;
      drop(key, e);
      n++;
    }
    return n;
  },

  get bytes() {
    return total;
  },

  get size() {
    return entries.size;
  },

  keys() {
    return [...entries.keys()];
  },

  /** fn(key, value) runs whenever an entry is dropped (delete, evictLocation, trim). Returns an unsubscribe. */
  onDrop(fn) {
    dropListeners.add(fn);
    return () => dropListeners.delete(fn);
  },

  stats() {
    const byLoc = {};
    let acquired = 0;
    for (const e of entries.values()) {
      byLoc[e.loc] = (byLoc[e.loc] || 0) + e.bytes;
      if (e.refs > 0) acquired++;
    }
    return { entries: entries.size, bytes: total, byLoc, acquired };
  },
};

// ---------------------------------------------------------------- missing-art registry

const missing = new Map();

/** Record that a fallback was drawn for (kind, key). Returns true the first time, so the caller warns once. */
export function noteMissingArt(kind, key) {
  const id = `${kind}:${key}`;
  if (missing.has(id)) return false;
  missing.set(id, { kind, key });
  return true;
}

/** Every fallback used so far: [{ kind, key }] (debug.missingArt, TECH_PLAN 3.12). */
export function missingArt() {
  return [...missing.values()].map((m) => ({ ...m }));
}
