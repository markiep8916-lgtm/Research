// spire: environment textures (browser, TECH_PLAN 3.12; registered through art.js). 32 texture px =
// 1 world unit, painted procedurally as colour + height (+ emissive for the glowing pixels). The
// Spire is a militarised tower deck on red alert: charcoal plate steel, crimson alert bands, bone-white
// paint and padding under stark floodlights, WARDEN's gold on the command deck.
//
//   Floors  sp_deck(_b drain, _c patched), sp_hazard (door thresholds), sp_pad (Moth berth), sp_gym
//           (training rubber), sp_command (black stone), sp_core (antechamber circuitry), sp_carpet,
//           sp_quarters (linoleum), sp_tile (holding cells)
//   Walls   sp_wall, sp_wall_b (evidence lockers), sp_rack (armory), sp_cellwall (padded), sp_gymwall,
//           sp_padwall (the hall's obstacles, 1.3 high), sp_cmdwall (black glass, gold trim), sp_cap,
//           sp_low, sp_door, sp_barricade (1.05 high), sp_lockers (1.7 high)
//   Props   sp_grain (neutral, tinted per part), sp_propaganda (WARDEN's screens, 3 frames), sp_signs
//           (7 deck signs stacked, 64 x 16 each: DOCK, CHECKPOINT, BARRACKS, ARMORY, HOLDING,
//           OFFICERS, TRAINING), sp_panel (console face, 2 frames), sp_crate, sp_banner

import { fbm, hash, scratch, bolt, rivet, drawText, textWidth, clamp01 } from '../../art/tiles.js';
import { rng, bayer } from '../../art/painter.js';
import { RAMPS } from '../../art/palette.js';

// ---------------------------------------------------------------- palettes

// plate steel, a touch warm so the red alert light reads on it
export const CHAR = ['#09080b', '#121015', '#1b181e', '#252128', '#302b33', '#3d373f', '#4c454e', '#5e5660', '#766d77', '#968c95'];
export const RED = ['#1e0508', '#3a0a10', '#5e1018', '#8a1822', '#b4202c', '#dc3240', '#ff5c62', '#ff9c98'];
export const BONE = ['#4e4b52', '#6f6b72', '#928e95', '#b5b1b6', '#d4d1d4', '#ecebec', '#fbfbfa'];
export const GOLD = RAMPS.gold;
const CY = RAMPS.cyan;
const GUN = RAMPS.gunmetal;
const SLATE = ['#0d1014', '#14181e', '#1b2129', '#232b35', '#2e3843', '#3b4653', '#4c5866', '#64717f'];
const WINE = ['#160508', '#25080d', '#380d14', '#4c121b', '#621a24', '#7a242e', '#94323a'];
const TAUPE = ['#14110f', '#1e1a17', '#29241f', '#352f29', '#433b34', '#544a41', '#685c51', '#7e7062'];
const LOCK = ['#10151b', '#18202a', '#222c38', '#2d3a48', '#3b4a5a', '#4f6070', '#6a7c8c'];
const CORE = ['#070a10', '#0c1219', '#121a24', '#18232f', '#20303e', '#2b3f50', '#3a5266', '#4c6880'];

// the deck plate sits mid-dark (index ~5.3 of CHAR) so white pools and red lamps land on it
const DECK = 5.7;
const WALL = 5.0;

const clampI = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i))];
/** Ordered-dithered ramp lookup: v is a fractional index into the ramp. */
const dpick = (ramp, v, x, y) => {
  const i = Math.floor(v);
  return clampI(ramp, i + (bayer(x, y, v - i) ? 1 : 0));
};
/** Tileable fbm over a w x h texture with `k` lattice cells across (integer, so it wraps). */
const tn = (x, y, w, h, k, seed, oct = 3) => fbm((x * k) / w, (y * k) / h, seed, oct, k, Math.max(1, Math.round((k * h) / w)));

/** Stencilled paint: drawText with a few pixels skipped (worn), colour c over what is there. */
function stencil(t, text, x, y, c, seed = 77, keep = 0.78) {
  drawText(text, x, y, (px, py) => { if (hash(px, py, seed) < keep) t.px(px, py, c); });
}

/** Darkening streaks running down from (x, y0). */
function streaks(t, r, n, x0, x1, y0, y1, to, k = 0.4) {
  for (let i = 0; i < n; i++) {
    const x = x0 + Math.floor(r() * (x1 - x0)), ys = y0 + Math.floor(r() * (y1 - y0)), len = 6 + Math.floor(r() * 18);
    for (let j = 0; j < len; j++) if (r() < 0.85) t.tint(x, ys + j, to, k * (1 - j / len));
  }
}

// ---------------------------------------------------------------- floors

/** Deck plate: two plates per cell (fine tread on the north one), rivets, low-contrast scuffs. */
function deckBase(t, seed, { tread = true } = {}) {
  const W = 32, H = 32;
  const r = rng(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3), m = tn(x, y, W, H, 1, seed + 7, 2);
    const north = y < 16;
    const td = tread && north && (x + (y >> 2) * 2) % 4 === 0 && y % 4 === 2;
    const v = DECK + (n - 0.5) * 1.1 + (m - 0.5) * 0.7 + (td ? 0.8 : 0) - (north ? 0 : 0.2);
    t.px(x, y, dpick(CHAR, v, x, y), td ? 0.62 : 0.5 + (n - 0.5) * 0.06);
  }
  // plate seams: the cell edge and a mid seam, each a dark groove with a lit lip (light from the upper left)
  for (let i = 0; i < 32; i++) {
    t.px(i, 0, CHAR[3], 0.12).px(0, i, CHAR[3], 0.12);
    t.px(i, 1, CHAR[7]).px(1, i, CHAR[7]);
    t.px(i, 16, CHAR[3], 0.22).px(i, 17, CHAR[7]);
  }
  for (const [x, y] of [[4, 4], [28, 4], [4, 13], [28, 13], [4, 20], [28, 20], [4, 29], [28, 29]]) rivet(t, x, y, CHAR, 8);
  for (let i = 0; i < 4; i++) scratch(t, r, 3 + Math.floor(r() * 24), 3 + Math.floor(r() * 26), 4 + Math.floor(r() * 8), 1, r() < 0.5 ? 0 : 1, 0.06);
  return r;
}

