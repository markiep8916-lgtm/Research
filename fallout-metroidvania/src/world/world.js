// World assembly: rooms (ASCII glyph maps) -> global tile grid, spawns, lights, decor data, validation. DOM-free.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T, TILE = CD.TILE;

CD.ROOMS = CD.ROOMS || [];

// ---------------------------------------------------------------- regions
CD.REGIONS = {
  vault: {
    name: 'Vault 213', fg: 'vault', bg: 'bw_vault', sky: false, ambient: [0.22, 0.28, 0.33], fluoro: { color: [0.66, 0.96, 0.96], r: 380, i: 1.25, flicker: 0.25 },
    music: 'vault', grade: [0.90, 1.0, 1.06], dust: 0.5, backdrop: null, geiger: 0,
    decor: { ceil: ['conduit', 'cabletray'], wall: ['pipe_v'], floor: { debris: 0.05, papers: 0.04, can: 0.02, rubble: 0.02 }, back: { vent: 0.10, stain: 0.10, hatch: 0.03, stripe: 0.0 } },
  },
  surface: {
    name: 'Cinder Ridge', fg: 'soil', bg: null, sky: true, ambient: [0.50, 0.40, 0.36], skyColor: [1.0, 0.74, 0.52], skyStrength: 0.7, fluoro: { color: [1, 0.85, 0.65], r: 260, i: 0.8, flicker: 0.4 },
    music: 'wasteland', grade: [1.07, 1.0, 0.90], dust: 1.0, backdrop: 'dusk', geiger: 0.02,
    decor: { ceil: [], wall: [], floor: { rubble: 0.10, weeds: 0.16, bones: 0.015, debris: 0.06, rocks: 0.05, can: 0.02 }, back: { stain: 0.04 } },
  },
  rustyard: {
    name: 'The Rustyard', fg: 'scrap', bg: 'bw_scrap', sky: true, ambient: [0.30, 0.22, 0.17], skyColor: [1.0, 0.62, 0.38], skyStrength: 0.5, fluoro: { color: [1, 0.72, 0.42], r: 280, i: 0.9, flicker: 0.5 },
    music: 'rustyard', grade: [1.1, 0.98, 0.86], dust: 1.0, backdrop: 'dusk_dim', geiger: 0.03,
    decor: { ceil: ['cabletray'], wall: ['pipe_v'], floor: { rubble: 0.10, debris: 0.10, can: 0.05, bones: 0.03, weeds: 0.05 }, back: { stain: 0.08, vent: 0.02 } },
  },
  metro: {
    name: 'Meridian Metro', fg: 'concrete', bg: 'bw_tunnel', sky: false, ambient: [0.13, 0.17, 0.17], fluoro: { color: [0.75, 1.0, 0.85], r: 300, i: 0.85, flicker: 0.55 },
    music: 'metro', grade: [0.92, 1.05, 1.0], dust: 0.7, backdrop: null, geiger: 0.05,
    decor: { ceil: ['conduit', 'cabletray'], wall: ['pipe_v'], floor: { rubble: 0.08, debris: 0.08, bones: 0.04, papers: 0.03, can: 0.02 }, back: { stain: 0.12, vent: 0.03 } },
  },
  plant: {
    name: 'Meridian Power Station', fg: 'rust', bg: 'bw_rust', sky: false, ambient: [0.15, 0.18, 0.13], fluoro: { color: [0.85, 1.0, 0.6], r: 320, i: 0.9, flicker: 0.35 },
    music: 'plant', grade: [0.95, 1.06, 0.92], dust: 0.6, backdrop: null, geiger: 0.2,
    decor: { ceil: ['conduit', 'cabletray'], wall: ['pipe_v'], floor: { debris: 0.07, can: 0.03, rubble: 0.04 }, back: { vent: 0.08, stain: 0.08, stripe: 0.04 } },
  },
  deep: {
    name: 'Cinder Deep', fg: 'lab', bg: 'bw_lab', sky: false, ambient: [0.16, 0.22, 0.24], fluoro: { color: [0.8, 1.0, 1.0], r: 340, i: 1.0, flicker: 0.15 },
    music: 'deep', grade: [0.92, 1.03, 1.06], dust: 0.3, backdrop: null, geiger: 0.02,
    decor: { ceil: ['conduit'], wall: ['pipe_v'], floor: { debris: 0.03, papers: 0.04 }, back: { vent: 0.06, stain: 0.03, hatch: 0.03 } },
  },
};

