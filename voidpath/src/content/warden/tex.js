// warden: texture painters for the crown arena (browser, TECH_PLAN 3.12), imported by art.js. Pixel art
// at 32 px per world unit in three layers (colour, height, emissive), painted lazily on first use.
//
// Palette (12.1, the Heart): gold choir light over deep navy lacquer, sleeping pods receding below as
// points of warm light. Floors keep their detail under ~10% value contrast (G2 bar rule 16): the gold
// lives in thin emissive seams, never in a stamped blob.
//
//   wd_crown_floor / _b / _c   the crown dais: navy lacquer flagstones, a dark half-seam on every edge
//                              with a faint thread of gold, a few gold flecks (_c: an engraved rose)
//   wd_crown_rim               the dais's sides: lacquer with a gilt lip and a row of small gold lights
//   wd_crown_under             the stepped underside: dark lacquer facets with thin gold veins
//   wd_pod_wall                the Choir far away: pods scattered through the dark, a few awake with light
//   wd_ray                     a light-stream strip (alpha), for the crown's twelve rays

import { rng, bayer } from '../../art/painter.js';
import { fbm, clamp01 } from '../../art/tiles.js';

const NV = ['#06070f', '#0b0e1c', '#11152a', '#171d38', '#1f2747', '#283258', '#33406c', '#46568a'];   // navy lacquer
const GL = ['#2a1b06', '#4a320c', '#755013', '#a2741d', '#c99a2c', '#e8c25a', '#fbe196'];              // gilt
const GD = { lo: '#5a3a0a', mid: '#a8741a', hi: '#ffc85a', hot: '#fff0c0' };                          // emissive gold

const floor = { w: 32, h: 32, wrapX: true, wrapY: true };
const tn = (x, y, seed, scale = 0.25, n = 32, oct = 3) => fbm(x * scale, y * scale, seed, oct, n * scale, n * scale);
const pick = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i))];

/** A lacquer flagstone: low-contrast mottling, a lit lip, a dark seam with a faint thread of gold. */
function flag(t, seed) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, seed, 0.14);
      const m = tn(x, y, seed + 7, 0.4, 32, 2);
      let c = 4;
      if (n > 0.62) c = 5;
      else if (n < 0.36 && bayer(x, y, 0.5)) c = 3;
      if (m > 0.72 && bayer(x, y, 0.3)) c += 1;
      t.px(x, y, pick(NV, c), 0.55 + (n - 0.5) * 0.08);
    }
  }
  // the seam: half on each side (so two stones meet in one even line whatever their turn), dark
  // lacquer with a faint gold thread that glows only here and there
  for (let i = 0; i < 32; i++) {
    for (const [x, y] of [[i, 0], [0, i], [i, 31], [31, i]]) {
      t.px(x, y, NV[2], 0.3);
      if ((i + seed) % 11 < 3) t.emit(x, y, GD.lo);
    }
  }
  t.hline(1, 30, 1, NV[6], 0.62).vline(1, 1, 30, NV[6], 0.62);
  t.hline(1, 30, 30, NV[3], 0.48).vline(30, 1, 30, NV[3], 0.48);
  // a few faint gold flecks in the lacquer
  const r = rng(seed);
  for (let k = 0; k < 3; k++) {
    const x = 4 + Math.floor(r() * 24), y = 4 + Math.floor(r() * 24);
    t.px(x, y, GL[3]).emit(x, y, GD.lo);
  }
}

function paintFloor(t) { flag(t, 11); }

function paintFloorB(t) { flag(t, 23); }

function paintFloorC(t) {
  flag(t, 37);
  // a small rose: eight spokes and a ring, engraved in gilt, a gold point at its heart
  const cx = 16, cy = 16;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    for (let s = 3; s < 8; s++) t.px(Math.round(cx + Math.cos(a) * s), Math.round(cy + Math.sin(a) * s), GL[3], 0.45);
  }
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    t.px(Math.round(cx + Math.cos(a) * 8.5), Math.round(cy + Math.sin(a) * 8.5), GL[3], 0.5);
  }
  t.glow(cx, cy, GL[5], GD.mid);
}

