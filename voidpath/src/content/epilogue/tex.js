// epilogue: textures (browser, TECH_PLAN 3.12; registered through art.js). 32 texture px = 1 world
// unit, painted as colour + height (+ emissive). Ione is pale blue ice and lavender snow under a pink
// dawn; nothing on it is dark except the open water.
//
//   ione      ep_ice / ep_ice_b (clear shelf ice: cracks, trapped bubbles), ep_glare (wind-polished
//             ice at the water's edge with the dawn caught in it), ep_snow / ep_snow_b (wind-carved
//             snow, lavender shadows), ep_sea (4 frames: the open lead, dark water with pink light on
//             it), ep_ice_bank, ep_seabed, ep_cliff / ep_cliff_cap / ep_cliff_low (layered ice cliffs
//             and snowbanks), ep_block (ice blocks of the pressure ridges), ep_pad (Ringborn landing
//             plates), ep_seed (ship kelp seeded under the ice, glowing; alpha), bd_ione_dawn (the
//             sky: Tethys rising over the open lead at dawn; also the title's window after a clear)
//   halcyon   ep_slab (the memorial: the names of those who chose to keep dreaming, in light),
//             ep_sign_2271, ep_pod_inner (the inside of pod 2271, frost-lit), ep_canvas (HALCYON's
//             painting of Tethys, half done), ep_wood (the easel)
//   driftmarket  ep_halcyon_far (the Halcyon passing the viewport; alpha)

import { fbm, hash, rivet, drawText, textWidth } from '../../art/tiles.js';
import { Painter, bayer } from '../../art/painter.js';

// ---------------------------------------------------------------- palettes

const ICE = ['#1a3456', '#24486e', '#30608a', '#4478a2', '#5a90b8', '#76aaca', '#98c4dc', '#bcdcec', '#e0f2fa'];
const SNOW = ['#4e4c6e', '#625e82', '#787296', '#8e88aa', '#a69ebe', '#bcb4d0', '#d2cce0', '#e6e2ee', '#f6f4fa'];
const DAWN = ['#c86a7a', '#e88a8e', '#ffaa9e', '#ffc4aa', '#ffdcbe', '#fff0d8'];
const SEA = ['#04101a', '#081a28', '#0c2638', '#123448', '#1a4458', '#245668', '#326a7a'];
const STONE = ['#0c1018', '#141a24', '#1c2430', '#26303e', '#323e4e', '#425062'];
const STEEL = ['#1a1e26', '#262c36', '#343c48', '#46505e', '#5a6676', '#727e8e'];
const AMBER = ['#5a2a08', '#8a4610', '#c06a1c', '#e8922e', '#ffb850', '#ffd88a'];
const WOOD = ['#2a160a', '#3e2412', '#56341c', '#704628', '#8a5a34', '#a47244'];
const CYAN = ['#0c3a4a', '#16607a', '#2a8eaa', '#5cc4dc', '#a8eef8', '#e6fcff'];

const clampI = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i))];
/** Ordered-dithered ramp lookup: v is a fractional index into the ramp. */
const dpick = (ramp, v, x, y) => {
  const i = Math.floor(v);
  return clampI(ramp, i + (bayer(x, y, v - i) ? 1 : 0));
};
/** Tileable fbm over a w x h texture with `k` lattice cells across (integer, so it wraps). */
const tn = (x, y, w, h, k, seed, oct = 3) => fbm((x * k) / w, (y * k) / h, seed, oct, k, Math.max(1, Math.round((k * h) / w)));

// ---------------------------------------------------------------- ione: ice, snow, water

/** Clear shelf ice: soft blue value drift, hairline fractures with a lit edge, trapped bubbles. */
function ice(t, seed, deep) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 4);
    const m = tn(x, y, 32, 32, 6, seed + 3, 2);
    const v = (deep ? 4.4 : 5.2) + (n - 0.5) * 1.8 + (m - 0.5) * 0.5;
    t.px(x, y, dpick(ICE, v, x, y), 0.52 + (n - 0.5) * 0.06);
  }
  // fractures: thin dark lines where a warped noise crosses its middle, each with a lit lip below
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const w = tn(x, y, 32, 32, 2, seed + 9, 2);
    const f = Math.abs(tn(x + w * 10, y - w * 7, 32, 32, deep ? 3 : 2, seed + 11, 2) - 0.5);
    if (f < 0.018) {
      t.px(x, y, ICE[deep ? 1 : 2], 0.42);
      t.px(x, y + 1, ICE[7], 0.56);
    }
  }
  // bubbles caught in the ice
  for (let i = 0; i < (deep ? 9 : 5); i++) {
    const x = Math.floor(hash(i, 3, seed) * 32), y = Math.floor(hash(i, 5, seed) * 32);
    t.px(x, y, ICE[8], 0.6).px(x + 1, y + 1, ICE[3], 0.48);
  }
}

