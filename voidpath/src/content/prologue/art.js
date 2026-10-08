// prologue: textures and particle presets for the Halcyon's new rooms, the Moth and the cold open
// (browser, TECH_PLAN 2.5, 3.12). Painted lazily (first use or prewarm), 32 px per world unit,
// with the shared Halcyon ramps so the new rooms sit beside the POC rooms.
//
//   pro_sign_medbay                   the medbay's neon wall sign in the POC sign style
//   pro_pod_open                      an emptied cryo pod: frosted cradle, cyan rim lights (front face)
//   pro_moth_hull                     Nyx's patched Ringborn skiff (sides and top)
//   pro_hull                          the Halcyon's dorsal hull plating (exterior)
//   pro_hull_windows / _b / pro_hull_rib   the hull's flank: crew-deck windows, ribbed plating
// Everything else on the Halcyon reuses POC textures (visualLint caps a map at 48).
//   particles: pro_tape (fluttering tape scraps when BOLT repairs the Moth)

import { drawText, textWidth, plateBase, seamGrime, rivet, engrave, fbm } from '../../art/tiles.js';
import { RAMPS } from '../../art/palette.js';
import { mix } from '../../art/painter.js';

const S = RAMPS.steel;
const G = RAMPS.gunmetal;
const TE = RAMPS.teal;
const CY = RAMPS.cyan;
const AM = RAMPS.amber;
const CR = RAMPS.crimson;

const CROSS = ['.###.', '.###.', '#####', '#####', '#####', '.###.', '.###.'];

/** A wall sign in the POC style: plate, recessed face, neon text with a halo, accent rule. */
function sign(t, text, color, icon = null) {
  t.rect(0, 0, 64, 16, G[2], 0.65);
  t.hline(0, 63, 0, G[4]).vline(0, 0, 15, G[4]).hline(0, 63, 15, G[0], 0.55).vline(63, 0, 15, G[0], 0.55);
  t.rect(2, 2, 60, 12, '#070a12', 0.42);
  t.hline(2, 61, 2, '#04060c').vline(2, 2, 13, '#04060c').hline(3, 61, 13, G[2]).vline(61, 3, 13, G[2]);
  for (const [x, y] of [[1, 1], [62, 1], [1, 14], [62, 14]]) t.px(x, y, S[5], 0.8);
  const dim = mix(color, '#070a12', 0.72), mid = mix(color, '#070a12', 0.35);
  const lit = new Set();
  const plot = (px, py) => lit.add(py * 64 + px);
  const iw = icon ? icon[0].length + 3 : 0;
  let x = Math.floor((64 - (textWidth(text) + iw)) / 2);
  if (icon) {
    icon.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') plot(x + i, 4 + j); }));
    x += iw;
  }
  drawText(text, x, 4, plot);
  for (const k of lit) {
    const gx = k % 64, gy = Math.floor(k / 64);
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = (gy + oy) * 64 + gx + ox;
      if (!lit.has(n) && gy + oy > 2 && gy + oy < 13) t.glow(gx + ox, gy + oy, dim);
    }
  }
  for (const k of lit) {
    const gx = k % 64, gy = Math.floor(k / 64);
    t.glow(gx, gy, gy === 4 ? mix(color, '#ffffff', 0.45) : color).ht(gx, gy, 0.5);
  }
  for (let xx = 6; xx < 58; xx++) if (xx % 2 === 0) t.glow(xx, 12, mid, dim);
}

/** A tall steel panel (32 x 64): body, lit top/left edge, dark bottom/right edge. */
function tallPanel(t, ramp = S) {
  t.rect(0, 0, 32, 64, ramp[2], 0.6);
  t.hline(0, 31, 0, ramp[4]).vline(0, 0, 63, ramp[4]);
  t.hline(0, 31, 63, ramp[1], 0.5).vline(31, 0, 63, ramp[1], 0.5);
}

