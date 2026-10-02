// Collectibles and interactive scenery: bananas, heart fruit, ability relics, save barrels, signs, switches.
import { Entity, overlap } from './entity.js';
import { moveX, moveY } from '../sim/physics.js';
import * as PM from '../gfx/models/props.js';
import { T } from '../sim/tiles.js';

const near = (a, b, pad = 0) => a.r + pad > b.l && a.l - pad < b.r && a.t + pad > b.b && a.b - pad < b.t;

export class Banana extends Entity {
  constructor(game, x, y, id, dropped = false) {
    super(game, x + (dropped ? 0 : 0.5), y);
    this.kind = 'pickup';
    this.id = id;
    this.hw = 0.35; this.h = 0.8;
    this.t = Math.random() * 6;
    this.dropped = dropped;
    this.life = dropped ? 12 : Infinity;
    this.dropT = 0;
    if (dropped) { this.vy = 8; this.vx = (Math.random() - 0.5) * 4; }
    const m = PM.createBanana(); this.fx = m; this.model = m.root;
    this.z = 0.2;
  }
  update(dt) {
    this.snap();
    const g = this.game;
    this.t += dt;
    this.fx.update(this.t, this.x * 0.7);
    if (this.dropped) {
      this.life -= dt;
      this.vy -= 30 * dt;
      moveX(this, g.grid, this.vx * dt); this.vx *= 0.96;
      const r = moveY(this, g.grid, this.vy * dt);
      if (r.landed) { this.vy = 0; this.vx *= 0.7; }
      if (this.life <= 0 || this.y < -4) { this.destroy(); return; }
      if (this.life < 3) this.model.visible = Math.floor(this.t * 12) % 2 === 0;
    }
    const p = g.player;
    if ((g.player.respawnT < 0 && near(this.box, p.box, 0.15)) || (p.boomerang && near(this.box, p.boomerang.box, 0.2))) this.collect();
  }
  collect() {
    const g = this.game;
    if (this.dead) return;
    g.save.bananas++;
    if (this.id) g.save.collected[this.id] = true;
    g.sfx('banana', this.x);
    g.fx.burst(this.x, this.y + 0.45, 7, { colors: [0xffe27a, 0xffffff], speed: 4.5, life: 0.4, size: 0.3 });
    g.hud.bumpBananas();
    if (g.save.bananas % 50 === 0) { // every 50 bananas: a free snack that restores a heart
      g.save.hp = Math.min(g.save.hpMax, g.save.hp + 1);
      g.toast('50 bananas!  A heart is restored', 2.5);
      g.sfx('heart');
    }
    this.destroy();
  }
}

export class HeartFruit extends Entity {
  constructor(game, x, y, id) {
    super(game, x + 0.5, y);
    this.kind = 'pickup';
    this.id = id; this.hw = 0.5; this.h = 1.0; this.t = 0;
    const m = PM.createHeartFruit(); this.fx = m; this.model = m.root; this.z = 0.2;
  }
  update(dt) {
    this.snap(); this.t += dt; this.fx.update(this.t);
    if (Math.random() < dt * 6) this.game.fx.spark(this.x + (Math.random() - 0.5) * 0.8, this.y + 0.5 + Math.random() * 0.8, { vy: 0.8, color: 0xff9ab0, size: 0.2, life: 0.8 });
    const g = this.game;
    if (g.player.respawnT < 0 && near(this.box, g.player.box, 0.1)) {
      g.save.hpMax++; g.save.hp = g.save.hpMax;
      g.save.collected[this.id] = true;
      g.sfx('heart');
      g.fx.burst(this.x, this.y + 0.6, 26, { colors: [0xff5a8a, 0xffd0e0, 0xffffff], speed: 7, life: 0.9, size: 0.4 });
      g.toast('HEART FRUIT!  Max health up', 3);
      g.hud.bumpHearts();
      this.destroy();
    }
  }
}

export class Relic extends Entity {
  constructor(game, x, y, ability, id) {
    super(game, x + 0.5, y);
    this.kind = 'pickup';
    this.id = id; this.ability = ability; this.hw = 0.7; this.h = 2.0; this.t = 0;
    const m = PM.createRelic(ability); this.fx = m; this.model = m.root; this.z = -0.3;
    this.color = m.color;
  }
  update(dt) {
    this.snap(); this.t += dt; this.fx.update(this.t);
    if (Math.random() < dt * 20) this.game.fx.spark(this.x + (Math.random() - 0.5) * 1.2, this.y + 1.2 + Math.random() * 1.2, { vy: 1.2, color: this.color, size: 0.25, life: 1.0, grav: -0.5 });
    const g = this.game;
    if (g.state === 'play' && g.player.respawnT < 0 && near(this.box, g.player.box, 0)) {
      g.save.collected[this.id] = true;
      g.save.abilities[this.ability] = true;
      g.startItemGet(this);
      this.destroy();
    }
  }
}

