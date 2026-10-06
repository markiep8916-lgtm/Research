// Environment textures for VOIDPATH (owner: art-env).
//
// Every texture is pixel art painted procedurally at 32 texture pixels per world unit, as three
// parallel layers:
//   map       albedo, with a subtle upper-left light baked into bevels (3D lights do the rest)
//   height    seams/grooves low, panels/bolts high -> converted to a tangent-space normal map
//   emissive  only the glowing pixels (screens, LEDs, signage, lamps), black elsewhere
// Floors tile seamlessly in both directions; walls tile horizontally. Animated textures lay their
// frames out horizontally; use setTextureFrame() on a textureSet() to pick a frame.

import * as THREE from 'three';
import { Painter, toTexture, shade, mix, bayer, rng } from './painter.js';
import { RAMPS, GLOW } from './palette.js';

const S = RAMPS.steel;     // 0..7
const G = RAMPS.gunmetal;  // 0..5
const AM = RAMPS.amber;
const CY = RAMPS.cyan;
const TE = RAMPS.teal;
const CR = RAMPS.crimson;
const GN = RAMPS.green;
const GD = RAMPS.gold;

const VOID = '#07090f';
const HAZ_K = '#18161c';   // hazard-stripe black (slightly warm)
const CARGO = ['#26140a', '#4a2810', '#753f17', '#a35a20', '#c9772e', '#e89f52'];
const LOCKER = ['#141f26', '#1f3039', '#2c434f', '#3b5866', '#527583', '#7898a4'];
const FROST = ['#33465c', '#536a83', '#7690aa', '#9db4ca', '#c2d4e4', '#e0ecf6', '#f7fbff'];
const POD = ['#3c4558', '#5d6780', '#8790a6', '#aeb7c9', '#d2d9e5', '#eef2f8'];
const BRIDGE = ['#06080f', '#0b0f1a', '#111726', '#171f33', '#202b44', '#2d3b5a'];
const UPHOL = ['#141b2a', '#1d2840', '#28385a', '#384c76', '#4c6491'];

// ---------------------------------------------------------------- noise

function hash(ix, iy, seed) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [0,1]. px/py > 0 make it periodic (tileable) with that lattice period. */
function vnoise(x, y, seed = 0, px = 0, py = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  let x0 = ix, x1 = ix + 1, y0 = iy, y1 = iy + 1;
  if (px) { x0 = ((x0 % px) + px) % px; x1 = ((x1 % px) + px) % px; }
  if (py) { y0 = ((y0 % py) + py) % py; y1 = ((y1 % py) + py) % py; }
  const a = hash(x0, y0, seed), b = hash(x1, y0, seed), c = hash(x0, y1, seed), d = hash(x1, y1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x, y, seed = 0, oct = 4, px = 0, py = 0) {
  let s = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < oct; o++) {
    s += amp * vnoise(x, y, seed + o * 131, px, py);
    norm += amp;
    x *= 2; y *= 2; px *= 2; py *= 2; amp *= 0.5;
  }
  return s / norm;
}

const BAYER16 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- Tex: colour + height + emissive

/** A texture under construction: colour Painter, Float32 height map, lazily created emissive Painter. */
class Tex {
  constructor(w, h, { wrapX = false, wrapY = false } = {}) {
    this.w = w;
    this.h = h;
    this.wrapX = wrapX;
    this.wrapY = wrapY;
    this.c = new Painter(w, h);
    this.hm = new Float32Array(w * h).fill(0.5);
    this.e = null;
  }

  idx(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (this.wrapX) x = ((x % this.w) + this.w) % this.w;
    if (this.wrapY) y = ((y % this.h) + this.h) % this.h;
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x;
  }

  /** Paint colour c (alpha-blended) and optionally set height ht at (x, y). Either may be null. */
  px(x, y, c, ht) {
    const i = this.idx(x, y);
    if (i < 0) return this;
    if (c != null) this.c.px(i % this.w, (i / this.w) | 0, c);
    if (ht != null) this.hm[i] = ht;
    return this;
  }

  /** Overwrite colour exactly (null clears to transparent). */
  put(x, y, c, ht) {
    const i = this.idx(x, y);
    if (i < 0) return this;
    this.c.set(i % this.w, (i / this.w) | 0, c);
    if (ht != null) this.hm[i] = ht;
    return this;
  }

  get(x, y) {
    const i = this.idx(x, y);
    return i < 0 ? [0, 0, 0, 0] : this.c.get(i % this.w, (i / this.w) | 0);
  }

  ht(x, y, v) { const i = this.idx(x, y); if (i >= 0) this.hm[i] = v; return this; }
  hAt(x, y) { const i = this.idx(x, y); return i < 0 ? 0 : this.hm[i]; }
  hAdd(x, y, d) { const i = this.idx(x, y); if (i >= 0) this.hm[i] += d; return this; }

  rect(x, y, w, h, c, ht) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c, ht);
    return this;
  }
  hline(x0, x1, y, c, ht) { for (let x = x0; x <= x1; x++) this.px(x, y, c, ht); return this; }
  vline(x, y0, y1, c, ht) { for (let y = y0; y <= y1; y++) this.px(x, y, c, ht); return this; }
  line(x0, y0, x1, y1, c, ht) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c, ht);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Lighten (amt > 0) or darken an existing pixel with painter.shade's hue-shifted ramp. */
  tone(x, y, amt) {
    const c = this.get(x, y);
    if (c[3]) this.put(x, y, shade(c, amt));
    return this;
  }
  /** Blend an existing pixel toward colour `to` by t. */
  tint(x, y, to, t) {
    const c = this.get(x, y);
    if (c[3]) this.put(x, y, mix(c, to, t).slice(0, 7) + (c[3] === 255 ? '' : c[3].toString(16).padStart(2, '0')));
    return this;
  }

  emit(x, y, c) {
    const i = this.idx(x, y);
    if (i < 0) return this;
    if (!this.e) {
      this.e = new Painter(this.w, this.h);
      this.e.rect(0, 0, this.w, this.h, '#000000');
    }
    this.e.px(i % this.w, (i / this.w) | 0, c);
    return this;
  }
  /** Paint a glowing pixel: colour map and emissive map (ec defaults to the same colour). */
  glow(x, y, c, ec = c) { this.px(x, y, c); return this.emit(x, y, ec); }
}

// ---------------------------------------------------------------- height -> normal

/**
 * Tangent-space normal map from a height field (central differences), same convention as
 * painter.makeNormalMap: +X right, +Y up in the texture (three.js flipY textures), Z out.
 *   strength: slope multiplier; wrapX/wrapY sample across the edges so tiling stays seamless;
 *   alphaOf(x, y): optional, pixels with 0 alpha get the flat normal.
 */
export function heightToNormal(height, w, h, { strength = 2.4, wrapX = false, wrapY = false, alphaOf = null } = {}) {
  const out = new Painter(w, h);
  const d = out.data;
  const H = (x, y) => {
    x = wrapX ? (x + w) % w : x < 0 ? 0 : x >= w ? w - 1 : x;
    y = wrapY ? (y + h) % h : y < 0 ? 0 : y >= h ? h - 1 : y;
    return height[y * w + x];
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    if (alphaOf && !alphaOf(x, y)) { d[o] = 128; d[o + 1] = 128; d[o + 2] = 255; d[o + 3] = 255; continue; }
    const nx0 = -(H(x + 1, y) - H(x - 1, y)) * strength;
    const ny0 = (H(x, y + 1) - H(x, y - 1)) * strength;
    const len = Math.hypot(nx0, ny0, 1);
    d[o] = Math.round((nx0 / len * 0.5 + 0.5) * 255);
    d[o + 1] = Math.round((ny0 / len * 0.5 + 0.5) * 255);
    d[o + 2] = Math.round((1 / len * 0.5 + 0.5) * 255);
    d[o + 3] = 255;
  }
  out._dirty = true;
  return out;
}

// ---------------------------------------------------------------- shared drawing helpers

/** 2x2 bolt head lit from the upper-left, with a 1px drop shadow to the lower-right. */
function bolt(t, x, y, ramp = S, hi = 6) {
  t.tone(x + 2, y + 1, -0.1).tone(x + 1, y + 2, -0.1).tone(x + 2, y + 2, -0.08);
  t.px(x, y, ramp[hi], 0.95).px(x + 1, y, ramp[hi - 1], 0.95);
  t.px(x, y + 1, ramp[hi - 1], 0.95).px(x + 1, y + 1, ramp[hi - 3], 0.9);
}

/** Single-pixel rivet with a highlight above-left and a shadow below-right. */
function rivet(t, x, y, ramp = S, hi = 5) {
  t.px(x, y, ramp[hi], 0.85).tone(x + 1, y + 1, -0.1);
}

/** Raised rectangle: lit top/left edge, shaded bottom/right edge. */
function raised(t, x, y, w, h, base, lit, dark, ht = 0.6) {
  t.rect(x, y, w, h, base, ht);
  t.hline(x, x + w - 1, y, lit).vline(x, y, y + h - 1, lit);
  t.hline(x, x + w - 1, y + h - 1, dark).vline(x + w - 1, y, y + h - 1, dark);
  t.px(x + w - 1, y, base).px(x, y + h - 1, base);
}

/** Recessed rectangle: shadowed top/left inner edge, lit bottom/right inner edge. */
function recess(t, x, y, w, h, fill, dark, lit, ht = 0.38) {
  t.rect(x, y, w, h, fill, ht);
  t.hline(x, x + w - 1, y, dark, ht - 0.04).vline(x, y, y + h - 1, dark, ht - 0.04);
  t.hline(x + 1, x + w - 1, y + h - 1, lit).vline(x + w - 1, y + 1, y + h - 1, lit);
}

/** Thin scratch: lightens existing pixels along a line, skipping a few for a broken stroke. */
function scratch(t, r, x, y, len, dx, dy, amt = 0.07) {
  for (let i = 0; i < len; i++) {
    if (r() < 0.2) continue;
    t.tone(Math.round(x + dx * i), Math.round(y + dy * i), amt);
  }
}

/** Dithered grime: darken pixels where cover(x, y) beats the Bayer threshold. */
function grime(t, x0, y0, w, h, cover, amt = -0.06) {
  // solid where the cover is heavy, sparse ordered dots (<= ~1/3) elsewhere: never a 50% checkerboard
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const c = cover(x, y);
    if (c >= 0.85 || (c > 0.08 && bayer(x, y, c * 0.36))) t.tone(x, y, amt);
  }
}

/** Solid per-row darkening (contact shadows, ambient occlusion under ledges). */
function rowShade(t, x0, x1, y0, amounts) {
  amounts.forEach((a, i) => { for (let x = x0; x <= x1; x++) t.tone(x, y0 + i, a); });
}

/** Diagonal yellow/black hazard stripes in a box. */
function hazard(t, x0, y0, w, h, { period = 8, phase = 0, ht = 0.58 } = {}) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const k = (((x + y + phase) % period) + period) % period;
    const yellow = k < period / 2;
    const edge = y === y0 ? 1 : y === y0 + h - 1 ? -1 : 0;
    const c = yellow ? (edge > 0 ? GD[5] : edge < 0 ? GD[3] : GD[4]) : (edge > 0 ? '#2b2932' : HAZ_K);
    t.px(x, y, c, ht);
  }
}

/** Worn paint chips on a region: little clusters of a different colour (bare metal / darker paint). */
function chips(t, r, x0, y0, w, h, n, colors, ht = null) {
  for (let i = 0; i < n; i++) {
    const x = x0 + Math.floor(r() * w), y = y0 + Math.floor(r() * h);
    const c = colors[Math.floor(r() * colors.length)];
    t.px(x, y, c, ht);
    if (r() < 0.6) t.px(x + 1, y, c, ht);
    if (r() < 0.35) t.px(x, y + 1, c, ht);
  }
}

// ---------------------------------------------------------------- pixel font (5x7, variable width)

