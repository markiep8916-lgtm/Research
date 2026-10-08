// spire: regular-enemy art (browser, TECH_PLAN 2.5, 7.6, 7.8; bestiary task CA-beta1).
//
// The Security Spire on red alert: militarised red, black and stark white hardware with gold sigil
// insignia (12.1). Painted with the POC enemy rig and the bestiary toolkit exported by
// prologue/enemyart.js. All sprites face RIGHT.
//
//   sec_trooper   64x80   a Halcyon Security android in white plate with a red visor bar and a carbine;
//                        `special` paints a target with its laser sight (the Mark).
//   riot_drone    84x64   a hover wedge behind a riot shield, a jammer dish on its back; `special` floods
//                        the air with red static (the Jam); `attack` is a shock-shield ram.
//   sentinel_mk3  84x92   the Sentinel line's newest frame: no legs, a magenta grav ring, an arm cannon and
//                        a shoulder targeting pod; `special` is its lock-on.
//   laser_turret  96x72   a heavy emplacement with a long focusing barrel; `special` is the charge (the
//                        barrel glows white), `attack` the piercing beam.
//
// The Director plays `special` for charge-type enemy actions (buff, heal, summon, lockOn, charge) and
// `attack` (or the action's `pose`, e.g. pose: 'special' for a mark or a jam) for everything else.

import { rng } from '../../art/painter.js';
import {
  rp, WHITE, DEG, clamp, GUN, CRIMSON, GOLD, BRONZE, G_RED, G_MAG, G_MAG_DIM, GLOW_C,
  spark, sparks, smoke, steam, flame, muzzleFlash, polar, along, limbPlate, dome,
} from '../prologue/enemyart.js';

// ---------------------------------------------------------------- colours

const PLATE = rp('#1c2029', '#2e333f', '#474d5c', '#666d7d', '#8c93a3', '#b4bac8', '#dadfe8', '#f8fafc');
const BLACK = rp('#06070b', '#0b0d13', '#13161e', '#1c2029', '#272c37', '#363c4a', '#4b5263', '#6a7284');
const IVORY = rp('#1d2029', '#30343f', '#4a4f60', '#6a7082', '#9097a8', '#b8bfcd', '#dbe0ea', '#f7f9fc');
const G_RED_DIM = rp('#2c0910', '#4a0f1a', '#6e1424', '#8f2232', '#a8404c');
const G_HOT = rp('#b01c33', '#ff5d6c', '#ffb4a8', '#fff0ea', '#ffffff');
const G_VOLT = rp('#6a5a10', '#c8a820', '#ffe94d', '#fff6a8', '#ffffff');
const G_FIRE_W = rp('#7a2a10', '#ff8a4a', '#ffd0a0', '#fff4e4', '#ffffff');
const BORE = rp('#050508', '#0c0c12', '#16141c');

// ---------------------------------------------------------------- SECURITY TROOPER (64x80)

/** Armoured leg in screen space: hip -> knee -> ankle, white thigh and shin plates over a black suit. */
function trooperLeg(r, hip, knee, ankle, heel, toe, far) {
  const suit = far ? { max: 4, bias: -0.1 } : { max: 5 };
  const plate = far ? { max: 5, bias: -0.1 } : { max: 7, bias: 0.06 };
  r.begin();
  r.seg(...hip, ...knee, 3.2, 2.6, BLACK, { caps: 'flat', ...suit });
  r.seg(...knee, ...ankle, 2.6, 2.1, BLACK, { caps: 'flat', ...suit });
  r.end(0.5);
  r.begin();
  limbPlate(r, hip, knee, [[0.05, -3.8], [0.05, 3.4], [0.8, 2.8], [0.95, -2.6]], PLATE, plate);
  limbPlate(r, knee, ankle, [[0.08, -3.2], [0.08, 2.6], [0.72, 2], [0.72, -2.8]], PLATE, plate);
  r.end(0.55);
  const s0 = along(knee, ankle, 0.15, -2.6), s1 = along(knee, ankle, 0.65, -2.2);
  r.line(Math.round(s0[0]), Math.round(s0[1]), Math.round(s1[0]), Math.round(s1[1]), CRIMSON[far ? 2 : 3]);
  r.begin();
  r.ball(...knee, 2.8, 2.6, PLATE, { ...plate, spec: far ? null : PLATE[7], specT: 0.95 });
  r.poly([[heel[0], heel[1] - 4], [ankle[0] + 2, ankle[1] - 1], [toe[0] - 1, toe[1] - 3], [toe[0], toe[1]], [heel[0], heel[1]]], BLACK, { n: [0.1, -0.6, 0.8], bevel: 1, ...suit });
  r.end(0.55);
  r.line(heel[0] + 1, heel[1] - 1, toe[0] - 1, toe[1] - 1, BLACK[far ? 3 : 5]);
}

/** The carbine in its own space (grip at the origin): returns nothing, draws stock to muzzle. */
function carbine(r, P) {
  const rec = P.recoil || 0;
  r.save();
  r.translate(-rec, 0);
  r.begin();
  r.poly([[-13, -3], [-6, -4], [-5, 1], [-12, 3]], BLACK, { n: [0, -0.3, 0.95], bevel: 1, max: 5 });
  r.poly([[-7, -6], [9, -6.5], [10, -1], [-6, 0.5]], BLACK, { n: [0, -0.4, 0.9], bevel: 1, max: 6, spec: BLACK[7], specT: 0.97 });
  r.poly([[-3, -5.5], [7, -6], [7.5, -3.5], [-3, -3]], PLATE, { n: [0, -0.6, 0.8], bevel: 1, max: 7 });
  r.poly([[0, 0], [3, 0], [3.5, 6], [0.5, 6]], BLACK, { n: [0.2, 0, 0.98], bevel: 1, max: 5 });
  r.end(0.55);
  r.begin();
  r.seg(9, -4, 21, -4, 1.4, 1.2, BLACK, { caps: 'flat', max: 6, spec: BLACK[7], specT: 0.96 });
  r.rect(20, -6, 2.5, 4, BLACK[5]);
  r.dot(20, -6, BLACK[7]);
  r.poly([[9, -2], [14, -2], [14, 0.5], [9, 0.5]], BLACK, { n: [0, 0.2, 1], bevel: 1, max: 5 });
  r.poly([[0, -8.5], [6, -8.5], [6, -6.5], [0, -6.5]], BLACK, { n: [0, -0.6, 0.8], bevel: 1, max: 6 });
  r.end(0.5);
  r.line(-2, -4.5, 5, -5, CRIMSON[3]);
  // scope lens and the laser-sight emitter under the barrel
  r.dot(6, -8, P.sight ? GLOW_C.red : CRIMSON[1], P.sight ? 1 : 0);
  r.dot(14, -1, P.sight ? WHITE : G_RED[1], P.sight ? 1 : 0.4);
  r.restore();
  if (P.flash) muzzleFlash(r, 23 - rec, -4, P.flash, G_FIRE_W);
  if (P.puff) smoke(r, P.puff, 24 - rec, -6, 2.8);
}

