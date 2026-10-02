// The three boss fights. A shared Boss base handles intro, damage rules, phases and the death sequence.
//   Stone Golem   (Temple)  : stomp waves, fist slams, falling rocks; only vulnerable while dazed.
//   Spider Queen  (Caverns) : web spits, crystal rain, dives; exposed on the floor after a dive.
//   Tiki Overlord (Tower)   : throws barrels that Kong must slap back at him; quakes, wisps, ember rain.
import { Entity, overlap } from './entity.js';
import { moveX, moveY } from '../sim/physics.js';
import { FLAGS, F_SOLID } from '../sim/tiles.js';
import * as BM from '../gfx/models/bosses.js';
import { Shock, Fireball, Rock } from './projectiles.js';
import { Barrel, Wisp } from './enemies.js';
import { sign, clamp, damp } from '../core/util.js';

const solid = (g, x, y) => (FLAGS[g.tile(Math.floor(x), Math.floor(y))] & F_SOLID) !== 0;

class Boss extends Entity {
  constructor(game, d, { title, hp, hw, h, model, music = 'boss' }) {
    const grid = game.grid;
    let fy = Math.floor(d.y);
    while (fy > 0 && !solid(grid, d.x, fy - 1)) fy--;
    super(game, d.x, fy);
    this.kind = 'boss';
    this.bossKind = d.kind;
    this.title = title;
    this.hp = this.maxHp = hp;
    this.hw = hw; this.h = h;
    this.dropT = 0;
    const def = game.room.def;
    this.arena = { x0: 2, x1: def.w - 2, floor: fy, w: def.w, h: def.h, cx: def.w / 2 };
    this.mdl = model; this.model = model.root; this.z = 0;
    this.contact = true; this.stompable = false; this.vulnerable = false;
    this.contactDamage = 1;
    this.stateName = 'intro'; this.t = 0; this.invuln = 0; this.dying = 0;
    this.face = -1;
    this.ground = true;
    this.ms = { face: -1, vulnerable: false, charge: 0, rage: 0, attack: '', dead: 0, roar: 0, jump: false, thread: 0 };
    this.pending = []; // delayed spawns [{t, fn}]
    this.lastAttack = '';
    this.phaseSeen = 1;
    const bc = def.props.bossCam || {};
    game.camera.fixed = { x: def.w / 2, y: bc.y ?? Math.min(def.h / 2 - 1.5, fy + 5) };
    game.camera.zoom = bc.zoom || 1.35;
    game.audio.music(music);
    game.hud.showBoss(title);
  }

  go(name) { this.stateName = name; this.t = 0; }
  get rage() { return 1 - this.hp / this.maxHp; }
  get phase() { return this.hp > this.maxHp * 0.66 ? 1 : this.hp > this.maxHp * 0.33 ? 2 : 3; }

  /** damage taken by attack kind (0 = clang) */
  damageFor(how) {
    if (!this.vulnerable) return how === 'boom' && this.boomAlways ? 1 : 0;
    return { slap: 1, roll: 2, pound: 3, stomp: 1, boom: 1, reflect: 3 }[how] || 0;
  }

  hit(dmg, dir, how) {
    if (this.dead || this.dying > 0 || this.stateName === 'intro') return false;
    const d = this.damageFor(how);
    if (!d) { this.game.sfx('clang'); this.game.fx.burst(this.x, this.y + this.h * 0.6, 4, { color: 0xffffff, speed: 4, life: 0.25, size: 0.25 }); return false; }
    if (this.invuln > 0) return false;
    this.hp = Math.max(0, this.hp - d);
    this.invuln = how === 'boom' ? 0.35 : 0.2;
    this.mdl.flash(0.14);
    const g = this.game;
    g.sfx('bossHit'); g.hitstop(0.08); g.shake(0.35);
    g.fx.burst(this.x, this.y + this.h * 0.55, 14, { colors: [0xffffff, 0xffd27a, 0xff8a3a], speed: 8, life: 0.5, size: 0.4 });
    this.onDamaged(how, dir);
    if (this.hp <= 0) this.die();
    return true;
  }

