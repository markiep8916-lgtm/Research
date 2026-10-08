// Map tab: the current map drawn from its grid as a clean schematic (walls, floors, water, pits,
// doors, gates), visited areas only, area names, exits labelled with their destination, opened and
// unopened chests in visited areas, the leader arrow and the objective marker (objective.target on
// this map, or a marker on the exit toward it). The view fits the explored part of the map.
//
// Data: ui.hooks.mapData() -> MapData
//   { map,                          normalized MapDef: id, name, region, grid, legend, areas, exits,
//                                   chests, gates, interactables (TECH_PLAN 3.1-3.5)
//     leader: { x, z, facing },
//     objective: { text, target: { map, x, z } | { map, interactable } } | null,
//     flags,                        gameState.flags (area:, chest: flags)
//     visited?: [areaId], area?: areaId   visited areas / current area (default: from flags / leader)
//     test?(cond) -> bool,          gates, drains, locks (default: world/cond.js testCond on gameState)
//     mapName?(mapId) -> string }   exit labels (default: the exit's label, else the map id in words)
// A cell is shown when it lies within one cell of a visited area (or the area the leader stands
// in); maps without areas show whole. When the explored part does not fit at a readable scale
// (phones, big maps) the chart centres on the leader and pans by drag or the arrow keys.

import { el, injectCSS } from '../core/util.js';
import { testCond } from '../world/cond.js';

const CSS = `
.vp-map { display: flex; flex-direction: column; gap: 12px; height: 100%; min-height: 300px; }
.vp-map-hd { display: flex; align-items: flex-end; gap: 18px; padding: 0 4px; }
.vp-map-hd b { display: block; font: 700 22px/1 var(--vp-font-display); letter-spacing: .2em; text-transform: uppercase; color: #f4f9ff; }
.vp-map-hd small { display: block; margin-top: 7px; color: var(--vp-cyan); }
.vp-map-obj { margin-left: auto; max-width: 52%; display: flex; gap: 10px; align-items: center; padding: 8px 14px; font: 500 14px/1.4 var(--vp-font-ui); color: var(--vp-ink); }
.vp-map-obj i { flex: none; width: 9px; height: 9px; background: #ff63b6; transform: rotate(45deg); box-shadow: 0 0 8px #ff63b6; }
.vp-map-view { position: relative; flex: 1; min-height: 220px; overflow: hidden;
  background: radial-gradient(120% 100% at 50% 40%, rgba(20,40,74,.55), rgba(6,10,20,.75)); border: 1px solid var(--vp-line-dim); }
.vp-map-view::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,.12) 0 1px, transparent 1px 3px); }
.vp-map-view.is-pan { cursor: grab; touch-action: none; }
.vp-map-pan { position: absolute; left: 0; top: 0; will-change: transform; }
.vp-map-pan canvas { position: absolute; left: 0; top: 0; }
.vp-map-drag { position: absolute; right: 10px; bottom: 10px; z-index: 2; padding: 6px 10px; background: rgba(5,7,13,.72); border: 1px solid var(--vp-line-dim);
  font: 600 11px/1 var(--vp-font-ui); letter-spacing: .2em; text-transform: uppercase; color: var(--vp-ink-dim); pointer-events: none; }
.vp-map-you { position: absolute; width: 0; height: 0; z-index: 1; }
.vp-map-you::before { content: ''; position: absolute; left: -13px; top: -13px; width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--vp-amber);
  animation: vp-map-ping 1.8s ease-out infinite; }
.vp-map-you i { position: absolute; left: -7px; top: -8px; width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent;
  border-bottom: 15px solid var(--vp-amber); filter: drop-shadow(0 0 5px rgba(255,197,96,.9)); transform-origin: 7px 9px; }
.vp-map-goal { position: absolute; width: 0; height: 0; z-index: 1; }
.vp-map-goal i { position: absolute; left: -7px; top: -7px; width: 14px; height: 14px; background: #ff63b6; transform: rotate(45deg); box-shadow: 0 0 12px #ff63b6, 0 0 0 2px rgba(5,7,13,.8);
  animation: vp-map-goal 1.2s ease-in-out infinite; }
@keyframes vp-map-ping { from { transform: scale(.5); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
@keyframes vp-map-goal { 0%, 100% { scale: 1; } 50% { scale: 1.25; } }
.vp-map-legend { display: flex; flex-wrap: wrap; gap: 8px 22px; padding: 0 4px; font: 600 12px/1 var(--vp-font-ui); letter-spacing: .2em; text-transform: uppercase; color: var(--vp-ink-faint); }
.vp-map-legend span { display: inline-flex; align-items: center; gap: 8px; }
.vp-map-legend .k { width: 10px; height: 10px; }
@media (max-width: 760px) {
  .vp-map-hd { flex-direction: column; align-items: stretch; gap: 10px; }
  .vp-map-obj { margin-left: 0; max-width: none; }
  .vp-map-hd b { font-size: 18px; }
}
`;

