// warden: the crown arena (browser, TECH_PLAN 7.5, 7.9, 12.1). Built with the ArenaKit from the
// crown's own textures (tex.js); extra lights come from the kit's pool (4 point lights on high).
//
//   heart_crown  the top of the Heart: a round dais of navy lacquer flagstones seamed with gold, two
//                cradle rings and twelve spokes of gold inlaid round WARDEN's place, hanging over a void
//                full of sleeping pods that recede as points of warm light. Behind WARDEN the crown
//                itself: two great gilt rings turning in the dark, twelve rays of light between them,
//                streams of light rising from below, and gilt ribs of the cathedral closing over the
//                frame's edges. Gold light on WARDEN's side, a cool dawn-blue rim on the squad's.
//                react:
//                  transform, cue 'choir_flood'   the Choir's light floods in: the rings and rays blaze,
//                                                 every light turns gold and stays there (form 2)
//                  cue 'lock_shield'              the floor rings pulse as the shield grows back
//                  cue 'cradle_close'             the crown's rings draw in round WARDEN, then ease out
//                  cue 'choir_voices'             voices rise out of the void in columns of light
//                  cue 'theo'                     a flare of morning light on the squad's side
//                  break                          the crown gutters, then its light creeps back

import * as THREE from 'three';
import { makeGlow, glowTexture } from '../../core/vfx.js';
import { STAGE_SLOT } from './data.js';

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _sc = new THREE.Vector3();
const placed = (pos, rot, scale) => new THREE.Matrix4().compose(_p.set(...pos), _q.setFromEuler(_e.set(...rot)), _sc.set(...scale));

/** An emissive flat colour (inlays, rings, rays). */
function neon(kit, color, k = 1.6) {
  return kit.track(new THREE.MeshStandardMaterial({ color: '#0b0906', roughness: 0.4, metalness: 0.3, emissive: color, emissiveIntensity: k }));
}

const THEME = {
  background: '#05040b', fog: '#120d10', fogDensity: 0.018,
  hemi: ['#a89878', '#06050c', 0.75], key: ['#ffe8c0', 1.0, [-6, 12, 10]],
  rimParty: ['#9fc4ff', 22], rimEnemy: ['#ffcf6a', 18], fill: ['#c4b4ff', 0.42],
};

// WARDEN stands at its stage slot; its floor rings centre on it
const BOSS = STAGE_SLOT;
const CROWN = [-3.6, 6.2, -11];

/** The dais: an ellipse wider at the front, open to the void at the back corners. */
const inside = (x, z) => {
  if (z < -6) return false;
  const u = (x + 0.5) / 14.5, v = (z + 0.5 - 1.6) / 8.6;
  return u * u + v * v < 1;
};

function dais(kit) {
  const r = kit.rng;
  kit.floor((x, z) => {
    if (!inside(x, z)) return null;
    const k = r();
    return k < 0.025 ? 'wd_crown_floor_c' : k < 0.5 ? 'wd_crown_floor_b' : 'wd_crown_floor';
  }, { wd_crown_floor: { emissiveIntensity: 1.4 }, wd_crown_floor_b: { emissiveIntensity: 1.4 }, wd_crown_floor_c: { emissiveIntensity: 1.6 } });
  // slabs of real thickness under every edge cell, a stepped underside, a gilt lip facing the void
  const rim = kit.mat('wd_crown_rim', { emissiveIntensity: 2 });
  const under = kit.mat('wd_crown_under', { emissiveIntensity: 1.6 });
  const lip = neon(kit, '#ffc85a', 1.4);
  const slabs = [], steps = [], lips = [];
  for (let z = kit.WALL_Z; z < 10; z++) {
    for (let x = -15; x < 15; x++) {
      if (!inside(x, z)) continue;
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => !inside(x + dx, z + dz));
      if (!open.length) continue;
      slabs.push(placed([x + 0.5, -0.4, z + 0.5], [0, 0, 0], [1, 0.8, 1]));
      const d = 0.8 + r() * 1.8;
      steps.push(placed([x + 0.5, -0.8 - d / 2, z + 0.5], [0, 0, 0], [0.7, d, 0.7]));
      for (const [dx, dz] of open) lips.push(placed([x + 0.5 + dx * 0.5, 0.012, z + 0.5 + dz * 0.5], [0, dz ? 0 : Math.PI / 2, 0], [1, 0.03, 0.05]));
    }
  }
  const box = kit.track(new THREE.BoxGeometry(1, 1, 1));
  kit.instanced(box, [[rim, slabs]], { receive: true });
  kit.instanced(box, [[under, steps]], { receive: true });
  kit.instanced(box, [[lip, lips]], { receive: false });
}

