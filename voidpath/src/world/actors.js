// NPC actors (TECH_PLAN 3.6): a SpriteActor standing in a World with facing, poses, scripted
// walks, fades, BOLT's hover and HALCYON's projector.
//
// export class NpcActor {
//   constructor(world, def)
//     def: NpcDef { id, sprite, x, z, facing = 'down', name, talk, when, hologram = false,
//                   shadow = true, scale = 1, pose, idle: { anim, ... } }
//     extra fields: hover (bob like BOLT; default for sprite 'bolt'), projector (the holo disc under
//     'holo'; default true). Colliders, talk and idle paths are the World's (it calls walkTo / play).
//     sprite: party id or registered character -> buildFieldSprite; 'bolt' | 'holo' -> buildNpcSprite;
//             'enemy:<art>' -> buildEnemySprite (field bosses); unknown ids draw the art fallback
//   id; def; actor (SpriteActor); x; z; facing; visible; walking; pose
//   face(dirOrPoint)                   'up' | 'down' | 'left' | 'right' or { x, z } / [x, z]
//   play(anim)                         a sheet anim or a pose (held until the next move or play(null)); null = idle
//   walkTo(points, { speed = 2.4, run = false }) -> Promise   [[x, z], ...]; collision ignored
//   hurry(k)          multiply the speed of the walk in flight (cutscene skip)
//   setVisible(on, { fade = 0 }) -> Promise
//   setPosition(x, z, facing?)         teleport (cancels a walk)
//   update(dt, t); dispose()
// }
//
// The World calls update(dt, t) every frame (W.addActor / its own npc list) and dispose() with the map.

import * as THREE from 'three';
import { SpriteActor } from '../core/spriteActor.js';
import { makeGlow } from '../core/vfx.js';
import { buildFieldSprite, buildNpcSprite, poseAnim } from '../art/characters.js';
import { buildEnemySprite } from '../art/enemies.js';
import { primeEmotes } from './emotes.js';

const STRIDE = 0.42;        // world units per walk frame (matches the player)
const VIEW = { down: 'down', up: 'up', left: 'side', right: 'side' };

function sheetFor(sprite) {
  if (sprite.startsWith('enemy:')) return buildEnemySprite(sprite.slice(6));
  const id = sprite.startsWith('npc:') ? sprite.slice(4) : sprite;
  return id === 'bolt' || id === 'holo' ? buildNpcSprite(id) : buildFieldSprite(id);
}

/** Facing from a direction vector (dominant axis; ties prefer down/up). */
function facingOf(dx, dz, fallback) {
  if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return fallback;
  return Math.abs(dx) > Math.abs(dz) * 1.15 ? (dx > 0 ? 'right' : 'left') : dz > 0 ? 'down' : 'up';
}

export class NpcActor {
  constructor(world, def) {
    this.world = world;
    this.def = def;
    primeEmotes(world);
    this.id = def.id;
    const sprite = def.sprite || 'holo';
    this.kind = sprite;
    this.sheet = sheetFor(sprite);
    this.isEnemy = sprite.startsWith('enemy:');
    this.hologram = !!def.hologram || (sprite === 'holo' && def.hologram !== false);
    this.actor = new SpriteActor(this.sheet, this.hologram
      ? { lit: false, castShadow: false, shadow: false }
      : { shadow: def.shadow !== false, shadowScale: sprite === 'bolt' ? 0.8 : 1, emissiveIntensity: sprite === 'bolt' ? 1.1 : 2.2 });
    if (this.hologram) this.actor.hologram = true;
    this.object3d = this.actor.object3d;
    this.object3d.scale.setScalar(def.scale || 1);
    this.x = def.x;
    this.z = def.z;
    this.facing = def.facing || (this.isEnemy ? 'right' : 'down');
    this.visible = true;
    this.walking = false;
    this.pose = null;
    this.hover = def.hover ?? sprite === 'bolt';
    this._walk = null;
    this._fade = null;
    this._ticked = 0;
    this._travel = 0;
    this._phase = (def.x * 1.7 + def.z * 0.9) % 6.28;
    this.object3d.position.set(this.x, 0, this.z);
    world.root.add(this.object3d);
    this._extras = [];
    if (sprite === 'holo' && def.projector !== false) this._projector();
    this.play(def.pose || (def.idle && def.idle.anim) || null);
  }

