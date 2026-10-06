// Shared look for the field UI: panel frames with corner brackets, selectable rows with an amber
// sheen, small-caps labels, stat bars, controller glyphs, fallback icons and portrait badges.
// Every component imports from here so the whole UI reads as one family.

import { injectCSS, el } from '../core/util.js';
import { DAMAGE_COLORS } from '../art/palette.js';

export const BASE_CSS = `
.vp-layer { position: absolute; inset: 0; pointer-events: none; }
#ui-root > .vp-layer { pointer-events: none; }          /* beats the template's #ui-root > * rule */
#ui-root > .vp-layer.is-live { pointer-events: auto; }
/* big screens: scale the whole UI like a console does, keeping a ~1280x720 effective layout */
@media (min-width: 1560px) and (min-height: 880px) { #ui-root > .vp-layer { zoom: 1.25; } }
@media (min-width: 1880px) and (min-height: 1060px) { #ui-root > .vp-layer { zoom: 1.5; } }
@media (min-width: 2520px) and (min-height: 1420px) { #ui-root > .vp-layer { zoom: 2; } }
/* closed layers keep no animation ticking (no wasted frames under the 3D view) */
.vp-menu:not(.is-open) *, .vp-title:not(.is-open) *, .vp-dlg:not(.is-open) *, .vp-hud.is-hidden * { animation-play-state: paused !important; }

/* --- window frame: translucent navy, hairline border, faint inner glow, corner brackets.
   Raster-cheap on purpose: no large blurs or filters (the 3D view below changes every frame and
   software / low-memory GPUs re-raster UI tiles often), glow is faked with gradients. */
.vp-panel { position: relative; color: var(--vp-ink);
  background:
    linear-gradient(180deg, rgba(127,227,255,.075), rgba(127,227,255,0) 42%),
    linear-gradient(90deg, rgba(110,190,255,.06), rgba(110,190,255,0) 7%, rgba(110,190,255,0) 93%, rgba(110,190,255,.06)),
    linear-gradient(0deg, rgba(110,190,255,.05), rgba(110,190,255,0) 18%),
    var(--vp-panel);
  border: 1px solid var(--vp-line-dim); border-radius: 2px;
  box-shadow: inset 0 0 0 1px rgba(5,7,13,.55), 0 6px 16px rgba(0,0,0,.34); }
.vp-panel::before { content: ''; position: absolute; inset: -4px; pointer-events: none;
  --c: rgba(200,240,255,.95); --g: rgba(127,227,255,.22); --l: 13px; --t: 1.5px; --L: 15px; --T: 4px;
  background:
    linear-gradient(var(--c), var(--c)) left top / var(--l) var(--t), linear-gradient(var(--c), var(--c)) left top / var(--t) var(--l),
    linear-gradient(var(--c), var(--c)) right top / var(--l) var(--t), linear-gradient(var(--c), var(--c)) right top / var(--t) var(--l),
    linear-gradient(var(--c), var(--c)) left bottom / var(--l) var(--t), linear-gradient(var(--c), var(--c)) left bottom / var(--t) var(--l),
    linear-gradient(var(--c), var(--c)) right bottom / var(--l) var(--t), linear-gradient(var(--c), var(--c)) right bottom / var(--t) var(--l),
    linear-gradient(var(--g), var(--g)) left top / var(--L) var(--T), linear-gradient(var(--g), var(--g)) left top / var(--T) var(--L),
    linear-gradient(var(--g), var(--g)) right top / var(--L) var(--T), linear-gradient(var(--g), var(--g)) right top / var(--T) var(--L),
    linear-gradient(var(--g), var(--g)) left bottom / var(--L) var(--T), linear-gradient(var(--g), var(--g)) left bottom / var(--T) var(--L),
    linear-gradient(var(--g), var(--g)) right bottom / var(--L) var(--T), linear-gradient(var(--g), var(--g)) right bottom / var(--T) var(--L);
  background-repeat: no-repeat; }
.vp-panel::after { content: ''; position: absolute; left: 14%; right: 14%; top: -1px; height: 1px; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(200,240,255,.85), transparent); }
.vp-panel.vp-rich { outline: 1px solid rgba(140,214,255,.075); outline-offset: -6px; }
.vp-panel.vp-solid { background: linear-gradient(180deg, rgba(127,227,255,.08), rgba(127,227,255,0) 42%), #090e1c; }

/* --- small-caps label */
.vp-cap { font-family: var(--vp-font-ui); font-weight: 600; font-size: 13px; letter-spacing: .24em; text-transform: uppercase; color: var(--vp-ink-dim); }
.vp-num { font-family: var(--vp-font-display); font-variant-numeric: tabular-nums; letter-spacing: .02em; }
.vp-em { color: var(--vp-amber); text-shadow: 0 0 10px rgba(255,197,96,.35); }

/* --- selectable row: amber selection, cursor triangle, animated sheen */
.vp-row { position: relative; display: flex; align-items: center; gap: 12px; min-height: 42px; padding: 0 16px 0 34px;
  color: var(--vp-ink); cursor: pointer; overflow: hidden; transition: color .12s, background-color .12s; }
.vp-row::before { content: ''; position: absolute; left: 13px; top: 50%; width: 0; height: 0; margin-top: -6px;
  border-left: 9px solid var(--vp-amber); border-top: 6px solid transparent; border-bottom: 6px solid transparent;
  opacity: 0; transform: translateX(-6px); transition: opacity .12s, transform .16s var(--vp-ease-out); }
.vp-row.is-sel { color: var(--vp-amber); text-shadow: 0 0 8px rgba(255,197,96,.4);
  background: linear-gradient(90deg, rgba(255,197,96,.17), rgba(255,197,96,.05) 55%, rgba(255,197,96,0)); box-shadow: inset 2px 0 0 var(--vp-amber); }
.vp-row.is-sel::before { opacity: 1; transform: none; animation: vp-nudge 1.1s ease-in-out infinite; }
.vp-row.is-sel::after { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 38%; pointer-events: none;
  background: linear-gradient(100deg, rgba(255,230,180,0), rgba(255,230,180,.16), rgba(255,230,180,0));
  transform: translateX(-120%); animation: vp-sheen 2.8s var(--vp-ease-out) infinite; }
.vp-row.is-dim { color: var(--vp-ink-faint); }
.vp-row.is-dim.is-sel { color: #c99a4f; }
@keyframes vp-nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
@keyframes vp-sheen { 0% { transform: translateX(-120%); } 55%, 100% { transform: translateX(330%); } }

/* --- bars */
.vp-bar { position: relative; height: 6px; background: rgba(4,8,18,.75); box-shadow: inset 0 0 0 1px rgba(140,214,255,.16); overflow: hidden; }
.vp-bar > i { position: absolute; inset: 1px; transform-origin: 0 50%; transition: transform .45s var(--vp-ease-out); }
.vp-bar.hp > i { background: linear-gradient(180deg, #b6ffd4, var(--vp-hp) 40%, #2a9e66); }
.vp-bar.ep > i { background: linear-gradient(180deg, #c4e4ff, var(--vp-ep) 40%, #2d63b8); }
.vp-bar.xp > i { background: linear-gradient(90deg, rgba(255,197,96,.4), var(--vp-amber)); }
.vp-bar.hp.is-low > i { background: linear-gradient(180deg, #ffd0a0, #ff9a4a 40%, #c4502a); }

/* --- controller glyphs */
.vp-key { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 22px; padding: 0 7px; box-sizing: border-box;
  border: 1px solid rgba(233,242,255,.6); border-bottom-width: 2px; border-radius: 4px; background: rgba(233,242,255,.08);
  font: 600 12px/1 var(--vp-font-ui); letter-spacing: .06em; color: var(--vp-ink); white-space: nowrap; }
.vp-padbtn { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; box-sizing: border-box;
  background: radial-gradient(circle at 50% 35%, #2a3550, #10172a); border: 1px solid rgba(233,242,255,.35);
  font: 700 12px/1 var(--vp-font-display); color: var(--vp-ink); }
.vp-padbtn.a { color: #7cf0a8; } .vp-padbtn.b { color: #ff8090; } .vp-padbtn.x { color: #7cc2ff; } .vp-padbtn.y { color: #ffe27a; }
.vp-padbtn.wide { width: auto; min-width: 30px; padding: 0 6px; border-radius: 12px; font-size: 11px; }
.vp-tapbtn { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; box-sizing: border-box;
  border: 1.5px solid rgba(255,197,96,.85); color: var(--vp-amber); font: 700 12px/1 var(--vp-font-display);
  box-shadow: 0 0 10px rgba(255,197,96,.3), inset 0 0 6px rgba(255,197,96,.25); }
.vp-glyphs { display: inline-flex; gap: 4px; align-items: center; }

/* --- icons (provider data URLs are pixel art: keep them crisp) */
.vp-ico { display: inline-block; flex: none; image-rendering: pixelated; image-rendering: crisp-edges; vertical-align: middle; }

/* --- portrait frame (pixel bust or initials badge) */
.vp-portrait { position: relative; flex: none; box-sizing: border-box; overflow: hidden; --acc: var(--vp-cyan);
  background: radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,.10), rgba(255,255,255,0) 55%),
              linear-gradient(160deg, color-mix(in srgb, var(--acc) 30%, #0a1020), #070b16 75%);
  border: 1px solid color-mix(in srgb, var(--acc) 55%, transparent);
  box-shadow: inset 0 0 0 1px rgba(5,7,13,.6), 0 0 0 3px color-mix(in srgb, var(--acc) 10%, transparent); }
.vp-portrait img { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; image-rendering: crisp-edges; }
.vp-portrait::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,.1) 0 1px, transparent 1px 3px), linear-gradient(0deg, rgba(0,0,0,.3), rgba(0,0,0,0) 30%); }
.vp-initial { position: absolute; inset: 0; display: grid; place-items: center; font: 800 calc(var(--ps, 80px) * .5)/1 var(--vp-font-display);
  color: var(--acc); text-shadow: 0 0 8px color-mix(in srgb, var(--acc) 55%, transparent);
  background: repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 2px, transparent 2px 7px); }
.vp-portrait.is-ko img { filter: grayscale(1) brightness(.55); }

/* --- generic text button (screens, title) */
.vp-scroll { overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: rgba(140,214,255,.35) transparent; }
.vp-scroll::-webkit-scrollbar { width: 6px; }
.vp-scroll::-webkit-scrollbar-thumb { background: rgba(140,214,255,.3); border-radius: 3px; }

/* --- keyboard / gamepad / touch reference table (menu + title) */
.vp-ctl { width: 100%; border-collapse: collapse; font-size: 14px; }
.vp-ctl th { text-align: left; padding: 8px 10px; font: 600 13px var(--vp-font-ui); letter-spacing: .24em; text-transform: uppercase; color: var(--vp-ink-faint); border-bottom: 1px solid var(--vp-line-dim); }
.vp-ctl td { padding: 9px 10px; border-bottom: 1px solid rgba(140,214,255,.08); color: var(--vp-ink); vertical-align: middle; }
.vp-ctl td:first-child { color: var(--vp-ink-dim); white-space: nowrap; }
.vp-ctl td.vp-ctl-cur, .vp-ctl th.vp-ctl-cur { background: rgba(255,197,96,.06); }
.vp-ctl th.vp-ctl-cur { color: var(--vp-amber); }
.vp-ctl .vp-glyphs { flex-wrap: wrap; }
.vp-ctl .vp-or { color: var(--vp-ink-faint); font-size: 13px; margin: 0 2px; }
@media (max-width: 640px) {
  .vp-ctl thead { display: none; }
  .vp-ctl, .vp-ctl tbody, .vp-ctl tr, .vp-ctl td { display: block; width: auto; }
  .vp-ctl tr { padding: 10px 0; border-bottom: 1px solid rgba(140,214,255,.1); }
  .vp-ctl td { border: 0; padding: 3px 4px; display: flex; gap: 10px; align-items: center; }
  .vp-ctl td:first-child { font: 600 13px var(--vp-font-ui); color: var(--vp-ink); letter-spacing: .08em; padding-bottom: 6px; }
  .vp-ctl td[data-dev]::before { content: attr(data-dev); flex: 0 0 74px; font: 600 13px var(--vp-font-ui); letter-spacing: .16em; text-transform: uppercase; color: var(--vp-ink-faint); }
}
`;

