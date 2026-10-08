// Static geometry helpers for the diorama: a quad batcher that merges every face sharing a
// material into one BufferGeometry (one draw call per material), a material cache over
// art/tiles.js, and a few procedural meshes (texture-wrapped cylinders).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeMaterial } from '../art/tiles.js';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _n = new THREE.Vector3();

/** Collects quads per material and builds merged meshes. */
export class Batch {
  constructor() {
    this.buckets = new Map();
  }

  _bucket(mat) {
    let b = this.buckets.get(mat);
    if (!b) {
      b = { mat, pos: [], nrm: [], uv: [], idx: [], n: 0, extra: [] };
      this.buckets.set(mat, b);
    }
    return b;
  }

  /** Merge an indexed geometry (position/normal/uv) transformed by `matrix` into the batch. */
  geometry(mat, geo, matrix) {
    const g = geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    this._bucket(mat).extra.push(g);
  }

  /**
   * Quad a-b-c-d counter-clockwise seen from its front (a = bottom-left, b = bottom-right,
   * c = top-right, d = top-left). uv = [u0, v0, u1, v1]; rot turns the texture in 90 degree steps.
   */
  quad(mat, a, b, c, d, uv = null, rot = 0) {
    const B = this._bucket(mat);
    _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    _b.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
    _n.crossVectors(_a, _b).normalize();
    const u0 = uv ? uv[0] : 0, v0 = uv ? uv[1] : 0, u1 = uv ? uv[2] : 1, v1 = uv ? uv[3] : 1;
    const base = [u0, v0, u1, v0, u1, v1, u0, v1];
    const corners = [a, b, c, d];
    for (let i = 0; i < 4; i++) {
      const p = corners[i];
      B.pos.push(p[0], p[1], p[2]);
      B.nrm.push(_n.x, _n.y, _n.z);
      const k = ((i + rot) % 4) * 2;
      B.uv.push(base[k], base[k + 1]);
    }
    const o = B.n;
    B.idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    B.n += 4;
  }

  /** Face in the plane z = const, facing +z (dir 1) or -z (dir -1). */
  faceZ(mat, x0, x1, y0, y1, z, dir = 1, uv = null) {
    if (dir > 0) this.quad(mat, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], uv);
    else this.quad(mat, [x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z], uv);
  }

  /** Face in the plane x = const, facing +x (dir 1) or -x (dir -1). u runs left to right as seen. */
  faceX(mat, z0, z1, y0, y1, x, dir = 1, uv = null) {
    if (dir > 0) this.quad(mat, [x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1], uv);
    else this.quad(mat, [x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], uv);
  }

  /** Horizontal face at height y facing up (texture top = north), or down (dir -1). */
  faceY(mat, x0, x1, z0, z1, y, uv = null, rot = 0, dir = 1) {
    if (dir > 0) this.quad(mat, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], uv, rot);
    else this.quad(mat, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], uv, rot);
  }

  /**
   * Box without a bottom, centred at (cx, cz) on y0..y1, turned by rotY around its centre.
   * mats: { front (+z), back, left (-x), right (+x), top } materials (missing faces are skipped)
   * uvs: optional per-face uv rects (same keys).
   */
  box(mats, cx, cz, w, d, y0, y1, rotY = 0, uvs = {}) {
    const hw = w / 2, hd = d / 2;
    const cs = Math.cos(rotY), sn = Math.sin(rotY);
    const P = (lx, y, lz) => [cx + lx * cs + lz * sn, y, cz - lx * sn + lz * cs];
    const f = (key, a, b, c, dd) => { if (mats[key]) this.quad(mats[key], a, b, c, dd, uvs[key] || null); };
    f('front', P(-hw, y0, hd), P(hw, y0, hd), P(hw, y1, hd), P(-hw, y1, hd));
    f('back', P(hw, y0, -hd), P(-hw, y0, -hd), P(-hw, y1, -hd), P(hw, y1, -hd));
    f('right', P(hw, y0, hd), P(hw, y0, -hd), P(hw, y1, -hd), P(hw, y1, hd));
    f('left', P(-hw, y0, -hd), P(-hw, y0, hd), P(-hw, y1, hd), P(-hw, y1, -hd));
    f('top', P(-hw, y1, hd), P(hw, y1, hd), P(hw, y1, -hd), P(-hw, y1, -hd));
  }

  /**
   * Build one mesh per material into `parent`. Shadow flags come from material.userData
   * (cast / receive, plus depthMat: a custom depth material for alpha-cut shadows).
   */
  build(parent) {
    const meshes = [];
    for (const B of this.buckets.values()) {
      if (!B.n && !B.extra.length) continue;
      let g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
      g.setIndex(B.idx);
      if (B.extra.length) {
        const parts = B.n ? [g, ...B.extra] : B.extra;
        const merged = mergeGeometries(parts.map((p) => {
          for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') p.deleteAttribute(k);
          return p.index ? p : p.setIndex([...Array(p.attributes.position.count).keys()]);
        }));
        for (const p of parts) p.dispose();
        g = merged;
      }
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, B.mat);
      m.castShadow = B.mat.userData.cast !== false;
      m.receiveShadow = B.mat.userData.receive !== false;
      if (B.mat.userData.depthMat) m.customDepthMaterial = B.mat.userData.depthMat;
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      parent.add(m);
      meshes.push(m);
    }
    this.buckets.clear();
    return meshes;
  }
}

