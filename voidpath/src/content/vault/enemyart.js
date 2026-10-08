// vault: regular-enemy art (browser, TECH_PLAN 2.5, 7.6, 7.8; bestiary task CA-beta2).
//
// The Memory Vault is cyberspace inside HALCYON's mind: cyan and violet light on a black data
// starfield, with magenta corruption (12.1). The enemies are her defences and her damaged memories,
// painted as solid shaded forms with the POC enemy rig and the bestiary toolkit exported by
// prologue/enemyart.js, then roughed up by a few raster passes that only this location uses (tears,
// chromatic splits, scanline dissolves). All sprites face RIGHT.
//
//   data_wraith      88x96   hooded wraith of data; `special` is the phase-out (it glitches, then
//                            dissolves into scanlines) before the stage turns it untargetable.
//   firewall_golem  104x96   a battlemented wall of bricks over glowing mortar, data fire burning in
//                            its crenels, a padlock head and a honeycomb shield; `special` throws up
//                            a wall of light (adapting). Its break pops the padlock open.
//   glitch_swarm     80x64   winged one-eyed voxels round a big queen voxel; their colours flip
//                            between frames (shifting weak points); `special` shuffles them in a ring.
//   corrupted_memory 88x100  a memory crystal half eaten by magenta corruption, a loading ring around
//                            it; `special` fills the ring (Overwrite charge), `attack` releases it.
//
// The Director plays `special` for charge-type enemy actions (buff, heal, summon, submerge, lockOn,
// charge) and `attack` (or the action's `pose`) for attacks.

import { rng } from '../../art/painter.js';
import {
  rp, WHITE, DEG, clamp, STEEL, G_MAG, G_MAG_DIM, G_CYAN, spark, sparks, smoke, polar, along, limbPlate, dome,
} from '../prologue/enemyart.js';

// ---------------------------------------------------------------- colours

// solid materials, dark -> light
const CLOTH = rp('#07061a', '#0f0c2d', '#181341', '#221a57', '#2e236f', '#3d2f8b', '#5040ab', '#6c5ad0');
const MASK = rp('#16222f', '#24384c', '#3a5670', '#567a96', '#7ba2bc', '#a8cade', '#d6eef8', '#f4fdff');
const HARD = rp('#062833', '#0a3f52', '#0f5c74', '#167f98', '#22a6bd', '#45cfe0', '#8eeef5', '#d8fdff');
const PLATE = rp('#100a24', '#1a1140', '#26195a', '#342376', '#452f92', '#5a3eae', '#7859cc', '#a68cec');
const BRICK = rp('#090c15', '#111726', '#1a2238', '#25304d', '#334164', '#46577f', '#6173a0', '#8a9ec6');
const CRYSTAL = rp('#03141b', '#06222d', '#0a3240', '#0f4556', '#165d70', '#1f7a8e', '#3aa6b8', '#8ce4ee');
const ROT = rp('#1c0418', '#34082c', '#540e45', '#7a1662', '#a2217e', '#cc3a9c', '#f06cc0', '#ffb6e4');

// glow ramps, outer (dim) -> inner (hot)
const G_CYAN_DIM = rp('#06222e', '#0a3446', '#0e4a60', '#145f78', '#1d7590');
const G_VIOLET = rp('#3a1466', '#6b2bb0', '#a35cff', '#cf9dff', '#f3e6ff');
const G_VIOLET_DIM = rp('#1a0a2e', '#2a1248', '#3a1a62', '#4b2378', '#5c2e8a');
const FRINGE_L = G_MAG[2], FRINGE_R = G_CYAN[3];

// ---------------------------------------------------------------- raster passes (screen space)

// Rig pixel flags (art/enemies.js): drawn, effect (gets no outline), lit (has emissive).
const OPAQUE = 1, FX = 2, LIT = 8;

/** Datamosh tear: shifts the screen rows y0 .. y0+h-1 sideways by dx pixels (what leaves the frame is lost). */
function tear(r, y0, h, dx) {
  const { w, rgb, glw, flg } = r;
  for (let Y = Math.max(0, y0); Y < Math.min(r.h, y0 + h); Y++) {
    const row = Y * w;
    const f = flg.slice(row, row + w), c = rgb.slice(row * 3, row * 3 + w * 3), e = glw.slice(row * 3, row * 3 + w * 3);
    for (let X = 0; X < w; X++) {
      const s = X - dx, i = row + X;
      if (s < 0 || s >= w) { flg[i] = 0; continue; }
      flg[i] = f[s];
      for (let k = 0; k < 3; k++) { rgb[i * 3 + k] = c[s * 3 + k]; glw[i * 3 + k] = e[s * 3 + k]; }
    }
  }
}

/** Chromatic split on rows y0..y1-1: a magenta ghost d pixels left of the silhouette, a cyan one d pixels right. */
function chroma(r, y0, y1, d, k = 0.6) {
  const { w, flg } = r;
  const marks = [];
  for (let Y = Math.max(0, y0); Y < Math.min(r.h, y1); Y++) {
    for (let X = 0; X < w; X++) {
      if ((flg[Y * w + X] & (OPAQUE | FX)) !== OPAQUE) continue;
      for (let s = 1; s <= d; s++) {
        if (X - s >= 0 && !(flg[Y * w + X - s] & OPAQUE)) marks.push(X - s, Y, FRINGE_L);
        if (X + s < w && !(flg[Y * w + X + s] & OPAQUE)) marks.push(X + s, Y, FRINGE_R);
      }
    }
  }
  for (let m = 0; m < marks.length; m += 3) r.put(marks[m], marks[m + 1], marks[m + 2], k, true);
}

/**
 * Scanline dissolve on rows y0..y1-1: every `period`-th row stays (tinted toward cyan light, emissive, no
 * outline), the rows between vanish. Reads as a hologram coming apart.
 */
function scan(r, y0, y1, period, k = 0.45, mix = 0.45) {
  const { w, rgb, glw, flg } = r;
  const tint = G_CYAN[3];
  for (let Y = Math.max(0, y0); Y < Math.min(r.h, y1); Y++) {
    const keep = Y % period === 0;
    for (let X = 0; X < w; X++) {
      const i = Y * w + X;
      if (!(flg[i] & OPAQUE)) continue;
      if (!keep) { flg[i] = 0; continue; }
      for (let c = 0; c < 3; c++) {
        rgb[i * 3 + c] += (tint[c] - rgb[i * 3 + c]) * mix;
        glw[i * 3 + c] = Math.max(glw[i * 3 + c], rgb[i * 3 + c] * k);
      }
      flg[i] |= FX | LIT;
    }
  }
}

/** Drifting data fragments: a column of shrinking squares below (x, y), some lit. */
function fragments(r, x, y, n, ramp, seed, k = 0.8) {
  const R = rng(seed);
  let yy = y, size = n > 2 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const lit = R() < 0.55;
    const xx = Math.round(x + (R() - 0.5) * 3);
    r.rect(xx, Math.round(yy), size, size, lit ? ramp[3] : CLOTH[3], lit ? k : 0);
    yy += size + 1 + R() * 2.5;
    if (i >= n / 2) size = 1;
  }
}

/** Hard-light claw: a thin glowing forearm bone, a knuckle and three long curled talons. */
function claw(r, el, hand, spread, curl, k, far = false) {
  const top = far ? 5 : 7;
  r.begin();
  r.seg(...el, ...hand, 1.5, 1.1, HARD, { glow: 0.25 * k, max: top - 1, spec: far ? null : HARD[7], specT: 0.94 });
  r.ball(...hand, 2.2, 2, HARD, { glow: 0.3 * k, max: top - 1 });
  r.end(0.5);
  const base = Math.atan2(hand[1] - el[1], hand[0] - el[0]) / DEG;
  for (let f = -1; f <= 1; f++) {
    const a0 = base + f * spread, len = 10 - Math.abs(f) * 2.5;
    const m = polar(...hand, a0, len * 0.5), t = polar(...m, a0 + curl, len * 0.6);
    r.seg(...hand, ...m, 0.95, 0.75, HARD, { glow: 0.45 * k, max: top, min: 3 });
    r.seg(...m, ...t, 0.75, 0.15, HARD, { glow: 0.6 * k, max: top, min: 4 });
  }
}

// ---------------------------------------------------------------- DATA WRAITH (88x96)

