// Procedural decor painters. Each kind draws into a chunk context that is already in world coordinates.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const D = (CD.decor = { kinds: {} });
const K = D.kinds;

D.draw = function (g, d) { const f = K[d.k]; if (f) { g.save(); f(g, d, U.RNG(d.s || 1)); g.restore(); } };

// ---------- helpers ----------
function cyl(g, x, y, w, h, base, vertical) {   // shaded cylinder (pipe)
  const gr = vertical ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, U.rgb(U.shade(base, 0.35))); gr.addColorStop(0.22, U.rgb(U.shade(base, 1.35))); gr.addColorStop(0.45, U.rgb(U.shade(base, 1.0))); gr.addColorStop(1, U.rgb(U.shade(base, 0.32)));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
function contact(g, x, y, w, h, a) { g.fillStyle = 'rgba(0,0,0,' + (a || 0.3) + ')'; g.fillRect(x, y, w, h); }
function bolt(g, x, y, r, c) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(x + 0.6, y + 0.9, r, 0, 7); g.fill(); g.fillStyle = U.rgb(c || [120, 120, 118]); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, 7); g.fill(); }
const PIPE_COLORS = [[132, 142, 150], [154, 124, 62], [126, 62, 50], [88, 110, 120], [170, 168, 150], [70, 92, 70]];

