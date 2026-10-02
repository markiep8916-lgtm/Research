// Enemy behaviours. Rules of engagement are expressed as flags so Game.checkContacts stays generic:
//   contact      touching hurts Kong
//   stompable    jumping on its head defeats it (otherwise Kong is hurt instead)
//   slap/roll/boom/pound  damage dealt by each attack kind (0 = immune; Kong is told it clanged)
import { Entity, overlap } from './entity.js';
import { moveX, moveY, groundTile } from '../sim/physics.js';
import { T, FLAGS, F_SOLID, F_ONEWAY } from '../sim/tiles.js';
import * as M from '../gfx/models/enemies.js';
import { Fireball } from './projectiles.js';
import { sign, clamp, damp } from '../core/util.js';

const solidAt = (g, x, y) => (FLAGS[g.tile(Math.floor(x), Math.floor(y))] & F_SOLID) !== 0;
const supportAt = (g, x, y) => { const f = FLAGS[g.tile(Math.floor(x), Math.floor(y))]; return (f & (F_SOLID | F_ONEWAY)) !== 0; };

export class Enemy extends Entity {
  constructor(game, x, y) {
    super(game, x, y);
    this.kind = 'enemy';
    this.dropT = 0;
    this.hp = 1;
    this.contact = true;
    this.stompable = true;
    this.dmgs = { slap: 1, roll: 2, boom: 1, pound: 3, stomp: 1, reflect: 2 };
    this.invuln = 0;
    this.dying = 0;
    this.ground = false;
    this.ms = { face: 1, vx: 0, vy: 0, hurt: 0, dead: 0, charge: 0, ground: true };
    this.dropChance = 0.45;
    this.active = true;
    this.mdl = null;
  }

  setModel(m) { this.mdl = m; this.model = m.root; this.z = 0.0; }

  /** Attempt to hurt this enemy. Returns true if it registered. */
  hit(dmg, dir, how) {
    if (this.dead || this.dying > 0) return false;
    const base = this.dmgs[how];
    if (!base) { this.game.sfx('clang'); this.game.fx.burst(this.x, this.y + this.h * 0.6, 4, { color: 0xffffff, speed: 4, life: 0.25, size: 0.2 }); return false; }
    if (this.invuln > 0) return false;
    this.hp -= Math.max(1, dmg >= 2 && base < 2 ? 1 : base);
    this.invuln = 0.14;
    this.mdl && this.mdl.flash(0.14);
    this.onHurt(dir, how);
    if (this.hp <= 0) this.die(dir, how);
    else { this.game.sfx('hit'); this.game.fx.burst(this.x, this.y + this.h * 0.6, 6, { colors: [0xffffff, 0xffe27a], speed: 5, life: 0.3, size: 0.25 }); }
    return true;
  }

  onHurt(dir) { this.vx += dir * 3; }

  die(dir, how) {
    this.dying = 0.001;
    const g = this.game;
    g.sfx('pop');
    g.fx.burst(this.x, this.y + this.h * 0.6, 14, { colors: [0xffffff, 0xffe27a, 0xff9a3a], speed: 7, life: 0.55, size: 0.38 });
    g.fx.puffAt(this.x, this.y + this.h * 0.5, { size: 1.3, life: 0.5, alpha: 0.5 });
    g.save.kills = (g.save.kills || 0) + 1;
    if (Math.random() < this.dropChance && how !== 'pound') g.dropBanana(this.x, this.y + this.h * 0.5);
    this.vx = 0;
  }

  think(/* dt */) {}

  // gravity + collision step shared by ground enemies
  physics(dt, { gravity = 42, maxFall = 24 } = {}) {
    this.vy = Math.max(this.vy - gravity * dt, -maxFall);
    const g = this.game.grid;
    const hitX = moveX(this, g, this.vx * dt);
    const r = moveY(this, g, this.vy * dt);
    this.ground = false;
    if (r.landed) { this.vy = 0; this.ground = true; } else if (r.bumped && this.vy > 0) this.vy = 0;
    return hitX;
  }

  update(dt) {
    this.snap();
    this.invuln = Math.max(0, this.invuln - dt);
    const p = this.game.player;
    this.active = Math.abs(p.x - this.x) < 46 && Math.abs(p.y - this.y) < 30;
    if (this.dying > 0) {
      this.dying += dt * 3.2;
      if (this.dying >= 1) { this.destroy(); return; }
    } else if (this.active) this.think(dt);
    this.refresh(dt);
  }

  refresh(dt) {
    const s = this.ms;
    s.face = this.face; s.vx = this.vx; s.vy = this.vy; s.ground = this.ground; s.dead = this.dying;
    if (this.mdl) this.mdl.update(s, dt, this.game.time);
  }
}

