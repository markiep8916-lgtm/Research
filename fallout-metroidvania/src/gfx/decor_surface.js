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
// volume light over an already-filled shape: warm top, cool dark bottom, dark left / light right
function shade(g, pf, b, o) {
  o = o || {}; const x = b[0], y = b[1], w = b[2], h = b[3];
  g.save(); g.beginPath(); pf(g); g.clip();
  g.fillStyle = vg(g, y, y + h, [[0, 'rgba(255,238,205,' + (o.top === undefined ? 0.3 : o.top) + ')'], [0.3, 'rgba(255,238,205,0.04)'], [0.62, 'rgba(0,0,0,0)'], [1, 'rgba(12,8,20,' + (o.bot === undefined ? 0.4 : o.bot) + ')']]);
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle = hg(g, x, x + w, [[0, 'rgba(10,8,24,' + (o.left === undefined ? 0.26 : o.left) + ')'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(255,226,180,' + (o.right === undefined ? 0.14 : o.right) + ')']]);
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  if (o.grain !== false) over(g, 'grain', x, y, w, h, o.grain || 0.5, null, 1);
  g.restore();
}
// filled, volume-lit shape
function solid(g, pf, b, base, o) {
  o = o || {};
  g.beginPath(); pf(g); g.fillStyle = tn(base, 1); g.fill();
  shade(g, pf, b, o);
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
function crushProfile(P, k) {   // squash the greenhouse towards the belt line: caved-in roof
  const b = P.belt, f = (pt) => [pt[0], b - (b - pt[1]) * k, pt[2]];
  return Object.assign({}, P, { gh: P.gh.map(f), panes: P.panes.map((pl) => pl.map(f)) });
}
function drawCar(g, r, o) {
  const pal = CPAL[o.v], burnt = !!o.burnt, W = 200, H = 80;
  const P = o.crushed ? crushProfile(CPROF[pal.prof], r.range(0.3, 0.5)) : CPROF[pal.prof];
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
  if (pal2.taxi && !cr) {   // roof sign + checker band
    box(g, 96, 4.4, 26, 7.6, [222, 214, 186], { r: 1.5, edgeA: 0.6 }); txt(g, 'TAXI', 109, 8.4, { size: 7, w: 20, fill: '#26201a', family: F_SANS });
    g.save(); g.beginPath(); bodyPf(g); g.clip(); for (let x = 12; x < 190; x += 5) { g.fillStyle = ((x / 5) | 0) % 2 ? 'rgba(20,18,16,0.85)' : 'rgba(228,220,196,0.9)'; g.fillRect(x, 47.4, 5, 2.6); g.fillStyle = ((x / 5) | 0) % 2 ? 'rgba(228,220,196,0.9)' : 'rgba(20,18,16,0.85)'; g.fillRect(x, 50, 5, 2.6); } g.restore();
  }
  if (pal2.police && !cr) {   // light bar + door lettering
    box(g, 98, 6.4, 24, 5.6, [176, 176, 170], { r: 1.5 }); g.fillStyle = 'rgba(160,36,30,0.9)'; g.fillRect(100, 7, 9, 3.6); g.fillStyle = 'rgba(40,80,170,0.9)'; g.fillRect(111.5, 7, 9, 3.6); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(100, 7, 20.5, 1);
    txt(g, 'POLICE', 132, 51, { size: 6.5, w: 27, fill: 'rgba(238,232,214,0.92)', family: F_SANS, rot: 0 });
    circ(g, 80, 50, 3.6, 'rgba(230,200,90,0.9)'); circ(g, 80, 50, 2, 'rgba(70,90,140,0.9)');
  }
  if (P.rack && !cr) {   // roof rack with a rotten suitcase
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
// irregular chunk of concrete / stone sitting on the ground line (cx, gy = bottom centre)
function rock(g, cx, gy, w, h, r, col, o) {
  o = o || {}; const n = 8, pts = [[cx - w / 2, gy + 0.5]];
  for (let i = 1; i < n; i++) { const t = i / n, a = PI + t * PI, k = i === 1 || i === n - 1 ? 0.7 : 1; pts.push([cx + Math.cos(a) * w / 2 * r.range(0.82, 1.06), gy + Math.sin(a) * h * r.range(0.72, 1.08) * k]); }
  pts.push([cx + w / 2, gy + 0.5]);
  const pf = P_(pts), b = bbox(pts); col = col || [126, 120, 110];
  g.fillStyle = 'rgba(6,4,8,0.35)'; g.beginPath(); g.ellipse(cx - 1 * LX, gy, w * 0.55, 2.2, 0, 0, TAU); g.fill();
  solid(g, pf, b, [col[0] * r.range(0.9, 1.1), col[1] * r.range(0.9, 1.1), col[2] * r.range(0.9, 1.1)], { top: 0.34, bot: 0.4, grain: 0.9, edgeA: 0.55 });
  within(g, pf, (q) => {
    for (let i = 0; i < 2 + (w > 14 ? 2 : 0); i++) { const x0 = b[0] + r.next() * b[2], y0 = b[1] + r.next() * b[3]; q.strokeStyle = 'rgba(8,4,8,0.4)'; q.lineWidth = 0.8; q.beginPath(); q.moveTo(x0, y0); q.lineTo(x0 + r.range(-6, 6), y0 + r.range(2, 8)); q.stroke(); q.strokeStyle = 'rgba(255,238,208,0.22)'; q.beginPath(); q.moveTo(x0 + 1.2 * LX, y0 - 0.6); q.lineTo(x0 + r.range(-6, 6) + 1.2 * LX, y0 + r.range(2, 8) - 0.6); q.stroke(); }
    over(q, 'dirt', b[0], b[1], b[2], b[3], 0.35, r, 1);
  });
  if (o.rebar) { g.save(); g.lineCap = 'round'; for (let i = 0; i < 2; i++) { const rx = cx + r.range(-w * 0.3, w * 0.3), ry = b[1] + 1; g.strokeStyle = 'rgba(8,4,6,0.6)'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + r.range(-4, 6), ry - r.range(6, 14)); g.stroke(); g.strokeStyle = 'rgb(126,70,38)'; g.lineWidth = 1.6; g.stroke(); } g.restore(); }
}

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
// ====================================================================== sf_wreck_stack (6x4): three crushed cars piled up
def('wreck_stack', 6, 4, function (g, d, r, p) {
  const GY = 160;
  contact(g, 4, 232, GY, 0.55, 5);
  const L = [
    { v: r.int(0, 5), cx: 118, bot: GY, sq: 0.9, rot: 0.0, dark: false },
    { v: r.int(0, 5), cx: 108, bot: GY - 44, sq: 0.9, rot: -0.05, dark: r.next() < 0.4 },
    { v: r.int(0, 5), cx: 128, bot: GY - 88, sq: 0.9, rot: 0.075, dark: false },
  ];
  L.forEach((c, i) => {
    g.save(); g.translate(c.cx, c.bot); g.rotate(c.rot); g.scale(1, c.sq); g.translate(-100, -66);
    drawCar(g, r, { v: c.v, burnt: c.dark, open: null, crushed: true, rust: 0.95 });
    g.restore();
  });
  // loose tyres at the foot
  for (const [tx, ty, tr] of [[14, 0, 15], [228, 0, 13]]) { tyre(g, tx + (tx < 100 ? 6 : -4), GY, { rx: tr, ry: tr * 0.85, hr: tr * 0.5, kind: 'steel', sink: 2, heap: 4 }, r); }
  heap(g, 6, 236, GY, 5, r);
});
// ====================================================================== shared building bits: tin sheets, planks, garlands
const TIN_COLS = [[156, 92, 56], [84, 132, 124], [196, 184, 152], [156, 64, 48], [156, 156, 148], [182, 146, 60], [116, 150, 170], [122, 88, 58]];
function sheet(g, x, y, w, h, col, r, o) {   // one corrugated tin sheet nailed to a wall, throwing a little shadow on what is below/left of it
  o = o || {}; const pf = R_(x, y, w, h, 0.8), b = [x, y, w, h];
  g.fillStyle = 'rgba(6,3,8,0.34)'; g.fillRect(x - 2.2 * LX, y + 2.4, w, h);
  tin(g, pf, b, col, o.P || 6, o.vert !== false);
  shade(g, pf, b, { top: 0.16, bot: 0.34, left: 0.16, right: 0.1, grain: 0.6 });
  rustify(g, pf, b, r, o.rust === undefined ? r.range(0.25, 0.8) : o.rust, { bias: 1.4 });
  chips(g, pf, b, r, Math.round(w * h / 320), null, 2.2);
  if (o.nails !== false) for (let i = 0; i < Math.max(2, Math.round(w / 16)); i++) { rivet(g, x + 4 + i * (w - 8) / Math.max(1, Math.round(w / 16) - 1), y + 3.4, 0.9, [96, 90, 84]); if (h > 24) rivet(g, x + 4 + i * (w - 8) / Math.max(1, Math.round(w / 16) - 1), y + h - 3.4, 0.9, [96, 90, 84]); }
  if (o.holes) within(g, pf, (q) => { for (let i = 0; i < o.holes; i++) hole(q, x + 4 + r.next() * (w - 8), y + 4 + r.next() * (h - 8), r.range(1, 2)); });
  rim(g, pf, { w: 1.1 }); edge(g, pf, 0.5, 1);
}
function plank(g, x, y, w, h, col, r, o) {   // weathered board; grain runs along its long axis
  o = o || {}; const pf = R_(x, y, w, h, 0.5), b = [x, y, w, h], hz = w >= h;
  solid(g, pf, b, col, { top: 0.2, bot: 0.34, left: hz ? 0.1 : 0.22, right: 0.1, grain: 0.8, rim: false, edge: false });
  within(g, pf, (q) => {
    const n = Math.round((hz ? h : w) * 1.3);
    for (let i = 0; i < n; i++) { q.strokeStyle = 'rgba(' + (r.next() < 0.55 ? '40,26,14' : '210,180,140') + ',' + r.range(0.12, 0.36) + ')'; q.lineWidth = r.range(0.4, 1); q.beginPath(); if (hz) { const gy = y + r.next() * h, gx = x + r.next() * w * 0.6; q.moveTo(gx, gy); q.lineTo(gx + r.range(10, w * 0.7), gy + r.range(-0.8, 0.8)); } else { const gx = x + r.next() * w, gy = y + r.next() * h * 0.6; q.moveTo(gx, gy); q.lineTo(gx + r.range(-0.8, 0.8), gy + r.range(10, h * 0.7)); } q.stroke(); }
    if (o.knots !== false && r.next() < 0.6) { const kx = x + w * r.range(0.2, 0.8), ky = y + h * r.range(0.3, 0.7); ell(q, kx, ky, hz ? 2.6 : 1.7, hz ? 1.5 : 2.6, 'rgba(48,30,16,0.75)'); ell(q, kx - 0.4, ky - 0.4, hz ? 1.5 : 0.9, hz ? 0.8 : 1.5, 'rgba(120,84,50,0.6)'); }
    overFade(q, 'dirt', x, y, w, h, 0.05, 0.4, r, 1.2);
  });
  rim(g, pf, { w: 1 }); edge(g, pf, 0.5, 1);
  if (o.nails !== false) { if (hz) { rivet(g, x + 3, y + h / 2, 0.85, [70, 64, 60]); rivet(g, x + w - 3, y + h / 2, 0.85, [70, 64, 60]); } else { rivet(g, x + w / 2, y + 3, 0.85, [70, 64, 60]); rivet(g, x + w / 2, y + h - 3, 0.85, [70, 64, 60]); } }
}
const CAPCOL = [[176, 44, 38], [44, 90, 150], [226, 218, 196], [214, 170, 60], [64, 128, 84], [190, 100, 40]];
function bottleCap(g, x, y, r0, col, r) {
  g.save(); g.translate(x, y); g.rotate(r.range(0, TAU)); g.beginPath();
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rr2 = i % 2 ? r0 : r0 * 1.16; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.closePath();
  g.fillStyle = 'rgba(8,4,6,0.5)'; g.save(); g.translate(0.4, 0.8); g.fill(); g.restore();
  g.fillStyle = rg(g, -r0 * 0.3, -r0 * 0.35, 0, r0 * 1.2, [[0, tn(col, 1.5)], [0.6, tn(col, 1)], [1, tn(col, 0.5)]]); g.fill(); g.lineWidth = 0.5; g.strokeStyle = 'rgba(20,10,8,0.5)'; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.arc(-r0 * 0.3, -r0 * 0.3, r0 * 0.28, 0, TAU); g.fill(); g.restore();
}
function garland(g, x0, y0, x1, y1, sag, n, r, capR) {   // string of bottle caps hung between two hooks
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + sag * 2;
  g.strokeStyle = 'rgba(28,20,14,0.9)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
  for (let i = 1; i < n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; const px = a * x0 + b * cx + c * x1, py = a * y0 + b * cy + c * y1 + capR; bottleCap(g, px, py, capR * r.range(0.9, 1.1), r.pick(CAPCOL), r); }
}
// ---- crates + oil drums (used in props and inside other scenes) ----
function crateBox(g, x, y, w, h, r, o) {   // x,y = top-left
  o = o || {}; const col = o.col || r.pick([[140, 108, 70], [126, 98, 66], [86, 98, 70], [148, 66, 50]]), pf = R_(x, y, w, h, 0.8), b = [x, y, w, h];
  g.fillStyle = 'rgba(6,3,8,0.3)'; g.fillRect(x - 2 * LX, y + 2, w, h);
  solid(g, pf, b, [40, 30, 22], { rim: false, edge: false, top: 0, bot: 0, left: 0, right: 0, grain: 0 });
  const n = Math.max(2, Math.round(h / 9)), sh = (h - 6) / n;
  for (let i = 0; i < n; i++) plank(g, x + 3, y + 3 + i * sh, w - 6, sh - 1.2, [col[0] * r.range(0.86, 1.1), col[1] * r.range(0.86, 1.1), col[2] * r.range(0.86, 1.1)], r, { nails: false, knots: false });
  plank(g, x, y, 5, h, col, r, { nails: false }); plank(g, x + w - 5, y, 5, h, col, r, { nails: false });
  plank(g, x, y, w, 4.6, col, r, { nails: false }); plank(g, x, y + h - 4.6, w, 4.6, col, r, { nails: false });
  g.save(); g.beginPath(); pf(g); g.clip(); g.strokeStyle = 'rgba(30,20,12,0.75)'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(x + 4, y + h - 4); g.lineTo(x + w - 4, y + 4); g.stroke();
  g.strokeStyle = tn(col, 1.05); g.lineWidth = 2.6; g.beginPath(); g.moveTo(x + 4, y + h - 4); g.lineTo(x + w - 4, y + 4); g.stroke(); g.strokeStyle = 'rgba(255,236,200,0.3)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x + 4.8 * LX, y + h - 5); g.lineTo(x + w - 3, y + 3); g.stroke(); g.restore();
  for (const [nx, ny] of [[x + 2.5, y + 2.5], [x + w - 2.5, y + 2.5], [x + 2.5, y + h - 2.5], [x + w - 2.5, y + h - 2.5]]) rivet(g, nx, ny, 1, [70, 64, 58]);
  if (o.text !== false && w > 26) txt(g, o.text || r.pick(['10MM', 'RATIONS', 'MEDICAL', 'FRAGILE', 'NUKA', 'TOOLS']), x + w / 2, y + h / 2 + 0.5, { size: Math.min(9, h * 0.3), w: Math.min(w * 0.6, 30), fill: 'rgba(232,224,196,0.72)', family: F_SANS });
  chips(g, pf, b, r, Math.round(w * h / 200), null, 2); rim(g, pf); edge(g, pf, 0.55, 1);
}
function drum(g, x, y, w, h, r, o) {   // x = left, y = bottom
  o = o || {}; const col = o.col || r.pick([[156, 62, 44], [62, 100, 138], [72, 116, 76], [204, 172, 60], [122, 122, 118]]), top = y - h, ry = Math.max(2.6, w * 0.14);
  ell(g, x + w / 2, y - 0.4, w * 0.62, 2.6, 'rgba(6,4,8,0.5)');
  const pf = (q) => { q.moveTo(x, top); q.lineTo(x, y - ry * 0.4); q.quadraticCurveTo(x + w / 2, y + ry * 0.9, x + w, y - ry * 0.4); q.lineTo(x + w, top); q.closePath(); }, b = [x, top - ry, w, h + ry];
  cylV(g, x, top, w, h, col);
  within(g, pf, (q) => {
    for (const f of [0.1, 0.36, 0.64, 0.9]) { const ry2 = top + h * f; q.fillStyle = 'rgba(8,4,10,0.5)'; q.fillRect(x, ry2 + 1.6, w, 2); q.fillStyle = hg(q, x, x + w, [[0, tn(col, 0.5)], [0.5, tn(col, 1.1)], [1, tn(col, 0.7)]]); q.fillRect(x - 0.6, ry2 - 1.4, w + 1.2, 3); q.fillStyle = 'rgba(255,240,208,0.4)'; q.fillRect(x, ry2 - 1.4, w, 0.8); }
    if (o.rad) { const cx = x + w / 2, cy = top + h * 0.5, R0 = w * 0.3; circ(q, cx, cy, R0 + 1.4, 'rgba(24,20,16,0.6)'); circ(q, cx, cy, R0, '#d8b830'); q.fillStyle = '#1c1812'; for (let i = 0; i < 3; i++) { q.beginPath(); q.moveTo(cx, cy); q.arc(cx, cy, R0 * 0.86, i * TAU / 3 - 0.5, i * TAU / 3 + 0.5); q.closePath(); q.fill(); } circ(q, cx, cy, R0 * 0.2, '#d8b830'); }
  });
  rustify(g, pf, b, r, o.rust === undefined ? r.range(0.4, 0.9) : o.rust, { bias: 1.2 }); chips(g, pf, b, r, Math.round(w * h / 90), null, 2.2); grime(g, pf, b, r, 0.3);
  within(g, pf, (q) => { for (let i = 0; i < 2; i++) dent(q, x + r.next() * w, top + h * r.range(0.25, 0.8), r.range(4, 8), r.range(3, 6), 0); if (r.next() < 0.6) hole(q, x + r.range(3, w - 3), top + h * r.range(0.3, 0.8), 1.3); });
  // lid: ellipse with lip, bungs
  g.fillStyle = rg(g, x + w * 0.62, top - ry * 0.4, 1, w * 0.6, [[0, tn(col, 1.3)], [0.7, tn(col, 0.85)], [1, tn(col, 0.5)]]); g.beginPath(); g.ellipse(x + w / 2, top, w / 2, ry, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,236,200,0.5)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x + w / 2, top, w / 2 - 0.5, ry - 0.5, 0, PI * 1.05, PI * 1.9); g.stroke(); g.strokeStyle = 'rgba(10,6,10,0.55)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x + w / 2, top, w / 2 - 0.5, ry - 0.5, 0, 0.05, PI * 0.95); g.stroke();
  ell(g, x + w * 0.36, top, 1.7, 0.9, '#1a1410'); ell(g, x + w * 0.62, top + 0.2, 1.2, 0.7, '#1a1410');
  rustify(g, (q) => { q.ellipse(x + w / 2, top, w / 2, ry, 0, 0, TAU); }, [x, top - ry, w, ry * 2], r, 0.6);
  edge(g, pf, 0.5, 1);
}
// ====================================================================== sf_shack (9x5): Haskell's trading post
def('shack', 9, 5, function (g, d, r, p) {
  const W = 360, GY = 200, text = String(p.text || 'TRADING POST').toUpperCase();
  contact(g, 4, 352, GY, 0.55, 5);
  // stovepipe behind the roof, guyed with wire
  { const sx = 262; g.save(); cylV(g, sx, 10, 9, 74, [126, 118, 108]); rustify(g, R_(sx, 10, 9, 74), [sx, 10, 9, 74], r, 0.8); for (const yy of [30, 58]) { box(g, sx - 1.4, yy, 11.8, 4, [104, 96, 88], { edgeA: 0.5 }); }
    box(g, sx - 5, 4, 19, 6, [110, 102, 94], { r: 2, edgeA: 0.5 }); box(g, sx - 1, 0, 11, 5, [96, 88, 80], { r: 2, edgeA: 0.5 });
    g.strokeStyle = 'rgba(30,26,24,0.7)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(sx + 4, 34); g.lineTo(206, 80); g.moveTo(sx + 4, 34); g.lineTo(318, 88); g.stroke();
    g.fillStyle = vg(g, 10, 84, [[0, 'rgba(20,14,10,0)'], [1, 'rgba(20,14,10,0.5)']]); g.fillRect(sx - 3, 10, 5, 74); g.restore(); }
  // gable wall of patched tin
  const gab = [[34, GY, 1], [34, 100, 1], [106, 72], [178, 40, 1], [250, 70], [326, 100, 1], [326, GY, 1]], gpf = (q) => spline(q, gab, true), gb = [34, 40, 292, 160];
  g.beginPath(); gpf(g); g.fillStyle = '#2c2119'; g.fill();
  g.save(); g.beginPath(); gpf(g); g.clip();
  for (let x = 28; x < 330;) { const w = r.range(30, 58); sheet(g, x, r.range(34, 66), w, GY, r.pick(TIN_COLS), r, { P: r.pick([5, 6, 8]), rust: r.range(0.3, 0.85) }); x += w - r.range(1, 5); }
  for (let i = 0; i < 12; i++) { const w = r.range(20, 54), h = r.range(16, 56), px = r.range(36, 320 - w), py = r.range(82, GY - 14 - h); if (r.next() < 0.7) sheet(g, px, py, w, h, r.pick(TIN_COLS), r, { vert: r.next() < 0.6, holes: r.int(0, 2) }); else plank(g, px, py, w, 7, [120, 92, 62], r); }
  // a road sign and a licence plate nailed up as patches
  box(g, 292, 150, 26, 26, [174, 44, 38], { r: 3, edgeA: 0.6 }); txt(g, 'STOP', 305, 163.6, { size: 8, w: 20, fill: 'rgba(240,232,214,0.85)' }); rustify(g, R_(292, 150, 26, 26), [292, 150, 26, 26], r, 0.6);
  box(g, 52, 176, 22, 11, [200, 190, 150], { r: 1.5, edgeA: 0.6 }); txt(g, 'OH-213', 63, 181.6, { size: 6, w: 18, fill: 'rgba(40,40,60,0.8)' });
  grime(g, gpf, gb, r, 0.5); overFade(g, 'streak', 34, 40, 292, 160, 0.4, 0.9, r, 1); overFade(g, 'soot', 214, 40, 60, 60, 0.5, 0, r, 1.2);
  g.restore(); rim(g, gpf, { w: 1.2 }); edge(g, gpf, 0.5, 1);
  // roof edge sheets following the slopes (sagging, overhanging) + drip stains
  for (const [pts, off] of [[[[26, 104], [106, 70], [178, 36]], -1], [[[330, 104], [250, 68], [178, 36]], 1]]) {
    g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(8,4,10,0.55)'; g.lineWidth = 9; g.beginPath(); g.moveTo(pts[0][0], pts[0][1] + 1.5); g.quadraticCurveTo(pts[1][0], pts[1][1] + 3.5, pts[2][0], pts[2][1] + 1.5); g.stroke();
    g.strokeStyle = vg(g, 34, 106, [[0, '#c9baa0'], [0.5, '#8a7c6c'], [1, '#5a4c40']]); g.lineWidth = 7; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.quadraticCurveTo(pts[1][0], pts[1][1] + 2, pts[2][0], pts[2][1]); g.stroke();
    g.strokeStyle = 'rgba(255,240,208,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(pts[0][0], pts[0][1] - 3); g.quadraticCurveTo(pts[1][0], pts[1][1] - 1, pts[2][0], pts[2][1] - 3); g.stroke();
    g.setLineDash([2, 5]); g.strokeStyle = 'rgba(126,62,28,0.7)'; g.lineWidth = 5; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.quadraticCurveTo(pts[1][0], pts[1][1] + 2, pts[2][0], pts[2][1]); g.stroke(); g.setLineDash([]); g.restore();
  }
  // doorway: timber frame, dark interior with shelves, tattered curtain
  const dx = 150, dy = 122, dw = 64;
  g.fillStyle = vg(g, dy, GY, [[0, '#0a0706'], [1, '#150f0c']]); g.fillRect(dx, dy, dw, GY - dy);
  g.save(); g.beginPath(); g.rect(dx, dy, dw, GY - dy); g.clip();
  for (const sy of [138, 158, 178]) { fr(g, '#22180f', dx + dw - 26, sy, 26, 2.6); for (let k = 0; k < 4; k++) { const jx = dx + dw - 24 + k * 6.4, jh = r.range(5, 9); fr(g, 'rgba(120,84,40,0.5)', jx, sy - jh, 4.4, jh); fr(g, 'rgba(232,190,110,0.22)', jx + 0.6, sy - jh + 1, 1.2, jh - 2); } }
  g.fillStyle = vg(g, dy, GY, [[0, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(dx, dy, dw, GY - dy);
  g.restore();
  plank(g, dx - 7, dy - 6, 7, GY - dy + 6, [112, 84, 56], r); plank(g, dx + dw, dy - 6, 7, GY - dy + 6, [112, 84, 56], r); plank(g, dx - 9, dy - 8, dw + 18, 8, [124, 94, 62], r);
  g.fillStyle = 'rgba(6,3,8,0.45)'; g.fillRect(dx, dy, dw, 6);
  // curtain rag
  g.save(); g.beginPath(); g.rect(dx, dy, dw, GY - dy); g.clip(); g.fillStyle = vg(g, dy, dy + 56, [[0, 'rgba(146,58,46,0.95)'], [1, 'rgba(96,36,30,0.95)']]); g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + 26, dy); g.lineTo(dx + 24, dy + 40); g.lineTo(dx + 18, dy + 52); g.lineTo(dx + 14, dy + 38); g.lineTo(dx + 8, dy + 58); g.lineTo(dx + 2, dy + 44); g.lineTo(dx, dy + 60); g.closePath(); g.fill();
  for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgba(30,10,8,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(dx + 3 + i * 5, dy); g.lineTo(dx + 4 + i * 5 + r.range(-2, 2), dy + r.range(30, 52)); g.stroke(); }
  g.restore();
  // hand-painted OPEN board hanging from the frame
  { g.save(); g.translate(dx + dw + 14, dy + 12); g.rotate(-0.06); ln(g, 0, -6, 0, 0, 'rgba(30,24,20,0.8)', 1); box(g, -13, 0, 26, 12, [186, 170, 120], { r: 1.5, edgeA: 0.6 }); txt(g, 'OPEN', 0, 6.4, { size: 8, w: 20, fill: 'rgba(150,40,34,0.9)' }); g.restore(); }
  // serving hatch with propped shutter + counter + goods
  { const hx = 70, hy = 138, hw = 52, hh = 34;
    g.fillStyle = '#0d0907'; g.fillRect(hx, hy, hw, hh); g.fillStyle = vg(g, hy, hy + hh, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(hx, hy, hw, hh);
    plank(g, hx - 4, hy - 4, hw + 8, 4, [116, 88, 58], r, { nails: false }); plank(g, hx - 4, hy - 4, 4, hh + 8, [116, 88, 58], r, { nails: false }); plank(g, hx + hw, hy - 4, 4, hh + 8, [116, 88, 58], r, { nails: false });
    plank(g, hx - 8, hy + hh, hw + 16, 6, [132, 100, 66], r);
    for (let k = 0; k < 6; k++) { const jx = hx + 3 + k * 8.4, jh = r.range(7, 14); fr(g, 'rgba(24,14,8,0.85)', jx, hy + hh - jh, 6, jh); fr(g, 'rgba(232,190,110,0.28)', jx + 0.8, hy + hh - jh + 1.4, 1.5, jh - 3); }
    const sp = [[hx - 6, hy - 6], [hx + hw + 6, hy - 6], [hx + hw + 2, hy - 26], [hx - 2, hy - 26]]; g.fillStyle = 'rgba(6,3,8,0.36)'; g.beginPath(); poly(g, sp.map((q) => [q[0] - 2 * LX, q[1] + 3])); g.fill(); tin(g, P_(sp), bbox(sp), [150, 150, 140], 6, true); shade(g, P_(sp), bbox(sp), { top: 0.2, bot: 0.3 }); rustify(g, P_(sp), bbox(sp), r, 0.7); rim(g, P_(sp)); edge(g, P_(sp), 0.5);
    ln(g, hx + hw - 2, hy - 6, hx + hw + 6, hy + hh + 4, '#3a2c20', 2); }
  // ---- awning: sagging tin sheet over two posts, fascia board carrying the sign
  const fy = (x) => 117 + 8 * (1 - Math.pow((x - 180) / 172, 2));
  const aw = [[10, 104, 1], [50, 90], [180, 85], [310, 90], [350, 104, 1]];
  g.fillStyle = 'rgba(6,3,8,0.4)'; g.beginPath(); poly(g, aw.map((q) => [q[0] - 2 * LX, q[1] + 3])); g.fill();
  const apf = (q) => spline(q, aw.concat([[350, 106, 1], [10, 106, 1]]), true), ab = [10, 85, 340, 21];
  tin(g, apf, ab, [148, 148, 140], 7, true); shade(g, apf, ab, { top: 0.25, bot: 0.35 }); rustify(g, apf, ab, r, 0.8, { bias: 0.8 }); over(g, 'dirt', 10, 85, 340, 21, 0.3, r, 1.2); chips(g, apf, ab, r, 50, null, 2.4);
  within(g, apf, (q) => { for (let i = 0; i < 4; i++) hole(q, r.range(30, 330), r.range(92, 102), r.range(1.2, 2.2)); for (let x = 20; x < 345; x += 34) rivet(q, x, 100, 0.9, [96, 90, 84]); });
  rim(g, apf); edge(g, apf, 0.55, 1);
  const fpts = [[6, 104, 1], [354, 104, 1], [354, 117, 1], [180, 125.5], [6, 117, 1]], fpf = (q) => spline(q, fpts, true), fb = [6, 104, 348, 22];
  solid(g, fpf, fb, [96, 100, 78], { top: 0.16, bot: 0.4 });
  within(g, fpf, (q) => {
    for (let x = 6; x < 354; x += 12) { q.fillStyle = 'rgba(10,6,12,0.4)'; q.fillRect(x, 104, 1.1, 24); q.fillStyle = 'rgba(255,240,214,0.18)'; q.fillRect(x + 1.1 * LX, 104, 0.8, 24); }
    // painted sign panel
    q.fillStyle = vg(q, 105, 124, [[0, 'rgba(38,58,50,0.94)'], [1, 'rgba(26,42,36,0.94)']]); q.fillRect(64, 105.6, 232, 16.8); q.strokeStyle = 'rgba(232,214,150,0.8)'; q.lineWidth = 1; q.strokeRect(66, 107.6, 228, 12.8);
    txt(q, text, 180, 114.6, { size: 13, w: Math.min(190, text.length * 15.4), fill: 'rgba(238,224,168,0.95)', family: F_SANS, ls: 1.4, shadow: 'rgba(0,0,0,0.5)' });
    txt(q, '★', 76, 114.4, { size: 8, fill: 'rgba(238,224,168,0.9)' }); txt(q, '★', 284, 114.4, { size: 8, fill: 'rgba(238,224,168,0.9)' });
    over(q, 'chip', 64, 105, 232, 18, 0.9, r, 0.45); overFade(q, 'rust', 6, 104, 348, 22, 0.1, 0.85, r, 0.9);
  });
  rim(g, fpf); edge(g, fpf, 0.55, 1);
  for (const px of [12, 336]) { plank(g, px, 124, 11, GY - 124, [116, 88, 58], r); box(g, px - 3, 122, 17, 5, [96, 72, 48], { edgeA: 0.5 }); }
  // garland of bottle caps + a lantern + hanging tools
  const hooks = [24, 104, 180, 256, 336];
  for (let i = 0; i < 4; i++) garland(g, hooks[i], fy(hooks[i]) + 0.5, hooks[i + 1], fy(hooks[i + 1]) + 0.5, 6 + r.range(0, 4), 8, r, 3.6);
  for (const hx of hooks) circ(g, hx, fy(hx), 1.4, '#2a221c');
  { const lx = 300; ln(g, lx, fy(lx), lx, fy(lx) + 8, 'rgba(30,24,20,0.9)', 1); box(g, lx - 4, fy(lx) + 8, 8, 12, [86, 76, 66], { r: 2, edgeA: 0.5 }); ell(g, lx, fy(lx) + 14, 2.2, 3.4, 'rgba(230,190,110,0.55)'); box(g, lx - 5, fy(lx) + 6.4, 10, 2.4, [70, 62, 56], { edgeA: 0.5 }); }
  // ---- crates, drums, a bench at the foot
  crateBox(g, 34, GY - 26, 26, 26, r); crateBox(g, 62, GY - 20, 22, 20, r); crateBox(g, 40, GY - 46, 22, 20, r);
  drum(g, 288, GY, 24, 34, r, { rad: false }); drum(g, 314, GY, 22, 31, r, {});
  plank(g, 226, GY - 16, 40, 5, [112, 84, 56], r); plank(g, 230, GY - 11, 4, 11, [96, 72, 48], r); plank(g, 258, GY - 11, 4, 11, [96, 72, 48], r);
  for (let i = 0; i < 6; i++) box(g, 230 + i * 6, GY - 24 - r.range(0, 2), 4.6, 8, r.pick([[176, 60, 46], [70, 110, 140], [200, 176, 70]]), { r: 1.5, edgeA: 0.5 });   // cans on the bench
  heap(g, 0, 360, GY, 3.5, r);
});
// ====================================================================== sf_redrocket (4x12): pole-mounted Red Rocket gas sign
function starPath(g, cx, cy, R, r2, n, rot) { n = n || 5; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU - PI / 2 + (rot || 0), rad = i % 2 ? r2 : R; if (i) g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); else g.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } g.closePath(); }
function guy(g, x0, y0, x1, y1, sag) {   // taut wire with a tiny sag and a highlight
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag;
  g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(10,6,8,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0 + 0.6); g.quadraticCurveTo(mx, my + 0.6, x1, y1 + 0.6); g.stroke();
  g.strokeStyle = 'rgba(150,140,128,0.85)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke(); g.strokeStyle = 'rgba(255,240,212,0.4)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x0, y0 - 0.5); g.quadraticCurveTo(mx, my - 0.5, x1, y1 - 0.5); g.stroke(); g.restore();
}
def('redrocket', 4, 12, function (g, d, r, p) {
  const W = 160, GY = 480, cx = 80;
  contact(g, 40, 80, GY, 0.5, 4);
  // footing + base plate
  box(g, 54, 462, 52, 18, [118, 114, 106], { r: 2, edgeA: 0.5 }); rustify(g, R_(54, 462, 52, 18), [54, 462, 52, 18], r, 0.5); box(g, 64, 456, 32, 8, [86, 82, 78], { r: 1, edgeA: 0.5 });
  for (const bx of [58, 100]) rivet(g, bx, 470, 2, [70, 66, 62]);
  // pole (steel tube) with collars and a rusty streaked lower half
  cylV(g, 74, 130, 12, 330, [128, 128, 124]); overFade(g, 'rust', 74, 130, 12, 330, 0.1, 0.95, r, 0.8); overFade(g, 'streak', 74, 130, 12, 330, 0.3, 0.5, r, 1);
  for (const y of [246, 330, 420]) { box(g, 71.6, y, 16.8, 5, [96, 90, 84], { edgeA: 0.55 }); rivet(g, 76, y + 2.5, 0.9); rivet(g, 84, y + 2.5, 0.9); }
  // guy wires to the ground
  guy(g, 80, 246, 6, 476, 5); guy(g, 80, 246, 154, 476, 5); guy(g, 80, 330, 20, 478, 3); guy(g, 80, 330, 140, 478, 3);
  for (const [gx, gy] of [[6, 476], [154, 476]]) { circ(g, gx, gy, 3, '#3a3430'); circ(g, gx, gy, 1.4, '#8a8478'); }
  // braces from the pole to the panels
  ln(g, 80, 232, 44, 196, 'rgba(60,54,50,0.9)', 3); ln(g, 80, 232, 116, 196, 'rgba(60,54,50,0.9)', 3);
  // ---- price board
  { const pf = R_(38, 198, 84, 36, 4), b = [38, 198, 84, 36]; solid(g, pf, b, [58, 78, 82], { top: 0.2 }); within(g, pf, (q) => { q.strokeStyle = 'rgba(236,222,170,0.7)'; q.lineWidth = 1.2; q.strokeRect(41.5, 201.5, 77, 29); txt(q, 'OPEN 24 HRS', 80, 212.4, { size: 10, w: 62, fill: 'rgba(238,224,168,0.9)' }); txt(q, 'FUEL  •  PARTS', 80, 224.4, { size: 8, w: 58, fill: 'rgba(238,224,168,0.75)' }); over(q, 'chip', 38, 198, 84, 36, 0.8, r, 0.5); }); rustify(g, pf, b, r, 0.7); rim(g, pf); edge(g, pf, 0.55); for (const [rx, ry] of [[43, 203], [117, 203], [43, 229], [117, 229]]) rivet(g, rx, ry, 1.3); }
  // ---- text panel
  { const pf = R_(12, 144, 136, 52, 7), b = [12, 144, 136, 52];
    solid(g, pf, b, [188, 50, 38], { top: 0.26, bot: 0.44 });
    within(g, pf, (q) => {
      q.strokeStyle = 'rgba(244,232,204,0.9)'; q.lineWidth = 2.6; q.beginPath(); rr(q, 17, 149, 126, 42, 4); q.stroke(); q.strokeStyle = 'rgba(10,6,10,0.35)'; q.lineWidth = 1; q.beginPath(); rr(q, 15.6, 147.6, 128.8, 44.8, 5); q.stroke();
      // faded star
      q.fillStyle = 'rgba(232,206,130,0.75)'; q.beginPath(); starPath(q, 34, 170, 12.6, 5.4); q.fill(); q.strokeStyle = 'rgba(80,30,20,0.5)'; q.lineWidth = 0.8; q.stroke();
      txt(q, 'RED', 84, 161, { size: 15, w: 40, fill: 'rgba(246,236,212,0.95)', family: F_SANS, style: 'bold italic', shadow: 'rgba(60,10,8,0.5)' });
      txt(q, 'ROCKET', 88, 180, { size: 19, w: 74, fill: 'rgba(246,236,212,0.95)', family: F_SANS, style: 'bold italic', shadow: 'rgba(60,10,8,0.5)' });
      overFade(q, 'chip', 12, 144, 136, 52, 0.85, 0.5, r, 0.42); overFade(q, 'rust', 12, 144, 136, 52, 0.2, 0.9, r, 0.9); overFade(q, 'dirt', 12, 144, 136, 52, 0.15, 0.5, r, 1.1);
      for (let i = 0; i < 7; i++) hole(q, r.range(20, 140), r.range(150, 190), r.range(1.2, 2.2));
      streaks(q, 14, 190, 132, 26, 7, r, [110, 52, 24], 0.4);
    });
    rim(g, pf); edge(g, pf, 0.6);
    for (const [rx, ry] of [[19, 150], [141, 150], [19, 190], [141, 190]]) rivet(g, rx, ry, 1.5, [150, 140, 128]);
    // crumpled bottom-right corner
    g.save(); g.fillStyle = tn([160, 44, 34], 0.8); g.beginPath(); g.moveTo(148, 180); g.lineTo(140, 196); g.lineTo(150, 196); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,230,190,0.4)'; g.lineWidth = 0.8; g.stroke(); g.restore(); }
  // ---- rocket
  { const body = [[80, 4, 1], [90, 20], [98, 44], [100, 72], [100, 118, 1], [60, 118, 1], [60, 72], [62, 44], [70, 20]], bpf = (q) => spline(q, body, true), bb = [60, 4, 40, 114];
    // fins
    for (const s of [-1, 1]) { const fp = [[80 + s * 20, 84], [80 + s * 46, 130], [80 + s * 46, 142], [80 + s * 20, 122]], pf = P_(fp); solid(g, pf, bbox(fp), [176, 44, 34], { top: 0.2, bot: 0.4 }); rustify(g, pf, bbox(fp), r, 0.6); chips(g, pf, bbox(fp), r, 20, null, 2); }
    // nozzle
    { const np = [[68, 116], [92, 116], [98, 132], [62, 132]]; solid(g, P_(np), bbox(np), [70, 68, 68], { top: 0.2 }); rustify(g, P_(np), bbox(np), r, 0.9); }
    g.beginPath(); bpf(g); g.fillStyle = '#e4dcc8'; g.fill();
    within(g, bpf, (q) => {
      q.fillStyle = 'rgba(188,46,36,0.98)'; q.fillRect(56, 0, 50, 50); q.fillRect(56, 88, 50, 14);          // red nose + band
      q.fillStyle = 'rgba(30,24,22,0.5)'; q.fillRect(56, 50, 50, 1.4); q.fillRect(56, 87, 50, 1.4); q.fillStyle = 'rgba(255,244,214,0.35)'; q.fillRect(56, 51.4, 50, 0.9);
      q.fillStyle = vg(q, 4, 118, [[0, 'rgba(255,240,206,0.28)'], [0.3, 'rgba(255,240,206,0.02)'], [1, 'rgba(10,6,16,0.4)']]); q.fillRect(56, 0, 50, 120);
      q.fillStyle = hg(q, 60, 100, [[0, 'rgba(10,8,24,0.42)'], [0.55, 'rgba(0,0,0,0)'], [0.85, 'rgba(255,230,190,0.22)'], [1, 'rgba(10,8,24,0.15)']]); q.fillRect(56, 0, 50, 120);
      over(q, 'grain', 56, 0, 50, 120, 0.6, null, 1);
    });
    // porthole
    circ(g, cx, 66, 11.6, 'rgba(20,12,10,0.6)'); circ(g, cx, 66, 10.6, '#bfb8a8'); g.fillStyle = rg(g, cx + 2, 63, 0, 8, [[0, '#4a6470'], [1, '#141c22']]); g.beginPath(); g.arc(cx, 66, 7.6, 0, TAU); g.fill(); cracks(g, cx + 1, 65, 7, r, 0.7); g.save(); g.beginPath(); g.arc(cx, 66, 7.6, 0, TAU); g.clip(); g.fillStyle = 'rgba(255,230,190,0.25)'; g.fillRect(cx - 9, 58, 18, 4); g.restore();
    { rustify(g, bpf, bb, r, 0.8, { bias: 1.2 }); chips(g, bpf, bb, r, 70, null, 2.6); within(g, bpf, (q) => { over(q, 'chip', 60, 4, 40, 114, 0.6, r, 0.42); for (let i = 0; i < 6; i++) hole(q, r.range(64, 96), r.range(20, 110), r.range(1.2, 2)); dent(q, 84, 24, 9, 6, 0.3); streaks(q, 60, 80, 40, 36, 6, r, [90, 60, 40], 0.4); }); }
    rim(g, bpf); edge(g, bpf, 0.6);
    // strut joining rocket to the panel
    box(g, 72, 118, 16, 26, [104, 100, 94], { edgeA: 0.5 }); }
  // top cap flare on the pole behind the panel
  box(g, 76, 132, 8, 14, [96, 90, 84], { edgeA: 0.5 });
  heap(g, 30, 130, GY, 4, r);
});
// ====================================================================== sf_pump (1.6x2.6): retro globe-top fuel pump
const PUMPC = [[186, 54, 40], [98, 154, 148], [206, 164, 58]];
def('pump', 1.6, 2.6, function (g, d, r, p) {
  const v = p.v === undefined ? r.int(0, 2) : cl(p.v | 0, 0, 2), col = PUMPC[v], GY = 104;
  contact(g, 0, 64, GY, 0.5, 4);
  // concrete island
  { const pf = R_(3, 96, 58, 8, 1); solid(g, pf, [3, 96, 58, 8], [128, 124, 116], { rim: true }); chips(g, pf, [3, 96, 58, 8], r, 14, ['rgba(60,56,52,0.8)'], 2); yellowStripe(g, 3, 100, 58, 2.4); }
  // cabinet
  const body = [[14, 97, 1], [12, 62], [13, 44], [18, 36.5], [46, 36.5], [51, 44], [52, 62], [50, 97, 1]], bpf = (q) => spline(q, body, true), bb = bbox(body);
  weathered(g, bpf, bb, col, r, { rust: 0.6, holes: 2, dents: 1, grime: 0.4, rim: false, edge: false });
  within(g, bpf, (q) => {
    q.fillStyle = 'rgba(232,222,196,0.86)'; q.fillRect(10, 42, 46, 3); q.fillRect(10, 82, 46, 2.4);   // cream bands
    q.fillStyle = 'rgba(10,6,12,0.28)'; q.fillRect(10, 45, 46, 1); q.fillRect(10, 84.4, 46, 1);
    q.fillStyle = hg(q, 12, 52, [[0, 'rgba(10,8,24,0.26)'], [0.5, 'rgba(0,0,0,0)'], [0.85, 'rgba(255,230,190,0.2)'], [1, 'rgba(10,8,24,0.1)']]); q.fillRect(10, 36, 44, 62);
    overFade(q, 'rust', 10, 36, 44, 62, 0.05, 0.9, r, 0.7); over(q, 'chip', 10, 36, 44, 62, 0.4, r, 0.42);
    ao(q, 10, 80, 44, 18, 'b', 0.5, 14);
  });
  // dial: chrome bezel, cream face, ticks, hand; smashed glass
  circ(g, 32, 54, 12.6, 'rgba(14,8,8,0.6)'); g.fillStyle = vg(g, 42, 66, [[0, '#f4e8d0'], [0.4, '#a29a8c'], [0.6, '#40444a'], [1, '#d8d0bc']]); g.beginPath(); g.arc(32, 54, 12, 0, TAU); g.fill();
  circ(g, 32, 54, 9.6, '#d8cfb4'); circ(g, 32, 54, 9.6, rg(g, 32, 54, 2, 10, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(90,70,40,0.45)']]));
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ln(g, 32 + Math.cos(a) * 7.4, 54 + Math.sin(a) * 7.4, 32 + Math.cos(a) * 9, 54 + Math.sin(a) * 9, 'rgba(30,24,20,0.8)', 0.7); }
  ln(g, 32, 54, 32 + 6 * Math.cos(-0.5), 54 + 6 * Math.sin(-0.5), '#a02a20', 1.1); circ(g, 32, 54, 1.3, '#2a2420');
  g.save(); g.beginPath(); g.arc(32, 54, 9.6, 0, TAU); g.clip(); g.fillStyle = 'rgba(160,200,214,0.22)'; g.fillRect(20, 42, 24, 24); cracks(g, 30, 52, 9, r, 0.75); g.fillStyle = 'rgba(255,236,200,0.28)'; g.beginPath(); g.ellipse(28, 48, 6, 2, -0.6, 0, TAU); g.fill(); g.restore();
  // price counters + nameplate
  box(g, 18, 68, 28, 8, [26, 26, 28], { r: 1, edgeA: 0.6 }); for (let i = 0; i < 3; i++) { fr(g, 'rgba(210,190,120,0.5)', 20 + i * 8.6, 69.6, 6.4, 4.8); txt(g, String((i * 3 + 2) % 10), 23.2 + i * 8.6, 72.2, { size: 6, fill: 'rgba(40,30,20,0.8)', family: F_MONO }); }
  txt(g, 'RED ROCKET', 32, 90.6, { size: 5, w: 28, fill: 'rgba(232,222,196,0.8)' });
  chromeRect(g, 11, 79, 42, 3, { r });
  rim(g, bpf); edge(g, bpf, 0.55, 1);
  // neck + cap + globe (broken at the top)
  { const np = [[24, 37], [40, 37], [37, 32], [27, 32]]; chromeRect(g, 26, 31, 12, 6, { r }); rim(g, P_(np)); }
  { const cx = 32, cy = 19.6, R0 = 12, a0 = -PI * 0.28, a1 = -PI * 0.72;
    const gp = (q) => { q.arc(cx, cy, R0, a0, a1, false); q.lineTo(cx - 6.4, cy - R0 * 0.72); q.lineTo(cx - 3.4, cy - R0 * 0.94); q.lineTo(cx - 0.6, cy - R0 * 0.66); q.lineTo(cx + 2.6, cy - R0 * 0.96); q.lineTo(cx + 5.6, cy - R0 * 0.72); q.closePath(); };
    g.save(); g.beginPath(); gp(g); g.fillStyle = rg(g, cx + 3, cy - 3, 0, R0 * 1.1, [[0, 'rgba(250,242,220,0.95)'], [0.55, 'rgba(226,214,184,0.92)'], [1, 'rgba(150,132,104,0.95)']]); g.fill(); g.clip();
    g.fillStyle = 'rgba(176,44,34,0.55)'; g.beginPath(); starPath(g, cx, cy + 2, 6.4, 2.8); g.fill();   // faded rocket-star emblem
    cracks(g, cx - 3, cy + 3, 9, r, 0.5); overFade(g, 'dirt', cx - R0, cy - R0, R0 * 2, R0 * 2, 0.1, 0.5, r, 1);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(cx + 5, cy - 4.4, 2.4, 4.4, 0.6, 0, TAU); g.fill(); g.restore();
    rim(g, gp); edge(g, gp, 0.55, 1);
    // dark hollow through the break + the lamp socket
    g.fillStyle = 'rgba(12,8,8,0.88)'; g.beginPath(); g.moveTo(cx - 6.4, cy - R0 * 0.72); g.lineTo(cx - 3.4, cy - R0 * 0.94); g.lineTo(cx - 0.6, cy - R0 * 0.66); g.lineTo(cx + 2.6, cy - R0 * 0.96); g.lineTo(cx + 5.6, cy - R0 * 0.72); g.lineTo(cx + 1, cy - 4); g.closePath(); g.fill(); ell(g, cx, cy - 5.6, 2, 2.4, '#6a6a68');
  }
  // nozzle on its holster + drooping hose
  box(g, 50, 60, 6, 5, [70, 66, 62], { r: 1, edgeA: 0.5 });
  { const np = [[52, 58], [58, 56], [61, 66], [58, 76], [55, 76], [56, 66]]; solid(g, P_(np), bbox(np), [90, 88, 86], { top: 0.3 }); chromeRect(g, 57, 68, 3.4, 6, { r }); }
  g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(6,4,6,0.9)'; g.lineWidth = 3.6; g.beginPath(); g.moveTo(58, 56); g.bezierCurveTo(70, 40, 74, 84, 60, 96); g.bezierCurveTo(52, 104, 44, 100, 48, 96); g.stroke(); g.strokeStyle = 'rgba(96,86,80,0.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(58.6, 55.4); g.bezierCurveTo(70.6, 39.4, 74.6, 83.4, 60.6, 95.4); g.stroke(); g.restore();
});
function yellowStripe(g, x, y, w, h) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = '#b9962c'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(24,20,16,0.85)'; for (let xx = x - h; xx < x + w + h; xx += h * 2.4) { g.beginPath(); g.moveTo(xx, y + h); g.lineTo(xx + h, y + h); g.lineTo(xx + h * 2, y); g.lineTo(xx + h, y); g.closePath(); g.fill(); } g.restore(); }
// ====================================================================== sf_canopy (18x7): gas station forecourt canopy
function stationColumn(g, x, y0, y1, w, r, o) {   // white-and-red painted concrete column on a hazard-striped plinth
  o = o || {}; const b = [x, y0, w, y1 - y0], pf = R_(x, y0, w, y1 - y0, 1);
  contact(g, x - 8, w + 16, y1, 0.5, 4);
  g.fillStyle = hg(g, x, x + w, [[0, tn([208, 200, 178], 0.4)], [0.3, tn([208, 200, 178], 0.78)], [0.68, tn([208, 200, 178], 1.22)], [0.85, tn([208, 200, 178], 1.0)], [1, tn([208, 200, 178], 0.5)]]); g.fillRect(x, y0, w, y1 - y0);
  g.save(); g.beginPath(); pf(g); g.clip();
  for (const [ya, yb] of o.rings || [[y0 + 14, y0 + 28], [y1 - 96, y1 - 82]]) { g.fillStyle = hg(g, x, x + w, [[0, 'rgba(90,20,16,0.95)'], [0.3, 'rgba(150,34,26,0.95)'], [0.68, 'rgba(200,62,46,0.95)'], [1, 'rgba(110,26,20,0.95)']]); g.fillRect(x, ya, w, yb - ya); g.fillStyle = 'rgba(255,236,200,0.35)'; g.fillRect(x, ya, w, 1); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, yb - 1, w, 1.4); }
  overFade(g, 'rust', x, y0, w, y1 - y0, 0.1, 0.9, r, 0.9); over(g, 'chip', x, y0, w, y1 - y0, 0.55, r, 0.5); overFade(g, 'dirt', x, y0, w, y1 - y0, 0.2, 0.7, r, 1.2); overFade(g, 'streak', x, y0, w, y1 - y0, 0.5, 0.8, r, 1);
  for (let i = 0; i < 6; i++) hole(g, x + 4 + r.next() * (w - 8), y0 + 30 + r.next() * (y1 - y0 - 60), r.range(1.2, 2));
  // spalled patch showing rebar
  { const sy = y0 + (y1 - y0) * r.range(0.35, 0.55); g.fillStyle = '#3a3430'; g.beginPath(); g.moveTo(x + 4, sy); g.lineTo(x + w - 6, sy + 4); g.lineTo(x + w - 3, sy + 22); g.lineTo(x + 10, sy + 26); g.closePath(); g.fill(); for (const rx of [x + 10, x + 17, x + w - 12]) cylV(g, rx, sy - 2, 2.4, 30, [130, 76, 44]); }
  g.restore(); rim(g, pf); edge(g, pf, 0.55, 1);
  // plinth
  const pp = R_(x - 5, y1 - 22, w + 10, 22, 1); solid(g, pp, [x - 5, y1 - 22, w + 10, 22], [122, 118, 110], {}); yellowStripe(g, x - 5, y1 - 12, w + 10, 5); chips(g, pp, [x - 5, y1 - 22, w + 10, 22], r, 16, ['rgba(60,56,52,0.8)'], 2); rustify(g, pp, [x - 5, y1 - 22, w + 10, 22], r, 0.4);
  // capital flare into the roof
  const cp = [[x - 8, y0 + 2], [x + w + 8, y0 + 2], [x + w, y0 + 14], [x, y0 + 14]]; solid(g, P_(cp), bbox(cp), [190, 182, 160], { top: 0.2 }); rustify(g, P_(cp), bbox(cp), r, 0.5);
}
function canopySlab(g, x0, x1, r, o) {   // fascia + soffit strip of the roof plate, local y 6..58
  const pf = R_(x0, 6, x1 - x0, 40, 3), b = [x0, 6, x1 - x0, 40];
  // soffit (stained ceiling) first, peeking below the fascia
  const sp = R_(x0 + 2, 44, x1 - x0 - 4, 14, 0); solid(g, sp, [x0 + 2, 44, x1 - x0 - 4, 14], [88, 82, 74], { top: 0, bot: 0.3, rim: false }); overFade(g, 'dirt', x0, 44, x1 - x0, 14, 0.8, 0.4, r, 1.4); over(g, 'rust', x0, 44, x1 - x0, 14, 0.4, r, 0.8);
  within(g, sp, (q) => { for (let x = x0 + 20; x < x1 - 30; x += 52) { box(q, x, 47, 26, 6, [40, 38, 36], { edgeA: 0.4, top: 0 }); fr(q, 'rgba(210,190,130,0.16)', x + 2, 48, 22, 1.4); } q.fillStyle = 'rgba(96,66,30,0.28)'; for (let i = 0; i < 5; i++) { const sx = x0 + r.next() * (x1 - x0); q.beginPath(); q.ellipse(sx, 50, r.range(12, 34), r.range(3, 6), 0, 0, TAU); q.fill(); } });
  weathered(g, pf, b, [212, 204, 182], r, { rust: 0.55, holes: 5, dents: 2, grime: 0.36, rim: false, edge: false });
  within(g, pf, (q) => {
    q.fillStyle = 'rgba(184,46,36,0.95)'; q.fillRect(x0, 28, x1 - x0, 14); q.fillStyle = 'rgba(244,232,206,0.9)'; q.fillRect(x0, 26, x1 - x0, 2.4); q.fillRect(x0, 42, x1 - x0, 2.4); q.fillStyle = 'rgba(184,46,36,0.95)'; q.fillRect(x0, 6, x1 - x0, 3.4);
    q.fillStyle = vg(q, 28, 42, [[0, 'rgba(255,220,180,0.25)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]); q.fillRect(x0, 28, x1 - x0, 14);
    for (let x = Math.ceil(x0 / 60) * 60; x < x1; x += 60) { q.fillStyle = 'rgba(10,6,12,0.34)'; q.fillRect(x, 6, 1.2, 40); q.fillStyle = 'rgba(255,240,214,0.28)'; q.fillRect(x + 1.2 * LX, 6, 0.8, 40); for (let y = 12; y < 44; y += 10) { rivet(q, x - 3.4, y, 0.85); rivet(q, x + 4.4, y, 0.85); } }
    over(q, 'chip', x0, 6, x1 - x0, 40, 0.5, r, 0.55); overFade(q, 'rust', x0, 6, x1 - x0, 40, 0.15, 0.9, r, 0.9); streaks(q, x0, 44, x1 - x0, 30, Math.round((x1 - x0) / 22), r, [120, 58, 26], 0.4);
  });
  rim(g, pf); edge(g, pf, 0.6, 1);
  ao(g, x0, 6, x1 - x0, 40, 'b', 0.3, 6);
}
function poleLight(g, x, y, len, r, o) {   // hanging fixture: rod + cone shade + bulb socket (unlit)
  o = o || {}; g.save(); g.translate(x, y); if (o.tilt) g.rotate(o.tilt);
  ln(g, 0, 0, 0, len, 'rgba(10,6,8,0.6)', 3.2); cylV(g, -1.4, 0, 2.8, len, [96, 90, 84]);
  const sh = [[-13, len + 10], [-5, len + 1], [5, len + 1], [13, len + 10]]; solid(g, P_(sh), bbox(sh), [110, 96, 84], { top: 0.3, bot: 0.4 }); rustify(g, P_(sh), bbox(sh), r, 0.8); ell(g, 0, len + 10.4, 12.6, 2.4, '#20180f'); ell(g, 0, len + 10.6, 6, 1.4, 'rgba(232,210,150,0.5)'); ell(g, 0, len + 12, 3, 2, 'rgba(210,196,150,0.6)');
  g.restore();
}
def('canopy', 18, 7, function (g, d, r, p) {
  const W = 720, GY = 280, col = p.collapse === undefined ? 0.35 : cl(+p.collapse, 0, 1);
  const cutX = 616 - 120 * col, th = col < 0.02 ? 0 : 0.08 + 0.5 * col, hy = 26;
  stationColumn(g, 112, 52, GY, 30, r); stationColumn(g, 578, 52, GY, 30, r, { rings: [[66, 80], [GY - 96, GY - 82]] });
  canopySlab(g, -6, (col < 0.02 ? W + 6 : cutX + 6), r);
  txt(g, 'RED ROCKET', 296, 17.6, { size: 17, w: 196, fill: 'rgba(184,46,36,0.92)', family: F_SANS, style: 'bold italic', shadow: 'rgba(255,240,210,0.25)' }); within(g, R_(190, 9, 210, 17), (q) => over(q, 'chip', 190, 9, 210, 17, 0.7, r, 0.4));
  if (col >= 0.02) {
    // debris beneath the break + twisted rebar bridging the tear
    for (let i = 0; i < 14; i++) rock(g, r.range(cutX - 30, W - 12), GY - r.range(0, 3), r.range(12, 34), r.range(8, 20), r, [124, 118, 108], { rebar: r.next() < 0.3 });
    for (let i = 0; i < 9; i++) { const rx = cutX + r.range(-6, 16); g.save(); g.strokeStyle = 'rgba(8,4,6,0.6)'; g.lineWidth = 3.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(rx, 30 + i * 1.6); g.bezierCurveTo(rx + 6, 34 + i * 3, rx - 4, 48 + i * 6, rx + r.range(2, 14), 66 + i * 8); g.stroke(); g.strokeStyle = 'rgb(' + (120 + (i % 3) * 20) + ',' + (66 + (i % 3) * 10) + ',34)'; g.lineWidth = 2; g.stroke(); g.restore(); }
    g.save(); g.translate(cutX, hy); g.rotate(th); g.translate(-cutX, -hy);
    // jagged torn edge where the plate broke off, then the plate itself
    canopySlab(g, cutX - 2, W + 8, r);
    g.fillStyle = '#0b0908'; g.beginPath(); g.moveTo(cutX - 2, 6); for (let y = 6; y <= 46; y += 6) g.lineTo(cutX - 2 + (y % 12 ? -5 : 4), y); g.lineTo(cutX - 2, 46); g.closePath(); g.fill();
    g.restore();
  }
  // hanging pole lights under the intact part
  const lx = [190, 300, 400, 500].filter((x) => x < cutX - 24 || col < 0.02);
  lx.forEach((x, i) => poleLight(g, x, 58, r.range(20, 34), r, { tilt: i === 2 && col > 0.1 ? 0.35 : 0 }));
  if (col >= 0.02) { const fx = cutX + 46; g.save(); g.strokeStyle = 'rgba(30,26,24,0.9)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(fx, 78); g.bezierCurveTo(fx + 4, 100, fx - 6, 120, fx + 10, 150); g.stroke(); g.restore(); poleLight(g, fx + 10, 150, 6, r, { tilt: 0.5 }); }
  heap(g, 100, 160, GY, 3, r); heap(g, 566, 626, GY, 4, r);
});
// ====================================================================== posters, shelves (shared by the station, shops and diner)
function poster(g, x, y, w, h, r, o) {   // taped, sun-bleached flyer with a curling corner
  o = o || {}; const kind = o.kind || r.pick(['nuka', 'sugar', 'sale', 'vault', 'wanted']), rot = r.range(-0.06, 0.06);
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rot); g.translate(-w / 2, -h / 2);
  g.fillStyle = 'rgba(6,3,8,0.3)'; g.fillRect(-1.6 * LX, 2, w, h);
  const bg = { nuka: [190, 60, 44], sugar: [220, 190, 70], sale: [226, 218, 190], vault: [56, 100, 156], wanted: [214, 196, 152] }[kind];
  box(g, 0, 0, w, h, bg, { edgeA: 0.35, top: 0.1, bot: 0.24, grain: 0.7 });
  g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip();
  if (kind === 'nuka') { txt(g, 'NUKA-COLA', w / 2, h * 0.16, { size: 9, w: w * 0.8, fill: 'rgba(244,232,204,0.95)', style: 'bold italic' }); g.fillStyle = 'rgba(244,232,204,0.9)'; g.beginPath(); rr(g, w * 0.4, h * 0.3, w * 0.2, h * 0.52, 4); g.fill(); g.fillRect(w * 0.45, h * 0.22, w * 0.1, h * 0.12); g.fillStyle = 'rgba(120,30,24,0.85)'; g.fillRect(w * 0.4, h * 0.5, w * 0.2, h * 0.12); txt(g, 'ICE COLD', w / 2, h * 0.9, { size: 6, w: w * 0.6, fill: 'rgba(244,232,204,0.9)' }); }
  else if (kind === 'sugar') { txt(g, 'SUGAR', w / 2, h * 0.2, { size: 11, w: w * 0.8, fill: 'rgba(170,40,30,0.95)', style: 'bold italic' }); txt(g, 'BOMBS', w / 2, h * 0.36, { size: 11, w: w * 0.8, fill: 'rgba(170,40,30,0.95)', style: 'bold italic' }); circ(g, w / 2, h * 0.68, w * 0.26, 'rgba(60,40,30,0.85)'); circ(g, w / 2 + w * 0.06, h * 0.62, w * 0.06, 'rgba(255,255,255,0.7)'); }
  else if (kind === 'sale') { txt(g, 'SALE', w / 2, h * 0.28, { size: 15, w: w * 0.8, fill: 'rgba(176,40,32,0.95)' }); for (let i = 0; i < 4; i++) fr(g, 'rgba(40,36,34,0.55)', w * 0.14, h * (0.5 + i * 0.1), w * (0.5 + (i % 2) * 0.3), 1.4); }
  else if (kind === 'vault') { txt(g, 'VAULT-TEC', w / 2, h * 0.14, { size: 8, w: w * 0.86, fill: 'rgba(244,232,170,0.95)' }); circ(g, w / 2, h * 0.46, w * 0.22, 'rgba(244,232,170,0.9)'); circ(g, w / 2, h * 0.46, w * 0.15, 'rgba(56,100,156,0.95)'); txt(g, 'BE PREPARED', w / 2, h * 0.86, { size: 6, w: w * 0.8, fill: 'rgba(244,232,170,0.9)' }); }
  else { txt(g, 'WANTED', w / 2, h * 0.14, { size: 9, w: w * 0.8, fill: 'rgba(60,36,24,0.9)', family: F_SERIF }); g.fillStyle = 'rgba(60,44,32,0.6)'; g.beginPath(); g.arc(w / 2, h * 0.46, w * 0.22, 0, TAU); g.fill(); fr(g, 'rgba(60,44,32,0.6)', w * 0.28, h * 0.62, w * 0.44, h * 0.18); txt(g, '500 CAPS', w / 2, h * 0.9, { size: 6, w: w * 0.6, fill: 'rgba(60,36,24,0.9)', family: F_SERIF }); }
  overFade(g, 'dirt', 0, 0, w, h, 0.3, 0.8, r, 1.2); over(g, 'chip', 0, 0, w, h, 0.5, r, 0.4);
  g.restore();
  // curling corner + tape
  const cs = Math.min(w, h) * 0.24; g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.moveTo(w - cs, h); g.lineTo(w, h); g.lineTo(w, h - cs); g.closePath(); g.fill(); g.fillStyle = tn(bg, 1.25); g.beginPath(); g.moveTo(w - cs, h); g.lineTo(w - cs * 0.15, h - cs * 0.15); g.lineTo(w, h - cs); g.closePath(); g.fill();
  for (const [tx, ty] of [[2, 0], [w - 6, 0]]) { g.fillStyle = 'rgba(226,210,150,0.55)'; g.fillRect(tx - 2, ty - 2, 8, 4); }
  g.restore();
}
function shelfUnit(g, x, y, w, h, r, o) {   // dark shop shelving with tins and boxes (kept low-contrast: it is inside a dark room)
  o = o || {}; const n = o.rows || Math.max(2, Math.round(h / 22)), rh = h / n;
  fr(g, 'rgba(24,18,14,0.9)', x, y, w, h);
  for (let i = 0; i < n; i++) {
    const sy = y + (i + 1) * rh; fr(g, 'rgba(70,52,38,0.95)', x, sy - 2.4, w, 2.4); fr(g, 'rgba(255,230,190,0.16)', x, sy - 2.4, w, 0.7);
    for (let px = x + 2; px < x + w - 4;) { const pw = r.range(4, 9), ph = r.range(rh * 0.3, rh * 0.75); if (r.next() < 0.75) { const c = r.pick([[120, 50, 40], [60, 90, 110], [170, 140, 70], [90, 100, 76], [140, 130, 110]]); fr(g, tn(c, 0.62), px, sy - 2.4 - ph, pw, ph); fr(g, tn(c, 1.0, 0.5), px + pw * 0.6, sy - 2.4 - ph + 1, pw * 0.25, ph - 2); } px += pw + r.range(0.6, 3); }
  }
  fr(g, 'rgba(60,44,32,0.95)', x, y, 2.4, h); fr(g, 'rgba(60,44,32,0.95)', x + w - 2.4, y, 2.4, h);
}
// ====================================================================== sf_garage (14x8): Red Rocket mini-mart + service bay
function enamelWall(g, x, y, w, h, base, r, o) {   // 40px porcelain-enamel wall panels with seams, chips, rust at the bottom
  o = o || {}; const pf = R_(x, y, w, h), b = [x, y, w, h];
  g.fillStyle = tn(base, 1); g.fillRect(x, y, w, h);
  g.save(); g.beginPath(); pf(g); g.clip();
  const Q = o.q || 40;
  for (let yy = y; yy < y + h; yy += Q) for (let xx = x; xx < x + w; xx += Q) {
    const k = r.range(0.92, 1.06); g.fillStyle = 'rgba(' + (k > 1 ? '255,240,212,' + (k - 1) * 1.4 : '20,12,20,' + (1 - k) * 1.6) + ')'; g.fillRect(xx, yy, Q, Q);
    g.fillStyle = 'rgba(10,6,12,0.34)'; g.fillRect(xx, yy, Q, 1.2); g.fillRect(xx, yy, 1.2, Q); g.fillStyle = 'rgba(255,244,222,0.32)'; g.fillRect(xx + 1.2, yy + 1.2, Q - 1.2, 0.9); g.fillRect(xx + 1.2, yy + 1.2, 0.9, Q - 1.2);
    for (const [bx, by] of [[xx + 4, yy + 4], [xx + Q - 4, yy + 4], [xx + 4, yy + Q - 4], [xx + Q - 4, yy + Q - 4]]) rivet(g, bx, by, 0.9, [150, 146, 136]);
    if (r.next() < 0.05) { g.fillStyle = 'rgba(8,6,6,0.92)'; g.fillRect(xx + 1.2, yy + 1.2, Q - 1.2, Q - 1.2); g.strokeStyle = 'rgba(255,236,200,0.3)'; g.strokeRect(xx + 1.6, yy + 1.6, Q - 2, Q - 2); }   // panel gone
  }
  g.fillStyle = vg(g, y, y + h, [[0, 'rgba(255,238,205,0.2)'], [0.4, 'rgba(255,238,205,0)'], [1, 'rgba(12,8,20,0.42)']]); g.fillRect(x, y, w, h);
  over(g, 'chip', x, y, w, h, 0.45, r, 0.7); overFade(g, 'rust', x, y, w, h, 0.05, 0.85, r, 1.1); overFade(g, 'dirt', x, y, w, h, 0.3, 0.7, r, 1.5); overFade(g, 'streak', x, y, w, h, 0.4, 0.8, r, 1);
  g.restore();
}
def('garage', 14, 8, function (g, d, r, p) {
  const W = 560, H = 320, GY = 320;
  contact(g, 0, 560, GY, 0.4, 4);
  enamelWall(g, 0, 20, W, H - 20, [216, 208, 184], r);
  // teal wainscot along the bottom
  g.save(); g.beginPath(); g.rect(0, 262, W, 58); g.clip(); g.fillStyle = 'rgba(78,142,136,0.92)'; g.fillRect(0, 262, W, 58); g.fillStyle = vg(g, 262, 320, [[0, 'rgba(255,238,205,0.2)'], [1, 'rgba(10,6,16,0.5)']]); g.fillRect(0, 262, W, 58); for (let x = 0; x < W; x += 40) { g.fillStyle = 'rgba(10,6,12,0.34)'; g.fillRect(x, 262, 1.2, 58); g.fillStyle = 'rgba(255,244,222,0.28)'; g.fillRect(x + 1.2, 262, 0.9, 58); }
  overFade(g, 'rust', 0, 262, W, 58, 0.1, 0.95, r, 1); over(g, 'chip', 0, 262, W, 58, 0.5, r, 0.6); overFade(g, 'dirt', 0, 262, W, 58, 0.2, 0.7, r, 1.3); g.fillStyle = 'rgba(255,238,205,0.4)'; g.fillRect(0, 262, W, 1.4); g.restore();
  // ---- red sign band
  { const bp = R_(0, 28, W, 44, 0), bb = [0, 28, W, 44]; solid(g, bp, bb, [188, 50, 38], { top: 0.26, bot: 0.44, rim: false });
    within(g, bp, (q) => {
      q.fillStyle = 'rgba(244,232,206,0.92)'; q.fillRect(0, 31, W, 3); q.fillRect(0, 66, W, 3);
      txt(q, 'RED ROCKET', 284, 50.4, { size: 30, w: 274, fill: 'rgba(246,236,212,0.95)', family: F_SANS, style: 'bold italic', shadow: 'rgba(60,10,8,0.5)' });
      q.fillStyle = 'rgba(232,206,130,0.8)'; for (const sx of [34, 526]) { q.beginPath(); starPath(q, sx, 50, 14, 6); q.fill(); }
      txt(q, 'SERVICE', 96, 50.4, { size: 8, w: 44, fill: 'rgba(244,232,206,0.8)' }); txt(q, 'GROCERY', 466, 50.4, { size: 8, w: 48, fill: 'rgba(244,232,206,0.8)' });
      over(q, 'chip', 0, 28, W, 44, 0.85, r, 0.5); overFade(q, 'rust', 0, 28, W, 44, 0.2, 0.8, r, 0.9); overFade(q, 'dirt', 0, 28, W, 44, 0.15, 0.5, r, 1.2); for (let i = 0; i < 8; i++) hole(q, r.range(10, 550), r.range(34, 68), r.range(1.2, 2));
      for (let x = 60; x < W; x += 60) { q.fillStyle = 'rgba(10,6,12,0.3)'; q.fillRect(x, 28, 1.2, 44); }
    });
    rim(g, bp); edge(g, bp, 0.55, 1); }
  // ---- parapet with coping
  { const pp = R_(-2, 0, W + 4, 22, 1), pb = [-2, 0, W + 4, 22]; solid(g, pp, pb, [196, 188, 166], { top: 0.3, bot: 0.34 }); chromeRect(g, -4, 0, W + 8, 5, { r: null }); fr(g, 'rgba(255,240,208,0.5)', -4, 0, W + 8, 1.2);
    within(g, pp, (q) => { over(q, 'chip', -2, 0, W, 22, 0.45, r, 0.6); overFade(q, 'rust', -2, 5, W, 17, 0.2, 0.9, r, 0.9); overFade(q, 'dirt', -2, 5, W, 17, 0.2, 0.7, r, 1.2); for (let x = 30; x < W; x += 80) { q.fillStyle = 'rgba(10,6,12,0.3)'; q.fillRect(x, 5, 1.2, 17); } });
    // missing coping stretch
    fr(g, '#100c0a', 250, 0, 40, 5); for (let i = 0; i < 6; i++) fr(g, 'rgba(210,200,178,0.9)', 250 + i * 7, 0, 3, 2 + (i % 2) * 2); }
  // ---- mini-mart window: header, frame, mullions, smashed glass over dark shelves
  { const wx = 22, wy = 104, ww = 228, wh = 138;
    box(g, wx - 8, wy - 22, ww + 16, 18, [92, 98, 96], { edgeA: 0.55 }); txt(g, 'MINI-MART  •  ICE  •  SNACKS', wx + ww / 2, wy - 12.6, { size: 9, w: 178, fill: 'rgba(236,224,180,0.85)' }); over(g, 'chip', wx - 8, wy - 22, ww + 16, 18, 0.7, r, 0.5);
    g.fillStyle = 'rgba(6,3,8,0.4)'; g.fillRect(wx - 6 - 2 * LX, wy - 6 + 3, ww + 12, wh + 12);
    box(g, wx - 6, wy - 6, ww + 12, wh + 12, [102, 108, 106], { edgeA: 0.6, top: 0.24 });
    const cols = 3, pw = (ww - 8 * (cols - 1)) / cols;
    for (let c = 0; c < cols; c++) {
      const px = wx + c * (pw + 8), pane = [[px, wy], [px + pw, wy], [px + pw, wy + wh], [px, wy + wh]];
      glassPane(g, pane, r, { state: c === 1 ? 'cracked' : r.pick(['gone', 'shards']), inner: (q, b) => { fr(q, 'rgba(10,8,8,0.5)', b[0], b[1], b[2], b[3]); shelfUnit(q, b[0] + 6, b[1] + 22, b[2] - 12, b[3] - 40, r); fr(q, 'rgba(60,44,30,0.9)', b[0], b[1] + b[3] - 18, b[2], 18); } });
    }
    for (let c = 1; c < cols; c++) { const mx = wx + c * (pw + 8) - 8; box(g, mx, wy - 2, 8, wh + 4, [104, 110, 108], { edgeA: 0.6, top: 0.2 }); for (let y = wy + 8; y < wy + wh; y += 26) rivet(g, mx + 4, y, 1, [140, 136, 126]); }
    // posters taped on the glass
    poster(g, wx + 10, wy + 10, 34, 46, r, { kind: 'nuka' }); poster(g, wx + 86, wy + 16, 30, 40, r, { kind: 'sugar' }); poster(g, wx + 130, wy + 8, 36, 30, r, { kind: 'sale' }); poster(g, wx + 176, wy + 22, 32, 44, r, { kind: r.pick(['vault', 'wanted']) });
    txt(g, 'OPEN', wx + 108, wy + 86, { size: 12, w: 34, fill: 'rgba(190,52,40,0.7)', shadow: 'rgba(0,0,0,0.3)' });
    // sill + water stains
    const sill = R_(wx - 10, wy + wh + 6, ww + 20, 8, 1); solid(g, sill, [wx - 10, wy + wh + 6, ww + 20, 8], [150, 146, 136], { top: 0.3 }); chips(g, sill, [wx - 10, wy + wh + 6, ww + 20, 8], r, 10, ['rgba(60,56,52,0.8)'], 2);
    streaks(g, wx, wy + wh + 14, ww, 40, 14, r, [90, 60, 36], 0.28); }
  // ---- personnel door
  { const dx = 262, dy = 116, dw = 34, dh = 204; box(g, dx - 5, dy - 5, dw + 10, dh + 5, [104, 110, 108], { edgeA: 0.6 });
    const dp = [[dx, dy + 8], [dx + dw, dy + 8], [dx + dw, GY - 22], [dx, GY - 22]]; glassPane(g, [[dx + 4, dy + 12], [dx + dw - 4, dy + 12], [dx + dw - 4, dy + 110], [dx + 4, dy + 110]], r, { state: 'gone', inner: (q, b) => { fr(q, 'rgba(6,4,4,0.6)', b[0], b[1], b[2], b[3]); } });
    box(g, dx + 2, dy + 116, dw - 4, 76, [186, 190, 184], { edgeA: 0.55, top: 0.2 }); rustify(g, R_(dx + 2, dy + 116, dw - 4, 76), [dx + 2, dy + 116, dw - 4, 76], r, 0.9); chromeRect(g, dx + 6, dy + 108, dw - 12, 3.4, { r }); rivet(g, dx + dw - 8, dy + 150, 2.4, [200, 190, 160]); void dp;
    box(g, dx - 8, GY - 24, dw + 16, 6, [90, 86, 80], { edgeA: 0.5 }); }
  // ---- service bay: roll-up shutter half raised over a dark interior
  { const bx = 312, by = 96, bw = 214, bh = GY - by;
    g.fillStyle = 'rgba(6,3,8,0.4)'; g.fillRect(bx - 8 - 2 * LX, by - 10 + 3, bw + 16, bh + 10);
    // interior first (dark, with faint floor sheen), so the shutter and frame sit on top
    g.fillStyle = vg(g, by, GY, [[0, '#050403'], [0.55, '#0a0807'], [1, '#14100d']]); g.fillRect(bx, by, bw, bh);
    g.fillStyle = vg(g, GY - 26, GY, [[0, 'rgba(210,170,110,0)'], [1, 'rgba(210,170,110,0.06)']]); g.fillRect(bx, GY - 26, bw, 26);
    g.fillStyle = 'rgba(70,52,34,0.16)'; g.fillRect(bx, GY - 96, bw, 2);
    // frame + roller hood
    box(g, bx - 8, by - 12, bw + 16, 14, [122, 126, 122], { edgeA: 0.6, top: 0.26 }); txt(g, 'SERVICE BAY', bx + bw / 2, by - 4.6, { size: 8, w: 84, fill: 'rgba(240,228,190,0.8)' });
    box(g, bx - 8, by - 2, 8, bh + 2, [112, 116, 112], { edgeA: 0.6 }); box(g, bx + bw, by - 2, 8, bh + 2, [112, 116, 112], { edgeA: 0.6 });
    // slatted door, raised to about 40%, bottom bar dented
    const sh = 96, sp = R_(bx, by, bw, sh, 0), sb = [bx, by, bw, sh];
    tin(g, sp, sb, [186, 182, 168], 8, false); shade(g, sp, sb, { top: 0.2, bot: 0.35, left: 0.2, right: 0.1 });
    within(g, sp, (q) => { over(q, 'rust', bx, by, bw, sh, 0.85, r, 0.8); over(q, 'chip', bx, by, bw, sh, 0.55, r, 0.5); overFade(q, 'dirt', bx, by, bw, sh, 0.1, 0.7, r, 1.1); for (let i = 0; i < 6; i++) hole(q, r.range(bx + 6, bx + bw - 6), r.range(by + 8, by + sh - 8), r.range(1.2, 2.2)); dent(q, bx + 130, by + 42, 26, 10, 0.05); dent(q, bx + 60, by + 30, 18, 8, -0.1); for (let x = bx + 20; x < bx + bw; x += 52) { q.fillStyle = 'rgba(10,6,12,0.26)'; q.fillRect(x, by, 1.4, sh); } });
    rim(g, sp); edge(g, sp, 0.55, 1);
    const bar = R_(bx - 2, by + sh - 2, bw + 4, 9, 1); solid(g, bar, [bx - 2, by + sh - 2, bw + 4, 9], [110, 106, 100], { top: 0.3 }); rustify(g, bar, [bx - 2, by + sh - 2, bw + 4, 9], r, 0.9); box(g, bx + bw / 2 - 12, by + sh + 6, 24, 3, [70, 66, 62], { edgeA: 0.5 });
    ao(g, bx, by + sh + 7, bw, 18, 't', 0.6, 18);
    // hazard bollards either side of the bay
    for (const q0 of [bx - 26, bx + bw + 14]) { const pf = R_(q0, GY - 34, 12, 34, 5); solid(g, pf, [q0, GY - 34, 12, 34], [186, 154, 48], {}); within(g, pf, (q) => { q.fillStyle = 'rgba(24,20,16,0.85)'; q.fillRect(q0, GY - 26, 12, 6); q.fillRect(q0, GY - 12, 12, 6); q.fillStyle = 'rgba(255,240,200,0.3)'; q.fillRect(q0, GY - 34, 12, 1.4); }); chips(g, pf, [q0, GY - 34, 12, 34], r, 10, null, 2); rustify(g, pf, [q0, GY - 34, 12, 34], r, 0.5); } }
  // wall lamp, meter box, downspout
  box(g, 246, 100, 14, 18, [88, 84, 78], { r: 2, edgeA: 0.5 }); box(g, 540, 150, 14, 30, [104, 100, 92], { edgeA: 0.5 }); rivet(g, 547, 158, 1.4);
  { const dsx = 8; cylV(g, dsx, 22, 7, 296, [116, 116, 110]); overFade(g, 'rust', dsx, 22, 7, 296, 0.1, 0.9, r, 0.6); for (const y of [80, 170, 260]) box(g, dsx - 1.5, y, 10, 4, [88, 84, 78], { edgeA: 0.5 }); }
  ao(g, 0, 300, W, 20, 'b', 0.5, 16);
  heap(g, 0, 560, GY, 3, r);
});
// ====================================================================== brick masonry + shop fittings
const BRICKS = [{ b: [160, 74, 54], m: [178, 168, 150] }, { b: [128, 64, 50], m: [142, 132, 116] }, { b: [204, 174, 122], m: [212, 202, 178] }, { b: [122, 110, 102], m: [140, 132, 120] }];
const BT = {};
function brickTile(v) {   // 256x128 running-bond tile of 16x8 bricks, each with its own tone, bevel and pits
  if (BT[v]) return BT[v];
  const S = 256, H = 128, bw = 16, bh = 8, c = U.canvas(S, H), q = c.getContext('2d'), rr2 = U.RNG(900 + v), pal = BRICKS[v];
  q.fillStyle = rgb(pal.m); q.fillRect(0, 0, S, H);
  for (let row = 0; row < H / bh; row++) for (let i = -1; i <= S / bw; i++) {
    const x = i * bw + (row % 2 ? bw / 2 : 0), y = row * bh, k = rr2.range(0.78, 1.18), hue = rr2.range(-12, 12), col = [pal.b[0] * k + hue, pal.b[1] * k + hue * 0.3, pal.b[2] * k - hue * 0.2];
    for (const xx of [x, x - S]) {
      if (xx < -bw || xx > S) continue;
      q.fillStyle = rgb(col); q.fillRect(xx + 0.75, y + 0.75, bw - 1.5, bh - 1.5);
      q.fillStyle = 'rgba(255,240,212,0.24)'; q.fillRect(xx + 0.75, y + 0.75, bw - 1.5, 1); q.fillRect(xx + 0.75, y + 0.75, 1, bh - 1.5);
      q.fillStyle = 'rgba(10,6,12,0.3)'; q.fillRect(xx + 0.75, y + bh - 1.75, bw - 1.5, 1); q.fillRect(xx + bw - 1.75, y + 0.75, 1, bh - 1.5);
      if (rr2.next() < 0.3) { q.fillStyle = 'rgba(20,10,8,0.3)'; q.fillRect(xx + rr2.range(1, bw - 4), y + rr2.range(1, bh - 3), rr2.range(1, 4), rr2.range(1, 2.5)); }
      if (rr2.next() < 0.3) { q.fillStyle = 'rgba(255,236,208,0.16)'; q.fillRect(xx + rr2.range(1, bw - 4), y + rr2.range(1, bh - 3), rr2.range(1, 3), 1); }
      if (rr2.next() < 0.07) { q.fillStyle = 'rgba(0,0,0,0.32)'; q.fillRect(xx + 0.75, y + 0.75, bw - 1.5, bh - 1.5); }
    }
  }
  return (BT[v] = c);
}
function crackStep(g, x, y, len, r, dir) {   // crack that follows the mortar joints (stair-steps)
  const pts = [[x, y]]; let cx = x, cy = y;
  for (let d = 0; d < len;) { const vy = r.range(5, 10); cy += (dir === undefined ? 1 : dir) * vy; pts.push([cx, cy]); d += vy; if (r.next() < 0.7) { cx += r.pick([-8, 8, -16, 16]) * 0.5; pts.push([cx, cy]); } }
  g.save(); g.lineJoin = 'round'; g.strokeStyle = 'rgba(8,4,8,0.7)'; g.lineWidth = 1.4; g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); g.strokeStyle = 'rgba(255,238,208,0.25)'; g.lineWidth = 0.7; g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0] + LX, q[1] - 0.5) : g.moveTo(q[0] + LX, q[1] - 0.5))); g.stroke(); g.restore();
}
function brickWall(g, pf, b, v, r, o) {
  o = o || {}; const x = b[0], y = b[1], w = b[2], h = b[3], ox = 16 * r.int(0, 15), oy = 8 * r.int(0, 15);
  g.save(); g.beginPath(); pf(g); g.clip();
  g.save(); g.translate(ox, oy); g.fillStyle = g.createPattern(brickTile(v), 'repeat'); g.fillRect(x - ox, y - oy, w, h); g.restore();
  g.fillStyle = vg(g, y, y + h, [[0, 'rgba(255,238,205,' + (o.top === undefined ? 0.2 : o.top) + ')'], [0.4, 'rgba(255,238,205,0.02)'], [1, 'rgba(12,8,20,' + (o.bot === undefined ? 0.42 : o.bot) + ')']]); g.fillRect(x, y, w, h);
  g.fillStyle = hg(g, x, x + w, [[0, 'rgba(10,8,24,0.16)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(255,226,180,0.1)']]); g.fillRect(x, y, w, h);
  over(g, 'dirt', x, y, w, h, o.dirt === undefined ? 0.45 : o.dirt, r, 1.4); overFade(g, 'soot', x, y, w, h, o.soot === undefined ? 0.25 : o.soot, 0.05, r, 1.3); overFade(g, 'streak', x, y, w, h, 0.35, 0.7, r, 1);
  // salt bloom + mould near the base
  for (let i = 0; i < Math.round(w / 40); i++) { const px = x + r.next() * w, py = y + h - r.range(4, 70), rad = r.range(14, 40); g.fillStyle = rg(g, px, py, 0, rad, [[0, 'rgba(226,220,204,0.22)'], [1, 'rgba(226,220,204,0)']]); g.fillRect(px - rad, py - rad, rad * 2, rad * 2); }
  overFade(g, 'rust', x, y, w, h, 0, o.rust === undefined ? 0.3 : o.rust, r, 1.2);
  // spalled bricks: lost faces showing the darker core, stacked loose bricks
  for (let i = 0; i < (o.spall === undefined ? Math.round(w * h / 9000) : o.spall); i++) { const sx = x + 8 + r.next() * (w - 40), sy = y + 8 + r.next() * (h - 30), sw = 16 * r.int(1, 3), sh = 8 * r.int(1, 2); g.fillStyle = 'rgba(30,18,14,0.85)'; g.fillRect(sx, sy, sw, sh); g.fillStyle = 'rgba(255,236,200,0.28)'; g.fillRect(sx, sy + sh - 1, sw, 1); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(sx, sy, sw, 2); }
  for (let i = 0; i < (o.cracks === undefined ? Math.round(w / 90) : o.cracks); i++) crackStep(g, x + r.range(10, w - 10), y + r.range(0, h * 0.6), r.range(30, 90), r);
  g.restore();
}
function stoneBand(g, x, y, w, h, r, col) {   // limestone lintel / sill / cornice slab
  col = col || [188, 180, 160]; const pf = R_(x, y, w, h, 0.6), b = [x, y, w, h];
  solid(g, pf, b, col, { top: 0.32, bot: 0.4, grain: 0.9 }); within(g, pf, (q) => { over(q, 'dirt', x, y, w, h, 0.5, r, 1.2); overFade(q, 'soot', x, y, w, h, 0.35, 0.1, r, 1.2); for (let i = 0; i < Math.round(w / 60); i++) crackStep(q, x + r.range(4, w - 4), y, h, r); });
}
function blinds(g, x, y, w, h, r, col) {   // venetian blinds hanging crooked, slats bent or missing
  col = col || [204, 194, 160]; const tilt = r.range(-0.06, 0.06), drop = h * r.range(0.45, 0.95);
  g.save(); g.translate(x + w / 2, y); g.rotate(tilt * 0.4); g.translate(-w / 2, 0);
  fr(g, 'rgba(60,56,50,0.95)', -1, 0, w + 2, 3);
  for (let yy = 4; yy < drop; yy += 4.4) { if (r.next() < 0.12) { yy += 4.4; continue; } const bend = r.range(-1.6, 1.6); g.fillStyle = tn(col, r.range(0.82, 1.06)); g.beginPath(); g.moveTo(0, yy + bend * 0.5); g.lineTo(w, yy - bend * 0.5); g.lineTo(w, yy - bend * 0.5 + 2.6); g.lineTo(0, yy + bend * 0.5 + 2.6); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,246,222,0.4)'; g.fillRect(0, yy + bend * 0.5, w, 0.8); g.fillStyle = 'rgba(10,6,10,0.34)'; g.fillRect(0, yy + bend * 0.5 + 2.6, w, 1); }
  fr(g, 'rgba(60,56,50,0.95)', 0, drop, w, 3); ln(g, w * 0.2, 3, w * 0.2, drop, 'rgba(40,36,32,0.6)', 0.8); ln(g, w * 0.8, 3, w * 0.8, drop, 'rgba(40,36,32,0.6)', 0.8);
  overFade(g, 'dirt', 0, 0, w, drop + 3, 0.3, 0.7, r, 1.2); g.restore();
}
function curtains(g, x, y, w, h, r, col) {   // sun-rotted curtain panels gathered to the sides
  col = col || r.pick([[150, 64, 52], [88, 120, 112], [176, 150, 88]]); const cw = w * 0.34;
  for (const s of [0, 1]) {
    const px = s ? x + w - cw : x, len = h * r.range(0.6, 1.0);
    const pf = (q) => { q.moveTo(px, y); q.lineTo(px + cw, y); q.lineTo(px + cw - (s ? 0 : -4), y + len * 0.7); q.lineTo(px + cw * 0.6, y + len); q.lineTo(px + cw * 0.3, y + len * 0.86); q.lineTo(px + cw * 0.1, y + len * 0.98); q.lineTo(px, y + len * 0.8); q.closePath(); };
    g.fillStyle = tn(col, 0.9); g.beginPath(); pf(g); g.fill();
    g.save(); g.beginPath(); pf(g); g.clip(); for (let i = 0; i < 6; i++) { const fx = px + (i + 0.5) * cw / 6; g.fillStyle = hg(g, fx - cw / 12, fx + cw / 12, [[0, 'rgba(10,6,14,0.4)'], [0.5, 'rgba(255,236,200,0.16)'], [1, 'rgba(10,6,14,0.3)']]); g.fillRect(fx - cw / 12, y, cw / 6, len); }
    overFade(g, 'dirt', px, y, cw, len, 0.2, 0.8, r, 1.2); over(g, 'chip', px, y, cw, len, 0.4, r, 0.5); g.restore();
    ln(g, px + (s ? -1 : cw + 1), y + len * 0.42, px + (s ? cw * 0.5 : cw * 0.5), y + len * 0.42, 'rgba(210,190,120,0.9)', 1.4);
  }
}
function awning(g, x, y, w, r, c1, c2, o) {   // striped canvas awning: sloped top + scalloped valance, sun-rotted with a tear
  o = o || {}; const hs = o.hs || 28, hv = o.hv || 14, n = Math.round(w / 22), sw = w / n;
  // arms
  for (const ax of [x + 10, x + w - 10]) { ln(g, ax, y - 6, ax + (ax < x + w / 2 ? 6 : -6), y + hs + hv + 2, 'rgba(20,14,12,0.7)', 3.2); ln(g, ax, y - 6, ax + (ax < x + w / 2 ? 6 : -6), y + hs + hv + 2, 'rgb(96,90,84)', 1.6); }
  g.fillStyle = 'rgba(6,3,8,0.34)'; g.fillRect(x + 4 - 2 * LX, y + 3, w, hs + hv);
  for (let i = 0; i < n; i++) {
    const a = i / n, b2 = (i + 1) / n, top0 = x + 8 + a * (w - 16), top1 = x + 8 + b2 * (w - 16), bx0 = x + a * w, bx1 = x + b2 * w, col = i % 2 ? c2 : c1, torn = o.tear !== undefined && i >= o.tear && i < o.tear + 2;
    const sag = torn ? hs * 0.45 : 0, sc = [[top0, y], [top1, y], [bx1, y + hs - sag], [bx0, y + hs - sag]];
    g.fillStyle = tn(col, 1); g.beginPath(); poly(g, sc); g.fill();
    g.fillStyle = vg(g, y, y + hs, [[0, 'rgba(255,240,208,0.3)'], [1, 'rgba(10,6,14,0.24)']]); g.beginPath(); poly(g, sc); g.fill();
    // valance flap with scalloped hem
    if (!torn) { g.beginPath(); g.moveTo(bx0, y + hs); g.lineTo(bx1, y + hs); g.lineTo(bx1, y + hs + hv - sw / 2); g.arc((bx0 + bx1) / 2, y + hs + hv - sw / 2, sw / 2, 0, PI); g.closePath(); g.fillStyle = tn(col, 0.86); g.fill(); g.fillStyle = 'rgba(10,6,14,0.22)'; g.fill(); g.strokeStyle = 'rgba(20,12,12,0.4)'; g.lineWidth = 0.8; g.stroke(); }
    else { for (let k = 0; k < 3; k++) { const fx = bx0 + (k + 0.5) * sw / 3; g.strokeStyle = tn(col, 0.8); g.lineWidth = 1.4; g.beginPath(); g.moveTo(fx, y + hs - sag); g.lineTo(fx + r.range(-2, 2), y + hs + hv + r.range(0, 12)); g.stroke(); } }
  }
  g.save(); g.beginPath(); g.rect(x - 2, y, w + 4, hs + hv + 4); g.clip(); overFade(g, 'dirt', x, y, w, hs + hv, 0.4, 0.5, r, 1.2); over(g, 'chip', x, y, w, hs + hv, 0.35, r, 0.6); for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(40,52,30,0.3)'; g.beginPath(); g.ellipse(x + r.next() * w, y + r.next() * (hs + hv), r.range(3, 9), r.range(2, 5), 0, 0, TAU); g.fill(); } g.restore();
  g.strokeStyle = 'rgba(255,240,208,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 8, y + 0.6); g.lineTo(x + w - 8, y + 0.6); g.stroke();
}
// ====================================================================== sf_shopfront (12x13): two-storey brick main-street building
function sashWindow(g, x, y, w, h, r, o) {   // double-hung wooden window in a stone surround
  o = o || {}; const fw = 4;
  stoneBand(g, x - 9, y - 11, w + 18, 10, r); stoneBand(g, x - 6, y + h, w + 12, 7, r);
  fr(g, 'rgba(6,3,8,0.7)', x - 2, y - 2, w + 4, h + 4);
  const fpf = R_(x, y, w, h, 1); solid(g, fpf, [x, y, w, h], o.frame || [206, 200, 176], { top: 0.2, bot: 0.3, edge: true, rim: true });
  within(g, fpf, (q) => { over(q, 'chip', x, y, w, h, 0.85, r, 0.5); overFade(q, 'rust', x, y, w, h, 0, 0.3, r, 1); overFade(q, 'dirt', x, y, w, h, 0.3, 0.6, r, 1.2); });
  const ph = (h - fw * 3) / 2;
  [[y + fw, 0], [y + fw * 2 + ph, 1]].forEach(([py, idx]) => {
    const pane = [[x + fw, py], [x + w - fw, py], [x + w - fw, py + ph], [x + fw, py + ph]];
    glassPane(g, pane, r, { state: idx === 0 && o.dress === 'blinds' ? 'gone' : r.pick(['gone', 'shards', 'cracked']), top: '#1c2226', inner: (q, b) => {
      if (o.dress === 'blinds' && idx === 0) blinds(q, b[0], b[1], b[2], b[3], r);
      else if (o.dress === 'curtain') curtains(q, b[0], b[1], b[2], b[3] * (idx ? 0.6 : 1), r, o.ccol);
      else if (o.dress === 'lamp' && idx === 0) { ln(q, b[0] + b[2] / 2, b[1], b[0] + b[2] / 2, b[1] + 12, 'rgba(60,50,40,0.8)', 1); ell(q, b[0] + b[2] / 2, b[1] + 15, 6, 4, 'rgba(120,96,60,0.55)'); }
    } });
  });
  box(g, x - 2, y + fw + ph - 0.5, w + 4, fw * 0.9, o.frame || [206, 200, 176], { edgeA: 0.55, top: 0.2 });
  streaks(g, x - 4, y + h + 7, w + 8, 34, Math.round(w / 12), r, [40, 30, 22], 0.3);
}
function shopWindow(g, x, y, w, h, r, o) {   // storefront display window: painted frame, big smashed panes, dusty goods, taped flyers
  o = o || {}; const fc = o.frame || [52, 92, 86];
  fr(g, 'rgba(6,3,8,0.6)', x - 3, y - 3, w + 6, h + 6);
  box(g, x - 6, y - 6, w + 12, h + 12, fc, { edgeA: 0.6, top: 0.24, bot: 0.4 }); over(g, 'chip', x - 6, y - 6, w + 12, h + 12, 0.7, r, 0.5);
  const n = o.panes || 2, pw = (w - (n - 1) * 6) / n;
  for (let i = 0; i < n; i++) {
    const px = x + i * (pw + 6), pane = [[px, y], [px + pw, y], [px + pw, y + h], [px, y + h]];
    glassPane(g, pane, r, { state: r.pick(['gone', 'cracked', 'shards']), top: '#20262a', inner: (q, b) => { fr(q, 'rgba(6,4,4,0.5)', b[0], b[1], b[2], b[3]); if (o.shelves !== false) shelfUnit(q, b[0] + 8, b[1] + 26, b[2] - 16, b[3] - 40, r); if (o.dress === 'curtain') curtains(q, b[0], b[1], b[2], b[3] * 0.5, r, o.ccol); fr(q, 'rgba(70,50,34,0.9)', b[0], b[1] + b[3] - 16, b[2], 16); } });
    if (i) box(g, px - 6, y - 2, 6, h + 4, fc, { edgeA: 0.6, top: 0.2 });
  }
  return { x, y, w, h };
}
def('shopfront', 12, 13, function (g, d, r, p) {
  const W = d.w, H = d.h, GY = H, v = p.brick === undefined ? r.int(0, 3) : cl(p.brick | 0, 0, 3), ruin = cl(p.ruin === undefined ? 0 : +p.ruin, 0, 1), sign = String(p.sign || 'GENERAL STORE').toUpperCase();
  const topY = 44, yPl = H - 24, yBulk = H - 80, yWin = H - 190, yDoor = H - 172, yAwn = H - 240, ySign = H - 278, ySc = H - 286;
  contact(g, 0, W, GY, 0.45, 4);
  // ---- silhouette with crumbling top corners (brick-course steps)
  const prof = [], nb = Math.ceil(W / 16), sideFirst = r.next() < 0.5 ? -1 : 1;
  const Lw = (ruin > 0.33 || sideFirst < 0) && ruin > 0.02 ? ruin * r.range(90, 190) : 0, Rw = (ruin > 0.33 || sideFirst > 0) && ruin > 0.02 ? ruin * r.range(90, 190) : 0, LD = ruin * r.range(70, 170), RD = ruin * r.range(70, 170);
  for (let i = 0; i < nb; i++) {
    const x = i * 16; let y = topY;
    if (Lw > 0 && x < Lw) y += LD * Math.pow(1 - x / Lw, 0.9);
    if (Rw > 0 && x > W - Rw) y += RD * Math.pow(1 - (W - x) / Rw, 0.9);
    if (y > topY) y = Math.round((y + r.range(-10, 10)) / 8) * 8;
    prof.push(Math.max(topY, y));
  }
  const wallPts = [[0, GY]]; prof.forEach((y, i) => { wallPts.push([i * 16, y]); wallPts.push([Math.min(W, i * 16 + 16), y]); }); wallPts.push([W, GY]);
  const wpf = P_(wallPts), wb = [0, topY, W, GY - topY];
  const topAt = (x) => prof[Math.min(prof.length - 1, Math.max(0, Math.floor(x / 16)))];
  // chimney (only if the roof is still whole at its position)
  const chx = Math.round(W * 0.76 / 16) * 16;
  if (topAt(chx + 18) <= topY + 2) { const cp = R_(chx, 2, 40, topY + 8, 0); brickWall(g, cp, [chx, 2, 40, topY + 8], v, r, { top: 0.3, cracks: 1, spall: 0 }); stoneBand(g, chx - 4, 0, 48, 8, r); rim(g, cp); edge(g, cp, 0.55); fr(g, '#100c0a', chx + 6, 1, 28, 5); }
  // ---- the wall
  brickWall(g, wpf, wb, v, r, { soot: 0.35, rust: 0.28 });
  g.save(); g.beginPath(); wpf(g); g.clip();
  // plinth
  stoneBand(g, 0, yPl, W, 24, r, [120, 116, 106]); for (let x = 60; x < W; x += 90) { g.fillStyle = 'rgba(8,4,10,0.35)'; g.fillRect(x, yPl, 1.4, 24); }
  // parapet: raised brick panels + cornice with dentils
  for (let x = 24; x < W - 24; x += 96) { const pw = Math.min(80, W - 24 - x); g.strokeStyle = 'rgba(8,4,10,0.5)'; g.lineWidth = 1.4; g.strokeRect(x, topY + 6, pw, 16); g.strokeStyle = 'rgba(255,236,200,0.3)'; g.strokeRect(x + 1.4 * LX, topY + 4.6, pw, 16); }
  stoneBand(g, 0, topY - 2, W, 6, r, [196, 188, 168]);
  stoneBand(g, 0, 70, W, 8, r); { const cs = R_(0, 78, W, 16, 0); solid(g, cs, [0, 78, W, 16], [184, 176, 156], { top: 0.3, bot: 0.4 }); for (let x = 4; x < W; x += 14) { g.fillStyle = 'rgba(8,4,10,0.45)'; g.fillRect(x, 84, 8, 10); g.fillStyle = 'rgba(255,238,205,0.35)'; g.fillRect(x + 1.2 * LX, 84, 7, 1); } within(g, cs, (q) => { over(q, 'dirt', 0, 78, W, 16, 0.5, r, 1); overFade(q, 'soot', 0, 78, W, 16, 0.4, 0.1, r, 1); }); }
  stoneBand(g, 0, 94, W, 6, r, [172, 164, 146]);
  // ghost advertisement painted on the brick, mostly gone
  g.save(); g.globalAlpha = 0.34; txt(g, 'NUKA-COLA', W * 0.5, 130, { size: 26, w: 200, fill: 'rgba(230,214,180,0.9)', style: 'bold italic' }); g.globalAlpha = 0.24; txt(g, 'DRINK ME COLD', W * 0.5, 158, { size: 12, w: 130, fill: 'rgba(230,214,180,0.9)' }); g.restore();
  overFade(g, 'chip', 60, 104, W - 120, 70, 0.9, 0.9, r, 0.4);
  // upper windows
  const n2 = Math.max(2, Math.round(W / 150)), wh2 = ySc - 118 - 22, dresses = [r.pick(['blinds', 'curtain']), r.pick(['curtain', 'lamp', 'blinds']), r.pick(['blinds', 'curtain', 'lamp'])];
  for (let i = 0; i < n2; i++) { const cx = (i + 0.5) * W / n2; sashWindow(g, cx - 32, 118 + (i % 2) * 0, 64, wh2, r, { dress: dresses[i % 3], frame: r.pick([[206, 200, 176], [176, 196, 190], [212, 196, 150]]) }); }
  stoneBand(g, 0, ySc, W, 8, r, [184, 176, 156]);
  // ---- sign board
  { const bp = R_(20, ySign, W - 40, 36, 1), bb2 = [20, ySign, W - 40, 36]; solid(g, bp, bb2, [42, 76, 64], { top: 0.22, bot: 0.4 });
    within(g, bp, (q) => { q.strokeStyle = 'rgba(226,200,120,0.75)'; q.lineWidth = 1.4; q.strokeRect(25, ySign + 4, W - 50, 28); txt(q, sign, W / 2, ySign + 19, { size: 20, w: Math.min(W - 100, sign.length * 20), fill: 'rgba(230,208,132,0.95)', family: F_SERIF, ls: 2, shadow: 'rgba(0,0,0,0.5)' }); over(q, 'chip', 20, ySign, W - 40, 36, 0.9, r, 0.4); overFade(q, 'rust', 20, ySign, W - 40, 36, 0.2, 0.7, r, 1); overFade(q, 'dirt', 20, ySign, W - 40, 36, 0.3, 0.5, r, 1.2); });
    rim(g, bp); edge(g, bp, 0.55, 1); for (const sx of [30, W - 30]) rivet(g, sx, ySign + 18, 2, [150, 140, 120]); }
  // ---- storefront
  const corner = 28, dw = 88, pw = 24, ww = (W - corner * 2 - dw - pw * 2) / 2, wx0 = corner + 4, wx1 = corner + ww + pw + dw + pw - 4 + 4;
  fr(g, 'rgba(8,5,6,0.9)', corner, yAwn + 20, W - corner * 2, yPl - yAwn - 20);
  const lw = shopWindow(g, corner + 4, yWin, ww - 8, yBulk - yWin, r, { dress: r.pick(['curtain', null]) });
  const rw = shopWindow(g, corner + ww + pw * 2 + dw + 4, yWin, ww - 8, yBulk - yWin, r, { dress: r.pick(['curtain', null]) });
  void wx0; void wx1;
  // posters taped inside the glass
  poster(g, lw.x + 12, lw.y + 14, 30, 40, r); poster(g, lw.x + lw.w - 46, lw.y + 30, 32, 26, r); poster(g, rw.x + 16, rw.y + 24, 28, 38, r); poster(g, rw.x + rw.w - 44, rw.y + 12, 30, 42, r);
  // bulkheads (glossy dark tile, cracked)
  for (const bx of [corner + 4, corner + ww + pw * 2 + dw + 4]) { const bp = R_(bx - 6, yBulk + 6, ww - 8 + 12, yPl - yBulk - 6, 0); solid(g, bp, [bx - 6, yBulk + 6, ww + 4, yPl - yBulk - 6], [46, 62, 60], { top: 0.3, bot: 0.4 }); within(g, bp, (q) => { for (let x = bx - 6; x < bx + ww; x += 24) { q.fillStyle = 'rgba(0,0,0,0.4)'; q.fillRect(x, yBulk + 6, 1.4, 70); q.fillStyle = 'rgba(255,255,255,0.14)'; q.fillRect(x + 1.4, yBulk + 6, 0.8, 70); } q.fillStyle = 'rgba(255,255,255,0.1)'; q.fillRect(bx - 6, yBulk + 30, ww + 4, 1.4); crackStep(q, bx + r.range(0, ww - 30), yBulk + 8, 40, r); overFade(q, 'rust', bx - 6, yBulk, ww + 4, 80, 0.1, 0.8, r, 1); overFade(q, 'dirt', bx - 6, yBulk, ww + 4, 80, 0.2, 0.7, r, 1); }); }
  // door: recessed entry, cast-iron pilasters
  { const dx = corner + ww + pw, dyy = yDoor;
    fr(g, '#0a0706', dx, dyy - 6, dw, yPl - dyy + 6); g.fillStyle = vg(g, dyy - 6, yPl, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(dx, dyy - 6, dw, yPl - dyy);
    const leaf = [[dx + 12, dyy + 14], [dx + dw - 12, dyy + 14], [dx + dw - 12, yPl - 2], [dx + 12, yPl - 2]];
    box(g, dx + 10, dyy + 12, dw - 20, yPl - dyy - 12, [70, 108, 98], { edgeA: 0.6, top: 0.24 }); over(g, 'chip', dx + 10, dyy + 12, dw - 20, yPl - dyy - 12, 0.8, r, 0.5);
    glassPane(g, [[dx + 18, dyy + 22], [dx + dw - 18, dyy + 22], [dx + dw - 18, dyy + 96], [dx + 18, dyy + 96]], r, { state: 'gone', inner: (q, b) => fr(q, 'rgba(8,5,5,0.7)', b[0], b[1], b[2], b[3]) });
    box(g, dx + 16, dyy + 104, dw - 32, yPl - dyy - 112, [82, 118, 108], { edgeA: 0.5, top: 0.18 }); chromeRect(g, dx + dw - 22, dyy + 110, 3, 26, { r }); chromeRect(g, dx + 18, dyy + 100, dw - 36, 3, { r }); rustify(g, R_(dx + 10, dyy + 100, dw - 20, yPl - dyy - 100), [dx + 10, dyy + 100, dw - 20, yPl - dyy - 100], r, 0.8); void leaf;
    // transom
    glassPane(g, [[dx + 8, dyy - 34], [dx + dw - 8, dyy - 34], [dx + dw - 8, dyy - 8], [dx + 8, dyy - 8]], r, { state: 'gone' });
    // hanging CLOSED sign
    g.save(); g.translate(dx + dw / 2, dyy + 30); g.rotate(0.05); ln(g, -8, -2, -8, 6, 'rgba(30,24,20,0.8)', 0.8); ln(g, 8, -2, 8, 6, 'rgba(30,24,20,0.8)', 0.8); box(g, -14, 6, 28, 13, [200, 186, 140], { r: 1.5, edgeA: 0.6 }); txt(g, 'CLOSED', 0, 12.6, { size: 8, w: 22, fill: 'rgba(160,40,34,0.9)' }); g.restore(); }
  for (const px of [corner, corner + ww + pw * 2 + dw, corner + ww, W - corner - ww - pw]) { if (px < 0) continue; }
  for (const px of [corner + ww, corner + ww + pw + dw]) { const pp = R_(px, yAwn + 22, pw, yPl - yAwn - 22, 1); solid(g, pp, [px, yAwn + 22, pw, yPl - yAwn - 22], [72, 68, 62], { top: 0.3, bot: 0.4 }); for (let y = yAwn + 40; y < yPl; y += 40) { g.fillStyle = 'rgba(10,6,12,0.4)'; g.fillRect(px, y, pw, 1.4); rivet(g, px + 4, y + 6, 1, [130, 124, 112]); rivet(g, px + pw - 4, y + 6, 1, [130, 124, 112]); } rustify(g, pp, [px, yAwn + 22, pw, yPl - yAwn - 22], r, 0.8); }
  // awning over the shop windows
  awning(g, corner + 2, yAwn, W - corner * 2 - 4, r, r.pick([[184, 64, 50], [70, 128, 122], [200, 156, 60]]), [226, 218, 194], { tear: r.int(3, Math.max(4, Math.round((W - 56) / 22) - 4)) });
  g.restore();
  // ---- crumbled edge: exposed rebar, hollow floor slabs, loose bricks
  if (ruin > 0.02) {
    const edgeSteps = []; for (let i = 1; i < prof.length; i++) if (prof[i] !== prof[i - 1] || prof[i] > topY) edgeSteps.push(i);
    for (let k = 0; k < Math.round(3 + ruin * 6); k++) { const i = edgeSteps.length ? r.pick(edgeSteps) : 1, rx = i * 16 + r.range(2, 12), ry = prof[Math.min(prof.length - 1, i)] - 1, L = r.range(12, 26), a = -PI / 2 + r.range(-0.7, 0.7); g.save(); g.lineCap = 'round'; g.strokeStyle = 'rgba(8,4,6,0.7)'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(rx, ry + 3); g.quadraticCurveTo(rx + Math.cos(a) * L * 0.5 + r.range(-4, 4), ry + Math.sin(a) * L * 0.5, rx + Math.cos(a) * L, ry + Math.sin(a) * L); g.stroke(); g.strokeStyle = 'rgb(' + r.pick(['138,74,40', '110,58,32', '160,88,46']) + ')'; g.lineWidth = 2; g.stroke(); g.restore(); }
    // outline the broken profile with a lit top edge + dark under-edge
    g.save(); g.beginPath(); wpf(g); g.clip(); g.lineJoin = 'miter'; g.strokeStyle = 'rgba(255,238,200,0.45)'; g.lineWidth = 2; g.translate(-1 * LX, 1.4); g.beginPath(); wallPts.forEach((q, i) => { if (i > 0 && i < wallPts.length - 1) { if (i === 1) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]); } }); g.stroke(); g.restore();
    // a breach through the second-floor wall, dark room beyond
    if (ruin > 0.45) {
      const bx = r.range(40, W - 130), by = r.range(112, 150), pts = []; const R0 = r.range(30, 44);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, rad = R0 * r.range(0.7, 1.15); pts.push([bx + 40 + Math.cos(a) * rad * 1.3, by + 34 + Math.sin(a) * rad * 0.95]); }
      const hp = P_(pts), hb = bbox(pts);
      g.save(); g.beginPath(); hp(g); g.fillStyle = vg(g, hb[1], hb[1] + hb[3], [[0, '#0c0a09'], [1, '#1a1512']]); g.fill(); g.clip(); fr(g, 'rgba(120,96,64,0.5)', hb[0] + 4, hb[1] + hb[3] * 0.5, 10, hb[3]); for (let i = 0; i < 4; i++) fr(g, 'rgba(120,84,50,0.7)', hb[0] + 8 + i * 22, hb[1] + hb[3] - 14 - i * 2, 16, 4); g.restore();
      g.save(); g.beginPath(); hp(g); g.clip(); g.strokeStyle = 'rgba(8,4,6,0.7)'; g.lineWidth = 5; g.beginPath(); hp(g); g.stroke(); g.restore(); rim(g, hp, { w: 1.6 });
      for (let i = 0; i < 4; i++) { const t = r.pick(pts); g.strokeStyle = 'rgba(8,4,6,0.6)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(t[0], t[1]); g.lineTo(t[0] + r.range(-14, 14), t[1] + r.range(-12, 12)); g.stroke(); g.strokeStyle = 'rgb(130,70,38)'; g.lineWidth = 1.8; g.stroke(); }
    }
  }
  rim(g, wpf, { w: 1.3 }); edge(g, wpf, 0.5, 1);
  // loose bricks and rubble at the foot
  const nR = 3 + Math.round(ruin * 8);
  for (let i = 0; i < nR; i++) { const bx2 = r.range(30, W - 30); rock(g, bx2, GY - r.range(0, 2), r.range(10, 22 + ruin * 26), r.range(6, 12 + ruin * 14), r, r.pick([[BRICKS[v].b[0], BRICKS[v].b[1], BRICKS[v].b[2]], [124, 118, 108]]), { rebar: r.next() < 0.15 * ruin }); }
  heap(g, 0, W, GY, 3, r);
}, { free: true });
// ====================================================================== small props (crates, drums, tyres, sandbags, dumpster, hydrant, mailbox, bench, rubble, scrub, boulder, bones, campfire)
def('crates', 2.5, 1.6, function (g, d, r) {
  const H = d.h; contact(g, 0, d.w, H, 0.5, 4);
  crateBox(g, 4, H - 30, 44, 30, r); crateBox(g, 52, H - 27, 42, 27, r); crateBox(g, 12, H - 58, 40, 28, r, { text: false });
});
def('barrels', 2.5, 1.6, function (g, d, r) {
  const H = d.h; contact(g, 0, d.w, H, 0.45, 4);
  drum(g, 6, H, 26, 40, r); drum(g, 34, H, 26, 42, r, { rad: r.next() < 0.3 }); drum(g, 64, H - 1, 26, 38, r);
});
def('tires', 2, 1.2, function (g, d, r) {
  const H = d.h;
  const stack = (cx, n, rx) => {
    contact(g, cx - rx - 2, rx * 2 + 4, H, 0.55, 4);
    for (let i = 0; i < n; i++) {
      const y = H - 7 - i * 9.5, sx = (i % 2 ? 2 : -1) * LX;
      ell(g, cx + sx, y + 1.6, rx, 7.4, '#0a0908');
      g.fillStyle = vg(g, y - 8, y + 8, [[0, '#514b48'], [0.5, '#262322'], [1, '#100e0d']]); g.beginPath(); g.ellipse(cx + sx, y, rx, 7.4, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,224,178,0.3)'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx + sx, y - 0.4, rx - 0.8, 6.6, 0, PI * 1.05, PI * 1.85); g.stroke();
      ell(g, cx + sx, y - 0.6, rx * 0.5, 3.1, '#07060a'); ell(g, cx + sx, y - 1.2, rx * 0.44, 2.4, 'rgba(60,54,50,0.5)');
      for (let k = 0; k < 6; k++) { const a = r.next() * TAU; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(cx + sx + Math.cos(a) * rx * 0.86, y + Math.sin(a) * 6, 1.2, 2); }
    }
  };
  stack(24, 4, 17); stack(58, 3, 16); heap(g, 2, 78, H, 3, r);
});
def('sandbags', 3, 1.4, function (g, d, r) {
  const H = d.h; contact(g, 0, d.w, H, 0.5, 4);
  const bag = (x, y, w, h) => {
    const pf = (q) => { q.moveTo(x + 2, y + h); q.quadraticCurveTo(x - 2, y + h * 0.5, x + 4, y + 2); q.quadraticCurveTo(x + w / 2, y - 3, x + w - 4, y + 2); q.quadraticCurveTo(x + w + 2, y + h * 0.5, x + w - 2, y + h); q.closePath(); };
    solid(g, pf, [x - 2, y - 3, w + 4, h + 3], r.pick([[152, 132, 98], [136, 120, 88], [168, 148, 108], [120, 108, 82]]), { top: 0.28, bot: 0.4, grain: 1 });
    within(g, pf, (q) => { over(q, 'dirt', x, y, w, h, 0.4, r, 0.8); for (let i = 0; i < 4; i++) { q.strokeStyle = 'rgba(40,30,20,0.28)'; q.lineWidth = 0.6; q.beginPath(); q.moveTo(x + 4, y + r.range(3, h - 2)); q.lineTo(x + w - 4, y + r.range(3, h - 2)); q.stroke(); } });
    ln(g, x + w * 0.35, y + 2, x + w * 0.65, y + 2.5, 'rgba(30,22,14,0.6)', 1.2);
  };
  for (const xx of [2, 30, 58, 86]) bag(xx, H - 13, 27, 13);
  for (const xx of [16, 44, 72]) bag(xx, H - 25, 27, 13);
  for (const xx of [30, 58]) bag(xx, H - 37, 27, 13);
});
def('dumpster', 3, 2, function (g, d, r, p) {
  const W = d.w, H = d.h; contact(g, 4, W - 8, H, 0.55, 4);
  const col = r.pick([[62, 96, 72], [74, 84, 92], [116, 66, 48]]);
  for (const wx of [18, W - 18]) { circ(g, wx, H - 5, 6, '#0d0c0c'); circ(g, wx, H - 5, 2.4, '#4a4642'); }
  const body = [[6, 26], [W - 6, 26], [W - 12, H - 8], [12, H - 8]];
  weathered(g, P_(body), bbox(body), col, r, { rust: 0.7, holes: 2, dents: 3, bias: 1.2 });
  for (let x = 26; x < W - 20; x += 22) { ln(g, x, 30, x - 2, H - 12, 'rgba(8,6,10,0.4)', 1.4); ln(g, x + 1.2, 30, x - 0.8, H - 12, 'rgba(255,236,200,0.18)', 0.8); }
  box(g, 4, 20, W - 8, 8, tnA(col, 0.9), { r: 1.2 });
  const lid = [[8, 20], [W - 8, 20], [W - 4, 6], [12, 4]]; weathered(g, P_(lid), bbox(lid), col, r, { rust: 0.5, dents: 1 });
  txt(g, p.text || 'CINDER RIDGE', W / 2, 52, { size: 9, w: 70, fill: 'rgba(238,230,200,0.7)' });
});
def('hydrant', 1, 1, function (g, d, r) {
  const H = d.h, cx = d.w / 2, col = [176, 50, 40]; contact(g, cx - 12, 24, H, 0.5, 3);
  box(g, cx - 8, H - 9, 16, 9, col, { r: 1 });
  const body = R_(cx - 6, H - 30, 12, 24, 5); solid(g, body, [cx - 6, H - 30, 12, 24], col, {});
  box(g, cx - 10, H - 22, 20, 6, col, { r: 2 }); circ(g, cx - 10, H - 19, 3, [150, 40, 34]); circ(g, cx + 10, H - 19, 3, [150, 40, 34]);
  g.beginPath(); g.arc(cx, H - 30, 6.5, PI, TAU); g.closePath(); g.fillStyle = tn(col, 0.95); g.fill(); rim(g, (q) => { q.arc(cx, H - 30, 6.5, PI, TAU); q.closePath(); });
  circ(g, cx, H - 37, 2.2, [120, 118, 112]);
  rustify(g, body, [cx - 6, H - 30, 12, 24], r, 0.5); chips(g, body, [cx - 6, H - 30, 12, 24], r, 8, null, 1.6);
});
def('mailbox', 1, 1.2, function (g, d, r) {
  const H = d.h, cx = 20; contact(g, 8, 24, H, 0.45, 3);
  plank(g, cx - 2.2, H - 30, 4.4, 30, [96, 72, 48], r, { nails: false });
  const bx = R_(cx - 10, 4, 20, 14, 5); weathered(g, bx, [cx - 10, 4, 20, 14], [64, 86, 110], r, { rust: 0.6 });
  fr(g, '#a02c24', cx + 8, 0, 2.4, 9); fr(g, '#a02c24', cx + 5, 0, 6, 3);
});
def('bench', 2.5, 1.2, function (g, d, r) {
  const W = d.w, H = d.h; contact(g, 6, W - 12, H, 0.5, 3);
  for (const lx of [14, W - 18]) { cylV(g, lx, H - 22, 4, 22, [70, 72, 72]); ln(g, lx + 2, H - 22, lx + 2, H - 44, 'rgba(60,62,62,1)', 3.6); }
  for (let i = 0; i < 3; i++) plank(g, 8, H - 25 + i * 5.5, W - 16, 4.6, [110 - i * 4, 84 - i * 3, 56], r, { nails: false });
  for (let i = 0; i < 3; i++) plank(g, 8, H - 45 + i * 6, W - 16, 4.8, [104, 80, 54], r, { nails: false, knots: r.next() < 0.5 });
});
def('rubble', 4, 1.5, function (g, d, r) {
  const W = d.w, H = d.h; heap(g, 0, W, H, 9, r);
  for (let i = 0; i < 6; i++) rock(g, r.range(14, W - 14), H, r.range(16, 34), r.range(8, 17), r, r.pick([[150, 146, 138], [130, 126, 120], [168, 130, 104]]), { rebar: r.next() < 0.4 });
});
def('scrub', 2.5, 1.2, function (g, d, r) {
  const H = d.h, cx = d.w / 2; contact(g, cx - 30, 60, H, 0.3, 3); g.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    let ang = -PI / 2 + r.range(-1.3, 1.3), x = cx + r.range(-8, 8), y = H - 1; const len = r.range(16, 38), w = r.range(0.8, 1.9), col = r.next() < 0.5 ? 'rgb(86,68,46)' : 'rgb(118,96,62)';
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 4; s++) { ang += r.range(-0.4, 0.4); x += Math.cos(ang) * len / 4; y += Math.sin(ang) * len / 4; g.lineTo(x, y); if (r.next() < 0.5) { g.moveTo(x, y); g.lineTo(x + r.range(-7, 7), y - r.range(3, 8)); g.moveTo(x, y); } }
    g.stroke(); g.strokeStyle = 'rgba(255,232,190,0.25)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(cx + 1, H - 1); g.lineTo(x + 1, y); g.stroke();
  }
});
def('boulder', 3, 2, function (g, d, r) {
  rock(g, d.w * 0.4, d.h, d.w * 0.66, d.h * 0.92, r, [128, 118, 104], {}); rock(g, d.w * 0.74, d.h, d.w * 0.42, d.h * 0.6, r, [140, 128, 112], {});
});
def('skeleton', 2, 1, function (g, d, r) {
  const H = d.h; contact(g, 6, 68, H, 0.3, 3);
  for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgb(206,196,170)'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(26 + i * 6, H - 7); g.quadraticCurveTo(28 + i * 6, H - 20, 38 + i * 6, H - 9); g.stroke(); }
  ln(g, 12, H - 5, 40, H - 3, 'rgb(214,204,178)', 3); ln(g, 44, H - 4, 76, H - 6, 'rgb(206,196,170)', 3);
  circ(g, 10, H - 9, 7, 'rgb(220,210,184)'); circ(g, 8, H - 10, 1.8, '#1a1210'); circ(g, 13, H - 10, 1.8, '#1a1210'); fr(g, 'rgba(30,20,14,0.9)', 8, H - 5, 5, 1.6);
  g.fillStyle = 'rgba(86,60,44,0.85)'; g.beginPath(); g.moveTo(28, H - 4); g.quadraticCurveTo(46, H - 14, 62, H - 3); g.lineTo(28, H - 1); g.fill();
});
def('campfire', 1.6, 1.2, function (g, d, r) {
  const H = d.h, cx = d.w / 2; contact(g, cx - 26, 52, H, 0.4, 4);
  ell(g, cx, H - 4, 26, 7, 'rgba(30,24,20,0.9)');
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, x = cx + Math.cos(a) * 24, y = H - 4 + Math.sin(a) * 6; rock(g, x, y + 3, 11, 8, r, [118, 110, 100], {}); }
  for (let i = 0; i < 3; i++) { g.save(); g.translate(cx, H - 8); g.rotate(-0.6 + i * 0.6); g.fillStyle = '#231a14'; g.fillRect(-16, -2.6, 32, 5.2); g.fillStyle = 'rgba(255,120,40,0.35)'; g.fillRect(-16, -2.6, 32, 1.4); g.restore(); }
});
def('sign_road', 2, 3, function (g, d, r, p) {
  const W = d.w, H = d.h, cx = W / 2, text = String(p.text || 'STOP').toUpperCase(); contact(g, cx - 10, 20, H, 0.45, 3);
  cylV(g, cx - 2.4, 44, 4.8, H - 44, [110, 112, 112]);
  if (text === 'STOP') {
    const R0 = 26, pts = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + TAU / 16; pts.push([cx + Math.cos(a) * R0, 30 + Math.sin(a) * R0]); }
    weathered(g, P_(pts), bbox(pts), [170, 46, 38], r, { rust: 0.5, holes: 3, dents: 1 });
    g.strokeStyle = 'rgba(240,232,216,0.85)'; g.lineWidth = 1.6; g.beginPath(); poly(g, pts.map((q) => [cx + (q[0] - cx) * 0.86, 30 + (q[1] - 30) * 0.86])); g.stroke();
    txt(g, 'STOP', cx, 30.5, { size: 15, w: 34, fill: '#efe6d2' });
  } else {
    const w2 = Math.min(W - 6, 68), h2 = 36, x0 = cx - w2 / 2, maint = text.indexOf('MAINT') === 0;
    weathered(g, R_(x0, 14, w2, h2, 3), [x0, 14, w2, h2], maint ? [214, 170, 60] : [44, 96, 70], r, { rust: 0.5, holes: 2 });
    g.strokeStyle = maint ? 'rgba(30,26,18,0.8)' : 'rgba(236,230,214,0.8)'; g.lineWidth = 1.4; g.strokeRect(x0 + 3, 17, w2 - 6, h2 - 6);
    txt(g, text, cx, 32, { size: 12, maxW: w2 - 12, fill: maint ? '#20201a' : '#efe6d2' });
  }
});

