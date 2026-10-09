// heart: regular-enemy art (browser, TECH_PLAN 2.5, 7.6, 7.8; bestiary task CA-gamma).
//
// The Heart is WARDEN's reactor-cathedral: gold choir light over deep navy, pods hanging like stars
// (12.1). Its regular enemies are WARDEN's angels and wardens, the strongest foes of the game:
// porcelain and gilt over navy lacquer, lit from within by the gold iris of WARDEN's sigil (the almond
// eye, the twelve rays, the cradle rings). Painted with the POC enemy rig and the bestiary toolkit of
// prologue/enemyart.js; the porcelain ramp shades from navy shadow to warm cream, so the bodies read
// light against the Heart's dark floor. All sprites face RIGHT.
//
//   warden_seraph   112x112  six-winged seraph: gilt spars carrying porcelain blade-feathers round a
//                            veiled porcelain mask with one gold eye weeping gold, a rayed halo, a body
//                            of floating faceted reliquary lancets ending in a plumb of light (it never
//                            touches down). `attack` is its hymn (the Lullaby: rings of gold from the
//                            eye); `special` reaches out and folds a cradle ward round an ally; `break`
//                            drops it to the floor, halo broken, lancets and feathers shed.
//   dream_eater     120x96   a stained-glass moth: rose-window glass wings (gold round the root, blue
//                            glass, a WARDEN eye-spot) with a long tail, a porcelain skull with three
//                            gold eyes in a dark face, a coiled gilt proboscis and a caged lantern
//                            abdomen with a curled sleeper and stolen dream-light inside. `attack`
//                            uncoils the proboscis and drains; `special` gorges (wings spread, the
//                            lantern blazes); `break` shatters panes and drops it to the floor.
//   choir_guardian  112x124  the Choir's warden: a gothic hood with a vertical gold iris, a sleeping
//                            Choir pod caged in its chest, organ pipes rising behind it, a censer and a
//                            round cradle shield with the sigil, floating on a bell. `attack` is a
//                            shield bash; `special` raises the shield and throws the cradle rings over
//                            its allies (the 'shield' untargetable); `break` drops the shield.
//
// The Director plays `special` for charge-type enemy actions (buff, heal, summon, submerge, lockOn,
// charge) and `attack` (or the action's `pose`) for attacks. Every art has a 4-frame idle with
// secondary motion (wing beats, halo rays, singing pipes, a swinging censer, lantern swirl), 12
// frames in all. The seraph and the moth are painted floating: their frame bottom is the floor.

import { rng } from '../../art/painter.js';
import { rp, WHITE, DEG, clamp, dith, sparks, smoke, spot, polar, along, limbPlate, dome } from '../prologue/enemyart.js';

// ---------------------------------------------------------------- colours

// solid materials, dark -> light. Porcelain shades from navy shadow to warm cream (hue-shifted).
const PORCELAIN = rp('#151731', '#262849', '#3c3c5f', '#5a5679', '#7f7895', '#a69db0', '#c8bec0', '#ded3c9', '#f2e8d8');
const NAVY = rp('#04050d', '#080b1a', '#0d132b', '#141c3d', '#1c2751', '#263467', '#34457f', '#4a5c9c');
const GILT = rp('#1c1204', '#352409', '#5a3e0f', '#856017', '#b58723', '#dcae3a', '#f6d46a', '#fff3c4');

// glow ramps, outer (dim) -> inner (hot)
const G_GOLD = rp('#5a3608', '#a86c14', '#f0a830', '#ffd978', '#fff8e0');
const G_GOLD_DIM = rp('#211405', '#352108', '#4c300b', '#62400f', '#7a5317');
const G_DAWN = rp('#1c3a66', '#3f6fae', '#8fbcf0', '#d4eaff', '#ffffff');
const G_ROSE = rp('#4a0f2e', '#8f2559', '#e05a8f', '#ffaccb', '#fff0f6');
const VOID = rp('#020308', '#05060f', '#0a0c1a');

const goldOf = (k) => (k > 0.55 ? G_GOLD : G_GOLD_DIM);

// ---------------------------------------------------------------- shared helpers

/** Glowing elliptical arc (degrees a0..a1) of 1-2 px dots: rings of light, wards, sound waves. */
function glowArc(r, cx, cy, rx, ry, a0, a1, ramp, k = 0.8, o = {}) {
  const n = Math.max(8, Math.ceil(((Math.abs(a1 - a0) * DEG) * Math.max(rx, ry)) * 1.6));
  const hot = ramp[o.hot ?? ramp.length - 2], low = ramp[o.low ?? ramp.length - 4];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * DEG;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    const edge = i < n * 0.12 || i > n * 0.88;
    r.dot(Math.round(x), Math.round(y), edge ? low : hot, k * (edge ? 0.6 : 1), o.fx ?? true);
    if (o.thick) r.dot(Math.round(x + Math.cos(a)), Math.round(y + Math.sin(a)), low, k * 0.6, o.fx ?? true);
  }
}

/**
 * WARDEN's almond eye (the sigil): gold lids, a dark eye and a ringed gold iris with a hot pupil.
 * w x h is the almond; `vertical` stands it on end. k scales the glow (0.2 = dim, 1.4 = blazing).
 */
function almondEye(r, cx, cy, w, h, k, o = {}) {
  const hw = w / 2, hh = h / 2, ir = o.iris ?? Math.min(hw, hh) * 0.62;
  const g = goldOf(k), kk = clamp(k, 0.15, 1.4);
  r.each(cx - hw - 1, cy - hh - 1, cx + hw + 1, cy + hh + 1, (mx, my, X, Y) => {
    let u = (mx - cx) / hw, v = (my - cy) / hh;
    if (o.vertical) [u, v] = [v, u];
    const lid = 1 - u * u;
    if (lid <= 0 || Math.abs(v) > lid) return;
    const d = Math.hypot(mx - cx, my - cy);
    if (Math.abs(v) > lid - (o.lid ?? 0.42)) r.put(X, Y, g[k > 1.05 ? 4 : 3], 0.9 * kk);
    else if (d < ir * 0.4) r.put(X, Y, k > 0.55 ? WHITE : g[2], kk);
    else if (d < ir) r.put(X, Y, g[d < ir * 0.72 ? 2 : 3], 0.75 * kk);
    else r.put(X, Y, VOID[1]);
  });
}

/** Thin gilt filigree stroke through points (model space), optionally glowing. */
function filigree(r, pts, c, k = 0) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    r.line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), c, k);
  }
}

/** Falling gold motes (choir dust): single dots and short streaks, emissive, no outline. */
function motes(r, seed, x0, y0, w, h, n, ramp = G_GOLD, k = 0.7) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + R() * w), y = Math.round(y0 + R() * h);
    const c = ramp[R() < 0.3 ? 4 : 3];
    r.dot(x, y, c, k, true);
    if (R() < 0.35) r.dot(x, y + 1, ramp[2], k * 0.6, true);
  }
}

// ---------------------------------------------------------------- WARDEN SERAPH (112x112)

const PLUME_NEAR = { ramp: PORCELAIN, max: 8, bias: 0.04, edge: G_GOLD, edgeK: 0.5, spar: 7 };
const PLUME_FAR = { ramp: PORCELAIN, max: 5, bias: -0.24, edge: G_GOLD_DIM, edgeK: 0.3, spar: 5 };

/** Point at fraction t (0..1) of the length of a polyline. */
function onPath(pts, t) {
  const lens = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(l);
    total += l;
  }
  let d = clamp(t, 0, 1) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, d / lens[i]) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    d -= lens[i];
  }
  return pts[pts.length - 1];
}

/**
 * A wing: a gilt spar (polyline from the shoulder) carrying n porcelain blade-feathers, their angle
 * turning from a0 at the root to a1 at the tip (degrees, screen) and their length growing from l0 to
 * l1. o.flap turns the whole wing round its root (degrees), o.jit scatters the blades (hurt), o.droop
 * bends them toward the floor (break), o.eyes lists blades carrying a small gold eye.
 */
