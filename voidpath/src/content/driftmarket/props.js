// driftmarket: prop builders (browser, TECH_PLAN 3.3). Registered types (`registerProp`), each
// building into the World's batches (one draw per material) or its own small groups for the few
// that move. Every material comes from W.mats (released with the World).
//
//   dm.lanterns { a: [x, y, z], b: [x, y, z], n = 8, sag = 0.5, phase }  a string of paper lanterns that sways
//   dm.post     { x, z, h = 2.7, glow = true }                         iron post with a hanging lantern
//   dm.pylon    { x, z, h = 3.2 }                                      girder pylon at the rail, lamp on top
//   dm.stall    { x, z, w = 3, awning: 'red'|'teal'|'amber', goods: 'noodles'|'ribbons'|'salvage'|'kelp'|'parts', sign? }
//   dm.counter  { x, z, w, d = 0.7, h = 0.95, top = 'dm_planks_a', front = 'dm_scrap' }
//   dm.ribbons  { x, z, w = 2, y = 0.45, n = 6, rot = 0, len = 0.75, seed }   prayer ribbons tied along a rail:
//                                                                      thin strips, crimson / faded pink / cream, swaying
//   dm.ribbon_frame { x, z, w = 3, h = 2.4 }                           Ama's lattice of ribbons
//   dm.moth     { x, z, rot = 0, scale = 1 }                           Nyx's skiff (C1's shared builder, with moth
//                                                                      feelers) and Oona's, scaled
//   dm.beacon   { x, z }                                               Tobin's beacon horn (focal set piece)
//   dm.iris     { x, z, r = 1.3 }                                      the docking iris on the dock wall
//   dm.scrap    { x, z, w = 2, d = 1.4, seed }                         a heap of wreck plates
//   dm.barrels  { x, z, n = 3, seed }                                  water barrels and a crate
//   dm.crates   { x, z, n = 3, seed }                                  stacked salvage crates
//   dm.sign     { x, z, y = 2.4, w = 2, h = 0.75, tex, rot = 0 }       a hanging sign on two chains
//   dm.kelp     { x, z, rot = 0 }                                      a glowing tank of Ione kelp
//   dm.bunk     { x, z, rot = 0 }                                      an inn bunk
//   dm.table    { x, z }                                               a table with stools and a lamp
//   dm.hearth   { x, z }                                               the inn's stove (embers, glow)
//   dm.lantern_tree { x, z, h = 3.2, arms = 5 }                       the Row's mast of lanterns over a ring bench
//   dm.bench    { x, z, w = 2 }                                        a plank bench
//   dm.board    { x, z }                                               the favours board
//   dm.shelf    { x, z, w = 2 }                                        a freestanding shelf of salvage

import * as THREE from 'three';
import { makeGlow } from '../../core/vfx.js';
import { Batch, wrappedCylinder } from '../../world/geometry.js';
import { buildMoth, MOTH_TEXTURES } from '../prologue/props.js';

const _m = new THREE.Matrix4();

/** Seeded random in [0, 1). */
function rnd(seed) {
  let s = (Math.floor(seed * 9973) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// shared materials per World
function mats(W) {
  if (W.dmMats) return W.dmMats;
  const M = W.mats;
  W.dmMats = {
    iron: M.plain('#2a2124', { roughness: 0.7, metalness: 0.5 }),
    ironDark: M.plain('#160f10', { roughness: 0.8, metalness: 0.4 }),
    cable: M.plain('#120c0c', { roughness: 0.9, metalness: 0.1 }),
    brass: M.tile('dm_brass', { roughness: 0.42, metalness: 0.6, emissive: 1.2 }),
    lantern: M.tile('dm_lantern', { emissive: 1.9, roughness: 0.6, cast: false, side: THREE.DoubleSide }),
    ribbon: M.tile('dm_ribbon', { emissive: 1.1, roughness: 0.8, cast: false, side: THREE.DoubleSide }),
    planks: M.tile('dm_planks_a', { roughness: 0.75, metalness: 0.1 }),
    scrap: M.tile('dm_scrap', { roughness: 0.6, metalness: 0.35 }),
    hull: M.tile('dm_hull_a', { roughness: 0.6, metalness: 0.35 }),
    crate: M.tile('dm_crate', { roughness: 0.65, metalness: 0.3 }),
    barrel: M.tile('dm_barrel', { roughness: 0.55, metalness: 0.35 }),
    quilt: M.tile('dm_rug', { roughness: 0.9, metalness: 0.0 }),
    cap: M.tile('dm_cap', { roughness: 0.6, metalness: 0.4 }),
    jar: M.plain('#0b2a2a', { roughness: 0.3, metalness: 0.1, emissive: '#3fd6d2', emissiveIntensity: 1.6 }),
    ember: M.plain('#2a0c04', { roughness: 0.8, metalness: 0.1, emissive: '#ff6a2a', emissiveIntensity: 2.6 }),
    bowl: M.plain('#c9b38a', { roughness: 0.6, metalness: 0.05 }),
    broth: M.plain('#6a2a10', { roughness: 0.3, metalness: 0.0, emissive: '#ff9a4a', emissiveIntensity: 0.6 }),
  };
  return W.dmMats;
}

/** A thin box between two 3D points (cables, chains, braces), merged into batch B. */
function rod(B, mat, a, b, r = 0.025) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 1e-3;
  const g = new THREE.BoxGeometry(r * 2, len, r * 2);
  const dir = new THREE.Vector3(dx, dy, dz).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  _m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1));
  B.geometry(mat, g, _m);
  g.dispose();
}