// ====================================================================== street infrastructure + nature
def('lamp', 2, 7, function (g, d, r, p) {
  const W = d.w, H = d.h, cx = W / 2 - 6, lean = cl(+p.lean || 0, -1, 1) * 0.1; contact(g, cx - 16, 32, H, 0.5, 4);
  g.save(); g.translate(cx, H); g.rotate(lean); g.translate(-cx, -H);
  box(g, cx - 6, H - 16, 12, 16, [78, 84, 84], { r: 2 }); cylV(g, cx - 3, 40, 6, H - 50, [92, 100, 100]);
  const arm = (w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, 46); g.quadraticCurveTo(cx, 16, cx + 28, 14); g.stroke(); };
  arm(6.4, 'rgba(8,6,8,0.6)'); arm(4.4, 'rgb(96,104,104)'); g.save(); g.translate(0, -1); arm(1.2, 'rgba(255,240,208,0.4)'); g.restore();
  const hp = R_(cx + 16, 8, 28, 10, 4); solid(g, hp, [cx + 16, 8, 28, 10], [86, 92, 92], {}); ell(g, cx + 32, 19, 11, 3, 'rgba(20,24,24,0.95)');
  rustify(g, R_(cx - 3, 40, 6, H - 50, 0), [cx - 3, 40, 6, H - 50], r, 0.5); g.restore();
});
def('pole', 6, 12, function (g, d, r, p) {
  const W = d.w, H = d.h, cx = W / 2, lean = cl(+p.lean || 0, -1, 1) * 0.06; contact(g, cx - 18, 36, H, 0.45, 4);
  g.save(); g.translate(cx, H); g.rotate(lean); g.translate(-cx, -H);
  plank(g, cx - 7, 10, 14, H - 10, [92, 72, 52], r, { nails: false, knots: true });
  const arms = [[44, 150], [92, 110]];
  for (const [y, w] of arms) { plank(g, cx - w / 2, y, w, 8, [86, 66, 46], r, { nails: false, knots: false }); ln(g, cx - 12, y + 24, cx - w / 2 + 6, y + 6, 'rgba(70,52,36,0.9)', 3); ln(g, cx + 12, y + 24, cx + w / 2 - 6, y + 6, 'rgba(70,52,36,0.9)', 3);
    for (const dx of [-w / 2 + 8, -w / 6, w / 6, w / 2 - 8]) { box(g, cx + dx - 3, y - 8, 6, 9, [110, 150, 140], { r: 2, edgeA: 0.5 }); } }
  g.restore();
  // sagging wires to both edges
  g.lineCap = 'round';
  for (const [y, w, n] of [[36, 150, 4], [84, 110, 4]]) for (let i = 0; i < n; i++) { const dx = -w / 2 + 8 + i * (w - 16) / (n - 1), sag = r.range(14, 32);
    for (const side of [-1, 1]) { g.strokeStyle = 'rgba(12,10,10,0.75)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx + dx, y); g.quadraticCurveTo(cx + dx + side * (W / 2 - Math.abs(dx)) * 0.5, y + sag, side < 0 ? 0 : W, y + sag * 0.6 + r.range(-4, 8)); g.stroke(); } }
  const tf = R_(cx + 8, 112, 26, 34, 6); solid(g, tf, [cx + 8, 112, 26, 34], [96, 104, 104], {}); rustify(g, tf, [cx + 8, 112, 26, 34], r, 0.5);
});
def('fence', 2, 2, function (g, d, r) {
  const W = d.w, H = d.h; contact(g, 0, W, H, 0.4, 3);
  layer(g, 0, 6, W, H - 6, (L) => {
    L.strokeStyle = 'rgba(176,180,176,0.55)'; L.lineWidth = 0.9;
    for (let x = -H; x < W + H; x += 9) { L.beginPath(); L.moveTo(x, 8); L.lineTo(x + (H - 8), H); L.stroke(); L.beginPath(); L.moveTo(x + (H - 8), 8); L.lineTo(x, H); L.stroke(); }
    L.strokeStyle = 'rgba(10,8,8,0.35)'; L.lineWidth = 0.5; for (let x = -H; x < W + H; x += 9) { L.beginPath(); L.moveTo(x + 1, 8); L.lineTo(x + 1 + (H - 8), H); L.stroke(); }
    L.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < Math.round(W / 140); i++) { const hx = r.range(10, W - 30), hy = r.range(16, H - 10), hw = r.range(14, 34), hh = r.range(10, 22); L.beginPath(); L.moveTo(hx, hy); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; L.lineTo(hx + hw / 2 + Math.cos(a) * hw / 2 * r.range(0.6, 1.1), hy + hh / 2 + Math.sin(a) * hh / 2 * r.range(0.6, 1.1)); } L.fill(); }
  });
  for (let x = 4; x < W; x += Math.max(50, W / Math.max(1, Math.round(W / 60)))) { cylV(g, x - 2.5, 4, 5, H - 4, [130, 134, 134]); circ(g, x, 4, 3, [140, 144, 144]); }
  cylH(g, 0, 6, W, 4, [138, 142, 140]);
}, { free: true });
def('tree', 4, 7, function (g, d, r) {
  const W = d.w, H = d.h; contact(g, W / 2 - 26, 52, H, 0.5, 4);
  const branch = (x, y, a, len, w, depth) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a), w2 = w * 0.66;
    const pts = [[x + nx * w / 2, y + ny * w / 2], [x2 + nx * w2 / 2, y2 + ny * w2 / 2], [x2 - nx * w2 / 2, y2 - ny * w2 / 2], [x - nx * w / 2, y - ny * w / 2]];
    g.beginPath(); poly(g, pts); g.fillStyle = 'rgb(70,58,48)'; g.fill();
    const s = nx * LX > 0 ? 1 : -1;
    g.lineCap = 'round'; g.strokeStyle = 'rgba(234,208,172,0.34)'; g.lineWidth = Math.max(0.6, w * 0.18); g.beginPath(); g.moveTo(x + nx * s * w * 0.3, y + ny * s * w * 0.3); g.lineTo(x2 + nx * s * w2 * 0.3, y2 + ny * s * w2 * 0.3); g.stroke();
    g.strokeStyle = 'rgba(10,6,6,0.4)'; g.lineWidth = Math.max(0.6, w * 0.22); g.beginPath(); g.moveTo(x - nx * s * w * 0.32, y - ny * s * w * 0.32); g.lineTo(x2 - nx * s * w2 * 0.32, y2 - ny * s * w2 * 0.32); g.stroke();
    if (depth > 0) { const n = depth > 2 ? 2 : r.int(2, 3); for (let i = 0; i < n; i++) branch(x2, y2, a + r.range(-0.8, 0.8) + (i - (n - 1) / 2) * 0.25, len * r.range(0.62, 0.82), w2, depth - 1); }
  };
  const bx = W / 2, by = H;
  g.beginPath(); g.moveTo(bx - 16, by); g.quadraticCurveTo(bx - 8, by - 12, bx - 7, by - 30); g.lineTo(bx + 7, by - 30); g.quadraticCurveTo(bx + 8, by - 12, bx + 18, by); g.closePath(); g.fillStyle = 'rgb(74,60,50)'; g.fill();
  branch(bx, by - 26, -PI / 2 + r.range(-0.12, 0.12), 86, 14, 4);
  heap(g, bx - 30, bx + 32, H, 4, r);
});
def('billboard', 10, 7, function (g, d, r, p) {
  const W = d.w, H = d.h, ad = p.ad || 'sun', bx = 14, by = 10, bw = W - 28, bh = 168; contact(g, 40, W - 80, H, 0.4, 4);
  for (const px of [74, W - 82]) { cylV(g, px, by + bh, 8, H - by - bh, [98, 100, 100]); }
  ln(g, 78, by + bh + 4, W - 78, H - 4, 'rgba(70,72,72,0.9)', 3); ln(g, W - 78, by + bh + 4, 78, H - 4, 'rgba(70,72,72,0.9)', 3);
  plank(g, bx + 30, by + bh + 2, bw - 60, 6, [90, 76, 60], r, { nails: false, knots: false });
  box(g, bx - 5, by - 5, bw + 10, bh + 10, [66, 70, 72], {});
  const pf = R_(bx, by, bw, bh, 1), b = [bx, by, bw, bh];
  within(g, pf, (q) => {
    if (ad === 'nuka') {
      q.fillStyle = rg(q, bx + bw / 2, by + bh / 2, 10, bw * 0.7, [[0, '#d24236'], [1, '#7c1a16']]); q.fillRect(bx, by, bw, bh);
      q.fillStyle = 'rgba(255,236,200,0.9)'; q.beginPath(); q.moveTo(bx + 54, by + bh - 10); q.lineTo(bx + 54, by + 60); q.quadraticCurveTo(bx + 54, by + 44, bx + 64, by + 38); q.lineTo(bx + 64, by + 16); q.lineTo(bx + 80, by + 16); q.lineTo(bx + 80, by + 38); q.quadraticCurveTo(bx + 90, by + 44, bx + 90, by + 60); q.lineTo(bx + 90, by + bh - 10); q.closePath(); q.fill();
      fr(q, '#a02820', bx + 62, by + 8, 20, 9);
      txt(q, 'NUKA-COLA', bx + bw * 0.62, by + 56, { size: 44, w: 220, fill: '#f6ecd4', shadow: 'rgba(60,8,6,0.5)' }); txt(q, 'ICE COLD.  ATOMIC FRESH.', bx + bw * 0.62, by + 108, { size: 15, w: 220, fill: '#f0d8a8', style: 'italic bold', family: F_SERIF });
      ell(q, bx + bw * 0.62, by + bh - 24, 90, 4, 'rgba(255,236,200,0.5)');
    } else if (ad === 'vaultec') {
      q.fillStyle = vg(q, by, by + bh, [[0, '#1e4a96'], [1, '#12306a']]); q.fillRect(bx, by, bw, bh);
      const gx = bx + 84, gy = by + 84; q.fillStyle = '#f0c93a'; q.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, rr2 = i % 2 ? 50 : 62; q.lineTo(gx + Math.cos(a) * rr2, gy + Math.sin(a) * rr2); } q.closePath(); q.fill(); circ(q, gx, gy, 34, '#12306a'); txt(q, '213', gx, gy + 1, { size: 30, w: 46, fill: '#f0c93a' });
      txt(q, 'VAULT-TEC', bx + bw * 0.66, by + 60, { size: 40, w: 200, fill: '#f6e9b4', shadow: 'rgba(0,0,0,0.45)' }); txt(q, 'A BRIGHTER TOMORROW', bx + bw * 0.66, by + 104, { size: 16, w: 210, fill: '#f0c93a' }); txt(q, 'starts underground!', bx + bw * 0.66, by + 128, { size: 15, w: 150, fill: '#cfe0f6', style: 'italic bold', family: F_SERIF });
    } else if (ad === 'steel') {
      q.fillStyle = vg(q, by, by + bh, [[0, '#a05a2a'], [1, '#4c3a30']]); q.fillRect(bx, by, bw, bh);
      for (let i = 0; i < 5; i++) fr(q, 'rgba(20,16,14,0.5)', bx + 20 + i * 70, by + bh - 66 - (i % 2) * 20, 26, 66 + (i % 2) * 20);
      txt(q, 'CINDER STEEL', bx + bw / 2, by + 52, { size: 46, w: 300, fill: '#f0e2c0', shadow: 'rgba(0,0,0,0.5)' }); txt(q, 'BUILT TO LAST', bx + bw / 2, by + 100, { size: 20, w: 190, fill: '#f0b060' });
    } else {
      q.fillStyle = vg(q, by, by + bh, [[0, '#f3c890'], [0.55, '#f0e2bc'], [1, '#8bb0a8']]); q.fillRect(bx, by, bw, bh);
      q.fillStyle = 'rgba(70,110,100,0.85)'; q.beginPath(); q.moveTo(bx, by + bh); for (let x = 0; x <= bw; x += 20) q.lineTo(bx + x, by + bh - 30 - Math.sin(x * 0.03) * 16); q.lineTo(bx + bw, by + bh); q.closePath(); q.fill();
      for (let i = 0; i < 3; i++) fr(q, 'rgba(60,54,50,0.85)', bx + bw - 90 + i * 22, by + bh - 74 + i * 6, 8, 44 - i * 6);
      circ(q, bx + 60, by + 48, 24, 'rgba(255,214,120,0.9)');
      txt(q, 'WELCOME TO', bx + bw * 0.5, by + 36, { size: 18, w: 130, fill: '#6a4a34', family: F_SERIF, style: 'italic bold' }); txt(q, 'CINDER RIDGE', bx + bw * 0.5, by + 76, { size: 44, w: 300, fill: '#8c3a24', shadow: 'rgba(255,240,200,0.6)' });
      txt(q, 'HOME OF THE STEEL MILL', bx + bw * 0.5, by + 112, { size: 16, w: 240, fill: '#50403a' });
    }
    // sun-bleach, dirt, rust streaks
    q.fillStyle = 'rgba(255,240,210,0.16)'; q.fillRect(bx, by, bw, bh); over(q, 'dirt', bx, by, bw, bh, 0.5, r, 1.4); overFade(q, 'streak', bx, by, bw, bh, 0.4, 0.8, r, 1.2); overFade(q, 'rust', bx, by, bw, bh, 0, 0.5, r, 1);
    // torn strips showing bare plywood
    for (let i = 0; i < 3; i++) { const tw = r.range(26, 48), th = r.range(18, 40), tx = i === 1 ? bx + bw - tw - 4 : bx + 4 + r.range(0, 20), ty = i === 2 ? by + bh - th - 4 : by + r.range(bh * 0.55, bh * 0.75); q.fillStyle = 'rgb(122,98,68)'; q.beginPath(); q.moveTo(tx, ty); for (let k = 0; k <= 8; k++) q.lineTo(tx + tw * k / 8, ty + r.range(-3, 3) + (k % 2) * 3); q.lineTo(tx + tw, ty + th); for (let k = 8; k >= 0; k--) q.lineTo(tx + tw * k / 8, ty + th + r.range(-5, 5)); q.closePath(); q.fill(); q.strokeStyle = 'rgba(20,12,8,0.5)'; q.lineWidth = 1; q.stroke(); }
    for (let i = 0; i < 4; i++) hole(q, bx + r.range(10, bw - 10), by + r.range(10, bh - 10), r.range(1.2, 2.2));
  });
  rim(g, R_(bx - 5, by - 5, bw + 10, bh + 10, 0), { w: 1.2 });
});
def('silo', 4, 28, function (g, d, r) {
  const W = d.w, H = d.h, pf = R_(0, 0, W, H, 0), b = [0, 0, W, H];
  solid(g, pf, b, [126, 122, 114], { top: 0.2, bot: 0.5, grain: 1, rim: false, edge: false });
  within(g, pf, (q) => {
    for (let y = 0; y < H; y += 160) { fr(q, 'rgba(8,6,10,0.5)', 0, y, W, 2); fr(q, 'rgba(255,240,208,0.2)', 0, y + 2, W, 1); }
    fr(q, 'rgba(8,6,10,0.45)', W * 0.5, 0, 2, H); fr(q, 'rgba(255,240,208,0.16)', W * 0.5 + 2, 0, 1, H);
    over(q, 'dirt', 0, 0, W, H, 0.6, r, 1.6); overFade(q, 'streak', 0, 0, W, H, 0.5, 0.9, r, 1.2); overFade(q, 'rust', 0, 0, W, H, 0, 0.4, r, 1.1);
    // giant peeling cog logo
    const cx = W / 2, cy = 560; q.fillStyle = 'rgba(214,190,70,0.85)'; q.beginPath(); for (let i = 0; i < 30; i++) { const a = i / 30 * TAU, rr2 = i % 2 ? 58 : 72; q.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } q.closePath(); q.fill();
    circ(q, cx, cy, 40, 'rgb(30,60,120)'); txt(q, '213', cx, cy + 1, { size: 34, w: 52, fill: '#e8d070' });
    over(q, 'chip', cx - 80, cy - 80, 160, 160, 0.9, r, 0.6);
    for (const y of [180, 820]) { box(g, W - 34, y, 26, 10, [70, 74, 76], {}); ell(q, W - 21, y + 22, 12, 5, 'rgba(240,220,170,0.35)'); }
    cylV(q, 18, 0, 8, H, [92, 96, 96]);
  });
  yellowStripe(g, 0, H - 44, W, 24); ao(g, 0, H - 60, W, 60, 'b', 0.5, 40);
  rim(g, pf, { w: 1.4 });
}, { free: false });
def('watertower', 7, 14, function (g, d, r) {
  const W = d.w, H = d.h, cx = W / 2; contact(g, 40, W - 80, H, 0.35, 4);
  for (const lx of [cx - 84, cx - 44, cx + 44, cx + 84]) cylV(g, lx - 3, 232, 6, H - 232, [96, 82, 70]);
  for (let y = 270; y < H - 20; y += 90) { ln(g, cx - 84, y, cx + 84, y + 60, 'rgba(70,58,50,0.9)', 3); ln(g, cx + 84, y, cx - 84, y + 60, 'rgba(70,58,50,0.9)', 3); }
  const tank = (q) => { q.moveTo(cx - 96, 60); q.lineTo(cx - 96, 214); q.quadraticCurveTo(cx, 240, cx + 96, 214); q.lineTo(cx + 96, 60); q.closePath(); };
  weathered(g, tank, [cx - 96, 60, 192, 180], [116, 84, 62], r, { rust: 0.9, holes: 4, dents: 2 });
  for (const y of [86, 130, 174]) { g.fillStyle = 'rgba(30,22,18,0.6)'; g.fillRect(cx - 97, y, 194, 4); g.fillStyle = 'rgba(255,220,180,0.28)'; g.fillRect(cx - 97, y - 1, 194, 1); }
  const roof = [[cx - 104, 62], [cx, 8], [cx + 104, 62]]; weathered(g, P_(roof), bbox(roof), [104, 76, 58], r, { rust: 0.8, holes: 2 });
  ln(g, cx, 8, cx, -4, 'rgba(70,60,54,1)', 3); ln(g, cx + 96, 100, cx + 96, 226, 'rgba(60,52,46,1)', 3);
});