  onDamaged() {}

  die() {
    const g = this.game;
    this.dying = 0.001;
    this.vulnerable = false; this.contact = false;
    g.slow = { scale: 0.28, t: 1.6 };
    g.sfx('bossDie');
    g.shake(1.2);
    for (let i = 0; i < 5; i++) g.fx.burst(this.x + (Math.random() - 0.5) * this.hw * 2, this.y + Math.random() * this.h, 24, { colors: [0xffffff, 0xffd27a, 0xff8a3a, 0xff5a2a], speed: 11, life: 1.1, size: 0.6, grav: 4 });
    for (let i = 0; i < 24; i++) g.dropBanana(this.x + (Math.random() - 0.5) * 6, this.y + 2 + Math.random() * 3);
    g.bossDefeated(this.bossKind);
  }

  // ---- movement helper: gravity + collisions, returns {landed}
  fall(dt, gravity = 46) {
    this.vy = Math.max(this.vy - gravity * dt, -30);
    const gr = this.game.grid;
    const hx = moveX(this, gr, this.vx * dt);
    if (hx) this.vx = 0;
    const r = moveY(this, gr, this.vy * dt);
    this.ground = false;
    if (r.landed) { this.vy = 0; this.ground = true; } else if (r.bumped && this.vy > 0) this.vy = 0;
    this.x = clamp(this.x, this.arena.x0 + this.hw, this.arena.x1 - this.hw);
    return r;
  }

  later(t, fn) { this.pending.push({ t, fn }); }

  /** extra player interactions while the boss is vulnerable (roll / stomp land even though `contact` is off) */
  interactions() {
    if (!this.vulnerable || this.invuln > 0) return;
    const p = this.game.player, b = p.body;
    if (p.respawnT >= 0 || !overlap(p.box, this.box)) return;
    if (b.mode === 'roll' && Math.abs(b.vx) > 5) this.hit(2, b.face, 'roll');
    else if (b.vy < -2 && b.y > this.y + this.h * 0.55 && b.mode !== 'climb') { if (this.hit(1, b.face, 'stomp')) p.bounce(false); }
  }

  update(dt) {
    this.snap();
    this.invuln = Math.max(0, this.invuln - dt);
    const g = this.game;
    if (this.dying > 0) {
      this.dying += dt * 0.55;
      if (Math.random() < dt * 30) g.fx.burst(this.x + (Math.random() - 0.5) * this.hw * 2, this.y + Math.random() * this.h, 6, { colors: [0xffffff, 0xff9a3a], speed: 6, life: 0.7, size: 0.5, grav: 3 });
      if (this.dying >= 1) { this.destroy(); return; }
    } else {
      this.t += dt;
      for (let i = this.pending.length - 1; i >= 0; i--) { this.pending[i].t -= dt; if (this.pending[i].t <= 0) { const p = this.pending.splice(i, 1)[0]; p.fn(); } }
      this.think(dt);
      this.interactions();
      if (this.phase > this.phaseSeen) { this.phaseSeen = this.phase; this.onPhase(); }
    }
    this.refresh(dt);
  }

  onPhase() {}

  refresh(dt) {
    const s = this.ms;
    s.face = this.face; s.vulnerable = this.vulnerable; s.dead = this.dying; s.rage = this.rage;
    this.mdl.update(s, dt, this.game.time);
  }

  /** shock waves outward from the boss's feet */
  waves(x, speed = 8.5, life = 2.4) {
    const g = this.game;
    g.add(new Shock(g, x - 0.6, this.arena.floor, -1, { speed, life }));
    g.add(new Shock(g, x + 0.6, this.arena.floor, 1, { speed, life }));
    g.sfx('shockwave'); g.shake(0.8);
  }

  pick(options) {
    let pool = options.filter((o) => o[0] !== this.lastAttack);
    if (!pool.length) pool = options;
    const total = pool.reduce((s, o) => s + o[1], 0);
    let r = Math.random() * total;
    for (const [name, w] of pool) { r -= w; if (r <= 0) { this.lastAttack = name; return name; } }
    this.lastAttack = pool[0][0];
    return pool[0][0];
  }
}

