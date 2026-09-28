// Procedural, seamless material textures. Everything is generated at runtime - no external art assets.
(function () {
'use strict';
const CD = window.CD, U = CD.U;
const S = 480;   // texture size (12 tiles) - divisible by 40/20/10 so patterns align with the tile grid
const TEX = (CD.tex = { SIZE: S, cache: {}, gens: {}, recipes: {} });

function mk(size) { size = size || S; const c = U.canvas(size, size); return { c, g: c.getContext('2d'), size }; }
const c255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
function wrap(g, fn) { for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { g.save(); g.translate(ox * S, oy * S); fn(ox, oy); g.restore(); } }

// ---- shared feature painters (all wrap so textures stay seamless) ----
function cracks(g, rng, n, o) {
  o = Object.assign({ len: [50, 200], w: 1.2, col: 'rgba(12,10,8,0.85)', hi: 'rgba(255,255,255,0.10)', branch: 0.12, jitter: 0.55 }, o || {});
  for (let k = 0; k < n; k++) {
    const segs = [];
    (function walk(x, y, a, l, w, depth) {
      const pts = [[x, y]]; let cx = x, cy = y, ca = a; const step = 6;
      for (let d = 0; d < l; d += step) {
        ca += (rng.next() - 0.5) * o.jitter; cx += Math.cos(ca) * step; cy += Math.sin(ca) * step; pts.push([cx, cy]);
        if (depth < 2 && rng.next() < o.branch * step / 20) walk(cx, cy, ca + (rng.next() < 0.5 ? -1 : 1) * rng.range(0.4, 1.1), l * 0.5, w * 0.7, depth + 1);
      }
      segs.push({ pts, w });
    })(rng.range(0, S), rng.range(0, S), rng.range(0, Math.PI * 2), rng.range(o.len[0], o.len[1]), o.w, 0);
    wrap(g, () => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const s of segs) {
        g.strokeStyle = o.hi; g.lineWidth = s.w; g.beginPath(); s.pts.forEach((p, i) => (i ? g.lineTo(p[0] + 1, p[1] + 1) : g.moveTo(p[0] + 1, p[1] + 1))); g.stroke();
        g.strokeStyle = o.col; g.lineWidth = s.w; g.beginPath(); s.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      }
    });
  }
}
function streaks(g, rng, n, o) {
  o = Object.assign({ rgb: '30,22,14', a: 0.28, len: [40, 200], w: [2, 9] }, o || {});
  for (let k = 0; k < n; k++) {
    const x = rng.range(0, S), y = rng.range(0, S), len = rng.range(o.len[0], o.len[1]), w = rng.range(o.w[0], o.w[1]);
    wrap(g, () => {
      const gr = g.createLinearGradient(0, y, 0, y + len);
      gr.addColorStop(0, 'rgba(' + o.rgb + ',0)'); gr.addColorStop(0.12, 'rgba(' + o.rgb + ',' + o.a + ')'); gr.addColorStop(1, 'rgba(' + o.rgb + ',0)');
      g.fillStyle = gr;
      g.fillRect(x - w / 2, y, w, len);
      // ragged edges
      for (let i = 0; i < 3; i++) g.fillRect(x - w / 2 + rng.range(-w, w), y + rng.range(0, len * 0.4), rng.range(0.5, 1.5), len * rng.range(0.2, 0.8));
    });
  }
}
function speckles(g, rng, n, o) {
  o = Object.assign({ light: 'rgba(255,255,255,0.16)', dark: 'rgba(0,0,0,0.22)', size: [0.6, 1.8] }, o || {});
  for (let i = 0; i < n; i++) {
    const x = rng.range(0, S), y = rng.range(0, S), r = rng.range(o.size[0], o.size[1]);
    g.fillStyle = rng.next() < 0.5 ? o.light : o.dark; g.fillRect(x, y, r, r);
  }
}
function scratches(g, rng, n, o) {
  o = Object.assign({ col: 'rgba(255,255,255,0.13)', len: [8, 40], w: 0.7 }, o || {});
  g.lineWidth = o.w; g.strokeStyle = o.col;
  for (let i = 0; i < n; i++) {
    const x = rng.range(0, S), y = rng.range(0, S), a = rng.range(-0.5, 0.5) + (rng.next() < 0.5 ? 0 : Math.PI / 2), l = rng.range(o.len[0], o.len[1]);
    wrap(g, () => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
  }
}
function bolt(g, x, y, r, base) {
  base = base || [110, 110, 112];
  wrap(g, () => {
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(x + 0.9, y + 1.2, r + 0.6, 0, 7); g.fill();
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, 0.2, x, y, r);
    gr.addColorStop(0, U.rgb(U.shade(base, 1.6))); gr.addColorStop(0.55, U.rgb(base)); gr.addColorStop(1, U.rgb(U.shade(base, 0.45)));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  });
}
function blotch(g, rng, n, o) {   // soft dark/light blotches (water damage, dirt)
  o = Object.assign({ rgb: '0,0,0', a: 0.12, r: [20, 70] }, o || {});
  for (let i = 0; i < n; i++) {
    const x = rng.range(0, S), y = rng.range(0, S), r = rng.range(o.r[0], o.r[1]);
    wrap(g, () => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + o.rgb + ',' + o.a + ')'); gr.addColorStop(1, 'rgba(' + o.rgb + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); });
  }
}
// pixel pass: fn(i, out[3]) sets colour from field values
function paint(g, fn) {
  const img = g.createImageData(S, S), d = img.data, out = [0, 0, 0];
  for (let i = 0, n = S * S; i < n; i++) { fn(i, out, i % S, (i / S) | 0); const j = i * 4; d[j] = c255(out[0]); d[j + 1] = c255(out[1]); d[j + 2] = c255(out[2]); d[j + 3] = 255; }
  g.putImageData(img, 0, 0);
}
function dim(canvas, mult, tint, sat) {  // darken / tint / desaturate a copy - used for back walls
  const r = mk(); r.g.drawImage(canvas, 0, 0);
  const img = r.g.getImageData(0, 0, S, S), d = img.data, t = tint || [1, 1, 1], k = sat === undefined ? 1 : sat;
  for (let i = 0; i < d.length; i += 4) {
    const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    d[i] = c255((l + (d[i] - l) * k) * mult * t[0]); d[i + 1] = c255((l + (d[i + 1] - l) * k) * mult * t[1]); d[i + 2] = c255((l + (d[i + 2] - l) * k) * mult * t[2]);
  }
  r.g.putImageData(img, 0, 0);
  return r.c;
}

