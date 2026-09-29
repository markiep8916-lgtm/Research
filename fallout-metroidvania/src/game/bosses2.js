// Bosses 2-6: Big Bulldog (warlord), the Glowing One, the Deathclaw, Sentry Bot Warden-9, Overseer Prime.
// Arena geometry comes from `arena` marks (G.arenas[id]) placed by the region authors; every fight adapts to the arena room.
// Shared framework: makeAI() runs intro -> idle/stalk -> attack -> recover with three HP phases; each attack is a function returning true when finished.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const G = (CD.G = CD.G || {});
const B = CD.bosses;
const PI = Math.PI;

// ================================================================== helpers
function arenaOf(e) {
  const a = G.arenas[e.type];
  const room = (a && a.room) || G.world.roomAtTile(Math.floor(e.cx / T), Math.floor(e.cy / T)) || G.room;
  const floorY = a ? a.floorY : e.bottom;
  const lx = (room.x0 + 2) * T, rx = (room.x1 - 2) * T;
  return { room, floorY, lx, rx, cx: (lx + rx) / 2, top: (room.y0 + 2) * T, w: rx - lx };
}
function bullet(e, ox, oy, ang, o) {
  o = o || {}; const sp = o.speed || 900;
  return G.shoot({ x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, owner: 'enemy', pk: o.pk || 'bullet', dmg: (o.dmg || 8) * e.dmgMul, life: o.life || 1.6, knock: o.knock === undefined ? 140 : o.knock, len: o.len || 14, col: o.col, g: o.g || 0, r: o.r, rad: o.rad, blast: o.blast, seek: o.seek, trail: o.trail, fuse: o.fuse, bounce: o.bounce, spin: o.spin });
}
function shockwave(e, x, dir, dmg, o) {
  o = o || {};
  return G.shoot({ x: x, y: e.arena.floorY - 14, vx: dir * (o.speed || 360), vy: 0, owner: 'enemy', pk: 'shock', dmg: dmg * e.dmgMul, life: o.life || 2.6, r: 12, knock: o.knock || 260, len: 30, rad: o.rad });
}
function slamFx(e, x, n) { G.fx.dust(x, e.arena.floorY, n || 14, 1); G.fx.dust(x, e.arena.floorY, n || 14, -1); G.fx.shake(10, 0.4); CD.audio.play('explosion'); }
function hurtIf(hit, dmg, o) { const p = G.player; if (p && !p.dead && hit && G.hurtPlayer((dmg || 10) * 1, o || {})) return true; return false; }
function overlapsPlayer(x, y, w, h, pad) { const p = G.player; pad = pad || 0; return p && !p.dead && p.x + p.w > x + pad && p.x < x + w - pad && p.y + p.h > y + pad && p.y < y + h - pad; }
function summon(e, type, tx, ty, o) {
  const b = CD.spawn({ t: type, tx, ty, key: 'sum:' + type + ':' + Math.random(), summon: true, diff: (o && o.diff) || 1.3, room: e.arena.room.idx });
  if (b) { b.hasSeen = true; b.alert = 9; b.caps = 0; b.awake = true; G.ents.push(b); G.fx.ring(b.cx, b.cy, 60, '255,200,120', 0.4); if (o && o.vy) b.vy = o.vy; }
  return b;
}
function aliveSummons() { let n = 0; for (const x of G.ents) if (x.kind === 'enemy' && !x.dead && x.spec && x.spec.summon) n++; return n; }
const say = (who, text, col) => G.say(who, text, 3.6, col);
const clampArena = (e, ar, margin) => { margin = margin === undefined ? 10 : margin; e.x = U.clamp(e.x, ar.lx + margin, ar.rx - margin - e.w); };

// generic three-phase AI runner
function makeAI(cfg) {
  return function (e, dt, d) {
    const p = G.player, A = e.bs; if (!A) return;
    if (!e.arena) e.arena = arenaOf(e);
    const ar = e.arena;
    if (e.invuln > 0) e.invuln -= dt;
    e.vulnMul = 1;
    A.t += dt; A.cool -= dt; A.tt = (A.tt || 0) + dt;
    const ratio = e.hp / e.maxHp, phase = ratio > cfg.p2 ? 1 : ratio > cfg.p3 ? 2 : 3;
    if (A.mode === 'intro') {
      cfg.intro(e, dt, A, ar, p); if (A.t > (d.introT || 2.4)) { A.mode = 'idle'; A.t = 0; A.cool = 0.9; A.phase = 1; }
    } else if (phase !== A.phase && (A.mode === 'idle') && !e.dead) {
      A.phase = phase; A.mode = 'phase'; A.t = 0; A.pdone = false;
    } else if (A.mode === 'phase') {
      e.invuln = Math.max(e.invuln, 0.2); if (cfg.phaseAnim) cfg.phaseAnim(e, dt, A, ar, p);
      if (!A.pdone && A.t > 0.3) { A.pdone = true; CD.audio.play('roar'); G.fx.shake(8, 0.5); if (cfg.onPhase) cfg.onPhase(e, A.phase, ar); }
      if (A.t > (cfg.phaseT || 1.4)) { A.mode = 'idle'; A.t = 0; A.cool = 0.5; }
    } else if (A.mode === 'idle') {
      cfg.idle(e, dt, A, ar, p, A.phase);
      if (A.cool <= 0 && p && !p.dead) {
        const atk = cfg.pick(e, A, ar, p, A.phase);
        if (atk) { A.mode = atk; A.t = 0; A.n = 0; A.done = false; A.stunned = A.shots = A.rest = A.dive = A.landed = A.rs = A.h0 = A.h1 = A.h2 = A.sw = A.crouch = A.cols = A.lock = A.dirS = A.yy = A.tele = A.dir = undefined; A.last = atk; A.side = p.cx > ar.cx ? -1 : 1; if (cfg.begin) cfg.begin(e, atk, A, ar, p); }
      }
    } else {
      const f = cfg.attacks[A.mode];
      if (!f || f(e, dt, A, ar, p, A.phase)) { A.mode = 'idle'; A.t = 0; A.cool = cfg.cooldown ? cfg.cooldown(A.phase, A.last) : 1.2; e.state = 'idle'; e.atkK = 0; A.tele = null; }
    }
    if (cfg.after) cfg.after(e, dt, A, ar, p);
    if (e.state === 'idle' || e.state === 'walk') { /* animation phase advances in Enemy.update when moving */ }
  };
}
function pickWeighted(list) { let tot = 0; for (const [, w] of list) tot += w; let r = Math.random() * tot; for (const [k, w] of list) { r -= w; if (r <= 0) return k; } return list[0][0]; }
function avoidRepeat(A, list) { const l = list.filter(([k]) => k !== A.last); return l.length ? l : list; }

