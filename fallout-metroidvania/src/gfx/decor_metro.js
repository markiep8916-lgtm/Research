// Decor painters for the Cinder Ridge Metro (kinds are prefixed mt_). Baked once per chunk; d.x,d.y,d.w,d.h are world px, d.p is the deco options object, r is a seeded RNG.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const K = CD.decor.kinds;
const rgb = U.rgb, shade = U.shade;

// ---------------------------------------------------------------- helpers
function def(name, fn) { K[name] = function (g, d, r) { try { fn(g, d, r, d.p || {}); } catch (e) { if (window.console) console.error('decor ' + name, e); } }; }
function rr(g, x, y, w, h, rad) {
  rad = Math.max(0, Math.min(rad, w / 2, h / 2));
  g.beginPath(); g.moveTo(x + rad, y); g.lineTo(x + w - rad, y); g.quadraticCurveTo(x + w, y, x + w, y + rad); g.lineTo(x + w, y + h - rad); g.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  g.lineTo(x + rad, y + h); g.quadraticCurveTo(x, y + h, x, y + h - rad); g.lineTo(x, y + rad); g.quadraticCurveTo(x, y, x + rad, y); g.closePath();
}
function lin(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of stops) gr.addColorStop(s[0], s[1]); return gr; }
function bolt(g, x, y, rad, c) {
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(x + 0.6, y + 0.9, rad, 0, 7); g.fill();
  g.fillStyle = rgb(c || [128, 128, 124]); g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.4, 0, 7); g.fill();
}
function contact(g, x, y, w, h, a) { g.fillStyle = 'rgba(0,0,0,' + (a || 0.3) + ')'; g.fillRect(x, y, w, h); }
function metal(g, x, y, w, h, base, vertical) {   // brushed panel with rim light
  g.fillStyle = vertical ? lin(g, x, 0, x + w, 0, [[0, rgb(shade(base, 1.3))], [0.5, rgb(base)], [1, rgb(shade(base, 0.45))]]) : lin(g, 0, y, 0, y + h, [[0, rgb(shade(base, 1.4))], [0.4, rgb(base)], [1, rgb(shade(base, 0.4))]]);
  g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, vertical ? 1.5 : w, vertical ? h : 1.5); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x, vertical ? y : y + h - 1, vertical ? 1 : w, 1);
}
function drips(g, r, x, y, w, n, col, a, len) {   // grime streaks hanging from an edge
  for (let i = 0; i < n; i++) {
    const px = x + r.range(0, w), l = r.range(len * 0.4, len), sw = r.range(1.5, 5);
    const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(0.7, 'rgba(' + col + ',' + a * 0.4 + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(px - sw / 2, y); g.lineTo(px + sw / 2, y); g.lineTo(px + sw * 0.15, y + l); g.lineTo(px - sw * 0.15, y + l); g.closePath(); g.fill();
  }
}
function blotch(g, r, x, y, w, h, n, col, a) {   // irregular soft stains
  for (let i = 0; i < n; i++) {
    const cx = x + r.range(0, w), cy = y + r.range(0, h), rad = r.range(6, Math.min(40, w * 0.3)), gr = g.createRadialGradient(cx, cy, 1, cx, cy, rad);
    gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rad, rad * r.range(0.5, 0.9), r.range(-0.4, 0.4), 0, 7); g.fill();
  }
}
function shadeBottom(g, x, y, w, h, a) { g.fillStyle = lin(g, 0, y, 0, y + h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,' + a + ')']]); g.fillRect(x, y, w, h); }
function glow(g, x, y, rad, col, a) {
  g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
  g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore();
}
function text(g, str, x, y, size, col, align) { g.font = 'bold ' + size + 'px "Courier New", monospace'; g.textAlign = align || 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(str, x, y); }

// ================================================================ THE WRECKED TRAIN
function windowPane(g, r, x, y, w, h, st) {
  g.fillStyle = 'rgba(0,0,0,0.65)'; rr(g, x - 3, y - 3, w + 6, h + 6, 7); g.fill();
  g.fillStyle = 'rgba(210,205,180,0.28)'; rr(g, x - 3, y - 3, w + 6, 1.6, 1); g.fill();
  let a = '#1b3438', b = '#08181a';
  if (st === 'lit') { a = '#d69a48'; b = '#5a2c0c'; } else if (st === 'green') { a = '#5e9a4c'; b = '#1e3a18'; } else if (st === 'dead') { a = '#0c1618'; b = '#040a0b'; }
  g.fillStyle = lin(g, x, y, x + w, y + h, [[0, a], [1, b]]); rr(g, x, y, w, h, 5); g.fill();
  if (st === 'lit' || st === 'green') glow(g, x + w / 2, y + h * 0.6, w * 0.8, st === 'lit' ? '255,170,70' : '150,255,110', 0.35);
  // reflection streaks
  g.save(); rr(g, x, y, w, h, 5); g.clip();
  g.fillStyle = 'rgba(200,235,235,0.10)'; g.beginPath(); g.moveTo(x + w * 0.1, y + h); g.lineTo(x + w * 0.35, y); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.25, y + h); g.fill();
  g.fillStyle = 'rgba(200,235,235,0.06)'; g.beginPath(); g.moveTo(x + w * 0.55, y + h); g.lineTo(x + w * 0.75, y); g.lineTo(x + w * 0.82, y); g.lineTo(x + w * 0.62, y + h); g.fill();
  if (st === 'broken') {   // shattered: dark hole with shards on the frame
    g.fillStyle = '#020506'; g.beginPath(); g.moveTo(x + w * 0.15, y + h * 0.1); g.lineTo(x + w * 0.5, y + h * 0.35); g.lineTo(x + w * 0.9, y + h * 0.05); g.lineTo(x + w * 0.85, y + h * 0.9); g.lineTo(x + w * 0.45, y + h * 0.7); g.lineTo(x + w * 0.1, y + h * 0.95); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(220,240,240,0.5)'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x + w * 0.5, y + h * 0.4); g.lineTo(x + r.range(0, w), y + r.range(0, h)); g.stroke(); }
    g.fillStyle = 'rgba(230,245,245,0.65)'; for (let i = 0; i < 4; i++) { const sx = x + r.range(2, w - 2), sy = r.range(0, 1) < 0.5 ? y + 1 : y + h - 5; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + r.range(3, 8), sy + r.range(-1, 4)); g.lineTo(sx + r.range(-3, 3), sy + 5); g.closePath(); g.fill(); }
  }
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.2; rr(g, x, y, w, h, 5); g.stroke();
}
def('mt_train', (g, d, r, p) => {
  const x = d.x, y = d.y, w = d.w, h = d.h;
  const cream = p.cream || [188, 178, 148], band = p.band || [30, 84, 88], stripe = p.stripe || [214, 132, 44];
  const roofH = 22, skirtH = 40, bodyT = y + roofH, bodyB = y + h - skirtH, bodyH = bodyB - bodyT;
  contact(g, x + 6, y + h - 6, w - 12, 8, 0.45);
  // ---- roof cap with vents
  metal(g, x, y, w, roofH, [72, 78, 80]);
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, y + roofH - 4, w, 4);
  for (let vx = x + 70; vx < x + w - 90; vx += 150) { metal(g, vx, y - 2, 46, 8, [104, 110, 110]); g.fillStyle = 'rgba(0,0,0,0.5)'; for (let k = 0; k < 5; k++) g.fillRect(vx + 4 + k * 8, y + 1, 4, 4); }
  // ---- main body panel (cream upper, teal lower)
  g.fillStyle = lin(g, 0, bodyT, 0, bodyB, [[0, rgb(shade(cream, 1.12))], [0.55, rgb(cream)], [0.56, rgb(shade(band, 1.1))], [1, rgb(shade(band, 0.7))]]);
  g.fillRect(x, bodyT, w, bodyH);
  const beltY = bodyT + bodyH * 0.6;
  g.fillStyle = rgb(stripe); g.fillRect(x, beltY - 3, w, 5); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, beltY + 2, w, 1.5); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, beltY - 3, w, 1);
  // rivet lines
  for (let rx = x + 8; rx < x + w - 6; rx += 26) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(rx, bodyT + 3, 1.6, 1.6); g.fillRect(rx, bodyB - 5, 1.6, 1.6); }
  // ---- windows and doors
  const mod = 84, endPad = p.cab ? 96 : 34, n = Math.max(1, Math.floor((w - endPad * 2) / mod)), start = x + endPad + ((w - endPad * 2) - n * mod) / 2;
  const winY = bodyT + 16, winH = bodyH * 0.42;
  const sts = p.states || ['dark', 'dark', 'lit', 'broken', 'dark', 'dead', 'green', 'broken', 'dark'];
  for (let i = 0; i < n; i++) {
    const mx = start + i * mod;
    if (i % 3 === 1) {   // sliding door pair
      const dw = 30, dh = bodyH - 16, dy = bodyT + 8; const open = r.next() < 0.35;
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(mx + 8, dy - 2, mod - 16, dh + 4);
      for (let k = 0; k < 2; k++) {
        const dx = mx + 10 + k * (dw + 2) + (open ? (k ? 12 : -12) : 0);
        g.fillStyle = lin(g, dx, 0, dx + dw, 0, [[0, rgb(shade(band, 0.7))], [0.5, rgb(shade(band, 1.05))], [1, rgb(shade(band, 0.6))]]); g.fillRect(dx, dy, dw, dh);
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(dx + dw - 1, dy, 1.5, dh);
        windowPane(g, r, dx + 6, dy + 10, dw - 12, winH * 0.9, r.pick(sts));
        g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(dx, dy, dw, 1.5);
      }
      if (open) { g.fillStyle = '#04090a'; g.fillRect(mx + 22, dy + 2, 14, dh - 4); }
      g.fillStyle = rgb(stripe); g.fillRect(mx + 8, dy + dh - 6, mod - 16, 3);
    } else {
      windowPane(g, r, mx + 12, winY, mod - 24, winH, sts[(i * 3 + Math.floor(x / 40)) % sts.length]);
    }
  }
  // ---- cab ends
  for (const side of ['L', 'R']) {
    if (!(p.cab === side || p.cab === 'both')) continue;
    const cx0 = side === 'L' ? x + 6 : x + w - 92, ww = 86;
    metal(g, cx0, bodyT + 4, ww, bodyH - 8, band);
    const wx = side === 'L' ? cx0 + 16 : cx0 + 6;
    windowPane(g, r, wx, bodyT + 18, 60, bodyH * 0.5, side === 'L' ? 'dark' : 'broken');
    g.fillStyle = '#d8d0a0'; g.beginPath(); g.arc(side === 'L' ? cx0 + 8 : cx0 + ww - 8, bodyB - 20, 6, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(side === 'L' ? cx0 + 8 : cx0 + ww - 8, bodyB - 20, 3, 0, 7); g.fill();
  }
  // ---- crushed end (wreck)
  if (p.crush) {
    const cx0 = p.crush === 'L' ? x : x + w - 70, sgn = p.crush === 'L' ? 1 : -1;
    g.fillStyle = '#05090a'; g.beginPath(); const bx = p.crush === 'L' ? x : x + w;
    g.moveTo(bx, bodyT); g.lineTo(bx + sgn * 60, bodyT + 10); g.lineTo(bx + sgn * 34, bodyT + bodyH * 0.35); g.lineTo(bx + sgn * 74, bodyT + bodyH * 0.55); g.lineTo(bx + sgn * 40, bodyT + bodyH * 0.8); g.lineTo(bx + sgn * 62, bodyB); g.lineTo(bx, bodyB); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(160,150,120,0.6)'; g.lineWidth = 2; g.stroke();
    void cx0;
  }
  // ---- car number plate
  g.fillStyle = 'rgba(20,24,24,0.7)'; g.fillRect(x + w / 2 - 26, bodyT + bodyH * 0.66, 52, 14); text(g, p.num || '7-114', x + w / 2, bodyT + bodyH * 0.66 + 7.5, 10, '#d8d2b0');
  // ---- weathering: rust runs, scorch, dents, graffiti
  drips(g, r, x, bodyT, w, Math.floor(w / 28), '90,44,16', 0.34, bodyH * 0.9);
  drips(g, r, x, y + roofH - 2, w, Math.floor(w / 40), '14,10,6', 0.4, 60);
  blotch(g, r, x, bodyT, w, bodyH, Math.floor(w / 90), '20,14,8', 0.28);
  blotch(g, r, x, bodyT + bodyH * 0.5, w, bodyH * 0.5, Math.floor(w / 110), '110,52,20', 0.22);
  if (p.scorch !== false) { const sx = x + r.range(w * 0.2, w * 0.8); const gr = g.createRadialGradient(sx, bodyT + 10, 4, sx, bodyT + 10, 70); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(sx - 70, bodyT - 10, 140, 90); }
  for (let i = 0; i < 4; i++) { const dx = x + r.range(20, w - 20), dy = bodyT + r.range(8, bodyH - 12), ds = r.range(8, 18); const gr = g.createRadialGradient(dx, dy, 1, dx, dy, ds); gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(dx, dy, ds, ds * 0.7, r.range(-0.6, 0.6), 0, 7); g.fill(); }
  if (r.next() < 0.7) { const gx = x + r.range(60, w - 120), gy = bodyT + bodyH * 0.72; g.strokeStyle = r.pick(['rgba(120,230,90,0.7)', 'rgba(230,80,150,0.65)', 'rgba(90,190,240,0.65)']); g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(gx, gy); g.bezierCurveTo(gx + 20, gy - 18, gx + 34, gy + 14, gx + 52, gy - 8); g.bezierCurveTo(gx + 62, gy - 16, gx + 70, gy + 8, gx + 88, gy - 2); g.stroke(); }
  shadeBottom(g, x, bodyB - 40, w, 40, 0.35);
  // ---- skirt / underframe
  const skY = bodyB;
  g.fillStyle = lin(g, 0, skY, 0, y + h, [[0, '#1a1f20'], [1, '#07090a']]); g.fillRect(x + 6, skY, w - 12, skirtH - 10);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 6, skY, w - 12, 1.5);
  for (let bx = x + 100; bx < x + w - 100; bx += r.range(90, 150)) { metal(g, bx, skY + 4, r.range(34, 60), 20, [58, 64, 66]); bolt(g, bx + 5, skY + 9, 1.4); }
  // ---- bogies + wheels
  for (const fx of [0.17, 0.83]) {
    const bx = x + w * fx; metal(g, bx - 54, y + h - 30, 108, 12, [44, 48, 50]);
    for (const wx of [-34, 34]) {
      const wy = y + h - 14; g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(bx + wx + 1, wy + 2, 15, 0, 7); g.fill();
      const wg = g.createRadialGradient(bx + wx - 4, wy - 4, 2, bx + wx, wy, 15); wg.addColorStop(0, '#6c7276'); wg.addColorStop(0.6, '#2c3236'); wg.addColorStop(1, '#0c1012'); g.fillStyle = wg; g.beginPath(); g.arc(bx + wx, wy, 15, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(bx + wx, wy, 8, 0, 7); g.stroke(); bolt(g, bx + wx, wy, 3, [150, 150, 144]);
    }
  }
});

