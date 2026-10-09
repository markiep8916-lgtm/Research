// arboretum: THE GARDENER, MOTHER-7 grown into her own vines (browser, TECH_PLAN 7.6, 7.9). Painted
// with the POC enemy rig and the bestiary toolkit (prologue/enemyart.js). Faces RIGHT.
//
//   gardener        256x232 battle art: the caretaker's ceramic body risen out of a mound of roots, her
//                   tripod skirt buried in them, thick vines coiled up her column and through every
//                   joint, a domed head whose green face screen still smiles, a sun-catching crown of
//                   petals fanned behind it, pruning shears on the near arm, a watering lance on the far
//                   one, two thorned tendrils swaying behind her and a thorn whip at her shoulder.
//                     idle 4 (tendrils and vines sway, the crown breathes, pollen drifts), attack 2 (the
//                     whip drawn back, then lashed across: Thorn Lash), pollen 1 (the blooms burst gold),
//                     sow 1 (seeds flung into the beds, the roots heave), special 1 (the crown wide open,
//                     drinking the dome light: Gather Light and Photosynthesis), hurt 1, break 2 (slumped,
//                     the crown shut and drooping, the screen guttering)
//   gardener_field  160x152 field art: the same figure smaller, bent over the root mound at the Choir
//                   gate, tending. idle 4, special 1 (she turns, the crown opens), attack 1, hurt 1,
//                   break 1 (the vines falling away)

import { rng } from '../../art/painter.js';
import { rp, WHITE, DEG, clamp, GUN, STEEL, sparks, smoke, spot, polar, along, dome } from '../prologue/enemyart.js';

// ---------------------------------------------------------------- colours

const SHELL = rp('#141a16', '#232c25', '#36423a', '#4e5c50', '#6a7a6a', '#8c9c88', '#b4c2aa', '#dce6cc');
const SHELL_FAR = rp('#0c110e', '#161e18', '#222c24', '#303c32', '#425042', '#566454');
const LEAF = rp('#061409', '#0b2412', '#123a1b', '#1b5226', '#276c32', '#368a3e', '#4ea852', '#7cc870');
const LEAF_FAR = rp('#040c06', '#08180c', '#0e2614', '#14361c', '#1c4824', '#265a2c');
const VINE = rp('#0a1608', '#132a10', '#1d4018', '#2a5820', '#3a722a', '#4e8c36', '#6aa846');
const VINE_FAR = rp('#060e05', '#0c1c0a', '#142c10', '#1c3c16', '#264e1c');
const ROOT = rp('#120a06', '#22140c', '#352013', '#4a2d1a', '#623d23', '#7e522f', '#9c6b3e');
const SOIL = rp('#0a0705', '#150f0a', '#21170f', '#2e2015', '#3d2b1c', '#4e3824');
const PETAL = rp('#1a1606', '#2e2a0c', '#4a4214', '#6a5e1c', '#8e7c24', '#b49a30', '#d8bc4a', '#f4dc7a');
const PETAL_FAR = rp('#100e05', '#1e1b08', '#2e2a0c', '#423b12', '#5a5018', '#74681e');
const PINK = rp('#2a0718', '#4f0f30', '#7c1a4c', '#ae2c6c', '#da4d8e', '#f37fb2', '#ffb6d5', '#ffe2ef');
const THORN = rp('#1c0f08', '#3a2010', '#5e3a1e', '#8a5a32', '#c08a56', '#e8c08a');
const SCREEN = rp('#020a05', '#04140a', '#082010', '#0c2c16', '#123a1e');
const MOSS = rp('#0b1a06', '#14290a', '#1f3e0e', '#2c5512', '#3c6e17', '#53891f', '#71a52c');

// glow ramps, outer (dim) -> inner (hot)
const G_SUN = rp('#6a4208', '#c07a12', '#ffc23a', '#ffe68a', '#fffbe0');
const G_SUN_DIM = rp('#2a1c06', '#3e2a08', '#58400c', '#6e5212', '#86661a');
const G_BIO = rp('#0b4350', '#0f6a78', '#16a0a8', '#4dffe0', '#d9fff6');
const G_BIO_DIM = rp('#06262e', '#0a343c', '#0e4651', '#135a63', '#1f6e72');
const G_EYE = rp('#1a4a1a', '#3fae5a', '#8fe08a', '#d8ffd0', '#ffffff');
const G_EYE_DIM = rp('#081a0c', '#0e2c14', '#16401c', '#1e5424', '#286a2e');
const G_POLLEN = rp('#4a3608', '#8a6a12', '#e8c43a', '#fff07a', '#fffbe0');
const G_SAP = rp('#16380a', '#2c6a12', '#5cc22a', '#b0f56a', '#f0ffd8');
const G_PINK = rp('#4f0f30', '#a8246a', '#ff4fa0', '#ff9ccb', '#ffe6f2');

const lerp = (a, b, t) => a + (b - a) * t;
/** Per-pixel hash in [0, 1). */
const noise = (x, y) => { const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return h - Math.floor(h); };

// ---------------------------------------------------------------- organic shapes

/** Cubic spine with radius rad(t): samples carry the unit tangent (dx, dy) and normal (nx, ny). */
function spine(p0, p1, p2, p3, rad, n = 48) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push({ x: a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], y: a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1], r: rad(t), t, i });
  }
  for (let i = 0; i <= n; i++) {
    const a = out[Math.max(0, i - 1)], b = out[Math.min(n, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    out[i].dx = dx / l;
    out[i].dy = dy / l;
    out[i].nx = -dy / l;
    out[i].ny = dx / l;
  }
  return out;
}

/** A swept tube along a spine, shaded from its own normal, a darker node ring every `node` samples. */
function tube(r, S, ramp, { bias = 0, max, spec = null, node = 0, edge = 0.55 } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of S) {
    x0 = Math.min(x0, s.x - s.r); x1 = Math.max(x1, s.x + s.r);
    y0 = Math.min(y0, s.y - s.r); y1 = Math.max(y1, s.y + s.r);
  }
  const so = { max: max ?? ramp.length - 1, spec, specT: 0.975, bounce: 0.25, bias };
  const no = { ...so, bias: bias - 0.13, spec: null };
  r.begin();
  r.each(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (mx, my, X, Y) => {
    let best = 0.5, bs = null;
    for (const s of S) {
      const dx = mx - s.x, dy = my - s.y;
      if (dx > s.r + 1 || -dx > s.r + 1 || dy > s.r + 1 || -dy > s.r + 1) continue;
      const d = Math.hypot(dx, dy) - s.r;
      if (d < best) { best = d; bs = s; }
    }
    if (!bs || best > 0) return;
    const sv = clamp(((mx - bs.x) * bs.nx + (my - bs.y) * bs.ny) / bs.r, -1, 1);
    r.lightPut(X, Y, bs.nx * sv, bs.ny * sv, Math.sqrt(1 - sv * sv) + 0.05, ramp, node && bs.i % node === 0 ? no : so);
  });
  r.end(edge);
}

