// Boss creature art: DEATHCLAW and SENTRY BOT "WARDEN-9".  (OVERSEER PRIME is NOT painted yet: CD.art.overseer does not exist.)
// Everything is painted procedurally. Static parts (hide, armour plates, glass, brain, tools...) are baked lazily into supersampled
// offscreen canvases with baked gradient shading / texture / grime / specular / rim light from the upper-right sun; only the moving
// and emissive things (IK limbs, spinning barrels, glows, steam, sparks, fluid, screen faces, energy shield) are drawn per frame.
// Art is "fully lit albedo": the game multiplies a lighting map on top, so tones stay mid-value with the shadow baked in.
//   CD.art.deathclaw / CD.art.sentry = function (ctx, e, G, flashOnly)
// The hit-flash pass (flashOnly === true) simply re-draws the same art additively, so every emissive extra is skipped in that pass.
(function () {
'use strict';
const CD = window.CD, U = CD.U;
CD.art = CD.art || {};

const SS = 3;                                   // default supersampling of baked parts
const PI = Math.PI, TAU = PI * 2;
const clamp = U.clamp, lerp = U.lerp;
const sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, atan2 = Math.atan2, sqrt = Math.sqrt, hypot = Math.hypot;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const eo = (t) => 1 - (1 - t) * (1 - t);        // ease out
const ei = (t) => t * t;                          // ease in
const eio = (t) => t * t * (3 - 2 * t);           // smoothstep ease
const c01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const nz = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
let FO = false;                                  // true during the additive hit-flash re-draw: skip emissive extras, they would double up

// key light: unit-ish vector pointing TOWARD the sun (upper right)
const LX = 0.5, LY = -0.86;

// ================================================================== colour helpers
function tone(c, f) {                            // f < 1 darkens (slightly cool shadow), f > 1 lifts toward warm white
  c = U.hex(c); let r, g, b;
  if (f <= 1) { r = c[0] * f * 0.96; g = c[1] * f * 0.985; b = c[2] * f * 1.04; }
  else { const t = Math.min(1, (f - 1) * 0.9); r = c[0] + (255 - c[0]) * t; g = c[1] + (248 - c[1]) * t; b = c[2] + (236 - c[2]) * t; }
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}
const css = (c, a) => U.rgb(c, a === undefined ? 1 : (a < 0 ? 0 : a));
const T = (c, f, a) => U.rgb(tone(c, f), a === undefined ? 1 : (a < 0 ? 0 : a));
const mixc = (a, b, t) => U.mix(a, b, t);
const rgbs = (c) => { c = U.hex(c); return (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0); };
const OUT = 'rgba(12,9,6,0.66)';

// ================================================================== baking
let CUR_SS = SS;
function part(w, h, ox, oy, fn, ss) {           // canvas covering local [-ox, w-ox] x [-oy, h-oy]
  ss = ss || SS;
  const c = U.canvas(w * ss, h * ss), g = c.getContext('2d');
  const prev = CUR_SS; CUR_SS = ss;
  g.setTransform(ss, 0, 0, ss, ox * ss, oy * ss); g.lineJoin = 'round'; g.lineCap = 'round';
  try { fn(g); } finally { CUR_SS = prev; }
  return { c, w, h, ox, oy, ss };
}
const put = (ctx, p, x, y) => ctx.drawImage(p.c, (x || 0) - p.ox, (y || 0) - p.oy, p.w, p.h);
function darkened(p, f, tint) {                  // shaded copy of a part (far-side limbs, wrecks)
  const c = U.canvas(p.c.width, p.c.height), g = c.getContext('2d'); g.drawImage(p.c, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint ? 'rgba(' + tint + ',' + (1 - f) + ')' : 'rgba(8,10,8,' + (1 - f) + ')'; g.fillRect(0, 0, c.width, c.height);
  return { c, w: p.w, h: p.h, ox: p.ox, oy: p.oy, ss: p.ss };
}
// draw a horizontally-authored limb sprite from (ax,ay) toward (bx,by); keeps the sprite's "top" facing up
function seg(ctx, p, ax, ay, bx, by, sc, noFlip) {
  const a = atan2(by - ay, bx - ax);
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
  if (!noFlip && (a > PI / 2 || a < -PI / 2)) ctx.scale(1, -1);
  if (sc && sc !== 1) ctx.scale(sc, 1);
  ctx.drawImage(p.c, -p.ox, -p.oy, p.w, p.h);
  ctx.restore();
}
const _cache = {};
function cached(name, build) { return _cache[name] || (_cache[name] = build()); }

// ================================================================== shape helpers
function blob(g, pts, open) {                    // smooth closed curve (Catmull-Rom -> bezier); begins a new path
  const n = pts.length; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  const m = open ? n - 1 : n;
  for (let i = 0; i < m; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (!open) g.closePath();
}
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
function ell(g, cx, cy, rx, ry, rot) { g.beginPath(); g.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); }
function rrect(g, x, y, w, h, r) {               // begins a new path
  r = Math.min(r, w / 2, h / 2); g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r); g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r); g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath();
}
function sampleBlob(pts, per) {                  // dense polyline of the same smooth closed curve
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const ax = p1[0] + (p2[0] - p0[0]) / 6, ay = p1[1] + (p2[1] - p0[1]) / 6, bx = p2[0] - (p3[0] - p1[0]) / 6, by = p2[1] - (p3[1] - p1[1]) / 6;
    for (let k = 0; k < per; k++) {
      const t = k / per, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      out.push([a * p1[0] + b * ax + c * bx + d * p2[0], a * p1[1] + b * ay + c * by + d * p2[1]]);
    }
  }
  return out;
}
const scalePts = (pts, cx, cy, sx, sy) => pts.map((p) => [cx + (p[0] - cx) * sx, cy + (p[1] - cy) * (sy === undefined ? sx : sy)]);
const xfPts = (pts, dx, dy, s) => pts.map((p) => [p[0] * (s || 1) + dx, p[1] * (s || 1) + dy]);

function lgrad(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]); return gr; }
// elliptical radial gradient filled over a rect (call inside a clip). focus (fx,fy) in unit-ellipse space, fr = focus radius
function egrad(g, cx, cy, rx, ry, rot, stops, fx, fy, fr) {
  g.save(); g.translate(cx, cy); if (rot) g.rotate(rot); g.scale(rx, ry);
  const gr = g.createRadialGradient(fx || 0, fy || 0, fr || 0, 0, 0, 1);
  for (let i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]);
  g.fillStyle = gr; g.fillRect(-3, -3, 6, 6); g.restore();
}
function outline(g, pathFn, lw, c) { g.save(); pathFn(g); g.lineWidth = lw || 0.6; g.strokeStyle = c || OUT; g.stroke(); g.restore(); }
// rim light: soft coloured stroke just inside the outline, strongest where the gradient (x0,y0)->(x1,y1) is opaque
function rim(g, pathFn, x0, y0, x1, y1, c0, c1, lw) {
  g.save(); pathFn(g); g.clip(); pathFn(g);
  g.strokeStyle = lgrad(g, x0, y0, x1, y1, [[0, c0], [1, c1 || 'rgba(0,0,0,0)']]); g.lineWidth = lw || 1.6; g.stroke(); g.restore();
}
// tapered lens-shaped highlight along a quadratic curve
function streak(g, x0, y0, cx, cy, x1, y1, w, fill) {
  const dx = x1 - x0, dy = y1 - y0, l = hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx + nx * w, cy + ny * w, x1, y1); g.quadraticCurveTo(cx - nx * w * 0.35, cy - ny * w * 0.35, x0, y0);
  g.fillStyle = fill; g.fill();
}
function speckle(g, r, x0, y0, x1, y1, n, cols, s0, s1) {
  for (let i = 0; i < n; i++) { g.fillStyle = cols[(r.next() * cols.length) | 0]; const s = r.range(s0, s1); g.fillRect(r.range(x0, x1), r.range(y0, y1), s, s * r.range(0.6, 1.4)); }
}

// ================================================================== texture masks (cheap noise-stencilled colour patches)
// A few 256px tileable fBm fields are generated once; a "splat" fills a region with a tinted, thresholded copy through a canvas pattern.
let _fields = null;
function fields() {
  if (_fields) return _fields;
  const N = 256, mk = (cells, oct, seed) => {
    const f = U.fbmField(N, N, cells, oct, seed, 0.55); let lo = 1e9, hi = -1e9;
    for (let i = 0; i < f.length; i++) { if (f[i] < lo) lo = f[i]; if (f[i] > hi) hi = f[i]; }
    const o = new Float32Array(f.length); for (let i = 0; i < f.length; i++) o[i] = (f[i] - lo) / (hi - lo || 1);
    return o;
  };
  return (_fields = { N, blot: mk(4, 4, 9101), mid: mk(9, 3, 9102), fine: mk(22, 2, 9103), grain: mk(64, 1, 9104) });
}
const _masks = {};
function maskTex(kind, c, th, soft) {
  const key = kind + '|' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + '|' + th + '|' + soft;
  let m = _masks[key]; if (m) return m;
  const F = fields(), N = F.N, f = F[kind], cv = U.canvas(N, N), g = cv.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  for (let i = 0; i < N * N; i++) {
    const t = clamp((f[i] - th) / (soft || 0.001), 0, 1), a = t * t * (3 - 2 * t);
    d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = a * 255;
  }
  g.putImageData(img, 0, 0); return (_masks[key] = cv);
}
// splat(g, x0,y0,x1,y1, {k:'blot'|'mid'|'fine'|'grain', c:[r,g,b], a, th, soft, s (units per texel), ox, oy, mode})
function splat(g, x0, y0, x1, y1, o) {
  const cv = maskTex(o.k || 'blot', U.hex(o.c), o.th === undefined ? 0.5 : o.th, o.soft === undefined ? 0.2 : o.soft);
  const p = g.createPattern(cv, 'repeat'), s = o.s || 0.3;
  if (p.setTransform) p.setTransform(new DOMMatrix([s, 0, 0, s, o.ox || 0, o.oy || 0]));
  g.save(); g.globalAlpha *= o.a === undefined ? 0.4 : o.a; if (o.mode) g.globalCompositeOperation = o.mode; g.fillStyle = p; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
}
// same, but only along the edge of the current shape (stroke through the clip): paint chips, edge rust, worn hide
function edgeSplat(g, pathFn, o) {
  const cv = maskTex(o.k || 'fine', U.hex(o.c), o.th === undefined ? 0.5 : o.th, o.soft === undefined ? 0.2 : o.soft);
  const p = g.createPattern(cv, 'repeat'), s = o.s || 0.3;
  if (p.setTransform) p.setTransform(new DOMMatrix([s, 0, 0, s, o.ox || 0, o.oy || 0]));
  g.save(); pathFn(g); g.clip(); pathFn(g); g.globalAlpha *= o.a === undefined ? 0.6 : o.a; g.strokeStyle = p; g.lineWidth = (o.w || 2) * 2; g.stroke(); g.restore();
}
// temp-layer helper: draw something into a scratch canvas covering [x0,y0,x1,y1], optionally mask it (destination-in), composite it onto g
function layer(g, x0, y0, x1, y1, drawFn, maskFn, alpha, mode) {
  const ss = CUR_SS, w = Math.max(1, Math.ceil((x1 - x0) * ss)), h = Math.max(1, Math.ceil((y1 - y0) * ss));
  const c = U.canvas(w, h), t = c.getContext('2d');
  t.setTransform(ss, 0, 0, ss, -x0 * ss, -y0 * ss); t.lineJoin = 'round'; t.lineCap = 'round';
  drawFn(t);
  if (maskFn) { t.globalCompositeOperation = 'destination-in'; maskFn(t); }
  g.save(); if (alpha !== undefined) g.globalAlpha *= alpha; if (mode) g.globalCompositeOperation = mode; g.drawImage(c, x0, y0, c.width / ss, c.height / ss); g.restore();
}
// splat masked by a vertical alpha ramp (e.g. rust that collects toward the bottom, dust toward the top)
function splatV(g, x0, y0, x1, y1, o, ya, yb, a0, a1) {
  layer(g, x0, y0, x1, y1, (t) => splat(t, x0, y0, x1, y1, o), (t) => { t.fillStyle = lgrad(t, 0, ya, 0, yb, [[0, 'rgba(0,0,0,' + a0 + ')'], [1, 'rgba(0,0,0,' + a1 + ')']]); t.fillRect(x0, y0, x1 - x0, y1 - y0); });
}
const _ov = {};
function overlay(g, x0, y0, x1, y1, o) {          // grayscale grain / noise overlay (soft-light, overlay...)
  const F = fields(), N = F.N, kind = o.k || 'mid';
  let cv = _ov[kind]; if (!cv) { cv = U.canvas(N, N); const t = cv.getContext('2d'), img = t.createImageData(N, N); for (let i = 0; i < N * N; i++) { const v = F[kind][i] * 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; } t.putImageData(img, 0, 0); _ov[kind] = cv; }
  const p = g.createPattern(cv, 'repeat'), s = o.s || 0.3; if (p.setTransform) p.setTransform(new DOMMatrix([s, 0, 0, s, o.ox || 0, o.oy || 0]));
  g.save(); g.globalAlpha *= o.a === undefined ? 0.3 : o.a; g.globalCompositeOperation = o.mode || 'overlay'; g.fillStyle = p; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
}

// ================================================================== additive light / smoke sprites
const _glow = {};
function glowSpr(rgbStr) {
  let s = _glow[rgbStr];
  if (!s) {
    s = U.canvas(64, 64); const g = s.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(' + rgbStr + ',1)'); gr.addColorStop(0.16, 'rgba(' + rgbStr + ',0.66)'); gr.addColorStop(0.42, 'rgba(' + rgbStr + ',0.22)'); gr.addColorStop(0.72, 'rgba(' + rgbStr + ',0.05)'); gr.addColorStop(1, 'rgba(' + rgbStr + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _glow[rgbStr] = s;
  }
  return s;
}
function glow(ctx, x, y, r, rgbStr, a, sx, sy) {   // additive halo; a > 1 over-exposes
  if (FO || a <= 0.004 || r <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); if (sx !== undefined) ctx.scale(sx, sy);
  const spr = glowSpr(rgbStr);
  for (let k = a; k > 0.004; k -= 1) { ctx.globalAlpha = k > 1 ? 1 : k; ctx.drawImage(spr, -r, -r, r * 2, r * 2); }
  ctx.restore();
}
const _puff = {};
function puffSpr(rgbStr) {                        // soft opaque-ish smoke / steam disc (normal blending)
  let s = _puff[rgbStr];
  if (!s) {
    s = U.canvas(48, 48); const g = s.getContext('2d');
    const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, 'rgba(' + rgbStr + ',0.9)'); gr.addColorStop(0.5, 'rgba(' + rgbStr + ',0.5)'); gr.addColorStop(1, 'rgba(' + rgbStr + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 48, 48); _puff[rgbStr] = s;
  }
  return s;
}
const flick = (t, s) => 0.5 + 0.5 * (U.vnoise(t * 17 + s * 3.7, s * 1.3, 5) * 2 - 1) * 0.9 + 0.14 * sin(t * 43 + s * 5.1);
// column of drifting puffs rising from (x,y) (in the current transform): steam jets, exhaust, wreck smoke. dir = angle of travel
function smoke(ctx, x, y, t, o) {
  if (FO) return;
  const n = o.n || 6, rise = o.rise || 26, spread = o.spread || 3, r0 = o.r0 || 2, r1 = o.r1 || 7, sp = o.speed || 0.42, a = o.a === undefined ? 0.45 : o.a, dir = o.dir === undefined ? -HP2 : o.dir, sd = o.seed || 0;
  const dx = cos(dir), dy = sin(dir);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const p = (t * sp + i / n + sd * 0.137) % 1, w = sin(p * 5 + i * 1.9 + sd) * spread * p, px = x + dx * p * rise - dy * w + (o.drift || 0) * p * p, py = y + dy * p * rise + dx * w, r = r0 + (r1 - r0) * p;
    ctx.globalAlpha = a * (1 - p) * sstep(0, o.fade === undefined ? 0.12 : o.fade, p);
    ctx.drawImage(puffSpr(o.col || (p < 0.4 ? '70,66,62' : '110,106,100')), px - r, py - r, r * 2, r * 2);
  }
  ctx.restore();
}
const HP2 = PI / 2;
function sparks(ctx, x, y, t, k, ang0, o) {       // short bright streaks flung out of a point, re-rolled ~28 times a second
  if (FO || k <= 0.04) return;
  o = o || {}; const n = o.n || 9, spread = o.spread === undefined ? 2.4 : o.spread, ln = o.len || 6, sd = o.seed || 0;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const f = Math.floor(t * (o.rate || 28)) + sd * 17;
  for (let i = 0; i < n; i++) {
    const h1 = U.hash2(f, i, 51), h2 = U.hash2(f, i, 52), a = ang0 + (h1 - 0.5) * spread, l = (1.5 + h2 * ln) * k, d0 = 1 + h2 * 3;
    ctx.strokeStyle = 'rgba(' + (o.col || '255,' + (180 + (h1 * 60 | 0)) + ',' + (70 + (h2 * 70 | 0))) + ',' + (0.9 * k) + ')'; ctx.lineWidth = o.lw || 0.6;
    ctx.beginPath(); ctx.moveTo(x + cos(a) * d0, y + sin(a) * d0); ctx.lineTo(x + cos(a) * (d0 + l), y + sin(a) * (d0 + l)); ctx.stroke();
  }
  ctx.restore(); glow(ctx, x, y, o.glow || 8, o.gcol || '255,190,90', 0.5 * k);
}

// ================================================================== kinematics
// two-link IK; returns [kneeX, kneeY, footX, footY]. mode: true|'up' -> higher (smaller y), 'down' -> lower, 'back' -> smaller x, 'fwd' -> larger x
function ik2(hx, hy, fx, fy, l1, l2, mode) {
  let dx = fx - hx, dy = fy - hy, d = hypot(dx, dy); const maxd = l1 + l2 - 0.02, mind = abs(l1 - l2) + 0.05;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; } else if (d < mind) { const s = mind / (d || 1); dx = (dx || 0.01) * s; dy *= s; d = mind; }
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), base = atan2(dy, dx);
  const k1x = hx + cos(base + a) * l1, k1y = hy + sin(base + a) * l1, k2x = hx + cos(base - a) * l1, k2y = hy + sin(base - a) * l1;
  let first;
  if (mode === 'down') first = k1y > k2y; else if (mode === 'back') first = k1x < k2x; else if (mode === 'fwd') first = k1x > k2x; else first = k1y < k2y;
  return first ? [k1x, k1y, hx + dx, hy + dy] : [k2x, k2y, hx + dx, hy + dy];
}
// gait foot offset for cycle position u: stance (duty d) sweeps +A -> -A on the ground, swing lifts and returns
function gait(u, d, A, lift) {
  u -= Math.floor(u);
  if (u < d) return [lerp(A, -A, u / d), 0];
  const k = (u - d) / (1 - d), e = k * k * (3 - 2 * k);
  return [lerp(-A, A, e), -lift * sin(k * PI)];
}
const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

// ================================================================== per-entity smoothing (pose cross-fades)
const SM = new WeakMap();
function smoothState(e, target, rate) {
  let s = SM.get(e);
  if (!s) { s = { t: nz(e.t, 0), v: {} }; for (const k in target) s.v[k] = isFinite(target[k]) ? target[k] : 0; SM.set(e, s); return s.v; }
  const dt = nz(e.t, 0) - s.t; s.t = nz(e.t, 0);
  if (dt > 0.3 || dt < 0) { for (const k in target) if (isFinite(target[k])) s.v[k] = target[k]; return s.v; }
  if (dt <= 0) return s.v;
  for (const k in target) { const tv = target[k]; if (isFinite(tv)) { if (s.v[k] === undefined) s.v[k] = tv; else s.v[k] += (tv - s.v[k]) * (1 - Math.exp(-(rate[k] || rate._ || 10) * dt)); } }
  return s.v;
}
const isDead = (e) => !!(e.dead || e.state === 'dead');
function deadT(e) { return nz(e.deadT, nz(e.t, 0)); }

// ================================================================== DEATHCLAW  (hitbox 90 x 104, hunched biped)
// Figure frame: origin = ground contact under the hitbox centre, +x = facing direction, y negative = up.
// Parts are authored facing right. Limb sprites are horizontal tubes (length along +x, lit side = -y).
const DC = {
  hide: [166, 126, 80], hideD: [92, 66, 42], hideL: [216, 184, 132], olive: [126, 118, 64], red: [170, 90, 52], dust: [200, 174, 132], bruise: [66, 40, 30],
  horn: [138, 100, 66], hornD: [46, 32, 26], claw: [60, 47, 38], tooth: [236, 220, 180], mouth: [112, 30, 34], tongue: [190, 84, 88],
};