function deckDrain(t, seed) {
  deckBase(t, seed, { tread: false });
  // a recessed drain grille in the south plate
  for (let y = 21; y < 28; y++) for (let x = 9; x < 23; x++) {
    const edge = y === 21 || y === 27 || x === 9 || x === 22;
    const slot = !edge && x % 3 !== 0;
    t.px(x, y, edge ? CHAR[3] : slot ? CHAR[1] : CHAR[6], edge ? 0.34 : slot ? 0.12 : 0.4);
  }
  t.hline(9, 22, 28, CHAR[7]).vline(23, 21, 28, CHAR[7]);
}

function deckPatched(t, seed) {
  const r = deckBase(t, seed, { tread: false });
  // a welded patch plate over a blaster scar: raised, a bead of weld round it, scorch bleeding out
  for (let y = 18; y < 30; y++) for (let x = 6; x < 26; x++) {
    const d = Math.hypot((x - 16) / 11, (y - 24) / 7);
    if (d < 1.25) t.tint(x, y, '#120a0c', clamp01(0.42 - d * 0.3));
  }
  for (let y = 20; y < 28; y++) for (let x = 9; x < 23; x++) {
    const n = tn(x, y, 32, 32, 4, seed + 3, 2);
    t.px(x, y, dpick(CHAR, DECK - 0.4 + (n - 0.5) * 0.8, x, y), 0.6);
  }
  for (let x = 8; x < 24; x++) {
    t.px(x, 19, hash(x, 19, seed) < 0.5 ? CHAR[8] : CHAR[6], 0.66).px(x, 28, hash(x, 28, seed) < 0.5 ? CHAR[5] : CHAR[4], 0.62);
  }
  for (let y = 19; y < 29; y++) t.px(8, y, CHAR[8], 0.66).px(23, y, CHAR[4], 0.62);
  for (const [x, y] of [[10, 21], [21, 21], [10, 26], [21, 26]]) rivet(t, x, y, CHAR, 8);
  scratch(t, r, 12, 23, 7, 1, 0, 0.08);
}

/** Door thresholds: red and bone diagonal bands, worn through to the plate where boots cross. */
function hazardFloor(t, seed) {
  deckBase(t, seed, { tread: false });
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const k = (x + y) % 16;
    const wear = tn(x, y, 32, 32, 4, seed + 11, 3);
    if (wear > 0.64 || (y > 11 && y < 20 && wear > 0.5)) continue;
    const red = k < 8;
    t.px(x, y, red ? dpick(RED, 3.1 + (wear - 0.5) * 1.2, x, y) : dpick(BONE, 1.7 + (wear - 0.5) * 1.0, x, y), 0.53);
    if (k === 0 || k === 8) t.tone(x, y, 0.06);
  }
}

/** The Moth's berth: perforated pad plate with tyre-dark skids. */
function padFloor(t, seed) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3), skid = tn(x, y, W, H, 1, seed + 5, 3);
    let v = DECK - 0.5 + (n - 0.5) * 1.0 - (skid > 0.58 ? (skid - 0.58) * 6 : 0);
    t.px(x, y, dpick(CHAR, v, x, y), 0.52);
  }
  for (let y = 4; y < 32; y += 8) for (let x = 4; x < 32; x += 8) {
    t.px(x, y, CHAR[1], 0.2).px(x + 1, y, CHAR[2], 0.22).px(x, y + 1, CHAR[2], 0.22).px(x + 1, y + 1, CHAR[3], 0.25);
    t.px(x + 2, y + 1, CHAR[7]).px(x + 1, y + 2, CHAR[7]);
  }
  for (let i = 0; i < 32; i++) t.px(i, 0, CHAR[3], 0.14).px(0, i, CHAR[3], 0.14).px(i, 1, CHAR[6]).px(1, i, CHAR[6]);
}

/** Training hall rubber: slate with paint flecks, faint mat seams. */
function gymFloor(t, seed) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3), m = tn(x, y, W, H, 1, seed + 9, 2);
    t.px(x, y, dpick(SLATE, 4.5 + (n - 0.5) * 1.0 + (m - 0.5) * 0.6, x, y), 0.5 + (n - 0.5) * 0.05);
    const h = hash(x, y, seed);
    if (h < 0.035) t.px(x, y, h < 0.012 ? RED[4] : h < 0.024 ? BONE[1] : SLATE[7]);
  }
  for (let i = 0; i < 32; i++) t.px(i, 0, SLATE[3], 0.44).px(0, i, SLATE[3], 0.44);
}

/** Command deck: polished black stone slabs, mottled, a soft sheen; nothing that prints per cell. */
function commandFloor(t, seed) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3), m = tn(x, y, W, H, 2, seed + 3, 3);
    t.px(x, y, dpick(CHAR, 5.0 + (n - 0.5) * 0.7 + (m - 0.5) * 0.9, x, y), 0.5);
    if (hash(x, y, seed) < 0.02) t.px(x, y, CHAR[7]);
  }
  for (let i = 0; i < 32; i++) t.px(i, 0, CHAR[3], 0.4).px(0, i, CHAR[3], 0.4).px(i, 1, CHAR[7]).px(1, i, CHAR[7]);
}

