// Cached chunk renderer: paints back walls, decor, solid terrain (with AO, bevels, soft shadows) into offscreen canvases.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T, TILE = CD.TILE;
const CH = 12;                 // tiles per chunk edge (12*40 = 480 = texture size, so chunk origin == texture origin)
const CHPX = CH * T;
const ORGANIC = { soil: 1, rock: 1, redrock: 1 };

function Chunks(world, R) {
  this.world = world; this.R = R; this.cache = new Map(); this.built = 0;
  this.CH = CH; this.CHPX = CHPX;
  this.decorIndex = null;
  this._indexDecor();
  const self = this;
  world.onTileChange = function (tx, ty) { self.invalidateTile(tx, ty); };
}
CD.Chunks = Chunks;
const P = Chunks.prototype;

P._indexDecor = function () {
  this.decorIndex = new Map();
  for (const d of this.world.decor) {
    const x0 = Math.floor((d.x - 8) / CHPX), x1 = Math.floor((d.x + d.w + 8) / CHPX), y0 = Math.floor((d.y - 8) / CHPX), y1 = Math.floor((d.y + d.h + 8) / CHPX);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const k = cy * 4096 + cx; let a = this.decorIndex.get(k); if (!a) this.decorIndex.set(k, (a = [])); a.push(d); }
  }
};
P.setScale = function (R) { if (R !== this.R) { this.R = R; this.cache.clear(); } };
P.invalidateTile = function (tx, ty) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this.cache.delete(Math.floor((ty + dy) / CH) * 4096 + Math.floor((tx + dx) / CH));
};
P.invalidateAll = function () { this.cache.clear(); };

P.get = function (cx, cy) {
  const k = cy * 4096 + cx; let c = this.cache.get(k);
  if (c === undefined) {
    c = this._render(cx, cy); this.cache.set(k, c);
    if (this.cache.size > 60) { const first = this.cache.keys().next().value; this.cache.delete(first); }
  }
  return c;
};

P.draw = function (ctx, x0, y0, x1, y1) {
  const cx0 = Math.max(0, Math.floor(x0 / CHPX)), cx1 = Math.min(Math.ceil(this.world.W / CH) - 1, Math.floor(x1 / CHPX));
  const cy0 = Math.max(0, Math.floor(y0 / CHPX)), cy1 = Math.min(Math.ceil(this.world.H / CH) - 1, Math.floor(y1 / CHPX));
  let budget = 3;   // limit rebuilds per frame to avoid hitches
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    const k = cy * 4096 + cx; let c = this.cache.get(k);
    if (c === undefined) { if (budget-- <= 0) continue; c = this.get(cx, cy); }
    if (c) ctx.drawImage(c, cx * CHPX, cy * CHPX, CHPX, CHPX);
  }
};
P.prebuild = function (x0, y0, x1, y1) {
  const cx0 = Math.max(0, Math.floor(x0 / CHPX)), cx1 = Math.min(Math.ceil(this.world.W / CH) - 1, Math.floor(x1 / CHPX));
  const cy0 = Math.max(0, Math.floor(y0 / CHPX)), cy1 = Math.min(Math.ceil(this.world.H / CH) - 1, Math.floor(y1 / CHPX));
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) this.get(cx, cy);
};