// scattered small leathery scales: alternating lighter / darker cells with a shaded lower and lit upper rim
function scales(g, x0, y0, x1, y1, sz, R, k) {
  const rh = sz * 0.8; let row = 0; k = k === undefined ? 1 : k;
  g.save();
  for (let y = y0; y < y1 + sz; y += rh, row++) {
    for (let x = x0 - (row & 1 ? 0 : sz * 0.5); x < x1 + sz; x += sz) {
      const jx = x + R.range(-0.2, 0.2) * sz, jy = y + R.range(-0.2, 0.2) * sz, s = sz * R.range(0.72, 1.12), q = R.next();
      g.fillStyle = q < 0.5 ? 'rgba(255,232,186,' + (k * (0.04 + q * 0.12)) + ')' : 'rgba(26,14,6,' + (k * (0.04 + (q - 0.5) * 0.2)) + ')';
      g.beginPath(); g.ellipse(jx, jy, s * 0.52, s * 0.44, 0, 0, TAU); g.fill();
      g.lineWidth = Math.max(0.22, sz * 0.1);
      g.strokeStyle = 'rgba(24,12,4,' + (k * (0.14 + R.next() * 0.18)) + ')'; g.beginPath(); g.arc(jx, jy, s * 0.5, 0.2, PI - 0.2); g.stroke();
      g.strokeStyle = 'rgba(255,236,196,' + (k * (0.05 + R.next() * 0.1)) + ')'; g.beginPath(); g.arc(jx, jy, s * 0.5, PI + 0.5, TAU - 0.3); g.stroke();
    }
  }
  g.restore();
}
// soft darkening that hugs the silhouette (gives round volume): a few nested strokes clipped to the shape
function softEdge(g, pathFn, w, a, col) {
  g.save(); pathFn(g); g.clip();
  for (let i = 0; i < 4; i++) { pathFn(g); g.lineWidth = w * (2 - i * 0.42); g.strokeStyle = (col || 'rgba(18,10,4,') + (a / 3.2) + ')'; g.stroke(); }
  g.restore();
}
// paint reptile hide inside pathFn. b = [x0,y0,x1,y1] bounds. o: {base, pig (vertical pigment stops), sz, seed, ts, detail(g,R), over(g,R), hiA, shA, line, edge}
function hide(g, pathFn, b, o) {
  o = o || {};
  const R = U.RNG(o.seed || 7), x0 = b[0], y0 = b[1], x1 = b[2], y1 = b[3], base = o.base || DC.hide, ts = o.ts || 0.34, rr = () => R.range(0, 250);
  g.save(); pathFn(g); g.clip();
  const pig = o.pig || [[0, mixc(base, DC.hideD, 0.55)], [0.4, base], [0.75, mixc(base, DC.hideL, 0.3)], [1, mixc(base, DC.hideL, 0.55)]];
  g.fillStyle = lgrad(g, 0, y0, 0, y1, pig.map((s) => [s[0], typeof s[1] === 'string' ? s[1] : css(s[1])])); g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  splat(g, x0, y0, x1, y1, { k: 'blot', c: DC.olive, a: 0.4, th: 0.5, soft: 0.28, s: ts, ox: rr(), oy: rr() });
  splat(g, x0, y0, x1, y1, { k: 'mid', c: DC.red, a: 0.3, th: 0.56, soft: 0.22, s: ts * 0.8, ox: rr(), oy: rr() });
  splat(g, x0, y0, x1, y1, { k: 'blot', c: [40, 26, 16], a: 0.34, th: 0.58, soft: 0.2, s: ts * 1.1, ox: rr(), oy: rr() });
  splat(g, x0, y0, x1, y1, { k: 'fine', c: DC.dust, a: 0.24, th: 0.62, soft: 0.16, s: ts * 0.6, ox: rr(), oy: rr() });
  scales(g, x0, y0, x1, y1, o.sz || 2.3, R, o.sk);
  overlay(g, x0, y0, x1, y1, { k: 'mid', s: 0.25, a: 0.28, mode: 'soft-light', ox: rr(), oy: rr() });
  if (o.detail) o.detail(g, R);
  g.fillStyle = lgrad(g, 0, y0, 0, y1, [[0, 'rgba(255,238,200,' + (o.hiA === undefined ? 0.3 : o.hiA) + ')'], [0.3, 'rgba(255,238,200,0)'], [0.62, 'rgba(24,14,8,0.08)'], [1, 'rgba(18,10,6,' + (o.shA === undefined ? 0.6 : o.shA) + ')']]);
  g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  if (o.edge !== 0) softEdge(g, pathFn, o.edge || 1.6, 0.5);
  if (o.over) o.over(g, R);
  g.restore();
  rim(g, pathFn, 0, y0, 0, y0 + (y1 - y0) * 0.45, 'rgba(255,226,170,0.55)', 'rgba(255,226,170,0)', o.rimW || 1.4);
  outline(g, pathFn, o.line || 0.6, o.lineCol || 'rgba(24,14,8,0.62)');
}
// horizontal tapered limb sprite: from (0,0) to (len,0), half-width prof(k). o: {seed, spikes:[{k,h,lean,w}], detail, over, base, sz, prof0/prof1 cap radii}
function hideTube(len, prof, o) {
  o = o || {};
  let wm = 0; for (let i = 0; i <= 12; i++) wm = max(wm, prof(i / 12));
  const sl = o.spikeLen || 0, padx = wm + 2.5, H = wm * 2 + 5 + sl * 2, W = len + padx * 2, N = 16;
  return part(W, H, padx, H / 2, (g) => {
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) { const k = i / N, w = prof(k); top.push([k * len, -w]); bot.push([k * len, w]); }
    const path = (g) => {
      g.beginPath(); g.moveTo(top[0][0], top[0][1]);
      for (let i = 1; i <= N; i++) g.lineTo(top[i][0], top[i][1]);
      g.arc(len, 0, prof(1), -PI / 2, PI / 2);
      for (let i = N; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
      g.arc(0, 0, prof(0), PI / 2, PI * 1.5); g.closePath();
    };
    if (o.spikes) for (const s of o.spikes) {          // bony spikes behind the tube so its edge overlaps their roots
      const x = s.k * len, w = prof(s.k), sd = s.side === undefined ? -1 : s.side, lean = s.lean === undefined ? -0.6 : s.lean, hh = s.h || 4, ww = s.w || 1.6;
      g.beginPath(); g.moveTo(x - ww, sd * (w - 0.4)); g.quadraticCurveTo(x + lean * hh * 0.5 - ww * 0.2, sd * (w + hh * 0.6), x + lean * hh, sd * (w + hh)); g.quadraticCurveTo(x + ww * 0.4, sd * (w + hh * 0.3), x + ww, sd * (w - 0.4)); g.closePath();
      g.fillStyle = lgrad(g, 0, sd * w, 0, sd * (w + hh), [[0, T(DC.horn, 0.8)], [1, T(DC.hornD, 1.1)]]); g.fill(); g.strokeStyle = 'rgba(16,10,6,0.7)'; g.lineWidth = 0.4; g.stroke();
    }
    hide(g, path, [-wm - 1, -wm - 1, len + wm + 1, wm + 1], {
      base: o.base, seed: o.seed, sz: o.sz, ts: o.ts, hiA: o.hiA, shA: o.shA, edge: o.edge,
      pig: o.pig || [[0, css(mixc(o.base || DC.hide, DC.hideD, 0.3))], [0.5, css(o.base || DC.hide)], [1, css(mixc(o.base || DC.hide, DC.hideL, 0.3))]],
      detail: (g, R) => {
        // joint darkening at both ends of the segment
        g.fillStyle = lgrad(g, 0, 0, len, 0, [[0, 'rgba(20,10,4,0.42)'], [0.14, 'rgba(20,10,4,0)'], [0.86, 'rgba(20,10,4,0)'], [1, 'rgba(20,10,4,0.42)']]); g.fillRect(-wm - 2, -wm - 2, len + wm * 2 + 4, wm * 2 + 4);
        if (o.detail) o.detail(g, R, len, wm);
      },
      over: o.over && ((g, R) => o.over(g, R, len, wm)),
    });
  });
}

// curved dark keratin claw: root at (0,0), tip at (len, curl) after rotation a
function claw(g, x, y, a, len, w, curl, c, o) {
  o = o || {};
  g.save(); g.translate(x, y); g.rotate(a);
  const cp = (g) => { g.beginPath(); g.moveTo(-0.5, -w); g.bezierCurveTo(len * 0.45, -w * 0.9, len * 0.86, -w * 0.25 + curl * 0.4, len, curl); g.bezierCurveTo(len * 0.86, w * 0.3 + curl * 0.4, len * 0.45, w * 0.82, -0.5, w); g.closePath(); };
  g.save(); cp(g); g.clip();
  g.fillStyle = lgrad(g, 0, -w, 0, w, [[0, T(c, 1.55)], [0.35, T(c, 1.0)], [0.75, T(c, 0.6)], [1, T(c, 0.38)]]); g.fillRect(-1, -w - 1, len + 2, w * 2 + 2 + abs(curl));
  g.fillStyle = lgrad(g, 0, 0, len, 0, [[0, 'rgba(120,96,70,0.32)'], [0.28, 'rgba(0,0,0,0)'], [0.85, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]); g.fillRect(-1, -w - 1, len + 2, w * 2 + 2 + abs(curl));
  g.strokeStyle = 'rgba(255,240,214,0.55)'; g.lineWidth = Math.max(0.28, w * 0.2); g.beginPath(); g.moveTo(len * 0.06, -w * 0.5); g.quadraticCurveTo(len * 0.5, -w * 0.55 + curl * 0.1, len * 0.9, curl * 0.72); g.stroke();
  g.strokeStyle = 'rgba(10,6,4,0.4)'; g.lineWidth = 0.2; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(len * i * 0.2, -w * 0.7); g.quadraticCurveTo(len * i * 0.2 + 0.5, 0, len * i * 0.2, w * 0.7); g.stroke(); }
  g.restore();
  cp(g); g.strokeStyle = 'rgba(14,8,4,0.8)'; g.lineWidth = 0.4; g.stroke();
  g.restore();
}

// leathery skin fold: a dark crease with a lit lip under it
function crease(g, x0, y0, cx, cy, x1, y1, w, a) {
  g.save(); g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,232,190,' + (0.22 * a) + ')'; g.lineWidth = w * 0.8; g.beginPath(); g.moveTo(x0 + 0.3, y0 + 0.5); g.quadraticCurveTo(cx + 0.3, cy + 0.5, x1 + 0.3, y1 + 0.5); g.stroke();
  g.strokeStyle = 'rgba(28,14,6,' + (0.5 * a) + ')'; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
  g.restore();
}
function scar(g, x0, y0, cx, cy, x1, y1, w) {         // healed scar: pale raised welt with dark stitch ticks
  g.save(); g.lineCap = 'round';
  g.strokeStyle = 'rgba(24,12,6,0.4)'; g.lineWidth = w * 1.5; g.beginPath(); g.moveTo(x0, y0 + 0.3); g.quadraticCurveTo(cx, cy + 0.3, x1, y1 + 0.3); g.stroke();
  g.strokeStyle = 'rgba(222,190,150,0.85)'; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
  g.strokeStyle = 'rgba(70,36,24,0.55)'; g.lineWidth = 0.22;
  for (let i = 1; i < 6; i++) { const u = i / 6, mu = 1 - u, x = mu * mu * x0 + 2 * mu * u * cx + u * u * x1, y = mu * mu * y0 + 2 * mu * u * cy + u * u * y1; g.beginPath(); g.moveTo(x - 0.4, y - w * 0.9); g.lineTo(x + 0.4, y + w * 0.9); g.stroke(); }
  g.restore();
}

// ---- head geometry (frame: origin = pivot at the back of the skull; +x = snout)
const HEAD_PTS = [[-5, -6], [-6, -12], [-2, -17], [6, -19], [14, -18], [20, -16], [25, -13.4], [29, -12], [34, -10], [39, -7.4], [42, -3.4], [41, 0.6], [37, 2.8], [30, 3.6], [22, 4.2], [15, 5], [12, 9.4], [6, 10], [-1, 7.4]];
const JAW_HINGE = [12.5, 5.6];
const JAW_PTS = [[-6, -3.2], [0, -4.2], [10, -3.8], [20, -3.4], [28, -3.2], [32.5, -1.4], [32, 2.2], [27, 5], [17, 6.6], [7, 8.2], [-2, 8.6], [-7.5, 4]];