function wing(r, spar, F, S, o = {}) {
  const R = rng(o.seed || 7), root = spar[0];
  r.save();
  r.rotate((o.flap || 0) * DEG, ...root);
  const w0 = F.w ?? 4.4;
  for (let i = F.n - 1; i >= 0; i--) {
    const t = 0.12 + (0.88 * i) / (F.n - 1);
    const a = F.a0 + (F.a1 - F.a0) * t + (o.jit ? (R() - 0.5) * o.jit : 0) + (o.droop || 0) * (0.4 + t * 0.6);
    const len = (F.l0 + (F.l1 - F.l0) * Math.pow(t, 0.85)) * (o.len ?? 1);
    const base = onPath(spar, t), tip = polar(...base, a, len);
    const w = w0 * (0.8 + 0.2 * t);
    r.begin();
    limbPlate(r, base, tip, [[0, -1.8], [0, 1.8], [0.3, w], [0.8, w * 0.6], [1, 0], [0.84, -w * 0.36], [0.28, -w * 0.58]], S.ramp, {
      max: S.max, bias: S.bias, curve: 0.7, spec: S.max > 6 ? PORCELAIN[8] : null, specT: 0.988,
    });
    r.end(0.6);
    // quill, gilt leading edge near the tip, hot tip
    const q0 = along(base, tip, 0.1, 0), q1 = along(base, tip, 0.74, 0.5);
    r.line(Math.round(q0[0]), Math.round(q0[1]), Math.round(q1[0]), Math.round(q1[1]), S.ramp[Math.max(1, S.max - 4)]);
    const e1 = along(base, tip, 0.55, w * 0.72), e2 = along(base, tip, 0.95, w * 0.1);
    filigree(r, [e1, e2], S.edge[3], S.edgeK);
    r.dot(Math.round(tip[0]), Math.round(tip[1]), S.edge[4], S.edgeK + 0.25);
    if (o.eyes?.includes(i)) {
      const [ex, ey] = along(base, tip, 0.62, w * 0.1).map(Math.round);
      r.dot(ex - 1, ey, S.edge[3], S.edgeK + 0.3);
      r.dot(ex, ey, VOID[0]);
      r.dot(ex + 1, ey, S.edge[3], S.edgeK + 0.3);
      r.dot(ex, ey - 1, S.edge[2], S.edgeK);
      r.dot(ex, ey + 1, S.edge[2], S.edgeK * 0.7);
    }
  }
  // the spar: a gilt arm with a glowing joint at each bend
  r.begin();
  for (let i = 0; i < spar.length - 1; i++) {
    const ra = 1.8 - i * 0.3, rb = 1.8 - (i + 1) * 0.3;
    r.seg(...spar[i], ...spar[i + 1], ra, Math.max(0.9, rb), GILT, { max: S.spar, bias: S.bias * 0.5, spec: S.spar > 6 ? GILT[7] : null, specT: 0.95 });
  }
  r.end(0.5);
  for (let i = 1; i < spar.length - 1; i++) r.dot(Math.round(spar[i][0]), Math.round(spar[i][1]), S.edge[4], S.edgeK + 0.2);
  r.restore();
}

/** The rayed halo: a gilt tube ring and twelve rays whose brightness walks round with `phase`. */
function halo(r, cx, cy, R0, phase, k, o = {}) {
  const ry = o.ry ?? 1.1, broken = o.broken;
  const keep = broken ? (mx, my) => {
    const a = (Math.atan2((my - cy) / ry, mx - cx) / DEG + 360) % 360;
    return !((a > 20 && a < 70) || (a > 200 && a < 236) || (a > 300 && a < 318));
  } : null;
  r.begin();
  r.ring(cx, cy, R0 - 1.4, R0 + 1.4, GILT, { ry, max: k > 0.5 ? 7 : 5, glow: 0.25 * k, clip: keep, spec: GILT[7], specT: 0.97 });
  r.end(0.45);
  for (let i = 0; i < 12; i++) {
    const a = i * 30 - 90 + (o.turn || 0);
    if (broken && (i % 4 === 1 || i === 6)) continue;
    const on = (i + phase * 3) % 12 < 3;
    const long = i % 2 === 0 ? 7 : 4.5;
    const c = Math.cos(a * DEG), s = Math.sin(a * DEG) * ry;
    const ax = cx + c * (R0 + 2.4), ay = cy + s * (R0 + 2.4);
    const bx = cx + c * (R0 + 2.4 + long), by = cy + s * (R0 + 2.4 + long);
    const g = goldOf(k * (on ? 1.2 : 0.8));
    r.beam(ax, ay, bx, by, on ? 1.5 : 1.1, 0.5, g, { k: (on ? 0.85 : 0.45) * k, bias: on ? 0.5 : 0 });
  }
}

/** The seraph's near arm: a porcelain sleeve with a gilt cuff, a slim forearm and hand. */
function seraphArm(r, sh, el, hand) {
  r.begin();
  r.seg(...el, ...hand, 1.6, 1.3, PORCELAIN, { max: 8 });
  r.ball(...hand, 2, 2, PORCELAIN, { max: 8, spec: PORCELAIN[8], specT: 0.96 });
  r.end(0.5);
  r.begin();
  limbPlate(r, sh, el, [[-0.05, -2.4], [-0.05, 2.6], [0.75, 3.6], [1.0, 3.3], [0.95, -2]], PORCELAIN, { max: 8, bias: 0.02 });
  r.end(0.55);
  const c0 = along(sh, el, 0.98, 3.3), c1 = along(sh, el, 0.95, -2);
  r.line(Math.round(c0[0]), Math.round(c0[1]), Math.round(c1[0]), Math.round(c1[1]), G_GOLD[3], 0.55);
}

/** A navy ribbon trailing behind the waist, tapering to a gold bead; `sway` bends it. */
function ribbon(r, pts, w, sway) {
  const p = pts.map(([x, y], i) => [x - sway * i * i * 0.6, y]);
  r.begin();
  for (let i = 0; i < p.length - 1; i++) {
    const wa = w * (1 - i / p.length), wb = w * (1 - (i + 1) / p.length);
    r.seg(...p[i], ...p[i + 1], wa, Math.max(0.6, wb), NAVY, { max: 4, bias: -0.1 });
  }
  r.end(0.5);
  const last = p[p.length - 1];
  r.dot(Math.round(last[0]), Math.round(last[1]) + 1, G_GOLD_DIM[3], 0.3);
}

const SERAPH_ARMS = {
  pray: { sh: [67, 45], el: [71, 55], hand: [74, 50] },
  raise: { sh: [67, 45], el: [74, 38], hand: [80, 30] },
  spread: { sh: [67, 45], el: [77, 46], hand: [87, 43] },
  reach: { sh: [67, 45], el: [77, 50], hand: [86, 50] },
  hurt: { sh: [66, 45], el: [64, 56], hand: [70, 60] },
  fall: { sh: [67, 46], el: [68, 57], hand: [66, 66] },
};

// wing geometry (spars and feather fans) at rest
const W_FAR_UP = { spar: [[53, 44], [49, 32], [46, 19], [44, 9]], F: { n: 6, a0: 172, a1: 196, l0: 11, l1: 22, w: 3.8 } };
const W_FAR_MID = { spar: [[53, 48], [44, 47], [34, 47], [25, 49]], F: { n: 5, a0: 168, a1: 186, l0: 9, l1: 17, w: 3.4 } };
const W_FAR_LOW = { spar: [[53, 51], [45, 58], [36, 65], [27, 70]], F: { n: 6, a0: 176, a1: 146, l0: 10, l1: 21, w: 3.8 } };
const W_UP = { spar: [[55, 46], [46, 35], [37, 23], [29, 13]], F: { n: 7, a0: 160, a1: 200, l0: 15, l1: 30 } };
const W_LOW = { spar: [[57, 55], [49, 64], [41, 75], [35, 87]], F: { n: 6, a0: 176, a1: 128, l0: 12, l1: 22 } };

