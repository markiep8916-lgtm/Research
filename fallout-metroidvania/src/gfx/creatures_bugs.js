// Creature art: radroach, bloatfly, molerat, scorpion, mirelurk.
// Everything is painted procedurally. Static body parts are pre-rendered (lazily, on first draw) into 4x supersampled
// offscreen canvases with baked gradient shading / grime / specular; only limbs, wings, tails, antennae are animated per frame.
// Art is "fully lit albedo" (the game multiplies a lighting map on top), so tones stay mid-value with dark AO baked in.
(function () {
'use strict';
const CD = window.CD, U = CD.U;
CD.art = CD.art || {};

const SS = 4;                                   // part supersampling
const PI = Math.PI, TAU = PI * 2;
const clamp = U.clamp, lerp = U.lerp;
const sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, atan2 = Math.atan2, sqrt = Math.sqrt;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ================================================================== colour helpers
function col(c, f, a) {                          // [r,g,b] * f -> css colour
  f = f === undefined ? 1 : f;
  const r = clamp(c[0] * f, 0, 255) | 0, g = clamp(c[1] * f, 0, 255) | 0, b = clamp(c[2] * f, 0, 255) | 0;
  return a === undefined || a >= 1 ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + (a < 0 ? 0 : +a.toFixed(3)) + ')';
}
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const OUT = 'rgba(10,8,6,0.62)';                 // silhouette outline colour

// ================================================================== shape helpers
function blob(g, pts, closed) {                  // smooth closed curve (Catmull-Rom -> bezier)
  const n = pts.length; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  const m = closed === false ? n - 1 : n;
  for (let i = 0; i < m; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed !== false) g.closePath();
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
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
function ell(g, cx, cy, rx, ry, rot) { g.beginPath(); g.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); }
function scalePts(pts, cx, cy, sx, sy) { return pts.map((p) => [cx + (p[0] - cx) * sx, cy + (p[1] - cy) * (sy === undefined ? sx : sy)]); }

// ================================================================== offscreen parts
// Every part is painted once at SS x resolution. A half-size copy (c2) is derived with a proper filter so that, at the usual on-screen
// scale (about 1-1.5 device px per world px), drawImage can use cheap bilinear sampling from a 2x source without aliasing.
let MIP2 = false;                                 // set per draw call from the current transform scale
function halve(c) {
  const c2 = U.canvas(Math.ceil(c.width / 2), Math.ceil(c.height / 2)), g2 = c2.getContext('2d');
  g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high'; g2.drawImage(c, 0, 0, c2.width, c2.height);
  return c2;
}
function part(w, h, ox, oy, fn, ss) {           // canvas covering local [-ox, w-ox] x [-oy, h-oy]
  ss = ss || SS;
  const c = U.canvas(Math.ceil(w * ss), Math.ceil(h * ss)), g = c.getContext('2d');
  g.scale(ss, ss); g.translate(ox, oy); g.lineJoin = 'round'; g.lineCap = 'round';
  fn(g);
  return { c, c2: halve(c), w, h, ox, oy };
}
const src = (p) => (MIP2 ? p.c2 : p.c);
const blit = (ctx, p) => ctx.drawImage(src(p), -p.ox, -p.oy, p.w, p.h);
function darkened(p, f, tint) {                  // far-side copy of a part
  const c = U.canvas(p.c.width, p.c.height), g = c.getContext('2d'); g.drawImage(p.c, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint ? 'rgba(' + tint + ',' + (1 - f) + ')' : 'rgba(8,10,8,' + (1 - f) + ')'; g.fillRect(0, 0, c.width, c.height);
  return { c, c2: halve(c), w: p.w, h: p.h, ox: p.ox, oy: p.oy };
}
// draw a horizontally-authored segment sprite from (ax,ay) toward (bx,by); keeps the sprite's "top" facing up
function seg(ctx, p, ax, ay, bx, by, sc) {
  const a = atan2(by - ay, bx - ax);
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
  if (a > PI / 2 || a < -PI / 2) ctx.scale(1, -1);
  if (sc && sc !== 1) ctx.scale(sc, 1);
  ctx.drawImage(src(p), -p.ox, -p.oy, p.w, p.h);
  ctx.restore();
}
// per-draw setup: picks the sprite mip from the current transform (device px per world px) and fixes the sampler
function beginDraw(ctx, k) {
  const m = ctx.getTransform ? ctx.getTransform() : null; MIP2 = m ? Math.hypot(m.a, m.b) * k < 2.4 : false;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
}

// ================================================================== textures / paint primitives
let _noise = null, _grain = null;
function noiseTex() {                            // 128px tileable fBm, contrast-stretched
  if (_noise) return _noise;
  const w = 128, h = 128, f = U.fbmField(w, h, 6, 4, 4711, 0.55);
  let lo = 1e9, hi = -1e9; for (let i = 0; i < f.length; i++) { if (f[i] < lo) lo = f[i]; if (f[i] > hi) hi = f[i]; }
  const c = U.canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h);
  for (let i = 0; i < f.length; i++) { const v = (f[i] - lo) / (hi - lo) * 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); return (_noise = c);
}
function grainTex() {
  if (_grain) return _grain;
  const w = 64, c = U.canvas(w, w), g = c.getContext('2d'), img = g.createImageData(w, w), r = U.RNG(1337);
  for (let i = 0; i < w * w; i++) { const v = 60 + r.next() * 150; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); return (_grain = c);
}
// texture overlay in the current clip. o: {s: pattern scale, a: alpha, mode: composite, ox, oy, grain}
function overlay(g, x0, y0, x1, y1, o) {
  const p = g.createPattern(o.grain ? grainTex() : noiseTex(), 'repeat');
  if (p.setTransform) p.setTransform(new DOMMatrix([o.s || 0.25, 0, 0, o.s || 0.25, o.ox || 0, o.oy || 0]));
  g.save(); g.globalAlpha *= o.a === undefined ? 0.3 : o.a; g.globalCompositeOperation = o.mode || 'overlay'; g.fillStyle = p; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
}
// noise-stencilled colour patches (dust, algae, stains, mange...). Fills [x0,y0,x1,y1] with colour c where fBm noise exceeds th.
// o: {c:[r,g,b], a, f (noise freq per unit), th, soft, oct, seed, res (texels/unit), fn(x,y)->0..1 extra mask, contrast}
function mottle(g, x0, y0, x1, y1, o) {
  const res = o.res || 4, w = max(1, Math.ceil((x1 - x0) * res)), h = max(1, Math.ceil((y1 - y0) * res));
  const c = U.canvas(w, h), cg = c.getContext('2d'), img = cg.createImageData(c.width, c.height), d = img.data;
  const cc = o.c, f = o.f || 0.4, th = o.th === undefined ? 0.5 : o.th, soft = o.soft || 0.15, oct = o.oct || 3, seed = o.seed || 1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const ux = x0 + x / res, uy = y0 + y / res;
    let n = U.fbm(ux * f + 11.3, uy * (o.fy || f) + 7.7, oct, seed, 0.55);
    let a = sstep(th, th + soft, n) * (o.gain === undefined ? 1 : o.gain);
    if (o.fn) a *= o.fn(ux, uy);
    const i = (y * c.width + x) * 4; d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; d[i + 3] = clamp(a * 255, 0, 255);
  }
  cg.putImageData(img, 0, 0);
  g.save(); g.globalAlpha *= o.a === undefined ? 1 : o.a; g.imageSmoothingEnabled = true; if (o.mode) g.globalCompositeOperation = o.mode; g.drawImage(c, x0, y0, x1 - x0, y1 - y0); g.restore();
}
function lgrad(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (let i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]); return gr; }
// elliptical radial gradient filled over a rect (call inside a clip). focus (fx,fy) in unit-ellipse space, fr focus radius
function egrad(g, cx, cy, rx, ry, rot, stops, fx, fy, fr, cc) {          // cc: also clip to the unit ellipse (for gradients that end opaque)
  g.save(); g.translate(cx, cy); if (rot) g.rotate(rot); g.scale(rx, ry);
  if (cc) { g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.clip(); }
  const gr = g.createRadialGradient(fx || 0, fy || 0, fr || 0, 0, 0, 1);
  for (let i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]);
  g.fillStyle = gr; g.fillRect(-3, -3, 6, 6); g.restore();
}
function speckle(g, r, x0, y0, x1, y1, n, cols, s0, s1) {
  for (let i = 0; i < n; i++) { g.fillStyle = cols[(r.next() * cols.length) | 0]; const s = r.range(s0, s1); g.fillRect(r.range(x0, x1), r.range(y0, y1), s, s * r.range(0.6, 1.4)); }
}
// tapered lens-shaped highlight along a quadratic curve
function streak(g, x0, y0, cx, cy, x1, y1, w, fill) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx + nx * w, cy + ny * w, x1, y1); g.quadraticCurveTo(cx - nx * w * 0.35, cy - ny * w * 0.35, x0, y0);
  g.fillStyle = fill; g.fill();
}
// rim light: soft coloured stroke just inside the outline, strongest where the gradient (x0,y0)->(x1,y1) is opaque
function rim(g, pathFn, x0, y0, x1, y1, c0, c1, lw) {
  g.save(); pathFn(g); g.clip(); pathFn(g);
  g.strokeStyle = lgrad(g, x0, y0, x1, y1, [[0, c0], [1, c1 || 'rgba(0,0,0,0)']]); g.lineWidth = lw || 1.6; g.stroke(); g.restore();
}
function outline(g, pathFn, lw, c) { g.save(); pathFn(g); g.lineWidth = lw || 0.6; g.strokeStyle = c || OUT; g.stroke(); g.restore(); }

// ---- segmented limb sprite: horizontal tube from (0,0) to (len,0). Half-width follows prof(k) (k 0..1) or lerps w0->w1.
// Cylindrical shading across the width (highlight slightly above the axis), joint darkening at both ends, optional spines,
// rim/spec hairline. o: {prof, spine, spines, bothSides, spineDir, spineCol, hi, tex, bounce, spec, details(g,r), line, seed}
function tube(len, w0, w1, base, o) {
  o = o || {};
  const prof = o.prof || ((k) => lerp(w0, w1, k));
  let wm = 0; for (let i = 0; i <= 10; i++) wm = max(wm, prof(i / 10));
  const sl = o.spine || 0, ex = o.extra || 0, pad = wm + 1.5 + sl, H = wm * 2 + (1.5 + sl) * 2 + (o.tall || 0), W = len + pad * 2 + ex, N = 14;
  return part(W, H, pad, H / 2, (g) => {
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) { const k = i / N, w = prof(k); top.push([k * len, -w]); bot.push([k * len, w]); }
    const path = (g) => {
      g.beginPath(); g.moveTo(top[0][0], top[0][1]);
      for (let i = 1; i <= N; i++) g.lineTo(top[i][0], top[i][1]);
      g.arc(len, 0, prof(1), -PI / 2, PI / 2);
      for (let i = N; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
      g.arc(0, 0, prof(0), PI / 2, PI * 1.5); g.closePath();
    };
    const r = U.RNG(o.seed || 5);
    if (sl) {                                    // spines: behind the tube so its edge overlaps the roots
      g.fillStyle = col(o.spineCol || mixc(base, [20, 12, 8], 0.55));
      const n = o.spines || 4;
      for (let i = 0; i < n; i++) {
        const k = (i + 0.7) / (n + 0.2), x = k * len, w = prof(k), a = (o.spineDir === undefined ? 0.5 : o.spineDir);
        for (const sd of (o.bothSides ? [-1, 1] : [-1])) { g.beginPath(); g.moveTo(x - 0.5, sd * (w - 0.1)); g.lineTo(x + a * 1.3, sd * (w + sl * r.range(0.75, 1))); g.lineTo(x + 0.6, sd * (w - 0.1)); g.closePath(); g.fill(); }
      }
    }
    g.save(); path(g); g.clip();
    g.fillStyle = lgrad(g, 0, -wm, 0, wm, [[0, col(base, 0.42)], [0.16, col(base, 0.78)], [0.36, col(base, o.hi || 1.32)], [0.55, col(base, 1.0)], [0.82, col(base, 0.6)], [1, col(base, 0.36)]]);
    g.fillRect(-wm, -wm, len + wm * 2, wm * 2);
    g.fillStyle = lgrad(g, 0, 0, len, 0, [[0, 'rgba(0,0,0,0.34)'], [0.14, 'rgba(0,0,0,0)'], [0.86, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.34)']]); g.fillRect(-wm, -wm, len + wm * 2, wm * 2);
    if (o.bounce) { g.fillStyle = lgrad(g, 0, wm * 0.4, 0, wm, [[0, 'rgba(0,0,0,0)'], [1, o.bounce]]); g.fillRect(0, 0, len, wm); }
    overlay(g, -wm, -wm, len + wm, wm, { s: 0.3, a: o.tex === undefined ? 0.22 : o.tex, mode: 'overlay', ox: r.range(0, 30), oy: r.range(0, 30) });
    if (o.details) o.details(g, r);
    g.strokeStyle = o.spec || 'rgba(255,245,220,0.5)'; g.lineWidth = 0.32; g.beginPath(); g.moveTo(wm * 0.7, -prof(0.1) * 0.42); g.lineTo(len - wm * 0.7, -prof(0.9) * 0.42); g.stroke();
    g.restore();
    outline(g, path, o.line || 0.5);
    if (o.after) o.after(g, r);
  });
}

// ---- fur painter: shades a smooth closed shape, scatters many short coloured strokes along a flow field, fuzzes the silhouette with edge
// tufts and outlines it. o: {base, stops:[[t,f]] (vertical value), b:[x0,y0,x1,y1], pal(x,y,R)->[r,g,b], n, len:[a,b], lw:[a,b], alpha:[a,b],
//   flow(x,y)->angle, round:{cx,cy,rx,ry,k} (edge darkening), seed, tuft:[len0,len1], tuftStep, under(g,R), over(g,R), outline}
function furVal(stops, t) {
  t = clamp(t, 0, 1);
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const a = stops[i - 1], b = stops[i]; return lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0] || 1)); }
  return stops[stops.length - 1][1];
}
function fur(g, pts, o) {
  const R = U.RNG(o.seed || 1), b = o.b, path = (g) => blob(g, pts), rd = o.round;
  const val = (x, y) => {
    let v = furVal(o.stops, (y - b[1]) / (b[3] - b[1]));
    if (rd) { const dx = (x - rd.cx) / rd.rx, dy = (y - rd.cy) / rd.ry, r = Math.hypot(dx, dy); v *= 1 - (rd.k || 0.4) * clamp((r - 0.55) / 0.6, 0, 1); }
    return v;
  };
  g.save(); path(g); g.clip();
  g.fillStyle = lgrad(g, 0, b[1], 0, b[3], o.stops.map((s) => [s[0], col(o.base, s[1])])); g.fillRect(b[0] - 2, b[1] - 2, b[2] - b[0] + 4, b[3] - b[1] + 4);
  if (o.under) o.under(g, R);
  const la = o.len, lw = o.lw, al = o.alpha || [0.35, 0.85];
  for (let i = 0; i < o.n; i++) {
    const x = R.range(b[0], b[2]), y = R.range(b[1], b[3]), c = o.pal(x, y, R), a = o.flow(x, y) + R.range(-0.4, 0.4), l = R.range(la[0], la[1]);
    g.strokeStyle = col(c, val(x, y) * R.range(0.72, 1.28), R.range(al[0], al[1])); g.lineWidth = R.range(lw[0], lw[1]);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + cos(a) * l, y + sin(a) * l); g.stroke();
  }
  if (o.over) o.over(g, R);
  g.restore();
  // silhouette tufts (outward normal from the polygon winding)
  if (o.tuft) {
    const edge = sampleBlob(pts, 10), step = o.tuftStep || 2; let area = 0;
    for (let i = 0; i < edge.length; i++) { const p = edge[i], q = edge[(i + 1) % edge.length]; area += p[0] * q[1] - q[0] * p[1]; }
    const sg = area > 0 ? 1 : -1;
    for (let i = 0; i < edge.length; i += step) {
      const p = edge[i], q = edge[(i + 1) % edge.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      if (R.next() < 0.22) continue;
      const nx = dy / l * sg, ny = -dx / l * sg, fa = o.flow(p[0], p[1]);
      const vx = nx * 0.45 + cos(fa) * 1.0, vy = ny * 0.45 + sin(fa) * 1.0, a = atan2(vy, vx) + R.range(-0.45, 0.45), tl = R.range(o.tuft[0], o.tuft[1]) * (R.next() < 0.15 ? 1.5 : 1);
      const c = o.pal(p[0], p[1], R);
      g.strokeStyle = col(c, val(p[0], p[1]) * R.range(0.7, 1.25), R.range(0.35, 0.8)); g.lineWidth = R.range(lw[0], lw[1]) * 0.7;
      g.beginPath(); g.moveTo(p[0] - nx * 0.6, p[1] - ny * 0.6); g.lineTo(p[0] + cos(a) * tl, p[1] + sin(a) * tl); g.stroke();
    }
  }
  if (o.outline !== false) outline(g, path, o.outline || 0.5, o.outlineCol || 'rgba(16,10,6,0.5)');
}
// limb outline points along +x: half-width wf(k) at k in 0..1 (top edge then bottom edge), for blob()/fur()
function limbPts(len, wf, n) {
  n = n || 5; const top = [], bot = [];
  for (let i = 0; i <= n; i++) { const k = i / n, w = wf(k); top.push([k * len, -w]); bot.push([k * len, w]); }
  const w0 = wf(0), w1 = wf(1);
  return top.concat([[len + w1 * 0.85, 0]], bot.reverse(), [[-w0 * 0.85, 0]]);          // rounded caps at both joints
}

// ---- two-link IK; returns [kneeX, kneeY, footX, footY]. mode picks which of the two solutions the joint takes:
//   true|'up' -> higher (smaller y), 'down' -> lower, 'back' -> smaller x, 'fwd' -> larger x
function ik2(hx, hy, fx, fy, l1, l2, mode) {
  let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy); const maxd = l1 + l2 - 0.02, mind = abs(l1 - l2) + 0.05;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; } else if (d < mind) { const s = mind / (d || 1); dx = (dx || 0.01) * s; dy *= s; d = mind; }
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), base = atan2(dy, dx);
  const k1x = hx + cos(base + a) * l1, k1y = hy + sin(base + a) * l1, k2x = hx + cos(base - a) * l1, k2y = hy + sin(base - a) * l1;
  let first;
  if (mode === 'down') first = k1y > k2y; else if (mode === 'back') first = k1x < k2x; else if (mode === 'fwd') first = k1x > k2x; else first = k1y < k2y;
  return first ? [k1x, k1y, hx + dx, hy + dy] : [k2x, k2y, hx + dx, hy + dy];
}
// gait foot offset for cycle position u in [0,1): stance (duty d) sweeps +A -> -A on the ground, swing lifts and returns
function gait(u, d, A, lift) {
  u -= Math.floor(u);
  if (u < d) return [lerp(A, -A, u / d), 0];
  const k = (u - d) / (1 - d), e = k * k * (3 - 2 * k);
  return [lerp(-A, A, e), -lift * sin(k * PI)];
}
// state helpers ----------------------------------------------------------------
function atkPhases(e) {                          // atkK breakpoints (windup end, strike end) from the enemy def
  const d = e.def || {}, wt = d.windup || 0.35, st = d.strike || 0.16, rc = d.recover || 0.45, tot = wt + st + rc;
  return [wt / tot, (wt + st) / tot];
}
// returns {w: windup progress 0..1, s: strike progress 0..1 (1 = fully extended), r: recover 0..1}
function atkCurve(e) {
  const out = { w: 0, s: 0, r: 0, active: false };
  if (e.state !== 'windup' && e.state !== 'attack') return out;
  const p = atkPhases(e), k = e.atkK || 0; out.active = true;
  if (e.state === 'windup' || k < p[0]) { out.w = clamp(k / p[0], 0, 1); return out; }
  out.w = 1;
  if (k < p[1]) { out.s = clamp((k - p[0]) / (p[1] - p[0]), 0, 1); return out; }
  out.s = 1; out.r = clamp((k - p[1]) / (1 - p[1]), 0, 1); return out;
}
// Corpses are drawn rotated 180 deg about the hitbox centre, so a creature whose visual mass sits below that centre would float.
// deadDrop returns the extra upward pre-rotation shift (world px) that lets the flipped body rest on the ground; it eases in with the flip.
function deadDrop(e, bodyTop) {
  const s = e.h - bodyTop * (e.scale || 1); if (s <= 0.5) return 0;
  const k = e.deadT === undefined ? 1 : clamp(e.deadT / 0.5, 0, 1);
  return -s * (1 - (1 - k) * (1 - k));
}
const eo = (t) => 1 - (1 - t) * (1 - t);        // ease out
const ei = (t) => t * t;                          // ease in
const eio = (t) => t * t * (3 - 2 * t);

// once-per-creature lazy cache
const _cache = {};
function cached(name, build) { return _cache[name] || (_cache[name] = build()); }

