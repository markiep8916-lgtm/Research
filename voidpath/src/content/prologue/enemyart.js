// prologue: regular-enemy art (browser, TECH_PLAN 2.5, 7.6, 7.8; bestiary task CA-alpha).
//
// Painted with the POC enemy rig (art/enemies.js Rig): analytic shaded shapes under one upper-left key
// light, dark part separation lines and a tinted outline, albedo and emissive painted together. All
// sprites face RIGHT (toward the party).
//
// Besides the default export (the location's arts) this module exports the bestiary toolkit the other
// enemyart.js files paint with: the shared material and glow ramps (the POC values, so every enemy
// reads as one family) and the effect helpers (spark, sparks, smoke, steam, spot, flame, muzzleFlash)
// plus the limb helpers (polar, along, limbPlate, dome).
//
// sentinel_mk1 (104x88): first-generation Halcyon Security patrol walker, a smaller cousin of the
// SENTINEL (ivory plate, crimson livery, bronze crest, magenta energy) on reverse-jointed legs with a
// capacitor rail cannon slung under its chest. Signature (7.8): a telegraphed charge, so its `special`
// animation (played by the Director for charge-type actions) braces the cannon while the backpack
// capacitors and the muzzle gather light; `attack` fires the heavy shot.

import { parseColor, rng } from '../../art/painter.js';
import { RAMPS, GLOW } from '../../art/palette.js';

// ---------------------------------------------------------------- toolkit: colours

export const rp = (...hex) => hex.map((h) => parseColor(h));
export const WHITE = parseColor('#ffffff');
export const DEG = Math.PI / 180;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
/** Ordered-dither offset (-0.5..0.5) of a screen pixel, as the rig uses at ramp band edges. */
export const dith = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

// material ramps, dark -> light (POC values)
export const STEEL = rp('#141927', '#1e2536', '#2a3349', '#3b4762', '#55667f', '#7d90a8', '#b2c2d4', '#e1e9f2');
export const GUN = rp('#090b12', '#0f1219', '#191e29', '#242b3a', '#323b4e', '#475267', '#66738a', '#93a0b5');
export const HULL = rp('#10131c', '#191e2b', '#232a3b', '#2f384d', '#414c64', '#5a6680');
export const CRIMSON = rp('#2c0910', '#5c1220', '#9a1b30', '#d82d45', '#ff5d6c', '#ffa3aa');
export const IVORY = rp('#141720', '#222736', '#343b4f', '#4c5569', '#6b768c', '#8f9bb0', '#b5bfcf', '#dce3ee');
export const GOLD = RAMPS.gold.map((h) => parseColor(h));
export const AMBER = RAMPS.amber.map((h) => parseColor(h));
export const BRONZE = rp('#1a1006', '#33200b', '#553612', '#7d521b', '#a87228', '#d39a3c', '#f2c56a', '#fff0b8');

// glow ramps, outer (dim) -> inner (hot)
export const G_RED = rp('#5c1220', '#b01c33', '#ff3b4e', '#ff7f8a', '#ffd6da');
export const G_MAG = rp('#5c1450', '#95207a', '#ff4fc0', '#ff9ad8', '#fff0fa');
export const G_MAG_DIM = rp('#2e0a2a', '#4a1043', '#6b1660', '#86207a', '#9c3a8f');
export const G_CYAN = rp('#0d4f78', '#1479b0', '#29a9e0', '#7ff4ff', '#e6fdff');
export const G_AMBER = rp('#6f350f', '#b25a17', '#ff9a2a', '#ffc35a', '#fff0c0');
export const G_FIRE = rp('#b25a17', '#ff8a2a', '#ffc35a', '#fff0b0', '#ffffff');
export const SMOKE = rp('#1d212b', '#2b303c', '#3c4250', '#525a69');
export const STEAM = rp('#2a3446', '#46546a', '#6e8098', '#a3b6ca', '#d4e2ee');
export const GLOW_C = Object.fromEntries(Object.entries(GLOW).map(([k, v]) => [k, parseColor(v)]));

// ---------------------------------------------------------------- toolkit: effects

