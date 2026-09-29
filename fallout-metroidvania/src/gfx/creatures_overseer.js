// OVERSEER PRIME (the Cinder Deep final boss): a floating Vault-Tec war-frame - armoured hull, a glass dome holding the vault's
// brain-in-a-jar, a camera eye whose colour follows its temper, two cable arms with tesla emitters, missile pods and a drone bay.
// CD.art.overseer = function (ctx, e, G, flashOnly).   Local space is right-facing with the origin at the hitbox centre; mirrored by e.face.
// Reads: e.cx e.cy e.face e.t e.vx e.vy e.state e.atkK e.dead e.deadT e.bs.{mood, shield, open}.
//   states: idle | windup | beam | summon | slam | overload | dead        mood 0 = calm (cyan) .. 0.55 = stern (amber) .. 1 = furious (red)
// The hit-flash pass (flashOnly) re-draws the same shapes additively, so every emissive extra is skipped in that pass.
(function () {
'use strict';
const CD = window.CD, U = CD.U;
CD.art = CD.art || {};
const PI = Math.PI, TAU = PI * 2, sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, atan2 = Math.atan2, hypot = Math.hypot, sqrt = Math.sqrt;
const clamp = U.clamp;
const c01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const eio = (t) => t * t * (3 - 2 * t);
const nz = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sh = (c, k) => (k <= 1 ? [c[0] * k, c[1] * k, c[2] * k] : [c[0] + (255 - c[0]) * (k - 1), c[1] + (255 - c[1]) * (k - 1), c[2] + (255 - c[2]) * (k - 1)]);
const rgb = (c, a) => (a === undefined ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')');
const moodCol = (m) => (m < 0.55 ? mix([120, 240, 255], [255, 196, 72], m / 0.55) : mix([255, 196, 72], [255, 70, 48], (m - 0.55) / 0.45));
const HULL = [38, 84, 168], TRIM = [238, 198, 54], STEEL = [72, 80, 92], DARK = [22, 26, 32];
const LX = 0.5, LY = -0.86;                      // toward the sun (upper right)
let FO = false;                                  // true during the additive hit-flash pass

// ---------------------------------------------------------------- baked brain (pink folds, fissure, cerebellum, stem)
let BRAIN = null; const BW = 80, BH = 62, BSS = 3;
function bakeBrain() {
  const c = U.canvas(BW * BSS, BH * BSS), g = c.getContext('2d'); g.scale(BSS, BSS); g.translate(BW / 2, BH / 2 - 3);
  const rng = U.RNG(2077);
  const sil = () => { g.beginPath(); for (const [x, y, rx, ry] of [[0, -4, 30, 21], [17, 3, 17, 14], [-13, -2, 19, 16], [5, 10, 19, 10], [-22, 13, 13, 9]]) { g.moveTo(x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, TAU); } g.moveTo(-3, 12); g.lineTo(6, 12); g.lineTo(4, 27); g.lineTo(-2, 27); g.closePath(); };
  sil(); const gr = g.createRadialGradient(10, -14, 3, 0, 0, 40); gr.addColorStop(0, 'rgb(246,196,204)'); gr.addColorStop(0.55, 'rgb(214,150,164)'); gr.addColorStop(1, 'rgb(150,90,112)'); g.fillStyle = gr; g.fill();
  g.save(); sil(); g.clip();
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 26; i++) {                                    // sulci: meandering dark grooves with a lit lip beside each
    let x = rng.range(-34, 34), y = rng.range(-22, 22), a = rng.range(0, TAU); g.beginPath(); g.moveTo(x, y); const pts = [[x, y]];
    for (let k = 0; k < 5; k++) { a += rng.range(-1.1, 1.1); x += cos(a) * rng.range(4, 8); y += sin(a) * rng.range(3, 6); g.lineTo(x, y); pts.push([x, y]); }
    g.strokeStyle = 'rgba(112,52,76,0.7)'; g.lineWidth = rng.range(1, 1.8); g.stroke();
    g.beginPath(); g.moveTo(pts[0][0] + 0.9, pts[0][1] - 0.9); for (let k = 1; k < pts.length; k++) g.lineTo(pts[k][0] + 0.9, pts[k][1] - 0.9); g.strokeStyle = 'rgba(255,226,232,0.4)'; g.lineWidth = 0.7; g.stroke();
  }
  g.strokeStyle = 'rgba(88,36,58,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-1, -25); g.bezierCurveTo(4, -12, -4, -2, 2, 12); g.stroke();   // longitudinal fissure
  g.strokeStyle = 'rgba(96,50,70,0.6)'; g.lineWidth = 0.8; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(-22, 13, 12 - i * 0.6, 8, 0, PI * 0.1, PI * 0.9); g.stroke(); g.translate(0, 1.5); } g.translate(0, -9);
  const sd = g.createLinearGradient(-30, 16, 26, -22); sd.addColorStop(0, 'rgba(60,20,40,0.5)'); sd.addColorStop(0.5, 'rgba(0,0,0,0)'); sd.addColorStop(1, 'rgba(255,240,240,0.24)'); g.fillStyle = sd; g.fillRect(-40, -30, 80, 66);
  g.restore(); return c;
}

