// Mutants: "THE GLOWING" (Ghoul, Bloater) and King Valve's Iron Guard (Kiln Trooper).
// Registers ENEMY_TYPES.ghoul, ENEMY_TYPES.bloater, ENEMY_TYPES.kiln and their SFX (SFX.mut*).
//
// Spawn contracts:
//   { type: 'ghoul', side: 'vat', x /* screen x */ }   climbs out of a vat at the back wall (z 30), drops to the floor
//   opts.secondWind: true|false forces or forbids the Ghoul's Second Wind (default: 30% roll)
// Ghouls regenerate 1 HP per 10f while standing in any entity with toxic === true (ellipse x, y, rx, ry).
// Everything else is private to this IIFE.
(function () {
  // ===================================================================================
  // Shared helpers
  // ===================================================================================
  const RIM_RED = '#ff3b30';
  const fighterVulnerable = Object.getOwnPropertyDescriptor(Fighter.prototype, 'vulnerable').get;

  const mixCache = new Map();
  function mix(a, b, k) {
    k = Math.round(clamp(k, 0, 1) * 16) / 16;
    const key = a + b + k;
    let v = mixCache.get(key);
    if (!v) {
      const A = hexToRgb(a), B = hexToRgb(b);
      v = '#' + A.map((c, i) => Math.round(lerp(c, B[i], k)).toString(16).padStart(2, '0')).join('');
      mixCache.set(key, v);
    }
    return v;
  }
  function withAlpha(a, fn) {
    const g = Px.g, old = g.globalAlpha;
    g.globalAlpha = old * a;
    fn();
    g.globalAlpha = old;
  }
  // Rotate a body-space offset by `r` (positive = clockwise on screen = top tips forward).
  function rot(x, y, r) { const c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; }

  // Like Enemy.moveToward but with an explicit depth speed (this.mutDsp), so the walk/depth ratios match the spec.
  function moveTowardD(tx, ty, k = 1) {
    const sx = this.speed * k, sy = (this.mutDsp != null ? this.mutDsp : this.speed * 0.65) * k;
    const dx = tx - this.x, dy = ty - this.y;
    this.vx = Math.abs(dx) > 2 ? sign(dx) * Math.min(sx, Math.abs(dx)) : 0;
    this.vy = Math.abs(dy) > 1 ? sign(dy) * Math.min(sy, Math.abs(dy)) : 0;
    if (this.vx || this.vy) { if (this.state !== 'walk') this.setState('walk'); }
    else if (this.state !== 'idle') this.setState('idle');
  }

  // Start an attack the way Enemy.attack does (difficulty-adjusted wind-up) with a chosen family sound.
  function startAtk(e, key, sfx) {
    const base = e.def.attacks[key];
    if (!base) return;
    const a = Object.assign({ key }, base);
    a.start = Math.max(a.tell === 'heavy' ? 10 : 4, a.start + (Game.diff.tele || 0) - (e.teleCut || 0));
    e.startAttack(a);
    if (sfx) Sound.sfx(sfx, e.x);
  }

  // Melee brain with a per-token plan: when an attack token is won, pick an attack, walk to that attack's
  // preferred distance on the hero's line, and strike once inside its window.
  // plans: { key: { min, max, dy, at, ok(p), alt } } (alt = fallback plan when ok() fails); choose(adx, ady) -> key (this = enemy)
  function planThink(e, plans, choose, start) {
    const p = Game.player;
    if (!e.token) e.mutTokT = 0;
    if (!p || Game.playerGone || p.hp <= 0 || p.state === 'down' || p.state === 'getup') { e.circle(p, 1.3); return; }
    const dx = p.x - e.x, dy = p.y - e.y, adx = Math.abs(dx), ady = Math.abs(dy);
    if (e.ai === 'retreat') {
      e.face(p);
      e.moveToward(e.x - sign(dx || 1) * 40, e.y + e.slot.dy * 0.2, 0.7);
      if (e.aiT > (e.def.retreatT || 24)) { e.ai = 'approach'; e.aiT = 0; }
      return;
    }
    if (e.cool <= 0 && e.onScreen() && e.takeToken()) {
      e.face(p);
      e.mutTokT = (e.mutTokT || 0) + 1;
      if (!e.mutPlan || !plans[e.mutPlan]) e.mutPlan = choose.call(e, adx, ady);
      let pl = plans[e.mutPlan];
      if (pl.ok && !pl.ok.call(e, p)) { e.mutPlan = pl.alt; pl = plans[e.mutPlan]; }
      if (adx >= pl.min && adx <= pl.max && ady <= pl.dy) {
        const key = e.mutPlan;
        e.mutPlan = null; e.mutTokT = 0;
        e.vx = e.vy = 0;
        if (start) start(e, key); else e.attack(key);
        return;
      }
      e.moveToward(p.x - sign(dx || 1) * pl.at, p.y, 1);
      if (e.mutTokT > 220) { e.dropToken(); e.cool = 30; e.mutTokT = 0; e.mutPlan = null; }
      return;
    }
    e.circle(p, 1);
  }

  // Is the enemy standing inside a toxic puddle (any entity with toxic === true)?
  function inToxic(e) {
    for (const t of Game.ents) {
      if (!t.toxic || t.remove) continue;
      const dx = (e.x - t.x) / (t.rx || 15), dy = (e.y - t.y) / (t.ry || 4);
      if (dx * dx + dy * dy <= 1) return t;
    }
    return null;
  }

  function greenSteam(x, y, z) {
    FX.add({ kind: 'dust', x: x + rr(-5, 5), y, z, vx: rr(-0.15, 0.15), vz: 0.6, g: 0, life: 46, size: rr(2, 3), grow: 0.08, color: '#7cff6a', alpha: 0.5 });
  }
  function orangeSparks(x, y, z, n = 4) {
    for (let i = 0; i < n; i++) FX.add({ kind: 'chunk', x, y, z, vx: rr(-1.8, 1.8), vz: rr(1.2, 2.8), life: 26, size: 1, color: '#ffb04a', g: 0.25, ground: y });
  }

  // Universal telegraph (b): a 1px #FF3B30 rim around the silhouette, 4f on / 4f off, during the
  // last 10 wind-up frames. Drawn from Enemy.draw's drawExtra hook as a ring outside the sprite.
  let rimCv = null, rimG = null;
  function drawRim(e, ctx, camX) {
    const a = e.telegraphing();
    if (!a || !a.mutRim) return;
    if (a.start - e.t > 10 || ((e.t >> 2) & 1)) return;
    const s = Sprite.cur;
    if (!s) return;
    if (!rimCv || rimCv.width !== s.w || rimCv.height !== s.h) {
      rimCv = document.createElement('canvas'); rimCv.width = s.w; rimCv.height = s.h;
      rimG = rimCv.getContext('2d');
    }
    s.gb.globalCompositeOperation = 'copy'; s.gb.drawImage(s.a, 0, 0);
    s.gb.globalCompositeOperation = 'source-in'; s.gb.fillStyle = RIM_RED; s.gb.fillRect(0, 0, s.w, s.h);
    s.gb.globalCompositeOperation = 'source-over';
    rimG.globalCompositeOperation = 'source-over';
    rimG.clearRect(0, 0, s.w, s.h);
    rimG.drawImage(s.b, -1, 0); rimG.drawImage(s.b, 1, 0); rimG.drawImage(s.b, 0, -1); rimG.drawImage(s.b, 0, 1);
    rimG.globalCompositeOperation = 'destination-out';
    rimG.drawImage(s.a, 0, 0);
    rimG.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.translate(Math.round(e.x - camX + e.jitter), Math.round(e.y - e.z));
    if (e.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(rimCv, -s.ox, -s.oy);
    ctx.restore();
  }

  // ===================================================================================
  // Sound effects (shared SFX registry, mut* prefix)
  // ===================================================================================
  function lfo(a, param, hz, depth, dur) {
    const c = a.ctx, now = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = hz; g.gain.value = depth;
    o.connect(g); g.connect(param);
    o.start(now); o.stop(now + dur + 0.05);
  }
  // Squelch material layer: sine 300 -> 120 Hz with a 20 Hz wobble, 100 ms.
  SFX.mutSquelch = (a, p) => {
    const d = a.out(p);
    const o = a.tone(300, 120, 0.1, 'sine', 0.3, 0, d);
    lfo(a, o.frequency, 20, 45, 0.1);
    a.noise(0.07, 0.12, 700, 1.5, 'lowpass', 0, d, 220);
  };
  // Mutant groan: sawtooth 70 Hz rising, +/-10 Hz at 6 Hz, through a 500 Hz lowpass, 400 ms.
  SFX.mutGroan = (a, p) => {
    const c = a.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.connect(a.out(p));
    const o = a.tone(70, 105, 0.42, 'sawtooth', 0.26, 0, f, 0.06);
    lfo(a, o.frequency, 6, 10, 0.42);
    a.noise(0.4, 0.05, 400, 1, 'lowpass', 0, f);
  };
  // Bloater inflate / belch wind-up: sine 200 -> 600 Hz with tremolo plus a rising wheeze.
  SFX.mutInflate = (a, p) => {
    const c = a.ctx;
    const trem = c.createGain(); trem.gain.value = 0.6; trem.connect(a.out(p));
    lfo(a, trem.gain, 12, 0.4, 0.5);
    a.tone(200, 600, 0.5, 'sine', 0.2, 0, trem, 0.05);
    a.noise(0.5, 0.08, 500, 3, 'bandpass', 0, trem, 1800);
  };
  SFX.mutBelch = (a, p) => {
    const d = a.out(p, true);
    a.tone(120, 55, 0.32, 'sawtooth', 0.2, 0, d, 0.02);
    a.noise(0.45, 0.25, 700, 0.8, 'lowpass', 0, d, 200);
  };
  // Fuse beep: 1 kHz square.
  SFX.mutFuse = (a, p) => { a.tone(1000, 0, 0.035, 'square', 0.12, 0, a.out(p)); };
  SFX.mutChomp = (a, p) => {
    const d = a.out(p, true);
    a.noise(0.05, 0.4, 1600, 1, 'bandpass', 0, d);
    a.tone(190, 80, 0.08, 'square', 0.22, 0, d);
  };
  SFX.mutSplash = (a, p) => {
    const d = a.out(p);
    a.noise(0.3, 0.3, 900, 0.8, 'lowpass', 0, d, 160);
    a.tone(240, 80, 0.2, 'sine', 0.2, 0, d);
    a.tone(520, 300, 0.06, 'sine', 0.1, 0.12, d);
  };
  // Iron Guard family tell: a pressure hiss.
  SFX.mutHiss = (a, p) => { a.noise(0.22, 0.2, 3200, 1, 'highpass', 0, a.out(p), 5200); };
  // Flame Jet wind-up: an 8 Hz tick.
  SFX.mutTick = (a, p) => { a.tone(1500, 0, 0.014, 'square', 0.07, 0, a.out(p)); };
  // Flamethrower: noise -> lowpass 1.2 kHz with random crackle ticks.
  SFX.mutFlame = (a, p) => {
    const d = a.out(p);
    a.noise(0.75, 0.3, 1200, 0.7, 'lowpass', 0, d, 900);
    for (let i = 0; i < 6; i++) a.tone(2400 + Math.random() * 1600, 0, 0.012, 'square', 0.05, Math.random() * 0.65, d);
  };
  SFX.mutTankHiss = (a, p) => {
    const d = a.out(p);
    a.noise(0.2, 0.22, 2600, 1, 'highpass', 0, d, 6000);
    a.tone(1700, 2500, 0.18, 'sine', 0.05, 0, d);
  };

  // ===================================================================================
  // GHOUL (names GHOUL, RUNT, GRUB): hunched lurcher, claw swipe, lunge grab, second wind
  // ===================================================================================
  const GH = {
    skin: '#8fa868', dk: '#6e8648', deep: '#58703a', hi: '#a9c283',
    boil: '#7cff6a', boilHi: '#e2ffb0',
    rag: '#5a4a3a', ragDk: '#3c3024',
    eye: '#fff36a', eyeSW: '#ff3b30', mouth: '#2a1a10', claw: '#d9d2a6',
  };
  const GH_S = 0.9;                                                     // 40 px tall on the 44 px rig
  const GH_LONG = Object.assign({}, DIMS_HUMAN, { upper: 8 * 1.3, fore: 8 * 1.3 }); // far arm 1.3x

  const GPose = {
    idle(an) {
      const b = Math.sin(an * 0.07);
      return pose({ hy: -19 + b * 0.5, rot: 0.5 + b * 0.03, head: -0.7, fThigh: 0.85, fKnee: -1.0, bThigh: 0.45, bKnee: -0.85,
        fUpper: 0.75 + b * 0.08, fElbow: 0.4, bUpper: 0.62 - b * 0.1, bElbow: 0.3 });
    },
    walk(e) {
      const k = e.mutSW === 2 ? 1.3 : 1;
      const ph = e.anim * 0.14 * k, s = Math.sin(ph), c = Math.cos(ph);
      const step = (e.mutLurch || 0) < 8 && e.state === 'walk';
      return pose({ hy: -19 - Math.abs(c) * 0.8, rot: (step ? 0.72 : 0.52) + s * 0.05, head: step ? -0.85 : -0.7,
        fThigh: 0.62 + s * 0.42, fKnee: -0.85 - Math.max(0, -s) * 0.7, bThigh: 0.62 - s * 0.42, bKnee: -0.85 - Math.max(0, s) * 0.7,
        fUpper: 0.75 - s * 0.3 + (step ? 0.45 : 0), fElbow: 0.4, bUpper: 0.65 + s * 0.35 + (step ? 0.55 : 0), bElbow: 0.3 });
    },
    claw(ph, t, a) {
      if (ph === 'start') {
        const k = easeOut(clamp(t / Math.max(1, a.start), 0, 1));
        return pose({ hy: -19, rot: lerp(0.5, 0.25, k), head: -0.35, fThigh: 0.9, fKnee: -1.0, bThigh: 0.2, bKnee: -0.7,
          fUpper: lerp(0.5, 1.1, k), fElbow: 0.5, bUpper: lerp(0.35, -2.5, k), bElbow: lerp(0.25, 0.7, k) });
      }
      if (ph === 'active') return pose({ hx: 2, hy: -18, rot: 0.8, head: -0.65, fThigh: 1.25, fKnee: -0.9, bThigh: 0.1, bKnee: -0.6,
        fUpper: 0.3, fElbow: 0.4, bUpper: 1.95, bElbow: 0.1 });
      return pose({ hx: 1, hy: -18, rot: 0.68, head: -0.6, fThigh: 1.1, fKnee: -1.0, bThigh: 0.2, bKnee: -0.7,
        fUpper: 0.4, fElbow: 0.4, bUpper: 1.15, bElbow: 0.35 });
    },
    lunge(ph, t, a) {
      if (ph === 'start') {
        const tr = (t >> 1) % 2 ? 0.4 : -0.4;
        return [pose({ hx: tr, hy: -15, rot: 0.7, head: -0.55, fThigh: 1.45, fKnee: -1.9, bThigh: 0.35, bKnee: -1.4,
          fUpper: 1.95, fElbow: -0.25, bUpper: -1.0, bElbow: 0.35 }), true];
      }
      if (ph === 'active') return [pose({ hy: -20, rot: 1.15, head: -0.15, fThigh: 0.9, fKnee: -0.5, bThigh: 0.4, bKnee: -0.5,
        fUpper: 2.15, fElbow: 0.05, bUpper: 2.05, bElbow: 0.15 }), false];
      // missed: skid on the heels
      return [pose({ hy: -16, rot: 0.85, head: -0.35, fThigh: 1.7, fKnee: -0.7, bThigh: 0.35, bKnee: -1.5,
        fUpper: 1.0, fElbow: 0.4, bUpper: -0.5, bElbow: 0.5 }), true];
    },
    clutch(e) {
      const bt = e.t % 24, bite = bt >= 18 && bt <= 22 ? 1 : 0;
      const sh = Math.sin(e.t * 0.5) * 0.04;
      return pose({ hx: bite, hy: -19, rot: 0.55 + sh + bite * 0.12, head: -0.55 - bite * 0.35, fThigh: 1.05, fKnee: -1.0, bThigh: 0.3, bKnee: -0.8,
        fUpper: 1.55, fElbow: 1.35, bUpper: 1.8, bElbow: 1.15 });
    },
    vat(e) {
      // hang from the rim -> pull up -> swing a leg over -> crouch on the rim
      const hang = pose({ hy: -20, rot: 0.12, head: -0.35, fThigh: 0.25, fKnee: -0.4, bThigh: -0.1, bKnee: -0.3,
        fUpper: 2.85, fElbow: 0.25, bUpper: 2.65, bElbow: 0.35 });
      const pull = pose({ hy: -18, rot: 0.5, head: -0.6, fThigh: 1.6, fKnee: -1.6, bThigh: 0.1, bKnee: -0.6,
        fUpper: 1.3, fElbow: 1.7, bUpper: 1.2, bElbow: 1.5 });
      const perch = pose({ hy: -13, rot: 0.6, head: -0.65, fThigh: 1.5, fKnee: -2.1, bThigh: 0.9, bKnee: -1.8,
        fUpper: 0.9, fElbow: 0.5, bUpper: 0.75, bElbow: 0.4 });
      const t = e.t;
      if (t < 22) return lerpPose(hang, pull, clamp((t - 6) / 16, 0, 1));
      if (t < 36) return lerpPose(pull, perch, (t - 22) / 14);
      const b = Math.sin(t * 0.3) * 0.05;
      return Object.assign(perch, { rot: perch.rot + b, head: perch.head + b * 2 });
    },
    drop() {
      return pose({ hy: -20, rot: 0.35, head: -0.5, fThigh: 1.1, fKnee: -1.4, bThigh: 0.4, bKnee: -1.1,
        fUpper: 2.3, fElbow: 0.4, bUpper: 1.9, bElbow: 0.5 });
    },
  };

  // Returns [pose, grounded] for the ghoul's current state.
  function ghoulPose(e) {
    switch (e.state) {
      case 'idle': case 'taunt': return [GPose.idle(e.anim), true];
      case 'walk': case 'enter': case 'door': return [GPose.walk(e), true];
      case 'mutClutch': return [GPose.clutch(e), true];
      case 'mutVat': return [GPose.vat(e), true];
      case 'drop': return [GPose.drop(), false];
      case 'attack': {
        const a = e.atk, ph = e.atkPhase();
        if (a && a.key === 'lunge') return GPose.lunge(ph, e.t, a);
        return [GPose.claw(ph, e.t, a || { start: 14 }), true];
      }
      case 'down': {
        const p = Poses.down();
        if (e.mutTwitch > 0) { p.rot += 0.12; p.fUpper += 0.6; p.head += 0.3; }
        return [p, false];
      }
    }
    const st = e.state;
    return [enemyHumanPose(e, null), ['hurt', 'dizzy', 'panic', 'grabbed', 'pinned'].includes(st)];
  }

  function ghClaws(H, b, s, col, tip) {
    for (let k = -1; k <= 1; k++) {
      const a = b + k * 0.42;
      const ux = Math.sin(a), uy = Math.cos(a), vx = -uy, vy = ux;
      const bx = H.x + ux * 1.2 * s, by = H.y + uy * 1.2 * s;
      const L = (k === 0 ? 5.2 : 4.2) * s;
      Px.poly([bx + vx * 1.1 * s, by + vy * 1.1 * s, bx + ux * L, by + uy * L, bx - vx * 1.1 * s, by - vy * 1.1 * s], col);
      Px.dot(bx + ux * (L - 1), by + uy * (L - 1), tip);
    }
    Px.disc(H.x, H.y, 1.9 * s, col);
  }
  function ghFoot(F, b, s, c) {
    const a = b + Math.PI / 2;
    Px.limb(F.x - Math.sin(a) * s, F.y - Math.cos(a) * s, F.x + Math.sin(a) * 3.5 * s, F.y + Math.cos(a) * 3.5 * s, 3 * s, 2 * s, c);
  }
  function ghBoil(x, y, r, a) {
    withAlpha(a, () => Px.disc(x, y, r, GH.boil));
    Px.dot(x - 0.5, y - 0.8, GH.boilHi);
  }

  function drawGhoul(e) {
    const g = Sprite.cur.ga;
    const [p, grounded] = ghoulPose(e);
    const s = GH_S;
    const R = solveRig(p, s, DIMS_HUMAN);
    R.ba = solveRig(p, s, GH_LONG).ba;
    let T = grounded ? -Math.round(Math.max(R.fl.F.y, R.bl.F.y)) : 0;
    g.save();
    if (e.state === 'mutVat') {
      // climbing out of the vat: everything below the rim (local y 0) is hidden inside it
      g.beginPath(); g.rect(-56, -88, 112, 88); g.clip();
      T += Math.round(e.mutRise || 0);
    }
    g.translate(0, T);
    const lw = 4 * s;
    const an = e.anim;
    const pulse = k => 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(an * 0.12 + k * 1.9));
    const sx0 = R.S.x - R.H.x, sy0 = R.S.y - R.H.y, L = Math.hypot(sx0, sy0) || 1;
    const ux = sx0 / L, uy = sy0 / L, nx = -uy, ny = ux; // spine direction (hip -> shoulder) and its forward normal
    const sw = e.mutSW === 2 || (e.mutSW === 1 && e.state === 'down' && e.t > 60 && (e.t >> 2) % 2);
    const eyeC = sw ? GH.eyeSW : GH.eye;

    // 1. far arm: 1.3x long, three finger claws
    Px.limb(R.S.x, R.S.y, R.ba.E.x, R.ba.E.y, lw, lw * 0.85, GH.deep);
    Px.limb(R.ba.E.x, R.ba.E.y, R.ba.H.x, R.ba.H.y, lw * 0.85, lw * 0.7, GH.deep);
    ghClaws(R.ba.H, R.ba.b, s * 1.15, GH.deep, GH.claw);
    // 2. far leg
    Px.limb(R.H.x, R.H.y, R.bl.K.x, R.bl.K.y, lw * 1.2, lw * 0.9, GH.deep);
    Px.limb(R.bl.K.x, R.bl.K.y, R.bl.F.x, R.bl.F.y, lw * 0.9, lw * 0.7, GH.deep);
    ghFoot(R.bl.F, R.bl.b, s, GH.deep);
    // 3. torso: hunched, hump, ribs, spine knobs
    Px.quad(R.H.x, R.H.y, R.S.x, R.S.y, 7 * s, 10 * s, GH.skin);
    Px.disc(R.S.x - nx * 2.8 * s - ux * 1.5 * s, R.S.y - ny * 2.8 * s - uy * 1.5 * s, 4.6 * s, GH.skin);
    Px.line(R.H.x - nx * 3 * s, R.H.y - ny * 3 * s, R.S.x - nx * 5 * s, R.S.y - ny * 5 * s, 2, GH.dk);
    for (const k of [0.35, 0.6, 0.85]) Px.dot(lerp(R.H.x, R.S.x, k) - nx * 5 * s, lerp(R.H.y, R.S.y, k) - ny * 5 * s, GH.hi);
    for (const k of [0.45, 0.62, 0.79]) {
      const px = lerp(R.H.x, R.S.x, k), py = lerp(R.H.y, R.S.y, k);
      Px.line(px + nx * 0.5, py + ny * 0.5, px + nx * 3.4 * s - ux, py + ny * 3.4 * s - uy, 1, GH.dk);
    }
    Px.line(R.H.x + nx * 2.8 * s, R.H.y + ny * 2.8 * s, lerp(R.H.x, R.S.x, 0.35) + nx * 3.4 * s, lerp(R.H.y, R.S.y, 0.35) + ny * 3.4 * s, 1, GH.hi);
    ghBoil(lerp(R.H.x, R.S.x, 0.55) - nx * 2.4 * s, lerp(R.H.y, R.S.y, 0.55) - ny * 2.4 * s, 2, pulse(0));
    ghBoil(R.S.x - nx * 2.8 * s - ux * 2 * s, R.S.y - ny * 2.8 * s - uy * 2 * s, 2, pulse(1));
    // 4. near leg
    Px.limb(R.H.x, R.H.y, R.fl.K.x, R.fl.K.y, lw * 1.2, lw * 0.9, GH.skin);
    Px.limb(R.fl.K.x, R.fl.K.y, R.fl.F.x, R.fl.F.y, lw * 0.9, lw * 0.7, GH.dk);
    Px.dot(R.fl.K.x, R.fl.K.y - 1, GH.hi);
    ghFoot(R.fl.F, R.fl.b, s, GH.skin);
    ghBoil(lerp(R.H.x, R.fl.K.x, 0.55) + 0.5, lerp(R.H.y, R.fl.K.y, 0.55), 1.8, pulse(2));
    // 5. rag loincloth, hanging from the hips
    const flap = Math.sin(an * 0.18) * (e.state === 'walk' ? 1.2 : 0.4) + (e.state === 'attack' && e.atkPhase() === 'active' ? -1.5 : 0);
    const hx = R.H.x, hy = R.H.y;
    Px.poly([hx - 4.6 * s, hy - 1.6 * s, hx + 4.6 * s, hy - 1.6 * s, hx + 4.2 * s + flap, hy + 6 * s, hx + 2.2 * s + flap, hy + 4.4 * s,
      hx + 0.8 * s + flap, hy + 7.4 * s, hx - 1.4 * s + flap, hy + 5 * s, hx - 3.4 * s + flap, hy + 7 * s, hx - 4.9 * s, hy + 3 * s], GH.rag);
    Px.rect(hx - 4.6 * s, hy - 1.8 * s, 9.2 * s, 1, GH.ragDk);
    Px.line(hx + 0.6 * s, hy, hx + 0.4 * s + flap, hy + 5.5 * s, 1, GH.ragDk);
    // 6. head: bald, jutting jaw, pinpoint eyes, mouth slash
    const Hd = R.Hd;
    Px.disc(Hd.x, Hd.y, 4.4 * s, GH.skin);
    Px.oval(Hd.x - 1.8 * s, Hd.y + 1 * s, 2 * s, 2.6 * s, GH.dk);
    const open = (e.state === 'attack' && e.atk && e.atk.key === 'lunge' && e.atkPhase() !== 'rec') || (e.state === 'mutClutch' && e.t % 24 >= 16);
    Px.oval(Hd.x + 2.4 * s, Hd.y + 2 * s + (open ? 0.6 : 0), 2.7 * s, (open ? 2.5 : 1.9) * s, GH.skin);
    Px.line(Hd.x + 0.8 * s, Hd.y - 2.2 * s, Hd.x + 4.6 * s, Hd.y - 1.4 * s, 1, GH.dk);
    if (open) {
      Px.oval(Hd.x + 3.4 * s, Hd.y + 2.4 * s, 1.8 * s, 1.3 * s, GH.mouth);
      Px.dot(Hd.x + 3.6 * s, Hd.y + 1.4 * s, GH.claw); Px.dot(Hd.x + 2.4 * s, Hd.y + 3.4 * s, GH.claw);
    } else {
      Px.line(Hd.x + 1.6 * s, Hd.y + 2.4 * s, Hd.x + 4.8 * s, Hd.y + 1.8 * s, 1, GH.mouth);
      Px.dot(Hd.x + 3.3 * s, Hd.y + 2.6 * s, GH.claw);
    }
    const ex1 = Math.round(Hd.x + 3.4 * s), ex2 = Math.round(Hd.x + 1.4 * s), ey = Math.round(Hd.y - 0.8 * s);
    Px.dot(ex1, ey, eyeC); Px.dot(ex2, ey, eyeC);
    ghBoil(Hd.x - 1.4 * s, Hd.y - 3.2 * s, 1.6, pulse(3));
    // 7. near arm (normal length)
    Px.limb(R.S.x, R.S.y, R.fa.E.x, R.fa.E.y, lw, lw * 0.85, GH.skin);
    Px.limb(R.fa.E.x, R.fa.E.y, R.fa.H.x, R.fa.H.y, lw * 0.85, lw * 0.7, GH.skin);
    Px.dot(R.S.x, R.S.y - 1, GH.hi);
    ghClaws(R.fa.H, R.fa.b, s, GH.skin, GH.claw);
    g.restore();

    e.mutEyes = [[ex1, ey + T, eyeC], [ex2, ey + T, eyeC]];
    if (e.state === 'attack' && e.atk) {
      const Hn = e.atk.key === 'claw' ? R.ba.H : R.fa.H;
      e.atk.glint = [Math.round(Hn.x), Math.round(Hn.y + T)];
    }
  }

  function ghoulThink() {
    this.mutLurch = ((this.mutLurch || 0) + 1) % 40;
    const k = this.mutSW === 2 ? 1.3 : 1;
    this.speed = (this.mutLurch < 8 ? 1.6 : 0.6) * k;      // lurch 0.6 px/f, lunge-step 1.6 px/f for 8f every 40f
    this.mutDsp = 0.6 * k;
    planThink(this, GHOUL_PLANS, ghoulChoose);
  }
  const GHOUL_PLANS = {
    claw: { min: 4, max: 26, dy: 5, at: 18 },
    lunge: { min: 14, max: 38, dy: 4, at: 30, alt: 'claw', ok: p => !p.heldBy && p.state !== 'grabbed' && p.z < 6 },
  };
  function ghoulChoose(adx) {
    const p = Game.player;
    if (p && (p.heldBy || p.state === 'grabbed')) return 'claw';
    return chance(adx > 30 ? 0.55 : 0.3) ? 'lunge' : 'claw';
  }

  function ghoulGrab(e, p) {
    p.holdBy(e);
    e.holding = true; e.mashK = 1; e.clutchT = 0;
    e.atk = null;
    e.setState('mutClutch');
    e.vx = e.vy = e.vz = 0; e.z = 0;
    Sound.sfx('grab', e.x);
    Sound.sfx('mutGroan', e.x);
    FX.text(p.x, p.y, 52, 'MASH!', '#ffe066', 40);
  }
  // Ghoul lets go of the hero by itself: stagger > 0 after a mash escape, 0 when it simply gives up.
  function ghoulLetGo(e, stagger) {
    const p = Game.player;
    e.holding = false;
    if (p && p.heldBy === e) p.freeFromHold(e.facing);
    if (stagger) {
      e.atk = null;
      e.setState('hurt');
      e.hurtTime = stagger; e.hurtAlt = 1;
      e.vx = -e.facing * 1.6;
      e.ai = 'retreat'; e.aiT = 0;
      e.cool = Math.round(ri(60, 110) * Game.stageMult());
    } else e.finishAttack();
  }
  // Hold broken by the hero (Scrap Burst, a hit on the hero, the hero's death).
  function ghoulReleaseClutch() {
    this.holding = false;
    if (this.state === 'mutClutch') {
      this.atk = null;
      this.setState('hurt');
      this.hurtTime = 14; this.hurtAlt = 1;
      this.vx = -this.facing * 1.2;
      this.ai = 'retreat'; this.aiT = 0;
      this.cool = Math.round(ri(60, 110) * Game.stageMult());
    }
  }
  function clutchUpdate(e) {
    const p = Game.player;
    if (!e.holding || !p || p.heldBy !== e) { e.holding = false; e.finishAttack(); return true; }
    e.vx = e.vy = e.vz = 0; e.z = 0;
    p.x = e.x + e.facing * 11;
    p.y = e.y - 0.5;
    p.facing = -e.facing;
    p.vx = p.vy = 0;
    if (p.z > 0) p.z = Math.max(0, p.z - 2);
    if (e.t % 24 === 20) {                         // bite: 4 dmg every 24f
      Sound.sfx('mutChomp', e.x);
      FX.splat(p.x - e.facing * 2, p.y, 32, '#7cff4f', 3, -e.facing);
      p.holdDamage(4);
      if (!e.holding) return true;
    }
    if (e.clutchT >= 8) { FX.dust(e.x, e.y, 4, 1.2); ghoulLetGo(e, 30); return true; }
    if (e.t >= 120) { ghoulLetGo(e, 0); return true; }
    return true;
  }

  function ghoulAttackTick(a, ph) {
    if (ph === 'start' && this.t === Math.max(1, a.start - 6) && a.key === 'claw') Sound.sfx('groan', this.x);
    if (a.key !== 'lunge') return;
    if (ph === 'start') { this.vx = this.vy = 0; return; }
    if (ph === 'active') {
      if (this.t === a.start) { this.vz = 2.4; this.z = Math.max(this.z, 0.5); Sound.sfx('whooshBig', this.x); }
      this.vx = 3.0 * this.facing; this.vy = 0;
      const p = Game.player;
      if (p && p.vulnerable && !p.heldBy && p.state !== 'grabbed' && p.z < 10 && Math.abs(p.y - this.y) <= 8 &&
          (p.x - this.x) * this.facing >= -4 && Math.abs(p.x - this.x) <= 12 + p.w) ghoulGrab(this, p);
      return;
    }
    // rec: missed, skidding for 30f
    this.vx *= 0.92;
    if (this.z <= 0 && Math.abs(this.vx) > 0.4 && this.t % 3 === 0) FX.dust(this.x - this.facing * 2, this.y, 1, 0.6);
    if (this.t === a.start + a.active) Sound.sfx('land', this.x);
  }

  function ghoulVatEnter() {
    this.y = Game.bounds.yMin;
    this.z = 30; this.vz = 0; this.vx = this.vy = 0;
    this.mutRise = VAT_RISE;
    this.noShadow = true;
    this.facing = Game.player && Game.player.x < this.x ? -1 : 1;
    this.setState('mutVat');
    Sound.sfx('mutSplash', this.x);
  }
  const VAT_RISE = 48;
  function vatUpdate(e) {
    e.vx = e.vy = 0;
    e.z = 30; e.vz = 0;
    e.face(Game.player);
    const k = clamp(e.t / 34, 0, 1);
    e.mutRise = VAT_RISE * (1 - k * k * (3 - 2 * k));       // smoothstep: hands first, then the pull-up
    if (e.t === 4 || e.t === 20) { FX.splat(e.x + rr(-6, 6), e.y, 30, '#7cff4f', 4, rr(-1, 1)); Sound.sfx('mutSplash', e.x); }
    if (e.t > 6 && e.t % 5 === 0) FX.add({ kind: 'drop', x: e.x + rr(-5, 5), y: e.y, z: 30 + rr(4, 24) - e.mutRise * 0.5, vx: 0, vz: 0, life: 40, color: '#7cff4f', g: 0.25, ground: e.y });
    if (e.t === 38) Sound.sfx('mutGroan', e.x);
    if (e.t >= 52) {
      e.noShadow = false;
      e.setState('drop');
      e.vz = 1.4; e.vy = 0.9;
    }
    return true;
  }

  function ghoulOnDeath(src, a, dir) {
    if (this.dying || this.mutSW === 1) return;
    if (this.mutSWArmed) {
      // Second Wind: a fake death. No score; it lies 90f, then rises with 10 HP, red eyes and x1.3 speed.
      this.mutSWArmed = false;
      this.mutSW = 1;
      this.dropToken();
      this.atk = null;
      if (this.holding) { this.holding = false; const p = Game.player; if (p && p.heldBy === this) p.freeFromHold(this.facing); }
      if (this.grabbedBy) this.releaseGrab();
      Sound.sfx('ko', this.x);
      FX.splat(this.x, this.y, this.h * 0.5, '#7cff4f', 8, dir || 1);
      if (!['fall', 'thrown', 'down', 'held'].includes(this.state)) this.knockDown(dir || -this.facing, 3.5 * this.weight, 3.5);
      return;
    }
    Enemy.prototype.onDeath.call(this, src, a, dir);
  }

  function ghoulStateUpdate() {
    // toxic puddles heal 1 HP per 10f while standing in them
    if (!this.dying && this.mutSW !== 1 && this.z < 1 && this.hp > 0 && this.hp < this.maxHp &&
        !['fall', 'thrown', 'down', 'getup', 'mutVat', 'grabbed', 'held'].includes(this.state) && inToxic(this)) {
      if (++this.mutRegen % 10 === 0) {
        this.hp = Math.min(this.maxHp, this.hp + 1);
        FX.add({ kind: 'bubble', x: this.x + rr(-5, 5), y: this.y, z: rr(4, 20), vz: 0.5, g: 0, life: 24, color: '#7cff6a' });
      }
    }
    if (this.mutTwitch > 0) this.mutTwitch--;
    if (this.state === 'mutVat') return vatUpdate(this);
    if (this.holding && this.state !== 'mutClutch') {
      // knocked off the hero by something else: just let her go
      this.holding = false;
      const p = Game.player;
      if (p && p.heldBy === this) p.freeFromHold(this.facing);
    }
    if (this.state === 'mutClutch') return clutchUpdate(this);
    if (this.mutSW === 1) {
      if (this.state !== 'down') return false;            // still falling: let the reaction states run
      this.vx *= 0.85; this.vy = 0;
      if (Math.abs(this.vx) > 1 && this.t % 4 === 0) FX.dust(this.x, this.y, 1, 0.5);
      if (this.t > 56 && this.t % 9 === 0) { this.mutTwitch = 3; FX.add({ kind: 'bubble', x: this.x + rr(-6, 6), y: this.y, z: 4, vz: 0.5, g: 0, life: 20, color: '#7cff6a' }); }
      if (this.t === 66) Sound.sfx('mutGroan', this.x);
      if (this.t >= 90) {
        this.mutSW = 2;
        this.hp = 10;
        this.setState('getup');
        FX.add({ kind: 'star', x: this.x + this.facing * 4, y: this.y, z: 14, life: 10, size: 5, color: GH.eyeSW, g: 0 });
        for (let i = 0; i < 3; i++) greenSteam(this.x, this.y, 6);
      }
      return true;
    }
    if (this.dying && this.mutSteam > 0 && this.anim % 5 === 0) { this.mutSteam--; greenSteam(this.x, this.y, rr(2, 12)); }
    return false;
  }

  // ===================================================================================
  // BLOATER: blob rig, Belly Bump, Gas Belch, death fuse (grab and toss it), CHAIN POP
  // ===================================================================================
  const BL = {
    body: '#a8b85a', infl: '#e0e05a', vein: '#6e7a34', blister: '#e0e05a', blisterHi: '#fffbc0',
    limb: '#8f9e4a', head: '#a8b85a', eye: '#fff36a', mouth: '#2a1a10',
    red: '#ff3b30', white: '#ffffff',
  };
  const BL_VEINS = [
    [[-6, -8], [-2, -3], [-4, 3], [-1, 7]],
    [[3, -11], [6, -5], [10, -1]],
    [[-10, 1], [-5, 5], [0, 9]],
    [[6, -5], [4, 1]],
  ];
  const BL_BLISTERS = [[5, -6], [-7, -3], [2, 6], [9, 3]];

  // Pose parameters for the blob rig.
  function bloaterParams(e) {
    const P = { r: 14 + Math.sin(e.anim * 0.08) * 0.5, inflate: 0, roll: 0, sqx: 1, sqy: 1, ox: 0, oy: 0,
      legF: 0, legB: 0, legLift: 0, armF: 0.5, armB: 0.3, headTilt: 0, mouth: 0, grounded: true, legsUp: false };
    const t = e.t, an = e.anim, a = e.atk;
    switch (e.state) {
      case 'walk': case 'enter': case 'panic': case 'door': {
        const s = Math.sin(an * 0.22);
        P.ox = s * 1.2; P.roll = s * 0.07; P.oy = -Math.abs(Math.cos(an * 0.22));
        P.legF = s * 3; P.legB = -s * 3; P.armF = 0.5 - s * 0.35; P.armB = 0.3 + s * 0.35;
        break;
      }
      case 'hurt': case 'pinned':
        P.sqx = 1.12; P.sqy = 0.86; P.roll = -0.25; P.armF = -0.7; P.armB = -1.0; P.headTilt = -0.25; P.mouth = 0.6;
        break;
      case 'fall':
        P.roll = -0.6 - clamp(-e.vz * 0.15, -0.3, 0.6); P.grounded = false; P.armF = -1.3; P.armB = -1.7; P.mouth = 0.6;
        break;
      case 'thrown': case 'held':
        P.roll = e.state === 'thrown' ? -t * 0.32 : -0.3; P.grounded = false; P.armF = -1.2; P.armB = -1.5; P.legLift = 2; P.mouth = 0.8;
        break;
      case 'down':
        P.roll = -1.45; P.sqx = 1.08; P.sqy = 0.86; P.legsUp = true; P.legF = Math.sin(an * 0.5) * 2; P.legB = -Math.sin(an * 0.5) * 2;
        P.armF = 1.4; P.armB = -1.2;
        break;
      case 'getup':
        P.roll = lerp(-1.45, 0, easeOut(clamp(t / 12, 0, 1))); P.legsUp = t < 6; P.armF = 1.2; P.armB = 0.8;
        break;
      case 'grabbed':
        if (e.mutFusing) { P.ox = -5; P.oy = -4; }
        P.sqy = 0.94; P.sqx = 1.04; P.roll = 0.12; P.legLift = 2; P.legF = Math.sin(an * 0.6) * 2; P.legB = -P.legF;
        P.armF = -1.0 + Math.sin(an * 0.7) * 0.4; P.armB = -1.4; P.mouth = 0.7;
        break;
      case 'drop':
        P.grounded = false; P.armF = 2.4; P.armB = 2.2; P.legLift = 2;
        break;
      case 'dizzy':
        P.roll = Math.sin(t * 0.15) * 0.2; P.headTilt = Math.sin(t * 0.15 + 1) * 0.3;
        break;
      case 'attack':
        if (a && a.key === 'belch') {
          const ph = e.atkPhase();
          if (ph === 'start') {
            const k = clamp(t / Math.max(1, a.start), 0, 1);
            P.inflate = Math.abs(Math.sin(k * Math.PI * 3));
            P.roll = -0.12; P.headTilt = -0.3; P.armF = -0.8; P.armB = -1.0; P.legF = 1.5; P.legB = -1.5;
          } else if (ph === 'active') {
            const k = clamp((t - a.start) / Math.max(1, a.active), 0, 1);
            P.inflate = 1 - k; P.roll = 0.18; P.headTilt = 0.35; P.mouth = 1; P.ox = 1; P.armF = 0.2; P.armB = -0.4;
          } else { P.roll = 0.08; P.mouth = 0.4; P.headTilt = 0.1; P.sqy = 0.96; }
        } else if (a) {
          const ph = e.atkPhase();
          if (ph === 'start') { const k = easeOut(clamp(t / Math.max(1, a.start), 0, 1)); P.ox = -3 * k; P.roll = -0.2 * k; P.armF = -0.6; P.armB = -0.8; P.legF = 2; P.legB = -2; P.headTilt = -0.2; }
          else if (ph === 'active') { P.ox = 4; P.roll = 0.28; P.sqx = 1.12; P.sqy = 0.9; P.armF = -0.3; P.armB = -0.9; P.legF = -1; P.legB = -3; }
          else { P.ox = 2; P.roll = 0.1; P.legF = 0; P.legB = -2; }
        }
        break;
    }
    if (e.mutFusing) {
      const k = clamp((e.mutFuseT || 0) / 14, 0, 1);
      P.r = lerp(14, 20, easeOut(k)); P.inflate = 1;
      if (e.state === 'mutFuse') {
        const tr = (e.mutFuseT || 0) > 40 ? ((an >> 1) % 2 ? 1 : -1) : 0;
        P.ox = tr; P.armF = -1.6; P.armB = -1.4; P.headTilt = -0.35; P.mouth = 0.8; P.legF = 1.5; P.legB = -1.5; P.roll = 0;
      }
    }
    return P;
  }

  function drawBloater(e) {
    const P = bloaterParams(e);
    const fusing = !!e.mutFusing;
    const r = P.r + P.inflate * (fusing ? 0 : 4);
    const flashOn = e.mutFlashOn;
    let base = mix(BL.body, BL.infl, P.inflate * 0.75);
    if (fusing) base = flashOn ? BL.red : BL.white;
    const dark = shade(base, -0.28), hi = shade(base, 0.35);
    const rx = r * P.sqx, ry = r * P.sqy;
    const sc = r / 14;
    const R = P.roll;
    // body-space points (centre at 0,0) rotated by roll
    const legY = 0.72 * ry, legLen = 7;
    const legPts = (side, swing) => {
      const hip = rot(side * 4.5 * sc, legY, R);
      const foot = P.legsUp ? rot(side * 4.5 * sc + 6 + swing, legY + 4, R) : rot(side * 4.5 * sc + swing, legY + legLen - P.legLift, R);
      return [hip, foot];
    };
    const lf = legPts(1, P.legF), lb = legPts(-1, P.legB);
    // ground: lowest point of body or feet sits on y = 0
    let cy = -(ry + 7);
    if (P.grounded) {
      let low = ry;
      for (const pt of [lf[1], lb[1]]) low = Math.max(low, pt[1] + 1.2);
      cy = -Math.round(low);
    }
    const cx = Math.round(P.ox), cyy = Math.round(cy + P.oy);
    const at = (pt) => [cx + pt[0], cyy + pt[1]];
    const head = at(rot(r * 0.28, -ry - 3.5, R + P.headTilt * 0.3));
    const limbC = fusing ? dark : BL.limb, limbDk = shade(BL.limb, -0.3);

    // far leg, far arm (behind)
    const drawLeg = (pts, c) => {
      const h = at(pts[0]), f = at(pts[1]);
      Px.limb(h[0], h[1], f[0], f[1], 4, 3.5, c);
      Px.oval(f[0] + 1.5, f[1], 2.5, 1.4, c);
    };
    drawLeg(lb, limbDk);
    const armB0 = at(rot(-r * 0.55, -ry * 0.15, R));
    const armB1 = [armB0[0] + Math.sin(P.armB + R) * 8, armB0[1] + Math.cos(P.armB + R) * 8];
    Px.limb(armB0[0], armB0[1], armB1[0], armB1[1], 3, 2.5, limbDk);
    Px.disc(armB1[0], armB1[1], 1.6, limbDk);
    drawLeg(lf, limbC);
    // body: dark rim, base, highlight
    Px.oval(cx, cyy, rx, ry, dark);
    Px.oval(cx - 0.6, cyy - 1.1, rx - 1.3, ry - 1.5, base);
    Px.oval(cx + rx * 0.18, cyy - ry * 0.5, rx * 0.42, ry * 0.22, hi);
    Px.dot(cx + rx * 0.3, cyy - ry * 0.55, '#ffffff');
    // veins
    const vein = fusing ? (flashOn ? '#8a1a14' : '#b8b8a8') : (P.inflate > 0.5 ? '#9a3a2a' : BL.vein);
    for (const v of BL_VEINS) {
      for (let i = 0; i + 1 < v.length; i++) {
        const p0 = rot(v[i][0] * sc * P.sqx, v[i][1] * sc * P.sqy, R * 0.6), p1 = rot(v[i + 1][0] * sc * P.sqx, v[i + 1][1] * sc * P.sqy, R * 0.6);
        Px.line(cx + p0[0], cyy + p0[1], cx + p1[0], cyy + p1[1], 1, vein);
      }
    }
    // blisters
    const bl = fusing ? 2.6 : 2 + P.inflate * 0.5;
    BL_BLISTERS.forEach(([bx, by], i) => {
      const q = rot(bx * sc * P.sqx, by * sc * P.sqy, R * 0.6);
      const pulse = Math.sin(e.anim * 0.1 + i * 1.7) * 0.3;
      Px.disc(cx + q[0], cyy + q[1], bl + pulse, fusing ? (flashOn ? '#ffd0c0' : BL.blister) : BL.blister);
      Px.dot(cx + q[0] - 0.6, cyy + q[1] - 0.8, BL.blisterHi);
    });
    // navel
    const nv = rot(r * 0.62 * P.sqx, r * 0.22 * P.sqy, R * 0.6);
    Px.rect(cx + nv[0], cyy + nv[1], 1, 2, dark);
    // tiny head
    Px.disc(head[0], head[1], 5, shade(BL.head, -0.25));
    Px.disc(head[0] + 0.4, head[1] - 0.5, 4.3, BL.head);
    Px.dot(head[0] + 1, head[1] - 3, shade(BL.head, 0.35));
    const fr = R + P.headTilt;
    const eye1 = rot(2.2, -1.2, fr), eye2 = rot(3.8, -1, fr), mo = rot(3.3, 2, fr);
    const ec = '#fff36a';
    Px.dot(head[0] + eye1[0], head[1] + eye1[1], ec);
    Px.dot(head[0] + eye2[0], head[1] + eye2[1], ec);
    if (P.mouth > 0.5) Px.oval(head[0] + mo[0], head[1] + mo[1], 1.5 * P.mouth + 0.5, 1.2 * P.mouth + 0.4, BL.mouth);
    else Px.line(head[0] + mo[0] - 1.5, head[1] + mo[1], head[0] + mo[0] + 1.2, head[1] + mo[1] - 0.5, 1, BL.mouth);
    // near arm (stubby, 3x8)
    const armF0 = at(rot(r * 0.6, -ry * 0.05, R));
    const armF1 = [armF0[0] + Math.sin(P.armF + R) * 8, armF0[1] + Math.cos(P.armF + R) * 8];
    Px.limb(armF0[0], armF0[1], armF1[0], armF1[1], 3.2, 2.6, limbC);
    Px.disc(armF1[0], armF1[1], 1.7, limbC);

    e.mutEyes = [[Math.round(head[0] + eye1[0]), Math.round(head[1] + eye1[1]), ec], [Math.round(head[0] + eye2[0]), Math.round(head[1] + eye2[1]), ec]];
    if (e.state === 'attack' && e.atk) e.atk.glint = e.atk.key === 'belch' ? [Math.round(head[0] + 4), Math.round(head[1] + 2)] : [Math.round(cx + rx), Math.round(cyy)];
  }

  // Gas cloud from the Belch: 6 puffs drift forward at 0.6 px/f out to +56 px and linger;
  // 4 dmg per 15f to the hero only.
  class MutGas extends Ent {
    constructor(owner) {
      const f = owner.facing;
      super(owner.x + f * 8, owner.y);
      this.team = 'hazard';
      this.shadowR = 0;
      this.facing = f;
      this.life = 132;
      this.lastHit = -99;
      this.puffs = [];
      for (let i = 0; i < 6; i++) {
        this.puffs.push({ d: 2, v: 2.4 - i * 0.22, max: 12 + i * 8.8, dy: (i % 2 ? 1 : -1) * Math.min(6, i * 1.4) + rr(-1, 1),
          z: 28 - i * 2.4 + rr(-2, 2), r: 6 + i * 0.8, born: i * 2, ph: rr(0, TAU) });
      }
    }
    update() {
      this.t++;
      for (const p of this.puffs) {
        if (this.t < p.born) continue;
        p.d = Math.min(p.max, p.d + p.v);
        p.v = Math.max(0.6, p.v * 0.9);
        p.z = Math.max(p.r * 0.6, p.z - 0.04);
      }
      if (this.t % 10 === 0 && this.t < this.life - 20) {
        const p = pick(this.puffs);
        if (this.t >= p.born) FX.add({ kind: 'bubble', x: this.x + this.facing * p.d + rr(-4, 4), y: this.y + p.dy, z: p.z, vz: 0.3, g: 0, life: 22, color: '#d8f08a' });
      }
      const P = Game.player;
      if (P && P.vulnerable && this.t - this.lastHit >= 15 && this.t < this.life - 12 && this.touches(P)) {
        this.lastHit = this.t;
        if (P.holdDamage) P.holdDamage(4);
        else { P.hp = Math.max(0, P.hp - 4); P.flash = 2; }
        for (let i = 0; i < 3; i++) FX.add({ kind: 'bubble', x: P.x + rr(-4, 4), y: P.y, z: P.z + 34 + rr(0, 6), vz: 0.5, g: 0, life: 20, color: '#b8e05a' });
      }
      if (this.t >= this.life) this.remove = true;
    }
    touches(P) {
      for (const p of this.puffs) {
        if (this.t < p.born) continue;
        const px = this.x + this.facing * p.d, py = this.y + p.dy;
        if (Math.abs(P.x - px) < p.r + P.w * 0.6 && Math.abs(P.y - py) < Math.max(5, p.r * 0.7) && P.z < p.z + p.r && P.z + P.h > p.z - p.r) return true;
      }
      return false;
    }
    sortY() { return this.y + 3; }
    draw(ctx, camX) {
      Px.use(ctx);
      const fade = clamp((this.life - this.t) / 26, 0, 1) * clamp(this.t / 4, 0, 1);
      for (const p of this.puffs) {
        if (this.t < p.born) continue;
        const sx = this.x - camX + this.facing * p.d, gy = this.y + p.dy, sy = gy - p.z;
        const r = p.r + Math.sin(this.t * 0.12 + p.ph) * 1;
        ctx.globalAlpha = 0.12 * fade; Px.oval(sx, gy, r, r * 0.3, '#5a7a20');
        ctx.globalAlpha = 0.45 * fade; Px.disc(sx, sy, r, '#b8e05a');
        ctx.globalAlpha = 0.3 * fade; Px.disc(sx + r * 0.2, sy + r * 0.35, r * 0.6, '#7a9a30');
        ctx.globalAlpha = 0.35 * fade; Px.disc(sx - r * 0.25, sy - r * 0.3, r * 0.5, '#e4f7a8');
      }
      ctx.globalAlpha = 1;
    }
  }

  const BLOATER_PLANS = {
    bump: { min: 0, max: 22, dy: 5, at: 14 },
    belch: { min: 28, max: 60, dy: 6, at: 42 },
  };
  function bloaterChoose(adx) { return chance(adx > 34 ? 0.65 : 0.25) ? 'belch' : 'bump'; }

  function bloaterAttackTick(a, ph) {
    if (ph === 'start' && this.t === Math.max(1, a.start - 6) && a.key === 'bump') Sound.sfx('groan', this.x);
    if (a.key !== 'belch') return;
    if (ph === 'start') { this.vx = this.vy = 0; return; }
    if (ph === 'active' && this.t === a.start) {
      Game.add(new MutGas(this));
      Sound.sfx('mutBelch', this.x);
    }
  }

  function bloaterOnDeath(src, a, dir) {
    if (this.dying || this.mutFusing) return;
    // at 0 HP it does not fall: it swells and fuses for 70f
    this.mutFusing = true;
    this.mutFuseT = 0; this.mutFlashT = 0; this.mutFlashOn = true;
    this.tossOnly = true; this.noSuplex = true;
    this.dropToken();
    this.atk = null;
    Game.addScore(this.score);
    FX.text(this.x, this.y, this.h + 8, String(this.score), '#ffe066', 50);
    Sound.sfx('mutInflate', this.x);
    FX.splat(this.x, this.y, 20, '#7cff4f', 6, dir || 1);
    if (this.state !== 'fall' && this.state !== 'thrown') { this.setState('mutFuse'); this.vx = this.vy = 0; }
  }
  function bloaterKnockDown(dir, kx, kz) {
    if (this.mutFusing) return;
    Fighter.prototype.knockDown.call(this, dir, kx, kz);
  }
  function bloaterTakeHit(src, a, dir, nth) {
    if (this.mutFusing || this.dying) return;
    Enemy.prototype.takeHit.call(this, src, a, dir, nth);
  }
  function bloaterCanBeGrabbed() { return !!this.mutFusing && !this.dying && this.state === 'mutFuse' && this.z < 2; }
  function bloaterOnTossed() { this.mutTossed = true; this.tossDmg = 0; }

  // A tossed, fusing Bloater pops on its first contact with an enemy, a prop or a wall.
  function tossContact(e) {
    if (e.splatted || (e.bowled && e.bowled.size)) return true;
    for (const o of Game.ents) {
      if (o === e || o.remove) continue;
      if (o.team === 'enemy' && !o.dying && o.state !== 'down') {
        if (Math.abs(o.y - e.y) <= 9 && Math.abs(o.x - e.x) <= o.w + e.w * 0.6 && e.z <= o.z + o.h) return true;
      } else if (o.team === 'prop') {
        if (Math.abs(o.y - e.y) <= 8 && Math.abs(o.x - e.x) <= o.w + e.w * 0.5 && e.z <= o.h) return true;
      }
    }
    return false;
  }

  function bloaterBlast(e) {
    if (e.dying) return;
    e.dying = true;
    e.mutFusing = false;
    if (e.grabbedBy) e.releaseGrab();
    const k = Game.explode(e.x, e.y, Game.player, { r: 44, depth: 16, dmg: 18, pdmg: 18, palette: ['#c8ff5a', '#7cff4f', '#2a3a20'] });
    if (k > 0) {
      Game.addScore(200 * k);
      FX.text(e.x, e.y, 64, '+' + 200 * k, '#c8ff5a', 60);
    }
    if (k >= 2) {
      FX.showBanner('CHAIN POP!', '#c8ff5a');
      Game.addScore(1000);
      Sound.sfx('chime');
    }
    FX.splat(e.x, e.y, 18, '#7cff4f', 10, 1);
    FX.splat(e.x, e.y, 18, '#7cff4f', 10, -1);
    FX.pool(e.x, e.y + 1, '#4fb82e', 34);
    for (let i = 0; i < 4; i++) greenSteam(e.x, e.y, rr(4, 20));
    // other fusing Bloaters in the blast go off a moment later
    for (const o of Game.foes()) {
      if (o !== e && o.mutFusing && !o.dying && Math.abs(o.x - e.x) < 44 + o.w && Math.abs(o.y - e.y) < 16) o.mutFuseT = Math.max(o.mutFuseT, 62);
    }
    e.remove = true;
    if (e.onRemoved) e.onRemoved();
  }

  function bloaterStateUpdate() {
    if (!this.mutFusing || this.dying) return false;
    this.mutFuseT++;
    const iv = Math.max(2, Math.round(lerp(6, 2, this.mutFuseT / 70)));
    if (++this.mutFlashT >= iv) {
      this.mutFlashT = 0;
      this.mutFlashOn = !this.mutFlashOn;
      if (this.mutFlashOn) Sound.sfx('mutFuse', this.x);
    }
    if (this.mutFuseT % 7 === 0) FX.add({ kind: 'bubble', x: this.x + rr(-12, 12), y: this.y, z: rr(10, 34), vz: 0.4, g: 0, life: 18, color: '#e0e05a' });
    const st = this.state;
    if (this.mutTossed && (st === 'down' || (st === 'thrown' && (tossContact(this) || (this.z <= 0.5 && this.t > 1))) || (st !== 'thrown' && st !== 'held'))) {
      bloaterBlast(this);
      return true;
    }
    if (this.mutFuseT >= 70) { bloaterBlast(this); return true; }
    if (st === 'grabbed' || st === 'thrown' || st === 'fall') return false;
    if (st !== 'mutFuse') this.setState('mutFuse');
    this.vx *= 0.7; this.vy = 0;
    return true;
  }

  function bloaterDrawMarker(ctx, camX) {
    Enemy.prototype.drawMarker.call(this, ctx, camX);
    if (!this.mutFusing || this.dying) return;
    // red dashed ring: the blast area (r44, depth 16)
    Px.use(ctx);
    ctx.globalAlpha = 0.75;
    const n = 104, cx = this.x - camX, cy = this.y, march = Game.frame >> 2;
    for (let i = 0; i < n; i++) {
      if (((i + march) >> 1) & 1) continue;
      const a = (i / n) * TAU;
      Px.rect(cx + Math.cos(a) * 44 - 1, cy + Math.sin(a) * 16, 2, 1, RIM_RED);
    }
    ctx.globalAlpha = 1;
  }

  // ===================================================================================
  // KILN TROOPER (Iron Guard): front armour, Flame Jet, Nozzle Bash, tank explodes on death
  // ===================================================================================
  const KL = {
    dome: '#6f7780', domeDk: '#4e555d', domeHi: '#9aa2ab', slit: '#ff8a2a', slitHi: '#ffe0a0',
    plate: '#5a626c', plateDk: '#434a52', plateHi: '#7a838e', rivet: '#8a929c',
    sash: '#a82c24', sashDk: '#741d18',
    tank: '#b33a2b', tankDk: '#7e2a20', tankHi: '#d8604c', gauge: '#ffe08a',
    wand: '#3a3f46', wandHi: '#5e656e', pilot: '#ffd34a',
    pants: '#4a4e54', shin: '#41454b', boots: '#1e1e22', glove: '#2a2a2e', sleeve: '#3e434a', hose: '#24262a',
  };
  const FLAME = ['#ffd34a', '#ff8a2a', '#ff4a1a'];

  function kilnAttackPose(e) {
    const a = e.atk, ph = e.atkPhase(), t = e.t;
    if (a.key === 'flame') {
      const brace = { fThigh: 0.6, fKnee: -0.45, bThigh: -0.55, bKnee: -0.15 };
      if (ph === 'start') {
        const k = easeOut(clamp(t / Math.max(1, a.start), 0, 1));
        return pose(Object.assign({ hy: -19, rot: lerp(0.04, -0.06, k), head: -0.08, fUpper: lerp(0.65, 0.35, k), fElbow: lerp(0.95, 1.2, k),
          bUpper: lerp(0.5, 0.75, k), bElbow: lerp(1.55, 1.1, k) }, brace));
      }
      if (ph === 'active') {
        const j = (t >> 1) % 2 ? 0.5 : -0.5;
        return pose(Object.assign({ hx: -1 + j, hy: -19, rot: -0.1, head: -0.15, fUpper: 0.3, fElbow: 1.2, bUpper: 0.75, bElbow: 1.05 }, brace));
      }
      return pose({ hy: -20, rot: 0.14, head: -0.2, fThigh: 0.4, fKnee: -0.3, bThigh: -0.4, bKnee: -0.2, fUpper: 0.35, fElbow: 0.7, bUpper: 0.3, bElbow: 1.2 });
    }
    if (ph === 'start') return pose({ hx: -1, rot: -0.15, head: 0.05, fThigh: 0.25, fKnee: -0.3, bThigh: -0.45, bKnee: -0.25, fUpper: -0.4, fElbow: 2.0, bUpper: -0.1, bElbow: 1.8 });
    if (ph === 'active') return pose({ hx: 3, hy: -19, rot: 0.35, head: -0.15, fThigh: 0.75, fKnee: -0.45, bThigh: -0.5, bKnee: -0.05, fUpper: 1.5, fElbow: 0.05, bUpper: 1.25, bElbow: 0.45 });
    return pose({ hx: 1, rot: 0.2, fThigh: 0.5, fKnee: -0.35, bThigh: -0.4, bKnee: -0.15, fUpper: 1.1, fElbow: 0.4, bUpper: 0.9, bElbow: 0.8 });
  }
  function kilnPose(e) {
    const an = e.anim;
    switch (e.state) {
      case 'idle': case 'taunt': {
        const b = Math.sin(an * 0.06);
        return [pose({ hy: -20 + b * 0.4, rot: 0.04, head: -0.05, fThigh: 0.28, fKnee: -0.22, bThigh: -0.28, bKnee: -0.18,
          fUpper: 0.65, fElbow: 0.95 + b * 0.04, bUpper: 0.5, bElbow: 1.55 }), true];
      }
      case 'walk': case 'enter': case 'panic': case 'door': {
        const w = Poses.walk(an, 0.85);
        return [Object.assign(w, { rot: 0.06, head: -0.05, fUpper: 0.65 + Math.sin(an * 0.17) * 0.05, fElbow: 0.95, bUpper: 0.5, bElbow: 1.55 }), true];
      }
      case 'attack': return [kilnAttackPose(e), true];
    }
    return [enemyHumanPose(e, null), ['hurt', 'dizzy', 'grabbed', 'pinned'].includes(e.state)];
  }

  function kilnTank(e, R, shake) {
    const ux0 = R.S.x - R.H.x, uy0 = R.S.y - R.H.y, L = Math.hypot(ux0, uy0) || 1;
    const ux = ux0 / L, uy = uy0 / L, nx = -uy, ny = ux;
    const cx = lerp(R.H.x, R.S.x, 0.6) - nx * 8.5 + shake, cy = lerp(R.H.y, R.S.y, 0.6) - ny * 8.5;
    const x0 = cx - ux * 4, y0 = cy - uy * 4, x1 = cx + ux * 4, y1 = cy + uy * 4;
    e.mutTankPt = { x: x0 - ux * 3, y: y0 - uy * 3 };
    if (e.mutTankDone) {
      // ruptured: blackened shell with torn edges
      Px.quad(x0, y0, x1, y1, 8, 7, '#2a1a16');
      Px.disc(x0, y0, 4, '#2a1a16');
      Px.poly([x1 - nx * 4, y1 - ny * 4, x1 + ux * 5 - nx * 2, y1 + uy * 5 - ny * 2, x1 + ux * 2, y1 + uy * 2, x1 + ux * 6 + nx * 3, y1 + uy * 6 + ny * 3, x1 + nx * 4, y1 + ny * 4], '#3a2420');
      Px.dot(cx, cy, KL.tankDk);
      return;
    }
    Px.quad(x0, y0, x1, y1, 8, 8, KL.tank);
    Px.disc(x0, y0, 4, KL.tank); Px.disc(x1, y1, 4, KL.tank);
    Px.line(x0 - nx * 3, y0 - ny * 3, x1 - nx * 3, y1 - ny * 3, 2, KL.tankDk);
    Px.line(x0 + nx * 1.5, y0 + ny * 1.5, x1 + nx * 1.5, y1 + ny * 1.5, 1, KL.tankHi);
    Px.line(cx - ux * 2 - nx * 4, cy - uy * 2 - ny * 4, cx - ux * 2 + nx * 4, cy - uy * 2 + ny * 4, 1, KL.tankDk);
    // cap + valve
    Px.disc(x1 + ux * 3.5, y1 + uy * 3.5, 2.2, KL.domeDk);
    Px.dot(x1 + ux * 5.5, y1 + uy * 5.5, KL.rivet);
    // pressure gauge
    const gx = cx + ux * 1.5 + nx * 0.5, gy = cy + uy * 1.5 + ny * 0.5;
    Px.disc(gx, gy, 2, '#1e1e22');
    Px.disc(gx, gy, 1.3, KL.gauge);
    const needle = e.mutShake ? (e.t % 4 < 2 ? 1 : 0) : 0;
    Px.dot(gx + needle, gy - 1 + needle, '#1a1010');
  }

  function kilnStyle(e, shake) {
    const flick = ((Game.frame + e.id * 7) % 6) < 3;
    const telling = !!e.mutShake;
    return {
      s: 1, skin: KL.glove, top: KL.plate, sleeve: KL.sleeve, arm: KL.sleeve, pants: KL.pants, shin: KL.shin, boots: KL.boots,
      belt: KL.sash, glove: KL.glove, hipW: 10, shW: 13, limbW: 5.5,
      backHand(Hn, ang, s, R) {
        Px.disc(Hn.x, Hn.y, 2.2, shade(KL.glove, -0.3));
        kilnTank(e, R, shake);
      },
      torso(R) {
        const ux0 = R.S.x - R.H.x, uy0 = R.S.y - R.H.y, L = Math.hypot(ux0, uy0) || 1;
        const ux = ux0 / L, uy = uy0 / L, nx = -uy, ny = ux;
        // plate edges, collar, rivets
        Px.line(R.H.x + nx * 4, R.H.y + ny * 4, R.S.x + nx * 5.6 - ux, R.S.y + ny * 5.6 - uy, 1, KL.plateHi);
        Px.line(R.H.x - nx * 4.5, R.H.y - ny * 4.5, R.S.x - nx * 6, R.S.y - ny * 6, 1, KL.plateDk);
        Px.quad(R.S.x - ux * 1.5, R.S.y - uy * 1.5, R.S.x + ux * 0.5, R.S.y + uy * 0.5, 12, 12, KL.plateDk);
        for (const k of [0.3, 0.72]) for (const sd of [-1, 1]) Px.dot(lerp(R.H.x, R.S.x, k) + nx * sd * 3.5, lerp(R.H.y, R.S.y, k) + ny * sd * 3.5, KL.rivet);
        // sash: near shoulder to far hip
        Px.line(R.S.x + nx * 4 - ux * 2, R.S.y + ny * 4 - uy * 2, R.H.x - nx * 4 + ux * 2, R.H.y - ny * 4 + uy * 2, 2, KL.sash);
        Px.line(R.S.x + nx * 4 - ux * 3, R.S.y + ny * 4 - uy * 3, R.H.x - nx * 4 + ux * 1, R.H.y - ny * 4 + uy * 1, 1, KL.sashDk);
        // fuel hose from the tank, round the hip, to the wand hand
        if (e.mutTankPt && !e.mutTankDone) {
          const mx = R.H.x + 2, my = R.H.y + 4, Hn = R.fa.H;
          Px.line(e.mutTankPt.x, e.mutTankPt.y, mx, my, 2, KL.hose);
          Px.line(mx, my, Hn.x - 1, Hn.y + 1, 2, KL.hose);
        }
      },
      head(Hd) {
        Px.rect(Hd.x - 3, Hd.y + 2, 6, 4, KL.glove);
        // pressure-cooker dome
        Px.disc(Hd.x, Hd.y - 0.5, 6.2, KL.domeDk);
        Px.disc(Hd.x + 0.5, Hd.y - 1.2, 5.4, KL.dome);
        Px.oval(Hd.x + 1.2, Hd.y - 4.2, 2.6, 1.2, KL.domeHi);
        Px.rect(Hd.x - 7, Hd.y + 2, 14, 2, KL.domeDk);
        Px.rect(Hd.x - 7, Hd.y + 2, 14, 1, KL.dome);
        Px.dot(Hd.x - 6, Hd.y + 2, KL.rivet); Px.dot(Hd.x + 6, Hd.y + 2, KL.rivet);
        Px.rect(Hd.x - 1.5, Hd.y - 8.5, 3, 2, KL.domeDk);
        Px.dot(Hd.x - 0.5, Hd.y - 9.5, KL.rivet);
        // glowing eye slit
        Px.rect(Hd.x + 0.5, Hd.y - 1.5, 6, 3, '#1a1414');
        Px.rect(Hd.x + 1, Hd.y - 0.5, 5, 1, KL.slit);
        Px.dot(Hd.x + (flick ? 4 : 3), Hd.y - 0.5, KL.slitHi);
        e.mutHead = { x: Hd.x, y: Hd.y };
      },
      hand(Hn, ang) {
        const ux = dirX(ang), uy = dirY(ang), vx = -uy, vy = ux;
        Px.line(Hn.x - ux * 2, Hn.y - uy * 2, Hn.x + ux * 12, Hn.y + uy * 12, 3, KL.wand);
        Px.line(Hn.x - ux - vx, Hn.y - uy - vy, Hn.x + ux * 11 - vx, Hn.y + uy * 11 - vy, 1, KL.wandHi);
        const tx = Hn.x + ux * 13, ty = Hn.y + uy * 13;
        Px.disc(tx, ty, 2.2, KL.wandHi);
        Px.dot(tx + ux, ty + uy, '#141010');
        const pr = telling ? (flick ? 2.2 : 1.1) : (flick ? 1.4 : 1);
        const px = tx + vx * 2.6 - ux, py = ty + vy * 2.6 - uy;
        Px.disc(px, py, pr, KL.pilot);
        Px.dot(px, py, '#fff6c8');
        Px.disc(Hn.x, Hn.y, 2.4, KL.glove);
        e.mutTip = { x: tx + ux * 2, y: ty + uy * 2 };
        e.mutPilot = { x: px, y: py };
      },
      after(R) {
        Px.disc(R.S.x + 0.5, R.S.y + 1.5, 4, KL.plate);
        Px.disc(R.S.x + 0.5, R.S.y + 0.8, 2.6, KL.plateHi);
        Px.dot(R.S.x + 1, R.S.y + 3, KL.rivet);
      },
    };
  }

  function drawKiln(e) {
    const g = Sprite.cur.ga;
    const [p, grounded] = kilnPose(e);
    let T = 0;
    if (grounded) { const R0 = solveRig(p, 1, DIMS_HUMAN); T = -Math.round(Math.max(R0.fl.F.y, R0.bl.F.y)); }
    e.mutShake = e.state === 'attack' && e.atk && e.atk.key === 'flame' && e.atkPhase() === 'start';
    const deathShake = e.dying && e.mutTank != null && !e.mutTankDone;
    const shake = e.mutShake || deathShake ? ((e.t >> 1) % 2 ? 1 : -1) : 0;
    g.save();
    g.translate(0, T);
    drawHumanoid(p, kilnStyle(e, shake));
    g.restore();
    if (e.mutTip) e.mutTip = { x: Math.round(e.mutTip.x), y: Math.round(e.mutTip.y + T) };
    const Hd = e.mutHead || { x: 3, y: -42 };
    e.mutEyes = [1, 2, 3, 4, 5].map(i => [Math.round(Hd.x + i), Math.round(Hd.y - 0.5 + T), KL.slit]);
    if (e.state === 'attack' && e.atk && e.mutPilot) e.atk.glint = [Math.round(e.mutPilot.x), Math.round(e.mutPilot.y + T)];
  }

  // Visible flame circles [first, last) for the current active frame: the jet grows out, then detaches.
  function kilnStream(e) {
    const at = e.t - e.atk.start, A = e.atk.active;
    const n1 = Math.min(7, Math.floor(at / 1.2) + 1);
    const n0 = at > A - 7 ? Math.min(7, at - (A - 7)) : 0;
    return [n0, n1];
  }
  function drawFlame(e, ctx, camX) {
    const [n0, n1] = kilnStream(e);
    if (n1 <= n0) return;
    const tip = e.mutTip || { x: 15, y: -24 };
    const ox = e.x - camX + e.jitter, oy = e.y - e.z;
    Px.use(ctx);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.28 + ((e.t >> 1) % 2) * 0.08;
    Px.oval(ox + e.facing * (6 + n1 * 5), e.y, 8 + n1 * 4.5, 4, '#ff8a2a');
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (let i = n1 - 1; i >= n0; i--) {
      const d = 10 + i * 10;
      const r = 4 + i * (5 / 6) + (((e.t + i) % 3) === 0 ? 1 : 0);
      const cx = ox + e.facing * d, cy = oy + tip.y + i * 0.6 + Math.sin(e.t * 0.8 + i * 1.3) * 1.2;
      const ci = (Math.floor(e.t / 3) + i) % 3;
      Px.disc(cx, cy, r, FLAME[(ci + 2) % 3]);
      Px.disc(cx - e.facing * r * 0.15, cy - r * 0.1, r * 0.7, FLAME[(ci + 1) % 3]);
      if (i < 5) Px.disc(cx - e.facing * r * 0.25, cy - r * 0.15, r * 0.35, i < 2 ? '#fff3b0' : FLAME[ci]);
    }
    if (n0 === 0) Px.disc(ox + e.facing * tip.x, oy + tip.y, 2.5, '#fff6c8');
  }

  // The jet is its own draw-only entity so it sorts just in front of the trooper's depth and
  // engulfs a hero standing on the same line instead of hiding behind her.
  class MutFlameFx extends Ent {
    constructor(owner) {
      super(owner.x, owner.y);
      this.owner = owner; this.atk = owner.atk;
      this.team = 'fx'; this.shadowR = 0;
    }
    live() { const o = this.owner; return !o.remove && o.state === 'attack' && o.atk === this.atk && o.atkPhase() === 'active'; }
    update() { if (!this.live()) this.remove = true; else { this.x = this.owner.x; this.y = this.owner.y; } }
    sortY() { return this.owner.y + 0.75; }
    draw(ctx, camX) { if (this.live()) drawFlame(this.owner, ctx, camX); }
  }

  function kilnFlameTick(e, a) {
    const p = Game.player;
    if (!p || !p.vulnerable) return;
    const [n0, n1] = kilnStream(e);
    if (n1 <= n0) return;
    const near = 10 + n0 * 10 - 4, far = 10 + (n1 - 1) * 10 + 9;
    const rel = (p.x - e.x) * e.facing;
    if (rel + p.w < near || rel - p.w > far) return;
    if (Math.abs(p.y - e.y) > (a.depth || 8)) return;
    if (p.z > e.z + 30 || p.z + p.h < e.z + 12) return;
    e.mutFlameHits = (e.mutFlameHits || 0) + 1;
    const kd = e.mutFlameHits >= 3;              // the 3rd tick knocks down
    p.takeHit(e, { dmg: a.dmg, tier: kd ? 2 : 1, kb: 0.5, stun: 12, zr: [12, 30], sfx: 'fire', burn: 30, knock: kd, kx: 2.4, kz: 3.0 }, e.facing, 1);
  }

  function kilnAttackTick(a, ph) {
    if (ph === 'start' && this.t === Math.max(1, a.start - 6)) Sound.sfx('mutHiss', this.x);
    if (a.key !== 'flame') return;
    if (ph === 'start') {
      this.vx = this.vy = 0;
      if (this.t % 7 === 0) Sound.sfx('mutTick', this.x);        // ~8 Hz
      return;
    }
    if (ph === 'active') {
      const at = this.t - a.start;
      this.vx = 0;
      if (at === 0) { this.mutFlameHits = 0; Sound.sfx('mutFlame', this.x); Game.add(new MutFlameFx(this)); }
      if (at > 0 && at % 12 === 0) Sound.sfx('mutFlame', this.x);
      if (at % 10 === 0) kilnFlameTick(this, a);
      if (at % 2 === 0) {
        const [n0, n1] = kilnStream(this);
        const tip = this.mutTip || { x: 15, y: -24 };
        if (n1 > n0) {
          FX.fire(this.x + this.facing * (10 + (n1 - 1) * 10), this.y, this.z - tip.y - 2, 1);
          if (at % 6 === 0) FX.embers(this.x + this.facing * rr(20, 60), this.y, this.z - tip.y, 1);
        }
      }
      return;
    }
    // recovery: the tank vents steam
    if (this.t === a.start + a.active) Sound.sfx('steam', this.x);
    if (this.t % 3 === 0) FX.steam(this.x - this.facing * 9, this.y, this.z + 26, 1);
  }

  // Front armour: T1 hits from the front deal 1 dmg and no hitstun (clank, orange sparks).
  // T2+ hits, throws, hits from behind and hits on an exposed body (grabbed, airborne, down) deal full damage.
  function kilnTakeHit(src, a, dir, nth) {
    const tier = a.tier || 1;
    const front = dir === -this.facing;
    const exposed = this.airborne || this.dying || ['grabbed', 'held', 'pinned', 'fall', 'thrown', 'down', 'getup'].includes(this.state);
    if (tier <= 1 && front && !exposed && !a.bowling && !a.thrownBody) {
      const keep = this.armorTier;
      this.armorTier = 2;
      Enemy.prototype.takeHit.call(this, src, Object.assign({}, a, { dmg: 1 }), dir, nth);
      this.armorTier = keep;
      Sound.sfx('clank', this.x);
      return;
    }
    Enemy.prototype.takeHit.call(this, src, a, dir, nth);
  }
  function kilnHitFx(x, z, tier, dir) {
    FX.hit(x, this.y, z, tier, dir, '#ffe066');
    orangeSparks(x, this.y, z, 4);
  }

  function kilnStateUpdate() {
    if (this.dying && this.mutTank != null && !this.mutTankDone) {
      this.mutTank++;
      const tx = this.x - this.facing * 4, tz = this.state === 'down' ? 4 : this.z + 24;
      if (this.mutTank % 2 === 0) FX.steam(tx, this.y, tz, 1);
      if (this.mutTank % 10 === 1) Sound.sfx('mutTankHiss', this.x);
      if (this.mutTank >= 30) {
        this.mutTankDone = true;
        Game.explode(tx, this.y, Game.player, { r: 28, depth: 14, dmg: 12, pdmg: 12 });
        FX.shards(tx, this.y, 8, 6, [KL.tank, KL.tankDk, KL.dome]);
      }
    }
    if (!this.dying && this.anim % 160 === 0 && (this.state === 'idle' || this.state === 'walk')) FX.steam(this.x, this.y, this.z + 50, 1);
    return false;
  }

  const KILN_PLANS = {
    flame: { min: 20, max: 66, dy: 5, at: 48 },
    bash: { min: 2, max: 20, dy: 4, at: 14 },
  };
  function kilnChoose(adx) { return chance(adx < 26 ? 0.35 : 0.85) ? 'flame' : 'bash'; }

  // ===================================================================================
  // Registration
  // ===================================================================================
  const squelch = function () { Sound.sfx('mutSquelch', this.x); };

  ENEMY_TYPES.ghoul = {
    name: 'GHOUL', family: 'mutant', hp: 28, speed: 0.6, w: 7, h: 36, weight: 1, score: 500, shadowR: 9, retreatT: 30,
    attacks: {
      claw: { start: 14, active: 4, rec: 16, dmg: 8, tier: 2, kb: 1.6, stun: 20, reach: [4, 28], zr: [8, 38], depth: 8,
        tell: 'glint', whiff: 'whoosh', selfVx: 0.8 },
      lunge: { start: 16, active: 16, rec: 30, dmg: 0, tier: 1, reach: [0, 16], zr: [0, 40], depth: 8,
        tell: 'grab', danger: 'line', dangerLen: 48, custom: true, keepVx: true, mutRim: true },
    },
    init(opts) {
      const names = ['GHOUL', 'RUNT', 'GRUB'];
      this.name = opts.variant ? names[opts.variant % 3] : pick(names);
      this.mutDsp = 0.6;
      this.mutRegen = 0;
      this.mutLurch = ri(0, 39);
      this.mutSWArmed = opts.secondWind != null ? !!opts.secondWind : chance(0.3);
      this.mutSW = 0;
      // a Second Wind fake death is not the wave-final kill
      Object.defineProperty(this, 'noFinalKill', { configurable: true, get() { return this.mutSWArmed; } });
      this.moveToward = moveTowardD;
      this.onDeath = ghoulOnDeath;
      this.releaseClutch = ghoulReleaseClutch;
      Object.defineProperty(this, 'vulnerable', { configurable: true, get() {
        if (this.mutSW === 1 || this.state === 'mutVat') return false;
        return fighterVulnerable.call(this);
      } });
    },
    think: ghoulThink,
    stateUpdate: ghoulStateUpdate,
    attackTick: ghoulAttackTick,
    drawBody() { drawGhoul(this); },
    drawExtra(ctx, camX) { drawRim(this, ctx, camX); },
    onHurt() {
      Sound.sfx('mutSquelch', this.x);
      if (this.holding && this.state !== 'mutClutch') {
        this.holding = false;
        const p = Game.player;
        if (p && p.heldBy === this) p.freeFromHold(this.facing);
      }
    },
    onDeath() { this.mutSteam = 8; },
    eyes() { return this.mutEyes || [[3, -33, GH.eye], [1, -33, GH.eye]]; },
    enterStyles: { vat: ghoulVatEnter },
  };

  ENEMY_TYPES.bloater = {
    name: 'BLOATER', family: 'mutant', hp: 40, speed: 0.5, w: 12, h: 38, weight: 0.85, score: 800, shadowR: 14, noGrab: true,
    attacks: {
      bump: { start: 12, active: 4, rec: 18, dmg: 8, tier: 2, kb: 2.0, stun: 20, reach: [0, 22], zr: [4, 32], depth: 9,
        tell: 'glint', whiff: 'whoosh', selfVx: 1.6 },
      belch: { start: 30, active: 14, rec: 26, dmg: 0, tier: 1, reach: [8, 56], zr: [0, 40], depth: 10,
        tell: 'glint', custom: true, sfxStart: 'mutInflate' },
    },
    init() {
      this.mutDsp = 0.4;
      this.noFinalKill = true;   // it fuses instead of dying, so the kill is not wave-final yet
      this.moveToward = moveTowardD;
      this.onDeath = bloaterOnDeath;
      this.knockDown = bloaterKnockDown;
      this.takeHit = bloaterTakeHit;
      this.canBeGrabbed = bloaterCanBeGrabbed;
      this.onTossed = bloaterOnTossed;
      this.drawMarker = bloaterDrawMarker;
      // while the hero carries it, draw it behind her so she reads as holding it up
      this.sortY = function () { return this.grabbedBy && (this.state === 'grabbed' || this.state === 'held') ? this.y - 1 : this.y; };
      // not grabbable while alive; a fusing (dead) Bloater can be grabbed and tossed
      Object.defineProperty(this, 'grabbable', { configurable: true, get() { return !!this.mutFusing && !this.dying; } });
      Object.defineProperty(this, 'vulnerable', { configurable: true, get() { return !this.mutFusing && fighterVulnerable.call(this); } });
    },
    think() { planThink(this, BLOATER_PLANS, bloaterChoose); },
    stateUpdate: bloaterStateUpdate,
    attackTick: bloaterAttackTick,
    drawBody() { drawBloater(this); },
    onHurt: squelch,
    eyes() { return this.mutEyes || [[6, -36, BL.eye], [7, -36, BL.eye]]; },
  };

  ENEMY_TYPES.kiln = {
    name: 'KILN', family: 'gang', hp: 44, speed: 0.9, w: 8, h: 44, weight: 1.05, score: 1200, shadowR: 11, gear: KL.dome,
    attacks: {
      flame: { start: 24, active: 40, rec: 30, dmg: 6, tier: 1, reach: [10, 70], zr: [12, 30], depth: 8,
        tell: 'heavy', danger: 'line', dangerLen: 70, custom: true, mutRim: true },
      bash: { start: 10, active: 4, rec: 16, dmg: 8, tier: 2, kb: 1.6, stun: 20, reach: [4, 22], zr: [14, 36], depth: 8,
        tell: 'glint', whiff: 'whoosh', selfVx: 1.0 },
    },
    init() {
      this.takeHit = kilnTakeHit;
      this.onHitFx = kilnHitFx;
      this.setPanic = function () {};          // a flamethrower trooper does not panic in fire
    },
    think() { planThink(this, KILN_PLANS, kilnChoose, (e, k) => startAtk(e, k)); },
    stateUpdate: kilnStateUpdate,
    attackTick: kilnAttackTick,
    drawBody() { drawKiln(this); },
    drawExtra(ctx, camX) {
      drawRim(this, ctx, camX);
    },
    onDeath() { this.mutTank = 0; Sound.sfx('mutTankHiss', this.x); },
    eyes() { return this.mutEyes || [[3, -42, KL.slit], [4, -42, KL.slit], [5, -42, KL.slit]]; },
  };
})();