/** A paper lantern body (four faces of the lantern texture, a dark cap) hanging at (x, y, z). */
function lanternBody(B, M, x, y, z, s = 1) {
  const w = 0.24 * s, h = 0.3 * s;
  B.box({ front: M.lantern, back: M.lantern, left: M.lantern, right: M.lantern, top: M.ironDark }, x, z, w, w, y - h, y, 0);
}

/** A capped cylinder centred at (x, y, z), batched. */
function cyl(B, mat, rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  B.geometry(mat, g, _m.makeTranslation(x, y, z));
  g.dispose();
}

/** A glow sprite linked to the nearest virtual light (it flickers with it). */
function glow(W, G, color, size, intensity, x, y, z, link = true) {
  const s = makeGlow(color, size, intensity);
  s.position.set(x, y, z);
  G.add(s);
  if (link) W.addGlow(s, x, z);
  return s;
}

// dm_ribbon is an atlas of three 8-px columns (crimson, faded pink, cream); a strip maps the 4-px ribbon
// in the middle of its column (v = 1 at the knot)
const ribbonUv = (tone) => [(tone * 8 + 2) / 24, 1, (tone * 8 + 6) / 24, 0];
/** A ribbon tone: mostly crimson, some sun-faded pink, a few cream. */
const ribbonTone = (r) => { const k = r(); return k < 0.5 ? 0 : k < 0.8 ? 1 : 2; };

/** A hanging ribbon strip in the xy plane from (x, y, z) down `len`; `tilt` swings the tail sideways. */
function strip(B, M, x, y, z, len, tone, { w = 0.06, tilt = 0, dz = 0.04 } = {}) {
  B.quad(M.ribbon, [x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2 + tilt, y - len, z + dz], [x - w / 2 + tilt, y - len, z + dz], ribbonUv(tone));
}

// ---------------------------------------------------------------- lanterns, posts, pylons

const lanterns = {
  textures: ['dm_lantern', 'dm_brass'],
  build(W, p) {
    const M = mats(W);
    const [ax, ay, az] = p.a, [bx, by, bz] = p.b;
    const n = p.n || 8, sag = p.sag ?? 0.5;
    const at = (t) => [ax + (bx - ax) * t, ay + (by - ay) * t - sag * 4 * t * (1 - t), az + (bz - az) * t];
    // the string sways as one around the line between its anchors
    const pivot = new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    const axis = new THREE.Vector3(bx - ax, by - ay, bz - az).normalize();
    const G = new THREE.Group();
    G.position.copy(pivot);
    W.groupFor(p.on).add(G);
    const B = new Batch();
    const seg = 10;
    for (let i = 0; i < seg; i++) {
      const a = at(i / seg), b = at((i + 1) / seg);
      rod(B, M.cable, [a[0] - pivot.x, a[1] - pivot.y, a[2] - pivot.z], [b[0] - pivot.x, b[1] - pivot.y, b[2] - pivot.z], 0.018);
    }
    for (let i = 0; i < n; i++) {
      const [x, y, z] = at((i + 0.5) / n);
      const lx = x - pivot.x, ly = y - pivot.y, lz = z - pivot.z;
      rod(B, M.cable, [lx, ly, lz], [lx, ly - 0.12, lz], 0.01);
      lanternBody(B, M, lx, ly - 0.12, lz, i % 3 === 1 ? 0.85 : 1);
    }
    B.build(G);
    for (const m of G.children) m.castShadow = false;
    const phase = p.phase ?? (ax + az) * 0.37;
    W.addUpdater((dt, t) => {
      G.quaternion.setFromAxisAngle(axis, Math.sin(t * 0.9 + phase) * 0.06);
    });
    return null;
  },
};

const post = {
  textures: ['dm_lantern', 'dm_brass'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const h = p.h || 2.7;
    B.box({ front: M.iron, back: M.iron, left: M.iron, right: M.iron, top: M.brass }, p.x, p.z, 0.12, 0.12, 0, h, 0);
    B.box({ front: M.brass, back: M.brass, left: M.brass, right: M.brass, top: M.brass }, p.x, p.z, 0.26, 0.26, 0, 0.22, 0);
    rod(B, M.iron, [p.x, h - 0.1, p.z], [p.x + 0.42, h - 0.1, p.z], 0.03);
    rod(B, M.cable, [p.x + 0.4, h - 0.1, p.z], [p.x + 0.4, h - 0.28, p.z], 0.01);
    lanternBody(B, M, p.x + 0.4, h - 0.28, p.z, 1.2);
    if (p.glow !== false) glow(W, G, '#ffa24a', 1.1, 0.9, p.x + 0.4, h - 0.46, p.z + 0.05);
    W.addCircle(p.x, p.z, 0.16);
  },
};

const pylon = {
  textures: ['dm_lantern', 'dm_brass', 'dm_hull_a'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const h = p.h || 3.2;
    B.box({ front: M.hull, back: M.hull, left: M.hull, right: M.hull, top: M.cap }, p.x, p.z, 0.42, 0.42, 0, h, 0,
      { front: [0, 0, 0.42 / 1, h / 3], back: [0, 0, 0.42, h / 3], left: [0, 0, 0.42, h / 3], right: [0, 0, 0.42, h / 3] });
    B.box({ front: M.brass, back: M.brass, left: M.brass, right: M.brass, top: M.brass }, p.x, p.z, 0.56, 0.56, h, h + 0.12, 0);
    lanternBody(B, M, p.x, h + 0.5, p.z, 1.5);
    rod(B, M.iron, [p.x, h + 0.12, p.z], [p.x, h + 0.08 + 0.05, p.z], 0.03);
    glow(W, G, '#ffb04a', 1.4, 1.0, p.x, h + 0.3, p.z + 0.05);
    W.addBox(p.x, p.z, 0.46, 0.46);
  },
};