/** Wind-polished ice by the water: brighter, near flat, long streaks holding the dawn. */
function glare(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 3);
    const streak = tn(x * 0.25, y * 2.5, 32, 32, 4, seed + 5, 2);
    let c = dpick(ICE, 5.8 + (n - 0.5) * 1.2, x, y);
    if (streak > 0.64) c = dpick(DAWN, 3.2 + (streak - 0.64) * 6, x, y);
    else if (streak < 0.3) c = dpick(ICE, 6.6 + (0.3 - streak) * 4, x, y);
    t.px(x, y, c, 0.5);
  }
}

/** Wind-carved snow (sastrugi): long ridges, lavender in their lee, warm on their crests. */
function snow(t, seed, rough) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 4);
    const ridge = Math.sin(((x + y * 0.35) / 32) * Math.PI * 2 * (rough ? 3 : 2) + n * 5.5);
    const v = 6.0 + ridge * (rough ? 0.9 : 0.6) + (n - 0.5) * 1.0;
    let c = dpick(SNOW, v, x, y);
    if (ridge > 0.82 && n > 0.45) c = DAWN[5];
    t.px(x, y, c, 0.5 + ridge * 0.05);
  }
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(hash(i, 7, seed) * 32), y = Math.floor(hash(i, 9, seed) * 32);
    t.px(x, y, '#ffffff', 0.58);
  }
}

/** The open lead: dark water, slow swells, the pink of the dawn laid on it in long strokes. */
function sea(t, f, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x + f * 8, y, 32, 32, 2, seed, 3);
    const swell = Math.sin(((y + f * 8) / 32) * Math.PI * 4 + n * 4) * 0.5 + 0.5;
    let c = dpick(SEA, 2.6 + swell * 2.0 + (n - 0.5) * 1.2, x, y);
    const glint = tn(x * 0.3 + f * 8, y * 3, 32, 32, 4, seed + 7, 2);
    if (glint > 0.66 && swell > 0.5) c = dpick(DAWN, 1.2 + (glint - 0.66) * 8, x, y);
    t.px(x, y, c, 0.5 + swell * 0.04);
  }
  for (let i = 0; i < 6; i++) {
    const x = (Math.floor(hash(i, 1, seed) * 32) + f * 8) % 32, y = Math.floor(hash(i, 2, seed) * 32);
    t.glow(x, y, DAWN[4], DAWN[2]).glow(x + 1, y, DAWN[3], DAWN[1]);
  }
}

/** The lead's edge: a snow lip, then ice strata going blue and dark toward the water (32 x 24). */
function iceBank(t, seed) {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 24, 2, seed, 3);
    const lip = y < 3 + Math.round(n * 2);
    const strata = Math.sin(y * 1.3 + n * 3) * 0.4;
    t.px(x, y, lip ? dpick(SNOW, 7.0 + (n - 0.5), x, y) : dpick(ICE, 6.4 - y * 0.2 + strata, x, y), lip ? 0.6 : 0.5);
  }
}

function seabed(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 3, seed, 3);
    t.px(x, y, dpick(SEA, 1.4 + (n - 0.5) * 1.6, x, y), 0.5);
  }
}

/** An ice cliff, 32 x 96: a snow cornice, then layered ice, blue in the deep bands, cut by fractures. */
function cliff(t, seed) {
  for (let y = 0; y < 96; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 96, 2, seed, 4);
    let c, h = 0.5;
    if (y < 10 + Math.round(n * 4)) {
      c = dpick(SNOW, 7.2 - y * 0.06 + (n - 0.5), x, y);
      h = 0.62;
    } else {
      const band = Math.sin(y * 0.42 + n * 4) * 0.8 + Math.sin(y * 0.11) * 0.6;
      c = dpick(ICE, 5.4 + band - (y > 80 ? (y - 80) * 0.08 : 0) + (n - 0.5) * 0.8, x, y);
      h = 0.5 + band * 0.04;
    }
    t.px(x, y, c, h);
  }
  // vertical fractures with a lit edge
  for (const [x0, y0, len] of [[7, 22, 40], [21, 34, 52], [27, 14, 24]]) {
    for (let k = 0; k < len; k++) {
      const x = x0 + Math.round(Math.sin(k * 0.3 + seed) * 1.2);
      t.px(x, y0 + k, ICE[2], 0.4).px(x + 1, y0 + k, ICE[8], 0.56);
    }
  }
}