// ====================================================================== subway entrance + footbridge
def('metro', 8, 6, function (g, d, r, p) {
  const W = d.w, H = d.h; contact(g, 0, W, H, 0.4, 3);
  for (const side of [0, 1]) {
    const x = side ? W - 44 : 0; box(g, x, H - 40, 44, 40, [148, 152, 148], { r: 1, edgeA: 0.55 });
    for (let k = 0; k < 4; k++) fr(g, 'rgba(8,8,10,0.28)', x + k * 11, H - 40, 1, 40);
    for (let k = 0; k < 4; k++) { cylV(g, x + 6 + k * 11, H - 78, 3, 38, [94, 98, 100]); }
    cylH(g, x, H - 80, 44, 4, [104, 108, 108]);
  }
  const sx = W - 12; cylV(g, sx - 3, 0, 6, H - 40, [88, 92, 94]);
  circ(g, sx - 26, 34, 24, '#1e4c92'); circ(g, sx - 26, 34, 17, '#efe6cf'); fr(g, '#1e4c92', sx - 45, 30, 38, 8); txt(g, 'M', sx - 26, 20, { size: 12, fill: '#1e4c92' });
  box(g, sx - 76, 66, 76, 24, [30, 44, 60], { r: 1, edgeA: 0.6 }); txt(g, String(p.name || 'CINDER RIDGE').toUpperCase(), sx - 38, 78, { size: 11, maxW: 66, fill: '#efe6cf' });
  rustify(g, R_(sx - 3, 0, 6, H - 40, 0), [sx - 3, 0, 6, H - 40], r, 0.5);
});
def('footbridge', 16, 5, function (g, d, r) {
  const W = d.w, H = d.h;
  for (const x of [0, W - 24]) { box(g, x, H - 24, 24, 24, [110, 112, 108], { r: 1 }); }
  // overhead frame every 128px
  for (let x = 20; x < W - 16; x += 128) { cylV(g, x - 3, 30, 6, H - 30, [108, 112, 112]); cylV(g, x + 120 - 3, 30, 6, H - 30, [108, 112, 112]); cylH(g, x - 3, 26, 132, 6, [108, 112, 112]); ln(g, x, H - 6, x + 120, 32, 'rgba(84,88,88,0.85)', 2.4); }
  // railing: mesh + top rail along the deck edge
  layer(g, 0, H - 64, W, 60, (L) => { L.strokeStyle = 'rgba(170,174,170,0.42)'; L.lineWidth = 0.9; for (let x = -60; x < W + 60; x += 9) { L.beginPath(); L.moveTo(x, H - 62); L.lineTo(x + 56, H - 6); L.stroke(); L.beginPath(); L.moveTo(x + 56, H - 62); L.lineTo(x, H - 6); L.stroke(); }
    L.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 4; i++) { const hx = r.range(30, W - 60); L.beginPath(); L.ellipse(hx, H - 30, r.range(14, 30), r.range(8, 16), 0, 0, TAU); L.fill(); } });
  cylH(g, 0, H - 66, W, 5, [120, 124, 122]); for (let x = 6; x < W; x += 64) cylV(g, x, H - 66, 4, 60, [112, 116, 114]);
  yellowStripe(g, 0, H - 6, W, 6);
  streaks(g, 0, H - 4, W, 20, Math.round(W / 60), r, [60, 34, 20], 0.3);
});