/** Core antechamber: dark composite with short cyan circuit runs, faintly lit. */
function coreFloor(t, seed) {
  const W = 32, H = 32;
  const r = rng(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(CORE, 4.4 + (n - 0.5) * 1.1, x, y), 0.5);
  }
  for (let i = 0; i < 32; i++) {
    t.px(i, 0, CORE[2], 0.2).px(0, i, CORE[2], 0.2).px(i, 1, CORE[6]).px(1, i, CORE[6]);
    t.px(i, 16, CORE[2], 0.3).px(i, 17, CORE[5]);
  }
  // two faint traces per cell, never touching the edges, so turned cells read as broken bus runs
  for (let k = 0; k < 2; k++) {
    let x = 4 + Math.floor(r() * 24), y = 4 + Math.floor(r() * 24);
    const pad = (px, py) => {
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) t.glow(px + dx, py + dy, CY[3], CY[1]);
    };
    pad(x, y);
    for (let s = 0; s < 2; s++) {
      const horiz = (k + s) % 2 === 0, len = 4 + Math.floor(r() * 8), dir = r() < 0.5 ? -1 : 1;
      for (let j = 0; j < len; j++) {
        const nx = horiz ? x + dir : x, ny = horiz ? y : y + dir;
        if (nx < 3 || ny < 3 || nx > 28 || ny > 28) break;
        x = nx; y = ny;
        t.glow(x, y, CY[1], CY[0]);
        t.px(x + (horiz ? 0 : 1), y + (horiz ? 1 : 0), CORE[1], 0.42);
      }
    }
    pad(x, y);
  }
}

/** Officers' corridor runner: woven wine-red with a faint diamond and a gold knot. */
function carpetFloor(t, seed) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    const weave = (x + y) & 1 ? 0.3 : -0.1;
    const dx = Math.abs((x % 16) - 7.5), dy = Math.abs((y % 16) - 7.5);
    const d = dx + dy;
    const ring = d > 6 && d < 7.6 ? 0.9 : 0;
    t.px(x, y, dpick(WINE, 3.2 + (n - 0.5) * 1.0 + weave + ring, x, y), 0.5 + weave * 0.05);
    if (d < 1.6) t.px(x, y, d < 0.9 ? GOLD[3] : GOLD[2], 0.55);
  }
}

/** Quarters: warm linoleum, four tiles per cell. */
function quartersFloor(t, seed) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 8, seed, 3), m = tn(x, y, W, H, 2, seed + 3, 2);
    const tile = hash(x >> 4, y >> 4, seed) - 0.5;
    t.px(x, y, dpick(TAUPE, 5.3 + (n - 0.5) * 1.0 + (m - 0.5) * 0.4 + tile * 0.5, x, y), 0.52);
  }
  for (let i = 0; i < 32; i++) {
    for (const s of [0, 16]) t.px(i, s, TAUPE[2], 0.38).px(s, i, TAUPE[2], 0.38).px(i, s + 1, TAUPE[6]).px(s + 1, i, TAUPE[6]);
  }
}

/** Holding cells: clinical tiles, grey-white, grime in the grout. */
function tileFloor(t, seed) {
  const W = 32, H = 32;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    const tile = hash(x >> 3, y >> 3, seed) - 0.5;
    const grout = x % 8 === 0 || y % 8 === 0;
    if (grout) {
      const g = tn(x, y, W, H, 2, seed + 5, 2);
      t.px(x, y, g > 0.55 ? CHAR[4] : CHAR[6], 0.36);
      continue;
    }
    t.px(x, y, dpick(BONE, 1.5 + (n - 0.5) * 0.8 + tile * 0.5 + (x % 8 === 1 || y % 8 === 1 ? 0.5 : 0), x, y), 0.55);
  }
}

// ---------------------------------------------------------------- walls (32 x 96 tiling horizontally)

/** Charcoal plate wall: lit top trim, one panel per cell, a crimson alert band with an LED strip, kick plate. */
function wallBase(t, seed, { band = true, side = false, base = WALL } = {}) {
  const W = 32, H = 96;
  const r = rng(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3), m = tn(x, y, W, H, 1, seed + 5, 2);
    t.px(x, y, dpick(CHAR, base + (n - 0.5) * 1.0 + (m - 0.5) * 0.5 - (side ? 0.5 : 0) + (y < 42 ? 0.2 : 0), x, y), 0.55);
  }
  for (let x = 0; x < W; x++) {
    [CHAR[9], CHAR[8], CHAR[7], CHAR[5], CHAR[3]].forEach((c, i) => t.px(x, i, c, 0.88 - i * 0.08));
    t.px(x, 5, CHAR[1], 0.3);
  }
  for (let y = 6; y < 80; y++) t.px(0, y, CHAR[7], 0.74).px(31, y, CHAR[2], 0.34);
  if (!side) for (let x = 1; x < 31; x++) t.px(x, 22, CHAR[2], 0.4).px(x, 23, CHAR[7], 0.6);
  if (band) {
    for (let x = 0; x < W; x++) {
      t.px(x, 42, RED[5], 0.82);
      for (let y = 43; y < 49; y++) t.px(x, y, dpick(RED, 2.6 + (tn(x, y, W, H, 8, seed + 2, 2) - 0.5) * 1.2, x, y), 0.66);
      t.px(x, 49, RED[1], 0.42);
      if (x % 4 === 3) { t.px(x, 45, RED[1]).px(x, 46, RED[1]); continue; }
      t.glow(x, 45, RED[6], RED[5]).glow(x, 46, RED[5], RED[4]);
    }
  }
  // the kick plate, with a bone guide line
  for (let x = 0; x < W; x++) {
    t.px(x, 80, CHAR[8], 0.86);
    for (let y = 81; y < H; y++) t.px(x, y, dpick(CHAR, base - 1.3 + (tn(x, y, W, H, 4, seed + 9, 2) - 0.5) * 0.8, x, y), 0.68);
    if (hash(x, 83, seed) < 0.86) t.px(x, 83, BONE[1]).px(x, 84, BONE[0]);
  }
  for (const [bx, by] of [[3, 8], [27, 8], [3, 74], [27, 74]]) bolt(t, bx, by, CHAR, 8);
  streaks(t, r, 3, 2, 30, 50, 70, CHAR[1], 0.35);
  return r;
}