// enemy.draw hooks -------------------------------------------------------
function humanoidDraw(cfg) {
  return function (e, ctx, flashOnly) {
    const A = e.bs || {}, st = e.state, p = G.player;
    let mode = 'idle'; if (!e.onGround) mode = e.vy < 0 ? 'jump' : 'fall'; else if (Math.abs(e.vx) > 20) mode = 'run';
    const s = { mode, phase: e.phase, t: e.t, speed: Math.min(1.2, Math.abs(e.vx) / (cfg.runRef || 200)), vy: e.vy, hurt: 0, crouch: A.crouch || 0 };
    let wp = null;
    const gun = cfg.gun ? CD.Rig.weaponSprite(cfg.gun) : null, mel = cfg.melee ? CD.Rig.weaponSprite(cfg.melee) : null;
    if ((st === 'aim' || st === 'fire') && gun) {
      let la = A.aimA !== undefined ? A.aimA : Math.atan2((p.cy - 6) - (e.y + e.h * 0.36), (p.cx - e.cx) || 1);
      // the rig aims in "facing" space: fold the angle so that 0 = straight ahead
      la = e.face > 0 ? la : (la >= 0 ? PI - la : -PI - la);
      s.aim = U.clamp(la, -1.2, 1.2); s.twoHand = cfg.twoHand || 14; if (e.recoil) s.recoil = e.recoil;
      wp = { sprite: gun, twoHand: true, mx: gun.mx, kick: e.recoil || 0 };
    } else if (mel) {
      wp = { sprite: mel, melee: true, idleAng: 1.0, holdAng: 0.05 };
      if (st === 'windup' || st === 'attack') { s.swing = e.atkK; s.swingKind = cfg.swingKind || 'chop'; }
    } else if (st === 'windup' || st === 'attack') { s.swing = e.atkK; s.swingKind = cfg.swingKind || 'punch'; }
    if (st === 'roar') { s.swing = 0.6 + Math.sin(e.t * 18) * 0.05; s.swingKind = 'punch'; }
    const pose = CD.Rig.pose(s);
    CD.Rig.draw(ctx, e.rig, pose, { x: e.cx, y: e.bottom, scale: e.scale, face: e.face, weapon: wp });
    if (cfg.glow && !flashOnly) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28 + Math.sin(e.t * 4) * 0.08 + (A.rage || 0) * 0.2; ctx.fillStyle = cfg.glow; ctx.beginPath(); ctx.ellipse(e.cx, e.cy, e.w * 1.15, e.h * 0.72, 0, 0, 7); ctx.fill(); ctx.restore(); }
    if (st === 'aim' && p) { const ox = e.cx + e.face * 34, oy = e.y + e.h * 0.4; ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * Math.sin(e.t * 40); ctx.strokeStyle = '#ff3a20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(p.cx, p.cy - 4); ctx.stroke(); ctx.restore(); }
  };
}
const OVERLAY = {
  // green rad haze over the floor (glowing one), drawn behind the boss
  floorRad(e, ctx) {
    const A = e.bs; if (!A || !A.rad) return; const ar = e.arena; if (!ar) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const k = A.rad === 'warn' ? 0.15 + 0.15 * Math.sin(e.t * 20) : 0.42 + 0.1 * Math.sin(e.t * 9);
    const gr = ctx.createLinearGradient(0, ar.floorY - 90, 0, ar.floorY); gr.addColorStop(0, 'rgba(120,255,80,0)'); gr.addColorStop(1, 'rgba(120,255,80,' + k + ')');
    ctx.fillStyle = gr; ctx.fillRect(ar.lx, ar.floorY - 90, ar.w, 90); ctx.restore();
  },
};