// ================================================================== RADROACH
const RC = { shell: [152, 88, 48], pron: [140, 82, 46], belly: [208, 130, 60], fem: [186, 110, 52], tib: [156, 94, 46] };

function roachLeg(l1, l2, w, seed) {
  const tars = 3.6, tl = l2 - tars;
  const fem = tube(l1, w, w, RC.fem, {
    prof: (k) => w * (1.08 - 0.5 * Math.pow(k, 1.3) + 0.26 * Math.exp(-Math.pow((k - 0.96) / 0.06, 2))), seed, spine: 0.9, spines: 3, spineDir: 0.3, hi: 1.28, tex: 0.36, bounce: 'rgba(150,220,110,0.18)',
    details: (g, r) => { speckle(g, r, 0, -w, l1, w, 14, ['rgba(0,0,0,0.3)', 'rgba(255,200,130,0.2)'], 0.25, 0.6); g.fillStyle = 'rgba(20,8,2,0.5)'; g.fillRect(l1 * 0.62, -w, 0.5, w * 2); },
  });
  const tib = tube(tl, w * 0.72, w * 0.44, RC.tib, {
    prof: (k) => w * lerp(0.72, 0.44, k), seed: seed + 1, spine: 1.6, spines: 6, bothSides: true, spineDir: 0.75, tex: 0.25, extra: tars + 0.5, hi: 1.25,
    after: (g) => {                                 // tarsus segments + claw
      g.strokeStyle = col(RC.tib, 0.62); g.lineWidth = 0.5; g.beginPath(); g.moveTo(tl, 0); g.lineTo(tl + tars * 0.7, 0); g.stroke();
      g.fillStyle = col(RC.tib, 0.9); for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(tl + 0.5 + i * 0.85, 0, 0.42, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(28,12,6,0.9)'; g.lineWidth = 0.42; g.beginPath(); g.moveTo(tl + tars * 0.62, 0); g.quadraticCurveTo(tl + tars + 0.2, -0.1, tl + tars + 0.2, 0.7); g.stroke();
    },
  });
  return { fem, tib, femF: darkened(fem, 0.72), tibF: darkened(tib, 0.72), l1, l2 };
}

function buildRoach() {
  const P = {}, R = U.RNG(90210);
  // ---- underside: segmented orange abdomen (sits behind the shell)
  P.belly = part(40, 10, 21, 9, (g) => {
    const pts = [[-17, -6.2], [-13.5, -3.3], [-6, -2.1], [2, -2.1], [9, -3.1], [11.5, -6], [3, -8], [-9, -8]];
    const path = (g) => blob(g, pts);
    g.save(); path(g); g.clip();
    g.fillStyle = lgrad(g, 0, -8, 0, -2, [[0, col(RC.belly, 0.4)], [0.38, col(RC.belly, 0.92)], [0.78, col(RC.belly, 1.2)], [1, col(RC.belly, 0.78)]]); g.fillRect(-20, -9, 34, 8);
    for (let i = 0; i < 9; i++) { const x = -15.5 + i * 2.9; g.strokeStyle = 'rgba(58,28,10,0.6)'; g.lineWidth = 0.42; g.beginPath(); g.moveTo(x, -8); g.quadraticCurveTo(x + 0.9, -4.6, x - 0.3, -1.6); g.stroke(); g.strokeStyle = 'rgba(255,210,130,0.25)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(x + 0.55, -7.6); g.quadraticCurveTo(x + 1.5, -4.6, x + 0.3, -1.6); g.stroke(); }
    mottle(g, -20, -9, 14, -1, { c: [40, 18, 6], a: 0.5, f: 0.5, th: 0.5, soft: 0.25, seed: 21, res: 5 });
    overlay(g, -20, -9, 14, 0, { s: 0.3, a: 0.3, ox: 10, oy: 5 });
    g.restore();
    outline(g, path, 0.5);
  });
  // ---- cerci: two little spiky feelers at the rear tip (origin at the tip root)
  P.cerci = part(12, 6, 10, 3.5, (g) => {
    for (let i = 0; i < 2; i++) {
      const dy = i * 0.95 - 0.5, c = i ? RC.fem : mixc(RC.fem, [30, 16, 8], 0.4);
      const path = (g) => { g.beginPath(); g.moveTo(0, dy - 1.05); g.quadraticCurveTo(-2.5, dy - 0.8, -5.4, dy + 0.4); g.quadraticCurveTo(-2.5, dy + 0.5, 0, dy + 1.05); g.closePath(); };
      g.save(); path(g); g.clip(); g.fillStyle = lgrad(g, 0, dy - 1, 0, dy + 1.1, [[0, col(c, 1.3)], [1, col(c, 0.5)]]); g.fillRect(-10, -3, 12, 6);
      g.strokeStyle = 'rgba(30,14,6,0.55)'; g.lineWidth = 0.3; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(-k * 1.4, dy - 1); g.lineTo(-k * 1.7, dy + 1); g.stroke(); }
      g.restore(); outline(g, path, 0.4);
    }
  });
  // ---- shell (elytra)
  const shellPts = [[7.6, -10.4], [3.2, -12.5], [-3.6, -12.9], [-9.6, -11.5], [-14.8, -8.8], [-18, -6.2], [-16.6, -4.8], [-11, -4], [-4, -3.6], [3, -3.8], [8.6, -4.7], [10.4, -7.4]];
  const shellPath = (g) => blob(g, shellPts);
  P.shell = part(46, 20, 24, 19, (g) => {
    g.save(); shellPath(g); g.clip();
    // value structure: light top, near-black oily underside
    g.fillStyle = lgrad(g, 0, -13, 0, -3.6, [[0, col(RC.shell, 1.7)], [0.2, col(RC.shell, 1.42)], [0.46, col(RC.shell, 1.0)], [0.74, col(RC.shell, 0.66)], [1, col(RC.shell, 0.4)]]);
    g.fillRect(-20, -16, 32, 14);
    mottle(g, -19, -15, 11, -3, { c: [8, 3, 2], a: 0.32, f: 0.34, fy: 0.55, th: 0.5, soft: 0.26, seed: 3, res: 5 });
    mottle(g, -19, -15, 11, -3, { c: [190, 100, 50], a: 0.32, f: 0.55, th: 0.6, soft: 0.2, seed: 9, res: 5, fn: (x, y) => sstep(-9, -13, y) });
    egrad(g, -2.5, -11.2, 12.5, 4.4, -0.1, [[0, 'rgba(255,175,100,0.46)'], [0.55, 'rgba(200,110,50,0.14)'], [1, 'rgba(120,60,20,0)']], 0.25, -0.25, 0);
    g.fillStyle = lgrad(g, 0, -6.2, 0, -3.6, [[0, 'rgba(200,110,50,0)'], [1, 'rgba(210,120,50,0.30)']]); g.fillRect(-20, -9, 32, 6);   // warm bounce light off the belly
    g.fillStyle = lgrad(g, 4, 0, -18, 0, [[0, 'rgba(12,4,2,0)'], [0.55, 'rgba(12,4,2,0.1)'], [1, 'rgba(12,4,2,0.5)']]); g.fillRect(-20, -16, 32, 14);
    // wing-cover veins
    for (let i = 0; i < 6; i++) {
      const y1 = -12.4 + i * 1.05, ye = [-7.4, -6.9, -6.4, -5.9, -5.5, -5.1][i];
      g.strokeStyle = 'rgba(20,8,3,0.5)'; g.lineWidth = 0.34; g.beginPath(); g.moveTo(6.6, y1); g.bezierCurveTo(1, y1 - 1.2, -12 - i, -11.6 + i * 0.7, -16.2 + i * 0.3, ye); g.stroke();
      g.strokeStyle = 'rgba(255,190,120,0.17)'; g.lineWidth = 0.28; g.beginPath(); g.moveTo(6.6, y1 + 0.42); g.bezierCurveTo(1, y1 - 0.8, -12 - i, -11.2 + i * 0.7, -16.2 + i * 0.3, ye + 0.3); g.stroke();
    }
    g.strokeStyle = 'rgba(14,5,2,0.65)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(8, -12.4); g.bezierCurveTo(0, -13.6, -9, -11.8, -17.4, -6.7); g.stroke();
    overlay(g, -20, -16, 12, -3, { s: 0.28, a: 0.38, mode: 'soft-light', ox: 20, oy: 3 });
    // grime: dust settled on top, pits and scuffs
    mottle(g, -19, -15, 11, -3, { c: [170, 140, 96], a: 0.34, f: 0.7, th: 0.62, soft: 0.16, seed: 31, res: 5, fn: (x, y) => sstep(-8, -13.8, y) });
    speckle(g, R, -17, -14, 9, -4, 90, ['rgba(0,0,0,0.32)', 'rgba(0,0,0,0.24)', 'rgba(230,190,130,0.16)', 'rgba(130,200,90,0.14)'], 0.25, 0.7);
    g.strokeStyle = 'rgba(255,220,170,0.24)'; g.lineWidth = 0.28; for (let i = 0; i < 8; i++) { const x = R.range(-13, 4), y = R.range(-12, -6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + R.range(1, 3), y + R.range(-0.8, 0.8)); g.stroke(); }
    // specular: broad soft sheen + broken hot core
    streak(g, 5.8, -11.6, -3, -14, -12.8, -10.4, 1.7, 'rgba(255,225,180,0.26)');
    streak(g, 5.2, -11.9, 0.5, -13.5, -4.4, -12.8, 0.7, 'rgba(255,246,220,0.9)');
    streak(g, -6.6, -12.4, -9.4, -12.2, -12.4, -10.6, 0.6, 'rgba(255,246,220,0.7)');
    streak(g, 3.4, -9.6, -4, -10.6, -12.6, -8.2, 0.55, 'rgba(190,255,170,0.24)');
    g.fillStyle = 'rgba(255,255,244,0.95)'; g.beginPath(); g.ellipse(-1.2, -13.15, 1.3, 0.3, -0.05, 0, TAU); g.fill();
    g.restore();
    rim(g, shellPath, 0, -13, 0, -8.5, 'rgba(200,255,170,0.7)', 'rgba(200,255,170,0)', 1.0);
    outline(g, shellPath, 0.6);
  });
  // ---- pronotum (shield over the head)
  const pronPts = [[16.6, -6.2], [15.4, -9.7], [11, -12.2], [5.6, -12.6], [2.8, -10], [3.4, -6.4], [8, -4.4], [13.8, -4.5]];
  const pronPath = (g) => blob(g, pronPts);
  P.pron = part(22, 12, 5, 14.5, (g) => {
    g.save(); pronPath(g); g.clip();
    g.fillStyle = lgrad(g, 0, -13.5, 0, -4.5, [[0, col([170, 120, 62], 1.0)], [0.5, col([128, 84, 44], 0.85)], [1, col([80, 50, 26], 0.6)]]); g.fillRect(0, -15, 20, 12);   // thin pale margin
    const inner = scalePts(pronPts, 10.4, -8.6, 0.8, 0.74); g.save(); blob(g, inner);
    g.fillStyle = lgrad(g, 0, -12.6, 0, -5, [[0, col(RC.pron, 2.1)], [0.35, col(RC.pron, 1.05)], [1, col(RC.pron, 0.36)]]); g.fill();
    g.clip(); egrad(g, 8.4, -10.6, 6, 3, 0, [[0, 'rgba(255,185,110,0.5)'], [1, 'rgba(255,170,90,0)']], 0.3, -0.3, 0);
    mottle(g, 2, -14, 16, -4, { c: [8, 3, 2], a: 0.55, f: 0.6, th: 0.5, soft: 0.25, seed: 41, res: 6 });
    g.fillStyle = 'rgba(20,8,3,0.5)'; g.beginPath(); g.ellipse(7.6, -8.2, 1.4, 2.3, 0.4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(12, -7.9, 1.2, 2, -0.3, 0, TAU); g.fill();
    g.restore(); g.save(); blob(g, inner); g.strokeStyle = 'rgba(28,10,4,0.6)'; g.lineWidth = 0.4; g.stroke(); g.restore();
    overlay(g, 0, -15, 20, -3, { s: 0.3, a: 0.32, mode: 'soft-light', ox: 40, oy: 9 });
    speckle(g, R, 3, -13.5, 16, -5, 30, ['rgba(0,0,0,0.3)', 'rgba(235,200,140,0.2)'], 0.25, 0.6);
    streak(g, 5.6, -12.2, 9.5, -13.9, 14.6, -10.8, 0.8, 'rgba(255,236,200,0.22)');
    streak(g, 6.4, -12.3, 9.5, -13.6, 13.2, -11.6, 0.34, 'rgba(255,246,220,0.85)');
    g.restore();
    rim(g, pronPath, 0, -12.6, 0, -7, 'rgba(220,255,180,0.6)', 'rgba(220,255,180,0)', 1.0);
    outline(g, pronPath, 0.6);
  });
  // ---- head (origin = head centre), small wedge tucked under the pronotum, mouthparts pointing down
  P.head = part(12, 10, 5, 5, (g) => {
    const pts = [[-3.3, -1.5], [-1.4, -2.8], [1.6, -2.7], [3.4, -1.2], [3.7, 1], [2.3, 2.6], [-0.4, 3], [-2.9, 1.7]];
    const path = (g) => blob(g, pts);
    g.save(); path(g); g.clip();
    g.fillStyle = lgrad(g, 0, -3, 0, 3.2, [[0, col([128, 72, 38], 1)], [0.5, col([66, 36, 20], 1)], [1, col([22, 11, 6], 1)]]); g.fillRect(-5, -5, 10, 9);
    egrad(g, 0.3, -1.4, 3.2, 1.9, 0, [[0, 'rgba(255,190,110,0.45)'], [1, 'rgba(255,150,80,0)']], 0, -0.3, 0);
    mottle(g, -4, -4, 5, 4, { c: [8, 3, 2], a: 0.4, f: 0.9, th: 0.5, soft: 0.25, seed: 51, res: 8 });
    overlay(g, -5, -5, 6, 5, { s: 0.3, a: 0.3, mode: 'soft-light', ox: 3, oy: 11 });
    // labrum / clypeus (lighter mouth plate)
    g.fillStyle = 'rgba(200,120,56,0.5)'; g.beginPath(); g.ellipse(2.9, 1.6, 0.9, 1.3, 0.3, 0, TAU); g.fill();
    g.restore(); outline(g, path, 0.5);
    streak(g, -1.8, -2.1, 0.4, -3, 2.6, -1.9, 0.35, 'rgba(255,240,210,0.7)');
    g.fillStyle = '#040201'; g.beginPath(); g.ellipse(1.1, -0.6, 0.85, 1.15, 0.25, 0, TAU); g.fill();       // beady eye
    g.fillStyle = 'rgba(110,190,70,0.4)'; g.beginPath(); g.ellipse(1.4, -0.1, 0.4, 0.6, 0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,245,0.95)'; g.beginPath(); g.arc(0.75, -1.1, 0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(20,10,4,0.85)'; g.beginPath(); g.arc(2.7, -1.7, 0.45, 0, TAU); g.fill();               // antenna socket
    g.strokeStyle = 'rgba(30,12,4,0.85)'; g.lineWidth = 0.42; g.beginPath(); g.moveTo(1.4, 2.6); g.quadraticCurveTo(1.6, 3.9, 1, 4.4); g.stroke(); g.beginPath(); g.moveTo(2.6, 2.3); g.quadraticCurveTo(3.4, 3.6, 2.9, 4.3); g.stroke();   // palps
  });
  // ---- mandible (pivot at base, hook points along +x)
  P.mand = part(7, 6, 1.5, 3, (g) => {
    const path = (g) => { g.beginPath(); g.moveTo(-0.3, -0.7); g.quadraticCurveTo(1.6, -1, 3, 0.5); g.quadraticCurveTo(3.3, 1.2, 2.7, 0.9); g.quadraticCurveTo(1.6, 0.4, -0.2, 0.8); g.closePath(); };
    g.save(); path(g); g.clip(); g.fillStyle = lgrad(g, 0, -1, 0, 1, [[0, col([226, 146, 68], 1)], [1, col([110, 56, 22], 1)]]); g.fillRect(-1, -2, 6, 4);
    g.fillStyle = lgrad(g, 1.9, 0, 3.3, 0, [[0, 'rgba(30,12,4,0)'], [1, 'rgba(24,10,4,0.95)']]); g.fillRect(1.9, -2, 2, 4); g.restore(); outline(g, path, 0.32);
  });
  P.legF = roachLeg(6.4, 8.6, 1.3, 11); P.legM = roachLeg(7.2, 9.6, 1.42, 21); P.legH = roachLeg(8.6, 11.2, 1.58, 31);
  return P;
}

// leg table: hip (x, y) on the body, rest foot x, tripod group, near side?, curl offset for the dead pose
const ROACH_LEGS = [
  { k: 'legF', hx: 9.6, hy: -3.5, fx: 19, g: 0, near: true, curl: [4.5, -0.6] },
  { k: 'legM', hx: 1.6, hy: -3.3, fx: 9.5, g: 1, near: true, curl: [2.4, -1] },
  { k: 'legH', hx: -7.4, hy: -3.5, fx: -15.5, g: 0, near: true, curl: [-5, -1.6] },
  { k: 'legF', hx: 10.8, hy: -3.7, fx: 23, g: 1, near: false, curl: [6.5, -1.6] },
  { k: 'legM', hx: 2.8, hy: -3.5, fx: 13.5, g: 0, near: false, curl: [4, -2] },
  { k: 'legH', hx: -6.2, hy: -3.7, fx: -19, g: 1, near: false, curl: [-3, -2.4] },
];

function antenna(ctx, x0, y0, len, a0, curl, t, ph, w0, colr, calm) {
  const n = 14; let x = x0, y = y0, a = a0; const sl = len / n;
  ctx.strokeStyle = colr; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    a += curl / n + (sin(t * 2.6 + ph + k * 3.1) * 0.075 + sin(t * 7.1 + ph * 2 + k * 6) * 0.024) * (0.35 + k * 1.3) * calm;
    const nx = x + cos(a) * sl, ny = y + sin(a) * sl;
    ctx.lineWidth = lerp(w0, 0.38, k); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
    x = nx; y = ny;
  }
}

function drawRoach(ctx, e, G, flashOnly) {
  const P = cached('roach', buildRoach), t = e.t || 0, f = e.face < 0 ? -1 : 1, k = e.scale || 1;
  const dead = !!(e.dead || e.state === 'dead'), st = e.state;
  const ac = atkCurve(e), air = !e.onGround && !dead;
  const spd = abs(e.vx || 0), mv = dead || air ? 0 : sstep(12, 30, spd);
  const def = e.def || {}, stride = def.stride || 0.16, duty = 0.58, A = 6.4;
  const fq = PI * duty / (stride * A);                          // leg cycle rate that keeps the feet planted on the ground
  const ph = (e.phase || 0) * fq, A0 = ctx.globalAlpha;
  ctx.save();
  ctx.translate(e.cx, e.y + e.h + (dead ? deadDrop(e, 14.5) : 0)); ctx.scale(f * k, k);
  beginDraw(ctx, k);

  // ---- body pose
  let bob = 0, pitch = 0, lunge = 0, mandOpen = 0.12, antRaise = 0;
  if (!dead) {
    bob = -abs(sin(ph)) * 0.55 * mv - sin(t * 2.1) * 0.22 * (1 - mv);
    if (air) pitch = clamp(-(e.vy || 0) / 520, -0.55, 0.55);
    if (st === 'windup') { pitch = 0.42 * eio(ac.w); mandOpen = 0.5 + 0.3 * ac.w; antRaise = ac.w; }
    else if (st === 'attack') { pitch = lerp(0.42, -0.16, eio(ac.s)) * (1 - ac.r); lunge = 5 * eo(ac.s) * (1 - ac.r); mandOpen = 0.9 * (1 - ac.r * 0.7); }
    else if (st === 'chase') mandOpen = 0.3 + 0.2 * sin(t * 24);
    else if (st === 'fire') { pitch = 0.2; antRaise = 0.6; mandOpen = 0.6; }
  }
  ctx.translate(lunge, bob);
  if (pitch) { ctx.translate(0, -6); ctx.rotate(-pitch); ctx.translate(0, 6); }

  // ---- leg foot targets (body space)
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const L = ROACH_LEGS[i], S = P[L.k];
    let fx = L.fx, fy = 0;
    if (dead) { fx = L.hx + L.curl[0]; fy = L.hy + L.curl[1] + 3.6; }
    else if (air) { fx = L.fx + (L.k === 'legF' ? 3.5 : L.k === 'legH' ? -4.5 : 0); fy = -3.6 + sin(t * 30 + i) * 0.5; }
    else {
      const g0 = gait(ph / TAU + (L.g ? 0.5 : 0), duty, A, 4.2);
      fx = lerp(L.fx, L.fx + g0[0], mv); fy = g0[1] * mv;
      if (st === 'windup' && L.k === 'legF' && L.near) { fx = lerp(fx, L.hx + 9 + 3 * sin(t * 18), ac.w); fy = lerp(fy, -10 - 2 * ac.w, ac.w); }   // front leg claws the air
      else if (st === 'attack' && L.k === 'legF') { fx = lerp(fx, L.hx + 12, eo(ac.s)); fy = lerp(fy, -4, eo(ac.s)); }
    }
    legs.push([L, S, fx, fy]);
  }
  const drawLeg = (l, far) => {
    const L = l[0], S = l[1], [kx, ky, ex, ey] = ik2(L.hx, L.hy, l[2], l[3], S.l1, S.l2, dead ? 'down' : true);
    seg(ctx, far ? S.femF : S.fem, L.hx, L.hy, kx, ky); seg(ctx, far ? S.tibF : S.tib, kx, ky, ex, ey);
  };
  for (let i = 3; i < 6; i++) drawLeg(legs[i], true);           // far side first
  // far antenna
  const antCalm = dead ? 0.15 : 1, ax = 16.2, ay = -5.4;
  const aBase = dead ? 0.5 : (st === 'chase' ? -0.5 : -0.95) - antRaise * 0.3, curlA = dead ? 1.6 : (st === 'chase' ? 0.7 : 0.9);
  ctx.save(); ctx.globalAlpha = A0 * 0.7;
  antenna(ctx, ax - 0.4, ay + 0.2, 26, aBase + 0.22, curlA, t, 1.7, 0.85, 'rgb(46,26,14)', antCalm);
  ctx.restore();
  // body stack
  blit(ctx, P.belly); ctx.save(); ctx.translate(-16.8, -5.3); blit(ctx, P.cerci); ctx.restore();
  blit(ctx, P.shell); blit(ctx, P.pron);
  // head + mandibles
  ctx.save(); ctx.translate(14.9, -3.6); ctx.rotate(0.62 + (dead ? 0.15 : 0));
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(2.6, 1.7 + s * 0.15); ctx.rotate(s * (0.15 + mandOpen * 0.6)); blit(ctx, P.mand); ctx.restore(); }
  blit(ctx, P.head); ctx.restore();
  for (let i = 0; i < 3; i++) drawLeg(legs[i], false);          // near legs
  antenna(ctx, ax + 0.2, ay - 0.1, 28, aBase, curlA, t, 0, 1.0, 'rgb(64,36,18)', antCalm);
  ctx.restore();
}

