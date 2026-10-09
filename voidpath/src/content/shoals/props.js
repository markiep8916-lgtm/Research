// shoals: prop builders (browser, TECH_PLAN 3.3). Registered types for the Shoals and the wreck of
// the Meridian, built into the World's batches (one draw per material) or into small groups for the
// few that move. Materials come from W.mats or are cached per World (freed with its scene).
//
// The Shoals
//   shoals.tube        { x, z }                        Driftmarket's docking tube where it meets the ice (west edge)
//   shoals.marker      { x, z, ribbon? }               a Ringborn route lantern on a pole in a snow cairn
//   shoals.icePillar   { x, z, s = 1 }                 a stalagmite of faceted ice, a leaning shard, chunks
//   shoals.crystal     { x, z, s = 1 }                 a cluster of cyan crystals with a halo
//   shoals.frozenCargo { x, z, rot, s = 1, rust? }     a Meridian cargo container sunk in an ice mound
//   shoals.hullShard   { x, z, rot, s = 1 }            Meridian hull plates jutting from the ice
//   shoals.icicles     { x0, x1, z, dark?, on?, y = 3 }  icicles along the top of a north wall face at z
//   shoals.abyss       { x, z, w, d, rim = 0.35, deep = -6, shafts = 2 }   a crevasse falling away under
//                      its rims: ice walls into deep-blue fog, a slow mist layer, the glow at the
//                      bottom and light shafts rising out of it
//   shoals.bridgeIce   { x0, x1, z, y = -0.35 }        icicles hanging under a bridge slab's visible edge
//   shoals.drift       { x, z, s = 2, rot }            a soft-edged snow drift decal (world-space, so
//                      the floor cells do not stamp a motif)
//   shoals.breach      { x, z }                        the torn hull mouth of the Meridian (east edge)
//   shoals.lockbox     { x, z, openWhen }              a Meridian lockbox frozen into the wall; opens with the flag
//   shoals.iceChest    chest: an ice-crusted cargo crate (rust: the Meridian's)          LivingProp setOpen
// Both maps
//   shoals.pool        { x, z, r = 2.4, color, k = 0.5, sx, sz, rot }   a soft pool of light on the floor:
//                      reads on every quality tier, whatever the real point-light pool holds
//   shoals.shaft       { x, z, y, h = 3.6, color, opacity = 0.12, tilt = 0 }   a slanted light shaft out of a
//                      painted breach (the world builds them for window cells only)
// The Meridian
//   shoals.lampPost    { x, z, h = 1.55, rot }         a tripod emergency lamp with a caged sodium head
//   shoals.iceSheet    { x, z, w, d, rot }             a soft-edged sheet of black ice over the deck
//   shoals.ribbons     { x, z, w = 2 }                 prayer ribbons on a rail (north wall face at z), swaying
//   shoals.emergencyLamp { x, z, on? }                 a caged sodium lamp on a north wall face, pulsing
//   shoals.debris      { x, z, rot, s = 1 }            a fallen beam, plates and chunks
//   shoals.merPod      { x, z, rot, open? }            an 80-year-old cryo pod (open: lid swung wide, empty)
//   shoals.fissureGlow { x, z, w, d }                  ring-light under the spine's fissure
//   shoals.captainDesk { x, z }                        Ines Varo's desk; its projector wakes with the power
//   shoals.bunk        { x, z, rot }                   a bunk, frost on the blanket
//   shoals.breakerBank { x, z }                        Kesi Danjuma's breaker cabinet
//   shoals.reactor     { x, z, id: 'reactor' }         the frozen reactor and the lattice coil      LivingProp setState(coil)
//   shoals.iceMound    { x, z, w, d }                  the black-ice mound the Maw sleeps in
//   shoals.chute       { x, z }                        the cargo chute hatch (the shortcut out)
//   shoals.footlocker  chest: the captain's footlocker                                LivingProp setOpen
//   shoals.powerLever  switch: an emergency bus lever                                 LivingProp setState

import * as THREE from 'three';
import { makeGlow, makeLightShaft } from '../../core/vfx.js';
import { Batch, wrappedCylinder } from '../../world/geometry.js';
import { textureSet } from '../../art/tiles.js';

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

/** Per-face uv rects that repeat a 1-unit texture once per world unit. */
const unitUV = (w, d, h) => ({ front: [0, 0, w, h], back: [0, 0, w, h], left: [0, 0, d, h], right: [0, 0, d, h], top: [0, 0, w, d] });

/** Bounding box size of a w x d footprint turned by rot. */
const spanOf = (w, d, rot) => [Math.abs(w * Math.cos(rot)) + Math.abs(d * Math.sin(rot)), Math.abs(w * Math.sin(rot)) + Math.abs(d * Math.cos(rot))];

/** Displace a geometry's vertices radially by a hash of their position (seams stay closed). */
function jitter(geo, amt, seed) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const h = Math.sin(Math.round(x * 50) * 12.9898 + Math.round(y * 50) * 78.233 + Math.round(z * 50) * 37.719 + seed) * 43758.5453;
    const k = 1 + ((h - Math.floor(h)) - 0.5) * amt;
    pos.setXYZ(i, x * k, y, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

const hemisphere = () => new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);

/** A camera-facing glow; linked glows follow the nearest virtual light (pulse, flicker). */
function glow(W, G, color, size, intensity, x, y, z, link = true) {
  const s = makeGlow(color, size, intensity);
  s.position.set(x, y, z);
  G.add(s);
  if (link) W.addGlow(s, x, z);
  return s;
}

/** Recolour a glow sprite (keeps the light-link base colour in step). */
function tintGlow(s, color, k = 1) {
  s.material.color.set(color).multiplyScalar(k);
  s.userData.baseColor.copy(s.material.color);
}

// Shared materials per World. Small machined and frozen parts carry the neutral sh_grain texture
// multiplied by their colour, so no lit surface reads flat; each is built on first use (its own
// texture objects, which World.dispose releases with the scene).
function grained(color, { roughness = 0.6, metalness = 0.35, emissive = null, k = 1, flat = false } = {}) {
  return () => {
    const set = textureSet('sh_grain', { layers: ['map', 'normal'] });
    const m = new THREE.MeshStandardMaterial({ color, map: set.map, normalMap: set.normalMap, roughness, metalness, flatShading: flat });
    if (emissive) { m.emissive.set(emissive); m.emissiveIntensity = k; }
    return m;
  };
}
const facet = (color, emissive, k) => grained(color, { roughness: 0.12, metalness: 0.1, emissive, k, flat: true });

