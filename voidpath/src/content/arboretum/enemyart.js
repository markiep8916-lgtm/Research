// arboretum: regular-enemy art (browser, TECH_PLAN 2.5, 7.6, 7.8; bestiary task CA-beta1).
//
// The Arboretum biodome after 412 days: deep green, bioluminescent teal and violet, pink blooms, warm
// Tethys light (12.1). Painted with the POC enemy rig and the bestiary toolkit exported by
// prologue/enemyart.js. All sprites face RIGHT.
//
//   spore_drone      56x60   a pollinator drone carried by the puffball that ate it; `special` is Pollen
//                            (the cap swells and bursts into gold sleep-spores).
//   bloom_mantis     88x96   a stalk mantis with a pink bloom for a head and leaf-blade scythes; it acts
//                            twice a round, so `attack` is a fast double slash.
//   rootling         52x48   a walking root bulb with a sprout and two teal eyes (the summoned swarm).
//   feral_caretaker  96x88   a tripod caretaker robot gone wild: ferns on its dome, a seed tank with a
//                            Rootling growing inside, pruning shears; `special` sows seeds and sprays sap
//                            (its summon and its heal).
//
// The Director plays `special` for charge-type enemy actions (buff, heal, summon, lockOn, charge) and
// `attack` (or the action's `pose`, e.g. pose: 'special' for Pollen) for everything else.

import { rng } from '../../art/painter.js';
import {
  rp, WHITE, DEG, clamp, GUN, STEEL, BRONZE, G_AMBER, spark, sparks, smoke, spot, polar, along, limbPlate,
} from '../prologue/enemyart.js';

// ---------------------------------------------------------------- colours

const LEAF = rp('#071810', '#0d2a16', '#164020', '#20582a', '#2d7234', '#3e8e40', '#5aac50', '#8cd070');
const LEAF_FAR = rp('#05100a', '#0a1e10', '#112e18', '#1a4020', '#245428', '#2f6a30');
const STALK = rp('#0c1a0e', '#163018', '#224a22', '#30622c', '#437c38', '#5a9646', '#78b25a', '#a2d27a');
const BLADE = rp('#0e2418', '#183c26', '#245a34', '#337a44', '#4a9a52', '#6aba64', '#96d880', '#d0f4aa');
const PETAL = rp('#2a0718', '#4f0f30', '#7c1a4c', '#ae2c6c', '#da4d8e', '#f37fb2', '#ffb6d5', '#ffe2ef');
const FUNGUS = rp('#140a26', '#22123e', '#341c58', '#4a2a76', '#623a94', '#7e50b2', '#9e70ce', '#c8a2ea');
const GILL = rp('#0d0814', '#1a0f26', '#2a173c');
const HYPHA = rp('#241b38', '#43365e', '#6c5d8c', '#a090c0');
const MYCEL = rp('#26222c', '#3e3946', '#5c5664', '#807a86', '#a8a2aa', '#d0cbcd', '#efebe6');
const BARK = rp('#160c08', '#2a170e', '#432616', '#5e391f', '#7a4e2c', '#98673c', '#b8864f', '#dcae74');
const SHELL = rp('#16150f', '#27251d', '#3d392d', '#585240', '#787058', '#9d9476', '#c4bb9a', '#e8e2c6');
const SERVICE = rp('#0a1f17', '#0f3426', '#16503a', '#1f6e4f', '#2d8f66', '#45b083');
const MOSS = rp('#0b1a06', '#14290a', '#1f3e0e', '#2c5512', '#3c6e17', '#53891f', '#71a52c');
const GLASS = rp('#06141a', '#0b222b', '#12333e', '#1b4753', '#2a5f6b', '#4a8590', '#86bcc2', '#d4f2f2');

// glow ramps, outer (dim) -> inner (hot)
const G_BIO = rp('#0b4350', '#0f6a78', '#16a0a8', '#4dffe0', '#d9fff6');
const G_BIO_DIM = rp('#06262e', '#0a343c', '#0e4651', '#135a63', '#1f6e72');
const G_POLLEN = rp('#4a3608', '#8a6a12', '#e8c43a', '#fff07a', '#fffbe0');
const G_PINK = rp('#4f0f30', '#a8246a', '#ff4fa0', '#ff9ccb', '#ffe6f2');
const G_SAP = rp('#16380a', '#2c6a12', '#5cc22a', '#b0f56a', '#f0ffd8');
const G_STEEL_GLINT = rp('#3a6a8a', '#8fc8e8', '#d8f0ff', '#f4fbff', '#ffffff');
const G_SAP_DIM = rp('#0c1c06', '#142a0a', '#1d3c0e', '#284f12', '#346218');

// ---------------------------------------------------------------- organic helpers

/**
 * Pointed leaf / petal / blade from (x, y) along `ang` (degrees), folded on its midrib so one half
 * catches the key light. o: { bend (px, curls the midrib), shape (<1 widens the base), rib (ramp index
 * of the midrib, null for none), vein (glow ramp for a glowing midrib), veinK, max, bias, bevel, cup }.
 */
function leaf(r, x, y, ang, len, w, ramp, o = {}) {
  const b = [x, y], t = polar(x, y, ang, len);
  const n = Math.max(4, Math.round(len / 1.6));
  const bend = o.bend || 0, shape = o.shape ?? 0.7;
  const mid = (s) => along(b, t, s, bend * Math.sin(Math.PI * s));
  const half = (s) => w * Math.pow(Math.sin(Math.PI * Math.pow(s, shape)), 0.85);
  const L = [], R = [], M = [b];
  for (let i = 1; i < n; i++) {
    const s = i / n, c = bend * Math.sin(Math.PI * s), hw = half(s);
    L.push(along(b, t, s, c + hw));
    R.push(along(b, t, s, c - hw));
    M.push(mid(s));
  }
  M.push(t);
  const a = ang * DEG, px = Math.sin(a), py = -Math.cos(a), f = o.cup ? -0.6 : 0.6;
  const base = { bevel: o.bevel ?? 0, max: o.max ?? ramp.length - 1, bias: o.bias || 0 };
  r.poly([b, ...L, t, ...[...M].reverse()], ramp, { ...base, n: [px * f, py * f - 0.1, 0.8] });
  r.poly([b, ...M.slice(1), ...[...R].reverse()], ramp, { ...base, n: [-px * f, -py * f - 0.1, 0.8], bias: (o.bias || 0) - 0.04 });
  if (o.rib != null || o.vein) {
    const c = o.vein ? o.vein[3] : ramp[o.rib];
    for (let i = 0; i < M.length - 2; i++) {
      r.line(Math.round(M[i][0]), Math.round(M[i][1]), Math.round(M[i + 1][0]), Math.round(M[i + 1][1]), c, o.vein ? o.veinK ?? 0.6 : 0);
    }
  }
}

/** Fern frond: a curling stem with alternating leaflets that shrink toward the tip. */
function fern(r, x, y, ang, len, curl, ramp, o = {}) {
  const step = 2, pts = [];
  let px = x, py = y, a = ang;
  for (let d = 0; d <= len; d += step) {
    pts.push([px, py, a]);
    px += Math.cos(a * DEG) * step;
    py += Math.sin(a * DEG) * step;
    a += curl * step * (1 + d / len);
  }
  const size = o.leaflet ?? 4.5;
  for (let i = 1; i < pts.length; i++) {
    const [lx, ly, la] = pts[i], s = 1 - i / pts.length;
    const sz = 1.2 + s * size;
    for (const side of [-1, 1]) leaf(r, lx, ly, la + side * (62 - s * 10), sz, sz * 0.36, ramp, { max: o.max, bias: o.bias });
  }
  for (let i = 0; i < pts.length - 1; i++) {
    r.line(Math.round(pts[i][0]), Math.round(pts[i][1]), Math.round(pts[i + 1][0]), Math.round(pts[i + 1][1]), ramp[3]);
  }
}

