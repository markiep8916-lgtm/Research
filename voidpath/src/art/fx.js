// Effect sprite sheets for VOIDPATH (owner: art-env).
//
// Every sheet is crisp pixel art designed for ADDITIVE blending: transparent background, white-hot
// cores fading through brighter ramp steps to dim coloured edges. Pixel alpha follows brightness,
// so the sheets also look right with normal alpha blending. Frames are laid out in one row.
// Shapes are painted from intensity fields (0 = empty, 1 = white core) quantised onto a short
// colour ramp, with Bayer dithering only on the outermost fade.

import { Painter, packSheet, bayer, rng, parseColor, makeCanvas } from './painter.js';
import { artCache } from './cache.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// dim edge -> white core
const PAL = {
  blade: ['#2a4fa8', '#5a8ff0', '#a8d0ff', '#e6f4ff', '#ffffff'],
  lance: ['#28509e', '#5a90e8', '#a8d4ff', '#e8f6ff', '#ffffff'],
  impact: ['#6f2a0c', '#e0782a', '#ffc66a', '#fff2cc', '#ffffff'],
  rifle: ['#7a2e0c', '#e8802a', '#ffc46a', '#fff0c8', '#ffffff'],
  punch: ['#6e2414', '#d45a34', '#ffaa80', '#ffe2cc', '#ffffff'],
  shard: ['#5c1450', '#c42a8a', '#ff7ac6', '#ffc8ea', '#ffffff'],
  ring: ['#0d4f78', '#29a9e0', '#8fe0ff', '#e0f8ff', '#ffffff'],
  glint: ['#3a5aa8', '#9fd0ff', '#e8f6ff', '#ffffff'],
  thermal: ['#4a0c06', '#a8280c', '#f0601e', '#ffa236', '#ffe08a', '#ffffff'],
  cryo: ['#0a3a66', '#2690d0', '#86e0ff', '#d4f8ff', '#ffffff'],
  volt: ['#4a3a10', '#b89020', '#ffe94d', '#fffbd2', '#ffffff'],
  photon: ['#5a4410', '#c8a040', '#ffeaa0', '#fff8e0', '#ffffff'],
  void: ['#1e0a40', '#4c22a0', '#9a5cf0', '#dcc0ff', '#ffffff'],
  heal: ['#0a4a36', '#1aa874', '#5af0b0', '#c8ffe6', '#ffffff'],
  buff: ['#6a3010', '#e0822a', '#ffc24a', '#fff0c0', '#ffffff'],
  debuff: ['#2a1660', '#5a3ad0', '#9c80ff', '#ddd2ff', '#ffffff'],
};

/** Palette entries as RGBA with alpha following brightness (premultiplied-friendly). */
function rgbaRamp(pal) {
  return pal.map((c) => {
    const [r, g, b] = parseColor(c);
    const lum = Math.max(r, g, b) / 255;
    return [r, g, b, Math.round(Math.min(1, 0.25 + lum * 0.95) * 255)];
  });
}
const RAMP_CACHE = new Map();
const rampOf = (name) => {
  let r = RAMP_CACHE.get(name);
  if (!r) RAMP_CACHE.set(name, (r = rgbaRamp(PAL[name])));
  return r;
};

/** Paint a frame from an intensity field fn(x, y) (pixel centres) onto a palette ramp. */
function field(w, h, fn, palName, p = new Painter(w, h)) {
  const ramp = rampOf(palName);
  const n = ramp.length;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = fn(x + 0.5, y + 0.5);
    if (!(v > 0)) continue;
    const q = Math.min(1, v) * n;
    let k = Math.floor(q);
    const fr = q - k;
    if (k === 0) { if (!bayer(x, y, fr)) continue; k = 1; }
    else if (k < n && fr > 0.8 && bayer(x, y, (fr - 0.8) * 5)) k++;
    const cur = p.get(x, y);
    const c = ramp[Math.min(n, k) - 1];
    if (cur[3] === 0 || c[0] + c[1] + c[2] > cur[0] + cur[1] + cur[2]) p.set(x, y, c);
  }
  return p;
}