export function installBaseCSS() {
  injectCSS('vp-ui-base', BASE_CSS);
}

// ------------------------------------------------------------------ fallback data
// Used only when the integrator does not pass the real tables (battle/data.js ITEMS / PARTY_DEFS).

export const FALLBACK_ITEMS = {
  medigel: { id: 'medigel', name: 'Medi-Gel', desc: 'Sealant gel. Restores 200 HP to one ally.', target: 'ally', key: false },
  ether: { id: 'ether', name: 'Ether Cell', desc: 'Charged power cell. Restores 50 EP to one ally.', target: 'ally', key: false },
  revive: { id: 'revive', name: 'Revive Kit', desc: 'Emergency restart. Revives a downed ally with half HP.', target: 'koAlly', key: false },
  keycard: { id: 'keycard', name: 'Bridge Keycard', desc: 'Command-level access. Opens the Observation Bridge.', target: null, key: true },
};

export const MEMBER_ACCENT = { kade: '#ffb54a', nyx: '#3fd6d2', orion: '#b98cff', sera: '#ff7cbd', bolt: '#7fe3ff', halcyon: '#6fe9ff' };

export const TYPE_LABEL = {
  blade: 'Blade', lance: 'Lance', rifle: 'Rifle', gauntlet: 'Gauntlet',
  thermal: 'Thermal', cryo: 'Cryo', volt: 'Volt', photon: 'Photon', void: 'Void',
};