/** The cradle inlaid in the floor round WARDEN: two gold rings, twelve spokes, a soft pool of light. */
function inlay(kit, C) {
  const ring = (rad, k) => {
    const m = kit.add(new THREE.Mesh(kit.track(new THREE.TorusGeometry(rad, 0.035, 4, 120)), neon(kit, '#ffc85a', k)));
    m.rotation.x = -Math.PI / 2;
    m.scale.set(1, 0.62, 1);
    m.position.set(BOSS[0], 0.016, BOSS[1]);
    return m;
  };
  C.floorRings = [ring(2.6, 1.6), ring(3.5, 1.1)];
  const spokeMat = neon(kit, '#ffd27a', 1.3);
  C.floorRingMats = [...C.floorRings.map((m) => m.material), spokeMat];
  const spokes = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    spokes.push(placed([BOSS[0] + Math.cos(a) * 3.05, 0.015, BOSS[1] + Math.sin(a) * 3.05 * 0.62], [0, -a, 0], [0.7, 0.02, 0.05]));
  }
  kit.instanced(kit.track(new THREE.BoxGeometry(1, 1, 1)), [[spokeMat, spokes]], { receive: false });
  // the pool lies flat on the floor (a billboard here would haze over the construct's body)
  const pool = kit.add(new THREE.Mesh(kit.plane(7.4, 4.6), kit.track(new THREE.MeshBasicMaterial({
    map: glowTexture(), color: '#ffc85a', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  }))));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(BOSS[0], 0.03, BOSS[1]);
  C.pool = pool;
}

/** The void below and the Choir far away: a sea of sleeping pods receding into the dark. */
function choir(kit, C) {
  const below = kit.mat('wd_pod_wall', { repeat: [7, 5], emissiveIntensity: 1.1 });
  const floor = new THREE.Mesh(kit.plane(170, 110), below);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -11, -8);
  kit.add(floor);
  const back = kit.mat('wd_pod_wall', { repeat: [8, 3.5], emissiveIntensity: 0.9 });
  back.fog = false;
  back.color.set('#8a7c6a');
  const wall = kit.add(new THREE.Mesh(kit.plane(220, 96), back));
  wall.position.set(0, 4, -48);
  wall.renderOrder = -2;
  C.podMats = [below, back];
  // nearer pods hanging in the dark like stars: soft glows at many depths
  const r = kit.rng;
  const stars = [];
  for (let i = 0; i < 46; i++) {
    const x = -26 + r() * 52, y = -7 + r() * 20, z = -12 - r() * 26;
    if (x > -10 && x < 3 && y > 0 && y < 12 && z > -18) continue;   // keep the crown clear
    const g = kit.add(makeGlow(r() < 0.2 ? '#fff0c0' : '#ffc85a', 0.5 + r() * 0.9, 0.5 + r() * 0.4));
    g.position.set(x, y, z);
    stars.push(g);
  }
  C.stars = stars;
  // a few pods close enough to read as pods: porcelain capsules with a lit window
  const shell = kit.track(new THREE.MeshStandardMaterial({ color: '#5a5878', roughness: 0.35, metalness: 0.4 }));
  const glass = neon(kit, '#ffd27a', 1.8);
  C.podGlass = glass;
  const cap = kit.track(new THREE.CapsuleGeometry(0.32, 0.9, 4, 10));
  const win = kit.track(new THREE.CapsuleGeometry(0.2, 0.5, 3, 8));
  for (const [x, y, z, rot] of [[-15, 1.5, -9, 0.3], [11, 3.5, -12, -0.4], [15.5, -0.5, -5, 0.2], [-12, 6.5, -15, -0.2], [7, 7.5, -17, 0.5], [-19, -2, -4, 0.1]]) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(cap, shell);
    const w = new THREE.Mesh(win, glass);
    w.position.z = 0.2;
    g.add(m, w);
    g.position.set(x, y, z);
    g.rotation.z = rot;
    kit.add(g);
  }
}

