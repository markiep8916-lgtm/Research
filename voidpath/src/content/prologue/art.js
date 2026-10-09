// prologue: textures and particle presets for the Halcyon's new rooms, the Moth and the cold open
// (browser, TECH_PLAN 2.5, 3.12). Painted lazily (first use or prewarm), 32 px per world unit,
// with the shared Halcyon ramps so the new rooms sit beside the POC rooms.
//
//   pro_sign_medbay                   the medbay's neon wall sign in the POC sign style
//   pro_pod_open                      an emptied cryo pod: frosted cradle, cyan rim lights (front face)
//   pro_moth_hull                     Nyx's patched Ringborn skiff: one atlas for the whole ship (MOTH_ATLAS)
//   pro_hull                          the Halcyon's dorsal hull plating (exterior)
//   pro_hull_windows / _b / pro_hull_rib   the hull's flank: crew-deck windows, ribbed plating
//   pro_tethys_sky                    the cold open's vista: the shared space backdrop with its magenta
//                                     nebula turned amber (12.1: Tethys amber and cream over black)
// Everything else on the Halcyon reuses POC textures (visualLint caps a map at 48).
//   particles: pro_tape (fluttering tape scraps when BOLT repairs the Moth)

import { drawText, textWidth, plateBase, seamGrime, rivet, engrave, fbm, buildTexture } from '../../art/tiles.js';
import { RAMPS, GLOW } from '../../art/palette.js';
import { mix, makeCanvas } from '../../art/painter.js';

const S = RAMPS.steel;
const G = RAMPS.gunmetal;
const TE = RAMPS.teal;
const CY = RAMPS.cyan;
const AM = RAMPS.amber;
const CR = RAMPS.crimson;
const GD = RAMPS.gold;

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

// The Moth's atlas (160 x 96 px, 32 px per unit): the shared Moth builder (props.js) maps every face
// into one of these rects [x, y, w, h], so the whole skiff is one texture.
//   hull     u = nose (x 0) -> tail (x 159) over 5 units; v = dorsal line (y 0) -> keel (y 63), the
//            profile points sit at y 0 (dorsal), 18 (shoulder), 36 (beam), 52 (chine), 63 (keel)
//   canopy   u = front -> back; v = crown (y 64) -> sill (y 95)
//   wing     u = leading edge -> trailing edge; v = root -> tip (the tail fin too)
//   metal    soot-stained gunmetal: nozzles, struts, the tail plate
export const MOTH_ATLAS = { w: 160, h: 96, hull: [0, 0, 160, 64], canopy: [0, 64, 64, 32], wing: [64, 64, 64, 32], metal: [128, 64, 32, 32] };

const MOTH_CREAM = ['#4f483f', '#7a7163', '#a39a87', '#c3baa5', '#d8d0bc', '#ebe5d4'];
const MOTH_SEAMS_X = [0, 14, 31, 49, 66, 84, 101, 118, 136, 160];
const MOTH_SEAMS_Y = [0, 18, 36, 52, 64];

