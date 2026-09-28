// The player: movement, abilities, combat and rendering through the humanoid rig.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T, TILE = CD.TILE;
const G = (CD.G = CD.G || {});

const K = {
  W: 22, H: 66, CH: 40, RUN: 285, ACC: 2800, AIR_ACC: 2000, FRIC: 3400, GRAV: 2300, MAXFALL: 1000, JUMP: 800, DJUMP: 690,
  COYOTE: 0.09, BUF: 0.12, DASH_SPD: 840, DASH_T: 0.16, DASH_CD: 0.42, WALL_SLIDE: 95, WALL_JX: 300, WALL_JY: 760, CLIMB: 175,
};
CD.PLAYER_K = K;

class Player extends CD.Entity {
  constructor(x, y) {
    super(x - K.W / 2, y - K.H, K.W, K.H);
    this.kind = 'player'; this.face = 1; this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.airJumps = 0; this.jumping = false; this.doubleJumped = false;
    this.wallDir = 0; this.wallCling = false; this.wallLock = 0; this.dashT = 0; this.dashCd = 0; this.dashDir = 1; this.dashInv = 0; this.airDashed = false; this.dashTrail = [];
    this.climbing = false; this.crouching = false; this.swimming = false; this.inWater = false; this.invuln = 0; this.hurtT = 0; this.knockT = 0; this.flashT = 0;
    this.aim = 0; this.aimActive = 0; this.fireCd = 0; this.reloading = 0; this.reloadMax = 1; this.meleeT = 0; this.meleeMax = 0.3; this.meleeHit = new Set(); this.muzzleFlash = 0; this.recoil = 0;
    this.phase = 0; this.climbPh = 0; this.dead = false; this.deadT = 0; this.drop = 0; this.z = 6; this.landT = 0; this.stepT = 0; this.swimT = 0; this.pose = null; this.prevVy = 0;
    this.rig = CD.Rig.get('vault'); this.groundY = 0; this.slotT = 0; this.jetT = 0; this.heavyLand = 0; this.spinT = 0; this.knockSpin = 0; this.lastPad = 0; this.meleeKind = 'chop';
    this.hitTimer = 0; this.holdShoot = 0;
  }
  get feetX() { return this.x + this.w / 2; }

  setSize(h) { const by = this.y + this.h; this.h = h; this.y = by - h; }
  canStand() { return !G.world.rectHitsSolid(this.x + 1, this.y - (K.H - this.h) - 1, this.w - 2, K.H - 2); }

  ladderAt(px, py) { const t = G.world.tile(Math.floor(px / T), Math.floor(py / T)); return t === TILE.LADDER; }
  inLadder() { return this.ladderAt(this.cx, this.y + this.h * 0.5) || this.ladderAt(this.cx, this.y + this.h - 6) || this.ladderAt(this.cx, this.y + 10); }

