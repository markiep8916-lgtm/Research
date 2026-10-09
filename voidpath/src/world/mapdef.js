// PURE MapDef helpers (TECH_PLAN 3.1-3.2, 3.5): the default cell legend, normalization (defaults,
// TalkSpec entry lists, extends-friendly idempotence) and validation of what the World builder can
// draw. Imports only world/cond.js (itself import-free), so node tests and lints can use it.
//
// export const DEFAULT_LEGEND                   the POC characters (CellSpecs)
// export function normalizeMap(def) -> MapDef   defaults filled, legend merged, TalkSpecs as entry lists;
//                                                idempotent (normalizing a normalized map is a no-op)
// export function validateMap(def) -> string[]  problems ('' when none); also compiles every condition
// export function normalizeTalk(spec) -> [{ when?, script } | { when?, lines }] | null
// export function cellSpec(map, c, r) -> CellSpec   ({ t: 'void' } outside the grid)
// export function isWalkableSpec(spec) -> bool  floors (gate floors too), doors, drainable water
// export function inlineLines(map) -> string[]   ids of entries that still hold inline (legacy) lines
// export function mapSize(map) -> { w, h }
//
// MapDef extras beyond TECH_PLAN 3.1: mood (area mood default), npcs/chests/bosses `talk` (TalkSpec),
// bosses `name` / `radius`, chests `propFields`, med interactables `prompt` / `restoreLabel`, lights and
// ambient entries `when`, area.focus.whileBoss (true or a boss id). TalkSpec entries may hold inline
// `lines` (legacy POC lines, poc maps and dev only).
//
// CellSpec
//   { t: 'wall',   tex, side?, cap?, low?, height?, upper?, rot? }   rot: 'random' turns each cap a random quarter turn
//   { t: 'window', tex, backdrop? }                       horizontal pairs in a wall row: floor south, void north
//   { t: 'door',   tex, lockedTex?, floor?, lock?: { flag, item?, id, label?, toast?, talk? } }   pairs
//   { t: 'floor',  tex, mix?: [[tex, chance]], grime?, stripe?, gate?, roughness?, metalness?, emissive?, rot? }
//                  rot: 'random' turns each cell's texture a random (per-cell hash) quarter turn (G2 W-4)
//   { t: 'water',  tex, bank, depth = 0.35, drain?: cond, path?: tex }
//   { t: 'pit',    edge, thickness = 0.4 }
//   { t: 'void' }

import { compileCond } from './cond.js';

export const MAX_COLS = 72;
export const MAX_ROWS = 56;

const FLOOR_LOOK = { roughness: 0.62, metalness: 0.28, emissive: 2.0 };

export const DEFAULT_LEGEND = Object.freeze({
  ' ': { t: 'void' },
  '#': { t: 'wall', tex: 'wall_panel' },
  v: { t: 'wall', tex: 'wall_panel_vent' },
  s: { t: 'wall', tex: 'wall_panel_screen' },
  p: { t: 'wall', tex: 'wall_pipes' },
  W: { t: 'window', tex: 'window_frame' },
  D: { t: 'door', tex: 'door', lockedTex: 'door_locked', floor: 'floor_plate' },
  L: {
    t: 'door', tex: 'door', lockedTex: 'door_locked', floor: 'floor_plate',
    lock: { flag: 'story:bridge_unlocked', item: 'keycard', id: 'bridge_door', label: 'Inspect' },
  },
  '.': { t: 'floor', tex: 'floor_plate', mix: [['floor_plate_worn', 0.3]], grime: 0.07, ...FLOOR_LOOK },
  ',': { t: 'floor', tex: 'floor_plate_worn', grime: 0.07, ...FLOOR_LOOK },
  h: { t: 'floor', tex: 'floor_hazard', stripe: true, ...FLOOR_LOOK },
  g: { t: 'floor', tex: 'floor_grate', grime: 0.07, ...FLOOR_LOOK, emissive: 2.6 },
  b: { t: 'floor', tex: 'floor_bridge', roughness: 0.55, metalness: 0.25, emissive: 0.12 },
  c: { t: 'floor', tex: 'floor_cryo', ...FLOOR_LOOK },
});