function cliffCap(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 3);
    t.px(x, y, dpick(SNOW, 7.0 + (n - 0.5) * 1.2, x, y), 0.55);
  }
}

function cliffLow(t, seed) {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 24, 2, seed, 3);
    t.px(x, y, y < 3 ? SNOW[8] : dpick(SNOW, 6.0 - y * 0.08 + (n - 0.5) * 1.2, x, y), y < 3 ? 0.64 : 0.52);
  }
}

/** Faces of the pressure-ridge blocks: dense blue ice, a snow crust on top, internal fractures. */
function block(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 4);
    const crust = y < 4 + Math.round(n * 3);
    const f = Math.abs(tn(x + n * 8, y, 32, 32, 3, seed + 4, 2) - 0.5);
    let c = crust ? dpick(SNOW, 7.2 + (n - 0.5), x, y) : dpick(ICE, 4.6 + (n - 0.5) * 2.2 + y * 0.02, x, y);
    if (!crust && f < 0.02) c = ICE[8];
    t.px(x, y, c, crust ? 0.62 : 0.5);
  }
}

/** Ringborn landing plates laid on the ice: dark steel squares, amber edge paint, frost in the seams. */
function pad(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 3);
    const seam = x % 16 === 0 || y % 16 === 0;
    let c = seam ? SNOW[6] : dpick(STEEL, 2.8 + (n - 0.5) * 1.4, x, y);
    if (!seam && (x % 16 === 1 || y % 16 === 1) && ((x + y) >> 2) % 2 === 0) c = AMBER[3];
    t.px(x, y, c, seam ? 0.42 : 0.55);
  }
  for (const [x, y] of [[4, 4], [12, 4], [4, 12], [12, 12], [20, 20], [28, 20], [20, 28], [28, 28]]) rivet(t, x, y, STEEL, 5);
}

/** Ship kelp seeded under the ice: soft green filaments glowing up through it (alpha, 64 x 64). */
function seedTraces(t) {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const d = Math.hypot(x - 32, y - 32) / 32;
    if (d > 1) continue;
    const w = fbm(x * 0.06, y * 0.06, 611, 3);
    const strand = Math.abs(Math.sin(Math.atan2(y - 32, x - 32) * 5 + w * 6 + d * 3));
    if (strand < 0.16 && fbm(x * 0.2, y * 0.2, 613, 2) > 0.38 * d + 0.2) {
      const k = 1 - d;
      t.glow(x, y, k > 0.5 ? '#9cffc0' : '#4ad08a', k > 0.5 ? '#6cf0a0' : '#2a8a5a');
    }
  }
}

// ---------------------------------------------------------------- halcyon: the memorial, pod 2271, the easel

/**
 * The memorial (64 x 64): dark polished stone; a crest at the top; six columns of names in pale light,
 * one line warm (Commander Ilse Voss).
 */
function slab(t) {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const n = fbm(x * 0.08, y * 0.08, 621, 3);
    const edge = x < 2 || x > 61 || y < 2 || y > 61;
    t.px(x, y, edge ? STONE[4] : dpick(STONE, 1.8 + (n - 0.5) * 1.2 + (y < 32 ? 0.2 : 0), x, y), edge ? 0.62 : 0.5);
  }
  // the crest: a ring over a bar
  for (let y = 4; y < 13; y++) for (let x = 26; x < 38; x++) {
    const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 8.5);
    if (d > 3.4 && d < 4.6) t.glow(x, y, CYAN[4], CYAN[3]);
  }
  for (let x = 20; x < 44; x++) t.glow(x, 14, CYAN[3], CYAN[2]);
  // six columns of names, each a short bright dash of uneven length
  for (let col = 0; col < 6; col++) for (let row = 0; row < 14; row++) {
    const x0 = 5 + col * 9, y = 18 + row * 3;
    const len = 4 + Math.floor(hash(col, row, 623) * 4);
    const voss = col === 2 && row === 5;
    for (let i = 0; i < len; i++) {
      if (hash(col * 31 + i, row, 625) < 0.12) continue;
      t.glow(x0 + i, y, voss ? AMBER[5] : CYAN[4], voss ? AMBER[4] : CYAN[2]);
    }
  }
}