function drawSeraph(r, P) {
  const Wg = P.wings || {};
  const eye = P.eye ?? 1, hk = P.halo ?? 1;
  const body = () => {
    r.translate(P.tx || 0, (P.ty || 0) + (P.bob || 0));
    r.rotate(P.lean || 0, 60, 62);
  };
  const head = () => {
    r.translate(P.hx || 0, P.hy || 0);
    r.rotate(P.head || 0, 63, 34);
  };
  const wo = (flap, seed, eyes) => ({ flap, seed, eyes, jit: Wg.jit, droop: Wg.droop, len: Wg.len });

  r.save();
  body();
  // far wings, behind everything
  wing(r, W_FAR_UP.spar, W_FAR_UP.F, PLUME_FAR, wo((Wg.up || 0) * 0.8, 3));
  wing(r, W_FAR_MID.spar, W_FAR_MID.F, PLUME_FAR, wo(((Wg.up || 0) + (Wg.low || 0)) * 0.4, 4));
  wing(r, W_FAR_LOW.spar, W_FAR_LOW.F, PLUME_FAR, wo((Wg.low || 0) * 0.8, 5));
  // a ribbon trailing behind the waist
  const sw = P.sway || 0;
  ribbon(r, [[53, 64], [48, 75], [45, 87], [42, 99]], 2.6, sw);

  // halo behind the head
  r.save();
  head();
  halo(r, 62, 26, 15.5, P.phase || 0, hk, { broken: P.broken, turn: P.turn || 0 });
  r.restore();
  // near wings: mounted on the back, in front of the halo, behind the body
  wing(r, W_LOW.spar, W_LOW.F, PLUME_NEAR, wo(Wg.low || 0, 13, [3]));
  wing(r, W_UP.spar, W_UP.F, PLUME_NEAR, wo(Wg.up || 0, 11, [4]));

  // the body below the waist: three floating faceted reliquary lancets, a plumb of light below them
  const SEGS = [[[52, 62], [68, 62], [66, 74], [54, 74]], [[54, 76], [66, 76], [64, 86], [56, 86]], [[56, 88], [64, 88], [60, 99]]];
  const reliquary = (pts, i) => {
    // a faceted porcelain lancet: a lit left facet, a shadowed right facet, a gilt ridge between them
    const [a, b] = [pts[0], pts[1]];
    const top = [(a[0] + b[0]) / 2, a[1]];
    const tip = pts.length === 3 ? pts[2] : [(pts[2][0] + pts[3][0]) / 2, pts[2][1]];
    const left = pts.length === 3 ? [a, top, tip] : [a, top, tip, pts[3]];
    const right = pts.length === 3 ? [top, b, tip] : [top, b, pts[2], tip];
    r.begin();
    r.poly(left, PORCELAIN, { n: [-0.45, -0.25, 0.86], bevel: 1, max: 8, bias: 0.04 - 0.03 * i });
    r.poly(right, PORCELAIN, { n: [0.55, 0.05, 0.83], bevel: 1, max: 6, bias: -0.03 * i });
    r.end(0.55);
    r.line(Math.round(a[0]) + 1, Math.round(a[1]), Math.round(b[0]) - 1, Math.round(b[1]), GILT[6], 0.25);
    r.line(Math.round(top[0]), Math.round(top[1]) + 1, Math.round(tip[0]), Math.round(tip[1]) - 1, GILT[5], 0.2);
  };
  SEGS.forEach((pts, i) => { if (!P.fallen || i === 0) reliquary(pts, i); });
  // light between the segments, and the plumb
  const lk = P.plumb ?? 1;
  if (!P.fallen) {
    for (const y of [75, 87]) r.line(57, y, 63, y, G_GOLD[3], 0.55 * lk, true);
    r.line(60, 100, 60, 102, GILT[5], 0.3);
    r.poly([[60, 101.5], [62.4, 104.5], [60, 108], [57.6, 104.5]], GILT, { n: [-0.3, -0.3, 0.9], glow: 0.55 * lk, max: 7, min: 3 });
    r.dot(60, 104, WHITE, 0.9 * lk);
    for (let k = 0; k < 3; k++) r.dot(60, 109 + k, G_GOLD[3 - k], 0.6 * lk * (1 - k * 0.25), true);
  } else {
    r.line(56, 75, 64, 75, G_GOLD_DIM[4], 0.4, true);
  }

  // veil: navy cloth from the crown of the head over the shoulders, gilt border
  r.save();
  head();
  r.begin();
  r.poly([[60, 17], [67, 16], [71, 21], [65, 30], [61, 44], [53, 50], [48, 46], [50, 32], [54, 22]], NAVY, { nf: dome(57, 32, 14, 18), bevel: 1, max: 6, bias: 0.06 });
  r.end(0.6);
  filigree(r, [[61, 44], [54, 49], [49, 46]], G_GOLD[3], 0.45);
  r.restore();

  // torso: a porcelain cuirass with gilt filigree and the chest gem
  r.begin();
  r.poly([[52, 44], [63, 41], [71, 44], [70, 53], [67, 61], [53, 61], [50, 52]], PORCELAIN, { nf: dome(61, 48, 14, 14), bevel: 1, max: 8, bias: 0.1, spec: PORCELAIN[8], specT: 0.985 });
  r.end(0.6);
  r.begin();
  r.poly([[52, 59], [68, 59], [68, 62], [52, 62]], GILT, { n: [0, -0.3, 0.95], bevel: 1, max: 7 });
  r.end(0.45);
  filigree(r, [[55, 45], [59, 52], [62, 52], [67, 45]], GILT[4], 0.15);
  const gk = P.gem ?? 1;
  r.poly([[62, 46], [65, 50.5], [62, 55], [59, 50.5]], GILT, { n: [-0.3, -0.4, 0.86], glow: 0.7 * gk, max: 7, min: 3, bias: 0.2 });
  r.dot(62, 49, WHITE, gk);
  r.dot(61, 50, G_GOLD[4], gk);

  // head: a smooth porcelain mask with one gold eye, gold tears running down it
  r.save();
  head();
  r.begin();
  r.ball(65.5, 28, 7, 9.4, PORCELAIN, { max: 8, bias: 0.1, spec: PORCELAIN[8], specT: 0.97 });
  r.end(0.55);
  r.line(62, 23, 71, 22, PORCELAIN[8]);
  r.line(71, 32, 68, 37, PORCELAIN[4]);
  almondEye(r, 68, 27.5, 8, 4, eye);
  const tk = clamp(eye * 0.45, 0.15, 0.7);
  filigree(r, [[67, 30], [66.5, 34], [67, 37]], G_GOLD[2], tk);
  filigree(r, [[70, 30], [70.5, 33]], G_GOLD[2], tk * 0.8);
  if (P.crack) filigree(r, [[64, 20], [66, 24], [64, 27], [65, 31]], VOID[2]);
  r.begin();
  r.poly([[59, 37], [69, 37], [70, 41], [58, 42]], GILT, { n: [0.1, -0.5, 0.85], bevel: 1, max: 7 });
  r.end(0.45);
  r.restore();

  // near arm
  const A = SERAPH_ARMS[P.arms || 'pray'];
  seraphArm(r, A.sh, A.el, A.hand);
  r.restore();

  // hymn: rings of gold leaving the eye (attack)
  if (P.wave) {
    const ex = 69 + (P.tx || 0), ey = 28 + (P.ty || 0) + (P.bob || 0) + (P.hy || 0);
    for (const [rad, k] of P.wave) glowArc(r, ex, ey, rad, rad * 1.15, -48, 48, G_GOLD, k, { thick: rad > 14 });
  }
  // cradle ward: rings folding round an ally (special), with the sigil eye at its heart
  if (P.ward) {
    const k = P.ward, cx = 99, cy = 50;
    glowArc(r, cx, cy, 6, 14, 0, 360, G_GOLD, 0.9 * k, { thick: true });
    glowArc(r, cx, cy, 10, 20, -70, 70, G_GOLD, 0.7 * k);
    glowArc(r, cx, cy, 10, 20, 110, 250, G_GOLD, 0.5 * k);
    almondEye(r, cx, cy, 6, 3, 1.2 * k);
    for (let i = 0; i < 6; i++) {
      const [x, y] = polar(cx, cy, i * 60 + (k > 1 ? 30 : 0), 17);
      spot(r, x, cy + (y - cy) * 1.2, 2, G_GOLD, 0.8);
    }
    const hx = 87 + (P.tx || 0), hy = 50 + (P.ty || 0) + (P.bob || 0);
    for (let x = hx + 2; x < cx - 6; x += 2) r.dot(x, hy, G_GOLD[3], 0.6, true);
  }
  if (P.fallen) {
    // the lower reliquary segments lie on the floor, and shed blades (break)
    for (const [i, x, y, a] of [[1, 47, 100, -0.5], [2, 76, 101, 1.2]]) {
      r.save();
      r.translate(x - 60, y - 66 - i * 12);
      r.rotate(a, 60, 66 + i * 12);
      reliquary(SEGS[i], i);
      r.restore();
    }
    for (const [x, y, len, a] of P.fallen) {
      const b = polar(x, y, a, len);
      r.begin();
      limbPlate(r, [x, y], b, [[0, -1.4], [0, 1.4], [0.35, 2.8], [1, 0], [0.4, -1.8]], PORCELAIN, { max: 7, bias: -0.04 });
      r.end(0.5);
      r.dot(Math.round(b[0]), Math.round(b[1]), G_GOLD_DIM[4], 0.4);
    }
  }
  if (P.motes) motes(r, P.motes, 8, 46, 56, 60, 7, G_GOLD, 0.6);
  if (P.sparks) for (const [seed, x, y, sp, n] of P.sparks) sparks(r, seed, x, y, sp, n, G_GOLD);
  if (P.smoke) for (const [seed, x, y, rad] of P.smoke) smoke(r, seed, x, y, rad);
}

const SERAPH_FALLEN = [[28, 109, 14, -6], [80, 110, 12, 188], [90, 108, 10, -18], [16, 107, 9, 10]];