  /** HALCYON's projector disc, glow and glitter (the POC bridge hologram). */
  _projector() {
    const W = this.world;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.1, 20), W.mats.plain('#2a3349', { emissive: '#3fd6ff', emissiveIntensity: 0.6 }));
    disc.position.set(0, 0.05, 0);
    disc.receiveShadow = true;
    const glow = makeGlow('#45d4ff', 1.4, 0.8);
    glow.position.set(0, 0.18, 0.05);
    const g = new THREE.Group();
    g.add(disc, glow);
    g.position.set(this.x, 0, this.z);
    W.root.add(g);
    this._extras.push(g);
    this._emitter = W.addEmitter ? W.addEmitter('holo', { position: [this.x, 0.8, this.z], area: [0.5, 1.4, 0.3], rate: 6 }) : null;
  }

  // ---------------------------------------------------------------- facing and anims

  face(dir) {
    if (dir == null) return;
    let f = dir;
    if (typeof dir !== 'string') {
      const px = Array.isArray(dir) ? dir[0] : dir.x, pz = Array.isArray(dir) ? dir[1] : dir.z;
      f = facingOf(px - this.x, pz - this.z, this.facing);
    }
    if (!VIEW[f]) return;
    this.facing = f;
    if (!this.walking) this._show();
  }

  /** Sheet anim or pose name; null returns to the idle loop of the current facing. */
  play(anim) {
    this.pose = anim || null;
    if (!this.walking) this._show();
  }

  _show() {
    const A = this.actor;
    if (this.isEnemy) {
      A.flipX = this.facing === 'left';
      A.play(this.pose && this.sheet.anims[this.pose] ? this.pose : 'idle');
      return;
    }
    if (this.pose) {
      const r = poseAnim(this.sheet, this.pose, this.facing);
      if (r) {
        A.flipX = r.flipX ?? this.facing === 'left';
        A.play(r.anim);
        return;
      }
    }
    const idle = `idle_${VIEW[this.facing]}`;
    A.flipX = this.facing === 'left';
    A.play(this.sheet.anims[idle] ? idle : 'idle_down');
  }

  // ---------------------------------------------------------------- movement

  setPosition(x, z, facing) {
    this._finishWalk();
    this.x = x;
    this.z = z;
    if (facing) this.facing = facing;
    this._sync();
    this._show();
  }

  /** Walk through points [[x, z], ...] (or one { x, z }); resolves on arrival or when interrupted. */
  walkTo(points, { speed = 2.4, run = false } = {}) {
    this._finishWalk();
    const list = (Array.isArray(points) && typeof points[0] === 'number') ? [points]
      : Array.isArray(points) ? points.map((p) => (Array.isArray(p) ? p : [p.x, p.z]))
        : [[points.x, points.z]];
    if (!list.length) return Promise.resolve();
    this.pose = null;
    return new Promise((resolve) => {
      this._walk = { list, i: 0, speed: speed * (run ? 1.75 : 1), resolve };
      this.walking = true;
    });
  }

  /** Speed up the walk in flight by k (a cutscene skip that starts mid-walk). */
  hurry(k) {
    if (this._walk && k > 0) this._walk.speed *= k;
  }

  _finishWalk() {
    const w = this._walk;
    if (!w) return;
    this._walk = null;
    this.walking = false;
    this._show();
    w.resolve();
  }

  _stepWalk(dt) {
    const w = this._walk;
    let budget = w.speed * dt;
    while (budget > 0 && w.i < w.list.length) {
      const [tx, tz] = w.list[w.i];
      const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
      if (d < 1e-4) { w.i++; continue; }
      this.facing = facingOf(dx, dz, this.facing);
      const step = Math.min(d, budget);
      this.x += (dx / d) * step;
      this.z += (dz / d) * step;
      this._travel += step;
      budget -= step;
      if (step >= d - 1e-6) w.i++;
    }
    // distance-driven walk frames, as the player's
    const view = VIEW[this.facing];
    const anim = this.sheet.anims[`walk_${view}`];
    this.actor.flipX = this.facing === 'left';
    if (anim) this.actor.setFrame(anim.frames[Math.floor(this._travel / STRIDE) % anim.frames.length]);
    this._sync();
    if (w.i >= w.list.length) this._finishWalk();
  }

  _sync() {
    this.object3d.position.x = this.x;
    this.object3d.position.z = this.z;
    for (const e of this._extras) e.position.set(this.x, 0, this.z);
    if (this._emitter) { this._emitter.position.x = this.x; this._emitter.position.z = this.z; }
  }

  // ---------------------------------------------------------------- visibility

  setVisible(on, { fade = 0 } = {}) {
    on = !!on;
    if (this._fade) { this._fade.resolve(); this._fade = null; }
    if (fade <= 0) {
      this.visible = on;
      this.object3d.visible = on;
      for (const e of this._extras) e.visible = on;
      if (this._emitter) this._emitter.active = on;
      this.actor.setOpacity(on ? 1 : 0);
      return Promise.resolve();
    }
    this.visible = true;
    this.object3d.visible = true;
    for (const e of this._extras) e.visible = true;
    return new Promise((resolve) => {
      const from = this.actor.opacity;
      this._fade = { from, to: on ? 1 : 0, t: 0, dur: fade, resolve, on };
      // safety: a world that stops updating must not hang a script (a slow one keeps fading)
      const watch = () => {
        if (!this._fade || this._fade.resolve !== resolve) return;
        if (performance.now() - this._ticked < 1000) setTimeout(watch, 1000);
        else this._endFade();
      };
      setTimeout(watch, fade * 1000 + 1500);
    });
  }

  _endFade() {
    const f = this._fade;
    this._fade = null;
    this.actor.setOpacity(f.to);
    this.visible = f.on;
    this.object3d.visible = f.on;
    for (const e of this._extras) e.visible = f.on;
    if (this._emitter) this._emitter.active = f.on;
    f.resolve();
  }

  // ---------------------------------------------------------------- frame

  update(dt, t = 0) {
    this._ticked = performance.now();
    if (this._fade) {
      const f = this._fade;
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      this.actor.setOpacity(f.from + (f.to - f.from) * k);
      if (k >= 1) this._endFade();
    }
    if (this._walk) this._stepWalk(dt);
    if (this.hover) this.actor.mesh.position.y = 0.06 + Math.sin(t * 2.6 + this._phase) * 0.05;
    this.actor.update(dt);
  }

  dispose() {
    if (this._walk) this._finishWalk();
    if (this._fade) this._endFade();
    if (this._emitter && this._emitter.remove) this._emitter.remove();
    // the projector stays in the scene (hidden) and is freed with the World
    for (const e of this._extras) e.visible = false;
    this.actor.dispose();
  }
}