/** "POD 2271" on a dark plate, the digits lit amber (64 x 16). */
function sign2271(t) {
  t.rect(0, 0, 64, 16, STEEL[1], 0.5);
  t.hline(0, 63, 0, STEEL[4], 0.6).hline(0, 63, 15, STEEL[0], 0.45);
  const s = 'POD 2271';
  drawText(s, Math.floor((64 - textWidth(s)) / 2), 4, (x, y) => t.glow(x, y, AMBER[5], AMBER[4]));
}

/** Inside pod 2271: a frost-lit cradle, pale cyan light from the walls (32 x 64). */
function podInner(t) {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) {
    const n = fbm(x * 0.12, y * 0.06, 631, 3);
    const side = Math.min(x, 31 - x);
    const cradle = side > 6 && y > 6 && y < 60;
    const c = cradle ? dpick(CYAN, 3.2 + (n - 0.5) * 1.2 - Math.abs(y - 30) * 0.02, x, y) : dpick(ICE, 6.4 + (n - 0.5), x, y);
    t.glow(x, y, c, cradle ? CYAN[3] : ICE[5]);
    if (n > 0.66 && !cradle) t.px(x, y, '#ffffff');
  }
}

/** HALCYON's painting of Tethys, half done: the planet's light first, the dark creeping round it (64 x 48). */
function canvas(t) {
  const P = { x: 26, y: 26, r: 14 };
  for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) {
    const bare = x > 44 + Math.round(fbm(x * 0.1, y * 0.2, 641, 2) * 6);
    const n = fbm(x * 0.25, y * 0.12, 643, 2);
    let c;
    if (bare) c = n > 0.5 ? '#efe6d4' : '#e2d8c4';
    else {
      const d = Math.hypot(x + 0.5 - P.x, (y + 0.5 - P.y) * 1.1) / P.r;
      if (d < 1) {
        const band = Math.sin((y - P.y + 14) * 0.9 + n * 2);
        c = dpick(AMBER, 3.4 + band * 0.9 - d * 0.8 + (x < P.x ? 0.6 : -0.4), x, y);
      } else {
        // the dark, laid on in strokes, with the odd star
        c = dpick(['#0a0e1e', '#121a30', '#1c2a46', '#2a3c5e'], 1.2 + (n - 0.5) * 2, x, y);
        if (hash(x, y, 645) > 0.985) c = '#f4f0ff';
      }
      // the ring: one confident stroke
      const ry = P.y + 2 + (x - P.x) * -0.18;
      if (Math.abs(y + 0.5 - ry) < 0.9 && Math.abs(x - P.x) < P.r * 1.9 && !(d < 1 && y < ry - 0.5)) c = '#fff0c8';
    }
    t.px(x, y, c, 0.5);
  }
  for (let x = 0; x < 64; x++) t.px(x, 0, WOOD[2], 0.6).px(x, 47, WOOD[1], 0.45);
  for (let y = 0; y < 48; y++) t.px(0, y, WOOD[2], 0.6).px(63, y, WOOD[1], 0.45);
}

function wood(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const g = tn(x * 0.5, y * 3, 32, 32, 4, seed, 2);
    t.px(x, y, dpick(WOOD, 3.2 + (g - 0.5) * 2, x, y), 0.5 + (g - 0.5) * 0.08);
  }
}

// ---------------------------------------------------------------- driftmarket: the Halcyon passing

/**
 * The Halcyon seen from Driftmarket (256 x 64, alpha): the long spine, the drum of the cryo decks,
 * radiator fins, the engine block glowing at the stern, lit amber from Tethys along its upper edge.
 */
