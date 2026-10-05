// Entities: base class, fighters, combat resolution and the hit-feel tier system.
// World coordinates: x along the street, y = depth (the screen row of the feet), z = height.

const GRAV = 0.30;

// Hit tiers drive hitstop, shake, particles and sound. T1 light .. T5 kill/crit.
const TIERS = [null,
  { hs: 3,  shake: 0, kick: 1, sparks: 4,  star: 8,  sfx: 'hitLight' },
  { hs: 5,  shake: 1, kick: 1, sparks: 6,  star: 12, sfx: 'hitMid', dust: 1 },
  { hs: 8,  shake: 2, kick: 2, sparks: 8,  star: 16, sfx: 'hitHeavy', ring: 1 },
  { hs: 10, shake: 3, kick: 2, sparks: 12, star: 20, sfx: 'hitFinisher', ring: 1, flash: 0.2 },
  { hs: 14, shake: 5, kick: 2, sparks: 16, star: 22, sfx: 'hitCrit', ring: 2, flash: 0.4, slow: [36, 0.35] },
];
const FAMILY = {
  gang:     { tint: '#ffe066', mat: 'matGang', bleed: '#ddeeff' },
  mutant:   { tint: '#b6ff4a', mat: 'matMutant', bleed: '#7cff4f' },
  scorpion: { tint: '#ff8a3d', mat: 'matChitin', bleed: '#e8e070' },
  hero:     { tint: '#ff5a3a', mat: null, bleed: '#ddeeff' },
  metal:    { tint: '#ffffff', mat: 'matMetal', bleed: '#c9ced6' },
};

class Ent {
  constructor(x, y) {
    this.x = x; this.y = y; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.facing = 1;
    this.state = 'idle'; this.t = 0;
    this.w = 8; this.h = 40;           // half-width and height of the hurtbox
    this.team = 'none';
    this.remove = false;
    this.flash = 0; this.tintT = 0;
    this.hs = 0;                       // personal hitstop frames
    this.shadowR = 10;
    this.id = Ent.nextId++;
  }
  setState(s) { this.state = s; this.t = 0; }
  get airborne() { return this.z > 0.01 || this.vz > 0; }
  update() {}
  draw() {}
  sortY() { return this.y; }
  // Pixel jitter while frozen in hitstop, so hits read even when everything stops.
  get jitter() { return this.hs > 0 && this.hitJitter ? (this.hs % 2 ? 1 : -1) : 0; }
}
Ent.nextId = 1;

// A fighter is anything that hits and gets hit: the player and every enemy.
class Fighter extends Ent {
  constructor(x, y) {
    super(x, y);
    this.hp = this.maxHp = 30;
    this.family = 'gang';
    this.atk = null;          // current attack data
    this.atkHit = null;       // ids already hit by this attack instance
    this.inv = 0;             // invulnerability frames
    this.poise = 0; this.poiseMax = 0;   // boss-style poise (0 = none)
    this.armorTier = 0;       // hits below this tier do not flinch (super armor)
    this.weight = 1;          // knockback multiplier
    this.launchable = true;
    this.grabbedBy = null;
    this.downTime = 36;
    this.dying = false;
    this.juggle = 0;
    this.burn = 0; this.venom = 0;
    this.grace = 0;           // frames after wake-up during which it won't attack
    this.hitJitter = false;
    this.lastHitBy = null;
  }
  get alive() { return !this.dying && this.hp > 0; }
  get canAct() { return ['idle', 'walk', 'run'].includes(this.state); }
  get vulnerable() {
    if (this.inv > 0 || this.dying || this.remove) return false;
    if (['down', 'getup', 'dead', 'burrowed', 'enter', 'offstage'].includes(this.state)) return false;
    if (this.juggle >= 4 && this.airborne) return false;  // untouchable until it lands
    return true;
  }
  face(target) { if (target) this.facing = target.x >= this.x ? 1 : -1; }