// ======================================================================================== Stone Golem
class Golem extends Boss {
  constructor(game, d) {
    super(game, d, { title: 'STONE GOLEM', hp: 14, hw: 1.7, h: 5.0, model: BM.createGolem() });
    this.cool = 1.2; this.jumps = 0; this.rainT = 0; this.slamX = this.x; this.stunT = 2;
    this.boomAlways = false;
  }

  stun(sec) { this.vulnerable = true; this.contact = false; this.stunT = sec; this.go('stunned'); this.game.sfx('hit'); }
  roarAnim() { this.ms.roar = Math.min(1, this.t * 2.5); }

  onPhase() { this.go('roar'); this.vulnerable = false; this.contact = true; }

  think(dt) {
    const g = this.game, p = g.player, ms = this.ms, ar = this.arena;
    ms.charge = 0; ms.roar = 0; ms.jump = false; ms.attack = this.stateName;
    switch (this.stateName) {
      case 'intro':
        this.roarAnim();
        if (this.t > 0.3 && !this.roared) { this.roared = true; g.sfx('roar'); g.shake(0.9); g.fx.dust(this.x, this.y, 12, 0, { size: 1.2 }); }
        if (this.t > 2.4) this.go('idle');
        break;
      case 'roar':
        this.roarAnim();
        if (this.t > 0.2 && !this.roared2) { this.roared2 = true; g.sfx('roar'); this.waves(this.x, 7.5, 2.8); }
        if (this.t > 1.3) { this.roared2 = false; this.cool = 0.7; this.go('idle'); }
        break;
      case 'idle': {
        this.face = sign(p.x - this.x) || this.face;
        this.cool -= dt;
        this.fall(dt);
        if (this.cool <= 0) {
          const a = this.pick(this.phase === 1 ? [['jump', 0.55], ['slam', 0.45]] : [['jump', 0.35], ['slam', 0.35], ['rain', 0.3]]);
          if (a === 'jump') { this.jumps = this.phase === 3 ? 1 : 0; this.go('jumpWind'); } else if (a === 'slam') this.go('slamWind'); else { this.rainN = 0; this.go('rain'); }
        }
        break;
      }
      case 'jumpWind': {
        ms.charge = this.t / 0.55; this.face = sign(p.x - this.x) || this.face; this.fall(dt);
        if (this.t > 0.55) { this.vy = 19; this.vx = clamp((p.x - this.x) * 1.15, -9.5, 9.5); this.ground = false; g.sfx('roar'); this.go('jump'); }
        break;
      }
      case 'jump': {
        ms.jump = true;
        const r = this.fall(dt, 46);
        if (r.landed && this.t > 0.15) {
          this.vx = 0;
          g.fx.dust(this.x, this.y, 10, 0, { size: 1.2 }); g.fx.debris(this.x, this.y + 0.3, 8, 0x7d8a8c, { speed: 6 });
          this.waves(this.x, 8.8 + this.phase * 0.5, 2.6);
          if (this.jumps > 0) { this.jumps--; this.go('jumpWind'); } else this.stun(this.phase === 1 ? 2.4 : this.phase === 2 ? 2.1 : 1.9);
        }
        break;
      }
      case 'slamWind': {
        ms.charge = this.t / 0.95; this.face = sign(p.x - this.x) || this.face; this.fall(dt);
        this.slamX = clamp(this.x + this.face * 4.2, ar.x0 + 1, ar.x1 - 1);
        if (Math.random() < dt * 40) g.fx.spark(this.slamX + (Math.random() - 0.5) * 2.2, ar.floor + 0.2, { vy: 3, color: 0xff9a2a, size: 0.3, life: 0.4 });
        if (this.t > 0.95) this.go('slam');
        break;
      }
      case 'slam': {
        this.fall(dt);
        if (this.t > 0.12 && !this.slammed) {
          this.slammed = true;
          g.fx.dust(this.slamX, ar.floor, 10, 0, { size: 1.1 }); g.fx.debris(this.slamX, ar.floor + 0.3, 10, 0x7d8a8c, { speed: 7 });
          g.add(new Shock(g, this.slamX - 0.6, ar.floor, -1, { speed: 7.5, life: 2.0 })); g.add(new Shock(g, this.slamX + 0.6, ar.floor, 1, { speed: 7.5, life: 2.0 }));
          g.sfx('shockwave'); g.shake(0.9);
          if (Math.abs(p.x - this.slamX) < 1.5 && p.y < ar.floor + 1.5) p.hurt(1, this.slamX);
        }
        if (this.t > 0.5) { this.slammed = false; this.stun(this.phase === 1 ? 2.0 : 1.7); }
        break;
      }
      case 'rain': {
        ms.charge = 1; ms.attack = 'rain'; this.roarAnim(); this.fall(dt);
        this.rainT -= dt;
        if (this.t > 0.8 && this.rainT <= 0 && this.t < 4.2) {
          this.rainT = this.phase === 3 ? 0.3 : 0.42;
          const rx = this.rainN++ % 3 === 0 ? clamp(p.x + (Math.random() - 0.5) * 3, ar.x0 + 1, ar.x1 - 1) : ar.x0 + 2 + Math.random() * (ar.x1 - ar.x0 - 4);
          g.fx.burst(rx, ar.h - 2, 6, { color: 0xc8c8d8, speed: 3, life: 0.4, size: 0.3 });
          this.later(0.45, () => g.add(new Rock(g, rx, ar.h - 1.5, { r: 0.55 })));
        }
        if (this.t > 5) this.stun(1.6);
        break;
      }
      case 'stunned':
        this.fall(dt); this.vulnerable = true; this.contact = false; ms.attack = 'stunned';
        if (this.t > this.stunT) { this.vulnerable = false; this.contact = true; this.cool = this.phase === 1 ? 0.9 : this.phase === 2 ? 0.7 : 0.5; this.go('idle'); }
        break;
      default: break;
    }
  }
}