// returns canvas or null (chunk entirely outside rooms)
P._render = function (cx, cy) {
  const w = this.world, R = this.R;
  const tx0 = cx * CH, ty0 = cy * CH;
  let any = false;
  for (let y = ty0; y < ty0 + CH && !any; y++) for (let x = tx0; x < tx0 + CH; x++) if (w.roomIdx[Math.min(y, w.H - 1) * w.W + Math.min(x, w.W - 1)] >= 0 && x < w.W && y < w.H) { any = true; break; }
  if (!any) return null;
  this.built++;
  const cv = U.canvas(CHPX * R, CHPX * R), g = cv.getContext('2d');
  g.scale(R, R); g.translate(-cx * CHPX, -cy * CHPX);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const inRoom = (x, y) => x >= 0 && y >= 0 && x < w.W && y < w.H && w.roomIdx[y * w.W + x] >= 0;

  // ---- 1. back wall (runs of identical style; chunk == texture tile so no wrap)
  for (let ty = ty0; ty < ty0 + CH; ty++) {
    let tx = tx0;
    while (tx < tx0 + CH) {
      const b = (inRoom(tx, ty) && !w.isSolid(tx, ty)) ? w.bg(tx, ty) : 0;
      if (!b) { tx++; continue; }
      let tx2 = tx + 1; while (tx2 < tx0 + CH && inRoom(tx2, ty) && !w.isSolid(tx2, ty) && w.bg(tx2, ty) === b) tx2++;
      const tex = CD.tex.get(CD.BGS[b]);
      g.drawImage(tex, (tx - tx0) * T, (ty - ty0) * T, (tx2 - tx) * T, T, tx * T, ty * T, (tx2 - tx) * T, T);
      tx = tx2;
    }
  }
  // ---- 2. ladders + back decor
  for (let ty = ty0; ty < ty0 + CH; ty++) for (let tx = tx0; tx < tx0 + CH; tx++) if (inRoom(tx, ty) && w.tile(tx, ty) === TILE.LADDER) drawLadder(g, w, tx, ty);
  const dl = this.decorIndex.get(cy * 4096 + cx);
  if (dl) for (const d of dl) if (d.z !== 'front') CD.decor.draw(g, d);

  // ---- 3. solid layer (with 1-tile margin so cast shadows cross chunk borders)
  const M = 1, LS = (CH + 2 * M) * T;
  const L = U.canvas(LS * R, LS * R), lg = L.getContext('2d');
  lg.scale(R, R); lg.translate(-(tx0 - M) * T, -(ty0 - M) * T);
  lg.imageSmoothingEnabled = true; lg.imageSmoothingQuality = 'high';
  const lx0 = tx0 - M, ly0 = ty0 - M, lx1 = tx0 + CH + M, ly1 = ty0 + CH + M;
  const drawn = (x, y) => { const t = w.tile(x, y); return t !== TILE.DOOR && CD.isSolidTile(t); };   // door tiles are drawn by the Door entity
  for (let ty = ly0; ty < ly1; ty++) {
    let tx = lx0;
    while (tx < lx1) {
      if (!inRoom(tx, ty) || !drawn(tx, ty)) { tx++; continue; }
      const m = w.mat(tx, ty);
      let tx2 = tx + 1; while (tx2 < lx1 && inRoom(tx2, ty) && drawn(tx2, ty) && w.mat(tx2, ty) === m && ((tx2 % CH) !== 0)) tx2++;
      const tex = CD.tex.get(CD.MATS[m] || 'rock');
      const sx = ((tx % CH) + CH) % CH * T;
      lg.drawImage(tex, sx, (((ty % CH) + CH) % CH) * T, (tx2 - tx) * T, T, tx * T, ty * T, (tx2 - tx) * T, T);
      tx = tx2;
    }
  }
  // depth shading: solid tiles far from any open air fade toward black (cheap ambient occlusion); 1 texel per tile, bilinear-scaled
  {
    const N = CH + 2 * M, ov = U.canvas(N, N), og = ov.getContext('2d'), img = og.createImageData(N, N), dd = img.data;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const tx = lx0 + i, ty = ly0 + j; let a = 0;
      if (inRoom(tx, ty) && drawn(tx, ty)) {
        let dist = 7;
        for (let rr = 1; rr <= 6 && dist === 7; rr++) for (let dy = -rr; dy <= rr && dist === 7; dy++) for (let dx = -rr; dx <= rr; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== rr) continue;
          const nx = tx + dx, ny = ty + dy; if (inRoom(nx, ny) && !w.isSolid(nx, ny)) { dist = rr; break; }
        }
        a = Math.min(0.7, (dist - 1) * 0.14);
      }
      const k = (j * N + i) * 4; dd[k + 3] = Math.round(a * 255);
    }
    og.putImageData(img, 0, 0);
    lg.save(); lg.globalCompositeOperation = 'source-atop'; lg.imageSmoothingEnabled = true; lg.drawImage(ov, lx0 * T, ly0 * T, N * T, N * T); lg.restore();
  }
  for (let ty = ly0; ty < ly1; ty++) for (let tx = lx0; tx < lx1; tx++) {
    if (!inRoom(tx, ty)) continue; const t = w.tile(tx, ty);
    if (t === TILE.SOLID || t === TILE.SOLID_NC) drawSolidEdges(lg, w, tx, ty, inRoom);
    else if (t === TILE.BREAK) { drawSolidEdges(lg, w, tx, ty, inRoom); drawBreakable(lg, tx, ty); }
  }
  // rounded corners on organic materials
  for (let ty = ly0; ty < ly1; ty++) for (let tx = lx0; tx < lx1; tx++) {
    if (!inRoom(tx, ty) || w.tile(tx, ty) !== TILE.SOLID) continue;
    if (!ORGANIC[CD.MATS[w.mat(tx, ty)]]) continue;
    const up = w.isSolid(tx, ty - 1) || !inRoom(tx, ty - 1), dn = w.isSolid(tx, ty + 1) || !inRoom(tx, ty + 1), lf = w.isSolid(tx - 1, ty) || !inRoom(tx - 1, ty), rt = w.isSolid(tx + 1, ty) || !inRoom(tx + 1, ty);
    const r = 5 + U.hash2(tx, ty, 3) * 8;
    lg.globalCompositeOperation = 'destination-out';
    if (!up && !lf) notch(lg, tx * T, ty * T, r, 1, 1);
    if (!up && !rt) notch(lg, (tx + 1) * T, ty * T, r, -1, 1);
    if (!dn && !lf) notch(lg, tx * T, (ty + 1) * T, r, 1, -1);
    if (!dn && !rt) notch(lg, (tx + 1) * T, (ty + 1) * T, r, -1, -1);
    lg.globalCompositeOperation = 'source-over';
  }
  // platforms / spikes are thin and drawn on the layer too
  for (let ty = ly0; ty < ly1; ty++) for (let tx = lx0; tx < lx1; tx++) {
    if (!inRoom(tx, ty)) continue; const t = w.tile(tx, ty);
    if (t === TILE.PLAT) drawPlatform(lg, w, tx, ty);
    else if (t === TILE.SPIKE) drawSpikes(lg, tx, ty, false);
    else if (t === TILE.SPIKE_D) drawSpikes(lg, tx, ty, true);
  }
  // soft cast shadow of the terrain onto the back wall / decor, then the terrain itself
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.72)'; g.shadowBlur = 16 * R; g.shadowOffsetX = 3 * R; g.shadowOffsetY = 7 * R;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(L, -M * T * R, -M * T * R);
  g.restore();
  return cv;
};

