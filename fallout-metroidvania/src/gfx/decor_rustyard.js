// Extra decor painters for the rustyard region (register with CD.decor.kinds.<name> = function (g, d, r) {...}).
// Junkyard set pieces (wrecks, tyres, drums, cranes, banners, fences, signs) and raider-fort dressing.
// Conventions: box kinds draw inside [d.x, d.y, d.w, d.h]; objects rest on the box bottom (d.y + d.h). The sun is low on the LEFT
// (rim light on left/top edges, shade on right/bottom). Everything is baked once per chunk, so quality beats speed.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const K = CD.decor.kinds;
const rgb = U.rgb, shade = U.shade, mix = U.mix;

// ------------------------------------------------------------------ helpers
function grad(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of stops) gr.addColorStop(s[0], s[1]); return gr; }
function shadow(g, cx, y, rx, ry, a) { g.fillStyle = 'rgba(0,0,0,' + (a === undefined ? 0.38 : a) + ')'; g.beginPath(); g.ellipse(cx, y, rx, ry, 0, 0, 7); g.fill(); }
function rivet(g, x, y, rad, c) {
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(x + 0.5, y + 0.8, rad, 0, 7); g.fill();
  g.fillStyle = rgb(c || [128, 112, 98]); g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,220,170,0.4)'; g.beginPath(); g.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.4, 0, 7); g.fill();
}
function rustBlotch(g, r, x, y, w, h, n, a) {
  for (let i = 0; i < n; i++) {
    const cx = x + r.range(0, w), cy = y + r.range(0, h), rr = r.range(2.5, 8), al = a === undefined ? 0.5 : a;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
    gr.addColorStop(0, 'rgba(158,78,32,' + al + ')'); gr.addColorStop(0.55, 'rgba(112,50,20,' + al * 0.55 + ')'); gr.addColorStop(1, 'rgba(90,40,16,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rr * 1.4, rr, r.range(-0.5, 0.5), 0, 7); g.fill();
  }
}
function drips(g, r, x, y, w, n, len, c) {
  for (let i = 0; i < n; i++) {
    const px = x + r.range(0, w), l = r.range(len * 0.4, len);
    g.fillStyle = grad(g, 0, y, 0, y + l, [[0, 'rgba(' + (c || '86,40,16') + ',0.5)'], [1, 'rgba(' + (c || '86,40,16') + ',0)']]);
    g.fillRect(px, y, r.range(0.8, 2.4), l);
  }
}
function rim(g, x0, y0, x1, y1, w, a) { g.strokeStyle = 'rgba(255,196,130,' + (a === undefined ? 0.5 : a) + ')'; g.lineWidth = w || 1.4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
function fitFont(g, text, maxW, size, face, weight) { let f = size; do { g.font = (weight || 'bold') + ' ' + f + 'px ' + face; if (g.measureText(text).width <= maxW || f <= 7) break; f--; } while (f > 7); return f; }
function cyl(g, x, y, w, h, base, vertical) {   // shaded cylinder, light from the left / top
  const gr = vertical ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, rgb(shade(base, 0.55))); gr.addColorStop(0.2, rgb(shade(base, 1.4))); gr.addColorStop(0.5, rgb(shade(base, 0.95))); gr.addColorStop(1, rgb(shade(base, 0.32)));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
function plate(g, x, y, w, h, base) {   // flat riveted-steel panel with bevel
  g.fillStyle = grad(g, x, y, x, y + h, [[0, rgb(shade(base, 1.25))], [0.5, rgb(base)], [1, rgb(shade(base, 0.55))]]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,214,160,0.3)'; g.fillRect(x, y, w, 1.3); g.fillStyle = 'rgba(255,214,160,0.16)'; g.fillRect(x, y, 1.3, h);
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, y + h - 1.3, w, 1.3); g.fillRect(x + w - 1.3, y, 1.3, h);
}
function beam(g, x0, y0, x1, y1, th, base) {   // I-beam / strut between two points
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  g.save(); g.translate(x0, y0); g.rotate(a);
  g.fillStyle = grad(g, 0, -th / 2, 0, th / 2, [[0, rgb(shade(base, 1.5))], [0.45, rgb(base)], [1, rgb(shade(base, 0.35))]]); g.fillRect(0, -th / 2, len, th);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, th / 2 - 0.8, len, 0.8);
  g.restore();
}
const PAINT = [[128, 54, 40], [54, 100, 112], [152, 128, 62], [106, 110, 104], [64, 84, 128], [136, 122, 98], [92, 122, 72], [150, 150, 142]];

