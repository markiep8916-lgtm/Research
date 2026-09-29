// Robot enemy art: RobCo Eyebot, pre-war security turret, Mr. Handy.   CD.art.<name>(ctx, e, G, flashOnly)
//
// Everything is painted procedurally, no external assets. Static bodies are baked once into supersampled (4x) offscreen
// canvases: multi-stop metal gradients, specular sheen and glints, rivets, seams, stencils and dents, then a per-pixel
// rust / grime / paint-chip / grain pass. Left- and right-facing bakes are lit separately so the key light stays upper-left
// after the draw-time mirror. Only the moving and emissive parts (eye lens and iris, LEDs, arms, saw, flames, muzzle flash,
// smoke) are drawn per frame. The art is "fully lit albedo" for the game's multiply lighting: nothing is artificially darkened.
//
// Reads from `e`: cx, cy, face, t, vx, vy, state, atkK, alert, stun, dead / hp, recoil, aimA, mount, mountDir, spec / home
// (spec / home only pick a paint variant and phase offsets). `G.player` is optional: when present the eyes track it and the
// Handy's flamer aims at it. Alpha is honoured (wreck fade-out, additive hit-flash pass), and during `flashOnly` the
// emissive extras are skipped so they do not double up. Sprite sets are also warmed shortly after load (see the end of the file).
(function () {
'use strict';
const CD = window.CD, U = CD.U;
CD.art = CD.art || {};

const SS = 4;                      // supersampling of baked parts
const TAU = Math.PI * 2;
const clamp = U.clamp, lerp = U.lerp;
let BA = 1;                        // the caller's globalAlpha on entry (wreck fade-out, hit-flash pass): every alpha set here is relative to it
let FO = false;                    // true while the caller re-draws the art additively for a hit flash: skip emissive extras, they would double up

// ------------------------------------------------------------------ light / colour helpers
// Key light direction (unit-ish, pointing TOWARD the light) in the local space of whatever is being baked.
// Left-facing bakes flip LX so that the world-space light stays upper-left after the mirror at draw time.
let LX = -0.45, LY = -0.89, DIR = 1, TFY = 1;   // TFY: -1 while baking geometry that is mirrored vertically (keeps stencil text upright)
function withDir(dir, fn) {
  const pl = LX, py = LY, pd = DIR, pf = TFY; DIR = dir; LX = -0.45 * dir; LY = -0.89; TFY = 1;
  try { return fn(); } finally { LX = pl; LY = py; DIR = pd; TFY = pf; }
}
function guarded(fn) {         // run a bake and always restore the module-level light state, even if it throws
  const pl = LX, py = LY, pd = DIR, pf = TFY;
  try { return fn(); } finally { LX = pl; LY = py; DIR = pd; TFY = pf; }
}
function tone(c, f) {          // f < 1 darkens (with a slightly cool shadow), f > 1 lifts toward warm white
  c = U.hex(c); let r, g, b;
  if (f <= 1) { r = c[0] * f * 0.96; g = c[1] * f * 0.985; b = c[2] * f * 1.04; }
  else { const t = Math.min(1, (f - 1) * 0.9); r = c[0] + (255 - c[0]) * t; g = c[1] + (248 - c[1]) * t; b = c[2] + (236 - c[2]) * t; }
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}
const css = (c, a) => U.rgb(c, a);
const T = (c, f, a) => U.rgb(tone(c, f), a);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mixc = (a, b, t) => U.mix(a, b, t);

// ------------------------------------------------------------------ baking
function part(w, h, ox, oy, fn, o) {
  o = o || {};
  const ss = o.ss || SS;
  const c = U.canvas(w * ss, h * ss), g = c.getContext('2d', o.weather ? { willReadFrequently: true } : undefined);
  g.setTransform(ss, 0, 0, ss, ox * ss, oy * ss); g.lineJoin = 'round'; g.lineCap = 'round';
  fn(g);
  const p = { c, w, h, ox, oy, ss };
  if (o.weather) weather(p, o.weather);
  if (o.post) { g.setTransform(ss, 0, 0, ss, ox * ss, oy * ss); g.lineJoin = 'round'; g.lineCap = 'round'; o.post(g); }
  if (o.weather) { const out = U.canvas(c.width, c.height); out.getContext('2d').drawImage(c, 0, 0); p.c = out; }   // hand the renderer a plain (GPU-friendly) copy of the CPU-side bake
  return p;
}
function put(ctx, p, x, y) { ctx.drawImage(p.c, (x || 0) - p.ox, (y || 0) - p.oy, p.w, p.h); }
// Draw an axis-symmetric baked part, mirrored across its own axis when its lit side would face away from the key light.
// dv = dot(local "up" normal, light direction); inside a narrow band around 0 both versions cross-fade so the highlight never pops.
function litSprite(ctx, spr, dv, x, y) {
  const b = 0.22;
  if (dv >= b) { put(ctx, spr, x, y); return; }
  if (dv <= -b) { ctx.save(); ctx.scale(1, -1); put(ctx, spr, x, y); ctx.restore(); return; }
  const w = (dv + b) / (2 * b), ga = ctx.globalAlpha;
  ctx.save(); ctx.scale(1, -1); ctx.globalAlpha = ga * (1 - w); put(ctx, spr, x, y); ctx.restore();
  ctx.globalAlpha = ga * w; put(ctx, spr, x, y); ctx.globalAlpha = ga;
}

function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r); g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r); g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath();
}
function poly(g, pts) { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
function label(g, str, x, y, size, col, ang) {
  g.save(); g.translate(x, y); if (ang) g.rotate(ang); g.scale(DIR, TFY);
  g.font = 'bold ' + size + 'px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(str, 0, 0); g.restore();
}

// ---- metal primitives ------------------------------------------------------------------
// sphere / ellipsoid shading; caller has set the clip.
function sphereFill(g, cx, cy, rx, ry, base, hi) {
  const hx = cx + LX * rx * 0.45, hy = cy + LY * ry * 0.45;
  const gr = g.createRadialGradient(hx, hy, Math.min(rx, ry) * 0.05, cx - LX * rx * 0.1, cy - LY * ry * 0.1, Math.max(rx, ry) * 1.15);
  gr.addColorStop(0, T(base, hi || 1.55)); gr.addColorStop(0.18, T(base, 1.26)); gr.addColorStop(0.46, T(base, 1.0)); gr.addColorStop(0.76, T(base, 0.64)); gr.addColorStop(1, T(base, 0.34));
  g.fillStyle = gr; g.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 + 4);
}
function bounce(g, cx, cy, rx, ry, col, a) {     // warm bounce light creeping in from the lower rim
  const bx = cx - LX * rx * 1.0, by = cy - LY * ry * 1.0;
  const gr = g.createRadialGradient(bx, by, 0, bx, by, Math.max(rx, ry) * 0.95);
  gr.addColorStop(0, css(col, a)); gr.addColorStop(1, css(col, 0));
  g.fillStyle = gr; g.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 + 4);
}
function sheen(g, cx, cy, rx, ry, a) {           // cool sky reflection + broad soft sheen + crisp glint + rim line on the lit side
  let gr = g.createLinearGradient(0, cy - ry, 0, cy + ry * 0.1);
  gr.addColorStop(0, 'rgba(214,232,255,' + (0.2 * a) + ')'); gr.addColorStop(1, 'rgba(214,232,255,0)');
  g.fillStyle = gr; g.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 + 4);
  const sx = cx + LX * rx * 0.52, sy = cy + LY * ry * 0.52;
  gr = g.createRadialGradient(sx, sy, 0, sx, sy, Math.max(rx, ry) * 0.6);
  gr.addColorStop(0, 'rgba(255,252,240,' + (0.62 * a) + ')'); gr.addColorStop(1, 'rgba(255,252,240,0)');
  g.fillStyle = gr; g.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 + 4);
  g.save(); g.translate(cx + LX * rx * 0.6, cy + LY * ry * 0.62); g.rotate(Math.atan2(LY, LX) + Math.PI / 2);
  g.fillStyle = 'rgba(255,255,250,' + (0.85 * a) + ')'; g.beginPath(); g.ellipse(0, 0, Math.max(rx, ry) * 0.16, Math.max(rx, ry) * 0.055, 0, 0, TAU); g.fill();
  g.restore();
  g.save(); g.strokeStyle = 'rgba(255,250,236,' + (0.3 * a) + ')'; g.lineWidth = 0.55; g.beginPath();
  const a0 = Math.atan2(LY, LX); g.ellipse(cx, cy, rx - 0.45, ry - 0.45, 0, a0 - 0.55, a0 + 0.55); g.stroke(); g.restore();
}
// cylinder gradient stops across its width; lit side toward the key light
function cylStops(base, lightFirst, o) {
  o = o || {};
  const s = [[0, 0.5], [0.1, 0.86], [0.27, o.hi || 1.5], [0.42, 1.12], [0.68, 0.72], [0.9, 0.5], [1, 0.62]];
  return s.map((q) => lightFirst ? [q[0], T(base, q[1])] : [1 - q[0], T(base, q[1])]);
}
function cylFill(g, x, y, w, h, base, vertical, o) {   // filled rect shaded as a cylinder; vertical=true -> axis along y (gradient across x)
  let gr, lightFirst;
  if (vertical) { lightFirst = LX < 0; gr = g.createLinearGradient(x, 0, x + w, 0); }
  else { lightFirst = LY < 0; gr = g.createLinearGradient(0, y, 0, y + h); }
  for (const s of cylStops(base, lightFirst, o).sort((a, b) => a[0] - b[0])) gr.addColorStop(s[0], s[1]);
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
function slabFill(g, x, y, w, h, base, o) {           // flat plate: lit top edge, darker below, slight side falloff
  o = o || {};
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, T(base, o.hi || 1.35)); gr.addColorStop(0.15, T(base, 1.1)); gr.addColorStop(0.7, T(base, 0.82)); gr.addColorStop(1, T(base, 0.55));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}
// recessed seam: dark wall on the lit side, bright lip on the far wall
function groove(g, pathFn, w, a) {
  w = w || 0.45; a = a === undefined ? 0.7 : a;
  g.save();
  g.translate(-LX * w * 0.9, -LY * w * 0.9); g.lineWidth = w * 0.9; g.strokeStyle = 'rgba(255,250,236,' + (0.34 * a / 0.7) + ')'; g.beginPath(); pathFn(g); g.stroke();
  g.translate(LX * w * 1.8, LY * w * 1.8); g.lineWidth = w * 1.1; g.strokeStyle = 'rgba(14,10,6,' + a + ')'; g.beginPath(); pathFn(g); g.stroke();
  g.restore();
}
function rivet(g, x, y, r, base) {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.42)'; g.beginPath(); g.arc(x - LX * r * 0.5, y - LY * r * 0.5, r * 1.05, 0, TAU); g.fill();
  const gr = g.createRadialGradient(x + LX * r * 0.4, y + LY * r * 0.4, r * 0.08, x, y, r * 1.05);
  gr.addColorStop(0, T(base, 1.75)); gr.addColorStop(0.5, T(base, 1.0)); gr.addColorStop(1, T(base, 0.42));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(10,8,6,0.5)'; g.lineWidth = r * 0.22; g.stroke();
  g.fillStyle = 'rgba(255,255,250,0.7)'; g.beginPath(); g.arc(x + LX * r * 0.38, y + LY * r * 0.4, r * 0.2, 0, TAU); g.fill();
  g.restore();
}
function bolt(g, x, y, r, base, ang) {      // hex bolt head
  g.save(); g.translate(x, y); g.rotate(ang || 0);
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.lineTo(Math.cos(a) * r - LX * r * 0.35, Math.sin(a) * r - LY * r * 0.35); } g.closePath(); g.fill();
  const gr = g.createLinearGradient(LX * r, LY * r, -LX * r, -LY * r);
  gr.addColorStop(0, T(base, 1.6)); gr.addColorStop(0.5, T(base, 0.95)); gr.addColorStop(1, T(base, 0.45));
  g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
  g.strokeStyle = 'rgba(10,8,6,0.55)'; g.lineWidth = r * 0.16; g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(0, 0, r * 0.52, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,250,0.35)'; g.beginPath(); g.arc(LX * r * 0.3, LY * r * 0.3, r * 0.3, 0, TAU); g.fill();
  g.restore();
}
function screw(g, x, y, r, ang) {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(x - LX * r * 0.4, y - LY * r * 0.4, r * 1.05, 0, TAU); g.fill();
  const gr = g.createRadialGradient(x + LX * r * 0.35, y + LY * r * 0.35, 0, x, y, r);
  gr.addColorStop(0, 'rgb(214,212,204)'); gr.addColorStop(1, 'rgb(84,84,82)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = r * 0.34; g.beginPath(); g.moveTo(x - Math.cos(ang || 0.6) * r * 0.75, y - Math.sin(ang || 0.6) * r * 0.75); g.lineTo(x + Math.cos(ang || 0.6) * r * 0.75, y + Math.sin(ang || 0.6) * r * 0.75); g.stroke();
  g.restore();
}
function drip(g, x, y, len, w, col, a) {        // vertical run-off streak (rust / grime), fades out downward
  const gr = g.createLinearGradient(0, y, 0, y + len);
  gr.addColorStop(0, css(col, a)); gr.addColorStop(0.55, css(col, a * 0.55)); gr.addColorStop(1, css(col, 0));
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - w * 0.5, y); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.22, y + len); g.lineTo(x - w * 0.22, y + len); g.closePath(); g.fill();
}
function scratches(g, rnd, n, x0, y0, x1, y1, len, a) {
  for (let i = 0; i < n; i++) {
    const x = rnd.range(x0, x1), y = rnd.range(y0, y1), an = rnd.range(-0.9, 0.9) + (rnd.chance(0.5) ? 0 : Math.PI / 2), l = rnd.range(len * 0.4, len);
    g.strokeStyle = rnd.chance(0.6) ? 'rgba(255,250,236,' + a + ')' : 'rgba(10,8,6,' + a * 0.8 + ')'; g.lineWidth = rnd.range(0.12, 0.26);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke();
  }
}
function soot(g, x, y, r, a, sx, sy) {           // scorch / oil smear
  g.save(); g.translate(x, y); g.scale(sx || 1, sy || 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, 'rgba(14,10,8,' + a + ')'); gr.addColorStop(0.55, 'rgba(24,18,12,' + a * 0.5 + ')'); gr.addColorStop(1, 'rgba(24,18,12,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
}
function dent(g, x, y, rx, ry, rot, a) {         // concave dent: shadowed on the lit side, bright lip on the far side
  g.save(); g.translate(x, y); g.rotate(rot || 0);
  const gr = g.createLinearGradient(LX * rx, LY * ry, -LX * rx, -LY * ry);
  gr.addColorStop(0, 'rgba(0,0,0,' + (0.5 * a) + ')'); gr.addColorStop(0.5, 'rgba(0,0,0,' + (0.1 * a) + ')'); gr.addColorStop(1, 'rgba(255,250,236,' + (0.34 * a) + ')');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,' + (0.32 * a) + ')'; g.lineWidth = 0.28; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, Math.PI * 0.8, Math.PI * 1.75); g.stroke();
  g.restore();
}

// ------------------------------------------------------------------ weathering (per-pixel rust, grime, paint chips)
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0; const row = y * w;
    for (let x = -r; x <= r; x++) acc += x >= 0 && x < w ? src[row + x] : 0;
    for (let x = 0; x < w; x++) { tmp[row + x] = acc / n; const xo = x - r, xi = x + r + 1; if (xo >= 0) acc -= src[row + xo]; if (xi < w) acc += src[row + xi]; }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += y >= 0 && y < h ? tmp[y * w + x] : 0;
    for (let y = 0; y < h; y++) { out[y * w + x] = acc / n; const yo = y - r, yi = y + r + 1; if (yo >= 0) acc -= tmp[yo * w + x]; if (yi < h) acc += tmp[yi * w + x]; }
  }
  return out;
}
// o: { seed, rust, grime, th (rust threshold, higher = less rust), rf, eb (edge bias), bb (bottom bias), yMid, yRange, chip, streak, edgeR, mask(x,y), bias(x,y) }
// The noise fields are cached on `o` so left/right-facing bakes of one part share them.
function weather(p, o) {
  const c = p.c, w = c.width, h = c.height, g = c.getContext('2d'), ss = p.ss;
  const img = g.getImageData(0, 0, w, h), d = img.data, n = w * h;
  let F = o._f;
  if (!F) {
    F = o._f = { rm: new Float32Array(n), rr: new Float32Array(n), rg: new Float32Array(n), rb: new Float32Array(n), gm: new Float32Array(n), ch: new Float32Array(n), st: new Float32Array(n) };
    const seed = o.seed | 0, al = new Float32Array(n);
    for (let i = 0; i < n; i++) al[i] = d[i * 4 + 3] / 255;
    const bl = boxBlur(al, w, h, Math.max(2, Math.round((o.edgeR || 2) * ss)));
    const rf = o.rf || 0.2, th = o.th === undefined ? 0.6 : o.th;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const k = j * w + i; if (d[k * 4 + 3] < 6) continue;
        const x = i / ss - p.ox, y = j / ss - p.oy;
        const m = o.mask ? o.mask(x, y) : 1; if (m <= 0.01) continue;
        const edge = clamp((1 - bl[k]) * 2.2, 0, 1);
        const nb = U.fbm(x * rf, y * rf, 3, seed);
        const bot = clamp((y - (o.yMid || 0)) / (o.yRange || 12), 0, 1);
        const v = nb + (o.eb === undefined ? 0.28 : o.eb) * edge + (o.bb === undefined ? 0.2 : o.bb) * bot + (o.bias ? o.bias(x, y) : 0) - th;
        let rm = smooth(0, 0.17, v);
        if (rm > 0) {
          const nf = U.vnoise(x * 1.9, y * 1.9, seed + 5); rm *= 0.55 + 0.45 * nf;
          const rn = U.fbm(x * 0.8 + 13, y * 0.8, 2, seed + 9);
          F.rm[k] = rm * m; F.rr[k] = lerp(74, 200, rn); F.rg[k] = lerp(36, 106, rn); F.rb[k] = lerp(18, 46, rn);
        }
        const gn = U.fbm(x * 0.17 + 40, y * 0.17, 3, seed + 21);
        F.gm[k] = smooth(0.4, 0.85, gn) * m;
        F.st[k] = smooth(0.62, 0.95, U.vnoise(x * 1.25, y * 0.07, seed + 33)) * m * (o.streakY === undefined ? 1 : smooth(o.streakY, o.streakY + 4, y));
        const cn = U.vnoise(x * 2.7, y * 2.7, seed + 55);
        F.ch[k] = clamp((cn - (0.93 - edge * 0.14 - bot * 0.03)) * 16, 0, 1) * m;
      }
    }
  }
  const rustA = o.rust === undefined ? 0.8 : o.rust, grime = o.grime === undefined ? 0.5 : o.grime, streak = o.streak || 0, chip = o.chip || 0, grain = o.grain === undefined ? 0.06 : o.grain;
  for (let k = 0; k < n; k++) {
    const q = k * 4; if (d[q + 3] < 6) continue;
    let r = d[q], g2 = d[q + 1], b = d[q + 2];
    const lum = (r * 0.3 + g2 * 0.59 + b * 0.11) / 255;
    const rm = F.rm[k];
    if (rm > 0) { const sh = 0.36 + 0.62 * lum, k2 = rm * rustA; r += (F.rr[k] * sh - r) * k2; g2 += (F.rg[k] * sh - g2) * k2; b += (F.rb[k] * sh - b) * k2; }
    const gm = F.gm[k] * grime + F.st[k] * streak * 0.6;
    if (gm > 0) { const f = 1 - gm * 0.5; r *= f; g2 *= 1 - gm * 0.52; b *= 1 - gm * 0.58; }
    const ch = F.ch[k] * chip;
    if (ch > 0) { const bare = 0.5 + lum * 0.6; const k3 = ch * 0.75; r += (132 * bare - r) * k3; g2 += (128 * bare - g2) * k3; b += (120 * bare - b) * k3; }
    if (grain) { const gn = 1 + (((Math.imul(k, 2654435761) >>> 8) & 255) / 255 - 0.5) * grain; r *= gn; g2 *= gn; b *= gn; }
    d[q] = r; d[q + 1] = g2; d[q + 2] = b;
  }
  g.putImageData(img, 0, 0);
}

