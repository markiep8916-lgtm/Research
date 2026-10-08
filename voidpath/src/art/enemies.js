// Enemy pixel art for VOIDPATH battles: drone, crawler, turret and the SENTINEL boss.
//
// Every frame is painted procedurally by a small pose-driven "rig": analytic shapes (shaded
// ellipsoids, tapered capsules, faceted plates, tube rings, radial glows) are rasterised in a
// local model space under an affine transform, so tilted hurt / break poses are clean redraws
// instead of resampled rotations. Each shape is lit by one fixed key light (upper left) with
// ramp quantisation and light Bayer dithering at band edges, parts get dark separation lines
// where they overlap, and the silhouette gets a tinted dark outline at the end.
// Albedo and emissive are painted together so glowing pixels line up exactly.
//
// All sprites face RIGHT (toward the party). Sheets follow the CONTRACTS.md sprite sheet shape.
//
// Registry (TECH_PLAN 7.6): registerEnemyArt(art, def) adds content arts (bosses up to 256x256 with
// an optional fitBox for the battle camera); BUILTIN_ART holds the four POC defs so content can derive
// variants, and Rig is the drawing rig every def paints with. buildEnemySprite / buildEnemyIcon /
// prebuildEnemySprites accept any registered art and fall back to a tinted placeholder (one
// console.warn per art, listed by debug.missingArt). Sheets and icons live in the art cache under
// 'enemy:<art>'; a sheet's cacheKey lets the SpriteActors showing it hold it against eviction.

import { Painter, PX_PER_UNIT, packSheet, makeNormalMap, parseColor, rng } from './painter.js';
import { RAMPS, GLOW, OUTLINE } from './palette.js';
import { artCache, noteMissingArt } from './cache.js';

export const ENEMY_KINDS = ['drone', 'crawler', 'turret', 'sentinel'];

// ---------------------------------------------------------------- colours

const col = (hex) => parseColor(hex);
const rp = (...hex) => hex.map(col);
const OUT = col(OUTLINE);
const WHITE = col('#ffffff');

// material ramps, dark -> light
const STEEL = rp('#141927', '#1e2536', '#2a3349', '#3b4762', '#55667f', '#7d90a8', '#b2c2d4', '#e1e9f2');
const GUN = rp('#090b12', '#0f1219', '#191e29', '#242b3a', '#323b4e', '#475267', '#66738a', '#93a0b5');
const HULL = rp('#10131c', '#191e2b', '#232a3b', '#2f384d', '#414c64', '#5a6680');
const CRIMSON = rp('#2c0910', '#5c1220', '#9a1b30', '#d82d45', '#ff5d6c', '#ffa3aa');
const AMBER = RAMPS.amber.map(col);
const GOLD = RAMPS.gold.map(col);
const CHITIN = rp('#0a0714', '#160f2a', '#22173f', '#302156', '#422e73', '#573c94', '#7658c6', '#b39ff5');
const CHITIN_FAR = rp('#05040a', '#0c0918', '#140f27', '#1d1538', '#281d4c', '#372866');
const BONE = rp('#2b2433', '#4a3f52', '#6e6275', '#968b98', '#c2b8bd', '#e8e0dc');
const OLIVE = rp('#11140c', '#1c2214', '#2a321d', '#3b4528', '#535f37', '#717d4b');
const IVORY = rp('#141720', '#222736', '#343b4f', '#4c5569', '#6b768c', '#8f9bb0', '#b5bfcf', '#dce3ee');
const BRONZE = rp('#1a1006', '#33200b', '#553612', '#7d521b', '#a87228', '#d39a3c', '#f2c56a', '#fff0b8');

// glow ramps, outer (dim) -> inner (hot)
const G_RED = rp('#5c1220', '#b01c33', '#ff3b4e', '#ff7f8a', '#ffd6da');
const G_RED_DIM = rp('#2c0910', '#4a0f1a', '#6e1424', '#8f2232', '#a8404c');
const G_CYAN = rp('#0d4f78', '#1479b0', '#29a9e0', '#7ff4ff', '#e6fdff');
const G_TEAL = rp('#0b4350', '#0f6a78', '#16a0a8', '#4dffe0', '#d9fff6');
const G_TEAL_DIM = rp('#06262e', '#0a343c', '#0e4651', '#135a63', '#1f6e72');
const G_MAG = rp('#5c1450', '#95207a', '#ff4fc0', '#ff9ad8', '#fff0fa');
const G_BLADE = rp('#5c1450', '#95207a', '#d23596', '#ff4fc0', '#ff86d0');
const G_BLADE_CORE = rp('#ffb0dc', '#ffe4f4', '#ffffff');
const G_MAG_DIM = rp('#2e0a2a', '#4a1043', '#6b1660', '#86207a', '#9c3a8f');
const G_FIRE = rp('#b25a17', '#ff8a2a', '#ffc35a', '#fff0b0', '#ffffff');
const SMOKE = rp('#1d212b', '#2b303c', '#3c4250', '#525a69');
const GLOW_C = Object.fromEntries(Object.entries(GLOW).map(([k, v]) => [k, col(v)]));
const PUPIL = rp('#5c1220', '#3a0c16');
const PUPIL_DIM = rp('#1c0508', '#14040a');
const BORE = rp('#05060a', '#0d0a14', '#1a0f20');

// ---------------------------------------------------------------- the rig

const OPAQUE = 1, FX = 2, PART = 4, LIT = 8;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
const dith = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function norm3(x, y, z) {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}
const [LX, LY, LZ] = norm3(-0.55, -0.78, 0.62);   // key light: upper left, toward the viewer
const [HX, HY, HZ] = norm3(LX, LY, LZ + 1);        // half vector for specular glints

