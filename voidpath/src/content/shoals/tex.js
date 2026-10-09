// shoals: environment textures (browser, TECH_PLAN 3.12; registered through art.js). 32 texture px =
// 1 world unit, painted procedurally as colour + height (+ emissive for the glowing pixels).
//
//   The Shoals    sh_ice_floor(_b, _c), sh_snow(_b), sh_ice_deep, sh_ice_wall(_b, _cargo, _side), sh_ice_cap,
//                 sh_ice_low, sh_ice_edge, sh_ice_arch (window), sh_abyss, sh_decal_frost, sh_drift
//   The Meridian  sh_mer_wall(_mark, _lamp, _pipes, _side), sh_mer_cap, sh_mer_low, sh_mer_floor(_b),
//                 sh_mer_blackice(_b), sh_mer_grate, sh_mer_edge, sh_mer_door(_locked), sh_mer_breach
//                 (window), sh_mer_breach_l/_r(2) (a painted breach as two wall cells), sh_decal_rust,
//                 sh_decal_blackice, sh_decal_crack
//   Props         sh_cargo_side, sh_cargo_top, sh_ribbons, sh_breakers, sh_lockbox, sh_mer_pod(_open),
//                 sh_mer_panel, sh_lever_plate, sh_reactor_ice, sh_coil, sh_grain (neutral, tinted per part)
//   Backdrop      sh_bd_ring: Tethys over a ring of ice (1024x512, behind every window of both maps)

import { Tex, fbm, hash, scratch, bolt, rivet, drawText } from '../../art/tiles.js';
import { Painter, rng, mix, shade, bayer, parseColor } from '../../art/painter.js';

// ---------------------------------------------------------------- palettes

export const ICE = ['#04121f', '#082238', '#0e3554', '#154c72', '#1d6690', '#2884ad', '#3fa6cc', '#6ec8e6', '#a8e4f4', '#e2f8fd'];
export const RIME = ['#3c5874', '#5d7d9c', '#86a6c2', '#afc9de', '#d2e4f1', '#eef7fc'];
export const GLW = ['#0a3e5a', '#11698f', '#22a0d0', '#5cdcff', '#c8f6ff'];
export const RUST = ['#1a110c', '#30201a', '#4a3020', '#674128', '#86562f', '#a26c3a', '#c08a4e'];
export const GUN = ['#0b0d12', '#14171f', '#1e222c', '#2a2f3b', '#3a404e', '#4f5666', '#6b7384', '#929aa9'];
export const BLACK = ['#03050a', '#070a12', '#0c111c', '#131a28', '#1c2638', '#2a374d', '#40506a'];
export const SODIUM = ['#4a1a06', '#8a3209', '#d0560f', '#ff8a2a', '#ffb866', '#ffe2b8'];
export const PAINT = ['#0f2524', '#173634', '#21494a', '#2e605d', '#407a73'];
export const RIBBON = ['#2a0a0c', '#4e1316', '#7a2020', '#a03229', '#c24c38', '#d9745a'];

// Meridian gunmetal sits mid-grey (index ~4.9 of GUN) so the sodium pools and the cold breach light
// have something to land on; black ice stays the darkest value in the wreck.
const MER_BASE = 4.9;

const clampI = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i))];
/** Ordered-dithered ramp lookup: v is a fractional index into the ramp. */
const dpick = (ramp, v, x, y) => {
  const i = Math.floor(v);
  return clampI(ramp, i + (bayer(x, y, v - i) ? 1 : 0));
};
/** Tileable fbm over a w x h texture with `k` lattice cells across (integer, so it wraps). */
const tn = (x, y, w, h, k, seed, oct = 3) => fbm((x * k) / w, (y * k) / h, seed, oct, k, Math.max(1, Math.round((k * h) / w)));

/** Pixels where a tileable noise crosses 0.5: thin wandering cracks (seamless). */
function crackMask(w, h, k, seed, oct = 2) {
  const kv = Math.max(1, Math.round((k * h) / w));
  const f = (x, y) => fbm((((x % w) + w) % w * k) / w, (((y % h) + h) % h * kv) / h, seed, oct, k, kv) - 0.5;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = f(x, y);
    if (Math.sign(a) !== Math.sign(f(x + 1, y)) || Math.sign(a) !== Math.sign(f(x, y + 1))) out[y * w + x] = 1;
  }
  return out;
}

// ---------------------------------------------------------------- the Shoals: ice

function iceFloor(t, seed, { vein = 0, frost = 0, base = 3.5 } = {}) {
  // low value contrast inside a cell (G2 C3-6): the floor's variety comes from the variants, the drift
  // decals and the light, never from one motif repeated cell by cell
  const W = 32, H = 32;
  const r = rng(seed);
  const cr = crackMask(W, H, 2, seed + 31);
  const gate = (x, y) => tn(x, y, W, H, 2, seed + 51, 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 2, seed, 3);
    const m = tn(x, y, W, H, 4, seed + 7, 2);
    const v = base + (n - 0.5) * 0.8 + (m - 0.5) * 0.4;
    t.px(x, y, dpick(ICE, v, x, y), 0.5 + (n - 0.5) * 0.15);
    // a thin frost veil on the frosted variant: close in value, no shape of its own
    if (frost) t.tint(x, y, RIME[1], 0.05 + m * 0.06);
  }
  // long sparse fractures (the veined variant only): dark seams with a lit lip, a few of them glowing
  if (vein) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const g = gate(x, y);
    if (!cr[y * W + x] || g < 0.5) continue;
    if (g > 0.6) t.glow(x, y, GLW[2], GLW[vein > 1 ? 2 : 1]);
    else t.px(x, y, ICE[2], 0.32);
    t.px(x, (y + 1) % H, g > 0.6 ? GLW[1] : ICE[5]);
  }
  // trapped bubbles and frost specks
  for (let i = 0; i < 3; i++) {
    const bx = 2 + Math.floor(r() * 28), by = 2 + Math.floor(r() * 28);
    t.px(bx, by, ICE[6]).px(bx + 1, by, ICE[5]);
  }
  for (let i = 0; i < 2; i++) t.px(Math.floor(r() * 32), Math.floor(r() * 32), RIME[2]);
}

function snowFloor(t, seed, { base = 2.2, ridges = 0.12 } = {}) {
  const W = 32, H = 32;
  const r = rng(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    const m = tn(x, y, W, H, 2, seed + 13, 2);
    // faint wind ridges lit from the upper left (low contrast: they must not stamp cell by cell)
    const ridge = Math.sin(((x * 2 + y) / 32) * Math.PI * 2 + m * 4) * 0.5;
    const v = base + (n - 0.5) * 0.6 + ridge * ridges + (m - 0.5) * 0.4;
    t.px(x, y, dpick(RIME, v, x, y), 0.5 + ridge * 0.06 + (n - 0.5) * 0.08);
  }
  // sparkles: a few glints catch the light (faint emissive so they twinkle under bloom)
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r() * 32), y = Math.floor(r() * 32);
    t.glow(x, y, RIME[5], i % 3 ? '#3c5a70' : '#6d8ea6');
  }
}

/** Clear bridge ice over the abyss: deep blue, the glow from below showing through, a few seams. */
function deepIce(t, seed) {
  // clear bridge ice over the abyss: blue glass with a soft under-glow and a few faint fractures
  // (thin, unlit and close in value, so a span of cells reads as one slab, never a row of marks)
  const W = 32, H = 32;
  const cr = crackMask(W, H, 2, seed + 5, 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 2, seed, 3);
    const glowK = tn(x, y, W, H, 1, seed + 21, 3);
    t.px(x, y, dpick(ICE, 3.7 + (n - 0.5) * 0.7, x, y), 0.5);
    t.emit(x, y, glowK > 0.55 ? GLW[1] : GLW[0]);
    if (cr[y * W + x] && tn(x, y, W, H, 2, seed + 9, 2) > 0.62) t.px(x, y, ICE[5], 0.46);
  }
}

