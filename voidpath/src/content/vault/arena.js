// vault: battle arenas (browser, TECH_PLAN 7.5). Built with the ArenaKit from the Vault's own
// textures; extra lights come from the kit's pool (4 point lights on high, fewer below).
//
//   vault       a floating island of the Grid: a glowing indigo grid platform with real thickness and
//               lit rims over the data starfield, other islands and light bridges hanging in the dark
//               behind, scrolling data pillars rising out of the abyss
//   vault_core  the Core: a plum dais ringed with light, HALCYON's cracked memory core turning behind
//               ECHO inside a lattice and two orbit rings, a ring of names circling it.
//               react: cue 'echo_gold' (on / off: the Severance turns the core and the key light
//               gold), cue 'echo_falter' (at half health the core cools toward cyan and calms),
//               untargetable (Glitch Phase: the rings stutter, glitch bursts at the core), break (the
//               core gutters, then the light creeps back)

import * as THREE from 'three';
import { makeGlow } from '../../core/vfx.js';

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _sc = new THREE.Vector3();
/** A placement matrix: position, Euler [rx, ry, rz], scale [x, y, z]. */
const placed = (pos, rot, scale) => new THREE.Matrix4().compose(_p.set(...pos), _q.setFromEuler(_e.set(...rot)), _sc.set(...scale));

/** An emissive flat colour (light bridges, rims, rings). */
function neon(kit, color, k = 1.6) {
  return kit.track(new THREE.MeshStandardMaterial({ color: '#0a0a18', roughness: 0.4, metalness: 0.2, emissive: color, emissiveIntensity: k }));
}

/** The data starfield far below and far behind, scrolling slowly. */
function abyss(kit, { y = -9, tint = '#8a84c8' } = {}) {
  const below = kit.mat('va_abyss', { repeat: [12, 8], emissiveIntensity: 1.4 });
  const floor = new THREE.Mesh(kit.plane(160, 100), below);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, y, -10);
  kit.add(floor);
  const back = kit.mat('va_abyss', { repeat: [10, 4], emissiveIntensity: 1.2 });
  back.fog = false;
  back.color.set(tint);
  const wall = kit.add(new THREE.Mesh(kit.plane(200, 80), back));
  wall.position.set(0, 4, -46);
  wall.renderOrder = -2;
  kit.updaters.push((dt, t) => {
    for (const tex of [below.map, below.emissiveMap, below.normalMap]) if (tex) tex.offset.set(t * 0.004, -t * 0.006);
    for (const tex of [back.map, back.emissiveMap, back.normalMap]) if (tex) tex.offset.x = t * 0.002;
  });
}

/**
 * The fighting platform: floor cells where inside(x, z), a slab of real thickness under every edge
 * cell (va_edge sides, a smaller stepped block under it), and a lit rim along every edge that faces
 * the void.
 */
function platform(kit, inside, pick, opts, rimColor = '#4fe3ff') {
  kit.floor((x, z) => (inside(x, z) ? pick(x, z) : null), opts);
  const edge = kit.mat('va_edge', { emissiveIntensity: 2 });
  const under = kit.mat('va_under', { emissiveIntensity: 1.6 });
  const rim = neon(kit, rimColor, 1.8);
  const slabs = [], steps = [], rims = [];
  const r = kit.rng;
  for (let z = kit.WALL_Z; z < 10; z++) {
    for (let x = -15; x < 15; x++) {
      if (!inside(x, z)) continue;
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => !inside(x + dx, z + dz));
      if (!open.length) continue;
      slabs.push(placed([x + 0.5, -0.36, z + 0.5], [0, 0, 0], [1, 0.7, 1]));
      const d = 0.6 + r() * 1.4;
      steps.push(placed([x + 0.5, -0.7 - d / 2, z + 0.5], [0, 0, 0], [0.72, d, 0.72]));
      for (const [dx, dz] of open) {
        rims.push(placed([x + 0.5 + dx * 0.5, 0.01, z + 0.5 + dz * 0.5], [0, dz ? 0 : Math.PI / 2, 0], [1, 0.03, 0.05]));
      }
    }
  }
  const box = kit.track(new THREE.BoxGeometry(1, 1, 1));
  kit.instanced(box, [[edge, slabs]], { receive: true });
  kit.instanced(box, [[under, steps]], { receive: true });
  kit.instanced(box, [[rim, rims]], { receive: false });
}

