// Party + NPC pixel art for VOIDPATH (owner: art-party).
//
// Sprites are drawn into an indexed Frame (material + tone per pixel) and resolved to colour at the end.
// Bodies are assembled from a 2D skeleton (two-bone IK for battle limbs): limbs are tapered capsules,
// torsos and garments are polygons, all shaded by one fixed upper-left light quantized into each
// material's hand-picked, hue-shifted ramp (cool shadows, warm highlights). Hair is built from tapered
// capsule locks (or hand-shaded templates for the smooth field styles); faces, visors, lenses and other
// identity details are hand-authored string templates. Layer order (far arm + weapon, legs, torso,
// garment, head, near arm) plus 1px contact lines between overlapping parts keep silhouettes readable,
// and a dark outline closes every frame.

import { Painter, packSheet, makeNormalMap, makeEmissiveMap, makeCanvas, ramp } from './painter.js';
import { OUTLINE, OUTLINE_SOFT } from './palette.js';
import { artCache, noteMissingArt } from './cache.js';

export const PARTY_IDS = ['kade', 'nyx', 'orion', 'sera'];

/** Field poses (TECH_PLAN 3.6), each with a down and a side view (the side view faces right; flip for left). */
export const POSES = ['kneel', 'look_up', 'arms_crossed', 'hand_to_chest', 'collapse', 'point'];

/** Portrait expressions every CHARS-format character gets (TECH_PLAN 3.6). */
export const EXPRESSIONS = ['neutral', 'smile', 'sad', 'determined', 'surprised'];

/**
 * Sheet anim for a pose or anim name at a facing: { anim, flipX } or null when the sheet has neither.
 * Poses resolve to '<pose>_down' or '<pose>_side' (left flips; up uses the down view).
 */
export function poseAnim(sheet, name, facing = 'down') {
  const anims = sheet.anims || {};
  if (POSES.includes(name)) {
    const view = facing === 'left' || facing === 'right' ? 'side' : 'down';
    const anim = `${name}_${view}`;
    if (anims[anim]) return { anim, flipX: facing === 'left' };
    return anims[`${name}_down`] ? { anim: `${name}_down`, flipX: false } : null;
  }
  return anims[name] ? { anim: name, flipX: null } : null;
}

// ---------------------------------------------------------------- lighting

// Screen space: +x right, +y down, +z toward the viewer. Key light from the upper-left-front.
const LIGHT = (() => {
  const v = [-0.65, -0.5, 0.57];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / n);
})();

// Quantize lambert into ramp tones 0 (deep) .. 3 (light); tone 4 (specular glint) only when spec is set.
function toneOf(nx, ny, nz, count, spec = false) {
  const v = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
  const t = v > 0.95 && spec ? 4 : v > 0.78 ? 3 : v > 0.41 ? 2 : v > -0.25 ? 1 : 0;
  return t < count ? t : count - 1;
}

// ---------------------------------------------------------------- template legend

// One letter = one material tone. Rows of a template are strings; '.' is transparent.
const LEGEND = {
  q: ['skin', 0], w: ['skin', 1], e: ['skin', 2], r: ['skin', 3],
  a: ['hair', 0], s: ['hair', 1], d: ['hair', 2], f: ['hair', 3], g: ['hair', 4],
  A: ['main', 0], S: ['main', 1], D: ['main', 2], F: ['main', 3], G: ['main', 4],
  z: ['sec', 0], x: ['sec', 1], c: ['sec', 2], v: ['sec', 3],
  Z: ['acc', 0], X: ['acc', 1], C: ['acc', 2], V: ['acc', 3],
  j: ['lea', 0], J: ['lea', 1], K: ['lea', 2], L: ['lea', 3],
  m: ['metal', 0], n: ['metal', 1], M: ['metal', 2], N: ['metal', 3], B: ['metal', 4],
  t: ['glow', 0], y: ['glow', 1], u: ['glow', 2],
  T: ['glow2', 0], Y: ['glow2', 1], U: ['glow2', 2],
  i: ['eye', 0], o: ['eye', 1], p: ['eye', 2],
  O: ['vial', 0], P: ['vial', 1], Q: ['vial', 2], R: ['vial', 3],
  k: ['ink', 0], l: ['ink', 1],
};

function makePal(mats) {
  const names = Object.keys(mats);
  return {
    names,
    colors: names.map((n) => mats[n]),
    glow: names.map((n) => n.startsWith('glow')),
    ink: names.map((n) => n === 'ink'),
    index: Object.fromEntries(names.map((n, i) => [n, i])),
  };
}

// ---------------------------------------------------------------- indexed frame

class Frame {
  constructor(w, h, pal) {
    this.w = w;
    this.h = h;
    this.pal = pal;
    const n = w * h;
    this.m = new Int8Array(n).fill(-1); // material index, -1 = empty
    this.t = new Uint8Array(n); // tone index into the material ramp
    this.g = new Int16Array(n).fill(-1); // draw group: contact lines only form between groups
    this.a = new Uint8Array(n); // 1 = procedurally shaded (eligible for speck cleanup)
    this.stamp = new Int32Array(n);
    this.sid = 0;
    this.gid = 0;
    this.grp = 0;
    this.ops = [];
    this.lines = [];
    this.ox = 0; // drawing offset in x (field art is drawn at 32-px coordinates into 48-px frames)
  }

  group() { return ++this.gid; }

  mat(name) {
    const i = this.pal.index[name];
    if (i !== undefined) return i;
    if (name === 'glow2') return this.mat('glow');
    if (name === 'lea') return this.mat('sec');
    return this.pal.index.main;
  }

  count(mi) { return this.pal.colors[mi].length; }

  has(x, y) {
    x = Math.floor(x) + this.ox;
    y = Math.floor(y);
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] >= 0;
  }

  begin(group) {
    this.sid++;
    this.ops.length = 0;
    this.grp = group ?? this.group();
  }

  put(x, y, mi, tone, auto = 0) {
    x = Math.floor(x) + this.ox;
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.ops.push(y * this.w + x, mi, tone, auto);
  }

  // Commit the pending stroke. sep: darken pixels of other groups that touch the stroke (interior line).
  end(sep = true) {
    const { ops, m, t, g, a, stamp, sid, grp, w, h } = this;
    for (let k = 0; k < ops.length; k += 4) {
      const i = ops[k];
      m[i] = ops[k + 1];
      t[i] = ops[k + 2];
      a[i] = ops[k + 3];
      g[i] = grp;
      stamp[i] = sid;
    }
    if (!sep) return;
    const lines = this.lines;
    lines.length = 0;
    for (let k = 0; k < ops.length; k += 4) {
      const i = ops[k], x = i % w, y = (i / w) | 0;
      if (x > 0) lines.push(i - 1);
      if (x < w - 1) lines.push(i + 1);
      if (y > 0) lines.push(i - w);
      if (y < h - 1) lines.push(i + w);
    }
    for (const q of lines) {
      const mq = m[q];
      if (stamp[q] === sid || mq < 0 || g[q] === grp || this.pal.glow[mq] || this.pal.ink[mq]) continue;
      t[q] = 0;
      a[q] = 0;
    }
  }

  // -- procedural primitives (shaded by the key light)

  /** Tapered capsule from a to b. mat: name or (t, side) => name, t along the axis, side -1..1 across. */
  limb(ax, ay, bx, by, ra, rb, mat, o = {}) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-6, len = Math.sqrt(l2);
    const R = Math.max(ra, rb);
    const x0 = Math.floor(Math.min(ax, bx) - R), x1 = Math.ceil(Math.max(ax, bx) + R);
    const y0 = Math.floor(Math.min(ay, by) - R), y1 = Math.ceil(Math.max(ay, by) + R);
    const fixed = typeof mat === 'string' ? this.mat(mat) : -1;
    const dim = o.dim || 0;
    this.begin(o.group);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      let t = ((px - ax) * dx + (py - ay) * dy) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const r = ra + (rb - ra) * t;
      const ex = px - (ax + dx * t), ey = py - (ay + dy * t);
      const d2 = ex * ex + ey * ey;
      if (d2 >= r * r) continue;
      const nx = ex / r, ny = ey / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const mi = fixed >= 0 ? fixed : this.mat(mat(t, (dx * ey - dy * ex) / (len * r)));
      const tone = Math.max(0, toneOf(nx, ny, nz, this.count(mi), o.spec) - dim);
      this.put(x, y, mi, tone, 1);
    }
    this.end(o.sep !== false);
  }

  /** Ellipsoid blob. mat: name or (nx, ny) => name; o.clip(px, py) excludes pixels. */
  ball(cx, cy, rx, ry, mat, o = {}) {
    const fixed = typeof mat === 'string' ? this.mat(mat) : -1;
    const dim = o.dim || 0;
    this.begin(o.group);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d2 = nx * nx + ny * ny;
        if (d2 >= 1 || (o.clip && o.clip(x + 0.5, y + 0.5))) continue;
        const mi = fixed >= 0 ? fixed : this.mat(mat(nx, ny));
        const tone = Math.max(0, toneOf(nx, ny, Math.sqrt(1 - d2), this.count(mi), o.spec) - dim);
        this.put(x, y, mi, tone, 1);
      }
    }
    this.end(o.sep !== false);
  }

  /**
   * Polygon shaded as a cylinder across each row (torsos, coats, robes).
   * mat: name or (x, y) => name (null skips the pixel); o.ny(y) tilts the normal vertically (chest up, hem down).
   */
  shape(pts, mat, o = {}) {
    const rows = scanPoly(pts);
    const fixed = typeof mat === 'string' ? this.mat(mat) : -1;
    const dim = o.dim || 0, round = 0.92;
    this.begin(o.group);
    for (const [y, xl, xr] of rows) {
      const mid = (xl + xr + 1) / 2, hw = Math.max(1, (xr - xl + 1) / 2);
      const ny = o.ny ? o.ny(y + 0.5) : 0;
      for (let x = xl; x <= xr; x++) {
        if (o.clip && o.clip(x + 0.5, y + 0.5)) continue;
        const nx = ((x + 0.5 - mid) / hw) * round;
        const nz = Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny));
        const mname = fixed >= 0 ? null : mat(x, y);
        if (mname === null && fixed < 0) continue;
        const mi = fixed >= 0 ? fixed : this.mat(mname);
        const tone = Math.max(0, toneOf(nx, ny, nz, this.count(mi), o.spec) - dim);
        this.put(x, y, mi, tone, 1);
      }
    }
    this.end(o.sep !== false);
  }

  // -- flat detail primitives (exact tones, no shading)

  /** Draw a template (array of strings) at (x0, y0). o.map remaps letters; o.only paints over existing pixels only. */
  tpl(rows, x0, y0, o = {}) {
    const map = o.map;
    this.begin(o.group);
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        let c = row[i];
        if (c === '.' || c === ' ') continue;
        if (map && map[c]) c = map[c];
        const x = x0 + i, y = y0 + j;
        if (o.only && !this.has(x, y)) continue;
        const L = LEGEND[c];
        if (!L) continue;
        const mi = this.mat(L[0]);
        this.put(x, y, mi, Math.min(L[1], this.count(mi) - 1));
      }
    }
    this.end(o.sep ?? false);
  }

  dot(x, y, mat, tone, o = {}) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (o.only && !this.has(x, y)) return;
    const mi = this.mat(mat);
    this.begin(o.group);
    this.put(x, y, mi, Math.min(tone, this.count(mi) - 1));
    this.end(false);
  }

  /** Bresenham line in one tone. o.only: over existing pixels; o.on: only over pixels of that material. */
  line(x0, y0, x1, y1, mat, tone, o = {}) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const mi = this.mat(mat), tn = Math.min(tone, this.count(mi) - 1);
    const on = o.on ? this.mat(o.on) : -1;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    this.begin(o.group);
    for (;;) {
      const ok = on >= 0 ? this.has(x0, y0) && this.m[y0 * this.w + x0 + this.ox] === on : !o.only || this.has(x0, y0);
      if (ok) this.put(x0, y0, mi, tn);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    this.end(o.sep ?? false);
  }

  // -- resolve

  // Remove single-pixel tone specks inside procedurally shaded areas (keeps hand-placed detail).
  clean() {
    const { w, h, m, t, a } = this;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!a[i]) continue;
      const mi = m[i];
      const nb = [i - 1, i + 1, i - w, i + w];
      let same = 0, match = 0, other = -1, otherCount = 0;
      for (const q of nb) {
        if (m[q] !== mi) continue;
        same++;
        if (t[q] === t[i]) match++;
        else if (other < 0 || t[q] === other) { other = t[q]; otherCount++; }
      }
      if (same >= 3 && match === 0 && otherCount >= 3) t[i] = other;
    }
  }

  render() {
    this.clean();
    const p = new Painter(this.w, this.h);
    const { colors } = this.pal;
    for (let i = 0; i < this.m.length; i++) {
      const mi = this.m[i];
      if (mi < 0) continue;
      const ramp = colors[mi];
      p.set(i % this.w, (i / this.w) | 0, ramp[Math.min(this.t[i], ramp.length - 1)]);
    }
    p.outline(OUTLINE);
    return p;
  }

  glowMask() {
    const out = new Uint8Array(this.w * this.h);
    for (let i = 0; i < out.length; i++) if (this.m[i] >= 0 && this.pal.glow[this.m[i]]) out[i] = 1;
    return out;
  }
}

/** Scanline-fill a polygon at pixel centres. Returns [[y, xl, xr], ...]. */
function scanPoly(pts) {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const out = [];
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    const xl = Math.ceil(xs[0] - 0.5), xr = Math.floor(xs[xs.length - 1] - 0.5);
    if (xr >= xl) out.push([y, xl, xr]);
  }
  return out;
}

// ---------------------------------------------------------------- shared templates

// Field faces (14 wide, drawn at x = 9 so the face centre sits on x = 16). Eyes: 'i' lid/pupil over 'o' iris.
const FACE_DOWN = [
  '..............',
  '..............',
  '....eeeeee....',
  '...eeeeeeee...',
  '..eeeeeeeeee..',
  '..reeeeeeeew..',
  '..reeeeeeeew..',
  '.wreieeeeieww.',
  '.wreoeeeeoeww.',
  '..reeeeweeww..',
  '...reeeeeww...',
  '....eeeeww....',
  '.....wwww.....',
];
const FACE_SIDE = [
  '..............',
  '..............',
  '....eeeeee....',
  '...eeeeeeee...',
  '..eeeeeeeeee..',
  '..eeeeeeeeeee.',
  '..eeeeeeeeeee.',
  '..eeeeeeeeie..',
  '..eeeeeeeeoe..',
  '..eeeeqweeeer.',
  '..eeeeweeeew..',
  '...eeeeeeeew..',
  '....eeeeeew...',
  '.....wwwww....',
];
const BLINK = { i: 'e', o: 'i' };

/** A copy of a face template with chars replaced at [row, col] positions. */
function editRows(rows, edits) {
  const out = rows.map((r) => r.split(''));
  for (const [y, x, c] of edits) out[y][x] = c;
  return out.map((r) => r.join(''));
}
// eyes raised (looking up) and lowered (downcast) for the field faces; the eye column moves a row
const FACE_LOOK = {
  down: {
    up: editRows(FACE_DOWN, [[6, 4, 'i'], [6, 9, 'i'], [7, 4, 'o'], [7, 9, 'o'], [8, 4, 'e'], [8, 9, 'e']]),
    down: editRows(FACE_DOWN, [[7, 4, 'e'], [7, 9, 'e'], [8, 4, 'i'], [8, 9, 'i']]),
  },
  side: {
    up: editRows(FACE_SIDE, [[6, 10, 'i'], [7, 10, 'o'], [8, 10, 'e']]),
    down: editRows(FACE_SIDE, [[7, 10, 'e'], [8, 10, 'i']]),
  },
};

// ---------------------------------------------------------------- party definitions