/** Pixel-hash in [0, 1) for deterministic salvage choices. */
const mh = (a, b) => {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Nyx's patched Ringborn skiff: the hull band, canopy glass, wing plate and engine metal. */
function paintMothHull(t) {
  // ---- hull: salvaged panels (mostly sun-bleached cream, a few teal-grey and rust replacements)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c + 1 < MOTH_SEAMS_X.length; c++) {
      const x0 = MOTH_SEAMS_X[c], x1 = MOTH_SEAMS_X[c + 1], y0 = MOTH_SEAMS_Y[r], y1 = MOTH_SEAMS_Y[r + 1];
      const k = mh(c + 3, r + 11);
      const body = r === 3 ? G[3] : k < 0.14 ? '#6f8c88' : k < 0.24 ? '#9a6a4a' : k < 0.5 ? MOTH_CREAM[3] : MOTH_CREAM[4];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const n = fbm(x / 6, y / 6, 5, 3);
        t.px(x, y, body, 0.55);
        if (n > 0.68) t.tone(x, y, 0.05);
        else if (n < 0.3) t.tone(x, y, -0.05);
      }
    }
  }
  // the dorsal is the most sun-bleached; the keel band carries soot and grime
  for (let x = 0; x < 160; x++) {
    for (let y = 0; y < 6; y++) t.tone(x, y, 0.04);
    for (let y = 52; y < 64; y++) if (fbm(x / 4, y / 3, 17, 2) > 0.45 - (y - 52) * 0.02) t.tone(x, y, -0.06);
  }
  // panel seams: a dark groove with a lit lip, rivets along them
  for (const x of MOTH_SEAMS_X.slice(1, -1)) {
    t.vline(x, 0, 63, MOTH_CREAM[0], 0.36).vline(x + 1, 0, 63, null, 0.6);
    for (let y = 3; y < 62; y += 5) rivet(t, x + 2, y);
  }
  for (const y of MOTH_SEAMS_Y.slice(1, -1)) {
    t.hline(0, 159, y, MOTH_CREAM[0], 0.36).hline(0, 159, y + 1, null, 0.6);
    for (let x = 4; x < 158; x += 6) rivet(t, x, y + 2);
  }
  // the nose: gunmetal cap and a red ribbon band; the tail: exhaust soot
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 10; x++) t.px(x, y, x < 6 ? G[2] : G[3], 0.6);
    for (let x = 10; x < 13; x++) t.px(x, y, x === 10 ? CR[2] : CR[3], 0.58);
    for (let x = 140; x < 160; x++) if (mh(x, y) < (x - 140) / 26) t.tone(x, y, -0.1);
  }
  // teal racing stripe along the beam with an orange Ringborn pinline under it
  for (let x = 13; x < 160; x++) {
    t.px(x, 32, TE[5], 0.6).px(x, 33, TE[4], 0.6).px(x, 34, TE[3], 0.6).px(x, 35, TE[2], 0.58).px(x, 38, '#e0782e', 0.56);
  }
  // hull number RB-24, stencilled twice size on the upper side behind the cockpit
  drawText('RB-24', 0, 0, (gx, gy) => {
    for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) t.px(42 + gx * 2 + ox, 17 + gy * 2 + oy, '#2a2e38', 0.5);
  });
  // turret scorch on the tail quarter, taped over; more tape where the panels were patched
  for (let y = 24; y < 52; y++) for (let x = 104; x < 132; x++) {
    const d = Math.hypot((x - 117) / 13, (y - 38) / 12) + (fbm(x / 3, y / 3, 9, 2) - 0.5) * 0.6;
    if (d < 0.55) t.px(x, y, '#231c18', 0.42);
    else if (d < 0.8) t.px(x, y, '#5a3420', 0.5);
  }
  const tape = (x0, y0, len, dx, dy) => {
    for (let i = 0; i < len; i++) {
      const x = Math.round(x0 + dx * i), y = Math.round(y0 + dy * i);
      t.px(x, y, '#a8a594', 0.64).px(x + dy, y + dx, '#c7c3b0', 0.66).px(x + 2 * dy, y + 2 * dx, '#8f8c7c', 0.62);
    }
  };
  tape(106, 30, 22, 1, 0.45);
  tape(108, 46, 20, 1, -0.5);
  tape(70, 6, 12, 1, 0);
  tape(24, 44, 10, 1, 0.2);
  // status lights by the cockpit
  for (const [x, y, c] of [[34, 41, GLOW.amber], [37, 41, GLOW.green], [40, 41, GLOW.amber]]) t.glow(x, y, c);

  // ---- canopy glass: deep blue at the crown to teal at the sill, reflections, frame, cockpit glow
  for (let y = 64; y < 96; y++) for (let x = 0; x < 64; x++) {
    const k = (y - 64) / 31;
    t.px(x, y, mix('#0d1f33', '#1f5266', k), 0.62);
    if ((((x + (y - 64) * 0.9) % 23) + 23) % 23 < 2 && y < 88) t.px(x, y, '#a4dcec', 0.64);
  }
  for (const x of [0, 1, 21, 22, 42, 43, 62, 63]) t.vline(x, 64, 95, x % 21 ? G[2] : G[4], 0.7);
  t.hline(0, 63, 64, G[2], 0.7).hline(0, 63, 93, G[4], 0.7).hline(0, 63, 94, G[3], 0.7).hline(0, 63, 95, G[2], 0.7);
  for (let x = 4; x < 60; x++) {
    if (x % 21 < 2) continue;
    t.glow(x, 90, mix(TE[4], '#1f5266', 0.45), mix(TE[3], '#000000', 0.35));
    if (x % 5 === 0) t.glow(x, 88, x % 10 ? GLOW.amber : GLOW.cyan, mix(GLOW.amber, '#000000', 0.25));
  }

  // ---- wing plate (and the tail fin): cream panels, an orange leading edge, hazard tips
  for (let y = 64; y < 96; y++) for (let x = 64; x < 128; x++) {
    const n = fbm(x / 5, y / 5, 23, 3);
    t.px(x, y, (x < 96) === (y < 80) ? MOTH_CREAM[4] : MOTH_CREAM[3], 0.55);
    if (n > 0.7) t.tone(x, y, 0.05); else if (n < 0.3) t.tone(x, y, -0.05);
  }
  t.vline(96, 64, 95, MOTH_CREAM[0], 0.36).hline(64, 127, 80, MOTH_CREAM[0], 0.36);
  for (let y = 64; y < 96; y++) for (let x = 64; x < 69; x++) t.px(x, y, x === 68 ? '#8a3c14' : '#e0782e', 0.62);
  for (let y = 91; y < 96; y++) for (let x = 69; x < 128; x++) t.px(x, y, ((x + y) >> 2) % 2 ? GD[4] : '#22202a', 0.6);
  tape(84, 70, 18, 1, 0.3);
  for (let y = 66; y < 90; y += 6) for (let x = 72; x < 126; x += 8) rivet(t, x, y);

  // ---- engine metal: gunmetal with heat bluing toward the exhaust end
  for (let y = 64; y < 96; y++) for (let x = 128; x < 160; x++) {
    const k = (y - 64) / 31;
    t.px(x, y, k > 0.75 ? mix(G[3], '#4c3f78', (k - 0.75) * 3) : G[3], 0.55);
    if (fbm(x / 4, y / 4, 31, 2) < 0.35) t.tone(x, y, -0.06);
  }
  for (const y of [70, 78, 86]) t.hline(128, 159, y, G[1], 0.4);
  for (let x = 131; x < 160; x += 6) rivet(t, x, 66);
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