// Shared soft masks (they survive World.dispose): 'pool' a smooth radial falloff for light pools,
// 'sheet' a ragged round edge for decals that must not read as square cells.
const MASKS = {};
function mask(kind) {
  if (MASKS[kind]) return MASKS[kind];
  const N = kind === 'sheet' ? 128 : 64;
  const r = rnd(kind === 'sheet' ? 7 : 3);
  const bumps = Array.from({ length: 5 }, () => [1 + Math.floor(r() * 5), r() * Math.PI * 2, 0.04 + r() * 0.07]);
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = ((x + 0.5) / N) * 2 - 1, dy = ((y + 0.5) / N) * 2 - 1;
    let d = Math.hypot(dx, dy), v;
    if (kind === 'sheet') {
      const a = Math.atan2(dy, dx);
      for (const [f, ph, amp] of bumps) d *= 1 + Math.sin(a * f + ph) * amp;
      v = 1 - THREE.MathUtils.smoothstep(d, 0.68, 1);
    } else v = d >= 1 ? 0 : (1 - d * d) ** 2;
    const i = (y * N + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = data[i + 3] = Math.round(v * 255);
  }
  const tex = new THREE.DataTexture(data, N, N);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  tex.userData.shared = true;
  return (MASKS[kind] = tex);
}

/** A flat mesh lying on the floor at (x, y, z), turned by rot. */
function floorMesh(G, mat, x, y, z, w, d, rot = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.rotation.set(-Math.PI / 2, 0, rot);
  mesh.scale.set(w, d, 1);
  mesh.position.set(x, y, z);
  mesh.renderOrder = 1;
  G.add(mesh);
  return mesh;
}

const LAZY = {
  crystal: facet('#8ae4f8', '#2fb8ff', 1.05),
  iceFacet: facet('#a2d6ee', '#2a8fd0', 0.5),
  crystalDim: facet('#4aa6d8', '#1a6fb0', 0.8),
  crystalDark: facet('#2a3a5a', '#4a2a8a', 0.9),
  icicle: facet('#c8f2ff', '#4fc8ff', 0.8),
  icicleDark: facet('#7a90aa', '#24405e', 0.5),
  iron: grained('#30343f', { roughness: 0.6, metalness: 0.55 }),
  ironDark: grained('#121419', { roughness: 0.75, metalness: 0.4 }),
  rust: grained('#643016', { roughness: 0.85, metalness: 0.25 }),
  brass: grained('#b8922e', { roughness: 0.4, metalness: 0.7 }),
  paint: grained('#285854', { roughness: 0.7, metalness: 0.3 }),
  hazard: grained('#c0961e', { roughness: 0.6, metalness: 0.3 }),
  cloth: grained('#40515f', { roughness: 0.95, metalness: 0 }),
  linen: grained('#a8b4c2', { roughness: 0.95, metalness: 0 }),
  sodium: grained('#5a1e04', { roughness: 0.4, metalness: 0.1, emissive: '#ff8a2a', k: 3.0 }),
  lantern: grained('#4a2608', { roughness: 0.5, metalness: 0.1, emissive: '#ffae4a', k: 2.8 }),
  ribbonRed: grained('#962826', { roughness: 0.9, metalness: 0, emissive: '#c24c38', k: 0.35 }),
};

function mats(W) {
  if (W.shMats) return W.shMats;
  const M = W.mats;
  W.shMats = {
    ice: M.tile('sh_ice_wall', { emissive: 2.4, roughness: 0.3, metalness: 0.05 }),
    iceSide: M.tile('sh_ice_wall_side', { emissive: 2.4, roughness: 0.35, metalness: 0.05, cast: false }),
    iceCap: M.tile('sh_ice_cap', { emissive: 1.8, roughness: 0.35, metalness: 0.05 }),
    snow: M.tile('sh_snow', { emissive: 1.6, roughness: 0.85, metalness: 0 }),
    cargo: M.tile('sh_cargo_side', { roughness: 0.6, metalness: 0.35 }),
    cargoTop: M.tile('sh_cargo_top', { roughness: 0.6, metalness: 0.35 }),
    hull: M.tile('sh_mer_wall', { emissive: 2.2, roughness: 0.6, metalness: 0.4 }),
    hullSide: M.tile('sh_mer_wall_side', { roughness: 0.65, metalness: 0.4 }),
    merCap: M.tile('sh_mer_cap', { roughness: 0.7, metalness: 0.35 }),
    blackIce: M.tile('sh_mer_blackice', { emissive: 1.6, roughness: 0.12, metalness: 0.3 }),
    hole: M.plain('#020306', { roughness: 1, metalness: 0 }),
  };
  for (const [k, make] of Object.entries(LAZY)) {
    Object.defineProperty(W.shMats, k, {
      configurable: true, enumerable: true,
      get() { const m = make(); Object.defineProperty(this, k, { value: m, enumerable: true }); return m; },
    });
  }
  return W.shMats;
}

// ---------------------------------------------------------------- the Shoals

const tube = {
  textures: ['sh_mer_wall_side', 'sh_ice_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const R = 1.55, y = 1.25;
    // the tube's body runs off the west edge; seen from inside, ribbed every unit
    const body = new THREE.CylinderGeometry(R, R, 4.2, 18, 1, true);
    body.scale(-1, 1, 1);
    put(B, M.hullSide, body, [p.x - 2.0, y, p.z], [0, 0, Math.PI / 2]);
    for (let k = 0; k < 4; k++) put(B, M.iron, new THREE.TorusGeometry(R - 0.02, 0.06, 6, 20), [p.x - 0.6 - k, y, p.z], [0, Math.PI / 2, 0]);
    // the collar where it was welded to the ice, frost packed into the seam
    put(B, M.iron, new THREE.TorusGeometry(R + 0.05, 0.16, 8, 22), [p.x + 0.12, y, p.z], [0, Math.PI / 2, 0]);
    put(B, M.iceCap, new THREE.TorusGeometry(R + 0.22, 0.14, 6, 22), [p.x + 0.2, y, p.z], [0, Math.PI / 2, 0], [1, 1, 0.6]);
    // guide lamps around the collar
    for (const a of [-0.55, 0.55, Math.PI - 0.55, Math.PI + 0.55]) {
      const lz = p.z + Math.cos(a) * (R + 0.05), ly = y + Math.sin(a) * (R + 0.05);
      if (ly < 0.1) continue;
      B.box(all(M.lantern), p.x + 0.3, lz, 0.08, 0.12, ly - 0.06, ly + 0.06, 0);
      glow(W, G, '#ffb35a', 0.5, 0.8, p.x + 0.36, ly, lz);
    }
  },
};

const marker = {
  textures: ['sh_snow'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const h = 1.5;
    put(B, M.snow, new THREE.ConeGeometry(0.28, 0.34, 7), [p.x, 0.17, p.z]);
    B.box(all(M.iron), p.x, p.z, 0.06, 0.06, 0, h, 0);
    B.box(all(M.iron), p.x + 0.13, p.z, 0.3, 0.04, h - 0.06, h - 0.02, 0);
    B.box({ ...all(M.lantern), top: M.ironDark }, p.x + 0.24, p.z, 0.16, 0.16, h - 0.38, h - 0.14, 0);
    B.box(all(M.ironDark), p.x + 0.24, p.z, 0.2, 0.2, h - 0.14, h - 0.1, 0);
    if (p.ribbon) {
      B.box(all(M.ribbonRed), p.x - 0.02, p.z + 0.04, 0.05, 0.012, h - 0.75, h - 0.08, 0.2);
      B.box(all(M.ribbonRed), p.x + 0.03, p.z + 0.05, 0.04, 0.012, h - 0.6, h - 0.1, -0.3);
    }
    glow(W, G, '#ffae4a', 0.95, 0.95, p.x + 0.24, h - 0.26, p.z + 0.06);
    W.addCircle(p.x, p.z, 0.16);
  },
};

