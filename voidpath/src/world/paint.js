// Pixel textures for world props that art/tiles.js does not cover: generic machined metal for prop
// sides, the Med-Station cabinet, its floating holo cross and the captain's chair (seen from
// behind). Painted once with the shared Painter at 32 px per world unit; cached.

import * as THREE from 'three';
import { Painter, makeNormalMap, toTexture } from '../art/painter.js';
import { RAMPS, OUTLINE, GLOW } from '../art/palette.js';

const S = RAMPS.steel, G = RAMPS.gunmetal, T = RAMPS.teal, W = RAMPS.white, N = RAMPS.navy;

function rivet(p, x, y) {
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
  for (const [x, y] of [[4, 4], [26, 4], [4, 26], [26, 26]]) rivet(p, x, y);
  return { p, e: null };
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
  rivet(p, 2, 6); rivet(p, 28, 6); rivet(p, 2, 36); rivet(p, 28, 36);
  return { p, e };
}

function paintMedCross() {
  const p = new Painter(16, 16);
  for (const [x, y, w, h] of [[6, 2, 4, 12], [2, 6, 12, 4]]) p.rect(x, y, w, h, '#6dffa8');
  p.rect(7, 3, 2, 10, '#e4fff0');
  p.rect(3, 7, 10, 2, '#e4fff0');
  return { p, e: p };
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
  return { p, e };
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
  return { p, e: null };
}

const PAINTERS = { metal_side: paintMetalSide, med_front: paintMedFront, med_cross: paintMedCross, chair: paintChair, seat: paintSeat };
const built = new Map();

/** { map, normalMap, emissiveMap|null, w, h } textures for a custom world texture (cached). */
export function worldTexture(name) {
  let t = built.get(name);
  if (t) return t;
  const { p, e } = PAINTERS[name]();
  const repeat = [1, 1]; // RepeatWrapping so box faces can tile it per world unit
  t = {
    map: toTexture(p, { repeat }),
    normalMap: toTexture(makeNormalMap(p, { bevel: 2, strength: 1.6, lumaRelief: 0.4 }), { color: false, repeat }),
    emissiveMap: e ? toTexture(e, { repeat }) : null,
    w: p.w, h: p.h,
  };
  built.set(name, t);
  return t;
}

/** Lit pixel material for a custom texture. */
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