/** Ragged bell sleeve of cloak cloth from the shoulder to the cuff; the cuff glows violet. */
function sleeve(r, sh, cuff, far) {
  r.begin();
  limbPlate(r, sh, cuff, [[0, -3], [0, 3.2], [0.8, 5.4], [1, 4.4], [0.9, 1.5], [1.08, -1], [0.92, -3.4], [1, -5.2]], CLOTH, {
    max: far ? 4 : 7, bias: far ? -0.12 : 0.1, curve: 0.9,
  });
  r.end(0.55);
  const a = along(sh, cuff, 0.95, 4.6), b = along(sh, cuff, 0.95, -4.6);
  r.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), (far ? G_VIOLET_DIM : G_VIOLET)[2], far ? 0.3 : 0.55);
}

/** Wraith arm: sleeve to the cuff, then a long hard-light forearm and talons. */
function wraithArm(r, body, a, far, k) {
  r.save();
  body();
  const sh = a.sh, cuff = along(a.sh, a.el, 1, 0);
  sleeve(r, sh, cuff, far);
  const el = r.pt(...a.el);
  r.restore();
  claw(r, el, a.hand, a.spread ?? 22, a.curl ?? 38, far ? k * 0.6 : k, far);
}

function drawWraith(r, P) {
  const eye = P.eye ?? 1, sway = P.sway || 0;
  const A = P.arms || {};
  const body = () => {
    r.translate(P.tx || 0, (P.ty || 0) + (P.bob || 0));
    r.rotate(P.lean || 0, 40, 52);
  };
  const ev = eye > 0.55 ? G_CYAN : G_CYAN_DIM, ek = clamp(eye, 0.2, 1.4);

  // far arm, mostly behind the cloak
  wraithArm(r, body, A.far || { sh: [50, 46], el: [57, 55], hand: [66, 61] }, true, ek);

  r.save();
  body();
  // cloak: shoulders sweeping into a ragged tail that trails back and frays into data
  const hem = (P.hem || [[10, 88], [17, 82], [21, 86], [26, 78], [31, 84], [36, 76], [41, 80], [45, 70], [50, 73], [53, 63]])
    .map(([x, y], i) => [x + Math.sin(sway + i * 0.7) * (10 - i) * 0.22, y + Math.cos(sway + i * 0.9) * 0.6]);
  r.begin();
  r.poly([[30, 40], [22, 47], [17, 58], [15, 70], [12, 80], ...hem, [57, 55], [58, 46], [50, 40]], CLOTH, {
    nf: dome(36, 54, 26, 32), bevel: 1, max: 6, spec: CLOTH[7], specT: 0.985,
  });
  r.end(0.6);
  // folds: dark valleys running down to the hem points, lit ridges between them
  for (let i = 1; i < hem.length - 1; i += 2) {
    const [x, y] = hem[i - 1], top = [26 + i * 2.6, 50];
    r.line(Math.round(top[0]), top[1], Math.round(x + 2), Math.round(y - 5), CLOTH[1]);
    const [rx, ry] = hem[i];
    r.line(Math.round(top[0] + 2), top[1] + 2, Math.round(rx + 1), Math.round(ry - 4), CLOTH[5]);
  }
  for (let i = 0; i < hem.length - 1; i += 2) {
    const [x, y] = hem[i];
    fragments(r, x - 1, y + 3, 3 + (i < 4 ? 1 : 0), i % 4 ? G_VIOLET : G_CYAN, 11 + i * 7 + (P.seed || 0), 0.75);
  }
  // the front opening of the cloak, the data heart inside, circuit trim down the edge
  r.poly([[47, 44], [53, 44], [56, 52], [54, 62], [45, 64], [44, 52]], CLOTH, { idx: 0 });
  const tk = clamp(eye * 0.55, 0.15, 0.8);
  r.line(46, 45, 43, 52, ev[2], tk);
  r.line(43, 52, 44, 63, ev[2], tk);
  r.line(21, 56, 30, 56, ev[1], tk * 0.8);
  r.line(30, 56, 33, 53, ev[1], tk * 0.8);
  r.line(33, 53, 40, 53, ev[1], tk * 0.8);
  for (const [x, y] of [[21, 56], [40, 53], [44, 63]]) r.rect(x - 1, y - 1, 2, 2, ev[3], tk);
  const hb = 1 + (P.heart ?? 1) * 1.5;
  r.poly([[50, 48], [50 + hb, 52.5], [50, 57], [50 - hb, 52.5]], HARD, { n: [-0.3, -0.3, 0.9], glow: 0.6 * ek, max: 7, min: 3 });
  r.dot(50, 52, WHITE, 0.8 * ek);

  // hood: swept-back cowl whose peak frays into data, a lit brim over the face
  r.save();
  r.translate(0, P.hy || 0);
  r.rotate(P.head || 0, 46, 42);
  r.begin();
  r.poly([[28, 34], [24, 22], [18, 11], [29, 10], [40, 7], [50, 9], [58, 15], [62, 24], [61, 34], [56, 41], [46, 45], [34, 44]], CLOTH, {
    nf: dome(42, 24, 22, 20), bevel: 1, max: 6,
  });
  r.end(0.6);
  if (!P.fallen) fragments(r, 15, 8, 3, G_VIOLET, 5 + (P.seed || 0), 0.6);
  r.line(21, 12, 30, 19, CLOTH[5]);
  r.line(31, 12, 41, 9, CLOTH[6]);
  r.line(29, 24, 34, 39, CLOTH[1]);
  r.line(38, 18, 41, 41, CLOTH[2]);
  // the face opening (deep shadow), rimmed with violet light
  const face = [[48, 18], [56, 17], [61, 22], [62, 31], [58, 39], [51, 40], [47, 30]];
  r.poly(face, CLOTH, { idx: 0 });
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = face[k], [bx, by] = face[k + 1];
    r.line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), G_VIOLET[2], 0.5 * clamp(eye, 0.4, 1));
  }
  r.begin();
  r.poly([[45, 17], [53, 12], [61, 15], [65, 22], [63, 24], [57, 18], [49, 19]], CLOTH, { n: [0.1, -0.85, 0.5], bevel: 1, max: 7 });
  r.end(0.5);
  // the mask: a pale hard-light face plate with an eye slit and a magenta crack
  r.begin();
  r.poly([[51, 21], [57, 21], [60, 26], [59, 32], [55, 37], [51, 35], [50, 28]], MASK, { nf: dome(54, 27, 7, 11), bevel: 1, max: 6, spec: MASK[7], specT: 0.975, bias: -0.06 });
  r.end(0.5);
  if (P.chip) r.poly([[57, 30], [60, 27], [59.5, 33], [56, 36]], CLOTH, { idx: 0 });
  r.line(52, 26, 59, 25, ev[eye > 1.05 ? 4 : 3], ek);
  r.line(53, 27, 58, 27, ev[2], ek * 0.7);
  if (eye > 0.55) r.dot(57, 25, WHITE, 1);
  r.line(55, 30, 55, 35, MASK[2]);
  r.line(56, 21, 55, 23, G_MAG[2], 0.6);
  r.line(55, 23, 56, 25, G_MAG[2], 0.6);
  if (P.chip) r.line(56, 28, 58, 32, G_MAG[3], 0.8);
  r.restore();
  r.restore();

  // near arm over the cloak
  wraithArm(r, body, A.near || { sh: [38, 47], el: [46, 58], hand: [57, 64] }, false, ek);

  if (P.slash) {
    // the claw's arc of light (cyan core, magenta edge)
    const [cx, cy, rad, a0, a1] = P.slash;
    for (let a = a0; a <= a1; a += 2) {
      const t = (a - a0) / (a1 - a0), w = 0.6 + Math.sin(t * Math.PI) * 2.6;
      for (let s = -w; s <= w; s += 0.5) {
        const [x, y] = polar(cx, cy, a, rad + s);
        const edge = Math.abs(s) > w - 0.9;
        r.dot(Math.round(x), Math.round(y), edge ? G_MAG[2] : t > 0.75 ? G_CYAN[4] : G_CYAN[3], edge ? 0.6 : 0.9, true);
      }
    }
  }
  if (P.floor) for (const [x, y, c] of P.floor) r.rect(x, y, 2, 2, c ? G_CYAN[2] : CLOTH[4], c ? 0.5 : 0);
  if (P.sparkle) sparks(r, P.sparkle, 54, 30, 10, 6, G_CYAN);

  for (const [y, h, dx] of P.tears || []) tear(r, y, h, dx);
  if (P.chroma) chroma(r, P.chroma[0], P.chroma[1], P.chroma[2], 0.55);
  if (P.scan) scan(r, 0, r.h, P.scan, 0.5);
  else scan(r, 80 + (P.ty || 0) + (P.bob || 0), r.h, 2, 0.3, 0.3);   // the hem dissolves into light
}