/**
 * Vertical ice cliff, 32 x 96 (one cell, full wall height), tiling horizontally: wavy horizontal
 * strata (so the one-cell repeat disappears), a glowing seam along one of them, sparse fractures,
 * a snow lip with icicles and a drift at the foot. `crystals` grows a glowing cluster out of it.
 */
function iceWall(t, seed, { cargo = false, side = false, crystals = false } = {}) {
  // a vertical ice cliff, 32 x 96 (one cell, full wall height), tiling horizontally: wavy strata
  // with white rime on their tops (so the one-cell repeat disappears), cyan veins and crystal
  // inclusions glowing inside (G2 C3-7), a snow lip with icicles and a drift at the foot
  const W = 32, H = 96;
  const r = rng(seed);
  const wave = (x, k) => Math.sin(((x + k * 7) / W) * Math.PI * 2) * 0.8 + (tn(x, k * 5, W, H, 1, seed + k, 2) - 0.5) * 7;
  const bandAt = (x, y) => Math.floor((y + wave(x, 3)) / 9);
  const glowBand = 3 + Math.floor(r() * 4);
  const veins = crackMask(W, H, 2, seed + 71, 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const b = bandAt(x, y);
    const tone = (hash(b, 0, seed) - 0.5) * 0.9;
    const n = tn(x, y, W, H, 4, seed, 3);
    const depth = 4.9 - (y / H) * 1.3;
    const v = depth + tone + (n - 0.5) * 0.7 + (side ? -0.5 : 0);
    t.px(x, y, dpick(ICE, v, x, y), 0.5 + tone * 0.08);
    // strata: white rime on each stratum's top, a dark seam under it; one seam glows from within
    if (bandAt(x, y + 1) !== b) {
      if (b === glowBand && !side && tn(x, y, W, H, 1, seed + 23, 2) > 0.45) t.glow(x, y, GLW[3], GLW[2]);
      else t.px(x, y, ICE[2], 0.36);
    } else if (bandAt(x, y - 1) !== b) t.px(x, y, RIME[4], 0.62);
    else if (bandAt(x, y - 2) !== b) t.px(x, y, RIME[2], 0.58);
    // cyan veins wandering through the ice
    if (!side && veins[y * W + x] && y > 12 && y < 86 && tn(x, y, W, H, 2, seed + 77, 2) > 0.5) t.glow(x, y, GLW[2], GLW[1]);
    // subsurface glow pooling deep in the ice
    const g = tn(x, y, W, H, 2, seed + 61, 3);
    if (!side && g > 0.66 && y > 14 && y < 80 && bayer(x, y, (g - 0.66) * 2.4)) t.glow(x, y, ICE[6], GLW[0]);
  }
  // crystal inclusions: small faceted grains frozen in the ice, glowing
  if (!side) for (let i = 0; i < 3; i++) {
    const cx = 4 + Math.floor(r() * 24), cy = 18 + Math.floor(r() * 58), s = 1 + Math.floor(r() * 2);
    for (let dy = -s - 1; dy <= s + 1; dy++) for (let dx = -s; dx <= s; dx++) {
      if (Math.abs(dx) / (s + 0.5) + Math.abs(dy) / (s + 1.5) > 1) continue;
      t.glow(cx + dx, cy + dy, dx < 0 ? GLW[4] : GLW[3], dx < 0 ? GLW[3] : GLW[2]);
    }
  }
  // a few short vertical fractures
  for (let i = 0; i < 2; i++) {
    const x0 = 4 + Math.floor(r() * 24), y0 = 16 + Math.floor(r() * 50), len = 6 + Math.floor(r() * 12);
    for (let k = 0; k < len; k++) t.px(x0 + Math.round(Math.sin(k * 0.7) * 0.6), y0 + k, ICE[2], 0.3).px(x0 + 1, y0 + k, ICE[6]);
  }
  if (crystals) iceCluster(t, r);
  if (cargo) frozenCrate(t, r);
  // snow crust along the top, icicles hanging from it, a drift at the foot
  for (let x = 0; x < W; x++) {
    const lip = 6 + Math.round((tn(x, 0, W, 8, 4, seed + 3, 2) - 0.5) * 6);
    for (let y = 0; y < lip; y++) t.px(x, y, dpick(RIME, 4.0 - y * 0.3, x, y), 0.9);
    t.px(x, lip, RIME[1], 0.6);
    if (hash(x, seed, 2) < 0.3) {
      const len = 3 + Math.floor(hash(x, seed, 3) * 7);
      for (let k = 1; k <= len; k++) t.px(x, lip + k, k === len ? ICE[9] : ICE[k < 2 ? 6 : 8], 0.75);
    }
    const drift = 88 + Math.round((tn(x, 0, W, 8, 4, seed + 11, 2) - 0.5) * 6);
    for (let y = drift; y < H; y++) t.px(x, y, dpick(RIME, 3.2 - (y - drift) * 0.2, x, y), 0.6);
  }
}

/** A cluster of glowing crystals grown out of the ice face (lower half). */
function iceCluster(t, r) {
  const cx = 10 + r() * 12, base = 84;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.32 + (r() - 0.5) * 0.2;
    const len = 14 + r() * 18, w = 2 + r() * 2;
    for (let k = 0; k < len; k++) {
      const x = cx + Math.cos(a) * k, y = base + Math.sin(a) * k;
      const hw = w * (1 - k / len) + 0.4;
      for (let s = -Math.ceil(hw); s <= Math.ceil(hw); s++) {
        const px = Math.round(x + s), py = Math.round(y);
        if (Math.abs(s) > hw) continue;
        const lit = s < 0;
        t.glow(px, py, lit ? GLW[3] : GLW[2], lit ? GLW[2] : GLW[1]);
        t.ht(px, py, 0.8);
      }
      t.glow(Math.round(x), Math.round(y), GLW[4], GLW[3]);
    }
  }
}

/** A Meridian cargo crate frozen inside the ice, seen through it (tinted and fractured). */
function frozenCrate(t, r) {
  const x0 = 4, y0 = 34, w = 24, h = 30;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1;
    const rib = (x - x0) % 6 === 0;
    let c = edge ? RUST[2] : rib ? RUST[3] : RUST[4];
    if ((y - y0) > 8 && (y - y0) < 13 && !edge) c = PAINT[3];          // faded Meridian band
    // the ice in front tints and lifts it
    t.px(x, y, mix(c, ICE[5], 0.42), 0.55);
  }
  drawText('M-14', x0 + 4, y0 + 15, (x, y) => t.px(x, y, mix('#d9c7a0', ICE[6], 0.5)));
  for (let i = 0; i < 6; i++) t.px(x0 + 2 + r() * (w - 4), y0 + 2 + r() * (h - 4), ICE[8]);
}

function iceCap(t, seed) {
  snowFloor(t, seed, { base: 2.0, ridges: 0.08 });
}

function iceLow(t, seed) {
  const W = 32, H = 24;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const top = 4 + Math.round((tn(x, 0, W, 8, 4, seed + 3, 2) - 0.5) * 4);
    if (y < top) { t.px(x, y, dpick(RIME, 3.2 - y * 0.35, x, y), 0.8); continue; }
    const wv = Math.sin((x / W) * Math.PI * 4) * 1.2;
    const b = Math.floor((y + wv) / 6);
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(ICE, 3.3 + (hash(b, 1, seed) - 0.5) * 1.1 + (n - 0.5) * 0.8 - (y - top) * 0.05, x, y), 0.55);
    if (Math.floor((y + 1 + wv) / 6) !== b) t.px(x, y, ICE[1], 0.4);
  }
}