const GLYPHS = {
  A: ['.##.', '#..#', '#..#', '####', '#..#', '#..#', '#..#'],
  B: ['###.', '#..#', '#..#', '###.', '#..#', '#..#', '###.'],
  C: ['.###', '#...', '#...', '#...', '#...', '#...', '.###'],
  D: ['###.', '#..#', '#..#', '#..#', '#..#', '#..#', '###.'],
  E: ['####', '#...', '#...', '###.', '#...', '#...', '####'],
  G: ['.###', '#...', '#...', '#.##', '#..#', '#..#', '.###'],
  H: ['#..#', '#..#', '#..#', '####', '#..#', '#..#', '#..#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  K: ['#..#', '#..#', '#.#.', '##..', '#.#.', '#..#', '#..#'],
  N: ['#..#', '##.#', '##.#', '#.##', '#.##', '#..#', '#..#'],
  O: ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'],
  P: ['###.', '#..#', '#..#', '###.', '#...', '#...', '#...'],
  R: ['###.', '#..#', '#..#', '###.', '#.#.', '#..#', '#..#'],
  S: ['.###', '#...', '#...', '.##.', '...#', '...#', '###.'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  0: ['.##.', '#..#', '#.##', '#..#', '##.#', '#..#', '.##.'],
  1: ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
  2: ['.##.', '#..#', '...#', '..#.', '.#..', '#...', '####'],
  7: ['####', '...#', '..#.', '..#.', '.#..', '.#..', '.#..'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
};

// 3x5 stencil digits for crate/locker numbering
const DIGITS = {
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
  5: ['###', '#..', '##.', '..#', '##.'],
  7: ['###', '..#', '.#.', '.#.', '.#.'],
  9: ['###', '#.#', '###', '..#', '##.'],
};

function textWidth(str, font = GLYPHS) {
  let w = 0;
  for (const ch of str) w += font[ch][0].length + 1;
  return w - 1;
}

function drawText(str, x, y, plot, font = GLYPHS) {
  for (const ch of str) {
    const g = font[ch];
    for (let j = 0; j < g.length; j++) for (let i = 0; i < g[j].length; i++) if (g[j][i] === '#') plot(x + i, y + j);
    x += g[0].length + 1;
  }
}

// ---------------------------------------------------------------- floors

function plateBase(t, base = S, { seam = 0, lit = 4, body = 3, dark = 2 } = {}) {
  t.rect(0, 0, 32, 32, base[body], 0.55);
  t.hline(1, 31, 1, base[lit]).vline(1, 1, 31, base[lit]).px(1, 1, base[lit + 1]);
  t.hline(1, 31, 31, base[dark], 0.5).vline(31, 1, 31, base[dark], 0.5);
  t.hline(0, 31, 0, base[seam], 0.06).vline(0, 0, 31, base[seam], 0.06);
}

/** Grime collecting along the plate seams and in the corners. */
function seamGrime(t, seed, strength = 1) {
  grime(t, 1, 1, 31, 31, (x, y) => {
    const d = Math.min(x - 1, y - 1, 31 - x, 31 - y);
    const n = fbm(x * 0.35, y * 0.35, seed, 2, 11, 11);
    return (0.42 - d * 0.14 + (n - 0.5) * 0.5) * strength;
  }, -0.05);
}

/** Engraved 1px groove around a rectangle: dark groove, lit far lip (light from the upper-left). */
function engrave(t, x0, y0, x1, y1, dark, lit, ht = 0.4) {
  t.hline(x0, x1, y0, dark, ht).vline(x0, y0, y1, dark, ht).hline(x0, x1, y1, dark, ht).vline(x1, y0, y1, dark, ht);
  t.hline(x0 + 1, x1 - 1, y0 + 1, lit).vline(x0 + 1, y0 + 1, y1 - 1, lit);
  t.hline(x0 + 1, x1, y1 + 1, lit).vline(x1 + 1, y0 + 1, y1 + 1, lit);
}

/** Low-contrast diamond tread: short diagonal bars in a herringbone, each with a lit tip and a shadow. */
function tread(t, x0, y0, x1, y1, polished = null) {
  for (let j = 0, y = y0; y + 2 <= y1; j++, y += 4) {
    for (let x = x0 + (j % 2) * 2; x + 2 <= x1; x += 4) {
      const pol = polished && polished(x, y);
      const body = pol ? S[4] : mix(S[3], S[4], 0.6);
      const tip = pol ? S[5] : S[4];
      const pts = j % 2 ? [[0, 0], [1, 1]] : [[1, 0], [0, 1]];
      for (const [bx, by] of pts) t.tone(x + bx + 1, y + by + 1, -0.06);
      for (const [bx, by] of pts) t.px(x + bx, y + by, body, 0.66);
      t.px(x + pts[0][0], y + pts[0][1], tip);
    }
  }
}

function paintFloorPlate(t, worn = false) {
  const r = rng(worn ? 211 : 101);
  plateBase(t);
  engrave(t, 4, 4, 27, 27, S[2], S[4]);
  tread(t, 7, 7, 25, 25, worn ? (x, y) => Math.abs(x - 15) < 6 + (y % 3) : null);
  bolt(t, 2, 2); bolt(t, 28, 2); bolt(t, 2, 28);
  if (worn) {
    // sheared bolt: empty dark socket
    t.px(28, 28, S[0], 0.2).px(29, 28, S[1], 0.25).px(28, 29, S[1], 0.25).px(29, 29, S[2], 0.35);
  } else bolt(t, 28, 28);
  seamGrime(t, worn ? 57 : 31, worn ? 1.4 : 1);
  const scratches = worn ? 6 : 2;
  for (let i = 0; i < scratches; i++) {
    const a = -0.4 + r() * 0.8;
    scratch(t, r, 6 + r() * 20, 6 + r() * 20, 4 + r() * (worn ? 8 : 4), Math.cos(a), Math.sin(a) * 0.5, worn ? 0.08 : 0.05);
  }
  if (worn) {
    // walking polish down the middle, an oil stain with a cold sheen, rust grime in one corner
    grime(t, 9, 5, 14, 22, (x) => 0.7 - Math.abs(x - 15.5) * 0.08, 0.05);
    const drops = [[21, 21.5, 3.6], [18.2, 23.4, 2.1], [24.6, 18.6, 1.3]];
    for (let y = 16; y < 28; y++) for (let x = 15; x < 28; x++) {
      const d = Math.min(...drops.map(([cx, cy, rr]) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / rr));
      const e = d + (fbm(x * 0.6, y * 0.6, 9, 2) - 0.5) * 0.35;
      if (e < 0.9) t.tint(x, y, '#0d1019', 0.7);
      else if (e < 1.2 && bayer(x, y, 0.3)) t.tint(x, y, '#0d1019', 0.4);
    }
    t.px(19, 20, '#46557a').px(20, 19, '#3a4766').px(21, 19, '#2f3a58').px(17, 23, '#2b3350');
    for (let y = 20; y < 32; y++) for (let x = 1; x < 11; x++) {
      const c = 0.85 - Math.hypot(x - 1, y - 31) * 0.1 + (fbm(x * 0.5, y * 0.5, 4, 2) - 0.5) * 0.5;
      if (c >= 0.7 || (c > 0.1 && bayer(x, y, c * 0.4))) t.tint(x, y, AM[0], 0.4);
    }
  }
}

function paintFloorGrate(t) {
  plateBase(t);
  bolt(t, 2, 2); bolt(t, 28, 2); bolt(t, 2, 28); bolt(t, 28, 28);
  // opening rim (recessed): shadowed top/left inner wall, lit bottom/right
  const x0 = 5, y0 = 5, x1 = 26, y1 = 26;
  t.hline(x0 - 1, x1 + 1, y0 - 1, S[1], 0.3).vline(x0 - 1, y0 - 1, y1 + 1, S[1], 0.3);
  t.hline(x0 - 1, x1 + 1, y1 + 1, S[5], 0.5).vline(x1 + 1, y0 - 1, y1 + 1, S[5], 0.5);
  t.hline(x0 - 2, x1 + 2, y0 - 2, S[4]).vline(x0 - 2, y0 - 2, y1 + 2, S[4]);
  const glow = [AM[1], AM[2], AM[3], AM[4], AM[5]];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const slat = (y - y0) % 4;
    if (slat === 0) t.px(x, y, S[5], 0.62);
    else if (slat === 1) t.px(x, y, S[3], 0.58);
    else if (x === 15 || x === 16) t.px(x, y, x === 15 ? '#1a0c06' : '#2a1308', 0.1); // support beam below
    else {
      // under-glow: brightest in the middle of the opening, a shadow just below each slat
      const d = Math.hypot((x - 15.5) / 11, (y - 15.5) / 11);
      let k = (1 - d) * 4.2 - (slat === 2 ? 1.2 : 0);
      k = Math.floor(k) + (bayer(x, y, k - Math.floor(k)) ? 1 : 0);
      const c = glow[Math.max(0, Math.min(glow.length - 1, k))];
      t.glow(x, y, c, k <= 0 ? '#2a1205' : c);
      t.ht(x, y, 0.02);
    }
  }
  // slat ends catch some glow
  for (let y = y0; y <= y1; y += 4) t.px(15, y + 1, S[2]).px(16, y + 1, S[2]);
  seamGrime(t, 77, 0.8);
}

function paintFloorHazard(t) {
  const r = rng(303);
  plateBase(t);
  // band along the north edge (top of the texture)
  t.hline(1, 31, 2, S[1], 0.5);
  hazard(t, 0, 3, 32, 10, { ht: 0.6 });
  t.hline(0, 31, 13, S[1], 0.5).hline(1, 31, 14, S[4]);
  // chipped / scuffed paint
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * 32), y = 3 + Math.floor(r() * 10);
    const c = t.get(x, y);
    const yellow = c[0] > 150;
    t.px(x, y, yellow ? (r() < 0.5 ? S[4] : GD[2]) : S[2], 0.55);
    if (r() < 0.5) t.px(x + 1, y, yellow ? GD[2] : S[2], 0.55);
  }
  for (let i = 0; i < 5; i++) scratch(t, r, r() * 30, 4 + r() * 8, 3 + r() * 5, 1, 0.2, 0.1);
  bolt(t, 4, 22); bolt(t, 26, 22);
  // stencilled chevrons below the band
  for (let k = 0; k < 2; k++) {
    const cx = 13 + k * 6;
    for (let i = 0; i < 3; i++) t.px(cx + i, 19 + i, GD[2]).px(cx + i, 25 - i, GD[2]);
  }
  seamGrime(t, 13, 1.1);
}

function paintFloorBridge(t) {
  const B = BRIDGE;
  t.rect(0, 0, 32, 32, B[2], 0.55);
  // polished reflection: two diagonal bands (period 32, so the tiling is seamless)
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const k = ((x - y) % 32 + 32) % 32;
    const wide = 1 - Math.abs(k - 12) / 9;
    if (wide > 0 && bayer(x, y, wide * 0.8)) t.px(x, y, B[3]);
    if (k === 20 || (k === 21 && bayer(x, y, 0.5))) t.px(x, y, B[4]);
  }
  t.hline(1, 31, 1, B[4]).vline(1, 1, 31, B[4]);
  t.hline(1, 31, 31, B[1], 0.5).vline(31, 1, 31, B[1], 0.5);
  t.hline(0, 31, 0, B[0], 0.08).vline(0, 0, 31, B[0], 0.08);
  // engraved centre emblem (diamond) in a slightly lighter tone
  for (let i = 0; i <= 5; i++) {
    t.px(16 - i, 10 + i, B[4], 0.48).px(16 + i, 10 + i, B[4], 0.48);
    t.px(16 - i, 22 - i, B[3], 0.48).px(16 + i, 22 - i, B[3], 0.48);
  }
  t.px(16, 16, B[5]);
  // cyan inlay running in the seams, with a small soft node where four plates meet
  for (let d = -3; d <= 3; d++) {
    if (d === 0) continue;
    const c = Math.abs(d) === 1 ? CY[3] : CY[2];
    t.glow(d, 0, c).glow(0, d, c);
    t.ht(d, 0, 0.3).ht(0, d, 0.3);
  }
  t.glow(0, 0, CY[4]).ht(0, 0, 0.35);
  // dim inlay continues along the rest of the seam
  for (let d = 6; d <= 26; d++) {
    if (d % 3 === 0) { t.glow(d, 0, CY[1], CY[1]); t.glow(0, d, CY[1], CY[1]); }
  }
  // tiny corner markers
  for (const [x, y] of [[6, 6], [25, 6], [6, 25], [25, 25]]) t.px(x, y, B[5], 0.6).tone(x + 1, y + 1, -0.1);
}

/** Feathery frost crystal: a spine with short side branches. */
function frostFern(t, x, y, dx, dy, len, c, c2) {
  for (let i = 0; i < len; i++) {
    const px = Math.round(x + dx * i), py = Math.round(y + dy * i);
    t.px(px, py, c, 0.62);
    if (i % 2 === 1 && i < len - 1) {
      t.px(px - dy, py + dx, c2).px(px + dy, py - dx, c2);
    }
  }
}

function paintFloorCryo(t) {
  const F = FROST;
  const r = rng(404);
  plateBase(t, F, { seam: 1, lit: 4, body: 3, dark: 2 });
  engrave(t, 4, 4, 27, 27, F[2], F[4], 0.45);
  // inner plate a touch colder, with a faint heating grid under the frost
  const inner = mix(F[2], F[3], 0.6);
  for (let y = 6; y < 27; y++) for (let x = 6; x < 27; x++) t.px(x, y, inner);
  for (let y = 9; y < 25; y += 5) t.hline(9, 23, y, shade(inner, -0.035), 0.53);
  t.vline(16, 7, 25, shade(inner, -0.03), 0.53);
  bolt(t, 2, 2, F, 6); bolt(t, 28, 2, F, 6); bolt(t, 2, 28, F, 6); bolt(t, 28, 28, F, 6);
  // frost: solid in the corners and along the seams, thinning to sparse crystals
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const ex = Math.min(x, 32 - x), ey = Math.min(y, 32 - y);
    const corner = Math.hypot(Math.min(ex, 9), Math.min(ey, 9));
    const n = fbm(x * 0.32, y * 0.32, 71, 3, 10.24, 10.24);
    const cov = 0.95 - Math.min(ex, ey) * 0.3 - corner * 0.07 + (n - 0.5) * 1.1;
    if (cov > 0.95) t.px(x, y, F[5], 0.6);
    else if (cov > 0.55 && bayer(x, y, (cov - 0.55) * 0.8)) t.px(x, y, F[5], 0.58);
    if (cov > 1.25 && bayer(x, y, 0.3)) t.px(x, y, F[6]);
  }
  // feathery crystals creeping in from the edges
  frostFern(t, 6, 13, 1, 0.5, 6, F[4], F[4]);
  frostFern(t, 25, 9, -1, 0.6, 5, F[4], F[4]);
  frostFern(t, 12, 26, 0.5, -1, 6, F[4], F[4]);
  frostFern(t, 21, 22, 0.8, 0.8, 4, F[5], F[4]);
  for (let i = 0; i < 5; i++) t.px(7 + r() * 18, 7 + r() * 18, F[6]);
}

// ---------------------------------------------------------------- walls (32 px per unit, 96 px tall)

// Shared vertical layout so walls, doors and windows line up when mixed in one run:
//   0-7 top trim | 8-52 upper panel | 53-57 hand rail | 58-81 ribbed lower panel | 82-95 kickplate
const W_RAIL = 53, W_KICK = 82;

function wallTrim(t, w) {
  const rows = [[S[6], 0.82], [S[5], 0.9], [S[4], 0.9], [G[4], 0.86], [G[5], 0.88], [G[3], 0.86], [G[2], 0.78], [S[0], 0.22]];
  rows.forEach(([c, h], y) => t.hline(0, w - 1, y, c, h));
  for (let x = 7; x < w; x += 16) { t.px(x, 4, S[6], 0.95).px(x + 1, 4, S[5], 0.95).px(x + 1, 5, G[2]); }
}

function wallRail(t, w) {
  const rows = [[S[2], 0.6], [S[6], 0.88], [S[5], 0.9], [S[3], 0.85], [S[1], 0.55]];
  rows.forEach(([c, h], i) => t.hline(0, w - 1, W_RAIL + i, c, h));
  t.hline(0, w - 1, W_RAIL + 5, shade(S[3], -0.1));
}

