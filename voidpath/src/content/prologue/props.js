// prologue: prop types for the Halcyon's new rooms (browser, TECH_PLAN 2.5, 3.3). Each is composed
// of built-in props (box, plane, cylinder, pipe) plus glows and emitters, so it shares the World's
// batched materials, colliders, dividers (`on`) and conditional scopes (`when`). They reuse the POC's
// textures wherever they can: visualLint caps a map at 48 distinct textures.
//
//   pro.openPod      { x, z, forced? }   an emptied cryo pod, lid swung open on its hinge (Kade's pod 07,
//                                        Sera's pod M-2 when `forced`: sparks from the pried seal)
//   pro.pump         { x, z }            a coolant pump: casing on a grated plinth, sight glass, riser pipes
//   pro.fabricator   { x, z }            the antechamber fabricator (shop) against a north wall
//   pro.monitor      { x, z }            a monitor pedestal (its `screen` is a separate map prop)
//   pro.bench        { x, z, w }         the POC lounge bench in Halcyon textures
//   pro.pipeRun      { x0, x1, z, y }    lit pipe runs behind a south wall (foreground silhouettes)
//   pro.underdeck    { x0, x1, z }       the machinery deck below a cutaway south wall (fills portrait frames)
//   pro.moth         { x, z, rot?, winged?, pad? }   Nyx's skiff (buildMoth); `pad`: the berth's pad and fuel line
//
// Shared Moth builder (C2's Driftmarket berth and the epilogue reuse it):
//   export function buildMoth(W, p)    p = { x, z, rot?, on?, winged? }: the skiff, nose to -x before rot
//   export const MOTH_TEXTURES         the only texture it paints ('pro_moth_hull'): list it in the prop def

import * as THREE from 'three';
import { buildProp } from '../../world/props.js';
import { makeGlow } from '../../core/vfx.js';
import { pipeGeometry } from '../../world/geometry.js';
import { MOTH_ATLAS } from './art.js';

export const MOTH_TEXTURES = ['pro_moth_hull'];

function glow(W, p, color, size, intensity, x, y, z) {
  const g = makeGlow(color, size, intensity);
  g.position.set(x, y, z);
  W.groupFor(p.on).add(g);
  W.addGlow(g, x, z);
  return g;
}

/** Pipe runs along x (three bores with clamps) and a glowing valve lamp every few units. */
function pipeRun(W, p) {
  const B = W.batchFor(p.on);
  const mat = W.mats.tile('pipe', { roughness: 0.5, metalness: 0.45, emissive: 1.4 });
  const len = p.x1 - p.x0, cx = (p.x0 + p.x1) / 2;
  const m = new THREE.Matrix4();
  for (const [dz, dy, r] of [[0, 0, 0.16], [0.42, 0.34, 0.12], [-0.3, -0.18, 0.1]]) {
    B.geometry(mat, pipeGeometry(r, len, 'x'), m.makeTranslation(cx, p.y + dy, p.z + dz));
    for (let x = p.x0 + 0.8; x < p.x1; x += 2.2) B.geometry(mat, pipeGeometry(r * 1.4, 0.14, 'x'), m.makeTranslation(x, p.y + dy, p.z + dz));
  }
  for (let x = p.x0 + 1.5; x < p.x1; x += 3.6) glow(W, p, p.lamp || '#ffb04a', 0.55, 0.9, x, p.y + 0.24, p.z + 0.1);
}

