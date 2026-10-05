// Pixel drawing toolkit. Every primitive snaps to whole pixels so the 384x216 buffer stays crisp
// when upscaled. Characters are drawn into a scratch sprite canvas, then composited with an
// outline, hit-flash and drop shadow.

const Px = {
  g: null, // current target context
  use(g) { this.g = g; },
  rect(x, y, w, h, c) {
    if (w <= 0 || h <= 0) return;
    const g = this.g;
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  },
  // Thick line from (x0,y0) to (x1,y1) stamped with a square brush of size t.
  line(x0, y0, x1, y1, t, c) {
    const g = this.g;
    g.fillStyle = c;
    const dx = x1 - x0, dy = y1 - y0;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    const h = t / 2;
    for (let i = 0; i <= n; i++) {
      const x = x0 + dx * i / n, y = y0 + dy * i / n;
      g.fillRect(Math.round(x - h), Math.round(y - h), t, t);
    }
  },
  // Tapered limb: thickness goes from t0 to t1.
  limb(x0, y0, x1, y1, t0, t1, c) {
    const g = this.g;
    g.fillStyle = c;
    const dx = x1 - x0, dy = y1 - y0;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    for (let i = 0; i <= n; i++) {
      const k = i / n, t = Math.round(t0 + (t1 - t0) * k), h = t / 2;
      g.fillRect(Math.round(x0 + dx * k - h), Math.round(y0 + dy * k - h), t, t);
    }
  },
  disc(cx, cy, r, c) {
    const g = this.g;
    g.fillStyle = c;
    const R = Math.max(0.5, r);
    for (let y = -Math.ceil(R); y <= Math.ceil(R); y++) {
      const w = Math.sqrt(Math.max(0, R * R - y * y));
      if (w < 0.35) continue;
      g.fillRect(Math.round(cx - w), Math.round(cy + y), Math.max(1, Math.round(w * 2)), 1);
    }
  },
  oval(cx, cy, rx, ry, c) {
    const g = this.g;
    g.fillStyle = c;
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      const k = 1 - (y * y) / (ry * ry);
      if (k <= 0) continue;
      const w = rx * Math.sqrt(k);
      g.fillRect(Math.round(cx - w), Math.round(cy + y), Math.max(1, Math.round(w * 2)), 1);
    }
  },
  // Filled polygon via scanlines. pts = [x0,y0,x1,y1,...]
  poly(pts, c) {
    const g = this.g;
    g.fillStyle = c;
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < pts.length; i += 2) { minY = Math.min(minY, pts[i]); maxY = Math.max(maxY, pts[i]); }
    const n = pts.length / 2;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const sy = y + 0.5, xs = [];
      for (let i = 0; i < n; i++) {
        const ax = pts[i * 2], ay = pts[i * 2 + 1];
        const bx = pts[((i + 1) % n) * 2], by = pts[((i + 1) % n) * 2 + 1];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + (sy - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.round(xs[k]), x1 = Math.round(xs[k + 1]);
        if (x1 > x0) g.fillRect(x0, y, x1 - x0, 1);
      }
    }
  },
  // Quad between two points with widths (for torsos, tails, blades).
  quad(x0, y0, x1, y1, w0, w1, c) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    this.poly([x0 + nx * w0 / 2, y0 + ny * w0 / 2, x1 + nx * w1 / 2, y1 + ny * w1 / 2,
      x1 - nx * w1 / 2, y1 - ny * w1 / 2, x0 - nx * w0 / 2, y0 - ny * w0 / 2], c);
  },
  dot(x, y, c) { this.rect(x, y, 1, 1, c); },
};

// Colour helpers
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return h.length === 4
    ? [((n >> 8) & 15) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17]
    : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const _shadeCache = new Map();
// k < 0 darkens, k > 0 lightens.
function shade(hex, k) {
  const key = hex + k;
  let v = _shadeCache.get(key);
  if (v) return v;
  const [r, g, b] = hexToRgb(hex);
  const f = c => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k);
  v = '#' + [f(r), f(g), f(b)].map(c => clamp(c, 0, 255).toString(16).padStart(2, '0')).join('');
  _shadeCache.set(key, v);
  return v;
}
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

// Sprite compositor. Draw a character in local coordinates (origin = feet, facing right) into a
// scratch canvas, then stamp it to the screen with outline/flash.
const Sprite = {
  pool: {},
  get(w, h) {
    const k = w + 'x' + h;
    let s = this.pool[k];
    if (!s) {
      const a = document.createElement('canvas'); a.width = w; a.height = h;
      const b = document.createElement('canvas'); b.width = w; b.height = h;
      s = this.pool[k] = { a, ga: a.getContext('2d'), b, gb: b.getContext('2d'), w, h };
    }
    return s;
  },
  cur: null,
  // Begin drawing a sprite. ox, oy = where local (0,0) sits inside the scratch canvas.
  begin(w = 112, h = 96, ox = 56, oy = 88) {
    const s = this.get(w, h);
    s.ga.setTransform(1, 0, 0, 1, 0, 0);
    s.ga.clearRect(0, 0, w, h);
    s.ga.translate(ox, oy);
    s.ox = ox; s.oy = oy;
    this.cur = s;
    Px.use(s.ga);
    return s.ga;
  },
  // Composite onto ctx at screen position (sx, sy) of the feet. facing: 1 right, -1 left.
  // opts: { outline: colour|null, flash: colour|null, alpha }
  end(ctx, sx, sy, facing, opts = {}) {
    const s = this.cur;
    const outline = opts.outline === undefined ? '#140c0a' : opts.outline;
    const dx = Math.round(sx), dy = Math.round(sy);
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.translate(dx, dy);
    if (facing < 0) ctx.scale(-1, 1);
    if (outline || opts.flash) {
      s.gb.globalCompositeOperation = 'copy';
      s.gb.drawImage(s.a, 0, 0);
      s.gb.globalCompositeOperation = 'source-in';
      s.gb.fillStyle = opts.flash || outline;
      s.gb.fillRect(0, 0, s.w, s.h);
      s.gb.globalCompositeOperation = 'source-over';
    }
    if (outline && !opts.flash) {
      ctx.drawImage(s.b, -s.ox - 1, -s.oy);
      ctx.drawImage(s.b, -s.ox + 1, -s.oy);
      ctx.drawImage(s.b, -s.ox, -s.oy - 1);
      ctx.drawImage(s.b, -s.ox, -s.oy + 1);
    }
    if (opts.flash) {
      ctx.drawImage(s.b, -s.ox, -s.oy);
    } else {
      ctx.drawImage(s.a, -s.ox, -s.oy);
      if (opts.tint && opts.tint[1] > 0) {
        // colour wash over the sprite (venom, family hit tint, telegraph pulse)
        s.gb.globalCompositeOperation = 'copy';
        s.gb.drawImage(s.a, 0, 0);
        s.gb.globalCompositeOperation = 'source-in';
        s.gb.fillStyle = opts.tint[0];
        s.gb.fillRect(0, 0, s.w, s.h);
        s.gb.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (opts.alpha != null ? opts.alpha : 1) * clamp(opts.tint[1], 0, 1);
        ctx.drawImage(s.b, -s.ox, -s.oy);
      }
    }
    ctx.restore();
    Px.use(Screen.ctx);
  },
};

// Soft ellipse shadow on the ground (drawn directly on the screen buffer).
function groundShadow(ctx, x, y, rx, alpha = 0.35) {
  Px.use(ctx);
  ctx.globalAlpha = alpha;
  Px.oval(x, y, rx, Math.max(2, rx * 0.32), '#000');
  ctx.globalAlpha = 1;
}
