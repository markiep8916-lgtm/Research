'use strict';
// ---------------------------------------------------------------------------
// Rendering, input and interface panels.
// ---------------------------------------------------------------------------
const SQ3 = Math.sqrt(3);
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const fmt = v => (Math.round(v * 10) / 10).toString();
const sign = v => (v >= 0 ? '+' : '') + fmt(v);
const SAVE_KEY = 'epochs-of-empire-save';

const ICOLOR = { f: '#8fcf5f', p: '#e5873c', g: '#f2c343', s: '#6fa8ec', c: '#c28ae8', fa: '#efe2a2', h: '#7fd6a4', u: '#e8675d', str: '#ece4cd', mv: '#ece4cd' };
const IPATH = {
  f: '<path d="M8 1c2 2 2 5 0 7c-2-2-2-5 0-7z"/><path d="M7.3 7.5h1.4V15H7.3z"/><path d="M8 9c2-1.3 4-1.3 5.3 0c-1.2 2-3.4 2.2-5.3 1zM8 9C6 7.7 4 7.7 2.7 9c1.2 2 3.4 2.2 5.3 1z"/>',
  p: '<path d="M2 2.5h9l2.5 2.3v2.3H2z"/><path d="M6.2 7h3.1v8H6.2z"/>',
  g: '<circle cx="8" cy="8" r="6.6"/><circle cx="8" cy="8" r="3.7" fill="none" stroke="#6b4f10" stroke-width="1.3"/>',
  s: '<path d="M5.8 1h4.4v1.3h-.7v4L14 13.5c.4.8-.1 1.5-1 1.5H3c-.9 0-1.4-.7-1-1.5l4.5-7.2v-4h-.7z"/>',
  c: '<path d="M13.4 1v10.1a2.3 2.3 0 1 1-1.5-2.1V4.3L7.1 5.3v7.8a2.3 2.3 0 1 1-1.5-2.1V2.6z"/>',
  fa: '<path d="M8 1c1 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2.2-4.5c0 1.8.8 3 1.8 3.2C6.3 6.3 6.8 3.5 8 1z"/>',
  h: '<circle cx="8" cy="8" r="6.8"/><circle cx="5.7" cy="6.5" r="1" fill="#0e181c"/><circle cx="10.3" cy="6.5" r="1" fill="#0e181c"/><path d="M4.8 9.4c1.6 2.4 4.8 2.4 6.4 0" fill="none" stroke="#0e181c" stroke-width="1.3"/>',
  u: '<circle cx="8" cy="8" r="6.8"/><circle cx="5.7" cy="6.5" r="1" fill="#0e181c"/><circle cx="10.3" cy="6.5" r="1" fill="#0e181c"/><path d="M4.8 11.4c1.6-2.2 4.8-2.2 6.4 0" fill="none" stroke="#0e181c" stroke-width="1.3"/>',
  str: '<path d="M12.8 1H15v2.2L6.6 11.6l-2.2-2.2zM2.9 9.1l4 4-1 1-1.1-1.1-2.3 2.3L1 13.8l2.3-2.3-1.1-1.1z"/>',
  mv: '<path d="M1.5 6.5h8V2.5l5 5.5-5 5.5v-4h-8z"/>',
};
const ico = (k, col) => `<svg viewBox="0 0 16 16" fill="${col || ICOLOR[k]}" aria-hidden="true">${IPATH[k]}</svg>`;
const YNAMES = { f: 'Food', p: 'Production', g: 'Gold', s: 'Science', c: 'Culture', fa: 'Faith' };

const UI = {
  cam: { x: 0, y: 0, z: 1 }, sel: null, mode: null, pending: null, drawer: null, hover: null, dirty: true,
  dpr: 1, cityView: 'info', busy: false, reach: null, targets: [], hoverPath: null, tileShade: null, confirmDisband: false,
};
const BASE = 30;
let cv, ctx, mini, mctx;

// ---------------------------------------------------------------------------
// geometry
// ---------------------------------------------------------------------------
const hs = () => BASE * UI.cam.z;
function worldPos(x, y) { const s = hs(); return [s * SQ3 * (x + 0.5 * (y & 1)) + s * SQ3 / 2, s * 1.5 * y + s]; }
function screenPos(x, y) { const [wx, wy] = worldPos(x, y); return [wx - UI.cam.x, wy - UI.cam.y]; }
function tileFromScreen(sx, sy) {
  const s = hs();
  const wx = sx + UI.cam.x, wy = sy + UI.cam.y;
  const ry = Math.round((wy - s) / (1.5 * s));
  let best = null, bd = 1e18;
  for (let y = ry - 1; y <= ry + 1; y++) {
    const rx = Math.round((wx - s * SQ3 / 2) / (s * SQ3) - 0.5 * (y & 1));
    for (let x = rx - 1; x <= rx + 1; x++) {
      if (!inMap(x, y)) continue;
      const [cx, cy] = worldPos(x, y);
      const d = (cx - wx) ** 2 + (cy - wy) ** 2;
      if (d < bd) { bd = d; best = [x, y]; }
    }
  }
  return best && bd <= s * s * 1.1 ? best : null;
}
function hexCorners(cx, cy, r) {
  const out = [];
  for (let k = 0; k < 6; k++) { const a = (Math.PI / 180) * (60 * k - 30); out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return out;
}
function hexPath(c, cx, cy, r) {
  const p = hexCorners(cx, cy, r);
  c.beginPath(); c.moveTo(p[0][0], p[0][1]);
  for (let k = 1; k < 6; k++) c.lineTo(p[k][0], p[k][1]);
  c.closePath();
}
const EDGE = [[0, 1], [5, 0], [4, 5], [3, 4], [2, 3], [1, 2]]; // corner pairs for E, NE, NW, W, SW, SE

function centerOn(x, y) {
  const [wx, wy] = worldPos(x, y);
  UI.cam.x = wx - cv.clientWidth / 2;
  UI.cam.y = wy - cv.clientHeight / 2;
  clampCam(); UI.dirty = true;
}
function clampCam() {
  const s = hs();
  const mw = s * SQ3 * (G.W + 0.5), mh = s * 1.5 * G.H + s;
  UI.cam.x = Math.max(-cv.clientWidth * 0.5, Math.min(mw - cv.clientWidth * 0.5, UI.cam.x));
  UI.cam.y = Math.max(-cv.clientHeight * 0.5, Math.min(mh - cv.clientHeight * 0.5, UI.cam.y));
}
function zoomAt(f, sx, sy) {
  const z1 = UI.cam.z, z2 = Math.max(0.45, Math.min(2.4, z1 * f));
  UI.cam.x = (sx + UI.cam.x) * (z2 / z1) - sx;
  UI.cam.y = (sy + UI.cam.y) * (z2 / z1) - sy;
  UI.cam.z = z2; clampCam(); UI.dirty = true;
}

// ---------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * (1 + amt))));
  g = Math.max(0, Math.min(255, Math.round(g * (1 + amt))));
  b = Math.max(0, Math.min(255, Math.round(b * (1 + amt))));
  return `rgb(${r},${g},${b})`;
}
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function tileBase(i) {
  const t = G.tiles[i];
  const [x, y] = xyOf(i);
  const h = (((x * 73856093) ^ (y * 19349663)) >>> 0) % 100 / 100;
  let col = TERRAIN[t.t].color;
  if (t.mtn) col = '#6f6a66';
  return shade(col, (h - 0.5) * 0.1 + (t.hills ? -0.08 : 0));
}

function resize() {
  UI.dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(cv.clientWidth * UI.dpr);
  cv.height = Math.round(cv.clientHeight * UI.dpr);
  UI.dirty = true;
}

function frame() {
  if (UI.dirty && G) { UI.dirty = false; render(); }
  requestAnimationFrame(frame);
}

function render() {
  const p = player();
  const vis = p.vis || updateVisibility(p);
  const s = hs();
  const W = cv.clientWidth, H = cv.clientHeight;
  ctx.setTransform(UI.dpr, 0, 0, UI.dpr, 0, 0);
  ctx.fillStyle = '#081014';
  ctx.fillRect(0, 0, W, H);
  if (!UI.tileShade || UI.tileShade.length !== G.tiles.length) UI.tileShade = G.tiles.map((_, i) => tileBase(i));

  const y0 = Math.max(0, Math.floor((UI.cam.y - s) / (1.5 * s)) - 1);
  const y1 = Math.min(G.H - 1, Math.ceil((UI.cam.y + H) / (1.5 * s)) + 1);
  const x0 = Math.max(0, Math.floor(UI.cam.x / (s * SQ3)) - 1);
  const x1 = Math.min(G.W - 1, Math.ceil((UI.cam.x + W) / (s * SQ3)) + 1);
  const list = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) list.push([x, y]);

  // pass 1: terrain
  for (const [x, y] of list) {
    const i = idx(x, y), t = G.tiles[i];
    const [cx, cy] = screenPos(x, y);
    if (!p.explored[i]) { hexPath(ctx, cx, cy, s + 0.5); ctx.fillStyle = '#0b1418'; ctx.fill(); continue; }
    hexPath(ctx, cx, cy, s + 0.5);
    ctx.fillStyle = UI.tileShade[i];
    ctx.fill();
    drawTerrainMarks(t, cx, cy, s);
  }
  // pass 2: ownership tint + details
  for (const [x, y] of list) {
    const i = idx(x, y), t = G.tiles[i];
    if (!p.explored[i]) continue;
    const [cx, cy] = screenPos(x, y);
    if (t.owner >= 0) { hexPath(ctx, cx, cy, s); ctx.fillStyle = rgba(G.civs[t.owner].color, 0.13); ctx.fill(); }
    if (t.imp) drawImprovement(t, cx, cy, s);
    if (t.dist) drawDistrict(t, cx, cy, s);
    if (t.res && canSeeRes(p, t.res) && !t.dist) drawResource(t, cx, cy, s);
    if (t.camp) drawCamp(cx, cy, s);
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1;
    hexPath(ctx, cx, cy, s); ctx.stroke();
  }
  // pass 3: borders
  ctx.lineCap = 'round';
  for (const [x, y] of list) {
    const i = idx(x, y), t = G.tiles[i];
    if (!p.explored[i] || t.owner < 0) continue;
    const [cx, cy] = screenPos(x, y);
    const cs = hexCorners(cx, cy, s * 0.92);
    const d = (y & 1) ? NB_ODD : NB_EVEN;
    ctx.strokeStyle = G.civs[t.owner].color;
    ctx.lineWidth = Math.max(2, 3 * UI.cam.z);
    for (let k = 0; k < 6; k++) {
      const nx = x + d[k][0], ny = y + d[k][1];
      const nt = tileAt(nx, ny);
      if (nt && nt.owner === t.owner) continue;
      const [a, b] = EDGE[k];
      ctx.beginPath(); ctx.moveTo(cs[a][0], cs[a][1]); ctx.lineTo(cs[b][0], cs[b][1]); ctx.stroke();
    }
  }
  // pass 4: fog
  for (const [x, y] of list) {
    const i = idx(x, y);
    if (!p.explored[i] || vis[i]) continue;
    const [cx, cy] = screenPos(x, y);
    hexPath(ctx, cx, cy, s + 0.5); ctx.fillStyle = 'rgba(6,12,15,0.5)'; ctx.fill();
  }
  drawOverlays(s);
  // cities
  for (const ct of G.cities) {
    if (!p.explored[idx(ct.x, ct.y)]) continue;
    if (ct.x < x0 - 2 || ct.x > x1 + 2 || ct.y < y0 - 1 || ct.y > y1 + 1) continue;
    drawCity(ct, s);
  }
  // units
  for (const [x, y] of list) {
    const i = idx(x, y);
    if (!vis[i] || !UT[i].length) continue;
    drawUnits(UT[i], x, y, s);
  }
  // hover
  if (UI.hover && inMap(UI.hover[0], UI.hover[1])) {
    const [cx, cy] = screenPos(UI.hover[0], UI.hover[1]);
    hexPath(ctx, cx, cy, s - 1); ctx.strokeStyle = 'rgba(255,240,200,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  drawMini();
}

