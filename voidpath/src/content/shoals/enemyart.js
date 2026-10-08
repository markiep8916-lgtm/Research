// shoals: regular-enemy art (browser, TECH_PLAN 2.5, 7.6, 7.8; bestiary task CA-alpha).
//
// The Shoals and the Meridian wreck: glowing cyan ice, deep blue, white rime, black ice, rusted
// gunmetal and sodium-orange emergency light (12.1). Painted with the POC enemy rig and the bestiary
// toolkit exported by prologue/enemyart.js. All sprites face RIGHT.
//
//   ice_mite    56x40   small scuttler; ice crystals on its back are its shell (packs of 4).
//   void_eel    108x64  floating serpent of the rings; `special` arcs up and dives (Submerge).
//   rime_golem  96x96   a Meridian cargo loader buried in rime ice; `special` grows Frost Shell.
//   salvage_bot 80x64   an 80-year-old Meridian salvage bot on treads; `special` welds itself (repair).
//
// The Director plays `special` for charge-type enemy actions (buff, heal, summon, submerge, lockOn,
// charge) and `attack` (or the action's `pose`) for attacks.

import { rng } from '../../art/painter.js';
import {
  rp, WHITE, DEG, clamp, dith, STEEL, G_CYAN, spark, sparks, smoke, steam, spot, polar, along, limbPlate, dome,
} from '../prologue/enemyart.js';

// ---------------------------------------------------------------- colours

const ICE = rp('#0a2a40', '#0f4563', '#176b8c', '#2596b4', '#4fc4dc', '#93e6f2', '#d2f8fc', '#f6ffff');
const ICE_DIM = rp('#071b2b', '#0b2f45', '#114a63', '#196a85', '#2a8ca6', '#4fb0c6');
const RIME = rp('#1d2a40', '#2e4260', '#4a6585', '#6f8ead', '#9ab6cf', '#c4dbea', '#e8f5fb');
const CHITIN = rp('#070b18', '#0e1630', '#16234a', '#20335f', '#2c4878', '#3f6496', '#5d8bbb', '#9dc6e6');
const CHITIN_FAR = rp('#04060e', '#0a1022', '#111a36', '#192749', '#22365e', '#2f4a78');
const VOID = rp('#06040c', '#0e0a1c', '#17112d', '#211941', '#2d2358', '#3c2f72', '#55448f', '#7d6ab8');
const BELLY = rp('#1a1528', '#2e2642', '#463b5c', '#655878', '#8a7e9c', '#b3a9c2');
const FIN = rp('#120a24', '#1e1238', '#2b1a4e', '#3a2468', '#4c3084', '#5f3d9c');
const RUST = rp('#140b08', '#2a140c', '#46200f', '#6a3115', '#8f451c', '#b05e27', '#cf7d3a', '#e8a462');
const PAINT = rp('#0e1a1b', '#16292a', '#1f3b3a', '#2b524e', '#3b6a64', '#52857c', '#77a69a');
const FRAME = rp('#0a0b0f', '#13151c', '#1d2029', '#292d38', '#383d4a', '#4c5260', '#666d7c', '#8b92a0');
const RIBBON = rp('#3a0e10', '#6a1a1c', '#9a2e2a', '#c24a3c', '#d97a62');
const HAZ = rp('#2a2008', '#6e5414', '#a8842a');

const G_ICE = G_CYAN;
const G_ICE_DIM = rp('#06222e', '#0a3446', '#0e4a60', '#145f78', '#1d7590');
const G_VIOLET = rp('#3a1466', '#6b2bb0', '#a35cff', '#cf9dff', '#f3e6ff');
const G_VIOLET_DIM = rp('#1a0a2e', '#2a1248', '#3a1a62', '#4b2378', '#5c2e8a');
const G_SODIUM = rp('#5a2208', '#a8460f', '#ff7a1a', '#ffb05a', '#ffe6c0');
const G_SODIUM_DIM = rp('#200c04', '#3a1607', '#56200a', '#6e2a0e', '#843614');
const G_WELD = rp('#1479b0', '#5cc8ff', '#b8f0ff', '#eafcff', '#ffffff');

/** Faceted ice crystal from a base point toward `ang` (degrees): lit and shadow facets, bright ridge, glowing core. */
function crystal(r, x, y, ang, len, w, { k = 1, dim = false } = {}) {
  const ramp = ICE;
  const b = [x, y], tip = polar(x, y, ang, len);
  const lB = along(b, tip, 0, w), rB = along(b, tip, 0, -w);
  const lM = along(b, tip, 0.62, w * 1.05), rM = along(b, tip, 0.62, -w * 1.05);
  const mid = along(b, tip, 0, 0);
  // facet normals: perpendicular to the axis, tilted toward the viewer
  const a = ang * DEG, px = Math.sin(a), py = -Math.cos(a);
  r.begin();
  r.poly([lB, lM, tip, mid], ramp, { n: [px * 0.75, py * 0.75, 0.66], bevel: 1, max: dim ? 4 : ramp.length - 1 });
  // the shadow facet glows faintly from inside (glowing cyan ice, 12.1)
  r.poly([mid, tip, rM, rB], ramp, { n: [-px * 0.75, -py * 0.75, 0.66], bevel: 1, max: dim ? 3 : ramp.length - 2, bias: -0.05, glow: dim ? 0 : clamp(k, 0, 1.2) * 0.22 });
  r.end(0.5);
  const ridge0 = along(b, tip, 0.15, 0), ridge1 = along(b, tip, 0.92, 0);
  r.line(Math.round(ridge0[0]), Math.round(ridge0[1]), Math.round(ridge1[0]), Math.round(ridge1[1]), ramp[dim ? 4 : 6]);
  if (k > 0) {
    const g0 = along(b, tip, 0.1, -w * 0.35), g1 = along(b, tip, 0.55, -w * 0.3);
    r.line(Math.round(g0[0]), Math.round(g0[1]), Math.round(g1[0]), Math.round(g1[1]), (k > 0.6 ? G_ICE : G_ICE_DIM)[3], clamp(k, 0.2, 1.2) * 0.85);
  }
}

// ---------------------------------------------------------------- ICE MITE (56x40)

/** Thin jointed leg: hip -> knee (raised) -> foot on the ice, with a hooked tip. */
function miteLeg(r, hip, knee, foot, ramp, near) {
  r.begin();
  r.seg(...hip, ...knee, near ? 1.5 : 1.2, 1.1, ramp, { max: ramp.length - 2, bounce: 0.3 });
  r.seg(...knee, ...foot, 1.1, 0.5, ramp, { caps: 'flat', max: ramp.length - 2, bounce: 0.3 });
  r.ball(...knee, 1.4, 1.4, ramp, { max: ramp.length - 1, spec: near ? ramp[ramp.length - 1] : null, specT: 0.93 });
  r.end(0.45);
  const dir = foot[0] >= hip[0] ? 1 : -1;
  r.dot(Math.round(foot[0]) + dir, Math.round(foot[1]), ramp[1]);
}

