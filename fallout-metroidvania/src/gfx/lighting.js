// Dynamic 2D lighting: ambient + sky exposure + shadow-casting point/cone lights, composited with 'multiply'; additive glow pass.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;

function Lighting(world) {
  this.world = world;
  this.lights = [];          // per-frame lights
  this.scale = 0.5;          // light-map resolution relative to main canvas
  this.canvas = null; this.g = null;
  this.skyCanvas = null; this.skyG = null;
  this.glowSprite = CD.tex.makeGlow(128);
  this.flash = 0;            // lightning / explosion global flash 0..1
  this.stats = { shadowLights: 0, lights: 0 };
  this.time = 0;
}
CD.Lighting = Lighting;
const P = Lighting.prototype;

P.resize = function (w, h) {
  this.vw = w; this.vh = h;
  const lw = Math.max(64, Math.round(w * this.scale)), lh = Math.max(64, Math.round(h * this.scale));
  if (!this.canvas || this.canvas.width !== lw || this.canvas.height !== lh) { this.canvas = U.canvas(lw, lh); this.g = this.canvas.getContext('2d'); }
};
P.clear = function () { this.lights.length = 0; };
P.add = function (l) { this.lights.push(l); return l; };

// Build a visibility polygon (array of points) around (x,y), optionally restricted to a cone.
P.poly = function (x, y, r, rays, ang0, ang1) {
  const w = this.world, pts = [], full = ang0 === undefined;
  const a0 = full ? 0 : ang0, span = full ? Math.PI * 2 : ang1 - ang0;
  const n = full ? rays : Math.max(6, Math.ceil(rays * span / (Math.PI * 2)));
  for (let i = 0; i <= n; i++) {
    if (full && i === n) break;
    const a = a0 + span * (i / n);
    const d = w.rayDist(x, y, a, r);
    pts.push(x + Math.cos(a) * (d + 2), y + Math.sin(a) * (d + 2));
  }
  return pts;
};

