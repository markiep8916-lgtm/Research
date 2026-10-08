// World textures that art/tiles.js does not cover, registered by name in the texture registry
// (TECH_PLAN 3.12) so maps, prop builders and content can use them like any tile:
//   POC props      metal_side, med_front, med_cross, chair, seat
//   WARDEN         warden_sigil (64x64, 4 frames): the gold iris on the Spire screens, the Choir pods
//                  and Warden's core; world.setScreens('warden_sigil') swaps every screen to it
//   emotes         emotes (20x20, one frame per kind in EMOTE_ORDER), drawn by world/emotes.js
//   water          water (animated surface), water_bank (bank face), water_bed (channel bed),
//                  water_path (drained walkway)
//   puzzle props   switch_panel (2 frames off/on), valve_wheel, lever_base (2 frames), laser_post
//                  (2 frames closed/open), laser_beam (4 frames), shutter, hard_light (4 frames),
//                  guide_strip (4 frames), shard_crystal
//   screens        screen_status (4 frames), starchart_map (4 frames), pod_status (2 frames:
//                  REVIVAL DEFERRED / REVIVAL AUTHORIZED)
// Painting is lazy (first use); everything is 32 texture pixels per world unit.
//
// export worldTexture(name) -> { map, normalMap, emissiveMap|null, w, h }   (POC helper, kept)
// export worldMaterial(name, opts) -> MeshStandardMaterial                   (POC helper, kept)
// export EMOTE_ORDER                                                          emote kind -> frame order

import * as THREE from 'three';
import { Painter, makeNormalMap, shade, mix, bayer } from '../art/painter.js';
import { RAMPS, OUTLINE, GLOW } from '../art/palette.js';
import { registerTexture, textureSet, raised, recess, rivet, bolt, hazard, grime, fbm, clamp01, drawText, textWidth } from '../art/tiles.js';

const S = RAMPS.steel, G = RAMPS.gunmetal, T = RAMPS.teal, W = RAMPS.white, N = RAMPS.navy;
const GD = RAMPS.gold, CY = RAMPS.cyan, CR = RAMPS.crimson, GN = RAMPS.green, AM = RAMPS.amber;

// ---------------------------------------------------------------- POC prop textures (Painter based)

function pRivet(p, x, y) {
  p.px(x, y, S[5]);
  p.px(x + 1, y + 1, G[0]);
}

function paintMetalSide() {
  const p = new Painter(32, 32);
  p.rect(0, 0, 32, 32, G[3]);
  p.noise(0, 0, 32, 32, [G[2], G[4], S[3]], 0.08, 21);
  p.hline(0, 31, 0, G[1]);
  p.vline(0, 0, 31, G[1]);
  p.hline(1, 31, 1, G[4]);
  p.vline(1, 1, 31, G[4]);
  p.rect(4, 13, 24, 6, G[2]);
  p.hline(4, 27, 13, G[1]);
  p.hline(4, 27, 19, G[4]);
  for (let x = 6; x < 26; x += 3) p.vline(x, 14, 18, G[1]);
  for (const [x, y] of [[4, 4], [26, 4], [4, 26], [26, 26]]) pRivet(p, x, y);
  return { map: p };
}

function paintMedFront() {
  const p = new Painter(32, 48);
  const e = new Painter(32, 48);
  e.rect(0, 0, 32, 48, '#000000');
  const glow = (x, y, c) => { p.px(x, y, c); e.px(x, y, c); };
  // cabinet body: white enamel with teal trim
  p.rect(0, 0, 32, 48, W[2]);
  p.rect(1, 1, 30, 46, W[3]);
  p.noise(1, 1, 30, 46, [W[2], W[4]], 0.06, 5);
  p.rect(0, 0, 32, 3, T[2]);
  p.hline(0, 31, 3, T[1]);
  p.rect(0, 40, 32, 8, G[2]);
  p.hline(0, 31, 40, G[4]);
  for (let x = 3; x < 30; x += 4) p.rect(x, 43, 2, 3, G[1]);
  // screen with a cross and a heartbeat trace
  p.rect(5, 6, 22, 16, G[0]);
  p.rectOutline(4, 5, 24, 18, S[4]);
  for (let y = 7; y < 21; y++) for (let x = 6; x < 26; x++) if ((x + y) % 4 === 0) glow(x, y, '#0d3b2a');
  for (const [x, y, w, h] of [[14, 8, 4, 11], [10, 12, 12, 3]]) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) glow(i, j, GLOW.green);
  }
  for (let i = 15; i < 17; i++) for (let j = 9; j < 18; j++) glow(i, j, '#d6ffe6');
  const beat = [20, 20, 20, 19, 17, 21, 22, 20, 20, 20, 20, 18, 20, 20];
  beat.forEach((y, i) => glow(6 + i + (i > 6 ? 6 : 0), y, '#7dffb4'));
  // palm scanner
  p.rect(9, 26, 14, 10, G[1]);
  p.rectOutline(8, 25, 16, 12, S[3]);
  for (let y = 27; y < 35; y += 2) for (let x = 10; x < 22; x++) glow(x, y, y === 31 ? '#c8f3ff' : T[3]);
  // status LEDs
  glow(26, 27, GLOW.green); glow(26, 30, GLOW.green); glow(26, 33, GLOW.amber);
  pRivet(p, 2, 6); pRivet(p, 28, 6); pRivet(p, 2, 36); pRivet(p, 28, 36);
  return { map: p, emissive: e };
}