class Rig {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.rgb = new Uint8ClampedArray(w * h * 3);
    this.glw = new Uint8ClampedArray(w * h * 3);
    this.flg = new Uint8Array(w * h);
    this.m = [1, 0, 0, 1, 0, 0];
    this.sc = 1;               // uniform scale of m (keeps lighting normals unit length)
    this.stack = [];
    this.inPart = false;
    this.bb = [0, 0, 0, 0];
  }

  // -- transform (screen = M * model); positive angles turn clockwise on screen
  save() { this.stack.push([this.m.slice(), this.sc]); return this; }
  restore() { [this.m, this.sc] = this.stack.pop(); return this; }
  scale(k) {
    const m = this.m;
    m[0] *= k; m[1] *= k; m[2] *= k; m[3] *= k;
    this.sc *= k;
    return this;
  }
  translate(x, y) {
    const m = this.m;
    m[4] += m[0] * x + m[2] * y;
    m[5] += m[1] * x + m[3] * y;
    return this;
  }
  rotate(a, cx = 0, cy = 0) {
    if (!a) return this;
    this.translate(cx, cy);
    const m = this.m, c = Math.cos(a), s = Math.sin(a);
    const a0 = m[0], b0 = m[1], c0 = m[2], d0 = m[3];
    m[0] = a0 * c + c0 * s; m[1] = b0 * c + d0 * s;
    m[2] = c0 * c - a0 * s; m[3] = d0 * c - b0 * s;
    return this.translate(-cx, -cy);
  }
  /** Model point -> screen point. */
  pt(x, y) {
    const m = this.m;
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  }

  // -- raw pixel writes (screen space)
  put(X, Y, c, glow = 0, fx = false) {
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return;
    const i = Y * this.w + X, j = i * 3;
    this.rgb[j] = c[0]; this.rgb[j + 1] = c[1]; this.rgb[j + 2] = c[2];
    let f = OPAQUE | (fx ? FX : 0);
    if (glow > 0) {
      this.glw[j] = c[0] * glow; this.glw[j + 1] = c[1] * glow; this.glw[j + 2] = c[2] * glow;
      f |= LIT;
    }
    if (this.inPart) {
      f |= PART;
      const b = this.bb;
      if (X < b[0]) b[0] = X;
      if (Y < b[1]) b[1] = Y;
      if (X > b[2]) b[2] = X;
      if (Y > b[3]) b[3] = Y;
    }
    this.flg[i] = f;
  }

  /** Visit every screen pixel whose centre maps into the model-space box; fn(mx, my, X, Y). */
  each(x0, y0, x1, y1, fn) {
    const m = this.m;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let k = 0; k < 4; k++) {
      const x = k & 1 ? x1 : x0, y = k & 2 ? y1 : y0;
      const X = m[0] * x + m[2] * y + m[4], Y = m[1] * x + m[3] * y + m[5];
      if (X < minX) minX = X;
      if (X > maxX) maxX = X;
      if (Y < minY) minY = Y;
      if (Y > maxY) maxY = Y;
    }
    const det = m[0] * m[3] - m[1] * m[2];
    const ia = m[3] / det, ic = -m[2] / det, ib = -m[1] / det, id = m[0] / det;
    const X0 = Math.max(0, Math.floor(minX)), X1 = Math.min(this.w - 1, Math.ceil(maxX));
    const Y0 = Math.max(0, Math.floor(minY)), Y1 = Math.min(this.h - 1, Math.ceil(maxY));
    for (let Y = Y0; Y <= Y1; Y++) {
      for (let X = X0; X <= X1; X++) {
        const dx = X + 0.5 - m[4], dy = Y + 0.5 - m[5];
        fn(ia * dx + ic * dy, ib * dx + id * dy, X, Y);
      }
    }
  }

  // -- lighting
  /** Shade a pixel from a model-space normal and write the ramp colour. */
  lightPut(X, Y, nx, ny, nz, ramp, o) {
    const m = this.m, k = 1 / this.sc;
    const sx = (m[0] * nx + m[2] * ny) * k, sy = (m[1] * nx + m[3] * ny) * k;
    const l = Math.hypot(sx, sy, nz) || 1;
    const ux = sx / l, uy = sy / l, uz = nz / l;
    const d = ux * LX + uy * LY + uz * LZ;
    const wrap = o.wrap ?? 0.35, amb = o.amb ?? 0.06;
    let v = amb + (1 - amb) * Math.pow(Math.max(0, (d + wrap) / (1 + wrap)), o.gamma ?? 1.45);
    if (d < 0 && o.bounce !== 0) v += (o.bounce ?? 0.16) * (1 - uz) * Math.min(1, -d * 2.5);
    v = v * (o.gain ?? 1) + (o.bias ?? 0);
    let c;
    if (o.spec && ux * HX + uy * HY + uz * HZ > (o.specT ?? 0.95)) c = o.spec === true ? WHITE : o.spec;
    else {
      const n = ramp.length - 1;
      c = ramp[clamp(Math.round(v * n + dith(X, Y) * (o.dither ?? 0.34)), o.min ?? 0, o.max ?? n)];
    }
    this.put(X, Y, c, o.glow || 0, o.fx);
  }

  // -- shaded primitives (model space)
  /** Ellipsoid. o.clip(mx,my) limits it; o.concave makes a dish; o.flat (<1) squashes depth. */
  ball(cx, cy, rx, ry, ramp, o = {}) {
    const flat = o.flat ?? 1, cc = o.concave ? -1 : 1;
    this.each(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (mx, my, X, Y) => {
      const u = (mx - cx) / rx, v = (my - cy) / ry, d2 = u * u + v * v;
      if (d2 > 1 || (o.clip && !o.clip(mx, my))) return;
      this.lightPut(X, Y, u * cc, v * cc, Math.sqrt(1 - d2) * flat + 0.05, ramp, o);
    });
    return this;
  }

  /** Tapered capsule from a (radius ra) to b (radius rb); o.caps: 'round' | 'flat'. */
  seg(ax, ay, bx, by, ra, rb, ramp, o = {}) {
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1e-6, len = Math.sqrt(len2);
    const px = -dy / len, py = dx / len;
    const flatCaps = o.caps === 'flat';
    const r = Math.max(ra, rb) + 1;
    this.each(Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.max(ax, bx) + r, Math.max(ay, by) + r, (mx, my, X, Y) => {
      const t = ((mx - ax) * dx + (my - ay) * dy) / len2;
      if (flatCaps && (t < 0 || t > 1)) return;
      const tc = clamp(t, 0, 1);
      const rad = ra + (rb - ra) * tc;
      const ox = mx - (ax + dx * tc), oy = my - (ay + dy * tc);
      const dist = Math.hypot(ox, oy);
      if (dist > rad || (o.clip && !o.clip(mx, my))) return;
      if (t >= 0 && t <= 1) {
        const s = clamp((ox * px + oy * py) / rad, -1, 1);
        this.lightPut(X, Y, px * s, py * s, Math.sqrt(1 - s * s) + 0.05, ramp, o);
      } else {
        const nx = ox / rad, ny = oy / rad;
        this.lightPut(X, Y, nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) + 0.05, ramp, o);
      }
    });
    return this;
  }

  /**
   * Polygon plate. Shading: o.n = facet normal [nx,ny,nz] (default facing the viewer, slightly up),
   * o.nf(mx, my) = per-pixel model normal, or o.idx = fixed ramp index.
   * o.bevel adds a light top/left rim and a dark bottom/right rim.
   */
  poly(pts, ramp, o = {}) {
    const np = pts.length, xs = new Float64Array(np), ys = new Float64Array(np);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < np; i++) {
      const x = (xs[i] = pts[i][0]), y = (ys[i] = pts[i][1]);
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    const inside = (mx, my) => {
      let c = false;
      for (let i = 0, j = np - 1; i < np; j = i++) {
        if ((ys[i] > my) !== (ys[j] > my) && mx < ((xs[j] - xs[i]) * (my - ys[i])) / (ys[j] - ys[i]) + xs[i]) c = !c;
      }
      return c;
    };
    const n = o.n || [0, -0.25, 1];
    const m = this.m, det = m[0] * m[3] - m[1] * m[2];
    // model-space step for one screen pixel in x and in y
    const sxx = m[3] / det, sxy = -m[1] / det, syx = -m[2] / det, syy = m[0] / det;
    const bevel = o.bevel ?? 0;
    // flat facets get no ordered dither (it would checker the whole plate)
    const flatO = o.nf || o.dither != null ? o : { ...o, dither: 0 };
    const step = bevel / (ramp.length - 1);
    const litO = { ...o, bias: (o.bias ?? 0) + step, dither: 0 };
    const darkO = { ...o, bias: (o.bias ?? 0) - step, dither: 0 };
    this.each(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (mx, my, X, Y) => {
      if (!inside(mx, my) || (o.clip && !o.clip(mx, my))) return;
      let b = 0;
      if (bevel) {
        if (!inside(mx - sxx, my - sxy) || !inside(mx - syx, my - syy)) b = 1;
        else if (!inside(mx + sxx, my + sxy) || !inside(mx + syx, my + syy)) b = -1;
      }
      if (o.idx != null) {
        this.put(X, Y, ramp[clamp(o.idx + b * bevel, 0, ramp.length - 1)], o.glow || 0, o.fx);
      } else {
        const nn = o.nf ? o.nf(mx, my) : n;
        this.lightPut(X, Y, nn[0], nn[1], nn[2], ramp, b > 0 ? litO : b < 0 ? darkO : flatO);
      }
    });
    return this;
  }

  /** Tube ring (torus seen face-on) between radii r0 and r1. */
  ring(cx, cy, r0, r1, ramp, o = {}) {
    const rm = (r0 + r1) / 2, hw = (r1 - r0) / 2, ry = o.ry ?? 1;
    this.each(cx - r1 - 1, cy - r1 * ry - 1, cx + r1 + 1, cy + r1 * ry + 1, (mx, my, X, Y) => {
      const dx = mx - cx, dy = (my - cy) / ry, d = Math.hypot(dx, dy);
      if (d < r0 || d > r1 || (o.clip && !o.clip(mx, my))) return;
      const s = clamp((d - rm) / hw, -1, 1);
      this.lightPut(X, Y, (dx / (d || 1)) * s, (dy / (d || 1)) * s, Math.sqrt(1 - s * s) + 0.05, ramp, o);
    });
    return this;
  }

  /** Radial glow disc: ramp outer -> inner, emissive. o.k = emissive strength, o.fx = no outline. */
  glow(cx, cy, rx, ry, ramp, o = {}) {
    const n = ramp.length;
    this.each(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (mx, my, X, Y) => {
      const u = (mx - cx) / rx, v = (my - cy) / ry, d = Math.sqrt(u * u + v * v);
      if (d > 1) return;
      const k = clamp(Math.floor((1 - d) * n + dith(X, Y) * (o.dither ?? 0.6) + (o.bias ?? 0)), 0, n - 1);
      this.put(X, Y, ramp[k], o.k ?? 1, o.fx);
    });
    return this;
  }

  /** Capsule with a radial profile (hot core, dim edges): energy blades, beams. Emissive. */
  beam(ax, ay, bx, by, ra, rb, ramp, o = {}) {
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1e-6;
    const r = Math.max(ra, rb) + 1, n = ramp.length;
    this.each(Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.max(ax, bx) + r, Math.max(ay, by) + r, (mx, my, X, Y) => {
      const t = clamp(((mx - ax) * dx + (my - ay) * dy) / len2, 0, 1);
      const rad = ra + (rb - ra) * t;
      const d = Math.hypot(mx - (ax + dx * t), my - (ay + dy * t)) / rad;
      if (d > 1) return;
      const k = clamp(Math.floor((1 - d) * n + dith(X, Y) * (o.dither ?? 0.7) + (o.bias ?? 0)), 0, n - 1);
      this.put(X, Y, ramp[k], o.k ?? 1, o.fx);
    });
    return this;
  }

  // -- flat primitives (model space, transformed)
  dot(x, y, c, glow = 0, fx = false) {
    const [X, Y] = this.pt(x + 0.5, y + 0.5);
    this.put(Math.floor(X), Math.floor(Y), c, glow, fx);
    return this;
  }
  rect(x, y, w, h, c, glow = 0, fx = false) {
    this.each(x, y, x + w, y + h, (mx, my, X, Y) => {
      if (mx >= x && mx < x + w && my >= y && my < y + h) this.put(X, Y, c, glow, fx);
    });
    return this;
  }
  line(x0, y0, x1, y1, c, glow = 0, fx = false) {
    let [ax, ay] = this.pt(x0 + 0.5, y0 + 0.5);
    let [bx, by] = this.pt(x1 + 0.5, y1 + 0.5);
    ax = Math.floor(ax); ay = Math.floor(ay); bx = Math.floor(bx); by = Math.floor(by);
    const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.put(ax, ay, c, glow, fx);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; ax += sx; }
      if (e2 <= dx) { err += dx; ay += sy; }
    }
    return this;
  }

  // -- parts: pixels painted between begin/end get a dark separation line on what lies beneath
  begin() {
    this.inPart = true;
    this.bb = [this.w, this.h, -1, -1];
    return this;
  }
  end(amount = 0.62) {
    this.inPart = false;
    const [bx0, by0, bx1, by1] = this.bb;
    if (bx1 < 0) return this;
    const w = this.w, f = this.flg, rgb = this.rgb;
    const X0 = Math.max(0, bx0 - 1), X1 = Math.min(w - 1, bx1 + 1);
    const Y0 = Math.max(0, by0 - 1), Y1 = Math.min(this.h - 1, by1 + 1);
    if (amount > 0) {
      const marks = [];
      for (let Y = Y0; Y <= Y1; Y++) {
        for (let X = X0; X <= X1; X++) {
          const i = Y * w + X, fi = f[i];
          if (!(fi & OPAQUE) || fi & (PART | FX)) continue;
          const nb = (X > 0 && f[i - 1] & PART) || (X < w - 1 && f[i + 1] & PART) ||
            (Y > 0 && f[i - w] & PART) || (Y < this.h - 1 && f[i + w] & PART);
          if (nb) marks.push(i);
        }
      }
      for (const i of marks) {
        const j = i * 3;
        rgb[j] += (OUT[0] - rgb[j]) * amount;
        rgb[j + 1] += (OUT[1] - rgb[j + 1]) * amount;
        rgb[j + 2] += (OUT[2] - rgb[j + 2]) * amount;
        f[i] &= ~LIT;
      }
    }
    for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) f[Y * w + X] &= ~PART;
    return this;
  }

  /** Final pass: tinted dark outline around the silhouette (FX pixels get none). Returns Painters. */
  finish() {
    const { w, h, rgb, glw, flg } = this;
    const p = new Painter(w, h), e = new Painter(w, h);
    const pd = p.data, ed = e.data;
    for (let Y = 0; Y < h; Y++) {
      for (let X = 0; X < w; X++) {
        const i = Y * w + X, j = i * 3, k = i * 4;
        if (flg[i] & OPAQUE) {
          pd[k] = rgb[j]; pd[k + 1] = rgb[j + 1]; pd[k + 2] = rgb[j + 2]; pd[k + 3] = 255;
          if (flg[i] & LIT) { ed[k] = glw[j]; ed[k + 1] = glw[j + 1]; ed[k + 2] = glw[j + 2]; ed[k + 3] = 255; }
          continue;
        }
        let n = -1;
        if (X > 0 && (flg[i - 1] & (OPAQUE | FX)) === OPAQUE) n = i - 1;
        else if (X < w - 1 && (flg[i + 1] & (OPAQUE | FX)) === OPAQUE) n = i + 1;
        else if (Y > 0 && (flg[i - w] & (OPAQUE | FX)) === OPAQUE) n = i - w;
        else if (Y < h - 1 && (flg[i + w] & (OPAQUE | FX)) === OPAQUE) n = i + w;
        if (n < 0) continue;
        const q = n * 3;
        pd[k] = OUT[0] + (rgb[q] - OUT[0]) * 0.16;
        pd[k + 1] = OUT[1] + (rgb[q + 1] - OUT[1]) * 0.16;
        pd[k + 2] = OUT[2] + (rgb[q + 2] - OUT[2]) * 0.16;
        pd[k + 3] = 255;
      }
    }
    return { p, e };
  }
}

// ---------------------------------------------------------------- shared effect helpers

/** Star-shaped spark / glint, emissive (kept moderate so bloom does not swallow small sprites), no outline. */
function spark(r, x, y, size, ramp = G_FIRE) {
  const top = ramp[ramp.length - 1], mid = ramp[ramp.length - 2], low = ramp[ramp.length - 3];
  r.dot(x, y, top, 0.7, true);
  for (let k = 1; k <= size; k++) {
    const c = k === 1 ? mid : low;
    r.dot(x + k, y, c, 0.5, true); r.dot(x - k, y, c, 0.5, true);
    r.dot(x, y + k, c, 0.5, true); r.dot(x, y - k, c, 0.5, true);
  }
  if (size >= 2) {
    r.dot(x + 1, y + 1, low, 0.4, true); r.dot(x - 1, y - 1, low, 0.4, true);
    r.dot(x + 1, y - 1, low, 0.4, true); r.dot(x - 1, y + 1, low, 0.4, true);
  }
}