const CHARS = {
  kade: {
    mats: {
      skin: ['#9c5a47', '#d4906f', '#f0b896', '#fcd9c0'],
      hair: ['#5b6279', '#8d95ac', '#c4ccdc', '#e9eef7', '#ffffff'],
      main: ['#121b42', '#1e2f6a', '#2d4a98', '#4570c8', '#9cbcf5'],
      sec: ['#161b27', '#262e40', '#38435b', '#526182'],
      acc: ['#470d1c', '#86182f', '#c42b45', '#ee5b65'],
      lea: ['#1e1513', '#3a2520', '#58372b', '#7a5038'],
      metal: ['#262e42', '#516179', '#8799b2', '#c6d3e2', '#f4f8fd'],
      glow: ['#ff9b2e', '#ffc35a', '#fff0c4'],
      eye: ['#1a1f33', '#4c6bb0', '#ffffff'],
      ink: [OUTLINE, OUTLINE_SOFT],
    },
    build: { headY: 3, shY: 18.5, hipY: 30.5, shW: 5.0, waistW: 3.7, hipW: 4.0, armX: 5.5, hipX: 2.0, thighR: 2.0, shinR: 1.9, armR: 1.5, chest: 3.6, back: 3.2 },
    style: {
      thigh: 'sec', shin: 'main', boot: 'main', bootFrom: 0.3,
      upper: 'sec', fore: 'main', foreR: 0.35, hand: 'lea',
      torso: (ty) => (ty <= 5 ? 'main' : ty === 6 ? 'metal' : ty <= 8 ? 'sec' : ty <= 10 ? 'lea' : 'sec'),
    },
    // Amber visor strip across the eyes.
    over: {
      down: [[0, 7, ['.nyyuyyyyuyyn.', '.mttttttttttm.']]],
      side: [[0, 7, ['.....nnyyyyyu.', '.....mmttttttm']]],
      up: [[0, 8, ['.nmmmmmmmmmmn.']]],
    },
  },

  nyx: {
    mats: {
      skin: ['#8e5550', '#cf9686', '#efc5b3', '#fde3d6'],
      hair: ['#0a2f36', '#12555c', '#1e8b8c', '#41c3b8', '#a3f2e4'],
      main: ['#121827', '#212a3e', '#334059', '#4c5d7f', '#7b8fb4'],
      sec: ['#121822', '#1f2835', '#2f3c4d', '#46596e'],
      acc: ['#0b4350', '#0f6a78', '#17a2a9', '#45dad3'],
      lea: ['#1a1218', '#2e2029', '#45313d', '#634856'],
      metal: ['#151b25', '#2b3447', '#48546c', '#73819c', '#b3c0d4'],
      glow: ['#29b6e8', '#7ff4ff', '#e8fdff'],
      eye: ['#10263a', '#2a8f9c', '#ffffff'],
      ink: [OUTLINE, OUTLINE_SOFT],
    },
    build: { headY: 3, shY: 18.5, hipY: 30.5, shW: 4.5, waistW: 3.3, hipW: 3.8, armX: 5.5, hipX: 2.0, thighR: 1.9, shinR: 1.7, armR: 1.5, chest: 3.3, back: 3.0 },
    style: {
      thigh: 'sec', shin: 'sec', boot: 'lea', bootFrom: 0.08,
      upper: 'main', fore: 'main', cuff: 'acc', hand: 'sec',
      torso: (ty, dx, view) => {
        if (ty === 9) return 'lea';
        if (view === 'down' && ty > 1 && ty < 9 && dx > -1.2 && dx < 0.6) return 'sec';
        return 'main';
      },
    },
    hair: {
      down: [
        '.....sddd.....',
        '...sdffffds...',
        '..sdfggffdds..',
        '.sdffgfdddsss.',
        '.sdfffddddssaa',
        'sdfdddsdddssaa',
        'sdds.sddd..sas',
        'sds....sa..ssa',
        'sds........sa.',
        'sds........sa.',
        '.ds........sa.',
        '.ds.........a.',
        '..s.........a.',
      ],
      side: [
        '...sdddd......',
        '..sdfffdds....',
        '.sdfggffdds...',
        'sdffgfdddsss..',
        'sdffddddsssss.',
        'sddddddsdddssa',
        'sdddsddsds.sa.',
        'asddsdds......',
        'asdsdsa.......',
        '.asdsa........',
        '.asds.........',
        '..asa.........',
        '...a..........',
      ],
      up: [
        '.....sddd.....',
        '...sdffffds...',
        '..sdfggffdds..',
        '.sdffgfdddsss.',
        '.sdffdddddssa.',
        'sdfdddddddssaa',
        'sdfddddddsssaa',
        'sddddddddsssaa',
        'sdddsddsdssaa.',
        'sddsddsddssaa.',
        '.dssdsdsdsssa.',
        '.ds..wwww..sa.',
        '..s........a..',
      ],
    },
    // Cyan eye-lens over her left eye.
    over: {
      down: [[0, 7, ['.........un...', '.........y....']]],
      side: [[0, 7, ['..........u...', '..........yn..']]],
    },
  },

  orion: {
    mats: {
      skin: ['#6e3d2b', '#a8694a', '#cf9470', '#ecbf98'],
      hair: ['#521c0c', '#8c3615', '#c4582a', '#ea8a4c', '#ffbf86'],
      main: ['#1e1338', '#31205c', '#4b328c', '#6a4dba', '#9e84e6'],
      sec: ['#14121d', '#221f31', '#332f49', '#4a4566'],
      acc: ['#5a2a12', '#93501f', '#cd7f33', '#f4b462', '#ffe2a8'],
      lea: ['#1a1210', '#2e211c', '#46322a', '#62483b'],
      metal: ['#1e2536', '#3b4762', '#66788f', '#a6b6c9', '#e8eff6'],
      glow: ['#a07cff', '#d2bdff', '#f6f0ff'],
      eye: ['#2a1a12', '#8a5a2a', '#ffffff'],
      ink: [OUTLINE, OUTLINE_SOFT],
    },
    build: { headY: 4, shY: 19.5, hipY: 31, shW: 4.8, waistW: 3.7, hipW: 4.1, armX: 5.5, hipX: 2.0, thighR: 1.9, shinR: 1.7, armR: 1.5, chest: 3.3, back: 3.2 },
    style: {
      thigh: 'sec', shin: 'sec', boot: 'lea', bootFrom: 0.5,
      upper: 'main', fore: 'main', foreR: 0.45, cuff: 'acc', hand: 'skin',
      torso: (ty, dx, view) => (ty >= 8 && ty <= 9 ? 'acc' : view === 'down' && ty < 6 && Math.abs(dx) < (6 - ty) * 0.45 ? 'sec' : 'main'),
    },
    // Brass goggles pushed up on the forehead.
    over: {
      down: [[0, 3, ['..nVCnmmnVCn..', '..nCXnmmnCXn..']]],
      side: [[0, 3, ['.......mmnVCn.', '.......mmnCXn.']]],
      up: [[0, 3, ['.mmmmmmmmmmmm.']]],
    },
  },

  sera: {
    mats: {
      skin: ['#9e5a4c', '#de9c82', '#f7c8ac', '#ffe6d4'],
      hair: ['#5a1740', '#932a69', '#cf4f98', '#f283c2', '#ffc8e5'],
      main: ['#69748f', '#a6b2c8', '#d8e0ed', '#f3f6fb', '#ffffff'],
      sec: ['#0d4a72', '#1477ad', '#2ba8de', '#72d8ff'],
      acc: ['#7a1f4f', '#c03c80', '#ee6fb0', '#ffb6da'],
      lea: ['#3a4660', '#58668a', '#7e8db0', '#a9b7d4'],
      metal: ['#5a6378', '#8a93a8', '#c8d0de', '#eef2f8', '#ffffff'],
      glow: ['#29b6e8', '#7ff4ff', '#e8fdff'],
      glow2: ['#f0b84a', '#fff0a8', '#fffbe8'],
      eye: ['#3a1a3a', '#c0508e', '#ffffff'],
      ink: [OUTLINE, OUTLINE_SOFT],
    },
    build: { headY: 6, shY: 21, hipY: 31.5, shW: 4.5, waistW: 3.1, hipW: 3.7, armX: 5.5, hipX: 2.0, thighR: 1.85, shinR: 1.6, armR: 1.4, chest: 3.2, back: 2.9 },
    style: {
      thigh: 'main', shin: 'main', boot: 'sec', bootFrom: 0.45,
      upper: 'main', fore: 'main', cuff: 'sec', hand: 'main',
      torso: (ty, dx, view, B) => (ty === 8 ? 'sec' : view !== 'side' && Math.abs(dx) > B.shW - 1.6 && ty < 8 ? 'sec' : 'main'),
    },
    hair: {
      down: [
        '..............',
        '....sdddds....',
        '..sdfffddds...',
        '.sdfggffddss..',
        '.dffgfddddsss.',
        'sdfdddddddsssa',
        'sddsdddsdddssa',
        'sds........ssa',
        'sds........ssa',
        'sds........ssa',
        'sds........ssa',
        '.as........sa.',
        '..a........a..',
      ],
      side: [
        '..............',
        '...sdddds.....',
        '..sdfffdds....',
        '.sdfggffdds...',
        'sdffgfddddss..',
        'sdfdddddddsss.',
        'sddddddsddsdsa',
        'sdddddsa......',
        'sddddsa.......',
        'sdddsa........',
        'sddssa........',
        '.ssaa.........',
        '..aa..........',
      ],
      up: [
        '..............',
        '....sdddds....',
        '..sdfffddds...',
        '.sdfggffddss..',
        '.dffgfddddsss.',
        'sdffddddddsssa',
        'sdfddddddsssaa',
        'sdddddddsdsssa',
        'sddsddddsdssaa',
        'sdddsdddsdssaa',
        'sddsddsdssssaa',
        '.asssassssaaa.',
        '...wwwwwwww...',
      ],
    },
    over: {},
  },
};

// Shared extras: a green medi-gel vial (item pose) and an element glow for cast poses.
const ELEMENT_GLOW = {
  kade: ['#e8a81c', '#ffe94d', '#fffbd2'],
  nyx: ['#4cc4ff', '#a8ecff', '#f2fdff'],
  orion: ['#a07cff', '#d2bdff', '#f6f0ff'],
};
for (const id of Object.keys(CHARS)) {
  CHARS[id].id = id;
  const m = CHARS[id].mats;
  m.vial = ['#0f4a2e', '#1f8f55', '#52dc8e', '#c4ffdf'];
  if (!m.glow2) m.glow2 = ELEMENT_GLOW[id];
  CHARS[id].pal = makePal(m);
}

// NYX's ponytail, per view (drawn as templates so the hair clumps stay hand-shaded).
const PONY = {
  up: [
    '..MN..',
    '.sffd.',
    'sdffds',
    'sdfdds',
    'sdddds',
    'sddsds',
    '.sdds.',
    '.sdfs.',
    '.sdds.',
    '.sddsa',
    '.sdfsa',
    '..sdsa',
    '..sdsa',
    '..sds.',
    '..sda.',
    '...sa.',
    '...sa.',
    '...a..',
  ],
  down: [
    '.sd.',
    'sdds',
    'sdds',
    '.sds',
    '.sds',
    '.sda',
    '..sa',
    '..a.',
  ],
  side: [
    '...MNs',
    '..sdfd',
    '.sdffd',
    'sdfdds',
    'sddsa.',
    'sdsa..',
    'sds...',
    'sda...',
    '.sa...',
    '.a....',
  ],
};

// ORION's orb drone (field scale): brass band with a glowing violet eye.
const ORB_FIELD = [
  '.nMn.',
  'nMNMn',
  'XCyCX',
  'mnMnm',
  '.mnm.',
];

// ---------------------------------------------------------------- shared body parts

function drawLeg(f, ch, L, view, dim = 0, B = ch.build) {
  const S = ch.style, g = f.group();
  f.limb(L.hip[0], L.hip[1], L.knee[0], L.knee[1], B.thighR, B.shinR + 0.1, S.thigh, { group: g, dim });
  f.limb(L.knee[0], L.knee[1], L.ankle[0], L.ankle[1], B.shinR + 0.1, B.shinR, (t) => (t > S.bootFrom ? S.boot : S.shin), { group: g, dim });
  const fr = B.footR || 1.6;
  if (L.noFoot) return;
  if (view === 'side' || view === 'battle') f.limb(L.ankle[0] - 0.4, L.ankle[1] + 1, L.toe[0], L.toe[1], fr, fr - 0.35, S.boot, { group: g, dim });
  else f.ball(L.ankle[0], L.ankle[1] + 1.4, 2.4, 1.6, S.boot, { group: g, dim });
}

function drawArm(f, ch, A, dim = 0, o = {}) {
  const S = ch.style, B = o.B || ch.build, r = B.armR, fr = r + (S.foreR || 0), g = f.group();
  f.limb(A.sh[0], A.sh[1], A.el[0], A.el[1], r + 0.1, r, S.upper, { group: g, dim });
  f.limb(A.el[0], A.el[1], A.ha[0], A.ha[1], fr - 0.1, fr, (t) => (S.cuff && t > 0.68 ? S.cuff : S.fore), { group: g, dim });
  if (!o.noHand) {
    const hr = B.handR || 1.35;
    f.ball(A.ha[0], A.ha[1] + 0.6, hr, hr + 0.05, S.hand, { group: g, dim });
  }
  return g;
}

function drawTorso(f, ch, sk) {
  const B = ch.build, cx = sk.cx, top = sk.sh - 0.5, bot = sk.hip + 1.5;
  const pts = sk.view === 'side'
    ? [[cx - 2.4, top], [cx + 2.4, top], [cx + B.chest, top + 3], [cx + B.chest - 0.6, top + 6.5], [cx + 2.6, top + 9], [cx + 3.0, bot], [cx - 3.0, bot], [cx - 2.6, top + 8.5], [cx - B.back, top + 3]]
    : [[cx - B.shW, top], [cx + B.shW, top], [cx + B.shW - 0.3, top + 4], [cx + B.waistW, top + 8.5], [cx + B.hipW, bot], [cx - B.hipW, bot], [cx - B.waistW, top + 8.5], [cx - B.shW + 0.3, top + 4]];
  const ty0 = Math.floor(top);
  f.shape(pts, (x, y) => ch.style.torso(y - ty0, x + 0.5 - cx, sk.view, B), {
    ny: (y) => (y - top < 3 ? -0.4 : y - top > 9 ? 0.2 : 0),
  });
}

function drawNeck(f, sk) {
  const x = sk.view === 'side' ? sk.cx + 0.5 : sk.cx;
  f.limb(x, sk.headY + 11, x, sk.sh, 1.5, 1.5, 'skin', { sep: false });
}

function drawFieldHead(f, ch, sk, blink) {
  const v = sk.view, x = 9 + (sk.hx || 0), y = sk.headY, g = f.group();
  const map = blink || sk.eyes === 'closed' ? BLINK : null;
  const look = sk.eyes === 'up' || sk.eyes === 'down' ? FACE_LOOK[v]?.[sk.eyes] : null;
  if (v === 'down') f.tpl(look || FACE_DOWN, x, y, { group: g, map, sep: true });
  if (v === 'side') f.tpl(look || FACE_SIDE, x, y, { group: g, map, sep: true });
  const locks = (ch.locks || FIELD_LOCKS[ch.id])?.[v];
  if (locks) {
    if (v === 'up') f.ball(x + 7, y + 8, 5.4, 5, 'skin');
    const line = locks.hairline;
    const clip = v === 'up' ? null : v === 'side'
      ? (px, py) => px - x > 7.5 && py - y > line
      : (px, py) => px - x > 2 && px - x < 12 && py - y > line;
    lockHair(f, locks.list, (u, w) => [x + u, y + w], clip);
  } else f.tpl(ch.hair[v], x, y, { group: g, sep: true });
  // visors and lenses follow the gaze a pixel up or down
  const dy = sk.eyes === 'up' ? -1 : sk.eyes === 'down' ? 1 : 0;
  for (const [ox, oy, rows] of ch.over[v] || []) f.tpl(rows, x + ox, y + oy + dy, { group: g });
}

// Field-scale capsule hair for the spiky heads (14-wide head box at x = 9, y = headY).
const FIELD_LOCKS = {
  kade: {
    down: { hairline: 5.4, list: [
      ['ball', 7, 5.2, 6.8, 4.8],
      [2.6, 4.6, -0.6, 4.4, 2.0, 0.4],
      [11.4, 4.6, 14.6, 3.8, 2.0, 0.4],
      [4.2, 3.2, 2.4, -0.6, 2.2, 0.4],
      [7.2, 2.6, 7.6, -0.7, 2.3, 0.4],
      [10, 3.2, 12, -0.2, 2.2, 0.4],
      [4.4, 4.2, 3.4, 7.4, 1.7, 0.3],
      [7.6, 4.2, 7.2, 7.2, 1.6, 0.3],
      [10.2, 4.2, 11, 7.4, 1.6, 0.3],
    ] },
    up: { hairline: 0, list: [
      ['ball', 7, 5.8, 6.9, 5.4],
      [2.6, 5, -0.6, 4.8, 2.0, 0.4],
      [11.4, 5, 14.6, 4.4, 2.0, 0.4],
      [4.2, 3.2, 2.4, -0.6, 2.2, 0.4],
      [7.2, 2.6, 7.6, -0.7, 2.3, 0.4],
      [10, 3.2, 12, -0.2, 2.2, 0.4],
      [4.4, 8.4, 4, 11.4, 1.8, 0.4],
      [7, 8.8, 7, 12, 1.9, 0.4],
      [9.6, 8.4, 10, 11.4, 1.8, 0.4],
    ] },
    side: { hairline: 6.2, list: [
      ['ball', 4.6, 8.2, 4.2, 4.4],
      ['ball', 6.4, 5.4, 6.4, 4.8],
      [3.4, 9.2, 0.8, 11.6, 1.8, 0.4],
      [3, 6.6, -0.8, 7, 2.0, 0.4],
      [4, 4, 0.4, 1.6, 2.2, 0.4],
      [6.4, 3, 4.6, -0.6, 2.2, 0.4],
      [9, 3, 9.8, -0.7, 2.2, 0.4],
      [10, 4.2, 13.6, 5.4, 1.8, 0.3],
      [9.4, 5, 11, 8, 1.4, 0.3],
    ] },
  },
  orion: {
    down: { hairline: 5.4, list: [
      ['ball', 7, 5.2, 6.9, 4.6],
      [2.4, 5, 0.2, 7.4, 1.9, 0.5],
      [11.6, 5, 13.8, 7.2, 1.9, 0.5],
      [4, 3.2, 1.8, 0.6, 2.0, 0.4],
      [7, 2.6, 7.4, -0.8, 2.1, 0.4],
      [10, 3.2, 12.2, 0.8, 2.0, 0.4],
      [4.4, 4.4, 3.6, 6.6, 1.5, 0.4],
      [7.2, 4.4, 6.8, 6.4, 1.4, 0.4],
      [9.8, 4.4, 10.4, 6.6, 1.4, 0.4],
    ] },
    up: { hairline: 0, list: [
      ['ball', 7, 5.8, 7.0, 5.4],
      [2.4, 5.6, 0.2, 8.2, 1.9, 0.5],
      [11.6, 5.6, 13.8, 8.0, 1.9, 0.5],
      [4, 3.2, 1.8, 0.6, 2.0, 0.4],
      [7, 2.6, 7.4, -0.8, 2.1, 0.4],
      [10, 3.2, 12.2, 0.8, 2.0, 0.4],
      [4.6, 9, 4.0, 11.6, 1.8, 0.5],
      [7, 9.4, 7.2, 12.2, 1.8, 0.5],
      [9.4, 9, 10.2, 11.6, 1.8, 0.5],
    ] },
    side: { hairline: 5.8, list: [
      ['ball', 4.6, 8.2, 4.2, 4.4],
      ['ball', 6.4, 5.4, 6.6, 4.8],
      [3.4, 9.4, 1.0, 11.2, 1.8, 0.5],
      [2.8, 6.4, -0.4, 7.4, 2.0, 0.4],
      [3.8, 3.6, 1.0, 1.2, 2.0, 0.4],
      [6.6, 2.8, 6.2, -0.6, 2.0, 0.4],
      [9.4, 3.2, 11.4, 0.8, 2.0, 0.4],
      [10.4, 4.6, 13.2, 5.8, 1.6, 0.4],
    ] },
  },
};

/** Glowing elliptical ring (SERA's holo-halo), brighter on its near (lower) half. */
function haloRing(f, cx, cy, rx, ry, mat = 'glow') {
  const mi = f.mat(mat);
  f.begin();
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const outer = (dx / rx) ** 2 + (dy / ry) ** 2, inner = (dx / (rx - 1.25)) ** 2 + (dy / Math.max(0.5, ry - 1.1)) ** 2;
      if (outer < 1 && inner >= 1) f.put(x, y, mi, dy > 0 ? 2 : 1);
    }
  }
  f.end(false);
}

/** Long rifle as procedural parts between muzzle (mx, my) and stock end (sx, sy). */
function rifleParts(f, mx, my, sx, sy) {
  const g = f.group();
  const at = (t) => [mx + (sx - mx) * t, my + (sy - my) * t];
  const [ax, ay] = at(0.36), [bx, by] = at(0.72);
  f.limb(mx, my, ax, ay, 0.75, 0.85, 'metal', { group: g });
  f.limb(ax, ay, bx, by, 1.45, 1.35, 'metal', { group: g });
  f.limb(bx, by, sx, sy, 1.2, 1.6, 'lea', { group: g });
}

