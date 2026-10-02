// Particle effects: soft glow sprites (additive or alpha) and lit tumbling debris chunks.
import * as THREE from 'three';
import { getTexture } from './textures.js';

const VERT = `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
varying float vAlpha; varying vec3 vColor; uniform float uScale;
void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, aSize * uScale / -mv.z); vAlpha = aAlpha; vColor = aColor; }`;
const FRAG = `
uniform sampler2D uMap; varying float vAlpha; varying vec3 vColor;
void main(){ float a = texture2D(uMap, gl_PointCoord).a * vAlpha; if (a < 0.003) discard; gl_FragColor = vec4(vColor, a);
  #include <colorspace_fragment>
}`;

class SpritePool {
  constructor(scene, max, additive) {
    this.max = max; this.n = 0; this.head = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max);
    this.s0 = new Float32Array(max); this.a0 = new Float32Array(max); this.grav = new Float32Array(max);
    this.drag = new Float32Array(max); this.shrink = new Float32Array(max); this.grow = new Float32Array(max);
    this.alive = new Uint8Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uMap: { value: getTexture('glow') }, uScale: { value: 600 } },
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 10 : 9;
    scene.add(this.points);
  }

  add(o) {
    const i = this.head; this.head = (this.head + 1) % this.max;
    const k = i * 3;
    this.pos[k] = o.x; this.pos[k + 1] = o.y; this.pos[k + 2] = o.z ?? 0.3;
    this.vel[k] = o.vx || 0; this.vel[k + 1] = o.vy || 0; this.vel[k + 2] = o.vz || 0;
    this.col[k] = o.r; this.col[k + 1] = o.g; this.col[k + 2] = o.b;
    this.life[i] = o.life; this.age[i] = 0; this.s0[i] = o.size; this.a0[i] = o.alpha ?? 1;
    this.grav[i] = o.grav || 0; this.drag[i] = o.drag || 0; this.shrink[i] = o.shrink ?? 1; this.grow[i] = o.grow || 0;
    this.alive[i] = 1; this.size[i] = o.size; this.alpha[i] = this.a0[i];
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (!this.alive[i]) { this.alpha[i] = 0; continue; }
      const a = (this.age[i] += dt);
      if (a >= this.life[i]) { this.alive[i] = 0; this.alpha[i] = 0; continue; }
      const k = i * 3, t = a / this.life[i];
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[k] *= dr; this.vel[k + 1] = this.vel[k + 1] * dr - this.grav[i] * dt; this.vel[k + 2] *= dr;
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      this.alpha[i] = this.a0[i] * (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85);
      this.size[i] = this.s0[i] * (1 + this.grow[i] * t) * (1 - this.shrink[i] * t * 0.7);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = g.attributes.aColor.needsUpdate = g.attributes.aSize.needsUpdate = g.attributes.aAlpha.needsUpdate = true;
  }

  setScale(s) { this.mat.uniforms.uScale.value = s; }
  clear() { this.alive.fill(0); this.alpha.fill(0); }
}

const _c = new THREE.Color();
function rgbOf(c) { _c.set(c); return [_c.r, _c.g, _c.b]; }

