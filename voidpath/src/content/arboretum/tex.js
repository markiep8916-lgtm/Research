// arboretum: texture painters (browser, TECH_PLAN 3.12), imported by art.js. Pixel art at 32 px per
// world unit in three layers (colour, height, emissive), painted lazily.
//
// Palette (12.1): deep green and old garden steel; bioluminescent teal and violet; pink blooms; warm
// Tethys amber through the domes; the Choir in black and white-gold.
// Tiling rule (G2 bar 16): no floor carries one high-contrast blob per cell. Floors are low-contrast
// periodic noise with sparse small details; variety comes from the legend's mix, world-space decals
// (the decal atlas) and props.
//
// export const TEXTURES   { name: TextureDef }
//   floors   arb_moss / arb_moss_b (',' mix), arb_court / arb_court_b ('.'), arb_deck / arb_deck_b
//            ('='), arb_pad ('o'), arb_choir_floor / arb_choir_floor_b ('k')
//   walls    arb_wall (greenhouse glass and green steel, vines), arb_wall_side, arb_cap, arb_low,
//            arb_glass (dome windows onto Tethys), arb_door (the Choir door), arb_bed (raised bed
//            sides), arb_soil (bed and root-bank tops), arb_roots (root-bank sides)
//   water    arb_water (animated), arb_bank, arb_silt, arb_walkway
//   atlases  arb_flora (alpha plant cards), arb_tech (pods, pumps, terminals, planters), arb_decal
//            (alpha floor decals), arb_bark (trunks), arb_pod_screen (pod status plates)
//   backdrop arb_bd_dome (Tethys through the dome glass)
// export const FLORA, TECH, DECAL   atlas regions { x, y, w, h } in pixels; uvOf(atlas, region) -> uv rect

import { mix, shade, rng, bayer, Painter } from '../../art/painter.js';
import { RAMPS } from '../../art/palette.js';
import { fbm, vnoise, rivet, bolt, raised, recess, grime, drawText, clamp01 } from '../../art/tiles.js';

// ---------------------------------------------------------------- ramps (dark -> light)

export const MOSS = ['#0c1d12', '#14301b', '#1d4424', '#28582c', '#346d33', '#46863d', '#5f9f4b', '#86bc63'];
export const LEAF = ['#081a10', '#0f2e18', '#174322', '#215b2b', '#2e7535', '#40903f', '#5cac4f', '#8ccf72'];
export const FROND = ['#071c1a', '#0d3028', '#134535', '#1b5c44', '#277654', '#379166', '#53ad7c', '#86d0a0'];
export const VST = ['#111a19', '#1a2725', '#253633', '#334a45', '#456158', '#5d7c70', '#80a092', '#b0cbbd'];   // verdigris steel
export const STONE = ['#1b1a17', '#292723', '#38352f', '#4a463e', '#5f594f', '#787163', '#958c7b', '#bcb29d'];
export const SOIL = ['#100b07', '#1b130c', '#291c11', '#382717', '#4a341e', '#5f4527'];
export const BARK = ['#140d09', '#22160e', '#342215', '#47301c', '#5d4024', '#77542f', '#946c3e'];
export const PETAL = ['#2a0718', '#4f0f30', '#7c1a4c', '#ae2c6c', '#da4d8e', '#f37fb2', '#ffb6d5', '#ffe2ef'];
export const VIO = ['#160c2a', '#2a1b4f', '#422c7d', '#6343b0', '#8e6ee0', '#c3b1f7', '#ece2ff'];
export const BIO = ['#06262e', '#0b4350', '#0f6a78', '#16a0a8', '#3fe0c0', '#9df8e6', '#e6fffb'];
export const GOLD = RAMPS.gold;
export const CHOIR = ['#09080b', '#110f13', '#1a171c', '#252028', '#322b35', '#423943', '#5a4e58'];
const AM = RAMPS.amber;
const TE = RAMPS.teal;

const floor = { w: 32, h: 32, wrapX: true, wrapY: true };

/** Periodic noise over a tile of `p` px (seamless when the texture wraps). */
const tn = (x, y, seed, scale = 0.25, oct = 3, p = 32) => fbm(x * scale, y * scale, seed, oct, p * scale, p * scale);

// ---------------------------------------------------------------- organic strokes on Tex

/** Filled ellipse shaded by a ramp from an upper-left light (body tones lo..hi). */
function blob(t, cx, cy, rx, ry, ramp, { lo = 1, hi = ramp.length - 2, ht = 0.6, dither = true } = {}) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const light = clamp01(0.55 - dx * 0.35 - dy * 0.45 + (1 - d) * 0.25);
      const q = lo + light * (hi - lo);
      let k = Math.floor(q);
      if (dither && bayer(x, y, q - k)) k++;
      t.px(x, y, ramp[Math.min(hi, Math.max(lo, k))], ht + (1 - d) * 0.25);
    }
  }
}

/** A pointed leaf from (x, y) along angle a (radians) of length len and width w, midrib lit. */
function leaf(t, x, y, a, len, w, ramp, { vein = null, veinE = null, ht = 0.7, tone = 0 } = {}) {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const steps = Math.max(4, Math.round(len * 1.5));
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const half = w * Math.sin(Math.PI * Math.min(1, s * 1.15)) * (1 - s * 0.25);
    const px = x + ux * len * s, py = y + uy * len * s;
    for (let k = -Math.ceil(half); k <= Math.ceil(half); k++) {
      if (Math.abs(k) > half + 0.3) continue;
      const side = k < 0 ? -1 : 1;
      const lit = side * (nx * -0.6 + ny * -0.8) > 0;
      const edge = Math.abs(k) >= half - 0.6;
      const base = ramp.length > 6 ? 4 : 3;
      let idx = base + (lit ? 1 : -1) + tone - (edge ? 1 : 0) - Math.round(s * 1.2);
      idx = Math.max(0, Math.min(ramp.length - 1, idx));
      t.px(Math.round(px + nx * k), Math.round(py + ny * k), ramp[idx], ht + (1 - Math.abs(k) / (half + 1)) * 0.15);
    }
    if (vein && s > 0.05 && s < 0.9) {
      if (veinE) t.glow(Math.round(px), Math.round(py), vein, veinE);
      else t.px(Math.round(px), Math.round(py), vein, ht + 0.2);
    }
  }
}

/** A curved stem from (x0, y0) to (x1, y1) bowing by `bow` px. */
function stem(t, x0, y0, x1, y1, bow, c, ht = 0.6) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const x = x0 + (x1 - x0) * s + bow * Math.sin(Math.PI * s), y = y0 + (y1 - y0) * s;
    t.px(Math.round(x), Math.round(y), c, ht);
  }
}

/** Fern frond: a curved rachis with alternating leaflets shrinking toward the tip. */
function frond(t, x, y, a, len, ramp, { curl = 0.012, w = 5, glowTip = null } = {}) {
  let px = x, py = y, ang = a;
  const n = Math.round(len);
  for (let i = 0; i < n; i++) {
    const s = i / n;
    ang += curl;
    px += Math.cos(ang);
    py += Math.sin(ang);
    t.px(Math.round(px), Math.round(py), ramp[2], 0.75);
    if (i % 2 === 0 && s < 0.95) {
      const lw = w * (1 - s * 0.8);
      for (const side of [-1, 1]) {
        const la = ang + side * (1.15 - s * 0.3);
        leaf(t, px, py, la, lw + 1, Math.max(0.8, lw * 0.32), ramp, { ht: 0.68, tone: side < 0 ? 0 : -1 });
      }
    }
  }
  if (glowTip) t.glow(Math.round(px), Math.round(py), glowTip[0], glowTip[1]);
}

/** Outline the opaque pixels of a region with a dark contour (pixel-art cards read at distance). */
function outline(t, x0, y0, w, h, c = '#06100b') {
  const solid = (x, y) => x >= x0 && y >= y0 && x < x0 + w && y < y0 + h && t.c.alpha(x, y) > 0;
  const add = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (solid(x, y)) continue;
    if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) add.push([x, y]);
  }
  for (const [x, y] of add) t.put(x, y, c, 0.4);
}

// ---------------------------------------------------------------- floors

/** Moss carpet over soil: low-contrast clumps, tiny lit tips, a few glowing spore specks. */
function mossBase(t, seed, { soil = 0.18 } = {}) {
  const r = rng(seed);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, seed, 0.22, 3);
    const m = tn(x, y, seed + 9, 0.5, 2);
    let k = 3 + (n > 0.58 ? 1 : 0) + (n < 0.4 ? -1 : 0);
    if (bayer(x, y, clamp01((m - 0.45) * 1.6))) k += 1;
    const gap = n < soil + 0.22 && m < 0.4;
    t.px(x, y, gap ? SOIL[3] : MOSS[k], gap ? 0.3 : 0.45 + n * 0.25);
  }
  // clumps: 2-3 px cushions lit from the upper-left
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * 32), y = Math.floor(r() * 32);
    t.px(x, y, MOSS[5], 0.78).px(x + 1, y, MOSS[4], 0.72).px(x, y + 1, MOSS[4], 0.7).tone(x + 1, y + 1, -0.08);
  }
  for (let i = 0; i < 9; i++) t.px(Math.floor(r() * 32), Math.floor(r() * 32), MOSS[6], 0.8);
  return r;
}

