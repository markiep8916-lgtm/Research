// spire: prop builders (browser, TECH_PLAN 3.3). Registered types for the Security Spire, built into
// the World's batches (one draw per material) or into small groups for the few that move. Small parts
// carry the neutral sp_grain texture multiplied by their colour, so no lit surface reads flat.
//
// Light and alarm
//   sp.flood      { x, z, h = 2.7, wall?, south?, aim?: [x, z], warm?, cool?, k?, pool? }   a floodlight: on
//                 the north wall face at z (wall), a mast aimed at `aim`, else hung from above; every flood
//                 lays a soft pool of its light on the floor (the Spire reads by its pools); a `south` one
//                 (out of shot, on a south wall) is only its pool
//   sp.strobe     { x, y, z, side?: 'west' }      a red alert beacon on a wall face, pulsing with its lamp
//   sp.sign       { x, y, z, frame }              a lit deck sign (sp_signs row `frame`) on a north wall face
//   sp.pylon      { x, z, id }                    WARDEN's sigil pylon at the Checkpoint (the focal piece)
// Floors and lanes
//   sp.hazard     { x0, x1, z }                   a hazard-striped edge along z
//   sp.stripe     { x0, x1, z }                   a dashed bone lane line along z
//   sp.lift       { x, z }                        a lift platform with rails and amber lamps
// The Checkpoint and the Barracks
//   sp.barricade  { x, z0, z1 }                   dressing on a barricade cell run: rail, end lamps, shields
//   sp.turret     { x, z, rot }                   an idle turret emplacement (rot 0 faces north, PI south)
//   sp.crates     { x, z, n }                     security supply crates, stacked
//   sp.bunk       { x, z }                        a two-tier bunk along a north wall
//   sp.lockers    { x, z, n }                     a run of freestanding lockers
//   sp.mess       { x, z, w }                     a mess table with benches
//   sp.chest      chest: a Security Corps strongbox (case: a long blade case)       LivingProp setOpen
// Deck 4: the Armory, the Holding Cells, the guard post
//   sp.racks      { x, z, w }                     the locked cage over the armory's racks
//   sp.cot        { x, z }                        a cell cot
//   sp.shelves    { x, z, w }                     evidence shelving
//   sp.counter    { x, z, w }                     the guard post counter (the quartermaster's)
// Deck 5: officers, quarters, training
//   sp.banner     { x, y, z }                     a Security Corps banner on a north wall face
//   sp.planter    { x, z }                        a planter of hardy red-leaf shrubs
//   sp.bed        { x, z, made? }                 an officer's bunk (made: blanket squared away)
//   sp.desk       { x, z }                        a desk with a terminal and a lamp
//   sp.couch      { x, z }                        a lounge couch
//   sp.ring       { x, z, w, d }                  the sparring ring
//   sp.dummy      { x, z }                        a training dummy
//   sp.climb      { x, z, w }                     a climbing wall on a north wall face, crash mat below
//   sp.recorder   { x, z }                        the holo-recorder pedestal
//   sp.targets    { x0, x1, z }                   firing-range targets
//   sp.bench      { x, z, w }                     a gym bench
// Deck 6: Command
//   sp.console    { x, z }                        a console against a north wall (terminals use it too)
//   sp.holotable  { x, z, id }                    the command holo table: Tethys and its worlds      LivingProp
//                 setState('flare') swells the star white until it swallows the last world; null resets
//   sp.cmdchair   { x, z }                        Voss's command chair on its dais
//   sp.halberd    { x, z }                        Voss's energy halberd, lying where she fell
//   sp.interface  { x, z }                        the neural interface cradle in the Core Antechamber
//   sp.coredoor   { x, z }                        the round AI core door on a north wall face

import * as THREE from 'three';
import { makeGlow, makeLightShaft } from '../../core/vfx.js';
import { Batch, pipeGeometry } from '../../world/geometry.js';
import { textureSet, glowSet, setTextureFrame } from '../../art/tiles.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Seeded random in [0, 1). */
function rnd(seed) {
  let s = (Math.floor(Math.abs(seed) * 9973) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Merge `geo` into batch B at position pos, Euler [rx, ry, rz] (YXZ) and scale s (number or [x, y, z]). */
function put(B, mat, geo, pos, rot = null, s = 1) {
  _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, 'YXZ');
  _q.setFromEuler(_e);
  _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, typeof s === 'number' ? _s.setScalar(s) : _s.set(s[0], s[1], s[2]));
  B.geometry(mat, geo, _m);
  geo.dispose();
}

/** Same material on every face of a Batch.box. */
const all = (m, top = m) => ({ front: m, back: m, left: m, right: m, top });

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
  s.userData.baseColor.copy(s.material.color);
}

// Shared materials per World: grained parts are built on first use (their own texture objects, freed
// with the World's scene), tiles come from W.mats.
function grained(color, { roughness = 0.6, metalness = 0.35, emissive = null, k = 1, flat = false } = {}) {
  return () => {
    const set = textureSet('sp_grain', { layers: ['map', 'normal'] });
    const m = new THREE.MeshStandardMaterial({ color, map: set.map, normalMap: set.normalMap, roughness, metalness, flatShading: flat });
    if (emissive) { m.emissive.set(emissive); m.emissiveIntensity = k; }
    return m;
  };
}

const LAZY = {
  steel: grained('#5a5560', { roughness: 0.48, metalness: 0.55 }),
  steelDark: grained('#24212a', { roughness: 0.55, metalness: 0.5 }),
  bone: grained('#cfcbcf', { roughness: 0.5, metalness: 0.12 }),
  red: grained('#962030', { roughness: 0.5, metalness: 0.2 }),
  gold: grained('#d0a238', { roughness: 0.32, metalness: 0.75 }),
  cloth: grained('#3e3a46', { roughness: 0.95, metalness: 0 }),
  leather: grained('#3a2420', { roughness: 0.55, metalness: 0.05 }),
  leaf: grained('#2c4a34', { roughness: 0.8, metalness: 0, flat: true }),
  lampWhite: grained('#f0f0f8', { roughness: 0.3, metalness: 0.1, emissive: '#ffffff', k: 2.8 }),
  lampRed: grained('#801018', { roughness: 0.3, metalness: 0.1, emissive: '#ff2a3c', k: 2.8 }),
  lampGold: grained('#8a6420', { roughness: 0.3, metalness: 0.4, emissive: '#ffc04a', k: 2.6 }),
  lampCyan: grained('#105868', { roughness: 0.3, metalness: 0.1, emissive: '#45d4ff', k: 2.4 }),
  lampAmber: grained('#704010', { roughness: 0.3, metalness: 0.1, emissive: '#ff8a3a', k: 2.6 }),
};

