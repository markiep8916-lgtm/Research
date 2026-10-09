// spire: Commander Voss's battle art (browser, TECH_PLAN 7.6, 7.8; registered through art.js). Both
// sheets face RIGHT, 128 x 112, painted with the POC enemy rig and the bestiary toolkit:
//   voss            Commander Ilse Voss, human-sized: iron-grey hair swept back, the scar over her left
//                   eye, a charcoal greatcoat with crimson piping and a red sash, a crimson-lined cape
//                   and her energy halberd (a cyan-white crescent on a dark haft) held upright at her side
//   voss_overclock  the same woman at 50%: her back half has already gone up the line, a cyan wireframe
//                   shedding data where coat and cape were; her eyes burn cyan
// Anims: idle (breath, cape and hem, the blade's hum), attack (the halberd sweep), hurt, break (one knee
// down, the halberd planted), special (Command: Focus Fire; her free hand points the mark).

import { rng } from '../../art/painter.js';
import { rp, WHITE, clamp, CRIMSON, GOLD, G_RED, spark, sparks, dome } from '../prologue/enemyart.js';

// ---------------------------------------------------------------- colours

const COAT = rp('#07080b', '#0e0f14', '#16171e', '#1f212a', '#2a2d38', '#383c49', '#4a4f5f', '#636979');
const UNI = rp('#06070b', '#0c0e15', '#141720', '#1d212d', '#282e3d', '#353d50');
const SILVER = rp('#1c1f27', '#343944', '#525865', '#767d8b', '#9da4b1', '#c6cbd5', '#eef1f6');
const SKIN = rp('#3e2622', '#5e3a33', '#82544a', '#a8766a', '#c4927f', '#dcb09c', '#efcab8');
const HAIR = rp('#1a1c21', '#2c2f36', '#454850', '#61656e', '#808590', '#a3a8b2', '#c6cad2', '#e4e7ec');
const LEATHER = rp('#0a0809', '#151112', '#211a1c', '#2f2528', '#413338', '#56464c');
const HAFT = rp('#08090d', '#11131a', '#1b1e27', '#272b36', '#363b48', '#4b5162');
const BLADE = rp('#0d4f78', '#1479b0', '#29a9e0', '#7ff4ff', '#c8f6ff', '#ffffff');
const WIRE = rp('#063246', '#0b5878', '#1690c0', '#3fd4ff', '#a8f4ff', '#ffffff');

const OPAQUE = 1, FX = 2;

// ---------------------------------------------------------------- parts

/** A booted leg: hip -> knee -> ankle in screen space, the boot from the knee down, the foot to `toe`. */
function leg(r, hip, knee, ankle, heel, toe, far) {
  const o = far ? { max: 3, bias: -0.08 } : { max: 4 };
  r.begin();
  r.seg(...hip, ...knee, 3.6, 3.0, UNI, { caps: 'flat', ...o });
  r.end(0.5);
  if (!far) r.line(Math.round(hip[0]) + 3, Math.round(hip[1]), Math.round(knee[0]) + 2, Math.round(knee[1]) - 1, CRIMSON[3]);
  r.begin();
  r.seg(...knee, ...ankle, 3.1, 2.5, LEATHER, { caps: 'round', ...o, spec: far ? null : LEATHER[5], specT: 0.97 });
  r.poly([[heel[0], heel[1] - 4], [ankle[0] + 2.5, ankle[1] - 1.5], [toe[0] - 1, toe[1] - 3], [toe[0], toe[1]], [heel[0], heel[1]]], LEATHER,
    { n: [0.1, -0.6, 0.8], bevel: 1, ...o });
  r.end(0.55);
  r.line(Math.round(knee[0]) - 2, Math.round(knee[1]) + 1, Math.round(knee[0]) + 2, Math.round(knee[1]) + 1, LEATHER[far ? 3 : 4]);
}

/** A coat sleeve from shoulder to wrist, with a crimson cuff and a black glove at the hand. */
function arm(r, sh, el, hand, far, fist = true) {
  const o = far ? { max: 4, bias: -0.1 } : { max: 6 };
  r.begin();
  r.seg(...sh, ...el, 3.4, 3.0, COAT, { caps: 'round', ...o });
  r.seg(...el, ...hand, 3.0, 2.6, COAT, { caps: 'flat', ...o });
  r.end(0.55);
  const cuff = [hand[0] - (hand[0] - el[0]) * 0.18, hand[1] - (hand[1] - el[1]) * 0.18];
  r.seg(...cuff, ...hand, 2.8, 2.6, CRIMSON, { caps: 'flat', max: far ? 2 : 4 });
  r.begin();
  r.ball(hand[0], hand[1], fist ? 2.4 : 2.0, fist ? 2.3 : 1.8, LEATHER, { max: far ? 3 : 5 });
  r.end(0.5);
}