  update(dt) {
    const I = CD.input, st = G.st, w = G.world;
    this.t += dt;
    if (this.dead) { this.deadT += dt; this.vx *= 0.9; CD.moveActor(this, dt, { gravity: K.GRAV }); this.pose = this.buildPose(); return; }
    // ---- timers
    for (const k of ['coyote', 'jumpBuf', 'wallLock', 'dashCd', 'dashInv', 'invuln', 'hurtT', 'knockT', 'flashT', 'fireCd', 'meleeT', 'muzzleFlash', 'drop', 'landT', 'aimActive', 'hitTimer']) if (this[k] > 0) this[k] = Math.max(0, this[k] - dt);
    if (this.dashT > 0) this.dashT = Math.max(0, this.dashT - dt);
    this.recoil = U.approach(this.recoil, 0, 80 * dt);
    if (this.reloading > 0) { this.reloading -= dt; if (this.reloading <= 0) { G.finishReload(this); this.reloading = 0; } }
    // ---- inputs
    const inp = G.controlsLocked() ? { l: 0, r: 0, u: 0, d: 0 } : { l: I.held('left'), r: I.held('right'), u: I.held('up'), d: I.held('down') };
    let mx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (I.aimMode === 'pad' && Math.abs(I.padAxes.lx) > 0.2) mx = U.clamp(I.padAxes.lx * 1.3, -1, 1);
    const locked = G.controlsLocked();
    const jumpP = !locked && I.pressed('jump'), jumpH = !locked && I.held('jump');
    if (jumpP) this.jumpBuf = K.BUF;
    // ---- environment
    const cxT = Math.floor(this.cx / T), cyT = Math.floor((this.y + this.h * 0.55) / T), headT = Math.floor((this.y + 12) / T);
    const tWater = w.tile(cxT, cyT), tHead = w.tile(cxT, headT);
    this.inWater = tWater === TILE.WATER; this.swimming = this.inWater && (tHead === TILE.WATER || this.swimming && this.vy !== 0);
    if (this.inWater) { G.addRad(3.2 * dt * (G.hasAbility('hazmat') ? 1 : 1)); if (Math.random() < 0.06) G.fx.add({ t: 'drip', x: this.x + Math.random() * this.w, y: this.y + 30, vx: 0, vy: -50, life: 0.5, max: 0.5, g: -100, col: '140,255,160', size: 1.6 }); }
    // ---- knockback: no control
    const ctrl = this.knockT <= 0;
    // ---- crouch
    const wantCrouch = ctrl && inp.d && this.onGround && !this.climbing && this.dashT <= 0 && !this.swimming;
    if (wantCrouch && !this.crouching) { this.crouching = true; this.setSize(K.CH); }
    else if (!wantCrouch && this.crouching && this.canStand()) { this.crouching = false; this.setSize(K.H); }
    // ---- ladder
    const onLadder = this.inLadder();
    if (!this.climbing && onLadder && ctrl && (inp.u || (inp.d && !this.onGround)) && this.dashT <= 0 && !this.crouching) {
      this.climbing = true; this.vx = 0; this.vy = 0; this.x = Math.floor(this.cx / T) * T + T / 2 - this.w / 2 - 1; this.wallCling = false;
    }
    if (this.climbing) {
      if (!onLadder) { this.climbing = false; if (inp.u) this.vy = -320; }
      else {
        const cv = (inp.u ? -1 : 0) + (inp.d ? 1 : 0);
        this.vy = cv * K.CLIMB; this.vx = mx * 60; if (mx) this.face = mx; this.climbPh += cv * dt * 9;
        if (jumpP && !inp.d) { this.climbing = false; this.vy = -560; this.vx = mx * 220; this.jumpBuf = 0; this.airJumps = 0; }
        else if (jumpP && inp.d) { this.climbing = false; this.jumpBuf = 0; }
        CD.moveActor(this, dt, {});
        if (this.onGround && cv > 0) this.climbing = false;
        this.finishFrame(dt, inp, mx);
        return;
      }
    }
    // ---- dash
    if (ctrl && !locked && I.pressed('dash') && G.hasAbility('jetrush') && this.dashCd <= 0 && this.dashT <= 0 && !(this.airDashed && !this.onGround) && !this.crouching) {
      this.dashT = K.DASH_T; this.dashCd = K.DASH_CD; this.dashInv = K.DASH_T + 0.04; this.dashDir = mx !== 0 ? mx : this.face; this.face = this.dashDir; this.vy = 0; this.wallCling = false;
      if (!this.onGround) this.airDashed = true; this.dashTrail.length = 0;
      G.fx.dust(this.cx, this.y + this.h, 6, -this.dashDir); G.fx.ring(this.cx, this.cy, 34, '120,220,255', 0.25); CD.audio.play('dash'); G.fx.shake(2, 0.1);
      if (G.buff('jet')) this.dashCd = 0.1;
    }
    if (this.dashT > 0) {
      this.vx = this.dashDir * K.DASH_SPD; this.vy = 0;
      const f = CD.moveActor(this, dt, {});
      if (f.left || f.right) this.dashT = 0;
      this.dashTrail.push({ x: this.x, y: this.y, t: 0.22, face: this.face, pose: this.pose }); if (this.dashTrail.length > 8) this.dashTrail.shift();
      G.fx.add({ t: 'spark', x: this.cx - this.dashDir * 10, y: this.y + 10 + Math.random() * 44, vx: -this.dashDir * 100, vy: 0, life: 0.2, max: 0.2, g: 0, col: '130,220,255', size: 1.6 });
      this.finishFrame(dt, inp, mx); return;
    }
    // ---- horizontal
    const ms = G.moveSpeedMul();
    let maxRun = K.RUN * ms * (this.crouching ? 0.42 : 1) * (this.swimming ? 0.62 : 1) * (this.reloading > 0 && false ? 0.9 : 1);
    if (ctrl && this.wallLock <= 0) {
      const acc = this.onGround ? K.ACC : K.AIR_ACC;
      if (mx !== 0) { if (Math.sign(this.vx) !== mx && this.vx !== 0) this.vx += mx * acc * 1.6 * dt; else this.vx += mx * acc * dt; this.vx = U.clamp(this.vx, -Math.max(maxRun, Math.abs(this.vx) > maxRun && this.knockT <= 0 ? Math.abs(this.vx) - 900 * dt : 0), Math.max(maxRun, 0)); }
      else this.vx = U.approach(this.vx, 0, (this.onGround ? K.FRIC : 700) * dt);
    } else if (this.wallLock > 0 && ctrl) { if (mx !== 0) this.vx += mx * 900 * dt; }
    // ---- wall cling
    this.wallDir = 0; this.wallCling = false;
    if (!this.onGround && !this.swimming && G.hasAbility('gecko') && ctrl) {
      const wl = w.rectHitsSolid(this.x - 2, this.y + 10, 2, this.h - 24), wr = w.rectHitsSolid(this.x + this.w, this.y + 10, 2, this.h - 24);
      if (wl && mx < 0) this.wallDir = -1; else if (wr && mx > 0) this.wallDir = 1; else if (wl && this.vy > 0 && mx <= 0 && false) this.wallDir = -1;
      if (this.wallDir !== 0 && this.vy > -80) { this.wallCling = true; if (this.vy > K.WALL_SLIDE) this.vy = K.WALL_SLIDE; this.face = this.wallDir; this.airJumps = 0; this.airDashed = false; if (Math.random() < 0.08) G.fx.add({ t: 'smoke', x: this.cx + this.wallDir * 12, y: this.y + 40, vx: 0, vy: 20, life: 0.3, max: 0.3, col: '150,140,120', size: 3, grow: 10, a: 0.3 }); }
    }
    // ---- jump
    const canGround = this.onGround || this.coyote > 0;
    if (ctrl && this.jumpBuf > 0) {
      if (this.swimming) { this.vy = -300; this.jumpBuf = 0; this.swimT = 0.25; CD.audio.play('splash'); }
      else if (canGround) { if (this.crouching && inp.d && this.onPlatform()) { this.drop = 0.22; this.vy = 60; this.onGround = false; this.coyote = 0; this.jumpBuf = 0; } else { this.vy = -K.JUMP; this.jumping = true; this.jumpBuf = 0; this.coyote = 0; this.onGround = false; this.airJumps = 0; G.fx.dust(this.cx, this.y + this.h, 4, 0); CD.audio.play('jump'); if (this.crouching) { this.crouching = false; this.setSize(K.H); } } }
      else if (this.wallCling && this.wallDir !== 0) { this.vy = -K.WALL_JY; this.vx = -this.wallDir * K.WALL_JX; this.wallLock = 0.16; this.face = -this.wallDir; this.jumpBuf = 0; this.jumping = true; this.wallCling = false; G.fx.dust(this.cx + this.wallDir * 10, this.cy, 5, -this.wallDir); CD.audio.play('jump'); }
      else if (G.hasAbility('jetboots') && this.airJumps < 1) { this.vy = -K.DJUMP; this.airJumps++; this.jumpBuf = 0; this.jumping = true; this.doubleJumped = true; this.jetT = 0.3; CD.audio.play('jet'); G.fx.ring(this.cx, this.y + this.h, 30, '255,190,110', 0.25); for (let i = 0; i < 12; i++) G.fx.add({ t: 'fire', x: this.cx + (Math.random() - 0.5) * 14, y: this.y + this.h, vx: (Math.random() - 0.5) * 120, vy: 100 + Math.random() * 160, life: 0.3, max: 0.3, size: 8 + Math.random() * 8 }); }
    }
    // variable jump height
    if (this.jumping && !jumpH && this.vy < -260 && !this.doubleJumped) { this.vy *= 0.55; this.jumping = false; }
    if (this.jumping && this.vy >= 0) this.jumping = false;
    // ---- vertical motion
    let grav = K.GRAV, maxFall = K.MAXFALL;
    if (this.swimming) { grav = 520; maxFall = 150; this.vy = Math.max(this.vy, -420); if (inp.u) this.vy -= 900 * dt; if (inp.d) this.vy += 700 * dt; }
    else if (this.vy < 0 && this.jumping && jumpH) grav = K.GRAV * 0.86;
    this.prevVy = this.vy;
    const flags = CD.moveActor(this, dt, { gravity: grav, maxFall, drop: this.drop > 0 });
    if (this.platform && this.onGround) { /* carried below */ }
    // landing
    if (flags.down) {
      if (!this.wasGround && this.prevVy > 380) { this.landT = 0.12; G.fx.dust(this.cx, this.y + this.h, this.prevVy > 700 ? 8 : 4, 0); CD.audio.play(this.prevVy > 700 ? 'land_hard' : 'land'); if (this.prevVy > 800) G.fx.shake(2.5, 0.12); }
      this.coyote = K.COYOTE; this.airJumps = 0; this.airDashed = false; this.doubleJumped = false; this.jumping = false;
    } else if (this.wasGround && !flags.down && this.vy >= 0) this.coyote = K.COYOTE;
    this.wasGround = flags.down;
    this.finishFrame(dt, inp, mx);
  }
  onPlatform() { const w = G.world, ty = Math.floor((this.y + this.h + 2) / T); return w.tile(Math.floor(this.cx / T), ty) === TILE.PLAT; }