/** Hooked thorns along a spine between t0 and t1, alternating sides, swept back toward the root. */
function thorns(r, S, t0, t1, step, size, ramp = THORN) {
  let side = 1;
  for (let i = Math.round(t0 * (S.length - 1)); i <= t1 * (S.length - 1); i += step) {
    const s = S[i];
    const k = size * (0.6 + 0.4 * (1 - s.t));
    const b = [s.x + s.nx * s.r * side * 0.8, s.y + s.ny * s.r * side * 0.8];
    const tip = [b[0] + (s.nx * side * 0.85 - s.dx * 0.55) * k, b[1] + (s.ny * side * 0.85 - s.dy * 0.55) * k];
    const w = Math.max(1, k * 0.35);
    r.poly([[b[0] - s.dx * w, b[1] - s.dy * w], [b[0] + s.dx * w, b[1] + s.dy * w], tip], ramp, { n: [s.nx * side * 0.5, s.ny * side * 0.5 - 0.3, 0.8], max: ramp.length - 1 });
    side = -side;
  }
}

/**
 * Pointed leaf / petal from (x, y) along `ang` (degrees), folded on its midrib so one half catches the
 * key light. o: { bend (px), shape (<1 widens the base), vein (glow ramp for a lit midrib), veinK,
 * rib (ramp index of a dark midrib), max, bias, bevel }.
 */
function leaf(r, x, y, ang, len, w, ramp, o = {}) {
  const b = [x, y], t = polar(x, y, ang, len);
  const n = Math.max(4, Math.round(len / 2));
  const bend = o.bend || 0, shape = o.shape ?? 0.7;
  const L = [], R = [], M = [b];
  for (let i = 1; i < n; i++) {
    const s = i / n, c = bend * Math.sin(Math.PI * s), hw = w * Math.pow(Math.sin(Math.PI * Math.pow(s, shape)), 0.85);
    L.push(along(b, t, s, c + hw));
    R.push(along(b, t, s, c - hw));
    M.push(along(b, t, s, c));
  }
  M.push(t);
  const a = ang * DEG, px = Math.sin(a), py = -Math.cos(a);
  const base = { bevel: o.bevel ?? 0, max: o.max ?? ramp.length - 1, bias: o.bias || 0 };
  r.poly([b, ...L, t, ...[...M].reverse()], ramp, { ...base, n: [px * 0.6, py * 0.6 - 0.1, 0.8] });
  r.poly([b, ...M.slice(1), ...[...R].reverse()], ramp, { ...base, n: [-px * 0.6, -py * 0.6 - 0.1, 0.8], bias: base.bias - 0.06 });
  if (o.vein || o.rib != null) {
    const c = o.vein ? o.vein[3] : ramp[o.rib];
    for (let i = 0; i < M.length - 2; i++) {
      r.line(Math.round(M[i][0]), Math.round(M[i][1]), Math.round(M[i + 1][0]), Math.round(M[i + 1][1]), c, o.vein ? o.veinK ?? 0.6 : 0);
    }
  }
}

/** A hanging vine strand from (x, y): `len` px long, swaying with `ph`, a leaf every few px. */
function strand(r, x, y, len, ph, sway, far = false) {
  const ramp = far ? VINE_FAR : VINE;
  let px = x, py = y;
  for (let k = 1; k <= len; k++) {
    const nx = x + Math.sin(ph + k * 0.18) * sway * (k / len), ny = y + k;
    r.line(Math.round(px), Math.round(py), Math.round(nx), Math.round(ny), ramp[k < 4 ? 4 : 3]);
    if (k < len * 0.6) r.line(Math.round(px) + 1, Math.round(py), Math.round(nx) + 1, Math.round(ny), ramp[1]);
    if (k % 6 === 3) leaf(r, nx, ny, k & 8 ? 25 : 155, 5, 2.2, far ? LEAF_FAR : LEAF, { max: far ? 4 : 6 });
    px = nx; py = ny;
  }
  return [px, py];
}

/** A pink bloom: five petals round a glowing gold heart. `open` (0..1) spreads it. */
function bloom(r, cx, cy, size, open, k, rot = 0) {
  r.begin();
  for (let i = 0; i < 6; i++) {
    const a = rot + i * 60 - 90;
    leaf(r, cx, cy, a, size * (0.55 + open * 0.45), size * 0.42, PINK, { shape: 0.5, max: 7, bias: i % 2 ? -0.04 : 0.04 });
  }
  r.end(0.45);
  r.glow(cx, cy, size * 0.32 + 1, size * 0.32 + 1, k > 0.6 ? G_POLLEN : G_SUN_DIM, { k: clamp(k, 0.2, 1.4), bias: 0.3 });
}

/** Bioluminescent dot with a hot centre. */
function bio(r, x, y, rad, k, ramp = G_BIO) {
  if (rad < 1.5) {
    r.dot(Math.round(x), Math.round(y), ramp[3], k);
    return;
  }
  r.glow(x, y, rad, rad * 0.85, ramp, { k, bias: 0.3 });
}

