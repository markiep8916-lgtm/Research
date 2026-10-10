// warden: WARDEN's battle art (browser, TECH_PLAN 7.6, 7.9). Painted with the POC enemy rig and the
// bestiary toolkit (prologue/enemyart.js), in the Heart's language (heart/enemyart.js): gold leaf and
// light over navy lacquer, porcelain only where the light falls, WARDEN's sigil (the almond eye, the
// twelve rays, the two cradle rings) as its face. Faces RIGHT (toward the squad).
//
//   warden_lock     THE MERCIFUL LOCK, 256x256: an immense angelic construct. A gothic hood with the
//                   almond eye looking toward the squad, a crown of spires, a halo of twelve rays and two
//                   cradle rings behind it; six geometric wings (blade feathers of navy lacquer, gilt
//                   rims, a vein of gold light), a reliquary column for a body, two long cradle-arms that
//                   meet below it round a sleeping pod of light, and a chandelier of hanging lancets
//                   ending in plumb lights. Every edge of the silhouette is broken: rays, spires, feather
//                   tips, fingers, lancets.
//                   idle 4 (the whole figure rises and settles, wings breathe, rays brighten in turn like
//                   the sigil, the cradle rocks, lancets sway), attack 2 (the hymn: wings flare, rings
//                   blaze, the eye sings rings of light), cast 1 (the Cradle: arms reach out toward the
//                   squad), special 1 (the Last Lullaby: wings raised, the eye white-hot), hurt 1, break 2
//                   (wings fall, the rings crack open, the eye half shut).
//   warden_unbound  LULLABY UNBOUND, 256x256: the same body merged with the Choir's light. The wings
//                   torn into floating blades, a gyroscope of tilted rings, the cradle broken open and
//                   the arms flung wide, the hood split to show a white-gold core, the body's lacquer
//                   full of stars (the twelve thousand pods), and streams of choir light pouring in.
//                   Same anims; `special` is the Requiem gathering.
//   warden_field    the Merciful Lock at 0.5 scale (128x128) for the crown map and the resolution:
//                   idle 4, special (folded down to HALCYON's size), break.
//
// fitBox frames the halo's top down to the chest (the core), so the wings and the robe's hem may bleed
// off the frame on phones without shrinking the squad; the data puts the construct a little forward
// (stage.slot), so the eye sits inside the battle focus band (TECH_PLAN 7.4, G2 bar rule 20).

import { rng } from '../../art/painter.js';
import { rp, WHITE, DEG, clamp, polar, dome, spot, sparks } from '../prologue/enemyart.js';

// ---------------------------------------------------------------- colours

// navy lacquer (dark -> light, with a blue sheen at the top), gold leaf, porcelain where light falls
const NAVY = rp('#03040b', '#070a18', '#0c1229', '#121b3b', '#1a264f', '#233366', '#30447f', '#46609e', '#6a86c0');
const GILT = rp('#1c1204', '#352409', '#5a3e0f', '#856017', '#b58723', '#dcae3a', '#f6d46a', '#fff3c4');
// the unbound body: lacquer gone clear as night sky, indigo with a violet sheen (stars painted in)
const COSMOS = rp('#04031a', '#080627', '#0e0b3a', '#15114e', '#1d1764', '#271f7a', '#332a90', '#4236a6', '#5a4cc0');
const PORCELAIN = rp('#1b1d38', '#2c2d50', '#454463', '#625e7d', '#878096', '#ada3b1', '#cfc4c4', '#e6dbcf', '#f7eedf');
// glow ramps, outer (dim) -> inner (hot)
const G_GOLD = rp('#5a3608', '#a86c14', '#f0a830', '#ffd978', '#fff8e0');
const G_GOLD_DIM = rp('#211405', '#352108', '#4c300b', '#62400f', '#7a5317');
const G_DAWN = rp('#2a3c66', '#5d79b4', '#a9c4f0', '#e2eeff', '#ffffff');
const G_STAR = rp('#3a4a80', '#8090d0', '#d8e2ff', '#ffffff');
const VOID = rp('#020308', '#05060f', '#0a0c1a');

const W = 256, H = 256, CX = 126, CY = 104;
const lerp = (a, b, t) => a + (b - a) * t;
const noise = (x, y) => { const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return h - Math.floor(h); };

// ---------------------------------------------------------------- small helpers

/** Glowing elliptical arc of dots (degrees a0..a1): rings of light, sound waves. */
function arc(r, cx, cy, rx, ry, a0, a1, ramp, k = 0.8, step = 1.4) {
  const n = Math.max(8, Math.ceil((Math.abs(a1 - a0) * DEG * Math.max(rx, ry)) / step));
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * DEG;
    const edge = i < n * 0.1 || i > n * 0.9;
    r.dot(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), ramp[edge ? 1 : ramp.length - 2], k * (edge ? 0.6 : 1), true);
  }
}

/** Falling gold motes (choir dust). */
function motes(r, seed, x0, y0, w, h, n, ramp = G_GOLD, k = 0.7) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + R() * w), y = Math.round(y0 + R() * h);
    r.dot(x, y, ramp[R() < 0.3 ? ramp.length - 1 : ramp.length - 2], k, true);
    if (R() < 0.35) r.dot(x, y + 1, ramp[1], k * 0.6, true);
  }
}

// The box (model space, before the 0.9 fit) every tip must stay inside in any pose: the frame's edges
// stay clear, so the silhouette is never cut straight by the frame.
const SAFE = { x0: 2, x1: 254, y0: 4, y1: 239 };

/** Length along `ang` from `root` that keeps the end inside SAFE (at most `len`). */
function fitLen(root, ang, len) {
  const dx = Math.cos(ang * DEG), dy = Math.sin(ang * DEG);
  let t = len;
  if (dx < -1e-6) t = Math.min(t, (SAFE.x0 - root[0]) / dx);
  if (dx > 1e-6) t = Math.min(t, (SAFE.x1 - root[0]) / dx);
  if (dy < -1e-6) t = Math.min(t, (SAFE.y0 - root[1]) / dy);
  if (dy > 1e-6) t = Math.min(t, (SAFE.y1 - root[1]) / dy);
  return Math.max(4, t);
}

const inside = (x, y) => x >= SAFE.x0 && x <= SAFE.x1 && y >= SAFE.y0 && y <= SAFE.y1;

