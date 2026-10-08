// driftmarket: texture painters (browser, TECH_PLAN 3.12), imported by art.js. Every texture is
// pixel art at 32 px per world unit in three layers (colour, height, emissive), painted lazily.
//
// Palette (12.1): warm lantern amber and patched copper wreck plates; red prayer ribbons; teal
// Tethys light; faded Meridian blue paint and verdigris on the oldest plates; frost by the Shoals.
//
// export const TEXTURES   { name: TextureDef } registered by art.js:
//   floors   dm_deck_a / _b ('.' mix), dm_planks_a (','), dm_grate ('='),
//            dm_pad ('o'), dm_frost ('i')
//   walls    dm_hull_a / _b / _c (wreck plates, porthole, ribbon cloth), dm_shopfront, dm_shelves,
//            dm_inn_wall, dm_door, dm_cap, dm_low, dm_rail (alpha railing)
//   props    dm_lantern, dm_awning_red / _teal / _amber, dm_ribbon, dm_crate, dm_barrel,
//            dm_scrap, dm_moth_hull, dm_moth_glass, dm_pad_ring, dm_sign_ruse, dm_sign_inn,
//            dm_sign_noodles, dm_kelp_tank, dm_board, dm_rug, dm_brass, dm_chalk,
//            dm_marble, dm_berth_plate (favours in later maps)
//   backdrop bd_tethys_close (sky.js)

import { mix, shade, rng, bayer } from '../../art/painter.js';
import { RAMPS, GLOW } from '../../art/palette.js';
import { fbm, bolt, rivet, raised, recess, scratch, grime, drawText, textWidth, clamp01 } from '../../art/tiles.js';
import { paintTethysClose } from './sky.js';

// ---------------------------------------------------------------- ramps (dark -> light)

export const CU = ['#1c0e08', '#331a0e', '#4f2a16', '#6d3d1f', '#8f532a', '#b06d38', '#cf8c4c', '#eab474'];   // copper plate
const RU = ['#200d07', '#3d170b', '#5f2411', '#843417', '#a84a20', '#c8672f'];                               // rust
const PA = ['#112925', '#1b4239', '#28604f', '#3b836a', '#5ca98a', '#93d4b5'];                               // verdigris
export const BR = ['#2a1d09', '#523b11', '#80601c', '#ad8629', '#d6ad45', '#f3d685'];                          // brass
const MB = ['#131a25', '#1d2737', '#2a3a51', '#3c526f', '#55708f', '#7c98b4'];                               // faded Meridian blue
export const IR = ['#100c0e', '#1b1517', '#282023', '#372d30', '#4a3e3f', '#625353'];                          // dark iron
const WD = ['#1d110a', '#311c11', '#482a18', '#613a21', '#7d4c2b', '#9c6237', '#bb7f4c'];                    // salvaged planks
const ICE = ['#2a465d', '#43657f', '#6489a5', '#8fb3cb', '#b9d6e8', '#e0f1f9', '#ffffff'];
const AM = RAMPS.amber;
const CR = RAMPS.crimson;
const TE = RAMPS.teal;

const floor = { w: 32, h: 32, wrapX: true, wrapY: true };
const wall = { w: 32, h: 96, wrapX: true };

// ---------------------------------------------------------------- shared strokes

/** Periodic noise over a 32-px tile (seamless when the texture wraps). */
const tn = (x, y, seed, scale = 0.25, oct = 3) => fbm(x * scale, y * scale, seed, oct, 32 * scale, 32 * scale);

/** A riveted plate rectangle: body, lit top-left bevel, dark bottom-right bevel, optional rivets. */
function plate(t, x0, y0, w, h, ramp, { body = 3, ht = 0.55, rivets = true, step = 6 } = {}) {
  t.rect(x0, y0, w, h, ramp[body], ht);
  t.hline(x0, x0 + w - 1, y0, ramp[body + 1], ht + 0.05).vline(x0, y0, y0 + h - 1, ramp[body + 1], ht + 0.05);
  t.hline(x0, x0 + w - 1, y0 + h - 1, ramp[body - 2], ht - 0.15).vline(x0 + w - 1, y0, y0 + h - 1, ramp[body - 2], ht - 0.15);
  t.px(x0, y0, ramp[Math.min(ramp.length - 1, body + 2)]);
  if (!rivets) return;
  for (let x = x0 + 2; x < x0 + w - 2; x += step) {
    rivet(t, x, y0 + 2, ramp, Math.min(ramp.length - 1, body + 2));
    rivet(t, x, y0 + h - 3, ramp, Math.min(ramp.length - 1, body + 2));
  }
}

/** Weld bead: a lumpy bright line with a dark burn either side. */
function weld(t, x0, y0, x1, y1, ramp = CU) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (x1 - x0) * (i / (n || 1))), y = Math.round(y0 + (y1 - y0) * (i / (n || 1)));
    t.px(x, y, i % 2 ? ramp[5] : ramp[4], 0.66);
    if (y0 === y1) { t.tone(x, y - 1, -0.08); t.tone(x, y + 1, -0.1); } else { t.tone(x - 1, y, -0.08); t.tone(x + 1, y, -0.1); }
  }
}

/** Mottled stain (verdigris, rust, soot) where noise beats the cover. */
function stain(t, x0, y0, w, h, seed, color, cover, amt = 0.55) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const v = tn(x, y, seed, 0.3) + cover(x, y) - 0.5;
    if (v > 0.5) t.tint(x, y, color, amt);
    else if (v > 0.38 && bayer(x, y, (v - 0.38) * 3)) t.tint(x, y, color, amt * 0.6);
  }
}

/** Painted stencil letters (faded, chipped). */
function stencil(t, str, x, y, color, chip = 0.25, seed = 3) {
  const r = rng(seed);
  drawText(str, x, y, (px, py) => { if (r() > chip) t.tint(px, py, color, 0.7); });
}

// ---------------------------------------------------------------- floors

