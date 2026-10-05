// The hero: movement, the gauntlet string, air attacks, run ram, grabs and throws, weapons,
// health-costing specials (with recoverable grey HP) and the Rage overdrive.

const HERO = { name: 'MAGS' };

// Attack table. Frame data at 60fps. reach = [near, far] px ahead of the body centre,
// zr = [low, high] px above the feet, depth = max |dy| for a hit to land.
const P_ATK = {
  jab:     { pose: 'jab',   start: 4, active: 2, rec: 8,  dmg: 5,  tier: 1, kb: 1.2, stun: 16, reach: [2, 24], zr: [16, 40], depth: 8, whiff: 'whoosh', next: 'cross' },
  cross:   { pose: 'cross', start: 4, active: 2, rec: 9,  dmg: 6,  tier: 1, kb: 1.2, stun: 16, reach: [2, 26], zr: [16, 40], depth: 8, whiff: 'whoosh', next: 'hook', lunge: 1.2 },
  hook:    { pose: 'hook',  start: 6, active: 3, rec: 12, dmg: 9,  tier: 2, kb: 1.8, stun: 22, reach: [2, 26], zr: [14, 40], depth: 8, whiff: 'whoosh', next: 'fin', lunge: 1.2 },
  upper:   { pose: 'upper', start: 8, active: 4, rec: 22, dmg: 15, tier: 4, knock: true, kx: 2.0, kz: 5.0, reach: [0, 26], zr: [6, 46], depth: 9, whiff: 'whooshBig', steam: true, jumpCancel: 8, lunge: 1.0 },
  straight:{ pose: 'straight', start: 9, active: 4, rec: 22, dmg: 16, tier: 4, knock: true, kx: 5.5, kz: 1.6, reach: [0, 30], zr: [10, 40], depth: 9, whiff: 'whooshBig', steam: true, blast: true, lunge: 1.2 },
  backfist:{ pose: 'backfist', start: 5, active: 3, rec: 12, dmg: 9, tier: 2, kb: 2.0, stun: 20, reach: [2, 26], zr: [16, 40], depth: 8, whiff: 'whoosh', turn: true },
  ram:     { pose: 'ram',   start: 5, active: 12, rec: 16, dmg: 13, tier: 3, knock: true, kx: 3.8, kz: 2.2, reach: [-2, 22], zr: [6, 40], depth: 9, whiff: 'whooshBig', ram: true },
  airkick: { pose: 'airkick', start: 3, active: 18, rec: 0, dmg: 11, tier: 2, knock: true, kx: 2.6, kz: 2.4, reach: [-2, 24], zr: [-14, 24], depth: 9, whiff: 'whoosh', air: true },
  knee:    { pose: 'flyknee', start: 3, active: 60, rec: 0, dmg: 14, tier: 3, knock: true, kx: 3.6, kz: 2.6, reach: [0, 22], zr: [-10, 26], depth: 9, whiff: 'whoosh', air: true },
  burst:   { pose: 'burst', start: 2, active: 9, rec: 18, dmg: 14, tier: 3, knock: true, kx: 3.5, kz: 3.2, reach: [-40, 40], zr: [-4, 50], depth: 18, radial: true, cost: 10 },
  // weapons
  pipe:    { pose: 'swing', start: 7, active: 4, rec: 14, dmg: 14, tier: 2, kb: 1.6, stun: 22, reach: [4, 34], zr: [10, 44], depth: 9, whiff: 'whooshBig', sfx: 'hitMetal', weapon: true },
  sign:    { pose: 'bigswing', start: 10, active: 5, rec: 18, dmg: 17, tier: 3, knock: true, kx: 3.2, kz: 3.4, reach: [0, 38], zr: [4, 48], depth: 14, whiff: 'whooshBig', sfx: 'boing', weapon: true },
  spear:   { pose: 'thrust', start: 6, active: 4, rec: 12, dmg: 12, tier: 2, kb: 1.4, stun: 20, reach: [6, 44], zr: [14, 36], depth: 6, whiff: 'whoosh', venom: 120, weapon: true, sfx: 'hitShell' },
};
const WEAPONS = {
  pipe:   { atk: 'pipe', uses: 8, name: 'PIPE' },
  sign:   { atk: 'sign', uses: 6, name: 'STOP SIGN' },
  spear:  { atk: 'spear', uses: 10, name: 'STINGER' },
  bottle: { atk: null, uses: 1, name: 'FIRE BOTTLE' },
};

class Player extends Fighter {
  constructor(x, y) {
    super(x, y);
    this.team = 'player';
    this.family = 'hero';
    this.hp = this.maxHp = 100;
    this.grey = 0;
    this.w = 7; this.h = 42;
    this.walkX = 1.6; this.walkY = 1.0; this.runX = 3.0; this.runY = 0.8;
    this.shadowR = 9;
    this.grabbing = null; this.grabT = 0; this.knees = 0; this.grabPush = 0;
    this.connected = false;
    this.buf = { attack: -99, jump: -99, special: -99 };
    this.comboHits = 0; this.comboT = 0; this.bestCombo = 0; this.comboPop = 0;
    this.weapon = null;
    this.pipeStreak = 0;
    this.downTime = 36;
    this.recentHits = [];
    this.scarf = null; this.tail = null;
    this.ghosts = [];
    this.airUsed = false;
    this.damageTaken = 0;
  }
  get grabbable() { return false; }
  get vulnerable() {
    if (this.inv > 0 || ['down', 'getup', 'dead', 'overdrive', 'meteor', 'barrage'].includes(this.state)) return false;
    if (this.state === 'attack' && this.atk === P_ATK.burst && this.t <= 16) return false;
    if (this.state === 'grab' && this.sub === 'toss') return false;
    return true;
  }

  update(bounds, foes) {
    for (const k of ['attack', 'jump', 'special']) if (Input.pressed(k)) this.buf[k] = Input.frame;
    if (this.comboT > 0 && --this.comboT === 0) this.endCombo();
    if (this.comboPop > 0) this.comboPop--;
    this.physics(bounds);
    if (this.state === 'down' && Input.anyPressed) this.t += 2;      // mash to get up sooner
    if (this.state === 'hurt' || this.state === 'fall' || this.state === 'down' || this.state === 'getup' || this.state === 'grabbed') {
      if (this.state === 'grabbed') this.heldUpdate();
      if (this.state === 'getup' && this.t >= 18) { this.setState('idle'); this.inv = 60; this.blink = true; return; }
      if (this.state === 'down') {
        if (this.hp <= 0) { if (this.t > 70) Game.playerDied(); return; }
        if (this.t >= this.downTime) this.setState('getup');
        return;
      }
      if (this.state === 'getup') return;
      this.reactionStates();
      return;
    }
    if (this.inv <= 0) this.blink = false;
    const busy = this.stateUpdate(bounds, foes);
    if (!busy) this.control(foes);
    if ((this.state === 'run' || (this.state === 'attack' && this.atk && this.atk.ram)) && Game.frame % 3 === 0) this.ghosts.push({ x: this.x, y: this.y, z: this.z, f: this.facing, t: 0, pose: this.currentPose() });
    for (const g of this.ghosts) g.t++;
    this.ghosts = this.ghosts.filter(g => g.t < 12);
  }
  buffered(k, win = 8) { return Input.frame - this.buf[k] <= win; }
  consume(k) { this.buf[k] = -99; }