// ---------------------------------------------------------------- stalls and counters

function counter(W, B, x, z, w, d, h, top, front) {
  B.box({ front, back: front, left: front, right: front, top }, x, z, w, d, 0, h, 0,
    { front: [0, 0, w, h], back: [0, 0, w, h], left: [0, 0, d, h], right: [0, 0, d, h], top: [0, 0, w, d] });
  W.addBox(x, z, w + 0.04, d + 0.04);
}

/** Goods on a counter top (y = h), across width w centred at x. */
function goods(W, B, G, M, kind, x, z, w, h, seed) {
  const r = rnd(seed);
  if (kind === 'noodles') {
    // a steaming pot, stacked bowls, a ladle
    const pot = new THREE.Mesh(wrappedCylinder(0.24, 0.3, { arc: 1 }), M.brass);
    pot.position.set(x - w * 0.28, h, z);
    pot.castShadow = true;
    G.add(pot);
    const broth = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), M.broth);
    broth.rotation.x = -Math.PI / 2;
    broth.position.set(x - w * 0.28, h + 0.26, z);
    G.add(broth);
    W.addEmitter('steam', { position: [x - w * 0.28, h + 0.3, z], area: [0.25, 0.05, 0.25], rate: 5 });
    for (let i = 0; i < 4; i++) B.box({ front: M.bowl, back: M.bowl, left: M.bowl, right: M.bowl, top: M.broth }, x + 0.2 + (i % 2) * 0.32, z + 0.05, 0.22, 0.22, h + Math.floor(i / 2) * 0.08, h + 0.08 + Math.floor(i / 2) * 0.08, 0);
  } else if (kind === 'kelp') {
    for (let i = 0; i < 3; i++) B.box({ front: M.jar, back: M.jar, left: M.jar, right: M.jar, top: M.brass }, x - w / 3 + i * (w / 3), z, 0.26, 0.26, h, h + 0.36, 0);
  } else if (kind === 'salvage' || kind === 'parts') {
    for (let i = 0; i < 5; i++) {
      const s = 0.16 + r() * 0.18;
      const m = [M.crate, M.scrap, M.brass, M.jar, M.barrel][Math.floor(r() * 5)];
      B.box({ front: m, back: m, left: m, right: m, top: m }, x - w / 2 + 0.25 + (i / 5) * (w - 0.5), z + (r() - 0.5) * 0.25, s, s, h, h + s, r() * 0.8);
    }
  } else if (kind === 'ribbons') {
    for (let i = 0; i < 6; i++) strip(B, M, x - w / 2 + 0.3 + (i / 6) * (w - 0.4), h, z + 0.36, 0.35 + r() * 0.35, ribbonTone(r));
  }
}

const stall = {
  textures: ['dm_awning_red', 'dm_awning_teal', 'dm_awning_amber', 'dm_planks_a', 'dm_scrap', 'dm_lantern', 'dm_brass', 'dm_crate', 'dm_barrel'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const w = p.w || 3, d = 0.7, h = 0.95;
    const front = W.mats.tile(p.front || 'dm_scrap', { roughness: 0.6, metalness: 0.35 });
    counter(W, B, p.x, p.z, w, d, h, M.planks, front);
    // posts: two tall at the back, two shorter at the front
    for (const sx of [-1, 1]) {
      B.box({ front: M.iron, back: M.iron, left: M.iron, right: M.iron }, p.x + sx * (w / 2 - 0.06), p.z - 0.55, 0.1, 0.1, 0, 2.45, 0);
      B.box({ front: M.iron, back: M.iron, left: M.iron, right: M.iron }, p.x + sx * (w / 2 - 0.06), p.z + 0.65, 0.08, 0.08, 0, 2.05, 0);
    }
    // awning: a sloped striped canvas with a scalloped hem
    const aw = W.mats.tile(`dm_awning_${p.awning || 'red'}`, { roughness: 0.85, metalness: 0, side: THREE.DoubleSide, emissive: 1.2 });
    const x0 = p.x - w / 2 - 0.1, x1 = p.x + w / 2 + 0.1;
    B.quad(aw, [x0, 2.0, p.z + 0.8], [x1, 2.0, p.z + 0.8], [x1, 2.5, p.z - 0.6], [x0, 2.5, p.z - 0.6], [0, 0, (x1 - x0), 1]);
    B.quad(aw, [x0, 1.72, p.z + 0.81], [x1, 1.72, p.z + 0.81], [x1, 2.0, p.z + 0.81], [x0, 2.0, p.z + 0.81], [0, 0, (x1 - x0), 0.28]);
    // a lantern under the awning and a sign on the front
    rod(B, M.cable, [p.x + w / 2 - 0.45, 2.0, p.z + 0.55], [p.x + w / 2 - 0.45, 1.75, p.z + 0.55], 0.01);
    lanternBody(B, M, p.x + w / 2 - 0.45, 1.75, p.z + 0.55, 1.1);
    glow(W, G, '#ffa24a', 1.0, 0.8, p.x + w / 2 - 0.45, 1.58, p.z + 0.6);
    if (p.sign) {
      const s = W.mats.tile(p.sign, { emissive: 2.6, roughness: 0.5, cast: false });
      const sw = p.signW || 1.5, sh = sw / 3;
      B.faceZ(s, p.x - sw / 2 - 0.3, p.x + sw / 2 - 0.3, 1.74 - sh + 0.02, 1.74, p.z + 0.83, 1);
    }
    goods(W, B, G, M, p.goods || 'salvage', p.x, p.z, w, h, p.x * 7 + p.z);
    // a back panel of wreck plate, so the stall reads from the promenade too
    B.box({ front: M.hull, back: M.hull, top: M.cap }, p.x, p.z - 0.62, w, 0.08, 0, 1.6, 0,
      { front: [0, 0, w, 1.6 / 3], back: [0, 0, w, 1.6 / 3] });
  },
};