/** A scatter of sparks and short ballistic streaks around (cx, cy). */
function sparks(r, seed, cx, cy, spread, n) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = spread * (0.3 + R() * 0.7);
    const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * 0.8);
    if (R() < 0.45) spark(r, x, y, R() < 0.4 ? 2 : 1);
    else {
      // streak flying outward and falling
      const len = 2 + Math.floor(R() * 3), sx = Math.sign(Math.cos(a)) || 1;
      for (let k = 0; k < len; k++) r.dot(x + sx * k, y + Math.floor((k * k) / 3), k === 0 ? G_FIRE[4] : G_FIRE[3 - Math.min(2, k)], 0.55, true);
    }
  }
}

/** Dithered smoke puff (not emissive, no outline). */
function smoke(r, seed, cx, cy, rad, density = 0.75) {
  const R = rng(seed);
  r.each(cx - rad - 1, cy - rad - 1, cx + rad + 1, cy + rad + 1, (mx, my, X, Y) => {
    const d = Math.hypot(mx - cx, (my - cy) * 1.2) / rad;
    if (d > 1 || R() > density * (1.1 - d)) return;
    const k = clamp(Math.floor((1 - d) * SMOKE.length + dith(X, Y)), 0, SMOKE.length - 1);
    r.put(X, Y, SMOKE[k], 0, true);
  });
}

/** Small glowing spot: bright core with a coloured halo (size 1-3), emissive. */
function spot(r, x, y, size, ramp, k = 1) {
  const n = ramp.length;
  const hot = ramp[n - 1], mid = ramp[n - 2], low = ramp[n - 3];
  x = Math.round(x);
  y = Math.round(y);
  if (size <= 1) {
    r.dot(x, y, mid, k);
    return;
  }
  if (size === 2) {
    r.dot(x, y, hot, k); r.dot(x + 1, y, mid, k); r.dot(x, y + 1, mid, k); r.dot(x + 1, y + 1, low, k);
    return;
  }
  r.dot(x, y, hot, k);
  r.dot(x - 1, y, mid, k); r.dot(x + 1, y, mid, k); r.dot(x, y - 1, mid, k); r.dot(x, y + 1, mid, k);
  r.dot(x - 1, y - 1, low, k); r.dot(x + 1, y - 1, low, k); r.dot(x - 1, y + 1, low, k); r.dot(x + 1, y + 1, low, k);
}

/** Tapered thruster flame from (x, y) along (dx, dy): hot white core, coloured edges; emissive, no outline. */
function flame(r, x, y, len, ramp = G_CYAN, dx = 0, dy = 1, width = 2) {
  if (len <= 0) return;
  const n = ramp.length;
  for (let k = 0; k < len; k++) {
    const t = k / len, hw = width * (1 - t * 0.85) + 0.2;
    for (let s = -Math.ceil(hw); s <= Math.ceil(hw); s++) {
      const a = Math.abs(s) / (hw + 0.5);
      if (a > 1) continue;
      const px = x + dx * k - dy * s, py = y + dy * k + dx * s;
      const heat = (1 - t) * (1 - a * 0.75);
      r.dot(px, py, ramp[clamp(Math.floor(heat * n + dith(px, py) * 0.5 + 0.35), 0, n - 1)], 1, true);
    }
  }
}

/** Muzzle flash: bright core with spikes along the shot direction, emissive, no outline. */
function muzzleFlash(r, x, y, size, ramp = G_FIRE, dir = 1) {
  r.glow(x + dir * size * 0.4, y, size * 0.9, size * 0.62, ramp, { fx: true, bias: 0.4 });
  for (let k = 0; k <= size * 1.6; k++) r.dot(x + dir * k, y, ramp[clamp(ramp.length - 1 - Math.floor(k / 3), 1, 4)], 1, true);
  for (let k = 1; k <= size * 0.8; k++) {
    r.dot(x + dir * (k * 0.7), y - k * 0.7, ramp[2], 1, true);
    r.dot(x + dir * (k * 0.7), y + k * 0.7, ramp[2], 1, true);
  }
  r.dot(x, y - Math.round(size * 0.7), ramp[1], 1, true);
  r.dot(x, y + Math.round(size * 0.7), ramp[1], 1, true);
}

// ---------------------------------------------------------------- DRONE (48x48)

/** Rounded thruster nacelle on a pylon, with a glowing intake band and a downward nozzle. */
function dronePod(r, x, y, rx, ry, ramp, pylonTo, thrust, bandK) {
  r.begin();
  r.seg(pylonTo[0], pylonTo[1], x, y + 1, 1.4, 1.4, GUN, { caps: 'flat' });
  r.ball(x, y, rx, ry, ramp, { max: ramp.length - 2, spec: ramp[ramp.length - 1], specT: 0.975 });
  r.ball(x, y, rx, ry, G_CYAN, { clip: (mx, my) => Math.abs(my - (y + 1.5)) < 0.75, glow: bandK, min: 1, gamma: 1, bias: 0.15 });
  r.ball(x, y, rx, ry, GUN, { clip: (mx, my) => my < y - ry * 0.55, max: 5 });
  r.ring(x, y + ry + 0.3, 1.2, rx * 0.8, GUN, { ry: 0.5 });
  r.end();
  flame(r, Math.round(x - 0.5), Math.round(y + ry + 1.5), thrust, G_CYAN, 0, 1, rx * 0.36);
}

function drawDrone(r, P) {
  const cx = 24, cy = 20;
  const lens = P.lens ?? 1;
  r.save();
  r.translate(P.dx || 0, P.bob || 0);
  r.rotate(P.tilt || 0, cx, cy + 4);

  // far pod and the antenna sit behind the shell
  dronePod(r, 39.5, 14.5, 3.4, 4.4, HULL, [34, 17], P.thrust?.[1] ?? 3, 0.55);
  r.line(16, 11, 13, 2, STEEL[5]);
  r.line(17, 11, 14, 3, STEEL[2]);
  r.dot(13, 1, P.led ? GLOW_C.red : CRIMSON[1], P.led ? 1 : 0);

  // shell: armoured dome with a crimson security stripe over a darker hull
  r.begin();
  r.ball(cx, cy, 12.5, 11.5, STEEL, { max: 6, spec: STEEL[7], specT: 0.985 });
  r.ball(cx, cy, 12.5, 11.5, CRIMSON, { clip: (x, y) => { const k = (x - cx) * 0.5 + (y - cy); return k > -9.5 && k < -6.5; }, max: 4 });
  r.ball(cx, cy, 12.5, 11.5, HULL, { clip: (x, y) => y > cy + 2.5 + (x - cx) * 0.12 });
  r.end();
  // equator seam with rivets, hull vents, scratches
  r.each(cx - 13, cy, cx + 13, cy + 6, (mx, my, X, Y) => {
    const u = (mx - cx) / 12.5, yy = cy + 2.5 + (mx - cx) * 0.12;
    if (Math.abs(u) < 0.97 && my >= yy - 0.5 && my < yy + 0.5) r.put(X, Y, GUN[1]);
  });
  for (const x of [15, 20]) r.dot(x, Math.round(cy + 1.4 + (x - cx) * 0.12), STEEL[6]);
  for (let k = 0; k < 3; k++) r.line(15 + k * 3, 27 + (k & 1), 16 + k * 3, 28 + (k & 1), GUN[0]);
  r.line(15, 17, 17, 16, STEEL[6]);
  r.dot(18, 19, STEEL[3]);
  r.dot(13, 21, STEEL[3]);

  // lens: armoured socket, glowing eye, brow plate
  const lx = 29.5, ly = 20.5;
  r.begin();
  r.ring(lx, ly, 4.4, 7.4, GUN, { spec: GUN[7], specT: 0.97 });
  r.end(0.5);
  r.glow(lx + 0.4, ly, 4.7, 4.7, lens > 0.6 ? G_RED : G_RED_DIM, { k: Math.max(0.25, Math.min(1, lens)), bias: lens > 1 ? 0.8 : 0 });
  r.ball(lx + 1.3, ly + 0.2, 1.2, 2.3, lens > 0.6 ? PUPIL : PUPIL_DIM, { bounce: 0 });
  if (lens > 0.6) {
    r.dot(lx - 2, ly - 2, WHITE, 1);
    r.dot(lx - 1, ly - 3, G_RED[3], 1);
  }
  if (P.glitch) {
    r.line(lx - 4, ly - 1, lx + 3, ly - 1, WHITE, 1);
    r.line(lx - 2, ly + 2, lx + 4, ly + 2, G_RED[2], 0.6);
  }
  r.begin();
  r.poly([[21, 13.5], [30, 11.5], [37.5, 14], [38, 16.5], [31, 14.6], [23, 16]], GUN, { n: [0.1, -0.7, 0.7], bevel: 1 });
  r.end(0.55);

  // gun: housing under the lens and a short barrel
  const rec = P.recoil || 0;
  r.begin();
  r.poly([[25, 27], [34, 26], [36, 31.5], [26, 32]], HULL, { n: [0.2, 0.3, 0.9], bevel: 1 });
  r.seg(33 - rec, 29.5, 44 - rec, 29.5, 1.6, 1.3, GUN, { caps: 'flat', spec: GUN[7], specT: 0.96 });
  r.rect(43 - rec, 27.5, 2, 4, GUN[5]);
  r.dot(44 - rec, 27.5, GUN[7]);
  r.end(0.5);
  if (P.charge) r.glow(46 - rec, 29.5, P.charge, P.charge, G_RED, { fx: true, bias: 0.5 });
  if (P.flash) muzzleFlash(r, 46 - rec, 29.5, P.flash);
  if (P.puff) smoke(r, 31, 46 - rec, 27, 2.6);

  // near pod (in front)
  dronePod(r, 8, 17, 4.3, 5.4, STEEL, [13, 20], P.thrust?.[0] ?? 4, 1);

  if (P.sparks) sparks(r, P.sparks, 22, 19, 12, 6);
  if (P.smoke) {
    smoke(r, P.smoke, 19, 7, 3.6);
    smoke(r, P.smoke + 7, 16, 3, 2.6, 0.55);
  }
  r.restore();
}

const DRONE = {
  w: 48, h: 48,
  draw: drawDrone,
  anims: {
    idle: { fps: 6, loop: true, poses: [
      { bob: 0, thrust: [7, 5], led: 1 },
      { bob: -1, thrust: [8, 6], led: 1 },
      { bob: -2, thrust: [7, 5] },
      { bob: -1, thrust: [6, 4] },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { bob: -1, dx: -1, lens: 1.4, charge: 2.2, thrust: [8, 6], led: 1 },
      { bob: -1, dx: -2, tilt: -0.06, recoil: 2, flash: 6, lens: 1.3, thrust: [9, 7], led: 1 },
      { bob: 0, dx: -1, recoil: 1, puff: 1, thrust: [7, 5] },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { bob: -1, dx: 1, tilt: -0.3, lens: 0.5, glitch: 1, thrust: [3, 2] },
    ] },
    break: { fps: 5, loop: true, poses: [
      { bob: 4, dx: 0, tilt: 0.36, lens: 0.3, sparks: 11, smoke: 5, thrust: [3, 0] },
      { bob: 5, dx: 0, tilt: 0.42, lens: 0.45, sparks: 23, smoke: 9, thrust: [1, 0] },
    ] },
  },
  points: { center: [23, 21], muzzle: [45, 30], top: [23, 6] },
  icon: { x: 26, y: 21, scale: 0.62 },
};

// ---------------------------------------------------------------- CRAWLER (80x56)

const DEG = Math.PI / 180;

