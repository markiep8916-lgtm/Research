// dreams: environment textures (browser, TECH_PLAN 3.12; registered through art.js). 32 texture px =
// 1 world unit, painted as colour + height (+ emissive). The dreams are "too perfect": clean
// surfaces, soft value contrast (no tile carries a high-contrast blob), each set in its own palette.
//
//   kade   dr_hall_floor(_b) honey-ivory stone, dr_hall_wall / _cap / _low ivory panels with gold
//          trim, dr_crest (the Security crest inlaid in gold), dr_mark (a cadet's place), dr_banner
//          (a gold banner; a `screen`), dr_gold (gold leaf for small parts), dr_bd_gold (the windows'
//          endless sunset)
//   nyx    dr_mer_floor(_b) jade deck plates, dr_mer_wall / _cap / _low teal panels with warm lamp
//          strips, dr_runner (a woven deck runner), dr_mer_screen (the helm, a `screen`), dr_mer_plaque,
//          dr_bd_stars (stars streaming past: still flying)
//   orion  dr_pearl_floor, dr_pearl_wall / _cap / _low (pearl and pale gold), dr_runner_pearl,
//          dr_screen_ok (every console the same calm line, a `screen`)
//   sera   dr_wheat, dr_meadow (wildflowers), dr_path, dr_river (4 frames), dr_bank, dr_riverbed,
//          dr_bd_fields (a morning sky over golden hills, the backdrop plane), dr_house (plaster and
//          shutters), dr_house_win (a lit window, a `screen`), dr_roof (terracotta), dr_wood (white
//          fence and plank), dr_flora (alpha atlas: wheat, grass, flowers)

import { fbm, hash, rivet, drawText, textWidth } from '../../art/tiles.js';
import { rng, bayer, makeCanvas } from '../../art/painter.js';

// ---------------------------------------------------------------- palettes

const IVORY = ['#5e4528', '#7c5c36', '#9a7748', '#b6925c', '#cdab74', '#dfc28e', '#ecd6aa', '#f6e8c8', '#fff6e4'];
const GOLD = ['#4a2c08', '#7a4c10', '#a8701c', '#d09a30', '#eec056', '#ffdc86', '#fff2c4'];
const HONEY = ['#3e240e', '#5a3616', '#784a20', '#94602c', '#b07a3a', '#c8944c'];
const JADE = ['#0c2a22', '#123a2e', '#1a4c3c', '#22604a', '#2c7658', '#3a8e6a', '#52a87e', '#74c296', '#a0dcb4'];
const TEAL = ['#0a2a2e', '#10393e', '#174a50', '#1f5c62', '#2a7076', '#38878c', '#4ca0a2', '#6ab8b6'];
const BRASS = ['#3a2a0c', '#5e4414', '#86621e', '#ae842c', '#d0a63e', '#ecc864'];
const PEARL = ['#6a6a72', '#86868e', '#a0a0a8', '#b8b8be', '#ccccd0', '#dcdcde', '#e8e8e8', '#f4f2ee', '#fffcf6'];
const MINT = ['#1a5a48', '#2a8a6a', '#4cc49a', '#8af0c8', '#d4fff0'];
const WHEAT = ['#5a3c10', '#7a5418', '#9c6e22', '#bc8a2e', '#d6a63e', '#e8c056', '#f4d878', '#fcecaa'];
const GRASS = ['#2e4012', '#42561a', '#5a6e22', '#768a2e', '#94a43c', '#b0bc52'];
const EARTH = ['#3a2412', '#52341a', '#6a4624', '#845a30', '#9e703e', '#b88850', '#d0a46a'];
const WATER = ['#0e3a5a', '#145078', '#1c6896', '#2a84b4', '#44a2cc', '#6cc0e0', '#a0dcf0', '#e0f8ff'];
const TERRA = ['#4a1a10', '#6a2616', '#8a341c', '#aa4626', '#c65e34', '#dc7a48', '#ec9a64'];
const PLASTER = ['#8a6e52', '#a8886a', '#c4a484', '#dabe9e', '#ead4b6', '#f6e8d0', '#fff8ea'];
const WHITE = ['#8a8478', '#a8a296', '#c4beb2', '#dcd8cc', '#ecebe2', '#f8f7f0', '#ffffff'];

/** A colour scaled toward black (for soft emissive). */
const dim = (hex, k) => `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')}`;
const clampI = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i))];
/** Ordered-dithered ramp lookup: v is a fractional index into the ramp. */
const dpick = (ramp, v, x, y) => {
  const i = Math.floor(v);
  return clampI(ramp, i + (bayer(x, y, v - i) ? 1 : 0));
};
/** Tileable fbm over a w x h texture with `k` lattice cells across (integer, so it wraps). */
const tn = (x, y, w, h, k, seed, oct = 3) => fbm((x * k) / w, (y * k) / h, seed, oct, k, Math.max(1, Math.round((k * h) / w)));

// ---------------------------------------------------------------- kade: the hall