/** Copper deck plate: a worn walking polish, rivets, weld seams and patina. */
function deckBase(t, seed) {
  const r = rng(seed);
  t.rect(0, 0, 32, 32, CU[3], 0.55);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = tn(x, y, seed, 0.18, 3);
    if (n > 0.62) t.px(x, y, CU[4]);
    else if (n < 0.36 && bayer(x, y, 0.5)) t.px(x, y, CU[2]);
  }
  // plate seam (dark groove, lit far lip) on the tile edges
  t.hline(0, 31, 0, CU[0], 0.1).vline(0, 0, 31, CU[0], 0.1);
  t.hline(1, 31, 1, CU[5]).vline(1, 1, 31, CU[5]);
  t.hline(1, 31, 31, CU[1], 0.45).vline(31, 1, 31, CU[1], 0.45);
  for (const [x, y] of [[3, 3], [16, 3], [28, 3], [3, 28], [16, 28], [28, 28], [3, 16], [28, 16]]) bolt(t, x, y, CU, 7);
  for (let i = 0; i < 5; i++) scratch(t, r, 4 + r() * 22, 4 + r() * 22, 3 + r() * 6, 1, (r() - 0.5) * 0.6, 0.06);
  return r;
}

function paintDeckA(t) {
  deckBase(t, 811);
  // walked-smooth middle: brighter copper
  grime(t, 6, 6, 20, 20, (x, y) => 0.7 - Math.hypot(x - 15.5, y - 15.5) * 0.07, 0.05);
  stain(t, 0, 0, 32, 32, 812, IR[1], (x, y) => (Math.min(x, y, 31 - x, 31 - y) < 4 ? 0.12 : -0.2), 0.35);
}

function paintDeckB(t) {
  const r = deckBase(t, 821);
  // a patch plate from another ship: faded Meridian blue, welded on, a stencil fragment
  plate(t, 7, 9, 19, 14, IR, { body: 4, ht: 0.62, step: 8 });
  for (let x = 8; x < 25; x++) { t.tint(x, 15, MB[3], 0.45); t.tint(x, 16, MB[3], 0.45); }
  stencil(t, 'M7', 12, 11, '#c9b38a', 0.45, 5);
  weld(t, 6, 8, 26, 8); weld(t, 6, 23, 26, 23); weld(t, 6, 8, 6, 23); weld(t, 26, 8, 26, 23);
  for (let i = 0; i < 18; i++) { const x = 8 + Math.floor(r() * 17), y = 10 + Math.floor(r() * 12); t.tint(x, y, RU[3], 0.5); }
}

/** Salvaged composite planks laid east-west, nailed with rivets. */
function planks(t, seed) {
  const r = rng(seed);
  const tones = [WD[3], WD[4], WD[3], WD[2]];
  for (let k = 0; k < 4; k++) {
    const y0 = k * 8;
    const base = tones[(k + seed) % 4];
    t.rect(0, y0, 32, 8, base, 0.55);
    t.hline(0, 31, y0, WD[0], 0.12);
    t.hline(0, 31, y0 + 1, shade(base, 0.08));
    t.hline(0, 31, y0 + 7, shade(base, -0.1), 0.48);
    // grain streaks
    for (let i = 0; i < 6; i++) {
      const y = y0 + 2 + Math.floor(r() * 5), x = Math.floor(r() * 32), len = 3 + Math.floor(r() * 10);
      for (let j = 0; j < len; j++) t.tone(x + j, y, r() < 0.5 ? -0.05 : 0.04);
    }
    // butt joint and rivets at a per-plank offset
    const joint = (k * 13 + seed * 7) % 32;
    t.vline(joint, y0 + 1, y0 + 6, WD[0], 0.15).vline((joint + 1) % 32, y0 + 1, y0 + 6, shade(base, 0.1));
    rivet(t, (joint + 3) % 32, y0 + 3, BR, 4);
    rivet(t, (joint + 29) % 32, y0 + 4, BR, 4);
  }
  grime(t, 0, 0, 32, 32, (x, y) => tn(x, y, seed + 2, 0.2) - 0.42, -0.05);
}

function paintPlanksA(t) { planks(t, 841); }

/** Promenade grating: brass slats over a warm under-glow, rivet frame. */
function paintGrate(t) {
  t.rect(0, 0, 32, 32, BR[2], 0.55);
  t.hline(0, 31, 0, BR[0], 0.1).vline(0, 0, 31, BR[0], 0.1);
  t.hline(1, 31, 1, BR[4]).vline(1, 1, 31, BR[4]);
  t.hline(1, 31, 31, BR[1], 0.45).vline(31, 1, 31, BR[1], 0.45);
  const glow = [AM[0], AM[1], AM[2], AM[3], AM[4]];
  for (let y = 4; y < 28; y++) for (let x = 4; x < 28; x++) {
    const slat = (x - 4) % 4;
    if (slat === 0) t.px(x, y, BR[4], 0.62);
    else if (slat === 1) t.px(x, y, BR[2], 0.58);
    else {
      const d = Math.hypot((x - 15.5) / 12, (y - 15.5) / 12);
      let k = (1 - d) * 2.6 - (slat === 2 ? 0.9 : 0);
      k = Math.floor(k) + (bayer(x, y, k - Math.floor(k)) ? 1 : 0);
      const c = glow[Math.max(0, Math.min(glow.length - 1, k))];
      t.glow(x, y, c, k <= 0 ? '#1c0a03' : c);
      t.ht(x, y, 0.05);
    }
  }
  t.hline(3, 28, 3, BR[1], 0.4).hline(3, 28, 28, BR[4], 0.6);
  for (const [x, y] of [[2, 2], [29, 2], [2, 29], [29, 29]]) bolt(t, x, y, BR, 5);
}

