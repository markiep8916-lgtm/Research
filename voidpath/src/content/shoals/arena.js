// shoals: battle arenas (browser, TECH_PLAN 7.5). Built with the ArenaKit from the location's own
// textures; extra lights come from the kit's pool (4 point lights on high, fewer below).
//
//   shoals    an ice tunnel in the ring debris: glowing blue ice, two arches open on Tethys, crystals,
//             a Meridian cargo pod frozen into the wall, snow falling
//   meridian  the wreck's broken spine: rusted gunmetal under black ice, sodium emergency lamps still
//             pulsing, a hull breach onto the rings, faded prayer ribbons, empty cryo pods
//   maw_lair  the reactor hall: deck plates under a soft-edged sheet of black ice round the Maw's hole,
//             the frozen reactor and its coil behind the Maw, breach windows on the rings, violet light
//             welling up from the hole it lives in.
//             react: cue 'maw_enrage' (violet flare, the lamps flicker red), untargetable (frost and a
//             ring of light where it went under, the hole glows while it circles; when it surfaces the
//             deck cracks open under the squad), break (the hall gutters)

import * as THREE from 'three';
import { makeGlow, makeFlicker } from '../../core/vfx.js';

// ---------------------------------------------------------------- shared pieces

/** A stalagmite of ice: a jittered hexagonal cone in the ice-wall texture. */
function pillar(kit, x, z, s = 1) {
  const g = kit.track(new THREE.CylinderGeometry(0.14 * s, 0.5 * s, 2.6 * s, 6, 3));
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const h = Math.sin(pos.getX(i) * 91.7 + pos.getY(i) * 47.3 + pos.getZ(i) * 13.1 + x) * 0.5 + 0.5;
    pos.setXYZ(i, pos.getX(i) * (0.85 + h * 0.3), pos.getY(i), pos.getZ(i) * (0.85 + h * 0.3));
  }
  g.computeVertexNormals();
  const m = kit.add(new THREE.Mesh(g, kit.mat('sh_ice_wall', { emissiveIntensity: 2.4, roughness: 0.3, metalness: 0.05 })));
  m.position.set(x, 1.3 * s - 0.05, z);
  m.rotation.set(0.05, x * 3.1, -0.06);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _sc = new THREE.Vector3();
/** A placement matrix: position, Euler [rx, ry, rz], scale [x, y, z]. */
const placed = (pos, rot, scale) => new THREE.Matrix4().compose(_p.set(...pos), _q.setFromEuler(_e.set(...rot)), _sc.set(...scale));

/** A cluster of glowing crystals with a halo (one instanced draw for every cluster of a material). */
function crystals(kit, x, z, s = 1, color = '#5fe0ff', halo = 0.55) {
  const key = `crystal|${color}`;
  let g = kit.crystalSets?.get(key);
  if (!g) {
    kit.crystalSets ||= new Map();
    const mat = kit.track(new THREE.MeshStandardMaterial({ color: '#9aeeff', roughness: 0.12, metalness: 0.1, emissive: color, emissiveIntensity: 1.5, flatShading: true }));
    g = { mat, list: [] };
    kit.crystalSets.set(key, g);
  }
  const r = kit.rng;
  for (let i = 0; i < 5; i++) {
    const len = (0.6 + r() * 0.9) * s * (i ? 1 : 1.5), rad = (0.08 + r() * 0.06) * s * (i ? 1 : 1.4);
    const a = (i / 5) * Math.PI * 2;
    g.list.push(placed([x + (i ? Math.cos(a) * 0.18 * s : 0), len / 2 - 0.05, z + (i ? Math.sin(a) * 0.14 * s : 0)],
      [i ? Math.sin(a) * 0.45 : 0, r() * 3, i ? -Math.cos(a) * 0.45 : 0], [rad, len, rad]));
  }
  const glow = kit.add(makeGlow(color, 1.3 * s, halo));
  glow.position.set(x, 0.7 * s, z + 0.15);
  return glow;
}

