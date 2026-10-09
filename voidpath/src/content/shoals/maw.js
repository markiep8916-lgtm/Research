// shoals: THE MAW, the void leviathan of the Meridian's reactor hall (browser, TECH_PLAN 7.6, 7.9).
// Painted with the POC enemy rig and the bestiary toolkit (prologue/enemyart.js). Faces RIGHT.
//
//   maw       256x224 battle art: a colossal neck rearing out of a breach in the black ice, a coil of
//             its back arching behind, the hide void-black with violet bioluminescence, a ridge of
//             glowing ice grown along its spine, a rusted Meridian hull plate (its sodium lamp still
//             blinking) lodged in its neck, a long skull with three pale eyes and a jaw of ice teeth.
//               idle 4 (sway, breath vapour, pulsing lights), attack 2 (rear, then the Ice Breath),
//               slam 2 (the tail erupts from the ice, then falls: maw_tail_slam's `pose`), hurt 1,
//               break 2 (slumped on the ice, lights guttering), special 1 (diving into the ice)
//   maw_lurk 176x112 field art: the Maw asleep in the black-ice mound, only its skull and the ice
//             ridge above the surface. idle 4, special 1 (it rises, jaw open), attack 1, hurt 1,
//             break 1 (sinking back under)

import { rng } from '../../art/painter.js';
import { rp, WHITE, DEG, clamp, sparks, smoke, spot, polar, along, dome } from '../prologue/enemyart.js';

// ---------------------------------------------------------------- colours

const HIDE = rp('#040309', '#0a0714', '#120c22', '#1b1332', '#251b45', '#312459', '#433270', '#5e4a94');
const HIDE_FAR = rp('#020206', '#06050d', '#0b0817', '#100c22', '#17112e', '#20183c');
const BELLY = rp('#16132a', '#25203e', '#373052', '#4d456a', '#686086', '#8a83a8');
const ICE = rp('#0a2a40', '#0f4563', '#176b8c', '#2596b4', '#4fc4dc', '#93e6f2', '#d2f8fc', '#f6ffff');
const ICE_DIM = rp('#06182a', '#0a2a40', '#0f3e58', '#165670', '#1f6e88', '#3088a0');
const BLACK = rp('#03050a', '#070a12', '#0c111c', '#131a28', '#1c2638', '#2a374d', '#40506a', '#5a6c88');
const TOOTH = rp('#2c3446', '#4e5a70', '#7a8aa2', '#aab8cc', '#d6e2ee', '#f2f8ff');
const RUST = rp('#140b08', '#2a140c', '#46200f', '#6a3115', '#8f451c', '#b05e27', '#cf7d3a');
const RIME_C = rp('#1d2a40', '#2e4260', '#4a6585', '#6f8ead', '#9ab6cf', '#c4dbea');
const THROAT = rp('#05020c', '#0e0620', '#1a0b36', '#2a1250');

const G_ICE = rp('#0d4f78', '#1479b0', '#29a9e0', '#7ff4ff', '#e6fdff');
const G_ICE_DIM = rp('#06222e', '#0a3446', '#0e4a60', '#145f78', '#1d7590');
const G_VOID = rp('#3a1466', '#6b2bb0', '#a35cff', '#cf9dff', '#f3e6ff');
const G_VOID_DIM = rp('#160a28', '#24103e', '#331656', '#421c6c', '#52247e');
const G_EYE = rp('#1a5a70', '#3fb0d0', '#9ff0ff', '#e8fcff', '#ffffff');
const G_SODIUM = rp('#5a2208', '#a8460f', '#ff7a1a', '#ffb05a', '#ffe6c0');

const lerp = (a, b, t) => a + (b - a) * t;
/** Per-pixel hash in [0, 1). */
const noise = (x, y) => { const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return h - Math.floor(h); };
const HEAD = 1.3;   // the battle skull's scale (its length is 68 px at 1)

// ---------------------------------------------------------------- shared shapes