// ================= FOREGROUND MATERIALS =================
const G = TEX.gens;

G.concrete = function (seed, o) {
  o = Object.assign({ base: [126, 121, 113], seams: true, cracks: 5, stains: 12, warm: 1 }, o || {});
  const { c, g } = mk(), rng = U.RNG(seed);
  const f1 = U.fbmField(S, S, 3, 5, seed), f2 = U.noiseField(S, S, 44, 44, seed + 7), f3 = U.noiseField(S, S, 150, 150, seed + 9), f4 = U.noiseField(S, S, 5, 5, seed + 13);
  const b = o.base;
  paint(g, (i, out) => {
    let v = 0.62 + (f1[i] - 0.5) * 0.6 + (f2[i] - 0.5) * 0.22 + (f3[i] - 0.5) * 0.2 + (rng.next() - 0.5) * 0.08;
    if (f4[i] > 0.6) v *= 0.84;
    out[0] = b[0] * v * (1 + 0.04 * o.warm); out[1] = b[1] * v; out[2] = b[2] * v * (1 - 0.05 * o.warm);
  });
  if (o.seams) {
    for (let y = 0; y < S; y += 160) { g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(0, y, S, 2); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, y + 2, S, 1); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y - 3, S, 3); }
    for (let r = 0; r < 3; r++) { const off = (r % 2) * 80; for (let x = off; x < S + off; x += 240) { const xx = x % S; g.fillStyle = 'rgba(0,0,0,0.36)'; g.fillRect(xx, r * 160 + 2, 2, 158); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(xx + 2, r * 160 + 2, 1, 158); } }
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) { const x = 40 + k * 160 + (r % 2) * 80, y = r * 160 + 80; bolt(g, x % S, y, 4.5, [44, 42, 40]); }
  }
  blotch(g, rng, 14, { rgb: '20,16,10', a: 0.16 });
  speckles(g, rng, 1600);
  for (let i = 0; i < 160; i++) { const x = rng.range(0, S), y = rng.range(0, S), r = rng.range(1, 2.6); g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 0.8; g.beginPath(); g.arc(x + 0.5, y + 0.7, r, 0.2, 2.6); g.stroke(); }
  streaks(g, rng, o.stains, { rgb: '38,30,20', a: 0.26 });
  cracks(g, rng, o.cracks);
  return c;
};

