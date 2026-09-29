// Entity base, tile physics, projectiles, pickups, damage helpers.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T, TILE = CD.TILE;
const G = (CD.G = CD.G || {});
CD.spawners = {};     // type -> function(spec) => entity
CD.ENEMIES = CD.ENEMIES || {};

// ------------------------------------------------------------------ base
class Entity {
  constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; this.vx = 0; this.vy = 0; this.dead = false; this.z = 0; this.awake = true; this.t = 0; this.kind = 'entity'; }
  get cx() { return this.x + this.w / 2; } get cy() { return this.y + this.h / 2; }
  get bottom() { return this.y + this.h; }
  update(dt) { this.t += dt; }
  draw(ctx) {}
  light(L) {}
}
CD.Entity = Entity;

// ------------------------------------------------------------------ tile physics
// Moves e by its velocity with tile collisions. Returns flags. opts: {gravity, maxFall, drop (ignore one-way platforms), noWorld}
CD.moveActor = function (e, dt, opts) {
  opts = opts || {};
  const w = G.world;
  const flags = { left: false, right: false, up: false, down: false };
  if (opts.gravity) { e.vy += opts.gravity * dt; const mf = opts.maxFall || 1100; if (e.vy > mf) e.vy = mf; }
  // ---- horizontal
  let dx = e.vx * dt;
  if (dx !== 0) {
    e.x += dx;
    const y0 = Math.floor((e.y + 0.5) / T), y1 = Math.floor((e.y + e.h - 0.5) / T);
    if (dx > 0) { const tx = Math.floor((e.x + e.w) / T); for (let ty = y0; ty <= y1; ty++) if (w.isSolid(tx, ty)) { e.x = tx * T - e.w - 0.001; e.vx = 0; flags.right = true; break; } }
    else { const tx = Math.floor(e.x / T); for (let ty = y0; ty <= y1; ty++) if (w.isSolid(tx, ty)) { e.x = (tx + 1) * T + 0.001; e.vx = 0; flags.left = true; break; } }
  }
  // ---- vertical
  const prevBottom = e.y + e.h;
  let dy = e.vy * dt;
  e.y += dy;
  const x0 = Math.floor((e.x + 0.5) / T), x1 = Math.floor((e.x + e.w - 0.5) / T);
  if (e.vy >= 0) {
    // moving platforms first: an elevator parked on the pit floor has the floor tile under it too, and must still carry whoever stands on it
    if (!opts.drop && G.platforms) {
      for (const p of G.platforms) {
        const ad = Math.abs(p.dy || 0), fb = e.y + e.h;
        if (e.x + e.w > p.x + 1 && e.x < p.x + p.w - 1 && prevBottom <= p.y + 4 + ad && fb >= p.y - 2 - Math.max(0, p.dy || 0) && fb <= p.y + 10 + ad) { e.y = p.y - e.h; e.vy = 0; flags.down = true; e.platform = p; break; }
      }
    }
    if (!flags.down) {
      const ty = Math.floor((e.y + e.h) / T);
      for (let tx = x0; tx <= x1; tx++) {
        const t = w.tile(tx, ty);
        if (CD.isSolidTile(t) || (t === TILE.PLAT && !opts.drop && prevBottom <= ty * T + 1.5 && e.vy >= 0)) { e.y = ty * T - e.h; e.vy = 0; flags.down = true; break; }
      }
    }
  } else {
    const ty = Math.floor(e.y / T);
    for (let tx = x0; tx <= x1; tx++) if (w.isSolid(tx, ty)) { e.y = (ty + 1) * T + 0.001; e.vy = 0; flags.up = true; break; }
  }
  e.onGround = flags.down;
  return flags;
};
CD.groundBelow = function (e, d) {   // solid/platform within d px under the feet
  const w = G.world, y = e.y + e.h + (d || 2), x0 = Math.floor((e.x + 1) / T), x1 = Math.floor((e.x + e.w - 1) / T), ty = Math.floor(y / T);
  for (let tx = x0; tx <= x1; tx++) { const t = w.tile(tx, ty); if (CD.isSolidTile(t) || (t === TILE.PLAT && e.y + e.h <= ty * T + 2)) return true; }
  if (G.platforms) for (const p of G.platforms) if (e.x + e.w > p.x && e.x < p.x + p.w && Math.abs(e.y + e.h - p.y) < (d || 2) + 2) return true;
  return false;
};
CD.tileAt = (px, py) => G.world.tile(Math.floor(px / T), Math.floor(py / T));