function paintMoss(t) {
  const r = mossBase(t, 301);
  for (let i = 0; i < 3; i++) t.glow(Math.floor(r() * 32), Math.floor(r() * 32), BIO[5], BIO[3]);
}

function paintMossB(t) {
  const r = mossBase(t, 311, { soil: 0.1 });
  // an old steel deck seam under the moss: a broken line with two rivets showing through
  for (let x = 0; x < 32; x++) {
    if (tn(x, 9, 313, 0.4) > 0.55) continue;
    t.px(x, 9, VST[2], 0.35).px(x, 10, VST[4], 0.55);
  }
  rivet(t, 6, 12, VST, 6);
  rivet(t, 22, 12, VST, 6);
  // a sprig of clover-like leaves
  for (const [x, y] of [[14, 22], [26, 4]]) {
    t.px(x, y, LEAF[6], 0.8).px(x + 1, y, LEAF[5], 0.78).px(x, y + 1, LEAF[5], 0.76).px(x - 1, y + 1, LEAF[4], 0.74);
  }
  t.glow(Math.floor(r() * 32), Math.floor(r() * 32), VIO[5], VIO[3]);
}

/** Flagstones (2 x 2 offset per tile) with moss in the joints and a damp sheen. */
function courtBase(t, seed) {
  const r = rng(seed);
  const stones = [[0, 0, 18, 15], [18, 0, 14, 15], [0, 15, 11, 17], [11, 15, 21, 17]];
  for (const [x0, y0, w, h] of stones) {
    const tone = Math.floor(r() * 2);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const n = tn(x, y, seed + x0, 0.3, 2);
      let k = 3 + tone + (n > 0.6 ? 1 : 0) - (n < 0.35 ? 1 : 0);
      t.px(x, y, STONE[k], 0.55 + n * 0.1);
    }
    // bevel: lit top-left, dark bottom-right, mossy joint
    t.hline(x0, x0 + w - 1, y0, STONE[6], 0.65).vline(x0, y0, y0 + h - 1, STONE[5], 0.62);
    t.hline(x0, x0 + w - 1, y0 + h - 1, MOSS[2], 0.2).vline(x0 + w - 1, y0, y0 + h - 1, MOSS[2], 0.2);
    for (let x = x0; x < x0 + w; x++) if (r() < 0.35) t.px(x, y0 + h - 1, MOSS[4], 0.3);
  }
  return r;
}

function paintCourt(t) {
  const r = courtBase(t, 401);
  for (let i = 0; i < 4; i++) t.px(Math.floor(r() * 32), Math.floor(r() * 32), MOSS[5], 0.6);
}

function paintCourtB(t) {
  const r = courtBase(t, 411);
  // a cracked stone with a seedling pushing through
  const x = 6 + Math.floor(r() * 4), y = 20;
  t.line(x, y, x + 5, y + 4, STONE[1], 0.3).line(x + 5, y + 4, x + 9, y + 3, STONE[1], 0.3);
  t.px(x + 5, y + 3, LEAF[6], 0.8).px(x + 6, y + 2, LEAF[5], 0.8).px(x + 4, y + 2, LEAF[5], 0.78);
  t.glow(x + 5, y + 1, BIO[5], BIO[3]);
}

/** The dock deck: a green-painted steel grate, damp, with drain slots and a puddle sheen. */
function deckBase(t, seed) {
  t.rect(0, 0, 32, 32, VST[3], 0.55);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, seed, 0.2, 3);
    if (n > 0.62) t.px(x, y, VST[4]);
    else if (n < 0.36 && bayer(x, y, 0.4)) t.px(x, y, VST[2]);
  }
  t.hline(0, 31, 0, VST[0], 0.1).vline(0, 0, 31, VST[0], 0.1);
  t.hline(1, 31, 1, VST[5]).vline(1, 1, 31, VST[5]);
  t.hline(1, 31, 31, VST[1], 0.45).vline(31, 1, 31, VST[1], 0.45);
  for (const [x, y] of [[3, 3], [28, 3], [3, 28], [28, 28]]) bolt(t, x, y, VST, 7);
  // drain slots
  for (let k = 0; k < 4; k++) {
    const y = 8 + k * 5;
    for (let x = 9; x < 23; x++) t.px(x, y, VST[0], 0.15).px(x, y + 1, VST[5], 0.6);
  }
}

function paintDeck(t) {
  deckBase(t, 501);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (tn(x, y, 503, 0.18, 2) > 0.66) t.tint(x, y, '#2a5a5e', 0.35);
  }
}

function paintDeckB(t) {
  deckBase(t, 511);
  // moss creeping in from a corner
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const v = tn(x, y, 513, 0.3, 2) + (x + y < 18 ? 0.25 : -0.2);
    if (v > 0.62) t.px(x, y, MOSS[v > 0.72 ? 4 : 3], 0.6);
  }
}

/** The Moth's pad: plate steel with a faint teal grid (the ring itself is a decal). */
function paintPad(t) {
  deckBase(t, 601);
  for (let i = 0; i < 32; i += 8) {
    t.px(i, 16, TE[3], 0.5);
    t.px(16, i, TE[3], 0.5);
  }
  t.glow(16, 16, TE[4], TE[3]);
}

/** The Choir floor: black polished stone, gold inlay lines on the tile edges, faint reflections. */
function choirBase(t, seed) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, seed, 0.15, 3);
    const k = 2 + (n > 0.6 ? 1 : 0) + (n > 0.72 ? 1 : 0) - (n < 0.32 ? 1 : 0);
    t.px(x, y, CHOIR[k], 0.5);
    // marble veins
    const v = Math.abs(tn(x, y, seed + 3, 0.12, 3) - 0.5);
    if (v < 0.02) t.px(x, y, CHOIR[5], 0.52);
  }
  for (let i = 0; i < 32; i++) {
    t.glow(i, 0, GOLD[3], '#5a4210');
    t.glow(0, i, GOLD[3], '#5a4210');
  }
}

function paintChoirFloor(t) {
  choirBase(t, 701);
}

function paintChoirFloorB(t) {
  choirBase(t, 711);
  // a small gold star inlay at the centre
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) t.glow(16 + dx, 16 + dy, GOLD[4], GOLD[2]);
}

// ---------------------------------------------------------------- walls

/**
 * The greenhouse wall (32 x 96, 3 units): a stone planter skirt, then dark glass panes between
 * verdigris mullions, foliage silhouettes behind the glass, vines climbing the steel with glowing
 * nodes, and a cornice. Light from the upper-left is baked into bevels.
 */
function paintWall(t) {
  const r = rng(801);
  // glass field with depth: foliage behind it in two layers and condensation
  for (let y = 10; y < 74; y++) for (let x = 0; x < 32; x++) {
    const n = fbm(x / 10, y / 14, 803, 3, 3.2, 0);
    const far = n > 0.55 ? FROND[2] : n > 0.45 ? FROND[1] : '#0b1f1f';
    t.px(x, y, far, 0.3);
    const near = fbm(x / 6, y / 8, 805, 2, 32 / 6, 0);
    if (near > 0.6 && y > 30) t.px(x, y, near > 0.68 ? LEAF[3] : LEAF[2], 0.32);
    if (bayer(x, y, 0.06 + (y - 10) / 640)) t.tint(x, y, '#9fd8c8', 0.12);
  }
  // warm Tethys glare on the glass, upper half
  for (let i = 0; i < 26; i++) {
    const x = 3 + i, y = 40 - i;
    if (y > 10) t.px(x, y, '#ffd59a33').px(x, y + 1, '#ffd59a1f');
  }
  // mullions every 16 px and a transom
  for (const x0 of [0, 16]) {
    t.rect(x0, 8, 3, 66, VST[3], 0.78);
    t.vline(x0, 8, 73, VST[5], 0.82).vline(x0 + 2, 8, 73, VST[1], 0.7);
    for (let y = 14; y < 72; y += 12) rivet(t, x0 + 1, y, VST, 6);
  }
  t.rect(0, 40, 32, 3, VST[3], 0.78);
  t.hline(0, 31, 40, VST[5], 0.82).hline(0, 31, 42, VST[1], 0.7);
  // cornice
  raised(t, 0, 0, 32, 8, VST[3], VST[5], VST[1], 0.82);
  for (let x = 2; x < 32; x += 6) rivet(t, x, 3, VST, 6);
  t.hline(0, 31, 8, '#0a1412', 0.4);
  // stone planter skirt (bottom 22 px)
  for (let y = 74; y < 96; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 807, 0.3, 2, 32);
    t.px(x, y, STONE[3 + (n > 0.58 ? 1 : 0) - (n < 0.36 ? 1 : 0)], 0.55);
  }
  t.hline(0, 31, 74, STONE[6], 0.7).hline(0, 31, 75, STONE[5], 0.68);
  for (const x of [10, 26]) t.vline(x, 76, 95, STONE[1], 0.3).vline(x + 1, 76, 95, STONE[5], 0.6);
  // moss spilling over the skirt and pooling at its foot
  for (let x = 0; x < 32; x++) {
    const drop = Math.floor(2 + tn(x, 0, 809, 0.35, 2) * 7);
    for (let y = 73; y < 73 + drop; y++) t.px(x, y, MOSS[y === 73 ? 5 : 4 - ((y - 73) >> 2)], 0.75);
    const foot = Math.floor(tn(x, 1, 811, 0.4, 2) * 4);
    for (let y = 95 - foot; y < 96; y++) t.px(x, y, MOSS[3], 0.6);
  }
  // a vine climbing the mullion at x 1 and wandering across the glass
  let vx = 2;
  for (let y = 94; y > 6; y--) {
    vx += Math.round(Math.sin(y * 0.21) * 0.8);
    vx = Math.max(1, Math.min(30, vx));
    t.px(vx, y, LEAF[2], 0.8).px(vx + 1, y, LEAF[3], 0.78);
    if (y % 5 === 0) leaf(t, vx + 1, y, (y % 10 ? -0.4 : -2.7), 4, 1.6, LEAF, { ht: 0.85 });
    if (y % 17 === 3) t.glow(vx + 1, y - 1, BIO[5], BIO[3]);
  }
  for (let i = 0; i < 3; i++) {
    const y = 20 + Math.floor(r() * 40);
    t.glow(17 + Math.floor(r() * 12), y, VIO[5], VIO[3]);
  }
}