function notch(g, cx, cy, r, sx, sy) {
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + sx * r, cy); g.quadraticCurveTo(cx + sx * r * 0.28, cy + sy * r * 0.28, cx, cy + sy * r); g.closePath(); g.fill();
}

// ------------------------------------------------------------------ solid edge detailing
function drawSolidEdges(g, w, tx, ty, inRoom) {
  const x = tx * T, y = ty * T;
  const open = (dx, dy) => { const nx = tx + dx, ny = ty + dy; return inRoom(nx, ny) && !w.isSolid(nx, ny); };
  const up = open(0, -1), dn = open(0, 1), lf = open(-1, 0), rt = open(1, 0);
  if (!(up || dn || lf || rt)) return;
  const matName = CD.MATS[w.mat(tx, ty)];
  const h = U.hash2(tx, ty, 9);
  // depth: inward darkening on every exposed side
  const ao = (x0, y0, x1, y1, w0, h0, a) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, w0, h0); };
  if (dn) { const gr = g.createLinearGradient(0, y + T, 0, y + T - 16); gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y + T - 16, T, 16); }
  if (lf) { const gr = g.createLinearGradient(x, 0, x + 12, 0); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, 12, T); }
  if (rt) { const gr = g.createLinearGradient(x + T, 0, x + T - 12, 0); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + T - 12, y, 12, T); }
  void ao;
  if (up) {
    if (matName === 'soil') {
      // sun-baked crust with a ragged lower edge
      const gr = g.createLinearGradient(0, y, 0, y + 9); gr.addColorStop(0, '#b59565'); gr.addColorStop(0.55, '#8a6c44'); gr.addColorStop(1, 'rgba(90,66,40,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i <= 8; i++) g.lineTo(x + i * (T / 8), y + 5 + U.hash2(tx * 8 + i, ty, 5) * 6);
      g.lineTo(x + T, y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,240,200,0.22)'; g.fillRect(x, y, T, 1.5);
    } else if (matName === 'lab' || matName === 'lino') {
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x, y, T, 2); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, y + 2, T, 6);
    } else if (matName === 'asphalt') {
      g.fillStyle = 'rgba(210,205,190,0.18)'; g.fillRect(x, y, T, 2); const gr = g.createLinearGradient(0, y, 0, y + 8); gr.addColorStop(0, 'rgba(180,170,150,0.16)'); gr.addColorStop(1, 'rgba(180,170,150,0)'); g.fillStyle = gr; g.fillRect(x, y, T, 8);
    } else {
      g.fillStyle = 'rgba(255,245,230,0.30)'; g.fillRect(x, y, T, 2); const gr = g.createLinearGradient(0, y + 2, 0, y + 12); gr.addColorStop(0, 'rgba(255,245,230,0.14)'); gr.addColorStop(1, 'rgba(255,245,230,0)'); g.fillStyle = gr; g.fillRect(x, y + 2, T, 10);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, y - 0.5, T, 1);
    }
  }
  // drips / grime under ceilings
  if (dn && h < 0.28 && matName !== 'soil') {
    const dx = x + 6 + h * 100 % 26, len = 6 + (h * 977 % 1) * 18; const gr = g.createLinearGradient(0, y + T - 3, 0, y + T + len);
    gr.addColorStop(0, 'rgba(30,24,16,0.5)'); gr.addColorStop(1, 'rgba(30,24,16,0)'); g.fillStyle = gr; g.fillRect(dx, y + T - 3, 2.5, len);
  }
  // wall side bevel lines
  if (lf) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - 0.5, y, 1, T); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 1, y, 1, T); }
  if (rt) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + T - 0.5, y, 1, T); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x + T - 3, y, 1, T); }
  if (dn) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, y + T - 1, T, 1); }
}