function wallKick(t, w, r) {
  const rows = [[G[0], 0.2], [G[5], 0.74], [G[4], 0.72], [G[3], 0.7], [G[3], 0.7], [G[3], 0.7], [G[3], 0.7],
    [G[3], 0.7], [G[3], 0.7], [G[3], 0.7], [G[2], 0.68], [G[2], 0.66], [G[1], 0.6], [G[0], 0.5]];
  rows.forEach(([c, h], i) => t.hline(0, w - 1, W_KICK + i, c, h));
  for (let x = 0; x < w; x += 32) {
    t.vline(x, W_KICK + 1, 95, G[0], 0.3).vline(x + 1, W_KICK + 2, 93, G[4]);
    bolt(t, x + 4, W_KICK + 5, G, 5);
    bolt(t, x + 26, W_KICK + 5, G, 5);
  }
  // scuffs from boots and carts, grime at the floor line
  for (let i = 0; i < Math.ceil(w / 32) * 4; i++) {
    const x = Math.floor(r() * w), y = W_KICK + 4 + Math.floor(r() * 7), len = 2 + Math.floor(r() * 4);
    for (let k = 0; k < len; k++) t.tone(x + k, y, 0.07);
  }
  grime(t, 0, W_KICK + 6, w, 8, (x, y) => (y - (W_KICK + 6)) / 9 + (fbm(x * 0.3, y * 0.3, 21, 2) - 0.5) * 0.5, -0.06);
}

/** Lower panel: horizontal ribs. Upper panel: seam bevel + rivets. Shared by every wall variant. */
function wallBody(t, w, r) {
  t.rect(0, 8, w, W_KICK - 8, S[3], 0.55);
  // ribbed lower panel
  for (let y = W_RAIL + 6; y < W_KICK; y++) {
    const k = (y - (W_RAIL + 6)) % 4;
    if (k === 1) t.hline(0, w - 1, y, S[4], 0.62);
    else if (k === 0) t.hline(0, w - 1, y, S[1], 0.34);
  }
  for (let x = 0; x < w; x += 32) {
    // vertical unit seam with bevels
    for (const [y0, y1] of [[8, W_RAIL - 1], [W_RAIL + 5, W_KICK - 1]]) {
      t.vline(x, y0, y1, S[0], 0.08).vline(x + 1, y0, y1, S[4]).vline(x + 31, y0, y1, S[2]);
    }
  }
  // shadow under the trim and over the rail, dust on the rail top
  t.hline(0, w - 1, 8, S[1], 0.5).hline(0, w - 1, 9, S[2]);
  grime(t, 0, 10, w, 4, (x, y) => 0.5 - (y - 10) * 0.16, -0.05);
  grime(t, 0, W_RAIL - 4, w, 4, (x, y) => (y - (W_RAIL - 4)) * 0.12, -0.04);
  for (let i = 0; i < w / 4; i++) {
    const x = Math.floor(r() * w);
    if (r() < 0.6) t.tint(x, W_RAIL, '#6b6a66', 0.35);
  }
}

function wallFrame(t, seed) {
  const r = rng(seed);
  wallBody(t, 32, r);
  wallTrim(t, 32);
  wallRail(t, 32);
  wallKick(t, 32, r);
  return r;
}

/** Upper-panel filler for the plain wall: recessed inset with two cross grooves and an ID tag. */
function wallInset(t) {
  recess(t, 5, 13, 22, 35, mix(S[2], S[3], 0.55), S[1], S[4], 0.4);
  for (const y of [25, 37]) t.hline(6, 25, y, S[1], 0.32).hline(6, 25, y + 1, S[4], 0.42);
  // amber ID tag with stencil ticks
  t.rect(8, 16, 7, 4, AM[2], 0.45).hline(8, 14, 16, AM[3]).hline(8, 14, 19, AM[1]);
  t.px(9, 17, AM[0]).px(10, 17, AM[0]).px(12, 17, AM[0]).px(9, 18, AM[0]).px(11, 18, AM[0]).px(12, 18, AM[0]).px(13, 18, AM[0]);
  // service slots + a dim status LED in the lower sub-panel
  for (let y = 40; y < 46; y += 2) t.hline(15, 23, y, S[1], 0.3).hline(15, 23, y + 1, S[4], 0.45);
  t.glow(9, 41, GN[3], GN[3]).px(9, 43, S[1]);
  rivet(t, 23, 16); rivet(t, 23, 29); rivet(t, 8, 29);
  t.px(12, 14, S[5]).px(6, 31, S[5]);
}

function wallRivets(t) {
  bolt(t, 3, 11); bolt(t, 27, 11); bolt(t, 3, 48); bolt(t, 27, 48);
}

function paintWallPanel(t) {
  const r = wallFrame(t, 501);
  wallInset(t);
  wallRivets(t);
  for (let i = 0; i < 4; i++) scratch(t, r, 3 + r() * 26, 60 + r() * 18, 3 + r() * 5, 1, (r() - 0.5) * 0.4, 0.06);
}

function paintWallVent(t) {
  const r = wallFrame(t, 502);
  wallRivets(t);
  // vent housing
  raised(t, 5, 13, 22, 33, G[3], G[4], G[1], 0.62);
  t.rect(7, 15, 18, 29, VOID, 0.05);
  // louvres: each slat = lit top edge, body, dark gap with the fan blades faintly visible behind
  for (let y = 15; y < 44; y += 3) {
    t.hline(7, 24, y, S[5], 0.7).hline(7, 24, y + 1, S[3], 0.62);
    for (let x = 7; x < 25; x++) {
      const a = Math.atan2(y + 2 - 29.5, x - 15.5);
      const blade = Math.sin(a * 4 + 0.6) > 0.55;
      t.px(x, y + 2, blade ? '#151b28' : VOID, 0.06);
    }
  }
  t.hline(7, 24, 15, S[6]);
  // dust streaks bleeding down from the vent
  for (let x = 7; x < 25; x++) {
    const len = Math.floor(fbm(x * 0.6, 3, 33, 2) * 9);
    for (let y = 46; y < 46 + len; y++) if (bayer(x, y, 0.36 - 0.3 * (y - 46) / (len + 1))) t.tone(x, y, -0.06);
  }
  // amber hazard tag
  t.rect(22, 47, 3, 2, AM[3], 0.5).px(22, 47, AM[4]);
}

function paintWallScreen(t, f) {
  const r = wallFrame(t, 503);
  wallRivets(t);
  // monitor bezel and glass
  raised(t, 3, 13, 26, 27, G[2], G[4], G[0], 0.66);
  t.hline(4, 27, 14, G[3]);
  const sx = 5, sy = 15, sw = 22, sh = 21;
  const bg = '#041820', bg2 = '#06222c';
  for (let y = sy; y < sy + sh; y++) for (let x = sx; x < sx + sw; x++) {
    const c = (y + f) % 2 ? bg : bg2;
    t.glow(x, y, c, c);
    t.ht(x, y, 0.45);
  }
  // header bar with blinking dots
  for (let x = sx; x < sx + sw; x++) t.glow(x, sy, CY[1]);
  t.glow(sx + 1, sy, f % 2 ? GLOW.amber : CY[3]).glow(sx + 3, sy, CY[4]).glow(sx + 5, sy, CY[3]);
  // waveform scrolling left
  for (let x = sx; x < sx + sw; x++) {
    const v = Math.sin((x - sx + f * 4) * 0.55) * 2.2 + Math.sin((x - sx + f * 4) * 1.3) * 1.2;
    const y = Math.round(sy + 6 + v);
    t.glow(x, y, CY[4]);
    t.glow(x, y + 1, CY[2]);
  }
  // text lines (left), bar graph (right)
  const lines = [[2, 9], [2, 6], [2, 11], [2, 7]];
  lines.forEach(([x0, len], i) => {
    const y = sy + 12 + i * 2;
    const l = i === (f % 4) ? Math.max(2, len - 3) : len;
    for (let x = 0; x < l; x++) if ((x + i) % 5 !== 3) t.glow(sx + x0 + x, y, i === 0 ? TE[4] : CY[3]);
  });
  const bars = [[4, 6, 3, 5], [6, 3, 5, 4], [3, 5, 6, 2], [5, 4, 2, 6]][f];
  bars.forEach((hgt, i) => {
    const x = sx + 15 + i * 2;
    for (let y = 0; y < hgt; y++) t.glow(x, sy + sh - 2 - y, y === hgt - 1 ? CY[5] : hgt > 5 ? GLOW.amber : CY[3]);
  });
  // cursor + corner glare
  if (f % 2 === 0) t.glow(sx + 2 + 9, sy + 18, CY[5]);
  t.glow(sx + sw - 2, sy + 2, '#9fe8ff').glow(sx + sw - 3, sy + 3, '#3a8fb8');
  // status LED + speaker grille under the screen
  t.glow(25, 37, f % 2 ? GN[4] : GN[2], f % 2 ? GLOW.green : GN[2]);
  for (let x = 6; x < 14; x += 2) t.px(x, 37, G[0], 0.5);
  for (let i = 0; i < 3; i++) scratch(t, r, 3 + r() * 26, 62 + r() * 16, 3 + r() * 4, 1, 0, 0.06);
}

function cylinder(t, x0, x1, y0, d, ramp) {
  for (let i = 0; i < d; i++) {
    const k = Math.min(ramp.length - 1, Math.floor((i / d) * ramp.length));
    const ht = 0.45 + 0.55 * Math.sin(Math.PI * (i + 0.5) / d);
    t.hline(x0, x1, y0 + i, ramp[k], ht);
  }
}

function pipeClamp(t, x, y0, d, h = 2) {
  for (let i = -1; i <= d; i++) {
    const c = i === -1 ? G[4] : i === d ? G[1] : i < d / 2 ? G[5] : G[3];
    t.hline(x, x + h, y0 + i, c, 0.98);
  }
  t.px(x + 1, y0 + (d >> 1), S[6]);
}

function paintWallPipes(t) {
  const r = rng(504);
  // recessed back wall
  t.rect(0, 8, 32, W_KICK - 8, S[1], 0.3);
  for (let y = 8; y < W_KICK; y++) if (y % 12 === 0) t.hline(0, 31, y, S[0], 0.25).hline(0, 31, y + 1, S[2], 0.32);
  // structural rib between units
  t.rect(0, 8, 3, W_KICK - 8, S[3], 0.6).vline(0, 8, W_KICK - 1, S[4]).vline(2, 8, W_KICK - 1, S[2]);
  for (let y = 12; y < W_KICK; y += 10) rivet(t, 1, y, S, 6);
  t.hline(0, 31, 8, S[0], 0.2);
  // pipes (shadow below each first)
  const steel = [S[3], S[5], S[6], S[5], S[4], S[4], S[3], S[3], S[2], S[1]];
  const copper = ['#8a4a1c', '#e6a466', '#c8773a', '#a85f2a', '#7a3f18', '#4f260e'];
  const coolant = [TE[2], TE[4], TE[3], TE[1]];
  const dark = [G[3], G[5], G[4], G[4], G[3], G[3], G[2], G[1]];
  const pipes = [[12, 10, steel], [26, 6, copper], [36, 4, coolant], [42, 4, coolant], [50, 8, dark], [63, 10, steel]];
  for (const [y, d] of pipes) rowShade(t, 3, 31, y + d, [-0.14, -0.05]);
  for (const [y, d, ramp] of pipes) cylinder(t, 0, 31, y, d, ramp);
  // colour bands / flow arrows on the coolant lines
  for (const y of [36, 42]) {
    t.rect(20, y, 3, 4, GD[4], 0.95).vline(20, y, y + 3, GD[5]).vline(22, y, y + 3, GD[2]);
    t.px(9, y + 1, TE[5]).px(10, y + 1, TE[5]).px(11, y + 2, TE[5]).px(10, y + 2, TE[4]);
  }
  // hazard band on the dark pipe, flange on the big lower pipe, clamps
  hazard(t, 9, 51, 6, 6, { period: 4, ht: 0.95 });
  pipeClamp(t, 25, 12, 10); pipeClamp(t, 25, 63, 10);
  pipeClamp(t, 5, 26, 6, 1); pipeClamp(t, 13, 50, 8, 1);
  for (let y = 62; y < 74; y++) {
    const c = y === 62 ? S[6] : y < 66 ? S[5] : y < 70 ? S[4] : S[2];
    t.hline(4, 6, y, c, 1);
  }
  t.px(5, 64, S[7]).px(5, 70, S[1]);
  // junction box with a status LED
  raised(t, 11, 74, 10, 7, G[3], G[5], G[1], 0.82);
  t.hline(13, 17, 76, G[1], 0.7).hline(13, 17, 78, G[1], 0.7);
  t.glow(19, 76, GN[4], GLOW.green).px(19, 78, G[2]);
  wallTrim(t, 32);
  wallKick(t, 32, r);
  // rust weeping from the copper joints
  for (let y = 32; y < 36; y++) if (bayer(8, y, 0.6)) t.tint(8, y, '#6f350f', 0.6);
}

function paintWallCap(t) {
  t.rect(0, 0, 32, 32, G[2], 0.55);
  t.hline(0, 31, 0, G[0], 0.1).vline(0, 0, 31, G[0], 0.1);
  t.hline(1, 31, 1, G[3]).vline(1, 1, 31, G[3]);
  t.hline(1, 31, 31, G[1], 0.5).vline(31, 1, 31, G[1], 0.5);
  // raised centre rib with bolts
  raised(t, 1, 13, 31, 6, G[3], G[4], G[1], 0.68);
  t.hline(1, 31, 15, G[4]);
  for (const x of [5, 21]) bolt(t, x, 15, G, 5);
  for (let y = 3; y < 12; y += 3) t.hline(4, 27, y, shade(G[2], -0.04), 0.52);
  for (let y = 21; y < 30; y += 3) t.hline(4, 27, y, shade(G[2], -0.04), 0.52);
  grime(t, 0, 0, 32, 32, (x, y) => fbm(x * 0.25, y * 0.25, 5, 3, 8, 8) - 0.45, -0.05);
}