CD.art.radroach = drawRoach;

// ================================================================== BLOATFLY
const BF = { abd: [186, 204, 78], thor: [74, 70, 44], eye: [214, 46, 30], face: [166, 158, 70] };

// branching vein network inside the current clip
function veinTree(g, R, x, y, ang, len, w, depth, colr) {
  if (depth < 0 || len < 0.8) return;
  const n = 4; let px = x, py = y, a = ang;
  g.strokeStyle = colr; g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
  for (let i = 0; i < n; i++) { a += R.range(-0.32, 0.32); px += cos(a) * len / n; py += sin(a) * len / n; g.lineTo(px, py); }
  g.stroke();
  const kids = depth > 1 ? 2 : 1;
  for (let i = 0; i < kids; i++) veinTree(g, R, x + (px - x) * R.range(0.45, 0.8), y + (py - y) * R.range(0.45, 0.8), a + (i ? 1 : -1) * R.range(0.5, 0.95), len * R.range(0.5, 0.7), w * 0.72, depth - 1, colr);
}

function buildFly() {
  const P = {}, R = U.RNG(777);
  // ---- abdomen: origin = waist joint; translucent, swollen, veined sac hanging down-back
  const abdPts = [[0.7, -1], [-3.4, -2], [-7.6, -0.2], [-10, 4.2], [-9.4, 9.2], [-5.4, 12], [-0.8, 11.2], [1.9, 7.2], [2.3, 2.4]];
  const abdPath = (g) => blob(g, abdPts);
  P.abd = part(20, 20, 13.5, 4, (g) => {
    g.save(); abdPath(g); g.clip();
    // jelly body: bright sun-lit yellow-green core, deeper olive toward the shadow side
    egrad(g, -4, 5.6, 7.4, 7.4, 0.2, [[0, 'rgb(246,250,150)'], [0.4, 'rgb(206,232,92)'], [0.75, 'rgb(146,188,52)'], [1, 'rgb(92,132,34)']], -0.3, -0.4, 0.04);
    // subsurface glow: light passes through the lower/right side
    rim(g, abdPath, 3, 12, -8, -1, 'rgba(240,255,140,0.9)', 'rgba(240,255,140,0)', 3.6);
    // internal organs seen through the skin: dark gut coil, reddish gland, bubbles
    g.lineCap = 'round'; g.strokeStyle = 'rgba(58,92,24,0.5)'; g.lineWidth = 2.3; g.beginPath(); g.moveTo(-1.6, 1); g.bezierCurveTo(-7, 0.4, -3, 5.6, -7.4, 6.4); g.bezierCurveTo(-9, 6.8, -6, 9.4, -4.4, 8.6); g.stroke();
    g.strokeStyle = 'rgba(170,190,70,0.5)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-1.6, 0.4); g.bezierCurveTo(-7, -0.2, -3, 5, -7.4, 5.8); g.stroke();
    g.fillStyle = 'rgba(170,84,36,0.3)'; g.beginPath(); g.ellipse(-2.6, 7.6, 2.2, 1.5, 0.6, 0, TAU); g.fill();
    for (let i = 0; i < 5; i++) { const bx = R.range(-8, 0), by = R.range(2, 10); g.fillStyle = 'rgba(240,250,170,0.4)'; g.beginPath(); g.arc(bx, by, R.range(0.35, 0.8), 0, TAU); g.fill(); }
    // segmentation bands with fine bristles
    for (let i = 0; i < 3; i++) {
      const y0 = 1.6 + i * 3.4; g.strokeStyle = 'rgba(44,80,16,0.36)'; g.lineWidth = 0.55; g.beginPath(); g.moveTo(-11, y0 + 2.4); g.quadraticCurveTo(-4, y0 - 1.4, 3, y0 + 2.2); g.stroke();
      g.strokeStyle = 'rgba(240,250,160,0.22)'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(-11, y0 + 3); g.quadraticCurveTo(-4, y0 - 0.8, 3, y0 + 2.8); g.stroke();
    }
    // veins
    for (let i = 0; i < 5; i++) veinTree(g, R, -1 + R.range(-1, 1), 0.5 + R.range(0, 1.5), R.range(1.8, 3.4), R.range(7, 10), 0.5, 2, 'rgba(112,48,28,0.55)');
    mottle(g, -12, -3, 4, 13, { c: [40, 84, 14], a: 0.3, f: 0.4, th: 0.5, soft: 0.25, seed: 5, res: 5 });
    mottle(g, -12, -3, 4, 13, { c: [255, 255, 190], a: 0.3, f: 0.6, th: 0.62, soft: 0.16, seed: 15, res: 5 });
    // pustules: swollen boils
    for (const [px, py, pr] of [[-7.4, 4.2, 1.35], [-3.6, 9.4, 1.5], [-7.8, 8.2, 1.05], [-1.2, 5.4, 0.9]]) {
      g.fillStyle = 'rgba(96,110,34,0.55)'; g.beginPath(); g.arc(px, py + 0.2, pr + 0.35, 0, TAU); g.fill();
      egrad(g, px, py, pr, pr, 0, [[0, 'rgb(250,248,180)'], [0.6, 'rgb(214,222,100)'], [1, 'rgb(150,160,54)']], -0.3, -0.3, 0, true);
      g.fillStyle = 'rgba(255,255,240,0.85)'; g.beginPath(); g.arc(px - pr * 0.35, py - pr * 0.4, pr * 0.24, 0, TAU); g.fill();
    }
    speckle(g, R, -11, -2, 3, 12.5, 40, ['rgba(24,44,6,0.4)', 'rgba(255,255,200,0.22)'], 0.25, 0.6);
    // wet specular
    egrad(g, -6.2, 1.8, 3.6, 2.3, 0.25, [[0, 'rgba(255,255,236,0.7)'], [1, 'rgba(255,255,236,0)']], 0, 0, 0);
    streak(g, -8.2, 1.2, -6.4, -0.6, -3.6, -0.4, 0.6, 'rgba(255,255,248,0.9)');
    g.fillStyle = 'rgba(255,255,244,0.5)'; g.beginPath(); g.ellipse(-2.4, 9.6, 0.9, 0.42, -0.6, 0, TAU); g.fill();
    g.restore();
    outline(g, abdPath, 0.6);
    rim(g, abdPath, 0, -2, 0, 3, 'rgba(240,250,160,0.7)', 'rgba(240,250,160,0)', 1.0);
  });
  // ---- thorax: hairy dark hump (origin = thorax centre)
  const thPts = [[-4.7, -0.5], [-3.8, -4], [0, -5.1], [3.9, -3.5], [4.9, 0.4], [3.2, 3.7], [-0.6, 4.7], [-4.1, 3.1]];
  const thPath = (g) => blob(g, thPts);
  P.thorax = part(18, 18, 9, 9, (g) => {
    // bristles behind the body outline
    const edge = sampleBlob(thPts, 7);
    for (let i = 0; i < edge.length; i++) {
      const p = edge[i], q = edge[(i + 1) % edge.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = dy / l, ny = -dx / l;
      const a = atan2(ny, nx) + R.range(-0.5, 0.5) - (nx < 0 ? 0.35 : 0), ln = R.range(0.5, 1.5);
      g.strokeStyle = R.chance(0.78) ? 'rgba(24,22,10,0.85)' : 'rgba(150,146,92,0.6)'; g.lineWidth = 0.26; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + cos(a) * ln, p[1] + sin(a) * ln); g.stroke();
    }
    g.save(); thPath(g); g.clip();
    g.fillStyle = lgrad(g, 0, -5, 0, 5, [[0, col(BF.thor, 1.9)], [0.35, col(BF.thor, 1.15)], [1, col(BF.thor, 0.4)]]); g.fillRect(-6, -6, 12, 12);
    egrad(g, -0.6, -2.4, 4.2, 2.6, 0, [[0, 'rgba(210,214,150,0.5)'], [1, 'rgba(210,214,150,0)']], 0, 0, 0);
    // longitudinal dark stripes typical of flies
    g.strokeStyle = 'rgba(16,16,8,0.6)'; g.lineWidth = 0.7; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-3.6 + i * 0.6, -4.2 + Math.abs(i) * 0.4); g.quadraticCurveTo(0, -5.2 + i * 1.6, 3.4, -3.2 - i * 0.6); g.stroke(); }
    mottle(g, -6, -6, 6, 6, { c: [10, 10, 4], a: 0.4, f: 0.9, th: 0.5, soft: 0.25, seed: 61, res: 8 });
    // fur: many short hairs across the surface
    for (let i = 0; i < 110; i++) {
      const x = R.range(-5, 5), y = R.range(-5, 5), a = -0.5 + R.range(-0.5, 0.5) + (y > 0 ? 0.9 : 0);
      g.strokeStyle = R.chance(0.55) ? 'rgba(20,20,8,0.55)' : 'rgba(190,186,120,0.42)'; g.lineWidth = 0.26; g.beginPath(); g.moveTo(x, y); g.lineTo(x + cos(a) * 1.5, y + sin(a) * 1.5); g.stroke();
    }
    g.restore();
    outline(g, thPath, 0.5);
    rim(g, thPath, 0, -5, 0, 0, 'rgba(200,236,150,0.6)', 'rgba(200,236,150,0)', 1.0);
    streak(g, -2.6, -3.9, 0, -4.9, 2.6, -3.5, 0.45, 'rgba(255,255,230,0.55)');
  });
  // ---- head: origin = head centre. Big faceted red eye, ochre face, proboscis
  P.head = part(16, 16, 7, 8, (g) => {
    const fpts = [[-3.6, -2.6], [-1, -4.4], [2.6, -3.8], [4.4, -0.8], [4.2, 2.4], [1.8, 4.4], [-1.6, 4.4], [-3.8, 1.6]];
    const fpath = (g) => blob(g, fpts);
    g.save(); fpath(g); g.clip();
    g.fillStyle = lgrad(g, 0, -4, 0, 4.6, [[0, col(BF.face, 1.35)], [1, col(BF.face, 0.45)]]); g.fillRect(-5, -5, 10, 10);
    mottle(g, -5, -5, 6, 6, { c: [12, 10, 4], a: 0.4, f: 0.9, th: 0.5, soft: 0.25, seed: 71, res: 8 });
    g.restore(); outline(g, fpath, 0.5);
    // far eye peeking behind
    g.fillStyle = 'rgb(112,20,16)'; g.beginPath(); g.ellipse(-0.6, -2.6, 2.4, 2.9, 0.3, 0, TAU); g.fill();
    // near compound eye
    const epath = (g) => { g.beginPath(); g.ellipse(1.3, -0.4, 3.5, 4.2, 0.25, 0, TAU); };
    g.save(); epath(g); g.clip();
    egrad(g, 1.3, -0.4, 3.6, 4.3, 0.25, [[0, 'rgb(255,140,96)'], [0.35, 'rgb(226,54,34)'], [0.75, 'rgb(150,16,18)'], [1, 'rgb(60,6,10)']], -0.3, -0.4, 0);
    // fine facet lattice (dark pits + tiny glints) and a deep pseudopupil
    g.fillStyle = 'rgba(40,0,6,0.24)'; for (let iy = -5; iy <= 5; iy += 0.5) for (let ix = -5; ix <= 5; ix += 0.5) { g.beginPath(); g.arc(ix + ((iy / 0.5) & 1 ? 0.25 : 0), iy, 0.15, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,200,170,0.2)'; for (let iy = -5; iy <= 5; iy += 0.5) for (let ix = -5; ix <= 5; ix += 0.5) { g.beginPath(); g.arc(ix + ((iy / 0.5) & 1 ? 0.25 : 0) - 0.1, iy - 0.1, 0.08, 0, TAU); g.fill(); }
    egrad(g, 2.2, 0.6, 1.3, 1.6, 0, [[0, 'rgba(24,0,4,0.55)'], [1, 'rgba(24,0,4,0)']], 0, 0, 0);
    g.fillStyle = lgrad(g, 0, -4, 0, 4, [[0, 'rgba(120,20,60,0.0)'], [1, 'rgba(70,0,40,0.35)']]); g.fillRect(-3, -5, 8, 10);
    g.restore(); outline(g, epath, 0.5);
    g.fillStyle = 'rgba(255,255,250,0.85)'; g.beginPath(); g.ellipse(0.3, -2, 1.05, 0.62, -0.7, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,220,200,0.55)'; g.beginPath(); g.arc(2.6, 1.5, 0.4, 0, TAU); g.fill();
    // proboscis + palps
    g.strokeStyle = 'rgba(20,14,6,0.95)'; g.lineWidth = 1.05; g.beginPath(); g.moveTo(3.4, 2.6); g.quadraticCurveTo(4.8, 3.6, 4.6, 5.6); g.stroke();
    g.strokeStyle = 'rgb(214,126,52)'; g.lineWidth = 0.55; g.beginPath(); g.moveTo(3.4, 2.6); g.quadraticCurveTo(4.8, 3.6, 4.6, 5.4); g.stroke();
    g.fillStyle = 'rgb(232,150,70)'; g.beginPath(); g.ellipse(4.55, 5.8, 0.85, 0.55, 0, 0, TAU); g.fill();
    // short antenna
    g.strokeStyle = 'rgba(20,14,6,0.9)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(3.6, -3.4); g.quadraticCurveTo(5.4, -4.6, 6.4, -3.6); g.stroke(); g.fillStyle = 'rgba(30,20,10,0.95)'; g.beginPath(); g.ellipse(6.4, -3.4, 0.8, 0.55, 0.4, 0, TAU); g.fill();
  });
  // ---- wing: origin = root, extends along +x, translucent with veins (drawn with alpha per pass)
  P.wing = part(20, 10, 2, 5, (g) => {
    const wp = (g) => { g.beginPath(); g.moveTo(-0.4, 0.2); g.bezierCurveTo(3, -2.6, 10, -3.4, 16.4, -1.3); g.bezierCurveTo(18, -0.2, 17, 1.6, 13.6, 2.6); g.bezierCurveTo(8, 3.8, 2, 2.8, -0.4, 0.2); g.closePath(); };
    g.save(); wp(g); g.clip();
    g.fillStyle = lgrad(g, 0, -3, 0, 3.4, [[0, 'rgba(226,236,214,0.62)'], [0.5, 'rgba(206,222,200,0.42)'], [1, 'rgba(176,200,170,0.5)']]); g.fillRect(-2, -5, 22, 10);
    g.fillStyle = lgrad(g, 0, 0, 18, 0, [[0, 'rgba(255,230,120,0.16)'], [0.5, 'rgba(120,230,200,0.12)'], [1, 'rgba(160,190,255,0.18)']]); g.fillRect(-2, -5, 22, 10);   // iridescent sheen
    g.strokeStyle = 'rgba(58,48,26,0.7)'; g.lineCap = 'round';
    g.lineWidth = 0.6; g.beginPath(); g.moveTo(0, -0.1); g.bezierCurveTo(3.6, -2.5, 10, -3.3, 16, -1.2); g.stroke();      // costa
    g.lineWidth = 0.34;
    for (const v of [[16.6, -0.2, -0.6], [15.6, 1.2, -0.2], [12.4, 2.5, 0.4], [8.6, 3, 0.9]]) { g.beginPath(); g.moveTo(0.4, 0.2); g.bezierCurveTo(3, v[2], 9, v[1] + v[2] * 0.4, v[0], v[1]); g.stroke(); }
    g.lineWidth = 0.26; g.beginPath(); g.moveTo(8, -2.9); g.lineTo(8.6, 1.4); g.stroke(); g.beginPath(); g.moveTo(12, -2.2); g.lineTo(12.2, 0.9); g.stroke();
    g.fillStyle = 'rgba(70,44,20,0.7)'; g.fillRect(12.2, -2.5, 1.7, 0.9);         // stigma
    g.restore();
    g.strokeStyle = 'rgba(30,26,14,0.55)'; g.lineWidth = 0.4; wp(g); g.stroke();
    g.fillStyle = 'rgba(40,34,20,0.9)'; g.beginPath(); g.ellipse(0, 0.1, 0.9, 0.7, 0, 0, TAU); g.fill();
  });
  P.abdD = darkened(P.abd, 0.5, '104,98,52'); P.headD = darkened(P.head, 0.5, '56,34,28'); P.thoraxD = darkened(P.thorax, 0.8);
  return P;
}

