// Pixel-art painter: exact, non-antialiased pixel drawing into an ImageData buffer,
// plus helpers to turn the result into sprite sheets, normal maps and three.js textures.
//
// Every art module (characters, enemies, tiles, fx, icons) draws with this API so the
// whole game shares one pixel grammar: hard pixels, a dark selective outline, ramp-based
// shading, Bayer dithering. 32 texture pixels = 1 world unit everywhere.

import * as THREE from 'three';

export const PX_PER_UNIT = 32;

// ---------------------------------------------------------------- color utilities

const colorCache = new Map();

/** Parse '#rgb', '#rrggbb', '#rrggbbaa', [r,g,b(,a)] or null/'transparent' to [r,g,b,a] (0-255). */
export function parseColor(c) {
  if (c == null || c === 'transparent') return [0, 0, 0, 0];
  if (Array.isArray(c)) return [c[0] | 0, c[1] | 0, c[2] | 0, c.length > 3 ? c[3] | 0 : 255];
  let v = colorCache.get(c);
  if (v) return v;
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255];
  colorCache.set(c, v);
  return v;
}

export function toHex(c) {
  const [r, g, b, a] = parseColor(c);
  const s = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return a === 255 ? s : s + a.toString(16).padStart(2, '0');
}

/** Linear blend of two colors, t in [0,1]. Returns hex. */
export function mix(a, b, t) {
  const A = parseColor(a), B = parseColor(b);
  return toHex(A.map((x, i) => Math.round(x + (B[i] - x) * t)));
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/**
 * Lighten (amount > 0) or darken (amount < 0) a color in HSL, with the hue shift
 * pixel artists use: highlights drift warm (toward yellow), shadows drift cool (toward blue/purple).
 */
export function shade(c, amount, hueShift = 0.04) {
  const [r, g, b, a] = parseColor(c);
  let [h, s, l] = rgbToHsl(r, g, b);
  l = Math.min(1, Math.max(0, l + amount));
  const target = amount > 0 ? 1 / 6 : 2 / 3; // yellow vs blue
  let dh = target - h;
  if (dh > 0.5) dh -= 1;
  if (dh < -0.5) dh += 1;
  h = (h + dh * hueShift * Math.min(1, Math.abs(amount) * 4) + 1) % 1;
  if (amount < 0) s = Math.min(1, s * (1 + Math.abs(amount) * 0.3));
  const [R, G, B] = hslToRgb(h, s, l);
  return toHex([Math.round(R), Math.round(G), Math.round(B), a]);
}

/** Build an n-step ramp around a base color: [darkest ... base ... lightest]. */
export function ramp(base, n = 5, spread = 0.36) {
  const out = [];
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) out.push(i === mid ? toHex(base) : shade(base, ((i - mid) / mid) * spread));
  return out;
}

export function withAlpha(c, a01) {
  const [r, g, b] = parseColor(c);
  return toHex([r, g, b, Math.round(a01 * 255)]);
}

// ---------------------------------------------------------------- seeded RNG

/** mulberry32: deterministic RNG so procedural art is identical on every load. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  return f;
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
/** True when an ordered-dither cell at (x,y) should take the second color for coverage t in [0,1]. */
export function bayer(x, y, t) {
  return (BAYER4[y & 3][x & 3] + 0.5) / 16 < t;
}

// ---------------------------------------------------------------- canvas creation

export function makeCanvas(w, h) {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return new OffscreenCanvas(w, h);
}

// ---------------------------------------------------------------- Painter

export class Painter {
  constructor(w, h) {
    this.w = w | 0;
    this.h = h | 0;
    this.data = new Uint8ClampedArray(this.w * this.h * 4);
    this._canvas = null;
    this._dirty = true;
  }