// ------------------------------------------------------------------ wrecked car (side view, faces right unless p.flip)
// p: {pal:0-7, col:[r,g,b], flip, tilt (rad), burnt, flat (n flat tyres), kind:'sedan'|'pickup'|'van', open (hood up), noWheels}
K.ry_car = function (g, d, r) {
  const p = d.p || {}, L = d.w, base = d.y + d.h, k = L / 160, kind = p.kind || 'sedan';
  const col0 = p.col || PAINT[(p.pal !== undefined ? p.pal : r.int(0, PAINT.length - 1)) % PAINT.length];
  const burnt = !!p.burnt, col = burnt ? [58, 40, 30] : col0;
  g.save();
  g.translate(d.x + L / 2, base); if (p.flip) g.scale(-1, 1); if (p.tilt) g.rotate(p.tilt); g.translate(-L / 2, 0);
  if (!p.noShadow) shadow(g, L * 0.5, -1, L * 0.52, 5 * k, 0.4);
  const wr = 15 * k, sill = -11 * k, belt = -36 * k, roof = (kind === 'van' ? -68 : -63) * k;
  // --- body silhouette
  const body = new Path2D();
  if (kind === 'pickup') {
    body.moveTo(L * 0.02, sill); body.lineTo(L * 0.02, -44 * k); body.lineTo(L * 0.44, -44 * k); body.lineTo(L * 0.44, -56 * k);
    body.quadraticCurveTo(L * 0.47, roof, L * 0.55, roof); body.lineTo(L * 0.66, roof); body.quadraticCurveTo(L * 0.72, roof + 2 * k, L * 0.76, -44 * k);
    body.lineTo(L * 0.95, -40 * k); body.quadraticCurveTo(L * 0.99, -38 * k, L * 0.99, -28 * k); body.lineTo(L * 0.99, sill);
  } else if (kind === 'van') {
    body.moveTo(L * 0.02, sill); body.lineTo(L * 0.02, -60 * k); body.quadraticCurveTo(L * 0.02, roof, L * 0.09, roof); body.lineTo(L * 0.66, roof);
    body.quadraticCurveTo(L * 0.78, roof + 2 * k, L * 0.84, -46 * k); body.lineTo(L * 0.97, -40 * k); body.quadraticCurveTo(L * 0.99, -38 * k, L * 0.99, -28 * k); body.lineTo(L * 0.99, sill);
  } else {
    body.moveTo(L * 0.02, sill); body.lineTo(L * 0.02, -30 * k); body.quadraticCurveTo(L * 0.03, -40 * k, L * 0.1, -42 * k); body.lineTo(L * 0.26, -44 * k);
    body.quadraticCurveTo(L * 0.34, roof + 2 * k, L * 0.47, roof); body.lineTo(L * 0.6, roof); body.quadraticCurveTo(L * 0.7, roof + 2 * k, L * 0.75, -46 * k);
    body.lineTo(L * 0.94, -42 * k); body.quadraticCurveTo(L * 0.99, -40 * k, L * 0.99, -30 * k); body.lineTo(L * 0.99, sill);
  }
  body.closePath();
  g.fillStyle = grad(g, 0, roof, 0, sill, [[0, rgb(shade(col, 1.45))], [0.35, rgb(shade(col, 1.05))], [1, rgb(shade(col, 0.5))]]); g.fill(body);
  g.save(); g.clip(body);
  // fading paint + panel shading
  g.fillStyle = grad(g, 0, 0, L, 0, [[0, 'rgba(255,214,160,0.18)'], [0.5, 'rgba(255,214,160,0)'], [1, 'rgba(0,0,0,0.3)']]); g.fillRect(0, roof - 2, L, -roof + 2);
  if (!burnt) { g.fillStyle = 'rgba(210,190,150,0.16)'; g.fillRect(L * 0.05, roof + 6 * k, L * r.range(0.2, 0.5), 6 * k); }
  rustBlotch(g, r, 0, belt, L, sill - belt, burnt ? 26 : 16, burnt ? 0.75 : 0.55);
  rustBlotch(g, r, 0, sill - 12 * k, L, 12 * k, 8, 0.6);
  // door seams + handle
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.2; g.beginPath();
  const dx0 = L * (kind === 'pickup' ? 0.5 : 0.36), dx1 = L * (kind === 'pickup' ? 0.72 : 0.58);
  g.moveTo(dx0, belt - 2 * k); g.lineTo(dx0, sill - 3 * k); g.moveTo(dx1, belt - 2 * k); g.lineTo(dx1, sill - 3 * k); g.moveTo(dx0, sill - 3 * k); g.lineTo(dx1, sill - 3 * k); g.stroke();
  g.fillStyle = 'rgba(210,205,190,0.6)'; g.fillRect(dx1 - 10 * k, belt + 5 * k, 6 * k, 1.8 * k);
  // beltline crease + light edge
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(L * 0.03, belt); g.lineTo(L * 0.98, belt); g.stroke();
  g.strokeStyle = 'rgba(255,220,170,0.28)'; g.beginPath(); g.moveTo(L * 0.03, belt + 1.4); g.lineTo(L * 0.98, belt + 1.4); g.stroke();
  drips(g, r, 0, sill - 14 * k, L, 9, 16 * k);
  g.restore();
  // --- windows
  const gl = new Path2D();
  if (kind === 'pickup') { gl.moveTo(L * 0.47, -55 * k); gl.quadraticCurveTo(L * 0.5, roof + 5 * k, L * 0.56, roof + 5 * k); gl.lineTo(L * 0.65, roof + 5 * k); gl.quadraticCurveTo(L * 0.7, roof + 7 * k, L * 0.73, -46 * k); gl.lineTo(L * 0.47, -46 * k); }
  else if (kind === 'van') { gl.moveTo(L * 0.55, roof + 6 * k); gl.lineTo(L * 0.66, roof + 6 * k); gl.quadraticCurveTo(L * 0.76, roof + 8 * k, L * 0.8, -46 * k); gl.lineTo(L * 0.55, -46 * k); gl.moveTo(L * 0.1, roof + 6 * k); gl.lineTo(L * 0.45, roof + 6 * k); gl.lineTo(L * 0.45, -46 * k); gl.lineTo(L * 0.1, -46 * k); }
  else { gl.moveTo(L * 0.3, -44 * k); gl.quadraticCurveTo(L * 0.37, roof + 6 * k, L * 0.47, roof + 5 * k); gl.lineTo(L * 0.59, roof + 5 * k); gl.quadraticCurveTo(L * 0.67, roof + 7 * k, L * 0.71, -46 * k); gl.lineTo(L * 0.3, -44 * k); }
  gl.closePath();
  g.fillStyle = grad(g, 0, roof, 0, belt, [[0, '#2a3038'], [1, '#0c1014']]); g.fill(gl);
  g.save(); g.clip(gl);
  g.fillStyle = 'rgba(232,150,90,0.3)'; g.beginPath(); g.moveTo(L * 0.28, -2 * k); g.lineTo(L * 0.5, roof); g.lineTo(L * 0.56, roof); g.lineTo(L * 0.36, -2 * k); g.fill();   // sunset reflection
  g.strokeStyle = 'rgba(210,225,235,0.55)'; g.lineWidth = 1; g.beginPath(); const cxk = L * r.range(0.4, 0.6); g.moveTo(cxk, roof + 6 * k); g.lineTo(cxk + 8 * k, belt - 4 * k); g.lineTo(cxk + 2 * k, belt - 10 * k); g.moveTo(cxk + 8 * k, belt - 4 * k); g.lineTo(cxk + 16 * k, belt - 12 * k); g.stroke();   // shattered
  g.restore();
  g.strokeStyle = rgb(shade(col, 0.45)); g.lineWidth = 2; g.stroke(gl);
  // roof rim light
  g.save(); g.clip(body); g.strokeStyle = grad(g, 0, roof, 0, belt + 8 * k, [[0, 'rgba(255,206,150,0.7)'], [1, 'rgba(255,206,150,0)']]); g.lineWidth = 3.2; g.stroke(body); g.restore();
  // --- chrome: bumpers, grille, lamp
  const chrome = (x, y, w, h) => { g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#d8d2c4'], [0.5, '#8e8a80'], [1, '#3a3834']]); g.fillRect(x, y, w, h); g.fillStyle = 'rgba(150,80,30,0.35)'; g.fillRect(x + w * r.next() * 0.6, y, w * 0.3, h); };
  chrome(L * 0.95, sill - 6 * k, L * 0.06, 6 * k); chrome(-L * 0.02, sill - 6 * k, L * 0.06, 6 * k);
  g.fillStyle = '#c9b98a'; g.beginPath(); g.arc(L * 0.965, -30 * k, 4.4 * k, 0, 7); g.fill(); g.fillStyle = '#20242a'; g.beginPath(); g.arc(L * 0.965, -30 * k, 3 * k, 0, 7); g.fill();
  g.fillStyle = 'rgba(160,20,16,0.85)'; g.fillRect(L * 0.015, -32 * k, 2.2 * k, 5 * k);
  if (kind === 'sedan' && !burnt) { g.fillStyle = rgb(shade(col, 0.75)); g.beginPath(); g.moveTo(L * 0.02, -40 * k); g.lineTo(-L * 0.005, -50 * k); g.lineTo(L * 0.09, -42 * k); g.fill(); }   // tail fin
  // --- wheels
  const wheels = p.noWheels ? [] : [L * 0.23, L * 0.77]; let fl = p.flat || 0;
  for (const wx of wheels) {
    g.fillStyle = '#05060a'; g.beginPath(); g.arc(wx, -wr, wr * 1.14, Math.PI, 0); g.fill();   // wheel well
    const flat = fl-- > 0, rr = flat ? wr * 0.86 : wr, cy = -rr;
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(wx + 1.5, cy + 2, rr, 0, 7); g.fill();
    const tg = g.createRadialGradient(wx - rr * 0.3, cy - rr * 0.3, rr * 0.2, wx, cy, rr); tg.addColorStop(0, '#48443f'); tg.addColorStop(0.75, '#232120'); tg.addColorStop(1, '#0c0b0a'); g.fillStyle = tg; g.beginPath(); g.arc(wx, cy, rr, 0, 7); g.fill();
    g.fillStyle = 'rgba(218,208,180,0.6)'; g.beginPath(); g.arc(wx, cy, rr * 0.66, 0, 7); g.fill(); g.fillStyle = '#1a1816'; g.beginPath(); g.arc(wx, cy, rr * 0.58, 0, 7); g.fill();   // whitewall ring
    const hg = g.createRadialGradient(wx - 2 * k, cy - 2 * k, 0.5, wx, cy, rr * 0.5); hg.addColorStop(0, '#b8b0a0'); hg.addColorStop(0.6, '#7a6a58'); hg.addColorStop(1, '#3a2c20'); g.fillStyle = hg; g.beginPath(); g.arc(wx, cy, rr * 0.48, 0, 7); g.fill();
    g.fillStyle = '#2a2622'; g.beginPath(); g.arc(wx, cy, rr * 0.15, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,210,150,0.4)'; g.lineWidth = 1.2; g.beginPath(); g.arc(wx, cy, rr - 0.6, 3.4, 4.9); g.stroke();
  }
  if (p.open) { g.save(); g.translate(L * 0.76, -44 * k); g.rotate(-1.0); g.fillStyle = rgb(shade(col, 0.8)); g.fillRect(0, -3 * k, L * 0.2, 3 * k); g.restore(); }
  g.restore();
};

// ------------------------------------------------------------------ tyres
function tyre(g, x, y, rad, r) {
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x + 1.5, y + 2, rad, 0, 7); g.fill();
  const gr = g.createRadialGradient(x - rad * 0.35, y - rad * 0.35, rad * 0.2, x, y, rad); gr.addColorStop(0, '#4c4844'); gr.addColorStop(0.7, '#282524'); gr.addColorStop(1, '#0e0d0c');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  g.strokeStyle = 'rgba(160,150,138,0.2)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, rad * 0.78, 0, 7); g.stroke();
  g.fillStyle = '#0a0908'; g.beginPath(); g.arc(x, y, rad * 0.46, 0, 7); g.fill();
  if (r.next() < 0.45) { g.fillStyle = 'rgba(126,80,48,0.5)'; g.beginPath(); g.arc(x, y, rad * 0.34, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(255,206,150,0.38)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, rad - 0.6, 3.4, 4.9); g.stroke();
}
// p: {r: tyre radius, wall: true = rectangular wall (offset rows) instead of a pyramid}
K.ry_tyres = function (g, d, r) {
  const p = d.p || {}, rad = p.r || 14, base = d.y + d.h, cols = Math.max(1, Math.floor(d.w / (rad * 2 - 2))), rows = Math.max(1, Math.floor(d.h / (rad * 1.65)));
  shadow(g, d.x + d.w / 2, base - 1, d.w * 0.5, 4, 0.4);
  for (let j = 0; j < rows; j++) {
    const n = p.wall ? cols : Math.max(1, cols - j), y = base - rad - j * rad * 1.62, off = p.wall ? (j % 2 ? rad * 0.9 : 0) : (cols - n) * (rad - 1);
    for (let i = 0; i < n; i++) tyre(g, d.x + rad + off + i * (rad * 2 - 2) + r.range(-1.2, 1.2), y + r.range(-1, 1), rad, r);
  }
};

// ------------------------------------------------------------------ oil drums
const DRUM = [[138, 58, 38], [54, 88, 124], [66, 106, 68], [172, 142, 44], [110, 112, 108], [120, 60, 100]];
function drum(g, x, base, w, h, col, r, lying) {
  g.save();
  if (lying) { g.translate(x + h / 2, base - w / 2); g.rotate(-Math.PI / 2 + r.range(-0.06, 0.06)); g.translate(-w / 2, h / 2 - h); }
  else g.translate(x, base - h);
  shadow(g, w / 2, h, w * 0.7, 2.6, 0.35);
  cyl(g, 0, 0, w, h, col, true);
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, h * 0.2, w, 1.8); g.fillRect(0, h * 0.78, w, 1.8); g.fillStyle = 'rgba(255,214,160,0.18)'; g.fillRect(0, h * 0.2 + 1.8, w, 1); g.fillRect(0, h * 0.78 + 1.8, w, 1);
  g.fillStyle = 'rgba(232,222,196,0.75)'; g.fillRect(w * 0.28, h * 0.4, w * 0.44, h * 0.2);   // label band
  g.fillStyle = 'rgba(30,20,10,0.75)'; g.beginPath(); g.moveTo(w * 0.5, h * 0.42); g.lineTo(w * 0.62, h * 0.58); g.lineTo(w * 0.38, h * 0.58); g.closePath(); g.fill();   // hazard triangle
  rustBlotch(g, r, 0, h * 0.55, w, h * 0.45, 3, 0.55); drips(g, r, 0, h * 0.2, w, 3, h * 0.5);
  g.fillStyle = grad(g, 0, 0, 0, 5, [[0, rgb(shade(col, 1.5))], [1, rgb(shade(col, 0.6))]]); g.beginPath(); g.ellipse(w / 2, 1.5, w / 2, 3.2, 0, 0, 7); g.fill();   // lid
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.8; g.stroke();
  g.strokeStyle = 'rgba(255,206,150,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(1.2, 3); g.lineTo(1.2, h - 2); g.stroke();
  g.restore();
}
// p: {rows, cols}
K.ry_drums = function (g, d, r) {
  const p = d.p || {}, w = 20, h = 30, base = d.y + d.h, cols = p.cols || Math.max(1, Math.floor(d.w / (w + 3))), rows = p.rows || Math.max(1, Math.floor(d.h / (h * 0.92)));
  for (let j = 0; j < rows; j++) {
    const n = Math.max(1, cols - j), off = (cols - n) * (w + 3) / 2;
    for (let i = 0; i < n; i++) { const c = DRUM[r.int(0, DRUM.length - 1)]; if (j === 0 && r.next() < 0.14) drum(g, d.x + off + i * (w + 3), base, w, h, c, r, true); else drum(g, d.x + off + i * (w + 3) + r.range(-1, 1), base - j * (h - 2), w, h, c, r, false); }
  }
};