/** Landing pad plate: dark iron tread with a faint scorch (the painted ring is a decal). */
function paintPad(t) {
  const r = rng(851);
  t.rect(0, 0, 32, 32, IR[3], 0.55);
  for (let j = 0, y = 2; y < 30; j++, y += 4) {
    for (let x = 2 + (j % 2) * 2; x < 30; x += 4) { t.px(x, y, IR[4], 0.65).px(x + 1, y + 1, IR[4], 0.65).tone(x + 1, y + 2, -0.08); }
  }
  t.hline(0, 31, 0, IR[0], 0.1).vline(0, 0, 31, IR[0], 0.1);
  t.hline(1, 31, 1, IR[5]).vline(1, 1, 31, IR[5]);
  for (const [x, y] of [[3, 3], [28, 3], [3, 28], [28, 28]]) bolt(t, x, y, IR, 5);
  stain(t, 0, 0, 32, 32, 852, '#120806', (x, y) => tn(x, y, 853) - 0.3, 0.5);
  for (let i = 0; i < 4; i++) scratch(t, r, 4 + r() * 22, 4 + r() * 22, 4 + r() * 8, 1, (r() - 0.5) * 0.3, 0.07);
}

/** Copper plates crusted with frost from the Shoals hatch. */
function paintFrost(t) {
  deckBase(t, 861);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const v = tn(x, y, 862, 0.22, 4);
    if (v > 0.56) t.px(x, y, v > 0.68 ? ICE[5] : ICE[4], 0.6);
    else if (v > 0.44 && bayer(x, y, (v - 0.44) * 4)) t.px(x, y, ICE[3], 0.58);
  }
  const r = rng(863);
  for (let i = 0; i < 9; i++) t.glow(Math.floor(r() * 32), Math.floor(r() * 32), ICE[6], '#9fd8ff');
}

// ---------------------------------------------------------------- walls (32 x 96; row 0 = top)

/** The wreck-plate wall every hull variant shares: a mosaic of plates from different ships. */
function hullBase(t, seed) {
  const r = rng(seed);
  t.rect(0, 0, 32, 96, IR[2], 0.4);
  // top trim: a brass girder with rivets
  plate(t, 0, 0, 32, 7, BR, { body: 2, ht: 0.8, step: 8 });
  // plate mosaic: three rows of plates, each from a different hull
  const rows = [[7, 30], [37, 24], [61, 22]];
  const ramps = [CU, RU, MB, CU, PA, CU];
  let k = seed % 5;
  for (const [y0, h] of rows) {
    let x = -((seed * 7 + y0) % 13);
    while (x < 32) {
      const w = 12 + Math.floor(r() * 14);
      const ramp = ramps[k++ % ramps.length];
      const body = ramp === PA ? 2 : 3;
      plate(t, x, y0, w, h, ramp, { body, ht: 0.5 + r() * 0.1, step: 5 });
      x += w;
    }
  }
  // kickplate: dark iron with soot
  plate(t, 0, 83, 32, 13, IR, { body: 3, ht: 0.62, step: 8 });
  grime(t, 0, 86, 32, 10, (x, y) => (y - 86) / 10 + (fbm(x * 0.3, y * 0.3, seed, 2) - 0.5) * 0.5, -0.06);
  // a cable run along the seam between the rows
  for (let x = 0; x < 32; x++) { t.px(x, 36, IR[1], 0.75).px(x, 35, IR[4], 0.8); }
  for (let x = 4; x < 32; x += 10) t.rect(x, 34, 2, 4, BR[3], 0.85);
  // rust streaks bleeding down from rivets
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r() * 32), y = 9 + Math.floor(r() * 60), len = 4 + Math.floor(r() * 10);
    for (let j = 0; j < len; j++) if (bayer(x, y + j, 0.7 - j / len * 0.6)) t.tint(x, y + j, RU[2], 0.5);
  }
  for (let i = 0; i < 6; i++) scratch(t, r, r() * 30, 10 + r() * 70, 3 + r() * 5, 1, (r() - 0.5) * 0.3, 0.06);
  return r;
}

function paintHullA(t) {
  hullBase(t, 901);
  // a faded Meridian stencil on the blue plate band
  stencil(t, 'MERIDIAN', 2, 66, '#9fb6cf', 0.45, 9);
}

function paintHullB(t) {
  hullBase(t, 902);
  // a porthole full of teal Tethys light
  const cx = 15.5, cy = 46.5;
  for (let y = 36; y < 58; y++) for (let x = 5; x < 27; x++) {
    const d = Math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy);
    if (d < 10.5 && d >= 8.2) t.px(x, y, d < 9.3 ? BR[4] : BR[2], 0.75);
    else if (d < 8.2) {
      const g = 1 - d / 8.2;
      const c = g > 0.66 ? TE[5] : g > 0.33 ? TE[4] : TE[3];
      t.glow(x, y, c, c);
      t.ht(x, y, 0.3);
    }
  }
  t.glow(12, 42, '#e6fffb').glow(13, 42, '#9df8ee').glow(12, 43, '#9df8ee');
  for (const a of [0, 1, 2, 3, 4, 5]) {
    const x = Math.round(cx + Math.cos(a * Math.PI / 3) * 9.5), y = Math.round(cy + Math.sin(a * Math.PI / 3) * 9.5);
    t.px(x, y, BR[5], 0.9);
  }
}

function paintHullC(t) {
  hullBase(t, 903);
  // a red cloth banner hung on the plates, embroidered with a ring sigil
  for (let y = 10; y < 70; y++) for (let x = 8; x < 24; x++) {
    const hem = y > 64 && ((x + Math.floor(y / 2)) % 4 < 2);
    if (y > 66 && hem) continue;
    const fold = (x - 8) % 5 === 0 ? -0.08 : (x - 8) % 5 === 1 ? 0.05 : 0;
    t.px(x, y, shade(CR[2], fold), 0.62);
  }
  t.hline(7, 24, 10, BR[4], 0.8).hline(7, 24, 11, BR[2], 0.75);
  for (let a = 0; a < 40; a++) {
    const ang = (a / 40) * Math.PI * 2;
    t.px(Math.round(16 + Math.cos(ang) * 5), Math.round(36 + Math.sin(ang) * 5), AM[4], 0.66);
  }
  t.hline(10, 22, 36, AM[3], 0.66);
  t.glow(16, 36, AM[5], AM[4]);
}

