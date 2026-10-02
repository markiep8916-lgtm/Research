// Collectibles, interactables and projectile models.
import * as THREE from 'three';
import { sphere, capsule, box, cone, cyl, torus, octa, mat, emissiveMat, part, group, glowSprite } from './common.js';
import { getTexture } from '../textures.js';
import { barrelGeometry } from './enemies.js';

export const ABILITY_STYLE = {
  roll: { color: 0xffb13a, name: 'Barrel Roll' },
  pound: { color: 0xff5a4a, name: 'Ground Pound' },
  grip: { color: 0x5aff9a, name: 'Gorilla Grip' },
  boom: { color: 0xffe14a, name: 'Banana Boomerang' },
};

export function bananaGeometry(scale = 1) {
  const g = new THREE.TorusGeometry(0.3 * scale, 0.085 * scale, 8, 18, Math.PI * 0.85);
  g.rotateZ(Math.PI * 0.575);
  return g;
}

let _bananaGeo;
export function createBanana() {
  _bananaGeo ||= bananaGeometry();
  const yellow = mat(0xffd51f, { roughness: 0.35, emissive: 0xb88600, emissiveIntensity: 0.45 });
  const tip = mat(0x4a3414, { roughness: 0.8 });
  const root = new THREE.Group();
  const spin = group(root, [0, 0.45, 0]);
  part(_bananaGeo, yellow, { parent: spin, cast: false });
  part(sphere(0.045, 6, 6), tip, { p: [-0.27, 0.19, 0], parent: spin, cast: false });
  part(sphere(0.045, 6, 6), tip, { p: [0.27, 0.19, 0], parent: spin, cast: false });
  const glow = glowSprite(0xffe27a, 1.1, 0.4, getTexture('glow')); glow.position.y = 0; spin.add(glow);
  return { root, update(t, ph = 0) { spin.rotation.y = t * 2.4 + ph; spin.position.y = 0.45 + Math.sin(t * 3 + ph) * 0.07; } };
}

export function createHeartFruit() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.34); shape.bezierCurveTo(-0.62, 0.1, -0.34, 0.5, 0, 0.22); shape.bezierCurveTo(0.34, 0.5, 0.62, 0.1, 0, -0.34);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.07, bevelSegments: 3 });
  g.center();
  const m = mat(0xff3b6b, { roughness: 0.25, emissive: 0xff1a4a, emissiveIntensity: 0.6 });
  const root = new THREE.Group();
  const spin = group(root, [0, 0.6, 0]);
  part(g, m, { parent: spin, cast: false, s: 1.15 });
  part(cone(0.07, 0.2, 5), mat(0x2f9a3a), { p: [0.02, 0.5, 0], r: [0, 0, 0.3], parent: spin, cast: false });
  const glow = glowSprite(0xff7a9a, 2.4, 0.55, getTexture('glow')); spin.add(glow);
  return { root, update(t) { spin.rotation.y = t * 2; spin.position.y = 0.6 + Math.sin(t * 2.6) * 0.1; glow.material.opacity = 0.45 + Math.sin(t * 4) * 0.12; } };
}