export default {
  'pro.openPod': {
    textures: ['pro_pod_open', 'cryo_pod', 'metal_side', 'wall_cap'],
    build(W, p) {
      const { x, z } = p;
      buildProp(W, { t: 'box', x, z: z - 0.06, w: 0.92, d: 0.58, h: 2.0, on: p.on, emissive: 2.2,
        tex: { front: 'pro_pod_open', side: 'metal_side', top: 'wall_cap' } });
      // the lid swung out on its left hinge, toward the aisle
      buildProp(W, { t: 'plane', x: x - 0.6, z: z + 0.66, w: 0.86, h: 1.9, y: 0.05, rot: -1.88, tex: 'cryo_pod', on: p.on, alpha: false });
      glow(W, p, '#6fd6ff', 1.2, 0.5, x, 1.2, z + 0.32);
      W.addEmitter('frost', { position: [x, 0.25, z + 0.45], area: [0.7, 0.2, 0.35], rate: p.forced ? 3 : 2 }, p.on);
      if (p.forced) W.addEmitter('spark', { position: [x + 0.42, 1.5, z + 0.34], area: [0.05, 0.3, 0.05], rate: 0.6, burst: 8 }, p.on);
      return null;
    },
  },

  'pro.pump': {
    textures: ['wall_low', 'floor_grate', 'pipe'],
    build(W, p) {
      const { x, z } = p;
      buildProp(W, { t: 'box', x, z, w: 1.3, d: 1.1, h: 0.22, tex: { front: 'wall_low', side: 'wall_low', top: 'floor_grate' }, on: p.on, solid: false });
      buildProp(W, { t: 'cylinder', x, z, r: 0.52, h: 1.5, y: 0.22, tex: 'pipe', on: p.on, emissive: 2.4 });
      buildProp(W, { t: 'pipe', axis: 'y', x: x + 0.3, z: z - 0.28, y0: 1.72, y1: 3.0, r: 0.12, on: p.on });
      buildProp(W, { t: 'pipe', axis: 'y', x: x - 0.32, z: z - 0.26, y0: 1.72, y1: 3.0, r: 0.09, on: p.on });
      glow(W, p, '#6fd6ff', 0.9, 0.7, x + 0.12, 0.95, z + 0.55);
      W.addEmitter('steam', { position: [x + 0.3, 2.9, z - 0.2], area: [0.1, 0.05, 0.1], rate: 1.2 }, p.on);
      return null;
    },
  },

  // a monitor pedestal; its screen is a separate `screen` map prop (WARDEN's sigil takes it over)
  'pro.monitor': {
    textures: ['metal_side', 'wall_cap'],
    build(W, p) {
      const { x, z } = p;
      const metal = { front: 'metal_side', side: 'metal_side', top: 'wall_cap' };
      buildProp(W, { t: 'box', x, z, w: 0.62, d: 0.5, h: 0.08, tex: metal, on: p.on, solid: false });
      buildProp(W, { t: 'box', x, z: z - 0.04, w: 0.3, d: 0.24, h: 1.0, tex: metal, on: p.on, emissive: 1.6 });
      buildProp(W, { t: 'box', x, z: z - 0.02, w: 1.12, d: 0.08, h: 0.7, y: 0.95, tex: metal, on: p.on, solid: false });
      W.addBox(x, z, 0.6, 0.5);
      glow(W, p, '#7fe3ff', 1.1, 0.45, x, 1.3, z + 0.2);
      return null;
    },
  },

  // Foreground pipe runs along x behind a cutaway south wall: silhouettes that fill the frame's
  // bottom edge, each with a few glowing valve lamps. { x0, x1, z, y, lamp? }
  'pro.pipeRun': {
    textures: ['pipe'],
    build(W, p) {
      pipeRun(W, p);
      return null;
    },
  },

  // The machinery deck seen below a cutaway south wall: the wall's outer face down to a grated deck
  // whose heat grilles glow, girders, lit pipe runs. It fills the bottom of portrait frames that would
  // otherwise look into the void past the room. { x0, x1, z, depth?, y? }   z = the wall's outer face
  'pro.underdeck': {
    textures: ['floor_grate', 'wall_panel', 'metal_side', 'wall_cap', 'pipe'],
    build(W, p) {
      const y = p.y ?? -0.7, depth = p.depth || 7, w = p.x1 - p.x0, cx = (p.x0 + p.x1) / 2;
      buildProp(W, { t: 'box', x: cx, z: p.z + 0.06, w, d: 0.12, h: -y + 0.02, y, emissive: 1.6, solid: false, on: p.on,
        tex: { front: 'wall_panel', side: 'metal_side', top: 'wall_cap' } });
      buildProp(W, { t: 'floorPlane', x: cx, y, z: p.z + depth / 2, w, d: depth, tex: 'floor_grate', repeat: true, emissive: 3.0, on: p.on });
      for (let x = p.x0 + 0.8; x < p.x1; x += 2.4) glow(W, p, '#ffa64a', 0.6, 0.7, x, y + 0.45, p.z + 0.2);
      for (let x = p.x0 + 1.5; x < p.x1; x += 4) {
        buildProp(W, { t: 'box', x, z: p.z + depth / 2, w: 0.3, d: depth, h: 0.35, y, solid: false, on: p.on,
          tex: { front: 'metal_side', side: 'metal_side', top: 'wall_cap' } });
      }
      pipeRun(W, { ...p, y: y + 0.55, z: p.z + 1.3 });
      return null;
    },
  },

  // ---- the exterior hull (the cold open)

  // a radiator fin array: n tall thin fins across x, glowing amber heat strips along their tops
  'pro.radiator': {
    textures: ['wall_panel_vent', 'metal_side', 'wall_cap'],
    build(W, p) {
      const n = p.n || 5;
      for (let i = 0; i < n; i++) {
        const x = p.x + (i - (n - 1) / 2) * 0.62, h = 1.5 + 0.35 * Math.sin(i * 1.7 + p.x);
        buildProp(W, { t: 'box', x, z: p.z, w: 0.12, d: 2.4, h, emissive: 1.4, on: p.on,
          tex: { front: 'metal_side', side: 'wall_panel_vent', top: 'wall_cap' } });
        glow(W, p, '#ff9a4a', 0.5, 0.55, x, h + 0.05, p.z + 0.9);
      }
      buildProp(W, { t: 'box', x: p.x, z: p.z, w: n * 0.62 + 0.4, d: 2.8, h: 0.25, emissive: 1.2, on: p.on,
        tex: { front: 'metal_side', side: 'metal_side', top: 'wall_cap' } });
      return null;
    },
  },

  // an antenna cluster: masts of different heights on a plinth, red and amber tip lamps (one blinks)
  'pro.antennas': {
    textures: ['pipe', 'metal_side', 'wall_cap'],
    build(W, p) {
      const s = p.seed || 1;
      buildProp(W, { t: 'box', x: p.x, z: p.z, w: 1.2, d: 1.0, h: 0.3, on: p.on, tex: { front: 'metal_side', side: 'metal_side', top: 'wall_cap' } });
      const tips = [];
      [[-0.35, -0.2, 3.2], [0.3, -0.25, 2.2], [0.05, 0.3, 1.6], [-0.4, 0.3, 1.1]].forEach(([dx, dz, h], i) => {
        const hh = h * (0.85 + 0.15 * Math.sin(s * 3 + i));
        buildProp(W, { t: 'cylinder', x: p.x + dx, z: p.z + dz, r: 0.05 + 0.02 * (i === 0), h: hh, y: 0.3, tex: 'pipe', on: p.on, solid: false });
        tips.push(glow(W, p, i % 2 ? '#ffb54a' : '#ff4a4a', 0.45, 1.2, p.x + dx, hh + 0.36, p.z + dz));
      });
      const blink = tips[0];
      W.addUpdater((dt, t) => { blink.visible = (t * 0.7 + s * 0.31) % 1 < 0.35; });
      W.addBox(p.x, p.z, 1.2, 1.0);
      return null;
    },
  },

  // the long-range comms dish (the cold open's focal piece): a mast, a yoke turning slowly round, the
  // dish tilted to the sky, a feed horn with a blinking red beacon and signal motes drifting off it
  'pro.dish': {
    textures: ['pipe', 'pro_hull', 'metal_side', 'wall_cap'],
    build(W, p) {
      const { x, z } = p;
      buildProp(W, { t: 'box', x, z, w: 1.8, d: 1.8, h: 0.3, emissive: 1.3, on: p.on, tex: { front: 'metal_side', side: 'metal_side', top: 'wall_cap' } });
      buildProp(W, { t: 'cylinder', x, z, r: 0.5, h: 0.5, y: 0.3, tex: 'pipe', on: p.on });
      buildProp(W, { t: 'cylinder', x, z, r: 0.16, h: 1.7, y: 0.8, tex: 'pipe', on: p.on, solid: false });
      const yoke = new THREE.Group();
      yoke.position.set(x, 2.5, z);
      W.groupFor(p.on).add(yoke);
      const tilt = new THREE.Group();
      tilt.rotation.x = -0.75;
      yoke.add(tilt);
      // the bowl: a shallow parabola, plating inside and out
      const prof = [];
      for (let i = 0; i <= 8; i++) { const r = 0.05 + (i / 8) * 1.45; prof.push(new THREE.Vector2(r, 0.36 * (r / 1.5) ** 2)); }
      const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), W.mats.tile('pro_hull', { emissive: 1.4, roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide }));
      bowl.castShadow = true;
      bowl.receiveShadow = true;
      tilt.add(bowl);
      const pipeMat = W.mats.tile('pipe', { roughness: 0.5, metalness: 0.45 });
      const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.0, 6), pipeMat);
      feed.position.y = 0.55;
      tilt.add(feed);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.3, 10), pipeMat);
      hub.position.y = -0.1;
      tilt.add(hub);
      const beacon = makeGlow('#ff3b4e', 0.9, 1.8);
      beacon.position.y = 1.12;
      tilt.add(beacon);
      W.addGlow(beacon, x, z);
      W.addUpdater((dt, t) => {
        yoke.rotation.y = t * 0.12;
        beacon.visible = t % 1.4 < 0.3;
      });
      W.addEmitter('holo', { position: [x, 3.4, z], area: [0.6, 0.4, 0.6], rate: 2.5 }, p.on);
      W.addBox(x, z, 1.8, 1.8);
      return null;
    },
  },

  // the POC lounge bench, upholstered in the bridge's navy deck plate (the POC `seat` texture
  // would be the Halcyon's 49th: the screens and the hub stall need the room)
  'pro.bench': {
    textures: ['metal_side', 'wall_cap', 'floor_bridge'],
    build(W, p) {
      const w = p.w || 2;
      const seat = { front: 'metal_side', side: 'metal_side', top: 'floor_bridge' };
      const metal = { front: 'metal_side', side: 'metal_side', top: 'wall_cap' };
      buildProp(W, { t: 'box', x: p.x, z: p.z, w, d: 0.62, h: 0.14, y: 0.36, tex: seat, emissive: 1.4, solid: false, on: p.on });
      buildProp(W, { t: 'box', x: p.x, z: p.z + 0.27, w, d: 0.1, h: 0.55, y: 0.5, emissive: 1.4, solid: false, on: p.on,
        tex: { front: 'floor_bridge', side: 'metal_side', top: 'metal_side' } });
      for (const dx of [-w / 2 + 0.3, w / 2 - 0.3]) {
        buildProp(W, { t: 'box', x: p.x + dx, z: p.z, w: 0.16, d: 0.46, h: 0.36, tex: metal, solid: false, on: p.on });
      }
      W.addBox(p.x, p.z, w, 0.7);
      // the backrest's glowing piping
      glow(W, p, '#45d4ff', 0.5, 0.35, p.x, 1.0, p.z + 0.36);
      return null;
    },
  },

  'pro.fabricator': {
    textures: ['wall_panel_screen', 'metal_side', 'wall_cap'],
    build(W, p) {
      buildProp(W, { t: 'box', x: p.x, z: p.z, w: 0.96, d: 0.62, h: 1.95, on: p.on, emissive: 2.4,
        tex: { front: 'wall_panel_screen', side: 'metal_side', top: 'wall_cap' } });
      glow(W, p, '#7fe3ff', 1.0, 0.55, p.x, 1.55, p.z + 0.36);
      glow(W, p, '#ffb54a', 0.7, 0.5, p.x, 0.85, p.z + 0.36);
      return null;
    },
  },

  // the Moth as a map prop; `pad` adds the berth's hazard pad and its fuel mast
  'pro.moth': {
    textures: [...MOTH_TEXTURES, 'floor_hazard', 'pipe'],
    build(W, p) {
      if (p.pad) {
        buildProp(W, { t: 'floorPlane', x: p.x + 0.1, z: p.z, w: 4.6, d: 2.6, tex: 'floor_hazard', repeat: true, emissive: 0.9, on: p.on });
        buildProp(W, { t: 'pipe', axis: 'y', x: p.x + 2.0, z: p.z - 1.3, y0: 0, y1: 2.6, r: 0.1, on: p.on });
      }
      buildMoth(W, p);
      return null;
    },
  },
};

