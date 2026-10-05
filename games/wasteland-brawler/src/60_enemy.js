// Enemy base: shared AI (approach, circle, attack tokens, retreat), the telegraph language and
// hit handling. Concrete enemy types register in ENEMY_TYPES and supply drawBody() plus data.
//
// ENEMY_TYPES[key] = {
//   name, family: 'gang'|'mutant'|'scorpion', hp, speed, w, h, weight, score, shadowR,
//   armorTier (hits below this tier don't flinch), poise (boss poise), launchable, launchCap,
//   heavy (pushes the hero back on hit), noGrab, tossOnly, noSuplex, downTime, boss,
//   sprite: [w, h, ox, oy] scratch canvas, range (attack distance), hover (circling distance),
//   attacks: { key: { start, active, rec, dmg, tier, knock, kx, kz, kb, stun, reach:[near,far], zr:[lo,hi], depth,
//                     tell: 'glint'|'heavy'|'grab', danger: 'line'|'circle', dangerLen, glint:[x,y], whiff, sfxStart,
//                     selfVx, keepVx, projectile } },
//   pattern(dist, dy) -> attack key | null   (this = enemy)
//   think(), stateUpdate() -> bool, attackTick(a, phase), drawBody(g), init(opts), onHurt(), onDeath(),
//   onRemoved(), onDowned(), enterStyles: { side(spec) }, drawExtra(ctx, camX)
// }

const ENEMY_TYPES = {};

class Enemy extends Fighter {
  constructor(type, x, y, opts = {}) {
    super(x, y);
    const d = ENEMY_TYPES[type];
    if (!d) throw new Error('unknown enemy type ' + type);
    this.type = type;
    this.def = d;
    this.team = 'enemy';
    this.family = d.family || 'gang';
    this.hp = this.maxHp = Math.round(d.hp * (d.boss ? 1 : Game.diff.hp));
    this.w = d.w || 8; this.h = d.h || 40;
    this.speed = d.speed || 1;
    this.weight = d.weight != null ? d.weight : 1;
    this.shadowR = d.shadowR || 10;
    this.armorTier = d.armorTier || 0;
    this.poiseMax = this.poise = d.poise || 0;
    this.launchable = d.launchable !== false;
    this.launchCap = d.launchCap || 0;
    this.heavy = !!d.heavy;
    this.downTime = d.downTime || 40;
    this.name = d.name;
    this.score = d.score || 100;
    this.boss = !!d.boss;
    this.tossOnly = !!d.tossOnly; this.noSuplex = !!d.noSuplex;
    this.ai = 'approach'; this.aiT = 0;
    this.token = false;
    this.cool = ri(20, 50);
    this.slot = { side: chance(0.5) ? 1 : -1, dy: rr(-14, 14), dist: rr(60, 100) };
    this.variant = opts.variant || 0;
    this.opts = opts;
    this.anim = rr(0, 100);
    if (d.init) d.init.call(this, opts);
  }
  get grabbable() { return !this.def.noGrab && !this.boss; }
  canBeGrabbed() {
    if (!this.alive || this.def.noGrab || this.boss) return false;
    if (this.state === 'attack') return this.atkPhase() === 'start' && !(this.atk.tell === 'heavy');
    return ['idle', 'walk', 'hurt'].includes(this.state);
  }

  // Attack tokens: 2 melee + 1 ranged at once (3 melee in stage 3). Bosses and def.noToken ignore the pool.
  // Pass ranged=true (or set def.ranged) to draw from the ranged pool.
  takeToken(ranged = !!this.def.ranged) {
    if (this.token) return true;
    if (this.boss || this.def.noToken) { this.token = true; return true; }
    const holders = Game.foes().filter(e => e.token && !e.boss && !e.def.noToken && !!e.tokenRanged === ranged).length;
    const max = ranged ? 1 : Game.maxAttackers();
    if (holders < max) { this.token = true; this.tokenRanged = ranged; return true; }
    return false;
  }
  dropToken() { this.token = false; }
  setState(s) {
    super.setState(s);
    if (['hurt', 'fall', 'grabbed', 'thrown', 'held', 'down', 'pinned'].includes(s)) this.dropToken();
  }
  onScreen() { return this.x > Game.cam.x + 4 && this.x < Game.cam.x + W - 4; }