/** Wall sides and backs: verdigris steel lattice with moss. */
function paintWallSide(t) {
  t.rect(0, 0, 32, 96, VST[2], 0.55);
  for (let y = 0; y < 96; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 821, 0.2, 3, 32);
    if (n > 0.6) t.px(x, y, VST[3], 0.58);
    if (n < 0.34 && bayer(x, y, 0.4)) t.px(x, y, VST[1], 0.5);
  }
  for (let y = 0; y < 96; y += 16) {
    t.hline(0, 31, y, VST[4], 0.7).hline(0, 31, y + 1, VST[1], 0.5);
    for (let x = 4; x < 32; x += 8) rivet(t, x, y + 3, VST, 6);
  }
  for (let y = 0; y < 96; y++) for (let x = 0; x < 32; x++) {
    const m = tn(x, y, 823, 0.18, 3, 32) + (y > 70 ? 0.2 : 0);
    if (m > 0.66) t.px(x, y, MOSS[m > 0.74 ? 4 : 3], 0.65);
  }
}

/** Wall caps seen from above: moss-covered steel with a fern sprouting here and there. */
function paintCap(t) {
  mossBase(t, 831, { soil: 0.12 });
  t.hline(0, 31, 0, VST[4], 0.6).hline(0, 31, 31, VST[2], 0.5);
  for (let i = 0; i < 4; i++) leaf(t, 16, 16, i * 1.57 + 0.6, 7, 2.2, LEAF, { ht: 0.85 });
}

/** Cutaway low wall faces (32 x 24): a stone planter rim with moss. */
function paintLow(t) {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 841, 0.3, 2, 32);
    t.px(x, y, STONE[3 + (n > 0.58 ? 1 : 0) - (n < 0.36 ? 1 : 0)], 0.55);
  }
  t.hline(0, 31, 0, STONE[6], 0.7).hline(0, 31, 1, STONE[5], 0.68);
  for (let x = 0; x < 32; x++) {
    const drop = Math.floor(1 + tn(x, 0, 843, 0.35, 2) * 6);
    for (let y = 0; y < drop; y++) t.px(x, y, MOSS[y ? 4 : 5], 0.75);
  }
  t.vline(15, 6, 23, STONE[1], 0.3).vline(16, 6, 23, STONE[5], 0.6);
}

/** Raised bed sides (32 x 24): a riveted green-steel planter with a glowing irrigation line. */
function paintBed(t) {
  t.rect(0, 0, 32, 24, VST[3], 0.6);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 851, 0.25, 2, 32);
    if (n > 0.6) t.px(x, y, VST[4], 0.62);
    if (n < 0.36 && bayer(x, y, 0.4)) t.px(x, y, VST[2], 0.58);
  }
  raised(t, 0, 0, 32, 4, VST[4], VST[6], VST[2], 0.8);
  for (let x = 3; x < 32; x += 8) rivet(t, x, 1, VST, 7);
  // irrigation line with drips of light
  for (let x = 0; x < 32; x++) {
    t.px(x, 15, VST[1], 0.5);
    if (x % 8 === 4) t.glow(x, 15, BIO[4], BIO[3]);
    else if (x % 4 === 0) t.glow(x, 15, BIO[2], BIO[1]);
  }
  // moss and a trailing leaf over the lip
  for (let x = 0; x < 32; x++) {
    const drop = Math.floor(tn(x, 2, 853, 0.4, 2) * 7);
    for (let y = 2; y < 2 + drop; y++) t.px(x, y, MOSS[y < 4 ? 5 : 4], 0.78);
  }
  leaf(t, 21, 3, 1.9, 9, 2, LEAF, { ht: 0.9 });
  grime(t, 0, 18, 32, 6, (x, y) => (y - 18) / 6, -0.06);
}

/** Bed and root-bank tops: dark soil with seedlings, moss edges and tiny glowing sprouts. */
function paintSoil(t) {
  const r = rng(861);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 863, 0.3, 3);
    t.px(x, y, SOIL[2 + (n > 0.55 ? 1 : 0) + (n > 0.68 ? 1 : 0) - (n < 0.32 ? 1 : 0)], 0.45 + n * 0.2);
    const m = tn(x, y, 865, 0.22, 2);
    if (m > 0.62) t.px(x, y, MOSS[m > 0.7 ? 4 : 3], 0.6);
  }
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(r() * 30) + 1, y = Math.floor(r() * 30) + 1;
    t.px(x, y, LEAF[6], 0.85).px(x - 1, y, LEAF[5], 0.8).px(x + 1, y + 1, LEAF[4], 0.78);
  }
  for (let i = 0; i < 3; i++) t.glow(Math.floor(r() * 32), Math.floor(r() * 32), BIO[5], BIO[3]);
  t.glow(Math.floor(r() * 32), Math.floor(r() * 32), VIO[5], VIO[3]);
}