// ---------------------------------------------------------------- the Moth (shared builder)


const _n = new THREE.Vector3();

/** Indexed position/normal/uv geometry built from flat polygons (Batch.geometry merges it). */
class PolyGeo {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.idx = []; }

  /** A convex polygon; `out` is a direction its face must point along (the winding is fixed to match). */
  poly(pts, uvs, out) {
    _n.set(0, 0, 0);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      _n.x += (a[1] - b[1]) * (a[2] + b[2]);
      _n.y += (a[2] - b[2]) * (a[0] + b[0]);
      _n.z += (a[0] - b[0]) * (a[1] + b[1]);
    }
    if (_n.lengthSq() < 1e-12) return;
    _n.normalize();
    if (out && _n.x * out[0] + _n.y * out[1] + _n.z * out[2] < 0) {
      pts = [...pts].reverse();
      uvs = [...uvs].reverse();
      _n.negate();
    }
    const o = this.pos.length / 3;
    pts.forEach((p, i) => { this.pos.push(p[0], p[1], p[2]); this.nrm.push(_n.x, _n.y, _n.z); this.uv.push(uvs[i][0], uvs[i][1]); });
    for (let i = 1; i + 1 < pts.length; i++) this.idx.push(o, o + i, o + i + 1);
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    return g;
  }
}