/** The crown behind WARDEN: two great gilt rings turning, twelve rays of light, rising streams. */
function crown(kit, C) {
  const gilt = kit.track(new THREE.MeshStandardMaterial({ color: '#b58723', roughness: 0.32, metalness: 0.85, emissive: '#ffc85a', emissiveIntensity: 0.55 }));
  C.giltMat = gilt;
  const rings = [];
  for (const [rad, tube, tilt] of [[7.2, 0.16, 0.22], [9.4, 0.12, -0.34], [5.4, 0.08, 0.9]]) {
    const m = kit.add(new THREE.Mesh(kit.track(new THREE.TorusGeometry(rad, tube, 8, 128)), gilt));
    m.position.set(...CROWN);
    m.rotation.set(tilt, 0, 0);
    rings.push(m);
  }
  C.rings = rings;
  // gold beads riding the rings
  const beadMat = neon(kit, '#fff0c0', 2.4);
  const beads = new THREE.Group();
  beads.position.set(...CROWN);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const b = new THREE.Mesh(kit.track(new THREE.SphereGeometry(0.22, 8, 6)), beadMat);
    b.position.set(Math.cos(a) * 7.2, Math.sin(a) * 7.2, 0);
    beads.add(b);
  }
  kit.add(beads);
  C.beads = beads;
  // twelve rays of light between the rings (the sigil's rays), long thin strips
  const rayMat = kit.mat('wd_ray', { emissiveIntensity: 2.2 });
  rayMat.transparent = true;
  rayMat.depthWrite = false;
  rayMat.side = THREE.DoubleSide;
  C.rayMat = rayMat;
  const rays = new THREE.Group();
  rays.position.set(...CROWN);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const long = k % 2 === 0;
    const m = new THREE.Mesh(kit.plane(0.9, long ? 7 : 4.6), rayMat);
    const mid = 7.6 + (long ? 3.5 : 2.3);
    m.position.set(Math.cos(a) * mid, Math.sin(a) * mid, -0.3);
    m.rotation.z = a - Math.PI / 2;
    rays.add(m);
  }
  kit.add(rays);
  C.rays = rays;
  const halo = kit.add(makeGlow('#ffc85a', 11, 0.32, { pull: 0.1 }));
  halo.position.set(CROWN[0], CROWN[1], CROWN[2] + 0.5);
  C.halo = halo;
  // light streams rising from the void
  for (const [x, z, h] of [[-12, -4, 14], [8.5, -6, 16], [-1.5, -9, 18], [14, -2, 12]]) {
    kit.shaft([x, -6, z], { width: 1.6, height: h, color: '#ffd27a', opacity: 0.13, tilt: 0, lean: 0 });
  }
}

/** Gilt ribs of the cathedral closing over the frame's edges (foreground silhouettes). */
function ribs(kit) {
  const gilt = kit.track(new THREE.MeshStandardMaterial({ color: '#2a2418', roughness: 0.5, metalness: 0.7, emissive: '#ffb648', emissiveIntensity: 0.12 }));
  const edge = neon(kit, '#ffc85a', 0.9);
  for (const [x, z, lean] of [[-16.5, 6, 0.16], [17, 5, -0.14], [-19, -5, 0.1], [19.5, -6, -0.08]]) {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(kit.track(new THREE.BoxGeometry(0.7, 22, 0.6)), gilt);
    beam.position.y = 9;
    const line = new THREE.Mesh(kit.track(new THREE.BoxGeometry(0.06, 22, 0.06)), edge);
    line.position.set(x < 0 ? 0.36 : -0.36, 9, 0.3);
    g.add(beam, line);
    g.position.set(x, -3, z);
    g.rotation.z = lean;
    kit.add(g);
  }
}