/** The guard post: two rows of small evidence lockers set into the wall. */
function wallLockers(t, seed) {
  wallBase(t, seed, { band: true });
  for (const [y0, y1] of [[8, 39], [52, 78]]) for (const x0 of [2, 17]) {
    const x1 = x0 + 12;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) t.px(x, y, dpick(GUN, 3.4 + (tn(x, y, 32, 96, 8, seed + x0, 2) - 0.5), x, y), 0.6);
    t.hline(x0, x1, y0, GUN[5], 0.7).vline(x0, y0, y1, GUN[5], 0.7).hline(x0, x1, y1, GUN[0], 0.4).vline(x1, y0, y1, GUN[0], 0.4);
    const hy = Math.floor((y0 + y1) / 2);
    t.vline(x1 - 2, hy - 3, hy + 3, BONE[2], 0.72).px(x1 - 1, hy - 3, GUN[0]);
    t.rect(x0 + 3, y0 + 4, 5, 2, BONE[1], 0.6);
  }
}

/** The armory: rifles racked on a dark board, a crimson lockdown bar across them. */
function wallRack(t, seed) {
  wallBase(t, seed, { band: false });
  for (let y = 26; y < 78; y++) for (let x = 1; x < 31; x++) t.px(x, y, dpick(CHAR, 2.6 + (tn(x, y, 32, 96, 4, seed + 4, 2) - 0.5), x, y), 0.4);
  for (let x = 1; x < 31; x++) {
    t.px(x, 28, CHAR[8], 0.75).px(x, 29, CHAR[6], 0.7).px(x, 30, CHAR[2], 0.5);
    t.px(x, 74, CHAR[8], 0.75).px(x, 75, CHAR[6], 0.7);
  }
  for (const rx of [7, 21]) {
    const part = (x, y, lit) => t.px(x, y, lit ? GUN[5] : GUN[2], 0.78);
    for (let y = 31; y < 50; y++) { part(rx, y, true); part(rx + 1, y, false); }
    for (let y = 50; y < 64; y++) for (let x = rx - 1; x < rx + 3; x++) part(x, y, x === rx - 1);
    for (let y = 55; y < 62; y++) { part(rx + 3, y, false); part(rx + 4, y, y === 55); }
    for (let y = 64; y < 74; y++) for (let x = rx - 1; x < rx + 2 + Math.floor((y - 64) / 4); x++) part(x, y, x === rx - 1);
    t.px(rx, 52, RED[5]).px(rx, 53, RED[4]);
    t.hline(rx - 3, rx + 5, 31, CHAR[7], 0.82);
  }
  for (let x = 0; x < 32; x++) {
    t.px(x, 50, RED[6], 0.84);
    for (let y = 51; y < 54; y++) t.px(x, y, dpick(RED, 3.3 - (y - 51) * 0.5, x, y), 0.8);
    t.px(x, 54, RED[0], 0.5);
  }
  for (const bx of [14, 30]) t.rect(bx, 50, 2, 4, CHAR[7], 0.9);
}

/** Holding cells: bone-white quilted padding over a dark kick plate. */
function cellWall(t, seed) {
  const W = 32, H = 96;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    if (y < 6 || y >= 82) {
      t.px(x, y, dpick(CHAR, 4.3 + (n - 0.5) * 0.8, x, y), 0.6);
      continue;
    }
    const cx = x % 16, cy = (y - 6) % 19;
    const dome = 1 - Math.hypot((cx - 7.5) / 8, (cy - 9) / 9.5);
    const v = 1.5 + dome * 1.2 + (n - 0.5) * 0.6 - (cy > 12 ? 0.2 : 0);
    t.px(x, y, dpick(BONE, v, x, y), 0.45 + dome * 0.3);
    if (cx === 0 || cy === 0) t.px(x, y, BONE[0], 0.36);
    if ((cx === 0 || cx === 15) && (cy === 0 || cy === 18)) t.px(x, y, CHAR[5], 0.3);
  }
  for (let x = 0; x < W; x++) {
    t.px(x, 0, CHAR[8], 0.9).px(x, 1, CHAR[7], 0.8).px(x, 5, CHAR[2], 0.4);
    t.px(x, 82, CHAR[7], 0.86).px(x, 85, RED[3]).px(x, 86, RED[2]);
  }
  // old stains, yellowed at the foot
  for (let y = 6; y < 82; y++) for (let x = 0; x < W; x++) {
    const s = tn(x, y, W, H, 4, seed + 13, 3);
    if (s > 0.62) t.tint(x, y, '#5a4c44', (s - 0.62) * 1.6 * (0.5 + y / 160));
  }
}