// ---------------------------------------------------------------- world
function World(roomDefs) {
  this.roomDefs = roomDefs;
  this.rooms = []; this.errors = []; this.warnings = [];
  this.spawns = []; this.lights = []; this.decor = [];
  this.marks = {};
  this.onTileChange = null;
  let W = 0, H = 0;
  // pass 1: parse dimensions
  const parsed = roomDefs.map((d) => this._parseDims(d));
  for (const p of parsed) { W = Math.max(W, p.x + p.w); H = Math.max(H, p.y + p.h); }
  this.W = W; this.H = H;
  this.tiles = new Uint8Array(W * H).fill(TILE.SOLID);
  this.mats = new Uint8Array(W * H).fill(CD.MAT_ID.rock);
  this.bgs = new Uint8Array(W * H);
  this.roomIdx = new Int16Array(W * H).fill(-1);
  this.exposed = new Uint8Array(W * H);
  this.water = null;
  this.seed = 1234;
  // pass 2: place
  parsed.forEach((p, i) => this._place(p, i));
  this._validate();
  this._computeExposure();
  for (const r of this.rooms) this._autoDecor(r);
  this.roomById = {}; for (const r of this.rooms) this.roomById[r.id] = r;
}
CD.World = World;
const P = World.prototype;

P._parseDims = function (d) {
  const rows = d.map.replace(/^\r?\n/, '').replace(/\r?\n[ \t]*$/, '').split(/\r?\n/);
  const w = Math.max.apply(null, rows.map((r) => r.length));
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length !== w) { this.errors.push(d.id + ': row ' + i + ' has length ' + rows[i].length + ', expected ' + w); rows[i] = rows[i].padEnd(w, '#'); }
  }
  return { def: d, rows, w, h: rows.length, x: d.x, y: d.y };
};