// ---------- ceiling / wall runs ----------
K.conduit = function (g, d, r) {
  const n = r.int(1, 3); let yy = d.y + 5;
  for (let i = 0; i < n; i++) {
    const rad = r.range(3.5, 6.2), col = r.pick(PIPE_COLORS);
    // brackets
    for (let x = d.x + 20; x < d.x + d.w - 10; x += r.range(70, 110)) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, d.y - 2, 5, yy - d.y + rad + 2); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x, d.y - 2, 1.5, yy - d.y + rad + 2); }
    contact(g, d.x, yy + rad, d.w, 5, 0.22);
    cyl(g, d.x, yy - rad, d.w, rad * 2, col);
    // flanges + couplings
    for (let x = d.x + r.range(30, 70); x < d.x + d.w - 12; x += r.range(90, 150)) { cyl(g, x, yy - rad - 2, 7, rad * 2 + 4, U.shade(col, 0.85)); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, yy - rad - 2, 1, rad * 2 + 4); bolt(g, x + 3.5, yy - rad, 0.9); bolt(g, x + 3.5, yy + rad, 0.9); }
    // grime streaks + drips
    for (let k = 0; k < 4; k++) { const x = d.x + r.range(10, d.w - 10); const gr = g.createLinearGradient(0, yy + rad, 0, yy + rad + 14); gr.addColorStop(0, 'rgba(20,14,8,0.5)'); gr.addColorStop(1, 'rgba(20,14,8,0)'); g.fillStyle = gr; g.fillRect(x, yy + rad, 1.6, r.range(5, 14)); }
    yy += rad * 2 + r.range(3, 6);
  }
  if (r.next() < 0.35) { const x = d.x + r.range(30, d.w - 30), y = d.y + 20; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 8, 0, 7); g.stroke(); g.strokeStyle = '#8a2a20'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, 7, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.moveTo(x, y - 7); g.lineTo(x, y + 7); g.stroke(); }
};
K.cabletray = function (g, d, r) {
  const y = d.y + 6;
  contact(g, d.x, y + 10, d.w, 6, 0.2);
  g.fillStyle = '#2b3036'; g.fillRect(d.x, y, d.w, 3); g.fillRect(d.x, y + 12, d.w, 3);
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(d.x, y, d.w, 1); g.fillRect(d.x, y + 12, d.w, 1);
  for (let x = d.x + 6; x < d.x + d.w; x += 14) { g.fillStyle = '#20242a'; g.fillRect(x, y + 3, 2.4, 9); }
  // cables sagging
  const nc = r.int(3, 6);
  for (let i = 0; i < nc; i++) {
    const c = r.pick([[24, 24, 24], [60, 30, 26], [30, 40, 60], [50, 50, 20], [16, 16, 16]]); const x0 = d.x + r.range(0, d.w * 0.3), x1 = d.x + d.w - r.range(0, d.w * 0.3), sag = r.range(3, 12);
    g.strokeStyle = U.rgb(c); g.lineWidth = r.range(1.6, 3); g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y + 8); g.quadraticCurveTo((x0 + x1) / 2, y + 8 + sag, x1, y + 8); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x0, y + 7); g.quadraticCurveTo((x0 + x1) / 2, y + 7 + sag, x1, y + 7); g.stroke();
  }
  // a couple of dangling cables
  for (let i = 0; i < r.int(0, 2); i++) { const x = d.x + r.range(20, d.w - 20), l = r.range(14, 46); g.strokeStyle = '#101214'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, y + 12); g.bezierCurveTo(x + r.range(-6, 6), y + 12 + l * 0.4, x + r.range(-9, 9), y + 12 + l * 0.8, x + r.range(-9, 9), y + 12 + l); g.stroke(); }
};
K.pipe_v = function (g, d, r) {
  const col = r.pick(PIPE_COLORS), w = 9;
  const x = d.x + (d.w - w) / 2;
  contact(g, x + 5, d.y, w, d.h, 0.22);
  cyl(g, x, d.y, w, d.h, col, true);
  for (let y = d.y + r.range(20, 50); y < d.y + d.h - 10; y += r.range(70, 120)) { cyl(g, x - 2, y, w + 4, 6, U.shade(col, 0.85), true); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x - 2, y, w + 4, 1); bolt(g, x + 2, y + 3, 0.9); bolt(g, x + w - 2, y + 3, 0.9); }
  for (let k = 0; k < 3; k++) { const y = d.y + r.range(0, d.h - 20); const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, 'rgba(20,14,8,0)'); gr.addColorStop(0.5, 'rgba(20,14,8,0.3)'); gr.addColorStop(1, 'rgba(20,14,8,0)'); g.fillStyle = gr; g.fillRect(x, y, w, r.range(10, 40)); }
};
K.vent = function (g, d, r) {
  const w = 56, h = 40, x = d.x + 4, y = d.y + 4;
  contact(g, x + 3, y + 4, w, h, 0.28);
  g.fillStyle = '#3a4046'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, y, w, 1.5); g.fillRect(x, y, 1.5, h);
  g.fillStyle = '#0a0c0e'; g.fillRect(x + 4, y + 4, w - 8, h - 8);
  for (let i = 0; i < 6; i++) { const yy = y + 5 + i * 5.2; const gr = g.createLinearGradient(0, yy, 0, yy + 4); gr.addColorStop(0, '#5c646b'); gr.addColorStop(1, '#1e2226'); g.fillStyle = gr; g.fillRect(x + 4, yy, w - 8, 3.4); }
  [[x + 2.5, y + 2.5], [x + w - 2.5, y + 2.5], [x + 2.5, y + h - 2.5], [x + w - 2.5, y + h - 2.5]].forEach((p) => bolt(g, p[0], p[1], 1.3));
  const gr = g.createLinearGradient(0, y + h, 0, y + h + 30); gr.addColorStop(0, 'rgba(40,24,10,0.4)'); gr.addColorStop(1, 'rgba(40,24,10,0)'); g.fillStyle = gr; g.fillRect(x + 8, y + h, 10, 30); g.fillRect(x + w - 20, y + h, 6, 22);
};
K.stain = function (g, d, r) {
  const n = r.int(2, 4), rust = r.next() < 0.5;
  for (let i = 0; i < n; i++) {
    const x = d.x + r.range(0, d.w), y = d.y + r.range(0, 12), len = r.range(20, 60), w = r.range(3, 9);
    const gr = g.createLinearGradient(0, y, 0, y + len); const c = rust ? '90,44,16' : '10,8,6';
    gr.addColorStop(0, 'rgba(' + c + ',0.32)'); gr.addColorStop(0.7, 'rgba(' + c + ',0.14)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x + w * 0.2, y + len); g.lineTo(x - w * 0.2, y + len); g.closePath(); g.fill();
  }
};
K.hatch = function (g, d, r) {
  const cx = d.x + 40, cy = d.y + 34, R = 26;
  contact(g, cx - R + 3, cy - R + 5, R * 2, R * 2, 0.3);
  const gr = g.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, R); gr.addColorStop(0, '#6c7884'); gr.addColorStop(0.7, '#3c454e'); gr.addColorStop(1, '#1c2228'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R - 1, 3.5, 5.6); g.stroke();
  g.strokeStyle = '#161a1e'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R - 6, 0, 7); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; bolt(g, cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3), 1.4); }
  g.strokeStyle = '#8a929a'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - 12, cy); g.lineTo(cx + 12, cy); g.moveTo(cx, cy - 12); g.lineTo(cx, cy + 12); g.stroke();
  bolt(g, cx, cy, 4, [150, 150, 148]);
};
K.stripe = function (g, d, r) {
  const y = d.y + 30, h = 10, w = d.w;
  g.save(); g.beginPath(); g.rect(d.x, y, w, h); g.clip(); g.fillStyle = '#c9a51c'; g.fillRect(d.x, y, w, h); g.fillStyle = '#16140f';
  for (let x = d.x - h; x < d.x + w + h; x += 14) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 7, y + h); g.lineTo(x + 7 + h, y); g.lineTo(x + h, y); g.closePath(); g.fill(); }
  g.restore(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(d.x, y + h, w, 2); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(d.x, y, w, h);
};

