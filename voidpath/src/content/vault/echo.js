// vault: ECHO, HALCYON's grief given a body (browser, TECH_PLAN 7.6, 7.9). Painted with the POC
// enemy rig and the bestiary toolkit (prologue/enemyart.js). Faces RIGHT.
//
// HALCYON's hologram turned inside out: the same long-haired figure in a floor-length gown, but dark
// where she is light, the hair streaming up as if under water, the gown's hem coming apart into
// scanlines and loose pixels, a cracked magenta core, cyan rim light on the side toward the squad,
// and a broken halo of tiny glyphs behind the head (the twelve thousand names). Rows of the frame tear
// sideways with a chromatic fringe, differently every frame.
//
//   echo        200x240 battle art: idle 4 (hover, hair, halo turning, tears), attack 2 (a mirror
//               pane raised toward the squad, then flaring), cast 1 (arms up, the halo blazing), hurt 1,
//               break 2 (fallen to her knees, hair down, flickering), special 1 (Glitch Phase: only
//               scanlines left), charge 1 (the Severance: split in two, the core burning gold)
//   echo_field  the same figure at 0.42 scale (84x101) for the field boss over the Core

import { rng } from '../../art/painter.js';
import { rp, clamp, spot, sparks, polar, dome, G_CYAN, G_MAG, G_MAG_DIM } from '../prologue/enemyart.js';

// ---------------------------------------------------------------- colours

const VEIL = rp('#0a0620', '#140c36', '#1e144e', '#2a1c68', '#382682', '#4a329e', '#6044bc', '#7e5cd8');
const GHOST = rp('#12041a', '#22082e', '#360c44', '#4c125c', '#661a76', '#842690');
const MASK = rp('#0a0e22', '#141c38', '#1f2a50', '#2c3a6a', '#3c4e88', '#5266a8', '#7488cc');
const HAIR = rp('#06041a', '#0e0a30', '#18124a', '#241a66', '#322486', '#4430a8', '#5e44cc');
const G_CORE = rp('#5c1450', '#b02a8a', '#ff4fd0', '#ffb0ec', '#ffffff');
const G_GOLD = rp('#6f4a0f', '#b2801a', '#ffc84a', '#ffe9a6', '#fffbe8');
const G_EYE = rp('#1a5a70', '#4fe3ff', '#c8fbff', '#ffffff');
const GLASS = rp('#06182a', '#0a2a40', '#0f4563', '#176b8c', '#2596b4', '#4fc4dc', '#93e6f2', '#d2f8fc');
const CYAN_RIM = G_CYAN[3], CYAN_SOFT = G_CYAN[2], MAG_RIM = G_MAG_DIM[3];
const OPAQUE = 1, FX = 2, LIT = 8;   // the rig's pixel flags (enemies.js)

