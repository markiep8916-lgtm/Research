// arboretum: the Arboretum's cast (browser; CharDefs for art/characters.js registerCharacter, TECH_PLAN
// 3.12, WRITING.md 2.5, 7).
//
// export const CHARACTERS   { id: CharDef } registered by art.js:
//   theo        Theo Lindqvist, 12, pod 2271: Sera's little brother (`base: 'sera'` on a kid's build),
//               her rose hair in a mop, a pale stasis gown, bare feet. `collapse` lies him down asleep.
//               C8's grown dream Theo (`theo_grown`) is registered with `base: 'theo'`.
//   mother7     MOTHER-7 freed (custom painter): a slender caretaker on a tripod skirt, ceramic dome,
//               a soft green face screen, shears and a watering lance, the last vines still on her.
//               `collapse` is her slumped on her skirt, the screen dimmed. Portrait expressions:
//               neutral smile sad surprised determined.
//   arb_tender  a caretaker drone (custom painter): a hovering ceramic ball with a watering rose, an
//               amber lens and a sprout on top. Never speaks; its portrait keeps the def complete.

import { Painter } from '../../art/painter.js';
import { OUTLINE } from '../../art/palette.js';

// ---------------------------------------------------------------- Theo

const MOP = {
  down: { hairline: 5.4, list: [['ball', 7, 4.6, 7.0, 4.4], ['ball', 3.0, 6.0, 2.4, 2.6], ['ball', 11.0, 6.0, 2.4, 2.6], [5.0, 1.6, 3.4, 6.6, 1.7, 0.6], [9.2, 1.8, 10.8, 6.4, 1.6, 0.6], [7.2, 1.2, 8.6, 5.2, 1.5, 0.5]] },
  up: { hairline: 0, list: [['ball', 7, 5.6, 7.2, 5.8], [3.4, 9.2, 3.8, 11.4, 1.7, 0.8], [10.6, 9.2, 10.2, 11.4, 1.7, 0.8], [7.0, 10.0, 7.4, 12.0, 1.5, 0.7]] },
  side: { hairline: 5.8, list: [['ball', 5.6, 6.4, 5.2, 4.6], ['ball', 6.8, 4.0, 5.8, 3.6], [2.4, 7.4, 0.8, 9.8, 1.7, 0.6], [9.8, 2.6, 12.0, 4.2, 1.5, 0.6]] },
};
const P_MOP = [['ball', 11.8, 8.4, 4.4, 4.8], ['ball', 8.6, 5.0, 7.6, 4.6], [4.0, 3.4, 1.8, 6.8, 1.9, 0.6], [12.2, 2.4, 15.0, 3.6, 1.7, 0.6], [8.0, 1.6, 9.6, 4.4, 1.6, 0.6]];

const THEO = {
  base: 'sera',
  mats: {
    skin: ['#9e5a4c', '#de9c82', '#f7c8ac', '#ffe6d4'],
    hair: ['#5a1f3a', '#8f3a5e', '#c8648a', '#ec98b6', '#ffd2e2'],
    main: ['#5a5040', '#968a70', '#cfc4a6', '#efe7d0', '#ffffff'],
    sec: ['#5a3a0a', '#a8741c', '#e0a83a', '#ffd27a'],
    acc: ['#5a3a0a', '#a8741c', '#e0a83a', '#ffd27a'],
    eye: ['#3a1a3a', '#4a7aa8', '#ffffff'],
    glow: ['#f0b84a', '#fff0a8', '#fffbe8'],
  },
  build: { headY: 11, shY: 26, hipY: 34.5, shW: 3.6, waistW: 2.9, hipW: 3.0, armX: 4.4, hipX: 1.6, thighR: 1.5, shinR: 1.35, armR: 1.15, chest: 2.6, back: 2.4 },
  style: {
    thigh: 'main', shin: 'main', boot: 'skin', bootFrom: 0.2, upper: 'main', fore: 'skin', cuff: 'main', hand: 'skin',
    torso: (ty) => (ty === 1 ? 'sec' : 'main'),
  },
  locks: MOP,
  over: {},
  hooks: { behind: null, front: null, skirt: null },
  hairLocks: P_MOP,
  hairline: 6,
  portrait: {
    behind: null,
    after: null,
    bust: (f) => f.ball(21, 44, 14, 9.5, 'main'),
    collar: (f) => f.ball(21.5, 31.5, 6, 2.2, 'sec', { spec: true }),
    over: [],
  },
};

