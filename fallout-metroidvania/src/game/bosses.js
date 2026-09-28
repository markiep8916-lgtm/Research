// Boss framework (arena locking, intros, rewards) and boss AI scripts.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T, TILE = CD.TILE;
const G = (CD.G = CD.G || {});
const B = (CD.bosses = { gates: [], defs: {} });
CD.BOSSES = B.defs;

// ------------------------------------------------------------------ arena gates
class Gate extends CD.Entity {
  constructor(g) { super(g.tx * T, g.ty * T, g.w * T, g.h * T); this.kind = 'gate'; this.z = 5; this.always = true; this.openT = 0; this.closing = true; this.t = 0; }
  update(dt) { this.t += dt; this.openT = U.approach(this.openT, this.closing ? 0 : 1, dt * 1.6); if (!this.closing && this.openT >= 1) this.dead = true; }
  draw(ctx) {
    const x = this.x, y = this.y, w = this.w, h = this.h, lift = this.openT * (h - 4);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const gr = ctx.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#2a3036'); gr.addColorStop(0.5, '#6c7884'); gr.addColorStop(1, '#2a3036');
    ctx.fillStyle = gr; ctx.fillRect(x, y - lift, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < h / 8; i++) ctx.fillRect(x, y - lift + i * 8, w, 1.6);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < h / 8; i++) ctx.fillRect(x, y - lift + i * 8 + 1.6, w, 1);
    ctx.fillStyle = '#c9a51c'; ctx.fillRect(x, y - lift + h - 10, w, 6);
    ctx.restore();
    ctx.fillStyle = '#ff4a38'; ctx.shadowColor = '#ff4a38'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(x + w / 2, y - 6, 3, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  light(L) { if (this.closing) L.add({ x: this.cx, y: this.y - 6, r: 90, color: [1, 0.2, 0.15], i: 0.6, shadow: false }); }
}
B.lock = function (cells) {
  for (const c of cells) {
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { const tx = c.tx + x, ty = c.ty + y; if (G.world.tile(tx, ty) === TILE.AIR) G.world.tiles[ty * G.world.W + tx] = TILE.DOOR; }
    G.chunks.invalidateTile(c.tx, c.ty); const g = new Gate(c); g.cells = c; B.gates.push(g); G.ents.push(g);
  }
  CD.audio.play('door');
};
B.unlock = function () {
  for (const g of B.gates) { const c = g.cells; for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { const tx = c.tx + x, ty = c.ty + y; if (G.world.tile(tx, ty) === TILE.DOOR) G.world.tiles[ty * G.world.W + tx] = TILE.AIR; } G.chunks.invalidateTile(c.tx, c.ty); g.closing = false; }
  B.gates.length = 0; CD.audio.play('door');
};

// ------------------------------------------------------------------ start / defeat / reset
B.start = function (id) {
  const def = B.defs[id]; if (!def || G.boss || G.st.flags['boss_' + id]) return;
  const a = G.arenas[id] || def.arena();
  B.lock(a.gates);
  G.bossActive = true; CD.audio.setTrack('boss'); CD.audio.play('boss');
  G.banner({ title: def.title, sub: def.intro || 'BOSS', text: def.blurb || '', col: '#ff6a52', dur: 4.2 });
  const e = CD.spawn({ t: id, tx: a.spawn.tx, ty: a.spawn.ty, key: 'boss:' + id, once: true, diff: 1, room: (G.world.roomAtTile(a.spawn.tx, a.spawn.ty) || {}).idx });
  e.invuln = def.introT || 2.4; e.awake = true; e.always = true; G.ents.push(e); G.boss = e; e.bs = { mode: 'intro', t: 0, cool: 1.2, phase: 1, n: 0 };
  G.fx.shake(6, 0.6); G.fx.flash('#ff3018', 0.18);
};
B.defeat = function (id, e) {
  const def = B.defs[id]; G.st.flags['boss_' + id] = 1; B.unlock(); G.bossActive = false;
  G.fx.flash('#ffffff', 0.7); G.timeSlow = 0.4;
  for (let i = 0; i < 9; i++) CD.story.later(i * 0.22, () => { G.fx.explosion(e.cx + (Math.random() - 0.5) * e.w * 1.3, e.cy + (Math.random() - 0.5) * e.h * 1.1, 40 + Math.random() * 40); });
  CD.story.later(2.3, () => {
    if (G.room) CD.audio.setTrack(G.room.music);
    G.banner({ title: 'VICTORY', sub: def.title + ' DEFEATED', text: def.victory || '', col: '#7dff9c', dur: 4.6 });
    if (def.rewards) def.rewards(e);
    G.spawnPickup('caps', e.cx, e.cy, { n: def.capsReward || 120 }); for (let i = 0; i < 2; i++) G.spawnPickup('stimpak', e.cx, e.cy, {});
    G.st.perkPoints++; G.notify('+1 PERK POINT', 'perk'); G.autosave();
    G.boss = null;
  });
  if (def.onDefeat) CD.story.event(def.onDefeat);
};
B.reset = function () {
  if (!G.boss && !B.gates.length) return;
  if (G.boss && !G.boss.dead) { G.boss.dead = true; G.boss.noLoot = true; }
  G.ents = G.ents.filter((e) => !(e.kind === 'enemy' && e.spec && e.spec.summon));
  B.unlock(); G.boss = null; G.bossActive = false;
};
G.timeSlow = 0;

// helper for boss defs: register as an enemy type with a custom AI
B.define = function (id, def, ai) {
  def.ai = id; def.boss = true; def.noBar = true; def.superArmor = true; def.stun = 0; def.noKnock = true; def.once = true;
  CD.AI[id] = ai; B.defs[id] = def; CD.registerEnemy(id, def);
};
// tween a flying boss toward a point (centre-based); returns distance
function flyTo(e, dt, tx, ty, speed, k) {
  const dx = tx - e.cx, dy = ty - e.cy, d = Math.hypot(dx, dy) || 1; k = k || 4;
  const want = Math.min(speed, d * k);
  e.vx = U.approach(e.vx, dx / d * want, 1800 * dt); e.vy = U.approach(e.vy, dy / d * want, 1800 * dt);
  CD.AI._flyMove(e, dt, {}); return d;
}
B.flyTo = flyTo;
// wrapper that scales an existing art function about the entity centre
CD.scaledArt = function (name, k, baseW, baseH) {
  return function (ctx, e, Gm, flashOnly) {
    const fn = CD.art[name]; if (!fn) { ctx.fillStyle = '#933'; ctx.fillRect(e.x, e.y, e.w, e.h); return; }
    const fake = Object.assign({}, e, { x: e.cx - baseW / 2, y: e.cy - baseH / 2, w: baseW, h: baseH, scale: 1 });
    ctx.save(); ctx.translate(e.cx, e.cy); ctx.scale(k, k); ctx.translate(-e.cx, -e.cy); fn(ctx, fake, Gm, flashOnly); ctx.restore();
  };
};
B.hpMul = 1;

// ================================================================== BOSS 1: THE WARDEN (Mr. Gutsy)
B.define('warden', {
  w: 70, h: 78, fly: true, hp: 1300, xp: 320, armor: 3, robot: true, metal: true, big: true, art: 'warden', title: 'THE WARDEN', intro: 'VAULT 213 SECURITY  -  MR. GUTSY',
  blurb: 'Military-grade butler unit. Configured to protect the Vault door. Configured to disagree with you.', victory: 'Its saw arm sparks and dies. The exit is open. The Overseer sounds... disappointed.', capsReward: 160, introT: 2.6,
  light: { r: 200, c: [1, 0.55, 0.25], i: 0.5, f: 0.1 },
  grants: ['key:overseer'],
  arena() { return { spawn: { tx: 256, ty: 71 }, gates: [{ tx: 232, ty: 79, w: 2, h: 3 }] }; },
  rewards(e) { G.spawnPickup('key', e.cx, e.cy, { id: 'overseer', name: 'Overseer', col: '#ffb640', big: true, static: false, k: 'key' }); },
  onDefeat: { flag: 'boss_warden', setObjective: 1, say: [['OVERSEER', 'Structural damage to a Vault-Tec asset. Logged. Not billed. Yet.', 4], ['OVERSEER', 'Congratulations, Sleeper Seven. The Surface Lift is operational. Please do not take your time.', 5]] },
  drawExtra(e, ctx) {
    const a = e.bs; if (!a) return;
    if (a.tele) { const t = a.tele; ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(G.time * 30) * 0.2; ctx.strokeStyle = '#ff3a20'; ctx.lineWidth = 3; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(t.x1, t.y); ctx.lineTo(t.x2, t.y); ctx.stroke(); ctx.restore(); }
  },
}, function (e, dt, d) {
  const p = G.player, A = e.bs, arena = G.world.roomById['v_warden'];
  const floorY = 82 * T, midX = (arena.x0 + arena.x1) / 2 * T, lx = (arena.x0 + 3) * T, rx = (arena.x1 - 3) * T;
  if (e.invuln > 0) e.invuln -= dt;
  const ratio = e.hp / e.maxHp, phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
  A.t += dt; A.cool -= dt; e.face = Math.sign(p.cx - e.cx) || e.face; e.phase += dt * 10;
  if (phase !== A.phase && A.mode === 'idle') { A.phase = phase; A.mode = 'phase'; A.t = 0; CD.audio.play('roar'); G.fx.shake(8, 0.5); G.say('OVERSEER', phase === 2 ? 'The Warden is entering Defensive Enthusiasm Mode. Please stop damaging it.' : 'Warning: Warden is now operating outside recommended parameters.', 4, '#ffb640'); }
  const hover = () => floorY - 210 + Math.sin(G.time * 1.6) * 16;
  const mul = phase === 3 ? 0.65 : phase === 2 ? 0.82 : 1;
  switch (A.mode) {
    case 'intro': e.state = 'idle'; flyTo(e, dt, midX, floorY - 250, 200); if (A.t > (d.introT || 2.4)) { A.mode = 'idle'; A.t = 0; A.cool = 0.8; } break;
    case 'phase': e.state = 'windup'; e.atkK = A.t * 0.4; flyTo(e, dt, midX, floorY - 260, 260); e.invuln = 0.3; if (A.t > 1.5) { A.mode = 'idle'; A.cool = 0.6; A.t = 0; if (phase >= 2) { A.next = 'summon'; } } break;
    case 'idle': {
      e.state = 'idle'; e.atkK = 0; const tx = U.clamp(p.cx + Math.sin(G.time * 0.6) * 240, lx, rx); flyTo(e, dt, tx, hover(), 150);
      if (A.cool <= 0) {
        let atk = A.next; A.next = null;
        if (!atk) { const pool = ['flame', 'flame', 'missiles', 'saw']; if (phase >= 2) pool.push('slam', 'missiles'); if (phase === 3) pool.push('spin', 'saw'); do { atk = pool[Math.floor(Math.random() * pool.length)]; } while (atk === A.last && pool.length > 2 && Math.random() < 0.7); }
        A.last = atk; A.mode = atk; A.t = 0; A.n = 0; A.side = p.cx > midX ? -1 : 1;
      }
      break;
    }
    case 'flame': {
      if (A.t < 0.8) { e.state = 'windup'; e.atkK = A.t / 0.8 * 0.3; flyTo(e, dt, p.cx + A.side * 60, floorY - 230, 260); }
      else if (A.t < 2.6) {
        e.state = 'fire'; e.atkK = 0.5; flyTo(e, dt, U.clamp(p.cx - A.side * 90 + Math.sin(A.t * 2) * 100, lx, rx), floorY - 220, 110);
        A.n -= dt; if (A.n <= 0) { A.n = 0.055; const ox = e.cx + e.face * 34, oy = e.cy + 18; const a = Math.atan2(p.cy - oy, p.cx - ox) + (Math.random() - 0.5) * 0.35;
          G.shoot({ x: ox, y: oy, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, owner: 'enemy', pk: 'fire', dmg: 9, life: 0.6, g: 160, r: 9, knock: 90, len: 20 }); if (Math.random() < 0.3) CD.audio.play('assault'); }
      } else { A.mode = 'idle'; A.cool = 1.5 * mul; e.state = 'idle'; }
      break;
    }
    case 'missiles': {
      if (A.t < 0.7) { e.state = 'windup'; e.atkK = A.t / 0.7 * 0.3; flyTo(e, dt, e.cx, floorY - 270, 200); }
      else {
        e.state = 'fire'; e.atkK = 0.5; const count = phase === 1 ? 3 : 5; A.n -= dt; flyTo(e, dt, e.cx, floorY - 270, 60);
        if (A.n <= 0 && A.shots < count || A.shots === undefined) { A.shots = A.shots || 0; }
        if (A.n <= 0 && A.shots < count) { A.n = 0.28; A.shots++; const ox = e.cx + (A.shots % 2 ? -26 : 26), oy = e.cy - 10; const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
          G.shoot({ x: ox, y: oy, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, owner: 'enemy', pk: 'rocket', dmg: 24, life: 3.2, seek: 1.7, blast: 62, knock: 300, trail: 1, r: 6 }); CD.audio.play('throw'); }
        if (A.shots >= count && A.n < -0.9) { A.shots = 0; A.mode = 'idle'; A.cool = 1.3 * mul; e.state = 'idle'; }
        else if (A.shots >= count) A.n -= dt;
      }
      break;
    }
    case 'saw': {
      const farX = p.cx > midX ? lx : rx, dir = farX === lx ? 1 : -1, y = p.cy - 10;
      if (A.t < 1.0) { e.state = 'windup'; e.atkK = A.t; A.tele = { x1: lx - 30, x2: rx + 30, y: y }; A.y = y; flyTo(e, dt, farX, y, 420, 6); e.face = dir; }
      else if (A.t < 1.9) { A.tele = null; e.state = 'attack'; e.atkK = 0.5; e.face = dir; e.vx = dir * 780 * (phase === 3 ? 1.15 : 1); e.vy = (A.y - e.cy) * 8; CD.AI._flyMove(e, dt, {}); if (U.overlap(e, p) || (Math.abs(e.cx - p.cx) < 44 && Math.abs(e.cy - p.cy) < 56)) G.hurtPlayer(28, { x: e.cx, kind: 'melee', knock: 380 }); if (Math.random() < 0.5) G.fx.spark(e.cx + dir * 30, e.cy + 6, 3, dir, 0, 1.5, 300); if (A.t < 1.03) CD.audio.play('swing_heavy'); }
      else { A.tele = null; A.mode = 'idle'; A.cool = 1.6 * mul; e.state = 'idle'; e.vx *= 0.3; }
      break;
    }
    case 'slam': {
      if (A.t < 0.8) { e.state = 'windup'; e.atkK = A.t / 0.8 * 0.3; flyTo(e, dt, p.cx, floorY - 330, 320); }
      else if (!A.hit) { e.state = 'attack'; e.atkK = 0.5; e.vx *= 0.9; e.vy = 1000; CD.AI._flyMove(e, dt, {}); if (e.cy + e.h / 2 >= floorY - 2 || e.vy < 300) { A.hit = true; A.t = 0.8; e.vy = 0; e.y = floorY - e.h - 1; G.fx.shake(10, 0.4); CD.audio.play('explosion'); G.fx.dust(e.cx, floorY, 14, 1); G.fx.dust(e.cx, floorY, 14, -1); for (const s of [-1, 1]) G.shoot({ x: e.cx, y: floorY - 12, vx: s * 340, vy: 0, owner: 'enemy', pk: 'shock', dmg: 20, life: 2.4, r: 12, knock: 260, len: 30 }); } }
      else if (A.t < 1.9) { e.state = 'idle'; e.vx *= 0.9; }
      else { A.hit = false; A.mode = 'idle'; A.cool = 1.4 * mul; }
      break;
    }
    case 'summon': {
      e.state = 'windup'; e.atkK = 0.3; flyTo(e, dt, midX, floorY - 280, 220);
      if (A.t > 1.0 && !A.done) { A.done = true; const mk = (tx, ty, k) => { const b = CD.spawn({ t: 'eyebot', tx, ty, key: 'sum:' + k + ':' + Math.random(), summon: true, diff: 1.2, room: arena.idx }); if (b) { b.hasSeen = true; b.alert = 9; b.caps = 0; G.ents.push(b); G.fx.ring(b.cx, b.cy, 60, '120,220,255', 0.4); } }; mk(arena.x0 + 4, 68, 1); mk(arena.x1 - 4, 68, 2); CD.audio.play('robot_alert'); }
      if (A.t > 2.0) { A.done = false; A.mode = 'idle'; A.cool = 1.0; }
      break;
    }
    case 'spin': {
      e.state = 'fire'; e.atkK = 0.5; flyTo(e, dt, midX, floorY - 210, 140);
      if (A.t < 3.2) { A.n -= dt; if (A.n <= 0) { A.n = 0.06; A.ang = (A.ang || 0) + 0.62; for (let k = 0; k < 2; k++) { const a = A.ang + k * Math.PI; G.shoot({ x: e.cx, y: e.cy, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, owner: 'enemy', pk: 'fire', dmg: 8, life: 0.9, g: 0, r: 8, knock: 80, len: 18 }); } if (Math.random() < 0.2) CD.audio.play('assault'); } }
      else { A.mode = 'idle'; A.cool = 1.8 * mul; }
      break;
    }
  }
  // stay in the arena
  const rm = arena; e.x = U.clamp(e.x, rm.x0 * T + 60, rm.x1 * T - 60 - e.w); e.y = U.clamp(e.y, rm.y0 * T + 70, floorY - e.h);
}
);
B.defs.warden.onDie = function (e) { B.defeat('warden', e); };
CD.art.warden = CD.scaledArt('handy', 1.6, 46, 54);

})();