function paintMedCross() {
  const p = new Painter(16, 16);
  for (const [x, y, w, h] of [[6, 2, 4, 12], [2, 6, 12, 4]]) p.rect(x, y, w, h, '#6dffa8');
  p.rect(7, 3, 2, 10, '#e4fff0');
  p.rect(3, 7, 10, 2, '#e4fff0');
  return { map: p, emissive: p };
}

function paintChair() {
  const p = new Painter(32, 44);
  const U = ['#141b2a', '#1d2840', '#28385a', '#384c76', '#4c6491'];
  // pedestal
  p.rect(12, 36, 8, 6, G[2]);
  p.rect(9, 41, 14, 3, G[1]);
  p.hline(9, 22, 41, G[3]);
  // armrests with console lights
  p.rect(2, 22, 6, 12, G[3]);
  p.rect(24, 22, 6, 12, G[3]);
  p.rect(2, 21, 6, 3, S[4]);
  p.rect(24, 21, 6, 3, S[4]);
  p.px(4, 22, GLOW.amber); p.px(5, 22, GLOW.cyan); p.px(26, 22, GLOW.cyan); p.px(27, 22, GLOW.amber);
  // backrest: tall upholstered shell with stitched panels
  p.ellipse(16, 8, 10, 6, U[2]);
  p.rect(6, 8, 20, 28, U[2]);
  p.rect(8, 10, 16, 24, U[3]);
  for (let y = 12; y < 34; y += 5) p.hline(8, 23, y, U[1]);
  p.vline(16, 10, 33, U[1]);
  p.ellipse(16, 7, 7, 4, U[3]);
  p.ellipse(16, 6, 5, 2, U[4]);
  // metal spine and a command crest that glows
  p.rect(14, 2, 4, 3, S[4]);
  p.px(15, 3, GLOW.cyan); p.px(16, 3, GLOW.cyan);
  p.rect(6, 34, 20, 2, N[1]);
  p.rimShade({ skip: (c) => c[0] > 200 || c[2] > 230 });
  p.outline(OUTLINE);
  const e = new Painter(32, 44);
  e.rect(0, 0, 32, 44, '#000000');
  for (const [x, y, c] of [[4, 22, GLOW.amber], [5, 22, GLOW.cyan], [26, 22, GLOW.cyan], [27, 22, GLOW.amber], [15, 3, GLOW.cyan], [16, 3, GLOW.cyan]]) e.px(x, y, c);
  return { map: p, emissive: e };
}

function paintSeat() {
  // padded lounge cushion (32x16): navy upholstery, button tufts, piping on the edges
  const p = new Painter(32, 16);
  const U = ['#1d2840', '#2c3d63', '#3d5684', '#5170a6', '#7092c8'];
  p.rect(0, 0, 32, 16, U[2]);
  p.noise(0, 0, 32, 16, [U[1], U[3]], 0.1, 9);
  p.hline(0, 31, 0, U[4]);
  p.hline(0, 31, 15, U[0]);
  for (const x of [0, 15, 16, 31]) p.vline(x, 1, 14, x === 15 ? U[0] : x === 16 ? U[4] : U[1]);
  for (let x = 4; x < 32; x += 8) for (const y of [5, 10]) { p.px(x, y, U[0]); p.px(x + 1, y + 1, U[4]); }
  return { map: p };
}

// the POC props keep their bevel settings (normal maps from the painted albedo)
const pocNormal = (img) => ({ ...img, normal: makeNormalMap(img.map, { bevel: 2, strength: 1.6, lumaRelief: 0.4 }) });
registerTexture('metal_side', { w: 32, h: 32, wrapX: true, wrapY: true, image: () => pocNormal(paintMetalSide()) });
registerTexture('med_front', { w: 32, h: 48, image: () => pocNormal(paintMedFront()) });
registerTexture('med_cross', { w: 16, h: 16, alpha: true, image: () => pocNormal(paintMedCross()) });
registerTexture('chair', { w: 32, h: 44, alpha: true, image: () => pocNormal(paintChair()) });
registerTexture('seat', { w: 32, h: 16, wrapX: true, wrapY: true, image: () => pocNormal(paintSeat()) });

// ---------------------------------------------------------------- WARDEN's sigil