P._place = function (p, idx) {
  const d = p.def, reg = CD.REGIONS[d.region];
  if (!reg) this.errors.push(d.id + ': unknown region ' + d.region);
  const R = reg || CD.REGIONS.vault;
  const room = {
    id: d.id, name: d.name || d.id, region: d.region, idx, x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h, w: p.w, h: p.h,
    sky: d.sky !== undefined ? d.sky : R.sky, ambient: d.ambient || R.ambient, fg: d.fg || R.fg,
    bg: d.bg !== undefined ? d.bg : R.bg, music: d.music || R.music, def: d, dark: d.dark || 0, rad: d.rad || 0, secret: !!d.secret,
    skyColor: d.skyColor || R.skyColor, skyStrength: d.skyStrength !== undefined ? d.skyStrength : R.skyStrength, title: d.title !== undefined ? d.title : true,
  };
  room.px0 = room.x0 * T; room.py0 = room.y0 * T; room.px1 = room.x1 * T; room.py1 = room.y1 * T;
  this.rooms.push(room);
  const fgId = CD.MAT_ID[room.fg];
  if (fgId === undefined) this.errors.push(d.id + ': unknown fg material ' + room.fg);
  const bgId = room.bg ? CD.BG_ID[room.bg] : 0;
  if (room.bg && bgId === undefined) this.errors.push(d.id + ': unknown bg ' + room.bg);
  const marks = d.marks || {};
  const usedMarks = {};
  // background zones
  const zones = d.zones || [];
  for (let ry = 0; ry < p.h; ry++) {
    const row = p.rows[ry];
    for (let rx = 0; rx < p.w; rx++) {
      const gx = p.x + rx, gy = p.y + ry, gi = gy * this.W + gx;
      if (this.roomIdx[gi] !== -1) this.errors.push(d.id + ': overlaps room ' + this.rooms[this.roomIdx[gi]].id + ' at ' + gx + ',' + gy);
      this.roomIdx[gi] = idx;
      let ch = row[rx]; if (ch === ' ') ch = '.';
      let tile = TILE.AIR, mat = 0, bg = bgId;
      for (const z of zones) if (rx >= z.x0 && rx <= z.x1 && ry >= z.y0 && ry <= z.y1) bg = z.bg ? CD.BG_ID[z.bg] : 0;
      const ter = CD.GLYPH_TERRAIN[ch];
      const key = d.id + ':' + rx + ',' + ry;
      if (ter) {
        tile = ter[0];
        if (ter[1]) { mat = ter[1] === '#' ? fgId : CD.MAT_ID[ter[1]]; }
        if (tile === TILE.WATER) { /* water uses the region background */ }
      } else if (ch === '.') {
        tile = TILE.AIR;
      } else if (CD.GLYPH_ENTITY[ch]) {
        tile = TILE.AIR;
        this.spawns.push({ t: CD.GLYPH_ENTITY[ch], tx: gx, ty: gy, lx: rx, ly: ry, room: idx, roomId: d.id, key });
      } else if (ch >= '0' && ch <= '9') {
        tile = TILE.AIR;
        const m = marks[ch];
        if (!m) this.errors.push(d.id + ': mark ' + ch + ' at ' + rx + ',' + ry + ' has no definition');
        else {
          usedMarks[ch] = true; const spec = Object.assign({}, m[1] || {});
          if (m[0] === 'decor') this.decor.push({ k: spec.kind, x: gx * T + (spec.dx || 0), y: gy * T + (spec.dy || 0), w: (spec.w || 1) * T, h: (spec.h || 1) * T, z: spec.z || 'back', s: spec.s || (gx * 31 + gy * 17), room: idx, p: spec });
          else this.spawns.push(Object.assign({ t: m[0], tx: gx, ty: gy, lx: rx, ly: ry, room: idx, roomId: d.id, key, mark: ch }, spec));
        }
      } else {
        this.errors.push(d.id + ': unknown glyph "' + ch + '" at ' + rx + ',' + ry);
      }
      this.tiles[gi] = tile; this.mats[gi] = mat; this.bgs[gi] = (tile === TILE.SOLID || tile === TILE.BREAK) ? 0 : bg;
      if (tile === TILE.SOLID || tile === TILE.BREAK) this.bgs[gi] = bg;   // keep for transparent edges
    }
  }
  for (const ch in marks) if (!usedMarks[ch]) this.warnings.push(d.id + ': mark ' + ch + ' defined but not placed');
  for (const dc of (d.decos || [])) this.decor.push({ k: dc.kind, x: (p.x + dc.x) * T + (dc.dx || 0), y: (p.y + dc.y) * T + (dc.dy || 0), w: dc.w * T, h: dc.h * T, z: dc.z || 'back', s: dc.s || ((p.x + dc.x) * 31 + (p.y + dc.y) * 17), room: idx, p: dc });
};

P._validate = function () {
  // every open border cell must continue into a neighbouring room's open cell
  for (const r of this.rooms) {
    const chk = (gx, gy, nx, ny, side) => {
      const t = this.tile(gx, gy);
      if (CD.isSolidTile(t)) return;
      if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H || this.roomIdx[ny * this.W + nx] === -1) { this.errors.push(r.id + ': open ' + side + ' edge at ' + gx + ',' + gy + ' leads nowhere'); return; }
      const tn = this.tile(nx, ny);
      if (CD.isSolidTile(tn)) this.errors.push(r.id + ': open ' + side + ' edge at ' + gx + ',' + gy + ' meets solid tile of ' + this.rooms[this.roomIdx[ny * this.W + nx]].id);
    };
    for (let x = r.x0; x < r.x1; x++) { if (!(r.def && r.def.skyTop)) chk(x, r.y0, x, r.y0 - 1, 'top'); chk(x, r.y1 - 1, x, r.y1, 'bottom'); }
    for (let y = r.y0; y < r.y1; y++) { chk(r.x0, y, r.x0 - 1, y, 'left'); chk(r.x1 - 1, y, r.x1, y, 'right'); }
  }
};

