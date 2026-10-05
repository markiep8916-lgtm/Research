// The hero: movement, the gauntlet string, air attacks, run ram, grabs and throws, weapons,
// health-costing specials (with recoverable grey HP) and the Rage overdrive.

const HERO = { name: 'JUNO' };

// Attack table. Frame data at 60fps. reach = [near, far] px ahead of the body centre,
// zr = [low, high] px above the feet, depth = max |dy| for a hit to land.
const P_ATK = {
  jab:     { pose: 'jab',   start: 3, active: 2, rec: 7,  dmg: 4,  tier: 1, kb: 0.6, stun: 14, reach: [6, 28], zr: [4, 36], depth: 8, whiff: 'whoosh', next: 'cross' },
  cross:   { pose: 'cross', start: 3, active: 2, rec: 7,  dmg: 5,  tier: 1, kb: 0.6, stun: 14, reach: [6, 28], zr: [4, 36], depth: 8, whiff: 'whoosh', next: 'hook', lunge: 0.8 },
  hook:    { pose: 'hook',  start: 5, active: 3, rec: 10, dmg: 7,  tier: 2, kb: 1.2, stun: 18, reach: [6, 30], zr: [4, 36], depth: 8, whiff: 'whoosh', next: 'fin', lunge: 0.8 },
  upper:   { pose: 'upper', start: 7, active: 4, rec: 20, dmg: 12, tier: 3, knock: true, kx: 3.2, kz: 3.4, reach: [4, 28], zr: [4, 44], depth: 8, whiff: 'whooshBig', steam: true, jumpCancel: 8, lunge: 0.9 },
  straight:{ pose: 'straight', start: 8, active: 4, rec: 20, dmg: 12, tier: 3, knock: true, kx: 5.0, kz: 1.6, reach: [6, 32], zr: [4, 36], depth: 8, whiff: 'whooshBig', steam: true, blast: true, lunge: 0.8 },
  backfist:{ pose: 'backfist', start: 4, active: 3, rec: 12, dmg: 8, tier: 2, kb: 2.0, stun: 18, reach: [6, 28], zr: [4, 36], depth: 8, whiff: 'whoosh', turn: true },
  ram:     { pose: 'ram',   start: 4, active: 12, rec: 14, dmg: 10, tier: 3, knock: true, kx: 3.5, kz: 3.0, reach: [0, 22], zr: [4, 36], depth: 8, whiff: 'whooshBig', ram: true, maxTargets: 3 },
  flykick: { pose: 'airkick', start: 4, active: 90, rec: 0, dmg: 10, tier: 3, knock: true, kx: 3.2, kz: 3.0, reach: [4, 26], zr: [-12, 24], depth: 8, whiff: 'whoosh', air: true },
  hammer:  { pose: 'hammer', start: 5, active: 12, rec: 0, dmg: 9, tier: 2, kb: 1.0, stun: 20, reach: [-4, 20], zr: [-30, 10], depth: 8, whiff: 'whooshBig', air: true, hammer: true },
  burst:   { pose: 'burst', start: 4, active: 10, rec: 14, dmg: 14, tier: 3, knock: true, kx: 3.5, kz: 3.2, reach: [-42, 42], zr: [-4, 36], depth: 14, radial: true, cost: 8 },
  // weapons
  pipe:    { pose: 'swing', start: 6, active: 4, rec: 12, dmg: 10, tier: 2, kb: 1.6, stun: 20, reach: [8, 38], zr: [4, 44], depth: 8, whiff: 'whooshBig', sfx: 'hitMetal', weapon: true },
  machete: { pose: 'swing', start: 4, active: 3, rec: 9, dmg: 12, tier: 2, kb: 1.4, stun: 16, reach: [8, 34], zr: [4, 40], depth: 8, whiff: 'whoosh', sfx: 'hitMid', weapon: true },
  axe:     { pose: 'bigswing', start: 12, active: 5, rec: 18, dmg: 20, tier: 3, knock: true, kx: 3.2, kz: 3.4, reach: [6, 44], zr: [4, 48], depth: 12, whiff: 'whooshBig', sfx: 'boing', weapon: true },
};
const WEAPONS = {
  pipe:    { atk: 'pipe', uses: 24, name: 'LEAD PIPE', kdEvery: 3 },
  machete: { atk: 'machete', uses: 18, name: 'MACHETE', kdEvery: 3 },
  axe:     { atk: 'axe', uses: 10, name: 'STOP-SIGN AXE' },
  molotov: { atk: null, uses: 1, name: 'MOLOTOV' },
};