/** Plot a single ramp-level pixel (1 = faintest .. n = white) if brighter than what is there. */
function dot(p, palName, x, y, level) {
  const ramp = rampOf(palName);
  const c = ramp[Math.max(0, Math.min(ramp.length - 1, level - 1))];
  const cur = p.get(x | 0, y | 0);
  if (cur[3] === 0 || c[0] + c[1] + c[2] > cur[0] + cur[1] + cur[2]) p.set(x | 0, y | 0, c);
}

/** Small plus-shaped sparkle: white centre, dimmer arms. */
function sparkle(p, palName, x, y, size = 1) {
  const n = rampOf(palName).length;
  dot(p, palName, x, y, n);
  for (let k = 1; k <= size; k++) {
    const lv = Math.max(1, n - k - 1);
    dot(p, palName, x + k, y, lv); dot(p, palName, x - k, y, lv); dot(p, palName, x, y + k, lv); dot(p, palName, x, y - k, lv);
  }
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / l2);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}

/** Tapered spike from (cx, cy) along angle a: bright on the axis, thinning to the tip. */
function spike(x, y, cx, cy, a, len, width, r0 = 0) {
  const dx = x - cx, dy = y - cy;
  const along = dx * Math.cos(a) + dy * Math.sin(a);
  if (along < r0 || along > len) return 0;
  const perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
  const k = 1 - (along - r0) / (len - r0);
  const hw = width * k + 0.35;
  return perp > hw ? 0 : (1 - perp / hw) * (0.35 + 0.65 * k);
}

function ringAt(d, r, w) { return 1 - Math.abs(d - r) / w; }

// ---------------------------------------------------------------- effects

function slash() {
  const cx = 30, cy = 36, R = 24;
  const heads = [-1.75, -0.45, 0.6, 0.9, 1.0, 1.05];
  const tails = [0.9, 2.0, 2.8, 2.5, 1.8, 1.1];
  const thick = [3.5, 7, 9, 7, 4.5, 2.5];
  const gain = [1.0, 1.2, 1.25, 1.05, 0.8, 0.5];
  return heads.map((head, f) => {
    const p = field(64, 64, (x, y) => {
      const dx = x - cx, dy = y - cy;
      let a = head - Math.atan2(dy, dx);
      a = ((a % TAU) + TAU) % TAU;
      if (a > tails[f]) return 0;
      const along = 1 - a / tails[f];
      const th = thick[f] * Math.sin(Math.PI * Math.pow(along, 1.6)) + 0.6;
      const d = Math.hypot(dx, dy) - R;
      const prof = d > 0 ? 1 - d / (th * 0.25 + 0.9) : 1 + d / th;
      let v = prof <= 0 ? 0 : prof * (0.32 + 0.68 * along) * gain[f];
      // thin trailing speed arcs inside the crescent
      if (f >= 1 && f <= 4 && along > 0.25 && along < 0.85) {
        for (const off of [th + 2.5, th + 5.5]) {
          if (Math.abs(d + off) < 0.6) v = Math.max(v, 0.42 * gain[f] * Math.sin(Math.PI * (along - 0.25) / 0.6));
        }
      }
      return v;
    }, 'blade');
    if (f >= 2) {
      const r = rng(40 + f);
      for (let i = 0; i < 2 + f; i++) {
        const a = head - r() * tails[f] * 0.9;
        const rr = R + 2 + r() * (f * 1.6);
        if (r() < 0.5) sparkle(p, 'blade', cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, f < 4 ? 1 : 0);
        else dot(p, 'blade', cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 3);
      }
    }
    return p;
  });
}