// ---------------------------------------------------------------- shape helpers
function hullPath(g) {
  g.beginPath(); g.moveTo(-42, -6); g.bezierCurveTo(-61, 4, -62, 32, -44, 47); g.bezierCurveTo(-30, 60, -14, 66, 0, 66); g.bezierCurveTo(14, 66, 30, 60, 44, 47); g.bezierCurveTo(62, 32, 61, 4, 42, -6); g.closePath();
}
function ball(g, x, y, r, base) {
  const gr = g.createRadialGradient(x + r * 0.3, y - r * 0.4, r * 0.1, x, y, r * 1.05); gr.addColorStop(0, rgb(sh(base, 1.7))); gr.addColorStop(0.5, rgb(base)); gr.addColorStop(1, rgb(sh(base, 0.35)));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function seg(g, x0, y0, x1, y1, w0, w1, base) {   // tapered cable/hydraulic segment, shaded across its normal, ribbed
  const dx = x1 - x0, dy = y1 - y0, len = hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, lit = nx * LX + ny * LY >= 0 ? 1 : -1;
  const gr = g.createLinearGradient(x0 - nx * w0 * 0.5, y0 - ny * w0 * 0.5, x0 + nx * w0 * 0.5, y0 + ny * w0 * 0.5);
  const A = lit > 0 ? [0.4, 0.95, 1.55, 0.7] : [0.7, 1.55, 0.95, 0.4];
  gr.addColorStop(0, rgb(sh(base, A[0]))); gr.addColorStop(0.35, rgb(sh(base, A[1]))); gr.addColorStop(0.7, rgb(sh(base, A[2]))); gr.addColorStop(1, rgb(sh(base, A[3])));
  g.fillStyle = gr; g.beginPath(); g.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); g.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); g.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); g.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.42)'; g.lineWidth = 1.3; const n = Math.max(2, (len / 8) | 0);
  for (let i = 1; i < n; i++) { const k = i / n, w = (w0 + (w1 - w0) * k) / 2, px = x0 + dx * k, py = y0 + dy * k; g.beginPath(); g.moveTo(px - nx * w, py - ny * w); g.lineTo(px + nx * w, py + ny * w); g.stroke(); }
  g.strokeStyle = 'rgba(255,244,220,0.3)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x0 + lit * nx * w0 * 0.32, y0 + lit * ny * w0 * 0.32); g.lineTo(x1 + lit * nx * w1 * 0.32, y1 + lit * ny * w1 * 0.32); g.stroke();
}
function glow(g, x, y, r, col, a) { if (FO || a <= 0.01) return; g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgb(col, a)); gr.addColorStop(0.4, rgb(col, a * 0.4)); gr.addColorStop(1, rgb(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
function arc(g, x0, y0, x1, y1, seed, col, a, w) {   // one crackling bolt
  if (FO) return; const r = U.RNG(seed | 0), n = 8, dx = x1 - x0, dy = y1 - y0, len = hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x0, y0);
  for (let i = 1; i < n; i++) { const k = i / n, o = (r.next() - 0.5) * len * 0.2 * sin(k * PI); g.lineTo(x0 + dx * k + nx * o, y0 + dy * k + ny * o); } g.lineTo(x1, y1);
  g.strokeStyle = rgb(col, a * 0.45); g.lineWidth = w * 3.2; g.stroke(); g.strokeStyle = 'rgba(255,255,255,' + a + ')'; g.lineWidth = w; g.stroke(); g.restore();
}

// ---------------------------------------------------------------- arms
function armPose(st, atk, t, side, dead) {          // hand offset from the shoulder for the arm on +x (side = 1) / -x (side = -1)
  let dx, dy; const sw = sin(t * 1.3 + (side > 0 ? 0 : 1.9));
  if (dead) { dx = 14; dy = 76; }
  else if (st === 'windup') { const k = eio(atk); dx = 28 + 26 * k; dy = 42 - 108 * k; }
  else if (st === 'beam') { dx = 58 + sin(t * 31) * 1.4; dy = -70 + cos(t * 27) * 1.4; }
  else if (st === 'summon') { dx = 62 + 12 * atk; dy = 14 - 10 * atk; }
  else if (st === 'slam') { dx = 10; dy = 46; }
  else if (st === 'overload') { dx = 10 + sin(t * 9 + side) * 3; dy = 76 + sin(t * 7) * 2; }
  else { dx = 26 + sw * 5; dy = 58 + abs(sw) * 4; }
  return [dx * side, dy];
}
function drawArm(g, side, st, atk, t, K, mc, chg, dead, seed) {
  const sx = side * 44, sy = -3, l1 = 46, l2 = 50, base = sh(STEEL, K);
  let [tx, ty] = armPose(st, atk, t, side, dead); let d = hypot(tx, ty);
  if (d > l1 + l2 - 1) { tx *= (l1 + l2 - 1) / d; ty *= (l1 + l2 - 1) / d; d = l1 + l2 - 1; }
  if (d < 22) { tx *= 22 / (d || 1); ty = ty || 22; d = 22; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), hh = sqrt(max(0, l1 * l1 - a * a)), ux = tx / d, uy = ty / d;
  let px = -uy, py = ux; if (px * side + py * 0.6 < 0) { px = -px; py = -py; }
  const ex = sx + ux * a + px * hh, ey = sy + uy * a + py * hh, hx = sx + tx, hy = sy + ty;
  g.save();
  g.strokeStyle = 'rgba(14,16,20,0.9)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(sx + side * 4, sy - 7); g.lineTo(ex + px * 8, ey + py * 8 - 2); g.stroke();      // hydraulic rod along the upper arm
  seg(g, sx, sy, ex, ey, 15, 11, base); seg(g, ex, ey, hx, hy, 11, 8, sh(base, 0.9));
  ball(g, sx, sy, 11, sh(STEEL, 0.9 * K)); g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(sx, sy, 4, 0, TAU); g.fill(); ball(g, ex, ey, 8, sh(STEEL, 1.05 * K));
  // tesla emitter on the hand, pointing along the forearm
  const ang = atan2(hy - ey, hx - ex); g.translate(hx, hy); g.rotate(ang);
  g.fillStyle = rgb(sh(DARK, 1.8 * K)); g.fillRect(-4, -8, 10, 16); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-4, -8, 10, 1.6);
  for (let i = 0; i < 3; i++) { const r = 7 - i * 1.5; g.fillStyle = rgb(sh(STEEL, (1.3 - i * 0.2) * K)); g.beginPath(); g.ellipse(7 + i * 5, 0, 2.4, r, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.8; g.stroke(); }
  const tipC = dead ? [50, 56, 58] : mix([60, 80, 90], mc, c01(chg)); ball(g, 25, 0, 6.4, tipC);
  g.restore();
  return { hx, hy, ang };
}
function tipGlow(g, side, st, atk, t, mc, chg, dead) {     // additive glow + arcs at the emitter tip (drawn after the arm, in body space)
  if (FO || dead) return; const [tx, ty] = armPose(st, atk, t, side, false); const d = hypot(tx, ty) || 1, k = min(1, (96 - 1) / d), hx = side * 44 + tx * k, hy = -3 + ty * k;
  glow(g, hx, hy, 18 + 26 * chg, mc, 0.25 + 0.6 * chg);
}

// ---------------------------------------------------------------- hex energy shield
function shield(g, k, t, mc) {
  if (FO || k <= 0.02) return; const R = 88; g.save(); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(0, 0, R * 0.55, 0, 0, R); gr.addColorStop(0, rgb(mc, 0)); gr.addColorStop(0.85, rgb(mc, 0.1 * k)); gr.addColorStop(1, rgb(mc, 0.5 * k)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, 0, R - 1, 0, TAU); g.clip(); g.lineWidth = 0.9; const hs = 11, hw = hs * 1.5, hh = hs * 0.866 * 2;
  for (let j = -9; j <= 9; j++) for (let i = -8; i <= 8; i++) {
    const cx = i * hw, cy = j * hh + (i & 1 ? hh / 2 : 0); if (cx * cx + cy * cy > (R + 12) * (R + 12)) continue;
    const a = 0.1 + 0.5 * max(0, sin(t * 2.6 + i * 0.9 + j * 1.3)) * (0.5 + 0.5 * (hypot(cx, cy) / R));
    g.strokeStyle = rgb(mc, a * k); g.beginPath(); for (let s = 0; s < 6; s++) { const an = s * PI / 3; g.lineTo(cx + cos(an) * hs * 0.94, cy + sin(an) * hs * 0.94); } g.closePath(); g.stroke();
  }
  g.restore(); g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgb(mc, 0.55 * k); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); g.restore();
}