function drawTrooper(r, P) {
  const ty = P.ty || 0, tx = P.tx || 0;
  const vis = P.visor ?? 1;
  const G = P.gun || { ang: 9, x: 36, y: 41 };
  const torso = () => {
    r.translate(tx, ty);
    r.rotate(P.lean || 0, 29, 47);
  };
  // rifle anchor points in screen space (the hands follow the gun)
  r.save();
  torso();
  r.translate(G.x, G.y);
  r.rotate(G.ang * DEG);
  const grip = r.pt(1.5, 1), fore = r.pt(11, -0.5);
  r.restore();
  r.save();
  torso();
  const hipN = r.pt(31, 48), hipF = r.pt(27, 47), shF = r.pt(24, 28), shN = r.pt(36, 29);
  r.restore();

  const LG = P.legs || {};
  const lf = LG.far || { knee: [24, 61], ankle: [21, 73], heel: [16, 77], toe: [27, 77] };
  trooperLeg(r, hipF, lf.knee, lf.ankle, lf.heel, lf.toe, true);

  // far arm reaches to the foregrip, behind the gun
  const elF = P.elF || [Math.min(shF[0], fore[0]) + 3, (shF[1] + fore[1]) / 2 + 4];
  r.begin();
  r.seg(...shF, ...elF, 2.4, 2.1, BLACK, { max: 4, bias: -0.1 });
  r.seg(...elF, ...fore, 2.1, 1.9, BLACK, { max: 4, bias: -0.1 });
  limbPlate(r, elF, fore, [[0.1, -2.4], [0.1, 2.4], [0.65, 2.2], [0.65, -2.2]], PLATE, { max: 5, bias: -0.14 });
  r.end(0.5);

  r.save();
  torso();
  // far pauldron and backpack
  r.begin();
  r.ball(24, 27, 4.4, 4.2, PLATE, { max: 5, bias: -0.14 });
  r.poly([[17, 25], [23, 23], [25, 38], [19, 40]], BLACK, { n: [-0.4, 0, 0.9], bevel: 1, max: 5 });
  r.end(0.55);
  r.line(21, 27, 19, 20, BLACK[5]);
  r.dot(19, 19, P.led ? GLOW_C.red : CRIMSON[1], P.led ? 1 : 0);
  // pelvis and belly under the chest plate
  r.begin();
  r.poly([[23, 42], [35, 41.5], [36.5, 48], [30, 51], [23, 49]], BLACK, { n: [0, 0, 1], bevel: 1, max: 5 });
  r.poly([[22, 35], [38, 34], [37, 43], [23, 44]], BLACK, { n: [0.1, 0.2, 0.97], max: 5 });
  r.end(0.6);
  for (let k = 0; k < 3; k++) r.line(25, 37 + k * 2, 35, 36.5 + k * 2, BLACK[k === 0 ? 5 : 1]);
  r.rect(25, 43, 9, 2, PLATE[5]);
  r.dot(29, 43, GOLD[5]);
  // chest plate: white, a red diagonal sash, the gold Security chevron
  r.begin();
  r.poly([[21, 27], [30, 22.5], [39, 24.5], [41.5, 31], [39, 37], [24, 38], [21, 33]], PLATE, { nf: dome(31, 29, 12, 9), bevel: 1, max: 7, bias: 0.1, spec: PLATE[7], specT: 0.985 });
  r.end(0.6);
  r.poly([[23, 34], [36, 25], [38.5, 26], [25, 36.5]], CRIMSON, { nf: dome(31, 29, 12, 9), max: 4 });
  r.line(33, 30, 35, 32, GOLD[5]);
  r.line(35, 32, 37, 30, GOLD[5]);
  r.dot(35, 33, GOLD[2]);
  r.line(26, 27, 31, 24.5, PLATE[7]);
  // collar and helmet
  r.save();
  r.rotate(P.head || 0, 32, 22);
  r.begin();
  r.seg(31, 23, 33, 19, 2.6, 2.4, BLACK, { caps: 'flat', max: 5 });
  r.end(0.5);
  r.begin();
  r.ball(33, 13.5, 5.8, 5.8, PLATE, { clip: (x, y) => y < 15.5, max: 7, bias: 0.08, spec: PLATE[7], specT: 0.985 });
  r.poly([[27.5, 12.5], [32, 13.5], [32.5, 19.5], [29, 19.5], [27.5, 16]], PLATE, { n: [-0.5, 0.1, 0.86], bevel: 1, max: 6, bias: 0.04 });
  r.poly([[33, 10.5], [39.5, 11.5], [40.2, 16], [37.5, 19.8], [32.5, 19.6], [32, 14]], BLACK, { nf: dome(36, 15, 6, 6), bevel: 1, max: 6, spec: BLACK[7], specT: 0.97 });
  r.end(0.6);
  r.poly([[29, 8.2], [34, 7.6], [38, 9.6], [33.5, 9.4], [29.5, 10]], CRIMSON, { n: [0, -0.8, 0.6], max: 5 });
  r.line(30, 15, 31, 18, PLATE[3]);
  // the red visor bar (a scan dot runs along it while idle)
  const vk = clamp(vis, 0.15, 1.4), vr = vis > 0.55 ? G_RED : G_RED_DIM;
  r.line(35, 13, 40, 13, vr[vis > 1.05 ? 4 : 3], vk);
  r.line(35, 14, 40, 14, vr[2], vk * 0.8);
  if (P.scan != null && vis > 0.55) r.dot(35 + P.scan, 13, WHITE, 1);
  if (P.glitch) {
    r.line(32, 12, 43, 12, WHITE, 1, true);
    r.line(34, 15, 44, 15, G_RED[3], 1, true);
  }
  r.line(36, 17, 39, 17, BLACK[1]);
  r.restore();
  r.restore();

  // near leg
  const ln = LG.near || { knee: [36, 61], ankle: [35, 73], heel: [30, 78], toe: [42, 78] };
  trooperLeg(r, hipN, ln.knee, ln.ankle, ln.heel, ln.toe, false);

  // the carbine, then the near arm on its grip, then the near pauldron
  r.save();
  torso();
  r.translate(G.x, G.y);
  r.rotate(G.ang * DEG);
  carbine(r, P);
  r.restore();
  const elN = P.elN || [Math.min(shN[0], grip[0]) - 2, (shN[1] + grip[1]) / 2 + 3];
  r.begin();
  r.seg(...shN, ...elN, 2.6, 2.3, BLACK, { max: 5 });
  r.seg(...elN, ...grip, 2.3, 2.1, BLACK, { max: 5 });
  limbPlate(r, elN, grip, [[0.05, -2.8], [0.05, 2.8], [0.6, 2.5], [0.6, -2.5]], PLATE, { max: 7 });
  r.ball(...grip, 2.2, 2.2, BLACK, { max: 6 });
  r.end(0.55);
  r.save();
  torso();
  r.begin();
  r.poly([[31, 25], [37, 22.5], [42, 25], [42.5, 31], [37, 32.5], [32, 30]], PLATE, { nf: dome(37, 26, 7, 6), bevel: 1, max: 7, bias: 0.1, spec: PLATE[7], specT: 0.98 });
  r.poly([[32, 29.6], [37, 32.1], [42.4, 30.6], [42.5, 31.5], [37, 33.2], [32, 30.8]], CRIMSON, { nf: dome(37, 26, 7, 6), max: 4 });
  r.end(0.6);
  r.line(34, 25, 38, 23.5, PLATE[7]);
  r.restore();

  // the Mark: a red sight line to the frame edge and a target bracket
  if (P.mark) {
    r.save();
    torso();
    r.translate(G.x, G.y);
    r.rotate(G.ang * DEG);
    for (let x = 15; x < 64; x++) if ((x + P.mark) % 4) r.dot(x, -1, (x & 1 ? G_RED[2] : G_RED[3]), 1, true);
    r.restore();
    if (P.mark > 1) {
      const [mx, my] = P.markAt || [56, 34];
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        r.line(mx + sx * 5, my + sy * 5, mx + sx * 3, my + sy * 5, G_RED[3], 1, true);
        r.line(mx + sx * 5, my + sy * 5, mx + sx * 5, my + sy * 3, G_RED[3], 1, true);
      }
      r.glow(mx, my, 2, 2, G_RED, { fx: true, bias: 0.4 });
    }
  }
  if (P.casing) {
    r.dot(P.casing[0], P.casing[1], GOLD[5]);
    r.dot(P.casing[0] + 1, P.casing[1], GOLD[3]);
  }
  if (P.sparks) for (const [seed, x, y, sp, n] of P.sparks) sparks(r, seed, x, y, sp, n);
  if (P.smoke) smoke(r, P.smoke, 30, 14 + ty, 3);
}

