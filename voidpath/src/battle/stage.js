// Battle stage: the 3D arena, the combatant sprites, the camera rig and a game-time timeline.
// Enemies stand on the LEFT and the party on the RIGHT in a staggered diagonal (back member up-right,
// front member down-left). The camera is fitted to the combatants for any aspect ratio (portrait phones
// get a compressed formation) and drifts gently; a view offset keeps the combatant line clear of the UI.
//
// Party formations depend on the party size (PARTY_LAYOUTS). Bosses stand at BOSS_SLOT with their adds
// at ADD_SLOTS; EnemyDef.stage = { slot: [x, z], scale, spawn: 'holo' | 'rise', size: { w, h } }
// overrides the slot, scales the sprite, picks the summon entrance and sizes a missing art's
// placeholder. The camera fit uses each enemy art's fitBox, so huge bosses may bleed off-frame
// instead of shrinking the party. Mid-battle changes: addCombatant (summons), transform (sheet swap),
// setUntargetable (submerge / phase / shield). Enemy art keys come from the combatant (`art`), else
// ENEMIES[kind].art, else the kind; ENEMIES[kind].tint multiplies the sprite.
//
// Every choreography primitive returns a promise resolved by stage.update(dt): game time, so
// engine.hitStop() freezes them along with the sprites and particles.

import * as THREE from 'three';
import { SpriteActor } from '../core/spriteActor.js';
import { Particles, hasPreset } from '../core/particles.js';
import { buildBattleSprite } from '../art/characters.js';
import { buildEnemySprite } from '../art/enemies.js';
import { ENEMIES } from './data.js';
import { buildArena } from './arena.js';
import { Effects } from './effects.js';
import { release } from '../core/programs.js';
import { damp, ease } from '../core/util.js';

const FOV = 30;
// highest screen fraction a fitBox core may reach (just under the turn bar)
const CORE_TOP = { compact: 0.12, wide: 0.1 };
const PITCH = THREE.MathUtils.degToRad(26);
const TILT = 0.36;                 // sprites lean back a little less than the camera pitch
const COS_T = Math.cos(TILT), SIN_T = Math.sin(TILT);
const READY_STEP = 0.5;            // how far the active party member steps toward the enemies

// [x, z] formation slots by party size. Party: back (up-right) -> front (down-left).
export const PARTY_LAYOUTS = {
  1: [[3.2, 0.3]],
  2: [[4.0, -1.3], [2.8, 1.5]],
  3: [[4.3, -2.2], [3.3, 0.3], [2.3, 2.8]],
  4: [[4.5, -2.6], [3.6, -0.65], [2.7, 1.3], [1.8, 3.25]],
};
// Enemy slots per count, in the order bigger enemies take them (middle / back first).
const ENEMY_SLOTS = {
  1: [[-3.2, 0.2]],
  2: [[-3.7, -1.9], [-2.5, 2.0]],
  3: [[-4.5, 0.3], [-2.7, -2.3], [-2.5, 2.7]],
  4: [[-4.5, 0.3], [-2.6, -2.3], [-2.4, 2.7], [-5.6, -1.9]],
};
export const BOSS_SLOT = [-4.2, -0.8];
export const ADD_SLOTS = [[-1.9, -2.9], [-1.7, 3.0], [-6.3, 2.4]];
// where summons appear in regular fights (and in boss fights once the add slots are taken)
const EXTRA_SLOTS = [[-4.5, 0.3], [-2.6, -2.3], [-2.4, 2.7], [-5.6, -1.9], [-1.4, 0.4], [-6.2, 2.6], [-5.8, -3.6]];
const SLOT_GAP = 1.7;

