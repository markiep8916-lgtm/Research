import * as THREE from 'three';
import { Gfx } from '../gfx/gfx.js';
import { createKong } from '../gfx/models/kong.js';

const q = new URLSearchParams(location.search);
const gfx = new Gfx(document.getElementById('stage'), { shadowSize: 2048 });
gfx.applyTheme(q.get('theme') || 'jungle');
const floor = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 8), new THREE.MeshStandardMaterial({ color: 0x6a8f3a, roughness: 1 }));
floor.position.set(0, -0.5, 0); floor.receiveShadow = true; gfx.scene.add(floor);

const poses = [
  ['idle', { face: 1, vx: 0, vy: 0, ground: true, mode: 'move', attack: -1, throwing: -1, hurt: 0 }],
  ['run', { face: 1, vx: 7.4, vy: 0, ground: true, mode: 'move', attack: -1, throwing: -1, hurt: 0 }],
  ['runL', { face: -1, vx: -7.4, vy: 0, ground: true, mode: 'move', attack: -1, throwing: -1, hurt: 0 }],
  ['jump', { face: 1, vx: 4, vy: 12, ground: false, mode: 'move', attack: -1, throwing: -1, hurt: 0 }],
  ['fall', { face: 1, vx: 3, vy: -10, ground: false, mode: 'move', attack: -1, throwing: -1, hurt: 0 }],
  ['slap', { face: 1, vx: 0, vy: 0, ground: true, mode: 'move', attack: 0.35, throwing: -1, hurt: 0 }],
  ['pound0', { face: 1, vx: 0, vy: 0, ground: false, mode: 'pound', poundPhase: 0, attack: -1, throwing: -1, hurt: 0 }],
  ['pound1', { face: 1, vx: 0, vy: -30, ground: false, mode: 'pound', poundPhase: 1, attack: -1, throwing: -1, hurt: 0 }],
  ['roll', { face: 1, vx: 11, vy: 0, ground: true, mode: 'roll', attack: -1, throwing: -1, hurt: 0 }],
  ['wall', { face: 1, vx: 0, vy: -3, ground: false, mode: 'move', sliding: 1, attack: -1, throwing: -1, hurt: 0 }],
  ['climb', { face: 1, vx: 0, vy: 0, ground: false, mode: 'climb', climb: 1, attack: -1, throwing: -1, hurt: 0 }],
  ['hurt', { face: 1, vx: -3, vy: 5, ground: false, mode: 'move', attack: -1, throwing: -1, hurt: 1 }],
];
const only = q.get('only');
const list = only ? poses.filter(([n]) => only.split(',').includes(n)) : poses;
const spacing = +(q.get('spacing') || 2.7);
const kongs = list.map(([name, s], i) => {
  const k = createKong();
  k.root.position.set((i - (list.length - 1) / 2) * spacing, name === 'idle' || name === 'run' ? 0 : 0, 0);
  if (!s.ground && s.mode !== 'climb' && s.mode !== 'roll') k.root.position.y = 1.2;
  if (s.mode === 'climb') k.root.position.y = 0.4;
  gfx.scene.add(k.root);
  return { k, s };
});
const dist = +(q.get('dist') || 26);
gfx.camera.position.set(+(q.get('cx') || 0), +(q.get('cy') || 3.2), dist);
gfx.camera.lookAt(+(q.get('cx') || 0), +(q.get('ly') || 1.2), 0);
gfx.followShadow(+(q.get('cx') || 0), 2);
for (let i = 0; i < 90; i++) { for (const { k, s } of kongs) k.update({ ...s, attack: s.attack }, 1 / 60, i / 60); }
gfx.render();
window.__ready = true;