/** Hanging vine: a sagging strand from (x, y) with small leaves; `ph` sways it. */
function vine(r, x, y, len, ph, sway, far) {
  const ramp = far ? LEAF_FAR : STALK;
  let px = x, py = y;
  for (let k = 1; k <= len; k++) {
    const nx = x + Math.sin(ph + k * 0.32) * sway * (k / len), ny = y + k;
    r.line(Math.round(px), Math.round(py), Math.round(nx), Math.round(ny), ramp[k < 3 ? 4 : 3]);
    if (k % 4 === 2) leaf(r, nx, ny, k & 4 ? 20 : 160, 3.4, 1.3, far ? LEAF_FAR : LEAF, { max: far ? 4 : 6 });
    px = nx; py = ny;
  }
}

/** Fixed per-pixel noise in 0..1 (moss and lichen masks). */
const noise = (x, y, seed = 0) => {
  const s = Math.sin(Math.floor(x) * 12.9898 + Math.floor(y) * 78.233 + seed * 37.719) * 43758.5453;
  return s - Math.floor(s);
};

// ---------------------------------------------------------------- SPORE DRONE (56x60)

/** Hyphal tendril hanging from (x, y): thick and pale at the root, thinning to a glowing spore bead. */
function tendril(r, x, y, len, ph, amp, bead, k) {
  let px = x, py = y;
  for (let i = 1; i <= len; i++) {
    const t = i / len;
    const nx = x + Math.sin(ph + t * 3.4) * amp * t, ny = y + i;
    r.line(Math.round(px), Math.round(py), Math.round(nx), Math.round(ny), HYPHA[t < 0.3 ? 3 : t < 0.65 ? 2 : 1]);
    if (t < 0.4) r.line(Math.round(px) + 1, Math.round(py), Math.round(nx) + 1, Math.round(ny), HYPHA[0]);
    px = nx; py = ny;
  }
  r.glow(px + 0.5, py + 1.5, 1.8, 1.8, bead, { k, bias: 0.35 });
}

/** Round bioluminescent spot with a hot centre (bigger and softer than the toolkit's cross-shaped spot). */
function bioSpot(r, x, y, rad, ramp, k) {
  if (rad < 1.5) {
    r.dot(Math.round(x), Math.round(y), ramp[3], k);
    return;
  }
  r.glow(x, y, rad, rad * 0.85, ramp, { k, bias: 0.3 });
  if (k > 0.5) r.dot(Math.round(x - 0.5), Math.round(y - 0.5), ramp[4], k);
}

function drawSporeDrone(r, P) {
  const glowK = P.glow ?? 1, gk = clamp(glowK, 0.2, 1.4);
  const g = glowK > 0.55 ? G_BIO : G_BIO_DIM;
  const cx = 26, cy = 27, rx = 18 + (P.capW || 0), ry = 15 + (P.capH || 0);
  const ph = P.phase || 0;

  r.save();
  r.translate(P.dx || 0, P.bob || 0);
  r.rotate(P.tilt || 0, 27, 36);

  // hyphae hang behind the body; beads glow teal and gold
  const limp = P.limp ? 0.4 : 1;
  for (const [x, len, p, gold] of [[10, 11, 0, 0], [18, 18, 1.4, 1], [35, 15, 2.7, 0], [42, 9, 4.1, 1]]) {
    tendril(r, x, cy + 3, Math.round(len * (P.reach ?? 1)), ph + p, 3.6 * limp, gold ? G_POLLEN : g, gk * (gold ? 0.8 : 1));
  }

  // the pollinator drone the puffball grew through: a bent rotor arm, the ceramic shell, a lens
  r.begin();
  r.seg(20, 41, 9, 37, 1.3, 1, GUN, { caps: 'flat', max: 5 });
  r.end(0.5);
  const ra = P.rotor || 0;
  r.line(9, 37, Math.round(9 + Math.cos(ra) * 5), Math.round(36 - Math.sin(ra) * 1.5), STEEL[5]);
  r.line(9, 37, Math.round(9 - Math.cos(ra) * 4), Math.round(37 + Math.sin(ra) * 1.5), STEEL[3]);
  r.dot(9, 37, GUN[6]);
  r.begin();
  r.ball(27, 41, 8.6, 8, SHELL, { max: 6, spec: SHELL[7], specT: 0.975 });
  r.ball(27, 41, 8.6, 8, SERVICE, { clip: (x, y) => Math.abs(y - 42.5 - (x - 27) * 0.12) < 1.1, max: 4 });
  r.ball(27, 41, 8.6, 8, GUN, { clip: (x, y) => y > 45.5 + (x - 27) * 0.12, max: 4 });
  r.end(0.6);
  // rotor hub under the shell, two blades blurred into a disc
  r.begin();
  r.seg(27, 48, 27, 51, 1.6, 1.1, GUN, { caps: 'flat', max: 5 });
  r.end(0.5);
  for (let k = 0; k < 2; k++) {
    const a = ra * 1.7 + k * Math.PI;
    r.line(27, 51, Math.round(27 + Math.cos(a) * 8), Math.round(51 + Math.sin(a) * 1.4), STEEL[4 + k]);
  }
  for (let x = -7; x <= 7; x += 2) r.dot(27 + x + (Math.round(ra * 3) & 1), 51, STEEL[2]);
  // lens: an amber eye clouded with mycelium
  const lk = clamp(P.lens ?? 0.8, 0.15, 1.3);
  r.begin();
  r.ring(33.5, 41.5, 2, 3.6, GUN, { spec: GUN[7], specT: 0.97 });
  r.end(0.5);
  r.glow(33.7, 41.5, 2.3, 2.3, lk > 0.5 ? G_AMBER : G_SAP_DIM, { k: lk, bias: 0.2 });
  if (lk > 0.5) r.dot(33, 40, WHITE, 1);
  r.line(31, 42, 35, 40, MYCEL[4]);
  // mycelium creeping down over the shell
  for (const [x0, x1, len] of [[22, 21, 4], [31, 33, 5]]) {
    for (let k = 0; k < len; k++) r.dot(Math.round(x0 + ((x1 - x0) * k) / len), cy + 5 + k, MYCEL[k & 1 ? 4 : 5]);
  }

  // gills under the cap: dark radial folds lit from within
  r.each(cx - rx, cy, cx + rx, cy + 6, (mx, my, X, Y) => {
    const u = (mx - cx) / (rx * 0.88), v = (my - cy - 1) / 3.6;
    if (v < 0 || u * u + v * v > 1) return;
    const fold = Math.abs((((u * 9) % 1) + 1) % 1 - 0.5) < 0.2;
    r.put(X, Y, fold ? GILL[0] : GILL[2]);
    if (!fold && v < 0.7) r.put(X, Y, g[1], 0.4 * gk);
  });
  // the cap: a violet puffball dome with a rolled lip, warts and two buds
  r.begin();
  r.ball(cx, cy + 0.5, rx + 0.6, 2.6, FUNGUS, { clip: (x, y) => y > cy - 1, max: 6, bias: 0.06 });
  r.ball(cx, cy, rx, ry, FUNGUS, { clip: (x, y) => y < cy, max: 6, spec: FUNGUS[7], specT: 0.975, bounce: 0.3 });
  r.ball(cx - 10 - (P.capW || 0) * 0.4, cy - ry + 4, 4.4, 4, FUNGUS, { max: 7, spec: FUNGUS[7], specT: 0.96 });
  r.ball(cx + 8 + (P.capW || 0) * 0.3, cy - ry + 2.6, 3.4, 3.2, FUNGUS, { max: 7, spec: FUNGUS[7], specT: 0.96 });
  r.end(0.6);
  const W = rng(5);
  for (let k = 0; k < 22; k++) {
    const u = W() * 2 - 1, v = -W();
    if (u * u + v * v > 0.85) continue;
    const x = Math.round(cx + u * rx), y = Math.round(cy + v * ry);
    r.dot(x, y, FUNGUS[7]);
    r.dot(x + 1, y + 1, FUNGUS[2]);
  }
  // bioluminescent spots (they pulse in a wave across the cap)
  const SPOTS = [[-0.52, -0.45, 2.6], [0.12, -0.7, 2.6], [0.58, -0.38, 2.2], [-0.18, -0.2, 2], [0.34, -0.08, 1.8], [-0.8, -0.12, 1], [0.84, -0.14, 1], [-0.3, -0.78, 1], [0.6, -0.72, 1]];
  SPOTS.forEach(([u, v, s], i) => {
    const pulse = 0.65 + 0.35 * Math.sin((P.pulse || 0) + i * 1.3);
    bioSpot(r, cx + u * rx, cy + v * ry, s, g, gk * pulse * (P.spotK ?? 1));
  });
  r.restore();

  // drifting spores and the two pollen moves
  if (P.motes) {
    const R = rng(P.motes);
    for (let k = 0; k < 4; k++) spot(r, 8 + R() * 38, 2 + R() * 9, R() < 0.3 ? 2 : 1, G_POLLEN, 0.7);
  }
  if (P.puff) {
    const R = rng(P.puff * 7);
    const x0 = cx + rx * 0.9 + (P.dx || 0), y0 = cy + 2 + (P.bob || 0);
    r.glow(x0 + 6, y0, 5 + P.puff * 0.5, 3.5, G_POLLEN, { fx: true, bias: 0.1, k: 0.75 });
    for (let k = 0; k < 10; k++) spot(r, x0 + 2 + R() * (7 + P.puff * 1.6), y0 - 4 + R() * 8, R() < 0.4 ? 2 : 1, G_POLLEN, 0.9);
  }
  if (P.burst) {
    const R = rng(11);
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2 + R() * 0.3, d = P.burst * (0.75 + R() * 0.4);
      const x = cx + Math.cos(a) * d * 1.15, y = cy - 6 + Math.sin(a) * d * 0.9 + (P.bob || 0);
      if (R() < 0.35) spark(r, Math.round(x), Math.round(y), 1, G_POLLEN);
      else spot(r, x, y, R() < 0.5 ? 2 : 1, G_POLLEN, 0.9);
    }
  }
  if (P.drips) {
    for (const [x, y] of P.drips) spot(r, x, y, 1, G_POLLEN, 0.6);
  }
}