/** Ruse's shopfront: patched plates around a warm window, a counter hatch and a ribbon swag. */
function paintShopfront(t) {
  hullBase(t, 911);
  // window with lamplight and silhouettes of junk on the sill
  recess(t, 4, 18, 24, 26, AM[2], CU[0], CU[5], 0.3);
  for (let y = 19; y < 43; y++) for (let x = 5; x < 27; x++) {
    const k = clamp01(1 - Math.hypot(x - 16, y - 26) / 16);
    const c = k > 0.6 ? AM[5] : k > 0.35 ? AM[4] : AM[3];
    t.glow(x, y, c, c);
    t.ht(x, y, 0.3);
  }
  for (let x = 5; x < 27; x += 1) {
    const h = [3, 5, 2, 6, 4, 2, 7, 3][x % 8];
    for (let y = 42 - h; y < 43; y++) { t.px(x, y, IR[1], 0.4); t.emit(x, y, '#000000'); }
  }
  t.vline(16, 19, 42, CU[2], 0.55).hline(5, 26, 30, CU[2], 0.55);
  t.emit(16, 30, '#000000');
  // a swag of red ribbon across the top
  for (let x = 0; x < 32; x++) {
    const y = 14 + Math.round(Math.sin((x / 32) * Math.PI) * 3);
    t.px(x, y, CR[3], 0.75).px(x, y + 1, CR[2], 0.7);
  }
}

/** Ruse's back wall: shelves of salvage (jars, coils, a glowing cell or two). */
function paintShelves(t) {
  const r = hullBase(t, 921);
  const shelves = [22, 44, 66];
  for (const y of shelves) {
    t.hline(0, 31, y, WD[5], 0.85).hline(0, 31, y + 1, WD[3], 0.8).hline(0, 31, y + 2, WD[1], 0.6);
    // items on the shelf
    let x = Math.floor(r() * 3);
    while (x < 30) {
      const kind = Math.floor(r() * 5), w = 3 + Math.floor(r() * 4), h = 5 + Math.floor(r() * 9);
      const top = y - h;
      if (kind === 0) {                       // a jar with something glowing in it
        const c = [TE[4], AM[4], '#9dff7a'][Math.floor(r() * 3)];
        t.rect(x, top, w, h, IR[3], 0.7);
        for (let yy = top + 2; yy < y - 1; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) t.glow(xx, yy, shade(c, -0.15), shade(c, -0.25));
        t.hline(x, x + w - 1, top, BR[4], 0.75);
      } else if (kind === 1) {                // coil of cable
        for (let yy = top; yy < y; yy++) t.hline(x, x + w - 1, yy, (yy - top) % 2 ? RU[3] : RU[4], 0.7);
      } else if (kind === 2) {                // a stack of plates
        for (let yy = top; yy < y; yy += 2) t.hline(x, x + w - 1, yy, CU[4], 0.7).hline(x, x + w - 1, yy + 1, CU[2], 0.65);
      } else if (kind === 3) {                // a boxed part with a label
        raised(t, x, top, w, h, MB[3], MB[4], MB[1], 0.7);
        t.px(x + 1, top + 2, '#e6dcc0');
      } else {                                // a brass gizmo
        raised(t, x, top + 2, w, h - 2, BR[3], BR[5], BR[1], 0.72);
        t.glow(x + 1, top + 3, GLOW.red, GLOW.red);
      }
      x += w + 1 + Math.floor(r() * 2);
    }
  }
  // price tags hanging off the shelf lips
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r() * 30), y = shelves[i % 3] + 3;
    t.px(x, y, '#f0e2c0', 0.75).px(x, y + 1, '#c9b38a', 0.7);
  }
}

/** Inn back wall: warm panels, a hanging rug, two sconces. */
function paintInnWall(t) {
  const r = rng(931);
  t.rect(0, 0, 32, 96, WD[3], 0.5);
  plate(t, 0, 0, 32, 7, BR, { body: 2, ht: 0.8, step: 8 });
  for (let x = 0; x < 32; x += 8) {
    t.vline(x, 7, 82, WD[1], 0.38).vline(x + 1, 7, 82, WD[5]);
    for (let i = 0; i < 4; i++) { const y = 8 + Math.floor(r() * 72); t.vline(x + 3 + Math.floor(r() * 4), y, y + 4, WD[2]); }
  }
  // rug: a woven teal and red pattern
  for (let y = 18; y < 62; y++) for (let x = 5; x < 27; x++) {
    const band = Math.floor((y - 18) / 4) % 4;
    const diamond = Math.abs(((x - 16) % 8 + 8) % 8 - 4) + Math.abs(((y - 40) % 8 + 8) % 8 - 4) < 3;
    const c = diamond ? AM[3] : [CR[2], TE[2], CR[3], CR[1]][band];
    t.px(x, y, c, 0.58);
  }
  t.hline(4, 27, 17, BR[4], 0.8);
  for (let x = 5; x < 27; x += 2) t.px(x, 62, CR[3], 0.55).px(x, 63, CR[2], 0.52);
  // wainscot
  plate(t, 0, 68, 32, 15, WD, { body: 2, ht: 0.6, step: 8 });
  plate(t, 0, 83, 32, 13, IR, { body: 3, ht: 0.62, step: 8 });
  // sconce lamp
  t.rect(29, 30, 3, 6, BR[3], 0.8);
  t.glow(30, 28, AM[5]).glow(30, 27, AM[6]).glow(31, 28, AM[4]);
}