function mats(W) {
  if (W.spMats) return W.spMats;
  const M = W.mats;
  W.spMats = {
    crate: M.tile('sp_crate', { roughness: 0.55, metalness: 0.4 }),
    panel: M.tile('sp_panel', { emissive: 2.4, roughness: 0.3, metalness: 0.1 }),
    lockers: M.tile('sp_lockers', { roughness: 0.5, metalness: 0.45 }),
    cap: M.tile('sp_cap', { roughness: 0.7, metalness: 0.35 }),
    signs: M.tile('sp_signs', { emissive: 2.4, roughness: 0.5, metalness: 0.2 }),
    hazard: M.tile('sp_hazard', { roughness: 0.6, metalness: 0.3, cast: false }),
    banner: M.tile('sp_banner', { roughness: 0.9, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide }),
  };
  for (const [k, make] of Object.entries(LAZY)) {
    Object.defineProperty(W.spMats, k, {
      configurable: true, enumerable: true,
      get() { const m = make(); Object.defineProperty(this, k, { value: m, enumerable: true }); return m; },
    });
  }
  return W.spMats;
}

// Shared soft mask for light pools (survives World.dispose): a smooth radial falloff.
let POOL_MASK = null;
function poolMask() {
  if (POOL_MASK) return POOL_MASK;
  const N = 64, data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(((x + 0.5) / N) * 2 - 1, ((y + 0.5) / N) * 2 - 1);
    const v = d >= 1 ? 0 : (1 - d * d) ** 2;
    const i = (y * N + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = data[i + 3] = Math.round(v * 255);
  }
  const tex = new THREE.DataTexture(data, N, N);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  tex.userData.shared = true;
  return (POOL_MASK = tex);
}

/** One additive pool material per colour per World (the pools batch into a single draw each). */
function poolMat(W, color, k) {
  W.spPools = W.spPools || {};
  const key = `${color}|${k}`;
  if (!W.spPools[key]) {
    W.spPools[key] = new THREE.MeshBasicMaterial({
      map: poolMask(), color: new THREE.Color(color).multiplyScalar(k), transparent: true, depthWrite: false, fog: false,
      blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    });
    W.spPools[key].userData.cast = false;
  }
  return W.spPools[key];
}

/** A soft pool of light on the floor at (x, z), w x d. */
function lightPool(W, B, color, k, x, z, w, d, y = 0.012) {
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  put(B, poolMat(W, color, k), g, [x, y, z], null, [w, 1, d]);
}

const FLOOD_COLOR = { white: ['#f4f0ff', 'lampWhite'], warm: ['#ffd0a0', 'lampWhite'], cool: ['#d6e4ff', 'lampWhite'] };

// ---------------------------------------------------------------- light and alarm

const flood = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const [color, lamp] = FLOOD_COLOR[p.warm ? 'warm' : p.cool ? 'cool' : 'white'];
    const h = p.h ?? 2.7;
    let hx = p.x, hz = p.z, px = p.x, pz = p.z, tilt = 0;
    if (p.wall) {
      // a bracket out of the north wall face, the head tilted down over the floor
      B.box(all(M.steelDark), p.x, p.z - 0.15, 0.1, 0.3, h + 0.02, h + 0.12, 0);
      pz = p.z + 2.0;
      tilt = 0.75;
    } else if (p.south) {
      // on a south wall the head would hang between the camera and the deck: only its pool shows
      lightPool(W, B, color, p.k ?? 0.32, p.x, p.z - 2.0, p.pool ?? 4.6, (p.pool ?? 4.6) * 0.85);
      return;
    } else if (p.aim) {
      // a mast with a cross-arm, the head aimed at the pool
      put(B, M.steelDark, new THREE.CylinderGeometry(0.06, 0.09, h, 8), [p.x, h / 2, p.z]);
      put(B, M.steel, new THREE.CylinderGeometry(0.22, 0.26, 0.12, 10), [p.x, 0.06, p.z]);
      [px, pz] = p.aim;
      hz = p.z + Math.sign(pz - p.z || 1) * 0.12;
      tilt = Math.sign(pz - p.z || 1) * 0.6;
      W.addCircle(p.x, p.z, 0.22);
    } else {
      // hung from the dark above on a cable
      B.box(all(M.steelDark), p.x, p.z, 0.02, 0.02, h + 0.1, h + 1.6, 0);
    }
    const yaw = p.aim ? Math.atan2(px - p.x, pz - p.z) : 0;
    const head = new THREE.BoxGeometry(0.46, 0.18, 0.3);
    put(B, M.steelDark, head, [hx, h, hz], [tilt, p.aim ? yaw : 0, 0]);
    const lens = new THREE.BoxGeometry(0.38, 0.02, 0.22);
    lens.translate(0, -0.095, 0);
    put(B, M[lamp], lens, [hx, h, hz], [tilt, p.aim ? yaw : 0, 0]);
    glow(W, G, color, 0.8, 0.55, hx, h - 0.12, hz + 0.1);
    lightPool(W, B, color, p.k ?? 0.32, px, pz, p.pool ?? 4.6, (p.pool ?? 4.6) * 0.85);
    if (p.aim) {
      const s = makeLightShaft({ width: 0.5, height: h, color, opacity: 0.09, spread: 2.4, floorY: 0 });
      s.position.set(hx, h - 0.1, hz);
      s.rotation.set(0, 0, 0);
      G.add(s);
    }
  },
};

const strobe = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const y = p.y ?? 2.5;
    const west = p.side === 'west';
    const rot = west ? Math.PI / 2 : 0;
    const ox = west ? -0.12 : 0, oz = west ? 0 : 0.12;
    B.box(all(M.steelDark), p.x + ox * 0.6, p.z + oz * 0.6, 0.26, 0.12, y - 0.16, y + 0.14, rot);
    put(B, M.lampRed, new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), [p.x + ox, y - 0.02, p.z + oz], [west ? 0 : -Math.PI / 2, rot, 0]);
    for (const d of [-0.07, 0, 0.07]) B.box(all(M.steelDark), p.x + ox + (west ? 0 : d), p.z + oz + (west ? d : 0), 0.015, 0.015, y - 0.12, y + 0.1, 0);
    glow(W, G, '#ff2a3c', 1.4, 1.1, p.x + ox * 1.6, y, p.z + oz * 1.6);
  },
};

const SIGN_ROWS = 7;