const W = 200, H = 240, CX = 108;
const noise = (x, y) => { const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return h - Math.floor(h); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- body plan

/** Joint positions for a pose: K kneels (break), arms picks the arm set. */
function joints(P) {
  const K = P.kneel || 0;
  const headX = CX + 4 + K * 12, headY = 46 + K * 50;
  const sh = 72 + K * 48, wy = 112 + K * 40;
  const near = [CX + 13 + K * 6, sh + 3], far = [CX - 11 + K * 6, sh + 3];
  const A = {
    rest: [[CX + 20, sh + 22], [CX + 27, sh + 40], [CX - 18, sh + 22], [CX - 24, sh + 38]],
    mirror: [[CX + 30, sh + 12], [CX + 46, sh + 6], [CX - 20, sh + 20], [CX - 28, sh + 34]],
    raise: [[CX + 24, sh - 14], [CX + 32, sh - 38], [CX - 22, sh - 12], [CX - 30, sh - 34]],
    wide: [[CX + 30, sh + 4], [CX + 52, sh - 4], [CX - 30, sh + 4], [CX - 52, sh - 2]],
    recoil: [[CX + 12, sh + 20], [CX + 4, sh + 30], [CX - 22, sh + 16], [CX - 34, sh + 22]],
    slump: [[CX + 28, sh + 22], [CX + 34, 206], [CX - 14, sh + 24], [CX - 22, 204]],
  }[P.arms || 'rest'];
  return { K, headX, headY, sh, wy, near, far, nEl: A[0], nHand: A[1], fEl: A[2], fHand: A[3] };
}

/** Fill a region pixel by pixel from a normal function; cyan rim on the squad side, magenta behind. */
function fill(r, x0, y0, x1, y1, normal, ramp, o = {}) {
  r.each(x0, y0, x1, y1, (mx, my, X, Y) => {
    const n = normal(mx, my, X, Y);
    if (!n) return;
    const e = n[3] ?? n[0];
    if (o.rim && e > o.rim) r.put(X, Y, e > o.rim + 0.04 ? CYAN_RIM : CYAN_SOFT, 0.8);
    else if (o.back && e < -o.back) r.put(X, Y, MAG_RIM, 0.45);
    else r.lightPut(X, Y, n[0], n[1], n[2], ramp, (Y % 3 === 0 && o.scan) ? o.scan : o);
  });
}

/** A strand of hair: a tapered chain along a quadratic curve, tip coming apart into pixels. */
function strand(r, a, c, b, r0, ramp, P, seed) {
  const n = 12;
  let prev = a;
  for (let k = 1; k <= n; k++) {
    const t = k / n, u = 1 - t;
    const p = [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
    const ra = r0 * (1 - (t - 1 / n) * 0.8), rb = r0 * (1 - t * 0.8);
    if (t < 0.88) r.seg(prev[0], prev[1], p[0], p[1], ra, rb, ramp, { max: ramp.length - 2, spec: ramp[ramp.length - 1], specT: 0.985, bounce: 0.3 });
    else spot(r, p[0], p[1], 1, k % 2 ? G_MAG : G_CYAN, 0.7);
    prev = p;
  }
  const R = rng(seed);
  for (let k = 0; k < 3; k++) {
    const x = b[0] + (R() - 0.5) * 10, y = b[1] + (R() - 0.5) * 10;
    r.rect(Math.round(x), Math.round(y), 1 + (R() < 0.3 ? 1 : 0), 1, R() < 0.5 ? G_MAG[2] : HAIR[5], 0.5, true);
  }
}

/**
 * Back hair: a mass of thick locks flowing back from the head and down past the waist, lifted as if
 * under water; three lighter locks float up behind the crown. Fallen (hairUp 0), it all hangs down.
 */
function hairBack(r, J, P, ramp) {
  const up = P.hairUp ?? 1, hp = P.hp || 0, len = P.hairLen || 1;
  const locks = [];
  for (let k = 0; k < 11; k++) {
    const t = k / 10;
    locks.push({
      root: [J.headX - 6 - t * 4, J.headY - 9 + t * 14],
      ang: up ? lerp(150, 112, t) + Math.sin(hp + k * 0.9) * 4 : lerp(98, 128, t),
      len: (up ? 70 + Math.sin(k * 2.3) * 12 + t * 16 : 52 + t * 18) * len,
      r0: 8 - Math.abs(t - 0.45) * 4.4, bend: up ? -16 : 8, k,
    });
  }
  if (up) {
    for (let k = 0; k < 3; k++) {
      locks.unshift({
        root: [J.headX - 4 + k * 3, J.headY - 11], ang: -150 - k * 14 + Math.sin(hp + k) * 6,
        len: (34 + k * 6) * len, r0: 4.6, bend: 18, k: 9 + k,
      });
    }
  }
  for (const L of locks) {
    const end = polar(L.root[0], L.root[1], L.ang, L.len);
    const mid = polar(L.root[0], L.root[1], L.ang + L.bend, L.len * 0.5);
    mid[0] += Math.sin(hp * 1.3 + L.k * 1.7) * 5;
    mid[1] += Math.cos(hp + L.k) * 4;
    strand(r, L.root, mid, end, L.r0, ramp, P, 31 + L.k * 7 + (P.frag || 0));
  }
}

/** The broken halo of glyphs behind the head. */
function halo(r, J, P) {
  const k = P.halo ?? 1, rot = P.rot || 0, R0 = 40 * (P.haloR || 1);
  const cx = J.headX, cy = J.headY + 2;
  const gaps = [[20, 46], [150, 168], [250, 262]];
  const inGap = (a) => gaps.some(([g0, g1]) => ((a - rot) % 360 + 360) % 360 >= g0 && ((a - rot) % 360 + 360) % 360 < g1);
  for (let a = 0; a < 360; a += 1.6) {
    if (inGap(a)) continue;
    const [x, y] = polar(cx, cy, a, R0);
    const mag = ((a - rot + 360) % 360) > 290;
    r.dot(Math.round(x), Math.round(y), mag ? G_MAG[1] : G_CYAN[1], 0.5 * k, true);
  }
  for (let a = 0; a < 360; a += 7.5) {
    if (inGap(a)) continue;
    const h = 2 + Math.round(noise(a, 3) * 3);
    const [x0, y0] = polar(cx, cy, a, R0 + 2), [x1, y1] = polar(cx, cy, a, R0 + 2 + h);
    const hot = noise(a, rot) < 0.18 * k;
    r.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), hot ? G_CYAN[4] : G_CYAN[2], (hot ? 0.9 : 0.45) * k, true);
  }
  for (let a = 0; a < 360; a += 3) {
    if (noise(a, 7) < 0.45) continue;
    const [x, y] = polar(cx, cy, a + rot * 0.6, R0 - 6);
    r.dot(Math.round(x), Math.round(y), G_MAG_DIM[2], 0.35 * k, true);
  }
}

