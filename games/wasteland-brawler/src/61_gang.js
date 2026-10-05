// THE CHROME JACKALS: gang enemies (punk, spiker, knifer, torcher, bruiser, road raider) and the stage 1
// bosses SLAB (mid-boss) and BIG DIESEL. Everything lives in this IIFE; only ENEMY_TYPES and SFX entries
// are shared. Spawn contracts:
//   { type: 'raider', side: 'L'|'R', y: laneY, opts: { uturn } }   45f lane telegraph, then crosses the screen
//   { type: 'punk', opts: { sprint: true } }                          runs at the hero yelling "HEY!" (set piece)
//   { type: 'punk', opts: { helmet: true } }                          skull-helmet punk (an unseated rider)
(function gangModule() {
  'use strict';

  // ---------------------------------------------------------------- palette
  const C = {
    skin: '#c98b5a', vest: '#2a2a2e', stud: '#b8bec4', mohawk: '#ff7a1a', band: '#1a1a1a', jeans: '#5a3e8c', boots: '#1a1a1a',
    spMohawk: '#7be04a', spJeans: '#a8322e',
    kSkin: '#b07a50', poncho: '#4a4a3c', lens: '#ff3b30', blade: '#e8ecef', wraps: '#6a5a44', kPants: '#3a3428',
    mask: '#5a5a5a', amber: '#ffb030', canister: '#6a6a5a', coat: '#6b4a2b', bottle: '#3a7a3a', wick: '#ff8a1c', glove: '#2a2a2a',
    bSkin: '#b07a50', gogBand: '#2e2e2e', gogLens: '#ffd27a', apron: '#6e5236', tire: '#2b2b2b', bPants: '#4a4a3a',
    slabApron: '#3a2a20', chain: '#8a8a8a',
    dSkin: '#8a5a3e', overalls: '#2a2228', plate: '#3f4a3a', filter: '#9aa39a', stack: '#5c5c5c', cap: '#2a2a2a',
    handle: '#6a4a2a', hamHead: '#7a8088', cyl: '#4a4e54', smoke: '#2a2226', smokeHot: '#e2591e',
    helmet: '#e8e0d0', red: '#ff3b30', star: '#ffe14a',
  };
  const DIMS_KNIFER = Object.assign({}, DIMS_HUMAN, { fore: 9 });

  // ---------------------------------------------------------------- sounds (§11.3)
  function voiceEngine(a, p, f0, f1, dur, vol) {
    const c = a.ctx, now = c.currentTime, d = a.out(p);
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * a.pm, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * a.pm), now + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 2;
    const am = c.createGain(); am.gain.value = 0.55;
    const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 18;
    const lg = c.createGain(); lg.gain.value = 0.45;
    lfo.connect(lg); lg.connect(am.gain);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.04);
    g.gain.setValueAtTime(vol, now + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(lp); lp.connect(am); am.connect(g); g.connect(d);
    o.start(now); o.stop(now + dur + 0.02); lfo.start(now); lfo.stop(now + dur + 0.02);
  }
  // "HEY!": sawtooth 220 Hz through two bandpasses (700 / 1200 Hz), 120 ms.
  SFX.gangHey = (a, p) => {
    const c = a.ctx, now = c.currentTime, d = a.out(p);
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(200 * a.pm, now);
    o.frequency.linearRampToValueAtTime(250 * a.pm, now + 0.04);
    o.frequency.linearRampToValueAtTime(210 * a.pm, now + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.5, now + 0.012);
    g.gain.setValueAtTime(0.5, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    for (const f of [700, 1200]) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 3;
      o.connect(bp); bp.connect(g);
    }
    g.connect(d);
    o.start(now); o.stop(now + 0.15);
  };
  // Grunt: sawtooth 140-220 Hz -> bandpass 800 Hz, 90 ms, pitch -30%.
  SFX.gangGrunt = (a, p) => {
    const c = a.ctx, now = c.currentTime, d = a.out(p);
    const f = (140 + Math.random() * 80) * 0.7 * a.pm;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, now); o.frequency.exponentialRampToValueAtTime(f * 0.75, now + 0.09);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.45, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    o.connect(bp); bp.connect(g); g.connect(d);
    o.start(now); o.stop(now + 0.1);
  };
  // Engine: sawtooth 55 -> 110 Hz, 18 Hz amplitude LFO, panned by screen x (Sound.sfx pans by x).
  SFX.gangEngine = (a, p) => voiceEngine(a, p, 55, 110, 0.2, 0.22);
  SFX.gangRev = (a, p) => voiceEngine(a, p, 50, 150, 0.8, 0.26);
  // Boss whistle: two-finger "FWEET-FWEEO".
  SFX.gangWhistle = (a, p) => {
    const d = a.out(p);
    a.tone(2100, 2700, 0.14, 'sine', 0.22, 0, d, 0.01);
    a.tone(2700, 1800, 0.3, 'sine', 0.22, 0.17, d, 0.01);
  };
  // Wrecking Spin wind-up: rising whistle.
  SFX.gangSpinUp = (a, p) => a.tone(380, 1500, 0.34, 'sine', 0.14, 0, a.out(p), 0.02);
  // Molotov shatter: noise -> highpass 3 kHz 120 ms, plus sines 2400 + 3100 Hz 150 ms.
  SFX.gangShatter = (a, p) => {
    const d = a.out(p);
    a.noise(0.12, 0.45, 3000, 0.8, 'highpass', 0, d);
    a.tone(2400, 0, 0.15, 'sine', 0.1, 0, d); a.tone(3100, 0, 0.15, 'sine', 0.08, 0, d);
  };
  // Exhaust sputter: three low pops.
  SFX.gangSputter = (a, p) => {
    const d = a.out(p);
    for (let i = 0; i < 3; i++) { a.noise(0.06, 0.35, 260, 1, 'lowpass', i * 0.11, d); a.tone(80, 40, 0.06, 'sine', 0.3, i * 0.11, d); }
  };
  if (!SFX.hey) SFX.hey = SFX.gangHey;
  if (!SFX.grunt) SFX.grunt = SFX.gangGrunt;

  // ---------------------------------------------------------------- shared helpers
  const alivePlayer = () => { const p = Game.player; return p && !Game.playerGone && p.hp > 0 && p.state !== 'down' && p.state !== 'getup' ? p : null; };

  // Walk toward (tx, ty) with separate x / depth speeds.
  function move(e, tx, ty, sx, sy) {
    const dx = tx - e.x, dy = ty - e.y;
    e.vx = Math.abs(dx) > 2 ? sign(dx) * Math.min(sx, Math.abs(dx)) : 0;
    e.vy = Math.abs(dy) > 1 ? sign(dy) * Math.min(sy, Math.abs(dy)) : 0;
    if (e.vx || e.vy) { if (e.state !== 'walk') e.setState('walk'); }
    else if (e.state !== 'idle') e.setState('idle');
  }
  const laneY = y => clamp(y, Game.bounds.yMin, Game.bounds.yMax);

  // A point along the torso: k = 0 hip .. 1 shoulder, o = px forward of the spine.
  function tq(R, k, o) {
    const ux = dirX(R.tTh), uy = dirY(R.tTh);
    return { x: lerp(R.H.x, R.S.x, k) - uy * o, y: lerp(R.H.y, R.S.y, k) + ux * o };
  }
  // Point the engine's glint at the striking limb (local sprite coords).
  function markGlint(e, x, y) { if (e.state === 'attack' && e.atk) e.atk.glint = [Math.round(x), Math.round(y)]; }
  function remember(e, key, x, y) { e[key] = { x, y }; }
  // Local sprite coords -> world (x, z).
  function toWorld(e, lx, ly) { return { x: e.x + e.facing * lx, z: e.z - ly }; }

  // §4.2(b) red rim: a 1px #FF3B30 outline, 4f on / 4f off, during the last 10 wind-up frames of attacks that deal
  // >= 12, knock down or grab. Re-uses the sprite still sitting in the scratch canvas.
  function redRim(e, ctx, camX) {
    const s = Sprite.cur;
    if (!s) return;
    const gb = s.gb;
    gb.save();
    gb.setTransform(1, 0, 0, 1, 0, 0);
    gb.globalCompositeOperation = 'copy'; gb.drawImage(s.a, -1, 0);
    gb.globalCompositeOperation = 'source-over'; gb.drawImage(s.a, 1, 0); gb.drawImage(s.a, 0, -1); gb.drawImage(s.a, 0, 1);
    gb.globalCompositeOperation = 'destination-out'; gb.drawImage(s.a, 0, 0);
    gb.globalCompositeOperation = 'source-in'; gb.fillStyle = C.red; gb.fillRect(0, 0, s.w, s.h);
    gb.restore();
    ctx.save();
    ctx.translate(Math.round(e.x - camX + e.jitter), Math.round(e.y - e.z));
    if (e.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(s.b, -s.ox, -s.oy);
    ctx.restore();
    Px.use(ctx);
  }
  function rimNow(e) {
    const a = e.telegraphing();
    if (!a || !a.rim) return false;
    const left = a.start - e.t;
    return left <= 10 && ((left >> 2) & 1) === 0;
  }
  function star4(x, y, s, c = '#ffffff') {
    Px.rect(x - s, y, s * 2 + 1, 1, c);
    Px.rect(x, y - s, 1, s * 2 + 1, c);
    if (s >= 3) { Px.dot(x - 1, y - 1, c); Px.dot(x + 1, y - 1, c); Px.dot(x - 1, y + 1, c); Px.dot(x + 1, y + 1, c); }
  }
  // Common overlay: red rim, dizzy stars.
  function gangOverlay(e, ctx, camX) {
    if (rimNow(e)) redRim(e, ctx, camX);
    if (e.state === 'dizzy' && e.alive) {
      Px.use(ctx);
      const cx = e.x - camX, cy = e.y - e.z - e.h - 6;
      for (let i = 0; i < 3; i++) {
        const a = e.t * 0.15 + i * TAU / 3;
        star4(Math.round(cx + Math.cos(a) * 9), Math.round(cy + Math.sin(a) * 3), 1, C.star);
      }
    }
  }
  // §4.2(a) gang family sound on the glint frame.
  function gangTick(e, a, ph) {
    if (ph === 'start' && a.tell === 'glint' && e.t === Math.max(1, a.start - 6)) Sound.sfx('shout', e.x);
  }
  // Pose picker: custom idle + extra states, engine poses for the rest.
  function humanPose(e, idle, atkPose, extra) {
    if (extra && extra[e.state]) return extra[e.state](e);
    if (e.state === 'idle') return idle(e);
    return enemyHumanPose(e, atkPose);
  }
  function hurtGrunt(e, a) { if ((a.tier || 1) >= 2 && e.alive && chance(0.5)) Sound.sfx('gangGrunt', e.x); }
  function retreatThink(e, p, k = 0.7) {
    e.face(p);
    move(e, e.x - sign(p.x - e.x || 1) * 40, e.y + e.slot.dy * 0.2, e.speed * k, e.speed * 0.6 * k);
    if (e.aiT > (e.def.retreatT || 24)) { e.ai = 'approach'; e.aiT = 0; }
  }
  const dropItem = (e, kind) => { const it = Game.add(new Item(kind, e.x, e.y + 1, 2.2)); it.vx = rr(-0.5, 0.5); };

  // ---------------------------------------------------------------- 1. JACKAL PUNK / 1b. SPIKER
  const PUNK_NAMES = ['SKAG', 'GRIT', 'VERMIN', 'RATCHET', 'DUSTY'];
  const SPIKER_NAMES = ['SPIKE', 'BARB', 'RIVET'];

  function punkHead(e, look) {
    return (Hd, th, s) => {
      const x = Math.round(Hd.x), y = Math.round(Hd.y);
      const skin = C.skin, dk = shade(skin, -0.22);
      if (look.helmet) {
        // skull helmet: bone dome, two eye holes, jaw ridge
        Px.oval(x, y - 1, 5, 5.2, C.helmet);
        Px.rect(x - 4, y - 4, 4, 2, shade(C.helmet, 0.3));
        Px.rect(x + 1, y - 2, 2, 2, '#1a1414'); Px.rect(x + 4, y - 2, 1, 2, '#1a1414');
        Px.rect(x + 2, y + 1, 3, 1, '#1a1414');
        Px.rect(x - 1, y + 3, 6, 1, shade(C.helmet, -0.3));
        Px.rect(x - 5, y, 2, 3, shade(C.helmet, -0.25));
        return;
      }
      // mohawk: 5 swept triangles (one pops off on a KO)
      const n = e.dying ? 4 : 5;
      for (let i = 0; i < n; i++) {
        const bx = x - 4 + i * 1.8, h = [4, 5, 6, 5.5, 4.5][i];
        Px.poly([bx - 1.4, y - 2.5, bx - 0.8, y - 3 - h, bx + 1.8, y - 2.5], i % 2 ? shade(look.hair, -0.28) : look.hair);
      }
      Px.oval(x, y, 4.2, 4.7, skin);
      Px.rect(x - 4, y - 1, 2, 4, dk);               // back of the head in shadow
      Px.rect(x - 1, y + 2, 5, 2, dk);               // jaw
      Px.rect(x - 2, y - 2, 7, 2, C.band);           // eye band
      Px.dot(x + 3, y - 2, '#c8c0b0');
      Px.dot(x + 4, y + 1, skin);                    // nose
      Px.rect(x + 2, y + 3, 2, 1, '#6a3020');        // sneer
      Px.dot(x - 3, y, shade(skin, -0.4));           // ear
    };
  }
  function punkStyle(e, look) {
    const s = look.s || 0.91;
    return {
      s, skin: C.skin, top: C.vest, sleeve: C.skin, arm: C.skin, pants: look.pants, boots: C.boots, belt: '#3a2418',
      hipW: 9, shW: 12, limbW: 5,
      torso(R) {
        // open vest over a bare chest, lit back edge, 3 studs
        const a = tq(R, 0.3, 3.8), b = tq(R, 1.0, 5.6), c = tq(R, 1.0, 1.2);
        Px.poly([a.x, a.y, b.x, b.y, c.x, c.y], C.skin);
        const l0 = tq(R, 0.1, -4.2), l1 = tq(R, 0.95, -5.6);
        Px.line(l0.x, l0.y, l1.x, l1.y, 1, shade(C.vest, 0.25));
        for (const k of [0.42, 0.6, 0.78]) { const p = tq(R, k, 1.6); Px.dot(p.x, p.y, C.stud); }
      },
      head: punkHead(e, look),
      hand(Hn, ang, s2, R) {
        Px.disc(Hn.x, Hn.y, 1.9, C.skin);
        remember(e, 'gang_fist', Hn.x, Hn.y);
        if (look.wrist) {
          const E = R.fa.E, w = { x: lerp(E.x, Hn.x, 0.7), y: lerp(E.y, Hn.y, 0.7) };
          const ux = dirX(ang), uy = dirY(ang);
          Px.line(w.x - uy * 2, w.y + ux * 2, w.x + uy * 2, w.y - ux * 2, 2, '#3a3a3e');
          for (const o of [-2.5, 0, 2.5]) {
            const bx = w.x + ux * o, by = w.y + uy * o;
            Px.poly([bx - uy * 1.5 - ux, by + ux * 1.5 - uy, bx - uy * 4.5, by + ux * 4.5, bx - uy * 1.5 + ux, by + ux * 1.5 + uy], C.stud);
          }
        }
      },
      backHand(Hn) { Px.disc(Hn.x, Hn.y, 1.8, shade(C.skin, -0.32)); },
      after(R) {
        // near shoulder pad: 3 steel triangles
        const px = R.S.x - 1, py = R.S.y + 2;
        Px.poly([px - 3, py + 1, px - 2.5, py - 3, px, py], shade(C.stud, -0.15));
        Px.poly([px - 1, py, px + 0.5, py - 4, px + 2, py], shade(C.stud, 0.2));
        Px.poly([px + 1, py + 1, px + 3.5, py - 2, px + 3, py + 2], shade(C.stud, -0.3));
        remember(e, 'gang_foot', R.fl.F.x, R.fl.F.y);
        remember(e, 'gang_headP', R.Hd.x, R.Hd.y);
      },
    };
  }
  const punkIdle = e => {
    const b = Math.sin(e.anim * 0.14);
    return pose({ hy: -20 + b * 0.7, rot: 0.12, fThigh: 0.28, fKnee: -0.32, bThigh: -0.28, bKnee: -0.22,
      fUpper: 0.75 + b * 0.08, fElbow: 1.9, bUpper: 0.45, bElbow: 2.2, head: 0.06 });
  };
  const PUNK_ATK = {
    hay(ph, t) {
      if (ph === 'start') {
        const k = clamp(t / 8, 0, 1);
        return pose({ hx: -1.5 * k, rot: -0.17 * k, fThigh: 0.25, fKnee: -0.3, bThigh: -0.4, bKnee: -0.25,
          fUpper: lerp(0.7, -2.2, k), fElbow: lerp(1.8, -1.3, k), bUpper: lerp(0.45, 1.1, k), bElbow: lerp(2.1, 1.3, k), head: 0.12 * k });
      }
      if (ph === 'active') return pose({ hx: 2.5, rot: 0.34, fThigh: 0.55, fKnee: -0.35, bThigh: -0.55, bKnee: -0.08, fUpper: 1.65, fElbow: 0.12, bUpper: 0.1, bElbow: 1.6, head: -0.1 });
      return pose({ hx: 1.5, rot: 0.4, fThigh: 0.5, fKnee: -0.4, bThigh: -0.45, bKnee: -0.15, fUpper: 0.85, fElbow: 0.45, bUpper: 0.2, bElbow: 1.7, head: -0.15 });
    },
    kick(ph, t, a) {
      if (ph === 'start') {
        const scrape = Math.sin(t * 0.9) * 0.15;
        return pose({ hy: -17, rot: 0.38, fThigh: 0.75, fKnee: -1.25, bThigh: -0.75 + scrape, bKnee: -0.5, fUpper: 1.0, fElbow: 1.5, bUpper: -0.7, bElbow: 1.1, head: -0.25 });
      }
      if (ph === 'active') return pose({ hx: 1, hy: -12, rot: -0.55, fThigh: 0.95, fKnee: -0.05, bThigh: -0.2, bKnee: -1.6, fUpper: 0.9, fElbow: 1.2, bUpper: -1.6, bElbow: 0.3, head: 0.35 });
      const w = Math.sin(t * 0.5) * 0.15;
      return pose({ hy: -18, rot: 0.42 + w, fThigh: 0.6, fKnee: -0.6, bThigh: -0.55, bKnee: -0.45, fUpper: 1.5, fElbow: 0.3, bUpper: -0.9 - w, bElbow: 0.6, head: -0.2 });
    },
  };
  const PUNK_EXTRA = {
    sprint: e => Poses.run(e.anim * 1.4),
    // "HEY!": arms flung up in a V, bouncing
    taunt: e => {
      const k = Math.sin(e.t * 0.45);
      return pose({ hy: -20 + Math.abs(k) * 1.2, rot: -0.12, fThigh: 0.3, fKnee: -0.2, bThigh: -0.3, bKnee: -0.2,
        fUpper: 1.9 + k * 0.15, fElbow: 1.05, bUpper: -1.95 - k * 0.15, bElbow: -1.15, head: -0.3 });
    },
  };
  function drawPunk(e, look) {
    const p = humanPose(e, punkIdle, (ph, t, a) => (PUNK_ATK[a.key] || PUNK_ATK.hay)(ph, t, a), PUNK_EXTRA);
    drawHumanoid(p, punkStyle(e, look));
    if (e.atk && e.state === 'attack') {
      if (e.atk.key === 'kick') { if (e.gang_foot) markGlint(e, e.gang_foot.x + 3, e.gang_foot.y); }
      else if (e.gang_fist) markGlint(e, e.gang_fist.x, e.gang_fist.y);
    }
  }
  function punkThink() {
    const p = alivePlayer();
    if (this.gang_taunt) {
      this.gang_taunt = false;
      this.setState('taunt'); this.tauntT = 40; this.vx = this.vy = 0;
      Sound.sfx('gangHey', this.x);
      FX.text(this.x, this.y, this.h + 14, 'HEY!', '#ffe08a', 40);
      return;
    }
    if (p && this.opts.sprint && !this.gang_sprinted) {
      this.gang_sprinted = true;
      this.setState('sprint');
      Sound.sfx('gangHey', this.x);
      FX.text(this.x, this.y, this.h + 14, 'HEY!', '#ffe08a', 40);
      return;
    }
    Enemy.prototype.meleeThink.call(this);
  }
  function punkStateUpdate() {
    if (this.state === 'sprint') {
      const p = alivePlayer();
      if (!p || this.t > 240) { this.setState('idle'); return true; }
      this.face(p);
      this.vx = this.facing * 2.4; this.vy = clamp(p.y - this.y, -0.6, 0.6);
      if (this.t % 8 === 0) FX.dust(this.x - this.facing * 4, this.y, 1, 0.6);
      if (Math.abs(p.x - this.x) < 50) { this.setState('idle'); this.vx = 0; }
      return true;
    }
    return false;
  }
  function punkTick(a, ph) {
    gangTick(this, a, ph);
    if (a.key === 'kick' && ph === 'start' && this.t % 3 === 0) FX.dust(this.x - this.facing * 8, this.y, 1, 0.5);
    if (a.key === 'kick' && ph === 'active' && this.t % 3 === 0) FX.dust(this.x - this.facing * 2, this.y, 1, 0.8);
    // a whiffed attack: 15% chance of a "HEY!" taunt
    if (ph === 'rec' && this.t === a.start + a.active + a.rec - 1 && !(this.atkHit && this.atkHit.size) && chance(0.15)) this.gang_taunt = true;
  }
  function punkPattern(adx, ady) {
    if (ady > 6) { this.gang_kickRoll = undefined; return null; }
    if (adx <= 26) { this.gang_kickRoll = undefined; return 'hay'; }
    // Running Kick: rolled (30%) once on entering the 60-90 px band; the 48 px slide + 22 px reach only connects
    // from <= 76 px, so a successful roll keeps closing in until then.
    if (adx >= 60 && adx <= 90 && this.gang_kickRoll === undefined) this.gang_kickRoll = chance(0.3);
    if (this.gang_kickRoll && adx >= 50 && adx <= 76) { this.gang_kickRoll = undefined; return 'kick'; }
    if (adx >= 50 && adx <= 90) return null;
    this.gang_kickRoll = undefined;
    return null;
  }
  function punkDef(o) {
    const look = o.look;
    return {
      name: 'PUNK', family: 'gang', hp: o.hp, speed: 1.1, w: 8, h: 40, score: o.score, downTime: 40, range: 22, gear: look.hair,
      sprite: [112, 96, 56, 88],
      attacks: {
        hay: { start: 12, active: 3, rec: 18, dmg: 6 + o.dmg, tier: 2, kb: 1.6, stun: 20, reach: [4, 26], zr: [14, 38], depth: 8, tell: 'glint', whiff: 'whoosh' },
        kick: { start: 10, active: 16, rec: 18, dmg: 8 + o.dmg, tier: 2, knock: true, kx: 2.4, kz: 2.8, reach: [2, 22], zr: [0, 20], depth: 8,
          tell: 'glint', danger: 'line', dangerLen: 70, selfVx: 3.0, whiff: 'whoosh', rim: true },
      },
      melee: 'hay',
      init(opts) {
        this.name = pick(o.names);
        this.coolMul = o.coolMul || 1;
        this.gang_look = Object.assign({}, look, { helmet: !!(opts && opts.helmet) });
        if (opts && opts.helmet) this.def = Object.assign({}, this.def, { gear: C.helmet });
      },
      pattern: punkPattern,
      think: punkThink,
      stateUpdate: punkStateUpdate,
      attackTick: punkTick,
      onHurt(src, a) { hurtGrunt(this, a); },
      drawBody() { drawPunk(this, this.gang_look); },
      drawExtra(ctx, camX) { gangOverlay(this, ctx, camX); },
      eyes() { const h = this.gang_headP || { x: 1, y: -37 }; return [[Math.round(h.x) + 2, Math.round(h.y) - 2, '#ffe8a0'], [Math.round(h.x) + 4, Math.round(h.y) - 2, '#ffe8a0']]; },
    };
  }
  ENEMY_TYPES.punk = punkDef({ hp: 24, score: 300, dmg: 0, names: PUNK_NAMES, look: { hair: C.mohawk, pants: C.jeans } });
  ENEMY_TYPES.spiker = punkDef({ hp: 32, score: 400, dmg: 2, coolMul: 0.8, names: SPIKER_NAMES, look: { hair: C.spMohawk, pants: C.spJeans, wrist: true } });
  ENEMY_TYPES.spiker.name = 'SPIKER';

  // ---------------------------------------------------------------- 2. JACKAL BLADE "Knifer"
  function knifeStyle(e) {
    const s = 0.955;
    return {
      s, dims: DIMS_KNIFER, skin: C.kSkin, top: C.kPants, sleeve: C.kSkin, arm: C.kSkin, pants: C.kPants, shin: C.wraps, boots: '#2a2018',
      hipW: 7, shW: 10, limbW: 4.4,
      torso(R) {
        // poncho: a cloak triangle from the neck down over the torso
        const n = tq(R, 1.05, 0), f = tq(R, 0.12, 7), b = tq(R, 0.05, -8);
        Px.poly([n.x, n.y - 1, f.x, f.y, b.x, b.y], C.poncho);
        const m = tq(R, 0.12, 0);
        Px.line(n.x, n.y, m.x, m.y + 1, 1, shade(C.poncho, -0.3));
        const f2 = tq(R, 0.18, 6);
        Px.line(n.x + 1, n.y, f2.x, f2.y, 1, shade(C.poncho, 0.2));
        // fringe
        for (let i = 0; i < 4; i++) { const p = tq(R, 0.08, -6 + i * 4); Px.rect(p.x, p.y, 1, 2, shade(C.poncho, -0.2)); }
      },
      head(Hd) {
        const x = Math.round(Hd.x), y = Math.round(Hd.y);
        Px.oval(x, y, 4, 4.6, C.kSkin);
        // hood
        Px.poly([x - 5, y + 3, x - 5, y - 2, x - 2, y - 5, x + 3, y - 5, x + 4, y - 3, x - 2, y - 3, x - 3, y + 3], C.poncho);
        Px.rect(x - 3, y - 4, 6, 1, shade(C.poncho, 0.2));
        // mouth wrap
        Px.rect(x, y + 1, 5, 3, C.wraps);
        // goggles: two 2x2 red lenses (one lost on a KO)
        Px.rect(x - 1, y - 2, 6, 1, '#1a1a1a');
        Px.rect(x + 2, y - 2, 2, 2, C.lens);
        if (!e.dying) Px.rect(x + 4, y - 2, 2, 2, shade(C.lens, -0.2));
        Px.dot(x + 2, y - 2, '#ffd0c8');
        remember(e, 'gang_headP', x, y);
      },
      hand(Hn, ang, s2, R) {
        Px.disc(Hn.x, Hn.y, 1.7, C.kSkin);
        // knife: an 8x2 triangle along the forearm
        const ux = dirX(ang), uy = dirY(ang);
        const tipx = Hn.x + ux * 9, tipy = Hn.y + uy * 9;
        Px.poly([Hn.x + ux * 1 - uy * 1.2, Hn.y + uy * 1 + ux * 1.2, tipx, tipy, Hn.x + ux * 1 + uy * 1.2, Hn.y + uy * 1 - ux * 1.2], C.blade);
        Px.line(Hn.x - ux * 1, Hn.y - uy * 1, Hn.x + ux * 1, Hn.y + uy * 1, 2, '#3a2a1a');
        remember(e, 'gang_tip', tipx, tipy);
      },
      after(R) { remember(e, 'gang_headP', R.Hd.x, R.Hd.y); },
    };
  }
  const knifeIdle = e => {
    const b = Math.sin(e.anim * 0.1);
    return pose({ hy: -18 + b * 0.5, rot: 0.25, fThigh: 0.5, fKnee: -0.85, bThigh: -0.45, bKnee: -0.5,
      fUpper: 0.85 + b * 0.05, fElbow: 1.0, bUpper: 0.5, bElbow: 1.7, head: -0.05 });
  };
  const KNIFE_ATK = {
    lunge(ph, t, a) {
      if (ph === 'start') {
        const k = clamp(t / 6, 0, 1);
        return pose({ hy: lerp(-18, -15.5, k), rot: lerp(0.25, 0.35, k), fThigh: 0.7, fKnee: -1.25, bThigh: -0.55, bKnee: -0.75,
          fUpper: lerp(0.85, -0.9, k), fElbow: lerp(1.0, 2.2, k), bUpper: lerp(0.5, 1.3, k), bElbow: lerp(1.7, 0.5, k), head: -0.1 });
      }
      if (ph === 'active') return pose({ hx: 3, hy: -17, rot: 0.62, fThigh: 1.05, fKnee: -0.45, bThigh: -1.0, bKnee: -0.15, fUpper: 1.55, fElbow: 0.05, bUpper: -1.0, bElbow: 0.4, head: -0.25 });
      const w = Math.sin(t * 0.45);
      return pose({ hx: 1, hy: -17, rot: 0.7 + w * 0.12, fThigh: 0.8, fKnee: -0.9, bThigh: -0.6, bKnee: -0.5, fUpper: 0.6 + w * 0.3, fElbow: 0.7, bUpper: -1.3 - w * 0.3, bElbow: 0.8, head: -0.45 });
    },
  };
  const KNIFE_EXTRA = { hop: e => Poses.jump(e.vz) };
  function knifeThink() {
    const p = alivePlayer();
    if (!p) { this.circle(Game.player, 1.2); return; }
    const dx = p.x - this.x, dy = p.y - this.y, adx = Math.abs(dx), ady = Math.abs(dy);
    this.face(p);
    // Hop Back: Juno within 30 px, 40% per 30 f
    if (adx < 30 && ady < 12 && this.aiT - (this.gang_hopT || -99) >= 30) {
      this.gang_hopT = this.aiT;
      if (chance(0.4)) {
        this.dropToken();
        this.setState('hop'); this.vz = 3.0; this.z = 0.1; this.vx = -sign(dx || 1) * 2.5; this.vy = 0;
        Sound.sfx('whoosh', this.x);
        return;
      }
    }
    if (this.ai === 'retreat') { retreatThink(this, p, 0.8); return; }
    if (this.cool <= 0 && this.onScreen() && this.takeToken()) {
      if (adx >= 46 && adx <= 76 && ady <= 6) { this.vx = this.vy = 0; this.attack('lunge'); return; }
      move(this, p.x - sign(dx || 1) * 62, p.y, 1.4, 1.0);
      if (this.aiT > 200) { this.dropToken(); this.cool = 30; this.aiT = 0; }
      return;
    }
    // hold 70-100 px away, strafing in depth
    const hold = this.gang_hold || (this.gang_hold = rr(70, 100));
    const tx = clamp(p.x - sign(dx || 1) * hold, Game.cam.x + 16, Game.cam.x + W - 16);
    const ty = laneY(p.y + Math.sin(this.aiT * 0.035 + this.id) * 14);
    if (Math.abs(this.x - tx) > 6 || Math.abs(this.y - ty) > 3) move(this, tx, ty, 1.4 * 0.75, 1.0);
    else { this.vx = this.vy = 0; if (this.state !== 'idle') this.setState('idle'); }
  }
  ENEMY_TYPES.knifer = {
    name: 'KNIFER', family: 'gang', hp: 22, speed: 1.4, w: 7, h: 42, score: 400, downTime: 40, gear: C.lens,
    sprite: [112, 96, 56, 88],
    attacks: {
      lunge: { start: 18, active: 14, rec: 26, dmg: 10, tier: 2, kb: 1.8, stun: 22, reach: [0, 16], zr: [10, 34], depth: 8,
        tell: 'glint', danger: 'line', dangerLen: 63, selfVx: 4.5, whiff: 'whoosh' },
    },
    melee: 'lunge',
    init() { this.name = pick(['SHIV', 'NEEDLE', 'ZIP']); },
    think: knifeThink,
    stateUpdate() {
      if (this.state === 'hop') {
        if (this.z <= 0 && this.t > 3) { this.setState('idle'); this.vx = 0; FX.dust(this.x, this.y, 2, 0.8); }
        return true;
      }
      return false;
    },
    attackTick(a, ph) {
      // glint on wind-up frames 8..18 with a knife "shing"
      if (ph === 'start' && this.t === 8) Sound.sfx('shingKnife', this.x);
      if (ph === 'start' && this.t === Math.max(1, a.start - 6)) Sound.sfx('shout', this.x);
      if (ph === 'active' && this.t % 2 === 0) FX.dust(this.x - this.facing * 4, this.y, 1, 0.6);
      if (ph === 'rec' && this.t === a.start + a.active + 1) FX.dust(this.x, this.y, 3, 1.0);
    },
    onHurt(src, a) { hurtGrunt(this, a); },
    drawBody() {
      const p = humanPose(this, knifeIdle, (ph, t, a) => KNIFE_ATK.lunge(ph, t, a), KNIFE_EXTRA);
      drawHumanoid(p, knifeStyle(this));
      if (this.gang_tip) markGlint(this, this.gang_tip.x, this.gang_tip.y);
    },
    drawExtra(ctx, camX) {
      gangOverlay(this, ctx, camX);
      const a = this.telegraphing();
      if (a && this.t >= 8 && this.gang_tip) {
        Px.use(ctx);
        const gx = Math.round(this.x - camX + this.facing * this.gang_tip.x), gy = Math.round(this.y - this.z + this.gang_tip.y);
        star4(gx, gy, 1 + (this.t >> 1) % 3, '#ffffff');
      }
    },
    eyes() { const h = this.gang_headP || { x: 2, y: -40 }; return [[Math.round(h.x) + 2, Math.round(h.y) - 2, C.lens], [Math.round(h.x) + 3, Math.round(h.y) - 2, C.lens], [Math.round(h.x) + 4, Math.round(h.y) - 2, C.lens]]; },
  };

  // ---------------------------------------------------------------- 3. TORCHER
  // Molotov bottle: a hostile Proj (kind 'molotov') that draws its own growing landing ellipse under the actors.
  // (built lazily: Proj is declared by 70_objects.js, which loads after this module)
  let MolotovClass = null;
  function molotovClass() {
    if (MolotovClass) return MolotovClass;
    MolotovClass = class GangMolotov extends Proj {
      constructor(x, y, z, o) { super(x, y, z, o); this.n = o.n || 36; this.tx = o.tx; this.ty = o.ty; }
      burst() {
        Sound.sfx('gangShatter', this.x);
        super.burst();
        FX.shards(this.x, this.y, 3, 4, ['#4a7a3a', '#8ac87a', '#2a4a22']);
      }
      drawMarker(ctx, camX) {
        if (this.remove) return;
        const k = clamp(this.t / this.n, 0, 1);
        const r = lerp(6, 20, k);
        Px.use(ctx);
        ctx.globalAlpha = 0.18 + 0.12 * k;
        Px.oval(this.tx - camX, this.ty, r, r * 0.35, C.red);
        ctx.globalAlpha = 0.55 + 0.35 * k;
        ctx.strokeStyle = C.red; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(Math.round(this.tx - camX), Math.round(this.ty), r, r * 0.35, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    };
    return MolotovClass;
  }
  function torchStyle(e) {
    const s = 0.91;
    const lobbing = e.state === 'attack' && e.atk && e.atk.key === 'lob';
    const holding = lobbing && e.atkPhase() === 'start';
    return {
      s, skin: '#a87a58', top: C.coat, sleeve: C.coat, arm: C.coat, pants: '#3a3230', shin: '#3a3230', boots: '#2a2020', glove: C.glove,
      hipW: 10, shW: 12, limbW: 5,
      torso(R) {
        // bandolier of 4 bottles across the chest
        const a = tq(R, 0.98, 4.5), b = tq(R, 0.12, -5);
        Px.line(a.x, a.y, b.x, b.y, 2, '#3a2a1a');
        for (let i = 0; i < 4; i++) {
          const k = 0.15 + i * 0.22;
          const bx = lerp(a.x, b.x, k), by = lerp(a.y, b.y, k);
          if (holding && i === 0) continue;
          Px.rect(bx - 1, by - 3, 2, 4, C.bottle);
          Px.dot(bx, by - 4, C.wick);
        }
        const c0 = tq(R, 0.95, 5.5), c1 = tq(R, 0.3, 4.5);
        Px.line(c0.x, c0.y, c1.x, c1.y, 1, shade(C.coat, 0.25));   // coat lapel
      },
      head(Hd, th, s2, R) {
        // duster skirt down to the knees (drawn here so it covers the near thigh but not the arm)
        const hb = tq(R, 0.1, -5.5), hf = tq(R, 0.1, 5);
        const kf = R.fl.K, kb = R.bl.K;
        const fl = Math.sin(e.anim * 0.2) * (e.state === 'walk' ? 2 : 0.6);
        const fx = Math.max(kf.x, kb.x) + 2.5, bx = Math.min(kf.x, kb.x) - 3.5 - fl;
        const ky = Math.max(kf.y, kb.y) + 1;
        Px.poly([hb.x, hb.y, hf.x, hf.y, fx, ky, bx, ky + 1], C.coat);
        Px.line(lerp(hb.x, hf.x, 0.45), hb.y + 2, lerp(bx, fx, 0.45), ky, 1, shade(C.coat, -0.3));
        Px.line(bx, ky + 1, fx, ky, 1, shade(C.coat, -0.25));
        // gas-mask head
        const x = Math.round(Hd.x), y = Math.round(Hd.y);
        Px.disc(x, y, 5, C.mask);
        Px.rect(x - 5, y - 1, 3, 4, shade(C.mask, -0.3));
        Px.rect(x - 3, y - 5, 6, 1, shade(C.mask, 0.25));
        Px.disc(x + 1.5, y - 1.5, 1.5, C.amber); Px.disc(x + 4, y - 1.5, 1.2, shade(C.amber, -0.15));
        Px.dot(x + 1, y - 2, '#fff0c0');
        if (!e.dying) { Px.rect(x + 3, y + 1, 3, 4, C.canister); Px.rect(x + 3, y + 4, 3, 1, shade(C.canister, -0.3)); }
        Px.rect(x - 2, y + 4, 4, 1, '#2a2a2a');
        remember(e, 'gang_headP', x, y);
      },
      hand(Hn, ang) {
        Px.disc(Hn.x, Hn.y, 2, C.glove);
        remember(e, 'gang_fist', Hn.x, Hn.y);
        if (holding) {
          const ux = dirX(ang), uy = dirY(ang);
          const bx = Hn.x + ux * 2, by = Hn.y + uy * 2;
          Px.line(bx, by, bx + ux * 5, by + uy * 5, 3, C.bottle);
          Px.line(bx + ux * 5, by + uy * 5, bx + ux * 7, by + uy * 7, 1, C.bottle);
          const wc = (e.t / 3 | 0) % 2 ? '#ffd23f' : '#ff5a1c';
          Px.disc(bx + ux * 8.5, by + uy * 8.5, 1.4, wc);
          remember(e, 'gang_wick', bx + ux * 8.5, by + uy * 8.5);
        }
      },
      after(R) { remember(e, 'gang_headP', R.Hd.x, R.Hd.y); },
    };
  }
  const torchIdle = e => {
    const b = Math.sin(e.anim * 0.07);
    return pose({ hy: -20 + b * 0.4, rot: 0.16, fThigh: 0.2, fKnee: -0.25, bThigh: -0.2, bKnee: -0.15,
      fUpper: 0.35 + b * 0.05, fElbow: 0.9, bUpper: 0.1, bElbow: 0.9, head: 0.12 });
  };
  const TORCH_ATK = {
    lob(ph, t) {
      if (ph === 'start') {
        const k = clamp(t / 10, 0, 1);
        return pose({ rot: lerp(0.15, -0.22, k), fThigh: 0.3, fKnee: -0.25, bThigh: -0.35, bKnee: -0.2,
          fUpper: lerp(0.4, 3.0, k), fElbow: lerp(0.9, 0.65, k), bUpper: lerp(0.1, 1.1, k), bElbow: lerp(0.9, 0.5, k), head: lerp(0.1, 0.2, k) });
      }
      if (ph === 'active') return pose({ hx: 1.5, rot: 0.25, fThigh: 0.45, fKnee: -0.3, bThigh: -0.4, bKnee: -0.15, fUpper: 2.0, fElbow: 0.1, bUpper: -0.4, bElbow: 0.5 });
      return pose({ hx: 1, rot: 0.22, fThigh: 0.4, fKnee: -0.3, bThigh: -0.35, bKnee: -0.15, fUpper: 1.2, fElbow: 0.3, bUpper: -0.2, bElbow: 0.6 });
    },
    shove(ph) {
      if (ph === 'start') return pose({ hx: -1, rot: -0.12, fThigh: 0.2, fKnee: -0.3, bThigh: -0.35, bKnee: -0.3, fUpper: 0.6, fElbow: 2.2, bUpper: 0.5, bElbow: 2.3, head: 0.15 });
      if (ph === 'active') return pose({ hx: 2.5, rot: 0.38, fThigh: 0.6, fKnee: -0.3, bThigh: -0.55, bKnee: -0.05, fUpper: 1.5, fElbow: 0.05, bUpper: 1.4, bElbow: 0.1, head: -0.1 });
      return pose({ hx: 1, rot: 0.25, fThigh: 0.45, fKnee: -0.3, bThigh: -0.4, bKnee: -0.1, fUpper: 1.1, fElbow: 0.5, bUpper: 1.0, bElbow: 0.6 });
    },
  };
  function torchThink() {
    const p = alivePlayer();
    if (!p) { this.circle(Game.player, 1.0); return; }
    const dx = p.x - this.x, dy = p.y - this.y, adx = Math.abs(dx), ady = Math.abs(dy);
    this.face(p);
    const cx = Game.cam.x;
    // Panic Shove: cornered at a wall with Juno within 28 px
    const cornered = (dx > 0 && this.x < cx + 34) || (dx < 0 && this.x > cx + W - 34);
    if (cornered && adx < 28 && ady < 10 && this.aiT - (this.gang_shoveT || -99) > 50) { this.gang_shoveT = this.aiT; this.vx = this.vy = 0; this.attack('shove'); return; }
    const bottleOut = this.gang_bottle && !this.gang_bottle.remove;
    if (!bottleOut && this.cool <= 0 && this.onScreen() && adx >= 70 && adx <= 200 && ady <= 6 && this.takeToken(true)) {
      this.vx = this.vy = 0; this.attack('lob'); return;
    }
    if (this.token && !this.atk) this.dropToken();
    // keep 110-150 px away, lined up within depth 4; back off at 1.4 when Juno is closer than 70
    const side = dx > 0 ? -1 : 1;
    let tx = this.x;
    if (adx < 110) tx = p.x + side * 130;
    else if (adx > 150) tx = p.x + side * 130;
    tx = clamp(tx, cx + 14, cx + W - 14);
    const sx = adx < 70 ? 1.4 : 1.0;
    if (Math.abs(this.x - tx) > 4 || ady > 3) move(this, tx, laneY(p.y), sx, 0.9);
    else { this.vx = this.vy = 0; if (this.state !== 'idle') this.setState('idle'); }
  }
  ENEMY_TYPES.torcher = {
    name: 'TORCHER', family: 'gang', hp: 22, speed: 1.0, w: 8, h: 40, score: 450, downTime: 40, gear: C.canister,
    ranged: true, coolMin: 100, coolMax: 100,
    sprite: [112, 96, 56, 88],
    attacks: {
      lob: { start: 24, active: 4, rec: 16, dmg: 10, tier: 2, reach: [0, 0], zr: [0, 0], projectile: true, tell: 'glint', rim: true },
      shove: { start: 8, active: 3, rec: 14, dmg: 4, tier: 1, kb: 6, stun: 14, reach: [2, 22], zr: [10, 36], depth: 8, tell: 'glint', whiff: 'whoosh' },
    },
    init() { this.name = pick(['WICK', 'FUSE']); },
    think: torchThink,
    attackTick(a, ph) {
      gangTick(this, a, ph);
      if (a.key === 'lob' && ph === 'start' && this.t % 4 === 0 && this.gang_wick) {
        const w = toWorld(this, this.gang_wick.x, this.gang_wick.y);
        FX.add({ kind: 'ember', x: w.x, y: this.y, z: w.z, vx: rr(-0.3, 0.3), vz: rr(0.3, 0.8), life: 16, g: -0.01 });
      }
      if (a.key === 'lob' && this.t === a.start) {
        const p = Game.player;
        const x0 = this.x + this.facing * 6, z0 = 30, vz = 3.0, g = 0.18;
        let z = z0, v = vz, n = 0;
        while (z > 0 && n < 120) { z += v; v -= g; n++; }
        const tx = p ? p.x : this.x + this.facing * 120, ty = p ? p.y : this.y;
        const vx = clamp((tx - x0) / n, -4.5, 4.5), vy = clamp((ty - this.y) / n, -0.6, 0.6);
        Sound.sfx('throwObj', this.x);
        const Molotov = molotovClass();
        this.gang_bottle = Game.add(new Molotov(x0, this.y, z0, {
          kind: 'molotov', vx, vy, vz, gravity: g, dmg: 10, tier: 2, knock: true, burn: 40, owner: this, friendly: false, life: 200,
          n, tx: x0 + vx * n, ty: this.y + vy * n,
        }));
      }
    },
    onHurt(src, a) { hurtGrunt(this, a); },
    onDeath(src, a) {
      // Tank Pop: killed by a T3+ hit, the fuel tank bursts
      if (a && (a.tier || 0) >= 3) {
        FX.text(this.x, this.y, this.h + 24, 'TANK POP!', '#ff8a2a', 50);
        Game.explode(this.x, this.y, src, { r: 32, dmg: 16, pdmg: 12 });
      }
      if (chance(0.4)) dropItem(this, 'molotov');
    },
    drawBody() {
      const p = humanPose(this, torchIdle, (ph, t, a) => (TORCH_ATK[a.key] || TORCH_ATK.lob)(ph, t, a));
      drawHumanoid(p, torchStyle(this));
      if (this.atk && this.state === 'attack') {
        if (this.atk.key === 'lob' && this.gang_wick) markGlint(this, this.gang_wick.x, this.gang_wick.y);
        else if (this.gang_fist) markGlint(this, this.gang_fist.x, this.gang_fist.y);
      }
    },
    drawExtra(ctx, camX) { gangOverlay(this, ctx, camX); },
    eyes() { const h = this.gang_headP || { x: 1, y: -37 }; return [[Math.round(h.x) + 1, Math.round(h.y) - 2, C.amber], [Math.round(h.x) + 4, Math.round(h.y) - 2, C.amber]]; },
  };

  // ---------------------------------------------------------------- heavy hit handling (Bruiser, Slab, Big Diesel)
  // Bruiser super armour: T1 = damage with no hitstun (white flash + clank), T2 = 12f stagger, only T3 knocks down.
  // Bosses (§6.1): combo break after 5 hits in 60f, stagger meter (a T3 only knocks down at >= 40, otherwise a 20f
  // stagger), 24f invulnerable get-up. Diesel flinches lightly outside his attacks and has hyper armour inside them.
  function guardedKnockDown(dir, kx, kz) {
    if (this.gang_noKD) return;
    Fighter.prototype.knockDown.call(this, dir, kx, kz);
  }
  function heavyArmorHit(src, a) {
    this.armorFlash = 4;
    if (this.state !== 'dizzy') {
      Sound.sfx('clank', this.x);
      for (let i = 0; i < 4; i++) FX.add({ kind: 'spark', x: this.x - this.facing * 2, y: this.y, z: this.h * 0.6, vx: rr(-2.5, 2.5), vz: rr(0.5, 3), life: ri(10, 16), g: 0.25, drag: 0.92 });
    }
    if (src && src.team === 'player' && this.heavy) src.vx = -src.facing * 0.5;
  }
  function heavyTakeHit(src, a, dir, nth) {
    const d = this.def, tier = a.tier || 1;
    const est = Math.round((a.dmg || 0) * (this.dmgMul || 1) * (a.dmgMul || 1));
    const lethal = this.hp - est <= 0;
    const st = this.state;
    const reacting = ['fall', 'thrown', 'down', 'getup', 'held', 'pinned', 'grabbed'].includes(st) || this.airborne;
    let aa = a, armor = 2, noKD = false, shrug = false;
    if (!lethal && !reacting) {
      if (this.boss && st !== 'dizzy' && st !== 'whistle') {
        // combo break counts hits outside the dizzy / whistle reward windows
        this.gang_hits = this.gang_hits.filter(f => Game.frame - f < 60);
        this.gang_hits.push(Game.frame);
        this.gang_meter += est;
        if (this.gang_hits.length >= 5) shrug = true;
      }
      if (this.boss && (st === 'dizzy' || st === 'whistle')) this.gang_meter += est;
      if (tier >= 3) {
        if (this.boss && this.gang_meter < 40) { aa = Object.assign({}, a, { knock: false, stun: 20, kb: 0.8 }); noKD = true; armor = 0; }
        else { if (this.boss) { aa = Object.assign({}, a, { knock: true }); this.gang_meter = 0; } armor = 0; }
      } else if (st === 'dizzy' || st === 'whistle') armor = 9;             // free hits while seeing stars
      else if (d.attackArmor && st === 'attack') armor = 9;                  // Diesel: hyper armour while attacking
      else if (tier === 2) { aa = Object.assign({}, a, { knock: false, stun: 12, kb: 0.6 }); noKD = true; armor = 0; }
      else if (d.lightFlinch) { aa = Object.assign({}, a, { knock: false, stun: 10, kb: 0.5 }); noKD = true; armor = 0; }
    } else if (!lethal && st === 'getup') armor = 9;
    this.armorTier = armor;
    this.gang_noKD = noKD;
    Enemy.prototype.takeHit.call(this, src, aa, dir, nth);
    this.armorTier = 2;
    this.gang_noKD = false;
    if (this.state === 'fall' || this.state === 'down') this.gang_meter = 0;
    if (shrug) {
      this.gang_hits = [];
      if (this.alive && !['fall', 'thrown', 'down', 'getup'].includes(this.state)) {
        this.atk = null; this.setState('shrug');
        this.inv = 9; this.flash = 8; this.vx = this.vy = 0;
        Sound.sfx('clank', this.x);
        FX.steam(this.x, this.y, this.h * 0.8, 4);
        FX.add({ kind: 'ring', x: this.x, y: this.y, z: this.h * 0.5, life: 10, size: 30, color: '#ffffff', g: 0 });
      }
    }
  }
  function heavyInit(e) {
    e.armorTier = 2;
    e.gang_hits = [];
    e.gang_meter = 0;
    e.takeHit = heavyTakeHit;
    e.knockDown = guardedKnockDown;
    e.onArmorHit = heavyArmorHit;
  }
  // Shared per-frame upkeep for heavies: dizzy damage bonus, boss get-up invulnerability, shrug.
  function heavyUpkeep(e) {
    if (e.state !== 'dizzy' && e.dmgMul) e.dmgMul = 0;
    if (e.boss && e.state === 'getup' && e.t >= 16) { e.setState('idle'); e.grace = 10; e.inv = 24; return true; }
    if (e.state === 'shrug') {
      e.vx *= 0.5; e.vy = 0;
      if (e.t >= 8) {
        const p = alivePlayer();
        if (p) e.face(p);
        e.cool = 0;
        e.attack(e.def.fastest);
        if (e.def.onFast) e.def.onFast.call(e);
      }
      return true;
    }
    return false;
  }
  // Bull Charge / Diesel Rush: runs forward, hits what it meets, bonks walls and solids.
  function chargeTick(e, a, ph, opts) {
    if (ph !== 'active') { e.gang_px = e.x; return; }
    if (e.t % 4 === 0) FX.dust(e.x - e.facing * 6, e.y, 1, 0.8);
    const cx = Game.cam.x;
    const atWall = e.facing > 0 ? e.x >= cx + W - 8.5 : e.x <= cx + 8.5;
    const stuck = e.t > a.start + 2 && Math.abs(e.x - (e.gang_px == null ? e.x - 9 : e.gang_px)) < 0.6;
    e.gang_px = e.x;
    let hitProp = null;
    for (const pr of Game.ents) {
      if (pr.team !== 'prop' || pr.remove || !pr.vulnerable) continue;
      if (Math.abs(pr.y - e.y) > 8 || (pr.x - e.x) * e.facing < 0 || Math.abs(pr.x - e.x) > pr.w + e.w + 4) continue;
      hitProp = pr;
    }
    if (hitProp) hitProp.takeHit(e, { dmg: 12, tier: 3, zr: [0, 40] }, e.facing);
    if (atWall || stuck || hitProp) { bonk(e, opts.dizzy, opts.mul); return; }
    // hit anything in the path
    const victims = opts.foes ? [Game.player, ...Game.foes()] : [Game.player];
    for (const t of victims) {
      if (!t || t === e || !t.vulnerable || e.atkHit.has(t.id)) continue;
      if (!e.overlaps(a, t)) continue;
      e.atkHit.add(t.id);
      t.takeHit(e, a, e.facing);
    }
  }
  function bonk(e, dizzyT, mul) {
    e.atk = null;
    e.dropToken();
    e.setState('dizzy');
    e.dizzyT = dizzyT;
    e.dmgMul = mul;
    e.vx = -e.facing * 1.4;
    e.ai = 'approach';
    e.cool = Math.round(ri(e.def.coolMin || 60, e.def.coolMax || 110) * (e.coolMul || 1) * 0.5);
    FX.dust(e.x + e.facing * 8, e.y, 8, 1.4);
    FX.shake(3, 12);
    FX.text(clamp(e.x, Game.cam.x + 24, Game.cam.x + W - 24), e.y, e.h + 8, 'BONK!', '#ffe14a', 40);
    Sound.sfx('clank', e.x); Sound.sfx('thud', e.x);
    if (Game.cam.lock != null) FX.wallCrack(e.x + e.facing * (e.w + 2), e.y - e.h * 0.5);
  }

  // ---------------------------------------------------------------- 4. JACKAL HEAVY "Bruiser" (and SLAB)
  function bruiserStyle(e, look) {
    const s = look.s;
    return {
      s, skin: C.bSkin, top: C.bSkin, sleeve: C.bSkin, arm: C.bSkin, pants: C.bPants, boots: '#221c18', belt: '#2a1e14',
      hipW: 15, shW: 20, limbW: 6,
      torso(R) {
        // chest shading, the gut (r9) bulging forward, and the apron as a front panel over it
        const bk0 = tq(R, 0.95, -7 * s), bk1 = tq(R, 0.1, -6 * s);
        Px.line(bk0.x, bk0.y, bk1.x, bk1.y, 2, shade(C.bSkin, -0.22));
        const g = tq(R, 0.3, 5 * s);
        Px.disc(g.x, g.y, 8.5, C.bSkin);
        const pec = tq(R, 0.78, 3 * s);
        Px.line(pec.x - 3, pec.y + 2, pec.x + 3, pec.y + 2, 1, shade(C.bSkin, -0.3));
        for (let i = 0; i < 3; i++) { const h = tq(R, 0.86, -1 + i * 2); Px.dot(h.x, h.y, shade(C.bSkin, -0.4)); }
        const a0 = tq(R, 0.68, -1 * s), a1 = tq(R, 0.68, 6 * s), a2 = tq(R, 0.32, 13.5 * s), a3 = tq(R, -0.32, 9 * s), a4 = tq(R, -0.38, -2 * s);
        const ap = [a0.x, a0.y, a1.x, a1.y, a2.x, a2.y, a3.x, a3.y, a4.x, a4.y];
        Px.poly(ap, look.apron);
        const ed = shade(look.apron, -0.45);
        for (let i = 0; i < 5; i++) Px.line(ap[i * 2], ap[i * 2 + 1], ap[(i * 2 + 2) % 10], ap[(i * 2 + 3) % 10], 1, ed);
        Px.line(a1.x - 1, a1.y + 1, a2.x - 1, a2.y, 1, shade(look.apron, 0.3));
        const pk = tq(R, 0.05, 6 * s);
        Px.rect(pk.x - 2, pk.y - 1, 4, 3, shade(look.apron, -0.25));
        const st0 = tq(R, 1.0, 3 * s);
        Px.line(a1.x, a1.y, st0.x, st0.y, 1, ed);
      },
      head(Hd) {
        const x = Math.round(Hd.x), y = Math.round(Hd.y);
        const r = 4.6 * s;
        Px.disc(x, y, r, C.bSkin);
        Px.rect(x - r + 1, y - 1, 2, 4, shade(C.bSkin, -0.25));
        Px.rect(x - 2, y - r + 1, 3, 1, shade(C.bSkin, 0.3));             // scalp shine
        Px.rect(x, y + 2, Math.round(r) + 1, 2, shade(C.bSkin, -0.2));       // heavy jaw
        Px.rect(x - r, y - 2, r * 2, 2, C.gogBand);
        Px.disc(x + r - 1.5, y - 1.5, 1.6, look.lens);
        Px.dot(x + r - 2, y - 2, '#ffffff');
        Px.dot(x + r + 0.5, y + 1, C.bSkin);                                   // nose
        Px.dot(x - r + 2, y + 1, shade(C.bSkin, -0.4));                        // ear
        remember(e, 'gang_headP', x, y);
      },
      hand(Hn, ang, s2, R) {
        Px.disc(Hn.x, Hn.y, 2.4 * s, shade(C.bSkin, -0.08));
        remember(e, 'gang_fist', Hn.x, Hn.y);
        if (look.chain) {
          const E = R.fa.E;
          for (let i = 0; i <= 5; i++) {
            const k = 0.15 + i * 0.13, o = (i % 2 ? 2 : -2);
            const cx = lerp(E.x, Hn.x, k) - dirY(ang) * o * 0.5, cy = lerp(E.y, Hn.y, k) + dirX(ang) * o * 0.5;
            Px.rect(cx - 1, cy - 1, 2, 2, i % 2 ? C.chain : shade(C.chain, -0.3));
          }
          // a loose end swinging from the wrist
          const sw = Math.sin(e.anim * 0.15) * 2;
          for (let i = 1; i <= 4; i++) Px.dot(Hn.x - 1 + sw * i * 0.3, Hn.y + 2 + i * 2, i % 2 ? C.chain : shade(C.chain, -0.3));
        }
      },
      backHand(Hn) { Px.disc(Hn.x, Hn.y, 2.2 * s, shade(C.bSkin, -0.35)); },
      after(R) {
        // tire shoulder guard with tread notches
        const cx = R.S.x - 0.5, cy = R.S.y + 3.5;
        for (let i = 0; i <= 8; i++) {
          const ang = -Math.PI - 0.2 + i * (Math.PI + 0.4) / 8;
          const x = cx + Math.cos(ang) * 4.5 * s, y = cy + Math.sin(ang) * 4 * s;
          Px.rect(x - 1.5, y - 1.5, 3, 3, C.tire);
        }
        for (let i = 0; i <= 4; i++) {
          const ang = -Math.PI + i * Math.PI / 4;
          Px.dot(cx + Math.cos(ang) * 5.6 * s, cy + Math.sin(ang) * 5 * s, '#4e4e4e');
        }
        remember(e, 'gang_headP', R.Hd.x, R.Hd.y);
      },
    };
  }
  const bruiserIdle = e => {
    const b = Math.sin(e.anim * 0.06);
    return pose({ hy: -20 + b * 0.5, rot: 0.1, fThigh: 0.3, fKnee: -0.3, bThigh: -0.3, bKnee: -0.2,
      fUpper: 0.45 + b * 0.06, fElbow: 0.8, bUpper: 0.25, bElbow: 0.8, head: 0.12 });
  };
  const BRUISER_ATK = {
    axe(ph, t) {
      if (ph === 'start') {
        const k = clamp(t / 10, 0, 1);
        return pose({ hx: -1 * k, hy: -20 - 1.2 * k, rot: lerp(0.1, -0.22, k), fThigh: 0.3, fKnee: -0.3, bThigh: -0.35, bKnee: -0.25,
          fUpper: lerp(0.45, 3.05, k), fElbow: lerp(0.8, 0.45, k), bUpper: lerp(0.25, 2.95, k), bElbow: lerp(0.8, 0.5, k), head: 0.2 * k });
      }
      if (ph === 'active') return pose({ hx: 2, hy: -16.5, rot: 0.6, fThigh: 0.7, fKnee: -0.8, bThigh: -0.5, bKnee: -0.35, fUpper: 1.05, fElbow: 0.1, bUpper: 0.95, bElbow: 0.2, head: -0.3 });
      const k = clamp((t - 30) / 20, 0, 1);
      return pose({ hx: 2 - k, hy: lerp(-16.5, -19, k), rot: lerp(0.6, 0.25, k), fThigh: 0.6, fKnee: -0.7, bThigh: -0.45, bKnee: -0.3, fUpper: lerp(0.9, 0.6, k), fElbow: 0.2, bUpper: lerp(0.8, 0.4, k), bElbow: 0.3, head: -0.2 });
    },
    charge(ph, t, a, e) {
      if (ph === 'start') {
        // two stamps
        const st = t < 8 ? Math.sin(t / 8 * Math.PI) : t < 16 ? -Math.sin((t - 8) / 8 * Math.PI) : 0;
        return pose({ hy: -19, rot: 0.38, fThigh: 0.3 + Math.max(0, st) * 0.9, fKnee: -0.3 - Math.max(0, st) * 1.2, bThigh: -0.4 + Math.max(0, -st) * 0.6, bKnee: -0.3 - Math.max(0, -st) * 1.2,
          fUpper: -0.3, fElbow: 1.6, bUpper: -0.6, bElbow: 1.4, head: -0.35 });
      }
      if (ph === 'active') {
        const r = Poses.run(t * 1.1);
        return Object.assign(r, { rot: 0.62, head: -0.45, fUpper: 0.85, fElbow: 1.9, bUpper: -0.7, bElbow: 1.2 });
      }
      return pose({ hy: -19, rot: -0.15, fThigh: 0.6, fKnee: -0.3, bThigh: -0.3, bKnee: -0.4, fUpper: 0.8, fElbow: 0.6, bUpper: -0.4, bElbow: 0.6 });
    },
  };
  const HEAVY_EXTRA = {
    shrug: e => pose({ hy: -21, rot: -0.1, fThigh: 0.3, fKnee: -0.1, bThigh: -0.35, bKnee: -0.1, fUpper: 1.0 + Math.sin(e.t) * 0.2, fElbow: 1.8, bUpper: -0.9, bElbow: 1.8, head: 0.3 }),
    whistle: e => pose({ rot: -0.12, fThigh: 0.25, fKnee: -0.2, bThigh: -0.25, bKnee: -0.15, fUpper: 1.9, fElbow: 2.45, bUpper: -0.2, bElbow: 0.5, head: 0.3 }),
  };
  function bruiserThink() {
    const p = alivePlayer();
    if (!p) { this.circle(Game.player, 0.8); return; }
    const d = this.def;
    const dx = p.x - this.x, dy = p.y - this.y, adx = Math.abs(dx), ady = Math.abs(dy);
    this.face(p);
    if (this.ai === 'retreat') { retreatThink(this, p, 0.6); return; }
    const sp = this.speed, spy = this.speed * (d.depthK || 0.67);
    if (this.cool <= 0 && this.onScreen() && this.takeToken()) {
      if (adx > 100 && ady <= 6) { this.vx = this.vy = 0; startCharge(this, 'charge', 3.2 * 120); return; }
      if (adx <= 30 && ady <= 6) { this.vx = this.vy = 0; this.attack('axe'); return; }
      move(this, adx > 100 ? this.x : p.x - sign(dx || 1) * 24, p.y, sp, spy);
      if (this.aiT > 240) { this.dropToken(); this.cool = 40; this.aiT = 0; }
      return;
    }
    if (this.boss) {
      // stalk at 50-60 px while cooling down
      const tx = clamp(p.x - sign(dx || 1) * 56, Game.cam.x + 20, Game.cam.x + W - 20);
      const ty = laneY(p.y + Math.sin(this.aiT * 0.03) * 10);
      if (Math.abs(this.x - tx) > 6 || Math.abs(this.y - ty) > 3) move(this, tx, ty, sp * 0.7, spy * 0.8);
      else { this.vx = this.vy = 0; if (this.state !== 'idle') this.setState('idle'); }
      return;
    }
    this.circle(p, 0.8);
  }
  function startCharge(e, key, maxLen) {
    e.attack(key);
    if (!e.atk) return;
    const cx = Game.cam.x;
    const dist = e.facing > 0 ? cx + W - 8 - e.x : e.x - cx - 8;
    e.atk.dangerLen = Math.max(24, Math.min(maxLen, dist + 4));
    e.gang_px = null;
  }
  function bruiserTick(a, ph) {
    gangTick(this, a, ph);
    if (a.key === 'charge') {
      if (ph === 'start') {
        if (this.t === 4 || this.t === 12) { FX.dust(this.x, this.y, 3, 0.8); Sound.sfx('thud', this.x); FX.shake(1, 4); }
        if (this.t % 4 === 0 && this.gang_headP) { const w = toWorld(this, this.gang_headP.x + 4, this.gang_headP.y + 2); FX.steam(w.x, this.y, w.z, 1); }
      }
      chargeTick(this, a, ph, { dizzy: 60, mul: 1.25, foes: true });
      return;
    }
    if (a.key === 'axe' && ph === 'active' && this.t === a.start) { FX.dust(this.x + this.facing * 22, this.y, 4, 1.0); FX.shake(2, 8); }
  }
  function drawBruiser(e, look) {
    const p = humanPose(e, bruiserIdle, (ph, t, a) => (BRUISER_ATK[a.key] || BRUISER_ATK.axe)(ph, t, a, e), HEAVY_EXTRA);
    drawHumanoid(p, bruiserStyle(e, look));
    if (e.atk && e.state === 'attack' && e.gang_fist) markGlint(e, e.gang_fist.x, e.gang_fist.y);
  }
  const BRUISER_ATTACKS = {
    axe: { start: 24, active: 4, rec: 22, dmg: 14, tier: 3, knock: true, kx: 2.6, kz: 3.4, reach: [4, 30], zr: [0, 44], depth: 10, tell: 'heavy', whiff: 'whooshBig', rim: true },
    charge: { start: 20, active: 120, rec: 24, dmg: 12, tier: 3, knock: true, kx: 3.4, kz: 3.2, reach: [0, 20], zr: [0, 44], depth: 10,
      tell: 'heavy', danger: 'line', dangerLen: 200, selfVx: 3.2, custom: true, rim: true },
  };
  ENEMY_TYPES.bruiser = {
    name: 'BRUISER', family: 'gang', hp: 64, speed: 0.75, depthK: 0.67, w: 12, h: 48, score: 1000, weight: 0.8, downTime: 40,
    heavy: true, noGrab: true, gear: C.gogLens, shadowR: 13, launchCap: 0,
    sprite: [128, 104, 64, 96],
    attacks: BRUISER_ATTACKS,
    init() {
      this.name = pick(['MOOSE', 'TANKER']);
      heavyInit(this);
      this.gang_look = { s: 1.09, apron: C.apron, lens: C.gogLens };
    },
    think: bruiserThink,
    stateUpdate() { return heavyUpkeep(this); },
    attackTick: bruiserTick,
    onHurt(src, a) { hurtGrunt(this, a); },
    onDeath() { if (chance(0.5)) dropItem(this, 'pouch'); },
    drawBody() { drawBruiser(this, this.gang_look); },
    drawExtra(ctx, camX) { gangOverlay(this, ctx, camX); },
    eyes() { const h = this.gang_headP || { x: 2, y: -46 }; return [[Math.round(h.x) + 4, Math.round(h.y) - 2, C.gogLens], [Math.round(h.x) + 5, Math.round(h.y) - 2, C.gogLens]]; },
  };

  // ---------------------------------------------------------------- boss common
  function bossKO(e) {
    Game.slow = 0; Game.slowScale = 1; Game.slowAcc = 0;
    Game.hitstop = Math.max(Game.hitstop, 30);
    FX.shake(5, 30);
    FX.flash('#ffffff', 4, 0.5);
    setTimeoutFrames(1, () => Game.slowmo(120, 0.4));
  }
  function bossWhistle(e, spawns) {
    e.gang_whistled = true;
    setTimeoutFrames(20, () => {
      for (const s of spawns) Game.spawn({ type: s.type, side: s.side, y: rr(Game.bounds.yMin + 6, Game.bounds.yMax - 6) });
    });
    e.atk = null;
    e.dropToken();
    e.setState('whistle');
    e.vx = e.vy = 0;
  }
  function whistleUpdate(e) {
    e.vx *= 0.6; e.vy = 0;
    if (e.t === 4) {
      Sound.sfx('gangWhistle', e.x);
      FX.text(e.x, e.y, e.h + 14, 'FWEEET!', '#ffe08a', 50);
    }
    if (e.t >= 40) { e.setState('idle'); e.cool = Math.min(e.cool, 30); }
  }

  // ---------------------------------------------------------------- SLAB (stage 1 mid-boss)
  const SLAB_ADDS = [{ type: 'punk', side: 'R' }, { type: 'punk', side: 'R' }];
  const DIESEL_ADDS = [{ type: 'punk', side: 'R' }, { type: 'punk', side: 'R' }, { type: 'knifer', side: 'L' }];
  ENEMY_TYPES.slab = {
    name: 'SLAB', family: 'gang', hp: 90, speed: 0.8, depthK: 0.65, w: 13, h: 53, score: 3000, weight: 0.7, downTime: 34,
    boss: true, barLayer: 90, heavy: true, noGrab: true, gear: C.chain, shadowR: 14, fastest: 'axe',
    coolMin: 60, coolMax: 110,
    sprite: [140, 112, 70, 104],
    attacks: BRUISER_ATTACKS,
    init() {
      this.name = 'SLAB';
      this.coolMul = 0.85;
      heavyInit(this);
      this.gang_look = { s: 1.2, apron: C.slabApron, lens: C.lens, chain: true };
      Game.bossCard('SLAB', 'CHAIN ENFORCER');
    },
    think() {
      if (!this.gang_whistled && this.hp <= this.maxHp * 0.5) { bossWhistle(this, SLAB_ADDS); return; }
      bruiserThink.call(this);
    },
    stateUpdate() {
      if (this.state === 'whistle') { whistleUpdate(this); return true; }
      return heavyUpkeep(this);
    },
    attackTick: bruiserTick,
    onHurt(src, a) { hurtGrunt(this, a); },
    onDeath() { bossKO(this); Sound.sfx('clank', this.x); },
    drawBody() { drawBruiser(this, this.gang_look); },
    drawExtra(ctx, camX) { gangOverlay(this, ctx, camX); },
    eyes() { const h = this.gang_headP || { x: 2, y: -51 }; return [[Math.round(h.x) + 4, Math.round(h.y) - 2, C.lens], [Math.round(h.x) + 5, Math.round(h.y) - 2, C.lens], [Math.round(h.x) + 5, Math.round(h.y) - 1, C.lens]]; },
  };

  // ---------------------------------------------------------------- BIG DIESEL (stage 1 boss)
  // Block Hammer: handle 3x30 from the grip along `ang` (rig angle), engine-block head 18 across x 14 along.
  function drawHammer(gx, gy, ang, stuck) {
    const ux = dirX(ang), uy = dirY(ang), vx = -uy, vy = ux;
    Px.line(gx - ux * 4, gy - uy * 4, gx + ux * 28, gy + uy * 28, 3, C.handle);
    Px.line(gx - ux * 4 + vx, gy - uy * 4 + vy, gx + ux * 26 + vx, gy + uy * 26 + vy, 1, shade(C.handle, 0.25));
    const h0x = gx + ux * 28, h0y = gy + uy * 28, h1x = gx + ux * 42, h1y = gy + uy * 42;
    Px.quad(h0x, h0y, h1x, h1y, 18, 18, C.hamHead);
    Px.quad(h0x + vx * 7, h0y + vy * 7, h1x + vx * 7, h1y + vy * 7, 4, 4, shade(C.hamHead, 0.25));
    Px.quad(h0x - vx * 7, h0y - vy * 7, h1x - vx * 7, h1y - vy * 7, 4, 4, shade(C.hamHead, -0.3));
    for (const o of [-5, 0, 5]) Px.disc(lerp(h0x, h1x, 0.5) + vx * o, lerp(h0y, h1y, 0.5) + vy * o, 2, C.cyl);
    Px.line(h0x - vx * 9, h0y - vy * 9, h0x + vx * 9, h0y + vy * 9, 1, shade(C.hamHead, -0.45));
    return { x: lerp(h0x, h1x, 0.7), y: lerp(h0y, h1y, 0.7) };
  }
  function dieselStyle(e) {
    const s = 1.3;
    return {
      s, skin: C.dSkin, top: C.overalls, sleeve: C.dSkin, arm: C.dSkin, pants: C.overalls, boots: '#1a1416', belt: null,
      hipW: 16, shW: 19, limbW: 6.2,
      torso(R) {
        // bare chest + big gut (skin) under a black overall bib with two straps
        const ch = tq(R, 0.75, 1);
        Px.disc(ch.x, ch.y, 8, C.dSkin);
        const g = tq(R, 0.3, 6);
        Px.disc(g.x, g.y, 12.5, C.dSkin);
        Px.disc(g.x - 2, g.y - 3, 6, shade(C.dSkin, 0.12));
        const b0 = tq(R, 0.62, -6), b1 = tq(R, 0.62, 12), b2 = tq(R, 0.1, 17), b3 = tq(R, -0.25, 10), b4 = tq(R, -0.2, -9);
        Px.poly([b0.x, b0.y, b1.x, b1.y, b2.x, b2.y, b3.x, b3.y, b4.x, b4.y], C.overalls);
        Px.line(b1.x, b1.y, b2.x, b2.y, 1, shade(C.overalls, 0.35));
        const s0 = tq(R, 1.02, 5), s1 = tq(R, 1.02, -4);
        Px.line(b1.x - 2, b1.y, s0.x, s0.y, 2, C.overalls);
        Px.line(b0.x + 2, b0.y, s1.x, s1.y, 2, shade(C.overalls, -0.2));
        const bk = tq(R, 0.6, 9);
        Px.rect(bk.x - 1, bk.y - 1, 3, 2, '#b8bec4');
        Px.rect(lerp(b0.x, b1.x, 0.5) - 3, lerp(b0.y, b1.y, 0.5) + 3, 6, 4, shade(C.overalls, 0.15));   // bib pocket
      },
      head(Hd) {
        const x = Math.round(Hd.x), y = Math.round(Hd.y);
        Px.disc(x - 1, y, 7.5, shade(C.dSkin, -0.12));
        Px.rect(x - 8, y - 2, 4, 7, shade(C.dSkin, -0.35));
        Px.rect(x - 4, y - 7, 6, 1, shade(C.dSkin, 0.2));
        // gas-mask face plate
        Px.poly([x - 2, y - 7, x + 6, y - 6, x + 8, y, x + 7, y + 6, x, y + 7, x - 2, y + 2], C.plate);
        Px.line(x - 1, y - 6, x + 6, y - 5, 1, shade(C.plate, 0.3));
        Px.rect(x - 2, y - 2, 10, 1, '#1e1e1e');
        Px.rect(x + 1, y - 4, 3, 3, C.lens); Px.rect(x + 6, y - 4, 2, 3, shade(C.lens, -0.15));
        Px.dot(x + 1, y - 4, '#ffc0b8');
        Px.disc(x + 1, y + 7, 3, shade(C.filter, -0.25));
        if (!e.dying) { Px.disc(x + 8, y + 5, 3, C.filter); Px.disc(x + 8, y + 5, 1, '#5a625a'); }
        remember(e, 'gang_headP', x, y);
      },
      hand(Hn, ang) {
        Px.disc(Hn.x, Hn.y, 3, shade(C.dSkin, -0.05));
        remember(e, 'gang_fist', Hn.x, Hn.y);
        if (!e.dying && e.gang_hamMode === 'front') {
          const hd = drawHammer(Hn.x, Hn.y, e.gang_ham != null ? e.gang_ham : ang);
          remember(e, 'gang_hamTip', hd.x, hd.y);
        }
        Px.disc(Hn.x, Hn.y, 2.6, shade(C.dSkin, 0.1));
      },
      backHand(Hn, ang) {
        if (!e.dying && e.gang_hamMode === 'back') {
          const hd = drawHammer(Hn.x, Hn.y, e.gang_ham != null ? e.gang_ham : ang);
          remember(e, 'gang_hamTip', hd.x, hd.y);
          remember(e, 'gang_fist', Hn.x, Hn.y);
        }
        Px.disc(Hn.x, Hn.y, 2.8, shade(C.dSkin, -0.35));
      },
      after(R) {
        remember(e, 'gang_headP', R.Hd.x, R.Hd.y);
        // wrist wraps
        Px.rect(R.fa.E.x - 2, R.fa.E.y - 1, 4, 2, shade(C.overalls, 0.2));
      },
    };
  }
  // Exhaust stacks behind the shoulders (drawn before the body).
  function drawStacks(e, R) {
    const back = tq(R, 0.9, -7);
    const tops = [];
    for (let i = 0; i < 2; i++) {
      const x = Math.round(back.x - 5 + i * 6), y = Math.round(back.y + 3 - i);
      Px.rect(x - 2, y - 14, 4, 14, i ? C.stack : shade(C.stack, -0.2));
      Px.rect(x - 2, y - 14, 1, 14, shade(C.stack, 0.35));
      Px.rect(x + 1, y - 14, 1, 14, shade(C.stack, -0.4));
      Px.rect(x - 2, y - 9, 4, 1, shade(C.stack, -0.35));
      Px.rect(x - 3, y - 16, 6, 3, C.cap);
      if (e.gang_puffT > 0 && i === (e.gang_puffI || 0)) Px.rect(x - 2, y - 17, 4, 1, e.gang_phase2 ? C.smokeHot : '#6a6060');
      tops.push({ x, y: y - 16 });
    }
    e.gang_stacks = tops;
  }
  const dieselIdle = e => {
    const b = Math.sin(e.anim * 0.06);
    return pose({ hy: -20 + b * 0.6, rot: 0.08, fThigh: 0.3, fKnee: -0.25, bThigh: -0.3, bKnee: -0.2,
      fUpper: 0.35 + b * 0.05, fElbow: 0.9, bUpper: 0.4, bElbow: 2.4, head: 0.1 });
  };
  const DIESEL_ATK = {
    smash(ph, t, a) {
      if (ph === 'start') {
        const k = clamp(t / 12, 0, 1);
        const p = pose({ hx: -1.5 * k, hy: -20 - k, rot: lerp(0.08, -0.25, k), fThigh: 0.35, fKnee: -0.3, bThigh: -0.4, bKnee: -0.3,
          fUpper: lerp(0.3, 3.0, k), fElbow: lerp(2.2, 0.4, k), bUpper: lerp(0.4, 2.9, k), bElbow: lerp(1.9, 0.5, k), head: 0.2 * k });
        p.ham = lerp(-2.5, -3.5, k);
        return p;
      }
      const p = pose({ hx: 3, hy: -16, rot: 0.55, fThigh: 0.75, fKnee: -0.8, bThigh: -0.55, bKnee: -0.3, fUpper: 1.25, fElbow: 0.15, bUpper: 1.15, bElbow: 0.25, head: -0.25 });
      p.ham = ph === 'active' ? 1.15 : 1.08;
      if (ph === 'rec') { const w = Math.sin(t * 0.7) * 0.04; p.rot += w; p.fUpper += w; p.hy -= Math.max(0, (t - 40) / 10); }
      return p;
    },
    spin(ph, t, a) {
      if (ph === 'start') {
        const k = clamp(t / 10, 0, 1);
        const p = pose({ hx: -1, hy: lerp(-20, -16, k), rot: lerp(0.08, 0.2, k), fThigh: 0.6, fKnee: -1.0, bThigh: -0.5, bKnee: -0.8,
          fUpper: lerp(0.3, -1.3, k), fElbow: lerp(2.2, 0.5, k), bUpper: lerp(0.4, -1.1, k), bElbow: 0.6, head: 0.1 });
        p.ham = lerp(-2.5, -1.9, k);
        return p;
      }
      const ph2 = (t >> 2) % 4;
      const p = pose({ hy: -18, rot: 0.05, fThigh: 0.35, fKnee: -0.5, bThigh: -0.35, bKnee: -0.5, fUpper: 1.6, fElbow: 0.05, bUpper: 1.4, bElbow: 0.2, head: 0 });
      p.ham = [1.6, 1.75, 1.45, 1.6][ph2];
      return p;
    },
    rush(ph, t, a) {
      if (ph === 'start') {
        const p = pose({ hy: -18, rot: 0.35, fThigh: 0.55, fKnee: -0.9, bThigh: -0.6, bKnee: -0.6, fUpper: -0.5, fElbow: 0.9, bUpper: -0.7, bElbow: 0.9, head: -0.3 });
        p.ham = -1.1;
        p.hx = Math.sin(t * 1.3) * 0.6;
        return p;
      }
      if (ph === 'active') {
        const r = Poses.run(t * 1.15);
        Object.assign(r, { rot: 0.55, head: -0.4, fUpper: -0.6, fElbow: 0.5, bUpper: 0.9, bElbow: 1.8 });
        r.ham = -1.05;
        return r;
      }
      const p = pose({ hy: -19, rot: -0.15, fThigh: 0.5, fKnee: -0.3, bThigh: -0.3, bKnee: -0.4, fUpper: 0.2, fElbow: 0.8, bUpper: -0.3, bElbow: 0.6 });
      p.ham = -1.6;
      return p;
    },
  };
  const DIESEL_EXTRA = Object.assign({}, HEAVY_EXTRA, {
    whistle: e => HEAVY_EXTRA.whistle(e),
  });
  // Dust shockwave from the Hammer Smash: crawls 36 px along the floor, z 0..8, 6 dmg, jumpable.
  class GangShock extends Ent {
    constructor(x, y, dir) { super(x, y); this.dir = dir; this.team = 'hazard'; this.noShadow = true; this.shadowR = 0; this.done = false; }
    update() {
      this.t++;
      this.x += this.dir * 3;
      if (this.t % 2 === 0) FX.dust(this.x, this.y, 1, 0.3, '#c8b090');
      const p = Game.player;
      if (!this.done && p && p.vulnerable && p.state !== 'fall' && p.z <= 8 && Math.abs(p.y - this.y) <= 10 && Math.abs(p.x - this.x) < 5 + p.w) {
        this.done = true;
        p.takeHit({ x: this.x, team: 'hazard' }, { dmg: 6, tier: 2, stun: 18, kb: 1.6, zr: [0, 8], sfx: 'hitMid' }, this.dir);
      }
      if (this.t >= 12) this.remove = true;
    }
    sortY() { return this.y - 2; }
    draw(ctx, camX) {
      Px.use(ctx);
      const x = Math.round(this.x - camX), y = Math.round(this.y), k = this.t / 12;
      const h = 7 * (1 - k * 0.6);
      ctx.globalAlpha = 0.85 - k * 0.5;
      Px.poly([x - this.dir * 6, y + 1, x - this.dir * 1, y - h, x + this.dir * 3, y - h * 0.6, x + this.dir * 5, y + 1], '#c8b090');
      Px.poly([x - this.dir * 3, y + 1, x, y - h * 0.5, x + this.dir * 3, y + 1], '#a08a6a');
      ctx.globalAlpha = 1;
    }
  }
  // The Block Hammer clanking to the floor on defeat.
  class GangHammer extends Ent {
    constructor(x, y, z, dir, boss) { super(x, y); this.z = z; this.vx = dir * 1.8; this.vz = 2.6; this.ang = -2.5; this.boss = boss; this.team = 'none'; this.shadowR = 9; this.landed = false; }
    update() {
      this.t++;
      if (!this.landed) {
        this.x += this.vx; this.z += this.vz; this.vz -= 0.3; this.ang += 0.32 * sign(this.vx || 1);
        if (this.z <= 0) {
          this.z = 0;
          if (!this.bounced && this.vz < -2) { this.bounced = true; this.vz = 1.5; this.vx *= 0.5; Sound.sfx('clank', this.x); FX.dust(this.x, this.y, 3); }
          else { this.landed = true; this.ang = sign(this.vx || 1) > 0 ? 1.57 : -1.57; Sound.sfx('clank', this.x); Sound.sfx('thud', this.x); FX.dust(this.x, this.y, 6, 1.2); FX.shake(2, 8); }
        }
      }
      if (!this.boss || this.boss.remove) this.remove = true;
    }
    draw(ctx, camX) {
      if (this.boss && this.boss.state === 'down' && this.boss.t > 50 && (this.boss.t >> 1) % 2) return;
      Sprite.begin(112, 96, 56, 56);
      // grip offset so the hammer pivots about its middle
      const ux = dirX(this.ang), uy = dirY(this.ang);
      drawHammer(-ux * 20, -uy * 20 - 9, this.ang);
      Sprite.end(ctx, this.x - camX, this.y - this.z, 1, {});
    }
  }
  function dieselThink() {
    const p = alivePlayer();
    if (!p) { this.circle(Game.player, 0.8); return; }
    if (!this.gang_whistled && this.hp <= this.maxHp * 0.5) { bossWhistle(this, DIESEL_ADDS); return; }
    const dx = p.x - this.x, dy = p.y - this.y, adx = Math.abs(dx), ady = Math.abs(dy);
    this.face(p);
    if (this.ai === 'retreat') { retreatThink(this, p, 0.6); return; }
    if (this.cool <= 0 && this.onScreen()) {
      if (adx <= 50 && ady <= 8) {
        this.vx = this.vy = 0;
        this.attack(chance(0.6) ? 'smash' : 'spin');
        return;
      }
      if (this.aiT - (this.gang_rollT || -999) > 50) { this.gang_rollT = this.aiT; this.gang_rush = chance(0.5); }
      if (this.gang_rush && ady <= 6 && adx > 60) { this.vx = this.vy = 0; startCharge(this, 'rush', 400); return; }
      move(this, this.gang_rush ? this.x : p.x - sign(dx || 1) * 34, p.y, this.speed, this.speed * 0.65);
      return;
    }
    const tx = clamp(p.x - sign(dx || 1) * 70, Game.cam.x + 24, Game.cam.x + W - 24);
    const ty = laneY(p.y + Math.sin(this.aiT * 0.025) * 12);
    if (Math.abs(this.x - tx) > 6 || Math.abs(this.y - ty) > 3) move(this, tx, ty, this.speed * 0.7, this.speed * 0.5);
    else { this.vx = this.vy = 0; if (this.state !== 'idle') this.setState('idle'); }
  }
  function dieselPuff(e, color) {
    const st = e.gang_stacks;
    if (!st) return;
    const i = (e.gang_puffI = ((e.gang_puffI || 0) + 1) % 2);
    const w = toWorld(e, st[i].x, st[i].y);
    FX.add({ kind: 'dust', x: w.x, y: e.y, z: w.z, vx: -e.facing * 0.25 + rr(-0.15, 0.15), vz: rr(0.45, 0.7), life: ri(36, 50), size: rr(2.5, 3.5), color, g: -0.004, grow: 0.12, alpha: 0.75 });
    e.gang_puffT = 3;
  }
  ENEMY_TYPES.diesel = {
    name: 'BIG DIESEL', family: 'gang', hp: 180, speed: 0.9, w: 14, h: 56, score: 10000, weight: 0.65, downTime: 34,
    boss: true, barLayer: 90, heavy: true, noGrab: true, gear: C.filter, shadowR: 16, fastest: 'spin', attackArmor: true, lightFlinch: true,
    coolMin: 50, coolMax: 90,
    sprite: [192, 140, 96, 124],
    attacks: {
      smash: { start: 26, active: 5, rec: 30, dmg: 18, tier: 3, knock: true, kx: 2.8, kz: 3.8, reach: [20, 48], zr: [0, 44], depth: 10, tell: 'heavy', whiff: 'whooshBig', rim: true },
      spin: { start: 20, active: 60, rec: 0, dmg: 8, tier: 3, knock: true, kx: 3.0, kz: 3.2, reach: [-36, 36], zr: [0, 44], depth: 12, tell: 'heavy', custom: true, rim: true, sfxStart: 'gangSpinUp' },
      rush: { start: 18, active: 120, rec: 22, dmg: 14, tier: 3, knock: true, kx: 3.4, kz: 3.4, reach: [0, 24], zr: [0, 50], depth: 10, tell: 'heavy',
        danger: 'line', dangerLen: 200, selfVx: 3.6, custom: true, rim: true, sfxStart: 'gangRev' },
    },
    init() {
      this.name = 'BIG DIESEL';
      heavyInit(this);
      this.gang_puffT = 0;
      Game.bossCard('BIG DIESEL', 'JACKAL WARCHIEF');
      // the Hammer Smash marker sits on the ground layer, under the actors
      this.drawMarker = function (ctx, camX) {
        Enemy.prototype.drawMarker.call(this, ctx, camX);
        const a = this.telegraphing();
        if (a && a.key === 'smash' && (this.t >> 2) % 2 === 0) {
          Px.use(ctx);
          ctx.globalAlpha = 0.65;
          Px.rect(Math.round(this.x - camX + this.facing * 34 - 12), Math.round(this.y - 4), 24, 8, C.red);
          ctx.globalAlpha = 1;
          Px.rect(Math.round(this.x - camX + this.facing * 34 - 12), Math.round(this.y - 4), 24, 1, '#ffb0a8');
        }
      };
    },
    think: dieselThink,
    stateUpdate() {
      const smoke = this.gang_phase2 ? C.smokeHot : C.smoke;
      if (this.gang_puffT > 0) this.gang_puffT--;
      // 25%: hotter smoke, cooldowns x0.7
      if (!this.gang_phase2 && this.hp <= this.maxHp * 0.25 && this.alive) { this.gang_phase2 = true; this.coolMul = 0.7; FX.text(this.x, this.y, this.h + 12, 'OVERHEAT!', '#e2591e', 50); Sound.sfx('gangRev', this.x); }
      // exhaust stacks: every 20f, every 4f during wind-ups; 3 sputters on defeat
      if (this.dying) {
        if (this.state === 'down' && (this.t === 8 || this.t === 22 || this.t === 36)) { dieselPuff(this, smoke); dieselPuff(this, smoke); if (this.t === 8) Sound.sfx('gangSputter', this.x); }
      } else {
        const every = this.telegraphing() ? 4 : 20;
        if (Game.frame % every === 0) dieselPuff(this, smoke);
      }
      if (this.state === 'whistle') {
        whistleUpdate(this);
        return true;
      }
      return heavyUpkeep(this);
    },
    attackTick(a, ph) {
      if (a.key === 'smash') {
        const p = Game.player;
        if (ph === 'start' && p && Math.abs(p.x - this.x) < 22) this.vx = -this.facing * 0.5;   // step back to make room
        if (ph === 'active' && this.t === a.start) {
          const ix = this.x + this.facing * 36;
          FX.dust(ix, this.y, 10, 1.6);
          FX.debris(ix, this.y, 2, ['#6b5440', '#8c6a44'], 8);
          FX.shake(4, 14);
          Sound.sfx('hitHeavy', ix); Sound.sfx('thud', ix);
          Game.add(new GangShock(ix, this.y, 1));
          Game.add(new GangShock(ix, this.y, -1));
        }
        if (ph === 'rec' && this.t % 6 === 0) { const ix = this.x + this.facing * 36; FX.dust(ix, this.y, 1, 0.4); }
        return;
      }
      if (a.key === 'spin') {
        if (ph === 'active') {
          const k = this.t - a.start;
          this.facing = (k >> 3) % 2 ? -1 : 1;
          const p = alivePlayer();
          if (p) { this.vx = sign(p.x - this.x) * Math.min(1.2, Math.abs(p.x - this.x)); this.vy = sign(p.y - this.y) * Math.min(0.8, Math.abs(p.y - this.y)); }
          else { this.vx *= 0.8; this.vy = 0; }
          if (k % 3 === 0) FX.dust(this.x + rr(-20, 20), this.y, 1, 1.2);
          if (k % 15 === 0) {
            this.atkHit = new Set();
            Sound.sfx('whooshBig', this.x);
            FX.add({ kind: 'ring', x: this.x, y: this.y, z: 20, life: 10, size: 40, color: '#e8e0d0', g: 0 });
            const t = Game.player;
            if (t && t.vulnerable && t.state !== 'fall' && Math.abs(t.y - this.y) <= 12 && Math.abs(t.x - this.x) <= 36 + t.w && t.z < 40) t.takeHit(this, a, t.x >= this.x ? 1 : -1);
          }
          if (k >= a.active - 1) {
            // spun out: dizzy for 50f
            this.atk = null; this.dropToken();
            this.setState('dizzy'); this.dizzyT = 50; this.vx = this.vy = 0;
            const pl = Game.player; if (pl) this.face(pl);
            this.ai = 'approach';
            this.cool = Math.round(ri(this.def.coolMin, this.def.coolMax) * (this.coolMul || 1));
          }
        }
        return;
      }
      if (a.key === 'rush') {
        if (ph === 'start' && this.t % 6 === 0) FX.smoke(this.x - this.facing * 6, this.y, 40, 1, this.gang_phase2 ? C.smokeHot : C.smoke);
        if (ph === 'active' && this.t % 2 === 0 && this.gang_hamTip) { const w = toWorld(this, this.gang_hamTip.x, 0); FX.add({ kind: 'spark', x: w.x, y: this.y, z: 1, vx: -this.facing * rr(1, 3), vz: rr(0.5, 2), life: ri(6, 10), g: 0.15, drag: 0.9 }); }
        chargeTick(this, a, ph, { dizzy: 30, mul: 0, foes: false });
      }
    },
    onHurt(src, a) { hurtGrunt(this, a); },
    onDeath() {
      bossKO(this);
      const f = this.gang_fist ? toWorld(this, this.gang_fist.x, this.gang_fist.y) : { x: this.x, z: 30 };
      Game.add(new GangHammer(f.x, this.y + 2, Math.max(10, f.z), -this.facing, this));
    },
    drawBody() {
      const p = humanPose(this, dieselIdle, (ph, t, a) => (DIESEL_ATK[a.key] || DIESEL_ATK.smash)(ph, t, a), DIESEL_EXTRA);
      const st = this.state;
      if (st === 'attack') this.gang_hamMode = 'front';
      else if (['hurt', 'fall', 'thrown', 'down', 'getup', 'grabbed', 'held', 'pinned'].includes(st)) { this.gang_hamMode = 'front'; p.ham = undefined; }
      else {
        // shouldered: the back hand rests the Block Hammer on the far shoulder
        this.gang_hamMode = 'back';
        p.bUpper = 0.45; p.bElbow = 2.45;
        p.ham = -2.7 + Math.sin(this.anim * 0.06) * 0.04;
      }
      this.gang_ham = p.ham != null ? p.ham : null;
      const R = solveRig(p, 1.3, DIMS_HUMAN);
      drawStacks(this, R);
      drawHumanoid(p, dieselStyle(this));
      if (this.atk && this.state === 'attack') {
        if (this.gang_hamTip) markGlint(this, this.gang_hamTip.x, this.gang_hamTip.y);
      }
    },
    drawExtra(ctx, camX) { gangOverlay(this, ctx, camX); },
    eyes() { const h = this.gang_headP || { x: 3, y: -58 }; return [[Math.round(h.x) + 1, Math.round(h.y) - 3, C.lens], [Math.round(h.x) + 2, Math.round(h.y) - 3, C.lens], [Math.round(h.x) + 5, Math.round(h.y) - 3, C.lens], [Math.round(h.x) + 6, Math.round(h.y) - 3, C.lens]]; },
  };

  // ---------------------------------------------------------------- 5. ROAD RAIDER (set piece)
  const RAM = { dmg: 16, tier: 3, knock: true, kx: 3.8, kz: 3.6, zr: [0, 16], depth: 8, sfx: 'hitHeavy' };
  const RAM_FOE = Object.assign({}, RAM, { zr: [0, 40] });
  function raiderEdgeX(e) { return e.gang_side === 'L' ? Game.cam.x - 36 : Game.cam.x + W + 36; }
  function raiderTele(e) {
    e.setState('offstage');
    e.gang_sub = 'tele';
    e.gang_teleT = Math.max(30, 45 + (Game.diff.tele || 0));
    e.facing = e.gang_side === 'L' ? 1 : -1;
    e.vx = e.vy = 0;
    e.x = raiderEdgeX(e);
    Sound.sfx('gangRev', e.x);
  }
  function raiderUpdate() {
    if (!this.gang_ready) {
      this.gang_ready = true;
      let side = this.gang_side;
      if (side !== 'L' && side !== 'R') side = Game.player && Game.player.x < this.x ? 'R' : 'L';
      this.gang_side = side;
      raiderTele(this);
      return true;
    }
    const cx = Game.cam.x;
    switch (this.state) {
      case 'offstage':
        this.x = raiderEdgeX(this); this.vx = this.vy = 0;
        if (this.gang_sub === 'wait') { if (this.t >= 45) raiderTele(this); return true; }
        if (this.t % 15 === 7) Sound.sfx('gangEngine', this.x, 0.8);
        if (this.t >= this.gang_teleT) {
          this.setState('ride');
          this.gang_hit = new Set();
          this.x = this.gang_side === 'L' ? cx - 30 : cx + W + 30;
          this.vx = this.facing * 5.5;
          Sound.sfx('gangRev', this.x, 1.2);
        }
        return true;
      case 'ride': {
        this.vx = this.facing * 5.5; this.vy = 0;
        this.gang_wheel = (this.gang_wheel || 0) + 0.45;
        const p = Game.player;
        const passed = p && (p.x - this.x) * this.facing < 0;
        if (this.t % 8 === 0) Sound.sfx('gangEngine', this.x, passed ? 0.7 : 1.0);
        if (this.t % 2 === 0) FX.dust(this.x - this.facing * 22, this.y, 1, 0.5);
        if (this.t % 3 === 0) FX.add({ kind: 'dust', x: this.x - this.facing * 30, y: this.y, z: 12, vx: -this.facing * 0.5, vz: 0.3, life: 20, size: 2, color: '#6a6060', g: -0.005, grow: 0.12, alpha: 0.5 });
        const touch = t => Math.abs(t.y - this.y) <= 8 && Math.abs(t.x - this.x) < 26 + t.w && t.z <= 16;
        if (p && p.vulnerable && !this.gang_hit.has(p.id) && touch(p)) {
          this.gang_hit.add(p.id);
          p.takeHit(this, RAM, this.facing);
          FX.dust(p.x, p.y, 6, 1.4);
        }
        for (const f of Game.foes()) {
          if (f === this || f.type === 'raider' || !f.vulnerable || this.gang_hit.has(f.id) || !touch(f)) continue;
          this.gang_hit.add(f.id);
          f.takeHit(this, RAM_FOE, this.facing);
        }
        const gone = this.facing > 0 ? this.x > cx + W + 40 : this.x < cx - 40;
        if (gone) {
          if (this.gang_uturn && !this.gang_turned) {
            this.gang_turned = true;
            this.gang_side = this.gang_side === 'L' ? 'R' : 'L';
            this.setState('offstage'); this.gang_sub = 'wait';
            this.facing = -this.facing;
            this.x = raiderEdgeX(this);
          } else this.remove = true;
        }
        return true;
      }
      case 'wreck': {
        this.vx *= 0.9; this.vy = 0;
        if (this.t % 4 === 0) this.gang_rot = (this.gang_rot || 0) + 1;
        if (this.t < 24) {
          for (let i = 0; i < 2; i++) FX.add({ kind: 'spark', x: this.x + rr(-12, 12), y: this.y, z: rr(0, 4), vx: -this.facing * rr(0.5, 3), vz: rr(0.5, 2.5), life: ri(8, 14), g: 0.15, drag: 0.9 });
        }
        if (this.t % 5 === 0) FX.smoke(this.x, this.y, 10, 1, '#3a3030');
        // ploughs into props (the red fuel drum goes up)
        for (const pr of Game.ents) {
          if (pr.team !== 'prop' || pr.remove || !pr.vulnerable) continue;
          if (Math.abs(pr.y - this.y) > 8 || Math.abs(pr.x - this.x) > pr.w + 16) continue;
          pr.takeHit(this.gang_by || Game.player, { dmg: 10, tier: 3, thrownBody: true, zr: [0, 40] }, this.facing);
        }
        if (this.t >= 30) {
          this.remove = true;
          Game.explode(this.x, this.y, this.gang_by || Game.player, { r: 30, dmg: 20, pdmg: 20 });
        }
        return true;
      }
    }
    // any other state (e.g. pinned released): resume riding
    this.setState('ride');
    if (!this.gang_hit) this.gang_hit = new Set();
    return true;
  }
  // Any Juno hit whose z range reaches 14+ unseats the rider; anything else clanks off the bike.
  function raiderTakeHit(src, a, dir) {
    if (this.state !== 'ride' || this.dying) return;
    const fromHero = src && src.team === 'player';
    const top = ((src && src.z) || 0) + (a.zr ? a.zr[1] : 40);
    this.hs = Math.max(this.hs, 6); this.hitJitter = true;
    if (!fromHero || top < 14) {
      Sound.sfx('tink', this.x); this.armorFlash = 3;
      FX.hit(this.x, this.y, 10, 1, dir || 1, '#ffffff');
      return;
    }
    // unseat
    this.dying = true;
    this.gang_by = src;
    this.hp = 0;
    if (src.hs != null) src.hs = Math.max(src.hs, 8);
    Game.hitstop = Math.max(Game.hitstop, 4);
    FX.hit(this.x, this.y, 24, 3, dir || 1, (FAMILY.gang || {}).tint || '#ffe066');
    FX.shake(3, 10);
    Sound.sfx('hitHeavy', this.x); Sound.sfx('clank', this.x);
    if (src.onLanded) src.onLanded(this, a, a.dmg || 10, 3);
    Game.addScore(this.score);
    FX.text(this.x, this.y, 44, String(this.score), '#ffe066', 50);
    // the rider: a knocked-down Punk with 12 HP
    if (ENEMY_TYPES.punk) {
      const pk = Game.spawn({ type: 'punk', side: 'in', x: this.x - Game.cam.x, y: this.y, opts: { helmet: true } });
      pk.hp = 12;
      pk.z = 18;
      pk.knockDown(-this.facing, 1.6, 3.4);
      pk.facing = this.facing;
    }
    // the bike tumbles 40 px, sparking, and explodes 30f later
    this.setState('wreck');
    this.gang_rot = 0;
    this.vx = this.facing * 4.0;
    this.vz = 2.2; this.z = Math.max(this.z, 1);
  }
  function raiderMarker(ctx, camX) {
    Px.use(ctx);
    const y = Math.round(this.y);
    if (this.state === 'offstage' && this.gang_sub === 'tele') {
      // headlight cone sweeping in along the lane
      const k = clamp(this.t / this.gang_teleT, 0, 1);
      const ex = this.gang_side === 'L' ? 0 : W, d = this.facing;
      const len = lerp(30, 260, easeOut(k)), sweep = Math.sin(this.t * 0.25) * 3;
      ctx.globalAlpha = 0.35;
      Px.poly([ex, y - 20, ex + d * len, y - 34 + sweep, ex + d * len, y + 8 + sweep], '#fff2a0');
      ctx.globalAlpha = 0.25;
      Px.poly([ex, y - 20, ex + d * len * 0.7, y - 26 + sweep, ex + d * len * 0.7, y + 2 + sweep], '#ffffff');
      ctx.globalAlpha = 1;
      return;
    }
    if (this.state === 'ride' || this.state === 'wreck') {
      const sx = Math.round(this.x - camX);
      ctx.globalAlpha = 0.35;
      Px.oval(sx, y, 26, 3, '#000');
      if (this.state === 'ride') {
        const d = this.facing, hx = sx + d * 22;
        ctx.globalAlpha = 0.2;
        Px.poly([hx, y - 22, hx + d * 80, y - 30, hx + d * 80, y + 6], '#fff2a0');
      }
      ctx.globalAlpha = 1;
    }
  }
  function raiderSortY() { return this.state === 'offstage' ? 1e4 : this.y; }
  function raiderOverlay(e, ctx, camX) {
    if (e.state !== 'offstage' || e.gang_sub !== 'tele') return;
    if (((e.t / 5) | 0) % 2) return;
    Px.use(ctx);
    const L = e.gang_side === 'L';
    const x = L ? 4 : W - 4, y = Math.round(e.y - 22), d = L ? 1 : -1;
    // red "!" box with an arrow pointing into the screen
    Px.rect(x + (L ? 0 : -12), y - 8, 12, 15, '#140c0a');
    Px.rect(x + (L ? 1 : -11), y - 7, 10, 13, C.red);
    drawText(ctx, '!', x + (L ? 4 : -8), y - 4, '#ffffff', 1, 'left', null);
    const ax = x + d * 13;
    Px.poly([ax, y - 6, ax + d * 9, y, ax, y + 6], '#140c0a');
    Px.poly([ax, y - 4, ax + d * 7, y, ax, y + 4], C.red);
  }
  // Bike + crouched skull-helmet rider. Local coords: origin on the ground under the bike, facing right.
  function drawWheel(cx, cy, ang) {
    Px.disc(cx, cy, 7, '#1a1a1a');
    Px.disc(cx, cy, 5, '#3a3a3a');
    for (let i = 0; i < 2; i++) {
      const a = ang + i * Math.PI / 2;
      Px.line(cx - Math.cos(a) * 4.5, cy - Math.sin(a) * 4.5, cx + Math.cos(a) * 4.5, cy + Math.sin(a) * 4.5, 1, '#8a8a8a');
    }
    Px.disc(cx, cy, 2, '#8a8a8a');
    Px.dot(cx - 1, cy - 1, '#c8c8c8');
    Px.rect(cx - 5, cy - 7, 4, 1, '#3a3a3a');
  }
  const RIDER_POSE = pose({ hx: -9.9, hy: -23, rot: 0.85, head: -0.25, fThigh: 2.1, fKnee: -1.5, bThigh: 1.95, bKnee: -1.55,
    fUpper: 2.5, fElbow: -0.85, bUpper: 2.3, bElbow: -0.7 });
  function drawRaider(e) {
    const g = Sprite.cur.ga;
    const wreck = e.state === 'wreck';
    const w = e.gang_wheel || 0;
    if (wreck) {
      const q = (e.gang_rot || 0) % 4, cy = q % 2 ? -27 : q === 2 ? -17 : -14;
      g.save(); g.translate(0, cy); g.rotate(q * Math.PI / 2); g.translate(0, 14);
    }
    // rear fender + swingarm
    Px.poly([-26, -11, -22, -16, -13, -15, -16, -11], '#2e2e2e');
    Px.line(-19, -7, -3, -11, 3, '#3a3a3a');
    drawWheel(-19, -7, w);
    drawWheel(19, -7, w + 0.6);
    // engine block with fins
    Px.rect(-7, -16, 13, 9, '#2a2a2a');
    for (let i = -6; i < 6; i += 2) Px.rect(i, -15, 1, 7, '#4a4a4a');
    Px.rect(-2, -20, 5, 5, '#3a3a3a');
    // exhaust pipe + flame
    Px.line(-4, -9, -25, -13, 3, '#b8bec4');
    Px.line(-4, -8, -25, -12, 1, '#7a8088');
    if (!wreck) {
      const fl = 5 + ((e.t >> 1) % 3) * 2;
      Px.poly([-25, -16, -25 - fl, -13, -25, -10], '#ff8a2a');
      Px.poly([-25, -14, -25 - fl * 0.5, -13, -25, -12], '#ffe066');
    }
    // frame tubes
    Px.line(-15, -19, 12, -22, 2, '#3a3a3a');
    Px.line(12, -22, 4, -10, 2, '#3a3a3a');
    // seat
    Px.poly([-18, -21, -6, -22, -5, -18, -17, -18], '#1e1a18');
    Px.rect(-16, -21, 8, 1, '#4a403a');
    // tank
    Px.poly([-5, -22, 9, -25, 13, -21, 9, -17, -4, -17], '#9b2d20');
    Px.line(-3, -22, 8, -24, 1, shade('#9b2d20', 0.35));
    Px.line(-3, -18, 9, -18, 1, shade('#9b2d20', -0.35));
    Px.rect(5, -22, 3, 2, '#e8e0d0');
    Px.dot(6, -22, '#1a1a1a');
    // rider (Punk rig, crouched) unless thrown off
    if (!wreck && !e.dying) drawHumanoid(RIDER_POSE, punkStyle(e, { hair: C.mohawk, pants: C.jeans, helmet: true }));
    // fork, fender, handlebar, headlight
    Px.poly([12, -13, 16, -17, 25, -15, 26, -11], '#2e2e2e');
    Px.line(15, -26, 19, -7, 2, '#8a8a8a');
    Px.line(15, -27, 11, -31, 2, '#2a2a2a');
    Px.rect(10, -32, 3, 2, '#1a1a1a');
    Px.disc(19, -23, 3, '#3a3a3a');
    Px.disc(20, -23, 2.2, '#fff2a0');
    Px.dot(21, -24, '#ffffff');
    if (wreck) g.restore();
  }
  ENEMY_TYPES.raider = {
    name: 'ROAD RAIDER', family: 'gang', hp: 20, speed: 5.5, w: 9, h: 34, score: 800, weight: 1,
    noToken: true, offscreenOk: true, noGrab: true, noSeparate: true, launchable: false, gear: C.helmet,
    sprite: [128, 84, 64, 64],
    attacks: {},
    init(opts) {
      this.gang_uturn = !!(opts && opts.uturn);
      this.gang_side = opts && opts.enter;
      this.noShadow = true;
      this.takeHit = raiderTakeHit;
      this.sortY = raiderSortY;
      this.drawMarker = raiderMarker;
      this.knockDown = () => {};          // the bike ignores stray knockdowns (respawn shockwave, explosions)
      this.setPanic = () => {};
    },
    stateUpdate() { return raiderUpdate.call(this); },
    drawBody() { drawRaider(this); },
    drawExtra(ctx, camX) { raiderOverlay(this, ctx, camX); },
    eyes() { return [[21, -23, '#fff2a0'], [22, -23, '#fff2a0'], [21, -22, '#fff2a0'], [3, -38, C.red]]; },
  };
})();
