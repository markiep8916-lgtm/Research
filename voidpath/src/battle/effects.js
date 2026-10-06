// Battle effects in 3D: animated additive effect sheets (art/fx.js) on camera-facing or floor quads,
// tracer streaks, energy beams, glowing orb projectiles and tumbling glass shards. Quads and glow
// sprites are pooled; after warm-up a spawn allocates only the promise it returns.

import * as THREE from 'three';
import { fxSheet, FX_NAMES } from '../art/fx.js';
import { toTexture, makeCanvas } from '../art/painter.js';
import { makeGlow } from '../core/vfx.js';

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const FLAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const _qz = new THREE.Quaternion();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Color();
const _seg = { angle: 0, len: 0 };
const QUADS = 40;
const ORBS = 8;
const NOOP = () => {};

/** Soft horizontal beam texture: white core with a gaussian falloff across the width. */
function beamTexture() {
  const c = makeCanvas(4, 64);
  const g = c.getContext('2d');
  const img = g.createImageData(4, 64);
  for (let y = 0; y < 64; y++) {
    const d = Math.abs(y + 0.5 - 32) / 32;
    const a = Math.exp(-d * d * 9) * 0.8 + Math.exp(-d * d * 90) * 0.6;
    for (let x = 0; x < 4; x++) {
      const i = (y * 4 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.min(255, Math.round(a * 255));
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

class Quad {
  constructor(geo) {
    this.mat = new THREE.MeshBasicMaterial({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
    this.textures = new Map();
    this.active = false;
    this.pos = new THREE.Vector3();
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();
    this.vel = new THREE.Vector3();
  }
}

export class Effects {
  constructor(scene, camera, particles) {
    this.scene = scene;
    this.camera = camera;
    this.particles = particles;
    this.base = new Map();
    this.geo = new THREE.PlaneGeometry(1, 1);
    this.beamTex = beamTexture();
    this.quads = [];
    for (let i = 0; i < QUADS; i++) {
      const q = new Quad(this.geo);
      scene.add(q.mesh);
      this.quads.push(q);
    }
    this.orbs = [];
    for (let i = 0; i < ORBS; i++) {
      const s = makeGlow('#ffffff', 0.6, 1, { pull: 0 });
      s.visible = false;
      s.material.depthTest = false;
      s.renderOrder = 21;
      scene.add(s);
      this.orbs.push({ sprite: s, active: false, from: new THREE.Vector3(), to: new THREE.Vector3() });
    }
  }

  /** Upload every effect sheet now so the first cast does not hitch. */
  warm(renderer) {
    for (const name of FX_NAMES) renderer.initTexture(this._base(name));
    renderer.initTexture(this.beamTex);
    const q = this.quads[0];
    this._texture(q, 'impact');
    q.mesh.visible = true;
    q.mat.opacity = 0;
    renderer.compile(this.scene, this.camera);
    q.mesh.visible = false;
    q.mat.opacity = 1;
  }

  _base(name) {
    let t = this.base.get(name);
    if (!t) {
      t = toTexture(fxSheet(name).canvas);
      this.base.set(name, t);
    }
    return t;
  }

  _texture(q, name) {
    let t = q.textures.get(name);
    if (!t) {
      t = name === '__beam' ? this.beamTex.clone() : this._base(name).clone();
      q.textures.set(name, t);
    }
    q.mat.map = t;
    q.tex = t;
    return t;
  }

  _quad() {
    for (const q of this.quads) if (!q.active) return q;
    // pool exhausted: recycle the oldest effect
    let best = this.quads[0];
    for (const q of this.quads) if (q.t / (q.dur || 1) > best.t / (best.dur || 1)) best = q;
    this._finish(best);
    return best;
  }

  _start(q, kind, dur) {
    q.kind = kind;
    q.active = true;
    q.t = 0;
    q.dur = dur;
    q.mesh.visible = true;
    q.mat.opacity = 1;
    return new Promise((resolve) => { q.resolve = resolve; });
  }

  _finish(q) {
    q.active = false;
    q.mesh.visible = false;
    const r = q.resolve;
    q.resolve = null;
    if (r) r();
  }

  _color(q, color, intensity) {
    _c.set(color || '#ffffff');
    q.mat.color.setRGB(_c.r * intensity, _c.g * intensity, _c.b * intensity);
  }

  _frame(q, frame) {
    const s = q.sheet;
    const W = s.frameW * s.cols;
    const iu = 0.5 / W;
    const rx = 1 / s.cols - 2 * iu;
    let ox = (frame % s.cols) / s.cols + iu;
    let sx = rx;
    if (q.flip) { ox += rx; sx = -rx; }
    q.tex.offset.set(ox, 0);
    q.tex.repeat.set(sx, 1);
  }

  /**
   * Plays an effect sheet at `pos`. opts: scale, flip, color (tint), intensity (HDR multiplier, blooms
   * above ~1), fps, anchor [x, y] in the frame (0.5,0.5 = centre), rot (radians, screen plane),
   * floor (lie flat on the floor), frame (show one frame for `life` seconds). Resolves when done.
   */
  sheet(name, pos, { scale = 1, flip = false, color = null, intensity = 1.7, fps = null, anchor = [0.5, 0.5], rot = 0, floor = false, frame = null, life = 0.4 } = {}) {
    const sheet = fxSheet(name);
    const q = this._quad();
    q.sheet = sheet;
    q.flip = flip;
    this._texture(q, name);
    this._color(q, color, intensity);
    q.pos.copy(pos);
    q.w = (sheet.frameW / 32) * scale;
    q.h = (sheet.frameH / 32) * scale;
    q.anchor = anchor;
    q.rot = rot;
    q.floor = floor;
    q.fixedFrame = frame;
    q.fps = fps || sheet.anims.play.fps;
    q.frames = sheet.count;
    q.lastFrame = -1;
    this._frame(q, frame ?? 0);
    const dur = frame != null ? life : q.frames / q.fps;
    return this._start(q, 'sheet', dur);
  }

  /** A tracer streak flying from `from` to `to` in `dur` seconds (resolves on arrival). */
  streak(from, to, { color = '#ffd28a', intensity = 2.4, length = 1.6, width = 0.3, dur = 0.09 } = {}) {
    const q = this._quad();
    q.sheet = fxSheet('tracer');
    q.flip = false;
    this._texture(q, 'tracer');
    this._frame(q, 0);
    this._color(q, color, intensity);
    q.from.copy(from);
    q.to.copy(to);
    q.len = length;
    q.width = width;
    return this._start(q, 'streak', dur);
  }

  /** Energy beam from `from` to `to`: grows, holds, fades over `dur`. Resolves when it has faded. */
  beam(from, to, { color = '#ff63e0', intensity = 2.6, width = 0.35, dur = 0.45 } = {}) {
    const q = this._quad();
    this._texture(q, '__beam');
    q.tex.offset.set(0, 0);
    q.tex.repeat.set(1, 1);
    this._color(q, color, intensity);
    q.from.copy(from);
    q.to.copy(to);
    q.width = width;
    return this._start(q, 'beam', dur);
  }

  /** Glass shards (fx 'shards') bursting from `pos`. */
  shards(pos, { count = 10, scale = 1, color = '#ffffff', intensity = 1.8 } = {}) {
    for (let i = 0; i < count; i++) {
      const q = this._quad();
      q.sheet = fxSheet('shards');
      q.flip = Math.random() < 0.5;
      this._texture(q, 'shards');
      this._frame(q, (Math.random() * 4) | 0);
      this._color(q, color, intensity);
      q.pos.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const sp = 2.6 + Math.random() * 3.4;
      q.vel.set(Math.cos(a) * sp, Math.abs(Math.sin(a)) * sp * 0.8 + 2.2, (Math.random() - 0.2) * 1.5);
      q.spin = (Math.random() * 2 - 1) * 14;
      q.rot = Math.random() * 6;
      q.w = q.h = (0.45 + Math.random() * 0.5) * scale;
      this._start(q, 'shard', 0.7 + Math.random() * 0.45).then(NOOP);
    }
  }

  /** Glowing projectile from `from` to `to` (optional arc height). Resolves on arrival. */
  orb(from, to, { color = '#ff7a3a', size = 0.7, intensity = 2.2, dur = 0.22, arc = 0, trail = null, trailColor = null } = {}) {
    let o = this.orbs.find((x) => !x.active);
    if (!o) { o = this.orbs[0]; o.resolve?.(); }
    o.active = true;
    o.t = 0;
    o.dur = dur;
    o.arc = arc;
    o.trail = trail;
    o.trailColor = trailColor;
    o.acc = 0;
    o.from.copy(from);
    o.to.copy(to);
    o.sprite.visible = true;
    o.sprite.scale.set(size, size, 1);
    o.sprite.material.color.set(color).multiplyScalar(intensity);
    o.sprite.position.copy(from);
    return new Promise((resolve) => { o.resolve = resolve; });
  }

  /** Screen-plane angle and length of the segment a->b as seen by the camera (reused result). */
  _angle(a, b) {
    _b.subVectors(b, a).applyQuaternion(_qz.copy(this.camera.quaternion).invert());
    _seg.angle = Math.atan2(_b.y, _b.x);
    _seg.len = Math.hypot(_b.x, _b.y);
    return _seg;
  }

  /** Advances and places every live effect (dt 0, e.g. during hit-stop, only re-places them). */
  update(dt) {
    const camQ = this.camera.quaternion;
    _right.set(1, 0, 0).applyQuaternion(camQ);
    _up.set(0, 1, 0).applyQuaternion(camQ);
    for (const q of this.quads) {
      if (!q.active) continue;
      q.t += dt;
      const k = Math.min(1, q.t / q.dur);
      const m = q.mesh;
      if (q.kind === 'sheet') {
        if (q.fixedFrame == null) {
          const f = Math.min(q.frames - 1, Math.floor(q.t * q.fps));
          if (f !== q.lastFrame) { q.lastFrame = f; this._frame(q, f); }
        } else {
          q.mat.opacity = 1 - Math.max(0, (k - 0.6) / 0.4);
        }
        m.scale.set(q.w, q.h, 1);
        if (q.floor) {
          m.quaternion.copy(FLAT).multiply(_qz.setFromAxisAngle(Z_AXIS, q.rot));
          m.position.copy(q.pos);
        } else {
          // the anchor (frame fraction, y from the top like texture pixels) lands on q.pos
          const ax = q.flip ? 1 - q.anchor[0] : q.anchor[0];
          m.quaternion.copy(camQ).multiply(_qz.setFromAxisAngle(Z_AXIS, q.rot));
          m.position.copy(q.pos)
            .addScaledVector(_right, (0.5 - ax) * q.w)
            .addScaledVector(_up, (q.anchor[1] - 0.5) * q.h);
        }
      } else if (q.kind === 'streak') {
        const { angle } = this._angle(q.from, q.to);
        _a.lerpVectors(q.from, q.to, Math.min(1, k * 1.15));
        m.quaternion.copy(camQ).multiply(_qz.setFromAxisAngle(Z_AXIS, angle));
        _b.subVectors(q.to, q.from).normalize();
        m.position.copy(_a).addScaledVector(_b, -q.len * 0.5);
        m.scale.set(q.len, q.width, 1);
        q.mat.opacity = k > 0.85 ? (1 - k) / 0.15 : 1;
      } else if (q.kind === 'beam') {
        const { angle, len } = this._angle(q.from, q.to);
        const grow = Math.min(1, q.t / 0.07);
        const fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        const flick = 0.85 + 0.15 * Math.sin(q.t * 70);
        m.quaternion.copy(camQ).multiply(_qz.setFromAxisAngle(Z_AXIS, angle));
        _a.lerpVectors(q.from, q.to, grow * 0.5);
        m.position.copy(_a);
        m.scale.set(Math.max(0.01, len * grow), q.width * fade * flick + 0.001, 1);
        q.mat.opacity = Math.max(0.15, fade);
      } else if (q.kind === 'shard') {
        q.vel.y -= 11 * dt;
        q.pos.addScaledVector(q.vel, dt);
        if (q.pos.y < 0.05) { q.pos.y = 0.05; q.vel.y *= -0.35; q.vel.x *= 0.6; }
        q.rot += q.spin * dt;
        m.quaternion.copy(camQ).multiply(_qz.setFromAxisAngle(Z_AXIS, q.rot));
        m.position.copy(q.pos);
        m.scale.set(q.w, q.h, 1);
        q.mat.opacity = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      }
      if (k >= 1) this._finish(q);
    }
    for (const o of this.orbs) {
      if (!o.active) continue;
      o.t += dt;
      const k = Math.min(1, o.t / o.dur);
      o.sprite.position.lerpVectors(o.from, o.to, k);
      if (o.arc) o.sprite.position.y += Math.sin(k * Math.PI) * o.arc;
      if (o.trail && this.particles) {
        o.acc += dt;
        if (o.acc > 0.025) {
          o.acc = 0;
          this.particles.emit(o.trail, o.sprite.position, { count: 2, size: 0.7, life: 0.45, speed: 0.3, color: o.trailColor });
        }
      }
      if (k >= 1) {
        o.active = false;
        o.sprite.visible = false;
        const r = o.resolve;
        o.resolve = null;
        if (r) r();
      }
    }
  }

  dispose() {
    for (const q of this.quads) {
      for (const t of q.textures.values()) t.dispose();
      q.mat.dispose();
      q.mesh.removeFromParent();
    }
    for (const o of this.orbs) {
      o.sprite.material.dispose();
      o.sprite.removeFromParent();
    }
    for (const t of this.base.values()) t.dispose();
    this.beamTex.dispose();
    this.geo.dispose();
  }
}