const WRAITH_SLUMP = {
  near: { sh: [38, 47], el: [43, 60], hand: [46, 74], spread: 16, curl: 60 },
  far: { sh: [50, 46], el: [55, 58], hand: [60, 71], spread: 16, curl: 60 },
};
const WRAITH_FRAYED = [[14, 78], [19, 75], [23, 78], [27, 72], [31, 76], [36, 70], [41, 73], [45, 66], [50, 68], [53, 61]];

const DATA_WRAITH = {
  w: 88, h: 96,   // room on the right for the claw swipe
  bevel: 3,
  draw: drawWraith,
  anims: {
    idle: { fps: 6, loop: true, poses: [
      { bob: 0, sway: 0, heart: 1 },
      { bob: -1, sway: 1.5, heart: 0.6, eye: 0.85, arms: { near: { sh: [38, 47], el: [46, 57], hand: [58, 62] } } },
      { bob: -2, sway: 3, heart: 0.2, tears: [[24, 2, 2], [52, 2, -2]], chroma: [22, 28, 1], seed: 3 },
      { bob: -1, sway: 4.5, heart: 0.6, eye: 0.9, arms: { far: { sh: [50, 46], el: [57, 54], hand: [67, 59] } } },
    ] },
    attack: { fps: 9, loop: false, poses: [
      { lean: -0.12, tx: -2, eye: 1.4, sway: 2, heart: 1, arms: { near: { sh: [38, 46], el: [38, 34], hand: [44, 18], spread: 30, curl: 26 }, far: { sh: [50, 46], el: [55, 56], hand: [52, 66] } } },
      { lean: 0.14, tx: 5, eye: 1.4, sway: 3.5, heart: 0.6, slash: [44, 46, 31, -70, 50], arms: { near: { sh: [40, 48], el: [54, 52], hand: [73, 56], spread: 22, curl: 16 }, far: { sh: [50, 46], el: [60, 52], hand: [70, 52] } } },
      { lean: 0.08, tx: 3, eye: 1.1, sway: 4.5, heart: 0.2, arms: { near: { sh: [40, 48], el: [50, 60], hand: [64, 72], spread: 24, curl: 36 } } },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { lean: -0.16, tx: -4, eye: 0.4, sway: 5, chip: 1, sparkle: 7, tears: [[18, 4, -3], [44, 3, 4], [66, 5, -2]], chroma: [10, 90, 2],
        arms: { near: { sh: [38, 47], el: [41, 59], hand: [45, 70] }, far: { sh: [50, 46], el: [55, 57], hand: [58, 66] } } },
    ] },
    break: { fps: 4, loop: true, poses: [
      { ty: 14, lean: 0.24, head: 0.3, hy: 2, eye: 0.25, chip: 1, fallen: 1, hem: WRAITH_FRAYED, arms: WRAITH_SLUMP, sway: 1, heart: 0.2,
        floor: [[14, 93, 1], [22, 93, 0], [62, 93, 1], [70, 92, 0], [77, 93, 1]], tears: [[30, 2, 2]] },
      { ty: 14, lean: 0.25, head: 0.32, hy: 2, eye: 0.55, chip: 1, fallen: 1, hem: WRAITH_FRAYED, arms: WRAITH_SLUMP, sway: 2, heart: 0.5,
        floor: [[14, 93, 0], [22, 93, 1], [62, 93, 0], [70, 92, 1], [77, 93, 0]], tears: [[46, 2, -2]], chroma: [36, 44, 1] },
    ] },
    special: { fps: 8, loop: false, order: [0, 1, 0, 1], poses: [
      { eye: 1.5, sway: 3, heart: 1, tears: [[14, 3, 3], [30, 2, -3], [52, 4, 3], [72, 3, -2]], chroma: [0, 96, 3] },
      { eye: 1.5, sway: 4, heart: 1, tears: [[22, 3, -2], [60, 3, 2]], scan: 2, chroma: [0, 96, 1] },
    ] },
  },
  points: { center: [40, 50], muzzle: [72, 58], top: [40, 6] },
  icon: { x: 52, y: 28, scale: 0.62 },
};

// ---------------------------------------------------------------- FIREWALL GOLEM (104x96)

const G_DATAFIRE = rp('#2c0f58', '#6a26c4', '#2f8cf0', '#4fe2ff', '#c8fbff');

/** Point-in-polygon test for a fixed outline (model space). */
function inPoly(pts) {
  return (x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
}

/** Flat-top hexagon outline of circumradius R. */
const hexPts = (cx, cy, R) => [0, 60, 120, 180, 240, 300].map((a) => polar(cx, cy, a, R));

const S3 = Math.sqrt(3);
/** Hex norm of a flat-top hexagon: <= R inside a hexagon of circumradius R. */
const hexN = (x, y) => Math.max(Math.abs(y) * 2 / S3, Math.abs(x) + Math.abs(y) / S3);

/** Nearest cell of a flat-top hex grid of circumradius `cell`: [hex norm to its centre, cx, cy, id]. */
function hexCell(x, y, cell) {
  let best = Infinity, bx = 0, by = 0, id = 0;
  const c0 = Math.round(x / (1.5 * cell));
  for (let c = c0 - 1; c <= c0 + 1; c++) {
    const yo = (c & 1) * 0.5, r0 = Math.round(y / (S3 * cell) - yo);
    for (let q = r0 - 1; q <= r0 + 1; q++) {
      const ux = c * 1.5 * cell, uy = (q + yo) * S3 * cell, d = hexN(x - ux, y - uy);
      if (d < best) { best = d; bx = ux; by = uy; id = c * 31 + q * 7; }
    }
  }
  return [best, bx, by, id];
}

/**
 * Honeycomb of hard light inside a flat-top hexagon of radius R: dark violet cells shaded as shallow
 * domes, glowing cyan cell walls. `holes` (0..1) knocks cells out; `k` scales the glow.
 */
function honeycomb(r, cx, cy, R, cell, k, { holes = 0, seed = 1 } = {}) {
  r.each(cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1, (mx, my, X, Y) => {
    const x = mx - cx, y = my - cy;
    if (hexN(x, y) > R) return;
    const [best, bx, by, id] = hexCell(x, y, cell);
    if (holes && rng(seed + id * 13)() < holes) return;
    if (best > cell - 1.05) r.put(X, Y, (k > 0.5 ? G_CYAN : G_CYAN_DIM)[best > cell - 0.55 ? 3 : 2], 0.45 * k);
    else r.lightPut(X, Y, ((x - bx) / cell) * 0.7, ((y - by) / cell) * 0.7, 0.75, PLATE, { max: 4, bias: -0.05, dither: 0.3 });
  });
}

/**
 * Energy panel: a tall hexagonal slab of see-through light (a checker dither between glowing hex walls)
 * from y0 to y1, growing upward with `t` (0..1). Effect pixels, no outline.
 */
function hexPanel(r, x0, x1, y0, y1, t) {
  const top = y1 - (y1 - y0) * t, cx = (x0 + x1) / 2, hw = (x1 - x0) / 2;
  r.each(x0 - 1, top - 1, x1 + 1, y1 + 1, (mx, my, X, Y) => {
    const ex = hw - Math.max(0, Math.max(top + hw - my, my - (y1 - hw))) * 0.6;   // bevelled top and bottom corners
    const dx = Math.abs(mx - cx);
    if (dx > ex || my < top || my > y1) return;
    if (dx > ex - 1 || my < top + 1) { r.put(X, Y, G_CYAN[4], 0.8, true); return; }
    const [best] = hexCell(mx - cx, my - y1, 3);
    if (best > 2) r.put(X, Y, G_CYAN[3], 0.55, true);
    else if (!((X + Y) & 1)) r.put(X, Y, G_CYAN_DIM[3], 0.3, true);
  });
}

/** A rising tongue of digital fire built from 2-px rows: pale cyan at the base, violet at the frayed tip. */
function dataFlame(r, x, y, h, ph, k = 0.5) {
  for (let j = 0; j < h; j += 2) {
    const t = j / h, hw = Math.pow(1 - t, 0.7) * 3.4 + 0.3;
    const xo = Math.sin(ph + j * 0.5) * t * 2.4 - t * 1.8;
    const ci = clamp(Math.floor((1 - t) * 3.6), 0, 3);
    for (let sx = Math.round(-hw); sx <= Math.round(hw); sx++) {
      const edge = Math.abs(sx) >= hw - 0.8;
      const hot = j === 0 && Math.abs(sx) < 1;
      r.rect(Math.round(x + xo + sx), y - j - 2, 1, 2, G_DATAFIRE[hot ? 4 : clamp(ci - (edge ? 2 : 0), 0, 3)], k * (edge ? 0.7 : 1), true);
    }
  }
  const R = rng(Math.floor(ph * 10) + x);
  for (let n = 0; n < 2; n++) if (R() < 0.6) r.rect(x + Math.round((R() - 0.7) * 5), y - h - 3 - Math.floor(R() * 5), 1, 1, G_DATAFIRE[R() < 0.5 ? 2 : 3], k, true);
}

/** Bevelled stone-like block (bricks of the legs and fists), shaded as a box. */
function block(r, x, y, w, h, ramp, o = {}) {
  r.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], ramp, { n: o.n || [0.05, -0.2, 1], bevel: 1, max: o.max ?? 6, bias: o.bias || 0, glow: o.glow || 0 });
}

