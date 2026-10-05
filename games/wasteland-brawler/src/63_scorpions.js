// Giant scorpions (DESIGN 5.3, 6.4, 12 #3 / #5): SANDSTINGER, ASHTAIL, SCORPLING and THE MATRIARCH,
// plus the Matriarch's part entities (egg sacs 'scor_sac', lodged stinger 'scor_sting') and the stage 1
// foreshadow ScorpionClaw. Every scorpion body is drawScorpion() (noTail) with a custom Bezier tail from
// this module on top, so a stinger can coil, stab over the head, bury itself and slam a far-away spot.
// Module prefix: scor_ (ScorpionClaw is the one unprefixed name, by contract).

const scor_RED = '#ff3b30';
const scor_SAND = ['#d9a35e', '#c08a4a', '#ecc890'];
const scor_VENOM = '#c04cff', scor_PUDDLE = '#8a2abf';
const scor_M_OFF = 40;   // Matriarch: entity x = front hurtbox centre, rig origin sits 40 px behind it
const scor_M_S = 3.2;

// ---------------------------------------------------------------- sound
// click-rattle: noise amplitude-modulated by a 25 Hz square (DESIGN 11.3)
SFX.scorRattle = (a, p) => { const d = a.out(p); for (let i = 0; i < 7; i++) a.noise(0.018, 0.24, 3200, 1.6, 'bandpass', i * 0.04, d); };
SFX.scorSnip = (a, p) => { const d = a.out(p); a.noise(0.03, 0.3, 4200, 2, 'bandpass', 0, d); a.tone(1500, 900, 0.035, 'square', 0.08, 0, d); };
SFX.scorWhineLong = (a, p) => { a.tone(400, 1200, 0.6, 'sine', 0.1, 0, a.out(p)); };
SFX.scorErupt = (a, p) => {
  const d = a.out(p, true);
  a.noise(0.45, 0.6, 700, 0.7, 'lowpass', 0, d, 120);
  a.tone(75, 34, 0.35, 'sine', 0.55, 0, d);
  for (let i = 0; i < 4; i++) a.noise(0.03, 0.2, 2600, 2, 'bandpass', 0.05 + i * 0.05, d);
};
SFX.scorShriek = (a, p) => {
  const d = a.out(p, true);
  a.tone(820, 1500, 0.55, 'sawtooth', 0.11, 0, d, 0.04);
  a.tone(1240, 1900, 0.5, 'square', 0.05, 0.02, d, 0.04);
  a.noise(0.65, 0.3, 3000, 1, 'bandpass', 0, d, 1100);
  a.tone(110, 55, 0.7, 'sawtooth', 0.25, 0, d, 0.05);
};
SFX.scorSpit = (a, p) => { const d = a.out(p); a.noise(0.12, 0.3, 1200, 1.5, 'bandpass', 0, d, 3200); a.tone(300, 720, 0.08, 'triangle', 0.16, 0, d); };
SFX.scorSquelch = (a, p) => { const d = a.out(p); a.tone(300, 120, 0.1, 'sine', 0.35, 0, d); a.tone(330, 140, 0.1, 'sine', 0.2, 0.02, d); a.noise(0.08, 0.25, 900, 1, 'lowpass', 0, d); };
SFX.scorSlam = (a, p) => { SFX.thud(a, p); SFX.hitShell(a, p); a.noise(0.3, 0.35, 500, 0.7, 'lowpass', 0.02, a.out(p), 120); };

// ---------------------------------------------------------------- drawing helpers
function scor_mix(a, b, k) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('');
}
function scor_bez(a, b, c, d, t) {
  const u = 1 - t, k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
  return { x: k0 * a.x + k1 * b.x + k2 * c.x + k3 * d.x, y: k0 * a.y + k1 * b.y + k2 * c.y + k3 * d.y };
}
// Tail poses in the units of a 40 px scorpion (s = 1): Bezier controls c1, c2, the stinger root `tip`
// and the stinger angle (0 = forward, PI/2 = straight down). The tail root is (-18, -9).
const scor_TP = {
  rest:   { c1: [-29, -18], c2: [-27, -45], tip: [-8, -38], ang: 0.85 },
  droop:  { c1: [-29, -14], c2: [-40, -18], tip: [-43, -10], ang: 2.0 },
  coil:   { c1: [-33, -12], c2: [-38, -36], tip: [-19, -31], ang: 0.4 },
  thrust: { c1: [-26, -31], c2: [2, -44], tip: [30, -22], ang: 0.55 },
  // small scorpions' Tail Strike at full extension: the drawn stinger reaches the 46 px stab
  stab:   { c1: [-24, -32], c2: [8, -44], tip: [38, -19], ang: 0.6 },
  stuck:  { c1: [-24, -28], c2: [12, -38], tip: [33, -12], ang: 1.45 },
  spit:   { c1: [-28, -27], c2: [-9, -51], tip: [9, -43], ang: 0.1 },
  raise:  { c1: [-33, -24], c2: [-31, -53], tip: [-13, -47], ang: 1.25 },
  // Matriarch's raise: at k = 3.2 the full raise would tower ~150 px; the spec caps her tail at ~96.
  mraise: { c1: [-33, -20], c2: [-31, -33], tip: [-13, -29], ang: 1.25 },
  mspit:  { c1: [-28, -21], c2: [-9, -33], tip: [9, -30], ang: 0.1 },
  limp:   { c1: [-30, -5], c2: [-39, -3], tip: [-45, -6], ang: 2.5 },
  back:   { c1: [-27, -12], c2: [-38, -22], tip: [-33, -30], ang: -0.7 },
};
// Easy's extra telegraph frames (never shorter on hard) for location attacks that bypass Enemy.attack.
function scor_tel() { return Math.max(0, Game.diff.tele || 0); }
function scor_pl(a, b, k) {
  const L = (p, q) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
  return { c1: L(a.c1, b.c1), c2: L(a.c2, b.c2), tip: L(a.tip, b.tip), ang: lerp(a.ang, b.ang, k) };
}
function scor_pshift(p, dx, dy, da) {
  return { c1: [p.c1[0] + dx * 0.3, p.c1[1] + dy * 0.3], c2: [p.c2[0] + dx * 0.75, p.c2[1] + dy * 0.75], tip: [p.tip[0] + dx, p.tip[1] + dy], ang: p.ang + (da || 0) };
}
// Scale a unit pose into local pixels around the tail root.
function scor_pscale(p, s, len, base) {
  const f = q => ({ x: base.x + (q[0] * s - base.x) * len, y: base.y + (q[1] * s - base.y) * len });
  return { c1: f(p.c1), c2: f(p.c2), tip: f(p.tip), ang: p.ang };
}
// Hooked stinger: venom bulb at (x, y) and a curved spike along `ang`. Returns the spike end.
function scor_stinger(x, y, ang, L, s, col, tipCol, bulbR) {
  const cx = Math.cos(ang), cy = Math.sin(ang), nx = -cy, ny = cx;
  const br = bulbR || Math.max(1.6, 2.7 * s);
  const bx = x + cx * br * 0.5, by = y + cy * br * 0.5;
  Px.disc(bx, by, br, shade(col, -0.25));
  Px.disc(bx - cx * br * 0.15, by - br * 0.25, br * 0.8, col);
  const w = Math.max(1, 1.7 * s);
  const sx = bx + cx * br * 0.8, sy = by + cy * br * 0.8;
  const mx = sx + cx * L * 0.55 + nx * L * 0.12, my = sy + cy * L * 0.55 + ny * L * 0.12;
  const ex = sx + cx * L + nx * L * 0.42, ey = sy + cy * L + ny * L * 0.42;
  Px.poly([sx + nx * w, sy + ny * w, mx + nx * w * 0.45, my + ny * w * 0.45, ex, ey, mx - nx * w * 0.45, my - ny * w * 0.45, sx - nx * w, sy - ny * w], col);
  Px.line(lerp(mx, ex, 0.3), lerp(my, ey, 0.3), ex, ey, Math.max(1, Math.round(s * 0.8)), tipCol || '#3a2a10');
  Px.dot(bx - br * 0.4, by - br * 0.5, '#ffffff');
  return { x: ex, y: ey, bx, by };
}
// Segmented tail along a Bezier. o: { s, base, P (scaled pose), n, thick, shell, plate, hi, sting, stingTip,
// L, glowCol, glowA, quiver }. Returns { tip, end, pts }.
function scor_tail(o) {
  const s = o.s, n = o.n || 5, P = o.P, B = o.base;
  const C1 = P.c1, C2 = P.c2, T = P.tip;
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const p = scor_bez(B, C1, C2, T, i / n);
    if (o.quiver) { p.x += Math.sin(i * 2.1 + o.quiver) * 0.8 * (i / n); p.y += Math.cos(i * 1.7 + o.quiver) * 0.6 * (i / n); }
    p.r = lerp(3.3, 2.1, (i - 1) / (n - 1)) * s * (o.thick || 1);
    pts.push(p);
  }
  // barrel-shaped segments pinched at the joints: dark rim, lit band, highlight streak.
  // (A glow is a colour mix, not alpha: Px brushes overlap and would stack to opaque.)
  const gk = o.glowA > 0 ? clamp(o.glowA, 0, 1) : 0;
  const lit = gk ? scor_mix(o.shell, o.glowCol, gk) : o.shell, rim = gk ? scor_mix(o.plate, o.glowCol, gk * 0.5) : o.plate;
  const hi = gk ? scor_mix(o.hi, '#ffffff', gk * 0.5) : o.hi;
  let a = B;
  pts.forEach((p, i) => {
    const r = p.r, lx = -r * 0.2, ly = -r * 0.3, mx = (a.x + p.x) / 2, my = (a.y + p.y) / 2;
    const w0 = Math.max(2, Math.round(r * 1.25)), w1 = Math.max(2, Math.round(r * 2.1));
    Px.limb(a.x, a.y, mx, my, w0, w1, rim); Px.limb(mx, my, p.x, p.y, w1, w0, rim);
    const c = i % 2 ? lit : shade(lit, -0.08);
    const v0 = Math.max(1, Math.round(r * 0.6)), v1 = Math.max(1, Math.round(r * 1.35));
    Px.limb(lerp(a.x, p.x, 0.1) + lx, lerp(a.y, p.y, 0.1) + ly, mx + lx, my + ly, v0, v1, c);
    Px.limb(mx + lx, my + ly, lerp(a.x, p.x, 0.9) + lx, lerp(a.y, p.y, 0.9) + ly, v1, v0, c);
    if (r >= 2) Px.line(lerp(a.x, p.x, 0.25) + lx * 2.2, lerp(a.y, p.y, 0.25) + ly * 2.2, lerp(a.x, p.x, 0.7) + lx * 2.2, lerp(a.y, p.y, 0.7) + ly * 2.2, Math.max(1, Math.round(r * 0.25)), hi);
    a = p;
  });
  const last = pts[n - 1];
  const end = o.noSting ? { x: last.x, y: last.y } : scor_stinger(last.x, last.y, P.ang, o.L || 7 * s, s, o.sting, o.stingTip);
  return { tip: last, end, pts, ang: P.ang };
}
// Pincer (chela) at (hx, hy) pointing along `ang` (screen radians): a swollen palm and two curved,
// toothed fingers, drawn with polygons so it can rotate and scale freely (ScorpionClaw, Matriarch).
function scor_pincer(hx, hy, ang, k, open, c) {
  const cx = Math.cos(ang), cy = Math.sin(ang);
  const R = (x, y) => [hx + x * cx - y * cy, hy + x * cy + y * cx];
  const P = arr => arr.reduce((o, q) => o.concat(R(q[0], q[1])), []);
  const ell = (ex, ey, rx, ry, n = 14) => { const a = []; for (let i = 0; i < n; i++) { const t = i / n * TAU; a.push([ex + Math.cos(t) * rx, ey + Math.sin(t) * ry]); } return a; };
  const L = 6 * k, op = clamp(open, 0, 1);
  // movable finger (top) swings up by `open`, fixed finger (bottom) stays
  const fa = -op * 0.75, ca = Math.cos(fa), sa = Math.sin(fa);
  const F = (x, y) => [2.6 * k + x * ca - y * sa, -0.9 * k + x * sa + y * ca];
  const top = [F(0, -1.7 * k), F(L * 0.55, -2.0 * k), F(L * 1.0, -0.5 * k), F(L * 1.1, 0.8 * k), F(L * 0.7, 0.35 * k), F(0, 0.8 * k)];
  const bot = [[2.2 * k, 0.5 * k], [2.6 * k + L * 0.5, 0.65 * k], [2.6 * k + L * 0.95, -0.6 * k], [2.6 * k + L * 1.0, 0.9 * k], [2.6 * k + L * 0.5, 2.5 * k], [2.2 * k, 2.4 * k]];
  Px.poly(P(top), c.plate);
  Px.poly(P(top.map(([x, y], i) => [x, y + (i < 3 ? 0.5 : -0.3) * k * 0.6])), c.hi);
  Px.poly(P(bot), c.plate);
  Px.poly(P(bot.map(([x, y]) => [x - 0.3 * k, y + 0.3 * k * 0.6])), c.shell);
  // teeth on the inner edges
  for (let i = 1; i <= 3; i++) {
    const tt = F(L * 0.25 * i, 0.5 * k), tb = R(2.6 * k + L * 0.22 * i, 0.4 * k + 0.25 * k * (2 - i));
    const q = R(tt[0], tt[1]); Px.dot(q[0], q[1], c.plate); Px.dot(tb[0], tb[1], c.hi);
  }
  // swollen palm
  Px.poly(P(ell(0, 0.2 * k, 3.6 * k, 2.7 * k)), c.plate);
  Px.poly(P(ell(-0.2 * k, -0.15 * k, 3.1 * k, 2.1 * k)), c.shell);
  Px.poly(P(ell(-0.8 * k, -0.9 * k, 1.5 * k, 0.7 * k, 10)), c.hi);
}
// Thick two-segment arm with a lit top edge.
function scor_arm(x0, y0, x1, y1, w, c) {
  Px.line(x0, y0, x1, y1, Math.round(w), c.plate);
  Px.line(x0, y0 - w * 0.2, x1, y1 - w * 0.2, Math.max(1, Math.round(w * 0.6)), c.shell);
  Px.line(x0, y0 - w * 0.35, x1, y1 - w * 0.35, 1, c.hi);
}
// 1 px #FF3B30 rim around everything drawn so far into the current sprite (DESIGN 4.2 b).
function scor_rim(col) {
  const s = Sprite.cur;
  s.gb.globalCompositeOperation = 'copy';
  s.gb.drawImage(s.a, 0, 0);
  s.gb.globalCompositeOperation = 'source-in';
  s.gb.fillStyle = col || scor_RED;
  s.gb.fillRect(0, 0, s.w, s.h);
  s.gb.globalCompositeOperation = 'source-over';
  const g = s.ga;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-over';
  g.drawImage(s.b, -1, 0); g.drawImage(s.b, 1, 0); g.drawImage(s.b, 0, -1); g.drawImage(s.b, 0, 1);
  g.restore();
}
// Rim shows 4f on / 4f off during the last 10 wind-up frames of an attack flagged `rim`.
function scor_rimOn(e) {
  const a = e.state === 'attack' && e.atk;
  if (!a || !a.rim || e.atkPhase() !== 'start') return false;
  const k = e.t - (a.start - 10);
  return k >= 0 && (k >> 2) % 2 === 0;
}
// Clip the sprite to everything above local y = gy (things sinking into the sand).
function scor_clip(gy) {
  const g = Sprite.cur.ga;
  g.save();
  g.beginPath(); g.rect(-1000, -1000, 2000, 1000 + gy); g.clip();
}
// Body + custom tail. o: drawScorpion colours/params plus { pose, len, thick, L, flip, ox, oy, sting,
// stingTip, glowCol, glowA, quiver, extra(out, by, s), tailOver }.
function scor_body(o) {
  const g = Sprite.cur.ga, s = o.s;
  const by = -(8 - (o.bodyDip || 0)) * s;
  g.save();
  g.translate(Math.round(o.ox || 0), Math.round(o.oy || 0));
  const flipY = Math.round(2 * by + 3 * s);
  if (o.flip) { g.save(); g.translate(0, flipY); g.scale(1, -1); }
  if (o.before) o.before(by, s);
  const out = drawScorpion({ s, shell: o.shell, plate: o.plate, hi: o.hi, belly: o.belly, leg: o.leg, eye: o.eye,
    legPhase: o.legPhase, clawOpen: o.clawOpen, clawRaise: o.clawRaise, bodyDip: o.bodyDip, noTail: true });
  if (o.extra) o.extra(out, by, s);
  if (o.flip) {
    g.restore();
    // legs kicking in the air (the rig's own legs stay short when it is upside down)
    const top = flipY - by - 4 * s, lc = o.leg || shade(o.shell, -0.4);
    [7, 2, -3, -8].forEach((lx, i) => {
      for (const far of [1, 0]) {
        const ph = (o.legPhase || 0) + i * 1.7 + far * 2.2, sw = Math.sin(ph);
        const hx = lx * s + far * s, kx = hx + (1.5 - i) * 2.5 * s + sw * 2 * s, ky = top - 5 * s - Math.abs(sw) * s;
        const fx = kx + (1.5 - i) * 2 * s + Math.cos(ph) * 2.5 * s, fy = ky - 3 * s + Math.cos(ph * 1.3) * 2 * s;
        const c = far ? shade(lc, -0.3) : lc;
        Px.line(hx, top + s, kx, ky, Math.max(1, Math.round(1.6 * s)), c);
        Px.line(kx, ky, fx, fy, Math.max(1, Math.round(1.2 * s)), c);
      }
    });
  }
  const base = o.flip ? { x: -18 * s, y: flipY - (by - s) } : { x: -18 * s, y: by - s };
  let tail = null;
  if (o.pose) {
    const P = o.P || scor_pscale(o.pose, s, o.len || 1, base);
    tail = scor_tail({ s, base, P, n: o.n, thick: o.thick, shell: o.shell, plate: o.plate, hi: o.hi, sting: o.sting, stingTip: o.stingTip,
      L: o.L, glowCol: o.glowCol, glowA: o.glowA, quiver: o.quiver });
  }
  if (o.after) o.after(out, by, s, tail);
  g.restore();
  return { out, tail, by, base };
}
// Sand mound for burrowed scorpions (local coords, feet at 0).
function scor_mound(e, m, k, shake) {
  const rx = lerp(m.rx, m.rx2, k), ry = lerp(m.ry, m.ry2, k), sx = shake || 0;
  Px.oval(sx, 0, rx + 2, ry * 0.7 + 1, '#a87a40');
  Px.oval(sx, -ry * 0.55, rx, ry, scor_SAND[1]);
  Px.oval(sx, -ry * 0.8, rx * 0.85, ry * 0.85, scor_SAND[0]);
  Px.oval(sx - rx * 0.3, -ry * 1.2, rx * 0.35, Math.max(1, ry * 0.3), scor_SAND[2]);
  // flicking specks thrown up by the digging
  const n = m.specks || 3;
  for (let i = 0; i < n; i++) {
    const h = (e.anim * 7 + i * 37 + e.id * 13) % 23;
    const px = sx + ((h * 5) % (rx * 2 + 1)) - rx;
    const py = -ry * 1.4 - (h % 7);
    Px.rect(px, py, 1, 1, i % 2 ? scor_SAND[2] : '#8a6438');
  }
}