// =============================================================================== Snapjaw
export class Snapjaw extends Enemy {
  constructor(game, x, y) {
    super(game, x + 0.5, y);
    this.label = 'snapjaw';
    this.hw = 0.55; this.h = 0.85; this.hp = 1;
    this.dir = Math.random() < 0.5 ? -1 : 1; this.face = this.dir;
    this.lunge = 0; this.cool = 0;
    this.setModel(M.createSnapjaw());
  }
  think(dt) {
    const g = this.game.grid, p = this.game.player;
    this.cool = Math.max(0, this.cool - dt);
    if (this.lunge > 0) this.lunge -= dt;
    const dx = p.x - this.x;
    if (this.ground && this.lunge <= 0 && this.cool <= 0 && sign(dx) === this.dir && Math.abs(dx) < 4.5 && Math.abs(p.y - this.y) < 1.6 && p.respawnT < 0) { this.lunge = 0.75; this.cool = 2.0; this.game.sfx('snap'); }
    const speed = this.lunge > 0 ? 4.2 : 1.7;
    if (this.ground) {
      const ahead = this.x + this.dir * (this.hw + 0.25);
      if (solidAt(g, ahead, this.y + 0.3) || !supportAt(g, ahead, this.y - 0.25)) { this.dir = -this.dir; this.lunge = 0; }
    }
    this.vx = damp(this.vx, this.dir * speed, 14, dt);
    if (Math.abs(this.vx) > 0.2) this.face = sign(this.vx);
    const hitWall = this.physics(dt);
    if (hitWall) { this.dir = -this.dir; this.vx = 0; this.lunge = 0; }
    this.ms.charge = this.lunge > 0 ? 1 : 0;
  }
}

// =============================================================================== Thornbug
export class Thornbug extends Enemy {
  constructor(game, x, y) {
    super(game, x + 0.5, y);
    this.label = 'thornbug';
    this.hw = 0.55; this.h = 0.8; this.hp = 2; this.stompable = false;
    this.dir = Math.random() < 0.5 ? -1 : 1; this.face = this.dir;
    this.dmgs = { slap: 1, roll: 2, boom: 1, pound: 3, stomp: 0, reflect: 2 };
    this.setModel(M.createThornbug());
  }
  think(dt) {
    const g = this.game.grid;
    if (this.ground) {
      const ahead = this.x + this.dir * (this.hw + 0.25);
      if (solidAt(g, ahead, this.y + 0.3) || !supportAt(g, ahead, this.y - 0.25)) this.dir = -this.dir;
    }
    this.vx = damp(this.vx, this.dir * 1.3, 12, dt);
    this.face = this.dir;
    if (this.physics(dt)) { this.dir = -this.dir; this.vx = 0; }
  }
  onHurt(dir) { this.vx += dir * 4; }
}

// =============================================================================== Bat
export class Bat extends Enemy {
  constructor(game, x, y) {
    super(game, x + 0.5, y);
    this.label = 'bat';
    this.hw = 0.5; this.h = 0.75; this.hp = 1;
    this.home = { x: this.x, y: y + 1 - this.h }; // hangs from the tile above
    this.y = this.home.y;
    this.mode = 'hang'; this.t = 0; this.cool = 0;
    this.dropChance = 0.35;
    this.setModel(M.createBat());
  }
  think(dt) {
    const p = this.game.player, g = this.game.grid;
    this.t += dt; this.cool = Math.max(0, this.cool - dt);
    const tx = p.x - this.x, ty = p.y + 0.9 - (this.y + this.h / 2);
    if (this.mode === 'hang') {
      this.vx = this.vy = 0;
      if (this.cool <= 0 && Math.abs(tx) < 7.5 && ty > -10 && ty < 2 && p.respawnT < 0) { this.mode = 'swoop'; this.t = 0; this.game.sfx('bat'); }
    } else if (this.mode === 'swoop') {
      const d = Math.hypot(tx, ty) || 1, sp = 7.2;
      this.vx = damp(this.vx, (tx / d) * sp, 5, dt);
      this.vy = damp(this.vy, (ty / d) * sp + Math.sin(this.t * 9) * 1.5, 5, dt);
      if (this.t > 2.0) { this.mode = 'return'; this.t = 0; }
    } else {
      const hx = this.home.x - this.x, hy = this.home.y - this.y, d = Math.hypot(hx, hy) || 1;
      this.vx = (hx / d) * 5; this.vy = (hy / d) * 5;
      if (d < 0.3) { this.mode = 'hang'; this.x = this.home.x; this.y = this.home.y; this.cool = 1.6; }
    }
    if (Math.abs(this.vx) > 0.3) this.face = sign(this.vx);
    moveX(this, g, this.vx * dt); moveY(this, g, this.vy * dt);
    this.ms.hang = this.mode === 'hang';
  }
  onHurt() { if (this.mode === 'hang') { this.mode = 'swoop'; this.t = 0; } }
}