// ------------------------------------------------------------------ controller glyphs

const KEY_LABEL = {
  confirm: ['Enter'], cancel: ['Esc'], menu: ['Tab'], boostUp: ['E'], boostDown: ['Q'], run: ['Shift'], mute: ['M'],
  up: ['↑'], down: ['↓'], left: ['←'], right: ['→'], tabs: ['Q', 'E'], move: ['↑↓'], adjust: ['←→'],
};
const PAD_LABEL = {
  confirm: ['A'], cancel: ['B'], menu: ['Start'], boostUp: ['RB'], boostDown: ['LB'], run: ['X'], mute: [],
  up: ['↑'], down: ['↓'], left: ['←'], right: ['→'], tabs: ['LB', 'RB'], move: ['↑↓'], adjust: ['←→'],
};
const TOUCH_LABEL = { confirm: ['A'], cancel: ['B'], boostUp: ['+'], boostDown: ['−'] };

/** Inline glyph element(s) for an action on a device: keycap, pad button, or touch button. */
export function glyph(action, device = 'keyboard') {
  const wrap = el('span', { class: 'vp-glyphs' });
  if (device === 'gamepad') {
    for (const l of PAD_LABEL[action] || []) {
      const face = { A: 'a', B: 'b', X: 'x', Y: 'y' }[l];
      wrap.appendChild(el('span', { class: `vp-padbtn ${face || 'wide'}`, text: l }));
    }
  } else if (device === 'touch') {
    const l = TOUCH_LABEL[action];
    if (l) wrap.appendChild(el('span', { class: 'vp-tapbtn', text: l[0] }));
  } else {
    for (const l of KEY_LABEL[action] || []) wrap.appendChild(el('span', { class: 'vp-key', text: l }));
  }
  return wrap;
}

