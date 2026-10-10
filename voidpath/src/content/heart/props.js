// heart: prop builders (browser, TECH_PLAN 3.3). The cathedral is drawn here, over the cells the
// World draws from maps/heart.js: smooth ring decks and pads with real rims and hanging undersides,
// balustrades, hard-light bridges with thickness, the falling columns of gold light with their
// turning rings, thousands of Choir pods, the cathedral's piers, lift pads, pylons and the Crown.
// Static parts merge into the World's batches; what moves lives in groups and animates through
// W.addUpdater. Materials come from W.mats (or are made per World and reachable from W.scene).
//
//   heart.tiers        { }      every platform of layout.js: decks in concentric bands (radial
//                               tiling), gold inlay rings, rims, keel undersides with corbels and
//                               hanging pods, outer balustrades (open where a bridge or pad joins),
//                               glowing inner lips over the shafts, the permanent bridges
//   heart.column       { x, z, ring }   a shaft's falling column of light, three turning gilt rings,
//                               bands of the hymn written in light turning round it, rings of pods
//                               down the shaft wall (the Crown: light rising from the oculus instead)
//   heart.abyss        { }      the deep: drifting pod-stars, the cathedral's piers, pennants
//   heart.liftPad      { x, z, r, pad }  a lift's ring of spires, its glyph and its column of light
//   heart.bridge       gate: a hard-light bridge along a layout span (`bridge` id) that draws
//                               itself out of light; closed, a ghost of dotted light   LivingProp setOpen
//   heart.pylon        switch: a gilt obelisk whose crystal wakes gold              LivingProp setState
//   heart.reliquary    chest: a gilded reliquary whose lid lifts on gold light       LivingProp setOpen
//   heart.screenStand  { x, z, rot = 0, s = 1 }   a gothic stand behind a `screen` prop (WARDEN)
//   heart.organ        { x, z }  a cluster of singing organ pipes
//   heart.crown        { x, z }  the Crown's focal piece: gilt fins round the oculus, rings turning
//                               above it, the light rising; LivingProp setState(dawn) whitens it
//   heart.med          a Med-Station: a gilt font of soft white light
//   heart.fabricator   the Halcyon's fabricator, gilded over: a console with a gold readout
//   heart.cache        Nyx's cache: a sealed maintenance locker with a gold lock
//   heart.fall         the falling light (the one-way way down): a column of light to step into

import * as THREE from 'three';
import { makeGlow, makeLightShaft } from '../../core/vfx.js';
import { Batch } from '../../world/geometry.js';
import { textureSet, glowSet } from '../../art/tiles.js';
import { RINGS, PADS, SLABS, BRIDGES, W as GW, H as GH, buildGrid, ringPoint } from './maps/layout.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();

/** Seeded random in [0, 1). */
function rnd(seed) {
  let s = (Math.floor(Math.abs(seed) * 9973) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Merge `geo` into batch B at pos, Euler [rx, ry, rz] (YXZ) and scale s (number or [x, y, z]). */
function put(B, mat, geo, pos, rot = null, s = 1) {
  _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, 'YXZ');
  _q.setFromEuler(_e);
  _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, typeof s === 'number' ? _s.setScalar(s) : _s.set(s[0], s[1], s[2]));
  B.geometry(mat, geo, _m);
  geo.dispose();
}

/**
 * A quad a-b-c-d (a pair of triangles) whose front faces `want` (a direction): the vertex order is
 * flipped when the corners wind the other way, so sweeps never need to think about winding.
 */
function face(B, mat, a, b, c, d, uv, want) {
  _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  _b.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
  _n.crossVectors(_a, _b);
  if (_n.x * want[0] + _n.y * want[1] + _n.z * want[2] >= 0) B.quad(mat, a, b, c, d, uv);
  else B.quad(mat, b, a, d, c, uv && [uv[2], uv[1], uv[0], uv[3]]);
}

/** A camera-facing glow; linked glows follow the nearest virtual light (pulse, flicker). */
function glow(W, G, color, size, intensity, x, y, z, link = true) {
  const s = makeGlow(color, size, intensity);
  s.position.set(x, y, z);
  G.add(s);
  if (link) W.addGlow(s, x, z);
  return s;
}

function tintGlow(s, color, k = 1) {
  s.material.color.set(color).multiplyScalar(k);
  if (s.userData.baseColor) s.userData.baseColor.copy(s.material.color);
}

/** Unlit additive material (beams, rings, lips, halos); it never casts a shadow when batched. */
function additive(color, k = 1, opacity = 1, map = null) {
  const m = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(k), map, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
  });
  m.userData.cast = false;
  m.userData.receive = false;
  return m;
}

/** Shared lit materials of the Heart, built once per World. */
function mats(W) {
  if (W.heartMats) return W.heartMats;
  const M = W.mats;
  W.heartMats = {
    floor: M.tile('hr_floor', { emissive: 2.2, roughness: 0.45, metalness: 0.4, cast: false }),
    floorB: M.tile('hr_floor_b', { emissive: 2.2, roughness: 0.45, metalness: 0.4, cast: false }),
    crown: M.tile('hr_crown', { emissive: 2.4, roughness: 0.4, metalness: 0.45, cast: false }),
    pad: M.tile('hr_pad', { emissive: 2.4, roughness: 0.4, metalness: 0.5, cast: false }),
    slab: M.tile('hr_slab', { emissive: 2.2, roughness: 0.5, metalness: 0.35, cast: false }),
    bridge: M.tile('hr_bridge', { emissive: 0.7, roughness: 0.3, metalness: 0.3, cast: false }),
    edge: M.tile('hr_edge', { emissive: 2.4, roughness: 0.45, metalness: 0.45, cast: false }),
    under: M.tile('hr_under', { emissive: 2.0, roughness: 0.5, metalness: 0.3, cast: false }),
    gilt: M.tile('hr_gilt', { emissive: 2.0, roughness: 0.32, metalness: 0.65 }),
    giltFlat: M.tile('hr_gilt', { emissive: 2.0, roughness: 0.32, metalness: 0.65, cast: false }),
    inlay: M.tile('hr_gilt', { emissive: 4.2, roughness: 0.3, metalness: 0.6, cast: false }),
    pod: M.tile('hr_pod', { emissive: 1.5, roughness: 0.35, metalness: 0.4, cast: false }),
    lip: additive('#ffc860', 1.15, 0.9),
    // the hard-light bridges' light: the line along each curb, the rails, the glow under the keel
    curbLine: additive('#ffd27a', 0.6),
    railLine: additive('#ffe0a0', 0.3),
    keelGlow: additive('#ff9a3c', 0.16, 0.55),
  };
  return W.heartMats;
}

// ---------------------------------------------------------------- the floor plan, sampled

let GRID = null;
const grid = () => (GRID ||= buildGrid());
/** True when the cell under (x, z) is walkable (anything but void). */
const solidAt = (x, z) => {
  const c = Math.floor(x), r = Math.floor(z);
  return r >= 0 && r < GH && c >= 0 && c < GW && grid()[r][c] !== ' ';
};

/** The angle ranges along a circle of radius rr round (cx, cz) where nothing joins from outside. */
function railRuns(cx, cz, rr, a0, a1, probe) {
  const runs = [];
  const step = 2;
  let start = null;
  for (let a = a0; a <= a1 + 0.001; a += step) {
    const t = a * DEG;
    const open = solidAt(cx + Math.cos(t) * (rr + probe), cz + Math.sin(t) * (rr + probe));
    if (!open && start === null) start = a;
    if ((open || a + step > a1 + 0.001) && start !== null) {
      const end = open ? a - step : a;
      if (end - start >= step * 2) runs.push([start, end]);
      start = null;
    }
  }
  return runs;
}