export function createRelic(ability) {
  const col = (ABILITY_STYLE[ability] || ABILITY_STYLE.roll).color;
  const gold = mat(0xf2c24a, { metalness: 0.7, roughness: 0.3, emissive: 0x6a4a00, emissiveIntensity: 0.4 });
  const gem = emissiveMat(col, 1.5, { roughness: 0.15 });
  const stone = mat(0x6a7078, { roughness: 0.9 });
  const root = new THREE.Group();
  part(cyl(0.7, 0.85, 0.5, 8), stone, { p: [0, 0.25, 0], parent: root, receive: true });
  part(cyl(0.5, 0.6, 0.18, 8), gold, { p: [0, 0.58, 0], parent: root });
  const spin = group(root, [0, 1.5, 0]);
  part(octa(0.38, 0), gem, { s: [1, 1.5, 1], parent: spin, cast: false });
  const ring = part(torus(0.62, 0.05, 8, 28), gold, { parent: spin, cast: false });
  const ring2 = part(torus(0.62, 0.05, 8, 28), gold, { r: [Math.PI / 2, 0, 0], parent: spin, cast: false });
  const glow = glowSprite(col, 5, 0.55, getTexture('glow')); glow.position.y = 1.5; root.add(glow);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 9), new THREE.MeshBasicMaterial({ map: getTexture('ray'), color: col, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.position.set(0, 5, -0.2); beam.rotation.z = Math.PI; root.add(beam);
  return {
    root, color: col,
    update(t) { spin.rotation.y = t * 1.6; ring.rotation.x = t * 1.2; ring2.rotation.z = t * 0.9; spin.position.y = 1.5 + Math.sin(t * 2) * 0.12; glow.material.opacity = 0.45 + Math.sin(t * 3) * 0.12; beam.material.opacity = 0.4 + Math.sin(t * 2.2) * 0.1; },
  };
}

export function createSaveBarrel() {
  const wood = mat(0x8a5428, { roughness: 0.85, map: getTexture('bark') }), iron = mat(0x4a4e56, { metalness: 0.6, roughness: 0.4 });
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffe14a, emissive: 0xffc010, emissiveIntensity: 0.15, roughness: 0.4 });
  const root = new THREE.Group();
  const g = group(root, [0, 0.62, 0]);
  const lathe = new THREE.LatheGeometry(Array.from({ length: 11 }, (_, i) => { const u = i / 10; return new THREE.Vector2(0.52 + Math.sin(u * Math.PI) * 0.12, (u - 0.5) * 1.2); }), 18);
  part(lathe, wood, { parent: g });
  for (const y of [-0.42, 0.42]) part(torus(0.58, 0.04, 6, 22), iron, { p: [0, y, 0], r: [Math.PI / 2, 0, 0], parent: g });
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.14 : 0.3, a = (i / 10) * Math.PI * 2 + Math.PI / 2; (i ? star.lineTo : star.moveTo).call(star, Math.cos(a) * r, Math.sin(a) * r); }
  star.closePath();
  const starMesh = part(new THREE.ExtrudeGeometry(star, { depth: 0.05, bevelEnabled: false }), starMat, { p: [0, 0.04, 0.62], parent: g, cast: false });
  const glow = glowSprite(0xffe14a, 3, 0, getTexture('glow')); glow.position.set(0, 0.1, 0.8); g.add(glow);
  return {
    root,
    update(t, active) { starMat.emissiveIntensity = active ? 1.3 + Math.sin(t * 5) * 0.4 : 0.15; glow.material.opacity = active ? 0.55 + Math.sin(t * 5) * 0.15 : 0; starMesh.rotation.z = active ? Math.sin(t * 2) * 0.15 : 0; },
  };
}

export function createSign() {
  const wood = mat(0xa8763a, { roughness: 0.9, map: getTexture('bark') }), board = mat(0xd8b070, { roughness: 0.8 });
  const root = new THREE.Group();
  part(box(0.14, 1.1, 0.14), wood, { p: [0, 0.55, 0], parent: root });
  const b = part(box(1.1, 0.7, 0.1), board, { p: [0, 1.15, 0.05], parent: root });
  part(box(0.8, 0.06, 0.02), mat(0x5a3a1a), { p: [0, 1.28, 0.11], parent: root, cast: false });
  part(box(0.8, 0.06, 0.02), mat(0x5a3a1a), { p: [0, 1.12, 0.11], parent: root, cast: false });
  part(box(0.5, 0.06, 0.02), mat(0x5a3a1a), { p: [-0.15, 0.96, 0.11], parent: root, cast: false });
  const hint = glowSprite(0xffffff, 0.9, 0, getTexture('glow')); hint.position.set(0, 1.9, 0.2); root.add(hint);
  return { root, update(t, near) { hint.material.opacity = near ? 0.5 + Math.sin(t * 6) * 0.25 : 0; b.rotation.z = Math.sin(t * 1.5) * 0.01; } };
}