/** A vertical-ish cloth fold: shadow line plus a lit line beside it, only over the given material. */
function fold(f, x0, y0, x1, y1, mat, lit = true) {
  f.line(x0, y0, x1, y1, mat, 1, { on: mat });
  if (lit) f.line(x0 - 1, y0 + 1, x1 - 1, y1 - 1, mat, 3, { on: mat });
}

function quad(x0, x1, y0, x2, x3, y1) { return [[x0, y0], [x1, y0], [x3, y1], [x2, y1]]; }

// ---------------------------------------------------------------- per-character field details

CHARS.kade.hooks = {
  behind(f, sk) {
    const { cx, sh, view } = sk;
    const w = sk.walk ? (sk.i % 2) : sk.bob;
    if (view === 'side') {
      // scarf tails streaming behind
      f.shape([[cx - 0.5, sh - 1.5], [cx - 3.5, sh - 0.6], [cx - 7.4, sh + 2.6 + w], [cx - 9.2, sh + 6.6 + w], [cx - 7.6, sh + 5.8 + w], [cx - 7.6, sh + 8.2 + w], [cx - 4.8, sh + 4.6], [cx - 1, sh + 2.6]], 'acc', { ny: () => -0.2 });
      fold(f, cx - 3, sh + 1.5, cx - 7, sh + 6 + w, 'acc', false);
    } else if (view === 'down') {
      // the scarf tail flutters out behind the right shoulder
      f.shape([[cx + 3, sh - 1], [cx + 6.5, sh + 1], [cx + 9.2 + w * 0.5, sh + 6.5], [cx + 8.0, sh + 8.6 - w], [cx + 6.6, sh + 7.2], [cx + 4.5, sh + 3]], 'acc', { dim: 1 });
    }
  },
  torso(f, sk) {
    const { cx, view } = sk, top = Math.floor(sk.sh - 0.5);
    if (view === 'side') {
      f.line(cx + 2, top + 1, cx + 2, top + 4, 'main', 3, { on: 'main' });
      return;
    }
    // breastplate ridge + belt buckle
    f.line(cx - 1, top + 2, cx - 1, top + 5, 'main', 3, { on: 'main' });
    f.line(cx, top + 2, cx, top + 5, 'main', 1, { on: 'main' });
    if (view === 'down') f.tpl(['MN', 'nM'], cx - 1, top + 9, { only: true });
  },
  skirt(f, sk) {
    const { cx, hip } = sk;
    const tm = (x, y) => (y >= hip + 2.6 ? 'metal' : 'main');
    if (sk.view === 'side') f.shape(quad(cx - 2.6, cx + 3.4, hip - 0.5, cx - 1.6, cx + 3.9, hip + 4), tm);
    else for (const s of [-1, 1]) f.shape(quad(cx + s * 0.3, cx + s * 4.6, hip - 0.5, cx + s * 1.0, cx + s * 4.9, hip + 3.6), tm);
  },
  arms(f, sk) {
    const pm = (nx, ny) => (ny > 0.45 ? 'metal' : 'main');
    if (sk.view === 'side') f.ball(sk.cx + 0.4, sk.sh + 1.5, 2.9, 2.5, pm, { spec: true });
    else for (const s of [-1, 1]) f.ball(sk.cx + s * (CHARS.kade.build.armX + 0.2), sk.sh + 1.2, 2.8, 2.4, pm, { spec: true });
  },
  neck(f, sk) {
    const { cx, sh, view, hip } = sk;
    if (view === 'up') {
      // two long scarf tails down the back
      const s = sk.sway * 0.7;
      f.ball(cx, sh - 0.5, 4.4, 1.9, 'acc');
      f.shape([[cx + 0.2, sh], [cx + 3.2, sh], [cx + 3.6 + s, sh + 6], [cx + 2.6 + s, sh + 7.6], [cx + 1.4 + s, sh + 6.4]], 'acc', { dim: 1 });
      f.shape([[cx - 2.8, sh], [cx + 1.0, sh], [cx + 0.6 + s, hip - 1.5], [cx - 0.8 + s, hip + 0.2], [cx - 2.4 + s, hip - 1.4]], 'acc');
      fold(f, cx - 1, sh + 2, cx - 1 + Math.round(s), hip - 2, 'acc', false);
    } else if (view === 'side') {
      f.ball(cx + 0.7, sh - 0.4, 3.5, 1.9, 'acc');
    } else {
      f.ball(cx, sh - 0.4, 4.4, 1.9, 'acc');
      f.tpl(['XC', 'ZX'], cx - 3, Math.floor(sh) + 1, {});
    }
  },
};

CHARS.nyx.hooks = {
  behind(f, sk) {
    const { cx, headY, sh, hip, view } = sk, hx = sk.hx || 0;
    if (view === 'down') {
      f.tpl(PONY.down, 20 + hx, headY + 3 - (sk.walk ? sk.i % 2 : 0), {});
      rifleParts(f, cx - 7.5, sh - 8, cx + 5.5, hip + 2);
    } else if (view === 'side') {
      rifleParts(f, cx + 3.5, sh - 9, cx - 4.5, hip + 2.5);
      const w = sk.walk ? (sk.i % 2) : 0;
      f.tpl(PONY.side.slice(0, 5), 5 + hx, headY + 2, {});
      f.tpl(PONY.side.slice(5), 5 + hx - w, headY + 7, {});
    }
  },
  skirt(f, sk) {
    const { cx, hip, view } = sk, s = sk.sway * 0.7;
    const hem = (d) => Math.min(hip + d, sk.floor - (11.2 - d));   // a kneeling coat pools at the floor
    const tm = (x, y) => (y >= hem(9.6) ? 'acc' : 'main');
    if (view === 'side') {
      f.shape([[cx - 3.0, hip - 1], [cx + 3.1, hip - 1], [cx + 3.6, hip + 3.5], [cx + 1.6, hem(10.6)], [cx - 6.0 - s, hem(11.2)], [cx - 4.2, hip + 4]], tm);
      fold(f, cx - 1, hip + 2, cx - 3 - Math.round(s), hem(9), 'main');
    } else if (view === 'down') {
      f.shape([[cx - 3.7, hip - 1], [cx - 0.6, hip - 1], [cx - 1.4, hem(10.2)], [cx - 5.8 + s, hem(10.8)]], tm);
      f.shape([[cx + 0.6, hip - 1], [cx + 3.7, hip - 1], [cx + 5.8 + s, hem(10.8)], [cx + 1.4, hem(10.2)]], tm);
      f.line(cx - 1, hip, cx - 2, hem(9), 'acc', 2, { on: 'main' });
      fold(f, cx - 4, hip + 3, cx - 4 + Math.round(s), hem(9), 'main');
      fold(f, cx + 4, hip + 3, cx + 4 + Math.round(s), hem(9), 'main', false);
    } else {
      f.shape([[cx - 3.8, hip - 1], [cx + 3.8, hip - 1], [cx + 5.8 + s, hip + 10.8], [cx - 5.8 + s, hip + 10.8]], tm);
      f.line(cx, hip + 3, cx + Math.round(s), hip + 10, 'main', 0, { on: 'main' });
      fold(f, cx - 3, hip + 3, cx - 4 + Math.round(s), hip + 9, 'main');
    }
  },
  neck(f, sk) {
    const { cx, sh, hip, view } = sk;
    if (view === 'up') rifleParts(f, cx + 8.5, sh - 7, cx - 5.5, hip + 2);
    if (view === 'side') f.shape([[cx - 2.4, sh - 3], [cx + 3.0, sh - 2.4], [cx + 3.2, sh + 1.2], [cx - 2.8, sh + 1.2]], (x, y) => (y < sh - 2 ? 'acc' : 'main'));
    else f.shape([[cx - 3.8, sh - 3], [cx + 3.8, sh - 3], [cx + 4.2, sh + 1.2], [cx - 4.2, sh + 1.2]], (x, y) => (y < sh - 2 ? 'acc' : view === 'down' && Math.abs(x + 0.5 - cx) < 1 ? 'sec' : 'main'), { ny: () => -0.3 });
  },
  front(f, sk) {
    const { cx, headY, view } = sk;
    if (view !== 'up') return;
    const w = sk.walk ? [0, 1, 0, -1][sk.i] : 0;
    f.tpl(PONY.up.slice(0, 7), cx - 3, headY + 1, { sep: true });
    f.tpl(PONY.up.slice(7), cx - 3 + w, headY + 8, { sep: true });
  },
};

CHARS.orion.hooks = {
  skirt(f, sk) {
    const { cx, hip, view } = sk, s = sk.sway * 0.8;
    const pts = view === 'side'
      ? [[cx - 3.2, hip - 1.5], [cx + 3.4, hip - 1.5], [cx + 4.4 + s, 43.4], [cx - 5.2 + s * 0.5, 43.8]]
      : [[cx - 4.1, hip - 1.5], [cx + 4.1, hip - 1.5], [cx + 5.8 + s, 43.6], [cx - 5.8 + s, 43.6]];
    f.shape(pts, (x, y) => (y >= 42.6 ? 'acc' : 'main'), { ny: (y) => (y > 40 ? 0.2 : 0) });
    const r = Math.round(s);
    if (view === 'down') {
      fold(f, cx - 3, hip + 3, cx - 4 + r, 41, 'main');
      fold(f, cx + 3, hip + 3, cx + 4 + r, 41, 'main', false);
      f.line(cx - 1, sk.sh + 2, cx - 1, hip - 2, 'glow', 1, { only: true });
      f.line(cx - 1, hip + 1, cx - 1, hip + 6, 'glow', 1, { only: true });
      f.line(cx - 1, hip + 6, cx - 2 + r, hip + 7, 'glow', 1, { only: true });
      f.line(cx - 2 + r, hip + 7, cx - 2 + r, 41, 'glow', 1, { only: true });
      f.line(cx + 2, hip + 2, cx + 2, hip + 5, 'glow', 1, { only: true });
      f.line(cx + 2, hip + 5, cx + 4 + r, hip + 7, 'glow', 1, { only: true });
      f.dot(cx + 4 + r, hip + 7, 'glow', 2, { only: true });
      f.dot(cx - 1, hip + 6, 'glow', 2, { only: true });
    } else if (view === 'side') {
      fold(f, cx - 1, hip + 3, cx - 2 + r, 41, 'main');
      f.line(cx + 2, sk.sh + 2, cx + 2, hip - 2, 'glow', 1, { only: true });
      f.line(cx + 1, hip + 1, cx + 1, hip + 6, 'glow', 1, { only: true });
      f.line(cx + 1, hip + 6, cx - 2, hip + 9, 'glow', 1, { only: true });
      f.dot(cx - 2, hip + 9, 'glow', 2, { only: true });
    } else {
      fold(f, cx - 3, hip + 3, cx - 4 + r, 41, 'main');
      f.line(cx, sk.sh + 1, cx, hip + 8, 'glow', 1, { only: true });
      f.line(cx - 3, hip + 3, cx + 3, hip + 3, 'glow', 1, { only: true });
      f.dot(cx, hip + 3, 'glow', 2, { only: true });
    }
  },
  arms(f, sk) {
    const A = sk.view === 'side' ? sk.armF : sk.view === 'down' ? sk.armL : sk.armR;
    const g = f.group();
    f.limb(A.el[0], A.el[1] + 0.5, A.ha[0], A.ha[1], 2.0, 2.0, 'acc', { group: g, spec: true });
    f.ball(A.ha[0], A.ha[1] + 0.9, 1.8, 1.6, 'acc', { group: g });
    f.dot(Math.floor(A.el[0] + (A.ha[0] - A.el[0]) * 0.55), Math.floor(A.el[1] + (A.ha[1] - A.el[1]) * 0.55 + 0.5), 'glow', 2);
  },
  front(f, sk) {
    if (sk.pose === 'collapse') return;
    const bobs = sk.walk ? [0, 1, 1, 0] : [0, 1];
    const ob = bobs[sk.i] ?? 0;
    const x = sk.view === 'side' ? sk.cx - 10 : sk.view === 'down' ? sk.cx + 7 : sk.cx - 12;
    const y = sk.headY + 6 + ob - sk.bob;
    f.tpl(sk.view === 'up' ? ORB_FIELD.map((r) => r.replace('y', 'M')) : ORB_FIELD, x, y, {});
  },
};

CHARS.sera.hooks = {
  skirt(f, sk) {
    const { cx, hip, view } = sk, s = sk.sway * 0.5;
    const tm = (x, y) => (y >= hip + 4 ? 'sec' : 'main');
    if (view === 'side') f.shape([[cx - 3.0, hip - 1], [cx + 3.2, hip - 1], [cx + 4.4, hip + 5], [cx - 4.6 - s, hip + 5.2]], tm);
    else {
      f.shape([[cx - 3.7, hip - 1], [cx + 3.7, hip - 1], [cx + 4.9 + s, hip + 5], [cx - 4.9 + s, hip + 5]], tm);
      fold(f, cx, hip + 1, cx + Math.round(s), hip + 4, 'main', false);
    }
  },
  torso(f, sk) {
    if (sk.view !== 'down') return;
    f.tpl(['.C.', 'CVC', '.C.'], sk.cx - 3, Math.floor(sk.sh) + 2, { only: true });
  },
  neck(f, sk) {
    const { cx, sh, view } = sk;
    if (view === 'side') f.ball(cx + 0.5, sh - 0.2, 3.0, 1.5, 'sec');
    else f.ball(cx, sh - 0.2, 3.6, 1.5, 'sec');
  },
  front(f, sk) {
    if (sk.pose === 'collapse') return;
    haloRing(f, (sk.view === 'side' ? sk.cx - 0.5 : sk.cx) + (sk.hx || 0), sk.headY - 1.2, 5.6, 1.9);
  },
};

// ---------------------------------------------------------------- field sprites (32x48)

// Field frames are 48x48: the art is drawn at 32-px coordinates (centre x = 16) with an 8 px
// offset, so wide poses (pointing, lying down) fit while standing frames look exactly as before.
const FW = 48, FH = 48, FOX = 8;

function fieldFrame(pal) {
  const f = new Frame(FW, FH, pal);
  f.ox = FOX;
  return f;
}

function fieldSkel(ch, view, kind, i) {
  const B = ch.build;
  const walk = kind === 'walk';
  const bob = walk ? (i % 2 === 0 ? 1 : 0) : i === 1 ? 1 : 0;
  const cx = 16;
  const sk = { view, kind, i, walk, bob, cx, headY: B.headY + bob, sh: B.shY + bob, hip: B.hipY + bob, sway: 0, floor: 45.6, hx: 0, eyes: null, pose: null };
  const { sh, hip } = sk;
  if (view === 'side') {
    const P = walk ? i : -1;
    // [knee dx, knee dy below hip, ankle dx, ankle y, toe dx, toe y]
    const pose = {
      fwd: [2.2, 7, 3.6, 44, 6.6, 45.5],
      back: [-1.6, 7.2, -4.2, 43.2, -1.6, 45.5],
      plant: [0.8, 7.3, 0.2, 44, 3.2, 45.5],
      swing: [2.2, 6.0, -0.6, 41.8, 2.0, 43.4],
      standF: [0.6, 7.3, 0.4, 44, 3.4, 45.5],
      standB: [-0.2, 7.3, -0.8, 44, 2.2, 45.5],
    };
    const [pf, pb] = P === 0 ? ['fwd', 'back'] : P === 1 ? ['plant', 'swing'] : P === 2 ? ['back', 'fwd'] : P === 3 ? ['swing', 'plant'] : ['standF', 'standB'];
    const leg = (hx, p) => {
      const q = pose[p];
      return { hip: [cx + hx, hip], knee: [cx + q[0], hip + q[1]], ankle: [cx + q[2], q[3]], toe: [cx + q[4], q[5]] };
    };
    sk.legF = leg(0.3, pf);
    sk.legB = leg(-0.5, pb);
    const swingA = P === 0 ? -1 : P === 2 ? 1 : 0;
    const arm = (s, hx) => ({
      sh: [cx + hx, sh + 1],
      el: [cx + hx + s * 1.1 - 0.1, sh + 5.8],
      ha: [cx + hx + s * 3.1 + 0.3, sh + 10.4 - Math.abs(s) * 0.6],
    });
    sk.armF = arm(swingA, 0.3);
    sk.armB = arm(-swingA, -0.2);
    sk.sway = P === 0 ? 1 : P === 2 ? -1 : 0;
  } else {
    const hx = B.hipX, ax = B.armX;
    const liftL = walk ? [0, 0, 2, 1][i] : 0;
    const liftR = walk ? [2, 1, 0, 0][i] : 0;
    const leg = (s, lift) => {
      const x = cx + s * hx, ank = 44 - lift;
      return { hip: [x, hip], knee: [x + s * 0.15, (hip + ank) / 2 - lift * 0.4], ankle: [x + s * 0.25, ank], lift };
    };
    sk.legL = leg(-1, liftL);
    sk.legR = leg(1, liftR);
    const swing = walk ? [1, 0, -1, 0][i] : 0;
    const arm = (s, fwd) => ({
      sh: [cx + s * ax, sh + 1],
      el: [cx + s * (ax + 0.4 - fwd * 0.2), sh + 5.8],
      ha: [cx + s * (ax + 0.5 - fwd * 0.9), sh + 10.6 + fwd * 0.7],
    });
    sk.armL = arm(-1, -swing);
    sk.armR = arm(1, swing);
    sk.sway = swing;
  }
  return sk;
}

const arm3 = (sh, el, ha) => ({ sh, el, ha });

/**
 * Poses (TECH_PLAN 3.6): each reshapes a standing skeleton (32-px coordinates, side view facing
 * right). The body hooks follow the skeleton, so scarves, coats, robes and weapons come along.
 */