// ------------------------------------------------------------------ damage helpers
// Hit an enemy-like entity. opts: {x,y,kind,crit,knock,src,pierce}
G.damageEnemy = function (e, dmg, opts) {
  opts = opts || {};
  if (e.dead || e.invuln > 0 && !opts.ignoreInvuln) return false;
  const st = G.st;
  let d = dmg;
  if (opts.crit) d *= (opts.critMul || 1.8) * (1 + (G.perk('sniper') ? 0.15 : 0));
  d *= G.damageMul(opts);
  if (e.vulnMul) d *= e.vulnMul;
  if (e.armor) d = Math.max(1, d - e.armor);
  d = Math.max(1, Math.round(d));
  e.hp -= d; e.flash = 0.09;
  if (e.onHit) e.onHit(d, opts);
  G.fx.text(e.cx, e.y - 6, opts.crit ? d + '!' : d, opts.crit ? '#ffd24a' : (e.robot ? '#9fe8ff' : '#fff'), opts.crit ? 18 : 14);
  const hx = opts.x !== undefined ? opts.x : e.cx, hy = opts.y !== undefined ? opts.y : e.cy;
  if (e.robot || e.metal) { G.fx.spark(hx, hy, 6, -(opts.dx || 0), -(opts.dy || 0.5), 1.6, 300, '255,220,150'); CD.audio.play('hit_metal'); }
  else { G.fx.blood(hx, hy, opts.crit ? 9 : 5, opts.dx || 0, opts.dy || 0, e.bloodCol); CD.audio.play('hit_flesh'); }
  if (opts.knock && !e.noKnock) { e.vx += (opts.dx > 0 ? 1 : -1) * opts.knock * (e.kbMul || 1); if (e.onGround) e.vy -= opts.knock * 0.18 * (e.kbMul || 1); }
  G.hitstop = Math.max(G.hitstop || 0, opts.crit ? 0.06 : (opts.heavy ? 0.05 : 0.02));
  if (opts.crit) { G.fx.shake(3, 0.12); G.critCharge = Math.min(100, (G.critCharge || 0) + 8); }
  if (e.hp <= 0) { G.killEnemy(e, opts); }
  return true;
};
G.killEnemy = function (e, opts) {
  if (e.dead) return; e.dead = true; e.hp = 0;
  const st = G.st;
  st.kills = (st.kills || 0) + 1;
  G.addXP(e.xp || 5);
  if (e.onDeath) e.onDeath(opts);
  if (e.key && e.once) st.flags['killed:' + e.key] = 1;
  G.drops(e);
  if (G.perk('grim')) { st.ap = Math.min(G.maxAP(), st.ap + 15); }
  CD.audio.play(e.robot ? 'robot_die' : 'die');
  G.fx.shake(e.big ? 6 : 2, 0.2);
  G.hitstop = Math.max(G.hitstop || 0, e.big ? 0.12 : 0.05);
};
G.drops = function (e) {
  const r = Math.random(), lk = 1 + G.special('L') * 0.04;
  const x = e.cx, y = e.cy;
  const caps = e.caps === undefined ? Math.round(2 + Math.random() * 6) : e.caps;
  if (caps > 0 && Math.random() < 0.7 * lk) G.spawnPickup('caps', x, y, { n: Math.round(caps * (1 + G.perk('capcollector') * 0.25)) });
  if (r < 0.14 * lk) G.spawnPickup('stimpak', x, y, {});
  else if (r < 0.34 * lk) { const at = G.ammoTypeForDrop(); if (at) G.spawnPickup('ammo', x, y, { type: at, n: G.ammoAmount(at) }); }
  else if (r < 0.40 * lk && G.st.rad > 5) G.spawnPickup('radaway', x, y, {});
  if (e.dropItems) for (const it of e.dropItems) G.spawnPickup(it.t, x, y, it);
};
G.addXP = function (n) {
  const st = G.st; n = Math.round(n * (1 + G.special('I') * 0.03)); st.xp += n;
  while (st.xp >= G.xpForLevel(st.level + 1) && st.level < 30) { st.level++; st.perkPoints++; G.st.maxHp += 5; st.hp = Math.min(G.maxHP(), st.hp + 25); G.notify('LEVEL UP!  ' + st.level, 'perk'); CD.audio.play('levelup'); G.fx.text(G.player.cx, G.player.y - 20, 'LEVEL UP', '#7dff9c', 18, 1.6); }
};
G.xpForLevel = (l) => Math.round(60 * Math.pow(l - 1, 1.55));