/** Honey-ivory stone, one slab per cell, a hairline gold seam, soft veins (value contrast ~10%). */
function hallFloor(t, seed, inlay) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 4);
    const vein = Math.abs(tn(x + n * 9, y - n * 6, 32, 32, 3, seed + 5, 3) - 0.5);
    const v = 4.2 + (n - 0.5) * 1.1 - (vein < 0.035 ? 0.7 : 0);
    t.px(x, y, dpick(IVORY, v, x, y), 0.55 + (n - 0.5) * 0.04);
  }
  for (let i = 0; i < 32; i++) {
    t.px(i, 0, GOLD[3], 0.42).px(0, i, GOLD[3], 0.42);
    t.px(i, 1, IVORY[6], 0.58).px(1, i, IVORY[6], 0.58);
  }
  if (inlay) {
    // a small gold star at the slab corner, where four slabs meet
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
      t.px((32 + dx) % 32, (32 + dy) % 32, dx || dy ? GOLD[4] : GOLD[6], 0.6);
    }
  }
}

/** Ivory wall: honey wainscot, a gold rail, a recessed ivory panel, a gold cornice; 32 x 96. */
function hallWall(t, seed) {
  for (let y = 0; y < 96; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 96, 2, seed, 3);
    let c, h = 0.5;
    if (y >= 72) {                               // wainscot: honey wood, vertical grain
      const g = tn(x * 3, y * 0.4, 32, 96, 4, seed + 3, 2);
      c = dpick(HONEY, 3.6 + (g - 0.5) * 1.6 + (x === 0 || x === 31 ? -1 : 0), x, y);
      h = 0.56;
    } else if (y >= 68) {                        // gold rail
      c = GOLD[y === 68 ? 5 : y === 71 ? 2 : 4];
      h = 0.7;
    } else if (y < 6) {                          // cornice
      c = GOLD[y < 2 ? 5 : y === 5 ? 2 : 3];
      h = 0.68;
    } else {                                     // plaster panel in a moulded frame
      const inner = x > 4 && x < 27 && y > 11 && y < 63;
      const frame = !inner && x > 2 && x < 29 && y > 9 && y < 65;
      c = dpick(IVORY, (inner ? 4.6 : 5.2) + (n - 0.5) * 0.8, x, y);
      h = inner ? 0.46 : frame ? 0.6 : 0.52;
      if ((x === 5 || x === 26) && y > 11 && y < 63) c = IVORY[3];
      if ((y === 12 || y === 62) && x > 4 && x < 27) c = y === 12 ? IVORY[3] : IVORY[6];
    }
    t.px(x, y, c, h);
  }
  for (const x of [4, 27]) for (const y of [76, 90]) rivet(t, x, y, GOLD, 6);
}

function hallCap(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 3);
    const edge = y < 2 || y > 29;
    t.px(x, y, edge ? GOLD[edge && y < 2 ? 4 : 2] : dpick(IVORY, 5.0 + (n - 0.5), x, y), edge ? 0.62 : 0.55);
  }
}

function hallLow(t, seed) {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const g = tn(x * 3, y * 0.4, 32, 24, 4, seed, 2);
    t.px(x, y, y < 3 ? GOLD[y === 0 ? 5 : 3] : dpick(HONEY, 3.4 + (g - 0.5) * 1.4, x, y), y < 3 ? 0.7 : 0.55);
  }
}

/** The Halcyon Security crest in gold leaf: a shield between two wings, a star above (64 x 64, alpha). */
function crest(t) {
  const cx = 32, cy = 34;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d > 29 && d < 31.5) t.glow(x, y, GOLD[d < 30.2 ? 5 : 3], GOLD[2]);
    else if (d > 26 && d < 27.2) t.px(x, y, GOLD[3], 0.6);
  }
  // wings: feathered arcs
  for (let s = -1; s <= 1; s += 2) {
    for (let k = 0; k < 6; k++) {
      for (let u = 0; u < 15 - k * 1.5; u++) {
        const x = cx + s * (7 + u), y = cy - 6 + k * 3 - Math.round(u * u * 0.03);
        t.glow(x, y, GOLD[k < 2 ? 5 : 4], GOLD[3]).px(x, y + 1, GOLD[2], 0.55);
      }
    }
  }
  // shield
  for (let y = cy - 9; y < cy + 12; y++) {
    const half = y < cy + 2 ? 7 : Math.round(7 - (y - cy - 2) * 0.7);
    for (let x = cx - half; x <= cx + half; x++) {
      const rim = Math.abs(x - cx) >= half - 1 || y === cy - 9;
      t.glow(x, y, rim ? GOLD[5] : (x + y) % 2 ? GOLD[3] : GOLD[4], rim ? GOLD[4] : GOLD[2]);
    }
  }
  for (let y = cy - 6; y < cy + 7; y++) t.glow(cx, y, '#fff8e0');
  for (let x = cx - 4; x <= cx + 4; x++) t.glow(x, cy - 1, '#fff8e0');
  // star
  for (const [dx, dy] of [[0, -16], [0, -17], [0, -18], [-1, -17], [1, -17], [0, -15], [-2, -17], [2, -17]]) t.glow(cx + dx, cy + dy, '#fffbe8');
}

/** A cadet's place in the line: a gold ring set in the floor (alpha). */
function mark(t) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const d = Math.hypot(x + 0.5 - 16, (y + 0.5 - 16) * 1.0);
    if (d > 9.5 && d < 12) t.px(x, y, d < 10.6 ? GOLD[5] : GOLD[3], 0.6);
  }
}

