// Starchart: the holographic travel map of the Tethys system (DOM + inline SVG). Tethys is a banded
// disc with rings; destinations are glowing nodes on orbit arcs with their names; locked ones are
// dimmed with a lock icon and their lockedText; new ones carry a NEW tag; the Halcyon marker sits
// on the current node, and the Moth's route line animates to the selection. A detail panel shows
// the subtitle, description and `warn` in amber. Cyan on deep navy with a scanline overlay.
//
//   ui.starchart.open({ destinations: [{ id, name, subtitle, desc, locked, lockedText, warn, current, isNew }] })
//     -> Promise<destId | null>     (null: closed without choosing)
// Keys: arrows cycle the nodes, Confirm sets course, Cancel closes. Taps: a node selects, the
// selected node (or "Set course") confirms.

import { el, injectCSS } from '../core/util.js';
import { bindPointer, onTap, glyph } from './theme.js';

const NS = 'http://www.w3.org/2000/svg';
const VW = 1000, VH = 700;
const T = { x: 400, y: 360, r: 112 };                 // Tethys in chart units

// Orbit slots in chart units: (ellipse around Tethys, angle in degrees). Known ids get story-true
// places (Driftmarket in the rings, Ione a moon far out); others fill the outer orbit in order.
const ORBITS = { ship: { rx: 330, ry: 196 }, ring: { rx: 214, ry: 50 }, outer: { rx: 440, ry: 280 } };
const PLACES = {
  halcyon: ['ship', -15], arboretum: ['ship', 25], spire: ['ship', 68], heart: ['ship', -68],
  driftmarket: ['ring', 196], ione: ['outer', -128],
};
const RING_TILT = -11;

function pos(orbit, deg) {
  const o = ORBITS[orbit], a = (deg * Math.PI) / 180;
  let x = Math.cos(a) * o.rx, y = Math.sin(a) * o.ry;
  if (orbit === 'ring') {
    const t = (RING_TILT * Math.PI) / 180;
    [x, y] = [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)];
  }
  return { x: T.x + x, y: T.y + y };
}

const svg = (tag, attrs = {}, kids = []) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const c of kids) n.appendChild(c);
  return n;
};