// The gold iris: twelve petal rays around an almond eye with ringed iris, on a dark violet screen.
// The four frames breathe (rays brighten in turn), slowly, like a lullaby.
function paintWardenSigil(t, f) {
  const cx = 32, cy = 32;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const scan = y % 2 ? '#07040e' : '#0a0614';
    t.px(x, y, scan, 0.45);
    t.emit(x, y, y % 2 ? '#04020a' : '#080412');
  }
  const gold = [GD[1], GD[2], GD[3], GD[4], GD[5], '#fffbe8'];
  const lit = (x, y, k) => { if (x >= 0 && y >= 0 && x < 64 && y < 64) t.glow(x, y, gold[Math.max(0, Math.min(5, k))]); };
  // soft halo: dithered gold haze behind everything
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    const h = clamp01(1 - d / 30) * 0.5;
    if (h > 0 && bayer(x, y, h)) t.glow(x, y, d < 18 ? '#2a1a06' : '#1a1004');
  }
  // twelve rays: tapered petals; brightness rotates with the frame
  for (let r = 0; r < 12; r++) {
    const a = (r / 12) * Math.PI * 2 - Math.PI / 2;
    const on = (r + f * 3) % 12 < 3 ? 1 : 0;
    for (let s = 16; s < 29; s++) {
      const w = (29 - s) / 13;
      const px = cx + Math.cos(a) * s, py = cy + Math.sin(a) * s;
      const k = (s < 22 ? 3 : 2) + on - (s > 26 ? 1 : 0);
      lit(Math.floor(px), Math.floor(py), k);
      if (w > 0.45) {
        const nx = -Math.sin(a), ny = Math.cos(a);
        lit(Math.floor(px + nx), Math.floor(py + ny), k - 1);
        lit(Math.floor(px - nx), Math.floor(py - ny), k - 1);
      }
    }
  }
  // two concentric rings (the cradle)
  for (const [rr, k] of [[14.5, 4], [11.5, 2]]) {
    for (let s = 0; s < 160; s++) {
      const a = (s / 160) * Math.PI * 2;
      lit(Math.floor(cx + Math.cos(a) * rr), Math.floor(cy + Math.sin(a) * rr), k + (s % 20 === f * 5 ? 1 : 0));
    }
  }
  // the almond eye
  for (let y = 22; y < 43; y++) for (let x = 18; x < 47; x++) {
    const u = (x + 0.5 - cx) / 13.5, v = (y + 0.5 - cy) / 8.6;
    const lid = 1 - u * u;
    if (lid <= 0) continue;
    const inside = Math.abs(v) < lid * 1.02;
    const edge = inside && Math.abs(v) > lid * 1.02 - 0.22;
    if (edge) lit(x, y, 5);
    else if (inside) t.glow(x, y, '#120a02');
  }
  // iris: ringed gold with a bright pupil, breathing a little with the frame
  const ir = 6.6 + (f === 1 || f === 2 ? 0.4 : 0);
  for (let y = 24; y < 41; y++) for (let x = 24; x < 41; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d > ir) continue;
    const k = d < 1.8 ? 5 : d < 3 ? 1 : d < 4.2 ? 4 : d < 5.4 ? 3 : 2;
    lit(x, y, k);
  }
  t.glow(30, 29, '#fffbe8').glow(31, 29, '#fff0a8');
}
registerTexture('warden_sigil', { w: 64, h: 64, frames: 4, fps: 2, paint: paintWardenSigil, strength: 0.6 });

// ---------------------------------------------------------------- emote bubbles

/** Frame order of the emotes texture (world/emotes.js). */
export const EMOTE_ORDER = ['!', '?', '...', 'note', 'heart', 'anger', 'sweat', 'idea', 'zzz'];

const EMOTE_ICONS = {
  '!': { c: CR[3], rows: ['..##..', '..##..', '..##..', '..##..', '..##..', '......', '..##..'] },
  '?': { c: CY[2], rows: ['.####.', '##..##', '....##', '...##.', '..##..', '......', '..##..'] },
  '...': { c: G[3], rows: ['......', '......', '......', '......', '......', '......', '#.#.#.'] },
  note: { c: N[3], rows: ['...###', '...#.#', '...#.#', '...#.#', '.###.#', '####.#', '.##...'] },
  heart: { c: CR[3], rows: ['......', '.##.##', '######', '######', '.####.', '..##..', '......'] },
  anger: { c: CR[3], rows: ['.#..#.', '##..##', '......', '......', '##..##', '.#..#.', '......'] },
  sweat: { c: CY[3], rows: ['...#..', '..##..', '.####.', '.####.', '######', '.####.', '..##..'] },
  idea: { c: AM[3], rows: ['.####.', '######', '######', '.####.', '..##..', '..##..', '......'] },
  zzz: { c: N[3], rows: ['####..', '..#...', '.#....', '####..', '...###', '....#.', '...###'] },
};

