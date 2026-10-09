// spire: battle arenas (browser, TECH_PLAN 7.5). Built with the ArenaKit from the location's own
// textures; extra lights come from the kit's pool (4 point lights on high, fewer below).
//
//   spire          a Spire deck on red alert: charcoal plate under white floodlight pools, the crimson
//                  alert band and a strobe pulsing on the wall, a barricade and supply crates, one of
//                  WARDEN's gold screens, Tethys through two viewports
//   spire_command  the Command Deck: black stone under the great window onto Tethys, gold-framed black
//                  glass, WARDEN's screens either side, the holo table glowing behind Voss.
//                  react: cue 'voss_overclock' (her upload starts: the deck floods cyan, data pours off
//                  her, the screens stutter and the alert quickens), break (the deck gutters, then the
//                  light creeps back)

import * as THREE from 'three';
import { makeGlow, makeFlicker } from '../../core/vfx.js';

// ---------------------------------------------------------------- shared pieces

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

/** A soft additive pool of light on the deck (reads at every quality, whatever the light pool holds). */
function floorPool(kit, x, z, r, color, k, sz = 0.8) {
  const mat = kit.track(new THREE.MeshBasicMaterial({
    map: poolTexture(kit), color: new THREE.Color(color).multiplyScalar(k), transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  }));
  const m = kit.add(new THREE.Mesh(kit.plane(r * 2, r * 2 * sz), mat));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.02, z);
  m.renderOrder = 1;
  return m;
}

/** One of WARDEN's screens on the back wall: the animated slogan, a gold glow on the wall around it. */
function screen(kit, x, y = 1.9) {
  const z = kit.WALL_Z + 0.03;
  kit.box([1.9, 1.1, 0.06], kit.plain('#121218', 0.5, 0.4), [x, y - 0.55, z]);
  const m = kit.decalPlane('sp_propaganda', 1.7, 0.96, [x, y, z + 0.04], { emissiveIntensity: 2.4, roughness: 0.4 });
  const g = kit.add(makeGlow('#ffc04a', 2.2, 0.45));
  g.position.set(x, y, z + 0.2);
  return { mesh: m, glow: g };
}

/** A red alert strobe on the back wall: a caged lamp, its glow, a pulsing pooled light. */
function strobe(kit, x, y = 2.5, light = 14) {
  const z = kit.WALL_Z;
  kit.box([0.3, 0.3, 0.14], kit.plain('#1a1a20', 0.5, 0.5), [x, y - 0.15, z + 0.07]);
  const lamp = kit.track(new THREE.MeshStandardMaterial({ color: '#801018', emissive: '#ff2a3c', emissiveIntensity: 2.6, roughness: 0.3 }));
  const dome = kit.add(new THREE.Mesh(kit.track(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), lamp));
  dome.position.set(x, y, z + 0.14);
  dome.rotation.x = Math.PI / 2;
  const g = kit.add(makeGlow('#ff2a3c', 1.8, 1.0));
  g.position.set(x, y, z + 0.3);
  if (!light) return { glow: g, flicker: null };
  const l = kit.pointLight({ color: '#ff2a3c', intensity: light, distance: 9, decay: 1.6, position: [x, y - 0.2, z + 1.2] });
  const flicker = makeFlicker(l, { mode: 'pulse', amount: 0.55, speed: 2.2, glow: g });
  kit.flickers.push(flicker);
  return { glow: g, flicker };
}

/** A white floodlight head on the wall top with its shaft and the pool it lays on the deck. */
function flood(kit, x, z, { color = '#f4f0ff', k = 0.3, r = 3.2, shaft = true } = {}) {
  const g = kit.add(makeGlow(color, 1.0, 0.6));
  g.position.set(x, kit.WALL_H - 0.1, kit.WALL_Z + 0.25);
  kit.box([0.5, 0.2, 0.3], kit.plain('#1a1a20', 0.5, 0.5), [x, kit.WALL_H - 0.2, kit.WALL_Z + 0.15]);
  if (shaft) kit.shaft([x, kit.WALL_H - 0.1, kit.WALL_Z + 0.3], { color, opacity: 0.08, width: 1.1, height: 9, tilt: 0.95, lean: (x > 0 ? -1 : 1) * 0.12 });
  floorPool(kit, x, z, r, color, k);
}

/** Security supply crates and a barricade run (Spire textures: no Halcyon cargo here). */
function crate(kit, x, z, s = 0.7, rot = 0, y = 0) {
  const side = kit.mat('sp_crate', { roughness: 0.55, metalness: 0.4 }), top = kit.mat('sp_cap');
  const m = kit.box([1, 1, 1], [side, side, top, top, side, side], [x, y, z], rot);
  m.scale.setScalar(s);
  m.position.y = y + s / 2;
  return m;
}