function paintDoor(t) {
  // a round-cornered hatch made of two plates with a porthole
  t.rect(0, 0, 32, 96, IR[2], 0.5);
  plate(t, 1, 4, 30, 88, CU, { body: 3, ht: 0.6, step: 7 });
  plate(t, 4, 50, 24, 30, RU, { body: 3, ht: 0.66, step: 6 });
  for (let y = 20; y < 36; y++) for (let x = 9; x < 23; x++) {
    const d = Math.hypot(x - 15.5, y - 27.5);
    if (d < 7.2 && d >= 5.6) t.px(x, y, BR[4], 0.8);
    else if (d < 5.6) { const c = d < 3 ? AM[5] : AM[4]; t.glow(x, y, c, c); t.ht(x, y, 0.3); }
  }
  for (let y = 40; y < 48; y++) t.px(26, y, BR[4], 0.85).px(27, y, BR[2], 0.8);
}

function paintCap(t) {
  t.rect(0, 0, 32, 32, BR[2], 0.6);
  for (let y = 0; y < 32; y += 8) t.hline(0, 31, y, BR[0], 0.4).hline(0, 31, y + 1, BR[4], 0.7);
  for (let x = 4; x < 32; x += 8) for (let y = 4; y < 32; y += 8) rivet(t, x, y, BR, 5);
  stain(t, 0, 0, 32, 32, 941, PA[3], () => -0.05, 0.5);
}

function paintLow(t) {
  t.rect(0, 0, 32, 24, CU[3], 0.55);
  plate(t, 0, 0, 16, 24, CU, { body: 3, ht: 0.55, step: 5 });
  plate(t, 16, 0, 16, 24, RU, { body: 3, ht: 0.55, step: 5 });
  t.hline(0, 31, 0, BR[4], 0.8).hline(0, 31, 1, BR[2], 0.7);
  grime(t, 0, 16, 32, 8, (x, y) => (y - 16) / 8, -0.06);
}

/** Viewport railing (alpha): brass top rail, balusters, a kick rail; the sky shows between. */
function paintRail(t) {
  for (let x = 0; x < 32; x++) {
    t.put(x, 0, BR[5], 0.9); t.put(x, 1, BR[4], 0.85); t.put(x, 2, BR[2], 0.7);
    t.put(x, 12, BR[3], 0.7); t.put(x, 13, BR[2], 0.65); t.put(x, 14, IR[3], 0.6); t.put(x, 15, IR[2], 0.55);
  }
  for (const bx of [3, 11, 19, 27]) {
    for (let y = 3; y < 12; y++) { t.put(bx, y, BR[4], 0.75); t.put(bx + 1, y, BR[2], 0.7); }
    t.put(bx, 6, BR[5]).put(bx + 1, 6, BR[3]);
  }
}

/** The rail's top (alpha): only the handrail along the south edge, so the sky shows past it. */
function paintRailCap(t) {
  for (let x = 0; x < 32; x++) {
    t.put(x, 28, BR[5], 0.9); t.put(x, 29, BR[4], 0.9); t.put(x, 30, BR[3], 0.85); t.put(x, 31, BR[2], 0.8);
  }
  for (let x = 4; x < 32; x += 8) t.put(x, 29, BR[5]).put(x + 1, 30, BR[1]);
}

// ---------------------------------------------------------------- props

/** A paper lantern: red ribbed paper glowing from inside (the emissive layer blooms). */
function paintLantern(t) {
  for (let y = 2; y < 14; y++) {
    const half = Math.round(Math.sin(((y - 1.5) / 12) * Math.PI) * 5.5) + 1;
    for (let x = 8 - half; x < 8 + half; x++) {
      const rib = (y - 2) % 3 === 0;
      const edge = x === 8 - half || x === 8 + half - 1;
      const inner = 1 - Math.abs(x + 0.5 - 8) / half;
      const c = rib ? CR[2] : edge ? CR[3] : inner > 0.55 ? '#ffb46a' : inner > 0.25 ? CR[4] : CR[3];
      t.glow(x, y, c, rib ? '#3a0a12' : shade(c, -0.3));
    }
  }
  t.rect(5, 0, 6, 2, IR[3], 0.8).rect(5, 14, 6, 2, IR[3], 0.8);
  t.px(7, 15, AM[4]).px(8, 15, AM[3]);
}

function paintAwning(t, ramp) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const stripe = Math.floor(x / 8) % 2;
    const base = stripe ? ramp[3] : '#e8d2a6';
    const shadeV = y < 2 ? 0.06 : y > 26 ? -0.08 : 0;
    t.px(x, y, shade(base, shadeV), 0.55);
    if (y >= 28 && (x % 8 === 0 || x % 8 === 7)) t.px(x, y, null);
  }
  // scalloped hem
  for (let x = 0; x < 32; x++) {
    const d = Math.abs((x % 8) - 3.5);
    for (let y = 28; y < 32; y++) if (y - 28 > 3 - d * 0.9) t.put(x, y, null);
  }
  stain(t, 0, 0, 32, 28, 951, IR[1], () => -0.1, 0.3);
}

/** A prayer ribbon: crimson cloth with a hand-stitched name glyph and a frayed tail (alpha). */
function paintRibbon(t) {
  for (let y = 0; y < 32; y++) {
    const w = y > 26 ? 6 - (y - 26) : 6;
    for (let x = 1; x < 1 + w; x++) {
      const tail = y > 26 && (x + y) % 3 === 0;
      if (tail) continue;
      const c = x === 1 ? CR[2] : x === w ? CR[2] : (y % 6 === 0 ? CR[4] : CR[3]);
      t.put(x, y, c, 0.55);
      if (y < 24) t.emit(x, y, shade(c, -0.6));
    }
  }
  for (const y of [8, 9, 14, 15, 16]) t.put(3, y, AM[5], 0.6).emit(3, y, AM[4]);
  t.put(4, 9, AM[4]).put(2, 15, AM[4]);
}