/** Cubic spine with radius rad(t): samples with unit tangent (dx, dy) and normal (nx, ny) = belly side. */
function spine(p0, p1, p2, p3, rad, n = 72) {
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

/**
 * A swept tube along a spine, shaded from its own normal: hide on the back (darker hoops of hide
 * every few samples), pale plates on the belly, rime crusted along the top when `rime` is set.
 */
function tube(r, S, { skin = HIDE, belly = BELLY, far = false, bellyFrom = 0.38, rime = false } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of S) {
    x0 = Math.min(x0, s.x - s.r); x1 = Math.max(x1, s.x + s.r);
    y0 = Math.min(y0, s.y - s.r); y1 = Math.max(y1, s.y + s.r);
  }
  const so = { max: far ? 4 : 6, spec: far ? null : skin[6], specT: 0.98, bounce: 0.3, bias: far ? -0.08 : -0.04 };
  const hoop = { ...so, bias: so.bias - 0.11, spec: null };
  const fleck = { ...so, bias: so.bias + 0.12 };
  const bo = { max: far ? 3 : 5, bounce: 0.2, bias: far ? -0.08 : 0 };
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
    const nz = Math.sqrt(1 - sv * sv) + 0.05;
    if (belly && sv > bellyFrom) r.lightPut(X, Y, bs.nx * sv, bs.ny * sv, nz, belly, bo);
    else if (rime && sv < -0.7 - Math.sin(bs.t * 23) * 0.12 && noise(X, Y) < 0.6) r.put(X, Y, RIME_C[sv < -0.9 ? 4 : noise(Y, X) < 0.5 ? 3 : 2]);
    else r.lightPut(X, Y, bs.nx * sv, bs.ny * sv, nz, skin, bs.i % 6 === 0 ? hoop : sv < 0.1 && noise(X, Y) < 0.07 ? fleck : so);
  });
  r.end(0.6);
  if (!belly) return;
  // belly plate seams
  for (let i = 4; i < S.length - 3; i += 4) {
    const s = S[i];
    const a = [s.x + s.nx * s.r * (bellyFrom + 0.06), s.y + s.ny * s.r * (bellyFrom + 0.06)], b = [s.x + s.nx * s.r * 0.97, s.y + s.ny * s.r * 0.97];
    r.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), belly[far ? 0 : 1]);
  }
}

/** Faceted glowing ice crystal from (x, y) toward `ang` degrees. */
function crystal(r, x, y, ang, len, w, k = 1, ramp = ICE) {
  const b = [x, y], tip = polar(x, y, ang, len);
  const lB = along(b, tip, 0, w), rB = along(b, tip, 0, -w);
  const lM = along(b, tip, 0.6, w * 1.05), rM = along(b, tip, 0.6, -w * 1.05);
  const mid = along(b, tip, 0, 0);
  const a = ang * DEG, px = Math.sin(a), py = -Math.cos(a);
  r.begin();
  r.poly([lB, lM, tip, mid], ramp, { n: [px * 0.75, py * 0.75, 0.66], bevel: 1, max: ramp.length - 1 });
  r.poly([mid, tip, rM, rB], ramp, { n: [-px * 0.75, -py * 0.75, 0.66], bevel: 1, max: ramp.length - 2, bias: -0.05, glow: clamp(k, 0, 1.2) * 0.25 });
  r.end(0.45);
  const r0 = along(b, tip, 0.12, 0), r1 = along(b, tip, 0.9, 0);
  r.line(Math.round(r0[0]), Math.round(r0[1]), Math.round(r1[0]), Math.round(r1[1]), ramp[ramp.length - 2]);
  if (k > 0.2) spot(r, ...along(b, tip, 0.35, 0), len > 14 ? 2 : 1, k > 0.7 ? G_ICE : G_ICE_DIM, clamp(k, 0.2, 1.3));
}

/** Ice crystals grown along a spine's back (the -normal side) between t0 and t1. */
function ridge(r, S, t0, t1, step, { scale = 1, k = 1, seed = 1, dim = false } = {}) {
  const R = rng(seed);
  for (let i = Math.round(t0 * (S.length - 1)); i <= t1 * (S.length - 1); i += step) {
    const s = S[i];
    const bx = s.x - s.nx * s.r * 0.78, by = s.y - s.ny * s.r * 0.78;
    // point away from the body, swept back toward the tail
    const ang = Math.atan2(-s.ny, -s.nx) / DEG - 28 + (R() - 0.5) * 24;
    const len = (10 + R() * 14) * scale * (0.6 + Math.sin(s.t * Math.PI) * 0.6);
    crystal(r, bx, by, ang, len, (2.6 + R() * 1.8) * scale, k * (0.6 + R() * 0.5), dim ? ICE_DIM : ICE);
    if (R() < 0.5) crystal(r, bx + s.dx * 3, by + s.dy * 3, ang + 22, len * 0.55, 1.8 * scale, k * 0.5, dim ? ICE_DIM : ICE);
  }
}