const VOID = Object.freeze({ t: 'void' });
const CELL_TYPES = new Set(['wall', 'window', 'door', 'floor', 'water', 'pit', 'void']);
const TRIGGER_ON = new Set(['enter', 'load', 'flag']);
const FACINGS = new Set(['up', 'down', 'left', 'right']);

const isLine = (l) => typeof l === 'string' || (l && typeof l === 'object' && 'text' in l && !('script' in l) && !('lines' in l));

/**
 * TalkSpec -> entry list. A string is a script id; an array of lines (strings or { text } objects)
 * is a legacy POC line list; an array of { when?, script | lines } entries is already normalized.
 */
export function normalizeTalk(spec) {
  if (spec == null || spec === '') return null;
  if (typeof spec === 'string') return [{ script: spec }];
  if (!Array.isArray(spec)) {
    if (typeof spec === 'object' && (spec.script || spec.lines)) return [{ ...spec }];
    throw new Error(`mapdef: bad TalkSpec ${JSON.stringify(spec).slice(0, 80)}`);
  }
  if (!spec.length) return null;
  if (spec.every(isLine)) return [{ lines: spec }];
  return spec.map((e) => (typeof e === 'string' ? { script: e } : { ...e }));
}

const withTalk = (list, key = 'talk') => (list || []).map((e) => (e[key] === undefined ? { ...e } : { ...e, [key]: normalizeTalk(e[key]) }));

function normalizeLegend(legend) {
  const out = { ...DEFAULT_LEGEND, ...(legend || {}) };
  for (const [ch, spec] of Object.entries(out)) {
    if (spec && spec.lock && spec.lock.talk !== undefined) out[ch] = { ...spec, lock: { ...spec.lock, talk: normalizeTalk(spec.lock.talk) } };
  }
  return out;
}

/** Fill defaults and convert TalkSpecs; safe to call on an already normalized map. */
export function normalizeMap(def) {
  if (!def || typeof def !== 'object') throw new Error('mapdef: normalizeMap needs a MapDef object');
  const grid = (def.grid || []).map(String);
  const w = grid.reduce((m, row) => Math.max(m, row.length), 0);
  return {
    region: '',
    music: null,
    wallH: 3,
    lowH: 0.75,
    backdrop: { texture: 'space_backdrop', stars: 'stars_layer', tint: [1.05, 1.05, 1.1] },
    sky: null,
    underlay: null,
    fx: null,
    transit: false,
    scene: false,
    companions: true,
    poc: false,
    ...def,
    grid,
    w,
    h: grid.length,
    legend: normalizeLegend(def.legend),
    wallTex: { side: 'wall_panel', cap: 'wall_cap', low: 'wall_low', ...(def.wallTex || {}) },
    grand: [...(def.grand || [])],
    dividers: [...(def.dividers || [])],
    areas: (def.areas || []).map((a) => ({ ...a })),
    spawns: { ...(def.spawns || {}) },
    anchors: { ...(def.anchors || {}) },
    exits: (def.exits || []).map((e) => ({ auto: true, transition: 'fade', ...e })),
    props: [...(def.props || [])],
    lights: [...(def.lights || [])],
    ambient: [...(def.ambient || [])],
    view: { pitch: 34, dist: 16, ...(def.view || {}) },
    npcs: withTalk(def.npcs),
    chests: withTalk(def.chests).map((c) => ({ n: 1, ...c })),
    interactables: withTalk(def.interactables),
    triggers: (def.triggers || []).map((t) => ({ ...t })),
    gates: (def.gates || []).map((g) => ({ ...g })),
    bosses: withTalk(def.bosses).map((b) => ({ triggerRadius: 3.4, when: `!defeated:${b.encounter}`, ...b })),
    viewpoints: { ...(def.viewpoints || {}) },
  };
}

export function mapSize(map) {
  const grid = map.grid || [];
  return { w: grid.reduce((m, row) => Math.max(m, row.length), 0), h: grid.length };
}

/** CellSpec of cell (c, r); characters missing from the legend read as void. */
export function cellSpec(map, c, r) {
  const row = map.grid[r];
  if (row === undefined || c < 0 || c >= row.length) return VOID;
  const legend = map.legend || DEFAULT_LEGEND;
  return legend[row[c]] || DEFAULT_LEGEND[row[c]] || VOID;
}