const SPORE_DRONE = {
  w: 56, h: 60,
  bevel: 2,
  draw: drawSporeDrone,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { bob: 0, phase: 0, pulse: 0, rotor: 0, motes: 3 },
      { bob: -1, phase: 1.5, pulse: 1.5, capH: 0.5, rotor: 1, motes: 4 },
      { bob: -2, phase: 3, pulse: 3, capH: 1, capW: 0.5, rotor: 2, motes: 5 },
      { bob: -1, phase: 4.5, pulse: 4.5, capH: 0.5, rotor: 3, motes: 6 },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { bob: -1, dx: -1, capH: 1.5, capW: -1, phase: 1, pulse: 2, glow: 1.2, rotor: 1 },
      { bob: 0, dx: 1, capH: -2.5, capW: 1.5, phase: 2.2, pulse: 3, glow: 1.3, puff: 4, rotor: 2 },
      { bob: 0, capH: -0.5, phase: 3, pulse: 4, puff: 7, rotor: 3 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { bob: -1, dx: -3, tilt: -0.24, capH: -2.5, capW: 1, glow: 0.45, lens: 0.3, phase: 2, reach: 0.85 },
    ] },
    break: { fps: 4, loop: true, poses: [
      { bob: 7, tilt: 0.42, capH: -4.5, capW: 1, glow: 0.3, spotK: 0.6, lens: 0.2, limp: 1, reach: 1.1, drips: [[34, 57], [21, 55]] },
      { bob: 8, tilt: 0.45, capH: -5, capW: 1.5, glow: 0.5, spotK: 0.7, lens: 0.35, limp: 1, reach: 1.15, pulse: 2, drips: [[34, 59], [22, 57]] },
    ] },
    special: { fps: 6, loop: false, order: [0, 0, 1, 1], poses: [
      { bob: -2, capH: 2, capW: 1.5, glow: 1.5, spotK: 1.3, pulse: 1, phase: 1, reach: 0.8 },
      { bob: 0, capH: -3, capW: 0.5, glow: 1.3, pulse: 3, phase: 3, burst: 19, puff: 3 },
    ] },
  },
  points: { center: [26, 32], muzzle: [46, 30], top: [26, 8] },
  icon: { x: 27, y: 27, scale: 0.6 },
};

// ---------------------------------------------------------------- BLOOM MANTIS (88x96)

/** Walking leg: hip -> knee (out to the side) -> foot, with a thorn at the knee and a hooked foot. */
function mantisLeg(r, hip, knee, foot, far) {
  const ramp = far ? LEAF_FAR : STALK;
  r.begin();
  r.seg(...hip, ...knee, 2.4, 1.9, ramp, { max: far ? 4 : 6, bounce: 0.3, spec: far ? null : ramp[7], specT: 0.96 });
  r.seg(...knee, ...foot, 1.9, 0.8, ramp, { caps: 'flat', max: far ? 4 : 6, bounce: 0.3 });
  r.ball(...knee, 2.4, 2.4, ramp, { max: far ? 4 : 7, spec: far ? null : ramp[7], specT: 0.93 });
  r.end(0.5);
  const th = polar(...knee, -75, 4);
  r.line(Math.round(knee[0]), Math.round(knee[1]) - 2, Math.round(th[0]), Math.round(th[1]), ramp[far ? 3 : 6]);
  r.dot(Math.round(th[0]), Math.round(th[1]), PETAL[far ? 3 : 5]);
  const dir = foot[0] >= hip[0] ? 1 : -1;
  r.line(Math.round(foot[0]), Math.round(foot[1]), Math.round(foot[0]) + dir * 2, Math.round(foot[1]), ramp[far ? 1 : 2]);
}

/**
 * Raptorial arm: a thick spined femur to the elbow, then a broad leaf-blade scythe from the elbow to
 * the tip, serrated on the inner edge and glowing on the outer one. `curve` bows the blade.
 */