/** The dais's side: lacquer with a gilt lip and a row of small gold lights. */
function paintRim(t) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 51, 0.2);
      if (y < 4) t.px(x, y, GL[y === 0 ? 6 : y === 1 ? 5 : 3], 0.75);
      else t.px(x, y, pick(NV, (n > 0.6 ? 3 : 2) - (y > 26 ? 1 : 0)), 0.45);
    }
  }
  for (let x = 0; x < 32; x++) t.emit(x, 1, GD.mid).emit(x, 2, GD.lo);
  for (const x of [4, 12, 20, 28]) {
    t.glow(x, 9, GL[6], GD.hot).glow(x + 1, 9, GL[5], GD.hi).glow(x, 10, GL[5], GD.hi).glow(x + 1, 10, GL[4], GD.mid);
    for (let y = 12; y < 20; y++) if (y % 2 === 0) t.glow(x, y, GL[2], GD.lo);
  }
  t.hline(0, 31, 22, GL[2], 0.5);
}

/** The stepped underside: dark lacquer facets with thin gold veins dropping into the void. */
function paintUnder(t) {
  const r = rng(61);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const facet = Math.floor(tn(x, y, 607, 0.09, 32, 1) * 4);
      const n = tn(x, y, 601, 0.22);
      t.px(x, y, pick(NV, facet + (n > 0.6 ? 1 : 0)), 0.4 + facet * 0.06);
    }
  }
  for (let k = 0; k < 3; k++) {
    let x = Math.floor(r() * 32), y = 0;
    while (y < 32) {
      t.glow(x, y, GL[2], y % 6 === 0 ? GD.mid : GD.lo);
      y += 1;
      if (r() < 0.3) x = (x + (r() < 0.5 ? 1 : 31)) % 32;
    }
  }
}

/** The Choir far away: pods scattered at random through the dark, most dim, a few awake with light. */
function paintPodWall(t) {
  const N = 128;
  const r = rng(83);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const n = tn(x, y, 801, 0.04, N, 3);
      t.px(x, y, pick(NV, n > 0.62 ? 2 : n > 0.42 ? 1 : 0));
    }
  }
  for (let k = 0; k < 70; k++) {
    const cx = Math.floor(r() * N), cy = Math.floor(r() * N);
    const s = r() < 0.15 ? 2 : 1;            // a few near pods, most far
    const lit = r();
    const hot = lit > 0.9 ? GD.hot : lit > 0.55 ? GD.hi : GD.mid;
    const dim = lit < 0.3;
    for (let dy = -2 * s; dy <= 2 * s; dy++) {
      for (let dx = -s; dx <= s; dx++) {
        const d = (dx * dx) / (s * s + 0.5) + (dy * dy) / (4 * s * s + 0.5);
        if (d > 1) continue;
        const x = (cx + dx + N) % N, y = (cy + dy + N) % N;
        if (dim) t.px(x, y, d < 0.4 ? '#4a3510' : NV[3]);
        else t.glow(x, y, d < 0.35 ? hot : GD.mid, d < 0.35 ? hot : GD.lo);
      }
    }
  }
}

/** A light stream (alpha): a soft vertical band of gold, brightest in the middle, flecked with motes. */
function paintRay(t) {
  const r = rng(91);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 16; x++) {
      const u = Math.abs(x - 7.5) / 8;
      const a = clamp01(1 - u * 1.1) * (0.35 + 0.65 * Math.sin((y / 64) * Math.PI));
      if (a <= 0.04) continue;
      const c = u < 0.25 ? GD.hot : u < 0.55 ? GD.hi : GD.mid;
      const alpha = Math.round(a * 200).toString(16).padStart(2, '0');
      t.px(x, y, c + alpha);
      t.emit(x, y, c);
    }
  }
  for (let k = 0; k < 10; k++) t.glow(2 + Math.floor(r() * 12), Math.floor(r() * 64), GD.hot);
}

export const TEXTURES = {
  wd_crown_floor: { ...floor, paint: paintFloor },
  wd_crown_floor_b: { ...floor, paint: paintFloorB },
  wd_crown_floor_c: { ...floor, paint: paintFloorC },
  wd_crown_rim: { ...floor, paint: paintRim },
  wd_crown_under: { ...floor, paint: paintUnder },
  wd_pod_wall: { w: 128, h: 128, wrapX: true, wrapY: true, paint: paintPodWall },
  wd_ray: { w: 16, h: 64, alpha: true, paint: paintRay },
};
