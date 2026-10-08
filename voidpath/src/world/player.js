// The field leader: a SpriteActor walking the diorama with 8-way movement, 4-way animation (side
// frames mirrored for left), distance-driven walk cycles (no foot sliding, faster when running),
// footstep callbacks and circle collision with sliding against walls and props.
// setCharacter(id) swaps the field sprite (leader switching); setWorld(world) moves the leader into
// another map's World (the Player outlives map changes).

import { SpriteActor } from '../core/spriteActor.js';
import { buildFieldSprite } from '../art/characters.js';

export const WALK_SPEED = 3.4;
export const RUN_SPEED = 5.6;
const RADIUS = 0.28;
const STRIDE = 0.42;          // world units per walk frame
const ACCEL = 14;             // how fast speed eases toward the input (1/s)
const MAX_STEP = 0.2;         // collision sub-step length

export const FACING_VEC = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

export class Player {
  constructor(world, { id = 'kade' } = {}) {
    this.world = world;
    this.id = null;
    this.actor = null;
    this._idleNames = { down: 'idle_down', up: 'idle_up', side: 'idle_side' };
    this.radius = RADIUS;
    this.pos = { x: 0, z: 0 };
    this.facing = 'down';
    this.dir = { x: 0, z: 1 };       // last movement direction (for interaction aiming)
    this.speed = 0;
    this.moving = false;
    this.running = false;
    this.travel = 0;                // distance walked (drives the walk frames)
    this.onStep = null;             // fn(running) on each footfall
    this._frame = -1;
    this._anim = null;
    this.setCharacter(id);
  }

  get x() { return this.pos.x; }
  get z() { return this.pos.z; }

  /** Swap the field sprite (leader switch); keeps position, facing and the parent world. */
  setCharacter(id) {
    if (id === this.id) return;
    const old = this.actor;
    this.id = id;
    this.sheet = buildFieldSprite(id);
    this.actor = new SpriteActor(this.sheet);
    const A = this.sheet.anims;
    this._walkAnims = { down: A.walk_down, up: A.walk_up, side: A.walk_side };
    if (old) {
      this.actor.object3d.visible = old.object3d.visible;
      old.object3d.removeFromParent();
      old.dispose();
    }
    this.world.root.add(this.actor.object3d);
    this._anim = null;
    this._idle(true);
    this._sync();
  }

  /** Move the leader into another World (map change); position is set by the caller. */
  setWorld(world) {
    this.world = world;
    world.root.add(this.actor.object3d);
  }

  setPosition(x, z, facing = this.facing) {
    this.pos.x = x;
    this.pos.z = z;
    this.world.collide(this.pos, this.radius);
    this.facing = facing;
    const v = FACING_VEC[facing] || FACING_VEC.down;
    this.dir.x = v[0];
    this.dir.z = v[1];
    this.speed = 0;
    this.moving = false;
    this._idle(true);
    this._sync();
  }

  /** Halt immediately (battle start, state exit). */
  stop() {
    this.speed = 0;
    this.moving = false;
    this._idle(false);
  }

  /** Turn toward a point without moving (NPC talk). */
  face(x, z) {
    const dx = x - this.pos.x, dz = z - this.pos.z;
    this.facing = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up');
    this._idle(true);
  }

  /**
   * input: { x, z, run } desired direction (length <= 1) or null when control is paused.
   * Returns the distance actually moved this frame.
   */
  update(dt, input) {
    let ix = 0, iz = 0, run = false;
    if (input) { ix = input.x; iz = input.z; run = input.run; }
    const mag = Math.min(1, Math.hypot(ix, iz));
    const target = mag > 0.05 ? (run ? RUN_SPEED : WALK_SPEED * Math.max(0.45, mag)) : 0;
    this.speed += (target - this.speed) * (1 - Math.exp(-ACCEL * dt));
    if (target === 0 && this.speed < 0.25) this.speed = 0;
    if (mag > 0.05) {
      this.dir.x = ix / mag;
      this.dir.z = iz / mag;
      this._updateFacing(this.dir.x, this.dir.z);
    }
    this.running = run && target > 0;
    let moved = 0;
    if (this.speed > 0) {
      const len = this.speed * dt;
      const steps = Math.max(1, Math.ceil(len / MAX_STEP));
      const x0 = this.pos.x, z0 = this.pos.z;
      for (let i = 0; i < steps; i++) {
        this.pos.x += (this.dir.x * len) / steps;
        this.pos.z += (this.dir.z * len) / steps;
        this.world.collide(this.pos, this.radius);
      }
      moved = Math.hypot(this.pos.x - x0, this.pos.z - z0);
    }
    this.moving = moved > 0.002 && target > 0;
    if (this.moving) this._walk(moved);
    else this._idle(false);
    this._sync();
    this.actor.update(dt);
    return moved;
  }

  _updateFacing(dx, dz) {
    const ax = Math.abs(dx), az = Math.abs(dz);
    // keep the current facing on near-diagonals so the sprite does not flicker between views
    const side = this.facing === 'left' || this.facing === 'right';
    const bias = 0.18;
    const useSide = side ? ax > az - bias : ax > az + bias;
    this.facing = useSide ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up');
  }

  _view() {
    return this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
  }

  _walk(moved) {
    const anim = this._walkAnims[this._view()];
    this.travel += moved * (this.running ? 0.82 : 1);
    const k = Math.floor(this.travel / STRIDE) % anim.frames.length;
    this.actor.flipX = this.facing === 'left';
    if (this._anim !== anim || k !== this._frame) {
      // contact frames (0 and 2) are footfalls
      if (this._anim === anim && (k === 0 || k === 2) && this.onStep) this.onStep(this.running);
      this._anim = anim;
      this._frame = k;
      this.actor.setFrame(anim.frames[k]);
    }
  }

  _idle(force) {
    const name = this._idleNames[this._view()];
    this.actor.flipX = this.facing === 'left';
    if (force || this.actor.currentAnim !== name) this.actor.play(name, { restart: true });
    this._anim = null;
    this._frame = -1;
  }

  _sync() {
    this.actor.object3d.position.set(this.pos.x, 0, this.pos.z);
  }
}