function scythe(r, sh, el, tip, curve, far, gk) {
  const ramp = far ? LEAF_FAR : STALK;
  r.begin();
  r.seg(...sh, ...el, 3.3, 2.7, ramp, { max: far ? 4 : 6, bounce: 0.3, spec: far ? null : ramp[7], specT: 0.96 });
  r.ball(...el, 2.9, 2.9, ramp, { max: far ? 4 : 7, spec: far ? null : ramp[7], specT: 0.93 });
  r.end(0.5);
  for (const s of [0.35, 0.6, 0.85]) {
    const b = along(sh, el, s, -2.6), t = along(sh, el, s - 0.12, -6);
    r.line(Math.round(b[0]), Math.round(b[1]), Math.round(t[0]), Math.round(t[1]), ramp[far ? 3 : 6]);
  }
  const n = 10, outer = [], inner = [], ridge = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, bow = curve * Math.sin(Math.PI * s);
    const w = 7 * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.5)), 0.8) * (1 - s * 0.25) + 0.4;
    outer.push(along(el, tip, s, bow + w * 0.55));
    inner.push(along(el, tip, s, bow - w * 0.45));
    ridge.push(along(el, tip, s, bow + w * 0.12));
  }
  r.begin();
  r.poly([...ridge, ...[...inner].reverse()], far ? LEAF_FAR : BLADE, { n: [0.3, 0.2, 0.93], bevel: 1, max: far ? 3 : 5 });
  r.poly([...outer, ...[...ridge].reverse()], far ? LEAF_FAR : BLADE, { n: [-0.35, -0.55, 0.76], bevel: 1, max: far ? 4 : 7 });
  r.end(0.55);
  for (let i = 1; i < n; i++) {
    const q = inner[i];
    r.dot(Math.round(q[0]), Math.round(q[1]), i & 1 ? BLADE[1] : BLADE[far ? 3 : 7]);
  }
  if (gk > 0) {
    const g = gk > 0.55 ? G_BIO : G_BIO_DIM;
    for (let i = 1; i < n; i++) {
      const a = outer[i], b = outer[i + 1];
      r.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), g[far ? 2 : 3], (far ? 0.4 : 0.85) * Math.min(1.2, gk));
    }
  }
}

/** The bloom head: two rings of petals around a glowing pistil eye, with gold-tipped stamens. */
function bloom(r, cx, cy, open, gk, wilt, tilt) {
  const ring = (count, a0, len, w, bias, max) => {
    for (let k = 0; k < count; k++) {
      const a = (a0 + (k * 360) / count + tilt) * DEG;
      const dx = Math.cos(a) * 0.8, dy = Math.sin(a) + wilt * 0.95;
      const ang = Math.atan2(dy, dx) / DEG;
      const l = len * open * Math.min(1.1, Math.hypot(dx, dy)) * (1 - wilt * 0.12);
      leaf(r, cx, cy, ang, l, w, PETAL, { shape: 0.5, bias, max, bevel: 1, rib: max - 2, cup: true });
    }
  };
  r.begin();
  ring(6, 15, 17, 6, -0.1, 6);
  r.end(0.55);
  r.begin();
  ring(5, 52, 12.5, 5, 0.04, 7);
  r.end(0.55);
  for (const [a, l] of [[-75, 10], [-45, 11], [-105, 9]]) {
    const t = polar(cx + 1, cy - 2, a + tilt * 0.5 + wilt * 70, l * open);
    r.line(Math.round(cx + 1), Math.round(cy - 2), Math.round(t[0]), Math.round(t[1]), STALK[6]);
    spot(r, t[0], t[1], 2, G_POLLEN, clamp(gk, 0.2, 1.1) * 0.8);
  }
  r.begin();
  r.ball(cx + 0.5, cy, 4.4, 4.8, BARK, { max: 6, bias: 0.05 });
  r.end(0.5);
  r.glow(cx + 1.2, cy, 3.2, 3.4, gk > 0.55 ? G_BIO : G_BIO_DIM, { k: clamp(gk, 0.2, 1.3), bias: gk > 1 ? 0.6 : 0.25 });
  r.ball(cx + 2, cy + 0.2, 0.9, 1.6, BARK.slice(0, 2), { bounce: 0 });
  if (gk > 0.55) r.dot(Math.round(cx), Math.round(cy - 2), WHITE, 1);
}

function drawMantis(r, P) {
  const gk = P.glow ?? 1;
  const tx = P.tx || 0, ty = P.ty || 0;
  const A = P.arms || {};
  const near = A.near || { el: [63, 47], tip: [60, 72], curve: 4.5 };
  const farA = A.far || { el: [61, 43], tip: [64, 64], curve: 4.5 };
  const upper = () => {
    r.translate(tx, ty);
    r.rotate(P.lean || 0, 40, 62);
  };
  const L = P.legs || {};

  // far legs, darker
  mantisLeg(r, [44 + tx, 61 + ty], ...(L.farF || [[56, 52], [66, 90]]), true);
  mantisLeg(r, [37 + tx, 61 + ty], ...(L.farB || [[27, 52], [20, 90]]), true);

  // abdomen: a segmented pod under two folded leaf wings with glowing veins
  r.save();
  r.translate(tx, ty);
  r.rotate(P.abd || 0, 40, 62);
  r.begin();
  r.seg(40, 61, 13, 71, 8.4, 3.6, STALK, { max: 6, spec: STALK[7], specT: 0.965, bounce: 0.35 });
  r.end(0.6);
  // pale belly: the part of the pod below its axis (offset along the downward normal)
  r.seg(40, 61, 13, 71, 8.4, 3.6, BLADE, { clip: (x, y) => (x - 40) * 0.347 + (y - 61) * 0.937 > 3.4 - (40 - x) * 0.07, max: 6, bias: 0.04 });
  for (let k = 1; k <= 5; k++) {
    const rad = 8.4 - k * 0.8;
    const a = along([40, 61], [13, 71], k * 0.16, -rad * 0.95), b = along([40, 61], [13, 71], k * 0.16 + 0.03, rad * 0.4);
    r.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), STALK[2]);
  }
  for (const [s, sz] of [[0.12, 2], [0.3, 2], [0.48, 2], [0.66, 1]]) {
    const q = along([40, 61], [13, 71], s, 8.4 * (1 - s * 0.55) * 0.55);
    spot(r, q[0], q[1], sz, gk > 0.55 ? G_BIO : G_BIO_DIM, clamp(gk, 0.2, 1.2) * 0.8);
  }
  const vk = (gk > 0.55 ? 0.5 : 0.25) * gk;
  r.begin();
  leaf(r, 42, 55, 172 + (P.wing || 0), 29, 6.4, LEAF, { bend: 3, shape: 0.6, max: 6, bevel: 1, vein: gk > 0.55 ? G_BIO : G_BIO_DIM, veinK: vk });
  r.end(0.55);
  r.begin();
  leaf(r, 43, 52, 164 + (P.wing || 0) * 1.4, 25, 5.2, BLADE, { bend: 2, shape: 0.6, max: 7, bevel: 1, bias: 0.02, vein: gk > 0.55 ? G_BIO : G_BIO_DIM, veinK: vk });
  r.end(0.55);
  r.restore();

  r.save();
  upper();
  scythe(r, [49, 40], farA.el, farA.tip, farA.curve, true, gk);
  // thorax: a long stalk neck under leaf sheaths
  r.begin();
  r.seg(40, 62, 47, 46, 5.6, 4.6, STALK, { max: 6, spec: STALK[7], specT: 0.96, bounce: 0.3 });
  r.seg(47, 46, 53, 31, 4.6, 3.4, STALK, { max: 6, spec: STALK[7], specT: 0.96, bounce: 0.3 });
  r.end(0.6);
  for (const [x, y, a, l] of [[42, 59, -128, 9], [45, 51, -122, 8], [48, 43, -116, 7], [51, 36, -110, 6]]) {
    r.begin();
    leaf(r, x, y, a, l, 3, BLADE, { max: 7, bevel: 1, rib: 5, bias: -0.04 });
    r.end(0.45);
  }
  r.save();
  const hd = P.head || [0, 0];
  r.translate(hd[0], hd[1]);
  r.begin();
  r.seg(53, 31, 57, 26, 2.8, 2.3, STALK, { max: 6 });
  r.end(0.5);
  bloom(r, 59, 21, P.open ?? 1, gk, P.wilt || 0, P.headTilt || 0);
  r.restore();
  r.restore();

  // near legs over the body
  mantisLeg(r, [45 + tx, 64 + ty], ...(L.nearF || [[60, 55], [73, 93]]), false);
  mantisLeg(r, [37 + tx, 64 + ty], ...(L.nearB || [[23, 55], [11, 93]]), false);

  // near scythe in front of everything
  r.save();
  upper();
  scythe(r, [51, 42], near.el, near.tip, near.curve, false, gk);
  r.restore();

  if (P.slash) {
    // two crossing teal arcs: the double slash
    const [sx, sy] = P.slash;
    for (const [a0, a1, rad, c] of [[-70, 80, 16, 4], [-50, 100, 11, 3]]) {
      for (let a = a0; a <= a1; a += 3) {
        const p = polar(sx, sy, a, rad);
        r.dot(Math.round(p[0]), Math.round(p[1]), G_BIO[a > a1 - 25 ? c - 2 : c], 1, true);
        r.dot(Math.round(p[0]) - 1, Math.round(p[1]), G_BIO[c - 2], 0.6, true);
      }
    }
    spark(r, sx + 12, sy + 9, 2, G_BIO);
  }
  if (P.petals) {
    for (const [x, y, a] of P.petals) {
      r.begin();
      leaf(r, x, y, a, 5, 2, PETAL, { shape: 0.5, max: 5, bias: -0.06, cup: true });
      r.end(0.5);
    }
  }
  if (P.motes) {
    const R = rng(P.motes);
    for (let k = 0; k < 3; k++) spot(r, 48 + R() * 30, 2 + R() * 10, 1, G_POLLEN, 0.7);
  }
}