const WARDEN_SERAPH = {
  w: 112, h: 112,   // room on the right for the hymn rings and the ward
  bevel: 3,
  draw: drawSeraph,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { bob: 0, phase: 0, wings: { up: 0, low: 0 }, motes: 3, sway: 0 },
      { bob: -1, phase: 1, wings: { up: 4, low: -3 }, gem: 0.8, motes: 5, sway: 0.5, plumb: 0.8 },
      { bob: -2, phase: 2, wings: { up: 8, low: -6 }, gem: 0.6, eye: 0.9, motes: 7, sway: 1, plumb: 0.65 },
      { bob: -1, phase: 3, wings: { up: 4, low: -3 }, gem: 0.8, motes: 9, sway: 0.5, plumb: 0.8 },
    ] },
    attack: { fps: 8, loop: false, order: [0, 1, 1, 2], poses: [
      { bob: -2, tx: -2, lean: -0.05, head: -0.18, hy: -1, arms: 'raise', eye: 1.3, halo: 1.3, phase: 0, wings: { up: 14, low: -10 } },
      { bob: -1, tx: 2, lean: 0.03, head: 0.06, arms: 'spread', eye: 1.45, halo: 1.4, phase: 2, wings: { up: -10, low: 8 }, wave: [[9, 1], [15, 0.8], [21, 0.55]] },
      { bob: -1, tx: 1, arms: 'spread', eye: 1.1, halo: 1.1, phase: 3, wings: { up: -5, low: 4 }, wave: [[19, 0.6], [27, 0.4], [34, 0.25]] },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { tx: -5, lean: -0.14, head: -0.22, hx: -1, arms: 'hurt', eye: 0.35, halo: 0.6, phase: 1, turn: 9, crack: 1, gem: 0.4, sway: 1.4,
        wings: { up: -12, low: 10, jit: 18 }, sparks: [[21, 62, 50, 9, 6]] },
    ] },
    break: { fps: 4, loop: true, poses: [
      { ty: 22, lean: 0.24, head: 0.45, hy: 2, arms: 'fall', eye: 0.25, halo: 0.35, broken: 1, turn: 11, crack: 1, gem: 0.25, sway: -1,
        wings: { up: -58, low: -24, droop: -18, jit: 12, len: 0.9 }, fallen: SERAPH_FALLEN, smoke: [[31, 72, 64, 4]] },
      { ty: 22, lean: 0.24, head: 0.45, hy: 2, arms: 'fall', eye: 0.6, halo: 0.5, broken: 1, turn: 11, crack: 1, gem: 0.45, sway: -1,
        wings: { up: -59, low: -25, droop: -18, jit: 12, len: 0.9 }, fallen: SERAPH_FALLEN, smoke: [[32, 71, 60, 3.5]] },
    ] },
    special: { fps: 6, loop: false, order: [0, 1, 0, 1], poses: [
      { bob: -1, tx: 1, arms: 'reach', eye: 1.25, halo: 1.2, phase: 1, wings: { up: 6, low: -4 }, ward: 0.8, gem: 1.3 },
      { bob: -1, tx: 1, arms: 'reach', eye: 1.35, halo: 1.3, phase: 2, wings: { up: 9, low: -6 }, ward: 1.15, gem: 1.5 },
    ] },
  },
  points: { center: [60, 58], muzzle: [71, 28], top: [60, 4], core: [62, 51] },
  icon: { x: 64, y: 30, scale: 0.62 },
};

// ---------------------------------------------------------------- DREAM EATER (120x96)

// stained-glass panes: albedo ramp (dark -> light) and emissive strength
const PANE_BLUE = { ramp: rp('#070d2a', '#0c1746', '#14246a', '#203892', '#3554b8'), k: 0.2 };
const PANE_BLUE2 = { ramp: rp('#0b1236', '#15235e', '#22388a', '#3958b4', '#5f80d8'), k: 0.24 };
const PANE_GOLD = { ramp: rp('#4a2c06', '#87560f', '#c4861e', '#eab040', '#ffd982'), k: 0.42 };
const PANE_ROSE = { ramp: rp('#300a22', '#5a163c', '#8c2a5c', '#c04c82', '#e682ae'), k: 0.32 };
const PANE_DAWN = { ramp: rp('#14284a', '#25497c', '#4677b0', '#7eaad8', '#bcd8f2'), k: 0.28 };
const PANES = [PANE_BLUE, PANE_BLUE2, PANE_GOLD, PANE_ROSE, PANE_DAWN];

/** A rose-window layout: a gold ring round the root, blue glass with sparse rose and dawn panes. */
function paneOf(vi, ai) {
  if (ai === 0) return vi % 3 === 1 ? PANE_ROSE : PANE_GOLD;
  if (ai === 1) return vi % 3 === 2 ? PANE_ROSE : vi % 2 ? PANE_BLUE2 : PANE_BLUE;
  if (ai === 2) return vi % 4 === 0 ? PANE_GOLD : vi % 2 ? PANE_BLUE : PANE_BLUE2;
  return vi % 3 === 0 ? PANE_DAWN : vi % 2 ? PANE_BLUE2 : PANE_BLUE;
}

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

/**
 * A stained-glass wing: panes cut by lead veins radiating from the root and arcs round it, each pane
 * a piece of lit glass (emissive), a gilt frame round the outline. o.k scales the glass light, o.holes
 * (0..1) knocks panes out (break), o.dim darkens the far wing.
 */
function glassWing(r, pts, root, veins, arcs, o = {}) {
  const inside = inPoly(pts), k = o.k ?? 1, dim = o.dim || 0;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  r.begin();
  r.each(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (mx, my, X, Y) => {
    if (!inside(mx, my)) return;
    const dx = mx - root[0], dy = my - root[1], d = Math.hypot(dx, dy), th = Math.atan2(dy, dx) / DEG;
    let vi = 0, lead = false;
    for (let v = 0; v < veins.length; v++) {
      const da = Math.abs(((th - veins[v] + 540) % 360) - 180);
      if (da * DEG * d < 0.65) lead = true;
      if ((((th - veins[v]) % 360) + 360) % 360 < 180) vi = v + 1;
    }
    let ai = 0;
    for (let a = 0; a < arcs.length; a++) {
      if (Math.abs(d - arcs[a]) < 0.6) lead = true;
      if (d > arcs[a]) ai = a + 1;
    }
    if (lead) { r.put(X, Y, NAVY[dim ? 0 : 1]); return; }
    if (o.holes && rng((vi * 7 + ai * 13 + (o.seed || 0)) * 31 + 7)() < o.holes) return;
    const pane = paneOf(vi, ai);
    // lighter toward the outer arc of the pane, with a dithered sheen
    const outer = ai < arcs.length ? arcs[ai] : d + 6, inner = ai > 0 ? arcs[ai - 1] : 0;
    const t = clamp((d - inner) / Math.max(1, outer - inner), 0, 1);
    const n = pane.ramp.length - 1;
    const idx = clamp(Math.round((0.35 + t * 0.5) * n + dith(X, Y) * 0.8 - dim * 2), 0, n);
    r.put(X, Y, pane.ramp[idx], pane.k * k * (1 - dim * 0.6));
  });
  r.end(0.4);
  // gilt frame round the outline
  const g = dim ? GILT[3] : GILT[5];
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    r.line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), g, dim ? 0.1 : 0.25);
  }
}

/** WARDEN's iris as a wing eye-spot: gold ring, navy ring, gold iris, hot pupil. */
function eyeSpot(r, cx, cy, R0, k) {
  const g = goldOf(k);
  r.each(cx - R0 - 1, cy - R0 - 1, cx + R0 + 1, cy + R0 + 1, (mx, my, X, Y) => {
    const d = Math.hypot(mx - cx, (my - cy) * 1.15);
    if (d > R0) return;
    const u = d / R0;
    if (u > 0.78) r.put(X, Y, g[3], 0.6 * k);
    else if (u > 0.58) r.put(X, Y, NAVY[1]);
    else if (u > 0.22) r.put(X, Y, g[u > 0.42 ? 2 : 3], 0.7 * k);
    else r.put(X, Y, k > 0.55 ? WHITE : g[3], k);
  });
}

/** Points of a gilt proboscis from the mouth: straight along a0 when coil = 0, a tight spiral at 1. */
function proboscis(start, L, coil, a0) {
  const steps = 26, pts = [start];
  let [x, y] = start;
  for (let i = 1; i <= steps; i++) {
    const s = i / steps;
    const a = (a0 + coil * 620 * s * s) * DEG;
    x += (Math.cos(a) * L) / steps;
    y += (Math.sin(a) * L) / steps;
    pts.push([x, y]);
  }
  return pts;
}

/** Feathered gilt antenna along a 3-point curve, barbs on both sides. */
function antenna(r, pts, far) {
  const ramp = far ? G_GOLD_DIM : G_GOLD;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    r.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), GILT[far ? 3 : 5], far ? 0.1 : 0.2);
    for (let t = 0.15; t < 1; t += 0.3) {
      const L = 2.4 * (1 - (i + t) / pts.length) + 1;
      const p0 = along(a, b, t, L), p1 = along(a, b, t, -L * 0.7), c = along(a, b, t, 0);
      r.line(Math.round(c[0]), Math.round(c[1]), Math.round(p0[0]), Math.round(p0[1]), GILT[far ? 2 : 4]);
      r.line(Math.round(c[0]), Math.round(c[1]), Math.round(p1[0]), Math.round(p1[1]), GILT[far ? 2 : 3]);
    }
  }
  const tip = pts[pts.length - 1];
  r.dot(Math.round(tip[0]), Math.round(tip[1]), ramp[4], far ? 0.3 : 0.7);
}