/** Root-bank sides (32 x 24): roots knotted over old steel, violet fungal nodes glowing. */
function paintRoots(t) {
  t.rect(0, 0, 32, 24, SOIL[2], 0.4);
  const r = rng(871);
  for (let k = 0; k < 9; k++) {
    let x = r() * 32, y = 0;
    const drift = (r() - 0.5) * 0.8, w = 1 + Math.floor(r() * 2);
    for (; y < 24; y += 1) {
      x += drift + Math.sin(y * 0.5 + k) * 0.5;
      for (let i = 0; i < w + 1; i++) t.px(Math.round(x) + i, y, BARK[i === 0 ? 5 : i === w ? 2 : 4], 0.7 + (i === 0 ? 0.1 : 0));
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(r() * 30), y = 6 + Math.floor(r() * 14);
    t.glow(x, y, VIO[5], VIO[3]).glow(x + 1, y, VIO[4], VIO[2]);
  }
  for (let x = 0; x < 32; x++) {
    const drop = Math.floor(tn(x, 3, 873, 0.4, 2) * 5);
    for (let y = 0; y < drop; y++) t.px(x, y, MOSS[4], 0.78);
  }
}

/** The dome windows (64 x 96 pair): an arched lattice of green steel holding clear glass. */
function paintGlass(t) {
  t.rect(0, 0, 64, 96, VST[3], 0.6);
  raised(t, 0, 0, 64, 8, VST[3], VST[5], VST[1], 0.82);
  for (let x = 3; x < 64; x += 8) rivet(t, x, 3, VST, 6);
  // glass: three tall arched panes, transparent
  const panes = [[4, 18], [23, 18], [42, 18]];
  for (const [x0, w] of panes) {
    for (let y = 9; y < 80; y++) for (let x = x0; x < x0 + w; x++) {
      const cx = x - (x0 + w / 2 - 0.5);
      const arch = y < 20 ? Math.hypot(cx / (w / 2), (20 - y) / 11) : 0;
      if (arch > 1) continue;
      t.put(x, y, null, 0.2);
    }
    // a hairline of glare
    for (let i = 0; i < 14; i++) {
      const x = x0 + 3 + i, y = 70 - i * 3;
      if (y > 20) t.px(x, y, '#fff2d633');
    }
  }
  // lattice: horizontal glazing bars across each pane
  for (const y of [34, 52]) for (const [x0, w] of panes) for (let x = x0; x < x0 + w; x++) t.put(x, y, VST[4], 0.7).put(x, y + 1, VST[2], 0.6);
  // vines over the frame
  for (const vx0 of [21, 40]) {
    let vx = vx0;
    for (let y = 8; y < 90; y++) {
      vx += Math.round(Math.sin(y * 0.3 + vx0) * 0.6);
      t.px(vx, y, LEAF[2], 0.8).px(vx + 1, y, LEAF[3], 0.8);
      if (y % 6 === 0) leaf(t, vx + 1, y, (y % 12 ? -0.5 : -2.6), 5, 1.8, LEAF, { ht: 0.9 });
      if (y % 23 === 5) t.glow(vx, y, BIO[5], BIO[3]);
    }
  }
  // sill with moss and a planter strip
  for (let y = 80; y < 96; y++) for (let x = 0; x < 64; x++) {
    const n = tn(x, y, 881, 0.3, 2, 64);
    t.px(x, y, STONE[3 + (n > 0.58 ? 1 : 0) - (n < 0.36 ? 1 : 0)], 0.55);
  }
  t.hline(0, 63, 80, STONE[6], 0.75).hline(0, 63, 81, STONE[5], 0.7);
  for (let x = 0; x < 64; x++) {
    const drop = Math.floor(1 + tn(x, 0, 883, 0.3, 2, 64) * 5);
    for (let y = 81; y < 81 + drop; y++) t.px(x, y, MOSS[y === 81 ? 5 : 4], 0.75);
  }
}

/** The Choir door (32 x 96 leaf, mirrored pair): steel and gold with a vine-strangled sigil. */
function paintDoor(t) {
  t.rect(0, 0, 32, 96, VST[2], 0.6);
  raised(t, 1, 4, 30, 88, VST[3], VST[5], VST[1], 0.7);
  recess(t, 5, 10, 22, 34, CHOIR[3], CHOIR[1], CHOIR[4], 0.45);
  recess(t, 5, 50, 22, 36, CHOIR[3], CHOIR[1], CHOIR[4], 0.45);
  // gold half-iris (the leaves meet in the middle into WARDEN's sigil, dimmed)
  for (let a = 0; a < Math.PI; a += 0.04) {
    const x = Math.round(31 - Math.sin(a) * 18), y = Math.round(48 - Math.cos(a) * 18);
    t.glow(x, y, GOLD[3], '#6b4e12');
  }
  for (let a = 0; a < Math.PI; a += 0.08) {
    const x = Math.round(31 - Math.sin(a) * 9), y = Math.round(48 - Math.cos(a) * 9);
    t.glow(x, y, GOLD[4], '#8f6a19');
  }
  // vines strangling the door
  for (const [x0, seed] of [[6, 3], [20, 7]]) {
    let vx = x0;
    for (let y = 94; y > 2; y--) {
      vx += Math.round(Math.sin(y * 0.18 + seed) * 0.7);
      vx = Math.max(1, Math.min(30, vx));
      t.px(vx, y, LEAF[2], 0.85).px(vx + 1, y, LEAF[3], 0.85);
      if (y % 7 === 0) leaf(t, vx + 1, y, (y % 14 ? -0.6 : -2.5), 5, 2, LEAF, { ht: 0.95 });
      if (y % 19 === 2) t.glow(vx, y, BIO[5], BIO[3]);
    }
  }
}

// ---------------------------------------------------------------- water

/** Bioluminescent teal water: drifting ripple bands, caustic glints, a few violet motes (4 frames). */
function paintWater(t, f) {
  const W = ['#041618', '#06262a', '#0a3a3c', '#0f5552', '#17736a', '#2fa596', '#7fe6d0', '#dcfff4'];
  const ph = (f / 4) * Math.PI * 2;
  const TAU = Math.PI * 2;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = fbm(x / 8, y / 8 + f * 0.5, 341, 2, 4, 4);
    const band = Math.sin((y + Math.sin(x / 32 * TAU * 2 + ph) * 1.8) / 32 * TAU * 3 - ph);
    const v = 0.5 + band * 0.2 + (n - 0.5) * 0.5;
    const q = clamp01(v) * 3;
    let k = 2 + Math.floor(q);
    if (bayer(x, y, (q % 1) * 0.5)) k++;
    t.px(x, y, W[Math.min(5, k)], 0.45 + band * 0.04);
    if (band > 0.9 && ((x + f * 3 + (y >> 2) * 5) % 9) < 3) t.glow(x, y, W[6], '#1f8a78');
  }
  const r = rng(347 + f);
  for (let i = 0; i < 2; i++) t.glow(Math.floor(r() * 32), Math.floor(r() * 32), VIO[5], VIO[3]);
}

/** Channel banks (32 x 24): mossy stone down to a glowing algae line at the waterline. */
function paintBank(t) {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, 351, 0.3, 2, 32);
    t.px(x, y, STONE[3 + (n > 0.6 ? 1 : 0) - (n < 0.35 ? 1 : 0)], 0.55);
    const wet = clamp01((y - 6) / 14) + (fbm(x / 6, y / 10, 353, 2, 32 / 6) - 0.5) * 0.4;
    if (wet > 0.35 && bayer(x, y, wet)) t.px(x, y, mix(STONE[2], '#0b3a34', 0.6), 0.5);
  }
  raised(t, 0, 0, 32, 3, STONE[5], STONE[6], STONE[2], 0.8);
  for (let x = 0; x < 32; x++) {
    const drop = Math.floor(tn(x, 1, 355, 0.4, 2) * 6);
    for (let y = 1; y < 1 + drop; y++) t.px(x, y, MOSS[4], 0.75);
    t.glow(x, 19, x % 3 ? BIO[3] : BIO[4], x % 3 ? BIO[1] : BIO[2]);
    if (x % 2) t.glow(x, 20, BIO[2], BIO[1]);
  }
}

/** The channel bed: wet silt, pebbles, drowned leaves and glowing algae specks. */
function paintSilt(t) {
  const r = rng(361);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = fbm(x / 8, y / 8, 363, 2, 4, 4);
    t.px(x, y, n > 0.55 ? '#1d2a20' : n > 0.4 ? '#16211a' : '#101913', 0.25 + n * 0.2);
    const p = fbm(x / 4, y / 4, 365, 1, 8, 8);
    if (p > 0.72) t.px(x, y, p > 0.8 ? STONE[4] : STONE[3], 0.4 + (p - 0.72));
  }
  for (let i = 0; i < 4; i++) leaf(t, 4 + r() * 24, 4 + r() * 24, r() * 6.28, 4, 1.5, LEAF, { ht: 0.4, tone: -2 });
  for (let i = 0; i < 4; i++) t.glow(Math.floor(r() * 32), Math.floor(r() * 32), BIO[4], BIO[2]);
}

/** The drained walkway: a submerged garden path of stepping slabs, wet, with puddles that glow. */
function paintWalkway(t) {
  courtBase(t, 371);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    t.tint(x, y, '#0d2a26', 0.3);
    const p = fbm(x / 7, y / 7, 373, 2, 32 / 7, 32 / 7);
    if (p > 0.62) t.px(x, y, p > 0.7 ? '#2a6a62' : '#1b4a44', 0.5);
    if (p > 0.72 && (x + y) % 7 === 0) t.glow(x, y, BIO[5], BIO[2]);
  }
}

// ---------------------------------------------------------------- atlases

// Regions in pixels; uvOf() turns them into Batch uv rects (texture v runs bottom-up).
export const FLORA = {
  w: 256, h: 256,
  fernA: { x: 0, y: 0, w: 64, h: 64 },
  fernB: { x: 64, y: 0, w: 64, h: 64 },
  leafBig: { x: 128, y: 0, w: 64, h: 64 },
  bloomPink: { x: 192, y: 0, w: 64, h: 64 },
  bloomViolet: { x: 0, y: 64, w: 64, h: 64 },
  tall: { x: 64, y: 64, w: 64, h: 128 },
  vineA: { x: 128, y: 64, w: 16, h: 128 },
  vineB: { x: 144, y: 64, w: 16, h: 128 },
  vineC: { x: 160, y: 64, w: 16, h: 128 },
  canopy: { x: 176, y: 64, w: 80, h: 80 },
  tuft: { x: 0, y: 128, w: 64, h: 32 },
  shrooms: { x: 0, y: 160, w: 64, h: 32 },
  roots: { x: 176, y: 144, w: 80, h: 48 },
  hanging: { x: 0, y: 192, w: 128, h: 64 },
  sprigs: { x: 128, y: 192, w: 128, h: 64 },
};

export const TECH = {
  w: 256, h: 256,
  podTop: { x: 0, y: 0, w: 64, h: 32 },       // a stasis pod seen from above: frosted glass, sleeper
  podTopEmpty: { x: 64, y: 0, w: 64, h: 32 },
  podSide: { x: 0, y: 32, w: 64, h: 16 },     // its steel flank with status lights
  podEnd: { x: 64, y: 32, w: 32, h: 16 },
  podTopGold: { x: 128, y: 0, w: 64, h: 32 },  // Choir pod: harmonised, gold light inside
  podSideGold: { x: 128, y: 32, w: 64, h: 16 },
  pumpFront: { x: 0, y: 48, w: 64, h: 64 },
  pumpSide: { x: 64, y: 48, w: 32, h: 64 },
  terminal: { x: 96, y: 48, w: 32, h: 48 },
  planter: { x: 128, y: 48, w: 32, h: 32 },
  planterTop: { x: 160, y: 48, w: 32, h: 32 },
  steel: { x: 192, y: 48, w: 32, h: 32 },
  gold: { x: 224, y: 48, w: 32, h: 32 },
  sluice: { x: 0, y: 112, w: 96, h: 48 },
  lift: { x: 96, y: 112, w: 64, h: 64 },
  racks: { x: 160, y: 112, w: 96, h: 64 },
  sprinkler: { x: 0, y: 160, w: 32, h: 32 },
  lamp: { x: 32, y: 160, w: 32, h: 32 },
  tiers: { x: 0, y: 192, w: 256, h: 64 },     // the Choir's back wall: tiers of glowing pods
};