function paintEmote(t, f) {
  const kind = EMOTE_ORDER[f];
  const ic = EMOTE_ICONS[kind];
  // round speech bubble with a tail at the bottom left, lit from the upper left
  const inBubble = (x, y) => {
    const dx = (x + 0.5 - 10) / 9, dy = (y + 0.5 - 8.5) / 7.6;
    if (dx * dx + dy * dy <= 1) return true;
    return y >= 14 && y <= 18 && x >= 5 && x <= 8 && x - 5 <= 18 - y;   // tail
  };
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
    if (!inBubble(x, y)) continue;
    const edgeL = !inBubble(x - 1, y) || !inBubble(x, y - 1);
    const edgeD = !inBubble(x + 1, y) || !inBubble(x, y + 1);
    t.px(x, y, edgeD ? '#c9d3e6' : edgeL ? '#ffffff' : '#f2f6fc', 0.6);
  }
  // outline
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
    if (inBubble(x, y)) continue;
    if (inBubble(x - 1, y) || inBubble(x + 1, y) || inBubble(x, y - 1) || inBubble(x, y + 1)) t.px(x, y, OUTLINE, 0.5);
  }
  // icon centred in the bubble with a darker shadow row
  const ox = 7, oy = 5;
  ic.rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '#') return;
    t.px(ox + i, oy + j, j < 2 ? shade(ic.c, 0.12) : ic.c, 0.75);
  }));
  if (kind === 'idea') { t.px(9, 7, '#fff3cf'); t.px(8, 6, '#fff3cf'); }
  if (kind === 'heart') { t.px(8, 7, '#ffd6dc'); t.px(9, 7, '#ffd6dc'); }
  if (kind === 'sweat') { t.px(9, 8, '#e6fbff'); t.px(9, 9, '#e6fbff'); }
}
registerTexture('emotes', { w: 20, h: 20, frames: EMOTE_ORDER.length, fps: 0, alpha: true, paint: paintEmote, strength: 1.2 });

// ---------------------------------------------------------------- water

const WATER = ['#04141c', '#072433', '#0b3646', '#10505f', '#1a7280', '#3fa6b0', '#8fe0e6', '#e0fbff'];

// Dark teal water: soft ripple bands drifting across, with short light glints on the crests
// (emissive, so they catch the bloom). Four frames loop; the pattern tiles every 32 px.
function paintWater(t, f) {
  const ph = (f / 4) * Math.PI * 2;
  const TAU = Math.PI * 2;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = fbm(x / 8, y / 8 + f * 0.5, 41, 2, 4, 4);
    const band = Math.sin((y + Math.sin(x / 32 * TAU * 2 + ph) * 1.6) / 32 * TAU * 4 - ph);
    const v = 0.5 + band * 0.22 + (n - 0.5) * 0.5;
    const q = clamp01(v) * 3;
    let k = 2 + Math.floor(q);
    if (bayer(x, y, (q % 1) * 0.5)) k++;
    t.px(x, y, WATER[Math.min(4, k)], 0.45 + band * 0.04);
    // crest glints: short horizontal dashes on the brightest band rows
    if (band > 0.93 && ((x + f * 3 + (y >> 2) * 5) % 9) < 3) t.glow(x, y, WATER[5], '#1a5f6a');
  }
}
registerTexture('water', { w: 32, h: 32, frames: 4, fps: 3, wrapX: true, wrapY: true, paint: paintWater, strength: 1.2 });

// The bank: a steel channel lip with wet, mossy streaks down to the waterline (32x24, tiles in x).
function paintWaterBank(t) {
  t.rect(0, 0, 32, 24, G[3], 0.6);
  raised(t, 0, 0, 32, 4, S[4], S[5], S[2], 0.8);
  for (let x = 0; x < 32; x += 8) rivet(t, x + 3, 1, S, 6);
  for (let y = 4; y < 24; y++) for (let x = 0; x < 32; x++) {
    const wet = clamp01((y - 8) / 14) + (fbm(x / 6, y / 10, 7, 2, 32 / 6) - 0.5) * 0.4;
    if (wet > 0.35 && bayer(x, y, wet)) t.px(x, y, mix(G[2], '#0b3a3a', 0.5), 0.5);
    const moss = fbm(x / 4, y / 3, 13, 2, 8) - (y < 10 ? 0.2 : 0);
    if (moss > 0.62 && y > 6) t.px(x, y, moss > 0.7 ? '#2f6a3a' : '#1f4a2e', 0.62);
  }
  for (let x = 0; x < 32; x++) {
    t.px(x, 22, '#0b3646', 0.4).px(x, 23, '#072433', 0.38);
    if (x % 5 === 2) t.glow(x, 21, '#3fa6b0', '#123f46');
  }
  grime(t, 0, 4, 32, 6, (x, y) => (10 - y) / 6, -0.05);
}
registerTexture('water_bank', { w: 32, h: 24, wrapX: true, paint: paintWaterBank });

