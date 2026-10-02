// Shared helpers for building procedural models out of primitives.
import * as THREE from 'three';

const geoCache = new Map();
export function geo(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}
export const sphere = (r, ws = 20, hs = 14) => geo(`s${r}_${ws}_${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
export const capsule = (r, len, cs = 6, rs = 14) => geo(`c${r}_${len}_${cs}_${rs}`, () => new THREE.CapsuleGeometry(r, len, cs, rs));
export const box = (w, h, d) => geo(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cyl = (rt, rb, h, seg = 16) => geo(`y${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
export const cone = (r, h, seg = 8) => geo(`n${r}_${h}_${seg}`, () => new THREE.ConeGeometry(r, h, seg));
export const torus = (r, t, rs = 8, ts = 24, arc = Math.PI * 2) => geo(`t${r}_${t}_${rs}_${ts}_${arc}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc));
export const octa = (r, d = 0) => geo(`o${r}_${d}`, () => new THREE.OctahedronGeometry(r, d));
export const ico = (r, d = 1) => geo(`i${r}_${d}`, () => new THREE.IcosahedronGeometry(r, d));

export function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
}
export function emissiveMat(color, intensity = 1.2, o = {}) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5, ...o });
}

/** Mesh with optional transform. `s` may be a number or [x,y,z]. */
export function part(geometry, material, { p = [0, 0, 0], r = [0, 0, 0], s = 1, cast = true, receive = false, parent } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(p[0], p[1], p[2]);
  m.rotation.set(r[0], r[1], r[2]);
  if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (parent) parent.add(m);
  return m;
}

export function group(parent, p = [0, 0, 0], r = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(p[0], p[1], p[2]);
  g.rotation.set(r[0], r[1], r[2]);
  if (parent) parent.add(g);
  return g;
}

export function glowSprite(color, size, opacity, texture) {
  const m = new THREE.SpriteMaterial({ map: texture, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  return s;
}

/** Dispose of everything below an object (geometries are shared by the cache and kept). */
export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose && m.dispose());
    if (o.isInstancedMesh) o.dispose();
  });
}