function drawFly(ctx, e, G, flashOnly) {
  const P = cached('fly', buildFly), t = e.t || 0, f = e.face < 0 ? -1 : 1, k = e.scale || 1;
  const dead = !!(e.dead || e.state === 'dead'), st = e.state, A0 = ctx.globalAlpha, def = e.def || {};
  ctx.save();
  ctx.translate(e.cx, e.cy); ctx.scale(f * k, k);
  beginDraw(ctx, k);
  // ---- pulse: the abdomen swells when it spits (e.cool jumps to ~cd..cd+0.8 as it fires, then counts down) or while state === 'fire'
  let pulse = 0;
  if (!dead) {
    const cd = def.cd || 2, cool = e.cool;
    if (st === 'fire') pulse = 0.7 + 0.3 * sin(t * 30);
    if (cool !== undefined) {
      pulse = max(pulse, sstep(cd - 0.4, cd + 0.8, cool));                          // stateless: decays smoothly as the cooldown runs out
      if (e._bfPrev !== undefined && cool > e._bfPrev + 0.4) e._bfFire = t;         // exact firing moment when the entity persists between frames
      e._bfPrev = cool;
    }
    if (e._bfFire !== undefined) { const d = t - e._bfFire; if (d >= 0 && d < 0.6) pulse = max(pulse, 1 - d / 0.6); }
  }
  const breathe = 1 + sin(t * 3.1) * 0.025 + pulse * 0.13;
  const vxs = (e.vx || 0) * f, tilt = dead ? 0 : clamp(vxs * 0.0009, -0.2, 0.2) + sin(t * 1.7) * 0.03;
  const bobY = dead ? 0 : sin(t * 4.3) * 0.9 + sin(t * 9.1) * 0.25;
  ctx.translate(0, bobY); ctx.rotate(tilt);

  // ---- wings (far first, behind the body) -------------------------------------------------
  const wingAt = (ang, alpha, sx) => { ctx.save(); ctx.globalAlpha = A0 * alpha; ctx.translate(1.4 + sx, -5.4); ctx.rotate(ang); blit(ctx, P.wing); ctx.restore(); };
  const flapW = dead ? 0 : 1;
  let a1, a2;
  if (dead) { a1 = -2.9; a2 = -2.5; }
  else {
    const w = t * 74; a1 = -1.85 + sin(w) * 0.62; a2 = -1.85 + sin(w + 0.7) * 0.62;
  }
  if (!dead) {
    for (let i = 0; i < 4; i++) wingAt(-1.85 + (i - 1.5) * 0.46, 0.13, -1.3);                                  // far blur fan
    wingAt(a2 - 0.09, 0.22, -1.3); wingAt(a2, 0.34, -1.3);
  } else wingAt(a2, 0.3, -1.3);
  // ---- legs dangling (far) ---------------------------------------------------------------
  const LEGS = [[0.6, 2.6, 1.25, 4.4, 5, 0.5, 1], [3.6, 2.9, 1.7, 4.2, 4.8, 2.2, 1], [1.6, 3.0, 2.05, 4.6, 5.4, 1.3, 0], [4.6, 3.2, 1.4, 4.2, 5, 3.1, 0], [6.4, 2.4, 0.95, 3.9, 4.3, 4.2, 0]];
  const flyLegs = (far) => {
    const pts = [];
    for (const L of LEGS) {
      if (!!L[6] !== far) continue;
      const bx = L[0], by = L[1], ph = L[5], sw = dead ? 0 : sin(t * 3.1 + ph) * 0.2 + sin(t * 7.3 + ph * 2) * 0.05;
      let a = L[2] + sw, b = a + 0.75 + (dead ? 1.4 : sin(t * 2.3 + ph) * 0.12);
      if (dead) { a = L[2] * 0.4 - 0.9; b = a + 2.3; }
      const kx = bx + cos(a) * L[3], ky = by + sin(a) * L[3], fx = kx + cos(b) * L[4], fy = ky + sin(b) * L[4];
      const c = b + (dead ? 0.6 : 0.5);
      pts.push([bx, by, kx, ky, fx, fy, fx + cos(c) * 1.3, fy + sin(c) * 1.3]);
    }
    const pass = (i0, i1, w, colr) => { ctx.beginPath(); for (const p of pts) { ctx.moveTo(p[i0[0]], p[i0[1]]); ctx.lineTo(p[i1[0]], p[i1[1]]); } ctx.lineWidth = w; ctx.strokeStyle = colr; ctx.stroke(); };
    const oc = 'rgba(10,8,6,0.7)', lc = far ? 'rgb(44,44,26)' : 'rgb(84,78,44)';
    pass([0, 1], [2, 3], 1.0, oc); pass([2, 3], [4, 5], 0.8, oc); pass([4, 5], [6, 7], 0.6, oc);
    pass([0, 1], [2, 3], 0.66, lc); pass([2, 3], [4, 5], 0.46, lc); pass([4, 5], [6, 7], 0.3, lc);
    ctx.fillStyle = far ? 'rgb(30,30,18)' : 'rgb(120,112,64)'; ctx.beginPath(); for (const p of pts) { ctx.moveTo(p[2] + 0.42, p[3]); ctx.arc(p[2], p[3], 0.42, 0, TAU); } ctx.fill();
    if (!far) { ctx.strokeStyle = 'rgba(210,205,140,0.55)'; ctx.lineWidth = 0.22; ctx.beginPath(); for (const p of pts) { ctx.moveTo(p[0] - 0.1, p[1]); ctx.lineTo(p[2] - 0.15, p[3]); } ctx.stroke(); }
  };
  flyLegs(true);
  // ---- abdomen + stinger --------------------------------------------------------------------
  const wx = -2.3, wy = -0.4, lag = dead ? 0 : sin(t * 2.6 - 0.8) * 0.06 - clamp((e.vx || 0) * f * 0.0006, -0.12, 0.12) - (e.vy || 0) * 0.0002;
  ctx.save(); ctx.translate(wx, wy); ctx.rotate(lag);
  ctx.save(); ctx.translate(-4.2, 6.4); ctx.scale(breathe, breathe * (dead ? 0.9 : 1)); ctx.translate(4.2, -6.4);
  blit(ctx, dead ? P.abdD : P.abd);
  ctx.restore();
  // stinger dangling from the tip of the sac
  {
    const sx = -4.4, sy = 11.6 + (breathe - 1) * 5, sw = dead ? 0.5 : sin(t * 3.4) * 0.14, sa = PI / 2 + 0.42 + sw, len = 6.6;
    const x1 = sx + cos(sa) * len, y1 = sy + sin(sa) * len, cx1 = sx + cos(sa - 0.28) * len * 0.55, cy1 = sy + sin(sa - 0.28) * len * 0.55, nx = -sin(sa), ny = cos(sa);
    ctx.beginPath(); ctx.moveTo(sx + nx * 1.1, sy + ny * 1.1); ctx.quadraticCurveTo(cx1 + nx * 0.6, cy1 + ny * 0.6, x1, y1); ctx.quadraticCurveTo(cx1 - nx * 0.5, cy1 - ny * 0.5, sx - nx * 1.1, sy - ny * 1.1); ctx.closePath();
    ctx.fillStyle = ctx.createLinearGradient(sx, sy, x1, y1); ctx.fillStyle.addColorStop(0, 'rgb(96,58,22)'); ctx.fillStyle.addColorStop(0.6, 'rgb(170,104,40)'); ctx.fillStyle.addColorStop(1, 'rgb(236,196,120)');
    ctx.fill(); ctx.strokeStyle = 'rgba(10,8,6,0.75)'; ctx.lineWidth = 0.45; ctx.stroke();
    ctx.fillStyle = 'rgba(96,58,22,0.9)'; ctx.beginPath(); ctx.ellipse(sx, sy - 0.2, 1.5, 1.0, 0.2, 0, TAU); ctx.fill();
    if (!dead) {                                                     // venom bead at the tip
      const r = 0.6 + pulse * 0.7 + sin(t * 5) * 0.08; ctx.fillStyle = 'rgb(190,255,110)'; ctx.beginPath(); ctx.ellipse(x1 + nx * 0.05, y1 + r * 0.55, r * 0.8, r * 1.15, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,230,0.9)'; ctx.beginPath(); ctx.arc(x1 - r * 0.25, y1 + r * 0.2, r * 0.25, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
  // ---- thorax, head, near legs, near wing -------------------------------------------------
  ctx.save(); ctx.translate(2.8, -2.8); blit(ctx, dead ? P.thoraxD : P.thorax); ctx.restore();
  ctx.save(); ctx.translate(9.4, -2.4); ctx.rotate(dead ? 0.35 : 0.08 + sin(t * 2.2) * 0.03); blit(ctx, dead ? P.headD : P.head); ctx.restore();
  flyLegs(false);
  if (!dead) { wingAt(a1 - 0.1, 0.26, 0); wingAt(a1, 0.42, 0); for (let i = 0; i < 3; i++) wingAt(-1.85 + (i - 1) * 0.5, 0.1, 0); }
  else wingAt(a1, 0.34, 0);
  // fire glow on the abdomen (additive; skipped for the white flash pass)
  if (pulse > 0.02 && !flashOnly && !dead) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = A0 * pulse * 0.55;
    const gr = ctx.createRadialGradient(-6.6, 5.6, 0, -6.6, 5.6, 10); gr.addColorStop(0, 'rgba(230,255,120,0.9)'); gr.addColorStop(1, 'rgba(160,220,60,0)');
    ctx.fillStyle = gr; ctx.fillRect(-18, -6, 24, 24); ctx.restore();
  }
  ctx.restore();
}

CD.art.bloatfly = drawFly;

// ================================================================== MOLE RAT
const MR = { fur: [118, 84, 55], furD: [74, 51, 35], furL: [176, 136, 94], belly: [186, 150, 112], skin: [206, 146, 132], skinD: [146, 90, 80], claw: [214, 198, 156], tooth: [240, 180, 62] };
const moleFlow = (x, y) => PI - 0.3 - 0.18 * clamp((y + 12) / 8, -1, 1);
const moleLimbFlow = () => -0.12;

// bald, scabby mange patch (skin showing through the fur)
function mange(g, R, cx, cy, rx, ry, rot) {
  const pts = [], n = 9;
  for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = R.range(0.72, 1.16), x = cos(a) * rx * rr, y = sin(a) * ry * rr; pts.push([cx + x * cos(rot) - y * sin(rot), cy + x * sin(rot) + y * cos(rot)]); }
  g.save(); blob(g, pts); g.clip();
  egrad(g, cx, cy, rx * 1.3, ry * 1.3, rot, [[0, 'rgb(190,140,124)'], [0.6, 'rgb(160,110,96)'], [1, 'rgb(104,68,58)']], -0.2, -0.3, 0);
  g.strokeStyle = 'rgba(96,44,40,0.4)'; g.lineWidth = 0.3; for (let i = 0; i < 6; i++) { const x = cx + R.range(-rx, rx) * 0.8, y = cy + R.range(-ry, ry) * 0.8; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + R.range(-1, 1), y + R.range(-1, 1), x + R.range(-1.6, 1.6), y + R.range(-0.8, 0.8)); g.stroke(); }
  for (let i = 0; i < 4; i++) { const x = cx + R.range(-rx, rx) * 0.7, y = cy + R.range(-ry, ry) * 0.7; g.fillStyle = 'rgba(94,40,34,0.7)'; g.beginPath(); g.ellipse(x, y, R.range(0.35, 0.75), R.range(0.3, 0.55), R.range(0, 3), 0, TAU); g.fill(); g.fillStyle = 'rgba(255,190,170,0.35)'; g.fillRect(x - 0.3, y - 0.5, 0.4, 0.25); }
  g.restore();
  g.save(); blob(g, pts); g.strokeStyle = 'rgba(60,28,24,0.4)'; g.lineWidth = 0.3; g.stroke(); g.restore();
  for (let i = 0; i < 22; i++) { const a = R.range(0, TAU), x = cx + cos(a) * rx * 1.05, y = cy + sin(a) * ry * 1.05, aa = a + R.range(-0.4, 0.4) + (cos(a) > 0 ? 0.5 : -0.2); g.strokeStyle = col(MR.furD, R.range(0.7, 1.3), 0.7); g.lineWidth = 0.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + cos(aa) * 1.5, y + sin(aa) * 1.5); g.stroke(); }
}


// curved chisel incisor: root at (0,0), sweeping down (+y) and forward (+x). s scale, a rotation, c brightness
function incisor(g, x, y, s, a, c) {
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  const tp = (g) => { g.beginPath(); g.moveTo(-1, -0.2); g.bezierCurveTo(-1.1, 2.4, -0.3, 4.6, 0.9, 5.7); g.lineTo(2.1, 5.3); g.bezierCurveTo(2.5, 3.6, 2.2, 1.4, 1.2, -0.2); g.closePath(); };
  g.fillStyle = lgrad(g, -1, 0, 2.3, 0, [[0, col(MR.tooth, c * 0.7)], [0.5, col(MR.tooth, c * 1.04)], [1, col([252, 218, 120], c)]]); tp(g); g.fill();
  g.save(); tp(g); g.clip();
  g.fillStyle = lgrad(g, 0, -0.2, 0, 5.7, [[0, 'rgba(70,30,8,0.55)'], [0.3, 'rgba(70,30,8,0)'], [0.8, 'rgba(255,244,200,0.0)'], [1, 'rgba(255,244,200,0.45)']]); g.fillRect(-2, -1, 5, 8);
  g.fillStyle = 'rgba(255,252,226,0.75)'; g.beginPath(); g.moveTo(1.5, 0.4); g.quadraticCurveTo(1.9, 2.6, 1.7, 4.8); g.lineTo(1.3, 4.6); g.quadraticCurveTo(1.5, 2.6, 1.2, 0.6); g.fill();
  g.strokeStyle = 'rgba(120,70,20,0.35)'; g.lineWidth = 0.22; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-0.6 + i * 0.4, 0.4); g.quadraticCurveTo(-0.2 + i * 0.5, 3, 0.4 + i * 0.6, 5.2); g.stroke(); }   // enamel grain
  g.restore();
  tp(g); g.strokeStyle = 'rgba(40,20,6,0.75)'; g.lineWidth = 0.28; g.stroke();
  g.restore();
}