// The channel bed: dark silt with pebbles and a few drowned bolts (seen while it drains).
function paintWaterBed(t) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = fbm(x / 8, y / 8, 91, 2, 4, 4);
    t.px(x, y, n > 0.55 ? '#14282a' : n > 0.4 ? '#0f2022' : '#0b1819', 0.25 + n * 0.2);
    const p = fbm(x / 4, y / 4, 93, 1, 8, 8);
    if (p > 0.72) t.px(x, y, p > 0.8 ? '#3a4a48' : '#26332f', 0.4 + (p - 0.72));
  }
  for (const [x, y] of [[6, 9], [21, 4], [25, 22], [11, 26]]) rivet(t, x, y, S, 3);
}
registerTexture('water_bed', { w: 32, h: 32, wrapX: true, wrapY: true, paint: paintWaterBed, strength: 1.6 });

// The drained walkway: a wet grate with puddles that still catch the light.
function paintWaterPath(t) {
  t.rect(0, 0, 32, 32, G[2], 0.5);
  raised(t, 0, 0, 32, 32, G[3], G[4], G[1], 0.55);
  for (let y = 4; y < 29; y += 4) for (let x = 3; x < 29; x++) {
    t.px(x, y, G[0], 0.25).px(x, y + 1, G[1], 0.3);
    t.px(x, y + 2, G[3], 0.55);
  }
  for (let x = 3; x < 29; x += 6) t.vline(x, 3, 28, G[4], 0.6);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const p = fbm(x / 7, y / 7, 77, 2, 32 / 7, 32 / 7);
    if (p > 0.6) t.px(x, y, p > 0.68 ? '#2a5b66' : '#1b3d48', 0.5);
    if (p > 0.7 && (x + y) % 7 === 0) t.glow(x, y, '#8fe0e6', '#1d6a74');
  }
  for (const [x, y] of [[1, 1], [29, 1], [1, 29], [29, 29]]) bolt(t, x, y, S, 6);
}
registerTexture('water_path', { w: 32, h: 32, wrapX: true, wrapY: true, paint: paintWaterPath });

// ---------------------------------------------------------------- switches

// A pedestal terminal (32x48): screen with a lock glyph (red, frame 0) or a check (green, frame 1),
// a toggle lever on the right and a hazard kick plate.
function paintSwitchPanel(t, f) {
  const on = f === 1;
  t.rect(4, 0, 24, 48, G[3], 0.6);
  raised(t, 4, 0, 24, 48, G[3], G[4], G[1], 0.62);
  // angled screen
  raised(t, 6, 3, 20, 15, G[1], G[2], G[0], 0.65);
  const bg = on ? ['#03180c', '#052412'] : ['#1c0408', '#2a060c'];
  const ink = on ? GLOW.green : GLOW.red;
  for (let y = 4; y < 17; y++) for (let x = 7; x < 25; x++) t.glow(x, y, bg[y % 2]).ht(x, y, 0.5);
  const glyph = on
    ? ['.......#', '......##', '.....##.', '#...##..', '##.##...', '.###....', '..#.....']
    : ['..####..', '.#....#.', '.#....#.', '########', '###..###', '###..###', '########'];
  glyph.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') t.glow(12 + i, 7 + j, ink); }));
  for (let x = 8; x < 24; x += 2) t.glow(x, 15, on ? GN[2] : CR[2]);
  // toggle lever slot and handle
  recess(t, 21, 22, 4, 14, G[0], '#05070c', G[3], 0.3);
  const hy = on ? 22 : 31;
  raised(t, 20, hy, 6, 4, S[5], S[6], S[3], 0.85);
  t.px(22, hy + 1, on ? GN[4] : CR[4], 0.9).px(23, hy + 1, on ? GN[4] : CR[4], 0.9);
  // label plate and status LEDs
  raised(t, 7, 22, 11, 6, G[2], G[3], G[1], 0.58);
  for (let x = 8; x < 17; x += 2) t.px(x, 24, S[5], 0.6);
  t.glow(8, 31, on ? GN[4] : G[1], on ? GLOW.green : '#000000');
  t.glow(11, 31, on ? G[1] : CR[4], on ? '#000000' : GLOW.red);
  t.glow(14, 31, AM[4], GLOW.amber);
  hazard(t, 4, 41, 24, 4, { period: 6, ht: 0.6 });
  t.rect(4, 45, 24, 3, G[1], 0.4);
  for (const [x, y] of [[5, 1], [25, 1], [5, 38], [25, 38]]) rivet(t, x, y, S, 6);
  grime(t, 5, 34, 22, 7, (x, y) => (y - 34) / 9, -0.05);
}
registerTexture('switch_panel', { w: 32, h: 48, frames: 2, fps: 0, alpha: true, paint: paintSwitchPanel });