G.vault = function (seed, o) {
  o = Object.assign({ base: [72, 90, 108], panel: 80, chips: true }, o || {});
  const { c, g } = mk(), rng = U.RNG(seed), P = o.panel, b = o.base;
  const grain = U.noiseField(S, S, 180, 8, seed + 3), f1 = U.fbmField(S, S, 4, 4, seed), f2 = U.noiseField(S, S, 120, 120, seed + 5);
  const n = S / P; const tone = []; for (let i = 0; i < n * n; i++) tone.push(0.94 + rng.next() * 0.12);
  paint(g, (i, out, x, y) => {
    const t = tone[((y / P) | 0) * n + ((x / P) | 0)];
    const v = t * (0.86 + (f1[i] - 0.5) * 0.25 + (grain[i] - 0.5) * 0.13 + (f2[i] - 0.5) * 0.06);
    out[0] = b[0] * v; out[1] = b[1] * v; out[2] = b[2] * v;
  });
  for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
    const x = px * P, y = py * P;
    // inner recessed bevel
    g.fillStyle = 'rgba(0,0,0,0.30)'; g.fillRect(x, y, P, 3); g.fillRect(x, y, 3, P);
    g.fillStyle = 'rgba(190,215,240,0.24)'; g.fillRect(x + 3, y + P - 4, P - 3, 2); g.fillRect(x + P - 4, y + 3, 2, P - 3);
    g.fillStyle = 'rgba(190,215,240,0.16)'; g.fillRect(x + 3, y + 3, P - 6, 1); g.fillRect(x + 3, y + 3, 1, P - 6);
    g.fillStyle = 'rgba(8,12,18,0.7)'; g.fillRect(x, y, P, 1.5); g.fillRect(x, y, 1.5, P);
    // horizontal rib
    if (((px * 7 + py * 3) % 5) < 2) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 8, y + P * 0.5, P - 16, 2); g.fillStyle = 'rgba(190,215,240,0.18)'; g.fillRect(x + 8, y + P * 0.5 + 2, P - 16, 1); }
    // rivets
    const m = Math.min(8, P / 6);
    bolt(g, x + m, y + m, 2.4, [120, 132, 145]); bolt(g, x + P - m, y + m, 2.4, [120, 132, 145]); bolt(g, x + m, y + P - m, 2.4, [120, 132, 145]); bolt(g, x + P - m, y + P - m, 2.4, [120, 132, 145]);
  }
  // chipped paint near seams
  if (o.chips) {
    const ch = U.noiseField(S, S, 60, 60, seed + 21); const img = g.getImageData(0, 0, S, S), d = img.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x; const ex = Math.min(x % P, P - (x % P)), ey = Math.min(y % P, P - (y % P)); const e = Math.min(ex, ey);
      if (e < 7 && ch[i] > 0.71 - (7 - e) * 0.008) { const j = i * 4; const rust = ch[i] > 0.8; d[j] = rust ? 96 : 44; d[j + 1] = rust ? 62 : 50; d[j + 2] = rust ? 44 : 58; }
    }
    g.putImageData(img, 0, 0);
  }
  streaks(g, rng, 14, { rgb: '10,14,18', a: 0.34, w: [2, 12] });
  streaks(g, rng, 5, { rgb: '120,60,20', a: 0.22, w: [2, 6] });
  scratches(g, rng, 90);
  speckles(g, rng, 500, { light: 'rgba(255,255,255,0.12)' });
  return c;
};

G.brick = function (seed, o) {
  o = Object.assign({ base: [138, 74, 56], mortar: [156, 148, 136], bw: 40, bh: 20 }, o || {});
  const { c, g } = mk(), rng = U.RNG(seed), bw = o.bw, bh = o.bh, m = 2;
  g.fillStyle = U.rgb(o.mortar); g.fillRect(0, 0, S, S);
  const rows = S / bh, cols = S / bw;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols + 1; k++) {
    const x = k * bw + (r % 2 ? bw / 2 : 0) - (r % 2 ? 0 : 0), y = r * bh; const v = 0.78 + rng.next() * 0.4; const hue = rng.range(-14, 14);
    const cc = [o.base[0] * v + hue, o.base[1] * v + hue * 0.3, o.base[2] * v - hue * 0.2];
    for (const xx of [x, x - S]) {
      g.fillStyle = U.rgb(cc); g.fillRect(xx + m / 2, y + m / 2, bw - m, bh - m);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(xx + m / 2, y + m / 2, bw - m, 1.5);
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(xx + m / 2, y + bh - m / 2 - 2, bw - m, 2);
      if (rng.next() < 0.18) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(xx + rng.range(2, bw - 8), y + rng.range(2, bh - 8), rng.range(3, 9), rng.range(2, 6)); }
    }
  }
  const f1 = U.noiseField(S, S, 100, 100, seed + 3), f2 = U.fbmField(S, S, 4, 4, seed + 5);
  const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < S * S; i++) { const v = 0.85 + (f1[i] - 0.5) * 0.35 + (f2[i] - 0.5) * 0.3; const j = i * 4; d[j] = c255(d[j] * v); d[j + 1] = c255(d[j + 1] * v); d[j + 2] = c255(d[j + 2] * v); }
  g.putImageData(img, 0, 0);
  streaks(g, rng, 16, { rgb: '15,12,10', a: 0.3, w: [3, 14] });
  blotch(g, rng, 10, { rgb: '10,8,6', a: 0.16, r: [30, 80] });
  cracks(g, rng, 3, { col: 'rgba(15,10,8,0.8)' });
  speckles(g, rng, 900);
  return c;
};