/** A fern frond: a curling stem with alternating leaflets shrinking toward the tip. */
function fern(r, x, y, ang, len, curl, ramp = LEAF, leaflet = 5) {
  const step = 2, pts = [];
  let px = x, py = y, a = ang;
  for (let d = 0; d <= len; d += step) {
    pts.push([px, py, a]);
    px += Math.cos(a * DEG) * step;
    py += Math.sin(a * DEG) * step;
    a += curl * step * (1 + d / len);
  }
  for (let i = 1; i < pts.length; i++) {
    const [lx, ly, la] = pts[i], s = 1 - i / pts.length, sz = 1.4 + s * leaflet;
    for (const side of [-1, 1]) leaf(r, lx, ly, la + side * (60 - s * 10), sz, sz * 0.36, ramp, { max: ramp.length - 2 });
  }
  for (let i = 0; i < pts.length - 1; i++) r.line(Math.round(pts[i][0]), Math.round(pts[i][1]), Math.round(pts[i + 1][0]), Math.round(pts[i + 1][1]), ramp[3]);
}

// ---------------------------------------------------------------- her parts

/** The root mound at her base: soil heaped wide, roots arching out of it behind her. */
function moundBack(r, cx, cy, P) {
  r.begin();
  r.ball(cx, cy, 112, 20, SOIL, { flat: 0.4, max: 5, clip: (x, y) => y < cy + 12 });
  r.end(0.4);
  const R = rng(7);
  for (let k = 0; k < 6; k++) {
    const x = cx - 96 + k * 38 + R() * 10, h = 12 + R() * 12 + (P.heave || 0) * 12;
    const S = spine([x - 16, cy + 4], [x - 9, cy - h], [x + 9, cy - h * 0.8], [x + 18, cy + 2], (t) => 5 - Math.abs(t - 0.5) * 3.6, 20);
    tube(r, S, ROOT, { bias: -0.06, max: 6, node: 5 });
  }
}

/** The lip of soil in front of her, roots crawling out toward the party, fungus and ferns. */
function moundFront(r, cx, cy, P) {
  const R = rng(13);
  const glow = P.glow ?? 1;
  r.begin();
  r.each(cx - 112, cy - 4, cx + 112, cy + 20, (mx, my, X, Y) => {
    const d = Math.hypot((mx - cx) / 112, (my - cy) / 20);
    if (d > 1 || my < cy + 3 + Math.sin(mx * 0.21) * 2.5 + Math.sin(mx * 0.07) * 2) return;
    r.lightPut(X, Y, 0, -0.4, 0.9, SOIL, { max: 5, bias: noise(X, Y) < 0.2 ? 0.08 : 0 });
  });
  r.end(0.4);
  for (let k = 0; k < 5; k++) {
    const x = cx - 84 + k * 40 + R() * 8, y = cy + 7 + R() * 4, len = 28 + R() * 24, dir = k < 2 ? -1 : 1;
    const S = spine([x, y], [x + dir * len * 0.3, y - 7 - (P.heave || 0) * 9], [x + dir * len * 0.7, y + 4], [x + dir * len, y + 2], (t) => 4.2 * (1 - t) + 0.9, 18);
    tube(r, S, ROOT, { max: 6, node: 4 });
  }
  for (const [x, y, s] of [[cx - 76, cy + 4, 2.6], [cx - 56, cy + 10, 1.8], [cx + 62, cy + 7, 2.4], [cx + 82, cy + 3, 1.6], [cx - 20, cy + 13, 1.8], [cx + 30, cy + 12, 2.2], [cx + 100, cy + 6, 1.4]]) {
    bio(r, x, y, s, clamp(glow * (0.6 + 0.4 * Math.sin((P.phase || 0) + x)), 0.3, 1.2), glow > 0.5 ? G_BIO : G_BIO_DIM);
  }
  for (const [x, y, a] of [[cx - 96, cy + 3, -120], [cx + 94, cy + 2, -60], [cx - 40, cy + 12, -104], [cx + 50, cy + 12, -76]]) {
    fern(r, x, y, a + (P.sway || 0) * 4, 18, a < -90 ? 2.4 : -2.4, LEAF, 5);
  }
}

/** The crown: a fan of broad petals behind her head that opens to drink the dome light. */
function crown(r, cx, cy, P) {
  const open = P.open ?? 0.4, sun = P.sun ?? 0.3, droop = P.droop || 0;
  const spread = lerp(0.5, 1.0, open), len = lerp(34, 46, open), base = 20;
  const layers = [[0, 9, len, 11, PETAL_FAR, 5], [1, 8, len * 0.8, 10, PETAL, 7]];
  for (const [layer, n, l0, w0, ramp, max] of layers) {
    r.begin();
    for (let i = 0; i < n; i++) {
      const u = (i + (layer ? 0.5 : 0)) / (n - (layer ? 0 : 1)) - 0.5;
      let a = -90 + u * 236 * spread + (P.flare || 0) * Math.sin(i * 1.7) * 5;
      a += droop * (a < -90 ? -1 : 1) * (Math.abs(u) * 150 + 40);
      const l = l0 * (0.88 + 0.12 * Math.cos(u * 5)) * (1 - droop * 0.2);
      const p = polar(cx, cy, a, base);
      const w = w0 * (0.85 + open * 0.25), bend = Math.sin(i * 2.3 + layer) * 2.4;
      // a green petal with a gold flame inset along its length
      leaf(r, p[0], p[1], a, l, w, layer ? LEAF : LEAF_FAR, { shape: 0.6, max: layer ? 6 : 4, bevel: 1, bias: layer ? 0 : -0.04, bend });
      const q = polar(p[0], p[1], a, l * 0.22);
      leaf(r, q[0], q[1], a, l * 0.78, w * 0.66, ramp, {
        shape: 0.5, max, bias: layer ? 0.02 : -0.04, bend: bend * 0.7,
        vein: sun > 0.45 ? G_SUN : null, veinK: clamp(sun * (layer ? 0.9 : 0.5), 0.2, 1.1), rib: sun > 0.45 ? null : 2,
      });
    }
    r.end(0.5);
  }
  // in full light, rays between the petals
  if (sun > 0.55) {
    for (let i = 0; i < 12; i++) {
      const a = -90 + (i - 5.5) * 20 * spread, p0 = polar(cx, cy, a, base + 8), p1 = polar(cx, cy, a, base + len * (1.1 + (i % 3) * 0.12));
      r.beam(p0[0], p0[1], p1[0], p1[1], 1.6, 0.6, G_SUN, { fx: true, k: clamp(sun, 0.4, 1.3), bias: 0.2 });
    }
  }
  // the seed disc in the middle (mostly hidden by her head), pollen sacs round its rim
  r.begin();
  r.ball(cx, cy, 22, 20, ROOT, { max: 5 });
  r.end(0.5);
  for (let i = 0; i < 9; i++) {
    const p = polar(cx, cy, -90 + (i - 4) * 24, 19);
    r.glow(p[0], p[1], 2.6, 2.6, sun > 0.5 ? G_POLLEN : G_SUN_DIM, { k: clamp(0.5 + sun, 0.4, 1.4), bias: 0.3 });
  }
}