const counterProp = {
  textures: ['dm_planks_a', 'dm_scrap'],
  build(W, p) {
    const M = mats(W);
    const front = W.mats.tile(p.front || 'dm_scrap', { roughness: 0.6, metalness: 0.35 });
    const top = p.top ? W.mats.tile(p.top, { roughness: 0.7, metalness: 0.15 }) : M.planks;
    counter(W, W.batchFor(p.on), p.x, p.z, p.w || 2, p.d || 0.7, p.h || 0.95, top, front);
    if (p.goods) goods(W, W.batchFor(p.on), W.groupFor(p.on), M, p.goods, p.x, p.z, p.w || 2, p.h || 0.95, p.x * 3 + p.z);
  },
};

// ---------------------------------------------------------------- ribbons

/**
 * Ribbons tied along a rail: thin, separated strips of varied length and tone, each knotted to the
 * rail, swaying in four loose groups that each catch the draught at their own pace.
 */
const ribbons = {
  textures: ['dm_ribbon'],
  build(W, p) {
    const M = mats(W);
    const n = p.n || 6, w = p.w || 2, y = p.y ?? 0.45, len = p.len || 0.75, rot = p.rot || 0;
    const r = rnd(p.seed ?? p.x * 13 + p.z);
    // each group hangs from the rail line: its pivot sits at the knots, so a sway swings the tails
    const groups = [0, 1, 2, 3].map(() => {
      const G = new THREE.Group();
      G.position.set(p.x, y, p.z);
      G.rotation.order = 'YXZ';
      G.rotation.y = rot;
      W.groupFor(p.on).add(G);
      return { G, B: new Batch() };
    });
    for (let i = 0; i < n; i++) {
      const lx = -w / 2 + (i + 0.5) * (w / n) + (r() - 0.5) * (w / n) * 0.5;
      const l = len * (0.55 + r() * 0.85);
      const tone = ribbonTone(r);
      const { B } = groups[Math.floor(r() * 4)];
      // the knot: a little cloth bulge on the rail
      const knot = ribbonUv(tone);
      B.box({ front: M.ribbon, back: M.ribbon, left: M.ribbon, right: M.ribbon }, lx, 0.035, 0.1, 0.06, -0.05, 0.03, 0,
        { front: knot, back: knot, left: knot, right: knot });
      strip(B, M, lx, 0, 0.04, l, tone, { w: 0.075 + r() * 0.035, tilt: (r() - 0.5) * 0.16 });
    }
    for (const { G, B } of groups) {
      B.build(G);
      for (const m of G.children) m.castShadow = false;
    }
    const phase = p.x * 0.7 + p.z;
    W.addUpdater((dt, t) => {
      groups.forEach(({ G }, k) => {
        const s = 1.1 + k * 0.23;
        G.rotation.x = Math.sin(t * s + phase + k * 2.1) * 0.08 + Math.sin(t * s * 2.3 + k) * 0.025;
        G.rotation.z = Math.sin(t * 0.7 + phase + k * 1.3) * 0.035;
      });
    });
  },
};

/** Ama's weaving frame: brass bars hung with separated ribbons of every tone and length. */
const ribbonFrame = {
  textures: ['dm_ribbon', 'dm_brass'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on);
    const w = p.w || 3, h = p.h || 2.4;
    const x0 = p.x - w / 2, x1 = p.x + w / 2;
    for (const x of [x0, x1]) B.box({ front: M.brass, back: M.brass, left: M.brass, right: M.brass, top: M.brass }, x, p.z, 0.1, 0.1, 0, h, 0);
    const r = rnd(p.x + p.z * 3);
    for (const y of [h - 0.05, h * 0.62, h * 0.3]) {
      rod(B, M.brass, [x0, y, p.z], [x1, y, p.z], 0.03);
      const n = Math.round(w * 2.4);
      for (let i = 0; i < n; i++) {
        const x = x0 + 0.15 + ((i + 0.5) / n) * (w - 0.3) + (r() - 0.5) * 0.12;
        strip(B, M, x, y, p.z + 0.04, 0.25 + r() * 0.5, ribbonTone(r), { w: 0.05 + r() * 0.03, tilt: (r() - 0.5) * 0.08, dz: 0.02 });
      }
    }
    W.addBox(p.x, p.z, w, 0.3);
  },
};

// ---------------------------------------------------------------- the Moth, the beacon, the iris

/**
 * A builder view that draws into its own group, moved to (x, z) and scaled by s, so the shared Moth
 * builder (which places everything around its own p.x, p.z) can build a smaller skiff at the origin.
 */
function scaledView(W, x, z, s, on) {
  const G = new THREE.Group();
  G.position.set(x, 0, z);
  G.scale.setScalar(s);
  W.groupFor(on).add(G);
  const B = new Batch();
  const view = Object.create(W, {
    batchFor: { value: () => B },
    groupFor: { value: () => G },
    addBox: { value: (cx, cz, w, d) => W.addBox(x + cx * s, z + cz * s, w * s, d * s) },
    addGlow: { value: (sprite, gx, gz) => W.addGlow(sprite, x + gx * s, z + gz * s) },
  });
  return { view, done: () => B.build(G) };
}