G.rock = function (seed, o) {
  o = Object.assign({ base: [82, 76, 70], strata: 1 }, o || {});
  const { c, g } = mk(), rng = U.RNG(seed), b = o.base;
  const wob = U.fbmField(S, S, 3, 3, seed + 1), det = U.fbmField(S, S, 8, 5, seed + 3), fine = U.noiseField(S, S, 220, 220, seed + 5), mott = U.noiseField(S, S, 6, 6, seed + 7);
  // sedimentary bands with uneven thickness and wavy edges
  const bands = []; let yy = 0;
  while (yy < S) { const th = Math.min(S - yy, Math.round(rng.range(16, 52))); bands.push({ y: yy, h: th, tone: rng.range(0.72, 1.22), warm: rng.range(-0.06, 0.08) }); yy += th; }
  const rowBand = new Int16Array(S * S);
  for (let x = 0; x < S; x++) for (let y = 0; y < S; y++) {
    const w = (wob[y * S + x] - 0.5) * 22; let yw = y + w; yw = ((yw % S) + S) % S;
    let lo = 0, hi = bands.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (bands[m].y <= yw) lo = m; else hi = m - 1; }
    rowBand[y * S + x] = lo;
  }
  paint(g, (i, out) => {
    const bd = bands[rowBand[i]];
    let v = bd.tone * (0.62 + (det[i] - 0.5) * 0.55 + (mott[i] - 0.5) * 0.3 + (fine[i] - 0.5) * 0.3);
    // edge lines between bands: darken where band index changes above/below
    const up = i >= S ? rowBand[i - S] : rowBand[i + S * (S - 1)], dn = i < S * (S - 1) ? rowBand[i + S] : rowBand[i - S * (S - 1)];
    if (up !== rowBand[i]) v *= 0.45; else if (dn !== rowBand[i]) v *= 1.22;
    out[0] = b[0] * v * (1 + bd.warm); out[1] = b[1] * v; out[2] = b[2] * v * (1 - bd.warm * 0.8);
  });
  // vertical fractures inside bands
  for (let k = 0; k < 40; k++) {
    const bd = rng.pick(bands), x0 = rng.range(0, S); let x = x0, y = bd.y + rng.range(0, bd.h * 0.3);
    wrap(g, () => { g.strokeStyle = 'rgba(6,5,4,0.75)'; g.lineWidth = rng.range(1, 2); g.beginPath(); g.moveTo(x, y); let cx = x, cy = y; for (let d = 0; d < bd.h; d += 5) { cx += rng.range(-2.5, 2.5); cy += 5; g.lineTo(cx, cy); } g.stroke(); });
  }
  cracks(g, rng, 6, { len: [40, 120], w: 1.5, col: 'rgba(8,7,6,0.8)', hi: 'rgba(255,240,220,0.12)', jitter: 0.9, branch: 0.2 });
  for (let i = 0; i < 20; i++) {
    const x = rng.range(0, S), y = rng.range(0, S), rx = rng.range(2, 6), ry = rx * rng.range(0.5, 0.8);
    wrap(g, () => { g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(x + 0.6, y + 1.2, rx + 1, ry + 1, 0, 0, 7); g.fill(); g.fillStyle = U.rgb(U.shade(b, rng.range(0.5, 0.85))); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); });
  }
  streaks(g, rng, 12, { rgb: '5,5,6', a: 0.3, w: [3, 16] });
  speckles(g, rng, 1400);
  return c;
};