function drawTerrainMarks(t, cx, cy, s) {
  if (t.mtn) {
    ctx.fillStyle = '#8f8a84';
    ctx.beginPath(); ctx.moveTo(cx - s * 0.62, cy + s * 0.42); ctx.lineTo(cx - s * 0.08, cy - s * 0.52); ctx.lineTo(cx + s * 0.46, cy + s * 0.42); ctx.fill();
    ctx.fillStyle = '#a8a39c';
    ctx.beginPath(); ctx.moveTo(cx - s * 0.05, cy + s * 0.42); ctx.lineTo(cx + s * 0.34, cy - s * 0.2); ctx.lineTo(cx + s * 0.7, cy + s * 0.42); ctx.fill();
    ctx.fillStyle = '#eef2f3';
    ctx.beginPath(); ctx.moveTo(cx - s * 0.2, cy - s * 0.3); ctx.lineTo(cx - s * 0.08, cy - s * 0.52); ctx.lineTo(cx + s * 0.05, cy - s * 0.3); ctx.fill();
    return;
  }
  if (t.hills) {
    ctx.strokeStyle = 'rgba(40,28,10,0.45)'; ctx.lineWidth = Math.max(1, 1.6 * UI.cam.z);
    ctx.beginPath(); ctx.arc(cx - s * 0.3, cy + s * 0.25, s * 0.3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + s * 0.25, cy + s * 0.35, s * 0.26, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }
  if (t.feat === 'forest') {
    ctx.fillStyle = '#2d5626';
    for (const [dx, dy] of [[-0.35, 0.05], [0.05, -0.25], [0.3, 0.15], [-0.05, 0.35]]) {
      const x = cx + dx * s, y = cy + dy * s;
      ctx.beginPath(); ctx.moveTo(x, y - s * 0.26); ctx.lineTo(x - s * 0.15, y + s * 0.1); ctx.lineTo(x + s * 0.15, y + s * 0.1); ctx.fill();
    }
  } else if (t.feat === 'jungle') {
    ctx.fillStyle = '#1d4d2b';
    for (const [dx, dy] of [[-0.3, 0], [0.05, -0.28], [0.3, 0.1], [0, 0.3], [-0.2, -0.32]]) {
      ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, s * 0.15, 0, Math.PI * 2); ctx.fill();
    }
  } else if (t.feat === 'marsh') {
    ctx.strokeStyle = '#4f8f8a'; ctx.lineWidth = Math.max(1, 1.5 * UI.cam.z);
    for (const dy of [-0.2, 0.05, 0.3]) { ctx.beginPath(); ctx.moveTo(cx - s * 0.4, cy + dy * s); ctx.lineTo(cx + s * 0.4, cy + dy * s); ctx.stroke(); }
  }
  if (t.t === 'ocean' || t.t === 'coast') {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy); ctx.quadraticCurveTo(cx - s * 0.15, cy - s * 0.1, cx, cy); ctx.quadraticCurveTo(cx + s * 0.15, cy + s * 0.1, cx + s * 0.3, cy); ctx.stroke();
  }
}

function drawImprovement(t, cx, cy, s) {
  if (t.imp === 'farm') {
    ctx.strokeStyle = 'rgba(236,210,110,0.85)'; ctx.lineWidth = Math.max(1, 1.8 * UI.cam.z);
    for (const dy of [0.1, 0.28, 0.46]) { ctx.beginPath(); ctx.moveTo(cx - s * 0.45, cy + dy * s); ctx.lineTo(cx + s * 0.45, cy + dy * s); ctx.stroke(); }
    return;
  }
  const lab = { mine: 'Mn', quarry: 'Qr', pasture: 'Ps', camp: 'Cp', plantation: 'Pl', well: 'Ow' }[t.imp];
  const x = cx - s * 0.45, y = cy + s * 0.32;
  ctx.fillStyle = 'rgba(20,16,10,0.75)';
  ctx.fillRect(x - s * 0.2, y - s * 0.16, s * 0.42, s * 0.32);
  ctx.fillStyle = '#f0d9a0';
  ctx.font = `600 ${Math.max(8, s * 0.26)}px 'IBM Plex Mono', monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(lab, x, y + 1);
}

function drawDistrict(t, cx, cy, s) {
  const D = DISTRICTS[t.dist];
  const ct = cityById(t.distCity);
  const built = ct && ct.districts[t.dist] && ct.districts[t.dist].built;
  hexPath(ctx, cx, cy, s * 0.72);
  ctx.fillStyle = rgba(D.color, built ? 0.9 : 0.35); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = shade(D.color, -0.4);
  if (!built) ctx.setLineDash([4, 3]);
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = built ? '#10181b' : '#f4ecd6';
  ctx.font = `700 ${Math.max(9, s * 0.4)}px 'Alegreya Sans', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(D.abbr, cx, cy + 1);
}

function drawResource(t, cx, cy, s) {
  const R = RES[t.res];
  const col = R.type === 'luxury' ? '#d99ae8' : R.type === 'strategic' ? '#ef9a64' : '#b9dc8e';
  const x = cx + s * 0.42, y = cy + s * 0.28, r = Math.max(6, s * 0.26);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#10181b'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
  ctx.fillStyle = col;
  ctx.font = `700 ${Math.max(7, r * 0.95)}px 'Alegreya Sans', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(R.name.slice(0, 2), x, y + 1);
}

function drawCamp(cx, cy, s) {
  ctx.fillStyle = '#6b2a22';
  ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.45); ctx.lineTo(cx - s * 0.4, cy + s * 0.25); ctx.lineTo(cx + s * 0.4, cy + s * 0.25); ctx.fill();
  ctx.strokeStyle = '#e0604f'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#1a0f0c';
  ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.1); ctx.lineTo(cx - s * 0.12, cy + s * 0.25); ctx.lineTo(cx + s * 0.12, cy + s * 0.25); ctx.fill();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawCity(ct, s) {
  const c = G.civs[ct.civ];
  const [cx, cy] = screenPos(ct.x, ct.y);
  // buildings cluster
  const blocks = [[-0.35, 0.05, 0.3, 0.28], [0, -0.2, 0.34, 0.38], [0.18, 0.12, 0.3, 0.26], [-0.12, 0.22, 0.26, 0.22]];
  for (const [dx, dy, w, h] of blocks) {
    ctx.fillStyle = shade('#d8ccb0', -0.1 + dx * 0.2);
    ctx.fillRect(cx + dx * s - w * s / 2, cy + dy * s - h * s / 2, w * s, h * s);
    ctx.fillStyle = c.color;
    ctx.fillRect(cx + dx * s - w * s / 2, cy + dy * s - h * s / 2, w * s, Math.max(2, h * s * 0.28));
  }
  if (ct.wonders.length) {
    ctx.fillStyle = '#f0c877';
    ctx.beginPath(); ctx.moveTo(cx + s * 0.42, cy - s * 0.4); ctx.lineTo(cx + s * 0.24, cy - s * 0.02); ctx.lineTo(cx + s * 0.6, cy - s * 0.02); ctx.fill();
  }
  // banner
  const fs = Math.max(11, Math.min(15, 12 * UI.cam.z));
  ctx.font = `700 ${fs}px 'Alegreya Sans', sans-serif`;
  const label = ct.name + (ct.capital ? ' ★' : '');
  const tw = ctx.measureText(label).width;
  const bh = fs + 8, bw = tw + bh + 14;
  const bx = cx - bw / 2, by = cy - s - bh * 0.55;
  roundRect(bx, by, bw, bh, 4);
  ctx.fillStyle = c.color; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = shade(c.color, -0.45); ctx.stroke();
  ctx.fillStyle = shade(c.color, -0.45);
  ctx.beginPath(); ctx.arc(bx + bh / 2 + 1, by + bh / 2, bh / 2 - 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.text;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${fs - 1}px 'IBM Plex Mono', monospace`;
  ctx.fillStyle = '#fff';
  ctx.fillText(ct.pop, bx + bh / 2 + 1, by + bh / 2 + 1);
  ctx.font = `700 ${fs}px 'Alegreya Sans', sans-serif`;
  ctx.fillStyle = c.text;
  ctx.textAlign = 'left';
  ctx.fillText(label, bx + bh + 5, by + bh / 2 + 1);
  const mx = cityMaxHP(ct);
  if (ct.hp < mx) {
    ctx.fillStyle = '#0b1316'; ctx.fillRect(bx, by + bh + 2, bw, 4);
    ctx.fillStyle = ct.hp / mx > 0.5 ? '#7fd6a4' : ct.hp / mx > 0.25 ? '#f2c343' : '#e8675d';
    ctx.fillRect(bx, by + bh + 2, bw * ct.hp / mx, 4);
  }
  if (ct.civ === G.player && ct.build) {
    const cost = itemCost(ct, ct.build);
    const pr = Math.min(1, (ct.progress[ct.build] || 0) / cost);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, by - 4, bw, 3);
    ctx.fillStyle = '#e5873c'; ctx.fillRect(bx, by - 4, bw * pr, 3);
  }
}

function drawUnits(units, x, y, s) {
  const [cx, cy] = screenPos(x, y);
  const mil = units.find(isMilitary), civl = units.find(isCivilian);
  const sel = UI.sel && UI.sel.kind === 'unit' ? UI.sel.id : null;
  if (mil) drawUnitDisc(mil, cx + (civl ? s * 0.12 : 0), cy - (civl ? s * 0.05 : 0), s * 0.42, mil.id === sel);
  if (civl) drawUnitDisc(civl, cx - (mil ? s * 0.32 : 0), cy + (mil ? s * 0.3 : 0), s * (mil ? 0.28 : 0.38), civl.id === sel);
}