// ---------- floor clutter (y = floor top; items extend upward) ----------
K.debris = function (g, d, r) {
  const n = r.int(2, 5);
  for (let i = 0; i < n; i++) {
    const x = d.x + r.range(0, 34), w = r.range(4, 12), h = r.range(2, 6), a = r.range(-0.4, 0.4), col = r.pick([[70, 62, 54], [92, 84, 70], [50, 46, 42], [110, 96, 80], [64, 70, 74]]);
    g.save(); g.translate(x + w / 2, d.y - h / 2); g.rotate(a);
    contact(g, -w / 2 + 1, h / 2 - 1, w + 2, 2.5, 0.35);
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, U.rgb(U.shade(col, 1.35))); gr.addColorStop(1, U.rgb(U.shade(col, 0.55))); g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, h); g.restore();
  }
};
K.rubble = function (g, d, r) {
  const n = r.int(3, 7); const base = r.pick([[92, 84, 74], [110, 100, 86], [80, 74, 70]]);
  for (let i = 0; i < n; i++) {
    const cx = d.x + r.range(2, 38), rw = r.range(3, 9), rh = rw * r.range(0.5, 0.9), cy = d.y - rh * 0.6;
    contact(g, cx - rw, d.y - 1.5, rw * 2 + 2, 3, 0.3);
    g.beginPath(); const k = 6; for (let j = 0; j < k; j++) { const a = (j / k) * 6.283, rr = 0.7 + r.next() * 0.35; const px = cx + Math.cos(a) * rw * rr, py = cy + Math.sin(a) * rh * rr; j ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath();
    const gr = g.createLinearGradient(0, cy - rh, 0, cy + rh); gr.addColorStop(0, U.rgb(U.shade(base, 1.4))); gr.addColorStop(1, U.rgb(U.shade(base, 0.5))); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.8; g.stroke();
  }
};
K.rocks = function (g, d, r) {
  const n = r.int(1, 3);
  for (let i = 0; i < n; i++) {
    const cx = d.x + r.range(4, 34), rw = r.range(6, 16), rh = rw * r.range(0.55, 0.9), cy = d.y - rh * 0.55;
    contact(g, cx - rw, d.y - 2, rw * 2 + 3, 4, 0.4);
    g.beginPath(); const k = 9; for (let j = 0; j < k; j++) { const a = (j / k) * 6.283, rr = 0.75 + r.next() * 0.3; const px = cx + Math.cos(a) * rw * rr, py = cy + Math.sin(a) * rh * rr; j ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath();
    const gr = g.createLinearGradient(cx - rw, cy - rh, cx + rw * 0.6, cy + rh); gr.addColorStop(0, '#9a8c78'); gr.addColorStop(0.5, '#6a5e50'); gr.addColorStop(1, '#2c2620'); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,240,210,0.16)'; g.beginPath(); g.ellipse(cx - rw * 0.25, cy - rh * 0.4, rw * 0.4, rh * 0.22, -0.4, 0, 7); g.fill();
  }
};
K.papers = function (g, d, r) {
  const n = r.int(2, 5);
  for (let i = 0; i < n; i++) {
    const x = d.x + r.range(0, 36), w = r.range(8, 14), a = r.range(-0.25, 0.25);
    g.save(); g.translate(x, d.y - 1.5); g.rotate(a); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-w / 2 + 1, 0, w, 1.5); g.fillStyle = U.rgb(r.pick([[214, 206, 180], [196, 190, 168], [220, 214, 196]])); g.fillRect(-w / 2, -1.6, w, 2.4);
    g.fillStyle = 'rgba(40,36,30,0.4)'; g.fillRect(-w / 2 + 1, -1.2, w * 0.6, 0.6); g.restore();
  }
};
K.can = function (g, d, r) {
  const x = d.x + r.range(4, 30), w = 7, h = 10;
  const lying = r.next() < 0.4; const col = r.pick([[150, 40, 34], [40, 90, 150], [190, 170, 60], [120, 120, 120]]);
  g.save(); g.translate(x, d.y); if (lying) { g.rotate(-Math.PI / 2 + 0.1); g.translate(-h, 0); }
  contact(g, -w / 2, -1, w + 3, 2.5, 0.4);
  const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0); gr.addColorStop(0, U.rgb(U.shade(col, 0.5))); gr.addColorStop(0.35, U.rgb(U.shade(col, 1.4))); gr.addColorStop(1, U.rgb(U.shade(col, 0.4))); g.fillStyle = gr; g.fillRect(-w / 2, -h, w, h);
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-w / 2, -h, w, 1.5); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(-w / 2, -1.5, w, 1.5); g.fillStyle = 'rgba(240,240,220,0.7)'; g.fillRect(-w / 2, -h * 0.65, w, h * 0.3); g.restore();
};
K.bones = function (g, d, r) {
  const x = d.x + 6, y = d.y;
  contact(g, x, y - 2, 34, 3, 0.35);
  g.strokeStyle = '#cfc7b0'; g.lineCap = 'round';
  // rib arcs
  for (let i = 0; i < 4; i++) { g.lineWidth = 2; g.beginPath(); g.moveTo(x + 6 + i * 5, y - 1); g.quadraticCurveTo(x + 8 + i * 5, y - 12 - i % 2 * 2, x + 14 + i * 5, y - 1); g.stroke(); }
  g.lineWidth = 2.6; g.beginPath(); g.moveTo(x + 4, y - 2); g.lineTo(x + 30, y - 2); g.stroke();
  // skull
  const sx = x + 33, sy = y - 6; g.fillStyle = '#d8d0b8'; g.beginPath(); g.ellipse(sx, sy, 6.5, 5.6, 0, 0, 7); g.fill(); g.fillRect(sx - 3, sy + 3, 6, 4);
  g.fillStyle = '#1a1612'; g.beginPath(); g.ellipse(sx - 2.4, sy - 0.5, 1.8, 2.2, 0, 0, 7); g.ellipse(sx + 2.4, sy - 0.5, 1.8, 2.2, 0, 0, 7); g.fill(); g.fillRect(sx - 1, sy + 2.4, 2, 1.6);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(sx + 1.5, sy + 1, 5, 4.5, 0, 0, 7); g.fill();
};
K.weeds = function (g, d, r) {
  const n = r.int(4, 9), base = r.pick([[120, 104, 58], [140, 118, 62], [100, 86, 50], [86, 90, 48]]);
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = d.x + r.range(0, 38), h = r.range(8, 24), lean = r.range(-9, 9); const c = U.shade(base, r.range(0.7, 1.25));
    g.strokeStyle = U.rgb(c); g.lineWidth = r.range(0.9, 1.6); g.beginPath(); g.moveTo(x, d.y + 1); g.quadraticCurveTo(x + lean * 0.3, d.y - h * 0.6, x + lean, d.y - h); g.stroke();
  }
};