function drawMite(r, P) {
  const eyes = P.eyes ?? 1, shell = P.shell ?? 1;
  const L = P.legs || [];
  const bx = P.bx || 0, by = P.by || 0;
  const body = () => {
    r.translate(bx, by);
    r.rotate(P.rot || 0, 22, 32);
  };
  // [hip, knee] in body space (rear, middle, front); feet planted in screen space
  const near = [[[15, 31], [8, 27]], [[23, 32], [21, 35]], [[30, 31], [37, 32]]];
  const far = [[[17, 27], [11, 22]], [[25, 27], [27, 30]], [[32, 27], [41, 25]]];
  const feetN = [[3, 38], [16, 39], [43, 38]], feetF = [[7, 35], [30, 35], [47, 35]];
  const foot = (f, i) => [f[0] + (L[i]?.[0] || 0), f[1] + (L[i]?.[1] || 0)];
  const splay = P.splay || 0;
  r.save();
  body();
  const toScreen = (legs) => legs.map(([h, k]) => [r.pt(...h), r.pt(k[0] + (k[0] - h[0]) * splay * 0.6, k[1] + splay * 4)]);
  const legsN = toScreen(near), legsF = toScreen(far);
  r.restore();
  for (let i = 0; i < 3; i++) miteLeg(r, legsF[i][0], legsF[i][1], foot(P.feetFar?.[i] || feetF[i], i + 3), CHITIN_FAR, false);

  r.save();
  body();
  // antennae (behind the head)
  const tw = P.twitch || 0;
  for (const [x0, a0, len, c] of [[37, -62, 11, CHITIN[3]], [39, -48, 12, CHITIN[5]]]) {
    const m = polar(x0, 24, a0 + tw * 0.6, len * 0.55), t = polar(...m, a0 + 25 + tw, len * 0.5);
    r.line(x0, 24, Math.round(m[0]), Math.round(m[1]), c);
    r.line(Math.round(m[0]), Math.round(m[1]), Math.round(t[0]), Math.round(t[1]), c);
    r.dot(Math.round(t[0]), Math.round(t[1]), eyes > 0.5 ? G_ICE[3] : G_ICE_DIM[3], eyes > 0.5 ? 0.6 : 0.2);
  }
  // abdomen and thorax: banded chitin dome, paler underside
  r.begin();
  r.ball(9, 28, 5, 4.2, CHITIN, { max: 5, spec: CHITIN[6], specT: 0.96, bounce: 0.3, bias: -0.04 });
  r.ball(22, 27, 13, 7.6, CHITIN, { max: 5, spec: CHITIN[7], specT: 0.965, bounce: 0.3, bias: -0.04 });
  r.ball(22, 27, 13, 7.6, RIME, { clip: (x, y) => y > 30.5 + (x - 22) * 0.05, max: 3, bias: -0.1 });
  r.end(0.6);
  r.each(9, 19, 36, 35, (mx, my, X, Y) => {
    const u = (mx - 22) / 13, v = (my - 27) / 7.6;
    if (u * u + v * v > 0.92 || my > 30) return;
    for (const sx of [14, 19.5, 25, 30]) if (Math.abs(mx - sx - v * 1.5) < 0.5) r.put(X, Y, CHITIN[1]);
  });
  // head with frost mandibles and two glowing eyes
  const mand = P.mand ?? 0.2;
  r.begin();
  r.save();
  r.rotate(P.headRot || 0, 34, 28);
  r.seg(39, 30, 44 + mand * 2, 31 - mand * 4, 1.6, 0.6, RIME, { max: 5 });
  r.ball(36, 27.5, 5.6, 4.8, CHITIN, { max: 6, spec: CHITIN[7], specT: 0.95, bounce: 0.3 });
  r.seg(39, 31, 44 + mand * 1.5, 33 + mand * 3, 1.5, 0.5, RIME, { max: 6, spec: RIME[6] });
  r.restore();
  r.end(0.55);
  const eK = clamp(eyes, 0.2, 1.3);
  spot(r, 38.5, 25.5, 2, eyes > 0.5 ? G_ICE : G_ICE_DIM, eK);
  spot(r, 40.5, 27.5, 1, eyes > 0.5 ? G_ICE : G_ICE_DIM, eK);
  if (P.breath) steam(r, P.breath, 46, 31, 2.6, 0.7);
  if (P.frost) {
    r.glow(45, 31, P.frost, P.frost * 0.8, G_ICE, { fx: true, bias: 0.4 });
    for (let k = 0; k < 4; k++) spark(r, 45 + Math.round(Math.cos(k * 1.7) * (P.frost + 2)), 31 + Math.round(Math.sin(k * 1.7) * (P.frost + 1)), 1, G_ICE);
  }

  // ice crystals on the back: the shell (cracked and dark once broken)
  const cr = [[14, 21, -118, 7, 2.2], [20, 19, -100, 11, 3], [26, 19.5, -78, 9, 2.6], [31, 22, -58, 6, 2]];
  if (shell > 0) {
    for (const [x, y, a, len, w] of cr) crystal(r, x, y, a + (P.sway || 0), len * Math.min(1, shell), w, { k: shell });
    if (P.glint != null) {
      const [x, y, a, len] = cr[P.glint];
      const t = polar(x, y, a, len * 0.7);
      spark(r, Math.round(t[0]), Math.round(t[1]), 1, G_ICE);
    }
  } else {
    for (const [x, y, a, len, w] of cr) crystal(r, x, y + 1, a + 25, len * 0.45, w * 0.9, { k: 0, dim: true });
  }
  r.restore();

  for (let i = 0; i < 3; i++) miteLeg(r, legsN[i][0], legsN[i][1], foot(P.feetNear?.[i] || feetN[i], i), CHITIN, true);
  if (P.shards) {
    const R = rng(P.shards);
    for (let k = 0; k < 5; k++) {
      const x = 8 + R() * 32, y = 36 + R() * 3;
      crystal(r, x, y, -90 + (R() - 0.5) * 120, 2 + R() * 3, 1, { k: 0, dim: true });
    }
  }
  if (P.chips) sparks(r, P.chips, 22, 18, 8, 5, G_ICE);
}

const ICE_MITE = {
  w: 56, h: 40,
  bevel: 2,
  draw: drawMite,
  anims: {
    idle: { fps: 7, loop: true, poses: [
      { mand: 0.15, glint: 1, legs: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] },
      { mand: 0.35, twitch: 6, by: -1, legs: [[1, -1], [0, 0], [-1, 0], [0, 0], [1, -1], [0, 0]] },
      { mand: 0.2, twitch: 2, glint: 2, sway: 2, legs: [[1, 0], [-1, -1], [0, 0], [-1, -1], [0, 0], [1, 0]], breath: 7 },
      { mand: 0.05, twitch: -4, by: -1, legs: [[0, 0], [0, 0], [1, -1], [0, 0], [-1, 0], [0, -1]] },
    ] },
    attack: { fps: 9, loop: false, poses: [
      { rot: -0.28, bx: -2, by: -1, mand: 1, headRot: -0.15, eyes: 1.3, feetNear: [[2, 38], [15, 39], [40, 33]], feetFar: [[6, 35], [29, 35], [45, 30]] },
      { rot: 0.08, bx: 5, mand: -0.2, headRot: 0.08, eyes: 1.3, frost: 3.5, feetNear: [[7, 38], [21, 39], [49, 39]], feetFar: [[11, 35], [34, 35], [52, 35]] },
      { rot: 0.02, bx: 2, mand: 0.5, eyes: 1.1, breath: 13 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { rot: -0.18, bx: -3, by: -1, mand: 0.8, eyes: 0.5, sway: -10, chips: 5, legs: [[2, -1], [1, 0], [-1, 0], [1, 0], [0, 0], [-1, 0]] },
    ] },
    break: { fps: 4, loop: true, poses: [
      { by: 3, rot: 0.06, mand: 0.7, eyes: 0.3, shell: 0, splay: 0.7, shards: 3, feetNear: [[0, 39], [14, 39], [46, 39]], feetFar: [[4, 37], [31, 37], [50, 37]] },
      { by: 3, rot: 0.04, mand: 0.9, eyes: 0.6, shell: 0, splay: 0.75, shards: 3, twitch: 8, feetNear: [[0, 38], [15, 39], [47, 38]], feetFar: [[5, 37], [30, 36], [51, 37]] },
    ] },
  },
  points: { center: [24, 27], muzzle: [45, 31], top: [22, 9] },
  icon: { x: 34, y: 26, scale: 0.7 },
};