/** A gold banner: the crest in white on gold silk, a fringe (screen: shown glowing). 32 x 64. */
function banner(t) {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) {
    const fold = Math.sin(x * 0.55) * 0.5 + 0.5;
    let c = dpick(GOLD, 3.2 + fold * 1.4, x, y);
    if (y > 56) c = (x + (y >> 1)) % 3 ? GOLD[2] : GOLD[5];
    if (x < 2 || x > 29) c = GOLD[1];
    if (y < 3) c = GOLD[6];
    t.px(x, y, c, 0.5);
  }
  // the crest: wings and a shield
  const cx = 16, cy = 26;
  for (let s = -1; s <= 1; s += 2) for (let u = 0; u < 9; u++) for (let k = 0; k < 3; k++) t.px(cx + s * (4 + u), cy - 3 + k * 2 - Math.round(u * 0.25), '#fff8e0');
  for (let y = cy - 5; y < cy + 7; y++) {
    const half = y < cy + 1 ? 4 : 4 - (y - cy - 1) * 0.6;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) t.px(x, y, '#fffbea');
  }
  for (let y = cy - 3; y < cy + 4; y++) t.px(cx, y, GOLD[3]);
  for (let y = 40; y < 52; y += 4) for (let x = 8; x < 24; x++) if ((x + y) % 4 < 2) t.px(x, y, GOLD[5]);
}

/**
 * The hall's tall windows (a window pair, 64 x 96, opaque): gold frames round two lancets full of
 * the sunset that never ends. Painted in, not seen through: the dream has no outside.
 */
function hallWindow(t, seed) {
  const SKY = ['#e8705a', '#f48a5e', '#ffa468', '#ffbe78', '#ffd48e', '#ffe4a8', '#fff0c8', '#fff8e4'];
  for (let y = 0; y < 96; y++) for (let x = 0; x < 64; x++) {
    let c, h = 0.5;
    if (y >= 72) {                               // wainscot, as the wall
      const g = tn(x * 3, y * 0.4, 64, 96, 8, seed + 3, 2);
      c = dpick(HONEY, 3.6 + (g - 0.5) * 1.6 + (x === 0 || x === 63 ? -1 : 0), x, y);
      h = 0.56;
    } else if (y >= 68) {
      c = GOLD[y === 68 ? 5 : y === 71 ? 2 : 4];
      h = 0.7;
    } else if (y < 6) {
      c = GOLD[y < 2 ? 5 : y === 5 ? 2 : 3];
      h = 0.68;
    } else {
      c = dpick(IVORY, 5.0 + (tn(x, y, 64, 96, 4, seed, 3) - 0.5) * 0.8, x, y);
      h = 0.55;
    }
    t.px(x, y, c, h);
  }
  // two lancets: a gold moulding, an arched head, the sunset inside (emissive)
  for (const x0 of [5, 35]) {
    const x1 = x0 + 23, y0 = 9, y1 = 64, cx = (x0 + x1) / 2, r = (x1 - x0) / 2;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const ay = y0 + r;
      const inArch = y >= ay || Math.hypot(x - cx, y - ay) <= r;
      if (!inArch) continue;
      const edge = y === y1 || x === x0 || x === x1 || (y < ay && Math.hypot(x - cx, y - ay) > r - 1.2);
      if (edge) { t.px(x, y, GOLD[x < cx ? 5 : 3], 0.72); continue; }
      const inner = y === y1 - 1 || x === x0 + 1 || x === x1 - 1 || (y < ay && Math.hypot(x - cx, y - ay) > r - 2.2);
      if (inner) { t.px(x, y, GOLD[2], 0.6); continue; }
      // the sky: warm at the top, white-gold low where the sun has just gone, soft cloud bands
      const k = (y - y0) / (y1 - y0);
      const cloud = tn(x * 0.5, y * 1.6, 64, 96, 4, seed + 11, 3);
      const v = 1.2 + k * 5.6 + (cloud > 0.6 ? (cloud - 0.6) * 6 : 0);
      const col = dpick(SKY, Math.min(7, v), x, y);
      // the panes glow, but softly: a full-strength sunset blooms the whole hall into haze
      t.glow(x, y, col, dim(col, 0.32));
      t.ht(x, y, 0.3);
    }
    // a cross of glazing bars
    for (let y = y0 + 3; y < y1; y++) t.px(Math.round(cx), y, GOLD[3], 0.62);
    for (const yb of [32, 48]) for (let x = x0 + 2; x < x1 - 1; x++) t.px(x, yb, GOLD[3], 0.62);
  }
  // the pier between the lancets: a slim gold pilaster
  for (let y = 8; y < 66; y++) for (let x = 30; x < 34; x++) t.px(x, y, GOLD[x === 30 ? 5 : x === 33 ? 2 : 4], 0.7);
}

function goldLeaf(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 4, seed, 3);
    t.px(x, y, dpick(GOLD, 3.6 + (n - 0.5) * 2, x, y), 0.5 + (n - 0.5) * 0.1);
  }
}

// ---------------------------------------------------------------- nyx: the Meridian, whole

/** Jade deck plates: two plates per cell, brass rivets, a fine lit lip (value contrast ~12%). */
/**
 * Jade deck plates, one per cell, calm: a soft seam, a brass stud where four plates meet, and on the
 * alternate plate a small brass compass inlay (mixed in at random, so no grid of motifs shows).
 */