// ---------- explicit props (placed through marks: ['decor', {kind:'poster', w:2, h:3}]) ----------
K.poster = function (g, d, r) {
  const w = Math.min(d.w, 64), h = Math.min(d.h, 84), x = d.x + (d.w - w) / 2, y = d.y + (d.h - h) / 2, p = d.p || {};
  contact(g, x + 3, y + 4, w, h, 0.35);
  const tone = p.tone || [206, 196, 150];
  g.fillStyle = U.rgb(tone); g.fillRect(x, y, w, h);
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, 'rgba(255,255,255,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = p.head || '#1d4f96'; g.fillRect(x + 4, y + 4, w - 8, 12);
  g.fillStyle = '#f2e6b0'; g.font = 'bold 8px sans-serif'; g.textAlign = 'center'; g.fillText((p.title || 'VAULT-TEC').toUpperCase(), x + w / 2, y + 13);
  // stylised figure
  g.fillStyle = p.head || '#1d4f96'; g.beginPath(); g.arc(x + w / 2, y + h * 0.42, 9, 0, 7); g.fill(); g.fillStyle = '#f0d8a8'; g.beginPath(); g.arc(x + w / 2, y + h * 0.4, 6, 0, 7); g.fill();
  g.fillStyle = p.head || '#1d4f96'; g.fillRect(x + w / 2 - 9, y + h * 0.5, 18, h * 0.24);
  g.fillStyle = '#20180e'; g.font = 'bold 6px sans-serif'; g.fillText((p.line || 'SAFETY FIRST').toUpperCase(), x + w / 2, y + h - 6);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + h - 2, w, 2); bolt(g, x + 3, y + 3, 1.2); bolt(g, x + w - 3, y + 3, 1.2);
  // wear
  for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(30,20,10,0.18)'; g.fillRect(x + r.range(0, w), y + r.range(0, h), r.range(1, 6), r.range(1, 6)); }
};
K.sign = function (g, d, r) {
  const p = d.p || {}, w = Math.min(d.w, 120), h = 26, x = d.x + (d.w - w) / 2, y = d.y + 6;
  contact(g, x + 3, y + 4, w, h, 0.4);
  g.fillStyle = p.bg || '#1f2a30'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  g.fillStyle = p.fg || '#d8c060'; g.font = 'bold 12px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((p.text || 'CAUTION').toUpperCase(), x + w / 2, y + h / 2 + 1);
  bolt(g, x + 4, y + 4, 1.4); bolt(g, x + w - 4, y + 4, 1.4); bolt(g, x + 4, y + h - 4, 1.4); bolt(g, x + w - 4, y + h - 4, 1.4);
  const gr = g.createLinearGradient(0, y + h, 0, y + h + 20); gr.addColorStop(0, 'rgba(30,20,10,0.35)'); gr.addColorStop(1, 'rgba(30,20,10,0)'); g.fillStyle = gr; g.fillRect(x + 8, y + h, 8, 20);
};

