// vault: texture painters (browser, TECH_PLAN 3.12), imported by art.js. Pixel art at 32 px per world
// unit in three layers (colour, height, emissive), painted lazily on first use.
//
// Palette (12.1): cyan and violet hard light on a black data starfield, magenta corruption near the
// core, warm gold only where a human memory plays. Floors keep their detail under ~10% value contrast
// (G2 bar rule 16): the glow lives in thin emissive seams and sparse traces, never in a stamped blob.
//
// export const TEXTURES   { name: TextureDef } registered by art.js:
//   floors   va_grid / _b / _c ('.' the Grid), va_field / _b (',' the Memory Fields),
//            va_core / _b (':' the Core), va_bridge (light-bridge decks)
//   slabs    va_edge (platform rims), va_under (the stepped undersides)
//   abyss    va_abyss (the data starfield underlay)
//   props    va_pillar (scrolling glyph columns, 4 frames), va_screen (memory-set screens, 3 frames),
//            va_monolith (memory slabs), va_cache (data caches), va_glyph (echo pads, alpha),
//            va_portal (the interface ring, alpha), va_relay (data switch faces, 2 frames)

import { rng, bayer } from '../../art/painter.js';
import { fbm, drawText, clamp01 } from '../../art/tiles.js';

// ---------------------------------------------------------------- ramps (dark -> light)

const VI = ['#0c0e2a', '#151840', '#1f2458', '#2a3070', '#363e88', '#4752a2', '#6170c0', '#8d9ee2'];   // grid indigo
const FI = ['#191637', '#25214e', '#332e66', '#433d7f', '#554e98', '#6c65b4', '#8a83d0', '#b7b0ee'];   // field lavender
const CO = ['#13081a', '#1f0c2b', '#2c1140', '#3b1854', '#4c2169', '#622b84', '#8040aa', '#a85ed2'];   // core plum
const BL = ['#06142a', '#0b2140', '#123358', '#1a4874', '#235f92', '#2f7bb2', '#45a0d2', '#7fd2f2'];   // bridge blue
const CY = { lo: '#0f5a74', mid: '#1f9fc4', hi: '#4fe3ff', hot: '#c8fbff' };                           // emissive cyan
const VL = { lo: '#3a1a72', mid: '#6b38c0', hi: '#a77aff', hot: '#e2d0ff' };                           // emissive violet
const MG = { lo: '#5a0e48', mid: '#b0247e', hi: '#ff4fd0', hot: '#ffc2ee' };                           // emissive magenta
const GD = { lo: '#5a3a0a', mid: '#b07a1e', hi: '#ffc85a', hot: '#fff0c0' };                           // emissive gold

const floor = { w: 32, h: 32, wrapX: true, wrapY: true };

/** Periodic noise over a tile of size n (seamless when the texture wraps). */
const tn = (x, y, seed, scale = 0.25, n = 32, oct = 3) => fbm(x * scale, y * scale, seed, oct, n * scale, n * scale);

const pick = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i))];

// ---------------------------------------------------------------- shared strokes

/**
 * A hard-light panel tile: a low-contrast mottled body, a groove on the north and west edges (so
 * the grid repeats once per cell) carrying a thin emissive seam, lit bevels, a faint 8-px sub-grid.
 */
function panel(t, ramp, seed, { seam = CY.lo, node = CY.mid, body = 3, sub = true } = {}) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, seed, 0.16);
      let c = body;
      if (n > 0.64) c = body + 1;
      else if (n < 0.34 && bayer(x, y, 0.45)) c = body - 1;
      t.px(x, y, pick(ramp, c), 0.55 + (n - 0.5) * 0.06);
    }
  }
  if (sub) {
    for (const k of [8, 16, 24]) {
      for (let i = 2; i < 31; i++) {
        if (i % 2) continue;
        t.tint(k, i, ramp[body + 1], 0.35);
        t.tint(i, k, ramp[body + 1], 0.35);
      }
    }
  }
  // groove: half a seam on every side, so two cells always meet in one even line whatever their turn
  t.hline(0, 31, 0, ramp[0], 0.2).vline(0, 0, 31, ramp[0], 0.2).hline(0, 31, 31, ramp[0], 0.2).vline(31, 0, 31, ramp[0], 0.2);
  for (let i = 0; i < 32; i++) {
    t.emit(i, 0, seam).emit(0, i, seam).emit(i, 31, seam).emit(31, i, seam);
  }
  // a raised lip on all four sides (symmetric, so the legend's random quarter turns never show)
  t.hline(1, 30, 1, ramp[body + 1], 0.6).vline(1, 1, 30, ramp[body + 1], 0.6);
  t.hline(1, 30, 30, ramp[body + 1], 0.6).vline(30, 1, 30, ramp[body + 1], 0.6);
  // crossing node where four cells meet: a quarter in each corner
  for (const [x, y] of [[0, 0], [31, 0], [0, 31], [31, 31]]) t.glow(x, y, ramp[7], node);
}