  finishFrame(dt, inp, mx) {
    const I = CD.input, st = G.st, w = G.world; const locked = G.controlsLocked();
    if (this.platform && this.onGround) { const p = this.platform; this.x += p.dx || 0; this.y += (p.dy || 0); } this.platform = null;
    // ---- hazards
    if (this.hitTimer <= 0) this.checkHazards();
    // ---- aim & face
    this.updateAim(inp, mx);
    // ---- combat
    if (!locked && this.knockT <= 0) this.combat(dt, inp);
    // ---- regen/buffs
    st.ap = Math.min(G.maxAP(), st.ap + G.apRegen() * dt * (G.vatsActive ? 0 : 1));
    if (this.jetT > 0) { this.jetT -= dt; if (Math.random() < 0.7) G.fx.add({ t: 'fire', x: this.cx + (Math.random() - 0.5) * 10, y: this.y + this.h - 2, vx: (Math.random() - 0.5) * 50, vy: 140 + Math.random() * 120, life: 0.22, max: 0.22, size: 7 + Math.random() * 6 }); }
    // ---- animation phase
    const sp = Math.abs(this.vx);
    if (this.onGround && sp > 20 && !this.dashT) { const dirMul = (Math.sign(this.vx) === this.face || this.aimActive <= 0) ? 1 : -1; this.phase += sp * 0.086 * dt * dirMul; this.stepT -= dt * sp; if (this.stepT <= 0) { this.stepT = 190; CD.audio.play('step'); if (sp > 200 && Math.random() < 0.4) G.fx.dust(this.cx, this.y + this.h, 1, -Math.sign(this.vx)); } }
    else if (!this.onGround) this.phase += 0;
    this.pose = this.buildPose();
    // muzzle location
    if (this.pose && this.pose.wristN) { const wp = this.weaponSpec(); if (wp && wp.mx) { const m = CD.Rig.muzzle(this.pose, wp, this.face, 1); this.muzzleX = this.cx + m[0]; this.muzzleY = this.bottom + m[1]; } else { this.muzzleX = this.muzzleY = undefined; } }
    // dash trail decay
    for (const d of this.dashTrail) d.t -= dt; while (this.dashTrail.length && this.dashTrail[0].t <= 0) this.dashTrail.shift();
  }