// ================================================================== BOSS 2: BIG BULLDOG  (Rustyard warlord)
if (CD.Rig && CD.Rig.OUTFITS) CD.Rig.OUTFITS.warlord = { skin: [156, 112, 88], suit: [56, 46, 36], trim: [150, 34, 22], boot: [30, 24, 20], glove: [26, 22, 18], hair: { style: 'mohawk', col: [176, 34, 22] }, belt: [44, 30, 20], armor: [98, 74, 44], plate: [138, 116, 92], style: 'cloth', tag: 'warlord', bulk: 1.3, scars: true };
if (CD.Rig && CD.Rig.OUTFITS) CD.Rig.OUTFITS.marrow = { skin: [150, 192, 104], suit: [196, 204, 186], trim: [130, 210, 96], boot: [56, 62, 46], glove: [150, 192, 104], hair: { style: 'bald', col: [60, 76, 44] }, belt: [90, 100, 76], coat: true, style: 'cloth', tag: 'marrow', ghoul: true, ragged: true };
B.define('warlord', {
  w: 30, h: 72, scale: 1.6, outfit: 'warlord',
  hp: 1650, xp: 380, armor: 2, big: true, title: 'BIG BULLDOG', intro: 'RUSTYARD WARLORD',
  blurb: 'He wears a dead Sleeper\'s boots and he is not shy about it.', victory: 'Big Bulldog goes down. The Rustyard falls quiet.', capsReward: 260, introT: 2.6, contact: 14, aggro: 900,
  light: { r: 150, c: [1, 0.55, 0.3], i: 0.3, f: 0.2 }, grants: [],
  onDefeat: { flag: 'boss_warlord', setObjective: 3, say: [['OVERSEER', 'A raider warlord, defeated by a Sleeper in a pair of borrowed boots. I will file it under "inspiring".', 5], ['OVERSEER', 'Gecko Grips acquired. I would advise against licking the walls. They are for climbing.', 5]] },
  arena() { return { spawn: { tx: 0, ty: 0 }, gates: [] }; },
}, function () { });
{
  const draw = humanoidDraw({ gun: 'minigun', melee: 'sledge', runRef: 300, twoHand: 14, swingKind: 'chop' });
  B.defs.warlord.customDraw = draw;
  B.defs.warlord.onDie = function (e) { B.defeat('warlord', e); };
  CD.AI.warlord = makeAI({
    p2: 0.66, p3: 0.33,
    intro(e, dt, A, ar, p) { e.state = 'roar'; e.vx = 0; e.face = Math.sign(p.cx - e.cx) || e.face; CD.moveActor(e, dt, { gravity: 1800 }); },
    onPhase(e, ph) { say('BIG BULLDOG', ph === 2 ? 'You want my boots? Come and take them, vault rat!' : 'NOBODY takes Bulldog\'s trophies! Boys! KILL HIM!', '#ff8a5a'); if (aliveSummons() < 3) { summon(e, 'x', Math.floor(e.arena.lx / T) + 3, Math.floor(e.arena.floorY / T) - 1); summon(e, 'a', Math.floor(e.arena.rx / T) - 4, Math.floor(e.arena.floorY / T) - 1); } },
    phaseAnim(e, dt, A) { e.state = 'roar'; e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 }); },
    idle(e, dt, A, ar, p, ph) {
      e.state = 'idle'; const dx = p.cx - e.cx, dir = Math.sign(dx) || e.face; e.face = dir;
      const spd = ph === 3 ? 130 : 105; if (Math.abs(dx) > 150) e.vx = U.approach(e.vx, dir * spd, 900 * dt); else e.vx = U.approach(e.vx, 0, 1400 * dt);
      CD.moveActor(e, dt, { gravity: 1800 });
    },
    pick(e, A, ar, p, ph) {
      const dist = Math.abs(p.cx - e.cx), l = [];
      if (dist < 190) l.push(['smash', 5]); else l.push(['charge', 4]);
      l.push(['minigun', dist > 150 ? 4 : 2]);
      if (ph >= 2) l.push(['grenades', 3]);
      if (ph >= 3) l.push(['leap', 4]);
      if (ph >= 2 && !A.summoned2 && aliveSummons() === 0 && Math.random() < 0.25) { A.summoned2 = true; return 'call'; }
      return pickWeighted(avoidRepeat(A, l));
    },
    cooldown(ph) { return ph === 3 ? 0.7 : ph === 2 ? 1.0 : 1.4; },
    attacks: {
      smash(e, dt, A, ar, p, ph) {
        const D = 1.5; e.vx = U.approach(e.vx, 0, 2000 * dt); e.atkK = A.t / D;
        if (A.t < 0.55) { e.state = 'windup'; e.face = Math.sign(p.cx - e.cx) || e.face; }
        else { e.state = 'attack'; if (!A.done && A.t > 0.72) { A.done = true; const hx = e.cx + e.face * 60; slamFx(e, hx, 10);
          if (overlapsPlayer(e.cx + (e.face > 0 ? 0 : -125), e.y - 10, 125, e.h + 20)) hurtIf(true, 30, { x: e.cx, kind: 'melee', knock: 420 });
          if (ph >= 2) { shockwave(e, hx, 1, 16, { speed: 380 }); shockwave(e, hx, -1, 16, { speed: 380 }); } } }
        CD.moveActor(e, dt, { gravity: 1800 }); return A.t >= D;
      },
      charge(e, dt, A, ar, p, ph) {
        if (A.t < 0.85) { e.state = 'windup'; e.atkK = 0.1 + A.t * 0.2; e.vx = U.approach(e.vx, 0, 1500 * dt); if (A.t < 0.1) e.face = Math.sign(p.cx - e.cx) || e.face; A.dir = e.face; if (Math.random() < 0.3) G.fx.dust(e.cx, e.bottom, 1, -e.face); }
        else if (A.t < 2.6 && !A.stunned) {
          e.state = 'attack'; e.atkK = 0.4; e.vx = A.dir * (ph === 3 ? 640 : 560); e.face = A.dir;
          if (Math.random() < 0.5) G.fx.dust(e.cx, e.bottom, 1, -A.dir);
          if (overlapsPlayer(e.x - 6, e.y, e.w + 12, e.h, 4)) hurtIf(true, 28, { x: e.cx, kind: 'melee', knock: 460 });
          const wall = A.dir > 0 ? e.x + e.w >= ar.rx - 14 : e.x <= ar.lx + 14;
          if (wall) { A.stunned = true; A.t = 2.6; e.vx = 0; G.fx.shake(9, 0.4); CD.audio.play('explosion'); G.fx.dust(e.cx + A.dir * 20, e.bottom, 12, -A.dir); }
        } else { e.state = 'idle'; e.vx = U.approach(e.vx, 0, 1600 * dt); e.vulnMul = 1.6; e.atkK = 0; if (Math.floor(A.tt * 8) % 2 === 0 && Math.random() < 0.1) G.fx.spark(e.cx, e.y + 20, 2, 0, -1, 1, 120); }
        CD.moveActor(e, dt, { gravity: 1800 }); return A.t >= (A.stunned ? 3.6 : 2.6);
      },
      minigun(e, dt, A, ar, p, ph) {
        e.vx = U.approach(e.vx, 0, 2000 * dt); e.face = Math.sign(p.cx - e.cx) || e.face;
        const ox = e.cx + e.face * 46, oy = e.y + e.h * 0.42, ang = Math.atan2((p.cy - 6) - oy, p.cx - ox);
        if (A.t < 0.7) { e.state = 'aim'; A.aimA = ang; }
        else if (A.t < 0.7 + (ph === 3 ? 2.4 : 1.8)) {
          e.state = 'fire'; A.aimA = ang; A.n -= dt; if (A.n <= 0) { A.n = ph === 3 ? 0.065 : 0.08; e.recoil = 4; bullet(e, ox, oy, ang + (Math.random() - 0.5) * 0.16, { dmg: 11, speed: 950, life: 1.4, knock: 120 }); if (Math.random() < 0.4) CD.audio.play('minigun'); G.fx.glowFlash(ox, oy, 50, '255,210,140', 0.05); }
          if (e.recoil > 0) e.recoil = Math.max(0, e.recoil - 30 * dt);
        } else return true;
        CD.moveActor(e, dt, { gravity: 1800 }); return false;
      },
      grenades(e, dt, A, ar, p, ph) {
        e.vx = U.approach(e.vx, 0, 2000 * dt); e.face = Math.sign(p.cx - e.cx) || e.face;
        const total = ph === 3 ? 4 : 3;
        if (A.t < 0.6) { e.state = 'windup'; e.atkK = 0.15; }
        else { e.state = 'attack'; e.atkK = 0.45; A.n -= dt;
          if (A.n <= 0 && A.shots < total || A.shots === undefined) { A.shots = A.shots || 0; }
          if (A.n <= 0 && A.shots < total) { A.n = 0.42; A.shots++; const ox = e.cx + e.face * 24, oy = e.y + 10, tx = p.cx + (Math.random() - 0.5) * 220, tf = U.clamp(Math.abs(tx - ox) / 520, 0.5, 1.15), g = 1500;
            G.shoot({ x: ox, y: oy, vx: (tx - ox) / tf, vy: ((p.cy - oy) - 0.5 * g * tf * tf) / tf, owner: 'enemy', pk: 'grenade', g, life: 3, fuse: 1.5, blast: 84, dmg: 32 * e.dmgMul, bounce: 0.42, knock: 420, spin: 10, r: 5 }); CD.audio.play('throw'); }
          if (A.shots >= total && A.n < -0.4) { A.shots = 0; return true; } else if (A.shots >= total) A.n -= dt; }
        CD.moveActor(e, dt, { gravity: 1800 }); return false;
      },
      call(e, dt, A, ar, p) {
        e.state = 'roar'; e.vx = 0; if (!A.done && A.t > 0.8) { A.done = true; if (aliveSummons() < 3) { summon(e, 'x', Math.floor(ar.lx / T) + 3, Math.floor(ar.floorY / T) - 1); summon(e, 'a', Math.floor(ar.rx / T) - 4, Math.floor(ar.floorY / T) - 1); } say('BIG BULLDOG', 'Get in here, boys!', '#ff8a5a'); CD.audio.play('roar'); }
        CD.moveActor(e, dt, { gravity: 1800 }); return A.t > 1.6;
      },
      leap(e, dt, A, ar, p, ph) {
        if (A.t < 0.55) { e.state = 'windup'; e.atkK = 0.1; A.crouch = A.t / 0.55; e.vx = 0; e.face = Math.sign(p.cx - e.cx) || e.face; CD.moveActor(e, dt, { gravity: 1800 }); return false; }
        A.crouch = 0;
        if (!A.done) { A.done = true; e.vy = -1000; e.vx = U.clamp((p.cx - e.cx) * 1.5, -620, 620); e.onGround = false; CD.audio.play('roar'); }
        if (!A.rest) {
          e.state = 'attack'; e.atkK = 0.4;
          const f = CD.moveActor(e, dt, { gravity: 2000 });
          if (e.vy > 0 && overlapsPlayer(e.x, e.y, e.w, e.h, 6)) hurtIf(true, 30, { x: e.cx, kind: 'melee', knock: 420 });
          if (f.down && A.t > 0.7) { A.rest = A.t; slamFx(e, e.cx, 16); shockwave(e, e.cx, 1, 20); shockwave(e, e.cx, -1, 20); e.vx = 0; }
          return false;
        }
        e.state = 'idle'; e.vulnMul = 1.4; e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 }); return A.t > A.rest + 0.7;
      },
    },
    after(e, dt, A, ar) { clampArena(e, ar); if (e.y + e.h > ar.floorY + 4) { e.y = ar.floorY - e.h; e.vy = 0; } },
  });
  // register speed for run animation
  B.defs.warlord.stride = 0.06;
}