/** Rows for the controls reference (DESIGN.md "Controls"). */
export const CONTROL_ROWS = [
  ['Move / navigate', [['Arrows'], ['W', 'A', 'S', 'D']], [['D-pad'], ['L-stick']], 'Virtual stick'],
  ['Confirm / interact', [['Enter'], ['Space'], ['Z']], [['A']], 'A button / tap'],
  ['Cancel / back', [['Esc'], ['X'], ['Bksp']], [['B']], 'B button'],
  ['Menu (field)', [['Tab'], ['C']], [['Start'], ['Y']], 'Menu button'],
  ['Boost + / − (battle)', [['E'], ['Q'], [']'], ['[']], [['RB'], ['LB']], '+ / − buttons'],
  ['Run (field)', [['Shift']], [['X']], 'Push stick fully'],
  ['Mute', [['M']], [], 'Sound button'],
];

/** Controls reference table; `device` highlights the matching column. */
export function controlsTable(device = 'keyboard') {
  const cur = (d) => (d === device ? 'vp-ctl-cur' : null);
  const keys = (groups, pad) => {
    const w = el('span', { class: 'vp-glyphs' });
    if (!groups.length) w.appendChild(el('span', { class: 'vp-or', text: '—' }));
    groups.forEach((g, i) => {
      if (i) w.appendChild(el('span', { class: 'vp-or', text: '/' }));
      for (const k of g) {
        const face = pad && { A: 'a', B: 'b', X: 'x', Y: 'y' }[k];
        w.appendChild(el('span', { class: pad ? `vp-padbtn ${face || 'wide'}` : 'vp-key', text: k }));
      }
    });
    return w;
  };
  const head = el('thead', {}, el('tr', {}, [
    el('th', { text: 'Action' }), el('th', { class: cur('keyboard'), text: 'Keyboard' }),
    el('th', { class: cur('gamepad'), text: 'Gamepad' }), el('th', { class: cur('touch'), text: 'Touch' }),
  ]));
  const body = el('tbody', {}, CONTROL_ROWS.map(([name, kb, pad, touch]) => el('tr', {}, [
    el('td', { text: name }),
    el('td', { class: cur('keyboard'), 'data-dev': 'Keys' }, keys(kb, false)),
    el('td', { class: cur('gamepad'), 'data-dev': 'Pad' }, keys(pad, true)),
    el('td', { class: cur('touch'), 'data-dev': 'Touch', text: touch }),
  ])));
  return el('table', { class: 'vp-ctl' }, [head, body]);
}