/** A leaf-shaped blade from `root` along `ang` (degrees): lacquer body, gilt leading rim, gold vein. */
function blade(r, root, ang, len0, w, o = {}) {
  const [dx, dy] = [Math.cos(ang * DEG), Math.sin(ang * DEG)];
  const [px, py] = [-dy, dx];
  const bend = o.bend ?? 0.25;
  let len = fitLen(root, ang, len0), pts;
  const at = (t, s) => [root[0] + dx * len * t + px * w * s, root[1] + dy * len * t + py * w * s];
  // shorten until the whole leaf (not just its tip) stays inside SAFE
  for (;;) {
    pts = [at(0, 0.32), at(0.3, 0.92 + bend * 0.2), at(0.62, 0.78 + bend), at(1, 0), at(0.7, -0.42), at(0.32, -0.62), at(0, -0.32)];
    if (len <= 6 || pts.every(([x, y]) => inside(x, y))) break;
    len -= 2;
  }
  const ramp = o.ramp || NAVY;
  r.poly(pts, ramp, {
    nf: (mx, my) => {
      const s = clamp(((mx - root[0]) * px + (my - root[1]) * py) / w, -1, 1);
      return [px * s * 0.7, py * s * 0.7 - 0.2, Math.sqrt(1 - s * s * 0.49)];
    },
    max: ramp.length - (o.dim ? 3 : 1), bias: o.bias ?? 0, bevel: 1,
  });
  if (o.rim !== false) {
    // gilt along the leading edge, catching the light
    const rim = o.rimRamp || GILT;
    for (let k = 0; k < 3; k++) {
      const a = at(k / 3, [0.32, 0.92 + bend * 0.2, 0.78 + bend][k]), b = at((k + 1) / 3 + (k === 2 ? 0 : 0), [0.92 + bend * 0.2, 0.78 + bend, 0][k]);
      r.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), rim[Math.min(rim.length - 1, o.dim ? 4 : 6)], o.dim ? 0 : 0.25);
    }
  }
  if (o.vein) {
    // the vein of light from the root toward the tip, brightest near the root
    const n = Math.round(len * 0.78);
    for (let i = 2; i < n; i++) {
      const t = i / len;
      const [x, y] = at(t, 0.08);
      const c = i < n * 0.4 ? o.vein[3] : i < n * 0.75 ? o.vein[2] : o.vein[1];
      r.dot(Math.round(x), Math.round(y), c, (o.veinK ?? 0.8) * (1 - t * 0.6), true);
    }
    const [tx, ty] = at(1, 0);
    if (o.tip) spot(r, tx, ty, 2, o.vein, o.veinK ?? 0.8);
  }
}

/** A vesica / gothic-arch outline point test: pointed top, round bottom. */
function hoodInside(mx, my, cx, cy, hw, top, bot) {
  if (my < top || my > bot) return false;
  if (my < cy) {
    // pointed (gothic) arch: two arcs centred `d` either side of the axis, meeting at the apex
    const h = cy - top, d = (h * h - hw * hw) / (2 * hw), R = hw + d;
    return Math.abs(mx - cx) <= Math.sqrt(Math.max(0, R * R - (cy - my) ** 2)) - d;
  }
  const t = (my - cy) / (bot - cy);
  return Math.abs(mx - cx) <= hw * Math.sqrt(Math.max(0, 1 - t * t * t));
}

// ---------------------------------------------------------------- body parts

/** The halo: twelve tapered rays round the eye (brightness turning like the sigil) and the two cradle rings. */
function halo(r, P, F) {
  const rot = P.rot || 0, dim = P.broken ? 0.4 : 1, blaze = P.blaze || 0, fold = P.fold || 0;
  for (let k = 0; k < 12; k++) {
    const a = -90 + k * 30 + (F.unbound ? 8 : 0);
    const down = Math.sin(a * DEG) > 0.55;
    if (down) continue;
    const on = ((k + rot) % 12) < 3;
    const long = k % 2 === 0;
    const L = ((long ? 66 : 50) + noise(k, 3) * 14 + (on ? 4 : 0) + blaze * 8 - (P.broken ? 14 : 0)) * (1 - fold * 0.7);
    const r0 = 44, wd = long ? 4.2 : 3;
    const Lc = fitLen([CX, CY], a, r0 + L) - r0;
    const [bx, by] = polar(CX, CY, a, r0);
    const [tx, ty] = polar(CX, CY, a, r0 + Lc);
    const [nx, ny] = [Math.cos((a + 90) * DEG), Math.sin((a + 90) * DEG)];
    if (P.broken && k % 3 === 1) continue;   // the rays crack away when it is Broken
    r.poly([[bx + nx * wd, by + ny * wd], [tx, ty], [bx - nx * wd, by - ny * wd]], GILT, { n: [nx * 0.5, ny * 0.5 - 0.2, 0.8], max: 7, bevel: 1, bias: on ? 0.12 : -0.05 });
    // a spine of light along each ray
    const g = on || blaze > 0.5 ? G_GOLD : G_GOLD_DIM;
    for (let s = 2; s < Lc - 3; s += 1) {
      const [x, y] = polar(bx, by, a, s);
      r.dot(Math.round(x), Math.round(y), g[s < Lc * 0.5 ? 3 : 2], (on ? 1 : 0.55) * dim, true);
    }
    if (on || blaze > 0.5) spot(r, tx, ty, 2, G_GOLD, 0.9 * dim);
  }
  // the two cradle rings (broken open when Broken, a gyroscope of tilted rings when unbound)
  const rings = F.unbound
    ? [[54, 0.34, -18 + (P.gyro || 0) * 30], [62, 0.5, 26 - (P.gyro || 0) * 20], [47, 1, 0], [70, 0.22, 4 + (P.gyro || 0) * 12]]
    : [[47, 1, 0], [55, 1, 0]];
  rings.forEach(([rad, ry, tilt], i) => ring(r, rad, ry, tilt, P, F, i));
}