// The valve wheel (32x32, alpha): a red hand wheel with four spokes; the prop spins the mesh.
function paintValveWheel(t) {
  const c = 15.5;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const dx = x - c, dy = y - c, d = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx);
    const rim = d > 11.5 && d < 15;
    const spoke = d <= 11.5 && d > 3.5 && [0, 1, 2, 3].some((k) => Math.abs(Math.sin(a - k * Math.PI / 2 - Math.PI / 4)) * d < 1.4);
    const hub = d <= 4;
    if (!(rim || spoke || hub)) continue;
    const l = -(dx + dy) / (d || 1);
    const ramp = hub ? S : CR;
    const k = hub ? (d < 2 ? 6 : 4) : rim ? (l > 0.5 ? 4 : l > -0.3 ? 3 : 2) : 3;
    t.px(x, y, ramp[k], rim ? 0.75 - Math.abs(d - 13.2) * 0.12 : 0.65);
  }
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    t.px(Math.round(c + Math.cos(a) * 13.2), Math.round(c + Math.sin(a) * 13.2), CR[5], 0.8);
  }
}
registerTexture('valve_wheel', { w: 32, h: 32, alpha: true, paint: paintValveWheel });

// Floor plate for a pull lever (32x16): a slot and a status LED (red off, green on).
function paintLeverBase(t, f) {
  const on = f === 1;
  t.rect(0, 0, 32, 16, G[2], 0.55);
  raised(t, 0, 0, 32, 16, G[3], G[4], G[1], 0.6);
  recess(t, 6, 6, 20, 4, '#05070c', '#020306', G[3], 0.25);
  hazard(t, 2, 12, 28, 2, { period: 4, ht: 0.6 });
  t.glow(28, 3, on ? GN[4] : CR[4], on ? GLOW.green : GLOW.red);
  for (const [x, y] of [[2, 2], [2, 9]]) rivet(t, x, y, S, 6);
}
registerTexture('lever_base', { w: 32, h: 16, frames: 2, fps: 0, paint: paintLeverBase });

// ---------------------------------------------------------------- gates

// Laser gate post (16x48): an emitter column with a stack of lenses, red while closed (frame 0),
// green once open (frame 1).
function paintLaserPost(t, f) {
  const open = f === 1;
  t.rect(2, 0, 12, 48, G[3], 0.6);
  raised(t, 2, 0, 12, 48, G[3], G[4], G[1], 0.62);
  raised(t, 1, 0, 14, 4, S[4], S[5], S[2], 0.8);
  raised(t, 1, 44, 14, 4, G[2], G[3], G[0], 0.6);
  hazard(t, 3, 40, 10, 3, { period: 4, ht: 0.6 });
  for (const y of [8, 17, 26, 35]) {
    recess(t, 5, y, 6, 4, '#05070c', '#020306', G[4], 0.3);
    const c = open ? GN[4] : CR[4], e = open ? GLOW.green : GLOW.red;
    t.glow(7, y + 1, open ? GN[5] : '#ffd6dc', e).glow(8, y + 1, c, e).glow(7, y + 2, c, e).glow(8, y + 2, c, e);
  }
  for (let y = 5; y < 40; y += 9) rivet(t, 3, y, S, 6);
}
registerTexture('laser_post', { w: 16, h: 48, frames: 2, fps: 0, alpha: true, paint: paintLaserPost });

// One laser beam segment (32x8, 4 flicker frames): a hot white core in a red glow.
function paintLaserBeam(t, f) {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 32; x++) {
    const d = Math.abs(y - 3.5);
    const wob = Math.sin((x + f * 5) * 0.8) * 0.3 + (((x * 7 + f * 13) % 11) === 0 ? 0.6 : 0);
    const v = 1 - d / (3.6 + wob);
    if (v <= 0) continue;
    const c = v > 0.8 ? '#ffb0b8' : v > 0.55 ? '#ff4a5c' : v > 0.3 ? '#c41f38' : '#4a0e1a';
    t.glow(x, y, c);
  }
}
registerTexture('laser_beam', { w: 32, h: 8, frames: 4, fps: 12, wrapX: true, alpha: true, paint: paintLaserBeam, strength: 0.2 });

// A heavy security shutter (32x96): ribbed slats, amber guide lamps on the frame, hazard foot.
function paintShutter(t) {
  t.rect(0, 0, 32, 96, S[3], 0.6);
  for (let y = 2; y < 86; y += 6) {
    raised(t, 1, y, 30, 6, S[4], S[5], S[2], 0.62);
    t.hline(2, 29, y + 3, S[3], 0.55);
  }
  raised(t, 0, 0, 32, 3, S[4], S[5], S[2], 0.8);
  hazard(t, 0, 86, 32, 6, { period: 8, ht: 0.62 });
  raised(t, 0, 92, 32, 4, G[2], G[3], G[0], 0.6);
  raised(t, 11, 40, 10, 10, G[2], G[3], G[0], 0.66);
  t.glow(15, 44, AM[4], GLOW.amber).glow(16, 44, AM[4], GLOW.amber).glow(15, 45, AM[3], GLOW.amber).glow(16, 45, AM[3], GLOW.amber);
  for (const y of [10, 30, 60, 78]) { t.glow(1, y, AM[4], GLOW.amber); t.glow(30, y, AM[4], GLOW.amber); }
  grime(t, 0, 60, 32, 26, (x, y) => (y - 60) / 30 + (fbm(x / 5, y / 5, 3, 2) - 0.5) * 0.4, -0.05);
}
registerTexture('shutter', { w: 32, h: 96, paint: paintShutter });