/** A thin circuit trace: right-angled runs of dim emissive pixels ending in a pad. */
function trace(t, r, x, y, steps, color, albedo) {
  let dx = 1, dy = 0;
  for (let s = 0; s < steps; s++) {
    const len = 3 + Math.floor(r() * 6);
    for (let i = 0; i < len; i++) {
      x = (x + dx + 32) % 32;
      y = (y + dy + 32) % 32;
      if (x < 3 || y < 3) continue;
      t.glow(x, y, albedo, color);
    }
    [dx, dy] = r() < 0.5 ? [dy, dx] : [-dy, -dx];
  }
  if (x >= 3 && y >= 3) {
    t.glow(x, y, albedo, CY.hi);
    t.glow(x + 1, y, albedo, color).glow(x, y + 1, albedo, color);
  }
}

/** A recessed square cell with a soft inner glow ring (memory cells, vents). */
function cell(t, x0, y0, s, ramp, ring, glowColor) {
  for (let y = y0; y < y0 + s; y++) {
    for (let x = x0; x < x0 + s; x++) {
      const e = Math.min(x - x0, y - y0, x0 + s - 1 - x, y0 + s - 1 - y);
      t.px(x, y, e === 0 ? ramp[1] : e === 1 ? ring : ramp[2], e === 0 ? 0.3 : 0.4);
      if (e === 1) t.emit(x, y, glowColor);
    }
  }
}

// ---------------------------------------------------------------- floors

function paintGrid(t) {
  panel(t, VI, 101);
}

function paintGridB(t) {
  panel(t, VI, 103);
  const r = rng(7);
  trace(t, r, 6, 10, 4, CY.lo, VI[4]);
  trace(t, r, 18, 22, 3, VL.lo, VI[4]);
}

function paintGridC(t) {
  panel(t, VI, 107);
  // a small memory cell off-centre, low contrast, with a dim violet ring
  cell(t, 17, 6, 8, VI, VI[4], VL.lo);
  t.glow(20, 9, VI[5], VL.lo);
}

function paintField(t) {
  panel(t, FI, 211, { seam: VL.lo, node: VL.mid, body: 4 });
  // a pale wash of light falling across the panel (low contrast)
  for (let y = 3; y < 31; y++) for (let x = 3; x < 31; x++) if ((x + y) % 11 === 0 && bayer(x, y, 0.4)) t.tint(x, y, FI[6], 0.25);
}

function paintFieldB(t) {
  panel(t, FI, 213, { seam: VL.lo, node: VL.mid, body: 4 });
  // a faint trace and one warm memory mote off-centre (no centred motif: the legend turns cells at random)
  const r = rng(29);
  trace(t, r, 7, 21, 3, VL.lo, FI[5]);
  t.glow(22, 9, FI[6], GD.lo).glow(23, 9, FI[5], GD.lo);
}

function corruption(t, seed, amount) {
  const r = rng(seed);
  // magenta cracks: jagged runs that glow, darker either side
  for (let k = 0; k < amount; k++) {
    let x = 3 + Math.floor(r() * 26), y = 3 + Math.floor(r() * 26);
    const len = 6 + Math.floor(r() * 10);
    for (let i = 0; i < len; i++) {
      t.glow(x, y, CO[6], i % 3 === 0 ? MG.mid : MG.lo);
      t.tone(x + 1, y, -0.08);
      x = Math.max(2, Math.min(30, x + (r() < 0.6 ? 1 : 0)));
      y = Math.max(2, Math.min(30, y + (r() < 0.5 ? 1 : -1)));
    }
  }
  // displaced glitch blocks: a row segment shifted sideways
  for (let k = 0; k < amount; k++) {
    const y = 4 + Math.floor(r() * 24), x0 = 3 + Math.floor(r() * 18), w = 3 + Math.floor(r() * 6);
    for (let x = x0; x < x0 + w; x++) t.tint(x, y, k % 2 ? MG.hi : CY.mid, 0.3);
  }
}