const TROOPER_KNEEL = {
  near: { knee: [39, 77], ankle: [28, 76], heel: [21, 78], toe: [30, 78] },
  far: { knee: [21, 66], ankle: [20, 76], heel: [15, 78], toe: [27, 78] },
};

const SEC_TROOPER = {
  w: 64, h: 80,
  bevel: 2,
  draw: drawTrooper,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { scan: 0, led: 1 },
      { ty: 0, scan: 2, head: -0.03, gun: { ang: 10, x: 36, y: 41 } },
      { ty: 1, scan: 4, head: -0.05, led: 1, gun: { ang: 11, x: 36, y: 42 } },
      { ty: 1, scan: 2, head: -0.02, gun: { ang: 10, x: 36, y: 42 } },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { lean: -0.04, visor: 1.3, sight: 1, gun: { ang: 0, x: 37, y: 36 }, head: 0.04, led: 1 },
      { lean: -0.07, tx: -1, visor: 1.4, sight: 1, recoil: 2, flash: 6, casing: [36, 26], gun: { ang: -2, x: 36, y: 36 }, head: 0.04, led: 1 },
      { lean: -0.03, visor: 1.1, recoil: 1, puff: 7, casing: [33, 30], gun: { ang: -1, x: 37, y: 36 }, head: 0.03 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { lean: -0.14, tx: -2, ty: -1, visor: 0.4, glitch: 1, head: -0.25, gun: { ang: -22, x: 34, y: 40 } },
    ] },
    break: { fps: 4, loop: true, poses: [
      { ty: 10, lean: 0.14, visor: 0.25, head: 0.35, legs: TROOPER_KNEEL, gun: { ang: 52, x: 37, y: 42 }, smoke: 5,
        sparks: [[31, 33, 26, 4, 4]] },
      { ty: 10, lean: 0.15, visor: 0.6, head: 0.33, legs: TROOPER_KNEEL, gun: { ang: 52, x: 37, y: 42 }, smoke: 9, led: 1,
        sparks: [[47, 34, 27, 4, 3]] },
    ] },
    special: { fps: 6, loop: false, order: [0, 0, 1, 1], poses: [
      { lean: -0.03, visor: 1.3, sight: 1, mark: 1, gun: { ang: 0, x: 37, y: 36 }, head: 0.04, led: 1 },
      { lean: -0.03, visor: 1.4, sight: 1, mark: 2, gun: { ang: 0, x: 37, y: 36 }, head: 0.04, led: 1, scan: 5 },
    ] },
  },
  points: { center: [30, 44], muzzle: [59, 32], top: [33, 5] },
  icon: { x: 34, y: 18, scale: 1 },
};

// ---------------------------------------------------------------- RIOT DRONE (84x64)

/** Downward thruster pod with a red band and a jet. */
function riotPod(r, x, y, rx, ry, far, thrust) {
  r.begin();
  r.ball(x, y, rx, ry, BLACK, { max: far ? 4 : 6, bias: far ? -0.1 : 0, spec: far ? null : BLACK[7], specT: 0.96 });
  r.ball(x, y, rx, ry, CRIMSON, { clip: (mx, my) => Math.abs(my - y + 0.5) < 0.8, max: far ? 2 : 4 });
  r.seg(x, y + ry - 1, x, y + ry + 1.5, rx * 0.55, rx * 0.45, BLACK, { caps: 'flat', max: 4 });
  r.end(0.55);
  flame(r, Math.round(x - 0.5), Math.round(y + ry + 2), thrust, G_RED, 0, 1, rx * 0.4);
}