// ======================================================================================== Crystal Spider Queen
class Queen extends Boss {
  constructor(game, d) {
    super(game, d, { title: 'CRYSTAL SPIDER QUEEN', hp: 16, hw: 2.0, h: 3.2, model: BM.createQueen() });
    const ar = this.arena;
    this.ceil = ar.h - 1;
    this.hover = this.ceil - 10.5;
    this.y = this.ceil + 1; this.snap();
    this.targetX = this.x; this.cool = 1.5; this.markerX = this.x; this.stunT = 3; this.boomAlways = false;
    this.y = this.ceil - 2; // starts just under the ceiling, lowers during the intro
  }
  onPhase() { this.game.sfx('roar'); this.game.shake(0.6); }

  moveToward(x, sp, dt) { this.x += clamp(x - this.x, -sp * dt, sp * dt); this.x = clamp(this.x, this.arena.x0 + 3, this.arena.x1 - 3); }

  think(dt) {
    const g = this.game, p = g.player, ms = this.ms, ar = this.arena;
    ms.charge = 0; ms.attack = this.stateName; ms.roar = 0;
    this.face = sign(p.x - this.x) || this.face;
    const bottomOffset = 0;
    switch (this.stateName) {
      case 'intro':
        this.y = damp(this.y, this.hover, 1.8, dt);
        if (this.t > 0.4 && !this.roared) { this.roared = true; g.sfx('roar'); g.shake(0.8); }
        if (this.t > 2.4) this.go('hang');
        break;
      case 'hang': {
        this.y = damp(this.y, this.hover + Math.sin(this.t * 1.4) * 0.5, 4, dt);
        this.moveToward(p.x, this.phase === 1 ? 3.0 : 4.2, dt);
        this.cool -= dt;
        if (this.cool <= 0) {
          const a = this.pick(this.phase === 1 ? [['spit', 0.5], ['rocks', 0.25], ['dive', 0.25]] : [['spit', 0.3], ['rocks', 0.3], ['dive', 0.4]]);
          this.go(a === 'dive' ? 'diveWind' : a);
        }
        break;
      }
      case 'spit': {
        ms.charge = Math.min(1, this.t / 0.7); this.y = damp(this.y, this.hover, 4, dt);
        if (this.t > 0.7 && !this.spat) {
          this.spat = true; g.sfx('web');
          const n = this.phase === 1 ? 1 : 3;
          for (let i = 0; i < n; i++) {
            const dx = p.x - this.x, dy = p.y + 1 - (this.y + 1.6), d = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx) + (i - (n - 1) / 2) * 0.28;
            g.add(new Fireball(g, this.x + this.face * 1.6, this.y + 1.2, Math.cos(ang) * 7.2, Math.sin(ang) * 7.2, { color: 0xc77bff, life: 5 }));
          }
        }
        if (this.t > 1.3) { this.spat = false; this.cool = this.phase === 1 ? 1.7 : 1.1; this.go('hang'); }
        break;
      }
      case 'rocks': {
        ms.charge = 1; this.y = damp(this.y, this.hover, 4, dt);
        if (this.t < 0.05 && !this.queued) {
          this.queued = true; g.shake(0.4); g.sfx('rock');
          const n = this.phase === 1 ? 5 : 8;
          for (let i = 0; i < n; i++) {
            const rx = i % 2 === 0 ? clamp(p.x + (Math.random() - 0.5) * 6, ar.x0 + 1, ar.x1 - 1) : ar.x0 + 2 + Math.random() * (ar.x1 - ar.x0 - 4);
            this.later(0.5 + i * 0.28, () => { g.fx.burst(rx, ar.h - 2, 5, { color: 0xc77bff, speed: 3, life: 0.4, size: 0.3 }); this.later(0.35, () => g.add(new Rock(g, rx, ar.h - 1.5, { r: 0.55 }))); });
          }
        }
        if (this.t > 2.8 + (this.phase === 1 ? 0 : 1)) { this.queued = false; this.cool = 1.0; this.go('hang'); }
        break;
      }
      case 'diveWind': {
        ms.charge = this.t / 0.95; ms.attack = 'diveWind';
        if (this.t < 0.7) this.moveToward(p.x, 6.5, dt);
        this.markerX = this.x;
        if (Math.random() < dt * 40) g.fx.spark(this.x + (Math.random() - 0.5) * 3.5, ar.floor + 0.2, { vy: 3, color: 0xff5ad8, size: 0.3, life: 0.4 });
        this.y += Math.sin(this.t * 50) * 0.02;
        if (this.t > 0.95) { this.vy = 0; this.go('dive'); g.sfx('roar'); }
        break;
      }
      case 'dive': {
        this.vy = Math.max(this.vy - 90 * dt, -34);
        this.y += this.vy * dt;
        if (this.y <= ar.floor) {
          this.y = ar.floor; this.vy = 0;
          g.fx.dust(this.x, ar.floor, 12, 0, { size: 1.3, color: 0xb8a8e8 }); g.fx.debris(this.x, ar.floor + 0.3, 10, 0x6a5aa8, { speed: 7 });
          this.waves(this.x, 8.2, 2.6);
          this.vulnerable = true; this.contact = false; this.stunT = this.phase === 1 ? 3.4 : 2.8;
          this.go('floor'); g.sfx('hit');
        }
        break;
      }
      case 'floor': {
        ms.attack = 'floor'; this.vulnerable = true; this.contact = false;
        this.y = ar.floor;
        this.x += clamp(p.x - this.x, -1.2 * dt, 1.2 * dt);
        if (this.t > this.stunT) { this.vulnerable = false; this.contact = true; this.go('climb'); }
        break;
      }
      case 'climb': {
        this.y = Math.min(this.hover, this.y + 11 * dt);
        if (this.y >= this.hover - 0.05) { this.cool = this.phase === 1 ? 1.4 : 0.8; this.go('hang'); }
        break;
      }
      default: break;
    }
    void bottomOffset;
    ms.thread = this.ceil - (this.y + this.h) + 0.6;
    if (this.stateName === 'floor') ms.thread = 0.5;
  }
}