class Player extends Fighter {
  constructor(x, y) {
    super(x, y);
    this.team = 'player';
    this.family = 'hero';
    this.hp = this.maxHp = 100;
    this.grey = 0;
    this.grav = 0.28;
    this.w = 8; this.h = 40;
    this.walkX = 1.5; this.walkY = 1.0; this.runX = 2.8; this.runY = 0.8;
    this.shadowR = 9;
    this.grabbing = null; this.grabT = 0; this.knees = 0; this.grabPush = 0;
    this.connected = false;
    // Button buffers are stamped by Game.update (so presses during hitstop count) in player frames
    // (pf only advances when the hero updates, so a freeze never expires a buffered press).
    this.buf = { attack: -99, jump: -99, special: -99 };
    this.pf = 0;
    this.chainNext = null; this.chainT = 0;      // chain step still open for 16 f after recovery
    this.comboHits = 0; this.comboT = 0; this.bestCombo = 0; this.comboPop = 0;
    this.weapon = null;
    this.pipeStreak = 0;
    this.downTime = 36;
    this.recentHits = [];
    this.ghosts = [];
    this.airUsed = false;
    this.damageTaken = 0;
  }
  get grabbable() { return false; }
  get vulnerable() {
    if (this.inv > 0 || ['down', 'getup', 'dead', 'overdrive', 'meteor', 'barrage'].includes(this.state)) return false;
    if (this.state === 'attack' && this.atk === P_ATK.burst && this.t <= 24) return false;
    if (this.state === 'grab' && (this.sub === 'toss' || this.sub === 'suplex')) return false;
    // a knocked-down hero is intangible until she lands: no juggling her to death
    if (this.state === 'fall') return false;
    return true;
  }