/** Star-shaped spark / glint, emissive, no outline. */
export function spark(r, x, y, size, ramp = G_FIRE) {
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
export function sparks(r, seed, cx, cy, spread, n, ramp = G_FIRE) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = spread * (0.3 + R() * 0.7);
    const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * 0.8);
    if (R() < 0.45) spark(r, x, y, R() < 0.4 ? 2 : 1, ramp);
    else {
      const len = 2 + Math.floor(R() * 3), sx = Math.sign(Math.cos(a)) || 1;
      for (let k = 0; k < len; k++) r.dot(x + sx * k, y + Math.floor((k * k) / 3), k === 0 ? ramp[4] : ramp[3 - Math.min(2, k)], 0.55, true);
    }
  }
}

/** Dithered puff (not emissive, no outline): smoke by default, steam / frost with another ramp. */
export function smoke(r, seed, cx, cy, rad, density = 0.75, ramp = SMOKE) {
  const R = rng(seed);
  r.each(cx - rad - 1, cy - rad - 1, cx + rad + 1, cy + rad + 1, (mx, my, X, Y) => {
    const d = Math.hypot(mx - cx, (my - cy) * 1.2) / rad;
    if (d > 1 || R() > density * (1.1 - d)) return;
    const k = clamp(Math.floor((1 - d) * ramp.length + dith(X, Y)), 0, ramp.length - 1);
    r.put(X, Y, ramp[k], 0, true);
  });
}

/** Pale vapour puff (vents, cold breath). */
export function steam(r, seed, cx, cy, rad, density = 0.6) {
  smoke(r, seed, cx, cy, rad, density, STEAM);
}