function merFloor(t, seed, alt) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 3);
    const wear = tn(x + 7, y + 3, 32, 32, 4, seed + 9, 2);
    t.px(x, y, dpick(JADE, 3.0 + (n - 0.5) * 0.7 + (wear - 0.5) * 0.4, x, y), 0.52 + (n - 0.5) * 0.04);
  }
  for (let i = 0; i < 32; i++) {
    t.px(i, 0, JADE[2], 0.44).px(0, i, JADE[2], 0.44).px(i, 1, JADE[4], 0.52).px(1, i, JADE[4], 0.52);
  }
  rivet(t, 1, 1, BRASS, 5);
  if (alt) {
    // a brass compass rose, small and low: the Meridian's crest
    const cx = 16, cy = 16;
    for (let k = -4; k <= 4; k++) {
      t.px(cx + k, cy, BRASS[Math.abs(k) < 2 ? 4 : 3], 0.6).px(cx, cy + k, BRASS[Math.abs(k) < 2 ? 4 : 3], 0.6);
    }
    for (let a = 0; a < 24; a++) {
      const r = 6, ang = (a / 24) * Math.PI * 2;
      t.px(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), BRASS[2], 0.56);
    }
    t.px(cx, cy, BRASS[5], 0.66);
  }
}

/** Teal panels with a brass rail and a warm lamp strip; a planter niche every unit. 32 x 96. */
function merWall(t, seed) {
  for (let y = 0; y < 96; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 96, 2, seed, 3);
    let c = dpick(TEAL, 4.4 + (n - 0.5) * 0.8 - (x === 0 || x === 31 ? 1.2 : 0), x, y), h = 0.5;
    if (y === 30 || y === 31) { c = BRASS[y === 30 ? 5 : 2]; h = 0.66; }
    if (y >= 74) { c = dpick(TEAL, 2.8 + (n - 0.5) * 0.6, x, y); h = 0.56; }
    if (y === 74) { c = BRASS[4]; h = 0.7; }
    if (y < 4) { c = BRASS[y < 1 ? 5 : 3]; h = 0.66; }
    t.px(x, y, c, h);
  }
  // the lamp strip: warm white, glowing
  for (let x = 3; x < 29; x++) for (const y of [24, 25]) t.glow(x, y, y === 24 ? '#fff4d8' : '#ffd890', y === 24 ? '#fff0c8' : '#e8b860');
  // a round porthole frame of brass with green behind (the gardens on the next deck)
  const cx = 16, cy = 50;
  for (let y = 40; y < 61; y++) for (let x = 6; x < 27; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d < 8) t.glow(x, y, dpick(JADE, 5 + (8 - d) * 0.3, x, y), d < 5 ? '#2a6a40' : '#1a4a2c');
    else if (d < 10) t.px(x, y, d < 9 ? BRASS[4] : BRASS[2], 0.68);
  }
  for (const x of [4, 27]) rivet(t, x, 84, BRASS, 5);
}

function merCap(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 3);
    t.px(x, y, y < 2 || y > 29 ? BRASS[y < 2 ? 4 : 2] : dpick(TEAL, 5 + (n - 0.5), x, y), 0.56);
  }
}

function merLow(t, seed) {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 24, 2, seed, 3);
    t.px(x, y, y < 2 ? BRASS[y === 0 ? 5 : 3] : dpick(TEAL, 3.6 + (n - 0.5), x, y), y < 2 ? 0.68 : 0.54);
  }
}

/** A woven runner: deep green with a gold border and a diamond repeat (tiles along z). */
function runner(t, ramp, border) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const weave = (x + y) % 2 ? 0.2 : -0.2;
    const dia = Math.abs((x % 16) - 8) + Math.abs((y % 16) - 8);
    let v = 3.2 + weave + (dia < 4 ? 1.2 : dia < 5 ? -0.6 : 0);
    let c = dpick(ramp, v, x, y);
    if (x < 3 || x > 28) c = x === 1 || x === 30 ? border[5] : border[3];
    t.px(x, y, c, 0.5 + weave * 0.05);
  }
}

/** The helm's display (2 frames): a course line through the stars, the ship's name. 64 x 32. */
function merScreen(t, f) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) {
    t.px(x, y, y % 2 ? '#06201a' : '#082a20', 0.45);
    t.emit(x, y, y % 2 ? '#031410' : '#05201a');
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash(i, 3, 41) * 60) + 2, y = Math.floor(hash(i, 5, 43) * 18) + 2;
    t.glow(x, y, '#c8ffe8');
  }
  // the course: a gold dashed curve from the ship (left) toward the target (right), marching with the frame
  for (let x = 4; x < 58; x++) {
    const y = Math.round(20 - Math.sin((x / 58) * Math.PI) * 9);
    if ((x + f * 2) % 4 < 2) t.glow(x, y, '#ffe08a');
  }
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) t.glow(56 + dx, 19 + dy, '#9ff8ff');
  drawText('MERIDIAN', 4, 24, (x, y) => t.glow(x, y, '#7fffc8'));
}

