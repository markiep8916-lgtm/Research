// Room authoring DSL. Coordinates: x to the right, y UP, (0,0) = bottom-left tile.
// Terrain characters are defined in sim/tiles.js; entity markers in MARKER_CHARS; digits 0-9 are portals.
import { T, CHAR_TILE, MARKER_CHARS, TILE_CHAR } from '../sim/tiles.js';

const isDigit = (c) => c >= '0' && c <= '9';

export class RoomBuilder {
  constructor(id, w, h, opts = {}) {
    this.id = id;
    this.w = w;
    this.h = h;
    this.name = opts.name || id;
    this.area = opts.area || 'jungle';
    this.map = opts.map || null; // {x, y} top-left cell on the world map (size derived from room size)
    this.tiles = new Uint8Array(w * h);
    this.marks = [];
    this.portalDefs = {};
    this.props = { ...(opts.props || {}) };
  }

  inb(x, y) { return x >= 0 && x < this.w && y >= 0 && y < this.h; }
  get(x, y) { return this.inb(x, y) ? this.tiles[y * this.w + x] : T.SOLID; }

  /** Place one character: terrain tile, entity marker or portal digit. */
  set(x, y, ch) {
    if (!this.inb(x, y)) return this;
    this.marks = this.marks.filter((m) => !(m.x === x && m.y === y));
    if (ch === ' ' || ch === '.') { this.tiles[y * this.w + x] = T.EMPTY; return this; }
    if (CHAR_TILE[ch] !== undefined) { this.tiles[y * this.w + x] = CHAR_TILE[ch]; return this; }
    this.tiles[y * this.w + x] = T.EMPTY;
    if (isDigit(ch)) this.marks.push({ ch, x, y, kind: 'portal' });
    else if (MARKER_CHARS[ch]) this.marks.push({ ch, x, y, kind: MARKER_CHARS[ch] });
    else throw new Error(`${this.id}: unknown character '${ch}' at ${x},${y}`);
    return this;
  }

  rect(x, y, w, h, ch = '#') {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ch);
    return this;
  }
  clear(x, y, w, h) { return this.rect(x, y, w, h, '.'); }
  hline(x0, x1, y, ch = '#') { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, ch); return this; }
  vline(x, y0, y1, ch = '#') { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, ch); return this; }
  border(ch = '#', t = 1) {
    this.rect(0, 0, this.w, t, ch); this.rect(0, this.h - t, this.w, t, ch);
    this.rect(0, 0, t, this.h, ch); this.rect(this.w - t, 0, t, this.h, ch);
    return this;
  }
  /** Solid ground from y=0 up to (and including) row `top`, for x in [x0,x1]. */
  ground(x0, x1, top, ch = '#') { return this.rect(x0, 0, x1 - x0 + 1, top + 1, ch); }
  /** One-way platform occupying row y, x..x+len-1. */
  plat(x, y, len, ch = '=') { return this.hline(x, x + len - 1, y, ch); }
  /** Solid block platform (thick) with its top at row y. */
  block(x, y, len, thick = 1) { return this.rect(x, y - thick + 1, len, thick, '#'); }
  /** Ladder from row y0 up to y1 (inclusive); the top tile is a ladder-top (stand on it). */
  ladder(x, y0, y1) { this.vline(x, y0, y1 - 1, 'H'); this.set(x, y1, 'T'); return this; }
  vine(x, y0, y1) { return this.vline(x, y0, y1, 'V'); }
  /** ASCII stamp. rows[0] is the TOP row. ' ' leaves the tile untouched, '.' clears it. */
  stamp(x, y, rows) {
    const n = rows.length;
    for (let j = 0; j < n; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) if (row[i] !== ' ') this.set(x + i, y + (n - 1 - j), row[i]);
    }
    return this;
  }
  mark(x, y, ch) { return this.set(x, y, ch); }
  /** n bananas in a straight line starting at (x,y), stepping (dx,dy) per banana. */
  bananas(x, y, n, dx = 1, dy = 0) { for (let i = 0; i < n; i++) this.set(x + i * dx, y + i * dy, 'o'); return this; }
  /** n bananas along a jump-shaped arc from (x0,y0) to (x1,y0), peaking `rise` tiles above. */
  arc(x0, y0, x1, n, rise = 2) {
    for (let i = 0; i < n; i++) { const u = n === 1 ? 0.5 : i / (n - 1); this.set(Math.round(x0 + (x1 - x0) * u), Math.round(y0 + Math.sin(u * Math.PI) * rise), 'o'); }
    return this;
  }
  portal(ch, to, at) { this.portalDefs[ch] = { to, at }; return this; }
  prop(k, v) { this.props[k] = v; return this; }

  /** Replace everything from a full-room ASCII picture (top row first). */
  fromAscii(rows) {
    const H = rows.length;
    if (H !== this.h) throw new Error(`${this.id}: ascii has ${H} rows, room is ${this.h}`);
    rows.forEach((row, j) => {
      if (row.length !== this.w) throw new Error(`${this.id}: ascii row ${j} has ${row.length} cols, room is ${this.w}`);
      for (let i = 0; i < row.length; i++) this.set(i, H - 1 - j, row[i]);
    });
    return this;
  }

  build() {
    const portals = {};
    const open = new Uint8Array(this.w * this.h);
    for (const m of this.marks) {
      if (m.kind !== 'portal') continue;
      const def = this.portalDefs[m.ch];
      if (!def) throw new Error(`${this.id}: portal '${m.ch}' has no destination`);
      (portals[m.ch] ||= { ...def, cells: [] }).cells.push({ x: m.x, y: m.y });
      open[m.y * this.w + m.x] = 1;
    }
    for (const [ch, p] of Object.entries(portals)) {
      const xs = p.cells.map((c) => c.x), ys = p.cells.map((c) => c.y);
      if (xs.every((x) => x === 0)) p.side = 'left';
      else if (xs.every((x) => x === this.w - 1)) p.side = 'right';
      else if (ys.every((y) => y === this.h - 1)) p.side = 'top';
      else if (ys.every((y) => y === 0)) p.side = 'bottom';
      else throw new Error(`${this.id}: portal '${ch}' must lie on one border of the room`);
      p.x0 = Math.min(...xs); p.x1 = Math.max(...xs); p.y0 = Math.min(...ys); p.y1 = Math.max(...ys);
    }
    for (const ch of Object.keys(this.portalDefs)) if (!portals[ch]) throw new Error(`${this.id}: portal '${ch}' declared but not placed`);
    return {
      id: this.id, name: this.name, area: this.area, w: this.w, h: this.h,
      tiles: this.tiles, marks: this.marks.slice(), portals, open, props: this.props, map: this.map,
    };
  }
}

/** Debug helper: render a built room back to ASCII (top row first). */
export function toAscii(def) {
  const rows = [];
  const markAt = new Map(def.marks.map((m) => [m.y * def.w + m.x, m.ch]));
  for (let y = def.h - 1; y >= 0; y--) {
    let s = '';
    for (let x = 0; x < def.w; x++) {
      const t = def.tiles[y * def.w + x];
      s += markAt.get(y * def.w + x) || (t === T.EMPTY ? '.' : TILE_CHAR[t] || '?');
    }
    rows.push(s);
  }
  return rows.join('\n');
}