G.scrap = function (seed) {
  const { c, g } = mk(), rng = U.RNG(seed);
  g.fillStyle = '#17110c'; g.fillRect(0, 0, S, S);
  const pal = [[132, 66, 42], [58, 84, 104], [86, 96, 60], [148, 124, 88], [104, 104, 102], [162, 156, 138], [120, 44, 36], [64, 70, 74]];
  const rowsH = [80, 40, 80, 60, 40, 80, 40, 60]; // sums to 480
  let y = 0;
  for (const rh of rowsH) {
    let x = -rng.range(0, 60);
    while (x < S) {
      const w = rng.pick([80, 120, 160]); const col = rng.pick(pal); const v = rng.range(0.82, 1.15);
      const base = [col[0] * v, col[1] * v, col[2] * v];
      for (const xx of [x, x - S]) {
        // drop shadow of overlapping sheet
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(xx + 2, y + 3, w, rh);
        g.fillStyle = U.rgb(base); g.fillRect(xx, y, w - 1, rh - 1);
        // corrugation: vertical ridges
        for (let k = 0; k < w; k += 10) { const gr = g.createLinearGradient(xx + k, 0, xx + k + 10, 0); gr.addColorStop(0, 'rgba(255,255,255,0.13)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.0)'); gr.addColorStop(1, 'rgba(0,0,0,0.24)'); g.fillStyle = gr; g.fillRect(xx + k, y, 10, rh - 1); }
        g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(xx, y, w - 1, 1.5);
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(xx, y + rh - 3, w - 1, 2);
        bolt(g, xx + 7, y + 7, 2.4, [130, 120, 108]); bolt(g, xx + w - 9, y + 7, 2.4, [130, 120, 108]);
        if (rh > 40) { bolt(g, xx + 7, y + rh - 9, 2.4, [130, 120, 108]); bolt(g, xx + w - 9, y + rh - 9, 2.4, [130, 120, 108]); }
        if (rng.next() < 0.22) { g.fillStyle = 'rgba(232,220,190,0.55)'; g.fillRect(xx + w * 0.2, y + rh * 0.4, w * 0.5, 4); }   // painted stripe
      }
      x += w;
    }
    y += rh;
  }
  // rust patches
  const rf = U.fbmField(S, S, 5, 4, seed + 4); const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < S * S; i++) { if (rf[i] > 0.57) { const t = Math.min(1, (rf[i] - 0.57) * 5); const j = i * 4; d[j] = d[j] * (1 - t * 0.55) + 128 * t * 0.55; d[j + 1] = d[j + 1] * (1 - t * 0.55) + 62 * t * 0.55; d[j + 2] = d[j + 2] * (1 - t * 0.55) + 30 * t * 0.55; } }
  g.putImageData(img, 0, 0);
  streaks(g, rng, 24, { rgb: '90,40,16', a: 0.3, w: [2, 8] }); streaks(g, rng, 10, { rgb: '5,5,5', a: 0.3 });
  scratches(g, rng, 60); speckles(g, rng, 700);
  return c;
};

G.rust = function (seed) {
  const { c, g } = mk(), rng = U.RNG(seed);
  const f1 = U.fbmField(S, S, 4, 5, seed), f2 = U.noiseField(S, S, 130, 130, seed + 2), rn = U.fbmField(S, S, 9, 5, seed + 4), rn2 = U.noiseField(S, S, 90, 90, seed + 8);
  paint(g, (i, out, x, y) => {
    const corr = Math.sin((x / 10) * Math.PI) * 0.5 + 0.5;
    let v = 0.52 + (f1[i] - 0.5) * 0.5 + (f2[i] - 0.5) * 0.14 + (corr - 0.5) * 0.24;
    const r = rn[i] * 0.85 + rn2[i] * 0.15;
    const t = U.smoothstep(0.46, 0.66, r);
    const sr = 78 * v * 1.3, sg = 82 * v * 1.3, sb = 86 * v * 1.3;                 // bare steel
    const rr = 150 * v * (0.85 + rn2[i] * 0.4), rg = 78 * v * (0.85 + rn2[i] * 0.4), rb = 38 * v;   // rust
    out[0] = sr + (rr - sr) * t; out[1] = sg + (rg - sg) * t; out[2] = sb + (rb - sb) * t;
  });
  for (let y = 0; y < S; y += 120) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, y, S, 2.5); g.fillStyle = 'rgba(255,220,180,0.13)'; g.fillRect(0, y + 2.5, S, 1.5); }
  for (let y = 0; y < S; y += 120) for (let x = 20; x < S; x += 60) { bolt(g, x, y + 12, 2.8, [116, 96, 80]); bolt(g, x, y + 108, 2.8, [116, 96, 80]); }
  streaks(g, rng, 22, { rgb: '70,30,10', a: 0.34, w: [2, 9] }); streaks(g, rng, 10, { rgb: '5,5,5', a: 0.3 });
  cracks(g, rng, 2); scratches(g, rng, 60); speckles(g, rng, 900);
  return c;
};