/** Nyx's skiff: C1's shared Moth (prologue/props.js buildMoth), plus the Ringborn's moth feelers on the nose. */
const moth = {
  textures: [...MOTH_TEXTURES],
  build(W, p) {
    const M = mats(W);
    const s = p.scale || 1, rot = p.rot || 0;
    const scaled = s !== 1 ? scaledView(W, p.x, p.z, s, p.on) : null;
    const V = scaled ? scaled.view : W;
    const at = scaled ? { x: 0, z: 0 } : p;
    buildMoth(V, { x: at.x, z: at.z, rot, on: p.on });
    // feelers: two thin antennae sweeping up and forward from the nose, a lamp bead at each tip
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const P = (lx, y, lz) => [at.x + lx * cs + lz * sn, y, at.z - lx * sn + lz * cs];
    const B = V.batchFor(p.on), G = V.groupFor(p.on);
    for (const lz of [0.12, -0.12]) {
      const mid = P(-2.8, 2.1, lz * 2.6), tip = P(-3.4, 2.3, lz * 4.4);
      rod(B, M.brass, P(-2.2, 1.25, lz), mid, 0.032);
      rod(B, M.brass, mid, tip, 0.026);
      const bead = makeGlow('#ffb54a', 0.55, 1.3);
      bead.position.set(...tip);
      G.add(bead);
    }
    if (scaled) scaled.done();
  },
};

/** Tobin's beacon: a lattice mast with a brass horn aimed at the rings and a turning lamp. */
const beacon = {
  textures: ['dm_brass', 'dm_cap', 'dm_lantern'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const x = p.x, z = p.z, H = 5.2;
    // round plinth
    const plinth = new THREE.Mesh(wrappedCylinder(1.0, 0.35, { arc: 1, texHeight: 1 }), M.brass);
    plinth.position.set(x, 0, z);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    G.add(plinth);
    B.faceY(M.cap, x - 0.95, x + 0.95, z - 0.95, z + 0.95, 0.35);
    // lattice mast
    const legs = [[-0.42, -0.42], [0.42, -0.42], [0.42, 0.42], [-0.42, 0.42]];
    for (const [lx, lz] of legs) rod(B, M.iron, [x + lx, 0.35, z + lz], [x + lx * 0.45, H, z + lz * 0.45], 0.05);
    for (let y = 0.9; y < H - 0.2; y += 0.85) {
      const k = 1 - (y - 0.35) / (H - 0.35) * 0.55;
      for (let i = 0; i < 4; i++) {
        const [ax, az] = legs[i], [bx, bz] = legs[(i + 1) % 4];
        rod(B, M.iron, [x + ax * k, y, z + az * k], [x + bx * k, y + 0.42, z + bz * k], 0.025);
      }
    }
    // the horn: a flared brass cone aimed north and up, out over the rail
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.12, 1.9, 16, 1, true), M.brass);
    horn.material.side = THREE.DoubleSide;
    horn.position.set(x, H - 0.9, z - 0.9);
    horn.rotation.x = -Math.PI / 2 + 0.45;
    horn.castShadow = true;
    G.add(horn);
    const throat = glow(W, G, '#ffb54a', 1.6, 0.6, x, H - 0.55, z - 1.6, false);
    // the lamp at the top: a housing and a turning beam
    B.box({ front: M.brass, back: M.brass, left: M.brass, right: M.brass, top: M.cap }, x, z, 0.5, 0.5, H, H + 0.45, 0);
    lanternBody(B, M, x, H + 0.4, z, 1.6);
    const lamp = glow(W, G, '#ffc46a', 2.6, 1.2, x, H + 0.25, z + 0.1);
    const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb54a').multiplyScalar(0.5), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const beamGeo = new THREE.ConeGeometry(0.42, 4.6, 12, 1, true);
    beamGeo.translate(0, -2.3, 0);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(x, H + 0.25, z);
    beam.rotation.order = 'YXZ';
    beam.rotation.x = Math.PI / 2 - 0.12;
    G.add(beam);
    W.addEmitter('dm_spark', { position: [x, H + 0.3, z], area: [0.4, 0.2, 0.4], rate: 1.2 });
    W.addCircle(x, z, 1.05);
    return {
      kind: 'dm.beacon',
      update(dt, t) {
        beam.rotation.y = t * 0.8;
        const pulse = 0.75 + Math.max(0, Math.sin(t * 0.9 * Math.PI)) * 0.5;
        lamp.material.color.copy(lamp.userData.baseColor).multiplyScalar(pulse);
        throat.material.color.copy(throat.userData.baseColor).multiplyScalar(0.6 + pulse * 0.4);
        beamMat.opacity = 0.05 + pulse * 0.1;
      },
    };
  },
};