export const DECAL = {
  w: 256, h: 256,
  litterA: { x: 0, y: 0, w: 64, h: 64 },
  litterB: { x: 64, y: 0, w: 64, h: 64 },
  puddle: { x: 128, y: 0, w: 64, h: 64 },
  petals: { x: 192, y: 0, w: 64, h: 64 },
  mossPatch: { x: 0, y: 64, w: 64, h: 64 },
  rootsFlat: { x: 64, y: 64, w: 64, h: 64 },
  shaftPool: { x: 128, y: 64, w: 64, h: 64 },
  ring: { x: 0, y: 128, w: 128, h: 128 },
  aisle: { x: 128, y: 128, w: 64, h: 128 },
  sigilFloor: { x: 192, y: 128, w: 64, h: 64 },
};

/** Batch uv rect [u0, v0, u1, v1] for an atlas region. */
export function uvOf(atlas, r) {
  return [r.x / atlas.w, 1 - (r.y + r.h) / atlas.h, (r.x + r.w) / atlas.w, 1 - r.y / atlas.h];
}

function fernClump(t, R, ramp, seed, glow) {
  const r = rng(seed);
  const bx = R.x + R.w / 2, by = R.y + R.h - 2;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.36 + (r() - 0.5) * 0.15;
    const len = 26 + r() * 10 - Math.abs(i - 4) * 2.5;
    frond(t, bx + (r() - 0.5) * 6, by, a, len, ramp, { curl: (i < 4 ? -1 : 1) * 0.022, w: 5 + r() * 2, glowTip: glow && i % 3 === 1 ? glow : null });
  }
}

function paintFlora(t) {
  const F = FLORA;
  fernClump(t, F.fernA, FROND, 901, null);
  fernClump(t, F.fernB, LEAF, 911, [BIO[5], BIO[3]]);
  // big leaves with glowing veins (elephant ears)
  {
    const R = F.leafBig, r = rng(921);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.42;
      const bx = R.x + 32, by = R.y + 62;
      stem(t, bx, by, bx + Math.cos(a) * 16, by + Math.sin(a) * 16, (r() - 0.5) * 4, LEAF[3], 0.7);
      leaf(t, bx + Math.cos(a) * 16, by + Math.sin(a) * 16, a + (r() - 0.5) * 0.3, 22 + r() * 6, 8 + r() * 2, LEAF, { vein: BIO[4], veinE: i % 2 ? BIO[2] : null, ht: 0.75 });
    }
  }
  // bloom bushes: leaves, then flowers with glowing hearts
  const bush = (R, petals, heart, seed) => {
    const r = rng(seed);
    const bx = R.x + 32, by = R.y + 62;
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i - 4.5) * 0.3;
      leaf(t, bx + (r() - 0.5) * 10, by, a, 16 + r() * 10, 3 + r() * 2, LEAF, { ht: 0.65, tone: -1 });
    }
    for (let i = 0; i < 7; i++) {
      const fx = R.x + 10 + r() * 44, fy = R.y + 10 + r() * 30;
      stem(t, fx, fy + 6, fx + (r() - 0.5) * 4, by - 4, 2, LEAF[2], 0.6);
      for (let k = 0; k < 5; k++) leaf(t, fx, fy, (k / 5) * Math.PI * 2 + r(), 5, 2.4, petals, { ht: 0.85 });
      t.glow(Math.round(fx), Math.round(fy), heart[0], heart[1]).glow(Math.round(fx) + 1, Math.round(fy), heart[0], heart[1]);
    }
  };
  bush(F.bloomPink, PETAL, [AM[6], AM[4]], 931);
  bush(F.bloomViolet, VIO, [BIO[6], BIO[4]], 941);
  // tall banana-like plant: a stalk with broad drooping leaves
  {
    const R = F.tall, r = rng(951);
    const bx = R.x + 32, by = R.y + 126;
    stem(t, bx, by, bx + 2, R.y + 50, 3, BARK[4], 0.7);
    stem(t, bx + 1, by, bx + 3, R.y + 50, 3, BARK[5], 0.75);
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i - 3.5) * 0.45 + (r() - 0.5) * 0.2;
      const sy = R.y + 48 + i * 4;
      leaf(t, bx + 2, sy, a, 30 + r() * 10, 6 + r() * 2, LEAF, { vein: LEAF[6], ht: 0.75, tone: i % 2 });
    }
    for (let i = 0; i < 3; i++) t.glow(bx - 3 + i * 3, R.y + 52, PETAL[5], PETAL[3]);
  }
  // hanging vines: a strand with leaves and glowing seed nodes
  const vine = (R, seed, nodes) => {
    const r = rng(seed);
    let x = R.x + 8;
    for (let y = R.y; y < R.y + R.h - 2; y++) {
      x += Math.sin(y * 0.15 + seed) * 0.35;
      t.px(Math.round(x), y, LEAF[2], 0.8).px(Math.round(x) + 1, y, LEAF[3], 0.8);
      if (y % 6 === (seed % 6)) leaf(t, x + 1, y, (y % 12 < 6 ? 0.4 : 2.7), 5 + r() * 2, 2, LEAF, { ht: 0.85 });
      if (y % 22 === 11) t.glow(Math.round(x), y + 1, nodes[0], nodes[1]).glow(Math.round(x) + 1, y + 1, nodes[0], nodes[1]);
    }
  };
  vine(F.vineA, 3, [BIO[5], BIO[3]]);
  vine(F.vineB, 7, [VIO[5], VIO[3]]);
  vine(F.vineC, 11, [PETAL[6], PETAL[4]]);
  // canopy cluster seen from above at an angle: overlapping leaves round a dark heart
  {
    const R = F.canopy, r = rng(961);
    const cx = R.x + 40, cy = R.y + 40;
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, d = r() * 26;
      leaf(t, cx + Math.cos(a) * d * 0.5, cy + Math.sin(a) * d * 0.5, a, 12 + r() * 6, 4 + r() * 1.5, i < 20 ? LEAF : FROND, { ht: 0.6 + d / 80, tone: i > 30 ? 1 : 0 });
    }
    for (let i = 0; i < 5; i++) t.glow(cx - 18 + Math.floor(r() * 36), cy - 18 + Math.floor(r() * 36), BIO[5], BIO[3]);
  }
  // seedling and grass tufts (a front card for bed tops)
  {
    const R = F.tuft, r = rng(971);
    for (let i = 0; i < 26; i++) {
      const x = R.x + 2 + r() * 60, y = R.y + 31;
      const h = 8 + r() * 18;
      leaf(t, x, y, -Math.PI / 2 + (r() - 0.5) * 0.9, h, 1.4 + r(), i % 3 ? LEAF : MOSS, { ht: 0.75, tone: i % 2 });
    }
    for (let i = 0; i < 4; i++) t.glow(Math.round(R.x + 6 + r() * 52), Math.round(R.y + 8 + r() * 10), i % 2 ? BIO[5] : PETAL[5], i % 2 ? BIO[3] : PETAL[3]);
  }
  // glowing mushrooms on a moss mound
  {
    const R = F.shrooms, r = rng(981);
    for (let x = R.x; x < R.x + R.w; x++) {
      const h = Math.round(6 + Math.sin((x - R.x) / R.w * Math.PI) * 6);
      for (let y = R.y + R.h - h; y < R.y + R.h; y++) t.px(x, y, MOSS[y === R.y + R.h - h ? 5 : 3], 0.6);
    }
    for (let i = 0; i < 7; i++) {
      const x = R.x + 8 + Math.floor(r() * 48), base = R.y + 26 - Math.floor(r() * 4), h = 5 + Math.floor(r() * 9);
      const cap = i % 2 ? BIO : VIO;
      t.vline(x, base - h, base, MOSS[6], 0.7);
      for (let k = -3; k <= 3; k++) {
        const w = 3 - Math.abs(k) * 0.7;
        for (let j = 0; j < Math.max(1, Math.round(w)); j++) t.glow(x + k, base - h - j, cap[4 + (k < 0 ? 1 : 0)], cap[3]);
      }
    }
  }
  // a root arch (pod banks): knotted roots bridging over a gap
  {
    const R = F.roots, r = rng(991);
    for (let k = 0; k < 7; k++) {
      const off = (k - 3) * 2;
      for (let x = R.x; x < R.x + R.w; x++) {
        const s = (x - R.x) / R.w;
        const y = R.y + R.h - 4 - Math.sin(s * Math.PI) * (R.h - 12) + off + Math.sin(s * 9 + k) * 2;
        t.px(x, Math.round(y), BARK[3 + (k % 3)], 0.7).px(x, Math.round(y) + 1, BARK[2], 0.6);
      }
    }
    for (let i = 0; i < 6; i++) t.glow(R.x + 6 + Math.floor(r() * 68), R.y + 8 + Math.floor(r() * 30), VIO[5], VIO[3]);
  }
  // a hanging garland: vines draped between two points with blooms (for foreground edges)
  {
    const R = F.hanging, r = rng(1001);
    for (let k = 0; k < 3; k++) {
      for (let x = R.x; x < R.x + R.w; x++) {
        const s = (x - R.x) / R.w;
        const y = R.y + 6 + k * 3 + Math.sin(s * Math.PI) * (24 + k * 6);
        t.px(x, Math.round(y), LEAF[2 + k], 0.8);
        if (x % 5 === k) leaf(t, x, y, Math.PI / 2 + (r() - 0.5), 7 + r() * 5, 2.2, LEAF, { ht: 0.85 });
        if (x % 29 === 7 + k * 5) {
          for (let p = 0; p < 5; p++) leaf(t, x, y + 4, (p / 5) * 6.28, 4, 2, k === 1 ? VIO : PETAL, { ht: 0.9 });
          t.glow(x, Math.round(y) + 4, AM[6], AM[4]);
        }
      }
    }
  }
  // loose sprigs and fronds (scatter on floors and bed edges)
  {
    const R = F.sprigs, r = rng(1011);
    for (let i = 0; i < 14; i++) {
      const x = R.x + 6 + (i % 7) * 18 + r() * 4, y = R.y + (i < 7 ? 30 : 62);
      frond(t, x, y, -Math.PI / 2 + (r() - 0.5) * 0.8, 14 + r() * 10, i % 2 ? FROND : LEAF, { curl: (r() - 0.5) * 0.06, w: 3 + r() * 2 });
    }
  }
  for (const R of Object.values(F)) if (R && R.w && R.h && R.x !== undefined) outline(t, R.x, R.y, R.w, R.h);
}