// ---------------------------------------------------------------- shading helpers (custom painters)

const SHELL = ['#2a2f2a', '#4a5248', '#727c6e', '#9fa894', '#c8cfb8', '#e8edd8'];
const STEEL = ['#11161c', '#1d252e', '#2c3844', '#41505e', '#5d707e'];
const SCREEN = ['#04140c', '#0a2a18', '#124024'];
const EYE = ['#3fae5a', '#8fe08a', '#d8ffd0'];
const LEAF = ['#0b2412', '#154020', '#22602e', '#33823c', '#4ea64e'];
const PINK = ['#7c1a4c', '#da4d8e', '#ffb6d5'];
const AMBER = ['#6a3008', '#ff9a2a', '#fff0c0'];
const BIO = ['#0f6a78', '#4dffe0', '#d9fff6'];

/** Ellipse shaded as a dome lit from the upper left, through `ramp` (dark -> light). */
function dome(p, cx, cy, rx, ry, ramp, { bias = 0, clip = null } = {}) {
  const n = ramp.length - 1;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = u * u + v * v;
      if (d > 1 || (clip && !clip(x, y))) continue;
      const nz = Math.sqrt(1 - d);
      const l = (-u * 0.55 - v * 0.7 + nz * 0.55) * 0.75 + 0.35 + bias;
      p.px(x, y, ramp[Math.max(0, Math.min(n, Math.round(l * n)))]);
    }
  }
}

/** A vertical tapered column (a cylinder lit from the left) from y0 to y1, half widths w0 -> w1. */
function column(p, cx, y0, y1, w0, w1, ramp, bias = 0) {
  const n = ramp.length - 1;
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const t = (y - y0) / Math.max(1, y1 - y0), w = w0 + (w1 - w0) * t;
    for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
      const u = (x + 0.5 - cx) / (w + 0.01);
      if (Math.abs(u) > 1) continue;
      const l = (-u * 0.6 + Math.sqrt(1 - u * u) * 0.6) * 0.8 + 0.25 + bias;
      p.px(x, y, ramp[Math.max(0, Math.min(n, Math.round(l * n)))]);
    }
  }
}

function finish(p) {
  p.outline(OUTLINE);
  return p;
}

/** A small five-petal bloom. */
function bloom(p, x, y) {
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1]]) p.px(x + dx, y + dy, PINK[1]);
  p.px(x - 1, y - 1, PINK[2]);
  p.px(x, y, '#fff07a');
}

/** A vine strand wound from (x, y) downward over `len` px, leaves every few px. */
function vine(p, x, y, len, sway, seed) {
  for (let k = 0; k < len; k++) {
    const vx = Math.round(x + Math.sin(seed + k * 0.5) * sway);
    p.px(vx, y + k, LEAF[k % 3 === 0 ? 1 : 2]);
    if (k % 4 === 2) {
      p.px(vx + (k & 4 ? 1 : -1), y + k, LEAF[3]);
      p.px(vx + (k & 4 ? 2 : -2), y + k - 1, LEAF[4]);
    }
  }
}

// ---------------------------------------------------------------- MOTHER-7

/** Her face screen: two soft eye arcs on dark glass, in the given mood. */
function face7(p, cx, cy, mood, scale = 1) {
  const e = (x, y, c) => p.rect(Math.round(cx + x * scale), Math.round(cy + y * scale), scale, scale, c);
  const eyes = scale > 1 ? [-4, 4] : [-2, 2];
  for (const ex of eyes) {
    if (mood === 'dim') { e(ex - 1, 0, EYE[0]); e(ex, 0, EYE[0]); e(ex + 1, 0, EYE[0]); continue; }
    if (mood === 'smile') { e(ex - 1, 0, EYE[1]); e(ex, -1, EYE[2]); e(ex + 1, 0, EYE[1]); continue; }
    if (mood === 'sad') { e(ex - 1, -1, EYE[1]); e(ex, 0, EYE[2]); e(ex + 1, 0, EYE[1]); continue; }
    if (mood === 'surprised') { e(ex, -1, EYE[1]); e(ex - 1, 0, EYE[1]); e(ex + 1, 0, EYE[1]); e(ex, 1, EYE[1]); e(ex, 0, EYE[2]); continue; }
    if (mood === 'determined') { e(ex - 1, 0, EYE[2]); e(ex, 0, EYE[2]); e(ex + 1, 0, EYE[2]); continue; }
    e(ex - 1, 0, EYE[1]); e(ex, 0, EYE[2]); e(ex + 1, 0, EYE[1]); e(ex, 1, EYE[0]);
  }
}

