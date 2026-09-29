// East Ridge / highway decor (rg_*): overpass piers, guard rails, deck ends, signs, gantry, wrecks, deathclaw scratches.
// Painters draw inside the world-space box d.x,d.y,d.w,d.h; standing objects sit on the bottom edge. All randomness from r.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const K = CD.decor.kinds;
const PI = Math.PI, TAU = PI * 2;
const F_SANS = '"Liberation Sans","Helvetica Neue",Helvetica,Arial,"DejaVu Sans",sans-serif';

function vg(g, y0, y1, st) { const gr = g.createLinearGradient(0, y0, 0, y1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
function hg(g, x0, x1, st) { const gr = g.createLinearGradient(x0, 0, x1, 0); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
function rgb(c, k) { k = k === undefined ? 1 : k; return 'rgb(' + Math.min(255, c[0] * k | 0) + ',' + Math.min(255, c[1] * k | 0) + ',' + Math.min(255, c[2] * k | 0) + ')'; }
function contact(g, x, w, gy, a) { g.save(); g.translate(x + w / 2, gy); g.scale(1, 5 / (w / 2)); const gr = g.createRadialGradient(0, 0, 0, 0, 0, w / 2); gr.addColorStop(0, 'rgba(8,4,6,' + a + ')'); gr.addColorStop(1, 'rgba(8,4,6,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w / 2, PI, TAU); g.fill(); g.restore(); }
function speckle(g, x, y, w, h, r, n, cols) { for (let i = 0; i < n; i++) { g.fillStyle = cols[(r.next() * cols.length) | 0]; g.fillRect(x + r.next() * w, y + r.next() * h, 0.8 + r.next() * 1.6, 0.8 + r.next() * 1.2); } }
function concrete(g, x, y, w, h, r, base) {
  base = base || [132, 126, 116];
  g.fillStyle = vg(g, y, y + h, [[0, rgb(base, 1.18)], [0.5, rgb(base, 1)], [1, rgb(base, 0.66)]]); g.fillRect(x, y, w, h);
  g.fillStyle = hg(g, x, x + w, [[0, 'rgba(8,8,20,0.22)'], [0.55, 'rgba(0,0,0,0)'], [1, 'rgba(255,232,190,0.16)']]); g.fillRect(x, y, w, h);
  speckle(g, x, y, w, h, r, Math.round(w * h / 70), ['rgba(30,24,20,0.35)', 'rgba(255,240,214,0.22)', 'rgba(90,80,70,0.4)']);
  for (let i = 0; i < Math.round(w / 26); i++) { const sx = x + r.next() * w, len = r.range(20, Math.min(h, 120)); const gr = g.createLinearGradient(0, y, 0, y + len); gr.addColorStop(0, 'rgba(34,26,20,0.32)'); gr.addColorStop(1, 'rgba(34,26,20,0)'); g.fillStyle = gr; g.fillRect(sx, y + r.range(0, h * 0.3), r.range(1.5, 5), len); }
}
function rebar(g, x, y, len, ang, r) { g.save(); g.translate(x, y); g.rotate(ang); g.lineCap = 'round'; g.strokeStyle = 'rgba(8,4,6,0.6)'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(len, r.range(-3, 3)); g.stroke(); g.strokeStyle = 'rgb(128,72,38)'; g.lineWidth = 2; g.stroke(); g.strokeStyle = 'rgba(255,200,140,0.5)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(0, -0.7); g.lineTo(len, -0.7); g.stroke(); g.restore(); }
function text(g, s, x, y, size, col, o) { o = o || {}; g.save(); g.font = (o.style || 'bold') + ' ' + size + 'px ' + F_SANS; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; const w = g.measureText(s).width; g.translate(x, y); if (o.maxW && w > o.maxW) g.scale(o.maxW / w, 1); g.fillText(s, 0, 0); g.restore(); }
function hole(g, x, y, r0) { g.fillStyle = 'rgba(120,64,30,0.32)'; g.beginPath(); g.arc(x, y, r0 * 1.9, 0, TAU); g.fill(); g.fillStyle = 'rgba(6,4,6,0.95)'; g.beginPath(); g.arc(x, y, r0 * 1.2, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,236,200,0.45)'; g.lineWidth = 0.7; g.beginPath(); g.arc(x, y, r0 * 1.1, -2.2, -0.6); g.stroke(); }
function rustStreaks(g, x, y, w, n, r, len) { for (let i = 0; i < n; i++) { const sx = x + r.next() * w, l = r.range(10, len || 40); const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(110,52,24,0.4)'); gr.addColorStop(1, 'rgba(110,52,24,0)'); g.fillStyle = gr; g.fillRect(sx, y, r.range(1.2, 3.4), l); } }
function edgeLight(g, x, y, w, h) { g.strokeStyle = 'rgba(255,236,196,0.4)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y + 0.6); g.lineTo(x + w, y + 0.6); g.moveTo(x + w - 0.6, y); g.lineTo(x + w - 0.6, y + h); g.stroke(); g.strokeStyle = 'rgba(10,6,14,0.4)'; g.beginPath(); g.moveTo(x + 0.6, y); g.lineTo(x + 0.6, y + h); g.moveTo(x, y + h - 0.6); g.lineTo(x + w, y + h - 0.6); g.stroke(); }

// ---- concrete pier under the overpass (3x10): three variants of damage
K.rg_pier = function (g, d, r) {
  const v = (d.p && d.p.v) || 0; g.save(); contact(g, d.x - 6, d.w + 12, d.y + d.h, 0.5);
  const x = d.x + 6, w = d.w - 12, y = d.y, h = d.h;
  concrete(g, x, y, w, h, r, [128, 122, 112]);
  for (let yy = y + 60; yy < y + h; yy += 90) { g.fillStyle = 'rgba(8,6,10,0.38)'; g.fillRect(x, yy, w, 2); g.fillStyle = 'rgba(255,240,208,0.16)'; g.fillRect(x, yy + 2, w, 1); }
  if (v >= 1) { const sy = y + h * 0.35, sw = w * 0.5; g.fillStyle = 'rgba(28,18,14,0.9)'; g.beginPath(); g.moveTo(x + w * 0.2, sy); for (let i = 0; i <= 6; i++) g.lineTo(x + w * 0.2 + sw * i / 6, sy + r.range(-6, 6)); g.lineTo(x + w * 0.2 + sw, sy + 70); for (let i = 6; i >= 0; i--) g.lineTo(x + w * 0.2 + sw * i / 6, sy + 70 + r.range(-8, 8)); g.closePath(); g.fill(); for (let i = 0; i < 5; i++) rebar(g, x + w * 0.24 + i * sw / 5, sy + 6, r.range(24, 50), 0.2 + r.range(0, 0.7), r); }
  if (v >= 2) { g.strokeStyle = 'rgba(8,4,6,0.6)'; g.lineWidth = 1.6; g.beginPath(); let cx = x + w * 0.7, cy = y + 30; g.moveTo(cx, cy); while (cy < y + h - 30) { cx += r.range(-8, 8); cy += r.range(14, 30); g.lineTo(cx, cy); } g.stroke(); }
  g.fillStyle = 'rgba(180,160,40,0.9)'; for (let i = 0; i < 4; i++) g.fillRect(x, y + h - 26 + 0, w, 0); // (no stripe: kept clean)
  edgeLight(g, x, y, w, h);
  const cap = y; g.fillStyle = vg(g, cap, cap + 16, [[0, '#a8a090'], [1, '#6a6458']]); g.fillRect(d.x, cap, d.w, 16); edgeLight(g, d.x, cap, d.w, 16);
  g.restore();
};
// ---- guard rail / jersey barrier (w x 1.6)
K.rg_rail = function (g, d, r) {
  const v = (d.p && d.p.v) || 0, broken = d.p && d.p.broken; const gy = d.y + d.h; g.save(); contact(g, d.x, d.w, gy, 0.4);
  if (v === 1) {   // concrete jersey barrier segments
    for (let x = d.x; x < d.x + d.w - 4; x += 96) { const w = Math.min(92, d.x + d.w - x), pf = new Path2D(); pf.moveTo(x, gy); pf.lineTo(x + 6, gy - 24); pf.lineTo(x + 12, gy - d.h * 0.92); pf.lineTo(x + w - 12, gy - d.h * 0.92); pf.lineTo(x + w - 6, gy - 24); pf.lineTo(x + w, gy); pf.closePath(); g.save(); g.clip(pf); concrete(g, x, gy - d.h, w, d.h, r, [150, 146, 136]); g.restore(); g.strokeStyle = 'rgba(10,6,10,0.4)'; g.lineWidth = 1; g.stroke(pf); }
  } else {         // steel W-beam on posts
    const bw = broken ? Math.floor(d.w * 0.4) : d.w;
    for (let x = d.x + 8; x < d.x + d.w; x += 64) { const dead = broken && x > d.x + bw && x < d.x + bw + 90; if (dead) continue; g.fillStyle = hg(g, x, x + 6, [[0, '#4c5050'], [0.6, '#9a9c96'], [1, '#3c4040']]); g.fillRect(x, gy - d.h * 0.72, 6, d.h * 0.72); }
    const beam = (x0, x1, y, tilt) => { g.save(); g.translate(x0, y); g.rotate(tilt || 0); const L = x1 - x0; g.fillStyle = vg(g, -7, 12, [[0, '#d6d0c0'], [0.3, '#8e908a'], [0.55, '#4e5252'], [0.8, '#7c807a'], [1, '#30343a']]); g.fillRect(0, -7, L, 20); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(0, -6.5, L, 1); speckle(g, 0, -6, L, 18, r, Math.round(L / 6), ['rgba(126,64,30,0.6)', 'rgba(20,14,12,0.4)']); for (let bx = 8; bx < L; bx += 64) { g.fillStyle = '#3a3c3a'; g.fillRect(bx, 0, 3, 3); } g.restore(); };
    beam(d.x, d.x + bw, gy - d.h * 0.62, 0); if (broken) { beam(d.x + bw + 90, d.x + d.w, gy - d.h * 0.62, 0); beam(d.x + bw, d.x + bw + 70, gy - d.h * 0.62 + 4, 0.55); }
  }
  g.restore();
};
K.rg_deckend = function (g, d, r) {
  const side = (d.p && d.p.side) || 1; g.save();
  const x = d.x, y = d.y, w = d.w, h = d.h, pf = new Path2D();
  if (side > 0) { pf.moveTo(x, y); pf.lineTo(x + w, y); pf.lineTo(x + w - 6, y + h * 0.4); pf.lineTo(x + w * 0.7, y + h * 0.55); pf.lineTo(x + w * 0.8, y + h); pf.lineTo(x, y + h); } else { pf.moveTo(x + w, y); pf.lineTo(x, y); pf.lineTo(x + 6, y + h * 0.4); pf.lineTo(x + w * 0.3, y + h * 0.55); pf.lineTo(x + w * 0.2, y + h); pf.lineTo(x + w, y + h); }
  pf.closePath(); g.save(); g.clip(pf); concrete(g, x, y, w, h, r, [134, 128, 118]); g.restore(); g.strokeStyle = 'rgba(10,6,10,0.5)'; g.lineWidth = 1.2; g.stroke(pf);
  for (let i = 0; i < 5; i++) { const ex = side > 0 ? x + w - 8 : x + 8; rebar(g, ex, y + 10 + i * h * 0.16, r.range(20, 46), side > 0 ? r.range(0.1, 0.9) : PI - r.range(0.1, 0.9), r); }
  g.restore();
};
K.rg_slab = function (g, d, r) {
  g.save(); contact(g, d.x, d.w, d.y + d.h, 0.5); const pf = new Path2D(); pf.moveTo(d.x, d.y + d.h); pf.lineTo(d.x + d.w * 0.12, d.y + d.h * 0.2); pf.lineTo(d.x + d.w, d.y + d.h * 0.42); pf.lineTo(d.x + d.w * 0.92, d.y + d.h); pf.closePath();
  g.save(); g.clip(pf); concrete(g, d.x, d.y, d.w, d.h, r, [140, 134, 124]); g.restore(); g.strokeStyle = 'rgba(10,6,10,0.5)'; g.lineWidth = 1.2; g.stroke(pf); for (let i = 0; i < 4; i++) rebar(g, d.x + d.w * (0.2 + i * 0.2), d.y + d.h * 0.32, r.range(14, 30), -1.2 + r.range(-0.3, 0.3), r); g.restore();
};
K.rg_embank = function (g, d, r) { g.save(); concrete(g, d.x, d.y, d.w, d.h, r, [118, 112, 104]); for (let y = d.y + 80; y < d.y + d.h; y += 120) { g.fillStyle = 'rgba(8,6,10,0.4)'; g.fillRect(d.x, y, d.w, 2); } g.restore(); };
K.rg_lamp = function (g, d, r) {
  const bent = d.p && d.p.bent; g.save(); const gy = d.y + d.h, cx = d.x + d.w * 0.35; contact(g, cx - 14, 28, gy, 0.45);
  g.fillStyle = hg(g, cx - 3, cx + 3, [[0, '#4a4e50'], [0.6, '#9a9e9a'], [1, '#3a3e40']]); g.fillRect(cx - 3, d.y + 14, 6, d.h - 14);
  g.lineCap = 'round'; g.strokeStyle = 'rgba(8,6,8,0.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, d.y + 18); g.quadraticCurveTo(cx, d.y + 2, cx + 22, bent ? d.y + 30 : d.y + 6); g.stroke(); g.strokeStyle = '#90948e'; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#5c605e'; g.beginPath(); g.ellipse(cx + 26, bent ? d.y + 34 : d.y + 10, 12, 4, bent ? 0.6 : 0, 0, TAU); g.fill(); g.restore();
};
K.rg_roadsign = function (g, d, r) {
  const p = d.p || {}, cx = d.x + d.w / 2, gy = d.y + d.h, shape = p.shape || 'rect'; g.save(); contact(g, cx - 12, 24, gy, 0.45);
  g.fillStyle = hg(g, cx - 2.5, cx + 2.5, [[0, '#4c5050'], [0.6, '#a0a29c'], [1, '#3a3e40']]); g.fillRect(cx - 2.5, d.y + 46, 5, d.h - 46);
  const sy = d.y + 34;
  if (shape === 'diamond') { const R0 = 34; g.beginPath(); g.moveTo(cx, sy - R0); g.lineTo(cx + R0, sy); g.lineTo(cx, sy + R0); g.lineTo(cx - R0, sy); g.closePath(); g.fillStyle = vg(g, sy - R0, sy + R0, [[0, '#e6be34'], [1, '#b08a22']]); g.fill(); g.strokeStyle = '#1e1a10'; g.lineWidth = 2; g.stroke(); text(g, p.text || 'BRIDGE', cx, sy - 5, 12, '#1c1810', { maxW: 46 }); text(g, p.sub || 'OUT', cx, sy + 9, 12, '#1c1810', { maxW: 40 }); }
  else if (shape === 'shield') { g.beginPath(); g.moveTo(cx - 26, sy - 24); g.quadraticCurveTo(cx, sy - 34, cx + 26, sy - 24); g.lineTo(cx + 24, sy + 6); g.quadraticCurveTo(cx, sy + 40, cx - 24, sy + 6); g.closePath(); g.fillStyle = '#e8e2d0'; g.fill(); g.strokeStyle = '#1c2a24'; g.lineWidth = 2; g.stroke(); text(g, p.text || 'ROUTE 9', cx, sy - 8, 12, '#1a221e', { maxW: 40 }); text(g, p.sub || 'EAST', cx, sy + 8, 11, '#1a221e', { maxW: 36 }); }
  else { g.fillStyle = '#2a6a4a'; g.fillRect(cx - 32, sy - 20, 64, 40); g.strokeStyle = '#e8e2d0'; g.lineWidth = 1.6; g.strokeRect(cx - 29, sy - 17, 58, 34); text(g, p.text || 'EXIT', cx, sy, 13, '#e8e2d0', { maxW: 52 }); }
  for (let i = 0; i < (p.holes || 3); i++) hole(g, cx + r.range(-22, 22), sy + r.range(-18, 18), r.range(1, 1.9));
  rustStreaks(g, cx - 24, sy + 6, 48, 3, r, 30); g.restore();
};
K.rg_stencil = function (g, d, r) {
  const p = d.p || {}; g.save(); const x = d.x, y = d.y, w = d.w, h = d.h;
  g.fillStyle = 'rgba(26,26,28,0.55)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(210,190,90,0.6)'; g.lineWidth = 3; g.strokeRect(x + 6, y + 6, w - 12, h - 12);
  text(g, p.text || 'DEPT OF HIGHWAYS', x + w / 2, y + h * 0.3, 22, 'rgba(226,210,120,0.85)', { maxW: w - 30 }); text(g, p.sub || 'MAINTENANCE', x + w / 2, y + h * 0.55, 16, 'rgba(226,210,120,0.75)', { maxW: w - 40 }); text(g, p.num || '9-B', x + w / 2, y + h * 0.8, 26, 'rgba(226,210,120,0.85)', { maxW: 70 });
  speckle(g, x, y, w, h, r, Math.round(w * h / 40), ['rgba(30,24,20,0.5)', 'rgba(255,240,214,0.18)']); g.restore();
};
K.rg_gantry = function (g, d, r) {
  const p = d.p || {}; g.save(); const x = d.x, y = d.y, w = d.w, h = d.h, gy = y + h;
  for (const px of [x + 30, x + w - 46]) { g.fillStyle = hg(g, px, px + 16, [[0, '#4a4e50'], [0.6, '#a0a29c'], [1, '#3a3e40']]); g.fillRect(px, y + 30, 16, h - 30); }
  g.fillStyle = vg(g, y + 24, y + 48, [[0, '#a8aaa4'], [1, '#484c4c']]); g.fillRect(x + 20, y + 24, w - 40, 24);
  for (let bx = x + 40; bx < x + w - 60; bx += 40) { g.strokeStyle = 'rgba(70,74,74,0.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx, y + 24); g.lineTo(bx + 40, y + 48); g.moveTo(bx + 40, y + 24); g.lineTo(bx, y + 48); g.stroke(); }
  const sx = x + w * 0.2, sw = w * 0.6, sy = y + 60, sh = h - 130; g.fillStyle = 'rgba(8,8,10,0.55)'; g.fillRect(sx + 4, sy + 5, sw, sh);
  g.fillStyle = vg(g, sy, sy + sh, [[0, '#2f7a54'], [1, '#1c5238']]); g.fillRect(sx, sy, sw, sh); g.strokeStyle = '#e8e2d0'; g.lineWidth = 3; g.strokeRect(sx + 8, sy + 8, sw - 16, sh - 16);
  text(g, p.text || 'MERIDIAN 22', sx + sw * 0.4, sy + sh * 0.38, 40, '#f0ead6', { maxW: sw * 0.6 }); text(g, p.sub || 'CINDER RIDGE', sx + sw * 0.4, sy + sh * 0.72, 22, '#f0ead6', { maxW: sw * 0.55 });
  if (p.arrow) { g.fillStyle = '#f0ead6'; g.beginPath(); g.moveTo(sx + sw - 90, sy + sh / 2 - 8); g.lineTo(sx + sw - 50, sy + sh / 2 - 8); g.lineTo(sx + sw - 50, sy + sh / 2 - 22); g.lineTo(sx + sw - 18, sy + sh / 2); g.lineTo(sx + sw - 50, sy + sh / 2 + 22); g.lineTo(sx + sw - 50, sy + sh / 2 + 8); g.lineTo(sx + sw - 90, sy + sh / 2 + 8); g.closePath(); g.fill(); }
  speckle(g, sx, sy, sw, sh, r, 500, ['rgba(20,14,10,0.4)', 'rgba(255,240,210,0.16)']); rustStreaks(g, sx, sy + sh - 4, sw, 8, r, 40); for (let i = 0; i < 6; i++) hole(g, sx + r.range(20, sw - 20), sy + r.range(20, sh - 20), r.range(1.4, 2.4));
  g.restore();
};
K.rg_junk = function (g, d, r) {
  const kind = (d.p && d.p.kind) || 'crates'; const map = { sandbags: 'sf_sandbags', tires: 'sf_tires', crates: 'sf_crates', barrels: 'sf_barrels' };
  if (map[kind] && K[map[kind]]) { K[map[kind]](g, d, r); return; }
  // barbed wire coil
  g.save(); const gy = d.y + d.h; contact(g, d.x, d.w, gy, 0.35); g.strokeStyle = 'rgba(26,24,24,0.9)'; g.lineWidth = 1.4; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(d.x + 12 + i * (d.w - 24) / 8, gy - 12, 10, 11, r.range(-0.2, 0.2), 0, TAU); g.stroke(); }
  g.strokeStyle = 'rgba(190,196,196,0.35)'; g.lineWidth = 0.6; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(d.x + 12 + i * (d.w - 24) / 8, gy - 12.6, 10, 11, 0, PI * 1.1, PI * 1.8); g.stroke(); } g.restore();
};
K.rg_car = function (g, d, r) { if (K.sf_car) K.sf_car(g, d, r); };
K.rg_bus = function (g, d, r) { if (K.sf_bus) K.sf_bus(g, d, r); };
K.rg_billboard = function (g, d, r) {
  // fall:1 = the sign has tipped over the broken deck edge and is caught on its own frame (pivot: bottom-right, the box's right side)
  const p = d.p || {}; if (!K.sf_billboard) return;
  const ad = p.ad === 'poseidon' ? 'vaultec' : (p.ad || 'nuka'), q = Object.assign({}, p, { ad: ad });
  if (!p.fall) { K.sf_billboard(g, Object.assign({}, d, { p: q }), r); return; }
  const th = 0.28, cs = Math.cos(th), sn = Math.sin(th);
  const Hd = Math.min((d.h - 4) / (1.43 * sn + cs), (d.w - 8) / (1.43 * cs + sn)), Wd = Hd * 400 / 280, s = Hd / 280;
  g.save(); g.translate(d.x + d.w - Hd * sn - 4, d.y + d.h); g.rotate(th);
  K.sf_billboard(g, { x: -Wd, y: -Hd, w: Wd, h: Hd, s: d.s, p: q }, r);
  if (p.ad === 'poseidon') {
    g.translate(-Wd, -Hd); g.scale(s, s);                                     // nominal 400x280 frame; the face is (14,10) 372x168
    g.fillStyle = vg(g, 16, 172, [[0, '#1a8ab0'], [1, '#0c4a6c']]); g.fillRect(19, 15, 362, 158);
    g.fillStyle = 'rgba(255,255,255,0.14)'; for (let i = 0; i < 5; i++) g.fillRect(19, 30 + i * 30, 362, 1.5);
    g.fillStyle = '#e8f4f8'; g.beginPath(); g.arc(70, 92, 34, 0, TAU); g.fill(); g.fillStyle = '#0c4a6c'; g.beginPath(); g.arc(70, 92, 27, 0, TAU); g.fill();
    g.strokeStyle = '#e8f4f8'; g.lineWidth = 4; g.lineCap = 'round'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(52, 82 + k * 10); g.quadraticCurveTo(62, 74 + k * 10, 70, 82 + k * 10); g.quadraticCurveTo(78, 90 + k * 10, 88, 82 + k * 10); g.stroke(); }
    const tx = (str, x, y, size, col) => { g.save(); g.font = 'bold ' + size + 'px ' + F_SANS; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = col; const w = g.measureText(str).width, mw = 250; g.translate(x, y); if (w > mw) g.scale(mw / w, 1); g.fillText(str, 0, 0); g.restore(); };
    tx('POSEIDON', 122, 62, 38, '#f0fafc'); tx('ENERGY', 122, 100, 38, '#f0fafc'); tx('POWER FROM THE DEEP', 122, 140, 15, '#bfe6f0');
    g.globalAlpha = 0.5; g.fillStyle = 'rgba(30,20,10,0.6)'; g.beginPath(); g.moveTo(300, 12); g.lineTo(386, 12); g.lineTo(386, 64); g.lineTo(354, 40); g.lineTo(330, 58); g.closePath(); g.fill(); g.globalAlpha = 1;   // peeled corner
  }
  g.restore();
};
K.rg_claws = function (g, d, r) {
  g.save(); const x = d.x, y = d.y, w = d.w, h = d.h;
  for (let i = 0; i < 4; i++) { const sx = x + w * 0.2 + i * w * 0.15, ex = sx + w * 0.22 + r.range(-6, 6); g.strokeStyle = 'rgba(20,14,12,0.85)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, y + 8); g.quadraticCurveTo((sx + ex) / 2 + 8, y + h * 0.5, ex, y + h - 8); g.stroke(); g.strokeStyle = 'rgba(214,206,190,0.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(sx - 2, y + 8); g.quadraticCurveTo((sx + ex) / 2 + 6, y + h * 0.5, ex - 2, y + h - 8); g.stroke(); }
  for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(190,184,170,0.7)'; g.fillRect(x + r.next() * w, y + h - 4 + r.next() * 6, r.range(1, 3), r.range(1, 2.4)); } g.restore();
};
})();
