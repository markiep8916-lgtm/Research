// arboretum: battle arenas (browser, TECH_PLAN 7.5). Built with the ArenaKit from the Arboretum's own
// textures (tex.js); plants are alpha cards from the arb_flora atlas merged into one draw per atlas.
// Extra lights come from the kit's pool (4 point lights and a spot on high, fewer below).
//
//   arboretum   the Fern Walk under the domes: a stone path through moss, a glowing water channel,
//               a raised fern bed along the glass wall with Tethys behind it, trees, a sprinkler raining
//   choir_gate  the court before the Choir door: flagstones heaved by roots, stasis pods sunk in them
//               like seed packets, the gold arch of the door, the dome high above. The dome light is a
//               shaft and a spot on the Gardener's place.
//               react: cue 'domeLight' (value true opens the dome: the shaft and spot swell gold, false
//               closes it), cue 'domeDim' (a Break: the light gutters out), cue 'gardener_rage' (a pink
//               flare through the garden), break (the light dips, then returns)

import * as THREE from 'three';
import { makeGlow, makeFlicker } from '../../core/vfx.js';
import { Batch } from '../../world/geometry.js';
import { FLORA, TECH, DECAL, uvOf } from './tex.js';

// ---------------------------------------------------------------- shared pieces

/** Atlas materials for the arena (alpha cards cast cut-out shadows). */
function atlasMats(kit) {
  if (kit.arb) return kit.arb;
  const flora = kit.mat('arb_flora', { alphaTest: 0.5, side: THREE.DoubleSide, emissiveIntensity: 2.2, roughness: 0.82, metalness: 0 });
  if (!flora.userData.depthMat) {
    flora.userData.depthMat = kit.track(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: flora.map, alphaTest: 0.5 }));
  }
  const decal = kit.mat('arb_decal', { transparent: true, alphaTest: 0.01, roughness: 0.6, metalness: 0.1 });
  decal.depthWrite = false;
  decal.polygonOffset = true;
  decal.polygonOffsetFactor = -2;
  decal.userData.cast = false;
  kit.arb = { flora, decal, tech: kit.mat('arb_tech', { emissiveIntensity: 2.4, roughness: 0.55, metalness: 0.35 }), B: new Batch() };
  return kit.arb;
}

const fUV = (k) => uvOf(FLORA, FLORA[k]);
const tUV = (k) => uvOf(TECH, TECH[k]);

/** A vertical card at (x, z) from y0 up h, turned by rot. */
function card(B, mat, x, z, w, h, rot, uv, y0 = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  B.quad(mat, [x - (w / 2) * c, y0, z + (w / 2) * s], [x + (w / 2) * c, y0, z - (w / 2) * s], [x + (w / 2) * c, y0 + h, z - (w / 2) * s], [x - (w / 2) * c, y0 + h, z + (w / 2) * s], uv);
}

const PLANTS = { a: ['fernA', 1.3, 1.25], b: ['fernB', 1.3, 1.25], leaf: ['leafBig', 1.25, 1.2], pink: ['bloomPink', 1.05, 1], violet: ['bloomViolet', 1.05, 1], tall: ['tall', 1.4, 2.7], tuft: ['tuft', 1.5, 0.75], shrooms: ['shrooms', 1.3, 0.65] };

/** A plant of `kind` as two crossed cards (reads from the battle camera's angle). */
function plant(kit, kind, x, z, s = 1, y0 = 0) {
  const { B, flora } = atlasMats(kit);
  const [region, w, h] = PLANTS[kind];
  card(B, flora, x, z, w * s, h * s, 0.55, fUV(region), y0);
  card(B, flora, x, z, w * s, h * s, -0.55, fUV(region), y0);
}

/** A floor decal from the arb_decal atlas. */
function decal(kit, region, x, z, w, d, rot = 0) {
  const { B, decal: mat } = atlasMats(kit);
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (lx, lz) => [x + lx * c + lz * s, 0.01, z - lx * s + lz * c];
  B.quad(mat, P(-w / 2, d / 2), P(w / 2, d / 2), P(w / 2, -d / 2), P(-w / 2, -d / 2), uvOf(DECAL, DECAL[region]));
}