/** A row of icicles hanging from the top of the back wall (collected, drawn instanced). */
function icicles(kit, x0, x1, y, dark = false) {
  kit.icicleList ||= { light: [], dark: [] };
  const list = kit.icicleList[dark ? 'dark' : 'light'];
  const r = kit.rng;
  for (let x = x0; x < x1; x += 0.2 + r() * 0.3) {
    const len = 0.15 + r() * r() * 1.0, rad = 0.035 + len * 0.06;
    list.push(placed([x, y - len / 2, kit.WALL_Z + 0.08 + r() * 0.08], [Math.PI, 0, 0], [rad, len, rad]));
  }
}

/** Builds the instanced crystals and icicles collected while the arena was laid out. */
function flushInstances(kit) {
  const cone = kit.track(new THREE.ConeGeometry(1, 1, 6));
  const groups = [];
  for (const { mat, list } of kit.crystalSets?.values() || []) groups.push([mat, list]);
  const ice = kit.icicleList;
  if (ice) {
    const mk = (dark) => kit.track(new THREE.MeshStandardMaterial({
      color: dark ? '#7a90aa' : '#c8f2ff', roughness: 0.1, metalness: 0.05, emissive: dark ? '#24405e' : '#4fc8ff', emissiveIntensity: dark ? 0.5 : 0.8, flatShading: true,
    }));
    if (ice.light.length) groups.push([mk(false), ice.light]);
    if (ice.dark.length) groups.push([mk(true), ice.dark]);
  }
  kit.instanced(cone, groups, { cast: false });
}

/** A soft additive pool of light on the deck (reads at every quality, whatever the light pool holds). */
function floorPool(kit, x, z, r, color, k) {
  const mat = kit.track(new THREE.MeshBasicMaterial({
    map: poolTexture(kit), color: new THREE.Color(color).multiplyScalar(k), transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  }));
  const m = kit.add(new THREE.Mesh(kit.plane(r * 2, r * 2), mat));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  m.renderOrder = 1;
  return m;
}

/** The arena's radial falloff texture (built once per arena, freed with it). */
function poolTexture(kit) {
  if (kit.poolTex) return kit.poolTex;
  const N = 64, data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(((x + 0.5) / N) * 2 - 1, ((y + 0.5) / N) * 2 - 1);
    const v = d >= 1 ? 0 : Math.round((1 - d * d) ** 2 * 255);
    data.set([v, v, v, 255], (y * N + x) * 4);
  }
  const tex = new THREE.DataTexture(data, N, N);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return (kit.poolTex = kit.track(tex));
}

/** A gap in the back wall from x to x + 2 holding a window texture, the backdrop behind it. */
function windowAt(kit, tex, x, y = 0) {
  kit.decalPlane(tex, 2, 3, [x + 1, y + 1.5, kit.WALL_Z + 0.01], { alphaTest: 0.5, emissiveIntensity: 2.2 });
}

/** Back wall: wall pieces from X0 to X1 with 2-wide window gaps at `gaps` (x of each gap's left edge). */
function wallWithGaps(kit, pieces, gaps, opts = {}) {
  let x = kit.X0;
  for (const gx of [...gaps].sort((a, b) => a - b)) {
    if (gx > x) kit.wallRun(pieces, { x0: x, x1: gx, opts });
    x = gx + 2;
  }
  kit.wallRun(pieces, { x0: x, x1: kit.X1, opts });
}

// ---------------------------------------------------------------- the Shoals

const SHOALS_THEME = {
  background: '#040b16', fog: '#0a1c30', fogDensity: 0.028,
  hemi: ['#5f9fd0', '#050a12', 0.7], key: ['#cfeaff', 0.95, [-6, 12, 10]],
  rimParty: ['#ffb25a', 22], rimEnemy: ['#5fd8ff', 26], fill: ['#a8d0ff', 0.4],
};