P._computeExposure = function () {
  const slope = 0.3;
  for (const r of this.rooms) {
    if (!r.sky) continue;
    for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) {
      if (CD.isSolidTile(this.tiles[y * this.W + x])) continue;
      let ex = 1;
      for (let k = 1; k < 60; k++) {
        const yy = y - k; if (yy < r.y0) break;
        const xx = x + Math.round(k * slope * -1);   // sun from upper-right: shadows fall to the left-down; shear toward the sun
        const t = this.tile(xx, yy);
        if (CD.isSolidTile(t)) { ex = 0; break; }
      }
      this.exposed[y * this.W + x] = ex;
    }
  }
};

// ---------------------------------------------------------------- auto decor (data only)
P._autoDecor = function (room) {
  const R = CD.REGIONS[room.region]; if (!R) return;
  const rng = U.RNG(U.hashStr(room.id) ^ this.seed);
  const dec = R.decor || {};
  const W = this.W;
  const solid = (x, y) => CD.isSolidTile(this.tile(x, y));
  const inRoom = (x, y) => x >= room.x0 && x < room.x1 && y >= room.y0 && y < room.y1;
  const air = (x, y) => inRoom(x, y) && !solid(x, y);
  // ceilings: runs of solid-above / air-below
  if (!room.sky && dec.ceil && dec.ceil.length) {
    for (let y = room.y0 + 1; y < room.y1; y++) {
      let x = room.x0;
      while (x < room.x1) {
        if (solid(x, y - 1) && air(x, y)) {
          let x2 = x; while (x2 < room.x1 && solid(x2, y - 1) && air(x2, y)) x2++;
          const len = x2 - x;
          if (len >= 5 && rng.next() < 0.62) {
            const a = x + rng.int(0, 1), b = x2 - rng.int(0, 1);
            this.decor.push({ k: rng.pick(dec.ceil), x: a * T, y: y * T, w: (b - a) * T, h: T, z: 'back', s: rng.int(1, 99999), room: room.idx });
          }
          x = x2;
        } else x++;
      }
    }
  }
  // walls: vertical runs where a solid column borders air
  if (dec.wall && dec.wall.length) {
    for (let x = room.x0 + 1; x < room.x1 - 1; x++) {
      let y = room.y0;
      while (y < room.y1) {
        const leftWall = solid(x - 1, y) && air(x, y), rightWall = solid(x + 1, y) && air(x, y);
        if (leftWall || rightWall) {
          let y2 = y; while (y2 < room.y1 && air(x, y2) && (leftWall ? solid(x - 1, y2) : solid(x + 1, y2))) y2++;
          if (y2 - y >= 4 && rng.next() < 0.3) this.decor.push({ k: rng.pick(dec.wall), x: (leftWall ? x : x + 0.62) * T, y: y * T, w: 0.38 * T, h: (y2 - y) * T, z: 'back', s: rng.int(1, 99999), room: room.idx });
          y = y2;
        } else y++;
      }
    }
  }
  // floor clutter
  const fl = dec.floor || {};
  const kinds = Object.keys(fl);
  if (kinds.length) {
    for (let y = room.y0 + 1; y < room.y1; y++) for (let x = room.x0; x < room.x1; x++) {
      if (!air(x, y - 1) || !solid(x, y)) continue;
      const tb = this.tile(x, y); if (tb !== TILE.SOLID) continue;
      for (const k of kinds) if (rng.next() < fl[k]) { this.decor.push({ k, x: x * T + rng.range(-4, 8), y: y * T, w: T, h: T, z: 'back', s: rng.int(1, 99999), room: room.idx }); break; }
    }
  }
  // back-wall dressing (interior rooms only)
  const bk = dec.back || {};
  if (room.bg && Object.keys(bk).length) {
    for (let y = room.y0 + 1; y < room.y1 - 1; y += 2) for (let x = room.x0 + 1; x < room.x1 - 2; x += 3) {
      if (!(air(x, y) && air(x + 1, y) && air(x, y + 1) && air(x + 1, y + 1))) continue;
      if (this.bgs[y * W + x] === 0) continue;
      for (const k in bk) if (rng.next() < bk[k]) { this.decor.push({ k, x: x * T + rng.range(0, 10), y: y * T + rng.range(0, 8), w: 2 * T, h: 1.5 * T, z: 'back', s: rng.int(1, 99999), room: room.idx }); break; }
    }
  }
};