  // ---------- states ----------
  stateUpdate(bounds, foes) {
    switch (this.state) {
      case 'attack': return this.attackUpdate(foes);
      case 'jumpsquat':
        if (this.t >= 3) {
          this.vz = 5.0; this.z = 0.1;
          const dx = Input.dirX();
          this.jumpDir = dx;
          this.vx = dx * (this.wasRunning ? this.runX : this.walkX);
          if (dx) this.facing = dx;
          this.setState('jump');
          this.airUsed = false;
          Sound.sfx('jump', this.x);
        }
        return true;
      case 'jump':
        if (this.buffered('special') && this.canPay(12)) { this.consume('special'); this.startMeteor(); return true; }
        if (this.buffered('attack') && !this.airUsed) {
          this.consume('attack');
          this.airUsed = true;
          if (this.weapon && this.weapon.kind === 'bottle') { this.throwBottle(); return true; }
          this.airAttack(this.jumpDir ? P_ATK.knee : P_ATK.airkick);
        }
        return true;
      case 'land':
        this.vx *= 0.6;
        if (this.t >= 2 && this.buffered('attack')) return false;
        if (this.t >= 4) this.setState('idle');
        return true;
      case 'skid':
        this.vx *= 0.82;
        if (this.t % 3 === 0) FX.dust(this.x + this.facing * 4, this.y, 1, 0.8);
        if (this.t >= 6) this.setState('idle');
        return true;
      case 'grab': return this.grabUpdate();
      case 'pickup':
        this.vx = 0;
        if (this.t >= 8) this.setState('idle');
        return true;
      case 'throwing':
        if (this.t >= 14) this.setState('idle');
        return true;
      case 'meteor': return this.meteorUpdate(foes);
      case 'overdrive': return this.overdriveUpdate(foes);
      case 'barrage': return this.barrageUpdate();
    }
    return false;
  }
  attackUpdate(foes) {
    const a = this.atk;
    const ph = this.atkPhase();
    if (a.air) {
      this.resolveAttack(foes);
      if (this.z <= 0 && this.t > 1) { this.setState('land'); this.atk = null; this.t = -4; }
      else if (a === P_ATK.airkick && this.t > a.start + a.active) { this.state = 'jump'; this.atk = null; }
      return true;
    }
    if (a.ram && ph === 'active') this.vx = this.ramV = (this.ramV || 4.0) * 0.92 * (this.t === a.start ? 0 : 1) + (this.t === a.start ? 4.0 * this.facing : 0);
    else if (a.lunge && ph === 'start') this.vx = a.lunge * this.facing;
    else this.vx *= 0.7;
    if (a.ram && ph === 'active' && this.t % 3 === 0) FX.steam(this.x - this.facing * 6, this.y, 22, 1);
    if (this.t === a.start && a.steam) FX.steam(this.x + this.facing * 10, this.y, 26, 4);
    if (a.radial && this.t === a.start) this.burstFx();
    const n = a.radial ? this.resolveRadial(foes, a) : this.resolveAttack(foes);
    void n;
    // cancels
    const afterActive = this.t >= a.start + a.active;
    if (this.buffered('special') && this.t >= a.start + 1 && !a.radial && this.canPay(10)) {
      this.consume('special');
      this.doBurst();
      return true;
    }
    if (a.jumpCancel && this.connected && this.t >= a.start + a.active + a.jumpCancel && this.buffered('jump')) {
      this.consume('jump');
      this.atk = null;
      this.wasRunning = false;
      this.setState('jumpsquat');
      return true;
    }
    if (afterActive && this.connected && a.next && this.buffered('attack', 10)) {
      this.consume('attack');
      let next = P_ATK[a.next] || null;
      if (a.next === 'fin') next = Input.dirX() === this.facing ? P_ATK.straight : P_ATK.upper;
      this.chain(next);
      return true;
    }
    if (ph === 'done') {
      this.atk = null;
      this.setState('idle');
      return false;
    }
    return true;
  }
  resolveRadial(foes, a) {
    if (this.atkPhase() !== 'active') return 0;
    let n = 0;
    for (const t of foes) {
      if (this.atkHit.has(t.id) || !t.vulnerable) continue;
      if (Math.abs(t.y - this.y) > a.depth || Math.abs(t.x - this.x) > 40 + t.w || t.z > 50) continue;
      this.atkHit.add(t.id);
      n++;
      t.takeHit(this, a, t.x >= this.x ? 1 : -1, n);
    }
    return n;
  }
  chain(a) { this.connected = false; this.startAttack(a); }
  airAttack(a) {
    this.atk = a; this.atkHit = new Set();
    this.state = 'attack'; this.t = 0;
    this.connected = false;
  }
  onLandNormal() {
    if (this.state === 'jump') { this.setState('land'); FX.dust(this.x, this.y, 3); Sound.sfx('land', this.x); }
  }
  // Called by targets when this player's attack lands.
  onLanded(target, a, dmg, tier) {
    this.connected = true;
    this.comboHits++;
    this.comboT = 60;
    this.comboPop = 6;
    this.bestCombo = Math.max(this.bestCombo, this.comboHits);
    Game.addScore(Math.round((dmg || a.dmg || 0) * 10 * (1 + 0.1 * Math.min(this.comboHits, 30))));
    Game.addRage((dmg || a.dmg || 0) / 2);
    if (this.grey > 0) { const r = Math.min(2, this.grey); this.grey -= r; this.hp = Math.min(this.maxHp, this.hp + r); }
    if (a.air && a === P_ATK.knee) this.vx += 0.5 * this.facing;
    if (a.weapon && this.weapon) {
      if (a === P_ATK.pipe && ++this.pipeStreak % 3 === 0) {
        target.knockDown(this.facing, 2.8 * target.weight, 3.0);
      }
      if (--this.weapon.uses <= 0) this.breakWeapon();
    }
    if (this.atk === P_ATK.ram && target.weight >= 1) {
      // keep plowing
    } else if (target.heavy && !a.radial) this.vx = -this.facing * 0.4;
  }
  endCombo() {
    const n = this.comboHits;
    if (n >= 40) FX.showBanner('APOCALYPTIC!', '#ff3b6b');
    else if (n >= 25) FX.showBanner('SAVAGE!', '#ff8a1e');
    else if (n >= 15) FX.showBanner('BRUTAL!', '#ffd23f');
    if (n >= 15) Sound.sfx('chime');
    this.comboHits = 0;
  }