// ======================================================================================== Tiki Overlord
class ThrownBarrel extends Barrel {
  constructor(game, x, y, dir, speed, boss) {
    super(game, x, y, dir);
    this.boss = boss;
    this.vx = dir * speed; this.vy = 3;
    this.reflectable = true; this.friendly = false;
    this.fixedSpeed = speed;
    this.life = 14;
  }
  onSlap(player) {
    this.friendly = true; this.contact = false; this.dir = player.face; this.vx = player.face * 15; this.vy = 0;
    this.game.sfx('reflect');
    this.game.fx.burst(this.x, this.y + 0.4, 12, { colors: [0xffffff, 0xffd27a], speed: 7, life: 0.4, size: 0.35 });
    this.game.hitstop(0.06);
  }
  think(dt) {
    if (this.friendly) {
      this.x += this.vx * dt;
      this.game.fx.spark(this.x, this.y + 0.4, { vx: -this.dir * 2, color: 0xffd27a, size: 0.4, life: 0.3 });
      const b = this.boss;
      if (b && !b.dead && b.dying === 0 && overlap(this.box, b.box)) { b.barrelHit(); this.die(this.dir, 'barrel'); return; }
      if (this.x < 1 || this.x > this.game.room.w - 1) this.die(this.dir, 'wall');
      return;
    }
    this.life -= dt;
    if (this.life <= 0 || this.y < -4) { this.destroy(); return; }
    this.vx = damp(this.vx, this.dir * this.fixedSpeed, 3, dt);
    const wasAir = !this.ground, vyBefore = this.vy;
    const hitWall = this.physics(dt, { gravity: 38 });
    if (wasAir && this.ground && vyBefore < -9) { this.vy = -vyBefore * 0.3; this.ground = false; }
    if (hitWall) this.die(this.dir, 'wall');
  }
  die(dir, how) { super.die(dir, how); this.dropChance = 0; }
}