const icePillar = {
  textures: ['sh_ice_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const s = p.s || 1, r = rnd(p.x * 3.7 + p.z * 1.3);
    // a stalagmite of faceted ice (flat-shaded, irregular, no texture bands): a jagged spire, a
    // leaning shard, broken chunks at its foot and a cold glow trapped inside
    const h = 2.3 * s;
    put(B, M.iceFacet, jitter(new THREE.CylinderGeometry(0.1 * s, 0.5 * s, h, 5, 3), 0.45, p.x), [p.x, h / 2 - 0.05, p.z], [0.05, r() * 6, -0.06]);
    put(B, M.iceFacet, jitter(new THREE.CylinderGeometry(0.03, 0.22 * s, 1.4 * s, 4, 2), 0.35, p.z), [p.x + 0.42 * s, 0.6 * s, p.z + 0.16 * s], [0.2, r() * 6, -0.45]);
    for (let k = 0; k < 3; k++) {
      const a = r() * Math.PI * 2, d = (0.35 + r() * 0.25) * s, c = (0.12 + r() * 0.12) * s;
      put(B, k ? M.iceFacet : M.crystalDim, new THREE.IcosahedronGeometry(1, 0), [p.x + Math.cos(a) * d, c * 0.6, p.z + Math.sin(a) * d * 0.8], [r() * 3, r() * 3, r() * 3], [c, c * (1.2 + r()), c]);
    }
    put(B, M.iceCap, hemisphere(), [p.x, 0, p.z], null, [0.72 * s, 0.14, 0.6 * s]);
    glow(W, G, '#5fd8ff', 1.3 * s, 0.32, p.x, h * 0.45, p.z + 0.2, false);
    W.addCircle(p.x, p.z, 0.46 * s);
  },
};

/** A hexagonal crystal: a prism with a pointed tip, base at the origin (two geometries). */
function crystalParts(rad, len) {
  const body = new THREE.CylinderGeometry(rad, rad * 1.12, len * 0.74, 6);
  body.translate(0, len * 0.37, 0);
  const tip = new THREE.ConeGeometry(rad, len * 0.26, 6);
  tip.translate(0, len * 0.87, 0);
  return [body, tip];
}

/** A cluster of crystals at (x, z) into batch B. */
function crystalCluster(B, M, x, z, s, seed, { dark = false, n = 5, y = -0.05 } = {}) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    const big = i === 0;
    const len = (0.55 + r() * 0.8) * s * (big ? 1.5 : 1), rad = (0.08 + r() * 0.06) * s * (big ? 1.45 : 1);
    const a = (i / n) * Math.PI * 2 + r() * 0.8, tilt = big ? 0.06 : 0.38 + r() * 0.4;
    const ox = big ? 0 : Math.cos(a) * 0.16 * s, oz = big ? 0 : Math.sin(a) * 0.12 * s;
    const mat = dark ? (i % 2 ? M.crystalDark : M.icicleDark) : i % 2 ? M.crystalDim : M.crystal;
    for (const g of crystalParts(rad, len)) put(B, mat, g, [x + ox, y, z + oz], [Math.sin(a) * tilt, r() * 2, -Math.cos(a) * tilt]);
  }
}

const crystal = {
  textures: ['sh_ice_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const s = p.s || 1;
    crystalCluster(B, M, p.x, p.z, s, p.x * 7.1 + p.z * 3.3, { n: s > 1.2 ? 7 : 5 });
    put(B, M.iceCap, hemisphere(), [p.x, 0, p.z], null, [0.5 * s, 0.1, 0.42 * s]);
    glow(W, G, '#5fe0ff', 1.1 * s, 0.55, p.x, 0.6 * s, p.z + 0.1);
    W.addCircle(p.x, p.z, 0.4 * s);
  },
};

const frozenCargo = {
  textures: ['sh_cargo_side', 'sh_cargo_top', 'sh_mer_wall_side', 'sh_mer_cap', 'sh_ice_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const s = p.s || 1, rot = p.rot || 0;
    const w = 1.7 * s, d = 1.0 * s, h = 1.05 * s, sink = 0.22 * s;
    const side = p.rust ? M.hullSide : M.cargo, top = p.rust ? M.merCap : M.cargoTop;
    B.box({ ...all(side), top }, p.x, p.z, w, d, -sink, h - sink, rot, unitUV(w, d, h));
    // door bars on the front and back faces
    for (const k of [-0.3, 0.3]) {
      const ox = Math.cos(rot) * k * w, oz = -Math.sin(rot) * k * w;
      B.box(all(M.iron), p.x + ox, p.z + oz, 0.05, d + 0.04, 0, h - sink - 0.06, rot);
    }
    // the ice it is sunk in (black ice in the wreck)
    put(B, p.rust ? M.blackIce : M.ice, jitter(hemisphere(), 0.25, p.x + p.z), [p.x, 0, p.z], [0, rot, 0], [w * 0.68, 0.36 * s, d * 0.82]);
    const [sx, sz] = spanOf(w, d, rot);
    W.addBox(p.x, p.z, sx, sz);
  },
};

const hullShard = {
  textures: ['sh_mer_wall', 'sh_mer_wall_side'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const s = p.s || 1, rot = p.rot || 0, r = rnd(p.x + p.z * 5);
    const plate = (w, h, x, z, ry, rz, mat = M.hull) => {
      const g = new THREE.BoxGeometry(w, h, 0.14);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * (h / 3));
      put(B, mat, g, [x, h / 2 - 0.15, z], [0, ry, rz]);
    };
    plate(2.0 * s, 1.8 * s, p.x, p.z, rot, -0.32);
    plate(1.2 * s, 1.1 * s, p.x + Math.cos(rot) * 0.9 * s, p.z - Math.sin(rot) * 0.9 * s + 0.25, rot + 0.5, 0.26, M.hullSide);
    // a ruptured rib and frost at the foot
    put(B, M.iron, new THREE.BoxGeometry(0.16, 1.4 * s, 0.16), [p.x - Math.cos(rot) * 0.5 * s, 0.55 * s, p.z + Math.sin(rot) * 0.5 * s + 0.1], [0, rot, -0.6 - r() * 0.3]);
    put(B, M.ice, jitter(hemisphere(), 0.3, p.z), [p.x, 0, p.z], [0, rot, 0], [1.2 * s, 0.24, 0.6 * s]);
    const [sx, sz] = spanOf(1.9 * s, 0.6, rot);
    W.addBox(p.x, p.z, sx, sz);
  },
};