export class SaveBarrel extends Entity {
  constructor(game, x, y) {
    super(game, x + 0.5, y);
    this.kind = 'save';
    this.hw = 0.8; this.h = 1.4; this.t = 0;
    this.active = false; this.cool = 0;
    const m = PM.createSaveBarrel(); this.fx = m; this.model = m.root; this.z = -0.1;
    this.active = Math.abs(game.save.spawn.x - this.x) < 0.7 && game.save.spawn.room === game.room.def.id && Math.abs(game.save.spawn.y - this.y) < 1.2;
  }
  update(dt) {
    this.snap(); this.t += dt; this.cool = Math.max(0, this.cool - dt);
    this.fx.update(this.t, this.active);
    const g = this.game;
    if (this.active && Math.random() < dt * 4) g.fx.spark(this.x + (Math.random() - 0.5), this.y + 1.4, { vy: 1, color: 0xffe14a, size: 0.2, life: 0.8, grav: -0.5 });
    if (g.state === 'play' && g.player.respawnT < 0 && near(this.box, g.player.box, 0) && this.cool <= 0) {
      this.cool = 2;
      g.saveCheckpoint(this);
    }
  }
  deactivate() { this.active = false; }
}

export class Sign extends Entity {
  constructor(game, x, y, text) {
    super(game, x + 0.5, y);
    this.kind = 'sign';
    this.hw = 1.0; this.h = 1.6; this.text = text; this.t = 0; this.isNear = false;
    const m = PM.createSign(); this.fx = m; this.model = m.root; this.z = -0.3;
  }
  update(dt) {
    this.snap(); this.t += dt;
    const g = this.game;
    this.isNear = g.state === 'play' && near(this.box, g.player.box, 0);
    this.fx.update(this.t, this.isNear);
    if (this.isNear && g.input.lastFrame && g.input.lastFrame.pressed.up) g.hud.toggleSign(this.text, this);
    if (!this.isNear && g.hud.signOwner === this) g.hud.hideSign();
  }
}

/** Crystal switch. Opens every gate of its colour in the room. Hit with the boomerang (or slap, if slapOk). */
export class Switch extends Entity {
  constructor(game, x, y, gateKind, slapOk = false) {
    super(game, x + 0.5, y);
    this.kind = 'switch';
    this.gateKind = gateKind; // T.GATE_A | T.GATE_B
    this.slapOk = slapOk;
    this.hw = 0.5; this.h = 1.3; this.t = 0;
    const color = gateKind === T.GATE_A ? 0x35e6ff : 0xff5ad8;
    this.color = color;
    const m = PM.createSwitch(color); this.fx = m; this.model = m.root; this.z = -0.1;
    this.flag = (gateKind === T.GATE_A ? 'gateA:' : 'gateB:') + game.room.def.id;
    this.hitFlag = !!game.save.flags[this.flag];
    if (this.hitFlag) game.room.openGate(gateKind, true);
  }
  update(dt) {
    this.snap(); this.t += dt; this.fx.update(this.t, this.hitFlag);
    if (!this.hitFlag && this.slapOk) {
      const p = this.game.player;
      if (p.attacking && near(p.slapBox(), this.box, 0)) this.trigger();
    }
  }
  onBoom() { this.trigger(); }
  trigger() {
    if (this.hitFlag) return;
    const g = this.game;
    this.hitFlag = true;
    g.save.flags[this.flag] = true;
    const opened = g.room.openGate(this.gateKind);
    g.sfx('switch');
    g.fx.burst(this.x, this.y + 0.9, 16, { colors: [this.color, 0xffffff], speed: 7, life: 0.7, size: 0.35 });
    g.shake(0.3);
    for (const o of opened) g.fx.burst(o.x + 0.5, o.y + 0.5, 6, { colors: [this.color, 0xffffff], speed: 4, life: 0.6, size: 0.3 });
    g.toast('A gate has opened!', 2.2);
  }
}

/** The Golden Banana in the final chamber: touching it ends the game. */
export class GoldenBanana extends Entity {
  constructor(game, x, y) {
    super(game, x + 0.5, y);
    this.kind = 'goal';
    this.hw = 1.0; this.h = 3.4; this.t = 0;
    const m = PM.createGoldenBanana(); this.fx = m; this.model = m.root; this.z = -0.3;
  }
  update(dt) {
    this.snap(); this.t += dt; this.fx.update(this.t);
    const g = this.game;
    if (Math.random() < dt * 30) g.fx.spark(this.x + (Math.random() - 0.5) * 3, this.y + 1.5 + Math.random() * 3, { vy: 1.5, color: 0xffe27a, size: 0.3, life: 1.2, grav: -0.5 });
    if (g.state === 'play' && g.player.respawnT < 0 && near(this.box, g.player.box, 0)) { g.startEndCinematic(this); this.destroy(); }
  }
}