  update(bounds) {
    this.anim++;
    this.physics(bounds);
    if ((this.state === 'thrown' || this.state === 'fall') && (this.thrownBy || this.blasted)) bowlingCollisions(this, Game.foes());
    if (this.state === 'pinned' || this.state === 'held') { this.vx = 0; this.vy = 0; if (this.state === 'held') this.z = Math.max(0, this.z); return; }
    if (this.def.stateUpdate && this.def.stateUpdate.call(this)) return;
    if (this.reactionStates()) return;
    this.aiT++;
    if (this.state === 'drop') { if (this.z <= 0) { this.setState('idle'); this.grace = 10; FX.dust(this.x, this.y, 8, 1.4); FX.shake(2, 8); Sound.sfx('thud', this.x); } return; }
    if (this.state === 'door') { this.vx = 0; this.vy = this.speed * 0.8; if (this.t > 20) { this.setState('idle'); this.vy = 0; } return; }
    if (this.state === 'attack') { this.attackUpdate(); return; }
    if (this.state === 'enter') { this.enterUpdate(); return; }
    if (this.state === 'taunt') { this.vx = this.vy = 0; if (this.t > (this.tauntT || 40)) this.setState('idle'); return; }
    if (this.state === 'panic') { this.panicUpdate(); return; }
    if (this.state === 'dizzy') { this.vx *= 0.8; if (this.t % 10 === 0) FX.add({ kind: 'star', x: this.x + rr(-6, 6), y: this.y, z: this.h + 4, life: 8, size: 3, color: '#ffe066', g: 0 }); if (this.t > (this.dizzyT || 60)) this.setState('idle'); return; }
    if (this.cool > 0) this.cool--;
    if (this.grace > 0) { this.vx *= 0.8; this.vy *= 0.8; return; }
    (this.def.think || Enemy.prototype.meleeThink).call(this);
  }
  attackUpdate() {
    const a = this.atk;
    const ph = this.atkPhase();
    if (this.def.attackTick) this.def.attackTick.call(this, a, ph);
    if (this.state !== 'attack' || this.atk !== a) return;
    if (a.selfVx != null && ph === 'active') this.vx = a.selfVx * this.facing;
    else if (!a.keepVx) this.vx *= 0.75;
    this.vy *= 0.6;
    if (!a.projectile && !a.custom) this.resolveAttack([Game.player]);
    if (this.atkPhase() === 'done') {
      const nx = a.next;
      this.atk = null;
      if (nx && (!a.nextOnHit || (this.atkHit && this.atkHit.size))) { this.startAttack(this.def.attacks[nx]); return; }
      this.finishAttack();
    }
  }
  finishAttack() {
    this.setState('idle');
    this.dropToken();
    this.ai = 'retreat'; this.aiT = 0;
    this.cool = Math.round(ri(this.def.coolMin || 60, this.def.coolMax || 110) * Game.stageMult() * (this.coolMul || 1));
  }
  enterUpdate() {
    const cx = Game.cam.x;
    const inside = this.x > cx + 20 && this.x < cx + W - 20;
    this.vx = this.facing * this.speed * 1.2;
    this.vy = 0;
    if (inside || this.t > 300) { this.setState('idle'); this.vx = 0; }
  }
  setPanic(n) { if (this.alive && !['fall', 'down', 'thrown'].includes(this.state)) { this.atk = null; this.setState('panic'); this.panicT = n; this.dropToken(); } }
  panicUpdate() {
    this.vx = Math.sin(this.t * 0.15) * this.speed * 1.5;
    this.vy = Math.cos(this.t * 0.11) * this.speed;
    if (this.t % 4 === 0) FX.fire(this.x, this.y, this.h * 0.6, 1);
    if (this.t > this.panicT) this.setState('idle');
  }