// Hurt the player. opts: {x (source x), knock, kind:'melee'|'bullet'|'blast'|'hazard'|'rad', rad}
G.hurtPlayer = function (dmg, opts) {
  const p = G.player; opts = opts || {};
  if (!p || p.dead || G.state !== 'play') return false;
  if (G.cheats && G.cheats.god) return false;      // ?god=1 (dev): nothing hurts
  if (p.invuln > 0 && !opts.ignoreInvuln) return false;
  if (p.dashInv > 0 && !opts.ignoreInvuln) return false;
  const st = G.st;
  let d = dmg * (opts.kind === 'hazard' ? 1 : 1) * (1 - Math.min(0.6, (st.dr || 0) + G.perk('toughness') * 0.05 + (G.buff('medx') ? 0.35 : 0)));
  d = Math.max(1, Math.round(d));
  st.hp -= d; p.invuln = opts.kind === 'hazard' ? 0.7 : 1.0; p.hurtT = 0.4; p.flashT = 0.12;
  const dir = opts.x !== undefined ? (p.cx > opts.x ? 1 : -1) : -p.face;
  if (opts.knock !== 0) { p.vx = dir * (opts.knock || 260); p.vy = -280; p.knockT = 0.16; p.dashT = 0; p.climbing = false; }
  G.fx.text(p.cx, p.y - 4, '-' + d, '#ff5a4a', 16);
  G.fx.blood(p.cx, p.cy - 6, 8, dir, -0.3, '150,16,14');
  G.fx.shake(6, 0.25); G.fx.flash('#ff2010', 0.22); G.hurtVig = 0.6; G.hitstop = Math.max(G.hitstop || 0, 0.06);
  CD.audio.play('hurt');
  if (opts.rad) G.addRad(opts.rad);
  if (st.hp <= 0) G.killPlayer(opts);
  return true;
};
G.killPlayer = function () {
  const p = G.player; if (p.dead) return;
  p.dead = true; p.deadT = 0; G.st.hp = 0; G.st.deaths = (G.st.deaths || 0) + 1;
  G.fx.blood(p.cx, p.cy, 24, 0, -1, '150,16,14'); G.fx.shake(10, 0.5); CD.audio.play('player_die'); CD.audio.duck && CD.audio.duck(1.2);
  G.timeScale = 0.35;
  setTimeout(() => { if (G.state === 'play') G.setState('dead'); G.timeScale = 1; }, 900);
};
G.addRad = function (n) {
  const st = G.st; if (G.hasAbility('hazmat')) n *= 0.1; if (G.buff('radx')) n *= 0.2;
  n *= 1 - G.special('E') * 0.03 - G.perk('radres') * 0.08;
  if (G.cheats && G.cheats.god) return;
  st.rad = U.clamp(st.rad + n, 0, 100);
  if (st.rad >= 100) { G.hurtPlayer(9999, { kind: 'rad', knock: 0, ignoreInvuln: true }); }
};
G.heal = function (n) { const st = G.st; const m = G.maxHP(); if (st.hp >= m) return 0; const h = Math.min(n, m - st.hp); st.hp += h; G.fx.text(G.player.cx, G.player.y - 8, '+' + Math.round(h), '#5dff8a', 15); return h; };