/** Front face of an emptied cryo pod (32 x 64): frosted cradle, open seal, cyan rim. */
function paintPodOpen(t) {
  tallPanel(t);
  // the cradle recess
  t.rect(5, 6, 22, 50, '#0a1220', 0.3);
  for (let y = 7; y < 55; y++) {
    for (let x = 6; x < 26; x++) {
      const n = fbm(x / 6, y / 7, 3, 3);
      if (n > 0.58) t.px(x, y, n > 0.7 ? '#c2d4e4' : '#536a83', 0.34);
    }
  }
  // the body-shaped hollow where the sleeper lay
  for (let y = 12; y < 52; y++) {
    const half = y < 20 ? 4 : y < 30 ? 6 : 5;
    t.hline(16 - half, 15 + half, y, y < 20 ? '#13203a' : '#101a2e', 0.26);
  }
  // cyan rim lights down both sides, an amber status strip at the foot
  for (let y = 8; y < 54; y += 2) { t.glow(5, y, CY[4], CY[3]); t.glow(26, y, CY[4], CY[3]); }
  for (let x = 9; x < 23; x++) t.glow(x, 57, x % 3 ? AM[4] : AM[3]);
  for (const [x, y] of [[2, 3], [29, 3], [2, 60], [29, 60]]) rivet(t, x, y);
  engrave(t, 4, 5, 27, 56, S[0], S[5]);
}

/** Moth hull side (64 x 32): Ringborn patchwork plating, scorch, tape and a teal stripe. */
function paintMothHull(t) {
  // a Ringborn skiff: sun-bleached off-white plating, an orange racing stripe, rust and tape
  const plates = ['#6e675c', '#8f877a', '#b3aa98', '#c9c0ad', '#ddd5c2'];
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 64; x++) {
      const patch = Math.floor(x / 13 + Math.floor(y / 11) * 0.5) % 3;
      const n = fbm(x / 7, y / 7, 5, 3);
      const base = patch === 0 ? plates[3] : patch === 1 ? plates[2] : plates[4];
      t.px(x, y, n > 0.7 ? plates[4] : n < 0.3 ? plates[1] : base, 0.5 + (n - 0.5) * 0.1);
    }
  }
  for (let x = 0; x < 64; x += 13) t.vline(x, 0, 31, plates[0], 0.4);
  for (const y of [10, 21]) t.hline(0, 63, y, plates[0], 0.4);
  for (let x = 2; x < 64; x += 6) { rivet(t, x, 2, S); rivet(t, x, 29, S); }
  // the orange stripe with a teal Ringborn pinline, a red ribbon tied at the tail
  for (let x = 0; x < 64; x++) {
    t.px(x, 13, '#e0782e', 0.5).px(x, 14, '#f08a3a', 0.5).px(x, 15, '#c8601f', 0.5).px(x, 17, TE[4], 0.55);
  }
  for (let y = 8; y < 20; y++) t.px(58 + (y % 2), y, CR[3], 0.55);
  // tape over the turret damage, rust bleeding from the seams
  for (const [x0, y0] of [[22, 4], [24, 7], [40, 18]]) {
    for (let i = 0; i < 10; i++) t.px(x0 + i, y0 + (i >> 2), '#8a8470', 0.6).px(x0 + i, y0 + 1 + (i >> 2), '#a49d86', 0.6);
  }
  for (let y = 18; y < 30; y++) for (let x = 30; x < 44; x++) if (fbm(x / 3, y / 3, 9, 2) > 0.62) t.px(x, y, '#7a3e1c', 0.45);
  // running lights
  t.glow(2, 15, TE[5], TE[4]).glow(61, 15, CR[4], CR[3]);
}