function build(kit) {
  const C = { flood: 0, floodRest: 0, k: 1, kRest: 1, pulse: 0, close: 0, dawn: 0 };
  kit.crown = C;
  choir(kit, C);
  dais(kit);
  inlay(kit, C);
  crown(kit, C);
  ribs(kit);

  // lights: gold pool under WARDEN, the crown's light behind, cool dawn fill on the squad, warm low rim
  const pool = kit.pointLight({ color: '#ffc860', intensity: 10, distance: 10, decay: 1.5, position: [BOSS[0], 2.4, BOSS[1] + 1.5] });
  const crownLight = kit.pointLight({ color: '#ffd27a', intensity: 12, distance: 18, decay: 1.4, position: [CROWN[0], CROWN[1] - 1, CROWN[2] + 4] });
  const dawn = kit.pointLight({ color: '#9fc4ff', intensity: 9, distance: 10, decay: 1.6, position: [6.5, 2.6, 3] });
  kit.pointLight({ color: '#ff9f5a', intensity: 7, distance: 8, decay: 1.7, position: [-10, 1.2, 5.5] });

  const key = kit.base.key, hemi = kit.hemi, rimE = kit.base.rimEnemy;
  const base = {
    key: key.color.clone(), hemi: hemi.color.clone(), keyI: key.intensity,
    gold: new THREE.Color('#ffc84a'), dawnC: new THREE.Color('#d8e8ff'), dawnBase: new THREE.Color('#9fc4ff'),
  };
  const glowBase = C.halo.material.color.clone();
  kit.updaters.push((dt, t) => {
    const ease = 1 - Math.exp(-1.6 * dt);
    C.flood += (C.floodRest - C.flood) * (1 - Math.exp(-0.9 * dt));
    C.k += (C.kRest - C.k) * ease;
    C.pulse = Math.max(0, C.pulse - dt * 1.4);
    C.close = Math.max(0, C.close - dt * 0.5);
    C.dawn = Math.max(0, C.dawn - dt * 0.45);
    const f = C.flood, k = C.k;
    const breath = 0.9 + 0.1 * Math.sin(t * 1.1);
    // the crown turns; the cradle-close draws its rings in round WARDEN
    const sc = 1 - C.close * 0.18;
    C.rings.forEach((m, i) => {
      m.rotation.z = t * (i % 2 ? -0.07 : 0.05) * (1 + f * 1.5);
      m.scale.setScalar(sc * (1 + f * 0.06 * (i + 1)));
    });
    C.beads.rotation.z = t * 0.05 * (1 + f * 1.5);
    C.beads.scale.setScalar(sc);
    C.rays.rotation.z = -t * 0.02;
    C.giltMat.emissiveIntensity = (0.55 + f * 1.4 + C.pulse * 0.8) * k * breath;
    C.rayMat.emissiveIntensity = (2.2 + f * 2.2) * k * breath;
    C.rayMat.opacity = Math.min(1, 0.75 + f * 0.25) * k;
    C.halo.material.color.copy(glowBase).multiplyScalar((1 + f * 1.4) * k * breath);
    C.podMats.forEach((m, i) => { m.emissiveIntensity = ((i ? 0.9 : 1.1) + f * 1.2) * k; });
    C.podGlass.emissiveIntensity = (1.8 + f * 1.6) * k;
    C.floorRingMats.forEach((m, i) => { m.emissiveIntensity = ((i ? 1.1 : 1.6) + f * 1.2 + C.pulse * 3) * k; });
    C.pool.material.color.set('#ffc85a').multiplyScalar((0.35 + f * 0.4 + C.pulse * 0.5) * k);
    pool.intensity = (10 + f * 8 + C.pulse * 12) * k;
    crownLight.intensity = (12 + f * 12) * k * breath;
    dawn.color.copy(base.dawnBase).lerp(base.dawnC, C.dawn);
    dawn.intensity = 9 + C.dawn * 22 + f * 2;
    key.color.copy(base.key).lerp(base.gold, f * 0.45);
    key.intensity = base.keyI * (0.85 + f * 0.25) * (0.6 + 0.4 * k);
    hemi.color.copy(base.hemi).lerp(base.gold, f * 0.3);
    rimE.intensity = 18 * (1 + f * 0.5) * k;
    for (let i = 0; i < C.stars.length; i++) {
      const s = C.stars[i];
      s.material.opacity = (0.55 + 0.35 * Math.sin(t * 0.8 + i * 1.7)) * (1 + f * 0.5);
    }
  });
  return {
    dust: '#ffe2a0',
    emitters: [
      ['wd_motes', { position: [0, 4, -1], area: [28, 5, 12], rate: 5 }],
      ['wd_voices', { position: [0, -2, -6], area: [26, 0.5, 4], rate: 1.4 }],
    ],
  };
}

/** The crown answers the fight. */
function react(kit, e) {
  const C = kit.crown;
  if (!C) return;
  const at = [CROWN[0], CROWN[1], CROWN[2] + 2];
  if (e.type === 'transform' || (e.type === 'cue' && e.name === 'choir_flood')) {
    if (C.floodRest < 1) kit.particles?.emit('wd_choir', at, { count: 60, spread: 4 });
    C.floodRest = 1;
    C.pulse = 1;
  } else if (e.type === 'cue' && e.name === 'lock_shield') {
    C.pulse = 1;
  } else if (e.type === 'cue' && e.name === 'cradle_close') {
    C.close = 1;
    C.pulse = 0.6;
  } else if (e.type === 'cue' && e.name === 'choir_voices') {
    for (const x of [-10, -3, 5, 12]) kit.particles?.emit('wd_voices', [x, -1.5, -5], { count: 18, spread: 1.2 });
  } else if (e.type === 'cue' && e.name === 'theo') {
    C.dawn = 1;
    kit.particles?.emit('wd_dawn', [5.5, 2.2, 2], { count: 40, spread: 3 });
  } else if (e.type === 'break') {
    C.k = 0.35;
  }
}

export default {
  heart_crown: {
    theme: THEME, build, react,
    textures: ['wd_crown_floor', 'wd_crown_floor_b', 'wd_crown_floor_c', 'wd_crown_rim', 'wd_crown_under', 'wd_pod_wall', 'wd_ray'],
  },
};