/** Bioluminescent lights along a spine (lateral line + freckles), pulsing with `pulse`. */
function lights(r, S, pulse, glow, { from = 0.1, to = 0.95, step = 5, seed = 3 } = {}) {
  const R = rng(seed);
  const g = glow > 0.55 ? G_VOID : G_VOID_DIM;
  for (let i = Math.round(from * (S.length - 1)); i <= to * (S.length - 1); i += step) {
    const s = S[i];
    const ph = 0.5 + 0.5 * Math.sin(pulse - s.t * 8);
    const k = clamp(glow * (0.35 + ph * 0.8), 0.15, 1.4);
    spot(r, s.x - s.nx * s.r * 0.05, s.y - s.ny * s.r * 0.05, s.r > 18 && ph > 0.6 ? 3 : 2, g, k);
    const off = -0.3 - R() * 0.45, along2 = (R() - 0.5) * 4;
    spot(r, s.x + s.nx * s.r * off + s.dx * along2, s.y + s.ny * s.r * off + s.dy * along2, 1, g, k * 0.7);
  }
}

// ---------------------------------------------------------------- the head

/**
 * The skull in head space: origin at the neck joint, +x along the head, drawn at `sc`. P.jaw opens
 * the lower jaw (0..1), P.eyes (0..1.4) lights the eyes, P.throat (0..1) the frost gathering inside.
 */