/** The halberd in grip space (grip at the origin, haft up the -y axis), scaled by `len` along its axis. */
function halberd(r, P) {
  // the blade's emissive strength (kept under 1: the bloom does the rest)
  const k = clamp((P.blade ?? 1) * 0.62, 0.2, 1), len = P.foreshorten ?? 1;
  r.save();
  r.rotate(P.hal ?? 0.12);
  r.save();
  // foreshortening as it swings toward the camera: squash along the haft only
  r.m[2] *= len; r.m[3] *= len;
  // the haft, silver bands, the butt cap
  r.begin();
  r.seg(0, 40, 0, -50, 1.5, 1.4, HAFT, { caps: 'flat', max: 5, spec: HAFT[5], specT: 0.97 });
  r.end(0.5);
  for (const y of [-14, 14, 31]) r.seg(0, y - 1, 0, y + 1, 1.9, 1.9, SILVER, { caps: 'flat', max: 5 });
  r.seg(0, 40, 0, 43, 1.9, 1.4, SILVER, { caps: 'flat', max: 5 });
  // the socket and its core line, the back spike
  r.begin();
  r.seg(0, -50, 0, -26, 2.2, 2.6, SILVER, { caps: 'flat', max: 6, spec: SILVER[6], specT: 0.97 });
  r.poly([[-1.8, -46], [-11, -43.5], [-1.8, -40.5]], SILVER, { n: [-0.2, -0.5, 0.85], bevel: 1, max: 6 });
  r.end(0.55);
  r.line(0, -47, 0, -29, BLADE[k > 0.62 ? 5 : 4], k);
  // the crescent: a cyan-white energy blade, white along its cutting edge
  const crescent = [[2, -55], [9, -52], [15, -46], [17, -40], [15, -33], [9, -28], [2.5, -27], [4.5, -31], [8, -35], [9.5, -40], [8, -46], [4.5, -51]];
  r.poly(crescent, BLADE, { idx: k > 0.72 ? 4 : 3, glow: k });
  r.poly([[4, -52], [10, -48], [13.5, -42], [13.5, -38], [11, -32], [6, -29], [8, -34], [10, -40], [9, -46]], BLADE, { idx: k > 0.56 ? 5 : 4, glow: k });
  for (const [x, y] of [[9, -52], [15, -46], [17, -40], [15, -33], [9, -28]]) r.dot(x, y, WHITE, k);
  // the spear point
  r.beam(0, -50, 0, -66, 2.2, 0.6, BLADE, { k });
  r.restore();
  r.restore();
}

/** Screen-space position of grip-space point (x, y) for the halberd at the pose's grip and angle. */
function onHalberd(P, x, y) {
  const a = P.hal ?? 0.12, len = P.foreshorten ?? 1;
  const c = Math.cos(a), s = Math.sin(a);
  return [P.grip[0] + x * c - y * len * s, P.grip[1] + x * s + y * len * c];
}

// ---------------------------------------------------------------- the figure