function drawRiot(r, P) {
  const dish = P.dish || 0, st = P.strobe ?? 0;
  r.save();
  r.translate(P.dx || 0, P.bob || 0);
  r.rotate(P.tilt || 0, 36, 32);

  riotPod(r, 24, 42, 4.2, 3.2, true, P.thrust?.[1] ?? 4);

  // jammer dish on a mast (it swings forward to jam)
  r.begin();
  r.seg(30, 19, 29, 10, 1.3, 1.1, BLACK, { caps: 'flat', max: 5 });
  r.end(0.5);
  r.save();
  r.rotate(dish, 29, 9);
  r.begin();
  r.ball(28, 8, 3.2, 6.4, PLATE, { concave: true, max: 6 });
  r.ball(28, 8, 3.2, 6.4, PLATE, { clip: (x) => x < 26.6, max: 4, bias: -0.1 });
  r.end(0.55);
  r.line(29, 8, 34, 8, BLACK[6]);
  const jk = clamp(P.jam ?? 0.4, 0.2, 1.5);
  r.glow(34.5, 8, 1.6 + jk, 1.6 + jk, jk > 0.6 ? G_RED : G_RED_DIM, { k: jk, bias: 0.4 });
  r.restore();

  // hull: a black wedge under a white top plate with red bars, a hazard band on the flank
  r.begin();
  r.poly([[11, 27], [19, 18], [45, 16], [56, 22], [58, 34], [49, 42], [20, 43], [11, 35]], BLACK, { nf: dome(34, 28, 24, 14), bevel: 1, max: 6, spec: BLACK[7], specT: 0.975 });
  r.end(0.6);
  r.begin();
  r.poly([[16, 21], [42, 17], [53, 22], [45, 27], [18, 28]], PLATE, { n: [-0.1, -0.75, 0.65], bevel: 1, max: 7, bias: 0.06, spec: PLATE[7], specT: 0.985 });
  r.end(0.5);
  for (const x of [24, 31]) r.poly([[x, 19.5], [x + 3, 19], [x + 1, 27.5], [x - 2, 27.8]], CRIMSON, { n: [-0.1, -0.75, 0.65], max: 4 });
  // flank: a red light bar and a hazard chevron block by the nose
  const bar = P.bar ?? 1;
  r.rect(17, 33, 20, 2, BORE[1]);
  for (let x = 18; x < 36; x += 2) r.dot(x, 33.5, G_RED[(x >> 1) % 3 === (P.strobe || 0) ? 4 : 2], bar);
  r.each(39, 30, 50, 38, (mx, my, X, Y) => {
    if (my < 30.5 || my > 37.5 || mx < 39.5 || mx > 49.5) return;
    r.put(X, Y, Math.floor((mx - my * 0.9) / 2.4) % 2 ? CRIMSON[3] : PLATE[6]);
  });
  r.line(39, 30, 49, 30, BLACK[1]);
  r.line(39, 38, 49, 38, BLACK[1]);
  for (const x of [14, 21, 53]) r.dot(x, 29, BLACK[6]);
  r.line(16, 39, 46, 39, BLACK[5]);
  // strobes: red and white, alternating
  for (const [x, y, on, c] of [[19, 17, st === 1, G_RED], [40, 15, st === 2, rp('#5a6378', '#a8b4c8', '#dde6f2', '#f6faff', '#ffffff')]]) {
    r.begin();
    r.ball(x, y, 2, 1.8, on ? c : BLACK, { clip: (mx, my) => my < y + 0.5, max: on ? 4 : 5, glow: on ? 1 : 0, gamma: 1 });
    r.end(0.45);
    if (on) r.glow(x, y - 1, 3.6, 2.2, c, { fx: true, k: 0.7, bias: 0.1 });
  }

  riotPod(r, 41, 45, 5, 3.8, false, P.thrust?.[0] ?? 5);

  // riot shield on a hinge at the nose: white face, red band, a glowing view slit, electrode prongs
  r.save();
  r.rotate(P.shield || 0, 55, 34);
  r.begin();
  r.seg(52, 24, 56, 24, 2, 2, BLACK, { caps: 'flat', max: 5 });
  r.seg(52, 40, 56, 40, 2, 2, BLACK, { caps: 'flat', max: 5 });
  r.end(0.5);
  r.begin();
  r.poly([[53.5, 5.5], [64, 8.5], [67, 31], [64, 53.5], [53.5, 57], [55.5, 31]], BLACK, { nf: dome(64, 31, 8, 27, 0.7), bevel: 1, max: 6 });
  r.poly([[55, 7], [63, 10], [65.5, 31], [63, 52], [55, 55], [57, 31]], PLATE, { nf: dome(64, 31, 7, 26, 0.7), bevel: 1, max: 7, bias: 0.08, spec: PLATE[7], specT: 0.985 });
  r.end(0.6);
  r.poly([[56.3, 24], [64.6, 24.5], [65, 29], [56.8, 28.8]], CRIMSON, { nf: dome(64, 31, 7, 26, 0.7), max: 5 });
  r.poly([[56.6, 34], [65, 33.6], [64.7, 37], [56.5, 37.6]], CRIMSON, { nf: dome(64, 31, 7, 26, 0.7), max: 5 });
  const vk = clamp(P.eye ?? 1, 0.2, 1.4);
  r.line(58, 17, 63, 17.5, BORE[0]);
  r.line(58, 18, 63, 18.5, (vk > 0.55 ? G_RED : G_RED_DIM)[3], vk);
  for (const y of [12, 31, 49]) {
    r.line(66, y, 69, y, BLACK[6]);
    r.dot(69, y, P.arc ? WHITE : GUN[6], P.arc ? 1 : 0);
  }
  r.line(57, 9, 58, 50, PLATE[3]);
  r.restore();
  // floodlight under the nose
  const fl = P.flood ?? 1;
  r.begin();
  r.ball(51, 44, 2.6, 2, BLACK, { max: 5 });
  r.end(0.45);
  r.glow(52, 44.5, 1.8, 1.4, rp('#5a6378', '#a8b4c8', '#dde6f2', '#f6faff', '#ffffff'), { k: fl, bias: 0.3 });
  r.restore();

  // fx: the shock arcs, the jam static, damage
  if (P.arc) {
    const R = rng(P.arc);
    const ox = P.dx || 0, oy = P.bob || 0;
    for (const [y0, y1] of [[12, 31], [31, 49], [12, 49]]) {
      let x = 69 + ox, y = y0 + oy;
      const n = 6, dy = (y1 - y0) / n;
      for (let k = 0; k < n; k++) {
        const nx = 70 + ox + (R() * 2 + 1) * (k % 2 ? 1 : 2) * (y1 - y0 > 20 ? 1.6 : 1), ny = y0 + oy + dy * (k + 1);
        r.line(Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), G_VOLT[k & 1 ? 3 : 4], 1, true);
        x = nx; y = ny;
      }
    }
    for (const y of [12, 31, 49]) {
      r.glow(70 + ox, y + oy, 2.2, 2.2, G_VOLT, { fx: true, bias: 0.4 });
      spark(r, 72 + ox, y + oy, 2, G_VOLT);
    }
  }
  if (P.static) {
    const R = rng(P.static);
    const cx = 35 + (P.dx || 0), cy = 9 + (P.bob || 0);
    for (const rad of [8, 15, 22, 30]) {
      for (let a = -35; a <= 35; a += 4) {
        if (R() < 0.25) continue;
        const p = polar(cx, cy, a + (R() - 0.5) * 6, rad + (R() - 0.5) * 2);
        r.dot(Math.round(p[0]), Math.round(p[1]), G_RED[rad < 20 ? 3 : 2], 1, true);
      }
    }
    for (let k = 0; k < 14; k++) r.dot(Math.round(cx + 6 + R() * 40), Math.round(cy - 14 + R() * 34), R() < 0.5 ? WHITE : G_RED[2], 1, true);
  }
  if (P.sparks) sparks(r, P.sparks, 34, 28, 12, 6);
  if (P.smoke) {
    smoke(r, P.smoke, 30, 12 + (P.bob || 0), 3.8);
    smoke(r, P.smoke + 5, 26, 7 + (P.bob || 0), 2.8, 0.55);
  }
}