  // ---------- control ----------
  control(foes) {
    const dx = Input.dirX(), dy = Input.dirY();
    if (this.buffered('jump', 6)) {
      this.consume('jump');
      this.wasRunning = this.state === 'run';
      this.setState('jumpsquat');
      this.vx *= 0.5;
      return;
    }
    if (this.buffered('special')) {
      this.consume('special');
      if (Game.rage >= 100) { this.startOverdrive(); return; }
      if (this.weapon && this.weapon.kind !== 'bottle') { this.throwWeapon(); return; }
      if (this.weapon && this.weapon.kind === 'bottle') { this.throwBottle(); return; }
      if (this.canPay(10)) { this.doBurst(); return; }
    }
    if (this.buffered('attack')) {
      this.consume('attack');
      const item = Game.itemUnder(this);
      if (item && !this.enemyAhead(foes, 30)) { this.pickup(item); return; }
      this.connected = false;
      if (this.weapon) {
        if (this.weapon.kind === 'bottle') { this.throwBottle(); return; }
        if (dx) this.facing = dx;
        this.startAttack(P_ATK[WEAPONS[this.weapon.kind].atk]);
        return;
      }
      if (this.state === 'run') { this.ramV = 4.0; this.startAttack(P_ATK.ram); return; }
      if (dx && dx === -this.facing) { this.facing = dx; this.startAttack(P_ATK.backfist); return; }
      if (dx) this.facing = dx;
      this.startAttack(P_ATK.jab);
      return;
    }
    if (this.state === 'run') {
      if (dx !== this.facing) { this.setState('skid'); return; }
      this.vx = this.runX * this.facing;
      this.vy = dy * this.runY;
      if (this.t % 8 === 0) { FX.dust(this.x - this.facing * 4, this.y, 1, 0.6); Sound.sfx('step', this.x); }
      return;
    }
    if (dx && (Input.doubleTap('left') || Input.doubleTap('right'))) {
      this.facing = dx;
      this.setState('run');
      return;
    }
    this.vx = dx * this.walkX;
    this.vy = dy * this.walkY;
    if (dx) this.facing = dx;
    const moving = dx || dy;
    if (moving && this.state !== 'walk') this.setState('walk');
    if (!moving && this.state !== 'idle') this.setState('idle');
    if (this.state === 'walk' && this.t % 12 === 0) Sound.sfx('step', this.x);
    // grab: keep pushing into an enemy
    if (dx && !this.weapon) {
      const f = foes.find(e => e.team === 'enemy' && e.grabbable && e.canBeGrabbed() && Math.abs(e.y - this.y) < 5 &&
        sign(e.x - this.x) === dx && Math.abs(e.x - this.x) < 14 + e.w * 0.3 && e.z < 2);
      if (f) { if (++this.grabPush >= 4) this.startGrab(f); }
      else this.grabPush = 0;
    } else this.grabPush = 0;
  }
  enemyAhead(foes, d) {
    return foes.some(e => e.team === 'enemy' && e.alive && Math.abs(e.y - this.y) < 10 && (e.x - this.x) * this.facing > 0 && Math.abs(e.x - this.x) < d);
  }
  physics(bounds) {
    super.physics(bounds);
    if (!['walk', 'run', 'hurt', 'fall', 'attack'].includes(this.state)) this.vy = 0;
    if (this.state === 'attack' && !(this.atk && this.atk.air)) this.vy *= 0.5;
  }
  pickup(item) {
    item.collect(this);
    this.setState('pickup');
    this.vx = this.vy = 0;
  }

  // ---------- costs, specials ----------
  canPay(c) { return this.hp > 1; }
  pay(c) {
    const paid = Math.min(c, this.hp - 1);
    this.hp -= paid;
    this.grey = Math.min(this.maxHp - this.hp, this.grey + paid);
  }
  doBurst() {
    this.pay(P_ATK.burst.cost);
    this.connected = false;
    this.startAttack(P_ATK.burst);
    this.vx = 0;
    if (this.grabbing) this.releaseHold();
  }
  burstFx() {
    FX.add({ kind: 'ring', x: this.x, y: this.y, z: 2, life: 10, size: 44, color: '#ffe08a', g: 0 });
    FX.add({ kind: 'ring', x: this.x, y: this.y, z: 2, life: 14, size: 52, color: '#e2591e', g: 0 });
    FX.debris(this.x, this.y, 2, ['#8c6a44', '#6b5440'], 8);
    FX.steam(this.x, this.y, 20, 6);
    FX.shake(2, 10);
    Sound.sfx('special', this.x);
  }
  startMeteor() {
    this.pay(12);
    this.setState('meteor');
    this.sub = 'hang';
    this.vx = 0; this.vz = 0;
    Sound.sfx('whistle', this.x);
  }
  meteorUpdate(foes) {
    if (this.sub === 'hang') {
      this.vz = 0; this.z += 0.3;
      if (this.t >= 6) { this.sub = 'drop'; this.vz = -8; }
      return true;
    }
    if (this.sub === 'drop') {
      this.vz = -8;
      if (this.z <= 0) {
        this.z = 0; this.vz = 0;
        this.sub = 'impact'; this.t = 0;
        const a = { dmg: 18, tier: 4, knock: true, kx: 3.0, kz: 3.0, zr: [0, 50] };
        let n = 0;
        for (const e of foes) {
          if (Math.abs(e.y - this.y) > 16 || Math.abs(e.x - this.x) > 46 + e.w) continue;
          if (e.vulnerable) { n++; e.takeHit(this, a, e.x >= this.x ? 1 : -1, n); }
          else if (e.state === 'down' && !e.dying && e.team === 'enemy') { // OTG
            n++; e.takeHit(this, { dmg: 9, tier: 3, knock: true, kx: 1.5, kz: 2.4, zr: [0, 20] }, e.x >= this.x ? 1 : -1, n);
          }
        }
        FX.dustRing(this.x, this.y, 18);
        FX.add({ kind: 'ring', x: this.x, y: this.y, z: 1, life: 14, size: 50, color: '#ffffff', g: 0 });
        FX.debris(this.x, this.y, 2, ['#8c6a44', '#6b5440'], 10);
        FX.shake(4, 16);
        Sound.sfx('hitFinisher', this.x);
        Sound.sfx('thud', this.x);
      }
      return true;
    }
    // impact recovery
    if (this.t >= 16) { this.setState('idle'); this.inv = Math.max(this.inv, 4); }
    return true;
  }
  startOverdrive() {
    Game.rage = 0;
    Game.superFreeze = 24;
    Game.superText = 'PISTON KING!';
    this.setState('overdrive');
    this.pinned = [];
    this.inv = 999;
    Sound.sfx('shing', this.x);
    FX.flash('#ffffff', 3, 0.5);
  }
  overdriveUpdate(foes) {
    this.vx = 5 * this.facing;
    this.vy = 0;
    if (this.t % 2 === 0) this.ghosts.push({ x: this.x, y: this.y, z: 0, f: this.facing, t: 0, pose: PlayerPoses.ram('active') });
    for (const e of foes) {
      if (e.team !== 'enemy' || e.dying || e.state === 'down' || this.pinned.includes(e)) continue;
      if (Math.abs(e.y - this.y) <= 12 && Math.abs(e.x - this.x) < 16 + e.w && e.z < 30) {
        e.atk = null;
        if (e.grabbedBy) e.releaseGrab();
        e.setState('pinned');
        e.vx = e.vy = 0;
        if (e.dropToken) e.dropToken();
        this.pinned.push(e);
        FX.hit(e.x, e.y, 24, 2, this.facing, '#ff9a2e');
        Sound.sfx('hitMid', e.x);
      }
    }
    if (this.t >= 24 || this.x >= Game.bounds.xMax - 2 || this.x <= Game.bounds.xMin + 2) {
      this.vx = 0;
      this.setState('barrage');
    }
    return true;
  }
  barrageUpdate() {
    this.vx = 0;
    const live = this.pinned.filter(e => !e.remove);
    if (this.t > 0 && this.t <= 24 && this.t % 4 === 0) {
      for (const e of live) {
        e.state = 'pinned';
        e.takeHit(this, { dmg: 6, tier: 1, hitstop: 2, kb: 0, stun: 30, zr: [16, 36] }, this.facing);
        if (e.state !== 'pinned' && e.state !== 'fall') e.state = 'pinned';
      }
      FX.steam(this.x + this.facing * 10, this.y, 26, 1);
    }
    if (this.t === 30) {
      for (const e of live) {
        if (e.state === 'down') continue;
        e.state = 'idle';
        e.takeHit(this, { dmg: 24, tier: 5, knock: true, kx: 2.0, kz: 6.0, zr: [0, 60] }, this.facing);
      }
      if (!live.length) Sound.sfx('hitFinisher', this.x);
    }
    if (this.t >= 44) {
      for (const e of this.pinned) if (e.state === 'pinned') e.setState('idle');
      this.pinned = [];
      this.setState('idle');
      this.inv = 30;
    }
    return true;
  }