/** Jointed insect leg (hip -> knee -> foot, screen space) with a knee spur and a hooked claw. */
function crawlerLeg(r, hip, knee, foot, ramp, near) {
  const [kx, ky] = knee, [fx, fy] = foot;
  const s = near ? 1 : 0.85;
  const top = ramp.length - 1;
  r.begin();
  r.seg(hip[0], hip[1], kx, ky, 3.1 * s, 2.3 * s, ramp, { spec: near ? ramp[top] : null, specT: 0.95, max: top - 2, bounce: 0.3 });
  r.end(0.5);
  r.begin();
  r.seg(kx, ky, fx, fy, 2.4 * s, 1.0, ramp, { caps: 'flat', max: top - 2, bounce: 0.3, spec: near ? ramp[top - 1] : null, specT: 0.95 });
  r.ball(kx, ky, 2.7 * s, 2.7 * s, ramp, { max: top - 1, spec: near ? ramp[top] : null, specT: 0.93 });
  // spur pointing up-back from the knee, claw hooking forward at the foot
  const dir = fx >= hip[0] ? 1 : -1;
  r.seg(kx, ky - 1, kx - dir * 2.5, ky - 4.5, 1.1, 0.3, ramp, { max: top - 2 });
  r.line(Math.round(fx), Math.round(fy), Math.round(fx + dir * 2), Math.round(fy), ramp[1]);
  r.end(0.5);
}

/** Mandible: a curved tapered pincer from base (bx, by) opening by angle a (radians, + = away from centre). */
function mandible(r, bx, by, a, upper, ramp) {
  const sgn = upper ? -1 : 1;
  const base = (upper ? -10 : 14) * DEG + sgn * a;
  const mx = bx + Math.cos(base) * 7, my = by + Math.sin(base) * 7;
  const tipA = base - sgn * 55 * DEG;
  const tx = mx + Math.cos(tipA) * 5, ty = my + Math.sin(tipA) * 5;
  r.begin();
  r.seg(bx, by, mx, my, 2.4, 1.8, ramp, { max: ramp.length - 2 });
  r.seg(mx, my, tx, ty, 1.8, 0.5, BONE, { max: 4 });
  // serrated inner edge
  const ix = (bx + mx) / 2 - sgn * Math.sin(base) * 1.2, iy = (by + my) / 2 + sgn * Math.cos(base) * 1.2;
  r.dot(ix, iy, BONE[4]);
  r.end(0.55);
}

function drawCrawler(r, P) {
  const spots = P.spots ?? 1;
  const sp = spots >= 0.75 ? G_TEAL : G_TEAL_DIM;
  const spotK = clamp(spots, 0.2, 1.2);
  const legOff = P.legs || [];
  // [hip, knee] in body space; feet in screen space (planted on the floor)
  const near = [[[53, 39], [61, 43]], [[47, 41], [53, 33]], [[41, 40], [33, 34]]];
  const far = [[[54, 33], [64, 22]], [[48, 33], [50, 18]], [[42, 33], [33, 20]]];
  const feetNear = [[73, 53], [56, 54], [24, 53]];
  const feetFar = [[77, 49], [63, 50], [31, 49]];
  const foot = (f, i) => [f[0] + (legOff[i]?.[0] || 0), f[1] + (legOff[i]?.[1] || 0)];
  const body = () => {
    r.translate(P.bx || 0, P.by || 0);
    r.rotate(P.rot || 0, 40, 40);
  };

  r.save();
  body();
  const toScreen = (legs, over) => legs.map(([h, k], i) => [r.pt(...h), r.pt(...(over?.[i] || k))]);
  const legsN = toScreen(near, P.kneesNear);
  const legsF = toScreen(far, P.kneesFar);
  r.restore();

  // far legs, darker and higher (further from the camera)
  for (let i = 0; i < 3; i++) crawlerLeg(r, legsF[i][0], legsF[i][1], foot(P.feetFar?.[i] || feetFar[i], i + 3), CHITIN_FAR, false);

  r.save();
  body();

  // segmented tail curling over the back, tip first so each segment overlaps the next one out
  const curl = P.curl ?? 1, sway = (P.sway || 0) * DEG;
  const segs = [[8, 6.4, 196], [7.5, 5.6, 214], [7, 4.9, 242], [6.5, 4.2, 272], [6, 3.6, 304], [5, 3.0, 334]];
  const joints = [[37, 31]];
  const dirs = [];
  segs.forEach(([len, , deg], i) => {
    const ang = (180 + (deg - 180) * curl) * DEG + sway * (i + 1) * 0.5;
    const [jx, jy] = joints[i];
    dirs.push(ang);
    joints.push([jx + Math.cos(ang) * len, jy + Math.sin(ang) * len]);
  });
  const last = dirs[dirs.length - 1];
  const [tx, ty] = joints[joints.length - 1];
  const sa = last + 1.0;
  r.begin();
  r.seg(tx - Math.cos(last) * 1.5, ty - Math.sin(last) * 1.5, tx + Math.cos(sa) * 6, ty + Math.sin(sa) * 6, 2.4, 0.3, BONE, { max: 4, spec: BONE[5] });
  r.end(0.5);
  const tailSpots = [[tx, ty, 3]];
  for (let i = segs.length - 1; i >= 0; i--) {
    const [ax, ay] = joints[i], [bx, by] = joints[i + 1], a = dirs[i];
    const rad = segs[i][1];
    // dorsal side faces into the curl (a + 90deg)
    const ox = Math.cos(a + Math.PI / 2), oy = Math.sin(a + Math.PI / 2);
    const ex = Math.cos(a) * 1.2, ey = Math.sin(a) * 1.2;
    r.begin();
    r.seg(ax - ex, ay - ey, bx + ex * 0.6, by + ey * 0.6, rad, rad * 0.86, CHITIN, { max: 5, bounce: 0.3 });
    r.seg(ax - ex, ay - ey, bx + ex * 0.6, by + ey * 0.6, rad, rad * 0.86, CHITIN, {
      clip: (mx, my) => (mx - ax) * ox + (my - ay) * oy > rad * 0.25, max: 6, bias: 0.1, spec: CHITIN[7], specT: 0.93,
    });
    r.end(0.65);
    // bioluminescent spot on the part of the segment the next one does not cover
    if (i < 5) tailSpots.push([bx - Math.cos(a) * 2.2 - ox * rad * 0.1, by - Math.sin(a) * 2.2 - oy * rad * 0.1, i < 3 ? 3 : 2]);
  }
  for (const [x, y, sz] of tailSpots) spot(r, x, y, sz, sp, spotK);

  // thorax: armoured carapace with dorsal spikes, plate seams and a row of glowing spots
  const br = P.breath || 0;
  r.begin();
  for (const [x, y, h] of [[38, 28, 5], [44.5, 26, 6.5], [51, 26.5, 5]]) {
    r.poly([[x - 3, y + 1.5], [x - 4, y - h], [x + 3.5, y + 1.5]], CHITIN, { n: [-0.5, -0.5, 0.7], bevel: 1, max: 6 });
  }
  r.end(0.5);
  r.begin();
  r.ball(45, 33, 11.5, 8.5 + br * 0.5, CHITIN, { spec: CHITIN[7], specT: 0.955, max: 5, bounce: 0.3 });
  r.ball(45, 33, 11.5, 8.5 + br * 0.5, CHITIN, { clip: (x, y) => y < 30.5 - (x - 45) * 0.1, max: 6, bias: 0.08, spec: CHITIN[7], specT: 0.955 });
  r.end(0.6);
  r.each(33, 24, 57, 42, (mx, my, X, Y) => {
    const u = (mx - 45) / 11.5, v = (my - 33) / 8.5;
    if (u * u + v * v > 0.8) return;
    for (const sx of [40, 49.5]) if (Math.abs(mx - sx - v * 2.4) < 0.5 && v < 0.55) r.put(X, Y, CHITIN[0]);
  });
  for (const [x, y, sz] of [[38, 30, 2], [44.5, 27.5, 3], [52, 28.5, 2], [41, 34, 2], [47.5, 34.5, 3], [54, 34, 1]]) spot(r, x, y, sz, sp, spotK);

  // head with a crest over the eye cluster
  const mand = P.mand ?? 0.15;
  mandible(r, 66, 36.5, mand * 0.55, true, CHITIN_FAR);
  r.begin();
  r.ball(61, 35.5, 7.8, 6.6, CHITIN, { spec: CHITIN[7], specT: 0.955, max: 5, bounce: 0.3 });
  r.end(0.6);
  r.begin();
  r.poly([[53, 31], [60, 27], [67.5, 29.5], [70, 32.5], [62.5, 31.5], [55, 33.5]], CHITIN, { n: [0.05, -0.8, 0.6], bevel: 1, max: 6 });
  r.end(0.5);
  for (const [x, y, sz] of [[64, 33.5, 3], [67.5, 35, 3], [61, 33, 2]]) spot(r, x, y, sz, sp, spotK);
  mandible(r, 67, 39, mand, false, CHITIN);
  r.restore();

  // near legs over the body
  for (let i = 0; i < 3; i++) crawlerLeg(r, legsN[i][0], legsN[i][1], foot(P.feetNear?.[i] || feetNear[i], i), CHITIN, true);

  if (P.drips) for (const [x, y] of P.drips) r.dot(x, y, sp[3], spotK, true);
}

const CRAWLER = {
  w: 80, h: 56,
  draw: drawCrawler,
  anims: {
    idle: { fps: 6, loop: true, poses: [
      { mand: 0.1, sway: 0, legs: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] },
      { mand: 0.25, sway: 2, by: 0, breath: 1, legs: [[1, 0], [0, 0], [-1, 0], [0, 0], [1, 0], [0, 0]] },
      { mand: 0.15, sway: 3, by: 1, breath: 1, legs: [[1, 0], [1, 0], [-1, 0], [1, 0], [1, 0], [-1, 0]] },
      { mand: 0.05, sway: 1, by: 1, legs: [[0, 0], [1, 0], [0, 0], [1, 0], [0, 0], [-1, 0]] },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { rot: -0.3, by: -1, bx: -1, mand: 1, sway: -4, spots: 1.2, kneesNear: [[64, 30]], kneesFar: [[64, 17]], feetNear: [[73, 36]], feetFar: [[76, 30]] },
      { rot: 0.1, bx: 4, mand: 0.2, sway: 6, spots: 1.2, feetNear: [[77, 52]], feetFar: [[78, 48]] },
      { rot: 0.02, bx: 2, mand: 0.55, sway: 3, spots: 1 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { rot: -0.14, bx: -3, by: 0, mand: 0, sway: -6, spots: 0.6, legs: [[2, 0], [0, 0], [-2, 0], [1, 0], [0, 0], [-1, 0]] },
    ] },
    break: { fps: 4, loop: true, poses: [
      { by: 8, rot: 0.08, mand: 0.6, curl: 0.55, spots: 0.35,
        kneesNear: [[65, 40], [56, 38], [31, 37]], kneesFar: [[67, 27], [53, 24], [31, 26]],
        feetNear: [[77, 54], [62, 54], [17, 54]], feetFar: [[78, 50], [68, 50], [24, 50]], drips: [[72, 50], [72, 52]] },
      { by: 8, rot: 0.06, mand: 0.7, curl: 0.5, spots: 0.5, sway: -2,
        kneesNear: [[65, 40], [57, 35], [31, 37]], kneesFar: [[67, 27], [53, 24], [31, 26]],
        feetNear: [[77, 54], [64, 49], [17, 54]], feetFar: [[78, 50], [68, 50], [24, 50]], drips: [[72, 51], [72, 54]] },
    ] },
  },
  points: { center: [48, 36], muzzle: [74, 38], top: [46, 14] },
  icon: { x: 47, y: 29, scale: 0.36 },
};