// ====================================================================== buildings
def('shopfront_low', 8, 7, function (g, d, r, p) {
  const W = d.w, H = d.h, v = p.brick === undefined ? r.int(0, 3) : cl(p.brick | 0, 0, 3), sign = String(p.sign || 'PAWN').toUpperCase(), topY = 46, GY = H;
  contact(g, 0, W, GY, 0.45, 4);
  brickWall(g, R_(0, topY, W, GY - topY, 0), [0, topY, W, GY - topY], v, r, { soot: 0.3, rust: 0.25 });
  stoneBand(g, -4, topY - 8, W + 8, 12, r); stoneBand(g, 0, GY - 14, W, 14, r, [120, 116, 106]);
  const sx = 36, sw = W - 72; box(g, sx, topY + 12, sw, 30, [44, 70, 66], { edgeA: 0.6 }); txt(g, sign, sx + sw / 2, topY + 27, { size: 20, w: Math.min(sw - 16, sign.length * 15), fill: '#e6d9a8', shadow: 'rgba(0,0,0,0.5)' });
  shopWindow(g, 36, topY + 66, 132, 104, r, { panes: 2 });
  const dx = W - 96, dy = topY + 62; box(g, dx - 6, dy - 6, 70, GY - dy - 8, [52, 92, 86], {}); fr(g, '#07060a', dx, dy, 58, GY - dy - 14);
  awning(g, 26, topY + 52, 152, r, [176, 60, 48], [220, 208, 176], { tear: r.int(0, 5) });
  heap(g, 0, W, GY, 3, r);
});
def('ruin', 10, 10, function (g, d, r, p) {
  const W = d.w, H = d.h, v = p.brick === undefined ? r.int(0, 3) : cl(p.brick | 0, 0, 3); contact(g, 0, W, H, 0.4, 4);
  const pts = [[0, H]]; let x = 0; while (x < W) { const nx = Math.min(W, x + r.pick([16, 24, 32, 48])); const top = H - r.range(70, 250) * (0.4 + 0.6 * Math.sin(Math.min(1, (x + nx) / 2 / W) * PI)); pts.push([x, top], [nx, top]); x = nx; }
  pts.push([W, H]);
  brickWall(g, P_(pts), bbox(pts), v, r, { soot: 0.4, rust: 0.3 });
  rim(g, P_(pts), { w: 1.2 }); edge(g, P_(pts), 0.5);
  const topAt = (xx) => { let t = H; for (let i = 1; i < pts.length - 1; i++) if (Math.abs(pts[i][0] - xx) < 24) t = Math.min(t, pts[i][1]); return t; };
  for (const rx of [W * 0.2, W * 0.55, W * 0.82]) { const t = topAt(rx); g.strokeStyle = 'rgba(8,4,6,0.6)'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(rx, t + 8); g.lineTo(rx + r.range(-8, 8), t - r.range(24, 60)); g.stroke(); g.strokeStyle = 'rgb(126,70,38)'; g.lineWidth = 1.5; g.stroke(); }
  heap(g, 0, W, H, 16, r); for (let i = 0; i < 6; i++) rock(g, r.range(10, W - 10), H, r.range(16, 40), r.range(8, 18), r, [150, 146, 138], { rebar: r.next() < 0.3 });
});