// =============================================================================== Tiki turret
export class Tiki extends Enemy {
  constructor(game, x, y, face = -1) {
    super(game, x + 0.5, y);
    this.label = 'tiki';
    this.hw = 0.5; this.h = 1.9; this.hp = 3; this.contact = false; this.stompable = false;
    this.face = face; this.cool = 1.2 + Math.random(); this.charge = 0;
    this.dmgs = { slap: 1, roll: 2, boom: 1, pound: 2, stomp: 0, reflect: 3 };
    this.dropChance = 0.8;
    this.setModel(M.createTiki());
  }
  think(dt) {
    const p = this.game.player;
    const dx = p.x - this.x, dy = p.y + 1 - (this.y + 1);
    if (Math.abs(dx) > 1) this.face = sign(dx);
    if (this.charge > 0) {
      this.charge += dt;
      if (this.charge >= 0.75) {
        this.charge = 0; this.cool = 2.3;
        const f = this.face;
        this.game.add(new Fireball(this.game, this.x + f * 0.8, this.y + 1.05, f * 7.2));
        this.game.sfx('fire'); this.ms.fire = true;
      }
    } else {
      this.cool -= dt;
      this.ms.fire = false;
      if (this.cool <= 0 && Math.abs(dx) < 13 && Math.abs(dy) < 4.5 && p.respawnT < 0) this.charge = 0.001;
    }
    this.ms.charge = this.charge > 0 ? Math.min(1, this.charge / 0.75) : 0;
  }
}

// =============================================================================== Magma blob
export class Magma extends Enemy {
  constructor(game, x, y) {
    super(game, x + 0.5, y);
    this.label = 'magma';
    this.hw = 0.5; this.h = 0.9; this.hp = 2; this.stompable = false;
    this.dmgs = { slap: 1, roll: 2, boom: 1, pound: 3, stomp: 0, reflect: 2 };
    this.cool = 0.6 + Math.random(); this.squat = 0;
    this.setModel(M.createMagma());
  }
  think(dt) {
    const p = this.game.player;
    if (this.ground) {
      this.vx = damp(this.vx, 0, 16, dt);
      this.cool -= dt;
      this.squat = this.cool < 0.25 ? 1 : 0;
      if (this.cool <= 0) {
        const dx = p.x - this.x;
        this.vy = 14.5; this.vx = Math.abs(dx) < 11 ? sign(dx) * 3.6 : (Math.random() < 0.5 ? -2 : 2);
        this.cool = 1.5 + Math.random() * 0.6; this.ground = false;
        this.game.sfx('blob');
      }
    }
    if (Math.abs(this.vx) > 0.3) this.face = sign(this.vx);
    const wasAir = !this.ground;
    this.physics(dt, { gravity: 46 });
    if (wasAir && this.ground) this.game.fx.burst(this.x, this.y + 0.1, 5, { colors: [0xff7a2a, 0xffc04a], speed: 4, life: 0.4, size: 0.25 });
    this.ms.charge = this.squat;
    if (Math.random() < dt * 8) this.game.fx.spark(this.x + (Math.random() - 0.5) * 0.6, this.y + 0.9, { vy: 1.5, color: 0xffa04a, size: 0.2, life: 0.5, grav: -1 });
  }
}

// =============================================================================== Spider on a thread
export class Spider extends Enemy {
  constructor(game, x, y) {
    super(game, x + 0.5, y);
    this.label = 'spider';
    this.hw = 0.55; this.h = 0.85; this.hp = 1; this.stompable = false;
    this.ay = y + 1;
    // how far can it drop before hitting the floor?
    let free = 1.4; const g = game.grid;
    while (free < 8 && !solidAt(g, this.x, this.ay - free - 1.2)) free += 0.5;
    this.minLen = 1.2; this.maxLen = Math.max(2.0, free - 0.2);
    this.ph = Math.random() * 6; this.len = this.minLen;
    this.dmgs = { slap: 1, roll: 2, boom: 1, pound: 3, stomp: 0, reflect: 2 };
    this.setModel(M.createSpider());
    this.y = this.ay - this.len - 1.0;
  }
  think(dt) {
    this.ph += dt * 0.9;
    const u = 0.5 - 0.5 * Math.cos(this.ph * 2.2);
    // pause near the top, dash down when the player is below
    const p = this.game.player;
    const near = Math.abs(p.x - this.x) < 3.5 && p.y < this.ay - 1;
    const target = near ? this.maxLen : this.minLen + (this.maxLen - this.minLen) * u * 0.55;
    this.len = damp(this.len, target, near ? 5 : 2, dt);
    this.y = this.ay - this.len - 1.05;
    this.ms.thread = this.len + 0.15;
  }
  render(alpha) { if (this.model) this.model.position.set(this.x, this.ay, 0); }
  refresh(dt) { this.ms.thread = this.len + 0.15; super.refresh(dt); }
}

