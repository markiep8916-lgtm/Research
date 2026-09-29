// Meridian Power Station decor (pl_*): turbines, transformers, pipework, consoles, reactor vessel, decon lockers, perimeter kit.
// Painters draw inside the world-space box d.x,d.y,d.w,d.h (standing objects sit on the bottom edge). Randomness only from r.
// "fit" painters have a nominal size and scale uniformly into their box (bottom-centred); "free" painters stretch to the box.
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
function rgb(c, k) { return 'rgb(' + Math.min(255, c[0] * k | 0) + ',' + Math.min(255, c[1] * k | 0) + ',' + Math.min(255, c[2] * k | 0) + ')'; }
function contact(g, x, w, gy, a) { g.save(); g.translate(x + w / 2, gy); g.scale(1, 5 / (w / 2)); const gr = g.createRadialGradient(0, 0, 0, 0, 0, w / 2); gr.addColorStop(0, 'rgba(6,6,4,' + a + ')'); gr.addColorStop(1, 'rgba(6,6,4,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w / 2, PI, TAU); g.fill(); g.restore(); }
function glow(g, x, y, rr, col, a) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(g, x, y, 0, rr, [[0, 'rgba(' + col + ',' + a + ')'], [1, 'rgba(' + col + ',0)']]); g.fillRect(x - rr, y - rr, rr * 2, rr * 2); g.restore(); }
function led(g, x, y, col, rr) { rr = rr || 2; g.fillStyle = 'rgb(' + col + ')'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); glow(g, x, y, rr * 4.5, col, 0.5); }
function bolt(g, x, y, rr) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(x + 0.4, y + 0.7, rr, 0, TAU); g.fill(); g.fillStyle = '#8a8c80'; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.4, 0, TAU); g.fill(); }
function txt(g, s, x, y, size, col, o) { o = o || {}; g.save(); g.font = (o.style || 'bold') + ' ' + size + 'px ' + F; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.fillStyle = col; const w = g.measureText(s).width; g.translate(x, y); if (o.maxW && w > o.maxW) g.scale(o.maxW / w, 1); g.fillText(s, 0, 0); g.restore(); }
function cylH(g, x, y, w, h, base) {          // horizontal cylinder (axis along x), lit from the top
  g.fillStyle = vg(g, y, y + h, [[0, rgb(base, 1.5)], [0.2, rgb(base, 1.2)], [0.5, rgb(base, 0.9)], [0.82, rgb(base, 0.55)], [1, rgb(base, 0.32)]]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,244,214,0.2)'; g.fillRect(x, y + h * 0.1, w, Math.max(1, h * 0.05));
}
function cylV(g, x, y, w, h, base) {          // vertical cylinder (axis along y), lit from the right
  g.fillStyle = hg(g, x, x + w, [[0, rgb(base, 0.35)], [0.3, rgb(base, 0.8)], [0.68, rgb(base, 1.3)], [0.85, rgb(base, 1.05)], [1, rgb(base, 0.4)]]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,244,214,0.16)'; g.fillRect(x + w * 0.66, y, Math.max(1, w * 0.06), h);
}
function rust(g, x, y, w, h, r, a, n) {        // rust streaks running down from the top edge of a rect, plus flecks
  n = n || Math.round(w / 16) + 2; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0; i < n; i++) { const sx = x + r.next() * w, l = r.range(h * 0.15, h * 0.8), sw = r.range(1.2, 4.5), gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(126,66,26,' + (a || 0.4) + ')'); gr.addColorStop(0.6, 'rgba(90,46,20,' + (a || 0.4) * 0.6 + ')'); gr.addColorStop(1, 'rgba(60,30,14,0)'); g.fillStyle = gr; g.fillRect(sx, y + r.range(0, h * 0.25), sw, l); }
  for (let i = 0; i < Math.round(w * h / 900); i++) { g.fillStyle = 'rgba(' + (110 + r.next() * 40 | 0) + ',56,20,' + r.range(0.18, 0.5) + ')'; g.fillRect(x + r.next() * w, y + r.next() * h, r.range(1, 3.4), r.range(1, 2.6)); }
  g.restore();
}
function grime(g, x, y, w, h, r, a) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); for (let i = 0; i < Math.round(w / 26) + 1; i++) { const sx = x + r.next() * w, l = r.range(h * 0.2, h), gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(10,12,8,' + (a || 0.3) + ')'); gr.addColorStop(1, 'rgba(10,12,8,0)'); g.fillStyle = gr; g.fillRect(sx, y, r.range(2, 9), l); } g.restore(); }
function hazard(g, x, y, w, h, off, u) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = '#c9a51c'; g.fillRect(x, y, w, h); g.fillStyle = '#17150f'; const s = (u || h) * 1.4; for (let sx = x - h + (off || 0); sx < x + w + h; sx += s * 1.6) { g.beginPath(); g.moveTo(sx, y + h); g.lineTo(sx + s * 0.8, y + h); g.lineTo(sx + s * 0.8 + h, y); g.lineTo(sx + h, y); g.closePath(); g.fill(); } g.restore(); }
function plate(g, x, y, w, h, base, o) {       // painted steel plate, top-lit, edge highlight
  o = o || {}; g.fillStyle = vg(g, y, y + h, [[0, rgb(base, 1.3)], [0.4, rgb(base, 1)], [1, rgb(base, 0.55)]]); g.fillRect(x, y, w, h);
  g.fillStyle = hg(g, x, x + w, [[0, 'rgba(0,0,0,0.22)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(255,240,210,0.1)']]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,244,214,0.34)'; g.fillRect(x, y, w, 1); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, y + h - 1, w, 1);
  if (o.rivets) for (let i = 0; i < o.rivets; i++) { const t = (i + 0.5) / o.rivets; bolt(g, x + 4 + t * (w - 8), y + 4, 1.4); bolt(g, x + 4 + t * (w - 8), y + h - 4, 1.4); }
}
function flange(g, x, y, w, h, vertical, nb, base) {   // bolted flange ring (vertical = ring standing on a horizontal cylinder)
  base = base || [110, 112, 100];
  if (vertical) { cylV(g, x, y, w, h, base); for (let i = 0; i < nb; i++) bolt(g, x + w / 2, y + 6 + i * (h - 12) / Math.max(1, nb - 1), 1.7); }
  else { cylH(g, x, y, w, h, base); for (let i = 0; i < nb; i++) bolt(g, x + 6 + i * (w - 12) / Math.max(1, nb - 1), y + h / 2, 1.7); }
}
function dial(g, cx, cy, rad, val, r) {
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(cx + 0.8, cy + 1, rad + 1.5, 0, TAU); g.fill();
  g.fillStyle = rg(g, cx - rad * 0.3, cy - rad * 0.3, 0, rad * 1.1, [[0, '#f4f0d8'], [1, '#b9b598']]); g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.fill();
  g.strokeStyle = '#3a3c34'; g.lineWidth = Math.max(1.2, rad * 0.14); g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(20,20,16,0.7)'; g.lineWidth = 0.9; for (let i = 0; i <= 8; i++) { const a = PI * 0.75 + i / 8 * PI * 1.5; g.beginPath(); g.moveTo(cx + Math.cos(a) * rad * 0.72, cy + Math.sin(a) * rad * 0.72); g.lineTo(cx + Math.cos(a) * rad * 0.9, cy + Math.sin(a) * rad * 0.9); g.stroke(); }
  g.fillStyle = 'rgba(200,40,30,0.8)'; g.beginPath(); g.arc(cx, cy, rad * 0.84, PI * 0.75 + PI * 1.5 * 0.82, PI * 2.25, false); g.arc(cx, cy, rad * 0.7, PI * 2.25, PI * 0.75 + PI * 1.5 * 0.82, true); g.closePath(); g.fill();
  const a = PI * 0.75 + PI * 1.5 * val; g.strokeStyle = '#a01810'; g.lineWidth = Math.max(1, rad * 0.1); g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * rad * 0.78, cy + Math.sin(a) * rad * 0.78); g.stroke();
  g.fillStyle = '#20201a'; g.beginPath(); g.arc(cx, cy, rad * 0.13, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(cx - rad * 0.28, cy - rad * 0.4, rad * 0.4, rad * 0.16, -0.5, 0, TAU); g.fill();
}
function wheel(g, cx, cy, rad, col) {           // valve handwheel
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 3.4; g.beginPath(); g.arc(cx + 0.6, cy + 0.8, rad, 0, TAU); g.stroke();
  g.strokeStyle = col; g.lineWidth = 2.6; g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.stroke(); g.lineWidth = 1.6; for (let i = 0; i < 3; i++) { const a = i * PI / 3 + 0.3; g.beginPath(); g.moveTo(cx - Math.cos(a) * rad, cy - Math.sin(a) * rad); g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); g.stroke(); }
  g.fillStyle = '#2a2a24'; g.beginPath(); g.arc(cx, cy, 2.4, 0, TAU); g.fill();
}
function fit(nw, nh, fn) {
  return function (g, d, r) {
    const p = d.p || {}, s = Math.min(d.w / nw, d.h / nh);
    g.save(); g.translate(d.x + d.w / 2, d.y + d.h); g.scale(s, s); g.translate(-nw / 2, -nh);
    try { fn(g, { x: 0, y: 0, w: nw, h: nh, p: p, s: d.s }, r, p); } catch (e) { if (typeof console !== 'undefined') console.error('decor pl:', e); }
    g.restore();
  };
}
function trefoil(g, cx, cy, rad, col, bg) {
  g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.fill(); g.fillStyle = col;
  for (let i = 0; i < 3; i++) { const a0 = -PI / 2 + i * TAU / 3 - PI / 6; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, rad * 0.86, a0, a0 + PI / 3); g.closePath(); g.fill(); }
  g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, rad * 0.2, 0, TAU); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(cx, cy, rad * 0.13, 0, TAU); g.fill();
}
const STEEL = [98, 106, 92], DARK = [58, 64, 58], GREEN = [78, 96, 82], TAN = [176, 166, 140];