  checkHazards() {
    const w = G.world, x0 = Math.floor(this.x / T), x1 = Math.floor((this.x + this.w) / T), y0 = Math.floor(this.y / T), y1 = Math.floor((this.y + this.h - 1) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = w.tile(tx, ty);
      if (t === TILE.SPIKE && !G.perk('lightstep')) { const top = (ty + 1) * T - 20; if (this.y + this.h > top + 4 && this.x + this.w > tx * T + 6 && this.x < (tx + 1) * T - 6) { if (G.hurtPlayer(28, { kind: 'hazard', knock: 0 })) { this.vy = -520; this.hitTimer = 0.3; this.onGround = false; } return; } }
      else if (t === TILE.SPIKE_D) { const bot = ty * T + 20; if (this.y < bot - 4 && this.x + this.w > tx * T + 6 && this.x < (tx + 1) * T - 6) { if (G.hurtPlayer(28, { kind: 'hazard', knock: 0 })) { this.vy = 260; this.hitTimer = 0.3; } return; } }
    }
  }

  weaponSpec() {
    const wd = G.curWeapon(); const sp = CD.Rig.weaponSprite(wd.sprite); if (!sp) return null;
    return { sprite: sp, twoHand: wd.twoHand || false, melee: wd.kind === 'melee', mx: sp.mx, my: 0, kick: this.recoil, holdAng: 0, idleAng: 0.95 };
  }