// ================================================================ TRACK BED
def('mt_rails', (g, d, r) => {
  const x = d.x, w = d.w, fy = d.y + d.h;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, fy - 12, w, 12);
  for (let i = 0; i < w / 4; i++) { const px = x + r.range(0, w), s = r.range(1.5, 4.5); g.fillStyle = rgb(shade([84, 76, 64], r.range(0.5, 1.2))); g.fillRect(px, fy - r.range(1.5, 10), s, s * 0.75); }
  for (let sx = x + r.range(6, 24); sx < x + w - 26; sx += 46) {
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(sx + 1, fy - 13, 26, 10);
    g.fillStyle = lin(g, 0, fy - 14, 0, fy - 5, [[0, '#4a3a28'], [1, '#221810']]); g.fillRect(sx, fy - 14, 26, 9);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(sx, fy - 14, 26, 1); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(sx + r.range(5, 20), fy - 14, 1, 9);
  }
  // third rail cover (behind), then the running rail
  g.fillStyle = '#0c0d0d'; g.fillRect(x, fy - 25, w, 4); g.fillStyle = '#c9a51c'; for (let hx = x + 6; hx < x + w; hx += 34) g.fillRect(hx, fy - 25, 12, 1.6);
  for (let hx = x + 20; hx < x + w - 6; hx += 92) { g.fillStyle = '#20242a'; g.fillRect(hx, fy - 27, 3, 10); }
  g.fillStyle = lin(g, 0, fy - 22, 0, fy - 14, [[0, '#9aa3a8'], [0.3, '#5c666c'], [1, '#22282c']]); g.fillRect(x, fy - 22, w, 8);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, fy - 22, w, 1.4); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, fy - 14, w, 1.5);
  for (let i = 0; i < w / 60; i++) { const px = x + r.range(0, w), l = r.range(14, 46); g.fillStyle = 'rgba(120,52,20,0.35)'; g.fillRect(px, fy - 21, l, 6); }
  for (let jx = x + r.range(60, 140); jx < x + w; jx += r.range(220, 360)) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(jx, fy - 22, 2, 8); }
});
def('mt_edge', (g, d, r) => {   // yellow tactile strip along a platform edge (draws on the surface line)
  const x = d.x, w = d.w, fy = d.y + d.h;
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x, fy - 4, w, 4);
  g.fillStyle = lin(g, 0, fy - 5, 0, fy, [[0, '#e6c02a'], [1, '#8a6c10']]); g.fillRect(x, fy - 5, w, 5);
  g.fillStyle = 'rgba(0,0,0,0.35)'; for (let dx = x + 3; dx < x + w - 2; dx += 7) g.fillRect(dx, fy - 4, 2.4, 2.4);
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x, fy - 5, w, 1);
  for (let i = 0; i < w / 60; i++) { g.fillStyle = 'rgba(30,20,10,0.4)'; g.fillRect(x + r.range(0, w), fy - 5, r.range(8, 30), 5); }
});