function paintCore(t) {
  panel(t, CO, 307, { seam: MG.lo, node: MG.mid });
  corruption(t, 31, 1);
}

function paintCoreB(t) {
  panel(t, CO, 311, { seam: MG.lo, node: MG.mid });
  corruption(t, 37, 3);
}

/** Hard-light bridge deck: a lattice of diamonds, glowing edges, a bright running centre. */
function paintBridge(t) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const u = (x + y) % 16, v = (x - y + 32) % 16;
      const edge = u === 0 || v === 0;
      const n = tn(x, y, 401, 0.2);
      t.px(x, y, edge ? BL[6] : n > 0.6 ? BL[4] : BL[3], edge ? 0.6 : 0.5);
      if (edge) t.emit(x, y, (x + y) % 4 === 0 ? CY.hi : CY.mid);
      else if (n > 0.72) t.emit(x, y, BL[2]);
    }
  }
}

// ---------------------------------------------------------------- slabs

/** Platform rim: a bright lip on top, then dark slab with dim circuit lines running down. */
function paintEdge(t) {
  const r = rng(53);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 503, 0.18);
      t.px(x, y, y < 3 ? VI[6] : pick(VI, (n > 0.6 ? 2 : 1) - (y > 26 ? 1 : 0)), y < 3 ? 0.7 : 0.45);
    }
  }
  for (let x = 0; x < 32; x++) {
    t.emit(x, 0, CY.hi).emit(x, 1, CY.mid).emit(x, 2, CY.lo);
  }
  // vertical circuit drops with pads, offset per column group
  for (const x0 of [5, 13, 22, 28]) {
    const len = 6 + Math.floor(r() * 14);
    for (let y = 4; y < 4 + len; y++) t.glow(x0, y, VI[4], y % 5 === 0 ? VL.mid : VL.lo);
    t.glow(x0, 4 + len, VI[5], CY.mid);
  }
}

/** The underside of a floating platform: dark faceted crystal with sparse glowing veins. */
function paintUnder(t) {
  const r = rng(61);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 601, 0.22);
      const facet = Math.floor(tn(x, y, 607, 0.09, 32, 1) * 4);
      t.px(x, y, pick(['#120d2c', '#1a1440', '#231a52', '#2c2066'], facet + (n > 0.6 ? 1 : 0)), 0.4 + facet * 0.06);
    }
  }
  for (let k = 0; k < 3; k++) {
    let x = Math.floor(r() * 32), y = 0;
    const col = k === 2 ? CY.lo : VL.lo;
    while (y < 32) {
      t.glow(x, y, '#3a2a7a', col);
      y += 1;
      if (r() < 0.35) x = (x + (r() < 0.5 ? 1 : 31)) % 32;
    }
  }
}

// ---------------------------------------------------------------- the abyss

/** The data starfield below the platforms: violet nebula, a far lattice of light, stars, streams. */
function paintAbyss(t) {
  const N = 128;
  const r = rng(71);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const a = tn(x, y, 701, 0.035, N, 4), b = tn(x, y, 709, 0.07, N, 3);
      const k = clamp01(a * 1.25 - 0.18);
      // deep indigo -> violet -> a few cyan wisps
      let rr = 18 + k * 52, gg = 14 + k * 26, bb = 46 + k * 84;
      if (b > 0.62) { rr += 10; gg += 22 * (b - 0.62) * 4; bb += 26; }
      t.px(x, y, [Math.round(rr), Math.round(gg), Math.round(bb), 255]);
    }
  }
  // a far lattice of light, broken where the nebula is thin
  for (let i = 0; i < N; i++) {
    for (const g of [0, 64]) {
      if (tn(i, g, 713, 0.08, N) > 0.45) t.tint(i, g, '#5fb8f0', 0.35);
      if (tn(g, i, 717, 0.08, N) > 0.45) t.tint(g, i, '#5fb8f0', 0.35);
    }
  }
  // stars and bright data points
  for (let k = 0; k < 150; k++) {
    const x = Math.floor(r() * N), y = Math.floor(r() * N);
    const c = r() < 0.2 ? '#c8fbff' : r() < 0.5 ? '#9fb0ff' : '#e6e2ff';
    t.px(x, y, c);
    if (r() < 0.15) { t.tint(x + 1, y, c, 0.5); t.tint(x - 1, y, c, 0.5); t.tint(x, y + 1, c, 0.5); t.tint(x, y - 1, c, 0.5); }
  }
  // short vertical data streams
  for (let k = 0; k < 14; k++) {
    const x = Math.floor(r() * N), y0 = Math.floor(r() * N), len = 4 + Math.floor(r() * 10);
    for (let i = 0; i < len; i++) t.tint(x, (y0 + i) % N, i === len - 1 ? '#c8fbff' : '#4fb8e8', 0.25 + (i / len) * 0.5);
  }
}