// ------------------------------------------------------------------ chain-link fence with barbed wire (see-through)
K.ry_fence = function (g, d, r) {
  const p = d.p || {}, base = d.y + d.h, top = d.y + 6, h = base - top, x0 = d.x, x1 = d.x + d.w;
  // mesh (torn patches are left out of the clip so the sky shows through)
  g.save(); g.beginPath(); g.rect(x0, top, d.w, h);
  for (let i = 0; i < (p.torn === undefined ? 2 : p.torn); i++) { const tx = x0 + r.range(14, d.w - 34), ty = top + r.range(h * 0.3, h * 0.7); g.moveTo(tx + 14, ty); g.ellipse(tx, ty, r.range(8, 15), r.range(6, 11), r.range(-0.6, 0.6), 0, 7); }
  g.clip('evenodd');
  g.strokeStyle = 'rgba(206,190,160,0.36)'; g.lineWidth = 0.8; g.beginPath();
  for (let x = x0 - h; x < x1 + h; x += 8) { g.moveTo(x, top); g.lineTo(x + h, base); g.moveTo(x + h, top); g.lineTo(x, base); }
  g.stroke();
  g.restore();
  // rails + posts
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x0, top + 1.5, d.w, 3);
  g.fillStyle = grad(g, 0, top, 0, top + 3, [[0, '#8a8478'], [1, '#3a3630']]); g.fillRect(x0, top, d.w, 3);
  g.fillStyle = grad(g, 0, base - 4, 0, base, [[0, '#6a645a'], [1, '#2a2622']]); g.fillRect(x0, base - 4, d.w, 3);
  for (let x = x0 + 2; x < x1; x += 54) { cyl(g, x, top - 5, 4, h + 5, [104, 98, 88], true); g.fillStyle = 'rgba(255,206,150,0.4)'; g.fillRect(x, top - 5, 1, h + 5); }
  // barbed wire
  g.strokeStyle = '#2a2622'; g.lineWidth = 1.2; g.beginPath(); for (let x = x0; x <= x1; x += 6) { const yy = top - 7 + Math.sin(x * 0.5) * 2; x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke();
  g.strokeStyle = 'rgba(190,176,150,0.7)'; g.lineWidth = 0.8; g.beginPath(); for (let x = x0 + 3; x <= x1; x += 12) { g.moveTo(x - 2, top - 10); g.lineTo(x + 2, top - 4); g.moveTo(x + 2, top - 10); g.lineTo(x - 2, top - 4); } g.stroke();
  rustBlotch(g, r, x0, top, d.w, h, Math.round(d.w / 40), 0.3);
};