function drawVoss(r, P) {
  P = { grip: [76, 68], ...P };
  const tx = P.tx || 0, ty = P.ty || 0;
  const T = () => {
    r.translate(tx, ty);
    r.rotate(P.lean || 0, 56, 80);
  };
  r.save();
  T();
  const shN = r.pt(64, 53), shF = r.pt(51, 53), hipN = r.pt(60, 77), hipF = r.pt(52, 76);
  r.restore();
  const cape = P.cape || 0, hem = P.hem || 0;

  // ---- the cape, behind everything: charcoal outside, crimson lining turned out at the edge
  r.save();
  T();
  r.begin();
  r.poly([[50, 49], [61, 48], [58, 62], [52, 84], [44 + cape, 104], [32 + cape * 1.6, 107], [24 + cape * 2, 103], [30 + cape, 84], [40, 60]], COAT,
    { nf: dome(44, 76, 18, 30), bevel: 1, max: 5, bias: -0.04 });
  r.end(0.55);
  r.poly([[30 + cape, 84], [24 + cape * 2, 103], [32 + cape * 1.6, 107], [29 + cape * 1.5, 101], [32 + cape * 0.8, 86]], CRIMSON, { nf: dome(30, 96, 8, 12), max: 4 });
  r.line(41, 60, 31 + Math.round(cape), 84, COAT[5]);
  r.restore();

  // ---- the far leg and the far arm (behind the coat)
  const LG = P.legs || {};
  const lf = LG.far || { knee: [50, 91], ankle: [47, 104], heel: [42, 109], toe: [52, 109] };
  leg(r, hipF, lf.knee, lf.ankle, lf.heel, lf.toe, true);
  const point = P.point;
  if (!point && !P.twoHand) {
    r.save();
    T();
    arm(r, [51, 53], [47, 64], [51, 73], true);
    r.restore();
  } else if (point) {
    // Command: the free hand thrown forward, two fingers marking the target
    arm(r, shF, P.elF || [shF[0] + 13, shF[1] - 2], point, true, false);
    r.line(Math.round(point[0]) + 1, Math.round(point[1]) - 1, Math.round(point[0]) + 4, Math.round(point[1]) - 2, LEATHER[4]);
  }

  // ---- the coat skirt behind the near leg
  r.save();
  T();
  r.begin();
  r.poly([[47, 74], [60, 74], [62 + hem * 0.6, 93], [52, 99], [40 + hem, 100]], COAT, { nf: dome(55, 86, 16, 16), bevel: 1, max: 5 });
  r.end(0.55);
  r.restore();

  // ---- the near leg
  const ln = LG.near || { knee: [63, 92], ankle: [64, 104], heel: [59, 109], toe: [71, 109] };
  leg(r, hipN, ln.knee, ln.ankle, ln.heel, ln.toe, false);

  // ---- the body: tunic, the open coat, the sash, the belt, the epaulettes, the collar
  r.save();
  T();
  r.begin();
  r.poly([[63, 75], [66, 75], [72 + hem * 0.5, 93], [68 + hem * 0.5, 95]], COAT, { n: [0.5, 0, 0.86], bevel: 1, max: 6 });
  r.end(0.5);
  r.line(64, 76, 70 + Math.round(hem * 0.5), 94, CRIMSON[3]);
  r.begin();
  r.poly([[52, 51], [65, 50], [67, 62], [64, 75], [52, 76], [50, 62]], UNI, { nf: dome(58, 62, 10, 14), bevel: 1, max: 5 });
  r.end(0.55);
  // the coat over the shoulders: the back half, the near lapel with its crimson piping
  r.begin();
  r.poly([[47, 53], [54, 49], [55, 62], [54, 76], [47, 77], [45, 64]], COAT, { nf: dome(50, 62, 8, 16), bevel: 1, max: 5 });
  r.poly([[62, 49], [68, 53], [70, 66], [69, 76], [63, 77], [65, 64], [63, 56]], COAT, { nf: dome(67, 62, 6, 16), bevel: 1, max: 6, spec: COAT[7], specT: 0.985 });
  r.end(0.6);
  r.line(63, 56, 65, 64, CRIMSON[4]);
  r.line(65, 64, 63, 76, CRIMSON[3]);
  r.line(54, 50, 55, 62, CRIMSON[2]);
  // the red sash, shoulder to hip, and the gold of her rank
  r.poly([[61, 51], [65, 52], [55, 74], [51, 72]], CRIMSON, { nf: dome(58, 62, 8, 14), max: 4 });
  r.line(62, 52, 53, 72, CRIMSON[5]);
  r.dot(58, 57, GOLD[5]).dot(59, 57, GOLD[4]).dot(58, 58, GOLD[3]);
  r.line(56, 60, 57, 61, GOLD[4]);
  // belt and buckle
  r.begin();
  r.poly([[50, 72], [66, 71], [66, 75], [50, 76]], LEATHER, { n: [0, 0, 1], bevel: 1, max: 4 });
  r.end(0.5);
  r.rect(58, 72, 3, 3, SILVER[5]);
  r.dot(59, 73, SILVER[2]);
  // epaulettes: the near one silver-fringed, the far one in shadow
  r.begin();
  r.ball(51, 52, 3.6, 2.6, SILVER, { max: 3, bias: -0.1 });
  r.ball(65, 52, 4.4, 3.0, SILVER, { max: 6, spec: SILVER[6], specT: 0.97 });
  r.end(0.55);
  for (let k = 0; k < 4; k++) r.line(62 + k * 2, 54, 62 + k * 2, 56 + (k % 2), GOLD[k % 2 ? 3 : 4]);
  // the standing collar
  r.begin();
  r.poly([[54, 50], [55, 45.5], [61, 45], [63, 49], [59, 51]], COAT, { n: [0.2, -0.3, 0.93], bevel: 1, max: 6 });
  r.end(0.55);
  r.line(55, 46, 61, 45, CRIMSON[4]);

  // ---- the head (turns on the neck)
  r.save();
  r.rotate(P.head || 0, 58, 47);
  r.seg(58, 50, 59.5, 44.5, 2.4, 2.4, SKIN, { caps: 'flat', max: 3 });
  r.begin();
  r.ball(60.5, 38.5, 5.4, 6.2, SKIN, { max: 6, bias: 0.04 });
  r.poly([[57, 41], [65.5, 41.5], [65, 45.5], [62.5, 47], [58.5, 46]], SKIN, { nf: dome(61, 43, 5, 4), bevel: 1, max: 5 });
  r.end(0.5);
  // the ear, the cheekbone, the nose
  r.ball(56.5, 40.5, 1.4, 1.9, SKIN, { max: 4, bias: -0.06 });
  r.dot(56, 40, SKIN[1]);
  r.line(61, 41, 63, 41.5, SKIN[5]);
  r.dot(66, 40, SKIN[5]).dot(66, 41, SKIN[4]).dot(65, 42, SKIN[1]);
  // eyes: the near one grey and steady, the far one under the scar
  const eye = P.eye ? WIRE[5] : SKIN[0];
  const eyeK = P.eye ? 1 : 0;
  r.line(60, 37, 62, 36.5, HAIR[2]);
  r.line(63.5, 36.5, 65, 37, HAIR[2]);
  r.dot(61, 38.5, eye, eyeK).dot(62, 38.5, P.eye ? WIRE[4] : SILVER[4], eyeK);
  r.dot(64.5, 38.5, eye, eyeK);
  if (P.eye) r.dot(64.5, 38.5, WIRE[5], 1);
  r.line(64, 34.5, 65, 44, SKIN[6]);
  r.dot(64, 35, SKIN[2]).dot(65, 43, SKIN[2]);
  // the mouth: set hard, or open on a command
  if (P.shout) {
    r.rect(62, 43.5, 3, 2, SKIN[0]);
    r.line(62, 43, 64, 43, SKIN[2]);
  } else {
    r.line(62, 44, 64.5, 43.8, SKIN[1]);
  }
  r.line(59, 46, 62, 46.5, SKIN[3]);
  // iron-grey hair, swept back hard off the brow, close at the nape
  r.begin();
  r.ball(58.5, 35.5, 6.2, 4.6, HAIR, { clip: (x, y) => y < 37 || x < 59, max: 6, bias: -0.1, spec: HAIR[7], specT: 0.985 });
  r.ball(56, 40, 3.6, 5.6, HAIR, { clip: (x, y) => x < 57.6 && y < 45.5, max: 5, bias: -0.04 });
  r.end(0.55);
  const fl = P.hair || 0;
  for (const [x0, y0, x1, y1, c] of [[64, 33, 54, 33.5, 6], [63, 34.5, 53, 36 + fl * 0.3, 2], [61, 32, 53, 31.5, 7], [62, 36, 55, 38 + fl * 0.3, 3], [58, 38, 53.5, 42 + fl, 2]]) {
    r.line(x0, y0, x1, y1, HAIR[c]);
  }
  r.line(53, 41 + fl, 52, 44 + fl, HAIR[3]);
  r.restore();
  r.restore();

  // ---- the halberd, then the near arm on its grip (and the far hand when she swings two-handed)
  r.save();
  r.translate(P.grip[0], P.grip[1]);
  halberd(r, P);
  r.restore();
  const elN = P.elN || [Math.max(shN[0] + 3, (shN[0] + P.grip[0]) / 2 + 1), (shN[1] + P.grip[1]) / 2 + 4];
  arm(r, shN, elN, P.grip, false);
  if (P.twoHand) {
    const lo = onHalberd(P, 0, 15);
    arm(r, shF, P.elF || [(shF[0] + lo[0]) / 2 - 2, (shF[1] + lo[1]) / 2 + 5], lo, true);
  }

  // ---- effects: the sweep's arc, the mark, the hum of the blade
  if (P.arc) {
    // the sweep's smear: a crescent of light behind the blade, thin where it began, thick where it is
    const [a0, a1] = P.arc, R = 50 * (P.foreshorten ?? 1) + 4, [gx, gy] = P.grip;
    r.each(gx - R - 8, gy - R - 8, gx + R + 8, gy + R + 8, (mx, my, X, Y) => {
      const dx = mx - gx, dy = my - gy, rho = Math.hypot(dx, dy);
      const a = Math.atan2(dx, -dy), t = (a - a0) / (a1 - a0);
      if (t < 0 || t > 1) return;
      const w = 1.5 + t * t * 9;
      const d = (R - rho) / w;
      if (d < -0.15 || d > 1) return;
      const hot = (1 - Math.abs(d - 0.2)) * (0.35 + t * 0.65);
      r.put(X, Y, BLADE[clamp(Math.floor(hot * 6.5), 0, 5)], 0.9, true);
    });
  }
  if (P.mark) {
    const [mx, my] = P.markAt || [118, 54];
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      r.line(mx + sx * 6, my + sy * 6, mx + sx * 3, my + sy * 6, G_RED[3], 1, true);
      r.line(mx + sx * 6, my + sy * 6, mx + sx * 6, my + sy * 3, G_RED[3], 1, true);
    }
    r.glow(mx, my, 2, 2, G_RED, { fx: true, bias: 0.4 });
    if (point) for (let x = Math.round(point[0]) + 5; x < mx - 6; x++) if ((x + P.mark) % 3) r.dot(x, Math.round(point[1] + (my - point[1]) * ((x - point[0]) / (mx - point[0]))), G_RED[2], 1, true);
  }
  if (P.hum) {
    const [hx, hy] = onHalberd(P, 12, -44);
    spark(r, Math.round(hx + (P.hum % 3) - 1), Math.round(hy - 3 - (P.hum % 4)), 1, BLADE);
  }
  if (P.sparks) sparks(r, P.sparks, ...onHalberd(P, 8, -40), 6, 5, BLADE);
  if (P.upload) upload(r, P);
}