function drawBreakable(g, tx, ty) {
  const x = tx * T, y = ty * T, r = U.RNG(tx * 7349 + ty * 131);
  g.fillStyle = 'rgba(0,0,0,0.20)'; g.fillRect(x, y, T, T);
  g.strokeStyle = 'rgba(8,6,4,0.9)'; g.lineWidth = 1.6; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let k = 0; k < 3; k++) {
    let cx = x + r.range(6, 34), cy = y + r.range(0, 6); g.beginPath(); g.moveTo(cx, cy);
    for (let i = 0; i < 6; i++) { cx += r.range(-8, 8); cy += r.range(5, 9); g.lineTo(cx, cy); }
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,240,220,0.18)'; g.lineWidth = 1; g.strokeRect(x + 3.5, y + 3.5, T - 7, T - 7);
  // rubble specks
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(20,16,12,0.55)'; g.fillRect(x + r.range(2, 36), y + r.range(2, 36), r.range(1, 3), r.range(1, 3)); }
  // subtle warning tint so cracked walls read as special
  g.fillStyle = 'rgba(190,150,90,0.08)'; g.fillRect(x, y, T, T);
}

function drawPlatform(g, w, tx, ty) {
  const x = tx * T, y = ty * T; const reg = (w.roomAtTile(tx, ty) || {}).region;
  const wood = reg === 'rustyard' || reg === 'surface';
  const l = w.tile(tx - 1, ty) === TILE.PLAT, r = w.tile(tx + 1, ty) === TILE.PLAT;
  g.save();
  // drop shadow beneath
  const sh = g.createLinearGradient(0, y + 12, 0, y + 22); sh.addColorStop(0, 'rgba(0,0,0,0.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(x, y + 12, T, 10);
  if (wood) {
    const gr = g.createLinearGradient(0, y, 0, y + 11); gr.addColorStop(0, '#9a7a52'); gr.addColorStop(0.15, '#7a5c3a'); gr.addColorStop(1, '#42301e'); g.fillStyle = gr; g.fillRect(x, y, T, 11);
    g.fillStyle = 'rgba(255,230,190,0.28)'; g.fillRect(x, y, T, 1.5); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, y + 10, T, 1);
    for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x + 4 + i * 13 + U.hash2(tx, ty, i) * 4, y + 2, 1, 8); }
    g.fillStyle = '#2a2622'; g.beginPath(); g.arc(x + 5, y + 5, 1.5, 0, 7); g.arc(x + T - 5, y + 5, 1.5, 0, 7); g.fill();
  } else {
    const gr = g.createLinearGradient(0, y, 0, y + 12); gr.addColorStop(0, '#8b97a3'); gr.addColorStop(0.2, '#56626e'); gr.addColorStop(0.8, '#2a333c'); gr.addColorStop(1, '#151a20'); g.fillStyle = gr; g.fillRect(x, y, T, 12);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, y, T, 1.5);
    // grate holes
    g.fillStyle = 'rgba(0,0,0,0.62)'; for (let i = 0; i < 7; i++) g.fillRect(x + 3 + i * 5.4, y + 4, 3, 5);
    g.fillStyle = 'rgba(0,0,0,0.6)'; if (!l) g.fillRect(x, y, 1.5, 12); if (!r) g.fillRect(x + T - 1.5, y, 1.5, 12);
    g.fillStyle = '#20262c'; g.fillRect(x, y + 10.5, T, 1.5);
  }
  g.restore();
}