// ---------------------------------------------------------------- VOID EEL (108x64)

/** Spine samples tail -> neck: { x, y, r, nx, ny } with (nx, ny) the belly-side normal. */
function eelSpine(P) {
  const N = 96, out = [];
  const ph = P.phase || 0, amp = P.amp ?? 6.5, bob = P.bob || 0;
  const [hx, hy] = P.head || [0, 0];
  const x0 = 13, x1 = 62, base = 30 + bob;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const w = Math.sin(ph + t * 6.6) * amp * (0.25 + 0.75 * (1 - t)) * (1 - t * t * 0.5);
    const sag = (P.sag || 0) * Math.sin(t * Math.PI * 0.9);
    const x = x0 + (x1 - x0) * t + hx * t * t;
    const y = base + w + sag + (P.arch || 0) * Math.sin(t * Math.PI) + hy * t * t * t + (P.tailY || 0) * (1 - t) * (1 - t);
    let rad = 1 + 4.5 * Math.pow(Math.sin(Math.min(1, t / 0.6) * Math.PI / 2), 1.2);
    if (t > 0.84) rad *= 1 - (t - 0.84) * 0.6;
    out.push({ x, y, r: rad, t });
  }
  for (let i = 0; i <= N; i++) {
    const a = out[Math.max(0, i - 1)], b = out[Math.min(N, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    out[i].nx = -dy / l;
    out[i].ny = dx / l;
    out[i].dx = dx / l;
    out[i].dy = dy / l;
  }
  return out;
}

function drawEel(r, P) {
  const glowK = P.glow ?? 1;
  const gv = glowK > 0.55 ? G_VIOLET : G_VIOLET_DIM;
  const S = eelSpine(P);
  const neck = S[S.length - 1];
  const finPh = (P.phase || 0) * 2;

  // dorsal fin membrane (behind the body), rippling with the wave; rays, then the glowing edge
  const top = [], base = [];
  for (let i = 14; i <= 86; i += 3) {
    const s = S[i], h = (1.6 + 3 * Math.sin(((i - 14) / 72) * Math.PI)) * (1 + 0.28 * Math.sin(finPh + i * 0.3));
    top.push([s.x - s.nx * (s.r + h) - s.dx * 1.2, s.y - s.ny * (s.r + h) - s.dy * 1.2]);
    base.push([s.x - s.nx * s.r * 0.4, s.y - s.ny * s.r * 0.4]);
  }
  r.begin();
  r.poly([...top, ...[...base].reverse()], FIN, { n: [0, -0.3, 0.95], max: 4 });
  r.end(0.5);
  for (let k = 1; k < top.length - 1; k += 2) r.line(Math.round(base[k][0]), Math.round(base[k][1]), Math.round(top[k][0]), Math.round(top[k][1]), FIN[5]);
  for (let k = 0; k < top.length - 1; k++) r.line(Math.round(top[k][0]), Math.round(top[k][1]), Math.round(top[k + 1][0]), Math.round(top[k + 1][1]), gv[2], 0.5 * glowK);

  // tail fin: a forked fan with a glowing rim
  const t0 = S[0], t1 = S[8];
  const back = [t0.x - t0.dx * 6, t0.y - t0.dy * 6];
  const finUp = [back[0] - t0.nx * 5.5 - 2, back[1] - t0.ny * 5.5 - 1.5], finDn = [back[0] + t0.nx * 4.5 - 2, back[1] + t0.ny * 4.5 + 1];
  const notch = [back[0] + 1.5, back[1]];
  r.begin();
  r.poly([[t1.x, t1.y - 1], finUp, notch, finDn, [t1.x, t1.y + 1]], FIN, { n: [0, -0.2, 1], max: 4 });
  r.end(0.5);
  r.line(Math.round(finUp[0]), Math.round(finUp[1]), Math.round(notch[0]), Math.round(notch[1]), gv[2], 0.5 * glowK);
  r.line(Math.round(notch[0]), Math.round(notch[1]), Math.round(finDn[0]), Math.round(finDn[1]), gv[2], 0.5 * glowK);
  r.line(Math.round(t1.x), Math.round(t1.y), Math.round(back[0]), Math.round(back[1]), FIN[4]);

  // body: a swept tube shaded from its own normal; pale belly, a glowing lateral line
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of S) {
    x0 = Math.min(x0, s.x - s.r); x1 = Math.max(x1, s.x + s.r);
    y0 = Math.min(y0, s.y - s.r); y1 = Math.max(y1, s.y + s.r);
  }
  const skin = { max: 6, spec: VOID[7], specT: 0.955, bounce: 0.3 };
  const belly = { max: 5, bounce: 0.2 };
  r.begin();
  r.each(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (mx, my, X, Y) => {
    let best = Infinity, bs = null;
    for (const s of S) {
      const d = Math.hypot(mx - s.x, my - s.y) - s.r;
      if (d < best) { best = d; bs = s; }
    }
    if (best > 0) return;
    const sv = clamp(((mx - bs.x) * bs.nx + (my - bs.y) * bs.ny) / bs.r, -1, 1);
    const nz = Math.sqrt(1 - sv * sv) + 0.05;
    if (sv > 0.42) r.lightPut(X, Y, bs.nx * sv, bs.ny * sv, nz, BELLY, belly);
    else r.lightPut(X, Y, bs.nx * sv, bs.ny * sv, nz, VOID, skin);
  });
  r.end(0.6);
  // belly plate seams
  for (let i = 30; i < 90; i += 5) {
    const s = S[i];
    const a = [s.x + s.nx * s.r * 0.5, s.y + s.ny * s.r * 0.5], b = [s.x + s.nx * s.r * 0.95, s.y + s.ny * s.r * 0.95];
    r.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), BELLY[1]);
  }
  // lateral line: a chain of lights pulsing from head to tail
  for (let i = 10; i <= 90; i += 6) {
    const s = S[i], pulse = 0.5 + 0.5 * Math.sin((P.pulse || 0) - s.t * 9);
    const k = clamp(glowK * (0.35 + pulse * 0.75), 0.15, 1.3);
    spot(r, s.x + s.nx * s.r * 0.15, s.y + s.ny * s.r * 0.15, s.r > 4.5 && pulse > 0.6 ? 2 : 1, gv, k);
  }

  // pectoral fin under the neck: a small fan with a glowing rim
  const pf = S[82], pa = P.pec || 0;
  const pRoot = [pf.x + pf.nx * pf.r * 0.5, pf.y + pf.ny * pf.r * 0.5];
  const pTip = polar(...pRoot, 118 + pa, 7), pBack = polar(...pRoot, 160 + pa * 0.5, 6.5);
  const pMid = along(pTip, pBack, 0.5, -1.6);
  r.begin();
  r.poly([pRoot, pTip, pMid, pBack], FIN, { n: [-0.2, 0.2, 0.95], max: 5 });
  r.end(0.5);
  r.line(Math.round(pTip[0]), Math.round(pTip[1]), Math.round(pMid[0]), Math.round(pMid[1]), gv[2], 0.55 * glowK);
  r.line(Math.round(pMid[0]), Math.round(pMid[1]), Math.round(pBack[0]), Math.round(pBack[1]), gv[2], 0.55 * glowK);
  r.line(Math.round(pRoot[0]), Math.round(pRoot[1]), Math.round(pMid[0]), Math.round(pMid[1]), FIN[5]);

  // head: long skull with a brow ridge, hinged lower jaw, needle teeth, glowing eye, trailing barbels
  const ha = Math.atan2(neck.dy, neck.dx) + (P.headTilt || 0);
  const jaw = P.jaw ?? 0.1;
  r.save();
  r.rotate(ha, neck.x, neck.y);
  const hx = neck.x, hy = neck.y;
  r.translate(hx, hy).scale(1.25).translate(-hx, -hy);
  if (jaw > 0.25 && glowK > 0.3) r.glow(hx + 13, hy + 2, 5 + jaw * 2, 2 + jaw * 3.4, gv, { k: 0.8 * glowK, bias: 0.3 });
  r.begin();
  r.save();
  r.rotate(jaw * 0.85, hx + 3, hy + 1.5);
  r.poly([[hx + 1, hy + 0.5], [hx + 12, hy + 1], [hx + 21, hy + 2.6], [hx + 19, hy + 5], [hx + 9, hy + 6], [hx + 2, hy + 5]], VOID, { nf: dome(hx + 10, hy + 2, 12, 5), bevel: 1, max: 5 });
  r.poly([[hx + 3, hy + 4], [hx + 18, hy + 4], [hx + 9, hy + 6], [hx + 2, hy + 5]], BELLY, { n: [0, 0.6, 0.8], max: 4 });
  if (jaw > 0.2) for (let k = 0; k < 5; k++) r.dot(hx + 7 + k * 2.6, hy + 0.2 - (k & 1), RIME[6]);
  r.restore();
  r.end(0.55);
  r.begin();
  r.ball(hx + 3, hy - 0.5, 6.4, 5.6, VOID, skin);
  r.poly([[hx - 1, hy - 5.6], [hx + 10, hy - 5.2], [hx + 19, hy - 2], [hx + 23, hy + 0.6], [hx + 21, hy + 2], [hx + 10, hy + 2], [hx + 1, hy + 3]], VOID, { nf: dome(hx + 9, hy - 2, 13, 5.5), bevel: 1, max: 7, spec: VOID[7], specT: 0.97 });
  r.end(0.6);
  r.begin();
  r.poly([[hx + 1, hy - 6], [hx + 9, hy - 6.6], [hx + 15, hy - 4.2], [hx + 9, hy - 4.2]], VOID, { n: [-0.2, -0.9, 0.4], bevel: 1, max: 7 });
  r.end(0.45);
  if (jaw > 0.2) for (let k = 0; k < 5; k++) r.dot(hx + 9 + k * 2.5, hy + 2 + (k & 1), RIME[5]);
  r.line(hx + 3, hy - 4, hx + 10, hy - 4, VOID[7]);
  const ek = clamp(glowK, 0.2, 1.4);
  r.glow(hx + 10.5, hy - 2, 2.6, 2, gv, { k: ek, bias: glowK > 1 ? 0.6 : 0.25 });
  if (glowK > 0.55) r.dot(hx + 11, hy - 2.5, WHITE, 1);
  for (let k = 0; k < 3; k++) r.line(hx - 1 - k * 2, hy - 2, hx - 2 - k * 2, hy + 2, VOID[1]);
  // barbels trailing from the snout under the jaw, tips glowing
  const bs = P.barbel ?? 0;
  for (const [x0, y0, len, droop] of [[17, 2.4, 15, 0.9], [13, 3.4, 11, 1.3]]) {
    let px = hx + x0, py = hy + y0;
    for (let k = 1; k <= len; k++) {
      const nx = hx + x0 - k * 1.05, ny = hy + y0 + k * droop * 0.45 + Math.sin(bs + k * 0.45) * k * 0.1;
      const tip = k >= len - 1;
      r.line(Math.round(px), Math.round(py), Math.round(nx), Math.round(ny), tip ? gv[3] : VOID[k < 4 ? 4 : 6], tip ? 0.8 * glowK : 0);
      px = nx; py = ny;
    }
  }
  r.restore();

  if (P.spit) {
    const m = [neck.x + Math.cos(ha) * 28, neck.y + Math.sin(ha) * 28 + 2];
    r.glow(m[0] + 2, m[1], P.spit, P.spit * 0.7, G_VIOLET, { fx: true, bias: 0.5 });
    for (let k = 0; k < 5; k++) spark(r, Math.round(m[0] + Math.cos(k * 1.3) * (P.spit + 3)), Math.round(m[1] + Math.sin(k * 1.3) * (P.spit + 2)), 1, G_VIOLET);
  }
  if (P.splash) {
    // the dive breaks the floor: a violet ring of light and ice chips under the head
    const fx = neck.x + Math.cos(ha) * 22;
    r.glow(fx, 61, 11, 2.6, G_VIOLET, { fx: true, bias: 0.3, k: 0.9 });
    sparks(r, P.splash, fx, 56, 9, 7, G_ICE);
  }
  if (P.motes) for (let k = 0; k < 6; k++) {
    const R = rng(P.motes + k);
    const s = S[10 + Math.floor(R() * 80)];
    spot(r, s.x + (R() - 0.5) * 6, s.y - s.r - 2 - R() * 6, 1, G_VIOLET_DIM, 0.6);
  }
}