// ------------------------------------------------------------------ projectiles
class Projectile extends Entity {
  constructor(o) {
    super(o.x, o.y, 4, 4);
    this.kind = 'proj'; this.pk = o.pk || 'bullet'; this.vx = o.vx; this.vy = o.vy; this.dmg = o.dmg || 10; this.owner = o.owner || 'player'; this.life = o.life || 1.2;
    this.g = o.g || 0; this.pierce = o.pierce || 0; this.r = o.r || 3; this.blast = o.blast || 0; this.knock = o.knock || 0; this.col = o.col || '255,225,150'; this.trail = o.trail || 0;
    this.breaker = !!o.breaker; this.bounce = o.bounce || 0; this.fuse = o.fuse || 0; this.hit = new Set(); this.rad = o.rad || 0; this.crit = o.crit; this.critMul = o.critMul; this.seek = o.seek || 0; this.weapon = o.weapon; this.headshot = o.headshot;
    this.ang = Math.atan2(this.vy, this.vx); this.z = 5; this.fire = o.fire || 0; this.len = o.len || 14; this.heavy = o.heavy; this.lightCol = o.lightCol;
    this.spinning = o.spin || 0; this.rot = 0; this.tx = o.tx; this.ty = o.ty; this.cb = o.cb;
  }
  update(dt) {
    this.life -= dt; if (this.life <= 0) { if (this.pk === 'grenade' || this.fuse) this.explode(); this.dead = true; return; }
    if (this.g) this.vy += this.g * dt;
    if (this.seek && G.player && this.owner !== 'player') { const a = Math.atan2(G.player.cy - this.y, G.player.cx - this.x), cur = Math.atan2(this.vy, this.vx), na = cur + U.clamp(U.angleDiff(cur, a), -this.seek * dt, this.seek * dt), sp = Math.hypot(this.vx, this.vy); this.vx = Math.cos(na) * sp; this.vy = Math.sin(na) * sp; }
    const sp = Math.hypot(this.vx, this.vy), n = Math.max(1, Math.ceil(sp * dt / 7)), sx = this.vx * dt / n, sy = this.vy * dt / n;
    const w = G.world;
    for (let i = 0; i < n; i++) {
      this.x += sx; this.y += sy;
      const tx = Math.floor(this.x / T), ty = Math.floor(this.y / T), t = w.tile(tx, ty);
      if (CD.isSolidTile(t)) {
        if (this.bounce) { // grenade-style bounce
          const px = this.x - sx, py = this.y - sy; const hx = w.isSolid(Math.floor(this.x / T), Math.floor(py / T)), hy = w.isSolid(Math.floor(px / T), Math.floor(this.y / T));
          if (hx) { this.vx *= -this.bounce; this.x = px; } if (hy) { this.vy *= -this.bounce; this.y = py; this.vx *= 0.8; } if (!hx && !hy) { this.vx *= -this.bounce; this.vy *= -this.bounce; this.x = px; this.y = py; }
          if (Math.abs(this.vy) < 30) this.vy = 0; CD.audio.play('bounce'); break;
        }
        if (t === TILE.BREAK && (this.breaker || this.blast)) G.breakTile(tx, ty);
        this.impact(null, true); return;
      }
      // entity hits
      if (this.owner === 'player') {
        for (const e of G.hurtables) {
          if (e.dead || !e.hittable || this.hit.has(e) || !e.awake) continue;
          if (this.x > e.x - this.r && this.x < e.x + e.w + this.r && this.y > e.y - (e.hitPad || 0) - this.r && this.y < e.y + e.h + this.r) {
            if (e.shielded && e.shielded(this)) { G.fx.spark(this.x, this.y, 5, -sx, -sy, 1.2, 260, '200,230,255'); CD.audio.play('ricochet'); this.dead = true; return; }
            const crit = this.crit === undefined ? (this.y < e.y + e.h * (e.headFrac || 0.28) && e.head !== false && (this.pk === 'bullet' || this.pk === 'laser')) : this.crit;
            this.hit.add(e);
            G.damageEnemy(e, this.dmg, { x: this.x, y: this.y, dx: Math.sign(this.vx) || 1, dy: this.vy / (sp || 1), kind: this.pk, crit, knock: this.knock, heavy: this.heavy, breaker: this.breaker, critMul: this.critMul });
            if (this.cb) this.cb(e);
            if (this.fire && e.ignite) e.ignite(this.fire);
            if (this.pierce-- <= 0) { this.impact(e, false); return; }
          }
        }
      } else {
        const p = G.player;
        if (p && !p.dead && this.x > p.x - this.r && this.x < p.x + p.w + this.r && this.y > p.y - this.r && this.y < p.y + p.h + this.r) {
          if (p.dashInv > 0 || p.invuln > 0) { /* passes through */ }
          else { G.hurtPlayer(this.dmg, { x: this.x - this.vx * 0.05, knock: this.knock || 180, kind: 'bullet', rad: this.rad }); this.impact(p, false); return; }
        }
      }
    }
    this.ang = Math.atan2(this.vy, this.vx);
    if (this.spinning) this.rot += this.spinning * dt;
    if (this.trail && Math.random() < 0.7) G.fx.add({ t: 'smoke', x: this.x, y: this.y, vx: 0, vy: -8, life: 0.5, max: 0.5, col: '90,86,80', size: 4, grow: 14, a: 0.35 });
    if (this.pk === 'grenade') this.fuse -= dt, this.fuse <= 0 && (this.explode(), this.dead = true);
  }
  impact(e, wall) {
    this.dead = true;
    if (this.blast) { this.explode(); return; }
    if (this.pk === 'plasma') { G.fx.glowFlash(this.x, this.y, 60, '120,255,190', 0.2); G.fx.spark(this.x, this.y, 8, -this.vx, -this.vy, 2, 220, '150,255,200'); CD.audio.play('plasma_hit'); }
    else if (this.pk === 'laser') { G.fx.glowFlash(this.x, this.y, 46, '255,90,60', 0.14); G.fx.spark(this.x, this.y, 5, -this.vx, -this.vy, 2, 200, '255,130,90'); }
    else if (wall) { G.fx.spark(this.x, this.y, 4, -this.vx, -this.vy, 1.5, 260); G.fx.add({ t: 'smoke', x: this.x, y: this.y, vx: 0, vy: -10, life: 0.4, max: 0.4, col: '150,140,120', size: 3, grow: 10, a: 0.3 }); if (Math.random() < 0.5) CD.audio.play('impact_wall'); }
  }
  explode() { this.dead = true; G.explode(this.x, this.y, this.blast || 90, this.dmg, { owner: this.owner, breaker: true, knock: this.knock || 420 }); }
  draw(ctx) {
    const a = this.ang;
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(a);
    switch (this.pk) {
      case 'bullet': { ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createLinearGradient(-this.len, 0, 0, 0); gr.addColorStop(0, 'rgba(255,200,120,0)'); gr.addColorStop(1, 'rgba(' + this.col + ',0.95)'); ctx.fillStyle = gr; ctx.fillRect(-this.len, -1, this.len, 2); ctx.fillStyle = '#fff'; ctx.fillRect(-2, -1, 3, 2); break; }
      case 'laser': { ctx.globalCompositeOperation = 'lighter'; const c = this.col; ctx.fillStyle = 'rgba(' + c + ',0.25)'; ctx.fillRect(-16, -3.5, 22, 7); ctx.fillStyle = 'rgba(' + c + ',0.85)'; ctx.fillRect(-13, -1.4, 18, 2.8); ctx.fillStyle = '#fff'; ctx.fillRect(-9, -0.8, 13, 1.6); break; }
      case 'plasma': { ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 12); gr.addColorStop(0, 'rgba(230,255,240,1)'); gr.addColorStop(0.35, 'rgba(90,255,170,0.85)'); gr.addColorStop(1, 'rgba(20,160,90,0)'); ctx.fillStyle = gr; ctx.fillRect(-12, -12, 24, 24); break; }
      case 'spit': { ctx.fillStyle = 'rgba(' + this.col + ',0.95)'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.4, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-2, -2, 2, 1.4); break; }
      case 'rocket': { ctx.fillStyle = '#7a7d76'; ctx.fillRect(-9, -2.4, 16, 4.8); ctx.fillStyle = '#c8452c'; ctx.beginPath(); ctx.moveTo(7, -2.4); ctx.lineTo(12, 0); ctx.lineTo(7, 2.4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-9, -2.4, 16, 1); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(-10, 0, 0, -10, 0, 10); gr.addColorStop(0, 'rgba(255,240,160,0.95)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = gr; ctx.fillRect(-20, -10, 20, 20); break; }
      case 'grenade': { ctx.rotate(-a + this.rot); ctx.fillStyle = '#4a5240'; ctx.beginPath(); ctx.ellipse(0, 0, 4.4, 5.4, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-2.6, -3.6, 2, 3); ctx.fillStyle = '#20241c'; ctx.fillRect(-1.6, -7, 3.2, 2.4); if (Math.floor(this.fuse * 10) % 2 === 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,60,40,0.9)'; ctx.beginPath(); ctx.arc(0, -8, 1.6, 0, 7); ctx.fill(); } break; }
      case 'fire': { ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 14); gr.addColorStop(0, 'rgba(255,240,180,0.9)'); gr.addColorStop(0.5, 'rgba(255,130,40,0.6)'); gr.addColorStop(1, 'rgba(160,30,0,0)'); ctx.fillStyle = gr; ctx.fillRect(-14, -14, 28, 28); break; }
      case 'saw': { ctx.rotate(-a + this.rot); ctx.fillStyle = '#b8bcc0'; ctx.beginPath(); for (let i = 0; i < 12; i++) { const ang = i * Math.PI / 6, rr = i % 2 ? 6 : 10; ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } ctx.closePath(); ctx.fill(); ctx.fillStyle = '#50565c'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill(); break; }
      case 'rock': { ctx.rotate(-a + this.rot); ctx.fillStyle = '#6e6252'; ctx.beginPath(); for (let i = 0; i < 9; i++) { const ang = i * Math.PI * 2 / 9, rr = 9 + ((i * 7) % 4); ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,240,210,0.25)'; ctx.fillRect(-5, -7, 6, 3); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(1, 1, 7, 5); break; }
      case 'shock': { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(120,220,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); for (let i = 1; i < 6; i++) ctx.lineTo(-10 + i * 4, (Math.random() - 0.5) * 8); ctx.stroke(); break; }
      default: ctx.fillStyle = '#fff'; ctx.fillRect(-2, -2, 4, 4);
    }
    ctx.restore();
  }
  light(L) {
    if (this.pk === 'laser') L.add({ x: this.x, y: this.y, r: 90, color: [1, 0.3, 0.2], i: 0.7, shadow: false });
    else if (this.pk === 'plasma') L.add({ x: this.x, y: this.y, r: 130, color: [0.35, 1, 0.65], i: 0.9, shadow: false });
    else if (this.pk === 'rocket' || this.pk === 'fire') L.add({ x: this.x, y: this.y, r: 130, color: [1, 0.6, 0.25], i: 0.9, shadow: false });
    else if (this.pk === 'bullet') L.add({ x: this.x, y: this.y, r: 46, color: [1, 0.85, 0.5], i: 0.35, shadow: false });
    else if (this.pk === 'shock') L.add({ x: this.x, y: this.y, r: 100, color: [0.4, 0.8, 1], i: 0.8, shadow: false });
    else if (this.lightCol) L.add({ x: this.x, y: this.y, r: 80, color: this.lightCol, i: 0.6, shadow: false });
  }
}
CD.Projectile = Projectile;
G.shoot = function (o) { const p = new Projectile(o); G.projectiles.push(p); return p; };

G.explode = function (x, y, r, dmg, o) {
  o = o || {};
  G.fx.explosion(x, y, r); CD.audio.play('explosion');
  const rr = r * r;
  for (const e of G.hurtables) {
    if (e.dead || !e.hittable) continue;
    const dx = e.cx - x, dy = e.cy - y, d2 = dx * dx + dy * dy;
    if (d2 < (rr + e.w * e.w)) { const f = 1 - Math.sqrt(d2) / (r + e.w); if (o.owner === 'player' || o.owner === 'any') G.damageEnemy(e, dmg * Math.max(0.3, f), { x, y, dx: Math.sign(dx) || 1, dy: -0.5, knock: o.knock || 380, kind: 'blast', heavy: true, ignoreInvuln: true }); }
  }
  const p = G.player;
  if (p && !p.dead) { const dx = p.cx - x, dy = p.cy - y, d = Math.hypot(dx, dy); if (d < r + 10) { const f = 1 - d / (r + 10); if (o.owner !== 'player' || true) { const mult = o.owner === 'player' ? 0.5 : 1; G.hurtPlayer(Math.max(4, dmg * f * mult), { x, kind: 'blast', knock: 360 }); } } }
  if (o.breaker) { const tr = Math.ceil(r / T); for (let ty = Math.floor(y / T) - tr; ty <= Math.floor(y / T) + tr; ty++) for (let tx = Math.floor(x / T) - tr; tx <= Math.floor(x / T) + tr; tx++) { if (G.world.tile(tx, ty) === TILE.BREAK && Math.hypot((tx + 0.5) * T - x, (ty + 0.5) * T - y) < r + 24) G.breakTile(tx, ty); } }
  for (const c of G.props) if (c.onBlast) c.onBlast(x, y, r);
};
G.breakTile = function (tx, ty) {
  if (G.world.tile(tx, ty) !== TILE.BREAK) return;
  const m = G.world.mat(tx, ty);
  G.world.setTile(tx, ty, TILE.AIR);
  G.fx.debris((tx + 0.5) * T, (ty + 0.5) * T, 14, '116,104,92', 320); G.fx.smoke((tx + 0.5) * T, (ty + 0.5) * T, 5, '120,110,100', 14, 20); G.fx.shake(4, 0.2);
  CD.audio.play('wall_break'); G.st.flags['broke:' + tx + ',' + ty] = 1; void m;
};

// ------------------------------------------------------------------ pickups
class Pickup extends Entity {
  constructor(x, y, o) {
    super(x - 8, y - 8, 16, 16); this.kind = 'pickup'; this.k = o.k; this.o = o; this.z = 3; this.key = o.key; this.magnet = 0; this.bob = Math.random() * 6; this.life = o.life || 0;
    this.vx = o.vx || 0; this.vy = o.vy || 0; this.grounded = !!o.static; this.n = o.n || 1; this.delay = o.delay || 0;
    this.big = o.k === 'ability' || o.k === 'bobble' || o.k === 'upgrade' || o.k === 'key' || o.k === 'weapon';
    if (this.big) { this.w = 26; this.h = 26; this.x = x - 13; this.y = y - 13; }
  }
  update(dt) {
    this.t += dt; if (this.delay > 0) this.delay -= dt;
    if (this.o.requires) { this.hidden = !G.st.flags[this.o.requires]; if (this.hidden) return; }
    if (this.life) { this.life -= dt; if (this.life <= 0) this.dead = true; }
    if (!this.grounded) { CD.moveActor(this, dt, { gravity: 1400 }); this.vx *= 0.98; if (this.onGround) { this.vx *= 0.5; if (Math.abs(this.vy) < 5) this.grounded = true; } }
    const p = G.player; if (!p || p.dead) return;
    const dx = p.cx - this.cx, dy = p.cy - this.cy, d = Math.hypot(dx, dy);
    const range = this.big ? 30 : (this.k === 'caps' || this.k === 'ammo' ? 44 : 30);
    if (!this.big && d < 96 && this.delay <= 0 && (this.k === 'caps' || this.k === 'ammo')) { this.grounded = false; this.vx += dx / d * 900 * dt; this.vy += dy / d * 900 * dt; this.x += dx / d * 120 * dt; this.y += dy / d * 120 * dt; }
    if (d < range && this.delay <= 0) { if (G.collect(this)) this.dead = true; }
  }
  draw(ctx) {
    if (this.hidden || (this.o.requires && !G.st.flags[this.o.requires])) return;
    const b = Math.sin(this.t * 3 + this.bob) * (this.big ? 3 : 1.4);
    const x = this.cx, y = this.cy + (this.grounded || this.big ? b : 0);
    CD.drawItemIcon(ctx, this.k, this.o, x, y, this.big ? 1.25 : 0.9, this.t);
  }
  light(L) { if (this.hidden || (this.o.requires && !G.st.flags[this.o.requires])) return; if (this.big) L.add({ x: this.cx, y: this.cy, r: 130, color: this.k === 'ability' ? [0.4, 1, 0.7] : [1, 0.9, 0.5], i: 0.85, shadow: false, glow: 40, glowA: 0.4 }); else if (this.k === 'caps') L.add({ x: this.cx, y: this.cy, r: 36, color: [1, 0.85, 0.4], i: 0.35, shadow: false }); }
}
CD.Pickup = Pickup;
G.spawnPickup = function (k, x, y, o) {
  o = Object.assign({ k }, o || {});
  if (!o.static && !o.big) { o.vx = (Math.random() - 0.5) * 220; o.vy = -200 - Math.random() * 120; o.life = o.life || (k === 'caps' ? 40 : 28); o.delay = 0.35; }
  const pk = new Pickup(x, y, o); G.ents.push(pk); return pk;
};

CD.spawn = function (spec) { const f = CD.spawners[spec.t]; if (!f) { if (window.console) console.warn('no spawner for', spec.t); return null; } return f(spec); };

})();