  update(bounds, foes) {
    this.pf++;
    if (this.chainT > 0 && --this.chainT === 0) this.chainNext = null;
    if (this.comboT > 0 && --this.comboT === 0) this.endCombo();
    if (this.comboPop > 0) this.comboPop--;
    this.physics(bounds);
    if (this.state === 'down' && Input.anyPressed && this.hp > 0 && this.downTime - this.t > 18) this.t += 2;      // mash to get up sooner
    if (this.state === 'hurt' || this.state === 'fall' || this.state === 'down' || this.state === 'getup' || this.state === 'grabbed') {
      if (this.state === 'grabbed') this.heldUpdate();
      if (this.state === 'getup' && this.t >= 16) { this.setState('idle'); this.inv = 50; this.blink = true; return; }
      if (this.state === 'down') {
        if (this.hp <= 0) { if (this.t > 90) Game.playerDied(); return; }
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
  buffered(k, win = 8) { return this.pf - this.buf[k] <= win; }
  // Called by Game.update right after Input.update while in play.
  recordInput() {
    for (const k of ['attack', 'jump', 'special']) if (Input.pressed(k)) this.buf[k] = this.pf + 1;
    if (Input.pressed('attack')) this.bufDir = Input.dirX();       // direction held with the press
  }
  // Direction for a buffered J: what is held now, else what was held when J was pressed.
  pressDir() { return Input.dirX() || this.bufDir || 0; }
  consume(k) { this.buf[k] = -99; }

  // ---------- states ----------
  stateUpdate(bounds, foes) {
    switch (this.state) {
      case 'attack': return this.attackUpdate(foes);
      case 'jumpsquat':
        if (this.t >= 3) {
          this.vz = 4.6; this.z = 0.1;
          const dx = Input.dirX();
          this.jumpDir = dx;
          this.vx = dx * (this.wasRunning ? 2.6 : 1.6);
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
          if (this.weapon && this.weapon.kind === 'molotov') { this.throwBottle(); return true; }
          this.airAttack(this.jumpDir ? P_ATK.flykick : P_ATK.hammer);
        }
        return true;
      case 'land':
        this.vx *= 0.6;
        if (this.t >= 2 && !this.landLag && this.buffered('attack')) return false;
        if (this.t >= (this.landLag || 4)) {
          // keep a J pressed up to ~12 f before touchdown alive through the landing lag
          if (this.landLag && this.buffered('attack', this.landLag + 12)) this.buf.attack = this.pf;
          this.landLag = 0; this.setState('idle');
        }
        return true;
      case 'skid':
        this.vx *= 0.82;
        if (this.t % 3 === 0) FX.dust(this.x + this.facing * 4, this.y, 1, 0.8);
        if (this.t >= 6) this.setState('idle');
        return true;
      case 'grab': return this.grabUpdate();
      case 'pickup':
        this.vx = 0;
        if (this.t >= 10) this.setState('idle');
        return true;
      case 'throwing':
        if (this.t >= 14) this.setState('idle');
        return true;
      case 'meteor': return this.meteorUpdate(foes);
      case 'overdrive': return this.overdriveUpdate(foes);
      case 'barrage': return this.barrageUpdate();
      case 'victory':
        this.vx = this.vy = 0;
        if (this.t % 30 === 0) FX.steam(this.x + this.facing * 4, this.y, 46, 2);
        return true;
    }
    return false;
  }
  attackUpdate(foes) {
    const a = this.atk;
    const ph = this.atkPhase();
    if (a.air) {
      this.resolveAttack(foes);
      if (this.z <= 0 && this.t > 1) {
        if (a.hammer) this.hammerLand();
        this.setState('land'); this.atk = null; this.landLag = 8;
      } else if (a.hammer && this.t > a.start + a.active) { this.atkHit = this.atkHit || new Set(); }
      return true;
    }
    if (a.ram && ph === 'active') this.vx = 3.2 * this.facing;
    else if (a.lunge && ph === 'start') this.vx = a.lunge * this.facing;
    else this.vx *= 0.7;
    if (a.ram && ph === 'active' && this.t % 3 === 0) FX.steam(this.x - this.facing * 6, this.y, 22, 1);
    if (this.t === a.start && a.steam) FX.steam(this.x + this.facing * 10, this.y, 26, 4);
    if (this.t === a.start && !a.radial) this.smear(a);
    if (a.radial && this.t === a.start) this.burstFx();
    const n = a.radial ? this.resolveRadial(foes, a) : this.resolveAttack(foes);
    void n;
    // cancels
    const afterActive = this.t >= a.start + a.active;
    if (this.buffered('special') && this.t >= a.start + 1 && !a.radial && this.canPay(8)) {
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
    if (afterActive && this.connected && (a === P_ATK.jab || a === P_ATK.cross) && this.buffered('attack', 10) && this.pressDir() === -this.facing) {
      // J with away held mid-chain: turn and back fist (the chain then restarts at step 1)
      this.consume('attack');
      this.facing = -this.facing;
      this.chain(P_ATK.backfist);
      return true;
    }
    if (afterActive && this.connected && a.next && this.buffered('attack', 10)) {
      this.consume('attack');
      let next = P_ATK[a.next] || null;
      if (a.next === 'fin') next = this.pressDir() === this.facing ? P_ATK.straight : P_ATK.upper;
      this.chain(next);
      return true;
    }
    if (ph === 'done') {
      // a connecting chain step stays open for 16 f after recovery
      this.chainNext = this.connected && a.next ? a.next : null;
      this.chainT = this.chainNext ? 16 : 0;
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
      if (Math.abs(t.y - this.y) > a.depth || Math.abs(t.x - this.x) > 42 + t.w || t.z > 36) continue;
      this.atkHit.add(t.id);
      n++;
      t.takeHit(this, a, t.x >= this.x ? 1 : -1, n);
    }
    return n;
  }
  chain(a) { this.connected = false; this.startAttack(a); }
  // Strike smear: an arc swept by the fist/foot/weapon on the first active frame.
  smear(a) {
    const arcs = {
      jab: [-0.5, 0.15, 20, 28], cross: [-0.45, 0.2, 20, 28], hook: [-1.2, 0.3, 22, 26], upper: [0.6, -1.4, 18, 30],
      straight: [-0.3, 0.3, 22, 26], backfist: [-0.9, 0.4, 20, 28], swing: [-1.6, 0.6, 26, 26], bigswing: [-2.2, 0.8, 30, 26], thrust: [-0.2, 0.2, 30, 24],
    };
    const d = arcs[a.pose];
    if (!d) return;
    FX.add({ kind: 'smear', x: this.x, y: this.y, z: this.z + d[3], a0: d[0], a1: d[1], size: d[2], facing: this.facing, life: 3, g: 0 });
  }
  // Hammer Drop landing: dust, and any enemy type with def.onHammerLand reacts (burrow mounds pop).
  hammerLand() {
    FX.dust(this.x, this.y, 6, 1.2);
    Sound.sfx('thud', this.x);
    for (const e of Game.foes()) if (e.def.onHammerLand) e.def.onHammerLand.call(e, this.x, this.y);
  }
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
    this.comboT = 75;
    this.comboPop = 6;
    this.bestCombo = Math.max(this.bestCombo, this.comboHits);
    Game.addScore((dmg != null ? dmg : a.dmg || 0) * 10);
    if (Input.lastDevice === 'touch' && tier >= 2 && navigator.vibrate) { try { navigator.vibrate(tier >= 4 ? 30 : tier >= 3 ? 15 : 8); } catch (e) { /* unsupported */ } }
    if (this.state !== 'overdrive' && this.state !== 'barrage') Game.addRage((dmg != null ? dmg : a.dmg || 0) / 2);
    if (this.grey > 0) { const r = Math.min(2, this.grey); this.grey -= r; this.hp = Math.min(this.maxHp, this.hp + r); }
    if (a.weapon && this.weapon) {
      const wd = WEAPONS[this.weapon.kind];
      const armored = target.armorTier >= 2 || target.poiseMax > 0 || (target.def && target.def.noWeaponKD) || target.boss;
      if (wd.kdEvery && ++this.pipeStreak % wd.kdEvery === 0 && target.launchable && !armored && !target.dying) {
        target.forceKD = { kx: 2.8, kz: 3.0 };      // Fighter.takeHit turns this hit into a knockdown
      }
      if (--this.weapon.uses <= 0) this.breakWeapon();
    }
    if (this.atk === P_ATK.ram && target.weight >= 1) {
      // keep plowing
    } else if (target.heavy && !a.radial) this.vx = -this.facing * 0.4;
  }
  endCombo() {
    const n = this.comboHits;
    if (n >= 3) { Game.addScore(100 * (n - 1)); FX.text(this.x, this.y, 60, 'COMBO +' + 100 * (n - 1), '#ffe08a', 50); }
    if (n >= 30) FX.showBanner('APOCALYPTIC!', '#ff3b30');
    else if (n >= 20) FX.showBanner('SAVAGE!', '#ff8a2a');
    else if (n >= 10) FX.showBanner('BRUTAL!', '#ffe08a');
    if (n >= 10) Sound.sfx('chime');
    this.comboHits = 0;
  }

  // ---------- control ----------
  control(foes) {
    const dx = Input.dirX(), dy = Input.dirY();
    if (this.buffered('jump', 6)) {
      this.consume('jump');
      this.chainT = 0;
      this.wasRunning = this.state === 'run';
      this.setState('jumpsquat');
      this.vx *= 0.5;
      return;
    }
    if (this.buffered('special')) {
      this.consume('special');
      this.chainT = 0;
      if (Game.rage >= 100) { this.startOverdrive(); return; }
      if (this.weapon && this.weapon.kind !== 'molotov') { this.throwWeapon(); return; }
      if (this.weapon && this.weapon.kind === 'molotov') { this.throwBottle(); return; }
      if (this.canPay(8)) { this.doBurst(); return; }
      FX.text(this.x, this.y, 50, 'LOW HP', '#ff6a4a', 30); Sound.sfx('menu', this.x);   // not enough HP to burst
    }
    if (this.buffered('attack')) {
      this.consume('attack');
      const item = Game.itemUnder(this);
      if (item && !this.enemyAhead(foes, 20)) { this.pickup(item); return; }
      this.connected = false;
      if (this.weapon) {
        if (this.weapon.kind === 'molotov') { this.throwBottle(); return; }
        if (dx) this.facing = dx;
        this.startAttack(P_ATK[WEAPONS[this.weapon.kind].atk]);
        return;
      }
      if (this.state === 'run') { this.startAttack(P_ATK.ram); return; }
      if (this.pressDir() === -this.facing) { this.chainT = 0; this.facing = -this.facing; this.startAttack(P_ATK.backfist); return; }
      if (this.chainT > 0 && this.chainNext) {
        // late press inside the 16 f window: carry on with the chain
        let next = P_ATK[this.chainNext];
        if (this.chainNext === 'fin') next = this.pressDir() === this.facing ? P_ATK.straight : P_ATK.upper;
        this.chainT = 0; this.chainNext = null;
        this.startAttack(next);
        return;
      }
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
      this.chainT = 0;
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
        sign(e.x - this.x) === dx && Math.abs(e.x - this.x) <= 16 + Math.max(0, e.w - 8) && e.z < 2);
      if (f) { if (++this.grabPush >= 6) this.startGrab(f); }
      else this.grabPush = 0;
    } else this.grabPush = 0;
  }
  enemyAhead(foes, d) {
    return foes.some(e => e.team === 'enemy' && e.alive && Math.abs(e.y - this.y) <= 6 && (e.x - this.x) * this.facing > 0 && Math.abs(e.x - this.x) < d);
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
  // A special needs more HP than it costs (no spamming Scrap Burst at 1 HP); breaking a hold keeps the
  // desperation rule and works down to 2 HP (floor = 1).
  canPay(c, floor) { return this.hp > (floor != null ? floor : c); }
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
      if (!e.vulnerable || (e.def && e.def.noPin && e.def.noPin(e))) continue;
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
    // a target the barrage kills keeps its own death state (e.g. the Matriarch's KO crumble)
    const live = this.pinned.filter(e => !e.remove && !e.dying);
    if (this.t > 0 && this.t <= 24 && this.t % 4 === 0) {
      for (const e of live) {
        e.state = 'pinned';
        e.takeHit(this, { dmg: 6, tier: 1, hitstop: 2, kb: 0, stun: 30, zr: [16, 36] }, this.facing);
        if (!e.dying && e.state !== 'pinned' && e.state !== 'fall') e.state = 'pinned';
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
      for (const e of this.pinned) if (!e.dying && e.state === 'pinned') e.setState('idle');
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
    if (this.buffered('special') && this.canPay(8)) { this.consume('special'); this.releaseHold(); this.doBurst(); return true; }
    if (this.buffered('attack')) {
      this.consume('attack');
      const dx = Input.dirX();
      if (dx === -this.facing && !f.noSuplex) { this.startThrow('suplex'); return true; }
      if (dx === this.facing || f.tossOnly) { this.startThrow('toss'); return true; }
      this.knees++;
      this.sub = 'knee'; this.t = 0;
      if (this.knees >= 3) {
        this.releaseHold();
        f.state = 'idle';
        f.takeHit(this, { dmg: 8, tier: 3, knock: true, kx: 2.6, kz: 3.0, zr: [0, 40] }, this.facing);
        return true;
      }
      f.takeHit(this, { dmg: 6, tier: 2, kb: 0, stun: 40, zr: [10, 30] }, this.facing);
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
        f.vx = this.facing * 4.2 * Math.min(1.2, f.weight); f.vz = 3.0; f.z = 12;
        f.facing = -this.facing;
        f.thrownBy = this; f.bowled = new Set();
        f.tossDmg = 14;
        if (f.onTossed) f.onTossed(this);
        Sound.sfx('throwObj', this.x);
        this.addCombo();
      }
      if (this.t >= 26) this.setState('idle');
      return true;
    }
    // backward toss: lift, arc over the head to z 30, then fling the body backwards (a bowling projectile)
    if (f) {
      if (this.t <= 8) { f.x = this.x + this.facing * 12; f.z = this.t * 2.75; }
      else if (this.t <= 20) {
        const k = (this.t - 8) / 12;
        f.x = this.x + this.facing * lerp(12, -16, k);
        f.z = 22 + Math.sin(k * Math.PI) * 10;
        f.facing = k > 0.5 ? this.facing : -this.facing;
      }
      if (this.t === 20) {
        this.releaseHold();
        f.x = this.x - this.facing * 14; f.z = 26;
        f.setState('thrown'); f.atk = null;
        f.vx = -this.facing * 4.2 * Math.min(1.2, f.weight); f.vz = 1.5;
        f.facing = this.facing;
        f.thrownBy = this; f.bowled = new Set();
        f.tossDmg = 14;
        if (f.onTossed) f.onTossed(this);
        Sound.sfx('throwObj', this.x);
        this.addCombo();
      }
    }
    if (this.t >= 26) this.setState('idle');
    return true;
  }
  addCombo() { this.comboHits++; this.comboT = 75; this.comboPop = 6; this.bestCombo = Math.max(this.bestCombo, this.comboHits); }
  releaseHold() {
    const f = this.grabbing;
    if (f) {
      f.grabbedBy = null;
      // a body let go in mid-air drops as a fall instead of attacking on the way down
      if (f.state === 'grabbed' || f.state === 'held') { if (f.z > 0.5) { f.setState('fall'); f.vx = 0; f.vz = 0; } else f.setState('idle'); }
    }
    this.grabbing = null;
  }

  // ---------- being held by an enemy (Ghoul bite, boss grabs) ----------
  // Holder protocol: call hero.holdBy(enemy) and set enemy.holding = true; each frame position the hero
  // yourself and deal damage with hero.holdDamage(n). Every button press the hero makes adds
  // enemy.mashK (default 8) to enemy.clutchT, so count your hold timer with clutchT. Scrap Burst (L)
  // breaks the hold unless enemy.burstEscapes === false; then enemy.releaseClutch() is called.
  // Release with hero.freeFromHold(dir) and set enemy.holding = false.
  holdBy(e) {
    if (this.grabbing) this.releaseHold();
    this.heldBy = e; this.atk = null;
    this.setState('grabbed');
    this.vx = this.vy = 0;
    e.clutchT = 0;
  }
  holdDamage(n) {
    n = Math.max(1, Math.round(n * Game.diff.dmg));
    this.hp = Math.max(0, this.hp - n);
    this.grey = 0; this.flash = 2; this.tintT = 6;
    this.damageTaken += n;
    Game.addRage(n);
    Game.portraitHit = 8;
    FX.hurtVignette(); FX.shake(1, 4);
    Sound.sfx('hurt', this.x);
    if (this.hp <= 0) { const h = this.heldBy; this.heldBy = null; if (h) { h.holding = false; h.releaseClutch && h.releaseClutch(); } this.knockDown(h && h.x > this.x ? -1 : 1, 2.0, 3.0); }
  }
  freeFromHold(dir = 0) {
    this.heldBy = null;
    if (this.state === 'grabbed') { this.setState('idle'); this.vx = dir * 2; this.inv = Math.max(this.inv, 20); }
  }
  heldUpdate() {
    const h = this.heldBy;
    if (!h || h.remove || h.dying || !h.holding) { this.heldBy = null; this.setState('idle'); return; }
    if (Input.anyPressed) h.clutchT = (h.clutchT || 0) + (h.mashK || 8);
    if (this.buffered('special') && h.burstEscapes !== false && this.canPay(8, 1)) {
      this.consume('special');
      this.heldBy = null; h.holding = false;
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
    Game.add(new Proj(this.x + this.facing * 10, this.y, 22, { kind: 'thrown_' + k, vx: this.facing * 5, vz: 0, gravity: 0, dmg: 12, tier: 3, knock: true, owner: this, life: 60, friendly: true, pierce: 1 }));
    this.setState('throwing');
    Sound.sfx('throwObj', this.x);
  }
  throwBottle() {
    this.weapon = null;
    Game.add(new Proj(this.x + this.facing * 8, this.y, 30, { kind: 'molotov', vx: this.facing * 3.0, vz: 2.6, gravity: 0.28, dmg: 10, tier: 3, knock: true, owner: this, friendly: true, burn: 60 }));
    if (this.state !== 'jump') this.setState('throwing');
    Sound.sfx('throwObj', this.x);
  }

  // ---------- getting hit ----------
  takeHit(src, a, dir, nth) {
    if (this.grabbing) this.releaseHold();
    if (this.heldBy) { const h = this.heldBy; this.heldBy = null; h.holding = false; h.releaseClutch && h.releaseClutch(); }
    if (this.state === 'jumpsquat') this.setState('idle');
    this.chainT = 0; this.chainNext = null;
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
    if (this.state === 'hurt') { this.hurtTime = 16; this.vx = dir * 0.8; }
    if (this.state === 'fall' && this.hp > 0) { this.vx = dir * 2.6; this.vz = Math.max(this.vz, 3.0); }
    if (this.hp <= 0 && !this.deathFx) { this.deathFx = true; Game.hitstop = Math.max(Game.hitstop, 20); Game.slowmo(40, 0.5); Sound.sfx('death', this.x); }
    if (this.state === 'fall') { this.recentHits = []; if (this.weapon) this.dropWeapon(); }
  }
  onDeath() { /* handled by Game.playerDied after the knockdown */ }
  // Chip damage from hazards (acid, toxic puddles): no hitstun, but scaled by difficulty and counted
  // like any other damage (grey HP lost, Rage, no-damage bonus, hurt feedback).
  chip(n) {
    if (this.heldBy) { this.holdDamage(n); return; }
    n = Math.max(1, Math.round(n * Game.diff.dmg));
    this.hp = Math.max(0, this.hp - n);
    this.grey = 0; this.flash = 2; this.tintT = 6;
    this.damageTaken = (this.damageTaken || 0) + n;
    Game.addRage(n);
    Game.portraitHit = 6;
    FX.hurtVignette();
    if (this.hp <= 0) this.knockDown(-(this.facing || 1), 1.2, 2.4);
  }

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
      case 'getup': return Poses.getup(t);
      case 'grabbed': return Poses.grabbed(t);
      case 'grab':
        if (this.sub === 'knee') return PlayerPoses.kneeHit(t);
        if (this.sub === 'toss') return PlayerPoses.toss(t);
        if (this.sub === 'suplex') return PlayerPoses.suplex(t);
        return PlayerPoses.hold(t);
      case 'throwing': return PlayerPoses.toss(t + 6);
      case 'meteor': return this.sub === 'impact' ? PlayerPoses.slam() : PlayerPoses.meteor(this.sub);
      case 'victory': return pose({ rot: 0, fThigh: 0.1, fKnee: 0, bThigh: -0.1, bKnee: 0, fUpper: 3.6, fElbow: -0.1, bUpper: 0.3, bElbow: 1.6, head: -0.1 });
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
  hammer(ph, t) {
    if (ph === 'start') return pose({ hy: -21, rot: -0.2, fThigh: 0.6, fKnee: -1.2, bThigh: 0.2, bKnee: -1.0, fUpper: 3.0, fElbow: 0.2, bUpper: 2.9, bElbow: 0.3, head: -0.2 });
    return pose({ hy: -20, rot: 0.35, fThigh: 0.5, fKnee: -0.8, bThigh: 0.1, bKnee: -0.7, fUpper: 1.2, fElbow: 0.1, bUpper: 1.1, bElbow: 0.2, head: 0.2 });
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
    const k = clamp((t - 5) / 15, 0, 1);
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
  skin: '#c68a5e', jaw: '#9a6440', eye: '#1a0e0a', hair: '#1e1414', bandana: '#c8322a',
  goggle: '#ffb04a', goggleRim: '#3a2a20', scarf: '#e2591e', scarfDk: '#b04014',
  top: '#5b6b3a', topDk: '#3e4a27', bandolier: '#8a6a3a', brass: '#d4af37',
  pants: '#9a8a68', pocket: '#7e6e52', kneepad: '#4a4a4a', boots: '#2a1e18', sole: '#4a3a30', wrap: '#6a4a30',
  plate: '#7a8088', iron: '#7a4a2c', ironHi: '#b8703a', rivet: '#e0b070', rod: '#c8ced4', fist: '#6a6e78', knuckle: '#3a3e48',
  // aliases used by UI art
  steel: '#7a8088', steelDk: '#5e6168', steelHi: '#b8bec4', rust: '#8c6a4a', strap: '#3a2a20',
};

// Piston rods slide back (0..-4 px) during gauntlet wind-ups and snap forward on impact.
function heroPiston(pl) {
  if (pl.state === 'attack' && pl.atk && pl.atkPhase() === 'start' && !pl.atk.air && pl.atk.pose !== 'jab') return -Math.min(4, pl.t);
  if (pl.state === 'meteor' && pl.sub === 'hang') return -4;
  return 0;
}

function HERO_STYLE(pl, ghost) {
  const P = HERO_PAL;
  const rageFull = Game.rage >= 100 && (Game.frame >> 3) % 2;
  return {
    skin: P.skin, top: P.top, sleeve: P.skin, arm: P.skin, pants: P.pants, boots: P.boots, belt: P.bandolier,
    hipW: 10, shW: 12, limbW: 5,
    torso(R, s) {
      // bandolier: near shoulder to far hip, 4 brass dots
      const sx = R.S.x + 2, sy = R.S.y + 1, hx = R.H.x - 3, hy = R.H.y - 1;
      Px.line(sx, sy, hx, hy, 2, P.bandolier);
      for (let i = 1; i <= 4; i++) Px.dot(lerp(sx, hx, i / 5), lerp(sy, hy, i / 5) - 1, P.brass);
      Px.disc(R.S.x, R.S.y + 1, 2.5, P.skin);
    },
    backHand(Hn, ang, s, R) {
      // leather wrap on the far forearm, small fist
      Px.line(lerp(R.ba.E.x, Hn.x, 0.3), lerp(R.ba.E.y, Hn.y, 0.3), lerp(R.ba.E.x, Hn.x, 0.8), lerp(R.ba.E.y, Hn.y, 0.8), 3, shade(P.wrap, -0.3));
      Px.rect(Hn.x - 2, Hn.y - 2, 4, 4, shade(P.skin, -0.32));
    },
    head(Hd, th, s, R) {
      const x = Math.round(Hd.x), y = Math.round(Hd.y);
      // bandana knot tails flutter behind
      const fl = Math.sin(Game.frame * 0.3 + (pl.id || 0)) * 1.5;
      Px.line(x - 4, y - 3, x - 8, y - 2 + fl, 2, P.bandana);
      Px.line(x - 4, y - 2, x - 7, y + 1 + fl * 0.6, 2, shade(P.bandana, -0.25));
      // head block with a jaw notch
      Px.rect(x - 4, y - 5, 9, 10, P.skin);
      Px.rect(x + 4, y + 3, 1, 2, '#00000000');
      Px.rect(x - 1, y + 3, 5, 2, P.jaw);
      Px.rect(x + 4, y + 4, 1, 1, P.jaw);
      // bob hair: covers top and back with a tuft
      Px.poly([x - 5, y + 3, x - 6, y - 4, x - 3, y - 7, x + 4, y - 6, x + 5, y - 3, x - 1, y - 3, x - 2, y + 4], P.hair);
      Px.rect(x - 6, y + 2, 2, 2, P.hair);
      // bandana band and pushed-up goggles
      Px.rect(x - 4, y - 4, 9, 2, P.bandana);
      Px.disc(x + 1, y - 6, 2, P.goggleRim); Px.disc(x + 4, y - 6, 2, P.goggleRim);
      Px.dot(x + 1, y - 6, P.goggle); Px.dot(x + 4, y - 6, P.goggle);
      // eye
      Px.rect(x + 3, y - 1, 1, 2, P.eye);
    },
    hand(Hn, ang, s, R) {
      const E = R.fa.E, S = R.S;
      const ux = dirX(ang), uy = dirY(ang), vx = -uy, vy = ux;
      // upper-arm plates
      Px.limb(S.x, S.y, E.x, E.y, 5, 5, P.plate);
      Px.dot(lerp(S.x, E.x, 0.5), lerp(S.y, E.y, 0.5), shade(P.plate, -0.35));
      // forearm block 8 wide, along the forearm, with a highlight on its top edge and rivets
      const fx0 = E.x - ux * 1, fy0 = E.y - uy * 1, fx1 = Hn.x - ux * 1, fy1 = Hn.y - uy * 1;
      Px.quad(fx0, fy0, fx1, fy1, 8, 8, P.iron);
      Px.line(fx0 - vx * 3.5, fy0 - vy * 3.5, fx1 - vx * 3.5, fy1 - vy * 3.5, 1, P.ironHi);
      for (let i = 0; i < 3; i++) { const k = 0.25 + i * 0.25; Px.dot(lerp(fx0, fx1, k) + vx * 2, lerp(fy0, fy1, k) + vy * 2, rageFull ? '#ffe066' : P.rivet); }
      // piston rods on top of the forearm, sliding back during wind-ups
      const po = ghost ? 0 : heroPiston(pl);
      for (const off of [-2.5, -1]) {
        const bx = lerp(fx0, fx1, 0.15) + vx * (off - 2) + ux * po, by = lerp(fy0, fy1, 0.15) + vy * (off - 2) + uy * po;
        Px.line(bx, by, bx + ux * 8, by + uy * 8, 1, P.rod);
      }
      // fist block with a knuckle line
      const cx = Hn.x + ux * 3, cy = Hn.y + uy * 3;
      Px.poly([cx - ux * 4 - vx * 4, cy - uy * 4 - vy * 4, cx + ux * 4 - vx * 4, cy + uy * 4 - vy * 4,
        cx + ux * 4 + vx * 4, cy + uy * 4 + vy * 4, cx - ux * 4 + vx * 4, cy - uy * 4 + vy * 4], P.fist);
      Px.line(cx + ux * 2 - vx * 3, cy + uy * 2 - vy * 3, cx + ux * 2 + vx * 3, cy + uy * 2 + vy * 3, 1, P.knuckle);
      if (pl.weapon && !ghost) drawHeldWeapon(pl.weapon.kind, cx, cy, ang);
    },
    after(R, s) {
      // knee pad, thigh pocket
      Px.rect(R.fl.K.x - 2, R.fl.K.y - 1, 4, 3, P.kneepad);
      Px.rect(lerp(R.H.x, R.fl.K.x, 0.45) - 1, lerp(R.H.y, R.fl.K.y, 0.45) - 1, 3, 3, P.pocket);
      // scarf: 3 tapered segments from the neck streaming backward
      const nx = lerp(R.S.x, R.Hd.x, 0.3), ny = lerp(R.S.y, R.Hd.y, 0.3);
      Px.rect(nx - 3, ny - 1, 6, 3, P.scarf);
      const lvx = pl.vx * pl.facing;
      const knocked = pl.state === 'fall' || pl.state === 'down';
      const stream = Math.abs(pl.vx) > 2 || pl.airborne || pl.state === 'overdrive';
      let px = nx - 2, py = ny;
      const lens = [6, 5, 4], th = [3, 2, 1];
      for (let i = 0; i < 3; i++) {
        let a = Math.PI - 0.55 + i * 0.12 + Math.sin(Game.frame * 0.1 + i * 0.8) * 0.25 - clamp(lvx * 0.15, -0.6, 0.6) * 0.8;
        if (stream) a = Math.PI + Math.sin(Game.frame * 0.4 + i) * 0.08;
        if (knocked) a = -Math.PI / 2 + Math.sin(Game.frame * 0.3 + i) * 0.3;
        const qx = px + Math.cos(a) * lens[i], qy = py + Math.sin(a) * lens[i] + (stream || knocked ? 0 : i * 0.6);
        Px.limb(px, py, qx, qy, th[i] + 0.5, th[i], i % 2 ? P.scarfDk : P.scarf);
        px = qx; py = qy;
      }
    },
  };
}

function drawHeldWeapon(kind, x, y, ang) {
  const ux = dirX(ang), uy = dirY(ang);
  // weapons extend along the forearm direction, past the fist
  switch (kind) {
    case 'pipe':
      Px.line(x - ux * 6, y - uy * 6, x + ux * 18, y + uy * 18, 3, '#8a929c');
      Px.rect(x + ux * 6 - 1, y + uy * 6 - 1, 3, 3, '#5e666e');
      break;
    case 'machete':
      Px.line(x - ux * 2, y - uy * 2, x + ux * 4, y + uy * 4, 3, '#3a2a1a');
      Px.quad(x + ux * 4, y + uy * 4, x + ux * 18, y + uy * 18, 3, 4, '#d8dce0');
      break;
    case 'axe':
      Px.line(x - ux * 4, y - uy * 4, x + ux * 22, y + uy * 22, 2, '#8a8a8a');
      Px.disc(x + ux * 24, y + uy * 24, 7, '#f2eee0');
      Px.disc(x + ux * 24, y + uy * 24, 6, '#c8322a');
      break;
    case 'molotov':
      Px.rect(x - 2, y - 7, 4, 7, '#6a8a3a');
      Px.disc(x, y - 9, 1.5 + (Game.frame >> 2) % 2 * 0.5, '#ffb030');
      break;
  }
}

function drawPortrait(ctx, x, y, grimace = false) {
  Px.use(ctx);
  const P = HERO_PAL;
  Px.rect(x - 6, y - 13, 12, 13, P.skin);
  Px.poly([x - 8, y - 2, x - 8, y - 12, x - 4, y - 16, x + 5, y - 15, x + 7, y - 11, x - 2, y - 11, x - 4, y], P.hair);
  Px.rect(x - 6, y - 12, 13, 2, P.bandana);
  Px.disc(x, y - 14, 2, P.goggleRim); Px.disc(x + 4, y - 14, 2, P.goggleRim);
  Px.dot(x, y - 14, P.goggle); Px.dot(x + 4, y - 14, P.goggle);
  if (grimace) { Px.rect(x + 1, y - 8, 3, 1, P.eye); Px.rect(x, y - 3, 5, 1, '#e8e0d0'); }
  else { Px.rect(x + 2, y - 9, 1, 2, P.eye); Px.rect(x, y - 3, 4, 1, P.jaw); }
  Px.rect(x - 6, y, 13, 3, P.scarf);
}