function head(r, hx, hy, ang, sc, P) {
  const jaw = P.jaw ?? 0.1, eyes = P.eyes ?? 1, throat = P.throat ?? 0;
  r.save();
  r.rotate(ang, hx, hy);
  r.translate(hx, hy).scale(sc).translate(-hx, -hy);
  const X = (x) => hx + x, Y = (y) => hy + y;
  const jawA = jaw * 0.62;
  // mouth interior, and the frost light gathering in the throat
  if (jaw > 0.12) {
    r.begin();
    r.poly([[X(6), Y(2)], [X(60), Y(3)], [X(58), Y(4 + jaw * 30)], [X(8), Y(10 + jaw * 8)]], THROAT, { idx: 1 });
    r.end(0.3);
    if (throat > 0) r.glow(X(22 + jaw * 6), Y(6 + jaw * 8), 14 + throat * 10, 6 + jaw * 9, throat > 0.5 ? G_ICE : G_ICE_DIM, { k: 0.6 + throat * 0.8, bias: throat * 0.5 });
    else r.glow(X(18), Y(6 + jaw * 6), 10, 4 + jaw * 5, G_VOID_DIM, { k: 0.5 });
  }
  // lower jaw: hinged under the skull, needle teeth along its rim
  r.save();
  r.rotate(jawA, X(4), Y(5));
  r.begin();
  r.poly([[X(0), Y(3)], [X(30), Y(7)], [X(56), Y(6)], [X(62), Y(9)], [X(54), Y(14)], [X(30), Y(19)], [X(6), Y(17)], [X(-4), Y(10)]], HIDE,
    { nf: dome(X(28), Y(11), 34, 9), bevel: 1, max: 6 });
  r.poly([[X(6), Y(13)], [X(36), Y(13)], [X(56), Y(11)], [X(54), Y(14)], [X(30), Y(19)], [X(6), Y(17)]], BELLY, { n: [0, 0.7, 0.7], max: 4 });
  r.end(0.55);
  for (let k = 0; k < 9; k++) {
    const tx = X(12 + k * 5.4), ty = Y(7 - (k === 8 ? 0 : 0));
    const h = 3 + (k % 3 === 1 ? 3 : 1) + (k > 5 ? -1 : 0);
    r.poly([[tx - 1.4, ty], [tx + 1.4, ty], [tx + 0.2, ty - h]], TOOTH, { n: [-0.3, -0.5, 0.8], max: 5 });
  }
  // chin barbels
  for (const [x0, len, sw] of [[40, 16, 0.9], [30, 20, 1.2], [20, 13, 0.7]]) {
    let px = X(x0), py = Y(16);
    for (let k = 1; k <= len; k++) {
      const nx = X(x0) - k * 0.9, ny = Y(16) + k * sw * 0.8 + Math.sin((P.barbel || 0) + k * 0.4) * k * 0.08;
      const tip = k >= len - 1;
      r.line(Math.round(px), Math.round(py), Math.round(nx), Math.round(ny), tip ? G_VOID[3] : HIDE[k < 5 ? 4 : 6], tip ? 0.8 * eyes : 0);
      px = nx; py = ny;
    }
  }
  r.restore();
  // upper teeth hanging from the skull's rim
  for (let k = 0; k < 10; k++) {
    const tx = X(10 + k * 5.2), ty = Y(3.4 - k * 0.1);
    const h = (k % 3 === 0 ? 7 : 4) + (k > 6 ? -1 : 0);
    r.poly([[tx - 1.6, ty], [tx + 1.6, ty], [tx + 0.4, ty + h]], TOOTH, { n: [-0.2, 0.4, 0.85], max: 5 });
  }
  // the skull: a long wedge, domed, with a heavy brow over the eyes and plates along the snout
  r.begin();
  r.poly([[X(-8), Y(-14)], [X(10), Y(-22)], [X(32), Y(-20)], [X(52), Y(-12)], [X(66), Y(-3)], [X(68), Y(2)], [X(48), Y(4)], [X(12), Y(5)], [X(-6), Y(10)]], HIDE,
    { nf: dome(X(26), Y(-6), 40, 16), bevel: 1, max: 7, spec: HIDE[7], specT: 0.985 });
  r.end(0.6);
  r.begin();
  r.poly([[X(14), Y(-16)], [X(34), Y(-19)], [X(46), Y(-12)], [X(30), Y(-9)], [X(16), Y(-10)]], HIDE, { n: [-0.25, -0.85, 0.45], bevel: 1, max: 7 });
  r.end(0.5);
  for (let k = 0; k < 4; k++) {
    const x = X(44 + k * 5), y = Y(-9 + k * 2.2);
    r.line(Math.round(x), Math.round(y), Math.round(x + 3), Math.round(y + 3), HIDE[2]);
    r.dot(Math.round(x + 1), Math.round(y - 1), HIDE[6]);
  }
  // scars, nostril
  r.line(X(20), Y(-3), X(36), Y(-6), HIDE[5]);
  r.line(X(24), Y(1), X(34), Y(-1), HIDE[2]);
  r.dot(X(62), Y(-2), THROAT[0]).dot(X(61), Y(-2), THROAT[1]);
  // three pale eyes under the brow
  const ek = clamp(eyes, 0.15, 1.4);
  for (const [ex, ey, s] of [[36, -8, 3], [27, -9, 2], [44, -5, 2]]) {
    r.glow(X(ex), Y(ey), s + 1.2, s * 0.8 + 0.6, eyes > 0.5 ? G_EYE : G_ICE_DIM, { k: ek, bias: eyes > 1 ? 0.6 : 0.3 });
    if (eyes > 0.55) r.dot(X(ex), Y(ey - 0.5), WHITE, ek);
  }
  // a crown of ice swept back from the skull
  const ck = P.crown ?? 1;
  crystal(r, X(-2), Y(-12), -160, 22, 4, ck);
  crystal(r, X(8), Y(-19), -138, 28, 4.4, ck);
  crystal(r, X(20), Y(-21), -118, 20, 3.4, ck);
  crystal(r, X(31), Y(-19), -100, 11, 2.4, ck * 0.8);
  r.restore();
}

// ---------------------------------------------------------------- the battle art

/** Three gill slits behind the jaw, faintly lit from inside. */
function gills(r, S, glow) {
  for (let k = 0; k < 3; k++) {
    const s = S[Math.round(S.length * (0.8 + k * 0.045))];
    const a = [s.x - s.nx * s.r * 0.35, s.y - s.ny * s.r * 0.35], b = [s.x + s.nx * s.r * 0.25, s.y + s.ny * s.r * 0.25];
    r.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), THROAT[1]);
    r.line(Math.round(a[0] + s.dx), Math.round(a[1] + s.dy), Math.round(b[0] + s.dx), Math.round(b[1] + s.dy), glow > 0.55 ? G_VOID_DIM[3] : HIDE[2], glow > 0.55 ? 0.6 : 0);
  }
}