/** Atlas pixel -> uv (three.js flips canvases: v = 1 at the top row). */
const auv = (px, py) => [px / MOTH_ATLAS.w, 1 - py / MOTH_ATLAS.h];

// fuselage stations nose (-x) to tail (+x): [x, half-width, keel y, dorsal y]
const HULL = [
  [-2.7, 0.04, 0.98, 1.04], [-2.32, 0.28, 0.84, 1.24], [-1.65, 0.55, 0.66, 1.46], [-0.75, 0.74, 0.56, 1.6],
  [0.6, 0.8, 0.54, 1.64], [1.7, 0.74, 0.58, 1.58], [2.3, 0.62, 0.66, 1.48],
];
// cross-section from keel to dorsal: [share of the half-width, share of the height, atlas row]
const PROFILE = [[0, 0, 63], [0.72, 0.06, 52], [1, 0.4, 36], [0.82, 0.8, 18], [0, 1, 0]];
const HULL_X0 = HULL[0][0], HULL_LEN = HULL[HULL.length - 1][0] - HULL_X0;
// canopy stations: [x, bulge]
const CANOPY = [[-2.08, 0], [-1.82, 0.72], [-1.38, 1], [-0.96, 0.82], [-0.64, 0]];

/** The hull section at x (stations interpolated): { hw, yb, yt }. */
function sectionAt(x) {
  for (let i = 0; i + 1 < HULL.length; i++) {
    const a = HULL[i], b = HULL[i + 1];
    if (x > b[0] && i + 2 < HULL.length) continue;
    const k = Math.min(1, Math.max(0, (x - a[0]) / (b[0] - a[0])));
    return { hw: a[1] + (b[1] - a[1]) * k, yb: a[2] + (b[2] - a[2]) * k, yt: a[3] + (b[3] - a[3]) * k };
  }
  return { hw: 0, yb: 1, yt: 1 };
}