// ================================================================ STATION FURNITURE
def('mt_station_sign', (g, d, r, p) => {
  const w = Math.min(d.w, 420), h = 56, x = d.x + (d.w - w) / 2, y = d.y + 14;
  g.strokeStyle = '#15191b'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 34, d.y); g.lineTo(x + 34, y + 4); g.moveTo(x + w - 34, d.y); g.lineTo(x + w - 34, y + 4); g.stroke();
  contact(g, x + 4, y + 6, w, h, 0.4);
  g.fillStyle = lin(g, 0, y, 0, y + h, [[0, '#1d4a44'], [1, '#0e2a28']]); rr(g, x, y, w, h, 6); g.fill();
  g.strokeStyle = '#d8d2b0'; g.lineWidth = 2; rr(g, x + 3, y + 3, w - 6, h - 6, 4); g.stroke();
  g.fillStyle = rgb(p.line || [214, 132, 44]); g.beginPath(); g.arc(x + 34, y + h / 2, 17, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  text(g, p.num || '7', x + 34, y + h / 2 + 1, 24, '#fff');
  text(g, (p.text || 'CINDER RIDGE').toUpperCase(), x + w / 2 + 20, y + h / 2 - 5, Math.min(24, (w - 100) / ((p.text || 'CINDER RIDGE').length * 0.62)), '#f2ecd0');
  if (p.sub) text(g, p.sub, x + w / 2 + 20, y + h - 14, 11, '#9fd0c0');
  g.fillStyle = 'rgba(255,255,255,0.18)'; rr(g, x + 2, y + 2, w - 4, 8, 4); g.fill();
  drips(g, r, x, y + h, w, 4, '10,8,6', 0.4, 26);
  for (const bx of [x + 8, x + w - 8]) for (const by of [y + 8, y + h - 8]) bolt(g, bx, by, 2);
});
def('mt_turnstile', (g, d, r, p) => {   // bank of turnstiles, floor-anchored
  const n = Math.max(1, Math.round(d.w / 46)), fy = d.y + d.h;
  for (let i = 0; i < n; i++) {
    const x = d.x + i * 46 + 6; contact(g, x - 4, fy - 3, 46, 4, 0.4);
    metal(g, x, fy - 52, 10, 52, [110, 116, 118], true); metal(g, x + 8, fy - 62, 16, 30, [88, 94, 96]);
    g.fillStyle = '#0a0f10'; g.fillRect(x + 11, fy - 58, 10, 8); g.fillStyle = r.next() < 0.5 ? '#3a6' : '#a33'; g.fillRect(x + 12, fy - 57, 4, 3);
    g.strokeStyle = 'rgba(190,196,198,0.85)'; g.lineWidth = 3; g.lineCap = 'round'; const a = r.range(0.2, 1.2);
    for (let k = 0; k < 3; k++) { const ang = a + k * 2.094; g.beginPath(); g.moveTo(x + 5, fy - 34); g.lineTo(x + 5 + Math.cos(ang) * 22, fy - 34 + Math.sin(ang) * 10 - 4); g.stroke(); }
    bolt(g, x + 5, fy - 34, 3.5, [150, 150, 146]);
    if (r.next() < 0.5) { g.fillStyle = 'rgba(90,44,16,0.4)'; g.fillRect(x, fy - 30, 10, 30); }
  }
});
def('mt_kiosk', (g, d, r, p) => {   // ticket booth / newsstand, floor-anchored
  const x = d.x + 4, w = d.w - 8, h = d.h - 2, y = d.y + 2, fy = d.y + d.h;
  contact(g, x + 4, fy - 5, w, 6, 0.4);
  g.fillStyle = lin(g, x, 0, x + w, 0, [[0, '#2a3a38'], [0.4, '#4c6662'], [1, '#1e2c2a']]); g.fillRect(x, y + 16, w, h - 16);
  g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(x, y + 16, w, 1.6);
  metal(g, x - 4, y + 6, w + 8, 12, [92, 98, 96]);   // roof lip
  // window with bars
  const wx = x + 14, wy = y + 32, ww = w - 28, wh = h * 0.42;
  g.fillStyle = '#050a09'; g.fillRect(wx, wy, ww, wh); glow(g, wx + ww / 2, wy + wh * 0.6, ww * 0.6, '255,190,90', 0.22);
  g.strokeStyle = '#2c3234'; g.lineWidth = 3; for (let bx = wx + 8; bx < wx + ww; bx += 14) { g.beginPath(); g.moveTo(bx, wy); g.lineTo(bx, wy + wh); g.stroke(); }
  g.fillStyle = '#8a9088'; g.fillRect(wx - 4, wy + wh, ww + 8, 6); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(wx - 4, wy + wh + 6, ww + 8, 2);
  text(g, p.text || 'TICKETS', x + w / 2, y + 24, 11, '#e8d890');
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + w - 30, wy + wh + 10, 22, h - wh - 40);   // side door
  drips(g, r, x, y + 18, w, 5, '90,44,16', 0.3, h * 0.7); blotch(g, r, x, y + 20, w, h - 24, 3, '10,8,6', 0.3);
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(214,206,170,' + r.range(0.4, 0.8) + ')'; g.save(); g.translate(x + r.range(-6, w + 10), fy - 2); g.rotate(r.range(-0.4, 0.4)); g.fillRect(-4, -1, r.range(6, 10), 2); g.restore(); }
});
def('mt_bench', (g, d, r) => {
  const n = Math.max(1, Math.round(d.w / 72)), fy = d.y + d.h;
  for (let i = 0; i < n; i++) {
    const x = d.x + i * 72 + 6; contact(g, x, fy - 3, 64, 4, 0.4);
    g.fillStyle = '#1a1e20'; g.fillRect(x + 4, fy - 14, 5, 14); g.fillRect(x + 51, fy - 14, 5, 14);
    for (let k = 0; k < 3; k++) { g.fillStyle = lin(g, 0, fy - 20 + k * 3, 0, fy - 17 + k * 3, [[0, '#7a5a38'], [1, '#3a2814']]); g.fillRect(x, fy - 20 + k * 3.4, 62, 3); }
    g.fillStyle = 'rgba(255,240,200,0.16)'; g.fillRect(x, fy - 20, 62, 1); for (let k = 0; k < 3; k++) { g.fillStyle = lin(g, 0, fy - 36 + k * 5, 0, fy - 32 + k * 5, [[0, '#6a4c30'], [1, '#2e2010']]); g.fillRect(x + 2, fy - 36 + k * 5, 58, 4); }
    g.fillStyle = '#1a1e20'; g.fillRect(x + 2, fy - 36, 3, 18); g.fillRect(x + 57, fy - 36, 3, 18);
    if (r.next() < 0.4) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x + r.range(6, 40), fy - 36, r.range(6, 16), 30); }
  }
});
def('mt_pillar', (g, d, r, p) => {   // tiled station pillar
  const w = Math.min(d.w, 34), x = d.x + (d.w - w) / 2, y = d.y, h = d.h;
  contact(g, x + 5, y + h - 5, w, 6, 0.35);
  g.fillStyle = lin(g, x, 0, x + w, 0, [[0, '#26302e'], [0.3, '#8a988e'], [0.6, '#5f6e66'], [1, '#1a2220']]); g.fillRect(x, y, w, h);
  for (let ty = y + 8; ty < y + h; ty += 12) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, ty, w, 1); }
  for (let tx = x + w / 2; tx < x + w; tx += 12) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(tx, y, 1, h); }
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x + 2, y, 3, h);
  g.fillStyle = lin(g, 0, y + h * 0.55, 0, y + h * 0.55 + 22, [[0, '#2a7a72'], [1, '#164a46']]); g.fillRect(x, y + h * 0.55, w, 22);
  g.fillStyle = '#d6cfa8'; g.fillRect(x, y + h * 0.55 + 22, w, 2); text(g, p.num || '7', x + w / 2, y + h * 0.55 + 11, 13, '#f4efd6');
  g.fillStyle = '#c9a51c'; for (let sy = y + h - 34; sy < y + h - 6; sy += 14) { g.beginPath(); g.moveTo(x, sy + 10); g.lineTo(x + 8, sy); g.lineTo(x + 16, sy); g.lineTo(x + 8, sy + 10); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, y + h - 6, w, 6);
  blotch(g, r, x, y, w, h, 3, '10,8,6', 0.3); drips(g, r, x, y, w, 3, '20,14,8', 0.4, h * 0.4);
});
def('mt_map', (g, d, r, p) => {   // route map board
  const w = Math.min(d.w, 130), h = Math.min(d.h, 92), x = d.x + (d.w - w) / 2, y = d.y + (d.h - h) / 2;
  contact(g, x + 3, y + 4, w, h, 0.4);
  g.fillStyle = '#20282a'; g.fillRect(x, y, w, h); g.fillStyle = '#e8e2c6'; g.fillRect(x + 4, y + 4, w - 8, h - 8);
  g.fillStyle = lin(g, x, y, x + w, y + h, [[0, 'rgba(255,255,255,0.18)'], [1, 'rgba(0,0,0,0.25)']]); g.fillRect(x + 4, y + 4, w - 8, h - 8);
  const cols = ['#c0392b', '#2a7a72', '#d68a2a', '#3a5aa0'];
  g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) { g.strokeStyle = cols[i]; g.beginPath(); g.moveTo(x + 10, y + 16 + i * 16); g.lineTo(x + w * 0.4, y + 16 + i * 16); g.lineTo(x + w * 0.55, y + 26 + i * 10); g.lineTo(x + w - 10, y + 26 + i * 10); g.stroke(); }
  g.fillStyle = '#20282a'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x + 14 + i * (w - 28) / 8, y + 44, 2.2, 0, 7); g.fill(); }
  g.strokeStyle = '#20282a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 14, y + 44); g.lineTo(x + w - 14, y + 44); g.stroke();
  text(g, p.title || 'LINE 7', x + w / 2, y + 12, 9, '#20282a');
  g.fillStyle = '#c0392b'; g.beginPath(); g.arc(x + w * 0.42, y + 44, 5, 0, 7); g.fill(); text(g, '?', x + w * 0.42, y + 44.5, 8, '#fff');
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + w * 0.6, y + 4); g.lineTo(x + w * 0.5, y + h * 0.5); g.lineTo(x + w * 0.7, y + h - 4); g.stroke();
  drips(g, r, x, y + h, w, 3, '10,8,6', 0.3, 20);
  for (const bx of [x + 3, x + w - 3]) for (const by of [y + 3, y + h - 3]) bolt(g, bx, by, 1.6);
});
def('mt_escalator', (g, d, r) => {   // dead escalator rising to the right; box = bounding rect
  const x = d.x, y = d.y, w = d.w, h = d.h, ang = Math.atan2(h - 30, w);
  contact(g, x + 6, y + h - 4, w, 6, 0.3);
  g.save(); g.translate(x, y + h - 10); g.rotate(-ang);
  const len = Math.hypot(w, h - 30);
  g.fillStyle = lin(g, 0, -34, 0, 6, [[0, '#5a6668'], [1, '#1e2628']]); g.fillRect(0, -34, len, 40);
  g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, -34, len, 1.5);
  for (let sx = 6; sx < len - 6; sx += 14) { g.fillStyle = '#0b0f10'; g.fillRect(sx, -24, 11, 3); g.fillStyle = 'rgba(160,168,170,0.55)'; g.fillRect(sx, -27, 11, 2); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(sx + 11, -27, 3, 8); }
  g.fillStyle = '#0a0d0e'; g.fillRect(0, -46, len, 9); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, -46, len, 1.2);
  for (let sx = 20; sx < len - 10; sx += 90) { g.fillStyle = '#20282a'; g.fillRect(sx, -46, 3, 14); }
  g.restore();
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 30, y + h); g.lineTo(x + 30, y + h - 6); g.fill();
  drips(g, r, x + w * 0.2, y + h * 0.3, w * 0.7, 5, '80,40,14', 0.3, h * 0.4);
});
def('mt_lightshaft', (g, d, r, p) => {   // dusty street light coming down the stairwell
  const x = d.x, y = d.y, w = d.w, h = d.h;
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = lin(g, 0, y, 0, y + h, [[0, 'rgba(255,196,130,0.20)'], [0.6, 'rgba(255,190,120,0.08)'], [1, 'rgba(255,180,110,0)']]);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w + (p.spread || 60), y + h); g.lineTo(x - (p.spread || 60) * 0.3, y + h); g.closePath(); g.fill();
  for (let i = 0; i < 14; i++) { const px = x + r.range(0, w), py = y + r.range(0, h); g.fillStyle = 'rgba(255,225,180,' + r.range(0.1, 0.35) + ')'; g.beginPath(); g.arc(px, py, r.range(0.8, 1.8), 0, 7); g.fill(); }
  g.restore();
});
def('mt_wallband', (g, d, r, p) => {   // mosaic name band on a tiled wall
  const x = d.x, y = d.y, w = d.w, h = Math.min(d.h, 44);
  g.fillStyle = lin(g, 0, y, 0, y + h, [[0, '#1c5a54'], [1, '#0f3532']]); g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(0,0,0,0.35)'; for (let tx = x; tx < x + w; tx += 20) g.fillRect(tx, y, 1, h); g.fillRect(x, y + h / 2, w, 1);
  g.fillStyle = '#d6cfa8'; g.fillRect(x, y, w, 3); g.fillRect(x, y + h - 3, w, 3);
  const label = (p.text || 'CINDER RIDGE').toUpperCase(); const step = 40 * (p.step || 6);
  for (let tx = x + step / 2; tx < x + w; tx += step) text(g, label, tx, y + h / 2 + 1, 15, '#e8e2c0');
  drips(g, r, x, y + h, w, Math.floor(w / 50), '10,8,6', 0.32, 30); blotch(g, r, x, y, w, h, 2, '10,8,6', 0.25);
});