  static fromCanvas(canvas) {
    const p = new Painter(canvas.width, canvas.height);
    const ctx = canvas.getContext('2d');
    p.data.set(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    return p;
  }

  // -- raw access
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) {
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = ((y | 0) * this.w + (x | 0)) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }
  alpha(x, y) { return this.inside(x, y) ? this.data[((y | 0) * this.w + (x | 0)) * 4 + 3] : 0; }
  opaque(x, y) { return this.alpha(x, y) > 0; }

  /** Set one pixel. Colors with alpha < 255 are alpha-blended over what is there. */
  px(x, y, c) {
    x |= 0; y |= 0;
    if (!this.inside(x, y)) return this;
    const [r, g, b, a] = parseColor(c);
    const i = (y * this.w + x) * 4;
    if (a === 255 || this.data[i + 3] === 0) {
      this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = a;
    } else if (a > 0) {
      const t = a / 255, da = this.data[i + 3] / 255;
      const oa = t + da * (1 - t);
      this.data[i] = (r * t + this.data[i] * da * (1 - t)) / oa;
      this.data[i + 1] = (g * t + this.data[i + 1] * da * (1 - t)) / oa;
      this.data[i + 2] = (b * t + this.data[i + 2] * da * (1 - t)) / oa;
      this.data[i + 3] = oa * 255;
    }
    this._dirty = true;
    return this;
  }

  /** Overwrite one pixel exactly (no blending); null clears it. */
  set(x, y, c) {
    x |= 0; y |= 0;
    if (!this.inside(x, y)) return this;
    const v = parseColor(c);
    const i = (y * this.w + x) * 4;
    this.data[i] = v[0]; this.data[i + 1] = v[1]; this.data[i + 2] = v[2]; this.data[i + 3] = v[3];
    this._dirty = true;
    return this;
  }