/** Crevasse wall: rime lip, then glowing blue ice falling away into the dark. Tiles both ways. */
function iceEdge(t, seed) {
  // a frosted rim, read from the top: packed rime, a crust of frost crystals, then clear blue ice
  // going down (a 0.35-unit slab edge shows its top 11 rows; deeper faces show the rest)
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    const streak = tn(x, 0, W, 8, 4, seed + 5, 2);
    const v = 4.6 + (n - 0.5) * 0.8 + (streak - 0.5) * 1.0 - y * 0.06;
    t.px(x, y, dpick(ICE, v, x, y), 0.5);
  }
  for (let x = 0; x < W; x++) {
    const lip = 3 + Math.round((tn(x, 0, W, 8, 4, seed + 7, 2) - 0.5) * 3);
    for (let y = 0; y < lip; y++) t.px(x, y, RIME[5 - Math.min(2, y)], 0.9);
    t.px(x, lip, RIME[2], 0.7);
    if (hash(x, seed, 4) < 0.35) t.glow(x, lip + 1, GLW[3], GLW[2]);
  }
}

/** Ice arch window, 64 x 96, transparent through the opening. */
function iceArch(t, seed) {
  const W = 64, H = 96;
  const cx = 32, top = 16, bottom = 92, hw = 21;
  const inside = (x, y) => {
    if (y > bottom || y < top) return false;
    const dy = y - (top + hw);
    const half = dy < 0 ? Math.sqrt(Math.max(0, hw * hw - dy * dy)) : hw;
    // a ragged rim
    return Math.abs(x + 0.5 - cx) < half - 1 - hash(x, y, seed) * 1.6;
  };
  const wall = new Tex(32, 96, { wrapX: true });
  iceWall(wall, seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (inside(x, y)) continue;
    t.put(x, y, wall.get(x % 32, y), wall.hAt(x % 32, y));
    if (wall.e) {
      const e = wall.e.get(x % 32, y);
      if (e[0] + e[1] + e[2] > 0) t.emit(x, y, e);
    }
  }
  // glowing rim and a little hanging ice inside the arch
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (inside(x, y)) continue;
    if (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1)) t.glow(x, y, GLW[3], GLW[2]);
    else if (inside(x + 2, y) || inside(x - 2, y) || inside(x, y + 2)) t.px(x, y, ICE[8]);
  }
  for (let x = cx - hw + 3; x < cx + hw - 3; x += 3) {
    if (hash(x, seed, 9) < 0.5) continue;
    let y0 = top;
    while (y0 < bottom && inside(x, y0)) y0--;
    for (let k = 1; k < 2 + hash(x, seed, 4) * 6; k++) t.put(x, y0 + k, k > 3 ? ICE[9] : ICE[7]);
  }
}

/** The glow at the bottom of the crevasses (a floor plane far below the bridges). */
function abyss(t, seed) {
  // the glow far below the crevasses: drifting blue mist with brighter seams of light in the ice
  // under it (no point glints: it must not read as a starfield)
  const W = 64, H = 64;
  const cr = crackMask(W, H, 3, seed + 3, 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 3, seed, 4);
    const v = 1.4 + n * 3.0;
    const c = dpick(ICE, v, x, y);
    t.glow(x, y, c, v > 2.6 ? dpick(GLW, (v - 2.6) * 1.2, x, y) : '#031220');
    if (cr[y * W + x] && n > 0.45) t.glow(x, y, GLW[2], GLW[2]);
  }
}

/** A snow drift, 64 x 64 with soft alpha: wind-carved ridges lit from the upper left (world-space decal). */
function driftDecal(t, seed) {
  const W = 64, H = 64;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - 31.5) / 30, dy = (y - 31.5) / 22;
    const n = fbm(x * 0.07, y * 0.07, seed, 3);
    const a = (1 - Math.hypot(dx, dy)) * 1.1 + (n - 0.5) * 0.9;
    if (a <= 0.02) continue;
    const ridge = Math.sin((x * 0.7 + y * 0.35) * 0.32 + n * 5) * 0.5 + 0.5;
    const v = 1.8 + ridge * 1.2 + (n - 0.5) * 0.6;
    // translucent and close in value to the ice: snow dusting the floor, never a white sheet on it
    const alpha = Math.min(0.6, a * 0.9);
    const c = dpick(RIME, v, x, y);
    t.px(x, y, c + Math.round(alpha * 255).toString(16).padStart(2, '0'), 0.5 + ridge * 0.25);
  }
}

function frostDecal(t, seed) {
  const r = rng(seed);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const d = Math.hypot(x - 15.5, y - 15.5) / 15;
    const n = fbm(x * 0.2, y * 0.2, seed, 3);
    const a = (1 - d) * 1.6 + (n - 0.5) * 1.2;
    if (a > 0.55) t.px(x, y, RIME[a > 1 ? 5 : 4]);
    else if (a > 0.25 && bayer(x, y, a)) t.px(x, y, RIME[3] + '99');
  }
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2;
    for (let k = 0; k < 6; k++) t.px(16 + Math.cos(a) * (6 + k), 16 + Math.sin(a) * (6 + k), RIME[5] + 'cc');
  }
}

// ---------------------------------------------------------------- the Meridian: rust and black ice

function merWallBase(t, seed, { side = false, strip = false } = {}) {
  const W = 32, H = 96;
  const r = rng(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(GUN, MER_BASE - (side ? 0.5 : 0) + (n - 0.5) * 1.4, x, y), 0.55);
  }
  // top trim, bulkhead ribs, a faded Meridian band, the kick plate
  for (let x = 0; x < W; x++) {
    [GUN[7], GUN[6], GUN[5], GUN[3], GUN[2]].forEach((c, i) => t.px(x, i, c, 0.85));
    t.px(x, 6, GUN[1], 0.3);
    for (let y = 80; y < H; y++) t.px(x, y, dpick(GUN, 3.7 - (y - 80) * 0.05, x, y), 0.7);
    t.px(x, 80, GUN[6], 0.85);
  }
  for (const rx of [0, 31]) for (let y = 7; y < 80; y++) t.px(rx, y, rx ? GUN[2] : GUN[6], rx ? 0.3 : 0.75);
  if (!side) {
    for (let y = 40; y < 46; y++) for (let x = 1; x < 31; x++) {
      const worn = tn(x, y, W, H, 8, seed + 4, 2);
      if (worn > 0.38) t.px(x, y, y === 40 ? PAINT[4] : dpick(PAINT, 3.0 + (worn - 0.5) * 2, x, y), 0.6);
    }
    for (let y = 9; y < 38; y += 7) for (let x = 2; x < 30; x++) t.px(x, y, GUN[3], 0.42).px(x, y + 1, GUN[6]);
  }
  for (const [bx, by] of [[3, 9], [27, 9], [3, 74], [27, 74]]) bolt(t, bx, by, GUN, 7);
  // rust: patches, and streaks bleeding down from the bolts and the band
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed + 21, 3);
    if (n > 0.64) t.px(x, y, dpick(RUST, 2.6 + (n - 0.64) * 6, x, y), 0.52);
  }
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * 30) + 1, y0 = 8 + Math.floor(r() * 50), len = 8 + Math.floor(r() * 26);
    for (let k = 0; k < len; k++) if (r() < 0.85) t.tint(x, y0 + k, RUST[4], 0.5 - k / len * 0.4);
  }
  // black ice climbing the foot of the wall, frost on the trim
  for (let x = 0; x < W; x++) {
    const top = 80 + Math.round((tn(x, 0, W, 8, 4, seed + 9, 2) - 0.5) * 12);
    for (let y = top; y < H; y++) {
      const k = (y - top) / (H - top);
      t.px(x, y, dpick(BLACK, 3.8 + k * 1.2 + (hash(x, y, seed) - 0.5), x, y), 0.6);
      if (hash(x, y, seed + 1) < 0.05) t.px(x, y, RIME[2]);
    }
    t.px(x, top, RIME[2], 0.62);
    if (hash(x, seed, 5) < 0.4) t.px(x, 5, RIME[4]).px(x, 6, RIME[2]);
  }
  // emergency strip along the kick plate: amber cells that still glow on the dead bus
  if (strip) for (let x = 0; x < W; x++) {
    t.px(x, 85, GUN[6], 0.75).px(x, 88, GUN[1], 0.4);
    if (x % 8 < 5) t.glow(x, 86, SODIUM[4], SODIUM[2]).glow(x, 87, SODIUM[3], SODIUM[1]);
    else t.px(x, 86, GUN[1], 0.4).px(x, 87, GUN[1], 0.4);
  }
  return r;
}