function buildDeathclaw() {
  const P = {}, R = U.RNG(8080);

  // ---------------------------------------------------------------- torso + neck (origin = pelvis centre)
  const TP = [[-14, -5], [-7, -14], [1, -21.5], [9, -27.5], [16, -32], [22, -32.5], [27, -35], [33, -35], [35.5, -28], [32, -20], [30, -11], [26.5, -2], [22, 7], [11, 12.5], [0, 12.5], [-8, 8.5], [-15, 4]];
  const torsoPath = (g) => blob(g, TP);
  P.torso = part(76, 66, 26, 48, (g) => {
    // dorsal spines along the back (behind the body outline)
    const spine = [[-8, -15, 5, -0.9], [-2, -19.5, 6, -0.85], [4, -24, 7, -0.8], [10, -28.4, 8.2, -0.7], [16, -32, 8.6, -0.55], [21.5, -33, 7.6, -0.4], [26.5, -35.4, 6.6, -0.2]];
    for (const s of spine) {
      const x = s[0], y = s[1], h = s[2], lean = s[3];
      g.beginPath(); g.moveTo(x - 2.4, y + 1.6); g.quadraticCurveTo(x - 0.4 + lean * 2, y - h * 0.7, x + lean * h * 1.5, y - h); g.quadraticCurveTo(x + 1.2, y - h * 0.2, x + 2.6, y + 2); g.closePath();
      g.fillStyle = lgrad(g, x, y, x, y - h, [[0, T(DC.horn, 0.7)], [0.5, T(DC.horn, 0.95)], [1, T(DC.hornD, 1.2)]]); g.fill(); g.strokeStyle = 'rgba(16,10,6,0.75)'; g.lineWidth = 0.45; g.stroke();
      g.strokeStyle = 'rgba(255,238,200,0.35)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(x + 0.2, y - 1); g.quadraticCurveTo(x + lean * 1.5, y - h * 0.6, x + lean * h * 1.4, y - h * 0.95); g.stroke();
    }
    hide(g, torsoPath, [-16, -37, 37, 14], {
      seed: 101, sz: 2.6, edge: 2.2,
      pig: [[0, css(mixc(DC.hide, DC.hideD, 0.78))], [0.2, css(mixc(DC.hide, DC.hideD, 0.45))], [0.55, css(DC.hide)], [0.8, css(mixc(DC.hide, DC.hideL, 0.5))], [1, css(mixc(DC.hide, DC.hideL, 0.7))]],
      detail: (g, R) => {
        // belly scutes: pale ventral plates in horizontal bands
        g.save(); g.beginPath(); g.moveTo(34, -20); g.quadraticCurveTo(38, 4, 20, 14); g.lineTo(-10, 14); g.lineTo(-15, 4); g.quadraticCurveTo(10, 3, 26, -12); g.closePath(); g.clip();
        for (let i = 0; i < 12; i++) { const y = -14 + i * 2.3; g.strokeStyle = 'rgba(70,40,20,0.32)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(-14, y + 8 - i * 0.4); g.quadraticCurveTo(12, y + 2 + i * 0.3, 36, y - 10 + i * 0.2); g.stroke(); g.strokeStyle = 'rgba(255,236,196,0.16)'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(-14, y + 8.6 - i * 0.4); g.quadraticCurveTo(12, y + 2.6 + i * 0.3, 36, y - 9.4 + i * 0.2); g.stroke(); }
        g.restore();
        // ribs / flank muscle striations
        for (let i = 0; i < 5; i++) crease(g, 2 + i * 4.2, -8 + i * 0.5, 4 + i * 4.2, -1, 2 + i * 4.6, 6 + i * 0.4, 0.5, 0.7);
        // chest / pectoral definition and shoulder mass
        crease(g, 30, -14, 22, -6, 12, -8, 0.8, 0.9);
        crease(g, 24, -30, 16, -22, 15, -13, 0.7, 0.7);
        // scars: claw rakes across the flank and a healed gash on the chest
        scar(g, -2, -10, 3, -4, 7, 3, 0.6); scar(g, 1, -12, 6, -6, 10, 1, 0.55); scar(g, 4, -13.5, 9, -8, 13, -1, 0.5);
        scar(g, 22, -4, 26, 2, 29, 8, 0.7);
        // bullet pocks and a burn scar
        for (const p of [[10, -16], [13, -12], [18, -20], [6, -18], [-3, -6]]) { g.fillStyle = 'rgba(38,20,12,0.7)'; g.beginPath(); g.arc(p[0], p[1], 0.7, 0, TAU); g.fill(); g.strokeStyle = 'rgba(224,190,150,0.55)'; g.lineWidth = 0.25; g.beginPath(); g.arc(p[0], p[1], 1.15, 0.2, 2.2); g.stroke(); }
        splat(g, -10, -26, 30, 8, { k: 'mid', c: DC.bruise, a: 0.34, th: 0.66, soft: 0.12, s: 0.5, ox: 40, oy: 90 });
        // neck skin folds
        crease(g, 28, -29, 32, -26, 34, -20, 0.6, 0.7); crease(g, 26, -25, 30, -22, 31.5, -16, 0.5, 0.6);
      },
      over: (g) => {
        egrad(g, 10, -22, 22, 12, -0.25, [[0, 'rgba(255,224,168,0.30)'], [1, 'rgba(255,214,150,0)']], 0.2, -0.3, 0);       // sun on the shoulders and back
        egrad(g, 18, 10, 26, 8, 0, [[0, 'rgba(255,210,150,0.18)'], [1, 'rgba(255,200,140,0)']], 0, 0, 0);                    // warm bounce under the belly
        streak(g, 4, -25, 14, -32, 25, -35, 1.6, 'rgba(255,238,200,0.26)');
      },
    });
  });

  // ---------------------------------------------------------------- tail segments (dorsal spikes, tapering)
  P.tail = [];
  const tw = [9.8, 8.0, 6.3, 4.8, 3.4, 1.5], TL = 6.2;
  for (let i = 0; i < 5; i++) {
    const w0 = tw[i], w1 = tw[i + 1];
    P.tail.push(hideTube(TL, (k) => lerp(w0, w1, k), { seed: 300 + i, sz: 2.2, spikeLen: 6, spikes: [{ k: 0.55, h: 5.6 - i * 0.6, lean: -0.7, w: 1.8, side: -1 }], detail: (g) => { crease(g, TL * 0.5, -w0, TL * 0.55, 0, TL * 0.5, w0, 0.5, 0.6); } }));
  }

  // ---------------------------------------------------------------- legs
  P.thigh = hideTube(25, (k) => lerp(11.5, 6.4, Math.pow(k, 0.85)) + 1.7 * sin(PI * Math.pow(k, 0.8)), {
    seed: 401, sz: 2.4,
    detail: (g, R, len) => { for (let i = 0; i < 4; i++) crease(g, 3 + i * 1.5, -8 + i * 2.6, len * 0.5, -6 + i * 3, len - 3, -2 + i * 1.6, 0.45, 0.6); scar(g, 5, -3, 12, 1, 19, -1, 0.55); },
    over: (g, R, len) => { streak(g, 3, -9, 12, -12.5, 21, -6, 1.6, 'rgba(255,238,200,0.3)'); },
  });
  P.shin = hideTube(24, (k) => lerp(6.5, 3.5, k) + 1.4 * sin(PI * Math.pow(k, 0.7)), {
    seed: 411, sz: 2.1,
    detail: (g, R, len) => { crease(g, 4, -3, 10, -1, 18, -2.4, 0.4, 0.7); },
    over: (g) => { streak(g, 3, -5.4, 10, -7, 20, -3.4, 1.0, 'rgba(255,238,200,0.28)'); },
  });
  P.meta = hideTube(19, (k) => lerp(3.7, 3.0, k), {
    seed: 421, sz: 1.8, base: mixc(DC.hide, DC.hideD, 0.25), spikes: [{ k: 0.02, h: 3.6, lean: -1.0, w: 1.6, side: -1 }], spikeLen: 4,
    detail: (g) => { for (let i = 0; i < 5; i++) crease(g, 2 + i * 3.4, -3, 2.4 + i * 3.4, 0, 2 + i * 3.4, 3, 0.4, 0.6); },
  });
  // foot: origin = ball joint (MTP), toes point along +x, claws curl toward +y
  const toeSpecs = [{ y: -2.6, l: 10.5, a: -0.16, w: 2.4, cl: 6.4 }, { y: 0.2, l: 12, a: 0.06, w: 2.6, cl: 7.2 }, { y: 2.6, l: 10, a: 0.26, w: 2.3, cl: 6.2 }];
  P.foot = part(34, 22, 8, 11, (g) => {
    const drawToe = (t, far) => {
      const x1 = t.l * cos(t.a), y1 = t.y + t.l * sin(t.a);
      claw(g, x1 - 0.4, y1, t.a + 0.1, t.cl, 1.4, 1.9, DC.claw);
      const tp = (g) => { g.beginPath(); g.moveTo(-1, t.y - t.w); g.quadraticCurveTo(t.l * 0.5, t.y - t.w * 0.85 + t.l * 0.5 * sin(t.a) * 0.5, x1, y1 - t.w * 0.7); g.arc(x1, y1, t.w * 0.7, -HP2, HP2); g.quadraticCurveTo(t.l * 0.5, t.y + t.w * 0.95 + t.l * 0.5 * sin(t.a) * 0.5, -1, t.y + t.w); g.closePath(); };
      hide(g, tp, [-1, t.y - 3, x1 + 2, t.y + 4 + t.l * sin(t.a)], { seed: 430 + (far | 0) + Math.round(t.y * 3), sz: 1.6, base: mixc(DC.hide, DC.hideD, 0.2), edge: 0.8, line: 0.5 });
      // toe pad + knuckle bumps
      g.fillStyle = 'rgba(30,16,8,0.32)'; g.beginPath(); g.ellipse(x1 - 3.2, y1 + t.w * 0.55, 2.2, 0.8, t.a, 0, TAU); g.fill();
    };
    for (const t of toeSpecs) drawToe(t, 0);
    // ball of the foot (over the toe roots)
    const bp = (g) => blob(g, [[-3.4, -3.6], [1.6, -4.4], [4.6, -2.2], [4.8, 2.8], [1.6, 4.4], [-3.2, 3.6], [-4.6, 0]]);
    hide(g, bp, [-5, -5, 6, 5], { seed: 441, sz: 1.8, edge: 1, line: 0.55 });
  });

  // ---------------------------------------------------------------- arms
  P.uarm = hideTube(20, (k) => lerp(9.6, 7.2, k) + 2.0 * sin(PI * Math.pow(k, 0.7)), {
    seed: 501, sz: 2.5,
    detail: (g, R, len) => { crease(g, 4, -7, 9, -4, 15, -7.4, 0.5, 0.7); crease(g, 6, 5, 11, 3.6, 16, 5.6, 0.5, 0.6); scar(g, 6, 2, 11, 5, 16, 3, 0.5); },
    over: (g) => { streak(g, 2, -9.4, 9, -12.4, 18, -8.4, 1.6, 'rgba(255,238,200,0.32)'); },
  });
  P.farm = hideTube(24, (k) => lerp(7.8, 4.8, k) + 3.6 * sin(PI * Math.pow(k, 0.72)), {
    seed: 511, sz: 2.3, spikeLen: 5, spikes: [{ k: 0.05, h: 5.2, lean: -0.9, w: 1.9, side: -1 }, { k: 0.2, h: 3.6, lean: -0.8, w: 1.5, side: -1 }, { k: 0.34, h: 2.6, lean: -0.7, w: 1.3, side: -1 }],
    detail: (g, R, len) => {
      for (let i = 0; i < 4; i++) crease(g, 4 + i * 0.8, -6 + i * 3.2, len * 0.45, -5 + i * 3.2, len - 3, -2 + i * 1.6, 0.45, 0.6);         // tendons
      scar(g, 8, -4, 14, 0, 20, -2, 0.55);
    },
    over: (g) => { streak(g, 3, -8.6, 10, -12.4, 20, -6, 1.7, 'rgba(255,238,200,0.32)'); },
  });
  // hand: origin = wrist, fingers point along +x with claws curling toward +y (palm side)
  P.hand = part(40, 26, 8, 13, (g) => {
    const fingers = [{ y: -4.4, a: -0.34, l: 5.6, cl: 16.5 }, { y: -0.8, a: -0.04, l: 6.4, cl: 18.5 }, { y: 2.6, a: 0.28, l: 5.8, cl: 16.8 }];
    const thumb = { y: 5.4, a: 0.9, l: 3.8, cl: 8.5 };
    // far-most claws first
    const fing = (f, i) => {
      const x1 = 2.6 + f.l * cos(f.a), y1 = f.y + f.l * sin(f.a);
      claw(g, x1 - 0.6, y1, f.a + 0.08, f.cl, 1.85, 3.2 + i * 0.4, DC.claw);
      const fp = (g) => { g.beginPath(); g.moveTo(1, f.y - 2.5); g.quadraticCurveTo(x1 - 1, y1 - 2.6, x1, y1 - 2.1); g.arc(x1, y1, 2.1, -HP2, HP2); g.quadraticCurveTo(x1 - 1, y1 + 2.6, 1, f.y + 2.5); g.closePath(); };
      hide(g, fp, [0, f.y - 4, x1 + 3, y1 + 4], { seed: 520 + i, sz: 1.6, base: mixc(DC.hide, DC.hideD, 0.3), edge: 0.7, line: 0.5 });
      g.fillStyle = 'rgba(224,190,150,0.5)'; g.beginPath(); g.arc(x1 - 0.6, y1 - 0.8, 0.9, 0, TAU); g.fill();       // knuckle
    };
    claw(g, 2.6 + thumb.l * cos(thumb.a) - 0.4, thumb.y + thumb.l * sin(thumb.a), thumb.a + 0.5, thumb.cl, 1.5, 2.6, DC.claw);
    fingers.forEach(fing);
    const pp = (g) => blob(g, [[-5, -4.6], [0, -6.4], [4.6, -5.6], [6.4, -1.6], [6.2, 3.6], [3.6, 6.4], [-1.6, 6.6], [-5.6, 3.4]]);
    hide(g, pp, [-6, -7, 7, 7], { seed: 531, sz: 1.9, edge: 1.3, line: 0.6, detail: (g) => { crease(g, -2, -3, 2, 0, 0, 4, 0.4, 0.7); } });
  });

  // ---------------------------------------------------------------- horns (near horn is baked into the head sprite; the far one is a separate darker sprite)
  const hornPath = (g, base, ctl1, ctl2, tip, w) => {
    g.beginPath(); g.moveTo(base[0] - w, base[1] + 1);
    g.bezierCurveTo(ctl1[0] - w * 0.8, ctl1[1] - w * 0.5, ctl2[0] - w * 0.4, ctl2[1] - w * 0.4, tip[0], tip[1]);
    g.bezierCurveTo(ctl2[0] + w * 0.3, ctl2[1] + w * 0.7, ctl1[0] + w * 0.9, ctl1[1] + w * 0.8, base[0] + w, base[1] + 1.5); g.closePath();
  };
  const horn = (g, base, c1, c2, tip, w, dim) => {
    const hp = (g) => hornPath(g, base, c1, c2, tip, w);
    g.save(); hp(g); g.clip();
    g.fillStyle = lgrad(g, base[0], base[1], tip[0], tip[1], [[0, T(DC.horn, 0.95 * dim)], [0.4, T(mixc(DC.horn, DC.hornD, 0.4), dim)], [1, T(DC.hornD, dim)]]); g.fillRect(-40, -50, 90, 70);
    g.fillStyle = lgrad(g, 0, base[1] - 8, 0, base[1] + 6, [[0, 'rgba(255,236,200,' + 0.28 * dim + ')'], [0.5, 'rgba(255,236,200,0)'], [1, 'rgba(10,6,4,0.4)']]); g.fillRect(-40, -50, 90, 70);
    // growth rings
    for (let i = 1; i < 9; i++) { const u = i / 9.5, mu = 1 - u, x = mu * mu * mu * base[0] + 3 * mu * mu * u * c1[0] + 3 * mu * u * u * c2[0] + u * u * u * tip[0], y = mu * mu * mu * base[1] + 3 * mu * mu * u * c1[1] + 3 * mu * u * u * c2[1] + u * u * u * tip[1]; g.strokeStyle = 'rgba(20,10,6,0.35)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(x - 0.9, y - w * (1 - u) - 0.4); g.lineTo(x + 0.9, y + w * (1 - u) + 0.6); g.stroke(); }
    g.strokeStyle = 'rgba(255,240,214,' + 0.5 * dim + ')'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(base[0] - 1, base[1] - 0.6); g.bezierCurveTo(c1[0] - 1.5, c1[1] - 1.6, c2[0] - 1, c2[1] - 1.4, tip[0] + 2, tip[1] - 0.2); g.stroke();
    g.restore(); hp(g); g.strokeStyle = 'rgba(12,6,4,0.78)'; g.lineWidth = 0.5; g.stroke();
  };
  P.hornFar = part(56, 48, 36, 40, (g) => { horn(g, [12, -18], [6, -31], [-8, -38], [-24, -31], 5.2, 0.6); });

  // ---------------------------------------------------------------- head (origin = pivot at the back of the skull)
  const headPath = (g) => blob(g, HEAD_PTS);
  P.head = part(82, 56, 34, 38, (g) => {
    // ear fins / cheek spikes trailing behind the jaw joint (behind the skull)
    for (const s of [[8, 6.4, -7, 9], [3, 6, -10, 5], [-1, 3.6, -11, 0.4]]) {
      g.beginPath(); g.moveTo(s[0], s[1]); g.quadraticCurveTo((s[0] + s[2]) / 2 + 1, (s[1] + s[3]) / 2 - 3, s[2], s[3]); g.quadraticCurveTo((s[0] + s[2]) / 2 - 1, (s[1] + s[3]) / 2 + 1, s[0] - 4, s[1] + 3.4); g.closePath();
      g.fillStyle = lgrad(g, s[0], s[1], s[2], s[3], [[0, T(DC.hide, 0.9)], [1, T(DC.hornD, 1.3)]]); g.fill(); g.strokeStyle = 'rgba(14,8,4,0.7)'; g.lineWidth = 0.4; g.stroke();
    }
    hide(g, headPath, [-8, -22, 44, 12], {
      seed: 601, sz: 1.9, edge: 1.6,
      pig: [[0, css(mixc(DC.hide, DC.hideD, 0.6))], [0.45, css(DC.hide)], [0.8, css(mixc(DC.hide, DC.hideL, 0.45))], [1, css(mixc(DC.hide, DC.hideL, 0.6))]],
      detail: (g, R) => {
        // brow ridge shadow, eye socket, cheek muscle, nose ridge wrinkles
        egrad(g, 23.6, -8.6, 6.4, 3.4, -0.32, [[0, 'rgba(20,8,4,0.85)'], [0.6, 'rgba(24,10,6,0.55)'], [1, 'rgba(24,10,6,0)']], 0, 0, 0);
        crease(g, 17, -13, 22, -15.6, 29, -12, 0.9, 0.9); crease(g, 30, -8, 33, -8.2, 36, -6.4, 0.5, 0.6); crease(g, 27, -10.6, 31, -10.4, 34, -9, 0.4, 0.6);
        for (let i = 0; i < 4; i++) crease(g, 8 + i * 1.6, -10 + i * 3.8, 10 + i * 1.6, -6 + i * 3.8, 13 + i * 1.6, -5.6 + i * 3.4, 0.4, 0.5);
        // horny plates across the crown and snout ridge
        for (let i = 0; i < 6; i++) { const x = 0 + i * 5.2; g.fillStyle = 'rgba(80,56,36,0.36)'; g.beginPath(); g.ellipse(x, -15.6 + Math.abs(i - 2) * 0.35, 2.2, 1.0, 0.1 - i * 0.05, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,232,190,0.22)'; g.lineWidth = 0.28; g.stroke(); }
        // scar across the snout (old claw slash) and a notch chipped from the brow
        scar(g, 28, -12, 32.5, -6, 33, 1.6, 0.6); scar(g, 24, -14, 29, -8, 30, -1, 0.45);
        g.fillStyle = 'rgba(30,18,10,0.55)'; g.beginPath(); g.ellipse(36.6, -4.6, 1.5, 0.75, 0.5, 0, TAU); g.fill();               // nostril
        g.fillStyle = 'rgba(255,240,214,0.35)'; g.beginPath(); g.ellipse(37.4, -6, 1.7, 0.5, 0.5, 0, TAU); g.fill();
      },
      over: (g) => {
        egrad(g, 16, -13, 16, 7, 0, [[0, 'rgba(255,226,170,0.34)'], [1, 'rgba(255,220,160,0)']], 0.1, -0.2, 0);
        streak(g, 4, -17, 16, -19, 27, -13, 1.3, 'rgba(255,240,206,0.36)');
        streak(g, 30, -11, 36, -9.6, 40.6, -4.4, 0.8, 'rgba(255,240,206,0.3)');
      },
    });
    // eye socket lid (dark under-lid so the amber eye glows out of a cavity) - the glowing eye itself is drawn per frame
    g.fillStyle = 'rgba(16,6,2,0.9)'; g.beginPath(); g.ellipse(23.8, -8.4, 3.6, 1.7, -0.3, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,220,170,0.4)'; g.lineWidth = 0.3; g.beginPath(); g.ellipse(23.8, -8.4, 3.8, 1.9, -0.3, 0.3, 2.6); g.stroke();
    // upper teeth (fangs) hanging below the lip line; far side row is darker and a little offset
    const tooth = (x, y, l, w, dim) => {
      g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.3, y + l * 0.6, x + 0.2, y + l); g.quadraticCurveTo(x + w * 0.5, y + l * 0.5, x + w, y); g.closePath();
      g.fillStyle = lgrad(g, x - w, 0, x + w, 0, [[0, T(DC.tooth, 1.0 * dim)], [1, T(DC.tooth, 0.55 * dim)]]); g.fill(); g.strokeStyle = 'rgba(30,20,12,0.7)'; g.lineWidth = 0.28; g.stroke();
    };
    for (const t of [[16.6, 4.8, 3.2, 1.0], [19.8, 4.6, 3.6, 1.1], [23, 4.4, 3.4, 1.05], [26.2, 4.0, 3.8, 1.15], [29.6, 3.8, 3.6, 1.1], [32.6, 3.5, 4.4, 1.2], [35.6, 3.0, 6.4, 1.5], [38.6, 1.6, 4.4, 1.2]]) tooth(t[0], t[1], t[2], t[3], 1);
    // lip line + gum
    g.strokeStyle = 'rgba(22,8,4,0.85)'; g.lineWidth = 0.55; g.beginPath(); g.moveTo(15, 5.2); g.quadraticCurveTo(28, 3.9, 39, 1.4); g.stroke();
    // near horn (in front of the skull, sweeping back over the neck)
    horn(g, [7.6, -18.4], [-1, -29], [-15, -34], [-29, -27], 6.6, 1);
  });
  P.jaw = part(48, 24, 12, 8, (g) => {
    const jp = (g) => blob(g, JAW_PTS);
    hide(g, jp, [-9, -6, 34, 10], { seed: 611, sz: 1.9, edge: 1.4, pig: [[0, css(mixc(DC.hide, DC.hideD, 0.3))], [0.6, css(mixc(DC.hide, DC.hideL, 0.2))], [1, css(mixc(DC.hide, DC.hideL, 0.6))]], shA: 0.4,
      detail: (g) => { for (let i = 0; i < 4; i++) crease(g, 2 + i * 6, 3.4, 4 + i * 6, 5.4, 6 + i * 6, 6.6, 0.4, 0.5); scar(g, 20, 0, 24, 2.6, 27, 4, 0.4); } });
    // lower teeth stand up out of the jaw line
    const tooth = (x, y, l, w) => {
      g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.3, y - l * 0.6, x + 0.3, y - l); g.quadraticCurveTo(x + w * 0.5, y - l * 0.5, x + w, y); g.closePath();
      g.fillStyle = lgrad(g, x - w, 0, x + w, 0, [[0, T(DC.tooth, 1.0)], [1, T(DC.tooth, 0.55)]]); g.fill(); g.strokeStyle = 'rgba(30,20,12,0.7)'; g.lineWidth = 0.28; g.stroke();
    };
    for (const t of [[6, -3.6, 2.8, 1.0], [9.4, -3.7, 3.2, 1.05], [12.8, -3.6, 3.6, 1.1], [16.4, -3.5, 3.4, 1.05], [20, -3.4, 3.8, 1.1], [23.6, -3.3, 4.2, 1.15], [27.4, -3.1, 5.2, 1.3], [30.6, -2.4, 3.6, 1.05]]) tooth(t[0], t[1], t[2], t[3]);
    g.strokeStyle = 'rgba(22,8,4,0.7)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-3, -3.4); g.lineTo(31, -2.6); g.stroke();
  });

  // ---------------------------------------------------------------- boulder for the throw
  P.rock = part(46, 44, 23, 22, (g) => {
    const rr = U.RNG(77), pts = [];
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + rr.range(-0.12, 0.12), r = (i % 2 ? 15.5 : 13.5) * rr.range(0.86, 1.1); pts.push([cos(a) * r, sin(a) * r * 0.94]); }
    const rp = (g) => poly(g, pts);
    g.save(); rp(g); g.clip();
    g.fillStyle = lgrad(g, -10, -14, 12, 14, [[0, css([168, 150, 124])], [0.5, css([124, 108, 88])], [1, css([70, 58, 48])]]); g.fillRect(-20, -20, 40, 40);
    // planar facets from the centre out
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length], mid = Math.atan2((p[1] + q[1]) / 2, (p[0] + q[0]) / 2), lit = cos(mid + 0.9) * 0.5 + 0.5; g.fillStyle = 'rgba(' + (lit > 0.5 ? '255,236,200,' + (lit - 0.5) * 0.36 : '14,8,4,' + (0.5 - lit) * 0.5) + ')'; g.beginPath(); g.moveTo(rr.range(-2, 2), rr.range(-2, 2)); g.lineTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.closePath(); g.fill(); }
    splat(g, -18, -18, 18, 18, { k: 'blot', c: [46, 38, 30], a: 0.45, th: 0.5, soft: 0.25, s: 0.3, ox: 20, oy: 50 });
    splat(g, -18, -18, 18, 18, { k: 'mid', c: [206, 186, 150], a: 0.34, th: 0.58, soft: 0.2, s: 0.34, ox: 90, oy: 10 });
    splat(g, -18, -18, 18, 18, { k: 'fine', c: [116, 128, 70], a: 0.22, th: 0.6, soft: 0.2, s: 0.3, ox: 60, oy: 130 });        // moss / lichen
    overlay(g, -18, -18, 18, 18, { k: 'fine', s: 0.4, a: 0.36, mode: 'overlay', ox: 10, oy: 20 });
    g.strokeStyle = 'rgba(18,12,8,0.7)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-6, -12); g.lineTo(-3, -5); g.lineTo(-7, 1); g.lineTo(-4, 8); g.moveTo(-3, -5); g.lineTo(3, -3); g.lineTo(8, -7); g.stroke();
    g.strokeStyle = 'rgba(255,236,200,0.35)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(-5.4, -12); g.lineTo(-2.4, -5); g.lineTo(-6.4, 1); g.stroke();
    speckle(g, rr, -14, -14, 14, 14, 60, ['rgba(20,14,10,0.5)', 'rgba(230,210,176,0.3)'], 0.25, 0.7);
    g.fillStyle = lgrad(g, 0, -4, 0, 16, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(10,6,4,0.5)']]); g.fillRect(-20, -4, 40, 22);
    egrad(g, 5, -9, 10, 6, 0.3, [[0, 'rgba(255,244,214,0.36)'], [1, 'rgba(255,240,206,0)']], 0, 0, 0);
    g.restore();
    rim(g, rp, 0, -15, 0, 0, 'rgba(255,232,190,0.6)', 'rgba(255,232,190,0)', 1.2); outline(g, rp, 0.8);
  });

  // far-side (shaded) copies
  for (const k of ['thigh', 'shin', 'meta', 'foot', 'uarm', 'farm', 'hand']) P[k + 'F'] = darkened(P[k], 0.6, '18,10,6');
  return P;
}

// ---------------------------------------------------------------- Deathclaw animation
const DC_SCALE = 0.9, DC_DX = 1;         // whole figure is drawn at 0.9 and nudged so tail tip / snout / claws fit the 90 px hitbox
const DC_CYCLE = 96;                     // px of ground travelled per full gallop cycle (used to keep the feet planted)
const DC_LEG = { T: 25, S: 24, M: 19 }, DC_ARM = { U: 20, F: 24 };
const DC_HIP = { n: [-3, 3.5], f: [-6.5, 2.5] }, DC_SHO = { n: [17, -20], f: [13.5, -22.5] }, DC_HEADP = [25, -26], DC_TAIL0 = [-13, -1];
const DC_TAIL_LEN = 6.2;