/** Steel plate helper for the tech atlas. */
function steelPlate(t, x0, y0, w, h, ramp = VST, body = 3) {
  raised(t, x0, y0, w, h, ramp[body], ramp[body + 2], ramp[body - 2], 0.7);
  for (let y = y0 + 1; y < y0 + h - 1; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) {
    const n = tn(x, y, 1101 + x0, 0.25, 2, 64);
    if (n > 0.64) t.px(x, y, ramp[body + 1]);
    else if (n < 0.34 && bayer(x, y, 0.35)) t.px(x, y, ramp[body - 1]);
  }
}

/** A sleeper's silhouette under frosted glass (top view, head to the left). */
function sleeper(t, x0, y0, w, h, { skin = '#d6a48a', cloth = '#c8d8e8', gold = false } = {}) {
  const cy = y0 + h / 2;
  blob(t, x0 + 9, cy, 4, 3.6, [mix(skin, '#000', 0.5), mix(skin, '#000', 0.25), skin, mix(skin, '#fff', 0.3)], { lo: 0, hi: 3, ht: 0.55 });
  for (let x = x0 + 13; x < x0 + w - 6; x++) {
    const half = 4.5 - Math.abs(x - (x0 + 24)) * 0.06;
    for (let y = Math.round(cy - half); y <= Math.round(cy + half); y++) t.px(x, y, mix(cloth, '#000', (y > cy ? 0.2 : 0) + (x % 7 === 0 ? 0.1 : 0)), 0.52);
  }
  if (gold) for (let y = y0 + 2; y < y0 + h - 2; y++) for (let x = x0 + 3; x < x0 + w - 3; x++) if (bayer(x, y, 0.25)) t.tint(x, y, GOLD[5], 0.35);
}

function podTop(t, R, { empty = false, gold = false } = {}) {
  const { x: x0, y: y0, w, h } = R;
  steelPlate(t, x0, y0, w, h, gold ? CHOIR : VST, gold ? 4 : 3);
  // glass canopy (rounded rectangle)
  for (let y = y0 + 4; y < y0 + h - 4; y++) for (let x = x0 + 4; x < x0 + w - 4; x++) {
    const ex = Math.max(0, Math.abs(x - (x0 + w / 2 - 0.5)) - (w / 2 - 12)) / 8, ey = (y - (y0 + h / 2 - 0.5)) / (h / 2 - 4);
    if (ex * ex + ey * ey > 1) continue;
    const frost = fbm(x / 5, y / 5, 1111, 2);
    t.px(x, y, gold ? mix('#3a2a10', '#ffe2a0', 0.2 + frost * 0.3) : mix('#2a4a50', '#cfefff', 0.25 + frost * 0.35), 0.5);
  }
  if (!empty) sleeper(t, x0 + 4, y0 + 4, w - 8, h - 8, { gold });
  // glass highlight and frame bolts
  for (let i = 0; i < 18; i++) t.px(x0 + 12 + i, y0 + 7, '#ffffff55');
  for (const [x, y] of [[x0 + 2, y0 + 2], [x0 + w - 4, y0 + 2], [x0 + 2, y0 + h - 4], [x0 + w - 4, y0 + h - 4]]) bolt(t, x, y, VST, 7);
  if (gold) for (let x = x0 + 6; x < x0 + w - 6; x += 2) t.glow(x, y0 + 3, GOLD[4], GOLD[3]).glow(x, y0 + h - 4, GOLD[4], GOLD[3]);
  else t.glow(x0 + w - 7, y0 + h / 2, BIO[5], BIO[3]);
}

function podSide(t, R, gold = false) {
  const { x: x0, y: y0, w, h } = R;
  steelPlate(t, x0, y0, w, h, gold ? CHOIR : VST, gold ? 4 : 3);
  for (let x = x0 + 4; x < x0 + w - 4; x += 6) {
    t.glow(x, y0 + h / 2, gold ? GOLD[4] : BIO[4], gold ? GOLD[3] : BIO[2]);
    t.px(x + 1, y0 + h / 2, VST[1]);
  }
  t.hline(x0, x0 + w - 1, y0 + h - 2, MOSS[3], 0.6);
}