/** The breach in the black ice: the dark hole behind, the broken slabs of its rim in front. */
function holeBack(r, cx, cy, rx, ry, glow) {
  r.glow(cx, cy - 2, rx * 0.92, ry * 1.2, glow > 0.55 ? G_VOID_DIM : G_ICE_DIM, { k: 0.7, bias: -0.4 });
  r.each(cx - rx, cy - ry, cx + rx, cy + ry, (mx, my, X, Y) => {
    const d = Math.hypot((mx - cx) / (rx * 0.86), (my - cy) / (ry * 0.9));
    if (d < 0.8) r.put(X, Y, THROAT[d < 0.5 ? 0 : 1]);
  });
  // the rim behind the body
  const R = rng(11);
  for (let k = 0; k < 9; k++) {
    const a = Math.PI + (k / 8) * Math.PI;
    const x = cx + Math.cos(a) * rx * 0.95, y = cy + Math.sin(a) * ry * 0.95;
    const w = 9 + R() * 8, h = 5 + R() * 6;
    r.begin();
    r.poly([[x - w, y + 2], [x - w * 0.6, y - h], [x + w * 0.4, y - h - R() * 3], [x + w, y + 2]], BLACK, { n: [0.1, -0.7, 0.7], bevel: 1, max: 5, bias: -0.05 });
    r.end(0.4);
  }
}

function holeFront(r, cx, cy, rx, ry) {
  const R = rng(17);
  for (let k = 0; k < 11; k++) {
    const a = (k / 10) * Math.PI;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    const w = 10 + R() * 9, h = 7 + R() * 8, lean = (R() - 0.5) * 6;
    // each slab's foot is broken unevenly, so the base of the sheet has no straight edge
    const foot = 3 + R() * 7, notch = (R() - 0.5) * w;
    r.begin();
    r.poly([[x - w * 0.8, y + foot * 0.5], [x - w * 0.7 + lean, y - h], [x + w * 0.3 + lean, y - h - 2 - R() * 4], [x + w * 0.9, y + foot * 0.6], [x + notch, y + foot]], BLACK,
      { n: [Math.cos(a) * 0.3, -0.55, 0.78], bevel: 1, max: 7, spec: BLACK[7], specT: 0.97 });
    r.end(0.5);
    // frost on the slab's top edge and a thin glowing crack
    r.line(Math.round(x - w * 0.6 + lean), Math.round(y - h + 1), Math.round(x + w * 0.3 + lean), Math.round(y - h - 1), ICE[5]);
    if (R() < 0.5) r.line(Math.round(x), Math.round(y - h * 0.5), Math.round(x + 3), Math.round(y + 3), G_ICE[2], 0.6);
  }
}

/** A rusted Meridian hull plate lodged in the hide, its sodium lamp still blinking. */
function hullPlate(r, s, lamp) {
  const cx = s.x - s.nx * s.r * 0.2, cy = s.y - s.ny * s.r * 0.2;
  const a = Math.atan2(s.dy, s.dx);
  r.save();
  r.rotate(a + 0.45, cx, cy);
  r.begin();
  r.poly([[cx - 11, cy - 6], [cx - 2, cy - 9], [cx + 10, cy - 7], [cx + 8, cy - 1], [cx + 11, cy + 5], [cx + 1, cy + 7], [cx - 9, cy + 6], [cx - 12, cy]], RUST,
    { n: [-0.3, -0.5, 0.8], bevel: 1, max: 4, bias: -0.06 });
  r.end(0.6);
  // torn edge, rivets, frost on the upper rim
  r.line(Math.round(cx - 9), Math.round(cy - 2), Math.round(cx + 9), Math.round(cy - 4), RUST[1]);
  for (const [x, y] of [[-8, -3], [7, -5], [8, 3], [-6, 4]]) r.dot(Math.round(cx + x), Math.round(cy + y), RUST[5]);
  r.line(Math.round(cx - 10), Math.round(cy - 6), Math.round(cx + 9), Math.round(cy - 8), RIME_C[4]);
  r.rect(Math.round(cx + 1), Math.round(cy - 4), 4, 3, RUST[0]);
  spot(r, cx + 3, cy - 3, lamp > 0.6 ? 3 : 2, G_SODIUM, clamp(lamp, 0.2, 1.4));
  r.restore();
}