/** A hull profile point at station s, profile index k, side +1 (south) or -1 (north). */
function hullPoint(s, k, side) {
  return [s[0], s[2] + (s[3] - s[2]) * PROFILE[k][1], side * s[1] * PROFILE[k][0]];
}

/** Flat slab (top, bottom, edges) from a top outline at `y`, `th` thick; uvs in atlas px per vertex. */
function slab(G, outline, uvPx, th, edgeUv) {
  const top = outline, bot = outline.map(([x, y, z]) => [x, y - th, z]);
  G.poly(top, uvPx.map(([u, v]) => auv(u, v)), [0, 1, 0]);
  G.poly(bot, uvPx.map(([u, v]) => auv(u, v)), [0, -1, 0]);
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    const mid = [(outline[i][0] + outline[j][0]) / 2, 0, (outline[i][2] + outline[j][2]) / 2];
    const cx = outline.reduce((a, p) => a + p[0], 0) / outline.length, cz = outline.reduce((a, p) => a + p[2], 0) / outline.length;
    G.poly([top[i], top[j], bot[j], bot[i]], [edgeUv[0], edgeUv[1], edgeUv[2], edgeUv[3]].map(([u, v]) => auv(u, v)), [mid[0] - cx, 0, mid[2] - cz]);
  }
}