/** The docking iris on the north dock wall: a brass ring, iris blades and a teal force field. */
const iris = {
  textures: ['dm_brass'],
  build(W, p) {
    const M = mats(W);
    const G = W.groupFor(p.on);
    const r = p.r || 1.3, y = r + 0.12, z = p.z + 0.03;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.22, r + 0.18, 32), M.brass);
    ring.position.set(p.x, y, z + 0.02);
    ring.receiveShadow = true;
    G.add(ring);
    const field = new THREE.Mesh(new THREE.CircleGeometry(r - 0.2, 32), new THREE.MeshBasicMaterial({
      color: new THREE.Color('#2fb8b0').multiplyScalar(0.9), transparent: true, opacity: 0.55, fog: false,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    field.position.set(p.x, y, z);
    G.add(field);
    const blades = new THREE.Group();
    blades.position.set(p.x, y, z + 0.01);
    for (let i = 0; i < 8; i++) {
      const bl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, r * 0.55), M.ironDark);
      bl.position.set(0, r * 0.62, 0);
      const holder = new THREE.Group();
      holder.rotation.z = (i / 8) * Math.PI * 2;
      bl.rotation.z = 0.5;
      holder.add(bl);
      blades.add(holder);
    }
    G.add(blades);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      glow(W, G, i % 3 ? '#ffb54a' : '#4fd8cf', 0.35, 1.2, p.x + Math.cos(a) * (r + 0.02), y + Math.sin(a) * (r + 0.02), z + 0.06, false);
    }
    const halo = glow(W, G, '#4fd8cf', r * 2.6, 0.45, p.x, y, z + 0.1, false);
    return {
      kind: 'dm.iris',
      update(dt, t) {
        blades.rotation.z = t * 0.12;
        field.material.opacity = 0.42 + Math.sin(t * 1.4) * 0.1;
        halo.material.color.copy(halo.userData.baseColor).multiplyScalar(0.8 + Math.sin(t * 1.4) * 0.2);
      },
    };
  },
};

// ---------------------------------------------------------------- clutter

const scrap = {
  textures: ['dm_scrap', 'dm_hull_a', 'dm_brass'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on);
    const r = rnd(p.seed ?? p.x * 3 + p.z);
    const w = p.w || 2, d = p.d || 1.4;
    const plates = [M.scrap, M.hull, M.scrap, M.brass, M.cap];
    for (let i = 0; i < 9; i++) {
      const pw = 0.5 + r() * 0.9, pd = 0.4 + r() * 0.6, ph = 0.08 + r() * 0.5;
      const y = (i % 3) * 0.22;
      const m = plates[i % plates.length];
      B.box({ front: m, back: m, left: m, right: m, top: m }, p.x + (r() - 0.5) * (w - pw), p.z + (r() - 0.5) * (d - pd), pw, pd, y, y + ph, r() * 3,
        { front: [0, 0, pw, ph], back: [0, 0, pw, ph], left: [0, 0, pd, ph], right: [0, 0, pd, ph], top: [0, 0, pw, pd] });
    }
    rod(B, M.iron, [p.x - w * 0.3, 0.2, p.z], [p.x + w * 0.1, 1.2, p.z - 0.2], 0.05);
    W.addBox(p.x, p.z, w * 0.9, d * 0.9);
  },
};

const barrels = {
  textures: ['dm_barrel', 'dm_crate'],
  build(W, p) {
    const M = mats(W);
    const G = W.groupFor(p.on), B = W.batchFor(p.on);
    const r = rnd(p.seed ?? p.x + p.z * 7);
    const n = p.n || 3;
    for (let i = 0; i < n; i++) {
      const bx = p.x + (i - (n - 1) / 2) * 0.55 + (r() - 0.5) * 0.1, bz = p.z + (r() - 0.5) * 0.3;
      const mesh = new THREE.Mesh(wrappedCylinder(0.26, 0.8, { arc: 1, texHeight: 1 }), M.barrel);
      mesh.position.set(bx, 0, bz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      G.add(mesh);
      B.faceY(M.cap, bx - 0.24, bx + 0.24, bz - 0.24, bz + 0.24, 0.8);
      W.addCircle(bx, bz, 0.28);
    }
    if (p.crate !== false) {
      B.box({ front: M.crate, back: M.crate, left: M.crate, right: M.crate, top: M.crate }, p.x + n * 0.3, p.z + 0.15, 0.6, 0.6, 0, 0.6, r());
      W.addBox(p.x + n * 0.3, p.z + 0.15, 0.62, 0.62);
    }
  },
};

const crates = {
  textures: ['dm_crate'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on);
    const r = rnd(p.seed ?? p.x * 5 + p.z);
    const n = p.n || 3;
    let y = 0;
    for (let i = 0; i < n; i++) {
      const s = i === 0 ? 0.9 : 0.55 + r() * 0.3;
      const cx = p.x + (i === 0 ? 0 : (r() - 0.5) * 0.4), cz = p.z + (i === 0 ? 0 : (r() - 0.5) * 0.3);
      B.box({ front: M.crate, back: M.crate, left: M.crate, right: M.crate, top: M.crate }, cx, cz, s, s, y, y + s, (r() - 0.5) * 0.5);
      y += s;
      if (i === 1 && r() < 0.5) y = 0;
    }
    W.addBox(p.x, p.z, 0.95, 0.95);
  },
};

const signProp = {
  textures: ['dm_sign_ruse', 'dm_sign_inn', 'dm_sign_noodles'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const w = p.w || 2, h = p.h || 0.75, y = p.y ?? 2.4;
    const mat = W.mats.tile(p.tex, { emissive: 2.8, roughness: 0.5, cast: false });
    const rot = p.rot || 0;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const P = (lx, yy, lz) => [p.x + lx * cs + lz * sn, yy, p.z - lx * sn + lz * cs];
    B.quad(mat, P(-w / 2, y - h, 0.02), P(w / 2, y - h, 0.02), P(w / 2, y, 0.02), P(-w / 2, y, 0.02));
    B.box({ back: M.iron, left: M.iron, right: M.iron, top: M.brass }, p.x, p.z, w + 0.06, 0.04, y - h - 0.03, y + 0.03, rot);
    if (p.chains !== false) for (const lx of [-w / 2 + 0.15, w / 2 - 0.15]) rod(B, M.cable, P(lx, y, 0), P(lx, y + (p.drop ?? 0.4), 0), 0.012);
    if (p.glow !== false) glow(W, G, '#ffb04a', w * 0.9, 0.35, ...P(0, y - h / 2, 0.25), false);
  },
};

