/* Drawing helpers for the LEV explainer. Everything is a pure function of the clock t (seconds). */
'use strict';
const W = 1920, H = 1080, M = 96;
const C = {
  bg: '#0D161B', panel: '#131F26', panel2: '#1A2A33', fg: '#E3ECF0', mut: '#A0B2BC', faint: '#6F8592',
  rule: '#2A3B44', grid: '#16242C', teal: '#62C2E0', tealD: '#2E6E85', tealL: '#8CD5EA',
  amber: '#E8C069', amberD: '#7A5F1E', green: '#7FD3A4', violet: '#C4A6EE', red: '#F08A7E', blue: '#8DB8F0'
};
const FS = '"Source Sans 3","Helvetica Neue",Arial,sans-serif';
const FR = '"Source Serif 4",Georgia,serif';
const CHIPS = {
  est: ['#7FD3A4', '#14382A', 'ESTABLISHED'], sup: ['#8DB8F0', '#172E4D', 'SUPPORTED'], con: ['#E8C069', '#3A2D10', 'CONTESTED'],
  spe: ['#C4A6EE', '#2B1F44', 'SPECULATIVE'], jud: ['#B5C2CB', '#24313A', 'AUTHOR JUDGMENT'], pre: ['#F1B67A', '#43290F', 'PRELIMINARY']
};

const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = {
  io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  out: (u) => 1 - Math.pow(1 - u, 3),
  out5: (u) => 1 - Math.pow(1 - u, 5),
  lin: (u) => u,
  inq: (u) => u * u
};

let ctx = null, LT = 0, SC = null;       // drawing context, local scene time, current scene
const setCtx = (c) => { ctx = c; };
const setTime = (lt, sc) => { LT = lt; SC = sc; };
/** progress 0..1 of a segment that starts at local time t0 and lasts d */
const pr = (t0, d = 0.6, fn = ease.io) => fn(cl((LT - t0) / d));
/** segment helpers from the narration timeline: start / end of narration segment i in local time */
const segT0 = (i, off = 0) => SC.seg[i].t0 + off;
const segT1 = (i, off = 0) => SC.seg[i].t1 + off;
const segAt = (i, frac) => lerp(SC.seg[i].t0, SC.seg[i].t1, frac);

const fnt = (size, weight = 400, fam = FS, italic = false) => `${italic ? 'italic ' : ''}${weight} ${size}px ${fam}`;