function barricade(kit, x, z, len, rot = 0) {
  const face = kit.mat('sp_barricade', { roughness: 0.6, metalness: 0.4 }), cap = kit.mat('sp_cap');
  kit.box([len, 1.05, 0.34], [cap, cap, cap, cap, face, face], [x, 0, z], rot);
  const lamp = kit.track(new THREE.MeshStandardMaterial({ color: '#801018', emissive: '#ff2a3c', emissiveIntensity: 2.4, roughness: 0.3 }));
  for (const s of [-1, 1]) {
    const px = x + Math.cos(rot) * s * (len / 2 - 0.1), pz = z - Math.sin(rot) * s * (len / 2 - 0.1);
    kit.box([0.12, 0.42, 0.12], kit.plain('#1a1a20', 0.5, 0.5), [px, 1.05, pz]);
    kit.box([0.14, 0.1, 0.14], lamp, [px, 1.47, pz]);
  }
}

/** Foreground clutter bottom-left (the tilt-shift blurs it into miniature). */
function foreground(kit) {
  crate(kit, -4.7, 6.1, 1.1, 0.35);
  crate(kit, -4.5, 6.15, 0.7, -0.25, 1.1);
  crate(kit, -3.2, 6.9, 0.8, 0.6);
}

const DECK = (r) => (r() < 0.2 ? 'sp_deck_b' : r() < 0.18 ? 'sp_deck_c' : 'sp_deck');

// ---------------------------------------------------------------- a Spire deck

const SPIRE_THEME = {
  background: '#0c0608', fog: '#1a0a0e', fogDensity: 0.024,
  hemi: ['#b07078', '#1a0a0c', 0.85], key: ['#f4f2ff', 1.05, [-6, 12, 10]],
  rimParty: ['#ffd2a0', 22], rimEnemy: ['#ff3a4a', 26], fill: ['#c8d4ff', 0.42],
};

function spire(kit) {
  const r = kit.rng;
  const { WALL_Z, WALL_H } = kit;
  kit.floor((x, z) => (z === WALL_Z && x >= -9 && x < 9 ? 'sp_hazard' : DECK(r)),
    { sp_deck: { metalness: 0.35, roughness: 0.55 }, sp_deck_b: { metalness: 0.35, roughness: 0.55 }, sp_deck_c: { metalness: 0.35, roughness: 0.55 } });
  const wall = { sp_wall: { emissiveIntensity: 2.4 }, sp_wall_b: { emissiveIntensity: 2.4 } };
  kit.wallRun(['sp_wall', 'sp_wall', 'sp_wall_b', 'sp_wall', 'sp_wall', 'window_frame', 'sp_wall', 'sp_wall', 'sp_wall_b', 'sp_wall',
    'sp_wall', 'sp_wall', 'sp_wall_b', 'sp_wall', 'sp_wall', 'sp_wall', 'window_frame', 'sp_wall', 'sp_wall_b', 'sp_wall', 'sp_wall', 'sp_wall', 'sp_wall', 'sp_wall', 'sp_wall'], { opts: wall });
  kit.wallRun(['sp_wall'], { y: WALL_H, opts: wall });
  kit.space({ aimX: 2, aimY: 2.2 });
  screen(kit, -1.0);
  strobe(kit, -6.0);
  strobe(kit, 9.4, 2.5, 0);
  flood(kit, -4.0, -0.4, { r: 3.4 });
  flood(kit, 3.6, 0.6, { r: 3.0, color: '#fff2e4', k: 0.26 });
  floorPool(kit, -1.0, -4.4, 2.2, '#ffc04a', 0.22);
  kit.pointLight({ color: '#ffc04a', intensity: 10, distance: 7, decay: 1.6, position: [-1, 1.8, WALL_Z + 1.2] });
  kit.pointLight({ color: '#f4f0ff', intensity: 16, distance: 10, decay: 1.5, position: [-3.6, 3.0, 0.2] });
  barricade(kit, -10.4, -2.6, 2.8, 0.3);
  barricade(kit, 9.6, -3.6, 2.4, -0.2);
  crate(kit, -12.2, -4.6, 0.8, 0.2);
  crate(kit, -11.4, -4.9, 0.6, -0.3, 0);
  crate(kit, 12.0, -4.4, 0.75, 0.4);
  foreground(kit);
  return {
    dust: '#ffd0d0',
    emitters: [
      ['sp_ash', { position: [0, 3.0, 0], area: [24, 1, 10], rate: 8 }],
      ['dust', { position: [-3.6, 1.6, 0], area: [6, 2.4, 4], rate: 4, color: '#fff0f0' }],
    ],
  };
}