/** The gown from waist to hem: flared, streaming back, the hem torn into strips and scanlines. */
function gown(r, J, P, ramp, ghost) {
  const hp = P.hp || 0, K = J.K;
  const wy = J.wy, hy = 214 - K * 2;
  const span = hy - wy;
  const edges = (y) => {
    const t = clamp((y - wy) / span, 0, 1);
    const L = CX - 9 - Math.pow(t, 1.15) * (54 + K * 22) - Math.sin(t * 3 + hp) * 5 * t;
    const R = CX + 9 + Math.pow(t, 1.35) * (40 + K * 18) + Math.sin(t * 2.6 + hp + 1) * 3 * t;
    return [L, R, t];
  };
  const hemAt = (x) => {
    const strip = Math.floor(x / 5);
    return hy - 2 - noise(strip, 5 + (P.frag || 0) % 3) * 13 - (x < CX - 30 ? 4 : 0);
  };
  const o = { rim: ghost ? null : 0.9, back: ghost ? null : 0.95, max: ramp.length - 2, gamma: 1.3, bounce: 0.3 };
  o.scan = { ...o, bias: 0.1, glow: ghost ? 0 : 0.45 };
  fill(r, CX - 90, wy, CX + 80, hy + 2, (mx, my, X, Y) => {
    const [L, R, t] = edges(my);
    if (mx < L || mx > R || my > hemAt(mx)) return null;
    // the hem dissolves: whole scanlines drop out, then single pixels
    const d = (my - (hy - 26)) / 26;
    if (d > 0 && (Y % 3 === 0 ? d > 0.15 : noise(X, Y) < d * 0.45)) return null;
    const u = ((mx - L) / (R - L)) * 2 - 1;
    const f = clamp(u + Math.sin(u * 7 + t * 2.4 + hp * 0.5) * 0.14 * t, -1, 1);
    return [f, -0.12 + t * 0.2, Math.sqrt(1 - f * f) + 0.05, u];
  }, ramp, o);
  if (ghost) return;
  // seams of light running down the gown, with pulses travelling toward the hem
  for (const [s, ph] of [[-0.5, 0], [0.08, 2.1], [0.56, 4.2]]) {
    for (let y = wy + 4; y < hy - 14; y++) {
      const [L, R] = edges(y);
      const x = Math.round(lerp(L, R, (s + 1) / 2) + Math.sin(y * 0.08 + ph) * 1.5);
      const pulse = ((y - wy) * 0.12 - hp * 2.2 + ph) % 6.283;
      const hot = pulse > 0 && pulse < 0.5;
      if (hot) r.dot(x, y, G_CYAN[3], 0.9, true);
      else if (y % 2 === 0) r.dot(x, y, VEIL[5], 0, true);
    }
  }
  // the loose pixels drifting off the hem
  const R = rng(17 + (P.frag || 0));
  for (let k = 0; k < 26; k++) {
    const x = lerp(CX - 70 - K * 20, CX + 50 + K * 18, R());
    const y = hy - 8 + R() * 24;
    const s = R() < 0.25 ? 2 : 1;
    const c = R();
    r.rect(Math.round(x), Math.round(y), s, s, c < 0.3 ? G_MAG[2] : c < 0.55 ? G_CYAN[2] : VEIL[6], c < 0.55 ? 0.6 : 0, true);
  }
}