// wing outlines at rest (forewing raised up and back, the hindwing trailing a long tail)
const DE_FORE = [[58, 37], [46, 24], [32, 12], [17, 4], [11, 9], [10, 20], [16, 32], [30, 40], [46, 44], [57, 43]];
const DE_HIND = [[56, 46], [44, 48], [31, 53], [21, 60], [17, 68], [21, 75], [29, 76], [25, 84], [19, 92], [24, 93], [32, 85], [39, 72], [48, 60], [55, 51]];
const DE_FORE_VEINS = [192, 199, 206, 213, 220, 228, 236];
const DE_HIND_VEINS = [128, 137, 146, 156, 167, 180, 194];

function drawDreamEater(r, P) {
  const eyes = P.eyes ?? 1, feed = P.feed ?? 1, coil = P.coil ?? 1;
  const body = () => {
    r.translate(P.tx || 0, (P.ty || 0) + (P.bob || 0));
    r.rotate(P.lean || 0, 60, 50);
  };
  r.save();
  body();

  // far wings (the other side): darker, raised a little higher, behind everything
  const ff = (P.flap || 0) * 0.8 - 9, hf = (P.hflap || 0) * 0.8 - 6;
  r.save();
  r.translate(5, -1);
  r.rotate(ff * DEG, 58, 37);
  glassWing(r, DE_FORE, [58, 37], DE_FORE_VEINS, [13, 25, 37, 47], { dim: 1, seed: 40, holes: P.holes });
  r.restore();
  r.save();
  r.translate(5, -1);
  r.rotate(hf * DEG, 56, 46);
  glassWing(r, DE_HIND, [56, 46], DE_HIND_VEINS, [12, 23, 34, 46], { dim: 1, seed: 50, holes: P.holes });
  r.restore();

  // near wings: mounted on top of the thorax, behind the body
  r.save();
  r.rotate((P.hflap || 0) * DEG, 56, 46);
  glassWing(r, DE_HIND, [56, 46], DE_HIND_VEINS, [12, 23, 34, 46], { seed: 20, k: P.glass ?? 1, holes: P.holes });
  eyeSpot(r, 23, 87, 3.4, (P.spots ?? 1) * 0.8);
  r.restore();
  r.save();
  r.rotate((P.flap || 0) * DEG, 58, 37);
  glassWing(r, DE_FORE, [58, 37], DE_FORE_VEINS, [13, 25, 37, 47], { seed: 10, k: P.glass ?? 1, holes: P.holes });
  eyeSpot(r, 27, 21, 6.2, P.spots ?? 1);
  r.restore();

  // far antenna and far leg
  const as = P.ant || 0;
  antenna(r, [[73, 36], [71 + as * 0.5, 27], [65 + as, 19], [58 + as, 15]], true);
  const lg = P.legs || 0;
  const farKnee = [60 + Math.sin(lg) * 1.5, 61], farFoot = [55 + Math.sin(lg + 1) * 2, 71];
  r.begin();
  r.seg(61, 52, ...farKnee, 0.9, 0.8, GILT, { max: 4, bias: -0.1 });
  r.seg(...farKnee, ...farFoot, 0.8, 0.6, GILT, { max: 4, bias: -0.1 });
  r.end(0.4);

  // the lantern abdomen: porcelain rings, then a gilt-caged glass bulb full of stolen dreams
  r.begin();
  r.ball(51, 53, 5.4, 4.6, PORCELAIN, { max: 7, bias: 0.02 });
  r.ball(47, 57, 4.6, 3.8, PORCELAIN, { max: 6, bias: -0.04 });
  r.end(0.55);
  const lant = [[40, 59], [50, 59], [53, 65], [51, 76], [44, 81], [37, 76], [35, 65]];
  const lin = inPoly(lant), fk = clamp(feed, 0.2, 1.8);
  const R = rng(P.seed || 5);
  const sw = [];
  for (let i = 0; i < 14; i++) sw.push([44 + Math.cos(i * 1.3 + (P.swirl || 0)) * (2 + i * 0.45), 69 + Math.sin(i * 1.3 + (P.swirl || 0)) * (1.6 + i * 0.4)]);
  r.begin();
  r.each(34, 58, 54, 82, (mx, my, X, Y) => {
    if (!lin(mx, my)) return;
    const d = Math.hypot(mx - 44, (my - 69) * 0.8) / 11;
    const ramp = d < 0.5 ? G_GOLD : G_ROSE;
    const idx = clamp(Math.floor((1 - d) * 3.2 + dith(X, Y) * 0.8 + (fk - 1) * 1.2), 0, 4);
    r.put(X, Y, ramp[idx], (0.35 + 0.35 * (1 - d)) * fk);
  });
  r.end(0.4);
  // the sleeper inside: a small curled dark figure
  if (!P.cracked) {
    r.ball(42, 66, 2.1, 2.1, NAVY, { idx: 2 });
    r.seg(43, 68, 46, 72, 2, 1.6, NAVY, { max: 2 });
    r.seg(46, 72, 42, 74, 1.4, 1.1, NAVY, { max: 2 });
  }
  for (const [x, y] of sw) if (R() < 0.55) r.dot(Math.round(x), Math.round(y), G_ROSE[R() < 0.4 ? 4 : 3], 0.8 * fk, true);
  // cage: gilt bars, a band, cap and finial
  for (const x of [39, 44, 49]) r.line(x, 60, x + (x - 44) * 0.2, 78 - Math.abs(x - 44) * 0.5, GILT[x === 44 ? 6 : 4], 0.15);
  r.line(36, 66, 52, 66, GILT[5], 0.15);
  r.begin();
  r.poly([[39, 57], [51, 57], [52, 60], [38, 60]], GILT, { n: [0, -0.6, 0.8], bevel: 1, max: 7 });
  r.poly([[42, 80], [46, 80], [44, 85]], GILT, { n: [0.2, 0.3, 0.9], max: 6 });
  r.end(0.45);
  r.dot(44, 86, G_ROSE[3], 0.6 * fk);
  if (P.cracked) {
    filigree(r, [[38, 64], [42, 69], [40, 74]], NAVY[0]);
    filigree(r, [[49, 62], [47, 67]], NAVY[0]);
    r.poly([[36, 70], [39, 72], [37, 77]], NAVY, { idx: 0 });
  }

  // thorax: navy lacquer under a porcelain dorsal plate, gilt segment lines
  r.begin();
  r.ball(61, 46, 11.5, 9, NAVY, { max: 7, bias: 0.06, spec: NAVY[7], specT: 0.97 });
  r.end(0.55);
  r.begin();
  r.poly([[51, 41], [58, 36], [67, 36], [72, 41], [69, 47], [56, 48]], PORCELAIN, { nf: dome(61, 40, 12, 9), bevel: 1, max: 8, spec: PORCELAIN[8], specT: 0.985 });
  r.end(0.5);
  filigree(r, [[55, 47], [59, 54]], GILT[4], 0.1);
  filigree(r, [[63, 48], [66, 54]], GILT[4], 0.1);
  filigree(r, [[54, 42], [61, 39], [68, 41]], GILT[6], 0.25);

  // near legs: three thin gilt legs dangling, hooked
  r.begin();
  for (const [hip, knee0, foot0, ph] of [[[56, 53], [52, 59], [48, 67], 0.5], [[62, 54], [64, 62], [61, 71], 1.5], [[67, 52], [74, 57], [77, 66], 2.5]]) {
    const knee = [knee0[0] + Math.sin(lg + ph) * 1.4, knee0[1]], foot = [foot0[0] + Math.sin(lg + ph + 1.2) * 2, foot0[1]];
    r.seg(...hip, ...knee, 1.1, 0.9, GILT, { max: 6, spec: GILT[7], specT: 0.95 });
    r.seg(...knee, ...foot, 0.9, 0.6, GILT, { max: 6 });
    r.dot(Math.round(foot[0]) + 1, Math.round(foot[1]) - 1, GILT[5]);
  }
  r.end(0.45);

  // collar: a ruff of gilt spines between thorax and head
  for (let i = 0; i < 6; i++) {
    const [x, y] = polar(70, 44, -110 + i * 36, 6.5);
    r.beam(70, 44, x, y, 1.4, 0.5, G_GOLD_DIM, { k: 0.3 });
  }
  r.begin();
  r.ball(70, 44, 4, 5, GILT, { max: 7, spec: GILT[7], specT: 0.95 });
  r.end(0.45);

  // head: a porcelain skull-mask with three gold eyes; the proboscis leaves its mouth
  r.save();
  r.translate(P.hx || 0, P.hy || 0);
  r.rotate(P.head || 0, 75, 45);
  antenna(r, [[76, 36], [79 - as * 0.4, 28], [80 - as, 20], [76 - as, 13]], false);
  r.begin();
  r.ball(77, 43, 7.5, 7, PORCELAIN, { max: 8, bias: 0.1, spec: PORCELAIN[8], specT: 0.97 });
  r.poly([[78, 46], [86, 45], [83, 50], [78, 51]], PORCELAIN, { n: [0.5, 0.2, 0.84], bevel: 1, max: 7 });
  r.end(0.55);
  r.line(73, 38, 79, 37, PORCELAIN[8]);
  // the face: a dark lacquer plate set with three gold eyes
  r.begin();
  r.poly([[79, 36.5], [84.5, 38.5], [86.5, 44], [84, 49.5], [79.5, 49], [77.5, 43]], NAVY, { nf: dome(82, 43, 6, 8), bevel: 1, max: 4, bias: -0.1 });
  r.end(0.4);
  for (const [x, y, w] of [[81.5, 40, 4.6], [84, 44, 3.8], [81, 47, 3.6]]) almondEye(r, x, y, w, 2.8, eyes, { lid: 0.5, iris: 0.95 });
  if (P.crack) filigree(r, [[72, 40], [75, 44], [74, 48]], VOID[2]);
  r.restore();

  // the proboscis: a ringed gilt tube, coiled at rest; uncoiled it ends in a flared funnel
  const path = proboscis([84, 49], P.plen ?? 34, coil, 4 + 72 * coil + (P.pa || 0));
  r.begin();
  for (let i = 0; i < path.length - 1; i++) {
    const t = i / path.length;
    r.seg(...path[i], ...path[i + 1], 1.7 - t * 0.7, 1.7 - (t + 0.04) * 0.7, GILT, { max: i % 3 === 2 ? 4 : 7, spec: GILT[7], specT: 0.95 });
  }
  r.end(0.5);
  const end = path[path.length - 1], pre = path[path.length - 3];
  if (P.funnel) {
    const a = Math.atan2(end[1] - pre[1], end[0] - pre[0]) / DEG, f = P.funnel;
    const p1 = polar(...end, a - 90, 1.2), p2 = polar(...polar(...end, a, 3 * f), a - 90, 2.4 * f + 1);
    const p3 = polar(...polar(...end, a, 3 * f), a + 90, 2.4 * f + 1), p4 = polar(...end, a + 90, 1.2);
    r.begin();
    r.poly([p1, p2, p3, p4], GILT, { n: [0.3, -0.3, 0.9], bevel: 1, max: 7 });
    r.end(0.45);
    const m = polar(...end, a, 3 * f);
    r.glow(m[0], m[1], 1.4 * f, 2.2 * f, G_ROSE, { k: 0.9 });
  }
  r.restore();

  // dream-light drawn back up the proboscis (drain)
  if (P.drain) {
    const ox = P.tx || 0, oy = (P.ty || 0) + (P.bob || 0);
    for (let i = 2; i < path.length; i += 3) {
      const [x, y] = path[i];
      spot(r, x + ox, y + oy - 2, i % 2 ? 2 : 1, i % 6 < 3 ? G_ROSE : G_GOLD, 0.9);
    }
    sparks(r, 77, 116, 52, 5, 6, G_ROSE);
  }
  if (P.gorge) motes(r, P.gorge, 26, 54, 34, 34, 12, G_ROSE, 0.8);
  if (P.shards) {
    for (const [x, y, c] of P.shards) {
      const pane = PANES[c];
      r.poly([[x, y], [x + 4, y - 1.5], [x + 3, y + 1.5], [x - 0.5, y + 1.5]], pane.ramp, { idx: 3, glow: pane.k * 0.7 });
      r.dot(x + 1, y - 1, NAVY[1]);
    }
  }
  if (P.sparks) for (const [seed, x, y, sp, n] of P.sparks) sparks(r, seed, x, y, sp, n, G_GOLD);
}