function thrust() {
  const tip = [28, 50, 60, 61, 61], base = [4, 5, 9, 22, 40], th = [2.6, 4.6, 5.6, 3.6, 2];
  const gain = [0.9, 1.1, 1.2, 0.9, 0.55];
  return tip.map((tx, f) => {
    const p = field(64, 32, (x, y) => {
      let v = 0;
      if (x >= base[f] && x <= tx) {
        const along = (x - base[f]) / (tx - base[f]);
        const half = th[f] * (1 - Math.pow(along, 4)) * (0.35 + 0.65 * along) + 0.4;
        const prof = 1 - Math.abs(y - 16) / half;
        if (prof > 0) v = prof * (0.3 + 0.75 * along) * gain[f];
      }
      // speed lines above and below the shaft
      for (const [ly, off] of [[9, 6], [23, 12], [12, 18], [20, 2]]) {
        const x0 = base[f] + off, x1 = tx - 10 - off * 0.5;
        if (f > 0 && f < 4 && Math.abs(y - ly) < 0.6 && x > x0 && x < x1) v = Math.max(v, 0.32 * gain[f] * (x - x0) / (x1 - x0 + 1));
      }
      if (f === 2 || f === 1) {
        const k = f === 2 ? 1 : 0.7;
        v = Math.max(v, spike(x, y, tx - 2, 16, -Math.PI / 2, 9 * k, 1.4) * k, spike(x, y, tx - 2, 16, Math.PI / 2, 9 * k, 1.4) * k);
        v = Math.max(v, spike(x, y, tx - 2, 16, -2.4, 8 * k, 1) * 0.7, spike(x, y, tx - 2, 16, 2.4, 8 * k, 1) * 0.7);
      }
      return v;
    }, 'lance', new Painter(64, 32));
    if (f === 2) sparkle(p, 'lance', 60, 16, 2);
    return p;
  });
}

function impact() {
  const frames = [];
  for (let f = 0; f < 5; f++) {
    const p = field(48, 48, (x, y) => {
      const dx = x - 24, dy = y - 24, d = Math.hypot(dx, dy);
      let v = 0;
      const core = [5, 7, 3.5, 0, 0][f];
      if (core) v = Math.max(v, (1 - d / core) * 1.3);
      const nSp = f < 3 ? 8 : 0;
      for (let k = 0; k < nSp; k++) {
        const a = k * TAU / nSp + 0.2;
        const len = [10, 21, 18][f] * (k % 2 ? 0.6 : 1);
        v = Math.max(v, spike(x, y, 24, 24, a, len, [1.6, 2.4, 1.2][f], core * 0.4) * [1.1, 1.15, 0.8][f]);
      }
      if (f >= 2) {
        const r = [0, 0, 13, 18, 21][f], w = [0, 0, 2.6, 1.7, 1.2][f];
        let rv = ringAt(d, r, w) * [0, 0, 0.95, 0.7, 0.42][f];
        if (f >= 3 && Math.sin(Math.atan2(dy, dx) * 5 + f) < -0.3) rv = 0;
        v = Math.max(v, rv);
      }
      return v;
    }, 'impact');
    if (f >= 3) {
      const r = rng(70 + f);
      for (let i = 0; i < 6; i++) {
        const a = r() * TAU, rr = [0, 0, 0, 16, 21][f] + r() * 3;
        dot(p, 'impact', 24 + Math.cos(a) * rr, 24 + Math.sin(a) * rr, f === 3 ? 4 : 2);
      }
    }
    frames.push(p);
  }
  return frames;
}

function muzzle() {
  const scale = [1, 0.68, 0.4];
  const gain = [1.2, 1.1, 0.45];
  return scale.map((s, f) => field(32, 32, (x, y) => {
    const ox = 5, oy = 16;
    const dx = x - (ox + 4 * s), dy = y - oy;
    let v = Math.max(0, 1 - Math.hypot(dx / (5 * s + 0.6), dy / (4 * s + 0.6))) * 1.4;
    v = Math.max(v, spike(x, y, ox, oy, 0, 26 * s + 2, 3 * s));
    v = Math.max(v, spike(x, y, ox + 3 * s, oy, -Math.PI / 2, 8 * s, 1.3 * s) * 0.9, spike(x, y, ox + 3 * s, oy, Math.PI / 2, 8 * s, 1.3 * s) * 0.9);
    v = Math.max(v, spike(x, y, ox + 2, oy, -0.6, 13 * s, 1.6 * s) * 0.85, spike(x, y, ox + 2, oy, 0.6, 13 * s, 1.6 * s) * 0.85);
    if (f === 2) v = Math.max(0, v * (0.6 + 0.4 * Math.sin(x * 1.7 + y * 2.3)));
    return v * gain[f];
  }, 'rifle'));
}

function tracer() {
  return [field(64, 8, (x, y) => {
    if (x < 2 || x > 61) return 0;
    const along = (x - 2) / 59;
    const prof = 1 - Math.abs(y - 4) / (0.55 + along * 1.5);
    return prof <= 0 ? 0 : prof * Math.pow(along, 1.25) * 1.2;
  }, 'rifle')];
}