const sign = {
  textures: ['sp_signs'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const row = Math.max(0, Math.min(SIGN_ROWS - 1, p.frame || 0));
    const v0 = 1 - (row + 1) / SIGN_ROWS, v1 = 1 - row / SIGN_ROWS;
    const w = 2.0, h = 0.5, y = p.y ?? 2.6;
    B.box({ ...all(M.steelDark), front: M.signs }, p.x, p.z + 0.04, w, 0.06, y - h / 2, y + h / 2, 0, { front: [0, v0, 1, v1] });
    for (const d of [-0.8, 0.8]) B.box(all(M.steelDark), p.x + d, p.z + 0.02, 0.06, 0.04, y + h / 2, y + h / 2 + 0.25, 0);
  },
};

const pylon = {
  textures: ['warden_sigil', 'sp_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const x = p.x, z = p.z;
    // an octagonal plinth with a gold lip, a tapered black obelisk, a gold crown
    put(B, M.steelDark, new THREE.CylinderGeometry(0.95, 1.05, 0.26, 8), [x, 0.13, z], [0, Math.PI / 8, 0]);
    put(B, M.gold, new THREE.CylinderGeometry(0.97, 0.97, 0.04, 8, 1, true), [x, 0.27, z], [0, Math.PI / 8, 0]);
    put(B, M.steel, new THREE.CylinderGeometry(0.62, 0.78, 0.3, 8), [x, 0.4, z], [0, Math.PI / 8, 0]);
    put(B, M.steelDark, new THREE.CylinderGeometry(0.3, 0.46, 2.7, 4), [x, 1.9, z], [0, Math.PI / 4, 0]);
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      put(B, M.gold, new THREE.BoxGeometry(0.035, 2.66, 0.035), [x + Math.sin(a + Math.PI / 4) * 0.39, 1.9, z + Math.cos(a + Math.PI / 4) * 0.39], [0.06 * Math.cos(a + Math.PI / 4), 0, -0.06 * Math.sin(a + Math.PI / 4)]);
    }
    put(B, M.lampGold, new THREE.ConeGeometry(0.32, 0.5, 4), [x, 3.5, z], [0, Math.PI / 4, 0]);
    // the sigil screen on the south face
    const set = glowSet('warden_sigil');
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.66), new THREE.MeshBasicMaterial({ map: set.map, color: new THREE.Color(2.1, 2.1, 2.1), toneMapped: false }));
    screen.position.set(x, 2.05, z + 0.42);
    screen.rotation.x = -0.05;
    G.add(screen);
    // a gold ring turning slowly round the obelisk, and the glow of the crown
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 6, 40), M.lampGold);
    ring.position.set(x, 2.75, z);
    ring.rotation.x = Math.PI / 2 - 0.18;
    G.add(ring);
    glow(W, G, '#ffc04a', 2.4, 1.0, x, 3.45, z + 0.1);
    glow(W, G, '#ffc04a', 1.4, 0.6, x, 2.05, z + 0.5);
    lightPool(W, B, '#ffc04a', 0.3, x, z + 0.4, 4.2, 3.6);
    W.addEmitter('sp_motes', { position: [x, 2.2, z + 0.2], area: [1.2, 1.6, 1.2], rate: 4 }, p.on);
    W.addCircle(x, z, 1.0);
    let last = -1;
    return {
      kind: 'pylon',
      object: ring,
      update(dt, t) {
        if (t === last) return;
        last = t;
        ring.rotation.z = t * 0.35;
        ring.position.y = 2.75 + Math.sin(t * 0.9) * 0.06;
        setTextureFrame(set, t * 2);
      },
    };
  },
};

// ---------------------------------------------------------------- floors and lanes

const hazardStrip = {
  textures: ['sp_hazard'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const len = p.x1 - p.x0, d = p.d ?? 0.36;
    B.faceY(M.hazard, p.x0, p.x1, p.z - d / 2, p.z + d / 2, 0.008, [0, 0, len, d]);
  },
};

const stripe = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    for (let x = p.x0 + 0.2; x + 0.7 <= p.x1; x += 1.2) B.faceY(M.bone, x, x + 0.7, p.z - 0.05, p.z + 0.05, 0.009);
  },
};

const lift = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const east = p.x > 36;
    const rx = p.x + (east ? 0.92 : -0.92);
    B.box({ ...all(M.steelDark), top: M.steel }, p.x, p.z, 1.9, 1.9, 0, 0.05, 0);
    for (const [a, b, c, d] of [[-0.95, 0.95, -0.95, -0.85], [-0.95, 0.95, 0.85, 0.95], [-0.95, -0.85, -0.85, 0.85], [0.85, 0.95, -0.85, 0.85]]) {
      B.faceY(M.hazard, p.x + a, p.x + b, p.z + c, p.z + d, 0.056, [0, 0, (b - a) * 2, (d - c) * 2]);
    }
    for (const dz of [-0.9, 0.9]) {
      B.box(all(M.steelDark), rx, p.z + dz, 0.12, 0.12, 0, 3.0, 0);
      B.box(all(M.lampAmber), rx + (east ? -0.07 : 0.07), p.z + dz, 0.02, 0.06, 0.4, 2.6, 0);
    }
    B.box(all(M.steelDark), rx, p.z, 0.14, 1.94, 2.86, 3.0, 0);
    for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) B.box(all(M.lampAmber), p.x + dx, p.z + dz, 0.1, 0.1, 0.05, 0.08, 0);
    lightPool(W, B, '#ff8a3a', 0.22, p.x, p.z, 2.6, 2.6);
  },
};

// ---------------------------------------------------------------- the Checkpoint and the Barracks

const barricade = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const len = p.z1 - p.z0, cz = (p.z0 + p.z1) / 2;
    B.box(all(M.steel), p.x, cz, 0.16, len - 0.1, 1.05, 1.12, 0);
    for (const z of [p.z0 + 0.12, p.z1 - 0.12]) {
      B.box(all(M.steelDark), p.x, z, 0.12, 0.12, 1.05, 1.42, 0);
      B.box(all(M.lampRed), p.x, z, 0.14, 0.14, 1.42, 1.52, 0);
    }
    // riot shields leaning on the south side, a scatter of spent cells
    const r = rnd(p.x + p.z0);
    for (let k = 0; k < 2; k++) {
      const z = p.z0 + 0.6 + r() * (len - 1.2), side = k ? 1 : -1;
      const g = new THREE.BoxGeometry(0.42, 0.78, 0.04);
      put(B, k ? M.bone : M.steel, g, [p.x + side * 0.62, 0.37, z], [0.0, Math.PI / 2, side * 0.32]);
    }
    for (let k = 0; k < 5; k++) put(B, M.gold, new THREE.CylinderGeometry(0.02, 0.02, 0.07, 5), [p.x + (r() - 0.5) * 1.6, 0.02, p.z0 + r() * len], [Math.PI / 2, r() * 6, 0]);
  },
};

