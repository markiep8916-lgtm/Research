// Particles, floating text, screen shake and post-processing (vignette, grain, grading).
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;

function FX(world) {
  this.world = world; this.p = []; this.texts = []; this.shakeMag = 0; this.shakeT = 0; this.shakeDur = 0.001; this.time = 0;
  this.soft = CD.tex.makeGlow(64);
  this.flashA = 0; this.flashCol = '#fff';
  this.decals = [];
}
CD.FX = FX;
const P = FX.prototype;

P.shake = function (mag, dur) { if (mag > this.shakeMag * (this.shakeT / this.shakeDur)) { this.shakeMag = mag; this.shakeT = dur || 0.2; this.shakeDur = dur || 0.2; } };
P.flash = function (col, a) { this.flashCol = col || '#fff'; this.flashA = Math.max(this.flashA, a === undefined ? 0.5 : a); };
P.offset = function () { if (this.shakeT <= 0) return [0, 0]; const k = this.shakeMag * (this.shakeT / this.shakeDur); return [(Math.random() - 0.5) * 2 * k, (Math.random() - 0.5) * 2 * k]; };

P.add = function (o) { if (this.p.length < 1400) this.p.push(o); return o; };
// generic emitters --------------------------------------------------------
P.spark = function (x, y, n, dirX, dirY, spread, speed, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * spread, v = speed * (0.4 + Math.random() * 0.8);
    this.add({ t: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.25 + Math.random() * 0.3, max: 0.5, g: 900, col: col || '255,210,120', size: 1.4 });
  }
};
P.blood = function (x, y, n, dirX, dirY, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * 1.4, v = 60 + Math.random() * 260;
    this.add({ t: 'blood', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + Math.random() * 0.6, max: 1, g: 1100, col: col || '120,14,12', size: 1.5 + Math.random() * 2.2 });
  }
};
P.smoke = function (x, y, n, col, size, up) {
  for (let i = 0; i < n; i++) this.add({ t: 'smoke', x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 30, vy: -(up || 30) * (0.4 + Math.random()), life: 0.8 + Math.random() * 0.9, max: 1.5, col: col || '70,66,62', size: size || 10, grow: 26 });
};
P.dust = function (x, y, n, dir) {
  for (let i = 0; i < n; i++) this.add({ t: 'smoke', x: x + (Math.random() - 0.5) * 14, y: y - 2, vx: (dir || 0) * 30 * Math.random() + (Math.random() - 0.5) * 40, vy: -Math.random() * 26, life: 0.35 + Math.random() * 0.3, max: 0.6, col: '150,132,108', size: 5, grow: 26, a: 0.35 });
};
P.debris = function (x, y, n, col, speed) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = (speed || 220) * (0.3 + Math.random()); this.add({ t: 'chunk', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 1.2 + Math.random() * 1.0, max: 2, g: 1400, col: col || '110,100,88', size: 2 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16, bounce: 0.4 }); }
};
P.casing = function (x, y, dir) {
  this.add({ t: 'casing', x, y, vx: -dir * (40 + Math.random() * 60), vy: -(120 + Math.random() * 100), life: 1.6, max: 1.6, g: 1500, col: '200,160,60', size: 3, rot: 0, vr: 14 * (Math.random() - 0.5), bounce: 0.45 });
};
P.ring = function (x, y, r, col, dur) { this.add({ t: 'ring', x, y, life: dur || 0.35, max: dur || 0.35, size: r, col: col || '255,220,160' }); };
P.glowFlash = function (x, y, r, col, dur) { this.add({ t: 'glow', x, y, life: dur || 0.12, max: dur || 0.12, size: r, col: col || '255,210,140' }); };
P.explosion = function (x, y, r) {
  this.glowFlash(x, y, r * 2.2, '255,190,110', 0.25); this.ring(x, y, r * 1.2, '255,200,140', 0.4);
  this.spark(x, y, 26, 0, -1, 6.28, 480, '255,180,90'); this.smoke(x, y, 12, '54,48,44', 18, 60); this.debris(x, y, 10, '60,54,48', 380);
  for (let i = 0; i < 14; i++) this.add({ t: 'fire', x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r * 0.6, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 90, life: 0.5 + Math.random() * 0.4, max: 0.8, size: 14 + Math.random() * 16 });
  this.shake(9, 0.4); this.flash('#fff', 0.18);
};
P.text = function (x, y, str, col, size, life) { this.texts.push({ x, y, s: String(str), col: col || '#fff', size: size || 14, life: life || 0.9, max: life || 0.9, vy: -46 }); };
P.embers = function (x, y, w, h, n, col) { for (let i = 0; i < n; i++) this.add({ t: 'ember', x: x + Math.random() * w, y: y + Math.random() * h, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 40, life: 1 + Math.random() * 1.5, max: 2, col: col || '255,150,60', size: 1.2 }); };
P.drip = function (x, y, col) { this.add({ t: 'drip', x, y, vx: 0, vy: 0, life: 2, max: 2, g: 900, col: col || '120,150,120', size: 1.4 }); };