  // Default melee brain: hover around the hero until it gets an attack token, then line up and strike.
  meleeThink() {
    const p = Game.player;
    const d = this.def;
    if (!p || Game.playerGone || p.hp <= 0 || p.state === 'down') { this.circle(p, 1.3); return; }
    const dx = p.x - this.x, dy = p.y - this.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (this.ai === 'retreat') {
      this.face(p);
      this.moveToward(this.x - sign(dx) * 40, this.y + this.slot.dy * 0.2, 0.7);
      if (this.aiT > (d.retreatT || 24)) { this.ai = 'approach'; this.aiT = 0; }
      return;
    }
    if (d.taunts && this.cool > 20 && chance(0.004)) { this.setState('taunt'); this.tauntT = 40; Sound.sfx('taunt', this.x); return; }
    if (this.cool <= 0 && this.onScreen() && this.takeToken()) {
      this.face(p);
      const key = d.pattern ? d.pattern.call(this, adx, ady) : null;
      if (key) { this.attack(key); return; }
      // line up for the default melee attack
      const range = d.range || 22;
      const tx = p.x - sign(dx || 1) * range, ty = p.y;
      if (adx <= range + 4 && adx >= range * 0.4 && ady <= 3) { this.vx = this.vy = 0; this.attack(d.melee || Object.keys(d.attacks)[0]); return; }
      this.moveToward(tx, ty, 1);
      if (this.aiT > 200) { this.dropToken(); this.cool = 30; this.aiT = 0; }
      return;
    }
    this.circle(p, 1);
  }
  // Circle the hero at slot distance, drifting in depth.
  circle(p, k = 1) {
    if (!p) { this.wander(); return; }
    const dx = p.x - this.x;
    const side = dx > 0 ? -1 : 1;
    const dist = this.def.hover || this.slot.dist;
    const hx = clamp(p.x + side * dist, Game.cam.x + 16, Game.cam.x + W - 16);
    const hy = clamp(p.y + this.slot.dy + Math.sin(this.aiT * 0.02 + this.id) * 8, Game.bounds.yMin, Game.bounds.yMax);
    this.face(p);
    if (Math.abs(this.x - hx) > 6 || Math.abs(this.y - hy) > 4) this.moveToward(hx, hy, 0.6 * k);
    else { this.vx = this.vy = 0; if (this.state !== 'idle') this.setState('idle'); }
  }
  attack(key) {
    const base = this.def.attacks[key];
    if (!base) return;
    const a = Object.assign({ key }, base);
    a.start = Math.max(a.tell === 'heavy' ? 10 : 4, a.start + (Game.diff.tele || 0) - (this.teleCut || 0));
    this.startAttack(a);
    if (a.tell === 'heavy' || a.tell === 'grab') Sound.sfx(this.family === 'mutant' ? 'groan' : this.family === 'scorpion' ? 'rattle' : 'shout', this.x);
  }
  wander() {
    this.vx *= 0.8; this.vy *= 0.8;
    if (this.state !== 'idle' && this.state !== 'walk') this.setState('idle');
  }
  moveToward(tx, ty, k = 1) {
    const sx = this.speed * k, sy = this.speed * 0.65 * k;
    const dx = tx - this.x, dy = ty - this.y;
    this.vx = Math.abs(dx) > 2 ? sign(dx) * Math.min(sx, Math.abs(dx)) : 0;
    this.vy = Math.abs(dy) > 1 ? sign(dy) * Math.min(sy, Math.abs(dy)) : 0;
    if (this.vx || this.vy) { if (this.state !== 'walk') this.setState('walk'); }
    else if (this.state !== 'idle') this.setState('idle');
  }
  takeHit(src, a, dir, nth) {
    const wasAttack = this.state === 'attack';
    super.takeHit(src, a, dir, nth);
    if (src && src.team === 'player') {
      Game.showFoe(this);
      if (this.airborne && this.state === 'fall' && wasAttack && this.def.interceptable) { FX.text(this.x, this.y, this.z + 30, 'INTERCEPT!', '#ffe066', 50); Game.addScore(500); }
    }
    if (this.def.onHurt) this.def.onHurt.call(this, src, a);
  }
  onArmorHit(src, a, tier) {
    Sound.sfx('tink', this.x);
    this.armorFlash = 4;
    if (src && src.team === 'player' && this.heavy) src.vx = -src.facing * 0.4;
  }
  onHitFx(x, z, tier, dir, a) {
    const fam = FAMILY[this.family] || FAMILY.gang;
    FX.hit(x, this.y, z, tier, dir, fam.tint);
    if (this.family === 'mutant') FX.splat(x, this.y, z, '#7cff4f', 2 + tier, dir);
    else if (this.family === 'scorpion') { FX.shards(x, this.y, z, 1 + tier, this.def.chitin); FX.splat(x, this.y, z, '#e8e070', 1 + (tier >> 1), dir, false); }
    else if (tier >= 2) FX.sweat(x, this.y, z + 4, 2);
  }
  onDeath(src, a, dir) {
    if (this.dying) return;
    this.dying = true;
    this.dropToken();
    if (this.grabbedBy) this.releaseGrab();
    Game.addScore(this.score);
    FX.text(this.x, this.y, this.h + 6, String(this.score), '#ffe066', 50);
    Sound.sfx(this.def.deathSfx || 'ko', this.x);
    if (this.family === 'mutant') { FX.splat(this.x, this.y, this.h * 0.5, '#7cff4f', 12, dir || 1); FX.pool(this.x, this.y + 1, '#4fb82e', 14); }
    if (this.family === 'scorpion') FX.shards(this.x, this.y, 10, 6, this.def.chitin);
    if (this.family === 'gang' && this.def.gear) FX.add({ kind: 'shard', x: this.x, y: this.y, z: this.h, vx: rr(-1.5, 1.5), vz: 3, life: 60, color: this.def.gear, size: 4, rot: 0, spin: 0.3, g: 0.24, ground: this.y });
    if (this.def.onDeath) this.def.onDeath.call(this, src, a);
    if (this.state !== 'fall' && this.state !== 'thrown' && this.state !== 'down' && this.state !== 'held') this.knockDown(dir || -this.facing, 3.5 * this.weight, 3.5);
  }
  onDowned() { if (this.def.onDowned) this.def.onDowned.call(this); }
  onRemoved() { if (this.def.onRemoved) this.def.onRemoved.call(this); }