class Overlord extends Boss {
  constructor(game, d) {
    super(game, d, { title: 'TIKI OVERLORD', hp: 18, hw: 1.8, h: 5.2, model: BM.createOverlord() });
    this.cool = 1.6; this.boomAlways = true; this.stunT = 2.5; this.throwN = 0; this.emberT = 0; this.homeX = this.x;
  }
  barrelHit() {
    const g = this.game;
    this.hp = Math.max(0, this.hp - 5);
    this.mdl.flash(0.3); g.sfx('bossHit'); g.hitstop(0.12); g.shake(0.8);
    g.fx.burst(this.x, this.y + 2, 30, { colors: [0xffffff, 0xffd27a, 0xff8a3a], speed: 11, life: 0.8, size: 0.6 });
    if (this.hp <= 0) { this.die(); return; }
    this.vulnerable = true; this.contact = false; this.stunT = this.phase === 1 ? 3.2 : 2.8; this.go('stunned');
    this.phaseCheck();
  }
  phaseCheck() { if (this.phase > this.phaseSeen) { this.phaseSeen = this.phase; this.pendingRoar = true; } }
  onDamaged() { this.phaseCheck(); }
  onPhase() { this.pendingRoar = true; }

  throwBarrel() {
    const g = this.game, p = g.player;
    const dir = sign(p.x - this.x) || -1;
    const speed = 6.2 + this.phase * 0.9;
    g.add(new ThrownBarrel(g, this.x + dir * 2.4, this.arena.floor + 3.2, dir, speed, this));
    g.sfx('throw');
  }