const turret = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const rot = p.rot || 0, dx = -Math.sin(rot), dz = -Math.cos(rot);
    put(B, M.steelDark, new THREE.CylinderGeometry(0.34, 0.42, 0.7, 10), [p.x, 0.35, p.z]);
    put(B, M.steel, new THREE.CylinderGeometry(0.22, 0.28, 0.16, 10), [p.x, 0.78, p.z]);
    B.box({ ...all(M.bone), top: M.steel }, p.x, p.z, 0.56, 0.48, 0.86, 1.22, rot);
    const barrel = new THREE.CylinderGeometry(0.06, 0.07, 0.8, 8);
    barrel.rotateX(Math.PI / 2);
    put(B, M.steelDark, barrel, [p.x + dx * 0.5, 1.04, p.z + dz * 0.5], [0, Math.atan2(dx, dz), 0]);
    put(B, M.lampRed, new THREE.SphereGeometry(0.06, 8, 6), [p.x + dx * 0.29, 1.12, p.z + dz * 0.29]);
    B.box(all(M.red), p.x, p.z, 0.58, 0.5, 1.0, 1.05, rot);
    W.addCircle(p.x, p.z, 0.45);
  },
};

const crates = {
  textures: ['sp_crate'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const r = rnd(p.x * 3.1 + p.z);
    const n = p.n || 2;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < n; i++) {
      const s = 0.62 + r() * 0.14;
      const stacked = i === 2;
      const x = stacked ? p.x - 0.1 : p.x + (i - (Math.min(n, 2) - 1) / 2) * 0.82, z = p.z + (stacked ? 0 : (r() - 0.5) * 0.2);
      const y0 = stacked ? 0.66 : 0, rot = (r() - 0.5) * 0.3;
      B.box({ ...all(M.crate), top: M.cap }, x, z, s, s, y0, y0 + s, rot);
      if (!stacked) { minX = Math.min(minX, x - s / 2); maxX = Math.max(maxX, x + s / 2); minZ = Math.min(minZ, z - s / 2); maxZ = Math.max(maxZ, z + s / 2); }
    }
    W.addBox((minX + maxX) / 2, (minZ + maxZ) / 2, maxX - minX, maxZ - minZ);
  },
};

const bunk = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const L = 1.9, D = 0.86, x = p.x, z = p.z;
    for (const [dx, dz] of [[-L / 2, -D / 2], [L / 2, -D / 2], [-L / 2, D / 2], [L / 2, D / 2]]) B.box(all(M.steelDark), x + dx, z + dz, 0.06, 0.06, 0, 1.75, 0);
    for (const y of [0.32, 1.3]) {
      B.box(all(M.steel), x, z, L, D, y, y + 0.06, 0);
      B.box({ ...all(M.cloth), top: M.bone }, x, z, L - 0.1, D - 0.08, y + 0.06, y + 0.17, 0);
      B.box(all(M.red), x + 0.18, z + 0.02, L - 0.5, D - 0.04, y + 0.17, y + 0.22, 0);
      B.box(all(M.bone), x - L / 2 + 0.24, z, 0.32, D - 0.24, y + 0.17, y + 0.26, 0);
    }
    for (let y = 0.5; y < 1.3; y += 0.24) B.box(all(M.steel), x + L / 2 + 0.03, z + 0.2, 0.03, 0.3, y, y + 0.03, 0);
    W.addBox(x, z, L + 0.1, D + 0.06);
  },
};

const lockers = {
  textures: ['sp_lockers'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const n = p.n || 3, w = n * 0.5, h = 1.8, d = 0.46;
    B.box({ front: M.lockers, back: M.steelDark, left: M.steel, right: M.steel, top: M.cap }, p.x, p.z, w, d, 0, h, 0, { front: [0, 0, n * 0.5, 1] });
    B.box(all(M.steelDark), p.x, p.z, w + 0.04, d + 0.04, h, h + 0.05, 0);
    W.addBox(p.x, p.z, w, d);
  },
};

const mess = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const w = p.w || 3, x = p.x, z = p.z;
    B.box({ ...all(M.steel), top: M.steel }, x, z, w, 0.9, 0.7, 0.76, 0);
    for (const dx of [-w / 2 + 0.2, w / 2 - 0.2]) B.box(all(M.steelDark), x + dx, z, 0.1, 0.7, 0, 0.7, 0);
    for (const dz of [-0.72, 0.72]) {
      B.box(all(M.steel), x, z + dz, w, 0.32, 0.42, 0.47, 0);
      for (const dx of [-w / 2 + 0.25, w / 2 - 0.25]) B.box(all(M.steelDark), x + dx, z + dz, 0.06, 0.24, 0, 0.42, 0);
    }
    const r = rnd(x + z);
    for (let i = 0; i < 4; i++) {
      const tx = x - w / 2 + 0.4 + i * (w - 0.8) / 3, tz = z + (i % 2 ? 0.2 : -0.2);
      B.box(all(M.bone), tx, tz, 0.36, 0.26, 0.76, 0.79, (r() - 0.5) * 0.4);
      if (r() < 0.6) put(B, M.red, new THREE.CylinderGeometry(0.04, 0.035, 0.1, 8), [tx + 0.24, 0.81, tz]);
    }
    W.addBox(x, z, w, 2.1);
  },
};

const chest = {
  textures: ['sp_crate', 'sp_cap'],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on);
    const long = p.case;
    const w = long ? 1.3 : 0.9, d = long ? 0.42 : 0.6, h = long ? 0.3 : 0.5;
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.rot || 0;
    const B = new Batch();
    B.box({ ...all(M.crate), top: M.steelDark }, 0, 0, w, d, 0, h, 0);
    for (const k of [-w / 2 + 0.12, w / 2 - 0.12]) B.box(all(M.steelDark), k, 0, 0.06, d + 0.04, 0, h - 0.04, 0);
    B.build(g);
    const hinge = new THREE.Group();
    hinge.position.set(0, h, -d / 2);
    const LB = new Batch();
    LB.box({ ...all(M.steel), top: long ? M.red : M.cap }, 0, d / 2, w + 0.04, d + 0.04, 0, 0.12, 0);
    if (long) LB.box(all(M.gold), 0, d / 2, w - 0.2, 0.04, 0.12, 0.14, 0);
    LB.build(hinge);
    g.add(hinge);
    const led = makeGlow('#ff4050', 0.4, 0.7);
    led.position.set(w / 2 - 0.2, h - 0.12, d / 2 + 0.03);
    g.add(led);
    G.add(g);
    W.addBox(p.x, p.z, w + 0.08, d + 0.08);
    let lid = 0, last = -1;
    const maxAngle = 1.75;
    const living = {
      kind: 'chest',
      opened: false,
      object: g,
      setOpen(open, instant = false) {
        living.opened = !!open;
        tintGlow(led, open ? '#4dff9c' : '#ff4050', 0.7);
        if (instant) { lid = open ? 1 : 0; hinge.rotation.x = -maxAngle * lid; }
      },
      update(dt) {
        const target = living.opened ? 1 : 0;
        if (lid === target) return;
        lid = target ? Math.min(1, lid + dt * 2.4) : Math.max(0, lid - dt * 2.4);
        hinge.rotation.x = -maxAngle * (1 - (1 - lid) * (1 - lid)) - Math.sin(lid * Math.PI) * 0.1;
        if (last !== target && target === 1 && W.onSound) W.onSound('pickup', { volume: 0.4, pitch: 0.7 });
        last = target;
      },
    };
    living.setOpen(!!p.open, true);
    return living;
  },
};