function drawUnitDisc(u, x, y, r, selected) {
  const c = G.civs[u.civ];
  const U = UNITS[u.type];
  if (selected) {
    ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(240,200,119,0.35)'; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(x, y + 2, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  ctx.beginPath();
  if (U.cls === 'civ') { ctx.arc(x, y, r, 0, Math.PI * 2); }
  else { // shield-ish: circle with flat top for military
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = c.color; ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.14);
  ctx.strokeStyle = selected ? '#f0c877' : (c.isBarb ? '#d9412e' : shade(c.color, -0.5));
  ctx.stroke();
  if (u.fortify && u.fort > 0) {
    ctx.strokeStyle = '#f0c877'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = c.isBarb ? '#e0604f' : c.text;
  ctx.font = `700 ${Math.max(8, r * 0.78)}px 'Alegreya Sans', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(U.abbr, x, y + 1);
  if (u.hp < 100) {
    const w = r * 1.6;
    ctx.fillStyle = '#0b1316'; ctx.fillRect(x - w / 2, y + r + 2, w, 3.5);
    ctx.fillStyle = u.hp > 60 ? '#7fd6a4' : u.hp > 30 ? '#f2c343' : '#e8675d';
    ctx.fillRect(x - w / 2, y + r + 2, w * u.hp / 100, 3.5);
  }
  if (u.civ === G.player && u.moves > 0 && !u.fortify && !u.sleep && !u.skip && !u.path) {
    ctx.beginPath(); ctx.arc(x + r * 0.78, y - r * 0.78, Math.max(2.5, r * 0.2), 0, Math.PI * 2);
    ctx.fillStyle = '#f0c877'; ctx.fill();
  }
  if (u.lvl > 0) {
    ctx.fillStyle = '#f0c877';
    ctx.font = `700 ${Math.max(7, r * 0.5)}px 'IBM Plex Mono', monospace`;
    ctx.fillText('★'.repeat(Math.min(3, u.lvl)), x, y - r - 5);
  }
}

function hexHighlight(x, y, fill, stroke, s) {
  const [cx, cy] = screenPos(x, y);
  hexPath(ctx, cx, cy, s * 0.94);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}
function hexLabel(x, y, text, col, s) {
  const [cx, cy] = screenPos(x, y);
  ctx.font = `700 ${Math.max(10, s * 0.45)}px 'IBM Plex Mono', monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(text, cx, cy - s * 0.45);
  ctx.fillStyle = col; ctx.fillText(text, cx, cy - s * 0.45);
}

function drawOverlays(s) {
  const su = selUnit();
  if (UI.sel && UI.sel.kind === 'city') {
    const ct = cityById(UI.sel.id);
    if (ct && ct.civ === G.player) {
      for (const i of ct.worked) {
        const [x, y] = xyOf(i);
        const [cx, cy] = screenPos(x, y);
        ctx.beginPath(); ctx.arc(cx, cy - s * 0.5, Math.max(3, s * 0.12), 0, Math.PI * 2);
        ctx.fillStyle = '#f0c877'; ctx.fill(); ctx.strokeStyle = '#3a2c12'; ctx.lineWidth = 1; ctx.stroke();
      }
    }
  }
  if (UI.mode) {
    if (UI.mode.kind === 'district') {
      const c = player();
      for (const [x, y] of UI.mode.spots) {
        hexHighlight(x, y, 'rgba(240,200,119,0.22)', '#f0c877', s);
        const a = adjacency(UI.mode.id, x, y, c, UI.mode.city);
        if (DISTRICTS[UI.mode.id].yld) hexLabel(x, y, '+' + a, ICOLOR[DISTRICTS[UI.mode.id].yld], s);
      }
    } else if (UI.mode.kind === 'buy') {
      for (const [x, y] of UI.mode.spots) {
        hexHighlight(x, y, 'rgba(242,195,67,0.18)', '#f2c343', s);
        hexLabel(x, y, tileBuyCost(UI.mode.city, x, y), '#f2c343', s);
      }
    } else if (UI.mode.kind === 'bombard') {
      for (const t of UI.mode.targets) hexHighlight(t.x, t.y, 'rgba(232,103,93,0.25)', '#e8675d', s);
    }
    return;
  }
  if (su) {
    if (UI.reach) for (const [i] of UI.reach) {
      const [x, y] = xyOf(i);
      if (x === su.x && y === su.y) continue;
      hexHighlight(x, y, 'rgba(111,168,236,0.16)', null, s);
    }
    for (const t of UI.targets) hexHighlight(t.x, t.y, 'rgba(232,103,93,0.2)', '#e8675d', s);
    const path = su.path || UI.hoverPath;
    if (path && path.length) {
      ctx.strokeStyle = su.path ? 'rgba(240,200,119,0.9)' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
      ctx.beginPath();
      const [sx, sy] = screenPos(su.x, su.y); ctx.moveTo(sx, sy);
      for (const [x, y] of path) { const [px, py] = screenPos(x, y); ctx.lineTo(px, py); }
      ctx.stroke(); ctx.setLineDash([]);
      const [ex, ey] = path[path.length - 1];
      const turns = Math.max(1, Math.ceil(pathCost(su, path) / maxMoves(su)));
      hexLabel(ex, ey, turns + 'T', '#f0c877', s);
    }
    if (UI.pending && UI.pending.target) hexHighlight(UI.pending.x, UI.pending.y, 'rgba(232,103,93,0.4)', '#ff8a7e', s);
  }
}

function pathCost(u, path) {
  let c = 0;
  for (const [x, y] of path) c += Math.min(moveCost(u, tileAt(x, y)), maxMoves(u));
  return c + (maxMoves(u) - u.moves);
}

function drawMini() {
  const p = player();
  const w = mini.width, h = mini.height;
  mctx.fillStyle = '#081014'; mctx.fillRect(0, 0, w, h);
  const sx = w / (G.W + 0.5), sy = h / G.H;
  for (let i = 0; i < G.tiles.length; i++) {
    if (!p.explored[i]) continue;
    const t = G.tiles[i];
    const [x, y] = xyOf(i);
    mctx.fillStyle = t.owner >= 0 ? G.civs[t.owner].color : TERRAIN[t.t].water ? TERRAIN[t.t].color : t.mtn ? '#77726c' : UI.tileShade[i];
    mctx.fillRect((x + 0.5 * (y & 1)) * sx, y * sy, sx + 0.6, sy + 0.6);
  }
  for (const ct of G.cities) {
    if (!p.explored[idx(ct.x, ct.y)]) continue;
    mctx.fillStyle = '#fff';
    mctx.fillRect((ct.x + 0.5 * (ct.y & 1)) * sx - 1, ct.y * sy - 1, 3, 3);
  }
  const s = hs();
  const vx = UI.cam.x / (s * SQ3) * sx, vy = UI.cam.y / (1.5 * s) * sy;
  const vw = cv.clientWidth / (s * SQ3) * sx, vh = cv.clientHeight / (1.5 * s) * sy;
  mctx.strokeStyle = '#f0c877'; mctx.lineWidth = 1.5; mctx.strokeRect(vx, vy, vw, vh);
}

// ---------------------------------------------------------------------------
// selection helpers
// ---------------------------------------------------------------------------
function selUnit() {
  if (!UI.sel || UI.sel.kind !== 'unit') return null;
  const u = G.units.find(x => x.id === UI.sel.id);
  return u && u.civ === G.player ? u : null;
}
function needsOrders(u) { return u.moves > 0 && !u.fortify && !u.sleep && !u.skip && !u.path; }

function refreshSel() {
  const u = selUnit();
  UI.reach = null; UI.targets = []; UI.hoverPath = null;
  if (u) {
    UI.reach = reachable(u);
    UI.targets = unitAttackTargets(u);
  }
  UI.dirty = true;
  renderSide();
  renderTop();
  renderEnd();
}

function selectUnit(u, center) {
  UI.sel = { kind: 'unit', id: u.id }; UI.pending = null; UI.mode = null; UI.confirmDisband = false;
  if (center) centerOn(u.x, u.y);
  refreshSel();
}
function selectCity(ct, center) {
  UI.sel = { kind: 'city', id: ct.id }; UI.pending = null; UI.mode = null;
  UI.cityView = ct.civ === G.player && !ct.build ? 'prod' : 'info';
  if (center) centerOn(ct.x, ct.y);
  refreshSel();
}
function deselect() { UI.sel = null; UI.pending = null; UI.mode = null; refreshSel(); }

function selectAt(x, y) {
  const own = unitsAt(x, y).filter(u => u.civ === G.player);
  const ct = cityAt(x, y);
  const cur = selUnit();
  if (own.length) {
    own.sort((a, b) => (isMilitary(b) ? 1 : 0) - (isMilitary(a) ? 1 : 0));
    if (cur && cur.x === x && cur.y === y) {
      const k = own.indexOf(cur);
      if (k < own.length - 1) return selectUnit(own[k + 1]);
      if (ct && ct.civ === G.player) return selectCity(ct);
      return selectUnit(own[0]);
    }
    if (UI.sel && UI.sel.kind === 'city' && ct && UI.sel.id === ct.id) return selectUnit(own[0]);
    if (ct && ct.civ === G.player && !(UI.sel && UI.sel.kind === 'city')) return selectCity(ct);
    return selectUnit(own[0]);
  }
  if (ct && player().explored[idx(x, y)]) return selectCity(ct);
  const vis = player().vis;
  const other = vis && vis[idx(x, y)] ? unitsAt(x, y)[0] : null;
  if (other) { UI.sel = { kind: 'unit', id: other.id }; UI.pending = null; UI.mode = null; return refreshSel(); }
  UI.sel = { kind: 'tile', x, y }; UI.pending = null; UI.mode = null;
  refreshSel();
}

function nextUnit(center = true) {
  const list = G.units.filter(u => u.civ === G.player && needsOrders(u));
  if (!list.length) return false;
  const cur = selUnit();
  let k = cur ? list.findIndex(u => u.id === cur.id) : -1;
  const u = list[(k + 1) % list.length];
  selectUnit(u, center);
  return true;
}

// ---------------------------------------------------------------------------
// input
// ---------------------------------------------------------------------------
const ptrs = new Map();
let drag = null, pinch = null;

function onPointerDown(e) {
  if (!G || UI.busy) return;
  cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (ptrs.size === 1) drag = { x: e.offsetX, y: e.offsetY, cx: UI.cam.x, cy: UI.cam.y, moved: false, button: e.button };
  else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: UI.cam.z };
    if (drag) drag.moved = true;
  }
}
function onPointerMove(e) {
  if (!G) return;
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (ptrs.size === 2 && pinch) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const target = pinch.z * d / pinch.d;
    zoomAt(target / UI.cam.z, (a.x + b.x) / 2, (a.y + b.y) / 2);
    return;
  }
  if (drag && ptrs.size === 1) {
    const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 7) drag.moved = true;
    if (drag.moved) { UI.cam.x = drag.cx - dx; UI.cam.y = drag.cy - dy; clampCam(); UI.dirty = true; $('#tip').hidden = true; return; }
  }
  if (e.pointerType === 'mouse') updateHover(e.offsetX, e.offsetY);
}
function onPointerUp(e) {
  if (!G) return;
  const wasDrag = drag && drag.moved;
  const button = drag ? drag.button : 0;
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (ptrs.size === 0) {
    drag = null;
    if (!wasDrag && !UI.busy) {
      const t = tileFromScreen(e.offsetX, e.offsetY);
      if (t && button === 0) onTileClick(t[0], t[1]);
      else if (t && button === 2) onTileAct(t[0], t[1]);
    }
  }
}

function updateHover(sx, sy) {
  const t = tileFromScreen(sx, sy);
  const prev = UI.hover;
  UI.hover = t;
  if (!t) { $('#tip').hidden = true; if (prev) UI.dirty = true; return; }
  if (!prev || prev[0] !== t[0] || prev[1] !== t[1]) {
    UI.dirty = true;
    const su = selUnit();
    UI.hoverPath = null;
    if (su && !UI.mode && su.moves > 0 && !(su.x === t[0] && su.y === t[1]) && !UI.targets.some(o => o.x === t[0] && o.y === t[1])) {
      const tl = tileAt(t[0], t[1]);
      if (player().explored[idx(t[0], t[1])] && moveCost(su, tl) !== Infinity) UI.hoverPath = findPath(su, t[0], t[1], { maxNodes: 1500 });
    }
  }
  const tip = $('#tip');
  tip.innerHTML = tileTip(t[0], t[1]);
  tip.hidden = !tip.innerHTML;
  const r = cv.getBoundingClientRect();
  tip.style.left = Math.min(r.width - 250, sx + 18) + 'px';
  tip.style.top = Math.min(r.height - 120, sy + 18) + 'px';
}

function yieldSpans(y, keys = YKEYS) {
  return keys.filter(k => y[k]).map(k => `<span title="${YNAMES[k]}">${ico(k)}${fmt(y[k])}</span>`).join('');
}

function tileDesc(t) {
  let s = t.mtn ? 'Mountains' : TERRAIN[t.t].name;
  if (t.hills) s += ' Hills';
  if (t.feat) s += ', ' + FEATURES[t.feat].name;
  return s;
}