const CSS = `
.vp-star { z-index: 42; opacity: 0; visibility: hidden; transition: opacity .3s var(--vp-ease-out), visibility 0s linear .3s; overflow: hidden;
  background: radial-gradient(90% 80% at 40% 50%, #0b1a36 0%, #060d1f 55%, #03060f 100%); }
.vp-star.is-open { opacity: 1; visibility: visible; transition: opacity .3s var(--vp-ease-out); }
.vp-star::after { content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 3;
  background: repeating-linear-gradient(0deg, rgba(127,227,255,.035) 0 1px, transparent 1px 3px), radial-gradient(120% 100% at 50% 50%, transparent 60%, rgba(0,0,0,.45)); }
.vp-star-grid { position: absolute; inset: 0; pointer-events: none; opacity: .5;
  background: linear-gradient(rgba(127,227,255,.05) 1px, transparent 1px) 0 0 / 48px 48px, linear-gradient(90deg, rgba(127,227,255,.05) 1px, transparent 1px) 0 0 / 48px 48px; }
.vp-star-head { position: absolute; left: calc(26px + var(--vp-safe-left)); top: calc(20px + var(--vp-safe-top)); right: calc(20px + var(--vp-safe-right)); display: flex; align-items: center; gap: 16px; z-index: 4; }
.vp-star-head .vp-menu-kicker { color: var(--vp-cyan); }
.vp-star-title { margin-top: 6px; font: 700 28px/1 var(--vp-font-display); letter-spacing: .3em; color: #dff6ff; text-shadow: 0 0 16px rgba(127,227,255,.55); }
.vp-star-head .vp-menu-close { margin-left: auto; }
.vp-star-main { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 380px); gap: 10px;
  padding: calc(86px + var(--vp-safe-top)) calc(24px + var(--vp-safe-right)) calc(56px + var(--vp-safe-bottom)) calc(16px + var(--vp-safe-left)); box-sizing: border-box; }
.vp-star-chart { position: relative; min-width: 0; min-height: 0; display: grid; place-items: center; }
.vp-star-box { position: relative; width: min(100%, calc((100vh - 150px) * 10 / 7)); aspect-ratio: 10 / 7; max-height: 100%; }
.vp-star-box svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.vp-star-route { fill: none; stroke: var(--vp-amber); stroke-width: 2.4; stroke-dasharray: 10 9; filter: drop-shadow(0 0 4px rgba(255,197,96,.8)); animation: vp-star-dash 1.2s linear infinite; }
.vp-star-route.is-draw { animation: vp-star-draw .7s var(--vp-ease-out) both, vp-star-dash 1.2s linear .7s infinite; }
@keyframes vp-star-dash { to { stroke-dashoffset: -38; } }
@keyframes vp-star-draw { from { stroke-dasharray: 0 2000; } to { stroke-dasharray: 10 9; } }
.vp-star-moth { fill: #fff3cf; filter: drop-shadow(0 0 6px var(--vp-amber)); }
.vp-star-node { position: absolute; width: 0; height: 0; z-index: 2; cursor: pointer; }
.vp-star-dot { position: absolute; left: -11px; top: -11px; width: 22px; height: 22px; border-radius: 50%;
  background: radial-gradient(circle, #e9fbff 0 22%, #6fe4ff 30%, rgba(30,140,220,.35) 62%, transparent 70%); box-shadow: 0 0 14px rgba(127,227,255,.75); }
.vp-star-node::before { content: ''; position: absolute; left: -20px; top: -20px; width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(127,227,255,.35); }
.vp-star-lbl { position: absolute; left: 22px; top: -18px; white-space: nowrap; pointer-events: none; }
.vp-star-lbl b { display: block; font: 700 15px/1 var(--vp-font-display); letter-spacing: .22em; text-transform: uppercase; color: #dff6ff; text-shadow: 0 0 8px rgba(127,227,255,.6), 0 1px 0 #000; }
.vp-star-lbl small { display: block; margin-top: 5px; font: 600 11px/1 var(--vp-font-ui); letter-spacing: .24em; text-transform: uppercase; color: rgba(160,220,255,.7); }
.vp-star-node.is-left .vp-star-lbl { left: auto; right: 22px; text-align: right; }
.vp-star-node.is-below .vp-star-lbl, .vp-star-node.is-above .vp-star-lbl { left: 0; top: 24px; transform: translateX(-50%); text-align: center; }
.vp-star-node.is-above .vp-star-lbl { top: auto; bottom: 24px; }
.vp-star-new { display: inline-block; margin-left: 8px; padding: 2px 5px; vertical-align: 2px; background: var(--vp-amber); color: #1a1206; font: 800 10px/1 var(--vp-font-display); letter-spacing: .14em; box-shadow: 0 0 8px rgba(255,197,96,.8); }
.vp-star-node.is-locked .vp-star-dot { background: radial-gradient(circle, #5d6a80 0 26%, rgba(60,80,110,.4) 60%, transparent 70%); box-shadow: none; }
.vp-star-node.is-locked::before { border-color: rgba(127,160,200,.2); border-style: dashed; }
.vp-star-node.is-locked .vp-star-lbl b { color: #7b8aa3; text-shadow: none; }
.vp-star-node.is-locked .vp-star-lbl small { color: #66758c; }
.vp-star-lock { position: absolute; left: -8px; top: -8px; width: 16px; height: 16px; }
.vp-star-node.is-cur::before { border-color: rgba(255,255,255,.6); }
.vp-star-ship { position: absolute; left: -16px; top: -38px; width: 32px; height: 32px; filter: drop-shadow(0 0 6px rgba(127,227,255,.8)); animation: vp-star-bob 2.4s ease-in-out infinite; }
@keyframes vp-star-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -3px; } }
.vp-star-node.is-sel::after { content: ''; position: absolute; left: -26px; top: -26px; width: 52px; height: 52px; border-radius: 50%; border: 2px solid var(--vp-amber);
  box-shadow: 0 0 14px rgba(255,197,96,.6), inset 0 0 10px rgba(255,197,96,.3); animation: vp-star-sel 1.6s ease-in-out infinite; }
.vp-star-node.is-sel .vp-star-lbl b { color: var(--vp-amber); text-shadow: 0 0 10px rgba(255,197,96,.7), 0 1px 0 #000; }
@keyframes vp-star-sel { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
.vp-star-detail { align-self: center; padding: 22px 22px 16px; display: flex; flex-direction: column; gap: 12px; z-index: 4; }
.vp-star-detail .k { color: var(--vp-cyan); }
.vp-star-detail h2 { margin: 0; font: 800 28px/1.05 var(--vp-font-display); letter-spacing: .18em; text-transform: uppercase; color: #f4fbff; }
.vp-star-detail .sub { font: 600 13px/1 var(--vp-font-ui); letter-spacing: .26em; text-transform: uppercase; color: rgba(160,220,255,.85); }
.vp-star-detail p { margin: 0; font: 400 15px/1.55 var(--vp-font-ui); color: var(--vp-ink-dim); }
.vp-star-warn { display: flex; gap: 10px; padding: 10px 12px; border-left: 2px solid var(--vp-amber); background: rgba(255,197,96,.08); font: 500 14px/1.45 var(--vp-font-ui); color: #ffd9a0; }
.vp-star-warn::before { content: '!'; flex: none; display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: var(--vp-amber); color: #1a1206; font: 800 12px/1 var(--vp-font-display); }
.vp-star-lockt { display: flex; align-items: center; gap: 10px; font: 600 14px var(--vp-font-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--vp-ink-faint); }
.vp-star-go { margin-top: 6px; border-top: 1px solid var(--vp-line-dim); padding-top: 6px; }
.vp-star-go .vp-row { min-height: 48px; font: 600 15px var(--vp-font-ui); letter-spacing: .24em; text-transform: uppercase; }
.vp-star-foot { position: absolute; left: calc(26px + var(--vp-safe-left)); bottom: calc(16px + var(--vp-safe-bottom)); display: flex; gap: 22px; z-index: 4; }
.vp-star-foot.is-touch { display: none; }
@media (max-width: 760px) {
  .vp-star-main { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; padding: calc(70px + var(--vp-safe-top)) 8px calc(10px + var(--vp-safe-bottom)); gap: 6px; }
  .vp-star-title { font-size: 20px; letter-spacing: .22em; }
  .vp-star-head { left: 16px; top: calc(14px + var(--vp-safe-top)); right: 10px; }
  .vp-star-box { width: 100%; }
  .vp-star-lbl b { font-size: 11px; letter-spacing: .12em; }
  .vp-star-lbl small { display: none; }
  .vp-star-lbl { left: 16px; top: -7px; }
  .vp-star-node.is-left .vp-star-lbl { right: 16px; }
  .vp-star-node.is-below .vp-star-lbl { top: 17px; }
  .vp-star-node.is-above .vp-star-lbl { bottom: 17px; }
  .vp-star-foot { display: none; }
  .vp-star-dot { left: -8px; top: -8px; width: 16px; height: 16px; }
  .vp-star-node::before { left: -14px; top: -14px; width: 28px; height: 28px; }
  .vp-star-node.is-sel::after { left: -18px; top: -18px; width: 36px; height: 36px; }
  .vp-star-ship { width: 24px; height: 24px; left: -12px; top: -30px; }
  .vp-star-detail { padding: 14px 16px 10px; gap: 8px; }
  .vp-star-detail h2 { font-size: 21px; }
  .vp-star-detail p { font-size: 14px; }
}
`;