function merWall(t, seed) {
  merWallBase(t, seed);
}

/** The wall with the ship's mark stencilled on its band: placed sparingly, so it never repeats in a row. */
function merWallMark(t, seed) {
  merWallBase(t, seed);
  stencil(t, 'MER', 8, 39, '#d8c8a0');
  stencil(t, '3', 14, 50, '#b8a882');
}

function stencil(t, text, x, y, c) {
  drawText(text, x, y, (px, py) => { if (hash(px, py, 77) > 0.25) t.px(px, py, c + 'b0'); });
}

function merWallLamp(t, seed) {
  merWallBase(t, seed, { strip: true });
  // emergency lamp: a caged sodium bulb over a hazard plate
  const cx = 16, cy = 22;
  for (let y = cy - 9; y <= cy + 9; y++) for (let x = cx - 8; x <= cx + 8; x++) t.px(x, y, GUN[2], 0.4);
  for (let y = cy - 7; y <= cy + 7; y++) for (let x = cx - 6; x <= cx + 6; x++) {
    const d = Math.hypot((x - cx) / 6, (y - cy) / 7);
    if (d > 1) continue;
    const k = 1 - d;
    t.glow(x, y, dpick(SODIUM, 2.4 + k * 3.4, x, y), dpick(SODIUM, 2 + k * 3.6, x, y));
    t.ht(x, y, 0.72);
  }
  for (let x = cx - 7; x <= cx + 7; x += 3) t.vline(x, cy - 7, cy + 7, GUN[6], 0.85);
  t.hline(cx - 7, cx + 7, cy - 8, GUN[7], 0.85).hline(cx - 7, cx + 7, cy + 8, GUN[4], 0.8);
  stencil(t, 'EMRG', 8, 34, '#d8c08a');
}

function merWallPipes(t, seed) {
  const r = merWallBase(t, seed);
  for (const [px, pr] of [[6, 3], [14, 2], [24, 4]]) {
    for (let y = 7; y < 84; y++) for (let x = px - pr; x <= px + pr; x++) {
      const s = (x - px) / (pr + 0.5);
      t.px(x, y, dpick(GUN, 4.5 - s * 2.2 + (y % 19 === 0 ? 1 : 0), x, y), 0.8 - Math.abs(s) * 0.2);
    }
    // frost sheathing the pipes and icicles off the joints
    for (let y = 7; y < 84; y++) if (hash(px, y, seed) < 0.45) t.px(px - pr, y, RIME[2]).px(px - pr + 1, y, RIME[3]);
    for (let j = 26; j < 84; j += 19) for (let k = 1; k < 4 + r() * 5; k++) t.px(px + pr, j + k, k > 3 ? ICE[9] : ICE[7]);
  }
}

function merCap(t, seed) {
  // plain capped steel under a faint skin of rime, close in value to the steel: no motif that
  // stamps cell after cell along a wall top (G2 C3-11)
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    const m = tn(x, y, W, H, 1, seed + 7, 3);
    t.px(x, y, dpick(GUN, 5.2 + (n - 0.5) * 0.5, x, y), 0.6);
    if (m > 0.5) t.tint(x, y, RIME[2], 0.14 + (m - 0.5) * 0.5);
  }
  for (let x = 0; x < W; x++) t.px(x, 0, GUN[5], 0.7).px(0, x, GUN[5], 0.7);
}

function merLow(t, seed) {
  const W = 32, H = 24;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(GUN, 4.1 + (n - 0.5) * 1.2 - y * 0.02, x, y), 0.55);
    if (tn(x, y, W, H, 4, seed + 3, 3) > 0.64) t.px(x, y, RUST[4], 0.5);
  }
  for (let x = 0; x < W; x++) {
    t.px(x, 0, GUN[7], 0.8).px(x, 1, GUN[6], 0.75).px(x, 2, RIME[3], 0.7);
    // the emergency strip runs along the low walls too, so the wreck's floor plan reads in the dark
    if (x % 8 < 5) t.glow(x, 18, SODIUM[4], SODIUM[2]).glow(x, 19, SODIUM[3], SODIUM[1]);
  }
}

function merFloor(t, seed, worn = false) {
  const W = 32, H = 32;
  const r = rng(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    // diamond tread
    const tread = ((x + (y >> 2) * 2) % 4 === 0 && y % 4 === 1);
    t.px(x, y, dpick(GUN, MER_BASE + (n - 0.5) * 1.2 + (tread ? 0.9 : 0), x, y), tread ? 0.62 : 0.55);
  }
  // plate seams with frost packed in
  for (let i = 0; i < 32; i++) {
    t.px(i, 0, GUN[2], 0.1).px(0, i, GUN[2], 0.1);
    t.px(i, 1, hash(i, 1, seed) < 0.5 ? RIME[2] : GUN[6]).px(1, i, GUN[6]);
  }
  for (const [bx, by] of [[3, 3], [27, 3], [3, 27], [27, 27]]) rivet(t, bx, by, GUN, 7);
  // rust blooms and holes eaten through
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed + 15, 3);
    if (n > (worn ? 0.6 : 0.66)) t.px(x, y, dpick(RUST, 2.6 + (n - 0.6) * 6, x, y), 0.5);
    if (worn && n > 0.78) t.px(x, y, BLACK[2], 0.15);
  }
  // black ice glazing the low spots: a faint darkening, not a shape that stamps plate after plate
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 2, seed + 33, 2);
    if (n < 0.3) t.tint(x, y, BLACK[5], 0.25 + (0.3 - n));
  }
  for (let i = 0; i < 3; i++) scratch(t, r, r() * 28, r() * 28, 4 + r() * 6, 1, (r() - 0.5) * 0.6, 0.08);
}

/** Black ice over the deck: dark blue-black glass, a polish streak, frost in sparse cracks, sodium glints. */
function blackIce(t, seed, alt = false) {
  const W = 32, H = 32;
  const r = rng(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    const k = ((x + y) % 32 + 32) % 32;
    const sheen = Math.max(0, 1 - Math.abs(k - (alt ? 22 : 12)) / 5);
    t.px(x, y, dpick(BLACK, 3.6 + (n - 0.5) * 1.2 + sheen * 1.4, x, y), 0.5);
    if (sheen > 0.75 && bayer(x, y, 0.4)) t.px(x, y, BLACK[6]);
  }
  for (let i = 0; i < 32; i++) { t.px(i, 0, BLACK[4]).px(0, i, BLACK[4]); }
  // white frost along the cracks, sodium glints caught in the glass
  const cr = crackMask(W, H, 2, seed + 41);
  for (let i = 0; i < W * H; i++) if (cr[i] && tn(i % W, (i / W) | 0, W, H, 2, seed + 44, 2) > 0.62) t.tint(i % W, (i / W) | 0, RIME[2], 0.45);
  for (let i = 0; i < 2; i++) t.glow(Math.floor(r() * 32), Math.floor(r() * 32), SODIUM[3], '#2a1004');
}