// Party battle frames (64x64, facing left): body centre, casting hand, rifle muzzle, head top.
const PARTY_POINTS = {
  center: [35, 38], hand: [21, 31], muzzle: [21, 31], top: [35, 12], feet: [35, 63],
};
const NYX_MUZZLE = [7, 27];
const HOVER = { drone: 0.08, sentinel: 0.05 };
const KO_TINT = '#7d8699';

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _qi = new THREE.Quaternion();
const _box = new THREE.Box3();
const _corners = Array.from({ length: 4 }, () => new THREE.Vector3());
const _scr = { x: 0, y: 0, visible: false };

const preset = (name, fallback) => (hasPreset(name) ? name : fallback);

/** Art key of an enemy combatant (or kind). */
export function enemyArt(c) {
  return c.art || ENEMIES[c.key]?.art || c.key;
}

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
    this.emissive = emissive;
    this.alive = c.alive !== false;
    this.object3d = new THREE.Group();       // stand position; the sprite (swapped on transform) lives inside
    this.home = new THREE.Vector3();
    this.base = new THREE.Vector3();   // tweened stand position
    this.off = new THREE.Vector3();    // knockback / recoil offset
    this.slot = null;                  // [x, z] formation slot before the compact squeeze
    this.sink = 0;                     // 0..1: sunk into the floor (submerge, rise-in summons)
    this.phase = Math.random() * 6;
    this.idleAnim = 'idle';
    this.hurtT = 0;
    this.untargetable = null;          // null | 'submerge' | 'phase' | 'shield'
    this.emitter = null;               // break sparks
    this.aura = null;                  // boost motes (follows the actor)
    this.setKind(c.key, c.art);
  }

  /** (Re)builds the sprite for a kind (transforms swap the sheet in place). */
  setKind(kind, art = null) {
    this.key = kind;
    const def = this.side === 'enemy' ? ENEMIES[kind] : null;
    this.def = def;
    this.art = this.side === 'party' ? kind : art || def?.art || kind;
    const sheet = this.side === 'party'
      ? buildBattleSprite(kind)
      : buildEnemySprite(this.art, { size: def?.stage?.size || (def?.boss ? { w: 128, h: 128 } : null) });
    const old = this.sprite;
    const prev = old ? { flipX: old.flipX, opacity: old.opacity, hologram: old.hologram } : null;
    this.sheet = sheet;
    this.sprite = new SpriteActor(sheet, { tilt: TILT, emissiveIntensity: this.emissive, shadowScale: this.art === 'drone' ? 0.8 : 1 });
    if (old) {
      old.object3d.removeFromParent();
      old.dispose();
    }
    this.object3d.add(this.sprite.object3d);
    this.scale = def?.stage?.scale || 1;
    this.sprite.object3d.scale.setScalar(this.scale);
    this.tint = def?.tint || null;
    this.sprite.setTint(this.tint);
    const b = this.sprite.bounds;
    const cx = (b.x0 + b.x1 + 1) / 2;
    this.art2d = b;
    this.points = this.side === 'party'
      ? { ...PARTY_POINTS, muzzle: kind === 'nyx' ? NYX_MUZZLE : PARTY_POINTS.muzzle }
      : { feet: [cx, sheet.frameH], ...sheet.points };
    this.points.bottom = [cx, b.y1 + 1];
    // the box the camera keeps in frame (frame px): the art's fitBox, else its opaque bounds
    const fb = sheet.fitBox;
    this.fit = fb ? { x0: fb[0], y0: fb[1], x1: fb[0] + fb[2] - 1, y1: fb[1] + fb[3] - 1 } : { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
    const s = this.scale;
    this.artCx = ((cx - sheet.frameW / 2) / 32) * s;      // art centre relative to the pivot (world units)
    this.halfW = this.side === 'party' ? 0.45 : ((b.x1 - b.x0 + 1) / 64) * s;
    this.size = this.side === 'party' ? 1 : Math.max(0.8, ((b.y1 - b.y0 + 1) / 40) * s);
    this.height = (sheet.frameH / 32) * s;
    this.hover = this.side === 'enemy' ? def?.stage?.hover ?? HOVER[this.art] ?? 0 : 0;
    if (prev) {
      this.sprite.flipX = prev.flipX;
      this.sprite.setOpacity(prev.opacity);
      this.sprite.hologram = prev.hologram;
    }
    this.sprite.play(this.has(this.idleAnim) ? this.idleAnim : 'idle');
  }

  has(anim) {
    return !!this.sheet.anims[anim];
  }

  /** Back to the resting animation (idle / ready / defend / break / ko). */
  rest(anim = this.idleAnim) {
    this.idleAnim = this.has(anim) ? anim : 'idle';
    this.hurtT = 0;
    this.sprite.play(this.idleAnim);
  }

  /** Holds the hurt frame for `sec`, then returns to the resting animation. */
  hurt(sec = 0.3) {
    if (!this.has('hurt')) return;
    this.sprite.play('hurt', { restart: true });
    this.hurtT = sec;
  }

  /** Plays a one-shot animation (if the sheet has it), then returns to the resting one. */
  oneShot(anim) {
    if (!this.has(anim)) anim = 'attack';
    if (!this.has(anim)) return;
    const restAnim = this.idleAnim;
    this.sprite.play(anim, { restart: true, onEnd: () => { if (this.sprite.currentAnim === anim) this.sprite.play(restAnim); } });
  }

  /** The multiply tint this actor rests at (its def's tint; grey while KO'd). */
  restTint() {
    this.sprite.setTint(this.alive || this.side === 'enemy' ? this.tint : KO_TINT);
  }

  /** World position of a named point of the art (center, top, muzzle, hand, core, feet). */
  point(name, out = new THREE.Vector3()) {
    const p = this.points[name] || this.points.center;
    const sh = this.sheet;
    const s = this.scale;
    let lx = ((p[0] - sh.frameW / 2) / 32) * s;
    if (this.sprite.flipX) lx = -lx;
    const ly = ((sh.frameH - p[1]) / 32) * s;
    return out.set(lx, ly * COS_T, -ly * SIN_T).add(this.object3d.position);
  }

  update(dt, t) {
    if (this.hurtT > 0 && (this.hurtT -= dt) <= 0) this.sprite.play(this.idleAnim);
    this.sprite.update(dt);
    const o = this.object3d.position;
    o.copy(this.base).add(this.off);
    if (this.hover && this.alive && !this.sink) o.y += this.hover * (1 + Math.sin(t * 2.3 + this.phase));
    if (this.sink) o.y -= this.sink * this.height * COS_T;
    if (this.sprite.blob) this.sprite.blob.visible = this.sink < 0.35;
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
   * sides, kinds, arts and alive flags only); arena: arena name override.
   */
  constructor(engine, { encounter, combatants }) {
    this.engine = engine;
    this.encounter = encounter;
    this.scene = new THREE.Scene();
    this.scene.userData.perf = 'battle';   // perf.js measures only the first battle of a session (11.6)
    this.camera = new THREE.PerspectiveCamera(FOV, engine.size.aspect, 0.1, 160);
    this.timeline = new Timeline();
    this.arena = buildArena(this.scene, encounter.backdrop, { quality: engine.quality });
    this.particles = new Particles(this.scene, { max: 3600 });
    this.effects = new Effects(this.scene, this.camera, this.particles);
    Object.assign(this.arena.kit, { particles: this.particles, effects: this.effects, engine });
    this.emitters = this.arena.emitters.map(([name, opts]) => this.particles.addEmitter(name, opts));

    this.actors = new Map();
    this.party = [];
    this.enemies = [];
    for (const c of combatants) this._add(c);
    this.boss = !!encounter.boss || this.enemies.some((a) => a.def?.boss);
    this._assignSlots();

    this.compact = null;
    this.aspect = 0;
    this.fx = { focusY: 0.5, band: 0.2, falloff: 0.26 };
    this.cam = {
      target: new THREE.Vector3(), dist: 16, offX: 0, offY: 0, zoom: 1, shiftX: 0,
      want: { zoom: 1, shiftX: 0, rate: 3 },
    };
    this._goal = null;                 // camera fit the rig eases toward (summons, transforms, rotation)
    this._camDir = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
    this._camQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -PITCH);
    this.time = 0;
    this.readyId = null;               // party member standing forward to choose a command
    this._rehome = false;
    this._warmFrames = 0;
    this.layout(true);
  }

  _add(c) {
    const a = new BattleActor(c, { emissive: c.side === 'party' ? 1.8 : 2.2 });
    this.actors.set(a.id, a);
    (a.side === 'party' ? this.party : this.enemies).push(a);
    this.scene.add(a.object3d);
    if (!a.alive) {
      a.rest('ko');
      a.sprite.setTint(KO_TINT);
    }
    return a;
  }

  // ------------------------------------------------------------------ layout + camera

  /** Formation slots for the starting combatants. */
  _assignSlots() {
    const layout = PARTY_LAYOUTS[Math.min(4, Math.max(1, this.party.length))];
    this.party.forEach((a, i) => { a.slot = layout[i % layout.length]; });
    const fixed = this.enemies.filter((a) => a.def?.stage?.slot);
    for (const a of fixed) a.slot = a.def.stage.slot;
    const rest = this.enemies.filter((a) => !a.slot);
    if (this.boss) {
      const bosses = rest.filter((a) => a.def?.boss);
      const adds = rest.filter((a) => !a.def?.boss);
      if (bosses.length && !fixed.some((a) => a.def?.boss)) bosses.shift().slot = BOSS_SLOT;
      for (const a of [...bosses, ...adds]) a.slot = this._freeSlot(ADD_SLOTS) || this._freeSlot(EXTRA_SLOTS, true);
    } else {
      const slots = ENEMY_SLOTS[Math.min(4, Math.max(1, this.enemies.length))];
      const bySize = [...rest].sort((a, b) => b.sheet.frameH * b.sheet.frameW - a.sheet.frameH * a.sheet.frameW);
      bySize.forEach((a, i) => { a.slot = i < slots.length ? slots[i] : this._freeSlot(EXTRA_SLOTS, true); });
    }
  }

  /** The first slot of `list` clear of every living enemy (or, with `best`, the most open one). */
  _freeSlot(list, best = false) {
    const taken = this.enemies.filter((a) => a.slot && a.alive).map((a) => a.slot);
    const gap = (s) => taken.reduce((m, t) => Math.min(m, Math.hypot(s[0] - t[0], s[1] - t[1])), Infinity);
    const free = list.find((s) => gap(s) >= SLOT_GAP);
    if (free || !best) return free || null;
    return list.reduce((a, b) => (gap(b) > gap(a) ? b : a));
  }

  _homeOf(a) {
    const c = this.compact;
    const [x, z] = a.slot;
    const sz = c ? 1.08 : 1;
    if (a.side === 'party') a.home.set(x * (c ? 0.52 : 1) + (c ? 0.6 : 0), 0, z * sz);
    else a.home.set(x * (c ? (a.slot === BOSS_SLOT ? 0.5 : 0.56) : 1) - (c ? 0.4 : 0), 0, z * sz);
  }

  /** Places everyone at their formation slots for the current aspect (snap = no tween). */
  layout(snap = false) {
    const aspect = this.engine.size.aspect;
    const compact = aspect < 0.9;
    this.aspect = aspect;
    if (compact !== this.compact) {
      this.compact = compact;
      for (const a of this.actors.values()) this._homeOf(a);
      // mid-action homes move; actors step to them as soon as the choreography is idle (R19)
      if (snap || !this.timeline.busy) this._snapHomes();
      else this._rehome = true;
    }
    this._fit(snap);
  }

  _snapHomes() {
    this._rehome = false;
    for (const a of this.actors.values()) {
      if (a.id === this.readyId && a.alive) this.readyPos(a, a.base);
      else a.base.copy(a.home);
    }
  }

  /**
   * Fits camera distance + view offset so every combatant sits inside the UI-free band. An enemy art
   * with a fitBox only needs that core rect on screen: it may rise above the band (up to CORE_TOP, the
   * top bar's edge) and the rest of the art bleeds past the frame, so a huge boss does not shrink the
   * party on phones.
   */
  _fit(snap = true) {
    const aspect = this.engine.size.aspect;
    const short = !this.compact && this.engine.size.height < 520;
    const [top, bottom] = this.compact ? [0.17, 0.53] : short ? [0.16, 0.8] : [0.15, 0.71];
    const coreTop = this.compact ? CORE_TOP.compact : CORE_TOP.wide;
    const hr = bottom - top;
    const cf = (top + bottom) / 2;
    const pts = [], cores = [];
    _box.makeEmpty();
    for (const a of this.actors.values()) {
      if (a.side === 'enemy' && !a.alive) continue;
      const f = a.fit, fh = a.sheet.frameH, s = a.scale;
      const yTop = ((fh - f.y0) / 32) * s, yBot = a.sheet.fitBox ? ((fh - 1 - f.y1) / 32) * s : 0;
      const x = a.home.x + ((f.x0 + f.x1 + 1) / 2 - a.sheet.frameW / 2) / 32 * s;
      const hw = a.side === 'party' ? a.halfW : ((f.x1 - f.x0 + 1) / 64) * s;
      const list = a.side === 'enemy' && a.sheet.fitBox ? cores : pts;
      for (const y of [yBot, yTop]) {
        list.push(new THREE.Vector3(x - hw, y * COS_T, a.home.z - y * SIN_T), new THREE.Vector3(x + hw, y * COS_T, a.home.z - y * SIN_T));
      }
    }
    for (const p of pts) _box.expandByPoint(p);
    for (const p of cores) _box.expandByPoint(p);
    const target = _box.getCenter(new THREE.Vector3());
    const tanV = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const tanH = tanV * aspect;
    _qi.copy(this._camQuat).invert();
    // NDC extents at distance D: the band's spans must fit, then a view offset places them (centred in
    // the band when it can). fitBox cores share the horizontal span; vertically they only have to stay
    // between coreTop and the band bottom, which may push the party lower in the band.
    const ext = { x0: 0, x1: 0, y0: 0, y1: 0 };
    const core = { y0: 0, y1: 0 };
    let place = cf;
    const project = (p, D) => {
      _w.copy(p).sub(target).addScaledVector(this._camDir, -D).applyQuaternion(_qi);
      const z = Math.max(0.05, -_w.z);
      return _w.set(_w.x / (z * tanH), _w.y / (z * tanV), 0);
    };
    const measure = (D) => {
      ext.x0 = ext.y0 = core.y0 = Infinity;
      ext.x1 = ext.y1 = core.y1 = -Infinity;
      for (const p of pts) {
        const n = project(p, D);
        if (n.x < ext.x0) ext.x0 = n.x;
        if (n.x > ext.x1) ext.x1 = n.x;
        if (n.y < ext.y0) ext.y0 = n.y;
        if (n.y > ext.y1) ext.y1 = n.y;
      }
      for (const p of cores) {
        const n = project(p, D);
        if (n.x < ext.x0) ext.x0 = n.x;
        if (n.x > ext.x1) ext.x1 = n.x;
        if (n.y < core.y0) core.y0 = n.y;
        if (n.y > core.y1) core.y1 = n.y;
      }
      if (!pts.length) { ext.y0 = core.y0; ext.y1 = core.y1; }
      if (ext.x1 - ext.x0 > (this.compact ? 1.62 : 1.8) || ext.y1 - ext.y0 > 2 * hr * 0.97) return false;
      place = cf;
      if (!cores.length) return true;
      // screen fraction of NDC y: place - (y - mid) / 2
      const mid = (ext.y0 + ext.y1) / 2, h = (ext.y1 - ext.y0) / 2;
      const lo = Math.max(top + h / 2, coreTop + (core.y1 - mid) / 2);
      const hi = Math.min(bottom - h / 2, bottom - (mid - core.y0) / 2);
      place = Math.min(hi, Math.max(lo, cf));
      return lo <= hi;
    };
    let lo = 4, hi = 160;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (measure(mid)) hi = mid; else lo = mid;
    }
    measure(hi);
    this._goal = { target, dist: hi, offX: (ext.x0 + ext.x1) / 4, offY: 0.5 - place - (ext.y0 + ext.y1) / 4 };
    this.fx = { focusY: 1 - place, band: hr * 0.42, falloff: this.compact ? 0.2 : 0.24 };
    if (snap) this._applyFit(1);
  }

  /** Moves the camera rig toward the fit goal (k = 1 snaps). */
  _applyFit(k) {
    const g = this._goal, c = this.cam;
    if (!g) return;
    const done = k >= 1 || (Math.abs(g.dist - c.dist) < 1e-3 && c.target.distanceToSquared(g.target) < 1e-6);
    const f = done ? 1 : k;
    c.target.lerp(g.target, f);
    c.dist += (g.dist - c.dist) * f;
    c.offX += (g.offX - c.offX) * f;
    c.offY += (g.offY - c.offY) * f;
    if (done) this._goal = null;
    this.camera.setViewOffset(1, 1, c.offX, c.offY, 1, 1);
    this.camera.aspect = this.engine.size.aspect;
    this.camera.updateProjectionMatrix();
    if (this.scene.fog) this.scene.fog.density = this.arena.fogDensity * Math.min(1.2, 17 / c.dist);
  }

  /** Eases the camera toward a point of interest: shiftX in world units, zoom < 1 = closer. */
  focus({ shiftX = 0, zoom = 1, rate = 3 } = {}) {
    Object.assign(this.cam.want, { shiftX, zoom, rate });
  }

  _updateCamera(dt, t) {
    const c = this.cam, w = c.want;
    if (this._goal) this._applyFit(1 - Math.exp(-4 * dt));
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

  update(dt) {
    this.time += dt;
    if (Math.abs(this.engine.size.aspect - this.aspect) > 1e-3) this.layout();
    this.timeline.update(dt);
    if (this._rehome && !this.timeline.busy) this._snapHomes();
    for (const a of this.actors.values()) a.update(dt, this.time);
    this.particles.update(dt);
    this._updateCamera(dt, this.time);
    this.effects.update(dt);
    this.arena.update(dt, this.time, this.camera);
    if (this._warmFrames > 0 && --this._warmFrames === 0) this._endWarm();
  }

  /**
   * Builds lazy GPU resources now so the battle never hitches: uploads every sprite and effect
   * texture and keeps the auras and an effect quad drawn (invisibly) for the first frames, so the
   * engine's compile and the first frames link their programs behind the cover (R11).
   */
  warm() {
    const r = this.engine.renderer;
    for (const a of this.actors.values()) this._warmActor(a);
    // empty particle pools are hidden; show them for the compile so the first burst links nothing
    for (const pool of this.particles.pools) pool.points.visible = true;
    this._updateCamera(0, 0);
    this.effects.warm(r);
    this._warmFrames = 3;
  }

  _warmActor(a) {
    // the aura first (it creates the glow sheet), then the sheet and glow uploads (SpriteActor.warm)
    a.sprite.setGlow('#000000', 1);
    a.sprite.warm(this.engine.renderer);
    a._warmGlow = true;
  }

  _endWarm() {
    for (const a of this.actors.values()) {
      if (!a._warmGlow) continue;
      a._warmGlow = false;
      if (!a.aura && !a.glowColor) a.sprite.setGlow(null);
    }
    this.effects.endWarm();
  }

  // ------------------------------------------------------------------ mid-battle changes

  /**
   * Adds a combatant mid-battle (summons) at a free slot and plays its entrance: 'holo' flickers in
   * as a hologram, 'rise' climbs out of the floor. Resolves when the entrance is over.
   */
  async addCombatant(c, { style } = {}) {
    if (this.actors.has(c.id)) return this.actors.get(c.id);
    const a = this._add({ ...c, side: 'enemy', alive: true });
    a.slot = a.def?.stage?.slot || (this.boss ? this._freeSlot(ADD_SLOTS) : null) || this._freeSlot(EXTRA_SLOTS, true);
    this._homeOf(a);
    a.base.copy(a.home);
    this._warmActor(a);
    this._warmFrames = Math.max(this._warmFrames, 2);
    this._fit(false);
    const how = style || a.def?.stage?.spawn || 'holo';
    const c0 = a.point('center');
    if (how === 'rise') {
      a.sink = 1;
      a.sprite.setOpacity(0.01);
      this.particles.emit('smoke', a.object3d.position, { count: 10 + Math.round(4 * a.size) });
      this.particles.emit('spark', a.object3d.position, { count: 12, direction: [0, 1, 0] });
      this.effects.sheet('ring', a.object3d.position.clone().setY(0.03), { floor: true, scale: 2 * Math.sqrt(a.size), color: '#9dff7a', intensity: 2 });
      await this.tween(0.6, (k) => { a.sink = 1 - k; a.sprite.setOpacity(Math.min(1, 0.01 + k * 1.6)); }, ease.outBack);
      a.sink = 0;
    } else {
      a.sprite.hologram = true;
      a.sprite.setOpacity(0.01);
      this.particles.emit('holo', c0, { count: 24, spread: 0.5 * a.size });
      this.effects.sheet('ring', c0, { scale: 1.3 * Math.sqrt(a.size), color: '#7fe3ff', intensity: 2.2 });
      await this.tween(0.5, (k) => a.sprite.setOpacity(k < 0.6 ? (Math.sin(k * 60) > 0 ? k : k * 0.3) : k), ease.linear);
      a.sprite.hologram = false;
      a.sprite.setOpacity(1);
      a.sprite.flash('#bff4ff', 0.3);
    }
    return a;
  }

  /**
   * Transform: white flash, shake, shard burst, then the sheet swap and a re-warmed aura. `kind` is
   * the new enemy kind (its def's art, tint and stage scale apply) or, for a kind without a def, an art key.
   */
  async transform(id, kind) {
    const a = this.actor(id);
    if (!a) return;
    const c = a.point(a.points.core ? 'core' : 'center');
    this.engine.flash('#ffffff', 0.32, 0.8);
    this.engine.shake(0.24, 0.6);
    a.sprite.flash('#ffffff', 0.45);
    this.particles.emit('break', c, { count: Math.round(30 * Math.min(2.2, a.size)) });
    this.effects.shards(c, { count: 16, scale: Math.sqrt(a.size), color: '#e8f4ff' });
    this.effects.sheet('ring', c, { scale: 2.2 * Math.sqrt(a.size), color: '#ffffff', intensity: 2.6 });
    await this.wait(0.18);
    const glow = a.glowColor;
    a.setKind(kind);
    a.alive = true;
    a.rest('idle');
    this._warmActor(a);
    if (glow) a.sprite.setGlow(glow, a.glowStrength || 1);
    this._warmFrames = Math.max(this._warmFrames, 2);
    a.sprite.flash('#ffffff', 0.5);
    this._fit(false);
    await this.wait(0.3);
  }

  /**
   * Untargetable states: 'submerge' sinks into the floor and fades out with frost, 'phase' glitches to
   * 35% opacity, 'shield' wraps the foe in a hard-light bubble. on = false reverses it.
   */
  async setUntargetable(id, on, style = 'submerge') {
    const a = this.actor(id);
    if (!a) return;
    const was = a.untargetable;
    a.untargetable = on ? style : null;
    const kind = on ? style : was || style;
    const c = a.point('center');
    if (kind === 'submerge') {
      const feet = a.object3d.position.clone().setY(0.05);
      this.particles.emit(preset('snow', 'frost'), feet, { count: 30, spread: a.halfW + 0.4 });
      this.particles.emit('smoke', feet, { count: 8, color: '#cfefff' });
      this.particles.emit('cryo', feet, { count: 16 });
      this.effects.sheet('ring', feet, { floor: true, scale: 2.6 * Math.sqrt(a.size), color: '#9fe9ff', intensity: 2 });
      if (on) await this.tween(0.75, (k) => { a.sink = k * 0.92; a.sprite.setOpacity(1 - k); }, ease.inQuad);
      else {
        this.engine.shake(0.14, 0.35);
        this.effects.shards(feet.setY(0.4), { count: 12, scale: 0.8, color: '#cfefff' });
        await this.tween(0.55, (k) => { a.sink = 0.92 * (1 - k); a.sprite.setOpacity(k); }, ease.outCubic);
        a.sink = 0;
      }
    } else if (kind === 'phase') {
      this.particles.emit(preset('glitch', 'void'), c, { count: 26, spread: 0.6 * a.size });
      const to = on ? 0.35 : 1, from = a.sprite.opacity;
      a.sprite.setTint(on ? '#ff8ae8' : a.tint);
      await this.tween(0.6, (k, raw) => a.sprite.setOpacity(raw < 0.85 ? (Math.sin(raw * 70) > 0.2 ? from + (to - from) * k : to * 0.5) : to), ease.linear);
      a.sprite.setOpacity(to);
      a.sprite.setTint(on ? '#e6b8ff' : a.tint);
    } else {
      this.effects.sheet('ring', c, { scale: 2 * Math.sqrt(a.size), color: '#7fe3ff', intensity: 2.4 });
      this.particles.emit('holo', c, { count: 20, spread: 0.6 * a.size });
      if (on) {
        a.glowColor = '#7fe3ff';
        a.glowStrength = 1.4;
        a.sprite.setGlow('#7fe3ff', 1.4);
      } else {
        a.glowColor = null;
        a.sprite.setGlow(null);
        this.effects.shards(c, { count: 10, scale: Math.sqrt(a.size), color: '#bfefff' });
      }
      await this.wait(0.35);
    }
  }

  /** Arena reaction to transform / untargetable / break / cue events. */
  react(event) {
    this.arena.react(event);
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
    const fh = a.sheet.frameH, s = a.scale;
    const x = p.x + (a.sprite.flipX ? -a.artCx : a.artCx), hw = a.halfW;
    // a sunk foe (submerged, rising in) keeps its plate and hit box where it stands
    const y = p.y + a.sink * a.height * COS_T;
    const lo = ((fh - 1 - a.art2d.y1) / 32) * s, hi = ((fh - a.art2d.y0) / 32) * s;
    _corners[0].set(x - hw, y + lo * COS_T, p.z - lo * SIN_T);
    _corners[1].set(x + hw, y + lo * COS_T, p.z - lo * SIN_T);
    _corners[2].set(x - hw, y + hi * COS_T, p.z - hi * SIN_T);
    _corners[3].set(x + hw, y + hi * COS_T, p.z - hi * SIN_T);
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

  /** Releases everything: sprites (and their glow sheets), effects, particles, the arena. */
  dispose() {
    this.timeline.clear();
    for (const a of this.actors.values()) a.dispose();
    this.actors.clear();
    for (const e of this.emitters) e.remove();
    this.effects.dispose();
    // Particles.dispose() would dispose its materials and free their programs: release them instead
    for (const pool of this.particles.pools) {
      pool.points.removeFromParent();
      pool.geo.dispose();
      release(pool.mat);
    }
    this.arena.dispose();
    this.scene.clear();
  }
}