/**
 * Overclock: everything behind a ragged seam down her body turns to a cyan wireframe (edges and a
 * scan lattice, glowing; the rest is gone), data bits peel off it and the seam itself burns white.
 */
function upload(r, P) {
  const { w, h, rgb, glw, flg } = r;
  const ph = P.phase || 0;
  const R = rng(17 + ph * 7);
  const seam = (y) => 55 + (P.tx || 0) + Math.sin(y * 0.35 + ph) * 1.6 + (y > 96 ? (y - 96) * 0.4 : 0);
  const solid = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h && (flg[Y * w + X] & (OPAQUE | FX)) === OPAQUE;
  const before = Uint8Array.from(flg);
  const was = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h && (before[Y * w + X] & (OPAQUE | FX)) === OPAQUE;
  const lum = (i) => rgb[i * 3] * 0.3 + rgb[i * 3 + 1] * 0.55 + rgb[i * 3 + 2] * 0.15;
  const set = (X, Y, c, k) => {
    const i = Y * w + X, j = i * 3;
    rgb[j] = c[0]; rgb[j + 1] = c[1]; rgb[j + 2] = c[2];
    glw[j] = c[0] * k; glw[j + 1] = c[1] * k; glw[j + 2] = c[2] * k;
    flg[i] = OPAQUE | 8;
  };
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = lum(i);
  for (let Y = 0; Y < h; Y++) {
    const sx = seam(Y);
    for (let X = 0; X < Math.min(w, Math.ceil(sx) + 1); X++) {
      if (!was(X, Y)) continue;
      const i = Y * w + X;
      if (X >= sx - 1) { set(X, Y, (X + Y + ph) % 3 ? WIRE[5] : WIRE[4], 1); continue; }
      const edge = !was(X - 1, Y) || !was(X + 1, Y) || !was(X, Y - 1) || !was(X, Y + 1);
      const crease = Math.abs(L[i] - L[i + 1 < w * h ? i + 1 : i]) > 34 || Math.abs(L[i] - L[i + w < w * h ? i + w : i]) > 34;
      const lattice = (Y + ph) % 4 === 0 && X % 2 === 0;
      if (edge) set(X, Y, WIRE[4], 1);
      else if (crease) set(X, Y, WIRE[3], 0.85);
      else if (lattice) set(X, Y, WIRE[2], 0.7);
      else flg[i] = 0;
    }
  }
  // data bits peeling off the wireframe, drifting back and up
  for (let k = 0; k < 16; k++) {
    const Y = 34 + Math.floor(R() * 70), X = Math.floor(seam(Y) - 6 - R() * 34 - ph * 2);
    if (X < 1 || solid(X, Y)) continue;
    const c = R() < 0.3 ? WIRE[5] : WIRE[3];
    r.put(X, Y, c, 1, true);
    if (R() < 0.4) r.put(X - 1, Y, WIRE[2], 0.8, true);
  }
}