// ---------------------------------------------------------------- shared FX
function scor_sandBurst(x, y, n, up) {
  FX.debris(x, y, 1, scor_SAND.concat(['#8a6438']), n, [1, 3]);
  for (let i = 0; i < Math.ceil(n / 2); i++) FX.add({ kind: 'dust', x: x + rr(-6, 6), y: y + rr(-2, 2), z: rr(0, 4), vx: rr(-1.2, 1.2), vz: rr(0.6, up || 2), life: ri(18, 30), size: rr(2, 4), color: '#c8a070', g: 0.03, grow: 0.12, alpha: 0.75 });
}
function scor_specks(x, y, n) {
  for (let i = 0; i < n; i++) FX.add({ kind: 'chunk', x: x + rr(-6, 6), y: y + rr(-1, 1), z: 1, vx: rr(-1, 1), vz: rr(1, 2.4), life: 24, color: pick(scor_SAND), size: 1, g: 0.22, ground: y });
}
// Ground marker entity (red ellipse growing to radius r over `life` frames) for lobs and eruptions.
class scor_Marker extends Ent {
  constructor(x, y, r, life, col) {
    super(x, y);
    this.team = 'fx'; this.shadowR = 0; this.r = r; this.life = life; this.col = col || scor_RED;
  }
  update() { if (++this.t >= this.life) this.remove = true; }
  sortY() { return this.y - 200; }
  drawMarker(ctx, camX) {
    const k = clamp(this.t / this.life, 0, 1), r = lerp(3, this.r, k);
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.45 * k;
    ctx.strokeStyle = (this.t >> 1) % 2 && k > 0.75 ? '#ffffff' : this.col; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(Math.round(this.x - camX) + 0.5, Math.round(this.y) + 0.5, r, Math.max(1.5, r * 0.4), 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.12 + 0.12 * k; ctx.fillStyle = this.col; ctx.fill();
    ctx.restore();
  }
  draw() {}
}
// Lob a venom glob from (x, y, z) that lands at (tx, ty) after `fl` frames, with a landing marker
// and an acid puddle. opts: { dmg, tier, puddleLife, puddleDmg, color, puddle, r }
function scor_lob(owner, x, y, z, tx, ty, fl, opts) {
  const g = 0.25;
  const vz = (g * fl * (fl - 1) / 2 - z) / fl;
  const pr = new Proj(x, y, z, { kind: 'glob', vx: (tx - x) / fl, vy: (ty - y) / fl, vz, gravity: g, dmg: opts.dmg, tier: opts.tier || 1,
    color: opts.color || scor_VENOM, owner, life: fl + 30, hitSfx: 'scorSquelch' });
  const mk = Game.add(new scor_Marker(tx, ty, opts.r || 12, fl));
  pr.onImpact = function () {
    mk.remove = true;
    FX.splat(this.x, this.y, Math.max(2, this.z), this.color, 6, sign(this.vx) || 1);
    Sound.sfx('scorSquelch', this.x);
    Game.add(new AcidPool(this.x, this.y, opts.puddleLife || 120, opts.puddle || scor_PUDDLE, 'player', opts.puddleDmg || 3));
  };
  pr.draw = function (ctx, camX) {
    Px.use(ctx);
    const sx = Math.round(this.x - camX), sy = Math.round(this.y - this.z) - 3;
    Px.disc(sx, sy, 3.4, '#2a0a30');
    Px.disc(sx, sy, 2.8, this.color);
    Px.dot(sx - 1, sy - 1, '#f2c8ff');
  };
  Game.add(pr);
  return pr;
}

// ---------------------------------------------------------------- shared small-scorpion logic
// Burst/explosion hooks: Hammer Drop calls def.onHammerLand; explosions are relayed by a one-time
// wrapper around Game.explode (installed lazily, since Game is defined after this module).
function scor_hookExplode() {
  if (Game.__scorBlast) return;
  Game.__scorBlast = true;
  const orig = Game.explode;
  Game.explode = function (x, y, src, opts) {
    const r = (opts && opts.r) || 36, depth = (opts && opts.depth) || 16;
    const mounds = this.ents.filter(e => e.team === 'enemy' && e.state === 'burrowed' && e.def.onBlast);
    const res = orig.apply(this, arguments);      // mounds are invulnerable to the blast itself...
    for (const e of mounds) e.def.onBlast.call(e, x, y, r, depth);   // ...but it pops them out dizzy
    return res;
  };
}
function scor_initSmall(e) {
  scor_hookExplode();
  e.legPh = rr(0, 6);
  e.burrowCool = ri(70, 150);
  e.hitsTaken = 0;
  e.flipT = 0;
  e.skT = ri(0, 30);
  e.takeHit = scor_takeHit;
  e.drawMarker = scor_drawMarker;
}
function scor_takeHit(src, a, dir, nth) {
  if (this.state === 'burrowed') return;
  const pre = this.state, preT = this.t, flipT = this.flipT;
  Enemy.prototype.takeHit.call(this, src, a, dir, nth);
  if (this.dying || this.remove) return;
  if (src && src.team === 'player') this.hitsTaken++;
  if (this.state !== 'hurt') return;
  if (pre === 'flip' || pre === 'flipup') {         // stays on its back, the timer keeps running
    this.state = 'flip'; this.t = preT; this.flipT = Math.max(pre === 'flipup' ? 24 : flipT, 1); this.vx *= 0.5;
    return;
  }
  if (!this.def.noFlip && ((a.tier || 1) >= 3 || a.hammer)) { scor_flip(this, dir); return; }
  if (pre === 'dizzy') { this.state = 'dizzy'; this.t = preT; }
}
function scor_flip(e, dir) {
  e.atk = null; e.dropToken();
  e.setState('flip'); e.flipT = 50;
  e.vz = 2.4; e.z = Math.max(e.z, 0.5); e.vx = (dir || -e.facing) * 1.2;
  Sound.sfx('hitShell', e.x);
  FX.dust(e.x, e.y, 6, 1.2);
  FX.shards(e.x, e.y, 10, 3, e.def.chitin);
}
function scor_popOut(e) {
  if (e.state !== 'burrowed') return;
  e.setState('dizzy'); e.dizzyT = 60; e.sub = null;
  e.z = 0.5; e.vz = 3.2; e.vx = 0; e.vy = 0;
  e.burrowCool = 300; e.hitsTaken = 0; e.noShadow = false;
  e.inv = 8;                       // the move that popped it doesn't also flip it
  scor_sandBurst(e.x, e.y, 12, 2.5);
  Sound.sfx('hitShell', e.x); Sound.sfx('scorRattle', e.x);
  FX.text(e.x, e.y, 30, 'POP!', '#ffe066', 30);
}
function scor_startBurrow(e) {
  e.atk = null; e.dropToken();
  e.setState('burrowed'); e.sub = 'sink'; e.vx = e.vy = 0;
  e.hitsTaken = 0; e.burrowCool = 300; e.moundMax = 90;
  Sound.sfx('burrow', e.x);
}
function scor_erupt(e) {
  const d = e.def, m = d.mound, p = Game.player;
  e.setState('erupt'); e.sub = null; e.noShadow = false;
  e.z = 0.5; e.vz = m.hop || 3.2; e.vx = e.vy = 0;
  e.face(p);
  scor_sandBurst(e.x, e.y, m.burst || 14, 2.6);
  FX.dustRing(e.x, e.y, 10);
  FX.shake(m.shake || 2, 8);
  Sound.sfx('scorErupt', e.x);
  if (p && p.vulnerable && Math.abs(p.x - e.x) <= m.R + p.w * 0.5 && Math.abs(p.y - e.y) <= 8 && p.z < 20) {
    p.takeHit(e, { dmg: m.dmg, tier: m.tier || 3, knock: m.kd !== false, kx: 2.4, kz: 3.6, kb: 1.2, stun: 14, zr: [0, 30], sfx: 'hitHeavy' }, p.x >= e.x ? 1 : -1);
  }
}
function scor_burrowUpdate(e) {
  const p = Game.player, m = e.def.mound;
  e.noShadow = true;
  if (e.sub === 'sink') {
    e.vx *= 0.5; e.vy = 0;
    if (e.t % 3 === 0) scor_specks(e.x, e.y, 2);
    if (e.t >= 20) { e.sub = 'mound'; e.t = 0; }
    return true;
  }
  // a Scrap Burst or a Meteor Fist landing on the mound pops it out (explosions: def.onBlast)
  if (p) {
    const adx = Math.abs(p.x - e.x), ady = Math.abs(p.y - e.y);
    const burst = p.state === 'attack' && p.atk && p.atk.radial && p.atkPhase() === 'active' && adx <= 46 && ady <= 14;
    const meteor = p.state === 'meteor' && p.sub === 'impact' && p.t <= 1 && adx <= 46 && ady <= 16;
    if (burst || meteor) { scor_popOut(e); return true; }
  }
  if (e.sub === 'mound') {
    if (p && !Game.playerGone) {
      const dx = p.x - e.x, dy = p.y - e.y, L = Math.hypot(dx, dy) || 1;
      e.vx = Math.abs(dx) > 1 ? dx / L * (m.speed || 2.0) : 0;
      e.vy = Math.abs(dy) > 1 ? clamp(dy / L * (m.speed || 2.0), -1.2, 1.2) : 0;
      e.face(p);
      if (e.t % 4 === 0) scor_specks(e.x - e.facing * 4, e.y, 1);
      if ((Math.abs(dx) < 6 && Math.abs(dy) < 4) || e.t >= (e.moundMax || 90)) { e.sub = 'tele'; e.t = 0; e.vx = e.vy = 0; Sound.sfx('rumble', e.x); }
    } else { e.vx = e.vy = 0; if (e.t >= (e.moundMax || 90)) { e.sub = 'tele'; e.t = 0; } }
    return true;
  }
  // eruption telegraph: shakes, grows, red ellipse
  e.vx = e.vy = 0;
  if (e.t % 4 === 0) scor_specks(e.x, e.y, 2);
  if (e.t >= (m.tele || 16) + scor_tel()) scor_erupt(e);
  return true;
}
function scor_enterMound(spec) {
  this.setState('burrowed');
  this.sub = 'mound';
  this.moundMax = (spec.opts && spec.opts.moundT) || 40;
  this.noShadow = true;
  this.burrowCool = 240;
}
// Skitter: bursts of movement (def.skitter = [move, pause] frames) toward (tx, ty).
function scor_skitterTo(e, tx, ty, k) {
  const d = e.def, cyc = d.skitter || [20, 16];
  e.skT = (e.skT || 0) + 1;
  const moving = e.skT % (cyc[0] + cyc[1]) < cyc[0];
  const dx = tx - e.x, dy = ty - e.y;
  if (!moving) {
    e.vx *= 0.5; e.vy *= 0.5;
    if (Math.abs(e.vx) < 0.15) e.vx = 0;
    if (Math.abs(e.vy) < 0.15) e.vy = 0;
    if (!e.vx && !e.vy && e.state !== 'idle') e.setState('idle');
    return;
  }
  const sx = e.speed * k, sy = (d.depthSpeed || 1.2) * k;
  e.vx = Math.abs(dx) > 2 ? sign(dx) * Math.min(sx, Math.abs(dx)) : 0;
  e.vy = Math.abs(dy) > 1 ? sign(dy) * Math.min(sy, Math.abs(dy)) : 0;
  if (e.vx || e.vy) { if (e.state !== 'walk') e.setState('walk'); }
  else if (e.state !== 'idle') e.setState('idle');
}
function scor_hover(e, p, dist) {
  const side = p.x > e.x ? -1 : 1;
  const hx = clamp(p.x + side * dist, Game.cam.x + 20, Game.cam.x + W - 20);
  const hy = clamp(p.y + e.slot.dy + Math.sin(e.aiT * 0.02 + e.id) * 8, Game.bounds.yMin, Game.bounds.yMax);
  e.face(p);
  if (Math.abs(e.x - hx) > 6 || Math.abs(e.y - hy) > 4) scor_skitterTo(e, hx, hy, 0.6);
  else { e.vx = e.vy = 0; if (e.state !== 'idle') e.setState('idle'); }
}
// Brain for Sandstinger and Ashtail.
function scor_think() {
  const p = Game.player, d = this.def;
  if (!p || Game.playerGone || p.hp <= 0) { scor_skitterTo(this, this.x, this.y, 0); return; }
  const dx = p.x - this.x, dy = p.y - this.y, adx = Math.abs(dx), ady = Math.abs(dy);
  if (d.burrows && this.burrowCool <= 0 && this.onScreen() && p.state !== 'down' && (adx > 120 || this.hitsTaken >= 3)) { scor_startBurrow(this); return; }
  if (this.ai === 'retreat') {
    this.face(p);
    scor_skitterTo(this, this.x - sign(dx || 1) * 40, this.y + this.slot.dy * 0.2, 0.7);
    if (this.aiT > (d.retreatT || 24)) { this.ai = 'approach'; this.aiT = 0; }
    return;
  }
  if (p.state === 'down') { scor_hover(this, p, d.ranged ? this.keep : this.slot.dist); return; }
  // melee when the hero is in reach
  const melee = adx <= 46 && this.cool <= 0 && this.onScreen();
  if (melee && ady <= 10 && (adx >= 24 || ady <= 6) && this.takeToken(false)) {
    this.face(p); this.vx = this.vy = 0;
    this.attack(adx <= 24 ? 'snap' : 'tail');
    return;
  }
  if (d.ranged) {
    if (this.cool <= 0 && this.onScreen() && adx >= 60 && adx <= 230 && this.takeToken(true)) {
      this.face(p); this.vx = this.vy = 0;
      this.attack('spit');
      return;
    }
    // keep 100-140 px away; when cornered, stand and fight
    const side = p.x > this.x ? -1 : 1;
    const want = clamp(p.x + side * this.keep, Game.cam.x + 20, Game.cam.x + W - 20);
    if (adx < 70 && Math.abs(want - p.x) < 70 && this.cool <= 0 && this.takeToken(false)) {
      this.face(p);
      scor_skitterTo(this, p.x - sign(dx || 1) * 32, p.y, 1);
      if (this.aiT > 160) { this.dropToken(); this.cool = 30; this.aiT = 0; }
      return;
    }
    scor_hover(this, p, this.keep);
    return;
  }
  if (this.cool <= 0 && this.onScreen() && this.takeToken(false)) {
    this.face(p);
    const want = adx > 30 ? 36 : 16;
    scor_skitterTo(this, p.x - sign(dx || 1) * want, p.y, 1);
    if (this.aiT > 200) { this.dropToken(); this.cool = 30; this.aiT = 0; }
    return;
  }
  scor_hover(this, p, this.slot.dist);
}
function scor_stateUpdate() {
  const d = this.def;
  const moving = Math.abs(this.vx) + Math.abs(this.vy) > 0.15;
  this.legPh += this.state === 'flip' ? 1.2 : this.state === 'hatch' || this.state === 'drop' ? 0.9 : moving ? 0.4 : 0.02;
  if (this.burrowCool > 0) this.burrowCool--;
  this.dmgMul = d.baseDmgMul || 0;
  if (this.state === 'flip') this.dmgMul = 1.5;
  if (this.state === 'attack' && this.atk && this.atk.stuck && this.atkPhase() === 'rec') this.dmgMul = 1.5;
  if (this.state !== 'burrowed') this.noShadow = false;
  if (d.ambient) d.ambient.call(this);
  switch (this.state) {
    case 'burrowed': return scor_burrowUpdate(this);
    case 'flip':
      this.vx *= 0.88; this.vy = 0;
      if (this.z > 0) return true;
      if (--this.flipT <= 0) { this.setState('flipup'); this.vz = 2.8; this.z = 0.5; Sound.sfx('scorRattle', this.x); }
      return true;
    case 'flipup':
      this.vx *= 0.8;
      if (this.t > 2 && this.z <= 0) { this.setState('idle'); this.grace = 10; FX.dust(this.x, this.y, 4, 1); }
      return true;
    case 'erupt':
      this.vx *= 0.8;
      if (this.t > 2 && this.z <= 0) { this.setState('idle'); this.grace = 8; this.cool = Math.max(this.cool, 30); FX.dust(this.x, this.y, 4, 1); }
      return true;
    case 'hatch':
      this.vx *= 0.97;
      if (this.t > 2 && this.z <= 0) { this.setState('idle'); this.vx = 0; FX.dust(this.x, this.y, 2, 0.6); this.cool = ri(20, 50); }
      return true;
    case 'flee': {
      this.vx = this.fleeDir * 2.6; this.vy = 0; this.facing = this.fleeDir;
      if (this.t % 4 === 0) scor_specks(this.x, this.y, 1);
      if (this.t > 34) { this.remove = true; this.counted = true; scor_sandBurst(this.x, this.y, 4, 1.2); }
      return true;
    }
  }
  return false;
}
function scor_attackTick(a, ph) {
  if (ph === 'start' && this.t === Math.max(1, a.start - 6) && !this.def.noRattle) Sound.sfx('scorRattle', this.x);
  if (a.whine && this.t === 1) Sound.sfx('whine', this.x);
  if (a.key === 'snap' && this.t === a.start) Sound.sfx('scorSnip', this.x);
  if (a.stuck && this.t === a.start + a.active) {
    const sx = this.x + this.facing * 34 * this.def.s;
    FX.dust(sx, this.y, 3, 0.8); scor_specks(sx, this.y, 3);
    Sound.sfx('thud', sx);
  }
  if (a.key === 'spit' && this.t === a.start) {
    const p = Game.player;
    if (!p) return;
    const s = this.def.s;
    const ox = this.x + this.facing * 12 * s, oz = 44 * s;
    scor_lob(this, ox, this.y, oz, p.x, p.y, 40, { dmg: 6, tier: 1, color: scor_VENOM, puddle: scor_PUDDLE, puddleLife: 120, puddleDmg: 3, r: 12 });
    Sound.sfx('scorSpit', this.x);
  }
}
// Ground markers for small scorpions: base danger markers plus the eruption ellipse.
function scor_drawMarker(ctx, camX) {
  Enemy.prototype.drawMarker.call(this, ctx, camX);
  if (this.state === 'burrowed' && this.sub === 'tele') {
    const m = this.def.mound, k = clamp(this.t / ((m.tele || 16) + scor_tel()), 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.4 * k;
    ctx.strokeStyle = (this.t >> 1) % 2 ? scor_RED : '#ff7a50'; ctx.lineWidth = 1;
    const r = lerp(6, m.R, k);
    ctx.beginPath(); ctx.ellipse(Math.round(this.x - camX) + 0.5, Math.round(this.y) + 0.5, r, r * 0.4, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

// Pose picker for small scorpions. Returns scor_body options.
function scor_smallPose(e) {
  const d = e.def, s = d.s, an = e.anim;
  const o = { s, shell: d.shell, plate: d.plate, hi: d.hi, belly: d.belly, leg: d.leg, eye: d.eye, sting: d.sting, stingTip: d.stingTip,
    legPhase: e.legPh || 0, clawOpen: 0.12 + 0.25 * Math.max(0, Math.sin(an * 0.11)), clawRaise: 0, bodyDip: 0.3 + 0.3 * Math.sin(an * 0.08),
    pose: scor_pshift(scor_TP.rest, Math.sin(an * 0.05) * 1.5, Math.sin(an * 0.07) * 0.8, Math.sin(an * 0.06) * 0.1), ox: 0, oy: 0 };
  switch (e.state) {
    case 'walk': case 'enter': case 'door': case 'flee':
      o.bodyDip = 0.5 * Math.abs(Math.sin(e.legPh));
      o.pose = scor_pshift(scor_TP.rest, Math.sin(e.legPh * 0.5) * 2, 0, Math.sin(e.legPh * 0.5) * 0.15);
      o.clawOpen = 0.25;
      break;
    case 'drop': case 'hatch':
      o.clawOpen = 0.8; o.clawRaise = 0.6; o.pose = scor_pl(scor_TP.rest, scor_TP.coil, 0.5);
      break;
    case 'hurt': case 'grabbed': case 'held': case 'pinned': {
      const k = e.state === 'hurt' ? clamp(1 - e.t / 10, 0, 1) : 0.6 + 0.4 * Math.sin(e.t * 0.8);
      o.ox = -2 * k; o.clawOpen = 0.8; o.clawRaise = 0.3 * k; o.bodyDip = 1;
      o.pose = scor_pl(scor_TP.rest, scor_TP.coil, 0.5 * k);
      break;
    }
    case 'flip':
      o.flip = true; o.pose = scor_pshift(scor_TP.back, Math.sin(e.t * 0.6) * 3, Math.cos(e.t * 0.5) * 2, Math.sin(e.t * 0.7) * 0.4);
      o.clawOpen = 0.5 + 0.5 * Math.sin(e.t * 0.9); o.bodyDip = 0;
      o.ox = Math.sin(e.t * 0.5) * 1;
      break;
    case 'flipup':
      if (e.vz > 0) { o.flip = true; o.pose = scor_TP.back; }
      o.clawOpen = 0.6;
      break;
    case 'fall': case 'down': case 'getup':
      o.flip = true; o.pose = scor_TP.back; o.clawOpen = 0.3;
      o.legPhase = (e.legPh || 0) + (e.state === 'down' && e.t < 30 ? Math.sin(e.t * 0.9) * 0.6 : 0);
      break;
    case 'dizzy':
      o.pose = scor_pshift(scor_TP.droop, Math.sin(e.t * 0.2) * 2, Math.cos(e.t * 0.2), 0);
      o.clawOpen = 0.6; o.bodyDip = 1.5; o.ox = Math.sin(e.t * 0.2) * 1.2;
      break;
    case 'erupt':
      o.clawOpen = 1; o.clawRaise = 1; o.pose = scor_TP.coil; o.bodyDip = -1;
      break;
    case 'attack': {
      const a = e.atk, ph = e.atkPhase(), t = e.t;
      if (!a) break;
      if (a.key === 'snap' || a.key === 'nibble') {
        if (ph === 'start') { const k = t / a.start; o.clawOpen = k; o.clawRaise = 0.35 * k; o.ox = -2 * k; o.bodyDip = 1; }
        else if (ph === 'active') { o.clawOpen = 0; o.clawRaise = 0.1; o.ox = 3; }
        else { const k = clamp((t - a.start - a.active) / a.rec, 0, 1); o.clawOpen = 0.1; o.ox = 3 * (1 - k); }
        o.pose = scor_pl(scor_TP.rest, scor_TP.coil, 0.3);
      } else if (a.key === 'tail') {
        if (ph === 'start') {
          const k = easeOut(clamp(t / (a.start - 4), 0, 1));
          o.pose = scor_pl(scor_TP.rest, scor_TP.coil, k);
          if (t > a.start - 10) o.quiver = t * 2.3;
          o.sting = (t / 3 | 0) % 2 ? '#ffffff' : d.sting;
          o.bodyDip = 1.2 * k; o.clawRaise = 0.4 * k; o.clawOpen = 0.5 * k; o.ox = -1.5 * k;
        } else if (ph === 'active') {
          // fully out from the first active frame: that is the frame the hit lands and hitstop freezes
          o.pose = scor_TP.stab;
          o.clawOpen = 0.3; o.ox = 2; o.bodyDip = 0.5;
        } else {
          const rt = t - a.start - a.active, left = a.rec - rt;
          o.pose = left < 7 ? scor_pl(scor_TP.rest, scor_TP.stuck, left / 7) : scor_pl(scor_TP.stab, scor_TP.stuck, clamp(rt / 2, 0, 1));
          if (left >= 7 && rt > 2) o.quiver = t * 1.7;
          o.clawOpen = 0.2; o.ox = left < 7 ? 2 * left / 7 : 2; o.bodyDip = 1;
        }
      } else if (a.key === 'spit') {
        if (ph === 'start') {
          const k = clamp(t / a.start, 0, 1);
          o.pose = scor_pshift(scor_pl(scor_TP.rest, scor_TP.raise, k), Math.sin(t * 0.45) * 7 * k, 0, Math.sin(t * 0.45) * 0.35 * k);
          o.bodyDip = 1 * k; o.clawRaise = 0.3 * k; o.clawOpen = 0.4;
          e._spitGlow = k;
        } else if (ph === 'active') { o.pose = scor_TP.spit; e._spitGlow = 1; }
        else { o.pose = scor_pl(scor_TP.spit, scor_TP.rest, clamp((t - a.start - a.active) / a.rec, 0, 1)); e._spitGlow = 0; }
      }
      break;
    }
  }
  return o;
}
function scor_drawSmall() {
  const e = this, d = e.def;
  e._tipL = null;
  if (e.state === 'burrowed' && e.sub !== 'sink') {
    const k = e.sub === 'tele' ? clamp(e.t / ((d.mound.tele || 16) + scor_tel()), 0, 1) : 0;
    scor_mound(e, d.mound, k, e.sub === 'tele' ? ((e.t >> 1) % 2 ? 1 : -1) : 0);
    return;
  }
  const o = scor_smallPose(e);
  if (d.extra) o.extra = (out, by, s) => d.extra.call(e, out, by, s, o);
  if (d.after) o.after = (out, by, s, tail) => d.after.call(e, tail, o);
  if (e.state === 'burrowed') {        // sinking into a sand ring
    const k = clamp(e.t / 20, 0, 1), m = d.mound;
    Px.oval(0, 0, m.rx + 6, m.ry + 2, '#a87a40');
    Px.oval(0, 0, m.rx + 4, m.ry + 1, '#5a4024');
    o.legPhase = (e.legPh || 0) + e.t * 0.8;
    o.oy = k * 22 * d.s; o.clawOpen = 0.8; o.clawRaise = 0.5;
    scor_clip(0);
    scor_body(o);
    Sprite.cur.ga.restore();
    Px.oval(0, 1, m.rx + 6, 2, scor_SAND[1]);
    Px.oval(-2, 0, m.rx + 2, 1, scor_SAND[0]);
    return;
  }
  const r = scor_body(o);
  if (r.tail) e._tipL = { x: r.tail.end.x + o.ox, y: r.tail.end.y + o.oy };
  if (scor_rimOn(e)) scor_rim();
}
function scor_eyesSmall() {
  const d = this.def, s = d.s, c = d.glowEye || '#ff5a2a';
  if (this.state === 'burrowed') return [];
  if (this.state === 'flip' || this.state === 'fall' || this.state === 'down') return [[Math.round(12 * s), Math.round(-3 * s), c], [Math.round(13 * s), Math.round(-4 * s), c]];
  return [[Math.round(12 * s), Math.round(-10 * s), c], [Math.round(13 * s), Math.round(-9 * s), c]];
}
// Common definition for the small scorpions.
function scor_smallDef(o) {
  return Object.assign({
    family: 'scorpion', noGrab: true, launchable: false, weight: 0.8, speed: 2.2, depthSpeed: 1.2, skitter: [20, 16],
    w: 17, h: 20, shadowR: 17, s: 1, sprite: [132, 84, 62, 70], retreatT: 22, burrows: false,
    mound: { rx: 8, ry: 2, rx2: 11, ry2: 3, R: 18, dmg: 10, tele: 16, speed: 2.0 },
    init() { scor_initSmall(this); },
    stateUpdate: scor_stateUpdate,
    think: scor_think,
    attackTick: scor_attackTick,
    drawBody: scor_drawSmall,
    eyes: scor_eyesSmall,
    onHammerLand(x, y) { if (this.state === 'burrowed' && Math.abs(x - this.x) <= 24 && Math.abs(y - this.y) <= 12) scor_popOut(this); },
    onBlast(x, y, r, depth) { if (Math.abs(x - this.x) <= r + 8 && Math.abs(y - this.y) <= depth) scor_popOut(this); },
    enterStyles: { mound: scor_enterMound },
  }, o);
}

// ---------------------------------------------------------------- SANDSTINGER
ENEMY_TYPES.sandstinger = scor_smallDef({
  name: 'STINGER', hp: 30, score: 600, burrows: true,
  shell: '#c8782e', plate: '#8a4a1c', hi: '#e8a060', belly: '#e8b47a', leg: '#7a421a', sting: '#e8e05a', stingTip: '#3a2a10', eye: '#1a0e0a',
  glowEye: '#ff6a2a',
  chitin: ['#c8782e', '#8a4a1c', '#e8a060'],
  attacks: {
    snap: { start: 10, active: 4, rec: 14, dmg: 6, tier: 1, kb: 1.2, stun: 16, reach: [10, 24], zr: [0, 20], depth: 8, tell: 'glint', glint: [26, -11] },
    tail: { start: 22, active: 6, rec: 20, dmg: 12, tier: 2, kb: 1.6, stun: 22, venom: 120, reach: [20, 46], zr: [10, 36], depth: 10,
      tell: 'glint', glint: [-14, -40], rim: true, whine: true, stuck: true, whiff: 'whoosh' },
  },
});

// ---------------------------------------------------------------- ASHTAIL
ENEMY_TYPES.ashtail = scor_smallDef({
  name: 'ASHTAIL', hp: 36, score: 700, ranged: true, burrows: false,
  shell: '#2a2230', plate: '#4b3a5c', hi: '#6e5a86', belly: '#3a3044', leg: '#1a141e', sting: '#7a2a90', stingTip: '#2a0a30', eye: '#5a1a30',
  glowEye: '#ff4c8a',
  chitin: ['#2a2230', '#4b3a5c', '#d84cff'],
  init() { scor_initSmall(this); this.keep = rr(100, 140); },
  attacks: {
    snap: { start: 10, active: 4, rec: 14, dmg: 6, tier: 1, kb: 1.2, stun: 16, reach: [10, 24], zr: [0, 20], depth: 8, tell: 'glint', glint: [26, -11] },
    tail: { start: 22, active: 6, rec: 20, dmg: 14, tier: 2, kb: 1.6, stun: 22, venom: 120, reach: [20, 46], zr: [10, 36], depth: 10,
      tell: 'glint', glint: [-14, -40], rim: true, whine: true, stuck: true, whiff: 'whoosh' },
    spit: { start: 20, active: 2, rec: 18, projectile: true, tell: 'glint', glint: [-10, -46] },
  },
  ambient() { if (this.anim % 14 === 0 && this.state !== 'burrowed') FX.add({ kind: 'bubble', x: this.x + rr(-12, 8), y: this.y, z: rr(8, 16), vz: rr(0.3, 0.6), g: 0, life: 26, color: '#d84cff' }); },
  // alpha-pulsing magenta stinger and pink eyes (0.6..1.0 every 30 f)
  extra(out, by, s) {
    const a = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(this.anim * TAU / 30));
    const ec = scor_mix('#2a1020', '#ff4c8a', a);
    Px.dot(12 * s, by - 2 * s, ec); Px.dot(13 * s, by - s, ec);
    Px.dot(11 * s, by - 2 * s, scor_mix('#2a1020', '#ff9ac0', a));
    // faint radioactive blotches on the plates
    Px.dot(-11 * s, by - 3 * s, '#7a4a9a'); Px.dot(-5 * s, by - 4 * s, '#7a4a9a'); Px.dot(1 * s, by - 4 * s, '#8a5aaa');
  },
  after(tail, o) {
    if (!tail || o.sting === '#ffffff') return;
    const a = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(this.anim * TAU / 30));
    scor_stinger(tail.tip.x, tail.tip.y, tail.ang, 7, 1, scor_mix('#3a1048', '#d84cff', a), scor_mix('#3a1048', '#ffd0ff', a));
  },
  drawExtra(ctx, camX) {
    if (!this._tipL || Game.silhouetteDist && Game.player && Math.abs(this.x - Game.player.x) > Game.silhouetteDist) return;
    const a = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(this.anim * TAU / 30));
    const gx = this.x - camX + this.facing * this._tipL.x, gy = this.y - this.z + this._tipL.y;
    ctx.save();
    ctx.globalAlpha = 0.16 * a + 0.25 * (this._spitGlow || 0);
    Px.use(ctx); Px.disc(gx, gy, 4 + 3 * (this._spitGlow || 0), '#d84cff');
    ctx.restore();
  },
});

// ---------------------------------------------------------------- SCORPLING
ENEMY_TYPES.scorpling = scor_smallDef({
  name: 'SCORPLING', hp: 6, score: 100, noToken: true, noFlip: true, noRattle: true, baseDmgMul: 99, weight: 0.6,
  speed: 2.0, w: 7, h: 18, shadowR: 6, s: 0.35, sprite: [48, 36, 24, 30],
  shell: '#e0a060', plate: '#a8642c', hi: '#f2c890', belly: '#f0c890', leg: '#7a4a22', sting: '#f2f06a', stingTip: '#3a2a10', eye: '#1a0e0a',
  glowEye: '#ffb040',
  chitin: ['#e0a060', '#a8642c'],
  coolMin: 40, coolMax: 70,
  mound: { rx: 4, ry: 1.5, rx2: 6, ry2: 2, R: 9, dmg: 3, tier: 1, kd: false, tele: 12, speed: 2.0, hop: 2.2, burst: 6, shake: 0, specks: 2 },
  init() { scor_initSmall(this); this.hopDir = 0; this.hopT = 0; this.dmgMul = 99; },
  attacks: {
    nibble: { start: 6, active: 3, rec: 14, dmg: 3, tier: 1, kb: 0.6, stun: 12, reach: [2, 12], zr: [0, 10], depth: 6, tell: 'glint', glint: [8, -4] },
  },
  think() {
    const p = Game.player;
    if (!p || Game.playerGone || p.hp <= 0) { this.vx *= 0.8; this.vy *= 0.8; return; }
    const dx = p.x - this.x, dy = p.y - this.y, adx = Math.abs(dx), ady = Math.abs(dy);
    this.face(p);
    if (this.cool <= 0 && adx <= 12 && ady <= 4 && p.state !== 'down' && this.onScreen()) { this.vx = this.vy = 0; this.attack('nibble'); return; }
    // hop toward the hero, changing direction every 12-20 f
    if (--this.hopT <= 0) {
      this.hopT = ri(12, 20);
      const base = Math.atan2(dy * 1.4, dx) + (adx < 30 ? rr(-0.5, 0.5) : rr(-1.0, 1.0));
      this.hopDir = base;
    }
    const sp = p.state === 'down' ? 0.8 : this.speed;
    this.vx = Math.cos(this.hopDir) * sp;
    this.vy = clamp(Math.sin(this.hopDir) * sp, -1.2, 1.2);
    if (this.z <= 0 && this.anim % 9 === 0) { this.vz = 1.3; this.z = 0.2; }
    if (this.state !== 'walk') this.setState('walk');
  },
});

// ================================================================ THE MATRIARCH
// Entity x is the centre of her front hurtbox (head + claws, 40 px); the rig origin is 40 px behind it.
function scor_mRig(e) { return e.x - e.facing * scor_M_OFF; }
function scor_mSetRig(e, rx) { e.x = rx + e.facing * scor_M_OFF; }
function scor_mTurn(e) {
  const rx = scor_mRig(e);
  e.facing = -e.facing;
  scor_mSetRig(e, rx);
  e.turnT = 0;
  FX.dust(rx, e.y, 8, 1.6);
  Sound.sfx('scorRattle', rx);
}
// Where the tail hammer may land: in front of her, 40..190 px from the rig origin.
function scor_mClampTarget(e, x, y) {
  const rx = scor_mRig(e);
  const d = clamp((x - rx) * e.facing, 0, 190);
  return { x: clamp(rx + e.facing * d, Game.cam.x + 10, Game.cam.x + W - 10), y: clamp(y, Game.bounds.yMin, Game.bounds.yMax) };
}
function scor_mVulnerable() {
  if (this.inv > 0 || this.dying || this.remove) return false;
  if (this.state === 'emerge' || this.state === 'burrowed' || this.state === 'ko') return false;
  return true;
}
function scor_mTakeHit(src, a, dir, nth) {
  if (this.state === 'emerge' || this.state === 'burrowed' || this.state === 'ko' || this.dying) return;
  const st = this.state, atk = this.atk, t = this.t, sub = this.sub, facing = this.facing, x = this.x;
  // a Scrap Burst damages her mid-attack but never cancels the windup (no burst-spam stun-lock)
  const busy = (st === 'attack' && (this.atkPhase() !== 'start' || (a && a.radial))) || st === 'erupt' || st === 'shrug';
  Enemy.prototype.takeHit.call(this, src, a, dir, nth);
  this.facing = facing; this.x = x;
  if (this.dying) { scor_mKO(this); return; }
  if (this.state === 'hurt') {
    if (busy) { this.state = st; this.atk = atk; this.t = t; this.sub = sub; this.vx = 0; this.jolt = 6; }
    else { this.hurtTime = 12; this.vx = -facing * 0.8; this.jolt = 6; this.tgt = null; this.lodge = null; }
  }
  this.vy = 0;
  if (this.phase < 2 && this.hp < 200) { this.phase = 2; scor_mRoar(this); }
  if (this.phase < 3 && this.hp < 100) { this.phase = 3; this.coolMul = 0.75; this.forceRain = true; this.specialN = 1; scor_mRoar(this); }
  // combo break: 5 hits inside 60 f -> shrug (8 f white flash, invulnerable) then her fastest attack
  this.hitLog = this.hitLog.filter(f => Game.frame - f < 60);
  this.hitLog.push(Game.frame);
  if (this.hitLog.length >= 5 && this.state !== 'shrug') {
    this.hitLog = [];
    this.atk = null; this.lodge = null; this.tgt = null;
    this.setState('shrug');
    this.inv = 10; this.flash = 8; this.vx = 0;
    Sound.sfx('hiss', this.x); Sound.sfx('scorRattle', this.x);
    FX.dustRing(scor_mRig(this), this.y, 16);
    FX.shards(this.x, this.y, 30, 6, this.def.chitin);
  }
}
function scor_mHitFx(x, z, tier, dir, a) {
  if (a && a.viaPart) {
    const pt = a.viaPart;
    FX.hit(pt.x - dir * 3, pt.y, 10, tier, dir, '#ff8a3d');
    FX.shards(pt.x, pt.y, 10, 1 + tier, this.def.chitin);
    FX.splat(pt.x, pt.y, 10, '#ffe14a', 2 + tier, dir, false);
    return;
  }
  Enemy.prototype.onHitFx.call(this, x, z, tier, dir, a);
}
function scor_mRoar(e) {
  Sound.sfx('scorShriek', e.x);
  FX.shake(3, 20);
  e.roarT = 30;
  FX.dustRing(scor_mRig(e), e.y, 14);
}
function scor_mKO(e) {
  e.setState('ko');
  e.atk = null; e.lodge = null; e.tgt = null;
  e.vx = e.vy = e.vz = 0; e.z = 0;
  e.hs = 0;
  // boss KO: a 30 f freeze, then 0.4x for 120 f (started when the freeze ends: the engine
  // only counts hitstop down on simulated frames, so a concurrent slow-mo would stretch it)
  Game.hitstop = 30;
  Game.slow = 0; Game.slowScale = 1;
  FX.shake(5, 30);
  FX.flash('#ffffff', 4, 0.5);
  Sound.sfx('scorShriek', e.x);
  // her brood scatters and digs away
  for (const f of Game.foes()) if (f.type === 'scorpling' && !f.dying && !f.remove) { f.atk = null; f.dropToken(); f.setState('flee'); f.fleeDir = sign(f.x - scor_mRig(e)) || 1; }
}
function scor_mSpawnSacs(e) {
  e.sacsDone = true;
  e.sacs = [0, 1, 2].map(i => {
    const sac = new Enemy('scor_sac', e.x, e.y, {});
    sac.boss = false; sac.owner = e; sac.slot = i; sac.ignoreForWave = true;
    scor_sacPlace(sac);
    return Game.add(sac);
  });
}
function scor_mBrood(e) {
  const live = (e.sacs || []).filter(s => !s.remove && !s.dying);
  if (!live.length) return;
  e.broodT = (e.broodT || 0) + 1;
  if (e.broodT === 570) { e.broodPulse = 30; Sound.sfx('hiss', e.x); }
  if (e.broodT < 600) return;
  e.broodT = 0;
  let n = Game.foes().filter(f => f.type === 'scorpling' && !f.dying && !f.remove).length;
  for (const sac of live) {
    for (let k = 0; k < 2 && n < 6; k++, n++) {
      const c = new Enemy('scorpling', sac.x + rr(-3, 3), clamp(e.y + rr(-10, 10), Game.bounds.yMin, Game.bounds.yMax), {});
      c.z = sac.z + 8; c.vz = rr(1.5, 2.8); c.vx = -e.facing * rr(0.8, 1.8) + rr(-0.4, 0.4); c.vy = 0;
      c.facing = -e.facing;
      c.setState('hatch');
      Game.add(c);
    }
    FX.splat(sac.x, sac.y, sac.z + 6, '#e8d8a0', 5, -e.facing, true);
  }
  Sound.sfx('scorSquelch', e.x);
  Sound.sfx('scorRattle', e.x);
}
function scor_mStartBurrow(e) {
  e.atk = null;
  e.setState('burrowed'); e.sub = 'sink'; e.vx = e.vy = 0;
  Sound.sfx('burrow', e.x); Sound.sfx('scorRattle', e.x);
}
function scor_mBurrowUpdate(e) {
  const p = Game.player, rx = scor_mRig(e);
  if (e.sub === 'sink') {
    e.vx = e.vy = 0;
    if (e.t % 2 === 0) scor_sandBurst(rx + rr(-50, 50), e.y + rr(-3, 3), 2, 1.6);
    if (e.t % 10 === 0) Sound.sfx('burrow', rx);
    if (e.t >= 30) { e.sub = 'mound'; e.t = 0; }
    return true;
  }
  if (e.sub === 'mound') {
    if (p && !Game.playerGone) {
      const dx = p.x - rx, dy = p.y - e.y;
      e.vx = Math.abs(dx) > 2 ? sign(dx) * Math.min(2.4, Math.abs(dx)) : 0;
      e.vy = Math.abs(dy) > 1 ? sign(dy) * Math.min(1.2, Math.abs(dy)) : 0;
      if (e.t % 3 === 0) scor_specks(rx + rr(-18, 18), e.y, 2);
      if (e.t % 20 === 0) Sound.sfx('rumble', rx);
      if ((Math.abs(dx) < 8 && Math.abs(dy) < 4) || e.t >= 120) { e.sub = 'tele'; e.t = 0; e.vx = e.vy = 0; Sound.sfx('rumble', rx); }
    } else { e.vx = e.vy = 0; if (e.t >= 120) { e.sub = 'tele'; e.t = 0; } }
    return true;
  }
  // 20 f eruption telegraph (+4 on easy): rumble, 1 px shake, red ellipse r30
  e.vx = e.vy = 0;
  FX.shake(1, 2);
  if (e.t % 3 === 0) scor_specks(rx + rr(-20, 20), e.y, 2);
  if (e.t >= 20 + scor_tel()) {
    // face the screen centre so her body fits, then burst out under the mound
    e.facing = rx < Game.cam.x + W / 2 ? 1 : -1;
    scor_mSetRig(e, rx);
    e.setState('erupt'); e.sub = null;
    scor_sandBurst(rx, e.y, 30, 3.2);
    FX.dustRing(rx, e.y, 18);
    FX.shake(4, 14);
    Sound.sfx('scorErupt', rx); Sound.sfx('scorShriek', rx);
    if (p && p.vulnerable && Math.abs(p.x - rx) <= 30 + p.w * 0.5 && Math.abs(p.y - e.y) <= 12 && p.z < 30) {
      p.takeHit(e, { dmg: 16, tier: 3, knock: true, kx: 3.0, kz: 4.4, zr: [0, 40], sfx: 'hitHeavy' }, p.x >= rx ? 1 : -1);
    }
  }
  return true;
}
function scor_mEmerge(e) {
  const t = e.t;
  if (t === 1) {
    const rx = e.x;                       // spawn x is where she erupts
    e.facing = Game.player && Game.player.x < rx ? -1 : 1;
    scor_mSetRig(e, rx);
    Game.bossCard('THE MATRIARCH', 'QUEEN OF THE FLATS');
    FX.shake(3, 60);
    Sound.sfx('rumble', rx);
  }
  const rx = scor_mRig(e);
  e.vx = e.vy = 0;
  if (t < 60) {
    if (t % 15 === 0) Sound.sfx('rumble', rx);
    if (t % 2 === 0) scor_specks(rx + rr(-t * 0.6, t * 0.6), e.y + rr(-3, 3), 1);
    if (t === 20 || t === 36 || t === 50) FX.wallCrack(rx + rr(-30, 30), e.y + rr(-3, 3));
  }
  if (t === 60) {
    // the eruption: a 60-particle sand plume
    for (let i = 0; i < 60; i++) {
      const a = rr(-0.5, 0.5) - Math.PI / 2, sp = rr(1.5, 5.5);
      FX.add({ kind: i % 3 ? 'dust' : 'chunk', x: rx + rr(-40, 40), y: e.y + rr(-4, 4), z: rr(0, 10), vx: Math.cos(a) * sp * 0.6 + rr(-1, 1), vz: -Math.sin(a) * sp,
        life: ri(30, 60), size: i % 3 ? rr(3, 6) : ri(1, 3), color: pick(scor_SAND), g: i % 3 ? 0.06 : 0.22, grow: i % 3 ? 0.1 : 0, alpha: 0.85, ground: i % 3 ? null : e.y });
    }
    FX.dustRing(rx, e.y, 20);
    FX.shake(5, 16);
    Sound.sfx('scorErupt', rx); Sound.sfx('explode', rx);
    scor_mSpawnSacs(e);
  }
  if (t === 84) scor_mRoar(e);
  if (t >= 120) { e.setState('idle'); e.ai = 'boss'; e.cool = 30; }
  return true;
}
function scor_mStateUpdate() {
  const e = this;
  if (e.dying && e.state !== 'ko') { scor_mKO(e); return true; }
  const moving = Math.abs(e.vx) + Math.abs(e.vy) > 0.1;
  e.legPh += moving ? 0.28 : 0.02;
  e.noShadow = true;                       // she draws her own shadow under the rig (drawMarker)
  if (e.jolt > 0) e.jolt--;
  if (e.broodPulse > 0) e.broodPulse--;
  if (e.roarT > 0) e.roarT--;
  if (!e.sacsDone && e.state !== 'emerge') scor_mSpawnSacs(e);   // e.g. dragged out early by an overdrive
  if (e.state !== 'burrowed' && e.state !== 'emerge' && e.state !== 'ko') {
    const rx = clamp(scor_mRig(e), Game.cam.x + 60, Game.cam.x + W - 60);
    scor_mSetRig(e, rx);
  }
  switch (e.state) {
    case 'emerge': return scor_mEmerge(e);
    case 'burrowed': return scor_mBurrowUpdate(e);
    case 'erupt':
      e.vx = e.vy = 0;
      if (e.t >= 50) { e.setState('idle'); e.ai = 'boss'; e.cool = 20; }
      scor_mBrood(e);
      return true;
    case 'shrug':
      e.vx = e.vy = 0;
      if (e.t >= 8) { e.inv = 0; e.attack('claw'); }
      return true;
    case 'ko': return scor_mKOUpdate(e);
  }
  if (!e.dying) scor_mBrood(e);
  return false;
}
function scor_mThink() {
  const e = this, p = Game.player;
  if (e.ai === 'retreat') { e.ai = 'boss'; e.cool = Math.round(70 * (e.coolMul || 1)); }
  if (!p || Game.playerGone || p.hp <= 0) { e.vx = e.vy = 0; if (e.state !== 'idle') e.setState('idle'); return; }
  const rx = scor_mRig(e), rel = (p.x - rx) * e.facing;
  // turn round once the hero has been behind her head for a moment
  if (rel < -10) { if (++e.turnT > 14) { scor_mTurn(e); return; } }
  else e.turnT = 0;
  const fdx = (p.x - e.x) * e.facing, ady = Math.abs(p.y - e.y);
  if (e.cool > 0 || p.state === 'down') {
    // shuffle so the hero stays near her claw tips (with hysteresis so she doesn't stutter)
    if (fdx > 112) e.closing = true; else if (fdx < 78) e.closing = false;
    let tx = e.x, ty = e.y;
    if (e.closing) tx = p.x - e.facing * 70;
    else if (fdx < 12 && fdx > -40) tx = p.x - e.facing * 40;
    if (ady > 8) ty = p.y;
    const dx = tx - e.x, dy = ty - e.y;
    e.vx = Math.abs(dx) > 3 ? sign(dx) * Math.min(e.speed, Math.abs(dx)) : 0;
    e.vy = Math.abs(dy) > 2 ? sign(dy) * Math.min(0.5, Math.abs(dy)) : 0;
    const s = e.vx || e.vy ? 'walk' : 'idle';
    if (e.state !== s) e.setState(s);
    return;
  }
  e.vx = e.vy = 0;
  if (e.forceRain) { e.forceRain = false; e.attack('rain'); return; }
  e.atkN = (e.atkN || 0) + 1;
  if (e.phase >= 2 && e.atkN % 3 === 0) {
    if (e.phase >= 3 && (e.specialN = (e.specialN || 0) + 1) % 2 === 1) { e.attack('rain'); return; }
    scor_mStartBurrow(e);
    return;
  }
  if (fdx <= 72 && fdx >= -8 && ady <= 12) { e.attack('claw'); return; }
  e.attack('hammer');
}
// Where her stinger tip is (entity-local) for a unit pose.
function scor_mTipLocal(e, pose) {
  const s = scor_M_S, base = { x: -18 * s, y: -9 * s };
  const P = scor_pscale(pose, s, 0.9, base);
  return { x: P.tip.x - scor_M_OFF, y: P.tip.y };
}
function scor_mAttackTick(a, ph) {
  const e = this, p = Game.player;
  if (ph === 'start' && e.t === Math.max(1, a.start - 6)) Sound.sfx('scorRattle', e.x);
  if (a.key === 'claw') {
    if (e.t === 1) Sound.sfx('hiss', e.x);
    if (e.t === a.start) { Sound.sfx('whooshBig', e.x); FX.dust(e.x + e.facing * 40, e.y, 5, 1.5); }
  }
  if (a.key === 'hammer') {
    const lockAt = a.start - 12 - scor_tel();
    if (e.t === 1) { Sound.sfx('scorWhineLong', e.x); e.tgt = scor_mClampTarget(e, p ? p.x : e.x + e.facing * 80, p ? p.y : e.y); e.locked = false; }
    if (ph === 'start' && e.t < lockAt && p) e.tgt = scor_mClampTarget(e, p.x, p.y);
    if (e.t === lockAt) { e.locked = true; Sound.sfx('tink', e.x); }
    if (e.t === a.start && e.tgt) {
      const tg = e.tgt;
      e.lodge = { x: tg.x, y: tg.y };
      FX.shake(4, 12);
      FX.dustRing(tg.x, tg.y, 14);
      scor_sandBurst(tg.x, tg.y, 14, 2.4);
      FX.add({ kind: 'ring', x: tg.x, y: tg.y, z: 1, life: 12, size: 30, color: '#ffffff', g: 0 });
      Sound.sfx('scorSlam', tg.x);
      if (p && p.vulnerable && Math.abs(p.x - tg.x) <= 14 + p.w * 0.5 && Math.abs(p.y - tg.y) <= 8 && p.z < 24) {
        p.takeHit(e, { dmg: a.dmg, tier: 3, knock: true, kx: 2.6, kz: 4.2, zr: [0, 40], sfx: 'hitHeavy' }, p.x >= tg.x ? 1 : -1);
      }
      if (!e.sting || e.sting.remove) {
        e.sting = new Enemy('scor_sting', tg.x, tg.y, {});
        e.sting.owner = e; e.sting.ignoreForWave = true;
        Game.add(e.sting);
      }
    }
    if (ph === 'rec' && e.lodge) {
      const lt = e.t - a.start - a.active;
      if (lt % 16 === 4 && lt < 70) FX.add({ kind: 'ring', x: e.lodge.x, y: e.lodge.y, z: 1, life: 14, size: 22, color: '#c8b090', g: 0 });
      if (lt % 6 === 0 && lt < 70) scor_specks(e.lodge.x, e.lodge.y, 1);
      if (lt === 70) { FX.dust(e.lodge.x, e.lodge.y, 6, 1.4); scor_specks(e.lodge.x, e.lodge.y, 5); Sound.sfx('scorRattle', e.lodge.x); e.yank = { x: e.lodge.x, y: e.lodge.y }; e.lodge = null; }
    }
    if (ph === 'done') { e.lodge = null; e.tgt = null; }
  }
  if (a.key === 'rain') {
    if (e.t === 1) { Sound.sfx('hiss', e.x); Sound.sfx('scorWhineLong', e.x); }
    if (e.t === a.start && p) {
      e.rainT = [];
      for (let i = 0; i < 5; i++) {
        const tx = i === 0 ? p.x + rr(-6, 6) : p.x + rr(-120, 120);
        const ty = i === 0 ? p.y : rr(Game.bounds.yMin + 2, Game.bounds.yMax - 2);
        e.rainT.push({ x: clamp(tx, Game.cam.x + 12, Game.cam.x + W - 12), y: ty });
      }
    }
    const i = (e.t - a.start) / 4;
    if (ph === 'active' && e.rainT && i === Math.floor(i) && i < 5) {
      const tl = scor_mTipLocal(e, scor_TP.mspit);
      const ox = e.x + e.facing * tl.x, oz = -tl.y;
      const tg = e.rainT[i];
      scor_lob(e, ox, e.y, oz, tg.x, tg.y, 40, { dmg: 8, tier: 2, color: scor_VENOM, puddle: scor_PUDDLE, puddleLife: 90, puddleDmg: 3, r: 14 });
      Sound.sfx('scorSpit', e.x);
    }
  }
}
// Matriarch ground layer: her shadow, the emerge crater, the tail-hammer reticle and the burrow ellipse.
function scor_mDrawMarker(ctx, camX) {
  const e = this, rx = scor_mRig(e), sx = Math.round(rx - camX), sy = Math.round(e.y);
  Px.use(ctx);
  const showBody = !(e.state === 'burrowed' && e.sub !== 'sink') && !(e.state === 'emerge' && e.t < 60);
  if (showBody && !(e.state === 'ko' && e.t > 66)) groundShadow(ctx, sx, sy, 62, 0.35);
  if (e.state === 'emerge' && e.t < 70) {
    const k = clamp(e.t / 60, 0, 1);
    ctx.globalAlpha = 0.85;
    Px.oval(sx, sy, 10 + 40 * k, 3 + 9 * k, '#8a6438');
    Px.oval(sx, sy - 1, 6 + 34 * k, 2 + 7 * k, '#5a4024');
    ctx.globalAlpha = 1;
    if (e.t < 60) {   // bulging, trembling sand
      const j = (e.t >> 1) % 2 ? 1 : -1;
      Px.oval(sx + j, sy - 2 - 4 * k, 8 + 30 * k, 2 + 5 * k, scor_SAND[1]);
      Px.oval(sx + j - 4, sy - 4 - 5 * k, 4 + 18 * k, 1 + 3 * k, scor_SAND[0]);
    }
  }
  if (e.state === 'attack' && e.atk && e.atk.key === 'hammer' && e.tgt && e.atkPhase() === 'start') {
    const a = e.atk, lockAt = a.start - 12 - scor_tel(), k = clamp(e.t / a.start, 0, 1);
    // shrinks while tracking, then holds the true stinger radius once locked (the hit is |dx| <= 14 + half her width)
    const r = e.t >= lockAt ? 14 : lerp(20, 14, clamp(e.t / lockAt, 0, 1)), cx = Math.round(e.tgt.x - camX) + 0.5, cy = sy + Math.round(e.tgt.y - e.y) + 0.5;
    const locked = e.t >= lockAt;
    const col = locked ? ((e.t >> 1) % 2 ? '#ffffff' : '#ff4a2a') : '#ff4a2a';
    ctx.save();
    ctx.globalAlpha = locked ? 0.95 : 0.6 + 0.3 * k;
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.45, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = locked ? 0.25 : 0.12; ctx.fillStyle = '#ff4a2a'; ctx.fill();
    ctx.restore();
    const c = Math.floor(cx), cyy = Math.floor(cy);
    Px.rect(c - r - 4, cyy, 3, 1, col); Px.rect(c + r + 2, cyy, 3, 1, col);
    Px.rect(c, cyy - Math.round(r * 0.45) - 3, 1, 2, col); Px.rect(c, cyy + Math.round(r * 0.45) + 2, 1, 2, col);
    if (locked && e.t - lockAt < 3) { ctx.save(); ctx.globalAlpha = 0.8; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(cx, cy, r + 4, (r + 4) * 0.45, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  }
  if (e.state === 'burrowed' && e.sub === 'tele') {
    const k = clamp(e.t / (20 + scor_tel()), 0, 1), r = lerp(10, 30, k);
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.45 * k;
    ctx.strokeStyle = (e.t >> 1) % 2 ? scor_RED : '#ff7a50'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx + 0.5, sy + 0.5, r, r * 0.4, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.15; ctx.fillStyle = scor_RED; ctx.fill();
    ctx.restore();
  }
}
const scor_M_COL = { shell: '#9a4a22', plate: '#5e2a12', hi: '#e0904a', belly: '#c87a48', leg: '#4e2410', sting: '#f2f06a', stingTip: '#3a2a10', eye: '#2a1008' };
const scor_M_FAR = { shell: '#6e3418', plate: '#3e1c0c', hi: '#9a5a30' };
// Her pincers, much heavier than the rig's (far one behind the body, near one in front).
function scor_mClaw(o, far) {
  return (by, s) => {
    const cr = o.clawRaise || 0, raise = cr * 9 * s, cc = far ? scor_M_FAR : scor_M_COL;
    const sh = { x: 12 * s, y: by + (far ? -2 : 1) * s };
    const el = { x: 17.5 * s, y: by - 3 * s - raise * 0.5 + (far ? -3 * s : 0) };
    const hd = { x: 24 * s - (far ? 2 * s : 0), y: by - 2 * s - raise + (far ? -3 * s : 0) };
    scor_arm(sh.x, sh.y, el.x, el.y, 3.2 * s, cc);
    scor_arm(el.x, el.y, hd.x, hd.y, 2.8 * s, cc);
    scor_pincer(hd.x, hd.y, -0.15 - cr * 0.6, s * (far ? 0.85 : 0.95), o.clawOpen || 0, cc);
  };
}
// Plates, 6 yellow eyes and battle damage on top of the rig (rig-local coordinates).
function scor_mExtra(e) {
  return (out, by, s) => {
    const c = scor_M_COL;
    const segs = [[-16, 3.6, 3.4], [-11, 4.6, 4.2], [-5, 5.6, 4.8], [2, 6.2, 5.2]];
    for (const [x, rx, ry] of segs) {
      const cx = x * s, top = by - ry * s;
      Px.oval(cx, by - ry * s * 0.5, rx * s * 0.86, ry * s * 0.5, c.plate);
      Px.oval(cx, by - ry * s * 0.62, rx * s * 0.74, ry * s * 0.34, shade(c.shell, -0.12));
      Px.oval(cx - rx * s * 0.15, by - ry * s * 0.8, rx * s * 0.5, Math.max(1, ry * s * 0.12), c.hi);
      Px.poly([cx - 3, top + 3, cx + 1, top - 4, cx + 3, top + 3], c.plate);
      Px.dot(cx, top - 2, c.hi);
    }
    // head shield
    Px.oval(9 * s, by - 2.2 * s, 5.2 * s, 2.4 * s, c.plate);
    Px.oval(8.5 * s, by - 2.8 * s, 4.4 * s, 1.4 * s, c.shell);
    Px.rect(5 * s, by - 3.8 * s, 6 * s, 1, c.hi);
    // battle damage by phase
    if (e.phase >= 2) { Px.line(-6 * s, by - 4 * s, -2 * s, by - 1 * s, 1, '#2a1008'); Px.line(-2 * s, by - 1 * s, 0, by + s, 1, '#2a1008'); }
    if (e.phase >= 3) { Px.line(-14 * s, by - 2 * s, -10 * s, by, 1, '#2a1008'); Px.line(4 * s, by - 4 * s, 7 * s, by - 2 * s, 1, '#2a1008'); }
    // 6 eyes in two rows
    const glow = e.roarT > 0 || e.state === 'shrug' ? '#ffffff' : '#ffdd44';
    const eyes = [[31, -37], [37, -38], [43, -36], [34, -31], [40, -32], [46, -30]];
    const dy = by + 8 * s;
    for (const [ex, ey] of eyes) { Px.rect(ex - 1, ey + dy - 1, 4, 3, '#2a1008'); Px.rect(ex, ey + dy, 2, 2, glow); Px.dot(ex, ey + dy, '#fff6b0'); }
    // chelicerae under the head
    Px.rect(14 * s, by + 1 * s, 3 * s, 2 * s, c.plate); Px.rect(14.5 * s, by + 1.2 * s, 2 * s, 1, c.hi);
  };
}
function scor_mDraw() {
  const e = this, s = scor_M_S, c = scor_M_COL, g = Sprite.cur.ga;
  if (e.state === 'emerge' && e.t < 60) return;
  g.save();
  g.translate(-scor_M_OFF, 0);
  if (e.state === 'burrowed' && e.sub !== 'sink') {
    const k = e.sub === 'tele' ? clamp(e.t / (20 + scor_tel()), 0, 1) : 0;
    const j = e.sub === 'tele' ? ((e.t >> 1) % 2 ? 1 : -1) : 0;
    scor_mound(e, { rx: 20, ry: 5, rx2: 26, ry2: 8, specks: 6 }, k, j);
    g.restore();
    return;
  }
  const an = e.anim;
  const o = Object.assign({ s, legPhase: e.legPh || 0, clawOpen: 0.1 + 0.3 * Math.max(0, Math.sin(an * 0.07)), clawRaise: 0.1,
    bodyDip: 0.3 + 0.3 * Math.sin(an * 0.05), len: 0.9, thick: 1.05, L: 18, ox: 0, oy: 0 }, c);
  o.pose = scor_pshift(scor_TP.rest, Math.sin(an * 0.04) * 2, Math.sin(an * 0.05) * 1, Math.sin(an * 0.05) * 0.12);
  o.extra = scor_mExtra(e);
  let clip = null, sweep = null;
  if (e.phase >= 3) { o.glowCol = '#c04cff'; o.glowA = 0.12 + 0.1 * Math.sin(an * 0.2); }
  switch (e.state) {
    case 'emerge': {
      const k = easeOut(clamp((e.t - 60) / 16, 0, 1));
      o.oy = (1 - k) * 74; clip = 0;
      o.clawOpen = 1; o.clawRaise = 1; o.pose = scor_TP.mraise; o.quiver = e.t;
      if (e.t > 80 && e.t < 112) { o.bodyDip = -1; o.ox = Math.sin(e.t * 1.3) * 1; }
      break;
    }
    case 'walk':
      o.bodyDip = 0.5 * Math.abs(Math.sin(e.legPh)); o.clawOpen = 0.2;
      o.pose = scor_pshift(scor_TP.rest, Math.sin(e.legPh * 0.5) * 2, 0, 0.1 * Math.sin(e.legPh * 0.5));
      break;
    case 'hurt': case 'pinned': case 'grabbed': case 'held': {
      const k = e.state === 'hurt' ? clamp(1 - e.t / 12, 0, 1) : 0.7;
      o.ox = -4 * k; o.clawOpen = 0.9; o.clawRaise = 0.5 * k; o.bodyDip = 1;
      o.pose = scor_pl(scor_TP.rest, scor_TP.coil, 0.4 * k);
      break;
    }
    case 'shrug':
      o.bodyDip = -1.5; o.clawOpen = 1; o.clawRaise = 1; o.pose = scor_TP.mraise; o.quiver = e.t * 3;
      break;
    case 'burrowed': {   // sinking
      const k = clamp(e.t / 30, 0, 1);
      o.oy = k * 74; clip = 0; o.clawOpen = 0.6; o.clawRaise = 0.5; o.legPhase = (e.legPh || 0) + e.t * 0.6;
      break;
    }
    case 'erupt': {
      const k = easeOut(clamp(e.t / 10, 0, 1));
      o.oy = (1 - k) * 60; clip = 0;
      if (e.t >= 10) {   // 40 f dazed recovery
        o.clawOpen = 0.7; o.clawRaise = 0; o.bodyDip = 2;
        o.pose = scor_pshift(scor_pl(scor_TP.rest, scor_TP.limp, 0.45), Math.sin(e.t * 0.15) * 3, 0, 0);
        o.ox = Math.sin(e.t * 0.2) * 1.5;
      } else { o.clawOpen = 1; o.clawRaise = 1; o.pose = scor_TP.mraise; }
      break;
    }
    case 'ko': {
      const t = e.t;
      const fold = easeOut(clamp(t / 30, 0, 1));
      o.oy = fold * 9; clip = 0; o.bodyDip = 0;
      o.legPhase = (e.legPh || 0) + (t < 30 ? Math.sin(t * 0.9) * 0.5 : 0);
      o.clawOpen = 0.8 * (1 - fold); o.clawRaise = 0;
      const tk = clamp((t - 20) / 36, 0, 1);
      o.pose = scor_pl(scor_TP.rest, scor_TP.limp, tk * tk);
      o.quiver = t < 20 ? t * 2 : 0;
      if (t >= 66) { const b = clamp((t - 66) / 4, 0, 1); o.oy += b * 4; }
      break;
    }
    case 'attack': {
      const a = e.atk, ph = e.atkPhase(), t = e.t;
      if (!a) break;
      if (a.key === 'claw') {
        if (ph === 'start') {
          const k = easeOut(clamp(t / (a.start - 3), 0, 1));
          o.clawOpen = k; o.clawRaise = k; o.ox = -5 * k; o.bodyDip = -0.5 * k;
          o.pose = scor_pl(scor_TP.rest, scor_TP.coil, 0.5 * k);
        } else if (ph === 'active') {
          const k = clamp((t - a.start + 1) / a.active, 0, 1);
          o.clawOpen = 0.2; o.clawRaise = 0; o.ox = 6; o.bodyDip = 1;
          o.pose = scor_TP.coil;
          sweep = k;
        } else {
          const k = clamp((t - a.start - a.active) / a.rec, 0, 1);
          o.ox = 6 * (1 - k); o.clawOpen = 0.3; o.pose = scor_pl(scor_TP.coil, scor_TP.rest, k);
          if (k < 0.3) sweep = 1;
        }
      } else if (a.key === 'hammer') {
        const tgt = e.tgt || e.lodge || { x: e.x + e.facing * 90, y: e.y };
        if (ph === 'start') {
          const k = easeOut(clamp(t / 18, 0, 1));
          o.pose = scor_pl(scor_TP.rest, scor_TP.mraise, k);
          o.quiver = t * (t >= a.start - 12 ? 2.5 : 1.2);
          o.bodyDip = 1.5 * k; o.clawRaise = 0.6 * k; o.clawOpen = 0.6;
          o.sting = (t / 3 | 0) % 2 ? '#ffffff' : c.sting;
          if (t >= a.start - 3) o.P = scor_mSlamPose(e, tgt, (t - (a.start - 3)) / 3);
        } else if (ph === 'active') {
          o.P = scor_mSlamPose(e, tgt, 1); o.bodyDip = 2; o.ox = 2;
        } else {
          const lt = t - a.start - a.active;
          o.bodyDip = 2; o.ox = 2; o.clawOpen = 0.5;
          if (lt < 70) {
            o.P = scor_mSlamPose(e, e.lodge || tgt, 1); o.quiver = t * 1.3;
            o.glowCol = '#ffe14a'; o.glowA = 0.35 + 0.3 * Math.sin(t * 0.4);
          } else {
            const k = clamp((lt - 70) / (a.rec - 70), 0, 1);
            o.P = scor_pmix(scor_mSlamPose(e, e.yank || tgt, 1), scor_pscale(scor_TP.rest, s, 0.9, { x: -18 * s, y: -(8 - o.bodyDip) * s - s }), easeOut(k));
            o.ox = 2 * (1 - k);
          }
        }
      } else if (a.key === 'rain') {
        if (ph === 'start') {
          const k = clamp(t / a.start, 0, 1);
          o.pose = scor_pshift(scor_pl(scor_TP.rest, scor_TP.mraise, k), 0, Math.sin(t * 0.6) * 3 * k, 0);
          o.bodyDip = -1 * k; o.clawRaise = 0.8 * k; o.clawOpen = 0.8 * k;
          o.glowCol = '#c04cff'; o.glowA = 0.5 * k;
        } else if (ph === 'active') {
          const pump = Math.abs(Math.sin((t - a.start) * Math.PI / 4));
          o.pose = scor_pl(scor_TP.mraise, scor_TP.mspit, pump); o.bodyDip = -1; o.clawRaise = 0.8; o.clawOpen = 0.8;
          o.glowCol = '#c04cff'; o.glowA = 0.5;
        } else {
          o.pose = scor_pl(scor_TP.mspit, scor_TP.rest, clamp((t - a.start - a.active) / a.rec, 0, 1));
        }
      }
      break;
    }
  }
  if (e.jolt > 0) o.ox += (e.jolt % 2 ? -1 : 1) * Math.ceil(e.jolt / 3);
  o.before = scor_mClaw(o, true);
  if (sweep == null) { const near = scor_mClaw(o, false); o.after = (out, by) => near(by, s); }
  if (!o.n) o.n = o.P ? 9 : 7;
  if (clip != null) scor_clip(clip);
  const r = scor_body(o);
  if (sweep != null) {
    // the near claw lashes along the lane out to ~72 px from her front
    const sh = { x: 12 * s + o.ox, y: r.by + o.oy };
    const k = easeOut(sweep);
    const hx = lerp(60, 112, k) + o.ox, hy = lerp(-58, -16, k) + o.oy;
    const ex = lerp(sh.x, hx, 0.5), ey = Math.min(sh.y, hy) - 10;
    scor_arm(sh.x, sh.y, ex, ey, 3 * s, c);
    scor_arm(ex, ey, hx, hy, 2.6 * s, c);
    scor_pincer(hx, hy, lerp(-0.5, 0.25, k), s * 0.95, 0.5 * (1 - k) + 0.2, c);
  }
  if (clip != null) {
    g.restore();
    if (o.oy > 2) { Px.oval(0, 1, 70, 6, scor_SAND[1]); Px.oval(-6, 0, 60, 3, scor_SAND[0]); }
  }
  g.restore();
  if (scor_rimOn(e)) scor_rim();
}
// Tail chain from her tail root to the ground point `tg` (world coords), k = 0..1 blend from the raised pose.
function scor_mSlamPose(e, tg, k) {
  const s = scor_M_S, base = { x: -18 * s, y: -9 * s };
  const raised = scor_pscale(scor_TP.mraise, s, 0.9, base);
  const L = 18, ang = 1.4;
  const gx = (tg.x - scor_mRig(e)) * e.facing, gy = tg.y - e.y;
  const tip = { x: gx - Math.cos(ang) * (L + 4) - 4, y: gy - Math.sin(ang) * (L + 4) - 2 };
  const slam = { c1: { x: base.x - 6, y: base.y - 70 }, c2: { x: lerp(base.x, tip.x, 0.55), y: Math.min(base.y, tip.y) - 70 }, tip, ang };
  return scor_pmix(raised, slam, clamp(k, 0, 1));
}
function scor_pmix(a, b, k) {
  const L = (p, q) => ({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k) });
  return { c1: L(a.c1, b.c1), c2: L(a.c2, b.c2), tip: L(a.tip, b.tip), ang: lerp(a.ang, b.ang, k) };
}
function scor_mKOUpdate(e) {
  const t = e.t, rx = scor_mRig(e);
  e.vx = e.vy = 0;
  if (t === 1) Game.slowmo(120, 0.4);
  if (t < 30 && t % 6 === 0) { FX.dust(rx + rr(-50, 50), e.y, 2, 0.8); Sound.sfx('scorRattle', rx); }
  if (t === 56) {
    // the tail lands behind her
    const tx = rx - e.facing * 120;
    FX.shake(4, 12);
    FX.dustRing(tx, e.y, 14);
    scor_sandBurst(tx, e.y, 10, 2);
    Sound.sfx('scorSlam', tx);
  }
  if (t === 70) {
    // crumbles into 30 chitin chunks
    for (let i = 0; i < 30; i++) {
      FX.add({ kind: 'shard', x: rx + rr(-56, 56), y: e.y + rr(-3, 3), z: rr(6, 34), vx: rr(-2.6, 2.6), vz: rr(1.2, 4.2), life: ri(50, 80),
        color: pick(e.def.chitin), size: ri(4, 8), rot: rr(0, TAU), spin: rr(-0.3, 0.3), g: 0.24, ground: e.y });
    }
    FX.smoke(rx, e.y, 10, 8, '#a08a6a');
    FX.dustRing(rx, e.y, 20);
    FX.shake(4, 16);
    FX.pool(rx, e.y + 1, '#5e2a12', 60);
    Sound.sfx('crate', rx); Sound.sfx('hitShell', rx); Sound.sfx('thud', rx);
    for (const sac of e.sacs || []) if (!sac.remove) { sac.remove = true; sac.counted = true; FX.splat(sac.x, sac.y, sac.z, '#e8d8a0', 6, 1, true); }
    if (e.sting && !e.sting.remove) { e.sting.remove = true; e.sting.counted = true; }
    e.remove = true;
    if (e.onRemoved) e.onRemoved();
  }
  return true;
}

ENEMY_TYPES.matriarch = {
  name: 'THE MATRIARCH', family: 'scorpion', hp: 300, boss: true, barLayer: 100, score: 20000,
  w: 20, h: 40, speed: 0.8, weight: 2, shadowR: 0, launchable: false, armorTier: 3, noGrab: true, noSeparate: true,
  sprite: [340, 250, 170, 170],
  chitin: ['#9a4a22', '#5e2a12', '#e0904a'],
  coolMin: 70, coolMax: 70,
  deathSfx: 'scorShriek',
  attacks: {
    claw: { start: 28, active: 6, rec: 24, dmg: 12, tier: 3, knock: true, kx: 3.0, kz: 3.4, reach: [-8, 72], zr: [0, 34], depth: 14,
      tell: 'glint', glint: [56, -40], rim: true, whiff: 'whooshBig' },
    hammer: { start: 36, active: 1, rec: 80, dmg: 20, tier: 3, custom: true, tell: 'glint', glint: [-84, -94], rim: true },
    rain: { start: 24, active: 20, rec: 30, dmg: 8, tier: 2, custom: true, tell: 'glint', glint: [-84, -94] },
  },
  init() {
    scor_hookExplode();
    this.legPh = 0;
    this.phase = 1; this.atkN = 0; this.hitLog = []; this.broodT = 150; this.broodPulse = 0;
    this.coolMul = 1; this.turnT = 0; this.jolt = 0; this.roarT = 0;
    this.sacs = [];
    this.takeHit = scor_mTakeHit;
    this.drawMarker = scor_mDrawMarker;
    this.onHitFx = scor_mHitFx;
    this.onArmorHit = function () { this.jolt = 3; };
    Object.defineProperty(this, 'vulnerable', { get: scor_mVulnerable, configurable: true });
    let st = this.state;
    Object.defineProperty(this, 'state', { configurable: true, enumerable: true, get() { return st; },
      set(v) { if (v === 'pinned' && (st === 'emerge' || st === 'burrowed')) return; st = v; } });
    this.setState('emerge');
    this.noShadow = true;
  },
  stateUpdate: scor_mStateUpdate,
  think: scor_mThink,
  // claw-sweep smear crescent (screen space, so it gets no sprite outline)
  drawExtra(ctx, camX) {
    const a = this.state === 'attack' && this.atk;
    if (!a || a.key !== 'claw' || this.atkPhase() !== 'active') return;
    const k = 1 - (this.t - a.start) / a.active, f = this.facing, ox = this.x - camX, oy = this.y - this.z;
    const pts = [0, -66, 78, -40, 88, -6, 76, -14, 64, -36, 6, -58];
    ctx.save(); ctx.globalAlpha = 0.6 * k; Px.use(ctx);
    Px.poly(pts.map((v, i) => i % 2 ? oy + v : ox + f * v), '#ffffff');
    ctx.restore();
  },
  attackTick: scor_mAttackTick,
  drawBody: scor_mDraw,
  eyes() {
    if (this.state === 'burrowed' || (this.state === 'emerge' && this.t < 60)) return [];
    return [[31, -37], [37, -38], [43, -36], [34, -31], [40, -32], [46, -30]].map(([x, y]) => [x + 1 - scor_M_OFF, y + 2, '#ffdd44']);
  },
};

// ---------------------------------------------------------------- Matriarch parts
// Egg sacs: small enemies on her back (z 44-60, air attacks only), 10 HP, 1000 points, drop a cactus.
const scor_SAC_X = [-12, -28, -44];   // rig-local x
function scor_sacPlace(sac) {
  const b = sac.owner;
  const rx = scor_mRig(b);
  sac.facing = b.facing;
  sac.x = rx + b.facing * scor_SAC_X[sac.slot];
  sac.y = b.y;
  const bob = Math.sin(b.anim * 0.05) * 1;
  sac.z = 44 - bob;
  sac.hidden = b.state === 'burrowed' || b.state === 'emerge' && b.t < 60 || b.state === 'ko' && b.t > 66 || b.state === 'erupt' && b.t < 8;
  // rising out of the sand with her
  sac.lift = 0;
  if (b.state === 'emerge') sac.lift = (1 - easeOut(clamp((b.t - 60) / 16, 0, 1))) * 74;
  if (b.state === 'ko') sac.lift = easeOut(clamp(b.t / 30, 0, 1)) * 9;
}
ENEMY_TYPES.scor_sac = {
  name: 'EGG SAC', family: 'scorpion', hp: 10, score: 1000, w: 7, h: 16, noGrab: true, noToken: true, launchable: false, noFlip: true, noSeparate: true,
  shadowR: 0, sprite: [40, 40, 20, 30], chitin: ['#e8d8a0', '#c8a860', '#f2e8c0'], deathSfx: 'scorSquelch',
  attacks: {},
  init() {
    const sac = this;
    sac.noShadow = true;
    sac.update = function () {
      this.t++; this.anim++;
      if (this.flash > 0) this.flash--;
      if (this.tintT > 0) this.tintT--;
      if (this.inv > 0) this.inv--;
      const b = this.owner;
      if (!b || b.remove) { this.remove = true; this.counted = true; return; }
      scor_sacPlace(this);
    };
    Object.defineProperty(sac, 'vulnerable', { configurable: true, get() {
      const p = Game.player;
      return !this.remove && !this.dying && this.hp > 0 && !this.hidden && this.inv <= 0 && !!p && p.airborne && !!this.owner && !this.owner.dying;
    } });
    sac.takeHit = function (src, a, dir, nth) { Enemy.prototype.takeHit.call(this, src, a, dir, nth); this.hs = 0; };
    sac.sortY = function () { return this.owner ? this.owner.y + 0.5 : this.y; };
    sac.draw = function (ctx, camX) { if (this.hidden || this.remove) return; Enemy.prototype.draw.call(this, ctx, camX); };
  },
  onDeath() {
    const b = this.owner;
    FX.splat(this.x, this.y, this.z + 6, '#e8d8a0', 10, b ? -b.facing : 1, true);
    FX.splat(this.x, this.y, this.z + 6, '#c8a860', 6, b ? b.facing : 1, true);
    FX.add({ kind: 'ring', x: this.x, y: this.y, z: this.z + 6, life: 10, size: 16, color: '#f2e8c0', g: 0 });
    Game.add(new Item('cactus', this.x, this.y, 2.2));
    this.remove = true;
    if (b) { b.jolt = 6; Sound.sfx('scorShriek', b.x); }
  },
  drawBody() {
    const b = this.owner, an = b ? b.anim : this.anim;
    const pulse = b && b.broodPulse > 0 ? 1.1 + 0.15 * Math.abs(Math.sin(b.broodPulse * 0.4)) : 1.0 + 0.1 * (0.5 + 0.5 * Math.sin((an + this.slot * 13) * TAU / 40));
    const r = 6 * pulse, cy = -8 + (this.lift || 0);
    if (this.lift) scor_clip(this.z);
    // membrane stalk to her back
    Px.rect(-2, cy + 3, 4, 6, '#a8784a');
    Px.disc(0, cy + 8, 3, '#7a4a2a');
    Px.disc(0, cy, r + 0.6, '#8a6a3a');
    Px.disc(0, cy, r, '#e8d8a0');
    Px.disc(0.5, cy + 1, r * 0.55, '#c8a860');
    // the brood wriggling inside
    const w = Math.sin(an * 0.3 + this.slot) * 1.2;
    Px.dot(-1 + w, cy, '#6a4a22'); Px.dot(1 - w, cy + 2, '#6a4a22');
    if (b && b.broodPulse > 0) { Px.dot(w * 1.5, cy - 2, '#3a2a10'); Px.dot(2, cy + w, '#3a2a10'); }
    Px.disc(-r * 0.35, cy - r * 0.4, r * 0.28, '#fff8e0');
    Px.dot(-r * 0.5, cy + r * 0.3, '#f2e8c0');
    if (this.lift) Sprite.cur.ga.restore();
  },
};
// Lodged stinger: a 16x16 hurtbox at the slam point that forwards hits to her at 2x damage.
ENEMY_TYPES.scor_sting = {
  name: 'STINGER', family: 'scorpion', hp: 999, score: 0, w: 8, h: 16, noGrab: true, noToken: true, launchable: false, noFlip: true, noSeparate: true,
  shadowR: 0, attacks: {}, chitin: ['#f2f06a', '#5e2a12'],
  init() {
    const pt = this;
    pt.noShadow = true;
    pt.update = function () {
      this.t++;
      const b = this.owner;
      if (!b || b.remove || b.dying) { this.remove = true; this.counted = true; return; }
      if (b.lodge) { this.x = b.lodge.x; this.y = b.lodge.y; }
    };
    Object.defineProperty(pt, 'vulnerable', { configurable: true, get() { const b = this.owner; return !!b && !!b.lodge && !b.dying && !b.remove && b.state === 'attack' && b.inv <= 0; } });
    pt.takeHit = function (src, a, dir, nth) {
      const b = this.owner;
      if (!b || !b.lodge) return;
      if (src && src.atkHit) { if (src.atkHit.has(b.id)) return; src.atkHit.add(b.id); }
      b.takeHit(src, Object.assign({}, a, { dmgMul: (a.dmgMul || 1) * 2, viaPart: this }), dir, nth);
      this.hs = 0;
    };
    pt.draw = function () {};
  },
  drawBody() {},
};

// ================================================================ ScorpionClaw (stage 1 foreshadow)
// Game.add(new ScorpionClaw(x, y, victim)): a giant pincer bursts from the sand at (x, y), clamps the
// victim enemy and drags it under over 30 f, leaving a lead pipe. No text, no score.
class ScorpionClaw extends Ent {
  constructor(x, y, victim) {
    super(x, y);
    this.team = 'fx';
    this.shadowR = 0;
    this.victim = victim || null;
    this.facing = victim && victim.x < x ? -1 : 1;
    this.k = 2.5;
    this.c = { shell: '#9a4a22', plate: '#5e2a12', hi: '#e0904a' };
    this.open = 1; this.hand = { x: 0, y: 0 }; this.sink = 0;
  }
  grabVictim() {
    const v = this.victim;
    if (!v || v.remove) { this.victim = null; return; }
    v.atk = null;
    if (v.dropToken) v.dropToken();
    if (v.grabbedBy && v.releaseGrab) v.releaseGrab();
    v.setState('pinned');
    v.vx = v.vy = v.vz = 0;
    v.inv = 999;
    v.counted = true;
    this.vx0 = v.x;
    const vd = v.draw;
    v.draw = function (ctx, camX) {   // clip the body at the sand line while it is dragged under
      ctx.save();
      ctx.beginPath(); ctx.rect(-80, -80, W + 160, Math.round(this.y) + 81); ctx.clip();
      vd.call(this, ctx, camX);
      ctx.restore();
    };
  }
  update() {
    const t = ++this.t, v = this.victim;
    if (t === 1) {
      scor_sandBurst(this.x, this.y, 22, 3.4);
      FX.dustRing(this.x, this.y, 12);
      FX.shake(3, 12);
      Sound.sfx('scorErupt', this.x); Sound.sfx('scorRattle', this.x);
      this.grabVictim();
    }
    const v2 = this.victim;
    // 1-8: the pincer shoots up and toward the victim; 8: it clamps shut
    if (t <= 8) {
      const k = easeOut(t / 8);
      this.hand = { x: lerp(0, 14, k), y: lerp(4, -36, k) };
      this.open = 1;
      if (v2) { v2.x = lerp(this.vx0, this.x + this.facing * 10, easeOut(t / 8)); v2.facing = -this.facing; }
    } else if (t <= 38) {
      const k = (t - 8) / 30;
      this.open = Math.max(0, 1 - (t - 8) / 3);
      this.sink = (k * 0.55 + k * k * 0.45) * 54;
      this.hand = { x: lerp(14, 10, Math.min(1, (t - 8) / 4)), y: lerp(-36, -22, Math.min(1, (t - 8) / 4)) + this.sink };
      if (t === 9) { Sound.sfx('grab', this.x); Sound.sfx('hitShell', this.x); FX.shake(2, 6); }
      if (v2) {
        v2.x = this.x + this.facing * 10 + Math.sin(t * 1.3) * (1 - k);
        v2.z = -this.sink;
        v2.noShadow = this.sink > 8;
      }
      if (t % 2 === 0) scor_sandBurst(this.x + this.facing * 8 + rr(-6, 6), this.y, 3, 2.2);
      if (t % 8 === 0) { Sound.sfx('burrow', this.x); FX.shake(1, 4); }
    }
    if (t === 38) {
      if (v2) { v2.remove = true; v2.counted = true; }
      this.victim = null;
      const it = Game.add(new Item('pipe', this.x + this.facing * 10, this.y, 2.2));
      it.vx = this.facing * 0.5;
      FX.dustRing(this.x + this.facing * 8, this.y, 10);
      scor_sandBurst(this.x + this.facing * 8, this.y, 8, 1.6);
      Sound.sfx('thud', this.x);
    }
    if (t >= 70) this.remove = true;
  }
  sortY() { return this.victim ? this.victim.y + 0.5 : this.y; }
  draw(ctx, camX) {
    const t = this.t, k = this.k, c = this.c;
    Sprite.begin(120, 110, 60, 96);
    const g = Sprite.cur.ga;
    // sand crater
    const ck = clamp(t / 6, 0, 1) * (t > 50 ? Math.max(0, 1 - (t - 50) / 20) : 1);
    Px.oval(8, 0, 18 * ck, 4 * ck, '#a87a40');
    Px.oval(8, 0, 13 * ck, 2.5 * ck, '#5a4024');
    if (t < 38) {
      scor_clip(0);
      const h = this.hand;
      const base = { x: -2, y: 20 }, el = { x: lerp(base.x, h.x, 0.3) - 8, y: lerp(base.y, h.y, 0.55) };
      scor_arm(base.x, base.y, el.x, el.y, 3.2 * k, c);
      scor_arm(el.x, el.y, h.x, h.y, 2.8 * k, c);
      // spines on the arm
      Px.poly([el.x - 3, el.y - 2, el.x - 7, el.y - 7, el.x + 1, el.y - 4], c.plate);
      const ang = Math.atan2(h.y - el.y, h.x - el.x) * 0.6;
      scor_pincer(h.x, h.y, ang, k, this.open, c);
      g.restore();
    }
    // the sand lip in front of the arm
    if (t < 60) {
      const lk = clamp(t / 4, 0, 1) * (t > 44 ? Math.max(0, 1 - (t - 44) / 16) : 1);
      Px.oval(6, 2, 16 * lk, 3 * lk, scor_SAND[1]);
      Px.oval(4, 1, 12 * lk, 1.5 * lk, scor_SAND[0]);
    }
    Sprite.end(ctx, this.x - camX, this.y, this.facing, {});
  }
}