// ------------------------------------------------------------------ per-entity smoothing (colour cross-fades, flare build-up)
const SM = new WeakMap();
function smoothState(e, target, rate) {
  let s = SM.get(e);
  if (!s) { s = { t: e.t || 0, v: {} }; for (const k in target) s.v[k] = isFinite(target[k]) ? target[k] : 0; SM.set(e, s); return s.v; }
  const dt = (e.t || 0) - s.t; s.t = e.t || 0;
  if (dt > 0.3 || dt < 0) { for (const k in target) if (isFinite(target[k])) s.v[k] = target[k]; return s.v; }
  if (dt <= 0) return s.v;
  for (const k in target) { const tv = target[k]; if (isFinite(tv)) s.v[k] += (tv - s.v[k]) * (1 - Math.exp(-(rate[k] || 8) * dt)); }
  return s.v;
}
const isDead = (e) => !!(e.dead || e.state === 'dead' || (e.maxHp && e.hp <= 0));
function variantOf(e, n) {
  const sp = e.spec, h = e.home;
  if (sp && sp.tx !== undefined) return Math.floor(U.hash2(sp.tx, sp.ty, 41) * n) % n;
  if (h) return Math.floor(U.hash2(h.x | 0, h.y | 0, 41) * n) % n;
  return 0;
}
const seedOf = (e) => { const sp = e.spec, h = e.home; return sp && sp.tx !== undefined ? U.hash2(sp.tx, sp.ty, 77) * TAU : h ? U.hash2(h.x | 0, h.y | 0, 77) * TAU : 0; };

// ------------------------------------------------------------------ additive light helpers
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
  for (let k = a; k > 0.004; k -= 1) { ctx.globalAlpha = BA * (k > 1 ? 1 : k); ctx.drawImage(spr, -r, -r, r * 2, r * 2); }
  ctx.restore();
}
const _puff = {};
function puffSpr(rgbStr) {       // soft opaque-ish smoke disc (normal blending)
  let s = _puff[rgbStr];
  if (!s) {
    s = U.canvas(48, 48); const g = s.getContext('2d');
    const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, 'rgba(' + rgbStr + ',0.9)'); gr.addColorStop(0.5, 'rgba(' + rgbStr + ',0.5)'); gr.addColorStop(1, 'rgba(' + rgbStr + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 48, 48); _puff[rgbStr] = s;
  }
  return s;
}
// teardrop flame pointing along `ang` from (x,y): outer colour fades along its length, hot core on top. cols = ['r,g,b' x3]
function flame(ctx, x, y, ang, len, wid, cols, a) {
  if (FO) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalCompositeOperation = 'lighter';
  let gr = ctx.createLinearGradient(0, 0, len, 0);
  gr.addColorStop(0, 'rgba(' + cols[0] + ',' + a + ')'); gr.addColorStop(0.3, 'rgba(' + cols[1] + ',' + (a * 0.72) + ')'); gr.addColorStop(1, 'rgba(' + cols[2] + ',0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-wid * 0.15, -wid / 2); ctx.bezierCurveTo(len * 0.35, -wid * 0.64, len * 0.72, -wid * 0.26, len, 0); ctx.bezierCurveTo(len * 0.72, wid * 0.26, len * 0.35, wid * 0.64, -wid * 0.15, wid / 2); ctx.closePath(); ctx.fill();
  gr = ctx.createLinearGradient(0, 0, len * 0.6, 0);
  gr.addColorStop(0, 'rgba(255,255,255,' + Math.min(1, a) + ')'); gr.addColorStop(1, 'rgba(' + cols[1] + ',0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -wid * 0.2); ctx.quadraticCurveTo(len * 0.3, -wid * 0.26, len * 0.6, 0); ctx.quadraticCurveTo(len * 0.3, wid * 0.26, 0, wid * 0.2); ctx.closePath(); ctx.fill();
  ctx.restore();
}
const flick = (t, s) => 0.5 + 0.5 * (U.vnoise(t * 17 + s * 3.7, s * 1.3, 5) * 2 - 1) * 0.9 + 0.14 * Math.sin(t * 43 + s * 5.1);

// ================================================================== EYEBOT
// Local space: origin = hitbox centre, facing +x. Shell is a slightly squashed sphere with a curved belt band,
// a raised lens bezel on the front, a speaker grille under the eye, thruster bells beneath and a folded dish on top.
const EB = { R: 13.2, RY: 12.3, LX: 6.6, LY: -1.6, LR: 5.3, BT: 3.1 };
const ebBelt = (x) => 1.5 + 2.3 * (1 - (x * x) / (EB.R * EB.R));
const EB_PAL = [
  { top: [208, 198, 156], low: [126, 142, 124], band: [78, 82, 84], trim: [178, 170, 136], accent: [190, 66, 40] },     // cream over sea-green, red pinstripe
  { top: [156, 160, 110], low: [98, 102, 86], band: [68, 70, 66], trim: [132, 130, 98], accent: [214, 170, 50] },         // olive drab, yellow pinstripe
  { top: [178, 184, 180], low: [110, 124, 134], band: [72, 76, 82], trim: [144, 148, 150], accent: [200, 90, 40] },      // faded grey-blue, orange pinstripe
];
const EB_NOZ = [-5.2, 5.2];
const EB_NOZA = 0.3;   // splay angle of the thruster bells
const EBW = {};
function ebWeather(v, dead) {
  const key = v + (dead ? 'd' : 'a');
  return EBW[key] || (EBW[key] = {
    seed: 300 + v * 41, rust: dead ? 0.95 : 0.85, grime: dead ? 0.9 : 0.4, th: dead ? 0.6 : 0.8, rf: 0.21, yMid: -3, yRange: 15, bb: 0.16, eb: 0.2, chip: 0.7, streak: 0.45, streakY: 2.5, edgeR: 2.4,
    mask: (x, y) => smooth(5.0, 7.2, Math.hypot(x - EB.LX, y - EB.LY)),
    bias: (x, y) => { const b = ebBelt(clamp(x, -EB.R, EB.R)); const dy = y - (b + EB.BT); return (dy > -0.5 && dy < 5 ? 0.07 : 0) + (Math.abs(y - b - 1.5) < 2.2 ? 0.1 : 0); },
  });
}

function ebCollar(g, pal, dead) {
  const x = EB.LX, y = EB.LY;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 2.4 * SS; g.shadowOffsetX = -LX * 1.1 * SS; g.shadowOffsetY = -LY * 1.1 * SS;
  g.fillStyle = '#222'; g.beginPath(); g.arc(x, y, 6.8, 0, TAU); g.fill(); g.restore();
  let gr = g.createLinearGradient(x + LX * 7, y + LY * 7, x - LX * 7, y - LY * 7);
  gr.addColorStop(0, T(pal.trim, 1.75)); gr.addColorStop(0.35, T(pal.trim, 1.05)); gr.addColorStop(0.7, T(pal.band, 0.9)); gr.addColorStop(1, T(pal.band, 0.42));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, 6.85, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(10,8,6,0.55)'; g.lineWidth = 0.4; g.stroke();
  gr = g.createLinearGradient(x + LX * 6, y + LY * 6, x - LX * 6, y - LY * 6);
  gr.addColorStop(0, T(pal.band, 0.36)); gr.addColorStop(0.5, T(pal.band, 0.8)); gr.addColorStop(1, T(pal.trim, 1.55));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, 5.95, 0, TAU); g.fill();
  g.fillStyle = '#06080a'; g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.fill();
  // four screws on the bezel
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2 + 0.2; screw(g, x + Math.cos(a) * 6.4, y + Math.sin(a) * 6.4, 0.38, a); }
  // brow / eyelid hood on the top half
  g.save();
  g.beginPath(); g.arc(x, y - 0.5, 7.7, Math.PI * 1.03, Math.PI * 1.97); g.arc(x, y - 0.1, 5.5, Math.PI * 1.97, Math.PI * 1.03, true); g.closePath();
  gr = g.createLinearGradient(0, y - 8.4, 0, y - 4.5); gr.addColorStop(0, T(pal.band, 1.7)); gr.addColorStop(0.35, T(pal.band, 0.95)); gr.addColorStop(1, T(pal.band, 0.4));
  g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.35; g.stroke(); g.restore();
  rivet(g, x - 3.6, y - 6.3, 0.42, pal.trim); rivet(g, x + 3.2, y - 6.5, 0.42, pal.trim);
}

function buildEyeBody(pal, seed, dead, v) {
  const R = EB.R, RY = EB.RY, lx = EB.LX, ly = EB.LY, BT = EB.BT;
  const rnd = U.RNG(seed);
  const top = dead ? tone(pal.top, 0.7) : pal.top, low = dead ? tone(pal.low, 0.66) : pal.low;
  const shellPath = (g) => { g.beginPath(); g.ellipse(0, 0, R, RY, 0, 0, TAU); };
  const nozzlePath = (g, x) => { g.beginPath(); g.moveTo(x - 1.6, 0); g.quadraticCurveTo(x - 1.7, 2.4, x - 2.6, 3.7); g.lineTo(x + 2.6, 3.7); g.quadraticCurveTo(x + 1.7, 2.4, x + 1.6, 0); g.closePath(); };
  const noz = (g, x, fn) => { g.save(); g.translate(x, 10.3); g.rotate(x < 0 ? EB_NOZA : -EB_NOZA); g.translate(-x, 0); fn(g); g.restore(); };
  return part(32, 32, 16, 16, (g) => {
    // ---- thruster bells (tucked under the shell)
    for (const x of EB_NOZ) noz(g, x, (g) => {
      g.save(); nozzlePath(g, x); g.clip();
      cylFill(g, x - 3, -0.5, 6, 5, pal.band, true);
      g.fillStyle = T(pal.trim, 1.25); g.fillRect(x - 3, 2.7, 6, 1.1);
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x - 3, 0, 6, 1.3);
      g.restore();
      g.fillStyle = '#0a0a0c'; g.beginPath(); g.ellipse(x, 3.7, 2.55, 0.7, 0, 0, TAU); g.fill();
    });
    // ---- shell
    g.save(); shellPath(g); g.clip();
    sphereFill(g, 0, 0, R, RY, top);
    g.save(); g.beginPath(); g.moveTo(-R - 2, ebBelt(-R - 2) + BT);
    for (let x = -R - 2; x <= R + 2.01; x += 1) g.lineTo(x, ebBelt(x) + BT);
    g.lineTo(R + 2, 20); g.lineTo(-R - 2, 20); g.closePath(); g.clip();
    sphereFill(g, 0, 0, R, RY, low, 1.35);
    g.restore();
    // ---- belt band: seven tonal strokes following the curve, then curvature falloff
    const bandLine = (dy, w, style) => { g.beginPath(); for (let x = -R - 1; x <= R + 1.01; x += 0.75) { const y = ebBelt(x) + dy; x === -R - 1 ? g.moveTo(x, y) : g.lineTo(x, y); } g.lineWidth = w; g.strokeStyle = style; g.stroke(); };
    const bt = [1.5, 1.75, 1.25, 0.95, 0.7, 0.5, 0.42];
    g.lineCap = 'butt';
    for (let i = 0; i < 7; i++) bandLine(0.22 + i * (BT - 0.44) / 6, (BT - 0.44) / 6 + 0.16, T(pal.band, bt[i]));
    g.lineCap = 'round';
    g.save(); g.beginPath(); for (let x = -R - 1; x <= R + 1.01; x += 1) g.lineTo(x, ebBelt(x)); for (let x = R + 1; x >= -R - 1.01; x -= 1) g.lineTo(x, ebBelt(x) + BT); g.closePath(); g.clip();
    const fg = g.createLinearGradient(-R, 0, R, 0);
    fg.addColorStop(0, 'rgba(6,4,10,0.55)'); fg.addColorStop(0.22, 'rgba(6,4,10,0.1)'); fg.addColorStop(0.5, 'rgba(6,4,10,0)'); fg.addColorStop(0.78, 'rgba(6,4,10,0.14)'); fg.addColorStop(1, 'rgba(6,4,10,0.6)');
    g.fillStyle = fg; g.fillRect(-R - 2, -2, 2 * R + 4, 12); g.restore();
    // ---- retro pinstripe across the dome (painted, so it takes the sphere's falloff)
    {
      const sy = (x) => -6.2 + 2.1 * (1 - (x * x) / (R * R));
      const line = (dy) => { g.beginPath(); for (let x = -R - 1; x <= R + 1.01; x += 0.75) { const y = sy(x) + dy; x === -R - 1 ? g.moveTo(x, y) : g.lineTo(x, y); } };
      const sg = g.createLinearGradient(-R, 0, R, 0); sg.addColorStop(0, T(pal.accent, 0.4)); sg.addColorStop(0.3, T(pal.accent, 0.95)); sg.addColorStop(0.55, T(pal.accent, 1.15)); sg.addColorStop(1, T(pal.accent, 0.45));
      g.lineCap = 'butt'; g.strokeStyle = sg; g.lineWidth = 1.0; line(0); g.stroke();
      g.strokeStyle = sg; g.lineWidth = 0.4; line(1.4); g.stroke();
      g.strokeStyle = 'rgba(255,250,236,0.3)'; g.lineWidth = 0.22; line(-0.62); g.stroke(); g.lineCap = 'round';
    }
    // ---- seams, panels, hardware
    groove(g, (g) => { g.moveTo(-1.4, -RY + 0.3); g.quadraticCurveTo(-6.6, -6.4, -5.2, ebBelt(-5.2) - 0.1); }, 0.5);
    groove(g, (g) => { g.moveTo(-6.4, ebBelt(-6.4) + BT + 0.1); g.quadraticCurveTo(-9.8, 8.2, -7.8, 10.6); }, 0.5);
    if (!dead) {   // access hatch near the rear rim (foreshortened, as it wraps around the sphere)
      g.save(); g.translate(-10.5, -1.6); g.rotate(0.12); g.scale(0.55, 1);
      const pg = g.createLinearGradient(LX * 3, LY * 3, -LX * 3, -LY * 3); pg.addColorStop(0, T(top, 1.22)); pg.addColorStop(1, T(top, 0.74)); g.fillStyle = pg; g.beginPath(); rrect(g, -2.7, -3.3, 5.4, 6.6, 0.8); g.fill();
      groove(g, (g) => rrect(g, -2.7, -3.3, 5.4, 6.6, 0.8), 0.45);
      screw(g, -1.7, -2.4, 0.5, 0.4); screw(g, 1.7, -2.4, 0.5, 1.9); screw(g, -1.7, 2.4, 0.5, 1.2); screw(g, 1.7, 2.4, 0.5, 0.2);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(-0.5, -1, 1, 2); g.restore();
    }
    for (const x of [-12.3, -0.9]) rivet(g, x, ebBelt(x) + BT / 2, 0.55, pal.trim);
    label(g, 'ROBCO', -5.4, ebBelt(-5.4) + BT / 2 + 0.05, 1.9, 'rgba(232,226,200,0.7)', 0.14);
    // status LED socket on the belt (lit dynamically)
    g.fillStyle = '#15100c'; g.beginPath(); g.arc(-10.3, ebBelt(-10.3) + BT / 2, 0.7, 0, TAU); g.fill();
    // speaker grille under the eye
    g.save(); g.beginPath(); g.arc(5.6, 8.7, 2.5, 0, TAU); g.clip(); g.fillStyle = '#090a0b'; g.fillRect(2, 5, 8, 8);
    for (let i = 0; i < 4; i++) { const y = 7.1 + i * 0.95; const gg = g.createLinearGradient(0, y, 0, y + 0.55); gg.addColorStop(0, T(pal.trim, 1.5)); gg.addColorStop(1, T(pal.band, 0.8)); g.fillStyle = gg; g.fillRect(3, y, 5.4, 0.55); }
    g.restore();
    g.strokeStyle = T(pal.trim, 1.25); g.lineWidth = 0.55; g.beginPath(); g.arc(5.6, 8.7, 2.7, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.3; g.beginPath(); g.arc(5.6, 8.7, 3.05, 0, TAU); g.stroke();
    // ---- damage: dents, cracks, scratches, scorch
    dent(g, -3.8, -7.5, 3.3, 2.4, -0.5, 1); dent(g, -10.2, 4.6, 1.9, 1.4, 0.9, 0.9); dent(g, 1.6, 9.4, 1.6, 1.1, 0.3, 0.7);
    g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.22; g.beginPath(); g.moveTo(-6.2, -8.6); g.lineTo(-8.4, -9.8); g.moveTo(-3.6, -5.2); g.lineTo(-2.6, -3.4); g.lineTo(-3.4, -2.2); g.moveTo(-1.6, -8.0); g.lineTo(-0.4, -9.6); g.stroke();
    scratches(g, rnd, 16, -11, -10, 5, 9, 3.4, 0.34);
    soot(g, 8.6, -8.2, 3.6, dead ? 0.7 : 0.4, 1.2, 0.8); soot(g, -2, 10.5, 4, 0.3, 1.5, 0.7);
    for (const x of [-12.3, -0.9]) drip(g, x, ebBelt(x) + BT - 0.2, 4.2 + rnd.range(0, 2.2), 0.9, [150, 76, 34], 0.5);
    if (dead) {
      g.save(); g.translate(-6.0, -6.4); g.rotate(-0.55);
      g.fillStyle = '#0b0a09'; g.beginPath(); poly(g, [[-4.6, -1.8], [-1.6, -3.2], [1.6, -2.4], [4.2, -2.9], [4.9, 0.8], [2.4, 3.0], [-0.8, 2.1], [-3.8, 3.2], [-5.2, 0.5]]); g.fill();
      g.strokeStyle = 'rgba(255,236,210,0.6)'; g.lineWidth = 0.34; g.beginPath(); g.moveTo(-4.6, -1.8); g.lineTo(-1.6, -3.2); g.lineTo(1.6, -2.4); g.lineTo(4.2, -2.9); g.stroke();
      g.lineWidth = 0.42; g.strokeStyle = '#b25a2a'; g.beginPath(); g.moveTo(-2.4, 0.4); g.bezierCurveTo(-3.6, 3.0, -1.0, 4.4, -2.0, 6.0); g.stroke();
      g.strokeStyle = '#3d7fa6'; g.beginPath(); g.moveTo(0.2, 0.6); g.bezierCurveTo(1.6, 3.4, 0.2, 4.6, 1.8, 6.4); g.stroke();
      g.strokeStyle = '#2b2b2b'; g.beginPath(); g.moveTo(2.4, 0.2); g.bezierCurveTo(3.8, 2.6, 3.2, 3.8, 4.4, 5.0); g.stroke();
      g.strokeStyle = '#c9b25a'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(-0.6, 0.8); g.bezierCurveTo(-1.2, 2.2, -0.4, 3.0, -0.9, 4.2); g.stroke();
      g.restore();
      soot(g, -4, -8, 8.5, 0.6, 1, 1); soot(g, 9, 2, 6, 0.4, 1, 1); dent(g, 8.6, 5.4, 3.6, 2.6, 0.4, 1.3); dent(g, -1.2, 8.6, 3.2, 1.8, -0.3, 1.1);
    }
    bounce(g, 0, 0, R, RY, dead ? [150, 90, 50] : [255, 190, 120], 0.2);
    sheen(g, 0, 0, R, RY, dead ? 0.55 : 1);
    g.restore();
    ebCollar(g, pal, dead);
    // rust weeping from the bezel
    drip(g, lx - 2.6, ly + 6.2, 3.4, 0.8, [120, 60, 28], 0.45); drip(g, lx + 3.4, ly + 5.2, 2.6, 0.7, [30, 22, 16], 0.4);
  }, {
    weather: ebWeather(v, dead),
    post: (g) => {
      if (dead) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(12,9,7,0.36)'; g.fillRect(-16, -16, 32, 32); g.restore(); }
      g.lineWidth = 0.62; g.strokeStyle = 'rgba(10,8,6,0.62)'; shellPath(g); g.stroke();
      g.lineWidth = 0.45; for (const x of EB_NOZ) noz(g, x, (g) => { nozzlePath(g, x); g.stroke(); }); g.lineWidth = 0.62;
      g.beginPath(); g.arc(lx, ly, 6.85, 0, TAU); g.stroke();
    },
  });
}