/** A back tendril: a thorned vine rising behind her, leaves along it, a pink bud at its tip. */
function tendril(r, pts, rad, P, far = true) {
  const S = spine(...pts, (t) => rad * (1 - t * 0.8) + 0.8, 44);
  tube(r, S, far ? VINE_FAR : VINE, { max: far ? 5 : 6, node: 6, bias: far ? -0.02 : 0 });
  thorns(r, S, 0.12, 0.92, 4, far ? 5 : 6, THORN.slice(0, far ? 5 : 6));
  for (let i = 8; i < S.length - 4; i += 9) {
    const s = S[i], side = i % 2 ? 1 : -1;
    leaf(r, s.x + s.nx * s.r * side, s.y + s.ny * s.r * side, Math.atan2(s.ny * side - s.dy * 0.4, s.nx * side - s.dx * 0.4) / DEG, 11, 4.4, far ? LEAF_FAR : LEAF, { max: far ? 4 : 6 });
  }
  const tip = S[S.length - 1], a = Math.atan2(tip.dy, tip.dx) / DEG;
  r.begin();
  leaf(r, tip.x, tip.y, a - 22, 11, 5, far ? LEAF_FAR : LEAF, { max: far ? 4 : 6 });
  leaf(r, tip.x, tip.y, a + 22, 11, 5, far ? LEAF_FAR : LEAF, { max: far ? 4 : 6 });
  leaf(r, tip.x, tip.y, a, 9, 4.4, PINK, { max: 6, shape: 0.5 });
  r.end(0.45);
  r.glow(tip.x + tip.dx * 4, tip.y + tip.dy * 4, 3, 3, (P.glow ?? 1) > 0.5 ? G_PINK : G_SUN_DIM, { k: clamp(P.glow ?? 1, 0.3, 1.2), bias: 0.3 });
  return S;
}

/** A spray of big leaves from (x, y) fanned around `ang` (mass and a ragged silhouette). */
function leafSpray(r, x, y, ang, n, len, P, far = false) {
  const R = rng(Math.round(x * 7 + y));
  r.begin();
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * 24 + (R() - 0.5) * 12 + (P.sway || 0) * 1.5;
    leaf(r, x, y, a, len * (0.75 + R() * 0.4), len * 0.36, far ? LEAF_FAR : LEAF, { max: far ? 5 : 7, bevel: 1, bend: (R() - 0.5) * 6, rib: far ? null : 2 });
  }
  r.end(0.5);
}

/** The head: a ceramic dome, a dark visor whose two green eyes still smile, moss, a fern, a bloom. */
function head(r, hx, hy, P) {
  const eyes = P.eyes ?? 1, gk = P.glow ?? 1;
  r.save();
  r.rotate(P.tilt || 0, hx, hy + 22);
  // neck: a ribbed steel stalk
  r.begin();
  r.seg(hx - 8, hy + 36, hx - 4, hy + 16, 8, 7, GUN, { caps: 'flat', max: 5 });
  r.end(0.5);
  for (let y = hy + 18; y < hy + 36; y += 3) r.line(hx - 14 + (y - hy) * 0.2, y, hx + 1 + (y - hy) * 0.2, y - 1, GUN[1]);
  // the dome: glazed ceramic on top, the dark housing under the visor
  const cut = (x, y) => y < hy + 11 + (x - hx) * 0.14;
  r.begin();
  r.ball(hx, hy, 30, 26, SHELL, { clip: cut, max: 7, spec: SHELL[7], specT: 0.985 });
  r.ball(hx, hy, 30, 26, GUN, { clip: (x, y) => !cut(x, y), max: 5 });
  r.end(0.6);
  r.ball(hx, hy, 30, 26, MOSS, { clip: (x, y) => y < hy - 14 + Math.sin(x * 0.5) * 3 + noise(x, y) * 4 && x < hx + 18, max: 6, spec: MOSS[6], specT: 0.98 });
  r.line(hx - 20, hy - 2, hx - 10, hy + 6, SHELL[2]).line(hx - 10, hy + 6, hx - 12, hy + 12, SHELL[2]);
  for (const [x, y] of [[hx - 24, hy + 4], [hx - 4, hy + 16], [hx + 20, hy + 14]]) r.dot(x, y, SHELL[6]);
  // the visor: dark glass across the front of the dome, scan lines, her eyes
  const V = [[hx - 2, hy - 10], [hx + 16, hy - 13], [hx + 29, hy - 6], [hx + 30, hy + 6], [hx + 16, hy + 12], [hx - 2, hy + 10]];
  r.begin();
  r.poly(V, SCREEN, { nf: dome(hx + 12, hy, 22, 16), max: 4, bevel: 1 });
  r.end(0.6);
  for (let y = hy - 8; y <= hy + 9; y += 2) r.line(hx + 1, y, hx + 27, y - 1, SCREEN[eyes > 0.3 ? 2 : 1]);
  const ek = clamp(eyes, 0.12, 1.5);
  const g = eyes > 0.45 ? G_EYE : G_EYE_DIM;
  const shape = P.eyeShape || 'smile';
  for (const [ex, ey] of [[hx + 10, hy - 1], [hx + 22, hy - 2]]) {
    r.glow(ex, ey, 7, 5, g, { k: ek * 0.5, bias: -0.6 });
    if (shape === 'smile') {
      r.line(ex - 5, ey + 2, ex - 3, ey - 1, g[3], ek).line(ex - 2, ey - 2, ex + 2, ey - 2, g[4], ek).line(ex + 3, ey - 1, ex + 5, ey + 2, g[3], ek);
      r.line(ex - 4, ey + 2, ex - 2, ey - 1, g[2], ek).line(ex + 2, ey - 1, ex + 4, ey + 2, g[2], ek);
    } else if (shape === 'wide') {
      r.glow(ex, ey - 1, 3.4, 3.4, g, { k: ek, bias: 0.5 });
    } else if (shape === 'flat') {
      r.line(ex - 4, ey - 1, ex + 4, ey - 1, g[4], ek).line(ex - 3, ey, ex + 3, ey, g[2], ek);
    } else {
      r.line(ex - 4, ey - 2, ex - 2, ey, g[3], ek).line(ex - 2, ey + 1, ex + 2, ey + 1, g[3], ek).line(ex + 2, ey, ex + 4, ey - 2, g[3], ek);
    }
  }
  // a small smile under the eyes (she was built to reassure)
  if (shape !== 'wide') r.line(hx + 14, hy + 6, hx + 19, hy + 6, g[shape === 'sad' ? 1 : 2], ek * 0.8);
  if (P.glitch) {
    r.line(hx + 1, hy + 2, hx + 28, hy + 1, WHITE, 1);
    r.line(hx + 4, hy - 5, hx + 24, hy - 6, G_EYE[2], 0.8);
  }
  // overgrowth: ferns from the crown of the dome, a bloom by the visor, vines over the glass
  fern(r, hx - 10, hy - 22, -122 + (P.sway || 0) * 3, 22, 2.2, LEAF, 5);
  fern(r, hx + 4, hy - 25, -72 + (P.sway || 0) * 3, 18, -2.6, LEAF, 4.6);
  bloom(r, hx - 18, hy - 12, 12, P.bloom ?? 0.8, gk, 10);
  for (const [x, y, len, ph] of [[hx + 6, hy - 12, 16, 0.4], [hx + 20, hy - 12, 10, 2.2], [hx - 26, hy - 2, 26, 1.2]]) {
    strand(r, x, y, Math.round(len * (P.vines ?? 1)), (P.phase || 0) + ph, 2.2);
  }
  r.restore();
}