function paintWallLow(t) {
  const r = rng(506);
  t.rect(0, 0, 32, 24, S[3], 0.55);
  t.hline(0, 31, 0, S[6], 0.85).hline(0, 31, 1, S[5], 0.9).hline(0, 31, 2, S[4], 0.88).hline(0, 31, 3, S[1], 0.5);
  t.vline(0, 4, 18, S[0], 0.08).vline(1, 4, 18, S[4]).vline(31, 4, 18, S[2]);
  hazard(t, 2, 6, 29, 3, { period: 6, ht: 0.58 });
  t.hline(2, 30, 9, S[2]);
  t.hline(2, 30, 13, S[1], 0.34).hline(2, 30, 14, S[4], 0.6);
  bolt(t, 4, 15); bolt(t, 26, 15);
  t.hline(0, 31, 19, G[0], 0.2).hline(0, 31, 20, G[4], 0.72).hline(0, 31, 21, G[3], 0.7).hline(0, 31, 22, G[2], 0.68).hline(0, 31, 23, G[1], 0.6);
  chips(t, r, 2, 6, 29, 3, 6, [S[4], GD[2]]);
  grime(t, 0, 16, 32, 8, (x, y) => (y - 16) / 9 + (fbm(x * 0.4, y * 0.4, 8, 2) - 0.5) * 0.5, -0.06);
}

// ---------------------------------------------------------------- doors and windows

function paintDoor(t, locked) {
  const r = rng(601);
  const LED = locked ? [CR[1], CR[3], CR[4], GLOW.red] : [GN[1], GN[3], GN[4], GLOW.green];
  t.rect(0, 0, 32, 96, S[3], 0.55);
  wallTrim(t, 32);
  // lintel housing with the status strip
  t.rect(0, 8, 32, 6, G[3], 0.7);
  t.hline(0, 31, 8, G[4]).hline(0, 31, 13, G[0], 0.3);
  t.rect(5, 10, 22, 2, G[0], 0.4);
  for (let x = 6; x < 26; x++) {
    const seg = (x - 6) % 5 === 4;
    t.glow(x, 10, seg ? LED[0] : LED[2], seg ? LED[0] : LED[3]);
    t.glow(x, 11, seg ? LED[0] : LED[1], seg ? LED[0] : LED[2]);
  }
  // two leaves meeting in the middle
  const leafA = [S[4], S[5], S[2]];
  for (const [x0, x1] of [[1, 14], [17, 30]]) {
    raised(t, x0, 14, x1 - x0 + 1, 80, leafA[0], leafA[1], leafA[2], 0.62);
    // window slot
    recess(t, x0 + 3, 21, x1 - x0 - 5, 12, '#0a1626', '#050a12', S[3], 0.3);
    t.px(x0 + 5, 23, '#3a6f8f').px(x0 + 6, 22, '#2a5470').px(x0 + 4, 24, '#2a5470');
    // recessed horizontal ribs
    for (const y of [40, 44, 64, 68]) t.hline(x0 + 2, x1 - 2, y, S[2], 0.5).hline(x0 + 2, x1 - 2, y + 1, S[5], 0.64);
    // hazard band
    hazard(t, x0 + 1, 74, x1 - x0 - 1, 8, { period: 8, phase: x0 < 10 ? 0 : 4, ht: 0.64 });
    chips(t, r, x0 + 1, 74, x1 - x0 - 1, 8, 5, [S[4], S[2]]);
  }
  // meeting seam with interlocking teeth
  t.vline(15, 14, 93, S[0], 0.1).vline(16, 14, 93, S[1], 0.2);
  for (let y = 50; y < 60; y += 4) {
    t.rect(14, y, 2, 2, S[4], 0.6).px(14, y, S[5]);
    t.rect(16, y + 2, 2, 2, S[4], 0.6).px(16, y + 2, S[5]);
  }
  // lock bolts
  for (const x of [11, 19]) { t.rect(x, 53, 3, 3, G[1], 0.5); t.glow(x + 1, 54, LED[2], LED[3]); }
  // threshold + floor shadow
  t.rect(0, 94, 32, 2, G[1], 0.5).hline(0, 31, 94, G[3]);
  t.vline(0, 8, 95, S[0], 0.1).vline(31, 8, 95, S[1], 0.2);
  grime(t, 1, 84, 30, 10, (x, y) => (y - 84) / 12, -0.06);
  for (let i = 0; i < 3; i++) scratch(t, r, 2 + r() * 26, 46 + r() * 16, 3 + r() * 4, 1, 0.1, 0.06);
}

function paintDoorFrame(t) {
  t.rect(0, 0, 8, 96, G[4], 0.7);
  wallTrim(t, 8);
  t.vline(0, 8, 95, S[5], 0.75).vline(1, 8, 95, S[4], 0.75).vline(6, 8, 95, G[2], 0.65).vline(7, 8, 95, S[0], 0.3);
  // light channel with amber guide lamps
  t.rect(3, 12, 2, 66, G[0], 0.3);
  for (let y = 15; y < 78; y += 9) {
    t.glow(3, y, AM[5], GLOW.amber).glow(4, y, AM[4], GLOW.amber);
    t.glow(3, y + 1, AM[3], AM[3]).glow(4, y + 1, AM[2], AM[2]);
  }
  bolt(t, 2, 9, G, 5);
  hazard(t, 1, 80, 6, 14, { period: 6, ht: 0.72 });
  t.hline(0, 7, 94, G[1], 0.5).hline(0, 7, 95, G[0], 0.4);
}

function paintWindowFrame(t) {
  const r = rng(701);
  t.rect(0, 0, 64, 96, S[3], 0.6);
  wallTrim(t, 64);
  // header beam
  t.rect(0, 8, 64, 6, S[4], 0.7);
  t.hline(0, 63, 8, S[1], 0.5).hline(0, 63, 9, S[5]).hline(0, 63, 13, S[2]);
  for (let x = 4; x < 64; x += 8) rivet(t, x, 11, S, 6);
  // jambs with bevels
  t.vline(0, 14, 81, S[0], 0.1).vline(1, 14, 81, S[5]).vline(63, 14, 81, S[2]);
  // sill
  const sill = [[S[6], 0.85], [S[5], 0.85], [S[4], 0.8], [S[4], 0.8], [S[3], 0.78], [S[2], 0.74], [S[1], 0.6], [S[2], 0.55]];
  sill.forEach(([c, h], i) => t.hline(0, 63, 74 + i, c, h));
  t.glow(8, 77, AM[4], GLOW.amber).glow(55, 77, AM[4], GLOW.amber);
  wallKick(t, 64, r);
  // two chamfered glass panes
  for (const x0 of [6, 34]) {
    const x1 = x0 + 23, y0 = 15, y1 = 72, cut = 4;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const cx = Math.min(x - x0, x1 - x), cy = Math.min(y - y0, y1 - y);
      if (cx + cy < cut) continue;
      const rim = cx === 0 || cy === 0 || cx + cy === cut;
      if (rim) {
        const lit = (x - x0 > (x1 - x0) / 2 && cx === 0) || (y - y0 > (y1 - y0) / 2 && cy === 0) || (cx + cy === cut && (x > x0 + 11) && (y > y0 + 28));
        t.put(x, y, lit ? S[5] : S[0], lit ? 0.5 : 0.3);
      } else t.put(x, y, null, 0.2);
    }
    // faint glare streaks on the glass (only visible with transparent blending)
    for (let k = 0; k < 2; k++) {
      const off = k ? 16 : 6;
      for (let i = 0; i < 18 - k * 8; i++) {
        const x = x0 + off + i, y = y1 - 6 - off - i * 2;
        if (y > y0 + 2 && x < x1 - 1) t.px(x, y, k ? '#d8f2ff26' : '#d8f2ff3a').px(x, y + 1, '#d8f2ff1c');
      }
    }
    for (let y = y1 - 6; y < y1; y++) for (let x = x0 + 1; x < x1; x++) if (bayer(x, y, (y - (y1 - 6)) / 14)) t.px(x, y, '#a8d8ff22');
  }
  // mullion
  t.rect(30, 14, 4, 60, S[3], 0.75);
  t.vline(30, 14, 73, S[4]).vline(33, 14, 73, S[1]);
  for (let y = 20; y < 72; y += 12) rivet(t, 31, y, S, 6);
  // chamfer corners of the frame read as bevelled metal
  for (let i = 0; i < 4; i++) {
    t.px(6 + i, 15 + 3 - i, S[4]).px(57 - i, 15 + 3 - i, S[2]);
    t.px(34 + i, 15 + 3 - i, S[4]).px(29 - i, 15 + 3 - i, S[2]);
  }
}

// ---------------------------------------------------------------- props

function paintConsoleFront(t, f) {
  t.rect(0, 0, 32, 32, G[3], 0.6);
  t.hline(0, 31, 0, S[5], 0.8).hline(0, 31, 1, S[4], 0.75);
  t.vline(0, 2, 27, G[4]).vline(31, 2, 27, G[1]);
  // angled screen
  raised(t, 2, 3, 28, 11, G[1], G[2], G[0], 0.62);
  const bg = ['#03141b', '#052029'];
  for (let y = 4; y < 13; y++) for (let x = 3; x < 29; x++) t.glow(x, y, bg[(y + f) % 2]).ht(x, y, 0.48);
  for (let x = 3; x < 29; x++) {
    const v = Math.round(8 + Math.sin((x + f * 3) * 0.7) * 2);
    t.glow(x, v, CY[3]);
  }
  const rows = [[4, 5, 7], [4, 7, 4], [4, 9, 6]];
  rows.forEach(([x0, y, len], i) => { for (let k = 0; k < len; k++) if ((k + i + f) % 4 !== 0) t.glow(x0 + k, y, i === f % 3 ? TE[5] : TE[3]); });
  t.glow(24, 5, f % 2 ? GLOW.amber : AM[2]).glow(26, 5, GLOW.green);
  t.glow(27, 11, '#9fe8ff');
  // button row
  t.rect(2, 15, 28, 6, G[2], 0.55).hline(2, 29, 15, G[1], 0.45).hline(2, 29, 20, G[4]);
  const caps = [CR[3], AM[4], GN[3], CY[3], RAMPS.navy[4]];
  caps.forEach((c, i) => {
    const x = 4 + i * 5;
    t.rect(x, 17, 3, 2, c, 0.75).hline(x, x + 2, 17, shade(c, 0.12)).hline(x, x + 2, 19, G[0], 0.5);
    const on = (i + f) % 3 !== 0;
    t.glow(x + 1, 16, on ? caps[i] : G[1], on ? caps[i] : '#000000');
  });
  // vent slots
  for (let y = 22; y < 27; y += 2) t.hline(6, 25, y, G[0], 0.3).hline(6, 25, y + 1, G[4], 0.62);
  t.rect(0, 28, 32, 4, G[0], 0.3).hline(0, 31, 28, G[1]);
  grime(t, 1, 21, 30, 7, (x, y) => (y - 21) / 10, -0.05);
}

function paintConsoleTop(t) {
  t.rect(0, 0, 32, 32, G[3], 0.6);
  t.hline(0, 31, 0, G[4]).vline(0, 0, 31, G[4]).hline(0, 31, 31, S[5], 0.7).vline(31, 0, 31, G[1]);
  // small rear monitor
  raised(t, 3, 2, 26, 9, G[1], G[2], G[0], 0.7);
  for (let y = 3; y < 10; y++) for (let x = 4; x < 28; x++) t.glow(x, y, y % 2 ? '#04161e' : '#062530').ht(x, y, 0.62);
  for (let x = 5; x < 26; x += 1) if (x % 4) t.glow(x, 5, CY[3]);
  for (let x = 5; x < 18; x++) if (x % 3) t.glow(x, 7, TE[4]);
  t.glow(24, 7, GLOW.amber).glow(25, 7, GLOW.amber);
  // keyboard
  t.rect(3, 14, 26, 12, G[1], 0.45);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
    const x = 4 + i * 3 + (j % 2), y = 15 + j * 3;
    if (x > 26) continue;
    t.rect(x, y, 2, 2, S[4], 0.62).px(x, y, S[5]).px(x + 1, y + 1, S[3]);
  }
  t.rect(9, 24, 12, 1, S[4], 0.6);
  // trackball and lit keys
  t.rect(24, 27, 3, 3, S[5], 0.7).px(24, 27, S[6]).px(26, 29, S[3]);
  t.glow(4, 28, CR[4], GLOW.red).glow(7, 28, GN[4], GLOW.green).glow(10, 28, CY[4]);
}

function paintCrateSide(t) {
  const r = rng(801);
  const P = CARGO;
  t.rect(0, 0, 32, 32, P[3], 0.55);
  // corrugated panel
  for (let y = 5; y < 28; y += 4) t.hline(3, 28, y, P[4], 0.62).hline(3, 28, y + 1, P[2], 0.5);
  // flat label plate with a stencilled number and a hazard tab
  raised(t, 6, 7, 14, 15, P[3], P[4], P[2], 0.6);
  drawText('07', 9, 9, (x, y) => t.px(x, y, P[5], 0.6));
  t.hline(9, 17, 17, P[5], 0.6);
  hazard(t, 7, 19, 12, 2, { period: 4, ht: 0.62 });
  // lock panel with status LED
  raised(t, 22, 9, 5, 9, G[2], G[3], G[0], 0.6);
  t.glow(24, 11, GN[4], GLOW.green).px(24, 14, G[0], 0.4).px(24, 15, G[0], 0.4);
  // rails and corner brackets (bare metal)
  raised(t, 0, 0, 32, 3, G[4], G[5], G[2], 0.75);
  raised(t, 0, 29, 32, 3, G[4], G[5], G[1], 0.75);
  raised(t, 0, 0, 3, 32, G[4], G[5], G[2], 0.75);
  raised(t, 29, 0, 3, 32, G[3], G[4], G[1], 0.75);
  for (const [x, y] of [[0, 0], [25, 0], [0, 25], [25, 25]]) {
    raised(t, x, y, 7, 7, S[4], S[5], S[2], 0.85);
    bolt(t, x + 2, y + 2, S, 6);
  }
  // restrained wear: a few bare-metal nicks on the edges, one scratch, grime low down
  for (const [x, y] of [[8, 3], [16, 28], [3, 14], [28, 19]]) t.px(x, y, S[4]).px(x + 1, y, S[3]);
  scratch(t, r, 21, 22, 6, 1, -0.3, 0.1);
  grime(t, 3, 21, 26, 8, (x, y) => (y - 21) / 8, -0.06);
}