function shoals(kit) {
  const r = kit.rng;
  const { WALL_Z, WALL_H } = kit;
  // plain and veined ice cells only (the frosted variant would stamp squares), drifts as decals
  kit.floor((x, z) => {
    if (z === WALL_Z) return 'sh_snow';
    if (z === WALL_Z + 1 && r() < 0.5) return 'sh_snow_b';
    return r() < 0.3 ? 'sh_ice_floor_b' : 'sh_ice_floor';
  }, { sh_ice_floor_b: { emissiveIntensity: 2.2, roughness: 0.3 }, sh_ice_floor: { roughness: 0.3 } });
  const ice = { sh_ice_wall: { emissiveIntensity: 2.4, roughness: 0.35 }, sh_ice_wall_b: { emissiveIntensity: 2.4, roughness: 0.35 } };
  // one frozen cargo crate in the whole back wall, plain ice around it
  wallWithGaps(kit, ['sh_ice_wall', 'sh_ice_wall_b', 'sh_ice_wall', 'sh_ice_wall', 'sh_ice_wall_b', 'sh_ice_wall', 'sh_ice_wall', 'sh_ice_wall_b',
    'sh_ice_wall', 'sh_ice_wall_cargo', 'sh_ice_wall', 'sh_ice_wall_b', 'sh_ice_wall', 'sh_ice_wall', 'sh_ice_wall_b', 'sh_ice_wall',
    'sh_ice_wall', 'sh_ice_wall_b', 'sh_ice_wall', 'sh_ice_wall', 'sh_ice_wall_b', 'sh_ice_wall', 'sh_ice_wall', 'sh_ice_wall_b',
    'sh_ice_wall', 'sh_ice_wall', 'sh_ice_wall_b', 'sh_ice_wall', 'sh_ice_wall', 'sh_ice_wall'], [-3, 5], ice);
  windowAt(kit, 'sh_ice_arch', -3);
  windowAt(kit, 'sh_ice_arch', 5);
  kit.wallRun(['sh_ice_wall', 'sh_ice_wall_b', 'sh_ice_wall'], { y: WALL_H, opts: ice });
  icicles(kit, -14, 14, WALL_H);
  for (const x of [-3, 5]) kit.shaft([x + 1, 2.6, WALL_Z + 0.2], { color: '#ffd8a8', opacity: 0.12, lean: x < 0 ? 0.35 : 0.2 });
  pillar(kit, -11.5, -4.4, 1.2);
  pillar(kit, 9.6, -4.8, 1.0);
  pillar(kit, -8.6, 5.6, 0.8);
  crystals(kit, -6.8, -4.6, 1.3);
  crystals(kit, 7.4, -4.4, 1.0, '#7fe8ff', 0.3);   // behind the party: a soft halo, so it does not white them out
  crystals(kit, 12.8, 4.6, 0.8, '#5fe0ff', 0.25);
  for (const [x, z, rot, s] of [[-2, -3.6, 0.4, 2.4], [5.6, 3.4, 1.4, 2.0], [-8.4, 3.0, 2.3, 2.8], [10.2, -2.0, 0.9, 1.7], [-12.0, -3.2, 2.9, 2.2]]) {
    kit.floorDecal('sh_drift', [x, z], rot, s);
  }
  kit.space({ backdrop: 'sh_bd_ring', aimX: 1, aimY: 2.2 });
  const glow = kit.pointLight({ color: '#4fe3ff', intensity: 16, distance: 10, decay: 1.6, position: [-6.6, 1.4, -3.6] });
  kit.flickers.push(makeFlicker(glow, { mode: 'pulse', amount: 0.25, speed: 1.2 }));
  kit.pointLight({ color: '#ffcf9a', intensity: 16, distance: 9, decay: 1.6, position: [2, 2.6, WALL_Z + 1.2] });
  flushInstances(kit);
  return {
    dust: '#cfeaff',
    emitters: [
      ['snow', { position: [0, 3.2, 0], area: [26, 1, 12], rate: 14 }],
      ['frost', { position: [-6.8, 0.6, -4.4], area: [1.6, 0.6, 0.8], rate: 4 }],
    ],
  };
}

// ---------------------------------------------------------------- the Meridian

const MERIDIAN_THEME = {
  background: '#140e10', fog: '#221816', fogDensity: 0.026,
  hemi: ['#a39488', '#30241e', 1.05], key: ['#ffd8b0', 1.0, [-7, 12, 10]],
  rimParty: ['#ffb25a', 22], rimEnemy: ['#ff7a2a', 24], fill: ['#9fb8e8', 0.36],
};