/** Thick vine cables wound up her body: a few slow turns, the back half drawn before the body. */
function cables(r, x0, y0, x1, y1, rad, front, ph) {
  r.begin();
  for (const [turns, off, w] of [[1.3, 0, 4.2], [1.1, 2.4, 3.4], [1.6, 4.4, 2.6]]) {
    let prev = null;
    for (let i = 0; i <= 70; i++) {
      const t = i / 70, a = t * turns * Math.PI * 2 + off + ph;
      const x = lerp(x0, x1, t) + Math.sin(a) * lerp(rad, rad * 1.3, t), y = lerp(y0, y1, t) + Math.cos(a) * 4;
      if (prev && (Math.cos(a) > 0) === front) r.seg(prev[0], prev[1], x, y, w, w, front ? VINE : VINE_FAR, { max: front ? 5 : 4, bias: i % 9 === 0 ? -0.14 : -0.03 });
      prev = [x, y];
    }
  }
  r.end(0.5);
  if (!front) return;
  for (let i = 6; i < 70; i += 9) {
    const t = i / 70, a = t * 1.3 * Math.PI * 2 + ph;
    if (Math.cos(a) <= 0.25) continue;
    const x = lerp(x0, x1, t) + Math.sin(a) * lerp(rad, rad * 1.3, t), y = lerp(y0, y1, t) + Math.cos(a) * 4;
    leaf(r, x, y, i % 2 ? -28 : -152, 11, 4.4, LEAF, { max: 7, bevel: 1 });
  }
}

/** The tripod skirt as a bell of ceramic plates, its hem sunk in the roots. */
function skirt(r, cx, top, bottom, w0, w1) {
  r.begin();
  r.each(cx - w1 - 2, top, cx + w1 + 2, bottom + 4, (mx, my, X, Y) => {
    const t = (my - top) / (bottom - top);
    const w = lerp(w0, w1, Math.pow(clamp(t, 0, 1), 0.7));
    const u = (mx - cx) / w;
    const hem = bottom + Math.sin(mx * 0.35) * 2;
    if (t < 0 || Math.abs(u) > 1 || my > hem) return;
    const seam = Math.abs(((mx - cx) / w * 3.5 + 10) % 1 - 0.5) > 0.46;
    const moss = Math.sin(mx * 0.16 + 1) * Math.sin(my * 0.21) + noise(X, Y) * 0.35 > 0.55 + (1 - t) * 0.3;
    if (moss) r.lightPut(X, Y, u * 0.9, -0.35, Math.sqrt(1 - u * u) + 0.1, MOSS, { max: 5 });
    else r.lightPut(X, Y, u * 0.9, -0.35, Math.sqrt(1 - u * u) + 0.1, SHELL, { max: 6, bias: seam ? -0.16 : -0.04, spec: SHELL[7], specT: 0.99 });
  });
  r.end(0.55);
  // two plate rings and a row of vents round the bell
  for (const t of [0.34, 0.68]) {
    const y = lerp(top, bottom, t), w = lerp(w0, w1, Math.pow(t, 0.7));
    r.line(Math.round(cx - w + 2), Math.round(y + 2), Math.round(cx + w - 2), Math.round(y + 2), SHELL[2]);
    r.line(Math.round(cx - w + 3), Math.round(y + 3), Math.round(cx + w - 3), Math.round(y + 3), SHELL[5]);
  }
  for (let k = -3; k <= 3; k++) {
    const y = lerp(top, bottom, 0.5), x = cx + k * lerp(w0, w1, Math.pow(0.5, 0.7)) * 0.26;
    r.rect(Math.round(x - 1), Math.round(y - 2), 3, 5, SHELL[1]);
    r.dot(Math.round(x), Math.round(y - 2), SHELL[0]);
  }
  // roots pouring out from under the hem
  for (let k = 0; k < 6; k++) {
    const x = cx - w1 * 0.8 + k * w1 * 0.32, y = bottom - 6;
    const S = spine([x, y - 10], [x + (k - 2.5) * 2, y - 2], [x + (k - 2.5) * 5, y + 4], [x + (k - 2.5) * 8, y + 10], (t) => 3.4 - t * 2, 12);
    tube(r, S, ROOT, { max: 6, node: 4 });
  }
}