const RIOT_DRONE = {
  w: 84, h: 64,
  bevel: 3,
  draw: drawRiot,
  anims: {
    idle: { fps: 6, loop: true, poses: [
      { bob: 0, thrust: [7, 5], strobe: 1 },
      { bob: -1, thrust: [8, 6], dish: -0.06 },
      { bob: -2, thrust: [7, 5], dish: -0.1, strobe: 2 },
      { bob: -1, thrust: [6, 4], dish: -0.05 },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { bob: -1, dx: -4, tilt: -0.07, thrust: [9, 6], strobe: 1, eye: 1.3 },
      { bob: 0, dx: 6, tilt: 0.08, thrust: [10, 8], strobe: 2, eye: 1.4, arc: 5 },
      { bob: 0, dx: 3, tilt: 0.03, thrust: [7, 5], arc: 9, eye: 1.1 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { bob: -1, dx: -3, tilt: -0.22, thrust: [3, 2], eye: 0.4, flood: 0.3, dish: 0.3, sparks: 7, bar: 0.3 },
    ] },
    break: { fps: 5, loop: true, poses: [
      { bob: 9, tilt: 0.3, thrust: [2, 0], eye: 0.25, flood: 0.2, dish: 0.8, shield: 0.2, sparks: 13, smoke: 5, bar: 0.2 },
      { bob: 10, tilt: 0.33, thrust: [0, 1], eye: 0.5, flood: 0.4, dish: 0.85, shield: 0.22, sparks: 29, smoke: 9, strobe: 1, bar: 0.5 },
    ] },
    special: { fps: 6, loop: false, order: [0, 0, 1, 1], poses: [
      { bob: -2, dish: 0.45, jam: 1.4, strobe: 1, thrust: [8, 6] },
      { bob: -1, dish: 0.5, jam: 1.5, strobe: 2, thrust: [8, 6], static: 7 },
    ] },
  },
  points: { center: [36, 30], muzzle: [68, 31], top: [32, 2] },
  icon: { x: 42, y: 28, scale: 0.42 },
};

// ---------------------------------------------------------------- SENTINEL MK-III (84x92)

function drawMk3(r, P) {
  const vis = P.visor ?? 1, ring = P.ring ?? 1;
  const C = P.cannon || { el: [59, 51], mz: [77, 49] };
  const body = () => {
    r.translate(P.tx || 0, P.ty || 0);
    r.rotate(P.lean || 0, 40, 60);
  };

  // grav ring and its downward light (drawn in screen space so the shadow side stays put)
  r.save();
  body();
  const rk = clamp(ring, 0.15, 1.5), rg = ring > 0.55 ? G_MAG : G_MAG_DIM;
  flame(r, 40, 82, Math.round(5 * rk + (P.pulse || 0)), rg, 0, 1, 3.4);
  r.begin();
  r.ring(40, 80, 4.5, 9, BLACK, { ry: 0.32, max: 6, spec: BLACK[7], specT: 0.96 });
  r.end(0.5);
  r.each(30, 77, 50, 83, (mx, my, X, Y) => {
    const d = Math.hypot(mx - 40, (my - 80.5) / 0.32);
    if (d < 5.5 || d > 8) return;
    r.put(X, Y, rg[my > 80.5 ? 3 : 2], rk);
  });

  // far arm hanging behind, the shoulder targeting pod
  r.begin();
  r.seg(29, 36, 25, 49, 3, 2.6, BLACK, { max: 4, bias: -0.08 });
  r.seg(25, 49, 28, 58, 2.6, 2.4, BLACK, { max: 4, bias: -0.08 });
  limbPlate(r, [25, 49], [28, 58], [[0, -3], [0, 3], [0.8, 3.2], [0.8, -3]], IVORY, { max: 5, bias: -0.12 });
  r.ball(28, 59, 2.8, 2.6, BLACK, { max: 4 });
  r.end(0.5);
  // targeting pod: a domed sensor on a mast; its ivory cowl slides back to bare the lens
  const pod = P.pod || 0;
  r.begin();
  r.seg(29, 33, 27, 25, 1.7, 1.4, BLACK, { caps: 'flat', max: 5 });
  r.ball(26, 21, 5.4, 4.6, BLACK, { max: 6, spec: BLACK[7], specT: 0.96 });
  r.end(0.55);
  r.begin();
  r.ball(26, 21, 5.4, 4.6, IVORY, { clip: (x, y) => y < 20 - pod * 1.6 + (x - 26) * 0.35, max: 7, spec: IVORY[7], specT: 0.98 });
  r.end(0.5);
  r.line(22, 18 - Math.round(pod), 27, 17 - Math.round(pod), CRIMSON[3]);
  r.begin();
  r.ring(30, 21.5, 1.2, 2.8, BLACK, { max: 6 });
  r.end(0.45);
  const pk = clamp(0.5 + pod, 0.3, 1.5);
  r.glow(30.3, 21.5, 1.5 + pod * 0.8, 1.5 + pod * 0.8, pk > 0.7 ? G_MAG : G_MAG_DIM, { k: pk, bias: 0.4 });

  // skirt and waist: black frame under ivory plates, crimson keel stripe
  r.begin();
  r.poly([[29, 52], [51, 52], [47, 70], [40, 77], [33, 70]], BLACK, { n: [0, 0.1, 1], bevel: 1, max: 5 });
  r.poly([[32.5, 55], [47.5, 55], [44.5, 68], [40, 73], [35.5, 68]], IVORY, { nf: dome(40, 60, 9, 12), bevel: 1, max: 7, spec: IVORY[7], specT: 0.98 });
  r.end(0.6);
  r.poly([[39, 55.5], [41, 55.5], [41, 72], [39, 72]], CRIMSON, { nf: dome(40, 60, 9, 12), max: 4 });
  r.begin();
  r.ball(40, 52, 10, 3.6, BLACK, { max: 6 });
  r.end(0.5);

  // chest: a broad ivory carapace, crimson livery, the magenta core
  r.begin();
  r.poly([[26, 35], [35, 28], [50, 27.5], [58, 35], [55, 47], [41, 53], [28, 48]], IVORY, { nf: dome(42, 38, 17, 13), bevel: 1, max: 7, bias: 0.06, spec: IVORY[7], specT: 0.985 });
  r.end(0.6);
  r.poly([[27, 44], [41, 49], [55, 43], [54.5, 46], [41, 52.5], [27.6, 47]], CRIMSON, { nf: dome(42, 38, 17, 13), max: 4 });
  r.line(33, 31, 41, 29, IVORY[7]);
  r.line(41, 31, 41, 46, IVORY[3]);
  r.line(42, 31, 42, 46, IVORY[6]);
  const ck = clamp(P.core ?? 1, 0.2, 1.6);
  r.begin();
  r.ring(48, 40, 2.4, 4, BLACK, { max: 6 });
  r.end(0.45);
  r.glow(48, 40, 2.6, 2.6, ck > 0.55 ? G_MAG : G_MAG_DIM, { k: ck, bias: ck > 1.1 ? 0.7 : 0.3 });
  for (const [x, y] of [[30, 36], [53, 36], [36, 47]]) {
    r.dot(x, y, GOLD[4]);
    r.dot(x + 1, y + 1, GOLD[1]);
  }

  // helm: ivory dome, black faceplate, magenta T-visor, swept bronze horns
  r.save();
  r.rotate(P.head || 0, 43, 27);
  r.translate(44, 27).scale(1.12).translate(-44, -27);
  r.begin();
  for (const [x0, y0, k] of [[40, 16, 0], [45, 14.5, 1]]) {
    const a = [x0, y0], b = [x0 - 5, y0 - 7], c = [x0 - 11, y0 - 10], d = [x0 - 15, y0 - 9];
    r.seg(...a, ...b, k ? 2.4 : 2, 1.8, BRONZE, { max: k ? 7 : 5, spec: k ? BRONZE[7] : null, specT: 0.94, bounce: 0.3 });
    r.seg(...b, ...c, 1.8, 1.1, BRONZE, { max: k ? 7 : 5, spec: k ? BRONZE[7] : null, specT: 0.95 });
    r.seg(...c, ...d, 1.1, 0.3, BRONZE, { max: k ? 6 : 4 });
  }
  r.end(0.5);
  r.begin();
  r.poly([[37, 17], [44, 13.5], [51, 16], [53, 22], [50, 28], [40, 28], [36, 23]], IVORY, { nf: dome(44, 20, 9, 8), bevel: 1, max: 7, spec: IVORY[7], specT: 0.985 });
  r.poly([[44, 18.5], [53, 19], [54, 23], [50.5, 27.5], [45, 27]], BLACK, { nf: dome(48, 22, 6, 6), bevel: 1, max: 6, spec: BLACK[7], specT: 0.97 });
  r.end(0.6);
  const vk = clamp(vis, 0.15, 1.4), vr = vis > 0.55 ? G_MAG : G_MAG_DIM;
  r.line(45, 21, 53, 21, vr[vis > 1.05 ? 4 : 3], vk);
  r.line(49, 22, 49, 25, vr[2], vk * 0.8);
  if (vis > 0.55) r.dot(52, 21, WHITE, 1);
  if (P.glitch) {
    r.line(41, 20, 56, 20, WHITE, 1, true);
    r.line(44, 23, 57, 23, G_MAG[3], 1, true);
  }
  r.restore();

  // near arm: pauldron, upper arm, the cannon forearm with three coil rings
  r.begin();
  r.seg(55, 39, ...C.el, 3.2, 2.8, BLACK, { max: 6 });
  r.ball(...C.el, 3, 3, BLACK, { max: 6, spec: BLACK[7], specT: 0.95 });
  r.end(0.5);
  const ang = Math.atan2(C.mz[1] - C.el[1], C.mz[0] - C.el[0]);
  const len = Math.hypot(C.mz[0] - C.el[0], C.mz[1] - C.el[1]);
  r.save();
  r.translate(...C.el);
  r.rotate(ang);
  r.translate(-(C.recoil || 0), 0);
  r.begin();
  r.seg(-2, 0, len - 3, 0, 4, 3.2, BLACK, { caps: 'flat', max: 6, spec: BLACK[7], specT: 0.97 });
  r.poly([[0, -4.6], [len - 7, -3.6], [len - 6, -1.6], [0, -1.8]], IVORY, { n: [0, -0.8, 0.6], bevel: 1, max: 7 });
  r.end(0.55);
  const ch = P.charge || 0;
  for (let k = 0; k < 3; k++) {
    const x = 5 + k * 4.5, kk = clamp(0.45 + ch * 0.3 + k * 0.06, 0.2, 1.6);
    r.seg(x, 0, x + 1.2, 0, 4.2, 4.2, kk > 0.6 ? G_MAG : G_MAG_DIM, { caps: 'flat', glow: Math.min(1, kk * 0.65), gamma: 1, bias: 0.2, min: 1 });
  }
  r.begin();
  r.rect(len - 4, -3.5, 3.5, 7, BLACK[5]);
  r.dot(len - 4, -3.5, BLACK[7]);
  r.end(0.5);
  r.restore();
  r.begin();
  r.poly([[49, 31], [56, 28], [62, 31], [63, 39], [57, 42], [50, 39]], IVORY, { nf: dome(56, 33, 8, 7), bevel: 1, max: 7, spec: IVORY[7], specT: 0.985 });
  r.poly([[50, 38.2], [57, 41.2], [62.8, 38.2], [63, 39.6], [57, 42.6], [50, 39.4]], CRIMSON, { nf: dome(56, 33, 8, 7), max: 4 });
  r.end(0.6);
  r.line(52, 31, 57, 29.5, IVORY[7]);
  r.restore();

  // fx in screen space: muzzle charge and flash, the lock-on sweep and reticle, damage
  const mzA = Math.atan2(C.mz[1] - C.el[1], C.mz[0] - C.el[0]);
  const mz = [C.mz[0] + Math.cos(mzA) * 1 + (P.tx || 0) - (C.recoil || 0), C.mz[1] + Math.sin(mzA) * 1 + (P.ty || 0)];
  if (P.charge) r.glow(mz[0] + 2, mz[1], P.charge, P.charge, G_MAG, { fx: true, bias: 0.5 });
  if (P.flash) muzzleFlash(r, mz[0] + 1, mz[1], P.flash, G_MAG);
  if (P.puff) smoke(r, P.puff, mz[0] + 1, mz[1] - 2, 2.8);
  if (P.sweep) {
    for (let x = 57; x < 84; x++) if ((x + P.sweep) % 3) r.dot(x, Math.round(20 + (x - 57) * P.sweepK), G_MAG[x & 1 ? 2 : 3], 1, true);
  }
  if (P.reticle) {
    const [qx, qy] = P.reticle;
    for (let a = 0; a < 360; a += 12) {
      if ((a + 45) % 90 < 20) continue;
      const p = polar(qx, qy, a, 5.5);
      r.dot(Math.round(p[0]), Math.round(p[1]), G_MAG[3], 1, true);
    }
    r.line(qx - 8, qy, qx - 3, qy, G_MAG[3], 1, true);
    r.line(qx + 3, qy, qx + 8, qy, G_MAG[3], 1, true);
    r.line(qx, qy - 8, qx, qy - 3, G_MAG[3], 1, true);
    r.line(qx, qy + 3, qx, qy + 8, G_MAG[3], 1, true);
    r.dot(qx, qy, WHITE, 1, true);
  }
  if (P.sparks) for (const [seed, x, y, sp, n] of P.sparks) sparks(r, seed, x, y, sp, n);
  if (P.smoke) for (const [seed, x, y, rad] of P.smoke) smoke(r, seed, x, y, rad);
  if (P.motes) {
    const R = rng(P.motes);
    for (let k = 0; k < 3; k++) r.dot(Math.round(34 + R() * 12), Math.round(84 + R() * 6), G_MAG[2 + (k & 1)], 0.7);
  }
}

const SENTINEL_MK3 = {
  w: 84, h: 92,
  bevel: 3,
  draw: drawMk3,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { ty: 0, pulse: 0, motes: 1 },
      { ty: -1, pulse: 1, motes: 2, core: 1.15, cannon: { el: [59, 50], mz: [77, 48] } },
      { ty: -2, pulse: 2, motes: 3, core: 1.3, head: -0.04, cannon: { el: [59, 49], mz: [77, 47] } },
      { ty: -1, pulse: 1, motes: 4, core: 1.15, head: -0.02, cannon: { el: [59, 50], mz: [77, 48] } },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { ty: -1, lean: -0.04, visor: 1.3, core: 1.5, charge: 2.6, cannon: { el: [60, 47], mz: [78, 43] } },
      { ty: -1, lean: -0.08, tx: -2, visor: 1.4, core: 0.9, flash: 7, cannon: { el: [59, 47], mz: [77, 43], recoil: 3 }, head: -0.04 },
      { ty: 0, lean: -0.03, visor: 1.1, core: 0.8, puff: 7, cannon: { el: [59, 48], mz: [77, 45], recoil: 1 } },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { ty: -2, tx: -3, lean: -0.13, visor: 0.4, glitch: 1, ring: 0.5, core: 0.5, head: -0.2, cannon: { el: [58, 50], mz: [72, 58] },
        sparks: [[11, 46, 34, 7, 5]] },
    ] },
    break: { fps: 4, loop: true, poses: [
      { ty: 8, lean: 0.22, visor: 0.25, ring: 0.25, core: 0.3, head: 0.3, pod: -0.2, cannon: { el: [57, 55], mz: [68, 69] },
        sparks: [[21, 44, 40, 6, 5]], smoke: [[23, 32, 14, 4], [24, 28, 8, 3]] },
      { ty: 9, lean: 0.23, visor: 0.6, ring: 0.45, core: 0.5, head: 0.28, pod: -0.2, cannon: { el: [57, 55], mz: [68, 69] },
        sparks: [[31, 47, 44, 6, 4]], smoke: [[33, 31, 12, 4], [34, 27, 6, 3]] },
    ] },
    special: { fps: 6, loop: false, order: [0, 0, 1, 1], poses: [
      { ty: -2, visor: 1.35, core: 1.5, pod: 1, sweep: 1, sweepK: 0.02, head: 0.04, cannon: { el: [60, 47], mz: [78, 43] } },
      { ty: -2, visor: 1.4, core: 1.6, pod: 1.2, sweep: 2, sweepK: 0.02, reticle: [74, 22], head: 0.04, cannon: { el: [60, 47], mz: [78, 43] } },
    ] },
  },
  points: { center: [42, 46], muzzle: [79, 44], top: [44, 4] },
  icon: { x: 43, y: 22, scale: 0.75 },
};