/** MOTHER-7 in the field: 48x48, base on the bottom row. `slump` (0..1) lowers and tips her. */
function drawMother(view, kind, i, blink, slump = 0) {
  const p = new Painter(48, 48);
  const bob = kind === 'walk' ? [0, 1, 0, 1][i] : i;
  const side = view === 'side', back = view === 'up';
  const cx = 24, top = 4 + bob + slump * 14;
  // the tripod skirt and its three feet
  dome(p, cx, 43, 9, 4, STEEL, { clip: (x, y) => y < 45 });
  for (const fx of side ? [-6, 5] : [-8, 0, 8]) p.rect(cx + fx - 1, 44, 3, 3, STEEL[3]);
  p.hline(cx - 8, cx + 8, 41, SHELL[2]);
  // body column: ceramic, a green service band, the vines still on it
  const lean = slump * (side ? 4 : 2);
  column(p, cx + lean * 0.5, top + 15, 41, side ? 3.4 : 4.2, side ? 4.6 : 5.6, SHELL);
  p.hline(cx - 4 + Math.round(lean * 0.5), cx + 4 + Math.round(lean * 0.5), top + 25, '#2d8f66');
  p.hline(cx - 4 + Math.round(lean * 0.5), cx + 4 + Math.round(lean * 0.5), top + 26, '#1f6e4f');
  vine(p, cx - 3, top + 16, 22 - slump * 10, 1.4, 0.3);
  vine(p, cx + 3, top + 18, 18 - slump * 8, 1.2, 2.1);
  // arms: shears on her left (screen right), the watering lance on her right
  const armY = top + 18;
  if (!side) {
    const drop = slump * 6;
    p.line(cx + 5, armY, cx + 9, armY + 7 + drop, SHELL[3]);
    p.line(cx + 6, armY, cx + 10, armY + 7 + drop, SHELL[2]);
    p.line(cx + 9, armY + 8 + drop, cx + 11, armY + 13 + drop, '#b2c2d4');
    p.line(cx + 10, armY + 8 + drop, cx + 9, armY + 13 + drop, '#7d90a8');
    p.line(cx - 5, armY, cx - 9, armY + 8 + drop, SHELL[3]);
    p.line(cx - 6, armY, cx - 10, armY + 8 + drop, SHELL[1]);
    p.rect(cx - 11, armY + 9 + drop, 3, 2, STEEL[3]);
    p.px(cx - 11, armY + 11 + drop, BIO[0]);
  } else {
    const drop = slump * 5;
    p.line(cx + 2, armY, cx + 7, armY + 6 + drop, SHELL[3]);
    p.line(cx + 2, armY + 1, cx + 7, armY + 7 + drop, SHELL[2]);
    p.line(cx + 7, armY + 7 + drop, cx + 11, armY + 9 + drop, '#b2c2d4');
  }
  // the neck and the dome head
  const hx = cx + lean, hy = top + 7;
  p.rect(hx - 1, hy + 5, 3, 5, STEEL[2]);
  dome(p, hx, hy, side ? 6.5 : 7.5, 6.5, SHELL, { bias: 0.05 });
  // moss on the crown, a pink bloom, a fern sprig
  for (let k = -3; k <= 3; k++) p.px(hx + k, hy - 6 + (Math.abs(k) > 2 ? 1 : 0), LEAF[k & 1 ? 3 : 2]);
  p.px(hx - 2, hy - 7, LEAF[4]).px(hx - 3, hy - 8, LEAF[3]).px(hx - 4, hy - 9, LEAF[3]);
  bloom(p, hx + (side ? -2 : 4), hy - 5);
  if (back) {
    // the back of her head: a hatch, a cable
    p.rect(hx - 2, hy - 1, 5, 4, SHELL[1]);
    p.hline(hx - 2, hx + 2, hy - 1, SHELL[3]);
  } else {
    // the face screen: dark glass with her eyes
    const fx = side ? hx + 2 : hx, w = side ? 3 : 5;
    p.rect(fx - w, hy - 1, w * 2 + 1, 5, SCREEN[1]);
    p.hline(fx - w, fx + w, hy - 1, SCREEN[2]);
    p.hline(fx - w, fx + w, hy + 3, SCREEN[0]);
    face7(p, fx + (side ? 1 : 0), hy + 1, slump > 0.5 ? 'dim' : blink ? 'smile' : 'neutral');
  }
  return finish(p);
}