function paintTech(t) {
  const T = TECH;
  podTop(t, T.podTop);
  podTop(t, T.podTopEmpty, { empty: true });
  podTop(t, T.podTopGold, { gold: true });
  podSide(t, T.podSide);
  podSide(t, T.podSideGold, true);
  steelPlate(t, T.podEnd.x, T.podEnd.y, T.podEnd.w, T.podEnd.h);
  t.glow(T.podEnd.x + 16, T.podEnd.y + 8, BIO[5], BIO[3]);
  // the pump: a riveted housing with a sight glass full of glowing water and a pressure dial
  {
    const R = T.pumpFront;
    steelPlate(t, R.x, R.y, R.w, R.h);
    recess(t, R.x + 8, R.y + 10, 20, 40, '#06262a', VST[1], VST[5], 0.4);
    for (let y = R.y + 11; y < R.y + 49; y++) for (let x = R.x + 9; x < R.x + 27; x++) {
      const lvl = y > R.y + 22;
      if (lvl) t.glow(x, y, (x + y) % 5 ? BIO[3] : BIO[4], (x + y) % 5 ? BIO[1] : BIO[2]);
    }
    for (let a = 0; a < 6.28; a += 0.2) t.px(Math.round(R.x + 46 + Math.cos(a) * 8), Math.round(R.y + 22 + Math.sin(a) * 8), VST[6], 0.8);
    t.line(R.x + 46, R.y + 22, R.x + 51, R.y + 18, AM[4], 0.85).glow(R.x + 46, R.y + 22, AM[5], AM[3]);
    for (let x = R.x + 34; x < R.x + 60; x += 5) t.glow(x, R.y + 44, x % 2 ? BIO[4] : AM[4], x % 2 ? BIO[2] : AM[3]);
    for (let x = R.x; x < R.x + R.w; x++) { const d = Math.floor(tn(x, 0, 1121, 0.4, 2, 64) * 6); for (let y = R.y; y < R.y + d; y++) t.px(x, y, MOSS[4], 0.75); }
  }
  steelPlate(t, T.pumpSide.x, T.pumpSide.y, T.pumpSide.w, T.pumpSide.h);
  // MOTHER-7's log terminal: a mossy lectern with a green screen
  {
    const R = T.terminal;
    steelPlate(t, R.x, R.y, R.w, R.h);
    recess(t, R.x + 3, R.y + 4, 26, 16, '#041a10', VST[1], VST[5], 0.42);
    for (let y = R.y + 6; y < R.y + 18; y += 2) for (let x = R.x + 5; x < R.x + 5 + 6 + ((y * 7) % 15); x++) t.glow(x, y, '#8fe08a', '#3a8a3a');
    t.glow(R.x + 26, R.y + 26, BIO[5], BIO[3]);
    for (let x = R.x; x < R.x + R.w; x++) { const d = Math.floor(tn(x, 2, 1131, 0.5, 2, 32) * 5); for (let y = R.y; y < R.y + d; y++) t.px(x, y, MOSS[4], 0.75); }
  }
  // a planter crate (chests): green steel with a leaf stencil, and its mossy lid
  {
    const R = T.planter;
    steelPlate(t, R.x, R.y, R.w, R.h);
    for (let k = 0; k < 4; k++) leaf(t, R.x + 16, R.y + 20, -Math.PI / 2 + (k - 1.5) * 0.5, 9, 2.5, GOLD, { ht: 0.75 });
    t.glow(R.x + 16, R.y + 26, AM[5], AM[3]);
    const L = T.planterTop;
    for (let y = L.y; y < L.y + L.h; y++) for (let x = L.x; x < L.x + L.w; x++) {
      const n = tn(x, y, 1141, 0.3, 2);
      t.px(x, y, MOSS[3 + (n > 0.55 ? 1 : 0)], 0.6);
    }
    t.rect(L.x, L.y, L.w, 2, VST[5], 0.7).rect(L.x, L.y + L.h - 2, L.w, 2, VST[2], 0.6);
    for (let k = 0; k < 5; k++) leaf(t, L.x + 16, L.y + 16, k * 1.25, 9, 3, LEAF, { ht: 0.9 });
  }
  steelPlate(t, T.steel.x, T.steel.y, T.steel.w, T.steel.h);
  steelPlate(t, T.gold.x, T.gold.y, T.gold.w, T.gold.h, GOLD, 3);
  // the sluice gate: a riveted floodgate with the two valve marks and the drain grille
  {
    const R = T.sluice;
    steelPlate(t, R.x, R.y, R.w, R.h);
    for (let x = R.x + 8; x < R.x + R.w - 8; x += 4) t.vline(x, R.y + 10, R.y + 38, VST[1], 0.35).vline(x + 1, R.y + 10, R.y + 38, VST[5], 0.6);
    drawText('1', R.x + 10, R.y + 3, (x, y) => t.glow(x, y, AM[5], AM[3]));
    drawText('2', R.x + R.w - 14, R.y + 3, (x, y) => t.glow(x, y, AM[5], AM[3]));
    for (let x = R.x; x < R.x + R.w; x++) t.glow(x, R.y + R.h - 4, BIO[3], BIO[1]);
  }
  // the service lift: a cage door with vines
  {
    const R = T.lift;
    steelPlate(t, R.x, R.y, R.w, R.h);
    for (let x = R.x + 6; x < R.x + R.w - 6; x += 5) t.vline(x, R.y + 6, R.y + R.h - 6, VST[6], 0.8).vline(x + 1, R.y + 6, R.y + R.h - 6, VST[1], 0.5);
    t.glow(R.x + 32, R.y + 4, AM[5], AM[3]);
    let vx = R.x + 10;
    for (let y = R.y + R.h - 1; y > R.y + 4; y--) {
      vx += Math.round(Math.sin(y * 0.25) * 0.7);
      t.px(vx, y, LEAF[3], 0.85);
      if (y % 6 === 0) leaf(t, vx, y, -0.4, 5, 2, LEAF, { ht: 0.9 });
    }
  }
  // seed racks: drawers of labelled seed packets with tiny lamps
  {
    const R = T.racks;
    steelPlate(t, R.x, R.y, R.w, R.h);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) {
      const x = R.x + 4 + col * 15, y = R.y + 4 + row * 15;
      recess(t, x, y, 13, 12, SOIL[3], VST[1], VST[5], 0.45);
      t.rect(x + 3, y + 3, 7, 5, [PETAL[4], GOLD[4], LEAF[5], VIO[4]][(row + col) % 4], 0.55);
      if ((row * 3 + col) % 5 === 0) t.glow(x + 11, y + 2, BIO[5], BIO[3]);
    }
  }
  // a sprinkler head and a hanging work lamp (front views)
  {
    const R = T.sprinkler;
    steelPlate(t, R.x + 12, R.y, 8, 22);
    blob(t, R.x + 16, R.y + 24, 7, 4, VST, { lo: 2, hi: 6, ht: 0.8 });
    for (let x = R.x + 11; x < R.x + 22; x += 2) t.glow(x, R.y + 27, BIO[5], BIO[3]);
    const L = T.lamp;
    t.rect(L.x + 15, L.y, 2, 12, VST[2], 0.6);
    blob(t, L.x + 16, L.y + 18, 10, 6, VST, { lo: 2, hi: 6, ht: 0.8 });
    for (let x = L.x + 8; x < L.x + 25; x++) t.glow(x, L.y + 23, AM[6], AM[4]);
  }
  // the Choir's back wall: tiers of pods glowing white-gold, stacked like a choir loft
  {
    const R = T.tiers;
    for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) t.px(x, y, CHOIR[1 + ((x >> 4) + (y >> 4)) % 2], 0.5);
    for (let row = 0; row < 4; row++) {
      const y = R.y + 4 + row * 15;
      t.hline(R.x, R.x + R.w - 1, y + 12, GOLD[2], 0.75).hline(R.x, R.x + R.w - 1, y + 13, CHOIR[0], 0.4);
      for (let col = 0; col < 16; col++) {
        const x = R.x + 2 + col * 16 + (row % 2) * 8;
        if (x + 12 > R.x + R.w) continue;
        for (let yy = y; yy < y + 11; yy++) for (let xx = x; xx < x + 12; xx++) {
          const ex = (xx - (x + 5.5)) / 6, ey = (yy - (y + 5)) / 5.5;
          if (ex * ex + ey * ey > 1) continue;
          const core = ex * ex + ey * ey < 0.35;
          t.glow(xx, yy, core ? GOLD[5] : GOLD[4], core ? '#fff0c0' : GOLD[3]);
        }
      }
    }
  }
}

/** Floor decals (alpha): leaf litter, a puddle, petals, a moss patch, roots, a light pool, the pad ring. */
function paintDecal(t) {
  const D = DECAL;
  const scatterLeaves = (R, seed, n, ramps) => {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * 28;
      leaf(t, R.x + 32 + Math.cos(a) * d, R.y + 32 + Math.sin(a) * d, r() * 6.28, 4 + r() * 4, 1.5 + r(), ramps[i % ramps.length], { ht: 0.62 });
    }
  };
  scatterLeaves(D.litterA, 1201, 40, [LEAF, MOSS, BARK]);
  scatterLeaves(D.litterB, 1211, 30, [FROND, LEAF]);
  // puddle: soft-edged dark water that glows teal at its heart
  {
    const R = D.puddle;
    for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
      const dx = (x - R.x - 32) / 28, dy = (y - R.y - 32) / 20;
      const n = fbm(x / 7, y / 7, 1221, 2) * 0.5;
      const d = dx * dx + dy * dy + n - 0.25;
      if (d > 1) continue;
      t.px(x, y, d > 0.8 ? '#0e2a2688' : '#0a2a28cc', 0.42);
      if (d < 0.3 && bayer(x, y, 0.2)) t.glow(x, y, BIO[3], BIO[1]);
    }
  }
  // petals
  {
    const R = D.petals, r = rng(1231);
    for (let i = 0; i < 40; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * 28;
      const x = Math.round(R.x + 32 + Math.cos(a) * d), y = Math.round(R.y + 32 + Math.sin(a) * d);
      const c = i % 3 ? PETAL[5] : PETAL[6];
      t.px(x, y, c, 0.6).px(x + 1, y, PETAL[4], 0.58);
    }
  }
  // moss patch (soft edged)
  {
    const R = D.mossPatch;
    for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
      const dx = (x - R.x - 32) / 30, dy = (y - R.y - 32) / 30;
      const n = fbm(x / 6, y / 6, 1241, 3);
      const v = 1 - (dx * dx + dy * dy) + (n - 0.5) * 0.9;
      if (v < 0.25) continue;
      t.px(x, y, MOSS[v > 0.7 ? 5 : v > 0.45 ? 4 : 3], 0.55 + v * 0.2);
      if (v > 0.8 && bayer(x, y, 0.08)) t.glow(x, y, BIO[5], BIO[3]);
    }
  }
  // roots spreading flat over the floor
  {
    const R = D.rootsFlat, r = rng(1251);
    for (let k = 0; k < 8; k++) {
      let x = R.x + 32, y = R.y + 32, a = r() * 6.28;
      for (let i = 0; i < 30; i++) {
        a += (r() - 0.5) * 0.5;
        x += Math.cos(a); y += Math.sin(a);
        if (x < R.x + 1 || y < R.y + 1 || x > R.x + R.w - 2 || y > R.y + R.h - 2) break;
        t.px(Math.round(x), Math.round(y), BARK[4], 0.7).px(Math.round(x) + 1, Math.round(y), BARK[2], 0.6);
      }
    }
    for (let i = 0; i < 4; i++) t.glow(R.x + 16 + Math.floor(r() * 32), R.y + 16 + Math.floor(r() * 32), VIO[5], VIO[3]);
  }
  // a pool of warm dome light (soft amber, dithered edge)
  {
    const R = D.shaftPool;
    for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
      const dx = (x - R.x - 32) / 31, dy = (y - R.y - 32) / 31;
      const d = dx * dx + dy * dy;
      if (d > 1 || !bayer(x, y, (1 - d) * 0.6)) continue;
      t.glow(x, y, '#ffd590', '#6a4a1a');
    }
  }
  // the Moth's landing ring: teal circle, ticks, an amber bar
  {
    const R = D.ring;
    const cx = R.x + 64, cy = R.y + 64;
    for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (Math.abs(d - 58) < 1.5 || Math.abs(d - 50) < 0.8) t.glow(x, y, TE[4], TE[2]);
      const a = Math.atan2(y - cy, x - cx);
      if (d > 51 && d < 57 && Math.abs(Math.sin(a * 12)) < 0.12) t.glow(x, y, TE[5], TE[3]);
      if (Math.abs(y - cy) < 1.5 && Math.abs(x - cx) < 30) t.glow(x, y, AM[4], AM[3]);
    }
  }
  // the Choir aisle runner: a gold-edged dark carpet with a star at each step
  {
    const R = D.aisle;
    for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x + 8; x < R.x + R.w - 8; x++) {
      const edge = x < R.x + 11 || x > R.x + R.w - 12;
      if (edge) t.glow(x, y, GOLD[4], GOLD[2]);
      else t.px(x, y, (y >> 3) % 2 ? '#2a1a12' : '#24160f', 0.45);
    }
    for (let y = R.y + 8; y < R.y + R.h; y += 16) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) t.glow(R.x + 32 + dx, y + dy, GOLD[5], GOLD[3]);
  }
  // a faint sigil on the floor before Theo's pod (gold iris)
  {
    const R = D.sigilFloor;
    const cx = R.x + 32, cy = R.y + 32;
    for (let a = 0; a < 6.28; a += 0.02) {
      for (const rr of [26, 18]) t.glow(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.6), GOLD[3], GOLD[2]);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 6.28;
      t.line(Math.round(cx + Math.cos(a) * 18), Math.round(cy + Math.sin(a) * 11), Math.round(cx + Math.cos(a) * 26), Math.round(cy + Math.sin(a) * 15.6), GOLD[4]);
    }
  }
}