// pose targets for the current state. Everything lives in the figure frame (ground = y 0, +x forward), except px/py/th which place the pelvis.
// Every state is written as a blend from the idle pose so that state changes never pop.
function dcPose(e, st, t, ph, mv, dead) {
  const bs = e.bs || {}, k = c01(nz(e.atkK, 0)), rage = c01(nz(bs.rage, 0)), breath = 0.5 + 0.5 * sin(t * (1.9 + rage * 1.4));
  const I = {
    px: -14 + sin(t * 0.7) * 0.7, py: -57 - breath * 0.7, th: 0.2 + sin(t * 0.9) * 0.008, hr: -0.15 + sin(t * 0.6) * 0.045 + sin(t * 1.3) * 0.02, jaw: 0.05 + 0.03 * breath + rage * 0.1, ch: 1 + breath * (0.018 + rage * 0.02),
    nfx: 4, nfy: -6, nfp: 0, ffx: -12, ffy: -6, ffp: 0,
    nhx: 20 + sin(t * 1.1) * 1.6, nhy: -38 + sin(t * 1.7) * 0.8, nha: 0.16 + sin(t * 1.3) * 0.03, nhs: 0,
    fhx: 13 + sin(t * 1.3 + 1) * 1.6, fhy: -40 + sin(t * 1.5) * 0.8, fha: 0.2, fhs: 0,
    tb: 0, tw: 0.05 + rage * 0.05, tp: 0, rock: 0, rx: 0, ry: 0, rr: 0, lean: 0, shake: 0, pm: 0, pa: 1.33, pr: 41, smear: 0, dead: 0,
  };
  const p = Object.assign({}, I), L = (key, v, w) => { p[key] = lerp(I[key], v, w); };
  const moving = (st === 'run' || st === 'chase' || st === 'walk' || st === 'patrol');
  if (dead) return dcDead(p, deadT(e), t);
  if (moving) {
    const gk = (st === 'walk' || st === 'patrol') ? 0.5 : 1, u = ph / TAU;
    // gallop: pitched-forward body, hind pair and fore pair a bit out of phase, the spine bounces
    const b = sin(TAU * (u + 0.05)) * gk, h1 = gait(u, 0.4, 19 * gk + 3, 15 * gk + 2), h2 = gait(u + 0.07, 0.4, 19 * gk + 3, 15 * gk + 2), f1 = gait(u + 0.46, 0.42, 14 * gk + 2, 17 * gk + 2), f2 = gait(u + 0.53, 0.42, 14 * gk + 2, 17 * gk + 2);
    p.px = -13 + 2.4 * b * gk; p.py = -57 + 9 * gk + 4.4 * gk * sin(TAU * (u + 0.3)); p.th = 0.2 + 0.24 * gk + 0.05 * b; p.hr = -0.15 - 0.22 * gk - 0.04 * b; p.jaw = 0.1 + 0.22 * gk + 0.1 * sin(t * 24) * gk; p.ch = 1 + 0.03 * gk * sin(TAU * u * 2);
    p.nfx = -3 + h1[0]; p.nfy = -6 + h1[1]; p.nfp = h1[1] < -1 ? 0.55 : 0; p.ffx = -11 + h2[0]; p.ffy = -6 + h2[1]; p.ffp = h2[1] < -1 ? 0.55 : 0;
    p.nhx = 28 + f1[0] * 1.15 - (1 - gk) * 2; p.nhy = -14 + f1[1] * 1.15; p.nha = f1[1] < -2 ? 0.3 : -0.1; p.fhx = 26 + f2[0] * 1.15; p.fhy = -14 + f2[1] * 1.15; p.fha = -0.05;
    p.tb = -0.18 * gk; p.tw = 0.1 + 0.08 * gk; p.tp = ph * 1.0; p.lean = gk;
    return p;
  }
  switch (st) {
    case 'windup': {
      const w = eio(k), r = eio(c01(k * 1.5));
      L('px', -17, w); L('py', -54, w); L('th', -0.12, w); L('hr', -0.02, w); L('jaw', 0.42, w); L('ch', 1.03, w);
      L('nfx', 1, w); L('ffx', -16, w);
      // near arm cocks back and up behind the shoulder, claws spread; far arm comes forward as a guard
      p.pm = r; p.pa = lerp(1.33, 3.75, r); p.pr = lerp(41, 30, r); L('nha', -1.25, r); p.nhs = w;
      L('fhx', 38, w); L('fhy', -58, w); L('fha', -0.3, w); p.tb = -0.15 * w; p.tw = 0.06 + 0.06 * w; p.shake = 0.5 * w * sin(t * 50);
      break;
    }
    case 'slash': case 'attack': {
      const a = c01(k / 0.62), ea = eio(a), rr = eo(c01(k / 0.36)), rec = c01((k - 0.7) / 0.3), lung = eo(c01(k / 0.5));
      p.pm = 1; p.pa = lerp(3.75, 7.06, ea) - 0.16 * rec; p.pr = lerp(30, 44, rr) - 2 * rec; p.nha = lerp(-1.25, 0.5, ea); p.nhs = 1 - rec * 0.5; p.smear = 1;
      p.px = lerp(-17, -3, lung) - 3 * rec; p.py = -54 + 3 * sin(a * PI) * 0 + 3.5 * ea; p.th = lerp(-0.12, 0.42, ea) - 0.12 * rec; p.hr = lerp(-0.02, -0.24, ea); p.jaw = 0.55 * (1 - rec * 0.6); p.ch = 1.02;
      p.nfx = lerp(1, 17, eo(c01(k / 0.45))); p.ffx = lerp(-16, -9, ea);
      p.fhx = lerp(38, 22, ea); p.fhy = lerp(-58, -46, ea); p.fha = 0.1; p.tb = 0.1 * ea; p.tw = 0.1; p.lean = ea;
      break;
    }
    case 'leap': {
      const up = c01(-nz(e.vy, 0) / 500 * 0.5 + 0.5);         // 1 = rising, 0 = falling
      p.px = -14; p.py = -62; p.th = lerp(0.42, -0.14, up); p.hr = lerp(-0.4, -0.05, up); p.jaw = 0.42; p.ch = 1.02;
      p.nfx = lerp(8, -3, up); p.nfy = lerp(-18, -30, up); p.nfp = 0.7; p.ffx = lerp(-4, -14, up); p.ffy = lerp(-16, -28, up); p.ffp = 0.7;
      p.nhx = lerp(44, 40, up); p.nhy = lerp(-54, -80, up); p.nha = lerp(0.3, -0.5, up); p.nhs = 0.8; p.fhx = lerp(38, 34, up); p.fhy = lerp(-46, -72, up); p.fha = lerp(0.3, -0.4, up); p.fhs = 0.7;
      p.tb = lerp(-0.1, 0.35, up); p.tw = 0.07; p.lean = 0.6;
      break;
    }
    case 'land': {
      const c = eio(atkOrOne(e));
      L('px', -10, c); L('py', -36, c); L('th', 0.62, c); L('hr', -0.5, c); L('jaw', 0.26, c); p.ch = 1 - 0.02 * c;
      L('nfx', 9, c); L('ffx', -17, c); L('nhx', 34, c); L('nhy', -14, c); L('nha', 0.05, c); p.nhs = c * 0.6; L('fhx', 26, c); L('fhy', -12, c); L('fha', 0.05, c);
      p.tb = -0.25 * c; p.tw = 0.05; p.shake = 0.4 * c * sin(t * 40);
      break;
    }
    case 'roar': {
      const r = eio(c01(k / 0.28)), relax = eio(c01((k - 0.84) / 0.16)), a = r * (1 - relax), hold = (k > 0.28 && k < 0.86) ? 1 : 0;
      L('px', -12, a); L('py', -59, a); L('th', -0.3, a); p.hr = lerp(I.hr, -0.85, a) + hold * sin(t * 41) * 0.03; p.jaw = lerp(I.jaw, 0.95, a) + hold * (0.04 * sin(t * 33)); p.ch = 1 + 0.13 * a;
      L('nfx', 6, a); L('ffx', -14, a);
      L('nhx', 22, a); L('nhy', -50, a); L('nha', 0.9, a); p.nhs = a; L('fhx', 12, a); L('fhy', -50, a); L('fha', 0.9, a); p.fhs = a;
      p.tb = -0.3 * a; p.tw = 0.05 + 0.1 * a; p.shake = a * hold * sin(t * 53) * 0.8;
      break;
    }
    case 'throw': {
      const grab = eio(c01(k / 0.36)), hold = c01((k - 0.36) / 0.2), thr = eio(c01((k - 0.56) / 0.16)), fol = c01((k - 0.72) / 0.28);
      const rock0 = [30, -24], rock1 = [0, -116], rockR = [46, -86];
      let rx = lerp(rock0[0], rock1[0], grab), ry = lerp(rock0[1], rock1[1], grab) - 5 * sin(grab * PI);
      rx = lerp(rx, rockR[0], thr); ry = lerp(ry, rockR[1] + 14 * thr, thr);
      const held = k < 0.68;
      p.rock = held ? 1 : 0; p.rx = rx; p.ry = ry; p.rr = lerp(0, -0.5, hold) + thr * 0.9 + (held ? sin(t * 3) * 0.03 : 0);
      p.th = lerp(0.2, -0.22, grab) * (1 - thr) + lerp(0, 0.4, thr) * (1 - fol * 0.5); p.px = -14 - 3 * hold * (1 - thr) + 8 * thr; p.py = -57 + (1 - grab) * 3 + 2 * thr; p.hr = lerp(-0.15, -0.4, grab) * (1 - thr) + (-0.05) * thr; p.jaw = 0.2 + 0.4 * hold * (1 - thr);
      p.nfx = 4 + 8 * thr; p.ffx = -12 - 3 * hold * (1 - thr) + 2 * thr; p.tb = -0.18 * hold; p.tw = 0.06;
      // hands hold the rock on its lower flanks; after release the arms follow through forward and down
      const gx = held ? rx : lerp(rockR[0], 36, fol), gy = held ? ry : lerp(rockR[1] + 14, -40, fol);
      p.nhx = gx + 8 * (held ? 1 : 0.4); p.nhy = gy + 9; p.nha = lerp(-0.2, 0.3, thr); p.nhs = 0.5; p.fhx = gx - 8 * (held ? 1 : 0.2); p.fhy = gy + 8; p.fha = lerp(-0.2, 0.3, thr); p.fhs = 0.5;
      break;
    }
    default: break;
  }
  return p;
}
function atkOrOne(e) { const k = nz(e.atkK, 0); return k > 0.001 ? 1 - c01(k) : 1; }
function dcDead(p, dt, t) {
  const c = eio(c01(dt / 1.15)), thud = dt > 0.95 ? Math.exp(-(dt - 0.95) * 5) * sin((dt - 0.95) * 26) * 0.6 : 0;
  p.px = lerp(-14, -18, c); p.py = lerp(-57, -20, c) + thud; p.th = lerp(0.2, 0.75, c); p.hr = lerp(-0.15, -0.3, c); p.jaw = lerp(0.05, 0.42, c); p.ch = lerp(1, 0.97, c);
  p.nfx = lerp(4, 7, c); p.nfy = -6; p.ffx = lerp(-12, -7, c); p.ffy = -6; p.nfp = 0; p.ffp = 0;
  p.nhx = lerp(20, 47, c); p.nhy = lerp(-38, -7, c); p.nha = lerp(0.16, 0.3, c); p.fhx = lerp(13, 37, c); p.fhy = lerp(-40, -9, c); p.fha = 0.2; p.nhs = 0.4 * c; p.fhs = 0.3 * c;
  p.tb = 0; p.tw = 0.02 * (1 - c); p.dead = c;
  return p;
}

const rot2 = (x, y, a) => { const c = cos(a), s = sin(a); return [x * c - y * s, x * s + y * c]; };

function drawDeathclaw(ctx, e, G, flashOnly) {
  FO = !!flashOnly;
  const P = cached('dc', buildDeathclaw), t = nz(e.t, 0), f = e.face < 0 ? -1 : 1, kS = nz(e.scale, 1), st = e.state || 'idle', dead = isDead(e), bs = e.bs || {}, rage = c01(nz(bs.rage, 0));
  const cx = nz(e.cx, nz(e.x, 0) + nz(e.w, 90) / 2), gy = nz(e.bottom, nz(e.y, 0) + nz(e.h, 104));
  const stride = (e.def && e.def.stride) || 0.075, ph = nz(e.phase, 0) * TAU / (DC_CYCLE * stride);
  const tg = dcPose(e, st, t, ph, 0, dead);
  const fastState = st === 'slash' || st === 'attack' || st === 'throw' || st === 'roar' || st === 'windup';
  const S = smoothState(e, tg, { _: dead ? 60 : fastState ? 42 : 14, px: fastState ? 42 : 10, py: fastState ? 42 : 10 });
  ctx.save();
  ctx.translate(cx, gy); ctx.scale(f * kS * DC_SCALE, kS * DC_SCALE); ctx.translate(DC_DX, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // shake for roar / land / windup tremble
  const shx = S.shake * 1.0, shy = S.shake * 0.5 - 9 * c01(S.dead || 0);    // the corpse pose is lifted so snout / claws rest on the floor line instead of sinking into it
  ctx.translate(shx, shy);

  // ---- skeleton anchors in the figure frame
  const px = S.px, py = S.py, th = S.th, chs = S.ch;
  const fig = (lx, ly) => { const r = rot2(lx, ly * chs, th); return [px + r[0], py + r[1]]; };
  const hipN = fig(DC_HIP.n[0], DC_HIP.n[1]), hipF = fig(DC_HIP.f[0], DC_HIP.f[1]);
  const shN = fig(DC_SHO.n[0], DC_SHO.n[1]), shF = fig(DC_SHO.f[0], DC_SHO.f[1]);
  const headP = fig(DC_HEADP[0], DC_HEADP[1]), tailP = fig(DC_TAIL0[0], DC_TAIL0[1]);

  const legPose = (hip, mx, my, fp, far) => {
    const lift = c01((-4.8 - my) / 16), phi = lerp(0.32, -0.12, lift);
    const hock = [mx - DC_LEG.M * sin(phi), my - DC_LEG.M * cos(phi)];
    const kn = ik2(hip[0], hip[1], hock[0], hock[1], DC_LEG.T, DC_LEG.S, 'fwd');
    return { hip, kx: kn[0], ky: kn[1], hx: kn[2], hy: kn[3], mx, my, fp: fp + phi * 0.6 };
  };
  const drawLeg = (L, far) => {
    seg(ctx, far ? P.metaF : P.meta, L.hx, L.hy, L.mx, L.my);
    seg(ctx, far ? P.shinF : P.shin, L.kx, L.ky, L.hx, L.hy);
    ctx.save(); ctx.translate(L.mx, L.my); ctx.rotate(L.fp); put(ctx, far ? P.footF : P.foot, 0, 0); ctx.restore();
    seg(ctx, far ? P.thighF : P.thigh, L.hip[0], L.hip[1], L.kx, L.ky);
  };
  const armPose = (sh, tx, ty, ha, spread, far) => {
    const ik = ik2(sh[0], sh[1], tx, ty, DC_ARM.U, DC_ARM.F, 'back');
    const fa = atan2(ik[3] - ik[1], ik[2] - ik[0]);
    return { sh, ex: ik[0], ey: ik[1], wx: ik[2], wy: ik[3], ha: fa + ha, spread };
  };
  const drawArm = (A, far) => {
    seg(ctx, far ? P.uarmF : P.uarm, A.sh[0], A.sh[1], A.ex, A.ey);
    seg(ctx, far ? P.farmF : P.farm, A.ex, A.ey, A.wx, A.wy);
    ctx.save(); ctx.translate(A.wx, A.wy); ctx.rotate(A.ha); ctx.scale(1, 1 + 0.22 * A.spread); put(ctx, far ? P.handF : P.hand, 0, 0); ctx.restore();
  };
  const LN = legPose(hipN, S.nfx, S.nfy, S.nfp, false), LF = legPose(hipF, S.ffx, S.ffy, S.ffp, true);
  const nhx = lerp(S.nhx, shN[0] + cos(S.pa) * S.pr, c01(S.pm)), nhy = lerp(S.nhy, shN[1] + sin(S.pa) * S.pr, c01(S.pm));
  const AN = armPose(shN, nhx, nhy, S.nha, S.nhs, false), AF = armPose(shF, S.fhx, S.fhy, S.fha, S.fhs, true);

  // ---- tail chain (behind the pelvis)
  const tailPts = [[tailP[0], tailP[1]]];
  {
    let x = tailP[0], y = tailP[1], a = PI - 0.62 + S.tb + th * 0.7;
    const dd = dead ? S.dead || 0 : 0;
    for (let i = 0; i < 5; i++) {
      const w = sin(t * 2.2 - i * 0.7 + S.tp * 0.0) * S.tw * (0.5 + i * 0.35) + sin(S.tp * 1.0 - i * 0.8) * S.tw * 0.6 * S.lean;
      let bend = 0.06 + w;
      a += bend; if (dead) a = lerp(a, i === 0 ? PI - 0.9 : i < 3 ? PI - 0.25 : PI + 0.08, dd);
      x += cos(a) * DC_TAIL_LEN; y += sin(a) * DC_TAIL_LEN;
      tailPts.push([x, y, a]);
    }
  }
  const drawTail = () => { for (let i = 4; i >= 0; i--) { const a = tailPts[i], b = tailPts[i + 1]; seg(ctx, P.tail[i], a[0], a[1], b[0], b[1]); } };

  // ---- draw order: far arm, tail, far leg, torso, near leg, head, (slash smear), near arm, rock
  drawArm(AF, true);
  drawTail();
  drawLeg(LF, true);
  ctx.save(); ctx.translate(px, py); ctx.rotate(th); ctx.scale(1, chs); put(ctx, P.torso, 0, 0); ctx.restore();
  drawLeg(LN, false);

  // head + jaw
  {
    const hr = th + S.hr, jaw = S.jaw;
    ctx.save(); ctx.translate(headP[0], headP[1]); ctx.rotate(hr);
    put(ctx, P.hornFar, 0, 0);
    if (jaw > 0.1) {                                            // dark mouth interior + tongue, drawn behind the jaw and the upper lip
      const hx = JAW_HINGE[0], hy = JAW_HINGE[1], tx = hx + 31 * cos(jaw), ty = hy + 31 * sin(jaw);
      ctx.beginPath(); ctx.moveTo(hx - 2, hy - 2.4); ctx.lineTo(40, 1.4); ctx.lineTo(tx + 1, ty - 2.6); ctx.lineTo(hx - 3, hy + 2); ctx.closePath();
      ctx.fillStyle = lgrad(ctx, hx, hy - 3, 40, ty, [[0, css([44, 8, 12])], [0.5, css(DC.mouth)], [1, css([150, 50, 50])]]); ctx.fill();
      ctx.fillStyle = css(DC.tongue); ctx.beginPath(); ctx.moveTo(hx + 1, hy + 1); ctx.quadraticCurveTo(hx + 14, hy + 1 - jaw * 4.6, tx - 3, ty - 3.2); ctx.quadraticCurveTo(hx + 12, hy + 3.2 + jaw * 1.4, hx + 1, hy + 3); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.translate(JAW_HINGE[0], JAW_HINGE[1]); ctx.rotate(jaw); put(ctx, P.jaw, 0, 0); ctx.restore();
    put(ctx, P.head, 0, 0);
    // eye: amber slit that burns hotter with rage; a bright halo is added on top
    {
      const ex = 23.8, ey = -8.4, hot = 0.55 + 0.45 * rage, eyeOn = dead ? 0 : (1 - c01(S.dead || 0) * 0);
      if (eyeOn > 0) {
        const c1 = mixc([255, 214, 90], [255, 92, 30], rage), c0 = mixc([255, 168, 34], [232, 40, 16], rage);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(-0.3);
        ctx.fillStyle = lgrad(ctx, 0, -1.6, 0, 1.6, [[0, css(c1)], [0.55, css(c0)], [1, css(mixc(c0, [80, 10, 4], 0.6))]]);
        ctx.beginPath(); ctx.ellipse(0, 0, 2.7, 1.25, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(20,4,0,0.92)'; ctx.beginPath(); ctx.ellipse(0.2, 0, 0.42, 1.16, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,250,224,0.85)'; ctx.beginPath(); ctx.arc(-1.2, -0.5, 0.42, 0, TAU); ctx.fill();
        ctx.restore();
        glow(ctx, ex, ey, 6.5 + rage * 4, rgbs(mixc([255, 176, 50], [255, 60, 24], rage)), 0.5 * hot + 0.25 + rage * 0.35);
      }
    }
    ctx.restore();
  }

  // slash smear (behind the near arm): a fading, tapering crescent trailing the claw tips around the shoulder
  if (S.smear > 0.05 && !FO && c01(S.pm) > 0.5) {
    const ang = S.pa, sweepA = clamp(ang - 3.75, 0, 3.5), span = min(1.9, sweepA + 0.15), fade = (st === 'slash' || st === 'attack') ? sstep(1, 0.72, nz(e.atkK, 0)) : 1, r1 = S.pr + 25, n = 30;
    if (span > 0.08 && fade > 0.02) {
      ctx.save(); ctx.translate(shN[0], shN[1]);
      for (let i = 0; i < n; i++) {
        const u0 = i / n, u1 = (i + 1) / n, a0 = ang - span * (1 - u0), a1 = ang - span * (1 - u1), um = (u0 + u1) / 2;
        const al = 0.5 * Math.pow(um, 1.6) * fade * S.smear, rin = r1 - 2 - 20 * Math.pow(um, 0.9);
        ctx.beginPath(); ctx.arc(0, 0, r1, a0 - 0.01, a1 + 0.012); ctx.arc(0, 0, rin, a1 + 0.012, a0 - 0.01, true); ctx.closePath();
        ctx.fillStyle = 'rgba(255,240,210,' + al + ')'; ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,250,235,' + (0.55 * fade * S.smear) + ')'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0, r1, ang - min(span, 0.9), ang); ctx.stroke();
      ctx.restore();
    }
  }
  drawArm(AN, false);

  // boulder (throw): held between both hands, drawn over the far hand but under the near arm's fingers
  if (S.rock > 0.5 && !dead) { ctx.save(); ctx.translate(S.rx, S.ry); ctx.rotate(S.rr); put(ctx, P.rock, 0, 0); ctx.restore(); }
  ctx.restore();
}

CD.art.deathclaw = drawDeathclaw;
CD.art.deathclaw.CYCLE_PX = DC_CYCLE;

// ================================================================== SENTRY BOT "WARDEN-9"  (hitbox 100 x 120, bipedal hydraulic walker)
// Figure frame: origin = ground under the hitbox centre, +x = facing direction, y negative = up. Torso parts are authored around the pelvis.
const SN = {
  olive: [108, 114, 70], oliveD: [78, 84, 52], oliveL: [158, 160, 112], steel: [132, 138, 144], steelD: [86, 92, 100], dark: [50, 54, 58], rust: [156, 82, 38], rustD: [96, 50, 26],
  hazard: [228, 184, 40], black: [32, 32, 30], stencil: [236, 230, 196], brass: [206, 160, 64], glass: [120, 200, 220],
};

// ---- metal primitives (light comes from the upper right)
function bevel(g, pathFn, w, a) {                 // bright chamfer on the sun-facing edges, dark on the far edges (call inside no clip; it clips itself)
  a = a === undefined ? 1 : a;
  g.save(); pathFn(g); g.clip();
  g.save(); g.translate(-LX * w * 0.55, -LY * w * 0.55); pathFn(g); g.lineWidth = w; g.strokeStyle = 'rgba(255,250,232,' + (0.5 * a) + ')'; g.stroke(); g.restore();
  g.save(); g.translate(LX * w * 0.55, LY * w * 0.55); pathFn(g); g.lineWidth = w; g.strokeStyle = 'rgba(8,6,4,' + (0.5 * a) + ')'; g.stroke(); g.restore();
  g.restore();
}
function groove(g, pathFn, w, a) {                // recessed seam: dark wall + lit lip
  w = w || 0.45; a = a === undefined ? 0.7 : a;
  g.save();
  g.translate(-LX * w * 0.9, -LY * w * 0.9); g.lineWidth = w * 0.9; g.strokeStyle = 'rgba(255,250,236,' + (0.32 * a / 0.7) + ')'; g.beginPath(); pathFn(g); g.stroke();
  g.translate(LX * w * 1.8, LY * w * 1.8); g.lineWidth = w * 1.1; g.strokeStyle = 'rgba(12,8,4,' + a + ')'; g.beginPath(); pathFn(g); g.stroke();
  g.restore();
}
function rivet(g, x, y, r, base) {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(x - LX * r * 0.5, y - LY * r * 0.5, r * 1.05, 0, TAU); g.fill();
  const gr = g.createRadialGradient(x + LX * r * 0.4, y + LY * r * 0.4, r * 0.08, x, y, r * 1.05);
  gr.addColorStop(0, T(base, 1.75)); gr.addColorStop(0.5, T(base, 1.0)); gr.addColorStop(1, T(base, 0.42));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(10,8,6,0.5)'; g.lineWidth = r * 0.22; g.stroke();
  g.fillStyle = 'rgba(255,255,250,0.7)'; g.beginPath(); g.arc(x + LX * r * 0.38, y + LY * r * 0.4, r * 0.2, 0, TAU); g.fill();
  g.restore();
}
function bolt(g, x, y, r, base, ang) {            // hex bolt head
  g.save(); g.translate(x, y); g.rotate(ang || 0);
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.lineTo(cos(a) * r - LX * r * 0.35, sin(a) * r - LY * r * 0.35); } g.closePath(); g.fill();
  const gr = g.createLinearGradient(LX * r, LY * r, -LX * r, -LY * r); gr.addColorStop(0, T(base, 1.6)); gr.addColorStop(0.5, T(base, 0.95)); gr.addColorStop(1, T(base, 0.45));
  g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.lineTo(cos(a) * r, sin(a) * r); } g.closePath(); g.fill();
  g.strokeStyle = 'rgba(10,8,6,0.55)'; g.lineWidth = r * 0.16; g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(0, 0, r * 0.52, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,250,0.35)'; g.beginPath(); g.arc(LX * r * 0.3, LY * r * 0.3, r * 0.3, 0, TAU); g.fill();
  g.restore();
}
function hazard(g, x, y, w, h, dir) {              // yellow/black stencil stripes, slightly worn
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = css(SN.hazard); g.fillRect(x, y, w, h);
  g.fillStyle = css(SN.black); const sw = h * 0.9 * (dir === 2 ? 1 : 1);
  for (let sx = x - h - sw; sx < x + w + h; sx += sw * 2) { g.beginPath(); g.moveTo(sx, y + h); g.lineTo(sx + sw, y + h); g.lineTo(sx + sw + h * (dir === -1 ? -1 : 1), y); g.lineTo(sx + h * (dir === -1 ? -1 : 1), y); g.closePath(); g.fill(); }
  g.fillStyle = lgrad(g, 0, y, 0, y + h, [[0, 'rgba(255,255,255,0.32)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.4)']]); g.fillRect(x, y, w, h);
  splat(g, x, y, x + w, y + h, { k: 'fine', c: [70, 60, 30], a: 0.6, th: 0.55, soft: 0.2, s: 0.3, ox: x * 3, oy: y * 3 });
  g.restore();
}
let LBL_FLIP = false;                              // true while baking the pre-mirrored text variants (used when the boss faces left)
function label(g, str, x, y, size, colr, ang) {
  g.save(); g.translate(x, y); if (ang) g.rotate(ang); if (LBL_FLIP) g.scale(-1, 1);
  g.font = 'bold ' + size + 'px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = colr; g.fillText(str, 0, 0); g.restore();
}
function scratches(g, rnd, n, x0, y0, x1, y1, len, a) {
  for (let i = 0; i < n; i++) {
    const x = rnd.range(x0, x1), y = rnd.range(y0, y1), an = rnd.range(-0.9, 0.9) + (rnd.chance(0.5) ? 0 : PI / 2), l = rnd.range(len * 0.4, len);
    g.strokeStyle = rnd.chance(0.6) ? 'rgba(255,250,236,' + a + ')' : 'rgba(10,8,6,' + a * 0.8 + ')'; g.lineWidth = rnd.range(0.12, 0.26);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + cos(an) * l, y + sin(an) * l); g.stroke();
  }
}
function soot(g, x, y, r, a, sx, sy) {
  g.save(); g.translate(x, y); g.scale(sx || 1, sy || 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, 'rgba(14,10,8,' + a + ')'); gr.addColorStop(0.55, 'rgba(24,18,12,' + a * 0.5 + ')'); gr.addColorStop(1, 'rgba(24,18,12,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
}
function drip(g, x, y, len, w, colr, a) {           // vertical run-off streak, fades out downward
  const gr = g.createLinearGradient(0, y, 0, y + len);
  gr.addColorStop(0, css(colr, a)); gr.addColorStop(0.55, css(colr, a * 0.55)); gr.addColorStop(1, css(colr, 0));
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - w * 0.5, y); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.22, y + len); g.lineTo(x - w * 0.22, y + len); g.closePath(); g.fill();
}
function dent(g, x, y, rx, ry, rot, a) {            // concave dent: shadowed on the sun side, bright lip on the far side
  g.save(); g.translate(x, y); g.rotate(rot || 0);
  const gr = g.createLinearGradient(LX * rx, LY * ry, -LX * rx, -LY * ry);
  gr.addColorStop(0, 'rgba(0,0,0,' + (0.5 * a) + ')'); gr.addColorStop(0.5, 'rgba(0,0,0,' + (0.1 * a) + ')'); gr.addColorStop(1, 'rgba(255,250,236,' + (0.34 * a) + ')');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,' + (0.32 * a) + ')'; g.lineWidth = 0.28; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, PI * 0.8, PI * 1.75); g.stroke();
  g.restore();
}
function bulletHole(g, x, y, r) {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x - LX * r * 0.4, y - LY * r * 0.4, r * 1.9, 0, TAU); g.fill();
  g.fillStyle = '#0a0908'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,250,236,0.55)'; g.lineWidth = r * 0.34; g.beginPath(); g.arc(x, y, r * 1.28, atan2(LY, LX) - 1.1, atan2(LY, LX) + 1.1); g.stroke();
  g.strokeStyle = 'rgba(10,8,6,0.5)'; g.lineWidth = 0.15; g.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.3 + x; g.moveTo(x + cos(a) * r, y + sin(a) * r); g.lineTo(x + cos(a) * r * 2.8, y + sin(a) * r * 2.8); } g.stroke();
  g.restore();
}
function cylV(g, x, y, w, h, base, hi) {            // vertical cylinder shading (axis along y): lit on the right (sun)
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, T(base, 0.5)); gr.addColorStop(0.2, T(base, 0.85)); gr.addColorStop(0.5, T(base, 1.1)); gr.addColorStop(0.72, T(base, hi || 1.55)); gr.addColorStop(0.88, T(base, 0.95)); gr.addColorStop(1, T(base, 0.55));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
function cylH(g, x, y, w, h, base, hi) {            // horizontal cylinder shading (axis along x): lit on top
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, T(base, 0.55)); gr.addColorStop(0.16, T(base, 1.0)); gr.addColorStop(0.34, T(base, hi || 1.6)); gr.addColorStop(0.55, T(base, 1.0)); gr.addColorStop(0.85, T(base, 0.55)); gr.addColorStop(1, T(base, 0.4));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
// painted armour plate: gradient + mottled paint + wear (grime, sun-fade, rust runs, chips down to bare steel) + bevelled edges.
// o: {base, seed, top, bot, chips (0..1), rust (0..1), grime (0..1), detail(g,R), over(g,R), bevel, line}
function plate(g, pathFn, b, o) {
  o = o || {};
  const R = U.RNG(o.seed || 3), x0 = b[0], y0 = b[1], x1 = b[2], y1 = b[3], base = o.base || SN.olive, rr = () => R.range(0, 250), chips = o.chips === undefined ? 0.8 : o.chips, rust = o.rust === undefined ? 0.7 : o.rust, grime = o.grime === undefined ? 0.7 : o.grime;
  g.save(); pathFn(g); g.clip();
  g.fillStyle = lgrad(g, 0, y0, 0, y1, [[0, T(base, o.top || 1.4)], [0.2, T(base, 1.12)], [0.62, T(base, 0.86)], [1, T(base, o.bot || 0.56)]]); g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  g.fillStyle = lgrad(g, x0, 0, x1, 0, [[0, 'rgba(8,10,8,0.28)'], [0.35, 'rgba(8,10,8,0)'], [0.75, 'rgba(255,250,232,0.06)'], [1, 'rgba(255,250,232,0.16)']]); g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  overlay(g, x0, y0, x1, y1, { k: 'blot', s: 0.2, a: 0.34, mode: 'soft-light', ox: rr(), oy: rr() });
  overlay(g, x0, y0, x1, y1, { k: 'fine', s: 0.5, a: 0.16, mode: 'overlay', ox: rr(), oy: rr() });
  if (grime > 0) {
    splat(g, x0, y0, x1, y1, { k: 'blot', c: [22, 18, 12], a: 0.4 * grime, th: 0.5, soft: 0.3, s: 0.26, ox: rr(), oy: rr() });
    splat(g, x0, y0, x1, y1, { k: 'mid', c: mixc(base, [232, 226, 190], 0.5), a: 0.3, th: 0.6, soft: 0.2, s: 0.3, ox: rr(), oy: rr() });          // sun-faded paint
  }
  if (rust > 0) {
    splatV(g, x0, y0, x1, y1, { k: 'blot', c: SN.rust, a: 0.75 * rust, th: 0.5, soft: 0.22, s: 0.3, ox: rr(), oy: rr() }, y0 + (y1 - y0) * 0.25, y1, 0, 1);
    splatV(g, x0, y0, x1, y1, { k: 'fine', c: SN.rustD, a: 0.6 * rust, th: 0.6, soft: 0.2, s: 0.4, ox: rr(), oy: rr() }, y0 + (y1 - y0) * 0.4, y1, 0, 1);
    // vertical rain streaks
    for (let i = 0; i < Math.round((x1 - x0) / 9); i++) drip(g, R.range(x0, x1), R.range(y0, y0 + (y1 - y0) * 0.6), R.range(5, 16), R.range(0.5, 1.3), R.chance(0.6) ? SN.rustD : [26, 20, 14], 0.35 * (0.5 + rust * 0.5));
  }
  if (o.detail) o.detail(g, R);
  if (chips > 0) {
    edgeSplat(g, pathFn, { k: 'fine', c: SN.rustD, a: 0.85 * chips, th: 0.5, soft: 0.16, s: 0.34, ox: rr(), oy: rr(), w: 1.6 });
    edgeSplat(g, pathFn, { k: 'fine', c: [176, 178, 172], a: 0.85 * chips, th: 0.6, soft: 0.1, s: 0.34, ox: rr(), oy: rr(), w: 1.1 });
    splat(g, x0, y0, x1, y1, { k: 'fine', c: [172, 174, 168], a: 0.7 * chips, th: 0.74, soft: 0.06, s: 0.36, ox: rr(), oy: rr() });
    splat(g, x0, y0, x1, y1, { k: 'grain', c: [30, 22, 16], a: 0.4, th: 0.7, soft: 0.1, s: 0.28, ox: rr(), oy: rr() });
  }
  scratches(g, R, Math.round((x1 - x0) * (y1 - y0) / 90), x0, y0, x1, y1, 4, 0.3);
  if (o.over) o.over(g, R);
  g.restore();
  if (o.bevel !== 0) bevel(g, pathFn, o.bevel || 1.2, 1);
  outline(g, pathFn, o.line || 0.6, 'rgba(12,10,6,0.72)');
}
// bare / dull steel part (joint caps, pistons, housings)
function steelPlate(g, pathFn, b, o) { o = Object.assign({ base: SN.steel, chips: 0.25, rust: 0.35, grime: 0.9, top: 1.5 }, o || {}); plate(g, pathFn, b, o); }
function snPart(name, w, h, ox, oy, fn, ss) { return part(w, h, ox, oy, fn, ss); }