  // ---------- grabs ----------
  startGrab(f) {
    this.grabPush = 0;
    this.grabbing = f;
    f.grabbedBy = this;
    f.atk = null;
    if (f.dropToken) f.dropToken();
    f.setState('grabbed');
    f.vx = f.vy = 0;
    f.facing = -this.facing;
    this.setState('grab');
    this.sub = 'hold';
    this.vx = this.vy = 0;
    this.grabT = 0; this.knees = 0;
    Sound.sfx('grab', this.x);
  }
  grabUpdate() {
    const f = this.grabbing;
    if (this.sub === 'toss' || this.sub === 'suplex') return this.throwAnim();
    if (!f || f.grabbedBy !== this || f.dying) { this.grabbing = null; this.setState('idle'); return true; }
    this.grabT++;
    f.x = this.x + this.facing * (12 + f.w * 0.3);
    f.y = this.y + 0.5;
    if (this.sub === 'knee') { if (this.t < 13) return true; this.sub = 'hold'; }
    if (this.buffered('special') && this.canPay(10)) { this.consume('special'); this.releaseHold(); this.doBurst(); return true; }
    if (this.buffered('attack')) {
      this.consume('attack');
      const dx = Input.dirX();
      if (dx === -this.facing && !f.noSuplex) { this.startThrow('suplex'); return true; }
      if (dx === this.facing || this.knees >= 2 || f.tossOnly) { this.startThrow('toss'); return true; }
      this.knees++;
      this.sub = 'knee'; this.t = 0;
      f.takeHit(this, { dmg: 6, tier: 1, kb: 0, stun: 40, zr: [10, 30] }, this.facing);
      if (f.state !== 'grabbed' && !f.dying && f.state !== 'fall') { f.setState('grabbed'); f.grabbedBy = this; }
      if (f.dying || f.state === 'fall') { this.grabbing = null; this.setState('idle'); }
      return true;
    }
    if (this.buffered('jump')) { this.consume('jump'); this.releaseHold(); this.setState('jumpsquat'); return true; }
    if (this.grabT > 90) {
      this.releaseHold();
      f.setState('hurt'); f.hurtTime = 6; f.vx = this.facing * 1.5;
      this.setState('hurt'); this.hurtTime = 10; this.vx = -this.facing * 1.2;
    }
    return true;
  }
  startThrow(kind) {
    this.sub = kind; this.t = 0;
    const f = this.grabbing;
    if (f) { f.state = 'held'; f.t = 0; }
    if (kind === 'toss') Sound.sfx('whooshBig', this.x);
  }
  throwAnim() {
    const f = this.grabbing;
    if (this.sub === 'toss') {
      if (f && this.t < 6) { f.x = this.x + this.facing * 12; f.z = this.t * 2; }
      if (f && this.t === 6) {
        this.releaseHold();
        f.setState('thrown'); f.atk = null;
        f.vx = this.facing * 5.0 * Math.min(1.2, f.weight); f.vz = 2.8; f.z = 12;
        f.facing = -this.facing;
        f.thrownBy = this; f.bowled = new Set();
        f.tossDmg = 14;
        if (f.onTossed) f.onTossed(this);
        Sound.sfx('throwObj', this.x);
        this.addCombo();
      }
      if (this.t >= 22) this.setState('idle');
      return true;
    }
    // suplex: 10f lift, 14f arc over the head, slam behind
    if (f) {
      if (this.t <= 10) { f.x = this.x + this.facing * 12; f.z = this.t * 2.2; }
      else if (this.t <= 24) {
        const k = (this.t - 10) / 14;
        f.x = this.x + this.facing * lerp(12, -16, k);
        f.z = 22 + Math.sin(k * Math.PI) * 18 - k * 22;
        f.facing = k > 0.5 ? this.facing : -this.facing;
      }
      if (this.t === 24) {
        const sx = this.x - this.facing * 16;
        this.releaseHold();
        f.x = sx; f.z = 0;
        f.state = 'idle';
        f.takeHit(this, { dmg: 20, tier: 4, knock: true, kx: 1.0, kz: 2.0, zr: [0, 50], sfx: 'hitFinisher' }, -this.facing);
        for (const e of Game.foes()) {
          if (e === f || !e.vulnerable || Math.abs(e.y - this.y) > 12 || Math.abs(e.x - sx) > 22 + e.w) continue;
          e.takeHit(this, { dmg: 10, tier: 3, knock: true, kx: 2.4, kz: 3.0, zr: [0, 50] }, e.x >= sx ? 1 : -1);
        }
        FX.dustRing(sx, this.y, 12);
        FX.shake(3, 12);
      }
    }
    if (this.t >= 36) this.setState('idle');
    return true;
  }
  addCombo() { this.comboHits++; this.comboT = 60; this.comboPop = 6; this.bestCombo = Math.max(this.bestCombo, this.comboHits); }
  releaseHold() {
    const f = this.grabbing;
    if (f) { f.grabbedBy = null; if (f.state === 'grabbed' || f.state === 'held') f.setState('idle'); }
    this.grabbing = null;
  }

  // being held by an enemy (Shambler clutch etc). The holder drives damage; we handle mashing.
  heldUpdate() {
    const h = this.heldBy;
    if (!h || h.remove || h.dying || h.state !== 'clutch') { this.heldBy = null; this.setState('idle'); return; }
    if (Input.anyPressed) h.clutchT = (h.clutchT || 0) + (h.mashK || 5);
    if (this.buffered('special') && h.burstEscapes !== false && this.canPay(10)) {
      this.consume('special');
      this.heldBy = null;
      h.releaseClutch && h.releaseClutch();
      this.setState('idle');
      this.doBurst();
    }
  }

