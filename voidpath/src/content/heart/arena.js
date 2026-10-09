// heart: battle arena (browser, TECH_PLAN 7.5). Built with the ArenaKit from the Heart's own textures;
// extra lights come from the kit's pool (4 point lights on high, fewer below).
//
//   heart   a ring gallery of the cathedral: navy flagstones inlaid with gold, curving away at the back
//           to a glowing lip over the shaft; across the shaft the column of falling gold light with
//           its turning gilt rings, pods hanging below like stars, the far side of the gallery and the
//           cathedral's piers in the haze. react: cue 'cradle_up' / 'cradle_down' (a Choir Guardian's
//           rings: the column swells, then settles), break (the column dips for a moment)
// The final battle's arena is the warden folder's `heart_crown` (C11).

import * as THREE from 'three';
import { makeGlow, makeLightShaft } from '../../core/vfx.js';
import { textureSet } from '../../art/tiles.js';

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _sc = new THREE.Vector3();
/** A placement matrix: position, Euler [rx, ry, rz], scale [x, y, z]. */
const placed = (pos, rot, scale) => new THREE.Matrix4().compose(_p.set(...pos), _q.setFromEuler(_e.set(...rot)), _sc.set(...scale));

/** Unlit additive material, tracked by the kit. */
function glowMat(kit, color, k = 1, opacity = 1, map = null) {
  return kit.track(new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(k), map, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
  }));
}

const THEME = {
  background: '#070a1c', fog: '#0d1230', fogDensity: 0.019,
  hemi: ['#ffd99a', '#0c1030', 0.85], key: ['#ffe7bf', 1.1, [-6, 12, 10]],
  rimParty: ['#ffb46a', 22], rimEnemy: ['#ffd27a', 24], fill: ['#9fb8ff', 0.45],
};

// the gallery's back edge curves away toward the sides (a ring seen from inside its walkway)
const backEdge = (x) => -4.6 + 0.028 * x * x;
const inside = (x, z) => z >= backEdge(x + 0.5) && z < 10 && Math.abs(x + 0.5) < 14.5;

const COLUMN = [0.5, 0, -15];