export function createSwitch(color) {
  const stone = mat(0x555b66, { roughness: 0.8 });
  const gem = emissiveMat(color, 1.4, { roughness: 0.15 });
  const root = new THREE.Group();
  part(cyl(0.34, 0.42, 0.32, 8), stone, { p: [0, 0.16, 0], parent: root });
  const c = group(root, [0, 0.82, 0]);
  part(octa(0.3, 0), gem, { s: [1, 1.5, 1], parent: c, cast: false });
  const halo = glowSprite(color, 2.4, 0.5, getTexture('glow')); c.add(halo);
  const ring = part(torus(0.5, 0.025, 6, 24), gem, { parent: c, cast: false });
  return { root, update(t, hit) { c.rotation.y = t * (hit ? 6 : 1.4); c.position.y = 0.82 + Math.sin(t * 2.4) * 0.05; ring.rotation.x = t * 1.5; halo.material.opacity = hit ? 0.9 : 0.4 + Math.sin(t * 3) * 0.1; gem.emissiveIntensity = hit ? 3 : 1.4; } };
}

export function createBoomerang() {
  _boom ||= bananaGeometry(1.6);
  const yellow = mat(0xffd51f, { roughness: 0.3, emissive: 0xd09a00, emissiveIntensity: 0.7 });
  const root = new THREE.Group();
  const spin = group(root);
  part(_boom, yellow, { parent: spin, cast: false });
  const glow = glowSprite(0xffe27a, 1.8, 0.5, getTexture('glow')); spin.add(glow);
  return { root, update(t) { spin.rotation.z = t * 18; } };
}
let _boom;

export function createFireball(color = 0xff7a2a) {
  const root = new THREE.Group();
  part(sphere(0.2, 10, 8), emissiveMat(0xfff0c0, 2), { parent: root, cast: false });
  const glow = glowSprite(color, 1.6, 0.8, getTexture('glow')); root.add(glow);
  return { root, update(t) { glow.scale.setScalar(1.5 + Math.sin(t * 30) * 0.2); } };
}

export function createRock(r = 0.5) {
  const m = mat(0x7a7488, { roughness: 1, flatShading: true });
  const root = new THREE.Group();
  const g = new THREE.IcosahedronGeometry(r, 0);
  const mesh = part(g, m, { parent: root });
  return { root, update(t) { mesh.rotation.set(t * 3, t * 2, t); } };
}

export function createShock(color = 0xffc86a) {
  const root = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const g = part(cone(0.5, 1, 4), m, { p: [0, 0.5, 0], parent: root, cast: false, s: [0.8, 1, 1.4] });
  return { root, update(t) { g.scale.y = 0.85 + Math.sin(t * 25) * 0.15; } };
}

export function createBarrelProjectile() {
  const wood = mat(0x9a6230, { roughness: 0.85 }), iron = mat(0x4a4e56, { metalness: 0.7, roughness: 0.4 });
  const root = new THREE.Group();
  const spin = group(root, [0, 0.4, 0]);
  part(barrelGeometry(), wood, { parent: spin });
  for (const z of [-0.26, 0.26]) part(torus(0.46, 0.04, 6, 20), iron, { p: [0, 0, z], parent: spin });
  return { root, spin };
}

export function createGoldenBanana() {
  const gold = mat(0xffd21f, { roughness: 0.2, metalness: 0.6, emissive: 0xffa800, emissiveIntensity: 0.8 });
  const root = new THREE.Group();
  const spin = group(root, [0, 2.2, 0]);
  part(bananaGeometry(3.2), gold, { parent: spin, cast: false, p: [0, -0.3, 0] });
  const halo = glowSprite(0xffe27a, 9, 0.7, getTexture('glow')); spin.add(halo);
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(6, 14), new THREE.MeshBasicMaterial({ map: getTexture('ray'), color: 0xfff0a0, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  rays.position.set(0, 6.5, -0.4); rays.rotation.z = Math.PI; root.add(rays);
  part(cyl(0.9, 1.1, 0.5, 10), mat(0x6a7078, { roughness: 0.9 }), { p: [0, 0.25, 0], parent: root, receive: true });
  return { root, update(t) { spin.rotation.y = t * 1.2; spin.position.y = 2.2 + Math.sin(t * 1.8) * 0.2; halo.material.opacity = 0.6 + Math.sin(t * 3) * 0.12; rays.material.opacity = 0.35 + Math.sin(t * 2) * 0.1; } };
}