export class Starchart {
  constructor(ui) {
    this.ui = ui;
    injectCSS('vp-starchart', CSS);
    this.isOpen = false;
    this._sel = 0;
    this.box = el('div', { class: 'vp-star-box' });
    this.detail = el('div', { class: 'vp-panel vp-rich vp-star-detail' });
    this.foot = el('div', { class: 'vp-star-foot' });
    const close = el('div', { class: 'vp-menu-close', role: 'button', 'aria-label': 'Close starchart' }, [el('i')]);
    onTap(close, () => this._done(null));
    this.root = el('div', { class: 'vp-layer vp-star', role: 'dialog', 'aria-label': 'Starchart' }, [
      el('div', { class: 'vp-star-grid' }),
      el('div', { class: 'vp-star-head' }, [el('div', {}, [el('div', { class: 'vp-cap vp-menu-kicker', text: 'Tethys system · Moth navigation' }), el('div', { class: 'vp-star-title', text: 'STARCHART' })]), close]),
      el('div', { class: 'vp-star-main' }, [el('div', { class: 'vp-star-chart' }, [this.box]), this.detail]),
      this.foot,
    ]);
    ui.root.appendChild(this.root);
    addEventListener('resize', () => { if (this.isOpen) this._fitLabels(); });
  }

  open({ destinations = [] } = {}) {
    if (this.isOpen) this._done(null);
    this.dests = destinations;
    const pick = destinations.findIndex((d) => d.isNew && !d.locked && !d.current);
    const free = destinations.findIndex((d) => !d.locked && !d.current);
    this._sel = Math.max(0, pick >= 0 ? pick : free >= 0 ? free : destinations.findIndex((d) => d.current));
    this.isOpen = true;
    this.ui._ctxPush('starchart', 'menu');
    this.ui.sfx('menuOpen');
    this._build();
    this._device = null;
    this.root.classList.add('is-open', 'is-live');
    this._fitLabels();
    document.fonts?.ready.then(() => { if (this.isOpen) this._fitLabels(); });
    return new Promise((resolve) => { this._resolve = resolve; });
  }