/**
 * Material cache over tiles.makeMaterial. Animated textures register their texture set (with a
 * frame phase) so World.update can advance them.
 */
export class Materials {
  constructor() {
    this.cache = new Map();
    this.animated = [];   // { set, phase }
  }

  tile(name, { variant = 0, emissive = 2.0, roughness = 0.74, metalness = 0.22, cast = true, receive = true,
    transparent = false, alphaTest, side, depthWrite } = {}) {
    const key = `${name}|${variant}|${emissive}|${roughness}|${metalness}|${cast}|${transparent}|${alphaTest}|${side}|${depthWrite}`;
    let m = this.cache.get(key);
    if (m) return m;
    const opts = { repeat: [1, 1], emissiveIntensity: emissive, roughness, metalness, transparent };
    if (alphaTest !== undefined) opts.alphaTest = alphaTest;
    if (side !== undefined) opts.side = side;
    m = makeMaterial(name, opts);
    if (depthWrite !== undefined) m.depthWrite = depthWrite;
    m.userData.cast = cast;
    m.userData.receive = receive;
    const set = m.userData.set;
    if (set.frames > 1) this.animated.push({ set, phase: variant * 1.7 + (variant ? 0.5 : 0) });
    this.cache.set(key, m);
    return m;
  }

  /** Transparent overlay decal (no depth write, pulled toward the camera to avoid z-fighting). */
  decal(name) {
    const key = `decal|${name}`;
    let m = this.cache.get(key);
    if (m) return m;
    m = makeMaterial(name, { repeat: [1, 1], transparent: true, alphaTest: 0.01, roughness: 0.6, metalness: 0.1 });
    m.depthWrite = false;
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    m.polygonOffsetUnits = -2;
    m.userData.cast = false;
    this.cache.set(key, m);
    return m;
  }

  /** Plain lit material for small mechanical parts. */
  plain(color, { roughness = 0.6, metalness = 0.35, emissive = null, emissiveIntensity = 1 } = {}) {
    const key = `plain|${color}|${roughness}|${metalness}|${emissive}|${emissiveIntensity}`;
    let m = this.cache.get(key);
    if (m) return m;
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    if (emissive) { m.emissive.set(emissive); m.emissiveIntensity = emissiveIntensity; }
    this.cache.set(key, m);
    return m;
  }

  /** Every material this cache created (World.dispose releases them, used or not). */
  list() {
    return [...this.cache.values()];
  }

  /** Advance every animated texture. */
  update(t) {
    for (const a of this.animated) {
      const set = a.set;
      const f = Math.floor((t + a.phase) * set.fps);
      const n = set.frames;
      const u = (((f % n) + n) % n) / n;
      if (set.map.offset.x !== u) {
        set.map.offset.x = u;
        if (set.normalMap) set.normalMap.offset.x = u;
        if (set.emissiveMap) set.emissiveMap.offset.x = u;
      }
    }
  }
}

/**
 * Open cylinder (no caps) whose texture wraps once every `arc` world units of circumference, so a
 * pixel texture keeps its density; u stays inside 0..1 per arc (works with animated frame strips).
 */
export function wrappedCylinder(radius, height, { arc = 2, texHeight = 2, segPerArc = 8, y0 = 0 } = {}) {
  const circ = Math.PI * 2 * radius;
  const arcs = Math.max(1, Math.round(circ / arc));
  const pos = [], nrm = [], uv = [], idx = [];
  const segs = arcs * segPerArc;
  let n = 0;
  for (let a = 0; a < arcs; a++) {
    for (let s = 0; s <= segPerArc; s++) {
      const ang = ((a * segPerArc + s) / segs) * Math.PI * 2;
      const x = Math.sin(ang), z = Math.cos(ang);
      const u = s / segPerArc;
      pos.push(x * radius, y0, z * radius, x * radius, y0 + height, z * radius);
      nrm.push(x, 0, z, x, 0, z);
      uv.push(u, 0, u, height / texHeight);
    }
    for (let s = 0; s < segPerArc; s++) {
      const i = n + s * 2;
      idx.push(i, i + 2, i + 3, i, i + 3, i + 1);
    }
    n += (segPerArc + 1) * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Cylinder along an axis with u along its length (1 per world unit) and v once around. */
export function pipeGeometry(radius, length, axis = 'x', radial = 10) {
  const g = new THREE.CylinderGeometry(radius, radius, length, radial, 1, true);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * length, uv.getX(i));
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  else if (axis === 'z') g.rotateX(Math.PI / 2);
  return g;
}