const MANTIS_WILT_LEGS = {
  farF: [[58, 62], [67, 91]], farB: [[26, 62], [19, 91]],
  nearF: [[62, 66], [75, 93]], nearB: [[22, 66], [10, 93]],
};

const BLOOM_MANTIS = {
  w: 88, h: 96,
  bevel: 3,
  draw: drawMantis,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { open: 1, motes: 1 },
      { lean: -0.015, open: 1.04, ty: -1, wing: -2, head: [0, -1], motes: 2,
        arms: { near: { el: [63, 46], tip: [60, 71], curve: 4.5 }, far: { el: [61, 42], tip: [64, 63], curve: 4.5 } } },
      { lean: -0.025, open: 1.07, ty: -1, wing: -3, abd: -0.02, head: [0, -1], headTilt: 5, motes: 3,
        arms: { near: { el: [63, 45], tip: [61, 70], curve: 5 }, far: { el: [61, 41], tip: [65, 62], curve: 5 } } },
      { lean: -0.01, open: 1.03, wing: -1, abd: -0.01, headTilt: 2, motes: 4 },
    ] },
    attack: { fps: 9, loop: false, poses: [
      { lean: -0.1, open: 1.1, ty: -1, head: [-1, -2], glow: 1.3, wing: -6,
        arms: { near: { el: [67, 29], tip: [56, 9], curve: -4 }, far: { el: [64, 27], tip: [53, 8], curve: -4 } } },
      { lean: 0.12, tx: 4, open: 0.95, head: [2, 2], glow: 1.4, wing: 5, slash: [72, 54],
        arms: { near: { el: [75, 45], tip: [86, 70], curve: 5 }, far: { el: [72, 41], tip: [84, 62], curve: 5 } } },
      { lean: 0.05, tx: 2, open: 1, head: [1, 1], glow: 1.1,
        arms: { near: { el: [69, 49], tip: [69, 71], curve: 4 }, far: { el: [66, 46], tip: [66, 67], curve: 4 } } },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { lean: -0.15, tx: -3, open: 0.7, head: [-2, -1], headTilt: -14, glow: 0.45, wing: 7,
        arms: { near: { el: [61, 39], tip: [69, 57], curve: 3 }, far: { el: [58, 36], tip: [65, 53], curve: 3 } } },
    ] },
    break: { fps: 4, loop: true, poses: [
      { lean: 0.38, ty: 9, open: 0.85, wilt: 0.9, head: [1, 3], headTilt: 28, glow: 0.3, abd: -0.08, wing: 6, legs: MANTIS_WILT_LEGS,
        arms: { near: { el: [60, 58], tip: [56, 78], curve: 2 }, far: { el: [58, 55], tip: [54, 75], curve: 2 } },
        petals: [[66, 92, 10], [76, 93, 165], [54, 93, 200]] },
      { lean: 0.4, ty: 9, open: 0.82, wilt: 1, head: [1, 4], headTilt: 32, glow: 0.5, abd: -0.08, wing: 7, legs: MANTIS_WILT_LEGS,
        arms: { near: { el: [60, 59], tip: [56, 79], curve: 2 }, far: { el: [58, 56], tip: [54, 76], curve: 2 } },
        petals: [[66, 92, 10], [76, 93, 165], [54, 93, 200], [82, 92, 30]] },
    ] },
  },
  points: { center: [46, 52], muzzle: [74, 34], top: [58, 4] },
  icon: { x: 59, y: 22, scale: 0.7 },
};

// ---------------------------------------------------------------- ROOTLING (44x40)

