// Preview for the Security Spire's art (C5): every spire texture at 3x (map | emissive | normal), the
// field sheets of Commander Voss and the five cadets at 3x, their portraits in every expression, and
// Voss's two battle sheets at 2x. No three.js scene: a static review page.
//   ?only=tex | chars | boss     one section
// window.__PREVIEW = { ready } once everything is painted.
import { registerAll } from '../content/index.js';
import { buildTexture, TEXTURE_NAMES } from '../art/tiles.js';
import { buildFieldSprite, buildPortrait } from '../art/characters.js';
import { buildEnemySprite } from '../art/enemies.js';
import { injectCSS, el } from '../core/util.js';

registerAll();
window.__PREVIEW = { ready: false };
const only = new URLSearchParams(location.search).get('only');

injectCSS('preview-spire', `
  html, body { overflow: auto !important; height: auto !important; touch-action: auto !important; }
  #app { display: none; }
  #vp-boot { display: none; }
  #ps { padding: 16px 20px 40px; font: 12px var(--vp-font-pixel); color: var(--vp-ink); background: #0c0a0e; }
  #ps h2 { font: 600 16px var(--vp-font-display); letter-spacing: .14em; color: #ff5c62; margin: 22px 0 10px; text-transform: uppercase; }
  #ps .grid { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
  #ps .card { background: #16121a; border: 1px solid #3a2a30; padding: 6px; }
  #ps .lbl { margin-bottom: 4px; color: #c8c0c8; }
  #ps .row { display: flex; gap: 4px; }
  #ps canvas { display: block; image-rendering: pixelated; }
`);

/** A canvas copy of `src` scaled by k (nearest). */
function scaled(src, k) {
  const c = document.createElement('canvas');
  c.width = src.width * k;
  c.height = src.height * k;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

const canvasOf = (v) => (v && v.canvas ? v.canvas : v);
const root = el('div', { id: 'ps' });
document.body.appendChild(root);
const section = (title) => {
  root.appendChild(el('h2', {}, title));
  const g = el('div', { class: 'grid' });
  root.appendChild(g);
  return g;
};
const card = (grid, label, canvases) => {
  const c = el('div', { class: 'card' });
  c.appendChild(el('div', { class: 'lbl' }, label));
  const row = el('div', { class: 'row' });
  for (const cv of canvases) if (cv) row.appendChild(cv);
  c.appendChild(row);
  grid.appendChild(c);
};

if (!only || only === 'tex') {
  const g = section('Textures (map | emissive | normal), 3x');
  for (const name of TEXTURE_NAMES.filter((n) => n.startsWith('sp_'))) {
    const t = buildTexture(name);
    card(g, `${name} ${t.w}x${t.h}${t.frames > 1 ? ` x${t.frames}` : ''}`, [scaled(canvasOf(t.map), 3), t.emissive ? scaled(canvasOf(t.emissive), 3) : null, scaled(canvasOf(t.normal), 3)]);
  }
}
if (!only || only === 'chars') {
  const g = section('Field sheets, 3x');
  for (const id of ['voss', 'cadet_mika', 'cadet_jonah', 'cadet_priya', 'cadet_lars', 'cadet_wen']) {
    card(g, id, [scaled(canvasOf(buildFieldSprite(id).canvas), 3)]);
  }
  const p = section('Portraits, 3x');
  for (const id of ['voss', 'cadet_mika', 'cadet_jonah', 'cadet_priya', 'cadet_lars', 'cadet_wen']) {
    const exprs = id === 'voss' ? ['neutral', 'smile', 'sad', 'determined', 'surprised'] : ['neutral', 'smile', 'sad'];
    card(p, id, exprs.map((e) => scaled(canvasOf(buildPortrait(`${id}:${e}`)), 3)));
  }
}
if (!only || only === 'boss') {
  const g = section('Commander Voss, battle sheets, 2x');
  for (const art of ['voss', 'voss_overclock']) {
    const s = buildEnemySprite(art);
    card(g, `${art} ${s.frameW}x${s.frameH}`, [scaled(canvasOf(s.canvas), 2)]);
  }
}
window.__PREVIEW.ready = true;