/** A brass plaque: MERIDIAN · CONCLAVE VANGUARD (64 x 16). */
function merPlaque(t) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 64; x++) {
    const edge = x < 1 || x > 62 || y < 1 || y > 14;
    t.px(x, y, edge ? BRASS[2] : dpick(BRASS, 3.4 + Math.sin(x * 0.2) * 0.3, x, y), edge ? 0.6 : 0.52);
  }
  const s = 'MERIDIAN';
  drawText(s, Math.floor((64 - textWidth(s)) / 2), 2, (x, y) => t.px(x, y, '#2a1c06', 0.4));
  const s2 = 'VANGUARD';
  drawText(s2, Math.floor((64 - textWidth(s2)) / 2), 9, (x, y) => t.px(x, y, '#3a2a0c', 0.42));
}

// ---------------------------------------------------------------- orion: the pearl bridge

function pearlFloor(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 3);
    const sheen = Math.max(0, 1 - Math.abs(x - y - 4) / 10) * 0.4;
    t.px(x, y, dpick(PEARL, 4.4 + (n - 0.5) * 0.7 + sheen, x, y), 0.53);
  }
  for (let i = 0; i < 32; i++) {
    t.px(i, 0, PEARL[2], 0.42).px(0, i, PEARL[2], 0.42).px(i, 1, PEARL[6]).px(1, i, PEARL[6]);
  }
  // a thin mint inlay line through the slab, glowing faintly
  for (let i = 4; i < 28; i++) t.glow(i, 16, MINT[3], MINT[1]);
}

function pearlWall(t, seed) {
  for (let y = 0; y < 96; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 96, 2, seed, 3);
    let c = dpick(PEARL, 4.8 + (n - 0.5) * 0.6, x, y), h = 0.5;
    const seam = x === 0 || x === 31 || y === 48;
    if (seam) { c = PEARL[3]; h = 0.4; }
    if (y < 3 || (y > 76 && y < 79)) { c = GOLD[y < 1 || y === 77 ? 5 : 3]; h = 0.68; }
    if (y > 79) { c = dpick(PEARL, 4.6 + (n - 0.5) * 0.5, x, y); h = 0.56; }
    t.px(x, y, c, h);
  }
  for (let y = 10; y < 40; y++) t.glow(16, y, MINT[3], MINT[1]);
}

function pearlCap(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 3);
    t.px(x, y, y < 2 ? GOLD[4] : dpick(PEARL, 5.2 + (n - 0.5) * 0.6, x, y), 0.55);
  }
}

function pearlLow(t, seed) {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 24, 2, seed, 3);
    t.px(x, y, y < 2 ? GOLD[y === 0 ? 5 : 3] : dpick(PEARL, 5.2 + (n - 0.5) * 0.6, x, y), y < 2 ? 0.68 : 0.54);
  }
}

/** Dark polished glass for HALCYON's dais: deep teal-black, a soft sky reflection, a cyan seam ring. */
function glassTop(t, seed) {
  const DEEP = ['#04090c', '#071016', '#0b1820', '#10222c', '#183240', '#244658'];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 3);
    const sheen = Math.max(0, 1 - Math.abs(x + y - 30) / 7) * 1.4;
    t.px(x, y, dpick(DEEP, 1.4 + (n - 0.5) * 0.8 + sheen, x, y), 0.5);
  }
  for (let i = 0; i < 32; i++) {
    t.glow(i, 0, MINT[2], MINT[0]).glow(0, i, MINT[2], MINT[0]);
  }
}

/** Every console the same calm line (2 frames). 64 x 32. */
function screenOk(t, f) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) {
    t.px(x, y, y % 2 ? '#0a2a24' : '#0c322a', 0.45);
    t.emit(x, y, y % 2 ? '#04140f' : '#061c16');
  }
  for (let x = 3; x < 61; x++) t.glow(x, 12, '#8af0c8');
  for (let x = 3; x < 61; x += 8) t.glow(x, 13, '#4cc49a');
  drawText(f ? 'NOMINAL' : 'ALL GREEN', 4, 20, (x, y) => t.glow(x, y, '#d4fff0'));
  for (let i = 0; i < 4; i++) t.glow(54 + i, 21, f ? '#8af0c8' : '#2a8a6a');
}

// ---------------------------------------------------------------- sera: the fields

/** Sunlit stubble and grass under the wheat (the cards stand on it): warm, low contrast. */
function wheatGround(t, seed, flowers) {
  const r = rng(seed);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 4), m = tn(x, y, 32, 32, 4, seed + 9, 2);
    const blade = hash(x, y * 3 + (x >> 2), seed) < 0.22;
    const v = 4.2 + (n - 0.5) * 1.6 + (blade ? 0.9 : 0) - (m < 0.3 ? 0.5 : 0);
    t.px(x, y, m < 0.36 ? dpick(GRASS, v - 0.6, x, y) : dpick(WHEAT, v, x, y), 0.5 + (blade ? 0.06 : 0));
  }
  if (flowers) {
    const cols = ['#fff6f0', '#ffb8d0', '#a8c8ff', '#fff0a0', '#ffd0e8'];
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(r() * 30) + 1, y = Math.floor(r() * 30) + 1, c = cols[i % cols.length];
      t.px(x, y, c, 0.62).px(x + 1, y, c, 0.6).px(x, y + 1, c, 0.6).px(x + 1, y + 1, '#ffe070', 0.64);
    }
  }
}