  think(dt) {
    const g = this.game, p = g.player, ms = this.ms, ar = this.arena;
    ms.charge = 0; ms.roar = 0; ms.jump = false; ms.attack = this.stateName;
    switch (this.stateName) {
      case 'intro':
        ms.roar = Math.min(1, this.t * 2.5);
        if (this.t > 0.3 && !this.roared) { this.roared = true; g.sfx('roar'); g.shake(1); g.fx.dust(this.x, this.y, 12, 0, { size: 1.2 }); }
        if (this.t > 2.6) this.go('idle');
        break;
      case 'roar':
        ms.roar = Math.min(1, this.t * 2.5);
        if (this.t > 0.2 && !this.roared2) { this.roared2 = true; g.sfx('roar'); g.shake(0.8); }
        if (this.t > 1.4) { this.roared2 = false; this.vulnerable = false; this.contact = true; this.cool = 0.6; this.go('idle'); }
        break;
      case 'idle': {
        this.face = sign(p.x - this.x) || this.face;
        this.fall(dt);
        if (this.pendingRoar) { this.pendingRoar = false; this.go('roar'); break; }
        this.cool -= dt;
        if (this.cool <= 0) {
          const opts = this.phase === 1 ? [['lift', 1]] : this.phase === 2 ? [['lift', 0.5], ['jumpWind', 0.25], ['summon', 0.25]] : [['lift', 0.4], ['jumpWind', 0.2], ['ember', 0.25], ['summon', 0.15]];
          const a = this.pick(opts);
          this.throwN = 0;
          this.go(a);
        }
        break;
      }
      case 'lift': {
        ms.charge = Math.min(1, this.t / 0.85); this.face = sign(p.x - this.x) || this.face; this.fall(dt);
        if (this.t > 0.85) {
          this.throwBarrel(); this.throwN++;
          if (this.phase >= 3 && this.throwN < 2) this.t = 0.2; else { this.cool = this.phase === 1 ? 2.2 : 1.6; this.go('idle'); }
        }
        break;
      }
      case 'jumpWind':
        ms.charge = this.t / 0.6; this.fall(dt);
        if (this.t > 0.6) { this.vy = 20; this.vx = clamp((ar.cx - this.x) * 0.9, -9, 9); this.ground = false; g.sfx('roar'); this.go('jump'); }
        break;
      case 'jump': {
        ms.jump = true; ms.attack = 'jump';
        const r = this.fall(dt, 46);
        if (r.landed && this.t > 0.15) {
          this.vx = 0; g.fx.dust(this.x, this.y, 10, 0, { size: 1.2 }); this.waves(this.x, 9, 2.8);
          this.cool = 0.8; this.go('idle');
        }
        break;
      }
      case 'summon':
        ms.charge = 1;
        this.fall(dt);
        if (this.t > 0.8 && !this.summoned) {
          this.summoned = true; g.sfx('roar');
          for (const sx of [ar.x0 + 3, ar.x1 - 3]) { g.fx.burst(sx, ar.h - 5, 14, { colors: [0xff9a3a, 0xffd27a], speed: 5, life: 0.6, size: 0.4 }); g.add(new Wisp(g, sx - 0.5, ar.h - 6)); }
        }
        if (this.t > 1.6) { this.summoned = false; this.cool = 1.8; this.go('idle'); }
        break;
      case 'ember': {
        ms.charge = 1; this.fall(dt); this.emberT -= dt;
        if (this.t > 0.6 && this.t < 3.6 && this.emberT <= 0) {
          this.emberT = 0.4;
          const ex = clamp(p.x + (Math.random() - 0.5) * 8, ar.x0 + 1, ar.x1 - 1);
          g.fx.burst(ex, ar.h - 2, 5, { color: 0xff7a2a, speed: 3, life: 0.4, size: 0.3 });
          this.later(0.4, () => g.add(new Fireball(g, ex, ar.h - 1.5, 0, -9, { life: 3 })));
        }
        if (this.t > 4.2) { this.cool = 1.3; this.go('idle'); }
        break;
      }
      case 'stunned':
        this.fall(dt); this.vulnerable = true; this.contact = false; ms.attack = 'stunned';
        if (this.t > this.stunT) { this.vulnerable = false; this.contact = true; this.cool = 0.9; this.go('idle'); }
        break;
      default: break;
    }
  }
}

export function makeBoss(game, d) {
  switch (d.kind) {
    case 'golem': return new Golem(game, d);
    case 'queen': return new Queen(game, d);
    case 'overlord': return new Overlord(game, d);
    default: return null;
  }
}