G.soil = function (seed, o) {
  o = Object.assign({ base: [108, 82, 56] }, o || {});
  const { c, g } = mk(), rng = U.RNG(seed), b = o.base;
  const f1 = U.fbmField(S, S, 3, 5, seed), st = U.fbmField(S, S, 2, 3, seed + 2, 0.5, 6), f2 = U.noiseField(S, S, 170, 170, seed + 6);
  paint(g, (i, out) => { const v = 0.62 + (f1[i] - 0.5) * 0.6 + (st[i] - 0.5) * 0.25 + (f2[i] - 0.5) * 0.3; out[0] = b[0] * v * 1.05; out[1] = b[1] * v; out[2] = b[2] * v * 0.92; });
  for (let i = 0; i < 260; i++) {   // pebbles
    const x = rng.range(0, S), y = rng.range(0, S), r = rng.range(1.5, 5), t = rng.range(0.6, 1.4);
    wrap(g, () => { g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(x + 0.7, y + 1.2, r + 0.5, r * 0.75 + 0.5, 0, 0, 7); g.fill(); g.fillStyle = U.rgb(U.shade([120, 108, 92], t)); g.beginPath(); g.ellipse(x, y, r, r * 0.75, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.25, r * 0.5, r * 0.3, 0, 0, 7); g.fill(); });
  }
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {   // roots
    let x = rng.range(0, S), y = rng.range(0, S), a = rng.range(0, 6.28); const l = rng.range(30, 120);
    wrap(g, () => { g.strokeStyle = 'rgba(38,26,14,0.75)'; g.lineWidth = rng.range(0.8, 2.2); g.beginPath(); let xx = x, yy = y, aa = a; g.moveTo(xx, yy); for (let d = 0; d < l; d += 5) { aa += (0.5 - ((d * 13 + i * 7) % 10) / 10) * 0.7; xx += Math.cos(aa) * 5; yy += Math.sin(aa) * 5; g.lineTo(xx, yy); } g.stroke(); });
  }
  blotch(g, rng, 14, { rgb: '20,12,6', a: 0.2 }); speckles(g, rng, 1600, { light: 'rgba(255,235,200,0.16)' });
  return c;
};

G.asphalt = function (seed) {
  const { c, g } = mk(), rng = U.RNG(seed);
  const f1 = U.fbmField(S, S, 4, 4, seed), f2 = U.noiseField(S, S, 240, 240, seed + 3), f3 = U.noiseField(S, S, 6, 6, seed + 5);
  paint(g, (i, out) => { let v = 0.5 + (f1[i] - 0.5) * 0.35 + (f2[i] - 0.5) * 0.32; if (f3[i] > 0.62) v *= 0.8; out[0] = 66 * v * 1.2; out[1] = 66 * v * 1.2; out[2] = 70 * v * 1.2; });
  for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,' + rng.range(0.08, 0.16) + ')'; g.fillRect(rng.range(0, S - 120), rng.range(0, S - 80), rng.range(60, 160), rng.range(30, 90)); }
  for (let i = 0; i < 1800; i++) { g.fillStyle = rng.next() < 0.5 ? 'rgba(210,205,195,0.24)' : 'rgba(0,0,0,0.3)'; const r = rng.range(0.6, 1.9); g.fillRect(rng.range(0, S), rng.range(0, S), r, r); }
  cracks(g, rng, 9, { len: [60, 240], w: 1.6, col: 'rgba(6,6,6,0.9)', hi: 'rgba(255,255,255,0.08)', jitter: 0.8 });
  blotch(g, rng, 8, { rgb: '0,0,0', a: 0.28, r: [12, 34] });
  return c;
};

G.lino = function (seed) {   // 1950s diner checker
  const { c, g } = mk(), rng = U.RNG(seed), q = 20;
  for (let y = 0; y < S / q; y++) for (let x = 0; x < S / q; x++) {
    const dark = (x + y) % 2 === 0; const v = rng.range(0.92, 1.08);
    g.fillStyle = dark ? U.rgb([30 * v, 30 * v, 34 * v]) : U.rgb([206 * v, 198 * v, 176 * v]); g.fillRect(x * q, y * q, q, q);
    const gr = g.createLinearGradient(x * q, y * q, x * q + q, y * q + q); gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = gr; g.fillRect(x * q, y * q, q, q);
  }
  g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i <= S; i += q) { g.fillRect(i, 0, 1, S); g.fillRect(0, i, S, 1); }
  const f1 = U.fbmField(S, S, 4, 4, seed); const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < S * S; i++) { const v = 0.78 + f1[i] * 0.34; const j = i * 4; d[j] = c255(d[j] * v); d[j + 1] = c255(d[j + 1] * v * 0.98); d[j + 2] = c255(d[j + 2] * v * 0.94); }
  g.putImageData(img, 0, 0);
  blotch(g, rng, 16, { rgb: '30,20,10', a: 0.2 }); scratches(g, rng, 90, { col: 'rgba(255,255,255,0.18)' }); cracks(g, rng, 3);
  return c;
};