const FW_TORSO = [
  [17, 62], [15, 30], [17, 29], [17, 19], [28, 19], [28, 29], [32, 29], [32, 17], [43, 17], [43, 29], [47, 29], [47, 18], [58, 18], [58, 29],
  [64, 28], [72, 30], [76, 42], [74, 58], [68, 70], [48, 75], [27, 73],
];
const FW_IN = inPoly(FW_TORSO);

/** Brick column of a leg (hip -> foot) standing on a wide slab. */
function fwLeg(r, hip, foot, far) {
  const o = far ? { max: 4, bias: -0.12 } : { max: 6 };
  r.begin();
  r.seg(...hip, ...foot, 4.6, 4.2, BRICK, { caps: 'flat', ...o });
  for (const t of [0.12, 0.52]) {
    const [x, y] = along(hip, foot, t, 0);
    block(r, x - 6, y, 12, 8, BRICK, { ...o, n: [0.1, -0.25, 1] });
  }
  r.end(0.55);
  r.begin();
  block(r, foot[0] - 8, foot[1] - 5, 17, 5, BRICK, { ...o, n: [0.05, -0.6, 0.8] });
  r.end(0.55);
  if (!far) r.line(foot[0] - 7, foot[1] - 3, foot[0] + 7, foot[1] - 3, G_CYAN_DIM[3], 0.5);
}

/** Arm: a brick upper arm under a violet hard-light pauldron, a plated forearm. */
function fwArm(r, sh, el, hand, far) {
  const o = far ? { max: 4, bias: -0.14 } : { max: 6 };
  r.begin();
  r.seg(...sh, ...el, 5.2, 4.6, BRICK, { ...o });
  r.end(0.55);
  r.begin();
  limbPlate(r, el, hand, [[-0.1, -5.6], [-0.1, 5.4], [0.9, 6.2], [1.05, 0], [0.9, -6.4]], PLATE, { ...o, max: far ? 4 : 6, curve: 0.85 });
  r.ball(...el, 4, 4, PLATE, { ...o, max: far ? 4 : 6 });
  r.end(0.55);
  const a = along(el, hand, 0.25, 0), b = along(el, hand, 0.8, 0);
  r.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), (far ? G_CYAN_DIM : G_CYAN)[2], far ? 0.3 : 0.55);
}

/** The near fist: a cube of bricks with a glowing knuckle band. */
function fwFist(r, cx, cy, k) {
  r.begin();
  r.poly([[cx - 8, cy - 5], [cx - 4, cy - 9], [cx + 9, cy - 9], [cx + 6, cy - 5]], BRICK, { n: [-0.2, -0.85, 0.5], bevel: 1, max: 7 });
  r.poly([[cx - 8, cy - 5], [cx + 6, cy - 5], [cx + 6, cy + 7], [cx - 8, cy + 7]], BRICK, { n: [-0.1, -0.1, 1], bevel: 1, max: 6 });
  r.poly([[cx + 6, cy - 5], [cx + 9, cy - 9], [cx + 9, cy + 3], [cx + 6, cy + 7]], BRICK, { n: [0.8, -0.1, 0.6], bevel: 1, max: 4 });
  r.end(0.6);
  r.line(cx - 7, cy + 1, cx + 5, cy + 1, BRICK[1]);
  for (const x of [cx - 4, cx, cx + 4]) r.line(x, cy - 5, x, cy + 1, BRICK[1]);
  r.line(cx - 7, cy + 3, cx + 5, cy + 3, (k > 0.5 ? G_CYAN : G_CYAN_DIM)[3], clamp(k, 0.2, 1) * 0.8);
}

/** Padlock head: a domed violet lock body with a keyhole eye, a steel shackle (`open` swings it up). */
function padlock(r, cx, cy, key, open) {
  r.save();
  r.rotate(-open * DEG, cx + 5, cy - 6);
  r.translate(0, -open * 0.08);
  r.begin();
  r.ring(cx, cy - 6, 3.4, 6.6, STEEL, { clip: (x, y) => y < cy - 5, max: 7, spec: WHITE, specT: 0.96 });
  r.seg(cx - 5, cy - 6, cx - 5, cy - 3, 1.6, 1.6, STEEL, { caps: 'flat', max: 6 });
  r.seg(cx + 5, cy - 6, cx + 5, cy - 3, 1.6, 1.6, STEEL, { caps: 'flat', max: 5 });
  r.end(0.5);
  r.restore();
  r.begin();
  r.poly([[cx - 8, cy - 4], [cx + 7, cy - 4], [cx + 9, cy - 2], [cx + 9, cy + 9], [cx + 7, cy + 11], [cx - 7, cy + 11], [cx - 9, cy + 9], [cx - 9, cy - 2]], PLATE, {
    nf: dome(cx - 1, cy + 3, 11, 10), bevel: 1, max: 7, spec: PLATE[7], specT: 0.98,
  });
  r.end(0.55);
  r.line(cx - 7, cy - 2, cx + 6, cy - 2, PLATE[7]);
  r.line(cx - 7, cy + 9, cx + 7, cy + 9, PLATE[1]);
  for (const [x, y] of [[cx - 6, cy], [cx + 6, cy], [cx - 6, cy + 7], [cx + 6, cy + 7]]) r.dot(x, y, STEEL[6]);
  // keyhole: the golem's eye
  const kc = key > 0.55 ? G_CYAN : G_CYAN_DIM, kk = clamp(key, 0.2, 1.4);
  r.glow(cx + 1.5, cy + 2, 2.4, 2.4, kc, { k: kk, bias: key > 1.05 ? 0.7 : 0.3 });
  r.rect(cx + 1, cy + 3, 2, 4, kc[key > 1.05 ? 4 : 3], kk);
  if (key > 0.55) r.dot(cx + 1, cy + 1, WHITE, 1);
}