function paintCrateTop(t) {
  const r = rng(802);
  const P = CARGO;
  t.rect(0, 0, 32, 32, P[3], 0.55);
  raised(t, 0, 0, 32, 32, P[3], P[4], P[1], 0.55);
  raised(t, 3, 3, 26, 26, P[3], P[4], P[2], 0.6);
  // recessed grip handles
  for (const y of [6, 23]) recess(t, 11, y, 10, 3, '#1a0e06', '#0e0804', P[4], 0.25);
  // stencil arrow
  for (let i = 0; i < 5; i++) t.hline(16 - i, 15 + i, 11 + i, P[5], 0.56);
  t.rect(14, 16, 4, 4, P[5], 0.56);
  for (const [x, y] of [[1, 1], [29, 1], [1, 29], [29, 29]]) bolt(t, x, y, S, 6);
  for (const [x, y] of [[7, 3], [24, 28], [3, 18]]) t.px(x, y, S[4]).px(x + 1, y, S[3]);
  scratch(t, r, 6, 21, 7, 1, -0.4, 0.09);
  scratch(t, r, 20, 8, 5, 1, 0.3, 0.09);
}

function paintLocker(t) {
  const r = rng(901);
  const L = LOCKER;
  t.rect(0, 0, 32, 64, L[2], 0.55);
  raised(t, 0, 0, 32, 64, L[2], L[4], L[0], 0.55);
  raised(t, 2, 2, 28, 56, L[3], L[4], L[1], 0.62);
  // vents
  for (const y0 of [6, 46]) for (let k = 0; k < 4; k++) {
    const y = y0 + k * 2;
    t.hline(7, 24, y, L[0], 0.35).hline(7, 24, y + 1, L[5], 0.65);
  }
  // name plate
  t.rect(9, 17, 14, 5, '#c9d0cf', 0.7).hline(9, 22, 17, '#e8ecea').hline(9, 22, 21, '#8e9895');
  for (let x = 11; x < 21; x++) if (x % 3 !== 1) t.px(x, 19, '#4a5452');
  // handle
  t.rect(24, 27, 3, 12, S[2], 0.6);
  t.vline(25, 27, 38, S[6], 0.95).vline(26, 27, 38, S[4], 0.9).vline(24, 28, 38, S[1]);
  t.px(25, 27, S[7]);
  t.px(25, 41, '#0b0e17').px(25, 42, S[4]);
  // stencil number
  drawText('12', 6, 26, (x, y) => t.px(x, y, L[5], 0.64), DIGITS);
  // dent + scratches + amber sticker
  for (let i = 0; i < 6; i++) t.tone(13 + i, 33 + (i > 2 ? 1 : 0), -0.08).tone(13 + i, 32 + (i > 2 ? 1 : 0), 0.06);
  for (let i = 0; i < 5; i++) scratch(t, r, 5 + r() * 20, 24 + r() * 30, 3 + r() * 6, 1, (r() - 0.5) * 0.6, 0.08);
  t.rect(6, 36, 4, 3, AM[3], 0.66).px(6, 36, AM[4]).px(9, 38, AM[1]);
  // feet
  t.rect(0, 58, 32, 6, G[1], 0.4).hline(0, 31, 58, G[0]);
  t.rect(3, 59, 4, 5, G[3], 0.6).rect(25, 59, 4, 5, G[3], 0.6);
  grime(t, 2, 48, 28, 10, (x, y) => (y - 48) / 14, -0.06);
}

function paintCryoPod(t) {
  const P = POD;
  t.rect(0, 0, 32, 64, P[2], 0.6);
  // side rails with coolant tubes
  for (const x0 of [0, 27]) {
    raised(t, x0, 0, 5, 64, P[1], P[3], P[0], 0.62);
    t.vline(x0 + 2, 4, 58, TE[2], 0.85).vline(x0 + 1, 4, 58, TE[3], 0.8).px(x0 + 1, 4, TE[4]);
    for (let y = 10; y < 58; y += 12) t.hline(x0, x0 + 4, y, P[4], 0.9).hline(x0, x0 + 4, y + 1, P[0], 0.7);
  }
  // cowl with status light
  t.rect(5, 0, 22, 9, P[3], 0.7).hline(5, 26, 0, P[5]).hline(5, 26, 8, P[1]);
  for (let x = 8; x < 24; x += 2) t.px(x, 3, P[1], 0.5).px(x, 4, P[4]);
  t.glow(15, 6, CY[5], GLOW.cyan).glow(16, 6, CY[4], GLOW.cyan);
  // capsule window
  const wx0 = 7, wx1 = 24, wy0 = 11, wy1 = 45, rad = 6;
  const inWin = (x, y, inset) => {
    const cx = Math.max(wx0 + rad + inset - x, 0, x - (wx1 - rad - inset));
    const cy = Math.max(wy0 + rad + inset - y, 0, y - (wy1 - rad - inset));
    return x >= wx0 + inset && x <= wx1 - inset && y >= wy0 + inset && y <= wy1 - inset && cx * cx + cy * cy <= rad * rad;
  };
  const glass = [CY[2], CY[3], '#5cc4ea', '#8fe0fa', '#c4f2ff', '#eafcff'];
  for (let y = wy0 - 1; y <= wy1 + 1; y++) for (let x = wx0 - 1; x <= wx1 + 1; x++) {
    if (inWin(x, y, 1)) {
      // frosted glass: bright frost at the rim, a dim sleeper silhouette inside
      const ex = Math.min(x - wx0, wx1 - x), ey = Math.min(y - wy0, wy1 - y);
      const edge = Math.min(ex, ey);
      const head = Math.hypot(x - 15.5, y - 19) < 3.6;
      const body = Math.abs(x - 15.5) < 5 - Math.max(0, 25 - y) && y > 22 && y < 44;
      let k = 2 + (y < 22 ? 1 : 0);
      if (head || body) k = 0;
      const frost = (4 - edge) / 4 + (fbm(x * 0.5, y * 0.5, 61, 2) - 0.5) * 0.6;
      if (frost > 0 && bayer(x, y, frost)) k = Math.min(5, k + 2 + (frost > 0.7 ? 1 : 0));
      const c = glass[k];
      t.glow(x, y, c, c).ht(x, y, 0.45);
    } else if (inWin(x, y, 0) || inWin(x + 1, y, 0) || inWin(x, y + 1, 0) || inWin(x - 1, y, 0) || inWin(x, y - 1, 0)) {
      const lit = x > 15 && y > 28;
      t.px(x, y, inWin(x, y, 0) ? '#1b2133' : lit ? P[4] : P[1], 0.7);
    }
  }
  t.glow(10, 16, '#ffffff').glow(11, 15, '#ffffff').glow(10, 17, '#d8f8ff');
  // control panel
  raised(t, 7, 48, 18, 9, P[1], P[2], P[0], 0.65);
  for (let y = 50; y < 55; y++) for (let x = 9; x < 17; x++) t.glow(x, y, y % 2 ? '#05222a' : '#073039');
  for (let x = 9; x < 16; x++) if (x % 3) t.glow(x, 51, TE[4]);
  t.glow(9, 53, TE[5]).glow(10, 53, TE[3]).glow(11, 53, TE[3]);
  t.glow(19, 50, GLOW.green).glow(21, 50, GLOW.green).glow(23, 50, AM[4], GLOW.amber);
  t.rect(19, 53, 5, 2, P[3], 0.75);
  // base
  t.rect(0, 58, 32, 6, G[2], 0.5).hline(0, 31, 58, P[4]).hline(0, 31, 63, G[0]);
  for (let x = 4; x < 28; x += 6) t.rect(x, 60, 3, 2, G[0], 0.3);
  // frost gathering on the lower window seal and along the base
  for (let y = 30; y < 64; y++) for (let x = 0; x < 32; x++) {
    const seal = inWin(x, y, -2) && !inWin(x, y, 0);
    const base = y === 57 || y === 58;
    if (!seal && !base) continue;
    const n = fbm(x * 0.5, y * 0.5, 62, 2);
    const cov = (seal ? (y - 30) / 16 : 0.7) + (n - 0.5);
    if (cov > 0.75) t.tint(x, y, '#eef8ff', 0.6);
    else if (cov > 0.3 && bayer(x, y, 0.3)) t.tint(x, y, '#eef8ff', 0.45);
  }
}

function paintPipe(t) {
  const r = rng(1001);
  t.rect(0, 0, 32, 32, S[4], 0.55);
  // brushed longitudinal streaks (the pipe runs along the texture's V axis)
  for (let x = 0; x < 32; x++) {
    const v = fbm(x * 0.7, 0, 13, 2, 22.4);
    if (v > 0.58) t.vline(x, 0, 31, S[5]);
    else if (v < 0.4) t.vline(x, 0, 31, S[3]);
  }
  // flange ring straddling the wrap (rows 29..2)
  const ring = [[29, S[2], 0.5], [30, S[6], 0.95], [31, S[5], 0.98], [0, S[5], 1], [1, S[4], 0.95], [2, S[1], 0.5]];
  for (const [y, c, h] of ring) t.hline(0, 31, y, c, h);
  for (let x = 2; x < 32; x += 8) { t.px(x, 31, S[7]).px(x + 1, 31, S[6]).px(x, 0, S[6]).px(x + 1, 0, S[3]); }
  // amber ID band with flow chevrons
  t.rect(0, 12, 32, 6, AM[3], 0.58).hline(0, 31, 12, AM[4]).hline(0, 31, 17, AM[2]);
  for (let x = 2; x < 32; x += 8) for (let i = 0; i < 3; i++) t.px(x + i, 13 + i, AM[1]).px(x + i, 16 - i, AM[1]);
  // weld seam
  for (let y = 3; y < 29; y++) if (y < 12 || y > 17) t.px(16, y, y % 2 ? S[6] : S[3], 0.62);
  t.px(9, 13, S[4]).px(10, 13, S[3]).px(25, 16, AM[1]);
  scratch(t, r, 4, 6, 6, 1, 0.2, 0.08);
  grime(t, 0, 3, 32, 26, (x, y) => fbm(x * 0.3, y * 0.3, 17, 2, 9.6, 9.6) - 0.5, -0.06);
}

function paintReactor(t, f) {
  // Energy column: a deep magenta glow with sinuous bright streams and pulse rings rising up.
  // Periodic in x (wraps around a cylinder) and y; each frame scrolls the field up by 16 px.
  const pal = ['#2a0626', '#4d0d40', '#7a1658', '#b0266a', '#e8474f', '#ff7a32', '#ffb347', '#ffe39a', '#fffbe8'];
  const n = pal.length;
  const streams = [[8, 3, 1, 0.0, 1], [26, 4, 2, 1.3, 0.85], [43, 3.5, 1, 2.6, 1], [56, 2.5, 3, 4.1, 0.7]];
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const yy = (y + f * 16) % 64;
    const p = (yy / 64) * Math.PI * 2;
    let v = 0.3 + 0.08 * Math.sin((x / 64) * Math.PI * 4 + p);
    for (const [cx, amp, m, ph, k] of streams) {
      const c = cx + Math.sin(p * m + ph) * amp;
      let d = Math.abs(x + 0.5 - c);
      d = Math.min(d, 64 - d);
      v += k * (0.62 * Math.exp(-(d * d) / 3.2) + 0.13 * Math.exp(-(d * d) / 30));
    }
    const ring = (yy % 32) - 16 + Math.sin((x / 64) * Math.PI * 2 + p * 2) * 1.5;
    v += 0.42 * Math.exp(-(ring * ring) / 4);
    v += (fbm(x / 8, yy / 8, 91, 2, 8, 8) - 0.5) * 0.14;
    const q = clamp01(v / 1.25) * (n - 1);
    let k = Math.floor(q);
    if (q - k > 0.7 && bayer(x, y, (q - k - 0.7) / 0.3)) k++;
    k = Math.min(n - 1, k);
    t.glow(x, y, pal[k]);
    t.ht(x, y, 0.45 + 0.1 * (k / n));
  }
}