const EB_ANT = { x: -3.7, y: -11.0 };
function buildEyeAntenna(pal, dead) {
  return part(22, 26, 11, 22, (g) => {
    const mast = (g) => { g.moveTo(0, 0); g.lineTo(-0.5, -2.6); g.lineTo(-1.5, -5.0); };
    // base collar
    g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 1.2 * SS; g.shadowOffsetX = -LX * 0.5 * SS; g.shadowOffsetY = -LY * 0.5 * SS;
    g.fillStyle = '#222'; g.fillRect(-2.5, -2.1, 5, 3); g.restore();
    cylFill(g, -2.5, -2.1, 5, 2.4, pal.band, true); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-2.5, -2.1, 5, 0.4);
    rivet(g, -1.5, -0.9, 0.34, pal.trim); rivet(g, 1.5, -0.9, 0.34, pal.trim);
    if (dead) {   // snapped mast, dish hanging by its cable
      g.lineCap = 'round'; g.strokeStyle = 'rgba(10,8,6,0.65)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -2); g.lineTo(-0.6, -4.6); g.lineTo(-2.4, -6.2); g.stroke();
      g.strokeStyle = T(pal.band, 1.2); g.lineWidth = 1.0; g.stroke();
      g.save(); g.translate(-5.4, -4.6); g.rotate(2.2);
      g.fillStyle = T(pal.band, 0.55); g.beginPath(); g.ellipse(0, 0, 4.1, 1.5, 0, 0, TAU); g.fill();
      g.fillStyle = T(pal.trim, 0.8); g.beginPath(); g.ellipse(0, -0.4, 3.6, 1.0, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.35; g.beginPath(); g.ellipse(0, 0, 4.1, 1.5, 0, 0, TAU); g.stroke(); g.restore();
      g.strokeStyle = '#2b2b2b'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(-2.4, -6.2); g.quadraticCurveTo(-3.4, -5.6, -3.6, -4.8); g.stroke();
      g.strokeStyle = 'rgba(30,26,22,0.9)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(1.4, -1.4); g.lineTo(2.1, -4.8); g.stroke();
      return;
    }
    // mast: dark outline, metal body, highlight
    g.strokeStyle = 'rgba(10,8,6,0.65)'; g.lineWidth = 1.7; g.beginPath(); mast(g); g.stroke();
    g.strokeStyle = T(pal.trim, 1.0); g.lineWidth = 1.05; g.beginPath(); mast(g); g.stroke();
    g.strokeStyle = 'rgba(255,255,246,0.55)'; g.lineWidth = 0.32; g.save(); g.translate(LX * 0.3, LY * 0.15); g.beginPath(); mast(g); g.stroke(); g.restore();
    rivet(g, -0.5, -2.6, 0.42, pal.band);
    // folded radar dish, canted back on its bracket
    g.save(); g.translate(-2.8, -6.4); g.rotate(-1.12);
    g.fillStyle = 'rgba(10,8,6,0.5)'; g.beginPath(); g.ellipse(0.3, 0.5, 4.5, 2.3, 0, 0, TAU); g.fill();
    let gr = g.createLinearGradient(0, 2.2, 0, -2.2); gr.addColorStop(0, T(pal.band, 0.5)); gr.addColorStop(1, T(pal.band, 1.05));
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 4.4, 2.2, 0, 0, TAU); g.fill();
    gr = g.createRadialGradient(-0.9, -0.6, 0.1, 0, -0.3, 4.2); gr.addColorStop(0, T(pal.trim, 1.85)); gr.addColorStop(0.6, T(pal.trim, 1.0)); gr.addColorStop(1, T(pal.trim, 0.5));
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, -0.35, 3.8, 1.6, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(10,8,6,0.62)'; g.lineWidth = 0.38; g.beginPath(); g.ellipse(0, 0, 4.4, 2.2, 0, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,250,236,0.5)'; g.lineWidth = 0.25; g.beginPath(); g.ellipse(0, 0, 4.15, 2.0, 0, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
    g.strokeStyle = T(pal.band, 1.3); g.lineWidth = 0.35; g.beginPath(); g.moveTo(0, -0.3); g.lineTo(0.2, -4.4); g.stroke(); rivet(g, 0.2, -4.6, 0.5, pal.trim);
    g.restore();
    // whip antenna + ball tip
    g.strokeStyle = 'rgba(10,8,6,0.7)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(1.3, -1.6); g.lineTo(1.9, -5.0); g.lineTo(2.4, -7.9); g.stroke();
    g.strokeStyle = T(pal.trim, 1.5); g.lineWidth = 0.36; g.stroke();
    g.fillStyle = 'rgba(10,8,6,0.7)'; g.beginPath(); g.arc(2.4, -8.2, 1.0, 0, TAU); g.fill();
    g.fillStyle = '#5a2016'; g.beginPath(); g.arc(2.4, -8.2, 0.76, 0, TAU); g.fill();
  });
}

// ---- lens: colour base + iris are direction independent; gloss overlay is baked per facing
const LENS = {
  calm: { core: [178, 238, 255], mid: [44, 150, 238], edge: [10, 40, 104], glow: '90,190,255' },
  alert: { core: [255, 216, 160], mid: [242, 52, 28], edge: [98, 8, 6], glow: '255,62,38' },
  dead: { core: [50, 54, 58], mid: [28, 30, 34], edge: [8, 8, 10], glow: '0,0,0' },
};
let EBL = null;
function ebLens() {
  if (EBL) return EBL;
  const R = EB.LR; EBL = {};
  for (const k of ['calm', 'alert', 'dead']) {
    const c = LENS[k];
    EBL['base_' + k] = part(14, 14, 7, 7, (g) => {
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
      gr.addColorStop(0, css(c.core)); gr.addColorStop(0.3, css(mixc(c.core, c.mid, 0.6))); gr.addColorStop(0.62, css(c.mid)); gr.addColorStop(0.9, css(c.edge)); gr.addColorStop(1, css(tone(c.edge, 0.5)));
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
      g.strokeStyle = css(c.core, k === 'dead' ? 0.1 : 0.2); g.lineWidth = 0.22; g.beginPath(); g.arc(0, 0, R * 0.8, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, R * 0.58, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.65)'; g.lineWidth = 0.5; g.beginPath(); g.arc(0, 0, R - 0.2, 0, TAU); g.stroke();
    }, { ss: 6 });
    if (k === 'dead') continue;
    EBL['iris_' + k] = part(10, 10, 5, 5, (g) => {
      const n = 8, Ro = 3.5, Ri = 1.55, step = TAU / n;
      for (let i = 0; i < n; i++) {
        const a0 = i * step + 0.1;
        g.beginPath();
        g.moveTo(Math.cos(a0) * Ri, Math.sin(a0) * Ri); g.lineTo(Math.cos(a0 + 0.06) * Ro, Math.sin(a0 + 0.06) * Ro);
        g.lineTo(Math.cos(a0 + step * 1.18) * Ro, Math.sin(a0 + step * 1.18) * Ro); g.lineTo(Math.cos(a0 + step * 0.72) * Ri, Math.sin(a0 + step * 0.72) * Ri); g.closePath();
        const gr = g.createRadialGradient(0, 0, Ri, 0, 0, Ro); gr.addColorStop(0, css(mixc([26, 28, 32], c.mid, 0.22))); gr.addColorStop(1, css(mixc([70, 74, 82], c.mid, 0.2)));
        g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 0.16; g.stroke();
        g.strokeStyle = css(c.core, 0.2); g.lineWidth = 0.12; g.beginPath(); g.moveTo(Math.cos(a0 + 0.06) * Ro * 0.98, Math.sin(a0 + 0.06) * Ro * 0.98); g.lineTo(Math.cos(a0) * Ri * 1.04, Math.sin(a0) * Ri * 1.04); g.stroke();
      }
      g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 0.32; g.beginPath(); g.arc(0, 0, Ro, 0, TAU); g.stroke();
      if (k === 'calm') {
        g.fillStyle = 'rgb(4,12,26)'; g.beginPath(); g.arc(0, 0, 1.28, 0, TAU); g.fill();
        g.strokeStyle = css(c.core, 0.85); g.lineWidth = 0.24; g.beginPath(); g.arc(0, 0, 1.4, 0, TAU); g.stroke();
      } else {
        g.fillStyle = 'rgb(20,2,2)'; g.beginPath(); g.ellipse(0, 0, 0.62, 1.9, 0, 0, TAU); g.fill();
        g.strokeStyle = css(c.core, 0.9); g.lineWidth = 0.24; g.beginPath(); g.ellipse(0, 0, 0.74, 2.02, 0, 0, TAU); g.stroke();
      }
    }, { ss: 6 });
  }
  return EBL;
}
function buildLensGloss(dead) {
  const R = EB.LR;
  return part(14, 14, 7, 7, (g) => {
    const a0 = Math.atan2(LY, LX);
    g.save(); g.beginPath(); g.arc(0, 0, R - 0.1, 0, TAU); g.clip();
    const gx = LX * 2.1, gy = LY * 2.1;
    const gr = g.createRadialGradient(gx * 0.9, gy * 0.9, 0, gx * 0.9, gy * 0.9, 3.7);
    gr.addColorStop(0, 'rgba(255,255,255,' + (dead ? 0.3 : 0.6) + ')'); gr.addColorStop(0.5, 'rgba(255,255,255,' + (dead ? 0.1 : 0.2) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(-R, -R, R * 2, R * 2);
    g.strokeStyle = 'rgba(255,255,255,' + (dead ? 0.35 : 0.55) + ')'; g.lineWidth = 0.42; g.beginPath(); g.arc(0, 0, R - 0.65, a0 - 0.78, a0 + 0.62); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 0.6; g.beginPath(); g.arc(0, 0, R - 0.9, a0 + Math.PI - 0.55, a0 + Math.PI + 0.5); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(LX * 2.2, LY * 2.25, 0.9, 0.5, a0 + Math.PI / 2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(-LX * 1.9, -LY * 1.7, 0.36, 0, TAU); g.fill();
    if (dead) {   // shattered glass
      g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 0.22; g.beginPath();
      g.moveTo(-1.5, -1.2); g.lineTo(0.2, 0.1); g.lineTo(2.6, -0.9); g.moveTo(0.2, 0.1); g.lineTo(0.9, 2.8); g.moveTo(0.2, 0.1); g.lineTo(-2.4, 1.6); g.moveTo(-1.5, -1.2); g.lineTo(-1.2, -3.8); g.moveTo(0.9, 2.8); g.lineTo(2.8, 3.6); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 0.14; g.beginPath(); g.moveTo(-1.3, -1.0); g.lineTo(0.3, 0.3); g.lineTo(2.6, -0.7); g.stroke();
    }
    g.restore();
  }, { ss: 6 });
}

const EBC = {};
function ebSet(dir, v, dead) {
  const key = (dead ? 'd' : 'a') + dir + v;
  let s = EBC[key];
  if (!s) {
    const pal = EB_PAL[v];
    s = EBC[key] = withDir(dir, () => ({ body: buildEyeBody(pal, 300 + v * 41, dead, v), ant: buildEyeAntenna(pal, dead), gloss: buildLensGloss(dead) }));
  }
  return s;
}

CD.art.eyebot = function (ctx, e, G, flashOnly) {
  FO = !!flashOnly; BA = ctx.globalAlpha;
  const dead = isDead(e), face = e.face < 0 ? -1 : 1, t = e.t || 0, ph = seedOf(e);
  const S = ebSet(face, dead ? 0 : variantOf(e, EB_PAL.length), dead), L = ebLens();
  const st = e.state, vx = e.vx || 0, vy = e.vy || 0;
  const fire = !dead && st === 'fire';
  const charge = !dead && (st === 'windup' || st === 'aim') ? clamp(e.atkK || 0.6, 0, 1) : 0;
  const atk = !dead && st === 'attack';
  const hostile = !dead && (e.alert > 0 || fire || charge > 0 || atk || st === 'chase');
  const lx = EB.LX, ly = EB.LY;
  let bob = 0, tilt = 0;
  if (!dead) {
    bob = Math.sin(t * 2.6 + ph) * 1.25 + Math.sin(t * 5.3 + ph * 2) * 0.25;
    tilt = clamp(vx * 0.0011, -0.16, 0.16) + Math.sin(t * 1.9 + ph) * 0.02;
    if (e.stun > 0) tilt += Math.sin(t * 70) * 0.06 * Math.min(1, e.stun / 0.1);
  }
  // the iris follows the player (defaults to a forward glance)
  let tix = 0.9, tiy = 0.1; const P = G && G.player;
  if (!dead && P && !P.dead) { const dx = (P.cx - e.cx) * face, dy = P.cy - (e.cy + bob + ly), d = Math.hypot(dx, dy) || 1; tix = clamp(dx / d * 1.5, -0.5, 1.5); tiy = clamp(dy / d * 1.5, -1.3, 1.3); }
  const sm = smoothState(e, { alert: hostile ? 1 : 0, fire: fire || atk ? 1 : 0, ix: tix, iy: tiy }, { alert: 8, fire: 26, ix: 12, iy: 12 });
  let lidK = 0;
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.translate(e.cx, e.cy + bob); if (tilt) ctx.rotate(tilt);
  const wx = ctx.getTransform ? ctx.getTransform() : null;
  if (face < 0) ctx.scale(-1, 1);

  // ---- thruster exhaust
  if (!dead) {
    const thrust = clamp(0.55 + (-vy) / 170 + (hostile ? 0.15 : 0), 0.3, 1.4);
    for (let n = 0; n < 2; n++) {
      const nx = EB_NOZ[n], f = flick(t, n + ph);
      const sp = nx < 0 ? 1 : -1, na = Math.PI / 2 + sp * EB_NOZA, ex = nx - sp * Math.sin(EB_NOZA) * 3.7, ey = 10.3 + Math.cos(EB_NOZA) * 3.7;
      flame(ctx, ex, ey, na, (4.2 + 4.8 * thrust) * (0.7 + 0.5 * f), 3.2 * (0.8 + 0.3 * thrust), ['255,255,255', '120,200,255', '40,90,255'], 0.9);
      for (let i = 0; i < 3; i++) {
        const p = (t * 1.9 + i / 3 + n * 0.37) % 1, py = 15 + p * 9, pxx = nx + Math.sin(p * 7 + i * 2 + n) * 1.1 * p, r = 0.9 + p * 2.6;
        ctx.globalAlpha = FO ? 0 : BA * (1 - p) * 0.2 * smooth(0, 0.15, p) * thrust; ctx.drawImage(puffSpr('206,218,232'), pxx - r, py - r, r * 2, r * 2);
      }
      ctx.globalAlpha = BA;
    }
    glow(ctx, 0, 16, 12, '90,170,255', 0.14 * thrust, 1, 0.5); for (const nx of EB_NOZ) glow(ctx, nx - (nx < 0 ? 1 : -1) * Math.sin(EB_NOZA) * 3.7, 10.3 + Math.cos(EB_NOZA) * 3.7, 3.2, '170,220,255', 0.7 * thrust);
  }
  // ---- body
  put(ctx, S.body, 0, 0);
  // ---- lens
  const ak = dead ? 0 : sm.alert;
  if (dead) { put(ctx, L.base_dead, lx, ly); }
  else {
    put(ctx, L.base_calm, lx, ly);
    if (ak > 0.01) { ctx.globalAlpha = BA * ak; put(ctx, L.base_alert, lx, ly); ctx.globalAlpha = BA; }
    const jitter = fire ? Math.sin(t * 80) * 0.12 : 0;
    put(ctx, L.iris_calm, lx + sm.ix + jitter, ly + sm.iy);
    if (ak > 0.01) { ctx.globalAlpha = BA * ak; put(ctx, L.iris_alert, lx + sm.ix + jitter, ly + sm.iy); ctx.globalAlpha = BA; }
  }
  // eyelid: an occasional blink while calm, a menacing squint once alerted
  if (!dead) {
    const bp = (t * 0.19 + ph * 0.41) % 1, blink = bp < 0.03 ? Math.sin(bp / 0.03 * Math.PI) : 0;
    const lid = clamp(Math.max(blink * (1 - sm.alert * 0.7), 0.15 * sm.alert * (1 - sm.fire)), 0, 1);
    lidK = lid;
    if (lid > 0.02) {
      const R = EB.LR, yb = ly - R + lid * R * 2.05;
      ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, R + 0.05, 0, TAU); ctx.clip();
      const gr = ctx.createLinearGradient(0, ly - R, 0, yb); gr.addColorStop(0, '#3c4247'); gr.addColorStop(1, '#171a1d');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(lx - R - 1, ly - R - 1); ctx.lineTo(lx + R + 1, ly - R - 1); ctx.lineTo(lx + R + 1, yb - 0.5); ctx.quadraticCurveTo(lx, yb + 1.6, lx - R - 1, yb - 0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(lx - R - 1, yb - 0.5); ctx.quadraticCurveTo(lx, yb + 1.6, lx + R + 1, yb - 0.5); ctx.stroke();
      ctx.restore();
    }
  }
  put(ctx, S.gloss, lx, ly);
  // ---- antenna (lags behind motion)
  const antA = dead ? 0 : -vx * face * 0.0018 + Math.sin(t * 2.3 + ph + 1) * 0.06;
  ctx.save(); ctx.translate(EB_ANT.x, EB_ANT.y); if (antA) ctx.rotate(antA); put(ctx, S.ant, 0, 0); ctx.restore();
  // ---- emissive: eye glow, flare, blinker
  if (!dead) {
    const fk = sm.fire, pulse = 0.9 + 0.1 * Math.sin(t * 2.2 + ph);
    const eg = 1 - lidK * 0.75;
    glow(ctx, lx, ly, 15, LENS.calm.glow, 0.42 * (1 - ak) * pulse * eg);
    glow(ctx, lx, ly, 17, LENS.alert.glow, 0.62 * ak * pulse * eg);
    if (charge > 0) glow(ctx, lx, ly, 13 + charge * 10, '255,70,45', 0.4 + 0.55 * charge);
    if (fk > 0.02) {
      const pu = 0.85 + 0.15 * Math.sin(t * 46);
      glow(ctx, lx, ly, 25, '255,54,30', 1.05 * fk * pu);
      glow(ctx, lx, ly, 9, '255,236,210', 0.95 * fk);
      glow(ctx, lx, ly, 20, '255,96,70', 0.55 * fk, 1.5, 0.13);
      glow(ctx, lx, ly, 15, '255,130,96', 0.35 * fk, 0.14, 1.2);
    }
    // antenna blinker + belt status light
    const bp = hostile ? (t * 2.6 + ph) % 1 : (t * 0.85 + ph) % 1, on = hostile ? smooth(0, 0.06, bp) * (1 - smooth(0.3, 0.4, bp)) : smooth(0, 0.05, bp) * (1 - smooth(0.12, 0.2, bp));
    const ca = Math.cos(antA), sa = Math.sin(antA), tipx = EB_ANT.x + ca * 2.4 - sa * -8.2, tipy = EB_ANT.y + sa * 2.4 + ca * -8.2;
    if (on > 0.01) { glow(ctx, tipx, tipy, 5.5, hostile ? '255,60,40' : '255,170,60', 0.95 * on); glow(ctx, tipx, tipy, 1.6, '255,240,220', on); }
    glow(ctx, -10.3, ebBelt(-10.3) + EB.BT / 2, 2.6, '120,255,140', 0.5 + 0.2 * Math.sin(t * 3 + ph));
  } else {
    // wreck: smoke curling up in world space
    ctx.save();
    const rot = wx ? Math.atan2(wx.b, wx.a) : 0; ctx.translate(-6.0, -6.6); ctx.rotate(-rot * face);
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.42 + i / 6) % 1, x = Math.sin(p * 5 + i * 1.7) * 2.6 * p + p * 2, y = -p * 26, r = 2 + p * 6.5;
      ctx.globalAlpha = FO ? 0 : BA * 0.5 * (1 - p) * smooth(0, 0.12, p); ctx.drawImage(puffSpr(p < 0.4 ? '52,48,46' : '96,92,88'), x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  ctx.restore();
};

// ================================================================== TURRET
// The mount (plate + pedestal + turntable) is baked per orientation (floor / ceiling / wall on the left / wall on the right)
// from geometry authored in "floor space" (y toward the mounting surface), so highlights always face the open side.
// The gun assembly is baked pointing +x and rotated by e.aimA; when it points left it is mirrored vertically so its top stays up.
const TP = { steel: [110, 118, 122], dark: [66, 72, 78], olive: [112, 118, 86], hazard: [226, 184, 40], black: [30, 30, 28], brass: [204, 158, 62] };
const TU_LED = { idle: '90,255,120', aim: '255,182,50', fire: '255,52,40' };
const tuDims = (kind) => (kind === 'wallL' || kind === 'wallR') ? { D: 17, HL: 15 } : { D: 15, HL: 17 };
const TU_PT = 5;   // mounting plate thickness
const tuExt = (kind) => kind === 'floor' ? 0 : 2;   // ceiling / wall spawns sit 2px off the surface: the plate reaches out to it
const tuMap = (kind, x, y) => kind === 'ceil' ? [x, -y] : kind === 'wallL' ? [-y, x] : kind === 'wallR' ? [y, -x] : [x, y];
const TU_LED_POS = [-8.6, 0];   // floor-space x; y resolved from plate top

function hazard(g, x, y, w, h, a) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = css(TP.hazard); g.fillRect(x, y, w, h);
  g.fillStyle = css(TP.black); const sw = h * 1.05;
  for (let sx = x - h - sw; sx < x + w + h; sx += sw * 2) { g.beginPath(); g.moveTo(sx, y + h); g.lineTo(sx + sw, y + h); g.lineTo(sx + sw + h, y); g.lineTo(sx + h, y); g.closePath(); g.fill(); }
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,255,255,' + (0.36 * (a || 1)) + ')'); gr.addColorStop(0.4, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + (0.38 * (a || 1)) + ')');
  g.fillStyle = gr; g.fillRect(x, y, w, h); g.restore();
}

