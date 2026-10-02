// Batches many copies of one geometry/material into a single InstancedMesh.
import * as THREE from 'three';

const _o = new THREE.Object3D();
const _c = new THREE.Color();

export class Instancer {
  constructor(geometry, material, { cast = false, receive = false } = {}) {
    this.geometry = geometry;
    this.material = material;
    this.cast = cast;
    this.receive = receive;
    this.items = [];
  }

  /** Queue an instance; returns its slot index. `rot`/`scale` optional. color: number | THREE.Color | [r,g,b] */
  add(x, y, z, { s = 1, sx, sy, sz, rx = 0, ry = 0, rz = 0, color } = {}) {
    this.items.push({ x, y, z, sx: sx ?? s, sy: sy ?? s, sz: sz ?? s, rx, ry, rz, color });
    return this.items.length - 1;
  }

  build(parent) {
    const n = Math.max(1, this.items.length);
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, n);
    mesh.castShadow = this.cast;
    mesh.receiveShadow = this.receive;
    mesh.frustumCulled = false;
    this.items.forEach((it, i) => {
      _o.position.set(it.x, it.y, it.z);
      _o.rotation.set(it.rx, it.ry, it.rz);
      _o.scale.set(it.sx, it.sy, it.sz);
      _o.updateMatrix();
      mesh.setMatrixAt(i, _o.matrix);
      if (it.color !== undefined) {
        if (Array.isArray(it.color)) _c.setRGB(it.color[0], it.color[1], it.color[2]); else _c.set(it.color);
        mesh.setColorAt(i, _c);
      } else mesh.setColorAt(i, _c.set(0xffffff));
    });
    mesh.count = this.items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (parent) parent.add(mesh);
    this.mesh = mesh;
    return mesh;
  }

  /** Hide / restore a slot at runtime (used for broken tiles). */
  setVisible(i, visible) {
    if (!this.mesh) return;
    const it = this.items[i];
    _o.position.set(it.x, it.y, it.z);
    _o.rotation.set(it.rx, it.ry, it.rz);
    const k = visible ? 1 : 0;
    _o.scale.set(it.sx * k, it.sy * k, it.sz * k);
    _o.updateMatrix();
    this.mesh.setMatrixAt(i, _o.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** CSS-style HSL colour (sRGB), for tint instances. */
export const hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l, THREE.SRGBColorSpace);