function paintHoloTable(t, f) {
  const cx = 31.5, cy = 31.5;
  t.rect(0, 0, 64, 64, G[2], 0.5);
  raised(t, 0, 0, 64, 64, G[2], G[3], G[0], 0.5);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const dx = x + 0.5 - 32, dy = y + 0.5 - 32;
    const d = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx);
    if (d > 31.5) continue;
    if (d > 29) {
      // outer rim, shaded by angle (lit upper-left)
      const l = -Math.cos(a + Math.PI / 4);
      t.px(x, y, l > 0.35 ? S[6] : l > -0.2 ? S[5] : S[3], 0.85);
    } else if (d > 27) {
      const notch = Math.abs(((a / (Math.PI / 8)) % 1 + 1) % 1 - 0.5) > 0.42;
      t.px(x, y, notch ? G[1] : G[3], notch ? 0.55 : 0.7);
    } else {
      // projection glass
      const c = (Math.floor(d) % 2) ? '#03101a' : '#041420';
      t.glow(x, y, c, '#020a10').ht(x, y, 0.45);
    }
  }
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    t.glow(Math.floor(cx + Math.cos(a) * 28), Math.floor(cy + Math.sin(a) * 28), AM[4], GLOW.amber);
  }
  const plot = (x, y, c) => { if (Math.hypot(x + 0.5 - 32, y + 0.5 - 32) < 27) t.glow(x, y, c); };
  // dashed orbit rings + spokes
  for (const [rr, dash] of [[9, 3], [16, 4], [23, 5]]) {
    const steps = Math.ceil(rr * 7);
    for (let s = 0; s < steps; s++) {
      const a = (s / steps) * Math.PI * 2;
      if (Math.floor(s / dash) % 2) continue;
      plot(Math.floor(cx + Math.cos(a) * rr + 0.5), Math.floor(cy + Math.sin(a) * rr + 0.5), CY[2]);
    }
  }
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    for (let d = 5; d < 26; d += 2) plot(Math.floor(cx + Math.cos(a) * d + 0.5), Math.floor(cy + Math.sin(a) * d + 0.5), CY[1]);
  }
  // radar sweep with a fading trail (one quarter turn per frame)
  for (let k = 0; k < 6; k++) {
    const a = f * Math.PI / 2 - k * 0.09 - Math.PI / 2;
    const c = [CY[5], CY[4], CY[3], CY[3], CY[2], CY[1]][k];
    for (let d = 3; d < 26; d++) plot(Math.floor(cx + Math.cos(a) * d + 0.5), Math.floor(cy + Math.sin(a) * d + 0.5), c);
  }
  // central gas giant with its ring
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
    if (x * x + y * y > 10) continue;
    plot(32 + x, 32 + y, x + y < -1 ? AM[6] : x + y < 2 ? GLOW.amber : AM[3]);
  }
  for (let x = -6; x <= 6; x++) { const y = Math.round(x * -0.3); if (Math.abs(x) > 2) plot(32 + x, 32 + y, AM[5]); }
  // orbiting bodies
  const bodies = [[9, 0.6, 1, TE[5]], [16, 2.4, -0.6, CY[5]], [23, 4.1, 0.35, '#ffb0dc']];
  for (const [rr, a0, w, c] of bodies) {
    const a = a0 + f * w * Math.PI / 2;
    const x = Math.floor(cx + Math.cos(a) * rr + 0.5), y = Math.floor(cy + Math.sin(a) * rr + 0.5);
    plot(x, y, '#ffffff'); plot(x + 1, y, c); plot(x, y + 1, c); plot(x + 1, y + 1, c);
    // label ticks
    plot(x + 3, y - 2, CY[3]); plot(x + 4, y - 2, CY[3]); plot(x + 5, y - 2, CY[3]); plot(x + 3, y - 3, CY[2]);
  }
  // blinking contact markers
  if (f % 2 === 0) { plot(44, 18, CR[4]); plot(45, 18, CR[4]); plot(44, 19, CR[3]); }
  else plot(19, 44, GLOW.amber);
}

function paintCeilingLamp(t) {
  // caged work lamp, transparent background
  t.rect(6, 0, 4, 3, G[2], 0.7).hline(6, 9, 0, G[4]);
  t.rect(1, 3, 14, 4, G[3], 0.8);
  t.hline(2, 13, 3, G[5]).hline(1, 14, 4, G[4]).hline(1, 14, 6, G[1]);
  t.put(1, 3, null).put(14, 3, null);
  const lens = [[7, ['#ffb54a', '#ffd98a', '#fff3cf', '#fff3cf', '#ffd98a', '#ffb54a']], [8, ['#ffd98a', '#fff3cf', '#ffffff', '#ffffff', '#fff3cf', '#ffd98a']], [9, ['#e8892a', '#ffb54a', '#ffd98a', '#ffd98a', '#ffb54a', '#e8892a']]];
  for (const [y, cols] of lens) {
    for (let x = 2; x <= 13; x++) {
      const c = cols[Math.min(5, Math.floor((x - 2) / 2))];
      t.glow(x, y, c);
    }
  }
  // cage bars over the lens
  for (const x of [4, 8, 11]) t.vline(x, 7, 10, G[1], 0.9).emit(x, 7, '#000000').emit(x, 8, '#000000').emit(x, 9, '#000000');
  t.hline(2, 13, 10, G[2], 0.9).hline(3, 12, 11, G[1], 0.8);
  t.px(2, 10, G[3]).px(13, 10, G[1]);
}

function paintAlarmLight(t) {
  t.rect(3, 12, 10, 3, G[3], 0.7).hline(3, 12, 12, G[5]).hline(3, 12, 14, G[1]);
  t.px(4, 13, S[6]).px(11, 13, S[6]);
  for (let y = 3; y <= 11; y++) for (let x = 4; x <= 11; x++) {
    const dx = (x + 0.5 - 8) / 4, dy = (y + 0.5 - 11) / 8.2;
    if (dx * dx + dy * dy > 1) continue;
    const l = -dx * 0.6 - dy * 0.8;
    const c = l > 0.75 ? CR[5] : l > 0.35 ? GLOW.red : l > -0.1 ? CR[3] : CR[2];
    t.glow(x, y, c, l > -0.1 ? c : CR[2]).ht(x, y, 0.6 + 0.4 * (1 - dx * dx - dy * dy));
  }
  t.glow(7, 7, '#ffd0d4').glow(8, 7, '#ffd0d4').glow(7, 8, '#ffb0b8');
  t.glow(5, 5, '#ffe4e6');
  // cage
  t.vline(4, 6, 11, G[1], 0.9).vline(11, 6, 11, G[1], 0.9).hline(5, 10, 9, G[2], 0.9);
  for (const [x, y] of [[4, 6], [4, 7], [4, 8], [4, 10], [4, 11], [11, 6], [11, 7], [11, 8], [11, 10], [11, 11], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9]]) t.emit(x, y, '#000000');
}

function paintBench(t) {
  const U = UPHOL;
  // frame uprights
  for (const x of [1, 28]) {
    t.rect(x, 5, 3, 18, S[3], 0.7);
    t.vline(x, 5, 22, S[5]).vline(x + 2, 5, 22, S[2]);
  }
  // backrest cushion with tufted seams
  t.rect(4, 6, 24, 8, U[2], 0.7);
  t.hline(4, 27, 6, U[4]).hline(4, 27, 7, U[3]).hline(4, 27, 13, U[1]);
  for (let x = 9; x < 27; x += 6) t.vline(x, 8, 12, U[1], 0.6).px(x, 10, U[0]);
  // seat
  t.rect(1, 15, 30, 6, U[2], 0.75);
  t.hline(1, 30, 15, U[4]).hline(1, 30, 16, U[3]).hline(1, 30, 20, U[1]);
  for (let x = 7; x < 28; x += 6) t.vline(x, 17, 19, U[1], 0.65);
  t.rect(1, 21, 30, 2, S[3], 0.8).hline(1, 30, 21, S[4]).hline(1, 30, 22, S[2]);
  // legs and feet
  for (const x of [4, 25]) {
    t.rect(x, 23, 3, 7, G[3], 0.7).vline(x, 23, 29, G[4]).vline(x + 2, 23, 29, G[1]);
    t.rect(x - 1, 29, 5, 2, G[4], 0.7).hline(x - 1, x + 3, 30, G[2]);
  }
  t.hline(7, 24, 23, G[1], 0.5);
  // wear on the upholstery
  t.px(12, 16, U[4]).px(20, 17, U[3]).px(15, 7, U[4]);
}

// ---------------------------------------------------------------- signage

const SIGN_ICONS = {
  snow: ['..#..', '#.#.#', '.###.', '##.##', '.###.', '#.#.#', '..#..'],
  chevL: ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
  chevR: ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
  star: ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...'],
};

function paintSign(t, text, color, { left = null, right = null } = {}) {
  t.rect(0, 0, 64, 16, G[2], 0.65);
  t.hline(0, 63, 0, G[4]).vline(0, 0, 15, G[4]).hline(0, 63, 15, G[0], 0.55).vline(63, 0, 15, G[0], 0.55);
  t.rect(2, 2, 60, 12, '#070a12', 0.42);
  t.hline(2, 61, 2, '#04060c').vline(2, 2, 13, '#04060c').hline(3, 61, 13, G[2]).vline(61, 3, 13, G[2]);
  for (const [x, y] of [[1, 1], [62, 1], [1, 14], [62, 14]]) t.px(x, y, S[5], 0.8);
  const dim = mix(color, '#070a12', 0.72), mid = mix(color, '#070a12', 0.35);
  const icon = (name) => SIGN_ICONS[name];
  const parts = [];
  if (left) parts.push({ g: icon(left) });
  parts.push({ text });
  if (right) parts.push({ g: icon(right) });
  const gap = 3;
  const width = parts.reduce((s, p) => s + (p.g ? p.g[0].length : textWidth(p.text)), 0) + gap * (parts.length - 1);
  let x = Math.floor((64 - width) / 2);
  const lit = new Set();
  const plot = (px, py) => lit.add(py * 64 + px);
  for (const p of parts) {
    if (p.g) {
      p.g.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') plot(x + i, 4 + j); }));
      x += p.g[0].length + gap;
    } else {
      drawText(p.text, x, 4, plot);
      x += textWidth(p.text) + gap;
    }
  }
  // neon halo first, then the glyph cores
  for (const k of lit) {
    const gx = k % 64, gy = Math.floor(k / 64);
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = (gy + oy) * 64 + gx + ox;
      if (!lit.has(n) && gy + oy > 2 && gy + oy < 13) t.glow(gx + ox, gy + oy, dim);
    }
  }
  for (const k of lit) {
    const gx = k % 64, gy = Math.floor(k / 64);
    t.glow(gx, gy, gy === 4 ? mix(color, '#ffffff', 0.45) : color).ht(gx, gy, 0.5);
  }
  // accent rule under the text
  for (let xx = 6; xx < 58; xx++) if (xx % 2 === 0) t.glow(xx, 12, mid, dim);
}

// ---------------------------------------------------------------- decals (transparent overlays)

function decalAlpha(c, a) { return c + Math.round(a * 255).toString(16).padStart(2, '0'); }

function paintDecalGrime(t) {
  // a scuffed smear: dark core, streaks dragged sideways (anisotropic noise), sparse rim speckle
  for (let y = 1; y < 31; y++) for (let x = 1; x < 31; x++) {
    const dx = (x + 0.5 - 15) / 13.5, dy = (y + 0.5 - 16) / 9.5;
    const n = fbm(x * 0.2, y * 0.55, 111, 3);
    const v = 1 - (dx * dx + dy * dy) + (n - 0.5) * 1.2;
    if (v > 0.62) t.px(x, y, decalAlpha('#0a0c12', 0.56), 0.48);
    else if (v > 0.36) t.px(x, y, decalAlpha('#0b0d14', 0.38), 0.5);
    else if (v > 0.12 && bayer(x, y, 0.3)) t.px(x, y, decalAlpha('#0d0f16', 0.3));
  }
}

function paintDecalOil(t) {
  const blobs = [[15, 17, 9, 6], [21, 12, 5, 4], [9, 21, 4, 3]];
  const inside = (x, y, grow = 0) => blobs.some(([cx, cy, rx, ry]) => ((x + 0.5 - cx) / (rx + grow)) ** 2 + ((y + 0.5 - cy) / (ry + grow)) ** 2 <= 1);
  for (let y = 1; y < 31; y++) for (let x = 1; x < 31; x++) {
    if (inside(x, y, -1.2)) t.px(x, y, decalAlpha('#07080d', 0.9), 0.45);
    else if (inside(x, y)) t.px(x, y, decalAlpha('#0c0e16', 0.8), 0.48);
    else if (inside(x, y, 1) && bayer(x, y, 0.4)) t.px(x, y, decalAlpha('#10121a', 0.5));
  }
  // cold sheen arc with an iridescent fringe
  const sheen = [[10, 14, '#3e4c6e'], [11, 13, '#55688f'], [12, 13, '#6a80aa'], [13, 12, '#55688f'], [14, 12, '#3e4c6e'],
    [11, 14, '#2a5a5e'], [13, 13, '#4a2a52'], [20, 10, '#4a5a80'], [21, 10, '#3a4868'], [8, 20, '#3a4868']];
  for (const [x, y, c] of sheen) t.px(x, y, c);
  // drips
  for (const [x, y] of [[26, 22], [27, 24], [5, 13], [24, 6]]) t.px(x, y, decalAlpha('#0c0e16', 0.8));
}

function paintDecalArrow(t) {
  // stencilled guide arrow (pointing to texture top = north), worn at the edges and scuffed across
  const inArrow = (x, y) => (y >= 3 && y <= 14 && Math.abs(x + 0.5 - 16) <= (y - 3) + 1.5) || (y >= 15 && y <= 28 && x >= 12 && x <= 19);
  const scuff = (x, y) => Math.abs((y - 21) - (x - 16) * 0.35) < 0.6 || Math.abs((y - 9) + (x - 16) * 0.5) < 0.5;
  for (let y = 2; y < 30; y++) for (let x = 2; x < 30; x++) {
    if (!inArrow(x, y)) continue;
    const edge = !inArrow(x - 1, y) || !inArrow(x + 1, y) || !inArrow(x, y - 1) || !inArrow(x, y + 1);
    const h = fbm(x * 0.9, y * 0.9, 132, 1);
    if (edge && h < 0.38) continue;
    if (scuff(x, y)) { if (h < 0.6) t.px(x, y, decalAlpha(GD[3], 0.35), 0.55); continue; }
    const tone = fbm(x * 0.15, y * 0.15, 133, 2) < 0.45 ? GD[3] : GD[4];
    t.px(x, y, decalAlpha(edge ? GD[3] : tone, edge ? 0.6 : 0.82), 0.57);
  }
}

function paintDecalScorch(t) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const dx = x + 0.5 - 16, dy = y + 0.5 - 16;
    const d = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx);
    const rays = 0.5 + 0.5 * Math.sin(a * 9 + Math.sin(a * 4) * 1.5);
    const reach = 8 + rays * 6.5 + (fbm(x * 0.35, y * 0.35, 142, 2) - 0.5) * 4;
    const v = 1 - d / reach;
    if (v <= 0) continue;
    if (v > 0.62) t.px(x, y, decalAlpha('#0e0a0b', 0.8), 0.46);
    else if (v > 0.38) t.px(x, y, decalAlpha('#1b1210', 0.66), 0.48);
    else if (v > 0.16) t.px(x, y, decalAlpha('#2a1d16', 0.48), 0.5);
    else if (bayer(x, y, 0.3)) t.px(x, y, decalAlpha('#2b211c', 0.36), 0.52);
  }
  // heat-tinted (blued / bronzed) metal where the blast was hottest, so the centre is not a hole
  for (let y = 12; y < 21; y++) for (let x = 12; x < 21; x++) {
    const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16);
    if (d < 1.6) t.px(x, y, decalAlpha('#3a2c3a', 0.75));
    else if (d < 2.8 && (x + y) % 2) t.px(x, y, decalAlpha('#4a3424', 0.7));
  }
  t.px(15, 15, decalAlpha('#56506a', 0.7));
}