/** Vine strands hanging from the wall top between x0 and x1, a garland now and then. */
function vines(kit, x0, x1, y, z) {
  const { B, flora } = atlasMats(kit);
  const r = kit.rng;
  for (let x = x0; x < x1; x += 0.5 + r() * 0.9) {
    const len = 0.9 + r() * 2;
    card(B, flora, x, z + r() * 0.06, 0.22, len, 0, fUV(['vineA', 'vineB', 'vineC'][Math.floor(r() * 3)]), y - len);
  }
  for (let x = x0 + 2; x < x1 - 2; x += 6 + r() * 5) card(B, flora, x, z + 0.1, 2.8, 1.4, 0, fUV('hanging'), y - 1.3);
}

/** A tree: a bark trunk, root flare, a canopy of tilted leaf clusters and a few hanging vines. */
function tree(kit, x, z, s = 1) {
  const { B, flora } = atlasMats(kit);
  const r = kit.rng;
  const h = 3.4 * s;
  const trunk = new THREE.Mesh(kit.track(new THREE.CylinderGeometry(0.18 * s, 0.32 * s, h, 9, 1, true)), kit.mat('arb_bark', { emissiveIntensity: 2.2, roughness: 0.85, metalness: 0, repeat: [2, 2] }));
  trunk.position.set(x, h / 2, z);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  kit.add(trunk);
  for (let k = 0; k < 4; k++) card(B, flora, x, z, 1.5 * s, 0.6 * s, k * 0.8 + r(), fUV('roots'), 0);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + r() * 0.5;
    const cx = x + Math.cos(a) * 0.8 * s, cz = z + Math.sin(a) * 0.5 * s;
    const w = (1.6 + r() * 0.6) * s, y = h - 0.5 * s + r() * 0.5 * s;
    const tilt = 0.7 + r() * 0.35, rho = (r() - 0.5) * 0.8;
    const ux = Math.cos(rho), uz = Math.sin(rho), vy = Math.sin(tilt), vz = -Math.cos(tilt);
    const P = (lu, lv) => [cx + lu * ux, y + lv * vy, cz + lu * uz + lv * vz];
    B.quad(flora, P(-w / 2, -w / 2), P(w / 2, -w / 2), P(w / 2, w / 2), P(-w / 2, w / 2), fUV('canopy'));
  }
  for (let k = 0; k < 3; k++) card(B, flora, x + (r() - 0.5) * 1.6 * s, z + 0.4 * s, 0.2, 1.8 * s, 0, fUV(['vineA', 'vineB', 'vineC'][k]), h - 1.9 * s);
}

/** A raised bed of `w` x `d` along x, its top dressed with plants. */
function bed(kit, x, z, w, d, kinds) {
  const side = kit.mat('arb_bed', { repeat: [w, 1], roughness: 0.9, metalness: 0.05 });
  const end = kit.mat('arb_bed', { repeat: [d, 1], roughness: 0.9, metalness: 0.05 });
  const top = kit.mat('arb_soil', { repeat: [w, d], roughness: 0.9, metalness: 0 });
  kit.box([w, 0.55, d], [end, end, top, top, side, side], [x, 0, z]);
  const r = kit.rng;
  for (let px = x - w / 2 + 0.6; px < x + w / 2 - 0.3; px += 0.8 + r() * 0.5) {
    plant(kit, kinds[Math.floor(r() * kinds.length)], px, z + (r() - 0.5) * d * 0.5, 0.8 + r() * 0.35, 0.55);
  }
}