// ---------------------------------------------------------------- Deck 4

const racks = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const w = p.w || 10, z = p.z + 0.32, x0 = p.x - w / 2;
    for (let x = x0; x <= x0 + w + 0.01; x += 0.25) B.box(all(M.steelDark), x, z, 0.03, 0.03, 0.05, 2.4, 0);
    for (const y of [0.05, 1.2, 2.4]) B.box(all(M.steel), p.x, z, w + 0.06, 0.05, y, y + 0.06, 0);
    for (let x = x0 + 1.5; x < x0 + w; x += 3) {
      B.box(all(M.red), x, z + 0.04, 0.2, 0.08, 1.1, 1.36, 0);
      B.box(all(M.lampRed), x, z + 0.09, 0.08, 0.02, 1.28, 1.32, 0);
    }
    W.addBox(p.x, p.z + 0.15, w + 0.1, 0.4);
  },
};

const cot = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const L = 1.7, D = 0.66;
    B.box(all(M.steel), p.x, p.z, L, D, 0.36, 0.42, 0);
    for (const dx of [-L / 2 + 0.1, L / 2 - 0.1]) B.box(all(M.steelDark), p.x + dx, p.z, 0.06, D - 0.06, 0, 0.36, 0);
    B.box({ ...all(M.cloth), top: M.bone }, p.x, p.z, L - 0.1, D - 0.08, 0.42, 0.5, 0);
    B.box(all(M.cloth), p.x + 0.45, p.z, 0.5, D - 0.06, 0.5, 0.56, 0);
    W.addBox(p.x, p.z, L, D);
  },
};

const shelves = {
  textures: ['sp_crate'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const w = p.w || 3, d = 0.46, z = p.z + 0.08;
    for (const dx of [-w / 2, 0, w / 2]) B.box(all(M.steelDark), p.x + dx, z, 0.06, d, 0, 2.1, 0);
    const r = rnd(p.x + p.z * 3);
    for (const y of [0.12, 0.8, 1.48]) {
      B.box(all(M.steel), p.x, z, w, d, y, y + 0.04, 0);
      for (let x = p.x - w / 2 + 0.3; x < p.x + w / 2 - 0.2; x += 0.42 + r() * 0.2) {
        if (r() < 0.25) continue;
        const s = 0.26 + r() * 0.14;
        B.box({ ...all(r() < 0.5 ? M.bone : M.crate), top: M.cap }, x, z, s, 0.34, y + 0.04, y + 0.04 + s * 0.9, (r() - 0.5) * 0.2);
      }
    }
    W.addBox(p.x, z, w + 0.1, d);
  },
};

const counter = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const w = p.w || 3, d = 0.6;
    B.box({ ...all(M.steel), top: M.steel }, p.x, p.z, w, d, 0, 1.0, 0);
    B.box(all(M.red), p.x, p.z + d / 2 + 0.005, w, 0.01, 0.72, 0.8, 0);
    B.box(all(M.steelDark), p.x, p.z + d / 2 + 0.01, w, 0.02, 0, 0.1, 0);
    const scr = new THREE.PlaneGeometry(0.5, 0.36);
    scr.rotateX(-0.5);
    put(B, M.panel, scr, [p.x - w / 2 + 0.5, 1.2, p.z - 0.05]);
    B.box(all(M.steelDark), p.x - w / 2 + 0.5, p.z - 0.14, 0.06, 0.06, 1.0, 1.1, 0);
    W.addBox(p.x, p.z, w, d);
  },
};

// ---------------------------------------------------------------- Deck 5

const banner = {
  textures: ['sp_banner'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const y = p.y ?? 2.9, w = 0.9, h = 1.8;
    B.faceZ(M.banner, p.x - w / 2, p.x + w / 2, y - h, y, p.z + 0.05, 1);
    put(B, M.gold, new THREE.CylinderGeometry(0.025, 0.025, w + 0.24, 6), [p.x, y + 0.02, p.z + 0.07], [0, 0, Math.PI / 2]);
    for (const d of [-0.57, 0.57]) put(B, M.gold, new THREE.SphereGeometry(0.045, 8, 6), [p.x + d, y + 0.02, p.z + 0.07]);
  },
};

const planter = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    B.box({ ...all(M.steelDark), top: M.cloth }, p.x, p.z, 0.62, 0.62, 0, 0.5, Math.PI / 4);
    B.box(all(M.gold), p.x, p.z, 0.66, 0.66, 0.5, 0.53, Math.PI / 4);
    const r = rnd(p.x * 7 + p.z);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r(), rr = i ? 0.16 : 0;
      put(B, i % 3 ? M.leaf : M.red, new THREE.IcosahedronGeometry(0.16 + r() * 0.08, 0), [p.x + Math.cos(a) * rr, 0.66 + r() * 0.3 + (i ? 0 : 0.2), p.z + Math.sin(a) * rr], [r(), r(), r()]);
    }
    W.addCircle(p.x, p.z, 0.4);
  },
};

const bed = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const L = 2.0, D = 1.0, x = p.x, z = p.z;
    B.box(all(M.steelDark), x, z, L, D, 0, 0.36, 0);
    B.box(all(M.steel), x - L / 2 + 0.04, z, 0.08, D, 0, 0.9, 0);
    B.box({ ...all(M.cloth), top: M.bone }, x + 0.04, z, L - 0.12, D - 0.06, 0.36, 0.5, 0);
    B.box(all(M.bone), x - L / 2 + 0.3, z, 0.36, D - 0.3, 0.5, 0.6, 0);
    if (p.made) {
      // squared away: a navy blanket, a folded band at the head
      B.box(all(M.cloth), x + 0.22, z, L - 0.5, D - 0.02, 0.5, 0.56, 0);
      B.box(all(M.bone), x - 0.08, z, 0.14, D, 0.5, 0.58, 0);
    } else {
      const r = rnd(x + z);
      for (let i = 0; i < 3; i++) B.box(all(M.red), x + 0.1 + i * 0.32, z + (r() - 0.5) * 0.2, 0.5, D - 0.1 - r() * 0.2, 0.5, 0.58 + r() * 0.08, (r() - 0.5) * 0.6);
    }
    W.addBox(x, z, L, D);
  },
};