// ---------------------------------------------------------------- space vista (1024x512)

function paintSpace() {
  const W = 1024, H = 512;
  const img = new Float32Array(W * H * 3);

  // --- nebula fields at half resolution (sampled bilinearly)
  const hw = W / 2, hh = H / 2;
  const fields = [0, 1, 2, 3, 4].map(() => new Float32Array(hw * hh));
  for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) {
    const nx = x / hh, ny = y / hh;
    const wx = fbm(nx * 1.7, ny * 1.7, 11, 3) - 0.5, wy = fbm(nx * 1.7 + 7.3, ny * 1.7 + 2.1, 12, 3) - 0.5;
    const qx = nx + wx * 0.7, qy = ny + wy * 0.7;
    // magenta: a sweep from the upper left down toward the centre
    const mBand = Math.exp(-(((qy - (0.18 + qx * 0.38)) / 0.2) ** 2)) * smooth(1.6, 0.2, qx);
    const mf = fbm(qx * 2.6, qy * 2.6, 21, 5);
    const mr = 1 - Math.abs(2 * fbm(qx * 4.2, qy * 4.2, 22, 4) - 1);
    // teal: lower-left bank and a wisp behind the planet toward the upper right
    const tBand = Math.exp(-(((qy - (0.86 - qx * 0.18)) / 0.22) ** 2)) * smooth(1.3, 0.1, qx) +
      0.8 * Math.exp(-(((qy - (0.05 + (qx - 1.25) * 0.25)) / 0.16) ** 2)) * smooth(0.95, 1.5, qx);
    const tf = fbm(qx * 2.4 + 3.1, qy * 2.4, 31, 5);
    const tr = 1 - Math.abs(2 * fbm(qx * 3.8 + 1.7, qy * 3.8, 32, 4) - 1);
    // dark dust lanes cutting through both
    const dust = Math.pow(1 - Math.abs(2 * fbm(qx * 3.1 + 9, qy * 3.1 + 4, 41, 4) - 1), 5);
    const i = y * hw + x;
    // thin bright filaments riding the ridges of the cloud
    const fil = Math.pow(1 - Math.abs(2 * fbm(qx * 5.5 + 2, qy * 5.5, 51, 3) - 1), 14) * (1 - dust);
    fields[0][i] = mBand * (mf * 0.9 + Math.pow(mr, 4) * 0.75) * (1 - dust * 0.85);
    fields[1][i] = tBand * (tf * 0.85 + Math.pow(tr, 4) * 0.8) * (1 - dust * 0.8);
    fields[2][i] = (mBand + tBand) * dust;
    fields[3][i] = mBand * fil * (0.4 + mf);
    fields[4][i] = tBand * fil * (0.4 + tf);
  }
  const sample = (f, x, y) => {
    const fx = Math.min(hw - 1.001, Math.max(0, x / 2 - 0.25)), fy = Math.min(hh - 1.001, Math.max(0, y / 2 - 0.25));
    const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
    const a = f[iy * hw + ix], b = f[iy * hw + ix + 1], c = f[(iy + 1) * hw + ix], d = f[(iy + 1) * hw + ix + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
  // stepped density: pixel-art layers with Bayer-dithered transitions
  const steps = (v, x, y, n) => {
    // crisp layers: dither only across the upper part of each step
    const q = Math.max(0, v) * n;
    let k = Math.floor(q);
    const fr = q - k;
    if (fr > 0.5 && bayer(x, y, (fr - 0.5) / 0.5)) k++;
    return k / n;
  };
  const MAG = [[0.11, 0.025, 0.16], [0.3, 0.06, 0.32], [0.62, 0.16, 0.55], [0.92, 0.42, 0.74]];
  const TEA = [[0.02, 0.09, 0.13], [0.04, 0.24, 0.3], [0.1, 0.5, 0.5], [0.45, 0.85, 0.78]];
  const rampAt = (R, t) => {
    const p = Math.min(R.length - 1.0001, Math.max(0, t * (R.length - 1)));
    const k = Math.floor(p), f = p - k;
    return [R[k][0] + (R[k + 1][0] - R[k][0]) * f, R[k][1] + (R[k + 1][1] - R[k][1]) * f, R[k][2] + (R[k + 1][2] - R[k][2]) * f];
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 3;
    // background: black at the top left, deep indigo low and toward the planet
    const g = 0.25 * (y / H) + 0.55 * Math.exp(-(((x - 690) / 520) ** 2 + ((y - 300) / 300) ** 2)) + 0.1 * (x / W);
    let r = 0.008 + g * 0.06, gg = 0.008 + g * 0.035, b = 0.025 + g * 0.13;
    const m = steps(sample(fields[0], x, y) * 1.25, x, y, 5);
    const tl = steps(sample(fields[1], x, y) * 1.25, x, y, 5);
    if (m > 0) { const c = rampAt(MAG, m); r += c[0] * m; gg += c[1] * m; b += c[2] * m; }
    if (tl > 0) { const c = rampAt(TEA, tl); r += c[0] * tl; gg += c[1] * tl; b += c[2] * tl; }
    const fm = steps(sample(fields[3], x, y) * 2.2, x, y, 3), ft = steps(sample(fields[4], x, y) * 2.2, x, y, 3);
    if (fm > 0) { r += 0.5 * fm; gg += 0.22 * fm; b += 0.42 * fm; }
    if (ft > 0) { r += 0.2 * ft; gg += 0.48 * ft; b += 0.44 * ft; }
    const dk = sample(fields[2], x, y);
    const shadeK = 1 - Math.min(0.75, steps(dk * 1.6, x, y, 4) * 0.8);
    img[o] = r * shadeK; img[o + 1] = gg * shadeK; img[o + 2] = b * shadeK;
  }

  // --- quantise to pixel-art tones (ordered dither per channel)
  const p = new Painter(W, H);
  const data = p.data;
  const Q = 30;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 3, d = (y * W + x) * 4;
    const th = (BAYER16[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
    for (let c = 0; c < 3; c++) data[d + c] = Math.min(255, Math.floor(clamp01(img[o + c]) * Q + th) * (255 / Q));
    data[d + 3] = 255;
  }
  const add = (x, y, rgb, k = 1) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const d = ((y | 0) * W + (x | 0)) * 4;
    data[d] = Math.min(255, data[d] + rgb[0] * k);
    data[d + 1] = Math.min(255, data[d + 1] + rgb[1] * k);
    data[d + 2] = Math.min(255, data[d + 2] + rgb[2] * k);
  };
  const setRGB = (x, y, rgb) => {
    const d = (y * W + x) * 4;
    data[d] = rgb[0]; data[d + 1] = rgb[1]; data[d + 2] = rgb[2];
  };
  const getRGB = (x, y) => { const d = (y * W + x) * 4; return [data[d], data[d + 1], data[d + 2]]; };

  // --- stars
  const r = rng(2024);
  const tints = [[255, 255, 255], [200, 222, 255], [255, 236, 200], [255, 205, 230], [190, 255, 240]];
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H);
    const b = Math.pow(r(), 2.6) * 0.95 + 0.12;
    const c = tints[Math.floor(r() * tints.length)];
    add(x, y, c, b);
    if (b > 0.72) { add(x + 1, y, c, b * 0.35); add(x - 1, y, c, b * 0.35); add(x, y + 1, c, b * 0.35); add(x, y - 1, c, b * 0.35); }
  }
  const glints = [[96, 60, 7], [372, 34, 6], [512, 140, 5], [930, 70, 8], [160, 420, 6], [968, 450, 5], [300, 250, 5], [610, 470, 4], [44, 300, 4]];
  for (const [x, y, len] of glints) {
    const c = tints[(x + y) % tints.length];
    add(x, y, [255, 255, 255], 1); add(x + 1, y, c, 0.7); add(x - 1, y, c, 0.7); add(x, y + 1, c, 0.7); add(x, y - 1, c, 0.7);
    for (let k = 2; k <= len; k++) {
      const f = Math.pow(1 - (k - 1) / len, 1.6) * 0.75;
      add(x + k, y, c, f); add(x - k, y, c, f); add(x, y + k, c, f); add(x, y - k, c, f);
    }
    add(x + 1, y + 1, c, 0.25); add(x - 1, y - 1, c, 0.25); add(x + 1, y - 1, c, 0.25); add(x - 1, y + 1, c, 0.25);
  }

  // --- ringed gas giant (orthographic sphere + ring plane, shaded by one light)
  const PCX = 690, PCY = 262, PR = 132;
  const tilt = -0.27, ct = Math.cos(tilt), st = Math.sin(tilt);
  const inc = 0.24, ci = Math.cos(inc), si = Math.sin(inc);
  const nRing = [0, -ci, si];                     // ring-plane normal = spin axis (planet frame)
  const e3 = [0, si, ci];                         // in-plane direction toward the viewer
  const toLocal = (u, v) => [u * ct + v * st, -u * st + v * ct];
  let L = [-0.72, -0.34, 0.6];
  const ll = Math.hypot(...L); L = L.map((v) => v / ll);
  const [lu, lv] = toLocal(L[0], L[1]);
  const Ll = [lu, lv, L[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const bands = [
    [-1.0, [116, 72, 48]], [-0.82, [160, 102, 60]], [-0.66, [214, 166, 112]], [-0.54, [238, 214, 168]],
    [-0.42, [196, 128, 66]], [-0.33, [230, 192, 138]], [-0.2, [246, 230, 196]], [-0.02, [210, 140, 72]],
    [0.06, [170, 96, 46]], [0.15, [234, 198, 142]], [0.3, [245, 226, 186]], [0.42, [198, 134, 72]],
    [0.52, [228, 190, 136]], [0.66, [176, 120, 76]], [0.8, [134, 88, 60]],
  ];
  const bandColor = (t, x, y) => {
    let k = 0;
    while (k + 1 < bands.length && bands[k + 1][0] <= t) k++;
    // dither across the last 0.02 before a boundary
    if (k + 1 < bands.length && bands[k + 1][0] - t < 0.02 && bayer(x, y, 1 - (bands[k + 1][0] - t) / 0.02)) k++;
    return bands[k][1];
  };
  const ringDensity = (rr) => {
    if (rr < 1.3 || rr > 2.28) return 0;
    if (rr < 1.46) return 0.2 + 0.07 * Math.sin(rr * 90);
    if (rr < 1.8) return 0.82 + 0.13 * Math.sin(rr * 150);
    if (rr < 1.86) return 0.05;
    if (rr < 2.12) return (rr > 2.03 && rr < 2.05) ? 0.08 : 0.56 + 0.12 * Math.sin(rr * 120);
    if (rr > 2.21 && rr < 2.24) return 0.45;
    return 0;
  };
  const ringColor = (rr) => (rr < 1.46 ? [138, 120, 108] : rr < 1.62 ? [226, 206, 166] : rr < 1.8 ? [242, 226, 190] : rr < 2.13 ? [200, 168, 124] : [214, 200, 172]);
  const SHADOW = [18, 12, 38];
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const x0 = PCX - Math.ceil(PR * 2.35), x1 = PCX + Math.ceil(PR * 2.35);
  const y0 = PCY - Math.ceil(PR * 1.3), y1 = PCY + Math.ceil(PR * 1.3);
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
    const [u, v] = toLocal((x + 0.5 - PCX) / PR, (y + 0.5 - PCY) / PR);
    const rr2 = u * u + v * v;
    let zPlanet = -Infinity;
    if (rr2 < 1) {
      zPlanet = Math.sqrt(1 - rr2);
      const Sp = [u, v, zPlanet];
      const lat = Math.asin(Math.max(-1, Math.min(1, dot(Sp, nRing))));
      const lon = Math.atan2(u, dot(Sp, e3));
      let t = lat / (Math.PI / 2);
      t += 0.022 * Math.sin(lon * 3 + t * 24) + 0.05 * (fbm(lon * 2.2 + 3, t * 13, 77, 3) - 0.5);
      let col = bandColor(-t, x, y);
      // fine streaks inside the bands
      const fine = Math.sin(t * 90 + Math.sin(lon * 5 + t * 8) * 1.6);
      if (fine > 0.86) col = col.map((v) => Math.min(255, v * 1.07));
      else if (fine < -0.9) col = col.map((v) => v * 0.9);
      // storms on the lit hemisphere: a big rust-cored oval and a small white one
      const sd = ((lon + 0.5) / 0.26) ** 2 + ((t + 0.1) / 0.058) ** 2;
      if (sd < 1) col = sd < 0.22 ? [184, 84, 46] : sd < 0.55 ? [222, 140, 84] : [248, 228, 192];
      const sd2 = ((lon + 0.05) / 0.09) ** 2 + ((t - 0.36) / 0.028) ** 2;
      if (sd2 < 1) col = [252, 244, 226];
      // lighting: lambert with limb darkening, ring shadow, then 6 dithered steps
      const lam = dot(Sp, Ll);
      let s = smooth(-0.12, 0.75, lam) * (0.72 + 0.28 * zPlanet);
      const nl = dot(nRing, Ll);
      if (Math.abs(nl) > 1e-4) {
        const tt = -dot(Sp, nRing) / nl;
        if (tt > 0) {
          const P = [Sp[0] + Ll[0] * tt, Sp[1] + Ll[1] * tt, Sp[2] + Ll[2] * tt];
          s *= 1 - 0.7 * ringDensity(Math.hypot(...P));
        }
      }
      const q = s * 6, k = Math.floor(q);
      const sq = Math.min(1, (k + (bayer(x, y, q - k) ? 1 : 0)) / 6);
      let rgb = lerp3(SHADOW, col, sq);
      const edge = (1 - Math.sqrt(rr2)) * PR;
      if (edge < 1.6 && lam > 0.18) rgb = lerp3(rgb, [255, 246, 222], 0.75);
      else if (edge < 2.6 && lam < 0.05 && lam > -0.55 && bayer(x, y, 0.6)) rgb = lerp3(rgb, [56, 104, 150], 0.55);
      setRGB(x, y, rgb.map(Math.round));
    } else if (rr2 < 1.1) {
      // thin atmospheric haze outside the lit limb
      const lam = dot([u, v, 0], Ll) / Math.sqrt(rr2);
      if (lam > 0 && bayer(x, y, (1.1 - rr2) / 0.1 * 0.6 * lam)) add(x, y, [200, 160, 120], 0.3);
    }
    // ring plane hit along the view ray
    const zr = Math.abs(si) > 1e-5 ? (v * ci) / si : 0;
    const Pr = [u, v, zr];
    const rr = Math.hypot(u, v, zr);
    const dens = ringDensity(rr);
    if (dens <= 0) continue;
    if (rr2 < 1 && zr < zPlanet) continue; // ring behind the planet
    // planet shadow on the ring
    const b = dot(Pr, Ll), c = dot(Pr, Pr) - 1;
    const shadowed = b < 0 && b * b - c > 0;
    let rc = ringColor(rr);
    if (shadowed) rc = lerp3(rc, [14, 10, 28], 0.85);
    const a = Math.min(1, dens) * 4;
    const ak = Math.floor(a);
    const alpha = Math.min(4, ak + (bayer(x, y, a - ak) ? 1 : 0)) / 4;
    if (alpha <= 0) continue;
    setRGB(x, y, lerp3(getRGB(x, y), rc, alpha * 0.92).map(Math.round));
  }

  // --- small distant moon
  const MX = 196, MY = 132, MR = 15;
  const craters = [[-0.35, -0.2, 0.28], [0.25, 0.3, 0.22], [-0.05, 0.5, 0.15], [0.4, -0.35, 0.18]];
  const moonRamp = [[20, 16, 36], [46, 42, 70], [82, 78, 110], [124, 120, 152], [170, 166, 194], [214, 210, 232]];
  for (let y = MY - MR - 1; y <= MY + MR + 1; y++) for (let x = MX - MR - 1; x <= MX + MR + 1; x++) {
    const u = (x + 0.5 - MX) / MR, v = (y + 0.5 - MY) / MR;
    const d2 = u * u + v * v;
    if (d2 > 1) continue;
    const z = Math.sqrt(1 - d2);
    let lam = u * L[0] + v * L[1] + z * L[2];
    for (const [cu, cv, cr] of craters) {
      const dd = Math.hypot(u - cu, v - cv) / cr;
      if (dd < 1) lam += dd > 0.7 ? ((u - cu) + (v - cv) > 0 ? 0.25 : -0.2) : -0.12;
    }
    const q = clamp01(lam * 0.9 + 0.2) * 5, k = Math.floor(q);
    const kk = Math.min(5, k + (bayer(x, y, q - k) ? 1 : 0));
    setRGB(x, y, moonRamp[kk]);
  }

  p._dirty = true;
  return p;
}