const COLOR = {
  floor: 'rgba(78,150,214,.22)', wall: 'rgba(127,227,255,.13)', edge: 'rgba(176,232,255,.9)', window: 'rgba(127,227,255,.42)',
  water: 'rgba(52,128,255,.42)', pit: 'rgba(2,3,8,.95)', door: '#ffc560', locked: '#ff5d6c', gate: '#ff5d6c',
  label: 'rgba(200,226,255,.62)', here: '#ffffff', chest: '#ffc560', exit: '#ffc560', goal: '#ff63b6',
};

/** Cell type of a grid character: the legend's CellSpec, else the POC defaults. */
function specOf(map, ch) {
  const s = map.legend && map.legend[ch];
  if (s && s.t) return s;
  if (ch === ' ' || ch == null) return { t: 'void' };
  if ('#vsp'.includes(ch)) return { t: 'wall' };
  if (ch === 'W') return { t: 'window' };
  if (ch === 'D') return { t: 'door' };
  if (ch === 'L') return { t: 'door', lock: {} };
  return { t: 'floor' };
}

const SOLID = { wall: 1, window: 1, void: 1 };
const MIN_CELL = 14;          // px per cell below which the chart pans instead of shrinking
const PAN_STEP = 3;           // cells per arrow press
const words = (id) => String(id || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export class MapPage {
  constructor(menu) {
    this.menu = menu;
    this.ui = menu.ui;
    injectCSS('vp-map', CSS);
    this.interactive = true;      // the arrows pan a chart that does not fit
    this._pan = null;             // { tx, ty, W, H, CW, CH, s, node }
    addEventListener('resize', () => { if (menu.isOpen && menu.page === this) menu.repaint(); });
  }

  count() { return this._pan && (this._pan.CW > this._pan.W || this._pan.CH > this._pan.H) ? 1 : 0; }
  paint() {}
  back() { return false; }

  input(inp) {
    const p = this._pan;
    if (!p) return;
    const k = p.s * PAN_STEP;
    let dx = 0, dy = 0;
    if (inp.repeat('left')) { inp.consume('left'); dx = k; } else if (inp.repeat('right')) { inp.consume('right'); dx = -k; }
    if (inp.repeat('up')) { inp.consume('up'); dy = k; } else if (inp.repeat('down')) { inp.consume('down'); dy = -k; }
    if (dx || dy) this._move(p.tx + dx, p.ty + dy);
  }

  hints(add) {
    add('move', 'Pan');
    add('cancel', 'Back');
  }

  render(body) {
    this._pan = null;
    const d = this.ui.hook('mapData');
    if (!d || !d.map || !d.map.grid) { body.appendChild(el('div', { class: 'vp-empty', text: 'No chart of this place.' })); return; }
    const { map } = d;
    const target = d.objective && d.objective.target;
    const goalHere = target && target.map === map.id;
    const view = el('div', { class: 'vp-map-view' });
    const root = el('div', { class: 'vp-map' }, [
      el('div', { class: 'vp-map-hd' }, [
        el('div', {}, [el('b', { text: map.name || map.id }), el('small', { class: 'vp-cap', text: this._areaName(d) || map.region || '' })]),
        d.objective ? el('div', { class: 'vp-panel vp-map-obj' }, [el('i'), el('span', { text: d.objective.text || '' })]) : null,
      ]),
      view,
      el('div', { class: 'vp-map-legend' }, [
        this._key('You', 'linear-gradient(var(--vp-amber), var(--vp-amber))', 'polygon(50% 0, 100% 100%, 0 100%)'),
        d.objective ? this._key(goalHere ? 'Objective' : 'Toward objective', '#ff63b6', 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)') : null,
        this._key('Supplies', '#ffc560'),
        this._key('Exit', 'none', null, '1.5px solid #ffc560'),
      ]),
    ]);
    body.appendChild(root);
    this._draw(view, d);
    if (this._pan) this._bindDrag(view);
  }

  /** Place the chart at (tx, ty), clamped so it never drifts out of the view. */
  _move(tx, ty) {
    const p = this._pan;
    const clampAxis = (t, view, size) => (size <= view ? (view - size) / 2 : Math.max(view - size - 12, Math.min(12, t)));
    p.tx = clampAxis(tx, p.W, p.CW);
    p.ty = clampAxis(ty, p.H, p.CH);
    p.node.style.transform = `translate(${Math.round(p.tx)}px, ${Math.round(p.ty)}px)`;
  }

  _bindDrag(view) {
    if (!this.count()) return;
    view.classList.add('is-pan');
    if (this.ui.input.lastDevice === 'touch') view.appendChild(el('div', { class: 'vp-map-drag', text: 'Drag to pan' }));
    let drag = null;
    view.addEventListener('pointerdown', (e) => {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, tx: this._pan.tx, ty: this._pan.ty };
      try { view.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
    });
    view.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id) this._move(drag.tx + e.clientX - drag.x, drag.ty + e.clientY - drag.y); });
    for (const t of ['pointerup', 'pointercancel']) view.addEventListener(t, () => { drag = null; });
  }

  _key(label, bg, clip, border) {
    const k = el('i', { class: 'k' });
    k.style.background = bg;
    if (clip) k.style.clipPath = clip;
    if (border) k.style.border = border;
    return el('span', {}, [k, label]);
  }

  _here(d) {
    if (d.area) return (d.map.areas || []).find((a) => a.id === d.area) || null;
    return d.leader ? this._areaAt(d.map, d.leader.x, d.leader.z) : null;
  }

  _areaName(d) {
    const a = this._here(d);
    return a && a.name;
  }

  _areaAt(map, x, z) {
    return (map.areas || []).find((a) => a.rect && x >= a.rect[0] && x < a.rect[2] && z >= a.rect[1] && z < a.rect[3]) || null;
  }

  /** Revealed cells: within one cell of a visited area (whole map when it has no areas). */
  _revealed(d) {
    const { map } = d;
    const rows = map.grid.length, cols = map.grid[0].length;
    const shown = new Uint8Array(cols * rows);
    const areas = map.areas || [];
    const here = this._here(d);
    const seen = (a) => (d.visited ? d.visited.includes(a.id) : !!(d.flags && d.flags[`area:${map.id}:${a.id}`]));
    const visited = areas.filter((a) => a === here || seen(a));
    if (!areas.length) shown.fill(1);
    for (const a of visited) {
      const [x0, z0, x1, z1] = a.rect;
      for (let r = Math.max(0, Math.floor(z0) - 1); r <= Math.min(rows - 1, Math.ceil(z1)); r++) {
        for (let c = Math.max(0, Math.floor(x0) - 1); c <= Math.min(cols - 1, Math.ceil(x1)); c++) shown[r * cols + c] = 1;
      }
    }
    return { shown, visited, here, rows, cols };
  }

  _draw(view, d) {
    const { map } = d;
    const test = d.test || ((c) => testCond(c));
    const { shown, visited, here, rows, cols } = this._revealed(d);
    const target = d.objective && d.objective.target;
    let goal = null;
    if (target && target.map === map.id) {
      const it = target.interactable && (map.interactables || []).find((i) => i.id === target.interactable);
      goal = it ? { x: it.x, z: it.z } : target.x != null ? { x: target.x, z: target.z } : null;
    }
    const exits = (map.exits || []).filter((e) => e.rect);
    const goalExit = target && !goal ? exits.find((e) => e.id === d.objective.exit) || exits.find((e) => e.to && e.to.map === target.map) : null;

    // fit the explored part (plus the leader and the goal) into the view
    let c0 = cols, r0 = rows, c1 = -1, r1 = -1;
    const grow = (c, r) => { c0 = Math.min(c0, c); r0 = Math.min(r0, r); c1 = Math.max(c1, c); r1 = Math.max(r1, r); };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (shown[r * cols + c] && specOf(map, map.grid[r][c]).t !== 'void') grow(c, r);
    if (d.leader) grow(Math.floor(d.leader.x), Math.floor(d.leader.z));
    if (goal) grow(Math.floor(goal.x), Math.floor(goal.z));
    if (c1 < 0) { c0 = 0; r0 = 0; c1 = cols - 1; r1 = rows - 1; }
    c0 = Math.max(0, c0 - 2); r0 = Math.max(0, r0 - 2); c1 = Math.min(cols - 1, c1 + 2); r1 = Math.min(rows - 1, r1 + 2);
    // exits: which edge they lead off, and their labels (measured to leave room around the chart)
    const font = (px) => `600 ${px}px "Chakra Petch", system-ui, sans-serif`;
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = font(13);
    const marks = [];
    for (const e of exits) {
      const [x0, z0, x1, z1] = e.rect;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (!isShownAt(shown, cols, rows, Math.floor(cx), Math.floor(cz))) continue;
      const [, dx, dz] = [[cz, 0, -1], [rows - cz, 0, 1], [cx, -1, 0], [cols - cx, 1, 0]].sort((a, b) => a[0] - b[0])[0];
      const name = e.label || (e.to && (d.mapName ? d.mapName(e.to.map) : words(e.to.map))) || '';
      marks.push({ cx, cz, dx, dz, name, w: name ? probe.measureText(name).width : 0, isGoal: e === goalExit });
    }
    const room = (pick) => Math.ceil(Math.max(12, ...marks.filter(pick).map((m) => m.w + 26)));
    const padL = room((m) => m.dx < 0), padR = room((m) => m.dx > 0);
    const padT = marks.some((m) => m.dz < 0 && m.name) ? 30 : 12, padB = marks.some((m) => m.dz > 0 && m.name) ? 30 : 12;
    const W = Math.max(160, view.clientWidth), H = Math.max(160, view.clientHeight);
    const nc = c1 - c0 + 1, nr = r1 - r0 + 1;
    const s = Math.max(MIN_CELL, Math.min(28, Math.floor(Math.min((W - padL - padR) / nc, (H - padT - padB) / nr))));
    const CW = Math.max(W, nc * s + padL + padR), CH = Math.max(H, nr * s + padT + padB);
    const ox = padL + (CW - padL - padR - nc * s) / 2, oy = padT + (CH - padT - padB - nr * s) / 2;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const cv = el('canvas', { width: Math.round(CW * dpr), height: Math.round(CH * dpr) });
    cv.style.width = `${CW}px`;
    cv.style.height = `${CH}px`;
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const X = (x) => ox + (x - c0) * s, Y = (z) => oy + (z - r0) * s;
    const isShown = (c, r) => isShownAt(shown, cols, rows, c, r);
    const spec = (c, r) => specOf(map, map.grid[r] && map.grid[r][c]);
    const walkish = (sp) => sp.t === 'floor' || sp.t === 'door' || sp.t === 'water' || sp.t === 'pit';

    // dot grid behind everything
    g.fillStyle = 'rgba(127,227,255,.07)';
    for (let r = r0; r <= r1 + 1; r += 2) for (let c = c0; c <= c1 + 1; c += 2) g.fillRect(X(c) - 0.5, Y(r) - 0.5, 1, 1);

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!isShown(c, r)) continue;
        const sp = spec(c, r);
        const x = X(c), y = Y(r);
        if (sp.t === 'void') continue;
        if (sp.t === 'floor') {
          const bridge = sp.gate && !test(((map.gates || []).find((gt) => gt.id === sp.gate) || {}).open);
          g.fillStyle = bridge ? 'rgba(255,93,108,.10)' : COLOR.floor;
          g.fillRect(x, y, s, s);
        } else if (sp.t === 'water') {
          const drained = sp.drain && test(sp.drain);
          g.fillStyle = drained ? COLOR.floor : COLOR.water;
          g.fillRect(x, y, s, s);
          if (!drained && s >= 6) { g.fillStyle = 'rgba(160,210,255,.35)'; g.fillRect(x + s * 0.2, y + s * 0.45, s * 0.5, 1); }
        } else if (sp.t === 'pit') {
          g.fillStyle = COLOR.pit;
          g.fillRect(x, y, s, s);
        } else if (sp.t === 'door') {
          g.fillStyle = COLOR.floor;
          g.fillRect(x, y, s, s);
          const locked = sp.lock && (!sp.lock.flag || !test(sp.lock.flag));
          g.fillStyle = locked ? COLOR.locked : COLOR.door;
          g.fillRect(x, y + s * 0.38, s, Math.max(2, s * 0.24));
        } else {
          g.fillStyle = sp.t === 'window' ? COLOR.window : COLOR.wall;
          g.fillRect(x, y, s, s);
        }
      }
    }
    // outline where walkable space meets walls: the "clean schematic" edge
    g.strokeStyle = COLOR.edge;
    g.lineWidth = Math.max(1, Math.min(2, s / 6));
    g.beginPath();
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!isShown(c, r) || !walkish(spec(c, r))) continue;
        const x = X(c), y = Y(r);
        const edge = (dc, dr) => { const n = spec(c + dc, r + dr); return (r + dr < 0 || r + dr >= rows || c + dc < 0 || c + dc >= cols) || !!SOLID[n.t]; };
        if (edge(0, -1)) { g.moveTo(x, y); g.lineTo(x + s, y); }
        if (edge(0, 1)) { g.moveTo(x, y + s); g.lineTo(x + s, y + s); }
        if (edge(-1, 0)) { g.moveTo(x, y); g.lineTo(x, y + s); }
        if (edge(1, 0)) { g.moveTo(x + s, y); g.lineTo(x + s, y + s); }
      }
    }
    g.stroke();
    // closed gates: dashed crimson bars over their cells
    for (const gt of map.gates || []) {
      if (test(gt.open)) continue;
      const cells = gt.cells || (gt.rect ? cellsOfRect(gt.rect) : []);
      g.fillStyle = COLOR.gate;
      for (const [c, r] of cells) if (isShown(c, r)) for (let k = 0; k < 3; k++) g.fillRect(X(c) + k * s / 3 + 1, Y(r) + s * 0.4, s / 3 - 2, Math.max(2, s * 0.2));
    }
    // area names (visited areas; the current one brighter)
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const fs = Math.max(10, Math.min(15, s * 0.9));
    g.font = font(fs);
    const spaced = (t) => t.toUpperCase().split('').join(String.fromCharCode(8202));
    for (const a of visited) {
      const [x0, z0, x1, z1] = a.rect;
      const lines = [];                                  // wrap names wider than their area
      for (const w of String(a.name || '').split(/\s+/).filter(Boolean)) {
        const joined = lines.length ? `${lines[lines.length - 1]} ${w}` : w;
        if (lines.length && g.measureText(spaced(joined)).width > (x1 - x0) * s - 12) lines.push(w); else lines[Math.max(0, lines.length - 1)] = joined;
      }
      g.fillStyle = a === here ? COLOR.here : COLOR.label;
      const lh = fs * 1.3, y0 = Y((z0 + z1) / 2) - ((lines.length - 1) * lh) / 2;
      lines.forEach((t, i) => g.fillText(spaced(t), X((x0 + x1) / 2), y0 + i * lh));
    }
    // chests in visited areas
    for (const ch of map.chests || []) {
      if (!isShown(Math.floor(ch.x), Math.floor(ch.z))) continue;
      const open = d.flags && d.flags[`chest:${map.id}:${ch.id}`];
      const k = Math.max(5, s * 0.55);
      if (open) { g.strokeStyle = 'rgba(255,197,96,.45)'; g.lineWidth = 1; g.strokeRect(X(ch.x) - k / 2 + 0.5, Y(ch.z) - k / 2 + 0.5, k - 1, k - 1); } else {
        g.fillStyle = COLOR.chest;
        g.shadowColor = COLOR.chest; g.shadowBlur = 8;
        g.fillRect(X(ch.x) - k / 2, Y(ch.z) - k / 2, k, k);
        g.shadowBlur = 0;
      }
    }
    // exits: chevron toward the map edge + destination label
    g.font = font(Math.max(10, Math.min(13, s * 0.8)));
    for (const { cx, cz, dx, dz, name, isGoal } of marks) {
      const col = isGoal ? COLOR.goal : COLOR.exit;
      const px = X(cx), py = Y(cz), k = Math.max(5, s * 0.5);
      g.strokeStyle = col; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(px - dz * k - dx * k * 0.6, py - dx * k - dz * k * 0.6);
      g.lineTo(px + dx * k * 0.6, py + dz * k * 0.6);
      g.lineTo(px + dz * k - dx * k * 0.6, py + dx * k - dz * k * 0.6);
      g.stroke();
      if (isGoal) goal = { x: cx, z: cz, exit: true };
      if (!name) continue;
      const w = g.measureText(name).width;
      const tx = px + dx * (k + 8), ty = py + dz * (k + 12);
      const left = dx > 0 ? tx : dx < 0 ? tx - w : tx - w / 2;
      const lx = Math.max(6, Math.min(CW - w - 6, left));         // keep the label on the chart
      g.textAlign = 'left';
      g.fillStyle = 'rgba(5,7,13,.78)';
      g.fillRect(lx - 4, ty - 9, w + 8, 18);
      g.fillStyle = col;
      g.fillText(name, lx, ty);
    }
    const node = el('div', { class: 'vp-map-pan' }, [cv]);
    node.style.width = `${CW}px`;
    node.style.height = `${CH}px`;
    if (d.leader) {
      const you = el('div', { class: 'vp-map-you' }, [el('i')]);
      you.style.left = `${X(d.leader.x)}px`;
      you.style.top = `${Y(d.leader.z)}px`;
      you.firstChild.style.transform = `rotate(${{ up: 0, right: 90, down: 180, left: 270 }[d.leader.facing] ?? 180}deg)`;
      node.appendChild(you);
    }
    if (goal && !goal.exit) {
      const m = el('div', { class: 'vp-map-goal' }, [el('i')]);
      m.style.left = `${X(goal.x)}px`;
      m.style.top = `${Y(goal.z)}px`;
      node.appendChild(m);
    }
    view.replaceChildren(node);
    this._pan = { tx: 0, ty: 0, W, H, CW, CH, s, node };
    const focus = d.leader || { x: (c0 + c1 + 1) / 2, z: (r0 + r1 + 1) / 2 };
    this._move(W / 2 - X(focus.x), H / 2 - Y(focus.z));
  }
}

function isShownAt(shown, cols, rows, c, r) {
  return c >= 0 && r >= 0 && c < cols && r < rows && !!shown[r * cols + c];
}

function cellsOfRect([c0, r0, c1, r1]) {
  const out = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push([c, r]);
  return out;
}