function tileTip(x, y) {
  const p = player();
  const i = idx(x, y);
  if (!p.explored[i]) return '';
  const t = G.tiles[i];
  const lines = [`<b>${esc(tileDesc(t))}</b>`];
  if (t.res && canSeeRes(p, t.res)) lines.push(`${esc(RES[t.res].name)} <span class="muted">(${RES[t.res].type})</span>`);
  if (t.imp) lines.push(esc(IMPROVEMENTS[t.imp].name));
  if (t.dist) lines.push(esc(DISTRICTS[t.dist].name));
  if (t.camp) lines.push('<span class="bad">Barbarian camp</span>');
  const ty = tileYield(t, p);
  const ys = yieldSpans(ty);
  if (ys) lines.push(`<div class="yrow">${ys}</div>`);
  if (t.owner >= 0) lines.push(`<span class="muted">${esc(G.civs[t.owner].name)}</span>`);
  const su = selUnit();
  const tg = su && UI.targets.find(o => o.x === x && o.y === y);
  if (tg) {
    const pv = combatPreview(su, tg);
    lines.push(`<div style="margin-top:4px">Attack: <b>${pv.a}</b> vs <b>${pv.d}</b><br>Deal ~${pv.toDef}${pv.toAtt ? `, take ~${pv.toAtt}` : ''}</div>`);
  }
  if (p.vis && p.vis[i]) for (const u of unitsAt(x, y)) lines.push(`<span style="color:${G.civs[u.civ].color}">■</span> ${esc(G.civs[u.civ].adj)} ${esc(UNITS[u.type].name)} · ${u.hp} HP`);
  return lines.join('<br>');
}

function onTileClick(x, y) {
  if (UI.mode) return handleMode(x, y);
  const su = selUnit();
  if (su && !(su.x === x && su.y === y)) { if (tryUnitAction(su, x, y, false)) return; }
  selectAt(x, y);
}
function onTileAct(x, y) {
  if (UI.mode) { UI.mode = null; refreshSel(); return; }
  const su = selUnit();
  if (su) tryUnitAction(su, x, y, true);
}

function handleMode(x, y) {
  const m = UI.mode;
  const hit = (m.spots || m.targets || []).find(s => (s.x != null ? s.x === x && s.y === y : s[0] === x && s[1] === y));
  if (!hit) { UI.mode = null; refreshSel(); return; }
  if (m.kind === 'district') { setBuild(m.city, 'd:' + m.id, [x, y]); UI.mode = null; UI.cityView = 'info'; toast(`${DISTRICTS[m.id].name} placed. Construction begins.`); }
  else if (m.kind === 'buy') {
    if (!buyTile(m.city, x, y)) { toast('Not enough gold for that tile.', 'bad'); return; }
    UI.mode.spots = borderCandidates(m.city);
  } else if (m.kind === 'bombard') {
    const dmg = cityAttack(m.city, hit.target);
    toast(`${m.city.name} bombards for ${dmg} damage.`, 'good');
    UI.mode = null;
  }
  updateVisibility(player());
  refreshSel();
}

function tryUnitAction(u, x, y, immediate) {
  const tg = UI.targets.find(o => o.x === x && o.y === y);
  if (tg) {
    if (immediate || (UI.pending && UI.pending.x === x && UI.pending.y === y && UI.pending.target)) return doAttack(u, tg);
    UI.pending = { x, y, target: tg };
    refreshSel();
    return true;
  }
  // foreign civ at peace?
  const ct = cityAt(x, y);
  const other = unitsAt(x, y).find(o => o.civ !== u.civ);
  const vis = player().vis;
  const fc = (ct && ct.civ !== u.civ) ? ct.civ : (other && vis && vis[idx(x, y)] ? other.civ : null);
  if (fc != null && !isAtWar(u.civ, fc) && isMilitary(u) && hexDist(u.x, u.y, x, y) <= (UNITS[u.type].range || 1)) {
    UI.pending = { x, y, declare: fc };
    refreshSel();
    return true;
  }
  if (u.moves <= 0) {
    // still allow setting a go-to for next turn
  }
  const t = tileAt(x, y);
  if (!player().explored[idx(x, y)] && !immediate) return false;
  if (moveCost(u, t) === Infinity) return false;
  const st = tileStatus(u, x, y);
  if (st === 'blocked' && unitsAt(x, y).some(o => o.civ === u.civ)) return false;
  const path = findPath(u, x, y);
  if (!path || !path.length) return false;
  u.path = path; u.fortify = false; u.sleep = false; u.skip = false;
  moveAlongPath(u);
  updateVisibility(player());
  UI.pending = null;
  refreshSel();
  if (!needsOrders(u) && !u.path) setTimeout(() => { if (selUnit() === u && u.moves <= 0) nextUnit(false); }, 0);
  return true;
}

function doAttack(u, tg) {
  const name = tg.kind === 'city' ? tg.target.name : UNITS[tg.target.type].name;
  const res = attack(u, tg);
  UI.pending = null;
  if (res.captured) toast(`You captured ${name}!`, 'good');
  else if (res.died) toast(`Your ${UNITS[u.type].name} was destroyed attacking ${name}.`, 'bad');
  else if (res.killed) toast(`Enemy ${name} destroyed.`, 'good');
  else toast(`Hit ${name} for ${res.toDef} damage${res.toAtt ? `, took ${res.toAtt}` : ''}.`);
  updateVisibility(player());
  if (G.over) showVictory();
  if (res.died) { UI.sel = null; }
  refreshSel();
  return true;
}

function onKey(e) {
  if (!G || $('#setup').innerHTML || !$('#modal').hidden) { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); return; }
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || (e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' '))) return;
  const u = selUnit();
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (!$('#drawer').hidden) closeDrawer(); else if (UI.mode) { UI.mode = null; refreshSel(); } else deselect(); }
  else if (k === 'enter') { e.preventDefault(); endTurnClick(e.shiftKey); }
  else if (k === 'f' && u && isMilitary(u)) unitAct('fortify');
  else if (k === 's' && u) unitAct('skip');
  else if (k === 'b' && u && u.type === 'settler') unitAct('found');
  else if (k === 'n' || k === '.') nextUnit();
  else if (k === '+' || k === '=') zoomAt(1.15, cv.clientWidth / 2, cv.clientHeight / 2);
  else if (k === '-') zoomAt(1 / 1.15, cv.clientWidth / 2, cv.clientHeight / 2);
  else if (k.startsWith('arrow')) {
    const d = 60;
    if (k === 'arrowleft') UI.cam.x -= d; if (k === 'arrowright') UI.cam.x += d;
    if (k === 'arrowup') UI.cam.y -= d; if (k === 'arrowdown') UI.cam.y += d;
    clampCam(); UI.dirty = true; e.preventDefault();
  }
}

// ---------------------------------------------------------------------------
// top bar
// ---------------------------------------------------------------------------
function yearOf(t) {
  let y;
  if (t <= 60) y = -4000 + t * 50;
  else if (t <= 120) y = -1000 + (t - 60) * 25;
  else if (t <= 200) y = 500 + (t - 120) * 12.5;
  else if (t <= 280) y = 1500 + (t - 200) * 5;
  else y = 1900 + (t - 280) * 1.5;
  y = Math.round(y);
  return y < 0 ? `${-y} BC` : `${y} AD`;
}

function turnsFor(need, rate) { return rate > 0 ? Math.max(1, Math.ceil(need / rate)) : '∞'; }

function renderTop() {
  const p = player();
  const y = civYields(p);
  const hap = p.happy;
  const tr = p.researching, cv2 = p.civicing;
  const trTxt = tr ? `${TECHS[tr].name} · ${turnsFor(techCost(tr) - (p.techProg[tr] || 0), y.s)}t` : 'Choose research';
  const cvTxt = cv2 ? `${CIVICS[cv2].name} · ${turnsFor(civicCost(cv2) - (p.civicProg[cv2] || 0), y.c)}t` : 'Choose civic';
  const dot = n => (n ? '<span class="dot"></span>' : '');
  const relDot = canFoundPantheon(p) || canFoundReligion(p);
  const offers = G.civs.some(c => c.peaceOffer && c.peaceOffer[G.player]);
  $('#top').innerHTML = `
    <span class="brand">Epochs of Empire</span>
    <button class="stat" data-open="research" title="Science per turn">${ico('s')}${sign(y.s)} <small>${esc(trTxt)}</small></button>
    <button class="stat" data-open="civics" title="Culture per turn">${ico('c')}${sign(y.c)} <small>${esc(cvTxt)}</small></button>
    <button class="stat" data-open="empire" title="Gold">${ico('g')}${Math.floor(p.gold)} <small>(${sign(y.gNet)})</small></button>
    <button class="stat" data-open="religion" title="Faith">${ico('fa')}${Math.floor(p.faith)} <small>(${sign(y.fa)})</small></button>
    <button class="stat" data-open="empire" title="Happiness">${ico(hap >= 0 ? 'h' : 'u')}<span class="${hap < 0 ? 'bad' : ''}">${hap}</span> <small>${p.ga > 0 ? `Golden Age ${p.ga}t` : `GA ${Math.floor(p.gaPts)}/${gaNeeded(p)}`}</small></button>
    <span class="spacer"></span>
    <span class="turninfo">Turn ${G.turn} · ${yearOf(G.turn)} · ${ERAS[eraOf(p)]} Era</span>
    <button class="tabbtn ${UI.drawer === 'research' ? 'on' : ''}" data-open="research">Research${dot(!tr)}</button>
    <button class="tabbtn ${UI.drawer === 'civics' ? 'on' : ''}" data-open="civics">Civics${dot(!cv2)}</button>
    <button class="tabbtn ${UI.drawer === 'government' ? 'on' : ''}" data-open="government">Government</button>
    <button class="tabbtn ${UI.drawer === 'religion' ? 'on' : ''}" data-open="religion">Religion${dot(relDot)}</button>
    <button class="tabbtn ${UI.drawer === 'diplomacy' ? 'on' : ''}" data-open="diplomacy">Diplomacy${dot(offers)}</button>
    <button class="tabbtn ${UI.drawer === 'empire' ? 'on' : ''}" data-open="empire">Empire</button>
    <button class="tabbtn" data-menu="1">Menu</button>`;
}

// ---------------------------------------------------------------------------
// end turn button
// ---------------------------------------------------------------------------
function turnBlocker() {
  const p = player();
  if (!p.researching && availableTechs(p).length) return { label: 'Choose Research', go: () => openDrawer('research') };
  if (!p.civicing && availableCivics(p).length) return { label: 'Choose Civic', go: () => openDrawer('civics') };
  const idle = civCities(p).find(ct => !ct.build);
  if (idle) return { label: 'Choose Production', go: () => selectCity(idle, true) };
  if (canFoundPantheon(p)) return { label: 'Choose a Pantheon', go: () => openDrawer('religion') };
  if (canFoundReligion(p)) return { label: 'Found a Religion', go: () => openDrawer('religion') };
  if (G.units.some(u => u.civ === G.player && needsOrders(u))) return { label: 'Unit Needs Orders', go: () => nextUnit(), units: true };
  return null;
}
function renderEnd() {
  const b = $('#endTurn');
  if (G.over) { b.textContent = 'Game Over'; b.disabled = false; $('#forceEnd').hidden = true; return; }
  const bl = turnBlocker();
  b.textContent = bl ? bl.label : 'Next Turn';
  b.classList.toggle('ready', !bl);
  b.disabled = UI.busy;
  $('#forceEnd').hidden = !bl;
}
function endTurnClick(force) {
  if (UI.busy) return;
  if (G.over) { showVictory(); return; }
  const bl = turnBlocker();
  if (bl && !force) { bl.go(); return; }
  UI.busy = true; UI.pending = null; UI.mode = null;
  renderEnd();
  $('#busy').hidden = false;
  setTimeout(() => {
    try { endTurn(); } catch (err) { console.error(err); toast('Something went wrong while processing the turn. The game will continue.', 'bad'); }
    UI.busy = false;
    $('#busy').hidden = true;
    autosave();
    if (G.over) showVictory();
    const cur = selUnit();
    if (cur && needsOrders(cur)) refreshSel();
    else if (!nextUnit(true)) { if (UI.sel && UI.sel.kind === 'unit' && !selUnit()) UI.sel = null; refreshSel(); }
    if (UI.drawer) renderDrawer();
  }, 30);
}

function autosave() {
  try { localStorage.setItem(SAVE_KEY, serialize()); } catch (e) { /* storage unavailable */ }
}

// ---------------------------------------------------------------------------
// selection card
// ---------------------------------------------------------------------------
function badge(c, text) {
  return `<span class="badge" style="background:${c.color};color:${c.text};border-color:${shade(c.color, -0.45)}">${esc(text)}</span>`;
}