// ------------------------------------------------------------------ fallback pixel icons
// 7x7 glyph bitmaps drawn at 2x into a 16x16 canvas with a dark outline: crisp and on-style
// when no icon provider (art/icons.js) is wired.

const GLYPH_BITS = {
  blade: ['......#', '.....#.', '....#..', '.#.#...', '..#....', '.#.#...', '#......'],
  lance: ['...#...', '..###..', '...#...', '...#...', '...#...', '...#...', '...#...'],
  rifle: ['.......', '......#', '#######', '##.#...', '#......', '.......', '.......'],
  gauntlet: ['.......', '.####..', '#######', '#######', '#######', '.#####.', '..###..'],
  thermal: ['...#...', '..##...', '..###..', '.####..', '.#####.', '.##.##.', '..###..'],
  cryo: ['...#...', '#..#..#', '.#.#.#.', '..###..', '.#.#.#.', '#..#..#', '...#...'],
  volt: ['....##.', '...##..', '..##...', '.#####.', '...##..', '..##...', '.##....'],
  photon: ['...#...', '.#...#.', '..###..', '#.###.#', '..###..', '.#...#.', '...#...'],
  void: ['..###..', '.#...#.', '#..#..#', '#.#.#.#', '#..#..#', '.#...#.', '..###..'],
  unknown: ['.#####.', '#.....#', '.....#.', '...##..', '...#...', '.......', '...#...'],
  medigel: ['..###..', '..###..', '#######', '#######', '#######', '..###..', '..###..'],
  ether: ['...#...', '..###..', '.#####.', '.#####.', '#######', '#######', '.#####.'],
  revive: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
  keycard: ['.......', '#######', '#.....#', '#.##..#', '#.....#', '#######', '.......'],
  talk: ['.#####.', '#######', '#######', '#######', '.#####.', '..#....', '.#.....'],
  inspect: ['.###...', '#...#..', '#...#..', '#...#..', '.###...', '....##.', '.....##'],
  open: ['...#...', '..###..', '.#####.', '...#...', '...#...', '#######', '#######'],
  save: ['#######', '#.....#', '#.###.#', '#.###.#', '#.....#', '#..#..#', '#######'],
  shield: ['#######', '#######', '#######', '.#####.', '.#####.', '..###..', '...#...'],
  dot: ['.......', '...#...', '..###..', '.#####.', '..###..', '...#...', '.......'],
};
const GLYPH_COLOR = {
  ...DAMAGE_COLORS, unknown: '#9fb2cc', medigel: '#5dff9c', ether: '#69b9ff', revive: '#ff7cbd', keycard: '#ffc560',
  talk: '#7fe3ff', inspect: '#7fe3ff', open: '#ffc560', save: '#5dff9c', shield: '#b9d0ff', dot: '#9fb2cc',
};
const fallbackIconCache = new Map();