function merGrate(t, seed) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const slat = y % 4;
    const n = tn(x, y, W, H, 4, seed, 2);
    if (slat === 0) t.px(x, y, dpick(GUN, 6 + (n - 0.5), x, y), 0.62);
    else if (slat === 1) t.px(x, y, dpick(GUN, 4.2, x, y), 0.58);
    else {
      // the void under the deck, warm where the reactor's heat still leaks up
      const heat = tn(x, y, W, H, 2, seed + 7, 2);
      const k = (heat - 0.45) * 5 - (slat === 2 ? 0.6 : 0);
      if (k > 0.4) t.glow(x, y, dpick(SODIUM, k, x, y), dpick(SODIUM, k - 0.6, x, y));
      else t.px(x, y, '#0c0d12', 0.1);
      t.ht(x, y, 0.05);
    }
    if (tn(x, y, W, H, 4, seed + 5, 3) > 0.66 && slat < 2) t.px(x, y, RUST[4], 0.6);
  }
  for (let i = 0; i < 32; i++) t.px(i, 0, GUN[1], 0.1).px(0, i, GUN[2], 0.2);
}

function merEdge(t, seed) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(y < 4 ? GUN : RUST, (y < 4 ? 5 : 2.4) + (n - 0.5) * 1.6 - y * 0.03, x, y), 0.55);
    if (y > 4 && tn(x, y, W, H, 8, seed + 3, 2) > 0.62) t.px(x, y, BLACK[2], 0.4);
  }
}

function merDoor(t, seed, locked) {
  const W = 32, H = 96;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(GUN, 4.6 + (n - 0.5) * 1.2, x, y), 0.6);
    if (tn(x, y, W, H, 4, seed + 8, 3) > 0.6) t.px(x, y, RUST[4], 0.55);
  }
  // reinforcing ribs, a porthole with black ice behind it, a status lamp
  for (const y of [14, 46, 78]) for (let x = 1; x < 31; x++) t.px(x, y, GUN[6], 0.8).px(x, y + 1, GUN[2], 0.5);
  for (let x = 0; x < W; x++) t.px(x, 0, GUN[6], 0.9).px(x, H - 1, GUN[1], 0.4);
  for (let y = 0; y < H; y++) t.px(0, y, GUN[6], 0.8).px(31, y, GUN[1], 0.4);
  for (let y = 22; y < 40; y++) for (let x = 8; x < 24; x++) {
    const d = Math.hypot((x - 15.5) / 7.5, (y - 30.5) / 8.5);
    if (d > 1) continue;
    t.px(x, y, d > 0.82 ? GUN[6] : dpick(BLACK, 2 + (1 - d) * 2, x, y), d > 0.82 ? 0.75 : 0.35);
  }
  const lamp = locked ? ['#5c1220', '#ff3b2e'] : ['#124430', '#4dff9c'];
  for (const [x, y] of [[15, 55], [16, 55], [15, 56], [16, 56]]) t.glow(x, y, lamp[1], lamp[1]);
  t.px(14, 55, lamp[0]).px(17, 56, lamp[0]);
  stencil(t, locked ? 'SEALED' : 'M-3', locked ? 4 : 10, 62, locked ? '#d8a070' : '#9c8c6a');
  for (let x = 0; x < W; x++) for (let y = 86; y < H; y++) if (hash(x, y, seed) < 0.6 - (H - y) * 0.05) t.px(x, y, BLACK[3]);
}

/** The jagged outline of a hull breach in 64 x 96 texel space. */
const breachHole = (seed) => (x, y) => {
  const dx = (x + 0.5 - 32) / 26, dy = (y + 0.5 - 50) / 36;
  const ang = Math.atan2(dy, dx);
  const jag = 0.8 + Math.sin(ang * 7 + seed) * 0.08 + hash(Math.round(ang * 9), 0, seed) * 0.14;
  return Math.hypot(dx, dy) < jag;
};

/**
 * Torn hull opening, 64 x 96, transparent through the breach. With `half` (0 left, 1 right) it is one
 * 32 x 96 wall cell of the opening with Tethys painted into the hole, self-lit: a breach that needs
 * no space box behind its wall (the spine's breaches have rooms behind them).
 */
function merBreach(t, seed, { half = -1 } = {}) {
  const W = half < 0 ? 64 : 32, H = 96, ox = Math.max(0, half) * 32;
  const r = rng(seed);
  const hole = breachHole(seed);
  const wall = new Tex(32, 96, { wrapX: true });
  merWallBase(wall, seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x + ox;
    if (hole(gx, y)) {
      if (half >= 0) breachView(t, x, y, gx, seed);
      continue;
    }
    // (colours as arrays: painter.parseColor reads hex or [r, g, b, a], not rgb() strings)
    t.put(x, y, wall.get(x % 32, y), wall.hAt(x % 32, y));
    // torn metal curls outward around the breach: bright bent edges, rust, frost
    const near = hole(gx + 2, y) || hole(gx - 2, y) || hole(gx, y + 2) || hole(gx, y - 2);
    if (near) t.px(x, y, hole(gx + 1, y) || hole(gx - 1, y) || hole(gx, y + 1) ? GUN[7] : RUST[4], 0.8);
  }
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const x = Math.round(32 + Math.cos(a) * 26 * 0.86), y = Math.round(50 + Math.sin(a) * 36 * 0.86);
    if (!hole(x, y) && x >= ox && x < ox + W) t.px(x - ox, y, RIME[4]);
  }
}

const TETHYS = ['#5a3412', '#8a5420', '#c0843a', '#e8c088', '#f4dcb0', '#d49a52', '#a86a2c', '#e0b070'];

/**
 * One texel of the view through a painted breach: deep space, sparse stars, a limb of banded Tethys
 * and the ring. Self-lit like a window's backdrop: a dark albedo and the view in the emissive layer
 * (the wall material multiplies emissive by about 2.3).
 */
function breachView(t, x, y, gx, seed) {
  const n = fbm(gx / 18, y / 18, seed, 3);
  let c = parseColor(dpick(BLACK, 1.4 + n * 2.0 + y * 0.01, x, y));
  if (hash(gx, y, seed + 3) < 0.014) c = parseColor(hash(gx, y, seed + 4) < 0.3 ? RIME[5] : RIME[3]);
  // Tethys rises from a lower corner, lit from the upper left
  const px = seed % 2 ? 16 : 48, pr = 30, dx = (gx - px) / pr, dy = (y - 84) / pr;
  const dd = dx * dx + dy * dy;
  if (dd < 1) {
    const lat = dy + (fbm(gx / 14, y / 5, seed + 9, 2) - 0.5) * 0.12;
    const band = parseColor(TETHYS[Math.abs(Math.floor(lat * 7 + 8)) % TETHYS.length]);
    const k = Math.min(1.1, Math.max(0.15, -dx * 0.5 - dy * 0.5 + Math.sqrt(1 - dd) * 0.6));
    c = band.map((v) => Math.min(255, v * k));
  }
  // the ring crosses in front, ice-bright
  const ring = Math.abs((y - 64) - (gx - 32) * (seed % 2 ? 0.3 : -0.3));
  if (ring < 1.8) c = parseColor(ring < 0.8 ? RIME[4] : RIME[2]);
  t.px(x, y, BLACK[1]).emit(x, y, [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55, 255]);
}

function rustDecal(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const d = Math.hypot(x - 15.5, y - 15.5) / 15;
    const n = fbm(x * 0.18, y * 0.18, seed, 3);
    const a = (1 - d) * 1.5 + (n - 0.5) * 1.4;
    if (a > 0.6) t.px(x, y, dpick(RUST, 2 + a * 1.5, x, y));
    else if (a > 0.3 && bayer(x, y, a)) t.px(x, y, RUST[2] + 'aa');
  }
}

