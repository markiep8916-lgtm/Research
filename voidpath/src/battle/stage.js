// Battle stage: the 3D arena, the combatant sprites, the camera rig and a game-time timeline.
// Enemies stand on the LEFT and the party on the RIGHT in a staggered diagonal (back member up-right,
// front member down-left). The camera is fitted to the combatants for any aspect ratio (portrait phones
// get a compressed formation) and drifts gently; a view offset keeps the combatant line clear of the UI.
//
// Every choreography primitive returns a promise resolved by stage.update(dt): game time, so
// engine.hitStop() freezes them along with the sprites and particles.

import * as THREE from 'three';
import { SpriteActor } from '../core/spriteActor.js';
import { Particles } from '../core/particles.js';
import { buildBattleSprite } from '../art/characters.js';
import { buildEnemySprite } from '../art/enemies.js';
import { buildArena } from './arena.js';
import { Effects } from './effects.js';
import { damp, ease } from '../core/util.js';

const FOV = 30;
const PITCH = THREE.MathUtils.degToRad(26);
const TILT = 0.36;                 // sprites lean back a little less than the camera pitch
const COS_T = Math.cos(TILT), SIN_T = Math.sin(TILT);
const READY_STEP = 0.5;            // how far the active party member steps toward the enemies

// [x, z] formation slots. Party: back (up-right) -> front (down-left).
const PARTY_SLOTS = [[4.5, -2.6], [3.6, -0.65], [2.7, 1.3], [1.8, 3.25]];
// Enemy slots per count, in the order bigger enemies take them (middle / back first).
const ENEMY_SLOTS = {
  1: [[-3.2, 0.2]],
  2: [[-3.7, -1.9], [-2.5, 2.0]],
  3: [[-4.5, 0.3], [-2.7, -2.3], [-2.5, 2.7]],
  4: [[-4.5, 0.3], [-2.6, -2.3], [-2.4, 2.7], [-5.6, -1.9]],
};
const BOSS_SLOT = [-4.2, -0.8];

// Party battle frames (64x64, facing left): body centre, casting hand, rifle muzzle, head top.
const PARTY_POINTS = {
  center: [35, 38], hand: [21, 31], muzzle: [21, 31], top: [35, 12], feet: [35, 63],
};
const NYX_MUZZLE = [7, 27];

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _qi = new THREE.Quaternion();
const _box = new THREE.Box3();
const _corners = Array.from({ length: 4 }, () => new THREE.Vector3());
const _scr = { x: 0, y: 0, visible: false };

/** Promise-returning waits and tweens, advanced by update(dt). */
class Timeline {
  constructor() {
    this.items = [];
  }

  wait(sec) {
    return new Promise((resolve) => this.items.push({ t: 0, dur: Math.max(0, sec), fn: null, ease: null, resolve }));
  }

  tween(sec, fn, easing = ease.outCubic) {
    fn(0, 0);
    return new Promise((resolve) => this.items.push({ t: 0, dur: Math.max(0, sec), fn, ease: easing, resolve }));
  }

  get busy() { return this.items.some((it) => it.fn); }

  update(dt) {
    const items = this.items;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.t += dt;
      const k = it.dur > 0 ? Math.min(1, it.t / it.dur) : 1;
      if (it.fn) it.fn(it.ease ? it.ease(k) : k, k);
      if (k >= 1) {
        items.splice(i--, 1);
        it.resolve();
      }
    }
  }

  clear() { this.items.length = 0; }
}

export class BattleActor {
  constructor(c, { emissive }) {
    this.id = c.id;
    this.side = c.side;
    this.key = c.key;
    this.alive = c.alive !== false;
    const sheet = c.side === 'party' ? buildBattleSprite(c.key) : buildEnemySprite(c.key);
    this.sheet = sheet;
    this.sprite = new SpriteActor(sheet, { tilt: TILT, emissiveIntensity: emissive, shadowScale: c.key === 'drone' ? 0.8 : 1 });
    this.object3d = this.sprite.object3d;
    const b = this.sprite.bounds;
    const cx = (b.x0 + b.x1 + 1) / 2;
    this.art = b;
    this.points = c.side === 'party'
      ? { ...PARTY_POINTS, muzzle: c.key === 'nyx' ? NYX_MUZZLE : PARTY_POINTS.muzzle }
      : { feet: [cx, sheet.frameH], ...sheet.points };
    this.points.bottom = [cx, b.y1 + 1];
    this.artCx = (cx - sheet.frameW / 2) / 32;      // art centre relative to the pivot (world units)
    this.halfW = c.side === 'party' ? 0.45 : (b.x1 - b.x0 + 1) / 64;
    this.size = c.side === 'party' ? 1 : Math.max(0.8, (b.y1 - b.y0 + 1) / 40);
    this.home = new THREE.Vector3();
    this.base = new THREE.Vector3();   // tweened stand position
    this.off = new THREE.Vector3();    // knockback / recoil offset
    this.hover = c.key === 'drone' ? 0.08 : c.key === 'sentinel' ? 0.05 : 0;
    this.phase = Math.random() * 6;
    this.idleAnim = 'idle';
    this.hurtT = 0;
    this.emitter = null;               // break sparks
    this.aura = null;                  // boost motes (follows the actor)
    this.sprite.play('idle');
  }