  // ---------- weapons ----------
  giveWeapon(kind) {
    if (this.weapon) this.dropWeapon();
    this.weapon = { kind, uses: WEAPONS[kind].uses };
    this.pipeStreak = 0;
  }
  dropWeapon() {
    if (!this.weapon) return;
    const it = Game.add(new Item(this.weapon.kind, this.x - this.facing * 8, this.y, 2.5));
    it.uses = this.weapon.uses;
    it.life = 300;
    this.weapon = null;
  }
  breakWeapon() {
    FX.shards(this.x + this.facing * 20, this.y, 24, 5, ['#8a8f96', '#5e6168']);
    Sound.sfx('weaponBreak', this.x);
    FX.text(this.x, this.y, 52, WEAPONS[this.weapon.kind].name + ' BROKE', '#c0c6cc', 50);
    this.weapon = null;
  }
  throwWeapon() {
    const k = this.weapon.kind;
    this.weapon = null;
    Game.add(new Proj(this.x + this.facing * 10, this.y, 24, { kind: 'thrown_' + k, vx: this.facing * 6, vz: 0, gravity: 0, dmg: 18, tier: 3, knock: true, owner: this, life: 27, friendly: true, pierce: 1 }));
    this.setState('throwing');
    Sound.sfx('throwObj', this.x);
  }
  throwBottle() {
    this.weapon = null;
    Game.add(new Proj(this.x + this.facing * 8, this.y, 30, { kind: 'molotov', vx: this.facing * 2.7, vz: 2.0, gravity: 0.15, dmg: 8, tier: 2, knock: true, owner: this, friendly: true, burn: 60 }));
    if (this.state !== 'jump') this.setState('throwing');
    Sound.sfx('throwObj', this.x);
  }

  // ---------- getting hit ----------
  takeHit(src, a, dir, nth) {
    if (this.grabbing) this.releaseHold();
    if (this.state === 'jumpsquat') this.setState('idle');
    this.grey = 0;
    const heavy = a.knock;
    // anti-stunlock: the 3rd light hit within 90f knocks down
    this.recentHits = this.recentHits.filter(t => Game.frame - t < 90);
    this.recentHits.push(Game.frame);
    const forceKD = !heavy && this.recentHits.length >= 3;
    const aa = forceKD ? Object.assign({}, a, { knock: true, kx: 2.2, kz: 3.0 }) : a;
    const before = this.hp;
    super.takeHit(src, aa, dir, nth);
    const taken = before - this.hp;
    this.damageTaken += taken;
    Game.addRage(taken);
    this.comboHits = 0; this.comboT = 0;
    this.hs = Math.max(this.hs, heavy ? 7 : 4);
    FX.shake(2, 8);
    FX.hurtVignette();
    Game.portraitHit = 8;
    Sound.sfx('hurt', this.x);
    if (this.state === 'hurt') this.hurtTime = (a.tier || 1) >= 2 ? 18 : 14;
    if (this.state === 'fall') { this.recentHits = []; if (this.weapon) this.dropWeapon(); }
  }
  onDeath() { /* handled by Game.playerDied after the knockdown */ }

  // ---------- drawing ----------
  currentPose() {
    const t = this.t;
    switch (this.state) {
      case 'idle': return Poses.idle(Game.frame);
      case 'walk': return Poses.walk(Game.frame, 1.1);
      case 'run': return Poses.run(Game.frame);
      case 'skid': return pose({ hy: -18, rot: -0.3, fThigh: 0.9, fKnee: -0.2, bThigh: -0.4, bKnee: -0.6, fUpper: 0.8, fElbow: 1.2, bUpper: -0.6, bElbow: 1.0 });
      case 'jumpsquat': case 'land': case 'pickup': return Poses.crouch();
      case 'jump': return Poses.jump(this.vz);
      case 'hurt': return (this.hurtAlt || 0) % 2 ? Poses.hurt(t) : PlayerPoses.gutfold(t);
      case 'fall': return Poses.fall(t, this.vz);
      case 'down': return Poses.down();
      case 'getup': return Poses.getup(t * 16 / 18);
      case 'grabbed': return Poses.grabbed(t);
      case 'grab':
        if (this.sub === 'knee') return PlayerPoses.kneeHit(t);
        if (this.sub === 'toss') return PlayerPoses.toss(t);
        if (this.sub === 'suplex') return PlayerPoses.suplex(t);
        return PlayerPoses.hold(t);
      case 'throwing': return PlayerPoses.toss(t + 6);
      case 'meteor': return this.sub === 'impact' ? PlayerPoses.slam() : PlayerPoses.meteor(this.sub);
      case 'overdrive': return PlayerPoses.ram('active');
      case 'barrage': return t < 30 ? PlayerPoses.barrage(t) : PlayerPoses.upper('active');
      case 'attack': {
        const a = this.atk;
        return (PlayerPoses[a.pose] || PlayerPoses.jab)(this.atkPhase(), this.t, a, this);
      }
    }
    return Poses.idle(Game.frame);
  }
  draw(ctx, camX) {
    // afterimages
    for (const g of this.ghosts) {
      Sprite.begin(112, 96, 56, 88);
      drawHumanoid(g.pose, HERO_STYLE(this, true));
      Sprite.end(ctx, g.x - camX, g.y - g.z, g.f, { flash: '#ff9a2e', alpha: 0.4 * (1 - g.t / 12), outline: null });
    }
    if (this.blink && this.inv > 0 && (this.inv >> 2) % 2) return;
    const p = this.currentPose();
    Sprite.begin(112, 96, 56, 88);
    drawHumanoid(p, HERO_STYLE(this, false));
    Sprite.end(ctx, this.x - camX + this.jitter, this.y - this.z, this.facing, {
      flash: this.flash > 0 ? '#ffffff' : null,
      tint: this.venom > 0 ? ['#7cff4f', 0.3] : this.tintT > 0 ? ['#ff5a3a', this.tintT / 12] : null,
    });
  }
}

