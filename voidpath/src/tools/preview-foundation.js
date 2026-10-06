// Foundation smoke preview: painter -> normal map -> lit sprite plane in a three.js scene.
import * as THREE from 'three';
import { Painter, makeNormalMap, toTexture, ramp } from '../art/painter.js';
import { RAMPS, OUTLINE } from '../art/palette.js';

const p = new Painter(32, 48);
const steel = RAMPS.steel;
p.ellipse(16, 14, 7, 8, RAMPS.skinLight[3]);
p.rect(10, 22, 12, 16, RAMPS.navy[3]);
p.rect(11, 38, 4, 8, steel[3]);
p.rect(17, 38, 4, 8, steel[3]);
p.rect(11, 12, 10, 2, '#ffbf4d');
p.rimShade();
p.outline(OUTLINE);
const normal = makeNormalMap(p);

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(innerWidth, innerHeight, false);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a0f1c');
const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
cam.position.set(0, 2, 8); cam.lookAt(0, 0.8, 0);
const mat = new THREE.MeshStandardMaterial({ map: toTexture(p), normalMap: toTexture(normal, { color: false }), alphaTest: 0.5, side: THREE.DoubleSide });
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.5), mat);
mesh.position.y = 0.75; scene.add(mesh);
const l1 = new THREE.PointLight('#ff8a3a', 6, 6); l1.position.set(-1.2, 1.2, 0.6); scene.add(l1);
const l2 = new THREE.PointLight('#3ad8ff', 6, 6); l2.position.set(1.2, 1.0, 0.6); scene.add(l2);
scene.add(new THREE.AmbientLight('#334', 1));
renderer.render(scene, cam);
document.getElementById('vp-boot').classList.add('vp-hide');
const img = new Image(); img.src = p.toDataURL(6); img.style.cssText = 'position:absolute;left:16px;top:16px;image-rendering:pixelated';
document.getElementById('ui-root').appendChild(img);
window.__PREVIEW = { ready: true, ramp: ramp('#3a5ca6') };
