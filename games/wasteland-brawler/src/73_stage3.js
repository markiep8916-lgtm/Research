// Stage 3: THE THIRSTY DAM (night refinery, world 0..3456).
// Parallax backdrop (night sky and moon, the curved dam with the King Valve banner, refinery towers,
// flare stacks, catwalks and searchlights), the pipe-wall back wall with glowing vats, the grating
// floor, the DAM STAIRS (concrete wall, floor searchlights) and the FINAL ARENA on the dam crown
// (reservoir band, railing, floodgate wheel). Stage hazards: toxic puddles and steam vents.
// Everything is private to this IIFE; it only assigns STAGES[2] (STAGES[2].wheel is shared with the
// King Valve module) and adds s3* entries to SFX.
(function () {
  const LEN = 3456, ARENA = 3072, STAIRS = 2600, M = 8;          // M: blit margin for screen shake
  const WHEEL_X = 3264, WHEEL_Y = 118;
  const MOON_X = 322, MOON_Y = 33;
  const VATS = [600, 1856, 1968, 2080, 2500];                     // world x where Ghouls climb out
  const DOORS = [1000, 1500, 2350];                               // back-wall doorways ('door' spawns)
  const LAMPS = [2790, 2990];                                     // dam-stair searchlights (wall top)
  const PUDDLES = [[500, 170], [1900, 146], [2056, 186]];
  // steam vents: [x, y, phase]. The corridor phases make the bursts travel left to right, 45 f apart.
  const VENTS = [[1040, 152, 0], [1120, 182, -45], [1200, 160, -90], [1280, 176, -135], [2000, 168, -20]];
  const C = {
    sky0: '#070b14', sky1: '#141a2c', sky2: '#2a2438', glow: '#1e3a2a',
    moon: '#d8e8c8', star: '#c8c8d8',
    dam: '#3a4050', tower: '#22262e',
    pipe0: '#3a424e', pipe1: '#4a525e', pipeHi: '#6a7480',
    tox: '#3bff8a', tox2: '#4cff7a', flare: '#ff7a2a',
    hz0: '#d4a82a', hz1: '#1a1a1a',
    grate: '#2c3038', grid: '#3a404a',
    banner: '#5a1e1e', gold: '#d4af37',
    conc: '#6a6a6a', rail: '#3a3a3a', res0: '#1e5aa8', res1: '#2e7fd8', res2: '#8ec8ff',
    stairs: '#5a5e66', fg: '#0a0c10', beam: '#fff2c0', spill: '#ffd27a',
    wall: '#262a32', wheel: '#5a626c',
  };

  // ---------- helpers ----------
  // Integer hash -> [0,1). Decoration never touches the game's seeded RNG.
  function hs(n) {
    let h = Math.imul((n | 0) ^ 0x2c1b3c6d, 0x297a2d39);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function mixHex(a, b, k) {
    const A = hexToRgb(a), B = hexToRgb(b), t = clamp(k, 0, 1);
    return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
  }
  function mk(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    return { c, g };
  }
  // Copy the strip slice starting at strip x `sx` to screen x 0 (plus a margin each side for shake).
  function blit(ctx, cache, sx, dy) {
    sx = Math.round(sx);
    let s0 = sx - M, d0 = -M, w = W + 2 * M;
    if (s0 < 0) { d0 -= s0; w += s0; s0 = 0; }
    if (s0 + w > cache.c.width) w = cache.c.width - s0;
    if (w > 0) ctx.drawImage(cache.c, s0, 0, w, cache.c.height, d0, dy, w, cache.c.height);
  }
  // Ring by scanlines (crisp): outer radius R, inner radius r, three tones top/mid/bottom.
  function ring(cx, cy, R, r, hi, mid, lo) {
    for (let y = -R; y <= R; y++) {
      const wo = Math.sqrt(Math.max(0, R * R - y * y));
      if (wo < 0.4) continue;
      const col = y < -R * 0.45 ? hi : y > R * 0.4 ? lo : mid;
      if (Math.abs(y) < r) {
        const wi = Math.sqrt(r * r - y * y);
        Px.rect(cx - wo, cy + y, Math.max(1, wo - wi), 1, col);
        Px.rect(cx + wi, cy + y, Math.max(1, wo - wi), 1, col);
      } else Px.rect(cx - wo, cy + y, Math.max(1, wo * 2), 1, col);
    }
  }
  // Diagonal hazard stripes in a rectangle.
  function stripes(x, y, w, h, s = 3) {
    Px.rect(x, y, w, h, C.hz1);
    for (let j = 0; j < h; j++) {
      for (let i = -h - 2 * s; i < w; i += 2 * s) {
        const a = Math.max(0, i + j), b = Math.min(w, i + j + s);
        if (b > a) Px.rect(x + a, y + j, b - a, 1, C.hz0);
      }
    }
  }
  // The King Valve emblem: a crowned valve wheel.
  function emblem(cx, cy, r, col, back) {
    Px.disc(cx, cy, r, col);
    Px.disc(cx, cy, r - 1.6, back);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      Px.line(cx, cy, cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1), 1, col);
    }
    Px.disc(cx, cy, Math.max(1, r * 0.28), col);
    for (const dx of [-r * 0.6, 0, r * 0.6]) Px.poly([cx + dx - 1.5, cy - r, cx + dx, cy - r - 3, cx + dx + 1.5, cy - r], col);
  }

  // ---------- static layer caches (built on first draw) ----------
  let K = null;
  function caches() {
    if (!K) K = { sky: buildSky(), far: buildFar(), mid: buildMid(), wall: buildWall(), floor: buildFloor() };
    return K;
  }

  // L0 sky (parallax 0): dithered gradient, toxic horizon glow, the moon cut by thin cloud bands.
  function buildSky() {
    const w = W + 2 * M, h = 134 + M, { c, g } = mk(w, h);
    const stops = [[-M, C.sky0], [24, C.sky1], [46, C.sky2], [64, C.glow], [134, C.glow]];
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const img = g.createImageData(w, h);
    for (let row = 0; row < h; row++) {
      const y = row - M;
      let i = 0;
      while (i < stops.length - 2 && y >= stops[i + 1][0]) i++;
      const t = clamp((y - stops[i][0]) / (stops[i + 1][0] - stops[i][0]), 0, 1);
      const A = hexToRgb(stops[i][1]), B = hexToRgb(stops[i + 1][1]);
      const q = t * 4, lo = Math.floor(q), fr = q - lo;
      const ca = A.map((v, j) => Math.round(lerp(v, B[j], Math.min(1, lo / 4))));
      const cb = A.map((v, j) => Math.round(lerp(v, B[j], Math.min(1, (lo + 1) / 4))));
      for (let x = 0; x < w; x++) {
        const col = fr > (BAYER[(row & 3) * 4 + (x & 3)] + 0.5) / 16 ? cb : ca;
        const o = (row * w + x) * 4;
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    g.setTransform(1, 0, 0, 1, M, M);
    Px.use(g);
    // moon: halo, disc, a brighter core toward the upper right, grey-green maria
    g.globalAlpha = 0.05; Px.disc(MOON_X, MOON_Y, 24, C.moon);
    g.globalAlpha = 0.08; Px.disc(MOON_X, MOON_Y, 17, C.moon);
    g.globalAlpha = 1;
    Px.disc(MOON_X, MOON_Y, 12, '#b8c8a8');
    Px.disc(MOON_X + 1, MOON_Y - 1, 11, C.moon);
    Px.disc(MOON_X + 3, MOON_Y - 3, 6, '#e6f0da');
    Px.oval(MOON_X - 4, MOON_Y - 3, 3, 2, '#bccca8');
    Px.oval(MOON_X + 4, MOON_Y + 4, 3, 2, '#c2d2b0');
    Px.disc(MOON_X - 2, MOON_Y + 5, 1.5, '#bccca8');
    Px.dot(MOON_X + 6, MOON_Y - 6, '#ffffff');
    // thin cloud bands in sky colours cross the moon
    Px.rect(MOON_X - 26, MOON_Y + 3, 44, 1, C.sky1);
    Px.rect(MOON_X - 18, MOON_Y + 7, 50, 2, '#1c1f30');
    Px.rect(MOON_X - 34, MOON_Y + 8, 20, 1, '#1c1f30');
    Px.rect(MOON_X + 8, MOON_Y - 6, 26, 1, C.sky1);
    Px.rect(60, 36, 70, 1, '#1a1d2e'); Px.rect(84, 38, 52, 2, '#1a1d2e');
    Px.rect(180, 28, 40, 1, '#161a2b');
    return { c };
  }

  const STARS = [];
  for (let n = 0; STARS.length < 30 && n < 400; n++) {
    const x = Math.floor(hs(n * 3 + 1) * W), y = 23 + Math.floor(hs(n * 3 + 2) * 34);
    if (Math.hypot(x - MOON_X, y - MOON_Y) < 20) continue;
    STARS.push({ x, y, ph: hs(n * 3 + 3) * TAU, sp: 0.02 + hs(n * 7 + 5) * 0.07, big: hs(n * 11 + 9) < 0.18 });
  }
  function drawStars(frame) {
    for (const s of STARS) {
      const v = Math.sin(frame * s.sp + s.ph);
      if (v < -0.55) continue;
      Px.dot(s.x, s.y, v > 0.35 ? C.star : '#5e6074');
      if (s.big && v > 0.85) {
        Px.dot(s.x - 1, s.y, '#5e6074'); Px.dot(s.x + 1, s.y, '#5e6074');
        Px.dot(s.x, s.y - 1, '#5e6074'); Px.dot(s.x, s.y + 1, '#5e6074');
      }
    }
  }

  // L1 far (parallax 0.1): canyon hills, the curved dam wall, spillways and the King Valve banner.
  const DAM_MID = 360, DAM_HALF = 200;
  const crest = x => 45 + 9 * ((x - DAM_MID) / DAM_HALF) ** 2;
  function buildFar() {
    const lw = Math.ceil((LEN - W) * 0.1) + W, w = lw + 2 * M, { c, g } = mk(w, 100);
    g.setTransform(1, 0, 0, 1, M, 0);
    Px.use(g);
    const lamps = [], spills = [];
    for (let x = -M; x < lw + M; x++) {
      const y = Math.round(61 + Math.sin(x * 0.019) * 3 + Math.sin(x * 0.051 + 2) * 2 + hs(x >> 2) * 1.5);
      Px.rect(x, y, 1, 100 - y, '#141923');
      Px.dot(x, y, '#1e2431');
    }
    // canyon walls holding the dam
    for (const s of [-1, 1]) {
      const ex = DAM_MID + s * DAM_HALF;
      Px.poly([ex - s * 6, 100, ex - s * 6, crest(ex) - 4, ex + s * 10, crest(ex) - 8, ex + s * 34, 44, ex + s * 70, 54, ex + s * 110, 62, ex + s * 110, 100], '#181d28');
      Px.poly([ex + s * 10, crest(ex) - 8, ex + s * 34, 44, ex + s * 36, 46, ex + s * 12, crest(ex) - 6], '#232a37');
    }
    // dam face
    for (let x = DAM_MID - DAM_HALF; x <= DAM_MID + DAM_HALF; x++) {
      const u = Math.abs(x - DAM_MID) / DAM_HALF, top = Math.round(crest(x));
      const col = u < 0.22 ? '#454c5e' : u < 0.6 ? C.dam : u < 0.86 ? '#333847' : '#2b303c';
      Px.rect(x, top, 1, 100 - top, col);
      Px.dot(x, top - 1, '#2a2f3a');
      Px.dot(x, top, '#6a7284');
      Px.dot(x, top + 1, '#525a6c');
      Px.dot(x, top + 2, '#4a5264');
      if (x % 8 === 0) Px.dot(x, top - 1, '#8a6a3a');
      for (let k = 1; k < 9; k++) { const ly = top + 2 + k * 6; if (ly < 100) Px.dot(x, ly, shade(col, -0.16)); }
      if ((x - DAM_MID + 1100) % 24 === 0) Px.rect(x, top + 2, 1, 100 - top, shade(col, -0.1));
    }
    // spillway chutes and gate houses
    for (const sx of [262, 458]) {
      const top = Math.round(crest(sx));
      Px.rect(sx - 4, top + 2, 9, 100 - top, '#4a5264');
      Px.rect(sx - 4, top + 2, 1, 100 - top, '#2a2f3a');
      Px.rect(sx + 4, top + 2, 1, 100 - top, '#2a2f3a');
      for (let y = top + 6; y < 100; y += 5) Px.rect(sx - 3, y, 7, 1, '#3e4556');
      Px.rect(sx - 6, top - 4, 13, 4, '#262b36');
      Px.rect(sx - 6, top - 4, 13, 1, '#3a4050');
      spills.push({ x: sx - 3, y: top - 2 }, { x: sx + 3, y: top - 2 });
    }
    for (let x = Math.ceil((DAM_MID - DAM_HALF + 4) / 8) * 8; x < DAM_MID + DAM_HALF - 3; x += 8) lamps.push({ x, y: Math.round(crest(x)) - 1, ph: hs(x) * 90 | 0 });
    // the giant King Valve banner, hung from the crest
    const bx = DAM_MID - 19, by = Math.round(crest(DAM_MID)) + 3;
    Px.rect(bx + 3, by - 3, 1, 3, '#1a1a1a'); Px.rect(bx + 34, by - 3, 1, 3, '#1a1a1a');
    Px.rect(bx, by, 38, 17, C.banner);
    for (let i = 4; i < 38; i += 6) Px.rect(bx + i, by + 1, 1, 16, '#481616');
    for (let i = 1; i < 38; i += 6) Px.rect(bx + i, by + 1, 1, 16, '#6a2626');
    Px.rect(bx, by, 38, 1, '#7a3030');
    for (let i = 0; i < 38; i += 4) Px.poly([bx + i, by + 17, bx + i + 4, by + 17, bx + i + 2, by + 18 + Math.round(hs(i + 7) * 3)], C.banner);
    emblem(DAM_MID, by + 9, 5.5, C.gold, C.banner);
    return { c, lamps, spills };
  }

  // L2 mid (parallax 0.35): refinery towers, spherical tanks, flare stacks, catwalks, pipe racks and
  // searchlight masts. Dynamic bits (flames, drips, beacons, beams) are listed in the returned meta.
  function buildMid() {
    const lw = Math.ceil((LEN - W) * 0.35) + W, w = lw + 2 * M, { c, g } = mk(w, 100);
    g.setTransform(1, 0, 0, 1, M, 0);
    Px.use(g);
    const meta = { flares: [], drips: [], reds: [], masts: [], windows: [] };
    const T = C.tower, rim = '#2f3541', rim2 = '#3b4250', dark = '#1a1d23', mid = '#2a2f38';
    // pipe racks along the bottom
    Px.rect(-M, 63, lw + 2 * M, 2, '#1e2229'); Px.rect(-M, 63, lw + 2 * M, 1, '#2b313b');
    Px.rect(-M, 67, lw + 2 * M, 3, '#1c2027'); Px.rect(-M, 67, lw + 2 * M, 1, '#2b313b');
    for (let x = 6; x < lw; x += 38) Px.rect(x, 60, 2, 40, '#181b21');
    const towers = [];
    let x = 2, i = 0;
    while (x < lw + M) {
      const r = hs(i * 17 + 3), q = hs(i * 17 + 4), q2 = hs(i * 17 + 5);
      if (r < 0.46) {
        const tw = 10 + Math.floor(q * 8), top = 30 + Math.floor(q2 * 22);
        Px.rect(x, top, tw, 100 - top, T);
        Px.rect(x + tw - 2, top, 1, 100 - top, rim);
        Px.rect(x + tw - 1, top, 1, 100 - top, rim2);
        Px.rect(x, top, 1, 100 - top, dark);
        for (let y = top + 6; y < 100; y += 8) Px.rect(x + 1, y, tw - 2, 1, '#1c1f26');
        Px.oval(x + tw / 2, top, tw / 2, 2, mid);
        Px.rect(x + tw / 2 - 1, top - 5, 2, 4, mid);
        const py = top + 8 + Math.floor(hs(i + 99) * 12);
        Px.rect(x - 2, py, tw + 4, 2, mid);
        Px.rect(x - 2, py - 4, tw + 4, 1, mid);
        for (let k = x - 2; k <= x + tw + 2; k += 3) Px.rect(k, py - 4, 1, 4, mid);
        Px.rect(x + 2, top + 2, 1, 98 - top, mid);
        for (let y = top + 4; y < 100; y += 3) Px.dot(x + 3, y, mid);
        meta.reds.push({ x: x + Math.floor(tw / 2), y: top - 6, ph: (hs(i + 5) * 60) | 0 });
        if (q2 > 0.4) meta.windows.push({ x: x + tw - 5, y: py + 6 + Math.floor(hs(i + 3) * 10), ph: hs(i + 8) });
        towers.push({ x, w: tw, top });
        x += tw + 14 + Math.floor(hs(i * 5 + 1) * 46);
      } else if (r < 0.66) {
        const rr0 = 9 + Math.floor(q * 5), cx = x + rr0, cy = 72 - rr0 * 0.4;
        for (const lx of [cx - rr0 + 2, cx - 2, cx + rr0 - 4]) Px.rect(lx, cy, 2, 100 - cy, dark);
        Px.disc(cx, cy, rr0, T);
        Px.disc(cx + rr0 * 0.3, cy - rr0 * 0.3, rr0 * 0.55, '#262b34');
        Px.disc(cx + rr0 * 0.42, cy - rr0 * 0.45, rr0 * 0.22, rim);
        Px.rect(cx - rr0, Math.round(cy), rr0 * 2, 1, '#1c1f26');
        Px.line(cx - rr0 + 3, cy - rr0 + 3, cx + 2, cy - rr0 - 1, 1, mid);
        x += rr0 * 2 + 14 + Math.floor(q2 * 34);
      } else if (r < 0.86) {
        const top = 22 + Math.floor(q * 12);
        Px.line(x + 1, top + 8, x - 16, 100, 1, '#181b21');
        Px.line(x + 1, top + 8, x + 18, 100, 1, '#181b21');
        Px.rect(x, top, 3, 100 - top, T);
        Px.rect(x + 2, top, 1, 100 - top, rim);
        Px.rect(x - 1, top, 5, 2, mid);
        Px.rect(x - 3, top + 16, 9, 1, mid);
        meta.flares.push({ x: x + 1, y: top, ph: (hs(i + 31) * 100) | 0 });
        x += 22 + Math.floor(q2 * 34);
      } else {
        // squat cracking unit with a stepped roof
        const tw = 22 + Math.floor(q * 14), top = 44 + Math.floor(q2 * 10);
        Px.rect(x, top, tw, 100 - top, '#1f232a');
        Px.rect(x + 3, top - 6, tw - 6, 6, '#1f232a');
        Px.rect(x + tw - 1, top, 1, 100 - top, rim);
        Px.rect(x + tw - 4, top - 6, 1, 6, rim);
        for (let k = x + 3; k < x + tw - 3; k += 5) if (hs(k * 3 + i) < 0.4) meta.windows.push({ x: k, y: top + 4, ph: hs(k) });
        x += tw + 14 + Math.floor(hs(i * 9) * 30);
      }
      i++;
    }
    // catwalks between neighbouring towers, with green leaks
    for (let k = 0; k + 1 < towers.length; k++) {
      const a = towers[k], b = towers[k + 1];
      const x0 = a.x + a.w, x1 = b.x;
      if (x1 - x0 > 70 || x1 - x0 < 6) continue;
      const cy = Math.max(a.top, b.top) + 8 + Math.floor(hs(k * 13 + 1) * 14);
      if (cy > 60) continue;
      Px.rect(x0, cy, x1 - x0, 2, mid);
      Px.rect(x0, cy - 4, x1 - x0, 1, mid);
      for (let px = x0; px < x1; px += 4) Px.rect(px, cy - 4, 1, 4, mid);
      Px.rect(x0, cy + 3, x1 - x0, 2, '#1e2128');
      const n = 1 + Math.floor(hs(k + 3) * 2);
      for (let d = 0; d < n; d++) meta.drips.push({ x: x0 + 3 + Math.floor(hs(k * 7 + d) * Math.max(1, x1 - x0 - 6)), y: cy + 5, ph: (hs(k * 11 + d) * 70) | 0 });
    }
    // searchlight lattice masts
    for (let mx = 130; mx < lw; mx += 210) {
      Px.line(mx - 4, 100, mx - 1, 30, 1, '#1b1e25');
      Px.line(mx + 4, 100, mx + 1, 30, 1, '#1b1e25');
      for (let y = 36; y < 100; y += 8) {
        const k0 = (y - 30) / 70, k1 = (y + 8 - 30) / 70;
        Px.line(mx - 1 - 3 * k0, y, mx + 1 + 3 * k1, y + 8, 1, '#1b1e25');
        Px.line(mx + 1 + 3 * k0, y, mx - 1 - 3 * k1, y + 8, 1, '#1b1e25');
      }
      Px.rect(mx - 4, 26, 8, 4, mid);
      Px.rect(mx - 4, 26, 8, 1, rim2);
      meta.masts.push({ x: mx, y: 27, ph: hs(mx) * TAU });
    }
    return Object.assign({ c }, meta);
  }

  // L3 back wall (parallax 1.0), screen y 70..134, world 0..LEN: refinery pipe wall, concrete dam
  // stairs, then (in the arena) only the crown railing so the reservoir shows through.
  function buildWall() {
    const w = LEN + 2 * M, { c, g } = mk(w, 64);
    g.setTransform(1, 0, 0, 1, M, -70);
    Px.use(g);
    wallRefinery(-M, STAIRS);
    wallConcrete(STAIRS, ARENA - 10);
    crownRailing(ARENA + 14, LEN + M);
    return { c };
  }
  function pipeH(x0, x1, y, t, fl, body = C.pipe1, hi = C.pipeHi, lo = C.pipe0) {
    Px.rect(x0, y, x1 - x0, t, body);
    Px.rect(x0, y, x1 - x0, 1, hi);
    if (t > 4) Px.rect(x0, y + 1, x1 - x0, 1, mixHex(body, hi, 0.5));
    Px.rect(x0, y + t - 1, x1 - x0, 1, lo);
    Px.rect(x0, y + t, x1 - x0, 1, '#15171c');
    for (let fx = Math.ceil(x0 / fl) * fl + (y % 23); fx < x1; fx += fl) {
      Px.rect(fx, y - 1, 3, t + 2, lo);
      Px.rect(fx, y - 1, 3, 1, hi);
      Px.dot(fx + 1, y + Math.floor(t / 2), '#2a2f38');
    }
  }
  function pipeV(x, y0, y1, t) {
    Px.rect(x, y0, t, y1 - y0, C.pipe0);
    Px.rect(x, y0, 1, y1 - y0, C.pipeHi);
    Px.rect(x + 1, y0, 1, y1 - y0, C.pipe1);
    Px.rect(x + t - 1, y0, 1, y1 - y0, '#2a2f38');
    Px.rect(x + t, y0 + 2, 1, y1 - y0 - 2, '#15171c');
  }
  function valveWheel(cx, cy, r, col) {
    ring(cx, cy, r, r - 1.5, shade(col, 0.25), col, shade(col, -0.35));
    Px.line(cx - r + 1, cy, cx + r - 1, cy, 1, shade(col, -0.3));
    Px.line(cx, cy - r + 1, cx, cy + r - 1, 1, shade(col, -0.3));
    Px.dot(cx, cy, '#d8d0c0');
  }
  function sign(x, y, text, plate, ink, edge) {
    const w = textWidth(text) + 6;
    Px.rect(x - 1, y - 1, w + 2, 11, edge || '#15171c');
    Px.rect(x, y, w, 9, plate);
    Px.dot(x + 1, y + 1, shade(plate, 0.3)); Px.dot(x + w - 2, y + 1, shade(plate, 0.3));
    drawText(Px.g, text, x + 3, y + 1, ink, 1, 'left', null);
    return w;
  }
  function wallRefinery(x0, x1) {
    Px.rect(x0, 70, x1 - x0, 64, C.wall);
    for (let px = Math.floor(x0 / 32) * 32; px < x1; px += 32) {
      const v = hs(px * 7 + 1);
      if (v < 0.3) Px.rect(px, 74, 32, 56, '#23272e');
      else if (v > 0.72) Px.rect(px, 74, 32, 56, '#2a2e37');
      Px.rect(px, 74, 1, 60, '#1c1f25');
      Px.rect(px + 1, 74, 1, 60, '#2e333c');
      for (let y = 78; y < 130; y += 8) Px.dot(px + 3, y, '#3a404a');
      if (hs(px + 99) < 0.55) {
        const sx = px + 5 + Math.floor(hs(px + 5) * 22);
        Px.rect(sx, 84, 1, 14 + Math.floor(hs(px + 6) * 34), '#1f2229');
        if (hs(px + 7) < 0.35) Px.rect(sx + 2, 92, 1, 10 + Math.floor(hs(px + 8) * 20), '#253a30');
      }
    }
    Px.rect(x0, 102, x1 - x0, 1, '#1c1f25');
    Px.rect(x0, 103, x1 - x0, 1, '#2e333c');
    Px.rect(x0, 70, x1 - x0, 3, '#30353f');
    Px.rect(x0, 70, x1 - x0, 1, '#454b57');
    Px.rect(x0, 73, x1 - x0, 1, '#16181d');
    Px.rect(x0, 128, x1 - x0, 6, '#1f2228');
    Px.rect(x0, 133, x1 - x0, 1, '#15171c');
    // I-beam columns
    for (let cx = 64; cx < x1; cx += 128) {
      if (cx < x0 - 8 || nearFeature(cx, 30)) continue;
      Px.rect(cx - 3, 70, 7, 64, '#1c1f25');
      Px.rect(cx - 4, 70, 9, 2, '#343a44');
      Px.rect(cx - 3, 72, 1, 62, '#343a44');
      Px.rect(cx + 3, 72, 1, 62, '#121418');
      for (let y = 80; y < 130; y += 12) { Px.dot(cx - 1, y, '#454b57'); Px.dot(cx + 1, y, '#454b57'); }
    }
    // horizontal pipes
    pipeH(x0, x1, 76, 6, 64);
    pipeH(x0, x1, 86, 4, 80, C.pipe0, C.pipe1, '#2c3038');
    pipeH(x0, x1, 120, 5, 96, C.pipe0, C.pipe1, '#2c3038');
    // vertical drops with valve wheels and gauges
    for (let k = 0; ; k++) {
      const vx = 40 + k * 150 + Math.floor(hs(k * 13 + 2) * 50);
      if (vx >= x1 - 10) break;
      if (vx < x0 || nearFeature(vx, 34)) continue;
      pipeV(vx, 82, 134, 4);
      Px.rect(vx - 1, 81, 6, 2, C.pipe0);
      Px.rect(vx - 1, 128, 6, 2, C.pipe0);
      if (hs(k + 50) < 0.55) valveWheel(vx + 2, 98 + Math.floor(hs(k + 51) * 8), 4, hs(k + 52) < 0.5 ? '#b8322a' : C.hz0);
      else {
        Px.disc(vx + 8, 108, 3.5, '#15171c'); Px.disc(vx + 8, 108, 2.5, '#c8c8b8');
        Px.line(vx + 8, 108, vx + 9, 106, 1, '#b8322a');
        Px.rect(vx + 4, 108, 2, 1, C.pipe0);
      }
    }
    // hazard panels, kick plates and signs
    for (let px = 96; px < x1; px += 32) {
      if (px < x0 || nearFeature(px + 16, 34)) continue;
      const v = hs(px * 3 + 11);
      if (v < 0.12) stripes(px + 4, 106, 24, 10);
      else if (v < 0.2) stripes(px, 129, 32, 4, 2);
    }
    sign(28, 92, 'KING VALVE WATERWORKS', C.banner, C.gold);
    sign(208, 108, 'NO WATER BEYOND THIS POINT', '#a8322a', '#f2eee0');
    sign(452, 106, 'TOXIC', '#1e3a2a', C.tox);
    sign(1068, 96, 'STEAM', C.hz0, '#1a1a1a');
    sign(1228, 96, 'STEAM', C.hz0, '#1a1a1a');
    sign(1640, 108, 'DANGER', C.hz0, '#1a1a1a');
    sign(2180, 92, 'THE KING PROVIDES', C.banner, C.gold);
    sign(2422, 108, 'TOXIC', '#1e3a2a', C.tox);
    for (const dx of DOORS) doorway(dx);
    for (const vx of VATS) vatBody(vx);
  }
  function nearFeature(x, d) {
    for (const v of VATS) if (Math.abs(x - v) < d) return true;
    for (const v of DOORS) if (Math.abs(x - v) < d - 6) return true;
    return false;
  }
  function doorway(x) {
    Px.rect(x - 15, 89, 30, 45, '#16181d');
    Px.rect(x - 14, 90, 28, 44, C.pipe0);
    Px.rect(x - 14, 90, 28, 1, C.pipeHi);
    stripes(x - 14, 93, 4, 41, 2);
    stripes(x + 10, 93, 4, 41, 2);
    Px.rect(x - 10, 94, 20, 40, '#0a0c10');
    Px.rect(x - 10, 94, 20, 3, '#050608');
    Px.rect(x - 7, 104, 1, 30, '#11141a');
    Px.rect(x + 4, 110, 4, 24, '#0e1015');
    Px.rect(x - 3, 84, 6, 4, '#2a2f38');
    Px.rect(x - 4, 84, 8, 1, '#454b57');
  }
  function vatBody(x) {
    pipeV(x + 12, 82, 101, 4);
    Px.rect(x + 11, 99, 6, 2, C.pipe0);
    Px.rect(x - 20, 106, 40, 28, C.pipe0);
    Px.rect(x - 19, 105, 38, 1, C.pipe0);
    Px.rect(x - 18, 106, 7, 28, C.pipe1);
    Px.rect(x - 17, 106, 1, 28, C.pipeHi);
    Px.rect(x + 12, 106, 7, 28, '#2c3038');
    Px.rect(x + 18, 106, 1, 28, '#20242b');
    for (const by of [113, 127]) {
      Px.rect(x - 20, by, 40, 2, '#2c3038');
      Px.rect(x - 20, by, 40, 1, '#555d6a');
      for (let rx = x - 17; rx < x + 18; rx += 5) Px.dot(rx, by + 1, C.pipeHi);
    }
    // rim (an ellipse seen slightly from above) and the dark mouth the liquid sits in
    Px.oval(x, 104, 22, 3.5, C.pipe1);
    Px.rect(x - 21, 104, 42, 1, C.pipeHi);
    Px.oval(x, 104, 19, 2.2, '#0f1a14');
    // sight glass frame and a warning plate
    Px.rect(x - 5, 116, 10, 10, '#15171c');
    Px.rect(x + 6, 117, 7, 7, C.hz0);
    Px.rect(x + 8, 119, 3, 2, '#1a1a1a');
    Px.dot(x + 8, 122, '#1a1a1a'); Px.dot(x + 10, 122, '#1a1a1a');
    Px.rect(x - 21, 132, 42, 2, '#15171c');
  }
  function stairsRun(x0, yb, n, run, rise) {
    const x1 = x0 + n * run, yt = yb - n * rise, th = 7;
    Px.poly([x0 + 4, yb + 2, x1 + 4, yt + th + 2, x1 + 4, yt + th + 6, x0 + 4, yb + 6], '#4a4e56');
    const pts = [x0, yb];
    for (let i = 0; i < n; i++) pts.push(x0 + i * run, yb - (i + 1) * rise, x0 + (i + 1) * run, yb - (i + 1) * rise);
    pts.push(x1, yt + th, x0, yb + th);
    Px.poly(pts, '#686c74');
    for (let i = 0; i < n; i++) {
      Px.rect(x0 + i * run, yb - (i + 1) * rise, run, 1, '#868a92');
      Px.rect(x0 + i * run, yb - (i + 1) * rise + 1, 1, rise - 1, '#5c6068');
    }
    Px.line(x0, yb + th, x1, yt + th, 1, '#42454c');
    Px.line(x0 + 1, yb - 14, x1 + 1, yt - 14, 1, '#2c2e33');
    for (let i = 0; i <= n; i += 2) Px.rect(x0 + i * run + 1, yb - i * rise - 14, 1, 14 - rise, '#2c2e33');
    return { x: x1, y: yt };
  }
  function landing(x0, y, len) {
    Px.rect(x0, y, len, 7, '#686c74');
    Px.rect(x0, y, len, 1, '#868a92');
    Px.rect(x0, y + 7, len, 1, '#42454c');
    Px.rect(x0 + 3, y + 8, len, 4, '#4a4e56');
    Px.rect(x0, y - 14, len, 1, '#2c2e33');
    for (let x = x0; x <= x0 + len; x += 8) Px.rect(x, y - 14, 1, 14, '#2c2e33');
  }
  function wallConcrete(x0, x1) {
    Px.rect(x0, 70, x1 - x0, 64, C.stairs);
    for (let y = 84; y < 134; y += 12) Px.rect(x0, y, x1 - x0, 1, '#51555d');
    for (let x = Math.ceil(x0 / 48) * 48; x < x1; x += 48) Px.rect(x, 74, 1, 60, '#4e525a');
    for (let x = Math.ceil(x0 / 16) * 16 + 8; x < x1; x += 16) for (let y = 78; y < 130; y += 12) Px.dot(x, y, '#4a4e55');
    for (let x = x0 + 4; x < x1; x += 3) {
      const v = hs(x * 5 + 77);
      if (v < 0.22) Px.rect(x, 74, 1, 6 + Math.floor(hs(x + 1) * 40), v < 0.08 ? '#4a4e55' : '#53575f');
    }
    Px.rect(x0, 70, x1 - x0, 3, '#6e727a');
    Px.rect(x0, 70, x1 - x0, 1, '#82868e');
    Px.rect(x0, 73, x1 - x0, 1, '#44474e');
    Px.rect(x0, 127, x1 - x0, 7, '#4a4e55');
    Px.rect(x0, 127, x1 - x0, 1, '#5f636b');
    // pilaster where the refinery wall meets the dam
    Px.rect(x0 - 2, 70, 8, 64, '#4a4e56');
    Px.rect(x0 + 5, 70, 1, 64, '#6a6e76');
    // water-level gauge painted on the concrete
    Px.rect(2612, 80, 2, 46, '#e8e0d0');
    for (let y = 80; y < 126; y += 6) Px.rect(2614, y, y % 12 === 8 ? 4 : 2, 1, '#e8e0d0');
    drawText(Px.g, 'DRY', 2620, 118, '#a8322a', 1, 'left', null);
    // stencil
    drawText(Px.g, 'CROWN', 2770, 112, '#4a4e56', 1, 'left', null);
    drawText(Px.g, 'ACCESS', 2767, 120, '#4a4e56', 1, 'left', null);
    // two flights of stairs up to the dam crown
    let p = stairsRun(2632, 134, 9, 6, 4);
    landing(p.x, p.y, 32);
    stairsRun(p.x + 32, p.y, 6, 6, 4);
    p = stairsRun(2880, 134, 9, 6, 4);
    landing(p.x, p.y, 30);
    p = stairsRun(p.x + 30, p.y, 6, 6, 4);
    landing(p.x, p.y, 36);
    // searchlight housings on the coping
    for (const lx of LAMPS) {
      Px.rect(lx - 1, 70, 2, 4, '#2c3038');
      Px.rect(lx - 5, 72, 10, 6, '#2c3038');
      Px.rect(lx - 5, 72, 10, 1, '#5a626e');
      Px.rect(lx - 4, 77, 8, 2, '#8a8070');
    }
  }
  function crownRailing(x0, x1) {
    Px.rect(x0, 130, x1 - x0, 4, '#5a5a5a');
    Px.rect(x0, 130, x1 - x0, 1, '#7a7a7a');
    Px.rect(x0, 119, x1 - x0, 2, C.rail);
    Px.rect(x0, 119, x1 - x0, 1, '#5a5a5a');
    Px.rect(x0, 125, x1 - x0, 1, C.rail);
    for (let x = ARENA + 24; x < x1; x += 24) {
      Px.rect(x, 119, 2, 13, C.rail);
      Px.dot(x, 119, '#5e5e5e');
      Px.rect(x - 1, 130, 4, 1, '#4a4a4a');
    }
  }

  // L4 floor, screen y 134..224 (extra rows for shake): steel grating with an 8 px grid and rivets,
  // then a hazard threshold and the concrete deck of the dam crown.
  function buildFloor() {
    const w = LEN + 2 * M, { c, g } = mk(w, 90);
    g.setTransform(1, 0, 0, 1, M, -134);
    Px.use(g);
    grating(-M, ARENA - 4);
    deck(ARENA + 4, LEN + M);
    stripes(ARENA - 4, 134, 8, 90, 3);
    Px.rect(ARENA - 5, 134, 1, 90, '#15171c');
    Px.rect(ARENA + 4, 134, 1, 90, '#4a4a4a');
    return { c };
  }
  function grating(x0, x1) {
    Px.rect(x0, 134, x1 - x0, 90, C.grate);
    const gx0 = Math.floor(x0 / 8) * 8;
    for (let y = 134; y < 224; y += 8) for (let x = gx0; x < x1; x += 8) Px.rect(x + 2, y + 2, 5, 5, '#262a31');
    for (let x = gx0; x < x1; x += 8) Px.rect(x, 134, 1, 90, C.grid);
    for (let y = 134; y < 224; y += 8) Px.rect(x0, y, x1 - x0, 1, C.grid);
    for (let x = Math.floor(x0 / 64) * 64; x < x1; x += 64) {
      Px.rect(x - 1, 134, 3, 90, '#1e2128');
      for (let y = 138; y < 224; y += 8) { Px.dot(x - 3, y, '#5a626e'); Px.dot(x + 3, y, '#5a626e'); Px.dot(x - 3, y + 1, '#16181d'); Px.dot(x + 3, y + 1, '#16181d'); }
    }
    Px.rect(x0, 167, x1 - x0, 2, '#1e2128');
    for (let x = gx0; x < x1; x += 16) { Px.dot(x + 4, 166, '#5a626e'); Px.dot(x + 4, 170, '#5a626e'); }
    // stains: oil and green seep
    for (let k = 0; k < (x1 - x0) / 70; k++) {
      const sx = x0 + hs(k * 3 + 400) * (x1 - x0), sy = 142 + hs(k * 3 + 401) * 54, v = hs(k * 3 + 402);
      if (v < 0.5) { g_alpha(0.55, () => Px.oval(sx, sy, 8 + v * 16, 2 + v * 3, '#14161b')); }
      else if (v < 0.75) g_alpha(0.35, () => Px.oval(sx, sy, 6 + v * 8, 2, '#2f6a48'));
    }
    // shadow at the wall foot
    Px.rect(x0, 134, x1 - x0, 2, '#14161b');
    Px.rect(x0, 136, x1 - x0, 1, '#1d2026');
    // danger markings in front of vats and around steam vents
    for (const vx of VATS) stripes(vx - 22, 137, 44, 3, 2);
    for (const [vx, vy] of VENTS) {
      stripes(vx - 17, vy - 6, 34, 2, 2);
      stripes(vx - 17, vy + 5, 34, 2, 2);
      Px.rect(vx - 13, vy - 4, 26, 9, '#20242a');
    }
  }
  function g_alpha(a, fn) { const g = Px.g, o = g.globalAlpha; g.globalAlpha = a; fn(); g.globalAlpha = o; }
  function deck(x0, x1) {
    Px.rect(x0, 134, x1 - x0, 90, C.conc);
    for (let i = 0; i < (x1 - x0) * 0.9; i++) {
      const x = x0 + hs(i * 3 + 900) * (x1 - x0), y = 134 + hs(i * 3 + 901) * 90;
      Px.dot(x, y, hs(i * 3 + 902) < 0.5 ? '#737373' : '#606060');
    }
    for (let x = ARENA + 52; x < x1; x += 48) { Px.rect(x, 134, 1, 90, '#575757'); Px.rect(x + 1, 134, 1, 90, '#727272'); }
    for (const y of [161, 189]) { Px.rect(x0, y, x1 - x0, 1, '#585858'); Px.rect(x0, y + 1, x1 - x0, 1, '#727272'); }
    for (let x = x0 + 6; x < x1; x += 18) Px.rect(x, 140, 11, 2, '#a8902e');
    // cracks
    for (let k = 0; k < 7; k++) {
      let cx = x0 + 20 + hs(k * 5 + 300) * (x1 - x0 - 40), cy = 146 + hs(k * 5 + 301) * 48;
      for (let s = 0; s < 4; s++) {
        const nx = cx + (hs(k * 9 + s) - 0.5) * 14, ny = cy + (hs(k * 9 + s + 4) - 0.3) * 8;
        Px.line(cx, cy, nx, ny, 1, '#4e4e4e');
        cx = nx; cy = ny;
      }
    }
    // drains
    for (const dx of [ARENA + 110, ARENA + 302]) {
      Px.rect(dx - 8, 196, 16, 5, '#3a3a3a');
      for (let x = dx - 6; x < dx + 7; x += 3) Px.rect(x, 197, 1, 3, '#1e1e1e');
    }
    Px.rect(x0, 134, x1 - x0, 2, '#4a4a4a');
    Px.rect(x0, 136, x1 - x0, 1, '#5c5c5c');
  }

  // ---------- per-frame layers ----------
  function farDyn(camX, frame) {
    const k = caches().far, ox = -Math.round(camX * 0.1);
    for (const l of k.lamps) {
      const sx = l.x + ox;
      if (sx < -2 || sx > W + 2) continue;
      if ((frame + l.ph) % 150 < 135) Px.dot(sx, l.y, C.spill);
    }
    for (const s of k.spills) {
      const sx = s.x + ox;
      if (sx < -2 || sx > W + 2) continue;
      Px.dot(sx, s.y, C.spill);
      if ((frame >> 4) % 2) Px.dot(sx, s.y + 1, '#8a6a3a');
    }
  }
  // Toxic haze over the valley floor, between the dam and the refinery.
  function haze(frame) {
    const a = 0.1 + 0.03 * Math.sin(frame * 0.02);
    Px.g.globalAlpha = a;
    Px.rect(-M, 58, W + 2 * M, 12, '#2e6a4a');
    Px.g.globalAlpha = a * 0.6;
    for (let x = -M; x < W + M; x += 2) Px.dot(x + ((frame >> 3) % 2), 57, '#2e6a4a');
    Px.g.globalAlpha = 1;
  }
  function midDyn(camX, frame) {
    const k = caches().mid, ox = -Math.round(camX * 0.35);
    for (const w of k.windows) {
      const sx = w.x + ox;
      if (sx < -2 || sx > W + 2) continue;
      Px.rect(sx, w.y, 2, 1, w.ph < 0.3 && (frame >> 5) % 5 === 0 ? '#5a4a2a' : '#c89a4a');
    }
    for (const r of k.reds) {
      const sx = r.x + ox;
      if (sx < -2 || sx > W + 2) continue;
      if ((frame + r.ph) % 60 < 22) { Px.dot(sx, r.y, '#ff3b30'); Px.g.globalAlpha = 0.3; Px.disc(sx, r.y, 2, '#ff3b30'); Px.g.globalAlpha = 1; }
      else Px.dot(sx, r.y, '#5a1a16');
    }
    for (const f of k.flares) {
      const sx = f.x + ox;
      if (sx < -12 || sx > W + 12) continue;
      const t = frame + f.ph;
      Px.g.globalAlpha = 0.14 + 0.05 * Math.sin(t * 0.3);
      Px.disc(sx, f.y - 5, 9, C.flare);
      Px.g.globalAlpha = 1;
      for (let i = -1; i <= 1; i++) {
        const h = 5 + hs((t >> 2) * 3 + i + f.ph) * 6 + (i === 0 ? 4 : 0);
        const lean = Math.sin(t * 0.05) * 2;
        const col = (((t >> 2) + i + 3) % 3) === 0 ? '#ffd34a' : i === 0 ? C.flare : '#e83b1e';
        Px.poly([sx + i * 2 - 2, f.y, sx + i * 2 + lean, f.y - h, sx + i * 2 + 2, f.y], col);
      }
      Px.poly([sx - 1, f.y, sx + Math.sin(t * 0.05) * 1.5, f.y - 4 - hs(t >> 2) * 2, sx + 1, f.y], '#fff2b0');
    }
    for (const d of k.drips) {
      const sx = d.x + ox;
      if (sx < -2 || sx > W + 2) continue;
      const cyc = 70, t = (frame + d.ph) % cyc;
      Px.dot(sx, d.y, C.tox2);
      if (t < 40) { if (t > 20) Px.rect(sx, d.y, 1, 2, C.tox2); }
      else { const y = d.y + (t - 40) * (t - 40) * 0.035; if (y < 70) Px.rect(sx, y, 1, 2, C.tox2); }
    }
    // two searchlights sweep the sky (+-30 degrees over 240 f)
    for (const m of k.masts) {
      const sx = m.x + ox;
      if (sx < -150 || sx > W + 150) continue;
      const a = Math.sin(frame * TAU / 240 + m.ph) * (Math.PI / 6), L = 140;
      for (const [hw, al] of [[0.1, 0.12], [0.035, 0.1]]) {
        Px.g.globalAlpha = al;
        Px.poly([sx - 1, m.y, sx + 1, m.y, sx + Math.sin(a + hw) * L, m.y - Math.cos(a + hw) * L, sx + Math.sin(a - hw) * L, m.y - Math.cos(a - hw) * L], C.beam);
      }
    }
    Px.g.globalAlpha = 1;
    for (const m of k.masts) {
      const sx = m.x + ox;
      if (sx > -4 && sx < W + 4) Px.rect(sx - 2, m.y - 1, 4, 2, C.beam);
    }
  }

  // Final arena backdrop (right of the gate tower): far shore, the reservoir band and its shimmer.
  function arenaBack(camX, frame, ax) {
    const x0 = Math.max(-M, Math.floor(ax)), x1 = W + M;
    for (let x = x0; x < x1; x++) {
      const wx = x + camX * 0.5;
      const y = Math.round(72 + Math.sin(wx * 0.031) * 5 + Math.sin(wx * 0.013 + 1.3) * 6 + hs(Math.floor(wx / 3)) * 2);
      Px.rect(x, y, 1, 100 - y, '#10141d');
      Px.dot(x, y, '#1e2534');
      const y2 = Math.round(89 + Math.sin(wx * 0.047 + 2) * 3 + Math.sin(wx * 0.11) * 1.5);
      Px.rect(x, y2, 1, 100 - y2, '#161b26');
      Px.dot(x, y2, '#232a38');
    }
    for (const lx of [40, 150, 300]) { const sx = Math.round(lx + ARENA - camX * 0.5 + 70); if (sx >= x0 && sx < x1 && (frame >> 5) % 3) Px.dot(sx, 96, '#c89a4a'); }
    // reservoir: the only saturated blue in the backgrounds
    Px.rect(x0, 100, x1 - x0, 32, C.res0);
    Px.rect(x0, 100, x1 - x0, 1, '#123c78');
    Px.rect(x0, 101, x1 - x0, 1, '#1a4e94');
    for (let r = 0; r < 10; r++) {
      const y = 103 + r * 3, P = 30 + (r % 3) * 14, L = 4 + ((r * 5) % 8);
      const off = (((frame * 0.3 - camX + r * 23) % P) + P) % P;
      for (let x = off - P; x < x1; x += P) {
        const a = Math.max(x, x0), b = Math.min(x + L, x1);
        if (b > a) Px.rect(a, y, b - a, 1, C.res1);
      }
    }
    for (let i = 0; i < 6; i++) {
      const gx = Math.round((hs(i * 7 + (frame >> 4)) * 400 - camX) % 400 + 400) % 400 - 8;
      const gy = 104 + Math.floor(hs(i * 7 + 3 + (frame >> 4)) * 24);
      if (gx >= x0 && (frame + i * 5) % 16 < 8) Px.rect(gx, gy, 2, 1, C.res2);
    }
    // the moon's reflection
    for (let y = 103; y < 129; y += 2) {
      const w = Math.max(1, 7 - (y - 102) / 5 + Math.sin(frame * 0.12 + y) * 1.5);
      const sx = MOON_X - w / 2 + Math.sin(frame * 0.07 + y * 0.6) * 1.5;
      if (sx + w > x0) Px.rect(Math.max(x0, sx), y, w, 1, y % 4 === 1 ? '#d8e8c8' : C.res2);
    }
    Px.rect(x0, 128, x1 - x0, 2, '#164a8a');
  }

  // The dam's gate tower between the refinery and the crown (world x 3072).
  function gateTower(x, frame) {
    Px.rect(x - 14, 9, 28, 125, '#454950');
    Px.rect(x + 4, 9, 10, 125, '#53575f');
    Px.rect(x + 13, 9, 1, 125, '#666a72');
    Px.rect(x - 14, 9, 1, 125, '#33363c');
    for (let y = 30; y < 130; y += 16) { Px.rect(x - 14, y, 28, 1, '#393c43'); Px.rect(x - 14, y + 1, 28, 1, '#5a5e66'); }
    Px.rect(x - 16, 9, 32, 3, '#2c3038');
    Px.poly([x - 17, 10, x + 17, 10, x + 11, 3, x - 11, 3], '#22262e');
    Px.rect(x - 11, 3, 22, 1, '#3a404a');
    Px.rect(x - 10, 15, 6, 7, '#1a1c22'); Px.rect(x - 9, 16, 4, 5, '#ffd27a');
    Px.rect(x + 3, 15, 6, 7, '#1a1c22'); Px.rect(x + 4, 16, 4, 5, (frame >> 6) % 5 ? '#ffd27a' : '#6a5a3a');
    Px.rect(x - 9, 36, 18, 22, C.banner);
    for (let i = 2; i < 18; i += 5) Px.rect(x - 9 + i, 37, 1, 21, '#481616');
    Px.rect(x - 9, 36, 18, 1, '#7a3030');
    for (let i = 0; i < 18; i += 3) Px.poly([x - 9 + i, 58, x - 6 + i, 58, x - 7.5 + i, 60 + (i % 2)], C.banner);
    emblem(x, 47, 5, C.gold, C.banner);
    Px.rect(x - 5, 110, 10, 24, '#14161a');
    Px.rect(x - 6, 109, 12, 1, '#6a6e76');
    stripes(x - 9, 110, 3, 24, 2);
    stripes(x + 6, 110, 3, 24, 2);
    const on = frame % 60 < 30;
    Px.rect(x - 1, 0, 3, 3, on ? '#ff3b30' : '#5a1a16');
    if (on) { Px.g.globalAlpha = 0.25; Px.disc(x, 1, 5, '#ff3b30'); Px.g.globalAlpha = 1; }
  }

  // Floodgate wheel on its housing; STAGES[2].wheel.angle turns it. If the King Valve module has its own
  // turning wheel entity (kvGate), its angle is mirrored here and, once it shows, it paints the wheel.
  function drawWheel(sx, frame) {
    const gate = Game.ents.find(e => e.kvGate && !e.remove);
    if (gate && typeof gate.angle === 'number') STAGE.wheel.angle = gate.angle;
    const wy = WHEEL_Y, a = STAGE.wheel.angle || 0;
    Px.rect(sx - 15, 133, 30, 4, '#4a525c');
    Px.rect(sx - 15, 133, 30, 1, '#6a7480');
    Px.rect(sx - 9, 110, 18, 24, C.pipe0);
    Px.rect(sx - 9, 110, 18, 1, C.pipeHi);
    Px.rect(sx + 5, 111, 4, 23, '#2c3038');
    Px.rect(sx - 9, 111, 1, 23, '#5a626e');
    Px.rect(sx - 4, 126, 8, 5, C.hz0);
    Px.rect(sx - 2, 127, 4, 3, '#1a1a1a');
    if (gate && gate.shown) return;
    ring(sx, wy, 21, 16.5, '#2c3038', '#2c3038', '#2c3038');
    ring(sx, wy, 20, 17, '#7a838e', C.wheel, '#40464f');
    for (let i = 0; i < 6; i++) {
      const t = a + i * TAU / 6, cs = Math.cos(t), sn = Math.sin(t);
      Px.line(sx + cs * 4, wy + sn * 4, sx + cs * 17, wy + sn * 17, 3, C.wheel);
      Px.line(sx + cs * 5 - sn, wy + sn * 5 + cs, sx + cs * 16 - sn, wy + sn * 16 + cs, 1, sn < 0 ? '#7a838e' : '#464c55');
      Px.disc(sx + cs * 21.5, wy + sn * 21.5, 2, '#2c3038');
      Px.disc(sx + cs * 21.5, wy + sn * 21.5, 1.3, '#8a939e');
    }
    Px.disc(sx, wy, 5, '#6a7480');
    Px.disc(sx, wy, 3, '#3a424e');
    Px.dot(sx - 1, wy - 2, '#b8c0c8');
  }

  function vatDyn(sx, frame, wx, stir) {
    const ph = Math.floor(wx * 0.37);
    const gl = 0.035 + 0.012 * Math.sin(frame * 0.05 + ph);
    Px.g.globalAlpha = gl;
    Px.oval(sx, 99, 36, 15, C.tox);
    Px.oval(sx, 100, 28, 11, C.tox);
    Px.oval(sx, 101, 21, 8, C.tox);
    Px.g.globalAlpha = 0.14;
    Px.oval(sx, 104, 21, 5, C.tox);
    Px.g.globalAlpha = 1;
    Px.oval(sx, 104, 18, 1.8, '#25c060');
    Px.oval(sx, 103.6, 16, 1.2, C.tox);
    Px.rect(sx - 12 + ((frame >> 3) % 8), 103, 5, 1, '#b8ffd0');
    const n = stir ? 7 : 4;
    for (let i = 0; i < n; i++) {
      const cyc = 46 + i * 9, tt = frame + i * 23 + ph, t = tt % cyc, k = t / cyc, gen = Math.floor(tt / cyc);
      const bx = sx - 14 + Math.floor(hs(gen * 13 + i * 7 + ph) * 28);
      const by = 103 - k * (stir ? 16 : 10);
      const r = 0.8 + k * (stir ? 3 : 2);
      if (k < 0.82) { Px.disc(bx, by, r, C.tox2); if (r > 1.5) Px.dot(bx - 1, by - 1, '#e2ffe8'); }
      else { const rr0 = r + 1; Px.dot(bx - rr0, by, C.tox2); Px.dot(bx + rr0, by, C.tox2); Px.dot(bx, by - rr0, C.tox2); }
    }
    const lvl = 2 + Math.round(Math.sin(frame * 0.03 + ph));
    Px.rect(sx - 4, 117, 8, 8, '#0f1a14');
    Px.rect(sx - 4, 117 + lvl, 8, 8 - lvl, '#2bd06e');
    Px.rect(sx - 4, 117 + lvl, 8, 1, '#b8ffd0');
    Px.dot(sx - 2 + (frame >> 4) % 4, 124 - ((frame >> 1) % 6), '#b8ffd0');
    for (let i = 0; i < 3; i++) {
      const t = (frame * 0.4 + i * 27 + ph) % 80, k = t / 80;
      Px.g.globalAlpha = 0.22 * (1 - k);
      Px.disc(sx - 8 + i * 8 + Math.sin(t * 0.12 + i) * 3, 101 - t * 0.22, 1.5 + k * 2, '#7cff6a');
    }
    Px.g.globalAlpha = 1;
  }
  function wallDyn(camX, frame, game) {
    const foes = game && game.ents ? game.ents.filter(e => e.team === 'enemy' && !e.remove) : [];
    for (const vx of VATS) {
      const sx = vx - camX;
      if (sx < -50 || sx > W + 50) continue;
      const stir = foes.some(e => Math.abs(e.x - vx) < 26 && e.z > 4 && e.y < 146);
      vatDyn(sx, frame, vx, stir);
    }
    for (const dx of DOORS) {
      const sx = dx - camX;
      if (sx < -20 || sx > W + 20) continue;
      const on = (frame + dx) % 80 < 40;
      Px.rect(sx - 2, 86, 4, 2, on ? '#ff8a2a' : '#4a2a14');
      if (on) { Px.g.globalAlpha = 0.18; Px.poly([sx - 2, 88, sx + 2, 88, sx + 9, 104, sx - 9, 104], '#ff8a2a'); Px.g.globalAlpha = 1; }
    }
    // steam leaking from pipe flanges
    for (let k = 0; k < 14; k++) {
      const fx = 180 + k * 190 + Math.floor(hs(k + 700) * 60);
      if (fx > STAIRS - 20) break;
      const sx = fx - camX;
      if (sx < -10 || sx > W + 10) continue;
      for (let j = 0; j < 4; j++) {
        const t = (frame + j * 11 + k * 7) % 44, q = t / 44;
        Px.g.globalAlpha = 0.3 * (1 - q);
        Px.disc(sx + 1 + t * 0.3, 77 - t * 0.28, 0.8 + q * 2.2, '#d8dce0');
      }
    }
    Px.g.globalAlpha = 1;
    for (const lx of LAMPS) {
      const sx = lx - camX;
      if (sx > -10 && sx < W + 10) Px.rect(sx - 3, 77, 6, 2, C.beam);
    }
  }
  function floorDyn(camX, frame) {
    for (const vx of VATS) {
      const sx = vx - camX;
      if (sx < -40 || sx > W + 40) continue;
      Px.g.globalAlpha = 0.07 + 0.03 * Math.sin(frame * 0.05 + vx);
      Px.oval(sx, 141, 30, 6, C.tox);
      Px.g.globalAlpha = 1;
    }
  }

  // Floor searchlights at the dam stairs (drawn over the actors so they light them).
  function stairLights(camX, frame) {
    for (let i = 0; i < LAMPS.length; i++) {
      const lx = LAMPS[i] - camX;
      if (lx < -160 || lx > W + 160) continue;
      const ph = frame * TAU / 240 + i * 2.3;
      const px = lx + Math.sin(ph) * 90, py = 168 + Math.sin(ph * 0.63 + i) * 22;
      const rx = 22, ry = 7;
      Px.g.globalAlpha = 0.06;
      Px.poly([lx - 3, 79, lx + 3, 79, px + rx, py, px - rx, py], C.beam);
      Px.g.globalAlpha = 0.14;
      Px.oval(px, py, rx, ry, C.beam);
      Px.g.globalAlpha = 0.12;
      Px.oval(px, py, rx * 0.55, ry * 0.55, '#ffffff');
      Px.g.globalAlpha = 1;
    }
  }
  // L5 foreground (parallax 1.3): hanging chains and pipes as thin silhouettes, never over the crown.
  function fgProps(camX, frame) {
    for (let k = 0; k < 11; k++) {
      const F = 300 + k * 330 + Math.floor(hs(k + 40) * 40);
      const sx = Math.round(F - camX * 1.3);
      if (sx < -12 || sx > W + 12) continue;
      if (camX + sx > ARENA - 30) continue;
      const kind = k % 3;
      if (kind === 1) {
        Px.rect(sx - 3, -M, 6, H + 2 * M, C.fg);
        Px.rect(sx + 2, -M, 1, H + 2 * M, '#1c2129');
        for (let y = 20 + (k * 17) % 40; y < H; y += 64) { Px.rect(sx - 4, y, 8, 4, C.fg); Px.rect(sx + 3, y, 1, 4, '#1c2129'); }
      } else {
        const len = 46 + Math.floor(hs(k + 60) * 50);
        const sw = Math.sin(frame * 0.025 + k * 1.7) * 2.5;
        for (let y = -2; y < len; y += 4) {
          const ox = sx + sw * (y / len);
          if ((y >> 2) % 2) Px.rect(ox - 1, y, 3, 4, C.fg);
          else { Px.rect(ox, y, 1, 4, C.fg); Px.dot(ox + 1, y + 1, '#1c2129'); }
        }
        const hx = sx + sw;
        if (kind === 2) {
          Px.rect(hx - 1, len, 3, 5, C.fg);
          Px.poly([hx - 4, len + 4, hx + 2, len + 4, hx + 2, len + 12, hx - 3, len + 14, hx - 6, len + 10, hx - 4, len + 10, hx - 2, len + 11, hx, len + 8, hx - 4, len + 8], C.fg);
        } else {
          Px.rect(hx - 5, len, 11, 4, C.fg);
          Px.rect(hx - 4, len + 4, 9, 8, C.fg);
          Px.rect(hx + 4, len + 4, 1, 8, '#1c2129');
        }
      }
    }
  }

  // ---------- hazards ----------
  function hazardSrc(x, y) { return { x, y, z: 0, team: 'hazard', id: -1, facing: 1, w: 1, h: 1 }; }
  // Chip damage without hitstun (toxic puddles). Erases grey HP like any damage.
  function chip(p, n) {
    if (p.heldBy) { p.holdDamage(n); return; }
    n = Math.max(1, Math.round(n * Game.diff.dmg));
    p.hp = Math.max(0, p.hp - n);
    p.grey = 0; p.flash = 2; p.tintT = 6;
    p.damageTaken = (p.damageTaken || 0) + n;
    Game.addRage(n);
    Game.portraitHit = 6;
    FX.hurtVignette();
    if (p.hp <= 0) p.knockDown(-(p.facing || 1), 1.2, 2.4);
  }

  // TOXIC PUDDLE: 30x8 ellipse, 2 dmg per 20 f to the hero only. Ghouls regenerate in it (they look
  // for entities with toxic = true and use x, y, rx, ry).
  class S3Puddle extends Ent {
    constructor(x, y) {
      super(x, y);
      this.team = 'hazard'; this.toxic = true;
      this.rx = 15; this.ry = 4; this.w = 15; this.h = 1; this.shadowR = 0;
      this.last = -99;
    }
    sortY() { return -9999; }
    inside(e, pad = 0) {
      const dx = (e.x - this.x) / (this.rx + pad), dy = (e.y - this.y) / (this.ry + 2);
      return dx * dx + dy * dy <= 1;
    }
    update() {
      this.t++;
      const p = Game.player;
      if (Game.state !== 'play' || !p || Game.playerGone || p.hp <= 0 || !p.vulnerable || p.z > 2) return;
      if (!this.inside(p, p.w * 0.4)) return;
      if (this.t % 4 === 0) FX.add({ kind: 'bubble', x: p.x + rr(-5, 5), y: p.y, z: 1, vz: 0.45, g: 0, life: 20, color: '#7cff6a' });
      if (this.t - this.last < 20) return;
      this.last = this.t;
      chip(p, 2);
      Sound.sfx('s3Sizzle', this.x);
      for (let i = 0; i < 3; i++) FX.add({ kind: 'dust', x: p.x + rr(-5, 5), y: p.y, z: 2, vx: rr(-0.2, 0.2), vz: rr(0.4, 0.8), life: 26, size: 2, color: '#7cff6a', g: -0.005, grow: 0.12, alpha: 0.5 });
    }
    draw() {}
    drawMarker(ctx, camX) {
      const sx = Math.round(this.x - camX), y = Math.round(this.y), f = Game.frame;
      if (sx < -30 || sx > W + 30) return;
      Px.use(ctx);
      ctx.globalAlpha = 0.12 + 0.05 * Math.sin(f * 0.06 + this.x);
      Px.oval(sx, y, this.rx + 6, this.ry + 3, C.tox);
      ctx.globalAlpha = 0.5;
      Px.oval(sx, y, this.rx, this.ry, C.tox);
      ctx.globalAlpha = 0.45;
      Px.oval(sx + 2, y + 1, this.rx - 5, this.ry - 1.5, '#1fae5a');
      ctx.globalAlpha = 0.7;
      Px.rect(sx - 8 + ((f >> 4) % 4), y - 3, 7, 1, '#b8ffd0');
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const cyc = 40 + i * 13, tt = f + i * 17 + this.x, t = tt % cyc, gen = Math.floor(tt / cyc);
        const bx = sx - 10 + Math.floor(hs(gen * 5 + i + this.x) * 20), by = y - 1 + Math.floor(hs(gen * 5 + i + 3) * 3);
        const k = t / cyc;
        if (k < 0.75) { Px.disc(bx, by - k * 2, 0.6 + k * 1.8, '#7cff6a'); Px.dot(bx - 1, by - 1 - k * 2, '#e2ffe8'); }
        else if (k < 0.9) { Px.dot(bx - 2, by - 2, '#b8ffd0'); Px.dot(bx + 2, by - 2, '#b8ffd0'); Px.dot(bx, by - 4, '#b8ffd0'); }
      }
    }
  }

  // STEAM VENT: 24x6 grate on a 180 f cycle. 0..39 telegraph (hiss, wisps, grate tints #FF8A3D,
  // a red eruption ellipse grows), 40..69 a 28x60 column at alpha 0.7 (10 dmg, KD, everyone).
  class S3Vent extends Ent {
    constructor(x, y, phase) {
      super(x, y);
      this.team = 'hazard'; this.vent = true;
      this.w = 12; this.h = 60; this.shadowR = 0;
      this.c = ((phase % 180) + 180) % 180;
      this.hit = new Set();
      this.src = hazardSrc(x, y);
    }
    get active() { return this.c >= 40 && this.c < 70; }
    sortY() { return this.y + 0.5; }
    visible() { const sx = this.x - Game.cam.x; return sx > -30 && sx < W + 30; }
    colH(k) { return k < 4 ? 60 * (k + 1) / 4 : 60; }
    update() {
      this.t++;
      this.c = (this.c + 1) % 180;
      const c = this.c, vis = this.visible();
      if (c === 0 && vis) Sound.sfx('s3Hiss', this.x);
      if (c < 40 && vis && this.t % (c > 26 ? 3 : 6) === 0) {
        FX.add({ kind: 'dust', x: this.x + rr(-9, 9), y: this.y, z: 1, vx: rr(-0.2, 0.2), vz: rr(0.5, 1.1), life: 22, size: 1.5, color: '#e8ecef', g: -0.01, grow: 0.12, alpha: 0.5 });
      }
      if (c === 40) {
        this.hit.clear();
        if (vis) {
          Sound.sfx('s3Vent', this.x);
          FX.shake(1, 6);
          for (let i = 0; i < 6; i++) FX.add({ kind: 'dust', x: this.x + rr(-12, 12), y: this.y, z: rr(40, 62), vx: rr(-0.8, 0.8), vz: rr(0.3, 0.9), life: 34, size: rr(3, 5), color: '#e8ecef', g: -0.005, grow: 0.15, alpha: 0.55 });
        }
      }
      if (this.active) this.hurt(c - 40);
      if (c >= 70 && c < 96 && vis && this.t % 4 === 0) FX.steam(this.x + rr(-6, 6), this.y, 2, 1);
    }
    hurt(k) {
      if (Game.state !== 'play') return;
      const top = this.colH(k);
      for (const v of [Game.player, ...Game.foes()]) {
        if (!v || v.remove || !v.vulnerable || this.hit.has(v.id)) continue;
        if (v.team === 'player' && Game.playerGone) continue;
        if (Math.abs(v.x - this.x) > 14 + v.w * 0.5 || Math.abs(v.y - this.y) > 8 || v.z > top) continue;
        this.hit.add(v.id);
        v.takeHit(this.src, { dmg: 10, tier: 3, knock: true, kx: 1.3, kz: 4.4, zr: [0, 60], sfx: 'hitHeavy' }, v.x < this.x ? -1 : 1);
        FX.steam(v.x, v.y, v.z + 12, 4);
      }
    }
    drawMarker(ctx, camX) {
      const sx = Math.round(this.x - camX), y = Math.round(this.y);
      if (sx < -30 || sx > W + 30) return;
      Px.use(ctx);
      const c = this.c;
      let heat = 0;
      if (c < 40) heat = c < 12 ? c / 24 : ((c >> (c > 28 ? 1 : 2)) % 2 ? 1 : 0.55);
      else if (c < 70) heat = 1;
      else if (c < 100) heat = 1 - (c - 70) / 30;
      if (heat > 0) { ctx.globalAlpha = 0.28 * heat; Px.oval(sx, y, 17, 5, '#ff8a3d'); ctx.globalAlpha = 1; }
      Px.rect(sx - 12, y - 3, 24, 6, '#101216');
      const rim = heat > 0 ? mixHex('#5a626e', '#ff8a3d', heat) : '#5a626e';
      const bar = heat > 0 ? mixHex(C.grid, '#ffb070', heat) : C.grid;
      Px.rect(sx - 12, y - 3, 24, 1, rim);
      Px.rect(sx - 12, y - 3, 1, 6, rim);
      Px.rect(sx + 11, y - 3, 1, 6, shade(rim, -0.3));
      Px.rect(sx - 12, y + 2, 24, 1, shade(rim, -0.4));
      for (let i = -9; i <= 9; i += 3) Px.rect(sx + i, y - 2, 1, 4, bar);
      if (c >= 8 && c < 40) {
        const k = (c - 8) / 32, r = lerp(6, 14, k);
        ctx.globalAlpha = 0.4 + 0.5 * k;
        for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; Px.dot(sx + Math.cos(a) * r, y + Math.sin(a) * r * 0.4, '#ff3b30'); }
        ctx.globalAlpha = 1;
      }
    }
    draw(ctx, camX) {
      const c = this.c;
      if (c < 40 || c >= 78) return;
      const sx = this.x - camX;
      if (sx < -30 || sx > W + 30) return;
      const k = c - 40, t = this.t;
      const hgt = this.colH(Math.min(k, 29));
      const lift = k > 29 ? (k - 29) * 7 : 0;
      const alpha = k < 26 ? 0.7 : 0.7 * Math.max(0, 1 - (k - 26) / 12);
      Sprite.begin(48, 96, 24, 88);
      for (let z = lift; z <= hgt; z += 3) {
        const wob = Math.sin(z * 0.35 - t * 0.7) * 1.5;
        const top = z > hgt - 12 ? (z - (hgt - 12)) * 0.3 : 0;
        const r = 10 + Math.sin(z * 0.23 + t * 0.5) * 1.5 + top;
        Px.disc(wob + 2, -z, r, '#c4ccd4');
        Px.disc(wob - 1, -z, r - 1.5, '#e8ecef');
      }
      for (let z = lift + 4; z <= hgt; z += 9) Px.disc(Math.sin(z + t * 0.3) * 4 - 3, -z - 2, 2.5, '#ffffff');
      if (!lift) Px.oval(0, 0, 13, 3, '#e8ecef');
      Sprite.end(ctx, sx, this.y, 1, { outline: null, alpha });
    }
  }

  // ---------- audio ----------
  SFX.s3Hiss = (a, p) => { const d = a.out(p); a.noise(0.66, 0.1, 2500, 2.5, 'bandpass', 0, d, 6500); a.noise(0.66, 0.05, 6000, 1, 'highpass', 0, d); };
  SFX.s3Vent = (a, p) => {
    const d = a.out(p, true);
    a.noise(0.5, 0.45, 2200, 0.5, 'highpass', 0, d, 5200);
    a.noise(0.22, 0.4, 260, 0.8, 'lowpass', 0, d);
    a.tone(110, 48, 0.18, 'sine', 0.35, 0, d);
  };
  SFX.s3Sizzle = (a, p) => { const d = a.out(p); a.noise(0.16, 0.14, 4200, 1.2, 'highpass', 0, d); a.tone(1500, 900, 0.05, 'square', 0.035, 0, d); };

  // ---------- stage ----------
  const S = { corr: { n: 0, t: 0 } };
  const at = (lock, worldX) => worldX - lock;   // screen-relative spawn x for a world position

  const STAGE = {
    title: 'THE THIRSTY DAM', sub: "KING VALVE'S REFINERY",
    len: LEN, yMin: 134, yMax: 200, music: 'stage3', camStart: 0,
    wheel: { x: WHEEL_X, y: WHEEL_Y, angle: 0 },
    props: [
      { kind: 'crate', x: 400, y: 186, drop: 'beans' },
      { kind: 'drum', x: 800, y: 184, drop: 'cap' },
      { kind: 'fuel', x: 860, y: 150, drop: 'none' },
      { kind: 'crate', x: 1300, y: 146, drop: 'axe' },
      { kind: 'fridge', x: 1720, y: 142, drop: 'rat' },
      { kind: 'crate', x: 2330, y: 190, drop: 'water' },
      { kind: 'drum', x: 2420, y: 150, drop: 'dogtag' },
      { kind: 'crate', x: 2800, y: 186, drop: 'molotov' },     // a second molotov pops out too
      { kind: 'drum', x: 3094, y: 184, drop: 'beans' },
      { kind: 'drum', x: 3434, y: 150, drop: 'cactus' },
    ],
    items: [],
    waves: [
      // W1: three Ghouls, one climbs out of the vat
      { at: 288, spawns: [
        { type: 'ghoul', side: 'R', y: 162, cap: 3 },
        { type: 'ghoul', side: 'vat', x: at(288, VATS[0]), y: 138, delay: 50, cap: 3 },
        { type: 'ghoul', side: 'L', y: 186, delay: 110, cap: 3 },
      ] },
      // W2 BLOATER BOMB: a Bloater between two Ghouls by the red fuel drum, then a Bloater + 2 Punks
      { at: 720, spawns: [
        { type: 'ghoul', side: 'in', x: 232, y: 151, cap: 3 },
        { type: 'bloater', side: 'in', x: 264, y: 153, cap: 3 },
        { type: 'ghoul', side: 'in', x: 296, y: 151, cap: 3 },
        { type: 'bloater', side: 'R', y: 176, whenBelow: 1 },
        { type: 'punk', side: 'door', x: at(720, DOORS[0]), cap: 3 },
        { type: 'punk', side: 'L', y: 188, delay: 60, cap: 3 },
      ] },
      // (VENT CORRIDOR 1000..1300 has no lock: see update())
      // W3
      { at: 1344, spawns: [
        { type: 'kiln', side: 'R', y: 152, cap: 3 },
        { type: 'spiker', side: 'L', y: 182, delay: 40, cap: 3 },
        { type: 'kiln', side: 'R', y: 186, delay: 150, cap: 3 },
        { type: 'knifer', side: 'door', x: at(1344, DOORS[1]), delay: 200, cap: 3 },
      ] },
      // W4 VAT ROOM
      { at: 1776, spawns: [
        { type: 'ghoul', side: 'vat', x: at(1776, VATS[1]), y: 138, cap: 4 },
        { type: 'ghoul', side: 'vat', x: at(1776, VATS[3]), y: 138, delay: 40, cap: 4 },
        { type: 'bloater', side: 'R', y: 172, delay: 100, cap: 4 },
        { type: 'torcher', side: 'R', y: 150, delay: 160, cap: 4 },
        { type: 'ghoul', side: 'vat', x: at(1776, VATS[2]), y: 138, whenBelow: 2, cap: 4 },
        { type: 'ghoul', side: 'L', y: 184, cap: 4 },
        { type: 'ashtail', side: 'R', y: 164, cap: 4 },
      ] },
      // W5
      { at: 2256, spawns: [
        { type: 'kiln', side: 'R', y: 160, cap: 4 },
        { type: 'ghoul', side: 'vat', x: at(2256, VATS[4]), y: 138, delay: 30, cap: 4 },
        { type: 'bloater', side: 'L', y: 150, delay: 90, cap: 4 },
        { type: 'bruiser', side: 'R', y: 184, delay: 150, cap: 4 },
        { type: 'ashtail', side: 'R', y: 170, delay: 240, cap: 4 },
        { type: 'ghoul', side: 'L', y: 186, delay: 300, cap: 4 },
      ] },
      // W6 DAM STAIRS: a Punk jumps down from the stairs
      { at: 2688, spawns: [
        { type: 'kiln', side: 'R', y: 158, cap: 3 },
        { type: 'punk', side: 'top', x: 130, y: 140, delay: 30, cap: 3 },
        { type: 'punk', side: 'L', y: 186, delay: 90, cap: 3 },
        { type: 'kiln', side: 'R', y: 180, delay: 180, cap: 3 },
      ] },
      // FINAL BOSS on the dam crown
      { at: 3072, boss: true, clearDelay: 30, until: g => g.finaleDone,
        get music() { return SONGS.finalboss ? 'finalboss' : 'boss'; },
        onStart(g) { g.finaleDone = false; },
        spawns: [{ type: 'valve', side: 'in', x: 280 }] },
    ],

    setup(g) {
      S.corr = { n: 0, t: 0 };
      g.finaleDone = false;
      this.wheel.angle = 0;
      caches();
      for (const [x, y] of PUDDLES) g.add(new S3Puddle(x, y));
      for (const [x, y, ph] of VENTS) g.add(new S3Vent(x, y, ph));
      // Crate -> Molotov x2: the stair crate drops a second bottle when it breaks.
      const crate = g.ents.find(e => e.team === 'prop' && e.kind === 'crate' && e.x === 2800);
      if (crate) {
        const smash = crate.smash;
        crate.smash = function (src) {
          const was = this.remove;
          smash.call(this, src);
          if (!was && this.remove) { const it = Game.add(new Item('molotov', this.x + 8, this.y + 1, 2.0)); it.vx = 0.6; }
        };
      }
    },

    update(g) {
      // VENT CORRIDOR: two Ghouls follow Juno in from the left once the camera passes 1000.
      // They are not part of a wave, so the camera never locks for them.
      const c = S.corr;
      if (g.state === 'play' && c.n < 2 && g.cam.x >= 1000 && g.cam.x < 1300 && !g.wave && ENEMY_TYPES.ghoul) {
        if (c.n === 0 || ++c.t > 45) {
          g.spawn({ type: 'ghoul', side: 'L', y: c.n ? 186 : 154 });
          c.n++; c.t = 0;
        }
      }
    },

    // Bodies thrown by any blast here count as "blasted" (§4.4): they bowl other enemies and set off
    // red fuel drums they slam into (the BLOATER BOMB chain).
    onExplosion(g, x, y) {
      for (const e of g.foes()) {
        if (e.state === 'fall' && e.t === 0 && !e.thrownBy && !e.blasted && !e.boss && Math.abs(e.x - x) < 100 && Math.abs(e.y - y) < 24) {
          e.blasted = g.player; e.bowled = new Set();
        }
      }
    },

    drawBg(ctx, camX, frame, game) {
      const k = caches();
      Px.use(ctx);
      ctx.drawImage(k.sky.c, -M, -M);
      drawStars(frame);
      const ax = ARENA - camX;
      if (ax > -M) {
        ctx.save();
        if (ax < W + M) { ctx.beginPath(); ctx.rect(-M, -M, ax + M, H + 2 * M); ctx.clip(); }
        blit(ctx, k.far, camX * 0.1 + M, 0);
        farDyn(camX, frame);
        haze(frame);
        blit(ctx, k.mid, camX * 0.35 + M, 0);
        midDyn(camX, frame);
        ctx.restore();
      }
      if (ax < W + M) arenaBack(camX, frame, ax);
      blit(ctx, k.wall, camX + M, 70);
      wallDyn(camX, frame, game);
      if (ax > -20 && ax < W + 20) gateTower(ax, frame);
      blit(ctx, k.floor, camX + M, 134);
      floorDyn(camX, frame);
      const wx = WHEEL_X - camX;
      if (wx > -30 && wx < W + 30) drawWheel(wx, frame);
    },

    drawFg(ctx, camX, frame) {
      Px.use(ctx);
      stairLights(camX, frame);
      fgProps(camX, frame);
    },
  };

  // STAGES is declared in 80_game.js, which loads after this file: if it is not initialised yet,
  // register once the whole script has run (a microtask, before any frame or input).
  const install = () => { STAGES[2] = STAGE; };
  try { install(); } catch (e) { Promise.resolve().then(install); }
})();