function buildMole() {
  const P = {}, R = U.RNG(4242);
  const palBody = (x, y, r) => { const q = r.next(); if (y > -8.6 && q < 0.72) return MR.belly; return q < 0.42 ? MR.fur : q < 0.68 ? MR.furD : MR.furL; };
  // ---- torso (body coordinates, origin at ground centre)
  const torsoPts = [[8.8, -13.2], [6.4, -16.6], [2, -19.6], [-3.6, -19.2], [-9, -17.4], [-14, -14.6], [-18.2, -10.6], [-18.8, -7.4], [-15.8, -4.6], [-9, -4.2], [-2, -4.6], [4, -5.2], [8.2, -8]];
  P.torso = part(34, 24, 22, 23, (g) => {
    fur(g, torsoPts, {
      base: MR.fur, stops: [[0, 1.32], [0.3, 1.0], [0.68, 0.66], [1, 0.44]], b: [-20, -20, 10, -4], pal: palBody, n: 1500, len: [1.3, 2.8], lw: [0.32, 0.62], flow: moleFlow, seed: 11,
      round: { cx: -5, cy: -12, rx: 14, ry: 8.4, k: 0.5 }, tuft: [1.3, 2.6], tuftStep: 1,
      under: (g) => { mottle(g, -20, -20, 10, -3, { c: [30, 18, 10], a: 0.42, f: 0.35, th: 0.5, soft: 0.25, seed: 7, res: 4 }); mottle(g, -20, -20, 10, -3, { c: [214, 170, 118], a: 0.3, f: 0.5, th: 0.6, soft: 0.2, seed: 17, res: 4 }); },
      over: (g, R2) => {
        egrad(g, -3, -16, 12, 4.4, -0.08, [[0, 'rgba(255,214,160,0.3)'], [1, 'rgba(255,200,140,0)']], 0.1, -0.2, 0);          // soft sheen on the back
        g.fillStyle = lgrad(g, 0, -9, 0, -4, [[0, 'rgba(10,6,4,0)'], [1, 'rgba(10,6,4,0.4)']]); g.fillRect(-20, -9, 30, 6);            // belly shadow
        mange(g, R2, -12.6, -12.2, 3.9, 2.9, 0.4); mange(g, R2, -3.4, -17.4, 2.5, 1.3, -0.1); mange(g, R2, -15.6, -7.6, 2.2, 1.6, 0.3);
        // hump of digging muscle on the shoulders
        streak(g, 8, -14.6, 4, -18.6, -1.6, -18.4, 0.8, 'rgba(255,224,170,0.24)');
      },
    });
  });
  // ---- hind thigh (haunch mass)
  const thPts = [[-6, -13.2], [-1.4, -9.8], [-2.4, -4.8], [-8, -3.2], [-14, -5.4], [-17.4, -10.2], [-14.4, -14.6], [-9, -15.4]];
  P.thigh = part(22, 20, 19, 18, (g) => {
    fur(g, thPts, {
      base: MR.fur, stops: [[0, 1.25], [0.5, 0.9], [1, 0.5]], b: [-18, -16, -1, -3], pal: palBody, n: 700, len: [1.3, 2.6], lw: [0.32, 0.6], flow: (x, y) => PI * 0.5 + 0.5, seed: 19,
      round: { cx: -9, cy: -9.5, rx: 8.5, ry: 6.5, k: 0.5 }, tuft: [1.2, 2.2], tuftStep: 1,
      outlineCol: 'rgba(16,10,6,0.28)', under: (g) => { mottle(g, -18, -16, 0, -3, { c: [30, 18, 10], a: 0.4, f: 0.5, th: 0.5, soft: 0.25, seed: 27, res: 4 }); },
      over: (g) => { egrad(g, -8, -12.6, 6, 3.4, 0, [[0, 'rgba(255,214,160,0.26)'], [1, 'rgba(255,200,140,0)']], 0, 0, 0); },
    });
  });
  // ---- head (body coordinates) with upper incisors, nose, eye, ear, whiskers
  const headPts = [[5, -15.2], [8, -17.8], [12.6, -16.6], [16.6, -13.6], [19.4, -10.8], [20, -8.6], [18, -7.2], [13.2, -7], [8.6, -7.8], [5.2, -10.8]];
  P.head = part(28, 22, 2, 21, (g) => {
    // far incisor first (behind the lip)
    const tooth = incisor;
    tooth(g, 17.4, -8.6, 1.02, 0.0, 0.8);
    fur(g, headPts, {
      base: MR.fur, stops: [[0, 1.3], [0.5, 0.95], [1, 0.62]], b: [4, -19, 21, -6], pal: (x, y, r) => { const q = r.next(); if (x > 14 && q < 0.6) return MR.furL; return q < 0.45 ? MR.fur : q < 0.72 ? MR.furD : MR.furL; },
      n: 520, len: [0.9, 1.9], lw: [0.28, 0.5], flow: (x, y) => PI - 0.12, seed: 31, round: { cx: 12, cy: -12, rx: 9, ry: 6, k: 0.4 }, tuft: [0.9, 1.7], tuftStep: 1, outline: 0.5,
      under: (g) => { mottle(g, 4, -19, 21, -6, { c: [30, 18, 10], a: 0.4, f: 0.7, th: 0.5, soft: 0.25, seed: 37, res: 6 }); },
      over: (g) => {
        // bare skin around nose and lips
        egrad(g, 19.2, -9.4, 4.6, 3.6, -0.3, [[0, 'rgba(226,150,140,0.95)'], [0.55, 'rgba(216,140,130,0.7)'], [1, 'rgba(216,140,130,0)']], 0, 0, 0);
        egrad(g, 10, -12, 5.5, 3.5, 0, [[0, 'rgba(255,220,170,0.2)'], [1, 'rgba(255,220,170,0)']], 0, -0.3, 0);
      },
    });
    // nose pad
    g.save(); g.translate(19.5, -9.9); g.rotate(-0.25);
    egrad(g, 0, 0, 1.7, 1.9, 0, [[0, 'rgb(246,186,176)'], [0.6, 'rgb(220,140,130)'], [1, 'rgb(150,84,78)']], -0.3, -0.35, 0, true);
    g.fillStyle = 'rgba(70,24,24,0.9)'; g.beginPath(); g.ellipse(0.7, -0.5, 0.42, 0.62, 0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,240,230,0.85)'; g.beginPath(); g.ellipse(-0.5, -1, 0.5, 0.28, -0.4, 0, TAU); g.fill();
    g.restore();
    // old scar across the snout
    g.strokeStyle = 'rgba(190,116,104,0.75)'; g.lineWidth = 0.55; g.beginPath(); g.moveTo(14.6, -14.6); g.quadraticCurveTo(16.4, -12.4, 17.4, -10.2); g.stroke(); g.strokeStyle = 'rgba(70,28,24,0.6)'; g.lineWidth = 0.22; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(14.9 + i * 0.7, -14.2 + i * 1.2); g.lineTo(15.5 + i * 0.7, -13.4 + i * 1.3); g.stroke(); }
    // lip line + whisker pad
    g.strokeStyle = 'rgba(40,20,14,0.6)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(18.8, -8.1); g.quadraticCurveTo(15.4, -7.2, 12.4, -7.9); g.stroke();
    // ear
    g.save(); g.translate(7.4, -14.6); g.rotate(-0.4); egrad(g, 0, 0, 1.55, 2.1, 0, [[0, 'rgb(196,126,112)'], [0.65, 'rgb(150,90,80)'], [1, 'rgb(80,50,40)']], 0, 0.2, 0, true); g.strokeStyle = 'rgba(30,14,10,0.7)'; g.lineWidth = 0.35; g.beginPath(); g.ellipse(0, 0, 1.55, 2.1, 0, 0, TAU); g.stroke(); g.restore();
    // tiny eye
    g.fillStyle = 'rgba(150,84,74,0.7)'; g.beginPath(); g.ellipse(12.3, -12.6, 1.5, 1.2, 0.2, 0, TAU); g.fill();
    g.fillStyle = '#0a0606'; g.beginPath(); g.ellipse(12.4, -12.6, 0.85, 0.8, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(12.1, -12.9, 0.26, 0, TAU); g.fill();
    // whiskers
    g.strokeStyle = 'rgba(232,214,186,0.62)'; g.lineWidth = 0.24;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(17.2, -9.1 + i * 0.35); g.quadraticCurveTo(21 + i * 0.6, -10.6 + i * 1.7, 23.4 + i * 0.7, -10.2 + i * 2.7); g.stroke(); }
    // gum + near incisor over everything
    g.fillStyle = 'rgba(214,118,116,0.9)'; g.beginPath(); g.ellipse(19, -8.3, 1.9, 0.7, 0.1, 0, TAU); g.fill();
    tooth(g, 18.3, -8.5, 1.18, 0.0, 1);
  });
  // ---- lower jaw (hinge at ~ (9,-8)); painted with a short chin and lower incisor
  const jawPts = [[9.2, -8.8], [13.4, -7.6], [17.6, -6.8], [18.2, -5.4], [15.8, -4.2], [11, -4.4], [8.4, -6.2]];
  P.jaw = part(14, 8, -6, 10, (g) => {
    fur(g, jawPts, {
      base: MR.furL, stops: [[0, 1.0], [1, 0.6]], b: [8, -9, 19, -4], pal: (x, y, r) => (r.next() < 0.6 ? MR.belly : MR.fur), n: 160, len: [0.8, 1.5], lw: [0.26, 0.45], flow: () => PI - 0.05, seed: 41,
      tuft: [0.8, 1.4], tuftStep: 1, over: (g) => { g.fillStyle = lgrad(g, 0, -8, 0, -4, [[0, 'rgba(10,6,4,0)'], [1, 'rgba(10,6,4,0.4)']]); g.fillRect(8, -9, 12, 6); },
    });
    incisor(g, 16.9, -5.9, 0.7, PI + 0.35, 0.9);
  });
  // ---- limbs (authored along +x from the joint)
  const limb = (len, w0, w1, seed, o) => {
    o = o || {};
    const pts = limbPts(len, (k) => lerp(w0, w1, k) + (o.bulge || 0) * sin(k * PI), 5), wm = max(w0, w1) + (o.bulge || 0);
    const near = part(len + 5, wm * 2 + 5, 2.5, wm + 2.5, (g) => {
      fur(g, pts, {
        base: o.base || MR.fur, stops: [[0, 1.3], [0.5, 0.95], [1, 0.5]], b: [-1, -wm - 1, len + 1, wm + 1], pal: o.pal || ((x, y, r) => { const q = r.next(); return q < 0.45 ? MR.fur : q < 0.7 ? MR.furD : MR.furL; }),
        n: o.n || 260, len: [1.1, 2.2], lw: [0.3, 0.55], flow: moleLimbFlow, seed, tuft: [1, 1.9], tuftStep: 1,
        under: (g) => { mottle(g, -1, -wm - 1, len + 1, wm + 1, { c: [30, 18, 10], a: 0.38, f: 0.7, th: 0.5, soft: 0.25, seed: seed + 3, res: 5 }); if (o.under) o.under(g); },
        over: o.over,
      });
    });
    return { near, far: darkened(near, 0.62, '14,10,8'), len };
  };
  const skinLower = (len, from) => (g) => { g.fillStyle = lgrad(g, from, 0, len, 0, [[0, 'rgba(200,132,120,0)'], [1, 'rgba(200,132,120,0.85)']]); g.fillRect(from, -6, len - from + 2, 12); };
  P.arm = limb(6.4, 2.9, 2.3, 51, { bulge: 0.5, n: 340 });
  P.fore = limb(5.6, 2.3, 1.75, 61, { under: skinLower(5.6, 1.5), n: 200 });
  P.shin = limb(6.6, 2.1, 1.35, 71, { under: skinLower(6.6, 3), n: 200 });
  // ---- claws: curved bone-coloured cones
  const claw = (g, x, y, a, len, w, curl, c) => {
    g.save(); g.translate(x, y); g.rotate(a);
    const cp = (g) => { g.beginPath(); g.moveTo(0, -w); g.bezierCurveTo(len * 0.5, -w * 0.9, len * 0.9, -w * 0.3 + curl * 0.3, len, curl); g.bezierCurveTo(len * 0.9, w * 0.2 + curl * 0.3, len * 0.5, w * 0.8, 0, w); g.closePath(); };
    g.fillStyle = lgrad(g, 0, -w, 0, w, [[0, col(c, 1.05)], [0.5, col(c, 0.86)], [1, col(c, 0.48)]]); cp(g); g.fill();
    g.fillStyle = lgrad(g, 0, 0, len, 0, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(50,34,20,0.7)']]); cp(g); g.fill();
    g.strokeStyle = 'rgba(255,252,236,0.6)'; g.lineWidth = 0.22; g.beginPath(); g.moveTo(len * 0.1, -w * 0.5); g.quadraticCurveTo(len * 0.5, -w * 0.5, len * 0.86, curl * 0.5); g.stroke();
    cp(g); g.strokeStyle = 'rgba(30,20,10,0.65)'; g.lineWidth = 0.3; g.stroke(); g.restore();
  };
  const paw = (big, seed) => part(big ? 13 : 10, big ? 10 : 8, 3, big ? 5 : 4, (g) => {
    const RR = U.RNG(seed), k = big ? 1 : 0.74;
    const pp = (g) => blob(g, [[-0.9 * k, -2.4 * k], [1.8 * k, -2.8 * k], [4 * k, -2.3 * k], [5.2 * k, -0.7 * k], [5.3 * k, 1.5 * k], [4 * k, 3 * k], [1.4 * k, 3 * k], [-0.9 * k, 1.6 * k]]);
    const n = big ? 4 : 3, angs = big ? [-0.12, 0.2, 0.48, 0.74] : [0.02, 0.32, 0.6];
    // claws first (behind the knuckles)
    for (let i = 0; i < n; i++) claw(g, (4.6 + Math.abs(angs[i]) * 0.5) * k, (-1.5 + i * (big ? 1.4 : 1.35)) * k, angs[i], (big ? 5 : 3.3) * (1 - i * 0.05), (big ? 0.9 : 0.62), 1.0, MR.claw);
    g.save(); pp(g); g.clip();
    g.fillStyle = lgrad(g, 0, -2.6 * k, 0, 3 * k, [[0, col([184, 134, 116], 1)], [1, col([112, 76, 66], 0.85)]]); g.fillRect(-2, -4, 9, 8);
    mottle(g, -1, -3, 6, 3.4, { c: [50, 28, 22], a: 0.5, f: 1.1, th: 0.5, soft: 0.2, seed: seed + 4, res: 7 });
    g.strokeStyle = 'rgba(70,32,28,0.5)'; g.lineWidth = 0.3; for (let i = 0; i < 5; i++) { const x = RR.range(0, 4.4) * k, y = RR.range(-1.8, 2.4) * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x + RR.range(0.6, 1.2), y + RR.range(-0.4, 0.4)); g.stroke(); }
    // knuckle bumps
    for (let i = 0; i < n; i++) { const x = 4.5 * k + Math.abs(angs[i]) * 0.5 * k, y = (-1.5 + i * (big ? 1.4 : 1.35)) * k; egrad(g, x, y, 1.05 * k, 1.05 * k, 0, [[0, 'rgba(226,168,150,0.9)'], [1, 'rgba(150,90,80,0)']], -0.3, -0.3, 0); }
    // dirty fur on the back of the hand
    for (let i = 0; i < 26; i++) { const x = RR.range(-0.6, 3.4) * k, y = RR.range(-2.4, 0.4) * k; g.strokeStyle = col(MR.furD, RR.range(0.7, 1.3), 0.85); g.lineWidth = 0.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1.1, y + 0.25); g.stroke(); }
    g.fillStyle = lgrad(g, 0, 0, 0, 3 * k, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(20,8,6,0.35)']]); g.fillRect(-2, 0, 9, 4);
    g.restore(); outline(g, pp, 0.4);
  });
  P.pawF = paw(true, 5); P.pawFf = darkened(P.pawF, 0.62, '14,10,8');
  P.pawH = paw(false, 9); P.pawHf = darkened(P.pawH, 0.62, '14,10,8');
  // ---- tail segment (hairless pink, scaly rings) + bristles
  P.tail = tube(5.4, 1.3, 0.95, MR.skin, { seed: 91, hi: 1.25, tex: 0.3, details: (g) => { g.strokeStyle = 'rgba(110,52,46,0.45)'; g.lineWidth = 0.3; for (let x = 0.8; x < 5.4; x += 0.85) { g.beginPath(); g.moveTo(x, -1.3); g.lineTo(x + 0.2, 1.3); g.stroke(); } } });
  // ---- dirt mound for the burrowed state (origin: ground centre)
  P.mound = part(44, 16, 22, 13, (g) => {
    const pts = [[-19, 0], [-16, -3.4], [-10.6, -6.4], [-4.6, -8], [2, -8.3], [8.6, -6.6], [14, -4], [18.6, -0.4], [12, 1.2], [-4, 1.6], [-14, 1.4]];
    const path = (g) => blob(g, pts);
    g.save(); path(g); g.clip();
    g.fillStyle = lgrad(g, 0, -8.6, 0, 1.6, [[0, 'rgb(158,126,90)'], [0.4, 'rgb(112,88,62)'], [1, 'rgb(58,44,32)']]); g.fillRect(-22, -10, 44, 13);
    mottle(g, -20, -10, 20, 2, { c: [36, 26, 18], a: 0.5, f: 0.6, th: 0.48, soft: 0.2, seed: 81, res: 5 });
    mottle(g, -20, -10, 20, 2, { c: [190, 158, 114], a: 0.26, f: 0.9, th: 0.62, soft: 0.2, seed: 83, res: 5 });
    // crumbs / clods
    for (let i = 0; i < 46; i++) { const x = R.range(-18, 18), y = R.range(-8, 1), r = R.range(0.35, 1.2); g.fillStyle = col(R.chance(0.5) ? [150, 120, 84] : [58, 44, 32], R.range(0.8, 1.2), 0.85); g.beginPath(); g.ellipse(x, y, r, r * 0.75, R.range(0, 3), 0, TAU); g.fill(); g.fillStyle = 'rgba(255,236,200,0.28)'; g.fillRect(x - r * 0.4, y - r * 0.55, r * 0.7, 0.3); }
    // dark burrow mouth
    egrad(g, -1, -4.4, 6.2, 2.4, 0.05, [[0, 'rgba(8,5,3,0.98)'], [0.6, 'rgba(14,9,5,0.85)'], [1, 'rgba(20,12,6,0)']], 0, 0, 0);
    g.restore(); outline(g, path, 0.55);
    // upturned rim of soil around the hole
    g.strokeStyle = 'rgba(190,156,112,0.5)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-6.4, -6.8); g.quadraticCurveTo(-1, -9, 5, -7); g.stroke();
  });
  P.clod = [0, 1, 2].map((i) => part(6, 6, 3, 3, (g) => {
    const r = 1.2 + i * 0.5, pts = []; for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, rr = r * R.range(0.75, 1.15); pts.push([cos(a) * rr, sin(a) * rr]); }
    g.save(); blob(g, pts); g.clip(); egrad(g, 0, 0, r * 1.2, r * 1.2, 0, [[0, 'rgb(168,136,98)'], [0.7, 'rgb(104,80,56)'], [1, 'rgb(56,42,30)']], -0.3, -0.3, 0); mottle(g, -3, -3, 3, 3, { c: [30, 22, 14], a: 0.4, f: 1, th: 0.5, soft: 0.2, seed: 90 + i, res: 8 }); g.restore(); outline(g, (g) => blob(g, pts), 0.35);
  }));
  return P;
}

// ---- animation ------------------------------------------------------------------------------------------------
function moleMound(ctx, P, e, t, k, cx, gy, emerge) {
  ctx.save(); ctx.translate(cx, gy); ctx.scale(k, k);
  blit(ctx, P.mound);
  if (!emerge) {
    // dust puffs seeping out of the hole + the odd pebble popping out
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.36 + i / 3) % 1, x = -4 + i * 3.4 + sin(t * 0.9 + i * 2) * 2, y = -7 - ph * 13, r = 2.2 + ph * 5.5, a = 0.2 * sin(ph * PI);
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(178,150,112,' + a + ')'); gr.addColorStop(1, 'rgba(178,150,112,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const c = (t * 0.41 + 0.25) % 1;
    if (c < 0.3) { const u = c / 0.3, x = -1 + 7 * u, y = -6.5 - 9 * sin(u * PI); ctx.save(); ctx.translate(x, y); ctx.rotate(u * 5); blit(ctx, P.clod[1]); ctx.restore(); }
  }
  ctx.restore();
}