// ================================================================== BOSS 3: THE GLOWING ONE  (Metro)
B.define('glowing_one', {
  w: 24, h: 68, scale: 1.4, outfit: 'marrow',
  hp: 1900, xp: 420, armor: 0, big: true, title: 'THE GLOWING ONE', intro: 'FORMERLY DR. IDA MARROW', blurb: 'Vault-Tec metro physician. Treatment plan: radiation, aggressively.', victory: 'The light in the tunnels fades. Somewhere, a very old apology is finally accepted.', capsReward: 300, introT: 2.8, contact: 12, aggro: 900,
  light: { r: 320, c: [0.5, 1, 0.3], i: 0.9, f: 0.12 }, grants: [], rad: 6,
  onDefeat: { flag: 'boss_glowing_one', setObjective: 4, say: [['OVERSEER', 'The glowing ghoul has been retired. Please do not stand in her lab notes. They are quite radioactive.', 5], ['OVERSEER', 'Sleeper Five\'s Jet injector rig recovered. You may now accelerate in short bursts. Please do not accelerate into walls.', 5.5]] },
  arena() { return { spawn: { tx: 0, ty: 0 }, gates: [] }; },
}, function () { });
{
  const draw = humanoidDraw({ runRef: 280, swingKind: 'punch', glow: 'rgb(140,255,90)' });
  B.defs.glowing_one.customDraw = draw;
  B.defs.glowing_one.drawExtra = OVERLAY.floorRad;
  B.defs.glowing_one.onDie = function (e) { if (e.bs) e.bs.rad = 0; B.defeat('glowing_one', e); };
  const dashTo = (e, dir, spd, dt) => { e.vx = dir * spd; e.face = dir; CD.moveActor(e, dt, { gravity: 1800 }); };
  CD.AI.glowing_one = makeAI({
    p2: 0.66, p3: 0.33,
    intro(e, dt, A, ar, p) { e.state = 'roar'; e.vx = 0; e.face = Math.sign(p.cx - e.cx) || e.face; CD.moveActor(e, dt, { gravity: 1800 }); if (Math.random() < 0.1) G.fx.ring(e.cx, e.cy, 60, '140,255,90', 0.5); },
    onPhase(e, ph, ar) { say('DR. MARROW', ph === 2 ? 'Hold still, dear. This will only... glow a little.' : 'THE LIGHT! THE LIGHT IS NOT THE SUN!', '#9dff7a'); if (ph === 2) { summon(e, 'g', Math.floor(ar.lx / T) + 3, Math.floor(ar.floorY / T) - 1); summon(e, 'g', Math.floor(ar.rx / T) - 4, Math.floor(ar.floorY / T) - 1); } G.fx.ring(e.cx, e.cy, 200, '140,255,90', 0.8); },
    phaseAnim(e, dt) { e.state = 'roar'; e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 }); },
    idle(e, dt, A, ar, p, ph) {
      e.state = 'idle'; const dx = p.cx - e.cx, dir = Math.sign(dx) || e.face; e.face = dir;
      const spd = ph === 3 ? 190 : 150; if (Math.abs(dx) > 120) e.vx = U.approach(e.vx, dir * spd, 1200 * dt); else e.vx = U.approach(e.vx, 0, 1800 * dt);
      CD.moveActor(e, dt, { gravity: 1800 });
    },
    pick(e, A, ar, p, ph) {
      const dist = Math.abs(p.cx - e.cx), l = [];
      if (dist < 240) l.push(['claws', 5]); else l.push(['leap', 4]);
      l.push(['pulse', 3]); l.push(['spit', dist > 200 ? 4 : 2]);
      if (ph >= 2 && aliveSummons() < 2 && !A.sumd) { A.sumd = 1; return 'call'; }
      if (ph >= 3 && !A.cloudCd) l.push(['cloud', 3]);
      return pickWeighted(avoidRepeat(A, l));
    },
    cooldown(ph) { return ph === 3 ? 0.55 : ph === 2 ? 0.85 : 1.2; },
    attacks: {
      claws(e, dt, A, ar, p, ph) {
        // approach dash then three swipes
        if (A.t < 0.28) { e.state = 'windup'; e.atkK = 0.1; dashTo(e, Math.sign(p.cx - e.cx) || e.face, Math.abs(p.cx - e.cx) > 90 ? 560 : 0, dt); return false; }
        const seg = 0.3, k = Math.floor((A.t - 0.28) / seg), tk = (A.t - 0.28) % seg;
        if (k < 3) {
          e.state = 'attack'; e.atkK = 0.32 + tk / seg * 0.25; if (tk < dt * 2) { e.face = Math.sign(p.cx - e.cx) || e.face; e.vx = e.face * 300; CD.audio.play('swing_heavy'); }
          if (tk > seg * 0.4 && tk < seg * 0.6 && !A['h' + k]) { A['h' + k] = true; if (overlapsPlayer(e.cx + (e.face > 0 ? 0 : -86), e.y, 86, e.h)) hurtIf(true, 15, { x: e.cx, kind: 'melee', knock: 320, rad: 6 }); G.fx.spark(e.cx + e.face * 40, e.cy, 4, e.face, 0, 1, 260, '160,255,120'); }
          e.vx = U.approach(e.vx, 0, 1200 * dt); CD.moveActor(e, dt, { gravity: 1800 }); return false;
        }
        e.state = 'idle'; e.vx = U.approach(e.vx, 0, 1800 * dt); e.vulnMul = 1.25; CD.moveActor(e, dt, { gravity: 1800 }); return A.t > 0.28 + 0.9 + 0.4;
      },
      pulse(e, dt, A, ar, p) {
        e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 });
        if (A.t < 0.9) { e.state = 'roar'; if (Math.random() < 0.3) G.fx.ring(e.cx, e.bottom - 4, 40 + A.t * 60, '140,255,90', 0.3); A.tele = true; }
        else { A.tele = null; if (!A.done) { A.done = true; G.fx.shake(8, 0.4); CD.audio.play('explosion'); G.fx.ring(e.cx, e.bottom - 10, 220, '140,255,90', 0.7); for (const s of [-1, 1]) { shockwave(e, e.cx, s, 12, { speed: 340, rad: 10, life: 3 }); shockwave(e, e.cx + s * 60, s, 12, { speed: 240, rad: 10, life: 3 }); } } e.state = 'idle'; }
        return A.t > 1.7;
      },
      leap(e, dt, A, ar, p) {
        if (A.t < 0.6) { e.state = 'windup'; e.atkK = 0.1; A.crouch = A.t / 0.6; e.vx = 0; e.face = Math.sign(p.cx - e.cx) || e.face; CD.moveActor(e, dt, { gravity: 1800 }); return false; }
        A.crouch = 0; if (!A.done) { A.done = true; e.vy = -1060; e.vx = U.clamp((p.cx - e.cx) * 1.6, -640, 640); e.onGround = false; CD.audio.play('growl'); }
        if (!A.rest) {
          e.state = 'attack'; e.atkK = 0.42; const f = CD.moveActor(e, dt, { gravity: 2100 });
          if (e.vy > 0 && overlapsPlayer(e.x, e.y, e.w, e.h, 4)) hurtIf(true, 24, { x: e.cx, kind: 'melee', knock: 380, rad: 8 });
          if (f.down && A.t > 0.7) { slamFx(e, e.cx, 12); G.fx.ring(e.cx, e.bottom - 6, 160, '140,255,90', 0.5); shockwave(e, e.cx, 1, 10, { speed: 300, rad: 8 }); shockwave(e, e.cx, -1, 10, { speed: 300, rad: 8 }); e.vx = 0; A.rest = A.t; }
          return false;
        }
        e.state = 'idle'; e.vulnMul = 1.5; e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 }); return A.t > A.rest + 0.9;
      },
      spit(e, dt, A, ar, p, ph) {
        e.vx = U.approach(e.vx, 0, 2000 * dt); e.face = Math.sign(p.cx - e.cx) || e.face; CD.moveActor(e, dt, { gravity: 1800 });
        if (A.t < 0.6) { e.state = 'roar'; return false; }
        e.state = 'attack'; e.atkK = 0.45;
        if (!A.done) { A.done = true; const ox = e.cx + e.face * 24, oy = e.y + 12, base = Math.atan2(p.cy - oy, p.cx - ox), n = ph === 3 ? 5 : 3;
          for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.22 - 0.18; G.shoot({ x: ox, y: oy, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560 - 120, owner: 'enemy', pk: 'spit', col: '140,255,90', g: 420, dmg: 10 * e.dmgMul, life: 2.2, r: 5, rad: 8, knock: 120 }); } CD.audio.play('squelch'); }
        return A.t > 1.2;
      },
      call(e, dt, A, ar, p) {
        e.state = 'roar'; e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 });
        if (!A.done && A.t > 0.8) { A.done = true; if (aliveSummons() < 3) { summon(e, 'g', Math.floor(ar.lx / T) + 3, Math.floor(ar.floorY / T) - 1); summon(e, 'g', Math.floor(ar.rx / T) - 4, Math.floor(ar.floorY / T) - 1); } CD.audio.play('roar'); G.fx.ring(e.cx, e.cy, 160, '140,255,90', 0.7); }
        return A.t > 1.6;
      },
      cloud(e, dt, A, ar, p) {
        e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 }); e.state = 'roar';
        if (A.t < 1.6) A.rad = 'warn'; else if (A.t < 4.6) { A.rad = 'on'; A.n -= dt; if (A.n <= 0) { A.n = 0.7; if (p.onGround && p.y + p.h >= ar.floorY - 6) hurtIf(true, 9, { kind: 'hazard', knock: 0, rad: 10 }); } } else { A.rad = 0; return true; }
        return false;
      },
    },
    after(e, dt, A, ar) { clampArena(e, ar); if (e.y + e.h > ar.floorY + 4) { e.y = ar.floorY - e.h; e.vy = 0; } },
  });
}

