// Room-building DSL. All coordinates are LOCAL to the room (0,0 = top-left tile); y grows downward.
// Produces the glyph maps consumed by world.js. DOM-free.
(function () {
'use strict';
const CD = window.CD;
CD.ROOMS = CD.ROOMS || [];

class Room {
  constructor(id, name, region, x, y, w, h, opts) {
    this.id = id; this.name = name; this.region = region; this.x = x; this.y = y; this.w = w; this.h = h; this.opts = opts || {};
    this.g = []; for (let j = 0; j < h; j++) this.g.push(new Array(w).fill('.'));
    this.marks = {}; this.nextMark = 0; this.zones = []; this.wall = 1; this.decos = [];
  }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  put(x, y, ch) { if (!this.inb(x, y)) throw new Error(this.id + ': put out of bounds ' + x + ',' + y + ' (' + this.w + 'x' + this.h + ')'); this.g[y][x] = ch; return this; }
  get(x, y) { return this.inb(x, y) ? this.g[y][x] : '#'; }
  fill(x0, y0, x1, y1, ch) { for (let y = Math.max(0, y0); y <= Math.min(this.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) this.g[y][x] = ch; return this; }
  clear(x0, y0, x1, y1) { return this.fill(x0, y0, x1, y1, '.'); }
  hline(x0, x1, y, ch) { return this.fill(x0, y, x1, y, ch); }
  vline(x, y0, y1, ch) { return this.fill(x, y0, x, y1, ch); }
  shell(t, ch) { t = t || 1; ch = ch || '#'; this.wall = t; this.fill(0, 0, this.w - 1, t - 1, ch); this.fill(0, this.h - t, this.w - 1, this.h - 1, ch); this.fill(0, 0, t - 1, this.h - 1, ch); this.fill(this.w - t, 0, this.w - 1, this.h - 1, ch); return this; }
  floor(n, ch) { return this.fill(0, this.h - n, this.w - 1, this.h - 1, ch || '#'); }
  ceil(n, ch) { return this.fill(0, 0, this.w - 1, n - 1, ch || '#'); }
  // openings through the shell. side L/R: a..b are rows; side T/B: a..b are columns. depth defaults to the shell thickness (min 1, 3 to be safe)
  open(side, a, b, depth) {
    depth = depth || Math.max(this.wall, 1);
    if (side === 'L') this.clear(0, a, depth - 1, b); if (side === 'R') this.clear(this.w - depth, a, this.w - 1, b);
    if (side === 'T') this.clear(a, 0, b, depth - 1); if (side === 'B') this.clear(a, this.h - depth, b, this.h - 1);
    return this;
  }
  plat(x0, x1, y) { return this.hline(x0, x1, y, '='); }
  spikes(x0, x1, y) { return this.hline(x0, x1, y, '^'); }
  ceilSpikes(x0, x1, y) { return this.hline(x0, x1, y, 'v'); }
  ladder(x, y0, y1) { return this.vline(x, y0, y1, 'H'); }
  water(x0, y0, x1, y1) { return this.fill(x0, y0, x1, y1, '~'); }
  solid(x0, y0, x1, y1, ch) { return this.fill(x0, y0, x1, y1, ch || '#'); }
  breakable(x0, y0, x1, y1) { return this.fill(x0, y0, x1, y1, 'X'); }
  // entity glyphs
  ent(x, y, ch) { return this.put(x, y, ch); }
  ents(list) { for (const e of list) this.put(e[0], e[1], e[2]); return this; }
  // marks: place a digit and register an entity spec
  mark(x, y, type, spec) {
    if (this.nextMark > 9) throw new Error(this.id + ': too many marks');
    const ch = String(this.nextMark++); this.put(x, y, ch); this.marks[ch] = [type, spec || {}]; return this;
  }
  // static decor (unlimited): x,y = top-left tile of the item box; w,h in tiles
  deco(x, y, kind, w, h, spec) { this.decos.push(Object.assign({ x, y, kind, w: w || 1, h: h || 1 }, spec || {})); return this; }
  decor(x, y, kind, spec) { return this.deco(x, y, kind, (spec && spec.w) || 1, (spec && spec.h) || 1, spec); }
  zone(x0, y0, x1, y1, bg) { this.zones.push({ x0, y0, x1, y1, bg }); return this; }
  // convenience: standing floor tile row above y (returns row index of the first air cell above ground)
  ascii() { return this.g.map((r) => r.join('')).join('\n'); }
  done() {
    const def = Object.assign({ id: this.id, name: this.name, region: this.region, x: this.x, y: this.y, map: this.ascii(), marks: this.marks, zones: this.zones, decos: this.decos }, this.opts);
    CD.ROOMS.push(def); return def;
  }
}
CD.Room = Room;
CD.room = (id, name, region, x, y, w, h, opts) => new Room(id, name, region, x, y, w, h, opts);

})();