function halcyonFar(t) {
  const cy = 34;
  const half = (x) => {
    if (x < 8 || x > 244) return 0;
    if (x < 30) return 2 + (x - 8) * 0.18;              // the bow, tapering
    if (x >= 64 && x < 118) return 12;                    // the cryo drum
    if (x >= 200) return 9;                               // the engine block
    return 6;
  };
  for (let x = 0; x < 256; x++) {
    const h = half(x);
    if (!h) continue;
    for (let y = Math.round(cy - h); y <= Math.round(cy + h * 0.8); y++) {
      const k = (y - (cy - h)) / (h * 1.8);
      const n = fbm(x * 0.2, y * 0.3, 651, 2);
      let c = dpick(STEEL, 4.2 - k * 3.2 + (n - 0.5), x, y);
      if (k < 0.12) c = AMBER[4];
      if (x >= 64 && x < 118 && (x - 64) % 9 === 0) c = STEEL[1];
      t.px(x, y, c);
      // the cryo decks' windows: rows of warm lights
      if (x >= 66 && x < 116 && (y - cy) % 4 === 0 && x % 3 === 0 && k > 0.2 && k < 0.85) t.glow(x, y, '#ffd890', '#ffb850');
      else if (x % 7 === 0 && y === cy && x > 30 && x < 200) t.glow(x, y, '#bff4ff', '#7fd8ff');
    }
  }
  // radiator fins above and below the spine
  for (let x = 128; x < 192; x += 6) {
    for (let y = cy - 18; y < cy - 6; y++) t.px(x, y, STEEL[3]).px(x + 1, y, STEEL[2]);
    for (let y = cy + 6; y < cy + 15; y++) t.px(x, y, STEEL[2]).px(x + 1, y, STEEL[1]);
  }
  // the engine glow at the stern
  for (let y = cy - 7; y <= cy + 7; y++) for (let x = 244; x < 256; x++) {
    const k = 1 - (x - 244) / 12 - Math.abs(y - cy) / 12;
    if (k > 0.1) t.glow(x, y, k > 0.6 ? '#e6fcff' : '#7fd8ff', k > 0.6 ? '#bff4ff' : '#3aa8e0');
  }
}

// ---------------------------------------------------------------- the dawn sky (raw, 1024 x 512)

const SKY_W = 1024, SKY_H = 512;
const HORIZON = Math.round(SKY_H * 0.6);
const TETHYS = { x: 600, y: HORIZON + 70, r: 236 };
const SUN = { x: 210, y: HORIZON - 6, r: 13 };
const LIGHT = (() => { const v = [-0.86, 0.12, 0.5]; const n = Math.hypot(...v); return v.map((c) => c / n); })();

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgb = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

// the sky from the zenith to the horizon: night blue, violet, rose, peach, the pale gold at the rim
const SKY_STOPS = [[0, '#141c44'], [0.22, '#2a2c66'], [0.45, '#5e4a8a'], [0.66, '#b46e9a'], [0.82, '#f29a9a'], [0.93, '#ffc4a4'], [1, '#ffe6c4']]
  .map(([k, c]) => [k, rgb(c)]);
const BANDS = ['#8a5a3a', '#d6a46a', '#f2dcb4', '#e2b47a', '#c08250', '#f4e4c4', '#e6be86', '#a8683e', '#ecd2a0', '#cc905a', '#f6e8cc']
  .map(rgb);

function skyAt(y) {
  const k = clamp01(y / HORIZON);
  for (let i = 1; i < SKY_STOPS.length; i++) {
    if (k <= SKY_STOPS[i][0]) {
      const [k0, c0] = SKY_STOPS[i - 1], [k1, c1] = SKY_STOPS[i];
      const f = (k - k0) / (k1 - k0);
      return lerp3(c0, c1, f * f * (3 - 2 * f));
    }
  }
  return SKY_STOPS[SKY_STOPS.length - 1][1];
}

function bandAt(lat, lon) {
  const wob = (fbm(lon * 3 + 2, lat * 8, 661, 4) - 0.5) * 0.1;
  const t = clamp01((lat + wob + 1) / 2) * (BANDS.length - 1);
  const k = Math.floor(t), f = t - k;
  return lerp3(BANDS[k], BANDS[Math.min(BANDS.length - 1, k + 1)], f * f * (3 - 2 * f));
}