/** Points along an arc, about `seg` units apart. */
function arcSteps(a0, a1, r, seg = 0.5) {
  const n = Math.max(2, Math.ceil(((a1 - a0) * DEG * r) / seg));
  return Array.from({ length: n + 1 }, (_, i) => a0 + ((a1 - a0) * i) / n);
}

/**
 * Sweep a profile [[r, y, v], ...] round (cx, cz) over the arc a0..a1 (degrees); each strip faces
 * away from the axis (`out` > 0) or toward it, and down when the profile says so (`down`).
 */
function sweep(B, mat, cx, cz, a0, a1, profile, { out = 1, seg = 0.5, uScale = 1 } = {}) {
  const rMax = Math.max(...profile.map((p) => p[0]));
  const steps = arcSteps(a0, a1, rMax, seg);
  for (let i = 0; i + 1 < steps.length; i++) {
    const t0 = steps[i] * DEG, t1 = steps[i + 1] * DEG;
    const tm = (t0 + t1) / 2;
    for (let j = 0; j + 1 < profile.length; j++) {
      const [r0, y0, v0] = profile[j], [r1, y1, v1] = profile[j + 1];
      const P = (r, y, t) => [cx + Math.cos(t) * r, y, cz + Math.sin(t) * r];
      const rm = (r0 + r1) / 2;
      const uv = [t0 * rm * uScale, v1, t1 * rm * uScale, v0];
      // outward normal of the profile segment in the (r, y) plane, then turned to this angle
      const dr = r1 - r0, dy = y1 - y0;
      const nr = dy * out, ny = -dr * out;
      const want = [Math.cos(tm) * nr, ny, Math.sin(tm) * nr];
      face(B, mat, P(r1, y1, t0), P(r1, y1, t1), P(r0, y0, t1), P(r0, y0, t0), uv, want);
    }
  }
}

/** A flat annulus band (deck) from r0 to r1 over a0..a1 at height y, tiled along the arc. */
function deckBand(B, mat, cx, cz, a0, a1, r0, r1, y = 0.006) {
  const steps = arcSteps(a0, a1, r1, 0.45);
  for (let i = 0; i + 1 < steps.length; i++) {
    const t0 = steps[i] * DEG, t1 = steps[i + 1] * DEG;
    const P = (r, t) => [cx + Math.cos(t) * r, y, cz + Math.sin(t) * r];
    const rm = (r0 + r1) / 2;
    face(B, mat, P(r0, t0), P(r0, t1), P(r1, t1), P(r1, t0), [t0 * rm, r0, t1 * rm, r1], [0, 1, 0]);
  }
}

/** The cross-section of a ring gallery: top rim, keel, inner rim (r, y, v for the texture). */
const keel = (rIn, rOut, depth = 4.2) => {
  const rm = (rIn + rOut) / 2;
  return [
    [rOut - 0.25, -0.6, 0], [rOut - 0.9, -1.4, 0.8], [rOut - 1.6, -2.6, 2.0], [rm + 0.2, -depth, 3.6],
    [rm - 0.6, -depth + 0.4, 4.4], [rIn + 0.9, -2.2, 6.0], [rIn + 0.3, -1.1, 7.2], [rIn, -0.6, 7.8],
  ];
};

/** Cap the open end of a swept profile at angle a (degrees) with a fan of quads. */
function capEnd(B, mat, cx, cz, a, profile, facing) {
  const t = a * DEG;
  const P = ([r, y]) => [cx + Math.cos(t) * r, y, cz + Math.sin(t) * r];
  const tang = [-Math.sin(t) * facing, 0, Math.cos(t) * facing];
  const cr = profile.reduce((s, p) => s + p[0], 0) / profile.length;
  const cy = profile.reduce((s, p) => s + p[1], 0) / profile.length;
  const c = P([cr, cy]);
  for (let j = 0; j + 1 < profile.length; j++) {
    const a0 = P(profile[j]), a1 = P(profile[j + 1]);
    face(B, mat, a0, a1, c, c, [0, 0, 1, 1], tang);
  }
}

// ---------------------------------------------------------------- shared pods

/** A Choir pod: a six-sided lathed capsule (about 60 triangles), the window texture round it. */
function podGeometry() {
  const prof = [[0.001, -0.42], [0.13, -0.34], [0.2, -0.16], [0.2, 0.16], [0.13, 0.34], [0.001, 0.42]];
  return new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 6);
}

/**
 * Hanging pods as one InstancedMesh: `list` of { x, y, z, ry, s }. The pod window glows; a fine
 * cable runs up from each (merged into the batch by the caller when wanted).
 */