const DE_SHARDS = [[16, 92, 0], [26, 94, 2], [36, 93, 4], [72, 94, 3], [82, 92, 1], [92, 94, 2], [102, 93, 0]];

const DREAM_EATER = {
  w: 120, h: 96,   // room on the right for the uncoiled proboscis
  bevel: 3,
  draw: drawDreamEater,
  anims: {
    idle: { fps: 5, loop: true, poses: [
      { bob: 0, flap: 0, hflap: 0, legs: 0, ant: 0, swirl: 0, seed: 3 },
      { bob: -1, flap: -6, hflap: -3, legs: 0.8, ant: 1, swirl: 0.8, feed: 1.1, seed: 4, pa: 3 },
      { bob: -2, flap: -12, hflap: -6, legs: 1.6, ant: 2, swirl: 1.6, feed: 1.2, eyes: 0.85, seed: 5, pa: 5 },
      { bob: -1, flap: -6, hflap: -3, legs: 2.4, ant: 1, swirl: 2.4, feed: 1.1, seed: 6, pa: 3 },
    ] },
    attack: { fps: 9, loop: false, order: [0, 1, 1, 2, 2], poses: [
      { tx: -3, lean: -0.1, bob: -2, flap: 10, hflap: 6, coil: 0.55, eyes: 1.3, head: -0.08, ant: -2 },
      { tx: 3, lean: 0.06, bob: -1, flap: -10, hflap: -6, coil: 0, funnel: 1.2, eyes: 1.45, head: 0.05, ant: 2, plen: 32 },
      { tx: 2, lean: 0.04, bob: -1, flap: -4, hflap: -2, coil: 0.04, funnel: 1, eyes: 1.2, feed: 1.6, drain: 1, swirl: 1.2, plen: 32 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { tx: -5, lean: -0.15, flap: 16, hflap: 10, coil: 0.8, eyes: 0.35, crack: 1, head: -0.15, holes: 0.08, feed: 0.6, ant: -3,
        sparks: [[51, 40, 30, 10, 6]] },
    ] },
    break: { fps: 4, loop: true, poses: [
      { ty: 10, lean: 0.18, flap: -38, hflap: -22, coil: 0.3, pa: 40, plen: 26, eyes: 0.25, head: 0.25, hy: 2, holes: 0.42, glass: 0.6, spots: 0.3,
        feed: 0.35, cracked: 1, crack: 1, legs: 0.4, ant: 4, shards: DE_SHARDS },
      { ty: 10, lean: 0.18, flap: -39, hflap: -23, coil: 0.3, pa: 40, plen: 26, eyes: 0.6, head: 0.25, hy: 2, holes: 0.42, glass: 0.6, spots: 0.5,
        feed: 0.55, cracked: 1, crack: 1, legs: 0.6, ant: 4, shards: DE_SHARDS },
    ] },
    special: { fps: 6, loop: false, order: [0, 1, 0, 1], poses: [
      { bob: -2, flap: 12, hflap: 8, coil: 1, eyes: 1.3, feed: 1.6, spots: 1.3, glass: 1.3, gorge: 7, swirl: 2 },
      { bob: -3, flap: 16, hflap: 10, coil: 1, eyes: 1.45, feed: 1.9, spots: 1.5, glass: 1.45, gorge: 9, swirl: 3 },
    ] },
  },
  points: { center: [58, 50], muzzle: [114, 51], top: [60, 10], core: [44, 69] },
  icon: { x: 80, y: 46, scale: 0.85 },
};

// ---------------------------------------------------------------- CHOIR GUARDIAN (112x124)

// the bell it floats on: half-width at a given row (waist y 84 -> rim y 111)
const BELL = [[84, 12], [92, 15], [100, 18], [106, 21], [110, 23.5], [112, 23]];
function bellHalf(y) {
  for (let i = 0; i < BELL.length - 1; i++) {
    const [y0, h0] = BELL[i], [y1, h1] = BELL[i + 1];
    if (y <= y1) return h0 + ((h1 - h0) * (y - y0)) / (y1 - y0);
  }
  return BELL[BELL.length - 1][1];
}

// organ pipes behind the shoulders: [x, top]; the one at index `sing` voices (light rises from it)
const PIPES = [[20, 36], [25, 22], [30, 12], [35, 25], [73, 23], [78, 9], [83, 19], [88, 34]];

/** One organ pipe: a gilt tube with a dark open top, a voicing mouth that glows, light when it sings. */
function pipe(r, x, top, k, sing, smokeSeed) {
  r.begin();
  r.seg(x, top + 1, x, 56, 1.9, 1.9, GILT, { caps: 'flat', max: 7, spec: GILT[7], specT: 0.94, bias: 0.04 });
  r.end(0.55);
  r.rect(x - 2, top, 5, 1, GILT[6]);
  r.dot(x, top + 1, VOID[1]);
  // the mouth: an arched dark notch with a lit lip
  const my = top + 8;
  r.rect(x - 1, my, 3, 2, VOID[1]);
  r.dot(x, my - 1, VOID[1]);
  r.line(x - 1, my + 2, x + 1, my + 2, goldOf(k)[3], 0.55 * k);
  if (sing) {
    for (let j = 0; j < 5; j++) r.dot(x + ((j * 3) % 2), top - 2 - j * 2, G_GOLD[4 - Math.min(3, j)], 0.85 * (1 - j * 0.15), true);
    r.glow(x + 0.5, my + 1, 2.2, 2, G_GOLD, { k: 0.7, fx: true });
  }
  if (smokeSeed) smoke(r, smokeSeed, x + 1, top - 4, 3.2, 0.7);
}

/** The cradle shield: a gilt-rimmed navy disc with the twelve rays, the rings and WARDEN's eye. */
function cradleShield(r, cx, cy, rx, ry, k, phase, o = {}) {
  const g = goldOf(k);
  // edge thickness (the side we see) then the face
  r.begin();
  r.ball(cx - 2.2, cy + 0.6, rx, ry, GILT, { max: 4, bias: -0.1 });
  r.end(0.5);
  r.begin();
  r.ball(cx, cy, rx, ry, NAVY, { max: 6, bias: 0.04, flat: 0.5 });
  r.end(0.55);
  r.ring(cx, cy, rx - 2.4, rx, GILT, { ry: ry / rx, max: 7, spec: GILT[7], specT: 0.96, glow: 0.12 * k });
  r.ring(cx, cy, rx * 0.52 - 1, rx * 0.52, GILT, { ry: ry / rx, max: 6, glow: 0.3 * k });
  for (let i = 0; i < 12; i++) {
    if (o.cracked && (i === 2 || i === 7)) continue;
    const a = (i * 30 - 90) * DEG, on = (i + phase * 3) % 12 < 3;
    const x0 = cx + Math.cos(a) * rx * 0.58, y0 = cy + Math.sin(a) * ry * 0.58;
    const x1 = cx + Math.cos(a) * (rx - 3), y1 = cy + Math.sin(a) * (ry - 3);
    r.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), g[on ? 3 : 2], (on ? 0.8 : 0.4) * k);
  }
  almondEye(r, cx + 0.5, cy, rx * 0.72, ry * 0.36, k * 0.75, { iris: ry * 0.14 });
  if (o.cracked) filigree(r, [[cx - rx * 0.4, cy - ry * 0.9], [cx - 1, cy - ry * 0.3], [cx + 2, cy + ry * 0.2], [cx - 1, cy + ry * 0.8]], VOID[0]);
}