function meridian(kit) {
  const r = kit.rng;
  const { WALL_Z, WALL_H } = kit;
  // black ice along the foot of the wall is soft decals, not cells (cells read as square holes)
  kit.floor((x, z) => {
    if (z === -2 && x > -10 && x < 10) return 'sh_mer_grate';
    return r() < 0.3 ? 'sh_mer_floor_b' : 'sh_mer_floor';
  }, { sh_mer_grate: { emissiveIntensity: 2.2, metalness: 0.5 }, sh_mer_floor: { metalness: 0.45, roughness: 0.55 }, sh_mer_floor_b: { metalness: 0.45, roughness: 0.55 } });
  const wall = { sh_mer_wall_lamp: { emissiveIntensity: 2.6 } };
  // the ship's name on one wall piece in eight
  wallWithGaps(kit, ['sh_mer_wall', 'sh_mer_wall_pipes', 'sh_mer_wall', 'sh_mer_wall_lamp', 'sh_mer_wall_mark', 'sh_mer_wall_pipes', 'sh_mer_wall', 'sh_mer_wall_lamp'], [2], wall);
  windowAt(kit, 'sh_mer_breach', 2);
  kit.wallRun(['sh_mer_wall_pipes', 'sh_mer_wall'], { y: WALL_H, opts: wall });
  icicles(kit, -14, 14, WALL_H, true);
  kit.decalPlane('sh_ribbons', 2, 2, [-6, 1.3, WALL_Z + 0.04], { alphaTest: 0.5, emissiveIntensity: 1.4, side: THREE.DoubleSide });
  kit.decalPlane('sh_ribbons', 2, 2, [-4.2, 1.2, WALL_Z + 0.05], { alphaTest: 0.5, emissiveIntensity: 1.4, side: THREE.DoubleSide });
  const side = kit.mat('sh_mer_wall_side', { metalness: 0.4, roughness: 0.65 });
  for (const [x, tex] of [[8.2, 'sh_mer_pod_open'], [9.3, 'sh_mer_pod'], [-11.4, 'sh_mer_pod_open']]) {
    kit.box([0.9, 2, 0.62], [side, side, side, side, kit.mat(tex, { emissiveIntensity: 2.2 }), side], [x, 0, WALL_Z + 0.4]);
  }
  const cargo = kit.mat('sh_cargo_side'), top = kit.mat('sh_cargo_top');
  kit.box([1.7, 1.05, 1], [cargo, cargo, top, top, cargo, cargo], [-9, -0.2, -3.6], 0.3);
  kit.space({ backdrop: 'sh_bd_ring', aimX: 3, aimY: 2 });
  kit.shaft([3, 2.6, WALL_Z + 0.2], { color: '#bcd6ff', opacity: 0.12, lean: 0.25 });
  const lamps = [];
  for (const x of [-7.5, 6.5]) {
    const g = kit.add(makeGlow('#ff8a2a', 1.3, 1.1));
    g.position.set(x, 2.3, WALL_Z + 0.2);
    const l = kit.pointLight({ color: '#ff8a2a', intensity: 20, distance: 9, decay: 1.6, position: [x, 2.1, WALL_Z + 1.1] });
    kit.flickers.push(makeFlicker(l, { mode: 'pulse', amount: 0.45, speed: 0.9 + lamps.length * 0.3, glow: g }));
    lamps.push(l);
  }
  // two sodium pools on the deck in front of the enemy slots (one point light from the pool)
  const pools = kit.pointLight({ color: '#ff8a2a', intensity: 16, distance: 8, decay: 1.5, position: [-3.4, 1.4, 1.2] });
  kit.flickers.push(makeFlicker(pools, { mode: 'pulse', amount: 0.25, speed: 0.8 }));
  for (const [x, z] of [[-3.6, -1.2], [-2.6, 2.6]]) floorPool(kit, x, z, 2.6, '#ff8a2a', 0.38);
  // the near deck (the lower half of a phone frame): a warm spill and the cold of the breach
  floorPool(kit, -0.6, 5.4, 3.4, '#ff9a3a', 0.26);
  floorPool(kit, 5.2, 6.2, 3.0, '#6fa8ff', 0.2);
  kit.floorDecal('sh_decal_rust', [-3, 2], 0.6, 2);
  kit.floorDecal('sh_decal_blackice', [4.5, -3], 1.2, 3.4);
  for (const [x, rot, sz] of [[-9.5, 0.4, 3.2], [-1.5, 2.1, 2.6], [8.5, 1.3, 3.6]]) kit.floorDecal('sh_decal_blackice', [x, WALL_Z + 0.9], rot, sz);
  kit.foreground();
  flushInstances(kit);
  return {
    dust: '#ffbf8a',
    emitters: [
      ['snow', { position: [3, 3.2, -3], area: [6, 1, 4], rate: 6, color: '#ffd9b8' }],
      ['spark', { position: [-1.4, 2.6, WALL_Z + 0.2], area: [0.1, 0.1, 0.1], rate: 0.7, burst: 10 }],
    ],
  };
}