// ------------------------------------------------------------------ crude painted signboard on posts
// p: {text:'LINE1\nLINE2', col:'#c8b8a0' paint, bg:[r,g,b] board, tilt, skull:true}
K.ry_board = function (g, d, r) {
  const p = d.p || {}, lines = String(p.text || 'KEEP OUT').split('\n'), base = d.y + d.h;
  const bw = Math.min(d.w - 10, 240), bh = Math.min(d.h - 26, 24 + lines.length * 22), bx = d.x + (d.w - bw) / 2, by = d.y + 2;
  for (const px of [bx + 10, bx + bw - 14]) { cyl(g, px, by + bh - 6, 5, base - (by + bh - 6), [96, 70, 44], true); }
  shadow(g, bx + bw / 2, base - 1, bw * 0.45, 3, 0.35);
  g.save(); g.translate(bx + bw / 2, by + bh / 2); g.rotate(p.tilt === undefined ? r.range(-0.03, 0.03) : p.tilt); g.translate(-bw / 2, -bh / 2);
  const bg = p.bg || [104, 80, 54];
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(3, 4, bw, bh);
  g.fillStyle = grad(g, 0, 0, 0, bh, [[0, rgb(shade(bg, 1.3))], [1, rgb(shade(bg, 0.6))]]); g.fillRect(0, 0, bw, bh);
  for (let y = 0; y < bh; y += 11) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, y, bw, 1); g.fillStyle = 'rgba(255,220,170,0.14)'; g.fillRect(0, y + 1, bw, 1); }
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5; g.strokeRect(0.75, 0.75, bw - 1.5, bh - 1.5);
  rivet(g, 5, 5, 1.5, [110, 100, 90]); rivet(g, bw - 5, 5, 1.5, [110, 100, 90]); rivet(g, 5, bh - 5, 1.5, [110, 100, 90]); rivet(g, bw - 5, bh - 5, 1.5, [110, 100, 90]);
  g.fillStyle = p.col || '#d2c6a8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const fs = Math.min(20, Math.max(11, Math.floor((bh - 8) / lines.length) - 2));
  g.font = 'bold ' + fs + 'px Impact, "Arial Black", "DejaVu Sans", sans-serif';
  lines.forEach((l, i) => { const yy = bh / 2 + (i - (lines.length - 1) / 2) * (fs + 3); let f = fs; while (g.measureText(l).width > bw - 20 && f > 8) { f--; g.font = 'bold ' + f + 'px Impact, "Arial Black", "DejaVu Sans", sans-serif'; } g.fillText(l, bw / 2 + r.range(-1, 1), yy + r.range(-0.5, 0.5)); g.font = 'bold ' + fs + 'px Impact, "Arial Black", "DejaVu Sans", sans-serif'; });
  for (let i = 0; i < 4; i++) { const px = bw * r.range(0.1, 0.9); g.fillStyle = grad(g, 0, bh * 0.4, 0, bh + 10, [[0, p.col || '#d2c6a8'], [1, 'rgba(200,190,160,0)']]); g.globalAlpha = 0.5; g.fillRect(px, bh * 0.7, 1.4, r.range(4, 10)); g.globalAlpha = 1; }
  g.restore();
};

// ------------------------------------------------------------------ raider banner (pole + tattered flag with skull)
// p: {flag:[r,g,b], side:1|-1 (flag hangs to the right/left)}
K.ry_banner = function (g, d, r) {
  const p = d.p || {}, base = d.y + d.h, px = d.x + d.w / 2, sd = p.side || 1, fc = p.flag || [150, 30, 24];
  shadow(g, px, base - 1, 12, 2.6, 0.35);
  cyl(g, px - 2.5, d.y + 4, 5, base - d.y - 4, [104, 100, 92], true);
  g.fillStyle = '#e8d8b0'; g.beginPath(); g.arc(px, d.y + 3, 4, 0, 7); g.fill();   // finial: a skull
  g.fillStyle = '#20180e'; g.fillRect(px - 2.4, d.y + 2, 1.6, 1.6); g.fillRect(px + 0.8, d.y + 2, 1.6, 1.6);
  const fw = Math.min(58, d.w - 6) * sd, fh = Math.min(d.h * 0.55, 92), fy = d.y + 12;
  const w1 = () => Math.sin(fy) * 0;
  g.save(); g.translate(px, fy);
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(fw * 0.35, 4, fw * 0.7, -4, fw, 2); g.lineTo(fw * 0.94, fh * 0.3); g.lineTo(fw * 1.0, fh * 0.55); g.lineTo(fw * 0.9, fh * 0.8); g.lineTo(fw * 0.96, fh);
  g.lineTo(fw * 0.7, fh * 0.86); g.lineTo(fw * 0.5, fh * 1.0); g.lineTo(fw * 0.3, fh * 0.88); g.lineTo(fw * 0.1, fh * 0.98); g.lineTo(0, fh * 0.9); g.closePath();
  g.fillStyle = grad(g, 0, 0, fw, 0, [[0, rgb(shade(fc, 1.3))], [0.5, rgb(fc)], [1, rgb(shade(fc, 0.5))]]); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.stroke();
  g.save(); g.clip();
  // skull emblem
  const sx = fw * 0.5, sy = fh * 0.42; g.fillStyle = 'rgba(232,220,190,0.9)'; g.beginPath(); g.ellipse(sx, sy, 10, 11, 0, 0, 7); g.fill(); g.fillRect(sx - 5, sy + 6, 10, 8);
  g.fillStyle = '#1a100a'; g.beginPath(); g.ellipse(sx - 4, sy - 1, 3, 3.6, 0, 0, 7); g.ellipse(sx + 4, sy - 1, 3, 3.6, 0, 0, 7); g.fill(); g.fillRect(sx - 1, sy + 3, 2, 3);
  g.strokeStyle = '#1a100a'; g.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(sx + i * 3.4, sy + 8); g.lineTo(sx + i * 3.4, sy + 13); g.stroke(); }
  g.strokeStyle = 'rgba(232,220,190,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx - 18, sy + 18); g.lineTo(sx + 18, sy + 30); g.moveTo(sx + 18, sy + 18); g.lineTo(sx - 18, sy + 30); g.stroke();
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(20,10,6,0.25)'; g.fillRect(r.range(0, Math.abs(fw)) * sd, r.range(0, fh), r.range(2, 8), r.range(2, 9)); }
  g.restore(); g.restore(); void w1;
};