// ---------------------------------------------------------------- the Command Deck

const COMMAND_THEME = {
  background: '#06040a', fog: '#0e0812', fogDensity: 0.02,
  hemi: ['#8a7aa8', '#100a10', 0.8], key: ['#e8eeff', 1.1, [-6, 13, 10]],
  rimParty: ['#ffd2a0', 22], rimEnemy: ['#ffc04a', 22], fill: ['#c0d0ff', 0.4],
};

function command(kit) {
  const r = kit.rng;
  const { WALL_Z, WALL_H } = kit;
  kit.floor((x, z) => (z <= WALL_Z + 1 && x >= -8 && x < 8 ? 'sp_core' : 'sp_command'),
    { sp_command: { roughness: 0.3, metalness: 0.45 }, sp_core: { emissiveIntensity: 2.4, roughness: 0.4 } });
  // the great window: eight panes of Tethys between gold-framed black glass
  const glass = { sp_cmdwall: { emissiveIntensity: 2.0 } };
  kit.wallRun(['sp_cmdwall', 'sp_cmdwall', 'sp_cmdwall', 'sp_cmdwall', 'sp_cmdwall', 'sp_cmdwall', 'sp_cmdwall',
    'window_frame', 'window_frame', 'window_frame', 'window_frame', 'window_frame', 'window_frame', 'window_frame', 'window_frame',
    'sp_cmdwall', 'sp_cmdwall', 'sp_cmdwall', 'sp_cmdwall', 'sp_cmdwall', 'sp_cmdwall', 'sp_cmdwall'], { opts: glass });
  kit.wallRun(['sp_cmdwall'], { y: WALL_H, opts: glass });
  kit.space({ aimX: 0, aimY: 2.4 });
  kit.shaft([-3, 2.6, WALL_Z + 0.2], { color: '#ffd8b0', opacity: 0.1, lean: 0.3 });
  kit.shaft([3, 2.6, WALL_Z + 0.2], { color: '#ffd8b0', opacity: 0.1, lean: 0.2 });
  const screens = [screen(kit, -11.2), screen(kit, 10.6)];
  const gold = kit.pointLight({ color: '#ffc04a', intensity: 12, distance: 9, decay: 1.6, position: [-10.6, 2.0, WALL_Z + 1.4] });
  // the holo table behind her, Tethys turning in its light; her chair on its dais
  const steel = kit.plain('#24212a', 0.45, 0.55), goldM = kit.plain('#d0a238', 0.32, 0.75);
  const table = kit.add(new THREE.Mesh(kit.track(new THREE.CylinderGeometry(1.0, 0.7, 0.9, 20)), steel));
  table.position.set(1.4, 0.45, -4.2);
  const rim = kit.add(new THREE.Mesh(kit.track(new THREE.TorusGeometry(1.0, 0.03, 6, 36)), goldM));
  rim.position.set(1.4, 0.92, -4.2);
  rim.rotation.x = Math.PI / 2;
  const holoMat = kit.track(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd28a').multiplyScalar(1.6), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  const star = kit.add(new THREE.Mesh(kit.track(new THREE.SphereGeometry(0.12, 12, 8)), holoMat));
  star.position.set(1.4, 1.5, -4.2);
  const orbitMat = kit.track(new THREE.MeshBasicMaterial({ color: new THREE.Color('#45d4ff').multiplyScalar(0.9), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  const orbits = [0.36, 0.56, 0.76].map((rad) => {
    const o = kit.add(new THREE.Mesh(kit.track(new THREE.TorusGeometry(rad, 0.008, 4, 40)), orbitMat));
    o.position.set(1.4, 1.5, -4.2);
    o.rotation.x = Math.PI / 2 - 0.35;
    return o;
  });
  const holoGlow = kit.add(makeGlow('#45d4ff', 2.6, 0.45));
  holoGlow.position.set(1.4, 1.3, -4.0);
  const cyan = kit.pointLight({ color: '#45d4ff', intensity: 10, distance: 8, decay: 1.6, position: [1.4, 1.6, -3.4] });
  const chairDais = kit.add(new THREE.Mesh(kit.track(new THREE.CylinderGeometry(0.9, 1.0, 0.16, 8)), steel));
  chairDais.position.set(-8.6, 0.08, -4.4);
  kit.box([0.7, 1.9, 0.16], kit.plain('#3a2420', 0.55, 0.05), [-8.6, 0.16, -4.8]);
  kit.box([0.74, 0.06, 0.18], goldM, [-8.6, 2.06, -4.8]);
  kit.box([0.66, 0.16, 0.6], kit.plain('#3a2420', 0.55, 0.05), [-8.6, 0.5, -4.5]);
  const alert = strobe(kit, 7.2, 2.5, 12);
  floorPool(kit, -4.0, -0.6, 3.6, '#f4f0ff', 0.26);
  floorPool(kit, 3.6, 0.6, 3.0, '#fff2e4', 0.22);
  floorPool(kit, 1.4, -3.8, 2.2, '#45d4ff', 0.22);
  const white = kit.pointLight({ color: '#f4f0ff', intensity: 16, distance: 10, decay: 1.5, position: [-3.8, 3.0, 0.4] });
  foreground(kit);
  // state the reactions drive: `up` is the upload (cyan), `k` eases toward rest every frame
  const C = { up: 0, upRest: 0, k: 1, rest: 1, stutter: 0, cyan, gold, white, alert, screens, star, orbits, holoGlow, cyanBase: cyan.intensity, goldBase: gold.intensity, whiteBase: white.intensity };
  kit.command = C;
  kit.updaters.push((dt, t) => {
    C.k += (C.rest - C.k) * (1 - Math.exp(-2 * dt));
    C.up += (C.upRest - C.up) * (1 - Math.exp(-1.5 * dt));
    C.stutter = Math.max(0, C.stutter - dt * 0.5);
    C.cyan.intensity = C.cyanBase * C.k * (1 + C.up * 2.2) * (0.85 + 0.15 * Math.sin(t * 1.7));
    C.gold.intensity = C.goldBase * C.k * (1 - C.up * 0.35) * (C.stutter && Math.sin(t * 31) > 0.3 ? 0.3 : 1);
    C.white.intensity = C.whiteBase * C.k;
    for (const s of C.screens) {
      const flick = C.stutter && Math.sin(t * 27 + s.mesh.position.x) > 0.2 ? 0.25 : 1;
      s.glow.material.color.copy(s.glow.userData.baseColor).multiplyScalar(flick * C.k);
    }
    C.star.rotation.y = t * 0.2;
    C.orbits.forEach((o, i) => { o.rotation.z = t * (0.3 + i * 0.12); });
    C.holoGlow.material.color.copy(C.holoGlow.userData.baseColor).multiplyScalar(C.k * (1 + C.up * 1.5));
  });
  return {
    dust: '#e0e8ff',
    emitters: [
      ['dust', { position: [0, 1.8, -1], area: [24, 2.6, 10], rate: 6, color: '#e8ecff' }],
      ['sp_motes', { position: [1.4, 1.4, -4.2], area: [1.6, 0.8, 1.6], rate: 3 }],
      ['sp_ash', { position: [0, 3.0, 1], area: [24, 1, 8], rate: 4 }],
    ],
  };
}

/** The deck answers the fight: her upload starts at the overclock, the break guts the lights. */
function commandReact(kit, e) {
  const C = kit.command;
  if (!C) return;
  if (e.type === 'cue' && e.name === 'voss_overclock') {
    C.upRest = 1;
    C.up = 1.6;
    C.stutter = 2.4;
    if (C.alert.flicker) C.alert.flicker.speed = 4.6;
    kit.particles?.emit('data', [-4.2, 1.6, -0.8], { count: 60, spread: 1.6 });
    kit.particles?.emit('sp_motes', [-4.2, 1.8, -0.8], { count: 24, spread: 1.2 });
    kit.engine?.shake(0.2, 0.5);
  } else if (e.type === 'break') C.k = 0.3;
}

const SPIRE_TEX = ['sp_deck', 'sp_deck_b', 'sp_deck_c', 'sp_hazard', 'sp_wall', 'sp_wall_b', 'sp_cap', 'sp_barricade', 'sp_crate', 'sp_propaganda', 'window_frame', 'space_backdrop', 'stars_layer'];
const COMMAND_TEX = ['sp_command', 'sp_core', 'sp_cmdwall', 'sp_cap', 'sp_crate', 'sp_propaganda', 'window_frame', 'space_backdrop', 'stars_layer'];

export default {
  spire: { theme: SPIRE_THEME, build: spire, textures: SPIRE_TEX },
  spire_command: { theme: COMMAND_THEME, build: command, react: commandReact, textures: COMMAND_TEX },
};