// ================================================================ RUBBLE / PIPES / SEWER
def('mt_pile', (g, d, r, p) => {   // collapsed concrete: p.hang draws it hanging from the top edge
  const x = d.x, y = d.y, w = d.w, h = d.h, hang = !!p.hang, base = hang ? y : y + h;
  const n = Math.max(6, Math.floor(w / 14));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const t = (i + r.next() * 0.6) / n, cx = x + t * w, prof = Math.sin(Math.min(1, t) * Math.PI), hh = (0.25 + 0.75 * prof) * h * r.range(0.6, 1.0), rw = r.range(10, 26);
      const cy = hang ? base + hh * (pass ? 0.25 : 0.5) : base - hh * (pass ? 0.25 : 0.5);
      g.beginPath(); const k = 7; for (let j = 0; j < k; j++) { const a = j / k * 6.283, rr2 = 0.7 + r.next() * 0.4; const px = cx + Math.cos(a) * rw * rr2, py = cy + Math.sin(a) * rw * rr2 * 0.85; j ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath();
      const c = r.pick([[96, 92, 84], [112, 106, 96], [78, 76, 72], [124, 96, 76]]);
      g.fillStyle = lin(g, 0, cy - rw, 0, cy + rw, [[0, rgb(shade(c, hang ? 0.7 : 1.4))], [1, rgb(shade(c, hang ? 1.3 : 0.45))]]); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1; g.stroke();
    }
  }
  for (let i = 0; i < 5; i++) { const rx = x + r.range(w * 0.15, w * 0.85), ry = hang ? base + r.range(4, h * 0.6) : base - r.range(h * 0.3, h * 0.9), l = r.range(24, 56), a = r.range(-0.9, 0.9) + (hang ? Math.PI / 2 : -Math.PI / 2);   // rebar
    g.strokeStyle = 'rgba(96,52,26,0.95)'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + Math.cos(a) * l, ry + Math.sin(a) * l); g.stroke(); g.strokeStyle = 'rgba(255,190,140,0.25)'; g.lineWidth = 0.8; g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, hang ? base : base - 3, w, 3);
  blotch(g, r, x, hang ? y : y + h * 0.3, w, h * 0.7, 3, '20,16,10', 0.3);
});
def('mt_pipes', (g, d, r, p) => {   // horizontal pipe bundle with flanges, valves and drips
  const x = d.x, w = d.w, n = p.n || 3; let yy = d.y + 8;
  for (let i = 0; i < n; i++) {
    const rad = r.range(6, 12), col = r.pick([[124, 92, 60], [90, 100, 96], [120, 70, 50], [70, 92, 84]]);
    contact(g, x, yy + rad, w, 5, 0.25);
    g.fillStyle = lin(g, 0, yy - rad, 0, yy + rad, [[0, rgb(shade(col, 0.4))], [0.25, rgb(shade(col, 1.4))], [0.5, rgb(col)], [1, rgb(shade(col, 0.3))]]); g.fillRect(x, yy - rad, w, rad * 2);
    for (let fx = x + r.range(20, 70); fx < x + w - 14; fx += r.range(90, 160)) { metal(g, fx, yy - rad - 3, 9, rad * 2 + 6, shade(col, 0.85), true); bolt(g, fx + 4.5, yy - rad, 1.2); bolt(g, fx + 4.5, yy + rad, 1.2); }
    if (r.next() < 0.6) { const vx = x + r.range(40, w - 40); g.fillStyle = '#1a1e20'; g.fillRect(vx - 2, yy - rad - 14, 4, 14); g.strokeStyle = '#8a1e14'; g.lineWidth = 3; g.beginPath(); g.arc(vx, yy - rad - 16, 9, 0, 7); g.stroke(); g.beginPath(); g.moveTo(vx - 9, yy - rad - 16); g.lineTo(vx + 9, yy - rad - 16); g.moveTo(vx, yy - rad - 25); g.lineTo(vx, yy - rad - 7); g.stroke(); }
    drips(g, r, x, yy + rad, w, 4, '30,50,20', 0.4, 40);
    yy += rad * 2 + r.range(4, 8);
  }
  for (let i = 0; i < 3; i++) { const dx = x + r.range(20, w - 20); g.fillStyle = 'rgba(120,200,110,0.55)'; g.beginPath(); g.ellipse(dx, yy + r.range(2, 20), 1.6, 2.6, 0, 0, 7); g.fill(); }
});
def('mt_pipes_v', (g, d, r, p) => {   // vertical pipe run with brackets
  const x = d.x + (d.w - 16) / 2, y = d.y, h = d.h, col = r.pick([[124, 92, 60], [90, 100, 96], [70, 92, 84]]);
  contact(g, x + 6, y, 16, h, 0.22);
  g.fillStyle = lin(g, x, 0, x + 16, 0, [[0, rgb(shade(col, 0.35))], [0.3, rgb(shade(col, 1.4))], [0.55, rgb(col)], [1, rgb(shade(col, 0.3))]]); g.fillRect(x, y, 16, h);
  for (let yy = y + r.range(20, 60); yy < y + h - 10; yy += r.range(70, 120)) { metal(g, x - 3, yy, 22, 8, shade(col, 0.8)); bolt(g, x + 2, yy + 4, 1.2); bolt(g, x + 14, yy + 4, 1.2); }
  drips(g, r, x, y, 16, 3, '20,40,16', 0.35, h * 0.4); blotch(g, r, x - 4, y, 24, h, 2, '20,14,8', 0.3);
});
def('mt_grate', (g, d, r, p) => {   // round sewer mouth in a wall with slime trail
  const cx = d.x + d.w / 2, cy = d.y + d.h / 2, rad = Math.min(d.w, d.h) / 2 - 3;
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(cx + 3, cy + 4, rad + 4, 0, 7); g.fill();
  const rg = g.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.4, cx, cy, rad + 5); rg.addColorStop(0, '#6a726c'); rg.addColorStop(1, '#22282a'); g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, rad + 4, 0, 7); g.fill();
  g.fillStyle = '#020505'; g.beginPath(); g.arc(cx, cy, rad - 4, 0, 7); g.fill();
  glow(g, cx, cy + rad * 0.4, rad, '90,255,120', 0.1);
  g.strokeStyle = '#3a4240'; g.lineWidth = 3; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k * rad * 0.4, cy - rad + 4); g.lineTo(cx + k * rad * 0.4, cy + rad - 4); g.stroke(); }
  g.beginPath(); g.moveTo(cx - rad + 4, cy); g.lineTo(cx + rad - 4, cy); g.stroke();
  g.fillStyle = 'rgba(70,150,60,0.4)'; g.beginPath(); g.moveTo(cx - 10, cy + rad); g.lineTo(cx + 12, cy + rad); g.lineTo(cx + 8, d.y + d.h + 60); g.lineTo(cx - 6, d.y + d.h + 60); g.closePath(); g.fill();
  for (let i = 0; i < 6; i++) bolt(g, cx + Math.cos(i * 1.047) * (rad + 1), cy + Math.sin(i * 1.047) * (rad + 1), 2);
});
def('mt_drip', (g, d, r) => {   // ceiling stain + puddle at the floor
  const x = d.x, y = d.y, w = d.w, h = d.h;
  blotch(g, r, x, y, w, 26, 3, '8,10,8', 0.5);
  for (let i = 0; i < 3; i++) { const px = x + r.range(w * 0.2, w * 0.8); g.fillStyle = 'rgba(150,210,180,0.5)'; g.fillRect(px, y + 22, 1.2, h * 0.6); g.beginPath(); g.ellipse(px, y + 24, 2, 3, 0, 0, 7); g.fill(); }
  const fy = y + h; g.fillStyle = 'rgba(70,120,100,0.35)'; g.beginPath(); g.ellipse(x + w / 2, fy - 2, w * 0.4, 4, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(190,240,220,0.25)'; g.beginPath(); g.ellipse(x + w / 2 - 6, fy - 3, w * 0.2, 1.4, 0, 0, 7); g.fill();
});
def('mt_cables', (g, d, r) => {   // hanging cable loops from the top edge
  const x = d.x, y = d.y, w = d.w;
  for (let i = 0; i < Math.max(2, Math.floor(w / 60)); i++) {
    const x0 = x + r.range(0, w * 0.4) + i * (w / 3), l = r.range(24, d.h - 4), c = r.pick(['#0e1012', '#2a1a16', '#16202a', '#2a2a14']);
    g.strokeStyle = c; g.lineWidth = r.range(2, 4); g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + r.range(-18, 18), y + l * 0.4, x0 + r.range(-24, 24), y + l * 0.8, x0 + r.range(-20, 20), y + l); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 0.9; g.stroke();
    if (r.next() < 0.3) { const sx = x0, sy = y + l; glow(g, sx, sy, 16, '160,220,255', 0.5); }
  }
});
def('mt_valve', (g, d, r, p) => {   // wall valve wheel + gauge
  const cx = d.x + d.w / 2, cy = d.y + d.h / 2, R = Math.min(d.w, d.h) * 0.36;
  contact(g, cx - R + 3, cy - R + 4, R * 2, R * 2, 0.35);
  g.fillStyle = lin(g, 0, cy + R, 0, cy + R + 20, [[0, '#20282a'], [1, '#0a0e10']]); g.fillRect(cx - 5, cy, 10, R + 26);
  g.strokeStyle = '#8a1e14'; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.lineWidth = 3; for (let k = 0; k < 3; k++) { const a = k * 1.047 + (p.a || 0.3); g.beginPath(); g.moveTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
  g.strokeStyle = 'rgba(255,200,180,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, R, 3.6, 5.4); g.stroke(); bolt(g, cx, cy, 4, [150, 150, 146]);
  const gx = cx + R + 18, gy = cy - R * 0.4; g.fillStyle = '#e8e2c6'; g.beginPath(); g.arc(gx, gy, 11, 0, 7); g.fill(); g.strokeStyle = '#2a3032'; g.lineWidth = 3; g.stroke();
  g.strokeStyle = '#a02a1a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + Math.cos(-0.4) * 8, gy + Math.sin(-0.4) * 8); g.stroke(); g.fillStyle = '#c02a1a'; g.fillRect(gx + 4, gy - 9, 5, 4);
});
def('mt_liftcar', (g, d, r, p) => {   // dead elevator cage hanging in a shaft
  const x = d.x + 6, w = d.w - 12, y = d.y + 40, h = d.h - 40;
  g.strokeStyle = '#0c0e10'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + w * 0.3, d.y); g.lineTo(x + w * 0.3, y); g.moveTo(x + w * 0.7, d.y); g.lineTo(x + w * 0.7, y); g.stroke();
  contact(g, x + 5, y + 5, w, h, 0.35);
  metal(g, x, y, w, 14, [86, 92, 90]);
  g.fillStyle = '#0a0f10'; g.fillRect(x + 6, y + 14, w - 12, h - 26);
  g.strokeStyle = '#3a4244'; g.lineWidth = 3; for (let bx = x + 14; bx < x + w - 10; bx += 18) { g.beginPath(); g.moveTo(bx, y + 14); g.lineTo(bx, y + h - 12); g.stroke(); }
  g.beginPath(); g.moveTo(x + 6, y + h * 0.5); g.lineTo(x + w - 6, y + h * 0.5); g.stroke();
  metal(g, x - 4, y + h - 14, w + 8, 14, [76, 82, 80]); g.fillStyle = '#c9a51c'; for (let hx = x; hx < x + w; hx += 22) g.fillRect(hx, y + h - 8, 12, 3);
  text(g, p.text || 'OUT OF ORDER', x + w / 2, y + 7, 8, '#d8d0a0'); drips(g, r, x, y + h, w, 4, '90,44,16', 0.4, 26);
});
def('mt_ladder_hint', (g, d, r) => {});   // placeholder (kept so decos can reference it)