/** Bodice, collar and the cracked core. */
function bodice(r, J, P, ramp, ghost) {
  const { sh, wy } = J, bx = CX + J.K * 8;
  const pts = [[bx - 14, sh], [bx - 4, sh - 3], [bx + 6, sh - 3], [bx + 16, sh], [bx + 14, sh + 14], [bx + 9, wy], [bx - 9, wy], [bx - 13, sh + 14]];
  r.begin();
  r.poly(pts, ramp, { nf: dome(bx + 1, sh + 16, 17, 26), max: ramp.length - 2, bevel: 1 });
  r.end(0.45);
  if (ghost) return;
  // rim light down the squad-side flank, collar of light
  r.line(bx + 15, sh + 1, bx + 13, sh + 14, CYAN_RIM, 0.8);
  r.line(bx + 13, sh + 15, bx + 9, wy - 1, CYAN_SOFT, 0.6);
  r.line(bx - 4, sh - 2, bx + 6, sh - 2, G_CYAN[3], 0.7);
  r.line(bx - 9, wy - 2, bx + 9, wy - 2, G_MAG_DIM[3], 0.5);
  // the core: cracked, pulsing (gold during the Severance)
  const ck = P.core ?? 1;
  const g = P.gold ? G_GOLD : G_CORE;
  const cx = bx + 1, cy = sh + 16;
  r.glow(cx, cy, 4 + ck * 2.5, 4 + ck * 2.5, g, { k: 0.4 + ck * 0.6, bias: ck > 1 ? 0.3 : 0, fx: true });
  const R = rng(9);
  for (let k = 0; k < 5; k++) {
    const a = k * 72 + R() * 30;
    const [x1, y1] = polar(cx, cy, a, 6 + R() * 6 + ck * 2);
    r.line(Math.round(cx), Math.round(cy), Math.round(x1), Math.round(y1), k % 2 ? g[3] : g[2], 0.9, true);
  }
  spot(r, cx, cy, 3, g, 1.2 * ck);
}