function blackIceDecal(t, seed) {
  // a soft-edged sheet of black ice, 64 x 64: lifted dark glass (at least gunmetal value), a polish
  // streak, white frost in its cracks, a ragged dithered edge (G2 C3-5: never a square hole)
  const W = 64, H = 64;
  const cr = crackMask(W, H, 3, seed + 5, 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 31.5) / 31, (y - 31.5) / 27);
    const n = fbm(x * 0.08, y * 0.08, seed, 3);
    const a = (1 - d) * 2.2 + (n - 0.5) * 1.3;
    if (a < 0.08 || (a < 0.5 && !bayer(x, y, a * 2))) continue;
    const k = ((x + y) % 64 + 64) % 64;
    const sheen = Math.max(0, 1 - Math.abs(k - 40) / 7);
    let c = dpick(BLACK, 4.6 + (n - 0.5) * 1.2 + sheen * 1.2, x, y);
    if (cr[y * W + x] && a > 0.6) c = RIME[4];
    t.px(x, y, c, 0.45 + sheen * 0.1);
  }
}

/** Fresh fractures in the deck where the Maw broke through: violet light in the cracks, frost on the lips. */
function crackDecal(t, seed) {
  const W = 64, H = 64;
  const r = rng(seed);
  for (let k = 0; k < 7; k++) {
    let x = 32, y = 32, a = (k / 7) * Math.PI * 2 + r() * 0.5;
    const len = 14 + r() * 16;
    for (let i = 0; i < len; i++) {
      a += (r() - 0.5) * 0.5;
      x += Math.cos(a);
      y += Math.sin(a);
      const fade = 1 - i / len;
      t.glow(Math.round(x), Math.round(y), fade > 0.4 ? '#cf9dff' : '#8a5cff', fade > 0.4 ? '#a35cff' : '#5a2a9a');
      t.px(Math.round(x + Math.sin(a)), Math.round(y - Math.cos(a)), RIME[4] + 'd0');
      if (i > 6 && r() < 0.12) {
        const bx = x + Math.cos(a + 1.2) * 3, by = y + Math.sin(a + 1.2) * 3;
        t.line(Math.round(x), Math.round(y), Math.round(bx), Math.round(by), '#6a3ab0');
      }
    }
  }
  for (let y = 26; y < 38; y++) for (let x = 26; x < 38; x++) if (Math.hypot(x - 31.5, y - 31.5) < 5) t.glow(x, y, '#b98cff', '#7a3ad0');
}

// ---------------------------------------------------------------- props

/** Neutral grain for the small machined and frozen parts: props multiply it by their own colour. */
function grain(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 4, seed, 3);
    const s = tn(x, y, 32, 32, 16, seed + 5, 1);
    const pit = hash(x, y, seed) < 0.035;
    const v = Math.max(0.6, Math.min(1, 0.88 + (n - 0.5) * 0.34 + (s - 0.5) * 0.12 - (pit ? 0.2 : 0)));
    const g = Math.round(v * 255).toString(16).padStart(2, '0');
    t.px(x, y, `#${g}${g}${g}`, 0.5 + (n - 0.5) * 0.3 - (pit ? 0.15 : 0));
  }
}

function cargoSide(t, seed, top = false) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    const rib = !top && x % 8 === 0;
    t.px(x, y, dpick(RUST, (rib ? 3.2 : 4.2) + (n - 0.5) * 1.6, x, y), rib ? 0.45 : 0.6);
    if (n > 0.66) t.px(x, y, RUST[1], 0.5);
  }
  for (let i = 0; i < 32; i++) t.px(i, 0, RUST[6], 0.8).px(0, i, RUST[6], 0.8).px(i, 31, RUST[1], 0.4).px(31, i, RUST[1], 0.4);
  if (!top) {
    for (let y = 11; y < 16; y++) for (let x = 1; x < 31; x++) t.px(x, y, PAINT[y === 11 ? 4 : 2], 0.6);
    stencil(t, 'MER', 9, 19, '#e8d4a8');
  }
  for (let x = 0; x < W; x++) for (let y = 0; y < 4; y++) if (hash(x, y, seed) < 0.7 - y * 0.15) t.px(x, y, RIME[4 - y]);
}

function ribbons(t, seed) {
  const W = 64, H = 64;
  const r = rng(seed);
  // a rail across the top, ribbons knotted along it at different lengths, faded by eighty years
  const faded = ['#8a3a30', '#a0603a', '#7a6a48', '#3a6a68', '#9a8a70', '#6a3040'];
  for (let x = 0; x < W; x++) t.px(x, 3, GUN[5]).px(x, 4, GUN[3]);
  for (let i = 0; i < 14; i++) {
    const x = 2 + Math.floor((i + r() * 0.6) * (W - 4) / 14), len = 16 + Math.floor(r() * 38);
    const col = faded[Math.floor(r() * faded.length)];
    let sway = 0;
    for (let y = 5; y < 5 + len && y < H; y++) {
      sway += (hash(x, y, seed) - 0.5) * 0.4;
      const px = Math.round(x + Math.sin(y * 0.22 + i) * 0.7 + sway * 0.3);
      const k = (y - 5) / len;
      t.px(px, y, shade(col, -0.05 - k * 0.2)).px(px + 1, y, shade(col, -0.22 - k * 0.2));
      if (hash(px, y, 3) < 0.12) t.px(px, y, RIME[3]);
    }
    t.px(x, 5, shade(col, 0.2)).px(x + 1, 5, col).px(x - 1, 6, col);
    // a few carry a stitched name: a pale line of stitches
    if (r() < 0.4) for (let y = 12; y < 22; y += 2) t.px(x, y, '#d8c8a8');
  }
}

function breakers(t, seed) {
  const W = 32, H = 48;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(GUN, 3.4 + (n - 0.5), x, y), 0.6);
    if (tn(x, y, W, H, 4, seed + 4, 3) > 0.64) t.px(x, y, RUST[3], 0.55);
  }
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
    const x = 3 + col * 7, y = 6 + row * 13;
    for (let j = 0; j < 9; j++) for (let i = 0; i < 5; i++) t.px(x + i, y + j, GUN[1], 0.35);
    t.rect(x + 1, y + 2, 3, 4, GUN[6], 0.8);
    t.glow(x + 2, y + 7, (row + col) % 3 ? '#ff8a2a' : '#4dff9c', (row + col) % 3 ? '#ff8a2a' : '#4dff9c');
  }
  stencil(t, 'K.D.', 9, 44, '#c8b07a');
}

function lockbox(t, seed) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(GUN, 4 + (n - 0.5) * 1.4, x, y), 0.6);
  }
  t.rect(10, 9, 12, 12, RUST[4], 0.7);
  for (let y = 11; y < 19; y++) for (let x = 12; x < 20; x++) t.glow(x, y, (x + y) % 3 ? '#3fd6d2' : '#0f6a78', (x + y) % 3 ? '#16a0a8' : '#0b4350');
  for (let x = 0; x < W; x++) t.px(x, 0, RIME[4]).px(x, 1, RIME[3]);
}

function reactorIce(t, seed, f) {
  // the frozen reactor column: glowing embers trapped under black and blue ice (animated warmth)
  const W = 64, H = 64;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    const heat = tn(x, (y + f * 4) % H, W, H, 2, seed + 11, 3);
    const ice = 2.2 + (n - 0.5) * 2;
    if (heat > 0.56) {
      const k = (heat - 0.56) * 9;
      t.glow(x, y, dpick(SODIUM, 1 + k, x, y), dpick(SODIUM, 0.6 + k, x, y));
    } else t.px(x, y, dpick(BLACK, ice + 1, x, y), 0.5);
    if (n > 0.66) t.px(x, y, dpick(ICE, 4 + (n - 0.66) * 10, x, y), 0.6);
  }
  for (let y = 0; y < H; y += 16) for (let x = 0; x < W; x++) t.px(x, y, GUN[5], 0.8).px(x, y + 1, GUN[2], 0.5);
}