// ------------------------------------------------------------------ geometry tables (torso-local, origin = pelvis centre)
const SN_TORSO = [[-31, -3], [-34.5, -8], [-35.5, -30], [-31, -42], [-24, -47], [-4, -49], [14, -49], [24, -44], [31, -33], [33, -20], [32.5, -8], [27, -1], [12, 3.4], [-12, 3.4]];
const SN_HEAD = [[-13, -2], [-15.5, -8], [-14, -19], [-7, -25.5], [4, -27.5], [13, -23.5], [17.5, -15.5], [16.5, -6], [12, -2]];
const SN_SHO = [27, -33];                 // gun arm shoulder pivot (torso-local): the pauldron overhangs the chest's front edge
const SN_POD = [-19, -46];                // missile pod pivot (torso-local)
const SN_HEADP = [4, -47];                // neck base (torso-local)
const SN_EYE = [10.5, -13.2];             // eye lens centre (head-local)
const SN_HIP = { n: [1, 2], f: [-4, 1] }, SN_T = 30, SN_S = 30;

function buildSentry() {
  const P = {}, R = U.RNG(6161);
  const both = (name, w, h, ox, oy, fn) => {         // text-bearing parts are baked twice: normal, and with pre-mirrored lettering (name + 'M') for left-facing draws
    LBL_FLIP = false; P[name] = snPart(name, w, h, ox, oy, fn);
    LBL_FLIP = true; try { P[name + 'M'] = snPart(name, w, h, ox, oy, fn); } finally { LBL_FLIP = false; }
  };
  // ---------------------------------------------------------------- torso (origin = pelvis centre)
  const tpath = (g) => poly(g, SN_TORSO);
  both('torso', 100, 96, 48, 72, (g) => {
    // exhaust stacks behind the reactor housing (behind the hull)
    for (const [sx, sh] of [[-30.5, 12], [-24, 9]]) {
      g.save(); g.beginPath(); g.rect(sx - 2.6, -49 - sh, 5.2, sh + 6); g.clip(); cylV(g, sx - 2.6, -49 - sh, 5.2, sh + 6, SN.steelD, 1.5);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(sx - 2.6, -49 - sh, 5.2, 1.2); g.restore();
      g.strokeStyle = 'rgba(12,10,6,0.75)'; g.lineWidth = 0.5; g.strokeRect(sx - 2.6, -49 - sh, 5.2, sh + 6);
      g.fillStyle = '#07090a'; g.beginPath(); g.ellipse(sx, -49 - sh, 2.6, 0.9, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,240,210,0.5)'; g.lineWidth = 0.3; g.beginPath(); g.ellipse(sx, -49 - sh, 2.6, 0.9, 0, PI, TAU); g.stroke();
      for (let k = 0; k < 2; k++) { g.fillStyle = css(T(SN.steel, 1.3)); g.fillRect(sx - 3, -49 - sh + 3 + k * 4.5, 6, 0.9); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(sx - 3, -49 - sh + 3.9 + k * 4.5, 6, 0.5); }
    }
    // main hull
    plate(g, tpath, [-36, -50, 34, 4], {
      seed: 11, base: SN.olive, chips: 0.9, rust: 0.8,
      detail: (g, R) => {
        // -- rear reactor housing: vertical steel cylinder with cooling fins
        g.save(); rrect(g, -35, -44, 14, 40, 3); g.clip(); cylV(g, -35, -44, 14, 40, SN.steelD, 1.45);
        for (let i = 0; i < 12; i++) { const y = -42 + i * 3.4; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(-35, y, 14, 0.7); g.fillStyle = 'rgba(255,248,228,0.22)'; g.fillRect(-35, y + 0.75, 14, 0.4); }
        g.restore(); rrect(g, -35, -44, 14, 40, 3); g.strokeStyle = 'rgba(12,10,6,0.75)'; g.lineWidth = 0.55; g.stroke();
        rivet(g, -33, -41.4, 0.8, SN.steel); rivet(g, -23.4, -41.4, 0.8, SN.steel); rivet(g, -33, -6, 0.8, SN.steel); rivet(g, -23.4, -6, 0.8, SN.steel);
        soot(g, -28, -44, 7, 0.55, 1.4, 1); soot(g, -28, -10, 6, 0.35, 1.4, 1);
        // -- top deck: darker olive slab with hatches
        g.save(); rrect(g, -21, -49.5, 40, 7.5, 1.2); g.clip(); g.fillStyle = lgrad(g, 0, -50, 0, -42, [[0, T(SN.oliveD, 1.3)], [1, T(SN.oliveD, 0.6)]]); g.fillRect(-22, -50, 42, 9); g.restore();
        groove(g, (g) => { rrect(g, -21, -49.5, 40, 7.5, 1.2); }, 0.5); for (const x of [-18, -3, 12, 17]) rivet(g, x, -45.6, 0.6, SN.steel);
        // -- main side panel with the unit stencil
        g.save(); rrect(g, -19, -40, 40, 31, 2); g.clip();
        g.fillStyle = lgrad(g, 0, -40, 0, -9, [[0, 'rgba(255,250,224,0.10)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.25)']]); g.fillRect(-20, -41, 42, 33);
        g.restore();
        groove(g, (g) => { rrect(g, -19, -40, 40, 31, 2); }, 0.55);
        for (const [x, y] of [[-17, -38], [19, -38], [-17, -11], [19, -11]]) rivet(g, x, y, 0.8, SN.steel);
        label(g, 'WARDEN-9', -5.6, -28, 5.6, 'rgba(238,230,190,0.92)', 0);
        g.fillStyle = 'rgba(238,230,190,0.85)'; g.fillRect(-17, -23.6, 36, 0.7); g.fillRect(-17, -22.4, 36, 0.35);
        label(g, 'MERIDIAN PWR. STN. SECURITY', 1, -19.6, 2.5, 'rgba(238,230,190,0.75)', 0);
        label(g, 'UNIT 09', -10, -14, 3.2, 'rgba(238,230,190,0.8)', 0);
        // small trefoil radiation stencil + warning
        g.save(); g.translate(13, -14); g.fillStyle = 'rgba(232,186,44,0.9)'; g.beginPath(); g.arc(0, 0, 3.6, 0, TAU); g.fill(); g.fillStyle = '#1a1712'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 3, i * 2.094 - 1.9, i * 2.094 - 0.85); g.closePath(); g.fill(); } g.beginPath(); g.arc(0, 0, 0.7, 0, TAU); g.fill(); g.restore();
        // -- vent louvres on the flank
        g.save(); rrect(g, -18, -37.6, 13, 4.6, 0.6); g.clip(); g.fillStyle = '#070808'; g.fillRect(-19, -38, 15, 6);
        for (let i = 0; i < 5; i++) { g.fillStyle = css(T(SN.steel, 1.35)); g.fillRect(-18, -37.2 + i * 1, 13, 0.5); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(-18, -36.7 + i * 1, 13, 0.4); }
        g.restore(); rrect(g, -18, -37.6, 13, 4.6, 0.6); g.strokeStyle = 'rgba(255,250,232,0.4)'; g.lineWidth = 0.3; g.stroke();
        // -- weld seams, hatch handles, damage
        for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(255,248,224,0.24)'; g.lineWidth = 0.35; g.beginPath(); g.arc(-19 + i * 2.9, -40, 1.1, 0.1, PI - 0.1); g.stroke(); }
        g.strokeStyle = css(T(SN.steel, 1.1)); g.lineWidth = 1.1; g.beginPath(); g.moveTo(-8, -46.5); g.lineTo(-8, -44.6); g.lineTo(0, -44.6); g.lineTo(0, -46.5); g.stroke();
        for (const [x, y] of [[-5, -34], [-3, -31.6], [-7.6, -32.4], [4, -36], [7, -22], [-13, -20.6], [16, -30], [9, -33]]) bulletHole(g, x, y, 0.55);
        soot(g, 4, -32, 8, 0.3, 1.3, 1); soot(g, -12, -18, 7, 0.3, 1.5, 1); dent(g, 10, -33, 3.6, 2.4, -0.4, 1); dent(g, -14, -12, 3, 1.8, 0.5, 0.9);
        g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.22; g.beginPath(); g.moveTo(5, -35); g.lineTo(2.4, -33.6); g.lineTo(3, -31.6); g.moveTo(2.4, -33.6); g.lineTo(0.4, -33); g.stroke();
        // -- lower belt with hazard stripes
        hazard(g, -30, -5.6, 55, 4.6, 1);
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-32, -6, 62, 0.6);
        // -- front chest recess frame (closed: two armour halves with a seam)
        g.save(); g.beginPath(); g.moveTo(23, -46); g.lineTo(31, -33); g.lineTo(33, -20); g.lineTo(32.5, -8); g.lineTo(27, -1); g.lineTo(23, -1); g.closePath(); g.clip();
        g.fillStyle = lgrad(g, 22, 0, 34, 0, [[0, 'rgba(0,0,0,0.3)'], [0.35, 'rgba(255,250,224,0.12)'], [1, 'rgba(0,0,0,0.16)']]); g.fillRect(20, -50, 16, 52); g.restore();
        groove(g, (g) => { g.moveTo(24, -35); g.lineTo(32, -25); }, 0.5); groove(g, (g) => { g.moveTo(24.5, -18); g.lineTo(32.6, -18); }, 0.5);
        groove(g, (g) => { g.moveTo(23, -46); g.lineTo(24.4, -2); }, 0.5);
        rivet(g, 27, -30, 0.7, SN.steel); rivet(g, 30.4, -13, 0.7, SN.steel); rivet(g, 27, -9.4, 0.7, SN.steel);
        g.fillStyle = 'rgba(232,186,44,0.9)'; g.fillRect(26.4, -24.6, 5, 1.6); label(g, 'DANGER', 28.6, -21.3, 2, 'rgba(30,26,20,0.9)', 0);
        // -- status lamps (lit dynamically)
        for (let i = 0; i < 3; i++) { g.fillStyle = '#120f0c'; g.beginPath(); g.arc(-15 + i * 3.4, -44.6, 0.95, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,240,210,0.4)'; g.lineWidth = 0.28; g.stroke(); }
      },
      over: (g) => {
        streak(g, -18, -47, -2, -50, 20, -46.4, 0.9, 'rgba(255,250,232,0.32)');
        soot(g, 28, -6, 8, 0.35, 1.2, 1);
      },
    });
    // rim light along the top and front
    rim(g, tpath, 0, -49, 0, -38, 'rgba(255,240,196,0.55)', 'rgba(255,240,196,0)', 1.2);
    // shoulder mounting collar (the pauldron is separate)
    ell(g, SN_SHO[0], SN_SHO[1], 11.5, 11.5, 0); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
  });

  // ---------------------------------------------------------------- pauldron (over the gun arm root), origin = shoulder pivot
  both('pauldron', 36, 34, 18, 20, (g) => {
    const pp = (g) => blob(g, [[-11, 3], [-10.5, -6], [-4, -12.5], [5, -13], [11, -6.6], [11.5, 3.4], [6, 8.5], [-5, 8.5]]);
    plate(g, pp, [-12, -14, 12.5, 9], {
      seed: 21, base: SN.olive, chips: 0.9, rust: 0.6, bevel: 1.5,
      detail: (g) => {
        g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.5; g.beginPath(); g.arc(0, -1.2, 8.2, PI * 1.05, PI * 1.9); g.stroke();
        g.strokeStyle = 'rgba(255,250,232,0.35)'; g.lineWidth = 0.35; g.beginPath(); g.arc(0.3, -0.8, 8.2, PI * 1.08, PI * 1.85); g.stroke();
        for (let i = 0; i < 5; i++) rivet(g, cos(PI * 1.1 + i * 0.42) * 9.4, -1.2 + sin(PI * 1.1 + i * 0.42) * 9.4, 0.6, SN.steel);
        hazard(g, -9, 3.6, 18, 3.6, 1);
        label(g, '09', 0, -5.6, 5, 'rgba(238,230,190,0.85)', 0);
        for (const [x, y] of [[4, -8], [6, -5.6], [-6, -9]]) bulletHole(g, x, y, 0.5);
        dent(g, -6.4, 0, 2.4, 1.6, 0.4, 1);
      },
    });
  });

  // ---------------------------------------------------------------- head (origin = neck base centre)
  const hpath = (g) => poly(g, SN_HEAD);
  both('head', 44, 44, 20, 34, (g) => {
    // neck collar
    g.save(); rrect(g, -10, -5, 20, 8, 1.4); g.clip(); cylH(g, -10, -5, 20, 8, SN.steelD, 1.5); for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-9 + i * 3, -5, 0.6, 8); } g.restore();
    rrect(g, -10, -5, 20, 8, 1.4); g.strokeStyle = 'rgba(12,10,6,0.75)'; g.lineWidth = 0.55; g.stroke();
    plate(g, hpath, [-16, -28, 18, -1], {
      seed: 31, base: SN.olive, chips: 0.9, rust: 0.6, bevel: 1.4,
      detail: (g) => {
        // visor recess (a dark band that wraps around the front)
        g.save(); poly(g, [[-15, -12], [16.5, -12.4], [17.6, -14], [17.2, -17.6], [-14, -18]]); g.clip();
        g.fillStyle = lgrad(g, 0, -19, 0, -11, [[0, '#050607'], [1, '#14171a']]); g.fillRect(-16, -19, 34, 8); g.restore();
        poly(g, [[-15, -12], [16.5, -12.4], [17.6, -14], [17.2, -17.6], [-14, -18]]); g.strokeStyle = 'rgba(255,250,232,0.4)'; g.lineWidth = 0.4; g.stroke();
        // brow hood
        g.save(); poly(g, [[-15, -18.4], [17.6, -18], [16, -23], [4, -27], [-7, -25]]); g.clip(); g.fillStyle = lgrad(g, 0, -27, 0, -18, [[0, 'rgba(255,250,224,0.22)'], [1, 'rgba(0,0,0,0.3)']]); g.fillRect(-16, -28, 34, 10); g.restore();
        groove(g, (g) => { g.moveTo(-15, -18.6); g.lineTo(17.6, -18.2); }, 0.5);
        // cheek plate with rivets + vent
        groove(g, (g) => { g.moveTo(-12, -9); g.lineTo(-4, -8.4); g.lineTo(-2, -3); }, 0.45);
        for (const [x, y] of [[-12, -7], [-6, -6], [0, -4.6], [-11, -22], [8, -24.6]]) rivet(g, x, y, 0.55, SN.steel);
        for (let i = 0; i < 4; i++) { g.fillStyle = '#070808'; g.fillRect(-9 + i * 1.6, -6.4, 0.9, 3.2); }
        label(g, 'W9', -9, -22.6, 3.4, 'rgba(238,230,190,0.75)', -0.06);
        // top hatch, rangefinder lens
        g.save(); g.translate(1, -26.6); ell(g, 0, 0, 5.4, 1.4, 0); g.fillStyle = css(T(SN.steel, 0.9)); g.fill(); g.strokeStyle = 'rgba(12,10,6,0.7)'; g.lineWidth = 0.4; g.stroke(); g.restore();
        g.fillStyle = '#090b0c'; g.beginPath(); g.arc(9.4, -22, 1.5, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,240,210,0.5)'; g.lineWidth = 0.3; g.stroke();
        for (const [x, y] of [[-3, -22], [-1, -20.4], [5, -24]]) bulletHole(g, x, y, 0.5);
        dent(g, -11, -14.4, 2, 1.2, 0.2, 0.9); scratches(g, R, 8, -14, -24, 16, -2, 3, 0.4); soot(g, 9, -25, 6, 0.3, 1, 0.8);
      },
    });
    // eye socket: heavy ring + dark well (the lens itself is drawn per frame)
    const ex = SN_EYE[0], ey = SN_EYE[1];
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 2.2 * SS; g.shadowOffsetX = -LX * 1.1 * SS; g.shadowOffsetY = -LY * 1.1 * SS; g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(ex, ey, 8.2, 0, TAU); g.fill(); g.restore();
    let gr = g.createLinearGradient(ex - LX * 8, ey - LY * 8, ex + LX * 8, ey + LY * 8); gr.addColorStop(0, T(SN.steel, 0.5)); gr.addColorStop(0.5, T(SN.steel, 1.0)); gr.addColorStop(1, T(SN.steel, 1.8));
    g.fillStyle = gr; g.beginPath(); g.arc(ex, ey, 8.3, 0, TAU); g.fill(); g.strokeStyle = 'rgba(10,8,6,0.65)'; g.lineWidth = 0.5; g.stroke();
    gr = g.createLinearGradient(ex + LX * 6, ey + LY * 6, ex - LX * 6, ey - LY * 6); gr.addColorStop(0, T(SN.dark, 0.5)); gr.addColorStop(1, T(SN.steel, 1.2));
    g.fillStyle = gr; g.beginPath(); g.arc(ex, ey, 7.3, 0, TAU); g.fill(); g.fillStyle = '#050607'; g.beginPath(); g.arc(ex, ey, 6.6, 0, TAU); g.fill();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; bolt(g, ex + cos(a) * 7.8, ey + sin(a) * 7.8, 0.55, SN.steel, a); }
  });
  P.lensRing = snPart('lensRing', 24, 24, 12, 12, (g) => {   // front glass gloss + bezel over the lens
    g.save(); g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.clip();
    const gr = g.createRadialGradient(LX * 2.2, LY * 2.2, 0, LX * 2.2, LY * 2.2, 5.2); gr.addColorStop(0, 'rgba(255,255,255,0.6)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-8, -8, 16, 16);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.45; g.beginPath(); g.arc(0, 0, 5.8, atan2(LY, LX) - 0.9, atan2(LY, LX) + 0.7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(LX * 2.4, LY * 2.5, 1.1, 0.6, atan2(LY, LX) + HP2, 0, TAU); g.fill();
    g.restore();
  });

  // ---------------------------------------------------------------- legs: thigh (hip -> knee), shin (knee -> ankle), foot (origin = ankle)
  P.thigh = (function () {
    const len = SN_T, w0 = 11.5, w1 = 8.6;
    return snPart('thigh', len + 34, 34, 17, 17, (g) => {
      const pt = (g) => poly(g, [[3, -w0], [len * 0.34, -w0 * 1.04], [len * 0.74, -w1 * 1.1], [len - 2, -w1 * 0.96], [len - 2, w1 * 0.96], [len * 0.74, w1 * 1.1], [len * 0.34, w0 * 1.04], [3, w0]]);
      plate(g, pt, [0, -w0 - 2, len, w0 + 2], {
        seed: 41, base: SN.olive, chips: 0.9, rust: 0.7,
        detail: (g) => {
          groove(g, (g) => { g.moveTo(len * 0.36, -w0 * 1.0); g.lineTo(len * 0.36, w0 * 1.0); }, 0.5); groove(g, (g) => { g.moveTo(len * 0.7, -w1 * 1.06); g.lineTo(len * 0.7, w1 * 1.06); }, 0.5);
          for (const x of [len * 0.18, len * 0.53, len * 0.86]) { rivet(g, x, -w0 * 0.72, 0.7, SN.steel); rivet(g, x, w0 * 0.72, 0.7, SN.steel); }
          hazard(g, len * 0.4, -w0 * 1.04, len * 0.28, 3.2, 1); label(g, 'L', len * 0.2, -1, 4, 'rgba(238,230,190,0.6)', 0);
          bulletHole(g, len * 0.5, 2, 0.6); bulletHole(g, len * 0.56, 4.4, 0.5); dent(g, len * 0.6, -3, 3, 2, 0.3, 1); soot(g, len * 0.4, 3, 6, 0.3, 1.5, 1);
        },
      });
      // hip cap
      const hc = (g) => { g.beginPath(); g.arc(0, 0, 11.6, 0, TAU); };
      steelPlate(g, hc, [-12, -12, 12, 12], { seed: 43, bevel: 1.6, detail: (g) => { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.2; bolt(g, cos(a) * 8.4, sin(a) * 8.4, 0.9, SN.steel, a); } g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.5; g.beginPath(); g.arc(0, 0, 5.4, 0, TAU); g.stroke(); bolt(g, 0, 0, 2.6, SN.steelD, 0.3); } });
      // knee cap
      g.save(); g.translate(len, 0); const kc = (g) => { g.beginPath(); g.arc(0, 0, 9.4, 0, TAU); };
      steelPlate(g, kc, [-10, -10, 10, 10], { seed: 44, bevel: 1.4, detail: (g) => { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.5; bolt(g, cos(a) * 6.4, sin(a) * 6.4, 0.75, SN.steel, a); } bolt(g, 0, 0, 2.2, SN.steelD, 0.3); } });
      g.restore();
    });
  })();
  P.shin = (function () {
    const len = SN_S, w0 = 8.4, w1 = 6.6;
    return snPart('shin', len + 30, 30, 15, 15, (g) => {
      const pt = (g) => poly(g, [[2, -w0], [len * 0.4, -w0 * 1.05], [len * 0.8, -w1 * 1.12], [len - 2, -w1], [len - 2, w1], [len * 0.8, w1 * 1.12], [len * 0.4, w0 * 1.05], [2, w0]]);
      plate(g, pt, [0, -w0 - 2, len, w0 + 2], {
        seed: 51, base: SN.olive, chips: 0.9, rust: 0.8,
        detail: (g) => {
          groove(g, (g) => { g.moveTo(len * 0.44, -w0 * 1.04); g.lineTo(len * 0.44, w0 * 1.04); }, 0.5);
          for (const x of [len * 0.2, len * 0.62]) { rivet(g, x, -w0 * 0.7, 0.65, SN.steel); rivet(g, x, w0 * 0.7, 0.65, SN.steel); }
          hazard(g, len * 0.5, -w0 * 1.08, len * 0.36, 2.8, -1);
          bulletHole(g, len * 0.3, 1.6, 0.5); bulletHole(g, len * 0.34, 3.4, 0.45); dent(g, len * 0.7, 0, 2.6, 1.8, 0.5, 1); soot(g, len * 0.6, 3, 5, 0.3, 1.5, 1);
        },
      });
      g.save(); g.translate(len, 0); const ak = (g) => { g.beginPath(); g.arc(0, 0, 7, 0, TAU); };
      steelPlate(g, ak, [-8, -8, 8, 8], { seed: 53, bevel: 1.2, detail: (g) => { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.2; bolt(g, cos(a) * 4.8, sin(a) * 4.8, 0.65, SN.steel, a); } bolt(g, 0, 0, 1.7, SN.steelD, 0.3); } });
      g.restore();
    });
  })();
  // foot: origin = ankle joint; heel behind, toes forward, sole at y = +20
  P.foot = snPart('foot', 54, 34, 20, 8, (g) => {
    const fp = (g) => poly(g, [[-16, 12], [-15, 4], [-8, 2], [8, 3], [16, 6], [22, 12], [26.5, 18], [26.5, 20.6], [-17, 20.6]]);
    plate(g, fp, [-18, 0, 28, 21], {
      seed: 61, base: SN.steel, top: 1.5, chips: 0.7, rust: 0.8, grime: 1,
      detail: (g) => {
        hazard(g, -14, 15, 28, 4.6, 1);
        groove(g, (g) => { g.moveTo(-4, 3); g.lineTo(-4, 15); }, 0.45); groove(g, (g) => { g.moveTo(15, 5); g.lineTo(19, 15); }, 0.45);
        for (const [x, y] of [[-12, 7], [4, 6], [21, 12]]) rivet(g, x, y, 0.75, SN.steelD);
        dent(g, -8, 10, 2.6, 1.5, 0.2, 1);
      },
    });
    // toe claws
    for (const [x, y, l] of [[22.5, 12.6, 6], [25, 15.6, 5.6], [26, 18.4, 4.6]]) { g.beginPath(); g.moveTo(x - 1.6, y - 1.6); g.lineTo(x + l, y + 0.6); g.lineTo(x - 1.2, y + 2.2); g.closePath(); g.fillStyle = lgrad(g, x, y - 2, x, y + 2, [[0, css(T(SN.steel, 1.4))], [1, css(T(SN.dark, 0.7))]]); g.fill(); g.strokeStyle = 'rgba(10,8,6,0.75)'; g.lineWidth = 0.4; g.stroke(); }
    // ankle joint collar
    g.save(); const ac = (g) => { g.beginPath(); g.arc(0, 2, 7.6, 0, TAU); };
    steelPlate(g, ac, [-8, -6, 8, 10], { seed: 63, bevel: 1.2, detail: (g) => { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.4; bolt(g, cos(a) * 5, 2 + sin(a) * 5, 0.65, SN.steel, a); } } });
    g.restore();
  });

  // ---------------------------------------------------------------- gun arm (rotary gatling laser). origin = shoulder pivot, points along +x
  P.gunBody = snPart('gunBody', 34, 30, 8, 15, (g) => {
    // shoulder yoke + receiver
    const gp = (g) => poly(g, [[-4, -8], [2, -10], [14, -9.4], [17.6, -7], [18.6, 7.4], [14.6, 9.4], [2, 9.4], [-4, 8]]);
    plate(g, gp, [-5, -11, 19, 10], {
      seed: 71, base: SN.steelD, top: 1.7, chips: 0.6, rust: 0.7, grime: 1, bevel: 1.3,
      detail: (g) => {
        groove(g, (g) => { g.moveTo(6, -9.6); g.lineTo(6, 9.4); }, 0.45); groove(g, (g) => { g.moveTo(13, -9.4); g.lineTo(13, 9.4); }, 0.45);
        for (let i = 0; i < 4; i++) { g.fillStyle = '#060707'; g.fillRect(-1.8, -6 + i * 1.7, 5.4, 0.8); g.fillStyle = 'rgba(255,248,228,0.22)'; g.fillRect(-1.8, -5.3 + i * 1.7, 5.4, 0.35); }
        for (const [x, y] of [[9.4, -7], [9.4, 6.8], [15.6, -5], [15.6, 5]]) rivet(g, x, y, 0.65, SN.steel);
        hazard(g, 7, -9.6, 5.4, 2.6, 1);
        soot(g, 12, 0, 6, 0.4, 1, 1.2);
      },
    });
    // power cell bump under the receiver
    g.save(); rrect(g, 1.6, 7.4, 10, 5.6, 1.2); g.clip(); cylH(g, 1.6, 7.4, 10, 5.6, SN.olive, 1.4); for (const x of [4.2, 7, 9.8]) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, 7.4, 0.5, 5.6); } g.restore();
    rrect(g, 1.6, 7.4, 10, 5.6, 1.2); g.strokeStyle = 'rgba(12,10,6,0.72)'; g.lineWidth = 0.5; g.stroke();
    // barrel cluster rear plate
    g.save(); rrect(g, 17.4, -7.6, 3.6, 15.2, 1); g.clip(); cylH(g, 17.4, -7.8, 4, 15.6, SN.dark, 1.6); g.restore(); rrect(g, 17.4, -7.6, 3.6, 15.2, 1); g.strokeStyle = 'rgba(12,10,6,0.75)'; g.lineWidth = 0.5; g.stroke();
  });
  P.gunFront = snPart('gunFront', 14, 24, 4, 12, (g) => {      // front clamp ring (drawn over the barrels): the muzzle collar
    g.save(); rrect(g, 0, -7.6, 4.6, 15.2, 1.1); g.clip(); cylH(g, 0, -7.8, 5, 15.6, SN.dark, 1.7);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(3.4, -8, 1.2, 16); g.fillStyle = 'rgba(255,248,228,0.25)'; g.fillRect(0, -8, 0.6, 16); g.restore();
    rrect(g, 0, -7.6, 4.6, 15.2, 1.1); g.strokeStyle = 'rgba(12,10,6,0.78)'; g.lineWidth = 0.55; g.stroke();
    for (const y of [-5.6, 5.6]) rivet(g, 2.3, y, 0.55, SN.steel);
    hazard(g, 0.4, -1.6, 3.8, 3.2, 1);
  });
  // cooling shroud around the middle of the barrels (fixed)
  P.gunShroud = snPart('gunShroud', 16, 24, 2, 12, (g) => {
    g.save(); rrect(g, 0, -7.2, 4.4, 14.4, 1); g.clip(); cylH(g, 0, -7.4, 4.6, 14.8, SN.steel, 1.5); for (let i = 0; i < 3; i++) { g.fillStyle = '#080909'; g.beginPath(); g.ellipse(2.2, -4 + i * 4, 0.9, 1.2, 0, 0, TAU); g.fill(); } g.restore();
    rrect(g, 0, -7.2, 4.4, 14.4, 1); g.strokeStyle = 'rgba(12,10,6,0.75)'; g.lineWidth = 0.5; g.stroke();
  });

  // ---------------------------------------------------------------- missile pod (origin = pod pivot; the launch face points up along -y in local space, pod tilted at draw time)
  both('pod', 40, 44, 18, 32, (g) => {
    // pod side face: box 26 wide (x -12..14), 26 tall (y -26..0), open end faces -y
    const bp = (g) => poly(g, [[-12, 0], [-12, -22], [-8, -27], [14, -27], [14, 0]]);
    plate(g, bp, [-13, -28, 15, 1], {
      seed: 81, base: SN.olive, chips: 0.9, rust: 0.8, bevel: 1.4,
      detail: (g) => {
        groove(g, (g) => { g.moveTo(-12, -14); g.lineTo(14, -14); }, 0.5); groove(g, (g) => { g.moveTo(-12, -6); g.lineTo(14, -6); }, 0.5);
        for (const [x, y] of [[-9, -3], [11, -3], [-9, -11], [11, -11], [11, -24], [-7, -22]]) rivet(g, x, y, 0.7, SN.steel);
        hazard(g, -12, -9.6, 26, 2.8, 1);
        label(g, 'MSL-6', 1, -19, 3.6, 'rgba(238,230,190,0.85)', 0);
        for (const [x, y] of [[4, -3], [6, -2]]) bulletHole(g, x, y, 0.5); dent(g, -3, -20.4, 2.4, 1.5, 0.3, 1); soot(g, 4, -23, 7, 0.4, 1.2, 1);
      },
    });
    // (the launch face, lids and warheads are drawn per frame; this baked part is only the body)
  });
  P.podFace = snPart('podFace', 40, 20, 18, 14, (g) => {   // the launch face: dark bay with a 3 x 2 grid; hatches are drawn separately
    const fp = (g) => poly(g, [[-12, 0], [-7.4, -6], [14, -6], [14, 0]]);
    g.save(); fp(g); g.clip(); g.fillStyle = '#08090a'; g.fillRect(-14, -8, 32, 10);
    // missile noses seen down the tubes
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const x = -8 + i * 7.4 + j * 0, y = -4.4 + j * 2.6, r = 2.4; const gr = g.createRadialGradient(x - 0.6, y - 0.6, 0, x, y, r); gr.addColorStop(0, 'rgb(240,150,70)'); gr.addColorStop(0.6, 'rgb(170,84,36)'); gr.addColorStop(1, 'rgb(46,24,14)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, TAU); g.fill(); }
    g.restore(); fp(g); g.strokeStyle = 'rgba(255,248,228,0.35)'; g.lineWidth = 0.4; g.stroke();
  });
  P.podLid = snPart('podLid', 12, 8, 1, 4, (g) => {         // one hatch lid, hinge on the left edge at the origin
    const lp = (g) => rrect(g, 0, -3, 8.4, 6, 0.7);
    plate(g, lp, [0, -3, 8.4, 3], { seed: 83, base: SN.oliveD, chips: 0.8, rust: 0.6, bevel: 0.8, detail: (g) => { rivet(g, 6.6, 0, 0.5, SN.steel); hazard(g, 0.6, -2.6, 2.6, 5.2, 1); } });
  });

  // ---------------------------------------------------------------- far arm: hanging manipulator (upper arm, forearm with a 3-finger claw)
  P.farUp = snPart('farUp', 40, 24, 10, 12, (g) => { const w = 6.4; plate(g, (g) => poly(g, [[0, -w], [16, -w * 1.04], [22, -w * 0.9], [22, w * 0.9], [16, w * 1.04], [0, w]]), [-2, -8, 24, 8], { seed: 91, base: SN.oliveD, chips: 0.8, rust: 0.7, detail: (g) => { groove(g, (g) => { g.moveTo(11, -w); g.lineTo(11, w); }, 0.45); rivet(g, 5, -3.8, 0.55, SN.steel); rivet(g, 17, 3.8, 0.55, SN.steel); } }); });
  P.farFore = snPart('farFore', 40, 24, 10, 12, (g) => {
    const w = 5.6;
    plate(g, (g) => poly(g, [[0, -w], [16, -w * 0.95], [22, -w * 0.7], [22, w * 0.7], [16, w * 0.95], [0, w]]), [-2, -8, 24, 8], { seed: 92, base: SN.steelD, chips: 0.6, rust: 0.6, detail: (g) => { groove(g, (g) => { g.moveTo(10, -w); g.lineTo(10, w); }, 0.45); hazard(g, 12, -w, 6, 2.6, 1); } });
    // claw: three tapered fingers
    for (const [a, l] of [[-0.42, 10], [0.02, 11.5], [0.46, 9.6]]) { g.save(); g.translate(22, 0); g.rotate(a); g.beginPath(); g.moveTo(0, -2); g.lineTo(l, -0.6); g.lineTo(l + 0.6, 0.6); g.lineTo(0, 2.2); g.closePath(); g.fillStyle = lgrad(g, 0, -2, 0, 2, [[0, css(T(SN.steel, 1.5))], [1, css(T(SN.dark, 0.7))]]); g.fill(); g.strokeStyle = 'rgba(10,8,6,0.78)'; g.lineWidth = 0.45; g.stroke(); g.restore(); }
    steelPlate(g, (g) => { g.beginPath(); g.arc(22, 0, 3.6, 0, TAU); }, [18, -4, 26, 4], { seed: 93, bevel: 0.9 });
  });

  // ---------------------------------------------------------------- hydraulic piston: cylinder (18 long) and chrome rod (24 long), both authored along +x from the origin
  P.cyl = snPart('cyl', 24, 12, 3, 6, (g) => {
    g.save(); rrect(g, 0, -2.9, 18, 5.8, 1.2); g.clip(); cylH(g, 0, -2.9, 18, 5.8, SN.steelD, 1.8);
    g.fillStyle = lgrad(g, 0, -3.3, 0, 3.3, [[0, css(T(SN.brass, 1.6))], [0.5, css(T(SN.brass, 0.95))], [1, css(T(SN.brass, 0.45))]]); g.fillRect(13.4, -3.3, 2.6, 6.6);
    g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(5.6, -3, 0.5, 6); g.fillRect(9.4, -3, 0.5, 6); g.fillStyle = 'rgba(255,248,228,0.3)'; g.fillRect(6.1, -3, 0.3, 6); g.fillRect(9.9, -3, 0.3, 6);
    g.restore(); rrect(g, 0, -2.9, 18, 5.8, 1.2); g.strokeStyle = 'rgba(12,10,6,0.78)'; g.lineWidth = 0.5; g.stroke();
    g.beginPath(); g.arc(0.2, 0, 2.7, 0, TAU); g.fillStyle = css(T(SN.steelD, 0.8)); g.fill(); g.strokeStyle = 'rgba(12,10,6,0.8)'; g.lineWidth = 0.5; g.stroke(); bolt(g, 0.2, 0, 1.2, SN.steel, 0.3);
  });
  P.rod = snPart('rod', 30, 8, 3, 4, (g) => {
    g.save(); rrect(g, 0, -1.35, 24, 2.7, 1.2); g.clip(); cylH(g, 0, -1.35, 24, 2.7, [196, 202, 206], 1.5); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(1, -0.9, 22, 0.5); g.restore();
    rrect(g, 0, -1.35, 24, 2.7, 1.2); g.strokeStyle = 'rgba(12,10,6,0.7)'; g.lineWidth = 0.4; g.stroke();
    g.beginPath(); g.arc(24.4, 0, 2.3, 0, TAU); g.fillStyle = css(T(SN.steelD, 0.9)); g.fill(); g.strokeStyle = 'rgba(12,10,6,0.8)'; g.lineWidth = 0.5; g.stroke(); bolt(g, 24.4, 0, 1.1, SN.steel, 0.3);
  });
  // far-side (shaded) copies
  for (const k of ['thigh', 'shin', 'foot', 'farUp', 'farFore', 'cyl', 'rod']) P[k + 'F'] = darkened(P[k], 0.6, '10,12,10');

  return P;
}