function drawMaw(r, P) {
  const glow = P.glow ?? 1, sway = P.sway || 0;
  const tx = P.tx || 0, ty = P.ty || 0;
  r.translate(tx, ty);
  const HC = [112, 194], HRX = 92, HRY = 12;   // the breach sits above the frame's bottom edge
  holeBack(r, HC[0], HC[1], HRX, HRY, glow);

  // the tail (slam): erupting from the ice ahead of the head, behind it in depth
  if (P.tail) {
    const T = spine(...P.tail, (t) => lerp(17, 7, t), 48);
    tube(r, T, { bellyFrom: 0.45 });
    ridge(r, T, 0.25, 0.85, 6, { scale: 0.7, k: glow, seed: 9 });
    const tip = T[T.length - 1];
    crystal(r, tip.x, tip.y, Math.atan2(tip.dy, tip.dx) / DEG, 18, 5, glow);
    crystal(r, tip.x, tip.y, Math.atan2(tip.dy, tip.dx) / DEG + 40, 13, 4, glow);
    crystal(r, tip.x, tip.y, Math.atan2(tip.dy, tip.dx) / DEG - 40, 13, 4, glow);
    if (P.impact) {
      r.glow(tip.x, tip.y + 4, 22, 7, G_ICE, { fx: true, k: 1.1, bias: 0.3 });
      sparks(r, P.impact, tip.x - 6, tip.y - 6, 20, 14, G_ICE);
    }
  }

  // the coil of its back arching out of the ice behind the neck
  const hump = P.hump || [[24, 200], [28, 120], [80, 116], [88, 200]];
  const B = spine(...hump, (t) => 17 + Math.sin(t * Math.PI) * 3, 48);
  tube(r, B, { skin: HIDE, belly: null, rime: true });   // frost on its back, so it reads on the black ice
  ridge(r, B, 0.18, 0.82, 5, { scale: 0.85, k: glow * 0.8, seed: 5, dim: true });
  lights(r, B, (P.pulse || 0) + 1.3, glow * 0.6, { step: 7, seed: 8 });

  // the neck
  const n = P.neck || {};
  const p3 = [152 + (P.hx || 0), 66 + (P.hy || 0)];
  const S = spine(n.p0 || [102, 206], n.p1 || [88 + sway, 140], n.p2 || [112 + sway * 0.6, 56 + (P.hy || 0) * 0.4], n.p3 || p3,
    (t) => 32 - 9 * t + Math.sin(t * Math.PI) * 4);
  ridge(r, S, 0.16, 0.9, 5, { scale: 1.15, k: glow, seed: 2 });
  tube(r, S, { rime: true });
  lights(r, S, P.pulse || 0, glow, { from: 0.12, to: 0.92 });
  hullPlate(r, S[Math.round(S.length * 0.34)], P.lamp ?? 1);
  gills(r, S, glow);

  // the head on the end of the neck
  const end = S[S.length - 1];
  const ang = Math.atan2(end.dy, end.dx) + (P.headTilt || 0);
  head(r, end.x - end.dx * 6, end.y - end.dy * 6, ang, HEAD, { ...P, eyes: P.eyes ?? glow });

  holeFront(r, HC[0], HC[1] + 4, HRX, HRY);

  // the Ice Breath leaving the jaw
  if (P.breath) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const mx = end.x + ca * 60 * HEAD - sa * 10, my = end.y + sa * 60 * HEAD + ca * 10;
    r.beam(mx, my, mx + ca * 60, my + sa * 60 + 10, 6, 22, G_ICE, { fx: true, k: 1.1, bias: 0.2 });
    r.glow(mx + 2, my + 1, 12, 9, G_ICE, { fx: true, k: 1.2, bias: 0.5 });
    sparks(r, 31, mx + ca * 34, my + sa * 34 + 6, 24, 16, G_ICE);
  }
  if (P.splash) {
    r.glow(HC[0] + 6, HC[1] - 4, 52, 10, G_ICE, { fx: true, k: 0.9, bias: 0.1 });
    sparks(r, P.splash, HC[0] + 8, HC[1] - 22, 40, 22, G_ICE);
  }
  if (P.vapor) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    smoke(r, P.vapor, end.x + ca * 66 * HEAD, end.y + sa * 66 * HEAD - 8, 8, 0.4, RIME_C.slice(1));
  }
  if (P.motes) {
    const R = rng(P.motes);
    for (let k = 0; k < 9; k++) {
      const s = S[Math.floor(R() * S.length)];
      spot(r, s.x + (R() - 0.5) * 30, s.y - s.r - 4 - R() * 14, 1, G_ICE_DIM, 0.8);
    }
  }
}