function drawRootling(r, P) {
  const gk = P.glow ?? 1, g = gk > 0.55 ? G_BIO : G_BIO_DIM;
  const sq = P.squash || 0;
  // the whole sprout is drawn 1.15x around its feet
  const frame = () => {
    r.translate(4 + (P.bx || 0), 4 + (P.by || 0));
    r.translate(21, 39).scale(1.15).translate(-21, -39);
    r.rotate(P.rot || 0, 21, 36);
  };
  r.save();
  frame();

  // root legs and arms (far ones first)
  const legs = P.legs || [0, 0, 0];
  const root = (a, b, w, far) => {
    r.begin();
    r.seg(...a, ...b, w, 0.6, far ? BARK.slice(0, 6) : BARK, { max: far ? 3 : 6, bounce: 0.3 });
    r.end(0.45);
  };
  root([20, 32], [19 + legs[2], 38], 1.6, true);
  root([28, 27], [33 + (P.arm || 0), 31 - (P.arm || 0)], 1.2, true);
  // bulb: a bark turnip with a pointed root tail and furrows
  const ry = 9.5 - sq, rx = 9 + sq * 0.6;
  r.begin();
  r.ball(21, 27 + sq, rx, ry, BARK, { max: 6, spec: BARK[7], specT: 0.965, bounce: 0.3 });
  r.seg(14, 31, 9, 36, 2.2, 0.4, BARK, { max: 5 });
  r.end(0.6);
  // bark furrows run pole to pole like a turnip's, each with a lit lip
  for (const f of [-0.62, -0.18, 0.3]) {
    for (let t = -1.2; t <= 1.15; t += 0.12) {
      const x = Math.round(21 + Math.cos(t) * rx * f), y = Math.round(27 + sq + Math.sin(t) * ry * 0.92);
      r.dot(x, y, BARK[1]);
      if (t < 0.6) r.dot(x - 1, y, BARK[f < 0 ? 6 : 5]);
    }
  }
  // moss and glowing lichen
  r.ball(21, 27 + sq, rx, ry, MOSS, { clip: (x, y) => y < 22 + sq && noise(x, y, 3) > 0.45, max: 5 });
  spot(r, 14, 26 + sq, 1, g, gk * 0.8);
  spot(r, 18, 32 + sq, 1, g, gk * 0.6);
  // face: two eye hollows with teal lights, a crack of a mouth
  const ek = clamp(gk, 0.2, 1.3);
  for (const [x, y, s] of [[24.5, 25, 2], [28.5, 25.5, 2]]) {
    r.ball(x, y + sq, 1.8, 1.6, BARK.slice(0, 3), { bounce: 0 });
    spot(r, x, y + sq, s, g, ek);
  }
  const m = P.mouth || 0;
  r.line(24, 29 + sq, 28, 29 + sq + (m > 0 ? 1 : 0), BARK[0]);
  if (m > 0) r.line(25, 30 + sq, 27, 30 + sq, BARK[0]);

  // sprout: two leaves and a glowing pink bud
  const sw = P.sway || 0;
  r.seg(20, 18 + sq, 20 + sw * 0.3, 11 + sq * 0.7, 0.9, 0.7, STALK, { max: 6 });
  r.begin();
  leaf(r, 20, 15 + sq, -150 + sw * 3 + (P.leafA || 0), 10, 3.6, LEAF, { bend: -1.5, max: 7, bevel: 1, rib: 6 });
  leaf(r, 20.5, 14 + sq, -30 + sw * 3 - (P.leafA || 0), 11, 4, LEAF, { bend: 1.5, max: 7, bevel: 1, rib: 6 });
  r.end(0.5);
  r.begin();
  r.ball(20 + sw * 0.3, 10 + sq * 0.7, 1.9, 2.1, PETAL, { max: 6 });
  r.end(0.45);
  r.glow(20 + sw * 0.3, 10 + sq * 0.7, 1.4, 1.5, G_PINK, { k: clamp(gk, 0.2, 1) * 0.8, bias: 0.3 });
  r.restore();

  // near root legs and arm over the bulb
  r.save();
  frame();
  root([16, 33], [11 + legs[0], 38], 1.9, false);
  root([24, 34], [27 + legs[1], 38], 1.9, false);
  root([14, 27], [8 - (P.arm || 0), 30 - (P.arm || 0)], 1.4, false);
  r.restore();
  if (P.dirt) {
    const R = rng(P.dirt);
    for (let k = 0; k < 5; k++) r.dot(Math.round(10 + R() * 32), Math.round(44 + R() * 3), BARK[2 + (k & 1)]);
  }
}

const ROOTLING = {
  w: 52, h: 48,
  bevel: 2,
  draw: drawRootling,
  anims: {
    idle: { fps: 6, loop: true, poses: [
      { sway: 0, legs: [0, 0, 0] },
      { sway: 1, by: -1, squash: -0.5, leafA: 4, legs: [0, 1, 0] },
      { sway: 2, by: -2, squash: -1, leafA: 8, arm: 1, legs: [-1, 1, 0] },
      { sway: 1, by: 0, squash: 0.6, leafA: 2, legs: [0, 0, 1] },
    ] },
    attack: { fps: 9, loop: false, poses: [
      { by: 1, bx: -2, squash: 2, rot: -0.12, leafA: -10, arm: 2, glow: 1.3, legs: [-1, -1, 0] },
      { by: -5, bx: 7, squash: -1.5, rot: 0.3, leafA: 14, sway: -3, mouth: 1, glow: 1.4, legs: [3, 3, 2] },
      { by: 0, bx: 4, squash: 1.2, rot: 0.08, leafA: 6, mouth: 1, dirt: 3, legs: [1, 1, 1] },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { bx: -3, by: -1, rot: -0.28, squash: -1, leafA: 18, sway: -2, glow: 0.4, mouth: 1 },
    ] },
    break: { fps: 4, loop: true, poses: [
      { bx: 12, by: 1, rot: -1.05, squash: 0.5, leafA: -18, sway: -2, glow: 0.3, legs: [2, -1, 1], dirt: 4 },
      { bx: 12, by: 1, rot: -1.02, squash: 0.5, leafA: -15, sway: -1, glow: 0.5, legs: [1, 0, 2], dirt: 4 },
    ] },
  },
  points: { center: [25, 32], muzzle: [37, 32], top: [24, 6] },
  icon: { x: 27, y: 28, scale: 0.8 },
};

// ---------------------------------------------------------------- FERAL CARETAKER (96x88)

/** Spindly tripod leg wrapped in a vine: hip -> knee -> trowel foot. */
function caretakerLeg(r, hip, knee, foot, far) {
  const metal = far ? { max: 4, bias: -0.1 } : { max: 6 };
  r.begin();
  r.seg(...hip, ...knee, 2.6, 2.1, GUN, { caps: 'flat', ...metal, spec: far ? null : GUN[7], specT: 0.96 });
  r.seg(...knee, ...foot, 2, 1.5, GUN, { caps: 'flat', ...metal });
  limbPlate(r, hip, knee, [[0.05, -3.6], [0.05, 3.6], [0.75, 2.8], [0.75, -2.8]], SHELL, { max: far ? 4 : 6, bias: far ? -0.12 : 0 });
  r.ball(...knee, 2.8, 2.8, SHELL, { max: far ? 4 : 6, bias: far ? -0.12 : 0, spec: far ? null : SHELL[7], specT: 0.94 });
  r.end(0.5);
  r.begin();
  r.poly([[foot[0] - 4, foot[1] - 1.5], [foot[0] + 4, foot[1] - 1.5], [foot[0] + 5.5, foot[1] + 0.8], [foot[0] - 4.5, foot[1] + 0.8]], SHELL, { n: [0, -0.6, 0.8], bevel: 1, max: far ? 4 : 6, bias: far ? -0.12 : 0 });
  r.end(0.5);
  // vine coiling down the shin
  const ramp = far ? LEAF_FAR : LEAF;
  for (let k = 0; k <= 14; k++) {
    const s = k / 14, p = along(knee, foot, s * 0.8, Math.sin(s * 14) * 2.4);
    r.dot(Math.round(p[0]), Math.round(p[1]), ramp[Math.sin(s * 14) > 0 ? 5 : 2]);
  }
  const lp = along(knee, foot, 0.35, 2.5);
  leaf(r, lp[0], lp[1], 10, 4, 1.6, ramp, { max: far ? 4 : 6 });
}