/** An island hanging in the dark: grid top, rim sides, a stepped underside and a lit rim. */
function island(kit, x, y, z, w, d, top = 'va_grid') {
  const edge = kit.mat('va_edge', { emissiveIntensity: 2 });
  const under = kit.mat('va_under', { emissiveIntensity: 1.6 });
  const t = kit.mat(top);
  kit.box([w, 0.7, d], [edge, edge, t, under, edge, edge], [x, y - 0.7, z]);
  kit.box([w * 0.7, 1.2, d * 0.7], under, [x, y - 1.9, z]);
  kit.box([w * 0.35, 1.4, d * 0.35], under, [x, y - 3.3, z]);
  const rim = kit.add(new THREE.Mesh(kit.track(new THREE.BoxGeometry(w, 0.04, 0.05)), neon(kit, '#4fe3ff', 1.6)));
  rim.position.set(x, y + 0.01, z + d / 2);
}

/** A light bridge from a to b: a thin glowing deck with rails. */
function bridge(kit, a, b, color = '#4fe3ff') {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  const deck = kit.add(new THREE.Mesh(kit.track(new THREE.BoxGeometry(len, 0.07, 0.5)), neon(kit, color, 0.9)));
  deck.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  deck.rotation.set(0, -Math.atan2(dz, dx), Math.atan2(dy, Math.hypot(dx, dz)));
  for (const s of [-0.25, 0.25]) {
    const rail = kit.add(new THREE.Mesh(kit.track(new THREE.BoxGeometry(len, 0.03, 0.03)), neon(kit, color, 2.2)));
    rail.position.copy(deck.position);
    rail.rotation.copy(deck.rotation);
    rail.translateZ(s);
    rail.translateY(0.3);
  }
}

/** A data pillar rising out of the abyss: scrolling glyph columns, a glow at its crown. */
function pillar(kit, x, z, top, color = '#4fe3ff', w = 0.8) {
  const h = top + 9;
  const mat = kit.mat('va_pillar', { repeat: [1, Math.round(h / 3)], emissiveIntensity: 2.2 });
  kit.box([w, h, w], mat, [x, -9, z], 0.4);
  const g = kit.add(makeGlow(color, 1.6, 0.8));
  g.position.set(x, top + 0.2, z);
}

// ---------------------------------------------------------------- the Grid

const VAULT_THEME = {
  background: '#070520', fog: '#140c2c', fogDensity: 0.022,
  hemi: ['#7a6ee0', '#0a0614', 0.8], key: ['#dcd4ff', 1.05, [-6, 12, 10]],
  rimParty: ['#ffb46a', 22], rimEnemy: ['#4fe3ff', 26], fill: ['#b4acff', 0.45],
};

/** The platform outline: a ragged-edged island, wider at the front. */
const gridInside = (x, z) => {
  if (z < -5 || z > 8) return false;
  const half = 13 - Math.max(0, -z - 2) * 1.2 - (z > 6 ? (z - 6) * 2 : 0) - (Math.sin(z * 1.7) > 0.6 ? 1 : 0);
  return x + 0.5 > -half && x + 0.5 < half && !(z === -5 && Math.abs(x) % 5 === 2);
};