const IDLE = [
  { sway: -2, hx: -2, hy: 1, jaw: 0.08, pulse: 0, glow: 0.95, lamp: 1.2, barbel: 0, vapor: 39, headTilt: -0.03 },
  { sway: 2, hx: 1, hy: -2, jaw: 0.14, pulse: 1.6, glow: 1.15, lamp: 0.4, barbel: 1.2, vapor: 41 },
  { sway: 5, hx: 3, hy: -4, jaw: 0.18, pulse: 3.2, glow: 1.3, lamp: 1.2, barbel: 2.4, vapor: 45, headTilt: 0.04 },
  { sway: 1, hx: 0, hy: -1, jaw: 0.1, pulse: 4.8, glow: 1.1, lamp: 0.4, barbel: 3.6, vapor: 43 },
];

export const MAW = {
  w: 256, h: 224,
  bevel: 4,
  draw: drawMaw,
  anims: {
    idle: { fps: 4, loop: true, poses: IDLE },
    attack: { fps: 6, loop: false, order: [0, 0, 1, 1, 1], poses: [
      { sway: -6, hx: -14, hy: -12, headTilt: -0.28, jaw: 0.55, throat: 0.7, glow: 1.2, pulse: 1, lamp: 1, eyes: 1.3 },
      { sway: 4, hx: 6, hy: 10, headTilt: 0.14, jaw: 1, throat: 1, glow: 1.3, breath: 1, pulse: 3, lamp: 0.4, eyes: 1.4 },
    ] },
    slam: { fps: 6, loop: false, order: [0, 0, 1, 1, 1], poses: [
      { sway: -5, hx: -16, hy: -8, headTilt: -0.2, jaw: 0.4, glow: 1.2, eyes: 1.3, pulse: 2,
        tail: [[204, 212], [212, 146], [236, 112], [224, 44]] },
      { sway: 3, hx: 2, hy: 6, headTilt: 0.12, jaw: 0.6, glow: 1.2, eyes: 1.2, pulse: 4, lamp: 0.4,
        tail: [[196, 212], [198, 160], [232, 140], [236, 196]], impact: 23 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { sway: -8, hx: -12, hy: -6, headTilt: -0.36, jaw: 0.7, glow: 0.5, eyes: 0.4, pulse: 2, lamp: 0.2, barbel: 2 },
    ] },
    break: { fps: 3, loop: true, poses: [
      { sway: -10, hx: -8, hy: 58, headTilt: 0.62, jaw: 0.35, glow: 0.3, eyes: 0.3, crown: 0.3, pulse: 1, lamp: 0.2, motes: 3, vapor: 47,
        neck: { p1: [80, 150], p2: [120, 92] } },
      { sway: -10, hx: -8, hy: 59, headTilt: 0.64, jaw: 0.38, glow: 0.55, eyes: 0.6, crown: 0.5, pulse: 2.5, lamp: 0.8, motes: 9,
        neck: { p1: [80, 150], p2: [120, 92] } },
    ] },
    special: { fps: 5, loop: false, poses: [
      { glow: 1.3, eyes: 1.2, jaw: 0.3, pulse: 2, splash: 37, headTilt: 0.2,
        neck: { p0: [96, 210], p1: [86, 112], p2: [196, 66], p3: [176, 160] } },
    ] },
  },
  points: { center: [146, 112], muzzle: [222, 92], top: [134, 18], core: [190, 64] },
  icon: { x: 196, y: 70, scale: 0.3 },
  fitBox: [104, 12, 126, 116],   // the head and neck: the camera keeps them in the focus band
};

// ---------------------------------------------------------------- the field art

function drawLurk(r, P) {
  const glow = P.glow ?? 1;
  const rise = P.rise || 0;
  const cx = 86, cy = 96;
  // the black-ice surface, cracked and glowing violet from beneath
  r.begin();
  r.ball(cx, cy, 84, 15, BLACK, { flat: 0.35, max: 6, spec: BLACK[7], specT: 0.985 });
  r.end(0.4);
  const R = rng(5);
  for (let k = 0; k < 7; k++) {
    let x = cx + (R() - 0.5) * 120, y = cy + (R() - 0.5) * 16;
    for (let j = 0; j < 10; j++) {
      const nx = x + (R() - 0.5) * 8, ny = y + (R() - 0.5) * 3;
      if (Math.hypot((nx - cx) / 82, (ny - cy) / 14) < 1) r.line(Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), glow > 0.5 ? G_VOID[1] : G_VOID_DIM[2], 0.7 * glow);
      x = nx; y = ny;
    }
  }
  r.glow(cx + 6, cy - 2, 46, 8, G_VOID_DIM, { k: 0.42 * glow, bias: -0.3 });
  // the ridge of its back breaking the surface
  const B = spine([10, cy + 8], [24, cy - 12 - rise * 6], [64, cy - 14 - rise * 8], [84, cy + 6], (t) => 9 + Math.sin(t * Math.PI) * 2, 32);
  tube(r, B, { skin: HIDE, belly: null, rime: true });   // frost on its back, so it reads on the black ice
  ridge(r, B, 0.1, 0.9, 4, { scale: 0.75, k: glow, seed: 4 });
  // the head, low in the ice (rising out of it)
  const hx = 96 + rise * 4, hy = cy - 6 - rise * 30;
  if (rise > 0.3) {
    const N = spine([92, cy + 10], [90, cy - 10], [92, hy + 10], [hx, hy], (t) => 15 - t * 4, 24);
    tube(r, N, {});
  }
  head(r, hx, hy, (P.tilt || 0) + (rise > 0.3 ? -0.15 : 0.05), 0.78, P);
  rimTop(r, 8, 168, 20, cy - 15);   // above the black-ice disc (its top edge is at cy - 15)
  // the ice lip in front of it
  r.begin();
  r.each(cx - 84, cy - 2, cx + 84, cy + 16, (mx, my, X, Y) => {
    const d = Math.hypot((mx - cx) / 84, (my - cy) / 15);
    if (d > 1 || my < cy + 1 + Math.sin(mx * 0.3) * 1.5) return;
    r.lightPut(X, Y, 0, 0.6, 0.8, BLACK, { max: 5 });
  });
  r.end(0.45);
  for (let x = cx - 60; x < cx + 60; x += 7) r.dot(x, cy + 2 + Math.round(Math.sin(x * 0.3) * 1.5), ICE[4]);
  if (P.vapor) smoke(r, P.vapor, hx + 56, hy - 4, 7, 0.35, RIME_C.slice(1));
  if (P.splash) sparks(r, P.splash, hx + 10, cy - 10, 30, 16, G_ICE);
}