  // ---------- telegraph language ----------
  telegraphing() { return this.state === 'attack' && this.atkPhase() === 'start' && this.atk; }
  drawMarker(ctx, camX) {
    const a = this.telegraphing();
    if (!a || !a.danger) return;
    Px.use(ctx);
    const k = this.t / Math.max(1, a.start);
    if (a.danger === 'line') {
      const len = a.dangerLen || 100;
      const x0 = this.x - camX, y = this.y;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < len; i += 8) Px.rect(x0 + this.facing * i - (this.facing < 0 ? 4 : 0), y, 4, 1, '#ff3030');
      ctx.globalAlpha = 1;
    } else if (a.danger === 'circle' && this.dangerAt) {
      ctx.globalAlpha = 0.35 + 0.3 * k;
      ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 1;
      const r = lerp(6, a.dangerR || 16, k);
      ctx.beginPath(); ctx.ellipse(Math.round(this.dangerAt.x - camX), Math.round(this.dangerAt.y), r, r * 0.4, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  draw(ctx, camX) {
    if (this.dying && this.state === 'down' && this.t > 50 && (this.t >> 1) % 2) return;
    const intangible = this.juggle >= 2 && this.airborne && this.state === 'fall';
    if (intangible && (this.t >> 1) % 2) return;
    const d = this.def;
    const sp = d.sprite || [112, 96, 56, 88];
    Sprite.begin(sp[0], sp[1], sp[2], sp[3]);
    d.drawBody.call(this, Sprite.cur.ga);
    const tele = this.telegraphing();
    let tint = null;
    if (this.tintT > 0) tint = [(FAMILY[this.family] || FAMILY.gang).tint, this.tintT / 8];
    if (tele && tele.tell === 'heavy') tint = ['#ff6a3d', 0.25 + 0.25 * Math.sin(this.t * 0.5)];
    if (this.venom > 0) tint = ['#7cff4f', 0.3];
    if (this.burn > 0 && (this.t >> 2) % 2) tint = ['#ff8a1e', 0.35];
    const sil = Game.silhouetteDist && Game.player && Math.abs(this.x - Game.player.x) > Game.silhouetteDist;
    Sprite.end(ctx, this.x - camX + this.jitter, this.y - this.z, this.facing, {
      flash: sil ? '#3a2a1a' : this.flash > 0 || this.armorFlash-- > 0 ? '#ffffff' : null,
      tint: sil ? null : tint,
    });
    if (sil && d.eyes) {
      // only the eyes glow through the storm: def.eyes() returns [[localX, localY, colour], ...]
      Px.use(ctx);
      for (const [ex, ey, c] of d.eyes.call(this)) Px.rect(this.x - camX + this.facing * ex - (this.facing < 0 ? 1 : 0), this.y - this.z + ey, 1, 1, c);
      return;
    }
    // glint 6f before the active window
    if (tele && tele.tell && this.t >= tele.start - 6) {
      const g = tele.glint || [tele.reach ? tele.reach[1] * 0.6 : 14, -this.h * 0.6];
      const gx = this.x - camX + this.facing * g[0], gy = this.y - this.z + g[1];
      const s = 2 + (tele.start - this.t) % 3;
      Px.use(ctx);
      Px.rect(gx - s, gy, s * 2 + 1, 1, '#ffffff');
      Px.rect(gx, gy - s, 1, s * 2 + 1, '#ffffff');
    }
    if (tele && (tele.tell === 'heavy' || tele.tell === 'grab')) {
      const bx = this.x - camX, by = this.y - this.z - this.h - 14 - (this.t % 10 < 5 ? 1 : 0);
      Px.use(ctx);
      Px.rect(bx - 2, by - 1, 5, 12, '#000');
      Px.rect(bx - 1, by, 3, 7, '#ff3030');
      Px.rect(bx - 1, by + 8, 3, 2, '#ff3030');
    }
    if (d.drawExtra) d.drawExtra.call(this, ctx, camX);
  }
}

// Shared humanoid pose picker for enemies on the human rig. attackPose(phase, t) supplies attack poses.
function enemyHumanPose(e, attackPose) {
  switch (e.state) {
    case 'walk': case 'enter': return Poses.walk(e.anim, e.speed);
    case 'hurt': return (e.hurtAlt || 0) % 2 ? Poses.hurt(e.t) : PlayerPoses.gutfold(e.t);
    case 'fall': case 'thrown': return Poses.fall(e.t, e.vz);
    case 'down': return Poses.down();
    case 'getup': return Poses.getup(e.t * 16 / 12);
    case 'grabbed': case 'held': case 'pinned': return Poses.grabbed(e.t);
    case 'drop': return Poses.jump(-1);
    case 'taunt': return pose({ rot: -0.15, fThigh: 0.3, fKnee: -0.2, bThigh: -0.3, bKnee: -0.2, fUpper: 2.8 + Math.sin(e.t * 0.4) * 0.3, fElbow: 0.6, bUpper: 2.6 - Math.sin(e.t * 0.4) * 0.3, bElbow: 0.6, head: -0.2 });
    case 'panic': return pose({ rot: -0.2, fThigh: Math.sin(e.t * 0.5) * 0.6, fKnee: -0.6, bThigh: -Math.sin(e.t * 0.5) * 0.6, bKnee: -0.6, fUpper: 2.6 + Math.sin(e.t * 0.7), fElbow: 0.5, bUpper: 2.4 - Math.sin(e.t * 0.7), bElbow: 0.5 });
    case 'dizzy': return pose({ rot: Math.sin(e.t * 0.15) * 0.25, head: Math.sin(e.t * 0.15 + 1) * 0.3, fThigh: 0.2, fKnee: -0.3, bThigh: -0.2, bKnee: -0.3, fUpper: -0.3, fElbow: 0.3, bUpper: 0.3, bElbow: 0.3 });
    case 'attack': return attackPose ? attackPose(e.atkPhase(), e.t, e.atk) : Poses.idle(e.anim);
  }
  return Poses.idle(e.anim);
}