/** The ring plane seen a little from above: an ellipse of radius rr (in planet radii), y squashed. */
const RING = { tilt: -0.1, squash: 0.17, r0: 1.32, r1: 2.05 };
function ringAt(px, py) {
  const dx = (px - TETHYS.x) / TETHYS.r, dy = (py - TETHYS.y) / TETHYS.r;
  const c = Math.cos(RING.tilt), s = Math.sin(RING.tilt);
  const u = dx * c + dy * s, v = (-dx * s + dy * c) / RING.squash;
  const rr = Math.hypot(u, v);
  if (rr < RING.r0 || rr > RING.r1) return null;
  const k = (rr - RING.r0) / (RING.r1 - RING.r0);
  const gap = k > 0.56 && k < 0.62 ? 0.2 : 1;
  const grain = 0.7 + fbm(rr * 40, 1, 667, 2) * 0.6;
  return { front: v > 0, k: gap * grain * (1 - Math.abs(k - 0.4) * 0.8) };
}

/** Ione's dawn: Tethys rising huge over the open lead, its rings across the sky, the sun just up. */
export function paintIoneDawn() {
  const img = new Float32Array(SKY_W * SKY_H * 3);
  for (let y = 0; y < SKY_H; y++) for (let x = 0; x < SKY_W; x++) {
    let c;
    if (y < HORIZON) {
      c = skyAt(y);
      // the sun's glow, wide and warm, low on the left
      const sd = Math.hypot((x - SUN.x) / 1.6, y - SUN.y);
      c = lerp3(c, rgb('#fff2d4'), clamp01(Math.exp(-sd / 70) * 0.85));
      // faint stars still out at the top
      if (y < HORIZON * 0.35 && hash(x, y, 671) > 0.9965) c = lerp3(c, [1, 1, 1], 0.7 - y / HORIZON);
      // thin cirrus, lit pink from below
      const cl = fbm(x * 0.004, y * 0.03, 673, 4);
      if (y > HORIZON * 0.45 && cl > 0.58) c = lerp3(c, rgb('#ffd0c0'), clamp01((cl - 0.58) * 3) * 0.55);
    } else {
      // the far water: the sky's colours laid on dark sea, the sun's path a broken gold column
      const k = (y - HORIZON) / (SKY_H - HORIZON);
      c = lerp3(rgb('#3a3c6a'), rgb('#0c1a2c'), Math.pow(k, 0.6));
      const ripple = fbm(x * 0.01, y * 0.25, 675, 3);
      c = lerp3(c, rgb('#e89aa0'), clamp01((ripple - 0.55) * 2.5) * (1 - k) * 0.6);
      const path = Math.exp(-(((x - SUN.x) / (18 + k * 50)) ** 2));
      if (ripple > 0.45) c = lerp3(c, rgb('#ffe2b0'), path * (1 - k * 0.7) * 0.9);
    }

    // Tethys: banded amber and cream, lit on the left by the low sun, veiled by the dawn air
    const dx = (x + 0.5 - TETHYS.x) / TETHYS.r, dy = (y + 0.5 - TETHYS.y) / TETHYS.r;
    const d2 = dx * dx + dy * dy;
    const ring = ringAt(x + 0.5, y + 0.5);
    if (d2 < 1 && y < HORIZON) {
      const nz = Math.sqrt(1 - d2);
      let pc = bandAt(dy, Math.atan2(dx, nz) / Math.PI);
      const lam = dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2];
      const lit = clamp01(lam * 1.1 + 0.1);
      const term = Math.exp(-(((lam - 0.02) / 0.09) ** 2)) * 0.3;
      pc = [pc[0] * (0.16 + lit) + term * 0.7, pc[1] * (0.12 + lit * 0.92) + term * 0.3, pc[2] * (0.2 + lit * 0.85) + term * 0.2];
      pc = pc.map((v) => v * (0.5 + 0.5 * Math.pow(nz, 0.35)));
      // the ring's shadow, a dark band just above the ring plane on the planet
      const sh = Math.exp(-(((dy + 0.24 + dx * 0.1) / 0.035) ** 2));
      pc = pc.map((v) => v * (1 - sh * 0.5));
      // dawn air in front of it: more veil toward the horizon
      const veil = 0.22 + clamp01((y - (HORIZON - 120)) / 120) * 0.45;
      c = lerp3(pc, skyAt(y), veil);
      if (ring && ring.front) c = lerp3(c, rgb('#fff0d4'), clamp01(ring.k) * 0.8);
    } else if (ring && y < HORIZON) {
      c = lerp3(c, rgb('#ffe8cc'), clamp01(ring.k) * 0.7);
    }

    // the far ice on the horizon: a low line of pressure ridges, lavender, lit pink on the sun side
    const ridge = HORIZON - 3 - fbm(x * 0.03, 0, 677, 3) * 10 - (x > 760 ? (x - 760) * 0.025 : 0);
    if (y >= ridge && y < HORIZON + 2) {
      const lit = fbm(x * 0.12, y * 0.2, 679, 2) > 0.5;
      c = rgb(lit ? '#e8b4c4' : '#8c86b0');
    }
    // the cold mist over the horizon
    const mist = Math.exp(-(((y - HORIZON) / 12) ** 2)) * 0.35;
    c = lerp3(c, rgb('#ffe6e0'), mist);

    const o = (y * SKY_W + x) * 3;
    img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2];
  }

  // the sun's disk, just clear of the ice
  for (let y = SUN.y - SUN.r; y <= SUN.y + SUN.r; y++) for (let x = SUN.x - SUN.r; x <= SUN.x + SUN.r; x++) {
    if (Math.hypot(x - SUN.x, y - SUN.y) > SUN.r || y >= HORIZON - 2) continue;
    const o = (y * SKY_W + x) * 3;
    img[o] = 1; img[o + 1] = 0.98; img[o + 2] = 0.9;
  }

  // quantise to pixel-art tones with an ordered dither
  const p = new Painter(SKY_W, SKY_H);
  const data = p.data;
  const Q = 30;
  for (let y = 0; y < SKY_H; y++) for (let x = 0; x < SKY_W; x++) {
    const o = (y * SKY_W + x) * 3, d = (y * SKY_W + x) * 4;
    for (let c = 0; c < 3; c++) {
      const v = clamp01(img[o + c]) * Q;
      const k = Math.floor(v) + (bayer(x, y, v - Math.floor(v)) ? 1 : 0);
      data[d + c] = Math.min(255, Math.round(k * (255 / Q)));
    }
    data[d + 3] = 255;
  }
  p._dirty = true;
  return p;
}