// ---------------------------------------------------------------- the boss
function drawOverseer(g, e, G, flashOnly) {
  FO = !!flashOnly; if (!BRAIN) BRAIN = bakeBrain();
  const st = e.state || 'idle', face = e.face < 0 ? -1 : 1, t = nz(e.t, 0), bs = e.bs || {};
  const atk = c01(nz(e.atkK, 0)), mood = c01(nz(bs.mood, 0)), shd = c01(nz(bs.shield, 0)), open = st === 'overload' ? max(c01(nz(bs.open, 0)), 0) : 0;
  const dead = !!e.dead || st === 'dead', dT = nz(e.deadT, 0), K = dead ? 0.5 : 1;
  const mc = dead ? [80, 90, 90] : moodCol(mood);
  const chg = dead ? 0 : st === 'beam' ? 1 : st === 'windup' ? atk : st === 'summon' ? 0.45 : st === 'slam' ? 0.2 : st === 'overload' ? 0.6 : 0.22 + 0.1 * mood;
  const bob = dead ? 0 : sin(t * 1.7) * 3, vx = nz(e.vx, 0);
  const lean = dead ? 0.12 : st === 'slam' ? 0.34 : clamp(vx / 800, -0.13, 0.13);
  const jit = st === 'beam' || st === 'overload' ? (sin(t * 91) * 0.8) : 0;
  g.save(); g.translate(nz(e.cx, 0) + jit, nz(e.cy, 0) + bob); g.rotate(lean); g.scale(face, 1);

  // --- thrusters / anti-grav glow (behind the hull)
  if (!dead) {
    const fl = st === 'slam' ? 1 : 0.42 + 0.1 * sin(t * 38), len = 14 + 34 * fl + 6 * sin(t * 45);
    for (const [fx, fw] of [[-32, 5], [0, 8], [32, 5]]) glow(g, fx, 66 + len * 0.4, len * 0.9, [120, 210, 255], 0.5 * (fx ? 0.7 : 1));
    if (!FO) { g.save(); g.globalCompositeOperation = 'lighter'; for (const [fx, fw] of [[-32, 5], [0, 8], [32, 5]]) { const gr = g.createLinearGradient(0, 64, 0, 64 + len * (fx ? 0.75 : 1)); gr.addColorStop(0, 'rgba(220,245,255,0.85)'); gr.addColorStop(0.35, 'rgba(90,180,255,0.4)'); gr.addColorStop(1, 'rgba(60,120,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(fx - fw, 64); g.lineTo(fx + fw, 64); g.lineTo(fx + fw * 0.3, 64 + len * (fx ? 0.75 : 1)); g.lineTo(fx - fw * 0.3, 64 + len * (fx ? 0.75 : 1)); g.closePath(); g.fill(); } g.restore(); }
  }
  // --- rear arm + rear pod (behind the hull)
  const podOpen = st === 'windup' ? eio(min(1, atk * 1.6)) : 0;
  const pod = (side, front) => {
    const x = side * 52, y = 15; g.save(); g.translate(x, y);
    g.fillStyle = rgb(sh(STEEL, (front ? 1.0 : 0.72) * K)); g.beginPath(); g.moveTo(-10, -13); g.lineTo(10, -13); g.lineTo(11, 14); g.lineTo(-11, 14); g.closePath(); g.fill();
    const gr = g.createLinearGradient(-11, 0, 11, 0); gr.addColorStop(0, 'rgba(0,0,0,0.4)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = gr; g.fillRect(-11, -13, 22, 27);
    g.fillStyle = '#0a0c10'; g.fillRect(-7, -10, 14, 20);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const mx = -3.6 + j * 7.2, my = -6 + i * 6.6; g.fillStyle = 'rgb(' + (dead ? 70 : 170) + ',' + (dead ? 60 : 44) + ',' + (dead ? 56 : 40) + ')'; g.beginPath(); g.arc(mx, my, 2.3, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(mx - 1, my - 1.6, 1, 1); }
    g.save(); g.translate(0, -13); g.rotate(-side * podOpen * 1.2); g.fillStyle = rgb(sh(HULL, (front ? 1.2 : 0.8) * K)); g.fillRect(side > 0 ? -1 : -11, -3, 12, 4); g.fillStyle = rgb(TRIM, 0.85 * K); g.fillRect(side > 0 ? -1 : -11, -3, 12, 1.2); g.restore();
    g.fillStyle = 'rgba(255,240,200,0.25)'; g.fillRect(-11, -13, 22, 1.2); g.restore();
    if (podOpen > 0.5 && !dead) glow(g, x, y - 4, 16, [255, 140, 70], 0.4 * podOpen);
  };
  drawArm(g, -1, st, atk, t, K * 0.62, mc, chg, dead, 1); pod(-1, false);

  // --- hull
  g.save(); hullPath(g); g.clip();
  let gr = g.createLinearGradient(-62, 0, 62, 0); gr.addColorStop(0, rgb(sh(HULL, 0.42 * K))); gr.addColorStop(0.32, rgb(sh(HULL, 0.9 * K))); gr.addColorStop(0.7, rgb(sh(HULL, 1.32 * K))); gr.addColorStop(1, rgb(sh(HULL, 0.62 * K)));
  g.fillStyle = gr; g.fillRect(-64, -8, 128, 76);
  gr = g.createLinearGradient(0, -6, 0, 66); gr.addColorStop(0, 'rgba(255,255,255,0.24)'); gr.addColorStop(0.28, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(0,0,16,0.22)'); gr.addColorStop(1, 'rgba(0,0,10,0.62)'); g.fillStyle = gr; g.fillRect(-64, -8, 128, 76);
  g.strokeStyle = 'rgba(0,0,20,0.5)'; g.lineWidth = 1.4; for (const [x0, cx1, x1] of [[-46, -50, -30], [-24, -26, -16], [22, 26, 16], [46, 52, 32]]) { g.beginPath(); g.moveTo(x0, 22); g.quadraticCurveTo(cx1, 44, x1, 64); g.stroke(); g.strokeStyle = 'rgba(190,220,255,0.16)'; g.beginPath(); g.moveTo(x0 + 1.4, 22); g.quadraticCurveTo(cx1 + 1.4, 44, x1 + 1.4, 64); g.stroke(); g.strokeStyle = 'rgba(0,0,20,0.5)'; }
  // equator belt: Vault-Tec yellow with dark chevrons
  g.beginPath(); g.moveTo(-64, 21); g.quadraticCurveTo(0, 33, 64, 21); g.lineTo(64, 28); g.quadraticCurveTo(0, 40, -64, 28); g.closePath(); g.fillStyle = rgb(sh(TRIM, 0.95 * K)); g.fill(); g.strokeStyle = 'rgba(20,16,4,0.7)'; g.lineWidth = 1; g.stroke();
  g.save(); g.clip(); g.fillStyle = 'rgba(20,16,4,0.55)'; for (let x = -60; x < 62; x += 10) { const yy = 26.5 + (1 - (x / 64) * (x / 64)) * 5.5; g.beginPath(); g.moveTo(x, yy - 7); g.lineTo(x + 4, yy - 7); g.lineTo(x + 8, yy + 3); g.lineTo(x + 4, yy + 3); g.closePath(); g.fill(); } g.restore();
  for (let x = -54; x <= 54; x += 12) { const yy = 20 + (1 - (x / 64) * (x / 64)) * 12.5; g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(x + 0.5, yy + 0.7, 1.3, 0, TAU); g.fill(); g.fillStyle = 'rgba(210,225,240,0.85)'; g.beginPath(); g.arc(x, yy, 1.2, 0, TAU); g.fill(); }
  // Vault-Tec cog badge on the flank
  g.save(); g.translate(-22, 44); g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(0.8, 1, 14, 0, TAU); g.fill(); g.fillStyle = rgb(sh(TRIM, 0.95 * K)); g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = i % 2 ? 11.4 : 14; g.lineTo(cos(a) * r, sin(a) * r); } g.closePath(); g.fill();
  g.fillStyle = rgb(sh([22, 46, 104], K)); g.beginPath(); g.arc(0, 0, 8.6, 0, TAU); g.fill(); g.scale(face, 1); g.font = 'bold 9px "Liberation Sans",Helvetica,Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = rgb(sh(TRIM, K)); g.fillText('213', 0, 0.6); g.restore();
  // drone bay (bottom): two doors slide apart on 'summon'
  const bay = st === 'summon' ? eio(min(1, atk * 1.7)) : 0;
  g.fillStyle = '#05070a'; g.fillRect(-16, 60, 32, 8); if (bay > 0.02 && !FO) { g.fillStyle = rgb([200, 245, 255], 0.9 * bay); g.fillRect(-14 * bay - 2, 61, 28 * bay + 4, 5); }
  for (const s of [-1, 1]) { g.fillStyle = rgb(sh(STEEL, 1.05 * K)); g.fillRect(s > 0 ? 0.5 + bay * 15 : -16 - bay * 15, 59, 15.5, 6); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(s > 0 ? 0.5 + bay * 15 : -16 - bay * 15, 64, 15.5, 1); }
  // overload core hatch: six petals peel back, a white-hot core spins inside
  {
    const cx = 15, cy = 43, R = 17; g.fillStyle = '#040608'; g.beginPath(); g.arc(cx, cy, R + 1.5, 0, TAU); g.fill();
    if (open > 0.02 && !dead) {
      const cg = g.createRadialGradient(cx, cy, 1, cx, cy, R); cg.addColorStop(0, 'rgb(255,255,250)'); cg.addColorStop(0.35, 'rgb(170,255,240)'); cg.addColorStop(1, 'rgb(20,120,150)'); g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
      g.save(); g.translate(cx, cy); g.rotate(t * 7); g.fillStyle = 'rgba(10,50,60,0.55)'; for (let i = 0; i < 5; i++) { g.rotate(TAU / 5); g.beginPath(); g.moveTo(2, 0); g.lineTo(R * 0.92, -3.6); g.lineTo(R * 0.92, 3.6); g.closePath(); g.fill(); } g.restore();
    }
    const gap = open * 0.92, hole = open * 9;
    for (let i = 0; i < 6; i++) {
      const a0 = i * PI / 3 + gap / 2 - PI / 2, a1 = (i + 1) * PI / 3 - gap / 2 - PI / 2; g.beginPath(); g.moveTo(cx + cos(a0) * hole, cy + sin(a0) * hole); g.arc(cx, cy, R, a0, a1); g.lineTo(cx + cos(a1) * hole, cy + sin(a1) * hole); g.closePath();
      const pg = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); pg.addColorStop(0, rgb(sh(STEEL, 1.5 * K))); pg.addColorStop(1, rgb(sh(STEEL, 0.6 * K))); g.fillStyle = pg; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1; g.stroke();
      const am = (a0 + a1) / 2; g.fillStyle = 'rgba(220,235,250,0.7)'; g.beginPath(); g.arc(cx + cos(am) * (R - 4), cy + sin(am) * (R - 4), 1, 0, TAU); g.fill();
    }
    g.strokeStyle = rgb(sh(TRIM, 0.8 * K)); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R + 1, 0, TAU); g.stroke();
  }
  // hull grime + specular
  g.fillStyle = 'rgba(30,20,10,0.16)'; for (let i = 0; i < 7; i++) { const x = -50 + i * 16 + (i % 3) * 3; g.fillRect(x, 8 + (i % 2) * 6, 1.6, 26 + (i * 7) % 16); }
  g.strokeStyle = 'rgba(255,255,255,0.26)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(24, 2); g.bezierCurveTo(44, 8, 54, 22, 50, 36); g.stroke();
  g.restore();
  g.strokeStyle = 'rgba(0,4,14,0.7)'; g.lineWidth = 1.6; hullPath(g); g.stroke();
  if (open > 0.05 && !dead) glow(g, 15, 43, 34 + 22 * open, [130, 255, 235], 0.5 * open);
  // hull damage when dead: scorch + cracks
  if (dead) { g.save(); hullPath(g); g.clip(); g.fillStyle = 'rgba(10,8,6,0.45)'; g.fillRect(-64, -8, 128, 76); g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 1.2; for (const [a, b, c2, d2] of [[-20, 6, -8, 30], [30, 12, 18, 36], [-40, 30, -30, 54]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(a + 4, b + 8); g.lineTo(c2, d2); g.stroke(); } g.restore(); }

  // --- camera eye
  {
    const ex = 24, ey = 12, ir = 8.4 * (1 - 0.4 * chg) + (st === 'overload' ? 1.5 : 0);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(ex + 1, ey + 1.4, 16, 0, TAU); g.fill();
    const bz = g.createLinearGradient(ex - 15, ey - 15, ex + 15, ey + 15); bz.addColorStop(0, rgb(sh(STEEL, 1.7 * K))); bz.addColorStop(0.5, rgb(sh(STEEL, 0.85 * K))); bz.addColorStop(1, rgb(sh(STEEL, 0.4 * K))); g.fillStyle = bz; g.beginPath(); g.arc(ex, ey, 15, 0, TAU); g.fill();
    g.strokeStyle = rgb(sh(TRIM, 0.85 * K)); g.lineWidth = 1.6; g.beginPath(); g.arc(ex, ey, 14.4, 0, TAU); g.stroke();
    g.fillStyle = '#04070a'; g.beginPath(); g.arc(ex, ey, 11.4, 0, TAU); g.fill();
    if (dead) { g.strokeStyle = 'rgba(150,40,30,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(ex - 6, ey - 6); g.lineTo(ex + 6, ey + 6); g.moveTo(ex + 6, ey - 6); g.lineTo(ex - 6, ey + 6); g.stroke(); }
    else {
      const eg = g.createRadialGradient(ex - 1, ey - 1, 0.5, ex, ey, ir + 3); eg.addColorStop(0, 'rgb(255,255,255)'); eg.addColorStop(0.35, rgb(mc)); eg.addColorStop(1, rgb(sh(mc, 0.25))); g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, ir + 2.6, 0, TAU); g.fill();
      g.fillStyle = 'rgba(4,8,14,0.92)'; const rot = t * (0.6 + 2.4 * chg); for (let i = 0; i < 8; i++) { const a = rot + i * TAU / 8; g.beginPath(); g.moveTo(ex + cos(a) * (ir + 3.6), ey + sin(a) * (ir + 3.6)); g.lineTo(ex + cos(a + 0.5) * (ir + 3.6), ey + sin(a + 0.5) * (ir + 3.6)); g.lineTo(ex + cos(a + 0.24) * (ir - 0.6), ey + sin(a + 0.24) * (ir - 0.6)); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(ex - 4, ey - 5, 3.4, 1.6, -0.6, 0, TAU); g.fill();
      glow(g, ex, ey, 20 + 30 * chg + (st === 'beam' ? 22 : 0), mc, 0.35 + 0.5 * chg);
      if (st === 'beam' && !FO) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.4; for (let i = 0; i < 6; i++) { const a = i * PI / 3 + t * 2; g.beginPath(); g.moveTo(ex + cos(a) * 12, ey + sin(a) * 12); g.lineTo(ex + cos(a) * (34 + 8 * sin(t * 40 + i)), ey + sin(a) * (34 + 8 * sin(t * 40 + i))); g.stroke(); } g.restore(); }
    }
  }
  // aux sensor + vents on the rear of the hull
  g.fillStyle = '#05070a'; g.beginPath(); g.arc(-38, 20, 5, 0, TAU); g.fill(); g.strokeStyle = rgb(sh(STEEL, 1.2 * K)); g.lineWidth = 1.3; g.stroke(); if (!dead) { g.fillStyle = rgb(mc, 0.9); g.beginPath(); g.arc(-38, 20, 1.8, 0, TAU); g.fill(); }

  // --- dome + brain in a jar
  {
    g.save(); g.beginPath(); g.ellipse(0, -6, 39, 53, 0, PI, TAU); g.closePath(); g.clip();
    const fl = g.createLinearGradient(0, -60, 0, -4); fl.addColorStop(0, rgb(mix([36, 130, 150], mc, 0.14 + 0.14 * mood), 0.9)); fl.addColorStop(1, 'rgba(10,54,72,0.96)'); g.fillStyle = fl; g.fillRect(-44, -62, 88, 60);
    const vg2 = g.createRadialGradient(0, -30, 14, 0, -30, 58); vg2.addColorStop(0, 'rgba(0,20,30,0)'); vg2.addColorStop(1, 'rgba(0,14,24,0.5)'); g.fillStyle = vg2; g.fillRect(-44, -62, 88, 60);
    g.save(); g.translate(0, -31 + (dead ? 5 : sin(t * 2.2) * 1.3)); const bk = dead ? 0.98 : 1 + 0.03 * sin(t * (5.6 + 5 * mood)); g.scale(bk, bk); if (dead) g.globalAlpha = 0.62; g.drawImage(BRAIN, -BW / 2, -BH / 2 + 3, BW, BH); g.globalAlpha = 1;
    if (dead) { g.fillStyle = 'rgba(20,40,30,0.5)'; g.fillRect(-40, -30, 80, 60); }
    g.restore();
    // wires into the stem
    g.strokeStyle = 'rgba(14,18,24,0.9)'; g.lineWidth = 1.8; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(1 + i * 2, -8); g.bezierCurveTo(i * 12, -12, -i * 8, -8, i * 18, -3); g.stroke(); }
    if (!dead) {
      for (let i = 0; i < 9; i++) { const bx = -26 + ((i * 37) % 52), by = -8 - ((t * (9 + (i % 4) * 3) + i * 13) % 46); g.strokeStyle = 'rgba(210,255,250,0.55)'; g.lineWidth = 0.7; g.beginPath(); g.arc(bx + sin(t * 2 + i) * 1.5, by, 0.9 + (i % 3) * 0.5, 0, TAU); g.stroke(); }
      if (!FO) { g.save(); g.translate(0, -31); g.globalCompositeOperation = 'lighter'; const pts = [[-18, -8], [-6, -14], [8, -12], [20, -3], [-22, 4], [4, 2], [15, 8], [-10, 12]]; for (let i = 0; i < pts.length; i++) { const a = max(0, sin(t * (3.2 + mood * 3) + i * 1.9)); if (a < 0.05) continue; const gg = g.createRadialGradient(pts[i][0], pts[i][1], 0, pts[i][0], pts[i][1], 7); gg.addColorStop(0, rgb(mix(mc, [255, 255, 255], 0.5), a * 0.9)); gg.addColorStop(1, rgb(mc, 0)); g.fillStyle = gg; g.fillRect(pts[i][0] - 7, pts[i][1] - 7, 14, 14); }
        if (mood > 0.4 && ((t * 9) | 0) % 3 === 0) arc(g, -14, -14, 16, 2, (t * 9) | 0, mc, 0.8, 0.9); g.restore(); }
    }
    // glass: fresnel rim + highlight streaks
    const rim = g.createRadialGradient(0, -6, 26, 0, -6, 54); rim.addColorStop(0, 'rgba(160,240,255,0)'); rim.addColorStop(1, 'rgba(190,250,255,0.42)'); g.fillStyle = rim; g.fillRect(-44, -62, 88, 60);
    g.fillStyle = 'rgba(255,255,255,0.26)'; g.beginPath(); g.moveTo(8, -56); g.bezierCurveTo(24, -52, 34, -38, 36, -22); g.lineTo(31, -22); g.bezierCurveTo(28, -38, 18, -48, 6, -52); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.ellipse(-22, -34, 3, 12, 0.45, 0, TAU); g.fill();
    if (dead) { g.strokeStyle = 'rgba(230,250,255,0.6)'; g.lineWidth = 1; for (const [a, b, c2, d2, e2, f2] of [[-4, -58, 6, -44, 2, -30], [10, -52, 22, -40, 26, -24], [-24, -40, -14, -28, -22, -14]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d2); g.lineTo(e2, f2); g.stroke(); } }
    g.restore();
    g.strokeStyle = rgb(sh(STEEL, 1.3 * K)); g.lineWidth = 2.6; g.beginPath(); g.ellipse(0, -6, 39.6, 53.6, 0, PI, TAU); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, -6, 38, 52, 0, PI * 1.05, PI * 1.5); g.stroke();
    // base ring between dome and hull
    const rg2 = g.createLinearGradient(0, -12, 0, 4); rg2.addColorStop(0, rgb(sh(STEEL, 1.6 * K))); rg2.addColorStop(0.5, rgb(sh(STEEL, 0.9 * K))); rg2.addColorStop(1, rgb(sh(STEEL, 0.4 * K))); g.fillStyle = rg2; g.beginPath(); g.ellipse(0, -5, 46, 8, 0, 0, TAU); g.fill(); g.strokeStyle = rgb(sh(TRIM, 0.85 * K)); g.lineWidth = 1.4; g.beginPath(); g.ellipse(0, -5, 46, 8, 0, 0.15, PI - 0.15); g.stroke();
    for (let i = 0; i < 10; i++) { const a = i / 10 * PI + 0.2; if (dead) break; const lx = cos(a) * 42, ly = -5 + sin(a) * 6.4; g.fillStyle = rgb(mc, 0.9); g.beginPath(); g.arc(lx, ly, 1.3, 0, TAU); g.fill(); }
  }
  // --- halo ring above the dome
  if (!dead) {
    g.save(); g.strokeStyle = rgb(sh(STEEL, 1.4 * K)); g.lineWidth = 2; g.beginPath(); g.ellipse(0, -73, 31, 5.4, 0, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(0, -73.8, 31, 5.4, 0, PI * 1.1, PI * 1.9); g.stroke();
    const spd = 1.1 + mood * 1.6 + (st === 'windup' ? 2 * atk : 0);
    for (let i = 0; i < 10; i++) { const a = t * spd + i * TAU / 10, lx = cos(a) * 31, ly = -73 + sin(a) * 5.4, fr = sin(a) > 0 ? 1 : 0.45; g.fillStyle = rgb(mc, fr); g.beginPath(); g.arc(lx, ly, 1.7, 0, TAU); g.fill(); glow(g, lx, ly, 7, mc, 0.5 * fr); }
    g.restore();
  }

  // --- front pod + front arm (in front of the hull)
  pod(1, true); drawArm(g, 1, st, atk, t, K, mc, chg, dead, 2);
  tipGlow(g, 1, st, atk, t, mc, chg, dead); tipGlow(g, -1, st, atk, t, mc, chg, dead);
  if (st === 'beam' && !FO) {                       // crackle between the emitters and the dome
    const s0 = (t * 30) | 0, [fx, fy] = armPose(st, atk, t, 1, false), k = min(1, 95 / (hypot(fx, fy) || 1));
    const hx = 44 + fx * k, hy = -3 + fy * k; arc(g, hx, hy, 0, -60, s0, mc, 0.9, 1.3); arc(g, -hx, hy, 0, -60, s0 + 7, mc, 0.9, 1.3); arc(g, hx, hy, -hx, hy, s0 + 3, mc, 0.55, 1);
  }
  // --- overload sparks / dead smoke
  if (!FO) {
    if (st === 'overload' && open > 0.1) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 7; i++) { const s = ((t * 3.4 + i * 0.37) % 1), a = i * 2.4 + t, r = 8 + s * 40; g.fillStyle = 'rgba(200,255,245,' + (0.9 * (1 - s)) + ')'; g.fillRect(15 + cos(a) * r, 43 + sin(a) * r * 0.8 - s * 14, 2, 2); } g.restore(); }
    if (dead) {
      for (let i = 0; i < 6; i++) { const s = ((dT * 0.45 + i * 0.17) % 1), x = -16 + i * 7 + sin(dT * 2 + i) * 5, y = -46 - s * 80; g.fillStyle = 'rgba(28,28,30,' + (0.5 * (1 - s)) + ')'; g.beginPath(); g.arc(x, y, 5 + s * 16, 0, TAU); g.fill(); }
      g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { if (((dT * 7 + i * 1.7) % 2.4) > 0.22) continue; const x = -40 + i * 27, y = -10 + (i % 2) * 44; g.strokeStyle = 'rgba(255,220,150,0.9)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 * (i % 2 ? 1 : -1), y + 7); g.lineTo(x + 2, y + 14); g.stroke(); } g.restore();
    }
  }
  // --- energy shield
  shield(g, shd, t, mc);
  g.restore();
}
CD.art.overseer = drawOverseer;
})();