function punch() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const p = field(48, 48, (x, y) => {
      const dx = x - 24, dy = y - 24, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      let v = 0;
      if (f === 0) {
        v = (1 - d / 7) * 1.3;
        for (let k = 0; k < 6; k++) v = Math.max(v, spike(x, y, 24, 24, k * TAU / 6 + 0.5, 15, 2.2));
      } else {
        const r1 = [0, 11, 17, 21][f], w1 = [0, 3.2, 2.2, 1.3][f], g1 = [0, 1.1, 0.8, 0.45][f];
        v = ringAt(d, r1, w1) * g1;
        if (f < 3) v = Math.max(v, ringAt(d, r1 + 6, 1) * g1 * 0.6);
        if (f === 1) for (let k = 0; k < 8; k++) v = Math.max(v, spike(x, y, 24, 24, k * TAU / 8, 23, 0.8, 18) * 0.9);
        if (f === 1) v = Math.max(v, (1 - d / 4) * 1.2);
        if (f === 3 && Math.sin(a * 6) < -0.2) v *= 0.3;
      }
      return v;
    }, 'punch');
    if (f >= 2) {
      const r = rng(90 + f);
      for (let i = 0; i < 7; i++) {
        const a = r() * TAU, rr = [0, 0, 20, 22][f] + r() * 2;
        dot(p, 'punch', 24 + Math.cos(a) * rr, 24 + Math.sin(a) * rr, f === 2 ? 4 : 2);
      }
    }
    frames.push(p);
  }
  return frames;
}

function shards() {
  const shapes = [
    [[4, 3], [19, 7], [8, 21]],
    [[3, 10], [12, 2], [21, 9], [11, 21]],
    [[6, 2], [16, 4], [20, 20], [3, 13]],
    [[2, 19], [10, 3], [14, 6], [21, 21]],
  ];
  const ramp = rampOf('shard');
  return shapes.map((pts, i) => {
    const p = new Painter(24, 24);
    p.poly(pts, ramp[1]);
    // lighter facet: triangle from the first vertex to the centroid and the second vertex
    const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    p.poly([pts[0], pts[1], [cx, cy]], ramp[2]);
    // bright edge on the lit (upper-left) sides
    for (let k = 0; k < pts.length; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % pts.length];
      const nx = by - ay, ny = -(bx - ax); // outward normal for clockwise screen winding
      if (nx * -1 + ny * -1 > 0) p.line(ax, ay, bx, by, ramp[3]);
    }
    p.set(pts[0][0], pts[0][1], ramp[4]);
    p.set(Math.round(cx), Math.round(cy), ramp[3]);
    if (i % 2) p.set(Math.round((pts[1][0] + cx) / 2), Math.round((pts[1][1] + cy) / 2), ramp[4]);
    return p;
  });
}

function ring() {
  const R = [6, 13, 19, 25, 29], W = [4, 3.2, 2.6, 2, 1.4], Gn = [1.25, 1.12, 0.92, 0.66, 0.4];
  return R.map((r, f) => field(64, 64, (x, y) => {
    const dx = x - 32, dy = y - 32, d = Math.hypot(dx, dy);
    let v = ringAt(d, r, W[f]) * Gn[f];
    if (f === 0) v = Math.max(v, (1 - d / 4) * 0.9);
    if (f >= 3) v *= 0.75 + 0.25 * Math.sin(Math.atan2(dy, dx) * 7 + f);
    return v;
  }, 'ring'));
}

function glint() {
  const arms = [3, 8, 13, 6], diag = [1, 3.5, 5, 2], gain = [0.85, 1.05, 1.15, 0.7];
  return arms.map((len, f) => field(32, 32, (x, y) => {
    const dx = Math.abs(x - 16), dy = Math.abs(y - 16);
    let v = 0;
    if (dy < 0.6) v = Math.max(v, 1 - dx / len);
    if (dx < 0.6) v = Math.max(v, 1 - dy / len);
    if (dy < 1.6 && dx < len * 0.45) v = Math.max(v, (1 - dx / (len * 0.45)) * 0.45);
    if (dx < 1.6 && dy < len * 0.45) v = Math.max(v, (1 - dy / (len * 0.45)) * 0.45);
    if (Math.abs(dx - dy) < 0.6) v = Math.max(v, (1 - dx / diag[f]) * 0.7);
    if (dx < 1 && dy < 1) v = 1.2;
    return v * gain[f];
  }, 'glint'));
}