/** Small glowing spot: bright core with a coloured halo (size 1-3), emissive. */
export function spot(r, x, y, size, ramp, k = 1) {
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

/** Tapered flame / jet from (x, y) along (dx, dy): hot core, coloured edges; emissive, no outline. */
export function flame(r, x, y, len, ramp = G_CYAN, dx = 0, dy = 1, width = 2) {
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
export function muzzleFlash(r, x, y, size, ramp = G_FIRE, dir = 1) {
  r.glow(x + dir * size * 0.4, y, size * 0.9, size * 0.62, ramp, { fx: true, bias: 0.4 });
  for (let k = 0; k <= size * 1.6; k++) r.dot(x + dir * k, y, ramp[clamp(ramp.length - 1 - Math.floor(k / 3), 1, 4)], 1, true);
  for (let k = 1; k <= size * 0.8; k++) {
    r.dot(x + dir * (k * 0.7), y - k * 0.7, ramp[2], 1, true);
    r.dot(x + dir * (k * 0.7), y + k * 0.7, ramp[2], 1, true);
  }
  r.dot(x, y - Math.round(size * 0.7), ramp[1], 1, true);
  r.dot(x, y + Math.round(size * 0.7), ramp[1], 1, true);
}

// ---------------------------------------------------------------- toolkit: limbs

const N3 = [0, 0, 1];   // scratch normal returned by the per-pixel normal functions

export const polar = (x, y, deg, len) => [x + Math.cos(deg * DEG) * len, y + Math.sin(deg * DEG) * len];

/** Point at fraction t along a->b, offset w pixels to the left of the direction of travel. */
export function along(a, b, t, w) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [a[0] + dx * t + (dy / l) * w, a[1] + dy * t - (dx / l) * w];
}

/** Armour plate around a limb axis a->b: outline given as [t, w] pairs, shaded like a cylinder. */
export function limbPlate(r, a, b, prof, ramp, o = {}) {
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
export const dome = (cx, cy, rx, ry, k = 0.8) => (mx, my) => {
  const u = clamp((mx - cx) / rx, -1, 1), v = clamp((my - cy) / ry, -1, 1);
  N3[0] = u * k; N3[1] = v * k; N3[2] = Math.sqrt(Math.max(0.05, 1 - (u * u + v * v) * k * k));
  return N3;
};

// ---------------------------------------------------------------- SENTINEL MK-I (104x88)

const mag = (v) => (v > 0.55 ? G_MAG : G_MAG_DIM);

/** Reverse-jointed leg in screen space: hip -> knee (forward) -> ankle (back) -> clawed foot. */
function mk1Leg(r, hip, knee, ankle, heel, toe, far) {
  const armor = far ? { bias: -0.14, max: 5 } : { max: 6 };
  const metal = far ? { max: 4, bias: -0.1 } : { max: 5 };
  // thigh: gunmetal strut under an ivory plate with a crimson flash
  r.begin();
  r.seg(...hip, ...knee, 4.8, 3.8, GUN, { caps: 'flat', ...metal });
  r.end(0.5);
  r.begin();
  limbPlate(r, hip, knee, [[-0.1, -6], [-0.05, 6], [0.8, 5], [1.0, 1.5], [0.9, -4.2]], IVORY, armor);
  r.end(0.55);
  r.line(...along(hip, knee, 0.25, -3).map(Math.round), ...along(hip, knee, 0.65, -2.4).map(Math.round), CRIMSON[far ? 2 : 3]);
  // shin: strut under a steel greave, with a hydraulic piston glint
  r.begin();
  r.seg(...knee, ...ankle, 3.6, 2.6, GUN, { caps: 'flat', ...metal, spec: far ? null : GUN[7], specT: 0.96 });
  limbPlate(r, knee, ankle, [[0.1, -4.4], [0.1, 3.4], [0.6, 2.8], [0.6, -3.6]], STEEL, { ...armor, max: far ? 4 : 6 });
  r.end(0.5);
  const p0 = along(knee, ankle, 0.2, -2.6), p1 = along(knee, ankle, 0.85, -2.2);
  r.line(Math.round(p0[0]), Math.round(p0[1]), Math.round(p1[0]), Math.round(p1[1]), far ? STEEL[3] : STEEL[6]);
  // knee joint with a pointed cap
  r.begin();
  r.ball(...knee, 3.6, 3.6, GUN, { max: far ? 5 : 6, spec: far ? null : GUN[7], specT: 0.95 });
  r.poly([along(hip, knee, 0.78, -3.8), along(hip, knee, 0.8, 4), along(hip, knee, 1.3, 0.5)], IVORY, { n: [0.3, -0.6, 0.75], bevel: 1, ...armor });
  r.end(0.55);
  // ankle and the clawed foot (two toes forward, a spur back)
  r.begin();
  r.ball(...ankle, 2.8, 2.8, GUN, { max: 5 });
  r.poly([heel, along(heel, toe, 0.25, 3.6), along(heel, toe, 0.7, 3), toe, along(heel, toe, 1.0, -1.4), along(heel, toe, 0.0, -1.4)], STEEL, { n: [0.15, -0.7, 0.7], bevel: 1, max: far ? 4 : 5 });
  r.end(0.55);
  r.seg(...ankle, ...along(heel, toe, 0.45, 1.5), 2.2, 1.8, GUN, { caps: 'flat', max: 4 });
  r.dot(...along(heel, toe, 0.5, 2).map(Math.round), GOLD[far ? 2 : 4]);
}

function drawMk1(r, P) {
  const core = P.core ?? 1, vis = P.visor ?? 1, beacon = P.beacon ?? 0;
  const tx = P.tx || 0, ty = P.ty || 0;
  const torso = () => {
    r.translate(tx, ty);
    r.rotate(P.lean || 0, 44, 54);
  };
  const L = P.legs || {};

  r.save();
  torso();
  const hipNear = r.pt(38, 54), hipFar = r.pt(52, 51);
  r.restore();

  // far leg (behind everything)
  const lf = L.far || { knee: [63, 62], ankle: [57, 74], heel: [51, 84], toe: [70, 84] };
  mk1Leg(r, hipFar, lf.knee, lf.ankle, lf.heel, lf.toe, true);

  r.save();
  torso();

  // antenna mast with a blinking tip
  const tip = polar(30, 17, -78 + (P.ant || 0), 13);
  r.line(30, 17, Math.round(tip[0]), Math.round(tip[1]), STEEL[5]);
  r.line(31, 17, Math.round(tip[0]) + 1, Math.round(tip[1]), STEEL[2]);
  r.dot(Math.round(tip[0]), Math.round(tip[1]) - 1, P.led ? GLOW_C.red : CRIMSON[1], P.led ? 1 : 0);

  // backpack: capacitor bank with three magenta coils, a top vent and the amber security beacon
  r.begin();
  r.poly([[14, 22], [24, 16], [36, 17], [38, 40], [30, 46], [17, 44], [13, 34]], HULL, { nf: dome(26, 30, 14, 16), bevel: 1, max: 5 });
  r.end(0.6);
  for (const [x, k] of [[19, 0], [24, 1], [29, 2]]) {
    const cK = clamp(core + (k - 1) * 0.08, 0.2, 1.8);
    r.seg(x, 23 + k, x, 38 - k * 0.5, 1.9, 1.9, cK > 0.55 ? G_MAG : G_MAG_DIM, { caps: 'flat', glow: Math.min(0.85, 0.15 + cK * 0.3), gamma: 1.2, bias: cK > 1.5 ? 0.25 : 0, min: 1, max: cK > 1.5 ? 4 : 3 });
    r.rect(x - 2, 22 + k, 5, 1, GUN[5]);
    r.rect(x - 2, 38 - k * 0.5, 5, 1, GUN[3]);
  }
  r.line(15, 30, 17, 30, GUN[0]);
  r.line(15, 34, 17, 34, GUN[0]);
  // beacon housing and lens (it sweeps: bright on alternating frames)
  r.begin();
  r.rect(20, 12, 8, 4, GUN[4]);
  r.ball(24, 12, 3.4, 2.6, beacon ? G_AMBER : AMBER, { clip: (x, y) => y < 13, max: beacon ? 4 : 2, glow: beacon ? 0.9 : 0, gamma: 1 });
  r.end(0.5);
  if (beacon) {
    r.dot(23, 10, WHITE, 1);
    for (let k = 1; k <= 4; k++) r.dot(24 + (beacon > 0 ? k : -k) * 1.4, 11 - k * 0.4, G_AMBER[clamp(4 - k, 1, 4)], 0.7, true);
  }

  // hip block
  r.begin();
  r.poly([[32, 48], [54, 47], [57, 55], [50, 59], [36, 59], [31, 55]], GUN, { n: [0, -0.2, 1], bevel: 1, max: 5 });
  r.end(0.55);
  r.restore();

  // near leg
  const ln = L.near || { knee: [48, 66], ankle: [36, 77], heel: [27, 86], toe: [50, 86] };
  mk1Leg(r, hipNear, ln.knee, ln.ankle, ln.heel, ln.toe, false);

  r.save();
  torso();

  // chest: hunched ivory shell over a gunmetal frame, belly louvres, crimson livery
  r.begin();
  r.poly([[24, 24], [46, 17], [62, 19], [70, 28], [68, 44], [56, 52], [34, 52], [25, 44]], GUN, { n: [0, -0.1, 1], max: 4 });
  r.end(0.6);
  r.begin();
  r.poly([[25, 26], [46, 18], [61, 20], [68, 29], [64, 39], [46, 43], [30, 41]], IVORY, { nf: dome(46, 28, 26, 16), bevel: 1, max: 7, spec: IVORY[7], specT: 0.985 });
  r.end(0.6);
  r.poly([[28, 35], [50, 27], [52, 30], [30, 38.5]], CRIMSON, { nf: dome(46, 28, 26, 16), max: 4 });
  // dorsal spine plate and panel seams
  r.begin();
  r.poly([[31, 23], [46, 17], [57, 18.5], [56, 21], [46, 20], [33, 26]], IVORY, { n: [-0.2, -0.9, 0.4], bevel: 1, max: 7 });
  r.end(0.45);
  r.line(52, 23, 50, 38, IVORY[3]);
  r.line(53, 23, 51, 38, IVORY[6]);
  // status lights on the flank (they chase across the idle frames)
  for (let k = 0; k < 3; k++) {
    const on = ((P.chase ?? -1) + 3) % 3 === k;
    r.dot(57 + k * 3, 39 - k, on ? GLOW_C.amber : AMBER[1], on ? 1 : 0);
  }
  for (let k = 0; k < 4; k++) r.line(38 + k * 4, 45, 37 + k * 4, 49, GUN[1]);
  r.line(35, 44, 56, 43, GUN[5]);
  for (const [x, y] of [[29, 30], [44, 21], [58, 23], [62, 36]]) {
    r.dot(x, y, GOLD[4]);
    r.dot(x + 1, y + 1, GOLD[1]);
  }
  r.line(40, 23, 47, 21, IVORY[7]);
  r.line(34, 32, 37, 30, IVORY[3]);

  // sensor helm at the front of the chest: bronze crest fin, brow plate, magenta visor slit
  r.save();
  r.translate(0, P.hy || 0);
  r.rotate(P.head || 0, 64, 28);
  r.begin();
  const crest = [[60, 21], [56, 13], [50, 7], [43, 5]], cr = [3.2, 2.4, 1.4, 0.4];
  for (let k = 0; k < 3; k++) r.seg(...crest[k], ...crest[k + 1], cr[k], cr[k + 1], BRONZE, { max: 6, spec: BRONZE[7], specT: 0.95, bounce: 0.3 });
  r.end(0.55);
  r.begin();
  r.poly([[57, 21], [70, 18], [79, 23], [80, 30], [74, 35], [60, 34], [56, 28]], GUN, { nf: dome(68, 26, 13, 9), bevel: 1, max: 6, spec: GUN[7], specT: 0.975 });
  r.end(0.6);
  r.begin();
  r.poly([[57, 21], [70, 17], [79, 22], [78, 24.5], [69, 22], [58, 25]], IVORY, { n: [-0.1, -0.85, 0.5], bevel: 1, max: 7 });
  r.end(0.45);
  const vk = clamp(vis, 0.2, 1.3), vr = mag(vis);
  r.line(64, 27, 79, 26, vr[vis > 1.05 ? 4 : 3], vk);
  r.line(65, 28, 78, 27, vr[2], vk * 0.8);
  if (vis > 0.55) {
    r.dot(76, 26, WHITE, 1);
    r.dot(77, 26, vr[4], 1);
  }
  if (P.glitch) {
    r.line(60, 25, 81, 24, WHITE, 1, true);
    r.line(66, 30, 83, 29, G_MAG[3], 1, true);
  }
  r.poly([[62, 31], [74, 31], [72, 34.5], [63, 34]], IVORY, { n: [0.2, 0.5, 0.84], max: 5, bevel: 1 });
  r.line(66, 32, 71, 32, GUN[1]);
  r.restore();

  // rail cannon slung under the chest: capacitor housing, three rings, long barrel, muzzle brake
  const C = P.cannon || {};
  const ca = C.ang ?? 0, rec = C.recoil || 0, ch = C.charge || 0;
  r.save();
  r.rotate(ca * DEG, 40, 45);
  r.translate(-rec, 0);
  r.begin();
  r.seg(36, 46, 64, 46, 5.2, 4.6, STEEL, { caps: 'flat', max: 6, spec: STEEL[7], specT: 0.975 });
  r.poly([[44, 40.5], [62, 41], [63, 43], [44, 43]], IVORY, { n: [0, -0.8, 0.6], bevel: 1, max: 7 });
  r.end(0.55);
  for (const [x, k] of [[48, 0], [53, 1], [58, 2]]) {
    const rk = clamp(core * 0.6 + ch * 0.12 + k * 0.05, 0.15, 1.6);
    r.seg(x, 46, x + 1.4, 46, 5.4, 5.4, rk > 0.55 ? G_MAG : G_MAG_DIM, { caps: 'flat', glow: Math.min(1, rk * 0.6), gamma: 1, bias: 0.2, min: 1 });
  }
  r.begin();
  r.seg(63, 45.5, 82, 45.5, 2.3, 2.1, GUN, { caps: 'flat', max: 6, spec: GUN[7], specT: 0.96 });
  r.rect(81, 42, 4, 7, GUN[5]);
  r.dot(82, 42, GUN[7]);
  r.line(81, 48, 84, 48, GUN[2]);
  r.end(0.55);
  for (let x = 66; x <= 78; x += 4) r.dot(x, 44, GUN[6]);
  // grip and the forearm that holds it
  r.begin();
  r.seg(42, 50, 46, 55, 2.2, 2, GUN, { caps: 'flat', max: 5 });
  r.end(0.5);
  if (ch) {
    r.glow(86, 45.5, Math.min(3.4, ch * 0.7), Math.min(3.4, ch * 0.7), G_MAG, { k: 1 });
    r.glow(87, 45.5, ch, ch * 0.9, G_MAG, { fx: true, bias: 0.6 });
    if (ch > 3) {
      for (let k = 0; k < 6; k++) {
        const [sx, sy] = polar(87, 45.5, k * 60 + 20, ch + 3 + (k & 1) * 2);
        spark(r, Math.round(sx), Math.round(sy), 1, G_MAG);
      }
    }
  }
  if (C.flash) muzzleFlash(r, 87, 45.5, C.flash, G_MAG);
  if (C.smoke) smoke(r, C.smoke, 88, 43, 3.2);
  r.restore();

  // near pauldron over the shoulder: domed ivory plate with crimson trim over a steel lame
  r.begin();
  r.poly([[30, 42], [46, 41], [44, 47], [32, 47.5]], STEEL, { nf: dome(38, 40, 10, 8), bevel: 1, max: 5 });
  r.end(0.55);
  r.begin();
  r.poly([[26, 33], [33, 28], [45, 28], [51, 34], [49, 41], [38, 43.5], [27, 41]], IVORY, { nf: dome(38, 34, 14, 10), bevel: 1, max: 7, spec: IVORY[7], specT: 0.985 });
  r.poly([[27.5, 39.5], [38, 41.6], [49.6, 39.2], [49, 41], [38, 43.5], [27, 41]], CRIMSON, { nf: dome(38, 34, 14, 10), max: 4 });
  r.end(0.6);
  r.line(31, 32, 39, 30, IVORY[7]);
  for (const [x, y] of [[31, 37], [45, 35]]) {
    r.dot(x, y, GOLD[4]);
    r.dot(x + 1, y + 1, GOLD[1]);
  }
  // back vent steam (idle breath), damage smoke and sparks
  if (P.vent) steam(r, P.vent, 22 - (P.vent % 3), 8 - (P.vent % 4), 3.2 + (P.vent % 2), 0.55);
  r.restore();
  if (P.sparks) for (const [seed, x, y, sp, n] of P.sparks) sparks(r, seed, x, y, sp, n);
  if (P.smoke) for (const [seed, x, y, rad] of P.smoke) smoke(r, seed, x, y, rad);
}

const MK1_KNEEL = {
  near: { knee: [52, 80], ankle: [38, 83], heel: [30, 87], toe: [47, 87] },
  far: { knee: [62, 78], ankle: [50, 81], heel: [44, 85], toe: [60, 85] },
};

const SENTINEL_MK1 = {
  w: 104, h: 88,   // room on the right for the muzzle flash and the charge sparks
  bevel: 3,
  draw: drawMk1,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { core: 1, beacon: 1, led: 1, chase: 0 },
      { core: 1.15, ty: 1, ant: 3, beacon: 0, vent: 3, chase: 1 },
      { core: 1.3, ty: 1, ant: 4, beacon: -1, led: 1, vent: 6, chase: 2, cannon: { ang: -1 } },
      { core: 1.15, ant: 1, beacon: 0, chase: 1, cannon: { ang: -0.5 } },
    ] },
    attack: { fps: 8, loop: false, order: [0, 1, 1, 2, 2], poses: [
      { core: 1.4, visor: 1.3, tx: -1, lean: -0.04, cannon: { ang: -2, charge: 2.6 }, beacon: 1, led: 1 },
      { core: 0.8, visor: 1.25, tx: -3, lean: -0.08, head: -0.04, cannon: { ang: -3, recoil: 4, flash: 8 }, beacon: 1, led: 1 },
      { core: 0.7, tx: -1, lean: -0.03, cannon: { ang: -1, recoil: 1, smoke: 7 }, vent: 9 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { core: 0.5, visor: 0.45, glitch: 1, tx: -4, lean: -0.12, head: -0.15, cannon: { ang: 9 }, ant: -6 },
    ] },
    break: { fps: 4, loop: true, poses: [
      { core: 0.25, visor: 0.25, ty: 13, tx: 1, lean: 0.2, head: 0.25, hy: 1, legs: MK1_KNEEL, cannon: { ang: 16 }, ant: 8,
        sparks: [[71, 26, 26, 6, 5], [72, 58, 46, 5, 3]], smoke: [[73, 24, 12, 5], [74, 20, 6, 3.5]] },
      { core: 0.55, visor: 0.6, ty: 13, tx: 1, lean: 0.21, head: 0.23, hy: 1, legs: MK1_KNEEL, cannon: { ang: 17 }, ant: 6, led: 1,
        sparks: [[81, 30, 22, 6, 4], [82, 62, 50, 5, 4]], smoke: [[83, 23, 10, 5], [84, 19, 4, 3.5]] },
    ] },
    special: { fps: 6, loop: false, order: [0, 1, 0, 1], poses: [
      { core: 1.7, visor: 1.3, tx: -1, ty: 1, lean: -0.03, cannon: { ang: -1, charge: 3.5 }, beacon: 1, led: 1, vent: 11 },
      { core: 2, visor: 1.4, tx: -1, ty: 1, lean: -0.03, cannon: { ang: -1, charge: 5.5 }, beacon: -1, led: 1, vent: 14 },
    ] },
  },
  points: { center: [46, 46], muzzle: [86, 46], top: [46, 6] },
  icon: { x: 68, y: 27, scale: 0.6 },
};

export default {
  sentinel_mk1: SENTINEL_MK1,
};