const POSE_SKEL = {
  kneel(sk, B) {
    const d = 7.5;
    sk.headY += d + 1; sk.sh += d; sk.hip += d;
    sk.eyes = 'down';
    const { cx, sh, hip } = sk;
    if (sk.view === 'side') {
      sk.hx = 1;
      sk.legF = { hip: [cx + 0.3, hip], knee: [cx + 5.2, hip - 0.4], ankle: [cx + 5.6, 44], toe: [cx + 8.6, 45.5] };
      sk.legB = { hip: [cx - 0.5, hip], knee: [cx - 1.0, 44.6], ankle: [cx - 6.2, 44.4], toe: [cx - 8.4, 45.4] };
      sk.armF = arm3([cx + 0.3, sh + 1], [cx + 2.4, sh + 5.4], [cx + 4.6, hip - 1.6]);
      sk.armB = arm3([cx - 0.2, sh + 1], [cx - 0.6, sh + 5.8], [cx + 0.4, sh + 10]);
    } else {
      const hx = B.hipX, ax = B.armX;
      // one knee on the floor (its foot hidden behind), the other raised toward the camera
      sk.legL = { hip: [cx - hx, hip], knee: [cx - hx - 0.4, 44.6], ankle: [cx - hx - 0.4, 44.6], lift: 0, noFoot: true };
      sk.legR = { hip: [cx + hx, hip], knee: [cx + hx + 3.0, hip + 2.2], ankle: [cx + hx + 3.4, 43.8], lift: 1 };
      sk.armL = arm3([cx - ax, sh + 1], [cx - ax - 0.4, sh + 5.6], [cx - ax + 0.6, sh + 10]);
      sk.armR = arm3([cx + ax, sh + 1], [cx + ax + 1.0, sh + 5.0], [cx + hx + 2.8, hip + 0.8]);
    }
  },
  look_up(sk) {
    sk.eyes = 'up';
    sk.headY -= 1;   // the chin lifts and the neck shows
    const { cx, sh } = sk;
    if (sk.view === 'side') {
      sk.hx = -1;
      sk.armF = arm3([cx + 0.3, sh + 1], [cx - 0.4, sh + 5.8], [cx - 0.8, sh + 10.4]);
    }
  },
  arms_crossed(sk, B) {
    const { cx, sh } = sk, ax = B.armX;
    if (sk.view === 'side') {
      sk.armF = arm3([cx + 0.3, sh + 1], [cx + 0.6, sh + 6.2], [cx + 3.6, sh + 4.8]);
      sk.armB = arm3([cx - 0.2, sh + 1], [cx - 0.4, sh + 6.0], [cx + 2.6, sh + 5.6]);
    } else {
      sk.armL = arm3([cx - ax, sh + 1], [cx - ax - 0.6, sh + 6.2], [cx + 2.4, sh + 5.6]);
      sk.armR = arm3([cx + ax, sh + 1], [cx + ax + 0.6, sh + 6.6], [cx - 2.4, sh + 6.4]);
    }
  },
  hand_to_chest(sk, B) {
    const { cx, sh } = sk, ax = B.armX;
    sk.eyes = 'down';
    if (sk.view === 'side') sk.armF = arm3([cx + 0.3, sh + 1], [cx + 1.6, sh + 6.2], [cx + 3.0, sh + 3.4]);
    else sk.armR = arm3([cx + ax, sh + 1], [cx + ax + 0.6, sh + 6.4], [cx + 1.4, sh + 3.8]);
  },
  point(sk, B) {
    const { cx, sh } = sk, ax = B.armX;
    if (sk.view === 'side') {
      sk.armF = arm3([cx + 0.3, sh + 1], [cx + 4.8, sh + 1.8], [cx + 9.4, sh + 1.8]);
      sk.finger = [cx + 10.6, sh + 2.2, cx + 12.2, sh + 2.2];
    } else {
      sk.armR = arm3([cx + ax, sh + 1], [cx + ax + 4.2, sh + 1.4], [cx + ax + 8.4, sh + 1.2]);
      sk.finger = [cx + ax + 9.6, sh + 1.6, cx + ax + 11.2, sh + 1.6];
    }
  },
  collapse(sk, B) {
    sk.eyes = 'closed';
    const { cx, sh, hip } = sk, ax = B.armX, hx = B.hipX;
    if (sk.view === 'side') {
      sk.legF = { hip: [cx + 0.3, hip], knee: [cx + 3.6, hip + 6.0], ankle: [cx + 1.2, 43.4], toe: [cx + 4.0, 44.8] };
      sk.armF = arm3([cx + 0.3, sh + 1], [cx + 1.8, sh + 5.6], [cx + 3.0, hip - 1.4]);
      sk.armB = arm3([cx - 0.2, sh + 1], [cx - 1.6, sh + 5.4], [cx - 2.0, sh + 10]);
    } else {
      sk.armL = arm3([cx - ax, sh + 1], [cx - ax - 1.6, sh + 5.6], [cx - ax - 2.6, sh + 10.2]);
      sk.armR = arm3([cx + ax, sh + 1], [cx + ax + 1.4, sh + 5.8], [cx + ax + 1.8, sh + 10.4]);
      sk.legR = { hip: [cx + hx, hip], knee: [cx + hx + 1.6, (hip + 44) / 2], ankle: [cx + hx + 1.0, 44], lift: 0 };
    }
  },
};

/** Lay a drawn (standing) figure down: rotate it a quarter turn, head left, onto the floor line. */
function lieDown(src) {
  const f = new Frame(FW, FH, src.pal);
  let x0 = FW, x1 = -1, y1 = -1;
  const at = (x, y) => [y, FW - 1 - x];           // counter-clockwise: the top goes left
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    if (src.m[y * FW + x] < 0) continue;
    const [nx, ny] = at(x, y);
    x0 = Math.min(x0, nx); x1 = Math.max(x1, nx); y1 = Math.max(y1, ny);
  }
  const dx = Math.round((FW - (x0 + x1 + 1)) / 2), dy = 46 - y1;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const i = y * FW + x;
    if (src.m[i] < 0) continue;
    const [nx, ny] = at(x, y);
    const j = (ny + dy) * FW + nx + dx;
    f.m[j] = src.m[i]; f.t[j] = src.t[i]; f.a[j] = src.a[i]; f.g[j] = src.g[i];
  }
  return f;
}

function drawFieldFrame(ch, view, kind, i, blink = false, pose = null) {
  const f = fieldFrame(ch.pal);
  const sk = fieldSkel(ch, view, kind, i);
  if (pose) {
    sk.pose = pose;
    POSE_SKEL[pose](sk, ch.build);
  }
  const H = ch.hooks || {};
  H.behind?.(f, sk);
  if (view === 'side') {
    drawArm(f, ch, sk.armB, 1);
    drawLeg(f, ch, sk.legB, view, 1);
    drawTorso(f, ch, sk);
    drawLeg(f, ch, sk.legF, view, 0);
  } else {
    const [l0, l1] = sk.legL.lift > sk.legR.lift ? [sk.legL, sk.legR] : [sk.legR, sk.legL];
    drawLeg(f, ch, l0, view);
    drawLeg(f, ch, l1, view);
    drawTorso(f, ch, sk);
  }
  H.torso?.(f, sk);
  H.skirt?.(f, sk);
  if (view === 'side') drawArm(f, ch, sk.armF, 0);
  else { drawArm(f, ch, sk.armL); drawArm(f, ch, sk.armR); }
  if (sk.finger) {
    const [ax, ay, bx, by] = sk.finger;
    f.limb(ax, ay, bx, by, 0.7, 0.55, ch.style.hand);
  }
  H.arms?.(f, sk);
  drawNeck(f, sk);
  H.neck?.(f, sk);
  drawFieldHead(f, ch, sk, blink);
  H.front?.(f, sk);
  return pose === 'collapse' ? lieDown(f) : f;
}

// 8 fps sequence: 2 fps breathing (a/b) with a quick blink every 4 s.
function idleSeq(a, b, blink) {
  const s = [];
  for (let k = 0; k < 3; k++) s.push(a, a, a, a, b, b, b, b);
  s.push(a, a, blink ?? a, a, b, b, b, b);
  return s;
}

// Frame list shared by party members and NPCs: [view, kind, index, blink].
const FIELD_LAYOUT = [
  ['down', 'idle', 0], ['down', 'idle', 1], ['down', 'idle', 0, true],
  ['down', 'walk', 0], ['down', 'walk', 1], ['down', 'walk', 2], ['down', 'walk', 3],
  ['up', 'idle', 0], ['up', 'idle', 1],
  ['up', 'walk', 0], ['up', 'walk', 1], ['up', 'walk', 2], ['up', 'walk', 3],
  ['side', 'idle', 0], ['side', 'idle', 1], ['side', 'idle', 0, true],
  ['side', 'walk', 0], ['side', 'walk', 1], ['side', 'walk', 2], ['side', 'walk', 3],
];
const FIELD_ANIMS = {
  idle_down: { frames: idleSeq(0, 1, 2), fps: 8, loop: true },
  walk_down: { frames: [3, 4, 5, 6], fps: 8, loop: true },
  idle_up: { frames: idleSeq(7, 8), fps: 8, loop: true },
  walk_up: { frames: [9, 10, 11, 12], fps: 8, loop: true },
  idle_side: { frames: idleSeq(13, 14, 15), fps: 8, loop: true },
  walk_side: { frames: [16, 17, 18, 19], fps: 8, loop: true },
};

/** Pose frames appended after the 20 standard ones: [pose, view] per frame, anims '<pose>_<view>'. */
function poseLayout(poses) {
  const out = [];
  for (const pose of poses) for (const view of ['down', 'side']) out.push([pose, view]);
  return out;
}

function fieldAnims(poses) {
  const anims = { ...FIELD_ANIMS };
  poseLayout(poses).forEach(([pose, view], k) => {
    anims[`${pose}_${view}`] = { frames: [FIELD_LAYOUT.length + k], fps: 1, loop: true };
  });
  return anims;
}

// ---------------------------------------------------------------- sheets

function cloneAnims(anims) {
  const out = {};
  for (const k of Object.keys(anims)) out[k] = { ...anims[k], frames: anims[k].frames.slice() };
  return out;
}

function buildSheet(frames, cols, anims, facing) {
  const painters = frames.map((f) => f.render());
  const packed = packSheet(painters, cols);
  const sp = packed.painter, W = sp.w;
  const glow = new Uint8Array(W * sp.h);
  let any = false;
  frames.forEach((f, k) => {
    const ox = (k % cols) * f.w, oy = Math.floor(k / cols) * f.h, m = f.glowMask();
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      if (m[y * f.w + x]) { glow[(oy + y) * W + ox + x] = 1; any = true; }
    }
  });
  const normal = makeNormalMap(sp, { frameW: packed.frameW, frameH: packed.frameH, bevel: 2, strength: 2.0, lumaRelief: 0.4 });
  const emissive = any ? makeEmissiveMap(sp, (c, x, y) => glow[y * W + x] === 1).canvas : null;
  return {
    canvas: packed.canvas,
    normal: normal.canvas,
    emissive,
    frameW: packed.frameW,
    frameH: packed.frameH,
    cols: packed.cols,
    rows: packed.rows,
    count: packed.count,
    anims: cloneAnims(anims),
    pxPerUnit: 32,
    facing,
  };
}

// Painted sheets and portraits live in the art cache (TECH_PLAN 11.5); sheets carry their key so a
// SpriteActor keeps them from eviction while it shows them.
function cached(key, make) {
  const hit = artCache.get(key);
  if (hit !== undefined) return hit;
  const v = make();
  if (v && typeof v === 'object' && 'frameW' in v) v.cacheKey = key;
  return artCache.set(key, v, typeof v === 'string' ? { bytes: v.length * 2 } : undefined);
}

const REGISTERED = {};
const RESOLVED = new Map();
const NPC_ALIAS = { halcyon: 'holo' };

/**
 * Register a character (TECH_PLAN 3.12). CharDef = the CHARS format { mats, build, style, hair,
 * over, hooks } with optional `base: 'nyx'` (inherit everything, override what is given), `locks`
 * (capsule hair per view instead of `hair` templates), `poses` (default all POSES), `portrait`
 * ({ bust(f), collar(f), behind?, after?, over }, merged over the base's: `{ after: null }` drops
 * SERA's halo, `{ over: [] }` KADE's visor), `hairLocks` / `hairline` (portrait hair) and
 * `expressions` ({ name: [[row, col, chars], ...] } edits of the portrait face); or
 * { custom: { field(view, kind, i, blink) -> Painter | canvas, portrait(expr) -> Painter | canvas } }.
 * Re-registering an id repaints its art on next use.
 */
export function registerCharacter(id, def) {
  REGISTERED[id] = def;
  RESOLVED.clear();
  for (const key of artCache.keys()) {
    const [kind, rest = ''] = key.split(/:(.*)/);
    if (['field', 'battle', 'portrait', 'portraitURL', 'npc'].includes(kind) && rest.split(':')[0] === id) artCache.delete(key);
  }
}

/** True for party ids, BOLT / HALCYON and registered characters. */
export function hasCharacter(id) {
  return !!(CHARS[id] || REGISTERED[id] || NPC_DEFS[id] || NPC_ALIAS[id]);
}

/** Resolved CHARS-format character (party or registered, `base` merged), or a { custom } one, or null. */
function resolveChar(id, depth = 0) {
  if (CHARS[id]) return CHARS[id];
  const def = REGISTERED[id];
  if (!def || depth > 6) return null;
  if (RESOLVED.has(id)) return RESOLVED.get(id);
  let ch;
  if (def.custom) ch = { id, custom: def.custom };
  else {
    const base = def.base ? resolveChar(def.base, depth + 1) : null;
    if (def.base && !base) console.warn(`characters: "${id}" has an unknown base "${def.base}"`);
    const B = base && !base.custom ? base : CHARS.kade;
    const from = base && !base.custom ? base : null;
    ch = {
      id,
      mats: { ...B.mats, ...def.mats },
      build: { ...B.build, ...def.build },
      style: { ...B.style, ...def.style },
      hair: def.hair || (from ? from.hair : null),
      locks: def.locks || (from ? from.locks || FIELD_LOCKS[from.id] || null : null),
      over: def.over || (from ? from.over : {}),
      hooks: { ...(from ? from.hooks : {}), ...def.hooks },
      portrait: from || def.portrait ? { ...(from ? from.portrait || PORTRAIT[from.id] : GENERIC_PORTRAIT), ...def.portrait } : null,
      hairLocks: def.hairLocks || (from ? from.hairLocks || HAIR_LOCKS[from.id] : null),
      hairline: def.hairline ?? (from ? from.hairline ?? HAIRLINE[from.id] : 6.4),
      expressions: { ...(from ? from.expressions : {}), ...def.expressions },
      poses: def.poses || (from ? from.poses : null) || POSES,
    };
    if (!ch.hair && !ch.locks) ch.locks = FIELD_LOCKS.orion;   // a generic tousled crop
    ch.mats.vial = ch.mats.vial || CHARS.kade.mats.vial;
    if (!ch.mats.glow2) ch.mats.glow2 = ch.mats.glow;
    ch.pal = makePal(ch.mats);
  }
  RESOLVED.set(id, ch);
  return ch;
}