G.wood = function (seed, o) {
  o = Object.assign({ base: [112, 84, 56], pw: 20 }, o || {});
  const { c, g } = mk(), rng = U.RNG(seed), pw = o.pw, b = o.base;
  const grain = U.noiseField(S, S, S / 4, 5, seed), f1 = U.fbmField(S, S, 3, 4, seed + 4);
  const n = S / pw; const tone = []; for (let i = 0; i < n; i++) tone.push(rng.range(0.78, 1.18));
  paint(g, (i, out, x) => { const t = tone[(x / pw) | 0]; const v = t * (0.7 + (grain[i] - 0.5) * 0.5 + (f1[i] - 0.5) * 0.35); out[0] = b[0] * v; out[1] = b[1] * v; out[2] = b[2] * v * 0.95; });
  for (let i = 0; i < n; i++) {
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(i * pw, 0, 1.5, S); g.fillStyle = 'rgba(255,230,190,0.13)'; g.fillRect(i * pw + 1.5, 0, 1, S);
    for (let k = 0; k < 2; k++) { const y = rng.range(20, S - 20); const gr = g.createLinearGradient(0, y, 0, y + 1); void gr; }
    for (let k = 0; k < 4; k++) if (rng.next() < 0.5) { const y = rng.range(0, S), h = rng.range(2, 8); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(i * pw, y, pw, 1); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(i * pw, y + 1, pw, h); }
  }
  for (let i = 0; i < 16; i++) {   // knots
    const x = rng.range(pw, S - pw), y = rng.range(0, S), r = rng.range(2.5, 5.5);
    wrap(g, () => { for (let k = 3; k >= 0; k--) { g.fillStyle = 'rgba(30,18,8,' + (0.18 + 0.12 * (3 - k)) + ')'; g.beginPath(); g.ellipse(x, y, r + k * 2.2, (r + k * 2.2) * 1.8, 0, 0, 7); g.fill(); } });
  }
  for (let y = 40; y < S; y += 120) for (let i = 0; i < n; i++) { bolt(g, i * pw + pw / 2, y, 1.7, [60, 58, 56]); }
  streaks(g, rng, 12, { rgb: '20,14,8', a: 0.3 }); scratches(g, rng, 60, { col: 'rgba(255,220,180,0.10)' }); speckles(g, rng, 500);
  return c;
};

G.lab = function (seed) {   // sterile deep-vault panels
  const { c, g } = mk(), rng = U.RNG(seed);
  const f1 = U.fbmField(S, S, 4, 3, seed), f2 = U.noiseField(S, S, 200, 200, seed + 2);
  paint(g, (i, out) => { const v = 0.9 + (f1[i] - 0.5) * 0.12 + (f2[i] - 0.5) * 0.04; out[0] = 176 * v; out[1] = 190 * v; out[2] = 194 * v; });
  for (let y = 0; y < S; y += 40) for (let x = 0; x < S; x += 40) {
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, y, 40, 1.5); g.fillRect(x, y, 1.5, 40);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 1.5, y + 1.5, 38, 1); g.fillRect(x + 1.5, y + 1.5, 1, 38);
    g.fillStyle = 'rgba(0,30,40,0.10)'; g.fillRect(x + 37, y + 2, 2, 38); g.fillRect(x + 2, y + 37, 38, 2);
    if (rng.next() < 0.1) { g.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 0; k < 5; k++) g.fillRect(x + 8, y + 10 + k * 4, 24, 1.5); }   // vent slats
    if (rng.next() < 0.25) bolt(g, x + 5, y + 5, 1.6, [150, 150, 150]);
  }
  streaks(g, rng, 8, { rgb: '30,50,40', a: 0.2 }); blotch(g, rng, 10, { rgb: '10,40,40', a: 0.14 }); scratches(g, rng, 60, { col: 'rgba(0,0,0,0.12)' });
  return c;
};

G.redrock = function (seed) {
  return G.rock(seed, { base: [150, 92, 62], strata: 1.2 });
};

G.subway = function (seed) {   // glossy wall tile, used for metro tunnels
  const { c, g } = mk(), rng = U.RNG(seed), tw = 20, th = 10;
  g.fillStyle = '#4c4a42'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S / th; y++) for (let x = 0; x < S / tw; x++) {
    const v = rng.range(0.86, 1.08); const band = (Math.floor(y / 6) % 4 === 2);
    const col = band ? [42 * v, 104 * v, 96 * v] : [192 * v, 190 * v, 172 * v];
    g.fillStyle = U.rgb(col); g.fillRect(x * tw + 0.5, y * th + 0.5, tw - 1, th - 1);
    const gr = g.createLinearGradient(0, y * th, 0, y * th + th); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.02)'); gr.addColorStop(1, 'rgba(0,0,0,0.20)'); g.fillStyle = gr; g.fillRect(x * tw + 0.5, y * th + 0.5, tw - 1, th - 1);
    if (rng.next() < 0.02) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x * tw + 0.5, y * th + 0.5, tw - 1, th - 1); }
  }
  const f1 = U.fbmField(S, S, 4, 4, seed); const img = g.getImageData(0, 0, S, S), d = img.data;
  for (let i = 0; i < S * S; i++) { const v = 0.55 + f1[i] * 0.6; const j = i * 4; d[j] = c255(d[j] * v); d[j + 1] = c255(d[j + 1] * v); d[j + 2] = c255(d[j + 2] * v); }
  g.putImageData(img, 0, 0);
  streaks(g, rng, 26, { rgb: '30,24,14', a: 0.36, w: [3, 12] }); cracks(g, rng, 5);
  return c;
};