// ================================================================ GHOUL NESTS
def('mt_nest', (g, d, r, p) => {   // bedding pile, bones, cans; floor-anchored
  const x = d.x, w = d.w, fy = d.y + d.h;
  contact(g, x + 4, fy - 4, w - 6, 6, 0.4);
  for (let i = 0; i < 4; i++) {   // mattresses / rags
    const cx = x + w * (0.15 + i * 0.22) + r.range(-6, 6), rw = r.range(30, 52), rh = r.range(8, 16), col = r.pick([[92, 74, 58], [70, 80, 84], [104, 84, 56], [66, 56, 52]]);
    g.beginPath(); g.moveTo(cx - rw / 2, fy); g.bezierCurveTo(cx - rw / 2, fy - rh, cx + rw / 2, fy - rh * 1.2, cx + rw / 2, fy); g.closePath();
    g.fillStyle = lin(g, 0, fy - rh, 0, fy, [[0, rgb(shade(col, 1.35))], [1, rgb(shade(col, 0.5))]]); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(cx - rw / 2 + k * rw / 3, fy - 1); g.lineTo(cx - rw / 2 + k * rw / 3 + 3, fy - rh * 0.8); g.stroke(); }
  }
  for (let i = 0; i < 4; i++) { const bx = x + r.range(6, w - 12), by = fy - r.range(1, 3); g.strokeStyle = '#cfc7b0'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + r.range(6, 14), by - r.range(0, 3)); g.stroke(); g.fillStyle = '#cfc7b0'; g.beginPath(); g.arc(bx, by, 2.2, 0, 7); g.fill(); }
  if (r.next() < 0.7) { const sx = x + w * r.range(0.3, 0.7), sy = fy - 6; g.fillStyle = '#d8d0b8'; g.beginPath(); g.ellipse(sx, sy, 6, 5.4, 0, 0, 7); g.fill(); g.fillRect(sx - 3, sy + 3, 6, 3); g.fillStyle = '#0a0806'; g.beginPath(); g.ellipse(sx - 2.2, sy - 0.5, 1.7, 2, 0, 0, 7); g.ellipse(sx + 2.2, sy - 0.5, 1.7, 2, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 3; i++) { const cx = x + r.range(8, w - 8); g.fillStyle = r.pick(['#a83a2c', '#3a6aa0', '#c8b040']); g.fillRect(cx, fy - 8, 5, 8); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(cx, fy - 8, 5, 1.4); }
  if (p.candle) { const cx = x + w * 0.5; g.fillStyle = '#e8e0c0'; g.fillRect(cx, fy - 22, 4, 12); glow(g, cx + 2, fy - 26, 44, '255,170,70', 0.5); g.fillStyle = '#ffd070'; g.beginPath(); g.ellipse(cx + 2, fy - 25, 1.8, 3.2, 0, 0, 7); g.fill(); }
});