const VOID_EEL = {
  w: 108, h: 64,   // room on the right for the lunge and the void spit
  bevel: 3,
  draw: drawEel,
  anims: {
    idle: { fps: 6, loop: true, poses: [
      { phase: 0, bob: 0, pulse: 0, pec: 0, barbel: 0 },
      { phase: Math.PI / 2, bob: -1, pulse: 1.5, pec: 8, barbel: 1.5 },
      { phase: Math.PI, bob: -2, pulse: 3, pec: 14, barbel: 3 },
      { phase: Math.PI * 1.5, bob: -1, pulse: 4.5, pec: 6, barbel: 4.5 },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { phase: 0.6, amp: 8.5, head: [-9, -5], headTilt: -0.3, jaw: 0.35, glow: 1.3, pulse: 2, barbel: 1 },
      { phase: 1.6, amp: 4, head: [8, 3], headTilt: 0.1, jaw: 0.95, glow: 1.4, spit: 3.5, pulse: 4, barbel: 3 },
      { phase: 2.2, amp: 5, head: [4, 1], jaw: 0.4, glow: 1.1, pulse: 5, barbel: 4 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { phase: 2.6, amp: 9, head: [-8, -7], headTilt: -0.5, jaw: 0.6, glow: 0.45, bob: -2, barbel: 2 },
    ] },
    break: { fps: 4, loop: true, poses: [
      { phase: 0.4, amp: 3, sag: 13, head: [-3, 7], headTilt: 0.32, jaw: 0.5, glow: 0.3, tailY: 6, motes: 3 },
      { phase: 0.9, amp: 3, sag: 14, head: [-3, 8], headTilt: 0.35, jaw: 0.6, glow: 0.5, tailY: 7, motes: 9, barbel: 1 },
    ] },
    special: { fps: 6, loop: false, poses: [
      { phase: 1.2, amp: 5, arch: -9, head: [-6, -10], headTilt: -0.5, jaw: 0.2, glow: 1.3, pulse: 2, tailY: 6, barbel: 2 },
      { phase: 2.4, amp: 4, arch: -6, head: [2, 20], headTilt: 1.2, jaw: 0.5, glow: 1.4, pulse: 4, tailY: -6, splash: 5, barbel: 4 },
    ] },
  },
  points: { center: [44, 30], muzzle: [88, 33], top: [56, 14] },
  icon: { x: 79, y: 30, scale: 0.6 },
};

// ---------------------------------------------------------------- RIME GOLEM (96x96)

/** Faceted block of ice (fists, boots): a lit top facet, a front facet and a shadow facet. */
function iceBlock(r, cx, cy, w, h, far, o = {}) {
  const mx = far ? 4 : 7, b = far ? -0.12 : 0;
  r.begin();
  r.poly([[cx - w, cy - h * 0.2], [cx - w * 0.6, cy - h], [cx + w * 0.55, cy - h], [cx + w, cy - h * 0.25], [cx + w * 0.85, cy + h * 0.8], [cx - w * 0.75, cy + h * 0.85]], ICE, { n: [0.15, 0, 1], bevel: 1, max: mx - 1, bias: b, ...o });
  r.poly([[cx - w, cy - h * 0.2], [cx - w * 0.6, cy - h], [cx + w * 0.55, cy - h], [cx + w, cy - h * 0.25], [cx + w * 0.2, cy - h * 0.2]], ICE, { n: [-0.3, -0.8, 0.5], bevel: 1, max: mx, bias: b });
  r.poly([[cx + w * 0.2, cy - h * 0.2], [cx + w, cy - h * 0.25], [cx + w * 0.85, cy + h * 0.8], [cx + w * 0.25, cy + h * 0.85]], ICE, { n: [0.75, 0.1, 0.65], max: mx - 2, bias: b - 0.05 });
  r.end(0.6);
}

/** Massive limb: rusted frame strut under a rime sleeve, a rusted joint, an ice-block fist (`frost`: Frost Shell crystal). */
function golemArm(r, sh, el, fist, far, frost) {
  const o = far ? { max: 4, bias: -0.12 } : { max: 6 };
  r.begin();
  r.seg(...sh, ...el, 6.4, 5.4, FRAME, { caps: 'flat', ...o });
  limbPlate(r, sh, el, [[0.0, -8], [0.0, 8.5], [0.85, 7], [0.85, -6.5]], RIME, { ...o, max: far ? 4 : 6, curve: 0.9 });
  r.end(0.55);
  r.begin();
  r.seg(...el, ...fist, 5.6, 6.4, FRAME, { caps: 'flat', ...o });
  limbPlate(r, el, fist, [[0.08, -7], [0.08, 6.6], [0.78, 8.4], [0.78, -8.8]], ICE, { ...o, max: far ? 4 : 6, curve: 0.8 });
  r.end(0.55);
  r.begin();
  r.ball(...el, 4, 4, RUST, { max: far ? 3 : 5, bias: -0.06, spec: far ? null : RUST[6], specT: 0.95 });
  r.end(0.5);
  iceBlock(r, fist[0], fist[1], 9, 7.5, far);
  if (!far) {
    for (let k = 0; k < 3; k++) r.dot(fist[0] + 4 - k, fist[1] - 3 + k * 3, ICE[7]);
    r.line(fist[0] - 6, fist[1] + 1, fist[0] - 2, fist[1] + 5, ICE[2]);
  }
  if (frost) crystal(r, fist[0] - 2, fist[1] - 6, -100, 6, 1.8, { k: 1 });
}

function golemLeg(r, hip, knee, foot, far) {
  const o = far ? { max: 4, bias: -0.12 } : { max: 6 };
  r.begin();
  r.seg(...hip, ...knee, 7.4, 6.4, FRAME, o);
  limbPlate(r, hip, knee, [[-0.05, -8.4], [-0.05, 8.4], [0.9, 7], [0.9, -7]], RIME, { ...o, max: far ? 4 : 6 });
  r.end(0.55);
  r.begin();
  r.seg(...knee, ...foot, 6, 6.6, FRAME, { caps: 'flat', ...o });
  r.end(0.5);
  r.ball(...knee, 3.4, 3.4, RUST, { max: far ? 3 : 5, bias: -0.06 });
  iceBlock(r, foot[0] + 2, foot[1] - 3, 9.5, 4.6, far, { n: [0.05, -0.2, 1] });
}

function drawGolem(r, P) {
  const core = P.core ?? 1, lamp = P.lamp ?? 1, armor = P.armor ?? 1, shell = P.shell || 0;
  const tx = P.tx || 0, ty = P.ty || 0;
  const torso = () => {
    r.translate(tx, ty);
    r.rotate(P.lean || 0, 42, 72);
  };
  r.save();
  torso();
  const shN = r.pt(40, 40), shF = r.pt(58, 38), hipN = r.pt(30, 66), hipF = r.pt(42, 64);
  r.restore();
  const A = P.arms || {};
  const far = A.far || { el: [74, 60], fist: [80, 86] };
  const near = A.near || { el: [48, 62], fist: [57, 86] };
  const legs = P.legs || {};
  const lf = legs.far || { knee: [46, 78], foot: [45, 93] };
  const ln = legs.near || { knee: [32, 80], foot: [27, 94] };
  const crystK = armor > 0 ? clamp(core * 0.55 + shell * 0.6, 0.3, 1.5) : 0;

  golemArm(r, shF, far.el, far.fist, true, false);
  golemLeg(r, hipF, lf.knee, lf.foot, true);

  r.save();
  torso();
  // back spikes: the rime armour (Frost Shell grows them; a break snaps them off)
  const spikes = [[22, 40, -142, 13, 3.6], [27, 31, -122, 18, 4.4], [35, 25, -104, 22, 5], [44, 22, -86, 17, 4.4], [52, 23, -66, 11, 3.4]];
  for (const [x, y, ang, len, w] of spikes) {
    const L = armor > 0 ? len * (1 + shell * 0.3) : len * 0.3;
    crystal(r, x, y, ang + (armor > 0 ? 0 : 20), L, w * (1 + shell * 0.12), { k: crystK, dim: armor <= 0 });
  }
  // hulking torso: the rusted loader frame, a rime carapace over the back
  r.begin();
  r.poly([[16, 50], [21, 33], [35, 23], [54, 22], [66, 30], [71, 44], [67, 62], [55, 72], [31, 75], [18, 66]], FRAME, { nf: dome(44, 48, 28, 28), max: 5 });
  r.end(0.6);
  r.begin();
  r.poly([[17, 49], [22, 33], [35, 24], [53, 23], [63, 30], [60, 40], [43, 46], [25, 53]], RIME, { nf: dome(38, 36, 24, 18), bevel: 1, max: 6, spec: RIME[6], specT: 0.985 });
  r.end(0.55);
  r.line(28, 34, 40, 28, RIME[6]);
  r.line(33, 45, 46, 41, RIME[2]);
  r.line(46, 30, 50, 38, RIME[2]);
  // chest plate with faded hazard stripes; the core glows through a ring
  r.begin();
  r.poly([[49, 46], [66, 41], [71, 53], [65, 68], [50, 70], [45, 58]], RUST, { n: [0.3, -0.1, 0.95], bevel: 1, max: 6 });
  r.end(0.55);
  r.each(47, 61, 69, 69, (mx, my, X, Y) => {
    if (my < 62.5 || my > 66.5 || mx < 49 || mx > 64 + (66.5 - my) * 0.2) return;
    r.put(X, Y, Math.floor((mx + my) / 2.5) % 2 ? HAZ[2] : RUST[1]);
  });
  for (const [x, y] of [[51, 48], [63, 44], [52, 67]]) {
    r.dot(x, y, RUST[7]);
    r.dot(x + 1, y + 1, RUST[1]);
  }
  const ck = clamp(core, 0.2, 1.5);
  r.begin();
  r.ring(59, 53, 3.6, 6.6, FRAME, { spec: FRAME[7], specT: 0.96 });
  r.end(0.5);
  r.glow(59, 53, 4.2, 4.2, core > 0.55 ? G_ICE : G_ICE_DIM, { k: ck, bias: core > 1.1 ? 0.6 : 0.2 });
  if (core > 0.55) {
    r.line(59, 47, 62, 43, G_ICE[2], ck * 0.55);
    r.line(64, 55, 69, 57, G_ICE[2], ck * 0.55);
    r.dot(58, 51, WHITE, 1);
  }
  for (const [x, y, l] of [[24, 63, 4], [30, 66, 6], [38, 68, 3], [56, 69, 4]]) for (let k = 0; k < l; k++) r.dot(x, y + k, k === l - 1 ? ICE[5] : RIME[5 - Math.min(3, k)]);

  // head: a sunken loader cab under a rime brow, one frosted sodium lamp
  r.save();
  r.translate(0, P.hy || 0);
  r.rotate(P.head || 0, 70, 42);
  r.begin();
  r.poly([[64, 33], [76, 31], [83, 36], [83, 45], [76, 50], [66, 49], [63, 42]], FRAME, { nf: dome(73, 40, 11, 10), bevel: 1, max: 6, spec: FRAME[7], specT: 0.97 });
  r.end(0.55);
  r.begin();
  r.poly([[62, 34], [74, 29], [84, 33], [83, 36.5], [74, 34], [64, 38]], RIME, { n: [-0.1, -0.85, 0.5], bevel: 1, max: 6 });
  r.end(0.45);
  for (const x of [66, 72, 79]) r.line(x, 36, x, 38, RIME[4]);
  const lk = clamp(lamp, 0.15, 1.4);
  r.begin();
  r.ring(77.5, 41, 2.6, 4.4, FRAME, { max: 6 });
  r.end(0.45);
  r.glow(77.5, 41, 3, 2.8, lamp > 0.5 ? G_SODIUM : G_SODIUM_DIM, { k: lk, bias: lamp > 1 ? 0.6 : 0.15 });
  if (lamp > 0.5) r.dot(76, 40, WHITE, 1);
  r.line(68, 46, 75, 46, FRAME[1]);
  r.line(69, 47, 74, 47, FRAME[5]);
  r.restore();
  r.restore();

  golemLeg(r, hipN, ln.knee, ln.foot, false);
  golemArm(r, shN, near.el, near.fist, false, shell > 0.8);

  // near pauldron: a rime boulder with its own crystal (a rusted shoulder joint once broken)
  r.save();
  torso();
  if (armor > 0) {
    crystal(r, 40, 30, -100, 12 * (1 + shell * 0.3), 3.6, { k: crystK });
    r.begin();
    r.poly([[27, 37], [36, 29], [49, 29], [56, 37], [53, 47], [40, 50], [29, 46]], ICE, { nf: dome(41, 37, 15, 11), bevel: 1, max: 6, spec: ICE[7], specT: 0.98 });
    r.end(0.6);
    r.line(32, 36, 42, 31, ICE[7]);
    r.line(36, 46, 48, 44, ICE[2]);
    r.line(44, 33, 48, 41, ICE[3]);
  } else {
    r.begin();
    r.ball(40, 40, 6.5, 6, FRAME, { max: 6, spec: FRAME[7], specT: 0.95 });
    r.ring(40, 40, 3.6, 5.4, RUST, { max: 5 });
    r.end(0.55);
    r.dot(40, 40, RUST[2]);
  }
  if (shell > 0) {
    // Frost Shell: fresh crystals across the frame, and glints racing over the armour
    for (const [x, y, ang, len] of [[30, 56, -150, 7], [62, 32, -40, 8], [50, 70, 160, 6], [20, 58, -170, 6]]) crystal(r, x, y, ang, len * shell, 2, { k: 1.2 });
    for (const [x, y] of [[34, 30], [56, 26], [44, 44], [24, 44]]) spark(r, x, y, shell > 1 ? 2 : 1, G_ICE);
  }
  r.restore();

  if (P.burst) {
    // the slam cracks the floor: ice shards thrown up around the fist
    const [fx] = near.fist;
    r.glow(fx + 2, 93, 15, 2.6, G_ICE, { fx: true, k: 0.9, bias: 0.3 });
    for (const [dx, ang, l] of [[-12, -125, 7], [-6, -105, 10], [6, -78, 9], [13, -55, 6]]) crystal(r, fx + dx, 95, ang, l, 1.8, { k: 1 });
    sparks(r, P.burst, fx, 84, 13, 8, G_ICE);
  }
  if (P.flakes) for (let k = 0; k < 7; k++) {
    const R = rng(P.flakes * 7 + k);
    r.dot(Math.round(12 + R() * 70), Math.round(14 + R() * 74), R() < 0.5 ? RIME[6] : RIME[4], 0.25, true);
  }
  if (P.shards) {
    const R = rng(P.shards);
    for (let k = 0; k < 6; k++) crystal(r, 10 + R() * 74, 94 + R() * 1.5, -90 + (R() - 0.5) * 140, 3 + R() * 5, 1.6, { k: 0, dim: true });
  }
  if (P.chips) sparks(r, P.chips, 42, 30, 14, 6, G_ICE);
  if (P.mist) steam(r, P.mist, 85 + (P.mist % 3), 46, 3, 0.5);
}

const GOLEM_KNEEL = {
  far: { knee: [50, 88], foot: [44, 94] },
  near: { knee: [38, 90], foot: [22, 94] },
};

const RIME_GOLEM = {
  w: 96, h: 96,
  bevel: 4,
  draw: drawGolem,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { core: 1, flakes: 1 },
      { core: 1.15, ty: 1, flakes: 2, mist: 3 },
      { core: 1.3, ty: 2, flakes: 3, mist: 7, arms: { far: { el: [74, 61], fist: [80, 86] }, near: { el: [48, 63], fist: [57, 86] } } },
      { core: 1.15, ty: 1, flakes: 4 },
    ] },
    attack: { fps: 7, loop: false, poses: [
      { core: 1.4, lamp: 1.3, ty: -2, tx: -3, lean: -0.1, arms: { near: { el: [46, 18], fist: [62, 9] } }, flakes: 5 },
      { core: 1.5, lamp: 1.3, ty: 3, tx: 3, lean: 0.12, burst: 11, arms: { near: { el: [64, 64], fist: [76, 87] }, far: { el: [76, 62], fist: [84, 87] } } },
      { core: 1.1, ty: 2, tx: 1, lean: 0.06, mist: 9, flakes: 6, arms: { near: { el: [60, 64], fist: [72, 87] } } },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { core: 0.55, lamp: 0.4, tx: -4, lean: -0.1, head: -0.12, chips: 13, arms: { near: { el: [44, 62], fist: [50, 86] } } },
    ] },
    break: { fps: 4, loop: true, poses: [
      { core: 0.3, lamp: 0.2, armor: 0, ty: 9, lean: 0.14, head: 0.2, legs: GOLEM_KNEEL, shards: 17,
        arms: { near: { el: [54, 72], fist: [62, 89] }, far: { el: [74, 70], fist: [78, 89] } } },
      { core: 0.6, lamp: 0.55, armor: 0, ty: 9, lean: 0.15, head: 0.18, legs: GOLEM_KNEEL, shards: 17, mist: 5,
        arms: { near: { el: [54, 72], fist: [62, 89] }, far: { el: [74, 70], fist: [78, 89] } } },
    ] },
    special: { fps: 5, loop: false, order: [0, 1, 1], poses: [
      { core: 1.4, lamp: 1.2, shell: 0.6, ty: -1, flakes: 7 },
      { core: 1.6, lamp: 1.2, shell: 1.2, ty: -1, flakes: 8, mist: 11 },
    ] },
  },
  points: { center: [48, 54], muzzle: [80, 84], top: [36, 4] },
  icon: { x: 71, y: 40, scale: 0.55 },
};