/** One cradle ring: a gilt tube with gold beads; `ry` < 1 tilts it (unbound), gaps when Broken. */
function ring(r, rad, ry, tilt, P, F, i) {
  const c = Math.cos(tilt * DEG), s = Math.sin(tilt * DEG);
  const gaps = P.broken ? [[20 + i * 40, 70 + i * 40], [200, 236]] : [];
  const steps = Math.ceil(rad * 7);
  for (let k = 0; k < steps; k++) {
    const a = (k / steps) * 360;
    if (gaps.some(([g0, g1]) => a >= g0 && a < g1)) continue;
    const ex = Math.cos(a * DEG) * rad, ey = Math.sin(a * DEG) * rad * ry;
    const x = CX + ex * c - ey * s, y = CY + ex * s + ey * c;
    const lit = Math.sin(a * DEG) < 0 ? 6 : 4;          // the top of the ring catches the key light
    const ox = Math.cos(a * DEG) * c - Math.sin(a * DEG) * ry * s, oy = Math.cos(a * DEG) * s + Math.sin(a * DEG) * ry * c;
    r.dot(Math.round(x), Math.round(y), GILT[lit], 0.25, false);
    r.dot(Math.round(x + ox), Math.round(y + oy), GILT[lit - 2], 0.1, false);
    const bead = k % Math.round(steps / 12) === ((P.rot || 0) + i * 2) % Math.round(steps / 12);
    if (bead) spot(r, x, y, 2, P.broken ? G_GOLD_DIM : G_GOLD, 0.9);
  }
}

/** Point and tangent angle (degrees) of the quadratic curve a-c-b at t. */
function quad(a, c, b, t) {
  const u = 1 - t;
  const p = [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  const d = [2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0]), 2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1])];
  return [p, Math.atan2(d[1], d[0]) / DEG];
}

/**
 * One wing: a gilt spar arching from the shoulder `s` through `c` to `t`, a row of long lacquer
 * primaries hanging from it (longest at the tip, so the trailing edge is ragged) and a row of
 * porcelain coverts along the spar catching the light. `hang` turns the feathers off the spar.
 */
function wing(r, s, c, t0, n, len, w, P, F, seed, o = {}) {
  const R = rng(seed);
  const t = [clamp(t0[0], SAFE.x0 + 4, SAFE.x1 - 4), clamp(t0[1], SAFE.y0 + 4, SAFE.y1 - 4)];
  const side = t[0] > s[0] ? 1 : -1;
  const tear = o.tear || 0;
  const vein = F.unbound ? G_DAWN : G_GOLD;
  const dim = P.broken;
  // primaries: from the root outward, each a little longer; drawn tip-first so inner ones overlap
  const feathers = [];
  for (let k = 0; k < n; k++) {
    const u = 0.18 + (k / (n - 1)) * 0.82;
    const [p, ang] = quad(s, c, t, u);
    const hang = (o.hang ?? 72) + (R() - 0.5) * 10 - k * (o.fan ?? 3);
    const a = ang + side * hang;
    const L = len * (0.45 + u * 0.55) * (0.86 + R() * 0.28);
    const off = tear ? [Math.cos(a * DEG) * tear * u * 1.4, Math.sin(a * DEG) * tear * u * 1.4] : [0, 0];
    const root = [clamp(p[0] + off[0], SAFE.x0 + w, SAFE.x1 - w), clamp(p[1] + off[1], SAFE.y0 + w, SAFE.y1 - w)];
    feathers.push({ p: root, a, L, w: w * (0.8 + R() * 0.35), k });
  }
  for (const f of [...feathers].reverse()) {
    blade(r, f.p, f.a, f.L, f.w, {
      vein, veinK: (F.unbound ? 0.8 : 0.7) * (dim ? 0.4 : 1), tip: f.k % 2 === 1, dim, bias: o.bias ?? 0, bend: 0.12,
      ramp: F.unbound ? COSMOS : NAVY, rimRamp: GILT,
    });
    if (F.unbound) {
      // stars seen through the feather
      for (let k = 0; k < 3; k++) {
        const u = 0.25 + R() * 0.6, v = (R() - 0.5) * 0.6;
        const [x, y] = [f.p[0] + Math.cos(f.a * DEG) * f.L * u - Math.sin(f.a * DEG) * f.w * v, f.p[1] + Math.sin(f.a * DEG) * f.L * u + Math.cos(f.a * DEG) * f.w * v];
        const c = G_STAR[R() < 0.3 ? 3 : 2];
        if (inside(x, y)) r.dot(Math.round(x), Math.round(y), c, 0.7, true);
      }
    }
  }
  // the spar
  const N = 22;
  let prev = s;
  for (let i = 1; i <= N; i++) {
    const [p] = quad(s, c, t, i / N);
    const ra = lerp(4.2, 1.6, (i - 1) / N), rb = lerp(4.2, 1.6, i / N);
    if (!(tear && i > N * 0.55 && i % 4 === 0)) r.seg(prev[0], prev[1], p[0], p[1], ra, rb, GILT, { max: 7, spec: GILT[7], specT: 0.97, bias: dim ? -0.12 : 0.02 });
    prev = p;
  }
  spot(r, t[0], t[1], 2, vein, dim ? 0.3 : 0.95);
  // coverts: short porcelain blades along the spar's lower edge
  for (let k = 0; k < n + 1; k++) {
    const u = 0.08 + (k / n) * 0.72;
    const [p, ang] = quad(s, c, t, u);
    blade(r, [p[0], p[1] + 1], ang + side * (o.hang ?? 72) * 0.7, len * 0.26 * (1 - u * 0.35), w * 0.75, {
      ramp: GILT, rimRamp: GILT, bias: (o.bias ?? 0) - 0.02, dim, bend: 0.05,
    });
  }
}

/** The six wings, back to front. `wing` (degrees) breathes them open, `droop` lowers them (Broken). */
function wings(r, P, F) {
  const sp = (P.wing || 0) * 1.4, dr = P.droop || 0, tear = F.unbound ? 6 + (P.tear || 0) : 0;
  const fold = P.fold || 0;   // folded down (the defeat): every wing closes in round the body
  for (const side of [-1, 1]) {
    const S = (dx, dy) => [CX + side * dx * (1 - fold * 0.72), CY + dy * (1 - fold * 0.25) + fold * 18];
    // [shoulder, control, tip] for the lower, middle and upper wing; tips rise with `sp`, fall with `dr`
    const lower = [S(20, 50), S(62, 62 + dr * 0.3), S(94 + sp * 0.2 + dr * 0.3, 108 + dr * 0.25 - sp * 0.4)];
    const middle = [S(22, 40), S(78, 34 + dr * 0.6), S(110, 50 + dr * 1.2 - sp * 0.9)];
    const upper = [S(20, 28), S(66, -20 + dr), S(96 - sp * 0.3, -66 + dr * 2.4 - sp * 1.2)];
    const b = side < 0 ? -0.05 : 0.02;
    const k = 1 - fold * 0.45;
    wing(r, ...lower, 6, 50 * k, 7, P, F, 37 + side, { hang: 54, fan: 2, tear, bias: b - 0.04 });
    wing(r, ...middle, 7, 64 * k, 8, P, F, 23 + side, { hang: 70, fan: 3, tear, bias: b });
    wing(r, ...upper, 7, 62 * k, 8, P, F, 11 + side, { hang: 96, fan: 5, tear, bias: b + 0.02 });
  }
}