/** Neck, head, hair cap, face and the broken circlet. */
function headPart(r, J, P, ramp, hair, ghost) {
  const { headX: hx, headY: hy, sh } = J;
  r.seg(hx - 1, hy + 12, CX + 1 + J.K * 8, sh + 1, 3.2, 4, ramp, { max: ramp.length - 3 });
  r.begin();
  r.ball(hx, hy, 12, 14, ramp, { max: ramp.length - 2, spec: ramp[ramp.length - 1], specT: 0.985 });
  // hair cap: over the crown and the back of the head, the face (toward the squad) left clear
  r.ball(hx - 3, hy - 3, 14, 13.5, hair, { clip: (mx, my) => !(mx > hx + 1 - (my - hy) * 0.3 && my > hy - 5), max: hair.length - 2, spec: hair[hair.length - 1], specT: 0.98 });
  // bangs swept across the brow
  r.poly([[hx - 4, hy - 14], [hx + 9, hy - 12], [hx + 13, hy - 5], [hx + 8, hy - 6], [hx + 2, hy - 4], [hx - 2, hy - 6]], hair, { n: [0.1, -0.6, 0.8], max: hair.length - 2, bevel: 1 });
  r.end(0.5);
  if (!ghost) {
    // cyan rim along the profile toward the squad
    for (let y = hy - 4; y < hy + 12; y++) {
      const w = 12 * Math.sqrt(Math.max(0, 1 - ((y - hy) / 14) ** 2));
      r.dot(Math.round(hx + w - 1), y, y < hy + 6 ? CYAN_RIM : CYAN_SOFT, 0.7);
    }
  }
  // front locks falling over the near shoulder
  r.seg(hx + 6, hy - 7, hx + 12, hy + 6, 3.2, 2.6, hair, { max: hair.length - 2 });
  r.seg(hx + 12, hy + 6, hx + 11 + (P.lock || 0), sh + 20, 2.6, 1.2, hair, { max: hair.length - 2 });
  if (ghost) return;
  // eyes: two pale slits, the only light in the face, and the magenta streaks under them
  const ek = P.eyes ?? 1;
  const eyeY = Math.round(hy + 1);
  r.line(hx + 5, eyeY, hx + 8, eyeY, G_EYE[2], 1.1 * ek, true);
  r.line(hx + 11, eyeY, hx + 12, eyeY, G_EYE[2], 1.0 * ek, true);
  r.dot(hx + 7, eyeY, G_EYE[3], 1.3 * ek, true);
  for (let y = 1; y < 4 + Math.round(ek * 4); y++) {
    if (y % 2) r.dot(hx + 6, eyeY + y + 1, G_MAG[2], 0.7, true);
    if (y % 3 === 1) r.dot(hx + 12, eyeY + y + 1, G_MAG[1], 0.5, true);
  }
  // the circlet, broken in two
  for (let x = hx - 9; x <= hx + 12; x++) {
    if (x > hx - 1 && x < hx + 3) continue;
    const y = Math.round(hy - 7 + ((x - hx) * (x - hx)) / 90);
    r.dot(x, y, x < hx ? G_MAG[2] : G_CYAN[3], 0.8, true);
  }
}

/** An arm: upper and forearm in the gown's stuff, a long sleeve hanging from the elbow, a hand. */
function arm(r, sh, el, hand, ramp, P, ghost, near) {
  r.begin();
  r.seg(sh[0], sh[1], el[0], el[1], 5, 4, ramp, { max: ramp.length - 2 });
  r.seg(el[0], el[1], hand[0], hand[1], 3.8, 2.8, ramp, { max: ramp.length - 2 });
  // a long sleeve hangs from the forearm and frays into scanlines at its tip
  const m = [lerp(el[0], hand[0], 0.8), lerp(el[1], hand[1], 0.8)];
  const drop = 30 + (P.hp ? Math.sin(P.hp + (near ? 1 : 0)) * 4 : 0);
  const sway = near ? -4 : -7;
  r.poly([[el[0] - 2, el[1] - 3], [m[0] + 3, m[1] - 2], [m[0] + sway + 2, m[1] + drop], [lerp(el[0], m[0], 0.4) + sway, m[1] + drop + 5], [el[0] + sway - 4, el[1] + drop * 0.7]], ramp, {
    nf: dome(lerp(el[0], m[0], 0.5), (el[1] + m[1]) / 2 + drop * 0.4, 12, drop * 0.7), max: ramp.length - 2, bias: near ? 0.02 : -0.08,
    clip: (mx, my) => my < m[1] + drop - 10 || Math.floor(my) % 3 !== 0,
  });
  r.ball(hand[0], hand[1], 3, 3.2, MASK, { max: 5 });
  r.end(0.5);
  if (ghost) return;
  if (near) r.line(Math.round(el[0] + 3), Math.round(el[1] - 2), Math.round(hand[0] + 2), Math.round(hand[1] - 2), CYAN_SOFT, 0.6);
  // threads of light trailing from the fingers
  for (let k = -1; k <= 1; k++) {
    const [x, y] = polar(hand[0], hand[1], 90 + k * 22 + (near ? -10 : 10), 7 + Math.abs(k) * 2);
    r.line(Math.round(hand[0]), Math.round(hand[1] + 2), Math.round(x), Math.round(y), G_CYAN[1], 0.5, true);
    r.dot(Math.round(x), Math.round(y), k ? G_CYAN[3] : G_MAG[3], 0.8, true);
  }
}

