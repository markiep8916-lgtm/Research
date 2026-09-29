// Cinder Deep decor (dp_*): sterile labs, cryo pods (the 4,000 sleepers), the reactor, the Overseer's brain tank.
// Painters draw inside the world-space box d.x,d.y,d.w,d.h (standing objects sit on the bottom edge). Randomness only from r.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const K = CD.decor.kinds;
const PI = Math.PI, TAU = PI * 2;
const F = '"Liberation Sans","Helvetica Neue",Helvetica,Arial,"DejaVu Sans",sans-serif';

// ---------------------------------------------------------------- helpers
function vg(g, y0, y1, st) { const gr = g.createLinearGradient(0, y0, 0, y1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
function hg(g, x0, x1, st) { const gr = g.createLinearGradient(x0, 0, x1, 0); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
function rg(g, x, y, r0, r1, st) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
function contact(g, x, w, gy, a) { g.save(); g.translate(x + w / 2, gy); g.scale(1, 4 / (w / 2)); const gr = g.createRadialGradient(0, 0, 0, 0, 0, w / 2); gr.addColorStop(0, 'rgba(2,6,8,' + a + ')'); gr.addColorStop(1, 'rgba(2,6,8,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w / 2, PI, TAU); g.fill(); g.restore(); }
function steel(g, x, y, w, h, o) {   // brushed sterile steel plate, lit from the top right
  o = o || {}; const b = o.base || [104, 124, 128];
  g.fillStyle = vg(g, y, y + h, [[0, 'rgb(' + (b[0] * 1.35 | 0) + ',' + (b[1] * 1.35 | 0) + ',' + (b[2] * 1.3 | 0) + ')'], [0.4, 'rgb(' + b[0] + ',' + b[1] + ',' + b[2] + ')'], [1, 'rgb(' + (b[0] * 0.5 | 0) + ',' + (b[1] * 0.55 | 0) + ',' + (b[2] * 0.6 | 0) + ')']]); g.fillRect(x, y, w, h);
  g.fillStyle = hg(g, x, x + w, [[0, 'rgba(0,10,20,0.28)'], [0.55, 'rgba(0,0,0,0)'], [1, 'rgba(210,255,255,0.14)']]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(220,255,255,0.4)'; g.fillRect(x, y, w, 1); g.fillStyle = 'rgba(0,6,10,0.5)'; g.fillRect(x, y + h - 1, w, 1);
}
function bolt(g, x, y, rr) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(x + 0.5, y + 0.8, rr, 0, TAU); g.fill(); g.fillStyle = '#9db4b8'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.4, 0, TAU); g.fill(); }
function glow(g, x, y, rr, col, a) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(g, x, y, 0, rr, [[0, 'rgba(' + col + ',' + a + ')'], [1, 'rgba(' + col + ',0)']]); g.fillRect(x - rr, y - rr, rr * 2, rr * 2); g.restore(); }
function led(g, x, y, col, rr) { rr = rr || 1.6; g.fillStyle = 'rgb(' + col + ')'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); glow(g, x, y, rr * 4, col, 0.55); }
function txt(g, s, x, y, size, col, o) { o = o || {}; g.save(); g.font = (o.style || 'bold') + ' ' + size + 'px ' + F; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.fillStyle = col; const w = g.measureText(s).width; g.translate(x, y); if (o.maxW && w > o.maxW) g.scale(o.maxW / w, 1); g.fillText(s, 0, 0); g.restore(); }
function grime(g, x, y, w, h, r, a) { for (let i = 0; i < Math.round(w / 22); i++) { const sx = x + r.next() * w, l = r.range(14, Math.min(h, 90)); const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(6,16,18,' + (a || 0.3) + ')'); gr.addColorStop(1, 'rgba(6,16,18,0)'); g.fillStyle = gr; g.fillRect(sx, y + r.range(0, h * 0.2), r.range(1.4, 4), l); } }
function glass(g, x, y, w, h, tint, r) {
  g.fillStyle = tint; g.fillRect(x, y, w, h);
  g.fillStyle = hg(g, x, x + w, [[0, 'rgba(0,0,0,0.25)'], [0.3, 'rgba(255,255,255,0)'], [0.75, 'rgba(210,255,255,0.14)'], [1, 'rgba(0,0,0,0.22)']]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(230,255,255,0.35)'; g.beginPath(); g.moveTo(x + w * 0.12, y + 2); g.lineTo(x + w * 0.3, y + 2); g.lineTo(x + w * 0.16, y + h * 0.7); g.lineTo(x + w * 0.06, y + h * 0.7); g.closePath(); g.fill();
}
function bubbles(g, x, y, w, h, r, n) { g.fillStyle = 'rgba(210,255,240,0.5)'; g.strokeStyle = 'rgba(230,255,250,0.5)'; g.lineWidth = 0.6; for (let i = 0; i < n; i++) { const bx = x + r.next() * w, by = y + r.next() * h, br = r.range(0.8, 2.6); g.beginPath(); g.arc(bx, by, br, 0, TAU); g.stroke(); } }
function pipeV(g, x, y, w, h, col) { g.fillStyle = hg(g, x, x + w, [[0, col[0]], [0.35, col[1]], [0.7, col[2]], [1, col[3]]]); g.fillRect(x, y, w, h); }

// ---------------------------------------------------------------- small props
K.dp_beacon = function (g, d, r) { const cx = d.x + d.w / 2, cy = d.y + d.h / 2; steel(g, cx - 9, cy + 4, 18, 8); g.fillStyle = vg(g, cy - 10, cy + 6, [[0, '#ff8a70'], [1, '#a01c14']]); g.beginPath(); g.arc(cx, cy + 4, 9, PI, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy + 4, 7, PI * 1.15, PI * 1.6); g.stroke(); glow(g, cx, cy, 34, '255,60,40', 0.5); };
K.dp_cam = function (g, d, r) { const x = d.x + d.w * 0.2, y = d.y + d.h * 0.35; steel(g, x - 4, y - 10, 8, 20); g.save(); g.translate(x, y); g.rotate(0.25); steel(g, -2, -6, 26, 12, { base: [70, 84, 90] }); g.fillStyle = '#0a1418'; g.beginPath(); g.arc(24, 0, 5, 0, TAU); g.fill(); g.fillStyle = 'rgba(120,200,220,0.5)'; g.beginPath(); g.arc(23, -1, 1.6, 0, TAU); g.fill(); g.restore(); led(g, x + 4, y - 4, '255,50,40', 1.4); };
K.dp_panel = function (g, d, r) {
  const v = (d.p && d.p.v) || 0, x = d.x + 4, y = d.y + 4, w = d.w - 8, h = d.h - 8; steel(g, x, y, w, h, { base: [86, 104, 110] }); g.strokeStyle = 'rgba(0,8,12,0.6)'; g.lineWidth = 1.4; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  for (const [bx, by] of [[x + 4, y + 4], [x + w - 4, y + 4], [x + 4, y + h - 4], [x + w - 4, y + h - 4]]) bolt(g, bx, by, 1.8);
  g.fillStyle = '#081418'; g.fillRect(x + 8, y + 9, w * 0.42, h * 0.34); g.fillStyle = 'rgba(80,255,190,0.7)'; for (let i = 0; i < 4; i++) g.fillRect(x + 11, y + 12 + i * 4, r.range(10, w * 0.36), 1.6);
  for (let i = 0; i < 6; i++) led(g, x + w * 0.58 + (i % 3) * 12, y + 14 + Math.floor(i / 3) * 12, (i + v) % 3 === 0 ? '255,90,60' : (i + v) % 3 === 1 ? '90,255,190' : '255,210,80', 2);
  for (let i = 0; i < 5; i++) { g.fillStyle = '#202c30'; g.fillRect(x + 8 + i * 16, y + h * 0.62, 10, 6); g.fillStyle = 'rgba(200,240,240,0.5)'; g.fillRect(x + 8 + i * 16, y + h * 0.62, 10, 1); }
};
K.dp_server = function (g, d, r) {
  const x = d.x + 6, w = d.w - 12, y = d.y + 4, h = d.h - 4; contact(g, x - 4, w + 8, d.y + d.h, 0.5); steel(g, x, y, w, h, { base: [44, 58, 64] });
  for (let yy = y + 8; yy < y + h - 10; yy += 12) { g.fillStyle = 'rgba(0,6,8,0.7)'; g.fillRect(x + 5, yy, w - 10, 9); for (let k = 0; k < 6; k++) if (r.next() < 0.7) led(g, x + 10 + k * ((w - 20) / 5), yy + 4.5, r.next() < 0.6 ? '90,255,190' : r.next() < 0.5 ? '255,200,70' : '255,80,60', 1.2); }
  g.strokeStyle = 'rgba(180,230,230,0.3)'; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
};
K.dp_shelf = function (g, d, r) {
  const x = d.x + 2, w = d.w - 4, y = d.y + 2, h = d.h - 2; contact(g, x, w, d.y + d.h, 0.45); g.fillStyle = 'rgba(0,10,14,0.45)'; g.fillRect(x, y, w, h);
  for (let i = 0; i < 4; i++) { const sy = y + 6 + i * (h - 8) / 4; steel(g, x, sy + (h - 8) / 4 - 4, w, 4); for (let k = 0; k < 6; k++) { const bw = r.range(8, 20), bx = x + 4 + k * (w - 8) / 6; if (r.next() < 0.5) { g.fillStyle = 'rgb(' + (60 + r.next() * 60 | 0) + ',' + (100 + r.next() * 60 | 0) + ',' + (100 + r.next() * 60 | 0) + ')'; g.fillRect(bx, sy + (h - 8) / 4 - 4 - r.range(12, 24), bw, 20); } else { g.fillStyle = 'rgba(160,240,220,0.5)'; g.beginPath(); g.arc(bx + 6, sy + (h - 8) / 4 - 12, 6, 0, TAU); g.fill(); g.fillStyle = 'rgba(80,220,180,0.5)'; g.fillRect(bx, sy + (h - 8) / 4 - 12, 12, 8); } } }
  g.fillStyle = 'rgba(80,110,116,0.9)'; g.fillRect(x - 2, y, 3, h); g.fillRect(x + w - 1, y, 3, h);
};
K.dp_bench = function (g, d, r) {
  const gy = d.y + d.h; contact(g, d.x, d.w, gy, 0.5); steel(g, d.x + 4, gy - 52, d.w - 8, 8, { base: [190, 206, 208] }); steel(g, d.x + 10, gy - 44, d.w - 20, 44, { base: [70, 92, 98] });
  for (let i = 0; i < 3; i++) { g.strokeStyle = 'rgba(0,8,12,0.5)'; g.strokeRect(d.x + 14 + i * (d.w - 28) / 3, gy - 40, (d.w - 28) / 3 - 4, 36); g.fillStyle = 'rgba(200,240,240,0.5)'; g.fillRect(d.x + 30 + i * (d.w - 28) / 3, gy - 24, 14, 2); }
  for (let k = 0; k < 5; k++) { const bx = d.x + 24 + k * (d.w - 48) / 4, col = ['90,255,190', '255,200,90', '120,190,255', '255,110,120', '190,120,255'][k % 5]; g.fillStyle = 'rgba(' + col + ',0.55)'; g.beginPath(); g.moveTo(bx - 5, gy - 78); g.lineTo(bx + 5, gy - 78); g.lineTo(bx + 8, gy - 52); g.lineTo(bx - 8, gy - 52); g.closePath(); g.fill(); g.strokeStyle = 'rgba(220,255,255,0.6)'; g.lineWidth = 1; g.stroke(); }
  g.fillStyle = '#3a4448'; g.fillRect(d.x + d.w * 0.7, gy - 86, 10, 34); g.fillRect(d.x + d.w * 0.7 - 6, gy - 60, 22, 8);
};
K.dp_chairs = function (g, d, r) {
  const gy = d.y + d.h, n = 4, sk = d.p && d.p.skeleton; contact(g, d.x, d.w, gy, 0.4);
  for (let i = 0; i < n; i++) { const x = d.x + 6 + i * (d.w - 12) / n, w = (d.w - 12) / n - 6; steel(g, x, gy - 34, w, 10, { base: [40, 88, 104] }); steel(g, x + 2, gy - 60, w - 4, 26, { base: [36, 80, 96] }); g.fillStyle = 'rgba(60,70,74,0.95)'; g.fillRect(x + w / 2 - 2, gy - 24, 4, 24); g.fillRect(x + 3, gy - 3, w - 6, 3); }
  if (sk) { const x = d.x + 6 + 1 * (d.w - 12) / n + 6; g.fillStyle = 'rgba(214,208,186,0.95)'; g.beginPath(); g.arc(x + 10, gy - 66, 7, 0, TAU); g.fill(); g.fillStyle = '#0a1214'; g.fillRect(x + 6, gy - 68, 3, 3); g.fillRect(x + 11, gy - 68, 3, 3); g.strokeStyle = 'rgba(214,208,186,0.9)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x + 4, gy - 58 + i * 5); g.lineTo(x + 20, gy - 58 + i * 5); g.stroke(); } g.beginPath(); g.moveTo(x + 8, gy - 36); g.lineTo(x + 6, gy - 8); g.moveTo(x + 18, gy - 36); g.lineTo(x + 22, gy - 8); g.stroke(); g.fillStyle = 'rgba(60,100,170,0.7)'; g.fillRect(x + 2, gy - 60, 22, 26); }
};
K.dp_dweller = function (g, d, r) {
  const lie = !d.p || d.p.pose !== 'sit', gy = d.y + d.h, x = d.x, w = d.w; contact(g, x, w, gy, 0.35);
  if (lie) { g.fillStyle = 'rgba(56,106,178,0.92)'; g.beginPath(); g.ellipse(x + w * 0.5, gy - 8, w * 0.36, 7, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(236,200,70,0.9)'; g.fillRect(x + w * 0.34, gy - 8, w * 0.32, 2); g.fillStyle = 'rgba(218,212,190,0.95)'; g.beginPath(); g.arc(x + w * 0.16, gy - 9, 6.4, 0, TAU); g.fill(); g.fillStyle = '#0a1214'; g.fillRect(x + w * 0.12, gy - 11, 2.4, 2.4); g.fillRect(x + w * 0.19, gy - 11, 2.4, 2.4); g.strokeStyle = 'rgba(218,212,190,0.95)'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x + w * 0.85, gy - 8); g.lineTo(x + w * 0.98, gy - 4); g.stroke(); }
  else { g.fillStyle = 'rgba(56,106,178,0.92)'; g.fillRect(x + w * 0.3, gy - 30, w * 0.36, 26); g.fillStyle = 'rgba(218,212,190,0.95)'; g.beginPath(); g.arc(x + w * 0.48, gy - 38, 6.4, 0, TAU); g.fill(); }
};
K.dp_blood = function (g, d, r) {
  const gy = d.y + d.h; g.save(); g.globalAlpha = 0.85;
  for (let i = 0; i < 9; i++) { const x = d.x + r.next() * d.w, w = r.range(12, 60); g.fillStyle = 'rgba(70,10,10,' + r.range(0.4, 0.75) + ')'; g.beginPath(); g.ellipse(x, gy - 1.6, w / 2, r.range(1.6, 3.4), 0, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(70,10,10,0.6)'; g.lineWidth = r.range(3, 6); g.lineCap = 'round'; g.beginPath(); g.moveTo(d.x + d.w * 0.15, gy - 2); g.quadraticCurveTo(d.x + d.w * 0.4, gy - 4, d.x + d.w * 0.7, gy - 2); g.stroke(); g.restore();
};
K.dp_cable = function (g, d, r) {
  g.save(); g.lineCap = 'round'; for (let i = 0; i < 5; i++) { const y0 = d.y + 4 + r.range(0, 8), sag = r.range(14, d.h * 0.8), c = ['#0c1012', '#1c2a30', '#2a1c18', '#101826'][i % 4]; g.strokeStyle = c; g.lineWidth = r.range(2, 4); g.beginPath(); g.moveTo(d.x, y0); g.quadraticCurveTo(d.x + d.w / 2 + r.range(-20, 20), y0 + sag, d.x + d.w, y0 + r.range(0, 6)); g.stroke(); g.strokeStyle = 'rgba(160,220,230,0.18)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(d.x, y0 - 1); g.quadraticCurveTo(d.x + d.w / 2, y0 + sag - 1, d.x + d.w, y0 - 1 + r.range(0, 6)); g.stroke(); }
  for (const cx of [d.x + d.w * 0.25, d.x + d.w * 0.6]) steel(g, cx - 4, d.y + 2, 8, 12, { base: [80, 96, 100] }); g.restore();
};
K.dp_duct = function (g, d, r) { steel(g, d.x, d.y + d.h * 0.2, d.w, d.h * 0.7, { base: [96, 116, 122] }); for (let x = d.x + 60; x < d.x + d.w; x += 90) { g.fillStyle = 'rgba(0,10,14,0.55)'; g.fillRect(x, d.y + d.h * 0.2, 2, d.h * 0.7); steel(g, x - 5, d.y + d.h * 0.12, 12, d.h * 0.86, { base: [70, 88, 94] }); } for (let x = d.x + 20; x < d.x + d.w - 20; x += 120) { g.fillStyle = 'rgba(0,10,14,0.6)'; g.fillRect(x, d.y + d.h * 0.42, 34, d.h * 0.3); for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(160,210,216,0.3)'; g.fillRect(x + 2, d.y + d.h * 0.44 + k * 3.4, 30, 1); } } grime(g, d.x, d.y + d.h * 0.7, d.w, d.h * 0.4, r, 0.35); };
K.dp_pendant = function (g, d, r) { const cx = d.x + d.w / 2; g.strokeStyle = '#0c1214'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, d.y); g.lineTo(cx, d.y + d.h - 16); g.stroke(); g.fillStyle = vg(g, d.y + d.h - 16, d.y + d.h, [[0, '#aac2c6'], [1, '#4c6268']]); g.beginPath(); g.moveTo(cx - 3, d.y + d.h - 16); g.lineTo(cx + 3, d.y + d.h - 16); g.lineTo(cx + 12, d.y + d.h - 4); g.lineTo(cx - 12, d.y + d.h - 4); g.closePath(); g.fill(); g.fillStyle = 'rgba(220,255,255,0.9)'; g.fillRect(cx - 9, d.y + d.h - 4, 18, 2); glow(g, cx, d.y + d.h, 40, '190,255,255', 0.35); };
K.dp_rail = function (g, d, r) {
  const gy = d.y + d.h; g.save(); const top = d.p && d.p.top; const y0 = top ? d.y + 2 : gy - 44;
  for (let x = d.x + 4; x < d.x + d.w; x += 50) { g.fillStyle = hg(g, x, x + 5, [[0, '#3c5056'], [0.6, '#a6bec2'], [1, '#2c3c42']]); g.fillRect(x, y0, 5, gy - y0); }
  for (const yy of [y0, y0 + (gy - y0) * 0.5]) { g.fillStyle = vg(g, yy, yy + 5, [[0, '#e0f4f4'], [0.5, '#8aa2a6'], [1, '#2c3c42']]); g.fillRect(d.x, yy, d.w, 5); }
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(d.x, y0, d.w, 1); g.restore();
};
K.dp_hazdoor = function (g, d, r) {
  const x = d.x + 4, y = d.y + 4, w = d.w - 8, h = d.h - 4; contact(g, x, w, d.y + d.h, 0.4); steel(g, x - 4, y - 4, w + 8, h + 4, { base: [70, 84, 88] }); steel(g, x + 4, y + 4, w - 8, h - 8, { base: [120, 130, 120] });
  g.save(); g.beginPath(); g.rect(x + 4, y + 4, w - 8, 20); g.clip(); for (let sx = x - 20; sx < x + w + 20; sx += 22) { g.fillStyle = '#d0aa26'; g.beginPath(); g.moveTo(sx, y + 24); g.lineTo(sx + 11, y + 24); g.lineTo(sx + 22, y + 4); g.lineTo(sx + 11, y + 4); g.closePath(); g.fill(); } g.restore();
  g.save(); g.beginPath(); g.rect(x + 4, y + h - 28, w - 8, 20); g.clip(); for (let sx = x - 20; sx < x + w + 20; sx += 22) { g.fillStyle = '#d0aa26'; g.beginPath(); g.moveTo(sx, y + h - 8); g.lineTo(sx + 11, y + h - 8); g.lineTo(sx + 22, y + h - 28); g.lineTo(sx + 11, y + h - 28); g.closePath(); g.fill(); } g.restore();
  g.strokeStyle = 'rgba(0,8,12,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + w / 2, y + 26); g.lineTo(x + w / 2, y + h - 30); g.stroke(); g.fillStyle = '#7a8a8e'; g.beginPath(); g.arc(x + w / 2, y + h / 2, 10, 0, TAU); g.fill(); g.strokeStyle = '#2a3a3e'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x + w / 2, y + h / 2); g.lineTo(x + w / 2 + Math.cos(i * 2.09) * 9, y + h / 2 + Math.sin(i * 2.09) * 9); g.stroke(); } led(g, x + w - 10, y + 32, '255,60,40', 2.2);
};
K.dp_cell = function (g, d, r) {
  const x = d.x + 2, y = d.y + 2, w = d.w - 4, h = d.h - 2, gy = d.y + d.h; g.fillStyle = 'rgba(2,10,12,0.55)'; g.fillRect(x, y, w, h); contact(g, x, w, gy, 0.4);
  if (d.p && d.p.bunk) { steel(g, x + 6, gy - 30, w * 0.6, 6, { base: [80, 96, 100] }); g.fillStyle = 'rgba(70,96,110,0.85)'; g.fillRect(x + 8, gy - 38, w * 0.58, 8); }
  steel(g, x, y, w, 6, { base: [96, 116, 122] }); steel(g, x, gy - 6, w, 6, { base: [96, 116, 122] });
  for (let bx = x + 6; bx < x + w - 4; bx += 12) { g.fillStyle = hg(g, bx, bx + 5, [[0, '#3c5056'], [0.6, '#b0c8cc'], [1, '#2c3c42']]); g.fillRect(bx, y + 4, 5, h - 8); }
};
K.dp_tally = function (g, d, r) {
  g.save(); g.strokeStyle = 'rgba(214,236,226,0.7)'; g.lineWidth = 1.8; g.lineCap = 'round'; const cols = 4, rows = 4;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const gx = d.x + 12 + i * (d.w - 24) / cols, gy2 = d.y + 14 + j * (d.h - 24) / rows; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(gx + k * 6, gy2); g.lineTo(gx + k * 6 + r.range(-1, 1), gy2 + 22); g.stroke(); } g.beginPath(); g.moveTo(gx - 3, gy2 + 18); g.lineTo(gx + 24, gy2 + 4); g.stroke(); }
  g.restore();
};

// ---------------------------------------------------------------- machinery
K.dp_winch = function (g, d, r) {
  const gy = d.y + d.h; contact(g, d.x, d.w, gy, 0.5); steel(g, d.x + 8, gy - 30, d.w - 16, 30, { base: [70, 86, 92] });
  const cx = d.x + d.w * 0.55, cy = gy - d.h * 0.52, R0 = Math.min(d.w, d.h) * 0.3;
  g.fillStyle = 'rgba(0,10,14,0.5)'; g.fillRect(d.x + 16, cy - R0, 14, R0 * 2 + 30); g.fillRect(cx + R0 + 4, cy - R0, 14, R0 * 2 + 30);
  g.fillStyle = hg(g, cx - R0, cx + R0, [[0, '#3c5056'], [0.4, '#a6bec2'], [1, '#2c3c42']]); g.fillRect(cx - R0, cy - R0, R0 * 2, R0 * 2); for (let i = 0; i < 9; i++) { g.strokeStyle = 'rgba(20,24,26,0.9)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(cx - R0, cy - R0 + i * R0 * 2 / 8); g.lineTo(cx + R0, cy - R0 + i * R0 * 2 / 8 + 4); g.stroke(); }
  g.strokeStyle = '#1c2224'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy + R0); g.lineTo(cx, gy - 4); g.stroke(); steel(g, cx - 8, gy - 22, 16, 20, { base: [120, 130, 120] });
  led(g, d.x + d.w * 0.2, gy - 20, '255,200,70', 2);
};
K.dp_hoist = function (g, d, r) {
  const x = d.x + d.w / 2; g.save(); for (const dx of [-d.w * 0.32, d.w * 0.32]) { g.fillStyle = hg(g, x + dx - 4, x + dx + 4, [[0, '#2c3c42'], [0.6, '#9db4b8'], [1, '#2c3c42']]); g.fillRect(x + dx - 4, d.y, 8, d.h); }
  for (let y = d.y + 20; y < d.y + d.h - 10; y += 40) { g.strokeStyle = 'rgba(70,90,96,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - d.w * 0.32, y); g.lineTo(x + d.w * 0.32, y + 40); g.stroke(); }
  steel(g, x - d.w * 0.4, d.y, d.w * 0.8, 10, { base: [96, 116, 122] }); g.strokeStyle = '#0c1214'; g.lineWidth = 3; g.setLineDash([6, 3]); g.beginPath(); g.moveTo(x, d.y + 10); g.lineTo(x, d.y + d.h * 0.7); g.stroke(); g.setLineDash([]); g.fillStyle = '#c6b030'; g.beginPath(); g.moveTo(x - 8, d.y + d.h * 0.7); g.lineTo(x + 8, d.y + d.h * 0.7); g.lineTo(x + 5, d.y + d.h * 0.7 + 18); g.lineTo(x - 5, d.y + d.h * 0.7 + 18); g.closePath(); g.fill(); g.restore();
};
K.dp_shaft = function (g, d, r) {
  g.save(); g.fillStyle = vg(g, d.y, d.y + d.h, [[0, 'rgba(0,10,14,0.85)'], [1, 'rgba(0,4,8,0.95)']]); g.fillRect(d.x, d.y, d.w, d.h);
  for (let y = d.y + 30; y < d.y + d.h; y += 90) { g.fillStyle = hg(g, d.x, d.x + d.w, [[0, '#1c2c30'], [0.5, '#4a6268'], [1, '#1c2c30']]); g.fillRect(d.x, y, d.w, 8); for (let x = d.x + 20; x < d.x + d.w; x += 60) { g.strokeStyle = 'rgba(70,96,102,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x + 60, y + 90); g.stroke(); } }
  for (const px of [d.x + 30, d.x + d.w - 40]) pipeV(g, px, d.y, 14, d.h, ['#1c2a2e', '#587076', '#3a4c52', '#141e22']);
  g.globalCompositeOperation = 'lighter'; g.fillStyle = hg(g, d.x + d.w * 0.3, d.x + d.w * 0.5, [[0, 'rgba(150,240,255,0)'], [0.5, 'rgba(150,240,255,0.1)'], [1, 'rgba(150,240,255,0)']]); g.fillRect(d.x + d.w * 0.3, d.y, d.w * 0.2, d.h); g.restore();
};
K.dp_tubes = function (g, d, r) {
  const n = 3; g.save(); for (let i = 0; i < n; i++) { const x = d.x + 4 + i * (d.w - 8) / n, w = (d.w - 8) / n - 4, col = ['90,255,190', '110,200,255', '255,190,90'][i % 3]; g.fillStyle = 'rgba(2,14,18,0.6)'; g.fillRect(x, d.y, w, d.h); g.fillStyle = vg(g, d.y, d.y + d.h, [[0, 'rgba(' + col + ',0.15)'], [1, 'rgba(' + col + ',0.42)']]); g.fillRect(x + 2, d.y + d.h * 0.12, w - 4, d.h * 0.88 - 2); bubbles(g, x + 2, d.y + d.h * 0.15, w - 4, d.h * 0.8, r, 18); g.fillStyle = 'rgba(230,255,255,0.32)'; g.fillRect(x + w * 0.18, d.y + 6, 2, d.h - 12); steel(g, x - 2, d.y, w + 4, 8, { base: [96, 116, 122] }); steel(g, x - 2, d.y + d.h - 8, w + 4, 8, { base: [96, 116, 122] }); glow(g, x + w / 2, d.y + d.h * 0.6, w * 3, col, 0.14); } g.restore();
};
K.dp_specimen = function (g, d, r) {
  const who = (d.p && d.p.who) || 'empty', gy = d.y + d.h, x = d.x + 6, w = d.w - 12; contact(g, x - 4, w + 8, gy, 0.5);
  steel(g, x - 4, gy - 14, w + 8, 14, { base: [70, 88, 94] }); steel(g, x - 4, d.y, w + 8, 14, { base: [70, 88, 94] });
  glass(g, x, d.y + 14, w, d.h - 28, 'rgba(70,200,160,0.34)', r); bubbles(g, x, d.y + 24, w, d.h - 50, r, 22);
  if (who !== 'empty') { g.save(); g.fillStyle = who === 'mutant' ? 'rgba(90,120,70,0.7)' : 'rgba(116,132,98,0.7)'; const cx = x + w / 2, cy = d.y + d.h * 0.55, s = who === 'mutant' ? 1.25 : 1; g.beginPath(); g.ellipse(cx, cy - 46 * s, 9 * s, 11 * s, 0, 0, TAU); g.fill(); g.fillRect(cx - 12 * s, cy - 34 * s, 24 * s, 54 * s); g.fillRect(cx - 18 * s, cy - 32 * s, 6 * s, 40 * s); g.fillRect(cx + 12 * s, cy - 32 * s, 6 * s, 40 * s); g.fillRect(cx - 10 * s, cy + 18 * s, 8 * s, 40 * s); g.fillRect(cx + 2 * s, cy + 18 * s, 8 * s, 40 * s); g.restore(); }
  g.fillStyle = 'rgba(0,10,12,0.25)'; g.fillRect(x, d.y + 14, 4, d.h - 28); glow(g, x + w / 2, d.y + d.h * 0.5, w * 2.4, '90,255,190', 0.18);
};
K.dp_slot = function (g, d, r) {
  const cx = d.x + d.w / 2, cy = d.y + d.h / 2, R0 = Math.min(d.w, d.h) * 0.42; g.save();
  g.fillStyle = 'rgba(0,8,12,0.9)'; g.beginPath(); g.arc(cx, cy, R0, 0, TAU); g.fill(); g.strokeStyle = '#8aa2a6'; g.lineWidth = 6; g.stroke(); g.strokeStyle = 'rgba(0,10,14,0.7)'; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy, R0 - 3, 0, TAU); g.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.strokeStyle = i % 3 === 0 ? 'rgba(90,255,190,0.85)' : 'rgba(90,255,190,0.25)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R0 * 0.62, a, a + 0.34); g.stroke(); }
  g.fillStyle = rg(g, cx, cy, 0, R0 * 0.5, [[0, 'rgba(120,255,210,0.5)'], [1, 'rgba(120,255,210,0)']]); g.fillRect(cx - R0, cy - R0, R0 * 2, R0 * 2); glow(g, cx, cy, R0 * 2, '90,255,190', 0.25); g.restore();
};
K.dp_socket = function (g, d, r) {
  const x = d.x + d.w * 0.2, w = d.w * 0.6, gy = d.y + d.h; contact(g, x - 6, w + 12, gy, 0.5); steel(g, x, d.y, w, d.h, { base: [76, 96, 102] }); steel(g, x - 8, gy - 20, w + 16, 20, { base: [60, 78, 84] });
  for (let y = d.y + 20; y < gy - 30; y += 46) { g.fillStyle = 'rgba(0,10,14,0.55)'; g.fillRect(x + 6, y, w - 12, 34); for (let k = 0; k < 4; k++) led(g, x + 14 + k * ((w - 28) / 3), y + 17, k % 2 ? '90,255,190' : '255,200,80', 1.6); }
  const cx = x + w / 2, cy = d.y + d.h * 0.32, R0 = w * 0.34; g.fillStyle = '#04080a'; g.beginPath(); g.arc(cx, cy, R0, 0, TAU); g.fill(); g.strokeStyle = '#9db4b8'; g.lineWidth = 5; g.stroke(); glow(g, cx, cy, R0 * 2.2, '90,255,190', 0.35); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.strokeStyle = 'rgba(90,255,190,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * R0 * 0.4, cy + Math.sin(a) * R0 * 0.4); g.lineTo(cx + Math.cos(a) * R0 * 0.85, cy + Math.sin(a) * R0 * 0.85); g.stroke(); }
};
K.dp_counter = function (g, d, r) {
  const gy = d.y + d.h; contact(g, d.x, d.w, gy, 0.5); steel(g, d.x + 6, gy - 60, d.w - 12, 60, { base: [176, 198, 200] }); steel(g, d.x, gy - 68, d.w, 10, { base: [220, 236, 236] });
  for (let x = d.x + 40; x < d.x + d.w - 20; x += 56) { g.fillStyle = 'rgba(0,10,14,0.3)'; g.fillRect(x, gy - 56, 2, 52); }
  for (let i = 0; i < 3; i++) { const x = d.x + 40 + i * (d.w - 100) / 2; g.fillStyle = 'rgba(180,240,246,0.28)'; g.fillRect(x, gy - 130, 8, 62); g.fillRect(x, gy - 130, 70, 5); g.fillStyle = '#0a1418'; g.fillRect(x + 20, gy - 104, 34, 26); g.fillStyle = 'rgba(80,255,190,0.75)'; for (let k = 0; k < 4; k++) g.fillRect(x + 23, gy - 100 + k * 5, r.range(10, 26), 1.6); }
  txt(g, 'SUBLEVEL 9 - RECEPTION', d.x + d.w / 2, gy - 44, 14, 'rgba(60,110,120,0.9)', { maxW: d.w - 40 });
};
K.dp_obswin = function (g, d, r) {
  const x = d.x + 6, y = d.y + 6, w = d.w - 12, h = d.h - 12; steel(g, d.x, d.y, d.w, d.h, { base: [70, 88, 94] });
  g.fillStyle = '#04100f'; g.fillRect(x, y, w, h);
  const view = (d.p && d.p.view) || 'tanks';
  if (view === 'tanks') for (let i = 0; i < 6; i++) { const tx = x + 14 + i * (w - 28) / 6, tw = (w - 28) / 6 - 12; g.fillStyle = 'rgba(70,220,170,' + (0.22 + 0.1 * (i % 3)) + ')'; g.fillRect(tx, y + 24, tw, h - 44); g.fillStyle = 'rgba(180,255,230,0.3)'; g.fillRect(tx + 3, y + 24, 3, h - 44); glow(g, tx + tw / 2, y + h * 0.5, tw * 1.8, '90,255,190', 0.16); }
  else { g.fillStyle = vg(g, y, y + h, [[0, 'rgba(90,255,190,0.18)'], [1, 'rgba(0,10,12,0.5)']]); g.fillRect(x, y, w, h); }
  glass(g, x, y, w, h, 'rgba(120,200,210,0.1)', r); for (let px = x + w / 3; px < x + w - 4; px += w / 3) steel(g, px - 3, y, 6, h, { base: [70, 88, 94] });
  grime(g, x, y + h * 0.5, w, h * 0.5, r, 0.3);
};

// ---------------------------------------------------------------- the cryo vault: pods
function podTile(g, x, y, w, h, r, s, dim) {
  // one cryo pod: dark cabinet, frosted glass with a sleeper silhouette, status LEDs
  steel(g, x, y, w, h, { base: [38, 56, 62] }); g.fillStyle = 'rgba(0,8,12,0.6)'; g.fillRect(x + 4, y + 8, w - 8, h - 22);
  const st = ((s * 9301 + x * 7 + y * 13) % 11) / 11;
  g.fillStyle = 'rgba(150,220,236,' + (0.28 * dim) + ')'; g.fillRect(x + 6, y + 10, w - 12, h - 26);
  if (st < 0.7) { g.fillStyle = 'rgba(20,40,52,' + (0.75 * dim) + ')'; g.beginPath(); g.ellipse(x + w / 2, y + 22, w * 0.16, 9, 0, 0, TAU); g.fill(); g.fillRect(x + w / 2 - w * 0.14, y + 28, w * 0.28, h - 60); }
  else if (st < 0.85) { g.strokeStyle = 'rgba(230,250,255,' + (0.7 * dim) + ')'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + w * 0.3, y + 14); g.lineTo(x + w * 0.5, y + h * 0.4); g.lineTo(x + w * 0.4, y + h * 0.65); g.stroke(); }
  g.fillStyle = 'rgba(230,255,255,' + (0.3 * dim) + ')'; g.fillRect(x + 8, y + 10, 3, h - 26);
  const on = st < 0.85; g.fillStyle = on ? 'rgba(90,255,190,' + dim + ')' : 'rgba(255,80,60,' + dim + ')'; g.fillRect(x + w / 2 - 4, y + h - 10, 8, 3);
}
K.dp_podrow = function (g, d, r) {
  const s = (d.p && d.p.s) || 1; g.save(); const gy = d.y + d.h; contact(g, d.x, d.w, gy, 0.5);
  const n = 3, pw = (d.w - 10) / n; for (let i = 0; i < n; i++) podTile(g, d.x + 5 + i * pw + 2, d.y + 8, pw - 4, d.h - 8, r, s + i, 1);
  pipeV(g, d.x, d.y, 5, d.h, ['#1c2a2e', '#587076', '#3a4c52', '#141e22']); pipeV(g, d.x + d.w - 5, d.y, 5, d.h, ['#1c2a2e', '#587076', '#3a4c52', '#141e22']); glow(g, d.x + d.w / 2, d.y + d.h * 0.5, d.w * 0.7, '120,230,255', 0.1); g.restore();
};
K.dp_podtower = function (g, d, r) {
  const depth = (d.p && d.p.depth) || 0, s = (d.p && d.p.s) || 1, dim = [1, 0.62, 0.38][depth] || 0.5; g.save();
  const cw = d.w / 2, ch = 92; g.fillStyle = 'rgba(2,10,14,' + (0.85) + ')'; g.fillRect(d.x, d.y, d.w, d.h);
  for (let j = 0; j * ch < d.h; j++) for (let i = 0; i < 2; i++) podTile(g, d.x + i * cw + 3, d.y + j * ch + 3, cw - 6, ch - 6, r, s + j * 3 + i, dim);
  g.fillStyle = vg(g, d.y, d.y + d.h, [[0, 'rgba(0,6,10,' + (0.15 * depth) + ')'], [1, 'rgba(0,6,10,' + (0.4 + 0.2 * depth) + ')']]); g.fillRect(d.x, d.y, d.w, d.h);
  pipeV(g, d.x - 3, d.y, 6, d.h, ['#141e22', '#3a4c52', '#26363c', '#0c1216']); pipeV(g, d.x + d.w - 3, d.y, 6, d.h, ['#141e22', '#3a4c52', '#26363c', '#0c1216']); g.restore();
};
K.dp_podwall = function (g, d, r) {
  const s = (d.p && d.p.s) || 1, fade = (d.p && d.p.fade) !== undefined ? d.p.fade : 0.5; g.save(); g.beginPath(); g.rect(d.x, d.y, d.w, d.h); g.clip();
  const view = g.canvas ? g.getTransform().inverse() : null; let vx0 = d.x, vx1 = d.x + d.w, vy0 = d.y, vy1 = d.y + d.h;
  if (view) { const c = g.canvas, pts = [[0, 0], [c.width, 0], [0, c.height], [c.width, c.height]].map((p) => [view.a * p[0] + view.c * p[1] + view.e, view.b * p[0] + view.d * p[1] + view.f]); vx0 = Math.max(d.x, Math.min(...pts.map((p) => p[0])) - 60); vx1 = Math.min(d.x + d.w, Math.max(...pts.map((p) => p[0])) + 60); vy0 = Math.max(d.y, Math.min(...pts.map((p) => p[1])) - 60); vy1 = Math.min(d.y + d.h, Math.max(...pts.map((p) => p[1])) + 60); }
  g.fillStyle = 'rgba(2,10,14,0.9)'; g.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  const pw = 40, ph = 92, dim = 0.55; const i0 = Math.floor((vx0 - d.x) / pw), i1 = Math.ceil((vx1 - d.x) / pw), j0 = Math.floor((vy0 - d.y) / ph), j1 = Math.ceil((vy1 - d.y) / ph);
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) podTile(g, d.x + i * pw + 2, d.y + j * ph + 2, pw - 4, ph - 4, r, s + i * 7 + j * 3, dim);
  g.fillStyle = vg(g, d.y, d.y + d.h, [[0, 'rgba(0,6,10,' + fade * 0.4 + ')'], [1, 'rgba(0,6,10,' + fade + ')']]); g.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0); g.restore();
};

// ---------------------------------------------------------------- landmarks
K.dp_cog = function (g, d, r) {
  const cx = d.x + d.w / 2, cy = d.y + d.h / 2, R1 = Math.min(d.w, d.h) * 0.5, R0 = R1 * 0.86; g.save();
  g.fillStyle = 'rgba(0,8,12,0.4)'; g.beginPath(); g.arc(cx + 4, cy + 6, R0, 0, TAU); g.fill();
  g.beginPath(); for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, rr2 = (i % 2) ? R1 * 0.92 : R1; g.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } g.closePath(); g.fillStyle = rg(g, cx + R1 * 0.3, cy - R1 * 0.3, R1 * 0.1, R1 * 1.1, [[0, '#b8d0d4'], [0.6, '#6f8a90'], [1, '#2c3e44']]); g.fill(); g.strokeStyle = 'rgba(0,10,14,0.6)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#12303c'; g.beginPath(); g.arc(cx, cy, R0 * 0.62, 0, TAU); g.fill(); g.strokeStyle = '#d0b230'; g.lineWidth = R1 * 0.05; g.stroke(); txt(g, '213', cx, cy, R1 * 0.5, '#d8bc3a', { maxW: R1 * 0.9 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.fillStyle = 'rgba(10,20,24,0.55)'; g.fillRect(cx + Math.cos(a) * R0 * 0.78 - 3, cy + Math.sin(a) * R0 * 0.78 - 3, 6, 6); }
  grime(g, cx - R1, cy, R1 * 2, R1, r, 0.3); g.restore();
};
K.dp_reactor = function (g, d, r) {
  const cx = d.x + d.w / 2, gy = d.y + d.h; g.save(); contact(g, d.x + d.w * 0.15, d.w * 0.7, gy, 0.6);
  steel(g, d.x + d.w * 0.12, gy - 60, d.w * 0.76, 60, { base: [56, 74, 80] });
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,10,14,0.5)'; g.fillRect(d.x + d.w * 0.16 + i * d.w * 0.12, gy - 52, d.w * 0.06, 40); }
  const cw = d.w * 0.34, cxL = cx - cw / 2, top = d.y + 30, bot = gy - 60;
  g.fillStyle = hg(g, cxL, cxL + cw, [[0, '#101e22'], [0.5, '#2e4a52'], [1, '#0c161a']]); g.fillRect(cxL - 16, top, cw + 32, bot - top);
  g.fillStyle = 'rgba(2,14,18,0.95)'; g.fillRect(cxL, top + 14, cw, bot - top - 28);
  g.fillStyle = vg(g, top, bot, [[0, 'rgba(90,255,200,0.15)'], [0.5, 'rgba(130,255,220,0.65)'], [1, 'rgba(60,220,170,0.35)']]); g.fillRect(cxL + 6, top + 20, cw - 12, bot - top - 40);
  g.fillStyle = 'rgba(230,255,250,0.5)'; g.fillRect(cx - 2, top + 20, 4, bot - top - 40); glow(g, cx, (top + bot) / 2, cw * 2.6, '90,255,200', 0.4);
  for (let y = top + 40; y < bot - 20; y += 70) { g.fillStyle = vg(g, y, y + 16, [[0, '#a6c0c4'], [1, '#3a5258']]); g.fillRect(cxL - 22, y, cw + 44, 16); for (let k = 0; k < 8; k++) bolt(g, cxL - 14 + k * ((cw + 28) / 7), y + 8, 2); }
  for (const px of [d.x + d.w * 0.1, d.x + d.w * 0.9 - 26]) { pipeV(g, px, d.y + 60, 26, bot - d.y - 60, ['#101c20', '#4a6870', '#2e4248', '#0a1216']); for (let y = d.y + 100; y < bot; y += 120) { g.fillStyle = '#7a949a'; g.fillRect(px - 4, y, 34, 8); } }
  steel(g, cxL - 30, d.y, cw + 60, 34, { base: [70, 90, 96] }); for (let k = 0; k < 6; k++) led(g, cxL - 16 + k * ((cw + 32) / 5), d.y + 17, k % 3 ? '90,255,190' : '255,200,80', 2);
  g.restore();
};
K.dp_braintank = function (g, d, r) {
  const cx = d.x + d.w / 2, gy = d.y + d.h; g.save(); contact(g, d.x + d.w * 0.05, d.w * 0.9, gy, 0.6);
  // base machinery
  steel(g, d.x + d.w * 0.08, gy - 120, d.w * 0.84, 120, { base: [54, 72, 78] }); steel(g, d.x + d.w * 0.16, gy - 150, d.w * 0.68, 34, { base: [76, 96, 102] });
  for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(0,10,14,0.55)'; g.fillRect(d.x + d.w * 0.12 + i * d.w * 0.09, gy - 104, d.w * 0.05, 78); led(g, d.x + d.w * 0.145 + i * d.w * 0.09, gy - 92, i % 3 ? '90,255,190' : '255,90,60', 2.4); }
  // tank
  const tw = d.w * 0.62, tx = cx - tw / 2, top = d.y + 50, bot = gy - 150;
  g.fillStyle = 'rgba(2,20,24,0.95)'; g.fillRect(tx, top, tw, bot - top);
  g.fillStyle = vg(g, top, bot, [[0, 'rgba(90,240,200,0.32)'], [0.5, 'rgba(60,210,180,0.42)'], [1, 'rgba(30,150,140,0.55)']]); g.fillRect(tx, top, tw, bot - top);
  bubbles(g, tx + 6, top + 20, tw - 12, bot - top - 40, r, 70);
  // the brain: lobes + folds + glowing neural traces
  const bx = cx, by = (top + bot) / 2 - 30, bw = tw * 0.62, bh = tw * 0.42;
  g.fillStyle = rg(g, bx - bw * 0.15, by - bh * 0.3, bw * 0.05, bw * 0.75, [[0, '#e6b6b0'], [0.55, '#b48088'], [1, '#6a4650']]); g.beginPath(); g.moveTo(bx - bw / 2, by + bh * 0.1);
  g.bezierCurveTo(bx - bw / 2, by - bh * 0.7, bx - bw * 0.1, by - bh * 0.8, bx, by - bh * 0.5); g.bezierCurveTo(bx + bw * 0.1, by - bh * 0.8, bx + bw / 2, by - bh * 0.7, bx + bw / 2, by + bh * 0.1); g.bezierCurveTo(bx + bw / 2, by + bh * 0.5, bx + bw * 0.2, by + bh * 0.6, bx, by + bh * 0.45); g.bezierCurveTo(bx - bw * 0.2, by + bh * 0.6, bx - bw / 2, by + bh * 0.5, bx - bw / 2, by + bh * 0.1); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(90,40,50,0.7)'; g.lineWidth = 2.4; g.lineCap = 'round'; for (let i = 0; i < 14; i++) { const fx = bx - bw * 0.42 + r.next() * bw * 0.84, fy = by - bh * 0.4 + r.next() * bh * 0.8; g.beginPath(); g.moveTo(fx, fy); g.bezierCurveTo(fx + r.range(-24, 24), fy + r.range(-18, 18), fx + r.range(-30, 30), fy + r.range(-20, 20), fx + r.range(-34, 34), fy + r.range(-22, 22)); g.stroke(); }
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(120,255,230,0.6)'; g.lineWidth = 1.4; for (let i = 0; i < 18; i++) { const fx = bx + r.range(-bw * 0.4, bw * 0.4), fy = by + r.range(-bh * 0.4, bh * 0.4); g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + r.range(-26, 26), fy + r.range(-20, 20)); g.stroke(); } g.restore(); glow(g, bx, by, bw * 0.9, '120,255,230', 0.32);
  g.fillStyle = 'rgba(230,150,150,0.85)'; g.beginPath(); g.ellipse(bx, by + bh * 0.6, 22, 40, 0, 0, TAU); g.fill();   // brain stem
  for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(190,120,130,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx + r.range(-20, 20), by + bh * 0.7); g.bezierCurveTo(bx + r.range(-60, 60), by + bh + 20, bx + r.range(-90, 90), bot - 30, bx + r.range(-110, 110), bot - 4); g.stroke(); }
  // glass reflections + frame rings
  g.fillStyle = 'rgba(230,255,255,0.3)'; g.beginPath(); g.moveTo(tx + tw * 0.08, top + 6); g.lineTo(tx + tw * 0.2, top + 6); g.lineTo(tx + tw * 0.12, bot - 8); g.lineTo(tx + tw * 0.05, bot - 8); g.closePath(); g.fill();
  g.fillStyle = hg(g, tx, tx + tw, [[0, 'rgba(0,10,14,0.5)'], [0.25, 'rgba(0,0,0,0)'], [0.8, 'rgba(180,255,250,0.1)'], [1, 'rgba(0,10,14,0.4)']]); g.fillRect(tx, top, tw, bot - top);
  for (const yy of [top - 14, bot - 6]) { g.fillStyle = vg(g, yy, yy + 26, [[0, '#c4dadc'], [0.4, '#6a868c'], [1, '#243638']]); g.fillRect(tx - 24, yy, tw + 48, 26); for (let k = 0; k < 14; k++) bolt(g, tx - 14 + k * ((tw + 28) / 13), yy + 13, 2.4); }
  for (const px of [tx - 34, tx + tw + 10]) { pipeV(g, px, top - 14, 24, bot - top + 40, ['#0e181c', '#3e5a62', '#2a3e44', '#0a1216']); }
  // pipes to the ceiling + cables
  for (const px of [tx + tw * 0.2, tx + tw * 0.5, tx + tw * 0.8]) pipeV(g, px, d.y, 14, top - 14 - d.y, ['#0e181c', '#587076', '#3a4c52', '#0a1216']);
  steel(g, tx - 40, d.y + 20, tw + 80, 30, { base: [70, 90, 96] });
  // vault-tec emblem on the base and a chirpy screen
  g.fillStyle = '#04100f'; g.fillRect(cx - 60, gy - 100, 120, 52); g.fillStyle = 'rgba(90,255,190,0.85)'; g.beginPath(); g.arc(cx - 26, gy - 78, 6, 0, TAU); g.arc(cx + 26, gy - 78, 6, 0, TAU); g.fill(); g.strokeStyle = 'rgba(90,255,190,0.85)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, gy - 74, 22, 0.25, PI - 0.25); g.stroke(); glow(g, cx, gy - 74, 90, '90,255,190', 0.25);
  g.restore();
};
})();