/** The chandelier of hanging lancets under the body, each ending in a plumb of light. */
function lancets(r, P, F) {
  const sway = P.sway || 0;
  const list = [[-22, 40, 5], [-14, 58, 6], [-6, 74, 7], [2, 80, 7], [10, 66, 6], [18, 50, 5], [26, 34, 4]];
  for (const [dx, L, w] of list) {
    const top = [CX + dx * 1.1, CY + 84];
    const tip = [CX + dx * 1.3 + sway * (L / 90), CY + 84 + L * 0.54 * (F.unbound ? 0.9 : 1)];
    if (F.unbound) {
      // streams of choir light instead of metal
      for (let i = 0; i < L; i++) {
        const t = i / L;
        const x = lerp(top[0], tip[0], t) + Math.sin(i * 0.4 + (P.hp || 0) * 2 + dx) * 1.2;
        const y = lerp(top[1], tip[1], t);
        r.dot(Math.round(x), Math.round(y), G_DAWN[t < 0.5 ? 3 : 2], 0.9 * (1 - t * 0.5), true);
        if (i % 7 === (dx & 7)) r.dot(Math.round(x + 1), Math.round(y), G_GOLD[3], 0.8, true);
      }
      spot(r, tip[0], tip[1], 2, G_DAWN, 0.9);
      continue;
    }
    r.begin();
    r.poly([[top[0] - w, top[1]], [top[0] + w, top[1]], [lerp(top[0], tip[0], 0.55) + w * 0.6, lerp(top[1], tip[1], 0.55)], tip, [lerp(top[0], tip[0], 0.55) - w * 0.6, lerp(top[1], tip[1], 0.55)]], NAVY, {
      nf: (mx) => { const s = clamp((mx - lerp(top[0], tip[0], 0.5)) / w, -1, 1); return [s * 0.8, -0.1, Math.sqrt(1 - s * s * 0.64)]; },
      max: 7, bevel: 1,
    });
    r.end(0.4);
    r.line(Math.round(top[0] + w * 0.5), Math.round(top[1] + 2), Math.round(tip[0]), Math.round(tip[1] - 2), GILT[5], 0.2);
    // the plumb: a drop of gold light
    r.ball(tip[0], tip[1] + 3, 2.6, 3.4, GILT, { max: 7, spec: GILT[7], specT: 0.97, glow: 0.4 });
    spot(r, tip[0], tip[1] + 3, 2, G_GOLD, P.broken ? 0.3 : 0.9);
  }
}

/** Robe outline: shoulders at y0, a flared hem broken into pointed panels at y1. */
function robeShape(x, y, P) {
  const y0 = CY + 26, y1 = CY + 86;
  if (y < y0 || y > y1 + 12) return false;
  const t = clamp((y - y0) / (y1 - y0), 0, 1);
  const half = lerp(23, 44, Math.pow(t, 0.8)) + Math.sin(t * 5 + (P.hp || 0)) * 1.2;
  if (Math.abs(x - CX) > half) return false;
  if (y <= y1) return true;
  // the hem: eight pointed panels, the middle ones longest
  const u = (x - (CX - half)) / (2 * half), panel = Math.floor(u * 8), f = u * 8 - panel;
  const depth = 6 + 6 * Math.sin((panel + 0.5) / 8 * Math.PI) + noise(panel, 2) * 3;
  return y - y1 < depth * (1 - Math.abs(f - 0.5) * 2);
}

/** The robe: a bell of lacquer panels from the shoulders, gilt bands, the cradle-ring emblem on the chest. */
function robe(r, P, F) {
  const y0 = CY + 26, y1 = CY + 86;
  r.begin();
  r.each(CX - 48, y0, CX + 48, y1 + 14, (mx, my, X, Y) => {
    if (!robeShape(mx, my, P)) return;
    const t = clamp((my - y0) / (y1 - y0), 0, 1);
    const half = lerp(23, 44, Math.pow(t, 0.8));
    const u = (mx - CX) / half;
    // vertical folds: the panels catch the key light on their left faces
    const fold = Math.sin(u * 9.5 + t * 1.2) * 0.45;
    r.lightPut(X, Y, clamp(u * 0.7 + fold, -1, 1), -0.25 + t * 0.15, 0.75, F.unbound ? COSMOS : NAVY, { max: 8, bias: 0.02, gamma: 1.3 });
  });
  r.end(0.5);
  // gilt bands: the hem, and three seams running down the folds
  for (let x = CX - 46; x <= CX + 46; x++) {
    for (let y = y1 - 6; y < y1 - 3; y++) if (robeShape(x, y, P)) r.dot(x, y, GILT[y === y1 - 6 ? 6 : 4], y === y1 - 6 ? 0.3 : 0);
  }
  for (const s of [-0.62, 0, 0.62]) {
    for (let y = y0 + 12; y < y1 - 6; y++) {
      const t = (y - y0) / (y1 - y0);
      const x = Math.round(CX + s * lerp(23, 44, Math.pow(t, 0.8)));
      const pulse = ((y - y0) * 0.16 - (P.hp || 0) * 1.7 + s * 3) % 6.283;
      r.dot(x, y, GILT[s < 0 ? 6 : 5], 0.2);
      if (pulse > 0 && pulse < 0.6) r.dot(x, y, (F.unbound ? G_DAWN : G_GOLD)[4], 1, true);
    }
  }
  if (F.unbound) stars(r, P, (mx, my) => robeShape(mx, my, P) && my < y1 - 8, 71);
  // the collar: a gilt gorget under the hood
  r.begin();
  r.each(CX - 30, y0 - 4, CX + 30, y0 + 12, (mx, my, X, Y) => {
    const u = (mx - CX) / 29, v = (my - (y0 - 6)) / 16;
    const d = u * u + v * v;
    if (d > 1 || d < 0.42 || my < y0 - 2) return;
    r.lightPut(X, Y, u * 0.8, -0.4, 0.6, GILT, { max: 7, spec: GILT[7], specT: 0.96 });
  });
  r.end(0.5);
  // the chest emblem: two cradle rings and a gold heart (the pod's light shows through when cradling)
  const ex = CX, ey = CY + 46;
  arc(r, ex, ey, 9, 9, 0, 360, F.unbound ? G_DAWN : G_GOLD, 0.8, 1);
  arc(r, ex, ey, 5.5, 5.5, 0, 360, G_GOLD, 0.7, 1);
  spot(r, ex, ey, 3, F.unbound ? G_DAWN : G_GOLD, 1);
}