/** The mirror pane she raises toward the squad: a tall hexagon of glass, the attacker's light in it. */
function pane(r, x, y, k) {
  const pts = [[x - 7, y - 20], [x + 5, y - 22], [x + 11, y - 2], [x + 6, y + 20], [x - 6, y + 22], [x - 11, y + 2]];
  r.poly(pts, GLASS, { n: [-0.45, -0.3, 0.84], bevel: 1, max: 6, glow: 0.25 + k * 0.3 });
  r.line(x - 4, y - 16, x + 4, y + 14, GLASS[7], 0.9, true);
  r.line(x - 1, y - 18, x + 6, y + 6, GLASS[6], 0.6, true);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    r.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), i < 3 ? G_CYAN[4] : G_MAG[2], 0.9, true);
  }
  if (k > 1) {
    r.glow(x + 2, y, 16, 26, G_CYAN, { fx: true, k: 0.8, bias: 0.1 });
    sparks(r, 23, x + 8, y, 16, 12, G_CYAN);
  }
}

// ---------------------------------------------------------------- frame

function figure(r, P, ghost) {
  const J = joints(P);
  const veil = ghost ? GHOST : VEIL, mask = ghost ? GHOST : MASK, hair = ghost ? GHOST : HAIR;
  if (!ghost && (P.halo ?? 1) > 0) halo(r, J, P);
  hairBack(r, J, P, hair);
  arm(r, J.far, J.fEl, J.fHand, veil, P, ghost, false);
  gown(r, J, P, veil, ghost);
  bodice(r, J, P, veil, ghost);
  headPart(r, J, P, mask, hair, ghost);
  arm(r, J.near, J.nEl, J.nHand, veil, P, ghost, true);
  if (ghost) return;
  if (P.pane) pane(r, J.nHand[0] + 14, J.nHand[1] + 2, P.pane);
  if (P.raise) {
    // names streaming up between her hands
    const R = rng(41 + (P.frag || 0));
    for (let k = 0; k < 70; k++) {
      const col = Math.floor(R() * 5), x = lerp(J.fHand[0], J.nHand[0], col / 4) + (R() - 0.5) * 3, y = J.nHand[1] - 4 - R() * (24 + col * 3);
      r.rect(Math.round(x), Math.round(y), 1, 1 + (R() < 0.4 ? 1 : 0), R() < 0.3 ? G_MAG[3] : G_CYAN[3], 0.9, true);
    }
    for (const [x, y] of [J.fHand, J.nHand]) r.glow(x, y - 2, 7, 7, G_CYAN, { fx: true, k: 0.9, bias: 0.2 });
  }
  if (P.gold) {
    sparks(r, 61 + (P.frag || 0), CX + 1, J.sh + 16, 30, 16, G_GOLD);
    for (let k = 0; k < 12; k++) {
      const [x, y] = polar(CX + 1, J.sh + 16, k * 30 + 8, 14 + (k % 3) * 6);
      r.line(CX + 1, J.sh + 16, Math.round(x), Math.round(y), G_GOLD[k % 2 ? 2 : 3], 0.9, true);
    }
  }
}