/** A box with every face on one region of the arb_tech atlas (pods, planters). */
function techBox(kit, [w, h, d], faces, [x, y, z], rot = 0) {
  const { tech } = atlasMats(kit);
  const geo = kit.track(new THREE.BoxGeometry(w, h, d));
  const uv = geo.attributes.uv;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  ['side', 'side', 'top', 'top', 'front', 'front'].forEach((k, f) => {
    const R = faces[k];
    for (let i = 0; i < 4; i++) uv.setXY(f * 4 + i, R[0] + uv.getX(f * 4 + i) * (R[2] - R[0]), R[1] + uv.getY(f * 4 + i) * (R[3] - R[1]));
  });
  const m = kit.add(new THREE.Mesh(geo, tech));
  m.position.set(x, y + h / 2, z);
  m.rotation.y = rot;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Back wall with 2-wide glass gaps at `gaps` (each gap's left edge). Behind each pane hangs a piece
 * of the dome sky (Tethys through the glass), so no backdrop shows past the arena's open sides.
 */
function glassWall(kit, gaps, y = 0) {
  let x = kit.X0;
  for (const gx of [...gaps].sort((a, b) => a - b)) {
    if (gx > x) kit.wallRun(['arb_wall'], { x0: x, x1: gx, y, opts: { arb_wall: { emissiveIntensity: 2.2, roughness: 0.72, metalness: 0.3 } } });
    const sky = kit.decalPlane('arb_bd_dome', 3, 3.4, [gx + 1, y + 1.6, kit.WALL_Z - 0.35], { emissiveIntensity: 1.2 });
    sky.material.fog = false;
    kit.decalPlane('arb_glass', 2, 3, [gx + 1, y + 1.5, kit.WALL_Z + 0.01], { alphaTest: 0.5, emissiveIntensity: 2.0 });
    x = gx + 2;
  }
  kit.wallRun(['arb_wall'], { x0: x, x1: kit.X1, y, opts: { arb_wall: { emissiveIntensity: 2.2, roughness: 0.72, metalness: 0.3 } } });
}

/** Ferns crowding the bottom-left corner of the frame: the tilt-shift blurs them into foreground. */
function foreground(kit) {
  plant(kit, 'a', -5.2, 6.4, 1.6);
  plant(kit, 'leaf', -3.8, 7.1, 1.3);
  plant(kit, 'b', -6.6, 7.0, 1.4);
  plant(kit, 'pink', -2.8, 7.4, 1.1);
}

// ---------------------------------------------------------------- the Fern Walk

const FERN_THEME = {
  background: '#06100c', fog: '#0c1a14', fogDensity: 0.024,
  hemi: ['#8fd8c0', '#0a140e', 0.78], key: ['#ffd8a0', 1.1, [-6, 12, 10]],
  // a warm rim on the foes: green sprites on green moss still read at phone size (G2 rule 21)
  rimParty: ['#ffb25a', 22], rimEnemy: ['#ffcfe6', 26], fill: ['#bfe8d0', 0.4],
};

function fernWalk(kit) {
  const r = kit.rng;
  const { WALL_Z, WALL_H } = kit;
  kit.floor((x, z) => {
    if (z === WALL_Z + 2) return 'arb_water';
    if (z >= -2 && z <= 1 && Math.abs(x + Math.sin(z) * 2) < 13) return r() < 0.3 ? 'arb_court_b' : 'arb_court';
    return r() < 0.3 ? 'arb_moss_b' : 'arb_moss';
  }, {
    arb_water: { emissiveIntensity: 1.8, roughness: 0.15, metalness: 0.2 },
    arb_court: { roughness: 0.6, metalness: 0.2 }, arb_court_b: { roughness: 0.6, metalness: 0.2 },
    arb_moss: { roughness: 0.78, metalness: 0.08, emissiveIntensity: 2.0 }, arb_moss_b: { roughness: 0.78, metalness: 0.08, emissiveIntensity: 2.0 },
  });
  // two lit panes right behind the foes' back slot (wide enough for the phone's camera too), so a
  // green mantis stands against warm glass
  glassWall(kit, [-5, -3, 3]);
  kit.wallRun(['arb_wall'], { y: WALL_H, opts: { arb_wall: { emissiveIntensity: 2.2 } } });
  vines(kit, -15, 15, WALL_H * 2, WALL_Z + 0.05);
  bed(kit, -10.5, WALL_Z + 0.9, 8, 1.4, ['a', 'b', 'leaf', 'pink', 'tall', 'tuft']);
  bed(kit, 0.5, WALL_Z + 0.9, 6, 1.4, ['a', 'b', 'leaf', 'violet', 'tuft']);
  bed(kit, 10.5, WALL_Z + 0.9, 7, 1.4, ['a', 'b', 'tall', 'pink', 'leaf']);
  tree(kit, -12.6, -2.6, 1.1);
  tree(kit, 12.4, -2.8, 1.0);
  for (const [k, x, z, s] of [['a', -10.5, 1.5, 1.4], ['leaf', -11.8, 4.4, 1.3], ['pink', -9.2, -2.6, 1.1], ['b', 10.4, 3.2, 1.4], ['violet', 11.6, 0.6, 1.1], ['tuft', 7.6, -3.0, 1.1], ['shrooms', -6.6, -2.9, 1], ['tall', 13.8, 1.4, 1], ['a', 8.6, 6.6, 1.3]]) {
    plant(kit, k, x, z, s);
  }
  foreground(kit);
  decal(kit, 'petals', -3.5, 2.2, 2.4, 2.4, 0.6);
  decal(kit, 'mossPatch', 4.5, -1.2, 2.6, 2.6, 1.1);
  decal(kit, 'litterA', -1.2, -2.2, 2, 2, 0.3);
  for (const x of [-3, 4]) kit.shaft([x, 4.2, WALL_Z + 0.4], { color: '#ffd090', opacity: 0.14, lean: x < 0 ? 0.3 : 0.18 });
  // a sprinkler standpipe raining onto the bed, glowing at its head
  const pipe = kit.plain('#4a5a5e', 0.5, 0.5);
  kit.box([0.12, 2.6, 0.12], pipe, [6.6, 0, -4.6]);
  const head = kit.add(makeGlow('#7ff4e0', 0.8, 0.8));
  head.position.set(6.6, 2.62, -4.5);
  atlasMats(kit).B.build(kit.root);
  const water = kit.pointLight({ color: '#3fe0c0', intensity: 14, distance: 9, decay: 1.6, position: [-2, 0.4, WALL_Z + 2.2] });
  kit.flickers.push(makeFlicker(water, { mode: 'pulse', amount: 0.25, speed: 0.8 }));
  // a warm key on the foes' side, in front of them (second in the pool, so phones keep it too)
  kit.pointLight({ color: '#ffeccf', intensity: 12, distance: 7, decay: 1.6, position: [-4.0, 2.6, 2.6] });
  kit.pointLight({ color: '#ffc070', intensity: 16, distance: 10, decay: 1.6, position: [3, 3.2, WALL_Z + 1.6] });
  kit.pointLight({ color: '#ff6fae', intensity: 10, distance: 6, decay: 1.7, position: [-9.2, 1.0, -2.2] });
  return {
    dust: '#ffe0a8',
    emitters: [
      ['firefly', { position: [0, 1.4, 0], area: [26, 1.6, 10], rate: 5 }],
      ['spore', { position: [0, 0.8, -3], area: [26, 1, 4], rate: 3 }],
      ['petal', { position: [-10, 2.4, 0], area: [6, 1, 6], rate: 2 }],
      ['rain', { position: [6.6, 2.55, -4.6], area: [0.6, 0.05, 0.6], rate: 16 }],
    ],
  };
}

// ---------------------------------------------------------------- the Choir Gate

const GATE_THEME = {
  background: '#0a0d08', fog: '#141a0e', fogDensity: 0.022,
  hemi: ['#b8d89a', '#0c0e08', 0.74], key: ['#ffe0a0', 1.15, [-6, 13, 10]],
  rimParty: ['#ffb25a', 22], rimEnemy: ['#ffd27a', 20], fill: ['#d8e8c0', 0.4],
};

const BOSS = [-4.2, -0.8];

function choirGate(kit) {
  const r = kit.rng;
  const { WALL_Z, WALL_H } = kit;
  // flagstones, moss along the wall; the roots spreading from the Gardener's place are decals
  kit.floor((x, z) => {
    if (z === WALL_Z) return 'arb_moss';
    return r() < 0.3 ? 'arb_court_b' : r() < 0.08 ? 'arb_moss_b' : 'arb_court';
  }, {
    arb_court: { roughness: 0.6, metalness: 0.2 }, arb_court_b: { roughness: 0.6, metalness: 0.2 },
    arb_moss: { roughness: 0.78, metalness: 0.08 }, arb_moss_b: { roughness: 0.78, metalness: 0.08 },
  });
  // the wall: solid below, the dome glass above
  kit.wallRun(['arb_wall'], { opts: { arb_wall: { emissiveIntensity: 2.2, roughness: 0.72, metalness: 0.3 } } });
  glassWall(kit, [-10, -3, 6], WALL_H);
  vines(kit, -15, 15, WALL_H, WALL_Z + 0.05);
  // the Choir door: a gold arch, its two leaves shut, vines over it
  const gold = { side: tUV('gold'), top: tUV('gold'), front: tUV('gold') };
  for (const x of [1.1, 4.9]) techBox(kit, [0.4, 3, 0.4], gold, [x, 0, WALL_Z + 0.2]);
  techBox(kit, [4.2, 0.4, 0.4], gold, [3, 2.8, WALL_Z + 0.2]);
  for (const x of [2.25, 3.75]) kit.decalPlane('arb_door', 1.5, 2.8, [x, 1.4, WALL_Z + 0.03], { emissiveIntensity: 2.4, roughness: 0.55, metalness: 0.35 });
  const { B, flora } = atlasMats(kit);
  for (let k = 0; k < 8; k++) card(B, flora, 1.2 + k * 0.52, WALL_Z + 0.45, 0.22, 1 + (k % 3) * 0.5, 0, fUV(['vineA', 'vineB', 'vineC'][k % 3]), 3.1 - (1 + (k % 3) * 0.5));
  card(B, flora, 3, WALL_Z + 0.48, 3.6, 1.5, 0, fUV('hanging'), 1.9);
  const doorGlow = kit.add(makeGlow('#ffd27a', 2.6, 0.5));
  doorGlow.position.set(3, 1.4, WALL_Z + 0.4);
  // stasis pods sunk in the roots along the wall, sorted like seed packets
  const pod = { side: tUV('podSide'), top: tUV('podTop'), front: tUV('podEnd') };
  for (const [x, z, rot] of [[-12.6, -4.6, 0.1], [-10.4, -4.4, -0.06], [8.4, -4.6, 0.08], [10.8, -4.3, -0.1], [13.0, -4.7, 0.05]]) {
    techBox(kit, [1.7, 0.42, 0.8], pod, [x, 0.08, z], rot);
    card(B, flora, x, z + 0.42, 1.6, 0.7, 0, fUV('roots'), 0);
  }
  tree(kit, -13.4, -1.8, 1.15);
  tree(kit, 12.6, -1.4, 1.05);
  for (const [k, x, z, s] of [['a', -11, 2.2, 1.4], ['pink', -12.4, 4.4, 1.2], ['violet', 11.2, 3.4, 1.1], ['b', 12.6, 5.4, 1.4], ['tall', 7.2, -4.4, 1], ['leaf', -8.2, -4.6, 1.2], ['tuft', 6.0, -3.2, 1.1], ['shrooms', -1.4, -3.4, 1], ['pink', -7.8, 3.4, 0.9]]) {
    plant(kit, k, x, z, s);
  }
  foreground(kit);
  decal(kit, 'rootsFlat', BOSS[0], BOSS[1] + 0.6, 7.5, 5, 0.2);
  decal(kit, 'rootsFlat', BOSS[0] + 3.2, BOSS[1] + 2.0, 4.5, 3.5, 2.1);
  decal(kit, 'rootsFlat', BOSS[0] - 3.4, BOSS[1] + 1.4, 4, 3.2, 4.0);
  decal(kit, 'mossPatch', BOSS[0] - 1.8, BOSS[1] + 2.8, 3.4, 3.4, 0.9);
  decal(kit, 'mossPatch', BOSS[0] + 1.6, BOSS[1] - 1.8, 3.0, 3.0, 2.4);
  decal(kit, 'petals', 1.8, 2.6, 2.6, 2.6, 1.6);
  B.build(kit.root);

  // the dome light: a shaft falling on her place, a spot and a gold point that swell when it opens
  const shaft = kit.shaft([BOSS[0] + 1.6, 9, BOSS[1] - 2.4], { width: 2.6, height: 10, color: '#ffd890', opacity: 0.1, tilt: 0.28, lean: 0.16 });
  const spot = kit.spotLight({ color: '#ffd890', intensity: 0, distance: 18, angle: 0.42, penumbra: 0.6, decay: 1.2, position: [BOSS[0] + 1.5, 12, BOSS[1] - 1], target: [BOSS[0], 0, BOSS[1]] });
  const sun = kit.pointLight({ color: '#ffd27a', intensity: 10, distance: 10, decay: 1.5, position: [BOSS[0] + 0.6, 5, BOSS[1] + 0.6] });
  const bio = kit.pointLight({ color: '#3fe0c0', intensity: 12, distance: 8, decay: 1.6, position: [BOSS[0] + 2.4, 0.4, BOSS[1] + 2.4] });
  kit.flickers.push(makeFlicker(bio, { mode: 'pulse', amount: 0.3, speed: 0.7 }));
  const pink = kit.pointLight({ color: '#ff6fae', intensity: 8, distance: 7, decay: 1.7, position: [-11.6, 1.2, 3.4] });
  kit.pointLight({ color: '#ffd27a', intensity: 10, distance: 7, decay: 1.6, position: [3, 1.6, WALL_Z + 1.4] });
  const L = { shaft, spot, sun, pink, doorGlow, k: 0.35, rest: 0.35, flare: 0 };
  kit.dome = L;
  kit.updaters.push((dt, t) => {
    L.k += (L.rest - L.k) * (1 - Math.exp(-2.2 * dt));
    L.flare = Math.max(0, L.flare - dt * 0.7);
    const k = L.k * (0.92 + 0.08 * Math.sin(t * 1.3));
    L.shaft.userData.uniforms.uOpacity.value = 0.05 + k * 0.22;
    L.spot.intensity = k * 60;
    L.sun.intensity = 6 + k * 20;
    L.pink.intensity = 8 + L.flare * 30;
    L.doorGlow.material.color.copy(L.doorGlow.userData.baseColor).multiplyScalar(0.7 + 0.3 * Math.sin(t * 0.8));
  });
  return {
    dust: '#ffe9b0',
    emitters: [
      ['petal', { position: [0, 2.6, -1], area: [24, 1, 8], rate: 3 }],
      ['firefly', { position: [0, 1.4, 0], area: [26, 1.6, 10], rate: 4 }],
      ['mote', { position: [BOSS[0], 2.2, BOSS[1]], area: [4, 3, 3], rate: 3 }],
      ['spore', { position: [BOSS[0], 0.4, BOSS[1] + 1], area: [8, 0.6, 4], rate: 3 }],
    ],
  };
}

/** The gate answers the fight: the dome opening and closing, a Break, her rage. */
function gateReact(kit, e) {
  const L = kit.dome;
  if (!L) return;
  if (e.type === 'cue' && e.name === 'domeLight') L.rest = e.value ? 1 : 0.35;
  else if (e.type === 'cue' && e.name === 'domeDim') {
    L.k = 0.05;
    L.rest = 0.35;
    kit.particles?.emit('arb_vines', [BOSS[0], 2.4, BOSS[1]], { count: 16 });
  } else if (e.type === 'cue' && e.name === 'gardener_rage') {
    L.flare = 1;
    kit.particles?.emit('petal', [BOSS[0], 3, BOSS[1]], { count: 30 });
  } else if (e.type === 'break') L.k *= 0.4;
}

const FLOOR_TEX = ['arb_moss', 'arb_moss_b', 'arb_court', 'arb_court_b'];
const SET_TEX = ['arb_wall', 'arb_glass', 'arb_bd_dome', 'arb_flora', 'arb_decal', 'arb_bark'];

export default {
  arboretum: { theme: FERN_THEME, build: fernWalk, textures: [...FLOOR_TEX, ...SET_TEX, 'arb_water', 'arb_bed', 'arb_soil'] },
  choir_gate: { theme: GATE_THEME, build: choirGate, react: gateReact, textures: [...FLOOR_TEX, ...SET_TEX, 'arb_tech', 'arb_door'] },
};