function drawCaretaker(r, P) {
  const gk = P.glow ?? 1;
  const tk = clamp(P.tank ?? 1, 0.2, 1.8);
  const L = P.legs || {};
  const body = () => {
    r.translate(P.tx || 0, P.ty || 0);
    r.rotate(P.lean || 0, 46, 48);
  };
  r.save();
  body();
  const hips = [r.pt(36, 50), r.pt(56, 50), r.pt(47, 48)];
  r.restore();

  // far leg
  caretakerLeg(r, hips[2], L.far?.[0] || [51, 64], L.far?.[1] || [47, 82], true);

  r.save();
  body();
  // far arm: a watering lance raised over the dome, a sprinkler rose at its end
  const LA = P.lance || { el: [66, 22], rose: [75, 25] };
  r.begin();
  r.seg(54, 32, ...LA.el, 2, 1.7, GUN, { caps: 'flat', max: 4, bias: -0.08 });
  r.seg(...LA.el, ...LA.rose, 1.6, 1.3, GUN, { caps: 'flat', max: 4, bias: -0.08 });
  r.ball(...LA.el, 2.2, 2.2, SHELL, { max: 4, bias: -0.1 });
  r.end(0.5);
  r.begin();
  r.ball(LA.rose[0] + 1.5, LA.rose[1], 1.8, 3.2, SHELL, { max: 5, flat: 0.5 });
  r.end(0.5);
  for (let k = -1; k <= 1; k++) r.dot(Math.round(LA.rose[0] + 2.5), Math.round(LA.rose[1] + k * 1.5), GUN[1]);

  // seed tank on the back: a glass capsule of glowing sap with a Rootling sprouting inside
  const tx = 28, ty0 = 14, ty1 = 36;
  r.begin();
  r.seg(tx, ty0, tx, ty1, 6.6, 6.6, GLASS, { max: 5, spec: GLASS[7], specT: 0.96 });
  r.end(0.55);
  const level = ty0 + 7 - (P.slosh || 0);
  r.each(tx - 7, level, tx + 7, ty1 + 2, (mx, my, X, Y) => {
    if (Math.abs(mx - tx) > 5.6 || my < level + Math.sin(mx * 0.9 + (P.slosh || 0)) * 0.6) return;
    const d = Math.abs(mx - tx) / 5.6;
    const k = clamp(Math.floor((1 - d) * 3.2 + (my - level) * 0.04 + 0.6), 0, 4);
    r.put(X, Y, (tk > 0.55 ? G_SAP : G_SAP_DIM)[Math.min(4, k)], 0.55 * tk);
  });
  // the seedling inside: a dark bulb with two leaves
  r.ball(tx, 28, 3, 3.2, BARK.slice(0, 4), { max: 3 });
  leaf(r, tx, 25, -130, 4.5, 1.6, LEAF.slice(0, 5), { max: 4 });
  leaf(r, tx, 25, -50, 5, 1.8, LEAF.slice(0, 5), { max: 4 });
  for (const [x, y] of P.bubbles || [[25, 31], [30, 24], [27, 19]]) r.dot(x, y, G_SAP[4], 0.7 * tk);
  r.line(tx - 4, ty0 - 2, tx - 4, ty1 - 2, GLASS[7]);
  r.line(tx - 3, ty0 - 3, tx - 3, ty0 + 3, WHITE);
  // caps and clamps
  r.begin();
  r.seg(tx, ty1 + 2, tx, ty1 + 5, 7.2, 7.2, GUN, { caps: 'flat', max: 5 });
  r.rect(tx - 2, ty1 + 5, 4, 4, GUN[3]);
  r.end(0.55);
  const lid = P.lid || 0;
  r.save();
  r.rotate(-lid, tx - 7, ty0 - 2);
  r.begin();
  r.seg(tx, ty0 - 1, tx, ty0 - 4, 7.2, 7.2, GUN, { caps: 'flat', max: 6, spec: GUN[7], specT: 0.96 });
  r.ball(tx, ty0 - 4, 7.2, 2.4, GUN, { clip: (x, y) => y < ty0 - 4, max: 6 });
  r.end(0.55);
  r.restore();
  for (const y of [ty0 + 3, ty1 - 3]) r.line(tx - 6, y, tx + 6, y, GUN[2]);

  // dome body: mossy ceramic over a dark housing, a green service stripe, a leaf emblem
  r.begin();
  r.ball(46, 40, 18, 15, SHELL, { clip: (x, y) => y < 44 + (x - 46) * 0.08, max: 6, spec: SHELL[7], specT: 0.98 });
  r.ball(46, 40, 18, 15, GUN, { clip: (x, y) => y >= 44 + (x - 46) * 0.08, max: 5 });
  r.ball(46, 40, 18, 15, SERVICE, { clip: (x, y) => Math.abs(y - 40.5 - (x - 46) * 0.08) < 1.2, max: 5 });
  r.end(0.6);
  const MOSS_PATCH = [[42, 27, 9, 3.6], [53, 28, 4.5, 2.2], [32, 34, 3.5, 4], [36, 29, 3, 2]];
  const mossy = (x, y) => MOSS_PATCH.some(([px, py, mx, my]) => ((x - px) / mx) ** 2 + ((y - py) / my) ** 2 < 0.75 + 0.5 * noise(x, y, 7));
  r.ball(46, 40, 18, 15, MOSS, { clip: mossy, max: 6, spec: MOSS[6], specT: 0.98 });
  // panel seams, rivets, the emblem (a leaf in a ring)
  r.line(37, 44, 56, 45, GUN[1]);
  for (const x of [33, 41, 50, 58]) r.dot(x, Math.round(44.6 + (x - 46) * 0.08) + 2, GUN[5]);
  r.ring(41, 36, 2, 3.4, SERVICE, { max: 4 });
  leaf(r, 40, 37.5, -50, 3.6, 1.3, SERVICE, { max: 5 });
  // lens: a big amber eye under a brow, the caretaker's last warm light
  const lk = clamp(P.lens ?? 1, 0.15, 1.4);
  r.begin();
  r.ring(59.5, 36.5, 3.6, 6.4, GUN, { spec: GUN[7], specT: 0.97 });
  r.end(0.5);
  r.glow(59.8, 36.5, 4, 4, lk > 0.55 ? G_AMBER : G_SAP_DIM, { k: lk, bias: lk > 1 ? 0.7 : 0.2 });
  r.ball(61, 36.6, 1.2, 2, rp('#4a2008', '#2a1004'), { bounce: 0 });
  if (lk > 0.55) {
    r.dot(57, 34, WHITE, 1);
    r.dot(58, 33, G_AMBER[3], 1);
  }
  if (P.glitch) {
    r.line(54, 35, 66, 35, WHITE, 1);
    r.line(55, 38, 65, 38, G_AMBER[2], 0.6);
  }
  r.begin();
  r.poly([[53, 30], [61, 28.5], [67, 31.5], [66, 33], [60, 31], [54, 32.5]], SHELL, { n: [0.1, -0.8, 0.6], bevel: 1, max: 6 });
  r.end(0.5);

  // overgrowth: ferns on the dome, a pink bloom by the eye, vines hanging from the housing
  const sw = P.sway || 0;
  fern(r, 37, 30, -150 + sw - (P.droop || 0), 13, 3, LEAF, { leaflet: 3.6, max: 6, bias: -0.04 });
  fern(r, 42, 27, -116 + sw * 2 - (P.droop || 0), 19, 2.4 + (P.droop || 0) * 0.05, LEAF, { leaflet: 5, max: 7, bias: 0.04 });
  fern(r, 49, 26, -80 + sw * 2 + (P.droop || 0) * 0.6, 15, -2.6, LEAF, { leaflet: 4.4, max: 7, bias: 0.06 });
  const bl = P.droop ? 0.6 : 1;
  r.begin();
  for (let k = 0; k < 5; k++) leaf(r, 54, 28.5, k * 72 - 20 + sw * 6, 3.4 * bl, 1.6, PETAL, { shape: 0.5, max: 7, bias: 0.05 });
  r.end(0.45);
  spot(r, 54, 28.5, 1, G_POLLEN, clamp(gk, 0.2, 1));
  for (const [x, y, len, p] of [[34, 51, 12, 0], [44, 54, 15, 1.7], [55, 52, 9, 3.1]]) vine(r, x, y, Math.round(len * (P.vines ?? 1)), (P.phase || 0) + p, 1.6, false);

  // near arm: pruning shears on a jointed arm
  const S = P.shears || { el: [70, 54], wr: [80, 47], ang: -20, open: 0.35 };
  r.begin();
  r.seg(58, 47, ...S.el, 2.8, 2.4, SHELL, { caps: 'flat', max: 6, spec: SHELL[7], specT: 0.96 });
  r.seg(...S.el, ...S.wr, 2.4, 2, SHELL, { caps: 'flat', max: 6, spec: SHELL[7], specT: 0.96 });
  r.ball(58, 47, 3.4, 3.4, GUN, { max: 6, spec: GUN[7], specT: 0.95 });
  r.ball(...S.el, 2.8, 2.8, GUN, { max: 6, spec: GUN[7], specT: 0.95 });
  r.end(0.55);
  r.begin();
  for (const side of [-1, 1]) {
    const a = S.ang + side * S.open * 28;
    const tip = polar(...S.wr, a, 15);
    r.poly([along(S.wr, tip, -0.15, side * 2), along(S.wr, tip, 0.2, side * 3.4), tip, along(S.wr, tip, 0.55, -side * 0.6), along(S.wr, tip, -0.1, -side * 1)], STEEL, { n: [0, -0.5 * side, 0.86], bevel: 1, max: 7, spec: WHITE, specT: 0.985 });
  }
  r.ball(...S.wr, 2.2, 2.2, BRONZE, { max: 6, spec: BRONZE[7], specT: 0.93 });
  r.end(0.55);
  r.restore();

  // near legs
  caretakerLeg(r, hips[0], L.back?.[0] || [24, 60], L.back?.[1] || [19, 85], false);
  caretakerLeg(r, hips[1], L.front?.[0] || [70, 61], L.front?.[1] || [74, 85], false);

  // fx: snip spark, sowing seeds, sap spray, leaking sap, falling leaves
  if (P.snip) {
    const [x, y] = P.snip;
    spark(r, x, y, 3, G_STEEL_GLINT);
    sparks(r, 17, x, y, 6, 4, G_STEEL_GLINT);
  }
  if (P.seeds) {
    for (const [x, y] of P.seeds) {
      r.glow(x, y, 2.2, 2.2, G_SAP, { k: 1, bias: 0.3, fx: true });
      r.dot(Math.round(x), Math.round(y), WHITE, 1, true);
    }
  }
  if (P.spray) {
    const R = rng(P.spray);
    const [x0, y0] = [LA.rose[0] + 4 + (P.tx || 0), LA.rose[1] + (P.ty || 0)];
    for (let k = 0; k < 16; k++) {
      const d = 2 + R() * P.spray, a = -15 + R() * 40;
      const p = polar(x0, y0, a, d);
      spot(r, p[0], p[1] + d * d * 0.012, R() < 0.3 ? 2 : 1, G_SAP, 0.8);
    }
  }
  if (P.leak) {
    for (const [x, y, n] of P.leak) for (let k = 0; k < n; k++) r.dot(x, y + k, G_SAP[3 - Math.min(2, k >> 1)], 0.7);
    r.glow(P.leak[0][0] + 2, 86, 6, 1.4, G_SAP, { k: 0.6, fx: true, bias: 0.1 });
  }
  if (P.fall) {
    for (const [x, y, a] of P.fall) leaf(r, x, y, a, 3.5, 1.4, LEAF, { max: 6 });
  }
  if (P.smoke) smoke(r, P.smoke, 52, 22, 3.6);
}