// Hard-light bridge floor (32x32, 4 shimmer frames): a hexagonal cyan lattice, transparent between.
function paintHardLight(t, f) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    // hex lattice: distance to the nearest hex edge
    const qx = x / 8, qy = y / 8 * 1.1547;
    const fx = qx - Math.floor(qx) - 0.5, fy = qy - Math.floor(qy) - 0.5;
    const edge = Math.max(Math.abs(fx) * 0.866 + Math.abs(fy) * 0.5, Math.abs(fy)) > 0.44;
    const sweep = Math.sin((x + y) / 32 * Math.PI * 2 - f * Math.PI / 2) > 0.85;
    const seam = x === 0 || y === 0;
    if (edge || seam) t.glow(x, y, sweep ? '#e8fdff' : seam ? '#6fd6ff' : '#3fb8f0');
    else if (bayer(x, y, 0.3)) t.glow(x, y, sweep ? '#4cc8ee' : '#1a5f8a');
  }
}
registerTexture('hard_light', { w: 32, h: 32, frames: 4, fps: 6, wrapX: true, wrapY: true, alpha: true, paint: paintHardLight, strength: 0.4 });

// Floor guide strip (32x8, 4 frames): chevrons flowing along +x (the prop points it at its target).
function paintGuideStrip(t, f) {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 32; x++) {
    const k = (x - f * 2 + 64) % 8;
    const cy = Math.abs(y - 3.5);
    const chevron = Math.abs(k - (4 - cy)) < 1.1 && cy < 3.2;
    if (chevron) t.glow(x, y, '#ffffff');
    else if (y === 0 || y === 7) t.glow(x, y, '#5a6378');
  }
}
registerTexture('guide_strip', { w: 32, h: 8, frames: 4, fps: 8, wrapX: true, alpha: true, paint: paintGuideStrip, strength: 0.3 });

// Memory crystal (16x32, alpha): a faceted shard, cyan to violet, every pixel glowing.
function paintShardCrystal(t) {
  const pts = [[8, 1], [13, 9], [12, 24], [8, 31], [3, 24], [2, 10]];
  const inside = (x, y) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const ramp = ['#2a1b4f', '#422c7d', '#6343b0', '#4cc8ee', '#9ff3ff', '#e8fdff'];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
    if (!inside(x + 0.5, y + 0.5)) continue;
    // three facets: lit left, bright middle ridge, violet right
    const ridge = Math.abs(x + 0.5 - (8 - (y - 16) * 0.05)) < 1.1;
    const left = x + 0.5 < 8;
    let k = ridge ? 5 : left ? (y < 16 ? 4 : 3) : y < 12 ? 3 : 2;
    if (!ridge && ((x * 3 + y * 5) % 13 === 0)) k = Math.min(5, k + 1);
    if (y > 25) k = Math.max(1, k - 1);
    t.glow(x, y, ramp[k]);
  }
  for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
    if (inside(x + 0.5, y + 0.5)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx + 0.5, y + dy + 0.5))) t.px(x, y, '#1a0f33');
  }
}
registerTexture('shard_crystal', { w: 16, h: 32, alpha: true, paint: paintShardCrystal, strength: 0.6 });

// ---------------------------------------------------------------- screens

// Generic data screen (64x32, 4 frames): bar graph, a scrolling trace and text rows, cyan.
function paintScreenStatus(t, f) {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 64; x++) t.glow(x, y, y % 2 ? '#03121a' : '#041822', '#020a10').ht(x, y, 0.5);
  for (let x = 0; x < 64; x++) { t.glow(x, 0, CY[1]); t.glow(x, 31, CY[1]); }
  for (let y = 0; y < 32; y++) { t.glow(0, y, CY[1]); t.glow(63, y, CY[1]); }
  for (let i = 0; i < 7; i++) {
    const h = 3 + ((i * 5 + f * 3) % 9);
    for (let y = 0; y < h; y++) t.glow(4 + i * 4, 27 - y, y === h - 1 ? '#c8f3ff' : CY[3]);
    t.glow(5 + i * 4, 27, CY[3]);
  }
  for (let x = 34; x < 60; x++) {
    const v = Math.round(14 + Math.sin((x + f * 4) * 0.45) * 4 + Math.sin((x + f * 2) * 1.3) * 1.5);
    t.glow(x, v, '#7ff4ff');
  }
  for (let r = 0; r < 3; r++) for (let k = 0; k < 10 + r * 3; k++) if ((k + r + f) % 5) t.glow(34 + k * 2, 22 + r * 3, T[4]);
  t.glow(4, 4, f % 2 ? GLOW.amber : AM[2]).glow(7, 4, GLOW.green);
  drawText('SYS', 12, 3, (x, y) => t.glow(x, y, CY[4]));
}
registerTexture('screen_status', { w: 64, h: 32, frames: 4, fps: 3, paint: paintScreenStatus, strength: 0.6 });