function drawGolemFW(r, P) {
  const key = P.key ?? 1, fire = P.fire ?? 1, ph = P.ph || 0;
  const tx = P.tx || 0, ty = P.ty || 0;
  const torso = () => {
    r.translate(tx, ty);
    r.rotate(P.lean || 0, 46, 72);
  };
  const A = P.arms || {};
  r.save();
  torso();
  const shN = r.pt(22, 46), shF = r.pt(66, 36), hipN = r.pt(38, 70), hipF = r.pt(56, 68);
  r.restore();
  const L = P.legs || {};

  // far arm and leg, behind the wall
  const fa = A.far || { el: [74, 50], hand: [82, 58] };
  fwArm(r, shF, fa.el, fa.hand, true);
  fwLeg(r, hipF, L.far || [58, 93], true);

  r.save();
  torso();
  // the wall: glowing mortar under rows of bricks (a scan band runs down the mortar)
  const scanY = P.scanY ?? -20;
  const mk = clamp(key, 0.3, 1.2);
  r.each(14, 16, 78, 76, (mx, my, X, Y) => {
    if (!FW_IN(mx, my)) return;
    const hot = Math.abs(my - scanY) < 3;
    r.put(X, Y, hot ? G_CYAN[3] : G_CYAN_DIM[2], (hot ? 0.75 : 0.4) * mk);
  });
  const R = rng(P.seed || 7);
  const fallen = [];
  for (let row = 0; row < 9; row++) {
    const y = 17 + row * 7, off = (row % 2) * 6;
    for (let x = 12 - off; x < 80; x += 12) {
      const roll = R(), j = (R() - 0.5) * 0.24;
      if (P.loose && roll < P.loose) { fallen.push([x, y]); continue; }
      const c = dome(46, 48, 34, 34, 0.55)(x + 6, y + 3.5);
      const lit = roll > 0.9;
      r.poly([[x + 0.5, y + 0.5], [x + 11.5, y + 0.5], [x + 11.5, y + 6.5], [x + 0.5, y + 6.5]], lit ? PLATE : BRICK, {
        n: [c[0] + j, c[1] - 0.1, c[2]], bevel: 1, max: lit ? 6 : 5, clip: FW_IN, glow: lit ? 0.2 : 0,
      });
      if (!lit && roll < 0.25 && FW_IN(x + 3, y + 3) && FW_IN(x + 6, y + 4)) r.line(x + 3, y + 3, x + 6, y + 4, BRICK[1]);
    }
  }
  // the kernel behind a missing brick in the chest
  const ck = clamp(key, 0.2, 1.5);
  r.poly([[57, 44], [68, 44], [68, 51], [57, 51]], BRICK, { idx: 0 });
  r.poly([[62.5, 44.5], [65.5, 47.5], [62.5, 50.5], [59.5, 47.5]], HARD, { n: [-0.3, -0.4, 0.85], glow: 0.7 * ck, max: 7, min: 3 });
  if (key > 0.55) r.dot(62, 46, WHITE, 1);

  // violet pauldrons: the far one behind the head, the near one over the shoulder
  r.begin();
  r.poly([[60, 29], [67, 25], [75, 28], [77, 36], [71, 40], [61, 38]], PLATE, { nf: dome(68, 31, 10, 8), bevel: 1, max: 5, bias: -0.06 });
  r.end(0.55);
  // data fire along the top of the wall
  if (fire > 0) {
    const bases = [[22, 19, 8], [30, 29, 14], [38, 17, 9], [45, 29, 16], [53, 18, 10], [61, 28, 12], [68, 29, 8]];
    bases.forEach(([x, y, h], i) => dataFlame(r, x, y, Math.round(h * fire * (0.75 + 0.25 * Math.sin(ph + i * 1.9))), ph + i * 1.3, 0.5 * clamp(fire, 0.3, 1.2)));
  } else if (P.embers) {
    for (const [x, y] of [[30, 25], [45, 25], [61, 24]]) smoke(r, P.embers + x, x, y, 3, 0.5, G_VIOLET_DIM);
  }
  r.restore();

  // shield: a hex of hard light on the far forearm
  if (P.shield !== 0) {
    const sh = P.shield || {};
    const [scx, scy] = sh.at || [88, 60];
    const sR = sh.R || 12;
    r.save();
    r.translate(tx * 0.6, ty);
    r.begin();
    r.poly(hexPts(scx, scy, sR), PLATE, { nf: dome(scx - 2, scy - 2, sR + 2, sR + 2), bevel: 1, max: 6, spec: PLATE[7], specT: 0.985 });
    r.end(0.6);
    honeycomb(r, scx, scy, sR - 2.2, 3, sh.k ?? clamp(key, 0.3, 1.2), { holes: sh.holes || 0, seed: 3 });
    r.glow(scx, scy, 1.6, 1.6, G_CYAN, { k: clamp(key, 0.2, 1.3) });
    r.restore();
  }

  // padlock head, sunk between the shoulders
  r.save();
  torso();
  r.translate(0, P.hy || 0);
  r.rotate(P.head || 0, 76, 42);
  padlock(r, 77, 35, key, P.open || 0);
  r.restore();

  fwLeg(r, hipN, L.near || [33, 94], false);

  // near pauldron and arm with the brick fist
  const na = A.near || { el: [17, 62], fist: [20, 80] };
  fwArm(r, shN, na.el, na.fist, false);
  fwFist(r, na.fist[0], na.fist[1], key);
  r.save();
  torso();
  r.begin();
  r.poly([[11, 40], [15, 35], [31, 34], [36, 38], [35, 47], [30, 51], [15, 51], [11, 47]], PLATE, { nf: dome(22, 40, 15, 12, 0.6), bevel: 1, max: 6, bias: -0.05 });
  r.poly([[12, 39], [15, 35], [31, 34], [35, 38], [30, 39], [16, 40]], PLATE, { n: [-0.1, -0.9, 0.4], bevel: 1, max: 6 });
  r.end(0.6);
  r.line(14, 46, 32, 46, (key > 0.5 ? G_CYAN : G_CYAN_DIM)[2], 0.55 * clamp(key, 0.3, 1));
  for (const x of [16, 23, 30]) r.dot(x, 43, STEEL[5]);
  r.restore();

  if (P.slam) {
    // the fist hits the floor: a flat honeycomb ripple and thrown bricks
    const [fx] = na.fist;
    r.glow(fx + 4, 93, 18, 2.6, G_CYAN, { fx: true, k: 0.85, bias: 0.3 });
    for (let k = -3; k <= 3; k++) r.rect(fx + 4 + k * 5 - 1, 91 - (Math.abs(k) < 2 ? 1 : 0), 3, 1, G_CYAN[3], 0.8, true);
    sparks(r, P.slam, fx + 4, 84, 13, 8, G_CYAN);
  }
  if (P.barrier) hexPanel(r, 91, 103, 24, 93, P.barrier);   // the shield throws up a wall of light
  if (fallen.length && P.rubble) {
    // bricks knocked out of the wall lie on the floor
    const Rf = rng(P.rubble);
    for (let i = 0; i < Math.min(6, fallen.length); i++) {
      const x = 8 + Rf() * 80;
      r.begin();
      r.poly([[x, 89], [x + 9, 88 + Rf() * 2], [x + 9, 94], [x, 94]], BRICK, { n: [0.1, -0.5, 0.8], bevel: 1, max: 5 });
      r.end(0.55);
    }
  }
  if (P.sparkle) sparks(r, P.sparkle, 56, 40, 14, 7, G_CYAN);
  for (const [y, h, dx] of P.tears || []) tear(r, y, h, dx);
  if (P.chroma) chroma(r, P.chroma[0], P.chroma[1], P.chroma[2], 0.5);
}

const FW_KNEEL = { near: [30, 94], far: [52, 94] };

const FIREWALL_GOLEM = {
  w: 104, h: 96,   // room on the right for the shield and its barrier
  bevel: 4,
  draw: drawGolemFW,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { ph: 0, scanY: 24 },
      { ph: 1.6, scanY: 38, ty: 1 },
      { ph: 3.2, scanY: 52, ty: 1, arms: { near: { el: [17, 63], fist: [20, 81] }, far: { el: [74, 51], hand: [82, 59] } }, shield: { at: [88, 61] } },
      { ph: 4.8, scanY: 66 },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { ph: 1, key: 1.4, fire: 1.3, lean: -0.1, tx: -3, ty: -1, arms: { near: { el: [12, 34], fist: [18, 16] } }, scanY: 30 },
      { ph: 2.4, key: 1.4, fire: 1.2, lean: 0.12, tx: 4, ty: 2, slam: 11, arms: { near: { el: [50, 62], fist: [62, 84] } }, scanY: 50 },
      { ph: 3.6, key: 1.1, lean: 0.06, tx: 2, ty: 1, arms: { near: { el: [46, 62], fist: [56, 82] } }, scanY: 64 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { key: 0.4, fire: 0.5, ph: 2, lean: -0.1, tx: -4, head: -0.1, sparkle: 9, tears: [[24, 3, -3], [46, 4, 3], [70, 3, -2]], chroma: [20, 80, 1],
        arms: { near: { el: [14, 60], fist: [15, 77] } } },
    ] },
    break: { fps: 4, loop: true, poses: [
      { key: 0.25, fire: 0, embers: 3, ty: 8, lean: 0.12, head: 0.12, open: 38, loose: 0.22, seed: 7, rubble: 5, legs: FW_KNEEL,
        arms: { near: { el: [20, 66], fist: [22, 85] }, far: { el: [72, 62], hand: [78, 72] } }, shield: { at: [84, 80], R: 11, holes: 0.35, k: 0.4 } },
      { key: 0.55, fire: 0, embers: 9, ty: 8, lean: 0.13, head: 0.14, open: 42, loose: 0.22, seed: 7, rubble: 5, legs: FW_KNEEL, tears: [[36, 2, 2]],
        arms: { near: { el: [20, 66], fist: [22, 85] }, far: { el: [72, 62], hand: [78, 72] } }, shield: { at: [84, 80], R: 11, holes: 0.35, k: 0.6 } },
    ] },
    special: { fps: 6, loop: false, order: [0, 1, 1], poses: [
      { key: 1.5, fire: 1.3, ph: 1, scanY: 34, barrier: 0.5, arms: { far: { el: [76, 44], hand: [84, 50] } }, shield: { at: [88, 50], R: 13 } },
      { key: 1.6, fire: 1.4, ph: 2.6, scanY: 58, barrier: 1, arms: { far: { el: [76, 44], hand: [84, 50] } }, shield: { at: [88, 50], R: 13 } },
    ] },
  },
  points: { center: [48, 52], muzzle: [70, 86], top: [46, 10] },
  icon: { x: 74, y: 36, scale: 0.55 },
};