function renderSide() {
  const el = $('#side');
  document.body.classList.toggle('has-sel', !!UI.sel);
  if (!UI.sel || !G) { el.innerHTML = ''; return; }
  if (UI.sel.kind === 'unit') {
    const u = G.units.find(x => x.id === UI.sel.id);
    if (!u) { UI.sel = null; el.innerHTML = ''; return; }
    el.innerHTML = unitCard(u);
  } else if (UI.sel.kind === 'city') {
    const ct = cityById(UI.sel.id);
    if (!ct) { UI.sel = null; el.innerHTML = ''; return; }
    const sc = el.scrollTop;
    el.innerHTML = cityCard(ct);
    el.scrollTop = sc;
  } else el.innerHTML = tileCard(UI.sel.x, UI.sel.y);
}

function unitCard(u) {
  const U = UNITS[u.type];
  const c = G.civs[u.civ];
  const mine = u.civ === G.player;
  const need = [15, 45, 90, 150, 230, 330][Math.min(u.lvl, 5)] + Math.max(0, u.lvl - 5) * 120;
  let h = `<div class="card-h">${badge(c, U.abbr)}<div><h2>${esc(U.name)}</h2><div class="sub">${esc(c.adj)}${U.unique ? ' unique unit' : ''}${U.cls !== 'civ' ? ` · Level ${u.lvl + 1} · XP ${u.xp}/${need}` : ''}</div></div><button class="x" data-act="close" aria-label="Close">×</button></div><div class="card-b">`;
  h += `<div class="kv">`;
  if (U.cls !== 'civ') h += `<div>Strength <b>${unitStrength(u, 'melee', null)}</b></div>`;
  if (U.rs) h += `<div>Ranged <b>${unitStrength(u, 'ranged', null)}</b></div><div>Range <b>${U.range}</b></div>`;
  h += `<div>Moves <b>${fmt(u.moves)}/${maxMoves(u)}</b></div><div>Health <b>${u.hp}</b></div>`;
  if (u.charges != null) h += `<div>Charges <b>${u.charges}</b></div>`;
  h += `</div>`;
  if (U.cls !== 'civ') h += `<div class="hpbar"><i style="width:${u.hp}%;background:${u.hp > 60 ? 'var(--good)' : u.hp > 30 ? 'var(--gold)' : 'var(--bad)'}"></i></div>`;
  if (!mine) return h + `<div class="note">${esc(unitDesc(u.type))}</div></div>`;
  if (UI.pending && UI.pending.declare != null) {
    const o = G.civs[UI.pending.declare];
    h += `<div class="preview"><div>You are at peace with <b>${esc(o.name)}</b>. Attacking means war.</div><div class="actions"><button class="btn danger" data-act="declare">Declare war on ${esc(o.name)}</button><button class="btn" data-act="cancel">Cancel</button></div></div>`;
  } else if (UI.pending && UI.pending.target) {
    const tg = UI.pending.target;
    const pv = combatPreview(u, tg);
    const tname = tg.kind === 'city' ? tg.target.name : `${G.civs[tg.target.civ].adj} ${UNITS[tg.target.type].name}`;
    const verdict = pv.toDef >= pv.defHP ? '<span class="good">Decisive victory</span>' : pv.toAtt >= pv.attHP ? '<span class="bad">Your unit would likely die</span>' : pv.toDef > pv.toAtt ? '<span class="good">Favourable</span>' : pv.toDef < pv.toAtt ? '<span class="bad">Unfavourable</span>' : 'Even';
    h += `<div class="preview"><div class="label">Combat preview</div>
      <div class="vs"><div>${pv.a}<br><em>You</em></div><div class="muted">vs</div><div>${pv.d}<br><em>${esc(tname)}</em></div></div>
      <div class="note">Deal about ${pv.toDef} damage (target has ${pv.defHP})${pv.toAtt ? `, take about ${pv.toAtt} (you have ${pv.attHP})` : ''}. ${verdict}.</div>
      <div class="actions"><button class="btn primary" data-act="attack">Attack</button><button class="btn" data-act="cancel">Cancel</button></div></div>`;
  }
  const acts = [];
  if (u.type === 'settler') {
    const ok = canFoundCity(c, u.x, u.y) && u.moves > 0;
    acts.push(`<button class="btn primary" data-act="found" ${ok ? '' : 'disabled'}>Found City (B)</button>`);
    if (!canFoundCity(c, u.x, u.y)) h += `<div class="note">Cities need 3 tiles between them and cannot be founded in foreign land.</div>`;
  }
  if (u.type === 'builder') {
    for (const imp of validImprovements(u)) acts.push(`<button class="btn primary" data-act="imp:${imp}" ${u.moves > 0 ? '' : 'disabled'}>Build ${esc(IMPROVEMENTS[imp].name)}</button>`);
    if (canHarvest(u)) acts.push(`<button class="btn" data-act="harvest" ${u.moves > 0 ? '' : 'disabled'}>Harvest ${esc(FEATURES[tileAt(u.x, u.y).feat].name)}</button>`);
    if (!validImprovements(u).length && !canHarvest(u)) h += `<div class="note">Move onto a tile inside your borders to improve it. Farms go on flat land, Mines on Hills; resources need their own improvement.</div>`;
  }
  if (isMilitary(u)) {
    acts.push(`<button class="btn" data-act="fortify">${u.fortify ? 'Fortified' : 'Fortify (F)'}</button>`);
    const tgs = UI.targets;
    if (U.rs && tgs.length) h += `<div class="note">Tap a red tile to preview a ranged attack.</div>`;
  }
  acts.push(`<button class="btn" data-act="sleep">Sleep</button>`);
  acts.push(`<button class="btn" data-act="skip">Skip (S)</button>`);
  if (u.path) acts.push(`<button class="btn" data-act="stop">Cancel move</button>`);
  const nt = upgradeTarget(u);
  if (nt) acts.push(`<button class="btn" data-act="upgrade" ${canUpgrade(u) ? '' : 'disabled'} title="Upgrade inside your borders">Upgrade to ${esc(UNITS[nt].name)} (${upgradeCost(u, nt)}g)</button>`);
  acts.push(`<button class="btn danger" data-act="disband">${UI.confirmDisband ? 'Confirm disband' : 'Disband'}</button>`);
  h += `<div class="actions">${acts.join('')}</div>`;
  h += `<div class="note">Tap a tile to move. Right-click moves or attacks at once.</div>`;
  return h + '</div>';
}

function tileCard(x, y) {
  const p = player();
  const t = tileAt(x, y);
  if (!p.explored[idx(x, y)]) return `<div class="card-h"><div><h2>Unexplored</h2><div class="sub">Send a unit to reveal this land.</div></div><button class="x" data-act="close" aria-label="Close">×</button></div>`;
  let h = `<div class="card-h"><div><h2>${esc(tileDesc(t))}</h2><div class="sub">${t.owner >= 0 ? esc(G.civs[t.owner].name) + ' territory' : 'Unclaimed'}</div></div><button class="x" data-act="close" aria-label="Close">×</button></div><div class="card-b">`;
  h += `<div class="yrow">${yieldSpans(tileYield(t, p)) || '<span class="muted">No yields</span>'}</div>`;
  const chips = [];
  if (t.res && canSeeRes(p, t.res)) chips.push(`${RES[t.res].name} (${RES[t.res].type}${RES[t.res].imp ? ', ' + IMPROVEMENTS[RES[t.res].imp].name : ''})`);
  if (t.imp) chips.push(IMPROVEMENTS[t.imp].name);
  if (t.dist) chips.push(DISTRICTS[t.dist].name);
  if (t.camp) chips.push('Barbarian camp');
  if (t.feat) chips.push(`Movement 2 · Defense ${FEATURES[t.feat].def > 0 ? '+' : ''}${FEATURES[t.feat].def}`);
  else if (t.hills) chips.push('Movement 2 · Defense +3');
  if (chips.length) h += `<div class="chips">${chips.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>`;
  return h + '</div>';
}

function cityCard(ct) {
  const c = G.civs[ct.civ];
  const mine = ct.civ === G.player;
  let h = `<div class="card-h">${badge(c, ct.pop)}<div><h2>${esc(ct.name)}${ct.capital ? ' ★' : ''}</h2><div class="sub">${esc(c.name)}${ct.founder !== ct.civ ? ` · founded by ${esc(G.civs[ct.founder].name)}` : ''}</div></div><button class="x" data-act="close" aria-label="Close">×</button></div><div class="card-b">`;
  const mx = cityMaxHP(ct);
  h += `<div class="kv"><div>Strength <b>${cityStrength(ct)}</b></div><div>HP <b>${ct.hp}/${mx}</b></div>`;
  if (!mine) {
    h += `<div>Population <b>${ct.pop}</b></div></div>`;
    const ch = Object.keys(ct.districts).filter(d => ct.districts[d].built).map(d => `<span class="chip d" style="border-color:${DISTRICTS[d].color}">${esc(DISTRICTS[d].name)}</span>`).join('') + ct.wonders.map(w => `<span class="chip">${esc(WONDERS[w].name)}</span>`).join('');
    if (ch) h += `<div class="chips">${ch}</div>`;
    return h + `<div class="note">${isAtWar(G.player, ct.civ) ? 'At war. Wear down its HP, then take it with a melee unit.' : 'At peace.'}</div></div>`;
  }
  const y = cityYields(ct);
  const need = growthThreshold(ct.pop);
  const housing = cityHousing(ct);
  const growT = y.net > 0 ? Math.ceil((need - ct.food) / y.net) : null;
  h += `<div>Housing <b class="${ct.pop >= housing ? 'bad' : ''}">${ct.pop}/${housing}</b></div><div>Districts <b>${districtCount(ct)}/${districtLimit(ct)}</b></div></div>`;
  h += `<div class="yrow"><span title="Food surplus">${ico('f')}${sign(y.net)}</span>${yieldSpans(y, ['p', 'g', 's', 'c', 'fa'])}</div>`;
  h += `<div><div class="label">Growth · ${Math.floor(ct.food)}/${need} ${growT ? `· ${growT} turns` : y.net < 0 ? '· starving' : '· stagnant'}</div><div class="bar"><i style="width:${Math.min(100, ct.food / need * 100)}%;background:var(--food)"></i></div></div>`;
  const cn = cultureNeeded(ct);
  h += `<div><div class="label">Borders · next tile in ${turnsFor(cn - ct.cult, y.c)} turns</div><div class="bar"><i style="width:${Math.min(100, ct.cult / cn * 100)}%;background:var(--cult)"></i></div></div>`;
  if (ct.build) {
    const cost = itemCost(ct, ct.build);
    const pr = ct.progress[ct.build] || 0;
    const rate = y.p * prodMultiplier(ct, ct.build);
    h += `<div><div class="label">Producing · ${esc(itemName(ct.build))} · ${turnsFor(cost - pr, rate)} turns</div><div class="bar"><i style="width:${Math.min(100, pr / cost * 100)}%"></i></div></div>`;
  } else h += `<div class="bad">Nothing in production. Pick something below.</div>`;
  const tg = cityTargets(ct);
  h += `<div class="actions">
    <button class="btn ${UI.cityView === 'prod' ? 'primary' : ''}" data-act="cityprod">${UI.cityView === 'prod' ? 'Hide production' : 'Change production'}</button>
    <button class="btn" data-act="buytile">Buy tile</button>
    ${tg.length ? `<button class="btn danger" data-act="bombard">Bombard (${tg.length})</button>` : ''}
    <select id="focus-${ct.id}" data-focus="${ct.id}" class="btn" aria-label="Citizen focus">
      ${['balanced', 'food', 'production', 'gold', 'science', 'faith'].map(f => `<option value="${f}" ${ct.focus === f ? 'selected' : ''}>Focus: ${f}</option>`).join('')}
    </select></div>`;
  if (UI.cityView === 'prod') h += prodList(ct, y);
  const dchips = Object.keys(ct.districts).map(d => `<span class="chip d" style="border-color:${DISTRICTS[d].color}">${esc(DISTRICTS[d].name)}${ct.districts[d].built ? ` +${DISTRICTS[d].yld ? adjacency(d, ct.districts[d].x, ct.districts[d].y, c, ct) : ''}` : ' (building)'}</span>`).join('');
  const bchips = Object.keys(ct.buildings).map(b => `<span class="chip">${esc(BUILDINGS[b].name)}</span>`).join('');
  const wchips = ct.wonders.map(w => `<span class="chip" style="background:#3a2c12;color:var(--bronze-2)">${esc(WONDERS[w].name)}</span>`).join('');
  if (dchips || bchips || wchips) h += `<div><div class="label">Built</div><div class="chips">${dchips}${bchips}${wchips}</div></div>`;
  return h + '</div>';
}