const CARETAKER_KNEEL = {
  back: [[22, 76], [17, 86]], front: [[74, 76], [78, 86]], far: [[52, 76], [47, 84]],
};

const FERAL_CARETAKER = {
  w: 96, h: 88,
  bevel: 3,
  draw: drawCaretaker,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { sway: 0, phase: 0, bubbles: [[25, 31], [30, 24], [27, 19]] },
      { sway: 1, phase: 1.5, ty: -1, slosh: 0.5, bubbles: [[25, 29], [30, 34], [27, 22]],
        shears: { el: [70, 53], wr: [80, 46], ang: -24, open: 0.25 } },
      { sway: 2, phase: 3, ty: -1, slosh: 1, lens: 1.15, bubbles: [[26, 27], [30, 32], [27, 25]],
        shears: { el: [70, 53], wr: [80, 46], ang: -26, open: 0.45 } },
      { sway: 1, phase: 4.5, slosh: 0.5, bubbles: [[25, 33], [29, 29], [27, 23]] },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { lean: -0.06, tx: -1, lens: 1.3, sway: -1, shears: { el: [72, 44], wr: [78, 32], ang: -40, open: 1 } },
      { lean: 0.07, tx: 4, lens: 1.35, sway: 3, phase: 2, snip: [91, 50], shears: { el: [78, 54], wr: [88, 50], ang: 0, open: 0 } },
      { lean: 0.03, tx: 2, lens: 1.1, sway: 2, phase: 3, shears: { el: [74, 55], wr: [84, 49], ang: -10, open: 0.3 } },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { lean: -0.12, tx: -3, lens: 0.4, glitch: 1, sway: -3, phase: 1, slosh: 2, tank: 0.7,
        fall: [[40, 16, 30], [56, 12, 140]], shears: { el: [68, 56], wr: [76, 58], ang: 30, open: 0.6 } },
    ] },
    break: { fps: 4, loop: true, poses: [
      { ty: 12, lean: 0.16, lens: 0.25, tank: 0.45, droop: 30, vines: 0.6, sway: -2, legs: CARETAKER_KNEEL, smoke: 5,
        leak: [[33, 52, 6]], lance: { el: [62, 34], rose: [66, 42] }, shears: { el: [72, 66], wr: [80, 74], ang: 50, open: 0.7 } },
      { ty: 12, lean: 0.17, lens: 0.45, tank: 0.6, droop: 32, vines: 0.6, sway: -1, legs: CARETAKER_KNEEL, smoke: 9,
        leak: [[33, 52, 9]], lance: { el: [62, 34], rose: [66, 42] }, shears: { el: [72, 66], wr: [80, 74], ang: 52, open: 0.6 } },
    ] },
    special: { fps: 6, loop: false, order: [0, 0, 1, 1], poses: [
      { ty: -1, lens: 1.3, tank: 1.8, lid: 0.9, slosh: 2, seeds: [[22, 6], [30, 3], [35, 8]],
        lance: { el: [68, 18], rose: [78, 18] }, bubbles: [[25, 26], [30, 30], [27, 20], [29, 34]] },
      { ty: 0, lens: 1.2, tank: 1.5, lid: 0.6, slosh: 1, seeds: [[50, 2], [63, 6], [76, 12]], spray: 14,
        lance: { el: [68, 18], rose: [78, 18] }, bubbles: [[25, 24], [30, 28], [27, 33]] },
    ] },
  },
  points: { center: [46, 46], muzzle: [86, 48], top: [44, 6], core: [28, 28] },
  icon: { x: 52, y: 33, scale: 0.6 },
};

export default {
  spore_drone: SPORE_DRONE,
  bloom_mantis: BLOOM_MANTIS,
  rootling: ROOTLING,
  feral_caretaker: FERAL_CARETAKER,
};