function hslHex(hh, ss, ll) {
  const f = (n) => {
    const k = (n + hh * 12) % 12, a = ss * Math.min(ll, 1 - ll);
    const v = ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Tinted silhouette for an unknown id (TECH_PLAN 3.12): Kade's build in one flat hue, no glow. */
function silhouetteChar(id) {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const tone = ramp(hslHex((h % 360) / 360, 0.22, 0.46), 5, 0.3);
  const mats = {};
  for (const k of Object.keys(CHARS.kade.mats)) mats[k] = k === 'ink' ? [OUTLINE, OUTLINE_SOFT] : tone;
  const pal = makePal(mats);
  pal.glow = pal.glow.map(() => false);
  return { ...CHARS.kade, id, mats, pal, over: {}, hooks: {}, locks: FIELD_LOCKS.kade, poses: POSES };
}

function missingChar(id) {
  if (noteMissingArt('character', id)) console.warn(`characters: unknown character "${id}" (tinted silhouette)`);
  return silhouetteChar(id);
}

/** A party member's definition (battle sprites exist for the four travelers only). */
function charDef(id) {
  const ch = CHARS[id];
  if (!ch) throw new Error(`characters: unknown party id "${id}"`);
  return ch;
}

/** Frames of a custom character: its painter (32 or 48 wide) centred in a 48x48 frame. */
function customFrame(src) {
  const img = src instanceof Painter ? src : Painter.fromCanvas(src);
  const p = new Painter(FW, FH);
  p.blit(img, Math.round((FW - img.w) / 2), FH - img.h);
  return { render: () => p, glowMask: () => new Uint8Array(FW * FH), w: FW, h: FH };
}

/**
 * Field sheet (48x48 frames) for a party id, a registered character, 'bolt' / 'holo' (or
 * 'halcyon'); unknown ids draw a tinted silhouette with one console.warn. Anims: idle_/walk_ per
 * view, plus '<pose>_down' / '<pose>_side' for each pose (POSES; poseAnim() resolves facings).
 */
export function buildFieldSprite(id) {
  const npc = NPC_ALIAS[id] || id;
  if (NPC_DEFS[npc]) return buildNpcSprite(npc);
  return cached(`field:${id}`, () => {
    const ch = resolveChar(id) || missingChar(id);
    if (ch.custom) {
      const poses = REGISTERED[id].poses || [];
      const frames = [
        ...FIELD_LAYOUT.map(([v, k, i, b]) => customFrame(ch.custom.field(v, k, i, b))),
        ...poseLayout(poses).map(([pose, v]) => customFrame(ch.custom.field(v, pose, 0, false))),
      ];
      return buildSheet(frames, 10, fieldAnims(poses), 'down');
    }
    const poses = ch.poses || POSES;
    const frames = [
      ...FIELD_LAYOUT.map(([v, k, i, b]) => drawFieldFrame(ch, v, k, i, b)),
      ...poseLayout(poses).map(([pose, v]) => drawFieldFrame(ch, v, 'idle', 0, false, pose)),
    ];
    return buildSheet(frames, 10, fieldAnims(poses), 'down');
  });
}

// ---------------------------------------------------------------- battle sprites (64x64, 3/4 view facing left)

const BW = 64, BH = 64;

// Generic 3/4 face looking left (16 wide). Far eye at col 3, near eye at cols 7-8 (with a white catch-light).
const FACE_B = [
  '................',
  '................',
  '................',
  '.....eeeeee.....',
  '...eeeeeeeeee...',
  '..eeeeeeeeeeee..',
  '..reeeeeeeewww..',
  '..reeeeeeeewww..',
  '.reieeeiieewqw..',
  '.reoeeeopeewqw..',
  '.reeeweeeeewqw..',
  '.reeeweeeeww....',
  '.eeeeeeeeew.....',
  '..eeweeeeww.....',
  '...eeeeeww......',
  '....wwwww.......',
];
const FACE_MAPS = {
  blink: { i: 'e', o: 'q', p: 'q' },
  hurt: { i: 'q', o: 'e', p: 'e' },
};

const BOVER = {
  kade: [[0, 8, ['.nyuyyyuuyyn....', '.mtttttttttm....']]],
  nyx: [[0, 8, ['.......uun......', '.......yyn......']]],
  orion: [[0, 5, ['.nXNBXnnXNBXnnn.', '.nXMMXnnXMMXnnn.']]],
  sera: [],
};
const ORB_B = [
  '..nMn..',
  '.nMNBn.',
  'nMNNMMn',
  'XCVyVCX',
  'mnMMMnm',
  '.mnMnm.',
  '..mmm..',
];
const VIAL = [
  '.N.',
  '.M.',
  'PRQ',
  'PQQ',
  'OPP',
];

/** Rotate a template 90 degrees clockwise. */
function rotCW(rows) {
  const h = rows.length, w = rows[0].length, out = [];
  for (let x = 0; x < w; x++) {
    let r = '';
    for (let y = h - 1; y >= 0; y--) r += rows[y][x];
    out.push(r);
  }
  return out;
}

const BATTLE_BUILD = {
  kade: { hipY: 40, torso: 13.5, chestR: 6.1, waistR: 4.7, hipR: 5.0, thighR: 2.95, shinR: 2.5, footR: 2.2, armR: 2.2, handR: 2.0, thigh: 10.5, shin: 10.2, upper: 6.8, fore: 6.4 },
  nyx: { hipY: 40, torso: 13.5, chestR: 5.3, waistR: 4.0, hipR: 4.6, thighR: 2.6, shinR: 2.2, footR: 2.0, armR: 1.95, handR: 1.8, thigh: 10.6, shin: 10.3, upper: 6.8, fore: 6.4 },
  orion: { hipY: 40.5, torso: 13, chestR: 5.7, waistR: 4.6, hipR: 5.0, thighR: 2.65, shinR: 2.3, footR: 2.05, armR: 2.0, handR: 1.85, thigh: 10.2, shin: 10.2, upper: 6.6, fore: 6.2 },
  sera: { hipY: 42.5, torso: 12.5, chestR: 5.0, waistR: 3.8, hipR: 4.4, thighR: 2.4, shinR: 2.05, footR: 1.9, armR: 1.8, handR: 1.7, thigh: 9.6, shin: 9.4, upper: 6.2, fore: 5.8 },
};

/** Two-bone IK: elbow/knee for a limb from a to b. bend +1 puts the joint on the (-dy, dx) side. */
function ik(a, b, l1, l2, bend) {
  let dx = b[0] - a[0], dy = b[1] - a[1];
  let d = Math.hypot(dx, dy) || 1e-6;
  if (d > l1 + l2 - 0.05) {
    const k = (l1 + l2 - 0.05) / d;
    dx *= k; dy *= k; d = l1 + l2 - 0.05;
  }
  const end = [a[0] + dx, a[1] + dy];
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const mx = a[0] + (dx * x) / d, my = a[1] + (dy * x) / d;
  return { mid: [mx + (-dy / d) * h * bend, my + (dx / d) * h * bend], end };
}

const dir = (deg) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];

/**
 * Build a battle skeleton from a compact pose spec:
 *   bx/by body offset, lean (neck ahead of hip), crouch, hx/hy head nudge, face expression,
 *   fF/fN ankle x of the front (far) / back (near) foot, hF/hN hand offsets from the far/near shoulder
 *   (or absolute with HF/HN), bF/bN elbow bend side, plus weapon fields read by each character's hooks.
 */
function battleRig(id, spec) {
  const B = BATTLE_BUILD[id];
  const bx = spec.bx || 0, by = spec.by || 0, lean = spec.lean ?? 2.5, crouch = spec.crouch || 0;
  const hip = [35 + bx, B.hipY + by + crouch];
  const neck = [hip[0] - lean, hip[1] - B.torso + crouch * 0.15];
  const P = { ...spec, id, B, hip, neck, k: spec.k || 0 };
  P.head = [Math.round(neck[0] - 7.5 + (spec.hx || 0)), Math.round(neck[1] - 16 + (spec.hy || 0))];
  P.shF = [neck[0] - (B.chestR - 2.6), neck[1] + 2.8];
  P.shN = [neck[0] + (B.chestR - 1.4), neck[1] + 3.2];
  const leg = (hx, ax, bend, toeDx) => {
    const h = [hip[0] + hx, hip[1]];
    const r = ik(h, [ax, 60], B.thigh, B.shin, bend);
    return { hip: h, knee: r.mid, ankle: r.end, toe: [r.end[0] + toeDx, 61.5] };
  };
  P.legF = leg(-2, spec.fF ?? 27, 1, -4.2);
  P.legN = leg(2, spec.fN ?? 43.5, 1, -4.0);
  const arm = (sh, h, H, bend) => {
    const target = H || add(sh, h || [0, 10]);
    const r = ik(sh, target, B.upper, B.fore, bend);
    return { sh, el: r.mid, ha: r.end };
  };
  P.armF = arm(P.shF, spec.hF, spec.HF, spec.bF ?? -1);
  P.armN = arm(P.shN, spec.hN, spec.HN, spec.bN ?? -1);
  return P;
}

/** Torso as two tapered capsules along the spine; mat(t, side) with t 0 (neck) .. 1 (hip), side > 0 = front. */
function drawBTorso(f, ch, P) {
  const B = P.B, [hx, hy] = P.hip, [nx, ny] = P.neck;
  const dx = hx - nx, dy = hy - ny, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const top = [nx + ux * 2.4, ny + uy * 2.4], tw = 0.62;
  const waist = [nx + ux * L * tw, ny + uy * L * tw];
  const mat = ch.bstyle.torso;
  const g = f.group();
  const t0 = 2.4 / L;
  f.limb(top[0], top[1], waist[0], waist[1], B.chestR, B.waistR, (t, s) => mat(t0 + t * (tw - t0), s), { group: g });
  f.limb(waist[0], waist[1], hx, hy, B.waistR, B.hipR, (t, s) => mat(tw + t * (1 - tw), s), { group: g });
}

function drawBHead(f, id, P) {
  const g = f.group();
  const map = P.face ? FACE_MAPS[P.face] : null;
  const [x, y] = P.head;
  // KO lies the head on its back: rotate 90 degrees clockwise inside the 16x16 head box.
  const T = P.ko ? (u, v) => [x + 16 - v, y + u] : (u, v) => [x + u, y + v];
  const Ti = P.ko ? (px, py) => [py - y, x + 16 - px] : (px, py) => [px - x, py - y];
  f.tpl(P.ko ? rotCW(FACE_B) : FACE_B, x, y, { group: g, map, sep: true });
  const line = HAIRLINE[id];
  lockHair(f, HAIR_LOCKS[id], T, (px, py) => { const [u, v] = Ti(px, py); return u < 10.6 && v > line; });
  for (const [ox, oy, rows] of BOVER[id]) {
    if (!P.ko) { f.tpl(rows, x + ox, y + oy, { group: g }); continue; }
    const full = Array(16).fill('.'.repeat(16));
    rows.forEach((r, j) => { full[oy + j] = '.'.repeat(ox) + r + '.'.repeat(16 - ox - r.length); });
    f.tpl(rotCW(full), x, y, { group: g });
  }
}

// Battle hair built from tapered capsules (root -> tip) in 16x16 head-box coordinates, back to front.
// Each lock is its own draw group, so the contact lines between locks become the dark separations
// between clumps. 'ball' entries are rounded masses (skull cap, bob volume).
const HAIR_LOCKS = {
  kade: [
    ['ball', 12, 8.6, 3.8, 4.4],
    ['ball', 8.8, 5.4, 7.0, 4.6],
    [12.5, 10, 15.6, 13.4, 2.0, 0.4],
    [12, 7.5, 17, 7.6, 2.4, 0.4],
    [11, 5, 16.4, 3.0, 2.6, 0.4],
    [10, 4, 14.2, -0.2, 2.7, 0.4],
    [7.5, 3.8, 9.2, -0.8, 2.7, 0.4],
    [4.8, 4.2, 4.0, 0.0, 2.5, 0.4],
    [3.2, 5, 0.4, 6.6, 2.3, 0.4],
    [6.6, 5.2, 5.6, 8.3, 1.9, 0.3],
    [9.6, 5.6, 9.6, 8.2, 1.6, 0.3],
  ],
  nyx: [
    ['ball', 12, 9, 3.9, 4.8],
    ['ball', 8.6, 5.8, 7.3, 5.0],
    [12, 8, 13, 14, 2.6, 1.0],
    [10.6, 7, 10.9, 13.2, 1.6, 0.5],
    [9.5, 2.6, 13.5, 6.5, 2.4, 1.0],
    [8, 3.0, 2.4, 7.6, 3.0, 0.6],
    [5, 3.6, 0.6, 8.0, 2.2, 0.4],
    [2.4, 6, 1.3, 13.6, 1.6, 0.6],
  ],
  orion: [
    ['ball', 12, 8.6, 3.8, 4.6],
    ['ball', 8.5, 5.5, 7.2, 4.8],
    [12, 10, 15.5, 12.8, 2.0, 0.4],
    [12, 6.5, 16.8, 6.0, 2.4, 0.4],
    [10.5, 3.5, 14.8, 0.8, 2.5, 0.4],
    [8, 3, 8.8, -0.8, 2.4, 0.4],
    [5.5, 3.5, 2.8, 0.4, 2.3, 0.4],
    [3.5, 5, 0.0, 4.6, 2.0, 0.4],
    [4.5, 5.8, 2.6, 8.8, 1.7, 0.3],
    [7.6, 6, 7.2, 8.6, 1.6, 0.3],
    [10.4, 6, 11.2, 8.8, 1.5, 0.3],
  ],
  sera: [
    ['ball', 11.6, 9.4, 4.5, 5.2],
    ['ball', 8.5, 6.0, 7.5, 5.2],
    [12.6, 7.6, 13.8, 12.6, 2.8, 2.4],
    [1.2, 6.0, 0.4, 11.4, 1.4, 1.2],
    [10.2, 3.4, 10.2, 5.6, 1.8, 1.4],
    [7.4, 3.0, 7.0, 5.8, 1.9, 1.5],
    [4.8, 3.4, 4.0, 5.8, 1.8, 1.4],
  ],
};
// Rows below which the rounded hair masses may not cover the face (fringe locks still can).
const HAIRLINE = { kade: 6.2, nyx: 6.4, orion: 6.0, sera: 6.6 };
const PONYTAIL = [
  [12.5, 3.2, 17.2, 4.8, 2.5, 2.2, 0],
  [17.2, 4.8, 19, 10, 2.2, 1.6, 0.5],
  [19, 10, 18.8, 16.5, 1.6, 0.4, 1],
];

function lockHair(f, locks, T, clip, S = 1) {
  for (const L of locks) {
    if (L[0] === 'ball') {
      const [cx, cy] = T(L[1], L[2]);
      const ko = T(0, 0)[0] !== T(0, 1)[0];
      f.ball(cx, cy, (ko ? L[4] : L[3]) * S, (ko ? L[3] : L[4]) * S, 'hair', { spec: true, clip });
      continue;
    }
    const [a, b] = [T(L[0], L[1]), T(L[2], L[3])];
    f.limb(a[0], a[1], b[0], b[1], L[4] * S, L[5] * S, 'hair', { spec: true });
  }
}

function ponytail(f, P) {
  const [x, y] = P.head, sw = P.k % 2 ? 1 : 0, g = f.group();
  for (const [ax, ay, bx, by, ra, rb, w] of PONYTAIL) {
    f.limb(x + ax + sw * w * 0.5, y + ay, x + bx + sw * w, y + by, ra, rb, 'hair', { group: g, spec: true });
  }
  f.ball(x + 13, y + 3.4, 1.5, 1.7, 'metal', { group: g, spec: true });
}

/** Radial burst of glow pixels (cast poses, muzzle flash). */
function glowBurst(f, x, y, r, mat = 'glow2') {
  const mi = f.mat(mat);
  f.begin();
  for (let j = Math.floor(y - r - 3); j <= Math.ceil(y + r + 3); j++) {
    for (let i = Math.floor(x - r - 3); i <= Math.ceil(x + r + 3); i++) {
      const dx = i + 0.5 - x, dy = j + 0.5 - y, d = Math.hypot(dx, dy);
      if (d < r * 0.55) f.put(i, j, mi, 2);
      else if (d < r) f.put(i, j, mi, 1);
      else if (r >= 1.5 && (Math.abs(dx) < 0.6 || Math.abs(dy) < 0.6) && d < r + 2.5) f.put(i, j, mi, d < r + 1.2 ? 1 : 0);
    }
  }
  f.end(false);
}

function vial(f, hand) {
  f.tpl(VIAL, Math.round(hand[0] - 1.5), Math.round(hand[1] - 5.5), { sep: true });
}

// -- weapons

function swordB(f, grip, deg, len = 15, o = {}) {
  const [dx, dy] = dir(deg), [gx, gy] = grip, px = -dy, py = dx, g = f.group();
  f.limb(gx - dx * 2.4, gy - dy * 2.4, gx + dx * 1.2, gy + dy * 1.2, 0.95, 0.95, 'lea', { group: g });
  f.ball(gx - dx * 3.1, gy - dy * 3.1, 1.15, 1.15, 'metal', { group: g });
  f.limb(gx + dx * 2.2, gy + dy * 2.2, gx + dx * len, gy + dy * len, 1.65, 0.55, 'metal', { group: g, spec: true });
  const cx = gx + dx * 1.9, cy = gy + dy * 1.9;
  f.limb(cx - px * 2.9, cy - py * 2.9, cx + px * 2.9, cy + py * 2.9, 1.0, 1.0, 'main', { group: g, spec: true });
  if (o.glint) f.dot(Math.floor(gx + dx * (len - 2)), Math.floor(gy + dy * (len - 2)), 'metal', 4);
}

function lanceB(f, butt, tip, o = {}) {
  const dx = tip[0] - butt[0], dy = tip[1] - butt[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const g = f.group(), hl = o.head || 6.5;
  const h0 = [tip[0] - ux * hl, tip[1] - uy * hl];
  f.limb(butt[0], butt[1], h0[0], h0[1], o.r || 0.9, o.r || 0.9, o.shaft || 'metal', { group: g, dim: o.dim || 0 });
  f.limb(h0[0], h0[1], tip[0], tip[1], o.headR || 1.9, 0.2, 'metal', { group: g, spec: true, dim: o.dim || 0 });
  f.ball(h0[0], h0[1], 1.4, 1.4, o.collar || 'acc', { group: g, dim: o.dim || 0 });
  f.line(h0[0] + ux * 1.5, h0[1] + uy * 1.5, tip[0] - ux * 1.2, tip[1] - uy * 1.2, o.glowMat || 'glow2', o.glowTone ?? 1, { on: 'metal' });
}

/** NYX's long rifle from the stock end to the muzzle. */
function rifleB(f, stock, muzzle, o = {}) {
  const dx = muzzle[0] - stock[0], dy = muzzle[1] - stock[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  let px = -uy, py = ux;
  if (py > 0) { px = -px; py = -py; } // "up" side of the gun
  const at = (t, up = 0) => [stock[0] + ux * L * t + px * up, stock[1] + uy * L * t + py * up];
  const g = f.group();
  const s0 = at(0), s1 = at(0.26), r0 = at(0.22), r1 = at(0.55), b1 = at(1);
  f.limb(s0[0] + px * 0.6, s0[1] + py * 0.6, s1[0], s1[1], 2.3, 1.4, 'lea', { group: g });
  f.limb(r0[0], r0[1], r1[0], r1[1], 1.9, 1.6, 'metal', { group: g, spec: true });
  f.limb(r1[0], r1[1], b1[0], b1[1], 1.0, 1.0, 'metal', { group: g });
  const mz = at(0.93);
  f.limb(mz[0], mz[1], b1[0], b1[1], 1.35, 1.35, 'metal', { group: g });
  const sc0 = at(0.27, 2.9), sc1 = at(0.5, 2.9);
  f.limb(sc0[0], sc0[1], sc1[0], sc1[1], 1.25, 1.2, 'metal', { group: g, spec: true });
  const lens = at(0.26, 2.9);
  f.dot(Math.floor(lens[0]), Math.floor(lens[1]), 'acc', 3);
  const mag = at(0.4, -1.8);
  f.limb(mag[0], mag[1], mag[0] - px * 2.2 + ux * 0.6, mag[1] - py * 2.2 + uy * 0.6, 0.9, 0.8, 'metal', { group: g });
  f.line(at(0.56, 0.2)[0], at(0.56, 0.2)[1], at(0.9, 0.2)[0], at(0.9, 0.2)[1], 'acc', 2, { on: 'metal' });
  if (o.flash) glowBurst(f, b1[0] + ux * 1.5, b1[1] + uy * 1.5, 1.8, 'glow2');
}

function knifeB(f, grip, deg) {
  const [dx, dy] = dir(deg), g = f.group();
  f.limb(grip[0] - dx * 1.6, grip[1] - dy * 1.6, grip[0] + dx * 0.8, grip[1] + dy * 0.8, 0.9, 0.9, 'lea', { group: g });
  const gx = grip[0] + dx, gy = grip[1] + dy;
  f.limb(gx - dy * 1.7, gy + dx * 1.7, gx + dy * 1.7, gy - dx * 1.7, 0.8, 0.8, 'metal', { group: g });
  f.limb(grip[0] + dx * 1.5, grip[1] + dy * 1.5, grip[0] + dx * 10, grip[1] + dy * 10, 1.3, 0.35, 'metal', { group: g, spec: true });
  f.line(grip[0] + dx * 2.5, grip[1] + dy * 2.5, grip[0] + dx * 8.5, grip[1] + dy * 8.5, 'acc', 3, { on: 'metal' });
}

// -- shared battle assembly

function drawBattleFrame(id, spec) {
  const ch = CHARS[id];
  const P = spec.ko ? koRig(id, spec) : battleRig(id, spec);
  const f = new Frame(BW, BH, ch.pal);
  const H = ch.bhooks;
  const B = P.B;
  H.back?.(f, P);
  const gF = drawArm(f, ch, P.armF, 1, { B, noHand: true });
  if (!P.farFront) H.farWeapon?.(f, P);
  H.farHand ? H.farHand(f, P, gF) : f.ball(P.armF.ha[0], P.armF.ha[1] + 0.5, B.handR, B.handR, ch.style.hand, { group: gF, dim: 1 });
  drawLeg(f, ch, P.legF, 'battle', 0, B);
  drawLeg(f, ch, P.legN, 'battle', 0, B);
  drawBTorso(f, ch, P);
  H.torso?.(f, P);
  H.skirt?.(f, P);
  if (!P.ko) f.limb(P.neck[0] - 0.5, P.neck[1] - 1.5, P.neck[0], P.neck[1] + 1.5, 1.9, 1.9, 'skin', { sep: false });
  H.neck?.(f, P);
  drawBHead(f, id, P);
  if (P.farFront) H.farWeapon?.(f, P);
  drawArm(f, ch, P.armN, 0, { B });
  H.front?.(f, P);
  if (P.glowN) glowBurst(f, P.armN.ha[0], P.armN.ha[1], P.glowN, P.glowMat || 'glow2');
  if (P.glowF) glowBurst(f, P.armF.ha[0], P.armF.ha[1], P.glowF, P.glowMat || 'glow2');
  if (P.item) vial(f, P.armN.ha);
  return f;
}

/** KO: lying on the back, head to the right, feet to the left. */
function koRig(id, spec) {
  const B = BATTLE_BUILD[id];
  const g = 60.5;
  const P = { ...spec, id, B, k: 0, ko: true, face: 'blink' };
  P.hip = [29, g - 1.5];
  P.neck = [29 + B.torso + 1, g - 2.2];
  P.head = [Math.round(P.neck[0] + 1), Math.round(g - 13.5)];
  P.shF = [P.neck[0] - 2, P.neck[1] - 2.2];
  P.shN = [P.neck[0] - 2.5, P.neck[1] + 1.2];
  P.legF = { hip: [P.hip[0], P.hip[1] - 1], knee: [P.hip[0] - 9, g - 4.5], ankle: [P.hip[0] - 18, g - 1.5], toe: [P.hip[0] - 18.5, g - 5.5] };
  P.legN = { hip: [P.hip[0], P.hip[1] + 1], knee: [P.hip[0] - 9.5, g - 0.5], ankle: [P.hip[0] - 19.5, g + 0.5], toe: [P.hip[0] - 20.5, g - 3] };
  P.armF = { sh: P.shF, el: [P.shF[0] - 5, P.shF[1] - 3.5], ha: [P.shF[0] - 10, P.shF[1] - 2] };
  P.armN = { sh: P.shN, el: [P.shN[0] - 5.5, P.shN[1] + 1.2], ha: [P.shN[0] - 11, P.shN[1] + 1.5] };
  return P;
}

// -- per-character battle styling and hooks

CHARS.kade.bstyle = {
  torso: (t) => (t < 0.42 ? 'main' : t < 0.5 ? 'metal' : t < 0.7 ? 'sec' : t < 0.8 ? 'lea' : 'sec'),
};
CHARS.kade.bhooks = {
  back(f, P) {
    if (P.ko) {
      lanceB(f, [4, 61], [26, 61.5], { head: 6, collar: 'acc', shaft: 'sec' });
      return;
    }
    const o = [P.hip[0] - 35, P.hip[1] - 40];
    lanceB(f, [30 + o[0], 52 + o[1]], [47 + o[0], 5 + o[1]], { shaft: 'sec', collar: 'acc' });
    // scarf tails streaming back from the neck
    const [nx, ny] = P.neck, w = P.k % 2;
    f.shape([[nx + 1, ny - 1], [nx + 5, ny], [nx + 11, ny + 3 + w], [nx + 14, ny + 7 + w], [nx + 11.5, ny + 6.4 + w], [nx + 12, ny + 9.5 + w], [nx + 6, ny + 5], [nx + 1, ny + 3]], 'acc', { ny: () => -0.2 });
    fold(f, nx + 4, ny + 2, nx + 11, ny + 6 + w, 'acc', false);
  },
  farWeapon(f, P) {
    if (P.ko) { swordB(f, [16, 62], -4, 15); return; }
    swordB(f, P.armF.ha, P.sw ?? -140, 15, { glint: P.glint });
  },
  torso(f, P) {
    if (P.ko) return;
    // breastplate highlight ridge
    const [nx, ny] = P.neck;
    f.line(nx - 2, ny + 3, nx - 2, ny + 6, 'main', 3, { on: 'main' });
  },
  skirt(f, P) {
    if (P.ko) return;
    const [hx, hy] = P.hip;
    const tm = (x, y) => (y >= hy + 2.4 ? 'metal' : 'main');
    f.shape([[hx - 5.2, hy - 1.5], [hx - 0.5, hy - 1.5], [hx - 1.2, hy + 3.6], [hx - 6.2, hy + 2.8]], tm);
    f.shape([[hx + 0.5, hy - 1.5], [hx + 5.2, hy - 1.5], [hx + 5.6, hy + 3.2], [hx + 0.8, hy + 3.8]], tm);
  },
  neck(f, P) {
    const [nx, ny] = P.neck;
    if (P.ko) { f.ball(nx + 0.5, ny, 2.0, 3.4, 'acc'); return; }
    f.ball(nx + 0.5, ny + 0.2, 4.2, 2.1, 'acc');
    f.shape([[nx - 2.5, ny + 1], [nx - 0.5, ny + 1], [nx - 1.2, ny + 6.5], [nx - 3.0, ny + 6]], 'acc');
  },
  front(f, P) {
    if (P.ko) return;
    const [sx, sy] = P.shN;
    f.ball(sx + 0.4, sy + 0.4, 3.6, 3.1, (nx, ny) => (ny > 0.5 ? 'metal' : 'main'), { spec: true });
  },
};

CHARS.nyx.bstyle = {
  torso: (t, s) => (t > 0.72 && t < 0.8 ? 'lea' : s > 0.55 && t > 0.15 && t < 0.72 ? 'acc' : 'main'),
};
CHARS.nyx.bhooks = {
  back(f, P) {
    if (P.ko) { rifleB(f, [6, 61], [33, 61.5]); return; }
    ponytail(f, P);
    if (P.rifleBack) rifleB(f, ...P.rifleBack);
  },
  farWeapon(f, P) {
    if (P.ko || P.rifleBack) return;
    if (P.rifleF) rifleB(f, ...P.rifleF);
  },
  skirt(f, P) {
    const [hx, hy] = P.hip, w = P.k % 2;
    if (P.ko) {
      f.shape([[hx + 3, hy - 3], [hx - 13, hy - 4.5], [hx - 13.5, hy + 2], [hx + 3, hy + 3]], (x) => (x < hx - 12 ? 'acc' : 'main'));
      return;
    }
    const kn = P.legN.knee;
    const pts = [[hx - 2.6, hy - 2], [hx + 4.2, hy - 2], [hx + 9 + w, hy + 12.5], [kn[0] + 3.5, hy + 15], [kn[0] - 1, hy + 14.5], [hx - 1, hy + 6]];
    f.shape(pts, (x, y) => (y >= hy + 13.2 ? 'acc' : 'main'));
    fold(f, hx + 3, hy + 2, hx + 6 + w, hy + 12, 'main');
  },
  neck(f, P) {
    const [nx, ny] = P.neck;
    if (P.ko) { f.ball(nx + 0.6, ny, 2.2, 3.6, 'main'); return; }
    f.shape([[nx - 3.4, ny - 2.6], [nx + 3.6, ny - 3.2], [nx + 4.2, ny + 1.8], [nx - 3.8, ny + 1.8]], (x, y) => (y < ny - 1.6 ? 'acc' : 'main'), { ny: () => -0.3 });
  },
  front(f, P) {
    if (P.ko) return;
    if (P.rifleN) rifleB(f, ...P.rifleN);
    if (P.knife) knifeB(f, P.armN.ha, P.knife);
    if (P.rifleN || P.knife) f.ball(P.armN.ha[0], P.armN.ha[1] + 0.4, P.B.handR, P.B.handR, 'sec');
  },
};

CHARS.orion.bstyle = {
  torso: (t, s) => (t > 0.6 && t < 0.72 ? 'acc' : s > 0.25 && t < 0.42 ? 'sec' : 'main'),
};
CHARS.orion.bhooks = {
  back(f, P) {
    if (P.ko) return;
    if (P.orbBack) f.tpl(ORB_B, Math.round(P.neck[0] + 9), Math.round(P.neck[1] - 16 + (P.ob || 0)), {});
  },
  farHand(f, P, g) {
    // brass gauntlet over the forearm + armoured fist with a violet core
    const A = P.armF;
    f.limb(A.el[0], A.el[1], A.ha[0], A.ha[1], 2.3, 2.6, 'acc', { group: g, spec: true });
    f.ball(A.ha[0], A.ha[1] + 0.3, 2.4, 2.3, 'acc', { group: g, spec: true });
    const mx = A.el[0] + (A.ha[0] - A.el[0]) * 0.5, my = A.el[1] + (A.ha[1] - A.el[1]) * 0.5;
    f.dot(Math.floor(mx), Math.floor(my), 'glow', P.charge ? 2 : 1);
    f.dot(Math.floor(mx) + 1, Math.floor(my), 'glow', 1, { only: true });
    f.dot(Math.floor(A.ha[0]), Math.floor(A.ha[1]), 'glow', 1, { only: true });
  },
  skirt(f, P) {
    const [hx, hy] = P.hip, w = P.k % 2;
    if (P.ko) {
      f.shape([[hx + 3, hy - 3.5], [hx - 17, hy - 4], [hx - 17, hy + 3], [hx + 3, hy + 3.5]], (x) => (x < hx - 16 ? 'acc' : 'main'));
      f.line(hx - 2, hy, hx - 14, hy, 'glow', 1, { only: true });
      return;
    }
    const aF = P.legF.ankle, aN = P.legN.ankle, kF = P.legF.knee;
    const pts = [[hx - 4.4, hy - 2], [hx + 4.6, hy - 2], [aN[0] + 3.5 + w, 59.5], [aN[0] - 3, 60.2], [kF[0] + 2, kF[1] + 2.5], [hx - 4.2, hy + 4]];
    f.shape(pts, (x, y) => (y >= 58.6 ? 'acc' : 'main'), { ny: (y) => (y > 55 ? 0.2 : 0) });
    fold(f, hx + 2, hy + 3, aN[0] - 1, 57, 'main');
    f.line(hx, hy + 1, kF[0] + 3, kF[1] + 1, 'glow', 1, { only: true });
    f.line(hx + 3, hy + 4, hx + 5, 57, 'glow', 1, { only: true });
    f.dot(Math.floor(hx + 5), 57, 'glow', 2, { only: true });
  },
  torso(f, P) {
    if (P.ko) return;
    const [nx, ny] = P.neck;
    f.line(nx - 1, ny + 3, P.hip[0] - 1, P.hip[1] - 4, 'glow', 1, { only: true });
  },
  front(f, P) {
    if (P.ko) return;
    if (!P.orbBack) f.tpl(ORB_B, Math.round(P.neck[0] + 9 + (P.ox || 0)), Math.round(P.neck[1] - 15 + (P.ob || 0)), {});
  },
};

CHARS.sera.bstyle = {
  torso: (t, s) => (t > 0.64 && t < 0.74 ? 'sec' : s < -0.45 && t < 0.64 ? 'sec' : 'main'),
};
CHARS.sera.bhooks = {
  back(f, P) {
    if (P.ko) lanceB(f, [6, 61.5], [40, 61], { r: 0.95, head: 7, headR: 2.2, collar: 'sec', glowMat: 'glow2', glowTone: 0 });
  },
  farWeapon(f, P) {
    if (P.ko || !P.lance) return;
    const [g, deg] = P.lance, [dx, dy] = dir(deg);
    lanceB(f, add(g, [dx, dy], -(P.lanceBack ?? 18)), add(g, [dx, dy], P.lanceFwd ?? 22), { r: 0.95, head: 7, headR: 2.2, collar: 'sec', glowMat: 'glow2', glowTone: P.bright ? 2 : 1 });
    if (P.bright) glowBurst(f, ...add(g, [dx, dy], (P.lanceFwd ?? 22) - 3), P.bright, 'glow2');
  },
  skirt(f, P) {
    const [hx, hy] = P.hip;
    if (P.ko) {
      f.shape([[hx + 2, hy - 3], [hx - 6, hy - 4], [hx - 6.5, hy + 2.5], [hx + 2, hy + 3]], (x) => (x < hx - 5 ? 'sec' : 'main'));
      return;
    }
    const tm = (x, y) => (y >= hy + 4.6 ? 'sec' : 'main');
    f.shape([[hx - 4.6, hy - 1.5], [hx + 4.4, hy - 1.5], [hx + 6.2, hy + 5.5], [hx - 6.0, hy + 5.4]], tm);
    fold(f, hx, hy + 1, hx, hy + 4, 'main', false);
  },
  torso(f, P) {
    if (P.ko) return;
    const [nx, ny] = P.neck;
    f.tpl(['.C.', 'CVC', '.C.'], Math.round(nx - 3), Math.round(ny + 3), { only: true });
  },
  neck(f, P) {
    const [nx, ny] = P.neck;
    if (P.ko) { f.ball(nx + 0.5, ny, 1.8, 3.2, 'sec'); return; }
    f.ball(nx + 0.5, ny + 0.4, 3.6, 1.8, 'sec');
  },
  front(f, P) {
    const [x, y] = P.head;
    if (P.ko) { haloRing(f, x + 8, y + 18, 5.5, 1.8, 'glow'); return; }
    haloRing(f, x + 8.5, y - 1.8 + (P.halo || 0), 6.2, 2.0);
  },
};

// -- pose tables. Every anim lists its frames; hands are offsets from the shoulders (far F / near N).

const IDLE_BOB = [0, 0, 1, 1];

const BATTLE_POSES = {
  kade: {
    idle: IDLE_BOB.map((by, k) => ({ k, by, hF: [-5.5, 8.5 - by * 0.5], hN: [2.5, 9], sw: -140 + by * 3 })),
    ready: [0, 1].map((k) => ({ k, by: k, crouch: 1.5, lean: 3, hF: [-5.5, 1.5], hN: [0.5, 8], sw: -118 })),
    attack: [
      { k: 0, bx: 2.5, lean: 0, crouch: 2, hF: [6, 7], bF: -1, hN: [-2, 7], sw: 12, fF: 28, fN: 44.5 },
      { k: 1, bx: -3, lean: 6.5, crouch: 3, hy: 1, fF: 19, fN: 42.5, hF: [-8, 2.5], hN: [4, 5], sw: 140 },
      { k: 2, bx: -4, lean: 5.5, crouch: 3.5, hy: 1, fF: 18, fN: 42.5, hF: [-6.5, 9], hN: [4, 6], sw: 112 },
      { k: 3, bx: -3, lean: 3.5, crouch: 1.5, fF: 22, fN: 43, hF: [-6.5, 6], hN: [2, 8], sw: -168 },
    ],
    cast: [
      { k: 0, lean: 2, hF: [-6, 5], hN: [2, 8], sw: -135, glowF: 1.2 },
      { k: 1, lean: 3, crouch: 1, hF: [-9, -1], bF: 1, hN: [2.5, 8], sw: -112, glowF: 2.2 },
      { k: 2, lean: 3.5, crouch: 1.5, hF: [-10, -5], bF: 1, hN: [3, 7], sw: -102, glowF: 3.4 },
    ],
    item: [
      { k: 0, lean: 3, crouch: 1, hF: [-5.5, 8.5], hN: [-1, 9.5], sw: -145 },
      { k: 1, lean: 2, hF: [-5.5, 8.5], hN: [-5, 0.5], bN: -1, sw: -145, item: true },
    ],
    hurt: [{ k: 1, bx: 3, lean: -1.5, crouch: 1.5, hy: -1, face: 'hurt', fF: 25, fN: 44, hF: [-3, 10], hN: [5, 5], sw: 118 }],
    defend: [{ k: 0, crouch: 3.5, lean: 3.5, fF: 25, fN: 44, hF: [-6.5, 2.5], hN: [-7, 1], bN: -1, sw: -96, farFront: true }],
    ko: [{ ko: true }],
    victory: [0, 1].map((k) => ({ k, by: k, lean: 1.5, hF: [-1, -11.5], bF: 1, hN: [2, 7], sw: -94, glint: k === 1 })),
  },
  nyx: {},
  orion: {},
  sera: {},
};

// NYX: rifle given as [stock, muzzle] from the near-hand grip and an angle.
function rifleFrom(grip, deg, back = 6.5, fwd = 22) {
  const d = dir(deg);
  return [add(grip, d, -back), add(grip, d, fwd)];
}
function nyxPose(spec) {
  const s = { ...spec };
  if (s.aim) {
    // both hands on the rifle: near hand on the grip, far hand on the foregrip
    const tmp = battleRig('nyx', s);
    const grip = add(tmp.shN, s.aim[0]);
    const r = rifleFrom(grip, s.aim[1]);
    s.HN = grip;
    s.HF = add(grip, dir(s.aim[1]), 9);
    s[s.under ? 'rifleF' : 'rifleN'] = [...r, { flash: s.flash }];
  }
  return s;
}
BATTLE_POSES.nyx = {
  idle: IDLE_BOB.map((by, k) => nyxPose({ k, by, lean: 2, aim: [[-1, 9], 166 - by * 2], under: false })),
  ready: [0, 1].map((k) => nyxPose({ k, by: k, lean: 3.5, hy: 1, aim: [[-3, 2.5], 180] })),
  shoot: [
    nyxPose({ k: 0, lean: 3.5, hy: 1, aim: [[-3, 2.5], 180] }),
    nyxPose({ k: 1, bx: 1, lean: 3, hy: 1, aim: [[-2.5, 2.5], 181], flash: true, face: 'blink' }),
    nyxPose({ k: 0, bx: 2, lean: 1.5, aim: [[-2, 1], -157] }),
  ],
  attack: [
    { k: 0, bx: 2, lean: 1, crouch: 1, hF: [-2, 9], hN: [4, -5], bN: 1, knife: -60, rifleF: null },
    { k: 1, bx: -7, lean: 5.5, crouch: 2.5, fF: 17, fN: 42, hF: [1, 9], hN: [-12.5, 0.5], knife: 180 },
    { k: 0, bx: -6, lean: 5, crouch: 3, fF: 17, fN: 42, hF: [1, 9], hN: [-9.5, 7.5], knife: 135 },
    { k: 1, bx: -2.5, lean: 3, crouch: 1, fF: 22, fN: 43, hF: [-1, 9], hN: [-3, 8], knife: 160 },
  ],
  cast: [
    { k: 0, lean: 2, hF: [-5, 4], hN: [1.5, 9], glowF: 1.2 },
    { k: 1, lean: 3, crouch: 1, hF: [-10, -1], bF: 1, hN: [1.5, 9], glowF: 2.2 },
    { k: 0, lean: 3.5, crouch: 1.5, hF: [-11.5, -5], bF: 1, hN: [1.5, 9], glowF: 3.4 },
  ],
  item: [
    { k: 0, lean: 3, crouch: 1, hF: [-2, 9], hN: [-1, 9.5] },
    { k: 1, lean: 2, hF: [-2, 9], hN: [-5, 0.5], item: true },
  ],
  hurt: [{ k: 1, bx: 3, lean: -1.5, crouch: 1.5, hy: -1, face: 'hurt', fF: 25, fN: 44, hF: [-4, 8], hN: [5, 5] }],
  defend: [nyxPose({ k: 0, crouch: 4, lean: 3.5, fF: 25, fN: 44, aim: [[-6, 4], -112] })],
  ko: [{ ko: true }],
  victory: [0, 1].map((k) => ({ k, by: k, lean: 1, hF: [1.5, 7], hN: [0, 1.5], bN: 1, rifleBack: [[42, 33 + k], [58, 6 + k], {}] })),
};
// NYX's rifle hangs from the far hand in the knife / cast / item / hurt poses.
for (const a of ['attack', 'cast', 'item', 'hurt']) {
  for (const s of BATTLE_POSES.nyx[a]) {
    const t = battleRig('nyx', s), h = t.armF.ha;
    s.rifleF = [add(h, dir(-75), 7), add(h, dir(105), 21), {}];
  }
}

BATTLE_POSES.orion = {
  idle: IDLE_BOB.map((by, k) => ({ k, by, lean: 2, hF: [-6, 4 - by * 0.5], bF: -1, hN: [2.5, 8.5], ob: [0, -1, -1, 0][k] - by })),
  ready: [0, 1].map((k) => ({ k, by: k, crouch: 1.5, lean: 3, hF: [-6, -1], hN: [1, 7], charge: true, ob: k ? -1 : 0, ox: -2 })),
  attack: [
    { k: 0, bx: 2, lean: 0.5, crouch: 1, hF: [3, 6], bF: -1, hN: [-3, 6], fF: 28, orbBack: true },
    { k: 1, bx: -6, lean: 5.5, crouch: 2.5, fF: 18, fN: 42, hF: [-13, 1.5], hN: [4, 6], charge: true },
    { k: 0, bx: -7, lean: 6, crouch: 3, fF: 18, fN: 42, hF: [-13, 2.5], hN: [4, 7], charge: true },
    { k: 1, bx: -3, lean: 3.5, crouch: 1.5, fF: 22, fN: 43, hF: [-7.5, 4], hN: [2, 8] },
  ],
  cast: [
    { k: 0, lean: 2, hF: [-5.5, 3], hN: [2.5, 8.5], glowF: 1.4, glowMat: 'glow', charge: true, ob: -1 },
    { k: 1, lean: 3, crouch: 1, hF: [-10, -2], bF: 1, hN: [2.5, 8.5], glowF: 2.4, glowMat: 'glow', charge: true, ob: -2 },
    { k: 0, lean: 3.5, crouch: 1.5, hF: [-11, -6], bF: 1, hN: [2.5, 8.5], glowF: 3.6, glowMat: 'glow', charge: true, ob: -3 },
  ],
  item: [
    { k: 0, lean: 3, crouch: 1, hF: [-6, 4], hN: [-1, 9.5] },
    { k: 1, lean: 2, hF: [-6, 4], hN: [-5, 0.5], item: true },
  ],
  hurt: [{ k: 1, bx: 3, lean: -1.5, crouch: 1.5, hy: -1, face: 'hurt', fF: 25, fN: 44, hF: [-4, 9], hN: [5, 5], ob: -3, ox: 3 }],
  defend: [{ k: 0, crouch: 3.5, lean: 3.5, fF: 25, fN: 44, hF: [-4.5, -3], bF: 1, hN: [-4, 4], charge: true }],
  ko: [{ ko: true }],
  victory: [0, 1].map((k) => ({ k, by: k, lean: 1.5, hF: [-2, -11.5], bF: 1, hN: [2.5, 7], charge: true, ob: -2 - k })),
};

BATTLE_POSES.sera = {
  idle: IDLE_BOB.map((by, k) => ({ k, by, lean: 2, hF: [-5, 6], hN: [2, 8], lance: [null, -95], halo: [0, 0, -1, -1][k] })),
  ready: [0, 1].map((k) => ({ k, by: k, crouch: 1.5, lean: 3, hF: [-5, 3], hN: [-9, 7], bN: -1, lance: [null, -148], halo: -k })),
  attack: [
    { k: 0, bx: 2, lean: 0.5, crouch: 1, hF: [1.5, 5], hN: [6, 6], lance: [null, 180], lanceBack: 24, lanceFwd: 16, fF: 28 },
    { k: 1, bx: -5, lean: 5.5, crouch: 2.5, fF: 18, fN: 42.5, hF: [-9.5, 3], hN: [-2, 4.5], lance: [null, 180], lanceBack: 27, lanceFwd: 11, bright: 1.2 },
    { k: 0, bx: -5, lean: 5.5, crouch: 3, fF: 18, fN: 42.5, hF: [-9, 4], hN: [-2, 5.5], lance: [null, 178], lanceBack: 27, lanceFwd: 11 },
    { k: 1, bx: -3, lean: 3, crouch: 1.5, fF: 22, fN: 43, hF: [-6, 5], hN: [1, 7], lance: [null, -120] },
  ],
  cast: [
    { k: 0, lean: 2, hF: [-5, 3], hN: [-4, 4], lance: [null, -93], glowN: 1.2, glowMat: 'glow' },
    { k: 1, lean: 3, crouch: 1, hF: [-4.5, -1], hN: [-10, -1], bN: 1, lance: [null, -92], glowN: 2.2, glowMat: 'glow', bright: 1.5, halo: -1 },
    { k: 0, lean: 3.5, crouch: 1.5, hF: [-4, -3], hN: [-12, -4], bN: 1, lance: [null, -91], glowN: 3.2, glowMat: 'glow', bright: 2.4, halo: -2 },
  ],
  item: [
    { k: 0, lean: 3, crouch: 1, hF: [-5, 6], hN: [-1, 9], lance: [null, -95] },
    { k: 1, lean: 2, hF: [-5, 6], hN: [-5, 0.5], lance: [null, -95], item: true },
  ],
  hurt: [{ k: 1, bx: 3, lean: -1.5, crouch: 1.5, hy: -1, face: 'hurt', fF: 25, fN: 44, hF: [-4, 8], hN: [5, 5], lance: [null, -60], halo: 1 }],
  defend: [{ k: 0, crouch: 3.5, lean: 3.5, fF: 25, fN: 44, hF: [-5, 2], hN: [-11, 4], lance: [null, -160], lanceBack: 14, lanceFwd: 20, farFront: true }],
  ko: [{ ko: true }],
  victory: [0, 1].map((k) => ({ k, by: k, lean: 1, hF: [-3, -9.5], bF: 1, hN: [2, 7], lance: [null, -62], lanceBack: 20, lanceFwd: 17, bright: 1 + k * 0.6, halo: -1 - k })),
};
// SERA's lance grip follows the far hand.
for (const a of Object.keys(BATTLE_POSES.sera)) {
  for (const s of BATTLE_POSES.sera[a]) {
    if (!s.lance) continue;
    s.lance[0] = battleRig('sera', s).armF.ha;
  }
}

const BATTLE_ANIMS_ORDER = [
  ['idle', 5, true], ['ready', 4, true], ['attack', 10, false], ['shoot', 10, false], ['cast', 7, false],
  ['item', 5, false], ['hurt', 1, false], ['defend', 1, true], ['ko', 1, false], ['victory', 3, true],
];

export function buildBattleSprite(id) {
  return cached(`battle:${id}`, () => {
    charDef(id);
    const table = BATTLE_POSES[id];
    const frames = [], anims = {};
    for (const [name, fps, loop] of BATTLE_ANIMS_ORDER) {
      const list = table[name];
      if (!list) continue;
      const idx = [];
      for (const spec of list) { idx.push(frames.length); frames.push(drawBattleFrame(id, spec)); }
      anims[name] = { frames: idx, fps, loop };
    }
    // Melee characters reuse their attack swing for the 'shoot' cue.
    if (!anims.shoot) anims.shoot = { frames: anims.attack.frames.slice(0, 3), fps: 10, loop: false };
    return buildSheet(frames, 8, anims, 'left');
  });
}

// ---------------------------------------------------------------- portraits (40x40 bust, facing right)

// Portrait face looking right (24 wide): brows in the hair's deep tone, 3px near eye with iris + catch-light,
// foreshortened far eye, nose shadow, mouth, lit near cheek and the ear at the back.
const FACE_P = [
  '........................',
  '........................',
  '........eeeeeee.........',
  '.....eeeeeeeeeeeee......',
  '....eeeeeeeeeeeeeeee....',
  '...eeeeeeeeeeeeeeeeee...',
  '...eeeeeeeeeeeeeeeeeee..',
  '...eeeeeeeeeeeeeeeeeee..',
  '...eeeeeeeeeeeeeeeeeee..',
  '...eeeeaaaaaeeeaaaaeee..',
  '...eeeeeeeeeeeeeeeeeee..',
  '..weeeeeiiieeeeeiieeee..',
  '.wqweeeeiopeeeeeioeeee..',
  '.wqweeeeiooeeeeeioeeew..',
  '.wqwerreeeeeeeeeeeeewe..',
  '.wqwerreeeeeeeeeeeewwer.',
  '..wweeeeeeeeeeeeeeewwe..',
  '...weeeeeeeeeeeeeeeeee..',
  '....weeeeeeeeeewqqqee...',
  '.....wweeeeeeeeeeeee....',
  '.......wweeeeeeeeeew....',
  '.........wwwwwwwwww.....',
];

// Battle hair locks are mirrored and scaled 1.5x into the portrait; the key light re-shades them, so the
// lighting stays upper-left even though the head now faces right.
const PS = 1.5, POX = 8, POY = 4, FACE_PX = 11, FACE_PY = 6;
const pT = (u, v) => [POX + (16 - u) * PS, POY + v * PS];
const pTi = (px, py) => [16 - (px - POX) / PS, (py - POY) / PS];

const PORTRAIT = {
  kade: {
    bust(f) {
      f.ball(21, 44, 16.5, 10.5, 'main');
      f.ball(33, 38, 5.5, 4.5, (nx, ny) => (ny > 0.45 ? 'metal' : 'main'), { spec: true });
      f.ball(9, 37, 7, 5.5, (nx, ny) => (ny > 0.5 ? 'metal' : 'main'), { spec: true });
    },
    collar(f) {
      f.ball(22.5, 31.5, 8.6, 3.8, 'acc');
      f.shape([[14.5, 32], [19, 32], [18.4, 40], [14, 40]], 'acc');
      fold(f, 16, 34, 16, 39, 'acc', false);
    },
    over: [[FACE_PX, FACE_PY + 10, [
      '..nnnnnnnnnnnnnnnnnnnn..',
      '.nyyyuuyyyyyyyyuyyyyyyn.',
      '.nttttttttttttttttttttn.',
      '..mmmmmmmmmmmmmmmmmmmm..',
    ]]],
  },
  nyx: {
    behind(f) {
      const g = f.group();
      for (const [ax, ay, bx, by, ra, rb] of PONYTAIL) {
        const a = pT(ax, ay), b = pT(bx, by);
        f.limb(a[0], a[1], b[0], b[1], ra * PS, rb * PS, 'hair', { group: g, spec: true });
      }
      const c = pT(13, 3.4);
      f.ball(c[0], c[1], 2.2, 2.4, 'metal', { group: g, spec: true });
    },
    bust(f) {
      f.ball(21, 44, 16, 10.5, (nx) => (nx > 0.05 && nx < 0.18 ? 'acc' : 'main'));
    },
    collar(f) {
      f.shape([[13.5, 26.5], [29.5, 25.5], [31.5, 34], [12.5, 34]], (x, y) => (y < 28 ? 'acc' : 'main'), { ny: () => -0.3 });
      f.line(23, 29, 23, 33, 'acc', 2, { on: 'main' });
    },
    over: [[FACE_PX, FACE_PY + 10, [
      '...............nn.......',
      '..............nuuy......',
      '..............nyuy......',
      '..............nyyy......',
      '...............nn.......',
    ]]],
  },
  orion: {
    bust(f) {
      f.ball(21, 44, 16.5, 10.5, 'main');
      f.shape([[16, 31], [28.5, 31], [22, 40]], 'sec');
      f.line(16, 31, 21.5, 39.5, 'acc', 3, { only: true });
      f.line(28.5, 31, 22.5, 39.5, 'acc', 2, { only: true });
      f.line(10, 36, 10, 40, 'glow', 1, { only: true });
      f.line(10, 36, 13, 33, 'glow', 1, { only: true });
      f.dot(13, 33, 'glow', 2, { only: true });
      f.line(32, 37, 32, 40, 'glow', 1, { only: true });
    },
    collar(f) {
      f.ball(22, 30.5, 7.5, 2.8, 'acc', { spec: true });
    },
    over: [[FACE_PX, FACE_PY + 5, [
      '.......XXXX.....XXX.....',
      '..nnnnXNBMXnnnnXNBXn....',
      '..mmmmXMMMXmmmmXMMXm....',
      '.......XXXX.....XXX.....',
    ]]],
  },
  sera: {
    bust(f) {
      f.ball(21, 44, 15, 10, 'main');
      f.ball(9.5, 38, 5, 4, 'sec');
      f.tpl(['.C.', 'CVC', '.C.'], 15, 36, { only: true });
    },
    collar(f) {
      f.ball(21.5, 31, 6.5, 2.6, 'sec', { spec: true });
    },
    after(f) {
      haloRing(f, 21, 3.4, 10.5, 2.6);
    },
    over: [],
  },
};

// Portrait expressions (TECH_PLAN 3.6): edits of FACE_P as [row, col, chars] ('.' keeps a pixel).
// Rows: 8-9 brows, 10-13 eyes (near eye cols 8-10, far eye cols 16-17), 17-19 mouth (cols 15-19).
const EXPRESSION_EDITS = {
  neutral: [],
  smile: [
    [11, 8, 'eie'], [12, 8, 'iei'], [13, 8, 'eee'],   // eyes closed in happy arcs
    [11, 16, 'ei'], [12, 16, 'ie'], [13, 16, 'ee'],
    [17, 15, 'q...q'], [18, 15, 'eqqqe'],             // the corners turn up
  ],
  sad: [
    [9, 9, 'eee'], [8, 9, 'aaa'], [9, 15, 'ee'], [8, 15, 'aa'],     // inner brow ends rise
    [12, 8, 'iii'], [12, 16, 'ii'],                   // heavy lids, the gaze drops
    [18, 15, 'eqqqe'], [19, 15, 'q...q'],             // the corners turn down
  ],
  determined: [
    [9, 7, 'ee'], [8, 7, 'aa'], [9, 11, 'e'], [10, 11, 'a'],         // brows drawn down to the nose
    [9, 15, 'e'], [10, 15, 'a'], [9, 17, 'ee'], [8, 17, 'aa'],
    [13, 8, 'eee'], [13, 16, 'ee'],                   // narrowed eyes
    [18, 15, 'qqqqq'],                                // a firm, wider line
  ],
  surprised: [
    [9, 7, 'eeeee'], [8, 7, 'aaaaa'], [9, 15, 'eeee'], [8, 15, 'aaaa'],   // brows up
    [10, 8, 'iii'], [11, 8, 'ipo'], [10, 16, 'ii'], [11, 16, 'ip'],         // eyes wide open
    [17, 16, 'qq'], [18, 15, 'qllq'], [19, 16, 'qq'],                       // an open mouth
  ],
};
// visors and lenses take part: dimmer when sad, brighter when determined
const EXPRESSION_GLOW = { sad: { u: 'y', y: 't' }, determined: { t: 'y', y: 'u' } };

/** FACE_P with an expression's edits applied (custom edits from the CharDef win). */
function faceFor(expr, custom) {
  const edits = (custom && custom[expr]) || EXPRESSION_EDITS[expr] || [];
  if (!edits.length) return FACE_P;
  const rows = FACE_P.map((r) => r.split(''));
  for (const [y, x, str] of edits) [...str].forEach((c, k) => { if (c !== '.') rows[y][x + k] = c; });
  return rows.map((r) => r.join(''));
}

// A plain bust for registered characters without their own portrait parts.
const GENERIC_PORTRAIT = {
  bust(f) { f.ball(21, 44, 16, 10.5, 'main'); },
  collar(f) { f.ball(22, 31, 7.2, 2.6, 'sec', { spec: true }); },
  over: [],
};

function charPortrait(ch, expr) {
  const D = PORTRAIT[ch.id] || ch.portrait || GENERIC_PORTRAIT;
  const f = new Frame(40, 40, ch.pal);
  D.behind?.(f);
  D.bust(f);
  f.limb(21.5, 26, 21, 33, 3.4, 3.6, 'skin', { sep: false });
  D.collar(f);
  f.tpl(faceFor(expr, ch.expressions), FACE_PX, FACE_PY, { sep: true });
  const line = HAIRLINE[ch.id] ?? ch.hairline ?? 6.4;
  const locks = HAIR_LOCKS[ch.id] || ch.hairLocks || HAIR_LOCKS.orion;
  lockHair(f, locks, pT, (px, py) => { const [u, v] = pTi(px, py); return u < 10.6 && v > line; }, PS);
  for (const [x, y, rows] of D.over || []) f.tpl(rows, x, y, { map: EXPRESSION_GLOW[expr] });
  D.after?.(f);
  return f;
}

// BOLT's dialog portrait: the round shell fills the frame, big eye glancing right.
// Eye variants: neutral, happy (a smiling arc), worried (small pupil, tilted lid, a sweat drop),
// determined (a flat lid across the top, the pupil wide).
function boltPortrait(expr) {
  const f = new Frame(40, 40, NPC_PAL.bolt);
  f.line(25, 10, 28, 3, 'metal', 3);
  f.dot(28, 2, 'glow2', 2);
  f.dot(29, 2, 'glow2', 1);
  f.ball(19.5, 26, 15.5, 14.5, (nx, ny) => (ny > 0.15 && ny < 0.45 ? 'acc' : 'main'), { spec: true });
  f.line(5, 31, 34, 31, 'acc', 0, { on: 'acc' });
  f.ball(23, 22, 8.4, 8.2, 'metal', { spec: true });
  const socket = (px, py) => ((px - 23) / 8.4) ** 2 + ((py - 22) / 8.2) ** 2 > 1;
  if (expr === 'happy') {
    // the eye closes into a bright upward arc
    const gi = f.mat('glow');
    f.begin();
    for (let y = 14; y < 26; y++) for (let x = 15; x < 33; x++) {
      const d = Math.hypot(x + 0.5 - 23.6, (y + 0.5 - 24.5) * 1.15);
      if (d > 4.2 && d < 6.6 && y + 0.5 < 24) f.put(x, y, gi, d < 5.4 ? 2 : 1);
    }
    f.end(false);
    f.tpl(['XC', 'ZX'], 8, 26, {});
    f.tpl(['XC', 'ZX'], 32, 26, {});
  } else if (expr === 'worried') {
    f.ball(23.6, 22.8, 5.8, 5.8, 'glow');
    f.ball(22.6, 24.6, 1.8, 1.8, 'metal');
    f.dot(22, 23, 'glow', 2);
    // the lid droops on the outer side
    f.shape([[13, 11], [33, 15.6], [33, 19.2], [13, 14.8]], 'metal', { sep: false, clip: socket });
    f.tpl(['.u.', 'uyu', 'uyu', '.u.'], 7, 12, {});   // sweat drop
  } else if (expr === 'determined') {
    f.ball(23.6, 22, 6.2, 6.2, 'glow');
    f.ball(24.2, 22.6, 3.4, 3.4, 'metal');
    f.dot(24, 22, 'glow', 2);
    f.shape([[13, 12], [33, 12], [33, 18.4], [13, 18.4]], 'metal', { sep: false, clip: socket });   // a flat, focused lid
    f.line(16, 19, 30, 19, 'glow', 2, { on: 'glow' });
  } else {
    f.ball(23.6, 22, 6.2, 6.2, 'glow');
    f.ball(24.6, 22, 2.8, 2.8, 'metal');
    f.dot(25, 22, 'glow', 2);
    f.tpl(['uu', 'u.'], 20, 18, {});
  }
  f.ball(4, 36, 2.6, 2.4, 'acc', { spec: true });
  return f;
}

// HALCYON's dialog portrait in the hologram's single cyan ramp. Variants: neutral, calm (eyes
// closed, a faint smile) and flicker (broken scanlines and torn rows: the fragmented self).
const HOLO_LOCKS = [
  ['ball', 11.6, 9, 4.6, 5.4],
  ['ball', 8.5, 6, 7.4, 5.2],
  [12.6, 8, 14.6, 20, 3.0, 1.6],
  [2.0, 6, 1.0, 17, 1.8, 1.2],
  [7.6, 3, 4.0, 6.4, 2.0, 1.0],
  [9.4, 3.2, 11.6, 6.4, 2.0, 1.0],
];
const HOLO_CALM = [[11, 8, 'eee'], [12, 8, 'eie'], [13, 8, 'iei'], [11, 16, 'ee'], [12, 16, 'ii'], [13, 16, 'ee'], [17, 15, 'w...w'], [18, 15, 'eqqqe']];

function holoPortrait(expr) {
  const f = new Frame(40, 40, NPC_PAL.holo);
  f.ball(21, 44, 14.5, 10, 'main');
  f.limb(21.5, 26, 21, 33, 3.2, 3.4, 'skin', { sep: false });
  f.ball(21.5, 31.5, 6.4, 2.4, 'acc', { spec: true });
  f.tpl(['.yu.', 'uyyu', '.uy.'], 19, 36, { only: true });
  f.tpl(faceFor(expr === 'calm' ? 'calm' : 'neutral', { calm: HOLO_CALM }), FACE_PX, FACE_PY, { sep: true });
  lockHair(f, HOLO_LOCKS, pT, (px, py) => { const [u, v] = pTi(px, py); return u < 10.6 && v > 6.4; }, PS);
  f.line(12, 10, 31, 10, 'glow', 1, { on: 'hair' });
  return f;
}

/** Tear a rendered portrait: drop scanlines and shift a few rows (HALCYON's flicker). */
function tear(p) {
  const out = p.clone();
  const shifts = { 9: 2, 10: 2, 17: -2, 25: 3, 26: 3, 27: 1 };
  for (let y = 0; y < out.h; y++) {
    const dx = shifts[y] || 0;
    for (let x = 0; x < out.w; x++) {
      const c = p.get(x - dx, y);
      out.set(x, y, y % 5 === 3 || (y > 32 && y % 3 === 0) ? null : c[3] ? c : null);
    }
  }
  for (const [x, y] of [[6, 14], [7, 14], [33, 22], [34, 22], [12, 30], [29, 8]]) out.set(x, y, '#c8f3ff');
  return out;
}

const EXPR_ALIAS = {
  bolt: { smile: 'happy', sad: 'worried', surprised: 'worried' },
  holo: { smile: 'calm', sad: 'calm', determined: 'neutral', surprised: 'flicker' },
};
const NPC_EXPRESSIONS = { bolt: ['neutral', 'happy', 'worried', 'determined'], holo: ['neutral', 'calm', 'flicker'] };

/**
 * True when portrait `id` draws `want` itself: EXPRESSIONS (BOLT's and HALCYON's own sets with their
 * aliases) or a registered character's own `expressions`. Never warns or records missingArt, so
 * prewarm can ask before painting (content/prewarm.js).
 */
export function hasExpression(id, want) {
  const pid = NPC_ALIAS[id] || id;
  const known = NPC_EXPRESSIONS[pid] || EXPRESSIONS;
  const expr = (EXPR_ALIAS[pid] && EXPR_ALIAS[pid][want]) || want;
  if (known.includes(expr)) return true;
  const custom = resolveChar(pid);
  return !!(custom && custom.expressions && custom.expressions[expr]);
}

/** 'sera:sad' -> ['sera', 'sad']; unknown expressions fall back to neutral with one warning. */
function parsePortraitId(spec) {
  const [raw, want = 'neutral'] = String(spec).split(':');
  const id = NPC_ALIAS[raw] || raw;
  const known = NPC_EXPRESSIONS[id] || EXPRESSIONS;
  let expr = (EXPR_ALIAS[id] && EXPR_ALIAS[id][want]) || want;
  if (!known.includes(expr)) {
    const custom = resolveChar(id);
    if (!(custom && custom.expressions && custom.expressions[expr])) {
      if (noteMissingArt('expression', `${id}:${want}`)) console.warn(`characters: unknown expression "${want}" for "${id}" (neutral)`);
      expr = 'neutral';
    }
  }
  return [id, expr];
}

function portraitCanvas(spec) {
  const [id, expr] = parsePortraitId(spec);
  return cached(`portrait:${id}:${expr}`, () => {
    if (id === 'bolt') return boltPortrait(expr).render().canvas;
    if (id === 'holo') {
      const p = holoPortrait(expr).render();
      return (expr === 'flicker' ? tear(p) : p).canvas;
    }
    const ch = resolveChar(id) || missingChar(id);
    if (ch.custom) {
      const img = ch.custom.portrait(expr);
      return img instanceof Painter ? img.canvas : img;
    }
    return charPortrait(ch, expr).render().canvas;
  });
}

/**
 * 40x40 bust facing right for a party id, a registered character, 'bolt' or 'holo' / 'halcyon'.
 * The id may carry an expression: 'sera:sad' (EXPRESSIONS; BOLT: happy, worried, determined;
 * HALCYON: calm, flicker). Shared cached canvas: do not draw on it.
 */
export function buildPortrait(id) {
  return portraitCanvas(id);
}

/** Cached PNG data URL of a portrait upscaled with nearest-neighbour, for <img> / CSS / dialog boxes. */
export function portraitURL(id, scale = 2) {
  const [base, expr] = parsePortraitId(id);
  return cached(`portraitURL:${base}:${expr}:${scale}`, () => {
    const src = portraitCanvas(`${base}:${expr}`);
    const c = makeCanvas(src.width * scale, src.height * scale);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL ? c.toDataURL('image/png') : '';
  });
}

// ---------------------------------------------------------------- NPCs (field layout, 32x48)

const NPC_DEFS = {
  // BOLT: friendly maintenance robot, off-white shell with amber hazard band, big cyan eye, hover thruster.
  bolt: {
    main: ['#55525e', '#8f8a96', '#c9c3c8', '#ece6e2', '#ffffff'],
    acc: ['#6f350f', '#b25a17', '#e8892a', '#ffb54a'],
    metal: ['#171b26', '#2a3142', '#46506a', '#6f7c97', '#aab6cc'],
    glow: ['#29b6e8', '#7ff4ff', '#e8fdff'],
    glow2: ['#e8892a', '#ffc35a', '#fff0c4'],
    ink: [OUTLINE, OUTLINE_SOFT],
  },
  // HALCYON: the ship's AI as a humanoid hologram, one cyan ramp (the engine adds the hologram material).
  holo: {
    skin: ['#2a9fd8', '#62cdf6', '#a6e9ff', '#dcf8ff'],
    hair: ['#062b46', '#0c4670', '#14679e', '#2a91cc', '#62c4f0'],
    main: ['#08304a', '#0e4e78', '#1679b0', '#2ea8e0', '#7fdcff'],
    sec: ['#062438', '#0b3b5c', '#11598a', '#1e7fb8'],
    acc: ['#1479b0', '#29a9e0', '#6fd6ff', '#c8f3ff'],
    metal: ['#0d4f78', '#1479b0', '#29a9e0', '#6fd6ff', '#c8f3ff'],
    glow: ['#6fd6ff', '#c8f3ff', '#ffffff'],
    eye: ['#08304a', '#c8f3ff', '#ffffff'],
    ink: [OUTLINE, OUTLINE_SOFT],
  },
};
const NPC_PAL = Object.fromEntries(Object.entries(NPC_DEFS).map(([k, m]) => [k, makePal(m)]));

function drawBoltFrame(view, kind, i, blink) {
  const f = fieldFrame(NPC_PAL.bolt);
  const walk = kind === 'walk';
  const bob = walk ? [0, -1, -1, 0][i] : i === 1 ? -1 : 0;
  const flame = walk ? [4, 5, 4, 3][i] : i === 1 ? 2 : 3;
  const side = view === 'side', back = view === 'up';
  const cx = 16, cy = 31 + bob, lean = side && walk ? 1 : 0;
  // hover thruster flame
  const fy = cy + 8.5;
  for (let k = 0; k < flame; k++) {
    const w = k < 1 ? 2 : k < flame - 1 ? 1 : 0;
    for (let x = -w; x <= w - (w ? 1 : 0); x++) f.dot(cx + x, fy + 1 + k, 'glow', k === 0 ? 2 : k < flame - 1 ? 1 : 0);
  }
  f.limb(cx - 0.5, cy + 6.2, cx - 0.5, cy + 8.0, 2.6, 2.1, 'metal');
  // antenna
  const ax = side ? cx - 1 - lean : cx + 1, ay = cy - 7;
  f.line(ax, ay, ax + (side ? -2 - lean : 2), ay - 5, 'metal', 3);
  f.dot(ax + (side ? -2 - lean : 2), ay - 6, 'glow2', back ? 1 : 2);
  // far arm (side view)
  if (side) {
    const g = f.group();
    f.limb(cx - 2, cy + 2.5, cx - 4, cy + 5.4, 1.2, 1.1, 'metal', { group: g, dim: 1 });
    f.ball(cx - 4.4, cy + 6, 1.5, 1.4, 'acc', { group: g, dim: 1 });
  }
  // shell with an amber hazard band
  const band = (nx, ny) => (ny > 0.05 && ny < 0.42 ? 'acc' : 'main');
  f.ball(cx, cy, side ? 7.4 : 8.0, 7.5, band, { spec: true });
  if (!back && !side) f.line(cx - 6, cy + 2, cx + 5, cy + 2, 'acc', 0, { on: 'acc' });
  // eye
  if (back) {
    f.tpl(['mnnnm', 'nMMMn', 'nMNMn', 'mnnnm'], cx - 3, cy - 3, { only: true });
  } else {
    const ex = side ? cx + 4.4 : cx, ey = cy - 1.5;
    f.ball(ex, ey, side ? 2.8 : 4.1, 4.1, 'metal');
    if (blink) f.line(ex - (side ? 1 : 2), ey, ex + (side ? 1 : 2), ey, 'glow', 0);
    else {
      f.ball(ex, ey, side ? 1.8 : 3.0, 3.0, 'glow');
      f.dot(Math.floor(ex), Math.floor(ey), 'glow', 2);
      f.dot(Math.floor(ex) - 1, Math.floor(ey) - 1, 'glow', 2);
      f.dot(Math.floor(ex) + (side ? 0 : 1), Math.floor(ey) + 1, 'glow', 0);
    }
  }
  // near arms
  const arms = side ? [[1, 0]] : [[-1, 0], [1, 0]];
  for (const [s] of arms) {
    const g = f.group();
    const swing = walk ? [0, 1, 0, -1][i] * s * 0.6 : 0;
    const sx = side ? cx + 1 : cx + s * 7.2, sy = cy + 2.5;
    const hx = side ? cx + 3 + swing : cx + s * 8.4, hy = cy + 5.4 + swing;
    f.limb(sx, sy, hx, hy, 1.2, 1.1, 'metal', { group: g });
    f.ball(hx + (side ? 0.4 : s * 0.4), hy + 0.7, 1.5, 1.4, 'acc', { group: g, spec: true });
  }
  return f;
}

// HALCYON hologram: long-haired figure in a floor-length gown, hands folded, a glowing core on the chest.
const HOLO_BUILD = { headY: 3, shY: 18.5, hipY: 30, armX: 5.5 };

function drawHoloFrame(view, kind, i, blink) {
  const f = fieldFrame(NPC_PAL.holo);
  const walk = kind === 'walk';
  const bob = walk ? [0, 1, 0, 1][i] : i === 1 ? 1 : 0;
  const sway = walk ? [1, 0, -1, 0][i] : 0;
  const B = HOLO_BUILD, cx = 16, headY = B.headY + bob, sh = B.shY + bob, hip = B.hipY + bob;
  const side = view === 'side', back = view === 'up';
  // long hair falling behind the shoulders
  const hg = f.group();
  if (side) f.limb(cx - 3, headY + 6, cx - 4.5 - sway * 0.5, headY + 25, 3.6, 1.8, 'hair', { group: hg, spec: true });
  else if (!back) {
    f.limb(cx - 4.5, headY + 6, cx - 7 + sway * 0.4, headY + 22, 3.0, 1.6, 'hair', { group: hg, spec: true });
    f.limb(cx + 4.5, headY + 6, cx + 7 + sway * 0.4, headY + 22, 3.0, 1.6, 'hair', { group: hg, spec: true });
  }
  // floor-length gown flaring from the waist, the hem fraying into scanlines
  const hem = 45.5;
  const gown = side
    ? [[cx - 2.6, hip - 2], [cx + 2.8, hip - 2], [cx + 7 + sway, hem], [cx - 7.5 + sway * 0.5, hem]]
    : [[cx - 3.2, hip - 2], [cx + 3.2, hip - 2], [cx + 8.5 + sway, hem], [cx - 8.5 + sway, hem]];
  f.shape(gown, (x, y) => (y > 41 && y % 2 === 1 ? null : y > hem - 3 ? 'acc' : 'main'), { ny: (y) => (y > 40 ? 0.15 : 0) });
  fold(f, cx - 2, hip + 1, cx - 4 + sway, hem - 4, 'main');
  fold(f, cx + 2, hip + 1, cx + 4 + sway, hem - 4, 'main', !side);
  if (!side) fold(f, cx, hip + 3, cx + sway, hem - 4, 'main', false);
  const torso = side
    ? [[cx - 2.0, sh - 0.5], [cx + 2.0, sh - 0.5], [cx + 3.0, sh + 3], [cx + 2.0, sh + 9], [cx + 2.4, hip], [cx - 2.4, hip], [cx - 2.0, sh + 8], [cx - 2.6, sh + 3]]
    : [[cx - 4.0, sh - 0.5], [cx + 4.0, sh - 0.5], [cx + 3.6, sh + 4], [cx + 2.6, sh + 9], [cx + 3.0, hip], [cx - 3.0, hip], [cx - 2.6, sh + 9], [cx - 3.6, sh + 4]];
  f.shape(torso, (x, y) => (y >= hip - 3 && y < hip - 1 ? 'acc' : 'main'), { ny: (y) => (y < sh + 2 ? -0.4 : 0) });
  if (!back) f.tpl(side ? ['u', 'y'] : ['yu', 'uy'], side ? cx + 1 : cx - 1, Math.floor(sh) + 3, { only: true });
  // arms folded at the waist
  const arm = (s) => {
    const g = f.group();
    const shx = side ? cx + 0.3 : cx + s * B.armX, ha = side ? [cx + 3.2, hip - 2.5] : [cx + s * 1.2, hip - 2.5];
    const el = side ? [cx + 0.6, sh + 6] : [cx + s * 5.4, sh + 6.5];
    f.limb(shx, sh + 1, el[0], el[1], 1.4, 1.3, 'main', { group: g });
    f.limb(el[0], el[1], ha[0], ha[1], 1.3, 1.7, (t) => (t > 0.65 ? 'acc' : 'main'), { group: g });
    if (!back) f.ball(ha[0], ha[1] + 0.4, 1.3, 1.2, 'skin', { group: g });
  };
  if (side) arm(1);
  else { arm(-1); arm(1); }
  // neck, face, hair parted in the middle with long front locks
  f.limb(side ? cx + 0.5 : cx, headY + 11, side ? cx + 0.5 : cx, sh, 1.4, 1.4, 'skin', { sep: false });
  const g = f.group();
  if (view === 'down') f.tpl(FACE_DOWN, 9, headY, { group: g, map: blink ? BLINK : null, sep: true });
  if (side) f.tpl(FACE_SIDE, 9, headY, { group: g, map: blink ? BLINK : null, sep: true });
  const faceClip = back ? null : side ? (px, py) => px > cx + 1.5 && py > headY + 5.5 : (px, py) => px > cx - 4.5 && px < cx + 4.5 && py > headY + 5;
  f.ball(side ? cx - 0.5 : cx, headY + 6.5, 7, 6.2, 'hair', { spec: true, clip: faceClip });
  if (back) f.limb(cx, headY + 9, cx + sway * 0.5, headY + 27, 5.4, 2.6, 'hair', { spec: true });
  else if (side) {
    f.limb(cx + 2, headY + 2.5, cx + 5.4, headY + 6.5, 2.0, 0.6, 'hair', { spec: true });
    f.limb(cx + 0.5, headY + 6, cx + 1.5, headY + 18, 1.6, 0.8, 'hair', { spec: true });
  } else {
    f.limb(cx - 1, headY + 1.5, cx - 5.5, headY + 7, 2.2, 1.4, 'hair', { spec: true });
    f.limb(cx + 1, headY + 1.5, cx + 5.5, headY + 7, 2.2, 1.4, 'hair', { spec: true });
    f.limb(cx - 5.6, headY + 7, cx - 5 + sway * 0.3, headY + 19, 1.7, 0.8, 'hair', { spec: true });
    f.limb(cx + 5.6, headY + 7, cx + 5 + sway * 0.3, headY + 19, 1.7, 0.8, 'hair', { spec: true });
  }
  // a thin circlet of light
  f.line(side ? cx - 3 : cx - 5, headY + 2, side ? cx + 3 : cx + 5, headY + 2, 'glow', 1, { on: 'hair' });
  return f;
}

/** Field sheet for BOLT ('bolt') or HALCYON ('holo' / 'halcyon'); other ids go to buildFieldSprite. */
export function buildNpcSprite(kind) {
  const id = NPC_ALIAS[kind] || kind;
  const draw = id === 'bolt' ? drawBoltFrame : id === 'holo' ? drawHoloFrame : null;
  if (!draw) return buildFieldSprite(id);
  return cached(`npc:${id}`, () => {
    const frames = FIELD_LAYOUT.map(([v, k, i, b]) => draw(v, k, i, b));
    return buildSheet(frames, 10, FIELD_ANIMS, 'down');
  });
}