// ================================================================ CLINIC / CHEM DEN
def('mt_chairs', (g, d, r) => {   // waiting-room chairs, floor-anchored
  const n = Math.max(1, Math.round(d.w / 40)), fy = d.y + d.h;
  for (let i = 0; i < n; i++) {
    const x = d.x + i * 40 + 6, tip = r.next() < 0.15; contact(g, x, fy - 3, 32, 4, 0.35);
    g.save(); if (tip) { g.translate(x + 16, fy); g.rotate(-0.5); g.translate(-x - 16, -fy); }
    g.fillStyle = '#1c2224'; g.fillRect(x + 3, fy - 16, 3, 16); g.fillRect(x + 25, fy - 16, 3, 16);
    g.fillStyle = lin(g, 0, fy - 22, 0, fy - 14, [[0, '#3a7a76'], [1, '#164a46']]); rr(g, x, fy - 22, 32, 8, 3); g.fill();
    g.fillStyle = lin(g, 0, fy - 44, 0, fy - 24, [[0, '#3a7a76'], [1, '#1a5450']]); rr(g, x + 1, fy - 44, 8, 24, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x, fy - 22, 32, 1.4); g.restore();
    if (r.next() < 0.4) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + r.range(2, 20), fy - 22, 8, 6); }
  }
});
def('mt_gurney', (g, d, r, p) => {   // hospital gurney with a stained sheet + IV pole
  const x = d.x + 6, fy = d.y + d.h; contact(g, x + 2, fy - 3, d.w - 6, 4, 0.35);
  g.fillStyle = '#20282a'; g.fillRect(x + 6, fy - 22, 4, 22); g.fillRect(x + 60, fy - 22, 4, 22);
  g.strokeStyle = '#1a2022'; g.lineWidth = 2; g.beginPath(); g.arc(x + 8, fy - 3, 3, 0, 7); g.arc(x + 62, fy - 3, 3, 0, 7); g.stroke();
  metal(g, x, fy - 32, 72, 8, [126, 132, 132]);
  g.fillStyle = lin(g, 0, fy - 44, 0, fy - 32, [[0, '#d8d4c0'], [1, '#8a8676']]); rr(g, x + 2, fy - 44, 66, 13, 5); g.fill();
  g.fillStyle = 'rgba(120,20,14,0.55)'; g.beginPath(); g.ellipse(x + 34, fy - 38, 12, 4, 0.2, 0, 7); g.fill();
  g.fillStyle = '#bcb8a4'; rr(g, x + 3, fy - 46, 16, 8, 4); g.fill();
  g.strokeStyle = '#9aa0a0'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x + 84, fy); g.lineTo(x + 84, fy - 88); g.moveTo(x + 76, fy - 88); g.lineTo(x + 92, fy - 88); g.stroke();
  g.fillStyle = 'rgba(180,230,200,0.55)'; rr(g, x + 78, fy - 84, 12, 20, 3); g.fill(); g.strokeStyle = 'rgba(200,230,220,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 84, fy - 64); g.quadraticCurveTo(x + 60, fy - 58, x + 52, fy - 40); g.stroke();
});
def('mt_cabinet', (g, d, r, p) => {   // glass-front medical cabinet with bottles
  const x = d.x + 4, w = Math.min(d.w - 8, 100), h = d.h - 2, y = d.y + 2, fy = d.y + d.h; contact(g, x + 3, fy - 4, w, 5, 0.35);
  g.fillStyle = lin(g, x, 0, x + w, 0, [[0, '#4a5a58'], [0.5, '#7c8e8a'], [1, '#2c3836']]); g.fillRect(x, y, w, h);
  g.fillStyle = '#060c0c'; g.fillRect(x + 6, y + 8, w - 12, h - 22);
  const shelves = Math.max(2, Math.floor((h - 22) / 24));
  for (let s = 0; s < shelves; s++) {
    const sy = y + 8 + (s + 1) * ((h - 22) / shelves); g.fillStyle = 'rgba(180,200,196,0.55)'; g.fillRect(x + 6, sy - 2, w - 12, 2);
    for (let bx = x + 10; bx < x + w - 14; bx += r.range(10, 16)) { const bh = r.range(10, 18), col = r.pick(['#c86a3a', '#4aa070', '#d8d0a0', '#5a86c8', '#a84a4a']); if (r.next() < 0.25) continue; g.fillStyle = col; g.globalAlpha = 0.85; g.fillRect(bx, sy - 2 - bh, 7, bh); g.fillStyle = '#e8e2c8'; g.fillRect(bx + 1, sy - 2 - bh - 3, 5, 3); g.globalAlpha = 1; }
  }
  g.fillStyle = lin(g, x, y, x + w, y + h, [[0, 'rgba(255,255,255,0.18)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0.06)']]); g.fillRect(x + 6, y + 8, w - 12, h - 22);
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + w * 0.3, y + 10); g.lineTo(x + w * 0.5, y + h * 0.6); g.lineTo(x + w * 0.4, y + h - 16); g.stroke();
  g.fillStyle = '#20282a'; g.fillRect(x + w / 2 - 1, y + 8, 2, h - 22);
  drips(g, r, x, y, w, 3, '90,44,16', 0.25, h * 0.5);
});
def('mt_tank', (g, d, r, p) => {   // chem tank with glowing green fluid
  const w = Math.min(d.w - 8, 76), x = d.x + (d.w - w) / 2, fy = d.y + d.h, h = d.h - 22, y = d.y + 6;
  contact(g, x + 5, fy - 5, w, 6, 0.4);
  metal(g, x - 4, fy - 18, w + 8, 16, [72, 78, 76]);
  const col = p.col || '90,255,110';
  g.fillStyle = 'rgba(8,24,12,0.9)'; rr(g, x + 4, y, w - 8, h - 6, 14); g.fill();
  g.save(); rr(g, x + 4, y, w - 8, h - 6, 14); g.clip();
  const fillTop = y + h * 0.18;
  g.fillStyle = lin(g, 0, fillTop, 0, y + h, [[0, 'rgba(' + col + ',0.75)'], [1, 'rgba(30,140,50,0.9)']]); g.fillRect(x, fillTop, w, h);
  for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(220,255,220,' + r.range(0.2, 0.6) + ')'; g.beginPath(); g.arc(x + r.range(10, w - 10), r.range(fillTop + 10, y + h - 12), r.range(1.2, 3.6), 0, 7); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(x + 10, y + 6, 5, h * 0.7);
  g.restore();
  glow(g, x + w / 2, y + h * 0.5, w * 1.5, col, 0.28);
  g.strokeStyle = 'rgba(210,230,220,0.6)'; g.lineWidth = 2; rr(g, x + 4, y, w - 8, h - 6, 14); g.stroke();
  metal(g, x, y - 4, w, 10, [80, 86, 84]); metal(g, x, y + h - 10, w, 10, [80, 86, 84]);
  for (const bx of [x + 6, x + w - 6]) { bolt(g, bx, y + 1, 2); bolt(g, bx, y + h - 5, 2); }
  g.strokeStyle = '#1a2022'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + w - 2, y + h - 22); g.lineTo(x + w + 20, y + h - 22); g.lineTo(x + w + 20, fy - 10); g.stroke();
  drips(g, r, x, y + h - 4, w, 2, '60,200,80', 0.4, 20);
});
def('mt_lab', (g, d, r, p) => {   // lab bench with glassware, burner, centrifuge; floor-anchored
  const x = d.x + 4, w = d.w - 8, fy = d.y + d.h, by = fy - 34;
  contact(g, x + 3, fy - 4, w, 5, 0.4);
  g.fillStyle = lin(g, 0, by, 0, fy, [[0, '#5a6462'], [1, '#1e2624']]); g.fillRect(x, by + 6, w, 28);
  metal(g, x - 3, by, w + 6, 8, [140, 148, 144]);
  g.fillStyle = 'rgba(0,0,0,0.5)'; for (let cx = x + 8; cx < x + w - 6; cx += 32) g.fillRect(cx, by + 12, 1.5, 22);
  const items = ['flask', 'tube', 'beaker', 'burner', 'cent', 'flask', 'beaker'];
  let cx = x + 12;
  while (cx < x + w - 24) {
    const it = r.pick(items), col = r.pick(['110,255,120', '255,200,80', '120,220,255', '255,120,140']);
    if (it === 'flask') { g.fillStyle = 'rgba(200,230,220,0.35)'; g.beginPath(); g.moveTo(cx + 5, by - 26); g.lineTo(cx + 9, by - 26); g.lineTo(cx + 9, by - 14); g.lineTo(cx + 15, by - 1); g.lineTo(cx - 1, by - 1); g.lineTo(cx + 5, by - 14); g.closePath(); g.fill(); g.fillStyle = 'rgba(' + col + ',0.7)'; g.beginPath(); g.moveTo(cx + 1, by - 6); g.lineTo(cx + 13, by - 6); g.lineTo(cx + 15, by - 1); g.lineTo(cx - 1, by - 1); g.closePath(); g.fill(); glow(g, cx + 7, by - 6, 20, col, 0.25); cx += 24; }
    else if (it === 'tube') { for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(210,235,225,0.35)'; g.fillRect(cx + k * 6, by - 26, 4.5, 26); g.fillStyle = 'rgba(' + col + ',0.65)'; g.fillRect(cx + k * 6, by - 12 - k * 3, 4.5, 12 + k * 3); } g.fillStyle = '#2a3032'; g.fillRect(cx - 2, by - 3, 22, 3); cx += 28; }
    else if (it === 'beaker') { g.fillStyle = 'rgba(210,235,225,0.32)'; g.fillRect(cx, by - 20, 14, 20); g.fillStyle = 'rgba(' + col + ',0.6)'; g.fillRect(cx + 1, by - 12, 12, 12); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(cx + 2, by - 20, 2, 18); cx += 22; }
    else if (it === 'burner') { g.fillStyle = '#20282a'; g.fillRect(cx + 2, by - 8, 12, 8); g.fillStyle = '#ffd070'; g.beginPath(); g.ellipse(cx + 8, by - 13, 2.6, 6, 0, 0, 7); g.fill(); glow(g, cx + 8, by - 13, 34, '255,170,70', 0.45); cx += 24; }
    else { g.fillStyle = lin(g, cx, 0, cx + 26, 0, [[0, '#4a5254'], [0.5, '#8a9490'], [1, '#2a3234']]); g.beginPath(); g.ellipse(cx + 13, by - 8, 13, 8, 0, 0, 7); g.fill(); g.fillStyle = '#0c1214'; g.beginPath(); g.ellipse(cx + 13, by - 10, 8, 4, 0, 0, 7); g.fill(); cx += 32; }
  }
  drips(g, r, x, by + 8, w, 3, '40,140,60', 0.35, 26);
});
def('mt_rig', (g, d, r, p) => {   // Sleeper Five's Jet injector rig + remains; floor-anchored
  const x = d.x, w = d.w, fy = d.y + d.h, h = d.h;
  contact(g, x + 6, fy - 5, w - 8, 7, 0.45);
  metal(g, x + 10, fy - 14, w - 20, 14, [70, 78, 76]);   // base plate
  g.fillStyle = '#c9a51c'; for (let hx = x + 12; hx < x + w - 24; hx += 24) g.fillRect(hx, fy - 6, 12, 3);
  // frame + seat
  const sx = x + w * 0.42;
  metal(g, sx - 6, fy - h * 0.72, 8, h * 0.72 - 14, [92, 98, 96], true); metal(g, sx + 28, fy - h * 0.72, 8, h * 0.72 - 14, [92, 98, 96], true);
  metal(g, sx - 6, fy - h * 0.72, 42, 8, [100, 106, 104]);
  g.fillStyle = lin(g, 0, fy - 42, 0, fy - 20, [[0, '#4a3a2c'], [1, '#22180e']]); rr(g, sx - 2, fy - 42, 34, 24, 5); g.fill();   // seat
  g.fillStyle = lin(g, sx, 0, sx + 10, 0, [[0, '#3a2c20'], [1, '#22180e']]); rr(g, sx - 8, fy - 88, 14, 50, 5); g.fill();   // back
  // remains: skeleton in a faded vault suit slumped in the seat
  g.fillStyle = 'rgba(42,88,158,0.9)'; rr(g, sx + 2, fy - 82, 24, 46, 6); g.fill(); g.fillStyle = '#e8c53a'; g.fillRect(sx + 2, fy - 62, 24, 3);
  g.fillStyle = '#d4ccb2'; g.beginPath(); g.arc(sx + 18, fy - 92, 9, 0, 7); g.fill(); g.fillRect(sx + 13, fy - 86, 10, 6);
  g.fillStyle = '#0a0806'; g.beginPath(); g.ellipse(sx + 15, fy - 93, 2, 2.6, 0, 0, 7); g.ellipse(sx + 21, fy - 93, 2, 2.6, 0, 0, 7); g.fill();
  g.strokeStyle = '#d4ccb2'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx + 26, fy - 74); g.lineTo(sx + 44, fy - 56); g.lineTo(sx + 40, fy - 36); g.moveTo(sx + 6, fy - 40); g.lineTo(sx - 4, fy - 20); g.lineTo(sx + 6, fy - 14); g.stroke();
  // injector arm + tubes + glowing vials
  g.strokeStyle = '#1a2022'; g.lineWidth = 5; g.beginPath(); g.moveTo(sx + 32, fy - h * 0.72 + 4); g.lineTo(sx + 58, fy - h * 0.72 + 20); g.lineTo(sx + 50, fy - 66); g.stroke();
  g.strokeStyle = '#8a929a'; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = 'rgba(120,200,255,0.8)'; rr(g, sx + 44, fy - 70, 12, 18, 3); g.fill(); glow(g, sx + 50, fy - 60, 50, '110,200,255', 0.6);
  g.strokeStyle = '#0c0e10'; g.lineWidth = 2.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(sx + 50, fy - 52); g.bezierCurveTo(sx + 70 + i * 10, fy - 40, sx + 80 + i * 8, fy - 20, x + w - 8 - i * 10, fy - 14); g.stroke(); }
  for (let i = 0; i < 3; i++) { const vx = x + w - 40 + i * 12; g.fillStyle = 'rgba(' + ['120,255,120', '255,210,90', '120,210,255'][i] + ',0.8)'; rr(g, vx, fy - 60, 8, 22, 3); g.fill(); }
  metal(g, x + w - 44, fy - 40, 40, 26, [60, 66, 64]); g.fillStyle = '#04120a'; g.fillRect(x + w - 40, fy - 36, 32, 14); g.fillStyle = '#2cff86'; g.globalAlpha = 0.8; for (let i = 0; i < 3; i++) g.fillRect(x + w - 38, fy - 34 + i * 4, 12 + i * 6, 1.6); g.globalAlpha = 1;
  glow(g, x + w - 24, fy - 30, 60, '60,255,140', 0.35);
  blotch(g, r, x, fy - h, w, h, 3, '10,8,6', 0.3);
});
def('mt_warning', (g, d, r, p) => {   // big hazard warning board with a radiation trefoil
  const w = Math.min(d.w, 190), h = Math.min(d.h, 150), x = d.x + (d.w - w) / 2, y = d.y + (d.h - h) / 2;
  contact(g, x + 4, y + 6, w, h, 0.45);
  g.fillStyle = lin(g, 0, y, 0, y + h, [[0, '#d8b418'], [1, '#a88808']]); rr(g, x, y, w, h, 6); g.fill();
  g.strokeStyle = '#141008'; g.lineWidth = 4; rr(g, x + 4, y + 4, w - 8, h - 8, 4); g.stroke();
  g.fillStyle = '#141008'; g.fillRect(x + 4, y + 4, w - 8, 24); text(g, p.head || 'DANGER', x + w / 2, y + 17, 17, '#f2d24a');
  const tx = x + w / 2, ty = y + 78, R = 30;
  g.fillStyle = '#141008'; g.beginPath(); g.arc(tx, ty, R, 0, 7); g.fill(); g.fillStyle = '#e6c020'; for (let k = 0; k < 3; k++) { const a0 = k * 2.094 - 1.57 - 0.52, a1 = a0 + 1.047; g.beginPath(); g.moveTo(tx, ty); g.arc(tx, ty, R - 5, a0, a1); g.closePath(); g.fill(); }
  g.fillStyle = '#141008'; g.beginPath(); g.arc(tx, ty, 6, 0, 7); g.fill();
  const lines = (p.lines || ['RADIATION THERAPY', 'IN PROGRESS']); lines.forEach((l, i) => text(g, l, x + w / 2, y + h - 28 + i * 13, 10, '#141008'));
  for (const bx of [x + 10, x + w - 10]) for (const by of [y + 34, y + h - 10]) bolt(g, bx, by, 2.2, [70, 60, 30]);
  g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 6; i++) g.fillRect(x + r.range(6, w - 12), y + r.range(30, h - 12), r.range(4, 14), r.range(2, 8));
  drips(g, r, x, y + h, w, 3, '20,14,8', 0.4, 26);
});
def('mt_rack', (g, d, r, p) => {   // security depot weapon rack / locker wall
  const x = d.x + 4, w = d.w - 8, y = d.y + 4, h = d.h - 8, fy = d.y + d.h; contact(g, x + 4, fy - 4, w, 5, 0.35);
  metal(g, x, y, w, h, [56, 66, 62]); g.fillStyle = '#0a0f0e'; g.fillRect(x + 6, y + 10, w - 12, h - 20);
  const rows = Math.max(1, Math.floor((h - 20) / 30));
  for (let s = 0; s < rows; s++) { const sy = y + 12 + s * 30; g.fillStyle = 'rgba(160,170,166,0.45)'; g.fillRect(x + 6, sy + 24, w - 12, 3);
    for (let gx = x + 12; gx < x + w - 14; gx += r.range(18, 28)) { if (r.next() < 0.35) continue; g.fillStyle = r.pick(['#2a2c2a', '#3a3428', '#22262a']); g.fillRect(gx, sy + r.range(0, 6), 5, 24); g.fillStyle = '#141614'; g.fillRect(gx - 3, sy + 8, 11, 5); } }
  g.fillStyle = lin(g, x, y, x + w, y + h, [[0, 'rgba(255,255,255,0.14)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(x + 6, y + 10, w - 12, h - 20);
  text(g, p.text || 'ARMORY', x + w / 2, y + 6, 8, '#d8d0a0'); drips(g, r, x, y + h, w, 3, '90,44,16', 0.3, 20);
});
def('mt_sandbags', (g, d, r) => {
  const x = d.x, w = d.w, fy = d.y + d.h; contact(g, x + 3, fy - 3, w, 5, 0.4);
  for (let row = 0; row < 3; row++) for (let bx = x + (row % 2) * 10; bx < x + w - 20; bx += 24) { const by = fy - 12 - row * 11; g.fillStyle = lin(g, 0, by, 0, by + 12, [[0, rgb(shade([148, 132, 96], 1.1))], [1, rgb(shade([100, 88, 62], 0.7))]]); rr(g, bx, by, 24, 12, 5); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1; g.stroke(); }
});
def('mt_crates', (g, d, r) => {
  const x = d.x, w = d.w, fy = d.y + d.h; contact(g, x + 3, fy - 3, w, 5, 0.4);
  let cx = x + 4; while (cx < x + w - 24) { const s = r.range(24, 40); g.fillStyle = lin(g, cx, 0, cx + s, 0, [[0, '#7a5a38'], [1, '#3e2c18']]); g.fillRect(cx, fy - s, s, s); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2; g.strokeRect(cx + 1, fy - s + 1, s - 2, s - 2); g.beginPath(); g.moveTo(cx, fy - s); g.lineTo(cx + s, fy); g.stroke(); g.fillStyle = 'rgba(255,230,180,0.2)'; g.fillRect(cx, fy - s, s, 1.4); cx += s + r.range(0, 8); }
});
def('mt_barrier', (g, d, r) => {   // striped road barrier
  const x = d.x + 4, w = d.w - 8, fy = d.y + d.h; contact(g, x + 3, fy - 3, w, 5, 0.35);
  g.fillStyle = '#20242a'; g.fillRect(x + 6, fy - 26, 4, 26); g.fillRect(x + w - 10, fy - 26, 4, 26);
  g.save(); g.beginPath(); g.rect(x, fy - 30, w, 12); g.clip(); g.fillStyle = '#c9a51c'; g.fillRect(x, fy - 30, w, 12); g.fillStyle = '#16140f'; for (let sx = x - 12; sx < x + w + 12; sx += 20) { g.beginPath(); g.moveTo(sx, fy - 18); g.lineTo(sx + 9, fy - 18); g.lineTo(sx + 21, fy - 30); g.lineTo(sx + 12, fy - 30); g.fill(); } g.restore();
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, fy - 30, w, 12); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x, fy - 30, w, 1.4);
});
def('mt_ghoulmark', (g, d, r) => {   // crude green handprints / scratches on a wall
  const x = d.x, y = d.y, w = d.w, h = d.h;
  g.strokeStyle = 'rgba(120,220,90,0.55)'; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const px = x + r.range(6, w - 6), py = y + r.range(6, h - 30); g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(px + k * 6, py); g.lineTo(px + k * 6 + r.range(-2, 2), py + r.range(14, 30)); } g.stroke(); }
  glow(g, x + w / 2, y + h / 2, w * 0.7, '110,255,90', 0.12);
});
})();