/** The Halcyon's dorsal hull (32 x 32): big plates, panel lines, a few warm sun-lit edges. */
function paintHull(t) {
  plateBase(t, S, { seam: 0, lit: 5, body: 3, dark: 2 });
  seamGrime(t, 21, 0.8);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = fbm(x / 8, y / 8, 13, 3, 4, 4);
    if (n > 0.66) t.tone(x, y, 0.06);
    else if (n < 0.3) t.tone(x, y, -0.06);
  }
  t.hline(4, 27, 16, S[1], 0.3);
  for (const [x, y] of [[3, 3], [28, 3], [3, 28], [28, 28]]) rivet(t, x, y);
  t.glow(8, 24, mix(AM[4], S[2], 0.35));
}

/** The hull's flank: a band of crew-deck windows (warm, some dark: `dark` picks which). */
function paintHullWindows(t, dark = []) {
  plateBase(t, G, { seam: 0, lit: 4, body: 2, dark: 1 });
  t.rect(0, 9, 32, 15, '#0a0e17');
  t.hline(0, 31, 8, G[4]).hline(0, 31, 24, G[0]);
  [[3, 12], [17, 12]].forEach(([x, y], i) => {
    t.rect(x - 1, y - 1, 12, 9, G[0]);
    if (dark.includes(i)) {
      t.rect(x, y, 10, 7, '#121a2a');
      t.hline(x, x + 9, y, '#1f2c44');
      t.glow(x + 8, y + 5, mix(CY[2], '#121a2a', 0.5));
      return;
    }
    for (let j = 0; j < 7; j++) for (let k = 0; k < 10; k++) t.glow(x + k, y + j, j < 2 ? AM[5] : mix(AM[4], AM[2], j / 7));
    // a mullion and a silhouette of a sill
    t.vline(x + 5, y, y + 6, G[1]);
    t.hline(x, x + 9, y + 6, mix(AM[2], G[0], 0.4));
  });
  for (const [x, y] of [[1, 4], [30, 4], [1, 27], [30, 27]]) rivet(t, x, y);
  t.hline(0, 31, 28, mix(S[4], AM[4], 0.2), 0.5);
}

/** The hull's lower flank: ribbed, unlit plating falling away into the dark. */
function paintHullRib(t) {
  plateBase(t, G, { seam: 0, lit: 3, body: 1, dark: 0 });
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = fbm(x / 6, y / 6, 29, 3, 6, 6);
    if (n > 0.64) t.tone(x, y, 0.05);
    else if (n < 0.32) t.tone(x, y, -0.07);
  }
  for (const x of [7, 23]) t.vline(x, 0, 31, G[3]).vline(x + 1, 0, 31, G[0]);
  t.hline(0, 31, 15, G[0], 0.6);
  rivet(t, 15, 4);
  rivet(t, 15, 26);
}

export default {
  textures: {
    pro_sign_medbay: { w: 64, h: 16, paint: (t) => sign(t, 'MEDBAY', '#7fffd4', CROSS) },
    pro_pod_open: { w: 32, h: 64, paint: paintPodOpen },
    pro_moth_hull: { w: 64, h: 32, paint: paintMothHull },
    pro_hull: { w: 32, h: 32, wrapX: true, wrapY: true, paint: paintHull },
    pro_hull_windows: { w: 32, h: 32, wrapX: true, paint: (t) => paintHullWindows(t) },
    pro_hull_windows_b: { w: 32, h: 32, wrapX: true, paint: (t) => paintHullWindows(t, [1]) },
    pro_hull_rib: { w: 32, h: 32, wrapX: true, wrapY: true, paint: paintHullRib },
  },
  characters: {},
  enemyArt: {},
  particles: {
    pro_tape: [
      { n: 10, shape: 'square', life: [0.8, 1.6], speed: [0.6, 1.6], dir: 'up', cone: 1.1, size: [0.06, 0.1],
        colors: ['#d5cfb6', '#b9b39c'], intensity: 1.2, fade: [0.2, 0.5], drag: 1.6, gravity: 1.2 },
    ],
  },
};