// ---------------------------------------------------------------- Sentry animation
// Figure frame: origin = ground contact under the hitbox centre, +x = facing direction, y negative = up. The whole figure is drawn at SN_SCALE.
const SN_SCALE = 0.78;
const SN_CYCLE = 66.7;                                   // px of ground travelled per full step cycle (both legs): keeps the planted foot from sliding
const SN_FH = 20.6;                                      // ankle height above the ground while a foot is planted (the foot part's sole is 20.6 below the ankle)
const SN_FSHO = [19, -28], SN_ARM = { U: 26.4, F: 26.4 }, SN_ARMK = 1.2;   // far (hanging) arm shoulder (torso-local), segment lengths, sprite stretch
const SN_GUN = { X0: 20.6, X1: 66, SHR: 36.5, CLA: 59.6 };   // gun-local x: barrels start / tips, cooling shroud, front collar
const SN_WIN = [-16, -39, 9, -10];                       // flank reactor window (torso-local x0,y0,x1,y1): the big side panel splits open in 'vent'
const SN_STK = [[-30.5, -61], [-24, -58]];               // exhaust stack mouths (torso-local)
const SN_HOLES = [[-5, -34], [-3, -31.6], [4, -36], [-7.6, -32.4], [16, -30], [7, -22]];
const SN_LAMPS = [[-15, -44.6], [-11.6, -44.6], [-8.2, -44.6]];
const SN_KNEEL = -(Math.PI + 0.2);                       // foot pitch when the shin lies along the ground (toes swing up and round, so they never dip into the floor)