  startAttack(a) {
    this.atk = a;
    this.atkHit = new Set();
    this.setState('attack');
    if (a.selfVx != null) this.vx = a.selfVx * this.facing;
    if (a.selfVz) this.vz = a.selfVz;
    if (a.sfxStart) Sound.sfx(a.sfxStart, this.x);
  }
  atkPhase() {
    const a = this.atk;
    if (!a) return 'done';
    if (this.t < a.start) return 'start';
    if (this.t < a.start + a.active) return 'active';
    if (this.t < a.start + a.active + a.rec) return 'rec';
    return 'done';
  }
  // Does attack `a` (from this fighter's position) overlap target t?
  overlaps(a, t) {
    const x0 = this.x + this.facing * a.reach[0], x1 = this.x + this.facing * a.reach[1];
    const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    if (Math.abs(t.y - this.y) > (a.depth || 8)) return false;
    if (t.x + t.w < lo || t.x - t.w > hi) return false;
    const z0 = this.z + a.zr[0], z1 = this.z + a.zr[1];
    if (t.z + t.h < z0 || t.z > z1) return false;
    return true;
  }
  // Check the current attack against targets. Returns number hit.
  resolveAttack(targets) {
    const a = this.atk;
    if (!a || this.atkPhase() !== 'active') return 0;
    if (this.t === a.start && a.whiff) Sound.sfx(a.whiff, this.x);
    let hits = 0;
    for (const t of targets) {
      if (t === this || this.atkHit.has(t.id) || !t.vulnerable) continue;
      if (!this.overlaps(a, t)) continue;
      this.atkHit.add(t.id);
      hits++;
      t.takeHit(this, a, this.facing, hits);
      if (a.single) break;
    }
    return hits;
  }

  // Apply a hit. a = attack data, dir = knockback direction (+1 = right), nth = victim index for multi-hits.
  takeHit(src, a, dir, nth = 1) {
    let dmg = a.dmg;
    if (this.airborne && this.juggle > 0) dmg = Math.round(dmg * Math.max(0.5, 1 - 0.1 * this.juggle));
    if (this.dmgMul) dmg = Math.round(dmg * this.dmgMul);
    if (this.team === 'player') dmg = Math.max(1, Math.round(dmg * Game.diff.dmg));
    if (a.dmgMul) dmg = Math.round(dmg * a.dmgMul);
    if (a.hammer && this.family === 'scorpion') dmg = Math.max(dmg, 13);
    const wasAir = this.airborne && this.state === 'fall';
    this.hp = Math.max(0, this.hp - dmg);
    this.lastHitBy = src;
    this.flash = 2; this.tintT = 6;
    if (this.grabbedBy && this.grabbedBy !== src) this.releaseGrab();
    if (a.burn) this.burn = Math.max(this.burn, a.burn);
    if (a.venom) this.venom = Math.max(this.venom, a.venom);
    const dead = this.hp <= 0;
    let tier = a.tier || 1;
    if (dead && this.team !== 'player') tier = Math.min(4, tier + 1);
    if (dead && this.team === 'enemy' && Game.isWaveFinalKill(this)) tier = 5;
    if (this.boss && dead) tier = 5;

    // feel: hitstop, shake, sparks, sound
    const T = TIERS[tier];
    const hs = (a.hitstop != null ? a.hitstop : T.hs) + Math.min(3, nth - 1);
    this.hs = Math.max(this.hs, hs); this.hitJitter = true;
    if (src && src.hs != null && src.team !== 'proj') src.hs = Math.max(src.hs, hs);
    if (tier >= 4) Game.hitstop = Math.max(Game.hitstop, hs);
    FX.shake(T.shake + (a.shakeAdd || 0));
    FX.kick(dir * T.kick);
    if (T.flash) FX.flash('#ffffff', 2, T.flash);
    if (T.slow) Game.slowmo(T.slow[0], T.slow[1]);
    const hz = this.z + clamp(this.h * 0.62, a.zr ? Math.max(0, a.zr[0]) : 10, a.zr ? Math.max(4, a.zr[1]) : 30);
    const hx = this.x - dir * this.w * 0.4;
    this.onHitFx(hx, hz, tier, dir, a);
    Sound.sfx(a.sfx || T.sfx, this.x, Game.comboPitch());
    const fam = FAMILY[this.family];
    if (fam && fam.mat) Sound.sfx(fam.mat, this.x);
    if (src && src.onLanded) src.onLanded(this, a, dmg, tier);

    if (dead) { this.onDeath(src, a, dir); }
    // reaction
    let flinch = true, launch = a.knock || dead || wasAir;
    if (this.poiseMax > 0 && !dead) {
      this.poise -= a.poise != null ? a.poise : [0, 4, 8, 14, 24, 30][tier];
      if (this.poise <= 0) { this.poise = this.poiseMax; this.onPoiseBreak && this.onPoiseBreak(); }
      flinch = false; launch = false;
    } else if (this.armorTier && tier < this.armorTier && !dead) {
      flinch = false; launch = false;
      this.onArmorHit && this.onArmorHit(src, a, tier);
    }
    if (!this.launchable && !dead) launch = false;
    if (this.launchCap && this.hp / this.maxHp > this.launchCap && !dead) launch = false;
    if (this.onHurt) this.onHurt(src, a, tier, flinch, launch);
    if (!flinch) return;
    if (launch) {
      if (this.airborne && this.state === 'fall') this.juggle++;
      const jv = this.juggle > 0 && wasAir ? 3.0 * Math.pow(0.8, this.juggle) : null;
      let kx = a.kx != null ? a.kx : 2.2, kz = a.kz != null ? a.kz : 3.0;
      if (dead && !a.knock) { kx = 3.5; kz = 3.5; }
      this.knockDown(dir, kx * this.weight, (jv != null ? Math.max(jv, kz * 0.5) : kz) * Math.min(1.3, this.weight));
      if (a.blast) { this.blasted = src; this.bowled = new Set(); }
    } else {
      this.atk = null;
      this.setState('hurt');
      this.hurtTime = a.stun || (tier >= 2 ? 22 : 16);
      this.hurtAlt = (this.hurtAlt || 0) + 1;
      this.vx = dir * (a.kb != null ? a.kb : 1.2) * this.weight;
      this.vy = 0;
    }
  }
  onHitFx(x, z, tier, dir, a) {
    const fam = FAMILY[this.family] || FAMILY.gang;
    FX.hit(x, this.y, z, tier, dir, fam.tint);
  }
  onDeath() { this.dying = true; }

