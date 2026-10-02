// Kong: wraps the physics body with input mapping, combat, damage, hazards and animation state.
import * as THREE from 'three';
import { createBody, stepBody, cancelState, P } from '../sim/physics.js';
import { T, FLAGS, F_SOLID } from '../sim/tiles.js';
import { createKong } from '../gfx/models/kong.js';
import { Entity } from './entity.js';
import { sign, clamp } from '../core/util.js';

const SLAP_TIME = 0.3, SLAP_ON = 0.05, SLAP_OFF = 0.2;
const THROW_TIME = 0.35;

export class Player extends Entity {
  constructor(game, x, y) {
    super(game, x, y);
    this.kind = 'player';
    this.body = createBody(x, y);
    this.kong = createKong();
    this.model = this.kong.root;
    this.attackT = -1;
    this.attackHit = new Set();
    this.throwT = -1;
    this.invuln = 0;
    this.grace = 0;   // spawn protection: invulnerable but does not blink
    this.hurtT = 0;
    this.hazardCd = 0;
    this.respawnT = -1;
    this.pendingSafe = null;
    this.lastSafe = { x, y };
    this.safeT = 0;
    this.boomerang = null;
    this.landFlag = false;
    this.rollTrail = 0;
    this.stepDust = 0;
    this.slapFx = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.09, 6, 18, Math.PI * 0.75),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.slapFx.visible = false;
    game.gfx.scene.add(this.slapFx);
  }

  get b() { return this.body; }
  get x() { return this.body ? this.body.x : this._x; }
  set x(v) { if (this.body) this.body.x = v; else this._x = v; }
  get y() { return this.body ? this.body.y : this._y; }
  set y(v) { if (this.body) this.body.y = v; else this._y = v; }
  get vx() { return this.body ? this.body.vx : 0; }
  set vx(v) { if (this.body) this.body.vx = v; }
  get vy() { return this.body ? this.body.vy : 0; }
  set vy(v) { if (this.body) this.body.vy = v; }
  get hw() { return this.body ? this.body.hw : 0.5; }
  set hw(v) { /* owned by the body */ }
  get h() { return this.body ? this.body.h : 1.7; }
  set h(v) { /* owned by the body */ }
  get face() { return this.body ? this.body.face : 1; }
  set face(v) { if (this.body) this.body.face = v; }

  place(x, y, face = 1) {
    const b = this.body;
    b.x = x; b.y = y; b.vx = 0; b.vy = 0; b.face = face;
    b.mode = 'move'; b.hw = P.hw; b.h = P.h; b.stun = 0; b.rollT = 0; b.ground = false; b.poundPhase = 0;
    b.rollCd = 0; b.landLock = 0; b.coyote = 0; b.jumpBuf = 0; b.dropT = 0; b.wallLock = 0; b.wallCoyote = 0; b.climbCd = 0; b.springCd = 0; b.sliding = 0; b.jumping = false;
    this.attackT = -1; this.throwT = -1; this.hurtT = 0; this.respawnT = -1;
    this.lastSafe = { x, y };
    this.snap();
    this.model.visible = true;
  }

  get invulnerable() { return this.invuln > 0 || this.grace > 0; }
  get rolling() { return this.body.mode === 'roll'; }
  get attacking() { return this.attackT >= 0 && this.attackT >= SLAP_ON && this.attackT <= SLAP_OFF; }

  /** Axis-aligned slap hitbox in front of Kong (only while the swing is active). */
  slapBox() {
    const b = this.body;
    const f = b.face;
    return { l: f > 0 ? b.x + 0.1 : b.x - 1.95, r: f > 0 ? b.x + 1.95 : b.x - 0.1, b: b.y + 0.1, t: b.y + 1.95 };
  }

  update(dt, frame) {
    const g = this.game, b = this.body, save = g.save;
    b.abil.roll = save.abilities.roll; b.abil.pound = save.abilities.pound; b.abil.grip = save.abilities.grip; b.abil.boom = save.abilities.boom;
    this.invuln = Math.max(0, this.invuln - dt);
    this.grace = Math.max(0, this.grace - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.hazardCd = Math.max(0, this.hazardCd - dt);

    // ---- respawn after a hazard (spikes, lava, pits)
    if (this.respawnT >= 0) {
      this.respawnT -= dt;
      this.model.visible = false;
      if (this.respawnT < 0) {
        const s = this.lastSafe;
        this.place(s.x, s.y, b.face);
        this.invuln = 1.6;
        g.fx.burst(s.x, s.y + 0.9, 14, { colors: [0xffffff, 0xffe27a], speed: 5, life: 0.6 });
        g.sfx('respawn');
        g.camera.snap(s.x, s.y, b.face, g.gfx.aspect);
      }
      this.kong.update(this.pose(), dt, g.time);
      return;
    }

    // ---- translate the frame into physics input
    const ab = save.abilities;
    const inp = { dx: frame.dx, dy: frame.dy, jump: frame.held.jump, jumpP: frame.pressed.jump, rollP: frame.pressed.roll, poundP: false };
    if (frame.pressed.slap) {
      if (!b.ground && frame.dy < 0 && ab.pound && b.mode === 'move') inp.poundP = true;
      else if (this.attackT < 0 && b.mode !== 'pound' && b.mode !== 'roll' && b.mode !== 'climb' && b.stun <= 0) this.startSlap();
    }
    if (frame.pressed.boom && ab.boom && !this.boomerang && this.throwT < 0 && b.mode === 'move' && b.stun <= 0) this.throwBoomerang();

    const wasGround = b.ground;
    stepBody(b, inp, g.grid);
    for (const ev of b.events) this.onEvent(ev);

    // ---- attack timers
    if (this.attackT >= 0) {
      this.attackT += dt;
      if (this.attackT >= SLAP_TIME) { this.attackT = -1; this.slapFx.visible = false; }
    }
    if (this.throwT >= 0) { this.throwT += dt; if (this.throwT >= THROW_TIME) this.throwT = -1; }
    this.updateSlapFx();

    // ---- footsteps, roll trail
    if (b.ground && b.mode === 'move' && Math.abs(b.vx) > 5) {
      this.stepDust -= dt;
      if (this.stepDust <= 0) { this.stepDust = 0.16; g.fx.dust(b.x - b.face * 0.3, b.y, 2, -b.face, { size: 0.4, alpha: 0.35 }); if (Math.random() < 0.5) g.sfx('step'); }
    }
    if (b.mode === 'roll') {
      this.rollTrail -= dt;
      if (this.rollTrail <= 0) { this.rollTrail = 0.05; g.fx.spark(b.x - b.face * 0.4, b.y + 0.4, { vx: -b.face * 2, vy: 0.5, color: 0xffe9a8, size: 0.4, life: 0.3, alpha: 0.6 }); }
    }
    if (b.sliding && Math.random() < 0.3) g.fx.spark(b.x + b.sliding * 0.5, b.y + 1.0, { vy: -1, color: 0xffffff, size: 0.2, life: 0.3, alpha: 0.7 });
    void wasGround;

    // ---- remember a safe spot to return to after hazards
    this.safeT -= dt;
    if (b.ground && b.mode === 'move' && this.safeT <= 0 && this.hurtT <= 0 && FLAGS[b.supportTile] & F_SOLID && b.supportTile !== T.CRUMBLE && b.supportTile !== T.SPRING) {
      const row = Math.floor(b.y - 0.05);
      const okL = FLAGS[g.grid.tile(Math.floor(b.x - 0.4), row)] & F_SOLID, okR = FLAGS[g.grid.tile(Math.floor(b.x + 0.4), row)] & F_SOLID;
      if (okL && okR && !this.nearHazard(b.x, b.y)) { this.lastSafe = { x: b.x, y: b.y }; this.safeT = 0.25; }
    }

    // ---- fell out of the room
    if (b.y < -3) this.hazard('pit');

    this.kong.update(this.pose(), dt, g.time);
    this.landFlag = false;
    // blink while invulnerable
    this.model.visible = !(this.invuln > 0 && this.hurtT <= 0 && Math.floor(g.time * 18) % 2 === 0);
  }

  nearHazard(x, y) {
    const g = this.game.grid;
    for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) {
      const t = g.tile(Math.floor(x) + dx, Math.floor(y) + dy);
      if (t === T.SPIKE_UP || t === T.SPIKE_DOWN || t === T.LAVA) return true;
    }
    return false;
  }

  pose() {
    const b = this.body;
    return {
      face: b.face, vx: b.vx, vy: b.vy, ground: b.ground, mode: b.mode, sliding: b.sliding,
      climb: b.mode === 'climb' ? sign(b.vy) : 0, poundPhase: b.poundPhase,
      attack: this.attackT >= 0 ? this.attackT / SLAP_TIME : -1,
      throwing: this.throwT >= 0 ? this.throwT / THROW_TIME : -1,
      hurt: this.hurtT > 0.15 ? 1 : 0, landed: this.landFlag,
    };
  }

  // ------------------------------------------------------------------ actions
  startSlap() {
    this.attackT = 0;
    this.attackHit.clear();
    this.game.sfx('slap');
    this.slapFx.visible = true;
  }

  updateSlapFx() {
    const b = this.body;
    if (this.attackT < 0 || b.mode !== 'move') { this.slapFx.visible = false; return; }
    const a = clamp((this.attackT - 0.02) / 0.2, 0, 1);
    this.slapFx.visible = a > 0 && a < 1;
    this.slapFx.position.set(b.x + b.face * 0.5, b.y + 1.0, 0.55);
    this.slapFx.rotation.set(0, 0, (b.face > 0 ? -1 : 1) * (0.5 - a) * 1.5 + (b.face > 0 ? -Math.PI * 0.4 : Math.PI * 1.4));
    this.slapFx.scale.set(b.face, 1, 1);
    this.slapFx.material.opacity = 0.85 * (1 - a * 0.6);
  }

  throwBoomerang() {
    this.throwT = 0;
    this.game.spawnBoomerang(this);
  }

  bounce(strong) {
    const b = this.body;
    b.vy = strong || this.game.input.held('jump') ? 19.5 : 14.5;
    b.ground = false; b.jumping = true; b.coyote = 0; b.supportTile = 0;
    if (b.mode === 'climb') cancelState(b, this.game.grid);
  }

  onEvent(ev) {
    const g = this.game, b = this.body;
    switch (ev.type) {
      case 'jump': g.sfx(ev.roll ? 'rolljump' : 'jump'); g.fx.dust(b.x, b.y, 4, 0); break;
      case 'walljump': g.sfx('jump'); g.fx.burst(b.x - ev.dir * 0.5, b.y + 1, 8, { color: 0xffffff, speed: 4, life: 0.35, size: 0.25 }); break;
      case 'land':
        this.landFlag = true;
        if (ev.speed > 6) { g.sfx('land'); g.fx.dust(b.x, b.y, ev.speed > 14 ? 8 : 4, 0); if (ev.speed > 20) g.shake(0.25); }
        break;
      case 'roll': g.sfx('roll'); break;
      case 'rollEnd': break;
      case 'spring': g.sfx('spring'); this.landFlag = true; g.view.bounceSpring(Math.floor(b.x), Math.floor(b.y - 0.1)); g.fx.burst(b.x, b.y, 10, { colors: [0xffe27a, 0xffffff], speed: 6, arc: 2.2, dir: Math.PI / 2, life: 0.5 }); break;
      case 'poundStart': g.sfx('poundWind'); break;
      case 'poundSlam': g.sfx('poundFall'); break;
      case 'poundImpact': g.onPoundImpact(this, ev); break;
      case 'break': g.onTileBroken(ev.tx, ev.ty, ev.kind); break;
      case 'drop': g.sfx('drop'); break;
      case 'climb': g.sfx('grab'); break;
      case 'hazard': this.hazard(ev.kind); break;
      default: break;
    }
  }

  // ------------------------------------------------------------------ damage
  hurt(dmg, srcX, opts = {}) {
    const g = this.game;
    if (this.invuln > 0 || this.grace > 0 || this.respawnT >= 0 || g.state !== 'play') return false;
    const b = this.body;
    g.save.hp = Math.max(0, g.save.hp - dmg);
    cancelState(b, g.grid);
    const dir = srcX === undefined ? -b.face : (b.x >= srcX ? 1 : -1);
    b.vx = dir * (opts.kb ?? 8); b.vy = opts.kv ?? 11; b.ground = false; b.stun = 0.3; b.jumping = false;
    this.attackT = -1; this.throwT = -1;
    this.invuln = 1.6; this.hurtT = 0.45;
    this.kong.flash(0.35);
    g.sfx('hurt');
    g.hitstop(0.1);
    g.shake(0.5);
    g.fx.burst(b.x, b.y + 1, 10, { colors: [0xff5a4a, 0xffd0a0], speed: 6, life: 0.5 });
    g.hud.flashHurt();
    if (g.save.hp <= 0) g.playerDied();
    return true;
  }

  hazard(kind) {
    const g = this.game, b = this.body;
    if (this.hazardCd > 0 || this.respawnT >= 0 || g.state !== 'play') return;
    this.hazardCd = 0.8;
    const mercy = (kind === 'pit' || kind === 'water') && g.save.hp <= 1;
    if (!mercy) g.save.hp = Math.max(0, g.save.hp - 1);
    cancelState(b, g.grid);
    g.sfx(kind === 'lava' ? 'lava' : kind === 'water' ? 'splash' : 'hurt');
    g.shake(0.4); g.hitstop(0.08);
    g.fx.burst(b.x, Math.max(b.y, 0) + 0.6, 14, { colors: kind === 'lava' ? [0xff7a2a, 0xffc04a] : kind === 'water' ? [0x9fe6ff, 0xffffff] : [0xff5a4a, 0xffffff], speed: 7, life: 0.6 });
    g.hud.flashHurt();
    if (g.save.hp <= 0) { g.playerDied(); return; }
    this.respawnT = 0.55;
    b.vx = b.vy = 0;
  }

  destroy() {
    this.slapFx.parent?.remove(this.slapFx);
    super.destroy();
  }
}