// Starchart hologram (64x64, 4 frames): ringed Tethys, the Halcyon's orbit and destination nodes
// joined by dotted routes. Drawn bright on black for the hologram material.
function paintStarchartMap(t, f) {
  const cx = 32, cy = 32;
  const plot = (x, y, c) => { if (x >= 0 && y >= 0 && x < 64 && y < 64) t.glow(Math.floor(x), Math.floor(y), c); };
  // the planet: banded disc (everything else stays transparent for the hologram)
  for (let y = 22; y < 43; y++) for (let x = 22; x < 43; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d > 9.5) continue;
    const band = Math.floor((y + 0.5 - cy + 10) / 3) % 2;
    plot(x, y, d > 8.5 ? '#c8f3ff' : band ? '#4cc8ee' : '#1f7fb0');
  }
  // tilted ring
  for (let s = 0; s < 180; s++) {
    const a = (s / 180) * Math.PI * 2;
    const x = cx + Math.cos(a) * 17, y = cy + Math.sin(a) * 4.5;
    if (Math.sin(a) < 0 && Math.hypot(x - cx, y - cy) < 9.6) continue;
    plot(x, y, s % 3 ? '#6fd6ff' : '#e8fdff');
  }
  // orbit with the ship as a moving bright dot
  for (let s = 0; s < 120; s++) {
    const a = (s / 120) * Math.PI * 2;
    if (s % 4 < 2) plot(cx + Math.cos(a) * 24, cy + Math.sin(a) * 20, '#1f7fb0');
  }
  const sa = f * Math.PI / 2 + 0.4;
  plot(cx + Math.cos(sa) * 24, cy + Math.sin(sa) * 20, '#ffffff');
  plot(cx + Math.cos(sa) * 24 + 1, cy + Math.sin(sa) * 20, '#ffffff');
  // destination nodes and dotted routes
  const nodes = [[10, 12], [54, 10], [52, 52], [12, 50], [32, 6]];
  nodes.forEach(([x, y], i) => {
    const pulse = (i + f) % 4 === 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) plot(x + dx, y + dy, pulse ? '#ffffff' : '#9ff3ff');
    if (pulse) for (const [dx, dy] of [[-1, 0], [2, 0], [0, -1], [1, 2]]) plot(x + dx, y + dy, '#4cc8ee');
    const steps = 18;
    for (let k = 2; k < steps - 2; k++) if (k % 2) plot(x + (cx - x) * k / steps, y + (cy - y) * k / steps, '#1a6a9a');
  });
}
registerTexture('starchart_map', { w: 64, h: 64, frames: 4, fps: 2, paint: paintStarchartMap, strength: 0.3 });

// 3x5 font for the tiny pod read-outs.
const MINI = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  L: ['#..', '#..', '#..', '#..', '###'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'], ' ': ['..', '..', '..', '..', '..'],
};

// Pod status read-out (40x14): REVIVAL DEFERRED in red (frame 0), REVIVAL AUTHORIZED in green (frame 1).
function paintPodStatus(t, f) {
  const ok = f === 1;
  const bg = ok ? ['#03150a', '#041c0e'] : ['#160306', '#1e050a'];
  const ink = ok ? '#7dffb4' : '#ff6b7a', rim = ok ? GN[2] : CR[2];
  for (let y = 0; y < 14; y++) for (let x = 0; x < 40; x++) {
    const border = x === 0 || y === 0 || x === 39 || y === 13;
    t.glow(x, y, border ? rim : bg[y % 2]);
  }
  const line = (str, y) => {
    let x = Math.floor((40 - textWidth(str, MINI)) / 2);
    drawText(str, x, y, (px, py) => t.glow(px, py, ink), MINI);
  };
  line('REVIVAL', 2);
  line(ok ? 'AUTHORIZED' : 'DEFERRED', 8);
}
registerTexture('pod_status', { w: 40, h: 14, frames: 2, fps: 0, paint: paintPodStatus, strength: 0.2 });

// ---------------------------------------------------------------- POC helpers (kept for old callers)

/** { map, normalMap, emissiveMap|null, w, h } fresh textures for any registered texture (GPU upload shared). */
export function worldTexture(name) {
  const set = textureSet(name, { repeat: [1, 1] });
  return { map: set.map, normalMap: set.normalMap, emissiveMap: set.emissiveMap, w: set.map.image.width, h: set.map.image.height };
}

/** Lit pixel material for a world texture. */
export function worldMaterial(name, { emissive = 2.0, roughness = 0.7, metalness = 0.2, alphaTest = 0, side = THREE.FrontSide } = {}) {
  const t = worldTexture(name);
  const m = new THREE.MeshStandardMaterial({
    map: t.map, normalMap: t.normalMap, roughness, metalness, alphaTest, side,
    emissiveMap: t.emissiveMap, emissive: t.emissiveMap ? 0xffffff : 0x000000, emissiveIntensity: t.emissiveMap ? emissive : 0,
  });
  m.userData.cast = true;
  m.userData.receive = true;
  return m;
}