  update(dt, focused) {
    if (!this.isOpen) return;
    const dev = this.ui.input.lastDevice;
    if (dev !== this._device) { this._device = dev; this._hints(); }
    if (this._moth) this._flyMoth(dt);
    if (!focused) return;
    const inp = this.ui.input;
    const n = this.dests.length;
    let d = 0;
    for (const [a, s] of [['up', -1], ['left', -1], ['down', 1], ['right', 1]]) if (inp.repeat(a)) { inp.consume(a); d = s; }
    if (d && n) this._select((this._sel + d + n) % n, true);
    if (inp.pressed('confirm')) { inp.consume('confirm'); this._confirm(); } else if (inp.pressed('cancel') || inp.pressed('menu')) { inp.consume('cancel'); inp.consume('menu'); this.ui.sfx('cancel'); this._done(null); }
  }

  // ------------------------------------------------------------------ chart

  _place(d, i) {
    const p = PLACES[d.id];
    if (p) return pos(p[0], p[1]);
    return pos('outer', 110 + i * 32);                // unknown ids: spread along the outer orbit
  }

  _build() {
    const defs = svg('defs', {}, [
      svg('linearGradient', { id: 'vp-tethys-bands', x1: '0', y1: '0', x2: '0.18', y2: '1' }, [
        ['0', '#f6d7a2'], ['.14', '#e7a964'], ['.22', '#f3d9ad'], ['.34', '#c9783f'], ['.43', '#efc890'], ['.52', '#b9652f'],
        ['.6', '#f0cf9c'], ['.7', '#d48a4c'], ['.8', '#f4dcb2'], ['.9', '#b46032'], ['1', '#e3b07a'],
      ].map(([o, c]) => svg('stop', { offset: o, 'stop-color': c }))),
      svg('radialGradient', { id: 'vp-tethys-shade', cx: '.36', cy: '.34', r: '.78' }, [
        svg('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '.18' }), svg('stop', { offset: '.55', 'stop-color': '#000', 'stop-opacity': '0' }),
        svg('stop', { offset: '1', 'stop-color': '#02040c', 'stop-opacity': '.82' }),
      ]),
      svg('radialGradient', { id: 'vp-tethys-glow', cx: '.5', cy: '.5', r: '.5' }, [
        svg('stop', { offset: '.7', 'stop-color': '#ffb066', 'stop-opacity': '.22' }), svg('stop', { offset: '1', 'stop-color': '#ffb066', 'stop-opacity': '0' }),
      ]),
      svg('clipPath', { id: 'vp-ring-front' }, [svg('rect', { x: 0, y: T.y, width: VW, height: VH })]),
    ]);
    const orbit = (o, dash) => svg('ellipse', { cx: T.x, cy: T.y, rx: o.rx, ry: o.ry, fill: 'none', stroke: 'rgba(127,227,255,.22)', 'stroke-width': 1.2, 'stroke-dasharray': dash });
    const ring = (front) => svg('g', { transform: `rotate(${RING_TILT} ${T.x} ${T.y})`, 'clip-path': front ? 'url(#vp-ring-front)' : null }, [
      svg('ellipse', { cx: T.x, cy: T.y, rx: 236, ry: 56, fill: 'none', stroke: 'rgba(255,220,170,.28)', 'stroke-width': 9 }),
      svg('ellipse', { cx: T.x, cy: T.y, rx: 206, ry: 47, fill: 'none', stroke: 'rgba(255,225,185,.5)', 'stroke-width': 14 }),
      svg('ellipse', { cx: T.x, cy: T.y, rx: 178, ry: 40, fill: 'none', stroke: 'rgba(255,215,160,.22)', 'stroke-width': 6 }),
    ]);
    const stars = svg('g', {}, Array.from({ length: 70 }, (_, k) => {
      const x = (k * 137.5) % VW, y = (k * 251.3 + 37) % VH;
      return svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: k % 9 === 0 ? 1.6 : 0.9, fill: '#cfe9ff', opacity: (0.25 + ((k * 7) % 10) / 16).toFixed(2) });
    }));
    const label = svg('text', { x: T.x, y: T.y + T.r + 34, 'text-anchor': 'middle', fill: 'rgba(255,214,160,.75)', style: 'font: 600 13px var(--vp-font-ui); letter-spacing: .5em' });
    label.textContent = 'TETHYS';
    this.route = svg('path', { class: 'vp-star-route', d: '' });
    this.mothDot = svg('circle', { class: 'vp-star-moth', r: 4, cx: -50, cy: -50 });
    const map = svg('svg', { viewBox: `0 0 ${VW} ${VH}`, 'aria-hidden': 'true' }, [
      defs, stars, orbit(ORBITS.outer, '2 8'), orbit(ORBITS.ship, '6 7'), ring(false),
      svg('circle', { cx: T.x, cy: T.y, r: T.r * 1.18, fill: 'url(#vp-tethys-glow)' }),
      svg('circle', { cx: T.x, cy: T.y, r: T.r, fill: 'url(#vp-tethys-bands)' }),
      svg('circle', { cx: T.x, cy: T.y, r: T.r, fill: 'url(#vp-tethys-shade)' }),
      ring(true),
      label, this.route, this.mothDot,
    ]);
    // Ione as a small icy moon behind its node
    const ione = this.dests.find((d) => d.id === 'ione');
    if (ione) { const p = this._place(ione, 0); map.insertBefore(svg('circle', { cx: p.x, cy: p.y, r: 15, fill: '#cfe3f0', opacity: ione.locked ? 0.35 : 0.9, stroke: 'rgba(127,227,255,.5)' }), this.route); }