// Render light map for the camera rect, then multiply it onto ctx. cam: {x,y,w,h} in world px. R = main canvas scale.
P.render = function (ctx, cam, R, ambient, opts) {
  opts = opts || {};
  const g = this.g, lw = this.canvas.width, lh = this.canvas.height, world = this.world;
  const sx = lw / cam.w, sy = lh / cam.h;      // world -> lightmap
  this.time += 0;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  const fl = this.flash;
  // light map is stored at half range (0..1 == 0..2x); doubled after the multiply so lights can over-expose
  g.fillStyle = 'rgb(' + Math.min(255, Math.round((ambient[0] + fl * 0.6) * 127.5)) + ',' + Math.min(255, Math.round((ambient[1] + fl * 0.6) * 127.5)) + ',' + Math.min(255, Math.round((ambient[2] + fl * 0.6) * 127.5)) + ')';
  g.fillRect(0, 0, lw, lh);

  // --- sky exposure (outdoor rooms)
  if (opts.sky) {
    const tx0 = Math.max(0, Math.floor(cam.x / T) - 1), ty0 = Math.max(0, Math.floor(cam.y / T) - 1), tx1 = Math.min(world.W - 1, Math.ceil((cam.x + cam.w) / T) + 1), ty1 = Math.min(world.H - 1, Math.ceil((cam.y + cam.h) / T) + 1);
    const nw = tx1 - tx0 + 1, nh = ty1 - ty0 + 1;
    if (!this.skyCanvas || this.skyCanvas.width !== nw || this.skyCanvas.height !== nh) { this.skyCanvas = U.canvas(nw, nh); this.skyG = this.skyCanvas.getContext('2d'); }
    const sg = this.skyG; const img = sg.createImageData(nw, nh), d = img.data;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const i = ((ty - ty0) * nw + (tx - tx0)) * 4; const ri = world.roomIdx[ty * world.W + tx];
      const room = ri >= 0 ? world.rooms[ri] : null;
      if (room && room.sky && world.exposed[ty * world.W + tx]) { const c = room.skyColor || [1, 0.8, 0.6], s = room.skyStrength === undefined ? 0.6 : room.skyStrength; d[i] = c[0] * 255; d[i + 1] = c[1] * 255; d[i + 2] = c[2] * 255; d[i + 3] = 127.5 * s; }
    }
    sg.putImageData(img, 0, 0);
    g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
    g.drawImage(this.skyCanvas, (tx0 * T - cam.x) * sx, (ty0 * T - cam.y) * sy, nw * T * sx, nh * T * sy);
  }

  // --- point / cone lights
  g.globalCompositeOperation = 'lighter';
  let shadowCount = 0; const maxShadow = opts.maxShadow || 8;
  const t = opts.time || 0;
  const list = this.lights;
  // shadow-casting lights nearest the view centre first
  const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
  for (let i = 0; i < list.length; i++) { const l = list[i]; l._d = (l.x - cx) * (l.x - cx) + (l.y - cy) * (l.y - cy) - (l.prio || 0) * 1e6; }
  list.sort((a, b) => a._d - b._d);
  let drawn = 0;
  for (const l of list) {
    if (l.x + l.r < cam.x || l.x - l.r > cam.x + cam.w || l.y + l.r < cam.y || l.y - l.r > cam.y + cam.h) continue;
    let inten = l.i === undefined ? 1 : l.i;
    if (l.flicker) inten *= 1 + l.flicker * (U.vnoise(t * (l.fspeed || 9) + (l.seed || 0), l.seed || 0, 3) - 0.5) * 2 + (l.flick2 ? (Math.random() - 0.5) * l.flick2 : 0);
    if (inten <= 0.01) continue;
    const c = l.color || [1, 1, 1];
    const lx = (l.x - cam.x) * sx, ly = (l.y - cam.y) * sy, lr = l.r * sx;
    g.save();
    if (l.shadow !== false && shadowCount < maxShadow && (l.shadow || l.r > 140)) {
      shadowCount++;
      let pts;
      if (l.cone) pts = this.poly(l.x, l.y, l.r, Math.min(200, Math.max(48, Math.round(l.r / 2.4))), l.cone.a - l.cone.w, l.cone.a + l.cone.w);
      else pts = this.poly(l.x, l.y, l.r, Math.min(220, Math.max(64, Math.round(l.r / 2.2))));
      g.beginPath();
      if (l.cone) g.moveTo(lx, ly);
      for (let k = 0; k < pts.length; k += 2) { const px = (pts[k] - cam.x) * sx, py = (pts[k + 1] - cam.y) * sy; (k === 0 && !l.cone) ? g.moveTo(px, py) : g.lineTo(px, py); }
      g.closePath(); g.clip();
    } else if (l.cone) {
      g.beginPath(); g.moveTo(lx, ly); const a0 = l.cone.a - l.cone.w, a1 = l.cone.a + l.cone.w; g.arc(lx, ly, lr, a0, a1); g.closePath(); g.clip();
    }
    const gr = g.createRadialGradient(lx, ly, 0, lx, ly, lr);
    const ci = Math.min(1, inten) * 0.5, r255 = Math.min(255, c[0] * 255) | 0, g255 = Math.min(255, c[1] * 255) | 0, b255 = Math.min(255, c[2] * 255) | 0;
    const rgb = r255 + ',' + g255 + ',' + b255;
    gr.addColorStop(0, 'rgba(' + rgb + ',' + ci + ')');
    gr.addColorStop(0.2, 'rgba(' + rgb + ',' + ci * 0.82 + ')');
    gr.addColorStop(0.45, 'rgba(' + rgb + ',' + ci * 0.5 + ')');
    gr.addColorStop(0.72, 'rgba(' + rgb + ',' + ci * 0.17 + ')');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
    if (inten > 1) { g.globalAlpha = Math.min(1, inten - 1); g.fillRect(lx - lr, ly - lr, lr * 2, lr * 2); }  // second pass = over-exposure
    g.restore(); drawn++;
  }
  this.stats.shadowLights = shadowCount; this.stats.lights = drawn;
  g.globalCompositeOperation = 'source-over';

  // --- composite
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(this.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(ctx.canvas, 0, 0);   // x2: brings the half-range light map back to full range (albedo * light * 2)
  ctx.restore();
};

// Additive glow: halos around emissive fixtures + bright light cores (drawn after multiply, in camera space).
P.glow = function (ctx, cam, t) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of this.lights) {
    const gs = l.glow; if (!gs) continue;
    if (l.x + gs < cam.x || l.x - gs > cam.x + cam.w || l.y + gs < cam.y || l.y - gs > cam.y + cam.h) continue;
    let inten = l.i === undefined ? 1 : l.i;
    if (l.flicker) inten *= 1 + l.flicker * (U.vnoise(t * (l.fspeed || 9) + (l.seed || 0), l.seed || 0, 3) - 0.5) * 2;
    const c = l.color || [1, 1, 1];
    ctx.globalAlpha = Math.max(0, Math.min(1, inten * (l.glowA === undefined ? 0.5 : l.glowA)));
    // tinted halo through a coloured radial gradient (cheap; avoids per-colour sprites)
    const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, gs);
    gr.addColorStop(0, 'rgba(' + ((c[0] * 255) | 0) + ',' + ((c[1] * 255) | 0) + ',' + ((c[2] * 255) | 0) + ',0.95)'); gr.addColorStop(0.2, 'rgba(' + ((c[0] * 255) | 0) + ',' + ((c[1] * 255) | 0) + ',' + ((c[2] * 255) | 0) + ',0.35)');
    gr.addColorStop(1, 'rgba(' + ((c[0] * 255) | 0) + ',' + ((c[1] * 255) | 0) + ',' + ((c[2] * 255) | 0) + ',0)');
    ctx.fillStyle = gr; ctx.fillRect(l.x - gs, l.y - gs, gs * 2, gs * 2);
  }
  ctx.restore();
};

})();