function podMesh(W, G, list) {
  if (!list.length) return null;
  const M = mats(W);
  const mesh = new THREE.InstancedMesh(podGeometry(), M.pod, list.length);
  list.forEach((p, i) => {
    _e.set(p.tilt || 0, p.ry || 0, 0, 'YXZ');
    _q.setFromEuler(_e);
    _m.compose(_p.set(p.x, p.y, p.z), _q, _s.setScalar(p.s || 1));
    mesh.setMatrixAt(i, _m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.computeBoundingSphere();
  G.add(mesh);
  return mesh;
}

/** Distant pods as points of warm light (one draw for thousands). */
function podStars(G, list, size = 0.5) {
  const pos = new Float32Array(list.length * 3);
  const col = new Float32Array(list.length * 3);
  const c = new THREE.Color();
  list.forEach((p, i) => {
    pos.set([p.x, p.y, p.z], i * 3);
    c.set(p.color || '#ffd890').multiplyScalar(p.k ?? 1);
    col.set([c.r, c.g, c.b], i * 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const tex = starTexture();
  const mat = new THREE.PointsMaterial({
    size, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  G.add(pts);
  return pts;
}

// A soft round dot for the pod-stars (shared; survives World.dispose).
let STAR = null;
function starTexture() {
  if (STAR) return STAR;
  const N = 32;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot((x + 0.5) / N * 2 - 1, (y + 0.5) / N * 2 - 1);
    const v = d >= 1 ? 0 : (1 - d) ** 2.2;
    const i = (y * N + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(v * 255);
  }
  STAR = new THREE.DataTexture(data, N, N);
  STAR.magFilter = THREE.LinearFilter;
  STAR.minFilter = THREE.LinearFilter;
  STAR.needsUpdate = true;
  STAR.userData.shared = true;
  return STAR;
}

// ---------------------------------------------------------------- the tiers

/** Rings: decks in three bands, gold inlays, rims, keels, corbels with hanging pods, rails, lips. */
function buildRing(W, B, ring, pods, r0) {
  const M = mats(W);
  const { cx, cz, rIn, rOut } = ring;
  const isCrown = ring.id === 'crown';
  const deck = isCrown ? M.crown : M.floor;
  const band = M.floorB;
  const arcs = ring.arcs.map(([a0, a1]) => (a1 - a0 >= 360 ? [0, 360] : [a0, a1]));
  for (const [a0, a1] of arcs) {
    const full = a1 - a0 >= 360;
    // the deck: an inner band, the walkway, an outer band; gold inlay rings between them
    const bi = rIn + (isCrown ? 1.2 : 0.9), bo = rOut - 0.9;
    // (the Crown's walkway rings out from the oculus: marble, a band of plain flagstones, marble)
    const m0 = bi + (bo - bi) * 0.34, m1 = bi + (bo - bi) * 0.62;
    const runs = isCrown ? [[rIn, bi, band], [bi, m0, deck], [m0, m1, M.floor], [m1, bo, deck], [bo, rOut, band]]
      : [[rIn, bi, band], [bi, bo, deck], [bo, rOut, band]];
    for (const [q0, q1, mat] of runs) deckBand(B, mat, cx, cz, a0, a1, q0, q1);
    for (const r of isCrown ? [bi, m0, m1, bo] : [bi, bo]) deckBand(B, M.inlay, cx, cz, a0, a1, r - 0.035, r + 0.035, 0.008);
    // rims and the keel underneath
    sweep(B, M.edge, cx, cz, a0, a1, [[rOut, 0, 1], [rOut, -0.6, 0.4]], { out: 1 });
    sweep(B, M.edge, cx, cz, a0, a1, [[rIn, -0.6, 0.4], [rIn, 0, 1]], { out: -1 });
    const k = keel(rIn, rOut, isCrown ? 5.2 : 4.2);
    sweep(B, M.under, cx, cz, a0, a1, [[rOut, -0.6, 0], ...k.slice(1, -1), [rIn, -0.6, 8]], { out: 1, seg: 0.7 });
    if (!full) {
      const prof = [[rOut, 0], [rOut, -0.6], ...k.slice(1, -1).map(([r, y]) => [r, y]), [rIn, -0.6], [rIn, 0]];
      capEnd(B, M.under, cx, cz, a0, prof, -1);
      capEnd(B, M.under, cx, cz, a1, prof, 1);
      // gilt end posts where a broken arc stops
      for (const a of [a0, a1]) {
        const [x, z] = ringPoint(ring, a, (rIn + rOut) / 2);
        put(B, M.gilt, new THREE.CylinderGeometry(0.16, 0.2, 1.3, 6), [x, 0.65, z]);
        put(B, M.inlay, new THREE.OctahedronGeometry(0.16, 0), [x, 1.42, z]);
      }
    }
    // corbels under the outer rim, every ~18 degrees, each holding a pod on a cable
    for (let a = a0 + 9; a < a1 - 4; a += 18) {
      const t = a * DEG, ca = Math.cos(t), sa = Math.sin(t);
      const x = cx + ca * (rOut - 0.1), z = cz + sa * (rOut - 0.1);
      put(B, M.edge, new THREE.BoxGeometry(0.34, 1.1, 0.5), [x, -1.05, z], [0, -t + Math.PI / 2, 0]);
      put(B, M.gilt, new THREE.BoxGeometry(0.4, 0.12, 0.56), [x, -0.5, z], [0, -t + Math.PI / 2, 0]);
      const len = 1.6 + r0() * 3.2;
      const px = cx + ca * (rOut + 0.35), pz = cz + sa * (rOut + 0.35);
      put(B, M.giltFlat, new THREE.BoxGeometry(0.03, len, 0.03), [px, -1.2 - len / 2, pz]);
      pods.push({ x: px, y: -1.55 - len, z: pz, ry: -t + Math.PI / 2, s: 1.1 });
    }
    // the outer balustrade, open where anything joins from outside
    for (const [s0, s1] of railRuns(cx, cz, rOut, a0, a1, 0.7)) {
      const rr = rOut - 0.14;
      sweep(B, M.gilt, cx, cz, s0, s1, [[rr - 0.06, 0.6, 1], [rr + 0.06, 0.6, 0.9]], { out: 1 });
      sweep(B, M.gilt, cx, cz, s0, s1, [[rr + 0.06, 0.6, 0.9], [rr + 0.06, 0.5, 0.7]], { out: 1 });
      sweep(B, M.gilt, cx, cz, s0, s1, [[rr - 0.06, 0.5, 0.7], [rr - 0.06, 0.6, 0.9]], { out: -1 });
      for (const a of arcSteps(s0, s1, rr, 0.9)) {
        const [x, z] = ringPoint(ring, a, rr);
        put(B, M.gilt, new THREE.BoxGeometry(0.08, 0.5, 0.08), [x, 0.25, z], [0, -a * DEG, 0]);
      }
    }
    // the inner lip: a glowing kerb over the shaft, open where a chord bridge joins
    for (const [s0, s1] of railRuns(cx, cz, rIn, a0, a1, -0.6)) {
      sweep(B, M.lip, cx, cz, s0, s1, [[rIn + 0.02, 0.05, 1], [rIn + 0.02, -0.18, 0]], { out: -1 });
    }
  }
}

/** Round pads: a gilt deck, its rim and a short keel. */
function buildPad(W, B, pad) {
  const M = mats(W);
  const { cx, cz, r } = pad;
  // pads sit a hair above the galleries they overlap (no depth fighting where they join)
  deckBand(B, M.pad, cx, cz, 0, 360, 0.0001, r - 0.35, 0.013);
  deckBand(B, M.inlay, cx, cz, 0, 360, r - 0.35, r - 0.28, 0.015);
  deckBand(B, M.floorB, cx, cz, 0, 360, r - 0.28, r, 0.013);
  sweep(B, M.edge, cx, cz, 0, 360, [[r, 0, 1], [r, -0.5, 0.5]], { out: 1, seg: 0.4 });
  sweep(B, M.under, cx, cz, 0, 360, [[r, -0.5, 0], [r - 0.6, -1.4, 1], [r * 0.4, -2.6, 2.2], [0.3, -3.4, 3]], { out: 1, seg: 0.5 });
  for (const [s0, s1] of railRuns(cx, cz, r, 0, 360, 0.7)) {
    const rr = r - 0.14;
    sweep(B, M.gilt, cx, cz, s0, s1, [[rr - 0.06, 0.6, 1], [rr + 0.06, 0.6, 0.9]], { out: 1 });
    for (const a of arcSteps(s0, s1, rr, 0.9)) {
      const t = a * DEG;
      put(B, M.gilt, new THREE.BoxGeometry(0.08, 0.5, 0.08), [cx + Math.cos(t) * rr, 0.25, cz + Math.sin(t) * rr]);
    }
  }
}

/** Straight slabs: a smooth chamfered deck over the cells, rims, a stepped underside, a glow below. */
function buildSlab(W, B, G, slab) {
  const M = mats(W);
  const [c0, r0, c1, r1] = slab.rect;
  const x0 = c0, x1 = c1 + 1, z0 = r0, z1 = r1 + 1, k = slab.cut;
  const poly = k ? [[x0 + k, z0], [x1 - k, z0], [x1, z0 + k], [x1, z1 - k], [x1 - k, z1], [x0 + k, z1], [x0, z1 - k], [x0, z0 + k]]
    : [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const mat = slab.ch === '.' ? M.floor : M.slab;
  // deck: the chamfered outline, world-tiled like the cells (u = x, v = -z: texture top = north)
  const deck = new THREE.ShapeGeometry(new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z))));
  deck.rotateX(-Math.PI / 2);
  put(B, mat, deck, [0, 0.003, 0]);   // under the galleries where a slab meets one
  // the Choir's light pooling in the haze below it, so the slab hangs over light, not black
  const haze = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0) * 2.2, (z1 - z0) * 1.8), additive('#d08a30', 0.3, 1, starTexture()));
  haze.rotation.x = -Math.PI / 2;
  haze.position.set((x0 + x1) / 2, -3.2, (z0 + z1) / 2);
  haze.renderOrder = -1;
  G.add(haze);
  // the runner: a strip of hard light down the slab between two gilt inlays, its chevrons pointing
  // the way on (toward +x or +z, or back when `back`)
  if (slab.runner) {
    const { axis, at, w, from, to, back } = slab.runner;
    const [a0, a1] = axis === 'x' ? [x0 + 0.15, x1 - 0.15] : [z0 + 0.15, z1 - 0.15];
    const u0 = from ?? a0, u1 = to ?? a1;
    const strip = (y, half, m) => {
      const a = (o, t) => (axis === 'x' ? [t, y, at + o] : [at + o, y, t]);
      face(B, m, a(-half, u0), a(-half, u1), a(half, u1), a(half, u0), back ? [u1, at - half, u0, at + half] : [u0, at - half, u1, at + half], [0, 1, 0]);
    };
    strip(0.006, w / 2, M.bridge);
    for (const sd of [-1, 1]) {
      const a = (o, t) => (axis === 'x' ? [t, 0.009, at + sd * w / 2 + o] : [at + sd * w / 2 + o, 0.009, t]);
      face(B, M.inlay, a(-0.04, u0), a(-0.04, u1), a(0.04, u1), a(0.04, u0), [0, 0, 1, 1], [0, 1, 0]);
    }
  }
  // rims on every edge that faces the void, a stepped underside below
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = (b[1] - a[1]) / len, nz = -(b[0] - a[0]) / len;   // outward for a clockwise-in-screen polygon
    const out = [nx, 0, nz];
    face(B, M.edge, [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], -0.6, b[1]], [a[0], -0.6, a[1]], [0, 1, len, 0.4], out);
    const inset = (p, d) => [p[0] - nx * d, p[1] - nz * d];
    const a2 = inset(a, 0.6), b2 = inset(b, 0.6), a3 = inset(a, 1.4), b3 = inset(b, 1.4);
    face(B, M.under, [a[0], -0.6, a[1]], [b[0], -0.6, b[1]], [b2[0], -1.6, b2[1]], [a2[0], -1.6, a2[1]], [0, 0, len, 1], [nx, -0.6, nz]);
    face(B, M.under, [a2[0], -1.6, a2[1]], [b2[0], -1.6, b2[1]], [b3[0], -2.8, b3[1]], [a3[0], -2.8, a3[1]], [0, 1, len, 2], [nx, -0.6, nz]);
    // rail along the edge where nothing joins
    const n = Math.max(1, Math.round(len / 0.9));
    for (let s = 0; s <= n; s++) {
      const x = a[0] + ((b[0] - a[0]) * s) / n - nx * 0.14, z = a[1] + ((b[1] - a[1]) * s) / n - nz * 0.14;
      if (solidAt(x + nx * 0.8, z + nz * 0.8)) continue;
      put(B, M.gilt, new THREE.BoxGeometry(0.08, 0.5, 0.08), [x, 0.25, z]);
      if (s < n) {
        const x2 = a[0] + ((b[0] - a[0]) * (s + 1)) / n - nx * 0.14, z2 = a[1] + ((b[1] - a[1]) * (s + 1)) / n - nz * 0.14;
        if (solidAt(x2 + nx * 0.8, z2 + nz * 0.8)) continue;
        const l = Math.hypot(x2 - x, z2 - z);
        put(B, M.gilt, new THREE.BoxGeometry(l, 0.08, 0.1), [(x + x2) / 2, 0.56, (z + z2) / 2], [0, -Math.atan2(z2 - z, x2 - x), 0]);
      }
    }
  }
}

/** Multiply a geometry's uvs (tiles a box or plane along its length). */
function uvScale(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}

const at4 = (x, y, z, ry = 0) => new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0, 'YXZ')), _s.setScalar(1));