// ---------------------------------------------------------------- queries
P.tile = function (tx, ty) { if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return TILE.SOLID; return this.tiles[ty * this.W + tx]; };
P.mat = function (tx, ty) { if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return 0; return this.mats[ty * this.W + tx]; };
P.bg = function (tx, ty) { if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return 0; return this.bgs[ty * this.W + tx]; };
P.isSolid = function (tx, ty) { return CD.isSolidTile(this.tile(tx, ty)); };
P.roomAtTile = function (tx, ty) { if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return null; const i = this.roomIdx[ty * this.W + tx]; return i < 0 ? null : this.rooms[i]; };
P.roomAt = function (px, py) { return this.roomAtTile(Math.floor(px / T), Math.floor(py / T)); };
P.setTile = function (tx, ty, t, mat) {
  if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return;
  this.tiles[ty * this.W + tx] = t; if (mat !== undefined) this.mats[ty * this.W + tx] = mat;
  if (this.onTileChange) this.onTileChange(tx, ty);
};
// Solid test for a pixel rect (used by movement). oneWay handled by callers.
P.rectHitsSolid = function (x, y, w, h) {
  const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 0.001) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + h - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (CD.isSolidTile(this.tile(tx, ty))) return true;
  return false;
};
// Line-of-sight test between two world points against solid tiles (DDA).
P.los = function (x0, y0, x1, y1) {
  let dx = x1 - x0, dy = y1 - y0; const dist = Math.hypot(dx, dy); if (dist < 1) return true;
  const steps = Math.ceil(dist / (T * 0.4)); dx /= steps; dy /= steps;
  let x = x0, y = y0;
  for (let i = 0; i < steps; i++) { x += dx; y += dy; if (CD.isSolidTile(this.tile(Math.floor(x / T), Math.floor(y / T)))) return false; }
  return true;
};
// Ray cast: returns distance to first solid tile along angle, capped at maxD.
P.rayDist = function (x0, y0, ang, maxD) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let tx = Math.floor(x0 / T), ty = Math.floor(y0 / T);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const tDx = dx === 0 ? 1e30 : Math.abs(T / dx), tDy = dy === 0 ? 1e30 : Math.abs(T / dy);
  let tMx = dx === 0 ? 1e30 : ((dx > 0 ? (tx + 1) * T - x0 : x0 - tx * T) / Math.abs(dx));
  let tMy = dy === 0 ? 1e30 : ((dy > 0 ? (ty + 1) * T - y0 : y0 - ty * T) / Math.abs(dy));
  let d = 0;
  while (d < maxD) {
    if (tMx < tMy) { d = tMx; tMx += tDx; tx += sx; } else { d = tMy; tMy += tDy; ty += sy; }
    if (d >= maxD) return maxD;
    if (CD.isSolidTile(this.tile(tx, ty))) return d;
  }
  return maxD;
};

})();