/** Pruning shears: two great blades, `open` (0..1) apart, pointing `ang` degrees. */
function shears(r, wr, ang, open, len = 54) {
  r.begin();
  for (const side of [-1, 1]) {
    const a = ang + side * open * 20;
    const tip = polar(...wr, a, len);
    r.poly([along(wr, tip, -0.14, side * 4), along(wr, tip, 0.16, side * 7.5), along(wr, tip, 0.7, side * 3.2), tip, along(wr, tip, 0.55, -side * 1.4), along(wr, tip, -0.08, -side * 2.4)],
      STEEL, { n: [0, -0.55 * side, 0.84], bevel: 1, max: 7, spec: WHITE, specT: 0.985 });
    const e0 = along(wr, tip, 0.2, -side * 0.8), e1 = along(wr, tip, 0.92, -side * 0.2);
    r.line(Math.round(e0[0]), Math.round(e0[1]), Math.round(e1[0]), Math.round(e1[1]), STEEL[7]);
  }
  r.ball(...wr, 5.4, 5.4, GUN, { max: 6, spec: GUN[7], specT: 0.94 });
  r.ball(...wr, 2.4, 2.4, THORN, { max: 5 });
  r.end(0.55);
}

/** An arm: ceramic plates over a steel bone, a ball joint at the elbow, a vine wound round it. */
function arm(r, sh, el, wr, far) {
  const ramp = far ? SHELL_FAR : SHELL, metal = far ? { max: 5, bias: -0.06 } : { max: 7 };
  r.begin();
  r.seg(...sh, ...el, far ? 8 : 11, far ? 6.5 : 8.5, ramp, { caps: 'flat', ...metal, spec: far ? null : ramp[7], specT: 0.96 });
  r.seg(...el, ...wr, far ? 5.4 : 6.6, far ? 4.6 : 5.6, GUN, { caps: 'flat', ...metal });
  r.ball(...el, far ? 7 : 8.4, far ? 7 : 8.4, GUN, { ...metal, spec: far ? null : GUN[7], specT: 0.95 });
  r.end(0.55);
  for (let k = 0; k <= 26; k++) {
    const s = k / 26, p = along(el, wr, s, Math.sin(s * 15) * (far ? 5 : 6.5));
    r.ball(p[0], p[1], 1.4, 1.4, far ? VINE_FAR : VINE, { max: Math.sin(s * 15) > 0 ? 6 : 2 });
  }
}

// ---------------------------------------------------------------- the battle art

const BASE = [116, 216];   // the mound's centre