/** text with optional entrance: o.at = local start time (undefined = always visible) */
function text(s, x, y, o = {}) {
  const size = o.size || 32, weight = o.weight || 400, fam = o.fam || FS;
  const u = o.at === undefined ? 1 : pr(o.at, o.dur || 0.5, ease.out);
  const out = o.until === undefined ? 1 : 1 - pr(o.until, 0.4, ease.io);
  const a = u * out * (o.alpha === undefined ? 1 : o.alpha);
  if (a <= 0.003) return 0;
  ctx.save();
  ctx.globalAlpha *= a;
  let sz = size;
  ctx.font = fnt(sz, weight, fam, o.italic);
  ctx.letterSpacing = (o.ls || 0) + 'px';
  if (o.maxW) { const w = ctx.measureText(s).width; if (w > o.maxW) { sz = size * o.maxW / w; ctx.font = fnt(sz, weight, fam, o.italic); } }
  ctx.fillStyle = o.color || C.fg;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  ctx.fillText(s, x, y + (1 - u) * (o.rise === undefined ? 14 : o.rise));
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}
function measure(s, size, weight = 400, fam = FS, ls = 0) {
  ctx.save(); ctx.font = fnt(size, weight, fam); ctx.letterSpacing = ls + 'px';
  const w = ctx.measureText(s).width; ctx.restore(); return w;
}
function wrap(s, maxW, size, weight = 400, fam = FS) {
  ctx.save(); ctx.font = fnt(size, weight, fam);
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  ctx.restore(); return lines;
}
/** wrapped paragraph; returns the y after the last line */
/** wrap to the fewest lines that fit maxW, then narrow the measure so the lines come out balanced */
function wrapBalanced(s, maxW, size, weight = 400, fam = FS) {
  const base = wrap(s, maxW, size, weight, fam);
  if (base.length < 2) return base;
  let lo = maxW / base.length * 0.9, hi = maxW, best = base;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2, w = wrap(s, mid, size, weight, fam); if (w.length <= base.length) { best = w; hi = mid; } else lo = mid; }
  return best;
}
function para(s, x, y, maxW, o = {}) {
  const size = o.size || 32, lh = o.lh || Math.round(size * 1.32);
  const lines = wrap(s, maxW, size, o.weight || 400, o.fam || FS);
  lines.forEach((ln, i) => text(ln, x, y + i * lh, Object.assign({}, o, { at: o.at === undefined ? undefined : o.at + i * (o.stagger || 0.08) })));
  return y + lines.length * lh;
}
function rrectPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function box(x, y, w, h, o = {}) {
  const u = o.at === undefined ? 1 : pr(o.at, o.dur || 0.5, ease.out);
  if (u <= 0.003) return;
  ctx.save(); ctx.globalAlpha *= u * (o.alpha === undefined ? 1 : o.alpha);
  rrectPath(x, y, w, h, o.r === undefined ? 10 : o.r);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.stroke) { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
  ctx.restore();
}
/** semantic evidence-label chip (same labels and colours as the report); returns its width */
function chip(kind, x, y, o = {}) {
  const [fg, bg, label0] = CHIPS[kind]; const label = o.label || label0; const size = o.size || 22;
  const u = o.at === undefined ? 1 : pr(o.at, 0.5, ease.out);
  if (u <= 0.003) return 0;
  ctx.save(); ctx.font = fnt(size, 700, FS); ctx.letterSpacing = '1.6px';
  const tw = ctx.measureText(label).width, w = tw + size * 1.2, h = size * 1.75;
  const ax = o.align === 'right' ? x - w : x;
  ctx.globalAlpha *= u;
  rrectPath(ax, y - h * 0.78, w, h, 6); ctx.fillStyle = bg; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = fg; ctx.globalAlpha *= 0.7; if (kind === 'jud') ctx.setLineDash([6, 4]); ctx.stroke();
  ctx.globalAlpha /= 0.7; ctx.setLineDash([]);
  ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(label, ax + size * 0.6, y);
  ctx.restore(); return w;
}
function line(x1, y1, x2, y2, color, lw = 2, dash = null, alpha = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.globalAlpha *= alpha; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
function dot(x, y, r, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
/** polyline through pts [[x,y],...], drawn from the start up to fraction u of its length */
function polyline(pts, u, color, lw = 5, alpha = 1, dash = null) {
  if (u <= 0 || pts.length < 2) return;
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let left = total * cl(u);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.globalAlpha *= alpha;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const l = seg[i - 1];
    if (left >= l) { ctx.lineTo(pts[i][0], pts[i][1]); left -= l; }
    else { const f = left / l; ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); left = 0; }
  }
  ctx.stroke(); ctx.restore();
}
/** position at fraction u along a polyline */
function along(pts, u) {
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let left = total * cl(u);
  for (let i = 1; i < pts.length; i++) { if (left <= seg[i - 1]) { const f = seg[i - 1] ? left / seg[i - 1] : 0; return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; } left -= seg[i - 1]; }
  return pts[pts.length - 1];
}
function arrow(x1, y1, x2, y2, color, lw = 3, head = 14, alpha = 1) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  line(x1, y1, x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6, color, lw, null, alpha);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x2, y2); ctx.lineTo(x2 - head * Math.cos(a - 0.42), y2 - head * Math.sin(a - 0.42)); ctx.lineTo(x2 - head * Math.cos(a + 0.42), y2 - head * Math.sin(a + 0.42));
  ctx.closePath(); ctx.fill(); ctx.restore();
}
/** linear scale */
const scale = (d0, d1, r0, r1) => (v) => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
const fmt = (v, d = 1) => v.toFixed(d);

/* ------------------------------------------------------------------ persistent background */
let BG = null;
function makeBackground() {
  BG = document.createElement('canvas'); BG.width = W; BG.height = H;
  const g = BG.getContext('2d');
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = C.grid; g.lineWidth = 1;
  const s = 60;
  for (let x = 0; x <= W; x += s) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
  for (let y = 0; y <= H; y += s) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
  // diagonals through grid corners: lifelines of the Lexis diagram
  g.strokeStyle = 'rgba(30,48,58,0.55)';
  for (let k = -H; k <= W; k += s) { g.beginPath(); g.moveTo(k, H); g.lineTo(k + H, 0); g.stroke(); }
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(13,22,27,0)'); v.addColorStop(1, 'rgba(13,22,27,0.75)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}