/** Padded vinyl: domed panels with a stitched border (pads on the hall walls and its obstacles). */
function pads(t, seed, x0, x1, y0, y1, ph = 18) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const n = tn(x, y, 32, 96, 4, seed, 3);
    const cx = (x - x0) % 16, cy = (y - y0) % ph;
    const dome = 1 - Math.hypot((cx - 7.5) / 8.5, (cy - (ph - 1) / 2) / (ph / 2 + 1));
    t.px(x, y, dpick(WINE, 2.9 + dome * 1.8 + (n - 0.5) * 0.6, x, y), 0.45 + dome * 0.3);
    if (cx === 0 || cy === 0) t.px(x, y, WINE[1], 0.34);
    else if ((cx === 2 || cy === 2) && (x + y) % 2 === 0) t.px(x, y, WINE[5]);
  }
}

function gymWall(t, seed) {
  wallBase(t, seed, { band: false });
  pads(t, seed + 1, 0, 31, 46, 79, 17);
  for (let x = 0; x < 32; x++) {
    t.px(x, 43, BONE[3], 0.7).px(x, 44, BONE[2], 0.68).px(x, 45, CHAR[2], 0.4);
    t.px(x, 30, BONE[1]).px(x, 34, RED[4]);
  }
}

/** The hall's obstacle blocks, 32 x 42 (1.3 high). */
function padWall(t, seed) {
  for (let y = 0; y < 42; y++) for (let x = 0; x < 32; x++) t.px(x, y, CHAR[3], 0.5);
  pads(t, seed, 0, 31, 4, 35, 16);
  for (let x = 0; x < 32; x++) {
    t.px(x, 0, BONE[4], 0.8).px(x, 1, BONE[3], 0.76).px(x, 2, BONE[2], 0.72).px(x, 3, CHAR[2], 0.4);
    for (let y = 36; y < 42; y++) t.px(x, y, dpick(CHAR, 3.2 + (y - 36) * -0.1, x, y), 0.6);
    t.px(x, 36, CHAR[7], 0.8);
  }
}

/** Command deck: black glass panels framed in gold, a long reflection across them. */
function cmdWall(t, seed) {
  const W = 32, H = 96;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 2, seed, 3);
    const k = (((x * 2 + y) % 96) + 96) % 96;
    const streak = Math.max(0, 1 - Math.abs(k - 40) / 9) * 1.6 + Math.max(0, 1 - Math.abs(k - 58) / 3) * 0.8;
    t.px(x, y, dpick(CHAR, 3.6 + (n - 0.5) * 0.8 + streak, x, y), 0.5);
  }
  for (let x = 0; x < W; x++) {
    t.glow(x, 0, GOLD[5], GOLD[3]).px(x, 1, GOLD[4], 0.9).px(x, 2, GOLD[3], 0.86).px(x, 3, GOLD[1], 0.6).px(x, 4, CHAR[1], 0.3);
    t.px(x, 78, GOLD[4], 0.8).px(x, 79, GOLD[2], 0.74);
    for (let y = 80; y < H; y++) t.px(x, y, dpick(CHAR, 2.4 + (tn(x, y, W, H, 4, seed + 3, 2) - 0.5), x, y), 0.66);
  }
  for (let y = 4; y < 78; y++) t.px(0, y, GOLD[3], 0.82).px(1, y, GOLD[1], 0.6).px(31, y, CHAR[1], 0.36);
}

function capTex(t, seed) {
  // plain capped steel close in value to the walls: no motif that stamps along a wall top
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 4, seed, 3), m = tn(x, y, 32, 32, 1, seed + 7, 3);
    t.px(x, y, dpick(CHAR, 5.4 + (n - 0.5) * 0.6 + (m - 0.5) * 0.5, x, y), 0.6);
  }
  for (let i = 0; i < 32; i++) t.px(i, 0, CHAR[7], 0.7).px(0, i, CHAR[7], 0.7);
}

function lowTex(t, seed) {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 24, 4, seed, 3);
    t.px(x, y, dpick(CHAR, WALL + (n - 0.5) * 1.0 - (y > 17 ? 1.2 : 0), x, y), 0.55);
  }
  for (let x = 0; x < 32; x++) {
    t.px(x, 0, CHAR[9], 0.85).px(x, 1, CHAR[7], 0.8);
    t.px(x, 6, RED[5], 0.7).px(x, 7, RED[3], 0.66).px(x, 8, RED[2], 0.6);
    t.px(x, 17, CHAR[7], 0.8);
  }
}

/** Blast door leaf: heavy plate, an upward chevron, a red status bar, hazard bands at the foot. */
function doorTex(t, seed) {
  const W = 32, H = 96;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(CHAR, 5.6 + (n - 0.5) * 1.0, x, y), 0.6);
  }
  for (const y of [12, 56]) for (let x = 1; x < 31; x++) t.px(x, y, CHAR[8], 0.8).px(x, y + 1, CHAR[3], 0.5);
  for (let x = 0; x < W; x++) t.px(x, 0, CHAR[8], 0.9).px(x, H - 1, CHAR[1], 0.4);
  for (let y = 0; y < H; y++) t.px(0, y, CHAR[8], 0.8).px(1, y, CHAR[6], 0.7).px(31, y, CHAR[1], 0.4).px(30, y, CHAR[3], 0.5);
  for (let k = 0; k < 2; k++) for (let i = 0; i < 9; i++) {
    const y = 20 + k * 7 + i;
    t.px(15 - i, y, BONE[2], 0.7).px(16 + i, y, BONE[2], 0.7).px(15 - i, y + 1, BONE[1], 0.68).px(16 + i, y + 1, BONE[1], 0.68);
  }
  for (let x = 9; x < 23; x++) {
    t.glow(x, 44, RED[6], RED[5]).glow(x, 45, RED[5], RED[4]);
    t.px(x, 43, CHAR[2], 0.4).px(x, 46, CHAR[8], 0.6);
  }
  for (let y = 74; y < 90; y++) for (let x = 2; x < 30; x++) {
    const wear = tn(x, y, W, H, 8, seed + 7, 2);
    if (wear > 0.66) continue;
    t.px(x, y, (x + y) % 12 < 6 ? dpick(RED, 3.2, x, y) : dpick(BONE, 1.8, x, y), 0.62);
  }
  for (const [bx, by] of [[4, 4], [26, 4], [4, 90], [26, 90]]) bolt(t, bx, by, CHAR, 9);
}