function paintCrate(t) {
  plate(t, 0, 0, 32, 32, CU, { body: 4, ht: 0.6, step: 7 });
  t.rect(4, 4, 24, 24, CU[3], 0.5);
  t.line(4, 4, 27, 27, CU[5], 0.6);
  t.line(27, 4, 4, 27, CU[2], 0.55);
  stencil(t, 'RB', 11, 12, '#f2dcb0', 0.2, 961);
  stain(t, 0, 0, 32, 32, 962, RU[2], (x, y) => (y > 24 ? 0.15 : -0.1), 0.5);
}

function paintBarrel(t) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const k = Math.sin(((x + 0.5) / 32) * Math.PI);
    const c = k > 0.8 ? RU[5] : k > 0.55 ? RU[4] : k > 0.3 ? RU[3] : RU[2];
    t.px(x, y, c, 0.5 + k * 0.1);
  }
  for (const y of [3, 4, 15, 16, 27, 28]) t.hline(0, 31, y, y % 2 ? IR[4] : IR[2], 0.7);
  stencil(t, 'H2O', 8, 7, '#e6dcc0', 0.3, 971);
}

function paintScrap(t) {
  const r = rng(981);
  t.rect(0, 0, 32, 32, IR[2], 0.4);
  for (let i = 0; i < 9; i++) {
    const w = 6 + Math.floor(r() * 12), h = 4 + Math.floor(r() * 8);
    const x = Math.floor(r() * 30) - 4, y = Math.floor(r() * 30) - 4;
    const ramp = [CU, RU, MB, IR, PA][i % 5];
    plate(t, x, y, w, h, ramp, { body: ramp === PA ? 2 : 3, ht: 0.45 + r() * 0.3, step: 4 });
  }
  for (let i = 0; i < 4; i++) scratch(t, r, r() * 30, r() * 30, 4 + r() * 6, 1, r() - 0.5, 0.08);
}

/** The Moth's hull: Ringborn salvage plates, a painted moth-wing stripe, and tape. */
/** The Moth's patched plates: pale salvage cream like the skiff in the Halcyon's berth. */
const MOTH = ['#4d463e', '#615749', '#776a56', '#8c7c62', '#a8987a', '#c4b494', '#ddd0b4'];

function paintMothHull(t) {
  // patched taupe plates, the teal Ringborn stripe, BOLT's tape and running lights (like the berth Moth)
  const r = rng(991);
  const P = MOTH;
  plate(t, 0, 0, 22, 32, P, { body: 4, ht: 0.55, step: 6 });
  plate(t, 22, 0, 20, 16, CU, { body: 4, ht: 0.58, step: 5 });
  plate(t, 22, 16, 20, 16, P, { body: 3, ht: 0.52, step: 5 });
  plate(t, 42, 0, 22, 32, P, { body: 4, ht: 0.55, step: 6 });
  for (let x = 0; x < 64; x++) t.px(x, 14, TE[3], 0.6).px(x, 15, TE[4], 0.6).px(x, 16, TE[2], 0.58);
  for (let y = 6; y < 22; y++) t.px(58 + (y % 2), y, CR[3], 0.6);
  for (const [x0, y0] of [[26, 4], [29, 7], [44, 19]]) {
    for (let i = 0; i < 11; i++) { t.px(x0 + i, y0 + (i >> 2), '#d5cfb6', 0.66); t.px(x0 + i, y0 + 1 + (i >> 2), '#b9b39c', 0.62); }
  }
  stain(t, 0, 0, 64, 32, 992, '#0f0b0d', (x, y) => (y > 26 ? 0.2 : -0.12), 0.45);
  for (let i = 0; i < 6; i++) scratch(t, r, r() * 60, r() * 30, 4 + r() * 6, 1, (r() - 0.5) * 0.4, 0.07);
  for (const x of [3, 4]) t.glow(x, 15, TE[5], TE[4]);
  for (const x of [60, 61]) t.glow(x, 15, CR[4], CR[3]);
}

function paintMothGlass(t) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
    const k = 1 - y / 16;
    const c = k > 0.7 ? '#9df8ee' : k > 0.4 ? TE[4] : TE[3];
    t.glow(x, y, c, shade(c, -0.1));
  }
  for (let x = 0; x < 32; x += 8) for (let y = 0; y < 16; y++) t.px(x, y, IR[3], 0.7).emit(x, y, '#000000');
  t.glow(4, 3, '#ffffff').glow(5, 3, '#e6fffb');
}

/** Big painted landing ring for the Moth's pad (256 x 256 over 8 x 8 units, alpha). */
function paintPadRing(t) {
  const N = 256, c = 128;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
    const a = Math.atan2(y + 0.5 - c, x + 0.5 - c);
    const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16) % 2 === 0;
    if (d > 104 && d < 116) {
      if (seg) t.put(x, y, d > 110 ? '#c8641e' : '#f08a2a', 0.6);
      else if (d > 108 && d < 112) t.put(x, y, '#9a1b30', 0.58);
    } else if (d > 68 && d < 72) {
      t.put(x, y, '#c8641e', 0.58);
    } else if (d > 70 && d < 104 && Math.abs(Math.sin(a * 4)) < 0.03) {
      t.put(x, y, '#7a3a14', 0.56);
    }
    // landing lights around the outer ring
    if (d > 118 && d < 124 && Math.abs(Math.sin(a * 6)) > 0.985) { t.put(x, y, AM[5], 0.7); t.emit(x, y, AM[5]); }
  }
  // the station's ring sigil in the middle: a circle crossed by the ring plane
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
    if (Math.abs(d - 28) < 2) t.put(x, y, '#d82d45', 0.6);
    if (Math.abs((y - c) - (x - c) * 0.3) < 2 && Math.abs(x - c) < 48) t.put(x, y, '#d82d45', 0.6);
  }
}