function vault(kit) {
  const r = kit.rng;
  abyss(kit);
  platform(kit, gridInside, (x, z) => {
    const k = r();
    return k < 0.12 ? 'va_grid_c' : k < 0.4 ? 'va_grid_b' : 'va_grid';
  }, { va_grid: { emissiveIntensity: 2 }, va_grid_b: { emissiveIntensity: 2 }, va_grid_c: { emissiveIntensity: 2.2 } });

  // islands, bridges and pillars hanging in the dark behind
  island(kit, -10, 1.2, -13, 5, 3);
  island(kit, 3, 2.4, -18, 6, 4, 'va_field');
  island(kit, 12, 0.4, -12, 4, 3);
  island(kit, -3, -1.4, -24, 7, 4, 'va_field');
  bridge(kit, [-7.5, 1.2, -13], [0, 2.4, -17]);
  bridge(kit, [6, 2.4, -17.5], [10, 0.4, -12.5], '#a77aff');
  bridge(kit, [-12.5, 1.2, -12.5], [-16, -0.6, -6]);
  pillar(kit, -15, -8, 4.2);
  pillar(kit, 7.5, -9, 5.5, '#a77aff');
  pillar(kit, -6, -19, 7, '#4fe3ff', 1.1);
  pillar(kit, 15.5, -16, 6, '#ff4fd0', 1);
  pillar(kit, 17, -4, 2.5);

  // memory slabs drifting at the edges, the nearest blurring into the foreground
  const slab = kit.mat('va_monolith', { emissiveIntensity: 2 });
  kit.box([0.9, 2.8, 0.35], slab, [-13.5, -0.4, 4.5], 0.5);
  kit.box([0.8, 2.2, 0.3], slab, [-5.2, -1.2, 9.4], -0.3);
  kit.box([0.7, 1.8, 0.3], slab, [12.5, -0.8, -3.6], 0.9);

  // lights: cyan welling up under the enemy line, violet from behind, magenta corruption off right
  kit.pointLight({ color: '#4fe3ff', intensity: 14, distance: 9, decay: 1.6, position: [-6, 0.8, 1.5] });
  kit.pointLight({ color: '#8a5cff', intensity: 14, distance: 12, decay: 1.5, position: [0, 3, -5] });
  kit.pointLight({ color: '#ff4fd0', intensity: 10, distance: 8, decay: 1.7, position: [9, 1.2, -3] });
  for (const [x, y, z, c, s] of [[-6, 0.3, 1.2, '#4fe3ff', 4.5], [0, 2, -5.5, '#8a5cff', 6], [9, 0.8, -3, '#ff4fd0', 3]]) {
    const g = kit.add(makeGlow(c, s, 0.35, { pull: 0.1 }));
    g.position.set(x, y, z);
  }
  return {
    dust: '#b9a8ff',
    emitters: [
      ['va_drift', { position: [0, 1.5, -1], area: [26, 3, 12], rate: 6 }],
      ['data', { position: [0, -0.4, 8.4], area: [20, 0.3, 0.6], rate: 5 }],
      ['data', { position: [-14, -0.4, 0], area: [0.6, 0.3, 10], rate: 3 }],
    ],
  };
}

// ---------------------------------------------------------------- the Core

const CORE_THEME = {
  background: '#0b0420', fog: '#1c0a2c', fogDensity: 0.02,
  hemi: ['#8a64d8', '#0c0412', 0.8], key: ['#e4d4ff', 1.0, [-6, 12, 10]],
  rimParty: ['#ffb46a', 22], rimEnemy: ['#ff6ad8', 24], fill: ['#c0a8ff', 0.45],
};

const coreInside = (x, z) => {
  const u = (x + 0.5) / 14.5, v = (z + 0.5 - 1.5) / 8.2;
  return u * u + v * v < 1 && z >= -6;
};

const CORE_AT = [1.5, 4.4, -14];