function thermal() {
  const H = [14, 30, 44, 50, 46, 34];
  const cut = [0, 0, 0, 0.12, 0.35, 0.55];
  const gain = [1.05, 1.12, 1.15, 1.05, 0.85, 0.6];
  const tongues = [[32, 1, 7, 0], [24, 0.72, 5, 1.7], [40, 0.8, 5.5, 3.1], [18, 0.48, 3.5, 4.4], [46, 0.52, 3.5, 5.6], [29, 0.6, 3, 2.3], [36, 0.66, 3.5, 0.9]];
  const base = 57;
  return H.map((Hf, f) => {
    const p = field(64, 64, (x, y) => {
      let v = 0;
      for (const [tx, hk, wk, ph] of tongues) {
        const h = Hf * hk;
        const rel = (base - y) / h;
        if (rel < cut[f] || rel > 1) continue;
        const cx = tx + Math.sin(rel * 4.5 + ph + f * 1.4) * rel * 3.2;
        const half = wk * Math.pow(1 - rel, 0.65) * (1 + 0.25 * Math.sin(rel * 9 + ph)) + 0.4;
        const prof = 1 - Math.abs(x - cx) / half;
        if (prof > 0) v = Math.max(v, prof * (1.15 - rel * 0.65));
      }
      if (f < 3) {
        const d = Math.hypot((x - 32) / (12 + f * 6), (y - base) / (3 + f));
        v = Math.max(v, (1 - d) * (1.1 - f * 0.2));
      }
      const flick = 0.78 + 0.44 * Math.sin(x * 0.9 + y * 0.55 - f * 2.1) * Math.sin(y * 0.4 + f);
      return v * flick * gain[f];
    }, 'thermal');
    if (f >= 2) {
      const r = rng(110 + f);
      for (let i = 0; i < 4 + f; i++) dot(p, 'thermal', 14 + r() * 36, base - Hf * (0.5 + r() * 0.6), f > 4 ? 3 : 5);
    }
    return p;
  });
}

function cryo() {
  const L = [6, 14, 22, 25, 26, 24], r0 = [0, 0, 0, 0, 9, 16], W = [2.4, 3.4, 4.6, 4.6, 3.4, 2.2], gain = [1, 1.1, 1.15, 1.05, 0.8, 0.5];
  const spikes = [[-Math.PI / 2, 1], [-Math.PI / 2 + 1.05, 0.8], [-Math.PI / 2 - 1.05, 0.85], [Math.PI / 2 + 0.5, 0.62], [Math.PI / 2 - 0.55, 0.7], [-0.2, 0.55], [Math.PI + 0.25, 0.5],
    [-Math.PI / 2 + 0.5, 0.42], [-Math.PI / 2 - 0.55, 0.38], [Math.PI / 2, 0.36]];
  return L.map((len, f) => {
    const p = field(64, 64, (x, y) => {
      const cx = 32, cy = 35;
      const dx = x - cx, dy = y - cy;
      let v = 0;
      for (const [a, lk] of spikes) {
        const l = len * lk, off = r0[f] * lk;
        const ca = Math.cos(a), sa = Math.sin(a);
        const along = dx * ca + dy * sa - off, perp = -dx * sa + dy * ca;
        if (along < 0 || along > l) continue;
        // kite-shaped crystal: widest at 35% of its length, lit facet on one side of the ridge
        const k = along < l * 0.35 ? along / (l * 0.35) : 1 - (along - l * 0.35) / (l * 0.65);
        const hw = W[f] * lk * k + 0.4;
        if (Math.abs(perp) > hw) continue;
        const facet = perp < 0 ? 1.05 : 0.72;
        v = Math.max(v, (1 - Math.abs(perp) / hw * 0.55) * facet, Math.abs(perp) < 0.55 && along < l * 0.9 ? 1.1 : 0);
      }
      if (f < 4) {
        const hex = Math.max(Math.abs(dx) * 0.87 + Math.abs(dy) * 0.5, Math.abs(dy));
        v = Math.max(v, (1 - hex / ([5, 6, 7, 6][f])) * 1.2);
      }
      return v * gain[f];
    }, 'cryo');
    if (f >= 2) {
      const r = rng(130 + f);
      for (let i = 0; i < 2 + f; i++) {
        const a = r() * TAU, rr = 10 + r() * (8 + f * 3);
        if (r() < 0.45) sparkle(p, 'cryo', 32 + Math.cos(a) * rr, 35 + Math.sin(a) * rr, 1);
        else dot(p, 'cryo', 32 + Math.cos(a) * rr, 35 + Math.sin(a) * rr, f > 4 ? 2 : 4);
      }
    }
    return p;
  });
}