function drawSpikes(g, tx, ty, down) {
  const x = tx * T, y = ty * T, r = U.RNG(tx * 911 + ty * 71);
  g.save();
  if (down) { g.translate(x, y); g.scale(1, -1); g.translate(-x, -(y + 0)); g.translate(0, -0); }
  const by = down ? y : y + T; // base line
  const base = down ? y : y + T;
  g.restore();
  g.save();
  const n = 5, sw = T / n;
  // base plate
  g.fillStyle = '#26221f'; g.fillRect(x, down ? y : y + T - 5, T, 5);
  for (let i = 0; i < n; i++) {
    const sx = x + i * sw, h = 22 + r.range(-3, 3), tip = sx + sw / 2 + r.range(-1, 1);
    const y0 = down ? y + 4 : y + T - 4, y1 = down ? y + 4 + h : y + T - 4 - h;
    const gr = g.createLinearGradient(sx, 0, sx + sw, 0); gr.addColorStop(0, '#8a8f93'); gr.addColorStop(0.5, '#4a4f54'); gr.addColorStop(1, '#1e2124');
    g.fillStyle = gr; g.beginPath(); g.moveTo(sx + 1, y0); g.lineTo(tip, y1); g.lineTo(sx + sw - 1, y0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.moveTo(tip, y1); g.lineTo(sx + 2, y0); g.lineTo(sx + 3.4, y0); g.closePath(); g.fill();
    if (r.next() < 0.5) { g.fillStyle = 'rgba(120,52,20,0.55)'; g.beginPath(); g.moveTo(sx + 2, y0); g.lineTo(sx + sw / 2, down ? y0 + h * 0.5 : y0 - h * 0.5); g.lineTo(sx + sw - 2, y0); g.closePath(); g.fill(); }
    if (r.next() < 0.25) { g.fillStyle = 'rgba(90,10,10,0.7)'; g.beginPath(); g.arc(tip, down ? y1 - 3 : y1 + 3, 2, 0, 7); g.fill(); }
  }
  g.restore();
  void by; void base;
}

function drawLadder(g, w, tx, ty) {
  const x = tx * T, y = ty * T, reg = (w.roomAtTile(tx, ty) || {}).region, wood = reg === 'surface' || reg === 'rustyard';
  const c1 = wood ? '#6a4e30' : '#5a636c', c2 = wood ? '#3a2a18' : '#20262c', hi = wood ? 'rgba(255,225,180,0.3)' : 'rgba(255,255,255,0.4)';
  const rx0 = x + 8, rx1 = x + T - 12;
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(rx0 + 2, y, 5, T); g.fillRect(rx1 + 2, y, 5, T);
  for (const rx of [rx0, rx1]) { const gr = g.createLinearGradient(rx, 0, rx + 5, 0); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(rx, y, 4.5, T); g.fillStyle = hi; g.fillRect(rx, y, 1, T); }
  for (let i = 0; i < 4; i++) {
    const ry = y + 4 + i * 10; g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(rx0 + 4, ry + 1.5, rx1 - rx0 - 3, 4);
    const gr = g.createLinearGradient(0, ry, 0, ry + 4); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(rx0 + 4, ry, rx1 - rx0 - 3, 3.6); g.fillStyle = hi; g.fillRect(rx0 + 4, ry, rx1 - rx0 - 3, 1);
  }
  g.restore();
}

CD.drawLadderTile = drawLadder;

})();