// ================================================================== BOSS 4: THE DEATHCLAW  (Ridge cliff)
B.define('deathclaw', {
  w: 90, h: 104, hp: 2700, xp: 520, armor: 2, big: true, art: 'deathclaw', title: 'DEATHCLAW', intro: 'APEX PREDATOR',
  blurb: 'It nested in the wreck of the Brotherhood vertibird. It does not enjoy visitors.', victory: 'The nest falls silent. Paladin Kessler\'s gauntlet lies where the beast dragged it.', capsReward: 320, introT: 2.8, contact: 18, aggro: 1000, corpseRot: 0,
  light: { r: 110, c: [1, 0.6, 0.25], i: 0.18, f: 0.1 }, grants: [],
  onDefeat: { flag: 'boss_deathclaw', setObjective: 5, say: [['OVERSEER', 'The creature has been reclassified from "apex predator" to "rug". Congratulations.', 4.5], ['OVERSEER', 'The Power Fist is not a toy, Sleeper Seven. It is a tool. For breaking things. Other people\'s things, ideally.', 5.5]] },
  arena() { return { spawn: { tx: 0, ty: 0 }, gates: [] }; },
}, function () { });
B.defs.deathclaw.onDie = function (e) { B.defeat('deathclaw', e); };
B.defs.deathclaw.corpseRot = 0;         // the art paints its own corpse pose
{
  CD.AI.deathclaw = makeAI({
    p2: 0.62, p3: 0.3,
    intro(e, dt, A, ar, p) { e.state = 'roar'; e.atkK = Math.min(1, A.t / 1.6); e.vx = 0; e.face = Math.sign(p.cx - e.cx) || e.face; CD.moveActor(e, dt, { gravity: 1800 }); if (A.t > 0.4 && !A.sh) { A.sh = 1; G.fx.shake(10, 0.9); CD.audio.play('roar'); } },
    onPhase(e, ph) { A_rage(e, ph); G.notify(ph === 2 ? 'The Deathclaw is enraged!' : 'The Deathclaw is berserk!', 'warn'); },
    phaseAnim(e, dt, A) { e.state = 'roar'; e.atkK = Math.min(1, A.t / 1.2); e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 }); },
    idle(e, dt, A, ar, p, ph) {
      e.state = Math.abs(e.vx) > 40 ? 'run' : 'idle'; const dx = p.cx - e.cx, dir = Math.sign(dx) || e.face; e.face = dir;
      const spd = ph === 3 ? 330 : ph === 2 ? 290 : 250; if (Math.abs(dx) > 130) e.vx = U.approach(e.vx, dir * spd, 1600 * dt); else e.vx = U.approach(e.vx, 0, 2200 * dt);
      CD.moveActor(e, dt, { gravity: 1800 });
    },
    pick(e, A, ar, p, ph) {
      const dist = Math.abs(p.cx - e.cx), l = [];
      if (dist < 200) { l.push(['slash', 6]); l.push(['roar', ph >= 2 ? 2 : 1]); } else { l.push(['pounce', 4]); l.push(['rush', 4]); l.push(['throw', p.y + p.h < ar.floorY - 120 ? 6 : 2]); }
      if (dist >= 200 && dist < 330) l.push(['slash', 3]);
      return pickWeighted(avoidRepeat(A, l));
    },
    cooldown(ph) { return ph === 3 ? 0.45 : ph === 2 ? 0.75 : 1.1; },
    attacks: {
      rush(e, dt, A, ar, p, ph) {
        // gallop at the player, then slash if close
        const dir = Math.sign(p.cx - e.cx) || e.face; e.face = dir;
        if (A.t < 0.35) { e.state = 'windup'; e.atkK = 0.1; e.vx = U.approach(e.vx, 0, 1800 * dt); }
        else if (A.t < 1.5 && Math.abs(p.cx - e.cx) > 105) { e.state = 'run'; e.vx = U.approach(e.vx, dir * (ph === 3 ? 620 : 520), 3000 * dt); }
        else return attackSlash(e, dt, A, ar, p, ph, A.rs = A.rs || A.t);
        CD.moveActor(e, dt, { gravity: 1800 }); return false;
      },
      slash(e, dt, A, ar, p, ph) { return attackSlash(e, dt, A, ar, p, ph, 0); },
      pounce(e, dt, A, ar, p, ph) {
        if (A.t < 0.55) { e.state = 'windup'; e.atkK = A.t / 0.55 * 0.6; e.vx = 0; e.face = Math.sign(p.cx - e.cx) || e.face; if (Math.random() < 0.2) G.fx.dust(e.cx, e.bottom, 1, e.face); CD.moveActor(e, dt, { gravity: 1800 }); return false; }
        if (!A.done) { A.done = true; e.vy = -1080; e.vx = U.clamp((p.cx - e.cx) * 1.5, -720, 720); e.onGround = false; CD.audio.play('roar'); }
        e.state = 'leap'; const f = CD.moveActor(e, dt, { gravity: 2100 });
        if (e.vy > 0 && overlapsPlayer(e.x, e.y, e.w, e.h, 8)) hurtIf(true, 32, { x: e.cx, kind: 'melee', knock: 460 });
        if (f.down && A.t > 0.7 && !A.rest) { A.rest = A.t; slamFx(e, e.cx, 18); shockwave(e, e.cx, 1, 18, { speed: 400 }); shockwave(e, e.cx, -1, 18, { speed: 400 }); if (overlapsPlayer(e.cx - 90, e.bottom - 50, 180, 50)) hurtIf(true, 26, { x: e.cx, kind: 'melee', knock: 380 }); e.vx = 0; }
        if (A.rest) { e.state = 'land'; e.vulnMul = 1.4; e.vx = 0; return A.t > A.rest + (ph === 3 ? 0.5 : 0.85); }
        return false;
      },
      roar(e, dt, A, ar, p) {
        e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 }); e.state = 'roar'; e.atkK = Math.min(1, A.t / 1.0);
        if (!A.done && A.t > 0.9) { A.done = true; G.fx.shake(12, 0.6); CD.audio.play('roar'); G.fx.ring(e.cx, e.cy, 200, '255,180,90', 0.6); shockwave(e, e.cx, 1, 14, { speed: 440 }); shockwave(e, e.cx, -1, 14, { speed: 440 }); if (Math.abs(p.cx - e.cx) < 200) { p.vx += Math.sign(p.cx - e.cx) * 380; p.vy = -180; } }
        return A.t > 1.6;
      },
      throw(e, dt, A, ar, p) {
        e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 }); e.face = Math.sign(p.cx - e.cx) || e.face;
        if (A.t < 0.95) { e.state = 'throw'; e.atkK = A.t / 0.95 * 0.7; return false; }
        e.state = 'throw'; e.atkK = 0.9;
        if (!A.done) { A.done = true; const ox = e.cx + e.face * 20, oy = e.y + 10, tf = 0.9, g = 1400; G.shoot({ x: ox, y: oy, vx: (p.cx - ox) / tf, vy: ((p.cy - oy) - 0.5 * g * tf * tf) / tf, owner: 'enemy', pk: 'rock', g, life: 2.2, blast: 70, dmg: 30 * e.dmgMul, knock: 380, spin: 8, r: 9 }); CD.audio.play('throw'); }
        return A.t > 1.5;
      },
    },
    after(e, dt, A, ar) { clampArena(e, ar); if (e.y + e.h > ar.floorY + 4) { e.y = ar.floorY - e.h; e.vy = 0; } },
  });
  function A_rage(e, ph) { e.bs.rage = ph === 2 ? 0.55 : 1; }
  function attackSlash(e, dt, A, ar, p, ph, t0) {
    const t = A.t - t0, dbl = ph >= 2, wu = ph === 3 ? 0.22 : 0.32, st = 0.14, rc = dbl ? 0.55 : 0.5;
    e.vx = U.approach(e.vx, 0, 2600 * dt);
    if (t < wu) { e.state = 'windup'; e.atkK = t / wu * 0.35; if (t < 0.05) e.face = Math.sign(p.cx - e.cx) || e.face; }
    else if (t < wu + st) { e.state = 'slash'; e.atkK = 0.35 + (t - wu) / st * 0.25; if (!A.h1) { A.h1 = true; e.vx = e.face * 260; CD.audio.play('swing_heavy'); if (overlapsPlayer(e.cx + (e.face > 0 ? -10 : -125), e.y, 135, e.h)) hurtIf(true, 32, { x: e.cx, kind: 'melee', knock: 430 }); G.fx.spark(e.cx + e.face * 70, e.cy, 6, e.face, 0, 1, 300, '255,220,160'); } }
    else if (dbl && t < wu + st + 0.2) { e.state = 'windup'; e.atkK = 0.3; }
    else if (dbl && t < wu + st + 0.2 + st) { e.state = 'slash'; e.atkK = 0.55; if (!A.h2) { A.h2 = true; e.face = Math.sign(p.cx - e.cx) || e.face; e.vx = e.face * 260; CD.audio.play('swing_heavy'); if (overlapsPlayer(e.cx + (e.face > 0 ? -10 : -125), e.y, 135, e.h)) hurtIf(true, 32, { x: e.cx, kind: 'melee', knock: 430 }); } }
    else { e.state = 'idle'; e.atkK = 0; if (t > wu + st + (dbl ? 0.34 : 0) + rc) { A.h1 = A.h2 = false; return true; } }
    CD.moveActor(e, dt, { gravity: 1800 }); return false;
  }
}