// ---------------------------------------------------------------- the Maw's lair

const LAIR_THEME = {
  background: '#0a0c1c', fog: '#121632', fogDensity: 0.024,
  hemi: ['#6a7ab8', '#1a1830', 1.0], key: ['#b8d4ff', 1.1, [-6, 13, 10]],
  rimParty: ['#ffb25a', 22], rimEnemy: ['#8a8cff', 18], fill: ['#a8c0ff', 0.5],
};

function lair(kit) {
  const r = kit.rng;
  const { WALL_Z, WALL_H } = kit;
  // black ice spreads from the Maw's hole over the deck plates (an uneven ellipse, not a checkerboard)
  // deck plates everywhere; the black ice round the hole is soft-edged decals, never whole cells
  kit.floor((x, z) => {
    if (z === WALL_Z) return 'sh_mer_grate';
    return r() < 0.3 ? 'sh_mer_floor_b' : 'sh_mer_floor';
  }, { sh_mer_grate: { emissiveIntensity: 2.2 } });
  for (const [x, z, rot, s] of [[-4.4, -0.4, 0.3, 9], [-8.6, -2.6, 1.9, 5.5], [0.4, 0.8, 2.6, 5], [-5.2, 3.2, 1.1, 4.5]]) {
    kit.floorDecal('sh_decal_blackice', [x, z], rot, s);
  }
  // the near deck (the lower half of a phone frame): violet light off the well, a sodium spill
  floorPool(kit, -2.4, 5.0, 3.4, '#8a6aff', 0.22);
  floorPool(kit, 4.4, 6.0, 3.0, '#ff9a3a', 0.2);
  const wall = { sh_mer_wall_lamp: { emissiveIntensity: 2.6 } };
  wallWithGaps(kit, ['sh_mer_wall_pipes', 'sh_mer_wall', 'sh_mer_wall_lamp', 'sh_mer_wall_mark', 'sh_mer_wall_pipes', 'sh_mer_wall', 'sh_mer_wall_lamp', 'sh_mer_wall'], [-1, 6], wall);
  windowAt(kit, 'sh_mer_breach', -1);
  windowAt(kit, 'sh_mer_breach', 6);
  kit.wallRun(['sh_mer_wall_pipes', 'sh_mer_wall', 'sh_mer_wall'], { y: WALL_H, opts: wall });
  icicles(kit, -14, 14, WALL_H, true);
  kit.space({ backdrop: 'sh_bd_ring', aimX: 13, aimY: 4.5 });
  for (const x of [-1, 6]) kit.shaft([x + 1, 2.6, WALL_Z + 0.2], { color: '#bcd6ff', opacity: 0.13, lean: 0.25 });

  // the frozen reactor behind the Maw: an ice-bound column, iron rings, the coil glowing in its cradle
  const core = kit.mat('sh_reactor_ice', { emissiveIntensity: 2.8, roughness: 0.25, metalness: 0.2 });
  const iron = kit.plain('#4c5262', 0.55, 0.5);   // mid iron: a black lid reads as a hole in the frame
  const col = kit.add(new THREE.Mesh(kit.track(new THREE.CylinderGeometry(1.25, 1.25, 4.6, 22, 1, true)), core));
  col.position.set(-10.2, 2.3, -4.4);
  kit.box([3.2, 0.4, 3.2], iron, [-10.2, 0, -4.4], Math.PI / 4);
  kit.box([3, 0.35, 3], iron, [-10.2, 4.6, -4.4], Math.PI / 4);
  for (const y of [1.4, 3.0]) {
    const ring = kit.add(new THREE.Mesh(kit.track(new THREE.TorusGeometry(1.3, 0.09, 6, 24)), iron));
    ring.position.set(-10.2, y, -4.4);
    ring.rotation.x = Math.PI / 2;
  }
  const coilMat = kit.track(new THREE.MeshStandardMaterial({ color: '#2a6a7a', roughness: 0.3, metalness: 0.6, emissive: '#5ff0ff', emissiveIntensity: 1.8 }));
  const coil = kit.add(new THREE.Mesh(kit.track(new THREE.TorusGeometry(0.36, 0.07, 8, 24)), coilMat));
  coil.position.set(-10.2, 1.1, -2.9);
  const coilGlow = kit.add(makeGlow('#7ff4ff', 1.6, 0.9));
  coilGlow.position.set(-10.2, 1.1, -2.7);
  const reactorGlow = kit.add(makeGlow('#ff6a2a', 4.4, 0.5));
  reactorGlow.position.set(-10.2, 2.4, -3.6);
  crystals(kit, -12.2, -3.6, 1.2);
  crystals(kit, -8.4, -5.0, 0.9, '#7fe8ff');
  crystals(kit, 10.4, -4.6, 1.1);
  pillar(kit, 12.4, -3.6, 1.0);

  // sodium emergency lamps on the wall, the violet light welling up out of the hole
  const lamps = [];
  for (const x of [-6.5, 3.5, 11.5]) {
    const g = kit.add(makeGlow('#ff8a2a', 1.2, 1.1));
    g.position.set(x, 2.35, WALL_Z + 0.2);
    lamps.push(g);
  }
  const sodium = kit.pointLight({ color: '#ff8a2a', intensity: 18, distance: 10, decay: 1.6, position: [3.5, 2.2, WALL_Z + 1.2] });
  kit.flickers.push(makeFlicker(sodium, { mode: 'pulse', amount: 0.4, speed: 0.8, glow: lamps[1] }));
  const well = kit.pointLight({ color: '#8a5cff', intensity: 16, distance: 9, decay: 1.6, position: [-4.2, 0.3, 1.2] });
  const reactor = kit.pointLight({ color: '#ff6a2a', intensity: 24, distance: 10, decay: 1.6, position: [-9.2, 2.2, -2.8] });
  const coilLight = kit.pointLight({ color: '#5ff0ff', intensity: 10, distance: 6, decay: 1.8, position: [-10.2, 1.2, -2.2] });
  const wellGlow = kit.add(makeGlow('#8a5cff', 5, 0.3, { pull: 0.1 }));
  wellGlow.position.set(-4.2, 0.2, -0.4);
  kit.floorDecal('sh_decal_rust', [7.5, -2.4], 0.2, 2);
  // the deck cracks that open under the squad when the Maw breaches (hidden until then)
  const cracks = [[4.4, -2.4, 0.4], [3.4, -0.4, 2.1], [2.6, 1.6, 1.2], [1.6, 3.4, 2.8]].map(([x, z, rot]) => kit.floorDecal('sh_decal_crack', [x, z], rot, 2.2));
  const crackMat = cracks[0].material;
  crackMat.opacity = 0;
  kit.foreground();

  // state the reactions drive: k eases toward rest every frame
  const L = { well, wellGlow, reactor, coilLight, coil, coilMat, lamps, sodium, wellBase: well.intensity, k: 1, rest: 1, hole: 0, holeRest: 0, red: 0, crack: 0, crackMat };
  kit.lair = L;
  kit.updaters.push((dt, t) => {
    L.k += (L.rest - L.k) * (1 - Math.exp(-2.5 * dt));
    L.hole += (L.holeRest - L.hole) * (1 - Math.exp(-2 * dt));
    L.red = Math.max(0, L.red - dt * 0.6);
    L.crack = Math.max(0, L.crack - dt * 0.18);
    L.crackMat.opacity = Math.min(1, L.crack * 1.5);
    const pulse = 0.8 + 0.2 * Math.sin(t * 0.9);
    L.well.intensity = L.wellBase * L.k * pulse * (1 + L.hole * 1.4);
    L.wellGlow.material.color.copy(L.wellGlow.userData.baseColor).multiplyScalar(L.k * pulse * (1 + L.hole * 2));
    L.well.color.setRGB(0.54 + L.red * 0.4, 0.36 - L.red * 0.2, 1 - L.red * 0.5);
    L.reactor.intensity = 24 * (0.85 + 0.15 * Math.sin(t * 2.3)) * Math.max(0.35, L.k);
    L.coil.rotation.y = t * 0.6;
    L.coil.position.y = 1.1 + Math.sin(t * 1.4) * 0.05;
    for (const g of L.lamps) {
      const red = L.red > 0 && Math.sin(t * 24 + g.position.x) > 0 ? 0.4 : 1;
      g.material.color.copy(g.userData.baseColor).multiplyScalar(red * Math.max(0.4, L.k));
    }
  });
  flushInstances(kit);
  return {
    dust: '#c8d4ff',
    emitters: [
      ['snow', { position: [0, 3.2, -1], area: [24, 1, 10], rate: 10 }],
      ['sh_motes', { position: [-4.2, 0.6, -0.6], area: [6, 1.2, 3], rate: 3 }],
      ['ember', { position: [-10.2, 0.6, -3.2], area: [2, 0.4, 1], rate: 5 }],
      ['frost', { position: [-4.2, 0.3, -0.2], area: [6, 0.4, 2.4], rate: 6 }],
    ],
  };
}