// ---------------------------------------------------------------- TURRET (56x64)

/** Tripod strut: hydraulic sleeve, thinner piston, collar and a spiked foot pad. */
function strut(r, hx, hy, fx, fy, ramp, scale = 1) {
  const mx = hx + (fx - hx) * 0.48, my = hy + (fy - hy) * 0.48;
  const dir = Math.sign(fx - hx) || 0;
  r.begin();
  r.seg(mx, my, fx, fy - 1, 1.3 * scale, 1.2 * scale, GUN, { caps: 'flat', spec: GUN[7], specT: 0.96 });
  r.end(0.5);
  r.begin();
  r.seg(hx, hy, mx, my, 2.3 * scale, 2.0 * scale, ramp, { caps: 'flat', max: ramp.length - 2, spec: ramp[ramp.length - 1], specT: 0.965 });
  r.ring(mx, my, 0.4, 2.3 * scale, GUN, { ry: 0.6 });
  r.end(0.5);
  r.begin();
  r.poly([[fx - 3 * scale + dir, fy - 2], [fx + 3 * scale + dir, fy - 2], [fx + 3.5 * scale + dir * 2, fy + 0.6], [fx - 3.5 * scale + dir * 2, fy + 0.6]], GUN, { n: [0, -0.6, 0.8], bevel: 1 });
  r.end(0.5);
}

function drawTurret(r, P) {
  const lens = P.lens ?? 1;
  // tripod and slewing base stay planted
  strut(r, 26, 45, 34, 57, HULL, 0.8);
  strut(r, 21, 45, 6, 61, STEEL);
  r.begin();
  r.seg(24, 35, 24, 47, 4.6, 5.2, GUN, { caps: 'flat', spec: GUN[7], specT: 0.97 });
  r.end(0.5);
  r.begin();
  r.ball(24, 39, 8.5, 3, STEEL, { max: 6, spec: STEEL[7], specT: 0.97 });
  r.ball(24, 39, 8.5, 3, HULL, { clip: (x, y) => y > 39.5 });
  r.end(0.55);
  for (const x of [18, 22, 26, 30]) r.dot(x, 40, GUN[1]);
  r.dot(29, 44, P.led ? GLOW_C.amber : AMBER[1], P.led ? 1 : 0);
  strut(r, 28, 45, 45, 61, STEEL);
  strut(r, 24, 47, 24, 62, STEEL, 1.1);

  // the gun head pivots on the yoke
  r.save();
  r.translate(P.hx || 0, P.hy || 0);
  r.rotate(P.rot || 0, 24, 31);

  // ammo box with a brass belt feeding the receiver
  r.begin();
  r.poly([[3.5, 24], [15, 22.5], [16, 34.5], [4.5, 35.5]], OLIVE, { n: [-0.25, -0.15, 0.95], bevel: 1 });
  r.poly([[3.5, 24], [15, 22.5], [14, 20.5], [4.5, 21.5]], OLIVE, { n: [0, -0.9, 0.4], bevel: 1 });
  r.end(0.55);
  r.rect(6, 26, 7, 1, OLIVE[1]);
  r.rect(6, 31, 7, 1, OLIVE[1]);
  r.line(7, 28, 11, 28, AMBER[3]);
  r.line(7, 29, 9, 29, AMBER[3]);

  // armoured head: side plate, top plate, chin
  r.begin();
  r.poly([[12, 18], [33, 16], [41, 21.5], [42, 29], [37, 35], [14, 35.5], [11, 27]], STEEL, { n: [0.05, -0.1, 1], bevel: 1, max: 6 });
  r.poly([[12, 18], [33, 16], [41, 21.5], [38, 22], [31, 19], [14, 21]], STEEL, { n: [-0.1, -0.85, 0.5], bevel: 1, max: 6 });
  r.poly([[14, 31.5], [38, 31], [37, 35], [14, 35.5]], HULL, { n: [0, 0.6, 0.8], bevel: 1 });
  r.end(0.6);
  // brass ammo belt from the box lid into the receiver
  for (let k = 0; k < 7; k++) {
    const x = 9 + k * 1.5, y = 21.5 - Math.sin((k / 6) * Math.PI) * 3;
    r.dot(x, y, k & 1 ? GOLD[3] : GOLD[5]);
    r.dot(x, y + 1, GOLD[2]);
    r.dot(x, y - 1, OUT);
  }
  // hazard stripes on the flank
  r.each(15, 24, 28, 30.5, (mx, my, X, Y) => {
    if (mx < 15 || mx >= 28 || my < 24.5 || my >= 30) return;
    r.put(X, Y, Math.floor((mx + my) / 2.5) % 2 ? AMBER[4] : GUN[1]);
  });
  r.line(15, 24, 28, 24, GUN[2]);
  // panel seams, vent slits, rivets
  r.line(30, 20, 30, 31, STEEL[2]);
  r.line(31, 20, 31, 31, STEEL[5]);
  for (let k = 0; k < 3; k++) r.line(33 + k * 2, 25, 33 + k * 2, 29, GUN[1]);
  for (const [x, y] of [[13, 22], [28, 21], [13, 33], [35, 33]]) {
    r.dot(x, y, STEEL[6]);
    r.dot(x + 1, y + 1, STEEL[2]);
  }
  r.line(19, 21, 22, 20, STEEL[7]);

  // rangefinder pod on top
  r.begin();
  r.poly([[20, 12], [30, 11.5], [31, 16.5], [20.5, 17]], GUN, { n: [-0.1, -0.4, 0.9], bevel: 1 });
  r.end(0.5);
  r.line(22, 11, 21, 6, GUN[5]);
  r.dot(21, 5, P.led ? GLOW_C.red : CRIMSON[1], P.led ? 1 : 0);
  r.glow(29, 14, 1.2, 1.4, lens > 0.6 ? G_RED : G_RED_DIM, { k: Math.min(1, lens), bias: 0.5 });

  // twin barrels with shrouds and muzzle brakes
  const rec = P.recoil || [0, 0];
  for (const [y, k] of [[24.5, 0], [30, 1]]) {
    const back = rec[k] || 0;
    r.begin();
    r.seg(40, y, 46, y, 2.4, 2.4, GUN, { caps: 'flat', spec: GUN[7], specT: 0.96 });
    for (let x = 41; x <= 45; x += 2) r.rect(x, y - 2, 1, 1, GUN[6]);
    r.end(0.5);
    r.begin();
    r.seg(45 - back, y, 52 - back, y, 1.3, 1.3, GUN, { caps: 'flat', spec: GUN[7], specT: 0.95 });
    r.rect(51 - back, y - 2, 2, 4, GUN[5]);
    r.dot(51 - back, y - 2, GUN[7]);
    r.end(0.5);
  }

  // targeting lens on the nose
  r.begin();
  r.ring(38.5, 21.5, 2.2, 4, GUN, { spec: GUN[7], specT: 0.97 });
  r.end(0.5);
  r.glow(38.7, 21.5, 2.6, 2.6, lens > 0.6 ? G_RED : G_RED_DIM, { k: Math.max(0.25, Math.min(1, lens)), bias: lens > 1 ? 0.9 : 0.2 });
  if (lens > 0.6) r.dot(37, 20, WHITE, 1);
  if (P.glitch) r.line(35, 21, 42, 21, WHITE, 1);
  if (P.laser) for (let x = 42; x < 55; x++) if (x % 3) r.dot(x, 21, x % 3 === 1 ? G_RED[2] : G_RED[3], 1, true);

  const fl = P.flash || [0, 0];
  if (fl[0]) muzzleFlash(r, 53 - (rec[0] || 0), 24.5, fl[0]);
  if (fl[1]) muzzleFlash(r, 53 - (rec[1] || 0), 30, fl[1]);
  if (P.puff) smoke(r, P.puff, 52, 22, 3);
  if (P.smoke) smoke(r, P.smoke, 22, 9, 3.4);
  r.restore();
  if (P.sparks) sparks(r, P.sparks, 24, 32, 8, 6);
}

const TURRET = {
  w: 56, h: 64,
  draw: drawTurret,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { rot: 0, led: 1 },
      { rot: -0.05, lens: 0.85, led: 1 },
      { rot: 0, lens: 0.7 },
      { rot: 0.05, lens: 0.85 },
    ] },
    attack: { fps: 9, loop: false, poses: [
      { rot: -0.02, lens: 1.4, laser: 1, led: 1 },
      { hx: -2, rot: -0.03, lens: 1.3, recoil: [3, 0], flash: [6, 0], led: 1 },
      { hx: -1, lens: 1.1, recoil: [1, 3], flash: [0, 6], puff: 3 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { hx: -2, rot: -0.26, lens: 0.5, glitch: 1 },
    ] },
    break: { fps: 5, loop: true, poses: [
      { hy: 3, rot: 0.42, lens: 0.3, sparks: 41, smoke: 13 },
      { hy: 3, rot: 0.47, lens: 0.45, sparks: 57, smoke: 19 },
    ] },
  },
  points: { center: [26, 32], muzzle: [54, 27], top: [24, 8] },
  icon: { x: 28, y: 25, scale: 0.6 },
};

// ---------------------------------------------------------------- SENTINEL (160x160 boss)

/** Scratch normal returned by per-pixel normal functions (read immediately, never stored). */
const N3 = [0, 0, 1];

const polar = (x, y, deg, len) => [x + Math.cos(deg * DEG) * len, y + Math.sin(deg * DEG) * len];

/** Point at fraction t along a->b, offset w pixels to the left of the direction of travel. */
function along(a, b, t, w) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [a[0] + dx * t + (dy / l) * w, a[1] + dy * t - (dx / l) * w];
}

/** Armour plate around a limb axis a->b: outline given as [t, w] pairs, shaded like a cylinder. */
function limbPlate(r, a, b, prof, ramp, o = {}) {
  const pts = prof.map(([t, w]) => along(a, b, t, w));
  const hw = Math.max(...prof.map((q) => Math.abs(q[1])));
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  const px = dy / l, py = -dx / l;
  const curve = o.curve ?? 0.85;
  r.poly(pts, ramp, {
    bevel: 1, ...o,
    nf: (mx, my) => {
      const s = clamp(((mx - a[0]) * px + (my - a[1]) * py) / hw, -1, 1) * curve;
      N3[0] = px * s; N3[1] = py * s - 0.15; N3[2] = Math.sqrt(1 - s * s);
      return N3;
    },
  });
}

/** Per-pixel normal of an ellipsoid dome centred at (cx, cy): rounds off flat plates. */
const dome = (cx, cy, rx, ry) => (mx, my) => {
  const u = clamp((mx - cx) / rx, -1, 1), v = clamp((my - cy) / ry, -1, 1);
  N3[0] = u * 0.8; N3[1] = v * 0.8; N3[2] = Math.sqrt(Math.max(0.05, 1 - (u * u + v * v) * 0.64));
  return N3;
};