  knockDown(dir, kx, kz) {
    this.atk = null;
    if (this.grabbedBy) this.releaseGrab();
    this.setState('fall');
    this.vx = dir * kx;
    this.vy = 0;
    this.vz = kz;
    this.z = Math.max(this.z, 1);
    this.facing = -dir;
    this.bounced = false;
  }
  releaseGrab() {
    const g = this.grabbedBy;
    if (g && g.grabbing === this) { g.grabbing = null; if (g.state === 'grab') g.setState('idle'); }
    this.grabbedBy = null;
    if (this.state === 'grabbed') this.setState('idle');
  }

  // Shared physics + status effects.
  physics(bounds) {
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.tintT > 0) this.tintT--;
    if (this.inv > 0) this.inv--;
    if (this.grace > 0) this.grace--;
    if (this.burn > 0) {
      this.burn--;
      if (this.burn % 4 === 0) FX.fire(this.x + rr(-4, 4), this.y, this.z + this.h * 0.5, 1);
    }
    if (this.venom > 0) {
      this.venom--;
      if (this.venom % 20 === 0 && this.hp > 1 && this.state !== 'down') { this.hp -= 1; FX.add({ kind: 'bubble', x: this.x + rr(-4, 4), y: this.y, z: this.z + this.h, vz: 0.5, g: 0, life: 24, color: '#7cff4f' }); }
    }
    if (this.z > 0 || this.vz !== 0) {
      this.z += this.vz;
      this.vz -= GRAV;
      if (this.state === 'fall' || this.state === 'thrown') this.vx *= 0.985;
      if (this.z <= 0) { this.z = 0; this.onLand(); }
    }
    this.x += this.vx;
    this.y += this.vy;
    if (bounds) {
      this.y = clamp(this.y, bounds.yMin, bounds.yMax);
      // wall splat against camera-lock walls
      if ((this.x < bounds.xMin || this.x > bounds.xMax) && bounds.walls && (this.state === 'fall' || this.state === 'thrown') && Math.abs(this.vx) > 3 && !this.splatted) {
        this.wallSplat(this.x < bounds.xMin ? bounds.xMin : bounds.xMax);
      }
      this.x = clamp(this.x, bounds.xMin, bounds.xMax);
    }
    if (Game.solids.length) resolveSolids(this);
  }
  wallSplat(wx) {
    this.splatted = true;
    this.vx = -0.5 * this.vx;
    this.vz = Math.max(this.vz, 2.0);
    const src = this.blasted || this.thrownBy || Game.player;
    this.hp = Math.max(0, this.hp - 5);
    this.hs = Math.max(this.hs, TIERS[4].hs);
    Game.hitstop = Math.max(Game.hitstop, 6);
    FX.shake(3);
    FX.dust(wx, this.y, 8, 1.4);
    FX.wallCrack(wx, this.y - this.z - this.h * 0.5);
    FX.text(this.x, this.y, this.z + this.h + 4, 'WALL SPLAT!', '#ffe066', 50);
    Sound.sfx('hitFinisher', this.x);
    if (src && src.onLanded && src.team === 'player') src.onLanded(this, { dmg: 5, meter: 3 }, 5, 4);
    if (this.hp <= 0 && !this.dying) this.onDeath(src, {}, sign(this.vx));
  }
  onLand() {
    const prevVz = this.vz;
    this.vz = 0;
    if (this.state === 'fall' || this.state === 'thrown') {
      if (prevVz < -3.0 && !this.bounced) {
        this.bounced = true;
        this.vz = 1.6;
        this.z = 0.01;
        this.vx *= 0.6;
        FX.dust(this.x, this.y, 6);
        Sound.sfx('thud', this.x);
        FX.shake(1);
        if (this.state === 'thrown' && this.tossDmg) this.applyTossDamage();
        return;
      }
      if (this.state === 'thrown' && this.tossDmg) this.applyTossDamage();
      this.setState('down');
      this.juggle = 0; this.splatted = false; this.blasted = null; this.thrownBy = null;
      this.vx *= 0.5;
      FX.dust(this.x, this.y, 8, 1.6);
      Sound.sfx('thud', this.x);
      if (this.onDowned) this.onDowned();
    } else {
      this.onLandNormal && this.onLandNormal(prevVz);
    }
  }
  applyTossDamage() {
    const d = this.tossDmg; this.tossDmg = 0;
    this.hp = Math.max(0, this.hp - d);
    FX.hit(this.x, this.y, 6, 3, 1, (FAMILY[this.family] || FAMILY.gang).tint);
    Sound.sfx('hitHeavy', this.x);
    FX.shake(2);
    if (this.hp <= 0 && !this.dying) this.onDeath(this.thrownBy, {}, 1);
  }
  // Returns true while the fighter is busy with a reaction state.
  reactionStates() {
    switch (this.state) {
      case 'hurt':
        this.vx *= 0.80; this.vy = 0;
        if (this.t >= this.hurtTime) this.setState('idle');
        return true;
      case 'fall':
      case 'thrown':
        return true;
      case 'down':
        this.vx *= 0.85; this.vy = 0;
        if (Math.abs(this.vx) > 1 && this.t % 4 === 0) FX.dust(this.x, this.y, 1, 0.5);
        if (this.dying || this.hp <= 0) {
          if (!this.dying) this.onDeath(this.lastHitBy, {}, 1);
          if (this.t > 72) { this.remove = true; this.onRemoved && this.onRemoved(); }
          return true;
        }
        if (this.t >= this.downTime) this.setState('getup');
        return true;
      case 'getup':
        if (this.t >= 12) { this.setState('idle'); this.grace = 10; this.inv = Math.max(this.inv, 2); }
        return true;
      case 'grabbed':
        this.vx = 0;
        return true;
    }
    return false;
  }
}