// ---------------------------------------------------------------- GLITCH SWARM (80x64)

const VOXEL = [PLATE, HARD, ROT];   // the three looks a voxel flips between (its weak points shift)

/**
 * One-eyed voxel bug: an isometric cube of half-size h with a lit top, an eye on the face toward the
 * party and a pair of glassy wings (`flap` -1..1).
 */
function voxel(r, x, y, h, look, { back = false, eye = 1, trail = 0, flap = 0 } = {}) {
  const ramp = VOXEL[look % 3], o = { bevel: 1, max: back ? 5 : 7, bias: back ? -0.12 : 0 };
  const glowR = look % 3 === 2 ? G_MAG : look % 3 === 1 ? G_CYAN : G_VIOLET;
  if (trail) for (let k = 1; k <= trail; k++) r.dot(Math.round(x - h - k * 1.5), Math.round(y + (k & 1)), glowR[Math.max(0, 3 - k)], 0.5, true);
  if (flap != null && !trail) {
    // wings: a membrane of dim light with a bright leading edge
    const wy = y - h * 0.6, tip = [x - h * 1.5, wy - h * (0.9 + flap * 0.7)], root = [x - h * 0.1, wy];
    r.poly([root, tip, [x - h * 1.1, wy + h * 0.3]], ramp, { idx: back ? 2 : 4, glow: back ? 0.12 : 0.25 });
    r.line(Math.round(root[0]), Math.round(root[1]), Math.round(tip[0]), Math.round(tip[1]), glowR[back ? 1 : 3], back ? 0.3 : 0.55, true);
  }
  r.begin();
  r.poly([[x, y - h], [x + h, y - h / 2], [x, y], [x - h, y - h / 2]], ramp, { ...o, n: [-0.2, -0.9, 0.4] });
  r.poly([[x - h, y - h / 2], [x, y], [x, y + h], [x - h, y + h / 2]], ramp, { ...o, n: [-0.75, 0.1, 0.65] });
  r.poly([[x, y], [x + h, y - h / 2], [x + h, y + h / 2], [x, y + h]], ramp, { ...o, n: [0.6, 0.1, 0.8], bias: (o.bias || 0) - 0.08 });
  r.end(0.5);
  if (eye > 0 && !back) {
    const ex = Math.round(x + h * 0.5), ey = Math.round(y + h * 0.15);
    r.dot(ex, ey, (look % 3 === 1 ? G_MAG : G_CYAN)[eye > 0.6 ? 4 : 2], clamp(eye, 0.2, 1.2));
    if (h >= 3) r.dot(ex, ey + 1, (look % 3 === 1 ? G_MAG : G_CYAN)[2], 0.6 * eye);
  }
}

/** The queen: a big corrupted voxel with one huge eye on the face toward the party and cracks of light. */
function kernel(r, cx, cy, k, crack) {
  const h = 9;
  r.begin();
  r.poly([[cx, cy - h], [cx + h, cy - h / 2], [cx, cy], [cx - h, cy - h / 2]], ROT, { n: [-0.2, -0.9, 0.4], bevel: 1, max: 7, spec: ROT[7], specT: 0.99 });
  r.poly([[cx - h, cy - h / 2], [cx, cy], [cx, cy + h], [cx - h, cy + h / 2]], ROT, { n: [-0.75, 0.1, 0.65], bevel: 1, max: 6 });
  r.poly([[cx, cy], [cx + h, cy - h / 2], [cx + h, cy + h / 2], [cx, cy + h]], ROT, { n: [0.6, 0.1, 0.8], bevel: 1, max: 5, bias: -0.06 });
  r.end(0.6);
  // the eye: a dark almond on the front face, a cyan iris, a white glint
  const kk = clamp(k, 0.2, 1.4), g = k > 0.55 ? G_CYAN : G_CYAN_DIM;
  const ex = cx + 4.5, ey = cy + 2.5;
  r.poly([[ex - 3.6, ey + 1.6], [ex, ey - 2.4], [ex + 3.6, ey - 1.6], [ex, ey + 2.6]], ROT, { idx: 0 });
  r.glow(ex + 0.5, ey, 1.9, 1.9, g, { k: kk, bias: k > 1.05 ? 0.6 : 0.2 });
  r.dot(ex + 1, ey, ROT[0]);
  if (k > 0.55) r.dot(ex - 1, ey - 1, WHITE, 1);
  // glowing seams across the top face
  r.line(cx - 4, cy - 5, cx + 1, cy - 7, G_MAG[3], 0.6 * kk);
  r.line(cx + 1, cy - 7, cx + 4, cy - 5, G_MAG[2], 0.5 * kk);
  r.line(cx - 6, cy - 1, cx - 4, cy + 5, ROT[6]);
  if (crack) {
    r.line(cx - 7, cy - 3, cx - 3, cy + 3, G_MAG[4], 0.9);
    r.line(cx - 3, cy + 3, cx - 1, cy + 8, G_MAG[3], 0.8);
    r.line(cx + 2, cy - 6, cx + 6, cy - 1, G_MAG[3], 0.8);
  }
}

const SWARM = [[0, 1, 4.5], [45, 0.8, 3.5], [90, 0.95, 4], [135, 0.78, 3.5], [180, 1, 5], [225, 0.85, 3.5], [270, 0.95, 4], [315, 0.78, 3.5]];

function drawSwarm(r, P) {
  const k = P.k ?? 1, orbit = P.orbit || 0, spread = P.spread ?? 1, look = P.look || 0;
  const cx = 40 + (P.cx || 0), cy = 30 + (P.cy || 0);
  const bits = SWARM.map(([a, rad, h], i) => {
    if (P.line) return { x: 50 + i * 3.6, y: cy + Math.round(Math.sin(i * 1.7) * 3), h: h * 0.85, front: true, trail: 3 + (i % 3), i };
    if (P.floor) return { x: 8 + i * 9 + (i % 3), y: 60 - h * 0.6, h, front: true, i };
    const ang = (a + orbit) * DEG, rr = rad * spread;
    const ring = P.ring ? 1 : 0;
    return {
      x: cx + Math.cos(ang) * (ring ? 25 : 29 * rr), y: cy + Math.sin(ang) * (ring ? 16 : 17 * rr) + (ring ? 0 : Math.sin(i * 2.1 + orbit * 0.05)),
      h: h * (Math.sin(ang) > 0 ? 1.1 : 0.9), front: Math.sin(ang) > 0, i,
    };
  });
  const bitOpts = (b) => ({
    back: !b.front, eye: P.floor ? (b.i % 4 === 1 ? 0.5 : 0) : k, trail: b.trail || 0,
    flap: P.floor ? null : Math.sin((P.flap || 0) + b.i * 1.9),
  });

  // network links from the kernel to a few voxels, then the voxels behind it
  if (!P.floor) for (const b of bits) {
    if (b.i % 3) continue;
    const n = Math.max(2, Math.round(Math.hypot(b.x - cx, b.y - cy) / 2));
    for (let s = 1; s < n; s += 2) r.dot(Math.round(cx + ((b.x - cx) * s) / n), Math.round(cy + ((b.y - cy) * s) / n), G_VIOLET[2], 0.35 * k, true);
  }
  for (const b of bits) if (!b.front) voxel(r, b.x, b.y, b.h, look + b.i, bitOpts(b));
  if (P.floor) kernel(r, cx, 51, 0.3, true);
  else kernel(r, cx, cy, k, P.crack);
  for (const b of bits) if (b.front) voxel(r, b.x, b.y, b.h, look + b.i, bitOpts(b));

  if (P.dust) {
    const R = rng(P.dust);
    for (let i = 0; i < 9; i++) r.dot(Math.round(12 + R() * 56), Math.round(10 + R() * 40), (R() < 0.5 ? G_CYAN : G_VIOLET)[2 + Math.floor(R() * 2)], 0.6, true);
  }
  if (P.flare) {
    r.glow(cx, cy, P.flare, P.flare, G_MAG, { fx: true, k: 0.8, bias: 0.4 });
    for (let i = 0; i < 6; i++) spark(r, Math.round(cx + Math.cos(i * 1.05) * (P.flare + 4)), Math.round(cy + Math.sin(i * 1.05) * (P.flare + 3)), 1, G_MAG);
  }
  if (P.sparkle) sparks(r, P.sparkle, cx, cy, 14, 7, G_MAG);
  for (const [y, h, dx] of P.tears || []) tear(r, y, h, dx);
  if (P.chroma) chroma(r, P.chroma[0], P.chroma[1], P.chroma[2], 0.5);
}