function snPose(e, st, t, ph, dead) {
  const bs = e.bs || {}, k = c01(nz(e.atkK, 0)), rage = c01(nz(bs.rage, 0)), vent = c01(nz(bs.vent, st === 'vent' ? 1 : 0)), H = SN_FH;
  const fc = e.face < 0 ? -1 : 1, aimW = nz(e.aimA, nz(bs.aimA, 0)), aw = fc > 0 ? aimW : PI - aimW;
  const aim = clamp(atan2(sin(aw), cos(aw)), -1, 1.35);
  const br = 0.5 + 0.5 * sin(t * (1.4 + rage * 1.2));
  const I = {
    px: 3 + sin(t * 0.5) * 0.5, py: -65 - br * 0.9, th: 0.05 + sin(t * 0.7) * 0.006, hr: -0.02 + sin(t * 0.45) * 0.05 + sin(t * 1.1) * 0.015,
    nfx: 13, nfy: -H, nfp: 0, ffx: -17, ffy: -H, ffp: 0,
    ga: 1.02 + sin(t * 0.9) * 0.02, gs: 0, spin: 0, aim,
    fhx: 44 + sin(t * 1.1 + 1) * 1.2, fhy: -49 + sin(t * 1.3) * 0.8,
    pt: 0, po: 0, pl: 0, ev: 0, eye: 0.6 + 0.08 * br + rage * 0.3, eyeF: 0, shake: 0, dead: 0,
  };
  const p = Object.assign({}, I), L = (key, v, w) => { p[key] = lerp(I[key], v, w); };
  if (dead) return snDead(p, deadT(e), t);
  const moving = st === 'walk' || st === 'chase' || st === 'patrol' || st === 'run';
  if (moving) {
    // heavy stomping walk: long double-support stance, high knee lift, torso pitched into the step
    const u = ph / TAU, D = 0.6, A = D * SN_CYCLE / (2 * SN_SCALE), un = u - Math.floor(u), uf = (u + 0.5) - Math.floor(u + 0.5);
    const gn = gait(u, D, A, 14), gf = gait(u + 0.5, D, A, 14);
    const pitch = (q) => (q < D ? lerp(-0.14, 0.2, q / D) : lerp(0.34, -0.16, (q - D) / (1 - D)));
    const comp = (pp) => (pp > 0 ? 22 * sin(min(pp, 0.6)) : 13 * sin(min(-pp, 0.4)));
    const pn = pitch(un), pf = pitch(uf), bob = cos(TAU * 2 * (u - 0.05)), sw = sin(TAU * u);
    p.px = 4 + 1.0 * sw; p.py = -64.5 + 2.4 * bob; p.th = 0.09 + 0.02 * bob; p.hr = -0.05 + 0.03 * sin(TAU * 2 * u + 1);
    p.nfx = 4 + gn[0]; p.nfy = -H + gn[1] - comp(pn); p.nfp = pn; p.ffx = -8 + gf[0]; p.ffy = -H + gf[1] - comp(pf); p.ffp = pf;
    p.ga = 1.04 + 0.05 * bob; p.fhx = 43 - 6 * sw; p.fhy = -49 + 2 * bob; p.eye = 0.62 + 0.06 * sin(t * 3);
  } else {
    switch (st) {
      case 'windup': {                       // gun arm comes up onto the target, barrels spin up, eye charges
        const w = eio(k), r = eo(c01(k * 1.35));
        p.ga = lerp(I.ga, aim, r); p.spin = k * k * 46; p.gs = 0.15 + 0.5 * w; p.eye = lerp(0.6, 1.05, w) + rage * 0.2;
        L('py', -63, w); L('th', 0.02, w); L('px', 0, w); L('nfx', 14, w); L('ffx', -17, w); p.shake = 0.35 * w; L('hr', aim * 0.4 - 0.05, w);
        L('fhx', 46, w); L('fhy', -52, w);
        break;
      }
      case 'gatling': {                      // arm locked on the target, barrels at full speed, whole body braced and shaking
        p.ga = aim; p.spin = 62 + rage * 16; p.gs = 1; p.eye = 0.95 + rage * 0.1; p.py = -63.5; p.th = 0.11; p.px = 0.5; p.nfx = 15; p.ffx = -18; p.hr = aim * 0.4 - 0.06;
        p.shake = 0.5; p.fhx = 46; p.fhy = -52;
        break;
      }
      case 'missile': {                      // shoulder pod tilts up, hatches fold open, warheads rise out of the tubes
        const o = eio(c01(k / 0.55)), lf = eio(c01((k - 0.35) / 0.65));
        p.po = o; p.pl = lf; p.pt = 0.3 * o; L('th', -0.03, o); L('hr', -0.24, o); L('py', -66, o); p.eye = 0.75 + 0.2 * o; p.ga = 1.1; p.shake = 0.2 * o + (k > 0.97 ? 0.35 : 0);
        break;
      }
      case 'stomp': {                        // near leg marches up, holds, then drives into the ground ~35 units ahead
        const up = k < 0.5 ? eio(c01(k / 0.5)) : 1, sl = c01((k - 0.6) / 0.11), imp = k > 0.68 ? c01(1 - (k - 0.68) / 0.3) : 0;
        const x0 = 11, y0 = -H, x1 = 25, y1 = -55, x2 = 38, y2 = -H;
        if (k < 0.6) { p.nfx = lerp(x0, x1, up); p.nfy = lerp(y0, y1, up); } else { p.nfx = lerp(x1, x2, eo(sl)); p.nfy = lerp(y1, y2, eo(sl)); }
        p.nfp = k < 0.6 ? 0.25 * up : lerp(0.25, 0, sl);
        const lean = k < 0.6 ? -0.05 * up : lerp(-0.05, 0.16, sl);
        p.th = 0.05 + lean; p.px = 3 - 4 * up * (k < 0.6 ? 1 : 1 - sl) + 4 * sl; p.py = -65 - 1.5 * up * (1 - sl) + 5.5 * imp; p.ffx = lerp(-14, -18, up);
        p.ga = k < 0.6 ? lerp(I.ga, 0.35, up) : lerp(0.35, 1.1, sl); p.hr = k < 0.6 ? -0.12 * up : lerp(-0.12, 0.2, sl); p.fhx = lerp(44, 20, up); p.fhy = lerp(-49, -74, up) + 8 * sl;
        p.shake = imp > 0.05 ? 1.1 * imp : 0; p.eye = 0.75 + 0.25 * imp;
        break;
      }
      case 'fire': {                         // eye beam: braced, head levelled on the target, the lens flares
        const a = eio(c01(k * 1.6));
        p.eyeF = a; p.eye = 1.05; p.hr = aim * 0.5 - 0.1 * a; p.th = 0.0; p.px = -1; p.py = -63; p.shake = 0.7; p.nfx = 15; p.ffx = -18; p.ga = 1.12; p.fhx = 46; p.fhy = -52;
        break;
      }
      default: break;
    }
  }
  if (vent > 0.001) {                        // overheat: drops onto both knees, chest hatch splits open, head and gun arm hang
    const v = eio(vent), B = (key, val) => { p[key] = lerp(p[key], val, v); };
    B('px', 3); B('py', -33); B('th', 0.32); B('hr', 0.42); B('nfx', -7); B('nfy', -10); B('nfp', SN_KNEEL); B('ffx', -20); B('ffy', -11); B('ffp', SN_KNEEL);
    B('ga', 0.95); B('fhx', 44); B('fhy', -26); B('spin', 0); B('gs', 0); B('eye', 0.4); B('pt', 0.1); B('po', 0.2); p.ev = v; p.shake += 0.12 * v * (0.5 + 0.5 * sin(t * 33));
  }
  return p;
}
function snDead(p, dt, t) {
  const c = eio(c01(dt / 1.4)), thud = dt > 1.15 ? Math.exp(-(dt - 1.15) * 5) * sin((dt - 1.15) * 25) * 0.7 : 0;
  p.px = lerp(3, 2, c); p.py = lerp(-65, -33, c) + thud; p.th = lerp(0.05, 0.5, c); p.hr = lerp(-0.02, 0.55, c);
  p.nfx = lerp(13, -7, c); p.nfy = lerp(-SN_FH, -10, c); p.nfp = c * SN_KNEEL; p.ffx = lerp(-17, -20, c); p.ffy = lerp(-SN_FH, -11, c); p.ffp = c * SN_KNEEL;
  p.ga = lerp(1.02, 0.8, c); p.fhx = lerp(44, 42, c); p.fhy = lerp(-49, -24, c); p.spin = 0; p.gs = 0; p.eye = 0; p.eyeF = 0; p.ev = 0.7 * c; p.po = 0.6 * c; p.pt = 0.2 * c; p.dead = c;
  return p;
}
function snDeadSet(P) { return cached('sn_dead', () => { const D = {}; for (const k in P) if (P[k] && P[k].c) D[k] = darkened(P[k], 0.42, '14,11,9'); return D; }); }

// barrel spin accumulates per entity (angle += speed * dt); a fresh object (corpse snapshot) simply starts from a fixed angle
const _snSpin = new WeakMap();
function snSpinAngle(e, w, t) {
  let s = _snSpin.get(e);
  if (!s) { s = { t, a: (t * 7.1) % TAU }; _snSpin.set(e, s); return s.a; }
  const dt = t - s.t; s.t = t;
  if (dt > 0 && dt < 0.25) s.a = (s.a + w * dt) % TAU;
  return s.a;
}

// ---- leg / actuator drawing
function snLeg(hip, ax, ay, fp) { const kn = ik2(hip[0], hip[1], ax, ay, SN_T, SN_S, 'fwd'); return { hip, kx: kn[0], ky: kn[1], ax: kn[2], ay: kn[3], fp }; }
function snPiston(ctx, P, far, ax, ay, bx, by) {
  const d = hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / d, uy = (by - ay) / d, cl = min(15, d * 0.62), cxp = ax + ux * cl, cyp = ay + uy * cl;
  seg(ctx, far ? P.rodF : P.rod, cxp - ux, cyp - uy, bx, by, max(0.15, (d - cl + 1) / 24), true);
  seg(ctx, far ? P.cylF : P.cyl, ax, ay, bx, by, cl / 18, true);
}
function snDrawLeg(ctx, P, L, far) {
  seg(ctx, far ? P.shinF : P.shin, L.kx, L.ky, L.ax, L.ay, 1, true);
  ctx.save(); ctx.translate(L.ax, L.ay); ctx.rotate(L.fp); put(ctx, far ? P.footF : P.foot, 0, 0); ctx.restore();
  seg(ctx, far ? P.thighF : P.thigh, L.hip[0], L.hip[1], L.kx, L.ky, 1, true);
  // knee actuator bridging the rear of the joint
  const tx = L.kx - L.hip[0], ty = L.ky - L.hip[1], tl = hypot(tx, ty) || 1, sx = L.ax - L.kx, sy = L.ay - L.ky, sl = hypot(sx, sy) || 1;
  snPiston(ctx, P, far, L.hip[0] + tx * 0.5 - ty / tl * 11.6, L.hip[1] + ty * 0.5 + tx / tl * 11.6, L.kx + sx * 0.42 - sy / sl * 9.8, L.ky + sy * 0.42 + sx / sl * 9.8);
}
function snHose(ctx, ax, ay, bx, by, sag, w) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#151617'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
  ctx.strokeStyle = 'rgba(214,218,220,0.26)'; ctx.lineWidth = w * 0.26; ctx.beginPath(); ctx.moveTo(ax + 0.4, ay - 0.5); ctx.quadraticCurveTo(mx + 0.4, my - 0.7, bx + 0.4, by - 0.5); ctx.stroke();
  ctx.restore();
}
function snDust(ctx, x, y, k, dir) {           // k: 1 (fresh) -> 0
  if (FO || k <= 0.02) return;
  const p = 1 - k; ctx.save();
  for (let i = 0; i < 4; i++) {
    const r = 3 + 7 * p + i * 1.2, dx = ((i - 1.5) * 5 * (0.4 + p) - 4 * p) * dir, dy = -1 - 2.5 * p * (1 + (i & 1));
    ctx.globalAlpha = 0.36 * k * k; ctx.drawImage(puffSpr('128,110,90'), x + dx - r, y + dy - r, r * 2, r * 2);
  }
  ctx.restore();
}