// ---------------------------------------------------------------- LASER TURRET (96x72)

function drawLaser(r, P) {
  const ch = P.charge || 0;
  const coil = ch > 1.2 ? G_HOT : ch > 0.45 ? G_RED : G_RED_DIM;
  const ck = clamp(0.45 + ch * 0.5, 0.3, 1.6);

  // plinth: a hexagonal block with a hazard band, bolts and status lights
  r.begin();
  r.poly([[14, 52], [58, 52], [63, 58], [9, 58]], BLACK, { n: [0, -0.85, 0.5], bevel: 1, max: 7 });
  r.poly([[9, 58], [63, 58], [65, 70], [7, 70]], BLACK, { n: [0.05, 0.1, 1], bevel: 1, max: 5 });
  r.end(0.6);
  r.each(10, 60, 62, 67, (mx, my, X, Y) => {
    if (my < 60.5 || my > 66.5 || mx < 10.5 || mx > 61.5) return;
    r.put(X, Y, Math.floor((mx + my) / 3) % 2 ? CRIMSON[3] : PLATE[6]);
  });
  r.line(10, 60, 62, 60, BLACK[1]);
  r.line(10, 67, 62, 67, BLACK[1]);
  for (const x of [12, 60]) {
    r.dot(x, 69, BLACK[6]);
    r.dot(x, 56, BLACK[6]);
  }
  for (let k = 0; k < 4; k++) {
    const on = ((P.chase ?? -1) + 4) % 4 === k;
    r.dot(28 + k * 4, 68, on ? GLOW_C.red : CRIMSON[1], on ? 1 : 0);
  }
  // turntable and yoke
  r.begin();
  r.ball(36, 52, 15, 3.6, BLACK, { max: 6, spec: BLACK[7], specT: 0.97 });
  r.ball(36, 52, 15, 3.6, PLATE, { clip: (x, y) => y < 50.6, max: 6 });
  r.end(0.5);
  r.begin();
  r.poly([[25, 52], [34, 52], [33, 39], [27, 40]], BLACK, { n: [-0.2, -0.1, 0.97], bevel: 1, max: 4, bias: -0.06 });
  r.end(0.5);

  // the cannon pivots on the trunnion and recoils along its axis
  r.save();
  r.translate(P.hx || 0, P.hy || 0);
  r.rotate(P.rot || 0, 36, 40);
  r.translate(-(P.recoil || 0), 0);
  // rear heat sink
  r.begin();
  r.poly([[9, 33], [16, 32], [16, 48], [9, 47]], BLACK, { n: [-0.3, -0.1, 0.95], bevel: 1, max: 5 });
  r.end(0.5);
  for (let y = 34; y <= 46; y += 3) r.line(9, y, 15, y, BLACK[y & 1 ? 1 : 6]);
  // housing: a long white capsule, black belly, red stripe, four capacitor windows
  r.begin();
  r.seg(18, 40, 58, 40, 9.5, 8.6, PLATE, { max: 7, bias: 0.12, spec: PLATE[7], specT: 0.985 });
  r.seg(18, 40, 58, 40, 9.5, 8.6, BLACK, { clip: (x, y) => y > 43.5, max: 5 });
  r.end(0.6);
  r.seg(18, 40, 58, 40, 9.5, 8.6, CRIMSON, { clip: (x, y) => y > 37.6 && y < 39.6, max: 4 });
  for (let k = 0; k < 4; k++) {
    const x = 23 + k * 8;
    r.rect(x - 1, 41, 6, 2.5, BORE[1]);
    r.rect(x, 41.5, 4, 1.5, coil[3], ck);
    if (ch > 1.2) r.dot(x + 1, 41, WHITE, 1);
  }
  for (let k = 0; k < 4; k++) r.line(28 + k * 5, 32, 30 + k * 5, 32, BLACK[1]);
  r.line(20, 33, 34, 31.5, PLATE[7]);
  // sensor eye on the spine (it sweeps)
  r.begin();
  r.ball(46, 31.5, 3, 2.2, BLACK, { clip: (x, y) => y < 32.3, max: 6 });
  r.end(0.45);
  r.dot(45 + (P.scan || 0), 31, P.eye === 0 ? CRIMSON[1] : GLOW_C.red, P.eye === 0 ? 0 : 1);
  // barrel: a black focusing tube with cooling fins that glow when charged
  r.begin();
  r.seg(58, 40, 84, 40, 3.4, 3, BLACK, { caps: 'flat', max: 6, spec: BLACK[7], specT: 0.96 });
  r.end(0.55);
  for (let k = 0; k < 5; k++) {
    const x = 62 + k * 4;
    r.rect(x, 35, 2, 10, BLACK[k & 1 ? 4 : 5]);
    r.dot(x, 35, BLACK[7]);
    if (ch > 0.45) r.rect(x, 37, 2, 6, coil[ch > 1.2 ? 4 : 2], clamp(ch * 0.55 - k * 0.06, 0.15, 1));
  }
  // lens assembly
  r.begin();
  r.ring(86, 40, 2.8, 5.4, BLACK, { max: 6, spec: BLACK[7], specT: 0.97 });
  r.end(0.5);
  const lk = clamp(P.lens ?? 0.7, 0.15, 1.6);
  r.glow(86.4, 40, 3, 3, lk > 1.2 ? G_HOT : lk > 0.45 ? G_RED : G_RED_DIM, { k: lk, bias: lk > 1 ? 0.7 : 0.25 });
  if (P.glitch) {
    r.line(80, 39, 92, 39, WHITE, 1, true);
    r.line(78, 42, 90, 42, G_RED[3], 1, true);
  }
  r.restore();

  // near yoke arm over the housing, with the trunnion cap
  const th = [37 + (P.hx || 0), 41 + (P.hy || 0)];
  r.begin();
  r.poly([[33, 53], [45, 53], [th[0] + 4, th[1] + 1], [th[0] - 3, th[1] + 2]], BLACK, { n: [0.2, -0.1, 0.97], bevel: 1, max: 6, spec: BLACK[7], specT: 0.98 });
  r.ring(...th, 1.2, 4, PLATE, { max: 7, bias: 0.06, spec: PLATE[7], specT: 0.96 });
  r.end(0.55);
  r.ball(...th, 1.3, 1.3, CRIMSON, { max: 4 });
  r.line(36, 52, th[0] - 1, th[1] + 4, BLACK[6]);

  // fx: gathering sparks, the beam, venting, damage
  const lx = 87 + (P.hx || 0) - (P.recoil || 0), ly = 40 + (P.hy || 0) + (P.rot || 0) * 50;
  if (P.gather) {
    for (let k = 0; k < 7; k++) {
      const [sx, sy] = polar(lx, ly, k * 51 + 20, P.gather + (k & 1) * 2);
      spark(r, Math.round(sx), Math.round(sy), 1, G_HOT);
    }
    r.glow(lx, ly, 3 + ch, 3 + ch, G_HOT, { fx: true, bias: 0.5 });
  }
  if (P.beam) {
    r.beam(lx, ly, 96, ly, P.beam, P.beam, G_HOT, { fx: true, bias: 0.2 });
    r.glow(lx, ly, P.beam + 3, P.beam + 3, G_HOT, { fx: true, bias: 0.5 });
  }
  if (P.vent) {
    steam(r, P.vent, 12, 30, 3.4, 0.6);
    steam(r, P.vent + 3, 9, 25, 2.6, 0.5);
  }
  if (P.sparks) sparks(r, P.sparks, 40, 38, 10, 6);
  if (P.smoke) {
    smoke(r, P.smoke, 50, 28, 3.6);
    smoke(r, P.smoke + 5, 54, 22, 2.8, 0.55);
  }
}