/**
 * A hard-light bridge `len` long and `w` wide along local +x from 0 (local z across it): the
 * hard-light deck, curbs of navy stone with a gilt lip and a line of light, a shallow keel underneath
 * with a glow below it, rails of light on gilt posts. `add(mat, geo, matrix)` takes each part (a
 * Batch: permanent spans merge into the World's batch, drawn ones into their own group).
 */
function bridgeParts(M, len, w, deckMat, add) {
  const hw = w / 2;
  const deck = uvScale(new THREE.PlaneGeometry(len, w - 0.3), len, w - 0.3);
  deck.rotateX(-Math.PI / 2);
  add(deckMat, deck, at4(len / 2, 0.012, 0));
  for (const sd of [-1, 1]) {
    add(M.edge, uvScale(new THREE.BoxGeometry(len, 0.36, 0.2), len, 1), at4(len / 2, -0.1, sd * (hw - 0.1)));
    add(M.curbLine, new THREE.BoxGeometry(len, 0.025, 0.05), at4(len / 2, 0.085, sd * (hw - 0.1)));
    // the keel: a slope of stone from under each curb to the spine
    const k = new THREE.PlaneGeometry(len, Math.hypot(hw, 0.36));
    uvScale(k, len, 1);
    k.rotateX(Math.PI / 2 - sd * Math.atan2(0.36, hw));
    add(M.under, k, at4(len / 2, -0.46, sd * hw * 0.5));
    // rails of light on gilt posts
    const n = Math.max(2, Math.round(len / 1.1));
    for (let i = 1; i < n; i++) add(M.gilt, new THREE.BoxGeometry(0.06, 0.4, 0.06), at4((len * i) / n, 0.27, sd * (hw - 0.1)));
    add(M.railLine, new THREE.BoxGeometry(len, 0.03, 0.03), at4(len / 2, 0.46, sd * (hw - 0.1)));
  }
  const glowPlane = new THREE.PlaneGeometry(len, w * 1.7);
  glowPlane.rotateX(Math.PI / 2);
  add(M.keelGlow, glowPlane, at4(len / 2, -0.7, 0));
}

/** A permanent hard-light bridge, merged into the World's batch. */
function staticBridge(W, B, b) {
  const M = mats(W);
  const [ax, az] = b.a, [bx, bz] = b.b;
  const len = Math.hypot(bx - ax, bz - az);
  const place = at4(ax, 0, az, -Math.atan2(bz - az, bx - ax));
  bridgeParts(M, len, b.w, M.bridge, (mat, geo, m) => {
    B.geometry(mat, geo, place.clone().multiply(m));
    geo.dispose();
  });
}

const tiers = {
  textures: ['hr_floor', 'hr_floor_b', 'hr_crown', 'hr_pad', 'hr_slab', 'hr_bridge', 'hr_edge', 'hr_under', 'hr_gilt', 'hr_pod'],
  build(W) {
    const B = W.batchFor(null), G = W.groupFor(null);
    const r0 = rnd(41);
    const pods = [];
    for (const ring of RINGS) buildRing(W, B, ring, pods, r0);
    for (const pad of PADS) buildPad(W, B, pad);
    for (const slab of SLABS) buildSlab(W, B, G, slab);
    for (const b of BRIDGES) if (b.ch === '=') staticBridge(W, B, b);
    podMesh(W, G, pods);
  },
};

// ---------------------------------------------------------------- the columns of light

