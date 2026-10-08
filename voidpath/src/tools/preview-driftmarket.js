// Preview: the Driftmarket cast (C2). Every Ringborn look registered by content/driftmarket/chars.js
// on one page: field frames (idle down / up / side, a walk frame) and portraits (Ruse with her five
// expressions), nearest-neighbour on a lantern-dark backdrop.
// URL params: ?scale=4 (field) &pscale=4 (portraits)
import * as C from '../art/characters.js';
import { injectCSS, el } from '../core/util.js';
import { CHARACTERS } from '../content/driftmarket/chars.js';

const params = new URLSearchParams(location.search);
const SCALE = Number(params.get('scale') || 4);
const PSCALE = Number(params.get('pscale') || 4);
for (const [id, def] of Object.entries(CHARACTERS)) C.registerCharacter(id, def);

injectCSS('preview-driftmarket', `
  html, body { overflow: auto !important; height: auto !important; touch-action: auto; user-select: text; }
  #app { position: static !important; overflow: visible !important; background: #140d0a; min-height: 100vh; }
  #view { display: none; }
  #ui-root { position: static !important; pointer-events: auto; padding: 16px 20px 40px; }
  .pd-h1 { font: 700 20px var(--vp-font-display); letter-spacing: .3em; color: var(--vp-amber); margin: 0 0 12px; }
  .pd-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; margin: 4px 0 14px; }
  .pd-cell { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .pd-cell canvas { image-rendering: pixelated; background: #2a1810; border: 1px solid #4a2c1c; display: block; }
  .pd-lab { font: 11px var(--vp-font-pixel); color: var(--vp-ink-dim); }
  .pd-name { font: 700 13px var(--vp-font-display); letter-spacing: .2em; color: var(--vp-ink); width: 100%; margin-top: 4px; }
`);
document.getElementById('vp-boot')?.remove();
const root = document.getElementById('ui-root');
root.append(el('h1', { class: 'pd-h1', text: 'DRIFTMARKET / THE RINGBORN' }));

function cell(src, sx, sy, w, h, scale, label) {
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = h * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, sx, sy, w, h, 0, 0, w * scale, h * scale);
  return el('div', { class: 'pd-cell' }, [c, el('span', { class: 'pd-lab', text: label })]);
}

function frame(sheet, anim, k, label) {
  const i = sheet.anims[anim].frames[k % sheet.anims[anim].frames.length];
  const fw = sheet.frameW, fh = sheet.frameH;
  return cell(sheet.canvas, (i % sheet.cols) * fw, Math.floor(i / sheet.cols) * fh, fw, fh, SCALE, label);
}

function portrait(id, label) {
  const p = C.buildPortrait(id);
  return cell(p, 0, 0, p.width, p.height, PSCALE, label);
}

for (const id of Object.keys(CHARACTERS)) {
  const sheet = C.buildFieldSprite(id);
  const row = el('div', { class: 'pd-row' }, [el('div', { class: 'pd-name', text: id })]);
  row.append(frame(sheet, 'idle_down', 0, 'down'), frame(sheet, 'walk_down', 1, 'walk'), frame(sheet, 'idle_up', 0, 'up'),
    frame(sheet, 'idle_side', 0, 'side'));
  const exprs = id === 'ruse' ? ['neutral', 'smile', 'sad', 'determined', 'surprised'] : ['neutral'];
  for (const x of exprs) row.append(portrait(`${id}:${x}`, x));
  root.append(row);
}

window.__PREVIEW = { ready: true };