/** The lair answers the fight: the enrage flare, the dive, the break. */
function lairReact(kit, e) {
  const L = kit.lair;
  if (!L) return;
  if (e.type === 'cue' && e.name === 'maw_enrage') {
    L.k = 3.2;
    L.red = 2.4;
    kit.particles?.emit('void', [-4.2, 1.2, -0.4], { count: 50, spread: 2 });
    kit.engine?.shake(0.25, 0.6);
  } else if (e.type === 'untargetable' && e.style !== 'phase') {
    L.holeRest = e.on ? 1 : 0;
    kit.particles?.emit('sh_shards', [-4.2, 0.3, -0.4], { count: 30 });
    if (e.on) kit.particles?.emit('frost', [-4.2, 0.4, -0.4], { count: 40, spread: 2 });
    else {
      // it breached up through the deck under the squad: the plates crack, ice shards fly
      L.crack = 1;
      kit.particles?.emit('sh_shards', [3.0, 0.3, 0.6], { count: 26, spread: 2.6 });
    }
  } else if (e.type === 'break') L.k = 0.25;   // the hall gutters, then the light creeps back
}

const SHOALS_TEX = ['sh_snow', 'sh_snow_b', 'sh_ice_floor', 'sh_ice_floor_b', 'sh_ice_wall', 'sh_ice_wall_b', 'sh_ice_wall_cargo', 'sh_ice_arch', 'sh_drift', 'sh_bd_ring'];
const MER_TEX = ['sh_mer_grate', 'sh_mer_floor', 'sh_mer_floor_b', 'sh_mer_wall', 'sh_mer_wall_mark', 'sh_mer_wall_pipes', 'sh_mer_wall_lamp', 'sh_mer_breach', 'sh_decal_blackice', 'sh_bd_ring'];

export default {
  shoals: { theme: SHOALS_THEME, build: shoals, textures: SHOALS_TEX },
  meridian: {
    theme: MERIDIAN_THEME, build: meridian,
    textures: [...MER_TEX, 'sh_ribbons', 'sh_mer_wall_side', 'sh_mer_pod', 'sh_mer_pod_open', 'sh_cargo_side', 'sh_cargo_top', 'sh_decal_rust', 'crate_side', 'crate_top'],
  },
  maw_lair: {
    theme: LAIR_THEME, build: lair, react: lairReact,
    textures: [...MER_TEX, 'sh_reactor_ice', 'sh_ice_wall', 'sh_decal_rust', 'sh_decal_crack', 'crate_side', 'crate_top'],
  },
};