/** Checkpoint barricade plate, 32 x 34: striped top band, a vision slit, dents and blaster scorch. */
function barricadeTex(t, seed) {
  const W = 32, H = 34;
  const r = rng(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3), s = tn(x, y, W, H, 2, seed + 5, 3);
    t.px(x, y, dpick(CHAR, 5.8 + (n - 0.5) * 1.2 - (y > 29 ? 1.6 : 0), x, y), 0.58);
    if (s > 0.64) t.tint(x, y, '#140a0b', (s - 0.64) * 2.4);
  }
  for (let y = 1; y < 8; y++) for (let x = 0; x < W; x++) {
    if (tn(x, y, W, H, 8, seed + 9, 2) > 0.7) continue;
    t.px(x, y, (x + y) % 8 < 4 ? dpick(RED, 3.4, x, y) : dpick(BONE, 2.2, x, y), 0.64);
  }
  for (let x = 0; x < W; x++) t.px(x, 0, CHAR[9], 0.86).px(x, 8, CHAR[3], 0.5).px(x, 29, CHAR[8], 0.8);
  for (let x = 4; x < 28; x++) t.px(x, 12, CHAR[2], 0.3).px(x, 13, CHAR[0], 0.24).px(x, 14, CHAR[8], 0.5);
  for (let i = 0; i < 3; i++) {
    const cx = 4 + Math.floor(r() * 24), cy = 17 + Math.floor(r() * 9);
    t.px(cx, cy, CHAR[3], 0.44).px(cx + 1, cy, CHAR[4], 0.46).px(cx, cy - 1, CHAR[8]).px(cx + 1, cy + 1, CHAR[7]);
  }
  for (const [bx, by] of [[2, 10], [28, 10], [2, 26], [28, 26]]) rivet(t, bx, by, CHAR, 9);
  for (let i = 0; i < 3; i++) scratch(t, r, 3 + Math.floor(r() * 24), 16 + Math.floor(r() * 10), 5 + Math.floor(r() * 6), 1, r() < 0.5 ? 0 : 1, 0.09);
}

/** Barracks partitions, 32 x 54 (1.7 high): two locker doors per cell. */
function lockersTex(t, seed) {
  const W = 32, H = 54;
  const r = rng(seed);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = tn(x, y, W, H, 4, seed, 3);
    t.px(x, y, dpick(LOCK, 4.2 + (n - 0.5) * 1.0, x, y), 0.6);
  }
  for (const x0 of [1, 17]) {
    const x1 = x0 + 13;
    t.hline(x0, x1, 2, LOCK[6], 0.74).vline(x0, 2, 48, LOCK[6], 0.74).hline(x0, x1, 48, LOCK[1], 0.42).vline(x1, 2, 48, LOCK[1], 0.42);
    for (const vy of [6, 8, 10]) t.hline(x0 + 3, x1 - 3, vy, LOCK[1], 0.4).hline(x0 + 3, x1 - 3, vy + 1, LOCK[5]);
    t.rect(x0 + 3, 15, 8, 3, BONE[2], 0.64).hline(x0 + 4, x0 + 8, 16, CHAR[4]);
    const hx = x0 === 1 ? x1 - 2 : x0 + 2;
    t.vline(hx, 24, 30, BONE[3], 0.76).vline(hx + 1, 25, 30, LOCK[1], 0.5);
  }
  for (let x = 0; x < W; x++) {
    t.px(x, 0, LOCK[6], 0.86).px(x, 1, LOCK[5], 0.8);
    for (let y = 49; y < H; y++) t.px(x, y, CHAR[2], 0.5);
    t.px(x, 49, CHAR[6], 0.7);
  }
  t.vline(16, 2, 48, LOCK[0], 0.34);
  for (let i = 0; i < 2; i++) {
    const cx = 3 + Math.floor(r() * 26), cy = 30 + Math.floor(r() * 14);
    t.px(cx, cy, LOCK[2], 0.5).px(cx + 1, cy, LOCK[2], 0.52).px(cx, cy - 1, LOCK[6]);
  }
}

// ---------------------------------------------------------------- props

function grain(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 4, seed, 3), s = tn(x, y, 32, 32, 16, seed + 5, 1);
    const pit = hash(x, y, seed) < 0.035;
    const v = Math.max(0.6, Math.min(1, 0.88 + (n - 0.5) * 0.34 + (s - 0.5) * 0.12 - (pit ? 0.2 : 0)));
    const g = Math.round(v * 255).toString(16).padStart(2, '0');
    t.px(x, y, `#${g}${g}${g}`, 0.5 + (n - 0.5) * 0.3 - (pit ? 0.15 : 0));
  }
}

const SLOGANS = [['REMAIN', 'CALM'], ['RETURN TO', 'YOUR POD'], ['YOU ARE', 'LOVED']];