// ====================================================================== diner set
def('diner_roof', 26, 5, function (g, d, r, p) {
  const W = d.w, H = d.h;
  // fascia band along the roof edge
  box(g, 0, H - 16, W, 16, [70, 122, 118], { edgeA: 0.6, top: 0.2 }); for (let x = 6; x < W; x += 40) rivet(g, x, H - 8, 1.3, [200, 196, 184]); chromeRect(g, 0, H - 18, W, 3, { r });
  // rooftop unit + vent stack
  box(g, 34, H - 62, 80, 46, [140, 142, 136], { r: 1 }); for (let k = 0; k < 6; k++) fr(g, 'rgba(8,8,10,0.4)', 40 + k * 12, H - 54, 8, 30);
  cylV(g, W - 90, H - 56, 10, 40, [110, 112, 108]); box(g, W - 96, H - 60, 22, 6, [120, 122, 118], {});
  // sign mast + backing frame
  for (const mx of [W * 0.34, W * 0.66]) cylV(g, mx - 3, H - 100, 6, 86, [96, 100, 100]);
  const sx = W * 0.3, sw = W * 0.4, sy = 8, sh = H - 108; box(g, sx, sy, sw, sh, [26, 30, 34], { r: 4, edgeA: 0.7 });
  g.save(); g.strokeStyle = 'rgba(214,72,64,0.85)'; g.lineWidth = 3; g.lineJoin = 'round'; g.strokeRect(sx + 6, sy + 6, sw - 12, sh - 12); g.restore();
  txt(g, String(p.text || 'DINER'), sx + sw / 2, sy + sh / 2 + 1, { size: 60, w: sw - 40, fill: null, stroke: 'rgba(90,220,232,0.9)', lw: 3, family: F_SERIF, style: 'italic bold' });
  // Nuka-Cola bottle sign (unlit tube outline)
  const bx = W * 0.8, by = 6; g.strokeStyle = 'rgba(224,70,60,0.9)'; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath(); g.moveTo(bx - 10, by + 96); g.lineTo(bx - 10, by + 40); g.quadraticCurveTo(bx - 10, by + 28, bx - 4, by + 24); g.lineTo(bx - 4, by + 6); g.lineTo(bx + 4, by + 6); g.lineTo(bx + 4, by + 24); g.quadraticCurveTo(bx + 10, by + 28, bx + 10, by + 40); g.lineTo(bx + 10, by + 96); g.closePath(); g.stroke();
  txt(g, 'NUKA', bx, by + 60, { size: 12, fill: null, stroke: 'rgba(240,228,190,0.9)', lw: 1.6 }); cylV(g, bx - 2, by + 96, 4, 10, [96, 100, 100]);
  rustify(g, R_(0, H - 16, W, 16, 0), [0, H - 16, W, 16], r, 0.4);
});
def('counter', 10, 2, function (g, d, r) {
  const W = d.w, H = d.h; contact(g, 0, W, H, 0.45, 4);
  box(g, 8, H - 46, W - 16, 46, [66, 118, 114], { edgeA: 0.6 }); for (let x = 20; x < W - 16; x += 36) fr(g, 'rgba(8,10,12,0.32)', x, H - 44, 1.4, 42);
  chromeRect(g, 4, H - 56, W - 8, 10, { r }); fr(g, 'rgba(230,224,208,0.9)', 4, H - 58, W - 8, 3);
  for (let i = 0; i < 6; i++) { const sx = 30 + i * ((W - 60) / 5); cylV(g, sx - 2, H - 34, 4, 34, [170, 174, 170]); ell(g, sx, H - 2, 9, 2.6, 'rgba(90,92,96,0.9)'); ell(g, sx, H - 36, 11, 4.4, [170, 40, 44]); ell(g, sx - 2, H - 37.4, 7, 2, 'rgba(255,200,190,0.35)'); }
  box(g, W * 0.7, H - 84, 42, 26, [160, 156, 142], { r: 2 }); fr(g, '#1c2226', W * 0.7 + 6, H - 79, 30, 8); for (let k = 0; k < 6; k++) fr(g, '#cfc7b0', W * 0.7 + 6 + k * 5, H - 66, 3.4, 4);
  for (const mx of [W * 0.3, W * 0.5]) { box(g, mx, H - 68, 8, 10, [220, 214, 196], { r: 1.5 }); }
  streaks(g, 8, H - 12, W - 16, 26, Math.round(W / 60), r, [30, 24, 18], 0.25);
});
def('booth', 3.5, 2.2, function (g, d, r) {
  const W = d.w, H = d.h; contact(g, 2, W - 4, H, 0.45, 4);
  const back = R_(4, H - 84, 32, 62, 6); solid(g, back, [4, H - 84, 32, 62], [160, 46, 48], { top: 0.3, bot: 0.4 });
  for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) circ(g, 12 + k * 10, H - 74 + j * 14, 1.2, 'rgba(255,220,200,0.35)');
  box(g, 4, H - 30, W - 8, 24, [150, 40, 44], { r: 4 }); box(g, 6, H - 8, W - 12, 8, [40, 34, 34], {});
  cylV(g, W * 0.62 - 2, H - 52, 4, 46, [160, 164, 160]); ell(g, W * 0.62, H - 6, 12, 3, 'rgba(90,92,96,0.9)');
  chromeRect(g, W * 0.4, H - 56, W * 0.5, 6, { r }); box(g, W * 0.42, H - 62, 8, 6, [220, 214, 196], { r: 1 });
});
def('jukebox', 1.6, 2.4, function (g, d, r) {
  const W = d.w, H = d.h; contact(g, 4, W - 8, H, 0.5, 3);
  const body = (q) => { q.moveTo(6, H); q.lineTo(6, 30); q.quadraticCurveTo(6, 4, W / 2, 4); q.quadraticCurveTo(W - 6, 4, W - 6, 30); q.lineTo(W - 6, H); q.closePath(); };
  weathered(g, body, [6, 4, W - 12, H - 4], [196, 152, 60], r, { rust: 0.3, chips: 0.5 });
  const dome = (q) => { q.moveTo(12, 56); q.lineTo(12, 30); q.quadraticCurveTo(12, 12, W / 2, 12); q.quadraticCurveTo(W - 12, 12, W - 12, 30); q.lineTo(W - 12, 56); q.closePath(); };
  g.beginPath(); dome(g); g.fillStyle = vg(g, 12, 56, [[0, '#2a3038'], [1, '#12161a']]); g.fill(); g.strokeStyle = 'rgba(170,200,210,0.5)'; g.lineWidth = 1.4; g.stroke();
  fr(g, 'rgba(210,90,60,0.35)', 16, 36, W - 32, 3); fr(g, 'rgba(90,180,200,0.3)', 16, 44, W - 32, 3);
  chromeRect(g, 8, 58, W - 16, 6, { r }); fr(g, '#14181c', 14, 68, W - 28, 16); for (let k = 0; k < 4; k++) fr(g, '#d8cfa8', 17 + k * 9, 72, 6, 8); circ(g, W / 2, 92, 2, '#8c8c88');
  cylV(g, 10, 30, 3, H - 34, [170, 174, 170]); cylV(g, W - 13, 30, 3, H - 34, [170, 174, 170]);
});
def('menu', 3, 1.5, function (g, d, r) {
  const W = d.w, H = d.h; box(g, 2, 2, W - 4, H - 6, [96, 70, 46], { r: 2, edgeA: 0.6 }); box(g, 7, 7, W - 14, H - 16, [30, 48, 40], { r: 1 });
  txt(g, "TODAY'S SPECIALS", W / 2, 16, { size: 10, maxW: W - 24, fill: 'rgba(236,232,214,0.86)' });
  for (let i = 0; i < 4; i++) { fr(g, 'rgba(236,232,214,' + (0.5 - i * 0.06) + ')', 14, 25 + i * 8, W * (0.5 + 0.1 * ((i * 7) % 3)), 1.6); fr(g, 'rgba(236,232,214,0.5)', W - 30, 25 + i * 8, 14, 1.6); }
});
def('diner_window', 6, 3, function (g, d, r) {
  const W = d.w, H = d.h, fx = 6, fy = 6, fw = W - 12, fh = H - 12;
  box(g, 2, 2, W - 4, H - 4, [200, 196, 184], { r: 2, edgeA: 0.6 });
  g.fillStyle = vg(g, fy, fy + fh, [[0, '#ffb060'], [0.5, '#ff8a48'], [1, '#c8503a']]); g.fillRect(fx, fy, fw, fh);
  g.fillStyle = 'rgba(40,24,30,0.55)'; for (let k = 0; k < 6; k++) g.fillRect(fx + 12 + k * 34, fy + fh - 30 - (k % 3) * 8, 22, 40);
  blinds(g, fx, fy, fw, fh, r); for (let x = fx + fw / 3; x < fx + fw - 4; x += fw / 3) fr(g, [200, 196, 184], x - 2, fy, 4, fh);
  overFade(g, 'dirt', fx, fy, fw, fh, 0.2, 0.5, r, 1.2);
});
def('nuka_cooler', 1.2, 2.5, function (g, d, r) {
  const W = d.w, H = d.h; contact(g, 2, W - 4, H, 0.45, 3);
  const body = R_(3, 8, W - 6, H - 8, 3); weathered(g, body, [3, 8, W - 6, H - 8], [176, 42, 38], r, { rust: 0.4, chips: 0.6 });
  fr(g, '#14181c', 8, 24, W - 16, H - 46); for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) { const bx = 12 + j * 14, by = 30 + k * 16; g.fillStyle = 'rgba(214,80,60,0.85)'; g.fillRect(bx, by + 4, 8, 10); g.fillRect(bx + 2, by, 4, 5); }
  g.fillStyle = 'rgba(190,220,230,0.22)'; g.fillRect(8, 24, W - 16, H - 46); chromeRect(g, W - 12, 34, 3, 40, { r });
  txt(g, 'Nuka-Cola', W / 2, 16, { size: 10, maxW: W - 10, fill: '#f2e8cc', family: F_SERIF, style: 'italic bold' });
});

// @@PARTS@@
})();