/** Pip's chalk hopscotch on the Row (48 x 96 over 1.5 x 3 units, alpha): squares 1-7, the ring at the top. */
function paintChalk(t) {
  const r = rng(41);
  const C = ['#ece4cf', '#f2a3b6', '#f3d47c', '#93e0d4'];
  const dot = (x, y, c) => { if (r() > 0.18) t.put(x, y, c, 0.52); };
  const box = (x0, y0, w, h, c) => {
    for (let x = x0; x < x0 + w; x++) { dot(x, y0, c); dot(x, y0 + 1, c); dot(x, y0 + h - 2, c); dot(x, y0 + h - 1, c); }
    for (let y = y0; y < y0 + h; y++) { dot(x0, y, c); dot(x0 + 1, y, c); dot(x0 + w - 2, y, c); dot(x0 + w - 1, y, c); }
  };
  const num = (n, cx, cy, c) => drawText(String(n), cx - 2, cy - 3, (x, y) => dot(x, y, c));
  // from the bottom (near the viewer) up: 1, 2|3, 4, 5|6, 7, then the ring
  const rows = [[[1]], [[2, 3]], [[4]], [[5, 6]], [[7]]];
  rows.forEach(([ns], i) => {
    const y0 = 80 - i * 14;
    ns.forEach((n, j) => {
      const x0 = ns.length === 1 ? 16 : 9 + j * 15, c = C[(n + i) % 4];
      box(x0, y0, 16, 15, c);
      num(n, x0 + 8, y0 + 8, c);
    });
  });
  // the ring: a circle crossed by the ring plane, like the pad sigil
  for (let y = 0; y < 14; y++) for (let x = 8; x < 40; x++) {
    const d = Math.hypot((x + 0.5 - 24) / 1.25, y + 0.5 - 8);
    if (Math.abs(d - 6.5) < 1) dot(x, y, C[3]);
    if (Math.abs((y - 8) + (x - 24) * 0.25) < 0.8 && Math.abs(x - 24) < 14) dot(x, y, C[1]);
  }
  // a five-point star and a wobbly moth in the corners
  const star = [0, 1, 2, 3, 4].map((k) => [41 + Math.cos(-Math.PI / 2 + k * 1.2566) * 5, 84 + Math.sin(-Math.PI / 2 + k * 1.2566) * 5]);
  for (let k = 0; k < 5; k++) {
    const [ax, ay] = star[k], [bx, by] = star[(k + 2) % 5];
    for (let i = 0; i <= 10; i++) dot(Math.round(ax + (bx - ax) * i / 10), Math.round(ay + (by - ay) * i / 10), C[2]);
  }
  for (const [x, y] of [[3, 60], [4, 59], [5, 60], [4, 61], [2, 58], [6, 58], [1, 59], [7, 59], [2, 61], [6, 61], [4, 62], [4, 63]]) dot(x, y, C[0]);
}

/** Pip's marble frozen into a cup of ice (alpha; a favour in the Shoals). */
function paintMarble(t) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
    if (d < 3.2) {
      const k = clamp01(1 - Math.hypot(x + 0.5 - 7, y + 0.5 - 7) / 3.5);
      const c = k > 0.7 ? '#e6fbff' : k > 0.35 ? '#6fd2ff' : '#2f7fd0';
      t.glow(x, y, c, shade(c, -0.2));
    } else if (d < 6.5 && bayer(x, y, 0.75 - (d - 3.2) * 0.12)) {
      t.put(x, y, d < 4.5 ? ICE[5] : ICE[4], 0.5);
    }
  }
}

/** The Meridian's berth plate by the old airlock (a favour for Marta). */
function paintBerthPlate(t) {
  t.rect(0, 0, 64, 24, BR[3], 0.6);
  stain(t, 0, 0, 64, 24, 61, PA[3], () => 0.25, 0.6);
  t.hline(0, 63, 0, BR[5], 0.7).hline(0, 63, 23, BR[1], 0.5).vline(0, 0, 23, BR[4], 0.7).vline(63, 0, 23, BR[1], 0.5);
  for (const [x, y] of [[2, 2], [61, 2], [2, 21], [61, 21]]) rivet(t, x, y, BR, 5);
  const cx = (str) => Math.floor((64 - textWidth(str)) / 2);
  drawText('MERIDIAN', cx('MERIDIAN'), 4, (x, y) => t.put(x, y, BR[1], 0.45));
  drawText('BERTH 1', cx('BERTH 1'), 13, (x, y) => t.put(x, y, BR[1], 0.45));
}

/** A hanging shop sign: dark plate, brass frame, glowing painted letters. */
function sign(t, w, h, text, color, sub) {
  t.rect(0, 0, w, h, IR[2], 0.55);
  t.hline(0, w - 1, 0, BR[4], 0.8).hline(0, w - 1, h - 1, BR[1], 0.7).vline(0, 0, h - 1, BR[3], 0.75).vline(w - 1, 0, h - 1, BR[2], 0.7);
  const tw = textWidth(text);
  const x0 = Math.floor((w - tw) / 2), y0 = sub ? 3 : Math.floor((h - 7) / 2);
  drawText(text, x0, y0, (x, y) => t.glow(x, y, color));
  if (sub) {
    const sw = textWidth(sub);
    drawText(sub, Math.floor((w - sw) / 2), y0 + 9, (x, y) => t.glow(x, y, shade(color, -0.2), shade(color, -0.3)));
  }
  for (const x of [3, w - 4]) t.px(x, 2, BR[5], 0.9).px(x, h - 3, BR[5], 0.9);
}

function paintKelpTank(t) {
  t.rect(0, 0, 32, 48, IR[2], 0.5);
  plate(t, 0, 0, 32, 5, BR, { body: 3, ht: 0.8, step: 8 });
  plate(t, 0, 42, 32, 6, BR, { body: 2, ht: 0.75, step: 8 });
  for (let y = 5; y < 42; y++) for (let x = 2; x < 30; x++) {
    const sway = Math.sin(y * 0.35 + x * 0.6) * 1.5;
    const frond = Math.abs(((x + sway) % 7) - 3.5) < 1.1 && y > 10;
    const c = frond ? (y % 4 ? '#3fae58' : '#7ddf7a') : y < 9 ? TE[4] : TE[3];
    t.glow(x, y, c, frond ? shade(c, -0.25) : shade(c, -0.45));
    t.ht(x, y, 0.3);
  }
  for (const [x, y] of [[8, 20], [21, 14], [14, 31], [25, 36]]) t.glow(x, y, '#e6fffb');
}