const icicles = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const r = rnd(p.x0 * 13 + p.z * 7);
    const mat = p.dark ? M.icicleDark : M.icicle, top = p.y ?? W.map.wallH ?? 3;
    for (let x = p.x0 + 0.1 + r() * 0.1; x < p.x1 + 0.9; x += 0.16 + r() * 0.24) {
      const len = 0.14 + r() * r() * (p.dark ? 0.6 : 0.95), rad = 0.03 + len * 0.06;
      put(B, mat, new THREE.ConeGeometry(rad, len, 5), [x, top - len / 2 - 0.02, p.z + 0.05 + r() * 0.06], [Math.PI, r() * 3, 0]);
    }
  },
};

const abyss = {
  textures: ['sh_abyss', 'sh_ice_wall_side'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const top = -(p.rim ?? 0.35), deep = p.deep ?? -6;
    const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, z0 = p.z - p.d / 2, z1 = p.z + p.d / 2;
    // the crevasse walls fall away below the rims: the far wall faces the camera, the sides face in
    // (the far wall starts at the floor where a wall row stands above the crevasse instead of a rim)
    const h = top - deep, hf = (p.farTop ?? top) - deep;
    B.faceZ(M.iceSide, x0, x1, deep, p.farTop ?? top, z0, 1, [0, 1 - hf / 3, p.w, 1]);
    B.faceX(M.iceSide, z0, z1, deep, top, x0, 1, [0, 1 - h / 3, p.d, 1]);
    B.faceX(M.iceSide, z0, z1, deep, top, x1, -1, [0, 1 - h / 3, p.d, 1]);
    // the glow at the bottom, and a slower mist layer drifting halfway down
    const k = p.k ?? 1.3;
    const floorSet = textureSet('sh_abyss', { repeat: [p.w / 3, p.d / 3], layers: ['map'] });
    floorMesh(G, new THREE.MeshBasicMaterial({ map: floorSet.map, color: new THREE.Color(k, k, k * 1.1) }), p.x, deep, p.z, p.w, p.d);
    const mistSet = textureSet('sh_abyss', { repeat: [p.w / 5, p.d / 5], layers: ['map'] });
    const mist = floorMesh(G, new THREE.MeshBasicMaterial({
      map: mistSet.map, color: new THREE.Color(0.22, 0.42, 0.7), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    }), p.x, (top + deep) * 0.45, p.z, p.w, p.d);
    mist.renderOrder = 2;
    const ph = p.x * 0.013;
    W.addUpdater((dt, t) => {
      floorSet.map.offset.set(ph + t * 0.004, t * 0.007);
      mistSet.map.offset.set(ph - t * 0.011, -t * 0.006);
    });
    for (let z = z0 + 2; z < z1; z += 4) glow(W, G, '#2f7fff', 3.6, 0.38, p.x, deep + 0.8, z);
    // light rising out of the deep
    const n = p.shafts ?? 2;
    for (let i = 0; i < n; i++) {
      const s = makeLightShaft({ width: Math.min(1.6, p.w * 0.3), height: -deep + 1.4, color: '#7fc8ff', opacity: 0.11, spread: 1.6, floorY: deep - 4 });
      s.position.set(p.x + (i % 2 ? 0.8 : -0.9), deep + 0.2, z0 + ((i + 0.6) / n) * p.d);
      s.rotation.set(Math.PI + (i % 2 ? 0.12 : -0.1), 0, i % 2 ? -0.08 : 0.1);
      G.add(s);
    }
  },
};

const bridgeIce = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const r = rnd(p.x0 * 7 + p.z * 3);
    const y = p.y ?? -0.35;
    for (let x = p.x0 + 0.08; x < p.x1 - 0.05; x += 0.12 + r() * 0.2) {
      const len = 0.18 + r() * r() * 1.1, rad = 0.035 + len * 0.05;
      put(B, M.icicle, new THREE.ConeGeometry(rad, len, 5), [x, y - len / 2 + 0.02, p.z - 0.04 - r() * 0.05], [Math.PI, r() * 3, 0]);
    }
  },
};

const drift = {
  textures: ['sh_drift'],
  build(W, p) {
    const G = W.groupFor(p.on);
    const set = textureSet('sh_drift', { layers: ['map', 'normal'] });
    const mat = new THREE.MeshStandardMaterial({
      map: set.map, normalMap: set.normalMap, transparent: true, depthWrite: false, roughness: 0.85, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const s = p.s || 2;
    const mesh = floorMesh(G, mat, p.x, 0.006, p.z, s * (p.sx || 1), s * (p.sz || 0.8), p.rot || 0);
    mesh.receiveShadow = true;
  },
};

const breach = {
  textures: ['sh_mer_wall', 'sh_mer_wall_side', 'sh_ice_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const r = rnd(p.x * 3 + p.z);
    const plate = (x, z, w, h, ry, rz, mat = M.hull) => {
      const g = new THREE.BoxGeometry(w, h, 0.12);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * (h / 3));
      put(B, mat, g, [x, h / 2 - 0.1, z], [0, ry, rz]);
    };
    // tall torn plates along the north side, low ones on the camera side
    for (let k = 0; k < 4; k++) plate(p.x - 1.6 + k * 0.85, p.z - 1.95 + r() * 0.15, 0.9, 1.6 + r() * 1.2, 0.2 - r() * 0.4, (r() - 0.5) * 0.4);
    for (let k = 0; k < 3; k++) plate(p.x - 1.2 + k * 0.9, p.z + 2.0 - r() * 0.1, 0.8, 0.5 + r() * 0.35, -0.2 + r() * 0.4, (r() - 0.5) * 0.5, M.hullSide);
    // the dark mouth of the wreck at the edge, a sodium lamp inside
    B.faceX(M.hole, p.z - 2, p.z + 2, 0, 3, p.x + 1.38, -1);
    B.box(all(M.sodium), p.x + 1.3, p.z - 1.2, 0.06, 0.2, 2.0, 2.18, 0);
    glow(W, G, '#ff8a2a', 1.4, 1.0, p.x + 1.2, 2.1, p.z - 1.2);
    put(B, M.iceCap, jitter(hemisphere(), 0.3, 5), [p.x - 1.5, 0, p.z + 1.8], null, [1.0, 0.3, 0.5]);
  },
};

/** Hinged-lid chest body (crate, footlocker, lockbox): open/close animation and the LED colour. */
function chestLiving(W, p, hinge, maxAngle, led) {
  let lid = 0, last = -1;
  const living = {
    kind: 'chest',
    opened: false,
    setOpen(open, instant = false) {
      living.opened = !!open;
      if (led) tintGlow(led, open ? '#4dff9c' : '#ff4050', 0.7);
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
  return living;
}

const iceChest = {
  textures: ['sh_cargo_side', 'sh_cargo_top', 'sh_mer_wall_side', 'sh_mer_cap', 'sh_ice_cap'],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on);
    const side = p.rust ? M.hullSide : M.cargo, top = p.rust ? M.merCap : M.cargoTop;
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.rot || 0;
    const B = new Batch();
    B.box({ ...all(side), top: M.ironDark }, 0, 0, 0.96, 0.66, 0, 0.56, 0, unitUV(0.96, 0.66, 0.56));
    for (const k of [-0.36, 0.36]) B.box(all(M.iron), k, 0, 0.06, 0.7, 0, 0.5, 0);
    put(B, M.iceCap, jitter(hemisphere(), 0.3, p.x), [0.05, 0, 0.02], null, [0.66, 0.2, 0.48]);
    B.box(all(M.sodium), 0.3, 0.335, 0.08, 0.01, 0.42, 0.47, 0);
    B.build(g);
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.56, -0.34);
    const LB = new Batch();
    LB.box({ ...all(side), top }, 0, 0.34, 1.0, 0.7, 0, 0.16, 0, unitUV(1, 0.7, 0.16));
    put(LB, M.iceCap, hemisphere(), [-0.12, 0.16, 0.3], null, [0.34, 0.06, 0.26]);
    const r = rnd(p.x + p.z);
    for (let x = -0.44; x < 0.46; x += 0.12 + r() * 0.1) {
      const len = 0.06 + r() * 0.12;
      put(LB, M.icicle, new THREE.ConeGeometry(0.02, len, 4), [x, -len / 2, 0.7], [Math.PI, 0, 0]);
    }
    LB.build(hinge);
    g.add(hinge);
    const led = makeGlow('#ff4050', 0.45, 0.7);
    led.position.set(0.3, 0.45, 0.4);
    g.add(led);
    G.add(g);
    W.addBox(p.x, p.z, 1.04, 0.74);
    const living = chestLiving(W, p, hinge, 1.9, led);
    living.object = g;
    living.setOpen(!!p.open, true);
    return living;
  },
};