// ------------------------------------------------------------------ scrap heap (background silhouette mound; p.far hazes it toward the sky)
K.ry_heap = function (g, d, r) {
  const p = d.p || {}, base = d.y + d.h, x0 = d.x, w = d.w, h = d.h;
  const cols = [[92, 60, 44], [62, 72, 80], [110, 92, 64], [70, 66, 62], [98, 50, 40], [56, 78, 72]];
  const mound = new Path2D(); mound.moveTo(x0, base);
  const n = Math.max(6, Math.round(w / 34));
  for (let i = 0; i <= n; i++) { const t = i / n, hh = h * (0.22 + 0.78 * Math.sin(Math.PI * t) * r.range(0.72, 1)); mound.lineTo(x0 + t * w, base - hh + (i && i < n ? r.range(-4, 4) : 0)); }
  mound.lineTo(x0 + w, base); mound.closePath();
  g.fillStyle = grad(g, 0, base - h, 0, base, [[0, '#4a3a30'], [1, '#2a2018']]); g.fill(mound);
  g.save(); g.clip(mound);
  for (let i = 0; i < Math.round(w / 11); i++) {
    const cx = x0 + r.range(0, w), cy = base - r.range(4, h * 0.95), c = cols[r.int(0, cols.length - 1)], sz = r.range(9, 26), a = r.range(-0.7, 0.7);
    g.save(); g.translate(cx, cy); g.rotate(a);
    const kind = r.int(0, 5);
    if (kind === 0) { g.fillStyle = rgb(c); g.fillRect(-sz, -sz * 0.35, sz * 2, sz * 0.7); g.fillStyle = 'rgba(255,196,130,0.3)'; g.fillRect(-sz, -sz * 0.35, sz * 2, 1.4); }
    else if (kind === 1) { g.fillStyle = '#1c1a18'; g.beginPath(); g.arc(0, 0, sz * 0.5, 0, 7); g.fill(); g.fillStyle = '#0a0908'; g.beginPath(); g.arc(0, 0, sz * 0.22, 0, 7); g.fill(); }
    else if (kind === 2) { g.fillStyle = rgb(shade(c, 0.8)); g.fillRect(-sz * 0.6, -sz * 0.5, sz * 1.2, sz); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.strokeRect(-sz * 0.6, -sz * 0.5, sz * 1.2, sz); }
    else if (kind === 3) { g.strokeStyle = rgb(shade(c, 0.9)); g.lineWidth = 2.4; g.beginPath(); g.moveTo(-sz, 0); g.lineTo(sz, 0); g.moveTo(-sz * 0.8, -4); g.lineTo(sz * 0.7, 4); g.stroke(); }
    else if (kind === 4) { g.fillStyle = rgb(shade(c, 0.7)); g.beginPath(); g.moveTo(-sz, sz * 0.4); g.lineTo(-sz * 0.3, -sz * 0.5); g.lineTo(sz * 0.8, -sz * 0.2); g.lineTo(sz, sz * 0.5); g.closePath(); g.fill(); }
    else { g.fillStyle = rgb(c); g.beginPath(); g.ellipse(0, 0, sz * 0.5, sz * 0.32, 0, 0, 7); g.fill(); }
    g.restore();
  }
  g.fillStyle = grad(g, 0, base - h, 0, base, [[0, 'rgba(255,190,120,0.2)'], [0.5, 'rgba(0,0,0,0.05)'], [1, 'rgba(0,0,0,0.5)']]); g.fillRect(x0, base - h - 8, w, h + 8);
  if (p.far) { g.fillStyle = 'rgba(190,112,66,' + (p.far === true ? 0.5 : p.far) + ')'; g.fillRect(x0 - 4, base - h - 46, w + 8, h + 46); }
  g.restore();
};


// ------------------------------------------------------------------ lattice girder along a line
function truss(g, x0, y0, x1, y1, th, base, seg) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  seg = seg || th * 0.95;
  g.save(); g.translate(x0, y0); g.rotate(a);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2.4; g.beginPath(); for (let x = 0; x < len; x += seg) { g.moveTo(x + 1.5, -th / 2 + 3); g.lineTo(Math.min(len, x + seg) + 1.5, th / 2 - 1); } g.stroke();
  g.strokeStyle = rgb(shade(base, 0.8)); g.lineWidth = 2.2; g.beginPath(); for (let x = 0; x < len; x += seg) { g.moveTo(x, -th / 2 + 2); g.lineTo(Math.min(len, x + seg), th / 2 - 2); g.moveTo(x, -th / 2 + 2); g.lineTo(x, th / 2 - 2); } g.stroke();
  g.fillStyle = grad(g, 0, -th / 2, 0, -th / 2 + 4, [[0, rgb(shade(base, 1.5))], [1, rgb(shade(base, 0.95))]]); g.fillRect(0, -th / 2, len, 4);
  g.fillStyle = grad(g, 0, th / 2 - 4, 0, th / 2, [[0, rgb(shade(base, 0.8))], [1, rgb(shade(base, 0.35))]]); g.fillRect(0, th / 2 - 4, len, 4);
  g.fillStyle = 'rgba(255,214,160,0.4)'; g.fillRect(0, -th / 2, len, 1);
  g.restore();
}

// ------------------------------------------------------------------ gantry crane holding a wreck on a magnet
// p: {col, drop (0-1 of box height where the magnet hangs), pal (hanging car palette)}
function craneImpl(g, d, r) {
  const p = d.p || {}, base = d.y + d.h, x0 = d.x, w = d.w, h = d.h, col = p.col || [170, 126, 36];
  const mw = 38, mx = x0 + w * 0.3, top = d.y + 40, cx = mx + mw / 2;
  shadow(g, cx, base - 1, 60, 5, 0.4);
  // legs + mast
  beam(g, mx - 26, base, mx + 4, top + h * 0.45, 7, [92, 84, 76]); beam(g, mx + mw + 26, base, mx + mw - 4, top + h * 0.45, 7, [92, 84, 76]);
  plate(g, mx - 30, base - 10, mw + 60, 10, [84, 78, 70]);
  truss(g, cx, base - 10, cx, top, mw, col, 30);
  // counter jib + counterweight
  truss(g, cx, top + 4, x0 + w * 0.03, top + 8, 20, col, 22);
  plate(g, x0 + w * 0.02, top + 12, 40, 42, [98, 94, 88]); for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x0 + w * 0.02, top + 26 + i * 10, 40, 1.4); }
  // jib
  truss(g, cx, top, x0 + w * 0.97, top - 4, 28, col, 26);
  g.save(); g.beginPath(); g.rect(cx, top - 16, x0 + w * 0.97 - cx, 32); g.clip();
  g.fillStyle = 'rgba(30,26,20,0.55)'; for (let x = cx + 20; x < x0 + w * 0.97; x += 60) g.fillRect(x, top - 13, 14, 26);   // hazard blocks
  g.restore();
  // apex + light
  beam(g, cx, top - 6, cx - 14, top - 46, 5, [90, 84, 76]); beam(g, cx, top - 6, cx + 30, top - 40, 4, [90, 84, 76]);
  g.fillStyle = '#ff3a20'; g.beginPath(); g.arc(cx - 14, top - 48, 3, 0, 7); g.fill();
  // cab
  plate(g, mx - 10, top + 16, 58, 36, [70, 96, 104]); g.fillStyle = '#10181c'; g.fillRect(mx - 4, top + 22, 34, 18); g.fillStyle = 'rgba(232,150,90,0.4)'; g.beginPath(); g.moveTo(mx - 4, top + 40); g.lineTo(mx + 10, top + 22); g.lineTo(mx + 18, top + 22); g.lineTo(mx + 4, top + 40); g.fill();
  // cable + trolley + magnet + hanging wreck
  const tx = x0 + w * 0.86, cy = base - h * (p.drop || 0.4);
  plate(g, tx - 13, top + 12, 26, 9, [60, 56, 50]);
  g.strokeStyle = '#100e0c'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(tx - 3, top + 20); g.lineTo(tx - 3, cy); g.moveTo(tx + 3, top + 20); g.lineTo(tx + 3, cy); g.stroke();
  g.strokeStyle = 'rgba(255,206,150,0.3)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(tx - 3.6, top + 20); g.lineTo(tx - 3.6, cy); g.stroke();
  cyl(g, tx - 20, cy, 40, 12, [70, 66, 60]); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(tx - 20, cy + 10, 40, 2);
  g.strokeStyle = '#1a1816'; g.lineWidth = 1.6; g.beginPath(); for (const ox of [-16, -6, 6, 16]) { g.moveTo(tx + ox, cy + 12); g.lineTo(tx + ox * 1.5, cy + 30); } g.stroke();
  g.save(); g.translate(tx, cy + 26); g.rotate(p.tilt === undefined ? 0.1 : p.tilt);
  if (p.hang === 'cage') K.ry_cage(g, { x: -22, y: 0, w: 44, h: 72, s: 9, p: { chain: false } }, r);
  else K.ry_car(g, { x: -46, y: 0, w: 92, h: 46, s: 5, p: { pal: p.pal === undefined ? 1 : p.pal, flat: 2, noShadow: true, tilt: 0 } }, r);
  g.restore();
  rustBlotch(g, r, mx, top, mw, base - top - 12, 10, 0.3);
}
K.ry_crane = function (g, d, r) { if ((d.p || {}).flip) { g.translate(d.x * 2 + d.w, 0); g.scale(-1, 1); } craneImpl(g, d, r); };