/** A shaft's falling column: layered beams, turning gilt rings, rings of pods down the wall. */
const column = {
  textures: ['hr_column', 'hr_staff', 'hr_gilt', 'hr_pod'],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on);
    const ring = RINGS.find((r) => r.id === p.ring);
    const crown = ring.id === 'crown';
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    G.add(g);
    // the beam: scrolling streaks in two shells, a billboard volume around them. It burns below the
    // decks only: above them it would stand between the camera and a chord bridge (the falling motes
    // carry the light down from above)
    const top = crown ? 0.2 : -0.3, bot = -24;
    const h = top - bot;
    const sets = [];
    const shells = crown ? [[1.6, 0.7, 0.55]] : [[0.7, 0.75, 0.75], [1.4, 0.3, 0.45]];
    for (const [r, k, op] of shells) {
      const set = textureSet('hr_column', { repeat: [3, h / 8] });
      sets.push(set);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24, 1, true), additive('#ffc860', k, op, set.map));
      cyl.position.y = (top + bot) / 2;
      cyl.renderOrder = 4;
      g.add(cyl);
    }
    const beam = makeLightShaft({ width: crown ? 3.0 : 2.4, height: h, color: '#ffcf70', opacity: crown ? 0.1 : 0.06, spread: 1.15, dust: 1.4, floorY: bot, floorFade: 6 });
    beam.position.y = top;
    g.add(beam);
    // the turning rings: gilt bands with a glowing inner edge and lit studs, tilted, each at its own
    // pace, stepping down the shaft below the decks (no bridge passes through one)
    const ringLine = additive('#ffd890', 0.7);
    const rings = (crown ? [[2.6, -1.6, 0.18], [3.6, -4.2, -0.12]]
      : [[ring.rIn - 1.4, -2.0, 0.07], [ring.rIn - 3.0, -5.2, -0.12], [ring.rIn - 2.2, -9.6, 0.1]]).map(([r, y, tilt], i) => {
      const holder = new THREE.Group();
      holder.position.y = y;
      holder.rotation.set(tilt, 0, tilt * 0.7);
      const parts = new Batch();
      const flat = new THREE.Matrix4().makeRotationX(Math.PI / 2);
      parts.geometry(M.giltFlat, new THREE.TorusGeometry(r, 0.11, 6, 72), flat);
      parts.geometry(ringLine, new THREE.TorusGeometry(r - 0.13, 0.025, 4, 72), flat);
      for (let k = 0; k < 12; k++) parts.geometry(M.inlay, new THREE.OctahedronGeometry(0.09, 0), at4(Math.cos((k / 12) * TAU) * r, 0, Math.sin((k / 12) * TAU) * r));
      for (const m of parts.build(holder)) m.matrixAutoUpdate = true;
      g.add(holder);
      return { holder, speed: (i % 2 ? -1 : 1) * (0.07 + i * 0.03), tilt };
    });
    // the hymn written in light: bands of notation turning round the column as it falls, the digital
    // half of the cathedral (the Choir's song as WARDEN keeps it)
    const staves = (crown ? [[2.2, 1.6, 0.5]] : [[2.4, -1.0, 0.5], [2.0, -3.2, 0.45], [2.7, -6.6, 0.5]]).map(([r, y, h], i) => {
      const set = textureSet('hr_staff', { repeat: [Math.round(r * 2), 1] });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40, 1, true), additive('#ffd890', 0.9, 0.85, set.map));
      band.position.y = y;
      band.renderOrder = 5;
      g.add(band);
      return { band, speed: (i % 2 ? -1 : 1) * (0.12 + i * 0.05) };
    });
    // rings of pods down the shaft wall: the near ones as pods, the deep ones as stars
    const pods = [], stars = [];
    const rWall = ring.rIn - 0.7;
    const r1 = rnd(p.x * 13 + p.z);
    if (!crown) {
      for (let level = 0; level < 9; level++) {
        const y = -2.4 - level * 2.6;
        const n = 22 + level;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU + level * 0.21;
          const x = Math.cos(a) * rWall, z = Math.sin(a) * rWall;
          if (level < 2 && k % 2 === 0) pods.push({ x: p.x + x, y, z: p.z + z, ry: -a - Math.PI / 2, s: 1.0 });
          else stars.push({ x: p.x + x, y, z: p.z + z, k: 1.1 - level * 0.08, color: r1() < 0.1 ? '#cfe2ff' : '#ffd890' });
        }
      }
    }
    for (let k = 0; k < (crown ? 120 : 260); k++) {
      const a = r1() * TAU, rr = 1.8 + r1() * (ring.rIn - 2.2);
      stars.push({ x: p.x + Math.cos(a) * rr, y: -6 - r1() * 20, z: p.z + Math.sin(a) * rr, k: 0.5 + r1() * 0.6, color: r1() < 0.15 ? '#cfe2ff' : '#ffe0a0' });
    }
    podMesh(W, G, pods);
    podStars(G, stars, 0.55);
    // gold haze gathering in the shaft at two depths (the light the pods hang in)
    for (const [y, rr, k] of crown ? [[-1.2, ring.rIn * 1.6, 0.5]] : [[-2.4, ring.rIn * 2.1, 0.32], [-9, ring.rIn * 2.6, 0.22]]) {
      const haze = new THREE.Mesh(new THREE.PlaneGeometry(rr, rr), additive('#d08a30', k, 1, starTexture()));
      haze.rotation.x = -Math.PI / 2;
      haze.position.y = y;
      haze.renderOrder = -1;
      g.add(haze);
    }
    const base = glow(W, g, '#ffc860', crown ? 4 : 3, crown ? 0.5 : 0.3, 0, crown ? 0.4 : -0.8, 0, false);
    W.addUpdater((dt, t) => {
      for (const s of sets) s.map.offset.y = (t * 0.22) % 1;
      for (const s of staves) s.band.rotation.y = t * s.speed;
      for (const r of rings) {
        r.holder.rotation.y = t * r.speed;
        r.holder.rotation.x = r.tilt + Math.sin(t * 0.21 + r.speed * 10) * 0.05;
      }
      base.material.opacity = 0.8 + Math.sin(t * 1.3 + p.x) * 0.2;
    });
  },
};

// ---------------------------------------------------------------- the abyss

// the cathedral's piers: clustered columns rising from the deep through the voids between tiers
const PIERS = [[36.5, 28.5, 1.4], [40.0, 36.5, 1.1], [40.0, 21.0, 1.0], [3.5, 27.5, 1.0], [69.0, 27.5, 1.0], [27.0, 26.0, 0.8],
  [52.0, 27.6, 0.8], [62.0, 28.0, 0.7], [11.0, 28.5, 0.8], [26.5, 2.5, 0.7]];

const abyss = {
  textures: ['hr_under', 'hr_gilt', 'hr_banner', 'hr_pod'],
  build(W) {
    const M = mats(W), B = W.batchFor(null), G = W.groupFor(null);
    const r0 = rnd(77);
    for (const [x, z, s] of PIERS) {
      const top = 22, bot = -30, h = top - bot;
      const core = new THREE.CylinderGeometry(0.9 * s, 1.0 * s, h, 8, 1, true);
      const uv = core.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6 * s, uv.getY(i) * h);
      put(B, M.under, core, [x, (top + bot) / 2, z]);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + 0.4;
        const shaft = new THREE.CylinderGeometry(0.34 * s, 0.38 * s, h, 6, 1, true);
        const u2 = shaft.attributes.uv;
        for (let i = 0; i < u2.count; i++) u2.setXY(i, u2.getX(i) * 2, u2.getY(i) * h);
        put(B, M.edge, shaft, [x + Math.cos(a) * 0.95 * s, (top + bot) / 2, z + Math.sin(a) * 0.95 * s]);
      }
      // gilt collars and a glowing seam up the front
      for (let y = -12; y < top; y += 5.5) {
        put(B, M.gilt, new THREE.CylinderGeometry(1.32 * s, 1.32 * s, 0.22, 10, 1, true), [x, y, z]);
      }
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.06, h), additive('#ffc860', 1.1, 0.8));
      seam.position.set(x, (top + bot) / 2, z + 1.02 * s);
      G.add(seam);
      // a pennant hung from a collar
      if (s > 0.9) {
        const set = glowSet('hr_banner');
        const ban = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.6), new THREE.MeshStandardMaterial({
          map: textureSet('hr_banner').map, emissiveMap: set.map, emissive: 0xffffff, emissiveIntensity: 1.6, transparent: true,
          alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8,
        }));
        ban.position.set(x + 1.2 * s, 4.4, z + 0.5);
        G.add(ban);
        W.addUpdater((dt, t) => { ban.rotation.y = Math.sin(t * 0.5 + x) * 0.12; });
      }
    }
    // pods hanging in the voids at every depth: near ones as pods, the rest as stars
    const pods = [], stars = [];
    const free = (x, z) => !solidAt(x, z) && !solidAt(x + 1.2, z) && !solidAt(x - 1.2, z) && !solidAt(x, z + 1.2) && !solidAt(x, z - 1.2);
    for (let k = 0; k < 2600; k++) {
      const x = -6 + r0() * (GW + 12), z = -6 + r0() * (GH + 12);
      const y = -3 - r0() * r0() * 26;
      if (!free(x, z) && y > -6) continue;
      if (y > -7 && pods.length < 140 && r0() < 0.4) pods.push({ x, y, z, ry: r0() * TAU, s: 0.9 + r0() * 0.3 });
      else stars.push({ x, y, z, k: 0.4 + r0() * 0.7, color: r0() < 0.1 ? '#cfe2ff' : r0() < 0.5 ? '#ffd890' : '#fff0d0' });
    }
    podMesh(W, G, pods);
    podStars(G, stars, 0.42);
  },
};