// ================================================================== BOSS 5: SENTRY BOT WARDEN-9  (Meridian Power Station)
B.define('sentry', {
  w: 100, h: 120, hp: 3600, xp: 640, armor: 3, robot: true, metal: true, big: true, art: 'sentry', title: 'SENTRY BOT WARDEN-9', intro: 'MERIDIAN POWER STATION',
  blurb: 'Security directive: eliminate all unauthorised personnel. Unauthorised personnel: you.', victory: 'Warden-9 powers down. A very small voice from inside says: "Was that... a good shift?"', capsReward: 380, introT: 3.0, contact: 16, aggro: 1100,
  light: { r: 230, c: [1, 0.35, 0.2], i: 0.5, f: 0.1 }, grants: [],
  onDefeat: { flag: 'boss_sentry', setObjective: 6, say: [['OVERSEER', 'The Sentry Bot has been pacified. Fusion Core secured. Level 7 clearance recovered. You are, if I may say so, a credit to the vault.', 6], ['OVERSEER', 'Please return to the Reactor Gate at your earliest convenience. Please do not stop for souvenirs. Please stop for souvenirs later.', 6]] },
  arena() { return { spawn: { tx: 0, ty: 0 }, gates: [] }; },
}, function () { });
B.defs.sentry.onDie = function (e) { B.defeat('sentry', e); };
B.defs.sentry.corpseRot = 0.05;         // a kneeling wreck, not upside down
{
  const eyeOf = (e) => ({ x: e.cx + e.face * 12, y: e.y + 26 });
  CD.AI.sentry = makeAI({
    p2: 0.66, p3: 0.33,
    intro(e, dt, A, ar, p) { e.state = 'windup'; e.atkK = Math.min(1, A.t / 2); e.vx = 0; e.face = Math.sign(p.cx - e.cx) || e.face; CD.moveActor(e, dt, { gravity: 1800 }); if (A.t > 0.3 && !A.sh) { A.sh = 1; G.fx.shake(6, 1); CD.audio.play('robot_alert'); } },
    onPhase(e, ph) { say('WARDEN-9', ph === 2 ? 'THREAT LEVEL INCREASED. ENGAGING SECONDARY WEAPONS.' : 'CRITICAL DAMAGE. OVERRIDE. OVERRIDE. OVERRIDE.', '#ff8a5a'); e.bs.rage = ph === 2 ? 0.5 : 1; },
    phaseAnim(e, dt) { e.state = 'windup'; e.atkK = 0.8; e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 }); if (Math.random() < 0.4) G.fx.spark(e.cx + (Math.random() - 0.5) * 60, e.cy, 3, 0, -1, 1.4, 260); },
    idle(e, dt, A, ar, p, ph) {
      const dx = p.cx - e.cx, dir = Math.sign(dx) || e.face; e.face = dir; const spd = ph === 3 ? 90 : 62;
      if (Math.abs(dx) > 260) { e.state = 'walk'; e.vx = U.approach(e.vx, dir * spd, 600 * dt); } else { e.state = 'idle'; e.vx = U.approach(e.vx, 0, 900 * dt); }
      CD.moveActor(e, dt, { gravity: 1800 });
    },
    pick(e, A, ar, p, ph) {
      const dist = Math.abs(p.cx - e.cx), l = [['gatling', 5], ['missiles', 4]];
      if (dist < 260) l.push(['stomp', 6]);
      if (ph >= 3) l.push(['beam', 4]);
      return pickWeighted(avoidRepeat(A, l));
    },
    cooldown(ph, last) { return (last === 'gatling' ? 0.2 : 1.0) * (ph === 3 ? 0.7 : 1); },
    attacks: {
      gatling(e, dt, A, ar, p, ph) {
        e.vx = U.approach(e.vx, 0, 1400 * dt); e.face = Math.sign(p.cx - e.cx) || e.face; CD.moveActor(e, dt, { gravity: 1800 });
        const arm = { x: e.cx + e.face * 34, y: e.y + 50 }, base = Math.atan2(p.cy - arm.y, p.cx - arm.x);
        const dur = ph === 3 ? 3.2 : 2.6;
        if (A.t < 1.0) { e.state = 'windup'; e.atkK = A.t; A.aimA = base; e.bs.heat = A.t; A.lock = base; }
        else if (A.t < 1.0 + dur) {
          e.state = 'gatling'; e.bs.heat = 1; const k = (A.t - 1.0) / dur, sweep = (A.sw = A.sw || (Math.random() < 0.5 ? -1 : 1)) * (k - 0.35) * 1.15;
          const ang = A.lock + sweep * 0.9 + (ph === 3 ? Math.sin(A.t * 5) * 0.12 : 0); A.aimA = ang;
          A.n -= dt; if (A.n <= 0) { A.n = ph === 3 ? 0.075 : 0.09; bullet(e, arm.x + Math.cos(ang) * 44, arm.y + Math.sin(ang) * 44, ang + (Math.random() - 0.5) * 0.05, { pk: 'laser', col: '255,70,50', dmg: 13, speed: 820, life: 1.4, knock: 160, len: 18 }); if (Math.random() < 0.3) CD.audio.play('laser'); G.fx.glowFlash(arm.x + Math.cos(ang) * 44, arm.y + Math.sin(ang) * 44, 50, '255,90,70', 0.05); }
        } else { e.bs.heat = 0; A.sw = 0; return true; }
        return false;
      },
      missiles(e, dt, A, ar, p, ph) {
        e.vx = U.approach(e.vx, 0, 1400 * dt); e.face = Math.sign(p.cx - e.cx) || e.face; CD.moveActor(e, dt, { gravity: 1800 });
        const count = ph === 1 ? 3 : ph === 2 ? 4 : 6;
        if (A.t < 0.8) { e.state = 'missile'; e.atkK = A.t / 0.8; return false; }
        e.state = 'missile'; e.atkK = 1; A.n -= dt; A.shots = A.shots || 0;
        if (A.n <= 0 && A.shots < count) { A.n = 0.34; A.shots++; const ox = e.cx - e.face * 14 + (A.shots % 2 ? -14 : 14), oy = e.y + 12, a = -PI / 2 + (Math.random() - 0.5) * 1.3; bullet(e, ox, oy, a, { pk: 'rocket', speed: 320, dmg: 24, life: 3.4, seek: 1.6, blast: 62, knock: 300, trail: 1, r: 6 }); CD.audio.play('throw'); }
        if (A.shots >= count && A.n < -0.7) { A.shots = 0; return true; } if (A.shots >= count) A.n -= dt;
        return false;
      },
      stomp(e, dt, A, ar, p, ph) {
        e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 }); e.face = Math.sign(p.cx - e.cx) || e.face;
        if (A.t < 0.9) { e.state = 'stomp'; e.atkK = A.t / 0.9 * 0.5; return false; }
        e.state = 'stomp'; e.atkK = 0.6 + Math.min(0.4, (A.t - 0.9) * 2);
        if (!A.done) { A.done = true; slamFx(e, e.cx + e.face * 40, 18); for (const s of [-1, 1]) shockwave(e, e.cx + e.face * 40, s, 18, { speed: 380 }); if (ph >= 2) CD.story.later(0.45, () => { if (!e.dead) for (const s of [-1, 1]) shockwave(e, e.cx + e.face * 40, s, 18, { speed: 380 }); }); if (overlapsPlayer(e.cx + e.face * 40 - 70, e.bottom - 50, 140, 50)) hurtIf(true, 26, { x: e.cx, kind: 'melee', knock: 420 }); }
        return A.t > 1.9;
      },
      beam(e, dt, A, ar, p) {
        e.vx = 0; CD.moveActor(e, dt, { gravity: 1800 }); e.face = Math.sign(p.cx - e.cx) || e.face; const eye = eyeOf(e);
        if (A.t < 1.5) { e.state = 'windup'; e.atkK = A.t / 1.5; A.lock = Math.atan2(p.cy - eye.y, p.cx - eye.x); A.tele = { x1: eye.x, y1: eye.y, x2: eye.x + Math.cos(A.lock) * 1400, y2: eye.y + Math.sin(A.lock) * 1400 }; return false; }
        if (A.t < 2.2) {
          e.state = 'fire'; e.atkK = 1; A.tele = { x1: eye.x, y1: eye.y, x2: eye.x + Math.cos(A.lock) * 1400, y2: eye.y + Math.sin(A.lock) * 1400, on: true };
          if (!A.done) { A.done = true; G.fx.shake(8, 0.6); CD.audio.play('explosion'); }
          const dx = Math.cos(A.lock), dy = Math.sin(A.lock), px = G.player.cx - eye.x, py = G.player.cy - eye.y, along = px * dx + py * dy, perp = Math.abs(px * dy - py * dx);
          if (along > 0 && perp < 30) hurtIf(true, 34, { x: eye.x, kind: 'bullet', knock: 300 });
          return false;
        }
        A.tele = null; return true;
      },
    },
    after(e, dt, A, ar, p) {
      clampArena(e, ar, 6); if (e.y + e.h > ar.floorY + 4) { e.y = ar.floorY - e.h; e.vy = 0; }
      if (A.mode === 'gatling') { /* vent after firing */ }
    },
  });
  // vent (overheat) window after every gatling burst: wrap the attack table
  const AIsentry = CD.AI.sentry;
  B.defs.sentry.drawExtra = function (e, ctx) {
    const a = e.bs; if (!a || !a.tele) return; const t = a.tele;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = t.on ? 'rgba(255,240,200,0.95)' : 'rgba(255,60,40,' + (0.35 + 0.25 * Math.sin(G.time * 30)) + ')'; ctx.lineWidth = t.on ? 26 : 2; if (!t.on) ctx.setLineDash([14, 10]);
    ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
    if (t.on) { ctx.strokeStyle = 'rgba(255,90,50,0.6)'; ctx.lineWidth = 46; ctx.stroke(); }
    ctx.restore();
  };
  // overheat: 'vent' state chained after gatling
  const attacks = null; void attacks; void AIsentry;
}

