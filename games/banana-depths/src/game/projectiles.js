// Projectiles: the player's boomerang and the hazards enemies and bosses throw.
import { Entity, overlap } from './entity.js';
import { FLAGS, F_SOLID } from '../sim/tiles.js';
import * as PM from '../gfx/models/props.js';

const solidAt = (g, x, y) => (FLAGS[g.tile(Math.floor(x), Math.floor(y))] & F_SOLID) !== 0;

// ----------------------------------------------------------------------------- banana boomerang
export class Boomerang extends Entity {
  constructor(game, owner) {
    super(game, owner.x + owner.face * 0.6, owner.y + 1.15);
    this.kind = 'boomerang';
    this.owner = owner;
    this.dir = owner.face;
    this.phase = 'out';
    this.travel = 0;
    this.range = 8.5;
    this.hw = 0.5; this.h = 0.8; this.y -= 0.4;
    this.hits = new Set();
    this.t = 0;
    const m = PM.createBoomerang(); this.fx = m; this.model = m.root; this.z = 0.2;
    this.sfxT = 0;
  }

  update(dt) {
    this.snap();
    const g = this.game, o = this.owner;
    this.t += dt;
    this.fx.update(this.t);
    this.sfxT -= dt;
    if (this.sfxT <= 0) { this.sfxT = 0.22; g.sfx('boomerang'); }
    const cy = this.y + this.h / 2;
    if (this.phase === 'out') {
      const step = 17 * dt;
      this.x += this.dir * step; this.travel += step;
      if (solidAt(g.grid, this.x + this.dir * 0.45, cy) || this.travel >= this.range) { this.phase = 'back'; this.hits.clear(); if (this.travel < this.range) g.fx.burst(this.x, cy, 6, { color: 0xffe27a, speed: 4, life: 0.3 }); }
    } else {
      const tx = o.x - this.x, ty = o.y + 1.1 - cy, d = Math.hypot(tx, ty) || 1;
      const sp = 22 * dt;
      this.x += (tx / d) * sp; this.y += (ty / d) * sp;
      if (d < 0.9) { o.boomerang = null; g.sfx('catch'); this.destroy(); return; }
    }
    g.fx.spark(this.x, this.y + 0.4, { color: 0xffe27a, size: 0.25, life: 0.25, alpha: 0.6 });
    const box = this.box;
    for (const e of g.entities) {
      if (e === this || e.dead) continue;
      if (e.kind === 'enemy' || e.kind === 'boss') {
        if (!this.hits.has(e) && overlap(box, e.box)) { this.hits.add(e); e.hit(1, this.dir, 'boom'); }
      } else if (e.onBoom && overlap(box, e.box)) e.onBoom(this);
    }
  }
}

// ----------------------------------------------------------------------------- fireballs / darts
export class Fireball extends Entity {
  constructor(game, x, y, vx, vy = 0, { color = 0xff7a2a, life = 4, gravity = 0, dmg = 1 } = {}) {
    super(game, x, y);
    this.kind = 'projectile';
    this.vx = vx; this.vy = vy; this.hw = 0.25; this.h = 0.5; this.y -= 0.25;
    this.friendly = false; this.life = life; this.gravity = gravity; this.dmg = dmg; this.t = 0; this.color = color;
    const m = PM.createFireball(color); this.fx = m; this.model = m.root; this.z = 0.2;
    this.reflectable = true;
  }

  explode() {
    this.game.fx.burst(this.x, this.y + 0.25, 10, { colors: [this.color, 0xffe27a], speed: 5, life: 0.4, size: 0.3 });
    this.game.sfx('fizz');
    this.destroy();
  }

  onSlap(player) {
    if (this.friendly) return;
    this.friendly = true; this.vx = -this.vx * 1.4 + player.face * 2; this.vy = -this.vy;
    if (Math.sign(this.vx) !== player.face) this.vx = player.face * Math.abs(this.vx);
    this.game.sfx('reflect'); this.game.fx.burst(this.x, this.y, 8, { color: 0xffffff, speed: 5, life: 0.3 });
  }

  update(dt) {
    this.snap();
    const g = this.game;
    this.t += dt; this.life -= dt;
    this.fx.update(this.t);
    this.vy -= this.gravity * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0) { this.destroy(); return; }
    if (solidAt(g.grid, this.x, this.y + 0.25)) { this.explode(); return; }
    if (Math.random() < 0.6) g.fx.spark(this.x - Math.sign(this.vx) * 0.2, this.y + 0.25, { color: this.color, size: 0.22, life: 0.25, alpha: 0.7 });
    const box = this.box;
    if (this.friendly) {
      for (const e of g.entities) if ((e.kind === 'enemy' || e.kind === 'boss') && !e.dead && overlap(box, e.box)) { e.hit(2, Math.sign(this.vx), 'reflect'); this.explode(); return; }
    } else if (overlap(box, g.player.box) && g.player.hurt(this.dmg, this.x)) this.explode();
  }
}

// ----------------------------------------------------------------------------- falling rock
export class Rock extends Entity {
  constructor(game, x, y, { r = 0.45, dmg = 1, onLand } = {}) {
    super(game, x, y);
    this.kind = 'projectile';
    this.hw = r * 0.85; this.h = r * 1.7; this.y -= this.h / 2;
    this.vy = -2; this.dmg = dmg; this.t = 0; this.onLand = onLand;
    const m = PM.createRock(r); this.fx = m; this.model = m.root; this.yOff = this.h / 2; this.z = 0.1;
  }
  update(dt) {
    this.snap();
    const g = this.game;
    this.t += dt;
    this.fx.update(this.t);
    this.vy = Math.max(this.vy - 30 * dt, -26);
    this.y += this.vy * dt;
    if (solidAt(g.grid, this.x, this.y) || this.y < -3) {
      g.fx.debris(this.x, this.y + 0.3, 8, 0x7a7488, { speed: 5 });
      g.fx.dust(this.x, this.y, 5, 0);
      g.sfx('rock'); g.shake(0.25);
      if (this.onLand) this.onLand(this);
      this.destroy(); return;
    }
    if (overlap(this.box, g.player.box)) g.player.hurt(this.dmg, this.x);
  }
}

// ----------------------------------------------------------------------------- ground shock wave
export class Shock extends Entity {
  constructor(game, x, y, dir, { speed = 8, life = 2.6, color = 0xffc86a, dmg = 1 } = {}) {
    super(game, x, y);
    this.kind = 'projectile';
    this.hw = 0.45; this.h = 0.75; this.dir = dir; this.speed = speed; this.life = life; this.dmg = dmg; this.t = 0;
    const m = PM.createShock(color); this.fx = m; this.model = m.root; this.z = 0.2;
    this.model.scale.x = dir;
  }
  update(dt) {
    this.snap();
    const g = this.game;
    this.t += dt; this.life -= dt;
    this.fx.update(this.t);
    this.x += this.dir * this.speed * dt;
    if (this.life <= 0 || solidAt(g.grid, this.x + this.dir * 0.5, this.y + 0.3)) { g.fx.dust(this.x, this.y, 5, this.dir); this.destroy(); return; }
    if (!solidAt(g.grid, this.x, this.y - 0.4)) this.y -= 0.5; // follow downward steps
    if (Math.random() < 0.7) g.fx.puffAt(this.x, this.y + 0.1, { vx: -this.dir * 1.5, vy: 1, size: 0.6, life: 0.4, alpha: 0.4, color: 0xd8c8a0 });
    const p = g.player;
    if (overlap(this.box, p.box) && p.y < this.y + 0.65) p.hurt(this.dmg, this.x);
  }
}