function boltPath(r, x0, y0, x1, y1, step = 6, jit = 5) {
  const pts = [[x0, y0]];
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push([x0 + (x1 - x0) * t + (r() - 0.5) * 2 * jit, y0 + (y1 - y0) * t + (r() - 0.5) * jit * 0.6]);
  }
  pts.push([x1, y1]);
  return pts;
}

function volt() {
  const frames = [];
  const thick = [0.6, 1.5, 1.35, 0.9, 0.5], gain = [0.75, 1.2, 1.2, 0.9, 0.55];
  for (let f = 0; f < 5; f++) {
    const r = rng(150 + (f === 2 ? 7 : f === 3 ? 7 : f));
    const paths = [boltPath(r, 30 + r() * 6, 0, 32, 50)];
    const main = paths[0];
    const branches = f === 0 ? 1 : f === 4 ? 1 : 3;
    for (let b = 0; b < branches; b++) {
      const s = main[1 + Math.floor(r() * (main.length - 3))];
      const dir = r() < 0.5 ? -1 : 1;
      paths.push(boltPath(r, s[0], s[1], s[0] + dir * (8 + r() * 12), s[1] + 8 + r() * 10, 4, 3));
    }
    if (f === 3 || f === 4) {
      // crackling side arcs at the strike point
      for (let k = 0; k < 2; k++) paths.push(boltPath(r, 32, 50, 32 + (k ? 1 : -1) * (12 + r() * 6), 44 + r() * 10, 4, 3));
    }
    const segs = [];
    paths.forEach((pts, pi) => { for (let i = 0; i + 1 < pts.length; i++) segs.push([...pts[i], ...pts[i + 1], pi === 0 ? 1 : 0.7]); });
    const p = field(64, 64, (x, y) => {
      let best = 0;
      for (const [ax, ay, bx, by, k] of segs) {
        const d = segDist(x, y, ax, ay, bx, by);
        const t = thick[f] * k;
        const v = d < t ? 1.2 : d < t + 1.2 ? 0.62 : d < t + 2.6 ? 0.3 : 0;
        if (v * k > best) best = v * k;
      }
      if (f >= 1 && f <= 3) {
        const d = Math.hypot((x - 32) / 1.6, y - 51);
        best = Math.max(best, (1 - d / [0, 8, 10, 6][f]) * 1.1);
      }
      return best * gain[f];
    }, 'volt');
    if (f === 0 || f === 4) sparkle(p, 'volt', 32, 50, 1);
    frames.push(p);
  }
  return frames;
}

function photon() {
  const reach = [30, 54, 54, 54, 54, 54], hw = [1.2, 2.6, 6, 8, 4, 1.6], flare = [0, 8, 14, 18, 12, 6], gain = [0.9, 1.05, 1.15, 1.2, 0.85, 0.5];
  return hw.map((w, f) => {
    const p = field(64, 64, (x, y) => {
      let v = 0;
      if (y <= reach[f]) {
        const d = Math.abs(x - 32);
        const top = Math.min(1, y / 10);
        const core = 1 - d / w;
        const halo = (1 - d / (w * 2.1 + 1)) * 0.38;
        v = Math.max(core * 1.1, halo) * (0.45 + 0.55 * top);
      }
      if (flare[f]) {
        const d = Math.hypot((x - 32) / flare[f], (y - 54) / (flare[f] * 0.28));
        v = Math.max(v, (1 - d) * 1.05);
      }
      if (f === 2 || f === 3) {
        // slanted rays fanning from the pillar
        for (const a of [-2.3, -0.85]) v = Math.max(v, spike(x, y, 32, 52, a, 18 + f * 2, 0.9, w) * 0.55);
      }
      return v * gain[f];
    }, 'photon');
    if (f >= 3) {
      const r = rng(170 + f);
      for (let i = 0; i < 5; i++) {
        const mx = 32 + (r() - 0.5) * 30, my = 50 - r() * 36 - (f - 3) * 6;
        if (r() < 0.4) sparkle(p, 'photon', mx, my, 1);
        else dot(p, 'photon', mx, my, f > 4 ? 3 : 4);
      }
    }
    return p;
  });
}