// Hero attack poses: (phase, t, attack, player) -> pose. 'f' arm = the gauntlet (near) arm.
const PlayerPoses = {
  jab(ph) { // rear-arm quick punch
    if (ph === 'start') return pose({ rot: 0.08, fThigh: 0.35, fKnee: -0.3, bThigh: -0.35, bKnee: -0.2, fUpper: 0.5, fElbow: 2.1, bUpper: 0.6, bElbow: 2.0 });
    if (ph === 'active') return pose({ hx: 1, rot: 0.22, fThigh: 0.4, fKnee: -0.3, bThigh: -0.45, bKnee: -0.15, fUpper: 0.4, fElbow: 2.2, bUpper: 1.6, bElbow: 0 });
    return pose({ rot: 0.15, fThigh: 0.35, fKnee: -0.3, bThigh: -0.4, bKnee: -0.2, fUpper: 0.45, fElbow: 2.1, bUpper: 1.0, bElbow: 1.2 });
  },
  cross(ph) { // gauntlet straight
    if (ph === 'start') return pose({ rot: 0.0, fThigh: 0.35, fKnee: -0.3, bThigh: -0.35, bKnee: -0.2, fUpper: 0.2, fElbow: 2.2, bUpper: 0.5, bElbow: 2.1 });
    if (ph === 'active') return pose({ hx: 2, rot: 0.3, fThigh: 0.5, fKnee: -0.35, bThigh: -0.45, bKnee: -0.1, fUpper: 1.6, fElbow: 0, bUpper: 0.4, bElbow: 2.2 });
    return pose({ rot: 0.2, fThigh: 0.4, fKnee: -0.3, bThigh: -0.4, bKnee: -0.2, fUpper: 1.0, fElbow: 1.0, bUpper: 0.4, bElbow: 2.1 });
  },
  hook(ph) {
    if (ph === 'start') return pose({ rot: -0.12, fThigh: 0.3, fKnee: -0.4, bThigh: -0.4, bKnee: -0.3, fUpper: -0.5, fElbow: 1.7, bUpper: 0.4, bElbow: 2.1, head: -0.1 });
    if (ph === 'active') return pose({ hx: 2, hy: -19, rot: 0.3, fThigh: 0.55, fKnee: -0.5, bThigh: -0.45, bKnee: -0.2, fUpper: 1.9, fElbow: 0.9, bUpper: 0.3, bElbow: 2.2 });
    return pose({ rot: 0.15, fThigh: 0.4, fKnee: -0.4, bThigh: -0.4, bKnee: -0.2, fUpper: 1.3, fElbow: 1.3, bUpper: 0.3, bElbow: 2.1 });
  },
  upper(ph, t) {
    if (ph === 'start') return pose({ hy: -16, rot: 0.35, fThigh: 0.8, fKnee: -1.3, bThigh: -0.3, bKnee: -0.6, fUpper: -0.3, fElbow: 1.4, bUpper: 0.5, bElbow: 2.0, head: 0.1 });
    if (ph === 'active') return pose({ hx: 2, hy: -21, rot: -0.1, fThigh: 0.3, fKnee: -0.1, bThigh: -0.5, bKnee: -0.1, fUpper: 2.9, fElbow: 0.25, bUpper: 0.2, bElbow: 2.2, head: -0.3 });
    return pose({ hy: -20, rot: 0.0, fThigh: 0.3, fKnee: -0.2, bThigh: -0.4, bKnee: -0.2, fUpper: 2.4, fElbow: 0.6, bUpper: 0.3, bElbow: 2.0 });
  },
  straight(ph) {
    if (ph === 'start') return pose({ hx: -2, rot: -0.15, fThigh: 0.2, fKnee: -0.5, bThigh: -0.5, bKnee: -0.4, fUpper: -0.2, fElbow: 2.4, bUpper: 0.6, bElbow: 1.8, head: 0.1 });
    if (ph === 'active') return pose({ hx: 4, hy: -19, rot: 0.45, fThigh: 0.8, fKnee: -0.6, bThigh: -0.7, bKnee: 0, fUpper: 1.55, fElbow: 0, bUpper: -0.6, bElbow: 1.0 });
    return pose({ hx: 2, rot: 0.3, fThigh: 0.6, fKnee: -0.5, bThigh: -0.5, bKnee: -0.1, fUpper: 1.3, fElbow: 0.4, bUpper: 0, bElbow: 1.4 });
  },
  backfist(ph) {
    if (ph === 'start') return pose({ rot: 0.1, fThigh: 0.2, fKnee: -0.3, bThigh: -0.3, bKnee: -0.2, fUpper: 2.4, fElbow: 1.8, bUpper: 0.4, bElbow: 2.0 });
    if (ph === 'active') return pose({ hx: 1, rot: 0.15, fThigh: 0.4, fKnee: -0.3, bThigh: -0.4, bKnee: -0.2, fUpper: 1.4, fElbow: -0.3, bUpper: 0.2, bElbow: 2.0 });
    return pose({ rot: 0.1, fThigh: 0.35, fKnee: -0.3, bThigh: -0.35, bKnee: -0.2, fUpper: 1.0, fElbow: 0.8, bUpper: 0.3, bElbow: 2.0 });
  },
  ram(ph) {
    if (ph === 'start') return Poses.run(4);
    return pose({ hy: -18, rot: 0.6, fThigh: 0.9, fKnee: -0.8, bThigh: -0.6, bKnee: -0.4, fUpper: 1.2, fElbow: 1.7, bUpper: 0.9, bElbow: 2.1, head: -0.45 });
  },
  airkick(ph, t, a, pl) {
    if (ph === 'start') return Poses.jump(pl.vz);
    return pose({ hy: -20, rot: -0.35, fThigh: 1.7, fKnee: -0.05, bThigh: 0.3, bKnee: -1.5, fUpper: 1.0, fElbow: 1.6, bUpper: -1.0, bElbow: 0.8 });
  },
  flyknee(ph, t, a, pl) {
    if (ph === 'start') return Poses.jump(pl.vz);
    return pose({ hy: -19, rot: 0.2, fThigh: 1.9, fKnee: -2.3, bThigh: -0.2, bKnee: -1.0, fUpper: 2.0, fElbow: 1.0, bUpper: -0.6, bElbow: 1.0, head: -0.2 });
  },
  burst(ph, t) {
    if (ph === 'start') return pose({ hy: -16, rot: 0.3, fThigh: 0.8, fKnee: -1.3, bThigh: -0.3, bKnee: -0.9, fUpper: 2.8, fElbow: 0.3, bUpper: 0.4, bElbow: 2.0 });
    if (ph === 'active') return pose({ hy: -13, rot: 0.7, fThigh: 1.1, fKnee: -1.8, bThigh: -0.6, bKnee: -1.0, fUpper: 0.2, fElbow: 0.1, bUpper: -0.8, bElbow: 1.2, head: -0.3 });
    return pose({ hy: -15, rot: 0.45, fThigh: 0.9, fKnee: -1.4, bThigh: -0.4, bKnee: -0.9, fUpper: 0.6, fElbow: 0.6, bUpper: -0.2, bElbow: 1.6 });
  },
  meteor(sub) {
    if (sub === 'hang') return pose({ hy: -20, rot: -0.2, fThigh: 0.9, fKnee: -1.7, bThigh: 0.3, bKnee: -1.5, fUpper: 3.0, fElbow: 0.4, bUpper: 2.5, bElbow: 0.6 });
    return pose({ hy: -21, rot: 0.3, fThigh: 0.4, fKnee: -0.8, bThigh: 0.0, bKnee: -0.6, fUpper: 0.3, fElbow: 0.1, bUpper: 0.6, bElbow: 0.6, head: 0.2 });
  },
  slam() { return pose({ hy: -12, rot: 0.8, fThigh: 1.2, fKnee: -2.0, bThigh: -0.6, bKnee: -1.2, fUpper: 0.1, fElbow: 0, bUpper: -0.8, bElbow: 1.2, head: -0.3 }); },
  barrage(t) {
    const k = (t >> 1) % 2;
    return pose({ hx: 1, rot: 0.25, fThigh: 0.45, fKnee: -0.3, bThigh: -0.45, bKnee: -0.15, fUpper: k ? 1.6 : 0.9, fElbow: k ? 0 : 1.6, bUpper: k ? 0.9 : 1.6, bElbow: k ? 1.6 : 0 });
  },
  gutfold(t) {
    const k = Math.min(1, t / 4);
    return pose({ hx: -1, hy: -18, rot: 0.45 * k, head: 0.3 * k, fThigh: 0.3, fKnee: -0.6, bThigh: -0.2, bKnee: -0.5, fUpper: 0.6, fElbow: 1.8, bUpper: 0.4, bElbow: 2.0 });
  },
  hold() { return pose({ rot: 0.2, fThigh: 0.4, fKnee: -0.4, bThigh: -0.4, bKnee: -0.2, fUpper: 1.3, fElbow: 0.6, bUpper: 1.1, bElbow: 0.9 }); },
  kneeHit(t) {
    const k = t < 6 ? t / 6 : Math.max(0, 1 - (t - 6) / 7);
    return pose({ rot: 0.3, fThigh: 0.2 + 1.5 * k, fKnee: -0.4 - 1.6 * k, bThigh: -0.3, bKnee: -0.1, fUpper: 1.3, fElbow: 0.9, bUpper: 1.0, bElbow: 1.1 });
  },
  toss(t) {
    const k = clamp(t / 10, 0, 1);
    return pose({ rot: lerp(0.35, -0.2, k), fThigh: 0.6, fKnee: -0.6, bThigh: -0.4, bKnee: -0.2, fUpper: lerp(1.1, 1.8, k), fElbow: lerp(0.8, 0, k), bUpper: lerp(1.0, 1.6, k), bElbow: 0.4 });
  },
  suplex(t) {
    const k = clamp((t - 6) / 18, 0, 1);
    return pose({ hy: -19, rot: lerp(0.1, -0.9, k), fThigh: 0.3, fKnee: -0.5, bThigh: -0.3, bKnee: -0.4, fUpper: lerp(1.6, 3.4, k), fElbow: 0.5, bUpper: lerp(1.5, 3.2, k), bElbow: 0.5, head: -0.3 * k });
  },
  swing(ph) {
    if (ph === 'start') return pose({ rot: -0.15, fThigh: 0.35, fKnee: -0.3, bThigh: -0.35, bKnee: -0.2, fUpper: 2.8, fElbow: 0.4, bUpper: 2.6, bElbow: 0.6 });
    if (ph === 'active') return pose({ hx: 2, rot: 0.35, fThigh: 0.5, fKnee: -0.4, bThigh: -0.45, bKnee: -0.1, fUpper: 1.3, fElbow: 0.1, bUpper: 1.1, bElbow: 0.3 });
    return pose({ rot: 0.25, fThigh: 0.45, fKnee: -0.35, bThigh: -0.4, bKnee: -0.15, fUpper: 0.7, fElbow: 0.3, bUpper: 0.6, bElbow: 0.4 });
  },
  bigswing(ph) {
    if (ph === 'start') return pose({ rot: -0.3, hx: -2, fThigh: 0.2, fKnee: -0.4, bThigh: -0.5, bKnee: -0.3, fUpper: 3.2, fElbow: 0.3, bUpper: 3.0, bElbow: 0.5 });
    if (ph === 'active') return pose({ hx: 3, rot: 0.5, fThigh: 0.7, fKnee: -0.6, bThigh: -0.5, bKnee: 0, fUpper: 0.9, fElbow: 0, bUpper: 0.8, bElbow: 0.2 });
    return pose({ rot: 0.35, fThigh: 0.6, fKnee: -0.5, bThigh: -0.45, bKnee: -0.1, fUpper: 0.5, fElbow: 0.2, bUpper: 0.5, bElbow: 0.3 });
  },
  thrust(ph) {
    if (ph === 'start') return pose({ hx: -1, rot: -0.1, fThigh: 0.3, fKnee: -0.4, bThigh: -0.4, bKnee: -0.3, fUpper: 1.0, fElbow: 1.8, bUpper: 0.8, bElbow: 1.9 });
    if (ph === 'active') return pose({ hx: 3, rot: 0.35, fThigh: 0.6, fKnee: -0.4, bThigh: -0.5, bKnee: 0, fUpper: 1.55, fElbow: 0, bUpper: 1.4, bElbow: 0.3 });
    return pose({ rot: 0.2, fThigh: 0.45, fKnee: -0.35, bThigh: -0.4, bKnee: -0.15, fUpper: 1.3, fElbow: 0.6, bUpper: 1.1, bElbow: 0.8 });
  },
};