const TUC = {};
function buildMount(kind, dead) {
  const dm = tuDims(kind), D = dm.D, HL = dm.HL, pt = D - TU_PT;
  const flip = kind === 'ceil', rot = kind === 'wallL' ? Math.PI / 2 : kind === 'wallR' ? -Math.PI / 2 : 0;
  const map = (g) => { if (flip) g.scale(1, -1); else if (rot) g.rotate(rot); };
  const neckPath = (g) => { g.beginPath(); g.moveTo(-6.8, 3.2); g.quadraticCurveTo(-7.3, (pt + 3.2) / 2, -11.4, pt + 0.5); g.lineTo(11.4, pt + 0.5); g.quadraticCurveTo(7.3, (pt + 3.2) / 2, 6.8, 3.2); g.closePath(); };
  const ext = tuExt(kind);
  const plateRR = (g) => { g.beginPath(); rrect(g, -HL, pt, HL * 2, TU_PT + ext, 0.9); };
  const seed = 900 + ['floor', 'ceil', 'wallL', 'wallR'].indexOf(kind) * 13;
  const oLX = LX, oLY = LY;
  const wo = {
    seed, rust: dead ? 0.9 : 0.75, grime: dead ? 0.85 : 0.55, th: dead ? 0.55 : 0.68, rf: 0.24, eb: 0.2, bb: 0, chip: 0.9, streak: 0.4, edgeR: 2.2,
    bias: (x, y) => { const d = kind === 'floor' ? y - 6 : kind === 'ceil' ? -y - 6 : kind === 'wallL' ? -x - 8 : x - 8; return clamp(d / 10, 0, 1) * 0.3; },
  };
  const P = part(40, 40, 20, 20, (g) => {
    LX = kind === 'wallR' ? 0.45 : -0.45; LY = -0.89; TFY = flip ? -1 : 1;
    const rnd = U.RNG(seed);
    g.save(); map(g);
    // ---- pedestal (flared neck)
    g.save(); neckPath(g); g.clip();
    cylFill(g, -11.6, 2.5, 23.2, pt, TP.dark, true, { hi: 1.55 });
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-12, 3, 24, 1.2);
    groove(g, (g) => { g.moveTo(-12, 6.6); g.lineTo(12, 6.6); }, 0.42);
    groove(g, (g) => { g.moveTo(-12, pt - 1.6); g.lineTo(12, pt - 1.6); }, 0.42);
    // access hatch + conduit
    g.save(); g.translate(1.2, 4.7 + (pt - 9) * 0.3); { const hg = g.createLinearGradient(LX * 2, LY * 2, -LX * 2, -LY * 2); hg.addColorStop(0, T(TP.steel, 1.15)); hg.addColorStop(1, T(TP.steel, 0.7)); g.fillStyle = hg; g.beginPath(); rrect(g, -3.4, -1.6, 6.8, 3.2, 0.6); g.fill(); }
    groove(g, (g) => rrect(g, -3.4, -1.6, 6.8, 3.2, 0.6), 0.36); screw(g, -2.5, -0.9, 0.4, 0.5); screw(g, 2.5, 0.9, 0.4, 1.4); g.restore();
    g.fillStyle = '#121212'; g.fillRect(-9.6, 4.2, 2.1, pt - 4.6); g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(-9.6, 4.2, 0.55, pt - 4.6);
    g.fillStyle = 'rgba(70,70,70,0.9)'; for (let y = 5; y < pt - 0.4; y += 1.2) g.fillRect(-9.7, y, 2.3, 0.35);
    g.restore();
    // ---- turntable ring
    g.save(); g.beginPath(); rrect(g, -8.6, 1.5, 17.2, 2.4, 0.5); g.clip();
    cylFill(g, -9, 1.5, 18, 2.4, TP.steel, false, { hi: 1.7 });
    g.fillStyle = 'rgba(10,8,6,0.55)'; for (let x = -7.4; x <= 7.5; x += 1.85) g.fillRect(x, 1.8, 0.28, 1.4);
    g.restore(); g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.3; g.beginPath(); rrect(g, -8.6, 1.5, 17.2, 2.4, 0.5); g.stroke();
    // ---- mounting plate
    g.save(); plateRR(g); g.clip();
    slabFill(g, -HL, pt, HL * 2, TU_PT + ext, TP.steel, { hi: 1.45 });
    hazard(g, -HL, pt, HL * 2, 2.2, 1);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-HL, pt, HL * 2, 0.35);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-HL, pt + 2.2, HL * 2, 0.3);
    label(g, 'SEC-07', 6.4, pt + 3.7, 1.9, 'rgba(236,230,204,0.62)');
    g.restore();
    for (const sx of [-1, 1]) { bolt(g, sx * (HL - 2.6), pt + 3.6, 1.3, TP.steel, 0.3); }
    bolt(g, 1.6, pt + 3.7, 0.9, TP.steel, 0.1);
    // status LED socket
    { const lx = TU_LED_POS[0], ly = pt + 3.6; g.fillStyle = '#0d0d0d'; g.beginPath(); g.arc(lx, ly, 1.65, 0, TAU); g.fill(); g.strokeStyle = T(TP.steel, 1.4); g.lineWidth = 0.4; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(lx + LX * 0.6, ly + LY * 0.6, 0.35, 0, TAU); g.fill(); }
    // bolts on the neck flare
    bolt(g, -8.6, pt - 2.6, 0.95, TP.steel, 0.2); bolt(g, 9.2, pt - 2.9, 0.95, TP.steel, 0.5);
    // ---- wear
    scratches(g, rnd, 16, -HL, 2, HL, pt + 4, 4, 0.34);
    dent(g, 5, 7.6, 2.4, 1.6, 0.3, 1);
    soot(g, 6, 5, 6, dead ? 0.7 : 0.32, 1.4, 0.8);
    drip(g, -8, pt + 4.4, 3, 0.9, [150, 76, 34], 0.35);
    g.restore();
  }, {
    weather: wo,
    post: (g) => {
      g.save(); map(g); g.lineWidth = 0.6; g.strokeStyle = 'rgba(10,8,6,0.66)'; neckPath(g); g.stroke(); plateRR(g); g.stroke();
      if (dead) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(12,9,7,0.34)'; g.fillRect(-30, -30, 60, 60); g.restore(); }
      g.restore();
    },
  });
  LX = oLX; LY = oLY; TFY = 1;
  return P;
}
function tuMountSpr(kind, dead) { const k = kind + (dead ? 'd' : 'a'); return TUC[k] || (TUC[k] = guarded(() => buildMount(kind, dead))); }