const LASER_TURRET = {
  w: 96, h: 72,
  bevel: 3,
  draw: drawLaser,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { lens: 0.7, chase: 0, scan: 0 },
      { lens: 0.85, chase: 1, scan: 1, rot: -0.01 },
      { lens: 1, chase: 2, scan: 2, rot: -0.015, vent: 3 },
      { lens: 0.85, chase: 3, scan: 1, rot: -0.01 },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { lens: 1.6, charge: 2, chase: 0, gather: 6 },
      { lens: 1.6, charge: 1.6, recoil: 3, beam: 3.2, chase: 1 },
      { lens: 1, charge: 0.8, recoil: 1, vent: 7, chase: 2 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { hx: -2, rot: -0.14, lens: 0.3, glitch: 1, eye: 0, sparks: 7 },
    ] },
    break: { fps: 4, loop: true, poses: [
      { hy: 3, rot: 0.3, lens: 0.2, eye: 0, sparks: 13, smoke: 5 },
      { hy: 3, rot: 0.32, lens: 0.4, eye: 0, sparks: 29, smoke: 9, chase: 1 },
    ] },
    special: { fps: 6, loop: false, order: [0, 0, 1, 1], poses: [
      { lens: 1.1, charge: 0.9, gather: 9, chase: 0, scan: 2 },
      { lens: 1.6, charge: 2, gather: 5, vent: 11, chase: 2, scan: 2 },
    ] },
  },
  points: { center: [40, 46], muzzle: [88, 40], top: [40, 24], core: [86, 40] },
  icon: { x: 66, y: 40, scale: 0.5 },
};

export default {
  sec_trooper: SEC_TROOPER,
  riot_drone: RIOT_DRONE,
  sentinel_mk3: SENTINEL_MK3,
  laser_turret: LASER_TURRET,
};