const GLITCH_SWARM = {
  w: 80, h: 64,
  bevel: 2,
  draw: drawSwarm,
  anims: {
    idle: { fps: 6, loop: true, poses: [
      { orbit: 0, look: 0, dust: 1, flap: 0 },
      { orbit: 9, look: 0, cy: -1, dust: 2, flap: 1.6 },
      { orbit: 18, look: 1, cy: -2, dust: 3, flap: 3.2, tears: [[26, 2, 2]], chroma: [24, 30, 1] },
      { orbit: 27, look: 1, cy: -1, dust: 4, flap: 4.8 },
    ] },
    attack: { fps: 9, loop: false, poses: [
      { orbit: 40, spread: 0.45, look: 2, k: 1.4, flare: 4 },
      { line: 1, look: 2, k: 1.4, cx: 4, dust: 6 },
      { orbit: 60, spread: 1.25, look: 1, k: 1.1, cx: 2, dust: 7 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { orbit: 50, spread: 1.35, look: 2, k: 0.4, cx: -3, crack: 1, sparkle: 5, tears: [[16, 3, -3], [30, 3, 3], [44, 2, -2]], chroma: [8, 56, 2] },
    ] },
    break: { fps: 4, loop: true, poses: [
      { floor: 1, look: 0, dust: 8 },
      { floor: 1, look: 2, dust: 9, tears: [[50, 2, 1]] },
    ] },
    special: { fps: 6, loop: false, order: [0, 1, 0, 1], poses: [
      { ring: 1, orbit: 0, look: 1, k: 1.3, flare: 5 },
      { ring: 1, orbit: 18, look: 2, k: 1.4, flare: 7, chroma: [10, 50, 1] },
    ] },
  },
  points: { center: [40, 30], muzzle: [74, 30], top: [40, 10] },
  icon: { x: 41, y: 29, scale: 0.85 },
};

// ---------------------------------------------------------------- CORRUPTED MEMORY (88x100)

const CM_JAG = [[24, 55], [28, 61], [32, 54], [36, 63], [40, 57], [44, 62], [48, 53], [52, 59], [57, 52]];
/** Lower edge of the crystal where the corruption broke it (y at x, linear between the jag points). */
function jagY(x, J) {
  for (let i = 1; i < J.length; i++) {
    if (x <= J[i][0]) {
      const [x0, y0] = J[i - 1], [x1, y1] = J[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
  }
  return J[J.length - 1][1];
}

/** A shard of corruption: a two-facet magenta spike from (x, y) toward `ang` (degrees). */
function rotSpike(r, x, y, ang, len, w, dim = false) {
  const b = [x, y], tip = polar(x, y, ang, len);
  const lB = along(b, tip, 0, w), rB = along(b, tip, 0, -w), mid = along(b, tip, 0.15, 0);
  const a = ang * DEG, px = Math.sin(a), py = -Math.cos(a);
  r.begin();
  r.poly([lB, tip, mid], ROT, { n: [px * 0.7, py * 0.7, 0.7], bevel: 1, max: dim ? 4 : 7 });
  r.poly([mid, tip, rB], ROT, { n: [-px * 0.7, -py * 0.7, 0.7], bevel: 1, max: dim ? 3 : 5, glow: dim ? 0 : 0.12 });
  r.end(0.5);
}

/** A corrupted limb along a polyline: tapered magenta segments with spines on the back, three talons. */
function rotTendril(r, pts, size, dim) {
  const o = { max: dim ? 4 : 6, bias: dim ? -0.1 : 0, spec: dim ? null : ROT[7], specT: 0.95 };
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const ra = size * (1 - (i / n) * 0.5), rb = size * (1 - ((i + 1) / n) * 0.5);
    r.begin();
    r.seg(ax, ay, bx, by, ra, rb, ROT, o);
    r.end(0.55);
    const sp = along(pts[i], pts[i + 1], 0.5, ra * 0.8);
    rotSpike(r, sp[0], sp[1], Math.atan2(by - ay, bx - ax) / DEG - 70, ra * 1.6, ra * 0.45, dim);
  }
  const [ex, ey] = pts[n], [px, py] = pts[n - 1];
  const base = Math.atan2(ey - py, ex - px) / DEG;
  for (const d of [-35, 0, 35]) rotSpike(r, ex, ey, base + d, size * 2.2, size * 0.45, dim);
}

function drawMemory(r, P) {
  const core = P.core ?? 1, load = P.load ?? 4, mem = P.mem ?? 1;
  const tx = P.tx || 0, ty = (P.ty || 0) + (P.bob || 0);
  const ringA = (P.spin || 0) * DEG;
  const J = P.jag || CM_JAG;
  const mass = P.mass ?? 1;
  r.save();
  r.translate(tx, ty);
  r.rotate(P.tilt || 0, 40, 50);

  // the loading ring: 12 segments on an ellipse round the crystal (back half behind it)
  const seg = (front) => {
    if (P.ringOff) return;
    for (let i = 0; i < 12; i++) {
      const a0 = ringA + (i / 12) * Math.PI * 2;
      const isFront = Math.sin(a0 + Math.PI / 12) > 0;
      if (isFront !== front) continue;
      const lit = i < load;
      const c = lit ? (load >= 12 ? G_MAG[4] : G_MAG[3]) : front ? ROT[3] : ROT[1];
      for (let t = 0.12; t < 0.88; t += 0.08) {
        const a = a0 + (t / 12) * Math.PI * 2;
        r.dot(Math.round(41 + Math.cos(a) * 29), Math.round(28 + Math.sin(a) * 6), c, lit ? 0.85 : 0, lit);
      }
    }
  };
  seg(false);

  // floating splinters of the crystal
  for (const [x, y, a, l] of P.splinters || [[13, 30, -110, 7], [68, 20, -60, 6]]) {
    r.begin();
    r.poly([polar(x, y, a, l), polar(x, y, a + 90, 2), polar(x, y, a + 180, l * 0.4), polar(x, y, a - 90, 2)], HARD, { n: [-0.4, -0.4, 0.8], bevel: 1, max: 7, glow: 0.2 });
    r.end(0.5);
  }

  // back tendril curling up behind the crystal
  if (mass > 0.5) rotTendril(r, P.back || [[28, 66], [18, 62], [12, 52], [13, 42]], 3.2, true);

  // the crystal: a hexagonal prism of hard light, broken off along a jagged line
  const below = (mx, my) => my < jagY(mx, J);
  const tip = [41, 5];
  const faces = [
    [[tip, [25, 19], [34, 22]], [-0.6, -0.6, 0.55], 7],
    [[tip, [34, 22], [48, 22]], [-0.05, -0.75, 0.66], 7],
    [[tip, [48, 22], [56, 18]], [0.6, -0.55, 0.58], 5],
    [[[25, 19], [34, 22], [34, 66], [25, 66]], [-0.7, -0.05, 0.7], 6],
    [[[34, 22], [48, 22], [48, 66], [34, 66]], [0, 0, 1], 5],
    [[[48, 22], [56, 18], [56, 66], [48, 66]], [0.75, 0, 0.66], 4],
  ];
  const ek = 0.1 * clamp(core, 0.4, 1.4);
  r.begin();
  for (const [pts, n, mx] of faces) r.poly(pts, CRYSTAL, { n, bevel: 1, max: mx, clip: below, glow: ek, spec: CRYSTAL[7], specT: 0.97 });
  r.end(0.6);
  // bright edges of the prism and a glint running down the lit face
  for (const [x0, y0, x1, y1, c] of [[41, 6, 26, 19, 7], [41, 6, 34, 21, 7], [41, 6, 48, 21, 6], [34, 23, 34, 52, 6], [48, 23, 48, 50, 5], [26, 20, 26, 50, 5]]) {
    r.line(x0, y0, x1, y1, c === 7 ? MASK[7] : CRYSTAL[c], 0.35);
  }
  r.line(29, 24, 29, 34, CRYSTAL[7], 0.3);
  // the memory inside: two people at a lit window (Window 9), flickering under magenta static
  if (mem > 0) {
    const g = mem > 0.6 ? G_CYAN : G_CYAN_DIM, mk = clamp(mem, 0.2, 1.1);
    r.each(35, 25, 47, 47, (mx, my, X, Y) => {
      if (mx < 35.5 || mx > 46.5 || my < 25.5 || my > 46.5 || !below(mx, my)) return;
      const v = 1 - Math.abs(my - 33) / 16;
      r.put(X, Y, g[clamp(Math.round(v * 3.4), 0, 3)], 0.55 * mk);
    });
    r.rect(35, 36, 12, 1, CRYSTAL[2]);
    for (const [x, y, hgt] of [[38, 30, 15], [43, 32, 13]]) {
      r.rect(x, y, 2, 2, CRYSTAL[0]);
      r.rect(x - 1, y + 2, 4, 5, CRYSTAL[0]);
      r.rect(x, y + 7, 2, hgt - 8, CRYSTAL[1]);
    }
    r.rect(40, 34, 3, 1, CRYSTAL[0]);   // their hands, joined
    for (const y of P.static || [29]) r.line(35, y, 46, y, G_MAG[3], 0.7);
  }
  // corruption veins creeping up the faces
  for (const [x0, y0, x1, y1] of [[30, 56, 28, 42], [28, 42, 31, 33], [44, 58, 46, 46], [46, 46, 44, 38], [52, 54, 54, 40]]) {
    r.line(x0, y0, x1, y1, G_MAG[core > 1.2 ? 3 : 2], clamp(core, 0.3, 1.4) * 0.7);
  }

  // the corruption: a mass of magenta voxels and spikes swallowing the lower crystal
  if (mass > 0) {
    const R = rng(P.seed || 5);
    const blocks = [];
    for (let i = 0; i < 16; i++) {
      const x = 22 + R() * 38, y = 56 + R() * 22 * mass, h = 2.5 + R() * 3.5 * mass;
      blocks.push([x, y, h]);
    }
    blocks.sort((a, b) => a[1] - b[1]);
    for (const [x, y, a, l] of [[22, 64, -160, 10], [60, 60, -20, 9], [30, 78, 130, 9], [52, 78, 60, 8], [41, 82, 95, 8]]) rotSpike(r, x, y, a, l * mass, 2.4);
    for (const [x, y, h] of blocks) voxel(r, x, y, h, 2, { eye: 0, flap: null });
    // the corruption's heart: a magenta eye that opens as the Overwrite charges
    const ck = clamp(core, 0.2, 1.6);
    r.poly([[33, 68], [40, 63], [48, 67], [41, 72]], ROT, { idx: 0 });
    r.glow(41, 67.5, 3 + (core > 1.2 ? 1 : 0), 2.4, core > 0.55 ? G_MAG : G_MAG_DIM, { k: ck, bias: core > 1.2 ? 0.7 : 0.2 });
    r.line(41, 66, 41, 69, ROT[0]);
    if (core > 0.55) r.dot(39, 66, WHITE, 1);
    // the front tendril reaches toward the party
    rotTendril(r, P.claw || [[54, 66], [64, 62], [70, 68]], 3.6, false);
    // drips of corruption falling away
    for (let i = 0; i < 4; i++) fragments(r, 28 + i * 8, 84 + (i & 1) * 2, 3, G_MAG, (P.seed || 5) * 7 + i + (P.drip || 0), 0.7);
  }
  r.restore();
  r.save();
  r.translate(tx, ty);
  r.rotate(P.tilt || 0, 40, 50);
  seg(true);
  r.restore();

  if (P.burst) {
    // Overwrite: a wave of magenta light and scan streaks thrown at the party
    const [bx, by] = [41 + tx, 40 + ty];
    r.each(bx - 44, by - 34, bx + 44, by + 34, (mx, my, X, Y) => {
      const d = Math.hypot((mx - bx) / 42, (my - by) / 32);
      if (Math.abs(d - P.burst) < 0.03 && (X + Y) % 3) r.put(X, Y, G_MAG[3], 0.8, true);
    });
    for (const [y, x0, len] of [[24, 58, 26], [33, 62, 22], [44, 60, 26], [52, 64, 20], [61, 58, 24]]) {
      for (let x = x0; x < Math.min(88, x0 + len); x++) if ((x + y) % 4) r.dot(x, y + ty, x > x0 + len * 0.6 ? G_MAG[2] : G_MAG[4], 0.8, true);
    }
  }
  if (P.ringShards) {
    // the ring breaks: its segments fall
    for (const [x, y] of P.ringShards) r.rect(x, y, 3, 1, ROT[3]);
  }
  if (P.sparkle) sparks(r, P.sparkle, 41, 40, 14, 8, G_MAG);
  for (const [y, h, dx] of P.tears || []) tear(r, y, h, dx);
  if (P.chroma) chroma(r, P.chroma[0], P.chroma[1], P.chroma[2], 0.5);
}

const CM_BROKEN = [[24, 50], [28, 57], [32, 49], [36, 58], [40, 52], [44, 60], [48, 48], [52, 55], [57, 47]];

const CORRUPTED_MEMORY = {
  w: 88, h: 100,   // room on the right for the claw and the Overwrite wave
  bevel: 3,
  draw: drawMemory,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { bob: 0, spin: 0, load: 3, static: [29], drip: 0 },
      { bob: -1, spin: 8, load: 4, static: [33], drip: 1, claw: [[54, 66], [64, 61], [71, 66]] },
      { bob: -2, spin: 16, load: 5, static: [27, 37], drip: 2, mem: 0.7, tears: [[30, 2, 2]], chroma: [26, 34, 1] },
      { bob: -1, spin: 24, load: 4, static: [31], drip: 3, claw: [[54, 66], [64, 63], [70, 69]] },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { core: 1.6, load: 12, spin: 30, mem: 0.5, static: [28, 32, 36], claw: [[54, 64], [62, 56], [68, 50]], sparkle: 3 },
      { core: 1.8, load: 12, spin: 40, mem: 0.3, tx: 2, burst: 0.85, static: [27, 30, 33, 36], tears: [[20, 3, 3], [46, 3, -3]], chroma: [10, 90, 2], claw: [[54, 66], [66, 62], [76, 62]] },
      { core: 1, load: 0, spin: 50, mem: 0.6, tx: 1, burst: 1.05, static: [31], claw: [[54, 66], [64, 64], [72, 68]] },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { core: 0.4, load: 2, spin: 60, mem: 0.4, tx: -4, tilt: -0.08, static: [27, 30, 34], sparkle: 9, tears: [[14, 3, -3], [40, 4, 4], [70, 3, -2]], chroma: [6, 92, 2],
        claw: [[54, 66], [62, 68], [66, 76]] },
    ] },
    break: { fps: 4, loop: true, poses: [
      { core: 0.2, mass: 0.5, mem: 1.1, ty: 10, tilt: 0.12, jag: CM_BROKEN, ringOff: 1, static: [], seed: 9, splinters: [[14, 84, -20, 6], [66, 86, 200, 5]],
        ringShards: [[10, 95], [22, 96], [60, 95], [72, 96], [80, 94]], claw: [[52, 68], [58, 76], [62, 84]], back: [[28, 68], [20, 72], [14, 80], [12, 86]] },
      { core: 0.5, mass: 0.5, mem: 1.2, ty: 10, tilt: 0.13, jag: CM_BROKEN, ringOff: 1, static: [], seed: 9, drip: 2, splinters: [[14, 84, -20, 6], [66, 86, 200, 5]],
        ringShards: [[10, 95], [22, 96], [60, 95], [72, 96], [80, 94]], claw: [[52, 68], [58, 76], [62, 84]], back: [[28, 68], [20, 72], [14, 80], [12, 86]], tears: [[60, 2, 1]] },
    ] },
    special: { fps: 6, loop: false, order: [0, 1, 0, 1], poses: [
      { core: 1.4, load: 8, spin: 10, mem: 0.6, static: [28, 34], claw: [[54, 64], [63, 58], [70, 56]], chroma: [20, 40, 1] },
      { core: 1.7, load: 12, spin: 20, mem: 0.4, static: [27, 31, 35], claw: [[54, 64], [63, 57], [70, 54]], sparkle: 13, tears: [[36, 2, 2]] },
    ] },
  },
  points: { center: [41, 46], muzzle: [72, 60], top: [41, 4], core: [41, 38] },
  icon: { x: 41, y: 34, scale: 0.42 },
};

export default {
  data_wraith: DATA_WRAITH,
  firewall_golem: FIREWALL_GOLEM,
  glitch_swarm: GLITCH_SWARM,
  corrupted_memory: CORRUPTED_MEMORY,
};