// ------------------------------------------------------------------ hanging prisoner cage (p: {empty, chain:false to omit the chain})
K.ry_cage = function (g, d, r) {
  const p = d.p || {}, x0 = d.x, w = d.w, cy = d.y + (p.chain === false ? 0 : 30), h = d.h - (p.chain === false ? 0 : 30), cx = x0 + w / 2;
  if (p.chain !== false) { g.strokeStyle = '#141210'; g.lineWidth = 3; for (let y = d.y; y < cy - 2; y += 7) { g.beginPath(); g.ellipse(cx, y + 3.5, 2.6, 4, 0, 0, 7); g.stroke(); } }
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x0 + 4, cy + 3, w, h);
  // back dark
  g.fillStyle = 'rgba(8,6,6,0.55)'; g.fillRect(x0 + 2, cy + 4, w - 4, h - 8);
  if (!p.empty) {   // slumped skeleton
    const bx = cx + 2, by = cy + h - 8;
    g.fillStyle = '#d6cbb0'; g.beginPath(); g.ellipse(bx - 3, by - h * 0.42, 5.5, 6, 0, 0, 7); g.fill(); g.fillStyle = '#120c08'; g.fillRect(bx - 6, by - h * 0.42 - 1, 2.4, 3); g.fillRect(bx - 1.6, by - h * 0.42 - 1, 2.4, 3);
    g.strokeStyle = '#c8bda2'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx - 2, by - h * 0.34); g.lineTo(bx, by - 8); for (let i = 0; i < 4; i++) { g.moveTo(bx - 8, by - h * 0.3 + i * 4); g.quadraticCurveTo(bx, by - h * 0.32 + i * 4, bx + 7, by - h * 0.3 + i * 4); } g.moveTo(bx + 6, by - h * 0.32); g.lineTo(bx + 12, by - h * 0.12); g.lineTo(bx + 8, by - 2); g.stroke();
    g.fillStyle = 'rgba(46,80,132,0.75)'; g.fillRect(bx - 9, by - h * 0.3, 16, h * 0.22);
  }
  // bars
  for (let x = x0 + 2; x <= x0 + w - 2; x += (w - 4) / 5) { cyl(g, x - 1.6, cy, 3.2, h, [70, 66, 60], true); }
  g.fillStyle = grad(g, 0, cy, 0, cy + 5, [[0, '#6a645a'], [1, '#2a2622']]); g.fillRect(x0, cy, w, 5); g.fillRect(x0, cy + h * 0.5, w, 3); g.fillStyle = grad(g, 0, cy + h - 6, 0, cy + h, [[0, '#4a463e'], [1, '#1a1816']]); g.fillRect(x0, cy + h - 6, w, 6);
  g.fillStyle = '#4a463e'; g.beginPath(); g.moveTo(x0 + 2, cy); g.quadraticCurveTo(cx, cy - 12, x0 + w - 2, cy); g.fill();
  rustBlotch(g, r, x0, cy, w, h, 5, 0.5); g.fillStyle = 'rgba(255,206,150,0.3)'; g.fillRect(x0, cy, 1.4, h);
  g.fillStyle = '#8a7a30'; g.fillRect(cx + w * 0.22, cy + h * 0.5 - 1, 6, 5);   // padlock
};

// ------------------------------------------------------------------ raider gate arch with a painted sign
// p: {text, sub}
K.ry_gate = function (g, d, r) {
  const p = d.p || {}, base = d.y + d.h, x0 = d.x, w = d.w, h = d.h, pw = 44;
  shadow(g, x0 + w / 2, base - 1, w * 0.5, 4, 0.3);
  for (const px of [x0 + 8, x0 + w - 8 - pw]) {
    truss(g, px + pw / 2, base, px + pw / 2, d.y + 40, pw, [112, 98, 82], 34);
    K.ry_tyres(g, { x: px - 8, y: base - 60, w: pw + 16, h: 60, s: 3, p: { r: 12 } }, r);
    rustBlotch(g, r, px, d.y + 40, pw, h - 40, 6, 0.3);
  }
  const bx = x0 + 4, bw = w - 8, by = d.y + 4, bh = 62;
  beam(g, bx, by + bh + 6, bx + bw, by + bh + 6, 10, [92, 84, 76]);
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(bx + 4, by + 5, bw, bh);
  g.fillStyle = grad(g, 0, by, 0, by + bh, [[0, '#6a3a26'], [0.5, '#4e2a1c'], [1, '#2e1a12']]); g.fillRect(bx, by, bw, bh);
  for (let x = bx; x < bx + bw; x += 10) { g.fillStyle = 'rgba(255,200,150,0.09)'; g.fillRect(x, by, 4, bh); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 6, by, 4, bh); }
  g.fillStyle = 'rgba(255,214,160,0.35)'; g.fillRect(bx, by, bw, 1.6); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(bx, by + bh - 2, bw, 2);
  for (const rx of [bx + 8, bx + bw - 8]) for (const ry of [by + 8, by + bh - 9]) rivet(g, rx, ry, 2.2, [130, 112, 96]);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 30; g.font = 'bold ' + fs + 'px Impact, "Arial Black", "DejaVu Sans", sans-serif'; const txt = p.text || 'THE RUSTYARD';
  while (g.measureText(txt).width > bw - 60 && fs > 12) { fs--; g.font = 'bold ' + fs + 'px Impact, "Arial Black", "DejaVu Sans", sans-serif'; }
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillText(txt, bx + bw / 2 + 2, by + bh * 0.4 + 2);
  g.fillStyle = '#d8c8a0'; g.fillText(txt, bx + bw / 2, by + bh * 0.4);
  g.font = 'bold 12px "Courier New", monospace'; g.fillStyle = '#c23a24'; g.fillText(p.sub || 'PROPERTY OF BIG BULLDOG', bx + bw / 2, by + bh * 0.78);
  drips(g, r, bx, by + bh * 0.5, bw, 14, 20, '216,200,160');
  rustBlotch(g, r, bx, by, bw, bh, 14, 0.4);
  // skulls on the ends + hanging chain
  for (const sx of [bx + 22, bx + bw - 22]) { g.fillStyle = '#e2d4ae'; g.beginPath(); g.ellipse(sx, by - 2, 8, 9, 0, 0, 7); g.fill(); g.fillRect(sx - 4, by + 4, 8, 6); g.fillStyle = '#1a100a'; g.beginPath(); g.ellipse(sx - 3, by - 3, 2.2, 2.8, 0, 0, 7); g.ellipse(sx + 3, by - 3, 2.2, 2.8, 0, 0, 7); g.fill(); }
  g.strokeStyle = '#161412'; g.lineWidth = 2; for (const cx of [bx + bw * 0.3, bx + bw * 0.7]) { g.beginPath(); g.moveTo(cx, by + bh + 8); g.quadraticCurveTo(cx + 4, by + bh + 26, cx, by + bh + 40); g.stroke(); }
};