  updateAim(inp, mx) {
    const I = CD.input, wd = G.curWeapon();
    let ax, ay; const chestY = this.y + (this.crouching ? 12 : 22);
    if (I.aimMode === 'mouse' || I.mouse.moved) { const m = G.mouseWorld; ax = m.x - this.cx; ay = m.y - chestY; }
    else if (I.aimMode === 'pad' && Math.abs(I.padAxes.rx) + Math.abs(I.padAxes.ry) > 0.35) { ax = I.padAxes.rx; ay = I.padAxes.ry; }
    else { ax = this.face; ay = (inp.u ? -1 : 0) + (inp.d && !this.onGround ? 1 : 0); if (inp.u && mx === 0) ax = 0.001 * this.face; else if (ay !== 0 && mx !== 0) { ax = mx; } if (inp.d && this.onGround) ay = 0; }
    if (ax === 0 && ay === 0) ax = this.face;
    if (this.dashT <= 0 && !this.climbing && !this.wallCling && this.knockT <= 0 && !this.dead) {
      const mouseLike = I.aimMode === 'mouse' || I.mouse.moved || (I.aimMode === 'pad');
      if (mouseLike && wd.kind === 'gun') this.face = ax >= 0 ? 1 : -1;
      else if (mx !== 0) this.face = mx;
      else if (this.aimActive > 0 && mouseLike) this.face = ax >= 0 ? 1 : -1;
    }
    const a = Math.atan2(ay, ax * this.face);   // local angle relative to facing (range -pi..pi)
    let la = a; if (la > Math.PI / 2) la = Math.PI - la; if (la < -Math.PI / 2) la = -Math.PI - la;   // never point backwards
    if (Math.abs(a) > Math.PI / 2 + 0.01 && (I.aimMode === 'keys' && !I.mouse.moved)) la = 0;
    this.aimLocal = U.clamp(la, -1.45, 1.45);
    this.aim = this.face >= 0 ? this.aimLocal : Math.PI - this.aimLocal;   // world angle
    if (this.face < 0) { this.aim = Math.atan2(Math.sin(this.aimLocal), -Math.cos(this.aimLocal)); }
  }

