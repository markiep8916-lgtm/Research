// Stage 2: GLASS FLATS (noon desert highway, world 0..3072). DESIGN.md 7.2 + 12 (#4, #5).
// Parallax: sky + sun (0), mesas with heat shimmer (0.08), broken overpass / airliner tail / Joshua
// trees (0.3), dunes + guardrail + car wrecks (1.0), bleached highway floor, tumbleweeds + cacti (1.3).
// Set pieces: the W4 SANDSTORM (wind, streaks, tint, silhouettes, music lowpass, wind noise) and the
// ROAD COLLAPSE at lock 2400 that drops Juno into the Matriarch's brood crater.
// Everything lives in this IIFE; the only shared names touched are STAGES[1] and SFX.s2*.
(function () {
  const LEN = 3072, CRATER_X = 2400;
  const WAVE_W4 = 4, WAVE_COLLAPSE = 5;

  // ---------- palette (DESIGN 7.2; no saturated blue anywhere) ----------
  const C = {
    sky0: '#F6E7B0', sky1: '#F0C57A', sky2: '#E99A5A', sun: '#FFF8E0', halo: '#FFF0B0',
    mesa: '#C07A4E', mesaShade: '#A0603C',
    over: '#9A8E80', overLit: '#B0A494',
    fin: '#D8D0C4', stripe: '#B33A2B', joshua: '#5A4030',
    dune: '#E0AE68', rail: '#8A8A82',
    car: '#8A5A3A', carWin: '#2A2020',
    asphalt: '#8C7C68', dash: '#D4B04A', sand: '#E0B070', crack: '#6A5A48',
    glint: '#F0FFF8',
    crater: '#C88A50', rim: '#A86A3C', rimDark: '#8A5030', bone: '#E8E0D0',
    egg: '#E8D8A0', yolk: '#C8A860',
    weed: '#8A6A40', cactus: '#4A3A20',
    streak: '#E8C080', tint: '#D9A35E',
  };

  // ---------- small helpers (local RNG: drawing never touches the game's seeded rand) ----------
  function rng(seed) {
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
    let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x) {
    const i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f);
    return lerp(hash(i * 31 + 7), hash(i * 31 + 38), k);
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return '#' + [0, 1, 2].map(i => clamp(Math.round(lerp(A[i], B[i], t)), 0, 255).toString(16).padStart(2, '0')).join('');
  }
  function canvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { cv, g };
  }
  // Random-walk crack polyline.
  function crackLine(R, x, y, segs, col, y0 = 136, y1 = 214) {
    let a = R() * TAU;
    for (let i = 0; i < segs; i++) {
      a += (R() - 0.5) * 1.4;
      const l = 3 + R() * 7;
      const nx = x + Math.cos(a) * l, ny = clamp(y + Math.sin(a) * l * 0.5, y0, y1);
      Px.line(x, y, nx, ny, 1, col);
      if (R() < 0.25) Px.line(nx, ny, nx + (R() - 0.5) * 8, ny + (R() - 0.5) * 4, 1, col);
      x = nx; y = ny;
    }
  }
  const duneTop = x => Math.round(113 + 5 * Math.sin(x * 0.011) + 3 * Math.sin(x * 0.027 + 1.3) + 1.5 * Math.sin(x * 0.067 + 0.4));
  const sandDepth = x => {
    const tongue = Math.max(0, vnoise(x / 70 + 3) - 0.55) / 0.45;
    return Math.round(2 + 4 * vnoise(x / 17) + 11 * Math.pow(tongue, 1.4) + (x > 2240 ? 3 * vnoise(x / 9) : 0));
  };

  // ---------- cached static layers ----------
  const cache = {};
  const MESA_W = 900, L2_W = 1240, L2_Y = 34, L2_H = 92, HW_Y = 84, CR_Y = 40, CR_W = 700;

  function buildSky() {
    const { cv, g } = canvas(W, 128);
    Px.use(g);
    const stops = [[0, C.sky0], [58, C.sky1], [118, C.sky2], [128, C.sky2]];
    const at = y => {
      for (let i = 0; i < stops.length - 1; i++) {
        const [y0, c0] = stops[i], [y1, c1] = stops[i + 1];
        if (y <= y1) return mix(c0, c1, clamp((y - y0) / (y1 - y0), 0, 1));
      }
      return C.sky2;
    };
    const B = 8;
    for (let b = 0; b * B < 128; b++) {
      const y0 = b * B, c = at(y0 + B / 2), n = at(y0 + B * 1.5);
      Px.rect(0, y0, W, B, c);
      for (let x = 0; x < W; x++) {          // dithered seam into the next band
        if (x % 2 === b % 2) Px.dot(x, y0 + B - 1, n);
        if (x % 4 === 1) Px.dot(x, y0 + B - 2, n);
      }
    }
    // a few bleached heat streaks high up
    g.globalAlpha = 0.35;
    for (const [x, y, w] of [[150, 44, 60], [210, 52, 34], [300, 38, 48], [20, 64, 40]]) Px.rect(x, y, w, 1, C.sky0);
    // sun with halo ring
    g.globalAlpha = 0.15; Px.disc(80, 30, 27, C.halo);
    g.globalAlpha = 0.4; Px.disc(80, 30, 20, C.halo);
    g.globalAlpha = 1; Px.disc(80, 30, 14, C.sun);
    Px.disc(78, 28, 8, '#FFFDF2');
    return cv;
  }

  // L1: mesas and buttes (drawn in screen coords, canvas row 0 = screen y 60).
  function buildMesas() {
    const { cv, g } = canvas(MESA_W, 64);
    g.translate(0, -60);
    Px.use(g);
    const R = rng(0x5A11);
    const haze = C.sky1;
    // pale far plain under the mesas
    Px.rect(0, 112, MESA_W, 12, mix(C.dune, C.sky2, 0.35));
    for (const row of [0, 1]) {
      let x = row ? -10 : 10;
      while (x < MESA_W) {
        const butte = R() < 0.28;
        const w = butte ? 10 + R() * 12 : 46 + R() * (row ? 100 : 80);
        const top = Math.round(butte ? 74 + R() * 10 : (row ? 82 + R() * 10 : 68 + R() * 12));
        const base = row ? 118 : 113, hz = row ? 0.05 : 0.5;
        // a lower shoulder on one side gives the stepped silhouette
        if (!butte && R() < 0.6) {
          const left = R() < 0.5, sw = w * (0.3 + R() * 0.25), st = top + 5 + Math.round(R() * 6);
          if (left) drawMesa(x - sw * 0.7, x + 6, st, base, hz, haze, R);
          else drawMesa(x + w - 6, x + w + sw * 0.7, st, base, hz, haze, R);
        }
        drawMesa(x, x + w, top, base, hz, haze, R);
        x += w + (row ? 30 + R() * 110 : 24 + R() * 60);
      }
    }
    // horizon haze
    g.globalAlpha = 0.35;
    Px.rect(0, 111, MESA_W, 3, C.sky1);
    g.globalAlpha = 0.2;
    Px.rect(0, 105, MESA_W, 6, C.sky1);
    g.globalAlpha = 1;
    return cv;
  }
  function drawMesa(x0, x1, top, base, hazeK, haze, R) {
    const lit = mix(C.mesa, haze, hazeK), dark = mix(C.mesaShade, haze, hazeK);
    const cap = shade(lit, 0.14), capD = shade(dark, 0.08);
    const talL = mix(lit, C.dune, 0.3), talD = mix(dark, C.dune, 0.18);
    const strL = shade(lit, -0.06), strD = shade(dark, -0.06), gully = shade(lit, -0.1);
    const capH = 2 + Math.floor(R() * 2);
    const cliffB = Math.round(top + (base - top) * (0.5 + R() * 0.2));
    const apL = 5 + R() * 12, apR = 5 + R() * 12, split = 0.5 + R() * 0.2, ph = R() * 6;
    for (let y = top; y <= base; y++) {
      let L, Rr, talus = false;
      if (y <= cliffB) {
        const k = (y - top) / Math.max(1, cliffB - top);
        L = x0 + (1 - k) * 1.5; Rr = x1 - (1 - k) * 1.5;
      } else {
        const k = Math.pow((y - cliffB) / Math.max(1, base - cliffB), 0.75);
        L = x0 - apL * k; Rr = x1 + apR * k; talus = true;
      }
      const Sx = Math.round(lerp(L, Rr, split) + Math.sin(y * 0.35 + ph) * 1.2);
      const strata = !talus && y > top + capH && (y - top) % 5 === 0 && hash(y * 7 + x0) > 0.3;
      let cl = talus ? talL : strata ? strL : lit, cd = talus ? talD : strata ? strD : dark;
      if (y < top + capH) { cl = cap; cd = capD; }
      Px.rect(L, y, Sx - L, 1, cl);
      Px.rect(Sx, y, Rr - Sx, 1, cd);
    }
    // gullies down the lit face, carrying on as streaks across the talus
    const n = Math.max(1, Math.floor((x1 - x0) / 14));
    for (let i = 0; i < n; i++) {
      const gx = Math.round(lerp(x0 + 3, lerp(x0, x1, split) - 3, (i + 0.3 + R() * 0.4) / n));
      const y0 = top + capH + 1 + Math.floor(R() * 3), y1 = cliffB - Math.floor(R() * 4);
      Px.rect(gx, y0, 1, y1 - y0, gully);
      Px.rect(gx, cliffB + 1, 1, Math.max(1, (base - cliffB) * 0.5), mix(talL, gully, 0.5));
    }
  }

  // L2: overpass, airliner tail, Joshua trees, dead poles (canvas row 0 = screen y 34).
  function buildL2() {
    const { cv, g } = canvas(L2_W, L2_H);
    g.translate(0, -L2_Y);
    Px.use(g);
    const R = rng(0x0B12);
    const GY = 118;
    const far = mix(C.dune, C.sky1, 0.3);
    // low far dunes
    for (let x = 0; x < L2_W; x++) {
      const t = Math.round(112 + 3 * Math.sin(x * 0.019 + 1) + 2 * Math.sin(x * 0.051));
      Px.rect(x, t, 1, 126 - t, far);
      if (Math.sin(x * 0.019 + 1) * 0.057 + Math.cos(x * 0.051) * 0.1 > 0.05) Px.dot(x, t + 1, shade(far, -0.06));
    }
    // dead telephone poles with sagging wire
    const poles = [760, 830, 902, 975, 1180];
    for (const px of poles) {
      const lean = (hash(px) - 0.5) * 4;
      Px.line(px, GY, px + lean, GY - 34, 1, C.joshua);
      Px.rect(px + lean - 4, GY - 32, 9, 1, C.joshua);
    }
    for (let i = 0; i < poles.length - 1; i++) {
      const a = poles[i], b = poles[i + 1];
      if (b - a > 100) continue;
      for (let k = 0; k <= 1; k++) {
        const y0 = GY - 32 + k * 0, off = k ? 3 : -3;
        let lx = a + off, ly = y0;
        for (let s = 1; s <= 12; s++) {
          const t = s / 12, x = lerp(a + off, b + off, t), y = y0 + Math.sin(t * Math.PI) * 6;
          Px.line(lx, ly, x, y, 1, shade(C.joshua, 0.15));
          lx = x; ly = y;
        }
      }
    }
    // overpass A: two decks, one snapped span slumped to the ground
    const deckY = 74;
    const pillar = (x, top) => {
      Px.rect(x - 5, top, 10, GY - top, C.over);
      Px.rect(x - 5, top, 3, GY - top, C.overLit);
      Px.rect(x + 2, top, 3, GY - top, shade(C.over, -0.22));
      Px.rect(x - 10, top - 4, 20, 4, C.over);
      Px.rect(x - 10, top - 4, 20, 1, C.overLit);
      Px.rect(x - 10, top - 1, 20, 1, shade(C.over, -0.32));
      for (let y = top + 6; y < GY - 4; y += 9) Px.rect(x - 2, y, 1, 3, shade(C.over, -0.12));
    };
    const deck = (x0, x1) => {
      Px.rect(x0, deckY, x1 - x0, 8, C.over);
      Px.rect(x0, deckY, x1 - x0, 1, C.overLit);
      Px.rect(x0, deckY + 6, x1 - x0, 2, shade(C.over, -0.32));
      Px.rect(x0, deckY - 4, x1 - x0, 1, C.overLit);
      for (let x = x0 + 2; x < x1; x += 6) Px.rect(x, deckY - 4, 1, 4, shade(C.over, -0.08));
      for (let x = x0 + 30; x < x1; x += 40) Px.rect(x, deckY + 1, 1, 5, shade(C.over, -0.16));
    };
    const rebar = (x, y, dir) => {
      for (let i = 0; i < 4; i++) {
        const yy = y + 1 + i * 2, l = 5 + hash(x * 3 + i) * 9;
        Px.line(x, yy, x + dir * l, yy + 2 + i, 1, C.crack);
        Px.dot(x + dir * l, yy + 3 + i, shade(C.crack, -0.3));
      }
    };
    pillar(150, deckY + 8); pillar(270, deckY + 8);
    deck(96, 330);
    // jagged snapped end (right) + rebar
    g.clearRect(326, deckY - 4, 4, 3); g.clearRect(328, deckY + 3, 2, 5); g.clearRect(324, deckY + 6, 6, 2);
    rebar(329, deckY, 1);
    // the fallen span, leaning from the break down to the sand
    Px.quad(340, deckY + 6, 392, GY - 3, 9, 9, C.over);
    Px.quad(339, deckY + 4, 391, GY - 5, 2, 2, C.overLit);
    Px.quad(342, deckY + 10, 393, GY + 1, 3, 3, shade(C.over, -0.3));
    rebar(338, deckY + 2, -1);
    for (let i = 0; i < 7; i++) Px.rect(380 + hash(i * 11) * 30, GY - 2 - hash(i * 5) * 3, 3 + hash(i) * 4, 3, i % 2 ? C.over : shade(C.over, -0.2));
    // far half: deck from 412 with a broken left end, then an embankment ramp
    pillar(470, deckY + 8);
    deck(412, 560);
    g.clearRect(412, deckY - 4, 3, 4); g.clearRect(412, deckY + 4, 2, 4);
    rebar(413, deckY, -1);
    Px.poly([560, deckY, 600, GY - 2, 560, GY - 2], shade(C.over, -0.1));
    Px.poly([560, deckY, 562, deckY, 604, GY - 2, 600, GY - 2], C.overLit);
    // airliner tail, half-buried
    drawFin(690, GY);
    // overpass B fragment: one pillar holding a tilted chunk
    pillar(1040, deckY + 14);
    Px.quad(1004, deckY + 14, 1076, deckY + 5, 8, 8, C.over);
    Px.quad(1004, deckY + 11, 1076, deckY + 2, 2, 2, C.overLit);
    Px.quad(1005, deckY + 18, 1077, deckY + 9, 2, 2, shade(C.over, -0.32));
    rebar(1076, deckY + 2, 1); rebar(1004, deckY + 11, -1);
    // dead Joshua trees
    for (const [x, h] of [[40, 22], [220, 16], [520, 26], [612, 18], [865, 24], [1120, 20], [1196, 28]]) joshua(x, GY, h, R);
    return cv;
  }
  function drawFin(x, gy) {
    const fin = C.fin, finD = shade(fin, -0.16), finL = shade(fin, 0.22);
    // fuselage tail cone sticking out of the sand
    Px.quad(x - 40, gy - 3, x + 24, gy - 13, 18, 8, fin);
    Px.quad(x - 40, gy + 3, x + 24, gy - 10, 6, 2, finD);
    Px.quad(x - 40, gy - 9, x + 24, gy - 16, 2, 1, finL);
    Px.quad(x - 40, gy - 3, x + 24, gy - 12, 3, 2, C.stripe);       // cheat line
    for (const wx of [x - 24, x - 16, x - 8]) Px.rect(wx, gy - 8 + Math.round((wx - x) * -0.12), 2, 2, C.carWin);
    // horizontal stabiliser
    Px.poly([x + 2, gy - 15, x + 30, gy - 21, x + 34, gy - 19, x + 8, gy - 12], shade(fin, -0.06));
    // the fin, swept back
    const b0 = gy - 14, b1 = gy - 64;
    const xl = y => lerp(x - 8, x + 14, (b0 - y) / (b0 - b1));
    const xr = y => lerp(x + 18, x + 27, (b0 - y) / (b0 - b1));
    Px.poly([xl(b0), b0, xr(b0), b0, xr(b1), b1, xl(b1), b1], fin);
    Px.poly([xr(b0) - 5, b0, xr(b0), b0, xr(b1), b1, xr(b1) - 3, b1], finD);
    Px.line(xl(b0), b0, xl(b1), b1, 1, finL);
    Px.rect(xl(b1), b1, xr(b1) - xl(b1), 1, finL);
    // red stripe across the fin, slanting up toward the trailing edge
    const s0 = gy - 30, s1 = gy - 37;
    Px.poly([xl(s0), s0, xr(s0 - 6), s0 - 6, xr(s1 - 6), s1 - 6, xl(s1), s1], C.stripe);
    Px.poly([xr(s0 - 6) - 5, s0 - 6, xr(s0 - 6), s0 - 6, xr(s1 - 6), s1 - 6, xr(s1 - 6) - 4, s1 - 6], shade(C.stripe, -0.25));
    // panel lines
    for (const yy of [gy - 22, gy - 46, gy - 55]) Px.rect(xl(yy) + 2, yy, xr(yy) - xl(yy) - 6, 1, shade(fin, -0.07));
    // sand burying the nose end
    const sand = mix(C.dune, C.sky1, 0.2);
    Px.oval(x - 38, gy + 1, 26, 8, sand);
    Px.oval(x - 34, gy - 4, 14, 3, shade(sand, 0.1));
    Px.oval(x + 6, gy + 2, 18, 4, sand);
  }
  function joshua(x, gy, h, R) {
    const c = C.joshua, d = shade(c, -0.3), l = shade(c, 0.18);
    const tx = x + (R() - 0.5) * 3, ty = gy - h * 0.55;
    Px.line(x, gy, tx, ty, 2, c);
    Px.line(x - 1, gy, tx - 1, ty, 1, l);
    const arms = 2 + Math.floor(R() * 2);
    for (let i = 0; i < arms; i++) {
      const dir = i % 2 ? 1 : -1;
      const mx = tx + dir * (3 + R() * 4), my = ty - 2 - R() * 4;
      const ex = mx + dir * (1 + R() * 3), ey = gy - h + R() * 5;
      Px.line(tx, ty, mx, my, 1, c);
      Px.line(mx, my, ex, ey, 1, c);
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.5;
        Px.line(ex, ey, ex + Math.cos(a) * 3, ey + Math.sin(a) * 3, 1, k % 2 ? d : c);
      }
    }
  }

  // L3 + L4 for the whole road: dunes, guardrail, signs, highway (canvas x = world x, row 0 = screen y 96).
  function buildHighway() {
    const { cv, g } = canvas(LEN, H - HW_Y);
    g.translate(0, -HW_Y);
    Px.use(g);
    const R = rng(0xD00D);
    const duneFar = mix(C.dune, C.sky1, 0.3), duneLit = shade(C.dune, 0.2), duneShade = shade(C.dune, -0.1);
    // back dune row
    for (let x = 0; x < LEN; x++) {
      const t = Math.round(105 + 5 * Math.sin(x * 0.0083 + 2) + 3 * Math.sin(x * 0.023 + 0.5));
      Px.rect(x, t, 1, 134 - t, duneFar);
      Px.dot(x, t, shade(duneFar, 0.15));
    }
    // front dune line (L3): lit crests, shaded lee slopes, ripples
    const duneMid = mix(C.dune, duneShade, 0.5);
    for (let x = 0; x < LEN; x++) {
      const t = duneTop(x), sl = (113 + 5 * Math.sin((x + 2) * 0.011) + 3 * Math.sin((x + 2) * 0.027 + 1.3)) - (113 + 5 * Math.sin((x - 2) * 0.011) + 3 * Math.sin((x - 2) * 0.027 + 1.3));
      Px.rect(x, t, 1, 134 - t, C.dune);
      if (sl > 0.05) {                       // lee slope, facing away from the sun
        const h = Math.min(9, Math.round(1 + sl * 4));
        Px.rect(x, t + 1, 1, h, duneShade);
        if (x % 2) Px.dot(x, t + 1 + h, duneShade);
      }
      Px.dot(x, t, sl <= 0.05 ? duneLit : duneShade);
    }
    for (let i = 0; i < LEN / 9; i++) {      // faint wind ripples
      const x = Math.round(R() * LEN), t = duneTop(x), y = Math.round(t + 6 + R() * (126 - t - 6));
      if (y < 129) { Px.rect(x, y, 2 + Math.round(R() * 3), 1, duneMid); Px.dot(x + 1, y - 1, duneLit); }
    }
    // guardrail: posts every 24 px, W-beam rail in 96 px runs, some missing or bent
    const railLit = shade(C.rail, 0.25), railDark = shade(C.rail, -0.3);
    for (let x = 12; x < LEN; x += 24) {
      const h = hash(x * 7 + 3);
      if (h < 0.08) continue;
      if (h > 0.9) { Px.line(x, 133, x + 3, 124, 2, C.rail); continue; }
      Px.rect(x, 123, 2, 11, C.rail);
      Px.rect(x, 123, 1, 11, railLit);
      Px.rect(x + 2, 126, 1, 8, duneShade);
    }
    const gone = x => hash(x + 99) < 0.22;
    for (let x = 0; x < LEN; x += 96) {
      if (gone(x)) continue;
      const bentL = x > 0 && gone(x - 96), bentR = gone(x + 96);
      const xa = x + (bentL ? 10 : 0), xb = x + 96 - (bentR ? 10 : 0);
      Px.rect(xa, 124, xb - xa, 1, railLit);
      Px.rect(xa, 125, xb - xa, 2, C.rail);
      Px.rect(xa, 127, xb - xa, 1, railDark);
      for (let b = 12; b < 96; b += 24) if (x + b > xa && x + b < xb) Px.dot(x + b, 125, railDark);
      if (bentL) { Px.line(xa, 125, xa - 9, 131, 2, C.rail); Px.dot(xa - 9, 132, railDark); }
      if (bentR) { Px.line(xb, 125, xb + 9, 131, 2, C.rail); Px.dot(xb + 9, 132, railDark); }
    }
    // sand drifts burying the rail
    for (let i = 0; i < LEN / 90; i++) {
      const x = R() * LEN, w = 8 + R() * 18;
      Px.oval(x, 133, w, 3 + R() * 3, C.sand);
      Px.rect(x - w * 0.5, 131, w * 0.8, 1, shade(C.sand, 0.12));
    }
    // signs at the road's back edge
    roadSign(g, 600, 'SPEED', '55');
    roadSign(g, 2318, 'ROAD OUT', null);

    // ---- L4: the bleached highway ----
    const asphLit = shade(C.asphalt, 0.08), asphLit2 = shade(C.asphalt, 0.16), asphDark = shade(C.asphalt, -0.08);
    Px.rect(0, 134, LEN, 82, C.asphalt);
    const bleach = shade(C.asphalt, 0.05);
    for (let i = 0; i < LEN / 80; i++) Px.oval(R() * LEN, 144 + R() * 56, 18 + R() * 40, 3 + R() * 5, bleach);
    for (let i = 0; i < LEN * 1.4; i++) Px.dot(R() * LEN, 134 + R() * 82, R() < 0.55 ? asphDark : asphLit2);
    // worn edge lines
    const edge = shade(C.asphalt, 0.22);
    for (let x = 0; x < LEN; x += 4) {
      if (hash(x * 3 + 1) > 0.4) Px.rect(x, 141, 4, 1, edge);
      if (hash(x * 5 + 7) > 0.35) Px.rect(x, 203, 4, 1, edge);
    }
    // centre dashes
    const dashD = shade(C.dash, -0.18);
    for (let x = 20; x < LEN; x += 64) {
      const h = hash(x * 13 + 5);
      if (h < 0.1) continue;
      const len = h < 0.3 ? 8 + Math.round(h * 40) : 24;
      Px.rect(x, 166, len, 1, C.dash);
      Px.rect(x, 167, len, 1, dashD);
      Px.dot(x + Math.round(h * len), 166, C.asphalt);
      Px.dot(x + Math.round(h * 7 * len) % len, 167, asphDark);
    }
    // skid marks
    const skid = shade(C.asphalt, -0.14);
    for (const [x0, y0, len, bend] of [[300, 178, 120, 10], [1010, 150, 90, -8], [1350, 190, 140, 6], [1880, 184, 100, -12], [2210, 160, 80, 9]]) {
      for (const dy of [0, 7]) {
        let px = x0, py = y0 + dy;
        for (let s = 1; s <= 16; s++) {
          const t = s / 16, x = x0 + len * t, y = y0 + dy + Math.sin(t * Math.PI) * bend;
          if (hash(x0 + s * 3 + dy) > 0.15) Px.line(px, py, x, y, 2, skid);
          px = x; py = y;
        }
      }
    }
    // cracks, getting worse toward the collapse
    for (let tx = 0; tx < LEN; tx += 64) {
      const bad = tx > 2180;
      const n = (hash(tx) > 0.55 ? 2 : 1) + (bad ? 2 : 0);
      for (let i = 0; i < n; i++) crackLine(R, tx + R() * 64, 140 + R() * 64, bad ? 9 : 5, bad && i > 1 ? shade(C.crack, -0.25) : C.crack);
    }
    // sunken patches before the crater: sand-filled potholes, a long fissure
    for (let i = 0; i < 9; i++) {
      const x = 2260 + R() * 760, y = 146 + R() * 52;
      Px.oval(x, y, 6 + R() * 8, 2 + R() * 2, shade(C.asphalt, -0.2));
      Px.oval(x + 1, y + 1, 4 + R() * 5, 1 + R(), C.sand);
    }
    Px.line(2296, 150, 2350, 158, 1, shade(C.crack, -0.3));
    Px.line(2350, 158, 2398, 152, 1, shade(C.crack, -0.3));
    Px.line(2398, 152, 2470, 170, 1, shade(C.crack, -0.3));
    // oil stains under the wrecks
    Px.oval(832, 145, 44, 3, shade(C.asphalt, -0.25));
    Px.oval(1640, 146, 44, 3, shade(C.asphalt, -0.25));
    // sand creeping in from the top edge
    const sandDark = shade(C.sand, -0.16), sandLit = shade(C.sand, 0.14);
    for (let x = 0; x < LEN; x++) {
      const d = sandDepth(x);
      Px.rect(x, 134, 1, d, C.sand);
      Px.dot(x, 134 + d, sandDark);
      if (hash(x * 3 + 2) < 0.35) Px.dot(x, 134 + Math.floor(d * hash(x * 7)), sandLit);
    }
    // wind-blown sand wisps across the lanes
    g.globalAlpha = 0.55;
    for (let i = 0; i < LEN / 22; i++) Px.rect(R() * LEN, 140 + R() * 64, 4 + R() * 14, 1, C.sand);
    g.globalAlpha = 1;
    // sandy shoulder at the front
    for (let x = 0; x < LEN; x++) {
      const t = 207 + Math.round(3 * vnoise(x / 9));
      Px.rect(x, t, 1, H - t, C.sand);
      Px.dot(x, t, sandDark);
    }
    // glass shards where the glints flash
    for (const gl of glints) Px.dot(gl.x, gl.y, shade(C.glint, -0.18));
    return cv;
  }
  function roadSign(g, x, label, big) {
    const post = C.crack;
    if (big) {
      Px.line(x, 134, x + 2, 108, 2, post);
      Px.rect(x - 15, 90, 34, 19, C.carWin);
      Px.rect(x - 14, 91, 32, 17, '#D8D0C4');
      Px.rect(x - 14, 91, 32, 1, shade('#D8D0C4', 0.3));
      drawText(g, label, x + 2, 93, C.carWin, 1, 'center', null);
      drawText(g, big, x + 2, 100, C.carWin, 1, 'center', null);
      for (const [hx, hy] of [[-9, 98], [10, 104], [4, 92], [13, 95]]) { Px.dot(x + hx, hy, C.carWin); Px.dot(x + hx + 1, hy + 1, '#F0E8DA'); }
      return;
    }
    Px.rect(x - 22, 106, 2, 28, post); Px.rect(x + 20, 106, 2, 28, post);
    Px.rect(x - 28, 96, 58, 13, C.stripe);
    Px.rect(x - 27, 97, 56, 11, '#D8D0C4');
    drawText(g, label, x + 1, 99, C.stripe, 1, 'center', null);
    for (const [hx, hy] of [[-20, 100], [14, 105], [24, 98]]) { Px.dot(x + hx, hy, C.carWin); Px.dot(x + hx + 1, hy + 1, '#F0E8DA'); }
  }

  // Brood crater floor and walls (canvas x = world x - 2400, row 0 = screen y 40).
  function buildCrater() {
    const { cv, g } = canvas(CR_W, H - CR_Y);
    g.translate(-CRATER_X, -CR_Y);
    Px.use(g);
    const R = rng(0xC2A7);
    const X0 = CRATER_X, X1 = CRATER_X + CR_W;
    const rimLit = shade(C.rim, 0.12), rimDeep = shade(C.rimDark, -0.18);
    const wallTop = x => Math.round(92 + 5 * Math.sin(x * 0.045) + 6 * (vnoise(x / 6) - 0.5) + 3 * Math.sin(x * 0.013 + 1));
    // back wall: slanted sediment strata, darker toward the floor
    const strata = [C.rim, shade(C.rim, -0.07), C.rimDark, shade(C.rim, 0.07), C.rim, shade(C.rimDark, 0.1)];
    for (let x = X0; x < X1; x++) {
      const top = wallTop(x);
      let y = top, cur = null, run = top;
      for (; y <= 134; y++) {
        let c = strata[Math.floor((y + (x - X0) * 0.14 + 3 * Math.sin(x * 0.02)) / 5) % strata.length];
        if (y > 124) c = y > 130 ? rimDeep : C.rimDark;
        if (c !== cur) { if (cur) Px.rect(x, run, 1, y - run, cur); cur = c; run = y; }
      }
      Px.rect(x, run, 1, 135 - run, cur);
    }
    // erosion grooves
    for (let i = 0; i < 16; i++) {
      const x = Math.round(X0 + R() * CR_W), top = wallTop(x), len = 10 + R() * 20;
      Px.rect(x, top + 5, 1, len, shade(C.rimDark, 0.06));
      Px.rect(x + 1, top + 5, 1, len * 0.6, rimLit);
    }
    // the snapped highway along the rim: asphalt slab edge, rebar, a few guardrail posts
    for (let x = X0; x < X1; x++) {
      if (hash(Math.floor(x / 40) * 17 + 3) < 0.18) continue;  // broken-away gaps
      const top = wallTop(x), th = 4 + Math.round(2 * vnoise(x / 5));
      Px.rect(x, top - th, 1, th, C.asphalt);
      Px.dot(x, top - th, shade(C.asphalt, 0.18));
      Px.dot(x, top - 1, C.crack);
      if (hash(x * 9) < 0.022) Px.line(x, top, x + (hash(x) - 0.5) * 4, top + 3 + hash(x * 3) * 5, 1, C.crack);
    }
    for (let x = X0 + 20; x < X1; x += 48) {
      if (hash(x * 5) < 0.35) continue;
      const top = wallTop(x) - 5;
      Px.line(x, top, x + (hash(x) - 0.5) * 6, top - 8, 2, C.rail);
    }
    // slabs that fell in against the wall
    const slab = (x0, y0, x1, y1, w) => {
      Px.quad(x0, y0, x1, y1, w, w, C.asphalt);
      Px.quad(x0 - 1, y0 - w * 0.45, x1 - 1, y1 - w * 0.45, 1, 1, shade(C.asphalt, 0.2));
      Px.quad(x0 + 1, y0 + w * 0.45, x1 + 1, y1 + w * 0.45, 2, 2, shade(C.crack, -0.25));
      Px.quad(lerp(x0, x1, 0.35), lerp(y0, y1, 0.35), lerp(x0, x1, 0.55), lerp(y0, y1, 0.55), 2, 2, C.dash);
      Px.line(x1, y1, x1 + 4, y1 - 5, 1, C.crack); Px.line(x1, y1 + 2, x1 + 6, y1 - 1, 1, C.crack);
    };
    slab(2420, 136, 2448, 104, 12);
    slab(2706, 134, 2740, 112, 10);
    slab(2996, 136, 3020, 100, 13);
    // floor
    Px.rect(X0, 134, CR_W, 82, C.crater);
    for (let y = 134; y < 142; y++) { const k = (y - 134) / 8; Px.rect(X0, y, CR_W, 1, mix(C.rimDark, C.crater, k)); }
    const flD = shade(C.crater, -0.08), flL = shade(C.crater, 0.1);
    for (let i = 0; i < 240; i++) {     // wind ripples
      const x = X0 + R() * CR_W, y = 144 + R() * 60, w = 4 + R() * 10;
      Px.rect(x, y, w, 1, flD);
      Px.rect(x + 1, y - 1, w - 2, 1, flL);
    }
    for (let i = 0; i < 900; i++) Px.dot(X0 + R() * CR_W, 136 + R() * 72, R() < 0.5 ? flD : R() < 0.5 ? flL : C.rimDark);
    // scorpion tracks wandering across the floor: paired leg prints and a dragged tail
    const trk = shade(C.crater, -0.16);
    for (const [x0, y0, a0] of [[2430, 196, -0.25], [2600, 160, 0.25], [2830, 190, -0.1], [2950, 168, 0.35]]) {
      let x = x0, y = y0, a = a0;
      for (let i = 0; i < 28; i++) {
        a += (R() - 0.5) * 0.45;
        x += Math.cos(a) * 4; y = clamp(y + Math.sin(a) * 1.6, 146, 204);
        const nx = -Math.sin(a) * 3, ny = Math.cos(a) * 1.4;
        Px.dot(x + nx, y + ny, trk); Px.dot(x - nx, y - ny, trk);
        Px.dot(x, y, shade(C.crater, -0.08));
      }
    }
    // asphalt chunks that came down with Juno (more on the left)
    for (let i = 0; i < 26; i++) {
      const x = X0 + Math.pow(R(), 1.8) * CR_W, y = 142 + R() * 62, w = 2 + R() * 5, h = 2 + R() * 3;
      Px.rect(x, y, w, h, C.asphalt);
      Px.rect(x, y + h, w, 1, shade(C.crack, -0.3));
      Px.rect(x, y, w, 1, shade(C.asphalt, 0.18));
    }
    // jutting broken highway slabs on the floor
    const jut = (x, y, w, h, lean) => {
      Px.poly([x, y, x + w, y + 1, x + w + lean, y - h, x + lean, y - h + 2], C.asphalt);
      Px.poly([x + w - 3, y + 1, x + w, y + 1, x + w + lean, y - h, x + w + lean - 3, y - h], shade(C.asphalt, -0.2));
      Px.line(x + lean, y - h + 2, x + w + lean, y - h, 1, shade(C.asphalt, 0.2));
      Px.line(x + lean * 0.5 + w * 0.4, y - h * 0.5, x + lean * 0.5 + w * 0.6, y - h * 0.5, 2, C.dash);
      Px.oval(x + w / 2, y + 1, w * 0.7, 2, shade(C.crater, -0.18));
    };
    jut(2412, 206, 16, 22, 5);
    jut(2604, 146, 12, 18, -4);
    jut(2860, 148, 10, 14, 3);
    jut(3040, 204, 14, 20, -5);
    // rib-bone arcs of something huge, half buried
    const ribs = (x0, n, baseY, h0) => {
      const boneD = shade(C.bone, -0.22), boneL = '#F8F4EC';
      for (let x = x0 - 8; x < x0 + n * 15 + 2; x += 6) {       // half-buried spine
        Px.oval(x, baseY + 1, 3, 2, boneD);
        Px.oval(x - 0.5, baseY, 2.5, 1.5, C.bone);
      }
      for (let i = 0; i < n; i++) {
        const cx = x0 + i * 15, h = h0 * (1 - Math.abs(i - (n - 1) / 2) / (n + 1)) + hash(cx) * 5;
        const tipK = hash(cx + 1) < 0.5 ? 0.82 : 1;
        const pts = [];
        for (let s2 = 0; s2 <= 16; s2++) {
          const t = (s2 / 16) * tipK;
          pts.push([(1 - t) * (1 - t) * (cx - 3) + 2 * (1 - t) * t * (cx + 3) + t * t * (cx + 14),
            (1 - t) * (1 - t) * baseY + 2 * (1 - t) * t * (baseY - h * 1.35) + t * t * (baseY - h * 0.3)]);
        }
        for (let k = 1; k < pts.length; k++) {
          const t = k / pts.length, w = Math.max(2, Math.round(4 - t * 2.4));
          Px.limb(pts[k - 1][0] + 1, pts[k - 1][1] + 1, pts[k][0] + 1, pts[k][1] + 1, w, w, boneD);
        }
        for (let k = 1; k < pts.length; k++) {
          const t = k / pts.length, w = Math.max(1, Math.round(3 - t * 2));
          Px.limb(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], w, w, C.bone);
        }
        for (let k = 2; k < 9; k++) Px.dot(pts[k][0] - 1, pts[k][1], boneL);
        const e = pts[pts.length - 1];
        Px.dot(e[0] + 1, e[1] + 1, boneD);
        Px.oval(cx - 3, baseY + 1, 4, 1.5, shade(C.crater, -0.22));
      }
    };
    ribs(2470, 6, 142, 26);
    ribs(2900, 5, 140, 22);
    // a horned skull half sunk in the sand
    {
      const sx = 2806, sy = 140, bd = shade(C.bone, -0.22);
      Px.line(sx - 6, sy - 9, sx - 15, sy - 16, 2, bd); Px.line(sx - 15, sy - 16, sx - 13, sy - 23, 2, bd);
      Px.line(sx + 5, sy - 9, sx + 15, sy - 15, 2, C.bone); Px.line(sx + 15, sy - 15, sx + 14, sy - 22, 2, C.bone);
      Px.oval(sx, sy - 6, 8, 6, C.bone);
      Px.poly([sx - 4, sy - 3, sx + 4, sy - 3, sx + 2, sy + 4, sx - 2, sy + 4], C.bone);
      Px.oval(sx + 2, sy - 5, 6, 4, shade(C.bone, -0.08));
      Px.oval(sx - 3, sy - 6, 1.5, 2, C.carWin); Px.oval(sx + 3, sy - 6, 1.5, 2, C.carWin);
      Px.rect(sx - 1, sy, 1, 2, bd); Px.rect(sx + 1, sy, 1, 2, bd);
      Px.dot(sx - 5, sy - 10, '#F8F4EC'); Px.dot(sx - 3, sy - 11, '#F8F4EC');
      Px.oval(sx, sy + 4, 12, 2.5, C.crater);
      Px.rect(sx - 11, sy + 2, 22, 1, shade(C.crater, -0.12));
    }
    // front crater lip
    for (let x = X0; x < X1; x++) {
      const t = 206 + Math.round(4 * vnoise(x / 11) + 2 * Math.sin(x * 0.05));
      Px.rect(x, t, 1, H - t, C.rimDark);
      Px.dot(x, t, C.rim);
      Px.dot(x, t + 1, shade(C.rim, -0.05));
      if (hash(x * 13) < 0.2) Px.dot(x, t + 3 + hash(x) * 6, rimDeep);
    }
    return cv;
  }

  // Glass glints (positions shared by the static shards and the 1 f flashes).
  const glints = [];
  (function () {
    const R = rng(0x6A55);
    for (let x = 30; x < LEN; x += 40 + Math.floor(R() * 50)) {
      const onRoad = R() < 0.55;
      const y = onRoad ? 140 + Math.floor(R() * 62) : duneTop(x) + 3 + Math.floor(R() * 12);
      glints.push({ x, y: Math.min(y, 132 + (onRoad ? 80 : 0)), ph: Math.floor(R() * 90) });
    }
    for (const [cx, n] of [[830, 6], [1640, 7]]) {         // shattered windscreens by the wrecks
      for (let i = 0; i < n; i++) glints.push({ x: cx - 36 + Math.floor(R() * 72), y: 148 + Math.floor(R() * 10), ph: Math.floor(R() * 90) });
    }
  })();

  function ensureCaches() {
    if (cache.sky) return;
    cache.sky = buildSky();
    cache.mesa = buildMesas();
    cache.l2 = buildL2();
    cache.hw = buildHighway();
    cache.crater = buildCrater();
  }

  // ---------- car wrecks (depth-sorted solids) ----------
  class Wreck extends Ent {
    constructor(x, y, kind, trunkProp) {
      super(x, y);
      this.kind = kind; this.team = 'deco'; this.shadowR = 0; this.noShadow = true;
      this.w = 24; this.h = 22; this.trunkProp = trunkProp || null;
    }
    update() { this.t++; }
    draw(ctx, camX) {
      Px.use(ctx);
      const ox = Math.round(this.x - camX), oy = Math.round(this.y);
      if (ox < -90 || ox > W + 90) return;
      ctx.globalAlpha = 0.3;
      Px.oval(ox - (this.kind === 'flipped' ? 0 : 12), oy + 1, 48, 3, '#000');
      ctx.globalAlpha = 1;
      const flipped = this.kind === 'flipped';
      Sprite.begin(176, 60, 88, 52);
      if (flipped) drawFlippedCar(0, 0); else drawSedan(0, 0, !this.trunkProp || this.trunkProp.remove);
      Sprite.end(ctx, ox, oy, 1, {});
      Px.use(ctx);
      if (flipped) flippedSand(ox, oy); else sedanSand(ox, oy);
    }
  }
  function carShades() { return { b: C.car, lit: shade(C.car, 0.22), dk: shade(C.car, -0.28), rust: shade(C.car, -0.45), w: C.carWin }; }
  // Sedan facing left, body from x-53 to x+23; its trunk is a Breakable sitting at x+35.
  function drawSedan(x, y, trunkGone) {
    const k = carShades();
    const P = (pts) => pts.map((v, i) => (i % 2 ? y + v : x + v));
    // wheels behind the body (far side) and arches
    for (const wx of [-36, 11]) Px.disc(x + wx, y - 6, 8, k.w);
    Px.poly(P([-54, -4, -54, -11, -51, -15, -28, -18, -25, -18, -15, -29, 8, -29, 16, -18, 23, -15, 23, -4,
      19, -4, 18, -9, 15, -12, 7, -12, 4, -9, 3, -4, -28, -4, -29, -9, -32, -12, -40, -12, -43, -9, -44, -4]), k.b);
    // highlights and shading
    Px.poly(P([-51, -15, -28, -18, -26, -17, -50, -14]), k.lit);
    Px.rect(x - 15, y - 29, 23, 1, k.lit);
    Px.rect(x - 53, y - 11, 76, 1, shade(C.car, -0.12));
    Px.rect(x - 53, y - 6, 9, 2, k.dk); Px.rect(x - 28, y - 6, 31, 2, k.dk); Px.rect(x + 19, y - 6, 4, 2, k.dk);
    // windows
    Px.poly(P([-25, -18, -16, -28, -13, -28, -19, -18]), k.w);
    Px.poly(P([-16, -18, -11, -27, -2, -27, -2, -18]), k.w);
    Px.poly(P([1, -18, 1, -27, 7, -27, 13, -18]), k.w);
    Px.line(x - 9, y - 26, x - 12, y - 20, 1, '#4A3A34');
    Px.line(x + 3, y - 25, x + 2, y - 21, 1, '#4A3A34');
    Px.dot(x - 6, y - 25, '#6A5A50');
    // door seams, handles, mirror
    Px.rect(x - 17, y - 18, 1, 12, k.dk); Px.rect(x - 1, y - 18, 1, 12, k.dk); Px.rect(x + 14, y - 17, 1, 9, k.dk);
    Px.rect(x - 13, y - 15, 3, 1, k.dk); Px.rect(x + 3, y - 15, 3, 1, k.dk);
    Px.rect(x - 22, y - 20, 2, 2, k.dk);
    // rust, bullet holes
    for (const [rx, ry, rw] of [[-48, -13, 5], [-34, -14, 3], [-8, -9, 4], [9, -14, 3], [18, -10, 3]]) Px.rect(x + rx, y + ry, rw, 2, k.rust);
    for (const [hx, hy] of [[-6, -14], [-3, -10], [6, -12], [20, -13], [-40, -15]]) { Px.dot(x + hx, y + hy, k.w); Px.dot(x + hx - 1, y + hy - 1, k.lit); }
    // headlight socket, grille, hanging bumper
    Px.rect(x - 54, y - 12, 2, 3, k.w);
    Px.rect(x - 54, y - 8, 1, 3, k.dk);
    Px.line(x - 56, y - 6, x - 47, y - 5, 1, C.crack);
    Px.line(x - 56, y - 6, x - 58, y - 2, 1, C.crack);
    // wheels in their arches, sunk in sand
    for (const wx of [-36, 11]) {
      Px.disc(x + wx, y - 5, 6, '#3A2C26');
      Px.disc(x + wx, y - 5, 2.5, C.crack);
      Px.dot(x + wx - 1, y - 6, shade(C.crack, 0.3));
    }
    if (trunkGone) {
      Px.poly(P([23, -15, 30, -13, 28, -10, 31, -8, 28, -4, 23, -4]), k.w);
      Px.line(x + 23, y - 15, x + 30, y - 13, 1, k.dk);
      Px.line(x + 28, y - 4, x + 31, y - 8, 1, k.dk);
      Px.dot(x + 26, y - 9, C.crack);
    }
  }
  // Sand banked against the wrecks (drawn outside the outlined sprite).
  function sedanSand(x, y) {
    Px.poly([x - 70, y + 1, x - 60, y - 9, x - 52, y - 6, x - 40, y + 1], C.sand);
    Px.line(x - 70, y + 1, x - 60, y - 9, 1, shade(C.sand, 0.15));
    Px.oval(x - 36, y, 11, 3, C.sand); Px.oval(x + 11, y, 10, 3, C.sand);
    Px.rect(x - 50, y, 70, 1, shade(C.sand, -0.12));
  }
  function flippedSand(x, y) {
    Px.poly([x + 36, y + 1, x + 47, y - 13, x + 58, y + 1], C.sand);
    Px.line(x + 47, y - 13, x + 58, y + 1, 1, shade(C.sand, -0.15));
    Px.oval(x - 44, y, 12, 3, C.sand);
    Px.oval(x - 4, y + 1, 20, 2, C.sand);
  }
  // Overturned car, wheels in the air (x-44..x+44).
  function drawFlippedCar(x, y) {
    const k = carShades();
    const P = (pts) => pts.map((v, i) => (i % 2 ? y + v : x + v));
    // crushed cabin on the ground
    Px.poly(P([-26, 0, 22, 0, 28, -9, -30, -9]), k.dk);
    Px.poly(P([-22, -1, -10, -1, -10, -7, -25, -7]), k.w);
    Px.poly(P([-7, -1, 6, -1, 6, -7, -7, -7]), k.w);
    Px.poly(P([9, -1, 18, -1, 22, -7, 9, -7]), k.w);
    // body
    Px.poly(P([-44, -9, 44, -9, 43, -23, -42, -24]), k.b);
    Px.rect(x - 44, y - 10, 88, 1, k.lit);
    Px.rect(x - 43, y - 16, 86, 1, shade(C.car, -0.12));
    Px.rect(x - 43, y - 22, 86, 1, k.dk);
    Px.rect(x - 14, y - 22, 1, 12, k.dk); Px.rect(x + 8, y - 22, 1, 12, k.dk);
    // undercarriage on top
    Px.poly(P([-40, -24, 42, -23, 39, -28, -36, -29]), '#3A2A20');
    Px.line(x - 30, y - 27, x + 34, y - 26, 1, C.crack);
    Px.rect(x + 34, y - 28, 6, 2, C.crack);
    Px.rect(x - 6, y - 29, 10, 2, shade('#3A2A20', 0.2));
    for (const [rx, ry, rw] of [[-34, -18, 6], [2, -14, 4], [24, -20, 5], [-20, -12, 3]]) Px.rect(x + rx, y + ry, rw, 2, k.rust);
    // wheels up (the rear one is gone)
    Px.disc(x - 26, y - 33, 7, k.w);
    Px.disc(x - 26, y - 33, 5, '#3A2C26');
    Px.disc(x - 26, y - 33, 2.2, C.crack);
    Px.rect(x + 22, y - 33, 7, 4, C.crack);
    Px.line(x + 25, y - 33, x + 28, y - 39, 1, C.crack);
    Px.line(x + 28, y - 39, x + 31, y - 38, 1, C.crack);
  }

  // ---------- runtime state ----------
  let S = null;
  let wind = null, watch = null;
  function freshState() {
    const R = rng(0x57A6E2);
    const streaks = [], blobs = [], weeds = [], cacti = [];
    for (let i = 0; i < 60; i++) streaks.push({ x: R() * (W + 40), y: 24 + R() * (H - 24), len: 6 + Math.floor(R() * 9), vy: (R() - 0.5) * 0.4 });
    for (let i = 0; i < 6; i++) blobs.push({ x: R() * (W + 200) - 100, y: 60 + R() * 140, rx: 50 + R() * 50, ry: 10 + R() * 14, v: 2 + R() * 1.5 });
    for (let i = 0; i < 3; i++) weeds.push({ fx: 120 + i * 230 + R() * 100, y: 202 + R() * 10, r: 4 + Math.floor(R() * 2), ph: R() * 10 });
    for (let fx = 160; fx < LEN * 1.3 + W; fx += 320 + Math.floor(R() * 120)) cacti.push({ fx, h: 26 + Math.floor(R() * 16), arm: R() < 0.5 ? -1 : 1, arm2: R() < 0.5 });
    return {
      t: 0, R, hintT: 0,
      storm: 0, stormT: 0, stormK: 0, streaks, blobs, weeds, cacti,
      col: 0, colT: 0, cracks: [], cx: 0, cy: 0, fadeA: 0, landed: false, crater: false, sandBurst: 0,
      bossT: 0, cardSeen: false, broodT: 0,
    };
  }

  // ---------- audio: sandstorm wind layer + collapse SFX ----------
  SFX.s2Crack = (a, p) => {
    const d = a.out(p);
    a.noise(0.09, 0.35, 2200, 1.4, 'bandpass', 0, d, 500);
    a.noise(0.04, 0.22, 4200, 1, 'highpass', 0.05, d);
    a.tone(110, 45, 0.14, 'square', 0.08, 0, d);
  };
  SFX.s2Collapse = (a, p) => {
    const d = a.out(p, true);
    a.noise(1.3, 0.55, 260, 0.6, 'lowpass', 0, d, 50);
    a.noise(0.6, 0.35, 1500, 0.8, 'bandpass', 0.04, d, 250);
    a.tone(60, 28, 1.1, 'sine', 0.45, 0, d, 0.02);
    for (let i = 0; i < 6; i++) a.noise(0.06, 0.3, 1800 + i * 300, 1.2, 'bandpass', 0.08 + i * 0.09, d);
  };
  SFX.s2Hatch = (a, p) => {
    const d = a.out(p);
    a.noise(0.08, 0.3, 1600, 2, 'bandpass', 0, d, 700);
    a.tone(320, 140, 0.1, 'sine', 0.12, 0.02, d);
  };
  function startWind() {
    if (wind || !Sound.ok() || !Sound.noiseBuf || !Sound.sfxBus) return;
    try {
      const c = Sound.ctx, now = c.currentTime;
      const src = c.createBufferSource(); src.buffer = Sound.noiseBuf; src.loop = true;
      const howl = c.createBiquadFilter(); howl.type = 'bandpass'; howl.frequency.value = 420; howl.Q.value = 1.4;
      const howlG = c.createGain(); howlG.gain.value = 2.4;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.13;
      const lfoAmt = c.createGain(); lfoAmt.gain.value = 220;
      lfo.connect(lfoAmt); lfoAmt.connect(howl.frequency);
      const hiss = c.createBiquadFilter(); hiss.type = 'highpass'; hiss.frequency.value = 3200;
      const hissG = c.createGain(); hissG.gain.value = 0.08;
      const gust = c.createGain(); gust.gain.value = 0.75;
      const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.31;
      const lfo2Amt = c.createGain(); lfo2Amt.gain.value = 0.25;
      lfo2.connect(lfo2Amt); lfo2Amt.connect(gust.gain);
      const out = c.createGain();
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.5, now + 2.5);
      src.connect(howl); howl.connect(howlG); howlG.connect(gust);
      src.connect(hiss); hiss.connect(hissG); hissG.connect(gust);
      gust.connect(out); out.connect(Sound.sfxBus);
      src.start(now); lfo.start(now); lfo2.start(now);
      wind = { src, lfo, lfo2, out, level: 0.5 };
      if (!watch) watch = setInterval(windWatch, 250);
    } catch (e) { wind = null; }
  }
  function stopWind(sec = 0.05) {
    const w = wind;
    wind = null;
    if (watch) { clearInterval(watch); watch = null; }
    if (!w || !Sound.ctx) return;
    try {
      const now = Sound.ctx.currentTime, gn = w.out.gain;
      gn.cancelScheduledValues(now);
      gn.setValueAtTime(Math.max(0.0001, gn.value), now);
      gn.exponentialRampToValueAtTime(0.0001, now + sec);
      const end = now + sec + 0.05;
      w.src.stop(end); w.lfo.stop(end); w.lfo2.stop(end);
    } catch (e) { /* already stopped */ }
  }
  // The wind must never outlive the storm: quit to title, a stage restart or game over all stop it.
  function windWatch() {
    if (!wind) { if (watch) { clearInterval(watch); watch = null; } return; }
    const here = Game.stage && Game.stage.s2Stage && ['play', 'pause', 'continue', 'clear', 'stageintro'].includes(Game.state);
    if (!here || !S || S.storm === 0) { stopWind(0.3); return; }
    const level = Game.state === 'pause' || Game.state === 'continue' ? 0.08 : 0.5;
    if (level !== wind.level && Sound.ctx) {
      wind.level = level;
      try { wind.out.gain.setTargetAtTime(level, Sound.ctx.currentTime, 0.15); } catch (e) { /* ignore */ }
    }
  }

  // ---------- sandstorm (W4) ----------
  const HERO_WIND = new Set(['idle', 'walk', 'run', 'skid', 'land', 'pickup', 'throwing', 'attack', 'grab', 'hurt', 'down', 'getup', 'jumpsquat']);
  const FOE_WIND = new Set(['idle', 'walk', 'hurt', 'down', 'getup', 'dizzy', 'taunt', 'panic', 'attack']);
  function stormStart(g) {
    S.storm = 1; S.stormT = 0;
    g.warn('SANDSTORM!', 180);
  }
  function stormEnd(g) {
    if (S.storm === 0 || S.storm === 3) return;
    S.storm = 3;
    g.silhouetteDist = 0;
    Sound.musicFilter(20000, 2);
    stopWind(2);
  }
  function stormUpdate(g) {
    if (S.storm === 1) {
      if (++S.stormT >= 180) {
        S.storm = 2; S.stormT = 0;
        Sound.musicFilter(900, 3);
        Sound.sfx('whooshBig');
        startWind();
      }
    } else if (S.storm === 2) {
      S.stormT++;
      S.stormK = Math.min(1, S.stormT / 120);
      if (S.stormK >= 0.4) g.silhouetteDist = 130;
      if (!wind) startWind();
      windPush(g, 0.4);
      // sand skating along the ground
      if (S.stormT % 3 === 0) FX.add({ kind: 'dust', x: g.cam.x + W + rr(0, 20), y: rr(g.bounds.yMin, g.bounds.yMax), z: rr(0, 6), vx: rr(-5, -3), vz: rr(0, 0.3), life: ri(50, 80), size: rr(1.5, 3), color: C.streak, g: 0.005, alpha: 0.5 * S.stormK });
    } else if (S.storm === 3) {
      S.stormK = Math.max(0, S.stormK - 1 / 90);
      if (S.stormK <= 0) S.storm = 0;
    }
    if (S.stormK > 0) {
      for (const s of S.streaks) {
        s.x -= 6; s.y += s.vy;
        if (s.x + s.len < 0 || s.y < 22 || s.y > H) { s.x = W + S.R() * 40; s.y = 24 + S.R() * (H - 24); }
      }
      for (const b of S.blobs) { b.x -= b.v; if (b.x + b.rx < 0) { b.x = W + b.rx + S.R() * 80; b.y = 60 + S.R() * 140; } }
    }
  }
  // Wind drags every grounded non-boss actor (the hero too) to the left.
  function windPush(g, k) {
    const p = g.player;
    if (p && !g.playerGone && p.z <= 0 && !(p.hs > 0) && HERO_WIND.has(p.state)) p.x = Math.max(g.cam.x + 10, p.x - k);
    for (const e of g.ents) {
      if (e.team !== 'enemy' || e.boss || e.remove || e.z > 0 || e.hs > 0 || !FOE_WIND.has(e.state)) continue;
      e.x = Math.max(g.cam.x + 6, e.x - k);
    }
  }

  // ---------- road collapse (lock 2400) ----------
  function makeCracks(p) {
    const R = rng(0xC0 + Math.round(p.x));
    S.cx = p.x; S.cy = p.y;
    S.cracks = [Math.PI + 0.3, -0.25, Math.PI * 0.5 + 0.45].map(a0 => {
      const pts = [S.cx, S.cy];
      let x = S.cx, y = S.cy, a = a0;
      for (let i = 0; i < 9; i++) {
        a += (R() - 0.5) * 0.8;
        const l = 9 + R() * 8;
        x += Math.cos(a) * l; y = clamp(y + Math.sin(a) * l * 0.42, 137, 212);
        pts.push(x, y);
      }
      const at = 2 + Math.floor(R() * 4), bp = [pts[at * 2], pts[at * 2 + 1]];
      let bx = bp[0], by = bp[1], ba = a0 + (R() < 0.5 ? 0.9 : -0.9);
      for (let i = 0; i < 4; i++) { ba += (R() - 0.5) * 0.6; bx += Math.cos(ba) * 8; by = clamp(by + Math.sin(ba) * 3.5, 137, 212); bp.push(bx, by); }
      return { pts, at, bp };
    });
  }
  function collapseStart() { S.col = 1; S.colT = 0; }
  function collapseUpdate(g) {
    const p = g.player;
    if (!p || S.col === 0 || S.col === 5) return;
    S.colT++;
    if (S.col === 1) {
      // never start the cave-in on a dying or respawning hero: let her death and respawn resolve first
      if (p.hp <= 0 || g.playerGone || g.respawnDrop) { S.colT = 0; return; }
      const ready = p.z <= 0 && ['idle', 'walk', 'run', 'skid', 'land'].includes(p.state);
      if (ready || S.colT > 90) {
        S.col = 2; S.colT = 0;
        makeCracks(p);
        if (p.z <= 0) { p.setState('idle'); p.vx = p.vy = 0; }
        Sound.sfx('rumble', p.x);
      }
      return;
    }
    if (S.col === 2 || S.col === 3) {
      p.hs = 2 + (S.colT % 2); p.hitJitter = true; p.blink = false;
      p.inv = Math.max(p.inv, 2);
    }
    if (S.col === 2) {
      if (S.colT % 4 === 1) FX.shake(2, 6);
      if (S.colT % 7 === 1) Sound.sfx('s2Crack', S.cx);
      if (S.colT % 3 === 0) {
        const k = S.colT / 30;
        for (const cr of S.cracks) {
          const n = cr.pts.length / 2 - 1, i = Math.min(n, Math.floor(k * n));
          FX.dust(cr.pts[i * 2], cr.pts[i * 2 + 1], 1, 0.6, '#B09878');
          if (S.colT % 9 === 0) FX.debris(cr.pts[i * 2], cr.pts[i * 2 + 1], 0, [C.asphalt, C.crack], 2, [1, 2]);
        }
      }
      if (S.colT >= 30) { S.col = 3; S.colT = 0; Sound.sfx('s2Collapse', S.cx); FX.shake(4, 24); }
    } else if (S.col === 3) {
      S.fadeA = Math.min(1, S.colT / 12);
      if (S.colT >= 12) { enterCrater(g, true); S.col = 4; S.colT = 0; }
    } else if (S.col === 4) {
      S.fadeA = Math.max(0, 1 - S.colT / 12);
      if (!S.landed && S.colT > 2 && p.z <= 0) {
        S.landed = true;
        FX.dustRing(p.x, p.y, 18);
        FX.dust(p.x, p.y, 10, 1.8, '#C8A070');
        FX.shake(3, 14);
        Sound.sfx('thud', p.x);
      }
      if ((S.landed && S.fadeA <= 0) || S.colT > 150) { S.col = 5; S.fadeA = 0; }
    }
  }
  // Switch the floor to the crater. drop = Juno falls in from above (otherwise: test jump straight to the boss).
  function enterCrater(g, drop) {
    S.crater = true;
    S.sandBurst = 180;
    FX.decals.length = 0;
    g.add(new Breakable('crate', 2584, 184, 'beans'));
    g.add(new Breakable('drum', 2708, 150, 'cactus'));
    g.add(new Breakable('drum', 3052, 190, 'cap'));
    for (const e of g.ents) if (e.team === 'item' && e.x >= CRATER_X - 20) { e.z = Math.max(e.z, 30); e.vz = 0; }
    if (!drop) return;
    const p = g.player;
    p.hs = 0; p.hitJitter = false; p.atk = null;
    p.setState('jump');
    p.z = 90; p.vz = 0; p.vx = 0; p.vy = 0; p.jumpDir = 0; p.airUsed = false;
    for (let i = 0; i < 18; i++) {
      const y = rr(140, 205);
      FX.add({ kind: 'chunk', x: g.cam.x + rr(10, W - 10), y, ground: y, z: rr(50, 120), vx: rr(-0.6, 0.6), vz: rr(-1, 0), life: 90, color: pick([C.asphalt, C.crack, C.dash, C.rim]), size: ri(2, 4), g: 0.24 });
    }
  }
  function drawCracks(ctx, camX) {
    const k = S.col === 2 ? clamp(S.colT / 30, 0, 1) : 1;
    const dark = '#2A1E16', lip = shade(C.asphalt, 0.24);
    Px.use(ctx);
    Px.oval(S.cx - camX, S.cy, 2 + 7 * k, 1 + 2.5 * k, dark);
    const seg = (pts, upto, thick) => {
      const n = pts.length / 2 - 1, L = clamp(upto, 0, n);
      for (let i = 0; i < Math.ceil(L); i++) {
        const f = Math.min(1, L - i);
        const x0 = pts[i * 2] - camX, y0 = pts[i * 2 + 1];
        const x1 = lerp(x0, pts[i * 2 + 2] - camX, f), y1 = lerp(y0, pts[i * 2 + 3], f);
        Px.line(x0, y0 + 1, x1, y1 + 1, 1, lip);
        Px.line(x0, y0, x1, y1, i < thick ? 2 : 1, dark);
      }
    };
    for (const cr of S.cracks) {
      const n = cr.pts.length / 2 - 1;
      seg(cr.pts, k * n, 3);
      if (k * n > cr.at) seg(cr.bp, (k * n - cr.at) * 1.2, 0);
    }
  }

  // ---------- foreground (parallax 1.3) ----------
  function fgUpdate() {
    const speed = S.stormK > 0.3 ? 3 : 1;
    for (const w of S.weeds) {
      w.fx -= speed;
      w.ph += speed / w.r;
    }
  }
  // Saguaro silhouette, 8 px wide at most: 3 px trunk, a 2 px arm on one side and a 1 px arm on the other.
  function drawCactus(ctx, x, h, arm, arm2) {
    const c = C.cactus, y = H;
    Px.rect(x - 1, y - h, 3, h, c);
    Px.dot(x, y - h - 1, c);
    const ay = y - Math.round(h * 0.55);
    if (arm > 0) { Px.rect(x + 2, ay, 1, 2, c); Px.rect(x + 3, ay - 9, 2, 11, c); Px.dot(x + 3, ay - 10, c); }
    else { Px.rect(x - 2, ay, 1, 2, c); Px.rect(x - 4, ay - 9, 2, 11, c); Px.dot(x - 3, ay - 10, c); }
    if (arm2) {
      const by = y - Math.round(h * 0.38);
      if (arm > 0) { Px.rect(x - 2, by, 1, 1, c); Px.rect(x - 3, by - 6, 1, 7, c); }
      else { Px.rect(x + 2, by, 1, 1, c); Px.rect(x + 3, by - 6, 1, 7, c); }
    }
  }
  function drawRebar(ctx, x, h, seed) {
    const c = C.cactus;
    Px.poly([x - 4, H, x + 3, H, x + 2, H - 8, x - 3, H - 10], c);
    Px.line(x - 1, H - 9, x - 3 + (hash(seed) - 0.5) * 4, H - h, 1, c);
    Px.line(x + 1, H - 8, x + 3, H - h * 0.7, 1, c);
    Px.line(x + 3, H - h * 0.7, x + 2, H - h * 0.7 - 4, 1, c);
  }
  function drawWeed(ctx, sx, y, r, ph) {
    const c = C.weed, d = shade(C.weed, -0.28);
    for (let ring = 0; ring < 2; ring++) {
      const rr0 = r - ring * 1.6, n = 9;
      let px = null, py = null;
      for (let i = 0; i <= n; i++) {
        const a = ph * (ring ? -1 : 1) + i * TAU / n + (i % 2) * 0.4;
        const rad = rr0 * (i % 2 ? 0.75 : 1);
        const x = sx + Math.cos(a) * rad, yy = y + Math.sin(a) * rad;
        if (px != null) Px.line(px, py, x, yy, 1, ring ? d : c);
        px = x; py = yy;
      }
    }
    Px.line(sx - Math.cos(ph) * r, y - Math.sin(ph) * r, sx + Math.cos(ph) * r, y + Math.sin(ph) * r, 1, d);
  }

  // ---------- the stage ----------
  const STAGE = {
    s2Stage: true,
    title: 'GLASS FLATS', sub: "THE KING'S ROAD - HIGH NOON",
    len: LEN, yMin: 134, yMax: 200, music: 'stage2', camStart: 0,
    props: [
      { kind: 'crate', x: 420, y: 176, drop: 'cactus' },
      { kind: 'trunk', x: 880, y: 141, drop: 'machete' },
      { kind: 'fuel', x: 1230, y: 150 },
      { kind: 'fuel', x: 1260, y: 160 },
      { kind: 'fridge', x: 1640, y: 172, drop: 'water' },
      { kind: 'drum', x: 1720, y: 150, drop: 'dogtag' },
      { kind: 'crate', x: 2050, y: 182, drop: 'molotov' },
    ],
    items: [],
    waves: [
      { // W1: the burrow tell is taught
        at: 288,
        spawns: [
          { type: 'sandstinger', side: 'mound', x: 268, y: 178, delay: 40, cap: 2, opts: { moundT: 90 } },
          { type: 'sandstinger', side: 'mound', x: 300, y: 148, delay: 170, cap: 2, opts: { moundT: 90 } },
        ],
        onStart() { S.hintT = 180; },
      },
      { // W2
        at: 720,
        spawns: [
          { type: 'punk', side: 'R', y: 160, delay: 10, cap: 3 },
          { type: 'punk', side: 'L', y: 186, delay: 50, cap: 3 },
          { type: 'knifer', side: 'R', y: 176, delay: 100, cap: 3 },
          { type: 'sandstinger', side: 'mound', x: 210, y: 182, delay: 160, cap: 3 },
        ],
      },
      { // RAIDER CONVOY
        at: 1152,
        spawns: [
          { type: 'raider', side: 'R', y: 156, delay: 20, cap: 2, opts: { uturn: false } },
          { type: 'raider', side: 'L', y: 186, delay: 90, cap: 2, opts: { uturn: true } },
          { type: 'spiker', side: 'R', y: 170, delay: 150, whenBelow: 0, cap: 2 },
          { type: 'spiker', side: 'L', y: 184, delay: 180, cap: 2 },
        ],
      },
      { // W3
        at: 1536,
        spawns: [
          { type: 'ashtail', side: 'R', y: 150, delay: 10, cap: 3 },
          { type: 'bruiser', side: 'L', y: 176, delay: 40, cap: 3 },
          { type: 'ashtail', side: 'R', y: 190, delay: 120, cap: 3 },
          { type: 'torcher', side: 'R', y: 160, delay: 200, cap: 3 },
        ],
      },
      { // W4 SANDSTORM: eyes in the haze
        at: 1968,
        spawns: [
          { type: 'sandstinger', side: 'mound', x: 334, y: 158, delay: 250, cap: 4, opts: { moundT: 90 } },
          { type: 'sandstinger', side: 'mound', x: 306, y: 192, delay: 290, cap: 4, opts: { moundT: 90 } },
          { type: 'ghoul', side: 'R', y: 150, delay: 340, cap: 4 },
          { type: 'ghoul', side: 'R', y: 182, delay: 372, cap: 4 },
          { type: 'sandstinger', side: 'mound', x: 70, y: 174, delay: 460, cap: 4, opts: { moundT: 90 } },
        ],
        onStart(g) { stormStart(g); },
        until() { return S.storm >= 2; },
        onClear(g) { stormEnd(g); },
      },
      { // ROAD COLLAPSE: the highway gives way, Juno drops into the brood crater
        at: CRATER_X,
        spawns: [
          { type: 'scorpling', side: 'top', x: 300, y: 142, delay: 24, cap: 6 },
          { type: 'scorpling', side: 'in', x: 42, y: 147, delay: 40, cap: 6, onSpawn: hatch },
          { type: 'scorpling', side: 'top', x: 120, y: 140, delay: 58, cap: 6 },
          { type: 'scorpling', side: 'in', x: 252, y: 143, delay: 76, cap: 6, onSpawn: hatch },
          { type: 'scorpling', side: 'R', y: 186, delay: 96, cap: 6 },
          { type: 'scorpling', side: 'in', x: 42, y: 147, delay: 120, cap: 6, onSpawn: hatch },
        ],
        onStart() { collapseStart(); },
        update(g) { if (S.col < 5) g.waveT = 0; },
        until() { return S.col >= 5; },
      },
      { // BOSS: THE MATRIARCH (her module plays the eruption entrance)
        at: 2688, boss: true, music: 'boss',
        spawns: [{ type: 'matriarch', side: 'in', x: 260, y: 160 }],
        onStart() { S.bossT = 0; S.cardSeen = false; S.broodT = 0; },
        update(g) {
          S.bossT++;
          if (g.bossCardInfo) S.cardSeen = true;
          if (S.bossT === 150 && !S.cardSeen && g.bossRef && !g.bossRef.dying) g.bossCard('THE MATRIARCH', 'QUEEN OF THE FLATS');
          const b = g.bossRef;
          if (b && (b.dying || b.hp <= 0) && ++S.broodT === 45) {
            // the brood dies with her
            for (const e of g.livingFoes()) if (e.type === 'scorpling') { e.hp = 0; e.onDeath(g.player, {}, e.x < b.x ? -1 : 1); }
          }
        },
      },
    ],

    setup(g) {
      stopWind();
      S = freshState();
      STAGE._s2 = S;                       // test hooks
      STAGE._s2wind = () => !!wind;
      const trunk = g.ents.find(e => e.team === 'prop' && e.kind === 'trunk');
      g.add(new Wreck(845, 141, 'sedan', trunk));
      g.add(new Wreck(1640, 141, 'flipped'));
      g.solids.push({ x0: 792, x1: 868, y0: 134, y1: 146, h: 28, splat: true });
      g.solids.push({ x0: 1596, x1: 1684, y0: 134, y1: 147, h: 26, splat: true });
      // the W4 crate holds two Molotovs
      const crate = g.ents.find(e => e.team === 'prop' && e.kind === 'crate' && e.x === 2050);
      if (crate) {
        crate.smash = function (src) {
          if (this.remove) return;
          Breakable.prototype.smash.call(this, src);
          const it = Game.add(new Item('molotov', this.x + 9, this.y + 1, 2.2));
          it.vx = 0.6;
        };
      }
    },

    update(g) {
      if (!S) S = freshState();
      S.t++;
      if (S.hintT > 0) S.hintT--;
      if (S.sandBurst > 0) S.sandBurst--;
      stormUpdate(g);
      collapseUpdate(g);
      fgUpdate();
      // jumping straight past the collapse (tests, wave skips): be in the crater already
      if (!S.crater && S.col === 0 && g.waveIdx > WAVE_COLLAPSE) { enterCrater(g, false); S.col = 5; }
      if (S.storm && g.waveIdx > WAVE_W4) stormEnd(g);
    },

    drawBg(ctx, camX, frame) {
      ensureCaches();
      if (!S) S = freshState();
      ctx.drawImage(cache.sky, 0, 0);
      const farA = 1 - 0.85 * S.stormK;
      ctx.globalAlpha = farA;
      // L1 mesas: each 2 px row shimmers sideways
      const o1 = clamp(Math.round(camX * 0.08), 0, MESA_W - W - 4) + 1;
      for (let r = 0; r < 32; r++) {
        const sh = Math.round(Math.sin(frame * 0.08 + r * 0.7));
        ctx.drawImage(cache.mesa, o1 - 1, r * 2, W + 2, 2, sh - 1, 60 + r * 2, W + 2, 2);
      }
      // L2 ruins
      const o2 = clamp(Math.round(camX * 0.3), 0, L2_W - W);
      ctx.drawImage(cache.l2, o2, 0, W, L2_H, 0, L2_Y, W, L2_H);
      ctx.globalAlpha = 1;
      Px.use(ctx);
      if (S.crater) drawCraterLive(ctx, camX, frame);
      else {
        ctx.drawImage(cache.hw, clamp(camX, 0, LEN - W), 0, W, H - HW_Y, 0, HW_Y, W, H - HW_Y);
        for (const gl of glints) {
          const sx = gl.x - camX;
          if (sx < -3 || sx > W + 3 || (frame + gl.ph) % 90 !== 0) continue;
          Px.rect(sx - 2, gl.y, 5, 1, C.glint);
          Px.rect(sx, gl.y - 2, 1, 5, C.glint);
        }
      }
    },

    drawMarkers(ctx, camX) {
      if (S && (S.col === 2 || S.col === 3)) drawCracks(ctx, camX);
    },

    drawFg(ctx, camX, frame, g) {
      if (!S) return;
      Px.use(ctx);
      const fo = camX * 1.3;
      for (const c of S.cacti) {
        const sx = Math.round(c.fx - fo);
        if (sx < -10 || sx > W + 10) continue;
        if (S.crater) drawRebar(ctx, sx, c.h * 0.8, c.fx); else drawCactus(ctx, sx, c.h, c.arm, c.arm2);
      }
      if (!S.crater) {
        for (const w of S.weeds) {
          let sx = w.fx - fo;
          if (sx < -12) { w.fx = fo + W + 12 + S.R() * 420; w.y = 202 + S.R() * 10; sx = w.fx - fo; }
          if (sx > W + 12) continue;
          const bob = Math.abs(Math.sin(w.ph * 0.5)) * (S.stormK > 0.3 ? 6 : 3);
          drawWeed(ctx, Math.round(sx), Math.round(w.y - w.r - bob), w.r, w.ph);
        }
      }
      if (S.stormK > 0) drawStorm(ctx, camX, g);
      if (S.fadeA > 0 || S.hintT > 0) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (S.fadeA > 0) { ctx.globalAlpha = S.fadeA; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
        if (S.hintT > 0) drawHint(ctx);
        ctx.restore();
        Px.use(ctx);
      }
    },
  };

  function hatch(e, g) {
    FX.shards(e.x, e.y, 4, 6, [C.egg, C.yolk]);
    FX.splat(e.x, e.y, 3, C.yolk, 4, 1, false);
    FX.dust(e.x, e.y, 4, 0.8, '#C8A070');
    Sound.sfx('s2Hatch', e.x);
  }

  function drawCraterLive(ctx, camX, frame) {
    ctx.drawImage(cache.crater, clamp(camX - CRATER_X, 0, CR_W - W), 0, W, H - CR_Y, 0, CR_Y, W, H - CR_Y);
    Px.use(ctx);
    // sand pouring over the rim
    const streams = [2436, 2522, 2611, 2690, 2783, 2871, 2958, 3046];
    const heavy = S.sandBurst > 0 ? S.sandBurst / 180 : 0;
    for (let i = 0; i < streams.length; i++) {
      const sx = streams[i] - camX;
      if (sx < -4 || sx > W + 4) continue;
      const top = 90 + Math.round(5 * Math.sin(streams[i] * 0.045));
      const w = 1 + (heavy > 0.3 || i % 3 === 0 ? 1 : 0);
      for (let y = top; y < 134; y += 2) {
        if (((y + frame * 2 + i * 5) % 7) < 4) Px.rect(sx + Math.round(Math.sin(y * 0.3 + i) * 0.6), y, w, 2, i % 2 ? C.sand : shade(C.sand, 0.12));
      }
      ctx.globalAlpha = 0.6;
      Px.oval(sx, 135, 4 + w, 1.5, shade(C.sand, -0.05));
      ctx.globalAlpha = 1;
    }
    // egg clusters, pulsing
    const pulse = 0.5 + 0.5 * Math.sin(frame * TAU / 40);
    for (const [ex, ey, n] of [[2442, 147, 5], [2652, 143, 4], [2772, 146, 6], [2934, 141, 5], [3024, 148, 4]]) {
      const sx = ex - camX;
      if (sx < -20 || sx > W + 20) continue;
      Px.oval(sx, ey + 1, n * 3 + 5, 3, shade(C.crater, -0.22));
      for (let i = 0; i < n; i++) {
        const dx = (i - (n - 1) / 2) * 6 + (i % 2 ? 1 : -1), dy = (i % 2) * -3;
        const big = i === (frame >> 5) % n ? pulse : 0, ry = 4.5 + big * 0.8, rx = 3.5 + big * 0.4;
        const ex2 = sx + dx, ey2 = ey - 4 + dy;
        Px.oval(ex2 + 0.5, ey2 + 0.5, rx + 0.5, ry + 0.5, shade(C.egg, -0.35));
        Px.oval(ex2, ey2, rx, ry, C.egg);
        Px.oval(ex2 + 1, ey2 + 2, rx - 1.5, ry - 2, C.yolk);
        Px.dot(ex2 - 1, ey2 - 3, '#FAF4E2');
        Px.dot(ex2 - 2, ey2 - 1, '#FAF4E2');
      }
    }
  }

  function drawStorm(ctx, camX, g) {
    const k = S.stormK;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    Px.use(ctx);
    // haze banks
    ctx.globalAlpha = 0.16 * k;
    for (const b of S.blobs) Px.oval(b.x, b.y, b.rx, b.ry, C.streak);
    // tint
    ctx.globalAlpha = 0.35 * k;
    ctx.fillStyle = C.tint;
    ctx.fillRect(0, 0, W, H);
    // streaks
    ctx.globalAlpha = 0.5;
    const n = Math.round(60 * k);
    for (let i = 0; i < n; i++) { const s = S.streaks[i]; Px.rect(s.x, s.y, s.len, 1, C.streak); }
    ctx.globalAlpha = 0.4;                 // bright leading grains so the streaks read against the haze
    for (let i = 0; i < n; i++) { const s = S.streaks[i]; Px.rect(s.x, s.y, Math.ceil(s.len * 0.4), 1, '#FFF2D6'); }
    ctx.globalAlpha = 1;
    ctx.restore();
    Px.use(ctx);
    // eyes stay in full colour through the haze
    const p = g.player, dist = g.silhouetteDist;
    if (!p || !dist) return;
    for (const e of g.ents) {
      if (e.team !== 'enemy' || e.remove || !e.def.eyes || Math.abs(e.x - p.x) <= dist) continue;
      if (e.dying && e.state === 'down' && e.t > 40 && (e.t >> 2) % 2) continue;
      let eyes;
      try { eyes = e.def.eyes.call(e) || []; } catch (err) { continue; }
      for (const [ex, ey, c] of eyes) {
        const x = e.x - camX + e.facing * ex - (e.facing < 0 ? 1 : 0), y = e.y - e.z + ey;
        ctx.globalAlpha = 0.3;
        Px.rect(x - 1, y - 1, 3, 3, c);
        ctx.globalAlpha = 1;
        Px.rect(x, y, 1, 1, c);
      }
    }
  }

  function drawHint(ctx) {
    const t = 180 - S.hintT, k = easeOut(Math.min(1, t / 12)), out = S.hintT < 12 ? S.hintT / 12 : 1;
    const dev = Input.lastDevice;
    const how = dev === 'touch' ? 'JUMP STRAIGHT UP, THEN HIT' : dev === 'gamepad' ? 'JUMP STRAIGHT UP (A), THEN X' : 'JUMP STRAIGHT UP (K), THEN J';
    ctx.globalAlpha = 0.55 * out;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 31, W, 22);
    ctx.globalAlpha = out;
    const x = lerp(-140, W / 2, k);
    const blink = S.hintT < 60 && (S.hintT >> 3) % 2;
    drawText(ctx, 'HAMMER DROP THE MOUND!', x, 34, blink ? '#ffffff' : '#ffe066', 1, 'center');
    drawText(ctx, how, x, 44, '#e9d9bf', 1, 'center');
    ctx.globalAlpha = 1;
  }

  // STAGES is declared in 80_game.js, which loads after this file: if it is not initialised yet,
  // register once the whole script has run (a microtask, before any frame or input).
  const install = () => { STAGES[1] = STAGE; };
  try { install(); } catch (e) { Promise.resolve().then(install); }
})();