function drawGardener(r, P) {
  const gk = P.glow ?? 1, ph = P.phase || 0, sw = P.sway || 0;
  r.translate(P.tx || 0, P.ty || 0);
  const [bx, by] = BASE;
  const body = () => r.rotate(P.lean || 0, bx, 168);
  const hx = 142 + (P.hx || 0), hy = 78 + (P.hy || 0);

  // the far tendrils behind everything, swaying
  r.save();
  body();
  const T = P.tendrils || {};
  tendril(r, [[96, 128], [56, 116 + sw], T.a || [22 + sw * 3, 74 + sw * 2], T.a3 || [44 + sw * 4, 22 + sw]], 8, P);
  tendril(r, [[98, 150], [50, 168], T.b || [8 + sw * 2, 140 - sw * 2], T.b3 || [12 - sw * 3, 92 + sw * 2]], 7, P);
  r.restore();

  moundBack(r, bx, by, P);

  r.save();
  body();
  if (P.sunbeam) {
    // motes of the dome light drifting down into the open crown
    const R = rng(P.sunbeam);
    for (let k = 0; k < 26; k++) spot(r, hx - 60 + R() * 90, 2 + R() * 60, R() < 0.3 ? 2 : 1, G_SUN, 1);
  }
  r.save();
  r.rotate(P.tilt || 0, hx, hy + 22);
  crown(r, hx - 12, hy - 6, P);
  r.restore();

  // far arm: the watering lance
  const FA = P.farArm || { el: [66, 148], wr: [58, 180], lance: [42, 202] };
  leafSpray(r, 80, 108, -150, 4, 22, P, true);
  arm(r, [84, 116], FA.el, FA.wr, true);
  r.begin();
  r.seg(...FA.wr, ...FA.lance, 3, 2.6, GUN, { caps: 'flat', max: 5, bias: -0.04 });
  r.ball(FA.lance[0], FA.lance[1], 5, 3.6, SHELL_FAR, { max: 5 });
  r.end(0.5);
  if (P.drip) for (let k = 0; k < 3; k++) r.dot(Math.round(FA.lance[0] - 2 + k * 2), Math.round(FA.lance[1] + 5 + ((P.drip + k * 3) % 8)), G_BIO[3], 0.8);
  strand(r, FA.el[0], FA.el[1] + 6, 30, ph + 0.8, 3, true);

  // the bell of her skirt (sunk in the roots, so it never leans), the column and the cables round it
  cables(r, bx + 2, by - 30, bx + 8, 112, 26, false, ph * 0.15);
  r.restore();
  skirt(r, bx, 158, by - 8, 24, 54);
  r.save();
  body();
  r.begin();
  r.seg(bx + 2, 166, bx + 6, 120, 22, 30, SHELL, { caps: 'flat', max: 7, spec: SHELL[7], specT: 0.985 });
  r.ball(bx + 6, 118, 30, 13, SHELL, { max: 7, spec: SHELL[7], specT: 0.985 });
  r.end(0.55);
  // the chest plate: a service band, panel seams, the status lamp now pulsing with sap
  r.begin();
  r.poly([[bx - 6, 128], [bx + 26, 126], [bx + 28, 150], [bx + 14, 160], [bx - 4, 156]], SHELL, { n: [0.15, -0.3, 0.94], bevel: 1, max: 7 });
  r.end(0.5);
  r.seg(bx + 2, 162, bx + 2, 166, 22, 22, SERVICE, { caps: 'flat', max: 5 });
  for (const y of [134, 146]) r.line(bx - 4, y, bx + 26, y - 1, SHELL[3]);
  r.ring(bx + 14, 140, 5, 8, GUN, { max: 5 });
  r.glow(bx + 14, 140, 5.4, 5.4, gk > 0.5 ? G_SAP : G_EYE_DIM, { k: clamp(gk * (0.7 + 0.3 * Math.sin(ph * 2)), 0.3, 1.3), bias: 0.2 });
  cables(r, bx + 2, by - 30, bx + 8, 112, 26, true, ph * 0.15);

  // pauldrons, leaf sprays and blooms grown out of them
  leafSpray(r, bx + 52, 110, -40, 4, 24, P);
  r.begin();
  r.ball(bx - 30, 112, 17, 13, SHELL_FAR, { max: 5 });
  r.ball(bx + 38, 116, 19, 15, SHELL, { max: 7, spec: SHELL[7], specT: 0.98 });
  r.end(0.55);
  r.ball(bx + 38, 116, 19, 15, MOSS, { clip: (x, y) => y < 108 + noise(x, y) * 4, max: 6 });
  bloom(r, bx - 30, 102, 13, P.bloom ?? 0.8, gk, 25);
  bloom(r, bx + 46, 106, 10, P.bloom ?? 0.8, gk, -10);

  head(r, hx, hy, P);

  // the thorn whip from her near shoulder (Thorn Lash): reared like a tail, drawn back, or lashed out
  const W = P.whip || [[bx + 44, 112], [bx + 84, 98 + sw], [bx + 104, 44 + sw], [bx + 76 + sw * 2, 30]];
  const WS = spine(...W, (t) => 8 * (1 - t * 0.85) + 0.8, 48);
  tube(r, WS, VINE, { max: 6, node: 5, spec: VINE[6] });
  thorns(r, WS, 0.08, 0.95, 3, 9);
  const wt = WS[WS.length - 1];
  r.begin();
  leaf(r, wt.x, wt.y, Math.atan2(wt.dy, wt.dx) / DEG, 14, 5, LEAF, { max: 7, vein: G_SAP, veinK: 0.7, bevel: 1 });
  r.end(0.45);
  if (P.lash) {
    // the motion of the lash: arcs of light behind the whip, torn leaves
    const R = rng(P.lash);
    for (let k = 1; k <= 3; k++) {
      for (let i = 12; i < WS.length - 1; i++) {
        const s = WS[i];
        r.dot(Math.round(s.x - s.nx * k * 5), Math.round(s.y - s.ny * k * 5 - k * 4), k === 1 ? G_SAP[3] : G_SAP[1], 0.8 / k, true);
      }
    }
    for (let k = 0; k < 7; k++) leaf(r, wt.x - 24 - R() * 50, wt.y - 18 + R() * 36, R() * 360, 6, 2.4, LEAF, { max: 6 });
    sparks(r, P.lash, wt.x - 4, wt.y, 14, 12, G_SAP);
  }

  // near arm: the shears
  const NA = P.nearArm || { el: [184, 152], wr: [206, 140], ang: -22, open: 0.3 };
  arm(r, [bx + 44, 122], NA.el, NA.wr, false);
  shears(r, NA.wr, NA.ang, NA.open);
  strand(r, NA.el[0] - 2, NA.el[1] + 6, 24, ph + 2.1, 2.6);

  // vines hanging from the yoke and the chest
  for (const [x, y, len, p] of [[bx - 12, 124, 40, 0], [bx + 24, 126, 30, 1.7], [bx + 6, 130, 48, 3.1], [bx - 26, 120, 26, 4.4], [bx + 40, 128, 22, 5.2]]) {
    strand(r, x, y, Math.round(len * (P.vines ?? 1)), ph + p, 3.4);
  }
  r.restore();

  moundFront(r, bx, by, P);

  // fx
  if (P.pollen) {
    const R = rng(P.pollen);
    for (const [cx, cy] of [[bx - 30, 102], [bx + 46, 106], [hx - 18, hy - 12], [hx - 12, hy - 52]]) {
      smoke(r, P.pollen + cx, cx + 12, cy - 6, 18, 0.35, G_POLLEN.slice(1, 4));
      r.glow(cx, cy, 4, 4, G_POLLEN, { fx: true, k: 1.2, bias: 0.2 });
      for (let k = 0; k < 16; k++) {
        const a = R() * Math.PI * 2, d = 6 + R() * 34;
        spot(r, cx + Math.cos(a) * d + d * 0.5, cy + Math.sin(a) * d * 0.7, R() < 0.3 ? 2 : 1, G_POLLEN, 1);
      }
    }
  }
  if (P.seeds) {
    for (const [x, y] of P.seeds) {
      r.glow(x, y, 3.4, 3.4, G_SAP, { k: 1.1, bias: 0.3, fx: true });
      r.dot(Math.round(x), Math.round(y), WHITE, 1, true);
    }
  }
  if (P.motes) {
    const R = rng(P.motes);
    for (let k = 0; k < 12; k++) spot(r, 24 + R() * 200, 20 + R() * 160, 1, G_POLLEN, 0.8);
  }
  if (P.fall) for (const [x, y, a] of P.fall) leaf(r, x, y, a, 9, 3.4, LEAF, { max: 6 });
  if (P.leak) {
    for (const [x, y, n] of P.leak) for (let k = 0; k < n; k++) r.dot(x, y + k, G_SAP[3 - Math.min(2, k >> 2)], 0.7);
  }
  if (P.smoke) smoke(r, P.smoke, hx + 8, hy - 24, 10, 0.55);
  if (P.spark) sparks(r, P.spark, hx + 18, hy + 4, 12, 9, G_EYE);
}

const SERVICE = rp('#0a1f17', '#0f3426', '#16503a', '#1f6e4f', '#2d8f66', '#45b083');

const IDLE = [
  { sway: 0, phase: 0, open: 0.42, sun: 0.3, hy: 0, motes: 3, bloom: 0.8 },
  { sway: 3, phase: 1.6, open: 0.47, sun: 0.36, hy: -1, hx: 1, tilt: 0.025, motes: 5, bloom: 0.85, drip: 2 },
  { sway: 6, phase: 3.2, open: 0.52, sun: 0.42, hy: -2, hx: 2, tilt: 0.04, motes: 7, bloom: 0.9 },
  { sway: 3, phase: 4.8, open: 0.47, sun: 0.36, hy: -1, hx: 1, tilt: 0.015, motes: 9, bloom: 0.85, drip: 5 },
];