    this._nodes = this.dests.map((d, i) => {
      const p = this._place(d, i);
      const node = el('div', { class: `vp-star-node${d.locked ? ' is-locked' : ''}${d.current ? ' is-cur' : ''}`, role: 'button', 'aria-label': d.name }, [
        el('i', { class: 'vp-star-dot' }),
        d.locked ? this.ui.iconEl('lock', 16, 'vp-star-lock') : null,
        d.current ? this.ui.iconEl('travel', 32, 'vp-star-ship') : null,
        el('div', { class: 'vp-star-lbl' }, [
          el('b', {}, [d.name, d.isNew && !d.locked ? el('span', { class: 'vp-star-new', text: 'NEW' }) : null]),
          el('small', { text: d.locked ? (d.lockedText || 'Locked') : d.current ? 'You are here' : (d.subtitle || '') }),
        ]),
      ]);
      node.style.left = `${(p.x / VW) * 100}%`;
      node.style.top = `${(p.y / VH) * 100}%`;
      node._p = p;
      bindPointer(node, {
        onHover: () => this._select(i, true),
        onActivate: () => { if (this._sel === i) this._confirm(); else this._select(i, true); },
      });
      return node;
    });
    this.box.replaceChildren(map, ...this._nodes);
    this._select(this._sel, false);
  }

  /** Put each label where it fits best (right of its node, else left, above, below): inside the
   *  chart, off Tethys (or least over it), clear of the other nodes and of the labels already placed. */
  _fitLabels() {
    const box = this.box.getBoundingClientRect();
    const area = this.box.parentNode.getBoundingClientRect();
    if (!box.width) return;
    const k = box.width / VW, rr = T.r * k + 2;
    const cx = box.left + T.x * k, cy = box.top + T.y * k;
    const overlap = (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
    const planetDepth = (r) => Math.max(0, rr - Math.hypot(Math.max(r.left, Math.min(cx, r.right)) - cx, Math.max(r.top, Math.min(cy, r.bottom)) - cy));
    const dots = this._nodes.map((n) => n.querySelector('.vp-star-dot').getBoundingClientRect());
    const placed = [];
    const sides = ['', 'is-left', 'is-above', 'is-below'];
    this._nodes.forEach((n, i) => {
      const lbl = n.querySelector('.vp-star-lbl');
      const place = (side) => {
        n.classList.remove(...sides.filter(Boolean));
        if (side) n.classList.add(side);
        return lbl.getBoundingClientRect();
      };
      const cost = (r) => (r.left < area.left + 4 || r.right > area.right - 4 ? 1000 : 0) + (planetDepth(r) ? 100 + planetDepth(r) : 0)
        + 10 * (dots.filter((d, j) => j !== i && overlap(r, d)).length + placed.filter((p) => overlap(r, p)).length);
      let best = '', min = Infinity;
      for (const side of sides) {
        const c = cost(place(side));
        if (c < min) { min = c; best = side; }
        if (!c) break;
      }
      placed.push(place(best));
    });
  }

  _select(i, sound) {
    if (sound && i !== this._sel) this.ui.sfx('cursor');
    const changed = i !== this._shown;
    this._sel = i;
    this._shown = i;
    this._nodes.forEach((n, k) => n.classList.toggle('is-sel', k === i));
    const d = this.dests[i];
    if (!d) return;
    // route: a gentle arc from the current node to the selection
    const from = this._nodes.find((n, k) => this.dests[k].current);
    const to = this._nodes[i];
    if (from && to && from !== to && !d.locked) {
      const a = from._p, b = to._p;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * 0.22;
      this.route.setAttribute('d', `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`);
      this._moth = { a, c: { x: mx, y: my }, b, t: 0 };
      if (changed) { this.route.classList.remove('is-draw'); void this.route.getBoundingClientRect(); this.route.classList.add('is-draw'); }
    } else {
      this.route.setAttribute('d', '');
      this._moth = null;
      this.mothDot.setAttribute('cx', -50);
    }
    this._paintDetail(d);
  }

  _flyMoth(dt) {
    const m = this._moth;
    m.t = (m.t + dt / 2.6) % 1;
    const t = m.t, u = 1 - t;
    this.mothDot.setAttribute('cx', (u * u * m.a.x + 2 * u * t * m.c.x + t * t * m.b.x).toFixed(1));
    this.mothDot.setAttribute('cy', (u * u * m.a.y + 2 * u * t * m.c.y + t * t * m.b.y).toFixed(1));
  }

  _paintDetail(d) {
    const go = el('div', { class: `vp-row is-sel${d.locked || d.current ? ' is-dim' : ''}`, role: 'button', text: d.current ? 'You are here' : d.locked ? 'Locked' : 'Set course' });
    bindPointer(go, { onActivate: () => this._confirm() });
    this.detail.replaceChildren(...[
      el('div', { class: 'vp-cap k', text: d.current ? 'Current position' : 'Destination' }),
      el('h2', { text: d.name }),
      d.subtitle ? el('div', { class: 'sub', text: d.subtitle }) : null,
      d.locked ? el('div', { class: 'vp-star-lockt' }, [this.ui.iconEl('lock', 16), d.lockedText || 'Not yet charted']) : el('p', { text: d.desc || '' }),
      d.warn && !d.locked ? el('div', { class: 'vp-star-warn', text: d.warn }) : null,
      el('div', { class: 'vp-star-go' }, [go]),
    ].filter(Boolean));
  }

  _hints() {
    const dev = this.ui.input.lastDevice;
    const add = (a, l) => el('span', { class: 'vp-hint' }, [glyph(a, dev), l]);
    this.foot.classList.toggle('is-touch', dev === 'touch');
    this.foot.replaceChildren(add('move', 'Destination'), add('confirm', 'Set course'), add('cancel', 'Close'));
  }

  _confirm() {
    const d = this.dests[this._sel];
    if (!d || d.locked || d.current) {
      this.ui.sfx('error');
      const n = this._nodes[this._sel];
      if (n && n.animate) n.animate([{ translate: '0 0' }, { translate: '-4px 0' }, { translate: '4px 0' }, { translate: '0 0' }], { duration: 220 });
      return;
    }
    this.ui.sfx('confirm');
    this._done(d.id);
  }

  _done(value) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._moth = null;
    this.root.classList.remove('is-open', 'is-live');
    this.ui._ctxPop('starchart');
    const r = this._resolve;
    this._resolve = null;
    if (r) r(value);
  }
}