// ---------------------------------------------------------------- the big machines
K.pl_turbine = fit(640, 320, function (g, d, r) {
  contact(g, 6, 628, 320, 0.6);
  // concrete plinth with anchor nuts and a hazard kerb
  g.fillStyle = vg(g, 268, 320, [[0, 'rgb(112,112,104)'], [1, 'rgb(58,58,54)']]); g.fillRect(8, 268, 624, 52); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(8, 268, 624, 2);
  for (let i = 0; i < 14; i++) { g.fillStyle = '#7e8072'; g.fillRect(28 + i * 44, 262, 10, 8); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(28 + i * 44, 262, 10, 1.5); }
  hazard(g, 8, 308, 624, 12, 0); rust(g, 8, 268, 624, 52, r, 0.25, 14);
  // pedestals
  plate(g, 96, 246, 60, 24, DARK); plate(g, 300, 246, 80, 24, DARK); plate(g, 500, 246, 60, 24, DARK);
  // HP casing + shaft stub
  cylH(g, 12, 194, 34, 22, [150, 152, 140]);
  cylH(g, 44, 132, 150, 122, [104, 112, 96]); for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(70 + i * 34, 132, 2, 122); }
  // LP casing
  cylH(g, 206, 88, 228, 166, [88, 98, 84]); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(206, 88, 228, 6);
  for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(226 + i * 24, 92, 2, 158); g.fillStyle = 'rgba(255,240,200,0.1)'; g.fillRect(228 + i * 24, 92, 1, 158); }
  // generator drum with cooling fins + end cap
  cylH(g, 446, 106, 148, 148, [96, 108, 100]);
  for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(0,0,0,0.32)'; g.fillRect(452 + i * 9, 108, 2.4, 144); g.fillStyle = 'rgba(210,235,220,0.14)'; g.fillRect(454.4 + i * 9, 108, 1, 144); }
  g.fillStyle = hg(g, 592, 628, [[0, 'rgb(100,112,104)'], [0.6, 'rgb(150,164,156)'], [1, 'rgb(50,58,54)']]); g.beginPath(); g.moveTo(592, 106); g.quadraticCurveTo(632, 112, 632, 180); g.quadraticCurveTo(632, 248, 592, 254); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(596, 112); g.quadraticCurveTo(626, 118, 626, 180); g.stroke();
  // flanges
  flange(g, 190, 112, 18, 144, true, 8); flange(g, 434, 96, 14, 158, true, 9); flange(g, 592, 118, 8, 128, true, 6);
  // steam headers on top
  cylH(g, 60, 26, 350, 26, [88, 92, 82]); for (const fx of [90, 200, 320]) flange(g, fx, 22, 12, 34, true, 3);
  for (const px of [92, 150]) { cylV(g, px, 52, 26, 84, [96, 100, 88]); flange(g, px - 4, 118, 34, 12, false, 4); }
  cylV(g, 300, 52, 40, 40, [84, 90, 80]); flange(g, 296, 84, 48, 10, false, 5);
  wheel(g, 122, 84, 11, '#c23a2a'); wheel(g, 374, 40, 9, '#d4b030');
  // nameplate + gauges
  plate(g, 254, 168, 112, 34, [176, 170, 140]); txt(g, 'TURBO-GENERATOR SET 2', 310, 179, 8.5, '#2a281c', { maxW: 100 }); txt(g, 'MERIDIAN POWER CO. - 150 MW', 310, 192, 7, '#3a382a', { maxW: 100, style: '' });
  for (let i = 0; i < 3; i++) dial(g, 508 + i * 26, 288 - 10, 9, [0.6, 0.35, 0.8][i]);
  led(g, 566, 274, '80,255,150', 2.2); led(g, 578, 274, '255,80,60', 2.2);
  // oil drips + stains
  g.fillStyle = 'rgba(8,8,6,0.4)'; g.beginPath(); g.ellipse(330, 266, 42, 4, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(130, 268, 26, 3, 0, 0, TAU); g.fill();
  rust(g, 44, 132, 150, 122, r, 0.32); rust(g, 206, 88, 228, 166, r, 0.36); rust(g, 60, 26, 350, 26, r, 0.25, 12); grime(g, 446, 106, 148, 148, r, 0.22);
});
K.pl_generator = fit(240, 200, function (g, d, r, p) {
  contact(g, 4, 232, 200, 0.55); plate(g, 8, 178, 224, 22, DARK, { rivets: 9 });
  plate(g, 14, 40, 212, 140, [90, 104, 92], { rivets: 10 }); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(14, 40, 212, 8);
  for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(0,4,2,0.75)'; g.fillRect(28, 62 + i * 10, 90, 5); g.fillStyle = 'rgba(190,210,190,0.2)'; g.fillRect(28, 67 + i * 10, 90, 1); }
  plate(g, 132, 60, 84, 60, [70, 76, 68]); for (const [bx, by] of [[140, 68], [208, 68], [140, 112], [208, 112]]) bolt(g, bx, by, 2);
  dial(g, 158, 90, 13, 0.55, r); dial(g, 194, 90, 13, 0.3, r); txt(g, 'GEN ' + ((p && p.n) || 3), 174, 72, 9, '#e6dfb8', { maxW: 70 });
  for (let i = 0; i < 5; i++) led(g, 30 + i * 12, 30, i === 3 ? '255,70,50' : '90,255,150', 2);
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(70, 22, 6, 18); g.fillRect(160, 22, 6, 18); g.fillStyle = 'rgba(180,180,170,0.6)'; g.beginPath(); g.arc(73, 20, 8, PI, TAU); g.fill(); g.beginPath(); g.arc(163, 20, 8, PI, TAU); g.fill();
  hazard(g, 14, 150, 212, 10, 4); cylH(g, 226, 150, 10, 40, [30, 30, 28]);
  rust(g, 14, 40, 212, 140, r, 0.3); grime(g, 14, 40, 212, 140, r, 0.25);
});
K.pl_transformer = fit(160, 240, function (g, d, r) {
  contact(g, 8, 144, 240, 0.55); plate(g, 8, 222, 144, 18, DARK); for (const wx of [24, 122]) { cylH(g, wx, 232, 14, 8, [30, 30, 28]); }
  plate(g, 24, 116, 112, 108, [92, 100, 90], { rivets: 6 });
  for (const sx of [0, 1]) for (let i = 0; i < 7; i++) { const fx = sx ? 138 + i * 3 : 22 - i * 3; g.fillStyle = 'rgb(' + (74 + i * 3) + ',' + (82 + i * 3) + ',' + (72 + i * 3) + ')'; g.fillRect(fx, 128, 2.2, 88); }
  cylH(g, 34, 92, 92, 24, [84, 92, 80]); flange(g, 30, 90, 8, 28, true, 3); flange(g, 122, 90, 8, 28, true, 3);
  for (const bx of [50, 80, 110]) { for (let k = 0; k < 9; k++) { g.fillStyle = k % 2 ? 'rgb(150,116,80)' : 'rgb(196,160,118)'; g.fillRect(bx - 7 + (k % 2 ? 1 : 0), 20 + k * 8, 14 - (k % 2 ? 2 : 0), 8); } g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(bx - 3, 20, 2, 72); g.fillStyle = '#2a2a26'; g.fillRect(bx - 5, 14, 10, 8); }
  g.strokeStyle = 'rgba(20,20,18,0.85)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(50, 14); g.quadraticCurveTo(66, 0, 80, 14); g.quadraticCurveTo(96, 0, 110, 14); g.stroke();
  hazard(g, 40, 200, 80, 8, 0); plate(g, 56, 142, 48, 34, [200, 186, 60]); txt(g, 'DANGER', 80, 152, 8.5, '#1a1408', { maxW: 40 }); txt(g, 'HIGH VOLTAGE', 80, 164, 6.5, '#1a1408', { maxW: 42 });
  g.fillStyle = 'rgba(8,8,6,0.45)'; g.beginPath(); g.ellipse(80, 240, 46, 3.4, 0, 0, TAU); g.fill(); rust(g, 24, 116, 112, 108, r, 0.3); grime(g, 24, 116, 112, 108, r, 0.22);
});
K.pl_core = fit(600, 600, function (g, d, r) {
  const cx = 300, cy = 300;
  g.fillStyle = rg(g, cx, cy, 200, 300, [[0, 'rgba(40,60,52,0.9)'], [1, 'rgba(14,20,18,0.9)']]); g.beginPath(); g.arc(cx, cy, 298, 0, TAU); g.fill();
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.save(); g.translate(cx, cy); g.rotate(a); cylH(g, 150, -20, 150, 40, [70, 78, 70]); flange(g, 180, -26, 12, 52, true, 4); g.restore(); }
  const gr = rg(g, cx - 30, cy - 40, 60, 260, [[0, 'rgb(150,158,140)'], [0.6, 'rgb(96,104,92)'], [1, 'rgb(46,52,46)']]); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 240, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, 240, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(255,255,220,0.25)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 236, PI * 1.1, PI * 1.7); g.stroke();
  for (let i = 0; i < 48; i++) { const a = i * TAU / 48; bolt(g, cx + Math.cos(a) * 214, cy + Math.sin(a) * 214, 4.4); }
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + TAU / 16; g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(90, -6, 130, 12); g.fillStyle = 'rgba(255,255,220,0.1)'; g.fillRect(90, -6, 130, 2); g.restore(); }
  g.save(); g.beginPath(); g.arc(cx, cy, 168, 0, TAU); g.arc(cx, cy, 136, 0, TAU, true); g.clip(); for (let k = 0; k < 4; k++) { g.save(); g.translate(cx, cy); g.rotate(k * PI / 2); hazard(g, -170, -170, 170, 170, 0, 22); g.restore(); } g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 168, 0, TAU); g.stroke(); g.beginPath(); g.arc(cx, cy, 136, 0, TAU); g.stroke();
  g.fillStyle = '#0a1210'; g.beginPath(); g.arc(cx, cy, 120, 0, TAU); g.fill();
  g.fillStyle = rg(g, cx, cy, 0, 112, [[0, 'rgb(220,255,240)'], [0.25, 'rgb(90,240,190)'], [0.7, 'rgb(20,110,96)'], [1, 'rgb(6,30,28)']]); g.beginPath(); g.arc(cx, cy, 108, 0, TAU); g.fill();
  for (let i = 0; i < 24; i++) { const a = i * TAU / 24; g.strokeStyle = 'rgba(200,255,235,' + (0.05 + (i % 3) * 0.05) + ')'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20); g.lineTo(cx + Math.cos(a) * 108, cy + Math.sin(a) * 108); g.stroke(); }
  g.strokeStyle = 'rgb(56,66,58)'; g.lineWidth = 8; g.beginPath(); g.arc(cx, cy, 112, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(255,255,230,0.3)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 116, PI * 1.05, PI * 1.6); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(cx - 44, cy - 56, 44, 16, -0.6, 0, TAU); g.fill();
  plate(g, cx - 60, cy + 176, 120, 26, [176, 170, 140]); txt(g, 'REACTOR 1', cx, cy + 186, 14, '#2a281c', { maxW: 108 }); txt(g, 'AUTHORIZED PERSONNEL ONLY', cx, cy + 197, 6.5, '#3a382a', { maxW: 108, style: '' });
  glow(g, cx, cy, 260, '60,255,190', 0.32); rust(g, cx - 240, cy - 240, 480, 480, r, 0.25, 18);
});
K.pl_rods = fit(240, 170, function (g, d, r) {
  contact(g, 6, 228, 170, 0.5); plate(g, 8, 150, 224, 20, DARK); plate(g, 8, 6, 224, 12, DARK); for (const fx of [8, 226]) plate(g, fx, 6, 8, 164, DARK);
  g.fillStyle = '#060a08'; g.fillRect(16, 18, 208, 132);
  for (let i = 0; i < 17; i++) { const rx = 24 + i * 12, h = 96 + (i * 37 % 20); cylV(g, rx - 3, 150 - h, 6, h, [128, 132, 116]); g.fillStyle = 'rgb(150,255,200)'; g.fillRect(rx - 3, 150 - h - 3, 6, 5); glow(g, rx, 150 - h, 14, '90,255,170', 0.45); if (i % 5 === 2) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(rx - 4, 150 - h * 0.5, 8, 30); } }
  g.strokeStyle = 'rgba(180,200,190,0.35)'; g.lineWidth = 0.8; for (let y = 18; y < 150; y += 6) { g.beginPath(); g.moveTo(16, y); g.lineTo(224, y); g.stroke(); } for (let x = 16; x < 224; x += 6) { g.beginPath(); g.moveTo(x, 18); g.lineTo(x, 150); g.stroke(); }
  plate(g, 84, 156, 72, 10, [176, 170, 140]); txt(g, 'FUEL ROD STORAGE - CAUTION', 120, 161, 6, '#2a281c', { maxW: 66 }); rust(g, 8, 6, 224, 164, r, 0.22, 8);
});
// ---------------------------------------------------------------- pipework (free-size)
K.pl_pipe_run = function (g, d, r) {
  const p = d.p || {}, x = d.x, w = d.w, big = Math.min(34, d.h * 0.5), y0 = d.y + d.h * 0.5 - big * 0.5, small = Math.max(12, big * 0.5);
  if (d.h > 60) { g.fillStyle = 'rgba(30,30,26,0.9)'; for (let hx = x + 30; hx < x + w - 10; hx += 96) g.fillRect(hx, d.y, 4, y0 - d.y + 2); }
  cylH(g, x, y0, w, big, p.v ? [110, 96, 78] : [96, 104, 90]); cylH(g, x, y0 + big + 2, w, small, [86, 76, 62]);
  for (let fx = x + 40 + r.range(0, 30); fx < x + w - 24; fx += r.range(110, 170)) { flange(g, fx, y0 - 5, 12, big + 10, true, 3); }
  for (let hx = x + 30; hx < x + w - 10; hx += 96) { g.fillStyle = 'rgba(20,20,16,0.85)'; g.fillRect(hx - 5, y0 - 2, 14, 4); g.fillRect(hx - 5, y0 + big - 2, 14, 4); }
  const vx = x + w * r.range(0.25, 0.7); g.fillStyle = 'rgba(40,40,34,0.9)'; g.fillRect(vx - 2, y0 - 14, 4, 14); wheel(g, vx, y0 - 18, 9, p.v ? '#d4b030' : '#c23a2a');
  rust(g, x, y0, w, big, r, 0.35); rust(g, x, y0 + big + 2, w, small, r, 0.3); if (r.next() < 0.6) { const dx = x + r.range(20, w - 20); g.fillStyle = 'rgba(130,190,150,0.45)'; g.fillRect(dx, y0 + big + small + 2, 1.4, r.range(6, 22)); }
};
K.pl_pipe_v = function (g, d, r) {
  const x = d.x, y = d.y, w = d.w, h = d.h, a = Math.min(30, w * 0.5), b = Math.min(20, w * 0.34);
  cylV(g, x + 4, y, a, h, [98, 106, 92]); cylV(g, x + a + 10, y, b, h, [84, 76, 62]);
  for (let fy = y + 30 + r.range(0, 40); fy < y + h - 24; fy += r.range(110, 170)) { flange(g, x, fy, a + 8, 12, false, 3); flange(g, x + a + 6, fy + 2, b + 8, 9, false, 2); }
  for (let cy = y + 20; cy < y + h - 10; cy += 96) { g.fillStyle = 'rgba(20,20,16,0.85)'; g.fillRect(x + 1, cy, a + 14 + b, 4); }
  const vy = y + h * r.range(0.3, 0.7); g.fillStyle = 'rgba(40,40,34,0.9)'; g.fillRect(x + a + b + 14, vy - 2, 12, 4); wheel(g, x + a + b + 30, vy, 8, '#d4b030');
  rust(g, x + 4, y, a, h, r, 0.34); rust(g, x + a + 10, y, b, h, r, 0.3);
};
K.pl_manifold = fit(200, 170, function (g, d, r) {
  contact(g, 6, 188, 170, 0.5); plate(g, 4, 156, 192, 14, DARK, { rivets: 8 });
  cylH(g, 8, 40, 184, 30, [96, 106, 92]); for (const fx of [8, 92, 176]) flange(g, fx, 34, 12, 42, true, 4);
  for (let i = 0; i < 4; i++) { const bx = 26 + i * 46; cylV(g, bx - 9, 70, 18, 84, [92, 100, 86]); flange(g, bx - 13, 110, 26, 9, false, 3); wheel(g, bx, 100, 10, i % 2 ? '#d4b030' : '#c23a2a'); g.fillStyle = 'rgba(40,40,34,0.9)'; g.fillRect(bx - 2, 104, 4, 8); }
  dial(g, 60, 22, 12, 0.5); dial(g, 140, 22, 12, 0.7); g.fillStyle = 'rgba(30,30,26,0.9)'; g.fillRect(58, 30, 4, 12); g.fillRect(138, 30, 4, 12);
  rust(g, 8, 40, 184, 30, r, 0.35); for (let i = 0; i < 4; i++) rust(g, 26 + i * 46 - 9, 70, 18, 84, r, 0.3, 3);
});
K.pl_coil = fit(130, 240, function (g, d, r) {
  contact(g, 6, 118, 240, 0.5); plate(g, 6, 224, 118, 16, DARK);
  cylV(g, 20, 44, 90, 182, [90, 98, 86]); g.fillStyle = rg(g, 65, 44, 4, 46, [[0, 'rgb(150,156,140)'], [1, 'rgb(70,78,68)']]); g.beginPath(); g.ellipse(65, 44, 45, 12, 0, PI, TAU); g.fill();
  for (let i = 0; i < 11; i++) { const cy = 62 + i * 15; g.strokeStyle = 'rgba(30,30,26,0.9)'; g.lineWidth = 6; g.beginPath(); g.ellipse(65, cy, 56, 9, 0, 0, PI); g.stroke(); g.strokeStyle = 'rgb(130,102,70)'; g.lineWidth = 3.4; g.beginPath(); g.ellipse(65, cy, 56, 9, 0, 0, PI); g.stroke(); g.strokeStyle = 'rgba(255,230,190,0.4)'; g.lineWidth = 1; g.beginPath(); g.ellipse(65, cy - 1, 56, 9, 0, PI * 0.55, PI * 0.9); g.stroke(); }
  cylV(g, 58, 4, 14, 44, [96, 104, 90]); flange(g, 54, 30, 22, 8, false, 3); rust(g, 20, 44, 90, 182, r, 0.32);
});
K.pl_pump = fit(210, 130, function (g, d, r) {
  contact(g, 6, 198, 130, 0.5); plate(g, 4, 112, 202, 18, DARK, { rivets: 8 });
  cylH(g, 16, 58, 96, 54, [86, 110, 96]); for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(24 + i * 11, 58, 2.4, 54); } g.fillStyle = hg(g, 108, 120, [[0, '#3a3c34'], [1, '#6a6c60']]); g.fillRect(108, 74, 14, 22);
  g.fillStyle = rg(g, 148, 84, 6, 50, [[0, 'rgb(150,160,140)'], [0.7, 'rgb(96,106,92)'], [1, 'rgb(48,54,48)']]); g.beginPath(); g.arc(148, 84, 46, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.beginPath(); g.arc(148, 84, 46, 0, TAU); g.stroke();
  for (let i = 0; i < 10; i++) { const a = i * TAU / 10; bolt(g, 148 + Math.cos(a) * 36, 84 + Math.sin(a) * 36, 2.4); } g.fillStyle = '#20241f'; g.beginPath(); g.arc(148, 84, 12, 0, TAU); g.fill();
  cylV(g, 138, 8, 22, 44, [96, 104, 90]); flange(g, 134, 44, 30, 8, false, 3); cylH(g, 178, 72, 30, 22, [96, 104, 90]); flange(g, 196, 68, 10, 30, true, 3);
  dial(g, 116, 40, 10, 0.4); rust(g, 16, 58, 96, 54, r, 0.25); g.fillStyle = 'rgba(120,190,150,0.5)'; g.fillRect(150, 112, 1.6, 12); g.fillStyle = 'rgba(60,140,110,0.45)'; g.beginPath(); g.ellipse(150, 128, 12, 2.2, 0, 0, TAU); g.fill();
});
K.pl_tank = fit(200, 290, function (g, d, r) {
  contact(g, 8, 184, 290, 0.5); plate(g, 14, 274, 172, 16, DARK, { rivets: 8 });
  cylV(g, 22, 40, 156, 236, [86, 98, 84]); for (let i = 1; i < 5; i++) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(22, 40 + i * 47, 156, 2.5); g.fillStyle = 'rgba(255,240,200,0.14)'; g.fillRect(22, 42.5 + i * 47, 156, 1); }
  g.fillStyle = hg(g, 22, 178, [[0, 'rgb(40,46,40)'], [0.66, 'rgb(130,142,124)'], [1, 'rgb(46,52,46)']]); g.beginPath(); g.moveTo(22, 40); g.quadraticCurveTo(100, -6, 178, 40); g.closePath(); g.fill();
  cylV(g, 90, 8, 20, 20, [96, 104, 90]); g.fillStyle = 'rgba(40,40,34,0.9)'; g.fillRect(84, 6, 32, 4);
  g.fillStyle = 'rgba(30,30,26,0.9)'; g.fillRect(186, 60, 4, 210); g.fillRect(196, 60, 4, 210); for (let y = 70; y < 264; y += 14) g.fillRect(186, y, 14, 3);
  plate(g, 10, 132, 180, 8, [110, 100, 60]); g.fillStyle = 'rgba(0,0,0,0.5)'; for (let x = 12; x < 188; x += 18) g.fillRect(x, 140, 2, 12);
  trefoil(g, 74, 200, 20, '#161408', '#d6b52a'); txt(g, 'COOLANT', 122, 192, 11, '#e6e0c0', { maxW: 46 }); txt(g, 'RESERVE 4', 122, 208, 8, '#e6e0c0', { maxW: 46 });
  cylH(g, 0, 246, 36, 18, [96, 104, 90]); flange(g, 26, 242, 8, 26, true, 3); rust(g, 22, 40, 156, 236, r, 0.34); grime(g, 22, 40, 156, 236, r, 0.28);
});
K.pl_fan = fit(200, 200, function (g, d, r) {
  plate(g, 4, 4, 192, 192, [82, 90, 80], { rivets: 8 }); g.fillStyle = '#04060a'; g.beginPath(); g.arc(100, 100, 84, 0, TAU); g.fill();
  const ph = r.range(0, 1); for (let i = 0; i < 7; i++) { const a = ph + i * TAU / 7; g.save(); g.translate(100, 100); g.rotate(a); g.fillStyle = 'rgb(70,78,70)'; g.beginPath(); g.moveTo(8, -3); g.quadraticCurveTo(50, -24, 82, -12); g.lineTo(82, 4); g.quadraticCurveTo(50, -8, 8, 6); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,240,200,0.12)'; g.fillRect(14, -6, 60, 2); g.restore(); }
  g.fillStyle = '#20241f'; g.beginPath(); g.arc(100, 100, 12, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(160,168,150,0.8)'; g.lineWidth = 2; for (let k = 1; k <= 4; k++) { g.beginPath(); g.arc(100, 100, k * 20, 0, TAU); g.stroke(); } for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.beginPath(); g.moveTo(100 + Math.cos(a) * 10, 100 + Math.sin(a) * 10); g.lineTo(100 + Math.cos(a) * 84, 100 + Math.sin(a) * 84); g.stroke(); }
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 3; g.beginPath(); g.arc(100, 100, 85, 0, TAU); g.stroke(); rust(g, 4, 4, 192, 192, r, 0.3);
});
K.pl_crane = function (g, d, r) {
  const x = d.x, y = d.y, w = d.w, yel = [176, 142, 40];
  for (const ry of [y + 2, y + 14]) { cylH(g, x, ry, w, 8, [84, 88, 80]); }
  for (let cx = x + 18; cx < x + w; cx += 96) { g.fillStyle = 'rgba(20,20,16,0.85)'; g.fillRect(cx, y - 6, 5, 16); }
  plate(g, x + w * 0.05, y + 24, w * 0.9, 24, yel, { rivets: Math.round(w / 40) }); hazard(g, x + w * 0.05, y + 46, w * 0.9, 5, 0);
  plate(g, x + w * 0.02, y + 12, 34, 44, [110, 92, 40]); plate(g, x + w * 0.98 - 34, y + 12, 34, 44, [110, 92, 40]);
  const tx = x + w * r.range(0.3, 0.7); plate(g, tx - 30, y + 48, 60, 22, [84, 88, 80], { rivets: 3 }); cylH(g, tx - 12, y + 70, 24, 16, [96, 100, 90]);
  g.strokeStyle = 'rgba(20,20,16,0.95)'; g.lineWidth = 3; g.beginPath(); g.moveTo(tx, y + 86); g.lineTo(tx, y + d.h - 24); g.stroke(); g.strokeStyle = 'rgba(200,200,180,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(tx - 1, y + 86); g.lineTo(tx - 1, y + d.h - 24); g.stroke();
  g.fillStyle = 'rgb(90,90,80)'; g.fillRect(tx - 8, y + d.h - 24, 16, 9); g.strokeStyle = 'rgb(140,140,126)'; g.lineWidth = 4; g.beginPath(); g.arc(tx, y + d.h - 8, 9, -0.3, PI + 0.3); g.stroke();
  rust(g, x + w * 0.05, y + 24, w * 0.9, 24, r, 0.3);
};
K.pl_stairs = function (g, d, r) {
  const p = d.p || {}, dir = p.dir === -1 ? -1 : 1, x = d.x, y = d.y, w = d.w, h = d.h, n = Math.max(4, Math.round(w / 26)), sw = w / n, sh = h / n;
  g.save(); if (dir < 0) { g.translate(x + w, 0); g.scale(-1, 1); g.translate(-x, 0); }
  g.fillStyle = 'rgba(20,22,18,0.9)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w, y); g.lineTo(x + w, y + 12); g.lineTo(x + 8, y + h); g.closePath(); g.fill();
  for (let i = 0; i < n; i++) { const tx = x + i * sw, ty = y + h - (i + 1) * sh; g.fillStyle = vg(g, ty, ty + 5, [[0, 'rgb(150,154,140)'], [1, 'rgb(84,88,78)']]); g.fillRect(tx, ty, sw + 1, 5); g.fillStyle = 'rgba(0,0,0,0.35)'; for (let k = 0; k < sw; k += 4) g.fillRect(tx + k, ty + 1, 1.4, 3); g.fillStyle = 'rgba(8,10,8,0.55)'; g.fillRect(tx + 1, ty + 5, sw - 2, sh - 6); }
  g.strokeStyle = 'rgb(176,142,40)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + h - 66); g.lineTo(x + w, y - 66 + 0); g.stroke(); g.strokeStyle = 'rgb(176,142,40)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + h - 34); g.lineTo(x + w, y - 34); g.stroke();
  for (let i = 0; i <= n; i += 2) { const px = x + i * sw, py = y + h - i * sh; g.fillStyle = 'rgb(130,106,32)'; g.fillRect(px - 1.5, py - 66, 3, 66); }
  g.restore(); rust(g, x, y, w, h, r, 0.2, 5);
};
K.pl_scaffold = function (g, d, r) {
  const x = d.x, y = d.y, w = d.w, h = d.h, cols = Math.max(2, Math.round(w / 80) + 1), cw = w / (cols - 1), lv = Math.max(2, Math.round(h / 110));
  g.strokeStyle = 'rgba(60,62,56,0.95)'; g.lineWidth = 2.4; for (let i = 0; i < cols; i++) { const px = x + i * cw; g.beginPath(); g.moveTo(px, y); g.lineTo(px, y + h); g.stroke(); }
  for (let l = 0; l <= lv; l++) { const py = y + l * h / lv; g.beginPath(); g.moveTo(x, py); g.lineTo(x + w, py); g.stroke(); }
  g.lineWidth = 1.8; for (let l = 0; l < lv; l++) for (let i = 0; i < cols - 1; i++) { const x0 = x + i * cw, x1 = x0 + cw, y0 = y + l * h / lv, y1 = y0 + h / lv; g.beginPath(); if ((l + i) % 2) { g.moveTo(x0, y0); g.lineTo(x1, y1); } else { g.moveTo(x1, y0); g.lineTo(x0, y1); } g.stroke(); }
  for (let l = 1; l <= lv; l++) { const py = y + l * h / lv; g.fillStyle = 'rgb(118,92,58)'; g.fillRect(x - 4, py - 4, w + 8, 5); g.fillStyle = 'rgba(0,0,0,0.4)'; for (let px = x; px < x + w; px += 26) g.fillRect(px, py - 4, 1.4, 5); g.fillStyle = 'rgba(255,230,180,0.25)'; g.fillRect(x - 4, py - 4, w + 8, 1); }
  g.fillStyle = 'rgba(150,150,138,0.5)'; for (let i = 0; i < cols; i++) for (let l = 0; l <= lv; l++) g.fillRect(x + i * cw - 3, y + l * h / lv - 1.5, 6, 3);
};
K.pl_duct = function (g, d, r) {
  const x = d.x, y = d.y + d.h * 0.2, w = d.w, h = d.h * 0.6; g.fillStyle = 'rgba(20,20,16,0.85)'; for (let hx = x + 24; hx < x + w - 10; hx += 110) g.fillRect(hx, d.y, 4, y - d.y + 2);
  plate(g, x, y, w, h, [96, 102, 92]); for (let sx = x + 60; sx < x + w - 20; sx += 90) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(sx, y, 2, h); g.fillStyle = 'rgba(255,244,214,0.16)'; g.fillRect(sx + 2, y, 1, h); }
  for (let sx = x + 30 + r.range(0, 30); sx < x + w - 60; sx += r.range(200, 300)) { g.fillStyle = 'rgba(0,4,2,0.8)'; g.fillRect(sx, y + h * 0.28, 40, h * 0.44); g.fillStyle = 'rgba(160,170,150,0.5)'; for (let k = 0; k < 6; k++) g.fillRect(sx + 2, y + h * 0.3 + k * (h * 0.4 / 6), 36, 1.4); }
  rust(g, x, y, w, h, r, 0.32);
};
K.pl_cables = function (g, d, r) {
  const n = Math.max(3, Math.round(d.w / 34)); g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const x0 = d.x + (i + r.next() * 0.6) * d.w / n, len = r.range(d.w / n * 0.8, d.w / n * 2.2), sag = r.range(d.h * 0.4, d.h * 0.95); g.strokeStyle = 'rgba(14,14,12,0.95)'; g.lineWidth = r.range(3, 6); g.beginPath(); g.moveTo(x0, d.y); g.quadraticCurveTo(x0 + len / 2, d.y + sag * 2, x0 + len, d.y); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, d.y + 1); g.quadraticCurveTo(x0 + len / 2, d.y + sag * 2 + 1, x0 + len, d.y + 1); g.stroke(); g.fillStyle = 'rgba(70,70,62,0.9)'; g.fillRect(x0 - 3, d.y, 6, 5); g.fillRect(x0 + len - 3, d.y, 6, 5); }
};
// ---------------------------------------------------------------- consoles, signs, small props
K.pl_console = fit(220, 130, function (g, d, r, p) {
  contact(g, 6, 208, 130, 0.5);
  if (p.v === 1) {          // wall of monitors
    plate(g, 6, 8, 208, 118, [58, 62, 56], { rivets: 10 });
    for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) { const sx = 16 + i * 50, sy = 18 + j * 52; g.fillStyle = '#04080a'; g.fillRect(sx, sy, 44, 40); g.fillStyle = 'rgba(70,255,170,' + (0.1 + r.next() * 0.12) + ')'; g.fillRect(sx + 2, sy + 2, 40, 36); for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(120,255,200,0.65)'; g.fillRect(sx + 5, sy + 6 + k * 5.5, r.range(8, 32), 1.6); } if ((i + j) % 3 === 1) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(sx + 2, sy + 2, 40, 36); } g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2; g.strokeRect(sx, sy, 44, 40); glow(g, sx + 22, sy + 20, 36, '60,255,170', 0.16); }
    rust(g, 6, 8, 208, 118, r, 0.15, 6); return;
  }
  plate(g, 8, 84, 204, 46, [70, 76, 68], { rivets: 8 });
  g.fillStyle = vg(g, 60, 90, [[0, 'rgb(110,118,106)'], [1, 'rgb(64,70,62)']]); g.beginPath(); g.moveTo(8, 88); g.lineTo(24, 62); g.lineTo(196, 62); g.lineTo(212, 88); g.closePath(); g.fill();
  for (let i = 0; i < 3; i++) { const sx = 22 + i * 60; g.fillStyle = '#04080a'; g.fillRect(sx, 12, 52, 44); g.fillStyle = 'rgba(70,255,170,0.16)'; g.fillRect(sx + 2, 14, 48, 40); for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(120,255,200,0.7)'; g.fillRect(sx + 5, 18 + k * 6, r.range(10, 38), 1.7); } g.strokeStyle = 'rgba(0,0,0,0.65)'; g.lineWidth = 3; g.strokeRect(sx, 12, 52, 44); glow(g, sx + 26, 34, 44, '60,255,170', 0.18); g.fillStyle = 'rgba(255,255,255,0.13)'; g.fillRect(sx + 3, 14, 10, 40); }
  for (let i = 0; i < 12; i++) { g.fillStyle = i % 4 === 0 ? '#a02a20' : '#2a2c26'; g.fillRect(32 + i * 12, 68 + (i % 2) * 5, 7, 4.5); }
  for (let i = 0; i < 6; i++) led(g, 30 + i * 10, 100, i === 2 ? '255,70,50' : i === 4 ? '255,200,60' : '90,255,150', 2); g.fillStyle = '#c02818'; g.beginPath(); g.arc(178, 100, 8, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(176, 97, 3, 0, TAU); g.fill();
  plate(g, 60, 108, 60, 14, [176, 170, 140]); txt(g, 'MAIN CONTROL - UNIT ' + ((p && p.n) || 2), 90, 115, 6.5, '#2a281c', { maxW: 54 }); grime(g, 8, 84, 204, 46, r, 0.25);
});
K.pl_gauges = fit(140, 90, function (g, d, r) {
  plate(g, 4, 4, 132, 82, [66, 72, 64], { rivets: 6 }); dial(g, 30, 34, 15, r.range(0.2, 0.9)); dial(g, 70, 34, 15, r.range(0.2, 0.9)); dial(g, 110, 34, 15, r.range(0.2, 0.9));
  g.fillStyle = '#04080a'; g.fillRect(16, 58, 60, 20); for (let i = 0; i < 10; i++) { const on = i < 5 + (r.next() * 4 | 0); g.fillStyle = on ? (i > 7 ? '#ff5a3a' : '#5affaa') : 'rgba(255,255,255,0.08)'; g.fillRect(19 + i * 5.6, 62, 4, 12); }
  for (let i = 0; i < 4; i++) led(g, 92 + i * 11, 68, ['255,70,50', '255,200,60', '90,255,150', '90,255,150'][i], 2.4); rust(g, 4, 4, 132, 82, r, 0.2, 5);
});
K.pl_sign = function (g, d, r) {
  const p = d.p || {}, k = p.k || 'danger', x = d.x, y = d.y, w = d.w;
  let h = d.h;
  if (p.legs) { const bh = d.h * 0.72; for (const lx of [x + w * 0.2, x + w * 0.8 - 5]) { cylV(g, lx, y + bh - 2, 5, d.h - bh + 2, [86, 90, 80]); } contact(g, x + w * 0.1, w * 0.8, y + d.h, 0.35); h = bh; }
  if (k === 'meridian') {
    plate(g, x, y, w, h, [50, 56, 50], { rivets: Math.round(w / 40) }); g.fillStyle = '#0a0e0c'; g.fillRect(x + 8, y + 8, w - 16, h - 16);
    const s = 'MERIDIAN', fs = Math.min(h * 0.46, (w - 40) / 6.2); for (let i = 0; i < s.length; i++) { const on = !(p.dead || [3, 6]).includes(i); txt(g, s[i], x + w / 2 + (i - 3.5) * fs * 0.78, y + h * 0.42, fs, on ? '#f2d060' : 'rgba(120,100,40,0.35)'); if (on) glow(g, x + w / 2 + (i - 3.5) * fs * 0.78, y + h * 0.42, fs * 0.9, '255,200,60', 0.16); }
    txt(g, 'POWER STATION', x + w / 2, y + h * 0.78, Math.min(h * 0.2, w / 14), '#d8c060', { maxW: w - 40 }); rust(g, x, y, w, h, r, 0.3, 6); return;
  }
  if (k === 'rad') { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 2, y + 3, w, h); plate(g, x, y, w, h, [206, 176, 40], { rivets: 3 }); trefoil(g, x + w / 2, y + h * 0.42, Math.min(w, h) * 0.3, '#161408', '#d6b52a'); txt(g, p.text || 'RADIATION AREA', x + w / 2, y + h * 0.86, Math.min(h * 0.14, w / 9), '#161408', { maxW: w - 10 }); rust(g, x, y, w, h, r, 0.25, 4); return; }
  if (k === 'hv') { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 2, y + 3, w, h); plate(g, x, y, w, h, [206, 176, 40]); g.fillStyle = '#161408'; g.beginPath(); g.moveTo(x + w / 2, y + h * 0.1); g.lineTo(x + w * 0.85, y + h * 0.66); g.lineTo(x + w * 0.15, y + h * 0.66); g.closePath(); g.fill(); g.fillStyle = '#d6b52a'; g.beginPath(); g.moveTo(x + w / 2 + 3, y + h * 0.2); g.lineTo(x + w / 2 - 8, y + h * 0.45); g.lineTo(x + w / 2 - 1, y + h * 0.45); g.lineTo(x + w / 2 - 4, y + h * 0.6); g.lineTo(x + w / 2 + 8, y + h * 0.36); g.lineTo(x + w / 2 + 1, y + h * 0.36); g.closePath(); g.fill(); txt(g, p.text || 'HIGH VOLTAGE', x + w / 2, y + h * 0.83, Math.min(h * 0.14, w / 9), '#161408', { maxW: w - 8 }); rust(g, x, y, w, h, r, 0.25, 4); return; }
  if (k === 'lift' || k === 'exit') { plate(g, x, y, w, h, k === 'exit' ? [40, 110, 60] : [60, 64, 58]); g.strokeStyle = 'rgba(240,240,220,0.8)'; g.lineWidth = 1.6; g.strokeRect(x + 3, y + 3, w - 6, h - 6); txt(g, p.text || (k === 'exit' ? 'EXIT' : 'SERVICE LIFT'), x + w / 2, y + h / 2, Math.min(h * 0.4, w / 6), '#f0ecd0', { maxW: w - 12 }); rust(g, x, y, w, h, r, 0.2, 3); return; }
  // default: white-on-red DANGER / NO ENTRY board
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 2, y + 3, w, h); plate(g, x, y, w, h, [214, 214, 200]); g.fillStyle = '#b02418'; g.fillRect(x + 4, y + 4, w - 8, h * 0.4); txt(g, k === 'noentry' ? 'NO ENTRY' : 'DANGER', x + w / 2, y + 4 + h * 0.2, Math.min(h * 0.28, w / 6), '#f4ecdc', { maxW: w - 14 });
  txt(g, p.text || (k === 'noentry' ? 'AUTHORIZED STAFF ONLY' : 'KEEP CLEAR OF MOVING MACHINERY'), x + w / 2, y + h * 0.7, Math.min(h * 0.13, w / 12), '#20201a', { maxW: w - 12 }); rust(g, x, y, w, h, r, 0.28, 4);
};
K.pl_barrel = function (g, d, r) {
  const n = Math.max(1, Math.round(d.w / 34)), bw = Math.min(30, d.w / n - 2), bh = Math.min(d.h, 40), gy = d.y + d.h; contact(g, d.x, d.w, gy, 0.5);
  for (let i = 0; i < n; i++) {
    const x = d.x + (i + 0.5) * d.w / n - bw / 2, tilt = (r.next() < 0.25) ? r.range(-0.08, 0.08) : 0, col = [[196, 160, 40], [120, 96, 70], [70, 96, 78]][r.int(0, 2)];
    g.save(); g.translate(x + bw / 2, gy); g.rotate(tilt); g.translate(-bw / 2, -bh);
    cylV(g, 0, 0, bw, bh, col); for (const ry of [bh * 0.16, bh * 0.5, bh * 0.84]) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, ry, bw, 2.2); g.fillStyle = 'rgba(255,240,200,0.2)'; g.fillRect(0, ry + 2.2, bw, 1); }
    g.fillStyle = 'rgba(30,30,24,0.85)'; g.beginPath(); g.ellipse(bw / 2, 1.5, bw / 2, 2.6, 0, 0, TAU); g.fill(); if (col[0] === 196) trefoil(g, bw / 2, bh * 0.5, 6.4, '#161408', '#d6b52a');
    g.restore(); rust(g, x, gy - bh, bw, bh, r, 0.3, 3);
    if (r.next() < 0.5) { g.fillStyle = 'rgba(70,200,110,0.55)'; g.beginPath(); g.ellipse(x + bw / 2 + r.range(-6, 10), gy, r.range(9, 18), 2.6, 0, 0, TAU); g.fill(); glow(g, x + bw / 2, gy - 2, 26, '90,255,120', 0.22); }
  }
};
K.pl_pylon = fit(130, 500, function (g, d, r) {
  contact(g, 20, 90, 500, 0.4); g.strokeStyle = 'rgba(52,54,50,0.95)'; g.lineWidth = 3.4;
  const half = (y) => 12 + (y / 500) * 40;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(65 + s * 12, 40); g.lineTo(65 + s * 52, 500); g.stroke(); }
  g.lineWidth = 2; for (let y = 60; y < 480; y += 44) { g.beginPath(); g.moveTo(65 - half(y), y); g.lineTo(65 + half(y + 44), y + 44); g.stroke(); g.beginPath(); g.moveTo(65 + half(y), y); g.lineTo(65 - half(y + 44), y + 44); g.stroke(); g.beginPath(); g.moveTo(65 - half(y), y); g.lineTo(65 + half(y), y); g.stroke(); }
  for (const cy of [56, 96, 136]) { const cw = 60 - (cy - 56) * 0.2; g.fillStyle = 'rgb(58,60,54)'; g.fillRect(65 - cw, cy - 4, cw * 2, 6); for (const s of [-1, 1]) { g.fillStyle = 'rgb(170,178,170)'; for (let k = 0; k < 5; k++) g.fillRect(65 + s * cw - 2, cy + 2 + k * 5, 4, 3); } }
  g.strokeStyle = 'rgba(20,20,18,0.85)'; g.lineWidth = 1.6; for (const cy of [56, 96, 136]) { const cw = 60 - (cy - 56) * 0.2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(65 + s * cw, cy + 28); g.quadraticCurveTo(65 + s * (cw + 30), cy + 38, 65 + s * (cw + 64), cy + 22); g.stroke(); } }
  led(g, 65, 30, '255,60,40', 2.6); rust(g, 15, 40, 100, 460, r, 0.18, 8);
});
K.pl_fence = function (g, d, r) {
  const x = d.x, y = d.y, w = d.w, h = d.h, gy = y + h, sp = 64; contact(g, x, w, gy, 0.3);
  const gap0 = (d.p && d.p.gap) ? x + w * d.p.gap : -1e9;
  g.save(); g.beginPath(); g.rect(x, y, w, h + 4); g.clip();
  g.strokeStyle = 'rgba(150,158,150,0.32)'; g.lineWidth = 0.8; for (let k = -h; k < w; k += 9) { g.beginPath(); g.moveTo(x + k, gy); g.lineTo(x + k + h, y + 8); g.stroke(); g.beginPath(); g.moveTo(x + k + h, gy); g.lineTo(x + k, y + 8); g.stroke(); }
  if (d.p && d.p.gap) { g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(gap0, gy); g.lineTo(gap0 + 30, y + h * 0.5); g.lineTo(gap0 + 12, y + h * 0.2); g.lineTo(gap0 + 60, y + h * 0.35); g.lineTo(gap0 + 46, gy); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over'; }
  g.restore();
  for (let px = x + 4; px < x + w; px += sp) { const lean = r.range(-0.03, 0.03); g.save(); g.translate(px, gy); g.rotate(lean); cylV(g, -3, -h, 6, h, [96, 100, 92]); g.fillStyle = 'rgb(70,72,66)'; g.fillRect(-4, -h - 2, 8, 3); g.restore(); }
  g.strokeStyle = 'rgba(40,42,38,0.95)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 7); g.lineTo(x + w, y + 7); g.stroke(); g.beginPath(); g.moveTo(x, gy - 3); g.lineTo(x + w, gy - 3); g.stroke();
  g.strokeStyle = 'rgba(110,112,104,0.9)'; g.lineWidth = 1.1; g.beginPath(); for (let bx = x; bx < x + w; bx += 7) { g.lineTo(bx, y - 1 + (((bx - x) / 7) % 2) * 5); } g.stroke(); g.beginPath(); for (let bx = x; bx < x + w; bx += 7) { g.lineTo(bx, y + 5 - (((bx - x) / 7) % 2) * 5); } g.stroke();
  if (d.p && d.p.sign) { const sx = x + w * (d.p.signAt || 0.5); plate(g, sx - 20, y + h * 0.28, 40, 26, [212, 212, 198]); trefoil(g, sx - 8, y + h * 0.28 + 13, 8, '#161408', '#d6b52a'); txt(g, 'KEEP OUT', sx + 8, y + h * 0.28 + 13, 6, '#a02418', { maxW: 24 }); }
};
K.pl_lockers = function (g, d, r) {
  const x = d.x, y = d.y, w = d.w, h = d.h, n = Math.max(2, Math.round(w / 34)), lw = w / n; contact(g, x, w, y + h, 0.5);
  for (let i = 0; i < n; i++) {
    const lx = x + i * lw, open = r.next() < 0.28; g.fillStyle = vg(g, y, y + h, [[0, 'rgb(112,124,108)'], [1, 'rgb(58,66,56)']]); g.fillRect(lx + 1, y, lw - 2, h - 6);
    if (open) { g.fillStyle = '#060806'; g.fillRect(lx + 4, y + 4, lw - 8, h - 14); const suit = r.next() < 0.6; if (suit) { g.fillStyle = 'rgb(190,158,40)'; g.fillRect(lx + lw * 0.32, y + 10, lw * 0.36, h * 0.6); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(lx + lw * 0.32, y + 30, lw * 0.36, 2); } g.fillStyle = 'rgb(96,108,92)'; g.beginPath(); g.moveTo(lx + lw - 4, y + 4); g.lineTo(lx + lw + 12, y + 8); g.lineTo(lx + lw + 12, y + h - 14); g.lineTo(lx + lw - 4, y + h - 10); g.closePath(); g.fill(); }
    else { for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(lx + 6, y + 10 + k * 4, lw - 12, 1.8); } g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(lx + lw - 9, y + h * 0.5, 3, 12); if (r.next() < 0.3) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(lx + lw * 0.5, y + h * 0.6, 8, 12, r.range(-0.5, 0.5), 0, TAU); g.fill(); } plate(g, lx + 8, y + 26, lw - 16, 7, [200, 194, 166]); txt(g, String(100 + i * 3 + (d.s | 0) % 17), lx + lw / 2, y + 29.5, 5.5, '#2a281c', { maxW: lw - 20 }); }
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(lx, y, 1.6, h - 6);
  }
  plate(g, x, y + h - 8, w, 8, [70, 76, 68]); rust(g, x, y, w, h - 6, r, 0.3); grime(g, x, y, w, h, r, 0.2);
};
K.pl_showers = function (g, d, r) {
  const x = d.x, y = d.y, w = d.w, h = d.h, n = Math.max(1, Math.round(w / 56)), sw = w / n; contact(g, x, w, y + h, 0.4);
  for (let i = 0; i < n; i++) {
    const sx = x + i * sw; g.fillStyle = vg(g, y, y + h, [[0, 'rgb(150,170,160)'], [1, 'rgb(84,100,94)']]); g.fillRect(sx + 3, y + 10, sw - 6, h - 14);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; for (let k = 0; k < sw - 6; k += 12) { g.beginPath(); g.moveTo(sx + 3 + k, y + 10); g.lineTo(sx + 3 + k, y + h - 4); g.stroke(); } for (let k = 10; k < h - 14; k += 12) { g.beginPath(); g.moveTo(sx + 3, y + 10 + k); g.lineTo(sx + sw - 3, y + 10 + k); g.stroke(); }
    cylH(g, sx + sw * 0.4, y + 4, sw * 0.4, 6, [110, 116, 106]); g.fillStyle = 'rgb(130,136,124)'; g.beginPath(); g.ellipse(sx + sw * 0.78, y + 18, 9, 3.4, 0, 0, TAU); g.fill();
    if (r.next() < 0.5) { g.fillStyle = 'rgb(76,120,150)'; g.fillRect(sx + 4, y + 12, sw * 0.42, h - 22); g.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 6; k++) g.fillRect(sx + 4 + k * 7, y + 12, 1.6, h - 22); }
    g.fillStyle = 'rgb(40,44,40)'; g.fillRect(sx + sw * 0.4, y + h - 8, 14, 4); g.fillStyle = 'rgba(120,190,150,0.35)'; g.beginPath(); g.ellipse(sx + sw / 2, y + h - 2, 14, 2.4, 0, 0, TAU); g.fill();
  }
  cylH(g, x, y + 2, w, 6, [90, 96, 86]); rust(g, x, y + 10, w, h - 14, r, 0.22); grime(g, x, y + 10, w, h - 14, r, 0.25);
};
K.pl_hazstripe = function (g, d, r) { hazard(g, d.x, d.y + d.h - Math.min(d.h, 10), d.w, Math.min(d.h, 10), r.range(0, 8)); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(d.x, d.y + d.h - Math.min(d.h, 10), d.w, 1); };
K.pl_towerback = function (g, d, r) {        // the far inner wall of a hollow concrete cooling tower (dark, ribbed, weeping)
  const x = d.x, y = d.y, w = d.w, h = d.h, p = d.p || {};
  g.fillStyle = vg(g, y, y + h, [[0, 'rgb(86,84,74)'], [0.25, 'rgb(62,62,56)'], [1, 'rgb(28,30,28)']]); g.fillRect(x, y, w, h);
  g.fillStyle = hg(g, x, x + w, [[0, 'rgba(0,0,0,0.6)'], [0.22, 'rgba(0,0,0,0.12)'], [0.5, 'rgba(255,240,200,0.06)'], [0.78, 'rgba(0,0,0,0.14)'], [1, 'rgba(0,0,0,0.62)']]); g.fillRect(x, y, w, h);
  const seam = Math.max(30, w / 8); for (let sx = x + seam * 0.5; sx < x + w; sx += seam) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(sx, y, 2, h); g.fillStyle = 'rgba(255,240,200,0.07)'; g.fillRect(sx + 2, y, 1, h); }
  for (let yy = y + 30 + r.range(0, 30); yy < y + h - 40; yy += r.range(150, 230)) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, yy + 10, w, 6); plate(g, x, yy, w, 10, [70, 72, 64]); g.fillStyle = 'rgba(255,230,180,0.14)'; g.fillRect(x, yy, w, 1); for (let bx = x + 16; bx < x + w - 6; bx += 34) bolt(g, bx, yy + 5, 1.6); }
  rust(g, x, y, w, h, r, 0.3, Math.round(w / 12)); grime(g, x, y, w, h, r, 0.32);
  for (let i = 0; i < Math.max(2, Math.round(w / 90)); i++) { const sx = x + r.range(w * 0.1, w * 0.9), l = r.range(h * 0.15, h * 0.45); g.fillStyle = vg(g, y + h * 0.2, y + h * 0.2 + l, [[0, 'rgba(110,190,140,0)'], [0.3, 'rgba(110,190,140,0.28)'], [1, 'rgba(110,190,140,0)']]); g.fillRect(sx, y + h * 0.2, 2.4, l); }
  g.fillStyle = vg(g, y, y + 70, [[0, 'rgba(255,190,110,0.42)'], [1, 'rgba(255,190,110,0)']]); g.fillRect(x, y, w, 70);          // dusk light spilling over the rim
  g.fillStyle = vg(g, y + h - 90, y + h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]); g.fillRect(x, y + h - 90, w, 90);
};
K.pl_valve = fit(70, 80, function (g, d, r) {
  cylV(g, 28, 30, 14, 50, [96, 104, 90]); flange(g, 22, 60, 26, 9, false, 3); g.fillStyle = 'rgba(40,40,34,0.9)'; g.fillRect(33, 14, 4, 20); wheel(g, 35, 12, 13, r.next() < 0.5 ? '#c23a2a' : '#d4b030'); rust(g, 28, 30, 14, 50, r, 0.3, 3);
});
})();