// ---------------------------------------------------------------- registry

const floor = { w: 32, h: 32, wrapX: true, wrapY: true };

export const TEXTURES = {
  ep_ice: { ...floor, strength: 1.4, paint: (t) => ice(t, 701, false) },
  ep_ice_b: { ...floor, strength: 1.6, paint: (t) => ice(t, 703, true) },
  ep_glare: { ...floor, strength: 0.8, paint: (t) => glare(t, 705) },
  ep_snow: { ...floor, strength: 1.6, paint: (t) => snow(t, 707, false) },
  ep_snow_b: { ...floor, strength: 1.8, paint: (t) => snow(t, 709, true) },
  ep_sea: { ...floor, frames: 4, fps: 3, strength: 0.8, paint: (t, f) => sea(t, f, 711) },
  ep_ice_bank: { w: 32, h: 24, wrapX: true, strength: 1.6, paint: (t) => iceBank(t, 713) },
  ep_seabed: { ...floor, strength: 1.2, paint: (t) => seabed(t, 715) },
  ep_cliff: { w: 32, h: 96, wrapX: true, strength: 2.0, paint: (t) => cliff(t, 717) },
  ep_cliff_cap: { ...floor, strength: 1.4, paint: (t) => cliffCap(t, 719) },
  ep_cliff_low: { w: 32, h: 24, wrapX: true, strength: 1.6, paint: (t) => cliffLow(t, 721) },
  ep_block: { ...floor, strength: 1.8, paint: (t) => block(t, 723) },
  ep_pad: { ...floor, strength: 1.8, paint: (t) => pad(t, 725) },
  ep_seed: { w: 64, h: 64, alpha: true, strength: 0.6, paint: seedTraces },
  bd_ione_dawn: { w: SKY_W, h: SKY_H, raw: paintIoneDawn, emissiveIsMap: true },

  ep_slab: { w: 64, h: 64, strength: 1.4, paint: slab },
  ep_sign_2271: { w: 64, h: 16, strength: 1.2, paint: sign2271 },
  ep_pod_inner: { w: 32, h: 64, strength: 0.8, paint: podInner },
  ep_canvas: { w: 64, h: 48, strength: 1.0, paint: canvas },
  ep_wood: { ...floor, strength: 1.4, paint: (t) => wood(t, 727) },

  ep_halcyon_far: { w: 256, h: 64, alpha: true, strength: 0.8, paint: halcyonFar },
};
