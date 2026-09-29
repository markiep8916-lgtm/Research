// Parallax outdoor backdrops: sky gradient, sun, clouds, mountains and ruined-city skylines - all procedural.
(function () {
'use strict';
const CD = window.CD, U = CD.U;

const PALETTES = {
  dusk: {
    sky: [[0, '#2b2444'], [0.24, '#63385a'], [0.46, '#b5674c'], [0.64, '#ee9a58'], [0.8, '#f8c47c'], [1, '#f8c47c']],
    sun: [0.7, 0.5], sunColor: [255, 226, 170], haze: [236, 156, 96], cloud: [246, 176, 128],
    layers: [ // f = parallax factor, hz = screen-height fraction of the layer base
      { f: 0.05, c: [176, 108, 92], min: 90, max: 210, kind: 'mountain', hz: 0.74 },
      { f: 0.12, c: [150, 90, 78], min: 120, max: 270, kind: 'city', hz: 0.78, windows: 0.0 },
      { f: 0.24, c: [104, 62, 56], min: 170, max: 340, kind: 'city', hz: 0.84, windows: 0.14 },
      { f: 0.44, c: [52, 34, 34], min: 210, max: 420, kind: 'ruins', hz: 0.94, windows: 0.2 },
    ],
  },
  dusk_dim: {
    sky: [[0, '#1d1a2c'], [0.24, '#42293a'], [0.46, '#7e4736'], [0.64, '#c07240'], [0.8, '#dc9558'], [1, '#dc9558']],
    sun: [0.3, 0.55], sunColor: [255, 196, 130], haze: [190, 112, 66], cloud: [186, 118, 84],
    layers: [
      { f: 0.05, c: [128, 78, 64], min: 90, max: 210, kind: 'mountain', hz: 0.74 },
      { f: 0.13, c: [102, 62, 52], min: 120, max: 270, kind: 'city', hz: 0.78 },
      { f: 0.26, c: [66, 42, 38], min: 170, max: 340, kind: 'city', hz: 0.84, windows: 0.1 },
      { f: 0.46, c: [34, 22, 22], min: 210, max: 430, kind: 'ruins', hz: 0.94 },
    ],
  },
  // the Meridian plant exterior: smog-thick dusk, sickly olive light, heavy industrial silhouettes
  dusk_toxic: {
    sky: [[0, '#10161a'], [0.22, '#24302c'], [0.44, '#4e5236'], [0.62, '#98763c'], [0.8, '#bd9a52'], [1, '#bd9a52']],
    sun: [0.62, 0.6], sunColor: [236, 208, 132], haze: [132, 116, 70], cloud: [118, 104, 76],
    layers: [
      { f: 0.05, c: [96, 84, 64], min: 90, max: 200, kind: 'mountain', hz: 0.74 },
      { f: 0.12, c: [74, 68, 54], min: 130, max: 290, kind: 'city', hz: 0.78 },
      { f: 0.26, c: [46, 44, 38], min: 180, max: 360, kind: 'city', hz: 0.84, windows: 0.06 },
      { f: 0.46, c: [24, 24, 22], min: 210, max: 440, kind: 'ruins', hz: 0.94 },
    ],
  },
};

function mkStrip(W, H) { const c = U.canvas(W, H); return { c, g: c.getContext('2d') }; }
function wrapRect(g, W, x, y, w, h) { g.fillRect(x, y, w, h); if (x + w > W) g.fillRect(x - W, y, w, h); if (x < 0) g.fillRect(x + W, y, w, h); }

function mountains(seed, W, H, pal, L) {
  const { c, g } = mkStrip(W, H); const rng = U.RNG(seed);
  const col = L.c;
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const t = x / W; const n = U.fbm(Math.cos(t * 6.283) * 2.2 + 10, Math.sin(t * 6.283) * 2.2 + 10, 5, seed);   // seamless via circle sampling
    const ridge = Math.abs(n - 0.5) * 2; const y = H - L.min - (n * 0.7 + ridge * 0.3) * (L.max - L.min);
    g.lineTo(x, y);
  }
  g.lineTo(W, H); g.closePath();
  const gr = g.createLinearGradient(0, H - L.max, 0, H); gr.addColorStop(0, U.rgb(U.shade(col, 1.25))); gr.addColorStop(1, U.rgb(U.mix(col, pal.haze, 0.55)));
  g.fillStyle = gr; g.fill();
  // strata streaks
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(0,0,0,' + rng.range(0.03, 0.1) + ')'; g.fillRect(rng.range(0, W), rng.range(H - L.max, H), rng.range(30, 140), rng.range(1, 3)); }
  return c;
}

function skyline(seed, W, H, pal, L) {
  const { c, g } = mkStrip(W, H); const rng = U.RNG(seed);
  const col = L.c, ruins = L.kind === 'ruins';
  let x = -rng.range(0, 60);
  while (x < W) {
    const bw = rng.range(ruins ? 50 : 34, ruins ? 150 : 110), bh = rng.range(L.min, L.max) * (rng.next() < 0.18 ? 1.25 : 1);
    const shade = rng.range(0.85, 1.12), cc = [col[0] * shade, col[1] * shade, col[2] * shade];
    const top = H - bh;
    for (const ox of [0, -W]) {
      const bx = x + ox;
      g.fillStyle = U.rgb(cc);
      // silhouette with broken top
      g.beginPath(); g.moveTo(bx, H);
      g.lineTo(bx, top + rng.range(0, 16));
      const jag = ruins ? 9 : 4, seg = Math.max(3, Math.round(bw / 14));
      for (let i = 1; i <= seg; i++) { const jx = bx + (bw * i) / seg; const broken = rng.next() < (ruins ? 0.35 : 0.15) ? rng.range(10, ruins ? 60 : 32) : 0; g.lineTo(jx - rng.range(0, 6), top + broken + rng.range(-jag, jag)); }
      g.lineTo(bx + bw, H); g.closePath(); g.fill();
      // vertical light falloff
      const gr = g.createLinearGradient(0, top, 0, H); gr.addColorStop(0, 'rgba(255,190,130,0.12)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(' + pal.haze.join(',') + ',0.30)');
      g.save(); g.clip(); g.fillStyle = gr; g.fillRect(bx, top - 20, bw, bh + 40);
      // windows
      if (L.windows) {
        const ws = 7, wh = 9, gap = 9;
        for (let wy = top + 14; wy < H - 20; wy += wh + gap) for (let wx = bx + 6; wx < bx + bw - ws - 4; wx += ws + gap - 2) {
          if (rng.next() < L.windows) { g.fillStyle = rng.next() < 0.05 ? 'rgba(255,170,80,0.55)' : 'rgba(6,4,6,0.6)'; g.fillRect(wx, wy, ws, wh); }
        }
      }
      // exposed girders (ruins)
      if (ruins && rng.next() < 0.6) {
        g.strokeStyle = 'rgba(8,6,6,0.75)'; g.lineWidth = 2;
        const gx = bx + rng.range(4, bw - 14), gy = top + rng.range(0, 30);
        for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(gx + i * 7, gy); g.lineTo(gx + i * 7 + rng.range(-3, 3), gy + rng.range(30, 90)); g.stroke(); }
        g.beginPath(); g.moveTo(gx, gy + 20); g.lineTo(gx + 28, gy + 20); g.moveTo(gx, gy + 50); g.lineTo(gx + 28, gy + 46); g.stroke();
      }
      g.restore();
      // antenna / crane
      if (rng.next() < 0.22) { g.strokeStyle = U.rgb(cc); g.lineWidth = 2; const ax = bx + rng.range(6, bw - 6); g.beginPath(); g.moveTo(ax, top + 3); g.lineTo(ax + rng.range(-3, 3), top - rng.range(18, 60)); g.stroke(); }
      if (ruins && rng.next() < 0.12) { g.strokeStyle = U.rgb(cc); g.lineWidth = 3; const ax = bx + bw * 0.5; g.beginPath(); g.moveTo(ax, top); g.lineTo(ax, top - 60); g.lineTo(ax + 80, top - 60); g.moveTo(ax, top - 60); g.lineTo(ax - 30, top - 45); g.stroke(); g.lineWidth = 1; g.beginPath(); g.moveTo(ax + 74, top - 60); g.lineTo(ax + 74, top - 30); g.stroke(); }
    }
    x += bw + rng.range(-8, 14);
  }
  // water tower / pylon silhouettes
  return c;
}