// ---------------------------------------------------------------- lift pads

const liftPad = {
  textures: ['hr_gilt', 'hr_glyph'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const r = (p.r || 2.5) - 0.25;
    // spires round the edge, leaning in a little
    const glows = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + 0.26;
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      if (solidAt(x + Math.cos(a) * 0.9, z + Math.sin(a) * 0.9)) continue;   // keep the way on clear
      put(B, M.gilt, new THREE.CylinderGeometry(0.05, 0.13, 2.6, 5), [x, 1.3, z], [Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]);
      put(B, M.inlay, new THREE.OctahedronGeometry(0.13, 0), [x - Math.cos(a) * 0.16, 2.66, z - Math.sin(a) * 0.16]);
      glows.push(glow(W, G, '#ffd27a', 0.9, 0.7, x - Math.cos(a) * 0.16, 2.66, z - Math.sin(a) * 0.16, false));
    }
    // the glyph turning on the pad and the column of light the lift rides
    const set = glowSet('hr_glyph');
    const glyph = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.7, r * 1.7), additive('#ffd27a', 1.0, 0.8, set.map));
    glyph.rotation.x = -Math.PI / 2;
    glyph.position.set(p.x, 0.02, p.z);
    G.add(glyph);
    const beam = makeLightShaft({ width: 2.2, height: 16, color: '#ffe0a0', opacity: 0.1, spread: 1.05, dust: 1.6, floorY: 0, floorFade: 1.4 });
    beam.position.set(p.x, 16, p.z);
    G.add(beam);
    // the lectern the interactable answers at (pads whose lift goes somewhere)
    W.addUpdater((dt, t) => {
      glyph.rotation.z = t * 0.12;
      glyph.material.opacity = 0.65 + Math.sin(t * 1.4 + p.x) * 0.15;
      for (const [i, g] of glows.entries()) g.material.opacity = 0.75 + Math.sin(t * 2 + i) * 0.25;
    });
  },
};

// ---------------------------------------------------------------- light bridges (gates)

const bridge = {
  textures: ['hr_bridge', 'hr_edge', 'hr_gilt'],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on);
    const span = BRIDGES.find((b) => b.id === p.bridge);
    const [ax, az] = span.a, [bx, bz] = span.b;
    const len = Math.hypot(bx - ax, bz - az);
    const ang = Math.atan2(bz - az, bx - ax);
    const hw = span.w / 2;
    // local +x runs along the bridge from its `a` end
    const holder = new THREE.Group();
    holder.position.set(ax, 0, az);
    holder.rotation.y = -ang;
    G.add(holder);
    const deckSet = textureSet('hr_bridge', { repeat: [1, 1] });
    const deckMat = new THREE.MeshStandardMaterial({
      map: deckSet.map, normalMap: deckSet.normalMap, emissiveMap: deckSet.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.7,
      roughness: 0.3, metalness: 0.3,
    });
    // the whole span is built at full length; drawing it out scales it from its `a` end
    const deck = new THREE.Group();
    const parts = new Batch();
    bridgeParts(M, len, span.w, deckMat, (mat, geo, m) => {
      parts.geometry(mat, geo, m);
      geo.dispose();
    });
    for (const m of parts.build(deck)) m.receiveShadow = true;
    holder.add(deck);
    // the ghost: dotted light where the bridge will be, while it is closed
    const ghostMat = additive('#ffc860', 0.6, 0.7);
    const ghost = new THREE.Group();
    const dots = new Batch();
    for (let x = 0.4; x < len; x += 0.55) {
      for (const sd of [-1, 1]) {
        const dot = new THREE.PlaneGeometry(0.2, 0.07);
        dot.rotateX(-Math.PI / 2);
        dots.geometry(ghostMat, dot, at4(x, 0.02, sd * (hw - 0.12)));
        dot.dispose();
      }
    }
    dots.build(ghost);
    holder.add(ghost);
    // gilt posts at both ends with lamps that wake as the deck draws out
    const glows = [];
    for (const s of [0, len]) {
      for (const sd of [-1, 1]) {
        const lx = s, lz = sd * (hw + 0.06);
        const wx = ax + Math.cos(ang) * lx - Math.sin(ang) * lz, wz = az + Math.sin(ang) * lx + Math.cos(ang) * lz;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.9, 6), M.gilt);
        post.position.set(wx, 0.45, wz);
        G.add(post);
        glows.push(glow(W, G, '#ffd27a', 0.9, 0.6, wx, 0.98, wz, false));
      }
    }
    let k = 0, open = false;
    const apply = () => {
      const e = 1 - (1 - k) ** 3;
      deck.scale.x = Math.max(0.001, e);
      deck.visible = k > 0.002;
      ghost.visible = k < 0.98;
      ghostMat.opacity = 0.7 * (1 - k);
      for (const g of glows) tintGlow(g, open ? '#ffe2a0' : '#6a5030', 0.45 + k * 0.55);
    };
    apply();
    W.addUpdater((dt, t) => {
      const target = open ? 1 : 0;
      if (k !== target) {
        k = target > k ? Math.min(1, k + dt / 0.9) : Math.max(0, k - dt / 0.6);
        apply();
      }
      if (deck.visible) for (const tx of [deckSet.map, deckSet.emissiveMap]) if (tx) tx.offset.x = -t * 0.35;
      if (!open && ghost.visible) ghostMat.opacity = (0.45 + 0.25 * Math.sin(t * 2.4)) * (1 - k);
    });
    return {
      kind: 'gate.bridge',
      get open() { return open; },
      setOpen(v, instant = false) {
        const was = open;
        open = !!v;
        if (instant) k = open ? 1 : 0;
        else if (was !== open && W.onSound) W.onSound(open ? 'laser_on' : 'laser_off', { volume: 0.7, pitch: 0.8 });
        apply();
      },
    };
  },
};

// ---------------------------------------------------------------- pylons, reliquaries, stands