/** Shift a screen row sideways, the leading edge of each run fringed in `fringe`. */
function shiftRow(r, Y, dx, fringe) {
  const w = r.w, row = Y * w;
  const rgb = r.rgb.slice(row * 3, row * 3 + w * 3), glw = r.glw.slice(row * 3, row * 3 + w * 3), flg = r.flg.slice(row, row + w);
  for (let X = 0; X < w; X++) {
    const s = X - dx, i = row + X, j = i * 3;
    if (s < 0 || s >= w) { r.flg[i] = 0; continue; }
    r.flg[i] = flg[s];
    for (let c = 0; c < 3; c++) { r.rgb[j + c] = rgb[s * 3 + c]; r.glw[j + c] = glw[s * 3 + c]; }
  }
  const step = dx > 0 ? -1 : 1;
  for (let X = 0; X < w; X++) {
    const i = row + X, n = X + step;
    if (!(r.flg[i] & OPAQUE) || (n >= 0 && n < w && r.flg[row + n] & OPAQUE)) continue;
    const j = i * 3;
    for (let c = 0; c < 3; c++) { r.rgb[j + c] = fringe[c]; r.glw[j + c] = fringe[c] * 0.8; }
    r.flg[i] |= LIT;
  }
}

/** Tear `n` bands of rows sideways by up to `max` px (seeded, so each frame tears differently). */
function tear(r, seed, n, max, y0 = 16, y1 = 222) {
  const R = rng(seed);
  for (let k = 0; k < n; k++) {
    const y = Math.floor(lerp(y0, y1, R())), h = 1 + Math.floor(R() * 4);
    const dx = (R() < 0.5 ? -1 : 1) * (1 + Math.ceil(R() * max));
    for (let Y = y; Y < y + h && Y < r.h; Y++) shiftRow(r, Y, dx, k % 2 ? G_CYAN[3] : G_MAG[2]);
  }
}

/** Glitch Phase: only every third scanline survives, each a thin emissive ghost line (no outline). */
function dissolve(r) {
  const { w, h } = r;
  for (let Y = 0; Y < h; Y++) {
    for (let X = 0; X < w; X++) {
      const i = Y * w + X;
      if (!(r.flg[i] & OPAQUE)) continue;
      if (Y % 3 !== 0 && !(r.flg[i] & LIT && Y % 3 === 1)) { r.flg[i] = 0; continue; }
      const j = i * 3;
      const l = r.rgb[j] * 0.3 + r.rgb[j + 1] * 0.5 + r.rgb[j + 2] * 0.2;
      const c = l > 120 ? G_CYAN[4] : l > 40 ? G_CYAN[2] : G_CYAN[0];
      for (let k = 0; k < 3; k++) { r.rgb[j + k] = c[k]; r.glw[j + k] = c[k] * 0.6; }
      r.flg[i] = OPAQUE | FX | LIT;
    }
  }
}

function drawEcho(r, P) {
  r.save();
  r.translate(P.dx || 0, P.bob || 0);
  if (P.lean) r.rotate(P.lean, CX, 214);
  if (P.ghost) {
    r.save();
    r.translate(-P.ghost, 3);
    figure(r, { ...P, halo: 0 }, true);
    r.restore();
  }
  figure(r, P, false);
  r.restore();
  if (P.tear) tear(r, P.tear, P.tearN ?? 5, P.tearMax ?? 4, 16 * r.sc, 222 * r.sc);
  if (P.phase) dissolve(r);
}

const IDLE = [
  { bob: 0, hp: 0, rot: 0, core: 1, frag: 0, tear: 3, tearN: 3, lock: 0 },
  { bob: -2, hp: 1.6, rot: 9, core: 1.25, frag: 1, tear: 5, tearN: 2, lock: 1 },
  { bob: -4, hp: 3.2, rot: 18, core: 1, frag: 2, tear: 7, tearN: 4, lock: 2 },
  { bob: -2, hp: 4.8, rot: 27, core: 0.8, frag: 3, tear: 11, tearN: 2, lock: 1 },
];