function cloudStrip(seed, W, H, pal) {
  const { c, g } = mkStrip(W, H);
  const cells = 8;
  const f = U.fbmField(W, H, cells, 5, seed, 0.55, 0.35), f2 = U.noiseField(W, H, 24, 5, seed + 9);
  const img = g.createImageData(W, H), d = img.data, cc = pal.cloud;
  for (let i = 0; i < W * H; i++) {
    const y = ((i / W) | 0) / H; const band = Math.sin(y * Math.PI);
    let a = (f[i] - 0.5) * 2.4 + 0.1 + (f2[i] - 0.5) * 0.5; a = Math.max(0, Math.min(1, a)) * band;
    d[i * 4] = cc[0]; d[i * 4 + 1] = cc[1]; d[i * 4 + 2] = cc[2]; d[i * 4 + 3] = a * 150;
  }
  g.putImageData(img, 0, 0); return c;
}

function Backdrop(kind, seed) {
  const pal = (this.pal = PALETTES[kind] || PALETTES.dusk);
  this.kind = kind; this.W = 2048; seed = seed || 7;
  this.layers = pal.layers.map((L, i) => ({ L, c: L.kind === 'mountain' ? mountains(seed + i * 17, this.W, 460, pal, L) : skyline(seed + i * 31, this.W, 460, pal, L) }));
  this.cloudA = cloudStrip(seed + 3, this.W, 200, pal); this.cloudB = cloudStrip(seed + 5, this.W, 240, pal);
  this.sky = U.canvas(4, 256); const g = this.sky.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); pal.sky.forEach((s) => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  this.sunSprite = CD.tex.makeGlow(256);
}
CD.Backdrop = Backdrop;
Backdrop.get = function (kind) { Backdrop._c = Backdrop._c || {}; return Backdrop._c[kind] || (Backdrop._c[kind] = new Backdrop(kind, kind === 'dusk' ? 7 : 19)); };

