// KING VALVE, "THE THIRST KING": the final boss (DESIGN 6.1, 6.5) and THE FIRST BLUE finale (DESIGN 12 #7).
// Module prefix kv. Registers ENEMY_TYPES.valve and SFX.kv*; every helper and class lives inside this IIFE.
//
// Phases: 1 THE KING (360-241) Steam Jet / Piston Punch / Crown Wheel; 2 FLOODGATES (240-121) crank at the
// floodgate wheel, beans from a crane hook, 2 Kiln Troopers, Pressure Lanes, Leaping Slam every 3rd attack;
// 3 OVERPRESSURE (<=120) Meltdown Rush, Overpressure Burst every 720f, lanes every 300f.
// The chest gauge needle is the telegraph: 9 o'clock at rest, swings to 3 o'clock across every wind-up.
(function () {
  const S = 1.35;                                           // humanoid rig scale
  const DIMS = { thigh: 10, shin: 10, torso: 15, neck: 7, upper: 8, fore: 8 };
  const SPR = [196, 140, 92, 124];                          // scratch sprite [w, h, ox, oy]
  const C = {
    drum: '#8c6a3a', rim: '#5e4424', rivet: '#c9a86a', gauge: '#f2eee0', needle: '#d8322a',
    helm: '#6e7a84', visor: '#ffb04a', crown: '#d4af37', pipe: '#4a525c', piston: '#7a8088', rod: '#b8bec4',
    leg: '#5a626c', cape: '#5a1e1e', hot: '#ff4a2a', boot: '#2e3238', brass: '#c9a86a', iron: '#3a3f46',
    glow: '#ffb04a', steam: '#e8ecef', red: '#ff3b30',
    water: '#2e7fd8', deep: '#1e5aa8', foam: '#e8f4ff', spray: '#8ec8ff',
  };
  const PH2 = 240, PH3 = 120;                                // phase thresholds (HP)
  const GATE_DX = 192, GATE_Y = 118;                         // floodgate wheel: x from the lock edge, screen y
  const JET_TELE = 40, JET_BLAST = 40;
  const ARMOR_STATES = ['kvcrank', 'kvleap', 'kvrush', 'kvburst', 'kvphase', 'kvintro', 'kvshrug', 'kvdie', 'kvtired'];

  // ---------- helpers ----------
  const mixCache = new Map();
  function mix(a, b, k) {
    k = Math.round(clamp(k, 0, 1) * 16) / 16;               // quantised so the shade cache stays bounded
    const key = a + b + k;
    let v = mixCache.get(key);
    if (v) return v;
    const A = hexToRgb(a), B = hexToRgb(b);
    v = '#' + [0, 1, 2].map(i => Math.round(lerp(A[i], B[i], k)).toString(16).padStart(2, '0')).join('');
    mixCache.set(key, v);
    return v;
  }
  // Stamp a pixel arc (centre cx,cy, radius r, angles a0..a1, screen radians, 0 = +x).
  function arc(cx, cy, r, a0, a1, t, c) {
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * r));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      Px.rect(cx + Math.cos(a) * r - t / 2, cy + Math.sin(a) * r - t / 2, t, t, c);
    }
  }
  // Erase a disc from the current sprite (real holes, so the outline pass rims them).
  function hole(cx, cy, r) {
    const g = Px.g;
    g.globalCompositeOperation = 'destination-out';
    Px.disc(cx, cy, r, '#000');
    g.globalCompositeOperation = 'source-over';
  }
  // Valve wheel: ring + spokes + hub. holes=true punches the gaps out of the sprite.
  function valve(cx, cy, r, ang, spokes, col, holes) {
    Px.disc(cx, cy, r, col);
    if (holes) hole(cx, cy, r - Math.max(1.2, r * 0.32));
    else Px.disc(cx, cy, r - Math.max(1.2, r * 0.32), shade(col, -0.55));
    for (let i = 0; i < spokes; i++) {
      const a = ang + i * TAU / spokes;
      Px.line(cx, cy, cx + Math.cos(a) * (r - 0.6), cy + Math.sin(a) * (r - 0.6), 1, col);
    }
    Px.disc(cx, cy, Math.max(1, r * 0.3), shade(col, 0.2));
    arc(cx, cy, r - 0.5, -2.4, -1.2, 1, shade(col, 0.35));
  }
  // Highlight stripe along the lit side of a pipe from A to B.
  function pipeHi(A, B, off, t, c) {
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
    const nx = dy / L, ny = -dx / L;
    Px.line(A.x + nx * off, A.y + ny * off, B.x + nx * off, B.y + ny * off, t, c);
  }
  const lockX = () => (Game.cam.lock != null ? Game.cam.lock : Game.cam.x);
  const gateX = () => lockX() + GATE_DX;
  function lanes() {
    const y0 = Game.bounds.yMin, y1 = Game.bounds.yMax, h = (y1 - y0) / 3;
    return [0, 1, 2].map(i => ({ y0: y0 + h * i, y1: y0 + h * (i + 1) }));
  }
  function laneOf(y) { const L = lanes(); for (let i = 0; i < 2; i++) if (y < L[i].y1) return i; return 2; }
  function inLane(L, i, y) { return y >= L.y0 - 0.5 && (i === 2 ? y <= L.y1 + 0.5 : y < L.y1); }
  function hero() { const p = Game.player; return p && !Game.playerGone && p.hp > 0 ? p : null; }
  const isFree = e => e.state === 'idle' || e.state === 'walk';
  const coolFor = e => Math.round(60 * (e.kvPhase === 3 ? 0.7 : 1));
  // He never stands in a lane that is about to be (or is being) blasted: the step aside is part of the tell.
  function safeY(ty) {
    for (const j of Game.ents) {
      if (!j.kvJet || j.remove || j.t >= JET_TELE + JET_BLAST || !inLane(j.L, j.lane, ty)) continue;
      const up = j.L.y0 - 3, dn = j.L.y1 + 3;
      const canUp = up >= Game.bounds.yMin, canDn = dn <= Game.bounds.yMax;
      ty = canUp && (!canDn || ty - j.L.y0 < j.L.y1 - ty) ? up : dn;
    }
    return clamp(ty, Game.bounds.yMin, Game.bounds.yMax);
  }

  const tele = n => Math.max(10, n + (Game.diff.tele || 0));

  // ---------- sounds ----------
  Object.assign(SFX, {
    kvHissRise(a, p) { const d = a.out(p); a.noise(0.45, 0.22, 1500, 1.2, 'highpass', 0, d, 6500); a.tone(260, 820, 0.45, 'sawtooth', 0.035, 0, d); },
    kvSteamJet(a, p) { const d = a.out(p); a.noise(0.55, 0.3, 3200, 0.7, 'bandpass', 0, d, 2000); a.noise(0.5, 0.16, 7000, 1, 'highpass', 0, d); },
    kvCharge(a, p) { const d = a.out(p); a.tone(140, 420, 0.26, 'sawtooth', 0.09, 0, d); a.tone(280, 840, 0.26, 'square', 0.03, 0, d); },
    kvPiston(a, p) { const d = a.out(p, true); a.noise(0.12, 0.6, 1800, 0.8, 'bandpass', 0, d, 400); a.tone(180, 50, 0.16, 'square', 0.4, 0, d); a.tone(1300, 900, 0.1, 'triangle', 0.12, 0, d); },
    kvSpin(a, p) { const d = a.out(p); for (let i = 0; i < 5; i++) a.tone(1900 + i * 160, 1400, 0.03, 'square', 0.05, i * 0.07, d); },
    kvWhistle(a, p) { const d = a.out(p); a.tone(1000, 3000, 0.75, 'sine', 0.16, 0, d, 0.05); a.tone(1004, 3008, 0.75, 'triangle', 0.06, 0, d, 0.05); a.noise(0.75, 0.07, 4000, 2, 'bandpass', 0, d, 9000); },
    kvHorn(a, p) { const d = a.out(p, true); a.tone(98, 96, 1.1, 'sawtooth', 0.16, 0, d, 0.08); a.tone(147, 145, 1.1, 'sawtooth', 0.12, 0, d, 0.08); a.noise(1.1, 0.12, 1200, 1, 'bandpass', 0, d); },
    kvClank(a, p) { const d = a.out(p); a.tone(300, 0, 0.07, 'square', 0.1, 0, d); a.tone(452, 0, 0.07, 'square', 0.07, 0, d); a.noise(0.03, 0.2, 2500, 1, 'highpass', 0, d); },
    kvJet(a, p) { const d = a.out(p); a.noise(0.8, 0.5, 1400, 0.6, 'lowpass', 0, d, 300); a.noise(0.6, 0.2, 4000, 1, 'highpass', 0, d); a.tone(90, 60, 0.6, 'sine', 0.25, 0, d); },
    kvGurgle(a, p) { const d = a.out(p); a.noise(0.6, 0.2, 300, 1, 'lowpass', 0, d, 900); for (let i = 0; i < 5; i++) a.tone(300 + Math.random() * 300, 650 + Math.random() * 400, 0.05, 'sine', 0.06, i * 0.1, d); },
    kvCrack(a, p) { const d = a.out(p, true); a.noise(0.7, 0.45, 900, 0.8, 'bandpass', 0, d, 200); for (let i = 0; i < 7; i++) a.noise(0.03, 0.4, 3000, 2, 'bandpass', i * 0.08 + Math.random() * 0.03, d); a.tone(70, 35, 0.7, 'sine', 0.4, 0, d); },
    kvFlood(a, p) { const d = a.out(p); a.noise(2.4, 0.55, 700, 0.5, 'lowpass', 0, d, 220); a.noise(2.0, 0.2, 3000, 0.8, 'bandpass', 0.1, d, 1200); a.tone(55, 40, 1.8, 'sine', 0.45, 0, d, 0.2); },
    kvRupture(a, p) { SFX.explode(a, p); const d = a.out(p); a.noise(1.4, 0.35, 5000, 1, 'highpass', 0.05, d, 2500); a.tone(800, 120, 0.6, 'sawtooth', 0.1, 0, d); },
    kvFall(a, p) { a.tone(1700, 260, 0.28, 'sine', 0.14, 0, a.out(p)); },
    kvSlam(a, p) { const d = a.out(p, true); a.noise(0.5, 0.8, 600, 0.6, 'lowpass', 0, d, 80); a.tone(80, 28, 0.5, 'sine', 0.8, 0, d); a.tone(1100, 700, 0.15, 'square', 0.06, 0, d); },
    kvSnap(a, p) { const d = a.out(p); a.tone(2400, 1200, 0.08, 'square', 0.1, 0, d); a.tone(3100, 2000, 0.12, 'triangle', 0.08, 0.02, d); },
  });

  // ---------- poses ----------
  const P = {
    idle(e) {
      const b = Math.sin(e.anim * 0.07);
      return pose({ hy: -20 + b * 0.5, rot: 0.05, head: 0.04, fThigh: 0.28, fKnee: -0.22, bThigh: -0.28, bKnee: -0.12,
        fUpper: 0.32 + b * 0.04, fElbow: 0.85, bUpper: 0.3 - b * 0.05, bElbow: 0.85 });
    },
    walk(e, dir = 1) {
      const t = e.anim * dir * 0.16 * (e.speed / 0.9), s = Math.sin(t);
      return pose({ hy: -20 - Math.abs(Math.cos(t)) * 0.8, rot: 0.08, head: 0.02, fThigh: s * 0.45, fKnee: -0.15 - Math.max(0, -s) * 0.6,
        bThigh: -s * 0.45, bKnee: -0.15 - Math.max(0, s) * 0.6, fUpper: 0.32 - s * 0.15, fElbow: 0.85, bUpper: 0.3 + s * 0.2, bElbow: 0.85 });
    },
    steam(ph, t, a, e) {
      const wind = pose({ hy: -20, rot: -0.06, head: -0.06, fThigh: 0.35, fKnee: -0.25, bThigh: -0.35, bKnee: -0.1, fUpper: 0.05, fElbow: 0.5, bUpper: 1.4, bElbow: 0.1 });
      if (ph === 'start') return lerpPose(P.idle(e), wind, easeOut(clamp(t / a.start, 0, 1)));
      if (ph === 'active') return pose(Object.assign({}, wind, { hx: -1 + Math.sin(t * 1.3) * 0.4, rot: -0.1, bUpper: 1.42 + Math.sin(t * 0.9) * 0.04 }));
      return lerpPose(wind, P.idle(e), clamp((t - a.start - a.active) / a.rec, 0, 1));
    },
    punch(ph, t, a, e) {
      const wind = pose({ hx: -2, hy: -19, rot: -0.14, head: 0.05, fThigh: 0.42, fKnee: -0.3, bThigh: -0.45, bKnee: -0.2, fUpper: -0.35, fElbow: 2.0, bUpper: 0.55, bElbow: 1.2 });
      const hit = pose({ hx: 4, hy: -19, rot: 0.24, head: 0.1, fThigh: 0.6, fKnee: -0.55, bThigh: -0.6, bKnee: 0, fUpper: 1.57, fElbow: 0, bUpper: -0.3, bElbow: 0.9 });
      if (ph === 'start') return lerpPose(P.idle(e), wind, easeOut(clamp(t / 6, 0, 1)));
      if (ph === 'active') return lerpPose(wind, hit, clamp((t - a.start + 1) / 3, 0, 1));
      const k = clamp((t - a.start - a.active - 8) / (a.rec - 8), 0, 1);
      return lerpPose(hit, P.idle(e), k);
    },
    wheel(ph, t, a, e) {
      const wind = pose({ hy: -20, rot: -0.08, head: -0.12, fThigh: 0.3, fKnee: -0.2, bThigh: -0.35, bKnee: -0.15, fUpper: 2.85, fElbow: 0.45, bUpper: 0.2, bElbow: 0.9 });
      const thr = pose({ hx: 2, hy: -20, rot: 0.2, head: 0.05, fThigh: 0.5, fKnee: -0.4, bThigh: -0.45, bKnee: -0.05, fUpper: 1.15, fElbow: 0.1, bUpper: -0.3, bElbow: 0.8 });
      if (ph === 'start') return lerpPose(P.idle(e), wind, easeOut(clamp(t / 8, 0, 1)));
      if (ph === 'active') return thr;
      return lerpPose(thr, P.idle(e), clamp((t - a.start - a.active) / a.rec, 0, 1));
    },
    crouch: () => pose({ hx: -1, hy: -14, rot: 0.3, head: -0.1, fThigh: 1.05, fKnee: -1.65, bThigh: -0.15, bKnee: -1.3, fUpper: -0.45, fElbow: 0.7, bUpper: -0.3, bElbow: 0.6 }),
    rise: () => pose({ hy: -21, rot: 0.05, head: -0.1, fThigh: 0.4, fKnee: -0.5, bThigh: -0.25, bKnee: -0.4, fUpper: 2.9, fElbow: 0.2, bUpper: 2.6, bElbow: 0.4 }),
    dive: () => pose({ hy: -21, rot: 0.2, head: 0.2, fThigh: 1.1, fKnee: -1.6, bThigh: 0.6, bKnee: -1.4, fUpper: 0.55, fElbow: -0.35, bUpper: 0.2, bElbow: 0.2 }),
    slam: () => pose({ hx: 1, hy: -13, rot: 0.55, head: 0.2, fThigh: 1.25, fKnee: -1.75, bThigh: -0.3, bKnee: -1.15, fUpper: 0.75, fElbow: -0.2, bUpper: 0.1, bElbow: 0.5 }),
    rushSet: () => pose({ hy: -17, rot: 0.38, head: -0.1, fThigh: 0.8, fKnee: -1.1, bThigh: -0.65, bKnee: -0.45, fUpper: 1.25, fElbow: 0.25, bUpper: -0.5, bElbow: 1.1 }),
    rush(e) {
      const s = Math.sin(e.anim * 0.45);
      return pose({ hy: -19 - Math.abs(Math.cos(e.anim * 0.45)) * 1.2, rot: 0.45, head: -0.15, fThigh: s * 0.85 + 0.25, fKnee: -0.3 - Math.max(0, -s) * 1.1,
        bThigh: -s * 0.85 + 0.25, bKnee: -0.3 - Math.max(0, s) * 1.1, fUpper: 1.35, fElbow: 0.1, bUpper: -0.7, bElbow: 1.1 });
    },
    burstWind: e => pose({ hy: -19, rot: -0.22 + Math.sin(e.t * 0.9) * 0.02, head: -0.25, fThigh: 0.42, fKnee: -0.25, bThigh: -0.42, bKnee: -0.2, fUpper: -0.95, fElbow: 0.6, bUpper: -1.15, bElbow: 0.6 }),
    burst: () => pose({ hy: -21, rot: -0.08, head: -0.3, fThigh: 0.5, fKnee: -0.1, bThigh: -0.5, bKnee: -0.1, fUpper: 2.4, fElbow: 0.25, bUpper: 2.1, bElbow: 0.3 }),
    tired(e) {
      const b = Math.sin(e.t * 0.16);
      return pose({ hy: -16 + b * 0.6, rot: 0.5 + b * 0.04, head: 0.35, fThigh: 0.65, fKnee: -1.0, bThigh: -0.2, bKnee: -0.8, fUpper: -0.05 + b * 0.05, fElbow: 0.3, bUpper: 0.15, bElbow: 0.2 });
    },
    roar: e => pose({ hy: -19, rot: -0.2, head: -0.35 + Math.sin(e.t * 0.8) * 0.04, fThigh: 0.4, fKnee: -0.2, bThigh: -0.4, bKnee: -0.15, fUpper: 2.4, fElbow: 1.3, bUpper: 2.2, bElbow: 1.3 }),
    shrug: () => pose({ hy: -20, rot: -0.15, head: -0.2, fThigh: 0.35, fKnee: -0.2, bThigh: -0.35, bKnee: -0.15, fUpper: 1.9, fElbow: 1.7, bUpper: 1.7, bElbow: 1.6 }),
    struck: () => pose({ hx: -2, hy: -19, rot: -0.42, head: -0.55, fThigh: 0.25, fKnee: -0.2, bThigh: -0.35, bKnee: -0.1, fUpper: -1.25, fElbow: 0.4, bUpper: -1.6, bElbow: 0.3 }),
    kneel: () => pose({ hx: -2, hy: -13, rot: 0.42, head: 0.6, fThigh: 1.35, fKnee: -1.45, bThigh: 0.05, bKnee: -1.6, fUpper: 0.55, fElbow: -0.1, bUpper: 0.35, bElbow: 0.1 }),
  };

  function kvPose(e) {
    switch (e.state) {
      case 'walk': case 'enter': return P.walk(e, e.kvBackStep ? -1 : 1);
      case 'hurt': return lerpPose(Poses.hurt(e.t), P.idle(e), 0.25);
      case 'fall': case 'thrown': return Poses.fall(e.t, e.vz);
      case 'down': return Poses.down();
      case 'getup': return Poses.getup(e.t);
      case 'grabbed': case 'held': case 'pinned': return Poses.grabbed(e.t);
      case 'dizzy': return Poses.hurt(e.t);
      case 'attack': { const a = e.atk; return (P[a.key] || P.steam)(e.atkPhase(), e.t, a, e); }
      case 'kvintro': return e.t < 20 ? lerpPose(P.idle(e), P.roar(e), e.t / 20) : e.t > 70 ? lerpPose(P.roar(e), P.idle(e), clamp((e.t - 70) / 16, 0, 1)) : P.roar(e);
      case 'kvphase': return P.roar(e);
      case 'kvshrug': return P.shrug();
      case 'kvcrank': return e.kvSub === 'back' ? P.walk(e, -1) : e.kvSub === 'turn' ? lerpPose(P.roar(e), P.idle(e), clamp(e.t / 14, 0, 1)) : P.idle(e);
      case 'kvleap':
        switch (e.kvSub) {
          case 'crouch': return lerpPose(P.idle(e), P.crouch(), easeOut(clamp(e.t / 8, 0, 1)));
          case 'rise': case 'track': return P.rise();
          case 'lock': return P.dive();
          default: return e.t < 20 ? P.slam() : lerpPose(P.slam(), P.idle(e), clamp((e.t - 20) / 14, 0, 1));
        }
      case 'kvrush':
        if (e.kvSub === 'dash') return P.rush(e);
        if (e.kvSub === 'tele') return P.rushSet();
        if (e.kvSub === 'rec') return lerpPose(P.tired(e), P.idle(e), clamp((e.t - 10) / 20, 0, 1));
        if (e.kvSub === 'turn') return lerpPose(P.rush(e), P.rushSet(), clamp(e.t / 8, 0, 1));
        return P.walk(e, 1);
      case 'kvburst': return e.kvSub === 'wind' ? lerpPose(P.idle(e), P.burstWind(e), easeOut(clamp(e.t / 10, 0, 1))) : P.burst();
      case 'kvtired': return P.tired(e);
      case 'kvdie': {
        const k = clamp((e.t - 70) / 18, 0, 1);
        return k <= 0 ? P.struck() : lerpPose(P.struck(), P.kneel(), easeOut(k));
      }
    }
    return P.idle(e);
  }

  // Needle angle in screen radians (pi = 9 o'clock, 2pi = 3 o'clock, swinging over 12), or null once snapped off.
  function needle(e) {
    if (e.kvNeedleGone) return null;
    const rest = Math.PI + Math.sin(e.anim * 0.13) * 0.07;
    const swing = k => Math.PI + clamp(k, 0, 1) * Math.PI;
    const pinned = TAU + Math.sin(e.anim * 1.9) * 0.08;
    switch (e.state) {
      case 'attack': {
        const a = e.atk, ph = e.atkPhase();
        if (ph === 'start') return swing(e.t / a.start);
        if (ph === 'active') return pinned;
        return lerp(TAU, Math.PI, clamp((e.t - a.start - a.active) / Math.max(1, a.rec), 0, 1));
      }
      case 'kvleap':
        if (e.kvSub === 'crouch') return swing(e.t / e.kvWind);
        if (e.kvSub === 'recover') return lerp(TAU, Math.PI, clamp(e.t / 30, 0, 1));
        return pinned;
      case 'kvrush':
        if (e.kvSub === 'rec') return lerp(TAU, Math.PI, clamp(e.t / 30, 0, 1));
        if (e.kvSub === 'align') return swing(e.t / 10);
        return pinned;
      case 'kvburst': return e.kvSpin;
      case 'kvphase': case 'kvintro': return e.kvSpin;
      case 'kvtired': return Math.PI * 0.5 + Math.sin(e.t * 0.2) * 0.15;
      case 'kvshrug': return pinned;
      case 'hurt': return rest + Math.sin(e.t * 1.7) * 0.5;
      case 'fall': case 'down': case 'getup': return Math.PI * 0.5;
    }
    return rest;
  }

  // ---------- painting (side view, on the shared humanoid rig) ----------
  function paintSide(e, p) {
    const R = solveRig(p, S, DIMS);
    const heat = e.kvHeat || 0;
    paintCape(e, R);
    paintFarArm(e, R);
    paintLeg(R.H, R.bl, -0.3);
    paintLeg(R.H, R.fl, 0);
    paintDrum(e, R, heat);
    paintHelmet(e, R.Hd, R.tTh + p.head);
    paintPiston(e, R);
    return R;
  }
  function paintCape(e, R) {
    const lag = clamp(-(e.vx || 0) * e.facing * 1.5, -3, 3) + (e.state === 'kvrush' && e.kvSub === 'dash' ? -6 : 0);
    const lift = e.z > 2 || (e.state === 'kvleap' && e.kvSub !== 'crouch' && e.kvSub !== 'recover') ? -6 : 0;
    for (let k = 2; k >= 0; k--) {
      const sw = Math.sin(e.anim / 20 + k * 0.9) * 2;
      const tx = R.S.x - 9 - k * 3, ty = R.S.y + 1 + k * 2;
      const bx = R.H.x - 16 - k * 4 + sw + lag * (1 + k * 0.3), by = R.H.y + 14 + k * 2 + lift;
      const col = shade(C.cape, -0.12 * k);
      Px.quad(tx, ty, bx, by, 9 - k, 7 - k, col);
      // tattered hem
      Px.poly([bx - 3, by, bx + 3, by, bx + 1, by + 3 + (k % 2)], col);
      Px.line(lerp(tx, bx, 0.3) + 1, lerp(ty, by, 0.3), lerp(tx, bx, 0.8) + 1, lerp(ty, by, 0.8), 1, shade(col, -0.3));
    }
  }
  function paintFarArm(e, R) {
    const a = R.ba, c = shade(C.pipe, -0.18), hi = shade(C.pipe, 0.12);
    Px.limb(R.S.x, R.S.y, a.E.x, a.E.y, 6, 5, c);
    Px.limb(a.E.x, a.E.y, a.H.x, a.H.y, 5, 5, c);
    pipeHi(R.S, a.E, 1.5, 1, hi); pipeHi(a.E, a.H, 1.2, 1, hi);
    Px.disc(a.E.x, a.E.y, 3.4, shade(C.pipe, -0.38));
    Px.disc(a.E.x, a.E.y, 2.2, hi);
    // nozzle: a cone along the forearm with a brass tip
    const ux = dirX(a.b), uy = dirY(a.b);
    const tip = { x: a.H.x + ux * 7, y: a.H.y + uy * 7 };
    Px.quad(a.H.x, a.H.y, tip.x, tip.y, 7, 3, shade(C.pipe, -0.35));
    Px.line(a.H.x - uy * 3, a.H.y + ux * 3, a.H.x + uy * 3, a.H.y - ux * 3, 1, C.brass);
    Px.disc(tip.x, tip.y, 1.6, C.brass);
    Px.dot(tip.x + ux, tip.y + uy, '#1a1410');
    e.kvNozzle = tip;
  }
  function paintLeg(Hp, L, k) {
    const c = k ? shade(C.leg, k) : C.leg, hi = shade(c, 0.3), dk = shade(c, -0.35);
    const H0 = { x: Hp.x, y: Hp.y + 1 };
    Px.limb(H0.x, H0.y, L.K.x, L.K.y, 8, 7, c);
    pipeHi(H0, L.K, 2, 1, hi);
    Px.limb(L.K.x, L.K.y, L.F.x, L.F.y, 7, 6, c);
    pipeHi(L.K, L.F, 1.8, 1, hi);
    // shin band (pipe coupling)
    const mx = lerp(L.K.x, L.F.x, 0.55), my = lerp(L.K.y, L.F.y, 0.55), ux = dirX(L.b), uy = dirY(L.b);
    Px.quad(mx - ux * 1.5, my - uy * 1.5, mx + ux * 1.5, my + uy * 1.5, 9, 9, dk);
    Px.dot(mx - uy * 3, my + ux * 3, hi);
    // knee flange
    Px.disc(L.K.x, L.K.y, 4.6, dk);
    Px.disc(L.K.x, L.K.y, 3.4, shade(c, 0.12));
    Px.dot(L.K.x, L.K.y, dk);
    // iron boot
    const fx = dirX(L.b + Math.PI / 2), fy = dirY(L.b + Math.PI / 2);
    const bc = k ? shade(C.boot, k * 0.6) : C.boot;
    Px.limb(L.F.x - fx * 3, L.F.y - fy * 3 - 1, L.F.x + fx * 6, L.F.y + fy * 6 - 1, 7, 6, bc);
    Px.line(L.F.x - fx * 2, L.F.y - fy * 2 - 3, L.F.x + fx * 5, L.F.y + fy * 5 - 3, 1, shade(bc, 0.35));
  }
  function paintDrum(e, R, heat) {
    const cx = lerp(R.H.x, R.S.x, 0.5) + 1, cy = lerp(R.H.y, R.S.y, 0.5) + 1;
    const ruptured = e.kvRupture, dead = ruptured ? (e.kvCool || 0) : 0;
    if (ruptured) heat *= 1 - dead;
    let body = heat > 0 ? mix(C.drum, C.hot, heat) : C.drum;
    let rim = heat > 0 ? mix(C.rim, '#8a2a14', heat) : C.rim;
    if (dead > 0) { body = mix(body, '#4a3a2a', dead * 0.75); rim = mix(rim, '#2a2018', dead * 0.75); }
    // exhaust stack behind the drum
    const sx0 = cx - 11, sy0 = cy - 11, sx1 = cx - 14, sy1 = cy - 20;
    Px.line(sx0, sy0, sx1, sy1, 6, shade(C.pipe, -0.2));
    Px.line(sx0 + 2, sy0, sx1 + 2, sy1, 1, shade(C.pipe, 0.15));
    Px.rect(sx1 - 4, sy1 - 3, 9, 3, C.iron);
    Px.rect(sx1 - 4, sy1 - 3, 9, 1, shade(C.iron, 0.3));
    Px.rect(sx1 - 2, sy1 - 4, 5, 1, heat > 0.5 || ruptured ? C.glow : '#1a1410');
    e.kvStack = { x: sx1, y: sy1 - 3 };
    // drum: rim, shadowed body, lit body, highlight arc
    Px.disc(cx, cy, 18, rim);
    Px.disc(cx, cy, 16.5, shade(body, -0.3));
    Px.disc(cx + 1.3, cy - 1.3, 15.2, body);
    arc(cx, cy, 12.5, -1.85, -0.5, 2, shade(body, 0.24));
    arc(cx, cy, 14, -1.6, -1.0, 1, shade(body, 0.45));
    // riveted seam band
    const by = cy + 6, hw = Math.sqrt(16 * 16 - 36);
    Px.rect(cx - hw, by, hw * 2, 2, rim);
    for (let i = -2; i <= 2; i++) Px.dot(cx + i * 6, by, C.rivet);
    // 8 rim rivets
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + Math.PI / 8;
      const rx = cx + Math.cos(a) * 17, ry = cy + Math.sin(a) * 17;
      Px.rect(rx - 1, ry - 1, 2, 2, C.rivet);
      Px.dot(rx, ry, shade(C.rivet, -0.45));
    }
    // heat glow: hot seams in phase 3
    if (heat > 0.4) {
      const fl = (Game.frame >> 2) % 2;
      Px.rect(cx - hw + 2, by + 2, hw * 2 - 4, 1, fl ? '#ffd27a' : C.glow);
      arc(cx, cy, 16, 0.5, 2.6, 1, fl ? C.glow : '#ffd27a');
    }
    if (ruptured) {
      // torn plates and a glowing wound that cools to dark
      const cool = e.kvCool || 0;
      const g1 = mix('#ffe08a', '#2a1a14', cool), g2 = mix(C.glow, '#140c0a', cool);
      Px.poly([cx - 2, cy - 9, cx + 6, cy - 3, cx + 3, cy + 1, cx + 9, cy + 7, cx + 1, cy + 4, cx - 5, cy + 9, cx - 3, cy + 1, cx - 9, cy - 3], '#140c0a');
      Px.poly([cx - 1, cy - 6, cx + 4, cy - 2, cx + 2, cy + 1, cx + 6, cy + 5, cx + 1, cy + 2, cx - 3, cy + 6, cx - 2, cy, cx - 6, cy - 2], g2);
      Px.poly([cx, cy - 3, cx + 2, cy, cx, cy + 2, cx - 2, cy], g1);
      Px.line(cx + 9, cy - 8, cx + 13, cy - 13, 2, shade(body, -0.2));
      Px.line(cx - 8, cy + 8, cx - 13, cy + 12, 2, shade(body, -0.25));
    }
    // chest gauge (the telegraph)
    const gx = cx + 10, gy = cy - 6;
    Px.disc(gx, gy, 6, '#2a2018');
    Px.disc(gx, gy, 5, ruptured ? '#8a8478' : C.gauge);
    arc(gx, gy, 3.6, -0.75, 0.3, 1, '#d8322a');                // red zone around 3 o'clock
    Px.dot(gx - 4, gy, '#3a3026'); Px.dot(gx, gy - 4, '#3a3026');
    const th = needle(e);
    if (th != null) {
      Px.line(gx, gy, gx + Math.cos(th) * 4.3, gy + Math.sin(th) * 4.3, 1, C.needle);
      if (e.state === 'kvburst' || e.state === 'kvphase') Px.line(gx, gy, gx + Math.cos(th - 0.5) * 3.5, gy + Math.sin(th - 0.5) * 3.5, 1, rgba(C.needle, 0.5));
    }
    Px.dot(gx, gy, '#1a1410');
    arc(gx, gy, 5.5, -2.3, -1.4, 1, '#ffffff');
    e.kvGauge = { x: gx, y: gy };
    e.kvDrumC = { x: cx, y: cy };
  }
  function paintHelmet(e, Hd, ang) {
    const ux = dirX(ang), uy = dirY(ang);           // "up" for the head
    const fx = -uy, fy = ux;                          // "forward"
    const helm = e.kvHeat > 0.5 ? mix(C.helm, '#8a5a4a', (e.kvHeat - 0.5) * 0.8) : C.helm;
    // collar ring with bolts
    const cX = Hd.x - ux * 7.5, cY = Hd.y - uy * 7.5;
    Px.oval(cX, cY, 9.5, 3, '#4a525c');
    Px.oval(cX, cY - 1, 8.5, 1.5, '#6a727c');
    for (let i = -2; i <= 2; i++) Px.dot(cX + i * 3.6, cY + 1, C.brass);
    // dome
    Px.disc(Hd.x, Hd.y, 9.6, shade(helm, -0.32));
    Px.disc(Hd.x + fx * 0.6 + ux * 0.7, Hd.y + fy * 0.6 + uy * 0.7, 8.8, helm);
    arc(Hd.x, Hd.y, 7, -2.6, -1.5, 2, shade(helm, 0.3));
    Px.dot(Hd.x - fx * 4 + ux * 5, Hd.y - fy * 4 + uy * 5, shade(helm, 0.5));
    // rear bolt and side port
    Px.disc(Hd.x - fx * 6, Hd.y - fy * 6 - uy * 0, 1.6, C.brass);
    // porthole visor (glowing)
    const pX = Hd.x + fx * 4.2 - ux * 0.5, pY = Hd.y + fy * 4.2 - uy * 0.5;
    const flick = e.kvRupture ? (e.kvCool > 0.9 ? 0 : 0.5 * (1 - e.kvCool)) : 0.85 + 0.15 * Math.sin(e.anim * 0.5) + ((e.anim * 7) % 13 === 0 ? 0.2 : 0);
    Px.disc(pX, pY, 4.6, C.brass);
    Px.disc(pX, pY, 3.5, flick > 0.2 ? mix('#5a2a10', C.visor, flick) : '#1a1410');
    if (flick > 0.5) { Px.rect(pX - 1, pY - 1, 2, 2, '#ffe08a'); Px.dot(pX + 1, pY - 2, '#ffffff'); }
    Px.line(pX, pY - 3, pX, pY + 3, 1, '#5e4424');
    // crown: three valve wheels on posts (the front one is missing while thrown)
    const missing = e.kvWheelOut || (e.state === 'attack' && e.atk && e.atk.key === 'wheel');
    if (!e.kvCrownGone) {
      for (let k = -1; k <= 1; k++) {
        if (k === 1 && missing) continue;
        const a = ang + k * 0.78;
        const px0 = Hd.x + dirX(a) * 8.5, py0 = Hd.y + dirY(a) * 8.5;
        const wx = Hd.x + dirX(a) * 14, wy = Hd.y + dirY(a) * 14;
        Px.line(px0, py0, wx, wy, 2, shade(C.crown, -0.35));
        valve(wx, wy, 4, e.anim * 0.04 + k, 4, C.crown, true);
      }
    }
    e.kvHead = { x: Hd.x, y: Hd.y };
  }
  function rodLen(e) {
    if (e.state === 'attack' && e.atk && e.atk.key === 'punch') {
      const a = e.atk, ph = e.atkPhase();
      if (ph === 'start') return lerp(4, 0, clamp(e.t / 6, 0, 1));
      if (ph === 'active') return lerp(0, 25, clamp((e.t - a.start + 1) / 4, 0, 1));
      const r = e.t - a.start - a.active;
      return r < 10 ? 25 : lerp(25, 4, clamp((r - 10) / 14, 0, 1));
    }
    if (e.state === 'kvrush' && e.kvSub === 'dash') return 10;
    if (e.state === 'kvleap' && (e.kvSub === 'lock' || e.kvSub === 'recover')) return e.kvSub === 'lock' ? 8 : 6;
    return 4;
  }
  function paintPiston(e, R) {
    // the piston arm hangs from the drum's flank, a little behind the shoulder, so the chest gauge stays visible
    const off = (q) => ({ x: q.x - 3, y: q.y + 2 });
    const a = { E: off(R.fa.E), H: off(R.fa.H), b: R.fa.b }, Sh = off(R.S);
    const c = C.piston, hi = shade(c, 0.3), dk = shade(c, -0.32);
    const charging = (e.state === 'attack' && e.atk && e.atk.key === 'punch' && e.atkPhase() === 'start') || (e.state === 'kvrush' && e.kvSub === 'tele');
    // upper arm
    Px.limb(Sh.x, Sh.y, a.E.x, a.E.y, 8, 7, c);
    pipeHi(Sh, a.E, 2, 1, hi);
    Px.disc(a.E.x, a.E.y, 4, dk);
    // cylinder (forearm)
    const ux = dirX(a.b), uy = dirY(a.b), vx = -uy, vy = ux;
    Px.quad(a.E.x, a.E.y, a.H.x, a.H.y, 10, 10, c);
    Px.line(a.E.x - vx * 4, a.E.y - vy * 4, a.H.x - vx * 4, a.H.y - vy * 4, 1, hi);
    Px.line(a.E.x + vx * 4, a.E.y + vy * 4, a.H.x + vx * 4, a.H.y + vy * 4, 1, dk);
    for (const k of [0.35, 0.7]) {
      const bx = lerp(a.E.x, a.H.x, k), by = lerp(a.E.y, a.H.y, k);
      Px.line(bx - vx * 5, by - vy * 5, bx + vx * 5, by + vy * 5, 1, dk);
    }
    // sliding rod
    const L = rodLen(e);
    const T = { x: a.H.x + ux * L, y: a.H.y + uy * L };
    const glow = charging && (Game.frame >> 1) % 2 ? '#ffd27a' : charging ? C.glow : C.rod;
    if (L > 0) { Px.line(a.H.x, a.H.y, T.x, T.y, 3, glow); Px.line(a.H.x - vx, a.H.y - vy, T.x - vx, T.y - vy, 1, charging ? '#fff2c0' : '#e8ecef'); }
    Px.quad(a.H.x - ux * 1.5, a.H.y - uy * 1.5, a.H.x + ux * 1, a.H.y + uy * 1, 12, 12, dk);
    // giant fist
    const F = { x: T.x + ux * 5.5, y: T.y + uy * 5.5 };
    Px.poly([F.x - ux * 5 - vx * 6, F.y - uy * 5 - vy * 6, F.x + ux * 5 - vx * 6, F.y + uy * 5 - vy * 6,
      F.x + ux * 6 + vx * 5, F.y + uy * 6 + vy * 5, F.x - ux * 5 + vx * 6, F.y - uy * 5 + vy * 6], dk);
    Px.poly([F.x - ux * 4 - vx * 5, F.y - uy * 4 - vy * 5, F.x + ux * 4 - vx * 5, F.y + uy * 4 - vy * 5,
      F.x + ux * 5 + vx * 4, F.y + uy * 5 + vy * 4, F.x - ux * 4 + vx * 4, F.y - uy * 4 + vy * 4], c);
    for (let i = -1; i <= 1; i++) Px.rect(F.x + ux * 4 + vx * i * 3 - 1, F.y + uy * 4 + vy * i * 3 - 1, 2, 2, hi);
    Px.line(F.x - ux * 3 - vx * 5, F.y - uy * 3 - vy * 5, F.x + ux * 3 - vx * 5, F.y + uy * 3 - vy * 5, 1, hi);
    // the thrown crown wheel, held overhead and spinning
    if (e.state === 'attack' && e.atk && e.atk.key === 'wheel' && e.atkPhase() === 'start') valve(F.x + ux * 4, F.y + uy * 4, 5, e.t * 0.6, 4, C.crown, false);
    // shoulder pauldron
    Px.disc(Sh.x - 0.5, Sh.y + 2.5, 6.5, dk);
    Px.disc(Sh.x, Sh.y + 2, 5.5, c);
    arc(Sh.x, Sh.y + 2, 4, -2.6, -1.2, 1, hi);
    Px.dot(Sh.x + 2, Sh.y + 3, C.rivet);
    e.kvFist = F;
  }

  // ---------- painting (back view while cranking the floodgate wheel) ----------
  function paintBack(e) {
    const t = e.anim, heat = e.kvHeat || 0;
    const g = Game.ents.find(x => x.kvGate);
    const ang = g ? g.angle : t * 0.15;
    const wx = g ? g.x - e.x : -24, wy = g ? GATE_Y - (e.y - e.z) : -18;
    const u = ((ang % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2) / (Math.PI / 2);
    const sway = Math.sin(u * TAU) * 1.2;
    // legs, wide stance
    const legs = [[-6, -9, -10], [6, 9, 11]];
    legs.forEach(([hx, kx, fx], i) => {
      const c = i ? shade(C.leg, -0.15) : C.leg;
      Px.limb(hx + sway * 0.3, -25, kx, -12, 8, 7, c);
      Px.limb(kx, -12, fx, -1, 7, 6, c);
      Px.disc(kx, -12, 4.5, shade(c, -0.35)); Px.disc(kx, -12, 3.2, shade(c, 0.12));
      Px.oval(fx, -1, 4.5, 2.5, C.boot);
    });
    // drum (back): darker, with the glowing firebox door
    const cx = sway, cy = -35;
    const body = heat > 0 ? mix(shade(C.drum, -0.2), C.hot, heat) : shade(C.drum, -0.2);
    Px.disc(cx, cy, 18, C.rim);
    Px.disc(cx, cy, 16.5, shade(body, -0.25));
    Px.disc(cx - 1, cy - 1, 15.5, body);
    arc(cx, cy, 13, -2.4, -1.6, 2, shade(body, 0.2));
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; Px.rect(cx + Math.cos(a) * 17 - 1, cy + Math.sin(a) * 17 - 1, 2, 2, C.rivet); }
    const pulse = 0.5 + 0.5 * Math.sin(e.t * 0.5);
    Px.rect(cx - 7, cy - 4, 14, 12, C.iron);
    Px.rect(cx - 6, cy - 3, 12, 10, '#1a1410');
    for (let i = 0; i < 3; i++) Px.rect(cx - 5, cy - 2 + i * 3, 10, 2, mix(C.glow, '#ffe08a', pulse * (i === 1 ? 1 : 0.5)));
    Px.rect(cx + 5, cy + 1, 2, 3, C.brass);
    // exhaust stack, centred
    Px.line(cx + 3, cy - 14, cx + 4, cy - 26, 5, shade(C.pipe, -0.2));
    Px.rect(cx + 1, cy - 28, 7, 3, C.iron);
    // cape strips hanging over the shoulders, parted around the firebox
    [[-14, -12], [-9, -7], [11, 9]].forEach(([x0, x1], k) => {
      const sw = Math.sin(e.anim / 20 + k) * 2;
      Px.quad(x0 + sway, -48, x1 + sw, -14 + k * 2, 7, 6, shade(C.cape, -0.1 * k));
      Px.poly([x1 + sw - 3, -14 + k * 2, x1 + sw + 3, -14 + k * 2, x1 + sw, -11 + k * 2], shade(C.cape, -0.1 * k));
    });
    // helmet (back) and crown
    const hx = sway * 1.2, hy = -53;
    Px.oval(hx, hy + 7, 9.5, 3, '#4a525c');
    Px.disc(hx, hy, 9.6, shade(C.helm, -0.3));
    Px.disc(hx - 0.6, hy - 0.6, 8.8, shade(C.helm, -0.1));
    arc(hx, hy, 7, -2.5, -1.6, 2, shade(C.helm, 0.2));
    Px.disc(hx, hy + 1, 2, C.brass);
    for (let k = -1; k <= 1; k++) {
      const a = Math.PI + k * 0.62;
      Px.line(hx + dirX(a) * 8.5, hy + dirY(a) * 8.5, hx + dirX(a) * 14, hy + dirY(a) * 14, 2, shade(C.crown, -0.35));
      valve(hx + dirX(a) * 14, hy + dirY(a) * 14, 4, e.anim * 0.04 + k, 4, C.crown, true);
    }
    // near (left) arm on the wheel rim, hand over hand; right arm braced on the thigh
    const ra = lerp(-1.15, 0.75, u);
    const hand = { x: wx + Math.cos(ra) * 19, y: wy + Math.sin(ra) * 19 };
    const sh = { x: -13 + sway, y: -45 };
    const el = { x: lerp(sh.x, hand.x, 0.5) - 3, y: lerp(sh.y, hand.y, 0.5) - 4 };
    Px.limb(sh.x, sh.y, el.x, el.y, 8, 7, C.piston);
    Px.quad(el.x, el.y, hand.x, hand.y, 10, 9, shade(C.piston, -0.1));
    Px.disc(el.x, el.y, 3.5, shade(C.piston, -0.35));
    Px.disc(hand.x, hand.y, 5.5, shade(C.piston, -0.32));
    Px.disc(hand.x + 0.5, hand.y - 0.5, 4.5, C.piston);
    Px.disc(sh.x, sh.y + 1, 6, shade(C.piston, -0.32)); Px.disc(sh.x + 0.5, sh.y + 0.5, 5, C.piston);
    Px.limb(13 + sway, -45, 17, -32, 6, 5, shade(C.pipe, -0.1));
    Px.limb(17, -32, 11, -23, 5, 5, shade(C.pipe, -0.1));
    Px.disc(17, -32, 3, shade(C.pipe, -0.35));
    Px.disc(10, -22, 2.4, C.brass);
  }

  // ---------- draw hooks ----------
  function drawBody() {
    const e = this;
    let jx = 0, jy = 0;
    if (e.state === 'kvburst' && e.kvSub === 'wind') jx = e.t % 2 ? 1 : -1;
    if (e.state === 'kvleap' && e.kvSub === 'crouch' && e.t > e.kvWind - 10) jx = e.t % 2 ? 1 : 0;
    if (e.state === 'kvphase' || e.state === 'kvintro' && e.t > 20 && e.t < 70) jx = (e.t >> 1) % 2 ? 1 : -1;
    if (e.state === 'kvdie' && e.t < 80) { jx = e.t % 3 - 1; jy = (e.t >> 1) % 2; }
    const g = Sprite.cur.ga;
    if (jx || jy) g.translate(jx, jy);
    if (e.state === 'kvcrank' && e.kvSub === 'crank') paintBack(e);
    else paintSide(e, kvPose(e));
    if (jx || jy) g.translate(-jx, -jy);
  }
  // Last 10 wind-up frames of every heavy/KD/grab move: 1 px #FF3B30 rim, 4f on / 4f off (DESIGN 4.2 b).
  function windLeft(e) {
    if (e.state === 'attack' && e.atk && e.atk.tell === 'heavy' && e.atkPhase() === 'start') return e.atk.start - e.t;
    if ((e.state === 'kvleap' && e.kvSub === 'crouch') || (e.state === 'kvrush' && e.kvSub === 'tele') || (e.state === 'kvburst' && e.kvSub === 'wind')) return e.kvWind - e.t;
    return -1;
  }
  const rimOn = e => { const l = windLeft(e); return l > 0 && l <= 10 && ((l - 1) >> 2) % 2 === 0; };
  function draw(ctx, camX) {
    const e = this;
    if (e.state === 'kvdie' && e.t === 0) e.flash = (Game.frame >> 2) % 2;
    // Meltdown Rush afterimages
    for (const g of e.kvGhosts) {
      Sprite.begin(SPR[0], SPR[1], SPR[2], SPR[3]);
      paintSide(e, g.pose);
      Sprite.end(ctx, g.x - camX, g.y - g.z, g.f, { flash: '#ff4a2a', alpha: 0.38 * (1 - g.t / 10), outline: null });
    }
    if (rimOn(e) && !(Game.silhouetteDist && Game.player && Math.abs(e.x - Game.player.x) > Game.silhouetteDist)) {
      Sprite.begin(SPR[0], SPR[1], SPR[2], SPR[3]);
      drawBody.call(e);
      const s = Sprite.cur;
      s.gb.globalCompositeOperation = 'copy'; s.gb.drawImage(s.a, 0, 0);
      s.gb.globalCompositeOperation = 'source-in'; s.gb.fillStyle = C.red; s.gb.fillRect(0, 0, s.w, s.h);
      s.gb.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.translate(Math.round(e.x - camX + e.jitter), Math.round(e.y - e.z));
      if (e.facing < 0) ctx.scale(-1, 1);
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.drawImage(s.b, -s.ox + ox, -s.oy + oy);
      ctx.restore();
      Px.use(ctx);
    }
    Enemy.prototype.draw.call(e, ctx, camX);
  }
  function drawExtra(ctx, camX) {
    const e = this;
    // the red "!" over custom heavy wind-ups (attacks use the engine's own)
    const l = windLeft(e);
    if (l > 0 && e.state !== 'attack') {
      const bx = e.x - camX, by = e.y - e.z - e.h - 22 - (e.t % 10 < 5 ? 1 : 0);
      Px.use(ctx);
      Px.rect(bx - 2, by - 1, 5, 12, '#000');
      Px.rect(bx - 1, by, 3, 7, '#ff3030');
      Px.rect(bx - 1, by + 8, 3, 2, '#ff3030');
    }
  }
  // Ground markers: leap shadow + lock ring, rush danger line, burst danger ellipse.
  function drawMarker(ctx, camX) {
    const e = this;
    Enemy.prototype.drawMarker.call(e, ctx, camX);
    Px.use(ctx);
    if (e.state === 'kvleap' && (e.kvSub === 'rise' || e.kvSub === 'track' || e.kvSub === 'lock')) {
      const k = e.kvSub === 'rise' ? 0.2 : e.kvSub === 'track' ? 0.2 + 0.5 * e.t / 40 : 0.7 + 0.3 * e.t / 16;
      ctx.globalAlpha = 0.35 + 0.25 * k;
      Px.oval(e.x - camX, e.y, 9 + 15 * k, (9 + 15 * k) * 0.38, '#000');
      if (e.kvSub === 'track' && (e.t >> 3) % 2 === 0) { ctx.globalAlpha = 0.45; Px.oval(e.x - camX, e.y, 4 + 8 * k, (4 + 8 * k) * 0.38, '#000'); }
      ctx.globalAlpha = 1;
      if (e.kvSub === 'lock') {
        const r = 26 + ((e.t >> 1) % 2);
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(Math.round(e.x - camX), Math.round(e.y), r, r * 0.42, 0, 0, TAU); ctx.stroke();
        Px.rect(e.x - camX - 4, e.y, 9, 1, '#ff3030'); Px.rect(e.x - camX, e.y - 2, 1, 5, '#ff3030');
        ctx.globalAlpha = 1;
      }
    }
    if (e.state === 'kvrush' && (e.kvSub === 'tele' || e.kvSub === 'align')) {
      const dir = e.kvDir, x0 = e.x - camX, end = dir > 0 ? W - 20 : 20;
      ctx.globalAlpha = e.kvSub === 'tele' ? 0.6 : 0.3;
      for (let x = x0 + dir * 12; dir > 0 ? x < end : x > end; x += dir * 8) Px.rect(x - (dir < 0 ? 4 : 0), e.y, 4, 1, '#ff3b30');
      ctx.globalAlpha = 1;
    }
    if (e.state === 'kvburst' && e.kvSub === 'wind') {
      const k = clamp(e.t / e.kvWind, 0, 1);
      ctx.globalAlpha = 0.3 + 0.4 * k;
      ctx.strokeStyle = '#ff3030'; ctx.lineWidth = 1;
      const r = lerp(10, 70, easeOut(k));
      ctx.beginPath(); ctx.ellipse(Math.round(e.x - camX), Math.round(e.y), r, r * 0.4, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.08 + 0.08 * k;
      Px.oval(e.x - camX, e.y, r, r * 0.4, '#ff3030');
      ctx.globalAlpha = 1;
    }
  }

  // ---------- state machine ----------
  function end(e, cool) {
    e.setState('idle');
    e.atk = null; e.vx = e.vy = 0; e.kvSub = null;
    e.cool = cool != null ? cool : coolFor(e);
    e.kvPlan = null; e.kvSeek = 0;
  }
  function startAttack(e, key) {
    const a = Object.assign({ key }, e.def.attacks[key]);
    a.start = Math.max(a.tell === 'heavy' ? 10 : 6, a.start + (Game.diff.tele || 0));
    e.vx = e.vy = 0;
    e.startAttack(a);
    e.kvAtkN++;
    e.kvPlan = null; e.kvSeek = 0;
  }
  function startCustom(e, state, sub, wind) {
    e.atk = null; e.vx = e.vy = 0;
    e.setState(state);
    e.kvSub = sub; e.kvWind = wind || 0;
    e.kvPlan = null; e.kvSeek = 0;
  }
  function setSub(e, sub, wind) { e.kvSub = sub; e.t = 0; if (wind != null) e.kvWind = wind; }
  function startPlan(e, key) {
    if (key === 'leap') { startCustom(e, 'kvleap', 'crouch', tele(20)); e.kvAtkN++; Sound.sfx('kvHissRise', e.x); Sound.sfx('hiss', e.x); return; }
    if (key === 'rush') { startCustom(e, 'kvrush', 'align'); e.kvDashN = 0; e.kvAtkN++; const p = hero(); e.kvDir = p ? (sign(p.x - e.x) || e.facing) : e.facing; return; }
    if (key === 'burst') { startCustom(e, 'kvburst', 'wind', tele(45)); Sound.sfx('kvWhistle', e.x); e.kvBurstT = 720; return; }
    startAttack(e, key);
  }
  function choosePlan(e, adx) {
    const ph = e.kvPhase;
    if (ph === 2 && e.kvAtkN % 3 === 2) return 'leap';
    if (ph === 3) return adx <= 50 ? (chance(0.6) ? 'punch' : 'rush') : (chance(0.65) ? 'rush' : 'punch');
    if (ph === 1 && adx > 80 && !e.kvWheelOut && chance(0.75)) return 'wheel';
    if (adx <= 50) return chance(0.55) ? 'punch' : 'steam';
    return ph === 2 && chance(0.35) ? 'punch' : 'steam';
  }

  function think() {
    const e = this, p = hero();
    e.speed = 0.9 * (e.kvPhase === 3 ? 1.3 : 1);
    e.kvBackStep = false;
    if (e.kvPhase === 1 && e.hp <= PH2) { startCrank(e); return; }
    if (e.kvPhase === 2 && e.hp <= PH3 && e.kvCrankDone) { startPhase3(e); return; }
    if (!p || p.state === 'down' || p.state === 'getup' || p.state === 'victory') {
      // never hit a downed hero: loom at a distance and vent steam
      if (p) { e.face(p); const side = p.x > e.x ? -1 : 1; e.moveToward(clamp(p.x + side * 72, Game.cam.x + 30, Game.cam.x + W - 30), e.y, 0.5); }
      else { e.vx = e.vy = 0; if (e.state !== 'idle') e.setState('idle'); }
      return;
    }
    const sy = safeY(e.y);
    if (Math.abs(sy - e.y) > 1) { e.face(p); e.moveToward(e.x, sy, 1.4); return; }
    if (e.kvPhase === 3 && e.kvBurstT <= 0) { startPlan(e, 'burst'); return; }
    e.face(p);
    const dx = p.x - e.x, dy = p.y - e.y, adx = Math.abs(dx), ady = Math.abs(dy);
    const side = sign(dx) || 1;
    if (e.cool > 0) {
      // stalk at range, drifting into the hero's lane
      // between attacks he looms and holds his ground (DESIGN 6.1: greed is punished by the shrug, not by running)
      const want = 56;
      if (adx > want + 16) e.moveToward(p.x - side * want, safeY(p.y), 0.8);
      else if (Math.abs(safeY(p.y) - e.y) > 6) e.moveToward(e.x, safeY(p.y), 0.6);
      else { e.vx = e.vy = 0; if (e.state !== 'idle') e.setState('idle'); }
      return;
    }
    if (!e.kvPlan) e.kvPlan = choosePlan(e, adx);
    e.kvSeek++;
    const plan = e.kvPlan;
    if (plan === 'leap' || plan === 'rush' || plan === 'wheel') {
      if (plan === 'wheel' && (adx < 70 || e.kvWheelOut)) e.kvPlan = 'steam';
      else { startPlan(e, plan); return; }
    }
    if (e.kvPlan === 'punch') {
      if (adx >= 14 && adx <= 46 && ady <= 6) { startPlan(e, 'punch'); return; }
      if (e.kvSeek > 110) { startPlan(e, e.kvPhase === 3 ? 'rush' : 'steam'); return; }
      const tx = adx < 14 ? e.x - side * 20 : p.x - side * 34;
      e.kvBackStep = adx < 14;
      e.moveToward(tx, safeY(p.y), 1);
      return;
    }
    // steam
    if (adx >= 18 && adx <= 72 && ady <= 8) { startPlan(e, 'steam'); return; }
    if (e.kvSeek > 110) { startPlan(e, e.kvPhase === 3 ? 'rush' : 'steam'); return; }
    const tx = adx < 18 ? e.x - side * 24 : p.x - side * 44;
    e.kvBackStep = adx < 18;
    e.moveToward(tx, safeY(p.y), 1);
  }

  function startCrank(e) {
    startCustom(e, 'kvcrank', 'back');
    e.kvPhase = 2; e.kvAtkN = 0;
    Sound.sfx('kvHorn', e.x);
    FX.steam(e.x, e.y, 50, 6);
  }
  function startPhase3(e) {
    startCustom(e, 'kvphase', null);
    e.kvPhase = 3; e.kvBurstT = 300; e.kvLaneT = Math.max(e.kvLaneT, 180);
    Game.warn('OVERPRESSURE!', 100);
    Sound.playSong('finalboss3');
    Sound.sfx('kvHorn', e.x); Sound.sfx('roar', e.x);
    FX.flash('#ff4a2a', 6, 0.3);
    FX.shake(4, 24);
  }
  function getGate() {
    let g = Game.ents.find(x => x.kvGate && !x.remove);
    if (!g) g = Game.add(new Gate(gateX()));
    return g;
  }
  function fireLane(e) {
    const own = laneOf(e.y), p = hero();
    const cand = [0, 1, 2].filter(i => i !== own);
    const hl = p ? laneOf(p.y) : -1;
    const i = cand.includes(hl) && chance(0.75) ? hl : pick(cand);
    Game.add(new Jet(i));
  }
  function callGuards(e) {
    if (!ENEMY_TYPES.kiln) return;
    Game.spawn({ type: 'kiln', side: 'R' });
    setTimeoutFrames(40, () => { if (!e.dying && Game.state === 'play' && ENEMY_TYPES.kiln) Game.spawn({ type: 'kiln', side: 'R' }); });
  }

  function stateUpdate() {
    const e = this;
    e.kvLastHp = e.hp;
    e.kvSpin += e.state === 'kvburst' ? 0.25 + clamp(e.t / 45, 0, 1) * 0.5 : e.state === 'kvphase' || e.state === 'kvintro' ? 0.45 : 0;
    for (const g of e.kvGhosts) g.t++;
    if (e.kvGhosts.length) e.kvGhosts = e.kvGhosts.filter(g => g.t < 10);
    if (e.dying) { dieUpdate(e); return true; }
    // exposed states take 1.5x damage
    e.dmgMul = (e.state === 'kvcrank' && e.kvSub === 'crank') || e.state === 'kvtired' ? 1.5 : 1;
    e.noShadow = e.state === 'kvleap' && (e.kvSub === 'rise' || e.kvSub === 'track' || e.kvSub === 'lock');
    if (e.state !== 'kvleap' && e.z > 0 && e.state !== 'fall') { e.z = Math.max(0, e.z - 6); }
    // phase timers
    if (e.kvLanes && --e.kvLaneT <= 0) { fireLane(e); e.kvLaneT = e.kvPhase === 3 ? 300 : 240; }
    if (e.kvPhase === 3 && e.kvBurstT > 0 && e.state !== 'kvburst') e.kvBurstT--;
    if (e.kvPhase === 3) {
      e.kvHeat = Math.min(1, (e.kvHeat || 0) + 1 / 60);
      if (e.anim % 5 === 0) FX.steam(e.x + rr(-12, 12), e.y, rr(22, 50), 1);
      if (e.anim % 9 === 0) FX.embers(e.x - e.facing * 14, e.y, 64, 1);
    }
    if (e.anim % 30 === 0) { FX.steam(e.x - e.facing * 9, e.y, 50, 2); FX.steam(e.x + e.facing * 6, e.y, 50, 1); }
    if (e.anim % 47 === 0) FX.smoke(e.x - e.facing * 14, e.y, 66, 1, '#5a5650');
    if (e.state === 'getup' && e.t === 1) e.inv = Math.max(e.inv, 16 + 24);
    const p = hero();
    switch (e.state) {
      case 'kvintro': {
        e.vx = e.vy = 0;
        if (e.t === 26) { Sound.sfx('kvHorn', e.x); FX.steam(e.x - e.facing * 9, e.y, 50, 8); FX.steam(e.x + e.facing * 9, e.y, 50, 8); FX.shake(2, 20); }
        if (e.t >= 90) end(e, 30);
        return true;
      }
      case 'kvshrug': {
        e.vx = e.vy = 0;
        if (e.t === 1) { FX.steam(e.x - 10, e.y, 46, 6); FX.steam(e.x + 10, e.y, 46, 6); Sound.sfx('steam', e.x); Sound.sfx('kvClank', e.x); FX.add({ kind: 'ring', x: e.x, y: e.y, z: 30, life: 10, size: 34, color: '#ffffff', g: 0 }); }
        if (e.t >= 8) { if (p) e.face(p); startAttack(e, 'punch'); e.kvAtkN--; }
        return true;
      }
      case 'kvphase': {
        e.vx = e.vy = 0;
        if (e.t % 4 === 0) { FX.steam(e.x + rr(-16, 16), e.y, rr(20, 60), 2); FX.embers(e.x, e.y, 40, 2); }
        if (e.t === 20) { FX.add({ kind: 'ring', x: e.x, y: e.y, z: 2, life: 16, size: 60, color: '#ffb04a', g: 0 }); FX.dustRing(e.x, e.y, 16); }
        if (e.t >= 48) end(e, 20);
        return true;
      }
      case 'kvcrank': return crankUpdate(e, p);
      case 'kvleap': return leapUpdate(e, p);
      case 'kvrush': return rushUpdate(e, p);
      case 'kvburst': return burstUpdate(e, p);
      case 'kvtired': {
        e.vx *= 0.8; e.vy = 0;
        if (e.t % 6 === 0) FX.steam(e.x + rr(-14, 14), e.y, rr(16, 46), 1);
        if (e.t % 11 === 0) FX.add({ kind: 'chunk', x: e.x + rr(-10, 10), y: e.y, z: rr(20, 40), vx: rr(-1, 1), vz: rr(1, 2), life: 18, color: C.glow, size: 1, g: 0.25 });
        if (e.t >= 60) end(e, 24);
        return true;
      }
    }
    return false;
  }

  function crankUpdate(e, p) {
    const tx = gateX() + 24, ty = Game.bounds.yMin + 2;
    if (e.kvSub === 'back') {
      if (p) e.face(p);
      e.kvBackStep = true;
      const dx = tx - e.x, dy = ty - e.y;
      e.vx = Math.abs(dx) > 1.5 ? sign(dx) * Math.min(1.8, Math.abs(dx)) : 0;
      e.vy = Math.abs(dy) > 1 ? sign(dy) * Math.min(1.3, Math.abs(dy)) : 0;
      e.anim += 0.4;
      if ((!e.vx && !e.vy) || e.t > 140) {
        e.x = tx; e.y = ty; e.vx = e.vy = 0;
        e.facing = 1;
        setSub(e, 'crank');
        e.kvCrankDone = true;
        Game.warn('FLOODGATES!', 100);
        Sound.playSong('finalboss2');
        Sound.sfx('kvHorn', e.x);
        Game.add(new Hook(lockX() + 192));
        callGuards(e);
        e.kvLanes = true; e.kvLaneT = 150;
      }
      return true;
    }
    if (e.kvSub === 'crank') {
      e.vx = e.vy = 0; e.facing = 1;
      const g = getGate();
      g.drive = 4; g.spin = approach(g.spin, -0.11, 0.01);
      if (e.t % 10 === 0) { Sound.sfx('kvClank', g.x); FX.add({ kind: 'spark', x: g.x + rr(-6, 6), y: Game.bounds.yMin, z: Game.bounds.yMin - GATE_Y + rr(-4, 4), vx: rr(-2, 2), vz: rr(0, 2), life: 10, g: 0.1, drag: 0.85 }); }
      if (e.t % 6 === 0) FX.steam(e.x + rr(-14, 14), e.y, rr(30, 54), 1);
      if (e.t >= 40) { setSub(e, 'turn'); if (p) e.face(p); Sound.sfx('roar', e.x); FX.steam(e.x, e.y, 50, 8); }
      return true;
    }
    // turn back to the hero
    e.vx = e.vy = 0;
    if (e.t >= 14) end(e, 30);
    return true;
  }

  function leapUpdate(e, p) {
    switch (e.kvSub) {
      case 'crouch':
        e.vx = e.vy = 0;
        if (e.t % 3 === 0) FX.steam(e.x + rr(-8, 8), e.y, 2, 1);
        if (e.t >= e.kvWind) {
          setSub(e, 'rise');
          e.z = 1;
          Sound.sfx('whooshBig', e.x); Sound.sfx('kvSteamJet', e.x);
          FX.dustRing(e.x, e.y, 16); FX.steam(e.x, e.y, 2, 8);
          FX.shake(2, 8);
        }
        return true;
      case 'rise':
        e.vx = e.vy = 0;
        e.z += 10; e.vz = 0;
        if (e.t % 2 === 0) FX.steam(e.x, e.y, e.z, 1);
        if (e.y - e.z < -60) { setSub(e, 'track'); e.z = e.y + 70; }
        return true;
      case 'track':
        e.z = e.y + 70; e.vz = 0;
        if (p) {
          const dx = p.x - e.x, dy = p.y - e.y;
          e.vx = clamp(dx * 0.12, -3.2, 3.2); e.vy = clamp(dy * 0.12, -2.2, 2.2);
        } else { e.vx = e.vy = 0; }
        if (e.t >= 40) { setSub(e, 'lock'); e.vx = e.vy = 0; e.kvTop = e.z; Sound.sfx('kvFall', e.x); Sound.sfx('beep', e.x); }
        return true;
      case 'lock': {
        e.vx = e.vy = 0;
        const k = clamp(e.t / 16, 0, 1);
        e.z = e.kvTop * (1 - k * k); e.vz = 0;
        if (e.t >= 16) { e.z = 0; slamLand(e); setSub(e, 'recover'); }
        return true;
      }
      default: // recover
        e.vx = e.vy = 0;
        if (e.t % 5 === 0) FX.steam(e.x + rr(-12, 12), e.y, rr(10, 30), 1);
        if (e.t >= 34) end(e);
        return true;
    }
  }
  function slamLand(e) {
    const p = hero();
    if (p && p.vulnerable && p.z < 20) {
      const dx = (p.x - e.x) / (26 + p.w), dy = (p.y - e.y) / 13;
      if (dx * dx + dy * dy <= 1) p.takeHit(e, { dmg: 18, tier: 3, knock: true, kx: 3.4, kz: 4.0, zr: [0, 40], sfx: 'hitHeavy' }, sign(p.x - e.x) || e.facing);
    }
    FX.add({ kind: 'ring', x: e.x, y: e.y, z: 1, life: 16, size: 64, color: '#ffffff', g: 0 });
    FX.add({ kind: 'ring', x: e.x, y: e.y, z: 1, life: 22, size: 90, color: '#ffb04a', g: 0 });
    FX.dustRing(e.x, e.y, 22);
    FX.debris(e.x, e.y, 2, ['#5a5e66', '#3a3f46', '#8a7a5a'], 14, [1, 3]);
    FX.steam(e.x, e.y, 4, 10);
    FX.scorch(e.x, e.y, 40);
    FX.shake(5, 20);
    Sound.sfx('kvSlam', e.x); Sound.sfx('thud', e.x);
  }

  function rushUpdate(e, p) {
    switch (e.kvSub) {
      case 'align': {
        e.face({ x: e.x + e.kvDir });
        e.vx = 0;
        const dy = p ? p.y - e.y : 0;
        e.vy = Math.abs(dy) > 1 ? sign(dy) * Math.min(1.6, Math.abs(dy)) : 0;
        e.anim++;
        if (Math.abs(dy) <= 2 || e.t >= (e.kvDashN ? 16 : 30)) { e.vy = 0; setSub(e, 'tele', tele(14)); Sound.sfx('kvHissRise', e.x); Sound.sfx('hiss', e.x); }
        return true;
      }
      case 'tele':
        e.vx = e.vy = 0;
        e.facing = e.kvDir;
        if (e.t % 2 === 0) FX.steam(e.x - e.facing * 14, e.y, 60, 1);
        if (e.t % 3 === 0) FX.dust(e.x - e.facing * 8, e.y, 1, 0.6);
        if (e.t >= e.kvWind) { setSub(e, 'dash'); e.kvDashHit = false; Sound.sfx('kvPiston', e.x); Sound.sfx('engine', e.x); FX.steam(e.x - e.facing * 12, e.y, 30, 6); }
        return true;
      case 'dash': {
        e.facing = e.kvDir;
        e.vx = 4 * e.kvDir; e.vy = 0;
        if (e.t % 3 === 0) e.kvGhosts.push({ x: e.x, y: e.y, z: e.z, f: e.facing, t: 0, pose: P.rush(e) });
        if (e.t % 2 === 0) { FX.dust(e.x - e.facing * 8, e.y, 1, 0.8); FX.steam(e.x - e.facing * 14, e.y, 56, 1); }
        if (p && !e.kvDashHit && p.vulnerable && Math.abs(p.y - e.y) <= 10 && Math.abs(p.x - (e.x + e.facing * 6)) < 16 + p.w && p.z < 40) {
          e.kvDashHit = true;
          p.takeHit(e, { dmg: 14, tier: 3, knock: true, kx: 3.8, kz: 3.6, zr: [6, 46], sfx: 'hitHeavy' }, e.kvDir);
        }
        const edge = e.kvDir > 0 ? Game.cam.x + W - 26 : Game.cam.x + 26;
        if ((e.kvDir > 0 && e.x >= edge) || (e.kvDir < 0 && e.x <= edge) || e.t > 140) {
          e.vx = 0;
          FX.dust(e.x + e.facing * 10, e.y, 6, 1.4); FX.shake(2, 8); Sound.sfx('thud', e.x);
          e.kvDashN++;
          if (e.kvDashN < 2) { setSub(e, 'turn'); e.kvDir = -e.kvDir; }
          else setSub(e, 'rec');
        }
        return true;
      }
      case 'turn':
        e.vx *= 0.7; e.vy = 0;
        if (e.t % 2 === 0) FX.dust(e.x, e.y, 1, 1);
        if (e.t >= 8) { setSub(e, 'align'); e.facing = e.kvDir; }
        return true;
      default: // rec: panting, venting
        e.vx *= 0.7; e.vy = 0;
        if (e.t % 4 === 0) FX.steam(e.x + rr(-12, 12), e.y, rr(20, 50), 1);
        if (e.t >= 30) end(e);
        return true;
    }
  }

  function burstUpdate(e, p) {
    e.vx = e.vy = 0;
    if (e.kvSub === 'wind') {
      if (e.t % 15 === 0) FX.flash('#b8322a', 15, 0.15);
      if (e.t % 3 === 0) {
        const a = rr(0, TAU);
        FX.steam(e.x + Math.cos(a) * 14, e.y, 36 + Math.sin(a) * 14, 1);
      }
      if (e.t % 8 === 0) Sound.sfx('hiss', e.x);
      if (e.t >= e.kvWind) {
        setSub(e, 'blast');
        if (p && p.vulnerable && p.z < 50) {
          const dx = (p.x - e.x) / 70, dy = (p.y - e.y) / 28;
          if (dx * dx + dy * dy <= 1) p.takeHit(e, { dmg: 22, tier: 3, knock: true, kx: 4.2, kz: 4.2, zr: [0, 50], sfx: 'hitHeavy' }, sign(p.x - e.x) || e.facing);
        }
        FX.add({ kind: 'ball', x: e.x, y: e.y, z: 34, life: 7, size: 34, color: '#fff2e0', g: 0 });
        FX.add({ kind: 'ring', x: e.x, y: e.y, z: 2, life: 18, size: 70, color: '#ffffff', g: 0 });
        FX.add({ kind: 'ring', x: e.x, y: e.y, z: 2, life: 24, size: 84, color: '#ffb04a', g: 0 });
        for (let i = 0; i < 24; i++) {
          const a = i / 24 * TAU;
          FX.add({ kind: 'dust', x: e.x, y: e.y, z: rr(4, 40), vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 1.1, vz: rr(0, 0.5), life: 26, size: rr(3, 5), color: C.steam, g: -0.01, grow: 0.2, alpha: 0.7, drag: 0.94 });
        }
        FX.flash('#ffffff', 4, 0.5);
        FX.shake(5, 22);
        Sound.sfx('kvRupture', e.x);
      }
      return true;
    }
    if (e.t >= 14) { e.setState('kvtired'); e.kvSub = null; }
    return true;
  }

  // ---------- hits and the boss rules (DESIGN 6.1) ----------
  function onHurt(src, a) {
    const e = this;
    if (e.dying || e.hp <= 0) return;
    const dmg = Math.max(0, (e.kvLastHp != null ? e.kvLastHp : e.hp) - e.hp);
    e.kvLastHp = e.hp;
    e.kvMeter += dmg;
    // armour sparks
    for (let i = 0; i < 4; i++) FX.add({ kind: 'chunk', x: e.x - e.facing * 4, y: e.y, z: rr(20, 44), vx: rr(-2, 2), vz: rr(1, 3), life: 18, color: '#ffb04a', size: 1, g: 0.25 });
    if (e.dmgMul > 1 && dmg > 0 && Game.frame - (e.kvMulT || -99) > 18) { e.kvMulT = Game.frame; FX.text(e.x, e.y, e.h + 8, 'x1.5', '#ffb04a', 28); }
    const st = e.state, tier = a.tier || 1;
    const dir = src && src.x != null ? (sign(e.x - src.x) || -e.facing) : -e.facing;
    if (src && src.team === 'player') e.kvHits.push(Game.frame);
    e.kvHits = e.kvHits.filter(f => Game.frame - f < 60);
    const scripted = st === 'kvcrank' || st === 'kvphase' || st === 'kvintro' || st === 'kvshrug' || (st === 'kvleap' && e.kvSub !== 'recover');
    if (tier >= 3 && !scripted) {
      if (e.kvMeter >= 50) {
        e.kvMeter = 0;
        e.atk = null; e.kvSub = null; e.kvHits = [];
        Fighter.prototype.knockDown.call(e, dir, 1.5, 3.2);
        Sound.sfx('kvClank', e.x);
        return;
      }
      const armored = ARMOR_STATES.includes(st) && !(st === 'kvleap' && e.kvSub === 'recover') && !(st === 'kvrush' && e.kvSub === 'rec');
      if (!armored) {
        e.atk = null; e.kvSub = null;
        e.setState('hurt'); e.hurtTime = 20; e.hurtAlt = (e.hurtAlt || 0) + 1;
        e.vx = dir * 0.9; e.vy = 0;
      }
    } else if (tier < 3 && isFree(e)) {
      e.setState('hurt'); e.hurtTime = 8; e.vx = dir * 0.5; e.vy = 0;
    }
    // combo break: 5 hits inside 60f -> shrug (8f white flash, invulnerable) then his fastest attack
    if (e.kvHits.length >= 5 && !scripted && e.state !== 'fall' && st !== 'kvburst' && st !== 'kvrush') {
      e.kvHits = [];
      startCustom(e, 'kvshrug', null);
      e.flash = 8;
    }
  }

  // ---------- defeat and THE FIRST BLUE ----------
  function onDeath() {
    const e = this;
    e.kvNoKD = true;
    e.atk = null; e.kvSub = null;
    e.setState('kvdie');
    e.vx = e.vy = e.vz = 0; e.z = 0;
    e.kvLanes = false;
    e.dmgMul = 1;
    // 30f freeze, then 0.4x for 120f (started on the first frame after the freeze so the freeze isn't stretched)
    Game.slow = 0; Game.slowScale = 1; Game.slowAcc = 0;
    Game.hitstop = 30;
    e.flash = 0;
    Game.letterboxTarget = 14;
    // the needle snaps off
    e.kvNeedleGone = true;
    const gz = e.kvGauge ? -e.kvGauge.y : 44, gx = e.kvGauge ? e.kvGauge.x * e.facing : 8;
    FX.add({ kind: 'shard', x: e.x + gx, y: e.y, z: gz, vx: e.facing * 1.6, vz: 3.2, life: 80, color: C.needle, size: 5, rot: 0, spin: 0.45, g: 0.18, ground: e.y + 4 });
    FX.add({ kind: 'star', x: e.x + gx, y: e.y, z: gz, life: 10, size: 7, color: '#ffffff', g: 0 });
    Sound.sfx('kvSnap', e.x);
    Sound.fadeOut(1.6);
    // clear his hazards
    for (const x of Game.ents) if (x.kvOwned) x.remove = true;
    const p = Game.player;
    if (p) { p.inv = Math.max(p.inv, 900); p.blink = false; }
  }
  function dieUpdate(e) {
    e.vx = e.vy = 0; e.z = 0; e.vz = 0;
    if (e.state !== 'kvdie') { e.setState('kvdie'); e.t = 1; }
    const t = e.t;
    if (t === 1) Game.slowmo(120, 0.4);
    const boom = (dx, z) => {
      const bx = e.x + dx * e.facing;
      FX.explosion(bx, e.y + 1, z, 0.7);
      FX.shards(bx, e.y, z, 5, ['#8c6a3a', '#5e4424', '#7a8088', '#c9a86a']);
      FX.shake(5, 20);
      FX.flash('#ffffff', 3, 0.45);
      Sound.sfx('explode', bx);
    };
    if (t === 6) boom(8, 40);
    if (t === 36) boom(-10, 26);
    if (t === 66) boom(2, 50);
    if (t > 66 && t < 84 && t % 4 === 0) FX.smoke(e.x + rr(-12, 12), e.y, rr(20, 50), 1);
    if (t === 76) { Game.bossRef = null; FX.dust(e.x, e.y, 8, 1.2); Sound.sfx('thud', e.x); FX.shake(3, 10); }
    if (t === 86) {
      // the boiler ruptures; the crown valves pop off
      e.kvRupture = true; e.kvCrownGone = true; e.kvCool = 0;
      FX.flash('#ffffff', 6, 0.55);
      FX.shake(6, 26);
      Sound.sfx('kvRupture', e.x);
      for (let i = 0; i < 18; i++) FX.add({ kind: 'dust', x: e.x + rr(-6, 6), y: e.y, z: rr(24, 44), vx: rr(-2.5, 2.5), vz: rr(0.5, 2.5), life: rr(30, 60), size: rr(3, 6), color: C.steam, g: -0.01, grow: 0.15, alpha: 0.75, drag: 0.95 });
      for (let k = 0; k < 3; k++) FX.add({ kind: 'shard', x: e.x + (k - 1) * 6, y: e.y, z: 62, vx: (k - 1) * 1.4 + rr(-0.3, 0.3), vz: rr(2.5, 3.5), life: 140, color: C.crown, size: 5, rot: 0, spin: 0.3, g: 0.2, ground: e.y + 3 });
      FX.shards(e.x, e.y, 36, 8, ['#8c6a3a', '#5e4424', '#c9a86a']);
    }
    if (e.kvRupture) {
      e.kvCool = Math.min(1, e.kvCool + (e.kvQuenched ? 0.05 : 0.0025));
      if (t % 3 === 0 && e.kvCool < 0.95) FX.steam(e.x + e.facing * rr(0, 6), e.y, rr(26, 40), 1);
      if (t % 7 === 0 && e.kvCool < 0.6) FX.embers(e.x, e.y, 34, 1);
    }
    if (t === 92 && !Game.ents.some(x => x.kvFin)) Game.add(new Finale(e));
  }

  // ---------- world entities ----------
  // Floodgate wheel turning (r20, 6 spokes, #5A626C) on the back wall at world x 3264 / screen y 118.
  class Gate extends Ent {
    constructor(x) { super(x, 0); this.kvGate = true; this.team = 'fx'; this.shadowR = 0; this.angle = 0; this.spin = 0; this.drive = 0; this.shown = false; }
    sortY() { return -1e4; }
    update() {
      this.t++;
      if (this.drive > 0) this.drive--; else this.spin *= 0.95;
      this.angle += this.spin;
      if (Math.abs(this.spin) > 0.004) this.shown = true;
    }
    draw(ctx, camX) {
      if (!this.shown) return;
      Px.use(ctx);
      const cx = Math.round(this.x - camX), cy = GATE_Y;
      Px.disc(cx, cy, 21, '#1a1e24');
      Px.disc(cx, cy, 18, '#2c3038');
      const fast = Math.abs(this.spin) > 0.12;
      if (fast) { ctx.globalAlpha = 0.35; Px.disc(cx, cy, 17, '#5a626c'); ctx.globalAlpha = 1; }
      for (let i = 0; i < 6; i++) {
        const a = this.angle + i * TAU / 6;
        Px.line(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, 3, '#5a626c');
        Px.line(cx + Math.cos(a - 0.08) * 4, cy + Math.sin(a - 0.08) * 4, cx + Math.cos(a - 0.08) * 17, cy + Math.sin(a - 0.08) * 17, 1, '#7a828c');
      }
      arc(cx, cy, 19, 0, TAU, 3, '#5a626c');
      arc(cx, cy, 20, -2.6, -1.0, 1, '#8a929c');
      arc(cx, cy, 18, 0.6, 2.4, 1, '#3a4048');
      for (let i = 0; i < 6; i++) { const a = this.angle + i * TAU / 6 + TAU / 12; Px.rect(cx + Math.cos(a) * 19 - 1, cy + Math.sin(a) * 19 - 1, 3, 3, '#6a727c'); }
      Px.disc(cx, cy, 5, '#3a4048');
      Px.disc(cx, cy, 3.5, '#d4af37');
      Px.dot(cx - 1, cy - 1, '#f2e08a');
    }
  }

  // Crown Wheel: a boomerang valve wheel that rolls along the floor (jump it), 4 px/f out to 160 px, then home.
  class Boomer extends Ent {
    constructor(owner, x, y, ty, dir) {
      super(x, y);
      Object.assign(this, { o: owner, dir, ty, x0: x, out: true, team: 'proj', kvOwned: true, shadowR: 4, w: 5, h: 10, ang: 0 });
      this.z = 5;
      this.hits = new Set();
    }
    update() {
      this.t++;
      const o = this.o;
      this.ang += 0.55 * (this.out ? this.dir : -this.dir);
      if (!o || o.remove || o.dying) { this.remove = true; FX.add({ kind: 'shard', x: this.x, y: this.y, z: 6, vx: rr(-1, 1), vz: 3, life: 50, color: C.crown, size: 5, rot: 0, spin: 0.3, g: 0.24, ground: this.y }); return; }
      if (this.out) {
        this.vx = 4 * this.dir;
        this.y = approach(this.y, this.ty, 1.2);
        const edge = this.x < Game.cam.x + 10 || this.x > Game.cam.x + W - 10;
        if (Math.abs(this.x - this.x0) >= 160 || edge) { this.out = false; Sound.sfx('kvSpin', this.x); FX.add({ kind: 'spark', x: this.x, y: this.y, z: 4, vx: -this.dir * 2, vz: 1.5, life: 10, g: 0.1, drag: 0.85 }); }
      } else {
        const tx = o.x + o.facing * 10, ty = o.y;
        const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
        this.vx = dx / d * 4;
        this.y += dy / d * Math.min(4, d) * 0.6;
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) { this.remove = true; o.kvWheelOut = false; Sound.sfx('kvClank', o.x); return; }
        if (this.t > 260) { this.remove = true; o.kvWheelOut = false; return; }
      }
      this.x += this.vx;
      this.z = 5 + Math.abs(Math.sin(this.t * 0.35)) * 1.5;
      if (this.t % 3 === 0) FX.add({ kind: 'spark', x: this.x - sign(this.vx) * 4, y: this.y, z: 1, vx: -sign(this.vx) * rr(0.5, 1.5), vz: rr(0.5, 1.5), life: 8, g: 0.1, drag: 0.85 });
      if (this.t % 16 === 0) Sound.sfx('kvSpin', this.x);
      const p = Game.player;
      const key = this.out ? 'o' : 'b';
      if (p && p.vulnerable && !this.hits.has(key) && Math.abs(p.y - this.y) <= 8 && Math.abs(p.x - this.x) < p.w + 5 && p.z < 10) {
        this.hits.add(key);
        p.takeHit(this, { dmg: 10, tier: 2, kb: 1.8, stun: 20, zr: [0, 12], sfx: 'hitMetal' }, sign(this.vx) || 1);
      }
    }
    draw(ctx, camX) {
      Px.use(ctx);
      const sx = this.x - camX, sy = this.y - this.z;
      const back = -sign(this.vx) || -1;
      ctx.globalAlpha = 0.35;
      Px.rect(sx + back * 6 - (back < 0 ? 8 : 0), sy - 1, 8, 1, '#fff2c0');
      Px.rect(sx + back * 7 - (back < 0 ? 6 : 0), sy + 2, 6, 1, '#fff2c0');
      ctx.globalAlpha = 1;
      Px.disc(sx, sy, 6, '#2a1e10');
      valve(sx, sy, 5, this.ang, 4, C.crown, false);
    }
  }

  // Steam Jet cone: a wedge of #E8ECEF circles (alpha 0.6) from +10 to +80, drawn in front of the hero's depth.
  class Cone extends Ent {
    constructor(o) { super(o.x, o.y); Object.assign(this, { o, team: 'fx', shadowR: 0, kvOwned: true, fade: 6, grow: 0 }); }
    live() { const o = this.o; return !o.dying && o.state === 'attack' && o.atk && o.atk.key === 'steam' && o.atkPhase() === 'active'; }
    sortY() { return this.o.y + 12; }
    update() {
      this.t++;
      this.x = this.o.x; this.y = this.o.y;
      if (this.live()) this.grow = Math.min(1, this.grow + 0.2);
      else if (--this.fade <= 0) this.remove = true;
    }
    draw(ctx, camX) {
      const o = this.o, f = o.facing;
      const a = this.live() ? 1 : this.fade / 6;
      Px.use(ctx);
      ctx.globalAlpha = 0.6 * a;
      const reach = 10 + 70 * this.grow;
      for (let i = 0; i < 10; i++) {
        const d = 10 + i * 7.8;
        if (d > reach) break;
        const k = (d - 10) / 70;
        const r = lerp(3, 12, k) + Math.sin(Game.frame * 0.7 + i * 1.3) * 1.2;
        const z = lerp(36, 24, k) + Math.sin(Game.frame * 0.5 + i) * 1.5;
        Px.oval(o.x - camX + f * d, o.y - z, r, r * 0.85, C.steam);
      }
      ctx.globalAlpha = 0.85 * a;
      for (let i = 0; i < 5; i++) {
        const d = 14 + ((Game.frame * 5 + i * 17) % 64);
        if (d > reach) continue;
        Px.rect(o.x - camX + f * d - 2, o.y - lerp(36, 24, (d - 10) / 70) - 2 + (i % 3) * 2, 4, 1, '#ffffff');
      }
      ctx.globalAlpha = 1;
    }
  }

  // Pressure Lane water jet: 40f of stripes, then a #2E7FD8 jet blasts across the screen in that lane for 40f.
  class Jet extends Ent {
    constructor(i) {
      const L = lanes()[i];
      super(Game.cam.x + W / 2, L.y0);
      Object.assign(this, { L, lane: i, team: 'hazard', shadowR: 0, kvOwned: true, kvJet: true, hit: false });
      this.front = Game.add(new JetFront(this));
      Sound.sfx('kvGurgle', Game.cam.x + W - 10);
    }
    sortY() { return this.L.y0 + 0.5; }
    get blastT() { return this.t - JET_TELE; }
    head() { return W + 12 - this.blastT * 26; }                 // screen x of the jet's leading edge
    tail() { const k = this.blastT - (JET_BLAST - 10); return k <= 0 ? W + 20 : W + 20 - k * 30; }
    wet(sx) { const b = this.blastT; return b >= 0 && b < JET_BLAST + 12 && sx >= this.head() - 3 && sx <= this.tail(); }
    update() {
      this.t++;
      this.hs = 0;
      const b = this.blastT;
      if (b === 0) { Sound.sfx('kvJet', Game.cam.x + W - 30); Sound.sfx('water', Game.cam.x + W - 30); FX.shake(2, 10); }
      if (b >= 0 && b < JET_BLAST + 12) {
        const hx = this.head();
        if (hx > -10 && this.t % 2 === 0) {
          for (let k = 0; k < 2; k++) FX.add({ kind: 'drop', x: Game.cam.x + hx + rr(-2, 4), y: rr(this.L.y0, this.L.y1), z: rr(4, 14), vx: rr(-3, -1), vz: rr(1, 3), life: 20, color: k ? C.foam : C.spray, g: 0.25 });
        }
        const p = Game.player;
        if (p && !Game.playerGone && inLane(this.L, this.lane, p.y) && p.z < 18 && this.wet(p.x - Game.cam.x) && b < JET_BLAST) {
          p.x -= 3;
          if (this.t % 3 === 0) FX.add({ kind: 'drop', x: p.x + rr(-6, 6), y: p.y, z: rr(4, 16), vx: rr(-2.5, 0), vz: rr(1, 3), life: 18, color: C.spray, g: 0.25 });
          if (!this.hit && p.vulnerable) {
            this.hit = true;
            p.takeHit(this, { dmg: 8, tier: 2, kb: 2.2, stun: 18, zr: [0, 16], sfx: 'hitMid' }, -1);
            this.hs = 0;
          }
        }
      }
      if (b >= JET_BLAST + 14) { this.remove = true; this.front.remove = true; }
    }
    drawMarker(ctx, camX) {
      if (this.t >= JET_TELE) return;
      const L = this.L, on = (this.t >> 2) % 3 !== 2;
      if (!on) return;
      Px.use(ctx);
      ctx.globalAlpha = 0.3;
      const h = L.y1 - L.y0, off = -((this.t * 2) % 14);
      for (let x = off - h; x < W + 14; x += 14) Px.poly([x, L.y1, x + 7, L.y1, x + 7 + h * 0.6, L.y0, x + h * 0.6, L.y0], C.spray);
      ctx.globalAlpha = 0.55;
      for (let k = 0; k < 3; k++) {
        const ax = W - 30 - k * 12 - ((this.t * 2) % 12), ay = (L.y0 + L.y1) / 2;
        Px.poly([ax, ay, ax + 5, ay - 4, ax + 5, ay + 4], C.foam);
      }
      ctx.globalAlpha = 1;
    }
    draw(ctx, camX) {
      const L = this.L, b = this.blastT;
      Px.use(ctx);
      // outlet pipe pushed out of the right wall
      const slide = clamp(this.t / 8, 0, 1) * clamp((JET_TELE + JET_BLAST + 14 - this.t) / 8, 0, 1);
      const ox = W + 8 - 18 * slide, oy = L.y0 + 2;
      Px.rect(ox, oy - 15, 22, 15, '#3a424e');
      Px.rect(ox, oy - 15, 22, 2, '#6a7480');
      Px.oval(ox, oy - 7.5, 3, 7.5, '#4a525e');
      Px.oval(ox, oy - 7.5, 2, 6, '#0a0c10');
      if (this.t < JET_TELE && this.t % 6 < 3) Px.rect(ox - 2, oy - 3, 1, 2, C.spray);
      if (b < 0 || b >= JET_BLAST + 12) return;
      const hx = Math.max(-4, this.head()), tx = this.tail();
      if (tx <= hx) return;
      const top = L.y0 - 10, bot = L.y1 - 2;
      const shrink = clamp((JET_BLAST + 12 - b) / 12, 0, 1);
      const t2 = lerp(bot - 4, top, shrink);
      ctx.globalAlpha = 0.92;
      Px.rect(hx, t2, tx - hx, bot - t2, C.water);
      Px.rect(hx, t2 + (bot - t2) * 0.55, tx - hx, (bot - t2) * 0.45, C.deep);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 12; i++) {
        const sx = hx + ((i * 37 - Game.frame * 9) % (W + 40) + W + 40) % (W + 40);
        if (sx > tx - 6) continue;
        Px.rect(sx, t2 + 2 + (i * 5) % Math.max(2, bot - t2 - 4), 8 + (i % 3) * 4, 1, C.spray);
      }
      Px.rect(hx, t2, tx - hx, 2, C.foam);
      for (let x = hx; x < tx; x += 5) Px.rect(x, t2 - 1 - ((x + Game.frame) % 3 === 0 ? 1 : 0), 2, 1, C.foam);
      if (this.head() > -10) {
        for (let k = 0; k < 4; k++) Px.disc(hx + 2 + Math.sin(Game.frame + k) * 1.5, lerp(t2, bot, k / 3), 3.5 - (k % 2), C.foam);
      }
    }
  }
  class JetFront extends Ent {
    constructor(j) { super(j.x, j.L.y1); Object.assign(this, { j, team: 'fx', shadowR: 0, kvOwned: true }); }
    sortY() { return this.j.L.y1 - 0.5; }
    update() { if (this.j.remove) this.remove = true; }
    draw(ctx, camX) {
      const j = this.j, b = j.blastT;
      if (b < 0 || b >= JET_BLAST + 12) return;
      const hx = Math.max(-4, j.head()), tx = j.tail();
      if (tx <= hx) return;
      const shrink = clamp((JET_BLAST + 12 - b) / 12, 0, 1);
      const bot = j.L.y1 - 2, h = 9 * shrink;
      Px.use(ctx);
      ctx.globalAlpha = 0.8;
      Px.rect(hx, bot - h, tx - hx, h, C.water);
      ctx.globalAlpha = 1;
      Px.rect(hx, bot - h, tx - hx, 1, C.spray);
      // splash around the hero's legs while she stands in it
      const p = Game.player;
      if (p && inLane(j.L, j.lane, p.y) && p.z < 18 && j.wet(p.x - camX)) {
        const sx = p.x - camX;
        ctx.globalAlpha = 0.85;
        Px.oval(sx, p.y - 4, 10, 5, C.water);
        Px.oval(sx + 2, p.y - 7, 8, 2, C.foam);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Crane hook that lowers a can of beans at screen x 192 when phase 2 begins.
  class Hook extends Ent {
    constructor(x) { super(x, (Game.bounds.yMin + Game.bounds.yMax) / 2 + 4); Object.assign(this, { team: 'fx', shadowR: 0, held: true }); this.z = 220; }
    update() {
      this.t++;
      if (this.t <= 50) this.z = lerp(220, 30, easeOut(this.t / 50));
      if (this.t === 50) Sound.sfx('kvClank', this.x);
      if (this.t === 62) {
        this.held = false;
        const it = Game.add(new Item('beans', this.x, this.y, 0));
        it.z = this.z - 6; it.vz = 0.5; it.vx = 0;
        Sound.sfx('click', this.x);
      }
      if (this.t > 62) this.z += (this.t - 62) * 0.25;
      if (this.t > 140) this.remove = true;
    }
    draw(ctx, camX) {
      Px.use(ctx);
      const sx = Math.round(this.x - camX), sy = Math.round(this.y - this.z);
      const sway = Math.round(Math.sin(this.t * 0.15) * (this.t < 70 ? 1 : 0));
      Px.rect(sx + sway, -2, 1, sy - 12, '#1a1a1e');
      Px.rect(sx + sway - 4, sy - 16, 9, 6, '#d4a82a');
      Px.rect(sx + sway - 4, sy - 16, 3, 6, '#1a1a1a'); Px.rect(sx + sway + 2, sy - 16, 2, 6, '#1a1a1a');
      Px.rect(sx + sway - 1, sy - 10, 3, 3, '#5e666e');
      Px.poly([sx + sway - 1, sy - 7, sx + sway + 2, sy - 7, sx + sway + 2, sy - 2, sx + sway - 3, sy + 1, sx + sway - 4, sy - 1, sx + sway - 1, sy - 2], '#8a929c');
      if (this.held) { Px.use(ctx); drawItemIcon('beans', sx + sway, sy + 9, this.t); }
      if (this.held && this.z < 120) groundShadow(ctx, sx, this.y, 4, 0.25);
    }
  }

  // Teo: a small backlit silhouette who runs in and spins the floodgate wheel.
  class Teo extends Ent {
    constructor(x, y, tx) { super(x, y); Object.assign(this, { tx, team: 'fx', shadowR: 5, facing: 1, spin: false }); }
    update() {
      this.t++;
      if (!this.spin) {
        const d = this.tx - this.x;
        this.facing = sign(d) || this.facing;
        this.x += sign(d) * Math.min(2.6, Math.abs(d));
        if (this.t % 9 === 0) FX.add({ kind: 'drop', x: this.x, y: this.y, z: 1, vx: -this.facing * rr(0, 1), vz: rr(0.8, 1.6), life: 12, color: C.spray, g: 0.2 });
        if (Math.abs(this.tx - this.x) < 0.5) { this.spin = true; this.t = 0; this.facing = sign(gateX() - this.x) || 1; }
      } else {
        const g = getGate();
        g.drive = 4; g.spin = approach(g.spin, 0.22 * this.facing, 0.008);
        if (this.t % 14 === 0) Sound.sfx('kvClank', g.x);
      }
    }
    draw(ctx, camX) {
      const t = this.t;
      let p;
      if (!this.spin) p = Poses.run(t * 1.1);
      else {
        const s = Math.sin(t * 0.32);
        p = pose({ hy: -20, rot: 0.15, head: -0.1, fThigh: 0.35, fKnee: -0.3, bThigh: -0.4, bKnee: -0.1, fUpper: 1.7 + s * 0.6, fElbow: 0.5 - s * 0.3, bUpper: 1.7 - s * 0.6, bElbow: 0.5 + s * 0.3 });
      }
      Sprite.begin(64, 56, 30, 50);
      const dark = '#161a22';
      drawHumanoid(p, {
        s: 0.62, skin: dark, top: '#1c2029', sleeve: dark, arm: dark, pants: '#12151c', boots: '#0c0e12', limbW: 5, hipW: 8, shW: 10,
        head(Hd) {
          Px.disc(Hd.x, Hd.y, 3.6, dark);
          Px.poly([Hd.x - 3, Hd.y - 2, Hd.x - 1, Hd.y - 5, Hd.x + 3, Hd.y - 4, Hd.x + 1, Hd.y - 2], '#0c0e12');
          const fl = Math.sin(Game.frame * 0.35) * 1.2;
          Px.line(Hd.x - 2, Hd.y + 3, Hd.x - 7, Hd.y + 2 + fl, 2, '#b8322a');
          Px.line(Hd.x - 6, Hd.y + 2 + fl, Hd.x - 9, Hd.y + 4 + fl, 1, '#8a2a20');
          Px.dot(Hd.x + 2, Hd.y - 1, '#8ec8ff');
        },
      });
      Sprite.end(ctx, this.x - camX, this.y, this.facing, { outline: '#3e78b0' });
    }
  }

  // THE FIRST BLUE: crack up the dam wall, a wall of water from the right, rain, victory, Teo at the wheel.
  class FinaleBack extends Ent {
    constructor(fin) { super(fin.x, -1); Object.assign(this, { fin, team: 'fx', shadowR: 0 }); }
    sortY() { return -9999; }
    update() { if (this.fin.remove) this.remove = true; }
    draw(ctx, camX) {
      const f = this.fin, pts = f.crack, n = pts.length / 2 - 1;
      const k = clamp(f.f / 40, 0, 1) * n;
      Px.use(ctx);
      const ox = f.camX0 - camX;
      for (let i = 0; i < Math.ceil(k); i++) {
        const u = Math.min(1, k - i);
        const x0 = pts[i * 2] + ox, y0 = pts[i * 2 + 1], x1 = lerp(x0, pts[i * 2 + 2] + ox, u), y1 = lerp(y0, pts[i * 2 + 3], u);
        const wide = f.f > 40 ? 3 : 2;
        Px.line(x0, y0, x1, y1, wide, '#0a0c10');
        if (f.f > 20) Px.line(x0 + 1, y0, x1 + 1, y1, 1, f.f > 40 && (Game.frame >> 2) % 2 ? '#e8f4ff' : C.spray);
      }
      for (const b of f.branches) {
        if (b.at > k) continue;
        Px.line(b.x + ox, b.y, b.x + ox + b.dx * Math.min(1, (k - b.at) * 2), b.y + b.dy * Math.min(1, (k - b.at) * 2), 1, '#0a0c10');
      }
    }
  }
  class Finale extends Ent {
    constructor(king) {
      super(Game.cam.x + W / 2, 0);
      Object.assign(this, { king, team: 'fx', shadowR: 0, kvFin: true, f: 0, camX0: Game.cam.x, washed: new Set(), rain: 0, teo: null });
      // crack polyline up the dam wall (screen coords at creation)
      const pts = []; const br = [];
      let x = 316, y = Game.bounds.yMin - 1;
      pts.push(x, y);
      for (let i = 0; i < 11; i++) {
        x += rr(-6, 9); y -= rr(8, 12);
        pts.push(x, Math.max(24, y));
        if (i % 3 === 1) br.push({ x, y, dx: rr(-12, 12), dy: rr(-8, 4), at: i + 1 });
      }
      this.crack = pts; this.branches = br;
      this.back = Game.add(new FinaleBack(this));
      Sound.sfx('kvCrack', Game.cam.x + 316);
      Sound.sfx('rumble', Game.cam.x + 316);
      // stun any surviving adds; the hero is safe from here on
      for (const e of Game.foes()) if (e !== king && !e.dying && isFree(e)) { e.atk = null; e.setState('dizzy'); e.dizzyT = 999; }
    }
    sortY() { return 1e6; }
    frontX() { return W + 30 - (this.f - 36) * 6; }            // screen x of the wall of water
    update() {
      const f = ++this.f, camX = Game.cam.x, p = Game.player;
      if (f < 40 && f % 10 === 0) FX.shake(2, 10);
      // water spurts from the crack as it climbs
      if (f > 8 && f < 70 && f % 2 === 0) {
        const n = this.crack.length / 2, i = Math.min(n - 1, Math.floor(clamp(f / 40, 0, 1) * (n - 1)));
        const sx = this.crack[i * 2] + this.camX0 - camX, sy = this.crack[i * 2 + 1];
        FX.add({ kind: 'drop', x: camX + sx, y: Game.bounds.yMin, z: Game.bounds.yMin - sy, vx: rr(-2.5, -0.5), vz: rr(0.5, 2), life: 40, color: C.spray, g: 0.2 });
      }
      if (f === 36) {
        Sound.playSong('ending');
        Sound.sfx('kvFlood', camX + W);
        FX.shake(4, 40);
      }
      if (f >= 30) this.rain = Math.min(110, this.rain + 2);
      // the wall of water
      if (f >= 36) {
        const fx = this.frontX(), wx = camX + fx;
        if (fx > -60 && f % 2 === 0) {
          for (let k = 0; k < 3; k++) FX.add({ kind: k ? 'drop' : 'dust', x: wx + rr(0, 14), y: rr(Game.bounds.yMin, Game.bounds.yMax), z: rr(30, 90), vx: rr(-4, -1.5), vz: rr(0.5, 2.5), life: k ? 30 : 24, size: 3, color: k === 2 ? C.foam : C.spray, g: k ? 0.2 : -0.01, grow: 0.15, alpha: 0.6 });
        }
        for (const e of Game.foes()) {
          if (e === this.king || e.remove) continue;
          if (e.x >= wx - 6 && !this.washed.has(e.id)) { this.washed.add(e.id); e.atk = null; e.setState('fall'); e.vz = 0; e.z = 8; }
          if (this.washed.has(e.id)) {
            e.x = Math.min(e.x, wx - 4); e.z = 6 + Math.sin(f * 0.4 + e.id) * 3; e.vz = 0; e.vx = -6; e.t = 4;
            if (e.x <= camX + 10 || fx < -40) { e.remove = true; FX.splat(e.x, e.y, 10, C.spray, 6, -1, false); }
          }
        }
        const k = this.king;
        if (k && !k.kvQuenched && wx <= k.x + 10) {
          k.kvQuenched = true;
          Sound.sfx('steam', k.x); Sound.sfx('kvRupture', k.x);
          for (let i = 0; i < 26; i++) FX.add({ kind: 'dust', x: k.x + rr(-12, 12), y: k.y, z: rr(10, 50), vx: rr(-1.5, 1.5), vz: rr(0.6, 2.2), life: rr(40, 80), size: rr(4, 8), color: C.steam, g: -0.01, grow: 0.18, alpha: 0.7, drag: 0.97 });
        }
        if (p && !this.splashedHero && wx <= p.x + 8) {
          this.splashedHero = true;
          for (let i = 0; i < 16; i++) FX.add({ kind: 'drop', x: p.x + rr(-8, 8), y: p.y, z: rr(4, 30), vx: rr(-3, 3), vz: rr(2, 4.5), life: 30, color: i % 3 ? C.spray : C.foam, g: 0.22 });
        }
        if (p && fx < p.x - camX + 12 && fx > p.x - camX - 30 && f % 2 === 0) FX.add({ kind: 'drop', x: p.x + rr(-6, 6), y: p.y + 1, z: rr(2, 16), vx: rr(-3, 1), vz: rr(1.5, 3.5), life: 22, color: C.foam, g: 0.24 });
      }
      // the hero raises the gauntlet once she's free to
      if (p && f >= 30 && p.state !== 'victory' && !['down', 'fall', 'getup', 'hurt', 'grabbed'].includes(p.state) && !(p.state === 'attack' && p.atkPhase() !== 'done' && p.t < 30)) {
        p.atk = null; p.setState('victory'); p.vx = p.vy = 0;
      }
      if (p && p.state === 'victory') { p.inv = Math.max(p.inv, 60); p.blink = false; }
      // rain splashes on the deck
      if (this.rain > 40 && f % 3 === 0) FX.add({ kind: 'dust', x: camX + rr(0, W), y: rr(Game.bounds.yMin, Game.bounds.yMax), z: 0, life: 10, size: 1, color: C.spray, g: 0, grow: 0.25, alpha: 0.5 });
      if (f === 104) {
        const kx = this.king ? this.king.x : -999, gx = gateX();
        const side = Math.abs(kx - (gx + 20)) > Math.abs(kx - (gx - 20)) ? 1 : -1;
        this.teo = Game.add(new Teo(side < 0 ? camX - 14 : camX + W + 14, Game.bounds.yMin + 1, gx + side * 20));
      }
      if (f === 206) { Game.finaleDone = true; Game.letterboxTarget = 0; }
    }
    draw(ctx, camX) {
      const f = this.f;
      Px.use(ctx);
      // night washes toward blue
      const tint = clamp((f - 36) / 90, 0, 1) * 0.09;
      if (tint > 0) { ctx.globalAlpha = tint; Px.rect(0, 0, W, H, C.water); ctx.globalAlpha = 1; }
      if (f >= 36) {
        this.drawFlood(ctx, camX);
        // Juno stands firm: drawn in front of the wall of water, white water breaking around her legs
        const p = Game.player, fr = this.frontX();
        if (p && !Game.playerGone && fr < W && p.y < 190) {
          const sx = p.x - camX;
          p.draw(ctx, camX);
          const near = clamp(1 - (sx - fr) / 140, 0, 1) * clamp(1 - (fr - sx) / 30, 0, 1);
          if (fr < sx + 14 && near > 0) {
            Px.use(ctx);
            const wob = Math.sin(this.f * 0.9) * 1.5;
            ctx.globalAlpha = 0.9;
            Px.oval(sx + 2, p.y - 3, 11 + wob, 4, C.water);
            Px.oval(sx + 3, p.y - 5, 9, 2.5, C.foam);
            Px.disc(sx + 9 + wob, p.y - 9 - near * 6, 3, '#ffffff');
            Px.disc(sx - 6, p.y - 7, 2.5, C.foam);
            ctx.globalAlpha = 1;
          }
        }
      }
      // rain: 1x4 lines
      if (this.rain > 0) {
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < this.rain; i++) {
          const x = ((i * 73.7 + i * i * 0.31 - f * 1.4) % (W + 20) + W + 20) % (W + 20) - 10;
          const y = ((i * 41.3 + f * (5.5 + (i % 4) * 0.6)) % (H + 10)) - 6;
          Px.rect(x, y, 1, 4, C.spray);
        }
        ctx.globalAlpha = 1;
      }
    }
    drawFlood(ctx, camX) {
      const f = this.f - 36, front = this.frontX(), T = this.f;
      const level = lerp(H + 4, 190, easeOut(clamp(f / 70, 0, 1)));
      const crest = 60 + Math.min(f, 80) * 0.3;                // a tall wall that slowly spends itself
      const sm = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
      const top = [], step = 2, x0 = Math.max(-8, Math.floor(front));
      for (let sx = x0; sx <= W + 9; sx += step) {
        const d = sx - front;
        let y;
        if (d < 6) y = lerp(H + 2, crest + 12, d / 6);
        else if (d < 50) y = crest + 3 + Math.sin(d * 0.33 + T * 0.45) * 3 + Math.sin(d * 0.9 - T * 0.7) * 1.2;
        else y = lerp(crest + 3, level, sm((d - 50) / 170)) + Math.sin(sx * 0.09 + T * 0.35) * 2 * sm((d - 50) / 60);
        top.push(sx, y);
      }
      if (top.length < 4) return;
      const poly = top.concat([W + 12, H + 4, top[0], H + 4]);
      ctx.globalAlpha = 0.92;
      Px.poly(poly, C.water);
      const deep = [];
      for (let i = 0; i < top.length; i += 2) deep.push(top[i], Math.max(top[i + 1] + 22, level + 8));
      ctx.globalAlpha = 0.7;
      Px.poly(deep.concat([W + 12, H + 4, top[0], H + 4]), C.deep);
      // sunlit skin just under the surface
      ctx.globalAlpha = 0.35;
      for (let i = 0; i + 3 < top.length; i += 2) Px.line(top[i], top[i + 1] + 4, top[i + 2], top[i + 3] + 4, 3, C.spray);
      ctx.globalAlpha = 1;
      // flow streaks running left (faster near the wall)
      for (let i = 0; i < 34; i++) {
        const sp = 6 + (i % 4) * 2;
        const sx = ((i * 53 - T * sp) % (W + 80) + W + 80) % (W + 80) - 30;
        if (sx < front + 8) continue;
        const ti = Math.min(top.length / 2 - 1, Math.max(0, Math.round((sx - x0) / step)));
        const ty = top[ti * 2 + 1];
        const room = Math.max(4, H - ty - 6);
        Px.rect(sx, ty + 6 + ((i * 7) % room), 5 + (i % 5) * 3, 1, i % 3 ? C.spray : C.foam);
      }
      // foam along the surface, thicker on the crest
      for (let i = 0; i + 3 < top.length; i += 2) {
        const d = top[i] - front;
        Px.line(top[i], top[i + 1], top[i + 2], top[i + 3], d < 60 ? 3 : 2, C.foam);
      }
      for (let i = 0; i < top.length; i += 2) {
        const d = top[i] - front;
        if (d > 6 && d < 60 && (i / 2 + (T >> 1)) % 4 === 0) Px.disc(top[i], top[i + 1] + 1, 2.5, '#ffffff');
        else if ((i / 2 + T) % 7 === 0) Px.rect(top[i], top[i + 1] - 2, 2, 1, C.foam);
      }
      if (front < -40) return;
      // the curling lip, overhanging the face
      const lx = front, ly = crest;
      Px.poly([lx + 22, ly + 3, lx + 12, ly - 7, lx, ly - 6, lx - 11, ly + 1, lx - 13, ly + 8, lx - 6, ly + 6, lx + 2, ly + 12, lx + 6, ly + 14], C.water);
      Px.poly([lx - 6, ly + 6, lx + 2, ly + 12, lx + 6, ly + 18, lx - 2, ly + 14], C.deep);
      Px.line(lx + 22, ly + 3, lx + 12, ly - 7, 3, C.foam);
      Px.line(lx + 12, ly - 7, lx, ly - 6, 3, '#ffffff');
      Px.line(lx, ly - 6, lx - 11, ly + 1, 2, C.foam);
      Px.line(lx - 11, ly + 1, lx - 13, ly + 8, 2, C.foam);
      for (let k = 0; k < 4; k++) Px.dot(lx - 14 + Math.sin(T * 0.6 + k * 2) * 2, ly + 11 + k * 3, C.foam);
      // churning white water at the foot of the wall and streaks on its face
      for (let k = 0; k < 9; k++) {
        const yy = H - 2 - k * 5, wob = Math.sin(T * 0.8 + k * 1.7) * 3;
        Px.disc(front + 3 + wob - (k < 3 ? 4 : 0), yy, k < 3 ? 5 - k : 2.5, k % 2 ? C.foam : '#ffffff');
      }
      for (let k = 0; k < 5; k++) Px.rect(front + 6 + k * 4, ly + 20 + ((k * 13 + T * 3) % 60), 1, 6, C.spray);
    }
  }

  // ---------- registration ----------
  ENEMY_TYPES.valve = {
    name: 'KING VALVE', family: 'metal', hp: 360, speed: 0.9, w: 16, h: 60, weight: 1, score: 50000, shadowR: 20,
    boss: true, barLayer: 120, launchable: false, noGrab: true, noToken: true, poise: 1e9, downTime: 50,
    coolMin: 60, coolMax: 60, sprite: SPR, deathSfx: 'hitCrit',
    attacks: {
      // Steam Jet: 5 dmg per 8f and a 1.5 px/f push inside the +10..+80 cone (depth 12) for 30f
      steam: { start: 24, active: 30, rec: 20, dmg: 5, tier: 1, reach: [10, 80], zr: [0, 40], depth: 12, custom: true, tell: 'glint', glint: [26, -40] },
      // Piston Punch: the fist shoots to +50 in 4f; 16 dmg KD
      punch: { start: 16, active: 6, rec: 26, dmg: 16, tier: 3, knock: true, kx: 3.0, kz: 3.2, reach: [8, 50], zr: [10, 52], depth: 9, custom: true, tell: 'heavy', glint: [10, -52] },
      // Crown Wheel: a boomerang thrown from the crown (projectile, 10 dmg T2)
      wheel: { start: 20, active: 4, rec: 24, dmg: 10, tier: 2, reach: [0, 0], zr: [0, 12], projectile: true, tell: 'glint', glint: [6, -82] },
    },
    init(opts) {
      const e = this;
      Object.assign(e, { kvPhase: 1, kvMeter: 0, kvHits: [], kvGhosts: [], kvAtkN: 0, kvLaneT: 0, kvLanes: false, kvBurstT: 0,
        kvSpin: Math.PI, kvHeat: 0, kvWheelOut: false, kvLastHp: e.hp, kvSeek: 0, kvPlan: null });
      e.draw = draw;
      e.drawMarker = drawMarker;
      const baseVuln = Object.getOwnPropertyDescriptor(Fighter.prototype, 'vulnerable').get;
      Object.defineProperty(e, 'vulnerable', {
        configurable: true,
        get() {
          if (this.state === 'kvshrug' || this.state === 'kvphase' || this.state === 'kvdie') return false;
          if (this.state === 'kvleap' && (this.kvSub === 'rise' || this.kvSub === 'track' || this.kvSub === 'lock') && this.z > 20) return false;
          return baseVuln.call(this);
        },
      });
      e.knockDown = function (dir, kx, kz) { if (this.kvNoKD) return; Fighter.prototype.knockDown.call(this, dir, kx, kz); };
      hookFinaleFlag();
      e.finishAttack = function () { Enemy.prototype.finishAttack.call(this); this.cool = coolFor(this); this.kvPlan = null; this.kvSeek = 0; };
      if (opts && opts.enter) {
        Game.bossCard('KING VALVE', 'THE THIRST KING');
        e.setState('kvintro');
        e.cool = 60;
      }
    },
    think, stateUpdate, onHurt, onDeath, drawBody, drawExtra,
    attackTick(a, ph) {
      const e = this, p = hero();
      if (a.key === 'steam') {
        if (e.t === 0) { Sound.sfx('kvHissRise', e.x); Sound.sfx('hiss', e.x); }
        if (ph === 'start' && e.t % 5 === 0 && e.kvNozzle) FX.add({ kind: 'drop', x: e.x + e.kvNozzle.x * e.facing, y: e.y, z: -e.kvNozzle.y, life: 14, color: C.steam, g: 0.2, vz: 0 });
        if (ph === 'active') {
          if (e.t === a.start) { Game.add(new Cone(e)); Sound.sfx('kvSteamJet', e.x); }
          if ((e.t - a.start) % 10 === 9) Sound.sfx('kvSteamJet', e.x);
          if (e.t % 2 === 0) FX.steam(e.x + e.facing * rr(30, 80), e.y, rr(20, 36), 1);
          if (p && e.overlaps(a, p) && p.state !== 'down') {
            p.x += e.facing * 1.5;
            if ((e.t - a.start) % 8 === 0 && p.vulnerable) p.takeHit(e, { dmg: 5, tier: 1, kb: 1.4, stun: 14, zr: [10, 36], sfx: 'hiss' }, e.facing);
          }
        }
      } else if (a.key === 'punch') {
        if (e.t === 0) { Sound.sfx('kvCharge', e.x); Sound.sfx('hiss', e.x); }
        if (ph === 'start' && e.t % 4 === 0) FX.steam(e.x - e.facing * 6, e.y, 40, 1);
        if (ph === 'active') {
          if (e.t === a.start) { Sound.sfx('kvPiston', e.x); FX.steam(e.x + e.facing * 20, e.y, 40, 3); FX.shake(1, 4); }
          a.reach = [8, lerp(26, 50, clamp((e.t - a.start + 1) / 4, 0, 1))];
          if (p) e.resolveAttack([p]);
        }
      } else if (a.key === 'wheel') {
        if (e.t === 0) Sound.sfx('kvSpin', e.x);
        if (e.t === a.start && !e.kvWheelOut) {
          e.kvWheelOut = true;
          Game.add(new Boomer(e, e.x + e.facing * 18, e.y, p ? p.y : e.y, e.facing));
          Sound.sfx('whooshBig', e.x);
        }
      }
    },
    eyes() { return [[4, -55, C.visor], [5, -55, C.visor]]; },
    kvDebug: {
      plan: (e, key) => startPlan(e, key),
      crank: e => startCrank(e),
      phase3: e => { e.kvCrankDone = true; e.kvPhase = 2; startPhase3(e); },
      lane: (e, i) => Game.add(new Jet(i)),
      finale: e => Game.add(new Finale(e)),
    },
  };

  // Game.finaleRunning pauses TIME; derive it from a live finale so a quit-to-title can never leave it stuck.
  // (Game is declared after this module, so the accessor is installed on the first boss spawn.)
  let manualFinale = false, finaleHooked = false;
  function hookFinaleFlag() {
    if (finaleHooked) return;
    finaleHooked = true;
    manualFinale = !!Game.finaleRunning;
    Object.defineProperty(Game, 'finaleRunning', {
      configurable: true, enumerable: true,
      get() { return manualFinale || (Game.state === 'play' && Game.ents.some(e => (e.kvFin && !Game.finaleDone) || (e.type === 'valve' && e.dying))); },
      set(v) { manualFinale = !!v; },
    });
  }
})();