function itemName(key) {
  const [k, id] = key.split(':');
  return ({ u: UNITS, b: BUILDINGS, d: DISTRICTS, w: WONDERS, p: PROJECTS })[k][id].name;
}

function prodList(ct, y) {
  const p = player();
  const items = availableItems(ct);
  const groups = ['District', 'Building', 'Unit', 'Wonder', 'Project'];
  let h = '<div class="prodlist">';
  for (const g of groups) {
    const list = items.filter(i => i.kind === g);
    if (!list.length) continue;
    h += `<div class="prodgrp">${g}s</div>`;
    for (const it of list) {
      const pr = ct.progress[it.key] || 0;
      const rate = y.p * prodMultiplier(ct, it.key);
      const gc = goldCost(ct, it.key), fc = faithCost(ct, it.key);
      const placed = it.key.startsWith('d:') && ct.districts[it.key.slice(2)];
      h += `<div class="prod ${ct.build === it.key ? 'cur' : ''}" role="button" tabindex="0" data-build="${it.key}">
        <span class="nm">${esc(it.name)}${placed ? ' <span class="muted">(placed)</span>' : ''}</span><span class="tm">${it.cost}${ico('p')} · ${turnsFor(it.cost - pr, rate)}t</span>
        <span class="ds">${esc(it.desc || '')}</span>
        ${gc != null || fc != null ? `<span class="buy">${gc != null ? `<button class="btn small" data-buy="${it.key}" data-cur="gold" ${p.gold >= gc ? '' : 'disabled'}>Buy ${gc}g</button>` : ''}${fc != null ? `<button class="btn small" data-buy="${it.key}" data-cur="faith" ${p.faith >= fc ? '' : 'disabled'}>Buy ${fc} faith</button>` : ''}</span>` : ''}
      </div>`;
    }
  }
  return h + '</div>';
}

function unitAct(act) {
  const u = selUnit();
  if (act === 'close') { deselect(); return; }
  if (!u) { if (act === 'close') deselect(); return; }
  if (act !== 'disband') UI.confirmDisband = false;
  if (act === 'found') {
    if (!canFoundCity(player(), u.x, u.y) || u.moves <= 0) return;
    const ct = foundCity(player(), u.x, u.y);
    removeUnit(u);
    updateVisibility(player());
    selectCity(ct);
    return;
  }
  if (act.startsWith('imp:')) { buildImprovement(u, act.slice(4)); updateVisibility(player()); }
  else if (act === 'harvest') harvest(u);
  else if (act === 'fortify') { u.fortify = true; u.moves = 0; }
  else if (act === 'sleep') { u.sleep = true; }
  else if (act === 'skip') { u.skip = true; }
  else if (act === 'stop') { u.path = null; }
  else if (act === 'upgrade') { upgradeUnit(u); toast(`Upgraded to ${UNITS[u.type].name}.`, 'good'); }
  else if (act === 'disband') {
    if (!UI.confirmDisband) { UI.confirmDisband = true; renderSide(); return; }
    UI.confirmDisband = false; removeUnit(u); UI.sel = null;
  } else if (act === 'attack') { if (UI.pending && UI.pending.target) doAttack(u, UI.pending.target); return; }
  else if (act === 'cancel') { UI.pending = null; }
  else if (act === 'declare') {
    const o = G.civs[UI.pending.declare];
    declareWar(player(), o);
    const { x, y } = UI.pending;
    UI.pending = null;
    refreshSel();
    const tg = UI.targets.find(t => t.x === x && t.y === y);
    if (tg) { UI.pending = { x, y, target: tg }; }
    refreshSel();
    return;
  }
  if (u.dead || !needsOrders(u)) {
    if (!nextUnit(true)) { if (u.dead) UI.sel = null; refreshSel(); }
    return;
  }
  refreshSel();
}

function onSideClick(e) {
  const b = e.target.closest('[data-act],[data-build],[data-buy]');
  if (!b || b.disabled) return;
  if (b.dataset.buy) {
    e.stopPropagation();
    const ct = cityById(UI.sel.id);
    const key = b.dataset.buy;
    if (key.startsWith('u:') && !spawnSpot(ct, key.slice(2))) { toast('No room to place that unit next to the city.', 'bad'); return; }
    if (purchase(ct, key, b.dataset.cur)) { toast(`Purchased ${itemName(key)}.`, 'good'); updateVisibility(player()); }
    refreshSel(); return;
  }
  if (b.dataset.build) {
    const ct = cityById(UI.sel.id);
    const key = b.dataset.build;
    const [k, id] = key.split(':');
    if (k === 'd' && !ct.districts[id]) {
      UI.mode = { kind: 'district', city: ct, id, spots: districtSpots(ct, id) };
      toast(`Choose a tile for the ${DISTRICTS[id].name}. Numbers show the adjacency bonus.`);
      refreshSel(); return;
    }
    setBuild(ct, key);
    UI.cityView = 'info';
    refreshSel(); return;
  }
  const act = b.dataset.act;
  if (UI.sel && UI.sel.kind === 'city') {
    const ct = cityById(UI.sel.id);
    if (act === 'close') return deselect();
    if (act === 'cityprod') { UI.cityView = UI.cityView === 'prod' ? 'info' : 'prod'; renderSide(); return; }
    if (act === 'buytile') { UI.mode = { kind: 'buy', city: ct, spots: borderCandidates(ct) }; toast('Choose a tile to buy. Prices are in gold.'); refreshSel(); return; }
    if (act === 'bombard') { UI.mode = { kind: 'bombard', city: ct, targets: cityTargets(ct) }; toast('Choose a target to bombard.'); refreshSel(); return; }
    return;
  }
  if (act === 'close') return deselect();
  unitAct(act);
}

// ---------------------------------------------------------------------------
// drawer panels
// ---------------------------------------------------------------------------
function openDrawer(name) { UI.drawer = name; $('#drawer').hidden = false; renderDrawer(); renderTop(); }
function closeDrawer() { UI.drawer = null; $('#drawer').hidden = true; renderTop(); }

function renderDrawer() {
  if (!UI.drawer) return;
  const titles = { research: 'Technology', civics: 'Civics', government: 'Government', religion: 'Religion', diplomacy: 'Diplomacy', empire: 'Empire' };
  $('#drTitle').textContent = titles[UI.drawer];
  const body = $('#drBody');
  const sl = body.querySelector('.tree') ? body.querySelector('.tree').scrollLeft : 0;
  const st = body.scrollTop;
  body.innerHTML = ({ research: techPanel, civics: civicPanel, government: govPanel, religion: religionPanel, diplomacy: diploPanel, empire: empirePanel })[UI.drawer]();
  const tree = body.querySelector('.tree');
  if (tree) {
    if (sl) tree.scrollLeft = sl;
    else { const cur = tree.querySelector('.cur, .avail'); if (cur) tree.scrollLeft = Math.max(0, cur.parentElement.offsetLeft - 20); }
  }
  body.scrollTop = st;
}

function unlocksOf(kind, id) {
  const p = player();
  const out = [];
  const field = kind === 'tech' ? 'tech' : 'civic';
  for (const u in UNITS) if (UNITS[u][field] === id && (!UNITS[u].unique || UNITS[u].unique === p.key) && unitTypeFor(p, u) === u) out.push(UNITS[u].name);
  for (const d in DISTRICTS) if (DISTRICTS[d][field] === id) out.push(DISTRICTS[d].name);
  for (const b in BUILDINGS) if (BUILDINGS[b][field] === id && (!BUILDINGS[b].unique || BUILDINGS[b].unique === p.key) && buildingFor(p, b) === b) out.push(BUILDINGS[b].name);
  for (const w in WONDERS) if (WONDERS[w][field] === id) out.push(WONDERS[w].name + ' (Wonder)');
  if (kind === 'tech') {
    for (const i in IMPROVEMENTS) if (IMPROVEMENTS[i].tech === id) out.push(IMPROVEMENTS[i].name);
    for (const pr in PROJECTS) if (PROJECTS[pr].tech === id && !PROJECTS[pr].req) out.push(PROJECTS[pr].name);
  } else {
    for (const g in GOVERNMENTS) if (GOVERNMENTS[g].civic === id) out.push(GOVERNMENTS[g].name + ' (Government)');
    for (const pl in POLICIES) if (POLICIES[pl].civic === id) out.push(POLICIES[pl].name);
  }
  return out;
}

function treePanel(kind) {
  const p = player();
  const T = kind === 'tech' ? TECHS : CIVICS;
  const known = kind === 'tech' ? p.techs : p.civics;
  const prog = kind === 'tech' ? p.techProg : p.civicProg;
  const cur = kind === 'tech' ? p.researching : p.civicing;
  const goal = kind === 'tech' ? p.techGoal : p.civicGoal;
  const costF = kind === 'tech' ? techCost : civicCost;
  const y = civYields(p);
  const rate = kind === 'tech' ? y.s : y.c;
  const goalPath = goal ? pathTo(p, goal, T, known) : [];
  let h = `<p class="note">${kind === 'tech' ? 'Science' : 'Culture'}: ${sign(rate)} per turn. Pick any card; locked ones queue their prerequisites. A ${kind === 'tech' ? 'Eureka' : 'Inspiration'} gives ${Math.round((modsOf(p).boostPct || 0.4) * 100)}% of the cost when its condition is met.</p><div class="tree">`;
  for (let e = 0; e < ERAS.length; e++) {
    const ids = Object.keys(T).filter(t => T[t].era === e);
    if (!ids.length) continue;
    h += `<div class="era"><h3>${ERAS[e]}</h3>`;
    for (const t of ids.sort((a, b) => T[a].cost - T[b].cost)) {
      const done = !!known[t];
      const avail = !done && T[t].req.every(r => known[r]);
      const cls = done ? 'done' : t === cur ? 'cur' : goalPath.includes(t) ? 'goal' : avail ? 'avail' : 'locked';
      const cost = costF(t);
      const pr = prog[t] || 0;
      const b = T[t].boost;
      const boosted = p.boosted[(kind === 'tech' ? 'tech:' : 'civic:') + t];
      const ul = unlocksOf(kind, t);
      h += `<button class="tech ${kind === 'civic' ? 'civic' : ''} ${cls}" data-${kind}="${t}" ${done ? 'disabled' : ''}>
        <span class="nm">${esc(T[t].name)}<span>${done ? 'Done' : `${cost} · ${turnsFor(cost - pr, rate)}t`}</span></span>
        ${!done && pr > 0 ? `<span class="pbar"><i style="width:${Math.min(100, pr / cost * 100)}%"></i></span>` : ''}
        ${b ? `<span class="bst ${boosted ? 'ok' : ''}">${boosted ? '✓ ' : '◇ '}${esc(b.d)}</span>` : ''}
        ${ul.length || T[t].desc ? `<span class="ul">${esc(ul.join(', '))}${T[t].desc ? (ul.length ? '. ' : '') + esc(T[t].desc) : ''}</span>` : ''}
        ${T[t].req.length && !done ? `<span class="rq">Needs ${esc(T[t].req.map(r => T[r].name).join(', '))}</span>` : ''}
      </button>`;
    }
    h += '</div>';
  }
  return h + '</div>';
}
const techPanel = () => treePanel('tech');
const civicPanel = () => treePanel('civic');