/**
 * A cold rim of light on the upper silhouette of the field art (G2 C3-9): in the dim hall the hide is
 * near-black, so the first opaque texel of each column between rows y0 and y1 glows ice-blue.
 */
function rimTop(r, x0, x1, y0, y1) {
  for (let X = x0; X < x1; X++) {
    for (let Y = y0; Y < y1; Y++) {
      if (!r.flg[Y * r.w + X]) continue;
      r.put(X, Y, G_ICE[3], 0.35);
      if (Y + 1 < y1 && r.flg[(Y + 1) * r.w + X]) r.put(X, Y + 1, RIME_C[4], 0.12);
      break;
    }
  }
}

export const MAW_LURK = {
  w: 176, h: 112,
  bevel: 3,
  draw: drawLurk,
  anims: {
    // eyes held low: on the field sprite (emissive x2.2) brighter eyes bloom into squares
    idle: { fps: 3, loop: true, poses: [
      { jaw: 0, eyes: 0.65, glow: 0.9, barbel: 0 },
      { jaw: 0.05, eyes: 0.8, glow: 1.0, barbel: 1, vapor: 51 },
      { jaw: 0, eyes: 0.65, glow: 0.9, barbel: 2 },
      { jaw: 0, eyes: 0.15, glow: 0.85, barbel: 3, vapor: 53 },
    ] },
    special: { fps: 4, loop: false, poses: [{ rise: 1, jaw: 0.9, eyes: 1.4, glow: 1.3, throat: 0.4, splash: 57 }] },
    attack: { fps: 4, loop: false, poses: [{ rise: 0.8, jaw: 1, eyes: 1.3, glow: 1.2, throat: 1 }] },
    hurt: { fps: 4, loop: false, poses: [{ rise: 0.6, jaw: 0.6, eyes: 0.4, glow: 0.5, tilt: -0.3 }] },
    break: { fps: 2, loop: true, poses: [{ rise: 0, jaw: 0.2, eyes: 0.2, glow: 0.3 }] },
  },
  points: { center: [92, 80], muzzle: [150, 84], top: [88, 40] },
  icon: { x: 120, y: 84, scale: 0.4 },
};