/** Stars inside the lacquer (unbound): the Choir's pods seen through the body. */
function stars(r, P, inside, seed) {
  const R = rng(seed + (P.frag || 0));
  r.each(0, 0, W, H, (mx, my, X, Y) => {
    if (!inside(mx, my)) return;
    const v = noise(X * 0.7, Y * 1.3);
    if (v > 0.985) r.put(X, Y, G_STAR[R() < 0.4 ? 3 : 2], 0.9, true);
    else if (v > 0.965) r.put(X, Y, G_STAR[1], 0.5, true);
  });
}

/** The hood: a gothic arch of lacquer with a gilt rim; inside it the almond eye looks at the squad. */
function hood(r, P, F) {
  const hw = 27, top = CY - 46, bot = CY + 28;
  const open = P.open ?? 1;
  const inside = (mx, my) => hoodInside(mx, my, CX, CY, hw, top, bot);
  const insideIn = (mx, my) => hoodInside(mx, my, CX, CY, hw - 4, top + 7, bot - 4);
  // gilt shell
  r.begin();
  r.each(CX - hw - 2, top - 1, CX + hw + 2, bot + 1, (mx, my, X, Y) => {
    if (!inside(mx, my)) return;
    const n = dome(CX, CY - 6, hw + 4, 46, 0.85)(mx, my);
    if (F.split && Math.abs(mx - CX - Math.sin(my * 0.3) * 1.5) < 1.6 + (my < CY ? 2 : 0) && my < bot - 6) return;   // the hood split open (unbound)
    r.lightPut(X, Y, n[0], n[1], n[2], insideIn(mx, my) ? NAVY : GILT, { max: insideIn(mx, my) ? 7 : 7, bias: insideIn(mx, my) ? 0.02 : 0.05 });
  });
  r.end(0.5);
  // filigree: a rim of gold beads following the inner arch
  for (let k = 0; k < 26; k++) {
    const t = k / 25;
    const my = lerp(top + 10, bot - 6, t);
    for (const s of [-1, 1]) {
      let mx = CX;
      while (insideIn(mx + s, my)) mx += s;
      if (k % 2 === 0) r.dot(Math.round(mx), Math.round(my), GILT[6], 0.35);
    }
  }
  // tracery: an inner arch of gold and a small rose of spokes above the eye, like a cathedral window
  for (let my = top + 10; my < CY - 6; my++) {
    for (const sgn of [-1, 1]) {
      let mx = CX;
      while (hoodInside(mx + sgn, my, CX, CY, hw - 9, top + 14, bot - 8)) mx += sgn;
      if (mx !== CX && my % 1 === 0) r.dot(Math.round(mx), my, GILT[5], 0.25);
    }
  }
  const rose = [CX, CY - 24];
  for (let k = 0; k < 8; k++) {
    const [x1, y1] = polar(rose[0], rose[1], k * 45 + 22.5, 6);
    r.line(Math.round(rose[0]), Math.round(rose[1]), Math.round(x1), Math.round(y1), GILT[4], 0.15);
  }
  arc(r, rose[0], rose[1], 6.5, 6.5, 0, 360, F.unbound ? G_DAWN : G_GOLD, 0.6, 1);
  spot(r, rose[0], rose[1], 2, F.unbound ? G_DAWN : G_GOLD, 0.9);
  // the almond eye (sigil): gold lids, a dark eye and a ringed iris shifted toward the squad
  const ew = 19, eh = 10.5 * open + 0.6, ey = CY + 2, ex = CX + 1;
  const ix = ex + 4 + (P.look || 0), ir = 7.6 * (P.iris ?? 1);
  const k = clamp((P.eyeK ?? 1) + (P.blaze || 0) * 0.5, 0.2, 1.6);
  const white = (P.blaze || 0) > 0.6 || F.unbound;
  r.each(ex - ew - 2, ey - 14, ex + ew + 2, ey + 14, (mx, my, X, Y) => {
    const u = (mx - ex) / ew, v = (my - ey) / Math.max(1, eh);
    const lid = 1 - u * u;
    if (lid <= 0 || Math.abs(v) > lid) return;
    const d = Math.hypot(mx - ix, my - ey);
    if (Math.abs(v) > lid - 0.3) r.put(X, Y, G_GOLD[k > 1.05 ? 4 : 3], 0.95 * k, true);
    else if (d < ir * 0.36) r.put(X, Y, white ? WHITE : G_GOLD[4], k, true);
    else if (d < ir * 0.55) r.put(X, Y, (white ? G_DAWN : G_GOLD)[3], 0.9 * k, true);
    else if (d < ir) r.put(X, Y, G_GOLD[d < ir * 0.8 ? 2 : 3], 0.75 * k, true);
    else r.put(X, Y, VOID[1]);
  });
  // unbound: the iris cracks, light leaking through the cracks
  if (F.unbound) {
    for (const [ang, len] of [[-40, 9], [70, 8], [160, 10], [250, 7]]) {
      const [x1, y1] = polar(ix, ey, ang, len * (P.iris ?? 1));
      r.line(Math.round(ix), Math.round(ey), Math.round(x1), Math.round(Math.max(ey - eh + 1, Math.min(ey + eh - 1, y1))), WHITE, 1, true);
    }
  }
  // a tear of gold from the eye (it grieves)
  if (open > 0.4) for (let y = ey + 8; y < ey + 8 + 9 * open; y++) r.dot(ix - 1, y, G_GOLD[y % 3 === 0 ? 3 : 2], 0.7, true);
  // the crown of spires over the arch
  const sp = [[-13, 16], [-6, 24], [0, 34], [7, 26], [14, 15]];
  for (const [dx, h] of sp) {
    if (F.split && Math.abs(dx) < 4) continue;
    const bx = CX + dx, by = top + 6 + Math.abs(dx) * 0.9;
    r.poly([[bx - 3, by], [bx, by - h], [bx + 3, by]], GILT, { n: [0.3, -0.5, 0.8], max: 7, bevel: 1 });
    spot(r, bx, by - h, 2, G_GOLD, P.broken ? 0.3 : 0.9);
  }
  if (F.split) {
    // the white-gold core showing through the split
    r.glow(CX, CY - 14, 6, 20, G_DAWN, { k: 1, fx: true, bias: 0.2 });
  }
}

