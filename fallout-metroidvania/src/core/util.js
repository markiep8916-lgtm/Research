// Core utilities: math, seeded RNG, tileable noise, colour and canvas helpers.
(function () {
'use strict';
const CD = (window.CD = window.CD || {});
CD.T = 40;              // tile size in world pixels
CD.VIEW_H = 720;        // logical view height (world px)
const U = (CD.U = {});

// ---------- math ----------
U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
U.lerp = (a, b, t) => a + (b - a) * t;
U.approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
U.smoothstep = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
U.sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
U.rad = (d) => d * Math.PI / 180;
U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
U.angleDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
U.lerpAngle = (a, b, t) => a + U.angleDiff(a, b) * t;
U.damp = (a, b, lambda, dt) => U.lerp(a, b, 1 - Math.exp(-lambda * dt));
U.ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outQuad: (t) => 1 - (1 - t) * (1 - t),
};
U.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------- RNG ----------
U.mulberry32 = function (seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
U.RNG = function (seed) {
  const f = U.mulberry32(seed | 0);
  const r = {
    next: f,
    range: (a, b) => a + (b - a) * f(),
    int: (a, b) => Math.floor(a + (b - a + 1) * f()),
    pick: (arr) => arr[Math.floor(f() * arr.length)],
    chance: (p) => f() < p,
    sign: () => (f() < 0.5 ? -1 : 1),
    gauss: () => (f() + f() + f() + f() - 2) / 2,   // approx N(0, ~0.58), range [-1,1]
  };
  return r;
};
U.hash2 = (x, y, s) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 1, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
U.hashStr = (str) => { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
U.shuffle = (arr, rng) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor((rng ? rng.next() : Math.random()) * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };

// ---------- colour ----------
U.hex = (h) => {
  if (Array.isArray(h)) return h;
  h = h.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
U.rgb = (c, a) => { c = U.hex(c); return a === undefined || a === 1 ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; };
U.mix = (a, b, t) => { a = U.hex(a); b = U.hex(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
U.shade = (c, f) => { c = U.hex(c); return [U.clamp(c[0] * f, 0, 255), U.clamp(c[1] * f, 0, 255), U.clamp(c[2] * f, 0, 255)]; };
U.hsl = (h, s, l, a) => 'hsla(' + (h | 0) + ',' + (s | 0) + '%,' + (l | 0) + '%,' + (a === undefined ? 1 : a) + ')';

// ---------- canvas ----------
U.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
U.ctx = (c, opts) => c.getContext('2d', opts);
U.makeCanvas = (w, h, opts) => { const c = U.canvas(w, h); return { c, g: U.ctx(c, opts) }; };

// ---------- value noise (non-periodic) ----------
const fade5 = (t) => t * t * t * (t * (t * 6 - 15) + 10);
U.vnoise = (x, y, seed) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = U.hash2(xi, yi, seed), b = U.hash2(xi + 1, yi, seed), c = U.hash2(xi, yi + 1, seed), d = U.hash2(xi + 1, yi + 1, seed);
  const u = fade5(xf), v = fade5(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
U.fbm = (x, y, oct, seed, gain) => {
  let s = 0, amp = 0.5, f = 1, n = 0; gain = gain || 0.5;
  for (let i = 0; i < oct; i++) { s += amp * U.vnoise(x * f, y * f, (seed | 0) + i * 31); n += amp; amp *= gain; f *= 2; }
  return s / n;
};

// ---------- tileable noise fields (Float32Array in 0..1) ----------
// A grid of cx*cy random values, wrapped, interpolated with a quintic fade. Cheap and seamless.
U.noiseField = (w, h, cx, cy, seed) => {
  const grid = new Float32Array(cx * cy);
  const r = U.mulberry32(seed | 0);
  for (let i = 0; i < grid.length; i++) grid[i] = r();
  const out = new Float32Array(w * h);
  const xi0 = new Int32Array(w), xi1 = new Int32Array(w), xw = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    const gx = (x / w) * cx; const i0 = Math.floor(gx);
    xi0[x] = i0 % cx; xi1[x] = (i0 + 1) % cx; xw[x] = fade5(gx - i0);
  }
  for (let y = 0; y < h; y++) {
    const gy = (y / h) * cy; const j0 = Math.floor(gy); const j1 = (j0 + 1) % cy; const jj0 = (j0 % cy) * cx, jj1 = j1 * cx; const yw = fade5(gy - j0);
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const a = grid[jj0 + xi0[x]], b = grid[jj0 + xi1[x]], c = grid[jj1 + xi0[x]], d = grid[jj1 + xi1[x]];
      const top = a + (b - a) * xw[x], bot = c + (d - c) * xw[x];
      out[row + x] = top + (bot - top) * yw;
    }
  }
  return out;
};
// fBm from stacked noiseFields; cells double each octave. ratio stretches x vs y cell counts (e.g. strata).
U.fbmField = (w, h, baseCells, oct, seed, gain, ratio) => {
  gain = gain || 0.5; ratio = ratio || 1;
  const out = new Float32Array(w * h); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const cxn = Math.max(1, Math.round(baseCells * Math.pow(2, o))), cyn = Math.max(1, Math.round(baseCells * ratio * Math.pow(2, o)));
    const f = U.noiseField(w, h, cxn, cyn, (seed | 0) * 131 + o * 977);
    for (let i = 0; i < out.length; i++) out[i] += f[i] * amp;
    tot += amp; amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
};

// ---------- misc ----------
U.wrapDraw = (size, fn) => { for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) fn(ox * size, oy * size); };
U.fmtTime = (s) => { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(ss).padStart(2, '0'); };
U.pad = (n, l) => String(n).padStart(l, '0');
U.now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
U.deepCopy = (o) => JSON.parse(JSON.stringify(o));
U.easeTo = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

})();