// ---- rotary barrel cluster (gun-local, along +x): 6 barrels orbiting the axis, back ones first, motion-blurred when spinning fast
function snBarrels(ctx, ang, w, dead) {
  const X0 = SN_GUN.X0, X1 = SN_GUN.X1, RC = 4.9, RB = 2.0, n = 6;
  const blur = c01((w - 10) / 28), sub = blur > 0.04 ? 5 : 1, spread = blur * 0.62, items = [];
  for (let i = 0; i < n; i++) for (let s = 0; s < sub; s++) { const a = ang + i * TAU / n + (sub > 1 ? (s / (sub - 1) - 0.5) * 2 * spread : 0); items.push([sin(a) * RC, cos(a)]); }
  items.sort((p, q) => p[1] - q[1]);
  ctx.save();
  for (const b of items) {
    const y = b[0], z01 = b[1] * 0.5 + 0.5, lit = (0.6 + 0.4 * z01) * (dead ? 0.45 : 1);
    ctx.globalAlpha = sub > 1 ? 0.42 : 1;
    ctx.fillStyle = lgrad(ctx, 0, y - RB, 0, y + RB, [[0, T(SN.steel, 1.6 * lit)], [0.28, T(SN.steel, 1.12 * lit)], [0.62, T(SN.steelD, 0.8 * lit)], [1, T(SN.dark, 0.5 * lit)]]);
    ctx.fillRect(X0, y - RB, X1 - X0, RB * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(X1 - 1.4, y - RB - 0.2, 1.4, RB * 2 + 0.4);
    ctx.fillStyle = 'rgba(0,0,0,' + (0.32 * (1 - z01)) + ')'; ctx.fillRect(X0, y - RB, X1 - X0, RB * 2);     // barrels at the back sit in shadow
  }
  ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(8,6,4,0.6)'; ctx.lineWidth = 0.4; if (sub === 1) for (const b of items) { ctx.strokeRect(X0, b[0] - RB, X1 - X0, RB * 2); } ctx.restore();
}

// ---- eye lens (head-local)
function snEye(ctx, P, S, t, rage, dead) {
  const ex = SN_EYE[0], ey = SN_EYE[1];
  let E = c01(S.eye), F = c01(S.eyeF);
  if (dead) { const fl = U.vnoise(t * 8, 3.1, 8); E = fl > 0.8 ? (fl - 0.8) * 3.5 : 0; F = 0; }
  const hot = mixc([255, 150, 40], [232, 28, 16], rage), core = mixc([255, 236, 176], [255, 120, 80], rage), cool = dead ? [22, 5, 3] : mixc([64, 10, 6], [46, 6, 4], rage);
  const sx = sin(t * 0.9 + 1) * 1.7 * (1 - F), sy = clamp(S.aim, -1, 1) * 1.1;
  ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, 6.5, 0, TAU); ctx.clip();
  const gr = ctx.createRadialGradient(ex + sx * 0.5, ey + sy * 0.4, 0.2, ex, ey, 6.5);
  gr.addColorStop(0, css(mixc(mixc(cool, core, E), [255, 255, 240], F * 0.8))); gr.addColorStop(0.3, css(mixc(cool, hot, E)));
  gr.addColorStop(0.7, css(mixc(cool, mixc(hot, [110, 20, 8], 0.6), E * 0.85))); gr.addColorStop(1, css([22, 6, 4]));
  ctx.fillStyle = gr; ctx.fillRect(ex - 7, ey - 7, 14, 14);
  ctx.strokeStyle = 'rgba(20,4,2,0.55)'; ctx.lineWidth = 0.35; for (const r of [2.4, 4.1, 5.6]) { ctx.beginPath(); ctx.arc(ex + sx * 0.2, ey + sy * 0.2, r, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = 'rgba(22,3,2,' + (0.92 - 0.55 * F) + ')'; ctx.beginPath(); ctx.ellipse(ex + sx, ey + sy, 1.05, 2.2 * (1 - F * 0.5), 0, 0, TAU); ctx.fill();
  if (E > 0.2 && F < 0.5) { const bx = ex + sin(t * 1.35) * 4.4; ctx.fillStyle = 'rgba(255,232,196,' + (0.16 * E) + ')'; ctx.fillRect(bx - 0.35, ey - 6.3, 0.7, 12.6); }
  ctx.restore();
  put(ctx, P.lensRing, ex, ey);
  if (E > 0.03 || F > 0.03) glow(ctx, ex, ey, 9 + 5 * E + 16 * F, rgbs(mixc(hot, [255, 255, 230], F)), 0.3 * E + 0.9 * F);
  if (rage > 0.05 && !dead) glow(ctx, ex, ey, 19 + 5 * sin(t * 5.5), '255,40,24', 0.4 * rage * (0.75 + 0.25 * sin(t * 5.5)));   // phase 3: the whole head pulses red
  if (F > 0.05 && !FO) {                                                  // lens flare cross while the beam fires
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const [l, w, a] of [[34, 1.1, 0.8], [20, 0.9, 0.6]]) {
      const sh = 1 + 0.15 * sin(t * 40), vx = a === 0.8 ? 1 : 0, vy = 1 - vx, L2 = l * F * sh;
      const g2 = ctx.createLinearGradient(ex - vx * L2, ey - vy * L2, ex + vx * L2, ey + vy * L2);
      g2.addColorStop(0, 'rgba(255,200,140,0)'); g2.addColorStop(0.5, 'rgba(255,245,220,' + (a * F) + ')'); g2.addColorStop(1, 'rgba(255,200,140,0)');
      ctx.strokeStyle = g2; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(ex - vx * L2, ey - vy * L2); ctx.lineTo(ex + vx * L2, ey + vy * L2); ctx.stroke();
    }
    ctx.restore();
  }
}
function snAntenna(ctx, t, S, dead) {
  const bx = -3.4, by = -27, sway = sin(t * 1.9) * 0.9 + S.shake * sin(t * 30) * 1.4 - S.th * 6, len = dead ? 9 : 15, tx = bx - 2.4 + sway, ty = by - len;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#141516'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 0.6 + sway * 0.3, by - len * 0.55, tx, ty); ctx.stroke();
  ctx.strokeStyle = 'rgba(220,224,226,0.45)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(bx + 0.3, by); ctx.quadraticCurveTo(bx - 0.3 + sway * 0.3, by - len * 0.55, tx + 0.3, ty); ctx.stroke();
  ctx.fillStyle = css(T(SN.steel, 0.9)); ctx.fillRect(bx - 1.3, by - 1.2, 2.6, 1.7);
  const on = !dead && sin(t * 3.4) > 0.55;
  ctx.fillStyle = on ? 'rgb(255,90,70)' : 'rgb(96,24,20)'; ctx.beginPath(); ctx.arc(tx, ty, 0.9, 0, TAU); ctx.fill();
  if (on) glow(ctx, tx, ty, 6, '255,70,50', 0.9);
  ctx.restore();
}

// ---- reactor window on the flank (torso-local): the two halves of the stencilled side panel squash away toward their outer edges, revealing the glowing core
function snChest(ctx, tc, ev, t, dead) {
  const o = eio(ev), W = SN_WIN, x0 = W[0], y0 = W[1], x1 = W[2], y1 = W[3], ym = (y0 + y1) / 2, w = x1 - x0, pulse = 0.8 + 0.2 * sin(t * 7) + 0.08 * sin(t * 17.3), lv = pulse * (dead ? 0.13 : 1);
  ctx.save(); rrect(ctx, x0, y0, w, y1 - y0, 1.6); ctx.clip();
  ctx.fillStyle = lgrad(ctx, 0, y0, 0, y1, [[0, '#0b0c0d'], [1, '#050506']]); ctx.fillRect(x0, y0, w, y1 - y0);
  ctx.fillStyle = 'rgba(126,134,138,0.34)'; for (let i = 0; i < 9; i++) ctx.fillRect(x0, y0 + 2 + i * 3.2, w, 0.5);
  const mx = (x0 + x1) / 2, ry0 = y0 + 3.4, rh = y1 - y0 - 6.8;
  const rg = ctx.createLinearGradient(mx - 4.4, 0, mx + 4.4, 0);
  rg.addColorStop(0, css([120 * lv + 20, 40 * lv + 8, 10])); rg.addColorStop(0.28, css([255, 120 * lv + 20, 34 * lv])); rg.addColorStop(0.5, css([255, 214 * lv + 30, 156 * lv + 20]));
  rg.addColorStop(0.72, css([255, 130 * lv + 20, 40 * lv])); rg.addColorStop(1, css([110 * lv + 20, 34 * lv + 6, 8]));
  ctx.fillStyle = rg; rrect(ctx, mx - 4.4, ry0, 8.8, rh, 3); ctx.fill();
  ctx.fillStyle = 'rgba(30,10,4,0.5)'; for (let i = 0; i < 5; i++) ctx.fillRect(mx - 4.6, ry0 + 3 + i * (rh - 6) / 4, 9.2, 0.7);
  ctx.fillStyle = 'rgba(255,240,200,' + (0.5 * lv) + ')'; ctx.fillRect(mx - 0.6, ry0 + 1.5, 1.2, rh - 3);
  glow(ctx, mx, (y0 + y1) / 2, 20, '255,150,50', 0.9 * o * lv);
  ctx.restore();
  const ss = tc.ss, sx = (x0 + tc.ox) * ss, sw = w * ss, hT = ym - y0, hB = y1 - ym, kk = max(0.1, 1 - o);
  ctx.drawImage(tc.c, sx, (y0 + tc.oy) * ss, sw, hT * ss, x0, y0, w, hT * kk);
  ctx.drawImage(tc.c, sx, (ym + tc.oy) * ss, sw, hB * ss, x0, y1 - hB * kk, w, hB * kk);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x0, y0 + hT * kk - 0.4, w, 0.8); ctx.fillRect(x0, y1 - hB * kk - 0.4, w, 0.8);
  ctx.fillStyle = 'rgba(255,246,220,0.5)'; ctx.fillRect(x0, y0 + hT * kk - 0.9, w, 0.4);
  glow(ctx, mx + 4, (y0 + y1) / 2, 36, '255,120,40', 0.5 * o * lv);
}
// ---- missile pod face (pod-local, origin at the face's front edge): warheads climb out of the tubes, six lids fold up on their hinges
function snMissiles(ctx, P, po, pl, t, k, dead) {
  const px = (i) => -8 + i * 7.4, py = (j) => -4.4 + j * 2.6 + 0.6;
  if (po > 0.05 && !dead) for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) glow(ctx, px(i), py(j) - 1, 6.5, '255,140,50', 0.5 * po);
  if (pl > 0.03 && !dead) {
    for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) {
      const x = px(i), y = py(j), lift = pl * (12 + ((i + j) & 1) * 1.8);
      ctx.save(); ctx.beginPath(); ctx.rect(x - 3.6, y - 30, 7.2, 30); ctx.clip();
      const gx = ctx.createLinearGradient(x - 1.8, 0, x + 1.8, 0); gx.addColorStop(0, '#565b5e'); gx.addColorStop(0.55, '#d6d9d4'); gx.addColorStop(1, '#6a6f73');
      ctx.fillStyle = gx; ctx.fillRect(x - 1.8, y - lift - 8, 3.6, 10);
      ctx.fillStyle = '#b8301c'; ctx.fillRect(x - 1.8, y - lift - 4.2, 3.6, 1.1); ctx.fillStyle = '#e8c34a'; ctx.fillRect(x - 1.8, y - lift - 1.6, 3.6, 0.7);
      ctx.fillStyle = 'rgb(236,134,54)'; ctx.beginPath(); ctx.moveTo(x - 1.8, y - lift - 8); ctx.quadraticCurveTo(x - 0.9, y - lift - 11.6, x, y - lift - 13); ctx.quadraticCurveTo(x + 0.9, y - lift - 11.6, x + 1.8, y - lift - 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,210,0.55)'; ctx.fillRect(x + 0.2, y - lift - 8, 0.6, 9);
      ctx.restore();
    }
  }
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) {
    ctx.save(); ctx.translate(px(i) - 4.2, py(j)); ctx.scale(1, 0.43); ctx.rotate(-po * 1.5); put(ctx, P.podLid, 0, 0); ctx.restore();
  }
  if (!FO && pl > 0.9 && !dead) {                                        // launch flashes cycle through the tubes while the pod is firing
    const per = 0.34, idx = Math.floor(t / per) % 6, age = (t % per), fl = Math.exp(-age * 8), i = idx % 3, j = idx >> 1 & 1, x = px(i), y = py(j);
    glow(ctx, x, y - 4, 9, '255,160,70', 0.9 * fl);
    smoke(ctx, x, y - 2, t, { n: 5, rise: 26, spread: 3, r0: 1.6, r1: 6, speed: 1.4, a: 0.34, col: '196,192,186', seed: idx });
  }
}

function drawSentry(ctx, e, G, flashOnly) {
  FO = !!flashOnly;
  const P = cached('sn', buildSentry), t = nz(e.t, 0), f = e.face < 0 ? -1 : 1, kS = nz(e.scale, 1), st = e.state || 'idle', dead = isDead(e), bs = e.bs || {};
  const rage = c01(nz(bs.rage, 0)), k = c01(nz(e.atkK, 0)), heat = dead ? 0 : c01(nz(bs.heat, st === 'gatling' ? 0.6 : 0));
  const cx = nz(e.cx, nz(e.x, 0) + nz(e.w, 100) / 2), gy = nz(e.bottom, nz(e.y, 0) + nz(e.h, 120));
  const stride = (e.def && e.def.stride) || 0.075, ph = nz(e.phase, 0) * TAU / (SN_CYCLE * stride);
  const hpF = nz(e.maxHp, 0) > 0 ? c01(nz(e.hp, e.maxHp) / e.maxHp) : 1, dmg = dead ? 1 : c01((0.7 - hpF) / 0.55);
  const moving = st === 'walk' || st === 'chase' || st === 'patrol' || st === 'run';
  const tg = snPose(e, st, t, ph, dead);
  const fast = st === 'windup' || st === 'gatling' || st === 'stomp' || st === 'missile' || st === 'fire';
  const S = smoothState(e, tg, { _: dead ? 40 : fast ? 16 : 9, nfx: 30, nfy: 30, nfp: 26, ffx: 30, ffy: 30, ffp: 26, px: fast ? 22 : 13, py: fast ? 26 : 15, th: 12, ga: 14, spin: 5, gs: 12, eye: 12, eyeF: 22, fhx: 12, fhy: 12 });
  const PP = dead ? snDeadSet(P) : P, spinA = snSpinAngle(e, S.spin, t);
  const fm = f < 0 ? 'M' : '';                          // left-facing draws use the parts with pre-mirrored lettering
  ctx.save();
  ctx.translate(cx, gy); ctx.scale(f * kS * SN_SCALE, kS * SN_SCALE);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.translate(S.shake * sin(t * 47) * 0.9, S.shake * sin(t * 61) * 0.5);
  const px = S.px, py = S.py, th = S.th;
  const fig = (lx, ly) => { const r = rot2(lx, ly, th); return [px + r[0], py + r[1]]; };
  const LN = snLeg(fig(SN_HIP.n[0], SN_HIP.n[1]), S.nfx, S.nfy, S.nfp), LF = snLeg(fig(SN_HIP.f[0], SN_HIP.f[1]), S.ffx, S.ffy, S.ffp);

  // ---- far side first: hanging manipulator, far leg
  {
    const fsh = fig(SN_FSHO[0], SN_FSHO[1]), fa = ik2(fsh[0], fsh[1], S.fhx, S.fhy, SN_ARM.U, SN_ARM.F, 'back');
    seg(ctx, PP.farUpF, fsh[0], fsh[1], fa[0], fa[1], SN_ARMK, true); seg(ctx, PP.farForeF, fa[0], fa[1], fa[2], fa[3], SN_ARMK, true);
  }
  snDrawLeg(ctx, PP, LF, true);

  // ---- torso + chest reactor + lamps
  ctx.save(); ctx.translate(px, py); ctx.rotate(th);
  put(ctx, PP['torso' + fm], 0, 0);
  if (!dead) {
    const cols = [[70, 235, 110], [255, 190, 60], [255, 60, 40]], busy = st === 'windup' || st === 'gatling' || st === 'fire' || st === 'missile';
    const on = [0.9, sin(t * 2.6) > 0 ? 1 : 0.18, busy ? 1 : rage];
    for (let i = 0; i < 3; i++) { const a = on[i]; if (a <= 0.02) continue; const l = SN_LAMPS[i]; ctx.fillStyle = css(cols[i], a); ctx.beginPath(); ctx.arc(l[0], l[1], 0.85, 0, TAU); ctx.fill(); glow(ctx, l[0], l[1], 4.4, rgbs(cols[i]), 0.6 * a); }
  }
  if (S.ev > 0.03) {
    snChest(ctx, PP['torso' + fm], S.ev, t, dead);
  }
  ctx.restore();

  // ---- near leg (over the pelvis), missile pod (behind the head)
  snDrawLeg(ctx, PP, LN, false);
  {
    const pp = fig(-19, -46);
    ctx.save(); ctx.translate(pp[0], pp[1]); ctx.rotate(th + S.pt);
    put(ctx, PP['pod' + fm], 0, 0); ctx.translate(0, -27); put(ctx, PP.podFace, 0, 0);
    snMissiles(ctx, PP, S.po, S.pl, t, k, dead);
    ctx.restore();
  }
  // ---- cables: neck bundle and the gun feed
  const hp = fig(SN_HEADP[0], SN_HEADP[1]), hr = th + S.hr, sh = fig(SN_SHO[0], SN_SHO[1]);
  {
    const a = fig(-9, -47), b = [hp[0] + rot2(-12, -6, hr)[0], hp[1] + rot2(-12, -6, hr)[1]];
    snHose(ctx, a[0], a[1], b[0], b[1], 3.5, 2.2);
    const c = fig(8, -14), d = [sh[0] + rot2(6.5, 11, S.ga)[0], sh[1] + rot2(6.5, 11, S.ga)[1]];
    snHose(ctx, c[0], c[1], d[0], d[1], 9, 2.6);
    // gun-arm actuator: torso -> underside of the receiver
    const m = fig(11, -22), q = [sh[0] + rot2(10, 9, S.ga)[0], sh[1] + rot2(10, 9, S.ga)[1]];
    snPiston(ctx, PP, false, m[0], m[1], q[0], q[1]);
  }
  // ---- head
  ctx.save(); ctx.translate(hp[0], hp[1]); ctx.rotate(hr);
  put(ctx, PP['head' + fm], 0, 0); snEye(ctx, PP, S, t, rage, dead); snAntenna(ctx, t, S, dead);
  ctx.restore();

  // ---- gun arm: receiver, spinning barrels, cooling shroud, muzzle collar, then the pauldron over the root
  {
    const gs = S.gs, rec = gs * (0.5 + 0.5 * sin(t * 71)) * 1.1, jit = gs * sin(t * 83) * 0.012;
    ctx.save(); ctx.translate(sh[0], sh[1]); ctx.rotate(S.ga + jit); ctx.translate(-rec, 0);
    put(ctx, PP.gunBody, 0, 0);
    snBarrels(ctx, spinA, S.spin, dead);
    put(ctx, PP.gunShroud, SN_GUN.SHR, 0); put(ctx, PP.gunFront, SN_GUN.CLA, 0);
    if (!FO && !dead) {
      if (heat > 0.02) {                                              // barrels glow from the muzzle end backward
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = lgrad(ctx, SN_GUN.X0, 0, SN_GUN.X1, 0, [[0, 'rgba(255,70,20,0)'], [0.45, 'rgba(255,90,30,' + (0.32 * heat) + ')'], [1, 'rgba(255,170,70,' + (0.78 * heat) + ')']]);
        ctx.fillRect(SN_GUN.X0, -6.6, SN_GUN.X1 - SN_GUN.X0 + 1.5, 13.2); ctx.restore();
        glow(ctx, SN_GUN.X1 - 6, 0, 14 + 8 * heat, '255,110,50', 0.55 * heat);
      }
      if (st === 'gatling' && gs > 0.5) {                             // muzzle flash: fresh random star every ~25 ms
        const fi = Math.floor(t * 40); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          const a = (U.hash2(fi, i, 71) - 0.5) * 1.5, l = 8 + U.hash2(fi, i, 72) * 18;
          ctx.strokeStyle = 'rgba(255,' + (150 + (U.hash2(fi, i, 73) * 90 | 0)) + ',110,0.85)'; ctx.lineWidth = 1.3 - i * 0.12;
          ctx.beginPath(); ctx.moveTo(SN_GUN.X1, (U.hash2(fi, i, 74) - 0.5) * 8); ctx.lineTo(SN_GUN.X1 + cos(a) * l, sin(a) * l * 0.55); ctx.stroke();
        }
        ctx.restore();
        glow(ctx, SN_GUN.X1 + 3, 0, 20, '255,110,70', 0.85 + 0.25 * U.hash2(fi, 9, 75)); glow(ctx, SN_GUN.X1 + 2, 0, 8, '255,240,220', 0.9);
      } else if (st === 'windup') glow(ctx, SN_GUN.X1 + 2, 0, 8 + 5 * k, '255,100,60', 0.2 + 0.5 * k);
      if (heat > 0.55 && !moving) smoke(ctx, SN_GUN.X1 - 4, 0, t, { n: 4, rise: 22, spread: 3, r0: 1.5, r1: 5, speed: 0.6, a: 0.28 * (heat - 0.4), col: '180,184,186', seed: 5, dir: -HP2 - S.ga });
    }
    ctx.restore();
    ctx.save(); ctx.translate(sh[0], sh[1]); ctx.rotate(th * 0.6 + (S.ga - 1.0) * 0.12); put(ctx, PP['pauldron' + fm], 0, 0); ctx.restore();
  }

  // ---- environment: dust, steam, sparks
  if (!FO) {
    if (moving) {
      const u = ph / TAU, un = u - Math.floor(u), uf = (u + 0.5) - Math.floor(u + 0.5);
      if (un < 0.22) snDust(ctx, LN.ax - 8, -2, 1 - un / 0.22, -1);
      if (uf < 0.22) snDust(ctx, LF.ax - 8, -2, 1 - uf / 0.22, -1);
    }
    if (st === 'stomp' && k > 0.68 && !dead) {
      const imp = c01(1 - (k - 0.68) / 0.3), fx = LN.ax + 8;
      snDust(ctx, fx, -2, imp, 1); snDust(ctx, fx - 4, -2, imp, -1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,214,160,' + (0.55 * imp) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(fx, -1.5, 8 + 46 * (1 - imp), 1.6 + 5 * (1 - imp), 0, 0, TAU); ctx.stroke(); ctx.restore();
      sparks(ctx, fx, -3, t, imp, -HP2, { n: 10, spread: 3.4, len: 9, seed: 3 });
    }
    const wisp = 0.14 + 0.5 * Math.pow(max(0, sin(t * 0.8)), 8), va = S.ev;
    for (let i = 0; i < 2; i++) {
      const s = fig(SN_STK[i][0], SN_STK[i][1]);
      if (dead) smoke(ctx, s[0], s[1], t, { n: 6, rise: 44, spread: 5, r0: 2.5, r1: 10, speed: 0.34, a: 0.4, col: '46,42,38', seed: i * 3 + 1, drift: -10 });
      else smoke(ctx, s[0], s[1], t, { n: 6, rise: 20 + 34 * va, spread: 4, r0: 2, r1: 5 + 6 * va, speed: 0.5 + 0.5 * va, a: wisp * 0.55 + va * 0.5, col: '178,184,186', seed: i * 3 + 1 });
    }
    if (va > 0.2) for (const wx of [-10, 2]) { const c = fig(wx, -40); smoke(ctx, c[0], c[1], t, { n: 6, rise: 34, spread: 5, r0: 2, r1: 8, speed: 0.9, a: 0.6 * va, col: '214,222,224', seed: 11 + wx }); }
    if (dmg > 0.3 && !dead) { const h = fig(SN_HOLES[1][0], SN_HOLES[1][1]); smoke(ctx, h[0], h[1], t, { n: 4, rise: 26, spread: 3, r0: 1.6, r1: 6, speed: 0.4, a: 0.3 * dmg, col: '52,48,44', seed: 7 }); }
    if (rage > 0.05 || dead || dmg > 0.4) {                            // arcing sparks from bullet holes / broken joints
      const cyc = Math.floor(t * 2.2), h = SN_HOLES[cyc % SN_HOLES.length], pos = fig(h[0], h[1]);
      if (U.hash2(cyc, 7, 9) < (dead ? 0.55 : 0.2 + rage * 0.5 + dmg * 0.3)) sparks(ctx, pos[0], pos[1], t, 1, -HP2, { n: 7, spread: 3.2, len: 8, seed: cyc % 5 });
      if (dead && S.dead > 0.6) { const q = fig(6, -47); if (U.hash2(Math.floor(t * 1.6), 3, 4) < 0.45) sparks(ctx, q[0], q[1], t, 0.8, -HP2 + 0.4, { n: 6, spread: 2.6, len: 7, seed: 9 }); }
    }
  }
  ctx.restore();
}

CD.art.sentry = drawSentry;
CD.art.sentry.CYCLE_PX = SN_CYCLE;

// DEV-ONLY: exposes the baked parts for the part viewer (tests/dev_boss.html?part=deathclaw.head)
CD.art.__bossParts = function (n) {
  const m = { deathclaw: () => cached('dc', buildDeathclaw) };
  if (typeof buildSentry !== 'undefined') m.sentry = () => cached('sn', buildSentry);
  if (typeof buildOverseer !== 'undefined') m.overseer = () => cached('ov', buildOverseer);
  return m[n]();
};
})();