const pylon = {
  textures: ['hr_gilt', 'hr_glyph'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    put(B, M.edge, new THREE.CylinderGeometry(0.42, 0.5, 0.26, 8), [p.x, 0.13, p.z]);
    put(B, M.gilt, new THREE.CylinderGeometry(0.08, 0.22, 1.5, 4), [p.x, 1.01, p.z], [0, Math.PI / 4, 0]);
    put(B, M.gilt, new THREE.TorusGeometry(0.3, 0.035, 4, 16), [p.x, 1.55, p.z], [Math.PI / 2, 0, 0]);
    W.addCircle(p.x, p.z, 0.45);
    const gemMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#4a5a8a', emissiveIntensity: 1.6, roughness: 0.15, flatShading: true });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), gemMat);
    gem.scale.set(0.8, 1.5, 0.8);
    G.add(gem);
    const halo = glow(W, G, '#6a7ab0', 1.6, 0.5, p.x, 1.95, p.z, false);
    const set = glowSet('hr_glyph');
    const glyph = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), additive('#ffd27a', 0.9, 0.0, set.map));
    glyph.rotation.x = -Math.PI / 2;
    glyph.position.set(p.x, 0.03, p.z);
    G.add(glyph);
    let on = false, k = 0, spin = 0;
    const show = () => {
      gemMat.emissive.set(on ? '#ffc04a' : '#4a5a8a');
      tintGlow(halo, on ? '#ffd27a' : '#6a7ab0', on ? 1.0 : 0.5);
    };
    show();
    return {
      kind: 'switch',
      setState(v, instant = false) {
        const was = on;
        on = !!v;
        if (instant) k = on ? 1 : 0;
        if (on && !was && !instant && W.particles) W.particles.emit('hr_hymn', [p.x, 1.9, p.z], { count: 16 });
        show();
      },
      setOpen(v, instant) { this.setState(v, instant); },
      update(dt, t) {
        k = on ? Math.min(1, k + dt * 1.5) : Math.max(0, k - dt * 1.5);
        spin += dt * (0.5 + k * 1.8);
        gem.position.set(p.x, 1.95 + Math.sin(t * 1.8 + p.x) * 0.06, p.z);
        gem.rotation.y = spin;
        halo.position.y = gem.position.y;
        glyph.material.opacity = k * (0.7 + Math.sin(t * 2) * 0.15);
        glyph.rotation.z = t * 0.3;
      },
    };
  },
};

const reliquary = {
  textures: ['hr_gilt', 'hr_edge'],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on);
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.rot || 0;
    G.add(g);
    const body = new Batch();
    body.box({ front: M.edge, back: M.edge, left: M.edge, right: M.edge, top: M.gilt }, 0, 0, 0.82, 0.58, 0, 0.44, 0,
      { front: [0, 0.4, 1, 1], back: [0, 0.4, 1, 1], left: [0, 0.4, 1, 1], right: [0, 0.4, 1, 1] });
    body.box({ front: M.gilt, back: M.gilt, left: M.gilt, right: M.gilt }, 0, 0, 0.92, 0.66, 0, 0.08, 0);
    for (const m of body.build(g)) m.matrixAutoUpdate = true;
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.44, -0.29);
    g.add(hinge);
    const lid = new Batch();
    lid.box({ front: M.gilt, back: M.gilt, left: M.gilt, right: M.gilt, top: M.gilt }, 0, 0.29, 0.86, 0.62, 0, 0.12, 0);
    lid.box({ front: M.gilt, back: M.gilt, left: M.gilt, right: M.gilt, top: M.gilt }, 0, 0.29, 0.5, 0.36, 0.12, 0.22, 0);
    for (const m of lid.build(hinge)) m.matrixAutoUpdate = true;
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.035), additive('#ffd27a', 1.5));
    seam.position.set(0, 0.45, 0.295);
    g.add(seam);
    const light = glow(W, g, '#ffd27a', 1.1, 0.0, 0, 0.62, 0, false);
    W.addBox(p.x, p.z, 0.9, 0.66);
    let open = 0, opened = false;
    const living = {
      kind: 'chest',
      opened: false,
      setOpen(v, instant = false) {
        opened = living.opened = !!v;
        seam.visible = !opened;
        if (instant) open = opened ? 1 : 0;
        hinge.rotation.x = -1.8 * open;
      },
      update(dt, t) {
        const target = opened ? 1 : 0;
        if (open !== target) {
          open = target ? Math.min(1, open + dt * 2.2) : Math.max(0, open - dt * 2.2);
          hinge.rotation.x = -1.8 * (1 - (1 - open) ** 3);
        }
        light.material.opacity = opened ? Math.max(0.15, 1 - open * 0.7) : 0.55 + 0.2 * Math.sin(t * 3 + p.x);
      },
    };
    return living;
  },
};

const screenStand = {
  textures: ['hr_gilt', 'hr_edge'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const s = p.s || 1, rot = p.rot || 0;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const at = (lx, y, lz) => [p.x + lx * cs + lz * sn, y, p.z - lx * sn + lz * cs];
    // two gilt posts, a pointed arch over the screen, a base; the screen itself is the built-in prop
    for (const sd of [-1, 1]) put(B, M.gilt, new THREE.BoxGeometry(0.1 * s, 2.2 * s, 0.1 * s), at(sd * 0.72 * s, 1.1 * s, -0.02), [0, rot, 0]);
    put(B, M.gilt, new THREE.BoxGeometry(1.56 * s, 0.1 * s, 0.1 * s), at(0, 1.18 * s, -0.02), [0, rot, 0]);
    for (const sd of [-1, 1]) put(B, M.gilt, new THREE.BoxGeometry(0.08 * s, 0.9 * s, 0.08 * s), at(sd * 0.36 * s, 2.42 * s, -0.02), [0, rot, sd * 0.62]);
    put(B, M.inlay, new THREE.OctahedronGeometry(0.1 * s, 0), at(0, 2.82 * s, -0.02));
    put(B, M.edge, new THREE.BoxGeometry(1.7 * s, 0.16 * s, 0.4 * s), at(0, 0.08 * s, -0.04), [0, rot, 0]);
    put(B, M.edge, new THREE.BoxGeometry(1.42 * s, 0.86 * s, 0.06 * s), at(0, 1.25 * s + 0.4 * s, -0.06), [0, rot, 0]);
    W.addBox(p.x, p.z, 1.6 * s, 0.4 * s);
  },
};

const organ = {
  textures: ['hr_gilt', 'hr_edge'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const hs = [1.6, 2.4, 3.3, 4.2, 3.6, 2.8, 2.0];
    hs.forEach((h, i) => {
      const x = p.x + (i - 3) * 0.24;
      put(B, M.gilt, new THREE.CylinderGeometry(0.1, 0.1, h, 8, 1, true), [x, h / 2 + 0.3, p.z]);
      put(B, M.edge, new THREE.ConeGeometry(0.1, 0.22, 8, 1, true), [x, 0.4, p.z], [Math.PI, 0, 0]);
      const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.08), additive('#ffd27a', 1.4));
      mouth.position.set(x, 0.75 + (i % 3) * 0.1, p.z + 0.11);
      G.add(mouth);
    });
    put(B, M.edge, new THREE.BoxGeometry(1.9, 0.32, 0.5), [p.x, 0.16, p.z]);
    W.addBox(p.x, p.z, 1.9, 0.5);
    glow(W, G, '#ffc860', 1.4, 0.5, p.x, 4.6, p.z, true);
  },
};

// ---------------------------------------------------------------- the Crown

