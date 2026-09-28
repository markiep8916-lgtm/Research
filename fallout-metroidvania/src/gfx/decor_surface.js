// Surface (Cinder Ridge town) decor painters: CD.decor.kinds.sf_<name> = function (g, d, r) {...}
// Everything is "fully lit albedo": mid values, baked AO, warm rim light on the upper-right faces, cool/dark lower-left,
// rust, grime, chipped paint, bullet holes. Painters run once per chunk into a cached canvas (world px, 1 tile = 40 px).
// All randomness comes from r (seeded per placement) so a placement always paints identically in every chunk it touches;
// d.p.flip mirrors a painter about the box centre (light stays on the screen-right, text is un-mirrored).
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const K = CD.decor.kinds;
const INFO = (CD.decor.sfInfo = CD.decor.sfInfo || {});
const PI = Math.PI, TAU = PI * 2;
const rgb = U.rgb, mix = U.mix, cl = U.clamp;

let FL = false;   // current painter is mirrored
let LX = 1;       // light direction on the local x axis (screen-right = +1)

// ====================================================================== colour
const WARM = [255, 232, 196], COOL = [14, 16, 30];
// tone: k>1 pushes toward warm sun-cream, k<1 toward cool shadow-blue (painterly value shifts instead of plain scaling)
function tn(c, k, a) { c = U.hex(c); return rgb(k >= 1 ? mix(c, WARM, Math.min(1, (k - 1) * 0.8)) : mix(c, COOL, Math.min(1, (1 - k) * 0.9)), a); }
function tnA(c, k) { c = U.hex(c); return k >= 1 ? mix(c, WARM, Math.min(1, (k - 1) * 0.8)) : mix(c, COOL, Math.min(1, (1 - k) * 0.9)); }
const S_ = (c) => (Array.isArray(c) ? rgb(c) : c);   // css string / gradient / pattern pass through; [r,g,b] -> css
function lg(g, x0, y0, x1, y1, st) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < st.length; i++) gr.addColorStop(st[i][0], S_(st[i][1])); return gr; }
function vg(g, y0, y1, st) { return lg(g, 0, y0, 0, y1, st); }
function hg(g, xl, xr, st) { return FL ? lg(g, xr, 0, xl, 0, st) : lg(g, xl, 0, xr, 0, st); }   // screen-left -> screen-right
function rg(g, x, y, r0, r1, st, x1, y1) { const gr = g.createRadialGradient(x, y, r0, x1 === undefined ? x : x1, y1 === undefined ? y : y1, r1); for (let i = 0; i < st.length; i++) gr.addColorStop(st[i][0], S_(st[i][1])); return gr; }
const lit = (side, xl, xr) => ((side === 'R') !== FL ? xr : xl);    // local x of the screen-left ('L') / screen-right ('R') edge