const lockbox = {
  textures: ['sh_lockbox', 'sh_ice_wall', 'sh_ice_cap'],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on);
    const B = W.batchFor(p.on);
    // the ice it is frozen into, bulging from the wall
    put(B, M.ice, jitter(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0.3, 9), [p.x, 0, p.z - 0.4], [-Math.PI / 2 + 0.2, 0, 0], [0.8, 0.75, 1.1]);
    const face = W.mats.tile('sh_lockbox', { emissive: 2.4, roughness: 0.5, metalness: 0.5 });
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    const LB = new Batch();
    LB.box({ front: face, left: M.iron, right: M.iron, top: M.merCap }, 0, 0.12, 0.62, 0.42, 0.25, 0.68, 0);
    LB.build(g);
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.68, -0.09);
    const HB = new Batch();
    HB.box({ ...all(M.iron), top: M.merCap }, 0, 0.21, 0.64, 0.44, 0, 0.08, 0);
    HB.build(hinge);
    g.add(hinge);
    const led = makeGlow('#ff4050', 0.4, 0.7);
    led.position.set(0.2, 0.6, 0.38);
    g.add(led);
    const halo = glow(W, G, '#3fd6d2', 0.9, 0.5, p.x, 0.45, p.z + 0.4, false);
    G.add(g);
    W.addBox(p.x, p.z - 0.1, 1.2, 0.7);
    const living = chestLiving(W, p, hinge, 1.5, led);
    const setOpen = living.setOpen;
    living.setOpen = (open, instant) => {
      setOpen(open, instant);
      halo.visible = !open;
    };
    const update = living.update;
    living.update = (dt) => {
      if (p.openWhen && W.test(p.openWhen) !== living.opened) living.setOpen(!living.opened);
      update(dt);
    };
    living.setOpen(!!p.openWhen && W.test(p.openWhen), true);
    return living;
  },
};

// ---------------------------------------------------------------- the Meridian

const pool = {
  build(W, p) {
    const G = W.groupFor(p.on);
    const r = p.r || 2.4;
    const mat = new THREE.MeshBasicMaterial({
      map: mask('pool'), color: new THREE.Color(p.color || '#ff8a2a').multiplyScalar(p.k ?? 0.5), transparent: true,
      depthWrite: false, fog: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    });
    floorMesh(G, mat, p.x, p.y ?? 0.02, p.z, r * 2 * (p.sx || 1), r * 2 * (p.sz || 1), p.rot || 0);
  },
};

const shaft = {
  build(W, p) {
    const s = makeLightShaft({
      width: 1.45, height: p.h ?? 3.6, color: p.color || '#a8d8ff', opacity: p.opacity ?? 0.12, spread: 1.55, dust: 1.2, seed: p.x * 3.7,
    });
    // the same slant as the world's window shafts (along the key light)
    s.position.set(p.x, p.y ?? 2.2, p.z);
    s.rotation.set(-0.72 + (p.tilt || 0), 0, 0.42 - (p.tilt || 0));
    W.groupFor(p.on).add(s);
  },
};

const lampPost = {
  textures: ['sh_ice_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const h = p.h ?? 1.55, rot = p.rot || 0;
    // a tripod stand frozen to the deck, a pole, a caged sodium head under a hood
    for (let k = 0; k < 3; k++) {
      const a = rot + k * (Math.PI * 2 / 3);
      put(B, M.iron, new THREE.BoxGeometry(0.045, 0.66, 0.045), [p.x + Math.cos(a) * 0.17, 0.3, p.z + Math.sin(a) * 0.17], [0, -a, 0.55]);
    }
    put(B, M.iron, new THREE.CylinderGeometry(0.03, 0.04, h - 0.3, 6), [p.x, 0.3 + (h - 0.3) / 2, p.z]);
    put(B, M.iceCap, jitter(hemisphere(), 0.3, p.x + p.z), [p.x, 0, p.z], null, [0.34, 0.1, 0.3]);
    B.box(all(M.sodium), p.x, p.z, 0.17, 0.17, h - 0.08, h + 0.1, rot);
    for (const d of [-0.07, 0.07]) {
      B.box(all(M.ironDark), p.x + d, p.z + 0.09, 0.02, 0.02, h - 0.1, h + 0.12, 0);
      B.box(all(M.ironDark), p.x + d, p.z - 0.09, 0.02, 0.02, h - 0.1, h + 0.12, 0);
    }
    put(B, M.iron, new THREE.ConeGeometry(0.17, 0.12, 8), [p.x, h + 0.17, p.z]);
    glow(W, G, '#ff8a2a', 1.1, 0.9, p.x, h, p.z + 0.1);
    W.addCircle(p.x, p.z, 0.24);
  },
};