// ------------------------------------------------------------------ faded pre-war billboard on lattice legs
// p: {text, sub, col:[r,g,b] panel}
K.ry_billboard = function (g, d, r) {
  const p = d.p || {}, base = d.y + d.h, x0 = d.x, w = d.w, ph = Math.min(d.h * 0.56, 150), py = d.y + 6, col = p.col || [176, 52, 40];
  shadow(g, x0 + w / 2, base - 1, w * 0.45, 4, 0.3);
  for (const lx of [x0 + w * 0.18, x0 + w * 0.78]) truss(g, lx, base, lx, py + ph - 4, 16, [104, 96, 86], 22);
  // catwalk
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x0 + 6, py + ph + 6, w - 12, 5); plate(g, x0 + 4, py + ph + 2, w - 8, 5, [110, 100, 88]);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x0 + 4, py + ph - 14, w - 8, 1.5);
  // panel
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x0 + 8, py + 5, w - 4, ph);
  g.fillStyle = grad(g, 0, py, 0, py + ph, [[0, rgb(shade(col, 1.3))], [1, rgb(shade(col, 0.65))]]); g.fillRect(x0 + 4, py, w - 8, ph);
  g.fillStyle = 'rgba(236,222,190,0.92)'; g.fillRect(x0 + 4, py + ph * 0.58, w - 8, ph * 0.42);   // cream lower band
  g.textAlign = 'center'; g.textBaseline = 'middle';
  fitFont(g, p.text || 'Nuka-Cola', w - 30, Math.round(ph * 0.32), '"Brush Script MT", "DejaVu Sans", cursive, sans-serif', 'italic bold'); g.fillStyle = '#f4ecd2'; g.fillText(p.text || 'Nuka-Cola', x0 + w / 2, py + ph * 0.3);
  fitFont(g, p.sub || 'ENJOY THE END OF THE WORLD', w - 30, Math.round(ph * 0.17), '"DejaVu Sans", sans-serif'); g.fillStyle = '#7a2418'; g.fillText(p.sub || 'ENJOY THE END OF THE WORLD', x0 + w / 2, py + ph * 0.79);
  // peeling + torn corner
  g.fillStyle = 'rgba(30,20,12,0.5)'; g.beginPath(); g.moveTo(x0 + w - 4, py); g.lineTo(x0 + w - 44, py); g.lineTo(x0 + w - 12, py + 40); g.lineTo(x0 + w - 4, py + 34); g.closePath(); g.fill();
  rustBlotch(g, r, x0 + 4, py, w - 8, ph, 12, 0.4); drips(g, r, x0 + 4, py + ph * 0.5, w - 8, 16, 26, '90,44,20');
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.strokeRect(x0 + 4, py, w - 8, ph);
  g.strokeStyle = 'rgba(255,206,150,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0 + 4.6, py + ph); g.lineTo(x0 + 4.6, py); g.lineTo(x0 + w - 4, py); g.stroke();
};

// ------------------------------------------------------------------ lamp pole with an arm (place the `O` hanging lamp at the arm's end)
// p: {arm: signed px from the pole centre to the arm end (default +40), col}
K.ry_pole = function (g, d, r) {
  const p = d.p || {}, base = d.y + d.h, px = d.x + d.w / 2, arm = p.arm === undefined ? 40 : p.arm, sd = arm < 0 ? -1 : 1;
  shadow(g, px, base - 1, 10, 2.4, 0.3);
  cyl(g, px - 3, d.y + 3, 6, base - d.y - 3, p.col || [96, 92, 84], true);
  beam(g, px, d.y + 6, px + arm, d.y + 3, 5, p.col || [96, 92, 84]);
  beam(g, px, d.y + 30, px + arm * 0.6, d.y + 6, 3, p.col || [96, 92, 84]);
  g.fillStyle = 'rgba(255,206,150,0.4)'; g.fillRect(px - 3, d.y + 3, 1, base - d.y - 3);
  g.fillStyle = '#161412'; g.beginPath(); g.arc(px + arm, d.y + 3, 2.4, 0, 7); g.fill();
  rivet(g, px, base - 22, 1.6); rivet(g, px, base - 44, 1.6); void sd;
};

// ------------------------------------------------------------------ timber scaffold (posts, cross braces, plank levels)
// p: {levels: [px offsets from the box top of plank decks], braces: true}
K.ry_scaffold = function (g, d, r) {
  const p = d.p || {}, base = d.y + d.h, x0 = d.x, w = d.w, wood = [98, 72, 46];
  const n = Math.max(2, Math.round(w / 70) + 1), lv = p.levels || [d.h * 0.5];
  const xs = []; for (let i = 0; i < n; i++) xs.push(x0 + 5 + i * (w - 10) / (n - 1));
  shadow(g, x0 + w / 2, base - 1, w * 0.5, 3, 0.3);
  if (p.braces !== false) for (let i = 0; i < n - 1; i++) { const ys = [d.y].concat(lv.map((v) => d.y + v)).concat([base]); for (let j = 0; j < ys.length - 1; j++) { if (r.next() < 0.75) beam(g, xs[i], ys[j], xs[i + 1], ys[j + 1], 3.4, shade(wood, 0.85)); } }
  for (const x of xs) { cyl(g, x - 3, d.y, 6, d.h, wood, true); g.fillStyle = 'rgba(255,206,150,0.3)'; g.fillRect(x - 3, d.y, 1, d.h); for (let y = d.y + 20; y < base - 4; y += r.range(30, 60)) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x - 3, y, 6, 2); } }
  for (const v of lv) { const y = d.y + v; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x0, y + 5, w, 4); cyl(g, x0 - 2, y, w + 4, 5, wood, false); g.fillStyle = 'rgba(255,206,150,0.35)'; g.fillRect(x0 - 2, y, w + 4, 1); }
};