// ---- gun housing (rotating), pointing +x, pivot at the origin, top = -y.
// Deliberately top/bottom symmetric (hood above, skid plate below, drum centred behind): the gun is mirrored across its barrel
// axis whenever it swings past vertical, and a symmetric build keeps that flip invisible.
function buildGun(dead) {
  const oLX = LX, oLY = LY;
  const gp = (g) => { g.beginPath(); g.moveTo(-10.4, -4.4); g.lineTo(-8.2, -6.0); g.lineTo(5, -6.0); g.lineTo(10.2, -4.9); g.lineTo(11.9, -3.2); g.lineTo(11.9, 3.2); g.lineTo(10.2, 4.9); g.lineTo(5, 6.0); g.lineTo(-8.2, 6.0); g.lineTo(-10.4, 4.4); g.closePath(); };
  const hoodTop = [[-6.8, -5.9], [-5.4, -8.2], [5.6, -8.2], [8, -5.9]], hoodBot = [[-6.8, 5.9], [-5.4, 7.6], [5.6, 7.6], [8, 5.9]];
  const P = part(38, 30, 18, 15, (g) => {
    LX = -0.25; LY = -0.96;
    const rnd = U.RNG(4242);
    // feed duct joining the drum to the receiver
    g.fillStyle = T(TP.dark, 0.75); g.fillRect(-11.6, -2.2, 2, 4.4);
    // receiver body
    g.save(); gp(g); g.clip();
    { const gr = g.createLinearGradient(0, -6.2, 0, 6.2); gr.addColorStop(0, T(TP.steel, 1.5)); gr.addColorStop(0.16, T(TP.steel, 1.15)); gr.addColorStop(0.5, T(TP.steel, 0.86)); gr.addColorStop(0.86, T(TP.dark, 0.66)); gr.addColorStop(1, T(TP.dark, 0.52)); g.fillStyle = gr; g.fillRect(-11, -7, 24, 14); }
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(-11, -7, 3.2, 14);                 // rear falloff
    // rear vent slits (symmetric about the barrel axis)
    for (const y of [-3.6, -1.4, 0.8, 3.0]) { g.fillStyle = 'rgba(6,6,6,0.75)'; g.fillRect(-9.6, y, 3.4, 0.7); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(-9.6, y + 0.7, 3.4, 0.28); }
    // ejection port + brass
    g.fillStyle = '#0b0b0b'; g.beginPath(); rrect(g, 5.6, -1.0, 4.4, 2, 0.4); g.fill(); g.fillStyle = css(TP.brass); g.fillRect(6.4, -0.3, 1.2, 0.7); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(6.4, -0.3, 1.2, 0.25);
    for (const y of [-3.9, 3.9]) rivet(g, 10.8, y, 0.5, TP.steel);
    groove(g, (g) => { g.moveTo(5, -6.0); g.lineTo(5, 6.0); }, 0.36);
    groove(g, (g) => { g.moveTo(-6.2, -6.0); g.lineTo(-6.2, 6.0); }, 0.36);
    scratches(g, rnd, 10, -9, -5, 10, 5, 3, 0.36);
    soot(g, 9, -2, 4, dead ? 0.7 : 0.35, 1.2, 1);
    g.restore();
    // armour hood above, matching skid plate below
    for (const [pts, up] of [[hoodTop, true], [hoodBot, false]]) {
      g.save(); g.beginPath(); poly(g, pts); g.clip();
      const y0 = up ? -8.4 : 5.8, y1 = up ? -5.8 : 7.8;
      const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, T(TP.olive, up ? 1.55 : 1.0)); gr.addColorStop(0.5, T(TP.olive, up ? 1.0 : 0.72)); gr.addColorStop(1, T(TP.olive, up ? 0.55 : 0.4)); g.fillStyle = gr; g.fillRect(-8, up ? -9 : 5.6, 17, 4);
      g.restore();
      hazard(g, 1.6, up ? -8.1 : 5.9, 5, 1.7, up ? 0.9 : 0.7);
      g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.4; g.beginPath(); poly(g, pts); g.stroke();
      rivet(g, -4.6, up ? -6.9 : 6.7, 0.42, TP.steel); rivet(g, -1.2, up ? -6.9 : 6.7, 0.42, TP.steel);
    }
    // mantlet (barrel housing)
    g.save(); g.beginPath(); rrect(g, 11.2, -6.4, 3.6, 12.8, 1); g.clip();
    { const gr = g.createLinearGradient(0, -6.4, 0, 6.4); gr.addColorStop(0, T(TP.dark, 1.5)); gr.addColorStop(0.3, T(TP.dark, 1.0)); gr.addColorStop(1, T(TP.dark, 0.5)); g.fillStyle = gr; g.fillRect(11, -6.6, 4, 13.2); }
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(11.4, -6.4, 0.5, 12.8);
    g.restore(); g.strokeStyle = 'rgba(10,8,6,0.62)'; g.lineWidth = 0.45; g.beginPath(); rrect(g, 11.2, -6.4, 3.6, 12.8, 1); g.stroke();
    // outline
    g.strokeStyle = 'rgba(10,8,6,0.66)'; g.lineWidth = 0.55; gp(g); g.stroke();
    if (dead) {
      g.save(); gp(g); g.clip(); g.fillStyle = '#0a0908'; g.beginPath(); poly(g, [[0.4, -6.4], [3.4, -5.8], [4.6, -3.2], [2.6, -1.6], [0.2, -3]]); g.fill();
      g.strokeStyle = '#b25a2a'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(1.6, -2.8); g.quadraticCurveTo(0.2, -1, 1.4, 1); g.stroke(); g.strokeStyle = '#3d7fa6'; g.beginPath(); g.moveTo(2.8, -2.8); g.quadraticCurveTo(4.4, -1.4, 3.4, 0.8); g.stroke();
      soot(g, 2, -3, 7, 0.55, 1.2, 1); g.restore();
    }
  }, {
    weather: { seed: 777, rust: dead ? 0.85 : 0.7, grime: dead ? 0.8 : 0.5, th: dead ? 0.5 : 0.68, rf: 0.3, eb: 0.24, bb: 0.1, yMid: -2, yRange: 12, chip: 0.9, streak: 0.3, edgeR: 2 },
    post: (g) => { if (dead) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(12,9,7,0.34)'; g.fillRect(-20, -20, 40, 40); g.restore(); } },
  });
  LX = oLX; LY = oLY;
  return P;
}
// ---- ammo drum (centred behind the receiver, rotates with the gun)
function buildCan(dead) {
  const oLX = LX, oLY = LY;
  const canP = (g) => { g.beginPath(); rrect(g, -17.4, -4.7, 6.6, 9.4, 1.3); };
  const P = part(20, 16, 18, 8, (g) => {
    LX = -0.25; LY = -0.96;
    const rnd = U.RNG(4243);
    g.save(); canP(g); g.clip();
    cylFill(g, -18, -5, 8, 10, TP.olive, false, { hi: 1.4 });
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-17.4, -4.7, 0.9, 9.4); g.fillRect(-11.4, -4.7, 0.6, 9.4);      // end caps
    g.fillStyle = 'rgba(0,0,0,0.24)'; for (const x of [-15.2, -13.4]) g.fillRect(x, -4.7, 0.5, 9.4);
    g.fillStyle = 'rgba(255,255,255,0.12)'; for (const x of [-15.2, -13.4]) g.fillRect(x + 0.5, -4.7, 0.3, 9.4);
    g.fillStyle = 'rgba(226,190,60,0.85)'; g.fillRect(-14.5, -4.7, 1.3, 9.4); g.fillRect(-12.6, -4.7, 0.5, 9.4);   // paint bands (no lettering: the gun is mirrored across its axis)
    g.restore();
    g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.45; g.beginPath(); rrect(g, -17.4, -4.7, 6.6, 9.4, 1.3); g.stroke();
    for (const y of [-4.3, 4.3]) rivet(g, -16.2, y, 0.45, TP.steel);
    for (const y of [-4.3, 4.3]) rivet(g, -12.2, y, 0.45, TP.steel);
    scratches(g, rnd, 5, -17, -4, -11, 4, 2.4, 0.36);
    if (dead) soot(g, -14, 0, 6, 0.6, 1, 1);
  }, {
    weather: { seed: 4244, rust: dead ? 0.85 : 0.6, grime: 0.5, th: dead ? 0.5 : 0.7, rf: 0.3, eb: 0.24, chip: 0.9, streak: 0.3, edgeR: 2 },
    post: (g) => { if (dead) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(12,9,7,0.3)'; g.fillRect(-20, -20, 40, 40); g.restore(); } },
  });
  LX = oLX; LY = oLY;
  return P;
}
// ---- twin barrels (slide back on recoil); origin = pivot, spans x 9..29
function buildBarrels(dead) {
  const oLX = LX, oLY = LY;
  const P = part(21, 16, -9, 8, (g) => {
    LX = -0.25; LY = -0.96;
    const rnd = U.RNG(555);
    for (let bi = 0; bi < 2; bi++) {
      const yc = bi === 0 ? -3.05 : 2.75;
      const base = TP.steel;
      const broken = dead && bi === 0;
      // root collar
      cylFill(g, 12.6, yc - 2.5, 1.8, 5, TP.dark, false, { hi: 1.5 });
      // shroud
      g.save(); g.beginPath(); rrect(g, 14.2, yc - 2, 6.2, 4, 0.7); g.clip();
      cylFill(g, 14, yc - 2.2, 7, 4.4, base, false, { hi: 1.7 });
      g.fillStyle = 'rgba(0,0,0,0.6)'; for (const x of [15.4, 17.1, 18.8]) { g.beginPath(); g.ellipse(x, yc, 0.42, 0.72, 0, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(19.4, yc - 2.2, 1, 4.4);
      g.restore(); g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.35; g.beginPath(); rrect(g, 14.2, yc - 2, 6.2, 4, 0.7); g.stroke();
      // barrel
      const endX = broken ? 22 : 23.4;
      g.save(); g.beginPath(); g.rect(20.4, yc - 1.25, endX - 20.4, 2.5); g.clip(); cylFill(g, 20, yc - 1.4, 5, 2.8, TP.dark, false, { hi: 1.9 }); g.restore();
      g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.3; g.strokeRect(20.4, yc - 1.25, endX - 20.4, 2.5);
      if (!broken) {
        // muzzle brake
        g.save(); g.beginPath(); rrect(g, 23.2, yc - 1.75, 2.4, 3.5, 0.4); g.clip(); cylFill(g, 23, yc - 1.9, 3, 3.8, TP.dark, false, { hi: 1.5 });
        g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(24.0, yc - 1.8, 0.4, 3.6); g.fillRect(25.0, yc - 1.8, 0.35, 3.6); g.restore();
        g.strokeStyle = 'rgba(10,8,6,0.62)'; g.lineWidth = 0.32; g.beginPath(); rrect(g, 23.2, yc - 1.75, 2.4, 3.5, 0.4); g.stroke();
      } else {
        g.fillStyle = '#0b0a09'; g.beginPath(); poly(g, [[22, yc - 1.25], [23.4, yc - 0.6], [22.6, yc + 0.2], [23.2, yc + 1.25], [22, yc + 1.25]]); g.fill();
      }
      // heat tint at the muzzle
      if (!dead) { const hg = g.createLinearGradient(21, 0, 25.6, 0); hg.addColorStop(0, 'rgba(255,120,40,0)'); hg.addColorStop(1, 'rgba(255,120,40,0.14)'); g.fillStyle = hg; g.fillRect(21, yc - 1.8, 4.6, 3.6); }
    }
    // cross brace
    g.fillStyle = css(T(TP.dark, 0.9)); g.fillRect(17.3, -1.2, 1.5, 2.9); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(17.3, -1.2, 0.4, 2.9);
    scratches(g, rnd, 8, 14, -5, 25, 4, 2.4, 0.38);
  }, {
    weather: { seed: 556, rust: dead ? 0.8 : 0.5, grime: 0.5, th: dead ? 0.55 : 0.75, rf: 0.4, eb: 0.1, chip: 0.6, edgeR: 1.4 },
    post: (g) => { if (dead) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(12,9,7,0.3)'; g.fillRect(0, -20, 40, 40); g.restore(); } },
  });
  LX = oLX; LY = oLY;
  return P;
}
// ---- trunnion cap (fixed disc at the pivot)
function buildCap(dead) {
  return part(14, 14, 7, 7, (g) => {
    g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 1.6 * SS; g.shadowOffsetX = -LX * 0.7 * SS; g.shadowOffsetY = -LY * 0.7 * SS;
    g.fillStyle = '#222'; g.beginPath(); g.arc(0, 0, 4.9, 0, TAU); g.fill(); g.restore();
    let gr = g.createLinearGradient(LX * 5, LY * 5, -LX * 5, -LY * 5); gr.addColorStop(0, T(TP.steel, 1.8)); gr.addColorStop(0.4, T(TP.steel, 1.0)); gr.addColorStop(1, T(TP.dark, 0.5));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 4.85, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(10,8,6,0.62)'; g.lineWidth = 0.45; g.stroke();
    gr = g.createLinearGradient(LX * 3.6, LY * 3.6, -LX * 3.6, -LY * 3.6); gr.addColorStop(0, T(TP.dark, 0.55)); gr.addColorStop(1, T(TP.steel, 1.35));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 3.7, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(10,8,6,0.5)'; g.lineWidth = 0.3; g.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; rivet(g, Math.cos(a) * 4.25, Math.sin(a) * 4.25, 0.34, TP.steel); }
    bolt(g, 0, 0, 1.5, TP.steel, 0.2);
    g.fillStyle = 'rgba(255,255,250,0.35)'; g.beginPath(); g.ellipse(LX * 2.4, LY * 2.4, 1.1, 0.5, Math.atan2(LY, LX) + Math.PI / 2, 0, TAU); g.fill();
  }, { weather: { seed: 31, rust: dead ? 0.7 : 0.35, grime: 0.4, th: 0.72, rf: 0.5, eb: 0.1, chip: 0.4, edgeR: 1.2 } });
}
function tuGun(dead) { const k = 'g' + dead; return TUC[k] || (TUC[k] = guarded(() => ({ gun: buildGun(dead), can: buildCan(dead), bar: buildBarrels(dead), cap: buildCap(dead) }))); }

function muzzleFlash(ctx, x, y, k, t, sd) {
  if (FO || k <= 0.02) return;
  ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = 'lighter';
  const fr = Math.floor(t * 75) + sd * 13, h = (i) => U.hash2(fr, i, 19);
  const L = (8 + 9 * h(1)) * k, R = (7 + 6 * h(2)) * k + 2.5;
  ctx.globalAlpha = BA * Math.min(1, 0.95 * k); ctx.drawImage(glowSpr('255,170,70'), -R - 3, -R - 3, (R + 3) * 2, (R + 3) * 2);
  ctx.globalAlpha = BA * Math.min(1, k * 1.1); ctx.drawImage(glowSpr('255,246,220'), -3.6 * k - 1.2, -3.6 * k - 1.2, 7.2 * k + 2.4, 7.2 * k + 2.4);
  ctx.globalAlpha = BA;
  const spike = (a, len, wid) => { ctx.save(); ctx.rotate(a); const g2 = ctx.createLinearGradient(0, 0, len, 0); g2.addColorStop(0, 'rgba(255,246,214,0.96)'); g2.addColorStop(0.45, 'rgba(255,180,66,0.66)'); g2.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(-0.8, 0); ctx.quadraticCurveTo(len * 0.18, -wid * 1.25, len, 0); ctx.quadraticCurveTo(len * 0.18, wid * 1.25, -0.8, 0); ctx.closePath(); ctx.fill(); ctx.restore(); };
  spike(0, L * 1.35, 1.7 * k + 0.5); spike(0.5 + (h(3) - 0.5) * 0.4, L * 0.62, 1.1 * k + 0.2); spike(-0.5 + (h(4) - 0.5) * 0.4, L * 0.62, 1.1 * k + 0.2);
  spike(1.35 + (h(5) - 0.5) * 0.4, L * 0.38, 0.9 * k); spike(-1.35 + (h(6) - 0.5) * 0.4, L * 0.38, 0.9 * k);
  ctx.restore();
}

CD.art.turret = function (ctx, e, G, flashOnly) {
  FO = !!flashOnly; BA = ctx.globalAlpha;
  const dead = isDead(e), t = e.t || 0, st = e.state;
  const mnt = e.mount === 'ceil' || e.mount === 'wall' ? e.mount : 'floor';
  const kind = mnt === 'wall' ? (e.mountDir < 0 ? 'wallR' : 'wallL') : mnt;
  const D = tuDims(kind).D, pt = D - TU_PT;
  let aim = typeof e.aimA === 'number' && isFinite(e.aimA) ? e.aimA : (kind === 'ceil' ? Math.PI / 2 : kind === 'floor' ? -Math.PI / 2 : kind === 'wallR' ? Math.PI : 0);
  if (dead) { const fw = Math.cos(aim) >= 0; aim = kind === 'ceil' ? Math.PI / 2 + (fw ? -0.3 : 0.3) : kind === 'floor' ? (fw ? 0.34 : Math.PI - 0.34) : kind === 'wallL' ? 0.85 : Math.PI - 0.85; }
  const M = tuMountSpr(kind, dead), Gs = tuGun(dead);
  const recoil = dead ? 0 : Math.max(0, e.recoil || 0), fire = !dead && (st === 'fire' || st === 'attack'), aimS = !dead && (st === 'aim' || st === 'windup');
  const pull = Math.min(recoil, 5) * 0.95, ca = Math.cos(aim), sa = Math.sin(aim), flip = ca < 0;
  const ledKey = fire ? 'fire' : aimS ? 'aim' : 'idle';
  const blinkA = fire ? 1 : aimS ? (Math.sin(t * 24) > 0 ? 1 : 0.25) : 0.55 + 0.45 * Math.sin(t * 2.6);
  const heat = smoothState(e, { heat: !dead && (fire || recoil > 0) ? 1 : 0 }, { heat: !dead && (fire || recoil > 0) ? 18 : 1.4 }).heat;   // barrels glow for a moment after firing
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.translate(e.cx, e.cy);
  const wx = ctx.getTransform ? ctx.getTransform() : null;
  put(ctx, M, 0, 0);
  // ---- gun assembly, clipped to the open side of the mounting plate (a gun swung toward the wall sinks into it)
  ctx.save();
  ctx.beginPath();
  if (kind === 'floor') ctx.rect(-90, -90, 180, 90 + pt); else if (kind === 'ceil') ctx.rect(-90, -pt, 180, 90 + pt); else if (kind === 'wallL') ctx.rect(-pt, -90, 90 + pt, 180); else ctx.rect(-90, -90, 90 + pt, 180);
  ctx.clip();
  ctx.rotate(aim); if (flip) ctx.scale(1, -1);
  if (aimS) ctx.translate(Math.sin(t * 91) * 0.1, Math.cos(t * 77) * 0.1);   // servo tension while acquiring a target
  put(ctx, Gs.bar, -pull, 0);
  if (heat > 0.02) { glow(ctx, 23.6 - pull, -3.05, 4.4, '255,110,40', 0.55 * heat); glow(ctx, 23.6 - pull, 2.75, 4.4, '255,110,40', 0.55 * heat); }
  put(ctx, Gs.can, -pull * 0.3, 0);
  // ammo belt: a dark link strip with brass rounds looping from the drum into the receiver (fades out near vertical, where the flip would move it)
  {
    const bfade = smooth(0.14, 0.42, Math.abs(ca));
    if (bfade > 0.02) {
      const off = fire ? (t * 3.6) % 1 : 0, n = 5, bx = -pull * 0.3;
      const x0 = -14.6, y0 = -4.3, x1 = -13.6, y1 = -9.4, x2 = -8.6, y2 = -5.2;
      ctx.globalAlpha = BA * bfade; ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(24,20,14,0.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0 + bx, y0); ctx.quadraticCurveTo(x1 + bx, y1, x2 + bx, y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(x0 + bx - 0.5, y0 - 0.4); ctx.quadraticCurveTo(x1 + bx - 0.5, y1 - 0.4, x2 + bx - 0.5, y2 - 0.4); ctx.stroke();
      for (let i = 0; i <= n; i++) {
        const u = (i + off) / n; if (u > 1) continue;
        const mu = 1 - u, x = mu * mu * x0 + 2 * mu * u * x1 + u * u * x2 + bx, y = mu * mu * y0 + 2 * mu * u * y1 + u * u * y2;
        const gr = ctx.createRadialGradient(x - 0.25, y - 0.3, 0.05, x, y, 0.95); gr.addColorStop(0, css(tone(TP.brass, 1.7))); gr.addColorStop(0.55, css(TP.brass)); gr.addColorStop(1, css(tone(TP.brass, 0.4)));
        ctx.globalAlpha = BA * bfade * smooth(0, 0.1, u); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 0.95, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(20,16,10,0.7)'; ctx.lineWidth = 0.22; ctx.stroke();
      }
      ctx.globalAlpha = BA;
    }
  }
  put(ctx, Gs.gun, -pull * 0.3, 0);
  ctx.restore();
  // ---- muzzle flash and camera light: unclipped, but only while the muzzle is on the open side of the plate
  if (!dead) {
    const mx = ca * (25.6 - pull), my = sa * (25.6 - pull);
    const open = kind === 'floor' ? my < pt : kind === 'ceil' ? my > -pt : kind === 'wallL' ? mx > -pt : mx < pt;
    ctx.save(); ctx.rotate(aim); if (flip) ctx.scale(1, -1);
    const k = Math.max(clamp(recoil / 4, 0, 1), fire ? 0.32 + 0.16 * Math.sin(t * 61) : 0);
    if (open && k > 0.02) {
      const alt = Math.floor(t * 30) & 1;
      muzzleFlash(ctx, 25.6 - pull, -3.05, k * (alt ? 1 : 0.8), t, 1); muzzleFlash(ctx, 25.6 - pull, 2.75, k * (alt ? 0.8 : 1), t, 2);
    }
    ctx.restore();
  }
  // ---- trunnion cap with a rotating index mark
  put(ctx, Gs.cap, 0, 0);
  ctx.save(); ctx.rotate(aim); ctx.strokeStyle = 'rgba(10,8,6,0.55)'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(1.7, 0); ctx.lineTo(3.4, 0); ctx.stroke(); ctx.restore();
  if (!dead && !FO) {   // status ring on the swivel cap
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(' + TU_LED[ledKey] + ',' + (0.75 * blinkA) + ')'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.arc(0, 0, 4.4, 0, TAU); ctx.stroke(); ctx.restore();
    glow(ctx, 0, 0, 8, TU_LED[ledKey], 0.32 * blinkA);
  }
  // ---- status LED on the plate
  {
    const p = tuMap(kind, TU_LED_POS[0], pt + 3.6);
    if (!dead) {
      const on = fire ? 1 : aimS ? (Math.sin(t * 24) > 0 ? 1 : 0.3) : 0.6 + 0.4 * Math.sin(t * 2.6);
      const gr = ctx.createRadialGradient(p[0] - 0.3, p[1] - 0.3, 0, p[0], p[1], 1.4); gr.addColorStop(0, 'rgba(255,255,255,' + on + ')'); gr.addColorStop(0.4, 'rgba(' + TU_LED[ledKey] + ',' + (0.55 + 0.45 * on) + ')'); gr.addColorStop(1, 'rgba(' + TU_LED[ledKey] + ',0.5)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p[0], p[1], 1.3, 0, TAU); ctx.fill();
      glow(ctx, p[0], p[1], 9, TU_LED[ledKey], 0.75 * on); glow(ctx, p[0], p[1], 3, '255,255,255', 0.5 * on);
    } else { ctx.fillStyle = '#211a14'; ctx.beginPath(); ctx.arc(p[0], p[1], 1.3, 0, TAU); ctx.fill(); }
  }
  // ---- wreck: smoke curls up in world space
  if (dead) {
    ctx.save(); const rot = wx ? Math.atan2(wx.b, wx.a) : 0; ctx.rotate(-rot);
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.4 + i / 6) % 1, x = Math.sin(p * 5 + i * 1.9) * 2.4 * p, y = (kind === 'ceil' ? 6 : -8) - p * 24, r = 2 + p * 6.5;
      ctx.globalAlpha = FO ? 0 : BA * 0.5 * (1 - p) * smooth(0, 0.12, p); ctx.drawImage(puffSpr(p < 0.4 ? '52,48,46' : '96,92,88'), x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  ctx.restore();
};

// ================================================================== MR. HANDY
// Local space: origin = hitbox centre, facing +x. Oblate two-tone body, three flexible segmented arms (flamer, circular saw,
// pincer claw) whose wrists are placed per state and joined to the body sockets with a curved ring chain, three telescoping
// eyestalks on a cap, and three jet bells underneath.
const HD = { rx: 15.5, ry: 13.5, cy: 1.5, BT: 3.4 };
const hdBelt = (x) => 3.2 + 2.0 * (1 - (x * x) / (HD.rx * HD.rx));
const HD_PAL = [
  { top: [234, 229, 210], low: [134, 154, 168], band: [92, 98, 102], trim: [204, 206, 204], accent: [204, 86, 46], tool: [88, 97, 106] },   // cream over grey-blue
  { top: [160, 162, 114], low: [98, 104, 88], band: [72, 74, 68], trim: [172, 168, 132], accent: [224, 178, 44], tool: [80, 84, 72] },        // olive drab
];
const HD_SOCK = { saw: [8.4, 8.8], flame: [11.4, -1.0], claw: [-12.6, 3.8] };
const HD_STALK = [{ x: -5.2, y: -11.6, a: -0.4, len: 6.2, r: 1.0 }, { x: 1.4, y: -12.8, a: 0.04, len: 9.4, r: 1.35 }, { x: 8.0, y: -10.4, a: 0.5, len: 6.2, r: 1.0 }];
const HD_NOZ = [{ x: -8.4, a: 0.22, L: 5.2 }, { x: 0, a: 0, L: 6.0 }, { x: 8.4, a: -0.22, L: 5.2 }];
const HD_NZ_Y = 11.6;

function bulletHole(g, x, y, r) {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x - LX * r * 0.4, y - LY * r * 0.4, r * 1.9, 0, TAU); g.fill();
  g.fillStyle = '#0a0908'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,250,236,0.4)'; g.lineWidth = r * 0.3; g.beginPath(); g.arc(x, y, r * 1.25, Math.atan2(-LY, -LX) - 1.1, Math.atan2(-LY, -LX) + 1.1); g.stroke();
  g.strokeStyle = 'rgba(10,8,6,0.5)'; g.lineWidth = 0.15; g.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.3 + x; g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r * 2.6, y + Math.sin(a) * r * 2.6); } g.stroke();
  g.restore();
}
function socket(g, x, y, r, pal, sx) {
  g.save(); g.translate(x, y); g.scale(sx || 1, 1);
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 1.8 * SS; g.shadowOffsetX = -LX * 0.9 * SS; g.shadowOffsetY = -LY * 0.9 * SS;
  g.fillStyle = '#202020'; g.beginPath(); g.arc(0, 0, r + 0.9, 0, TAU); g.fill(); g.shadowColor = 'transparent';
  let gr = g.createLinearGradient(LX * r, LY * r, -LX * r, -LY * r); gr.addColorStop(0, T(pal.trim, 1.6)); gr.addColorStop(0.5, T(pal.trim, 0.85)); gr.addColorStop(1, T(pal.band, 0.5));
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r + 0.8, 0, TAU); g.fill(); g.strokeStyle = 'rgba(10,8,6,0.6)'; g.lineWidth = 0.35; g.stroke();
  gr = g.createLinearGradient(LX * r, LY * r, -LX * r, -LY * r); gr.addColorStop(0, T(pal.band, 0.4)); gr.addColorStop(1, T(pal.band, 1.2));
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.fillStyle = '#0a0a0b'; g.beginPath(); g.arc(0, 0, r * 0.62, 0, TAU); g.fill();
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; rivet(g, Math.cos(a) * (r + 0.2), Math.sin(a) * (r + 0.2), 0.32, pal.trim); }
  g.restore();
}