const kelp = {
  textures: ['dm_kelp_tank', 'dm_brass'],
  build(W, p) {
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const tank = W.mats.tile('dm_kelp_tank', { emissive: 2.2, roughness: 0.25, metalness: 0.2 });
    const M = mats(W);
    B.box({ front: tank, back: tank, left: tank, right: tank, top: M.brass }, p.x, p.z, 0.9, 0.6, 0, 1.35, p.rot || 0,
      { left: [0.2, 0, 0.8, 1], right: [0.2, 0, 0.8, 1] });
    glow(W, G, '#3fd6a0', 1.4, 0.45, p.x, 0.9, p.z + 0.4);
    W.addEmitter('dm_bubble', { position: [p.x, 0.25, p.z], area: [0.6, 0.1, 0.3], rate: 3 });
    W.addBox(p.x, p.z, 0.94, 0.64);
  },
};

const bunk = {
  textures: ['dm_rug', 'dm_planks_a', 'dm_brass'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on);
    const rot = p.rot || 0;
    B.box({ front: M.planks, back: M.planks, left: M.planks, right: M.planks }, p.x, p.z, 2.0, 0.95, 0, 0.42, rot,
      { front: [0, 0, 2, 0.42], back: [0, 0, 2, 0.42], left: [0, 0, 0.95, 0.42], right: [0, 0, 0.95, 0.42] });
    B.box({ front: M.quilt, back: M.quilt, left: M.quilt, right: M.quilt, top: M.quilt }, p.x + 0.12, p.z, 1.7, 0.85, 0.42, 0.58, rot,
      { top: [0, 0, 1.7, 0.85] });
    B.box({ front: M.bowl, left: M.bowl, right: M.bowl, top: M.bowl }, p.x - 0.72, p.z, 0.36, 0.6, 0.58, 0.72, rot);
    W.addBox(p.x, p.z, 2.0, 0.95);
  },
};

const table = {
  textures: ['dm_planks_a', 'dm_lantern'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    B.box({ front: M.planks, back: M.planks, left: M.planks, right: M.planks, top: M.planks }, p.x, p.z, 1.2, 0.8, 0.62, 0.72, 0);
    B.box({ front: M.iron, back: M.iron, left: M.iron, right: M.iron }, p.x, p.z, 0.16, 0.16, 0, 0.62, 0);
    for (const [sx, sz] of [[-0.85, 0], [0.85, 0], [0, 0.65]]) {
      B.box({ front: M.planks, back: M.planks, left: M.planks, right: M.planks, top: M.planks }, p.x + sx, p.z + sz, 0.36, 0.36, 0, 0.42, 0);
    }
    lanternBody(B, M, p.x + 0.2, 0.98, p.z, 0.9);
    glow(W, G, '#ffb04a', 0.8, 0.7, p.x + 0.2, 0.86, p.z + 0.05);
    B.box({ front: M.bowl, back: M.bowl, left: M.bowl, right: M.bowl, top: M.broth }, p.x - 0.3, p.z + 0.1, 0.2, 0.2, 0.72, 0.8, 0);
    W.addBox(p.x, p.z, 1.3, 0.9);
  },
};

/** The Lantern Tree: a salvaged mast in the middle of the Row, arms of lanterns and ribbons over a ring bench. */
const lanternTree = {
  textures: ['dm_lantern', 'dm_brass', 'dm_ribbon', 'dm_planks_a', 'dm_hull_a', 'dm_cap'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const x = p.x, z = p.z, h = p.h || 3.2, r = rnd(x * 3 + z);
    // ring bench: hull plate skirt, plank seat
    cyl(B, M.hull, 1.0, 1.04, 0.4, 12, x, 0.2, z);
    cyl(B, M.planks, 1.08, 1.08, 0.08, 12, x, 0.44, z);
    // the mast and a brass collar
    B.box({ front: M.iron, back: M.iron, left: M.iron, right: M.iron }, x, z, 0.2, 0.2, 0.48, h, Math.PI / 4);
    B.box({ front: M.brass, back: M.brass, left: M.brass, right: M.brass, top: M.brass }, x, z, 0.32, 0.32, 1.4, 1.56, Math.PI / 4);
    // arms: lanterns hang along each, ribbons between
    const arms = p.arms || 5;
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2 + 0.3;
      const ca = Math.cos(a), sa = Math.sin(a);
      const y0 = h - 0.25 - (i % 2) * 0.35, len = 1.35 + (i % 2) * 0.25;
      rod(B, M.iron, [x, y0 - 0.12, z], [x + ca * len, y0, z + sa * len], 0.03);
      for (const k of [0.55, 1]) {
        const lx = x + ca * len * k, lz = z + sa * len * k, ly = y0 - 0.12 * (1 - k);
        const drop = 0.25 + r() * 0.45;
        rod(B, M.cable, [lx, ly, lz], [lx, ly - drop, lz], 0.01);
        lanternBody(B, M, lx, ly - drop, lz, k === 1 ? 1.25 : 0.95);
      }
      for (let j = 0; j < 3; j++) {
        const k = 0.25 + j * 0.22, lx = x + ca * len * k, lz = z + sa * len * k, ly = y0 - 0.1;
        const l = 0.4 + r() * 0.7, tilt = (r() - 0.5) * 0.12;
        B.quad(M.ribbon, [lx - 0.03 * sa, ly, lz + 0.03 * ca], [lx + 0.03 * sa, ly, lz - 0.03 * ca],
          [lx + 0.03 * sa + tilt, ly - l, lz - 0.03 * ca], [lx - 0.03 * sa + tilt, ly - l, lz + 0.03 * ca], ribbonUv(ribbonTone(r)));
      }
    }
    // the crown: a jar of Tethys-blue glass in a brass cage, the one cold light among the lanterns
    cyl(B, M.jar, 0.16, 0.2, 0.42, 8, x, h + 0.25, z);
    cyl(B, M.brass, 0.22, 0.22, 0.05, 8, x, h + 0.48, z);
    glow(W, G, '#7fe8f0', 2.2, 1.1, x, h + 0.25, z + 0.05);
    W.addEmitter('dm_spark', { position: [x, h, z], area: [1.6, 0.3, 1.6], rate: 0.8 });
    W.addCircle(x, z, 1.12);
  },
};