const desk = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const x = p.x, z = p.z, w = 1.4, d = 0.6;
    B.box({ ...all(M.steel), top: M.steel }, x, z, w, d, 0.72, 0.78, 0);
    for (const dx of [-w / 2 + 0.06, w / 2 - 0.06]) B.box(all(M.steelDark), x + dx, z, 0.06, d - 0.04, 0, 0.72, 0);
    B.box(all(M.steelDark), x + 0.4, z, 0.5, d - 0.06, 0.4, 0.72, 0);
    const scr = new THREE.PlaneGeometry(0.56, 0.36);
    scr.rotateX(-0.15);
    put(B, M.panel, scr, [x - 0.15, 1.02, z - 0.12]);
    B.box(all(M.steelDark), x - 0.15, z - 0.16, 0.6, 0.04, 0.8, 1.22, 0);
    put(B, M.steelDark, new THREE.CylinderGeometry(0.01, 0.01, 0.38, 5), [x + 0.52, 0.97, z - 0.1]);
    put(B, M.lampWhite, new THREE.ConeGeometry(0.09, 0.1, 10, 1, true), [x + 0.52, 1.17, z - 0.02], [0.5, 0, 0]);
    glow(W, G, '#ffc890', 0.9, 0.8, x + 0.52, 1.1, z + 0.02);
    // the chair, pulled out
    B.box(all(M.leather), x - 0.15, z + 0.62, 0.46, 0.44, 0.42, 0.5, 0.15);
    B.box(all(M.leather), x - 0.13, z + 0.84, 0.46, 0.08, 0.5, 0.95, 0.15);
    B.box(all(M.steelDark), x - 0.15, z + 0.62, 0.06, 0.06, 0, 0.42, 0);
    W.addBox(x, z, w, d);
  },
};

const couch = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const w = 2.0, d = 0.84, x = p.x, z = p.z;
    B.box(all(M.leather), x, z + 0.06, w, d - 0.12, 0.1, 0.44, 0);
    B.box(all(M.leather), x, z - d / 2 + 0.1, w, 0.2, 0.1, 0.92, 0);
    for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) B.box(all(M.leather), x + dx, z, 0.2, d, 0.1, 0.66, 0);
    for (const dx of [-0.45, 0.45]) B.box(all(M.leather), x + dx, z + 0.1, 0.86, d - 0.3, 0.44, 0.54, 0);
    B.box(all(M.steelDark), x, z, w - 0.1, d - 0.1, 0, 0.1, 0);
    W.addBox(x, z, w, d);
  },
};

const ring = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const w = p.w || 5, d = p.d || 4, x = p.x, z = p.z, y = 0.14;
    B.box({ ...all(M.steelDark), top: M.cloth }, x, z, w, d, 0, y, 0);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const px = x + a * (w / 2 - 0.12), pz = z + b * (d / 2 - 0.12);
      B.box(all(M.steelDark), px, pz, 0.12, 0.12, y, 1.25, 0);
      B.box(all(M.red), px, pz, 0.18, 0.18, 0.9, 1.3, 0);
    }
    for (const ry of [0.62, 0.98]) {
      B.box(all(M.red), x, z - d / 2 + 0.12, w - 0.24, 0.04, ry, ry + 0.04, 0);
      B.box(all(M.red), x, z + d / 2 - 0.12, w - 0.24, 0.04, ry, ry + 0.04, 0);
      B.box(all(M.red), x - w / 2 + 0.12, z, 0.04, d - 0.24, ry, ry + 0.04, 0);
      B.box(all(M.red), x + w / 2 - 0.12, z, 0.04, d - 0.24, ry, ry + 0.04, 0);
    }
    B.faceY(M.bone, x - w / 2 + 0.4, x + w / 2 - 0.4, z - d / 2 + 0.4, z - d / 2 + 0.47, y + 0.004);
    B.faceY(M.bone, x - w / 2 + 0.4, x + w / 2 - 0.4, z + d / 2 - 0.47, z + d / 2 - 0.4, y + 0.004);
    B.faceY(M.bone, x - 0.04, x + 0.04, z - d / 2 + 0.47, z + d / 2 - 0.47, y + 0.004);
    W.addBox(x, z, w, d);
  },
};

const dummy = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    put(B, M.steelDark, new THREE.CylinderGeometry(0.22, 0.28, 0.12, 10), [p.x, 0.06, p.z]);
    put(B, M.steel, new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), [p.x, 0.55, p.z]);
    put(B, M.red, new THREE.CylinderGeometry(0.2, 0.23, 0.7, 10), [p.x, 1.25, p.z]);
    put(B, M.bone, new THREE.SphereGeometry(0.15, 10, 8), [p.x, 1.76, p.z]);
    put(B, M.red, new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), [p.x + 0.22, 1.35, p.z + 0.08], [0, 0, 1.2]);
    put(B, M.bone, new THREE.BoxGeometry(0.3, 0.06, 0.03), [p.x, 1.38, p.z + 0.21]);
    W.addCircle(p.x, p.z, 0.3);
  },
};

const climb = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const w = p.w || 5;
    B.box({ ...all(M.steelDark), front: M.cloth }, p.x, p.z + 0.05, w, 0.1, 0.1, 2.9, 0);
    const r = rnd(p.x + 11);
    const holds = [M.red, M.bone, M.gold, M.red];
    for (let i = 0; i < 42; i++) {
      const hx = p.x - w / 2 + 0.2 + r() * (w - 0.4), hy = 0.3 + r() * 2.5;
      put(B, holds[i % holds.length], new THREE.DodecahedronGeometry(0.05 + r() * 0.04, 0), [hx, hy, p.z + 0.12], [r(), r(), r()], [1, 0.8, 0.6]);
    }
    B.box({ ...all(M.red), top: M.cloth }, p.x, p.z + 0.7, w - 0.2, 1.1, 0, 0.12, 0);
  },
};