P.update = function (dt) {
  this.time += dt;
  if (this.shakeT > 0) this.shakeT -= dt;
  if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - dt * 1.6);
  const w = this.world, arr = this.p;
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i]; p.life -= dt;
    if (p.life <= 0) { arr[i] = arr[arr.length - 1]; arr.pop(); continue; }
    if (p.t === 'ring' || p.t === 'glow') continue;
    if (p.g) p.vy += p.g * dt;
    if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
    let nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
    if (p.bounce !== undefined) {
      if (w && w.isSolid(Math.floor(nx / T), Math.floor(p.y / T))) { p.vx *= -p.bounce; nx = p.x; }
      if (w && w.isSolid(Math.floor(nx / T), Math.floor(ny / T))) { if (p.vy > 0) { p.vy *= -p.bounce; p.vx *= 0.7; p.vr *= 0.6; if (Math.abs(p.vy) < 40) { p.vy = 0; p.g = 0; p.vx = 0; p.vr = 0; } ny = p.y; } else { p.vy *= -0.2; ny = p.y; } }
    } else if ((p.t === 'blood' || p.t === 'drip' || p.t === 'spark') && w && w.isSolid(Math.floor(nx / T), Math.floor(ny / T))) {
      if (p.t === 'blood' && p.vy > 0) { this.decals.push({ x: nx, y: ny, life: 6, col: p.col, r: p.size * 1.1 }); if (this.decals.length > 90) this.decals.shift(); }
      p.life = 0; continue;
    }
    p.x = nx; p.y = ny;
    if (p.rot !== undefined) p.rot += p.vr * dt;
    if (p.grow) p.size += p.grow * dt;
    if (p.t === 'fire') p.vy -= 60 * dt;
  }
  for (let i = this.decals.length - 1; i >= 0; i--) { this.decals[i].life -= dt; if (this.decals[i].life <= 0) this.decals.splice(i, 1); }
  for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life -= dt; t.y += t.vy * dt; t.vy *= 0.94; if (t.life <= 0) this.texts.splice(i, 1); }
};

P.draw = function (ctx, cam) {
  const x0 = cam.x - 40, y0 = cam.y - 40, x1 = cam.x + cam.w + 40, y1 = cam.y + cam.h + 40;
  ctx.save();
  // decals (blood pools on the ground)
  for (const d of this.decals) { if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue; ctx.fillStyle = 'rgba(' + d.col + ',' + Math.min(0.7, d.life * 0.3) + ')'; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * 1.8, d.r * 0.6, 0, 0, 7); ctx.fill(); }
  for (const p of this.p) {
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    const k = p.life / p.max;
    switch (p.t) {
      case 'spark': case 'ember': {
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(' + p.col + ',' + Math.min(1, k * 1.5) + ')'; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; break;
      }
      case 'blood': ctx.fillStyle = 'rgba(' + p.col + ',' + Math.min(1, k * 2) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); break;
      case 'drip': ctx.fillStyle = 'rgba(' + p.col + ',0.8)'; ctx.fillRect(p.x, p.y, 1.4, 3); break;
      case 'smoke': { const a = (p.a || 0.4) * k; ctx.globalAlpha = a; const s = p.size * 2; ctx.drawImage(this.soft, p.x - s, p.y - s, s * 2, s * 2); ctx.globalAlpha = 1; break; }
      case 'chunk': case 'casing': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = 'rgb(' + p.col + ')'; if (p.t === 'casing') { ctx.fillRect(-1.6, -0.9, 3.4, 1.8); ctx.fillStyle = 'rgba(255,240,180,0.7)'; ctx.fillRect(-1.6, -0.9, 3.4, 0.7); } else { ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, 1); } ctx.restore(); break;
      case 'fire': { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k * 0.75; const s = p.size * (0.6 + (1 - k) * 0.6); const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.35, 'rgba(255,150,50,0.8)'); gr.addColorStop(1, 'rgba(160,30,0,0)'); ctx.fillStyle = gr; ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; break; }
      case 'ring': { const r = p.size * (1 - k); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(' + p.col + ',' + k * 0.8 + ')'; ctx.lineWidth = 3 * k + 1; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; break; }
      case 'glow': { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; const s = p.size; const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s); gr.addColorStop(0, 'rgba(' + p.col + ',0.9)'); gr.addColorStop(1, 'rgba(' + p.col + ',0)'); ctx.fillStyle = gr; ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; break; }
    }
  }
  ctx.restore();
};
P.drawText = function (ctx, cam) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of this.texts) {
    if (t.x < cam.x - 60 || t.x > cam.x + cam.w + 60 || t.y < cam.y - 40 || t.y > cam.y + cam.h + 40) continue;
    const k = Math.min(1, t.life / (t.max * 0.5)); ctx.globalAlpha = k; ctx.font = 'bold ' + t.size + 'px "Courier New", monospace';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(t.s, t.x, t.y); ctx.fillStyle = t.col; ctx.fillText(t.s, t.x, t.y);
  }
  ctx.restore();
};
// lights emitted by particles (glow flashes, fire) -> lighting module
P.emitLights = function (L, cam) {
  for (const p of this.p) {
    if (p.x < cam.x - 200 || p.x > cam.x + cam.w + 200 || p.y < cam.y - 200 || p.y > cam.y + cam.h + 200) continue;
    if (p.t === 'glow') L.add({ x: p.x, y: p.y, r: p.size * 2.1, color: U.hex('#ffd7a0').map((v) => v / 255), i: 1.4 * (p.life / p.max), shadow: false });
    else if (p.t === 'fire' && Math.random() < 0.5) L.add({ x: p.x, y: p.y, r: 110, color: [1, 0.55, 0.2], i: 0.5 * (p.life / p.max), shadow: false });
  }
};