/** Floors (including gate floors) and doors are walkable; water only when it can drain. */
export function isWalkableSpec(spec) {
  return spec.t === 'floor' || spec.t === 'door' || (spec.t === 'water' && !!spec.drain);
}

/** Ids of entries (npc:, interactable:, chest:, boss:, lock:) that hold inline POC lines. */
export function inlineLines(def) {
  const map = normalizeMap(def);
  const out = [];
  const scan = (kind, list) => {
    for (const e of list) if (e.talk && e.talk.some((t) => t.lines)) out.push(`${kind}:${e.id}`);
  };
  scan('npc', map.npcs);
  scan('interactable', map.interactables);
  scan('chest', map.chests);
  scan('boss', map.bosses);
  for (const spec of Object.values(map.legend)) {
    if (spec.lock && spec.lock.talk && spec.lock.talk.some((t) => t.lines)) out.push(`lock:${spec.lock.id}`);
  }
  return out;
}

/** Every problem the World builder or the content lints would trip over; [] when the map is valid. */
export function validateMap(def) {
  const errs = [];
  const id = def && def.id ? def.id : '?';
  const err = (msg) => errs.push(`${id}: ${msg}`);
  if (!def || typeof def !== 'object') return ['?: not a MapDef object'];
  for (const k of ['id', 'name', 'grid', 'spawns']) if (def[k] === undefined) err(`missing "${k}"`);
  if (!Array.isArray(def.grid) || !def.grid.length) return errs.length ? errs : [`${id}: empty grid`];
  let map;
  try {
    map = normalizeMap(def);
  } catch (e) {
    return [`${id}: ${e.message}`];
  }
  const { grid, legend } = map;
  const W = map.w, H = map.h;
  const cond = (src, where) => {
    if (src === undefined || src === null || src === '') return;
    try { compileCond(src); } catch (e) { err(`${where}: ${e.message}`); }
  };

  // ---- grid and legend
  if (grid.some((row) => row.length !== W)) err('rows must have equal length');
  if (W > MAX_COLS || H > MAX_ROWS) err(`grid ${W}x${H} exceeds ${MAX_COLS}x${MAX_ROWS}`);
  for (const [ch, spec] of Object.entries(legend)) {
    if (!spec || !CELL_TYPES.has(spec.t)) err(`legend "${ch}": unknown cell type ${spec && spec.t}`);
    else if (spec.t !== 'void' && spec.t !== 'pit' && !spec.tex) err(`legend "${ch}": ${spec.t} needs tex`);
    if (spec && spec.rot !== undefined && (spec.rot !== 'random' || (spec.t !== 'floor' && spec.t !== 'wall'))) err(`legend "${ch}": rot must be 'random' on a floor or wall`);
    if (spec && spec.t === 'water') cond(spec.drain, `legend "${ch}" drain`);
    if (spec && spec.lock && !spec.lock.id) err(`legend "${ch}": lock needs an id`);
    if (spec && spec.lock) cond(spec.lock.flag, `legend "${ch}" lock`);
  }
  const unknown = new Set();
  for (const row of grid) for (const ch of row) if (!legend[ch]) unknown.add(ch);
  for (const ch of unknown) err(`grid character "${ch}" is not in the legend`);
  const at = (c, r) => cellSpec(map, c, r);
  const isWallish = (s) => s.t === 'wall' || s.t === 'window' || s.t === 'door';

  // ---- windows and doors: horizontal pairs inside a wall row
  const gateIds = new Set(map.gates.map((g) => g.id));
  const lockIds = [];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const s = at(c, r);
      if (s.t === 'floor' && s.gate && !gateIds.has(s.gate)) err(`cell (${c}, ${r}) names unknown gate "${s.gate}"`);
      if (s.t !== 'window' && s.t !== 'door') continue;
      if (c > 0 && grid[r][c - 1] === grid[r][c]) continue;   // not the start of a run
      let n = 0;
      while (c + n < W && grid[r][c + n] === grid[r][c]) n++;
      const what = s.t === 'door' ? (s.lock ? 'locked door' : 'door') : 'window';
      if (s.t === 'door' ? n !== 2 : n % 2 !== 0) err(`${what} at (${c}, ${r}) must come in horizontal pairs (run of ${n})`);
      if (!isWallish(at(c - 1, r)) || !isWallish(at(c + n, r))) err(`${what} at (${c}, ${r}) must sit inside a wall row`);
      for (let k = 0; k < n; k++) {
        const south = at(c + k, r + 1), north = at(c + k, r - 1);
        if (s.t === 'window') {
          if (south.t !== 'floor') err(`window at (${c + k}, ${r}) needs floor directly south`);
          if (north.t !== 'void') err(`window at (${c + k}, ${r}) needs void directly north`);
        } else if (!isWalkableSpec(south) || !isWalkableSpec(north) || south.t === 'water' || north.t === 'water') {
          err(`door at (${c + k}, ${r}) needs floor north and south (east and west openings are plain gaps)`);
        }
      }
      if (s.lock) lockIds.push(s.lock.id);
      // a door in a cutaway wall (rooms only to the north) would stand full height: its row needs a divider
      if (s.t === 'door') {
        const room = (cc) => { const t = at(cc, r + 1).t; return t === 'floor' || t === 'door' || t === 'water' || t === 'pit'; };
        const divided = map.dividers.some((d) => d.row === r && Array.isArray(d.rect) && d.rect[0] <= c && d.rect[2] >= c + n - 1);
        if (!room(c - 1) && !room(c + n) && !divided) err(`door at (${c}, ${r}) sits in a cutaway wall: give row ${r} a divider`);
      }
    }
  }

  // ---- positions inside the grid
  const inside = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.z) && p.x >= 0 && p.z >= 0 && p.x < W && p.z < H;
  const walkableAt = (x, z) => isWalkableSpec(at(Math.floor(x), Math.floor(z)));
  for (const [name, list] of [['spawn', map.spawns], ['anchor', map.anchors], ['viewpoint', map.viewpoints]]) {
    for (const [k, p] of Object.entries(list)) {
      if (!inside(p)) { err(`${name} "${k}" is outside the grid`); continue; }
      if (p.facing && !FACINGS.has(p.facing)) err(`${name} "${k}": bad facing "${p.facing}"`);
      if (name === 'spawn') {
        cond(p.requires, `spawn "${k}" requires`);
        if (!walkableAt(p.x, p.z) && !p.requires) err(`spawn "${k}" stands on a ${at(Math.floor(p.x), Math.floor(p.z)).t} cell`);
      }
    }
  }
  if (!Object.keys(map.spawns).length) err('needs at least one spawn');

  // ---- regions
  const rectIn = (rc) => Array.isArray(rc) && rc.length === 4 && rc[0] >= 0 && rc[1] >= 0 && rc[2] <= W && rc[3] <= H && rc[0] <= rc[2] && rc[1] <= rc[3];
  const areaIds = new Set();
  for (const a of map.areas) {
    if (!a.id) err('area without id');
    if (areaIds.has(a.id)) err(`duplicate area id "${a.id}"`);
    areaIds.add(a.id);
    if (!rectIn(a.rect)) err(`area "${a.id}": rect outside the grid`);
    if (Array.isArray(a.zone)) a.zone.forEach((z, i) => cond(z.when, `area "${a.id}" zone[${i}]`));
  }
  for (const d of map.dividers) {
    if (!d.id || !Number.isInteger(d.row)) err('divider needs id and row');
    if (!Array.isArray(d.rect) || d.rect[0] < 0 || d.rect[1] < 0 || d.rect[2] >= W || d.rect[3] >= H) err(`divider "${d.id}": rect outside the grid`);
  }
  const dividerIds = new Set(map.dividers.map((d) => d.id));

  // ---- ids: interactables, NPCs, chests, bosses and locked doors share one namespace per map
  const seen = new Map();
  const claim = (kind, eid) => {
    if (!eid) { err(`${kind} without id`); return; }
    if (seen.has(eid)) err(`id "${eid}" used by ${seen.get(eid)} and ${kind}`);
    else seen.set(eid, kind);
  };
  for (const n of map.npcs) {
    claim('npc', n.id);
    if (!inside(n)) err(`npc "${n.id}" is outside the grid`);
    cond(n.when, `npc "${n.id}" when`);
    for (const t of n.talk || []) cond(t.when, `npc "${n.id}" talk`);
  }
  for (const c of map.chests) {
    claim('chest', c.id);
    if (!inside(c)) err(`chest "${c.id}" is outside the grid`);
    if (!c.item && !c.credits) err(`chest "${c.id}" holds nothing`);
    cond(c.when, `chest "${c.id}" when`);
  }
  for (const it of map.interactables) {
    claim('interactable', it.id);
    if (!it.kind) err(`interactable "${it.id}" without kind`);
    if (!inside(it)) err(`interactable "${it.id}" is outside the grid`);
    cond(it.when, `interactable "${it.id}" when`);
    for (const t of it.talk || []) cond(t.when, `interactable "${it.id}" talk`);
    if ((it.kind === 'terminal' || it.kind === 'inspect') && !it.talk && !it.script) err(`${it.kind} "${it.id}" needs talk`);
    if (it.kind === 'switch' && !it.flag) err(`switch "${it.id}" needs a flag`);
    if (it.kind === 'switch' && it.reveal && !gateIds.has(it.reveal)) err(`switch "${it.id}" reveals unknown gate "${it.reveal}"`);
    if (it.kind === 'shard' && !it.flag) err(`shard "${it.id}" needs a flag`);
    if (it.kind === 'exit' && !(it.to && it.to.map && it.to.spawn)) err(`exit "${it.id}" needs to: { map, spawn }`);
    if (it.kind === 'lift' && !map.spawns[it.to]) err(`lift "${it.id}" goes to unknown spawn "${it.to}"`);
    if (it.kind === 'shop' && !it.shop) err(`shop "${it.id}" needs a shop id`);
  }
  for (const b of map.bosses) {
    claim('boss', b.id);
    if (!b.encounter) err(`boss "${b.id}" needs an encounter`);
    if (!inside(b)) err(`boss "${b.id}" is outside the grid`);
    cond(b.when, `boss "${b.id}" when`);
  }
  for (const l of lockIds) claim('locked door', l);
  const trigIds = new Set();
  for (const t of map.triggers) {
    if (!t.id) err('trigger without id');
    else if (trigIds.has(t.id)) err(`duplicate trigger id "${t.id}"`);
    trigIds.add(t.id);
    if (!TRIGGER_ON.has(t.on)) err(`trigger "${t.id}": on must be enter, load or flag`);
    if (t.on === 'enter' && !t.rect && !t.area) err(`trigger "${t.id}": enter needs rect or area`);
    if (t.area && !areaIds.has(t.area)) err(`trigger "${t.id}": unknown area "${t.area}"`);
    if (t.rect && !rectIn(t.rect)) err(`trigger "${t.id}": rect outside the grid`);
    if (!t.script) err(`trigger "${t.id}" needs a script`);
    cond(t.when, `trigger "${t.id}" when`);
  }
  const gateSeen = new Set();
  for (const g of map.gates) {
    if (!g.id || gateSeen.has(g.id)) err(`gate id "${g.id}" missing or duplicated`);
    gateSeen.add(g.id);
    if (!g.cells && !g.rect) err(`gate "${g.id}" needs cells or rect`);
    if (g.open === undefined) err(`gate "${g.id}" needs an open condition`);
    cond(g.open, `gate "${g.id}" open`);
  }
  for (const e of map.exits) {
    if (!e.id) err('exit without id');
    if (!rectIn(e.rect)) err(`exit "${e.id}": rect outside the grid`);
    if (!e.to || !e.to.map || !e.to.spawn) err(`exit "${e.id}" needs to: { map, spawn }`);
    cond(e.when, `exit "${e.id}" when`);
  }
  for (const [i, p] of map.props.entries()) {
    if (!p.t) err(`prop #${i} without type`);
    if (p.on && !dividerIds.has(p.on)) err(`prop #${i} (${p.t}) hangs on unknown divider "${p.on}"`);
    cond(p.when, `prop #${i} (${p.t}) when`);
    cond(p.status, `prop #${i} (${p.t}) status`);
  }
  for (const [i, l] of map.lights.entries()) {
    if (l.on && !dividerIds.has(l.on)) err(`light #${i} hangs on unknown divider "${l.on}"`);
    cond(l.when, `light #${i} when`);
  }
  return errs;
}