  clear(x = 0, y = 0, w = this.w, h = this.h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, null);
    return this;
  }

  // -- primitives
  rect(x, y, w, h, c) {
    for (let j = y | 0; j < (y | 0) + (h | 0); j++) for (let i = x | 0; i < (x | 0) + (w | 0); i++) this.px(i, j, c);
    return this;
  }
  rectOutline(x, y, w, h, c) {
    this.hline(x, x + w - 1, y, c); this.hline(x, x + w - 1, y + h - 1, c);
    this.vline(x, y, y + h - 1, c); this.vline(x + w - 1, y, y + h - 1, c);
    return this;
  }
  hline(x0, x1, y, c) { for (let x = Math.min(x0, x1) | 0; x <= Math.max(x0, x1); x++) this.px(x, y, c); return this; }
  vline(x, y0, y1, c) { for (let y = Math.min(y0, y1) | 0; y <= Math.max(y0, y1); y++) this.px(x, y, c); return this; }

  /** Bresenham line. */
  line(x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Filled circle (pixel-clean, no AA). */
  circle(cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); }

  /** Filled ellipse centered on (cx, cy); half-pixel centers allowed (e.g. cx = 7.5 for even widths). */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / (rx + 0.01), dy = (y + 0.5 - cy) / (ry + 0.01);
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    }
    return this;
  }

  /** 1px ring. */
  ring(cx, cy, r, c, thickness = 1) {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r + 0.5 && d > r + 0.5 - thickness) this.px(x, y, c);
      }
    }
    return this;
  }

  /** Filled polygon, points = [[x,y], ...] (even-odd scanline fill at pixel centers). */
  poly(points, c) {
    const ys = points.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.px(x, y, c);
      }
    }
    return this;
  }

  /** Call fn(x, y) for every pixel in a region; a returned color is painted, null/undefined skips. */
  fill(fn, x = 0, y = 0, w = this.w, h = this.h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const c = fn(i, j);
      if (c != null) this.px(i, j, c);
    }
    return this;
  }

  /** Ordered (Bayer 4x4) dither between c1 and c2 at coverage t (0 = all c1, 1 = all c2). */
  dither(x, y, w, h, c1, c2, t = 0.5) {
    return this.fill((i, j) => (bayer(i, j, t) ? c2 : c1), x, y, w, h);
  }

  /** Vertical gradient through a list of colors using dithered bands (classic pixel-art sky/metal). */
  gradientV(x, y, w, h, colors) {
    const n = colors.length - 1;
    return this.fill((i, j) => {
      const t = ((j - y) / Math.max(1, h - 1)) * n;
      const k = Math.min(n - 1, Math.floor(t));
      return bayer(i, j, t - k) ? colors[k + 1] : colors[k];
    }, x, y, w, h);
  }

  gradientH(x, y, w, h, colors) {
    const n = colors.length - 1;
    return this.fill((i, j) => {
      const t = ((i - x) / Math.max(1, w - 1)) * n;
      const k = Math.min(n - 1, Math.floor(t));
      return bayer(i, j, t - k) ? colors[k + 1] : colors[k];
    }, x, y, w, h);
  }

  /** Sprinkle random pixels from `colors` over a region at the given density (0-1). Deterministic per seed. */
  noise(x, y, w, h, colors, density = 0.1, seed = 7, onlyOpaque = false) {
    const r = rng(seed);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (r() < density && (!onlyOpaque || this.opaque(i, j))) this.px(i, j, colors[Math.floor(r() * colors.length)]);
    }
    return this;
  }

  /** Replace every pixel of color `from` with `to` (exact RGB match). */
  replace(from, to) {
    const F = parseColor(from), T = parseColor(to);
    for (let i = 0; i < this.data.length; i += 4) {
      if (this.data[i] === F[0] && this.data[i + 1] === F[1] && this.data[i + 2] === F[2] && this.data[i + 3] > 0) {
        this.data[i] = T[0]; this.data[i + 1] = T[1]; this.data[i + 2] = T[2]; this.data[i + 3] = T[3];
      }
    }
    this._dirty = true;
    return this;
  }

  /**
   * Selective outline: paint `color` on every transparent pixel that touches an opaque one.
   * diagonal=true also uses diagonal neighbours (thicker, rounder silhouettes).
   * Use it once at the end of drawing a sprite (sprites must leave >= 1px transparent margin).
   */
  outline(color = '#0b0e17', { diagonal = false } = {}) {
    const mark = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.opaque(x, y)) continue;
      let hit = this.opaque(x - 1, y) || this.opaque(x + 1, y) || this.opaque(x, y - 1) || this.opaque(x, y + 1);
      if (!hit && diagonal) hit = this.opaque(x - 1, y - 1) || this.opaque(x + 1, y - 1) || this.opaque(x - 1, y + 1) || this.opaque(x + 1, y + 1);
      if (hit) mark.push(x, y);
    }
    for (let i = 0; i < mark.length; i += 2) this.set(mark[i], mark[i + 1], color);
    return this;
  }

  /**
   * Rim shading on opaque pixels: pixels whose neighbour in direction (lx, ly) is transparent get
   * lightened (the light side); pixels whose opposite neighbour is transparent get darkened.
   * Default light comes from the upper-left, as in most pixel art.
   */
  rimShade({ lx = -1, ly = -1, light = 0.12, dark = -0.12, skip = null } = {}) {
    const ops = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!this.opaque(x, y)) continue;
      const c = this.get(x, y);
      if (skip && skip(c)) continue;
      const lit = !this.opaque(x + lx, y) || !this.opaque(x, y + ly);
      const shadow = !this.opaque(x - lx, y) || !this.opaque(x, y - ly);
      if (lit && !shadow) ops.push(x, y, shade(c, light));
      else if (shadow && !lit) ops.push(x, y, shade(c, dark));
    }
    for (let i = 0; i < ops.length; i += 3) this.set(ops[i], ops[i + 1], ops[i + 2]);
    return this;
  }

  /** Draw another Painter or canvas at (dx, dy). Options: flipX, flipY, alpha (0-1), tint (color to multiply). */
  blit(src, dx = 0, dy = 0, { flipX = false, flipY = false, alpha = 1, sx = 0, sy = 0, sw, sh } = {}) {
    const s = src instanceof Painter ? src : Painter.fromCanvas(src);
    sw = sw ?? s.w; sh = sh ?? s.h;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const c = s.get(sx + (flipX ? sw - 1 - x : x), sy + (flipY ? sh - 1 - y : y));
      if (c[3] === 0) continue;
      if (alpha < 1) c[3] = Math.round(c[3] * alpha);
      this.px(dx + x, dy + y, c);
    }
    return this;
  }

  clone() {
    const p = new Painter(this.w, this.h);
    p.data.set(this.data);
    return p;
  }

  flippedX() {
    const p = new Painter(this.w, this.h);
    p.blit(this, 0, 0, { flipX: true });
    return p;
  }

  /** New painter keeping only pixels where keep([r,g,b,a], x, y) is true; others cleared. */
  filter(keep) {
    const p = new Painter(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.get(x, y);
      if (c[3] > 0 && keep(c, x, y)) p.set(x, y, c);
    }
    return p;
  }

  /** Commit pixels to a canvas (cached; re-committed after further drawing). */
  get canvas() {
    if (!this._canvas) this._canvas = makeCanvas(this.w, this.h);
    if (this._dirty) {
      const ctx = this._canvas.getContext('2d');
      ctx.putImageData(new ImageData(new Uint8ClampedArray(this.data), this.w, this.h), 0, 0);
      this._dirty = false;
    }
    return this._canvas;
  }

  /** Nearest-neighbour upscaled copy (for DOM icons/portraits and previews). */
  toCanvas(scale = 1) {
    if (scale === 1) return this.canvas;
    const c = makeCanvas(this.w * scale, this.h * scale);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.canvas, 0, 0, c.width, c.height);
    return c;
  }

  toDataURL(scale = 1) {
    const c = this.toCanvas(scale);
    return c.toDataURL ? c.toDataURL('image/png') : '';
  }
}