/**
 * One cradle-arm: a great gilt rib that leaves the shoulder, swings out round the robe and curves back
 * in under it, plated with lacquer, ending in a long porcelain hand. Together the two arms are the
 * cradle (the sigil's rings made into arms). `reach` swings both toward the squad (the Cradle),
 * `wide` flings them open (unbound).
 */
function arm(r, side, P, F) {
  const rock = (P.rock || 0), reach = P.reach || 0, wide = P.wide || 0;
  const s = [CX + side * 26, CY + 34];
  const c = [CX + side * (66 + wide * 12) + reach * 26, CY + 58 + rock * 0.4 - wide * 50 - reach * 14];
  const t = [CX + side * (16 + wide * 92) + reach * (side > 0 ? 64 : 46), CY + 94 + rock - wide * 70 - reach * 20];
  const vein = F.unbound ? G_DAWN : G_GOLD;
  const N = 26;
  let prev = s;
  r.begin();
  for (let i = 1; i <= N; i++) {
    const [p] = quad(s, c, t, i / N);
    r.seg(prev[0], prev[1], p[0], p[1], lerp(6, 3.8, (i - 1) / N), lerp(6, 3.8, i / N), GILT, { max: 7, spec: GILT[7], specT: 0.965, bias: 0.06 });
    prev = p;
  }
  r.end(0.45);
  // a vein of choir light running down the rib toward the hand, pulsing with the idle
  for (let i = 3; i < 60; i++) {
    const u = i / 60;
    const [p, ang] = quad(s, c, t, u);
    const [x, y] = polar(p[0], p[1], ang - side * 90, lerp(1.6, 1, u));
    const pulse = (u * 5 - (P.hp || 0) * 0.8) % 1;
    const hot = pulse > 0 && pulse < 0.22;
    r.dot(Math.round(x), Math.round(y), vein[hot ? 4 : 3], (hot ? 1 : 0.7) * (P.broken ? 0.4 : 1), true);
  }
  // small lacquer plates inlaid in the rib, each with a gold boss
  for (const u of [0.2, 0.42, 0.64]) {
    const [p, ang] = quad(s, c, t, u);
    const [a, b] = [polar(p[0], p[1], ang, -3.5), polar(p[0], p[1], ang, 3.5)];
    r.begin();
    r.seg(a[0], a[1], b[0], b[1], 2.6, 2.2, NAVY, { max: 8, bias: 0.12, caps: 'round' });
    r.end(0.4);
    spot(r, p[0], p[1], 2, vein, P.broken ? 0.3 : 0.9);
  }
  r.begin();
  r.ball(s[0], s[1], 9, 8, GILT, { max: 7, spec: GILT[7], specT: 0.975 });
  r.end(0.5);
  // the hand: a porcelain palm and four long fingers curling toward the other hand
  const [, endAng] = quad(s, c, t, 1);
  const cup = clamp(0.55 + (P.cradle || 0) * 0.45 - wide * 0.9, 0, 1);
  r.begin();
  r.ball(t[0], t[1], 6.4, 5.4, PORCELAIN, { max: 8, spec: PORCELAIN[8], specT: 0.98, bias: 0.06 });
  for (let f = 0; f < 4; f++) {
    const a0 = endAng + (f - 1.5) * (15 + wide * 10);
    const m = polar(t[0], t[1], a0, 8.5);
    const a1 = a0 - side * cup * 55;
    const tip = polar(m[0], m[1], a1, 7.5 - Math.abs(f - 1.5));
    r.seg(t[0], t[1], m[0], m[1], 2.2, 1.7, PORCELAIN, { max: 8, bias: 0.06 });
    r.seg(m[0], m[1], tip[0], tip[1], 1.6, 0.9, PORCELAIN, { max: 8, bias: 0.06 });
    r.dot(Math.round(tip[0]), Math.round(tip[1]), GILT[6], 0.5);
  }
  r.end(0.45);
  // a gilt cuff at the wrist
  const [cw] = quad(s, c, t, 0.93);
  r.ball(cw[0], cw[1], 4.2, 4.2, GILT, { max: 7, spec: GILT[7], specT: 0.97 });
}

/** The pod it cradles: a sleeping light in a porcelain shell, held in the cupped hands (gone when unbound). */
function pod(r, P) {
  const reach = P.reach || 0;
  const x = CX + reach * 56, y = CY + 92 + (P.rock || 0) - reach * 22;
  const k = P.broken ? 0.45 : 1;
  // the light it gives: sparks hanging round the cradle
  sparks(r, 51 + (P.frag || 0), x, y - 2, 20, 9, G_GOLD);
  r.begin();
  r.ball(x, y, 13, 7.5, PORCELAIN, { max: 8, spec: WHITE, specT: 0.98, bias: 0.04 });
  r.end(0.4);
  // the lid's window: the sleeper's light through glass
  r.glow(x, y - 1, 9, 3.8, G_GOLD, { k: 1.1 * k, fx: true, bias: 0.4 });
  // the sleeper inside: a curled silhouette
  r.line(Math.round(x - 5), Math.round(y), Math.round(x + 3), Math.round(y - 1), G_GOLD[1], 0.4, true);
  r.dot(Math.round(x + 4), Math.round(y - 2), G_GOLD[2], 0.5, true);
  r.dot(Math.round(x + 5), Math.round(y - 1), G_GOLD[2], 0.5, true);
  // a cradle-thread of gold rocking under it
  arc(r, x, y + 4, 19, 7, 20, 160, G_GOLD, 0.8 * k);
}