function pathTex(t, seed) {
  const r = rng(seed);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 2, seed, 4);
    t.px(x, y, dpick(EARTH, 4.6 + (n - 0.5) * 1.4, x, y), 0.48 + (n - 0.5) * 0.06);
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * 31), y = Math.floor(r() * 31), c = EARTH[5 + (i % 2)];
    t.px(x, y, c, 0.62).px(x + 1, y, EARTH[4], 0.58);
  }
}

/** Clear river water (4 frames): sky-blue, sun glints that travel downstream. */
function river(t, f, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y + f * 4, 32, 32, 2, seed, 3);
    const ripple = Math.sin((y + f * 8) * 0.45 + n * 5) * 0.5 + 0.5;
    t.px(x, y, dpick(WATER, 2.0 + ripple * 1.6 + (n - 0.5) * 0.8, x, y), 0.5 + ripple * 0.04);
  }
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(hash(i, 1, seed) * 30), y = (Math.floor(hash(i, 2, seed) * 32) + f * 8) % 32;
    t.glow(x, y, WATER[7], '#a0e8ff').glow(x + 1, y, WATER[6], '#5ab0d8');
  }
}

/** The river bank: grass lip, warm earth, a few pebbles (32 x 24). */
function bank(t, seed) {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 24, 2, seed, 3);
    const lip = y < 4 + Math.round(n * 2);
    t.px(x, y, lip ? dpick(GRASS, 3.6 + (n - 0.5) * 1.4, x, y) : dpick(EARTH, 3.6 + (n - 0.5) * 1.2 - y * 0.05, x, y), lip ? 0.58 : 0.5);
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(hash(i, 4, seed) * 30), y = 8 + Math.floor(hash(i, 6, seed) * 14);
    t.px(x, y, EARTH[6], 0.66).px(x + 1, y, EARTH[5], 0.62);
  }
}

function riverbed(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 32, 32, 4, seed, 3);
    t.px(x, y, dpick(EARTH, 3.2 + (n - 0.5) * 2, x, y), 0.5 + (n - 0.5) * 0.2);
  }
}

/** Plaster wall with a green-shuttered window and a door: the house front, one unit per texel row of 32. */
function houseWall(t, seed) {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const n = tn(x, y, 64, 64, 2, seed, 4);
    t.px(x, y, dpick(PLASTER, 4.4 + (n - 0.5) * 1.2, x, y), 0.5 + (n - 0.5) * 0.05);
  }
  // timber band and the stone footing
  for (let x = 0; x < 64; x++) {
    t.px(x, 4, HONEY[2], 0.62).px(x, 5, HONEY[4], 0.62);
    for (let y = 56; y < 64; y++) t.px(x, y, dpick(EARTH, 4 + ((x >> 3) + (y >> 2)) % 2 * 0.8, x, y), (x % 8 === 0 || y === 59) ? 0.4 : 0.6);
  }
}

/** A lit window with green shutters (the house's windows are WARDEN's surfaces): 32 x 32. */
function houseWindow(t) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const shutter = x < 6 || x > 25;
    const frame = !shutter && (x < 8 || x > 23 || y < 4 || y > 27 || x === 16 || y === 15);
    let c;
    if (shutter) c = (y % 4 === 0) ? '#2a5a3a' : '#3c7a4c';
    else if (frame) c = '#f4ead8';
    else c = y < 15 ? '#ffd890' : '#ffc070';
    t.px(x, y, c, frame ? 0.62 : 0.45);
    if (!shutter && !frame) t.emit(x, y, y < 15 ? '#ffd890' : '#f0a850');
  }
}

/** Terracotta roof tiles in rows (tiles along x, rows down y). */
function roofTex(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const rowY = y % 8, off = (y >> 3) % 2 ? 4 : 0;
    const tileX = (x + off) % 8;
    const n = tn(x, y, 32, 32, 2, seed, 3);
    const v = 3.8 + (n - 0.5) * 1.2 - rowY * 0.18 + (tileX === 0 ? -1 : 0) + (rowY === 0 ? 0.9 : 0);
    t.px(x, y, dpick(TERRA, v, x, y), 0.6 - rowY * 0.02 - (tileX === 0 ? 0.08 : 0));
  }
}

/** White-painted wood: fence boards and the footbridge planks. */
function woodTex(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const g = tn(x * 0.5, y * 3, 32, 32, 4, seed, 2);
    const seam = y % 8 === 0;
    t.px(x, y, seam ? WHITE[2] : dpick(WHITE, 4.4 + (g - 0.5) * 1.2, x, y), seam ? 0.42 : 0.54);
  }
}

// flora atlas (alpha, 128 x 64): wheat sheaf 0-31, tall grass 32-63, poppies 64-95, daisies 96-127
export const FLORA = { wheat: [0, 0, 32, 64], grass: [32, 0, 32, 64], poppy: [64, 0, 32, 64], daisy: [96, 0, 32, 64] };