// ---------------------------------------------------------------- SALVAGE BOT (80x64)

function drawBot(r, P) {
  const eye = P.eye ?? 1, tread = P.tread || 0;
  const tx = P.tx || 0, ty = P.ty || 0;
  const hull = () => {
    r.translate(tx, ty);
    r.rotate(P.lean || 0, 36, 50);
  };

  // tracks: rusted tread loop with road wheels; links shift as it idles
  r.begin();
  r.seg(14, 55, 54, 55, 7.5, 7.5, FRAME, { max: 4 });
  r.end(0.6);
  r.each(5, 46, 63, 64, (mx, my, X, Y) => {
    const dx = mx < 14 ? mx - 14 : mx > 54 ? mx - 54 : 0, dy = my - 55;
    const d = Math.hypot(dx, dy);
    if (d > 7.5 || d < 6) return;
    const along = (mx < 14 || mx > 54) ? Math.atan2(dy, dx) * 7 : my < 55 ? mx : -mx;
    const link = Math.floor((along + tread) / 2.5) & 1;
    r.put(X, Y, link ? RUST[3] : FRAME[2]);
  });
  for (const [x, rad] of [[15, 4.2], [26, 3.6], [36, 3.6], [46, 3.6], [55, 4.2]]) {
    r.begin();
    r.ring(x, 56, 1.2, rad, FRAME, { spec: FRAME[7], specT: 0.96, max: 6 });
    r.end(0.5);
    r.dot(x, 56, RUST[5]);
    const sa = (tread * 40 + x * 13) * DEG;
    r.dot(Math.round(x + Math.cos(sa) * (rad - 1.5)), Math.round(56 + Math.sin(sa) * (rad - 1.5)), FRAME[6]);
  }
  r.rect(13, 47, 42, 2, RUST[2]);
  r.line(14, 47, 53, 47, RUST[5]);

  r.save();
  hull();
  // antenna with a faded Ringborn prayer ribbon
  const sw = (P.sway || 0);
  const at = [22 + sw * 0.5, 8];
  r.line(24, 24, Math.round(at[0]), Math.round(at[1]), FRAME[6]);
  r.line(25, 24, Math.round(at[0]) + 1, Math.round(at[1]), FRAME[3]);
  r.dot(Math.round(at[0]), Math.round(at[1]) - 1, P.led ? G_SODIUM[3] : RUST[2], P.led ? 1 : 0);
  const rb = [Math.round(at[0]), Math.round(at[1]) + 3];
  for (let k = 0; k < 7; k++) {
    const x = rb[0] - 1 - k, y = rb[1] + Math.round(Math.sin(k * 0.9 + sw) * 1.2 + k * 0.35);
    r.dot(x, y, RIBBON[k < 2 ? 3 : k < 5 ? 2 : 1]);
    r.dot(x, y + 1, RIBBON[1]);
  }

  // exhaust stack at the back
  r.begin();
  r.seg(16, 40, 15, 26, 2.4, 2.2, RUST, { caps: 'flat', max: 5, spec: RUST[7], specT: 0.96 });
  r.rect(13, 24, 5, 2, FRAME[4]);
  r.end(0.5);

  // hull: rusted box with faded Meridian teal paint, a dent, rivets and rust streaks
  r.begin();
  r.poly([[17, 46], [17, 28], [22, 24], [46, 23], [52, 28], [53, 46]], FRAME, { n: [0, -0.1, 1], max: 5 });
  r.end(0.6);
  r.begin();
  r.poly([[18, 44], [18, 29], [22, 25.5], [45, 24.5], [50, 29], [51, 44]], PAINT, { nf: dome(34, 32, 22, 18, 0.55), bevel: 1, max: 6, spec: PAINT[6], specT: 0.985 });
  r.end(0.5);
  // rust blooms at the edges and around the bolts (dithered rims)
  for (const [cx, cy, rx, ry] of [[21, 38, 4, 3.5], [48, 40, 5, 3], [25, 27, 3.5, 2], [49, 29, 2.5, 3.5], [37, 38, 3, 1.6]]) {
    r.each(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (mx, my, X, Y) => {
      const d = Math.hypot((mx - cx) / rx, (my - cy) / ry) + Math.sin(mx * 1.7 + my * 2.3) * 0.18;
      if (d > 1 || (d > 0.7 && dith(X, Y) > 0.1)) return;
      r.put(X, Y, d < 0.45 ? RUST[3] : RUST[4]);
    });
  }
  for (const [x, y, l] of [[23, 30, 9], [38, 28, 7], [46, 31, 10], [30, 36, 6]]) for (let k = 0; k < l; k++) r.dot(x + (k > l / 2 ? 1 : 0), y + k, k === 0 ? RUST[5] : RUST[k & 1 ? 3 : 4]);
  // hazard band and the stencil number
  r.each(18, 39, 51, 44, (mx, my, X, Y) => {
    if (my < 39.5 || my > 43.5) return;
    r.put(X, Y, Math.floor((mx - my) / 2.5) % 2 ? HAZ[2] : FRAME[1]);
  });
  r.line(18, 39, 51, 39, FRAME[5]);
  r.rect(26, 31, 1, 4, PAINT[1]);
  r.rect(28, 31, 3, 1, PAINT[1]);
  r.rect(30, 32, 1, 3, PAINT[1]);
  r.rect(28, 34, 3, 1, PAINT[1]);
  for (const [x, y] of [[20, 27], [48, 27], [20, 37], [49, 37]]) {
    r.dot(x, y, FRAME[7]);
    r.dot(x + 1, y + 1, FRAME[1]);
  }
  r.line(40, 33, 44, 36, PAINT[1]);
  r.line(41, 33, 45, 36, PAINT[6]);

  // top-mounted welding arm (folded at rest; it bends down to weld its own hull to repair)
  const W = P.weld || {};
  const wsh = [27, 26], wel = W.el || [22, 17], wtip = W.tip || [29, 12];
  r.begin();
  r.ball(...wsh, 2.6, 2, FRAME, { max: 5 });
  r.seg(...wsh, ...wel, 2, 1.8, RUST, { max: 6, spec: RUST[7], specT: 0.96 });
  r.seg(...wel, ...wtip, 1.6, 1.2, FRAME, { caps: 'flat', max: 6, spec: FRAME[7], specT: 0.96 });
  r.ball(...wel, 2.2, 2.2, FRAME, { max: 6 });
  r.end(0.5);
  if (W.arc) {
    r.glow(wtip[0], wtip[1] + 1, W.arc, W.arc * 0.8, G_WELD, { fx: true, bias: 0.7 });
    sparks(r, W.seed || 5, wtip[0], wtip[1] + 2, W.arc + 4, 7);
  } else r.dot(Math.round(wtip[0]), Math.round(wtip[1]), G_WELD[1], 0.5);

  // camera head on a short neck: hood over one big sodium lens (it flickers: eighty years old)
  r.save();
  r.translate(0, P.hy || 0);
  r.rotate(P.head || 0, 48, 24);
  r.begin();
  r.seg(46, 26, 50, 20, 2.4, 2.2, FRAME, { max: 5 });
  r.end(0.5);
  r.begin();
  r.poly([[44, 12], [56, 11], [61, 15], [61, 22], [55, 25], [45, 24]], RUST, { nf: dome(52, 17, 10, 8), bevel: 1, max: 6, spec: RUST[7], specT: 0.975 });
  r.poly([[43, 12], [56, 10], [62, 14], [60, 15.5], [55, 13], [44, 14.5]], PAINT, { n: [-0.1, -0.85, 0.5], bevel: 1, max: 6 });
  r.end(0.55);
  r.begin();
  r.ring(56, 18.5, 2.4, 4.6, FRAME, { spec: FRAME[7], specT: 0.96 });
  r.end(0.5);
  const ek = clamp(eye, 0.15, 1.4);
  r.glow(56.5, 18.5, 2.8, 2.8, eye > 0.5 ? G_SODIUM : G_SODIUM_DIM, { k: ek, bias: eye > 1 ? 0.7 : 0.15 });
  if (eye > 0.5) r.dot(55, 17, WHITE, 1);
  if (P.glitch) r.line(52, 18, 62, 18, WHITE, 1, true);
  r.restore();

  // near arm: rusted manipulator with a buzz saw
  const S = P.saw || {};
  const ssh = [44, 34], sel = S.el || [54, 40], sh = S.hub || [62, 36];
  r.begin();
  r.seg(...ssh, ...sel, 2.8, 2.4, FRAME, { max: 6, spec: FRAME[7], specT: 0.96 });
  r.seg(...sel, ...sh, 2.4, 2, RUST, { caps: 'flat', max: 6, spec: RUST[7], specT: 0.96 });
  r.ball(...sel, 3, 3, RUST, { max: 6 });
  r.ball(...ssh, 3.6, 3.6, PAINT, { max: 6, spec: PAINT[6], specT: 0.95 });
  r.end(0.55);
  const spin = (S.spin || 0) * DEG;
  r.begin();
  r.ring(sh[0], sh[1], 1.6, 6.2, STEEL, { max: 6, spec: STEEL[7], specT: 0.95 });
  r.end(0.5);
  for (let k = 0; k < 10; k++) {
    const a = spin + (k / 10) * Math.PI * 2;
    r.dot(Math.round(sh[0] + Math.cos(a) * 6.6), Math.round(sh[1] + Math.sin(a) * 6.6), STEEL[5]);
  }
  r.dot(sh[0], sh[1], RUST[6]);
  if (S.blur) r.ring(sh[0], sh[1], 3.5, 6, STEEL, { max: 7, min: 5 });
  if (S.sparks) sparks(r, S.sparks, sh[0] + 5, sh[1] + 3, 7, 8);
  r.restore();

  if (P.puff) smoke(r, P.puff, 15 + (P.puff % 2), 19 - (P.puff % 3), 3);
  if (P.smoke) for (const [seed, x, y, rad] of P.smoke) smoke(r, seed, x, y, rad);
  if (P.sparks) for (const [seed, x, y, sp, n] of P.sparks) sparks(r, seed, x, y, sp, n);
  if (P.flakes) sparks(r, P.flakes, 34, 30, 12, 5, rp('#46200f', '#6a3115', '#8f451c', '#b05e27', '#cf7d3a'));
}