function heart(kit) {
  const r = kit.rng;
  // the deep: pods like stars on a navy plane far below, and stars hung at every depth between
  const deepSet = textureSet('bd_choir', { repeat: [2, 1] });
  for (const t of [deepSet.map, deepSet.normalMap, deepSet.emissiveMap]) if (t) kit.track(t);
  const deepMat = kit.track(new THREE.MeshBasicMaterial({ map: deepSet.map, fog: true, color: '#d8d0e8' }));
  const deep = kit.add(new THREE.Mesh(kit.plane(170, 90), deepMat));
  deep.rotation.x = -Math.PI / 2;
  deep.position.set(0, -16, -24);
  const starGeo = kit.track(new THREE.BufferGeometry());
  const pos = [], tints = [];
  const c = new THREE.Color();
  for (let i = 0; i < 900; i++) {
    const x = (r() - 0.5) * 60, z = -6 - r() * 40, y = -2 - r() * 14;
    if (z > backEdge(x) - 1 && y > -4) continue;
    pos.push(x, y, z);
    c.set(r() < 0.12 ? '#cfe2ff' : '#ffd890').multiplyScalar(0.5 + r() * 0.7);
    tints.push(c.r, c.g, c.b);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  starGeo.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
  const dot = makeGlow('#ffffff', 1, 1).material.map;
  const starMat = kit.track(new THREE.PointsMaterial({ size: 0.45, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  kit.add(new THREE.Points(starGeo, starMat));

  // the gallery floor: flagstones with a gold-inlaid band near the lip, a glowing lip at the back edge
  kit.floor((x, z) => {
    if (!inside(x, z)) return null;
    const lip = z < backEdge(x + 0.5) + 1.2;
    return lip || r() < 0.25 ? 'hr_floor_b' : 'hr_floor';
  }, { hr_floor: { emissiveIntensity: 2.1 }, hr_floor_b: { emissiveIntensity: 2.1 } });
  const edge = kit.mat('hr_edge', { emissiveIntensity: 2.2 });
  const under = kit.mat('hr_under', { emissiveIntensity: 1.8 });
  const gilt = kit.mat('hr_gilt', { emissiveIntensity: 2, roughness: 0.3, metalness: 0.65 });
  const lipMat = glowMat(kit, '#ffc860', 1.2, 0.9);
  const rims = [], steps = [], lips = [], posts = [];
  for (let x = -15; x < 15; x++) {
    const z0 = backEdge(x + 0.5);
    if (Math.abs(x + 0.5) >= 14.5) continue;
    rims.push(placed([x + 0.5, -0.36, z0 - 0.02], [0, 0, 0], [1.02, 0.72, 0.06]));
    steps.push(placed([x + 0.5, -1.5 - (x % 3) * 0.3, z0 + 0.6], [0, 0, 0], [1, 1.6 + (x % 2) * 0.6, 1.2]));
    lips.push(placed([x + 0.5, 0.02, z0 + 0.04], [0, 0, 0], [1.02, 0.04, 0.06]));
    if (x % 2 === 0) posts.push(placed([x + 0.5, 0.3, z0 + 0.15], [0, 0, 0], [0.08, 0.6, 0.08]));
  }
  const box = kit.track(new THREE.BoxGeometry(1, 1, 1));
  kit.instanced(box, [[edge, rims]], { receive: true });
  kit.instanced(box, [[under, steps]], { receive: true });
  kit.instanced(box, [[lipMat, lips]], { receive: false });
  kit.instanced(box, [[gilt, posts]], { receive: true, cast: true });

  // the column of falling light across the shaft: two shells of streaks, a volume, three gilt rings
  const colSets = [];
  const col = new THREE.Group();
  col.position.set(...COLUMN);
  kit.add(col);
  for (const [rad, k, op] of [[1.0, 1.5, 1], [2.0, 0.8, 0.6]]) {
    const set = textureSet('hr_column', { repeat: [3, 6] });
    for (const t of [set.map, set.normalMap, set.emissiveMap]) if (t) kit.track(t);
    colSets.push(set);
    const m = new THREE.Mesh(kit.track(new THREE.CylinderGeometry(rad, rad, 46, 24, 1, true)), glowMat(kit, '#ffc860', k, op, set.map));
    m.position.y = 4;
    col.add(m);
  }
  const beam = makeLightShaft({ width: 3.6, height: 46, color: '#ffcf70', opacity: 0.18, spread: 1.1, dust: 1.4, floorY: -18, floorFade: 6 });
  kit.track(beam.material);
  kit.track(beam.geometry);
  beam.position.y = 27;
  col.add(beam);
  const hoops = [[4.2, -1.0, 0.18], [6.0, 3.0, -0.16], [5.0, -6.0, 0.1]].map(([rad, y, tilt], i) => {
    const h = new THREE.Group();
    h.position.y = y;
    h.rotation.set(tilt, 0, tilt * 0.6);
    const band = new THREE.Mesh(kit.track(new THREE.TorusGeometry(rad, 0.16, 6, 72)), gilt);
    band.rotation.x = Math.PI / 2;
    const line = new THREE.Mesh(kit.track(new THREE.TorusGeometry(rad - 0.18, 0.04, 4, 72)), glowMat(kit, '#ffe2a0', 1.6));
    line.rotation.x = Math.PI / 2;
    h.add(band, line);
    col.add(h);
    return { h, speed: (i % 2 ? -1 : 1) * (0.08 + i * 0.03), tilt };
  });
  const core = kit.add(makeGlow('#ffc860', 9, 0.55, { pull: 0.1 }));
  core.position.set(COLUMN[0], 2.5, COLUMN[2] + 2);

  // the far side of the gallery across the shaft: a curved gilt rim and its lip of light
  const far = new THREE.Mesh(kit.track(new THREE.TorusGeometry(19, 0.5, 6, 64, Math.PI * 0.62)), edge);
  far.rotation.set(Math.PI / 2, 0, Math.PI * 1.19);
  far.position.set(COLUMN[0], -0.4, COLUMN[2] - 1);
  kit.add(far);
  const farLip = new THREE.Mesh(kit.track(new THREE.TorusGeometry(18.4, 0.06, 4, 64, Math.PI * 0.62)), glowMat(kit, '#ffc860', 1.2));
  farLip.rotation.copy(far.rotation);
  farLip.position.set(COLUMN[0], 0.1, COLUMN[2] - 1);
  kit.add(farLip);

  // the cathedral's piers in the haze, gilt collars, a pennant
  for (const [x, z, s] of [[-14, -11, 1.3], [15, -12, 1.2], [-6, -27, 1.6], [10, -30, 1.5]]) {
    kit.box([1.6 * s, 50, 1.6 * s], [under, under, under, under, under, under], [x, -20, z], 0.4);
    for (let y = -8; y < 18; y += 6) kit.box([2.1 * s, 0.3, 2.1 * s], gilt, [x, y, z], 0.4);
  }
  const banner = kit.mat('hr_banner', { emissiveIntensity: 1.6 });
  banner.side = THREE.DoubleSide;
  for (const [x, z] of [[-12.2, -10.2], [13.2, -11.2]]) {
    const m = kit.add(new THREE.Mesh(kit.plane(1.1, 4.4), banner));
    m.position.set(x, 4.5, z);
  }

  // foreground: a gilt balustrade post and a hanging pod, blurred at the frame's near edge
  const pod = kit.mat('hr_pod', { emissiveIntensity: 2.4 });
  for (const [x, y, z] of [[-11.5, 3.4, 8.6], [12.6, 4.2, 8.0]]) {
    kit.box([0.6, 1.1, 0.5], [gilt, gilt, pod, gilt, gilt, gilt], [x, y, z]);
    kit.box([0.04, 6, 0.04], gilt, [x, y + 3.4, z]);
  }
  kit.box([0.22, 1.4, 0.22], gilt, [-13.6, 0, 7.4]);
  kit.box([0.22, 1.4, 0.22], gilt, [14.2, 0, 6.6]);

  // lights: the column's gold across the shaft, warm amber on the enemy side, dawn blue on the party
  const colLight = kit.pointLight({ color: '#ffc860', intensity: 22, distance: 22, decay: 1.3, position: [COLUMN[0], 3, COLUMN[2] + 6] });
  kit.pointLight({ color: '#ff9a3c', intensity: 12, distance: 10, decay: 1.6, position: [-7, 1.6, 2] });
  kit.pointLight({ color: '#9fc8ff', intensity: 10, distance: 10, decay: 1.6, position: [7, 2.4, 3] });
  kit.pointLight({ color: '#ffd27a', intensity: 10, distance: 9, decay: 1.6, position: [0, 0.6, -3.5] });

  const S = { k: 1, rest: 1 };
  kit.heart = S;
  kit.updaters.push((dt, t) => {
    S.k += (S.rest - S.k) * (1 - Math.exp(-2.2 * dt));
    for (const s of colSets) s.map.offset.y = (t * 0.2) % 1;
    for (const h of hoops) {
      h.h.rotation.y = t * h.speed;
      h.h.rotation.x = h.tilt + Math.sin(t * 0.2 + h.speed * 9) * 0.05;
    }
    const pulse = 0.9 + 0.1 * Math.sin(t * 1.1);
    colLight.intensity = 22 * S.k * pulse;
    core.material.color.set('#ffc860').multiplyScalar(0.55 * S.k * pulse);
    deepSet.map.offset.set(t * 0.002, -t * 0.003);
  });
  return {
    dust: '#ffd890',
    emitters: [
      ['hr_motes', { position: [0, 1.5, 0], area: [26, 3, 12], rate: 6 }],
      ['hr_fall', { position: [COLUMN[0], 8, COLUMN[2] + 1.5], area: [2, 0.4, 2], rate: 4 }],
      ['hr_motes', { position: [0, -0.4, -4], area: [22, 0.6, 1.2], rate: 3 }],
    ],
  };
}

/** The gallery answers the fight: the column swells with a guardian's rings, dips at a Break. */
function react(kit, e) {
  const S = kit.heart;
  if (!S) return;
  if (e.type === 'cue' && e.name === 'cradle_up') {
    S.k = 1.8;
    kit.particles?.emit('hr_hymn', [COLUMN[0], 2, COLUMN[2] + 3], { count: 20, spread: 2 });
  } else if (e.type === 'cue' && e.name === 'cradle_down') {
    S.k = 0.5;
  } else if (e.type === 'break') {
    S.k = 0.6;
  }
}

const TEX = ['hr_floor', 'hr_floor_b', 'hr_edge', 'hr_under', 'hr_gilt', 'hr_column', 'hr_banner', 'hr_pod', 'bd_choir'];

export default {
  heart: { theme: THEME, build: heart, react, textures: TEX },
};