const iceSheet = {
  textures: ['sh_mer_blackice'],
  build(W, p) {
    const G = W.groupFor(p.on);
    const set = textureSet('sh_mer_blackice', { repeat: [p.w, p.d], layers: ['map', 'normal'] });
    const mat = new THREE.MeshStandardMaterial({
      // a broad sheen, not mirror-sharp: sharp highlights of the point lights bloom into bright squares
      map: set.map, normalMap: set.normalMap, alphaMap: mask('sheet'), transparent: true, depthWrite: false,
      roughness: 0.6, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    floorMesh(G, mat, p.x, 0.008, p.z, p.w, p.d, p.rot || 0).receiveShadow = true;
  },
};

const ribbons = {
  textures: ['sh_ribbons'],
  build(W, p) {
    const G = W.groupFor(p.on);
    const w = p.w || 2;
    const mat = W.mats.tile('sh_ribbons', { emissive: 1.4, roughness: 0.9, metalness: 0, cast: false, side: THREE.DoubleSide, alphaTest: 0.5 });
    const layers = [];
    for (let k = 0; k < 2; k++) {
      const pivot = new THREE.Group();
      pivot.position.set(p.x, 2.3, p.z + 0.04 + k * 0.05);
      const g = new THREE.PlaneGeometry(w, 2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (w / 2) + k * 0.37);
      g.translate(0, -1, 0);
      pivot.add(new THREE.Mesh(g, mat));
      G.add(pivot);
      layers.push(pivot);
    }
    const phase = p.x * 0.7;
    W.addUpdater((dt, t) => {
      layers[0].rotation.x = 0.05 + Math.sin(t * 0.8 + phase) * 0.04;
      layers[1].rotation.x = 0.1 + Math.sin(t * 0.65 + phase + 1.7) * 0.06;
    });
  },
};

const emergencyLamp = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const y = p.y ?? 2.35;
    B.box(all(M.iron), p.x, p.z + 0.06, 0.36, 0.12, y - 0.16, y + 0.16, 0);
    B.box(all(M.sodium), p.x, p.z + 0.16, 0.24, 0.1, y - 0.09, y + 0.09, 0);
    for (const dx of [-0.09, 0, 0.09]) B.box(all(M.ironDark), p.x + dx, p.z + 0.22, 0.025, 0.02, y - 0.11, y + 0.11, 0);
    B.box(all(M.ironDark), p.x, p.z + 0.22, 0.28, 0.02, y - 0.012, y + 0.012, 0);
    glow(W, G, '#ff8a2a', 1.2, 1.0, p.x, y, p.z + 0.3);
  },
};

const debris = {
  textures: ['sh_mer_wall_side', 'sh_ice_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const s = p.s || 1, rot = p.rot || 0, r = rnd(p.x * 5 + p.z);
    const at = (lx, lz) => [p.x + lx * Math.cos(rot) + lz * Math.sin(rot), p.z - lx * Math.sin(rot) + lz * Math.cos(rot)];
    // a fallen I-beam, one end on the deck
    const [bx, bz] = at(0, 0);
    put(B, M.iron, new THREE.BoxGeometry(2.3 * s, 0.24, 0.3), [bx, 0.38 * s, bz], [0, rot, 0.28]);
    put(B, M.ironDark, new THREE.BoxGeometry(2.3 * s, 0.06, 0.12), [bx, 0.38 * s, bz + 0.0], [0, rot, 0.28]);
    // plates and chunks around it
    for (let k = 0; k < 3; k++) {
      const [x, z] = at((r() - 0.5) * 1.6 * s, (r() - 0.3) * 0.9 * s);
      const g = new THREE.BoxGeometry((0.5 + r() * 0.6) * s, 0.07, (0.4 + r() * 0.4) * s);
      put(B, M.hullSide, g, [x, 0.1 + r() * 0.2, z], [r() * 0.5 - 0.25, rot + r() * 2, r() * 0.6 - 0.3]);
    }
    for (let k = 0; k < 3; k++) {
      const [x, z] = at((r() - 0.5) * 1.8 * s, (r() - 0.5) * 0.9 * s);
      put(B, k ? M.rust : M.iron, new THREE.BoxGeometry(0.2 + r() * 0.2, 0.14 + r() * 0.12, 0.2 + r() * 0.2), [x, 0.08, z], [0, r() * 3, 0]);
    }
    put(B, M.blackIce, jitter(hemisphere(), 0.3, p.x), [bx, 0, bz], [0, rot, 0], [1.0 * s, 0.16, 0.5 * s]);
    W.addCircle(bx, bz, 0.75 * s);
  },
};

const merPod = {
  textures: ['sh_mer_pod', 'sh_mer_pod_open', 'sh_mer_wall_side', 'sh_mer_cap', 'sh_ice_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const rot = p.rot || 0;
    const front = W.mats.tile(p.open ? 'sh_mer_pod_open' : 'sh_mer_pod', { emissive: 2.4, roughness: 0.5, metalness: 0.35 });
    B.box({ front, left: M.hullSide, right: M.hullSide, top: M.merCap }, p.x, p.z, 0.9, 0.62, 0, 2.0, rot, { left: [0, 0, 0.62, 2], right: [0, 0, 0.62, 2] });
    const fx = Math.sin(rot), fz = Math.cos(rot);
    if (p.open) {
      // the lid swung wide on its hinge, frost on the glass
      const hx = p.x - Math.cos(rot) * 0.45 + fx * 0.31, hz = p.z + Math.sin(rot) * 0.45 + fz * 0.31;
      const lid = new THREE.BoxGeometry(0.82, 1.8, 0.06);
      lid.translate(-0.41, 0, 0);
      put(B, M.hullSide, lid, [hx, 1.0, hz], [0, rot + 1.25, 0]);
    } else {
      put(B, M.iceCap, hemisphere(), [p.x + fx * 0.3, 0, p.z + fz * 0.3], [0, rot, 0], [0.5, 0.3, 0.22]);
    }
    const [sx, sz] = spanOf(0.94, 0.66, rot);
    W.addBox(p.x, p.z, sx, sz);
  },
};

const fissureGlow = {
  textures: ['sh_abyss', 'sh_ice_wall_side'],
  build(W, p) {
    abyss.build(W, { ...p, rim: p.rim ?? 0.8, deep: p.deep ?? -3.4, k: 1.2, shafts: 1 });
  },
};