/** WARDEN's screens, 96 x 54: the gold iris on the left, the slogan on the right, a red ticker below. */
function propaganda(t, f) {
  const W = 96, H = 54;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const g = 1 - y / H;
    const c = y % 2 ? (g > 0.5 ? '#170408' : '#100306') : g > 0.5 ? '#21060b' : '#170408';
    t.glow(x, y, c, y % 2 ? '#0c0204' : '#160408');
  }
  const gold = [GOLD[1], GOLD[2], GOLD[3], GOLD[4], GOLD[5], '#fffbe8'];
  const lit = (x, y, k) => { if (x >= 0 && y >= 0 && x < W && y < H) t.glow(x, y, gold[Math.max(0, Math.min(5, k))]); };
  const cx = 19, cy = 23;
  for (let r = 0; r < 12; r++) {
    const a = (r / 12) * Math.PI * 2 - Math.PI / 2;
    const on = (r + f * 4) % 12 < 4 ? 1 : 0;
    for (let s = 11; s < 18; s++) lit(Math.floor(cx + Math.cos(a) * s), Math.floor(cy + Math.sin(a) * s), (s < 14 ? 3 : 2) + on);
  }
  for (let s = 0; s < 80; s++) {
    const a = (s / 80) * Math.PI * 2;
    lit(Math.floor(cx + Math.cos(a) * 9.5), Math.floor(cy + Math.sin(a) * 9.5), 3);
  }
  for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 9; x <= cx + 9; x++) {
    const u = (x + 0.5 - cx) / 8.5, v = (y + 0.5 - cy) / 5.2;
    const lid = 1 - u * u;
    if (lid <= 0) continue;
    const inside = Math.abs(v) < lid;
    if (!inside) continue;
    if (Math.abs(v) > lid - 0.3) lit(x, y, 5);
    else if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 3.4) lit(x, y, Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 1.5 ? 5 : 3);
    else t.glow(x, y, '#1a0e02');
  }
  // the slogan (two lines, centred in the right part)
  const [a, b] = SLOGANS[f % SLOGANS.length];
  const mid = 66;
  stencilGlow(t, a, mid - Math.floor(textWidth(a) / 2), 9, GOLD[5], GOLD[4]);
  stencilGlow(t, b, mid - Math.floor(textWidth(b) / 2), 20, BONE[6], BONE[4]);
  for (let x = 40; x < 92; x++) t.glow(x, 31, GOLD[2], GOLD[1]);
  // the alert ticker: a red bar with the text crawling one third along per frame
  for (let y = 41; y < 51; y++) for (let x = 0; x < W; x++) t.glow(x, y, y === 41 || y === 50 ? RED[5] : RED[2], y === 41 || y === 50 ? RED[4] : RED[1]);
  const tick = 'ALERT LEVEL RED - SECURITY LOCKDOWN - ';
  const tw = textWidth(tick), off = Math.floor((f * tw) / 3);
  for (const base of [-tw, 0, tw]) drawText(tick, 2 + base - off, 43, (px, py) => { if (px >= 0 && px < W) t.glow(px, py, BONE[6], BONE[5]); });
  for (let y = 0; y < H; y++) { t.glow(0, y, CHAR[4], '#000000'); t.glow(W - 1, y, CHAR[4], '#000000'); }
}

function stencilGlow(t, text, x, y, c, ec) {
  drawText(text, x, y, (px, py) => t.glow(px, py, c, ec));
}

const SIGNS = ['DOCK', 'CHECKPOINT', 'BARRACKS', 'ARMORY', 'HOLDING', 'OFFICERS', 'TRAINING'];

/** Deck signs, 64 x 112: seven 64 x 16 plates stacked (row i = SIGNS[i]). */
function signs(t) {
  SIGNS.forEach((label, i) => {
    const y0 = i * 16;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 64; x++) t.px(x, y0 + y, y === 0 ? CHAR[7] : y === 15 ? CHAR[1] : x < 12 ? RED[3] : CHAR[2], 0.6);
    for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) t.glow(3 + j + k, y0 + 4 + j, BONE[5], BONE[4]).glow(3 + j + k, y0 + 11 - j, BONE[5], BONE[4]);
    const w = textWidth(label);
    stencilGlow(t, label, 12 + Math.floor((52 - w) / 2), y0 + 4, BONE[6], BONE[5]);
    t.vline(12, y0 + 1, y0 + 14, CHAR[5], 0.7).vline(63, y0, y0 + 15, CHAR[1], 0.5).vline(0, y0, y0 + 15, CHAR[7], 0.8);
  });
}

/** Console face, 32 x 32, 2 frames: a red header, readouts and a blinking cursor. */
function panel(t, f) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const edge = x < 2 || y < 2 || x > 29 || y > 29;
    if (edge) { t.px(x, y, x < 1 || y < 1 ? CHAR[7] : CHAR[3], 0.7); continue; }
    t.glow(x, y, y % 2 ? '#04101a' : '#06141f', y % 2 ? '#020a10' : '#041018');
  }
  for (let x = 3; x < 29; x++) for (let y = 3; y < 7; y++) t.glow(x, y, RED[4], RED[3]);
  for (let x = 6; x < 26; x++) if (x % 3) t.glow(x, 4, BONE[5], BONE[4]);
  const rows = [[4, 20], [4, 14], [4, 24], [4, 10]];
  rows.forEach(([x0, len], i) => {
    const y = 10 + i * 4;
    for (let x = x0; x < x0 + len; x++) if (hash(x, y, 31 + f * (i === 2 ? 1 : 0)) < 0.8) t.glow(x, y, CY[4], CY[3]);
  });
  if (f === 0) for (let y = 25; y < 28; y++) t.glow(4, y, CY[5], CY[4]).glow(5, y, CY[5], CY[4]);
  for (let x = 20; x < 28; x++) for (let y = 24; y < 28; y++) if (y >= 28 - (((x * 7 + f * 3) % 4) + 1)) t.glow(x, y, CY[3], CY[2]);
}