// ====================================================================== paths
function poly(g, p) { g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); }
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r); g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r); g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath();
}
// smooth closed/open curve through points; a 3rd element (truthy) marks a hard corner
function spline(g, P, closed, move) {
  const n = P.length, at = (i) => (closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))]);
  if (move !== false) g.moveTo(P[0][0], P[0][1]); else g.lineTo(P[0][0], P[0][1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    g.bezierCurveTo(p1[2] ? p1[0] : p1[0] + (p2[0] - p0[0]) / 6, p1[2] ? p1[1] : p1[1] + (p2[1] - p0[1]) / 6, p2[2] ? p2[0] : p2[0] - (p3[0] - p1[0]) / 6, p2[2] ? p2[1] : p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) g.closePath();
}
function bbox(p) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of p) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; } return [x0, y0, x1 - x0, y1 - y0]; }
function ln(g, x0, y0, x1, y1, c, w) { g.strokeStyle = S_(c); g.lineWidth = w || 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
function fr(g, c, x, y, w, h) { g.fillStyle = S_(c); g.fillRect(x, y, w, h); }
function circ(g, x, y, r, c) { g.fillStyle = S_(c); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function ell(g, x, y, rx, ry, c, rot) { g.fillStyle = S_(c); g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); g.fill(); }
function within(g, pf, fn) { g.save(); g.beginPath(); pf(g); g.clip(); fn(g); g.restore(); }
const P_ = (pts) => (g) => poly(g, pts);
const R_ = (x, y, w, h, r) => (g) => rr(g, x, y, w, h, r || 0);

// ====================================================================== off-screen layers and noise textures
function scaleOf(g) { const m = g.getTransform(); return Math.max(1, Math.hypot(m.a, m.b)); }
function layer(g, x, y, w, h, fn) {
  const sc = scaleOf(g), c = U.canvas(Math.ceil(w * sc), Math.ceil(h * sc)), L = c.getContext('2d');
  L.scale(sc, sc); L.translate(-x, -y); fn(L);
  g.drawImage(c, x, y, c.width / sc, c.height / sc);
}
const TX = {};
function tex(name) {
  if (TX[name]) return TX[name];
  const S = 256, c = U.canvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data, n = S * S;
  if (name === 'grain') {
    const q = U.RNG(11);
    for (let i = 0; i < n; i++) { const v = q.next(), j = i * 4; if (v < 0.4) { d[j] = 10; d[j + 1] = 6; d[j + 2] = 8; d[j + 3] = 20 + q.next() * 70; } else if (v > 0.78) { d[j] = 255; d[j + 1] = 236; d[j + 2] = 205; d[j + 3] = 14 + q.next() * 56; } }
  } else if (name === 'rust') {
    const n1 = U.fbmField(S, S, 3, 5, 23), n2 = U.noiseField(S, S, 64, 64, 24), n3 = U.fbmField(S, S, 6, 4, 25);
    for (let i = 0; i < n; i++) {
      const t = U.smoothstep(0.5, 0.64, n1[i] * 0.86 + n2[i] * 0.14); if (t <= 0) continue;
      const o = U.smoothstep(0.32, 0.7, n3[i]), j = i * 4;
      d[j] = 92 + o * 84; d[j + 1] = 44 + o * 50; d[j + 2] = 22 + o * 20; d[j + 3] = t * (140 + n2[i] * 110);
    }
  } else if (name === 'dirt') {
    const n1 = U.fbmField(S, S, 3, 5, 37), n2 = U.noiseField(S, S, 90, 90, 38);
    for (let i = 0; i < n; i++) { const t = U.smoothstep(0.36, 0.78, n1[i] * 0.85 + n2[i] * 0.15), j = i * 4; d[j] = 40; d[j + 1] = 30; d[j + 2] = 22; d[j + 3] = t * 150; }
  } else if (name === 'streak') {
    const n1 = U.noiseField(S, S, 46, 3, 51), n2 = U.noiseField(S, S, 120, 6, 52), n3 = U.fbmField(S, S, 3, 3, 53);
    for (let i = 0; i < n; i++) { const t = U.smoothstep(0.52, 0.86, n1[i] * 0.7 + n2[i] * 0.3) * (0.4 + 0.9 * n3[i]), j = i * 4; d[j] = 34; d[j + 1] = 24; d[j + 2] = 16; d[j + 3] = Math.min(255, t * 190); }
  } else if (name === 'soot') {
    const n1 = U.fbmField(S, S, 4, 5, 61);
    for (let i = 0; i < n; i++) { const t = U.smoothstep(0.42, 0.8, n1[i]), j = i * 4; d[j] = 14; d[j + 1] = 12; d[j + 2] = 12; d[j + 3] = t * 190; }
  } else if (name === 'chip') {   // paint loss: pale primer / dark metal flecks
    const n1 = U.fbmField(S, S, 5, 4, 71), n2 = U.noiseField(S, S, 110, 110, 72);
    for (let i = 0; i < n; i++) { const t = U.smoothstep(0.6, 0.7, n1[i] * 0.6 + n2[i] * 0.4), j = i * 4; if (t > 0) { const o = n2[i] > 0.55; d[j] = o ? 96 : 60; d[j + 1] = o ? 62 : 40; d[j + 2] = o ? 44 : 30; d[j + 3] = t * 230; } }
  }
  g.putImageData(img, 0, 0);
  return (TX[name] = c);
}
// pattern overlay (texture) inside a rect, random offset from r
function over(g, name, x, y, w, h, a, r, sc) {
  const t = tex(name), p = g.createPattern(t, 'repeat'); sc = sc || 1;
  const ox = r ? r.next() * 256 : 0, oy = r ? r.next() * 256 : 0;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.globalAlpha = a; g.translate(ox, oy); g.scale(sc, sc); g.fillStyle = p;
  g.fillRect((x - ox) / sc, (y - oy) / sc, w / sc, h / sc); g.restore();
}
// same, but the opacity ramps from aTop (at y) to aBot (at y+h): rust near the bottom, soot above windows, ...
function overFade(g, name, x, y, w, h, aTop, aBot, r, sc) {
  const ox = r ? r.next() * 256 : 0, oy = r ? r.next() * 256 : 0;
  layer(g, x, y, w, h, (L) => {
    L.save(); L.translate(ox, oy); L.scale(sc || 1, sc || 1); L.fillStyle = L.createPattern(tex(name), 'repeat'); L.fillRect((x - ox) / (sc || 1), (y - oy) / (sc || 1), w / (sc || 1), h / (sc || 1)); L.restore();
    L.globalCompositeOperation = 'destination-in'; L.fillStyle = vg(L, y, y + h, [[0, 'rgba(0,0,0,' + aTop + ')'], [1, 'rgba(0,0,0,' + aBot + ')']]); L.fillRect(x, y, w, h);
  });
}

// ====================================================================== shape shading
// bevel light from the upper-right: warm rim inside the top/right edges, cool dark rim inside the bottom/left edges
function rim(g, pf, o) {
  o = o || {}; const w = o.w || 1.3;
  g.save(); g.beginPath(); pf(g); g.clip(); g.lineJoin = 'round'; g.lineCap = 'round';
  g.save(); g.translate(-1.5 * LX, 1.5); g.strokeStyle = o.hi || 'rgba(255,236,196,0.5)'; g.lineWidth = w; g.beginPath(); pf(g); g.stroke(); g.restore();
  g.save(); g.translate(1.7 * LX, -1.7); g.strokeStyle = o.lo || 'rgba(8,4,14,0.42)'; g.lineWidth = w * 1.4; g.beginPath(); pf(g); g.stroke(); g.restore();
  g.restore();
}
function edge(g, pf, a, w) { g.save(); g.lineJoin = 'round'; g.strokeStyle = 'rgba(22,12,10,' + (a === undefined ? 0.45 : a) + ')'; g.lineWidth = w || 1; g.beginPath(); pf(g); g.stroke(); g.restore(); }
// filled, volume-lit shape
function solid(g, pf, b, base, o) {
  o = o || {}; const x = b[0], y = b[1], w = b[2], h = b[3];
  g.beginPath(); pf(g); g.fillStyle = tn(base, 1); g.fill();
  g.save(); g.beginPath(); pf(g); g.clip();
  g.fillStyle = vg(g, y, y + h, [[0, 'rgba(255,238,205,' + (o.top === undefined ? 0.3 : o.top) + ')'], [0.3, 'rgba(255,238,205,0.04)'], [0.62, 'rgba(0,0,0,0)'], [1, 'rgba(12,8,20,' + (o.bot === undefined ? 0.4 : o.bot) + ')']]);
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle = hg(g, x, x + w, [[0, 'rgba(10,8,24,' + (o.left === undefined ? 0.26 : o.left) + ')'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(255,226,180,' + (o.right === undefined ? 0.14 : o.right) + ')']]);
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  if (o.grain !== false) over(g, 'grain', x, y, w, h, o.grain || 0.5, null, 1);
  g.restore();
  if (o.rim !== false) rim(g, pf);
  if (o.edge !== false) edge(g, pf, o.edgeA);
}
function box(g, x, y, w, h, base, o) { solid(g, R_(x, y, w, h, (o && o.r) || 0), [x, y, w, h], base, o); }
// soft ground contact shadow (upper half of a flattened ellipse standing on the ground line)
function contact(g, x, w, gy, a, h) {
  a = a === undefined ? 0.5 : a; h = h || 5;
  g.save(); g.translate(x + w / 2, gy); g.scale(1, h / (w / 2));
  g.fillStyle = rg(g, 0, 0, 0, w / 2, [[0, 'rgba(8,4,6,' + a + ')'], [0.55, 'rgba(8,4,6,' + a * 0.55 + ')'], [1, 'rgba(8,4,6,0)']]);
  g.beginPath(); g.arc(0, 0, w / 2, PI, TAU); g.fill(); g.restore();
}
// ambient occlusion: a gradient hugging one side of a rect ('t','b','l','r'), inside it
function ao(g, x, y, w, h, side, a, d) {
  d = d || 8; let gr;
  if (side === 'b') gr = vg(g, y + h, y + h - d, [[0, 'rgba(6,3,8,' + a + ')'], [1, 'rgba(6,3,8,0)']]);
  else if (side === 't') gr = vg(g, y, y + d, [[0, 'rgba(6,3,8,' + a + ')'], [1, 'rgba(6,3,8,0)']]);
  else if (side === 'l') gr = lg(g, x, 0, x + d, 0, [[0, 'rgba(6,3,8,' + a + ')'], [1, 'rgba(6,3,8,0)']]);
  else gr = lg(g, x + w, 0, x + w - d, 0, [[0, 'rgba(6,3,8,' + a + ')'], [1, 'rgba(6,3,8,0)']]);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}

// ====================================================================== materials
function chromeRect(g, x, y, w, h, o) {
  o = o || {};
  g.fillStyle = vg(g, y, y + h, [[0, '#f4e8d0'], [0.2, '#bdb3a2'], [0.45, '#4d5158'], [0.58, '#272a30'], [0.72, '#8a9198'], [1, '#e2dccd']]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillRect(x, y, w, Math.min(1, h * 0.2));
  g.fillStyle = hg(g, x, x + w, [[0, 'rgba(10,8,20,0.3)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(255,230,190,0.2)']]); g.fillRect(x, y, w, h);
  if (o.rust !== false) { const q = o.r; if (q) for (let i = 0; i < Math.max(2, w * h / 40); i++) { g.fillStyle = q.next() < 0.5 ? 'rgba(120,64,30,0.55)' : 'rgba(30,20,16,0.5)'; g.fillRect(x + q.next() * w, y + q.next() * h, 0.8 + q.next() * 1.4, 0.8 + q.next()); } }
}
function chromeStroke(g, pf, y0, y1, lw) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(14,8,10,0.55)'; g.lineWidth = lw + 1.4; g.beginPath(); pf(g); g.stroke();
  g.strokeStyle = vg(g, y0, y1, [[0, '#f4e8d0'], [0.3, '#b9ae9c'], [0.55, '#4d5158'], [0.75, '#8f969c'], [1, '#e2dccd']]); g.lineWidth = lw; g.beginPath(); pf(g); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(0.6, lw * 0.22); g.save(); g.translate(0, -lw * 0.22); g.beginPath(); pf(g); g.stroke(); g.restore(); g.restore();
}
function cylH(g, x, y, w, h, base) {   // horizontal tube, lit from above
  g.fillStyle = vg(g, y, y + h, [[0, tn(base, 0.62)], [0.16, tn(base, 1.3)], [0.4, tn(base, 1.0)], [0.75, tn(base, 0.62)], [1, tn(base, 0.36)]]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,240,210,0.35)'; g.fillRect(x, y + h * 0.16, w, Math.max(0.7, h * 0.08));
}
function cylV(g, x, y, w, h, base) {   // vertical tube, lit from the right
  g.fillStyle = hg(g, x, x + w, [[0, tn(base, 0.4)], [0.28, tn(base, 0.72)], [0.62, tn(base, 1.25)], [0.8, tn(base, 1.02)], [1, tn(base, 0.46)]]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,240,210,0.3)'; g.fillRect(lit('R', x, x + w) - (FL ? 0 : w * 0.34) + (FL ? w * 0.26 : 0), y, Math.max(0.7, w * 0.08), h);
}
function rivet(g, x, y, r, c) {
  c = c || [124, 120, 114];
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(x - 0.6 * LX, y + 0.9, r, 0, TAU); g.fill();
  g.fillStyle = rg(g, x + r * 0.3 * LX, y - r * 0.35, 0, r * 1.15, [[0, tn(c, 1.5)], [0.6, tn(c, 1)], [1, tn(c, 0.5)]]); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
// vertical corrugated sheet metal (ribs lit from the right); patterns cached per width
const RIBP = {};
function ribPattern(g, P, vertical) {
  const key = P + (vertical ? 'v' : 'h') + (FL ? 'f' : 'n');
  if (!RIBP[key]) {
    const c = U.canvas(vertical ? P : 4, vertical ? 4 : P), q = c.getContext('2d');
    q.fillStyle = vertical ? hg(q, 0, P, [[0, 'rgba(8,4,14,0.36)'], [0.28, 'rgba(8,4,14,0.06)'], [0.55, 'rgba(255,236,200,0.06)'], [0.82, 'rgba(255,236,200,0.34)'], [1, 'rgba(8,4,14,0.16)']]) : lg(q, 0, 0, 0, P, [[0, 'rgba(255,236,200,0.34)'], [0.4, 'rgba(255,236,200,0.05)'], [0.7, 'rgba(8,4,14,0.06)'], [1, 'rgba(8,4,14,0.4)']]);
    q.fillRect(0, 0, c.width, c.height); RIBP[key] = c;
  }
  return g.createPattern(RIBP[key], 'repeat');
}
function tin(g, pf, b, base, P, vertical) {
  P = P || 7; const x = b[0], y = b[1], w = b[2], h = b[3];
  g.save(); g.beginPath(); pf(g); g.clip();
  g.fillStyle = tn(base, 1); g.fillRect(x, y, w, h);
  g.fillStyle = ribPattern(g, P, vertical !== false); g.save(); g.translate(x, y); g.fillRect(0, 0, w, h); g.restore();
  g.restore();
}
// hand-painted lettering: exact-width fit so it lays out the same in any font
const F_SANS = '"Liberation Sans","Helvetica Neue",Helvetica,Arial,"DejaVu Sans",sans-serif';
const F_SERIF = 'Georgia,"Liberation Serif","DejaVu Serif",serif';
const F_MONO = '"Courier New","Liberation Mono","DejaVu Sans Mono",monospace';
function txt(g, s, x, y, o) {
  o = o || {}; const size = o.size || 12;
  g.save(); g.font = (o.style || 'bold') + ' ' + size + 'px ' + (o.family || F_SANS); g.textBaseline = o.base || 'middle'; g.textAlign = 'left';
  g.translate(x, y); if (o.rot) g.rotate(FL ? -o.rot : o.rot); if (FL) g.scale(-1, 1);
  const ls = o.ls || 0, chars = ls ? s.split('') : null;
  let tw = ls ? chars.reduce((a, c) => a + g.measureText(c).width + ls, -ls) : g.measureText(s).width, sx = 1;
  if (o.w) sx = o.w / tw; else if (o.maxW && tw > o.maxW) sx = o.maxW / tw;
  g.scale(sx, o.sy || 1); tw *= 1;
  const al = o.align || 'center', ox = al === 'center' ? -tw / 2 : (al === 'right' ? -tw : 0);
  const draw = (fn) => { if (!ls) fn(s, ox, 0); else { let cx = ox; for (const c of chars) { fn(c, cx, 0); cx += g.measureText(c).width + ls; } } };
  if (o.shadow) { g.fillStyle = o.shadow; draw((t, px, py) => g.fillText(t, px + 1, py + 1.2)); }
  if (o.stroke) { g.lineWidth = o.lw || 1; g.strokeStyle = S_(o.stroke); g.lineJoin = 'round'; draw((t, px, py) => g.strokeText(t, px, py)); }
  if (o.fill !== null) { g.fillStyle = S_(o.fill || '#fff'); draw((t, px, py) => g.fillText(t, px, py)); }
  g.restore();
  return tw * sx;
}
// ====================================================================== weathering
function drip(g, x, y, len, w, col, a) {
  g.fillStyle = vg(g, y, y + len, [[0, rgb(col, a)], [0.6, rgb(col, a * 0.55)], [1, rgb(col, 0)]]);
  g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y); g.lineTo(x + w * 0.18, y + len); g.lineTo(x - w * 0.18, y + len); g.closePath(); g.fill();
}
function hole(g, x, y, rad) {
  circ(g, x, y, rad * 1.9, 'rgba(120,64,30,0.32)');
  g.fillStyle = rg(g, x, y, 0, rad * 1.25, [[0, 'rgba(6,4,6,0.98)'], [0.62, 'rgba(10,6,8,0.92)'], [1, 'rgba(40,22,14,0.5)']]); g.beginPath(); g.arc(x, y, rad * 1.25, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,236,200,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, rad * 1.15, -0.5 * PI - (LX < 0 ? 0.9 : 0), 0.15 * PI - (LX < 0 ? 0.9 : 0)); g.stroke();
}
// rust: texture patches biased to the bottom, dashed edge corrosion, pits, drips. pf clips.
function rustify(g, pf, b, r, amt, o) {
  o = o || {}; const x = b[0], y = b[1], w = b[2], h = b[3];
  g.save(); g.beginPath(); pf(g); g.clip();
  overFade(g, 'rust', x, y, w, h, amt * (o.top === undefined ? 0.15 : o.top), Math.min(1, amt * (o.bot === undefined ? 1.15 : o.bot)), r, o.sc || 1);
  // corrosion along the borders
  g.lineJoin = 'round'; g.strokeStyle = 'rgba(126,62,28,' + (0.22 * Math.min(1, amt + 0.2)) + ')'; g.lineWidth = 4 + amt * 3;
  g.setLineDash([r.range(3, 12), r.range(5, 26), r.range(2, 8), r.range(6, 30)]); g.lineDashOffset = r.range(0, 60); g.beginPath(); pf(g); g.stroke();
  g.strokeStyle = 'rgba(70,32,16,0.3)'; g.lineWidth = 2; g.lineDashOffset = r.range(0, 60); g.beginPath(); pf(g); g.stroke(); g.setLineDash([]);
  // pits / flecks
  const n = Math.round(amt * w * h / 240);
  for (let i = 0; i < n; i++) {
    const px = x + r.next() * w, py = y + h * (1 - Math.pow(r.next(), o.bias || 1.6)), k = r.next();
    g.fillStyle = k < 0.45 ? 'rgba(150,76,34,0.6)' : k < 0.8 ? 'rgba(96,46,24,0.6)' : 'rgba(196,110,52,0.5)'; const s = 0.6 + r.next() * 1.4; g.fillRect(px, py, s, s * (0.6 + r.next() * 0.8));
  }
  // drips
  const nd = Math.round(amt * w / 26);
  for (let i = 0; i < nd; i++) drip(g, x + r.next() * w, y + h * (0.45 + r.next() * 0.5), r.range(8, 30) * (0.5 + amt), r.range(1.4, 3.6), [110, 52, 24], 0.42);
  g.restore();
}
// dark grime hugging the bottom + dust
function grime(g, pf, b, r, a) {
  const x = b[0], y = b[1], w = b[2], h = b[3];
  g.save(); g.beginPath(); pf(g); g.clip();
  g.fillStyle = vg(g, y + h, y + h * 0.5, [[0, 'rgba(30,20,12,' + (a * 0.85) + ')'], [1, 'rgba(30,20,12,0)']]); g.fillRect(x, y, w, h);
  overFade(g, 'dirt', x, y, w, h, a * 0.2, a * 1.0, r, 1.4);
  g.restore();
}
// paint chips: flecks of primer / metal / rust near edges
function chips(g, pf, b, r, n, cols, sz) {
  const x = b[0], y = b[1], w = b[2], h = b[3]; cols = cols || ['rgba(92,52,34,0.85)', 'rgba(52,46,44,0.8)', 'rgba(140,84,44,0.75)']; sz = sz || 2.4;
  g.save(); g.beginPath(); pf(g); g.clip();
  for (let i = 0; i < n; i++) {
    const px = x + r.next() * w, py = y + r.next() * h, s = 0.6 + r.next() * sz; g.fillStyle = cols[(r.next() * cols.length) | 0];
    g.beginPath(); g.moveTo(px, py); g.lineTo(px + s * (0.6 + r.next()), py + s * 0.2 * r.next()); g.lineTo(px + s * 0.8, py + s * (0.5 + r.next() * 0.7)); g.lineTo(px + s * 0.1 * r.next(), py + s * 0.8); g.closePath(); g.fill();
  }
  g.restore();
}
// long vertical grime / rust streaks below a horizontal edge
function streaks(g, x, y, w, len, n, r, col, a) {
  for (let i = 0; i < n; i++) drip(g, x + r.next() * w, y + r.next() * 4, len * (0.35 + r.next() * 0.65), r.range(1.6, 5), col || [40, 28, 18], a || 0.3);
}

// ====================================================================== view culling helper (identical RNG use, culled draws only)
function view(g) {
  const c = g.canvas, m = g.getTransform().inverse(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of [[0, 0], [c.width, 0], [0, c.height], [c.width, c.height]]) { const x = m.a * p[0] + m.c * p[1] + m.e, y = m.b * p[0] + m.d * p[1] + m.f; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, has: (x, y, w, h) => x < x1 + 2 && x + w > x0 - 2 && y < y1 + 2 && y + h > y0 - 2 };
}

// ====================================================================== registry
// def(name, nominal tiles w, h, fn(g, d, r, p), {free:true => paints the actual box, noscale:true}); local coords (0,0)-(W,H), ground = H
function def(name, nw, nh, fn, o) {
  o = o || {}; const kind = 'sf_' + name;
  INFO[kind] = { w: nw, h: nh, free: !!o.free };
  K[kind] = function (g, d, r) {
    const p = d.p || {}, NW = o.free ? d.w : nw * T, NH = o.free ? d.h : nh * T;
    g.save(); FL = !!p.flip; LX = FL ? -1 : 1;
    try {
      if (o.free) g.translate(d.x, d.y);
      else { let s = o.noscale ? 1 : Math.min(d.w / NW, d.h / NH); if (Math.abs(s - 1) < 0.002) s = 1; g.translate(d.x + d.w / 2, d.y + d.h); g.scale(s, s); g.translate(-NW / 2, -NH); }
      if (FL) { g.translate(NW, 0); g.scale(-1, 1); }
      fn(g, { x: 0, y: 0, w: NW, h: NH, p: p, s: d.s, v: view(g) }, r, p);
    } catch (e) { if (typeof console !== 'undefined') console.error('decor ' + kind + ':', e); }
    g.restore(); FL = false; LX = 1;
  };
}

// ====================================================================== shared vehicle parts
function arcp(g, cx, cy, rx, ry, a0, a1, n) {   // ellipse arc by SCREEN angle (mirror-safe), path only
  n = n || 14; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, x = cx + LX * Math.cos(a) * rx, y = cy + Math.sin(a) * ry; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
}
function cracks(g, cx, cy, R, r, a) {
  const n = r.int(6, 9); g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const an = (i / n) * TAU + r.range(-0.3, 0.3), len = R * r.range(0.6, 1.5); let x = cx, y = cy; const pts = [[x, y]];
    for (let s = 1; s <= 3; s++) { x = cx + Math.cos(an + r.range(-0.12, 0.12)) * len * s / 3; y = cy + Math.sin(an + r.range(-0.12, 0.12)) * len * s / 3; pts.push([x, y]); }
    g.strokeStyle = 'rgba(8,10,12,' + a * 0.5 + ')'; g.lineWidth = 1.5; g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(p[0] + 0.5, p[1] + 0.6) : g.moveTo(p[0] + 0.5, p[1] + 0.6))); g.stroke();
    g.strokeStyle = 'rgba(236,246,250,' + a + ')'; g.lineWidth = 0.7; g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  }
  for (const rad of [R * 0.28, R * 0.55]) { g.strokeStyle = 'rgba(236,246,250,' + a * 0.6 + ')'; g.lineWidth = 0.6; g.beginPath(); for (let i = 0; i <= 9; i++) { const an = i / 9 * TAU, rr2 = rad * r.range(0.8, 1.2); const px = cx + Math.cos(an) * rr2, py = cy + Math.sin(an) * rr2; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke(); }
}
// window glass in a polygon: state 'gone' (open frame + shards), 'cracked' (star cracks), 'shards'
function glassPane(g, pts, r, o) {
  o = o || {}; const b = bbox(pts), x = b[0], y = b[1], w = b[2], h = b[3], pf = P_(pts), st = o.state || 'gone';
  g.save(); g.beginPath(); pf(g); g.clip();
  g.fillStyle = vg(g, y, y + h, [[0, o.top || '#2a3238'], [0.5, '#141a1e'], [1, '#0a0c10']]); g.fillRect(x, y, w, h);
  if (o.through !== false) { g.fillStyle = vg(g, y, y + h * 0.75, [[0, 'rgba(238,156,98,0.4)'], [1, 'rgba(238,156,98,0)']]); g.fillRect(x, y, w, h); }
  if (o.inner) o.inner(g, b);
  if (st === 'cracked') {
    g.fillStyle = 'rgba(126,164,176,0.3)'; g.fillRect(x, y, w, h);
    g.fillStyle = lg(g, x, y, x + w, y + h, [[0, 'rgba(255,224,180,0)'], [0.4, 'rgba(255,224,180,0.3)'], [0.55, 'rgba(255,224,180,0.02)'], [1, 'rgba(255,224,180,0)']]); g.fillRect(x, y, w, h);
    cracks(g, x + w * r.range(0.3, 0.7), y + h * r.range(0.3, 0.7), Math.min(w, h) * 0.55, r, 0.8);
  } else {
    // glass teeth left in the frame
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n], dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy); if (L < 6) continue;
      if (dy > 0 && Math.abs(dx) > Math.abs(dy) * 4 && st === 'gone') continue;      // no glass left standing on the sill... except a few
      const cnt = Math.max(1, Math.round(L / 9 * (st === 'gone' ? 0.6 : 1.1)));
      for (let k = 0; k < cnt; k++) {
        if (r.next() < 0.3) continue; const t = r.next(), bx = p0[0] + dx * t, by = p0[1] + dy * t, bl = r.range(2.5, 7), ln2 = r.range(3, 10) * (st === 'gone' ? 0.8 : 1.2), nx = -dy / L, ny = dx / L;
        const s = (nx * (x + w / 2 - bx) + ny * (y + h / 2 - by)) >= 0 ? 1 : -1;
        const ax = bx - dx / L * bl / 2, ay = by - dy / L * bl / 2, cx2 = bx + dx / L * bl / 2, cy2 = by + dy / L * bl / 2, tx = bx + nx * s * ln2 + dx / L * r.range(-3, 3), ty = by + ny * s * ln2 + dy / L * r.range(-3, 3);
        g.fillStyle = 'rgba(178,212,222,' + r.range(0.32, 0.55) + ')'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(tx, ty); g.lineTo(cx2, cy2); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(244,250,252,0.7)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(ax, ay); g.lineTo(tx, ty); g.stroke();
      }
    }
  }
  g.restore();
  g.save(); g.strokeStyle = 'rgba(12,8,8,0.75)'; g.lineWidth = 1.3; g.lineJoin = 'round'; g.beginPath(); pf(g); g.stroke(); g.restore();
}
function tyre(g, cx, gy, o, r) {
  const rx = o.rx || 15, ry = o.ry || 12.4, sink = o.sink === undefined ? 4.2 : o.sink, cy = gy - ry + sink, hr = o.hr || 7.4, hy = cy - 0.8;
  g.save();
  contact(g, cx - rx - 4, rx * 2 + 8, gy, 0.55, 4);
  if (o.kind !== 'bare') {
    ell(g, cx, cy, rx, ry, rg(g, cx + 3 * LX, cy - 4, 1, rx * 1.1, [[0, '#4c4846'], [0.6, '#2a2624'], [1, '#141210']]));
    ell(g, cx, cy + ry - 3.6, rx * 1.08, 4.4, '#1c1917');                                   // sagging sidewall spread
    g.strokeStyle = 'rgba(255,224,178,0.38)'; g.lineWidth = 1.3; g.lineCap = 'round'; g.beginPath(); arcp(g, cx, cy, rx - 0.9, ry - 0.9, -1.35, 0.05, 10); g.stroke();
    for (let i = 0; i < 9; i++) { const a = r.next() * TAU; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx + Math.cos(a) * rx * 0.92 - 0.5, cy + Math.sin(a) * ry * 0.92 - 0.5, 1.2, 2.2); }   // tread nicks
    if (o.ww) { ell(g, cx, hy, hr + 2.6, hr + 2.6, 'rgba(206,198,174,0.96)'); ell(g, cx, hy, hr + 2.6, hr + 2.6, rg(g, cx, hy, hr, hr + 3, [[0, 'rgba(70,60,44,0)'], [1, 'rgba(70,60,44,0.6)']])); ell(g, cx, hy, hr + 0.7, hr + 0.7, '#1c1917'); }
  }
  // rim / hubcap
  const chromeRim = o.kind === 'ww' || o.kind === 'chrome';
  g.fillStyle = rg(g, cx + 1.5 * LX, hy - 2, 0.5, hr + 1, chromeRim ? [[0, '#f4ead4'], [0.45, '#a7a196'], [1, '#3f4348']] : [[0, '#8a6a4a'], [0.5, '#5d4634'], [1, '#2a2018']]); g.beginPath(); g.arc(cx, hy, hr, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(20,12,10,0.55)'; g.lineWidth = 0.9; g.beginPath(); g.arc(cx, hy, hr * 0.68, 0, TAU); g.stroke();
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.4; circ(g, cx + Math.cos(a) * hr * 0.42, hy + Math.sin(a) * hr * 0.42, 0.9, 'rgba(20,14,12,0.75)'); }
  circ(g, cx, hy, hr * 0.24, chromeRim ? '#d8d0bc' : '#6a5038'); circ(g, cx - 0.5 * LX, hy - 0.6, hr * 0.1, 'rgba(255,255,255,0.7)');
  if (chromeRim && o.rust) for (let i = 0; i < 14; i++) { const a = r.next() * TAU, d = r.next() * hr; g.fillStyle = 'rgba(126,66,30,0.55)'; g.fillRect(cx + Math.cos(a) * d, hy + Math.sin(a) * d, 1.2, 1); }
  // dirt heaped over the bottom of the wheel: it has sunk into the ground
  heap(g, cx - rx - 7, cx + rx + 9, gy, o.heap === undefined ? 6.4 : o.heap, r);
  g.restore();
}
// soil / rubble heap lying on the ground line, from x0 to x1, peak height h
function heap(g, x0, x1, gy, h, r) {
  const n = 9, pts = [[x0, gy + 2]]; for (let i = 0; i <= n; i++) { const t = i / n, hh = Math.pow(Math.sin(t * PI), 0.8) * h * (0.75 + r.next() * 0.4); pts.push([x0 + (x1 - x0) * t, gy - hh]); } pts.push([x1, gy + 2]);
  const pf = (q) => poly(q, pts), b = [x0, gy - h * 1.2, x1 - x0, h * 1.2 + 2];
  g.save(); g.beginPath(); pf(g); g.fillStyle = vg(g, gy - h, gy, [[0, '#b39268'], [0.4, '#8c6f4c'], [1, '#54402c']]); g.fill(); g.clip();
  over(g, 'dirt', b[0], b[1], b[2], b[3], 0.5, r, 0.5);
  for (let i = 0; i < (x1 - x0) * 0.9; i++) { const px = x0 + r.next() * (x1 - x0), py = gy - r.next() * h, k = r.next(); g.fillStyle = k < 0.4 ? 'rgba(60,44,30,0.6)' : k < 0.8 ? 'rgba(200,172,130,0.5)' : 'rgba(112,100,90,0.7)'; g.fillRect(px, py, 0.8 + r.next() * 1.6, 0.8 + r.next() * 1.2); }
  g.restore();
  g.save(); g.strokeStyle = 'rgba(255,238,200,0.4)'; g.lineWidth = 1; g.beginPath(); for (let i = 1; i < pts.length - 1; i++) { if (i === 1) g.moveTo(pts[i][0], pts[i][1] + 0.4); else g.lineTo(pts[i][0], pts[i][1] + 0.4); } g.stroke(); g.restore();
}
function soilMound(g, x, gy, w, h, r) {
  g.save(); g.beginPath(); g.moveTo(x, gy + 1); const n = 6; for (let i = 0; i <= n; i++) { const t = i / n; g.lineTo(x + w * t, gy - Math.sin(t * PI) * h * (0.7 + r.next() * 0.5)); } g.lineTo(x + w, gy + 1); g.closePath();
  g.fillStyle = vg(g, gy - h, gy, [[0, '#a4835a'], [0.5, '#7d6244'], [1, '#4c3a28']]); g.fill();
  g.strokeStyle = 'rgba(255,236,200,0.28)'; g.lineWidth = 0.8; g.stroke(); g.restore();
}
function dent(g, x, y, rx, ry, a) { g.save(); g.translate(x, y); g.rotate(a || 0); g.fillStyle = rg(g, 0, 0, 0, rx, [[0, 'rgba(10,6,14,0.35)'], [0.7, 'rgba(10,6,14,0.12)'], [1, 'rgba(10,6,14,0)']]); g.scale(1, ry / rx); g.beginPath(); g.arc(-rx * 0.12 * LX, rx * 0.1, rx, 0, TAU); g.fill(); g.fillStyle = rg(g, 0, 0, 0, rx * 0.8, [[0, 'rgba(255,236,200,0.22)'], [1, 'rgba(255,236,200,0)']]); g.beginPath(); g.arc(rx * 0.25 * LX, -rx * 0.22, rx * 0.8, 0, TAU); g.fill(); g.restore(); }

