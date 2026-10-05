// Stage 1: RUST ROW. Dusk scrap town, world x 0..2688, depth band y 134..200.
// Parallax: sky 0, far skyline 0.1, mid container shanties 0.35, back wall + floor 1.0, foreground 1.3.
// Static layers are painted once into offscreen canvases; per frame only lights, flames and smoke animate.
// Set pieces: tutorial strip (W1), BIKER RUN (lock 960), SLAB (lock 1344), THE BURNING BUS (W3, lock 1824),
// SOMETHING UNDER THE ROAD (x 2150, no lock) and BIG DIESEL behind the skull garage door (lock 2304).
// Everything lives inside this IIFE; the only shared name touched is STAGES[0].
(function s1_module() {
  const LEN = 2688, PAD = 16;
  const SKY = [[0, '#1e1230'], [40, '#6a2a3e'], [80, '#d2553a'], [110, '#f2a04a']];
  const COL = {
    sun: '#ffc46a', skyline: '#3a1e36', skyRim: '#5a2a48', win: '#ffb04a', beacon: '#ff3b30',
    cont: ['#5a2e2a', '#7a4a34', '#4a3a44'], pole: '#24141c', wire: '#1a0c12',
    fence: ['#5a4636', '#6b5440'], ridge: '#4a3828', rim: '#b08460', paint: '#e8e0d0', door: '#1a1012',
    asphalt: '#3e3530', crack: '#2a2220', lane: '#8a7a5a', sand: '#8c6a44', sandHi: '#a8845a', sandDk: '#6e5236',
    fire: '#ff8a2a', fireHi: '#ffe066', fireDk: '#e83b1e', bulb: '#ffd27a', fg: '#140c0e',
    bus: '#d9a12b', busDk: '#a8761c', busHi: '#ecc25a', stripe: '#1a1414', busWin: '#ff8a1c', smoke: '#4a4040', husk: '#1e1616',
  };
  // The spec puts the sun at screen (290, 96), which the back wall (y 70..134) would hide completely,
  // so it sits higher, low over the skyline, with its three cut bands at the same offsets (-4, +2, +8).
  const SUN = { x: 290, y: 56, r: 22 };
  const DOORS = [560, 1000, 1880, 2360];          // back-wall doorways (centre x), 20x40
  const SKULLS = [80, 480, 880, 1280, 1680, 2080]; // jackal graffiti every 400 px (2480 is the giant garage skull)
  const SIGN_X = 300;
  const GARAGE = { x: 2496, w: 112, top: 76, fx0: 2424, fx1: 2568 };
  const BUS = { x0: 1900, x1: 2020, cx: 1960, door: 1912, lock: 1824 };
  const BEAT_X = 2150;
  const FAR_H = 112, FAR_BASE = 106, MID_H = 100, WALL_Y0 = 48, WALL_H = 94, FLOOR_Y0 = 134, FLOOR_H = 90;

  // ---------- helpers ----------
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return '#' + A.map((v, i) => clamp(Math.round(v + (B[i] - v) * t), 0, 255).toString(16).padStart(2, '0')).join('');
  }
  function skyAt(y) {
    if (y <= SKY[0][0]) return SKY[0][1];
    for (let i = 1; i < SKY.length; i++) {
      if (y <= SKY[i][0]) return mix(SKY[i - 1][1], SKY[i][1], (y - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]));
    }
    return SKY[SKY.length - 1][1];
  }
  // Local deterministic RNG for scenery (never touches the game's seeded rand()).
  function mkRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(n) {
    let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }
  function mkCanvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { cv, g };
  }
  function withAlpha(g, a, fn) { const p = g.globalAlpha; g.globalAlpha = a; fn(); g.globalAlpha = p; }

  // Stage-local runtime state (reset in setup).
  const S = { bus: null, beat: null, tutT: 0, garage: { k: 0, opening: false }, bw: null, lastFrame: -1, cleanT: 0 };
  const cache = { sky: null, far: null, mid: null, wall: null, floor: null, garageDoor: null };
  const farWins = [], midBulbs = [], midChims = [];
  let mastTop = null;

  // ---------- L0 sky (parallax 0) ----------
  const SKY_Y0 = -8, SKY_H = 132;
  function buildSky() {
    const { cv, g } = mkCanvas(W + 16, SKY_H);
    g.translate(8, -SKY_Y0);
    Px.use(g);
    // gradient in 3 px bands with a checker-dithered seam row between bands
    const BAND = 3;
    for (let y = SKY_Y0; y < SKY_Y0 + SKY_H; y++) {
      const b = Math.floor((y - SKY_Y0) / BAND);
      const c = skyAt(SKY_Y0 + b * BAND + 1);
      if ((y - SKY_Y0) % BAND === 0 && b > 0) {
        Px.rect(-8, y, W + 16, 1, skyAt(SKY_Y0 + (b - 1) * BAND + 1));
        for (let x = -8 + (y & 1); x < W + 8; x += 2) Px.dot(x, y, c);
      } else Px.rect(-8, y, W + 16, 1, c);
    }
    // first stars of the evening
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(hash(i * 3 + 1) * W), y = 2 + Math.floor(hash(i * 3 + 2) * 30);
      Px.dot(x, y, hash(i * 3 + 3) < 0.3 ? '#c8a0c0' : '#7a5a8a');
    }
    // sun halo, disc and cut bands
    withAlpha(g, 0.10, () => Px.disc(SUN.x, SUN.y, SUN.r + 14, '#ff9a4a'));
    withAlpha(g, 0.16, () => Px.disc(SUN.x, SUN.y, SUN.r + 7, '#ffb05a'));
    for (let dy = -SUN.r; dy <= SUN.r; dy++) {
      const w = Math.sqrt(SUN.r * SUN.r - dy * dy);
      if (w < 0.5) continue;
      const c = dy < -13 ? '#ffe4a0' : dy < -5 ? '#ffd383' : COL.sun;
      Px.rect(Math.round(SUN.x - w), SUN.y + dy, Math.round(w * 2), 1, c);
    }
    for (const d of [-4, 2, 8]) {
      for (let k = 0; k < 2; k++) {
        const dy = d + k, w = Math.sqrt(Math.max(0, SUN.r * SUN.r - dy * dy)) + 1;
        Px.rect(Math.round(SUN.x - w), SUN.y + dy, Math.round(w * 2), 1, skyAt(SUN.y + dy));
      }
    }
    // thin streak clouds, lit from below
    const clouds = [[18, 30, 96], [150, 41, 70], [236, 49, 128], [318, 36, 60], [40, 58, 110]];
    for (const [x, y, w] of clouds) {
      const c = mix(skyAt(y), '#2a1030', 0.5);
      Px.poly([x, y + 1, x + 7, y - 1, x + w - 12, y - 1, x + w, y + 1, x + w - 8, y + 2, x + 5, y + 2], c);
      withAlpha(g, 0.55, () => Px.rect(x + 6, y + 2, w - 16, 1, '#ff9a5a'));
      Px.rect(x + 12, y - 2, Math.round(w * 0.4), 1, c);
    }
    return cv;
  }

  // ---------- L1 far skyline (parallax 0.1) ----------
  function buildFar() {
    const wpx = Math.round((LEN - W) * 0.1) + W + PAD * 2;
    const { cv, g } = mkCanvas(wpx, FAR_H);
    g.translate(PAD, 0);
    Px.use(g);
    const r = mkRng(0x51a7);
    const n = 14, span = wpx - PAD * 2 + 24;
    const tops = [];
    for (let i = 0; i < n; i++) {
      const bw = 20 + Math.floor(r() * 31), bh = 30 + Math.floor(r() * 51);
      let x = Math.round(-12 + (i + 0.5) * span / n - bw / 2 + (r() - 0.5) * 18);
      if (x + bw > SUN.x - 16 && x < SUN.x + 12) x = x + bw / 2 < SUN.x ? SUN.x - 16 - bw : SUN.x + 12; // a gap for the sun
      const top = FAR_BASE - bh;
      const pts = [x, FAR_BASE + 4];
      const k = 2 + Math.floor(r() * 3);
      const edge = [];
      for (let j = 0; j <= k; j++) {
        const px = x + Math.round(bw * j / k), py = top + Math.round(j === 0 || j === k ? r() * 4 : r() * 10 - 3);
        pts.push(px, py); edge.push(px, py);
      }
      pts.push(x + bw, FAR_BASE + 4);
      Px.poly(pts, COL.skyline);
      for (let j = 0; j + 3 < edge.length; j += 2) Px.line(edge[j], edge[j + 1], edge[j + 2], edge[j + 3], 1, COL.skyRim);
      // exposed girders on broken towers
      if (r() < 0.3) for (let b = 0; b < 3; b++) { const gx = x + 3 + Math.floor(r() * (bw - 6)); Px.line(gx, top + 2, gx + Math.round(r() * 4 - 2), top - 3 - Math.floor(r() * 6), 1, COL.skyline); }
      for (let wy = top + 8; wy < FAR_BASE - 4; wy += 5) {
        for (let wx = x + 3; wx < x + bw - 3; wx += 4) if (r() < 0.2) farWins.push({ x: wx, y: wy, on: r() < 0.55 });
      }
      tops.push({ x, bw, top });
    }
    // leaning radio mast on a low roof
    const host = tops.slice(2, 7).sort((a, b) => b.top - a.top)[0];
    const bx = host.x + Math.round(host.bw / 2), by = host.top + 2;
    const hgt = Math.max(24, Math.min(46, by - 28)), ax = bx + Math.round(hgt * 0.2), ay = by - hgt;
    Px.line(bx - 4, by, ax - 1, ay, 1, COL.skyline);
    Px.line(bx + 4, by, ax + 1, ay, 1, COL.skyline);
    const steps = Math.floor(hgt / 5);
    for (let s = 0; s < steps; s++) {
      const k0 = s / steps, k1 = (s + 1) / steps;
      const lx0 = lerp(bx - 4, ax - 1, k0), ly0 = lerp(by, ay, k0), rx1 = lerp(bx + 4, ax + 1, k1), ry1 = lerp(by, ay, k1);
      Px.line(lx0, ly0, rx1, ry1, 1, COL.skyline);
      Px.line(lerp(bx - 4, ax - 1, k1), lerp(by, ay, k1), lerp(bx + 4, ax + 1, k0), lerp(by, ay, k0), 1, COL.skyline);
    }
    Px.line(ax, ay, ax, ay - 5, 1, COL.skyline);
    Px.rect(ax - 3, ay + 6, 3, 1, COL.skyline); Px.oval(ax + 3, ay + 9, 2, 3, COL.skyline);
    withAlpha(g, 0.6, () => { Px.line(ax, ay + 4, bx - 22, by + 4, 1, COL.skyline); Px.line(ax, ay + 4, bx + 24, by + 6, 1, COL.skyline); });
    mastTop = { x: ax, y: ay - 6 };
    return cv;
  }
  function drawFarDyn(ctx, off, frame, tick) {
    for (const w of farWins) {
      if (tick && Math.random() < 0.01) w.on = !w.on;
      if (!w.on) continue;
      const sx = w.x - off;
      if (sx < -9 || sx > W + 9) continue;
      Px.rect(sx, w.y, 1, 2, COL.win);
    }
    if (mastTop && frame % 60 < 22) {
      const sx = mastTop.x - off, y = mastTop.y;
      ctx.globalAlpha = 0.3; Px.disc(sx, y, 3.5, COL.beacon); ctx.globalAlpha = 1;
      Px.rect(sx - 1, y - 1, 2, 2, COL.beacon); Px.dot(sx - 1, y - 1, '#ffb0a0');
    }
  }

  // ---------- L2 mid shanties (parallax 0.35) ----------
  function container(x, y, col, r) {
    const dk = shade(col, -0.2);
    Px.rect(x, y, 40, 18, col);
    for (let cx = x + 2; cx < x + 39; cx += 3) Px.rect(cx, y + 2, 1, 15, dk);
    Px.rect(x, y, 40, 1, shade(col, 0.32));
    Px.rect(x, y + 1, 40, 1, shade(col, 0.12));
    Px.rect(x, y + 17, 40, 1, shade(col, -0.45));
    Px.rect(x, y, 1, 18, shade(col, -0.35)); Px.rect(x + 39, y, 1, 18, shade(col, -0.35));
    const f = r();
    if (f < 0.4) { // lit hut window
      const wx = x + 5 + Math.floor(r() * 26);
      Px.rect(wx - 1, y + 4, 8, 7, shade(col, -0.55));
      Px.rect(wx, y + 5, 6, 5, COL.bulb);
      Px.rect(wx + 3, y + 5, 1, 5, shade(col, -0.55)); Px.rect(wx, y + 7, 6, 1, shade(col, -0.55));
      withAlpha(Px.g, 0.18, () => Px.rect(wx - 3, y + 11, 12, 3, COL.bulb));
    } else if (f < 0.6) {
      const dx = x + 4 + Math.floor(r() * 28);
      Px.rect(dx, y + 4, 7, 14, '#1a0e12'); Px.rect(dx, y + 4, 7, 1, shade(col, 0.2));
    }
    if (r() < 0.6) withAlpha(Px.g, 0.4, () => Px.oval(x + 6 + r() * 28, y + 6 + r() * 8, 3 + r() * 4, 2 + r() * 2, '#8c5a3c'));
  }
  function stackAt(x, base, n, r) {
    let top = base, lx = x;
    for (let j = 0; j < n; j++) {
      lx = x + (j ? Math.round((r() - 0.5) * 12) : 0);
      top -= 18;
      container(lx, top, pick3(COL.cont, r), r);
    }
    // skewed sheet-metal roof
    const lean = r() < 0.5, roof = shade(pick3(COL.cont, r), -0.4);
    const yl = top + (lean ? -6 : 1), yr = top + (lean ? 1 : -6);
    Px.poly([lx - 4, yl, lx + 44, yr, lx + 44, yr + 3, lx - 4, yl + 3], roof);
    Px.line(lx - 4, yl, lx + 44, yr, 1, '#c8784a');
    // rooftop junk
    const j = r();
    if (j < 0.35) { const cx = lx + 6 + Math.floor(r() * 26); Px.rect(cx, top - 13, 3, 12, '#2a1a1e'); Px.rect(cx - 1, top - 14, 5, 2, '#3a2428'); midChims.push({ x: cx + 1, y: top - 15, ph: r() * 100 }); }
    else if (j < 0.6) { const ax = lx + 8 + Math.floor(r() * 24); Px.line(ax, top - 2, ax, top - 18, 1, COL.wire); Px.rect(ax - 3, top - 15, 7, 1, COL.wire); Px.rect(ax - 2, top - 11, 5, 1, COL.wire); }
    else if (j < 0.8) { const dx = lx + 10 + Math.floor(r() * 20); Px.oval(dx, top - 6, 4, 3, '#6a5a5a'); Px.oval(dx + 1, top - 6, 2, 2, '#4a3e40'); Px.line(dx, top - 3, dx, top, 1, '#3a2a2e'); }
    else { const bx = lx + 8 + Math.floor(r() * 22); Px.rect(bx, top - 9, 7, 9, '#4a3a34'); Px.rect(bx, top - 7, 7, 1, '#2e2420'); Px.rect(bx, top - 3, 7, 1, '#2e2420'); }
    return { top, x: lx };
  }
  function pick3(arr, r) { return arr[Math.floor(r() * arr.length)]; }
  function buildMid() {
    const wpx = Math.round((LEN - W) * 0.35) + W + PAD * 2;
    const { cv, g } = mkCanvas(wpx, MID_H);
    g.translate(PAD, 0);
    Px.use(g);
    const r = mkRng(0x2a3b);
    // faint far row of shacks for depth
    for (let x = -PAD; x < wpx; x += 26 + Math.floor(r() * 20)) {
      const h = 14 + Math.floor(r() * 16), w = 22 + Math.floor(r() * 18);
      Px.rect(x, 82 - h, w, h + 20, '#3e1c30');
      Px.line(x, 82 - h, x + w, 82 - h - Math.round(r() * 4 - 2), 1, '#5a2a40');
    }
    // poles + sagging bulb wires, water tower, billboard and container stacks
    const poles = [];
    const stacks = [];
    let x = -14;
    while (x < wpx - PAD) {
      const skip = (x > 150 && x < 245) || (x > 236 && x < 334) || (x > 595 && x < 700);
      if (!skip) {
        const n = r() < 0.45 ? 3 : 2;
        const s = stackAt(x, 92 + Math.floor(r() * 7), n, r);
        stacks.push(s);
      }
      x += 46 + Math.floor(r() * 34);
    }
    // water tower "DRY" (tank 36x26 on 4 splayed legs)
    const tx = 200, tTop = 26, tBot = 52;
    const leg = '#2e1a20';
    Px.line(tx - 14, tBot, tx - 22, 96, 2, leg); Px.line(tx - 5, tBot, tx - 7, 96, 2, leg);
    Px.line(tx + 5, tBot, tx + 7, 96, 2, leg); Px.line(tx + 14, tBot, tx + 22, 96, 2, leg);
    for (let k = 0; k < 2; k++) {
      const y0 = tBot + 6 + k * 18, y1 = y0 + 16;
      const sp0 = (y0 - tBot) / (96 - tBot) * 8, sp1 = (y1 - tBot) / (96 - tBot) * 8;
      Px.line(tx - 14 - sp0, y0, tx + 14 + sp1, y1, 1, leg); Px.line(tx + 14 + sp0, y0, tx - 14 - sp1, y1, 1, leg);
    }
    Px.rect(tx - 21, tBot, 42, 2, '#3a2228'); // catwalk
    for (let k = -20; k <= 20; k += 4) Px.rect(tx + k, tBot - 4, 1, 4, '#3a2228');
    Px.rect(tx - 21, tBot - 4, 42, 1, '#3a2228');
    const tank = '#5a3230';
    Px.rect(tx - 18, tTop, 36, tBot - tTop, tank);
    Px.rect(tx - 18, tTop, 5, tBot - tTop, shade(tank, -0.3));
    Px.rect(tx + 13, tTop, 5, tBot - tTop, shade(tank, 0.18));
    Px.rect(tx + 17, tTop, 1, tBot - tTop, '#e07a50'); // sunset rim on the sun side
    Px.rect(tx - 18, tTop + 7, 36, 1, '#2e1a1e'); Px.rect(tx - 18, tBot - 6, 36, 1, '#2e1a1e');
    Px.poly([tx - 20, tTop + 1, tx, tTop - 10, tx + 20, tTop + 1], '#3e2226');
    Px.line(tx, tTop - 10, tx + 20, tTop + 1, 1, '#e07a50');
    Px.line(tx, tTop - 10, tx, tTop - 15, 1, '#3e2226');
    for (let k = 0; k < 4; k++) withAlpha(g, 0.5, () => Px.rect(tx - 12 + k * 7 + Math.floor(r() * 3), tTop + 8, 1, 4 + Math.floor(r() * 10), '#8c5a3c'));
    drawText(g, 'DRY', tx - 1, tTop + 10, '#c9b9a0', 2, 'center', '#2a1618');
    for (let k = 0; k < 26; k++) Px.dot(tx - 17 + Math.floor(r() * 34), tTop + 10 + Math.floor(r() * 14), tank); // flaked paint
    for (const dx of [-14, -8, 3, 11]) Px.rect(tx + dx, tTop + 24, 1, 1 + Math.floor(r() * 3), '#c9b9a0');
    Px.line(tx + 22, 96, tx + 15, tBot, 1, '#4a2a30'); // ladder
    for (let ly = tBot + 4; ly < 94; ly += 4) { const k = (ly - tBot) / (96 - tBot); Px.rect(tx + 15 + k * 7 - 3, ly, 4, 1, '#4a2a30'); }
    // billboard: the King's propaganda, sun-bleached and torn
    const bx = 640, bTop = 26;
    Px.rect(bx - 28, bTop + 26, 2, 96 - bTop - 26, COL.pole); Px.rect(bx + 26, bTop + 26, 2, 96 - bTop - 26, COL.pole);
    Px.rect(bx - 36, bTop, 72, 28, '#2a1c22');
    Px.rect(bx - 34, bTop + 2, 68, 24, '#7a5e52');
    Px.rect(bx - 34, bTop + 2, 68, 1, '#a07e68');
    withAlpha(g, 0.35, () => Px.rect(bx - 34, bTop + 14, 68, 12, '#4a3a3a'));
    drawText(g, 'THE KING', bx, bTop + 5, '#e8d4b0', 1, 'center', '#3a2a2a');
    drawText(g, 'PROVIDES', bx, bTop + 15, '#e8d4b0', 1, 'center', '#3a2a2a');
    Px.poly([bx + 18, bTop + 2, bx + 34, bTop + 2, bx + 34, bTop + 16, bx + 27, bTop + 9], '#2a1c22');
    Px.poly([bx - 34, bTop + 20, bx - 26, bTop + 26, bx - 34, bTop + 26], '#2a1c22');
    for (let k = 0; k < 5; k++) Px.rect(bx - 30 + k * 14, bTop - 3, 1, 3, COL.pole);
    // poles at stack gaps, wires strung with bulbs
    for (let i = 0; i + 1 < stacks.length; i++) {
      const a = stacks[i], b = stacks[i + 1];
      const px = Math.round((a.x + 40 + b.x) / 2);
      if ((px > 150 && px < 250) || (px > 595 && px < 700)) continue;
      const py = Math.min(a.top, b.top) - 6 - Math.floor(r() * 12);
      poles.push({ x: px, y: py });
    }
    for (const p of poles) { Px.rect(p.x, p.y, 2, 96 - p.y, COL.pole); Px.rect(p.x - 4, p.y + 2, 10, 1, COL.pole); }
    for (let i = 0; i + 1 < poles.length; i++) {
      const a = poles[i], b = poles[i + 1];
      if (b.x - a.x > 200) continue;
      for (const [o0, o1, sag] of [[-3, 5, 7 + r() * 7], [5, -3, 11 + r() * 6]]) {
        const x0 = a.x + 1 + o0, y0 = a.y + 2, x1 = b.x + 1 + o1, y1 = b.y + 2;
        const len = Math.ceil(Math.abs(x1 - x0));
        let next = 4 + Math.floor(r() * 5);
        for (let s = 0; s <= len; s++) {
          const t = s / len, wx = lerp(x0, x1, t), wy = lerp(y0, y1, t) + sag * 4 * t * (1 - t);
          Px.dot(wx, wy, COL.wire);
          if (o0 < 0 && s === next) { midBulbs.push({ x: Math.round(wx), y: Math.round(wy) + 1, ph: r() * TAU, flick: r() < 0.14, c: r() < 0.18 ? '#ff9a5a' : COL.bulb }); next += 7 + Math.floor(r() * 4); }
        }
      }
    }
    return cv;
  }
  function drawMidDyn(ctx, off, frame) {
    for (const c of midChims) {
      const sx = c.x - off;
      if (sx < -30 || sx > W + 30) continue;
      for (let k = 0; k < 5; k++) {
        const age = (frame * 0.4 + c.ph + k * 26) % 130;
        const a = 0.32 * (1 - age / 130);
        ctx.globalAlpha = a;
        Px.disc(sx + age * 0.14 + Math.sin(age * 0.08 + c.ph) * 2, c.y - age * 0.28, 1.5 + age * 0.045, '#2e1a26');
      }
      ctx.globalAlpha = 1;
    }
    for (const b of midBulbs) {
      const sx = b.x - off;
      if (sx < -4 || sx > W + 4) continue;
      const on = !b.flick || Math.sin(frame * 0.7 + b.ph) + Math.sin(frame * 0.23 + b.ph * 3) > -0.7;
      if (!on) { Px.rect(sx, b.y, 1, 2, '#5a3a2a'); continue; }
      ctx.globalAlpha = 0.22; Px.disc(sx, b.y + 1, 2.6, b.c); ctx.globalAlpha = 1;
      Px.rect(sx, b.y, 1, 2, b.c);
    }
  }

  // ---------- L3 back wall (parallax 1.0) ----------
  function jackalSkull(cx, ty, k, col, socket, drips, r) {
    const P = pts => Px.poly(pts.map((v, i) => (i % 2 ? ty + v * k : cx + v * k)), col);
    P([-9, 8, -7.5, -4, -2, 4]); P([9, 8, 7.5, -4, 2, 4]);           // ears
    Px.oval(cx, ty + 8 * k, 8.5 * k, 6.5 * k, col);                   // cranium
    P([-8, 8, -5, 14, -6, 7]); P([8, 8, 5, 14, 6, 7]);                // cheek bones
    P([-6, 11, 6, 11, 3.5, 22, -3.5, 22]);                            // muzzle
    const S2 = pts => Px.poly(pts.map((v, i) => (i % 2 ? ty + v * k : cx + v * k)), socket);
    S2([-7, 6.5, -2, 8.5, -2.5, 11, -6, 10]); S2([7, 6.5, 2, 8.5, 2.5, 11, 6, 10]);  // slanted eye sockets
    S2([-1.6, 15, 1.6, 15, 0, 17.5]);                                  // nose
    for (let i = -2; i <= 2; i++) Px.rect(Math.round(cx + i * 1.5 * k), Math.round(ty + 19.5 * k), 1, Math.max(1, Math.round(1.6 * k)), socket);
    Px.rect(Math.round(cx - 1), Math.round(ty + 1 * k), 2, Math.round(3 * k), socket); // crack
    if (drips) for (let i = 0; i < drips; i++) {
      const dx = Math.round(cx + (r() - 0.5) * 14 * k), dy = Math.round(ty + (r() < 0.5 ? 14 : 21) * k);
      Px.rect(dx, dy, 1, 2 + Math.floor(r() * 5 * k), col);
    }
  }
  const MESH = [384, 1152, 1440, 2208];
  function meshPanel(g, x0, pr) {
    // the yard behind: dark ground and junk silhouettes below the shanties
    Px.rect(x0, 100, 48, 34, '#26161c');
    Px.rect(x0, 100, 48, 1, '#4a2a2a');
    const yard = '#1a0e14';
    Px.poly([x0 + 4, 134, x0 + 6, 116, x0 + 14, 110, x0 + 30, 110, x0 + 36, 118, x0 + 44, 120, x0 + 44, 134], yard); // car hulk
    Px.rect(x0 + 16, 112, 10, 4, '#2e1a22');
    Px.oval(x0 + 12, 130, 4, 4, '#120a0e'); Px.oval(x0 + 36, 130, 4, 4, '#120a0e');
    Px.line(x0 + 30, 110, x0 + 40, 102, 1, yard);
    Px.dot(x0 + 6 + Math.floor(pr() * 30), 113, '#ffb04a'); // a lamp in the yard
    // chain-link mesh as a diamond lattice, torn open in one corner
    const tx = x0 + 10 + pr() * 28, ty = 104 + pr() * 18;
    for (let y = 72; y < 134; y++) {
      for (let x = x0; x < x0 + 48; x++) {
        const a = (x + y) % 4 === 0, b = ((x - y) % 4 + 4) % 4 === 0;
        if (!a && !b) continue;
        const dx = (x - tx) / 9, dy = (y - ty) / 7;
        if (dx * dx + dy * dy < 1) continue;
        Px.dot(x, y, a && !b ? '#7a6250' : '#4e3e34');
      }
    }
    Px.rect(x0, 70, 48, 2, '#3a2a20'); Px.rect(x0, 70, 48, 1, COL.rim);
  }
  function buildWall() {
    const { cv, g } = mkCanvas(LEN + PAD * 2, WALL_H);
    g.translate(PAD, -WALL_Y0);
    Px.use(g);
    const r = mkRng(0x7e11);
    // corrugated fence panels, 48 px, alternating colours, ragged tops; a few chain-link stretches
    // let the horizon glow and the shanty yard show through
    for (let i = -1; i * 48 < LEN + PAD; i++) {
      const x0 = i * 48, col = COL.fence[(i + 2) % 2], pr = mkRng(500 + i * 7);
      if (MESH.includes(x0)) { meshPanel(g, x0, pr); continue; }
      const tl = 70 + (pr() < 0.35 ? 1 + Math.floor(pr() * 5) : 0), tr = 70 + (pr() < 0.35 ? 1 + Math.floor(pr() * 6) : 0);
      Px.poly([x0, 134, x0, tl, x0 + 48, tr, x0 + 48, 134], col);
      const hi = shade(col, 0.12);
      for (let x = x0 + 2; x < x0 + 47; x += 4) {
        const ty = Math.round(lerp(tl, tr, (x - x0) / 48)) + 1;
        Px.rect(x, ty, 1, 134 - ty, COL.ridge); Px.rect(x + 1, ty, 1, 134 - ty, hi);
      }
      Px.line(x0, tl, x0 + 48, tr, 1, COL.rim);
      Px.rect(x0, tl, 1, 134 - tl, '#2e2219');
      // tin patches and holes
      if (pr() < 0.25) {
        const pw = 12 + Math.floor(pr() * 10), ph = 9 + Math.floor(pr() * 9), px = x0 + 4 + Math.floor(pr() * (40 - pw)), py = 86 + Math.floor(pr() * 22);
        const pc = pr() < 0.5 ? '#76604a' : '#56544c';
        Px.rect(px, py, pw, ph, pc); Px.rect(px, py, pw, 1, shade(pc, 0.25)); Px.rect(px, py + ph - 1, pw, 1, shade(pc, -0.3));
        for (const [qx, qy] of [[1, 1], [pw - 2, 1], [1, ph - 2], [pw - 2, ph - 2]]) Px.dot(px + qx, py + qy, '#2a2018');
      }
      if (pr() < 0.2) { const hx = x0 + 6 + Math.floor(pr() * 34), hy = 88 + Math.floor(pr() * 28); Px.poly([hx, hy, hx + 3, hy - 2, hx + 5, hy + 1, hx + 2, hy + 4], '#140c0c'); Px.dot(hx + 1, hy - 1, COL.rim); }
      // rust streaks
      for (let k = 0; k < 3; k++) if (pr() < 0.6) withAlpha(g, 0.35, () => Px.rect(x0 + 3 + Math.floor(pr() * 42), 86 + Math.floor(pr() * 30), 1, 4 + Math.floor(pr() * 12), '#8c5a3c'));
    }
    // horizontal rails with bolts
    for (const ry of [82, 120]) {
      Px.rect(-PAD, ry, LEN + PAD * 2, 3, '#3e3026');
      Px.rect(-PAD, ry, LEN + PAD * 2, 1, '#6a5440');
      for (let x = 4; x < LEN + PAD; x += 12) { Px.dot(x, ry + 1, '#8a7a6a'); if (hash(x + ry) < 0.3) withAlpha(g, 0.45, () => Px.rect(x, ry + 3, 1, 3 + Math.floor(hash(x * 3 + ry) * 7), '#8c5a3c')); }
    }
    // posts every 96 px + barbed wire along the top
    for (let x = 0; x < LEN + PAD; x += 96) {
      if (DOORS.some(d => Math.abs(d - x) < 16) || (x > GARAGE.fx0 - 6 && x < GARAGE.fx1 + 6)) continue;
      Px.rect(x - 2, 64, 4, 70, '#3a2a20'); Px.rect(x - 2, 64, 1, 70, '#5e4632'); Px.rect(x - 3, 63, 6, 2, '#2a1e18');
    }
    for (let x = -PAD; x < LEN + PAD; x++) {
      if (x > GARAGE.fx0 - 2 && x < GARAGE.fx1 + 2) continue;
      if (Math.floor(x / 211) % 5 === 3 && x % 211 > 120) continue; // broken stretch
      const base = 66 + Math.sin(Math.PI * (((x % 96) + 96) % 96) / 96) * 2;
      Px.dot(x, Math.round(base), '#2a1c1a');
      Px.dot(x, Math.round(base + Math.sin(x * 1.25) * 1.8), '#24181a');
      if (x % 7 === 0) { Px.dot(x - 1, Math.round(base) - 1, '#2a1c1a'); Px.dot(x + 1, Math.round(base) + 1, '#2a1c1a'); }
    }
    // jackal-skull graffiti
    SKULLS.forEach((sx, i) => {
      jackalSkull(sx, 92, 1, COL.paint, '#2a1e18', 3, r);
      if (i === 2) drawText(g, 'JACKALS', sx, 124, COL.paint, 1, 'center', null);
      if (i === 4) drawText(g, 'TURF', sx + 1, 124, COL.paint, 1, 'center', null);
    });
    // doorways (20x40) with frames, lintels and a torn tarp
    for (const dx of DOORS) {
      Px.rect(dx - 12, 92, 24, 42, '#2e2018');
      Px.rect(dx - 13, 89, 26, 3, '#4a3626'); Px.rect(dx - 13, 89, 26, 1, '#7a5e44');
      Px.rect(dx - 10, 94, 20, 40, COL.door);
      Px.rect(dx - 10, 129, 20, 5, '#24161a');
      Px.poly([dx - 10, 94, dx - 4, 94, dx - 5, 112, dx - 7, 109, dx - 8, 115, dx - 10, 113], '#4a3a30');
      Px.rect(dx - 11, 133, 22, 1, '#5a4636');
      Px.dot(dx - 11, 90, '#2a1e18'); Px.dot(dx + 10, 90, '#2a1e18');
    }
    // hand-painted sign: WATER 5 CAPS, crossed out
    {
      const x0 = SIGN_X - 30, y0 = 90;
      Px.rect(x0 - 1, y0 - 1, 62, 24, '#3a2618');
      Px.rect(x0, y0, 60, 22, '#b89a6a');
      Px.rect(x0, y0 + 7, 60, 1, '#8a6a44'); Px.rect(x0, y0 + 14, 60, 1, '#8a6a44');
      Px.rect(x0, y0, 60, 1, '#d8bc8a');
      withAlpha(g, 0.35, () => { Px.rect(x0 + 40, y0 + 2, 14, 18, '#7a5a3a'); Px.rect(x0 + 4, y0 + 15, 20, 6, '#7a5a3a'); });
      for (const [nx, ny] of [[2, 2], [57, 2], [2, 19], [57, 19]]) Px.dot(x0 + nx, y0 + ny, '#3a2418');
      drawText(g, 'WATER', SIGN_X, y0 + 3, '#3a2418', 1, 'center', null);
      drawText(g, '5 CAPS', SIGN_X, y0 + 12, '#3a2418', 1, 'center', null);
      Px.line(x0 + 3, y0 + 2, x0 + 57, y0 + 20, 2, '#c8322a');
      Px.line(x0 + 3, y0 + 20, x0 + 57, y0 + 2, 2, '#c8322a');
      Px.rect(x0 + 57, y0 + 21, 1, 5, '#c8322a'); Px.rect(x0 + 4, y0 + 21, 1, 3, '#c8322a');
    }
    // boss garage: concrete facade, hazard posts, header "DIESEL"
    {
      const f0 = GARAGE.fx0, f1 = GARAGE.fx1, top = 52;
      Px.rect(f0, top, f1 - f0, 134 - top, '#4a3c36');
      for (let y = top + 4; y < 134; y += 6) {
        Px.rect(f0, y, f1 - f0, 1, '#3a2e2a');
        for (let x = f0 + ((y / 6) % 2 ? 0 : 6); x < f1; x += 12) Px.rect(x, y - 5, 1, 5, '#3a2e2a');
      }
      Px.rect(f0, top, f1 - f0, 2, '#6a584c'); Px.rect(f0, top, f1 - f0, 1, COL.rim);
      Px.rect(f0 - 2, top - 2, f1 - f0 + 4, 2, '#2e2420');
      const gx0 = GARAGE.x - GARAGE.w / 2, gx1 = GARAGE.x + GARAGE.w / 2;
      Px.rect(gx0 - 6, GARAGE.top - 4, GARAGE.w + 12, 134 - GARAGE.top + 4, '#2a2420');
      for (const px of [gx0 - 6, gx1]) for (let y = GARAGE.top; y < 134; y++) for (let x = 0; x < 6; x++) Px.dot(px + x, y, ((x + y) % 8) < 4 ? '#c8a030' : '#1a1414');
      Px.rect(gx0, GARAGE.top, GARAGE.w, 134 - GARAGE.top, '#120a0c');
      // workshop interior, only seen once the door rolls up
      const sil = '#24161a';
      Px.rect(gx0, 124, GARAGE.w, 10, '#1a1012');
      Px.rect(gx0 + 6, 96, 22, 2, sil); Px.rect(gx0 + 6, 108, 22, 2, sil); Px.rect(gx0 + 6, 96, 2, 28, sil); Px.rect(gx0 + 26, 96, 2, 28, sil);
      Px.rect(gx0 + 9, 101, 6, 7, '#2e1c1e'); Px.rect(gx0 + 17, 103, 8, 5, '#2e1c1e');
      for (let y = GARAGE.top + 2; y < 106; y += 2) Px.dot(gx0 + 58, y, '#3a2a2a');
      Px.rect(gx0 + 54, 106, 9, 6, '#3a2a2a');
      Px.poly([gx0 + 74, 134, gx0 + 76, 116, gx0 + 96, 116, gx0 + 100, 134], sil); // engine stand
      Px.rect(gx0 + 78, 108, 16, 9, '#2e1c1e'); Px.rect(gx0 + 80, 106, 3, 2, '#2e1c1e'); Px.rect(gx0 + 88, 106, 3, 2, '#2e1c1e');
      drawText(g, 'DIESEL', GARAGE.x, top + 6, '#c8322a', 2, 'center', '#140a0a');
      for (const dx of [-30, -6, 22]) Px.rect(GARAGE.x + dx, top + 20, 1, 2 + Math.floor(r() * 4), '#c8322a');
      // tyre stacks either side
      for (const tx of [f0 - 12, f1 + 12]) for (let k = 0; k < 4; k++) { Px.oval(tx, 131 - k * 5, 9, 3.5, '#1a1414'); Px.oval(tx, 130 - k * 5, 9, 1.5, '#2e2626'); Px.oval(tx, 130 - k * 5, 3, 1, '#0e0a0a'); }
    }
    // scrap heaps at the fence base
    for (let x = 140; x < LEN; x += 170 + Math.floor(r() * 120)) {
      if (DOORS.some(d => Math.abs(d - x) < 40) || Math.abs(x - SIGN_X) < 40 || (x > BUS.x0 - 30 && x < BUS.x1 + 30) || (x > GARAGE.fx0 - 40 && x < GARAGE.fx1 + 40)) continue;
      const w = 18 + Math.floor(r() * 20), pk = 121 - Math.floor(r() * 4), sh = 125 - Math.floor(r() * 4);
      Px.poly([x - w, 134, x - w * 0.5, sh, x, pk, x + w * 0.6, 127, x + w, 134], '#2e241e');
      Px.line(x - w * 0.5, sh, x, pk, 1, '#5a4636'); Px.line(x, pk, x + w * 0.6, 127, 1, '#4a3a2e');
      Px.poly([x - 10, 127, x - 2, 123, x + 4, 125, x - 4, 129], '#5e504a'); Px.line(x - 10, 127, x - 2, 123, 1, '#8a7a6a'); // bent sheet
      Px.line(x - w * 0.7, 131, x + 3, pk + 1, 1, '#6a5a50');                                                       // pipe
      Px.oval(x + w * 0.45, 129, 4, 5, '#1a1414'); Px.oval(x + w * 0.45, 129, 1.5, 2.5, '#3a3030');               // tyre on edge
      if (r() < 0.5) { Px.rect(x - w * 0.3, 128, 6, 6, '#4a3a34'); Px.rect(x - w * 0.3, 130, 6, 1, '#2e241e'); } // crate
      Px.dot(x - 3, 126, '#c8c0b0');
    }
    // bottom grime and the wall foot shadow
    withAlpha(g, 0.14, () => Px.rect(-PAD, 118, LEN + PAD * 2, 8, '#000'));
    withAlpha(g, 0.26, () => Px.rect(-PAD, 126, LEN + PAD * 2, 8, '#000'));
    return cv;
  }
  function buildGarageDoor() {
    const h = 134 - GARAGE.top;
    const { cv, g } = mkCanvas(GARAGE.w, h);
    Px.use(g);
    for (let y = 0; y < h; y += 4) {
      Px.rect(0, y, GARAGE.w, 3, (y / 4) % 2 ? '#6a5e54' : '#625649');
      Px.rect(0, y + 3, GARAGE.w, 1, '#3a302a');
      Px.rect(0, y, GARAGE.w, 1, '#7a6e62');
    }
    const r = mkRng(0x6a6a);
    for (let k = 0; k < 9; k++) withAlpha(g, 0.4, () => Px.rect(Math.floor(r() * GARAGE.w), Math.floor(r() * 20), 1 + Math.floor(r() * 2), 8 + Math.floor(r() * 24), '#8c5a3c'));
    jackalSkull(GARAGE.w / 2, 7, 1.8, COL.paint, '#3a2e28', 6, r);
    Px.poly([GARAGE.w / 2 - 12.6, 18.7, GARAGE.w / 2 - 3.6, 22.3, GARAGE.w / 2 - 4.5, 26.8, GARAGE.w / 2 - 10.8, 25], '#b8322a');
    Px.poly([GARAGE.w / 2 + 12.6, 18.7, GARAGE.w / 2 + 3.6, 22.3, GARAGE.w / 2 + 4.5, 26.8, GARAGE.w / 2 + 10.8, 25], '#b8322a');
    Px.rect(0, h - 3, GARAGE.w, 3, '#2a2420');
    Px.rect(GARAGE.w / 2 - 6, h - 6, 12, 2, '#2a2420');
    return cv;
  }
  function lamp(ctx, sx, y, frame, broken, seed) {
    const on = !broken || (((frame + seed * 13) % 97) > 9 && Math.sin(frame * 0.9 + seed) > -0.8);
    Px.rect(sx - 4, y - 2, 9, 2, '#2a1e18'); Px.rect(sx - 1, y - 5, 2, 3, '#2a1e18');
    Px.rect(sx - 1, y, 3, 2, on ? '#fff0b8' : '#5a4636');
    if (!on) return;
    ctx.globalAlpha = 0.07; Px.poly([sx - 3, y + 2, sx + 4, y + 2, sx + 16, 134, sx - 15, 134], COL.bulb);
    ctx.globalAlpha = 0.25; Px.disc(sx, y + 1, 4.5, COL.bulb);
    ctx.globalAlpha = 1;
  }
  function drawWallDyn(ctx, camX, frame, g) {
    DOORS.forEach((dx, i) => { const sx = dx - camX; if (sx > -30 && sx < W + 30) lamp(ctx, sx, 85, frame, i === 1, i); });
    const gs = GARAGE.x - camX;
    if (gs > -100 && gs < W + 100) {
      const x0 = Math.round(gs - GARAGE.w / 2), h = 134 - GARAGE.top;
      const lift = Math.round(S.garage.k * (h - 5));
      if (lift > 0) {
        // the dark garage interior with a red work light
        ctx.globalAlpha = 0.25 + 0.05 * Math.sin(frame * 0.2); Px.oval(gs, 128, 40, 6, '#e2591e'); ctx.globalAlpha = 1;
        Px.rect(gs - 30, GARAGE.top + 4, 3, 2, '#ff3b30');
      }
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, GARAGE.top, GARAGE.w, h); ctx.clip();
      ctx.drawImage(cache.garageDoor, x0, GARAGE.top - lift);
      ctx.restore();
      lamp(ctx, gs - 66, 64, frame, false, 7); lamp(ctx, gs + 66, 64, frame, false, 9);
    }
    // BIKER RUN: headlight cones sweep the fence
    if (g && g.ents) {
      for (const e of g.ents) {
        if (e.team !== 'enemy' || e.type !== 'raider' || e.remove) continue;
        const dir = e.vx ? sign(e.vx) : e.facing;
        if (e.state === 'offstage') {
          // engines snarl off-screen: the headlights grow on the fence at the edge they will come from
          const k = clamp(e.t / 45, 0, 1), ex = dir > 0 ? 0 : W;
          ctx.globalAlpha = 0.06 + 0.12 * k + ((e.t >> 2) % 2) * 0.03;
          Px.oval(ex, 112, 20 + 28 * k, 9 + 6 * k, '#fff2a0');
          ctx.globalAlpha = 1;
          continue;
        }
        const sx = e.x - camX + dir * 46;
        if (sx < -50 || sx > W + 50) continue;
        ctx.globalAlpha = 0.14; Px.oval(sx, 114, 34, 14, '#fff2a0');
        ctx.globalAlpha = 0.12; Px.oval(sx + dir * 6, 116, 16, 7, '#ffffff');
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---------- L4 floor ----------
  function buildFloor() {
    const { cv, g } = mkCanvas(LEN + PAD * 2, FLOOR_H);
    g.translate(PAD, -FLOOR_Y0);
    Px.use(g);
    const r = mkRng(0xf100);
    const X0 = -PAD, WW = LEN + PAD * 2;
    Px.rect(X0, 134, WW, 90, COL.asphalt);
    // depth shading: the back strip sits in the wall's shadow, the front is warmer
    Px.rect(X0, 134, WW, 6, '#2c2420');
    for (let x = X0; x < X0 + WW; x += 2) { Px.dot(x, 140, '#2c2420'); Px.dot(x + 1, 141, '#2c2420'); }
    Px.rect(X0, 142, WW, 10, '#3a312c');
    for (let x = X0; x < X0 + WW; x += 2) Px.dot(x + 1, 152, '#3a312c');
    Px.rect(X0, 186, WW, 18, '#433934');
    for (let x = X0; x < X0 + WW; x += 2) Px.dot(x, 185, '#433934');
    // speckle texture
    for (let i = 0; i < WW * 2.2; i++) {
      const x = X0 + r() * WW, y = 142 + r() * 62;
      Px.dot(x, y, r() < 0.5 ? '#4a403a' : '#322a26');
    }
    // sand piled along the fence foot
    for (let x = X0; x < X0 + WW; x++) {
      const h = 1 + Math.max(0, Math.sin(x * 0.045) * 2.5 + Math.sin(x * 0.13) * 1.2 + (hash(x >> 3) - 0.3) * 2);
      Px.rect(x, 134, 1, Math.round(h), COL.sandDk);
      Px.dot(x, 134 + Math.round(h) - 1, COL.sand);
    }
    // cracks: seeded per 64 px tile
    for (let tx = -64; tx < LEN + 64; tx += 64) {
      const tr = mkRng(9000 + tx);
      const n = 1 + (tr() < 0.55 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        let x = tx + tr() * 64, y = 143 + tr() * 58, ang = tr() * TAU;
        const segs = 3 + Math.floor(tr() * 4);
        for (let s = 0; s < segs; s++) {
          ang += (tr() - 0.5) * 1.5;
          const len = 4 + tr() * 9, nx = x + Math.cos(ang) * len, ny = clamp(y + Math.sin(ang) * len * 0.45, 141, 203);
          Px.line(x, y, nx, ny, 1, COL.crack);
          if (tr() < 0.3) { const ba = ang + (tr() < 0.5 ? 1 : -1) * (0.6 + tr()); Px.line(nx, ny, nx + Math.cos(ba) * 5, clamp(ny + Math.sin(ba) * 2.5, 141, 203), 1, COL.crack); }
          x = nx; y = ny;
        }
      }
    }
    // lane dashes 16x2 every 48 px at y 168, worn
    for (let x = 8; x < LEN + PAD; x += 48) {
      if (hash(x * 5) < 0.08) continue;
      Px.rect(x, 168, 16, 2, COL.lane);
      Px.rect(x, 168, 16, 1, '#9a8a68');
      for (let k = 0; k < 5; k++) if (r() < 0.5) Px.dot(x + Math.floor(r() * 16), 168 + (r() < 0.5 ? 0 : 1), '#5a4e40');
    }
    // sand drifts
    // wind-swept drifts: a fat head tapering into streaks downwind (the wind blows left), dithered edges
    const drift = (x, y, rx, ry) => {
      withAlpha(g, 0.45, () => Px.oval(x - rx * 0.3, y + 0.5, rx * 1.3, ry + 1, COL.sandDk));
      Px.oval(x, y, rx * 0.55, ry, COL.sand);
      for (let k = 1; k <= 3; k++) {
        const sx = x - rx * (0.35 + k * 0.32), w = rx * (0.5 - k * 0.1);
        Px.rect(sx - w, Math.round(y + (k % 2 ? -1 : 1) * Math.min(ry - 1, k)), w * 2, 1, COL.sand);
      }
      Px.rect(x - rx * 0.4, Math.round(y - ry + 1), rx * 0.7, 1, COL.sandHi);
      Px.dot(x + rx * 0.45, y, COL.sandHi);
      for (let k = 0; k < 10; k++) Px.dot(x - rx * 1.4 + r() * rx * 2.2, y + (r() - 0.5) * ry * 3, r() < 0.5 ? COL.sand : COL.sandDk);
    };
    for (let x = 60; x < LEN; x += 90 + Math.floor(r() * 110)) drift(x, 146 + r() * 54, 8 + r() * 16, 2 + r() * 2);
    drift(BEAT_X + 20, 186, 26, 3); drift(BEAT_X - 10, 160, 14, 2); // something stirs under the road here
    for (let k = 0; k < 4; k++) Px.line(BEAT_X - 24 + k * 14, 172 + k * 3, BEAT_X - 14 + k * 14, 175 + k * 2, 1, COL.crack);
    // oil stains
    for (let x = 110; x < LEN; x += 140 + Math.floor(r() * 160)) {
      const y = 148 + r() * 50, rx = 6 + r() * 9, ry = 2 + r() * 2;
      Px.oval(x, y, rx, ry, '#2a2228'); Px.oval(x + 1, y, rx * 0.6, ry * 0.6, '#221c20');
      Px.dot(x - 2, y - 1, '#4e3e5e'); Px.dot(x + 2, y, '#3e5656');
    }
    // manhole covers
    for (const mx of [430, 1540, 2236]) {
      Px.oval(mx, 192, 11, 4, '#544a42'); Px.oval(mx, 192, 9.5, 3.2, '#2e2826');
      for (let k = -6; k <= 6; k += 3) Px.rect(mx + k, 190, 1, 4, '#3e3632');
    }
    // scorch under the bus and the boss arena
    withAlpha(g, 0.5, () => { Px.oval(BUS.cx, 150, 70, 5, '#1a1410'); Px.oval(2500, 176, 60, 10, '#2a221e'); });
    // grit
    for (let i = 0; i < LEN / 18; i++) {
      const x = r() * LEN, y = 144 + r() * 58, c = r();
      if (c < 0.4) Px.dot(x, y, '#8a7a6a'); else if (c < 0.6) Px.rect(x, y, 2, 1, '#5a6a44'); else if (c < 0.8) Px.rect(x, y, 2, 2, '#9a8c70'); else Px.rect(x, y, 3, 1, '#2a1e1a');
    }
    // the far curb along the front edge of the street
    Px.rect(X0, 204, WW, 1, '#6e6256'); Px.rect(X0, 205, WW, 2, '#4a4038'); Px.rect(X0, 207, WW, 17, '#2a2420');
    for (let x = X0; x < X0 + WW; x += 24 + Math.floor(r() * 8)) Px.rect(x, 205, 1, 2, '#2a2420');
    return cv;
  }

  function ensureCaches() {
    if (cache.sky) return;
    cache.sky = buildSky();
    cache.far = buildFar();
    cache.mid = buildMid();
    cache.wall = buildWall();
    cache.floor = buildFloor();
    cache.garageDoor = buildGarageDoor();
  }

  // ---------- L5 foreground (parallax 1.3) ----------
  function drawFgProps(ctx, camX, frame) {
    const off = Math.round(camX * 1.3);
    for (let i = 0; i < 14; i++) {
      const sx = 230 + i * 300 - off;
      if (sx < -12 || sx > W + 12) continue;
      if (i % 2 === 0) {
        // chain-link post with a torn scrap of mesh (<= 8 px wide)
        Px.rect(sx - 2, -10, 4, H + 20, COL.fg);
        Px.rect(sx - 3, 40, 6, 2, COL.fg); Px.rect(sx - 3, 132, 6, 2, COL.fg);
        for (let y = 18; y < 96; y += 4) {
          const torn = y > 70 + ((i * 7) % 18);
          if (torn) break;
          Px.line(sx + 2, y, sx + 5, y + 2, 1, COL.fg); Px.line(sx + 5, y + 2, sx + 2, y + 4, 1, COL.fg);
        }
      } else {
        // hanging rebar swaying in the hot wind
        const sw = Math.sin(frame * 0.03 + i) * 1.2;
        Px.line(sx, -4, sx + sw, 30, 2, COL.fg); Px.line(sx + sw, 30, sx + sw + 3, 37, 2, COL.fg);
        Px.line(sx + 3, -4, sx + 3 + sw * 0.6, 20, 1, COL.fg);
        Px.line(sx + 6, -4, sx + 6 + sw * 1.3, 44, 1, COL.fg); Px.rect(sx + 4 + Math.round(sw * 1.3), 44, 4, 3, COL.fg);
      }
    }
    // drifting ash and the odd ember
    for (let i = 0; i < 28; i++) {
      const sp = 0.2 + hash(i + 40) * 0.35;
      const span = W + 40;
      const x = (((hash(i + 7) * span - frame * sp - camX * 0.3) % span) + span) % span - 20;
      const y = ((hash(i + 13) * 180 + frame * (0.12 + hash(i + 3) * 0.18)) % 180) + 30 + Math.sin(frame * 0.03 + i) * 3;
      if (i % 9 === 0) Px.dot(x, y, (frame >> 3) % 2 ? '#ffb04a' : '#e2591e');
      else { ctx.globalAlpha = 0.6; Px.dot(x, y, '#8a7a7a'); ctx.globalAlpha = 1; }
    }
  }
  // W1 tutorial strip, drawn under the HUD band in screen space.
  function drawTutorial(ctx) {
    if (S.tutT <= 0) return;
    const age = 240 - S.tutT, k = clamp(Math.min(age / 10, S.tutT / 14), 0, 1);
    const dev = Input.lastDevice;
    const segs = dev === 'touch'
      ? [['HIT', 1], [' PUNCH  ', 0], ['JUMP', 1], [' JUMP  ', 0], ['SPEC', 1], [' SPECIAL  ', 0], ['WALK INTO FOES TO GRAB', 0]]
      : dev === 'gamepad'
        ? [['X', 1], [' PUNCH  ', 0], ['A', 1], [' JUMP  ', 0], ['B', 1], [' SPECIAL  ', 0], ['WALK INTO FOES TO GRAB', 0]]
        : [['J', 1], [' PUNCH  ', 0], ['K', 1], [' JUMP  ', 0], ['L', 1], [' SPECIAL  ', 0], ['WALK INTO FOES TO GRAB', 0]];
    const full = segs.map(s => s[0]).join('');
    const y = 31 + Math.round((1 - k) * -8);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.62 * k; ctx.fillStyle = '#000'; ctx.fillRect(0, y, W, 11);
    ctx.globalAlpha = k; ctx.fillStyle = '#ffb030'; ctx.fillRect(0, y, W, 1); ctx.fillRect(0, y + 10, W, 1);
    let x = Math.round(W / 2 - textWidth(full) / 2);
    for (const [s, hi] of segs) {
      drawText(ctx, s, x, y + 2, hi ? ((Game.frame >> 4) % 2 ? '#ffe066' : '#ffb030') : '#e9d9bf', 1, 'left');
      x += s.length * 6;
    }
    ctx.restore();
  }

  // ---------- THE BURNING BUS ----------
  // A solid piece of scenery (team 'scenery': never hit, never counted) depth-sorted just behind y 150.
  class S1Bus extends Ent {
    constructor() {
      super(BUS.cx, 150);
      this.team = 'scenery'; this.shadowR = 0; this.noShadow = true; this.w = 60; this.h = 44;
      this.phase = 'burning'; this.pt = 0; this.doorT = 0; this.shakeX = 0;
      this.smoke = [];
      this.soot = [];
      const r = mkRng(0xb05);
      for (let i = 0; i < 9; i++) this.soot.push([4 + r() * 112, 126 + r() * 18, 3 + r() * 6, 1.5 + r() * 2]);
      this.solid = { x0: BUS.x0, x1: BUS.x1, y0: 108, y1: 150, h: 46, splat: true, s1Owner: this };
      Game.solids.push(this.solid);
    }
    sortY() { return 149.5; }
    get vulnerable() { return false; }
    openDoor() { this.doorT = 34; }
    ignite() {
      if (this.phase !== 'burning') return;
      this.phase = 'fuse'; this.pt = 0;
      Sound.sfx('hiss', BUS.cx);
    }
    update() {
      this.t++; this.pt++;
      if (this.doorT > 0) this.doorT--;
      const husk = this.phase === 'husk';
      if (this.t % (husk ? 8 : 6) === 0) {
        const fx = BUS.x0 + 12 + rand() * 96;
        this.smoke.push({ x: fx, y: husk ? 108 : 96, r: 3 + rand() * 3, rMax: 6 + rand() * 8, vx: -0.12 - rand() * 0.15, t: 0, life: 120 + rand() * 60, c: husk ? (rand() < 0.5 ? '#2a2424' : '#3a3434') : COL.smoke });
      }
      for (const s of this.smoke) { s.t++; s.y -= 0.5; s.x += s.vx; s.r = Math.min(s.rMax, s.r + 0.07); }
      this.smoke = this.smoke.filter(s => s.t < s.life && s.y > -24);
      if (!husk && this.t % 7 === 0) FX.embers(BUS.x0 + 10 + rand() * 100, 150, 40, 1);
      if (husk && this.t % 23 === 0) FX.embers(BUS.x0 + 10 + rand() * 100, 150, 30, 1);
      if (this.phase === 'fuse') {
        this.shakeX = rand() < 0.5 ? -1 : 1;
        if (this.pt % 3 === 0) FX.steam(BUS.x0 + 8 + rand() * 104, 150, 38 + rand() * 6, 2);
        if (this.pt % 20 === 0) Sound.sfx('hiss', BUS.cx);
        if (this.pt === 30) Sound.sfx('rumble', BUS.cx);
        if (this.pt >= 60) this.blow();
      } else this.shakeX = 0;
      if (husk) {
        if (this.pt === 6) { FX.explosion(BUS.x0 + 18, 147, 24, 0.9); Sound.sfx('explode', BUS.x0 + 18); }
        if (this.pt === 12) { FX.explosion(BUS.x1 - 14, 146, 18, 0.8); Sound.sfx('explode', BUS.x1 - 14); }
      }
    }
    blow() {
      const g = Game;
      this.phase = 'husk'; this.pt = 0; this.shakeX = 0;
      // the red fuel drums in front go up a beat later: the second boom
      for (const b of g.ents) {
        if (b.team === 'prop' && b.kind === 'fuel' && !b.remove && !b.fuse && Math.abs(b.x - BUS.cx) < 80 && Math.abs(b.y - 150) < 24) { b.fuse = 1; b.igniter = g.player; }
      }
      g.explode(BUS.cx, 150, g.player, { r: 70, depth: 30, dmg: 30, pdmg: 20 });
      FX.debris(BUS.cx, 150, 30, [COL.bus, COL.husk, '#8c5a3c'], 18, [2, 4]);
      FX.shards(BUS.cx, 150, 38, 10, [COL.bus, COL.busDk, COL.stripe]);
      FX.add({ kind: 'shard', x: BUS.x0 + 22, y: 151, z: 20, vx: -2.4, vz: 4.2, life: 70, color: '#1a1a1a', size: 9, rot: 0, spin: 0.3, g: 0.24, ground: 152 });
      for (let i = 0; i < 6; i++) FX.fire(BUS.x0 + 10 + i * 20, 150, 30, 3);
      FX.flash('#ffd27a', 6, 0.5);
      Sound.sfx('rumble', BUS.cx);
    }
    drawMarker(ctx, camX) {
      const ox = BUS.x0 - camX;
      if (ox > W + 40 || ox < -160) return;
      Px.use(ctx);
      ctx.globalAlpha = 0.4; Px.rect(ox - 2, 146, 124, 5, '#000'); ctx.globalAlpha = 1;
      if (this.phase !== 'husk') {
        ctx.globalAlpha = 0.13 + 0.04 * Math.sin(Game.frame * 0.23) + 0.03 * Math.sin(Game.frame * 0.61);
        Px.oval(ox + 60, 156, 78, 8, COL.fire);
        ctx.globalAlpha = 1;
      }
    }
    draw(ctx, camX) {
      Px.use(ctx);
      const f = Game.frame;
      const husk = this.phase === 'husk';
      const ox = BUS.x0 - camX + this.shakeX;
      // smoke (behind the body)
      for (const s of this.smoke) {
        const sx = s.x - camX;
        if (sx < -30 || sx > W + 30) continue;
        ctx.globalAlpha = 0.6 * (1 - s.t / s.life) * Math.min(1, s.t / 10);
        Px.disc(sx, s.y, s.r, s.c);
      }
      ctx.globalAlpha = 1;
      if (ox > W + 40 || ox < -160) return;
      if (!husk) {
        ctx.globalAlpha = 0.10 + 0.04 * Math.sin(f * 0.21);
        Px.oval(ox + 60, 102, 84, 30, COL.fire);
        ctx.globalAlpha = 1;
      }
      const flash = this.phase === 'fuse' && (this.pt >> 2) % 2 === 0;
      const body = husk ? COL.husk : flash ? '#f0b040' : COL.bus;
      const dk = husk ? '#140e0e' : COL.busDk, hi = husk ? '#2e2424' : COL.busHi;
      const dark = husk ? '#0c0808' : COL.stripe;
      // wheel wells + wheels
      for (const wx of [22, 98]) Px.disc(ox + wx, 146, 9, '#140c0c');
      for (const wx of [22, 98]) {
        if (!husk) Px.disc(ox + wx, 143, 7, '#1a1a1a');
        Px.disc(ox + wx, 143, 4, husk ? '#2a2222' : '#4a4444');
        Px.disc(ox + wx, 143, 1.6, husk ? '#3a3030' : '#8a8a8a');
      }
      // body shell 120x40, with a raked nose on the left
      Px.poly([ox + 2, 140, ox, 114, ox + 4, 106, ox + 120, 106, ox + 120, 140], body);
      Px.rect(ox + 2, 140, 118, 3, dk);
      for (const wx of [22, 98]) { Px.rect(ox + wx - 9, 137, 18, 6, '#140c0c'); Px.disc(ox + wx, 143, husk ? 4 : 7, husk ? '#2a2222' : '#1a1a1a'); Px.disc(ox + wx, 143, husk ? 1.6 : 4, husk ? '#3a3030' : '#4a4444'); if (!husk) Px.disc(ox + wx, 143, 1.6, '#8a8a8a'); }
      Px.rect(ox + 4, 106, 116, 3, hi);
      Px.rect(ox + 4, 109, 116, 1, dk);
      Px.rect(ox + 116, 106, 4, 34, dk);
      // window band
      Px.rect(ox + 19, 110, 99, 13, husk ? '#2a2020' : dark);
      for (let i = 0; i < 8; i++) {
        const wx = ox + 21 + i * 12;
        if (husk) {
          // burnt-out frames: black holes, a warped sill, embers dying in the seats
          Px.rect(wx, 111, 10, 10, '#060404');
          Px.rect(wx, 120, 10, 1, '#3a2620');
          if (i % 3 === 1) Px.poly([wx, 111, wx + 4, 111, wx, 115], '#2a2020');
          const e = Math.sin(f * 0.05 + i * 2.3);
          if (e > 0.2) Px.dot(wx + 2 + (i * 3) % 6, 119, e > 0.7 ? '#ff8a2a' : '#a8341a');
          if (Math.sin(f * 0.031 + i * 4.1) > 0.6) Px.dot(wx + 7, 118, '#e2591e');
          continue;
        }
        const v = Math.sin(f * 0.37 + i * 2.1) + Math.sin(f * 0.13 + i * 1.3) * 0.7;
        const c = v > 0.7 ? '#ffb04a' : v > -0.6 ? COL.busWin : '#d9561a';
        Px.rect(wx, 111, 10, 10, c);
        Px.rect(wx, 111, 10, 2, v > 0.3 ? COL.fireHi : '#ffb04a');
        Px.rect(wx + 1, 118, 3, 3, '#7a2a14'); Px.rect(wx + 6, 118, 3, 3, '#7a2a14'); // seat backs
        Px.rect(wx + 1, 112, 1, 2, '#fff2c0');
      }
      // stripe, soot, rust
      Px.rect(ox + 1, 126, 119, 3, dark);
      if (!husk) {
        for (let i = 0; i < 8; i++) { Px.rect(ox + 22 + i * 12, 106, 8, 3, '#3a2a1e'); Px.rect(ox + 24 + i * 12, 104, 4, 2, '#2a1e18'); }
        ctx.globalAlpha = 0.5;
        for (const [sx, sy, rx, ry] of this.soot) Px.oval(ox + sx, sy, rx, ry, '#3a2a1e');
        ctx.globalAlpha = 1;
        Px.oval(ox + 70, 134, 4, 2, '#8c5a3c'); Px.oval(ox + 30, 132, 3, 2, '#8c5a3c');
        drawText(ctx, '9', ox + 108, 130, COL.stripe, 1, 'left', null);
      } else {
        // blistered remnants of the yellow paint, a caved roof and edges still glowing with heat
        Px.rect(ox + 70, 131, 9, 4, '#5a3e1a'); Px.rect(ox + 32, 134, 6, 3, '#5a3e1a'); Px.rect(ox + 96, 130, 5, 6, '#4a3418');
        Px.dot(ox + 72, 132, '#8a6224'); Px.dot(ox + 98, 131, '#8a6224');
        Px.poly([ox + 28, 106, ox + 44, 111, ox + 62, 106], '#0c0808');
        Px.poly([ox + 74, 106, ox + 88, 112, ox + 102, 106], '#0c0808');
        Px.line(ox + 28, 106, ox + 44, 111, 1, '#4a2a22'); Px.line(ox + 74, 106, ox + 88, 112, 1, '#4a2a22');
        Px.rect(ox + 4, 106, 24, 1, '#4a2a22'); Px.rect(ox + 62, 106, 12, 1, '#4a2a22'); Px.rect(ox + 102, 106, 18, 1, '#4a2a22');
        const glow = 0.5 + 0.5 * Math.sin(f * 0.07);
        ctx.globalAlpha = 0.35 + 0.35 * glow; Px.rect(ox + 2, 142, 116, 1, '#a8341a'); ctx.globalAlpha = 1;
        if ((f >> 3) % 3 === 0) Px.dot(ox + 52, 108, '#e2591e');
        if ((f >> 4) % 4 === 1) Px.dot(ox + 90, 109, '#ff8a2a');
      }
      // nose: windscreen, dead headlamp, bumper
      Px.poly([ox + 1, 112, ox + 5, 108, ox + 7, 108, ox + 7, 124, ox + 1, 124], husk ? '#0a0606' : '#ff9a3a');
      if (!husk) Px.rect(ox + 2, 113, 2, 6, COL.fireHi);
      Px.rect(ox, 132, 4, 3, husk ? '#2a2222' : '#e8d8a0');
      Px.rect(ox - 2, 137, 8, 3, '#2a2424');
      // folding door
      const dx = ox + 8, open = this.doorT > 0;
      Px.rect(dx, 110, 11, 30, dark);
      if (open) {
        const k = this.doorT > 26 ? (34 - this.doorT) / 8 : this.doorT < 8 ? this.doorT / 8 : 1;
        const fl = Math.sin(f * 0.6) > 0 ? '#ffb04a' : COL.busWin;
        Px.rect(dx + 1, 111, 9, 29, husk ? '#0a0606' : fl);
        const pw = Math.round(4 - 3 * k);
        Px.rect(dx + 1, 111, pw, 29, body); Px.rect(dx + 10 - pw, 111, pw, 29, body);
      } else {
        Px.rect(dx + 1, 111, 4, 29, body); Px.rect(dx + 6, 111, 4, 29, body);
        Px.rect(dx + 2, 113, 2, 10, husk ? '#0a0606' : COL.busWin); Px.rect(dx + 7, 113, 2, 10, husk ? '#0a0606' : COL.busWin);
      }
      // roof flames: 6 triangles, 10..22 tall
      if (!husk) {
        const xs = [16, 34, 50, 66, 84, 102];
        for (let i = 0; i < 6; i++) {
          const hgt = clamp(16 + Math.sin(f * 0.31 + i * 1.7) * 4 + Math.sin(f * 0.83 + i * 2.9) * 2 + (i % 3 - 1) * 2, 10, 22);
          const fx = ox + xs[i], w = 6;
          Px.poly([fx - w, 107, fx + Math.sin(f * 0.2 + i) * 2, 107 - hgt, fx + w, 107], COL.fireDk);
          Px.poly([fx - w + 2, 107, fx + Math.sin(f * 0.2 + i) * 1.5, 107 - hgt * 0.72, fx + w - 2, 107], COL.fire);
          Px.poly([fx - 2, 107, fx, 107 - hgt * 0.4, fx + 2, 107], COL.fireHi);
        }
        // flames licking out of two windows
        for (const i of [2, 6]) {
          const hgt = 6 + Math.sin(f * 0.5 + i) * 2;
          const fx = ox + 26 + i * 12;
          Px.poly([fx - 4, 111, fx, 111 - hgt, fx + 4, 111], COL.fire);
          Px.poly([fx - 2, 111, fx, 111 - hgt * 0.5, fx + 2, 111], COL.fireHi);
        }
      }
      // the fuse: a red "!" over the hissing bus
      if (this.phase === 'fuse' && (this.pt >> 2) % 2 === 0) {
        const bx = ox + 60, by = 72 - (this.pt % 10 < 5 ? 1 : 0);
        Px.rect(bx - 4, by - 2, 9, 25, '#000');
        Px.rect(bx - 2, by, 5, 14, '#ff3030');
        Px.rect(bx - 2, by + 17, 5, 4, '#ff3030');
      }
    }
  }

  // Bus door exits for W3 (spawn side 'in' at the door, then step out toward the camera).
  function busExit(e) {
    const bus = S.bus;
    e.x = BUS.door; e.y = 152;
    e.facing = Game.player && Game.player.x < e.x ? -1 : 1;
    e.setState('door');
    if (bus && bus.phase === 'burning') bus.openDoor();
    FX.smoke(BUS.door, 151, 18, 3, '#4a4040');
  }

  // ---------- SOMETHING UNDER THE ROAD (x 2150, no lock) ----------
  // A lone punk sprints in from the right edge yelling HEY!; 60 px from the hero a giant pincer takes him.
  // The stage drives him itself (own wide bounds, so he can start off-screen) and keeps him untouchable:
  // the point of the beat is the claw, not a fight.
  function beatStart(g) {
    const p = g.player, B = S.beat;
    const e = g.spawn({ type: 'punk', side: 'in', x: W + 26, y: clamp(Math.round(p.y), g.bounds.yMin + 6, g.bounds.yMax - 6) });
    e.ignoreForWave = true; e.counted = true; e.s1Beat = true;
    e.inv = 9999; e.facing = -1;
    e.setState('sprint');
    e.update = beatPunkUpdate;
    B.punk = e; B.phase = 'run'; B.t = 0;
  }
  function beatPunkUpdate() {
    const B = S.beat, p = Game.player, cx = Game.cam.x;
    const wide = { xMin: cx - 120, xMax: cx + W + 120, yMin: Game.bounds.yMin, yMax: Game.bounds.yMax, walls: false };
    B.t++;
    if (B.phase === 'run') {
      this.anim++;
      this.facing = p.x >= this.x ? 1 : -1;
      this.vx = this.facing * 2.6;
      this.vy = clamp(p.y - this.y, -0.6, 0.6);
      this.physics(wide);
      if (this.t % 6 === 0) FX.dust(this.x - this.facing * 4, this.y, 1, 0.6);
      if (!B.yelled && this.x < cx + W - 14) {
        B.yelled = true; B.heyT = 70;
        Sound.sfx(SFX.gangHey ? 'gangHey' : 'shout', this.x);
      }
      if ((B.yelled && Math.abs(p.x - this.x) <= 60) || B.t > 400) {
        this.vx = this.vy = 0;
        this.setState('held');
        B.heyT = 0; B.t = 0;
        if (typeof ScorpionClaw !== 'undefined') { Game.add(new ScorpionClaw(this.x, this.y, this)); B.phase = 'claw'; }
        else { B.phase = 'sink'; Sound.sfx('burrow', this.x); Sound.sfx('rumble', this.x); this.draw = sinkingDraw; }
      }
      return;
    }
    if (B.phase === 'claw') {
      // the claw module owns him now; make sure he never lingers if it lets go of him
      this.t++; this.anim++;
      if (B.t > 200 && !this.remove) { this.remove = true; B.phase = 'done'; }
      return;
    }
    if (B.phase === 'sink') {
      this.t++;
      this.vx = this.vy = 0;
      if (B.t % 2 === 0) FX.dust(this.x + rr(-6, 6), this.y, 2, 1.4, COL.sand);
      if (B.t < 34) FX.shake(1, 3);
      if (B.t >= 36) {
        this.remove = true; B.phase = 'done';
        FX.dust(this.x, this.y, 10, 1.8, COL.sand);
        FX.pool(this.x, this.y + 1, COL.sandDk, 24);
        Game.add(new Item('pipe', this.x, this.y, 2.0));
      }
    }
  }
  function sinkingDraw(ctx, camX) {
    const B = S.beat, k = clamp(B.t / 32, 0, 1);
    ctx.save();
    ctx.beginPath(); ctx.rect(-60, -60, W + 120, this.y + 61); ctx.clip();
    const z0 = this.z; this.z = -Math.round(easeOut(k) * (this.h + 6));
    Enemy.prototype.draw.call(this, ctx, camX);
    this.z = z0;
    ctx.restore();
    Px.use(ctx);
    const sx = this.x - camX;
    Px.oval(sx, this.y, 12, 3, COL.sandDk); Px.oval(sx, this.y - 1, 9, 2, COL.sand);
  }

  // ---------- boss helpers ----------
  // The boss modules show their own name card on spawn (DESIGN 6.1) and call their own 50% adds
  // (DESIGN 6.2/6.3); the stage only puts the card up if none has appeared a second after the spawn.
  function bossWatch(type, name, epithet) { return { type, name, epithet, t: 0, spawnT: -1, card: false }; }
  function bossWatchUpdate(g) {
    const w = S.bw;
    if (!w) return;
    w.t++;
    if (g.bossCardInfo) w.card = true;
    if (w.card) return;
    const boss = g.ents.find(e => e.team === 'enemy' && e.type === w.type && !e.remove);
    if (!boss) return;
    if (w.spawnT < 0) w.spawnT = w.t;
    if (w.t - w.spawnT >= 60) { g.bossCard(w.name, w.epithet); w.card = true; }
  }

  // ---------- stage ----------
  const STAGE = {
    title: 'RUST ROW', sub: 'SCRAP TOWN AT DUSK', len: LEN, yMin: 134, yMax: 200, music: 'stage1', camStart: 0,

    drawBg(ctx, camX, frame, g) {
      ensureCaches();
      const tick = frame !== S.lastFrame;
      S.lastFrame = frame;
      ctx.globalAlpha = 1;
      Px.use(ctx);
      ctx.drawImage(cache.sky, -8, SKY_Y0);
      const fo = Math.round(camX * 0.1);
      ctx.drawImage(cache.far, fo + PAD - 8, 0, W + 16, FAR_H, -8, 0, W + 16, FAR_H);
      drawFarDyn(ctx, fo, frame, tick);
      const mo = Math.round(camX * 0.35);
      ctx.drawImage(cache.mid, mo + PAD - 8, 0, W + 16, MID_H, -8, 0, W + 16, MID_H);
      drawMidDyn(ctx, mo, frame);
      ctx.drawImage(cache.wall, camX + PAD - 8, 0, W + 16, WALL_H, -8, WALL_Y0, W + 16, WALL_H);
      drawWallDyn(ctx, camX, frame, g);
      ctx.drawImage(cache.floor, camX + PAD - 8, 0, W + 16, FLOOR_H, -8, FLOOR_Y0, W + 16, FLOOR_H);
      ctx.globalAlpha = 1;
    },
    drawMarkers(ctx, camX) {
      Px.use(ctx);
      ctx.globalAlpha = 0.1;
      for (const dx of DOORS) { const sx = dx - camX; if (sx > -30 && sx < W + 30) Px.oval(sx, 137, 16, 3, COL.bulb); }
      ctx.globalAlpha = 1;
    },
    drawFg(ctx, camX, frame, g) {
      Px.use(ctx);
      drawFgProps(ctx, camX, frame);
      const B = S.beat;
      if (B && B.heyT > 0 && B.punk && !B.punk.remove) {
        const e = B.punk, sx = Math.round(e.x - camX), sy = Math.round(e.y - e.z - e.h - 16);
        Px.rect(sx - 13, sy - 2, 27, 11, '#000'); Px.rect(sx - 12, sy - 1, 25, 9, '#e8e0d0');
        Px.poly([sx - 3, sy + 8, sx + 3, sy + 8, sx - 1, sy + 13], '#e8e0d0');
        drawText(ctx, 'HEY!', sx + 1, sy, '#1a1414', 1, 'center', null);
      }
      if (g && (g.state === 'play' || g.state === 'pause')) drawTutorial(ctx);
      Px.use(ctx);
    },

    props: [
      { kind: 'crate', x: 300, y: 152, drop: 'beans' },
      { kind: 'drum', x: 620, y: 184, drop: 'cap' },
      { kind: 'drum', x: 760, y: 146, drop: 'cactus' },
      { kind: 'fuel', x: 1150, y: 190 },
      { kind: 'crate', x: 1290, y: 162, drop: 'pipe' },
      { kind: 'fuel', x: 1960, y: 150 },
      { kind: 'fuel', x: 1990, y: 150 },
      { kind: 'fridge', x: 2100, y: 150, drop: 'rat' },
      { kind: 'drum', x: 2180, y: 172, drop: 'dogtag' },
      { kind: 'drum', x: 2324, y: 190, drop: 'beans' },
      { kind: 'drum', x: 2666, y: 190, drop: 'cap' },
    ],
    items: [],

    waves: [
      { // W1: three punks from the right edge, 40 f apart; tutorial strip for 240 f
        at: 0,
        onStart() { S.tutT = 240; },
        spawns: [
          { type: 'punk', side: 'R', y: 160, delay: 30, cap: 2 },
          { type: 'punk', side: 'R', y: 184, delay: 70, cap: 2 },
          { type: 'punk', side: 'R', y: 172, delay: 110, cap: 2 },
        ],
      },
      { // W2: 3 punks + 1 knifer; one punk drops off the container wall, the knifer steps out of the 560 doorway
        at: 480,
        spawns: [
          { type: 'punk', side: 'R', y: 176, delay: 10, cap: 3 },
          { type: 'punk', side: 'top', x: 150, y: 140, delay: 40, cap: 3 },
          { type: 'knifer', side: 'door', x: 560 - 480, delay: 80, cap: 3 },
          { type: 'punk', side: 'L', y: 166, delay: 120, cap: 3 },
        ],
      },
      { // BIKER RUN: 3 raiders in lanes 150, 186, 168, 70 f apart, then 2 punks; music drops to bass and drums
        at: 960,
        onStart() {
          if (SONGS.bikerun) Sound.playSong('bikerun');
          else Sound.musicFilter(360, 0.5);
        },
        onClear() { Sound.musicFilter(20000, 0.4); Sound.playSong('stage1'); },
        spawns: [
          { type: 'raider', side: 'R', y: 150, opts: { uturn: false }, delay: 20, cap: 2 },
          { type: 'raider', side: 'L', y: 186, opts: { uturn: false }, delay: 90, cap: 2 },
          { type: 'raider', side: 'R', y: 168, opts: { uturn: false }, delay: 160, cap: 2 },
          { type: 'punk', side: 'door', x: 1000 - 960, delay: 280, cap: 2 },
          { type: 'punk', side: 'R', y: 178, delay: 300, cap: 2 },
        ],
      },
      { // MID-BOSS: SLAB (+2 punks at 50%)
        at: 1344, music: 'boss',
        onStart() { S.bw = bossWatch('slab', 'SLAB', 'CHAIN ENFORCER'); },
        update(g) { bossWatchUpdate(g); },
        onClear() { S.bw = null; Sound.playSong('stage1'); },
        spawns: [{ type: 'slab', side: 'R', y: 168, delay: 30 }],
      },
      { // W3 THE BURNING BUS: 3 punks out of the bus door 40 f apart; at 300 f 2 torchers right, 1 spiker left
        at: BUS.lock,
        update(g) {
          const bus = S.bus;
          if (bus && bus.phase === 'burning' && g.waveSpawned >= g.wave.spawns.length && g.livingFoes().length <= 1) bus.ignite();
        },
        until() { return !S.bus || (S.bus.phase === 'husk' && S.bus.pt > 40); },
        spawns: [
          { type: 'punk', side: 'in', x: BUS.door - BUS.lock, y: 152, delay: 30, cap: 4, onSpawn: busExit },
          { type: 'punk', side: 'in', x: BUS.door - BUS.lock, y: 152, delay: 70, cap: 4, onSpawn: busExit },
          { type: 'punk', side: 'in', x: BUS.door - BUS.lock, y: 152, delay: 110, cap: 4, onSpawn: busExit },
          { type: 'torcher', side: 'R', y: 162, delay: 300, cap: 4 },
          { type: 'torcher', side: 'R', y: 188, delay: 300, cap: 4 },
          { type: 'spiker', side: 'L', y: 176, delay: 300, cap: 4 },
        ],
      },
      { // BOSS: BIG DIESEL walks out of the skull garage (+2 punks, 1 knifer at 50%)
        at: 2304, boss: true, music: 'boss',
        onStart() {
          S.garage.opening = true;
          if (S.beat && S.beat.phase === 'idle') S.beat.phase = 'done';
          Sound.sfx('rumble', GARAGE.x);
          S.bw = bossWatch('diesel', 'BIG DIESEL', 'JACKAL WARCHIEF');
        },
        update(g) { bossWatchUpdate(g); },
        spawns: [{ type: 'diesel', side: 'door', x: GARAGE.x - 2304, delay: 54 }],
      },
    ],

    setup(g) {
      S.bus = g.add(new S1Bus());
      S.beat = { phase: 'idle', punk: null, yelled: false, heyT: 0, t: 0 };
      S.tutT = 0; S.bw = null; S.cleanT = 0;
      S.garage = { k: 0, opening: false };
      for (const [x, y] of [[700, 150], [2330, 144], [2660, 144]]) {
        const b = g.add(new BurningBarrel(x, y));
        g.solids[g.solids.length - 1].s1Owner = b;
      }
    },
    update(g) {
      if (S.tutT > 0 && g.state === 'play') S.tutT--;
      const B = S.beat;
      if (B) {
        if (B.heyT > 0) B.heyT--;
        if (B.phase === 'idle' && g.state === 'play' && !g.wave && g.cam.x >= BEAT_X && g.cam.x < 2300 && g.player && ENEMY_TYPES.punk) beatStart(g);
      }
      if (S.garage.opening && S.garage.k < 1) {
        S.garage.k = Math.min(1, S.garage.k + 1 / 44);
        if (Game.frame % 4 === 0) { FX.dust(GARAGE.x + rr(-50, 50), 135, 1, 0.8); FX.shake(1, 4); }
        if (S.garage.k >= 1) Sound.sfx('clank', GARAGE.x);
      }
      // scenery whose entity was removed (test sandbox) must not leave an invisible solid behind
      if (++S.cleanT % 20 === 0) {
        for (const r of g.solids) {
          const o = r.prop || r.s1Owner;
          if (o && !r.off && !g.ents.includes(o)) r.off = true;
        }
      }
    },
  };

  // STAGES is declared in 80_game.js, which loads after this file: if it is not initialised yet,
  // register once the whole script has run (a microtask, before any frame or input).
  const install = () => { STAGES[0] = STAGE; };
  try { install(); } catch (e) { Promise.resolve().then(install); }
})();