function core(kit) {
  const r = kit.rng;
  abyss(kit, { tint: '#9a7ac8' });
  platform(kit, coreInside, (x, z) => {
    const d = Math.hypot((x + 0.5) / 14.5, (z + 0.5 - 1.5) / 8.2);
    if (d > 0.82) return r() < 0.5 ? 'va_grid_b' : 'va_grid';
    return r() < 0.35 ? 'va_core_b' : 'va_core';
  }, { va_core: { emissiveIntensity: 2 }, va_core_b: { emissiveIntensity: 2.2 } }, '#ff6ad8');

  // concentric rings of light in the dais, turning slowly
  const rings = [];
  for (const [rad, color, k] of [[4.2, '#ff4fd0', 1.1], [7.6, '#4fe3ff', 1.0], [10.6, '#a77aff', 0.8]]) {
    const m = kit.add(new THREE.Mesh(kit.track(new THREE.TorusGeometry(rad, 0.03, 4, 96)), neon(kit, color, k)));
    m.rotation.x = -Math.PI / 2;
    m.scale.set(1, 0.58, 1);
    m.position.set(-1, 0.015, 1.5);
    rings.push(m);
  }

  // HALCYON's memory core: a cracked crystal inside a lattice, two orbit rings, spokes of light
  const coreMat = kit.track(new THREE.MeshStandardMaterial({ color: '#2a0f3a', roughness: 0.25, metalness: 0.3, emissive: '#ff4fd0', emissiveIntensity: 0.9, flatShading: true }));
  const crystal = kit.add(new THREE.Mesh(kit.track(new THREE.IcosahedronGeometry(2.3, 1)), coreMat));
  crystal.position.set(...CORE_AT);
  const latticeMat = kit.track(new THREE.MeshBasicMaterial({ color: '#4fe3ff', wireframe: true, transparent: true, opacity: 0.45 }));
  const lattice = kit.add(new THREE.Mesh(kit.track(new THREE.IcosahedronGeometry(3.3, 1)), latticeMat));
  lattice.position.set(...CORE_AT);
  const orbits = [];
  for (const [rad, tilt, color] of [[4.4, 0.5, '#4fe3ff'], [5.2, -0.8, '#a77aff']]) {
    const m = kit.add(new THREE.Mesh(kit.track(new THREE.TorusGeometry(rad, 0.06, 6, 72)), neon(kit, color, 2)));
    m.position.set(...CORE_AT);
    m.rotation.set(Math.PI / 2 + tilt, 0, tilt * 0.6);
    orbits.push(m);
  }
  // threads of light from the core down into the dais
  for (const [x, z] of [[-9, -5], [8, -5.5], [-2, -5.8]]) {
    const a = new THREE.Vector3(CORE_AT[0], CORE_AT[1] - 2, CORE_AT[2]), b = new THREE.Vector3(x, 0, z);
    const m = kit.add(new THREE.Mesh(kit.track(new THREE.CylinderGeometry(0.035, 0.035, a.distanceTo(b), 4)), neon(kit, '#ff4fd0', 1.3)));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
  const glow = kit.add(makeGlow('#ff4fd0', 7, 0.45, { pull: 0.1 }));
  glow.position.set(CORE_AT[0], CORE_AT[1], CORE_AT[2] + 1);

  // the ring of names circling the core
  const names = new THREE.Group();
  names.position.set(...CORE_AT);
  kit.add(names);
  const glyph = kit.mat('va_glyph', { emissiveIntensity: 2.4 });
  glyph.side = THREE.DoubleSide;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const m = new THREE.Mesh(kit.plane(0.9, 0.9), glyph);
    m.position.set(Math.cos(a) * 6.4, Math.sin(i * 1.7) * 0.4, Math.sin(a) * 6.4);
    m.rotation.y = -a + Math.PI / 2;
    names.add(m);
  }

  // pillars and slabs around the rim, islands far behind
  pillar(kit, -15, -6, 5, '#ff4fd0');
  pillar(kit, 12, -9, 7, '#4fe3ff', 1);
  pillar(kit, 17, -2, 3.5, '#a77aff');
  pillar(kit, -10, -20, 9, '#4fe3ff', 1.2);
  island(kit, 9, 2, -20, 6, 4, 'va_core');
  island(kit, -16, -1, -16, 5, 3, 'va_field');
  const slab = kit.mat('va_monolith', { emissiveIntensity: 2 });
  kit.box([0.9, 3, 0.35], slab, [-14.2, -0.6, 5], 0.4);
  kit.box([0.8, 2.4, 0.3], slab, [14, -0.6, 3.5], -0.6);

  // lights: the core, cyan under ECHO, violet behind the squad
  const coreLight = kit.pointLight({ color: '#ff4fd0', intensity: 22, distance: 16, decay: 1.4, position: [CORE_AT[0], CORE_AT[1] - 1, CORE_AT[2] + 3] });
  kit.pointLight({ color: '#4fe3ff', intensity: 14, distance: 9, decay: 1.6, position: [-4.5, 0.8, 1.5] });
  kit.pointLight({ color: '#8a5cff', intensity: 10, distance: 10, decay: 1.6, position: [7, 2.5, -3] });

  const key = kit.base.key, hemi = kit.hemi;
  const C = {
    k: 1, rest: 1, gold: 0, goldRest: 0, calm: 0, calmRest: 0, stutter: 0,
    keyColor: key.color.clone(), hemiColor: hemi.color.clone(),
    magenta: new THREE.Color('#ff4fd0'), cyan: new THREE.Color('#8ff0ff'), goldC: new THREE.Color('#ffc84a'),
  };
  kit.vaultCore = C;
  const tmp = new THREE.Color();
  kit.updaters.push((dt, t) => {
    const ease = 1 - Math.exp(-2.4 * dt);
    C.k += (C.rest - C.k) * ease;
    C.gold += (C.goldRest - C.gold) * ease;
    C.calm += (C.calmRest - C.calm) * (1 - Math.exp(-0.8 * dt));
    C.stutter = Math.max(0, C.stutter - dt);
    const pulse = 0.85 + 0.15 * Math.sin(t * 1.3);
    const off = C.stutter > 0 && Math.sin(t * 40) > 0.2 ? 0.25 : 1;
    tmp.copy(C.magenta).lerp(C.cyan, C.calm * 0.7).lerp(C.goldC, C.gold);
    coreMat.emissive.copy(tmp);
    coreMat.emissiveIntensity = (0.9 + C.gold * 0.8) * C.k * pulse * off;
    coreLight.color.copy(tmp);
    coreLight.intensity = 22 * C.k * pulse * (1 + C.gold * 0.6) * off;
    glow.material.color.copy(tmp).multiplyScalar(0.6 * C.k * pulse * off);
    key.color.copy(C.keyColor).lerp(C.goldC, C.gold * 0.55);
    hemi.color.copy(C.hemiColor).lerp(C.goldC, C.gold * 0.35);
    const spin = 1 - C.calm * 0.6;
    crystal.rotation.set(t * 0.13 * spin, t * 0.21 * spin, 0);
    lattice.rotation.set(-t * 0.08 * spin, -t * 0.12 * spin, t * 0.05);
    orbits[0].rotation.z = t * 0.4 * spin;
    orbits[1].rotation.z = -t * 0.3 * spin;
    names.rotation.y = t * 0.18 * spin;
    rings.forEach((m, i) => {
      m.rotation.z = t * (i % 2 ? -0.05 : 0.07);
      m.visible = off === 1 || i === 1;
    });
  });
  return {
    dust: '#e0b0ff',
    emitters: [
      ['va_drift', { position: [0, 1.5, -1], area: [26, 3, 12], rate: 6 }],
      ['data', { position: [CORE_AT[0], CORE_AT[1] - 3, CORE_AT[2] + 1], area: [3, 1, 2], rate: 6 }],
      ['glitch', { position: [CORE_AT[0], CORE_AT[1], CORE_AT[2] + 2], area: [3, 3, 1], rate: 1.2, burst: 6 }],
    ],
  };
}