function govPanel() {
  const p = player();
  if (!p.gov) return '<p class="note">Complete the civic Code of Laws to establish your first government, Chiefdom.</p>';
  let h = `<section class="blk"><h3>Government</h3><div class="gov-grid">`;
  for (const g in GOVERNMENTS) {
    const G2 = GOVERNMENTS[g];
    const ok = hasCivic(p, G2.civic);
    h += `<button class="gov ${p.gov === g ? 'on' : ''}" data-gov="${g}" ${ok ? '' : 'disabled'}>
      <b>${esc(G2.name)}</b><div class="note">${G2.slots.map((n, i) => `${n} ${SLOT_NAMES[i]}`).join(' · ')}</div>
      <div style="font-size:13px">${esc(G2.desc)}</div>${ok ? '' : `<div class="note">Needs ${esc(CIVICS[G2.civic].name)}</div>`}</button>`;
  }
  h += `</div></section><section class="blk"><h3>Policy cards</h3><p class="note">Slot cards freely. Wildcard slots take any card.</p><div class="slots">`;
  const counts = slotCounts(p);
  const colors = ['#e8675d', '#f2c343', '#6fa8ec', '#c28ae8'];
  const used = new Set(p.slots.flat());
  for (let k = 0; k < 4; k++) {
    for (let j = 0; j < counts[k]; j++) {
      const curP = p.slots[k][j] || '';
      const opts = Object.keys(POLICIES).filter(pl => policyUnlocked(p, pl) && (k === 3 || POLICIES[pl].slot === k) && (!used.has(pl) || pl === curP));
      h += `<div class="slot"><span class="label"><i style="background:${colors[k]}"></i>${SLOT_NAMES[k]}</span>
        <select id="slot-${k}-${j}" data-slot="${k}:${j}"><option value="">Empty</option>${opts.map(pl => `<option value="${pl}" ${pl === curP ? 'selected' : ''}>${esc(POLICIES[pl].name)}</option>`).join('')}</select>
        <span class="note">${curP ? esc(POLICIES[curP].desc) : `${opts.length} card${opts.length === 1 ? '' : 's'} available`}</span></div>`;
    }
  }
  h += '</div></section>';
  return h;
}

function religionPanel() {
  const p = player();
  let h = `<section class="blk"><h3>Faith</h3><p>${ico('fa')} ${Math.floor(p.faith)} faith. A pantheon costs ${pantheonCost()}; a religion costs ${religionCost()} and needs a finished Holy Site. ${maxReligions() - G.religions.length} of ${maxReligions()} religions can still be founded.</p></section>`;
  if (!p.pantheon) {
    const taken = takenPantheons();
    h += `<section class="blk"><h3>Choose a pantheon</h3><div class="optlist">`;
    for (const k in PANTHEONS) h += `<button class="opt" data-pantheon="${k}" ${canFoundPantheon(p) && !taken.has(k) ? '' : 'disabled'}><b>${esc(PANTHEONS[k].name)}</b>${taken.has(k) ? ' <span class="muted">(taken)</span>' : ''}<div class="note">${esc(PANTHEONS[k].desc)}</div></button>`;
    h += `</div></section>`;
  } else h += `<section class="blk"><h3>Pantheon</h3><p><b>${esc(PANTHEONS[p.pantheon].name)}</b>: ${esc(PANTHEONS[p.pantheon].desc)}</p></section>`;
  if (p.religion) {
    h += `<section class="blk"><h3>${esc(p.religion.name)}</h3><p><b>${esc(FOUNDER_BELIEFS[p.religion.founder].name)}</b>: ${esc(FOUNDER_BELIEFS[p.religion.founder].desc)}<br><b>${esc(FOLLOWER_BELIEFS[p.religion.follower].name)}</b>: ${esc(FOLLOWER_BELIEFS[p.religion.follower].desc)}</p></section>`;
  } else if (p.pantheon) {
    const tb = takenBeliefs();
    const used = new Set(G.religions.map(r => r.name));
    const can = canFoundReligion(p);
    h += `<section class="blk"><h3>Found a religion</h3>${can ? '' : '<p class="note">Build a Holy Site and gather enough faith to found one.</p>'}
      <div class="slots">
        <div class="slot"><span class="label">Name</span><select id="rel-name">${RELIGION_NAMES.filter(n => !used.has(n)).map(n => `<option>${esc(n)}</option>`).join('')}</select></div>
        <div class="slot"><span class="label">Founder belief</span><select id="rel-founder">${Object.keys(FOUNDER_BELIEFS).filter(b => !tb.has(b)).map(b => `<option value="${b}">${esc(FOUNDER_BELIEFS[b].name)}: ${esc(FOUNDER_BELIEFS[b].desc)}</option>`).join('')}</select></div>
        <div class="slot"><span class="label">Follower belief</span><select id="rel-follower">${Object.keys(FOLLOWER_BELIEFS).filter(b => !tb.has(b)).map(b => `<option value="${b}">${esc(FOLLOWER_BELIEFS[b].name)}: ${esc(FOLLOWER_BELIEFS[b].desc)}</option>`).join('')}</select></div>
      </div><div class="actions" style="margin-top:8px"><button class="btn primary" data-religion="1" ${can ? '' : 'disabled'}>Found religion</button></div></section>`;
  }
  h += `<section class="blk"><h3>World religions</h3>${G.religions.length ? `<table class="tb"><tr><th>Religion</th><th>Founded by</th></tr>${G.religions.map(r => `<tr><td>${esc(r.name)}</td><td>${player().met[r.civ] || r.civ === G.player ? esc(G.civs[r.civ].name) : 'Unknown civilization'}</td></tr>`).join('')}</table>` : '<p class="note">No religion has been founded yet.</p>'}</section>`;
  return h;
}

function diploPanel() {
  const p = player();
  const met = G.civs.filter(c => !c.isBarb && c.id !== p.id && p.met[c.id]);
  const unmet = G.civs.filter(c => !c.isBarb && c.id !== p.id && !p.met[c.id]).length;
  const myP = militaryPower(p) + 1;
  let h = `<p class="note">You have met ${met.length} civilization${met.length === 1 ? '' : 's'}; ${unmet} remain unknown.</p>`;
  for (const c of met) {
    const war = isAtWar(p.id, c.id);
    const ratio = (militaryPower(c) + 1) / myP;
    const rel = ratio > 1.4 ? '<span class="bad">much stronger</span>' : ratio > 1.1 ? 'stronger' : ratio < 0.7 ? '<span class="good">much weaker</span>' : ratio < 0.9 ? 'weaker' : 'about equal';
    const offer = c.peaceOffer && c.peaceOffer[p.id];
    const d = CIVS[c.key];
    h += `<div class="civrow"><span class="emblem" style="background:${c.color};color:${c.text};border-color:${shade(c.color, -0.45)}">${esc(c.name[0])}</span>
      <div><b>${esc(c.leader)}</b> of <b>${esc(c.name)}</b> ${d.isNew ? '<span class="newtag">NEW</span>' : ''} ${c.alive ? '' : '<span class="bad">(eliminated)</span>'}
        <div class="note">${esc(d.ability)}: ${esc(d.abilityDesc)}</div>
        <div class="note">${war ? `<span class="bad">At war</span> for ${c.warTurns[p.id] || p.warTurns[c.id] || 0} turns` : 'At peace'} · Military ${rel} · Score ${score(c)}</div></div>
      <div class="actions" style="flex-direction:column">${!c.alive ? '' : offer ? `<button class="btn primary" data-peace-accept="${c.id}">Accept peace</button><button class="btn" data-peace-decline="${c.id}">Decline</button>`
        : war ? `<button class="btn" data-peace="${c.id}">Propose peace</button>` : `<button class="btn danger" data-war="${c.id}">Declare war</button>`}</div></div>`;
  }
  return h;
}

function empirePanel() {
  const p = player();
  const hb = happinessBreakdown(p);
  const y = civYields(p);
  let h = `<section class="blk"><h3>Happiness · ${hb.total}</h3><table class="tb">${hb.rows.map(r => `<tr><td>${esc(r[0])}</td><td class="n ${r[1] < 0 ? 'bad' : 'good'}">${r[1] > 0 ? '+' : ''}${r[1]}</td></tr>`).join('')}</table>
    <p class="note">Unhappy empires grow at a quarter of the normal rate. At −10 or worse, growth stops, Settlers can't be trained and units fight at −5. Surplus happiness builds toward Golden Ages (${Math.floor(p.gaPts)}/${gaNeeded(p)}).</p></section>`;
  h += `<section class="blk"><h3>Treasury</h3><table class="tb">
    <tr><td>Gold from cities</td><td class="n">${sign(y.g)}</td></tr>
    <tr><td>Unit upkeep</td><td class="n bad">−${unitUpkeep(p)}</td></tr>
    <tr><td>District maintenance</td><td class="n bad">−${districtUpkeep(p)}</td></tr>
    <tr><td><b>Net per turn</b></td><td class="n"><b>${sign(y.gNet)}</b></td></tr></table></section>`;
  h += `<section class="blk"><h3>Cities</h3><div style="overflow-x:auto"><table class="tb"><tr><th>City</th><th class="n">Pop</th><th class="n">${ico('f')}</th><th class="n">${ico('p')}</th><th class="n">${ico('g')}</th><th class="n">${ico('s')}</th><th class="n">${ico('c')}</th><th>Producing</th></tr>`;
  for (const ct of civCities(p)) {
    const cy = cityYields(ct);
    h += `<tr><td><button class="btn small" data-goto-city="${ct.id}">${esc(ct.name)}${ct.capital ? ' ★' : ''}</button></td><td class="n">${ct.pop}</td><td class="n">${sign(cy.net)}</td><td class="n">${fmt(cy.p)}</td><td class="n">${fmt(cy.g)}</td><td class="n">${fmt(cy.s)}</td><td class="n">${fmt(cy.c)}</td><td>${ct.build ? esc(itemName(ct.build)) : '<span class="bad">Nothing</span>'}</td></tr>`;
  }
  h += `</table></div></section>`;
  const known = G.civs.filter(c => !c.isBarb && (c.id === p.id || p.met[c.id])).sort((a, b) => score(b) - score(a));
  h += `<section class="blk"><h3>Scores</h3><p class="note">Win by Science (launch the Mars Colony), by Domination (hold every original capital) or by Score at turn ${G.maxTurns}.</p><table class="tb">${known.map(c => `<tr><td><span style="color:${c.color}">■</span> ${esc(c.name)}</td><td class="n">${score(c)}</td><td class="n">${Object.keys(c.projects).length}/3 launches</td></tr>`).join('')}</table></section>`;
  const logs = G.log.filter(l => l.civ === G.player || l.civ === -2).slice(-60).reverse();
  h += `<section class="blk"><h3>Chronicle</h3><div class="loglist">${logs.map(l => `<div><span class="t">T${l.t}</span>${esc(l.msg)}</div>`).join('')}</div></section>`;
  return h;
}