const captainDesk = {
  textures: ['sh_mer_panel', 'sh_mer_wall_side', 'sh_mer_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const panel = W.mats.tile('sh_mer_panel', { emissive: 2.2, roughness: 0.6, metalness: 0.35 });
    B.box({ front: panel, left: M.hullSide, right: M.hullSide, top: M.merCap }, p.x, p.z, 1.5, 0.7, 0, 0.82, 0, { front: [0, 0, 1, 1], top: [0, 0, 1.5, 0.7] });
    // the log projector, a photo frame, a mug frozen to the desk
    put(B, M.iron, new THREE.CylinderGeometry(0.17, 0.2, 0.08, 12), [p.x, 0.86, p.z + 0.05]);
    put(B, M.brass, new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12), [p.x, 0.91, p.z + 0.05]);
    B.box(all(M.brass), p.x - 0.5, p.z - 0.12, 0.18, 0.03, 0.82, 1.04, 0.2);
    B.box(all(M.linen), p.x - 0.5, p.z - 0.105, 0.13, 0.01, 0.85, 1.01, 0.2);
    put(B, M.paint, new THREE.CylinderGeometry(0.05, 0.045, 0.1, 8), [p.x + 0.52, 0.87, p.z + 0.12]);
    // a small lens glow: a large one blooms over the hologram standing in front of the desk
    const holo = glow(W, G, '#7ff4ff', 0.45, 0.6, p.x, 1.0, p.z + 0.1, false);
    W.addBox(p.x, p.z, 1.54, 0.74);
    return {
      kind: 'captainDesk',
      update() { holo.visible = W.test('story:meridian_power'); },
    };
  },
};

const bunk = {
  textures: ['sh_mer_wall_side', 'sh_ice_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const rot = p.rot || 0;
    const at = (lx, lz) => [p.x + lx * Math.cos(rot) + lz * Math.sin(rot), p.z - lx * Math.sin(rot) + lz * Math.cos(rot)];
    B.box(all(M.hullSide), p.x, p.z, 0.96, 2.0, 0, 0.42, rot, unitUV(0.96, 2, 0.42));
    B.box(all(M.cloth), p.x, p.z, 0.88, 1.9, 0.42, 0.56, rot);
    const [px, pz] = at(0, -0.72);
    B.box(all(M.linen), px, pz, 0.6, 0.32, 0.56, 0.66, rot);
    const [hx, hz] = at(0, -0.98);
    B.box(all(M.iron), hx, hz, 0.96, 0.06, 0, 0.95, rot);
    const [fx, fz] = at(0.1, 0.35);
    put(B, M.iceCap, hemisphere(), [fx, 0.56, fz], [0, rot, 0], [0.4, 0.06, 0.6]);
    const [sx, sz] = spanOf(1.0, 2.04, rot);
    W.addBox(p.x, p.z, sx, sz);
  },
};

const breakerBank = {
  textures: ['sh_breakers', 'sh_mer_wall_side', 'sh_mer_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const face = W.mats.tile('sh_breakers', { emissive: 2.6, roughness: 0.55, metalness: 0.45 });
    B.box({ front: face, left: M.hullSide, right: M.hullSide, top: M.merCap }, p.x, p.z, 1.3, 0.5, 0, 1.95, 0, { left: [0, 0, 0.5, 1.95], right: [0, 0, 0.5, 1.95] });
    for (const dx of [-0.4, 0.4]) put(B, M.iron, new THREE.CylinderGeometry(0.06, 0.06, 1.05, 8), [p.x + dx, 2.47, p.z - 0.12]);
    W.addBox(p.x, p.z, 1.34, 0.54);
  },
};

const reactor = {
  textures: ['sh_reactor_ice', 'sh_coil', 'sh_ice_cap'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const core = W.mats.tile('sh_reactor_ice', { emissive: 3.8, roughness: 0.25, metalness: 0.2 });
    // base ring, the frozen column, the cap and its struts
    put(B, M.iron, new THREE.CylinderGeometry(1.55, 1.7, 0.35, 22), [p.x, 0.175, p.z]);
    B.geometry(core, wrappedCylinder(1.2, 3.0, { arc: 2, texHeight: 2, y0: 0.35 }), _m.makeTranslation(p.x, 0, p.z));
    for (const y of [1.25, 2.35]) put(B, M.iron, new THREE.CylinderGeometry(1.25, 1.25, 0.14, 22, 1, true), [p.x, y, p.z]);
    // a ring light still burning around the column, and sodium running lights on the lid's edge
    put(B, M.lantern, new THREE.TorusGeometry(1.24, 0.05, 6, 32), [p.x, 1.8, p.z], [Math.PI / 2, 0, 0]);
    put(B, M.iron, new THREE.CylinderGeometry(1.35, 1.25, 0.4, 22), [p.x, 3.55, p.z]);
    put(B, M.sodium, new THREE.TorusGeometry(1.36, 0.045, 6, 32), [p.x, 3.72, p.z], [Math.PI / 2, 0, 0]);
    put(B, M.iron, new THREE.CylinderGeometry(0.7, 1.3, 0.3, 22), [p.x, 3.9, p.z]);
    for (const a of [0.7, 2.44, -0.7, -2.44]) {
      put(B, M.iron, new THREE.BoxGeometry(0.14, 3.2, 0.14), [p.x + Math.sin(a) * 1.3, 1.95, p.z + Math.cos(a) * 1.3]);
    }
    // ice heaped around its foot, crystals grown out of it
    put(B, M.iceCap, jitter(hemisphere(), 0.3, 3), [p.x, 0.2, p.z + 0.2], null, [1.9, 0.7, 1.4]);
    crystalCluster(B, M, p.x - 1.4, p.z + 0.7, 1.1, 41, { n: 4 });
    crystalCluster(B, M, p.x + 1.5, p.z + 0.5, 0.9, 43, { n: 4 });
    glow(W, G, '#ff6a2a', 3.4, 0.5, p.x, 1.9, p.z + 1.0);
    // the lattice coil in its cradle at the reactor's foot
    const coil = new THREE.Group();
    coil.position.set(p.x, 1.05, p.z + 1.42);
    B.box(all(M.iron), p.x, p.z + 1.42, 0.9, 0.3, 0, 0.45, 0);
    B.box(all(M.ironDark), p.x, p.z + 1.42, 0.7, 0.2, 0.45, 0.52, 0);
    const ringMat = new THREE.MeshStandardMaterial({ color: '#2a6a7a', roughness: 0.3, metalness: 0.6, emissive: '#5ff0ff', emissiveIntensity: 1.6 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 26), ringMat);
    coil.add(ring);
    const set = textureSet('sh_coil', { layers: ['map'] });
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72), new THREE.MeshBasicMaterial({
      map: set.map, color: new THREE.Color(1.8, 1.8, 1.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    coil.add(disc);
    const halo = makeGlow('#7ff4ff', 1.5, 0.8);
    coil.add(halo);
    G.add(coil);
    W.addEmitter('ember', { position: [p.x, 3.9, p.z], area: [1.2, 0.3, 1.2], rate: 3 }, p.on);
    W.addCircle(p.x, p.z, 1.65);
    let shown = 1;
    const living = {
      kind: 'reactor',
      on: true,
      object: coil,
      setState(on, instant = false) {
        living.on = !!on;
        if (instant) shown = on ? 1 : 0;
      },
      update(dt, t) {
        const target = living.on ? 1 : 0;
        if (shown !== target) shown = target > shown ? Math.min(1, shown + dt * 1.5) : Math.max(0, shown - dt * 1.5);
        coil.visible = shown > 0.01;
        coil.scale.setScalar(0.3 + shown * 0.7);
        coil.position.y = 1.05 + Math.sin(t * 1.4) * 0.04 + (1 - shown) * 0.6;
        ring.rotation.y = t * 0.6;
        disc.rotation.z = -t * 0.4;
        set.map.offset.x = (Math.floor(t * 6) % 4) / 4;
      },
    };
    living.setState(!W.test(p.takenWhen || 'defeated:shoals_boss_maw'), true);
    return living;
  },
};

const iceMound = {
  textures: ['sh_mer_blackice'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on);
    const w = p.w || 8, d = p.d || 3;
    put(B, M.blackIce, jitter(new THREE.SphereGeometry(1, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0.18, 11), [p.x, -0.05, p.z], null, [w / 2, 0.3, d / 2]);
    const r = rnd(p.x + 3);
    // crystals ring the back and the flanks only: nothing stands between the camera and the sleeper
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * 0.85 + (k / 8) * Math.PI * 1.3 + r() * 0.2;
      const x = p.x + Math.cos(a) * w * 0.42, z = p.z + Math.sin(a) * d * 0.4;
      crystalCluster(B, M, x, z, 0.55 + r() * 0.4, 70 + k, { dark: true, n: 3 });
    }
  },
};

const chute = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    B.faceY(M.hole, p.x - 0.5, p.x + 0.5, p.z - 0.5, p.z + 0.5, 0.01);
    for (const [dx, dz, w, d] of [[0, -0.58, 1.3, 0.16], [0, 0.58, 1.3, 0.16], [-0.58, 0, 0.16, 1.0], [0.58, 0, 0.16, 1.0]]) {
      B.box(all(M.hazard), p.x + dx, p.z + dz, w, d, 0, 0.14, 0);
    }
    // the hatch lid flung open against the frame, a lamp on a post
    put(B, M.hullSide, new THREE.BoxGeometry(1.0, 0.06, 1.0), [p.x, 0.5, p.z - 0.62], [-1.35, 0, 0]);
    B.box(all(M.iron), p.x + 0.8, p.z - 0.5, 0.08, 0.08, 0, 1.2, 0);
    B.box(all(M.sodium), p.x + 0.8, p.z - 0.5, 0.16, 0.16, 1.2, 1.36, 0);
    glow(W, G, '#ff8a2a', 1.0, 1.0, p.x + 0.8, 1.28, p.z - 0.45, false);
  },
};