const SALVAGE_BOT = {
  w: 80, h: 64,
  bevel: 3,
  draw: drawBot,
  anims: {
    idle: { fps: 6, loop: true, poses: [
      { tread: 0, sway: 0, eye: 1, led: 1, saw: { spin: 0 } },
      { tread: 1, sway: 1, eye: 0.85, ty: -1, saw: { spin: 9 }, puff: 3 },
      { tread: 2, sway: 2, eye: 1.05, led: 1, head: -0.05, saw: { spin: 18 }, puff: 8 },
      { tread: 3, sway: 1, eye: 0.6, saw: { spin: 27 } },
    ] },
    attack: { fps: 8, loop: false, poses: [
      { lean: -0.06, tx: -1, eye: 1.3, head: -0.08, saw: { el: [50, 28], hub: [56, 16], spin: 10, blur: 1 }, led: 1 },
      { lean: 0.08, tx: 3, eye: 1.3, head: 0.06, saw: { el: [60, 40], hub: [66, 48], spin: 30, blur: 1, sparks: 13 } },
      { lean: 0.03, tx: 1, eye: 1.1, saw: { el: [57, 41], hub: [64, 42], spin: 45 }, puff: 12 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { lean: -0.1, tx: -3, eye: 0.3, glitch: 1, head: -0.18, sway: -2, flakes: 7, saw: { el: [52, 44], hub: [58, 46] } },
    ] },
    break: { fps: 4, loop: true, poses: [
      { lean: 0.16, ty: 3, eye: 0.15, head: 0.3, hy: 2, sway: 3, saw: { el: [55, 45], hub: [60, 50] }, weld: { el: [20, 20], tip: [16, 26] },
        smoke: [[71, 16, 16, 4], [72, 13, 9, 3]], sparks: [[73, 40, 30, 5, 4]] },
      { lean: 0.17, ty: 3, eye: 0.55, head: 0.28, hy: 2, sway: 4, saw: { el: [55, 45], hub: [60, 50] }, weld: { el: [20, 20], tip: [16, 26] },
        smoke: [[74, 17, 14, 4], [75, 14, 7, 3]], sparks: [[76, 46, 34, 5, 4]] },
    ] },
    special: { fps: 6, loop: false, order: [0, 1, 0, 1], poses: [
      { eye: 1.2, head: -0.12, weld: { el: [30, 14], tip: [36, 24], arc: 3, seed: 21 }, led: 1 },
      { eye: 1.2, head: -0.1, weld: { el: [31, 14], tip: [37, 25], arc: 4.5, seed: 33 }, puff: 5 },
    ] },
  },
  points: { center: [36, 36], muzzle: [66, 40], top: [34, 9] },
  icon: { x: 53, y: 21, scale: 0.68 },
};

export default {
  ice_mite: ICE_MITE,
  void_eel: VOID_EEL,
  rime_golem: RIME_GOLEM,
  salvage_bot: SALVAGE_BOT,
};