function drawMole(ctx, e, G, flashOnly) {
  const P = cached('mole', buildMole), t = e.t || 0, f = e.face < 0 ? -1 : 1, k = e.scale || 1;
  const st = e.state, dead = !!(e.dead || st === 'dead'), A0 = ctx.globalAlpha, def = e.def || {};
  const gy = e.y + e.h;
  ctx.save();
  beginDraw(ctx, k);
  if (st === 'hidden' && !dead) { moleMound(ctx, P, e, t, k, e.cx, gy, false); ctx.restore(); return; }
  let sink = 0, gy0 = gy, ep = 1, emerging = false;
  if (st === 'emerge' && !dead) {
    emerging = true; gy0 = e.home ? e.home.y + e.h / 2 : gy;
    ep = e.stateT !== undefined ? 1 - clamp(e.stateT / 0.5, 0, 1) : (t % 0.5) / 0.5;
    sink = (1 - eo(clamp(ep * 1.25, 0, 1))) * (e.h + 8);
    if (ep >= 0.55) moleMound(ctx, P, e, t, k, e.cx, gy0, true);                              // mound falls behind once the rat is out
    ctx.save(); ctx.beginPath(); ctx.rect(e.cx - 70, gy0 - 200, 140, 200); ctx.clip();      // nothing below the ground line
  }
  ctx.translate(e.cx, gy + sink); ctx.scale(f * k, k);

  // ---- pose parameters -------------------------------------------------------------------------------------
  const ac = atkCurve(e), spd = abs(e.vx || 0), air = !e.onGround && !dead && !emerging;
  const stride = def.stride || 0.13, mv = dead || air ? 0 : sstep(12, 30, spd), gal = sstep(95, 140, spd);
  const A = 6, fq = PI * 0.5 / (stride * A), ph = (emerging ? t * 13 : (e.phase || 0) * fq), u = ph / TAU;
  let pitch = 0, lift = 0, lunge = 0, headRot = 0, jaw = 0.05, tailW = 1, sniff = 0, rise = 0;
  if (dead) { headRot = 0.35; jaw = 0.42; }
  else if (emerging) { pitch = 0.32 * (1 - ep); headRot = -0.22 * (1 - ep); jaw = 0.5 * (1 - ep); }
  else if (st === 'windup') { pitch = 0.5 * eio(ac.w); headRot = -0.34 * ac.w; jaw = 0.62 * ac.w; lift = -0.8 * ac.w; }
  else if (st === 'attack') { pitch = lerp(0.5, -0.16, eio(ac.s)) * (1 - ac.r) + (ac.r > 0 ? -0.16 * (1 - ac.r) * 0 : 0); lunge = 9 * eo(ac.s) * (1 - ac.r); headRot = lerp(-0.34, 0.16, eio(ac.s)) * (1 - ac.r); jaw = lerp(0.62, 1.0, eo(ac.s)) * (1 - ac.r * 0.85); }
  else {
    const bound = lerp(0.9 * abs(sin(ph)), 2.6 * max(0, sin(ph + 0.7)), gal) * mv;
    lift = bound; pitch = lerp(0.03 * sin(2 * ph), 0.11 * sin(ph + 2.3), gal) * mv - (air ? clamp((e.vy || 0) / 900, -0.4, 0.4) : 0);
    sniff = (1 - mv);
    headRot = 0.05 * sin(t * 5.2) * sniff + 0.035 * sin(t * 13) * sniff + (st === 'patrol' ? 0.14 : 0) - (gal * 0.06) + 0.03 * sin(ph) * mv;
    jaw = 0.05 + 0.04 * sin(t * 9) * sniff + (st === 'chase' ? 0.24 + 0.14 * sin(t * 24) : 0);
  }
  const breathe = 1 + sin(t * 2.7) * 0.018 * (dead ? 0 : 1);
  const PX = -12, PY = 0;                                          // pitch pivot (hind feet)
  const RZ = 2.4;                                                 // body clearance (legs stay readable)
  ctx.translate(lunge, -lift - RZ);
  if (pitch) { ctx.translate(PX, PY); ctx.rotate(-pitch); ctx.translate(-PX, -PY); }
  const toBody = (x, y) => { const dx = x - lunge - PX, dy = y + lift + RZ - PY, c = cos(pitch), s = sin(pitch); return [PX + dx * c - dy * s, PY + dx * s + dy * c]; };

  // ---- legs: foot targets (body space) -----------------------------------------------------------------------
  const restF = [[3.6, -4.6], [9.6, -4.4]], restH = [[-13.4, -1.7], [-9.4, -1.7]];   // [near, far]
  const foot = (rest, off, i, hind) => {
    const g0 = gait(u + off, 0.5, A, 4), g1 = gait(u + off + (hind ? 0.42 : 0), 0.4, hind ? 7.4 : 6.6, hind ? 6 : 5.5);
    const gx = lerp(g0[0], g1[0], gal), gyy = lerp(g0[1], g1[1], gal);
    const w = toBody(rest[0] + gx * mv, rest[1] + gyy * mv);
    return w;
  };
  let fN, fF, hN, hF;
  const tuckF = [[7.4, -4.4], [9.8, -3.8]], tuckH = [[-8.6, -3.4], [-12, -3.6]];
  if (dead) { fN = tuckF[0]; fF = tuckF[1]; hN = tuckH[0]; hF = tuckH[1]; }
  else {
    // trot: diagonal pairs; gallop: fronts together, hinds together
    fN = foot(restF[0], 0, 0, false); fF = foot(restF[1], gal < 0.5 ? 0.5 : 0.06, 1, false);
    hN = foot(restH[0], gal < 0.5 ? 0.5 : 0.04, 2, true); hF = foot(restH[1], 0, 3, true);
    if (air) { fN = toBody(15, -6); fF = toBody(18, -5.4); hN = toBody(-17, -6); hF = toBody(-14, -6.4); }
    if (st === 'windup' || (st === 'attack' && ac.r < 1)) {
      const w = st === 'windup' ? ac.w : 1, s = st === 'attack' ? eo(ac.s) * (1 - ac.r) : 0, wr = st === 'attack' ? (1 - ac.s) * (1 - ac.r) + ac.s * 0 : 0;
      const wk = (st === 'windup' ? w : (1 - ac.s) * 1) * (1 - ac.r);
      const raiseN = [11.2, -13.4], raiseF = [13.4, -12.4], strikeN = [26, -8.4], strikeF = [23, -10];
      const tN = [lerp(lerp(fN[0], raiseN[0], wk), strikeN[0], s), lerp(lerp(fN[1], raiseN[1], wk), strikeN[1], s)];
      const tF = [lerp(lerp(fF[0], raiseF[0], wk), strikeF[0], s), lerp(lerp(fF[1], raiseF[1], wk), strikeF[1], s)];
      if (st === 'windup') { fN = [lerp(fN[0], raiseN[0], eio(ac.w)), lerp(fN[1], raiseN[1], eio(ac.w))]; fF = [lerp(fF[0], raiseF[0], eio(ac.w)), lerp(fF[1], raiseF[1], eio(ac.w))]; }
      else { fN = tN; fF = tF; }
      void w; void wr;
    }
    if (emerging) { fN = [12 + 3 * sin(t * 26), -5 + 3 * cos(t * 26)]; fF = [11 + 3 * sin(t * 26 + 2), -6 + 3 * cos(t * 26 + 2)]; }
  }
  const legIK = (sx, sy, tx, ty, l1, l2, mode) => ik2(sx, sy, tx, ty, l1, l2, mode);
  const SF = [[5.8, -8.6], [4.4, -8.8]], SH = [[-11.6, -8.6], [-9.8, -8.8]];
  const drawFront = (i, tgt, far) => {
    const [ex, ey, wx, wy] = legIK(SF[i][0], SF[i][1], tgt[0], tgt[1], 6.2, 6, 'back');
    seg(ctx, far ? P.arm.far : P.arm.near, SF[i][0], SF[i][1], ex, ey); seg(ctx, far ? P.fore.far : P.fore.near, ex, ey, wx, wy);
    const a = atan2(wy - ey, wx - ex);
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(clamp(a * 0.55 + 0.22, -0.7, 1.1) + (dead ? 0.6 : 0)); blit(ctx, far ? P.pawFf : P.pawF); ctx.restore();
  };
  const drawHind = (i, tgt, far) => {
    const [kx, ky, ax, ay] = legIK(SH[i][0], SH[i][1], tgt[0], tgt[1] - 0.2, 6, 7, 'fwd');
    seg(ctx, far ? P.shin.far : P.shin.near, kx, ky, ax, ay);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(-0.15 + (dead ? -0.5 : 0)); blit(ctx, far ? P.pawHf : P.pawH); ctx.restore();
    return [kx, ky];
  };
  // far legs first
  drawHind(1, hF, true); drawFront(1, fF, true);
  // ---- tail (behind body)
  {
    let x = -18, y = -9.6, a = PI - 0.1 + (dead ? 0.7 : 0);
    const tw = dead ? 0.1 : 1;
    for (let i = 0; i < 3; i++) {
      a += (-0.32 + sin(t * 2.4 - i * 0.8) * 0.22 * tw + (mv > 0.1 ? sin(ph - i) * 0.2 * mv : 0)) * (dead ? 0.5 : 1);
      const nx = x + cos(a) * 4.6, ny = y + sin(a) * 4.6;
      seg(ctx, P.tail, x, y, nx, ny); x = nx; y = ny;
    }
  }
  // ---- torso
  ctx.save(); ctx.translate(0, -4.4); ctx.scale(1, breathe); ctx.translate(0, 4.4); blit(ctx, P.torso); ctx.restore();
  // near hind: thigh mass over the torso, then shin/foot
  const hk = drawHind(0, hN, false);
  {
    const a = atan2(hk[1] - SH[0][1], hk[0] - SH[0][0]), a0 = atan2(-1.6 - 5 - SH[0][1] + 5, 6);
    ctx.save(); ctx.translate(-11.5, -9); ctx.rotate(clamp((a - 1.02) * 0.55, -0.6, 0.6)); ctx.translate(11.5, 9); blit(ctx, P.thigh); ctx.restore(); void a0;
  }
  // redraw the near shin above the thigh so the knee overlaps it cleanly
  {
    const [kx, ky, ax, ay] = legIK(SH[0][0], SH[0][1], hN[0], hN[1] - 0.2, 6, 7, 'fwd');
    seg(ctx, P.shin.near, kx, ky, ax, ay); ctx.save(); ctx.translate(ax, ay); ctx.rotate(-0.15 + (dead ? -0.5 : 0)); blit(ctx, P.pawH); ctx.restore();
  }
  // ---- head: jaw (behind), interior, head
  {
    const nx = 7.6, ny = -11.2;
    ctx.save(); ctx.translate(nx, ny); ctx.rotate(headRot); ctx.scale(1.16, 1.16); ctx.translate(-nx, -ny);
    const hx = 9.2, hy = -8.2;                                       // jaw hinge
    if (jaw > 0.12) {                                               // dark mouth interior + tongue
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(jaw * 0.42);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9.6, -0.4); ctx.lineTo(9.8, 0.4 + jaw * 6.2); ctx.closePath();
      ctx.fillStyle = 'rgb(92,22,28)'; ctx.fill(); ctx.fillStyle = 'rgb(206,96,106)'; ctx.beginPath(); ctx.ellipse(6.2, 1.2 + jaw * 2.2, 3.4, 1.1 + jaw * 0.6, 0.15, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(jaw); ctx.translate(-hx, -hy); blit(ctx, P.jaw); ctx.restore();
    blit(ctx, P.head);
    ctx.restore();
  }
  // near front leg (over the face when striking)
  drawFront(0, fN, false);
  if (emerging) {
    ctx.restore();                                                   // end of ground clip
    if (ep < 0.55) moleMound(ctx, P, e, t, k, e.cx, gy0, true);
    // dirt spray
    const el = clamp(ep, 0, 1) * 0.5;
    ctx.save(); ctx.translate(e.cx, gy0 - 5 * k);
    for (let i = 0; i < 9; i++) {
      const r = ((i * 7919) % 97) / 97, vx = (i % 2 ? 1 : -1) * (26 + r * 62), vy = -(170 + r * 130), x = vx * el + (i - 4) * 1.2, y = vy * el + 0.5 * 950 * el * el, a = clamp(1 - el / 0.5, 0, 1) * clamp(el / 0.05, 0, 1);
      if (a <= 0) continue; ctx.save(); ctx.globalAlpha = A0 * a; ctx.translate(x, y); ctx.rotate(el * (6 + i)); blit(ctx, P.clod[i % 3]); ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}

CD.art.molerat = drawMole;

// ================================================================== RADSCORPION
const SC = { shell: [212, 178, 108], hi: [250, 228, 164], dark: [122, 86, 42], joint: [84, 54, 24], leg: [188, 138, 72], glow: [150, 255, 110] };

// glossy waxy chitin surface inside pathFn. b = [x0,y0,x1,y1]. o: {base, top, bot, details(g,R), gloss:[[x0,y0,cx,cy,x1,y1,w,alpha]], seed, rimC}
function chitin(g, pathFn, b, o) {
  const R = U.RNG(o.seed || 3), base = o.base || SC.shell, w = b[2] - b[0], h = b[3] - b[1];
  g.save(); pathFn(g); g.clip();
  g.fillStyle = lgrad(g, 0, b[1], 0, b[3], [[0, col(base, o.top || 1.28)], [0.3, col(base, 1.04)], [0.7, col(base, 0.72)], [1, col(base, o.bot || 0.44)]]); g.fillRect(b[0] - 1, b[1] - 1, w + 2, h + 2);
  mottle(g, b[0], b[1], b[2], b[3], { c: [96, 58, 22], a: 0.42, f: o.mf || 0.5, th: 0.5, soft: 0.24, seed: (o.seed || 3) + 1, res: 5 });
  mottle(g, b[0], b[1], b[2], b[3], { c: [255, 240, 190], a: 0.32, f: (o.mf || 0.5) * 1.5, th: 0.6, soft: 0.18, seed: (o.seed || 3) + 2, res: 5, fn: (x, y) => sstep(b[3], b[1], y) });
  mottle(g, b[0], b[1], b[2], b[3], { c: [156, 176, 70], a: 0.18, f: (o.mf || 0.5) * 0.8, th: 0.58, soft: 0.2, seed: (o.seed || 3) + 3, res: 5 });      // faint radioactive tint
  overlay(g, b[0], b[1], b[2], b[3], { s: 0.26, a: 0.38, mode: 'soft-light', ox: R.range(0, 60), oy: R.range(0, 60) });
  overlay(g, b[0], b[1], b[2], b[3], { s: 0.25, a: 0.16, mode: 'overlay', grain: true });
  if (o.details) o.details(g, R);
  g.fillStyle = lgrad(g, 0, b[1] + h * 0.55, 0, b[3], [[0, 'rgba(60,34,12,0)'], [1, 'rgba(60,34,12,0.32)']]); g.fillRect(b[0] - 1, b[1] + h * 0.5, w + 2, h * 0.55);           // ambient occlusion underneath
  speckle(g, R, b[0], b[1], b[2], b[3], Math.round(w * h * 0.5), ['rgba(40,22,8,0.34)', 'rgba(255,240,196,0.22)', 'rgba(120,150,50,0.16)'], 0.22, 0.6);
  if (o.gloss) for (const s of o.gloss) streak(g, s[0], s[1], s[2], s[3], s[4], s[5], s[6], 'rgba(255,248,224,' + s[7] + ')');
  g.restore();
  rim(g, pathFn, 0, b[1], 0, b[1] + h * 0.55, 'rgba(255,244,200,' + (o.rim === undefined ? 0.7 : o.rim) + ')', 'rgba(255,244,200,0)', 1.2);
  outline(g, pathFn, o.line || 0.6);
}

function scLimb(len, w0, w1, base, seed, o) {          // scorpion leg/arm segment: tube with paler joint rings and small spurs
  o = o || {};
  return tube(len, w0, w1, base, {
    seed, prof: o.prof, spine: o.spine || 0, spines: o.spines || 0, spineDir: 0.5, spineCol: mixc(base, [70, 40, 16], 0.5), hi: 1.32, tex: 0.34, extra: o.extra || 0, after: o.after,
    details: (g, R) => {
      g.fillStyle = 'rgba(70,40,14,0.5)'; g.fillRect(len * 0.5 - 0.25, -w0, 0.5, w0 * 2);
      g.fillStyle = 'rgba(255,236,180,0.26)'; g.fillRect(0.5, -w0, 0.7, w0 * 2); g.fillRect(len - 1.2, -w1, 0.7, w1 * 2);
      speckle(g, R, 0, -w0, len, w0, Math.round(len * w0), ['rgba(40,22,8,0.34)', 'rgba(255,240,196,0.24)'], 0.22, 0.55);
    },
  });
}

function buildScorp() {
  const P = {}, R = U.RNG(2718);
  // ---- prosoma: carapace shield
  const proPts = [[2, -16.4], [6, -18.7], [12, -18.3], [17, -15.4], [19.6, -11.8], [18.2, -9.2], [10, -8.6], [3, -9.2]];
  const proPath = (g) => blob(g, proPts);
  P.pro = part(26, 16, 3, 20.5, (g) => {
    chitin(g, proPath, [0, -20, 22, -8], {
      seed: 5, gloss: [[5, -17.6, 9, -18.9, 14.2, -17, 0.8, 0.85], [15, -15.6, 17, -14.4, 18.4, -12, 0.5, 0.5]],
      details: (g) => {
        g.strokeStyle = 'rgba(84,52,22,0.6)'; g.lineWidth = 0.42; g.beginPath(); g.moveTo(10.4, -17.6); g.quadraticCurveTo(6, -17, 3.6, -14.6); g.stroke(); g.beginPath(); g.moveTo(10.8, -17.4); g.quadraticCurveTo(13, -14, 17.6, -12); g.stroke();
        g.fillStyle = 'rgba(255,240,190,0.5)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(4.2 + i * 1.5, -13.8 - sin(i * 0.5) * 1.2, 0.3, 0, TAU); g.fill(); }     // keel beads
        egrad(g, 10.4, -18, 3.4, 1.7, 0, [[0, 'rgba(255,240,190,0.5)'], [1, 'rgba(255,240,190,0)']], 0, 0, 0);
      },
    });
    // median eyes on a raised tubercle
    for (const [x, y] of [[9.6, -18.2], [11.8, -18.1]]) {
      egrad(g, x, y, 1.35, 1.1, 0, [[0, 'rgb(30,26,18)'], [0.75, 'rgb(10,8,6)'], [1, 'rgb(96,64,28)']], -0.3, -0.3, 0, true);
      g.fillStyle = 'rgba(255,255,240,0.95)'; g.beginPath(); g.arc(x - 0.35, y - 0.4, 0.28, 0, TAU); g.fill(); g.fillStyle = 'rgba(150,255,110,0.5)'; g.beginPath(); g.arc(x + 0.35, y + 0.25, 0.22, 0, TAU); g.fill();
    }
    for (let i = 0; i < 3; i++) { g.fillStyle = '#0a0806'; g.beginPath(); g.arc(17.2 + i * 0.7, -14.4 + i * 0.9, 0.55, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,240,0.8)'; g.fillRect(17 + i * 0.7, -14.7 + i * 0.9, 0.25, 0.25); }
  });
  // ---- mesosoma: seven overlapping tergite plates
  const mePts = [[4, -16.2], [-1, -17.6], [-7, -17.2], [-12, -15.6], [-16.4, -13.2], [-17.8, -10.8], [-14.2, -9], [-6, -8.5], [2, -8.8], [4.6, -10.6]];
  const mePath = (g) => blob(g, mePts);
  P.meso = part(26, 14, 20, 19, (g) => {
    chitin(g, mePath, [-19, -19, 6, -8], {
      seed: 15, mf: 0.6, gloss: [[3, -16.4, -3, -18.4, -13, -15, 0.8, 0.8], [-5, -13.4, -10, -13.2, -15, -11.4, 0.4, 0.35]],
      details: (g) => {
        for (let i = 0; i < 7; i++) {
          const x = 4 - i * 3.05;                                        // plate boundary (darker gap + overhanging lip)
          g.strokeStyle = 'rgba(70,42,16,0.75)'; g.lineWidth = 0.55; g.beginPath(); g.moveTo(x, -19); g.quadraticCurveTo(x - 1.6, -13.2, x + 0.2, -8); g.stroke();
          g.strokeStyle = 'rgba(255,240,190,0.32)'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(x - 0.5, -18.8); g.quadraticCurveTo(x - 2.2, -13.2, x - 0.4, -8); g.stroke();
          g.fillStyle = lgrad(g, x - 3, 0, x, 0, [[0, 'rgba(255,236,180,0.16)'], [0.85, 'rgba(255,236,180,0)'], [1, 'rgba(50,28,10,0.32)']]); g.fillRect(x - 3, -19, 3.2, 12);
          g.fillStyle = 'rgba(255,240,190,0.6)'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x - 1.5 - k * 0.1, -16 + k * 1.3 + i * 0.2, 0.26, 0, TAU); g.fill(); }     // median keel beads
        }
        g.fillStyle = 'rgba(40,24,8,0.5)'; g.fillRect(-19, -10.2, 26, 0.6);                                        // lower edge groove
      },
    });
  });
  // ---- tail segments (barrel shaped, keeled), telson bulb + aculeus
  const tailSeg = (len, w0, w1, seed) => scLimb(len, w0, w1, [208, 172, 100], seed, {
    prof: (k) => lerp(w0, w1, k) * (1 + 0.14 * sin(k * PI)), extra: 0.6,
    after: (g) => {},
  });
  P.tail = [tailSeg(9.4, 2.35, 2.05, 21), tailSeg(9.2, 2.1, 1.85, 22), tailSeg(9, 1.9, 1.65, 23), tailSeg(8.8, 1.7, 1.5, 24), tailSeg(8.6, 1.55, 1.4, 25)];
  P.tail.forEach((sp, i) => {                                             // keel lines + bead rows over each segment
    const g = sp.c.getContext('2d'); g.save(); g.scale(SS, SS); g.translate(sp.ox, sp.oy); g.lineCap = 'round';
    const len = sp.w - sp.ox * 2 - 0.6, w = 2.35 - i * 0.2;
    g.strokeStyle = 'rgba(70,42,16,0.55)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(0.8, -w * 0.5); g.lineTo(len - 0.8, -w * 0.45); g.stroke(); g.beginPath(); g.moveTo(0.8, w * 0.5); g.lineTo(len - 0.8, w * 0.45); g.stroke();
    g.fillStyle = 'rgba(255,240,190,0.65)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(1.3 + k * (len - 2.6) / 5, -w * 0.28, 0.24, 0, TAU); g.fill(); }
    g.restore(); sp.c2 = halve(sp.c);
  });
  P.telson = part(16, 10, 2.5, 5, (g) => {
    const bulb = (g) => blob(g, [[0, -2.1], [3, -2.9], [6.2, -1.6], [6.8, 0.6], [4.6, 2.6], [1, 2.5], [-0.6, 0.6]]);
    chitin(g, bulb, [-1, -3, 7, 3], {
      base: [222, 160, 70], seed: 35, mf: 0.9, gloss: [[1, -2, 3, -3, 5.6, -1.4, 0.5, 0.85]],
      details: (g) => { egrad(g, 3.6, 0.6, 3.6, 2.4, 0, [[0, 'rgba(180,255,120,0.4)'], [1, 'rgba(180,255,120,0)']], 0, 0, 0); },
    });
    // aculeus (stinger): curved, needle sharp, dark amber tip
    const acu = (g) => { g.beginPath(); g.moveTo(5.4, -1.5); g.bezierCurveTo(8.6, -2.4, 11.6, -0.4, 12.6, 3.2); g.bezierCurveTo(10.4, 0.6, 8, 0.4, 6.2, 1.5); g.closePath(); };
    g.fillStyle = lgrad(g, 5, 0, 12.6, 0, [[0, col([170, 110, 46], 1)], [0.6, col([70, 36, 14], 1)], [1, col([28, 14, 6], 1)]]); acu(g); g.fill();
    g.strokeStyle = 'rgba(255,220,150,0.6)'; g.lineWidth = 0.28; g.beginPath(); g.moveTo(6, -1.4); g.bezierCurveTo(8.6, -2.1, 11, -0.6, 12, 2.4); g.stroke();
    acu(g); g.strokeStyle = 'rgba(10,8,6,0.7)'; g.lineWidth = 0.3; g.stroke();
    g.fillStyle = 'rgb(190,255,120)'; g.beginPath(); g.arc(12.5, 3.3, 0.36, 0, TAU); g.fill();                    // venom bead at the tip
  });
  // ---- legs (near copies + darker far copies)
  const legPair = (l1, l2, w, seed) => {
    const fem = scLimb(l1, w, w * 0.82, SC.leg, seed, { prof: (k) => w * (0.82 + 0.28 * sin(PI * (0.1 + 0.8 * k))), spine: 0.6, spines: 2 });
    const tib = scLimb(l2 - 3, w * 0.8, w * 0.44, mixc(SC.leg, [90, 56, 24], 0.2), seed + 1, {
      spine: 1.05, spines: 4, bothSides: false, extra: 3.4,
      after: (g) => {
        const tl = l2 - 3; g.strokeStyle = col(SC.leg, 0.55); g.lineWidth = 0.6; g.beginPath(); g.moveTo(tl, 0); g.lineTo(tl + 2.6, 0.05); g.stroke();
        g.strokeStyle = 'rgba(40,22,8,0.95)'; g.lineWidth = 0.55; g.beginPath(); g.moveTo(tl + 2.2, 0); g.quadraticCurveTo(tl + 3.6, 0.1, tl + 3.7, 1.2); g.stroke();
      },
    });
    return { fem, tib, femF: darkened(fem, 0.62, '16,10,6'), tibF: darkened(tib, 0.62, '16,10,6'), l1, l2 };
  };
  P.leg = [legPair(6.6, 9.4, 1.55, 41), legPair(6.6, 9.4, 1.55, 51), legPair(6.4, 9.2, 1.5, 61), legPair(6.2, 9, 1.45, 71)];
  // ---- pedipalps: arm, forearm, chela (palm + fixed finger) and movable finger
  P.arm = [scLimb(4.6, 2.5, 2.1, SC.shell, 81, { prof: (k) => 2.3 * (1 + 0.14 * sin(PI * k)) }), scLimb(5, 2.2, 1.9, SC.shell, 82, { prof: (k) => 2.05 * (1 + 0.16 * sin(PI * k)) })];
  P.armF = P.arm.map((a) => darkened(a, 0.62, '16,10,6'));
  const chelaPts = [[-1.6, -2.9], [3, -3.8], [7.8, -3.4], [9.6, -1.8], [10.2, 0.4], [13.2, 2.4], [17.4, 3.8], [17.2, 4.9], [12.6, 4.6], [8, 4.5], [3, 4.1], [-1.6, 3]];
  const chelaPath = (g) => blob(g, chelaPts);
  P.chela = part(24, 14, 3, 6.5, (g) => {
    chitin(g, chelaPath, [-2, -4, 18, 5.4], {
      seed: 91, gloss: [[1, -3, 5, -4.2, 9, -3, 0.8, 0.85], [11.4, 1.8, 14, 3, 16.6, 3.6, 0.35, 0.6]],
      details: (g) => {
        // serrated inner edge of the fixed finger
        g.fillStyle = 'rgb(70,44,20)'; for (let i = 0; i < 7; i++) { const x = 10.6 + i * 0.95, y = 0.5 + (x - 10.6) * 0.5 + (i > 3 ? (i - 3) * 0.06 : 0); g.beginPath(); g.moveTo(x, y + 0.2); g.lineTo(x + 0.55, y - 0.9); g.lineTo(x + 1, y + 0.4); g.fill(); }
        g.strokeStyle = 'rgba(70,42,16,0.55)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(7.6, -3.2); g.quadraticCurveTo(8.6, 0, 8, 4.4); g.stroke();
      },
    });
  });
  const movPts = [[-1.4, -1.9], [2.6, -2.7], [7, -2.2], [10.4, -0.7], [12.2, 0.4], [10.6, 1.1], [7, 1.5], [2.6, 2.2], [-1.4, 1.9]];
  const movPath = (g) => blob(g, movPts);
  P.mov = part(16, 8, 3, 4, (g) => {
    chitin(g, movPath, [-2, -3, 13, 3], {
      seed: 97, gloss: [[1, -2.1, 5, -3, 9.6, -1.2, 0.6, 0.8]],
      details: (g) => { g.fillStyle = 'rgb(70,44,20)'; for (let i = 0; i < 6; i++) { const x = 3 + i * 1.5; g.beginPath(); g.moveTo(x, 1.7 - i * 0.05); g.lineTo(x + 0.7, 0.4); g.lineTo(x + 1.3, 1.6 - i * 0.05); g.fill(); } },
    });
  });
  P.chelaF = darkened(P.chela, 0.64, '16,10,6'); P.movF = darkened(P.mov, 0.64, '16,10,6');
  return P;
}

// ---- animation ------------------------------------------------------------------------------------------------
const SC_TAIL_LEN = [9.4, 9.2, 9, 8.8, 8.6];
const SC_TAIL = {                                  // absolute heading of each of the 5 segments + telson (rad, y down)
  rest: [-1.15, -0.7, -0.28, 0.12, 0.42, 0.62],
  wind: [-1.65, -1.2, -0.78, -0.38, -0.08, 0.12],
  hit: [-0.5, -0.32, -0.16, -0.02, 0.1, 0.22],
  dead: [-0.2, 0.0, 0.2, 0.4, 0.55, 0.7],
};
// pedipalp pose: [upper-arm heading, forearm heading, chela heading, opening]
const SC_CLAW = { idle: [0.62, 0.05, 0.16, 0.26], chase: [0.5, -0.05, 0.02, 0.5], wind: [-0.05, -0.75, -0.55, 1.0], hit: [0.7, 0.35, 0.5, 0.04], dead: [1.15, 2.1, 2.6, 0.5] };
const SC_HIP = [[13.6, -10.4], [9, -10.2], [4.6, -10.2], [0.2, -10.4]];
const SC_FOOT = [24, 16.5, 8.5, -1];

function drawScorp(ctx, e, G, flashOnly) {
  const P = cached('scorp', buildScorp), t = e.t || 0, f = e.face < 0 ? -1 : 1, k = e.scale || 1;
  const dead = !!(e.dead || e.state === 'dead'), st = e.state, ac = atkCurve(e), A0 = ctx.globalAlpha, def = e.def || {};
  const air = !e.onGround && !dead, spd = abs(e.vx || 0), mv = dead || air ? 0 : sstep(12, 30, spd), chase = sstep(60, 100, spd);
  const stride = def.stride || 0.1, duty = 0.6, A = 6, fq = PI * duty / (stride * A), ph = (e.phase || 0) * fq;
  ctx.save();
  ctx.translate(e.cx, e.y + e.h + (dead ? deadDrop(e, 19.5) : 0)); ctx.scale(f * k, k);
  beginDraw(ctx, k);
  // body offsets
  let lunge = 0, bob = 0, pitch = 0;
  if (!dead) {
    bob = -abs(sin(ph)) * 0.5 * mv - sin(t * 1.6) * 0.22 * (1 - mv);
    if (st === 'windup') { pitch = 0.05 * ac.w; bob += 0.8 * ac.w; lunge = -2.5 * ac.w; }
    else if (st === 'attack') { lunge = lerp(-2.5, 8, eo(ac.s)) * (1 - ac.r) + (-2.5 * 0); pitch = lerp(0.05, -0.05, ac.s) * (1 - ac.r); }
  }
  ctx.translate(-5 + lunge, bob);
  if (pitch) { ctx.translate(0, 0); ctx.rotate(-pitch); }
  const toGroundY = -bob;                                          // feet stay planted while the body bobs

  // ---- legs --------------------------------------------------------------------------------------------------
  const legTarget = (i, far) => {
    const hx = SC_HIP[i][0] + (far ? 1.4 : 0), hy = SC_HIP[i][1] + (far ? -0.5 : 0);
    let fx = SC_FOOT[i] + (far ? 1.6 : 0), fy = 0;
    if (dead) { fx = hx + (i < 2 ? 3.4 : -3.4) + (far ? 1 : -0.5); fy = -2.4 - i * 0.5; }
    else if (air) { fx = hx + (i < 2 ? 9 : -9); fy = -3; }
    else {
      const grp = (i & 1) ^ (far ? 1 : 0), g0 = gait(ph / TAU + (grp ? 0.5 : 0), duty, A, 4.6);
      fx += g0[0] * mv; fy = g0[1] * mv;
      if (st === 'windup' || st === 'attack') { fx += (i === 0 ? 2.5 : i === 1 ? 1 : -1) * (st === 'windup' ? ac.w : (1 - ac.r)); }   // braced stance
    }
    return [hx, hy, fx, fy + toGroundY * 0];
  };
  const drawLeg = (i, far) => {
    const [hx, hy, fx, fy] = legTarget(i, far), S = P.leg[i];
    const [kx, ky, ex, ey] = ik2(hx, hy, fx, fy - toGroundY * 0, 5, 11, dead ? 'down' : 'up');
    seg(ctx, far ? S.femF : S.fem, hx, hy, kx, ky); seg(ctx, far ? S.tibF : S.tib, kx, ky, ex, ey);
  };
  for (let i = 3; i >= 0; i--) drawLeg(i, true);

  // ---- pedipalps (claws) -------------------------------------------------------------------------------------
  const mix4 = (a, b, w) => [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w), lerp(a[3], b[3], w)];
  let cp;
  const baseP = mix4(SC_CLAW.idle, SC_CLAW.chase, chase);
  if (dead) cp = SC_CLAW.dead;
  else if (st === 'windup') cp = mix4(baseP, SC_CLAW.wind, eio(ac.w));
  else if (st === 'attack') cp = ac.s < 1 ? mix4(SC_CLAW.wind, SC_CLAW.hit, eo(ac.s)) : mix4(SC_CLAW.hit, baseP, eio(ac.r));
  else cp = baseP;
  const pump = dead ? 0 : (st === 'windup' || st === 'attack' ? 0 : sin(t * (2.2 + chase * 6)) * (0.06 + 0.06 * chase));
  const drawClaw = (far) => {
    const sx = far ? 16.6 : 17.6, sy = far ? -12.6 : -11.4, ph2 = far ? 0.9 : 0;
    const a1 = cp[0] + (far ? 0.12 : 0) + pump * 0.5 * (far ? -1 : 1), a2 = cp[1] + (far ? -0.1 : 0) + pump, a3 = cp[2] + (far ? -0.14 : 0) + pump * 0.6, op = clamp(cp[3] * (far ? 0.9 : 1) + pump * 0.8 + (st === 'idle' || st === 'patrol' ? 0.04 * sin(t * 1.9 + ph2) : 0), 0, 1.15);
    const ex = sx + cos(a1) * 4.2, ey = sy + sin(a1) * 4.2, wx = ex + cos(a2) * 4.5, wy = ey + sin(a2) * 4.5;
    seg(ctx, far ? P.armF[0] : P.arm[0], sx, sy, ex, ey, 4.2 / 4.6); seg(ctx, far ? P.armF[1] : P.arm[1], ex, ey, wx, wy, 4.5 / 5);
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(a3); ctx.scale(0.84, 0.84);
    // movable finger (hinged on the top of the palm), drawn behind the palm's front edge
    ctx.save(); ctx.translate(8.2, -2.7); ctx.rotate(0.62 - op); blit(ctx, far ? P.movF : P.mov); ctx.restore();
    blit(ctx, far ? P.chelaF : P.chela);
    ctx.restore();
  };
  drawClaw(true);

  // ---- body --------------------------------------------------------------------------------------------------
  ctx.save(); ctx.translate(0, -9); ctx.scale(1.05, 1.16); ctx.translate(0, 9); blit(ctx, P.meso); blit(ctx, P.pro); ctx.restore();
  // small pale chelicerae between the claws
  ctx.fillStyle = 'rgb(214,186,124)'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(19.4, -9.6, 1.9, 1.2, 0.3, 0, TAU); ctx.fill(); ctx.stroke();
  for (let i = 3; i >= 0; i--) drawLeg(i, false);

  // ---- tail (kinematic chain) --------------------------------------------------------------------------------
  {
    let H;
    const rest = SC_TAIL.rest, wind = SC_TAIL.wind, hit = SC_TAIL.hit;
    const mixA = (a, b, w) => a.map((v, i) => lerp(v, b[i], w));
    if (dead) H = SC_TAIL.dead;
    else if (st === 'windup') H = mixA(rest, wind, eio(ac.w));
    else if (st === 'attack') H = ac.s < 1 ? mixA(wind, hit, eo(ac.s)) : mixA(hit, rest, eio(ac.r));
    else H = rest;
    const stretch = st === 'attack' ? 1 + 0.08 * eo(ac.s) * (1 - ac.r) : 1;
    const sway = dead ? 0 : (st === 'windup' || st === 'attack' ? 0.3 : 1);
    let x = -15.6, y = -13.4;
    const hs = [];
    for (let i = 0; i < 5; i++) {
      const a = H[i] + sway * (sin(t * 1.7 + i * 0.6) * 0.035 * (i + 1) * 0.6 + (mv > 0.1 ? sin(ph + i * 0.5) * 0.03 * mv : 0));
      const L = SC_TAIL_LEN[i] * stretch, nx = x + cos(a) * L, ny = y + sin(a) * L;
      seg(ctx, P.tail[i], x, y, nx, ny, 1); x = nx; y = ny; hs.push(a);
    }
    const ta = H[5] + sway * sin(t * 2.3) * 0.05;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ta); ctx.translate(2.2, 0.2); blit(ctx, P.telson); ctx.restore();
    if (!flashOnly && !dead) {                                     // faint venom glow at the stinger tip
      const tx = x + cos(ta) * 14.7 - sin(ta) * 3.5, ty = y + sin(ta) * 14.7 + cos(ta) * 3.5;
      const glow = 0.34 + 0.12 * sin(t * 4) + (st === 'windup' ? 0.4 * ac.w : 0) + (st === 'attack' ? 0.35 * (1 - ac.r) : 0);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = A0 * clamp(glow, 0, 1);
      const gr = ctx.createRadialGradient(tx, ty, 0, tx, ty, 6.5); gr.addColorStop(0, 'rgba(170,255,120,0.95)'); gr.addColorStop(0.35, 'rgba(120,230,80,0.4)'); gr.addColorStop(1, 'rgba(90,200,60,0)');
      ctx.fillStyle = gr; ctx.fillRect(tx - 7, ty - 7, 14, 14); ctx.restore();
    }
  }
  drawClaw(false);
  ctx.restore();
}