function motherField(view, kind, i, blink) {
  if (kind === 'collapse') return drawMother(view, 'idle', 0, false, 1);
  return drawMother(view, kind, i, blink);
}

/** Portrait (40x40): her dome close up, the face screen, vines and the bloom. */
function motherPortrait(expr = 'neutral') {
  const p = new Painter(40, 40);
  // shoulders and the service band
  dome(p, 20, 40, 15, 9, SHELL);
  p.hline(8, 32, 35, '#2d8f66');
  p.hline(8, 32, 36, '#1f6e4f');
  p.rect(17, 27, 7, 5, STEEL[2]);
  // the dome
  dome(p, 20, 17, 13, 12, SHELL, { bias: 0.05 });
  // face screen
  p.rect(9, 15, 23, 10, SCREEN[1]);
  p.hline(9, 31, 15, SCREEN[2]);
  p.hline(9, 31, 24, SCREEN[0]);
  for (let y = 16; y < 24; y += 2) p.hline(10, 30, y, '#0c321c');
  face7(p, 20, 19, expr, 2);
  if (expr !== 'surprised') p.hline(18, 22, 22, EYE[0]);
  // moss and vines over the crown, the bloom, a fern sprig
  for (let x = 9; x <= 31; x++) {
    const y = 6 + Math.round(Math.abs(x - 20) * Math.abs(x - 20) * 0.03);
    p.px(x, y, LEAF[x % 3 === 0 ? 3 : 2]);
    if (x % 2) p.px(x, y + 1, LEAF[1]);
  }
  vine(p, 8, 9, 20, 1.2, 0.4);
  vine(p, 31, 8, 14, 1.0, 1.7);
  vine(p, 13, 6, 6, 0.6, 2.6);
  for (let k = 0; k < 5; k++) p.px(26 + k, 4 - k, LEAF[3]).px(27 + k, 5 - k, LEAF[4]);
  bloom(p, 28, 7);
  bloom(p, 11, 26);
  return finish(p);
}

// ---------------------------------------------------------------- the caretaker drone

function drawTender(view, kind, i) {
  const p = new Painter(48, 48);
  const bob = [0, 1, 1, 0][i % 4];
  const side = view === 'side', back = view === 'up';
  const cx = 24, cy = 30 + bob;
  // hover jets: soft cyan under the shell
  p.ellipse(cx, cy + 9, 4, 1.5, BIO[0]);
  p.ellipse(cx, cy + 9, 2, 1, BIO[1]);
  // the shell: ceramic top, dark housing below
  dome(p, cx, cy, 8, 7, SHELL, { clip: (x, y) => y < cy + 2 });
  dome(p, cx, cy, 8, 7, STEEL, { clip: (x, y) => y >= cy + 2 });
  p.hline(cx - 7, cx + 7, cy + 1, '#2d8f66');
  // a sprout on top
  p.line(cx, cy - 7, cx, cy - 10, LEAF[2]);
  p.px(cx - 1, cy - 10, LEAF[4]).px(cx - 2, cy - 11, LEAF[3]).px(cx + 1, cy - 11, LEAF[4]).px(cx + 2, cy - 12, LEAF[3]);
  // the watering rose on its arm
  const ax = side ? cx + 8 : cx - 9;
  p.line(side ? cx + 5 : cx - 6, cy + 2, ax, cy + 4, STEEL[3]);
  p.rect(ax - 1, cy + 4, 3, 2, SHELL[3]);
  if (!back) {
    // the amber lens under a little brow
    const lx = side ? cx + 4 : cx + 2;
    p.ellipse(lx, cy - 1, 2.4, 2.2, STEEL[1]);
    p.ellipse(lx, cy - 1, 1.5, 1.4, AMBER[1]);
    p.px(lx - 1, cy - 2, AMBER[2]);
    p.hline(lx - 2, lx + 2, cy - 4, SHELL[4]);
  }
  return finish(p);
}

function tenderPortrait() {
  const p = new Painter(40, 40);
  p.blit(drawTender('down', 'idle', 0), -4, -8);
  return p;
}

export const CHARACTERS = {
  theo: THEO,
  mother7: { custom: { field: motherField, portrait: motherPortrait }, poses: ['collapse'] },
  arb_tender: { custom: { field: drawTender, portrait: tenderPortrait } },
};