export class Particles {
  constructor(scene, { sprites = 900, chunks = 160 } = {}) {
    this.glow = new SpritePool(scene, sprites, true);
    this.puff = new SpritePool(scene, 360, false);
    // debris chunks
    this.maxChunks = chunks; this.cn = 0;
    this.chunks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), chunks);
    this.chunks.castShadow = true;
    this.chunks.frustumCulled = false;
    this.chunks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < chunks; i++) { this.chunks.setColorAt(i, _c.set(0xffffff)); }
    scene.add(this.chunks);
    this.cd = Array.from({ length: chunks }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, sx: 0, sy: 0, sz: 0, s: 0, life: 0, age: 0 }));
    this.chead = 0;
    this._m = new THREE.Object3D();
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < chunks; i++) this.chunks.setMatrixAt(i, this._zero);
  }

  /** Glowing spark / magic dot. */
  spark(x, y, o = {}) {
    const [r, g, b] = rgbOf(o.color ?? 0xffe27a);
    this.glow.add({ x, y, z: o.z, vx: o.vx, vy: o.vy, vz: o.vz, r, g, b, life: o.life ?? 0.5, size: o.size ?? 0.35, alpha: o.alpha ?? 1, grav: o.grav ?? 0, drag: o.drag ?? 0, shrink: 1, grow: o.grow ?? 0 });
  }
  /** Soft smoke / dust puff (alpha blended). */
  puffAt(x, y, o = {}) {
    const [r, g, b] = rgbOf(o.color ?? 0xd8cdb4);
    this.puff.add({ x, y, z: o.z ?? 0.6, vx: o.vx, vy: o.vy, vz: o.vz, r, g, b, life: o.life ?? 0.6, size: o.size ?? 0.8, alpha: o.alpha ?? 0.5, grav: o.grav ?? -0.4, drag: o.drag ?? 2.2, shrink: 0, grow: o.grow ?? 1.6 });
  }
  burst(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.arc ? (o.dir ?? -Math.PI / 2) + (Math.random() - 0.5) * o.arc : Math.random() * Math.PI * 2;
      const sp = (o.speed ?? 6) * (0.4 + Math.random() * 0.8);
      this.spark(x + (Math.random() - 0.5) * (o.spread ?? 0.2), y + (Math.random() - 0.5) * (o.spread ?? 0.2), {
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color: Array.isArray(o.colors) ? o.colors[(Math.random() * o.colors.length) | 0] : o.color,
        life: (o.life ?? 0.5) * (0.6 + Math.random() * 0.8), size: (o.size ?? 0.35) * (0.6 + Math.random() * 0.8), grav: o.grav ?? 8, drag: o.drag ?? 1.2,
      });
    }
  }
  dust(x, y, n = 6, dir = 0, o = {}) {
    for (let i = 0; i < n; i++) this.puffAt(x + (Math.random() - 0.5) * 0.6, y + 0.05, { vx: dir * (1 + Math.random() * 2.5) + (Math.random() - 0.5) * 2, vy: 0.4 + Math.random() * 1.4, size: (o.size ?? 0.55) * (0.7 + Math.random() * 0.6), life: 0.35 + Math.random() * 0.3, alpha: o.alpha ?? 0.45, color: o.color });
  }
  /** Tumbling debris (crate splinters, rock shards). */
  debris(x, y, n, color = 0x9b6a35, o = {}) {
    for (let i = 0; i < n; i++) {
      const c = this.cd[this.chead]; const idx = this.chead; this.chead = (this.chead + 1) % this.maxChunks;
      c.on = true; c.age = 0; c.life = (o.life ?? 1.1) * (0.7 + Math.random() * 0.6);
      c.x = x + (Math.random() - 0.5) * (o.spread ?? 0.8); c.y = y + (Math.random() - 0.5) * (o.spread ?? 0.8); c.z = (Math.random() - 0.5) * 0.8;
      const a = Math.random() * Math.PI * 2, sp = (o.speed ?? 6) * (0.4 + Math.random() * 0.9);
      c.vx = Math.cos(a) * sp; c.vy = Math.abs(Math.sin(a)) * sp * 0.9 + 2; c.vz = (Math.random() - 0.3) * 3;
      c.rx = Math.random() * 6; c.ry = Math.random() * 6; c.rz = Math.random() * 6;
      c.sx = 0.12 + Math.random() * 0.22; c.sy = 0.08 + Math.random() * 0.2; c.sz = 0.1 + Math.random() * 0.2; c.s = 1;
      const jitter = 0.78 + Math.random() * 0.4;
      this.chunks.setColorAt(idx, _c.set(color).multiplyScalar(jitter));
    }
    if (this.chunks.instanceColor) this.chunks.instanceColor.needsUpdate = true;
  }

  update(dt) {
    this.glow.update(dt); this.puff.update(dt);
    const m = this._m;
    for (let i = 0; i < this.maxChunks; i++) {
      const c = this.cd[i];
      if (!c.on) continue;
      c.age += dt;
      if (c.age > c.life) { c.on = false; this.chunks.setMatrixAt(i, this._zero); continue; }
      c.vy -= 24 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      c.rx += dt * 5; c.ry += dt * 7; c.rz += dt * 3;
      const k = c.age > c.life * 0.7 ? 1 - (c.age - c.life * 0.7) / (c.life * 0.3) : 1;
      m.position.set(c.x, c.y, c.z); m.rotation.set(c.rx, c.ry, c.rz); m.scale.set(c.sx * k, c.sy * k, c.sz * k); m.updateMatrix();
      this.chunks.setMatrixAt(i, m.matrix);
    }
    this.chunks.instanceMatrix.needsUpdate = true;
  }

  setScale(s) { this.glow.setScale(s); this.puff.setScale(s); }
  clear() {
    this.glow.clear(); this.puff.clear();
    for (let i = 0; i < this.maxChunks; i++) { this.cd[i].on = false; this.chunks.setMatrixAt(i, this._zero); }
    this.chunks.instanceMatrix.needsUpdate = true;
  }
}