// Thrown or blasted bodies bowl over other enemies once each.
function bowlingCollisions(body, others) {
  const src = body.thrownBy || body.blasted;
  if (!src || Math.abs(body.vx) < 3) return;
  body.bowled = body.bowled || new Set();
  for (const t of others) {
    if (t === body || !t.vulnerable || body.bowled.has(t.id) || t.team !== 'enemy') continue;
    if (Math.abs(t.y - body.y) > 8 || Math.abs(t.x - body.x) > 12 + t.w) continue;
    if (body.z > t.h) continue;
    body.bowled.add(t.id);
    t.takeHit(src, { dmg: body.state === 'thrown' ? 12 : 10, tier: 3, knock: true, kx: 2.6, kz: 3.2, zr: [0, 40], bowling: true }, sign(body.vx) || 1);
    body.vx *= 0.7;
    if (body.bowled.size === 2) FX.text(t.x, t.y, 50, 'STRIKE!', '#ffe066', 50);
  }
  // thrown bodies also smash props (and set red fuel drums off instantly)
  for (const pr of Game.ents) {
    if (pr.team !== 'prop' || pr.remove || body.bowled.has(pr.id)) continue;
    if (Math.abs(pr.y - body.y) > 8 || Math.abs(pr.x - body.x) > pr.w + body.w * 0.5 || body.z > pr.h) continue;
    body.bowled.add(pr.id);
    pr.takeHit(src, { dmg: 10, tier: 3, thrownBody: true, zr: [0, 40] }, sign(body.vx) || 1);
  }
}

// Solid rectangles on the floor (wrecks, the burning bus, crates): { x0, x1, y0, y1, h, splat }.
// Bodies are pushed out along the shallower axis; launched bodies hitting one fast get wall-splatted.
function resolveSolids(e) {
  for (const r of Game.solids) {
    if (r.off) continue;
    if (e.z > (r.h || 999)) continue;
    const x0 = r.x0 - e.w * 0.6, x1 = r.x1 + e.w * 0.6;
    if (e.x <= x0 || e.x >= x1 || e.y <= r.y0 || e.y >= r.y1) continue;
    const pl = e.x - x0, pr = x1 - e.x, pu = e.y - r.y0, pd = r.y1 - e.y;
    const m = Math.min(pl, pr, pu, pd);
    if ((e.state === 'fall' || e.state === 'thrown') && Math.abs(e.vx) > 3 && r.splat !== false && !e.splatted && (m === pl || m === pr)) {
      e.wallSplat && e.wallSplat(m === pl ? x0 : x1);
    }
    if (m === pl) e.x = x0; else if (m === pr) e.x = x1; else if (m === pu) e.y = r.y0; else e.y = r.y1;
    if (e.onSolid) e.onSolid(r);
  }
}