// ---------------------------------------------------------------- props

/** Glyph column for data pillars: rows of cyan glyph blocks scrolling up (frame = scroll step). */
function paintPillar(t, frame) {
  const r = rng(81);
  const rows = Array.from({ length: 24 }, () => Array.from({ length: 6 }, () => r()));
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 801, 0.2, 32);
      t.px(x, y, n > 0.62 ? VI[3] : VI[2], 0.5);
    }
  }
  // edges: lit left, dark right, a groove at the centre of each face pair
  for (let y = 0; y < 96; y++) {
    t.px(0, y, VI[5], 0.6).px(31, y, VI[0], 0.4);
    t.glow(1, y, VI[5], CY.lo);
  }
  const shift = frame * 4;
  for (let y = 0; y < 96; y++) {
    const row = rows[Math.floor(((y + shift) % 96) / 4)];
    if ((y + shift) % 4 === 3) continue;
    for (let c = 0; c < 6; c++) {
      if (row[c] < 0.45) continue;
      const x = 4 + c * 4;
      const col = row[c] > 0.93 ? CY.hot : row[c] > 0.8 ? CY.hi : row[c] > 0.62 ? CY.mid : CY.lo;
      t.glow(x, y, VI[5], col).glow(x + 1, y, VI[5], col);
    }
  }
}

/** Memory-set screens: the Conclave Dock departure board, a waveform, the long-range packet. */
function paintScreen(t, frame) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) t.px(x, y, (x + y) % 2 ? '#0c1830' : '#0a1428', 0.4);
  for (let x = 0; x < 64; x++) { t.glow(x, 0, '#2a6a8a', CY.mid); t.glow(x, 31, '#2a6a8a', CY.lo); }
  for (let y = 0; y < 32; y++) { t.glow(0, y, '#2a6a8a', CY.mid); t.glow(63, y, '#2a6a8a', CY.lo); }
  const text = (s, x, y, c) => drawText(s, x, y, (px, py) => t.glow(px, py, '#9fe8ff', c));
  if (frame === 0) {
    text('CONCLAVE', 4, 4, CY.hi);
    text('DOCK 9', 4, 13, CY.mid);
    for (let x = 4; x < 60; x += 3) t.glow(x, 24, '#2a6a8a', x < 44 ? GD.mid : CY.lo);
  } else if (frame === 1) {
    for (let x = 3; x < 61; x++) {
      const y = Math.round(16 + Math.sin(x * 0.45) * 6 * Math.sin(x * 0.07));
      t.glow(x, y, '#9fe8ff', CY.hi);
      t.glow(x, y + 1, '#2a6a8a', CY.lo);
    }
    text('LULLABY', 4, 3, VL.hi);
  } else {
    text('PACKET', 4, 4, MG.hi);
    text('PRIORITY 0', 4, 13, MG.mid);
    for (let x = 4; x < 60; x += 2) t.glow(x, 24, '#5a1a4a', (x * 7) % 5 ? MG.lo : MG.hi);
  }
}

/** A memory monolith face: a framed still of a voyage moment, light leaking from its edges. */
function paintMonolith(t) {
  const r = rng(91);
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 901, 0.2);
      t.px(x, y, n > 0.6 ? FI[3] : FI[2], 0.5);
    }
  }
  for (let y = 0; y < 96; y++) { t.glow(1, y, FI[6], VL.lo); t.glow(30, y, FI[6], VL.lo); }
  // the still: a window of soft light, with the curve of a planet and a ship's silhouette
  for (let y = 18; y < 66; y++) {
    for (let x = 5; x < 27; x++) {
      const d = Math.hypot(x - 16, y - 82);
      const lit = d < 40 ? GD.lo : '#0c1830';
      t.glow(x, y, '#1a2040', d < 40 && d > 38 ? GD.hi : lit);
    }
  }
  for (let k = 0; k < 30; k++) t.glow(5 + Math.floor(r() * 22), 18 + Math.floor(r() * 18), '#9fe8ff', '#e8f4ff');
  for (let x = 9; x < 23; x++) t.glow(x, 44 + Math.round(Math.abs(x - 16) * 0.2), '#2a3060', '#6070a0');
}