// ------------------------------------------------------------------ fuel tank on a frame
K.ry_tank = function (g, d, r) {
  const p = d.p || {}, base = d.y + d.h, x0 = d.x, w = d.w, tw = w * 0.86, th = Math.min(d.h * 0.55, 70), ty = base - 22 - th, tx = x0 + (w - tw) / 2, col = p.col || [124, 128, 118];
  shadow(g, x0 + w / 2, base - 1, w * 0.5, 3.5, 0.35);
  for (const lx of [tx + tw * 0.14, tx + tw * 0.8]) { beam(g, lx, ty + th, lx - 6, base, 6, [86, 82, 74]); beam(g, lx + 10, ty + th, lx + 16, base, 6, [86, 82, 74]); beam(g, lx - 6, base - 12, lx + 16, base - 22, 3, [86, 82, 74]); }
  g.fillStyle = grad(g, 0, ty, 0, ty + th, [[0, rgb(shade(col, 1.6))], [0.3, rgb(shade(col, 1.1))], [0.7, rgb(shade(col, 0.6))], [1, rgb(shade(col, 0.28))]]);
  g.beginPath(); g.moveTo(tx + th / 2, ty); g.lineTo(tx + tw - th / 2, ty); g.quadraticCurveTo(tx + tw + 4, ty + th / 2, tx + tw - th / 2, ty + th); g.lineTo(tx + th / 2, ty + th); g.quadraticCurveTo(tx - 4, ty + th / 2, tx + th / 2, ty); g.fill();
  g.save(); g.clip();
  g.fillStyle = 'rgba(196,60,40,0.85)'; g.fillRect(tx, ty + th * 0.42, tw, th * 0.2); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(tx, ty + th * 0.42, tw, 1.2);
  g.fillStyle = 'rgba(240,232,208,0.9)'; g.font = 'bold ' + Math.round(th * 0.2) + 'px Impact, "DejaVu Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.text || 'FUEL', tx + tw / 2, ty + th * 0.52);
  for (const sx of [tx + tw * 0.26, tx + tw * 0.5, tx + tw * 0.74]) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(sx, ty, 2, th); g.fillStyle = 'rgba(255,206,150,0.2)'; g.fillRect(sx + 2, ty, 1, th); }
  rustBlotch(g, r, tx, ty, tw, th, 10, 0.5); drips(g, r, tx, ty + th * 0.6, tw, 8, th * 0.4);
  g.restore();
  cyl(g, tx + tw * 0.5 - 6, ty - 7, 12, 8, [90, 84, 76]); g.fillStyle = '#20180e'; g.fillRect(tx + tw * 0.5 - 4, ty - 9, 8, 3);
  // ladder + pipe
  g.strokeStyle = '#2a2622'; g.lineWidth = 2; g.beginPath(); g.moveTo(tx + tw + 2, ty + th - 4); g.lineTo(tx + tw + 8, base); g.moveTo(tx + tw + 10, ty + th - 4); g.lineTo(tx + tw + 16, base); g.stroke();
  g.lineWidth = 1.4; for (let y = ty + th; y < base - 4; y += 8) { g.beginPath(); g.moveTo(tx + tw + 2 + (y - ty - th) / (base - ty - th) * 6, y); g.lineTo(tx + tw + 10 + (y - ty - th) / (base - ty - th) * 6, y); g.stroke(); }
  cyl(g, tx + tw * 0.2, ty + th, 5, base - ty - th - 4, [110, 96, 80], true); g.fillStyle = '#b02a1e'; g.beginPath(); g.arc(tx + tw * 0.2 + 2.5, base - 30, 5, 0, 7); g.fill();
};

// ------------------------------------------------------------------ diesel generator with a stack and cables
K.ry_gen = function (g, d, r) {
  const p = d.p || {}, base = d.y + d.h, x0 = d.x, w = d.w, h = Math.min(d.h, 62), y = base - h;
  shadow(g, x0 + w / 2, base - 1, w * 0.55, 3, 0.4);
  plate(g, x0 + 2, y + 6, w - 4, h - 6, p.col || [126, 118, 62]);
  g.fillStyle = 'rgba(0,0,0,0.5)'; for (let x = x0 + 10; x < x0 + w * 0.55; x += 5) g.fillRect(x, y + 14, 2.4, h - 26);   // vents
  g.fillStyle = '#101418'; g.fillRect(x0 + w * 0.62, y + 14, w * 0.3, 16); g.fillStyle = '#ff5a30'; g.fillRect(x0 + w * 0.66, y + 20, 4, 4); g.fillStyle = '#4dff86'; g.fillRect(x0 + w * 0.76, y + 20, 4, 4);
  cyl(g, x0 + w * 0.8, y - 26, 8, 32, [84, 80, 74], true); g.fillStyle = '#100e0c'; g.fillRect(x0 + w * 0.8 - 1, y - 27, 10, 3);
  g.fillStyle = 'rgba(30,26,22,0.5)'; g.beginPath(); g.ellipse(x0 + w * 0.8 + 4, y - 34, 7, 3, 0, 0, 7); g.fill();
  g.strokeStyle = '#100e0c'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 + 4, base - 6); g.bezierCurveTo(x0 - 16, base - 2, x0 - 24, base - 8, x0 - 34, base - 2); g.stroke();
  rustBlotch(g, r, x0, y, w, h, 6, 0.45);
  for (const rx of [x0 + 8, x0 + w - 8]) rivet(g, rx, y + 12, 1.6);
};


// ------------------------------------------------------------------ single support post with a bracket (p: {side:1|-1 bracket direction, col})
K.ry_post = function (g, d, r) {
  const p = d.p || {}, base = d.y + d.h, px = d.x + d.w / 2, sd = p.side || 1, col = p.col || [98, 72, 46];
  shadow(g, px, base - 1, 9, 2, 0.3);
  cyl(g, px - 4, d.y, 8, d.h, col, true); g.fillStyle = 'rgba(255,206,150,0.32)'; g.fillRect(px - 4, d.y, 1.4, d.h);
  for (let y = d.y + 14; y < base - 6; y += r.range(26, 44)) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(px - 4, y, 8, 2); }
  beam(g, px, d.y + 30, px + sd * 22, d.y, 4, shade(col, 0.85));
  rivet(g, px, d.y + 6, 1.6);
};


// ------------------------------------------------------------------ pile of wrecks (2-4 cars stacked, jostled). p: {n, pals:[..]}
K.ry_carstack = function (g, d, r) {
  const p = d.p || {}, L = d.w, ch = L / 2, n = p.n || Math.max(2, Math.round(d.h / (ch * 0.6))), base = d.y + d.h;
  shadow(g, d.x + L / 2, base - 1, L * 0.52, 5, 0.4);
  for (let i = 0; i < n; i++) {
    const w = L * (1 - i * 0.07), cx = d.x + L / 2 + (i ? r.range(-L * 0.08, L * 0.08) : 0), y = base - i * ch * 0.6;
    g.save(); g.translate(cx, y); g.rotate((i ? r.range(-0.09, 0.09) : r.range(-0.02, 0.02)));
    K.ry_car(g, { x: -w / 2, y: -w / 2, w: w, h: w / 2, s: r.int(1, 9999), p: { pal: p.pals ? p.pals[i % p.pals.length] : r.int(0, 7), flat: r.int(0, 2), noShadow: i > 0, flip: r.next() < 0.5, burnt: r.next() < 0.15, kind: i === 0 ? 'sedan' : r.pick(['sedan', 'pickup', 'van']) } }, r);
    g.restore();
  }
};

})();