// ---------------------------------------------------------------- sheets

/**
 * Pack equally sized frames (Painters or canvases) into one sheet, row-major.
 * Returns { painter, canvas, frameW, frameH, cols, rows, count }.
 */
export function packSheet(frames, cols = frames.length) {
  const ps = frames.map((f) => (f instanceof Painter ? f : Painter.fromCanvas(f)));
  const frameW = ps[0].w, frameH = ps[0].h;
  const rows = Math.ceil(ps.length / cols);
  const sheet = new Painter(frameW * cols, frameH * rows);
  ps.forEach((p, i) => sheet.blit(p, (i % cols) * frameW, Math.floor(i / cols) * frameH));
  return { painter: sheet, canvas: sheet.canvas, frameW, frameH, cols, rows, count: ps.length };
}

/** UV rect of frame i in a sheet, three.js convention (origin bottom-left, flipY textures). */
export function frameUV(sheet, i) {
  const col = i % sheet.cols, row = Math.floor(i / sheet.cols);
  return {
    u: col / sheet.cols,
    v: 1 - (row + 1) / sheet.rows,
    w: 1 / sheet.cols,
    h: 1 / sheet.rows,
  };
}

// ---------------------------------------------------------------- derived maps

/**
 * Normal map for a sprite/sheet, derived from its alpha silhouette ("pillow" bevel) plus a little
 * luminance relief. This is what lets flat pixel sprites catch colored rim light from 3D point lights.
 *   bevel:    px distance over which edges round off (2-4 typical)
 *   strength: slope multiplier
 *   lumaRelief: 0-1, how much brightness reads as height (adds interior detail)
 *   frameW/frameH: treat frame borders of a sheet as hard edges so frames don't bleed
 * Transparent pixels get the flat normal (128,128,255).
 */