// horizonY: world y of the surface ground line. cam in world px, vw/vh view size.
Backdrop.prototype.draw = function (ctx, cam, vw, vh, time, horizonY, tint) {
  const pal = this.pal;
  ctx.save(); ctx.setTransform(ctx.getTransform().a, 0, 0, ctx.getTransform().d, 0, 0);   // keep scale, drop translate -> screen-space drawing in logical px
  const R = ctx.getTransform().a;
  ctx.drawImage(this.sky, 0, 0, 4, 256, 0, 0, vw * R, vh * R);
  // sun
  const sx = vw * pal.sun[0] * R - cam.x * 0.02 * R, sy = (vh * pal.sun[1] - (cam.y - horizonY + vh * 0.5) * 0.05) * R;
  ctx.globalCompositeOperation = 'lighter';
  const sc = pal.sunColor;
  ctx.globalAlpha = 0.85; ctx.drawImage(this.sunSprite, sx - 420 * R, sy - 420 * R, 840 * R, 840 * R);
  ctx.globalAlpha = 0.9; const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, 46 * R); gr.addColorStop(0, 'rgba(' + sc.join(',') + ',1)'); gr.addColorStop(0.5, 'rgba(' + sc.join(',') + ',0.7)'); gr.addColorStop(1, 'rgba(' + sc.join(',') + ',0)'); ctx.fillStyle = gr; ctx.fillRect(sx - 60 * R, sy - 60 * R, 120 * R, 120 * R);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // clouds (drift with time + parallax)
  const drawStrip = (img, f, y, alpha, drift) => {
    const W = this.W; let ox = -((cam.x * f + drift * time) % W); if (ox > 0) ox -= W;
    ctx.globalAlpha = alpha;
    for (let x = ox; x < vw + 4; x += W) ctx.drawImage(img, x * R, y * R, W * R, img.height * R);
    ctx.globalAlpha = 1;
  };
  const camY = cam.y - horizonY;
  drawStrip(this.cloudA, 0.02, vh * 0.12 - camY * 0.02, 0.8, 5);
  drawStrip(this.cloudB, 0.045, vh * 0.28 - camY * 0.035, 0.6, 9);
  // layers
  for (const ly of this.layers) {
    const f = ly.L.f; const W = this.W; let ox = -((cam.x * f) % W); if (ox > 0) ox -= W;
    const base = vh * ly.L.hz + (horizonY - (cam.y + vh * 0.62)) * f;
    for (let x = ox; x < vw + 4; x += W) ctx.drawImage(ly.c, x * R, (base - ly.c.height) * R, W * R, ly.c.height * R);
    // fog under the layer bottom
    const fy = base * R; const fg = ctx.createLinearGradient(0, fy - 90 * R, 0, fy + 40 * R); fg.addColorStop(0, 'rgba(' + pal.haze.join(',') + ',0)'); fg.addColorStop(0.6, 'rgba(' + pal.haze.join(',') + ',' + (0.06 + f * 0.12) + ')'); fg.addColorStop(1, 'rgba(' + pal.haze.join(',') + ',0)');
    ctx.fillStyle = fg; ctx.fillRect(0, fy - 90 * R, vw * R, 130 * R);
    // fill below the layer with its base colour so no gap appears when the camera looks down
    ctx.fillStyle = U.rgb(U.mix(ly.L.c, pal.haze, 0.35)); ctx.fillRect(0, base * R - 1, vw * R, Math.max(0, vh * R - base * R + 2));
  }
  if (tint) { ctx.globalAlpha = tint[3]; ctx.fillStyle = 'rgb(' + tint[0] + ',' + tint[1] + ',' + tint[2] + ')'; ctx.fillRect(0, 0, vw * R, vh * R); ctx.globalAlpha = 1; }
  ctx.restore();
};

})();