// ---------------------------------------------------------------- ambient air particles (dust / ash / motes)
function Ambient() { this.p = []; this.time = 0; }
CD.Ambient = Ambient;
Ambient.prototype.update = function (dt, cam, kind, density, wind) {
  this.time += dt;
  const want = Math.round(70 * density);
  while (this.p.length < want) this.p.push({ x: cam.x + Math.random() * cam.w, y: cam.y + Math.random() * cam.h, z: Math.random(), ph: Math.random() * 6.28 });
  if (this.p.length > want) this.p.length = want;
  for (const p of this.p) {
    p.ph += dt * (0.6 + p.z);
    const k = 0.4 + p.z;
    if (kind === 'ash') { p.x += (wind * 60 * k + Math.sin(p.ph) * 12) * dt; p.y += (18 + 26 * k) * dt; }
    else { p.x += (wind * 10 + Math.sin(p.ph) * 8) * dt * k; p.y += Math.cos(p.ph * 0.7) * 6 * dt * k - 2 * dt; }
    if (p.x < cam.x - 20) p.x += cam.w + 40; if (p.x > cam.x + cam.w + 20) p.x -= cam.w + 40;
    if (p.y < cam.y - 20) p.y += cam.h + 40; if (p.y > cam.y + cam.h + 20) p.y -= cam.h + 40;
  }
};
Ambient.prototype.draw = function (ctx, kind, col) {
  ctx.save(); ctx.fillStyle = col || 'rgba(220,200,170,0.5)';
  for (const p of this.p) {
    const s = kind === 'ash' ? 1 + p.z * 1.6 : 0.8 + p.z * 1.2; ctx.globalAlpha = (0.15 + p.z * 0.5) * (kind === 'ash' ? 0.9 : 0.6);
    ctx.fillRect(p.x, p.y, s, s * (kind === 'ash' ? 0.7 : 1));
  }
  ctx.restore();
};

// ---------------------------------------------------------------- post processing
const POST = (CD.post = {});
POST.init = function (w, h) {
  POST.w = w; POST.h = h;
  POST.grain = CD.tex.makeGrain(256);
  POST.vig = U.canvas(256, 144); const g = POST.vig.getContext('2d');
  const gr = g.createRadialGradient(128, 72, 40, 128, 72, 150); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0.78)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 144);
};
POST.draw = function (ctx, w, h, o) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  // colour grade
  if (o.grade) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgb(' + ((o.grade[0] * 128) | 0) + ',' + ((o.grade[1] * 128) | 0) + ',' + ((o.grade[2] * 128) | 0) + ')'; ctx.globalAlpha = 0.55; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1; }
  // grain
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = o.grain === undefined ? 0.07 : o.grain;
  const gx = Math.floor(Math.random() * 256), gy = Math.floor(Math.random() * 256), gs = (ctx.canvas.width / 1280) * 1.0;
  ctx.save(); ctx.translate(-gx * gs, -gy * gs); for (let y = 0; y < ch + 256 * gs; y += 256 * gs) for (let x = 0; x < cw + 256 * gs; x += 256 * gs) ctx.drawImage(POST.grain, x, y, 256 * gs, 256 * gs); ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // vignette
  ctx.globalAlpha = o.vig === undefined ? 1 : o.vig; ctx.drawImage(POST.vig, 0, 0, cw, ch); ctx.globalAlpha = 1;
  // damage / radiation / screen flash
  if (o.hurt > 0) { const gr = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.25, cw / 2, ch / 2, ch * 0.95); gr.addColorStop(0, 'rgba(160,0,0,0)'); gr.addColorStop(1, 'rgba(190,10,10,' + Math.min(0.8, o.hurt) + ')'); ctx.fillStyle = gr; ctx.fillRect(0, 0, cw, ch); }
  if (o.rad > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(30,200,90,' + (o.rad * 0.07) + ')'; ctx.fillRect(0, 0, cw, ch); ctx.globalCompositeOperation = 'source-over'; }
  if (o.flashA > 0) { ctx.globalAlpha = o.flashA; ctx.fillStyle = o.flashCol || '#fff'; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1; }
  ctx.restore();
};

})();