/** Small geometric shards orbiting the construct (octahedra seen edge-on). */
function shards(r, P, F) {
  const t = P.orbit || 0;
  const list = F.unbound
    ? [[0, 108, 0.42], [50, 118, 0.3], [110, 100, 0.5], [160, 120, 0.36], [215, 112, 0.44], [280, 104, 0.32], [320, 118, 0.38]]
    : [[20, 104, 0.4], [140, 112, 0.34], [250, 100, 0.42], [320, 116, 0.3]];
  for (const [a0, rad, ry] of list) {
    const a = a0 + t * 30;
    const x = CX + Math.cos(a * DEG) * rad, y = CY + 30 + Math.sin(a * DEG) * rad * ry;
    if (x < 6 || x > W - 6 || y < 6 || y > H - 8) continue;
    const s = 3 + (a0 % 3);
    r.poly([[x, y - s * 1.6], [x + s, y], [x, y + s * 1.6], [x - s, y]], GILT, { n: [0.4, -0.4, 0.8], max: 7, bevel: 1 });
    r.dot(Math.round(x), Math.round(y), (F.unbound ? G_DAWN : G_GOLD)[3], 0.9, true);
  }
}

/** The choir light pouring into the unbound construct: spiralling streams of tiny pod-lights. */
function choirStreams(r, P) {
  const t = P.hp || 0, gather = P.gather || 0;
  for (let s = 0; s < 6; s++) {
    const a0 = s * 60 + t * 18;
    for (let i = 0; i < 64; i++) {
      const u = i / 64;
      const rad = lerp(124, 20, u) * (1 - gather * 0.25);
      const a = (a0 + u * 210) * DEG;
      const x = CX + Math.cos(a) * rad, y = CY + 10 + Math.sin(a) * rad * 0.62;
      if (x < 2 || x > W - 3 || y < 2 || y > H - 3) continue;
      if (noise(i, s + t) < 0.22) continue;
      const big = i % 9 === (s * 2) % 9;
      r.dot(Math.round(x), Math.round(y), G_STAR[u > 0.55 ? 3 : 2], 0.8 + u * 0.4, true);
      if (big) {
        // a pod-light: a small cross of dawn light
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) r.dot(Math.round(x) + dx, Math.round(y) + dy, G_DAWN[2], 0.7, true);
      } else if (i % 4 === 0) r.dot(Math.round(x), Math.round(y) + 1, G_GOLD[3], 0.6, true);
    }
  }
}

/**
 * The Choir's light round the unbound construct: a stippled radiance behind the hood, densest near the
 * core and thinning to single motes, so the silhouette stays broken (never a solid disc).
 */
function radiance(r, P) {
  const R = rng(131 + (P.frag || 0));
  const cx = CX, cy = CY - 4, rad = 78 + (P.blaze || 0) * 8 + (P.gather || 0) * 10;
  r.each(cx - rad, cy - rad * 0.8, cx + rad, cy + rad * 0.8, (mx, my, X, Y) => {
    const d = Math.hypot((mx - cx) / rad, (my - cy) / (rad * 0.8));
    if (d > 1) return;
    const p = Math.pow(1 - d, 2) * 0.32;
    if (R() > p) return;
    const ramp = R() < 0.6 ? G_DAWN : G_GOLD;
    r.put(X, Y, ramp[d < 0.35 ? 3 : d < 0.7 ? 2 : 1], 0.6 * (1 - d * 0.5), true);
  });
}

// ---------------------------------------------------------------- frames

function figure(r, P, F) {
  halo(r, P, F);
  wings(r, P, F);
  // unbound: the Choir's light pours in over the wings
  if (F.unbound) choirStreams(r, P);
  if (F.unbound && !P.fold) radiance(r, P);
  lancets(r, P, F);
  robe(r, P, F);
  for (const side of [-1, 1]) arm(r, side, P, F);
  if (!F.unbound) pod(r, P);
  hood(r, P, { ...F, split: F.unbound });
  shards(r, P, F);
  if (P.sing) {
    // the hymn: rings of sound leaving the eye toward the squad
    for (let k = 0; k < 4; k++) arc(r, CX + 40 + k * 18 * P.sing, CY + 2, 10 + k * 7, 16 + k * 10, -60, 60, F.unbound ? G_DAWN : G_GOLD, 0.95 - k * 0.15);
  }
  if (P.gather) {
    // everything drawn into the core: converging sparks and a white-gold heart
    sparks(r, 91 + (P.frag || 0), CX, CY - 4, 40 * P.gather, 26, G_DAWN);
    r.glow(CX, CY - 2, 10 * P.gather, 10 * P.gather, G_DAWN, { k: 1.2, fx: true, bias: 0.3 });
  }
  motes(r, 7 + (P.frag || 0), 16, 10, W - 32, H - 30, F.unbound ? 34 : 22, F.unbound ? G_DAWN : G_GOLD, 0.6);
}

// the whole construct is painted at 0.9 about the frame's centre, so no part of it reaches the frame
// edge in any pose (the silhouette stays broken, never cut straight by the frame)
const FIT = 0.9;
// the construct sits 12 px low in its frame, so its eye stays inside the battle focus band (G2 rule 20)
const DROP = 12;

function drawWarden(r, P, F) {
  r.save();
  r.translate(W / 2, H * 0.52 + DROP).scale(FIT).translate(-W / 2, -H * 0.52);
  r.translate(P.dx || 0, P.bob || 0);
  if (P.lean) r.rotate(P.lean, CX, CY + 50);
  figure(r, P, F);
  r.restore();
}

const LOCK = { unbound: false };
const UNBOUND = { unbound: true };

const IDLE_LOCK = [
  { bob: 0, wing: 0, rot: 0, rock: 0, sway: 0, hp: 0, orbit: 0, frag: 0, iris: 1 },
  { bob: -3, wing: 4, rot: 3, rock: 2, sway: 2, hp: 1.6, orbit: 1, frag: 1, iris: 1.06 },
  { bob: -6, wing: 7, rot: 6, rock: 3, sway: 3, hp: 3.2, orbit: 2, frag: 2, iris: 1.1 },
  { bob: -3, wing: 3, rot: 9, rock: 1, sway: 1, hp: 4.8, orbit: 3, frag: 3, iris: 1.04 },
];