// ================= REGISTRY =================
// name -> generator recipe. bw_* are back-wall variants (darker, quieter, different scale).
const R = TEX.recipes;
R.vault = () => G.vault(11);
R.concrete = () => G.concrete(22);
R.brick = () => G.brick(33);
R.rock = () => G.rock(44);
R.scrap = () => G.scrap(55);
R.rust = () => G.rust(66);
R.soil = () => G.soil(77);
R.asphalt = () => G.asphalt(88);
R.lino = () => G.lino(99);
R.wood = () => G.wood(101);
R.lab = () => G.lab(112);
R.redrock = () => G.redrock(123);
R.subway = () => G.subway(134);
R.bw_vault = () => dim(G.vault(211, { panel: 160, base: [56, 74, 94], chips: false }), 0.5, [0.86, 1.0, 1.12], 0.75);
R.bw_concrete = () => dim(G.concrete(222, { base: [112, 108, 100], cracks: 3 }), 0.44, [1, 0.98, 0.94], 0.7);
R.bw_brick = () => dim(G.brick(233, { base: [120, 66, 52], mortar: [120, 114, 104] }), 0.46, [1, 0.94, 0.9], 0.8);
R.bw_rock = () => dim(G.rock(244, { base: [66, 62, 58] }), 0.5, [0.92, 0.95, 1.05], 0.6);
R.bw_scrap = () => dim(G.scrap(255), 0.4, [1, 0.92, 0.85], 0.7);
R.bw_rust = () => dim(G.rust(266), 0.42, [1, 0.94, 0.9], 0.7);
R.bw_lab = () => dim(G.lab(277), 0.62, [0.85, 1.0, 1.05], 0.5);
R.bw_wood = () => dim(G.wood(288, { base: [96, 72, 50], pw: 40 }), 0.5, [1, 0.94, 0.88], 0.8);
R.bw_diner = () => dim(G.subway(299), 0.55, [1, 0.96, 0.9], 0.7);
R.bw_tunnel = () => dim(G.subway(311), 0.46, [0.9, 1.0, 1.0], 0.7);
R.bw_redrock = () => dim(G.redrock(322), 0.46, [1, 0.95, 0.95], 0.8);

// per-material exposure: albedo multiplier so lit surfaces read at a sensible brightness
TEX.exposure = { soil: 1.4, asphalt: 1.35, concrete: 1.25, rock: 1.35, redrock: 1.25, scrap: 1.15, rust: 1.3, vault: 1.15, brick: 1.15, wood: 1.25, subway: 1.0, lab: 1.0, lino: 1.0,
  bw_vault: 1.35, bw_concrete: 1.3, bw_brick: 1.3, bw_rock: 1.5, bw_scrap: 1.4, bw_rust: 1.4, bw_lab: 1.1, bw_wood: 1.3, bw_diner: 1.2, bw_tunnel: 1.35, bw_redrock: 1.4 };
function expose(c, k) {
  if (!k || k === 1) return c;
  const g = c.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = c255(d[i] * k); d[i + 1] = c255(d[i + 1] * k); d[i + 2] = c255(d[i + 2] * k); }
  g.putImageData(img, 0, 0); return c;
}
TEX.get = function (name) {
  let t = TEX.cache[name];
  if (!t) {
    const r = R[name]; if (!r) throw new Error('unknown texture ' + name);
    t = TEX.cache[name] = expose(r(), TEX.exposure[name]);
  }
  return t;
};
TEX.prewarm = function (names, cb) {   // async, yields to keep the boot bar moving
  let i = 0;
  return new Promise((res) => {
    (function step() {
      if (i >= names.length) return res();
      TEX.get(names[i]); i++; if (cb) cb(i / names.length);
      setTimeout(step, 0);
    })();
  });
};

// ---- shared small sprites ----
TEX.sprite = {};
TEX.makeGlow = function (size) {   // white radial falloff used for light halos / bloom (tinted via composite)
  const { c, g } = U.makeCanvas(size, size); const r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.65)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.22)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
};
TEX.makeGrain = function (size) {
  const { c, g } = U.makeCanvas(size, size); const img = g.createImageData(size, size), d = img.data, r = U.RNG(4242);
  for (let i = 0; i < size * size; i++) { const v = 128 + (r.next() - 0.5) * 120; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
};

})();