/** Security supply crate face, 32 x 32. */
function crate(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 4, seed, 3);
    t.px(x, y, dpick(CHAR, 5.0 + (n - 0.5) * 1.0, x, y), 0.6);
  }
  for (let i = 0; i < 32; i++) {
    for (const [a, b] of [[0, 1], [30, 31]]) {
      t.px(i, a, CHAR[8], 0.8).px(i, b, CHAR[3], 0.66).px(a, i, CHAR[8], 0.8).px(b, i, CHAR[3], 0.66);
    }
  }
  for (let y = 12; y < 19; y++) for (let x = 2; x < 30; x++) t.px(x, y, dpick(RED, 3.2, x, y), 0.62);
  stencil(t, 'SC', 11, 3, BONE[3], 41, 0.9);
  for (const [bx, by] of [[3, 3], [27, 3], [3, 27], [27, 27]]) rivet(t, bx, by, CHAR, 9);
}

/** Security Corps banner, 32 x 64, alpha: crimson cloth, gold edging, a bone chevron, swallow tail. */
function banner(t) {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) {
    const tail = y > 52 && Math.abs(x - 15.5) < (y - 52) * 1.4;
    if (tail) continue;
    const fold = Math.sin((x / 32) * Math.PI * 3) * 0.6;
    t.px(x, y, dpick(RED, 2.6 + fold + (tn(x, y, 32, 64, 4, 5, 2) - 0.5) * 0.6, x, y), 0.5 + fold * 0.08);
    if (x < 2 || x > 29 || y < 3) t.px(x, y, x === 0 || y === 0 ? GOLD[4] : GOLD[3], 0.6);
  }
  for (let k = 0; k < 3; k++) for (let i = 0; i < 9; i++) {
    const y = 18 + k * 8 + i;
    for (const x of [15 - i, 16 + i]) t.px(x, y, BONE[4], 0.6).px(x, y + 1, BONE[3], 0.6).px(x, y + 2, RED[1]);
  }
}

// ---------------------------------------------------------------- registry

const floor = { w: 32, h: 32, wrapX: true, wrapY: true };
const wall = { w: 32, h: 96, wrapX: true };

export const TEXTURES = {
  sp_deck: { ...floor, strength: 2, paint: (t) => deckBase(t, 11) },
  sp_deck_b: { ...floor, strength: 2, paint: (t) => deckDrain(t, 23) },
  sp_deck_c: { ...floor, strength: 2, paint: (t) => deckPatched(t, 37) },
  sp_hazard: { ...floor, strength: 1.8, paint: (t) => hazardFloor(t, 41) },
  sp_pad: { ...floor, strength: 2, paint: (t) => padFloor(t, 53) },
  sp_gym: { ...floor, strength: 1.2, paint: (t) => gymFloor(t, 61) },
  sp_command: { ...floor, strength: 1.0, paint: (t) => commandFloor(t, 71) },
  sp_core: { ...floor, strength: 1.6, paint: (t) => coreFloor(t, 79) },
  sp_carpet: { ...floor, strength: 1.2, paint: (t) => carpetFloor(t, 83) },
  sp_quarters: { ...floor, strength: 1.4, paint: (t) => quartersFloor(t, 97) },
  sp_tile: { ...floor, strength: 1.6, paint: (t) => tileFloor(t, 101) },
  sp_wall: { ...wall, strength: 2.4, paint: (t) => wallBase(t, 211) },
  sp_wall_b: { ...wall, strength: 2.4, paint: (t) => wallLockers(t, 223) },
  sp_rack: { ...wall, strength: 2.4, paint: (t) => wallRack(t, 227) },
  sp_cellwall: { ...wall, strength: 2.0, paint: (t) => cellWall(t, 229) },
  sp_gymwall: { ...wall, strength: 2.2, paint: (t) => gymWall(t, 233) },
  sp_padwall: { w: 32, h: 42, wrapX: true, strength: 2.2, paint: (t) => padWall(t, 239) },
  sp_cmdwall: { ...wall, strength: 1.6, paint: (t) => cmdWall(t, 241) },
  sp_cap: { ...floor, strength: 1.4, paint: (t) => capTex(t, 251) },
  sp_low: { w: 32, h: 24, wrapX: true, strength: 2, paint: (t) => lowTex(t, 257) },
  sp_door: { w: 32, h: 96, strength: 2.2, paint: (t) => doorTex(t, 263) },
  sp_barricade: { w: 32, h: 34, wrapX: true, strength: 2.4, paint: (t) => barricadeTex(t, 269) },
  sp_lockers: { w: 32, h: 54, wrapX: true, strength: 2.2, paint: (t) => lockersTex(t, 271) },
  sp_grain: { ...floor, strength: 0.7, paint: (t) => grain(t, 409) },
  sp_propaganda: { w: 96, h: 54, frames: 3, fps: 0.4, strength: 0.4, paint: (t, f) => propaganda(t, f) },
  sp_signs: { w: 64, h: 112, strength: 1.2, paint: (t) => signs(t) },
  sp_panel: { w: 32, h: 32, frames: 2, fps: 1.5, strength: 0.8, paint: (t, f) => panel(t, f) },
  sp_crate: { w: 32, h: 32, strength: 2, paint: (t) => crate(t, 307) },
  sp_banner: { w: 32, h: 64, alpha: true, strength: 1.2, paint: (t) => banner(t) },
};