function paintStarsLayer() {
  const p = new Painter(256, 256);
  const r = rng(77);
  const plot = (x, y, c, a) => p.px((x + 256) % 256, (y + 256) % 256, [c[0], c[1], c[2], Math.round(a * 255)]);
  const tints = [[255, 255, 255], [205, 225, 255], [255, 238, 205], [255, 210, 235]];
  for (let i = 0; i < 300; i++) {
    const x = Math.floor(r() * 256), y = Math.floor(r() * 256);
    const b = Math.pow(r(), 2.2) * 0.85 + 0.15;
    const c = tints[Math.floor(r() * tints.length)];
    plot(x, y, c, b);
    if (b > 0.78) { plot(x + 1, y, c, b * 0.4); plot(x - 1, y, c, b * 0.4); plot(x, y + 1, c, b * 0.4); plot(x, y - 1, c, b * 0.4); }
  }
  for (const [x, y] of [[40, 200], [190, 60], [250, 250]]) {
    plot(x, y, [255, 255, 255], 1);
    for (let k = 1; k <= 4; k++) {
      const a = 0.8 * (1 - k / 5);
      plot(x + k, y, [210, 230, 255], a); plot(x - k, y, [210, 230, 255], a); plot(x, y + k, [210, 230, 255], a); plot(x, y - k, [210, 230, 255], a);
    }
  }
  return p;
}

// ---------------------------------------------------------------- registry

const wall = { w: 32, h: 96, wrapX: true };
const floor = { w: 32, h: 32, wrapX: true, wrapY: true };

const DEFS = {
  floor_plate: { ...floor, paint: (t) => paintFloorPlate(t, false) },
  floor_plate_worn: { ...floor, paint: (t) => paintFloorPlate(t, true) },
  floor_grate: { ...floor, paint: paintFloorGrate },
  floor_hazard: { ...floor, paint: paintFloorHazard },
  floor_bridge: { ...floor, paint: paintFloorBridge, strength: 2 },
  floor_cryo: { ...floor, paint: paintFloorCryo },
  wall_panel: { ...wall, paint: paintWallPanel },
  wall_panel_vent: { ...wall, paint: paintWallVent },
  wall_panel_screen: { ...wall, frames: 4, fps: 4, paint: paintWallScreen },
  wall_pipes: { ...wall, paint: paintWallPipes, strength: 3 },
  wall_cap: { ...floor, paint: paintWallCap },
  wall_low: { w: 32, h: 24, wrapX: true, paint: paintWallLow },
  door: { w: 32, h: 96, paint: (t) => paintDoor(t, false) },
  door_locked: { w: 32, h: 96, paint: (t) => paintDoor(t, true) },
  door_frame: { w: 8, h: 96, paint: paintDoorFrame },
  window_frame: { w: 64, h: 96, paint: paintWindowFrame, alpha: true },
  space_backdrop: { w: 1024, h: 512, raw: paintSpace, emissiveIsMap: true },
  stars_layer: { w: 256, h: 256, raw: paintStarsLayer, emissiveIsMap: true },
  console_front: { w: 32, h: 32, frames: 4, fps: 3, paint: paintConsoleFront },
  console_top: { w: 32, h: 32, paint: paintConsoleTop },
  crate_side: { w: 32, h: 32, paint: paintCrateSide },
  crate_top: { w: 32, h: 32, paint: paintCrateTop },
  locker: { w: 32, h: 64, paint: paintLocker },
  cryo_pod: { w: 32, h: 64, paint: paintCryoPod },
  pipe: { w: 32, h: 32, wrapX: true, wrapY: true, paint: paintPipe },
  reactor_core: { w: 64, h: 64, frames: 4, fps: 10, wrapX: true, wrapY: true, paint: paintReactor, strength: 1 },
  holo_table: { w: 64, h: 64, frames: 4, fps: 5, paint: paintHoloTable },
  ceiling_lamp: { w: 16, h: 16, paint: paintCeilingLamp, alpha: true },
  alarm_light: { w: 16, h: 16, paint: paintAlarmLight, alpha: true },
  bench: { w: 32, h: 32, paint: paintBench, alpha: true },
  sign_cryo: { w: 64, h: 16, paint: (t) => paintSign(t, 'CRYO DECK', '#9ff3ff', { left: 'snow' }) },
  sign_spine: { w: 64, h: 16, paint: (t) => paintSign(t, 'SPINE', '#ffbf4d', { left: 'chevL', right: 'chevR' }) },
  sign_engineering: { w: 64, h: 16, paint: (t) => paintSign(t, 'ENGINEERING', '#ff8a3a') },
  sign_bridge: { w: 64, h: 16, paint: (t) => paintSign(t, 'BRIDGE', '#7ff4ff', { left: 'star' }) },
  decal_grime: { w: 32, h: 32, paint: paintDecalGrime, alpha: true },
  decal_oil: { w: 32, h: 32, paint: paintDecalOil, alpha: true },
  decal_arrow: { w: 32, h: 32, paint: paintDecalArrow, alpha: true },
  decal_scorch: { w: 32, h: 32, paint: paintDecalScorch, alpha: true },
};

/** Every texture name buildTexture()/textureSet() accept (contract names plus door_locked). */
export const TEXTURE_NAMES = Object.keys(DEFS);

/** Suggested animation rate (frames per second) for animated textures; 0 for static ones. */
export function textureFps(name) {
  const d = DEFS[name];
  return d && d.frames > 1 ? d.fps : 0;
}

/** True for textures with transparent pixels (render with alphaTest or transparent blending). */
export function textureHasAlpha(name) {
  return !!(DEFS[name] && (DEFS[name].alpha || name === 'stars_layer'));
}

const cache = new Map();
let flatCanvas = null;

function flatNormal() {
  if (!flatCanvas) {
    const p = new Painter(4, 4);
    p.rect(0, 0, 4, 4, [128, 128, 255, 255]);
    flatCanvas = p.canvas;
  }
  return flatCanvas;
}

/**
 * Build (once, then cached) the canvases for a texture:
 *   { map, normal, emissive (or null), w, h, frames }
 * w/h are the size of ONE frame in texture pixels (32 px = 1 world unit); animated textures lay
 * `frames` frames out horizontally, so the canvases are w*frames wide. The two painted backdrops
 * (space_backdrop, stars_layer) use a tiny flat normal canvas and their map doubles as emissive.
 */
export function buildTexture(name) {
  const hit = cache.get(name);
  if (hit) return hit;
  const def = DEFS[name];
  if (!def) throw new Error(`tiles: unknown texture "${name}"`);
  let out;
  if (def.raw) {
    const map = def.raw().canvas;
    out = { map, normal: flatNormal(), emissive: map, w: def.w, h: def.h, frames: 1 };
  } else {
    const frames = def.frames || 1;
    const map = new Painter(def.w * frames, def.h);
    const normal = new Painter(def.w * frames, def.h);
    let emissive = null;
    for (let f = 0; f < frames; f++) {
      const t = new Tex(def.w, def.h, { wrapX: !!def.wrapX, wrapY: !!def.wrapY });
      def.paint(t, f);
      const nm = heightToNormal(t.hm, def.w, def.h, {
        strength: def.strength || 2.4,
        wrapX: !!def.wrapX,
        wrapY: !!def.wrapY,
        alphaOf: def.alpha ? (x, y) => t.c.alpha(x, y) > 0 : null,
      });
      copyInto(map, t.c, f * def.w);
      copyInto(normal, nm, f * def.w);
      if (t.e) {
        if (!emissive) { emissive = new Painter(def.w * frames, def.h); emissive.rect(0, 0, emissive.w, emissive.h, '#000000'); }
        copyInto(emissive, t.e, f * def.w);
      }
    }
    out = { map: map.canvas, normal: normal.canvas, emissive: emissive ? emissive.canvas : null, w: def.w, h: def.h, frames };
  }
  cache.set(name, out);
  return out;
}

function copyInto(dst, src, dx) {
  for (let y = 0; y < src.h; y++) {
    const s = y * src.w * 4, d = (y * dst.w + dx) * 4;
    dst.data.set(src.data.subarray(s, s + src.w * 4), d);
  }
  dst._dirty = true;
}

// One THREE.Source per canvas: every textureSet() of the same texture shares a single GPU upload,
// while each THREE.Texture keeps its own repeat/offset.
const sources = new WeakMap();
function sourceFor(canvas) {
  let src = sources.get(canvas);
  if (!src) {
    src = new THREE.Source(canvas);
    src.needsUpdate = true;
    sources.set(canvas, src);
  }
  return src;
}

/**
 * Fresh three.js textures for a texture name (canvases are cached, GPU uploads shared):
 *   { map, normalMap, emissiveMap (or null), frames, fps }
 * map/emissive are sRGB, normal is NoColorSpace, all nearest-filtered. `repeat: [rx, ry]` enables
 * RepeatWrapping. Animated textures show frame 0 (repeat.x = 1/frames); call setTextureFrame()
 * to advance them. They can still repeat vertically (ry), but not horizontally.
 */
export function textureSet(name, { repeat = null } = {}) {
  const t = buildTexture(name);
  const make = (canvas, color) => {
    if (!canvas) return null;
    const tex = toTexture(canvas, { color, repeat });
    tex.source = sourceFor(canvas);
    if (t.frames > 1) tex.repeat.x = 1 / t.frames;
    return tex;
  };
  return {
    map: make(t.map, true),
    normalMap: make(t.normal, false),
    emissiveMap: make(t.emissive, true),
    frames: t.frames,
    fps: textureFps(name),
  };
}

/** Show frame `frame` (wraps) of an animated textureSet() result. Cheap: only moves UV offsets. */
export function setTextureFrame(set, frame) {
  const n = set.frames || 1;
  const u = (((Math.floor(frame) % n) + n) % n) / n;
  if (set.map) set.map.offset.x = u;
  if (set.normalMap) set.normalMap.offset.x = u;
  if (set.emissiveMap) set.emissiveMap.offset.x = u;
}

/**
 * Convenience: a MeshStandardMaterial wired to a textureSet (emissive colour white so the emissive
 * map shows; alpha textures get alphaTest). The set is kept on material.userData.set so animated
 * textures can be driven with setTextureFrame(material.userData.set, t * set.fps).
 *   opts: repeat, emissiveIntensity (1.8), roughness (0.72), metalness (0.18), alphaTest (0.5 for
 *   alpha textures), transparent (false), side (FrontSide)
 */
export function makeMaterial(name, {
  repeat = null, emissiveIntensity = 1.8, roughness = 0.72, metalness = 0.18,
  alphaTest = textureHasAlpha(name) ? 0.5 : 0, transparent = false, side = THREE.FrontSide,
} = {}) {
  const set = textureSet(name, { repeat });
  const m = new THREE.MeshStandardMaterial({
    map: set.map,
    normalMap: set.normalMap,
    emissiveMap: set.emissiveMap,
    emissive: set.emissiveMap ? 0xffffff : 0x000000,
    emissiveIntensity: set.emissiveMap ? emissiveIntensity : 0,
    roughness,
    metalness,
    alphaTest,
    transparent,
    side,
  });
  m.userData.set = set;
  return m;
}