const [BX, BY] = BASE;
const SLUMP = {
  tendrils: { a: [40, 160], a3: [28, 204], b: [18, 186], b3: [4, 212] },
  whip: [[BX + 50, 128], [BX + 76, 156], [BX + 92, 194], [BX + 112, 212]],
  farArm: { el: [72, 158], wr: [70, 192], lance: [58, 210] },
  nearArm: { el: [178, 170], wr: [192, 198], ang: 70, open: 0.6 },
};

export const GARDENER = {
  w: 256, h: 232,
  bevel: 4,
  draw: drawGardener,
  anims: {
    idle: { fps: 4, loop: true, poses: IDLE },
    attack: { fps: 7, loop: false, order: [0, 0, 1, 1, 1], poses: [
      { lean: -0.06, sway: -3, phase: 1, open: 0.36, sun: 0.4, eyes: 1.3, eyeShape: 'flat', hx: -3, tilt: -0.06,
        whip: [[BX + 44, 112], [BX + 66, 56], [BX + 20, 14], [BX - 34, 24]],
        nearArm: { el: [180, 146], wr: [202, 128], ang: -44, open: 0.8 } },
      { lean: 0.07, sway: 4, phase: 2.5, open: 0.4, sun: 0.4, eyes: 1.4, eyeShape: 'flat', hx: 5, tilt: 0.08, lash: 41,
        whip: [[BX + 44, 112], [BX + 92, 104], [BX + 126, 138], [254, 148]],
        nearArm: { el: [186, 160], wr: [210, 158], ang: 2, open: 0.1 } },
    ] },
    pollen: { fps: 5, loop: false, poses: [
      { lean: 0.04, sway: 1, phase: 2, open: 0.8, sun: 0.7, eyes: 1.2, eyeShape: 'smile', hx: 2, hy: 2, tilt: 0.1, pollen: 23, bloom: 1, flare: 1 },
    ] },
    sow: { fps: 5, loop: false, poses: [
      { lean: 0.08, sway: -2, phase: 3, open: 0.5, sun: 0.4, eyes: 1.2, hx: 4, hy: 6, tilt: 0.18, heave: 1,
        seeds: [[160, 190], [186, 178], [212, 192], [234, 204], [196, 210]],
        farArm: { el: [72, 152], wr: [76, 186], lance: [88, 208] },
        nearArm: { el: [178, 168], wr: [196, 190], ang: 34, open: 0.5 } },
    ] },
    special: { fps: 4, loop: false, poses: [
      { lean: -0.04, sway: 1, phase: 1, open: 1, sun: 1.3, flare: 1, eyes: 1.4, eyeShape: 'wide', hy: -2, tilt: -0.12, sunbeam: 31, bloom: 1, glow: 1.3,
        farArm: { el: [62, 98], wr: [58, 66], lance: [72, 40] },
        nearArm: { el: [176, 100], wr: [192, 74], ang: -72, open: 0.2 } },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { lean: -0.1, tx: -4, sway: -4, phase: 2, open: 0.25, sun: 0.15, eyes: 0.5, glitch: 1, eyeShape: 'flat', hx: -4, tilt: -0.16, glow: 0.6,
        fall: [[124, 36, 30], [170, 56, 140], [80, 80, 70], [200, 100, 200], [60, 40, 250]],
        nearArm: { el: [180, 162], wr: [196, 176], ang: 42, open: 0.7 } },
    ] },
    break: { fps: 3, loop: true, poses: [
      { ...SLUMP, lean: 0.1, ty: 8, sway: -6, phase: 1, open: 0.15, sun: 0.05, droop: 0.9, eyes: 0.25, eyeShape: 'sad', hx: -20, hy: 30, tilt: 0.34, glow: 0.35,
        vines: 1.3, bloom: 0.4, smoke: 7, leak: [[124, 172, 9], [108, 160, 6]] },
      { ...SLUMP, lean: 0.1, ty: 8, sway: -6, phase: 1.4, open: 0.15, sun: 0.05, droop: 0.92, eyes: 0.6, eyeShape: 'sad', hx: -20, hy: 30, tilt: 0.34, glow: 0.45,
        vines: 1.3, bloom: 0.4, smoke: 11, spark: 5, leak: [[124, 172, 12], [108, 160, 9]] },
    ] },
  },
  points: { center: [122, 140], muzzle: [226, 132], top: [128, 14], core: [130, 70] },
  icon: { x: 150, y: 80, scale: 0.32 },
  fitBox: [60, 18, 150, 204],
};

// ---------------------------------------------------------------- the field art

const FS = 0.56;   // the field figure's scale

function drawField(r, P) {
  r.translate(80 - BX * FS, 150 - (BY + 12) * FS).scale(FS);
  drawGardener(r, P);
}

export const GARDENER_FIELD = {
  w: 160, h: 152,
  bevel: 3,
  draw: drawField,
  anims: {
    idle: { fps: 3, loop: true, poses: IDLE.map((p, i) => ({ ...p, lean: 0.06, tilt: 0.16 + (p.tilt || 0), hy: 4 + (p.hy || 0), drip: i + 1,
      nearArm: { el: [180, 164], wr: [196, 182], ang: 40 + i * 4, open: 0.2 + (i % 2) * 0.3 } })) },
    special: { fps: 3, loop: false, poses: [{ ...IDLE[0], open: 0.9, sun: 0.9, eyes: 1.3, hx: 2, tilt: -0.04, flare: 1 }] },
    attack: { fps: 4, loop: false, poses: [GARDENER.anims.attack.poses[1]] },
    hurt: { fps: 4, loop: false, poses: GARDENER.anims.hurt.poses },
    break: { fps: 2, loop: true, poses: [GARDENER.anims.break.poses[0]] },
  },
  points: { center: [80, 90], muzzle: [146, 92], top: [80, 16] },
  icon: { x: 95, y: 68, scale: 0.6 },
};