/** Moth geometry in local space (nose to -x, south = +z), all mapped into the pro_moth_hull atlas. */
function mothGeometry(winged) {
  const G = new PolyGeo();
  const [hx, hy, hw] = MOTH_ATLAS.hull;
  const uOf = (x) => hx + ((x - HULL_X0) / HULL_LEN) * (hw - 1);
  // fuselage loft, both sides
  for (let i = 0; i + 1 < HULL.length; i++) {
    const a = HULL[i], b = HULL[i + 1];
    for (let k = 0; k + 1 < PROFILE.length; k++) {
      const v0 = hy + PROFILE[k][2], v1 = hy + PROFILE[k + 1][2];
      const uvs = [auv(uOf(a[0]), v0), auv(uOf(b[0]), v0), auv(uOf(b[0]), v1), auv(uOf(a[0]), v1)];
      for (const side of [1, -1]) {
        const pts = [hullPoint(a, k, side), hullPoint(b, k, side), hullPoint(b, k + 1, side), hullPoint(a, k + 1, side)];
        const m = [(a[0] + b[0]) / 2, 0, 0];
        const c = pts.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0]);
        const midY = (a[2] + a[3]) / 2;
        G.poly(pts, uvs, [0, c[1] - midY, c[2] - m[2] || side]);
      }
    }
  }
  // the tail plate and the nose cap
  const [mx, my] = MOTH_ATLAS.metal;
  for (const [s, dir] of [[HULL[HULL.length - 1], 1], [HULL[0], -1]]) {
    const ring = [0, 1, 2, 3, 4].map((k) => hullPoint(s, k, -1)).concat([3, 2, 1].map((k) => hullPoint(s, k, 1)));
    G.poly(ring, ring.map(([, y, z]) => auv(mx + 16 + z * 14, my + 30 - (y - s[2]) * 26)), [dir, 0, 0]);
  }
  // canopy bubble over the cockpit
  const [cx0, cy0, cw] = MOTH_ATLAS.canopy;
  const cLen = CANOPY[CANOPY.length - 1][0] - CANOPY[0][0];
  const canopyPoint = (x, b, k, side) => {
    const { hw: w, yb, yt } = sectionAt(x);
    if (k === 0) return [x, yb + (yt - yb) * 0.8, side * w * 0.84];
    if (k === 1) return [x, yt + 0.17 * b, side * w * 0.52];
    return [x, yt + 0.29 * b, 0];
  };
  const crow = [cy0 + 31, cy0 + 15, cy0];
  for (let i = 0; i + 1 < CANOPY.length; i++) {
    const [xa, ba] = CANOPY[i], [xb, bb] = CANOPY[i + 1];
    const ua = cx0 + ((xa - CANOPY[0][0]) / cLen) * (cw - 1), ub = cx0 + ((xb - CANOPY[0][0]) / cLen) * (cw - 1);
    for (let k = 0; k < 2; k++) {
      for (const side of [1, -1]) {
        const pts = [canopyPoint(xa, ba, k, side), canopyPoint(xb, bb, k, side), canopyPoint(xb, bb, k + 1, side), canopyPoint(xa, ba, k + 1, side)];
        G.poly(pts, [auv(ua, crow[k]), auv(ub, crow[k]), auv(ub, crow[k + 1]), auv(ua, crow[k + 1])], [0, 0.6, side]);
      }
    }
  }
  // stub wings (a slight droop to the tips); `winged` tears the north one off at mid-span
  const [wx, wy, ww, wh] = MOTH_ATLAS.wing;
  const wingUv = (chord, span) => [wx + chord * (ww - 1), wy + span * (wh - 1)];
  const edge = [[wx + 2, wy], [wx + 4, wy], [wx + 4, wy + 31], [wx + 2, wy + 31]];
  for (const side of [1, -1]) {
    const root = 0.79, tip = side < 0 && winged ? 1.3 : 1.88;
    const k = (tip - root) / (1.88 - root);
    const le = (s) => -0.3 + 0.92 * s, te = (s) => 1.3 - 0.08 * s, yAt = (s) => 1.0 - 0.1 * s;
    const outline = [[le(0), yAt(0), side * root], [te(0), yAt(0), side * root], [te(k), yAt(k), side * tip], [le(k), yAt(k), side * tip]];
    slab(G, outline, [wingUv(0, 0), wingUv(1, 0), wingUv(1, k), wingUv(0, k)], 0.07, edge);
  }
  if (winged) {
    // the torn-off tip, flat on the deck beside her
    const o = [[0.15, 0.08, -2.0], [0.95, 0.08, -2.15], [0.8, 0.08, -2.75], [0.05, 0.08, -2.55]];
    slab(G, o, [wingUv(0.45, 0.55), wingUv(1, 0.55), wingUv(1, 1), wingUv(0.45, 1)], 0.07, edge);
  }
  // tail fin
  const fin = [[1.05, 1.6, 0], [2.28, 1.48, 0], [2.42, 2.2, 0], [1.98, 2.2, 0]];
  for (const side of [1, -1]) {
    const f = fin.map(([x, y]) => [x, y, side * 0.035]);
    G.poly(f, [wingUv(0, 0), wingUv(1, 0), wingUv(1, 0.9), wingUv(0.55, 0.9)].map(([u, v]) => auv(u, v)), [0, 0, side]);
  }
  G.poly([[1.98, 2.2, 0.035], [2.42, 2.2, 0.035], [2.42, 2.2, -0.035], [1.98, 2.2, -0.035]], edge.map(([u, v]) => auv(u, v)), [0, 1, 0]);
  G.poly([[1.05, 1.6, 0.035], [1.98, 2.2, 0.035], [1.98, 2.2, -0.035], [1.05, 1.6, -0.035]], edge.map(([u, v]) => auv(u, v)), [-1, 0.6, 0]);
  return G.build();
}