function voidFx() {
  const R = [26, 20, 14, 8, 3, 14], W = [2.2, 2.8, 3.2, 3.5, 3, 1.6], Gn = [0.7, 0.9, 1.05, 1.2, 1.35, 0.45];
  return R.map((r, f) => {
    const p = field(64, 64, (x, y) => {
      const dx = x - 32, dy = y - 32, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (f === 4) {
        let v = (1 - d / 6) * 1.5;
        for (const sa of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) v = Math.max(v, spike(x, y, 32, 32, sa, 15, 1.4));
        for (const sa of [Math.PI / 4, 3 * Math.PI / 4, -Math.PI / 4, -3 * Math.PI / 4]) v = Math.max(v, spike(x, y, 32, 32, sa, 7, 0.8) * 0.8);
        return Math.max(v, ringAt(d, 9, 1.2) * 0.6);
      }
      let v = ringAt(d, r, W[f]) * Gn[f];
      if (f < 4) {
        // three spiral arms being dragged into the centre
        const arm = Math.pow(Math.max(0, Math.cos(3 * (a - d * 0.16 - f * 0.7))), 6);
        const env = 1 - Math.abs(d - (r + 7)) / 9;
        if (env > 0) v = Math.max(v, arm * env * 0.8 * Gn[f]);
        // streaks pulled inward from outside the ring
        for (let k = 0; k < 8; k++) v = Math.max(v, spike(x, y, 32, 32, k * TAU / 8 + d * 0.05 + f * 0.3, r + 14 - f * 2, 0.7, r + 3) * 0.45 * Gn[f]);
      }
      if (f === 5 && Math.sin(a * 5) < -0.4) v *= 0.3;
      return v;
    }, 'void');
    if (f === 5) {
      const r2 = rng(190);
      for (let i = 0; i < 8; i++) { const a = r2() * TAU, rr = 6 + r2() * 16; dot(p, 'void', 32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr, 3); }
    }
    return p;
  });
}

function crossAt(x, y, cx, cy, s, t) {
  const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
  if ((dx <= s && dy <= t) || (dy <= s && dx <= t)) {
    const core = (dx < 0.6 && dy <= s - 0.5) || (dy < 0.6 && dx <= s - 0.5);
    return core ? 1.15 : 0.62;
  }
  if ((dx <= s + 1 && dy <= t + 1) || (dy <= s + 1 && dx <= t + 1)) return 0.24;
  return 0;
}

function heal() {
  // [x, startY, armLength, halfThickness, startFrame]
  const crosses = [[32, 44, 4, 1, 0], [20, 50, 3, 1, 1], [44, 48, 3, 1, 1], [27, 52, 2, 0.5, 2], [39, 54, 2, 0.5, 3], [31, 56, 3, 1, 3]];
  return [0, 1, 2, 3, 4, 5].map((f) => {
    const p = field(64, 64, (x, y) => {
      let v = 0;
      for (const [cx, y0, s, t, f0] of crosses) {
        if (f < f0) continue;
        const life = (f - f0) / 4;
        if (life > 1) continue;
        const cy = y0 - (f - f0) * 8;
        const fade = life < 0.15 ? 0.7 : 1 - Math.max(0, life - 0.5);
        v = Math.max(v, crossAt(x, y, cx, cy, s, t) * fade);
      }
      if (f < 3) {
        const d = Math.hypot((x - 32) / (14 + f * 5), (y - 56) / (3.5 + f));
        v = Math.max(v, ringAt(d, 1, 0.28) * (0.8 - f * 0.2));
      }
      return v;
    }, 'heal');
    const r = rng(210 + f);
    for (let i = 0; i < 4; i++) dot(p, 'heal', 14 + r() * 36, 18 + r() * 38, r() < 0.3 ? 5 : 3);
    return p;
  });
}