const HDW = {};
function hdWeather(v, dead) {
  const key = v + (dead ? 'd' : 'a');
  return HDW[key] || (HDW[key] = {
    seed: 600 + v * 53, rust: dead ? 0.95 : 0.8, grime: dead ? 0.9 : 0.6, th: dead ? 0.58 : 0.74, rf: 0.19, yMid: -2, yRange: 18, bb: 0.2, eb: 0.2, chip: 0.8, streak: 0.5, streakY: 4, edgeR: 2.6,
    bias: (x, y) => { const b = hdBelt(clamp(x, -HD.rx, HD.rx)); return Math.abs(y - b - 1.7) < 2.6 ? 0.1 : 0; },
  });
}

function buildHandyBody(pal, seed, dead, v) {
  const rx = HD.rx, ry = HD.ry, cy = HD.cy, BT = HD.BT;
  const rnd = U.RNG(seed);
  const top = dead ? tone(pal.top, 0.62) : pal.top, low = dead ? tone(pal.low, 0.6) : pal.low;
  const shellPath = (g) => { g.beginPath(); g.ellipse(0, cy, rx, ry, 0, 0, TAU); };
  const capPath = (g) => { g.beginPath(); g.ellipse(1.2, -11.2, 8.8, 2.9, 0, 0, TAU); };
  const bell = (g, n, fn) => { g.save(); g.translate(n.x, HD_NZ_Y); g.rotate(n.a); g.translate(-n.x, 0); fn(g); g.restore(); };
  const bellPath = (g, n) => { g.beginPath(); g.moveTo(n.x - 2.9, 0); g.quadraticCurveTo(n.x - 3.1, n.L * 0.55, n.x - 4.7, n.L); g.lineTo(n.x + 4.7, n.L); g.quadraticCurveTo(n.x + 3.1, n.L * 0.55, n.x + 2.9, 0); g.closePath(); };
  return part(40, 44, 20, 24, (g) => {
    // ---- jet bells (under the shell)
    for (const n of HD_NOZ) bell(g, n, (g) => {
      g.save(); bellPath(g, n); g.clip();
      cylFill(g, n.x - 5, -0.5, 10, n.L + 1, pal.band, true, { hi: 1.5 });
      g.fillStyle = T(pal.trim, 1.2); g.fillRect(n.x - 5, n.L - 1.5, 10, 1.5);
      g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(n.x - 5, 0, 10, 1.8); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(n.x - 5, n.L * 0.5, 10, 0.4);
      g.restore(); g.fillStyle = '#0a0a0c'; g.beginPath(); g.ellipse(n.x, n.L, 4.15, 0.95, 0, 0, TAU); g.fill();
    });
    // ---- shell
    g.save(); shellPath(g); g.clip();
    sphereFill(g, 0, cy, rx, ry, top);
    g.save(); g.beginPath(); g.moveTo(-rx - 2, hdBelt(-rx - 2) + BT); for (let x = -rx - 2; x <= rx + 2.01; x += 1) g.lineTo(x, hdBelt(x) + BT); g.lineTo(rx + 2, 30); g.lineTo(-rx - 2, 30); g.closePath(); g.clip();
    sphereFill(g, 0, cy, rx, ry, low, 1.4); g.restore();
    // ---- equator band
    const bl = (dy, w, style) => { g.beginPath(); for (let x = -rx - 1; x <= rx + 1.01; x += 0.75) { const y = hdBelt(x) + dy; x === -rx - 1 ? g.moveTo(x, y) : g.lineTo(x, y); } g.lineWidth = w; g.strokeStyle = style; g.stroke(); };
    const bt = [1.45, 1.7, 1.2, 0.92, 0.66, 0.5, 0.42];
    g.lineCap = 'butt'; for (let i = 0; i < 7; i++) bl(0.24 + i * (BT - 0.48) / 6, (BT - 0.48) / 6 + 0.16, T(pal.band, bt[i])); g.lineCap = 'round';
    g.save(); g.beginPath(); for (let x = -rx - 1; x <= rx + 1.01; x += 1) g.lineTo(x, hdBelt(x)); for (let x = rx + 1; x >= -rx - 1.01; x -= 1) g.lineTo(x, hdBelt(x) + BT); g.closePath(); g.clip();
    const fg = g.createLinearGradient(-rx, 0, rx, 0); fg.addColorStop(0, 'rgba(6,4,10,0.55)'); fg.addColorStop(0.22, 'rgba(6,4,10,0.1)'); fg.addColorStop(0.5, 'rgba(6,4,10,0)'); fg.addColorStop(0.78, 'rgba(6,4,10,0.14)'); fg.addColorStop(1, 'rgba(6,4,10,0.6)');
    g.fillStyle = fg; g.fillRect(-rx - 2, 0, 2 * rx + 4, 14); g.restore();
    for (let x = -13.6; x <= 13.7; x += 3.4) rivet(g, x, hdBelt(x) + BT / 2, 0.52, pal.trim);
    // ---- pinstripe across the dome (same retro paint scheme as the Eyebot)
    {
      const sy = (x) => -8.6 + 2.7 * (1 - (x * x) / (rx * rx));
      const line = (dy) => { g.beginPath(); for (let x = -rx - 1; x <= rx + 1.01; x += 0.75) { const y = sy(x) + dy; x === -rx - 1 ? g.moveTo(x, y) : g.lineTo(x, y); } };
      const sg = g.createLinearGradient(-rx, 0, rx, 0); sg.addColorStop(0, T(pal.accent, 0.4)); sg.addColorStop(0.3, T(pal.accent, 0.95)); sg.addColorStop(0.55, T(pal.accent, 1.15)); sg.addColorStop(1, T(pal.accent, 0.45));
      g.lineCap = 'butt'; g.strokeStyle = sg; g.lineWidth = 1.0; line(0); g.stroke(); g.lineWidth = 0.4; line(1.4); g.stroke();
      g.strokeStyle = 'rgba(255,250,236,0.3)'; g.lineWidth = 0.22; line(-0.62); g.stroke(); g.lineCap = 'round';
    }
    // ---- meridian seams + panels
    groove(g, (g) => { g.moveTo(-1, -ry + cy + 0.2); g.quadraticCurveTo(-9, -3, -7.4, hdBelt(-7.4) - 0.1); }, 0.5);
    groove(g, (g) => { g.moveTo(3.4, hdBelt(3.4) + BT + 0.1); g.quadraticCurveTo(5.4, 10, 3.6, 14.2); }, 0.45);
    // ---- logo plate (RobCo blue enamel with stencil)
    g.save(); g.translate(-5.4, -2.6); g.rotate(-0.05);
    { const pg = g.createLinearGradient(LX * 3, LY * 3, -LX * 3, -LY * 3); pg.addColorStop(0, T([66, 96, 140], 1.35)); pg.addColorStop(1, T([66, 96, 140], 0.62)); g.fillStyle = pg; g.beginPath(); rrect(g, -5.6, -3, 11.2, 6, 0.9); g.fill(); }
    groove(g, (g) => rrect(g, -5.6, -3, 11.2, 6, 0.9), 0.4);
    screw(g, -4.6, -2.1, 0.42, 0.4); screw(g, 4.6, -2.1, 0.42, 1.9); screw(g, -4.6, 2.1, 0.42, 1.2); screw(g, 4.6, 2.1, 0.42, 0.3);
    label(g, 'MR. HANDY', 0, -0.5, 2.0, 'rgba(246,240,220,0.92)'); label(g, 'MODEL H-07', 0, 1.6, 1.2, 'rgba(232,206,96,0.85)');
    g.restore();
    // ---- chrome vent grille
    g.save(); g.translate(-3.6, 10.6); g.beginPath(); rrect(g, -4.8, -2.3, 9.6, 4.6, 0.8); g.clip();
    g.fillStyle = '#08090a'; g.fillRect(-5, -2.5, 10, 5);
    for (let i = 0; i < 5; i++) { const y = -1.9 + i * 0.95; const gg = g.createLinearGradient(0, y, 0, y + 0.6); gg.addColorStop(0, T(pal.trim, 1.6)); gg.addColorStop(1, T(pal.trim, 0.55)); g.fillStyle = gg; g.fillRect(-4.6, y, 9.2, 0.6); }
    g.restore(); g.save(); g.translate(-3.6, 10.6); g.strokeStyle = T(pal.trim, 1.2); g.lineWidth = 0.5; g.beginPath(); rrect(g, -4.8, -2.3, 9.6, 4.6, 0.8); g.stroke(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.3; g.beginPath(); rrect(g, -5.2, -2.7, 10.4, 5.4, 1.0); g.stroke(); g.restore();
    // ---- arm sockets (near side)
    socket(g, HD_SOCK.flame[0], HD_SOCK.flame[1], 3.5, pal, 0.85); socket(g, HD_SOCK.saw[0], HD_SOCK.saw[1], 3.1, pal, 0.95); socket(g, HD_SOCK.claw[0], HD_SOCK.claw[1], 3.1, pal, 0.62);
    // ---- damage
    dent(g, -10.2, -5.8, 3.3, 2.4, -0.7, 1); dent(g, 6.6, -8.2, 2.6, 1.8, 0.4, 0.9); dent(g, 13.2, 9.4, 2.4, 1.8, 0.8, 0.8); dent(g, -0.6, 6.4, 2.2, 1.5, 0.2, 0.7);
    bulletHole(g, 3.2, -5.4, 0.6); bulletHole(g, 4.8, -3.6, 0.5); bulletHole(g, 2.4, -2.6, 0.45); bulletHole(g, -10.4, 8, 0.5);
    g.strokeStyle = 'rgba(10,8,6,0.55)'; g.lineWidth = 0.22; g.beginPath(); g.moveTo(-12.4, -7.2); g.lineTo(-9.6, -6); g.lineTo(-8.8, -4.2); g.moveTo(-9.6, -6); g.lineTo(-11.4, -4.4); g.moveTo(7.4, -9.6); g.lineTo(6.2, -7.6); g.lineTo(7.4, -6.4); g.stroke();
    scratches(g, rnd, 22, -13, -10, 13, 12, 3.6, 0.32);
    soot(g, HD_SOCK.flame[0] + 1, HD_SOCK.flame[1] - 1, 8.5, dead ? 0.75 : 0.55, 1.1, 1); soot(g, 5, -9, 6, 0.4, 1.4, 0.8); soot(g, -3.6, 8, 5, 0.3, 1.5, 0.8); soot(g, 12, 6, 4, 0.3, 1, 1);
    for (const x of [-11, -3, 5, 12]) drip(g, x, hdBelt(x) + BT - 0.2, 4.5 + rnd.range(0, 3), 1.0, [150, 76, 34], 0.42);
    drip(g, 9, 6, 6, 0.9, [24, 18, 12], 0.35);
    if (dead) {
      g.save(); g.translate(-0.5, -4.2); g.rotate(-0.3);
      g.fillStyle = '#0b0a09'; g.beginPath(); poly(g, [[-5.6, -2], [-1.8, -3.6], [2, -2.6], [5.6, -3.2], [6.4, 1.4], [3, 3.6], [-1, 2.6], [-4.6, 3.8], [-6.4, 0.6]]); g.fill();
      g.strokeStyle = 'rgba(255,236,210,0.55)'; g.lineWidth = 0.34; g.beginPath(); g.moveTo(-5.6, -2); g.lineTo(-1.8, -3.6); g.lineTo(2, -2.6); g.lineTo(5.6, -3.2); g.stroke();
      g.lineWidth = 0.42; g.strokeStyle = '#b25a2a'; g.beginPath(); g.moveTo(-3, 0.6); g.bezierCurveTo(-4.2, 3.4, -1.2, 5, -2.4, 7); g.stroke();
      g.strokeStyle = '#3d7fa6'; g.beginPath(); g.moveTo(0.4, 0.8); g.bezierCurveTo(2, 4, 0.4, 5.2, 2.2, 7.4); g.stroke();
      g.strokeStyle = '#c9b25a'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(3.2, 0.4); g.bezierCurveTo(4.2, 2.8, 3.4, 4, 4.8, 5.4); g.stroke();
      g.restore(); soot(g, 0, -4, 12, 0.5, 1, 1); dent(g, 8.6, 4, 4, 3, 0.4, 1.3);
    }
    bounce(g, 0, cy, rx, ry, dead ? [150, 90, 50] : [255, 190, 120], 0.18);
    sheen(g, 0, cy, rx, ry, dead ? 0.55 : 1);
    g.restore();
    // ---- eyestalk cap
    g.save(); g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 2 * SS; g.shadowOffsetX = -LX * 0.8 * SS; g.shadowOffsetY = -LY * 0.8 * SS; capPath(g); g.fillStyle = '#222'; g.fill(); g.restore();
    g.save(); capPath(g); g.clip();
    { const gr = g.createLinearGradient(0, -14.4, 0, -8.4); gr.addColorStop(0, T(pal.trim, 1.85)); gr.addColorStop(0.4, T(pal.trim, 1.05)); gr.addColorStop(0.8, T(pal.band, 1.0)); gr.addColorStop(1, T(pal.band, 0.55)); g.fillStyle = gr; g.fillRect(-9, -15, 20, 8); }
    // recessed platform the stalks stand in
    g.save(); g.beginPath(); g.ellipse(1.2, -11.0, 7.0, 2.0, 0, 0, TAU); g.clip();
    { const gr = g.createLinearGradient(0, -13, 0, -9); gr.addColorStop(0, T(pal.band, 0.42)); gr.addColorStop(1, T(pal.band, 1.15)); g.fillStyle = gr; g.fillRect(-7, -13.4, 16, 4.6); }
    g.restore(); g.strokeStyle = 'rgba(255,255,248,0.4)'; g.lineWidth = 0.35; g.beginPath(); g.ellipse(1.2, -10.8, 7.2, 2.2, 0, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    for (const st of HD_STALK) { g.fillStyle = '#0a0a0b'; g.beginPath(); g.ellipse(st.x, st.y + 0.4, st.r + 0.7, 0.9, 0, 0, TAU); g.fill(); g.strokeStyle = T(pal.trim, 1.3); g.lineWidth = 0.3; g.stroke(); }
    rivet(g, -6.8, -10.8, 0.4, pal.trim); rivet(g, 9.6, -10.4, 0.4, pal.trim);
    g.restore(); g.strokeStyle = 'rgba(10,8,6,0.62)'; g.lineWidth = 0.4; capPath(g); g.stroke();
  }, {
    weather: hdWeather(v, dead),
    post: (g) => {
      if (dead) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(12,9,7,0.34)'; g.fillRect(-24, -26, 48, 52); g.restore(); }
      g.lineWidth = 0.66; g.strokeStyle = 'rgba(10,8,6,0.64)'; shellPath(g); g.stroke();
      g.lineWidth = 0.5; for (const n of HD_NOZ) bell(g, n, (g) => { bellPath(g, n); g.stroke(); });
    },
  });
}

// ---- articulated pieces (baked per facing; rotated at draw time)
function buildHandyParts(pal, dead) {
  const P = {};
  const soot2 = (g) => { if (dead) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(12,9,7,0.34)'; g.fillRect(-30, -30, 60, 60); g.restore(); } };
  // arm ring: axis along +x, top (-y) lit
  P.ring = part(6, 6, 3, 3, (g) => {
    g.save(); g.beginPath(); rrect(g, -1.75, -2.05, 3.5, 4.1, 1.05); g.clip();
    cylFill(g, -2, -2.2, 4, 4.4, pal.tool, false, { hi: 1.65 });
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(1.3, -2.2, 0.5, 4.4); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(-1.75, -2.2, 0.35, 4.4);
    g.restore(); g.strokeStyle = 'rgba(10,8,6,0.62)'; g.lineWidth = 0.34; g.beginPath(); rrect(g, -1.75, -2.05, 3.5, 4.1, 1.05); g.stroke();
  }, { weather: { seed: 61, rust: dead ? 0.6 : 0.4, grime: 0.5, th: 0.74, rf: 0.6, eb: 0.2, chip: 0.5, edgeR: 1.2 }, post: soot2 });
  // chrome collar ring (every third segment / joints)
  P.collar = part(6, 7, 3, 3.5, (g) => {
    g.save(); g.beginPath(); rrect(g, -1.5, -2.7, 3.0, 5.4, 0.8); g.clip();
    cylFill(g, -2, -2.8, 4, 5.6, pal.trim, false, { hi: 1.8 });
    g.restore(); g.strokeStyle = 'rgba(10,8,6,0.62)'; g.lineWidth = 0.34; g.beginPath(); rrect(g, -1.5, -2.7, 3.0, 5.4, 0.8); g.stroke();
  }, { weather: { seed: 62, rust: 0.3, grime: 0.4, th: 0.78, rf: 0.6, chip: 0.4, edgeR: 1 }, post: soot2 });
  // ball joint at wrists
  P.ball = part(9, 9, 4.5, 4.5, (g) => {
    const gr = g.createRadialGradient(LX * 1.4, LY * 1.4, 0.2, 0, 0, 3.4); gr.addColorStop(0, T(pal.trim, 1.9)); gr.addColorStop(0.5, T(pal.trim, 0.9)); gr.addColorStop(1, T(pal.band, 0.4));
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 3.3, 0, TAU); g.fill(); g.strokeStyle = 'rgba(10,8,6,0.62)'; g.lineWidth = 0.4; g.stroke();
    g.fillStyle = 'rgba(255,255,250,0.5)'; g.beginPath(); g.ellipse(LX * 1.5, LY * 1.5, 0.9, 0.5, Math.atan2(LY, LX) + Math.PI / 2, 0, TAU); g.fill();
  }, { post: soot2 });
  // saw blade (no baked directional light so it can spin) + static shade overlay
  P.blade = part(20, 20, 10, 10, (g) => {
    const teeth = 22, ro = 8.1, ri = 6.7;
    g.beginPath(); for (let i = 0; i < teeth; i++) { const a = i / teeth * TAU, b = (i + 0.55) / teeth * TAU, c2 = (i + 1) / teeth * TAU; g.lineTo(Math.cos(a) * ri, Math.sin(a) * ri); g.lineTo(Math.cos(b) * ro, Math.sin(b) * ro); g.lineTo(Math.cos(c2) * ri, Math.sin(c2) * ri); } g.closePath();
    g.save(); g.clip();
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, ro); gr.addColorStop(0, css([210, 214, 216])); gr.addColorStop(0.6, css([170, 176, 180])); gr.addColorStop(1, css([120, 126, 130])); g.fillStyle = gr; g.fillRect(-9, -9, 18, 18);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.fillStyle = i % 2 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.1)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, ro, a, a + TAU / 16); g.closePath(); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.22; for (const r of [3.4, 4.6, 5.8]) { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
    // expansion slots running in from the tooth roots, each ending in a relief hole, plus an arbor plate with bolt holes
    g.strokeStyle = '#16181a'; g.lineWidth = 0.55; g.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.35; g.beginPath(); g.moveTo(Math.cos(a) * 6.9, Math.sin(a) * 6.9); g.lineTo(Math.cos(a) * 5.4, Math.sin(a) * 5.4); g.stroke(); g.fillStyle = '#16181a'; g.beginPath(); g.arc(Math.cos(a) * 5.05, Math.sin(a) * 5.05, 0.55, 0, TAU); g.fill(); }
    g.fillStyle = css([150, 156, 160]); g.beginPath(); g.arc(0, 0, 2.7, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 0.28; g.stroke();
    g.fillStyle = 'rgba(20,22,24,0.85)'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0.32, 0, TAU); g.fill(); }
    g.fillStyle = css([82, 86, 90]); g.beginPath(); g.arc(0, 0, 0.9, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(10,8,6,0.72)'; g.lineWidth = 0.34; g.beginPath(); for (let i = 0; i < teeth; i++) { const a = i / teeth * TAU, b = (i + 0.55) / teeth * TAU, c2 = (i + 1) / teeth * TAU; g.lineTo(Math.cos(a) * ri, Math.sin(a) * ri); g.lineTo(Math.cos(b) * ro, Math.sin(b) * ro); g.lineTo(Math.cos(c2) * ri, Math.sin(c2) * ri); } g.closePath(); g.stroke();
  }, { weather: { seed: 71, rust: dead ? 0.85 : 0.65, grime: 0.5, th: 0.55, rf: 0.5, eb: 0.55, bb: 0, chip: 0.6, edgeR: 1.6 }, post: soot2 });
  P.bladeShade = part(20, 20, 10, 10, (g) => {
    g.save(); g.beginPath(); g.arc(0, 0, 6.9, 0, TAU); g.clip();
    let gr = g.createRadialGradient(LX * 3.4, LY * 3.4, 0.5, 0, 0, 8.5); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = gr; g.fillRect(-9, -9, 18, 18); g.restore();
    g.save(); g.translate(LX * 4.2, LY * 4.2); g.rotate(Math.atan2(LY, LX) + Math.PI / 2); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(0, 0, 1.9, 0.45, 0, 0, TAU); g.fill(); g.restore();
  });
  // saw guard: thin C bracket + motor housing, axis toward +x = away from the arm
  P.guard = part(24, 22, 12, 11, (g) => {
    g.strokeStyle = 'rgba(10,8,6,0.7)'; g.lineWidth = 2.4; g.beginPath(); g.arc(0, 0, 8.7, Math.PI * 0.62, Math.PI * 1.38); g.stroke();
    g.strokeStyle = css(pal.accent); g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 8.7, Math.PI * 0.62, Math.PI * 1.38); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.4; g.beginPath(); g.arc(0, 0, 9.3, Math.PI * 1.02, Math.PI * 1.3); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 5; i++) { const a = Math.PI * 0.68 + i * 0.32; g.fillRect(Math.cos(a) * 8.7 - 0.25, Math.sin(a) * 8.7 - 0.25, 0.5, 0.5); }
    // motor housing behind the blade
    g.save(); g.beginPath(); rrect(g, -8.6, -2.9, 5.4, 5.8, 1); g.clip(); cylFill(g, -9, -3, 6, 6, pal.tool, false, { hi: 1.6 }); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-4.6, -3, 0.5, 6); g.restore();
    g.strokeStyle = 'rgba(10,8,6,0.66)'; g.lineWidth = 0.4; g.beginPath(); rrect(g, -8.6, -2.9, 5.4, 5.8, 1); g.stroke();
  }, { weather: { seed: 72, rust: 0.4, grime: 0.5, th: 0.7, rf: 0.5, chip: 0.7, edgeR: 1.4 }, post: soot2 });
  // flamethrower nozzle, pointing +x from the wrist
  P.flamer = part(20, 12, 4, 6, (g) => {
    // fuel canister strapped on top
    g.save(); g.beginPath(); rrect(g, 0.6, -5.2, 6.6, 3.4, 1.2); g.clip(); cylFill(g, 0, -5.4, 8, 3.8, pal.accent, false, { hi: 1.5 }); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(2.4, -5.4, 0.5, 3.8); g.fillRect(5, -5.4, 0.5, 3.8); g.restore();
    g.strokeStyle = 'rgba(10,8,6,0.65)'; g.lineWidth = 0.4; g.beginPath(); rrect(g, 0.6, -5.2, 6.6, 3.4, 1.2); g.stroke();
    // barrel
    g.save(); g.beginPath(); rrect(g, 1, -1.9, 9.2, 3.8, 0.9); g.clip(); cylFill(g, 0, -2, 11, 4, pal.tool, false, { hi: 1.7 }); g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(3.4, -2, 0.5, 4); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(6.2, -2, 0.4, 4); g.restore();
    g.strokeStyle = 'rgba(10,8,6,0.66)'; g.lineWidth = 0.4; g.beginPath(); rrect(g, 1, -1.9, 9.2, 3.8, 0.9); g.stroke();
    // flared tip
    g.beginPath(); g.moveTo(9.6, -1.7); g.lineTo(11.8, -2.6); g.lineTo(11.8, 2.6); g.lineTo(9.6, 1.7); g.closePath();
    { const gr = g.createLinearGradient(0, -2.6, 0, 2.6); gr.addColorStop(0, T(pal.tool, 1.7)); gr.addColorStop(0.5, T(pal.tool, 0.9)); gr.addColorStop(1, T(pal.tool, 0.4)); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(10,8,6,0.66)'; g.lineWidth = 0.4; g.stroke(); }
    g.fillStyle = '#0a0a0a'; g.fillRect(11.6, -1.7, 0.6, 3.4);
    // pilot tube + hazard band
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(3, -2); g.quadraticCurveTo(7, -3.6, 11.4, -2.2); g.stroke();
    hazard(g, 4.4, -1.8, 1.5, 3.6, 0.9);
    rivet(g, 2, 0, 0.42, pal.trim);
  }, { weather: { seed: 73, rust: dead ? 0.85 : 0.5, grime: 0.6, th: 0.66, rf: 0.5, eb: 0.2, chip: 0.7, edgeR: 1.4 }, post: (g) => { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(20,12,6,' + (dead ? 0.42 : 0.16) + ')'; g.fillRect(9, -6, 8, 12); g.restore(); soot2(g); } });
  // claw jaws, hinge at origin, pointing +x, hooking toward +y; the lower jaw is a mirrored bake that stays top-lit
  const mkJaw = (mirror) => part(14, 10, 2, 5, (g) => {
    const oLY = LY; if (mirror) { g.scale(1, -1); LY = -LY; }
    const jp = (g) => { g.beginPath(); g.moveTo(-1.5, -1.6); g.lineTo(3.6, -2.0); g.quadraticCurveTo(8.6, -1.8, 10.6, 1.6); g.lineTo(9.4, 2.2); g.quadraticCurveTo(7.6, 0.2, 3.4, 0.5); g.lineTo(-1.5, 1.7); g.closePath(); };
    g.save(); jp(g); g.clip(); cylFill(g, -2, -2.4, 14, 5, pal.trim, false, { hi: 1.7 });
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(2.2, -2.4, 0.5, 5); g.fillStyle = 'rgba(20,20,20,0.85)'; g.beginPath(); g.moveTo(6.4, 0.3); g.lineTo(9.4, 2.2); g.lineTo(10.4, 1.6); g.lineTo(8.4, -0.4); g.closePath(); g.fill();
    g.restore(); g.strokeStyle = 'rgba(10,8,6,0.68)'; g.lineWidth = 0.42; jp(g); g.stroke();
    rivet(g, 0.4, 0, 0.6, pal.band);
    LY = oLY;
  }, { weather: { seed: 74, rust: dead ? 0.8 : 0.45, grime: 0.55, th: 0.68, rf: 0.5, eb: 0.3, chip: 0.7, edgeR: 1.2 }, post: soot2 });
  P.jaw = mkJaw(false); P.jawL = mkJaw(true);
  P.wrist = part(9, 9, 3, 4.5, (g) => {   // claw base block
    g.save(); g.beginPath(); rrect(g, -1, -3.1, 4.6, 6.2, 1.1); g.clip(); cylFill(g, -1.5, -3.3, 6, 6.6, pal.tool, false, { hi: 1.6 }); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(2.2, -3.3, 0.5, 6.6); g.restore();
    g.strokeStyle = 'rgba(10,8,6,0.66)'; g.lineWidth = 0.42; g.beginPath(); rrect(g, -1, -3.1, 4.6, 6.2, 1.1); g.stroke(); bolt(g, 1.2, 0, 0.8, pal.trim, 0.3);
  }, { post: soot2 });
  // eye housing at stalk tips, pointing +x
  P.eyeH = part(10, 8, 3, 4, (g) => {
    g.save(); g.beginPath(); rrect(g, -1.4, -2.3, 5.4, 4.6, 2.1); g.clip(); cylFill(g, -2, -2.5, 8, 5, mixc(pal.trim, pal.tool, 0.7), false, { hi: 1.7 }); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-0.2, -2.5, 0.4, 5); g.restore();
    g.strokeStyle = 'rgba(10,8,6,0.66)'; g.lineWidth = 0.4; g.beginPath(); rrect(g, -1.4, -2.3, 5.4, 4.6, 2.1); g.stroke();
    g.fillStyle = '#08090a'; g.beginPath(); g.ellipse(3.6, 0, 1.0, 1.9, 0, 0, TAU); g.fill(); g.strokeStyle = T(pal.trim, 1.4); g.lineWidth = 0.35; g.stroke();
  }, { post: soot2 });
  return P;
}

const HDC = {};
function hdSet(dir, v, dead, only) {     // only: 'body' | 'P' bakes just that half (used by the warm-up to keep every bake short)
  const key = (dead ? 'd' : 'a') + dir + v;
  const s = HDC[key] || (HDC[key] = { pal: HD_PAL[v] });
  if (!s.body && only !== 'P') s.body = withDir(dir, () => buildHandyBody(s.pal, 600 + v * 53, dead, v));
  if (!s.P && only !== 'body') s.P = withDir(dir, () => buildHandyParts(s.pal, dead));
  return s;
}

// ---- drawing helpers
const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const easeOut = (u) => 1 - Math.pow(1 - u, 3);
function armCurve(S, H, L0, pref) {
  const dx = H[0] - S[0], dy = H[1] - S[1], d = Math.hypot(dx, dy) || 1;
  const bulge = Math.sqrt(Math.max(0, L0 * L0 / 4 - d * d / 4)) * 0.8 + 0.3;
  let nx = -dy / d, ny = dx / d; if (nx * pref[0] + ny * pref[1] < 0) { nx = -nx; ny = -ny; }
  return { S, H, C: [(S[0] + H[0]) / 2 + nx * bulge * 1.6, (S[1] + H[1]) / 2 + ny * bulge * 1.6], d };
}
function armDraw(ctx, arm, P, ldir) {
  const S = arm.S, C = arm.C, H = arm.H;
  // approximate length for the ring count
  const len = Math.hypot(C[0] - S[0], C[1] - S[1]) + Math.hypot(H[0] - C[0], H[1] - C[1]);
  const n = Math.max(3, Math.round(len * 0.92 / 2.5));
  // soft contact shadow of the whole hose on the body
  ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(S[0] + 0.7, S[1] + 1.2); ctx.quadraticCurveTo(C[0] + 0.7, C[1] + 1.2, H[0] + 0.7, H[1] + 1.2); ctx.stroke(); ctx.restore();
  for (let i = 0; i <= n; i++) {
    const u = i / n, mu = 1 - u;
    const x = mu * mu * S[0] + 2 * mu * u * C[0] + u * u * H[0], y = mu * mu * S[1] + 2 * mu * u * C[1] + u * u * H[1];
    const dx = 2 * mu * (C[0] - S[0]) + 2 * u * (H[0] - C[0]), dy = 2 * mu * (C[1] - S[1]) + 2 * u * (H[1] - C[1]);
    const a = Math.atan2(dy, dx);
    const dv = Math.sin(a) * ldir[0] - Math.cos(a) * ldir[1];
    const spr = (i % 3 === 1) ? P.collar : P.ring, sc = lerp(1.0, 0.86, u);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1, sc); litSprite(ctx, spr, dv, 0, 0); ctx.restore();
  }
}
function a2(H, C) { return Math.atan2(H[1] - C[1], H[0] - C[0]); }
// Turbulent flame jet: three stacked licking layers (red-orange, orange-yellow, white core) whose edges are displaced
// by moving noise, plus additive smoke-glow puffs and drifting embers. Narrow at the nozzle, fattest at ~1/3, thinning to the tip.
function flameJet(ctx, x, y, ang, len, t, k, sd) {
  if (FO || k <= 0.02) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalCompositeOperation = 'lighter';
  len *= k * (0.93 + 0.1 * flick(t, sd + 6));
  const layers = [
    { w: 13, l: 1.0, c: ['255,120,40', '235,60,14', '150,20,0'], a: 0.5, s: 0 },
    { w: 8.6, l: 0.82, c: ['255,190,80', '255,120,30', '200,50,8'], a: 0.62, s: 1 },
    { w: 4.4, l: 0.55, c: ['255,250,225', '255,214,120', '255,140,40'], a: 0.85, s: 2 },
  ];
  const N = 16;
  for (const L of layers) {
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, prof = (0.1 + 0.9 * Math.sin(Math.PI * Math.pow(u, 0.62))) * (1 - u * 0.55);
      const nt = U.vnoise(u * 3.2 - t * 9 + sd * 7 + L.s * 5.1, L.s * 3.7 + 1, 8) - 0.5, nb = U.vnoise(u * 3.2 - t * 9.7 + sd * 3 + L.s * 2.3, L.s * 5.9 + 4, 9) - 0.5;
      const w = L.w * k * prof * 0.5, px = u * len * L.l;
      top.push([px, -w * (1 + nt * 1.3) + nt * 1.6 * u]); bot.push([px, w * (1 + nb * 1.3) + nb * 1.6 * u]);
    }
    const gr = ctx.createLinearGradient(0, 0, len * L.l, 0);
    gr.addColorStop(0, 'rgba(' + L.c[0] + ',' + L.a + ')'); gr.addColorStop(0.4, 'rgba(' + L.c[1] + ',' + (L.a * 0.8) + ')'); gr.addColorStop(1, 'rgba(' + L.c[2] + ',0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i < N; i++) ctx.quadraticCurveTo(top[i][0], top[i][1], (top[i][0] + top[i + 1][0]) / 2, (top[i][1] + top[i + 1][1]) / 2);
    ctx.lineTo(top[N][0], top[N][1]); ctx.lineTo(bot[N][0], bot[N][1]);
    for (let i = N - 1; i > 0; i--) ctx.quadraticCurveTo(bot[i][0], bot[i][1], (bot[i][0] + bot[i - 1][0]) / 2, (bot[i][1] + bot[i - 1][1]) / 2);
    ctx.lineTo(bot[0][0], bot[0][1]);
    ctx.closePath(); ctx.fill();
  }
  // soft glow puffs riding the plume
  for (let i = 0; i < 8; i++) {
    const u = (i + 0.5) / 8, wob = (U.vnoise(t * 12 + i * 1.9 + sd, i * 3.3 + sd, 6) - 0.5) * 2;
    const px = u * len * 0.92, py = wob * (0.6 + u * 3.6) * k, r = (3.2 + u * 6.5) * (1 - u * 0.35) * k, a = (1 - u * 0.75) * 0.34 * k;
    ctx.globalAlpha = BA * Math.min(1, a); ctx.drawImage(glowSpr('255,130,50'), px - r, py - r, r * 2, r * 2);
    if (u < 0.6) { ctx.globalAlpha = BA * Math.min(1, a * 1.5); ctx.drawImage(glowSpr('255,226,160'), px - r * 0.5, py - r * 0.5, r, r); }
  }
  ctx.globalAlpha = BA;
  // embers
  for (let i = 0; i < 7; i++) {
    const ph2 = (t * (1.4 + U.hash2(i, 3, 61) * 1.2) + U.hash2(i, 5, 62)) % 1, px = (0.25 + ph2 * 0.95) * len * 0.95, py = (U.hash2(i, 7, 63) - 0.5) * (3 + ph2 * 10) * k;
    ctx.fillStyle = 'rgba(255,' + (150 + (U.hash2(i, 9, 64) * 80 | 0)) + ',70,' + ((1 - ph2) * 0.9 * k) + ')'; ctx.fillRect(px, py, 0.9, 0.9);
  }
  ctx.restore();
}
function stalk(ctx, S, x, y, ang, len, r, P, ldir, lens, glowCol, t, dead, sd) {
  const ex = x + Math.cos(ang - Math.PI / 2) * len, ey = y + Math.sin(ang - Math.PI / 2) * len;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(10,8,6,0.7)'; ctx.lineWidth = r * 1.5 + 0.9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = css(tone(S.pal.tool, 1.0)); ctx.lineWidth = r * 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,248,0.5)'; ctx.lineWidth = r * 0.4; ctx.beginPath(); ctx.moveTo(x + ldir[0] * r * 0.38, y + ldir[1] * r * 0.38); ctx.lineTo(ex + ldir[0] * r * 0.38, ey + ldir[1] * r * 0.38); ctx.stroke();
  ctx.strokeStyle = css(tone(S.pal.trim, 1.0)); ctx.lineWidth = r * 1.85; ctx.lineCap = 'butt';
  for (const f of [0.3, 0.62]) { const px = lerp(x, ex, f), py = lerp(y, ey, f), dx = Math.cos(ang - Math.PI / 2), dy = Math.sin(ang - Math.PI / 2); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dx * 0.9, py + dy * 0.9); ctx.stroke(); }
  ctx.restore();
  // eye housing at the tip
  const s = r / 1.5 * 1.05, a = ang - Math.PI / 2;
  const dvh = Math.sin(a) * ldir[0] - Math.cos(a) * ldir[1];
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.scale(s, s); litSprite(ctx, P.eyeH, dvh, 0, 0); ctx.restore();
  // lens
  const lx = ex + Math.cos(a) * 3.55 * s, ly = ey + Math.sin(a) * 3.55 * s, lr = 1.5 * s;
  if (!dead) {
    ctx.fillStyle = 'rgb(' + glowCol + ')'; ctx.beginPath(); ctx.ellipse(lx, ly, lr * 0.62, lr, a, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(lx - 0.25 * s, ly - 0.4 * s, 0.3 * s, 0, TAU); ctx.fill();
    glow(ctx, lx + Math.cos(a) * 1.2 * s, ly + Math.sin(a) * 1.2 * s, 5.0 * s, glowCol, 0.62 * lens); glow(ctx, lx, ly, 2.0 * s, '255,250,235', 0.5 * lens);
  } else { ctx.fillStyle = '#15171a'; ctx.beginPath(); ctx.ellipse(lx, ly, lr * 0.62, lr, a, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(lx - 0.5, ly - 0.7); ctx.lineTo(lx + 0.4, ly + 0.6); ctx.stroke(); }
}
function sparksFx(ctx, x, y, t, k, ang0) {   // sparks thrown off the blade: short streaks on falling arcs, each on its own staggered cycle
  if (FO || k <= 0.05) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const rate = 3.2 + U.hash2(i, 1, 71) * 1.6, off = U.hash2(i, 2, 72), cyc = Math.floor(t * rate + off), ph = (t * rate + off) % 1;
    const life = 0.3 + U.hash2(i, 3, 73) * 0.2, a = ang0 + (U.hash2(i, cyc, 74) - 0.5) * 2.2, v = 26 + U.hash2(i, cyc, 75) * 30;
    const tt = ph * life, tt2 = Math.max(0, tt - 0.035), g = 70;
    const px = x + Math.cos(a) * v * tt, py = y + Math.sin(a) * v * tt + g * tt * tt, qx = x + Math.cos(a) * v * tt2, qy = y + Math.sin(a) * v * tt2 + g * tt2 * tt2;
    ctx.strokeStyle = 'rgba(255,' + (215 - ph * 90 | 0) + ',' + (120 - ph * 70 | 0) + ',' + ((1 - ph * ph) * 0.95 * k) + ')'; ctx.lineWidth = 0.65 - ph * 0.25;
    ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke();
  }
  ctx.restore(); glow(ctx, x, y, 7, '255,190,90', 0.5 * k);
}

CD.art.handy = function (ctx, e, G, flashOnly) {
  FO = !!flashOnly; BA = ctx.globalAlpha;
  const dead = isDead(e), face = e.face < 0 ? -1 : 1, t = e.t || 0, ph = seedOf(e);
  const S = hdSet(face, dead ? 0 : variantOf(e, HD_PAL.length), dead), P = S.P;
  const st = e.state, vx = e.vx || 0, vy = e.vy || 0, k = clamp(e.atkK || 0, 0, 1);
  const fire = !dead && st === 'fire', wind = !dead && st === 'windup', atk = !dead && st === 'attack';
  const hostile = !dead && (e.alert > 0 || fire || wind || atk || st === 'chase');
  const ldir = [-0.45 * face, -0.89];
  const sw = (i, a) => Math.sin(t * 1.7 + ph + i * 2.1) * a;
  const bob = dead ? 0 : Math.sin(t * 2.3 + ph) * 1.6 + Math.sin(t * 4.9 + ph) * 0.25;
  // ---- pose targets in local, mirrored space: saw = blade centre, flamer/claw = wrist
  const SK = HD_SOCK; let saw = [15.8 + sw(0, 0.6), 21.4 + sw(1, 0.8)], flm = [17.4 + sw(2, 0.5), 4.4 + sw(3, 0.8)], clw = [-17.4 + sw(4, 0.7), 15 + sw(5, 0.8)], flmA = 0.34 + sw(6, 0.05), open = 0.26 + 0.2 * Math.sin(t * 1.3 + ph), spin = 4.5, sweepK = -1, lean = 0, lunge = 0;
  const P0 = G && G.player;
  const dragX = clamp(-vx * face * 0.022, -3.2, 3.2), dragY = clamp(-vy * 0.02, -2.5, 2.5);   // hoses trail behind when the robot moves
  const sweepPos = (kk) => { const u = kk * kk * (3 - 2 * kk), a = lerp(-1.25, 0.66, u), R = lerp(17.5, 19.6, u); return [SK.saw[0] + Math.cos(a) * R, SK.saw[1] + Math.sin(a) * R]; };
  if (dead) { saw = [12, 22.5]; flm = [15, 14]; clw = [-14, 20]; flmA = 1.15; open = 0.5; }
  else if (!wind && !atk && !fire) { saw[0] += dragX; saw[1] += dragY; flm[0] += dragX; flm[1] += dragY; clw[0] += dragX; clw[1] += dragY; }
  else if (wind) { const u = easeOut(clamp(k * 1.6, 0, 1)); const a = lerp(0.95, -1.25, u), R = lerp(15.5, 17.5, u); saw = [SK.saw[0] + Math.cos(a) * R, SK.saw[1] + Math.sin(a) * R]; flm = lerp2(flm, [18.5, -8.5], u); flmA = lerp(0.34, -0.85, u); clw = lerp2(clw, [-21, -3], u); open = lerp(0.3, 0.9, u); spin = 13; lean = -0.09 * u; }
  else if (atk) { sweepK = k; saw = sweepPos(k); flm = [19.5, -6]; flmA = -0.5; clw = [-21, -3]; open = 0.8; spin = 40; lean = lerp(-0.09, 0.12, k * k * (3 - 2 * k)); lunge = Math.sin(k * Math.PI) * 3.2; }
  else if (fire) {
    let aim = 0.3; if (P0 && !P0.dead) { const nx = (P0.cx - e.cx) * face - 22, ny = P0.cy - (e.cy + bob) - 4; aim = clamp(Math.atan2(ny, Math.max(nx, 4)), -0.5, 1.2); }
    const R = 8; flm = [SK.flame[0] + Math.cos(aim) * (R + 5), SK.flame[1] + Math.sin(aim) * (R + 5)]; flmA = aim; saw = [15.2, 21.8]; clw = [-18.6, 9]; open = 0.7; spin = 9; lean = -0.05;
  }
  const sm = smoothState(e, { sx: saw[0], sy: saw[1], fx: flm[0], fy: flm[1], cx: clw[0], cy: clw[1], fa: flmA, open, spin, lean, lunge, eye: hostile ? 1 : 0, fireK: fire ? 1 : atk ? 0.34 : 0, wk: wind || atk ? 1 : 0 }, { sx: atk ? 60 : 14, sy: atk ? 60 : 14, fx: 14, fy: 14, cx: 12, cy: 12, fa: 16, open: 12, spin: 8, lean: 10, lunge: 40, eye: 8, fireK: 20, wk: 12 });
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const wx = ctx.getTransform ? ctx.getTransform() : null;
  ctx.translate(e.cx, e.cy + bob);
  let tilt = dead ? 0 : clamp(vx * 0.0012, -0.12, 0.12) + sm.lean * face + Math.sin(t * 1.7 + ph) * 0.015;   // lean is in the robot's own frame (+ = forward)
  if (e.stun > 0) tilt += Math.sin(t * 66) * 0.05 * Math.min(1, e.stun / 0.1);
  if (tilt) ctx.rotate(tilt);
  if (face < 0) ctx.scale(-1, 1);
  ctx.translate(sm.lunge, 0);
  // ---- thruster flames
  if (!dead) {
    const thrust = clamp(0.62 + (-vy) / 150 + (hostile ? 0.12 : 0), 0.35, 1.4);
    for (let i = 0; i < 3; i++) {
      const n = HD_NOZ[i], f = flick(t, i + ph);
      const ex = n.x - Math.sin(n.a) * n.L, ey = HD_NZ_Y + Math.cos(n.a) * n.L, ang = Math.PI / 2 + n.a * 0.9;
      flame(ctx, ex, ey, ang, (4.2 + 4.6 * thrust) * (i === 1 ? 1.2 : 1) * (0.7 + 0.5 * f), 5.0 * (0.8 + 0.3 * thrust), ['255,250,225', '255,168,66', '230,64,20'], 0.92);
      glow(ctx, ex, ey + 1, 5.2, '255,190,110', 0.7 * thrust);
    }
    glow(ctx, 0, 21, 17, '255,150,70', 0.13 * thrust, 1, 0.5);
  }
  // ---- far-side details: the claw arm hangs behind the body
  const clawArm = armCurve(SK.claw, [sm.cx, sm.cy], 19, [-0.4, 1]);
  const scx = sm.sx - SK.saw[0], scy = sm.sy - SK.saw[1], scd = Math.hypot(scx, scy) || 1, saa = Math.atan2(scy, scx);
  const sawArm = armCurve(SK.saw, [sm.sx - scx / scd * 5.6, sm.sy - scy / scd * 5.6], 18.5, [0.15, 1]);
  const flmArm = armCurve(SK.flame, [sm.fx, sm.fy], 17.5, [0.2, 1]);
  put(ctx, S.body, 0, 0);
  // ---- eyestalks (behind arms, in front of the cap)
  {
    const ec = hostile ? '255,58,36' : '255,190,70', ekk = 0.8 + 0.2 * Math.sin(t * 3 + ph);
    let tx = 0, ty = 0;
    if (P0 && !P0.dead && !dead) { tx = clamp(((P0.cx - e.cx) * face) / 140, -1, 1); ty = clamp((P0.cy - e.cy) / 140, -1, 1); }
    else if (!dead) tx = 0.35;
    for (let i = 0; i < 3; i++) {
      const s = HD_STALK[i];
      let a = s.a + sw(i + 7, 0.09) + tx * 0.16 + (i === 1 ? -ty * 0.06 : 0) + (wind || atk ? -0.12 * sm.wk : 0) + clamp(-vx * face * 0.0006, -0.1, 0.1);
      let len = s.len + sw(i + 3, 0.6);
      if (dead) { a = i === 0 ? -1.55 : i === 1 ? 0.75 : 1.9; len = s.len * (i === 1 ? 0.55 : i === 2 ? 0.7 : 0.9); }
      stalk(ctx, S, s.x, s.y, a, len, s.r, P, ldir, ekk, ec, t, dead, i);
    }
  }
  // ---- arms
  armDraw(ctx, clawArm, P, ldir);
  armDraw(ctx, flmArm, P, ldir);
  armDraw(ctx, sawArm, P, ldir);
  // claw
  {
    const H = clawArm.H, a = a2(H, clawArm.C) + (dead ? 0.0 : Math.sin(t * 1.3 + ph) * 0.05), op = sm.open;
    ctx.save(); ctx.translate(H[0], H[1]); ctx.rotate(a); ctx.scale(0.88, 0.88); put(ctx, P.ball, 0, 0); put(ctx, P.wrist, 1.2, 0);
    ctx.save(); ctx.translate(4.4, 0); ctx.rotate(-op); put(ctx, P.jaw, 0, 0); ctx.restore();
    ctx.save(); ctx.translate(4.4, 0); ctx.rotate(op); put(ctx, P.jawL, 0, 0); ctx.restore();
    ctx.restore();
  }
  // flamer
  {
    const H = flmArm.H, a = sm.fa;
    ctx.save(); ctx.translate(H[0], H[1]); ctx.rotate(a); ctx.scale(0.86, 0.86); put(ctx, P.ball, 0, 0);
    put(ctx, P.flamer, 0, 0); ctx.restore();
    const tipx = H[0] + Math.cos(a) * 10.4, tipy = H[1] + Math.sin(a) * 10.4;
    if (!dead) {
      const fk = sm.fireK;
      // pilot light
      const pf = 0.65 + 0.35 * flick(t, 9 + ph);
      flame(ctx, tipx, tipy, a, 3.4 * pf, 1.9, ['200,230,255', '255,170,60', '255,100,20'], 0.85); glow(ctx, tipx, tipy, 4.5, '255,170,80', 0.45 * pf);
      if (fk > 0.02) { flameJet(ctx, tipx, tipy, a, 50, t, fk, ph); glow(ctx, tipx, tipy, 9, '255,190,100', 0.8 * fk); glow(ctx, tipx + Math.cos(a) * 16, tipy + Math.sin(a) * 16, 22, '255,120,40', 0.28 * fk); }
    }
  }
  // saw
  {
    const H = sawArm.H, aa = saa, TS = 0.86;
    if (sweepK >= 0) for (let g = 3; g >= 1; g--) {   // motion ghosts while sweeping
      const gp = sweepPos(Math.max(0, sweepK - g * 0.07));
      ctx.save(); ctx.globalAlpha = BA * 0.17 * (4 - g) / 3; ctx.translate(gp[0], gp[1]); ctx.scale(TS, TS); ctx.rotate(t * 30); put(ctx, P.blade, 0, 0); ctx.restore();
    }
    ctx.save(); ctx.translate(H[0], H[1]); ctx.rotate(aa); ctx.scale(TS, TS); put(ctx, P.ball, 0, 0);
    ctx.save(); ctx.translate(2.6, 0); litSprite(ctx, P.guard, Math.sin(aa) * ldir[0] - Math.cos(aa) * ldir[1], 4, 0); ctx.restore();
    ctx.restore();
    const bx = sm.sx, by = sm.sy, spinA = t * sm.spin + ph;
    ctx.save(); ctx.translate(bx, by); ctx.scale(TS, TS);
    const fast = sm.spin > 20 ? 1 : sm.spin > 8 ? 0.5 : 0;
    if (fast > 0.6) { for (let c = 0; c < 4; c++) { ctx.save(); ctx.rotate(spinA + c * 0.085); ctx.globalAlpha = BA * [0.55, 0.42, 0.34, 0.28][c]; put(ctx, P.blade, 0, 0); ctx.restore(); } ctx.globalAlpha = BA; }
    else if (fast > 0.2) { for (let c = 0; c < 2; c++) { ctx.save(); ctx.rotate(spinA + c * 0.1); ctx.globalAlpha = BA * (c ? 0.5 : 0.85); put(ctx, P.blade, 0, 0); ctx.restore(); } ctx.globalAlpha = BA; }
    else { ctx.save(); ctx.rotate(spinA); put(ctx, P.blade, 0, 0); ctx.restore(); }
    put(ctx, P.bladeShade, 0, 0);
    if (fast > 0.6) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,240,220,0.22)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 7.2, 0, TAU); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    if (atk && k > 0.35) sparksFx(ctx, bx + 4, by + 3, t, smooth(0.35, 0.6, k) * (1 - smooth(0.9, 1, k)), 0.6);
  }
  // ---- eye flare
  if (!dead) {
    // main-stalk eye gets an extra bloom while hostile (computed at the stalk tip)
    const s = HD_STALK[1], a = s.a + sw(8, 0.09) - Math.PI / 2, len = s.len + sw(4, 0.6), tx = s.x + Math.cos(a) * (len + 2.6), ty = s.y + Math.sin(a) * (len + 2.6);
    if (sm.eye > 0.02) glow(ctx, tx, ty, 11, '255,60,40', 0.45 * sm.eye);
    if (fire || atk) glow(ctx, tx, ty, 16, '255,70,44', 0.6);
  }
  ctx.restore();
  if (dead) {
    // smoke, in world alignment
    ctx.save(); const rot = wx ? Math.atan2(wx.b, wx.a) : 0; ctx.translate(e.cx, e.cy); ctx.rotate(-rot);
    for (let i = 0; i < 7; i++) {
      const p = (t * 0.4 + i / 7) % 1, x = Math.sin(p * 5 + i * 1.9) * 3 * p - 1, y = -6 - p * 32, r = 2.6 + p * 8;
      ctx.globalAlpha = FO ? 0 : BA * 0.5 * (1 - p) * smooth(0, 0.12, p); ctx.drawImage(puffSpr(p < 0.4 ? '52,48,46' : '96,92,88'), x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }
};


// ------------------------------------------------------------------ cache warm-up
// Bake the sprite sets one per timer tick shortly after load, so the first sighting of a robot never causes a hitch.
// A failure here is harmless: every set is also built lazily on first use.
(function () {
  const jobs = [];
  for (const d of [1, -1]) {
    for (let v = 0; v < EB_PAL.length; v++) jobs.push(() => ebSet(d, v, false));
    for (let v = 0; v < HD_PAL.length; v++) jobs.push(() => hdSet(d, v, false, 'body'), () => hdSet(d, v, false, 'P'));
  }
  jobs.push(() => ebLens(), () => tuGun(false));
  for (const k of ['floor', 'ceil', 'wallL', 'wallR']) jobs.push(() => tuMountSpr(k, false));
  for (const d of [1, -1]) jobs.push(() => ebSet(d, 0, true), () => hdSet(d, 0, true, 'body'), () => hdSet(d, 0, true, 'P'));
  jobs.push(() => tuGun(true));
  for (const k of ['floor', 'ceil', 'wallL', 'wallR']) jobs.push(() => tuMountSpr(k, true));
  let i = 0;
  const step = () => { if (i >= jobs.length) return; try { jobs[i++](); } catch (err) { /* lazy path will retry */ } setTimeout(step, 30); };
  if (typeof setTimeout === 'function' && typeof document !== 'undefined') setTimeout(step, 700);
})();

})();