CD.art.scorpion = drawScorp;

// ================================================================== MIRELURK
const ML = { shell: [110, 122, 100], shellD: [46, 58, 46], algae: [74, 118, 52], barn: [196, 194, 172], flesh: [168, 122, 100], bone: [222, 210, 174], claw: [112, 126, 96], tip: [216, 168, 104], eye: [236, 176, 40] };

// one barnacle: a little limestone volcano with a dark mouth
function barnacle(g, x, y, r, R) {
  const sq = R.range(0.75, 0.95);
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(20,24,16,0.5)'; g.beginPath(); g.ellipse(0.2, r * 0.35, r * 1.15, r * 0.6, 0, 0, TAU); g.fill();                      // contact shadow
  const bp = (g) => { g.beginPath(); g.moveTo(-r, r * 0.25); g.quadraticCurveTo(-r * 0.85, -r * 0.7 * sq, -r * 0.35, -r * 0.95 * sq); g.lineTo(r * 0.35, -r * 0.95 * sq); g.quadraticCurveTo(r * 0.85, -r * 0.7 * sq, r, r * 0.25); g.closePath(); };
  g.fillStyle = lgrad(g, -r, 0, r, 0, [[0, col(ML.barn, 0.62)], [0.4, col(ML.barn, 1.08)], [1, col(ML.barn, 0.55)]]); bp(g); g.fill();
  g.strokeStyle = 'rgba(40,40,30,0.45)'; g.lineWidth = 0.22; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * r * 0.5, r * 0.2); g.lineTo(i * r * 0.3, -r * 0.85 * sq); g.stroke(); }
  g.fillStyle = 'rgb(28,26,22)'; g.beginPath(); g.ellipse(0, -r * 0.92 * sq, r * 0.42, r * 0.2, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,244,0.5)'; g.fillRect(-r * 0.55, -r * 0.6, r * 0.22, r * 0.6);
  bp(g); g.strokeStyle = 'rgba(20,22,14,0.6)'; g.lineWidth = 0.3; g.stroke();
  g.restore();
}
function barnClusters(g, R, list) {                  // list of [cx, cy, spread, n, rmin, rmax]
  for (const [cx, cy, sp, n, r0, r1] of list) {
    const pts = [];
    for (let i = 0; i < n; i++) pts.push([cx + R.gauss() * sp, cy + R.gauss() * sp * 0.7, R.range(r0, r1)]);
    pts.sort((a, b) => a[1] - b[1]);
    for (const p of pts) barnacle(g, p[0], p[1], p[2], R);
  }
}