const hearth = {
  textures: ['dm_brass', 'dm_cap'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    B.box({ front: M.iron, back: M.iron, left: M.iron, right: M.iron, top: M.cap }, p.x, p.z, 1.1, 0.7, 0, 0.9, 0);
    B.faceZ(M.ember, p.x - 0.32, p.x + 0.32, 0.18, 0.55, p.z + 0.36, 1);
    B.box({ front: M.iron, back: M.iron, left: M.iron, right: M.iron }, p.x + 0.3, p.z - 0.1, 0.16, 0.16, 0.9, 2.9, 0);
    B.box({ front: M.brass, back: M.brass, left: M.brass, right: M.brass, top: M.brass }, p.x - 0.25, p.z, 0.36, 0.36, 0.9, 1.15, 0);
    const fire = glow(W, G, '#ff7a2a', 1.2, 0.7, p.x, 0.45, p.z + 0.5);
    W.addBox(p.x, p.z, 1.14, 0.74);
    return {
      kind: 'dm.hearth',
      update(dt, t) {
        const k = 0.8 + Math.sin(t * 11) * 0.08 + Math.sin(t * 17.3) * 0.07;
        fire.material.color.copy(fire.userData.baseColor).multiplyScalar(k);
      },
    };
  },
};

const bench = {
  textures: ['dm_planks_a'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on);
    const w = p.w || 2;
    B.box({ front: M.planks, back: M.planks, left: M.planks, right: M.planks, top: M.planks }, p.x, p.z, w, 0.45, 0.36, 0.46, p.rot || 0,
      { top: [0, 0, w, 0.45] });
    for (const dx of [-w / 2 + 0.2, w / 2 - 0.2]) B.box({ front: M.iron, back: M.iron, left: M.iron, right: M.iron }, p.x + dx, p.z, 0.1, 0.38, 0, 0.36, 0);
    W.addBox(p.x, p.z, w, 0.5);
  },
};

const board = {
  textures: ['dm_board', 'dm_brass'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on), G = W.groupFor(p.on);
    const mat = W.mats.tile('dm_board', { emissive: 2.4, roughness: 0.7 });
    B.box({ front: mat, back: M.planks, left: M.planks, right: M.planks, top: M.brass }, p.x, p.z, 2.0, 0.12, 0.7, 1.7, 0);
    for (const dx of [-0.9, 0.9]) B.box({ front: M.iron, back: M.iron, left: M.iron, right: M.iron }, p.x + dx, p.z, 0.1, 0.1, 0, 0.7, 0);
    glow(W, G, '#ffb04a', 0.8, 0.25, p.x, 1.5, p.z + 0.3, false);
    W.addBox(p.x, p.z, 2.0, 0.3);
  },
};

const shelf = {
  textures: ['dm_planks_a', 'dm_crate', 'dm_scrap', 'dm_brass'],
  build(W, p) {
    const M = mats(W);
    const B = W.batchFor(p.on);
    const w = p.w || 2;
    for (const dx of [-w / 2 + 0.05, w / 2 - 0.05]) B.box({ front: M.iron, back: M.iron, left: M.iron, right: M.iron }, p.x + dx, p.z, 0.08, 0.5, 0, 2.0, 0);
    const r = rnd(p.x + p.z);
    for (const y of [0.5, 1.15, 1.8]) {
      B.box({ front: M.planks, back: M.planks, left: M.planks, right: M.planks, top: M.planks }, p.x, p.z, w, 0.5, y - 0.05, y, 0, { top: [0, 0, w, 0.5] });
      for (let i = 0; i < 4; i++) {
        const s = 0.14 + r() * 0.2;
        const m = [M.crate, M.scrap, M.brass, M.jar, M.barrel][Math.floor(r() * 5)];
        B.box({ front: m, back: m, left: m, right: m, top: m }, p.x - w / 2 + 0.25 + i * (w - 0.5) / 3, p.z + (r() - 0.5) * 0.15, s, s, y, y + s, r());
      }
    }
    W.addBox(p.x, p.z, w, 0.52);
  },
};

export default {
  'dm.lanterns': lanterns,
  'dm.post': post,
  'dm.pylon': pylon,
  'dm.stall': stall,
  'dm.counter': counterProp,
  'dm.ribbons': ribbons,
  'dm.ribbon_frame': ribbonFrame,
  'dm.moth': moth,
  'dm.beacon': beacon,
  'dm.iris': iris,
  'dm.scrap': scrap,
  'dm.barrels': barrels,
  'dm.crates': crates,
  'dm.sign': signProp,
  'dm.kelp': kelp,
  'dm.bunk': bunk,
  'dm.table': table,
  'dm.hearth': hearth,
  'dm.lantern_tree': lanternTree,
  'dm.bench': bench,
  'dm.board': board,
  'dm.shelf': shelf,
};