function flora(t) {
  const stalk = (x0, x1, top, ramp, seed, head) => {
    const r = rng(seed);
    for (let i = 0; i < 14; i++) {
      const bx = x0 + 2 + Math.floor(r() * (x1 - x0 - 4)), h = top + Math.floor(r() * 14), lean = (r() - 0.5) * 6;
      for (let y = 63; y > h; y--) {
        const k = (63 - y) / (63 - h);
        const x = Math.round(bx + lean * k * k);
        t.px(x, y, ramp[2 + Math.round(k * 2)]);
      }
      head(Math.round(bx + lean), h, r);
    }
  };
  // wheat: golden stalks, plump heads
  stalk(0, 32, 14, WHEAT, 3, (x, y) => {
    for (let k = 0; k < 7; k++) { t.px(x + (k % 2 ? 1 : -1), y + k, WHEAT[6 - (k % 3)]); t.px(x, y + k, WHEAT[7]); }
    t.px(x, y - 1, WHEAT[5]).px(x, y - 2, WHEAT[4]);
  });
  // tall grass: thin green-gold blades
  stalk(32, 64, 18, GRASS, 5, (x, y) => { t.px(x, y, GRASS[5]).px(x + 1, y + 1, GRASS[4]); });
  // poppies: red cups on green stems
  stalk(64, 96, 26, GRASS, 7, (x, y, r) => {
    const c = r() < 0.5 ? '#ff5a4a' : '#ff8a5a';
    for (const [dx, dy] of [[-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [0, -1]]) t.glow(x + dx, y + dy, c, '#a02010');
    t.px(x, y + 1, '#3a1010');
  });
  // daisies: white stars with gold hearts
  stalk(96, 128, 28, GRASS, 9, (x, y) => {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0]]) t.px(x + dx, y + dy, '#fffaf0');
    t.glow(x, y, '#ffd040', '#806010');
  });
}

// ---------------------------------------------------------------- backdrops (raw, 1024 x 512)

/** Paint at half size, then upscale with nearest neighbour, so painted skies keep the pixel grain. */
function chunky(paint) {
  const small = makeCanvas(512, 256);
  paint(small.getContext('2d'), 512, 256);
  const cv = makeCanvas(1024, 512);
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(small, 0, 0, 1024, 512);
  return cv;
}

function softBlob(g, x, y, rx, ry, color, alpha) {
  const grad = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  g.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
  g.translate(-x, -y);
  g.fillStyle = grad;
  g.fillRect(x - Math.max(rx, ry), y - Math.max(rx, ry), Math.max(rx, ry) * 2, Math.max(rx, ry) * 2);
  g.restore();
}

/** Kade's windows: a gold-hour sky that never sets, banks of lit cloud, a sun haze low on the left. */
function bdGold() {
  return chunky((g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#f0b868');
    sky.addColorStop(0.45, '#ffd590');
    sky.addColorStop(0.7, '#ffe8bc');
    sky.addColorStop(1, '#f4c880');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    softBlob(g, W * 0.3, H * 0.62, 150, 90, '#fff8e0', 0.9);
    const r = rng(17);
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = H * (0.25 + r() * 0.6), rx = 40 + r() * 90, ry = 8 + r() * 14;
      softBlob(g, x, y, rx, ry, r() < 0.5 ? '#fff0d0' : '#ffd8a0', 0.55);
      softBlob(g, x + 6, y + ry * 0.6, rx * 0.8, ry * 0.5, '#e8a058', 0.35);
    }
  });
}

/** The Meridian's viewport: stars streaming past (still flying), a green-gold nebula ahead. */
function bdStars() {
  return chunky((g, W, H) => {
    const sky = g.createLinearGradient(0, 0, W, H);
    sky.addColorStop(0, '#0a1a2a');
    sky.addColorStop(0.5, '#10283a');
    sky.addColorStop(1, '#0c1e2c');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    softBlob(g, W * 0.62, H * 0.5, 220, 110, '#3a9a7a', 0.55);
    softBlob(g, W * 0.7, H * 0.46, 120, 60, '#c8e8a0', 0.35);
    softBlob(g, W * 0.4, H * 0.58, 160, 70, '#2a6a8a', 0.4);
    const r = rng(23);
    for (let i = 0; i < 220; i++) {
      const x = r() * W, y = r() * H, len = 4 + Math.pow(r(), 2) * 46, b = 0.35 + r() * 0.65;
      const grad = g.createLinearGradient(x, y, x + len, y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, `rgba(${r() < 0.3 ? '255,240,200' : '220,250,255'},${b})`);
      g.fillStyle = grad;
      g.fillRect(x, y, len, 1);
    }
  });
}

/** Sera's fields: a peach-to-blue morning, rolling gold hills, a far line of trees, soft cloud. */
function bdFields() {
  return chunky((g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#9cc8ec');
    sky.addColorStop(0.42, '#d8e4f0');
    sky.addColorStop(0.62, '#ffe0c0');
    sky.addColorStop(0.72, '#ffd4a0');
    sky.addColorStop(1, '#e8b860');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    softBlob(g, W * 0.65, H * 0.5, 180, 90, '#fff6e0', 0.85);
    const r = rng(31);
    for (let i = 0; i < 14; i++) softBlob(g, r() * W, H * (0.12 + r() * 0.3), 50 + r() * 70, 8 + r() * 10, '#ffffff', 0.55);
    const hill = (base, amp, freq, phase, color) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) g.lineTo(x, H * base - Math.sin(x * freq + phase) * amp - Math.sin(x * freq * 2.7 + phase) * amp * 0.3);
      g.lineTo(W, H);
      g.closePath();
      g.fill();
    };
    hill(0.66, 10, 0.012, 1.0, '#c8b08a');
    for (let i = 0; i < 40; i++) {
      const x = r() * W, y = H * 0.64 - r() * 6;
      softBlob(g, x, y, 6 + r() * 6, 5 + r() * 4, '#7a8a5a', 0.8);
    }
    hill(0.72, 14, 0.009, 2.2, '#e0b862');
    hill(0.82, 12, 0.014, 0.4, '#ecc060');
    hill(0.92, 8, 0.02, 3.1, '#d8a440');
  });
}