// ---------- hero art ----------
const HERO_PAL = {
  skin: '#c68a5a', jaw: '#9a6440', hair: '#d9452b', hairDk: '#a02f1c',
  top: '#5b6b3a', topDk: '#3e4a27', pants: '#4a3424', boots: '#2a2020', belt: '#2a1a10', buckle: '#e0b04a',
  scarf: '#e0b04a', scarfDk: '#b88a2a', bandage: '#d9cbb0',
  steel: '#8c8f96', steelDk: '#5e6168', steelHi: '#c9ced6', rust: '#a0522d', fist: '#6e7178',
  goggle: '#3fd0e0', strap: '#3a2a1a', kneepad: '#8c8f96',
};

function updateChain(pts, ax, ay, n, seg, facing, droop, wind) {
  if (!pts || pts.length !== n) { pts = []; for (let i = 0; i < n; i++) pts.push({ x: ax - facing * seg * (i + 1), y: ay + i }); }
  let px = ax, py = ay;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const tx = px - facing * seg + wind, ty = py + droop;
    p.x = lerp(p.x, tx, 0.35);
    p.y = lerp(p.y, ty, 0.35);
    // keep segment length bounded
    const dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy) || 1;
    if (d > seg * 1.6) { p.x = px + dx / d * seg * 1.6; p.y = py + dy / d * seg * 1.6; }
    px = p.x; py = p.y;
  }
  return pts;
}