function buildMire() {
  const P = {}, R = U.RNG(5150);
  // ---- shell: big domed carapace
  const shellPts = [[13.4, -19], [11.4, -27], [6.4, -34.2], [-2, -38.4], [-11, -37.8], [-18, -33], [-23, -25], [-25.2, -17.4], [-23.4, -13.6], [-14, -12.4], [-2, -12.8], [8, -14.6]];
  const shellPath = (g) => blob(g, shellPts);
  P.shell = part(46, 34, 28, 42, (g) => {
    g.save(); shellPath(g); g.clip();
    // dome value structure: lit top-front, dark wet underside
    g.fillStyle = lgrad(g, 0, -39, 0, -12, [[0, col(ML.shell, 1.6)], [0.3, col(ML.shell, 1.22)], [0.65, col(ML.shell, 0.72)], [1, col(ML.shell, 0.4)]]); g.fillRect(-30, -42, 50, 32);
    egrad(g, -6, -22, 22, 17, 0, [[0, 'rgba(0,0,0,0)'], [0.62, 'rgba(0,0,0,0)'], [1, 'rgba(8,14,8,0.5)']], 0.2, -0.45, 0);                    // edge falloff (dome)
    mottle(g, -27, -40, 15, -11, { c: [20, 26, 18], a: 0.5, f: 0.3, th: 0.5, soft: 0.24, seed: 11, res: 5 });
    mottle(g, -27, -40, 15, -11, { c: [186, 196, 160], a: 0.32, f: 0.42, th: 0.58, soft: 0.2, seed: 13, res: 5, fn: (x, y) => sstep(-16, -36, y) });
    // growth ridges: concentric contours
    for (let i = 1; i <= 6; i++) {
      const s = 1 - i * 0.135, pts = scalePts(shellPts, -5, -13, s, s);
      g.save(); g.lineJoin = 'round'; blob(g, pts); g.strokeStyle = 'rgba(14,20,12,0.5)'; g.lineWidth = 0.75; g.stroke();
      g.translate(0, -0.55); blob(g, pts); g.strokeStyle = 'rgba(214,226,190,0.2)'; g.lineWidth = 0.45; g.stroke(); g.restore();
    }
    // radial cracks / scars
    g.strokeStyle = 'rgba(12,16,10,0.65)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-14, -34); g.lineTo(-11, -29); g.lineTo(-13, -24.5); g.lineTo(-10.6, -20); g.stroke();
    g.strokeStyle = 'rgba(226,236,206,0.3)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(-13.4, -34); g.lineTo(-10.4, -29); g.lineTo(-12.4, -24.5); g.stroke();
    // algae: slimy green growth, heavier low down and toward the rear
    mottle(g, -27, -40, 15, -11, { c: [58, 120, 40], a: 0.62, f: 0.36, th: 0.48, soft: 0.2, seed: 21, res: 5, fn: (x, y) => 0.25 + 0.75 * sstep(-30, -13, y) });
    mottle(g, -27, -40, 15, -11, { c: [120, 160, 70], a: 0.34, f: 0.7, th: 0.6, soft: 0.16, seed: 23, res: 5, fn: (x, y) => sstep(-24, -13, y) });
    // rusty stains running down
    mottle(g, -27, -40, 15, -11, { c: [150, 90, 40], a: 0.3, f: 0.5, fy: 0.16, th: 0.55, soft: 0.2, seed: 25, res: 5 });
    overlay(g, -27, -41, 15, -11, { s: 0.3, a: 0.4, mode: 'soft-light', ox: 5, oy: 40 });
    overlay(g, -27, -41, 15, -11, { s: 0.25, a: 0.2, mode: 'overlay', grain: true });
    // barnacle colonies
    barnClusters(g, R, [[-14, -31, 3.2, 8, 0.9, 1.7], [-5, -35, 2.2, 5, 0.8, 1.4], [-20, -22, 2.8, 7, 0.9, 1.8], [2, -28, 2.4, 5, 0.8, 1.5], [-9, -17, 3.4, 9, 0.9, 1.8], [-21, -16, 2, 4, 0.8, 1.4], [6, -20, 1.8, 3, 0.8, 1.3], [-1, -22, 1.6, 3, 0.7, 1.1]]);
    // slime streaks + wet specular
    g.strokeStyle = 'rgba(150,200,120,0.28)'; g.lineWidth = 0.5; for (let i = 0; i < 6; i++) { const x = R.range(-22, 8), y = R.range(-28, -16); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + R.range(-1, 1), y + 3, x + R.range(-1.5, 1.5), y + R.range(5, 8)); g.stroke(); }
    egrad(g, 1, -32, 8.5, 4.4, -0.35, [[0, 'rgba(236,250,226,0.5)'], [1, 'rgba(236,250,226,0)']], 0, 0, 0);
    streak(g, 8.6, -30.4, 3, -37, -6.4, -37.6, 1.0, 'rgba(244,255,236,0.62)');
    streak(g, 10.6, -25, 8, -29, 4, -33, 0.55, 'rgba(244,255,236,0.5)');
    streak(g, -16, -32, -19.4, -28.6, -21.4, -24, 0.5, 'rgba(230,250,220,0.32)');
    for (const [x, y, r] of [[-1.6, -35.6, 0.55], [4.2, -32.4, 0.42], [-8, -34.4, 0.36], [7, -27, 0.4]]) { g.fillStyle = 'rgba(255,255,250,0.9)'; g.beginPath(); g.ellipse(x, y, r * 1.3, r * 0.8, -0.4, 0, TAU); g.fill(); }
    // dark shadowed rim along the bottom edge
    g.fillStyle = lgrad(g, 0, -17, 0, -12.2, [[0, 'rgba(6,10,6,0)'], [1, 'rgba(6,10,6,0.6)']]); g.fillRect(-28, -18, 44, 7);
    g.restore();
    rim(g, shellPath, 0, -39, 0, -26, 'rgba(226,255,200,0.7)', 'rgba(226,255,200,0)', 1.4);
    outline(g, shellPath, 0.7);
    // bone spikes along the crest (drawn on top of the outline)
    for (const [x, y, a, l] of [[-12.2, -37.2, -1.7, 2.6], [-7, -38.2, -1.6, 3.2], [-1.6, -38.2, -1.45, 2.8], [3.6, -36.4, -1.2, 2.4]]) {
      g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, -1.3); g.quadraticCurveTo(l * 0.6, -0.9, l, 0); g.quadraticCurveTo(l * 0.6, 0.9, 0, 1.3); g.closePath();
      g.fillStyle = lgrad(g, 0, -1.3, 0, 1.3, [[0, col(ML.bone, 1.05)], [1, col(ML.bone, 0.5)]]); g.fill(); g.strokeStyle = 'rgba(20,20,14,0.7)'; g.lineWidth = 0.4; g.stroke(); g.restore();
    }
  });
  // ---- underbody (flesh + belly plates), sits between the shell rim and the legs
  const flPts = [[10, -19], [12, -13], [7, -8.6], [-4, -7.6], [-15, -8], [-22.4, -10.6], [-23.4, -14.4], [-14, -15.4], [0, -16.4]];
  const flPath = (g) => blob(g, flPts);
  P.flesh = part(40, 14, 25, 21, (g) => {
    g.save(); flPath(g); g.clip();
    g.fillStyle = lgrad(g, 0, -19, 0, -7.6, [[0, col(ML.flesh, 0.5)], [0.4, col(ML.flesh, 0.95)], [1, col(ML.flesh, 0.55)]]); g.fillRect(-26, -21, 40, 14);
    mottle(g, -25, -20, 14, -7, { c: [40, 30, 26], a: 0.5, f: 0.6, th: 0.5, soft: 0.22, seed: 31, res: 6 });
    mottle(g, -25, -20, 14, -7, { c: [90, 130, 60], a: 0.3, f: 0.7, th: 0.58, soft: 0.2, seed: 33, res: 6 });
    g.strokeStyle = 'rgba(40,24,20,0.55)'; g.lineWidth = 0.5; for (let i = 0; i < 9; i++) { const x = -21 + i * 3.6; g.beginPath(); g.moveTo(x, -16.5); g.quadraticCurveTo(x + 0.8, -12, x - 0.4, -8); g.stroke(); }
    streak(g, -20, -13, -8, -14.6, 6, -12.4, 0.7, 'rgba(255,224,200,0.22)');
    overlay(g, -25, -20, 14, -7, { s: 0.3, a: 0.36, mode: 'soft-light', ox: 50, oy: 20 });
    g.restore(); outline(g, flPath, 0.6);
  });
  // ---- head / face: blunt crusty snout with mouth slit (origin = head centre)
  const hdPts = [[-5, -3.6], [-1, -5.6], [4.6, -5], [8.2, -2], [8.8, 1.6], [6, 4.6], [1, 5.4], [-4, 3.8]];
  const hdPath = (g) => blob(g, hdPts);
  P.head = part(20, 16, 8, 8, (g) => {
    g.save(); hdPath(g); g.clip();
    g.fillStyle = lgrad(g, 0, -5.6, 0, 5.4, [[0, col([124, 138, 100], 1.2)], [0.5, col([96, 108, 78], 0.9)], [1, col(ML.flesh, 0.55)]]); g.fillRect(-7, -7, 18, 14);
    mottle(g, -6, -6, 10, 6, { c: [20, 26, 16], a: 0.5, f: 0.9, th: 0.5, soft: 0.22, seed: 41, res: 8 });
    mottle(g, -6, -6, 10, 6, { c: [70, 120, 46], a: 0.4, f: 0.9, th: 0.55, soft: 0.2, seed: 43, res: 8 });
    // lower lip / flesh around the mouth
    egrad(g, 6, 2.4, 4, 3.4, 0, [[0, 'rgba(210,140,120,0.7)'], [1, 'rgba(210,140,120,0)']], 0, 0, 0);
    g.restore(); outline(g, hdPath, 0.6);
    // mouth slit
    g.strokeStyle = 'rgb(20,8,8)'; g.lineWidth = 1.0; g.beginPath(); g.moveTo(3.4, 2.6); g.quadraticCurveTo(6.4, 3.8, 8.2, 2.2); g.stroke();
    // nostril pits + brow ridge
    g.fillStyle = 'rgba(14,10,8,0.8)'; g.beginPath(); g.ellipse(7.6, -0.6, 0.5, 0.75, 0.3, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(14,20,12,0.55)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-1.6, -3.2); g.quadraticCurveTo(3, -4.6, 6.6, -2.2); g.stroke();
    R2barn(g);
    function R2barn(g) { const r2 = U.RNG(77); barnClusters(g, r2, [[-2.6, -1.4, 1.2, 4, 0.5, 0.9]]); }
  });
  // mandible plate: pale serrated blade, pivot at its base (points along +x)
  P.mand = part(9, 6, 1.5, 3, (g) => {
    const path = (g) => { g.beginPath(); g.moveTo(-0.6, -1.1); g.quadraticCurveTo(3, -1.7, 6.4, 0.2); g.quadraticCurveTo(7, 0.9, 6.2, 1.5); g.quadraticCurveTo(3, 1.4, -0.6, 1.3); g.closePath(); };
    g.save(); path(g); g.clip(); g.fillStyle = lgrad(g, 0, -1.5, 0, 1.5, [[0, col(ML.bone, 1.1)], [1, col(ML.bone, 0.5)]]); g.fillRect(-1, -2, 9, 4);
    g.fillStyle = 'rgba(40,30,20,0.7)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(1.4 + i * 1.0, 1.4); g.lineTo(1.9 + i * 1.0, 0.3); g.lineTo(2.4 + i * 1.0, 1.4); g.fill(); }
    g.fillStyle = 'rgba(255,252,236,0.6)'; g.fillRect(0.4, -0.9, 4.6, 0.3); g.restore(); outline(g, path, 0.4);
  });
  // ---- eye stalk (tube along +x) and eye
  P.stalk = tube(9, 1.5, 1.15, [110, 124, 84], { seed: 61, hi: 1.2, tex: 0.34, bounce: 'rgba(160,200,110,0.2)', details: (g, R3) => { g.strokeStyle = 'rgba(20,28,14,0.4)'; g.lineWidth = 0.3; for (let x = 1.4; x < 8.4; x += 1.1) { g.beginPath(); g.moveTo(x, -1.4); g.lineTo(x + 0.3, 1.4); g.stroke(); } speckle(g, R3, 0, -1.5, 9, 1.5, 14, ['rgba(20,26,14,0.4)', 'rgba(200,230,150,0.22)'], 0.22, 0.5); } });
  P.stalkF = darkened(P.stalk, 0.66, '10,14,8');
  P.eye = part(10, 10, 5, 5, (g) => {
    const ep = (g) => { g.beginPath(); g.ellipse(0, 0, 2.7, 2.9, 0, 0, TAU); };
    g.save(); ep(g); g.clip();
    egrad(g, 0, 0, 3, 3.1, 0, [[0, 'rgb(255,226,110)'], [0.5, 'rgb(236,170,36)'], [0.85, 'rgb(170,96,20)'], [1, 'rgb(84,46,12)']], -0.3, -0.35, 0);
    g.fillStyle = 'rgba(30,10,4,0.4)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(R.range(-2.4, 2.4), R.range(-2.4, 2.4), 0.16, 0, TAU); g.fill(); }        // fine veining
    g.fillStyle = 'rgb(8,4,2)'; g.beginPath(); g.ellipse(0.5, 0.2, 1.75, 0.6, 0.05, 0, TAU); g.fill();                                               // horizontal slit pupil
    g.restore(); outline(g, ep, 0.5);
    g.fillStyle = 'rgba(255,255,244,0.95)'; g.beginPath(); g.ellipse(-0.9, -1.1, 0.75, 0.42, -0.6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,244,0.55)'; g.beginPath(); g.arc(1.4, 1.3, 0.28, 0, TAU); g.fill();
  });
  P.eyeF = darkened(P.eye, 0.68, '10,8,4');
  // ---- legs: chunky crab legs, plated with barnacles
  const mkLeg = (l1, l2, w, seed) => {
    const fem = tube(l1, w, w * 0.86, ML.shell, { seed, prof: (k) => w * (0.86 + 0.24 * sin(PI * (0.1 + 0.8 * k))), hi: 1.3, tex: 0.36, bounce: 'rgba(160,200,110,0.16)',
      details: (g, R3) => { mottle(g, 0, -w, l1, w, { c: [58, 120, 40], a: 0.4, f: 0.9, th: 0.5, soft: 0.2, seed: seed + 5, res: 7 }); barnClusters(g, R3, [[l1 * 0.5, -w * 0.3, 1.2, 2, 0.5, 0.85]]); g.fillStyle = 'rgba(14,20,12,0.5)'; g.fillRect(l1 * 0.5, -w, 0.6, w * 2); } });
    const tib = tube(l2, w * 0.86, 0.3, mixc(ML.shell, [70, 60, 44], 0.15), { seed: seed + 2, prof: (k) => lerp(w * 0.86, 0.32, Math.pow(k, 1.15)), hi: 1.3, tex: 0.36, spine: 0.8, spines: 3, spineDir: 0.5,
      details: (g, R3) => { mottle(g, 0, -w, l2, w, { c: [58, 120, 40], a: 0.4, f: 0.9, th: 0.5, soft: 0.2, seed: seed + 6, res: 7 }); barnClusters(g, R3, [[l2 * 0.32, -w * 0.3, 1, 2, 0.45, 0.8]]); } });
    return { fem, tib, femF: darkened(fem, 0.62, '10,14,8'), tibF: darkened(tib, 0.62, '10,14,8'), l1, l2 };
  };
  P.leg = mkLeg(6.4, 7.8, 3.5, 71);
  // ---- claws: shelled arm segments + big chela (palm, fixed finger) + movable finger
  const armSeg = (len, w0, w1, seed) => tube(len, w0, w1, ML.claw, { seed, prof: (k) => lerp(w0, w1, k) * (1 + 0.16 * sin(PI * k)), hi: 1.3, tex: 0.36, bounce: 'rgba(160,200,110,0.16)',
    details: (g, R3) => { mottle(g, 0, -w0, len, w0, { c: [58, 120, 40], a: 0.42, f: 0.7, th: 0.5, soft: 0.2, seed: seed + 5, res: 7 }); barnClusters(g, R3, [[len * 0.55, -w0 * 0.35, 1.3, 3, 0.5, 0.95]]); g.fillStyle = 'rgba(14,20,12,0.5)'; g.fillRect(len * 0.5, -w0, 0.6, w0 * 2); } });
  P.arm = [armSeg(9, 3.5, 3.1, 81), armSeg(8, 3.1, 2.8, 82)];
  P.armF = P.arm.map((a) => darkened(a, 0.72, '10,14,8'));
  const chPts = [[-2.6, -3.4], [1.8, -6.4], [8, -7], [12.8, -5], [14.4, -1.2], [18.6, 1.2], [23.6, 1.6], [25.4, 3.2], [23.4, 4.4], [17.6, 5.8], [11.4, 7.6], [4.6, 7.8], [-1.6, 5.4]];
  const chPath = (g) => blob(g, chPts);
  const clawBase = ML.claw;
  P.chela = part(30, 20, 4, 9, (g) => {
    g.save(); chPath(g); g.clip();
    g.fillStyle = lgrad(g, 0, -6.4, 0, 7.4, [[0, col(clawBase, 1.6)], [0.35, col(clawBase, 1.1)], [0.75, col(clawBase, 0.62)], [1, col(clawBase, 0.36)]]); g.fillRect(-4, -8, 30, 16);
    mottle(g, -3, -7, 24, 8, { c: [16, 22, 14], a: 0.5, f: 0.4, th: 0.5, soft: 0.24, seed: 91, res: 6 });
    mottle(g, -3, -7, 24, 8, { c: [58, 120, 40], a: 0.55, f: 0.45, th: 0.5, soft: 0.2, seed: 93, res: 6, fn: (x, y) => sstep(-3, 6, y) });
    mottle(g, -3, -7, 24, 8, { c: [190, 120, 70], a: 0.4, f: 0.6, th: 0.55, soft: 0.2, seed: 95, res: 6, fn: (x, y) => sstep(11, 20, x) });               // warm horn colour toward the finger
    overlay(g, -3, -7, 24, 8, { s: 0.3, a: 0.4, mode: 'soft-light', ox: 60, oy: 10 });
    g.strokeStyle = 'rgba(14,20,12,0.55)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(10, -5.6); g.quadraticCurveTo(11.4, 0, 10.4, 6.6); g.stroke();
    // serrated crushing edge on the fixed finger
    g.fillStyle = 'rgb(26,24,18)'; for (let i = 0; i < 8; i++) { const x = 15.6 + i * 1.15, y = 1.2 + (x - 15.6) * 0.06 - 0.3; g.beginPath(); g.moveTo(x, y + 0.3); g.lineTo(x + 0.6, y - 1.2); g.lineTo(x + 1.15, y + 0.5); g.fill(); }
    const r4 = U.RNG(99); barnClusters(g, r4, [[3, -2.6, 2.4, 6, 0.8, 1.5], [7, 2, 1.6, 3, 0.6, 1.1]]);
    egrad(g, 3, -4, 6, 2.4, 0, [[0, 'rgba(240,255,230,0.45)'], [1, 'rgba(240,255,230,0)']], 0, 0, 0);
    streak(g, 0, -5.4, 5, -7.2, 11, -6, 0.9, 'rgba(244,255,236,0.6)'); streak(g, 17, 3.8, 20.6, 4.9, 24, 4, 0.4, 'rgba(244,255,236,0.5)');
    g.fillStyle = lgrad(g, 0, 2, 0, 7, [[0, 'rgba(8,12,8,0)'], [1, 'rgba(8,12,8,0.5)']]); g.fillRect(-4, 2, 28, 6);
    g.restore();
    rim(g, chPath, 0, -6.4, 0, 0, 'rgba(226,255,200,0.65)', 'rgba(226,255,200,0)', 1.3); outline(g, chPath, 0.7);
    // horn-tinted finger tip
    g.save(); chPath(g); g.clip(); g.fillStyle = lgrad(g, 19, 0, 25, 0, [[0, 'rgba(216,168,104,0)'], [1, 'rgba(216,168,104,0.85)']]); g.fillRect(19, 0, 7, 6); g.restore();
  });
  const mvPts = [[-2, -3], [3.4, -4.6], [9.4, -4.2], [14.4, -2], [17.6, 1.4], [15.4, 2.4], [10.2, 1.6], [5, 3], [-2, 3.2]];
  const mvPath = (g) => blob(g, mvPts);
  P.mov = part(22, 12, 4, 6, (g) => {
    g.save(); mvPath(g); g.clip();
    g.fillStyle = lgrad(g, 0, -4, 0, 3.2, [[0, col(clawBase, 1.5)], [0.5, col(clawBase, 0.9)], [1, col(clawBase, 0.4)]]); g.fillRect(-3, -5, 21, 9);
    mottle(g, -2, -4, 17, 3.4, { c: [16, 22, 14], a: 0.5, f: 0.5, th: 0.5, soft: 0.24, seed: 101, res: 7 });
    mottle(g, -2, -4, 17, 3.4, { c: [58, 120, 40], a: 0.5, f: 0.6, th: 0.5, soft: 0.2, seed: 103, res: 7, fn: (x) => sstep(8, 0, x) });
    g.fillStyle = 'rgb(26,24,18)'; for (let i = 0; i < 7; i++) { const x = 5 + i * 1.5; g.beginPath(); g.moveTo(x, 2.2 - i * 0.06); g.lineTo(x + 0.7, 0.6); g.lineTo(x + 1.4, 2 - i * 0.06); g.fill(); }
    g.fillStyle = lgrad(g, 12, 0, 16.6, 0, [[0, 'rgba(216,168,104,0)'], [1, 'rgba(216,168,104,0.85)']]); g.fillRect(12, -3, 5, 6);
    streak(g, 0, -3.3, 6, -4.4, 13, -2, 0.7, 'rgba(244,255,236,0.6)');
    g.restore(); rim(g, mvPath, 0, -4, 0, 0, 'rgba(226,255,200,0.6)', 'rgba(226,255,200,0)', 1.1); outline(g, mvPath, 0.7);
  });
  P.chelaF = darkened(P.chela, 0.76, '10,14,8'); P.movF = darkened(P.mov, 0.76, '10,14,8');
  return P;
}

// ---- animation ------------------------------------------------------------------------------------------------
// pedipalp pose: [upper-arm heading, forearm heading, chela heading, opening]  (near claw, far claw)
const ML_CLAW = {
  guard: { n: [0.12, -1.15, -1.38, 0.35], f: [0.42, -0.12, -0.2, 0.62] },
  wind: { n: [-1.2, -2.1, -2.5, 1.0], f: [-0.9, -1.9, -2.2, 1.0] },
  hit: { n: [0.15, 0.45, 0.55, 0.05], f: [0.35, 0.2, 0.25, 0.1] },
  dead: { n: [1.25, 0.7, 0.5, 0.3], f: [1.3, 0.9, 0.7, 0.25] },
};
const ML_LEGS = [   // hip, rest foot x, trot group, knee direction
  { hx: -13, hy: -13.2, fx: -16, g: 0, far: false, knee: 'back' }, { hx: 4.6, hy: -13.4, fx: 10, g: 1, far: false, knee: 'fwd' },
  { hx: -9, hy: -13.6, fx: -10.5, g: 1, far: true, knee: 'back' }, { hx: 9, hy: -13.8, fx: 15, g: 0, far: true, knee: 'fwd' },
];

function drawMire(ctx, e, G, flashOnly) {
  const P = cached('mire', buildMire), t = e.t || 0, f = e.face < 0 ? -1 : 1, k = e.scale || 1;
  const dead = !!(e.dead || e.state === 'dead'), st = e.state, ac = atkCurve(e), A0 = ctx.globalAlpha, def = e.def || {};
  const air = !e.onGround && !dead, spd = abs(e.vx || 0), mv = dead || air ? 0 : sstep(12, 30, spd), chase = sstep(50, 85, spd);
  const stride = def.stride || 0.09, duty = 0.6, A = 6.5, fq = PI * duty / (stride * A), ph = (e.phase || 0) * fq;
  ctx.save();
  ctx.translate(e.cx, e.y + e.h + (dead ? deadDrop(e, 39) : 0)); ctx.scale(f * k, k);
  beginDraw(ctx, k);
  let lunge = 0, bob = 0, rock = 0, mouth = 0.15;
  if (!dead) {
    bob = -abs(sin(ph)) * 0.8 * mv + sin(t * 1.9) * 0.2 * (1 - mv);
    rock = sin(ph) * 0.02 * mv;
    mouth = 0.12 + 0.1 * sin(t * 5.5) * (1 - mv) + chase * 0.2;
    if (st === 'windup') { lunge = -2 * ac.w; rock = -0.05 * ac.w; mouth = 0.5 + 0.3 * ac.w; bob += 0.6 * ac.w; }
    else if (st === 'attack') { lunge = lerp(-2, 6, eo(ac.s)) * (1 - ac.r); rock = lerp(-0.05, 0.05, ac.s) * (1 - ac.r); mouth = lerp(0.8, 1.0, ac.s) * (1 - ac.r * 0.8); }
  } else mouth = 0.4;
  const RZ = 0;
  ctx.translate(lunge - 0, bob + RZ);
  // rock the whole upper body around the feet centre
  if (rock) { ctx.translate(-2, 0); ctx.rotate(rock); ctx.translate(2, 0); }

  // ---- leg targets (body space; the body bobs, feet stay put) -------------------------------------------------
  const drawLeg = (L, far) => {
    let fx = L.fx, fy = 0;
    if (dead) { fx = L.hx + (L.hx > 0 ? 3.2 : -3.2) + (far ? 1.5 : -1); fy = -5.6 - (far ? 1 : 0); }
    else if (air) { fx = L.fx + (L.hx > 0 ? 3 : -3); fy = -4; }
    else {
      const g0 = gait(ph / TAU + (L.g ? 0.5 : 0), duty, A, 4.2);
      fx += g0[0] * mv; fy = g0[1] * mv - bob * 0;
      if (st === 'windup' || st === 'attack') fx += (L.hx > 0 ? 1.5 : -1.5) * (st === 'windup' ? ac.w : (1 - ac.r));      // braced stance
    }
    const S = P.leg, [kx, ky, ex, ey] = ik2(L.hx, L.hy, fx, fy - bob, S.l1, S.l2, L.knee);
    seg(ctx, far ? S.femF : S.fem, L.hx, L.hy, kx, ky); seg(ctx, far ? S.tibF : S.tib, kx, ky, ex, ey);
  };
  drawLeg(ML_LEGS[2], true); drawLeg(ML_LEGS[3], true);

  // ---- claw poses ---------------------------------------------------------------------------------------------
  const mix4 = (a, b, w) => [lerp(a[0], b[0], w), lerp(a[1], b[1], w), lerp(a[2], b[2], w), lerp(a[3], b[3], w)];
  let cn, cf;
  const sw = sin(t * 1.7) * 0.05, snap = st === 'chase' ? sin(t * 9) * 0.08 : sin(t * 2.2) * 0.04;
  const gN = [ML_CLAW.guard.n[0] + sw, ML_CLAW.guard.n[1] + sw * 0.6, ML_CLAW.guard.n[2] + sw * 0.5, ML_CLAW.guard.n[3] + snap + 0.1 * chase];
  const gF = [ML_CLAW.guard.f[0] - sw, ML_CLAW.guard.f[1] + sw * 0.5, ML_CLAW.guard.f[2] - sw * 0.5, ML_CLAW.guard.f[3] + snap];
  if (dead) { cn = ML_CLAW.dead.n; cf = ML_CLAW.dead.f; }
  else if (st === 'windup') { const w = eio(ac.w); cn = mix4(gN, ML_CLAW.wind.n, w); cf = mix4(gF, ML_CLAW.wind.f, w); }
  else if (st === 'attack') {
    if (ac.s < 1) { const w = eo(ac.s); cn = mix4(ML_CLAW.wind.n, ML_CLAW.hit.n, w); cf = mix4(ML_CLAW.wind.f, ML_CLAW.hit.f, w); }
    else { const w = eio(ac.r); cn = mix4(ML_CLAW.hit.n, gN, w); cf = mix4(ML_CLAW.hit.f, gF, w); }
  } else { cn = gN; cf = gF; }
  const drawClaw = (far) => {
    const p = far ? cf : cn, sx = far ? 8.4 : 10.2, sy = far ? -22.6 : -21.2;
    const ex = sx + cos(p[0]) * 9, ey = sy + sin(p[0]) * 9, wx = ex + cos(p[1]) * 8, wy = ey + sin(p[1]) * 8;
    seg(ctx, far ? P.armF[0] : P.arm[0], sx, sy, ex, ey); seg(ctx, far ? P.armF[1] : P.arm[1], ex, ey, wx, wy);
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(p[2]); ctx.scale(0.8, 0.8);
    ctx.save(); ctx.translate(9.4, -4.2); ctx.rotate(0.7 - clamp(p[3], 0, 1.15)); blit(ctx, far ? P.movF : P.mov); ctx.restore();
    blit(ctx, far ? P.chelaF : P.chela);
    ctx.restore();
  };
  // ---- eye stalks -----------------------------------------------------------------------------------------------
  const drawEye = (far) => {
    const bx = far ? 8.6 : 11.2, by = far ? -19.6 : -19;
    const a = (dead ? 0.2 : -1.5 + sin(t * 2.3 + (far ? 1.4 : 0)) * 0.14 + sin(t * 5.1 + (far ? 2 : 0)) * 0.04 - (st === 'windup' ? 0.15 * ac.w : 0) + (st === 'attack' ? 0.25 * (1 - ac.r) : 0));
    const len = dead ? 6 : 10.4, ex = bx + cos(a) * len, ey = by + sin(a) * len;
    seg(ctx, far ? P.stalkF : P.stalk, bx, by, ex, ey, len / 9);
    ctx.save(); ctx.translate(ex + cos(a) * 1.4, ey + sin(a) * 1.4); blit(ctx, far ? P.eyeF : P.eye); ctx.restore();
  };
  drawEye(true);
  drawClaw(true);

  // ---- body: underbody, near legs, head, shell ------------------------------------------------------------------
  blit(ctx, P.flesh);
  drawLeg(ML_LEGS[0], false); drawLeg(ML_LEGS[1], false);
  ctx.save(); ctx.translate(15.4, -14.2); ctx.scale(1.2, 1.2); ctx.rotate(dead ? 0.22 : sin(t * 1.4) * 0.03 + (st === 'attack' ? 0.08 * (1 - ac.r) : 0));
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(5.6, 3.1 + s * 0.2); ctx.rotate(s * (0.14 + mouth * 0.55)); blit(ctx, P.mand); ctx.restore(); }
  blit(ctx, P.head); ctx.restore();
  ctx.save(); ctx.translate(0, -12.5); const br = 1 + sin(t * 1.9) * 0.008; ctx.scale(1, br); ctx.translate(0, 12.5); blit(ctx, P.shell); ctx.restore();
  drawEye(false);
  drawClaw(false);
  ctx.restore();
}

CD.art.mirelurk = drawMire;
// DEV-ONLY: exposes internals for the part viewer (excluded from the final build)
CD.art.__dev = { parts: (n) => cached({ roach: 'roach', fly: 'fly', mole: 'mole', scorp: 'scorp', mire: 'mire' }[n], () => ({ roach: typeof buildRoach !== 'undefined' && buildRoach, fly: typeof buildFly !== 'undefined' && buildFly, mole: typeof buildMole !== 'undefined' && buildMole, scorp: typeof buildScorp !== 'undefined' && buildScorp, mire: typeof buildMire !== 'undefined' && buildMire })[n]()) };
})();