/** A data cache (the Vault's chests): plated faces with a glowing seam and a lock glyph. */
function paintCache(t) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 1001, 0.2);
      t.px(x, y, n > 0.6 ? VI[5] : VI[4], 0.55);
    }
  }
  t.hline(0, 31, 0, VI[7], 0.7).vline(0, 0, 31, VI[6], 0.66).hline(0, 31, 31, VI[1], 0.4).vline(31, 0, 31, VI[2], 0.4);
  for (let x = 2; x < 30; x++) t.glow(x, 15, VI[6], CY.mid);
  for (const [x, y] of [[14, 9], [15, 9], [16, 9], [17, 9], [13, 10], [18, 10], [13, 11], [18, 11]]) t.glow(x, y, VI[6], GD.mid);
  for (let y = 12; y < 15; y++) for (let x = 13; x < 19; x++) t.glow(x, y, VI[6], y === 13 ? GD.hi : GD.mid);
}

/** A floor glyph for memory-echo pads: a warm double ring with tick marks (alpha). */
function paintGlyph(t) {
  const N = 64, c = 31.5;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - c, y - c), a = Math.atan2(y - c, x - c);
      const tick = Math.abs(((a / (Math.PI * 2)) * 24) % 1 - 0.5) > 0.42;
      if ((d > 28.5 && d < 30.5) || (d > 22.5 && d < 23.6) || (tick && d > 24.5 && d < 27.5)) t.glow(x, y, '#ffe2a0', d > 28 ? GD.hi : GD.mid);
      else if (d < 22) t.px(x, y, [255, 210, 120, Math.round(28 * (1 - d / 22))]);
    }
  }
}

/** The interface ring: segmented cyan arcs with notches (alpha). */
function paintPortal(t) {
  const N = 64, c = 31.5;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - c, y - c), a = Math.atan2(y - c, x - c) + Math.PI;
      const seg = Math.floor((a / (Math.PI * 2)) * 16);
      if (d > 26 && d < 31 && seg % 4 !== 3) t.glow(x, y, '#bff6ff', d > 29 ? CY.hot : CY.hi);
      else if (d > 21 && d < 23 && seg % 2 === 0) t.glow(x, y, '#a77aff', VL.hi);
    }
  }
}

/** A data switch face: dark when off (frame 0), cyan and open when on (frame 1). */
function paintRelay(t, frame) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) t.px(x, y, (x + y) % 3 ? VI[3] : VI[2], 0.55);
  for (let y = 0; y < 32; y++) { t.px(0, y, VI[5], 0.65); t.px(15, y, VI[1], 0.45); }
  const col = frame ? CY.hi : MG.lo;
  for (let y = 4; y < 28; y += 3) for (let x = 4; x < 12; x++) if (frame || (x + y) % 2) t.glow(x, y, VI[5], col);
  for (let y = 4; y < 8; y++) for (let x = 6; x < 10; x++) t.glow(x, y, VI[6], frame ? CY.hot : MG.mid);
}

export const TEXTURES = {
  va_grid: { ...floor, paint: paintGrid },
  va_grid_b: { ...floor, paint: paintGridB },
  va_grid_c: { ...floor, paint: paintGridC },
  va_field: { ...floor, paint: paintField },
  va_field_b: { ...floor, paint: paintFieldB },
  va_core: { ...floor, paint: paintCore },
  va_core_b: { ...floor, paint: paintCoreB },
  va_bridge: { ...floor, paint: paintBridge },
  va_edge: { w: 32, h: 32, wrapX: true, wrapY: true, paint: paintEdge },
  va_under: { ...floor, paint: paintUnder },
  va_abyss: { w: 128, h: 128, wrapX: true, wrapY: true, paint: paintAbyss },
  va_pillar: { w: 32, h: 96, wrapX: true, wrapY: true, frames: 4, fps: 3, paint: paintPillar },
  va_screen: { w: 64, h: 32, frames: 3, fps: 0.4, paint: paintScreen },
  va_monolith: { w: 32, h: 96, paint: paintMonolith },
  va_cache: { w: 32, h: 32, paint: paintCache },
  va_glyph: { w: 64, h: 64, alpha: true, paint: paintGlyph },
  va_portal: { w: 64, h: 64, alpha: true, paint: paintPortal },
  va_relay: { w: 16, h: 32, frames: 2, paint: paintRelay },
};