// ================================================================== BOSS 6: OVERSEER PRIME  (Cinder Deep)
B.define('overseer', {
  w: 110, h: 130, fly: true, hp: 4400, xp: 900, armor: 3, robot: true, metal: true, big: true, art: 'overseer', title: 'OVERSEER PRIME', intro: 'VAULT 213 CONTINUITY SYSTEM',
  blurb: 'A brighter tomorrow, whether you like it or not.', victory: 'The Overseer falls silent. For the first time in two hundred years, the vault is quiet.', capsReward: 600, introT: 3.4, aggro: 1400, contact: 0,
  light: { r: 300, c: [0.5, 1, 0.95], i: 0.7, f: 0.05 }, grants: [],
  onDefeat: { flag: 'boss_overseer', setObjective: 8, say: [['OVERSEER', 'Sleeper Seven. I have run six cycles and lost six. I did not think it would be the seventh that finished me.', 6]] },
  arena() { return { spawn: { tx: 0, ty: 0 }, gates: [] }; },
}, function () { });
B.defs.overseer.onDie = function (e) { B.defeat('overseer', e); };
B.defs.overseer.corpseRot = 0.28;      // the art has its own wrecked pose: keep it (roughly) upright when it crashes
{
  const hoverY = (e, ar) => ar.floorY - 270 + Math.sin(G.time * 1.4) * 14;
  CD.AI.overseer = makeAI({
    p2: 0.66, p3: 0.33,
    intro(e, dt, A, ar, p) { e.state = 'idle'; e.bs.mood = 0; e.bs.shield = 1; B.flyTo(e, dt, ar.cx, hoverY(e, ar), 160); e.face = Math.sign(p.cx - e.cx) || e.face; if (A.t > 0.6 && !A.l1) { A.l1 = 1; G.say('OVERSEER', 'Sleeper Seven! You have done so well. Please, put the core down. Gently. It is a very expensive core.', 5.5, '#ffb640'); } if (A.t > 2.4 && !A.l2) { A.l2 = 1; G.say('OVERSEER', 'I regret to inform you that I have decided to be firm.', 3.5, '#ffb640'); } },
    onPhase(e, ph, ar) { e.bs.mood = ph === 2 ? 0.55 : 1; G.say('OVERSEER', ph === 2 ? 'Please stop damaging vault property. This is your second warning. There is no third.' : 'FOUR THOUSAND LIVES, SLEEPER SEVEN. FOUR THOUSAND. AND YOU ARE THE ONLY ONE WHO WOKE UP WRONG.', 4.5, '#ffb640'); e.bs.shield = 0; },
    phaseAnim(e, dt, A, ar) { e.state = 'summon'; B.flyTo(e, dt, ar.cx, hoverY(e, ar) - 30, 200); e.bs.shield = 1; },
    idle(e, dt, A, ar, p, ph) {
      e.state = 'idle'; e.bs.shield = 0; e.face = Math.sign(p.cx - e.cx) || e.face;
      const tx = U.clamp(p.cx + Math.sin(G.time * 0.5) * 300, ar.lx + 90, ar.rx - 90); B.flyTo(e, dt, tx, hoverY(e, ar), ph === 3 ? 220 : 150);
    },
    pick(e, A, ar, p, ph) {
      const l = [['beams', 5], ['missiles', 3]];
      if (aliveSummons() < 3) { l.push(['drones', 4]); if (ph >= 2) l.push(['pods', 3]); }
      if (ph >= 2) l.push(['slam', 4]);
      if (ph >= 3) l.push(['sweep', 5]);
      return pickWeighted(avoidRepeat(A, l));
    },
    cooldown(ph) { return ph === 3 ? 0.6 : ph === 2 ? 0.9 : 1.3; },
    attacks: {
      beams(e, dt, A, ar, p, ph) {
        const n = ph === 1 ? 3 : ph === 2 ? 4 : 5; B.flyTo(e, dt, e.cx, hoverY(e, ar) - 20, 60);
        if (A.t < 0.2 && !A.cols) { A.cols = []; for (let i = 0; i < n; i++) A.cols.push(U.clamp(p.cx + (i - (n - 1) / 2) * 190 + (Math.random() - 0.5) * 60, ar.lx + 40, ar.rx - 40)); }
        const tele = 1.1, on = 0.5;
        if (A.t < tele) { e.state = 'windup'; e.atkK = A.t / tele; A.tele = { cols: A.cols, on: false, y0: ar.top, y1: ar.floorY }; }
        else if (A.t < tele + on) { e.state = 'beam'; e.atkK = 1; A.tele = { cols: A.cols, on: true, y0: ar.top, y1: ar.floorY }; if (!A.done) { A.done = true; G.fx.shake(8, 0.4); CD.audio.play('explosion'); }
          for (const cx of A.cols) if (overlapsPlayer(cx - 24, ar.top, 48, ar.floorY - ar.top)) hurtIf(true, 28, { x: cx, kind: 'bullet', knock: 260 }); }
        else { A.tele = null; return true; } return false;
      },
      sweep(e, dt, A, ar, p, ph) {
        // horizontal beam sweeping through jump height then floor height
        B.flyTo(e, dt, e.cx, hoverY(e, ar) - 20, 60);
        const tele = 1.0, dur = 2.2, base = ar.floorY - 34;
        if (A.t < tele) { e.state = 'windup'; e.atkK = A.t / tele; A.dirS = p.cx > ar.cx ? -1 : 1; A.yy = base; A.tele = { horiz: true, y: base, on: false, x0: ar.lx, x1: ar.rx }; }
        else if (A.t < tele + dur) { e.state = 'beam'; e.atkK = 1; const k = (A.t - tele) / dur; A.yy = base - Math.sin(k * PI) * 150; A.tele = { horiz: true, y: A.yy, on: true, x0: ar.lx, x1: ar.rx };
          if (overlapsPlayer(ar.lx, A.yy - 14, ar.w, 28)) hurtIf(true, 24, { x: p.cx, kind: 'bullet', knock: 180 }); }
        else { A.tele = null; return true; } return false;
      },
      drones(e, dt, A, ar, p) {
        B.flyTo(e, dt, ar.cx, hoverY(e, ar) - 40, 120); e.state = 'summon'; e.atkK = A.t / 1.4;
        if (!A.done && A.t > 0.9) { A.done = true; summon(e, 'eyebot', Math.floor(ar.lx / T) + 4, Math.floor(ar.floorY / T) - 5, { diff: 1.3 }); summon(e, 'eyebot', Math.floor(ar.rx / T) - 5, Math.floor(ar.floorY / T) - 5, { diff: 1.3 }); CD.audio.play('robot_alert'); G.say('OVERSEER', 'Maintenance drones, please assist the Sleeper. Vigorously.', 3.2, '#ffb640'); }
        return A.t > 1.8;
      },
      pods(e, dt, A, ar, p) {
        B.flyTo(e, dt, ar.cx, hoverY(e, ar) - 40, 120); e.state = 'summon'; e.atkK = A.t / 1.4;
        if (!A.done && A.t > 0.9) { A.done = true; summon(e, 'g', Math.floor(ar.lx / T) + 3, Math.floor(ar.floorY / T) - 1); summon(e, 'z', Math.floor(ar.rx / T) - 4, Math.floor(ar.floorY / T) - 1); CD.audio.play('roar'); G.say('OVERSEER', 'Some earlier guests have asked to say hello.', 3.2, '#ffb640'); }
        return A.t > 1.8;
      },
      missiles(e, dt, A, ar, p, ph) {
        B.flyTo(e, dt, e.cx, hoverY(e, ar), 60); e.state = 'windup'; e.atkK = 0.6; const count = ph === 3 ? 6 : 4;
        A.n -= dt; A.shots = A.shots || 0;
        if (A.t > 0.6 && A.n <= 0 && A.shots < count) { A.n = 0.3; A.shots++; const s = A.shots % 2 ? -1 : 1, ox = e.cx + s * 46, oy = e.cy + 10, a = Math.atan2(p.cy - oy, p.cx - ox) + (Math.random() - 0.5) * 0.9; bullet(e, ox, oy, a, { pk: 'rocket', speed: 360, dmg: 22, life: 3.2, seek: 1.4, blast: 56, knock: 280, trail: 1, r: 6 }); CD.audio.play('throw'); }
        if (A.shots >= count) { A.shots = 0; return A.t > 0.6 + count * 0.3 + 0.6; } return false;
      },
      slam(e, dt, A, ar, p, ph) {
        // hover above the player, dive to the floor, recover exposed
        e.bs.open = 0;
        if (A.t < 1.0) { e.state = 'windup'; e.atkK = A.t; B.flyTo(e, dt, p.cx, ar.floorY - 300, 320); A.dive = false; return false; }
        if (!A.dive && !A.rest) { A.dive = true; e.vx = 0; e.vy = 1100; CD.audio.play('roar'); }
        if (A.dive && !A.rest) { e.state = 'slam'; e.atkK = 0.7; e.vx *= 0.9; CD.AI._flyMove(e, dt, {}); if (overlapsPlayer(e.x, e.y, e.w, e.h, 8)) hurtIf(true, 30, { x: e.cx, kind: 'melee', knock: 460 });
          if (e.y + e.h >= ar.floorY - 16) { e.y = ar.floorY - e.h; e.vy = 0; A.rest = A.t; A.dive = false; slamFx(e, e.cx, 18); for (const s of [-1, 1]) shockwave(e, e.cx, s, 22, { speed: 400 }); } return false; }
        if (A.rest) { e.state = 'overload'; e.bs.open = Math.min(1, (A.t - A.rest) * 4); e.vulnMul = 1.9; e.vx = 0; e.vy = 0; if (Math.random() < 0.3) G.fx.spark(e.cx + (Math.random() - 0.5) * 50, e.cy - 20, 3, 0, -1, 1.4, 260); if (A.t - A.rest > (ph === 3 ? 1.6 : 2.2)) { e.bs.open = 0; return true; } }
        return false;
      },
    },
    after(e, dt, A, ar) { e.x = U.clamp(e.x, ar.lx + 10, ar.rx - 10 - e.w); e.y = U.clamp(e.y, ar.top, ar.floorY - e.h); e.bs.open = A.mode === 'slam' ? e.bs.open : 0; },
  });
  B.defs.overseer.drawExtra = function (e, ctx) {
    const a = e.bs; if (!a || !a.tele) return; const t = a.tele, ar = e.arena; ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (t.cols) for (const cx of t.cols) { if (t.on) { const gr = ctx.createLinearGradient(cx - 24, 0, cx + 24, 0); gr.addColorStop(0, 'rgba(255,60,40,0)'); gr.addColorStop(0.5, 'rgba(255,240,220,0.95)'); gr.addColorStop(1, 'rgba(255,60,40,0)'); ctx.fillStyle = gr; ctx.fillRect(cx - 24, t.y0, 48, t.y1 - t.y0); } else { ctx.strokeStyle = 'rgba(255,70,50,' + (0.3 + 0.3 * Math.sin(G.time * 30)) + ')'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(cx, t.y0); ctx.lineTo(cx, t.y1); ctx.stroke(); } }
    if (t.horiz) { if (t.on) { const gr = ctx.createLinearGradient(0, t.y - 14, 0, t.y + 14); gr.addColorStop(0, 'rgba(255,60,40,0)'); gr.addColorStop(0.5, 'rgba(255,240,220,0.95)'); gr.addColorStop(1, 'rgba(255,60,40,0)'); ctx.fillStyle = gr; ctx.fillRect(t.x0, t.y - 14, t.x1 - t.x0, 28); } else { ctx.strokeStyle = 'rgba(255,70,50,' + (0.3 + 0.3 * Math.sin(G.time * 30)) + ')'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(t.x0, t.y); ctx.lineTo(t.x1, t.y); ctx.stroke(); } }
    ctx.restore();
  };
}