// ---------- big set pieces ----------
K.pod = function (g, d, r) {   // cryo pod: d.p.state = closed | open | dead
  const st = (d.p && d.p.state) || 'closed', w = 66, h = 118, x = d.x + (d.w - w) / 2, y = d.y + d.h - h;
  contact(g, x + 6, y + h - 6, w, 8, 0.35);
  // base chassis
  const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#2a323a'); gr.addColorStop(0.3, '#6c7884'); gr.addColorStop(0.7, '#48525c'); gr.addColorStop(1, '#1c2228'); g.fillStyle = gr;
  g.fillRect(x + 4, y + h - 34, w - 8, 34); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x + 4, y + h - 34, w - 8, 2); g.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 4; i++) g.fillRect(x + 10, y + h - 26 + i * 6, w - 20, 1.6);
  // back column
  const bc = g.createLinearGradient(x, 0, x + 18, 0); bc.addColorStop(0, '#1a2026'); bc.addColorStop(1, '#4c5862'); g.fillStyle = bc; g.fillRect(x, y + 10, 16, h - 44);
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#c9a51c' : '#16140f'; g.fillRect(x + 1, y + 16 + i * 8, 14, 4); }
  // canopy
  g.save(); g.beginPath(); g.moveTo(x + 8, y + h - 34); g.lineTo(x + 8, y + 44); g.bezierCurveTo(x + 8, y + 6, x + w - 8, y + 6, x + w - 8, y + 44); g.lineTo(x + w - 8, y + h - 34); g.closePath();
  if (st === 'open') { g.restore(); g.save(); g.translate(x + 10, y + 26); g.rotate(-0.95); g.beginPath(); g.moveTo(0, 60); g.lineTo(0, 24); g.bezierCurveTo(0, -6, 44, -6, 44, 24); g.lineTo(44, 60); g.closePath(); g.fillStyle = 'rgba(150,200,230,0.28)'; g.fill(); g.strokeStyle = 'rgba(200,230,250,0.6)'; g.lineWidth = 2; g.stroke(); g.restore(); g.fillStyle = '#0c1014'; g.fillRect(x + 12, y + 46, w - 24, h - 82); g.fillStyle = '#4c5862'; g.fillRect(x + 12, y + h - 42, w - 24, 8); }
  else {
    g.fillStyle = '#0a1418'; g.fill(); g.clip();
    const fg = g.createLinearGradient(x, y, x + w, y + h); fg.addColorStop(0, 'rgba(170,210,235,0.34)'); fg.addColorStop(0.5, 'rgba(120,170,200,0.12)'); fg.addColorStop(1, 'rgba(190,220,240,0.3)'); g.fillStyle = fg; g.fillRect(x, y, w, h);
    if (st === 'dead') {   // skeleton inside
      g.fillStyle = '#cfc7b0'; g.beginPath(); g.ellipse(x + w / 2 + 2, y + 58, 8, 9, 0, 0, 7); g.fill(); g.fillStyle = '#0a0a0a'; g.beginPath(); g.ellipse(x + w / 2 - 1, y + 57, 2, 2.6, 0, 0, 7); g.ellipse(x + w / 2 + 5, y + 57, 2, 2.6, 0, 0, 7); g.fill();
      g.strokeStyle = '#cfc7b0'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x + w / 2 + 2, y + 68); g.lineTo(x + w / 2 + 2, y + 96); g.stroke(); g.lineWidth = 1.6; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x + w / 2 - 8, y + 74 + i * 5); g.quadraticCurveTo(x + w / 2 + 2, y + 70 + i * 5, x + w / 2 + 12, y + 74 + i * 5); g.stroke(); }
      g.fillStyle = 'rgba(42,88,158,0.8)'; g.fillRect(x + w / 2 - 12, y + 70, 28, 34);
    } else { g.fillStyle = 'rgba(210,235,250,0.10)'; g.fillRect(x + 12, y + 44, w - 24, h - 86); }
    // frost + cracks
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.9; for (let i = 0; i < 9; i++) { let px = x + r.range(10, w - 10), py = y + r.range(16, h - 44); g.beginPath(); g.moveTo(px, py); for (let k = 0; k < 4; k++) { px += r.range(-8, 8); py += r.range(-8, 8); g.lineTo(px, py); } g.stroke(); }
    g.restore(); g.save(); g.beginPath(); g.moveTo(x + 8, y + h - 34); g.lineTo(x + 8, y + 44); g.bezierCurveTo(x + 8, y + 6, x + w - 8, y + 6, x + w - 8, y + 44); g.lineTo(x + w - 8, y + h - 34); g.strokeStyle = '#8a97a4'; g.lineWidth = 3; g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.stroke(); g.restore();
  }
  g.restore(); g.save();
  // status lamps
  g.fillStyle = st === 'dead' ? '#7a1a12' : (st === 'open' ? '#1a4a2a' : '#1a6a3a'); g.fillRect(x + w - 26, y + h - 26, 5, 5); g.fillStyle = '#20282e'; g.fillRect(x + w - 18, y + h - 26, 5, 5);
  // cables
  g.strokeStyle = '#0c0e10'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 8, y + h - 20); g.bezierCurveTo(x - 10, y + h - 10, x - 14, y + h + 2, x - 24, y + h - 2); g.stroke();
};
K.pods = function (g, d, r) {   // a row of pods: d.p.states = ['closed','dead',...]
  const st = (d.p && d.p.states) || ['closed', 'dead', 'closed'];
  st.forEach((state, i) => K.pod(g, Object.assign({}, d, { x: d.x + i * 96, w: 96, p: { state } }), r));
};
K.vaultdoor = function (g, d, r) {   // giant Vault-Tec gear door (backdrop): d.w x d.h in tiles*T
  const cx = d.x + d.w / 2, cy = d.y + d.h / 2, R = Math.min(d.w, d.h) / 2 - 6;
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(cx + 6, cy + 8, R + 12, 0, 7); g.fill();
  // frame ring
  const fr = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.6, cx, cy, R + 14); fr.addColorStop(0, '#5a6672'); fr.addColorStop(1, '#1a2026'); g.fillStyle = fr; g.beginPath(); g.arc(cx, cy, R + 12, 0, 7); g.fill();
  // gear teeth around
  const teeth = 16; for (let i = 0; i < teeth; i++) { const a = i / teeth * 6.283; g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = '#7a8692'; g.fillRect(R - 6, -9, 22, 18); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(R - 6, -9, 22, 2); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(R - 6, 7, 22, 2); g.restore(); }
  const dg = g.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R); dg.addColorStop(0, '#8a96a2'); dg.addColorStop(0.55, '#586470'); dg.addColorStop(1, '#2a323a'); g.fillStyle = dg; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R * 0.86, 0, 7); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R * 0.86 + 3, 3.4, 5.4); g.stroke();
  // spokes and hub
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 6; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.26; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.24, cy + Math.sin(a) * R * 0.24); g.lineTo(cx + Math.cos(a) * R * 0.84, cy + Math.sin(a) * R * 0.84); g.stroke(); }
  const hb = g.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, R * 0.26); hb.addColorStop(0, '#c9a51c'); hb.addColorStop(1, '#5a4608'); g.fillStyle = hb; g.beginPath(); g.arc(cx, cy, R * 0.26, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#16140f'; g.font = 'bold ' + Math.round(R * 0.2) + 'px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('213', cx, cy + 2);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; bolt(g, cx + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94, 3, [130, 138, 146]); }
  // hazard stripes on the lower rim
  g.save(); g.beginPath(); g.arc(cx, cy, R + 10, 0.25, Math.PI - 0.25); g.arc(cx, cy, R + 2, Math.PI - 0.25, 0.25, true); g.closePath(); g.clip(); g.fillStyle = '#c9a51c'; g.fillRect(cx - R - 12, cy, 2 * R + 24, R + 16); g.fillStyle = '#16140f'; for (let sx = cx - R - 20; sx < cx + R + 20; sx += 14) { g.beginPath(); g.moveTo(sx, cy + R + 14); g.lineTo(sx + 7, cy + R + 14); g.lineTo(sx + 21, cy); g.lineTo(sx + 14, cy); g.fill(); } g.restore();
};
K.pillar = function (g, d, r) {
  const w = Math.min(d.w, 30), x = d.x + (d.w - w) / 2; const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#20262c'); gr.addColorStop(0.3, '#66727e'); gr.addColorStop(0.7, '#48525c'); gr.addColorStop(1, '#161b20'); g.fillStyle = gr; g.fillRect(x, d.y, w, d.h);
  g.fillStyle = 'rgba(0,0,0,0.5)'; for (let y = d.y + 20; y < d.y + d.h; y += 40) g.fillRect(x, y, w, 2); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x + 2, d.y, 2, d.h);
  g.fillStyle = '#c9a51c'; for (let y = d.y + 6; y < d.y + d.h - 8; y += 40) g.fillRect(x, y, w, 5);
};
K.desk = function (g, d, r) {
  const w = 64, h = 34, x = d.x + 4, y = d.y + d.h - h; contact(g, x + 4, y + h - 3, w, 5, 0.35);
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#8a8f88'); gr.addColorStop(0.2, '#565c58'); gr.addColorStop(1, '#22262a'); g.fillStyle = gr; g.fillRect(x, y, w, 6); g.fillRect(x + 3, y + 6, 6, h - 6); g.fillRect(x + w - 9, y + 6, 6, h - 6);
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x, y, w, 1.5); g.fillStyle = '#20262a'; g.fillRect(x + 12, y + 6, w - 24, 16); g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(x + 12, y + 6, w - 24, 1); g.fillStyle = '#8a8f88'; g.fillRect(x + w / 2 - 4, y + 12, 8, 2.4);
  for (let i = 0; i < 3; i++) { g.fillStyle = r.pick(['#d6cfae', '#b8b096']); g.fillRect(x + 8 + i * 12, y - 3 - (i % 2), 10, 3); }
};
K.locker_row = function (g, d, r) {
  const n = Math.max(1, Math.round(d.w / 34)); for (let i = 0; i < n; i++) { const x = d.x + i * 34 + 2, y = d.y + d.h - 66; const gr = g.createLinearGradient(x, 0, x + 30, 0); gr.addColorStop(0, '#2a3634'); gr.addColorStop(0.4, '#5a6c68'); gr.addColorStop(1, '#222c2a'); g.fillStyle = gr; g.fillRect(x, y, 30, 66); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x + 14.5, y, 1, 66); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, y, 30, 1.4); for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x + 4, y + 7 + k * 3, 8, 1.2); } g.fillStyle = '#1a1e20'; g.fillRect(x + 11, y + 30, 2.4, 7); if (r.next() < 0.3) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + 15, y + 2, 14, 62); } }
};
K.bunk = function (g, d, r) {   // two-tier bunk beds (decor)
  const w = 76, x = d.x + 4, y = d.y + d.h - 88; contact(g, x + 4, y + 84, w, 5, 0.3);
  for (const yy of [y + 28, y + 64]) { const gr = g.createLinearGradient(0, yy, 0, yy + 8); gr.addColorStop(0, '#6a7480'); gr.addColorStop(1, '#2a3038'); g.fillStyle = gr; g.fillRect(x, yy, w, 5); g.fillStyle = '#5a6674'; g.fillRect(x + 3, yy - 6, w - 6, 6); g.fillStyle = '#d8d4c0'; g.beginPath(); g.ellipse(x + 14, yy - 8, 10, 3.6, 0, 0, 7); g.fill(); g.fillStyle = r.pick(['#3a5a86', '#586a3a', '#7a4a3a']); g.fillRect(x + 30, yy - 7, w - 36, 6); }
  g.fillStyle = '#20262c'; g.fillRect(x, y, 4, 88); g.fillRect(x + w - 4, y, 4, 88); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x, y, 1.5, 88);
};
K.pipes_h = function (g, d, r) { K.conduit(g, Object.assign({}, d, { y: d.y }), r); };
K.hazard_floor = function (g, d, r) {
  const y = d.y + d.h - 6; g.save(); g.beginPath(); g.rect(d.x, y, d.w, 6); g.clip(); g.fillStyle = '#c9a51c'; g.fillRect(d.x, y, d.w, 6); g.fillStyle = '#16140f'; for (let x = d.x - 10; x < d.x + d.w + 10; x += 14) { g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + 7, y + 6); g.lineTo(x + 13, y); g.lineTo(x + 6, y); g.fill(); } g.restore(); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(d.x, y, d.w, 6);
};
K.window = function (g, d, r) {   // window with a view of dusk (pre-lit): used in surface interiors
  const p = d.p || {}, w = Math.min(d.w, 64), h = Math.min(d.h, 60), x = d.x + (d.w - w) / 2, y = d.y + 4;
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - 4, y - 4, w + 8, h + 8);
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, p.top || '#3a2a44'); gr.addColorStop(1, p.bot || '#d68a52'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(20,10,10,0.75)'; g.beginPath(); g.moveTo(x, y + h); for (let i = 0; i <= 8; i++) g.lineTo(x + (w / 8) * i, y + h - 6 - ((i * 37 + d.s) % 14)); g.lineTo(x + w, y + h); g.fill();
  g.strokeStyle = '#2a2622'; g.lineWidth = 3; g.strokeRect(x, y, w, h); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 4, y + h - 4); g.lineTo(x + w * 0.4, y + 4); g.stroke();
};

})();