/** Floating armour shard (ivory lit facet, steel shadow facet) with a glowing spine. */
function shard(r, cx, cy, w, h, ang, k) {
  const gr = k > 0.5 ? G_MAG : G_MAG_DIM;
  r.save();
  r.rotate(ang, cx, cy);
  r.begin();
  r.poly([[cx, cy - h / 2], [cx + w / 2, cy - h / 5], [cx + w / 3, cy + h / 2], [cx, cy + h / 2 + 1.5], [cx - w / 3, cy + h / 2], [cx - w / 2, cy - h / 5]], IVORY, { n: [-0.45, -0.3, 0.85], bevel: 1, max: 6 });
  r.poly([[cx, cy - h / 2], [cx + w / 2, cy - h / 5], [cx + w / 3, cy + h / 2], [cx, cy + h / 2 + 1.5]], STEEL, { n: [0.55, -0.1, 0.8], bevel: 1, max: 5 });
  r.end(0.6);
  r.line(cx, cy - h / 2 + 3, cx, cy + h / 2 - 1, gr[3], k * 0.55);
  r.glow(cx, cy - h / 10, 1.6, 2.4, gr, { k: k * 0.7, bias: 0.6 });
  r.restore();
}

/** Armoured leg in screen space: hip -> knee -> ankle, plus a foot from heel to toe. */
function sentinelLeg(r, hip, knee, ankle, heel, toe, far) {
  const armor = far ? { bias: -0.12, max: 5 } : { max: 6 };
  // thigh
  r.begin();
  r.seg(...hip, ...knee, 6.5, 5.5, GUN, { caps: 'flat', max: 5 });
  r.end(0.5);
  r.begin();
  limbPlate(r, hip, knee, [[0.0, -7.5], [0.05, 7], [0.8, 6.5], [0.95, 2], [0.9, -6]], IVORY, armor);
  r.end(0.55);
  const tm = along(hip, knee, 0.45, 0);
  r.line(...along(hip, knee, 0.3, -5).map(Math.round), ...along(hip, knee, 0.6, -4.5).map(Math.round), CRIMSON[far ? 2 : 3]);
  // shin greave, flared at the top
  r.begin();
  r.seg(...knee, ...ankle, 5.2, 4, GUN, { caps: 'flat', max: 5 });
  r.end(0.5);
  r.begin();
  limbPlate(r, knee, ankle, [[0.05, -8], [0.0, 7.5], [0.75, 5.2], [1.0, 4], [1.0, -4.5], [0.7, -6.5]], IVORY, armor);
  r.end(0.55);
  const sg = along(knee, ankle, 0.35, 0);
  r.dot(Math.round(sg[0]) - 2, Math.round(sg[1]), GOLD[4]);
  r.dot(Math.round(sg[0]) + 2, Math.round(sg[1]), GOLD[3]);
  r.dot(Math.round(tm[0]), Math.round(tm[1]), GOLD[4]);
  // knee joint + pointed cap
  r.begin();
  r.ball(...knee, 5.4, 5.4, GUN, { max: 6, spec: GUN[7], specT: 0.96 });
  const kc = along(hip, knee, 1.25, 1);
  r.poly([along(hip, knee, 0.82, -5), along(hip, knee, 0.86, 5.5), kc], IVORY, { n: [0.2, -0.6, 0.8], bevel: 1, ...armor });
  r.end(0.55);
  // foot: armoured wedge with a sole
  r.begin();
  r.ball(...ankle, 3.8, 3.8, GUN, { max: 5 });
  const mid = [(heel[0] + toe[0]) / 2, (heel[1] + toe[1]) / 2];
  r.poly([heel, along(heel, toe, 0.2, 5.5), along(heel, toe, 0.62, 4.5), toe, along(heel, toe, 1.0, -1.6), along(heel, toe, 0.0, -1.6)], STEEL, { n: [0.15, -0.7, 0.7], bevel: 1, max: far ? 4 : 5 });
  r.poly([along(heel, toe, 0.0, -0.5), along(heel, toe, 1.0, -0.5), along(heel, toe, 1.0, -2.2), along(heel, toe, 0.0, -2.2)], GUN, { idx: 1 });
  r.end(0.55);
  r.dot(Math.round(mid[0]), Math.round(mid[1]) - 2, GOLD[3]);
}