function coil(t, seed, f) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - 15.5, y - 15.5);
    if (d > 15 || d < 6) continue;
    const ring = Math.abs(d - 10.5) < 1.6;
    const lattice = (Math.floor((Math.atan2(y - 15.5, x - 15.5) * 6 / Math.PI + f) * 2) % 2) === 0;
    if (ring) t.glow(x, y, GLW[3], GLW[4]);
    else if (lattice) t.glow(x, y, GLW[1], GLW[2]);
  }
}

/** A Meridian cryo pod's face, 32 x 64: a rusted frame around frosted glass (or the empty cradle). */
function merPod(t, seed, open = false) {
  const W = 32, H = 64;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 2, seed, 3);
    t.px(x, y, dpick(GUN, 3.6 + (n - 0.5) * 1.4, x, y), 0.62);
    if (tn(x, y, W, H, 2, seed + 4, 3) > 0.62) t.px(x, y, RUST[3], 0.58);
  }
  for (let x = 0; x < W; x++) t.px(x, 0, GUN[6], 0.85).px(x, H - 1, GUN[1], 0.4);
  for (let y = 0; y < H; y++) t.px(0, y, GUN[6], 0.8).px(W - 1, y, GUN[1], 0.4);
  // the window: frosted glass, or the dark hollow of an emptied cradle
  for (let y = 6; y < 54; y++) for (let x = 5; x < 27; x++) {
    const edge = y === 6 || y === 53 || x === 5 || x === 26;
    if (edge) { t.px(x, y, GUN[1], 0.3); continue; }
    const n = tn(x, y, W, H, 4, seed + 9, 3);
    if (open) {
      const body = Math.abs(x - 15.5) < (y < 18 ? 4 : 6) && y > 10 && y < 50;
      t.px(x, y, dpick(BLACK, (body ? 1.2 : 2.4) + (n - 0.5) * 1.2, x, y), 0.25);
      if (n > 0.64) t.px(x, y, dpick(RIME, 1 + (n - 0.64) * 8, x, y), 0.32);
    } else {
      const frost = n + (y - 6) / 120 + (Math.abs(x - 15.5) / 30);
      t.px(x, y, frost > 0.62 ? dpick(RIME, 2 + (frost - 0.62) * 10, x, y) : dpick(ICE, 1.6 + frost * 3, x, y), 0.36 + frost * 0.08);
    }
  }
  // status strip: dead amber on the closed pods, a sodium fault lamp on the open ones
  for (let x = 9; x < 23; x++) t.px(x, 57, x % 3 ? '#3a2008' : '#5a3010', 0.55);
  t.glow(open ? 24 : 7, 59, SODIUM[3], SODIUM[2]);
  stencil(t, open ? 'OPEN' : 'M-POD', open ? 8 : 6, 1, '#9c8c6a');
}

/** The captain's desk front, 32 x 32: two drawers with brass pulls, a nameplate. */
function merPanel(t, seed) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(PAINT, 2.2 + (n - 0.5) * 1.4, x, y), 0.6);
    if (n > 0.66) t.px(x, y, RUST[3], 0.55);
  }
  for (let x = 0; x < W; x++) t.px(x, 0, GUN[6], 0.85).px(x, 1, GUN[4], 0.7).px(x, H - 1, GUN[1], 0.4);
  for (const [y0, y1] of [[5, 15], [18, 28]]) {
    t.hline(3, 28, y0, PAINT[4], 0.7).hline(3, 28, y1, PAINT[0], 0.45).vline(3, y0, y1, PAINT[4], 0.7).vline(28, y0, y1, PAINT[0], 0.45);
    const py = (y0 + y1) >> 1;
    t.hline(13, 18, py, '#d6ad45', 0.8).hline(13, 18, py + 1, '#80601c', 0.7);
  }
  t.rect(11, 2, 10, 2, '#ad8629', 0.75);
  for (let x = 0; x < W; x++) for (let y = 28; y < H; y++) if (hash(x, y, seed) < 0.5) t.px(x, y, BLACK[3]);
}

/** The emergency bus lever's plate, 32 x 48: hazard border, a gauge, the stencil. */
function leverPlate(t, seed) {
  const W = 32, H = 48;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(GUN, 3.6 + (n - 0.5) * 1.2, x, y), 0.6);
    const border = x < 3 || x > 28 || y < 3 || y > 44;
    if (border) t.px(x, y, ((x + y) >> 2) % 2 ? '#b08a1c' : '#18161c', 0.7);
    if (n > 0.66 && !border) t.px(x, y, RUST[3], 0.55);
  }
  // a dead gauge and the lever slot
  for (let y = 7; y < 17; y++) for (let x = 6; x < 16; x++) {
    const d = Math.hypot(x - 10.5, y - 11.5);
    if (d < 4.6) t.px(x, y, d > 3.8 ? GUN[6] : '#1a1c22', d > 3.8 ? 0.75 : 0.4);
  }
  t.line(10, 12, 8, 9, SODIUM[3]);
  t.rect(18, 9, 6, 30, GUN[0], 0.3);
  stencil(t, 'BUS', 6, 22, '#d8a070');
  stencil(t, 'EMRG', 4, 32, '#c8b07a');
}

// ---------------------------------------------------------------- backdrop: Tethys over a ring of ice

function paintRingBackdrop() {
  const W = 1024, H = 512;
  const p = new Painter(W, H);
  const r = rng(907);
  const d = p.data;
  const put = (x, y, c, a = 1) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    d[i] = d[i] * (1 - a) + c[0] * a; d[i + 1] = d[i + 1] * (1 - a) + c[1] * a; d[i + 2] = d[i + 2] * (1 - a) + c[2] * a; d[i + 3] = 255;
  };
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // deep space: blue-black with a faint nebula wash
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = fbm(x / 160, y / 160, 5, 4);
    const v = 6 + n * 18 + (y / H) * 6;
    const i = (y * W + x) * 4;
    d[i] = v * 0.55; d[i + 1] = v * 0.8; d[i + 2] = v * 1.45; d[i + 3] = 255;
  }
  for (let i = 0; i < 1400; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H), b = 90 + r() * 165;
    put(x, y, [b * 0.85, b * 0.92, b], 0.9);
    if (r() < 0.06) { put(x + 1, y, [b * 0.6, b * 0.7, b * 0.8], 0.6); put(x, y + 1, [b * 0.6, b * 0.7, b * 0.8], 0.6); }
  }
  // Tethys: amber and cream bands, lit from the upper left, rim-darkened
  const PX = 690, PY = 300, PR = 210;
  const bands = ['#5a3412', '#8a5420', '#c0843a', '#e8c088', '#f4dcb0', '#d49a52', '#a86a2c', '#e0b070', '#f0d4a4', '#b8783a'].map(rgb);
  for (let y = PY - PR; y < PY + PR; y++) for (let x = PX - PR; x < PX + PR; x++) {
    const dx = (x - PX) / PR, dy = (y - PY) / PR, dd = dx * dx + dy * dy;
    if (dd > 1) continue;
    const z = Math.sqrt(1 - dd);
    const lat = dy + (fbm(x / 70, y / 20, 3, 3) - 0.5) * 0.08;
    const b = bands[Math.abs(Math.floor(lat * 9 + 9)) % bands.length];
    const light = Math.max(0.08, (-dx * 0.55 - dy * 0.45 + z * 0.75));
    const k = Math.min(1.25, light) * (0.55 + z * 0.45);
    put(x, y, [b[0] * k, b[1] * k, b[2] * k]);
  }
  // the rings: a wide ellipse band, ice-bright where it crosses in front of the planet
  const RA = 470, RB = 92, tilt = -0.12;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - PX, dy = y - PY;
    const u = dx * Math.cos(tilt) + dy * Math.sin(tilt), v = -dx * Math.sin(tilt) + dy * Math.cos(tilt);
    const e = Math.hypot(u / RA, v / RB);
    if (e < 0.62 || e > 1.06) continue;
    const behind = v < 0 && Math.hypot(dx / PR, dy / PR) < 1;
    if (behind) continue;
    const lane = Math.sin(e * 90) * 0.5 + 0.5;
    const a = (e < 0.7 ? (e - 0.62) / 0.08 : e > 0.98 ? (1.06 - e) / 0.08 : 1) * (0.25 + lane * 0.45);
    put(x, y, [170 + lane * 60, 200 + lane * 40, 230], a * 0.8);
  }
  // ring debris in the foreground: chunks of ice, lit on the planet side
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * W), y = Math.floor(300 + (r() - 0.3) * 260), s = 1 + Math.floor(r() * r() * 9);
    for (let j = -s; j <= s; j++) for (let k = -s; k <= s; k++) {
      if (Math.abs(j) + Math.abs(k) * 1.3 > s * (0.9 + hash(j, k, i) * 0.3)) continue;
      const lit = (j + k) > 0 ? 0.55 : 1;
      put(x + j, y + k, [120 * lit + 40, 175 * lit + 40, 220 * lit + 30], 0.95);
    }
  }
  p._dirty = true;
  return p;
}

