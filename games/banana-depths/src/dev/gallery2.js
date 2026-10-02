import * as THREE from 'three';
import { Gfx } from '../gfx/gfx.js';
import { Particles } from '../gfx/particles.js';
import * as E from '../gfx/models/enemies.js';
import * as P from '../gfx/models/props.js';

const q = new URLSearchParams(location.search);
const gfx = new Gfx(document.getElementById('stage'), { shadowSize: 2048 });
gfx.applyTheme(q.get('theme') || 'jungle');
const floor = new THREE.Mesh(new THREE.BoxGeometry(80, 1, 8), new THREE.MeshStandardMaterial({ color: 0x6a8f3a, roughness: 1 }));
floor.position.set(0, -0.5, 0); floor.receiveShadow = true; gfx.scene.add(floor);
const st = (o = {}) => ({ face: 1, vx: 0, vy: 0, hurt: 0, dead: 0, charge: 0, ground: true, ...o });
const set = q.get('set') || 'enemies';
const items = set === 'enemies' ? [
  ['snapjaw', E.createSnapjaw(), st({ vx: 1.5 })],
  ['thornbug', E.createThornbug(), st({ vx: 1.5 })],
  ['bat-fly', E.createBat(), st({})],
  ['bat-hang', E.createBat(), st({ hang: true })],
  ['tiki', E.createTiki(), st({ charge: 0.4 })],
  ['magma', E.createMagma(), st({})],
  ['spider', E.createSpider(), st({ thread: 3 })],
  ['wisp', E.createWisp(), st({})],
  ['barrel', E.createBarrel(), st({ vx: 3 })],
  ['cannon', E.createCannon(1), st({})],
] : [
  ['banana', P.createBanana(), 0],
  ['heart', P.createHeartFruit(), 0],
  ['relic-roll', P.createRelic('roll'), 0],
  ['relic-grip', P.createRelic('grip'), 0],
  ['save', P.createSaveBarrel(), true],
  ['sign', P.createSign(), true],
  ['switchA', P.createSwitch(0x35e6ff), false],
  ['boom', P.createBoomerang(), 0],
  ['fire', P.createFireball(), 0],
  ['rock', P.createRock(), 0],
];
const spacing = +(q.get('spacing') || 3.2);
items.forEach(([name, m, s], i) => {
  m.root.position.set((i - (items.length - 1) / 2) * spacing, name === 'boom' || name === 'fire' || name === 'rock' ? 1.5 : 0, 0);
  gfx.scene.add(m.root);
});
const cx = +(q.get('cx') || 0);
gfx.camera.position.set(cx, +(q.get('cy') || 3.4), +(q.get('dist') || 30));
gfx.camera.lookAt(cx, +(q.get('ly') || 1.4), 0);
gfx.followShadow(cx, 2);
for (let i = 0; i < 90; i++) items.forEach(([name, m, s]) => { if (set === 'enemies') m.update(s, 1 / 60, i / 60 + 3); else m.update(i / 60 + 1, s); });
gfx.render();
window.__ready = true;