  combat(dt, inp) {
    const I = CD.input, st = G.st, wd = G.curWeapon(), id = G.curWeaponId();
    // weapon switching
    for (let i = 1; i <= 9; i++) if (I.pressed('slot' + i) && st.weapons[i - 1] && st.wi !== i - 1) this.switchWeapon(i - 1);
    if (I.pressed('next')) this.switchWeapon((st.wi + 1) % st.weapons.length);
    if (I.pressed('prev')) this.switchWeapon((st.wi + st.weapons.length - 1) % st.weapons.length);
    if (I.pressed('heal')) { if (G.useAid('stimpak')) { this.invuln = Math.max(this.invuln, 0.05); } }
    if (I.pressed('reload')) G.startReload(this);
    if (I.pressed('grenade')) G.throwGrenade(this, this.aim);
    const shootHeld = I.held('shoot') || (I.aimMode === 'pad' && false);
    const shootP = I.pressed('shoot');
    if (I.pressed('melee') && this.meleeT <= 0) this.startMelee(G.meleeWeapon());
    if (this.meleeT > 0) this.updateMelee(dt);
    if (wd.kind === 'melee') {
      if (shootP && this.meleeT <= 0) this.startMelee(wd);
      else if (shootHeld && wd.multi && this.meleeT <= 0) this.startMelee(wd);
      return;
    }
    // gun
    if (shootHeld || shootP) this.aimActive = 1.0;
    if (this.reloading > 0 || this.meleeT > 0) return;
    if ((wd.auto ? shootHeld : shootP) && this.fireCd <= 0) {
      if (G.fireGun(this, this.aim)) this.fireCd = 1 / wd.rate;
    } else if (!wd.auto && shootHeld && this.fireCd <= 0 && !shootP) { /* semi-auto needs a fresh press; allow buffered press */ }
    if (shootP && this.fireCd > 0 && this.fireCd < 0.09) this.bufShot = 0.09;
    if (this.bufShot > 0) { this.bufShot -= dt; if (this.fireCd <= 0 && this.reloading <= 0) { if (G.fireGun(this, this.aim)) this.fireCd = 1 / wd.rate; this.bufShot = 0; } }
  }
  switchWeapon(i) {
    const st = G.st; if (i === st.wi) return;
    st.wi = i; this.reloading = 0; this.slotT = 1.6; this.bufShot = 0; CD.audio.play('switch');
    const w = G.curWeapon(); this.fireCd = Math.max(this.fireCd, 0.15); this.aimActive = 0.5; void w;
  }
  startMelee(wd) {
    if (!wd || this.meleeT > 0) return;
    this.melee = wd; this.meleeMax = 1 / wd.rate; this.meleeT = this.meleeMax; this.meleeHit.clear(); this.reloading = 0; this.meleeKind = wd.swingKind || 'chop';
    this.bufShot = 0; this.aimActive = 0;
    CD.audio.play(wd.heavy ? 'swing_heavy' : 'swing');
    this.meleeDir = 0; if (CD.input.mouse.moved || CD.input.aimMode === 'mouse') this.face = G.mouseWorld.x >= this.cx ? 1 : -1;
  }
  updateMelee(dt) {
    const wd = this.melee; if (!wd) return;
    const k = 1 - this.meleeT / this.meleeMax;   // 0..1
    if (k > 0.3 && k < 0.6 && (!this.meleeHit.size || wd.multi)) this.meleeStrike(wd);
    if (k > 0.3 && k < 0.6) this.meleeStrike(wd);
  }
  meleeStrike(wd) {
    const reach = wd.reach, f = this.face;
    const bx = f > 0 ? this.x + this.w - 4 : this.x - reach + 4, by = this.y + (this.crouching ? 2 : 8), bw = reach, bh = this.crouching ? 34 : 54;
    const hb = { x: bx, y: by, w: bw, h: bh };
    let hit = false;
    for (const e of G.hurtables) {
      if (e.dead || !e.hittable || !e.awake || this.meleeHit.has(e)) continue;
      if (U.overlap(hb, e)) {
        this.meleeHit.add(e); hit = true;
        const crit = Math.random() < 0.05 + G.special('L') * 0.006;
        G.damageEnemy(e, wd.dmg * G.damageMul({ weapon: this.curId(), melee: true }), { x: e.cx - f * e.w * 0.3, y: e.cy, dx: f, dy: -0.2, knock: wd.knock, kind: 'melee', crit, heavy: wd.heavy, ignoreInvuln: false });
        if (wd.multi) this.meleeHit.delete(e);
      }
    }
    // cracked walls
    if (wd.breaks && G.hasAbility('powerfist')) {
      const tx0 = Math.floor(hb.x / T), tx1 = Math.floor((hb.x + hb.w) / T), ty0 = Math.floor(hb.y / T), ty1 = Math.floor((hb.y + hb.h) / T);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (G.world.tile(tx, ty) === TILE.BREAK) { G.breakTile(tx, ty); hit = true; G.hitstop = 0.08; }
    } else if (wd.breaks === undefined) {
      // regular melee weapons only scuff the cracked wall
      const tx = Math.floor((f > 0 ? hb.x + hb.w : hb.x) / T), ty = Math.floor((hb.y + hb.h / 2) / T);
      if (G.world.tile(tx, ty) === TILE.BREAK && !this.scuffT) { this.scuffT = 1; G.fx.spark((tx + (f > 0 ? 0 : 1)) * T, ty * T + 20, 5, -f, -0.3, 1.5, 200); CD.audio.play('hit_metal'); G.notify('The wall barely notices. Something heavier might.', 'small'); setTimeout(() => (this.scuffT = 0), 2500); }
    }
    if (hit) { if (!this.meleeHitSfx || this.meleeHitSfx < G.time - 0.08) { CD.audio.play(wd.heavy ? 'melee_heavy' : 'melee_hit'); this.meleeHitSfx = G.time; } G.fx.shake(wd.heavy ? 5 : 2.5, 0.12); }
  }
  curId() { return G.curWeaponId(); }