  /** Back to the resting animation (idle / ready / defend / break / ko). */
  rest(anim = this.idleAnim) {
    this.idleAnim = anim;
    this.hurtT = 0;
    this.sprite.play(anim);
  }

  /** Holds the hurt frame for `sec`, then returns to the resting animation. */
  hurt(sec = 0.3) {
    if (!this.sheet.anims.hurt) return;
    this.sprite.play('hurt', { restart: true });
    this.hurtT = sec;
  }

  /** Plays a one-shot animation, then returns to the resting one. */
  oneShot(anim) {
    const restAnim = this.idleAnim;
    this.sprite.play(anim, { restart: true, onEnd: () => { if (this.sprite.currentAnim === anim) this.sprite.play(restAnim); } });
  }

  /** World position of a named point of the art (center, top, muzzle, hand, core, feet). */
  point(name, out = new THREE.Vector3()) {
    const p = this.points[name] || this.points.center;
    const sh = this.sheet;
    let lx = (p[0] - sh.frameW / 2) / 32;
    if (this.sprite.flipX) lx = -lx;
    const ly = (sh.frameH - p[1]) / 32;
    return out.set(lx, ly * COS_T, -ly * SIN_T).add(this.object3d.position);
  }

  update(dt, t) {
    if (this.hurtT > 0 && (this.hurtT -= dt) <= 0) this.sprite.play(this.idleAnim);
    this.sprite.update(dt);
    const o = this.object3d.position;
    o.copy(this.base).add(this.off);
    if (this.hover && this.alive) o.y += this.hover * (1 + Math.sin(t * 2.3 + this.phase));
    if (this.aura) this.aura.position.copy(o);
  }

  dispose() {
    this.emitter?.remove();
    this.aura?.remove();
    this.sprite.dispose();
  }
}

export class BattleStage {
  /**
   * engine: core Engine; encounter: ENCOUNTERS entry; combatants: model.combatants (read for ids,
   * sides, kinds and alive flags only).
   */
  constructor(engine, { encounter, combatants }) {
    this.engine = engine;
    this.encounter = encounter;
    this.boss = !!encounter.boss;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, engine.size.aspect, 0.1, 160);
    this.timeline = new Timeline();
    this.arena = buildArena(this.scene, encounter.backdrop);
    this.particles = new Particles(this.scene, { max: 3600 });
    this.effects = new Effects(this.scene, this.camera, this.particles);
    this.emitters = this.arena.emitters.map(([preset, opts]) => this.particles.addEmitter(preset, opts));

    this.actors = new Map();
    this.party = [];
    this.enemies = [];
    for (const c of combatants) {
      const a = new BattleActor(c, { emissive: c.side === 'party' ? 1.8 : 2.2 });
      this.actors.set(a.id, a);
      (a.side === 'party' ? this.party : this.enemies).push(a);
      this.scene.add(a.object3d);
      if (!a.alive) {
        a.rest('ko');
        a.sprite.setTint('#7d8699');
      }
    }