// sentry: after each gatling burst the bot overheats and vents (vulnerable window)
{
  const base = CD.AI.sentry;
  CD.AI.sentry = function (e, dt, d) {
    const A = e.bs;
    if (A && A.mode === 'vent') {
      if (!e.arena) e.arena = arenaOf(e); A.t += dt; e.vulnMul = 2.0; e.state = 'vent'; e.bs.vent = Math.min(1, A.t * 3); e.vx = U.approach(e.vx, 0, 1400 * dt); CD.moveActor(e, dt, { gravity: 1800 });
      if (Math.random() < 0.5) G.fx.add({ t: 'smoke', x: e.cx + (Math.random() - 0.5) * 60, y: e.y + 30, vx: (Math.random() - 0.5) * 40, vy: -120, life: 0.7, max: 0.7, col: '220,230,230', size: 8, grow: 24, a: 0.5 });
      if (A.t > (A.phase === 3 ? 1.4 : 2.2)) { A.mode = 'idle'; A.t = 0; A.cool = 0.6; e.bs.vent = 0; e.state = 'idle'; }
      clampArena(e, e.arena, 6); return;
    }
    const before = A ? A.mode : null;
    base(e, dt, d);
    if (A && before === 'gatling' && A.mode === 'idle') { A.mode = 'vent'; A.t = 0; CD.audio.play('stimpak'); }
  };
}

})();