function HERO_STYLE(pl, ghost) {
  const P = HERO_PAL;
  const rage = Game.rage / 100;
  return {
    skin: P.skin, top: P.top, sleeve: P.skin, arm: P.skin, pants: P.pants, boots: P.boots, belt: P.belt,
    hipW: 9, shW: 12, limbW: 5,
    torso(R, s) {
      // tank top seam + shoulders in skin
      Px.line(lerp(R.H.x, R.S.x, 0.2), lerp(R.H.y, R.S.y, 0.2), lerp(R.H.x, R.S.x, 0.85), lerp(R.H.y, R.S.y, 0.85), 1, P.topDk);
      Px.disc(R.S.x, R.S.y + 1, 3, P.skin);
      const b = { x: lerp(R.H.x, R.S.x, 0.06), y: lerp(R.H.y, R.S.y, 0.06) };
      Px.rect(b.x - 1, b.y - 1, 2, 2, P.buckle);
    },
    backHand(Hn, ang) {
      Px.disc(Hn.x, Hn.y, 2, P.skin);
      Px.dot(Hn.x - 1, Hn.y - 2, P.bandage);
    },
    head(Hd, th, s, R) {
      const fx = dirX(th - Math.PI / 2) , fy = dirY(th - Math.PI / 2); // forward-facing unit (perp to neck)
      void fx; void fy;
      // ponytail (behind head) — secondary motion chain in world space
      if (!ghost) {
        const wx = pl.x + pl.facing * (Hd.x - 4), wy = pl.y - pl.z + Hd.y - 3;
        pl.tail = updateChain(pl.tail, wx, wy, 3, 3, pl.facing, 1.2, -0.3 * pl.facing * 0);
      }
      if (pl.tail) pl.tail.forEach((p, i) => {
        const lx = (p.x - pl.x) * pl.facing, ly = p.y - (pl.y - pl.z);
        Px.disc(lx, ly, 2.5 - i * 0.5, i ? P.hairDk : P.hair);
      });
      Px.disc(Hd.x, Hd.y, 5, P.skin);
      Px.rect(Hd.x - 1, Hd.y + 2, 5, 2, P.jaw);
      // undercut swept back: three triangles
      Px.poly([Hd.x - 5, Hd.y - 1, Hd.x - 4, Hd.y - 6, Hd.x + 3, Hd.y - 6, Hd.x + 5, Hd.y - 3, Hd.x - 1, Hd.y - 3], P.hair);
      Px.poly([Hd.x - 6, Hd.y - 4, Hd.x - 1, Hd.y - 7, Hd.x - 2, Hd.y - 3], P.hairDk);
      Px.rect(Hd.x - 5, Hd.y - 2, 2, 4, P.hairDk);
      // goggles strap + lens
      Px.rect(Hd.x - 4, Hd.y - 3, 9, 1, P.strap);
      Px.disc(Hd.x + 2.5, Hd.y - 3.5, 1.5, P.goggle);
      Px.dot(Hd.x + 2, Hd.y - 4, '#e0ffff');
      Px.rect(Hd.x + 3, Hd.y - 1, 1, 2, '#1a1a1a');
    },
    hand(Hn, ang, s, R) {
      // the Scrapfist: draw forearm block + fist over the plain arm
      const E = R.fa.E;
      Px.line(R.S.x, R.S.y, E.x, E.y, 3, P.steelDk);
      Px.line(R.S.x, R.S.y - 1, E.x, E.y - 1, 1, P.steel);
      Px.quad(E.x, E.y, Hn.x, Hn.y, 7, 8, P.steel);
      const mx = lerp(E.x, Hn.x, 0.5), my = lerp(E.y, Hn.y, 0.5);
      Px.rect(mx - 1, my - 1, 2, 2, P.rust);
      const vc = rage >= 1 && (Game.frame >> 2) % 2 ? '#ffe066' : rage > 0.05 ? '#ff9a2e' : '#1a1a1a';
      for (let i = 0; i < 3; i++) {
        const k = 0.25 + i * 0.2;
        const vx = lerp(E.x, Hn.x, k), vy = lerp(E.y, Hn.y, k);
        Sprite.cur.ga.globalAlpha = rage > 0.05 ? 0.2 + 0.8 * rage : 1;
        Px.rect(vx, vy - 2, 1, 2, vc);
        Sprite.cur.ga.globalAlpha = 1;
      }
      // fist block, oriented along the forearm
      const ux = dirX(ang), uy = dirY(ang), vx = -uy, vy = ux;
      const fx = Hn.x + ux * 2, fy = Hn.y + uy * 2;
      Px.poly([fx - ux * 3 - vx * 4, fy - uy * 3 - vy * 4, fx + ux * 4 - vx * 4, fy + uy * 4 - vy * 4,
        fx + ux * 4 + vx * 4, fy + uy * 4 + vy * 4, fx - ux * 3 + vx * 4, fy - uy * 3 + vy * 4], P.fist);
      Px.dot(fx + ux * 2 - vx * 2, fy + uy * 2 - vy * 2, P.steelHi);
      Px.dot(fx + ux * 2 + vx * 2, fy + uy * 2 + vy * 2, P.steelHi);
      // held weapon
      if (pl.weapon && !ghost) drawHeldWeapon(pl.weapon.kind, fx, fy, ang);
    },
    after(R, s) {
      // knee pad on front leg
      Px.rect(R.fl.K.x - 2, R.fl.K.y - 1, 4, 3, P.kneepad);
      // scarf: two rects at the neck plus a trailing tail
      const nx = lerp(R.S.x, R.Hd.x, 0.35), ny = lerp(R.S.y, R.Hd.y, 0.35);
      Px.rect(nx - 3, ny - 1, 6, 3, P.scarf);
      if (!ghost) {
        const wx = pl.x + pl.facing * (nx - 2), wy = pl.y - pl.z + ny;
        const wind = pl.state === 'run' || pl.state === 'overdrive' ? 0 : -0.3 * pl.facing;
        pl.scarf = updateChain(pl.scarf, wx, wy, 3, 4, pl.facing, pl.airborne ? -0.6 : 1.0, wind);
      }
      if (pl.scarf) {
        let px = nx - 2, py = ny;
        pl.scarf.forEach((p, i) => {
          const lx = (p.x - pl.x) * pl.facing, ly = p.y - (pl.y - pl.z);
          Px.limb(px, py, lx, ly, 3 - i * 0.7, 2.5 - i * 0.7, i % 2 ? P.scarfDk : P.scarf);
          px = lx; py = ly;
        });
      }
    },
  };
}

function drawHeldWeapon(kind, x, y, ang) {
  const ux = dirX(ang), uy = dirY(ang);
  // weapons extend along the forearm direction, past the fist
  switch (kind) {
    case 'pipe':
      Px.line(x - ux * 6, y - uy * 6, x + ux * 18, y + uy * 18, 2, '#8a8f96');
      Px.rect(x + ux * 18 - 1, y + uy * 18 - 1, 3, 3, '#5e6168');
      break;
    case 'sign':
      Px.line(x - ux * 4, y - uy * 4, x + ux * 22, y + uy * 22, 2, '#8a8f96');
      Px.disc(x + ux * 24, y + uy * 24, 6, '#ffffff');
      Px.disc(x + ux * 24, y + uy * 24, 5, '#c8282e');
      break;
    case 'spear':
      for (let i = 0; i < 4; i++) Px.disc(x + ux * (i * 6 - 2), y + uy * (i * 6 - 2), 2, '#9a3f1e');
      Px.poly([x + ux * 22 - uy * 2, y + uy * 22 + ux * 2, x + ux * 30, y + uy * 30, x + ux * 22 + uy * 3, y + uy * 22 - ux * 3], '#f2e9c9');
      break;
    case 'bottle':
      Px.rect(x - 2, y - 6, 4, 6, '#4a7a3a');
      Px.disc(x, y - 8, 1.5 + (Game.frame >> 2) % 2 * 0.5, '#ffb030');
      break;
  }
}

function drawPortrait(ctx, x, y) {
  Px.use(ctx);
  const P = HERO_PAL;
  Px.disc(x, y - 6, 6, P.skin);
  Px.poly([x - 7, y - 6, x - 5, y - 13, x + 4, y - 13, x + 7, y - 9, x - 1, y - 9], P.hair);
  Px.rect(x - 6, y - 9, 13, 1, P.strap);
  Px.disc(x + 3, y - 9, 2, P.goggle);
  Px.rect(x + 2, y - 6, 1, 2, '#1a1a1a');
  Px.rect(x - 1, y - 2, 5, 2, P.jaw);
  Px.rect(x - 5, y, 11, 3, P.scarf);
}