function drawSentinel(r, P) {
  const core = P.core ?? 1, vis = P.visor ?? 1, bladeOn = P.bladeOn ?? 1;
  const mag = (v) => (v > 0.55 ? G_MAG : G_MAG_DIM);
  const tx = P.tx || 0, ty = P.ty || 0;
  const torso = () => {
    r.translate(tx, ty);
    r.rotate(P.lean || 0, 80, 104);
  };
  const pl = P.plates || [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const plateK = P.plateK ?? 1;

  // far floating shards (behind everything)
  shard(r, 30 + pl[0][0], 34 + pl[0][1], 11, 17, -0.35 + pl[0][2], plateK);
  shard(r, 136 + pl[1][0], 18 + pl[1][1], 9, 14, 0.4 + pl[1][2], plateK);

  // pelvis position drives the hips; legs stay planted in screen space
  const L = P.legs || {};
  r.save();
  torso();
  const hipL = r.pt(69, 106), hipR = r.pt(91, 106);
  r.restore();
  const legR = L.r || { knee: [101, 129], ankle: [105, 147], heel: [96, 151], toe: [121, 156] };
  sentinelLeg(r, hipR, legR.knee, legR.ankle, legR.heel, legR.toe, true);

  // far arm: plasma cannon
  const C = P.cannon || {};
  r.save();
  torso();
  const sh = [108, 60];
  const el = polar(...sh, C.ua ?? 72, 19);
  const fa = C.fa ?? 4, rec = C.recoil || 0;
  const cb = polar(...el, fa, -rec - 2), mz = polar(...el, fa, 31 - rec);
  r.begin();
  r.seg(...sh, ...el, 5.5, 5, GUN, { max: 5 });
  limbPlate(r, sh, el, [[0.1, -6], [0.1, 6.5], [0.85, 5.5], [0.85, -5]], STEEL, { bias: -0.08, max: 5 });
  r.end(0.55);
  r.begin();
  r.ball(...el, 6, 6, GUN, { max: 6, spec: GUN[7], specT: 0.96 });
  r.end(0.5);
  r.begin();
  r.seg(...cb, ...polar(...mz, fa, -4), 8.6, 8, STEEL, { caps: 'flat', max: 6, spec: STEEL[7], specT: 0.975 });
  limbPlate(r, cb, mz, [[0.05, 9.5], [0.75, 9], [0.82, 6], [0.05, 6]], IVORY, { max: 6, curve: 0.5 });
  r.end(0.55);
  for (const t of [0.42, 0.56, 0.7]) {
    const c0 = along(cb, mz, t, 0);
    r.seg(...polar(...c0, fa, -0.7), ...polar(...c0, fa, 0.7), 8.7, 8.7, mag(core), { caps: 'flat', glow: Math.min(1, 0.55 + core * 0.35) * 0.55, gamma: 1, bias: 0.25, min: 1 });
  }
  r.begin();
  r.seg(...polar(...mz, fa, -5), ...mz, 9.6, 9.6, GUN, { caps: 'flat', max: 6, spec: GUN[7], specT: 0.97 });
  r.end(0.6);
  r.ball(...polar(...mz, fa, 0.6), 2.2, 5.6, BORE, { bounce: 0, concave: true });
  const charge = C.charge || 0;
  if (charge) {
    r.glow(...polar(...mz, fa, 1), Math.min(4, charge * 0.6), Math.min(5.4, charge * 0.8), G_MAG, { k: 1 });
    r.glow(...polar(...mz, fa, 4), charge, charge, G_MAG, { fx: true, bias: 0.6 });
    if (charge > 3) {
      const [gx, gy] = polar(...mz, fa, 4);
      for (let k = 0; k < 6; k++) {
        const [sx, sy] = polar(gx, gy, k * 60 + 15, charge + 4 + (k & 1) * 3);
        spark(r, Math.round(sx), Math.round(sy), 1, G_MAG);
      }
    }
  }
  if (C.flash) {
    const [fx, fy] = polar(...mz, fa, 2);
    muzzleFlash(r, fx, fy, C.flash, G_MAG);
  }
  if (C.smoke) smoke(r, C.smoke, ...polar(...mz, fa, 4), 4);
  r.restore();

  // waist and pelvis (torso space)
  r.save();
  torso();
  r.begin();
  r.poly([[63, 97], [97, 97], [100, 108], [91, 114], [69, 114], [60, 108]], GUN, { n: [0, -0.2, 1], bevel: 1, max: 5 });
  r.end(0.55);
  for (let k = 0; k < 3; k++) {
    r.begin();
    r.ball(80, 86 + k * 5, 14 - k * 1.2, 3.7, HULL, { max: 5, spec: HULL[5], specT: 0.97 });
    r.end(0.55);
  }
  for (const x of [66, 94]) for (let k = 0; k < 3; k++) r.dot(x, 85 + k * 4, mag(core)[3], Math.min(1, core));
  r.restore();

  // near leg
  const legL = L.l || { knee: [61, 129], ankle: [56, 147], heel: [44, 151], toe: [72, 157] };
  sentinelLeg(r, hipL, legL.knee, legL.ankle, legL.heel, legL.toe, false);

  // fauld plate over the hips, then the chest
  r.save();
  torso();
  r.begin();
  r.poly([[72, 103], [89, 103], [87, 117], [80.5, 121], [74, 117]], IVORY, { n: [0, -0.1, 1], bevel: 1, max: 6 });
  r.end(0.55);
  r.line(80, 106, 80, 117, CRIMSON[3]);
  r.line(81, 106, 81, 116, CRIMSON[2]);

  // chest frame, pectoral plates and the core housing plate
  r.begin();
  r.poly([[50, 53], [110, 50], [117, 64], [107, 86], [94, 97], [66, 97], [53, 86], [45, 65]], GUN, { n: [0, -0.1, 1], max: 4 });
  r.end(0.6);
  r.begin();
  r.poly([[48, 55], [75, 52], [77, 60], [72, 75], [58, 81], [47, 67]], IVORY, { n: [-0.4, -0.35, 0.85], bevel: 1, max: 7 });
  r.end(0.55);
  r.begin();
  r.poly([[86, 52], [109, 51], [115, 64], [107, 78], [93, 75], [87, 61]], IVORY, { n: [0.5, -0.3, 0.8], bevel: 1, max: 6 });
  r.end(0.55);
  r.begin();
  r.poly([[57, 82], [71, 77], [73, 92], [63, 95]], IVORY, { n: [-0.35, 0.25, 0.9], bevel: 1, max: 6 });
  r.poly([[92, 77], [106, 80], [100, 94], [90, 92]], IVORY, { n: [0.45, 0.2, 0.87], bevel: 1, max: 5 });
  r.end(0.55);
  r.begin();
  r.poly([[74, 51], [88, 51], [92, 61], [96, 76], [88, 91], [74, 91], [66, 76], [70, 61]], IVORY, { n: [0.05, -0.2, 1], bevel: 1, max: 6 });
  r.end(0.6);
  // crimson security livery on the pectorals
  r.poly([[50, 66], [70, 58], [71, 61], [51, 70]], CRIMSON, { n: [-0.4, -0.35, 0.85], max: 4 });
  r.poly([[96, 64], [112, 58], [113, 61], [97, 67.5]], CRIMSON, { n: [0.5, -0.3, 0.8], max: 3 });
  // panel seams, rivets, scratches
  r.line(56, 60, 66, 57, IVORY[3]);
  r.line(60, 75, 66, 72, IVORY[3]);
  r.line(100, 56, 106, 55, IVORY[3]);
  for (const [x, y] of [[52, 58], [72, 55], [55, 75], [104, 55], [111, 64], [60, 89], [101, 89]]) {
    r.dot(x, y, GOLD[4]);
    r.dot(x + 1, y + 1, GOLD[1]);
  }
  r.line(63, 64, 66, 66, IVORY[7]);
  r.line(64, 64, 65, 65, IVORY[5]);
  r.line(77, 84, 80, 86, IVORY[3]);

  // energy conduits feeding the core
  const cK = Math.min(1, 0.35 + core * 0.55) * 0.7;
  r.line(73, 62, 62, 57, mag(core)[3], cK);
  r.line(89, 62, 99, 56, mag(core)[3], cK);
  r.line(81, 81, 81, 89, mag(core)[3], cK);

  // core: armoured ring with gold bolts around a pulsing magenta heart
  r.begin();
  r.ring(81, 69, 6.6, 11, GUN, { spec: GUN[7], specT: 0.965 });
  r.end(0.6);
  for (let k = 0; k < 6; k++) {
    const [bx, by] = polar(81, 69, k * 60 - 90, 8.8);
    r.dot(Math.round(bx - 0.5), Math.round(by - 0.5), GOLD[4]);
  }
  const cr = 6.4 + Math.min(0.6, (core - 1) * 1.5);
  r.glow(81, 69, cr, cr, mag(core), { k: clamp(core, 0.25, 1.2) * 0.62, bias: core > 1.1 ? 0.7 : core > 0.55 ? 0.3 : 0 });
  if (core > 0.55) {
    r.dot(79, 66, WHITE, 1);
    r.dot(80, 66, G_MAG[4], 1);
  }

  // collar / gorget
  r.begin();
  r.poly([[66, 45], [98, 44], [103, 53], [61, 55]], GUN, { n: [0, -0.6, 0.8], bevel: 1, max: 6 });
  r.end(0.55);
  r.line(66, 52, 99, 51, CRIMSON[3]);

  // far pauldron with the shoulder cannon
  const G = P.sgun || {};
  r.begin();
  r.poly([[103, 37], [118, 35], [121, 45], [106, 47]], GUN, { n: [0.2, -0.6, 0.8], bevel: 1, max: 6 });
  r.end(0.55);
  r.begin();
  r.seg(116 - (G.recoil || 0), 39.5, 145 - (G.recoil || 0), 35.5, 3.3, 3, STEEL, { caps: 'flat', max: 6, spec: STEEL[7], specT: 0.97 });
  r.rect(141 - (G.recoil || 0), 32, 4, 7, GUN[5]);
  r.dot(143 - (G.recoil || 0), 32, GUN[7]);
  r.end(0.55);
  r.begin();
  r.poly([[110, 32], [118, 31], [118.5, 35], [110.5, 35.5]], GUN, { idx: 4, bevel: 1 });
  r.end(0.5);
  r.dot(117, 33, G_RED[3], 1);
  if (G.flash) muzzleFlash(r, 147 - (G.recoil || 0), 35.5, G.flash, G_MAG);
  r.begin();
  r.poly([[103, 63], [121, 62], [119, 68], [106, 69]], STEEL, { nf: dome(112, 62, 12, 8), bevel: 1, bias: -0.08, max: 5 });
  r.end(0.55);
  r.begin();
  r.poly([[97, 49], [109, 44], [121, 46], [126, 53], [122, 62], [104, 63], [98, 57]], IVORY, { nf: dome(111, 52, 16, 11), bevel: 1, bias: -0.06, max: 6, spec: IVORY[7], specT: 0.985 });
  r.poly([[98.5, 58.5], [104, 61], [122.6, 60], [122, 62], [104, 63], [98, 57]], CRIMSON, { nf: dome(111, 52, 16, 11), max: 3 });
  r.end(0.6);


  // head: far horn, neck, helmet, faceplate with the visor slit and jaw guard, near horn
  r.save();
  r.translate(0, P.hy || 0);
  r.rotate(P.head || 0, 82, 47);
  const horn = (pts, radii, o) => {
    r.begin();
    for (let k = 0; k < pts.length - 1; k++) r.seg(...pts[k], ...pts[k + 1], radii[k], radii[k + 1], BRONZE, o);
    r.end(0.55);
  };
  horn([[91, 25], [97, 19], [100, 11], [98, 4]], [3.6, 2.8, 1.8, 0.5], { bias: -0.14, max: 5, bounce: 0.3 });
  r.begin();
  r.seg(82, 49, 84, 40, 5.5, 5.5, GUN, { max: 5 });
  r.end(0.5);
  r.begin();
  r.poly([[71, 29], [79, 20], [94, 19], [101, 25], [103, 32], [99, 41], [79, 46], [71, 39]], IVORY, { n: [-0.3, -0.15, 0.94], bevel: 1, max: 6 });
  r.end(0.6);
  r.begin();
  r.poly([[71, 29], [79, 20], [94, 19], [101, 25], [91, 27], [79, 30]], IVORY, { n: [-0.15, -0.9, 0.42], bevel: 1, max: 7 });
  r.end(0.45);
  r.line(80, 21, 93, 20, CRIMSON[3]);
  r.line(80, 22, 90, 22, CRIMSON[2]);
  r.begin();
  r.poly([[88, 28], [103, 27], [105.5, 34], [101, 42], [86, 45], [85, 37]], GUN, { n: [0.55, 0, 0.83], bevel: 1, max: 6 });
  r.end(0.55);
  r.begin();
  r.poly([[86, 42], [101, 40.5], [95, 49.5], [85, 47.5]], IVORY, { n: [0.3, 0.4, 0.86], bevel: 1, max: 5 });
  r.end(0.5);
  r.poly([[80, 33.5], [85, 33], [83.5, 38.5]], CRIMSON, { n: [-0.3, -0.1, 0.95], max: 4 });
  r.line(76, 37, 80, 42, IVORY[3]);
  const vk = clamp(vis, 0.2, 1.2), vr = mag(vis);
  r.line(87, 34, 105, 31, vr[vis > 1 ? 4 : 3], vk);
  r.line(87, 35, 104, 32, vr[2], vk);
  if (vis > 0.55) {
    r.dot(102, 31, WHITE, 1);
    r.dot(103, 31, vr[4], 1);
  }
  if (P.glitch) {
    r.line(83, 30, 104, 29, WHITE, 1, true);
    r.line(92, 37, 107, 36, G_MAG[3], 1, true);
  }
  horn([[75, 29], [66, 25.5], [59, 19], [55, 11], [57, 3]], [4.2, 3.5, 2.6, 1.6, 0.5], { max: 6, spec: BRONZE[7], specT: 0.95, bounce: 0.3 });
  r.restore();

  // near arm: energy blade, then the near pauldron over the shoulder joint
  const B = P.blade || {};
  const bs = [52, 61];
  const be = polar(...bs, B.ua ?? 112, 19);
  const bw = polar(...be, B.fa ?? 94, 19);
  const bang = B.ba ?? 121, blen = B.len ?? 48;
  const hilt = polar(...bw, bang, 3), tip = polar(...hilt, bang, blen);
  if (bladeOn > 0) {
    const bk = clamp(bladeOn, 0.3, 1);
    r.beam(...hilt, ...tip, 4.4, 1.2, bladeOn > 0.55 ? G_BLADE : G_MAG_DIM, { k: bk * 0.55, bias: P.shimmer ?? 0.25 });
    if (bladeOn > 0.55) r.beam(...polar(...hilt, bang, 2), ...polar(...tip, bang, -8), 1.1, 0.5, G_BLADE_CORE, { k: bk * 0.7, bias: 0.3, dither: 0 });
  }
  r.begin();
  r.seg(...bs, ...be, 5.8, 5.2, GUN, { max: 5 });
  limbPlate(r, bs, be, [[0.15, -6.5], [0.15, 6.5], [0.9, 5.8], [0.9, -5.8]], IVORY, { max: 6 });
  r.end(0.55);
  r.begin();
  r.ball(...be, 6, 6, GUN, { max: 6, spec: GUN[7], specT: 0.96 });
  r.end(0.5);
  r.begin();
  r.seg(...be, ...bw, 6.2, 5.4, GUN, { max: 5 });
  limbPlate(r, be, bw, [[0.05, -7.5], [0.0, 7], [1.0, 6.5], [1.05, -6.5]], IVORY, { max: 6 });
  r.end(0.55);
  const vm = along(be, bw, 0.55, 0);
  r.line(...along(be, bw, 0.3, -4).map(Math.round), ...along(be, bw, 0.75, -4).map(Math.round), CRIMSON[3]);
  r.dot(Math.round(vm[0]), Math.round(vm[1]), GOLD[4]);
  r.begin();
  r.seg(...polar(...bw, bang, -2), ...polar(...bw, bang, 4), 4.6, 4, GUN, { caps: 'flat', max: 6, spec: GUN[7], specT: 0.96 });
  r.seg(...polar(...bw, bang, 3), ...polar(...bw, bang, 5), 6, 6, BRONZE, { caps: 'flat', max: 5 });
  r.end(0.55);

  // near pauldron: swept fin, angular dome plate with crimson trim, two lames below
  r.begin();
  r.poly([[38, 48], [22, 33], [26, 32.5], [48, 43]], IVORY, { n: [-0.45, -0.6, 0.65], bevel: 1, max: 6 });
  r.poly([[38, 48], [22, 33], [33, 43.5]], IVORY, { n: [-0.2, 0.3, 0.9], bevel: 1, max: 4 });
  r.line(25, 34, 36, 44, CRIMSON[3]);
  r.end(0.5);
  r.begin();
  r.poly([[37, 66], [59, 65], [56, 72], [40, 72.5]], STEEL, { nf: dome(48, 64, 14, 10), bevel: 1, max: 5 });
  r.end(0.55);
  r.begin();
  r.poly([[33, 61], [62, 59.5], [60, 66.5], [36, 67]], STEEL, { nf: dome(48, 60, 16, 10), bevel: 1, max: 5 });
  r.end(0.55);
  r.begin();
  r.poly([[29, 54], [37, 45.5], [55, 42.5], [66, 49], [65, 59], [50, 62.5], [31, 62]], IVORY, { nf: dome(47, 51, 20, 13), bevel: 1, max: 6, spec: IVORY[7], specT: 0.985 });
  r.poly([[30.5, 59.5], [50, 60], [65.2, 56.8], [65, 59], [50, 62.5], [31, 62]], CRIMSON, { nf: dome(47, 51, 20, 13), max: 4 });
  r.end(0.6);
  r.line(35, 50, 45, 46, IVORY[7]);
  r.line(44, 53, 52, 51, IVORY[3]);
  for (const [x, y] of [[36, 55], [50, 50], [59, 54]]) {
    r.dot(x, y, GOLD[4]);
    r.dot(x + 1, y + 1, GOLD[1]);
  }
  r.restore();

  // near floating shards
  shard(r, 22 + pl[2][0], 94 + pl[2][1], 10, 15, 0.25 + pl[2][2], plateK);
  shard(r, 141 + pl[3][0], 108 + pl[3][1], 11, 16, -0.3 + pl[3][2], plateK);

  if (P.sparks) for (const [seed, x, y, sp, n] of P.sparks) sparks(r, seed, x, y, sp, n);
  if (P.smoke) for (const [seed, x, y, rad] of P.smoke) smoke(r, seed, x, y, rad);
}

const SENT_KNEEL = {
  r: { knee: [107, 128], ankle: [109, 148], heel: [99, 151], toe: [124, 156] },
  l: { knee: [58, 151], ankle: [36, 149], heel: [28, 146], toe: [32, 157] },
};

const SENTINEL = {
  w: 160, h: 160,
  bevel: 4,
  draw: drawSentinel,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { core: 1, shimmer: 0.25, plates: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]] },
      { core: 1.15, shimmer: 0.05, plates: [[0, -1, 0.02], [0, 1, 0], [0, -1, 0], [0, 1, -0.02]] },
      { core: 1.3, shimmer: 0.4, ty: 1, plates: [[0, -2, 0.03], [0, 2, 0.02], [0, -2, 0.02], [0, 2, -0.03]] },
      { core: 1.15, shimmer: 0.15, ty: 1, plates: [[0, -1, 0.01], [0, 1, 0.01], [0, -1, 0.01], [0, 1, -0.01]] },
    ] },
    attack: { fps: 8, loop: false, order: [0, 1, 1, 2, 2, 3], poses: [
      { core: 1.2, cannon: { ua: 62, fa: -3, charge: 2.5 }, blade: { ua: 118, fa: 100, ba: 128 }, plates: [[-1, -1, 0], [1, -1, 0], [-1, 0, 0], [1, 0, 0]] },
      { core: 1.5, visor: 1.3, cannon: { ua: 62, fa: -3, charge: 6 }, blade: { ua: 118, fa: 100, ba: 128 }, sgun: { recoil: 0 }, plates: [[2, 1, 0.1], [-2, 2, -0.1], [2, -1, 0.1], [-2, -1, -0.1]] },
      { core: 1.4, visor: 1.2, tx: -2, cannon: { ua: 60, fa: -4, recoil: 4, flash: 9 }, sgun: { recoil: 3, flash: 5 }, blade: { ua: 122, fa: 102, ba: 130 }, plates: [[-3, -2, -0.15], [3, -2, 0.15], [-3, 1, -0.1], [3, 2, 0.1]] },
      { core: 1.1, tx: -1, cannon: { ua: 66, fa: 0, recoil: 2, smoke: 7 }, sgun: { recoil: 1 }, blade: { ua: 116, fa: 98, ba: 125 }, plates: [[-1, -1, -0.05], [1, -1, 0.05], [-1, 0, 0], [1, 1, 0.05]] },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { core: 0.7, visor: 0.5, glitch: 1, tx: -4, lean: -0.07, head: -0.16, cannon: { ua: 80, fa: 14 }, blade: { ua: 125, fa: 108, ba: 135 }, bladeOn: 0.6,
        plates: [[-3, -3, -0.2], [3, -3, 0.2], [-3, 2, -0.15], [3, 3, 0.2]] },
    ] },
    break: { fps: 4, loop: true, poses: [
      { core: 0.3, visor: 0.25, ty: 22, tx: -2, lean: 0.16, head: 0.32, hy: 2, bladeOn: 0.35, plateK: 0.3, legs: SENT_KNEEL,
        cannon: { ua: 84, fa: 34 }, blade: { ua: 100, fa: 96, ba: 108, len: 40 },
        plates: [[2, 14, 0.5], [-4, 20, -0.6], [4, 14, 0.7], [7, 30, -0.9]],
        sparks: [[71, 112, 70, 7, 5], [72, 66, 96, 6, 4]], smoke: [[73, 62, 50, 7], [74, 56, 40, 5]] },
      { core: 0.75, visor: 0.6, ty: 22, tx: -2, lean: 0.17, head: 0.3, hy: 2, bladeOn: 0.7, plateK: 0.6, legs: SENT_KNEEL,
        cannon: { ua: 84, fa: 36 }, blade: { ua: 100, fa: 96, ba: 108, len: 40 },
        plates: [[2, 15, 0.55], [-4, 21, -0.65], [4, 15, 0.75], [7, 31, -0.95]],
        sparks: [[81, 120, 76, 6, 4], [82, 74, 94, 6, 5]], smoke: [[83, 60, 46, 7], [84, 54, 36, 5]] },
    ] },
  },
  points: { center: [80, 80], muzzle: [148, 80], top: [80, 6], core: [81, 69] },
  icon: { x: 82, y: 30, scale: 0.47 },
};