export function fallbackIconURL(name) {
  let url = fallbackIconCache.get(name);
  if (url) return url;
  const bits = GLYPH_BITS[name] || GLYPH_BITS.dot;
  const color = GLYPH_COLOR[name] || GLYPH_COLOR.dot;
  const c = document.createElement('canvas');
  c.width = c.height = 32;                       // 16 px icon at 2x
  const g = c.getContext('2d');
  const on = (x, y) => y >= 0 && y < 7 && x >= 0 && x < 7 && bits[y][x] === '#';
  // outline: every on-pixel paints a dark 4x4 block (1 px border at 16 px scale)
  g.fillStyle = '#0b0e17';
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (on(x, y)) g.fillRect(x * 4, y * 4, 8, 8);
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      if (!on(x, y)) continue;
      g.fillStyle = color;
      g.fillRect(2 + x * 4, 2 + y * 4, 4, 4);
      if (!on(x, y - 1)) { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(2 + x * 4, 2 + y * 4, 4, 2); }
      else if (!on(x, y + 1)) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(2 + x * 4, 4 + y * 4, 4, 2); }
    }
  }
  url = c.toDataURL();
  fallbackIconCache.set(name, url);
  return url;
}

// ------------------------------------------------------------------ misc helpers

const urlCache = new WeakMap();

/** canvas | dataURL | URL -> URL string usable in <img> (canvases are converted once and cached). */
export function toURL(src) {
  if (!src) return null;
  if (typeof src === 'string') return src;
  if (typeof HTMLCanvasElement !== 'undefined' && src instanceof HTMLCanvasElement) {
    let u = urlCache.get(src);
    if (!u) { u = src.toDataURL(); urlCache.set(src, u); }
    return u;
  }
  if (src.src) return src.src;                    // HTMLImageElement
  return null;
}

/** true when a string looks like an image URL rather than an id. */
export const isURL = (s) => typeof s === 'string' && (/^(data:|blob:|https?:)/.test(s) || /[./]/.test(s));

export function formatTime(sec = 0) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(r)}`;
}

export const fmtNum = (n) => Math.round(n || 0).toLocaleString('en-US');

/** Make an element respond to pointer: hover selects (mouse), click/tap selects + activates. */
export function bindPointer(node, { onHover, onActivate }) {
  node.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && onHover) onHover(e); });
  node.addEventListener('click', (e) => { e.stopPropagation(); if (onActivate) onActivate(e); });
}

/** Split "Find the *Bridge Keycard*." into [{ t, em }] runs; *...* marks amber emphasis. */
export function parseEmphasis(text) {
  const parts = String(text ?? '').split('*');
  const runs = [];
  for (let i = 0; i < parts.length; i++) if (parts[i]) runs.push({ t: parts[i], em: i % 2 === 1 });
  return runs;
}

/** DocumentFragment for a short string with *emphasis* runs (toasts, notices). */
export function richText(text) {
  const f = document.createDocumentFragment();
  for (const r of parseEmphasis(text)) f.appendChild(r.em ? el('span', { class: 'vp-em', text: r.t }) : document.createTextNode(r.t));
  return f;
}