function onDrawerClick(e) {
  const p = player();
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.tech) { setResearch(p, d.tech); toast(`Researching ${TECHS[p.researching].name}${p.techGoal ? ` toward ${TECHS[p.techGoal].name}` : ''}.`); }
  else if (d.civic) { setCivic(p, d.civic); toast(`Developing ${CIVICS[p.civicing].name}${p.civicGoal ? ` toward ${CIVICS[p.civicGoal].name}` : ''}.`); }
  else if (d.gov) { if (p.gov !== d.gov) { setGovernment(p, d.gov); toast(`${GOVERNMENTS[d.gov].name} established.`, 'good'); } }
  else if (d.pantheon) { if (foundPantheon(p, d.pantheon)) toast(`You adopted ${PANTHEONS[d.pantheon].name}.`, 'good'); }
  else if (d.religion) {
    const name = $('#rel-name').value, f = $('#rel-founder').value, fo = $('#rel-follower').value;
    if (foundReligion(p, name, f, fo)) toast(`You founded ${name}!`, 'good');
  }
  else if (d.war) { declareWar(p, G.civs[+d.war]); }
  else if (d.peace) {
    const c = G.civs[+d.peace];
    if (aiAcceptsPeace(c, p)) { makePeace(p, c); toast(`${c.name} accepts peace.`, 'good'); }
    else toast(`${c.leader} refuses. Try again after more fighting, or once you are stronger.`, 'bad');
  }
  else if (d.peaceAccept) { makePeace(p, G.civs[+d.peaceAccept]); }
  else if (d.peaceDecline) { delete G.civs[+d.peaceDecline].peaceOffer[p.id]; }
  else if (d.gotoCity) { const ct = cityById(+d.gotoCity); closeDrawer(); selectCity(ct, true); return; }
  renderDrawer(); renderTop(); renderEnd(); renderSide();
}

function onDrawerChange(e) {
  const p = player();
  const t = e.target;
  if (t.dataset.slot) {
    const [k, j] = t.dataset.slot.split(':').map(Number);
    p.slots[k][j] = t.value || undefined;
    p.slots[k] = p.slots[k].filter(Boolean);
    renderDrawer(); renderTop(); renderSide();
  }
}

// ---------------------------------------------------------------------------
// toasts, modal, menu, victory
// ---------------------------------------------------------------------------
function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  const box = $('#toasts');
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), 5500);
}

function showModal(html) { $('#mbox').innerHTML = html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; }

function showMenu() {
  showModal(`<h2>Menu</h2><div class="mb">
    <p class="note">The game saves itself in this browser at the end of every turn.</p>
    <div class="actions"><button class="btn" data-m="close">Back to game</button><button class="btn" data-m="save">Save now</button><button class="btn danger" data-m="new">New game</button></div>
    <div><div class="label">How to play</div>
    <p class="note">Found your capital with the Settler (B). Tap a unit, then tap a tile to move; right-click moves or attacks at once. Pick research, civics and production when the seal in the corner asks. Builders spend charges on Farms, Mines and resource improvements; districts like the Campus take a tile and earn adjacency bonuses from mountains, forests and each other. Luxuries keep your empire happy. Enter ends the turn, N jumps to the next unit, arrows pan, +/− zoom.</p></div></div>`);
}

function showVictory() {
  if (!G.winner) return;
  const w = G.civs[G.winner.civ];
  const won = w && w.isPlayer && G.winner.type !== 'Defeat';
  const title = won ? `${G.winner.type} Victory` : G.winner.type === 'Defeat' ? 'Your civilization has fallen' : `${w ? w.name : 'A rival'} wins`;
  const text = won ? `${esc(player().leader)} leads ${esc(player().name)} to a ${G.winner.type.toLowerCase()} victory in ${yearOf(G.turn)}.`
    : G.winner.type === 'Defeat' ? 'Your last city has been lost.' : `${esc(w.leader)} of ${esc(w.name)} achieved a ${G.winner.type} Victory in ${yearOf(G.turn)}.`;
  showModal(`<h2>${title}</h2><div class="mb"><p>${text}</p>
    <table class="tb">${G.civs.filter(c => !c.isBarb).sort((a, b) => score(b) - score(a)).map(c => `<tr><td><span style="color:${c.color}">■</span> ${esc(c.name)} ${c.alive ? '' : '<span class="muted">(eliminated)</span>'}</td><td class="n">${score(c)}</td></tr>`).join('')}</table>
    <div class="actions"><button class="btn" data-m="close">Look at the map</button><button class="btn primary" data-m="new">New game</button></div></div>`);
}

function onModalClick(e) {
  const b = e.target.closest('[data-m]');
  if (!b) { if (e.target.id === 'modal') closeModal(); return; }
  const m = b.dataset.m;
  if (m === 'close') closeModal();
  else if (m === 'save') { autosave(); toast('Game saved in this browser.', 'good'); closeModal(); }
  else if (m === 'new') { closeModal(); showSetup(); }
}

// ---------------------------------------------------------------------------
// setup screen
// ---------------------------------------------------------------------------
const setupState = { civ: null, numAI: 5, size: 'standard', difficulty: 'prince', speed: 'quick' };

function loadSaved() { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } }

function showSetup() {
  $('#top').hidden = true; $('#corner').hidden = true; $('#drawer').hidden = true; UI.drawer = null;
  $('#side').innerHTML = '';
  if (!setupState.civ) setupState.civ = pick(Object.keys(CIVS));
  const saved = loadSaved();
  let savedInfo = null;
  if (saved) { try { const s = JSON.parse(saved); if (!s.over) savedInfo = { turn: s.turn, civ: s.civs[s.player].name }; } catch (e) { savedInfo = null; } }
  const opt = (id, label, vals, cur) => `<div class="field"><label for="${id}">${label}</label><select id="${id}" data-setup="${id}">${vals.map(([v, n]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
  const cards = Object.keys(CIVS).map(k => {
    const d = CIVS[k];
    const U = UNITS[d.uu];
    const B = d.ub ? BUILDINGS[d.ub] : null;
    return `<button class="civcard ${setupState.civ === k ? 'on' : ''}" data-civ="${k}">
      <span class="emblem" style="background:${d.color};color:${d.text};border-color:${shade(d.color, -0.45)}">${esc(d.name[0])}</span>
      <span class="cn">${esc(d.name)} ${d.isNew ? '<span class="newtag">NEW</span>' : ''}</span>
      <span class="ld">${esc(d.leader)}</span>
      <span class="ab"><b>${esc(d.ability)}.</b> ${esc(d.abilityDesc)}</span>
      <span class="uu">Unique unit: ${esc(U.name)} (replaces ${esc(UNITS[U.replaces].name)})${B ? ` · Unique building: ${esc(B.name)}` : ''}</span>
    </button>`;
  }).join('');
  $('#setup').innerHTML = `<div class="setup-in">
    <div class="hero"><h1>Epochs of Empire</h1>
      <p>A turn-based 4X on a hex map. Civilization V's one-unit-per-tile combat, global happiness and luxury resources meet Civilization VI's districts, builder charges, Eurekas, a civics tree and policy-card governments. Choose one of fifteen peoples, seven of which appear in neither game.</p></div>
    <div class="setup-opts">
      ${opt('numAI', 'RIVALS', [[3, '3 rivals'], [4, '4 rivals'], [5, '5 rivals'], [6, '6 rivals'], [7, '7 rivals'], [9, '9 rivals']], setupState.numAI)}
      ${opt('size', 'MAP SIZE', Object.keys(MAP_SIZES).map(k => [k, `${MAP_SIZES[k].name} (${MAP_SIZES[k].W}×${MAP_SIZES[k].H})`]), setupState.size)}
      ${opt('difficulty', 'DIFFICULTY', Object.keys(DIFFICULTIES).map(k => [k, DIFFICULTIES[k].name]), setupState.difficulty)}
      ${opt('speed', 'GAME SPEED', Object.keys(SPEEDS).map(k => [k, `${SPEEDS[k].name} (${SPEEDS[k].turns} turns)`]), setupState.speed)}
    </div>
    <div class="begin"><button class="btn primary" data-start="1">Found ${esc(CIVS[setupState.civ].name)}</button>${savedInfo ? `<button class="btn" data-continue="1">Continue as ${esc(savedInfo.civ)}, turn ${savedInfo.turn}</button>` : ''}</div>
    <div class="legend"><span><span class="newtag">NEW</span> appears in neither Civilization V nor VI</span><span>Every civ has a unique ability and unit</span></div>
    <div class="civgrid">${cards}</div>
  </div>`;
}

function onSetupClick(e) {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.civ) { setupState.civ = b.dataset.civ; showSetup(); return; }
  if (b.dataset.start) {
    newGame({ civ: setupState.civ, numAI: +setupState.numAI, size: setupState.size, difficulty: setupState.difficulty, speed: setupState.speed });
    startUI();
    return;
  }
  if (b.dataset.continue) {
    try { deserialize(loadSaved()); startUI(); } catch (err) { toast('That save could not be loaded.', 'bad'); }
  }
}
function onSetupChange(e) {
  const k = e.target.dataset.setup;
  if (k) setupState[k] = e.target.value;
}

function startUI() {
  $('#setup').innerHTML = '';
  $('#top').hidden = false; $('#corner').hidden = false;
  UI.tileShade = null; UI.sel = null; UI.mode = null; UI.pending = null; UI.drawer = null;
  $('#drawer').hidden = true;
  resize();
  mini.width = mini.clientWidth * UI.dpr; mini.height = mini.clientHeight * UI.dpr;
  updateVisibility(player());
  const s = G.units.find(u => u.civ === G.player && u.type === 'settler');
  const cap = capitalOf(player());
  if (s) { centerOn(s.x, s.y); selectUnit(s); }
  else if (cap) { centerOn(cap.x, cap.y); refreshSel(); }
  else refreshSel();
  if (G.over) showVictory();
}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------
function initUI() {
  cv = $('#map'); ctx = cv.getContext('2d');
  mini = $('#mini'); mctx = mini.getContext('2d');
  Hooks.log = (msg, kind) => { if (!UI.busy || kind !== 'info') toast(msg, kind); };
  Hooks.vis = () => {};
  window.addEventListener('resize', () => { if (G) { resize(); clampCam(); } });
  cv.addEventListener('pointerdown', onPointerDown);
  cv.addEventListener('pointermove', onPointerMove);
  cv.addEventListener('pointerup', onPointerUp);
  cv.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); drag = null; pinch = null; });
  cv.addEventListener('pointerleave', () => { $('#tip').hidden = true; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); if (G) zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.offsetX, e.offsetY); }, { passive: false });
  mini.addEventListener('click', e => {
    const r = mini.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * (G.W + 0.5));
    const y = Math.floor((e.clientY - r.top) / r.height * G.H);
    if (inMap(x, y)) centerOn(x, y);
  });
  $('#zin').onclick = () => zoomAt(1.2, cv.clientWidth / 2, cv.clientHeight / 2);
  $('#zout').onclick = () => zoomAt(1 / 1.2, cv.clientWidth / 2, cv.clientHeight / 2);
  $('#endTurn').onclick = () => endTurnClick(false);
  $('#forceEnd').onclick = () => endTurnClick(true);
  $('#top').addEventListener('click', e => {
    const b = e.target.closest('[data-open],[data-menu]');
    if (!b) return;
    if (b.dataset.menu) return showMenu();
    if (UI.drawer === b.dataset.open) closeDrawer(); else openDrawer(b.dataset.open);
  });
  $('#drClose').onclick = closeDrawer;
  $('#drBody').addEventListener('click', onDrawerClick);
  $('#drBody').addEventListener('change', onDrawerChange);
  $('#side').addEventListener('click', onSideClick);
  $('#side').addEventListener('change', e => {
    if (e.target.dataset.focus) { const ct = cityById(+e.target.dataset.focus); ct.focus = e.target.value; assignWorkers(ct); refreshSel(); }
  });
  $('#side').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.build) { e.preventDefault(); e.target.click(); } });
  $('#modal').addEventListener('click', onModalClick);
  $('#setup').addEventListener('click', onSetupClick);
  $('#setup').addEventListener('change', onSetupChange);
  window.addEventListener('keydown', onKey);
  requestAnimationFrame(frame);
}

function boot(data) {
  initUI();
  if (data && data.save) {
    try { deserialize(data.save); startUI(); return; } catch (e) { /* fall through to setup */ }
  }
  showSetup();
}

if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
  window.claude.hot.snapshot(() => (G && !$('#setup').innerHTML ? { save: serialize() } : {}));
}
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