function drawGuardian(r, P) {
  const eye = P.eye ?? 1, pk = P.pod ?? 1, sk = P.shield ?? 1;
  const body = () => {
    r.translate(P.tx || 0, (P.ty || 0) + (P.bob || 0));
    r.rotate(P.lean || 0, 54, 96);
  };
  r.save();
  body();

  // organ pipes behind the shoulders
  PIPES.forEach(([x, top], i) => pipe(r, x, top, P.pipes ?? 0.8, P.sing === 'all' || P.sing === i, P.vent ? P.vent + i * 3 : 0));

  // far arm with the censer swinging on its chain
  r.begin();
  r.seg(34, 48, 28, 61, 4, 3, NAVY, { max: 5, bias: -0.02 });
  r.seg(28, 61, 26, 70, 2.4, 2, PORCELAIN, { max: 6, bias: -0.1 });
  r.ball(26, 71, 2.4, 2.2, PORCELAIN, { max: 6, bias: -0.1 });
  r.end(0.5);
  const cs = P.swing || 0, cxs = 24 + cs, cys = 90;
  for (let t = 0; t <= 1; t += 0.09) r.dot(Math.round(26 + (cxs - 26) * t), Math.round(71 + (cys - 4 - 71) * t), GILT[t * 10 % 2 < 1 ? 5 : 3]);
  r.begin();
  r.ball(cxs, cys, 4.2, 3.8, GILT, { max: 7, spec: GILT[7], specT: 0.95 });
  r.poly([[cxs - 2, cys - 4], [cxs + 2, cys - 4], [cxs + 1, cys - 6], [cxs - 1, cys - 6]], GILT, { max: 6 });
  r.end(0.5);
  const ck = P.censer ?? 1;
  for (const dx of [-2, 0, 2]) r.dot(Math.round(cxs + dx), cys, G_GOLD[3], 0.7 * ck);
  r.dot(Math.round(cxs), cys + 2, G_GOLD[2], 0.5 * ck);
  if (ck > 0.3) motes(r, 9 + Math.round(cs * 3), cxs - 3, cys - 14, 6, 9, 3, G_GOLD, 0.45);

  // the bell: navy lacquer, gilt ribs and bands, hovering on its own light
  r.begin();
  r.each(28, 83, 80, 113, (mx, my, X, Y) => {
    const hw = bellHalf(my), u = (mx - 54) / hw;
    if (my < 84 || my > 111 || Math.abs(u) > 1) return;
    const v = (my - 84) / 27;
    r.lightPut(X, Y, u * 0.88, -0.35 + v * 0.3, Math.sqrt(Math.max(0.05, 1 - u * u * 0.77)), NAVY, { max: 7, bias: 0.08 });
  });
  r.end(0.55);
  for (const u of [-0.5, 0.05, 0.55]) {
    const pts = [88, 96, 104, 109].map((y) => [54 + u * bellHalf(y), y]);
    filigree(r, pts, NAVY[u > 0.3 ? 2 : 6]);
  }
  r.line(Math.round(54 - bellHalf(98)) + 1, 98, Math.round(54 + bellHalf(98)) - 1, 98, GILT[5], 0.2);
  r.line(Math.round(54 - bellHalf(99)) + 1, 99, Math.round(54 + bellHalf(99)) - 1, 99, GILT[3]);
  r.begin();
  r.seg(54 - 23.5, 110.5, 54 + 23.5, 110.5, 1.8, 1.8, GILT, { max: 7, spec: GILT[7], specT: 0.95 });
  r.end(0.45);
  const uk = P.under ?? 1;
  if (uk > 0) {
    r.glow(54, 115, 18, 2.6, G_GOLD, { k: 0.55 * uk, fx: true, bias: -0.4 });
    for (const x of [40, 49, 59, 68]) for (let j = 0; j < 3; j++) r.dot(x + (j & 1), 114 + j * 2, G_GOLD[3 - j], 0.5 * uk * (1 - j * 0.25), true);
  }

  // far pauldron
  r.begin();
  r.poly([[28, 45], [40, 40], [47, 46], [43, 57], [32, 57], [26, 51]], PORCELAIN, { nf: dome(36, 46, 12, 10), bevel: 1, max: 6, bias: -0.14 });
  r.end(0.55);

  // cuirass: porcelain plates over navy, a gilt belt
  r.begin();
  r.poly([[36, 45], [54, 41], [72, 45], [74, 57], [70, 73], [64, 86], [44, 86], [38, 73], [34, 57]], PORCELAIN, { nf: dome(55, 58, 22, 30), bevel: 1, max: 7, bias: -0.05, spec: PORCELAIN[8], specT: 0.99 });
  r.end(0.6);
  r.line(38, 72, 46, 80, PORCELAIN[3]);
  r.line(70, 72, 62, 80, PORCELAIN[4]);
  r.begin();
  r.poly([[43, 81], [65, 81], [64, 87], [44, 87]], GILT, { n: [0, -0.3, 0.95], bevel: 1, max: 7 });
  r.end(0.45);
  r.rect(52, 82, 4, 4, G_GOLD[3], 0.5);

  // the Choir pod in its gothic alcove: frosted gold glass, a sleeper inside, a gilt cage over it
  const arch = [[45, 78], [45, 58], [47.5, 52], [54, 46.5], [60.5, 52], [63, 58], [63, 78]];
  r.begin();
  r.poly(arch, GILT, { n: [-0.2, -0.3, 0.93], bevel: 1, max: 7 });
  r.end(0.5);
  r.poly([[47, 77], [47, 58.5], [49, 54], [54, 49.5], [59, 54], [61, 58.5], [61, 77]], VOID, { idx: 1 });
  const pin = (mx, my) => Math.hypot((mx - 54) / 5.6, (my - 64) / 11.5) <= 1;
  r.each(47, 51, 61, 77, (mx, my, X, Y) => {
    if (!pin(mx, my)) return;
    const d = Math.hypot((mx - 54) / 5.6, (my - 64) / 11.5);
    const ramp = d < 0.55 ? G_DAWN : G_GOLD;
    const idx = clamp(Math.floor((1 - d) * 3 + dith(X, Y) * 0.7 + (pk - 1) * 1.4) + 1, 0, 4);
    r.put(X, Y, ramp[idx], (0.25 + 0.3 * (1 - d)) * pk);
  });
  // the sleeper: a small dark figure, knees drawn up
  r.ball(54, 58, 1.9, 1.9, NAVY, { idx: 2 });
  r.seg(54, 61, 54.5, 67, 1.9, 1.6, NAVY, { idx: 2 });
  r.seg(54.5, 67, 52.5, 71, 1.4, 1.1, NAVY, { idx: 2 });
  for (const x of [51, 57]) r.line(x, 54, x, 75, GILT[5]);
  for (const y of [60, 69]) r.line(49, y, 59, y, GILT[4]);

  // near upper arm (the hand is behind the shield)
  const sh = P.shieldAt || [0, 0];
  r.begin();
  r.seg(72, 50, 76 + sh[0] * 0.6, 63 + sh[1] * 0.6, 3.4, 3, NAVY, { max: 7, bias: 0.06 });
  if (P.dropShield) {
    r.seg(76, 63, 79, 76, 2.6, 2.2, PORCELAIN, { max: 7 });
    r.ball(80, 78, 2.6, 2.4, PORCELAIN, { max: 7 });
  }
  r.end(0.5);

  // near pauldron: layered porcelain plates with gilt trim
  r.begin();
  r.poly([[67, 52], [80, 53], [83, 59], [71, 60]], PORCELAIN, { nf: dome(75, 52, 10, 8), bevel: 1, max: 7, bias: -0.04 });
  r.end(0.5);
  r.begin();
  r.poly([[63, 41], [77, 42], [85, 49], [82, 56], [70, 55], [64, 50]], PORCELAIN, { nf: dome(73, 46, 14, 10), bevel: 1, max: 7, spec: PORCELAIN[8], specT: 0.985 });
  r.end(0.55);
  filigree(r, [[65, 49], [70, 54], [82, 55]], G_GOLD[3], 0.35);
  if (P.crack) filigree(r, [[74, 43], [72, 47], [75, 50]], VOID[2]);

  // the hood: a navy gothic mitre, gilt edges, a dark face with the vertical iris
  r.save();
  r.translate(P.hx || 0, P.hy || 0);
  r.rotate(P.head || 0, 55, 44);
  const hood = [[43, 47], [43, 29], [46, 19], [54, 6], [62, 17], [67, 28], [67, 46], [60, 49], [49, 49]];
  r.begin();
  r.poly(hood, NAVY, { nf: dome(55, 30, 14, 22), bevel: 1, max: 7, bias: 0.1 });
  r.end(0.6);
  filigree(r, [[43, 46], [43, 29], [46, 19], [54, 6], [62, 17], [67, 28], [67, 46]], GILT[6], 0.25);
  filigree(r, [[45, 30], [48, 20], [54, 10]], NAVY[6]);
  r.poly([[50, 44], [50, 28], [55.5, 19], [61, 28], [61.5, 44]], VOID, { idx: 0 });
  filigree(r, [[50, 44], [50, 28], [55.5, 19], [61, 28], [61.5, 44]], GILT[4], 0.2);
  almondEye(r, 56.5, 31, 4.6, 11, eye * 0.8, { vertical: true, iris: 1.9, lid: 0.5 });
  r.dot(55, 39, G_GOLD[2], 0.35 * eye);
  r.dot(57, 41, G_GOLD[2], 0.3 * eye);
  r.dot(54, 3, G_GOLD[4], 0.8);
  r.dot(54, 4, G_GOLD[3], 0.6);
  r.restore();

  // the cradle shield, held before the body
  if (!P.dropShield) cradleShield(r, 84 + sh[0], 77 + sh[1], 13, 18, sk, P.phase || 0);
  r.restore();

  if (P.dropShield) {
    // dropped on the floor, rim up, its light going out
    r.save();
    r.translate(94, 115);
    r.rotate(-0.12);
    r.translate(-94, -115);
    r.begin();
    r.ball(94, 116.4, 15, 5.4, GILT, { max: 4, bias: -0.1 });
    r.end(0.5);
    r.begin();
    r.ball(94, 114.6, 15, 5.4, NAVY, { max: 6, flat: 0.4 });
    r.end(0.5);
    r.ring(94, 114.6, 12.6, 15, GILT, { ry: 0.36, max: 6, glow: 0.1 * sk });
    r.ring(94, 114.6, 6.6, 7.8, GILT, { ry: 0.36, max: 5, glow: 0.2 * sk });
    almondEye(r, 94.5, 114.6, 9, 2.4, sk, { iris: 0.9, lid: 0.55 });
    filigree(r, [[86, 112], [91, 115], [96, 113], [101, 117]], VOID[0]);
    r.restore();
  }
  // cradle rings thrown over its allies (special)
  if (P.cradle) {
    const k = P.cradle, R0 = P.cradleR || 44;
    glowArc(r, 56, 76, R0, R0 * 1.08, -165, -15, G_GOLD, 0.85 * k, { thick: true });
    glowArc(r, 56, 76, R0 - 7, (R0 - 7) * 1.08, -150, -30, G_GOLD, 0.5 * k);
    glowArc(r, 56, 76, R0, R0 * 0.28, 0, 180, G_GOLD, 0.6 * k);
    for (let i = 0; i < 5; i++) {
      const [x, y] = polar(56, 76, -160 + i * 35, R0);
      spot(r, x, 76 + (y - 76) * 1.08, 2, G_GOLD, 0.9);
    }
  }
  // shield bash shockwave
  if (P.bash) {
    const [x, k] = P.bash;
    glowArc(r, x, 77, 6, 16, -70, 70, G_GOLD, k, { thick: true });
    glowArc(r, x + 3, 77, 6, 20, -60, 60, G_GOLD, k * 0.6);
    sparks(r, 61 + x, x + 2, 77, 8, 7, G_GOLD);
  }
  if (P.sparks) for (const [seed, x, y, sp, n] of P.sparks) sparks(r, seed, x, y, sp, n, G_GOLD);
  if (P.smoke) for (const [seed, x, y, rad] of P.smoke) smoke(r, seed, x, y, rad);
}