const footlocker = {
  textures: [],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on);
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.rot || 0;
    const B = new Batch();
    B.box(all(M.paint, M.ironDark), 0, 0, 0.92, 0.52, 0, 0.36, 0);
    for (const [x, z] of [[-0.44, -0.24], [0.44, -0.24], [-0.44, 0.24], [0.44, 0.24]]) B.box(all(M.brass), x, z, 0.07, 0.07, 0, 0.36, 0);
    for (const k of [-0.25, 0.25]) B.box(all(M.ironDark), k, 0, 0.08, 0.54, 0, 0.36, 0);
    B.build(g);
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.36, -0.26);
    const LB = new Batch();
    LB.box(all(M.paint), 0, 0.27, 0.94, 0.54, 0, 0.12, 0);
    LB.box(all(M.brass), 0, 0.54, 0.14, 0.03, -0.06, 0.08, 0);
    LB.build(hinge);
    g.add(hinge);
    G.add(g);
    W.addBox(p.x, p.z, 0.96, 0.56);
    const living = chestLiving(W, p, hinge, 1.7, null);
    living.object = g;
    living.setOpen(!!p.open, true);
    return living;
  },
};

const powerLever = {
  textures: ['sh_lever_plate', 'sh_mer_wall_side', 'sh_mer_cap'],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on);
    const plate = W.mats.tile('sh_lever_plate', { emissive: 2.4, roughness: 0.55, metalness: 0.45 });
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.rot || 0;
    const B = new Batch();
    B.box({ front: plate, left: M.hullSide, right: M.hullSide, top: M.merCap }, 0, 0, 0.8, 0.4, 0, 1.55, 0, { front: [0, 0, 1, 1] });
    B.box(all(M.iron), 0, -0.22, 0.12, 0.08, 1.55, 3.0, 0);
    B.build(g);
    // the lever: up while the bus is dead, thrown down to restore it
    const arm = new THREE.Group();
    arm.position.set(0.18, 0.9, 0.24);
    const AB = new Batch();
    AB.box(all(M.iron), 0, 0.03, 0.07, 0.07, 0, 0.5, 0);
    AB.box(all(M.hazard), 0, 0.03, 0.16, 0.12, 0.46, 0.6, 0);
    AB.build(arm);
    g.add(arm);
    const lamp = makeGlow('#ff4050', 0.6, 0.9);
    lamp.position.set(-0.2, 1.35, 0.3);
    g.add(lamp);
    G.add(g);
    const [sx, sz] = spanOf(0.84, 0.44, p.rot || 0);
    W.addBox(p.x, p.z, sx, sz);
    let k = p.on ? 1 : 0;
    const apply = () => { arm.rotation.x = k * 2.5; };
    const living = {
      kind: 'switch.lever',
      on: !!p.on,
      setState(on, instant = false) {
        living.on = !!on;
        if (instant) k = on ? 1 : 0;
        tintGlow(lamp, on ? '#4dff9c' : '#ff4050', 0.9);
        apply();
      },
      setOpen(on, instant) { living.setState(on, instant); },
      update(dt) {
        const target = living.on ? 1 : 0;
        if (k === target) return;
        k = target > k ? Math.min(1, k + dt / 0.45) : Math.max(0, k - dt / 0.45);
        apply();
      },
    };
    living.setState(!!p.on, true);
    return living;
  },
};

export default {
  'shoals.tube': tube,
  'shoals.marker': marker,
  'shoals.icePillar': icePillar,
  'shoals.crystal': crystal,
  'shoals.frozenCargo': frozenCargo,
  'shoals.hullShard': hullShard,
  'shoals.icicles': icicles,
  'shoals.abyss': abyss,
  'shoals.bridgeIce': bridgeIce,
  'shoals.drift': drift,
  'shoals.pool': pool,
  'shoals.shaft': shaft,
  'shoals.lampPost': lampPost,
  'shoals.iceSheet': iceSheet,
  'shoals.breach': breach,
  'shoals.lockbox': lockbox,
  'shoals.iceChest': iceChest,
  'shoals.ribbons': ribbons,
  'shoals.emergencyLamp': emergencyLamp,
  'shoals.debris': debris,
  'shoals.merPod': merPod,
  'shoals.fissureGlow': fissureGlow,
  'shoals.captainDesk': captainDesk,
  'shoals.bunk': bunk,
  'shoals.breakerBank': breakerBank,
  'shoals.reactor': reactor,
  'shoals.iceMound': iceMound,
  'shoals.chute': chute,
  'shoals.footlocker': footlocker,
  'shoals.powerLever': powerLever,
};