// ---------------------------------------------------------------- sheets

const KNEEL = {
  near: { knee: [66, 106], ankle: [55, 107], heel: [49, 108], toe: [57, 109] },
  far: { knee: [53, 94], ankle: [50, 106], heel: [45, 109], toe: [56, 109] },
};

const ANIMS = {
  idle: { fps: 5, loop: true, poses: [
    { blade: 1.0, hum: 1 },
    { blade: 1.15, cape: 1, hem: 0.5, hair: 0.3, head: -0.03, phase: 1 },
    { ty: 1, blade: 1.3, cape: 2.5, hem: 1, hair: 0.8, grip: [76, 69], head: -0.04, hum: 2, phase: 2 },
    { ty: 1, blade: 1.05, cape: 1.5, hem: 0.5, hair: 0.4, grip: [76, 69], hum: 3, phase: 3 },
  ] },
  attack: { fps: 8, loop: false, poses: [
    { lean: -0.08, tx: -2, hal: -0.95, grip: [70, 52], blade: 1.4, twoHand: true, cape: -1, head: -0.05, phase: 1 },
    { lean: 0.1, tx: 4, hal: 1.5, foreshorten: 0.62, grip: [86, 70], blade: 1.6, twoHand: true, arc: [-0.15, 1.5], cape: 3, hem: 2, phase: 2,
      legs: { near: { knee: [68, 93], ankle: [72, 104], heel: [67, 109], toe: [79, 109] } } },
    { lean: 0.12, tx: 5, hal: 1.95, foreshorten: 0.55, grip: [88, 74], blade: 1.3, twoHand: true, arc: [0.5, 1.95], cape: 4, hem: 2.5, phase: 3,
      legs: { near: { knee: [68, 93], ankle: [72, 104], heel: [67, 109], toe: [79, 109] } } },
  ] },
  hurt: { fps: 6, loop: false, poses: [
    { lean: -0.13, tx: -3, ty: -1, head: -0.22, hal: -0.12, grip: [72, 66], blade: 0.5, cape: -2, hem: -1, hair: 1, sparks: 31, phase: 2 },
  ] },
  break: { fps: 4, loop: true, poses: [
    { ty: 11, lean: 0.12, head: 0.3, hal: 0.02, grip: [76, 82], blade: 0.45, legs: KNEEL, cape: 1, hair: 1.5, phase: 1 },
    { ty: 12, lean: 0.13, head: 0.32, hal: 0.03, grip: [76, 83], blade: 0.7, legs: KNEEL, cape: 1.5, hair: 1.8, hum: 2, phase: 3 },
  ] },
  special: { fps: 6, loop: false, order: [0, 1, 1, 1], poses: [
    { lean: 0.02, point: [80, 50], elF: [66, 50], shout: 1, blade: 1.1, mark: 1, phase: 1 },
    { lean: 0.04, tx: 1, point: [86, 48], elF: [70, 49], shout: 1, blade: 1.2, mark: 2, phase: 2 },
  ] },
};

export const VOSS = {
  w: 128, h: 112,
  bevel: 2,
  draw: drawVoss,
  anims: ANIMS,
  points: { center: [57, 70], muzzle: [94, 30], top: [60, 31], core: [58, 60] },
  icon: { x: 60, y: 40, scale: 1 },
  fitBox: [38, 30, 44, 80],
};

export const VOSS_OVERCLOCK = {
  ...VOSS,
  draw: (r, P) => drawVoss(r, { ...P, upload: true, eye: true, blade: (P.blade ?? 1) * 1.15 }),
};