/** The shared space backdrop, its magenta nebula shifted to amber and gold (teal and Tethys untouched). */
function paintTethysSky() {
  const src = buildTexture('space_backdrop').map;
  const cv = makeCanvas(src.width, src.height);
  const g = cv.getContext('2d');
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, cv.width, cv.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const m = Math.min(d[i], d[i + 2]) - d[i + 1];
    if (m <= 0) continue;
    d[i] = Math.min(255, d[i] + m * 0.15);
    d[i + 1] = Math.min(255, d[i + 1] + m * 0.62);
    d[i + 2] = Math.max(0, d[i + 2] - m * 0.95);
  }
  g.putImageData(img, 0, 0);
  return cv;
}

export default {
  textures: {
    pro_sign_medbay: { w: 64, h: 16, paint: (t) => sign(t, 'MEDBAY', '#7fffd4', CROSS) },
    pro_pod_open: { w: 32, h: 64, paint: paintPodOpen },
    pro_moth_hull: { w: 160, h: 96, paint: paintMothHull },
    pro_hull: { w: 32, h: 32, wrapX: true, wrapY: true, paint: paintHull },
    pro_hull_windows: { w: 32, h: 32, wrapX: true, paint: (t) => paintHullWindows(t) },
    pro_hull_windows_b: { w: 32, h: 32, wrapX: true, paint: (t) => paintHullWindows(t, [1]) },
    pro_hull_rib: { w: 32, h: 32, wrapX: true, wrapY: true, paint: paintHullRib },
    pro_tethys_sky: { w: 1024, h: 512, raw: paintTethysSky, emissiveIsMap: true },
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