export const ECHO = {
  w: W, h: H,
  bevel: 3,
  draw: drawEcho,
  anims: {
    idle: { fps: 4, loop: true, poses: IDLE },
    attack: { fps: 6, loop: false, order: [0, 0, 1, 1, 1], poses: [
      { bob: -3, hp: 1, rot: 12, arms: 'mirror', pane: 1, core: 1.2, frag: 4, tear: 13, tearN: 3, eyes: 1.3 },
      { bob: -3, hp: 1.4, rot: 14, arms: 'mirror', pane: 2, core: 1.4, frag: 5, tear: 17, tearN: 6, tearMax: 6, eyes: 1.4, lean: 0.04 },
    ] },
    cast: { fps: 5, loop: false, poses: [
      { bob: -6, hp: 2.5, rot: 30, arms: 'raise', raise: 1, halo: 1.6, haloR: 1.15, core: 1.5, frag: 6, hairLen: 1.12, tear: 19, tearN: 5, eyes: 1.4 },
    ] },
    hurt: { fps: 6, loop: false, poses: [
      { bob: 2, dx: -6, hp: 3, rot: 4, arms: 'recoil', lean: -0.1, core: 0.4, eyes: 0.4, halo: 0.6, frag: 7, tear: 23, tearN: 9, tearMax: 7 },
    ] },
    break: { fps: 3, loop: true, poses: [
      { kneel: 0.8, arms: 'slump', hairUp: 0, halo: 0.25, haloR: 0.9, rot: 40, core: 0.35, eyes: 0.3, frag: 8, tear: 29, tearN: 3 },
      { kneel: 0.8, arms: 'slump', hairUp: 0, halo: 0.45, haloR: 0.9, rot: 44, core: 0.6, eyes: 0.55, frag: 9, tear: 31, tearN: 7, tearMax: 6, hp: 1 },
    ] },
    special: { fps: 5, loop: false, poses: [
      { bob: -4, hp: 2, rot: 20, arms: 'wide', core: 1.2, halo: 0.8, frag: 10, tear: 37, tearN: 10, tearMax: 9, phase: 1 },
    ] },
    charge: { fps: 4, loop: true, poses: [
      { bob: -5, hp: 4, rot: 33, arms: 'wide', ghost: 16, gold: 1, core: 1.6, halo: 1.3, haloR: 1.08, hairLen: 1.1, frag: 11, tear: 41, tearN: 6, tearMax: 5, eyes: 1.4 },
    ] },
  },
  points: { center: [104, 132], muzzle: [158, 92], top: [112, 8], core: [109, 92] },
  icon: { x: 112, y: 50, scale: 0.36 },
  fitBox: [80, 22, 64, 92],
};

// ---------------------------------------------------------------- the field art

const FS = 0.42;
const field = (P) => ({ ...P, tearMax: Math.min(2, P.tearMax ?? 2), tearN: Math.min(2, P.tearN ?? 2) });

export const ECHO_FIELD = {
  w: 84, h: 101,
  bevel: 2,
  draw(r, P) {
    r.scale(FS);
    drawEcho(r, P);
  },
  anims: {
    idle: { fps: 4, loop: true, poses: IDLE.map(field) },
    attack: { fps: 5, loop: false, poses: [field(ECHO.anims.attack.poses[1])] },
    hurt: { fps: 5, loop: false, poses: [field(ECHO.anims.hurt.poses[0])] },
    break: { fps: 3, loop: true, poses: [field(ECHO.anims.break.poses[0])] },
    special: { fps: 5, loop: false, poses: [ECHO.anims.special.poses[0]] },
  },
  points: { center: [44, 56], muzzle: [66, 40], top: [47, 4], core: [46, 39] },
  icon: { x: 47, y: 21, scale: 0.86 },
};