  // ---- animation pose
  buildPose() {
    const wd = G.curWeapon(), inp = CD.input;
    let mode = 'idle';
    if (this.dead) mode = 'dead';
    else if (this.climbing) mode = 'ladder';
    else if (this.dashT > 0) mode = 'dash';
    else if (this.swimming) mode = 'swim';
    else if (this.wallCling) mode = 'wall';
    else if (!this.onGround) mode = this.vy < 0 ? (this.doubleJumped && this.jetT > 0 ? 'doublejump' : 'jump') : 'fall';
    else if (this.crouching) mode = 'crouch';
    else if (Math.abs(this.vx) > 20) mode = 'run';
    const s = { mode, phase: this.phase, t: this.t, speed: Math.abs(this.vx) / (K.RUN * 1.0), vy: this.vy, climb: this.climbPh, hurt: this.hurtT > 0 ? this.hurtT / 0.4 : 0, crouch: 0 };
    if (mode === 'crouch') s.speed = Math.abs(this.vx) / 120;
    const noAim = mode === 'ladder' || mode === 'dash' || mode === 'wall' || mode === 'swim' || mode === 'dead';
    if (wd.kind === 'gun' && !noAim) {
      const idle = this.aimActive > 0 || CD.input.aimMode === 'mouse';
      s.aim = idle ? this.aimLocal : Math.max(this.aimLocal * 0.3, 0.32);
      s.twoHand = wd.twoHand ? wd.twoHand : false; s.recoil = this.recoil * 0.6;
      if (this.reloading > 0) { s.aim = 0.95; s.twoHand = false; }
    } else if (wd.kind === 'melee' && this.meleeT > 0) {
      s.swing = 1 - this.meleeT / this.meleeMax; s.swingKind = this.meleeKind;
    }
    if (this.meleeT > 0 && wd.kind === 'gun') { s.aim = undefined; s.swing = 1 - this.meleeT / this.meleeMax; s.swingKind = 'chop'; }
    return CD.Rig.pose(s);
  }
  drawWeapon() {
    let wd = G.curWeapon(); if (this.meleeT > 0 && wd.kind === 'gun') wd = G.meleeWeapon();
    const sp = CD.Rig.weaponSprite(wd.sprite); if (!sp) return null;
    return { sprite: sp, twoHand: wd.twoHand || false, melee: wd.kind === 'melee' || (this.meleeT > 0), mx: sp.mx, kick: this.recoil, holdAng: wd.punch ? 0 : 0.1, idleAng: 1.0 };
  }
  draw(ctx) {
    if (!this.pose) this.pose = this.buildPose();
    const flicker = this.invuln > 0 && !this.dead && Math.floor(this.t * 18) % 2 === 0 && this.hurtT <= 0.25;
    // dash after-images
    for (const d of this.dashTrail) { CD.Rig.draw(ctx, this.rig, this.pose, { x: d.x + this.w / 2, y: d.y + this.h, scale: 1, face: d.face, alpha: Math.max(0, d.t) * 1.6 * 0.5, weapon: null }); }
    // contact shadow
    if (this.onGround) { ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(this.cx, this.y + this.h - 1, 14, 3.4, 0, 0, 7); ctx.fill(); }
    let rot = 0, ox = 0, oy = 0;
    if (this.dead) { rot = Math.min(1, this.deadT * 2.2) * (Math.PI / 2) * -this.face * 0.98; oy = 0; }
    const wp = this.dead ? null : this.drawWeapon();
    CD.Rig.draw(ctx, this.rig, this.pose, { x: this.cx + ox, y: this.y + this.h + oy, scale: 1, face: this.face, weapon: wp, alpha: flicker ? 0.35 : 1, rot });
    if (this.flashT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; CD.Rig.draw(ctx, this.rig, this.pose, { x: this.cx, y: this.y + this.h, scale: 1, face: this.face, weapon: wp }); ctx.restore(); }
    // muzzle flash
    if (this.muzzleFlash > 0 && this.muzzleX !== undefined) {
      const a = this.aim; ctx.save(); ctx.translate(this.muzzleX, this.muzzleY); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter';
      const wd = G.curWeapon(); const col = wd.pk === 'laser' ? '255,90,70' : wd.pk === 'plasma' ? '120,255,190' : '255,214,140';
      const gr = ctx.createRadialGradient(4, 0, 0, 4, 0, 26); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.3, 'rgba(' + col + ',0.8)'); gr.addColorStop(1, 'rgba(' + col + ',0)'); ctx.fillStyle = gr; ctx.fillRect(-10, -26, 56, 52);
      ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(22, 0); ctx.lineTo(0, 3); ctx.fill(); ctx.restore();
    }
    // jet flames
    if (this.jetT > 0) { /* particles handle it */ }
    // reload arc / status above head
    if (this.reloading > 0) { const k = 1 - this.reloading / this.reloadMax; ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(this.cx, this.y - 12, 8, -Math.PI / 2, Math.PI * 1.5); ctx.stroke(); ctx.strokeStyle = '#7dff9c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(this.cx, this.y - 12, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); ctx.restore(); }
  }
  light(L) {
    // Pip-Boy glow + a headlamp-ish personal light so dark rooms stay playable
    const st = G.st;
    L.add({ x: this.cx, y: this.y + 16, r: 300, color: [0.7, 1, 0.85], i: 0.66, shadow: true, prio: 5 });
    L.add({ x: this.cx + this.face * 4, y: this.y + 30, r: 70, color: [0.3, 1, 0.5], i: 0.32, shadow: false });
    if (this.muzzleFlash > 0 && this.muzzleX !== undefined) { const wd = G.curWeapon(); L.add({ x: this.muzzleX, y: this.muzzleY, r: 200, color: wd.pk === 'laser' ? [1, 0.3, 0.2] : wd.pk === 'plasma' ? [0.4, 1, 0.7] : [1, 0.8, 0.5], i: 1.5, shadow: true }); }
    if (this.jetT > 0) L.add({ x: this.cx, y: this.y + this.h, r: 140, color: [1, 0.6, 0.25], i: 0.9, shadow: false });
    if (this.dashT > 0) L.add({ x: this.cx, y: this.cy, r: 120, color: [0.4, 0.8, 1], i: 0.8, shadow: false });
  }
}
CD.Player = Player;
G.meleeWeapon = function () {
  const st = G.st; const cur = CD.WEAPONS[st.weapons[st.wi]]; if (cur && cur.kind === 'melee') return cur;
  // best owned melee
  let best = CD.WEAPONS.wrench;
  for (const id of st.weapons) { const w = CD.WEAPONS[id]; if (w && w.kind === 'melee' && w.dmg > best.dmg && id !== 'powerfist') best = w; }
  return best;
};

})();