const recorder = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    put(B, M.steelDark, new THREE.CylinderGeometry(0.28, 0.34, 0.14, 12), [p.x, 0.07, p.z]);
    put(B, M.steel, new THREE.CylinderGeometry(0.08, 0.1, 0.72, 8), [p.x, 0.5, p.z]);
    put(B, M.steelDark, new THREE.CylinderGeometry(0.22, 0.12, 0.12, 12), [p.x, 0.92, p.z]);
    put(B, M.lampCyan, new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), [p.x, 0.98, p.z]);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 6, 28), M.lampCyan);
    halo.position.set(p.x, 1.12, p.z);
    halo.rotation.x = Math.PI / 2;
    G.add(halo);
    glow(W, G, '#45d4ff', 1.1, 0.8, p.x, 1.05, p.z + 0.05);
    W.addCircle(p.x, p.z, 0.3);
    let last = -1;
    return {
      kind: 'recorder',
      object: halo,
      update(dt, t) {
        if (t === last) return;
        last = t;
        halo.position.y = 1.12 + Math.sin(t * 1.6) * 0.04;
        halo.rotation.z = t * 0.8;
      },
    };
  },
};

const targets = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const n = Math.max(1, Math.floor((p.x1 - p.x0) / 2.6));
    for (let i = 0; i < n; i++) {
      const x = p.x0 + 1.3 + i * ((p.x1 - p.x0 - 2.6) / Math.max(1, n - 1));
      B.box(all(M.steelDark), x, p.z, 0.06, 0.06, 0, 1.0, 0);
      B.box({ ...all(M.steel), front: M.bone }, x, p.z + 0.02, 0.62, 0.04, 1.0, 1.82, 0);
      for (const [r0, r1, m] of [[0.2, 0.25, M.red], [0.1, 0.14, M.red], [0, 0.05, M.red]]) {
        put(B, m, new THREE.RingGeometry(r0, r1, 20), [x, 1.42, p.z + 0.045]);
      }
      B.box(all(M.red), x, p.z, 0.8, 0.12, 0, 0.04, 0);
    }
  },
};

const bench = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const w = p.w || 2;
    B.box({ ...all(M.steel), top: M.red }, p.x, p.z, w, 0.4, 0.4, 0.48, 0);
    for (const dx of [-w / 2 + 0.15, w / 2 - 0.15]) B.box(all(M.steelDark), p.x + dx, p.z, 0.06, 0.34, 0, 0.4, 0);
    W.addBox(p.x, p.z, w, 0.4);
  },
};

// ---------------------------------------------------------------- Deck 6

const console_ = {
  textures: ['sp_panel'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const x = p.x, z = p.z, w = 0.96, d = 0.56;
    B.box({ ...all(M.steel), top: M.steelDark }, x, z - 0.02, w, d, 0, 0.82, 0);
    B.box(all(M.red), x, z + d / 2 - 0.015, w, 0.01, 0.64, 0.7, 0);
    const scr = new THREE.PlaneGeometry(w - 0.12, 0.5);
    scr.rotateX(-0.95);
    put(B, M.panel, scr, [x, 0.98, z - 0.08]);
    B.box(all(M.steelDark), x, z - 0.26, w, 0.06, 0.82, 1.18, 0);
    W.addBox(x, z - 0.02, w, d);
  },
};

const holotable = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const x = p.x, z = p.z;
    put(B, M.steelDark, new THREE.CylinderGeometry(0.5, 0.7, 0.8, 12), [x, 0.4, z]);
    put(B, M.steel, new THREE.CylinderGeometry(1.05, 0.95, 0.14, 24), [x, 0.87, z]);
    put(B, M.steelDark, new THREE.CylinderGeometry(0.92, 0.92, 0.02, 24), [x, 0.95, z]);
    put(B, M.gold, new THREE.TorusGeometry(1.03, 0.03, 6, 40), [x, 0.94, z], [Math.PI / 2, 0, 0]);
    // the projection: Tethys, three orbits and the worlds on them
    const holo = new THREE.Group();
    holo.position.set(x, 1.45, z);
    G.add(holo);
    const add = (geo, color, k = 1) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      holo.add(m);
      return m;
    };
    const star = add(new THREE.SphereGeometry(0.11, 14, 10), '#ffd28a', 1.6);
    const orbits = [0.34, 0.52, 0.72].map((r, i) => {
      const o = add(new THREE.TorusGeometry(r, 0.006, 4, 48), i === 2 ? '#ffc04a' : '#45d4ff', 0.9);
      o.rotation.x = Math.PI / 2 - 0.35;
      return o;
    });
    const worlds = [0.34, 0.52, 0.72].map((r, i) => {
      const w = add(new THREE.SphereGeometry(0.035 + i * 0.008, 8, 6), i === 2 ? '#9fe8ff' : '#ffb07a', 1.4);
      w.userData.r = r;
      w.userData.ph = i * 2.1;
      return w;
    });
    const halo = glow(W, G, '#ffb46a', 1.6, 0.7, x, 1.45, z + 0.1, false);
    glow(W, G, '#45d4ff', 2.2, 0.35, x, 1.0, z, false);
    W.addEmitter('sp_motes', { position: [x, 1.3, z], area: [1.2, 0.6, 1.2], rate: 2 }, p.on);
    W.addCircle(x, z, 1.1);
    let flare = 0, target = 0, last = -1;
    const living = {
      kind: 'holotable',
      object: holo,
      setState(v, instant = false) {
        target = v === 'flare' ? 1 : 0;
        if (instant) flare = target;
      },
      update(dt, t) {
        if (t === last) return;
        last = t;
        if (flare !== target) flare = target > flare ? Math.min(1, flare + dt / 3.2) : Math.max(0, flare - dt / 1.5);
        holo.rotation.y = t * 0.15;
        const swell = flare * flare;
        star.scale.setScalar(1 + swell * 6.2);
        star.material.color.set(flare > 0.2 ? '#fff6e8' : '#ffd28a').multiplyScalar(1.6 + flare * 1.2);
        orbits.forEach((o, i) => { o.material.opacity = 0.85 * (1 - Math.min(1, swell * (3 - i))); });
        worlds.forEach((w, i) => {
          const a = t * (0.6 - i * 0.15) + w.userData.ph;
          w.position.set(Math.cos(a) * w.userData.r, Math.sin(a) * w.userData.r * Math.sin(0.35), Math.sin(a) * w.userData.r * Math.cos(0.35));
          w.visible = star.scale.x * 0.11 < w.userData.r - 0.02;
        });
        halo.scale.setScalar(1.6 + swell * 2.4);
      },
    };
    living.setState(null, true);
    return living;
  },
};

