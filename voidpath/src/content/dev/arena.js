// dev battle arena (S4): 'dev_lab', a test bay that exercises the ArenaKit (pooled lights, the spare
// directional, emitters) and react(): its core light flares on cue 'dev_flare', flashes white on a
// transform, dims on a break and spills frost when a foe submerges.

import * as THREE from 'three';
import { makeGlow } from '../../core/vfx.js';

const theme = {
  background: '#06080e', fog: '#0c1220', fogDensity: 0.03,
  hemi: ['#4c5a7e', '#0a0c14', 0.8], key: ['#dfe8ff', 1.25, [-7, 12, 10]],
  rimParty: ['#ffb25a', 24], rimEnemy: ['#ff5ad0', 24], fill: ['#a8c0ff', 0.35],
};

function build(kit) {
  const r = kit.rng;
  const { WALL_Z, WALL_H } = kit;
  kit.floor((x, z) => {
    if (z === WALL_Z) return 'floor_hazard';
    if ((x === -5 || x === -4) && z > -4 && z < 3) return 'floor_grate';
    return r() < 0.3 ? 'floor_plate_worn' : 'floor_plate';
  }, { floor_grate: { emissiveIntensity: 2 } });
  kit.wallRun(['wall_panel', 'wall_panel_screen', 'wall_pipes', 'wall_panel_vent'], { opts: { wall_panel_screen: { emissiveIntensity: 2.2 } } });
  kit.wallRun(['wall_pipes'], { y: WALL_H });
  for (const x of [-9, 6]) kit.consoleBox(x, WALL_Z + 0.4);
  // the test core: a pillar of light behind the enemy line
  const coreMat = kit.track(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.9, 1.6) }));
  const pillar = kit.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5, 12, 1, true), coreMat));
  pillar.position.set(-6.5, 2.5, -4.2);
  const glow = kit.add(makeGlow('#ff7ae0', 3.2, 0.9));
  glow.position.set(-6.5, 2.2, -3.8);
  const core = kit.pointLight({ color: '#ff6ad8', intensity: 30, distance: 12, decay: 1.5, position: [-6, 2.2, -3] });
  kit.lamp([2, 2.62, WALL_Z], '#ffbf4d', { light: 16, distance: 9 });
  kit.dirLight({ color: '#9cc4ff', intensity: 0.5, position: [4, 8, -12] });
  kit.foreground();
  kit.emitter('holo', { position: [-6.5, 1.5, -3.8], area: [0.8, 2, 0.8], rate: 8 });
  const lab = { core, coreMat, base: core.intensity, k: 1, rest: 1 };
  kit.lab = lab;
  // the core eases back toward its resting brightness after every reaction
  kit.updaters.push((dt, t) => {
    lab.k += (lab.rest - lab.k) * (1 - Math.exp(-3 * dt));
    const pulse = 0.85 + 0.15 * Math.sin(t * 1.8);
    lab.core.intensity = lab.base * lab.k * pulse;
    glow.material.color.copy(glow.userData.baseColor).multiplyScalar(lab.k * pulse);
    lab.coreMat.color.setRGB(1.4 * lab.k, 0.9 * lab.k, 1.6 * lab.k);
  });
  return { dust: '#e0d0ff' };
}

/** Arena reactions: cue 'dev_flare' flares the core, a transform flashes it, a break dims it. */
function react(kit, e) {
  const lab = kit.lab;
  if (!lab) return;
  if (e.type === 'cue' && e.name === 'dev_flare') {
    lab.rest = 1;
    lab.k = 3;
    kit.particles?.emit('photon', [-6.5, 2.5, -3.8], { count: 40 });
  } else if (e.type === 'transform') {
    lab.rest = 1;
    lab.k = 4;
  } else if (e.type === 'break') lab.rest = 0.4;
  else if (e.type === 'untargetable' && e.on && e.style === 'submerge') kit.particles?.emit('frost', [-3, 0.4, 0], { count: 40 });
}

export default { dev_lab: { theme, build, react, textures: ['floor_plate', 'floor_plate_worn', 'floor_hazard', 'floor_grate', 'wall_panel', 'wall_panel_screen', 'wall_pipes', 'wall_panel_vent', 'console_top', 'console_front', 'crate_side', 'crate_top', 'ceiling_lamp'] } };