// ---------------------------------------------------------------- registry

const floor = { w: 32, h: 32, wrapX: true, wrapY: true };
const wall = { w: 32, h: 96, wrapX: true };

export const TEXTURES = {
  sh_ice_floor: { ...floor, strength: 1.6, paint: (t) => iceFloor(t, 11) },
  sh_ice_floor_b: { ...floor, strength: 1.6, paint: (t) => iceFloor(t, 23, { vein: 1 }) },
  sh_ice_floor_c: { ...floor, strength: 1.6, paint: (t) => iceFloor(t, 37, { frost: 1 }) },
  sh_snow: { ...floor, strength: 1.2, paint: (t) => snowFloor(t, 41) },
  sh_snow_b: { ...floor, strength: 1.2, paint: (t) => snowFloor(t, 53, { base: 2.4, ridges: 0.18 }) },
  sh_ice_deep: { ...floor, strength: 1.4, paint: (t) => deepIce(t, 61) },
  sh_ice_wall: { ...wall, strength: 2.2, paint: (t) => iceWall(t, 71) },
  sh_ice_wall_b: { ...wall, strength: 2.2, paint: (t) => iceWall(t, 79, { crystals: true }) },
  sh_ice_wall_cargo: { ...wall, strength: 2.2, paint: (t) => iceWall(t, 83, { cargo: true }) },
  sh_ice_wall_side: { ...wall, strength: 2.2, paint: (t) => iceWall(t, 97, { side: true }) },
  sh_ice_cap: { ...floor, strength: 1.2, paint: (t) => iceCap(t, 101) },
  sh_ice_low: { w: 32, h: 24, wrapX: true, strength: 1.6, paint: (t) => iceLow(t, 113) },
  sh_ice_edge: { ...floor, strength: 1.6, paint: (t) => iceEdge(t, 127) },
  sh_ice_arch: { w: 64, h: 96, alpha: true, strength: 2.2, paint: (t) => iceArch(t, 131) },
  sh_abyss: { w: 64, h: 64, wrapX: true, wrapY: true, strength: 0.6, paint: (t) => abyss(t, 137) },
  sh_decal_frost: { w: 32, h: 32, alpha: true, strength: 0.8, paint: (t) => frostDecal(t, 139) },
  sh_drift: { w: 64, h: 64, alpha: true, strength: 1.2, paint: (t) => driftDecal(t, 149) },
  sh_mer_wall: { ...wall, strength: 2.4, paint: (t) => merWall(t, 211) },
  sh_mer_wall_mark: { ...wall, strength: 2.4, paint: (t) => merWallMark(t, 217) },
  sh_mer_wall_lamp: { ...wall, strength: 2.4, paint: (t) => merWallLamp(t, 223) },
  sh_mer_wall_pipes: { ...wall, strength: 2.6, paint: (t) => merWallPipes(t, 227) },
  sh_mer_wall_side: { ...wall, strength: 2.4, paint: (t) => merWallBase(t, 229, { side: true }) },
  sh_mer_cap: { ...floor, strength: 1.6, paint: (t) => merCap(t, 233) },
  sh_mer_low: { w: 32, h: 24, wrapX: true, strength: 2, paint: (t) => merLow(t, 239) },
  sh_mer_floor: { ...floor, strength: 2, paint: (t) => merFloor(t, 241) },
  sh_mer_floor_b: { ...floor, strength: 2, paint: (t) => merFloor(t, 251, true) },
  sh_mer_blackice: { ...floor, strength: 0.8, paint: (t) => blackIce(t, 257) },
  sh_mer_blackice_b: { ...floor, strength: 0.8, paint: (t) => blackIce(t, 263, true) },
  sh_mer_grate: { ...floor, strength: 2.2, paint: (t) => merGrate(t, 269) },
  sh_mer_edge: { ...floor, strength: 1.8, paint: (t) => merEdge(t, 271) },
  sh_mer_door: { w: 32, h: 96, strength: 2.2, paint: (t) => merDoor(t, 277, false) },
  sh_mer_door_locked: { w: 32, h: 96, strength: 2.2, paint: (t) => merDoor(t, 277, true) },
  sh_mer_breach: { w: 64, h: 96, alpha: true, strength: 2.2, paint: (t) => merBreach(t, 281) },
  sh_mer_breach_l: { w: 32, h: 96, strength: 2.2, paint: (t) => merBreach(t, 281, { half: 0 }) },
  sh_mer_breach_r: { w: 32, h: 96, strength: 2.2, paint: (t) => merBreach(t, 281, { half: 1 }) },
  sh_mer_breach_l2: { w: 32, h: 96, strength: 2.2, paint: (t) => merBreach(t, 292, { half: 0 }) },
  sh_mer_breach_r2: { w: 32, h: 96, strength: 2.2, paint: (t) => merBreach(t, 292, { half: 1 }) },
  sh_decal_rust: { w: 32, h: 32, alpha: true, strength: 0.8, paint: (t) => rustDecal(t, 283) },
  sh_decal_blackice: { w: 64, h: 64, alpha: true, strength: 0.5, paint: (t) => blackIceDecal(t, 293) },
  sh_decal_crack: { w: 64, h: 64, alpha: true, strength: 0.8, paint: (t) => crackDecal(t, 297) },
  sh_cargo_side: { w: 32, h: 32, strength: 2, paint: (t) => cargoSide(t, 307) },
  sh_cargo_top: { w: 32, h: 32, strength: 2, paint: (t) => cargoSide(t, 311, true) },
  sh_ribbons: { w: 64, h: 64, alpha: true, strength: 1.2, paint: (t) => ribbons(t, 313) },
  sh_breakers: { w: 32, h: 48, strength: 2, paint: (t) => breakers(t, 317) },
  sh_lockbox: { w: 32, h: 32, strength: 2, paint: (t) => lockbox(t, 331) },
  sh_mer_pod: { w: 32, h: 64, strength: 2, paint: (t) => merPod(t, 353) },
  sh_mer_pod_open: { w: 32, h: 64, strength: 2, paint: (t) => merPod(t, 359, true) },
  sh_mer_panel: { w: 32, h: 32, strength: 2, paint: (t) => merPanel(t, 367) },
  sh_lever_plate: { w: 32, h: 48, strength: 2, paint: (t) => leverPlate(t, 373) },
  sh_reactor_ice: { w: 64, h: 64, frames: 4, fps: 3, wrapX: true, wrapY: true, strength: 1.2, paint: (t, f) => reactorIce(t, 337, f) },
  sh_coil: { w: 32, h: 32, frames: 4, fps: 6, alpha: true, strength: 0.6, paint: (t, f) => coil(t, 347, f) },
  sh_grain: { ...floor, strength: 0.7, paint: (t) => grain(t, 409) },
  sh_bd_ring: { w: 1024, h: 512, raw: paintRingBackdrop, emissiveIsMap: true },
};