/** Tree bark (32 x 64, wraps): ridged bark with moss and glowing lichen. */
function paintBark(t) {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) {
    const ridge = Math.sin(x * 0.9 + fbm(x / 6, y / 16, 1301, 2, 32 / 6, 4) * 5);
    const k = ridge > 0.5 ? 5 : ridge > 0 ? 4 : ridge > -0.5 ? 3 : 2;
    t.px(x, y, BARK[k], 0.45 + ridge * 0.15);
    const m = fbm(x / 5, y / 7, 1303, 2, 32 / 5, 64 / 7);
    if (m > 0.64) t.px(x, y, MOSS[m > 0.7 ? 5 : 4], 0.7);
  }
  const r = rng(1305);
  for (let i = 0; i < 5; i++) t.glow(Math.floor(r() * 32), Math.floor(r() * 64), BIO[5], BIO[3]);
}

/** Pod status plates (64 x 32): a sleeper's name and a teal vitals line. */
function paintPodScreen(t, f) {
  t.rect(0, 0, 64, 32, '#03140f', 0.5);
  for (let x = 0; x < 64; x++) { t.glow(x, 0, BIO[2], BIO[1]); t.glow(x, 31, BIO[2], BIO[1]); }
  drawText('STASIS', 4, 4, (x, y) => t.glow(x, y, BIO[4], BIO[3]));
  drawText('STABLE', 4, 14, (x, y) => t.glow(x, y, '#8fe08a', '#4a9a4a'));
  for (let x = 4; x < 60; x++) {
    const v = 26 + Math.round(Math.sin((x + f * 5) * 0.6) * (x % 16 < 3 ? 3 : 0.6));
    t.glow(x, v, BIO[5], BIO[3]);
  }
}

// ---------------------------------------------------------------- backdrop

/**
 * Tethys through the dome (1024 x 512): banded amber and cream with its rings, behind the green
 * steel ribs of the dome glass, a few vine silhouettes hanging across. Painted on a canvas.
 */
function paintDomeBackdrop() {
  const W = 1024, H = 512;
  const p = new Painter(W, H);
  const d = p.data;
  const cx = 520, cy = 640, R = 520;
  const band = ['#f6dcae', '#e7b06a', '#c27b3d', '#f2cf94', '#d59a52', '#a86434', '#efd2a0', '#c88a4a'];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    // deep space with a teal-violet glow toward the horizon
    let r = 8 + y * 0.03, g = 14 + y * 0.05, b = 24 + y * 0.04;
    const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy);
    if (dist < R) {
      const lat = (dy / R) * 6 + Math.sin(dx * 0.006) * 0.3 + fbm(x / 90, y / 40, 1401, 3) * 1.4;
      const c = band[((Math.floor(lat * 2) % band.length) + band.length) % band.length];
      const lim = Math.sqrt(1 - (dist / R) ** 2);
      const shade = 0.45 + lim * 0.55;
      const col = c.match(/\w\w/g).map((h) => parseInt(h, 16));
      r = col[0] * shade; g = col[1] * shade; b = col[2] * shade;
      // terminator from the right
      const dark = clamp01((dx / R - 0.2) * 1.6);
      r *= 1 - dark * 0.75; g *= 1 - dark * 0.8; b *= 1 - dark * 0.7;
    } else if (dist < R + 18) {
      const k = 1 - (dist - R) / 18;
      r += 160 * k; g += 120 * k; b += 70 * k;
    }
    // the rings: a thin ellipse in front of the planet's lower half
    const ry = (y - 430) / 40, rx = (x - cx) / 900;
    const ring = Math.abs(rx * rx + ry * ry - 1);
    if (ring < 0.05 && y > 380) {
      const k = (1 - ring / 0.05) * (0.6 + 0.4 * Math.sin(x * 0.07));
      r += 120 * k; g += 105 * k; b += 80 * k;
    }
    // stars
    if (dist > R + 20 && vnoise(x * 0.9, y * 0.9, 1403) > 0.985) { r = 220; g = 230; b = 255; }
    d[o] = Math.min(255, r); d[o + 1] = Math.min(255, g); d[o + 2] = Math.min(255, b); d[o + 3] = 255;
  }
  p._dirty = true;
  // the dome: hexagonal ribs in green steel, and vines across them
  const rib = (x0, y0, x1, y1, w = 3) => {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + (x1 - x0) * (i / n)), y = Math.round(y0 + (y1 - y0) * (i / n));
      for (let k = 0; k < w; k++) p.px(x + (y0 === y1 ? 0 : k), y + (y0 === y1 ? k : 0), k === 0 ? '#5d7c70' : k === w - 1 ? '#111a19' : '#253633');
    }
  };
  for (let x = -40; x < W + 80; x += 128) rib(x, 0, x + 60, H, 4);
  for (let x = 40; x < W + 80; x += 128) rib(x + 60, 0, x, H, 4);
  for (const y of [120, 260, 400]) rib(0, y, W, y, 4);
  const r = rng(1405);
  for (let k = 0; k < 6; k++) {
    let x = r() * W;
    const len = 80 + r() * 220;
    for (let y = 0; y < len; y++) {
      x += Math.sin(y * 0.05 + k) * 0.8;
      p.px(Math.round(x), y, '#0b1a10').px(Math.round(x) + 1, y, '#163018');
      if (y % 9 === 0) for (let i = 0; i < 6; i++) p.px(Math.round(x) + (k % 2 ? i : -i), y + (i >> 1), i < 3 ? '#1e4424' : '#0f2a16');
    }
  }
  return p;
}

// ---------------------------------------------------------------- registry

export const TEXTURES = {
  arb_moss: { ...floor, paint: paintMoss },
  arb_moss_b: { ...floor, paint: paintMossB },
  arb_court: { ...floor, paint: paintCourt },
  arb_court_b: { ...floor, paint: paintCourtB },
  arb_deck: { ...floor, paint: paintDeck },
  arb_deck_b: { ...floor, paint: paintDeckB },
  arb_pad: { ...floor, paint: paintPad },
  arb_choir_floor: { ...floor, paint: paintChoirFloor },
  arb_choir_floor_b: { ...floor, paint: paintChoirFloorB },
  arb_wall: { w: 32, h: 96, wrapX: true, paint: paintWall },
  arb_wall_side: { w: 32, h: 96, wrapX: true, paint: paintWallSide },
  arb_cap: { ...floor, paint: paintCap },
  arb_low: { w: 32, h: 24, wrapX: true, paint: paintLow },
  arb_bed: { w: 32, h: 24, wrapX: true, paint: paintBed },
  arb_soil: { ...floor, paint: paintSoil },
  arb_roots: { w: 32, h: 24, wrapX: true, paint: paintRoots },
  arb_glass: { w: 64, h: 96, alpha: true, paint: paintGlass },
  arb_door: { w: 32, h: 96, paint: paintDoor },
  arb_water: { ...floor, frames: 4, fps: 3, paint: paintWater, strength: 1.2 },
  arb_bank: { w: 32, h: 24, wrapX: true, paint: paintBank },
  arb_silt: { ...floor, paint: paintSilt, strength: 1.6 },
  arb_walkway: { ...floor, paint: paintWalkway },
  arb_flora: { w: FLORA.w, h: FLORA.h, alpha: true, paint: paintFlora, strength: 1.8 },
  arb_tech: { w: TECH.w, h: TECH.h, paint: paintTech },
  arb_decal: { w: DECAL.w, h: DECAL.h, alpha: true, paint: paintDecal, strength: 1.4 },
  arb_bark: { w: 32, h: 64, wrapX: true, wrapY: true, paint: paintBark },
  arb_pod_screen: { w: 64, h: 32, frames: 4, fps: 4, paint: paintPodScreen },
  arb_bd_dome: { w: 1024, h: 512, raw: paintDomeBackdrop },
};