// ---------------------------------------------------------------- registry + builders

/** The four POC arts, so content can derive variants ({ ...BUILTIN_ART.drone, draw(rig, pose) { ... } }). */
export const BUILTIN_ART = Object.freeze({ drone: DRONE, crawler: CRAWLER, turret: TURRET, sentinel: SENTINEL });
const DEFS = { ...BUILTIN_ART };
const MAX_FRAME = 256;
const MAX_FRAMES = 12;
const REQUIRED_ANIMS = ['idle', 'attack', 'hurt', 'break'];
const PLACEHOLDER_TINT = col('#ff8ad8');

const sheetKey = (art) => `enemy:${art}`;
const iconKey = (art) => `enemy:${art}#icon`;

/**
 * Registers an EnemyArtDef under an art key (TECH_PLAN 7.6):
 *   { w, h, bevel?, draw(rig, pose), anims: { idle, attack, hurt, break, ...extra: { fps, loop, poses, order? } },
 *     points: { center, muzzle, top, core? }, icon: { x, y, scale }, fitBox?: [x, y, w, h] }
 * Frames up to 256x256, at most 12 frames per sheet. Registering the same def again is a no-op.
 */
export function registerEnemyArt(art, def) {
  if (!def || typeof def.draw !== 'function' || !def.anims?.idle || !def.points?.center || !def.icon) {
    console.error(`registerEnemyArt: "${art}" needs w, h, draw(rig, pose), anims.idle, points.center and icon`);
    return;
  }
  if (DEFS[art] === def) return;
  if (def.w > MAX_FRAME || def.h > MAX_FRAME) console.error(`registerEnemyArt: "${art}" frames are ${def.w}x${def.h} (max ${MAX_FRAME}x${MAX_FRAME})`);
  const frames = Object.values(def.anims).reduce((n, a) => n + (a.poses?.length || 0), 0);
  if (frames > MAX_FRAMES) console.error(`registerEnemyArt: "${art}" has ${frames} frames (max ${MAX_FRAMES})`);
  for (const a of REQUIRED_ANIMS) if (!def.anims[a]) console.warn(`registerEnemyArt: "${art}" has no "${a}" animation`);
  if (def.anims.idle.poses.length < 4) console.warn(`registerEnemyArt: "${art}" idle has ${def.anims.idle.poses.length} frames (4+ with secondary motion)`);
  DEFS[art] = def;
  artCache.delete(sheetKey(art));
  artCache.delete(iconKey(art));
}

/** Every art key that has a definition (the four built-ins plus registered ones). */
export function enemyArtKinds() {
  return Object.keys(DEFS);
}

export function hasEnemyArt(art) {
  return !!DEFS[art];
}

export { Rig };

/** A tinted drone scaled into a frame of the declared size, for arts not registered yet (3.12). */
function placeholderDef(size) {
  const w = Math.min(MAX_FRAME, size?.w || DRONE.w), h = Math.min(MAX_FRAME, size?.h || DRONE.h);
  const k = Math.min(w / DRONE.w, h / DRONE.h);
  const ox = Math.round((w - DRONE.w * k) / 2), oy = Math.round(h - DRONE.h * k);
  const at = ([x, y]) => [Math.round(ox + x * k), Math.round(oy + y * k)];
  return {
    ...DRONE,
    w, h,
    bevel: Math.max(2, Math.round(3 * k)),
    tint: PLACEHOLDER_TINT,
    draw(r, pose) {
      r.translate(ox, oy).scale(k);
      DRONE.draw(r, pose);
    },
    points: Object.fromEntries(Object.entries(DRONE.points).map(([n, p]) => [n, at(p)])),
  };
}

function resolve(art, size) {
  const def = DEFS[art];
  if (def) return def;
  if (noteMissingArt('enemy', art)) console.warn(`enemy art "${art}" is not registered: drawing a placeholder`);
  return placeholderDef(size);
}

/** Multiplies a painter's colours by a tint (placeholders). */
function tintPainter(p, t) {
  const d = p.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = (d[i] * t[0]) / 255;
    d[i + 1] = (d[i + 1] * t[1]) / 255;
    d[i + 2] = (d[i + 2] * t[2]) / 255;
  }
  p._dirty = true;
}

function buildSheet(def) {
  const frames = [];
  const anims = {};
  for (const [name, spec] of Object.entries(def.anims)) {
    const start = frames.length;
    for (const pose of spec.poses) {
      const r = new Rig(def.w, def.h);
      def.draw(r, pose);
      const f = r.finish();
      if (def.tint) tintPainter(f.p, def.tint);
      frames.push(f);
    }
    const idx = spec.poses.map((_, i) => start + i);
    anims[name] = { frames: spec.order ? spec.order.map((k) => idx[k]) : idx, fps: spec.fps, loop: spec.loop };
  }
  const cols = Math.min(4, frames.length);
  const albedo = packSheet(frames.map((f) => f.p), cols);
  const glow = packSheet(frames.map((f) => f.e), cols);
  const emissive = new Painter(albedo.painter.w, albedo.painter.h);
  emissive.rect(0, 0, emissive.w, emissive.h, '#000000');
  emissive.blit(glow.painter, 0, 0);
  const normal = makeNormalMap(albedo.painter, { frameW: def.w, frameH: def.h, bevel: def.bevel ?? 3, strength: 2.2, lumaRelief: 0.4 });
  return {
    canvas: albedo.canvas,
    normal: normal.canvas,
    emissive: emissive.canvas,
    frameW: def.w,
    frameH: def.h,
    cols: albedo.cols,
    rows: albedo.rows,
    count: albedo.count,
    anims,
    pxPerUnit: PX_PER_UNIT,
    facing: 'right',
    points: def.points,
    fitBox: def.fitBox || null,
    placeholder: !!def.tint,
  };
}

/**
 * Battle sprite sheet for an art key (cached in the art cache). Faces right. Unknown arts fall back to
 * a tinted placeholder of `size` ({ w, h }, default the drone's) with one console.warn.
 */
export function buildEnemySprite(art, { size = null } = {}) {
  const key = sheetKey(art);
  const hit = artCache.get(key);
  if (hit) return hit;
  const sheet = buildSheet(resolve(art, size));
  sheet.cacheKey = key;   // SpriteActors acquire it while they live, so a battle's sheets are never evicted
  return artCache.set(key, sheet, { loc: artCache.locate('enemy', art) });
}

/**
 * 24x24 head / silhouette portrait for the turn-order bar (cached): the idle pose redrawn at a
 * smaller scale around the creature's face, so the icon is clean pixel art rather than a resample.
 */
export function buildEnemyIcon(art) {
  const key = iconKey(art);
  const hit = artCache.get(key);
  if (hit) return hit;
  const def = DEFS[art];
  if (!def) noteMissingArt('enemy', art);
  const d = def || DRONE;
  const { x, y, scale } = d.icon;
  const r = new Rig(24, 24);
  r.translate(12, 12).scale(scale).translate(-x, -y);
  d.draw(r, d.anims.idle.poses[0]);
  const f = r.finish();
  if (!def) tintPainter(f.p, PLACEHOLDER_TINT);
  return artCache.set(key, f.p.canvas, { loc: artCache.locate('enemy', art) });
}

/**
 * Warm the sprite cache without blocking a frame for long: builds one art per macrotask.
 * Call it at boot or behind a transition (boss sheets are the expensive ones).
 */
export function prebuildEnemySprites(arts = ENEMY_KINDS) {
  return arts.reduce((chain, art) => chain.then(() => new Promise((resolveJob) => {
    setTimeout(() => {
      buildEnemySprite(art);
      buildEnemyIcon(art);
      resolveJob();
    }, 0);
  })), Promise.resolve());
}