/** A primitive's 0..1 uvs squeezed into an atlas rect. */
function intoAtlas(geo, [x, y, w, h]) {
  const a = geo.attributes.uv;
  for (let i = 0; i < a.count; i++) {
    const [u, v] = auv(x + a.getX(i) * (w - 1), y + (1 - a.getY(i)) * (h - 1));
    a.setXY(i, u, v);
  }
  if (geo.index) return geo;
  return geo.setIndex([...Array(geo.attributes.position.count).keys()]);
}

/**
 * Nyx's skiff, the Moth (C1-8): a lofted, tapered fuselage with a pointed nose, a glass canopy with
 * the cockpit glowing through it, stub wings, a tail fin, two engine nozzles with hot cores and
 * landing struts, all in the one pro_moth_hull atlas (panel lines, tape, the teal stripe, RB-24).
 *   p = { x, z, rot?, on?, winged? }   nose to -x before `rot` (radians around +Y)
 */
export function buildMoth(W, p) {
  const rot = p.rot || 0;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const at = (lx, lz) => [p.x + lx * cs + lz * sn, p.z - lx * sn + lz * cs];
  const matrix = new THREE.Matrix4().makeRotationY(rot).setPosition(p.x, 0, p.z);
  const B = W.batchFor(p.on);
  const hull = W.mats.tile('pro_moth_hull', { emissive: 1.7, roughness: 0.55, metalness: 0.28 });
  const geo = mothGeometry(!!p.winged);
  B.geometry(hull, geo, matrix);
  geo.dispose();
  const place = (g, lx, ly, lz) => {
    g.applyMatrix4(new THREE.Matrix4().setPosition(lx, ly, lz));
    B.geometry(hull, g, matrix);
    g.dispose();
  };
  // engines: nacelles with flared nozzles and hot cores
  const core = W.mats.plain('#ffb070', { emissive: '#ff8a3a', emissiveIntensity: 2.4, roughness: 0.4, metalness: 0 });
  for (const lz of [-0.42, 0.42]) {
    place(intoAtlas(new THREE.CylinderGeometry(0.21, 0.24, 0.9, 10, 1, true).rotateZ(-Math.PI / 2), MOTH_ATLAS.metal), 2.25, 0.92, lz);
    place(intoAtlas(new THREE.CylinderGeometry(0.27, 0.21, 0.18, 10, 1, true).rotateZ(-Math.PI / 2), MOTH_ATLAS.metal), 2.78, 0.92, lz);
    const disc = new THREE.CircleGeometry(0.2, 10).rotateY(Math.PI / 2);
    disc.applyMatrix4(new THREE.Matrix4().setPosition(2.74, 0.92, lz));
    B.geometry(core, disc, matrix);
    disc.dispose();
  }
  // landing struts: a nose leg and two splayed main legs, each on a pad
  const metal = [MOTH_ATLAS.metal[0] + 6, MOTH_ATLAS.metal[1] + 2, 10, 20];
  for (const [lx, lz, top, lean] of [[-1.75, 0, 0.7, 0], [0.9, 0.5, 0.56, 0.18], [0.9, -0.5, 0.56, -0.18]]) {
    place(intoAtlas(new THREE.BoxGeometry(0.1, top, 0.1).rotateX(lean), metal), lx, top / 2, lz + lean * top * 0.5);
    place(intoAtlas(new THREE.BoxGeometry(0.36, 0.05, 0.26), metal), lx, 0.025, lz + lean * top);
  }
  // colliders (axis-aligned around the rotated footprint)
  const box = (lx, lz, w, d) => {
    const [cx, cz] = at(lx, lz);
    W.addBox(cx, cz, Math.abs(w * cs) + Math.abs(d * sn), Math.abs(d * cs) + Math.abs(w * sn));
  };
  box(0, 0, 5.4, 1.5);
  box(0.5, 1.3, 1.6, 1.1);
  box(0.5, p.winged ? -1.05 : -1.3, 1.6, p.winged ? 0.55 : 1.1);
  // lights: hot nozzles, port red (south) and starboard green wingtips, the cockpit through the glass,
  // and a red anti-collision beacon blinking on the fin
  const light = (color, size, k, lx, ly, lz) => {
    const [gx, gz] = at(lx, lz);
    return glow(W, p, color, size, k, gx, ly, gz);
  };
  for (const lz of [-0.42, 0.42]) light('#ffb54a', 0.9, 0.8, 2.95, 0.92, lz);
  light('#ff5a5a', 0.6, 1.3, 0.62, 0.95, 1.92);
  light('#5dff9c', 0.55, 1.0, p.winged ? 0.5 : 0.62, p.winged ? 0.15 : 0.95, p.winged ? -2.4 : -1.92);
  light('#7fe3ff', 0.8, 0.32, -1.3, 1.62, 0);
  const beacon = light('#ff4a4a', 0.75, 1.4, 2.22, 2.3, 0);
  W.addUpdater((dt, t) => { beacon.visible = (t + p.x * 0.3) % 1.7 < 0.22; });
  if (p.winged) {
    // the torn wing root still sparks
    const [sx, sz] = at(0.5, -1.32);
    W.addEmitter('spark', { position: [sx, 1.0, sz], area: [0.4, 0.05, 0.05], rate: 0.5, burst: 6 }, p.on);
  }
}