function paintBoard(t) {
  plate(t, 0, 0, 64, 32, WD, { body: 4, ht: 0.55, step: 8 });
  const notes = [[5, 5, '#e8dcc0'], [21, 7, '#f0c94d'], [38, 4, '#e8dcc0'], [50, 9, '#ffb0b0']];
  for (const [x, y, c] of notes) {
    t.rect(x, y, 11, 14, c, 0.62);
    for (let k = 0; k < 4; k++) t.hline(x + 2, x + 8, y + 3 + k * 2, shade(c, -0.35), 0.62);
    t.px(x + 5, y, CR[3], 0.8);
  }
  t.rect(10, 22, 44, 6, IR[2], 0.6);
  drawText('FAVOURS', 13, 22, (x, y) => t.glow(x, y, AM[4]));
}

function paintRug(t) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) {
    const edge = y < 2 || y > 29 || x < 2 || x > 61;
    const d = Math.abs(((x % 16) - 8)) + Math.abs(((y % 16) - 8));
    const c = edge ? CR[1] : d < 4 ? AM[3] : d < 6 ? TE[2] : (x + y) % 2 ? CR[2] : CR[3];
    t.px(x, y, c, 0.52);
  }
}

function paintBrass(t) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = fbm(x * 0.2, y * 0.2, 1001, 3, 6.4, 6.4);
    const c = n > 0.62 ? BR[5] : n > 0.48 ? BR[4] : n > 0.36 ? BR[3] : BR[2];
    t.px(x, y, c, 0.5 + n * 0.2);
  }
  stain(t, 0, 0, 32, 32, 1002, PA[3], () => -0.1, 0.55);
  for (let x = 0; x < 32; x += 16) for (let y = 0; y < 32; y += 16) rivet(t, x + 3, y + 3, BR, 5);
}

// ---------------------------------------------------------------- registry

export const TEXTURES = {
  dm_deck_a: { ...floor, paint: paintDeckA },
  dm_deck_b: { ...floor, paint: paintDeckB },
  dm_planks_a: { ...floor, paint: paintPlanksA },
  dm_grate: { ...floor, paint: paintGrate },
  dm_pad: { ...floor, paint: paintPad },
  dm_frost: { ...floor, paint: paintFrost, strength: 2 },
  dm_hull_a: { ...wall, paint: paintHullA },
  dm_hull_b: { ...wall, paint: paintHullB },
  dm_hull_c: { ...wall, paint: paintHullC },
  dm_shopfront: { ...wall, paint: paintShopfront },
  dm_shelves: { ...wall, paint: paintShelves },
  dm_inn_wall: { ...wall, paint: paintInnWall },
  dm_door: { w: 32, h: 96, paint: paintDoor },
  dm_cap: { ...floor, paint: paintCap },
  dm_low: { w: 32, h: 24, wrapX: true, paint: paintLow },
  dm_rail: { w: 32, h: 16, wrapX: true, alpha: true, paint: paintRail },
  dm_rail_cap: { w: 32, h: 32, wrapX: true, alpha: true, paint: paintRailCap },
  dm_lantern: { w: 16, h: 16, alpha: true, paint: paintLantern, strength: 1 },
  dm_awning_red: { w: 32, h: 32, wrapX: true, alpha: true, paint: (t) => paintAwning(t, CR) },
  dm_awning_teal: { w: 32, h: 32, wrapX: true, alpha: true, paint: (t) => paintAwning(t, TE) },
  dm_awning_amber: { w: 32, h: 32, wrapX: true, alpha: true, paint: (t) => paintAwning(t, AM) },
  dm_ribbon: { w: 8, h: 32, alpha: true, paint: paintRibbon, strength: 1.2 },
  dm_crate: { w: 32, h: 32, paint: paintCrate },
  dm_barrel: { w: 32, h: 32, wrapX: true, paint: paintBarrel },
  dm_scrap: { ...floor, paint: paintScrap },
  dm_moth_hull: { w: 64, h: 32, wrapX: true, wrapY: true, paint: paintMothHull },
  dm_moth_glass: { w: 32, h: 16, paint: paintMothGlass, strength: 0.8 },
  dm_pad_ring: { w: 256, h: 256, alpha: true, paint: paintPadRing, strength: 1 },
  dm_sign_ruse: { w: 64, h: 24, paint: (t) => sign(t, 64, 24, "RUSE'S", AM[5], 'SALVAGE') },
  dm_sign_inn: { w: 64, h: 16, paint: (t) => sign(t, 64, 16, 'THE LANTERN', AM[4]) },
  dm_sign_noodles: { w: 48, h: 16, paint: (t) => sign(t, 48, 16, 'NOODLES', '#ff6a5a') },
  dm_kelp_tank: { w: 32, h: 48, paint: paintKelpTank, strength: 1.4 },
  dm_board: { w: 64, h: 32, paint: paintBoard },
  dm_chalk: { w: 48, h: 96, alpha: true, paint: paintChalk },
  dm_marble: { w: 16, h: 16, alpha: true, paint: paintMarble, strength: 1 },
  dm_berth_plate: { w: 64, h: 24, paint: paintBerthPlate },
  dm_rug: { w: 64, h: 32, wrapX: true, wrapY: true, paint: paintRug, strength: 1 },
  dm_brass: { ...floor, paint: paintBrass },
  bd_tethys_close: { w: 1024, h: 512, raw: paintTethysClose, emissiveIsMap: true },
};