// ---------------------------------------------------------------- registry

const floor = { w: 32, h: 32, wrapX: true, wrapY: true };
const wall = { w: 32, h: 96, wrapX: true };

export const TEXTURES = {
  dr_hall_floor: { ...floor, strength: 1.6, paint: (t) => hallFloor(t, 401, false) },
  dr_hall_floor_b: { ...floor, strength: 1.6, paint: (t) => hallFloor(t, 403, true) },
  dr_hall_wall: { ...wall, strength: 2.0, paint: (t) => hallWall(t, 405) },
  dr_hall_cap: { ...floor, strength: 1.4, paint: (t) => hallCap(t, 407) },
  dr_hall_low: { w: 32, h: 24, wrapX: true, strength: 1.8, paint: (t) => hallLow(t, 409) },
  dr_crest: { w: 64, h: 64, alpha: true, strength: 1.4, paint: crest },
  dr_mark: { w: 32, h: 32, alpha: true, strength: 1.2, paint: mark },
  dr_banner: { w: 32, h: 64, strength: 1.2, paint: banner },
  dr_gold: { ...floor, strength: 1.4, paint: (t) => goldLeaf(t, 411) },
  dr_bd_gold: { w: 1024, h: 512, raw: bdGold, emissiveIsMap: true },
  dr_hall_window: { w: 64, h: 96, strength: 1.6, paint: (t) => hallWindow(t, 413) },
  dr_glass: { w: 32, h: 32, wrapX: true, wrapY: true, strength: 0.8, paint: (t) => glassTop(t, 431) },

  dr_mer_floor: { ...floor, strength: 1.8, paint: (t) => merFloor(t, 421, false) },
  dr_mer_floor_b: { ...floor, strength: 1.8, paint: (t) => merFloor(t, 423, true) },
  dr_mer_wall: { ...wall, strength: 2.0, paint: (t) => merWall(t, 425) },
  dr_mer_cap: { ...floor, strength: 1.4, paint: (t) => merCap(t, 427) },
  dr_mer_low: { w: 32, h: 24, wrapX: true, strength: 1.8, paint: (t) => merLow(t, 429) },
  dr_runner: { ...floor, strength: 1.2, paint: (t) => runner(t, JADE, BRASS) },
  dr_mer_screen: { w: 64, h: 32, frames: 2, fps: 2, strength: 0.6, paint: merScreen },
  dr_mer_plaque: { w: 64, h: 16, strength: 1.4, paint: merPlaque },
  dr_bd_stars: { w: 1024, h: 512, raw: bdStars, emissiveIsMap: true },

  dr_pearl_floor: { ...floor, strength: 1.2, paint: (t) => pearlFloor(t, 441) },
  dr_pearl_wall: { ...wall, strength: 1.6, paint: (t) => pearlWall(t, 443) },
  dr_pearl_cap: { ...floor, strength: 1.2, paint: (t) => pearlCap(t, 445) },
  dr_pearl_low: { w: 32, h: 24, wrapX: true, strength: 1.4, paint: (t) => pearlLow(t, 447) },
  dr_runner_pearl: { ...floor, strength: 1.0, paint: (t) => runner(t, GOLD, PEARL) },
  dr_screen_ok: { w: 64, h: 32, frames: 2, fps: 1, strength: 0.6, paint: screenOk },

  dr_wheat: { ...floor, strength: 1.8, paint: (t) => wheatGround(t, 461, false) },
  dr_meadow: { ...floor, strength: 1.8, paint: (t) => wheatGround(t, 463, true) },
  dr_path: { ...floor, strength: 1.6, paint: (t) => pathTex(t, 465) },
  dr_river: { ...floor, frames: 4, fps: 4, strength: 0.8, paint: (t, f) => river(t, f, 467) },
  dr_bank: { w: 32, h: 24, wrapX: true, strength: 1.8, paint: (t) => bank(t, 469) },
  dr_riverbed: { ...floor, strength: 1.6, paint: (t) => riverbed(t, 471) },
  dr_house: { w: 64, h: 64, wrapX: true, strength: 1.4, paint: (t) => houseWall(t, 473) },
  dr_house_win: { w: 32, h: 32, strength: 1.2, paint: houseWindow },
  dr_roof: { ...floor, strength: 2.0, paint: (t) => roofTex(t, 475) },
  dr_wood: { ...floor, strength: 1.6, paint: (t) => woodTex(t, 477) },
  dr_flora: { w: 128, h: 64, alpha: true, strength: 1.0, paint: flora },
  dr_bd_fields: { w: 1024, h: 512, raw: bdFields, emissiveIsMap: true },
};