const crownPiece = {
  textures: ['hr_gilt', 'hr_glyph', 'hr_column'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const ring = RINGS.find((r) => r.id === 'crown');
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    G.add(g);
    // twelve gilt fins round the disc's rim, curving in over it like the points of a crown
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU + DEG * 15;
      if (Math.sin(a) > 0.55) continue;   // the south arc stays open: the party walks in from there
      const [x, z] = ringPoint(ring, a / DEG, ring.rOut + 0.4);
      const h = 4.5 + (k % 2) * 1.6;
      put(B, M.gilt, new THREE.BoxGeometry(0.26, h, 0.12), [x, h / 2 - 0.4, z], [0.18, -a + Math.PI / 2, 0]);
      put(B, M.edge, new THREE.BoxGeometry(0.42, 0.5, 0.3), [x, 0.0, z], [0, -a + Math.PI / 2, 0]);
      put(B, M.inlay, new THREE.OctahedronGeometry(0.18, 0), [x - Math.cos(a) * 0.8, h - 0.4, z - Math.sin(a) * 0.8]);
    }
    // the oculus: a ring of fire round the opening, the glyph turning in the light above it
    const lip = new THREE.Mesh(new THREE.TorusGeometry(ring.rIn + 0.05, 0.06, 6, 64), additive('#ffe0a0', 1.0));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.05;
    g.add(lip);
    const set = glowSet('hr_glyph');
    const glyph = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 6.2), additive('#ffd27a', 0.5, 0.7, set.map));
    glyph.rotation.x = -Math.PI / 2;
    glyph.position.y = 0.6;
    g.add(glyph);
    // light rising out of the oculus into the cradle above
    const colSet = textureSet('hr_column', { repeat: [3, 2] });
    const rise = new THREE.Mesh(new THREE.CylinderGeometry(2.4, ring.rIn - 0.2, 9, 32, 1, true), additive('#ffd890', 0.6, 0.45, colSet.map));
    rise.position.y = 4.5;
    rise.renderOrder = 4;
    g.add(rise);
    // two great rings over the oculus, crossing as they turn
    const hoops = [[4.4, 3.6, 0.5], [5.6, 4.8, -0.6]].map(([r, y, tilt]) => {
      const holder = new THREE.Group();
      holder.position.y = y;
      holder.rotation.x = tilt;
      const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.14, 6, 80), M.gilt);
      band.castShadow = false;
      const line = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 4, 80), additive('#ffe0a0', 0.8));
      line.position.z = 0.15;
      holder.add(band, line);
      g.add(holder);
      return holder;
    });
    const core = glow(W, g, '#ffe0a0', 5, 0.4, 0, 3.6, 0, false);
    let dawn = 0, target = 0;
    const gold = new THREE.Color('#ffd27a'), white = new THREE.Color('#eaf2ff');
    return {
      kind: 'crown',
      setState(v, instant = false) {
        target = v ? 1 : 0;
        if (instant) dawn = target;
      },
      update(dt, t) {
        if (dawn !== target) dawn = target > dawn ? Math.min(1, dawn + dt * 0.4) : Math.max(0, dawn - dt * 0.4);
        colSet.map.offset.y = (-t * 0.18) % 1;
        glyph.rotation.z = t * 0.08;
        hoops[0].rotation.y = t * 0.11;
        hoops[1].rotation.y = -t * 0.08;
        const c = gold.clone().lerp(white, dawn);
        glyph.material.color.copy(c).multiplyScalar(0.5);
        tintGlow(core, `#${c.getHexString()}`, 0.4 + Math.sin(t * 0.9) * 0.06);
      },
    };
  },
};

// ---------------------------------------------------------------- small pieces

const med = {
  textures: ['hr_gilt', 'hr_edge'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    put(B, M.edge, new THREE.CylinderGeometry(0.42, 0.52, 0.7, 8), [p.x, 0.35, p.z]);
    put(B, M.gilt, new THREE.CylinderGeometry(0.56, 0.44, 0.16, 8), [p.x, 0.78, p.z]);
    W.addCircle(p.x, p.z, 0.5);
    const basin = new THREE.Mesh(new THREE.CircleGeometry(0.44, 20), additive('#bff8e0', 0.7, 0.9));
    basin.rotation.x = -Math.PI / 2;
    basin.position.set(p.x, 0.87, p.z);
    G.add(basin);
    // the cross of light over it (Med-Stations read the same on every deck)
    const cross = new THREE.Group();
    for (const [w, h] of [[0.12, 0.44], [0.44, 0.12]]) cross.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), additive('#9fffd0', 0.9)));
    cross.position.set(p.x, 1.45, p.z);
    G.add(cross);
    const halo = glow(W, G, '#9fffd0', 1.3, 0.35, p.x, 1.2, p.z, false);
    W.addUpdater((dt, t) => {
      cross.position.y = 1.45 + Math.sin(t * 1.5 + p.x) * 0.06;
      cross.rotation.y = t * 0.6;
      halo.material.opacity = 0.75 + Math.sin(t * 2) * 0.2;
    });
  },
};

const fabricator = {
  textures: ['hr_gilt', 'hr_edge', 'hr_screen'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    put(B, M.edge, new THREE.BoxGeometry(1.0, 1.1, 0.6), [p.x, 0.55, p.z]);
    put(B, M.gilt, new THREE.BoxGeometry(1.1, 0.12, 0.7), [p.x, 1.16, p.z]);
    W.addBox(p.x, p.z, 1.0, 0.6);
    const set = glowSet('hr_screen');
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), additive('#ffd27a', 1.0, 1, set.map));
    face.position.set(p.x, 0.75, p.z + 0.31);
    G.add(face);
    glow(W, G, '#ffd27a', 1.0, 0.4, p.x, 0.8, p.z + 0.5, true);
  },
};

const cache = {
  textures: ['hr_gilt', 'hr_slab'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const slab = W.mats.tile('hr_slab', { emissive: 2.0, roughness: 0.5, metalness: 0.4 });
    put(B, slab, new THREE.BoxGeometry(0.7, 1.3, 0.5), [p.x, 0.65, p.z]);
    put(B, M.gilt, new THREE.BoxGeometry(0.76, 0.08, 0.56), [p.x, 1.32, p.z]);
    W.addBox(p.x, p.z, 0.7, 0.5);
    const lock = glow(W, G, '#ffb84a', 0.6, 0.8, p.x + 0.15, 0.8, p.z + 0.3, false);
    W.addUpdater((dt, t) => { lock.material.opacity = 0.6 + Math.sin(t * 3) * 0.3; });
  },
};

const fall = {
  textures: ['hr_glyph'],
  build(W, p) {
    const G = W.groupFor(p.on);
    const beam = makeLightShaft({ width: 1.4, height: 14, color: '#fff0c0', opacity: 0.2, spread: 1.0, dust: 2, floorY: -6, floorFade: 4 });
    beam.position.set(p.x, 12, p.z);
    G.add(beam);
    const set = glowSet('hr_glyph');
    const glyph = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), additive('#fff0c0', 1.0, 0.8, set.map));
    glyph.rotation.x = -Math.PI / 2;
    glyph.position.set(p.x, 0.03, p.z);
    G.add(glyph);
    W.addEmitter('hr_fall', { position: [p.x, 5, p.z], area: [0.8, 0.2, 0.8], rate: 3 }, p.on);
    W.addUpdater((dt, t) => { glyph.rotation.z = -t * 0.5; });
  },
};

export default {
  'heart.tiers': tiers,
  'heart.column': column,
  'heart.abyss': abyss,
  'heart.liftPad': liftPad,
  'heart.bridge': bridge,
  'heart.pylon': pylon,
  'heart.reliquary': reliquary,
  'heart.screenStand': screenStand,
  'heart.organ': organ,
  'heart.crown': crownPiece,
  'heart.med': med,
  'heart.fabricator': fabricator,
  'heart.cache': cache,
  'heart.fall': fall,
};