// =============================================================================== Fire wisp (boomerang only)
export class Wisp extends Enemy {
  constructor(game, x, y) {
    super(game, x + 0.5, y);
    this.label = 'wisp';
    this.hw = 0.45; this.h = 0.9; this.hp = 1; this.stompable = false;
    this.dmgs = { slap: 0, roll: 0, boom: 1, pound: 0, stomp: 0, reflect: 2 };
    this.hx = this.x; this.hy = y;
    this.t = Math.random() * 6;
    this.setModel(M.createWisp());
  }
  think(dt) {
    this.t += dt;
    const p = this.game.player;
    const tx = p.x - this.x, ty = p.y + 0.5 - this.y, d = Math.hypot(tx, ty) || 1;
    if (d < 11 && p.respawnT < 0) { const sp = 2.5; this.vx = damp(this.vx, (tx / d) * sp, 2, dt); this.vy = damp(this.vy, (ty / d) * sp, 2, dt); }
    else { this.vx = damp(this.vx, Math.sin(this.t * 0.8) * 0.8, 2, dt); this.vy = damp(this.vy, Math.cos(this.t * 1.1) * 0.5, 2, dt); }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.face = sign(this.vx) || this.face;
    if (Math.random() < dt * 14) this.game.fx.spark(this.x + (Math.random() - 0.5) * 0.4, this.y + 0.9, { vy: 1.5, vx: (Math.random() - 0.5), color: 0xff9a3a, size: 0.22, life: 0.6, grav: -1.5 });
  }
}

// =============================================================================== Rolling barrel
export class Barrel extends Enemy {
  constructor(game, x, y, dir) {
    super(game, x, y);
    this.label = 'barrel';
    this.hw = 0.42; this.h = 0.84; this.hp = 1; this.dir = dir; this.life = 22;
    this.dmgs = { slap: 1, roll: 2, boom: 1, pound: 3, stomp: 1, reflect: 2 };
    this.dropChance = 0.25;
    this.vx = dir * 5.4;
    this.setModel(M.createBarrel());
  }
  think(dt) {
    this.life -= dt;
    if (this.life <= 0 || this.y < -4) { this.destroy(); return; }
    this.vx = damp(this.vx, this.dir * 5.4, 4, dt);
    const wasAir = !this.ground;
    const vyBefore = this.vy;
    const hitWall = this.physics(dt, { gravity: 38 });
    if (wasAir && this.ground && vyBefore < -9) { this.vy = -vyBefore * 0.3; this.ground = false; this.game.fx.dust(this.x, this.y, 3, 0); }
    if (hitWall) this.die(this.dir, 'wall');
  }
  die(dir, how) {
    this.game.fx.debris(this.x, this.y + 0.4, 10, 0x9a6230, { speed: 5 });
    this.game.sfx('crate');
    super.die(dir, how);
  }
}

// =============================================================================== Barrel cannon (spawns rolling barrels)
export class Cannon extends Enemy {
  constructor(game, x, y, dir) {
    super(game, x + 0.5, y);
    this.label = 'cannon';
    this.hw = 0.55; this.h = 1.2; this.hp = 99; this.contact = false; this.stompable = false;
    this.face = dir; this.dir = dir;
    this.dmgs = { slap: 0, roll: 0, boom: 0, pound: 0, stomp: 0, reflect: 0 };
    this.cool = 1.5 + Math.random() * 2; this.charge = 0;
    this.setModel(M.createCannon(dir));
  }
  think(dt) {
    const p = this.game.player;
    this.ms.fire = false;
    if (this.charge > 0) {
      this.charge += dt;
      if (this.charge > 0.6) {
        this.charge = 0; this.cool = 3.4;
        const b = new Barrel(this.game, this.x + this.dir * 1.0, this.y + 0.2, this.dir);
        this.game.add(b); this.ms.fire = true; this.game.sfx('cannon');
        this.game.fx.burst(this.x + this.dir * 0.9, this.y + 0.8, 8, { colors: [0xffc04a, 0x888888], speed: 5, life: 0.4 });
        this.game.shake(0.12);
      }
    } else {
      this.cool -= dt;
      const live = this.game.entities.filter((e) => e instanceof Barrel && !e.dead).length;
      if (this.cool <= 0 && Math.abs(p.x - this.x) < 26 && Math.abs(p.y - this.y) < 16 && live < 4) this.charge = 0.001;
    }
    this.ms.charge = this.charge > 0 ? 1 : 0;
  }
  render(alpha) { if (this.model) this.model.position.set(this.x, this.y, 0); }
}

export const ENEMY_CLASSES = { snapjaw: Snapjaw, thornbug: Thornbug, bat: Bat, magma: Magma, spider: Spider, wisp: Wisp };