function chevrons(up, palName) {
  return [0, 1, 2, 3, 4].map((f) => field(48, 48, (x, y) => {
    let v = 0;
    for (let k = 0; k < 3; k++) {
      const life = (f + k * 1.4) / 7;
      const fade = life < 0.2 ? life / 0.2 : life > 0.75 ? Math.max(0, 1 - (life - 0.75) / 0.25) : 1;
      if (fade <= 0) continue;
      const cy = up ? 38 - k * 10 - f * 3 : 10 + k * 10 + f * 3;
      const tipY = up ? cy - 6 : cy + 6;
      const d = Math.min(segDist(x, y, 14, cy, 24, tipY), segDist(x, y, 24, tipY, 34, cy));
      const prof = d < 1 ? 1.15 : d < 2 ? 0.7 : d < 3 ? 0.3 : 0;
      v = Math.max(v, prof * fade);
    }
    return v;
  }, palName));
}

// ---------------------------------------------------------------- registry

const FX = {
  slash: { build: slash, fps: 22 },
  thrust: { build: thrust, fps: 20 },
  impact: { build: impact, fps: 20 },
  muzzle: { build: muzzle, fps: 24 },
  tracer: { build: tracer, fps: 1 },
  punch: { build: punch, fps: 18 },
  shards: { build: shards, fps: 1 },
  ring: { build: ring, fps: 18 },
  glint: { build: glint, fps: 14 },
  thermal: { build: thermal, fps: 14 },
  cryo: { build: cryo, fps: 14 },
  volt: { build: volt, fps: 18 },
  photon: { build: photon, fps: 12 },
  void: { build: voidFx, fps: 12 },
  heal: { build: heal, fps: 10 },
  buff: { build: () => chevrons(true, 'buff'), fps: 10 },
  debuff: { build: () => chevrons(false, 'debuff'), fps: 10 },
};

export const FX_NAMES = Object.keys(FX);

/**
 * Sprite-sheet object for an effect (cached):
 *   { canvas, normal (flat), emissive (= canvas), frameW, frameH, cols, rows: 1, count,
 *     anims: { play: { frames, fps, loop: false } }, pxPerUnit: 32, facing: 'right', blending: 'additive' }
 * 'shards' and 'tracer' are 1-frame variants (shards: pick a random frame per particle).
 */
export function fxSheet(name) {
  const hit = artCache.get(`fx:${name}`);
  if (hit) return hit;
  const def = FX[name];
  if (!def) throw new Error(`fx: unknown effect "${name}"`);
  const packed = packSheet(def.build());
  const normal = new Painter(packed.painter.w, packed.painter.h);
  for (let i = 0; i < normal.data.length; i += 4) { normal.data[i] = 128; normal.data[i + 1] = 128; normal.data[i + 2] = 255; normal.data[i + 3] = 255; }
  normal._dirty = true;
  const sheet = {
    canvas: packed.canvas,
    normal: normal.canvas,
    emissive: packed.canvas,
    frameW: packed.frameW,
    frameH: packed.frameH,
    cols: packed.cols,
    rows: packed.rows,
    count: packed.count,
    anims: { play: { frames: [...Array(packed.count).keys()], fps: def.fps, loop: false } },
    pxPerUnit: 32,
    facing: 'right',
    blending: 'additive',
  };
  return artCache.set(`fx:${name}`, sheet, { loc: 'core' });
}

const glows = new Map();

/** Smooth radial-gradient canvas (not pixel art) for glows and soft particles. Cached. */
export function softGlowCanvas(size = 64, color = '#ffffff') {
  const key = `${size}|${color}`;
  const hit = glows.get(key);
  if (hit) return hit;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const [r, g, b] = parseColor(color);
  const h = size / 2;
  const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
  // roughly gaussian falloff
  for (const [s, a] of [[0, 1], [0.12, 0.86], [0.25, 0.6], [0.4, 0.34], [0.55, 0.16], [0.72, 0.06], [0.88, 0.015], [1, 0]]) {
    grad.addColorStop(s, `rgba(${r},${g},${b},${a})`);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  glows.set(key, c);
  return c;
}