// ====================================================================== sf_car (5x2): 1950s retro-futurist wreck
const CPAL = [
  { A: [78, 148, 138], B: [220, 208, 176], prof: 'sedan' },      // 0 sedan, teal over cream
  { A: [214, 164, 52], B: [214, 202, 168], prof: 'coupe' },      // 1 coupe, mustard over cream
  { A: [226, 212, 178], B: [134, 94, 56], prof: 'wagon', wood: true },   // 2 station wagon, cream + wood panels
  { A: [176, 62, 44], B: [44, 38, 40], prof: 'rod' },            // 3 hot rod, brick red / black
  { A: [220, 172, 50], B: [220, 172, 50], prof: 'sedan', taxi: true },   // 4 taxi
  { A: [232, 228, 212], B: [74, 108, 156], prof: 'sedan', police: true }, // 5 police
];
const CPROF = {
  sedan: {
    body: [[10, 65, 1], [6, 58], [5, 49], [7, 41], [10, 34, 1], [22, 34.6], [34, 38.4], [58, 40.4], [152, 40.4], [177, 41.4], [191, 45], [196, 53], [195, 63, 1], [189, 66, 1]],
    gh: [[57, 40.6, 1], [66, 24], [78, 15], [96, 11.6], [124, 11.6], [137, 17.5], [147, 31], [153, 40.6, 1]],
    panes: [[[64, 38.6], [70, 26], [78, 19], [85, 17.6], [85, 38.6]], [[90, 38.6], [90, 17], [112, 16.6], [112, 38.6]], [[118, 38.6], [118, 16.6], [129, 18.6], [139, 28], [145.5, 38.6]]],
    seams: [66, 114, 151], wheels: [[50, 15, 11.6], [148, 15, 11.6]], belt: 40.4, seat: [[92, 108], [120, 130]], fin: 1, head: [190.5, 47.4], tail: [7, 47], hood: [153, 40.4, 44],
    spear: [[202, 52], [178, 54.4], [152, 55], [116, 56.4], [72, 56], [44, 52], [24, 46.5], [-2, 44]],
  },
  coupe: {
    body: [[10, 65, 1], [6, 58], [5, 49], [8, 40], [12, 32.6, 1], [26, 33.8], [40, 37.6], [74, 39.8], [150, 39.8], [174, 41], [190, 45], [196, 53], [195, 63, 1], [189, 66, 1]],
    gh: [[72, 40, 1], [82, 25], [94, 15.5], [112, 12.4], [128, 15], [141, 27], [150, 40, 1]],
    panes: [[[80, 38.2], [86, 26.5], [94, 19], [103, 16.6], [103, 38.2]], [[108, 38.2], [108, 16.4], [122, 17.4], [133, 24.5], [144, 38.2]]],
    seams: [86, 152], wheels: [[54, 15, 11.6], [148, 15, 11.6]], belt: 39.8, seat: [[88, 100], [112, 124]], fin: 1, head: [190.5, 47.4], tail: [7, 47], hood: [150, 39.8, 44],
    spear: [[202, 52], [178, 54.4], [152, 55], [116, 56.4], [76, 56], [48, 52], [26, 46], [-2, 43]],
  },
  wagon: {
    body: [[10, 65, 1], [6, 58], [5, 49], [6, 41, 1], [12, 40.6, 1], [152, 40.6], [177, 41.6], [191, 45], [196, 53], [195, 63, 1], [189, 66, 1]],
    gh: [[6, 41, 1], [6.6, 26], [11, 14.5], [24, 11.4], [112, 11.4], [128, 13.4], [140, 22.5], [148, 32], [153, 40.6, 1]],
    panes: [[[13, 38.8], [13, 24], [17, 17], [40, 16.4], [40, 38.8]], [[46, 38.8], [46, 16.4], [76, 16.2], [76, 38.8]], [[82, 38.8], [82, 16.2], [110, 16.2], [110, 38.8]], [[116, 38.8], [116, 16.2], [127, 18], [137, 25.5], [144, 38.8]]],
    seams: [44, 79, 113, 151], wheels: [[46, 15, 11.6], [148, 15, 11.6]], belt: 40.6, seat: [[50, 64], [88, 100]], fin: 0, head: [190.5, 47.4], tail: [6.5, 46], rack: 1, hood: [153, 40.6, 44],
    spear: [[202, 52], [178, 54.4], [152, 55], [116, 55.4], [72, 55.4], [30, 55.2], [-2, 55]],
  },
  rod: {
    body: [[12, 64, 1], [8, 57], [9, 49.6], [14, 45, 1], [40, 44.4], [150, 44.4], [178, 45], [192, 49], [197, 55], [195, 63, 1], [189, 66, 1]],
    gh: [[74, 44.6, 1], [80, 32], [90, 25.6], [106, 23.4], [122, 25], [134, 33], [140, 44.6, 1]],
    panes: [[[82, 43], [88, 32.6], [97, 28.4], [108, 27.4], [120, 29], [130, 35], [134.5, 43]]],
    seams: [76, 142], wheels: [[46, 17.5, 13.6], [152, 12.5, 9.5]], belt: 44.4, seat: [[92, 104]], fin: 0, head: [192.5, 51.4], tail: [10, 52], hood: [140, 44.4, 47],
    spear: [[202, 56], [170, 58], [130, 58.6], [80, 58.6], [30, 57], [-2, 55]],
  },
};
function drawCar(g, r, o) {
  const pal = CPAL[o.v], P = CPROF[pal.prof], burnt = !!o.burnt, W = 200, H = 80;
  const A = burnt ? [54, 46, 42] : pal.A, B = burnt ? [46, 40, 38] : pal.B;
  const bodyPf = (q) => spline(q, P.body, true), ghPf = (q) => spline(q, P.gh, true);
  const bb = bbox(P.body), gb = bbox(P.gh), fb = [Math.min(bb[0], gb[0]), Math.min(bb[1], gb[1]), Math.max(bb[2], gb[2]), bb[1] + bb[3] - Math.min(bb[1], gb[1])];
  const allPf = (q) => { bodyPf(q); ghPf(q); };
  const opn = o.open, wear = burnt ? 0.95 : o.wear;
  const wheels = P.wheels, sunk = o.sunk, cr = !!o.crushed;
  if (!cr) {
    contact(g, 4, 194, H, 0.55, 5);
    // ---- under-body: dark cavity, drivetrain, exhaust
    g.fillStyle = vg(g, 64, 80, [[0, 'rgba(6,4,8,0.78)'], [0.6, 'rgba(6,4,8,0.35)'], [1, 'rgba(6,4,8,0)']]); g.fillRect(12, 64, 176, 16);
    cylH(g, 20, 71, 128, 2.6, [64, 54, 48]); cylH(g, 58, 68.5, 26, 6.5, [92, 74, 60]); ell(g, 60, 72, 2, 3.2, '#1a1412');
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(48, 69, 2.6, 8); g.fillRect(146, 69, 2.6, 8);
  }
  // ---- body panels (paint, two-tone, trim)
  const bodyBox = fb;
  solid(g, allPf, bodyBox, A, { rim: false, edge: false, grain: 0.6 });
  // greenhouse a touch lighter (roof faces the sky), lower body shaded
  within(g, ghPf, (q) => { q.fillStyle = vg(q, gb[1], gb[1] + gb[3], [[0, 'rgba(255,238,205,0.2)'], [1, 'rgba(0,0,0,0)']]); q.fillRect(gb[0], gb[1], gb[2], gb[3]); });
  const spearPf = (q) => { spline(q, P.spear, false); q.lineTo(202, 90); q.lineTo(-2, 90); q.closePath(); };
  if (!burnt && pal.B !== pal.A) {
    within(g, bodyPf, (q) => {
      q.beginPath(); spearPf(q); q.fillStyle = tn(B, 1); q.fill();
      if (pal.wood) { q.save(); q.beginPath(); spearPf(q); q.clip(); for (let x = 8; x < 156; x += 5.5) { q.fillStyle = 'rgba(' + (r.next() < 0.5 ? '70,44,22' : '190,140,84') + ',0.4)'; q.fillRect(x, 50, 0.9 + r.next() * 0.8, 20); } q.fillStyle = 'rgba(36,20,10,0.65)'; q.fillRect(6, 62.5, 152, 1); q.fillRect(6, 55.6, 152, 1); q.restore(); }
      q.fillStyle = vg(q, 50, 66, [[0, 'rgba(255,236,200,0.16)'], [0.4, 'rgba(255,236,200,0)'], [1, 'rgba(10,6,14,0.38)']]); q.fillRect(0, 50, 200, 20);
    });
  } else within(g, bodyPf, (q) => { q.fillStyle = vg(q, 40, 66, [[0, 'rgba(255,238,205,0.1)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(10,6,14,0.42)']]); q.fillRect(0, 40, 200, 30); });
  within(g, allPf, (q) => { q.fillStyle = hg(q, 0, 200, [[0, 'rgba(10,8,24,0.24)'], [0.45, 'rgba(0,0,0,0)'], [1, 'rgba(255,226,180,0.12)']]); q.fillRect(0, 0, 200, 80); });
  // shoulder highlight (long warm specular streak along the beltline) + crown lines
  within(g, bodyPf, (q) => {
    q.strokeStyle = 'rgba(255,238,208,0.30)'; q.lineWidth = 2.6; q.lineCap = 'round'; q.beginPath(); q.moveTo(14, P.belt - 1.6 + (P.fin ? 0.8 : 0)); q.bezierCurveTo(60, P.belt + 0.4, 130, P.belt + 0.6, 192, P.belt + 4.4); q.stroke();
    q.strokeStyle = 'rgba(255,246,226,0.5)'; q.lineWidth = 0.9; q.beginPath(); q.moveTo(20, P.belt - 0.6 + (P.fin ? 0.8 : 0)); q.bezierCurveTo(60, P.belt + 1.4, 130, P.belt + 1.6, 190, P.belt + 5); q.stroke();
    q.fillStyle = vg(q, P.belt + 6, P.belt + 16, [[0, 'rgba(10,6,16,0)'], [0.5, 'rgba(10,6,16,0.16)'], [1, 'rgba(10,6,16,0)']]); q.fillRect(0, P.belt + 6, 200, 10);
  });
  g.strokeStyle = 'rgba(10,6,12,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(58, P.belt); g.lineTo(P.hood[0], P.hood[1]); g.stroke();
  // ---- weathering of the paint (before glass / wheels / chrome)
  if (!burnt) {
    const rustA = o.rust === undefined ? r.range(0.45, 0.85) : o.rust;
    rustify(g, allPf, bodyBox, r, rustA, { bias: 1.8 });
    for (const wx of [wheels[0][0], wheels[1][0]]) { g.save(); g.beginPath(); bodyPf(g); g.clip(); g.strokeStyle = 'rgba(120,60,26,0.4)'; g.lineWidth = 4; g.setLineDash([5, 3, 2, 4]); g.beginPath(); g.arc(wx, 66, 19, PI * 1.05, PI * 1.95); g.stroke(); g.setLineDash([]); g.restore(); }
    chips(g, allPf, bodyBox, r, 46, null, 2.6);
    within(g, allPf, (q) => over(q, 'chip', bodyBox[0], bodyBox[1], bodyBox[2], bodyBox[3], 0.45, r, 0.55));
  } else {
    within(g, allPf, (q) => { over(q, 'rust', 0, 20, 200, 50, 0.85, r, 0.7); over(q, 'soot', 0, 0, 200, 80, 0.55, r, 0.9); for (let i = 0; i < 30; i++) { q.fillStyle = 'rgba(' + (r.next() < 0.5 ? '176,96,40' : '120,64,30') + ',0.7)'; q.fillRect(r.range(6, 190), r.range(30, 64), r.range(1, 4), r.range(0.8, 2)); } });
  }
  grime(g, allPf, bodyBox, r, burnt ? 0.5 : 0.4);
  for (let i = 0; i < r.int(3, 7); i++) hole(g, r.range(20, 186), r.range(42, 62), r.range(0.9, 1.4));
  for (let i = 0; i < 3; i++) dent(g, r.range(30, 170), r.range(44, 60), r.range(5, 11), r.range(2.5, 5), r.range(-0.3, 0.3));
  within(g, bodyPf, (q) => { streaks(q, 4, 46, 190, 22, 9, r, [30, 20, 14], 0.3); });
  if (cr) within(g, allPf, (q) => {   // caved-in roof, crease lines, crumpled skin
    for (let i = 0; i < 7; i++) { const x0 = r.range(20, 170), y0 = r.range(14, 60), an = r.range(-0.9, 0.9) + (i % 2 ? 0.6 : -0.6), L = r.range(22, 60);
      q.lineCap = 'round'; q.strokeStyle = 'rgba(8,4,10,0.55)'; q.lineWidth = r.range(1.2, 2.6); q.beginPath(); q.moveTo(x0, y0); q.lineTo(x0 + Math.cos(an) * L * 0.5 + r.range(-3, 3), y0 + Math.sin(an) * L * 0.5 + r.range(-2, 2)); q.lineTo(x0 + Math.cos(an) * L, y0 + Math.sin(an) * L); q.stroke();
      q.strokeStyle = 'rgba(255,238,208,0.32)'; q.lineWidth = 1; q.beginPath(); q.moveTo(x0 + 1.4 * LX, y0 - 1.4); q.lineTo(x0 + Math.cos(an) * L + 1.4 * LX, y0 + Math.sin(an) * L - 1.4); q.stroke(); }
    for (let i = 0; i < 5; i++) dent(q, r.range(30, 180), r.range(16, 56), r.range(10, 22), r.range(5, 10), r.range(-0.6, 0.6));
  });
  // ---- door seams, handles, chrome
  for (let i = 0; i < P.seams.length; i++) {
    const sx = P.seams[i], top = P.belt + 1, bot = 64.6; g.strokeStyle = 'rgba(14,8,8,0.62)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(sx, top); g.quadraticCurveTo(sx + (i % 2 ? 1.2 : -1.2), (top + bot) / 2, sx + 0.6, bot); g.stroke();
    g.strokeStyle = 'rgba(255,236,200,0.2)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(sx + 1.2 * LX, top); g.lineTo(sx + 1.8 * LX, bot); g.stroke();
  }
  g.strokeStyle = 'rgba(14,8,8,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(66, 64.6); g.lineTo(151, 64.7); g.stroke();   // rocker seam
  if (!burnt) {
    chromeStroke(g, (q) => spline(q, P.spear, false), 46, 58, 2.3);
    for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(122,66,30,0.55)'; g.fillRect(r.range(6, 190), r.range(44, 58), 1.2, 0.9); }
    for (const hx of [P.seams[0] + 5, P.seams[1] + 6, P.seams[1] - 12]) if (hx > 20 && hx < 150) chromeRect(g, hx, P.belt + 3.4, 6.4, 1.7);
  }
  if (P.fin) { g.strokeStyle = 'rgba(244,232,210,0.75)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(11, 34.8); g.lineTo(24, 35.6); g.lineTo(34, 39); g.stroke(); }
  const tl = P.tail; g.save(); g.fillStyle = burnt ? '#2a2020' : rg(g, tl[0], tl[1] - 1, 0, 6, [[0, '#c8463a'], [0.6, '#8a2a24'], [1, '#4a1612']]); g.beginPath(); rr(g, tl[0] - 2.6, tl[1] - 4.5, 5.2, 9.4, 1.8); g.fill(); g.strokeStyle = 'rgba(255,240,220,0.55)'; g.lineWidth = 0.8; g.stroke(); g.restore();
  if (!burnt) ln(g, tl[0] - 1, tl[1] - 3, tl[0] - 1, tl[1] + 1, 'rgba(255,255,255,0.45)', 0.8);
  // ---- lower edge AO + bevel of the tub
  ao(g, 6, 58, 190, 8, 'b', 0.5, 8);
  rim(g, allPf);
  edge(g, allPf, 0.5, 1);
  // ---- wheel arches (dark wells with a fender lip) and tyres
  const wp = opn === 'wheel' ? -1 : -1; void wp;
  if (!cr) wheels.forEach((w, i) => {
    const wx = w[0], wr = w[1] + 2.4, missing = o.missing === i;
    g.save(); g.beginPath(); bodyPf(g); g.clip();
    g.beginPath(); g.moveTo(wx - wr, 67); g.lineTo(wx - wr, 66); g.arc(wx, 66, wr, PI, TAU); g.lineTo(wx + wr, 67); g.closePath();
    g.fillStyle = vg(g, 66 - wr, 67, [[0, '#08090b'], [0.7, '#15171a'], [1, '#22201e']]); g.fill();
    g.strokeStyle = 'rgba(255,236,200,0.35)'; g.lineWidth = 1.3; g.beginPath(); arcp(g, wx, 66, wr + 0.6, wr + 0.6, -PI * 0.9, -PI * 0.05, 14); g.stroke();
    g.strokeStyle = 'rgba(8,6,8,0.7)'; g.lineWidth = 1.4; g.beginPath(); g.arc(wx, 66, wr - 0.6, PI, TAU); g.stroke(); g.restore();
    if (!missing) {
      tyre(g, wx, 80, { rx: w[1], ry: w[2], hr: w[1] * 0.5, kind: burnt ? 'bare' : (i === (o.bare === undefined ? -1 : o.bare) ? 'bare' : 'ww'), ww: !burnt && pal.prof !== 'rod', rust: true }, r);
    } else {   // axle stub on a brick pile
      for (let k = 0; k < 4; k++) box(g, wx - 13 + k * 6.5 + r.range(-1, 1), 72 + (k % 2) * 3, 6.4, 8, [140, 70, 52], { edgeA: 0.5 });
      cylH(g, wx - 18, 66, 36, 3.6, [70, 58, 50]);
    }
  });
  // ---- glazing (windows are smashed; the cabin is dark inside with the far windows glowing)
  const states = ['gone', 'cracked', 'gone', 'shards'];
  const driver = !burnt && r.next() < 0.3;
  P.panes.forEach((pts, i) => {
    const st = burnt ? 'gone' : r.pick(states), seat = P.seat;
    glassPane(g, pts, r, {
      state: st, top: burnt ? '#1a1414' : undefined,
      inner: (q, b) => {
        const s = seat[Math.min(i, seat.length - 1)] || seat[0];
        if (P.panes.length === 1 || i === P.panes.length - 1 || i === 1) {
          const sx = s[0] || b[0] + 2, sw = Math.min(14, b[2] * 0.6);
          q.fillStyle = 'rgba(52,42,38,0.96)'; q.beginPath(); rr(q, b[0] + b[2] * 0.15, b[1] + b[3] * 0.4, Math.max(8, sw), b[3] * 0.7, 3); q.fill(); q.fillStyle = 'rgba(255,236,200,0.16)'; q.fillRect(b[0] + b[2] * 0.15 + 1, b[1] + b[3] * 0.4 + 0.5, Math.max(8, sw) - 2, 1.2);
        }
        if (driver && i === P.panes.length - 1) { const hx = b[0] + b[2] * 0.42, hy = b[1] + b[3] * 0.32; ell(q, hx, hy, 3.6, 4.2, '#d8d0b6'); ell(q, hx - 1.2, hy - 0.4, 0.9, 1.2, '#1a1410'); ell(q, hx + 1.2, hy - 0.4, 0.9, 1.2, '#1a1410'); q.fillStyle = '#d0c8ae'; q.fillRect(hx - 1.4, hy + 2.6, 2.8, 2.2); }
      },
    });
  });
  // ---- variant hardware: hood/bumpers/lights, roof gear
  const hd = P.head;
  // bumpers (chrome) - the rear one hangs by a single bracket
  if (!burnt) {
    g.save(); g.translate(13, 63); g.rotate(r.range(0.02, 0.09)); g.translate(-13, -63); chromeRect(g, 1, 59, 25, 5.4, { r }); rr(g, 0, 0, 0, 0, 0); g.restore();
    g.save(); g.translate(188, 62); g.rotate(-r.range(0.0, 0.05)); g.translate(-188, -62); chromeRect(g, 178, 58.2, 22, 6, { r }); for (const bx of [184, 194]) { ell(g, bx, 61, 2.3, 3, '#e8e0cc'); ell(g, bx - 0.5 * LX, 60, 0.9, 1.2, '#fff'); } g.restore();
    // grille teeth in the nose
    for (let i = 0; i < 4; i++) { const gy2 = 50 + i * 2.6; g.fillStyle = 'rgba(20,12,10,0.6)'; g.fillRect(191.5, gy2 + 1, 4.6, 1.2); chromeRect(g, 191.5, gy2, 4.6, 1.3); }
    // headlamp
    circ(g, hd[0], hd[1], 5.3, 'rgba(20,12,10,0.7)'); circ(g, hd[0], hd[1], 4.6, '#cfc8b6'); circ(g, hd[0], hd[1], 3.2, '#1a1e22'); circ(g, hd[0] - 0.8 * LX, hd[1] - 0.8, 1, 'rgba(255,255,255,0.7)');
    g.strokeStyle = 'rgba(190,220,230,0.7)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(hd[0] - 2.5, hd[1] - 1); g.lineTo(hd[0] + 1, hd[1] + 2.6); g.moveTo(hd[0] + 2, hd[1] - 2); g.lineTo(hd[0] - 1, hd[1] + 2); g.stroke();
    // hood ornament: little chrome rocket
    g.fillStyle = '#d9d2c0'; g.beginPath(); g.moveTo(170, P.hood[1] + 1.6); g.lineTo(176, P.hood[1] - 2.2); g.lineTo(181, P.hood[1] + 1.8); g.closePath(); g.fill(); ln(g, 170, P.hood[1] + 1.8, 181, P.hood[1] + 1.9, 'rgba(20,10,8,0.5)', 0.8);
  } else { g.fillStyle = 'rgba(30,26,24,0.9)'; g.fillRect(188, 58, 10, 5); }
  // ---- variant specifics
  const pal2 = pal;
  if (pal2.taxi) {   // roof sign + checker band
    box(g, 96, 4.4, 26, 7.6, [222, 214, 186], { r: 1.5, edgeA: 0.6 }); txt(g, 'TAXI', 109, 8.4, { size: 7, w: 20, fill: '#26201a', family: F_SANS });
    g.save(); g.beginPath(); bodyPf(g); g.clip(); for (let x = 12; x < 190; x += 5) { g.fillStyle = ((x / 5) | 0) % 2 ? 'rgba(20,18,16,0.85)' : 'rgba(228,220,196,0.9)'; g.fillRect(x, 47.4, 5, 2.6); g.fillStyle = ((x / 5) | 0) % 2 ? 'rgba(228,220,196,0.9)' : 'rgba(20,18,16,0.85)'; g.fillRect(x, 50, 5, 2.6); } g.restore();
  }
  if (pal2.police) {   // light bar + door lettering
    box(g, 98, 6.4, 24, 5.6, [176, 176, 170], { r: 1.5 }); g.fillStyle = 'rgba(160,36,30,0.9)'; g.fillRect(100, 7, 9, 3.6); g.fillStyle = 'rgba(40,80,170,0.9)'; g.fillRect(111.5, 7, 9, 3.6); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(100, 7, 20.5, 1);
    txt(g, 'POLICE', 132, 51, { size: 6.5, w: 27, fill: 'rgba(238,232,214,0.92)', family: F_SANS, rot: 0 });
    circ(g, 80, 50, 3.6, 'rgba(230,200,90,0.9)'); circ(g, 80, 50, 2, 'rgba(70,90,140,0.9)');
  }
  if (P.rack) {   // roof rack with a rotten suitcase
    for (const rx of [30, 100]) { g.fillStyle = '#4a4440'; g.fillRect(rx, 7, 1.6, 4.8); }
    cylH(g, 24, 6.2, 92, 2, [96, 92, 88]); box(g, 44, -1, 26, 7.4, [112, 78, 52], { r: 2 }); ln(g, 46, 2.8, 68, 2.8, 'rgba(30,18,10,0.5)', 0.8); box(g, 46, -3, 12, 4, [92, 100, 74], { r: 1.5 });
  }
  if (pal2.prof === 'rod') {   // blown, scooped motor + flame decal + side pipes
    box(g, 136, 36, 22, 8.6, [176, 172, 168], { r: 2 }); for (let i = 0; i < 5; i++) fr(g, 'rgba(10,8,8,0.55)', 139 + i * 3.6, 39, 1.4, 5);
    box(g, 158, 41, 16, 3.6, [140, 138, 134], { r: 1 });
    g.save(); g.beginPath(); bodyPf(g); g.clip(); g.fillStyle = 'rgba(232,176,50,0.9)'; g.beginPath(); g.moveTo(196, 56); for (let i = 0; i < 6; i++) { g.quadraticCurveTo(190 - i * 9, 46 + (i % 2 ? 4 : -1), 184 - i * 9, 52 + (i % 2) * 2); } g.lineTo(140, 58); g.lineTo(196, 58); g.closePath(); g.fill(); g.fillStyle = 'rgba(200,70,30,0.85)'; g.beginPath(); g.moveTo(196, 58); for (let i = 0; i < 4; i++) g.quadraticCurveTo(190 - i * 10, 51, 186 - i * 10, 57); g.lineTo(150, 58); g.closePath(); g.fill(); g.restore();
    cylH(g, 70, 62, 60, 3.2, [176, 170, 160]); for (let i = 0; i < 5; i++) fr(g, 'rgba(10,8,8,0.6)', 76 + i * 9, 62.4, 1.3, 2.6);
  }
  // ---- open parts
  if (opn === 'door' && P.seams.length >= 2) {
    const i1 = P.seams.length - 1, dx0 = P.seams[i1 - 1], dx1 = P.seams[i1], top = P.belt - 21, w2 = (dx1 - dx0) * 0.44;
    // dark gap where the door was
    g.fillStyle = vg(g, top, 66, [[0, '#0c0e10'], [1, '#1a1614']]); g.beginPath(); g.moveTo(dx0 + 1, P.belt); g.lineTo(dx1 - 1, P.belt); g.lineTo(dx1 - 1, 64.4); g.lineTo(dx0 + 1, 64.4); g.closePath(); g.fill();
    // seat + wheel inside
    box(g, dx0 + 4, 44, 12, 15, [58, 46, 40], { r: 3, edgeA: 0.5 }); fr(g, 'rgba(255,236,200,0.14)', dx0 + 5, 44.5, 10, 1.2); ell(g, dx0 + 22, 47, 2, 6, '#1a1412', -0.3);
    // the door itself, hinged at the front, swung out
    const dp = [[dx1 - 1, P.belt - 2], [dx1 - 1 - w2, P.belt + 1.5], [dx1 - 1 - w2, 67.4], [dx1 - 1, 64.6]];
    solid(g, P_(dp), bbox(dp), A, { top: 0.15, left: 0.4, right: 0.05, rim: true });
    const wf = [[dx1 - 1, P.belt - 2], [dx1 - 1 - w2, P.belt + 1.5], [dx1 - 1 - w2, P.belt - 16], [dx1 - 1 - w2 * 0.55, P.belt - 21], [dx1 - 1, P.belt - 16.6]];
    g.fillStyle = tn(A, 0.85); g.beginPath(); poly(g, wf); g.fill(); g.fillStyle = 'rgba(14,16,20,0.9)'; g.beginPath(); poly(g, [[wf[0][0] - 1, wf[0][1] - 1.5], [wf[1][0] + 2, wf[1][1] - 1.5], [wf[2][0] + 2, wf[2][1] + 3], [wf[3][0] + 1.6, wf[3][1] + 2.4], [wf[4][0] - 1, wf[4][1] + 2]]); g.fill(); edge(g, P_(wf), 0.6);
    rustify(g, P_(dp), bbox(dp), r, 0.7); grime(g, P_(dp), bbox(dp), r, 0.5); chromeRect(g, dx1 - 3 - w2 * 0.6, P.belt + 4, 5, 1.6);
  }
  if (opn === 'hood') {
    const hx = P.hood[0], hy = P.hood[1];
    // exposed engine bay, radiator support, a cooked engine block
    g.fillStyle = 'rgba(8,8,10,0.96)'; g.beginPath(); g.moveTo(hx + 1, hy - 0.4); g.lineTo(188, hy + 3); g.lineTo(190, 51); g.lineTo(hx + 1, 50); g.closePath(); g.fill();
    box(g, hx + 8, hy - 7, 24, 10, [66, 58, 54], { r: 2 }); ell(g, hx + 14, hy - 8.4, 6, 2.6, '#8a7a6a'); ell(g, hx + 14, hy - 9.4, 5, 1.6, '#b8aa96'); box(g, hx + 30, hy - 5, 10, 8, [104, 76, 54], { r: 1.5 }); cylH(g, hx + 2, hy + 1, 34, 2.4, [90, 74, 60]);
    // hood: hinged at the cowl, propped open
    g.save(); g.translate(hx + 1, hy - 1.6); g.rotate(-0.62); const hl = 40;
    const hp = [[0, 0], [hl, -1], [hl + 1, -4.6], [0.5, -4.2]]; solid(g, P_(hp), bbox(hp), A, { top: 0.1, left: 0.1 }); chromeRect(g, 2, -3.6, hl - 6, 1.2); g.fillStyle = 'rgba(12,8,8,0.6)'; g.fillRect(2, -0.6, hl - 4, 1.4);
    rustify(g, P_(hp), bbox(hp), r, 0.7); g.restore();
    ln(g, hx + 32, hy - 1, hx + 33, hy - 24, 'rgba(60,54,50,0.95)', 1.4);   // prop rod
  }
  if (opn === 'trunk') {
    g.save(); g.translate(58, 39); g.rotate(0.45); const tp = [[0, 0], [-28, 2], [-27, -2.6], [0, -3.6]]; solid(g, P_(tp), bbox(tp), A, { top: 0.1 }); rustify(g, P_(tp), bbox(tp), r, 0.7); g.restore();
  }
}
def('car', 5, 2, function (g, d, r, p) {
  const v = p.v === undefined ? r.int(0, 2) : cl(p.v | 0, 0, CPAL.length - 1);
  const openR = r.next(), opn = p.open !== undefined ? p.open : (openR < 0.42 ? 'door' : openR < 0.66 ? 'hood' : null);
  drawCar(g, r, { v, burnt: !!p.burnt, open: opn === 'none' ? null : opn, rust: p.rust, wear: p.wear, missing: r.next() < 0.14 ? r.int(0, 1) : undefined, bare: r.next() < 0.3 ? r.int(0, 1) : undefined });
});
// ====================================================================== generic weathered painted shape
function weathered(g, pf, b, base, r, o) {
  o = o || {};
  solid(g, pf, b, base, { rim: false, edge: false, top: o.top, bot: o.bot, left: o.left, right: o.right, grain: o.grain });
  if (o.rust !== 0) rustify(g, pf, b, r, o.rust === undefined ? 0.6 : o.rust, { bias: o.bias, sc: o.rsc });
  if (o.chips !== 0) { chips(g, pf, b, r, Math.round(b[2] * b[3] / 220 * (o.chips === undefined ? 1 : o.chips)), null, 2.4); within(g, pf, (q) => over(q, 'chip', b[0], b[1], b[2], b[3], 0.42, r, 0.55)); }
  if (o.grime !== 0) grime(g, pf, b, r, o.grime === undefined ? 0.38 : o.grime);
  if (o.holes || o.dents) within(g, pf, (q) => {
    for (let i = 0; i < (o.holes || 0); i++) hole(q, b[0] + 6 + r.next() * (b[2] - 12), b[1] + 6 + r.next() * (b[3] - 12), r.range(0.9, 1.5));
    for (let i = 0; i < (o.dents || 0); i++) dent(q, b[0] + r.next() * b[2], b[1] + b[3] * (0.3 + r.next() * 0.6), r.range(5, 12), r.range(2.5, 5), r.range(-0.3, 0.3));
  });
  if (o.rim !== false) rim(g, pf);
  if (o.edge !== false) edge(g, pf, o.edgeA);
}
// dark wheel well with lip cut into the current body (clip = body path), then the sunk tyre
function wheelWell(g, bodyPf, wx, wy, wr) {
  g.save(); g.beginPath(); bodyPf(g); g.clip();
  g.beginPath(); g.moveTo(wx - wr, wy + 1); g.lineTo(wx - wr, wy); g.arc(wx, wy, wr, PI, TAU); g.lineTo(wx + wr, wy + 1); g.closePath();
  g.fillStyle = vg(g, wy - wr, wy + 1, [[0, '#08090b'], [0.7, '#15171a'], [1, '#22201e']]); g.fill();
  g.strokeStyle = 'rgba(255,236,200,0.34)'; g.lineWidth = 1.4; g.beginPath(); arcp(g, wx, wy, wr + 0.6, wr + 0.6, -PI * 0.9, -PI * 0.05, 14); g.stroke();
  g.strokeStyle = 'rgba(8,6,8,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.arc(wx, wy, wr - 0.6, PI, TAU); g.stroke(); g.restore();
}

// ====================================================================== sf_truck (8x3): v0 stake-bed farm truck, v1 box truck, v2 fuel tanker
function truckCab(g, r, x0, roof, col, o) {
  o = o || {}; const GY = 120;
  const cabPts = [[x0, 96, 1], [x0, roof + 12], [x0 + 4, roof + 3], [x0 + 12, roof], [x0 + 52, roof], [x0 + 64, roof + 5], [x0 + 74, 68], [x0 + 74, 96, 1]];
  const hoodPts = [[x0 + 72, 68], [x0 + 74, 63], [x0 + 100, 61.5], [x0 + 128, 63], [x0 + 140, 71], [x0 + 142, 84], [x0 + 141, 96, 1], [x0 + 72, 96, 1]];
  const cabPf = (q) => spline(q, cabPts, true), hoodPf = (q) => spline(q, hoodPts, true), allPf = (q) => { cabPf(q); hoodPf(q); };
  const bb = bbox(cabPts.concat(hoodPts));
  weathered(g, allPf, bb, col, r, { rust: o.rust === undefined ? 0.6 : o.rust, holes: 4, dents: 3, rim: false, edge: false });
  // hood crease + cowl
  within(g, allPf, (q) => { q.strokeStyle = 'rgba(255,238,208,0.34)'; q.lineWidth = 1.6; q.beginPath(); q.moveTo(x0 + 78, 64.4); q.bezierCurveTo(x0 + 100, 63.2, x0 + 120, 64, x0 + 137, 71); q.stroke(); q.strokeStyle = 'rgba(10,6,12,0.42)'; q.lineWidth = 1; q.beginPath(); q.moveTo(x0 + 73, 66); q.lineTo(x0 + 73, 96); q.stroke(); });
  // door: seam + handle + lower panel shade
  g.strokeStyle = 'rgba(14,8,8,0.6)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x0 + 6, roof + 8); g.lineTo(x0 + 6, 95); g.moveTo(x0 + 66, 68); g.lineTo(x0 + 67, 95); g.stroke();
  g.strokeStyle = 'rgba(255,236,200,0.22)'; g.beginPath(); g.moveTo(x0 + 7.2, roof + 10); g.lineTo(x0 + 7.2, 95); g.stroke();
  chromeRect(g, x0 + 56, 71, 7, 2.2, { r });
  ao(g, x0, 82, 74, 14, 'b', 0.45, 12);
  // side window (smashed), with the far side glowing through
  const win = [[x0 + 9, 67], [x0 + 9, roof + 10], [x0 + 12, roof + 6.5], [x0 + 50, roof + 6.5], [x0 + 58, roof + 9], [x0 + 68, 67]];
  glassPane(g, win, r, { state: r.pick(['gone', 'cracked', 'gone']), inner: (q, b) => { q.fillStyle = 'rgba(56,46,40,0.96)'; q.beginPath(); rr(q, b[0] + 4, b[1] + b[3] * 0.4, 14, b[3] * 0.7, 3); q.fill(); ell(q, b[0] + 36, b[1] + b[3] * 0.62, 2.4, 7, '#1a1412', -0.3); } });
  // grille + headlamp + bumper
  box(g, x0 + 138, 73, 6, 22, [190, 184, 170], { r: 1.5 }); for (let i = 0; i < 6; i++) fr(g, 'rgba(10,8,8,0.55)', x0 + 139, 75.4 + i * 3.4, 4, 1.3);
  circ(g, x0 + 137, 76.5, 6.4, 'rgba(20,12,10,0.7)'); circ(g, x0 + 137, 76.5, 5.6, '#cfc8b6'); circ(g, x0 + 137, 76.5, 4, '#1a1e22'); circ(g, x0 + 135.6, 75.2, 1.2, 'rgba(255,255,255,0.7)');
  g.strokeStyle = 'rgba(190,220,230,0.7)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x0 + 134, 75); g.lineTo(x0 + 139, 79.6); g.moveTo(x0 + 139, 74); g.lineTo(x0 + 135, 79); g.stroke();
  g.save(); g.translate(x0 + 146, 100); g.rotate(-0.04); chromeRect(g, -10, -4, 22, 7, { r }); g.restore();
  // running board + mud flap
  cylH(g, x0 + 2, 96.5, 70, 2.6, [70, 62, 56]);
  rim(g, allPf); edge(g, allPf, 0.5, 1);
  // hood ornament stack + exhaust
  return { win, allPf, bb };
}
def('truck', 8, 3, function (g, d, r, p) {
  const v = p.v === undefined ? r.int(0, 2) : cl(p.v | 0, 0, 2), GY = 120;
  contact(g, 4, 312, GY, 0.55, 5);
  // chassis rails + drive train (dark)
  g.fillStyle = vg(g, 88, 120, [[0, 'rgba(6,4,8,0.7)'], [0.6, 'rgba(6,4,8,0.3)'], [1, 'rgba(6,4,8,0)']]); g.fillRect(12, 88, 296, 30);
  cylH(g, 14, 92, 296, 6, [62, 54, 50]); rustify(g, R_(14, 92, 296, 6), [14, 92, 296, 6], r, 0.9); cylH(g, 60, 101, 150, 3, [56, 48, 44]);
  const roof = v === 1 ? 24 : 34, cx0 = v === 2 ? 210 : (v === 1 ? 210 : 168);
  const cabCol = [[184, 66, 44], [122, 162, 190], [222, 172, 46]][v];
  // ---- rear body ----
  if (v === 0) {   // stake-bed: wooden slat sides between steel stakes, headboard against the cab
    const bx0 = 8, bx1 = cx0 - 2;
    const bedPf = R_(bx0, 84, bx1 - bx0, 6, 1); weathered(g, bedPf, [bx0, 84, bx1 - bx0, 6], [92, 80, 70], r, { rust: 0.8 });
    // slats
    for (let i = 0; i < 3; i++) {
      const y0 = 55 + i * 9.6, pf = R_(bx0 + 4, y0, bx1 - bx0 - 6, 9, 0.6);
      solid(g, pf, [bx0 + 4, y0, bx1 - bx0 - 6, 9], [138 + r.range(-10, 10), 108 + r.range(-8, 8), 76], { rim: true, edge: true, top: 0.22, bot: 0.34, grain: 0.7 });
      within(g, pf, (q) => { for (let k = 0; k < 20; k++) { const gx = bx0 + 4 + r.next() * (bx1 - bx0 - 6); q.fillStyle = 'rgba(48,30,16,' + r.range(0.2, 0.5) + ')'; q.fillRect(gx, y0 + r.next() * 8, r.range(8, 34), 0.7); } for (let k = 0; k < 2; k++) { ell(q, bx0 + 12 + r.next() * (bx1 - bx0 - 30), y0 + 4.5, r.range(1.6, 3), r.range(1.2, 2), 'rgba(52,32,18,0.7)'); } });
      if (r.next() < 0.5) fr(g, [30, 22, 16], bx0 + 10 + r.next() * (bx1 - bx0 - 50), y0 + 0.4, r.range(6, 22), 8.4);   // missing chunk of board
    }
    grime(g, R_(bx0 + 4, 55, bx1 - bx0 - 6, 29), [bx0 + 4, 55, bx1 - bx0 - 6, 29], r, 0.5);
    for (let sx = bx0 + 2; sx < bx1; sx += 38) { const pf = R_(sx, 50, 5, 44, 0.6); solid(g, pf, [sx, 50, 5, 44], [96, 84, 76], { top: 0.2 }); rustify(g, pf, [sx, 50, 5, 44], r, 0.6); rivet(g, sx + 2.5, 58, 1.1); rivet(g, sx + 2.5, 80, 1.1); }
    const hb = R_(bx1 - 8, 38, 8, 52, 1); weathered(g, hb, [bx1 - 8, 38, 8, 52], cabCol, r, { rust: 0.7 });
    // load: rotting hay-bale sacks + a spare tyre
    for (let k = 0; k < 3; k++) box(g, 24 + k * 30 + r.range(-3, 3), 48 - (k === 1 ? 10 : 0), 28, 16, [154, 132, 78], { r: 3, edgeA: 0.5, grain: 0.9 });
    for (let k = 0; k < 40; k++) ln(g, 24 + r.range(0, 90), 40 + r.range(0, 16), 24 + r.range(0, 90) + r.range(-6, 6), 40 + r.range(0, 16) + r.range(-3, 3), 'rgba(200,170,90,0.5)', 0.8);
  } else if (v === 1) {   // box truck: riveted panels, faded ad, torn roof skin
    const bx0 = 8, bx1 = cx0 - 4, by0 = 6, by1 = 94, pts = [[bx0, by1, 1], [bx0, by0 + 3], [bx0 + 3, by0], [bx1 - 3, by0], [bx1, by0 + 3], [bx1, by1, 1]];
    const bpf = P_(pts), bb2 = [bx0, by0, bx1 - bx0, by1 - by0];
    weathered(g, bpf, bb2, [224, 214, 188], r, { rust: 0.55, holes: 6, dents: 3, grime: 0.4, rim: false, edge: false });
    within(g, bpf, (q) => {
      for (let x = bx0 + 30; x < bx1; x += 32) { q.fillStyle = 'rgba(10,6,12,0.36)'; q.fillRect(x, by0, 1.2, by1 - by0); q.fillStyle = 'rgba(255,240,214,0.3)'; q.fillRect(x + 1.2 * LX, by0, 0.8, by1 - by0); for (let y = by0 + 6; y < by1; y += 12) { rivet(q, x - 3, y, 0.8); rivet(q, x + 4, y, 0.8); } }
      // ad band: red with cream lettering, sun-bleached
      q.fillStyle = 'rgba(178,52,40,0.9)'; q.fillRect(bx0, 32, bx1 - bx0, 30); q.fillStyle = 'rgba(240,226,196,0.85)'; q.fillRect(bx0, 30, bx1 - bx0, 2.4); q.fillRect(bx0, 62, bx1 - bx0, 2.4);
      circ(q, bx0 + 34, 47, 13, 'rgba(240,226,196,0.92)'); circ(q, bx0 + 34, 47, 10, 'rgba(178,52,40,0.95)'); txt(q, 'N', bx0 + 34, 47.6, { size: 15, fill: 'rgba(240,226,196,0.95)', family: F_SERIF });
      txt(q, 'NUKA-COLA', bx0 + 108, 46.4, { size: 19, w: 100, fill: 'rgba(244,232,204,0.92)', family: F_SANS, style: 'bold italic' }); txt(q, 'ICE COLD  •  REFRESHING', bx0 + 108, 57, { size: 7, w: 86, fill: 'rgba(244,232,204,0.8)', family: F_SANS });
      over(q, 'chip', bx0, 28, bx1 - bx0, 38, 0.85, r, 0.5); over(q, 'dirt', bx0, 28, bx1 - bx0, 38, 0.5, r, 0.9);
    });
    // torn skin at the roof rear corner, ribs showing
    g.fillStyle = '#100d0c'; g.beginPath(); g.moveTo(bx0 + 2, by0 + 2); g.lineTo(bx0 + 40, by0 + 1); g.lineTo(bx0 + 34, by0 + 12); g.lineTo(bx0 + 26, by0 + 9); g.lineTo(bx0 + 18, by0 + 20); g.lineTo(bx0 + 8, by0 + 14); g.closePath(); g.fill();
    for (let x = bx0 + 8; x < bx0 + 36; x += 8) ln(g, x, by0 + 2, x + 1, by0 + 16, '#4a423c', 1.6);
    g.fillStyle = tn([214, 204, 178], 0.9); g.beginPath(); g.moveTo(bx0 + 40, by0 + 1); g.lineTo(bx0 + 52, by0 + 14); g.lineTo(bx0 + 36, by0 + 12); g.closePath(); g.fill(); ln(g, bx0 + 40, by0 + 1, bx0 + 52, by0 + 14, 'rgba(255,240,214,0.5)', 1);
    rim(g, bpf); edge(g, bpf, 0.5, 1);
    // rear door frame + ladder
    for (let i = 0; i < 6; i++) fr(g, [80, 72, 66], bx1 - 6, 74 + i * 0, 1, 0);
    box(g, bx0 - 3, by0 + 8, 6, by1 - by0 - 14, [118, 110, 100], { edgeA: 0.5 });
  } else {   // fuel tanker: horizontal cylinder, baffle rings, hatch, ladder, red stripe
    const tx0 = 12, tx1 = cx0 - 6, ty0 = 20, ty1 = 90, rx = 34;
    const tpf = (q) => { q.moveTo(tx0 + rx * 0.5, ty0); q.lineTo(tx1 - rx * 0.5, ty0); q.quadraticCurveTo(tx1 + 3, ty0, tx1 + 3, (ty0 + ty1) / 2); q.quadraticCurveTo(tx1 + 3, ty1, tx1 - rx * 0.5, ty1); q.lineTo(tx0 + rx * 0.5, ty1); q.quadraticCurveTo(tx0 - 3, ty1, tx0 - 3, (ty0 + ty1) / 2); q.quadraticCurveTo(tx0 - 3, ty0, tx0 + rx * 0.5, ty0); q.closePath(); };
    const tb = [tx0 - 3, ty0, tx1 - tx0 + 6, ty1 - ty0];
    // saddle cradles
    for (const sx of [tx0 + 24, tx1 - 40]) box(g, sx, 84, 22, 12, [70, 62, 56], { edgeA: 0.5 });
    g.beginPath(); tpf(g); g.fillStyle = '#d6cfba'; g.fill();
    g.save(); g.beginPath(); tpf(g); g.clip();
    g.fillStyle = vg(g, ty0, ty1, [[0, '#f2e6c8'], [0.18, '#d8cdb2'], [0.5, '#a09884'], [0.82, '#605850'], [1, '#2c2622']]); g.fillRect(tb[0], ty0, tb[2], ty1 - ty0);
    g.fillStyle = hg(g, tx0, tx1, [[0, 'rgba(10,8,20,0.32)'], [0.15, 'rgba(0,0,0,0)'], [0.9, 'rgba(255,226,180,0.14)'], [1, 'rgba(10,8,20,0.2)']]); g.fillRect(tb[0], ty0, tb[2], ty1 - ty0);
    // red stripe + lettering
    g.fillStyle = 'rgba(184,52,38,0.92)'; g.fillRect(tb[0], 42, tb[2], 20); g.fillStyle = 'rgba(244,232,206,0.85)'; g.fillRect(tb[0], 40, tb[2], 2); g.fillRect(tb[0], 62, tb[2], 2);
    g.fillStyle = vg(g, 42, 62, [[0, 'rgba(255,220,180,0.25)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]); g.fillRect(tb[0], 42, tb[2], 20);
    txt(g, 'RED ROCKET', (tx0 + tx1) / 2 + 22, 52.4, { size: 15, w: 92, fill: 'rgba(246,236,212,0.93)', family: F_SANS, style: 'bold italic' });
    // rocket emblem
    g.save(); g.translate(tx0 + 36, 52); g.fillStyle = 'rgba(246,236,212,0.95)'; g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(0, -8, 14, 0); g.quadraticCurveTo(0, 8, -14, 0); g.fill(); g.fillStyle = 'rgba(184,52,38,0.95)'; g.beginPath(); g.moveTo(-14, 0); g.lineTo(-20, -7); g.lineTo(-9, -2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-20, 7); g.lineTo(-9, 2); g.closePath(); g.fill(); g.restore();
    // baffle rings
    for (let x = tx0 + 36; x < tx1 - 10; x += 44) { g.fillStyle = 'rgba(10,6,12,0.32)'; g.fillRect(x, ty0, 1.6, ty1 - ty0); g.fillStyle = 'rgba(255,240,214,0.35)'; g.fillRect(x + 1.6 * LX, ty0, 0.9, ty1 - ty0); for (let y = ty0 + 8; y < ty1; y += 14) rivet(g, x + 0.8, y, 0.9); }
    over(g, 'chip', tb[0], tb[1], tb[2], tb[3], 0.7, r, 0.5); overFade(g, 'rust', tb[0], tb[1], tb[2], tb[3], 0.05, 0.9, r, 1); over(g, 'dirt', tb[0], tb[1], tb[2], tb[3], 0.36, r, 1);
    // bullet holes with fuel weeping down
    for (let i = 0; i < 5; i++) { const hx = tx0 + 20 + r.next() * (tx1 - tx0 - 40), hy = r.range(30, 70); hole(g, hx, hy, 1.3); if (i < 3) drip(g, hx, hy, r.range(14, 26), 1.8, [20, 12, 8], 0.55); }
    g.restore();
    rim(g, tpf); edge(g, tpf, 0.5, 1);
    // hatch, valves, ladder
    box(g, tx0 + 70, ty0 - 8, 22, 9, [120, 116, 108], { r: 3 }); box(g, tx0 + 76, ty0 - 12, 10, 5, [96, 92, 86], { r: 2 });
    for (let i = 0; i < 6; i++) fr(g, [86, 78, 70], tx0 - 5, 26 + i * 10.5, 7, 1.6); fr(g, [70, 64, 58], tx0 - 5, 24, 1.6, 66); fr(g, [70, 64, 58], tx0 + 1, 24, 1.6, 66);
    cylH(g, tx1 - 30, 90, 26, 4, [90, 84, 76]); g.strokeStyle = '#1c1816'; g.lineWidth = 3; g.beginPath(); g.moveTo(tx1 - 28, 94); g.bezierCurveTo(tx1 - 40, 108, tx1 - 60, 104, tx1 - 74, 110); g.stroke();
  }
  // ---- cab + hood ----
  const cab = truckCab(g, r, cx0, roof, cabCol, { rust: v === 1 ? 0.5 : 0.65 });
  if (v === 2) { cylV(g, cx0 - 4, roof - 22, 4, 40, [190, 184, 170]); rr(g, 0, 0, 0, 0, 0); }
  // ---- wheels (dual/tandem at the back, single up front) ----
  const rear = v === 0 ? [72] : [44, 80], front = cx0 + 112;
  for (const wx of rear.concat([front])) {
    const isFront = wx === front, wr = 27;
    if (!isFront && v !== 0) { /* tandem axle: dark fender */ }
    wheelWell(g, cab.allPf, wx, 96, wr);
    tyre(g, wx, 120, { rx: 21, ry: 18.5, hr: 10.5, kind: 'steel', sink: 5.5, heap: 7 }, r);
  }
  if (v === 0) {   // rear fender over the wheel, bolted
    const fpf = (q) => { q.moveTo(72 - 30, 94); q.quadraticCurveTo(72 - 28, 74, 72, 72); q.quadraticCurveTo(72 + 28, 74, 72 + 30, 94); q.lineTo(72 + 26, 94); q.quadraticCurveTo(72 + 24, 80, 72, 78); q.quadraticCurveTo(72 - 24, 80, 72 - 26, 94); q.closePath(); };
    weathered(g, fpf, [42, 72, 60, 22], cabCol, r, { rust: 0.8, holes: 1 });
  }
  // wheel spare / junk on the cab side
});
// ====================================================================== sf_bus (12x4): school bus wreck, rear axle sunk so the whole hull lists
def('bus', 12, 4, function (g, d, r, p) {
  const GY = 160, PX = 394, th = p.tilt === undefined ? -0.03 : p.tilt, YEL = [216, 174, 50];
  contact(g, 4, 474, GY, 0.55, 5);
  g.save(); g.translate(PX, GY); g.rotate(th); g.translate(-PX, -GY);
  // chassis under the skirt
  g.fillStyle = vg(g, 122, 160, [[0, 'rgba(6,4,8,0.85)'], [0.6, 'rgba(6,4,8,0.4)'], [1, 'rgba(6,4,8,0)']]); g.fillRect(14, 122, 456, 38);
  cylH(g, 20, 132, 440, 7, [64, 56, 50]); rustify(g, R_(20, 132, 440, 7), [20, 132, 440, 7], r, 0.9); cylH(g, 60, 144, 330, 3.4, [56, 48, 44]); cylH(g, 250, 138, 44, 9, [92, 76, 62]);
  // ---- hull
  const body = [[8, 129, 1], [8, 58], [11, 47], [18, 41], [28, 39.5], [352, 39.5], [366, 41], [376, 48], [388, 70], [398, 84], [406, 86], [454, 86], [467, 91], [472, 102], [472, 129, 1]];
  const bpf = (q) => spline(q, body, true), bb = bbox(body);
  weathered(g, bpf, bb, YEL, r, { rust: 0.62, holes: 9, dents: 6, grime: 0.42, rim: false, edge: false, chips: 1.2 });
  // sun-bleach: the paint has chalked out towards the roof
  within(g, bpf, (q) => { q.fillStyle = vg(q, 40, 90, [[0, 'rgba(255,240,196,0.22)'], [1, 'rgba(255,240,196,0)']]); q.fillRect(8, 40, 464, 50); });
  // roof crown highlight + body-side crease
  within(g, bpf, (q) => {
    q.strokeStyle = 'rgba(255,244,214,0.55)'; q.lineWidth = 1.6; q.beginPath(); q.moveTo(20, 43.5); q.lineTo(352, 43.5); q.stroke(); q.strokeStyle = 'rgba(10,6,12,0.3)'; q.lineWidth = 1; q.beginPath(); q.moveTo(20, 50); q.lineTo(372, 50); q.stroke();
    // black rub rails (the school bus signature) with a lit top edge
    for (const y of [89, 105, 121]) { q.fillStyle = 'rgba(24,22,22,0.92)'; q.fillRect(8, y, 366, 3.4); q.fillStyle = 'rgba(255,236,200,0.28)'; q.fillRect(8, y, 366, 0.8); q.fillStyle = 'rgba(10,6,12,0.4)'; q.fillRect(8, y + 3.4, 366, 1.4); }
    // rivet seams every 34px
    for (let x = 30; x < 372; x += 34) { q.fillStyle = 'rgba(10,6,12,0.32)'; q.fillRect(x, 84, 1, 44); q.fillStyle = 'rgba(255,240,214,0.24)'; q.fillRect(x + LX, 84, 0.7, 44); for (let y = 92; y < 124; y += 8) { rivet(q, x - 2.6, y, 0.75, [140, 120, 60]); rivet(q, x + 3.4, y, 0.75, [140, 120, 60]); } }
  });
  // lettering
  txt(g, 'CINDER RIDGE UNIFIED SCHOOL DISTRICT', 190, 97.6, { size: 9, w: 212, fill: 'rgba(28,24,22,0.92)', family: F_SANS });
  txt(g, 'SCHOOL BUS', 110, 46.6, { size: 8, w: 66, fill: 'rgba(28,24,22,0.9)', family: F_SANS });
  box(g, 316, 91.6, 13, 11, [28, 26, 26], { r: 1.5, edgeA: 0.3 }); txt(g, '7', 322.5, 97.4, { size: 10, fill: 'rgba(232,190,64,0.9)', family: F_SANS });
  within(g, R_(20, 90, 360, 16), (q) => over(q, 'chip', 20, 90, 360, 16, 0.75, r, 0.45));
  // ---- windows: sliding upper sash gone, seats visible, the sky glowing through the far side
  const seatCol = [[96, 88, 60], [70, 84, 70], [104, 82, 56]][r.int(0, 2)];
  for (let i = 0; i < 13; i++) {
    const x = 26 + i * 26, y = 55, w = 21, h = 27;
    if (i === 12) continue;
    // frame
    const fpf = R_(x - 2.4, y - 2.4, w + 4.8, h + 4.8, 3.4); box(g, x - 2.4, y - 2.4, w + 4.8, h + 4.8, [34, 30, 28], { r: 3.4, edgeA: 0.5, top: 0.12 });
    const st = r.pick(['gone', 'gone', 'gone', 'shards', 'cracked']), pane = [[x, y + 2], [x + 2, y], [x + w - 2, y], [x + w, y + 2], [x + w, y + h - 2], [x + w - 2, y + h], [x + 2, y + h], [x, y + h - 2]];
    glassPane(g, pane, r, { state: st, inner: (q, b) => {
      const left = (i % 3) !== 1, sx = left ? b[0] + 1.6 : b[0] + b[2] - 12.4;
      box(q, sx, b[1] + 11, 10.8, b[3] - 8, seatCol, { r: 3.4, edgeA: 0.5, top: 0.16 }); box(q, sx + 1.4, b[1] + 8.4, 8, 5, seatCol, { r: 2.4, edgeA: 0.5 }); fr(q, 'rgba(255,236,200,0.16)', sx + 2, b[1] + 12, 6.6, 1);
      q.fillStyle = 'rgba(8,6,8,0.6)'; q.fillRect(b[0], b[1] + b[3] - 3, b[2], 3);
      if (r.next() < 0.08) { ell(q, b[0] + b[2] * 0.5, b[1] + b[3] * 0.4, 3, 3.6, '#d8d0b6'); }
    } });
    fr(g, 'rgba(24,20,18,0.95)', x, y + 11.8, w, 1.6); fr(g, 'rgba(255,230,190,0.3)', x, y + 13.4, w, 0.7);            // sash bar
    fr(g, 'rgba(255,240,206,0.35)', x - 1.4, y + h + 2.2, w + 2.8, 0.9);                                              // lit sill
    if (r.next() < 0.55) drip(g, x + r.range(2, w - 2), y + h + 2.4, r.range(8, 22), r.range(2, 4), [110, 56, 26], 0.45);
    if (r.next() < 0.35) { g.save(); g.beginPath(); rr(g, x - 2.4, y - 2.4, w + 4.8, h + 4.8, 3.4); g.clip(); over(g, 'soot', x - 6, y - 10, w + 12, 12, 0.7, r, 0.6); g.restore(); }
  }
  // ---- cab: door, glass, hood, lamps
  const win = [[377, 58], [383, 55.6], [386, 56], [394, 80], [378, 82]];
  box(g, 373.5, 54, 27, 33, [34, 30, 28], { r: 3, edgeA: 0.5, top: 0.1 }); glassPane(g, win, r, { state: 'cracked', inner: (q, b) => { ell(q, b[0] + 6, b[1] + 16, 2.6, 6.4, '#1a1412', -0.2); box(q, b[0] + 2, b[1] + 12, 8, 14, seatCol, { r: 3 }); } });
  fr(g, 'rgba(10,6,10,0.8)', 383, 58, 1.2, 28);
  const hpf = (q) => spline(q, [[402, 86, 1], [454, 86], [467, 91], [472, 102], [472, 129, 1], [402, 129, 1]], true);
  within(g, hpf, (q) => { q.strokeStyle = 'rgba(255,240,208,0.4)'; q.lineWidth = 1.6; q.beginPath(); q.moveTo(410, 88); q.lineTo(455, 88); q.stroke(); q.strokeStyle = 'rgba(10,6,12,0.5)'; q.lineWidth = 1.2; q.beginPath(); q.moveTo(420, 92); q.lineTo(420, 128); q.moveTo(452, 92); q.lineTo(452, 128); q.stroke(); });
  // grille + headlamp + bumper
  for (let i = 0; i < 5; i++) { fr(g, 'rgba(14,10,10,0.75)', 462 + (i % 2) * 0.4, 96 + i * 4.6, 9, 1.8); fr(g, 'rgba(255,236,200,0.25)', 462, 97.8 + i * 4.6, 9, 0.7); }
  circ(g, 456, 98, 7.6, 'rgba(20,12,10,0.7)'); circ(g, 456, 98, 6.8, '#d0c8b4'); circ(g, 456, 98, 5, '#1a1e22'); circ(g, 454, 96, 1.6, 'rgba(255,255,255,0.7)');
  g.strokeStyle = 'rgba(190,220,230,0.7)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(452, 95); g.lineTo(459, 101); g.moveTo(459, 94); g.lineTo(453, 100); g.stroke();
  box(g, 448, 116, 32, 10, [30, 28, 28], { r: 2.5, edgeA: 0.5 }); chromeRect(g, 450, 117, 26, 2, { r });
  // roof gear: hatches, amber/red warning lamps, vent pipe
  for (const hx of [90, 210, 270]) { box(g, hx, 35.4, 24, 4.6, [190, 152, 46], { r: 1.5, edgeA: 0.5 }); rustify(g, R_(hx, 35.4, 24, 4.6), [hx, 35.4, 24, 4.6], r, 0.7); }
  for (const [lx, c] of [[16, [176, 40, 34]], [344, [220, 150, 40]], [356, [220, 150, 40]]]) { box(g, lx, 33, 9, 7, c, { r: 3, edgeA: 0.5 }); fr(g, 'rgba(255,255,255,0.4)', lx + 1, 34, 4, 1.4); }
  // tail lamps
  box(g, 6, 66, 5, 12, [170, 42, 34], { r: 1.5 }); fr(g, 'rgba(255,255,255,0.4)', 7, 67, 1.4, 6);
  // torn-away body panel low at the back, ribs and floor exposed
  const tpts = [[16, 92], [58, 90], [66, 106], [50, 128], [18, 128]];
  g.save(); g.beginPath(); bpf(g); g.clip(); g.fillStyle = '#0b0a0a'; g.beginPath(); poly(g, tpts); g.fill();
  for (let x = 24; x < 62; x += 12) fr(g, [86, 76, 66], x, 92, 2.4, 36); fr(g, [70, 62, 56], 16, 120, 44, 2.4);
  g.strokeStyle = 'rgba(255,236,196,0.45)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(16, 92.4); g.lineTo(58, 90.4); g.lineTo(66, 106); g.stroke(); g.restore();
  // rust streaks from every rivet line + the sills
  within(g, bpf, (q) => { streaks(q, 12, 84, 356, 40, 34, r, [110, 52, 24], 0.32); over(q, 'rust', 8, 100, 464, 30, 0.7, r, 0.8); ao(q, 8, 110, 464, 20, 'b', 0.5, 16); });
  rim(g, bpf); edge(g, bpf, 0.5, 1);
  // ---- wheels: dual rears (sunk deeper), single front
  const arch = (wx) => wheelWell(g, bpf, wx, 128, 29);
  arch(112); arch(394);
  tyre(g, 112, 160, { rx: 23, ry: 20, hr: 11, kind: 'steel', sink: 7, heap: 0 }, r);
  tyre(g, 394, 160, { rx: 23, ry: 20, hr: 11, kind: 'steel', sink: 5, heap: 0 }, r);
  g.restore();
  // rubble heaps piled against the sunken axle and the front tyre (ground frame)
  heap(g, 84, 146, GY, 12, r); heap(g, 366, 428, GY, 8, r);
  for (let i = 0; i < 5; i++) box(g, 80 + r.range(0, 60), GY - 5 - r.range(0, 5), r.range(5, 9), r.range(4, 7), [124 + r.range(-20, 20), 116, 106], { edgeA: 0.5 });
});
// @@PARTS@@
})();