const CHOIR_GUARDIAN = {
  w: 112, h: 124,   // room on the right for the shield bash; pipes and mitre rise to the top
  bevel: 3,
  draw: drawGuardian,
  anims: {
    idle: { fps: 4, loop: true, poses: [
      { bob: 0, sing: 2, swing: -3, phase: 0, pod: 1, censer: 1 },
      { bob: -1, sing: 5, swing: -1, phase: 1, pod: 1.15, censer: 0.8, under: 0.85, shieldAt: [0, 1], head: 0.02 },
      { bob: -2, sing: 1, swing: 2, phase: 2, pod: 1.25, censer: 1, eye: 0.85, under: 0.75, shieldAt: [0, 2], head: 0.03 },
      { bob: -1, sing: 6, swing: 1, phase: 3, pod: 1.1, censer: 0.8, under: 0.85, shieldAt: [0, 1], head: 0.02 },
    ] },
    attack: { fps: 8, loop: false, order: [0, 1, 1, 2], poses: [
      { tx: -3, lean: -0.06, shieldAt: [-7, -3], sing: 'all', pipes: 1.2, eye: 1.3, shield: 1.2, phase: 0, swing: 3 },
      { tx: 5, lean: 0.07, shieldAt: [7, 0], sing: 'all', pipes: 1.3, eye: 1.45, shield: 1.4, phase: 2, swing: -3, bash: [98, 1] },
      { tx: 2, lean: 0.03, shieldAt: [3, 0], sing: 1, eye: 1.1, shield: 1.1, phase: 3, swing: -1, bash: [102, 0.5] },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { tx: -4, lean: -0.1, shieldAt: [-3, 3], eye: 0.35, pod: 0.5, shield: 0.6, pipes: 0.3, head: -0.12, crack: 1, swing: 4,
        sparks: [[71, 72, 46, 8, 6]] },
    ] },
    break: { fps: 4, loop: true, poses: [
      { ty: 7, lean: 0.12, head: 0.28, hy: 2, dropShield: 1, eye: 0.25, pod: 0.4, shield: 0.3, pipes: 0.2, under: 0, censer: 0.2, swing: 5, crack: 1, vent: 3 },
      { ty: 7, lean: 0.12, head: 0.28, hy: 2, dropShield: 1, eye: 0.6, pod: 0.55, shield: 0.45, pipes: 0.2, under: 0, censer: 0.3, swing: 5, crack: 1, vent: 6 },
    ] },
    special: { fps: 6, loop: false, order: [0, 1, 0, 1], poses: [
      { bob: -1, shieldAt: [2, -14], sing: 'all', pipes: 1.3, eye: 1.3, shield: 1.5, pod: 1.4, phase: 1, cradle: 0.8, cradleR: 40 },
      { bob: -2, shieldAt: [2, -15], sing: 'all', pipes: 1.4, eye: 1.45, shield: 1.6, pod: 1.6, phase: 2, cradle: 1.1, cradleR: 47 },
    ] },
  },
  points: { center: [54, 72], muzzle: [98, 77], top: [54, 4], core: [54, 64] },
  icon: { x: 56, y: 30, scale: 0.6 },
};

export default {
  warden_seraph: WARDEN_SERAPH,
  dream_eater: DREAM_EATER,
  choir_guardian: CHOIR_GUARDIAN,
};