const cmdchair = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const x = p.x, z = p.z;
    put(B, M.steelDark, new THREE.CylinderGeometry(0.95, 1.0, 0.16, 8), [x, 0.08, z], [0, Math.PI / 8, 0]);
    put(B, M.gold, new THREE.CylinderGeometry(0.96, 0.96, 0.03, 8, 1, true), [x, 0.17, z], [0, Math.PI / 8, 0]);
    put(B, M.steel, new THREE.CylinderGeometry(0.12, 0.2, 0.36, 8), [x, 0.34, z]);
    B.box(all(M.leather), x, z + 0.05, 0.66, 0.6, 0.52, 0.66, 0);
    B.box({ ...all(M.leather), back: M.steelDark }, x, z - 0.3, 0.7, 0.14, 0.52, 1.85, 0);
    B.box(all(M.gold), x, z - 0.3, 0.74, 0.16, 1.85, 1.9, 0);
    for (const dx of [-0.36, 0.36]) {
      B.box(all(M.steelDark), x + dx, z + 0.02, 0.1, 0.56, 0.6, 0.86, 0);
      B.box(all(M.lampCyan), x + dx, z + 0.18, 0.08, 0.14, 0.86, 0.88, 0);
    }
    W.addCircle(x, z, 0.62);
  },
};

const halberd = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const rot = p.rot ?? 0.45, c = Math.cos(rot), s = Math.sin(rot);
    const at = (u) => [p.x + c * u, 0.05, p.z - s * u];
    const haft = pipeGeometry(0.035, 2.2, 'x', 8);
    put(B, M.steelDark, haft, at(0), [0, rot, 0]);
    for (const u of [-0.5, -0.3, 0.2]) put(B, M.leather, pipeGeometry(0.042, 0.1, 'x', 8), at(u), [0, rot, 0]);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.22, 0.34, 0.08, 0.62);
    shape.quadraticCurveTo(0.42, 0.36, 0.3, -0.04);
    shape.lineTo(0, 0);
    const blade = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
    blade.rotateX(-Math.PI / 2);
    put(B, M.lampCyan, blade, at(1.05), [0, rot, 0]);
    put(B, M.lampCyan, new THREE.BoxGeometry(0.12, 0.05, 0.05), at(1.08), [0, rot, 0]);
    glow(W, G, '#7ff4ff', 1.0, 0.7, ...at(1.25));
  },
};

const iface = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const x = p.x, z = p.z;
    put(B, M.steelDark, new THREE.CylinderGeometry(0.9, 0.98, 0.18, 12), [x, 0.09, z]);
    put(B, M.lampCyan, new THREE.TorusGeometry(0.92, 0.025, 6, 40), [x, 0.19, z], [Math.PI / 2, 0, 0]);
    // the cradle: a reclined seat, a headrest under the halo
    B.box(all(M.steel), x, z + 0.1, 0.62, 0.9, 0.3, 0.5, 0);
    put(B, M.leather, new THREE.BoxGeometry(0.56, 0.12, 0.9), [x, 0.56, z + 0.12], [0.18, 0, 0]);
    put(B, M.leather, new THREE.BoxGeometry(0.56, 0.9, 0.14), [x, 1.0, z - 0.34], [-0.42, 0, 0]);
    B.box(all(M.steelDark), x, z - 0.6, 0.18, 0.18, 0.2, 1.7, 0);
    // cables to the core door
    for (const [dx, k] of [[-0.25, 0], [0.2, 1], [0.05, 2]]) {
      const pts = [new THREE.Vector3(x + dx, 0.22, z - 0.5), new THREE.Vector3(x + dx - 0.8 - k * 0.3, 0.06, z - 1.0), new THREE.Vector3(x - 2.2 - k * 0.2, 0.9 + k * 0.3, 2.06)];
      put(B, k === 1 ? M.lampCyan : M.steelDark, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.035, 5), [0, 0, 0]);
    }
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 36), M.lampCyan);
    halo.position.set(x, 1.85, z - 0.45);
    halo.rotation.x = Math.PI / 2 - 0.5;
    G.add(halo);
    glow(W, G, '#45d4ff', 1.8, 0.9, x, 1.8, z - 0.35);
    W.addCircle(x, z, 0.85);
    let last = -1;
    return {
      kind: 'interface',
      object: halo,
      update(dt, t) {
        if (t === last) return;
        last = t;
        halo.rotation.z = t * 0.7;
        halo.position.y = 1.85 + Math.sin(t * 1.3) * 0.05;
      },
    };
  },
};

const coredoor = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const x = p.x, z = p.z, cy = 1.45;
    const disc = (r, d, m, y = cy, seg = 32) => {
      const g = new THREE.CylinderGeometry(r, r, d, seg);
      g.rotateX(Math.PI / 2);
      put(B, m, g, [x, y, z + d / 2]);
    };
    disc(1.45, 0.08, M.steelDark);
    disc(1.28, 0.16, M.steel);
    disc(0.9, 0.22, M.steelDark);
    disc(0.32, 0.26, M.lampCyan);
    for (const [r, m] of [[1.36, M.gold], [0.96, M.lampCyan]]) put(B, m, new THREE.TorusGeometry(r, 0.025, 6, 48), [x, cy, z + 0.2]);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      put(B, M.steel, new THREE.BoxGeometry(0.1, 0.32, 0.1), [x + Math.cos(a) * 1.1, cy + Math.sin(a) * 1.1, z + 0.2], [0, 0, a + Math.PI / 2]);
    }
    glow(W, G, '#45d4ff', 1.6, 0.9, x, cy, z + 0.35);
  },
};

export default {
  'sp.flood': flood,
  'sp.strobe': strobe,
  'sp.sign': sign,
  'sp.pylon': pylon,
  'sp.hazard': hazardStrip,
  'sp.stripe': stripe,
  'sp.lift': lift,
  'sp.barricade': barricade,
  'sp.turret': turret,
  'sp.crates': crates,
  'sp.bunk': bunk,
  'sp.lockers': lockers,
  'sp.mess': mess,
  'sp.chest': chest,
  'sp.racks': racks,
  'sp.cot': cot,
  'sp.shelves': shelves,
  'sp.counter': counter,
  'sp.banner': banner,
  'sp.planter': planter,
  'sp.bed': bed,
  'sp.desk': desk,
  'sp.couch': couch,
  'sp.ring': ring,
  'sp.dummy': dummy,
  'sp.climb': climb,
  'sp.recorder': recorder,
  'sp.targets': targets,
  'sp.bench': bench,
  'sp.console': console_,
  'sp.holotable': holotable,
  'sp.cmdchair': cmdchair,
  'sp.halberd': halberd,
  'sp.interface': iface,
  'sp.coredoor': coredoor,
};
