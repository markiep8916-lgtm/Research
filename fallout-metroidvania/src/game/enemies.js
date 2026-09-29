// Enemy framework and roster. Visuals for non-humanoids live in gfx/creatures.js (CD.art[name]).
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T, TILE = CD.TILE;
const G = (CD.G = CD.G || {});
const E = (CD.ENEMIES = CD.ENEMIES || {});
CD.art = CD.art || {};

const DIFF = { vault: 1.0, surface: 1.2, rustyard: 1.4, metro: 1.6, plant: 1.85, deep: 2.15 };

// ------------------------------------------------------------------ corpses (visual only)
class Corpse extends CD.Entity {
  constructor(e, o) {
    super(e.x, e.y, e.w, e.h); this.kind = 'corpse'; this.z = 2; this.src = e; this.face = e.face || 1; this.vx = (o && o.dx ? o.dx : 0) * 140 + e.vx * 0.5; this.vy = -180; this.life = 14; this.rot = 0; this.def = e.def; this.spin = (Math.random() - 0.5) * 3; this.landed = false; this.rig = e.rig; this.scale = e.scale || 1; this.art = e.def.art; this.t0 = 0; this.alpha = 1; this.snap = { phase: e.phase, t: e.t, st: e.state };
  }
  update(dt) {
    this.t += dt; this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
    if (!this.landed) { const f = CD.moveActor(this, dt, { gravity: 1500 }); this.vx *= 0.99; if (f.down) { this.landed = true; this.vx = 0; G.fx.dust(this.cx, this.bottom, 3, 0); } }
    const target = this.def.corpseRot !== undefined ? this.def.corpseRot : (this.rig ? 1.5 : 3.14);
    this.rot = U.approach(this.rot, target, dt * (this.landed ? 8 : 4));
    if (this.life < 3) this.alpha = this.life / 3;
  }
  draw(ctx) {
    ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(this.cx, this.bottom, this.w * 0.6, 3, 0, 0, 7); ctx.fill();
    if (this.rig) {
      const pose = CD.Rig.pose({ mode: 'dead', t: 0, phase: 0 });
      CD.Rig.draw(ctx, this.rig, pose, { x: this.cx, y: this.bottom, scale: this.scale, face: this.face, rot: -this.rot * this.face * (this.landed ? 1 : 0.9), weapon: null });
    } else if (CD.art[this.art]) {
      ctx.translate(this.cx, this.cy); ctx.rotate(this.rot * (this.face || 1)); ctx.translate(-this.cx, -this.cy);
      const fake = { x: this.x, y: this.y, w: this.w, h: this.h, cx: this.cx, cy: this.cy, face: this.face, t: this.t, vx: 0, vy: 0, state: 'dead', phase: this.snap.phase, hp: 0, def: this.def, flash: 0, atkK: 0, dead: true, deadT: this.t, onGround: true, scale: this.scale };
      CD.art[this.art](ctx, fake, G);
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ enemy
class Enemy extends CD.Entity {
  constructor(spec, def, type) {
    const diff = (spec.diff || DIFF[(G.world.rooms[spec.room] || {}).region] || 1);
    const scale = def.scale || 1, w = (def.w || 24) * scale, h = (def.h || 60) * scale;
    const cx = (spec.tx + 0.5) * T;
    super(cx - w / 2, def.fly ? (spec.ty + 0.5) * T - h / 2 : (spec.ty + 1) * T - h, w, h);
    this.type = type; this.def = def; this.kind = 'enemy'; this.hittable = true; this.z = 4; this.scale = scale; this.key = spec.key; this.once = !!spec.once || !!def.once; this.spec = spec;
    this.maxHp = Math.round((spec.hp || def.hp) * (1 + (diff - 1) * 0.9)); this.hp = this.maxHp; this.dmgMul = 0.85 + diff * 0.15; this.xp = Math.round((def.xp || 8) * (0.7 + diff * 0.4)); this.caps = def.caps ? Math.round(U.hash2(spec.tx, spec.ty, 8) * (def.caps[1] - def.caps[0]) + def.caps[0]) : undefined;
    this.face = spec.face || (Math.random() < 0.5 ? -1 : 1); this.state = 'idle'; this.stateT = 0.4 + Math.random() * 1.2; this.home = { x: this.cx, y: this.cy }; this.patrol = (spec.patrol || def.patrol || 4) * T;
    this.armor = def.armor || 0; this.robot = !!def.robot; this.metal = !!def.metal; this.big = !!def.big; this.bloodCol = def.blood; this.headFrac = def.headFrac; this.head = def.head; this.kbMul = def.kb === undefined ? 1 : def.kb; this.noKnock = !!def.noKnock;
    this.rig = def.outfit ? CD.Rig.get(def.outfit) : null; this.phase = Math.random() * 6; this.flash = 0; this.stun = 0; this.cool = 1 + Math.random(); this.atkT = 0; this.alert = 0; this.hasSeen = false; this.contactCd = 0; this.dropItems = spec.drops; this.deadT = 0; this.atkK = 0;
    this.onGround = false; this.vyPrev = 0; this.aimA = 0; this.burst = 0; this.tt = Math.random() * 10; this.hitFlashCol = null; this.extra = {}; this.fly = !!def.fly; this.hoverY = this.cy; this.wander = Math.random() * 6;
    this.hitPad = def.hitPad || 0; this.awake = false; this.shield = false; this.sleeping = !!def.burrow; this.ignited = 0;
    if (def.init) def.init(this, spec);
  }
  // ---- senses
  eye() { return { x: this.cx, y: this.y + this.h * 0.28 }; }
  dist() { const p = G.player; return Math.hypot(p.cx - this.cx, p.cy - this.cy); }
  sees(range, fov) {
    const p = G.player; if (!p || p.dead) return false;
    const dx = p.cx - this.cx, dy = p.cy - this.cy; if (Math.abs(dx) > range || Math.abs(dy) > range * 0.7) return false;
    if (Math.hypot(dx, dy) > range) return false;
    if (fov && Math.sign(dx) !== this.face && this.alert <= 0 && Math.abs(dx) > 60) return false;
    const eye = this.eye(); return G.world.los(eye.x, eye.y, p.cx, p.y + 22);
  }
  onHit(d, o) { this.alert = 6; this.hasSeen = true; if (this.def.stun !== 0 && !this.def.armorStun && this.state !== 'dead') { this.stun = Math.max(this.stun, this.def.stun || 0.14); if (this.state === 'windup' || this.state === 'attack') { if (!this.def.superArmor) { this.state = 'chase'; this.atkT = 0; this.cool = 0.4; } } } if (this.def.onHurt) this.def.onHurt(this, d, o); if (this.sleeping) this.wake(); }
  wake() { this.sleeping = false; }
  ignite(t) { this.ignited = t; }
  onDeath(o) {
    G.fx.blood && !this.robot && G.fx.blood(this.cx, this.cy, 14, (o && o.dx) || 0, -0.4, this.bloodCol);
    if (this.robot) { G.fx.explosion(this.cx, this.cy, 46 * this.scale); G.fx.debris(this.cx, this.cy, 12, '110,116,120', 340); }
    if (this.def.onDie) this.def.onDie(this, o);
    if (this.def.noCorpse) return;
    if (!this.robot && (this.rig || CD.art[this.def.art])) G.ents.push(new Corpse(this, o));
    else if (this.robot && this.def.wreck !== false && (CD.art[this.def.art])) { const c = new Corpse(this, o); c.rot = 0.3; c.vx *= 0.3; c.life = 20; G.ents.push(c); }
  }
  // ---- movement helpers
  floorAhead(dir) { const w = G.world, x = this.cx + dir * (this.w / 2 + 6), ty = Math.floor((this.bottom + 4) / T), tx = Math.floor(x / T); const t = w.tile(tx, ty); return CD.isSolidTile(t) || t === TILE.PLAT || t === TILE.LADDER && false; }
  wallAhead(dir) { const w = G.world, x = this.cx + dir * (this.w / 2 + 3); return w.rectHitsSolid(x - 1, this.y + 4, 2, this.h - 12) || (dir > 0 ? w.rectHitsSolid(this.x + this.w, this.y + this.h - 22, 4, 16) : w.rectHitsSolid(this.x - 4, this.y + this.h - 22, 4, 16)); }
  stepUpAhead(dir) { const w = G.world; const x = this.cx + dir * (this.w / 2 + 4); const ty0 = Math.floor((this.bottom - 4) / T); return w.isSolid(Math.floor(x / T), ty0) && !w.isSolid(Math.floor(x / T), ty0 - 1) && !w.isSolid(Math.floor(x / T), ty0 - 2); }
  moveTo(dir, spd, dt, acc) { this.vx = U.approach(this.vx, dir * spd, (acc || 1600) * dt); if (dir) this.face = dir; }
  stop(dt) { this.vx = U.approach(this.vx, 0, 1800 * dt); }
  jump(v) { if (this.onGround) { this.vy = -v; this.onGround = false; } }
  toPlayer() { return Math.sign(G.player.cx - this.cx) || this.face; }
  fireAt(ox, oy, speed, o) {
    const p = G.player; const tx = p.cx + p.vx * 0.12 * (o.lead || 0), ty = p.cy - 4; let a = Math.atan2(ty - oy, tx - ox) + (Math.random() - 0.5) * (o.spread || 0.05);
    G.shoot(Object.assign({ x: ox, y: oy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, owner: 'enemy', dmg: (o.dmg || 10) * this.dmgMul, life: 2 }, o.p || {}));
    return a;
  }

  update(dt) {
    this.t += dt; this.tt += dt; const p = G.player, def = this.def;
    if (this.flash > 0) this.flash -= dt; if (this.contactCd > 0) this.contactCd -= dt; if (this.alert > 0) this.alert -= dt; if (this.stun > 0) this.stun -= dt;
    if (this.ignited > 0) { this.ignited -= dt; if (Math.random() < 0.3) G.fx.add({ t: 'fire', x: this.cx + (Math.random() - 0.5) * this.w, y: this.y + Math.random() * this.h, vx: 0, vy: -40, life: 0.4, max: 0.4, size: 8 }); this.hp -= 8 * dt; if (this.hp <= 0) G.killEnemy(this, {}); }
    if (!p || p.dead && !def.persist) { if (def.ai !== 'turret') { if (this.onGround !== undefined && !this.fly) CD.moveActor(this, dt, { gravity: 1800 }); return; } }
    if (this.sleeping) { if (def.sleepCheck) def.sleepCheck(this, dt); return; }
    if (this.stun > 0 && !def.superArmor) { this.vx *= 0.94; if (!this.fly) CD.moveActor(this, dt, { gravity: 1800 }); else { CD.moveActor(this, dt, {}); } return; }
    const ai = AI[def.ai || 'brawler']; if (ai) ai(this, dt, def);
    // contact damage
    if (def.contact && this.contactCd <= 0 && p && !p.dead && U.overlap(this, { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 4 })) { if (G.hurtPlayer(def.contact * this.dmgMul, { x: this.cx, kind: 'melee', rad: def.rad, knock: def.contactKnock || 240 })) this.contactCd = 0.9; else this.contactCd = 0.2; }
    // animation phase
    if (this.onGround && Math.abs(this.vx) > 15) this.phase += Math.abs(this.vx) * (def.stride || 0.075) * dt;
  }

  draw(ctx) {
    const def = this.def; ctx.save();
    if (!this.fly && def.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.cx, this.bottom - 1, this.w * 0.55, 3, 0, 0, 7); ctx.fill(); }
    if (def.drawExtra) { ctx.save(); def.drawExtra(this, ctx); ctx.restore(); }
    if (def.customDraw) def.customDraw(this, ctx, false); else if (this.rig) this.drawHumanoid(ctx); else if (CD.art[def.art]) CD.art[def.art](ctx, this, G); else { ctx.fillStyle = '#a33'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    if (this.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; if (def.customDraw) def.customDraw(this, ctx, true); else if (this.rig) this.drawHumanoid(ctx, true); else if (CD.art[def.art]) CD.art[def.art](ctx, this, G, true); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    // health bar (only after being hurt)
    if (this.hp < this.maxHp && !this.def.noBar) { const bw = Math.min(46, this.w + 10), bx = this.cx - bw / 2, by = this.y - 10; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5); ctx.fillStyle = this.hp / this.maxHp > 0.35 ? '#9be36a' : '#e6584a'; ctx.fillRect(bx, by, bw * this.hp / this.maxHp, 3); }
  }
  drawHumanoid(ctx, flashOnly) {
    const def = this.def, p = G.player; let mode = 'idle';
    if (!this.onGround) mode = this.vy < 0 ? 'jump' : 'fall'; else if (Math.abs(this.vx) > 15) mode = 'run';
    const s = { mode, phase: this.phase, t: this.t, speed: Math.abs(this.vx) / (def.chase || def.speed || 100) * 0.9, vy: this.vy, hurt: this.stun > 0 ? this.stun / 0.2 : 0 };
    let wp = null;
    const wsp = def.weapon ? CD.Rig.weaponSprite(def.weapon) : null;
    if (def.ranged && wsp) {
      const dx = p.cx - this.cx, dy = (p.cy - 6) - (this.y + this.h * 0.36); const aimOn = this.state === 'aim' || this.state === 'fire' || this.alert > 0 || this.hasSeen;
      let la = Math.atan2(dy, Math.abs(dx) || 1); la = U.clamp(la, -1.2, 1.2);
      s.aim = aimOn ? la : 0.35; s.twoHand = wsp.twoHand || def.twoHand || false; if (this.recoil) s.recoil = this.recoil;
      wp = { sprite: wsp, twoHand: !!s.twoHand, mx: wsp.mx, kick: this.recoil || 0 };
    } else if (wsp) {
      wp = { sprite: wsp, melee: true, idleAng: 1.0, holdAng: 0.05 };
      if (this.state === 'windup' || this.state === 'attack') { s.swing = this.atkK; s.swingKind = def.swingKind || 'chop'; }
    } else if (def.claws && (this.state === 'windup' || this.state === 'attack')) { s.swing = this.atkK; s.swingKind = 'punch'; }
    if (def.crouchy) { s.crouch = 0.5; }
    const pose = CD.Rig.pose(s);
    CD.Rig.draw(ctx, this.rig, pose, { x: this.cx, y: this.bottom, scale: this.scale, face: this.face, weapon: wp });
    if (def.glow && !flashOnly) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(this.t * 4) * 0.08; ctx.fillStyle = def.glow; ctx.beginPath(); ctx.ellipse(this.cx, this.cy, this.w * 1.1, this.h * 0.7, 0, 0, 7); ctx.fill(); ctx.restore(); }
  }
  light(L) { const d = this.def; if (d.light) L.add({ x: this.cx, y: this.cy, r: d.light.r, color: d.light.c, i: d.light.i, shadow: false, flicker: d.light.f || 0 }); if (this.ignited > 0) L.add({ x: this.cx, y: this.cy, r: 120, color: [1, 0.55, 0.2], i: 0.7, shadow: false }); if (d.lightFn) d.lightFn(this, L); }
}
CD.Enemy = Enemy; CD.Corpse = Corpse;

// ------------------------------------------------------------------ AI archetypes
const AI = {};
// Melee walker: patrol -> chase -> windup -> attack -> recover
AI.brawler = function (e, dt, d) {
  const p = G.player, w = G.world;
  const seen = e.sees(d.aggro || 340, true);
  if (seen && !e.hasSeen) { e.hasSeen = true; e.alert = 5; if (d.alertSfx) CD.audio.play(d.alertSfx); }
  if (seen) e.alert = Math.max(e.alert, 3);
  const gravity = 1800; e.cool -= dt; e.stateT -= dt;
  const dxp = p.cx - e.cx, dyp = p.cy - e.cy, dirp = Math.sign(dxp) || e.face, ad = Math.abs(dxp);
  switch (e.state) {
    case 'idle': e.stop(dt); if (e.stateT <= 0) { e.state = 'patrol'; e.stateT = 1.5 + Math.random() * 2.5; e.face = Math.random() < 0.5 ? -1 : 1; } if (e.alert > 0) e.state = 'chase'; break;
    case 'patrol': {
      const dir = e.face; e.moveTo(dir, d.speed || 60, dt);
      if (e.wallAhead(dir) || !e.floorAhead(dir) || Math.abs(e.cx + dir * 20 - e.home.x) > e.patrol) { e.face = -e.face; e.vx = 0; e.stateT = 0.3; e.state = 'idle'; }
      if (e.stateT <= 0) { e.state = 'idle'; e.stateT = 0.8 + Math.random() * 1.5; }
      if (e.alert > 0) e.state = 'chase'; break;
    }
    case 'chase': {
      const spd = d.chase || 130; const dir = dirp;
      if (ad < (d.range || 46) && Math.abs(dyp) < (e.h * 0.75) && e.cool <= 0 && e.onGround) { e.state = 'windup'; e.atkT = 0; e.vx *= 0.3; e.face = dirp; if (d.windupSfx) CD.audio.play(d.windupSfx); break; }
      const blocked = e.wallAhead(dir), noFloor = !e.floorAhead(dir);
      if (d.jumper && e.onGround && ((e.stepUpAhead(dir) || blocked) || (dyp < -60 && ad < 140) || (noFloor && ad > 60 && ad < 260 && dyp > -100))) { e.jump(d.jump || 700); e.vx = dir * spd * 1.15; }
      else if (!d.jumper && (blocked || noFloor) && e.onGround) { e.stop(dt); }
      else e.moveTo(dir, spd, dt);
      if (d.leap && e.onGround && ad < d.leap.max && ad > d.leap.min && e.cool <= 0 && Math.abs(dyp) < 90) { e.vy = -(d.leap.vy || 520); e.vx = dirp * (d.leap.vx || 380); e.onGround = false; e.cool = d.leap.cool || 1.6; if (d.leap.sfx) CD.audio.play(d.leap.sfx); }
      if (e.alert <= 0 && !seen) { e.state = 'idle'; e.stateT = 1; } break;
    }
    case 'windup': {
      e.stop(dt); e.atkT += dt; const wt = d.windup || 0.35; e.atkK = (e.atkT / (wt + (d.strike || 0.16) + (d.recover || 0.45))) * 1.0;
      if (e.atkT >= wt) { e.state = 'attack'; e.hitDone = false; if (d.attackSfx) CD.audio.play(d.attackSfx); if (d.lunge) { e.vx = e.face * d.lunge; } }
      break;
    }
    case 'attack': {
      e.atkT += dt; const wt = d.windup || 0.35, st = d.strike || 0.16, rc = d.recover || 0.45; e.atkK = e.atkT / (wt + st + rc);
      if (!e.hitDone && e.atkT < wt + st) {
        const reach = d.reach || 50, hb = { x: e.face > 0 ? e.x + e.w * 0.5 : e.x + e.w * 0.5 - reach, y: e.y + 6, w: reach, h: e.h - 10 };
        if (U.overlap(hb, p) && (p.dashInv <= 0)) { if (G.hurtPlayer((d.dmg || 12) * e.dmgMul, { x: e.cx, kind: 'melee', rad: d.rad, knock: d.knock || 300 })) e.hitDone = true; }
        if (d.shockwave && !e.swDone && e.atkT > wt + 0.05) { e.swDone = true; G.fx.dust(e.cx + e.face * 30, e.bottom, 8, e.face); G.fx.shake(4, 0.2); CD.audio.play('thud'); }
      }
      if (e.atkT >= wt + st + rc) { e.state = 'chase'; e.cool = (d.cd || 1.1) + Math.random() * 0.5; e.swDone = false; e.atkK = 0; }
      if (e.atkT > wt + st) e.stop(dt); break;
    }
  }
  const f = CD.moveActor(e, dt, { gravity });
  if (f.down) { e.vyPrev = 0; }
};

// Ranged shooter humanoid/robot: keeps distance, telegraphs, fires bursts
AI.shooter = function (e, dt, d) {
  const p = G.player;
  const seen = e.sees(d.aggro || 520, false);
  if (seen) { if (!e.hasSeen) { e.hasSeen = true; if (d.alertSfx) CD.audio.play(d.alertSfx); } e.alert = 4; }
  e.cool -= dt; e.stateT -= dt; if (e.recoil > 0) e.recoil = Math.max(0, e.recoil - 60 * dt);
  const dxp = p.cx - e.cx, ad = Math.abs(dxp), dirp = Math.sign(dxp) || e.face, dyp = p.cy - e.cy;
  const want = d.keep || 300;
  switch (e.state) {
    case 'idle': e.stop(dt); if (e.stateT <= 0) { e.state = 'patrol'; e.stateT = 1.5 + Math.random() * 2; e.face = Math.random() < 0.5 ? -1 : 1; } if (e.alert > 0 && seen) e.state = 'engage'; break;
    case 'patrol': { const dir = e.face; e.moveTo(dir, d.speed || 55, dt); if (e.wallAhead(dir) || !e.floorAhead(dir) || Math.abs(e.cx + dir * 20 - e.home.x) > e.patrol) { e.face = -e.face; e.state = 'idle'; e.stateT = 0.5; } if (e.stateT <= 0) { e.state = 'idle'; e.stateT = 1; } if (e.alert > 0 && seen) e.state = 'engage'; break; }
    case 'engage': {
      e.face = dirp;
      let dir = 0;
      if (ad < want * 0.55) dir = -dirp; else if (ad > want * 1.25) dir = dirp; else dir = e.strafe || 0;
      if (Math.random() < 0.01) e.strafe = Math.random() < 0.5 ? -1 : (Math.random() < 0.5 ? 0 : 1);
      if (dir && (e.wallAhead(dir) || !e.floorAhead(dir))) { dir = 0; if (ad < want * 0.55) { /* cornered: fight */ } }
      if (dir) e.moveTo(dir, d.chase || d.speed || 90, dt); else e.stop(dt);
      e.face = dirp;
      if (e.cool <= 0 && seen && ad < (d.aggro || 520)) { e.state = 'aim'; e.atkT = 0; e.burst = d.burst || 3; }
      if (!seen && e.alert <= 0) { e.state = 'idle'; e.stateT = 1; }
      if (d.jumper && e.onGround && ((dir && e.stepUpAhead(dir)) || (dyp < -70 && ad < 220))) e.jump(650);
      break;
    }
    case 'aim': { e.stop(dt); e.face = dirp; e.atkT += dt; if (e.atkT >= (d.aimT || 0.5)) { e.state = 'fire'; e.atkT = 0; e.shotT = 0; } break; }
    case 'fire': {
      e.stop(dt); e.face = dirp; e.shotT -= dt;
      if (e.shotT <= 0 && e.burst > 0) {
        e.burst--; e.shotT = d.burstGap || 0.13; e.recoil = 4;
        const sp = CD.Rig.weaponSprite(d.weapon), ox = e.cx + e.face * ((sp ? sp.mx : 20) * e.scale * 0.9 + 6), oy = e.y + e.h * 0.4;
        e.fireAt(ox, oy, d.bulletSpeed || 900, { dmg: d.dmg || 9, spread: d.spread || 0.05, lead: d.lead || 0.3, p: { pk: d.pk || 'bullet', col: d.col, len: 14, knock: 120, life: 1.6, rad: d.rad } });
        G.fx.glowFlash(ox, oy, 46, d.pk === 'laser' ? '255,90,70' : '255,210,140', 0.06); G.fx.add({ t: 'spark', x: ox, y: oy, vx: e.face * 200, vy: -20, life: 0.1, max: 0.1, col: '255,220,150', size: 2 });
        CD.audio.play(d.sfx || 'pistol');
      }
      if (e.burst <= 0 && e.shotT <= -0.1) { e.state = 'engage'; e.cool = (d.cd || 1.6) + Math.random() * 0.8; }
      break;
    }
  }
  if (e.fly) { AI._flyMove(e, dt, d); } else CD.moveActor(e, dt, { gravity: 1800 });
};

// Flyers (bloatfly / eyebot): hover around the player and shoot
AI._flyMove = function (e, dt, d) {
  const w = G.world;
  const nx = e.x + e.vx * dt, ny = e.y + e.vy * dt;
  if (!w.rectHitsSolid(nx, e.y, e.w, e.h)) e.x = nx; else e.vx *= -0.4;
  if (!w.rectHitsSolid(e.x, ny, e.w, e.h)) e.y = ny; else e.vy *= -0.4;
};
AI.flyer = function (e, dt, d) {
  const p = G.player; const seen = e.sees(d.aggro || 460, false);
  if (seen) { if (!e.hasSeen) { e.hasSeen = true; if (d.alertSfx) CD.audio.play(d.alertSfx); } e.alert = 5; }
  e.cool -= dt; e.wander += dt;
  if (d.melee) {   // close-range saw attack (Mr. Handy): windup -> sweep
    const M = d.melee; e.cool2 = (e.cool2 || 0) - dt;
    if (!e.mst && e.alert > 0 && e.state !== 'fire' && e.cool2 <= 0 && Math.hypot(p.cx - e.cx, p.cy - e.cy) < M.range) { e.mst = 'windup'; e.mt = 0; e.face = Math.sign(p.cx - e.cx) || e.face; CD.audio.play('swing_heavy'); }
    if (e.mst) {
      e.mt += dt; e.vx = U.approach(e.vx, 0, 900 * dt); e.vy = U.approach(e.vy, 0, 900 * dt);
      if (e.mst === 'windup') { e.state = 'windup'; e.atkK = Math.min(1, e.mt / M.windup); if (e.mt >= M.windup) { e.mst = 'attack'; e.mt = 0; e.hitDone = false; } }
      else {
        e.state = 'attack'; e.atkK = Math.min(1, e.mt / M.strike);
        if (!e.hitDone && e.atkK > 0.35) { const hb = { x: e.face > 0 ? e.cx - 10 : e.cx - 100, y: e.y - 14, w: 110, h: e.h + 28 }; if (U.overlap(hb, p)) { if (G.hurtPlayer(M.dmg * e.dmgMul, { x: e.cx, kind: 'melee', knock: 320 })) e.hitDone = true; } }
        if (e.mt >= M.strike) { e.mst = null; e.state = 'idle'; e.cool2 = M.cd || 1.6; e.atkK = 0; }
      }
      AI._flyMove(e, dt, d); e.phase += dt * 22; return;
    }
  }
  let tx, ty;
  if (e.alert > 0) {
    const side = Math.sin(e.wander * 0.7) > 0 ? 1 : -1, r = d.orbit || 230;
    tx = p.cx + side * r * (0.6 + 0.4 * Math.sin(e.wander * 0.31)); ty = p.cy - (d.height || 110) + Math.sin(e.wander * 1.9) * 40;
    e.face = Math.sign(p.cx - e.cx) || e.face;
    if (e.cool <= 0 && seen && Math.abs(p.cx - e.cx) < (d.aggro || 460)) {
      const ox = e.cx + e.face * 10, oy = e.cy; e.cool = (d.cd || 2) + Math.random() * 0.8;
      if (d.burst) { e.burst = d.burst; e.shotT = 0; e.state = 'fire'; } else { e.fireAt(ox, oy, d.bulletSpeed || 420, { dmg: d.dmg || 8, spread: 0.06, lead: 0.4, p: { pk: d.pk || 'spit', col: d.col || '150,220,60', g: d.g || 380, life: 2.2, rad: d.rad || 3, r: 5, knock: 140 } }); CD.audio.play(d.sfx || 'squelch'); }
    }
    if (e.state === 'fire') { e.shotT -= dt; if (e.shotT <= 0 && e.burst > 0) { e.burst--; e.shotT = 0.12; e.fireAt(e.cx + e.face * 12, e.cy, d.bulletSpeed || 760, { dmg: d.dmg || 8, spread: 0.04, lead: 0.3, p: { pk: d.pk || 'laser', col: d.col || '255,70,50', life: 2, knock: 100 } }); G.fx.glowFlash(e.cx + e.face * 12, e.cy, 40, '255,90,70', 0.06); CD.audio.play(d.sfx || 'laser'); } if (e.burst <= 0) e.state = 'idle'; }
  } else {
    tx = e.home.x + Math.sin(e.wander * 0.6) * 90; ty = e.home.y + Math.sin(e.wander * 1.3) * 40;
  }
  const dx = tx - e.cx, dy = ty - e.cy, dd = Math.hypot(dx, dy) || 1, sp = (e.alert > 0 ? (d.chase || 120) : (d.speed || 50));
  e.vx = U.approach(e.vx, dx / dd * sp + Math.sin(e.wander * 3) * 30, 500 * dt); e.vy = U.approach(e.vy, dy / dd * sp * 0.8 + Math.cos(e.wander * 2.3) * 24, 500 * dt);
  if (d.buzz && Math.random() < 0.01) CD.audio.play('buzz');
  AI._flyMove(e, dt, d);
  e.phase += dt * 22;
};

// Wall/floor/ceiling turret: tracks and fires bursts
AI.turret = function (e, dt, d) {
  const p = G.player; if (!p || p.dead) return;
  e.cool -= dt; const seen = e.sees(d.aggro || 520, false);
  const mx = e.cx, my = e.cy; let target = Math.atan2(p.cy - my, p.cx - mx);
  if (seen) { e.hasSeen = true; e.alert = 3; }
  if (e.alert > 0) e.aimA = U.lerpAngle(e.aimA, target, Math.min(1, dt * (d.track || 4)));
  else e.aimA = e.mount === 'ceil' ? Math.PI / 2 + Math.sin(e.t * 0.8) * 0.6 : (e.mount === 'floor' ? -Math.PI / 2 + Math.sin(e.t * 0.8) * 0.7 : (e.mountDir > 0 ? Math.sin(e.t) * 0.5 : Math.PI + Math.sin(e.t) * 0.5));
  if (e.state === 'idle' && e.alert > 0 && seen && e.cool <= 0) { e.state = 'aim'; e.atkT = 0; CD.audio.play('robot_alert'); }
  if (e.state === 'aim') { e.atkT += dt; if (e.atkT > (d.aimT || 0.45)) { e.state = 'fire'; e.burst = d.burst || 4; e.shotT = 0; } }
  if (e.state === 'fire') { e.shotT -= dt; if (e.shotT <= 0 && e.burst > 0) { e.burst--; e.shotT = d.burstGap || 0.14; const ox = mx + Math.cos(e.aimA) * 24, oy = my + Math.sin(e.aimA) * 24; e.fireAt(ox, oy, d.bulletSpeed || 820, { dmg: d.dmg || 9, spread: 0.035, lead: 0.2, p: { pk: d.pk || 'bullet', col: d.col, life: 1.6, knock: 140 } }); e.recoil = 4; G.fx.glowFlash(ox, oy, 46, d.pk === 'laser' ? '255,90,70' : '255,210,140', 0.06); CD.audio.play(d.sfx || 'assault'); } if (e.burst <= 0) { e.state = 'idle'; e.cool = d.cd || 1.5; } }
  if (e.recoil > 0) e.recoil = Math.max(0, e.recoil - 40 * dt);
  if (!seen && e.alert <= 0) e.state = 'idle';
};

// Burrowing mole rat: hides underground until the player comes close
AI.burrower = function (e, dt, d) {
  const p = G.player;
  if (e.state === 'hidden') { e.stop(dt); if (Math.abs(p.cx - e.cx) < 150 && Math.abs(p.cy - e.cy) < 100) { e.state = 'emerge'; e.stateT = 0.5; e.sleeping = false; e.hittable = true; CD.audio.play('growl'); G.fx.dust(e.cx, e.bottom, 8, 0); G.fx.debris(e.cx, e.bottom - 4, 6, '104,84,60', 200); } return; }
  if (e.state === 'emerge') { e.stateT -= dt; e.vy = e.stateT > 0.25 ? -180 : e.vy; if (e.stateT <= 0) { e.state = 'chase'; e.alert = 6; e.hasSeen = true; } CD.moveActor(e, dt, { gravity: 1800 }); return; }
  AI.brawler(e, dt, d);
};

// ------------------------------------------------------------------ roster
E.radroach = { w: 34, h: 18, hitPad: 22, hp: 16, xp: 6, caps: [0, 4], speed: 60, chase: 150, contact: 9, aggro: 300, ai: 'brawler', art: 'radroach', blood: '150,170,50', kb: 1.6, range: 0, jumper: true, jump: 520, head: false, stride: 0.16, alertSfx: 'screech',
  leap: { min: 60, max: 200, vy: 380, vx: 300, cool: 1.8 }, corpseRot: 3.14 };
E.bloatfly = { w: 26, h: 20, fly: true, hp: 10, xp: 8, caps: [0, 3], speed: 40, chase: 110, aggro: 480, ai: 'flyer', art: 'bloatfly', blood: '160,190,60', dmg: 9, cd: 2.2, pk: 'spit', col: '150,220,60', sfx: 'squelch', buzz: true, orbit: 230, height: 120, head: false, kb: 1.8, rad: 4, corpseRot: 2.4 };
E.ghoul = { w: 24, h: 64, outfit: 'ghoul', hp: 44, xp: 14, caps: [2, 8], speed: 55, chase: 185, aggro: 420, ai: 'brawler', range: 44, reach: 54, windup: 0.3, strike: 0.14, recover: 0.4, dmg: 14, cd: 0.9, claws: true, swingKind: 'punch', jumper: true, jump: 720, blood: '90,110,50', alertSfx: 'growl', rad: 4, stride: 0.09, leap: { min: 90, max: 240, vy: 420, vx: 340, cool: 2.2, sfx: 'growl' }, knock: 320 };
E.raider = { w: 24, h: 64, outfit: 'raider', hp: 48, xp: 16, caps: [4, 14], speed: 55, chase: 105, aggro: 560, ai: 'shooter', ranged: true, weapon: 'pipepistol', keep: 300, burst: 2, burstGap: 0.16, aimT: 0.5, cd: 1.5, dmg: 9, bulletSpeed: 880, spread: 0.06, sfx: 'pipe', jumper: true, blood: '140,20,18', alertSfx: 'robot_alert' };
E.raider_rifle = Object.assign({}, E.raider, { weapon: 'hunting_rifle', keep: 420, burst: 1, aimT: 0.7, dmg: 17, cd: 2.2, bulletSpeed: 1300, spread: 0.02, sfx: 'rifle', hp: 44, twoHand: 13 });
E.raider_smg = Object.assign({}, E.raider, { weapon: 'assault_rifle', keep: 260, burst: 4, burstGap: 0.1, aimT: 0.4, dmg: 7, cd: 1.7, sfx: 'assault', twoHand: 12 });
E.brute = { w: 28, h: 74, scale: 1.15, outfit: 'brute', hp: 130, xp: 32, caps: [8, 24], speed: 50, chase: 118, aggro: 400, ai: 'brawler', range: 54, reach: 70, windup: 0.5, strike: 0.16, recover: 0.6, dmg: 26, cd: 1.3, weapon: 'bat', blood: '140,20,18', big: true, superArmor: false, knock: 420, kb: 0.5, alertSfx: 'growl', stride: 0.06, shockwave: false, windupSfx: 'swing_heavy' };
E.mutant = { w: 34, h: 90, scale: 1.3, outfit: 'mutant', hp: 210, xp: 54, caps: [12, 40], speed: 46, chase: 108, aggro: 460, ai: 'brawler', range: 62, reach: 84, windup: 0.62, strike: 0.18, recover: 0.7, dmg: 34, cd: 1.5, weapon: 'sledge', blood: '90,120,50', big: true, knock: 480, kb: 0.3, alertSfx: 'growl', stride: 0.05, shockwave: true, windupSfx: 'swing_heavy', head: true, headFrac: 0.2 };
E.protectron = { w: 30, h: 72, scale: 1.05, outfit: 'robot', hp: 105, xp: 26, caps: [6, 18], armor: 2, speed: 40, chase: 70, aggro: 560, ai: 'shooter', ranged: true, keep: 340, burst: 3, burstGap: 0.18, aimT: 0.6, cd: 2, dmg: 10, pk: 'laser', col: '255,70,50', bulletSpeed: 760, sfx: 'laser', robot: true, metal: true, blood: null, alertSfx: 'robot_alert', stride: 0.05, kb: 0.5, weapon: null, ranged2: true, art: 'protectron', head: false, wreck: true, stun: 0.06 };
E.eyebot = { w: 30, h: 30, fly: true, hp: 38, xp: 15, caps: [3, 10], armor: 1, speed: 60, chase: 130, aggro: 520, ai: 'flyer', art: 'eyebot', robot: true, metal: true, dmg: 8, cd: 1.7, burst: 2, pk: 'laser', col: '255,80,60', sfx: 'laser', bulletSpeed: 700, orbit: 240, height: 100, alertSfx: 'robot_alert', head: false, kb: 1.2, stun: 0.08, corpseRot: 1.2, light: { r: 90, c: [0.4, 0.8, 1], i: 0.35 } };
E.turret = { w: 34, h: 30, hp: 70, xp: 20, caps: [4, 12], armor: 3, aggro: 560, ai: 'turret', art: 'turret', robot: true, metal: true, burst: 4, burstGap: 0.13, aimT: 0.5, cd: 1.6, dmg: 9, pk: 'bullet', sfx: 'assault', track: 5, head: false, noKnock: true, shadow: false, stun: 0, noCorpse: false, wreck: false };
E.molerat = { w: 38, h: 22, hitPad: 20, hp: 26, xp: 9, caps: [0, 4], speed: 70, chase: 175, contact: 12, aggro: 320, ai: 'burrower', art: 'molerat', blood: '110,70,50', jumper: true, jump: 560, kb: 1.2, head: false, stride: 0.13, state0: 'hidden', burrow: true, corpseRot: 3.14, alertSfx: 'growl', init(e) { e.state = 'hidden'; e.hittable = false; e.sleeping = false; } };
E.scorpion = { w: 56, h: 30, hitPad: 14, hp: 70, xp: 22, caps: [4, 12], armor: 2, speed: 50, chase: 105, contact: 12, aggro: 480, ai: 'brawler', art: 'scorpion', range: 70, reach: 90, windup: 0.4, strike: 0.14, recover: 0.5, dmg: 18, cd: 1.4, rad: 5, blood: '180,190,70', kb: 0.6, head: false, stride: 0.1, alertSfx: 'screech', corpseRot: 3.14 };
E.mirelurk = { w: 50, h: 40, hp: 100, xp: 30, caps: [6, 18], armor: 2, speed: 45, chase: 92, contact: 10, aggro: 420, ai: 'brawler', art: 'mirelurk', range: 60, reach: 76, windup: 0.5, strike: 0.15, recover: 0.6, dmg: 22, cd: 1.6, blood: '150,180,90', kb: 0.4, head: false, stride: 0.09, alertSfx: 'screech', corpseRot: 3.14, shielded: true,
  init(e) { e.shielded = function (proj) { const front = Math.sign(proj.vx) === -e.face && (e.state !== 'attack'); return front && proj.y > e.y + 4; }; } };
E.handy = { melee: { range: 92, windup: 0.5, strike: 0.36, dmg: 16, cd: 1.7 }, w: 46, h: 54, fly: true, hp: 130, xp: 40, caps: [10, 30], armor: 2, speed: 50, chase: 100, aggro: 520, ai: 'flyer', art: 'handy', robot: true, metal: true, dmg: 10, cd: 1.4, burst: 3, pk: 'fire', col: '255,140,50', sfx: 'assault', bulletSpeed: 520, orbit: 180, height: 60, alertSfx: 'robot_alert', head: false, kb: 0.4, stun: 0.05, big: true, light: { r: 120, c: [1, 0.6, 0.3], i: 0.25 }, corpseRot: 0.6 };
E.glowing = { w: 26, h: 68, scale: 1.05, outfit: 'glowing', hp: 96, xp: 34, caps: [8, 20], speed: 50, chase: 150, aggro: 460, ai: 'brawler', range: 46, reach: 56, windup: 0.3, strike: 0.14, recover: 0.4, dmg: 15, cd: 0.9, claws: true, swingKind: 'punch', jumper: true, jump: 700, blood: '150,210,90', alertSfx: 'growl', rad: 10, stride: 0.08, glow: 'rgb(140,255,90)', light: { r: 200, c: [0.5, 1, 0.3], i: 0.7, f: 0.1 }, big: false,
  onHurt(e) { }, leap: { min: 100, max: 240, vy: 420, vx: 340, cool: 2.4 }, knock: 300 };

// ------------------------------------------------------------------ spawners
function register(type) {
  const def = E[type];
  CD.spawners[type] = function (s) {
    if (G.st && (s.once || def.once) && G.st.flags['killed:' + s.key]) return null;
    const e = new Enemy(s, def, type);
    if (type === 'turret') {   // mount orientation from surroundings
      const w = G.world, tx = s.tx, ty = s.ty;
      if (w.isSolid(tx, ty - 1)) { e.mount = 'ceil'; e.y = ty * T + 2; e.aimA = Math.PI / 2; }
      else if (w.isSolid(tx, ty + 1)) { e.mount = 'floor'; e.y = (ty + 1) * T - e.h; e.aimA = -Math.PI / 2; }
      else if (w.isSolid(tx - 1, ty)) { e.mount = 'wall'; e.mountDir = 1; e.x = tx * T + 2; e.y = ty * T + (T - e.h) / 2; e.aimA = 0; }
      else { e.mount = 'wall'; e.mountDir = -1; e.x = (tx + 1) * T - e.w - 2; e.y = ty * T + (T - e.h) / 2; e.aimA = Math.PI; }
    }
    return e;
  };
}
for (const t in E) register(t);
CD.registerEnemy = function (type, def) { E[type] = def; register(type); };
CD.enemyDiff = DIFF; CD.AI = AI;

})();