    this.compact = null;
    this.aspect = 0;
    this.fx = { focusY: 0.5, band: 0.2, falloff: 0.26 };
    this.cam = {
      target: new THREE.Vector3(), dist: 16, offX: 0, offY: 0, zoom: 1, shiftX: 0,
      want: { zoom: 1, shiftX: 0, rate: 3 },
    };
    this._camDir = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
    this._camQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -PITCH);
    this.time = 0;
    this.layout(true);
  }

  // ------------------------------------------------------------------ layout + camera

  /** Places everyone at their formation slots for the current aspect (snap = no tween). */
  layout(snap = false) {
    const aspect = this.engine.size.aspect;
    const compact = aspect < 0.9;
    this.aspect = aspect;
    if (compact !== this.compact) {
      this.compact = compact;
      const sx = compact ? 0.52 : 1, sz = compact ? 1.08 : 1;
      this.party.forEach((a, i) => {
        const [x, z] = PARTY_SLOTS[i % PARTY_SLOTS.length];
        a.home.set(x * sx + (compact ? 0.6 : 0), 0, z * sz);
      });
      const slots = this.boss ? [BOSS_SLOT] : ENEMY_SLOTS[Math.min(4, this.enemies.length)];
      const bySize = [...this.enemies].sort((a, b) => b.sheet.frameH * b.sheet.frameW - a.sheet.frameH * a.sheet.frameW);
      bySize.forEach((a, i) => {
        const [x, z] = slots[i % slots.length];
        a.home.set(x * (compact ? (this.boss ? 0.5 : 0.56) : 1) - (compact ? 0.4 : 0), 0, z * sz);
      });
      if (snap || !this.timeline.busy) for (const a of this.actors.values()) a.base.copy(a.home);
    }
    this._fit();
  }

  /** Fits camera distance + view offset so every combatant sits inside the UI-free band. */
  _fit() {
    const aspect = this.engine.size.aspect;
    const short = !this.compact && this.engine.size.height < 520;
    const [top, bottom] = this.compact ? [0.17, 0.53] : short ? [0.16, 0.8] : [0.15, 0.71];
    const hr = bottom - top;
    const cf = (top + bottom) / 2;
    const pts = [];
    _box.makeEmpty();
    for (const a of this.actors.values()) {
      const top = (a.sheet.frameH - a.art.y0) / 32;
      const h = top * COS_T, zt = a.home.z - top * SIN_T;
      const x = a.home.x + a.artCx;
      pts.push(_v.set(x - a.halfW, 0, a.home.z).clone(), _v.set(x + a.halfW, 0, a.home.z).clone(),
        _v.set(x - a.halfW, h, zt).clone(), _v.set(x + a.halfW, h, zt).clone());
    }
    for (const p of pts) _box.expandByPoint(p);
    const target = _box.getCenter(new THREE.Vector3());
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const tanH = tanV * aspect;
    _qi.copy(this._camQuat).invert();
    // NDC extents of all points at distance D: the spans must fit, then a view offset centres them
    const ext = { x0: 0, x1: 0, y0: 0, y1: 0 };
    const measure = (D) => {
      ext.x0 = ext.y0 = Infinity;
      ext.x1 = ext.y1 = -Infinity;
      for (const p of pts) {
        _w.copy(p).sub(target).addScaledVector(this._camDir, -D).applyQuaternion(_qi);
        const z = Math.max(0.05, -_w.z);
        const nx = _w.x / (z * tanH), ny = _w.y / (z * tanV);
        if (nx < ext.x0) ext.x0 = nx;
        if (nx > ext.x1) ext.x1 = nx;
        if (ny < ext.y0) ext.y0 = ny;
        if (ny > ext.y1) ext.y1 = ny;
      }
      return ext.x1 - ext.x0 <= (this.compact ? 1.62 : 1.8) && ext.y1 - ext.y0 <= 2 * hr * 0.97;
    };
    let lo = 4, hi = 160;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (measure(mid)) hi = mid; else lo = mid;
    }
    measure(hi);
    this.cam.target.copy(target);
    this.cam.dist = hi;
    this.cam.offX = (ext.x0 + ext.x1) / 4;
    this.cam.offY = 0.5 - cf - (ext.y0 + ext.y1) / 4;
    this.camera.setViewOffset(1, 1, this.cam.offX, this.cam.offY, 1, 1);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.fx = { focusY: 1 - cf, band: hr * 0.42, falloff: this.compact ? 0.2 : 0.24 };
    if (this.scene.fog) this.scene.fog.density = this.arena.fogDensity * Math.min(1.2, 17 / hi);
  }

  /** Eases the camera toward a point of interest: shiftX in world units, zoom < 1 = closer. */
  focus({ shiftX = 0, zoom = 1, rate = 3 } = {}) {
    Object.assign(this.cam.want, { shiftX, zoom, rate });
  }

  _updateCamera(dt, t) {
    const c = this.cam, w = c.want;
    c.zoom = damp(c.zoom, w.zoom, w.rate, dt);
    c.shiftX = damp(c.shiftX, w.shiftX, w.rate, dt);
    const yaw = Math.sin(t * 0.13) * 0.022 + Math.sin(t * 0.051 + 1) * 0.012;
    const D = c.dist * c.zoom * (1 + Math.sin(t * 0.21) * 0.006);
    const cam = this.camera;
    _v.copy(this._camDir).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw).multiplyScalar(D);
    _w.set(c.target.x + c.shiftX, c.target.y + Math.sin(t * 0.17) * 0.04, c.target.z);
    cam.position.copy(_w).add(_v);
    cam.lookAt(_w);
    cam.updateMatrixWorld();
  }

  // ------------------------------------------------------------------ per frame

  update(dt, t) {
    this.time += dt;
    if (Math.abs(this.engine.size.aspect - this.aspect) > 1e-3) this.layout();
    this.timeline.update(dt);
    for (const a of this.actors.values()) a.update(dt, this.time);
    this.particles.update(dt);
    this._updateCamera(dt, this.time);
    this.effects.update(dt);
    this.arena.update(dt, this.time, this.camera);
  }

  /** Builds lazy GPU resources now (auras, effect textures, shaders) so the battle never hitches. */
  warm() {
    for (const a of this.actors.values()) {
      a.sprite.setGlow('#ffffff', 1);
      a.sprite.setGlow(null);
    }
    this._updateCamera(0, 0);
    this.effects.warm(this.engine.renderer);
  }

  // ------------------------------------------------------------------ helpers

  actor(id) { return this.actors.get(id) || null; }

  wait(sec) { return this.timeline.wait(sec); }

  tween(sec, fn, easing) { return this.timeline.tween(sec, fn, easing); }

  /** Tweens an actor's stand position to `to`. */
  move(a, to, sec, easing = ease.inOutQuad) {
    const from = a.base.clone();
    const dest = to.clone();
    return this.tween(sec, (k) => a.base.lerpVectors(from, dest, k), easing);
  }

  /** Where the active party member stands while choosing a command. */
  readyPos(a, out = new THREE.Vector3()) {
    return out.copy(a.home).add(_v.set(-READY_STEP, 0, 0.05));
  }

  /** Where a melee attacker stands to strike `target`. */
  strikePos(attacker, target, out = new THREE.Vector3()) {
    const dir = target.side === 'enemy' ? 1 : -1;
    return out.set(target.base.x + target.artCx + dir * (target.halfW + attacker.halfW + 0.12), 0, target.base.z + 0.2);
  }

  /** Short shove away from the attacker that springs back. */
  knock(a, dir, amount = 0.28) {
    return this.tween(0.32, (k, raw) => {
      const s = raw < 0.18 ? raw / 0.18 : 1 - (raw - 0.18) / 0.82;
      a.off.x = dir * amount * Math.max(0, s);
    }, ease.linear);
  }

  /** Projected rectangle of an actor's art (CSS px): { x, y, w, h, cx, cy }. */
  screenRect(a, out = { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 }) {
    const p = a.object3d.position;
    const fh = a.sheet.frameH;
    const x = p.x + (a.sprite.flipX ? -a.artCx : a.artCx), hw = a.halfW;
    const lo = (fh - 1 - a.art.y1) / 32, hi = (fh - a.art.y0) / 32;
    _corners[0].set(x - hw, p.y + lo * COS_T, p.z - lo * SIN_T);
    _corners[1].set(x + hw, p.y + lo * COS_T, p.z - lo * SIN_T);
    _corners[2].set(x - hw, p.y + hi * COS_T, p.z - hi * SIN_T);
    _corners[3].set(x + hw, p.y + hi * COS_T, p.z - hi * SIN_T);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of _corners) {
      this.engine.projectToScreen(c, _scr);
      x0 = Math.min(x0, _scr.x); x1 = Math.max(x1, _scr.x);
      y0 = Math.min(y0, _scr.y); y1 = Math.max(y1, _scr.y);
    }
    out.x = x0; out.y = y0; out.w = x1 - x0; out.h = y1 - y0; out.cx = (x0 + x1) / 2; out.cy = (y0 + y1) / 2;
    return out;
  }

  /** Stereo pan (-1..1) for a world point, from its screen x. */
  pan(p) {
    this.engine.projectToScreen(p, _scr);
    return Math.max(-1, Math.min(1, (_scr.x / Math.max(1, this.engine.size.width)) * 2 - 1)) * 0.7;
  }

  partyCenterX() {
    let s = 0;
    for (const a of this.party) s += a.home.x;
    return this.party.length ? s / this.party.length : 0;
  }

  dispose() {
    this.timeline.clear();
    for (const a of this.actors.values()) a.dispose();
    this.actors.clear();
    for (const e of this.emitters) e.remove();
    this.effects.dispose();
    this.particles.dispose();
    this.arena.dispose();
    this.scene.clear();
  }
}