const ANIMS_LOCK = {
  idle: { fps: 3.5, loop: true, poses: IDLE_LOCK },
  attack: { fps: 6, loop: false, order: [0, 1, 1, 1], poses: [
    { bob: -4, wing: 10, rot: 1, blaze: 0.5, sing: 0.6, iris: 1.15, hp: 1, frag: 4 },
    { bob: -6, wing: 16, rot: 2, blaze: 1, sing: 1, iris: 1.25, hp: 1.5, frag: 5, look: 1 },
  ] },
  cast: { fps: 5, loop: false, poses: [{ bob: -3, wing: 6, reach: 1, cradle: 1, rot: 4, blaze: 0.4, frag: 6, look: 2 }] },
  special: { fps: 5, loop: false, poses: [{ bob: -8, wing: 22, rot: 5, blaze: 1, iris: 0.8, eyeK: 1.5, frag: 7, look: 2 }] },
  hurt: { fps: 6, loop: false, poses: [{ bob: 2, dx: -3, lean: -0.04, wing: -6, rot: 7, open: 0.55, eyeK: 0.6, frag: 8 }] },
  break: { fps: 3, loop: true, poses: [
    { bob: 3, wing: -4, droop: 28, broken: 1, open: 0.3, eyeK: 0.4, rot: 8, rock: 3, sway: -2, frag: 9, lean: 0.03 },
    { bob: 4, wing: -6, droop: 30, broken: 1, open: 0.45, eyeK: 0.55, rot: 9, rock: 4, sway: -3, frag: 10, lean: 0.03 },
  ] },
};

const IDLE_UNBOUND = [
  { bob: 0, wing: 2, rot: 0, sway: 0, hp: 0, orbit: 0, frag: 0, gyro: 0, wide: 0.75, tear: 0 },
  { bob: -4, wing: 7, rot: 3, sway: 3, hp: 1.6, orbit: 1, frag: 1, gyro: 0.33, wide: 0.82, tear: 3 },
  { bob: -7, wing: 10, rot: 6, sway: 4, hp: 3.2, orbit: 2, frag: 2, gyro: 0.66, wide: 0.88, tear: 5 },
  { bob: -4, wing: 5, rot: 9, sway: 1, hp: 4.8, orbit: 3, frag: 3, gyro: 1, wide: 0.8, tear: 2 },
];

const ANIMS_UNBOUND = {
  idle: { fps: 4, loop: true, poses: IDLE_UNBOUND },
  attack: { fps: 6, loop: false, order: [0, 1, 1, 1], poses: [
    { bob: -5, wing: 14, rot: 2, blaze: 0.6, sing: 0.6, wide: 1, tear: 6, hp: 1, frag: 4, gyro: 0.2 },
    { bob: -8, wing: 20, rot: 3, blaze: 1, sing: 1, wide: 1.1, tear: 9, hp: 1.5, frag: 5, gyro: 0.4, look: 1 },
  ] },
  cast: { fps: 5, loop: false, poses: [{ bob: -4, wing: 8, reach: 1, cradle: 1, wide: 0.2, rot: 4, blaze: 0.5, tear: 4, frag: 6, gyro: 0.6, look: 2 }] },
  special: { fps: 5, loop: false, poses: [{ bob: -6, wing: 4, rot: 5, gather: 1, wide: 0.4, tear: 0, frag: 7, gyro: 0.9, eyeK: 1.5 }] },
  hurt: { fps: 6, loop: false, poses: [{ bob: 2, dx: -3, lean: -0.045, wing: -4, rot: 7, wide: 0.6, open: 0.6, eyeK: 0.6, tear: 12, frag: 8 }] },
  break: { fps: 3, loop: true, poses: [
    { bob: 4, wing: -6, droop: 30, broken: 1, open: 0.35, eyeK: 0.45, rot: 8, wide: 0.3, tear: 14, frag: 9, lean: 0.04, gyro: 0.1 },
    { bob: 5, wing: -8, droop: 32, broken: 1, open: 0.5, eyeK: 0.55, rot: 9, wide: 0.35, tear: 16, frag: 10, lean: 0.04, gyro: 0.2 },
  ] },
};

// the camera keeps the halo's top to the chest on screen: with the head well below the box's top
// (which the fit pins under the turn bar), the eye lands inside the focus band on desktop and phone
const FIT_BOX = [96, 8, 64, 150];
const POINTS = { center: [126, 144], muzzle: [148, 118], top: [126, 30], core: [129, 118] };

export const WARDEN_LOCK = {
  w: W, h: H, bevel: 3,
  draw: (r, P) => drawWarden(r, P, LOCK),
  anims: ANIMS_LOCK,
  points: POINTS,
  icon: { x: 128, y: 116, scale: 0.36 },
  fitBox: FIT_BOX,
};

export const WARDEN_UNBOUND = {
  w: W, h: H, bevel: 3,
  draw: (r, P) => drawWarden(r, P, UNBOUND),
  // fold: the defeat (warden.defeat): wings close round the body, the rays draw in, the light dims
  anims: { ...ANIMS_UNBOUND, fold: { fps: 3, loop: false, poses: [{ bob: 10, fold: 1, wing: -4, rot: 2, open: 0.25, eyeK: 0.4, gyro: 0, wide: 0, tear: 0, frag: 11 }] } },
  points: POINTS,
  icon: { x: 128, y: 116, scale: 0.36 },
  fitBox: FIT_BOX,
};

// ---------------------------------------------------------------- the field version

const FS = 0.5;

/** The Merciful Lock at half scale for the crown map (128x128): idle, `special` folded down, `break`. */
export const WARDEN_FIELD = {
  w: 128, h: 128, bevel: 2,
  draw(r, P) {
    r.scale(FS);
    drawWarden(r, P, LOCK);
  },
  anims: {
    idle: { fps: 3.5, loop: true, poses: IDLE_LOCK },
    attack: { fps: 5, loop: false, poses: [ANIMS_LOCK.attack.poses[1]] },
    hurt: { fps: 5, loop: false, poses: [ANIMS_LOCK.hurt.poses[0]] },
    break: { fps: 3, loop: true, poses: [ANIMS_LOCK.break.poses[0]] },
    special: { fps: 3, loop: false, poses: [{ bob: 10, fold: 1, wing: -4, rot: 2, open: 0.3, eyeK: 0.5 }] },
  },
  points: { center: [63, 72], muzzle: [74, 59], top: [63, 15], core: [65, 59] },
  icon: { x: 64, y: 58, scale: 0.7 },
};