/** The Core answers the fight. */
function coreReact(kit, e) {
  const C = kit.vaultCore;
  if (!C) return;
  const at = [CORE_AT[0], CORE_AT[1], CORE_AT[2] + 2];
  if (e.type === 'cue' && e.name === 'echo_gold') {
    C.goldRest = e.on ? 1 : 0;
    if (e.on) kit.particles?.emit('mote', at, { count: 30, spread: 2 });
  } else if (e.type === 'cue' && e.name === 'echo_falter') {
    C.calmRest = 1;
    C.k = 2.2;
    kit.particles?.emit('holo', at, { count: 40, spread: 2.4 });
  } else if (e.type === 'untargetable') {
    C.stutter = e.on ? 0.9 : 0.4;
    kit.particles?.emit('glitch', at, { count: 30, spread: 2 });
  } else if (e.type === 'break') {
    C.k = 0.3;
    C.goldRest = 0;
  }
}

const VAULT_TEX = ['va_grid', 'va_grid_b', 'va_grid_c', 'va_edge', 'va_under', 'va_abyss', 'va_field', 'va_pillar', 'va_monolith'];

export default {
  vault: { theme: VAULT_THEME, build: vault, textures: VAULT_TEX },
  vault_core: { theme: CORE_THEME, build: core, react: coreReact, textures: [...VAULT_TEX, 'va_core', 'va_core_b', 'va_glyph'] },
};