export function makeNormalMap(src, { bevel = 3, strength = 2.2, lumaRelief = 0.35, frameW = 0, frameH = 0 } = {}) {
  const p = src instanceof Painter ? src : Painter.fromCanvas(src);
  const { w, h } = p;
  const fw = frameW || w, fh = frameH || h;
  const sameFrame = (x0, y0, x1, y1) => Math.floor(x0 / fw) === Math.floor(x1 / fw) && Math.floor(y0 / fh) === Math.floor(y1 / fh);
  // distance to nearest transparent pixel (chamfer, capped at bevel)
  const INF = 1e9;
  const dist = new Float32Array(w * h).fill(INF);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!p.opaque(x, y)) dist[y * w + x] = 0;
  const pass = (xs, ys, dx, dy) => {
    for (const y of ys) for (const x of xs) {
      const i = y * w + x;
      if (dist[i] === 0) continue;
      for (const [ox, oy, cost] of [[dx, 0, 1], [0, dy, 1], [dx, dy, 1.414], [-dx, dy, 1.414]]) {
        const nx = x + ox, ny = y + oy;
        const nd = nx < 0 || ny < 0 || nx >= w || ny >= h || !sameFrame(x, y, nx, ny) ? 0 : dist[ny * w + nx];
        if (nd + cost < dist[i]) dist[i] = nd + cost;
      }
    }
  };
  const fx = [...Array(w).keys()], fy = [...Array(h).keys()];
  pass(fx, fy, -1, -1);
  pass(fx.slice().reverse(), fy.slice().reverse(), 1, 1);
  const height = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (dist[i] === 0) continue;
    const d = Math.min(dist[i], bevel) / bevel;
    const edge = Math.sin(d * Math.PI / 2);
    const [r, g, b] = p.get(x, y);
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    height[i] = edge * (1 - lumaRelief) + luma * lumaRelief;
  }
  const out = new Painter(w, h);
  const H = (x, y, cx, cy) => (x < 0 || y < 0 || x >= w || y >= h || !sameFrame(cx, cy, x, y) ? 0 : height[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!p.opaque(x, y)) { out.set(x, y, [128, 128, 255, 255]); continue; }
    const dx = (H(x + 1, y, x, y) - H(x - 1, y, x, y)) * strength;
    const dyDown = (H(x, y + 1, x, y) - H(x, y - 1, x, y)) * strength; // canvas y grows downward
    let nx = -dx, ny = dyDown, nz = 1; // tangent space: +Y is "up" in the texture (flipY textures)
    const len = Math.hypot(nx, ny, nz);
    nx /= len; ny /= len; nz /= len;
    out.set(x, y, [Math.round((nx * 0.5 + 0.5) * 255), Math.round((ny * 0.5 + 0.5) * 255), Math.round((nz * 0.5 + 0.5) * 255), 255]);
  }
  return out;
}

/**
 * Emissive mask: copy of the pixels for which isGlow(color, x, y) is true, everything else black.
 * Feed it to material.emissiveMap so visors, LEDs and screens bloom.
 */
export function makeEmissiveMap(src, isGlow) {
  const p = src instanceof Painter ? src : Painter.fromCanvas(src);
  const out = new Painter(p.w, p.h);
  out.rect(0, 0, p.w, p.h, '#000000');
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const c = p.get(x, y);
    if (c[3] > 0 && isGlow(c, x, y)) out.set(x, y, [c[0], c[1], c[2], 255]);
  }
  return out;
}

// ---------------------------------------------------------------- three.js bridge

/**
 * three.js texture from a canvas/Painter with pixel-art settings (nearest filtering, no mipmaps).
 *   color: true for albedo/emissive (sRGB), false for data maps (normal maps)
 *   repeat: [rx, ry] enables RepeatWrapping (tiling floors/walls)
 */
export function toTexture(src, { color = true, repeat = null } = {}) {
  const canvas = src instanceof Painter ? src.canvas : src;
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.needsUpdate = true;
  return t;
}
