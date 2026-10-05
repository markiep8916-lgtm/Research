// Effects: particles, decals, hit sparks, floating text, banners, screen shake, kick and flashes.

const FX = {
  parts: [],
  decals: [],
  texts: [],
  banner: null,
  shakeAmt: 0, shakeDur: 0, shakeX: 0, shakeY: 0,
  kickX: 0, kickT: 0,
  flashColor: null, flashT: 0, flashMax: 1, flashAlpha: 0.6,
  vignetteT: 0,
  reducedShake: Store.get('reducedShake', false),
  reset() { this.parts.length = 0; this.decals.length = 0; this.texts.length = 0; this.banner = null; this.shakeAmt = 0; this.flashT = 0; this.kickT = 0; },

  shake(px, dur) {
    if (!px) return;
    const k = this.reducedShake ? 0.3 : 1;
    this.shakeAmt = Math.min(7, Math.max(this.shakeAmt, px * k));
    this.shakeDur = Math.max(this.shakeDur, dur || 6 + px * 3);
    this.shakeLeft = this.shakeDur;
  },
  kick(dx) { if (dx) { this.kickX = clamp(Math.round(dx), -2, 2); this.kickT = 2; } },
  flash(color, frames, alpha = 0.6) {
    if (this.reducedShake && alpha > 0.15) alpha = 0.15;
    this.flashColor = color; this.flashT = frames; this.flashMax = frames; this.flashAlpha = alpha;
  },
  hurtVignette() { this.vignetteT = 10; },

  add(p) {
    if (this.parts.length > 320) this.parts.shift();
    p.t = 0;
    p.life = p.life || 20;
    p.vx = p.vx || 0; p.vy = p.vy || 0; p.vz = p.vz || 0;
    p.z = p.z || 0;
    p.g = p.g == null ? 0.25 : p.g;
    this.parts.push(p);
    return p;
  },
  decal(d) {
    if (this.decals.length > 40) this.decals.shift();
    d.t = 0;
    this.decals.push(d);
  },

  // Hit spark: a flash star, a cone of streaks along the hit direction, optional ring.
  hit(x, y, z, tier = 1, dir = 1, tint = '#fff6c8') {
    const T = TIERS[tier] || TIERS[1];
    this.add({ kind: 'star', x, y, z, life: 5 + tier, size: T.star / 2, color: tint, g: 0 });
    for (let i = 0; i < T.sparks; i++) {
      const a = (dir > 0 ? 0 : Math.PI) + rr(-0.6, 0.6), s = rr(2, 5);
      this.add({ kind: 'spark', x, y, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s * 0.8 + rr(-0.5, 1), life: ri(8, 14), g: 0.08, drag: 0.85 });
    }
    if (T.ring) for (let r = 0; r < T.ring; r++) this.add({ kind: 'ring', x, y, z, life: 8 + r * 3, size: 18 + r * 8, color: '#ffffff', g: 0 });
    if (T.dust) this.dust(x, y, T.dust);
  },
  splat(x, y, z, color, n = 6, dir = 1, decal = true) {
    for (let i = 0; i < n; i++) {
      this.add({ kind: 'drop', x, y: y + rr(-2, 2), z, vx: dir * rr(0.5, 2.5) + rr(-0.6, 0.6), vz: rr(1, 3.4), life: 70, color, g: 0.25, ground: decal ? y : null });
    }
  },
  pool(x, y, color, w = 14) { this.decal({ kind: 'pool', x, y, w, h: 3, color, life: 400 }); },
  scorch(x, y, w = 30) { this.decal({ kind: 'pool', x, y, w, h: 5, color: '#1a1410', life: 600 }); },
  wallCrack(x, y) { this.decal({ kind: 'crack', x, y, life: 60, seed: ri(0, 999) }); },
  dust(x, y, n = 5, spread = 1.2, color = '#a08a6a') {
    for (let i = 0; i < n; i++) {
      this.add({ kind: 'dust', x: x + rr(-4, 4), y: y + rr(-1, 1), z: rr(0, 3), vx: rr(-spread, spread), vz: rr(0.1, 0.5), life: ri(16, 26), size: rr(2, 3), color, g: -0.01, grow: 0.15 });
    }
  },
  dustRing(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      this.add({ kind: 'dust', x, y, z: 1, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 0.6, vz: 0.2, life: 22, size: 2.5, color: '#a08a6a', g: 0, grow: 0.15 });
    }
  },
  steam(x, y, z, n = 3) {
    for (let i = 0; i < n; i++) this.add({ kind: 'dust', x: x + rr(-2, 2), y, z: z + rr(0, 3), vx: rr(-0.3, 0.3), vz: rr(0.4, 0.8), life: 24, size: 2, color: '#e8e8e8', g: -0.005, grow: 0.2, alpha: 0.5 });
  },
  debris(x, y, z, colors, n = 10, size = [1, 3]) {
    for (let i = 0; i < n; i++) {
      this.add({ kind: 'chunk', x, y: y + rr(-3, 3), z: z + rr(0, 10), vx: rr(-2.6, 2.6), vz: rr(1.5, 4.5), life: 60, color: pick(colors), size: ri(size[0], size[1]), g: 0.24, ground: y });
    }
  },
  shards(x, y, z, n = 6, colors = ['#c9772e', '#7a3e14']) {
    for (let i = 0; i < n; i++) {
      this.add({ kind: 'shard', x, y: y + rr(-2, 2), z, vx: rr(-2.4, 2.4), vz: rr(1.5, 3.5), life: 40, color: pick(colors), size: ri(3, 5), rot: rr(0, TAU), spin: rr(-0.3, 0.3), g: 0.24, ground: y });
    }
  },
  sweat(x, y, z, n = 2) {
    for (let i = 0; i < n; i++) this.add({ kind: 'drop', x, y, z, vx: rr(-1.5, 1.5), vz: rr(1.5, 3), life: 22, color: '#ddeeff', g: 0.25 });
  },
  smoke(x, y, z, n = 4, color = '#3a3030') {
    for (let i = 0; i < n; i++) {
      this.add({ kind: 'dust', x: x + rr(-3, 3), y, z: z + rr(0, 4), vx: rr(-0.3, 0.3), vz: rr(0.3, 0.8), life: ri(30, 50), size: rr(3, 6), color, g: -0.005, grow: 0.08, alpha: 0.6 });
    }
  },
  fire(x, y, z, n = 2) {
    for (let i = 0; i < n; i++) {
      this.add({ kind: 'fire', x: x + rr(-4, 4), y, z: z + rr(0, 3), vx: rr(-0.25, 0.25), vz: rr(0.4, 1.1), life: ri(14, 24), size: rr(2, 4), g: -0.02 });
    }
  },
  embers(x, y, z, n = 2) {
    for (let i = 0; i < n; i++) this.add({ kind: 'ember', x: x + rr(-6, 6), y, z: z + rr(0, 6), vx: rr(-0.3, 0.3), vz: rr(0.5, 1), life: ri(20, 40), g: -0.005 });
  },
  explosion(x, y, z = 6, scale = 1, palette) {
    const pal = palette || ['#fff2b0', '#ff8a1e', '#3a3030'];
    this.add({ kind: 'ball', x, y, z, life: 6, size: 30 * scale, color: pal[0], g: 0 });
    this.add({ kind: 'ring', x, y, z, life: 14, size: 34 * scale, color: pal[1], g: 0 });
    for (let i = 0; i < 12 * scale; i++) {
      const a = rand() * TAU, s = rr(0.6, 3) * scale;
      this.add({ kind: 'fire', x, y: y + rr(-4, 4), z: z + rr(0, 8), vx: Math.cos(a) * s, vz: Math.abs(Math.sin(a)) * s + 0.5, life: ri(18, 34), size: rr(3, 6) * scale, g: 0.02, pal });
    }
    this.debris(x, y, z, ['#2a2020', '#4a3a30'], 12, [2, 2]);
    this.smoke(x, y, z + 10, 6 * scale, pal[2]);
    this.scorch(x, y, 30 * scale);
    this.shake(4 * scale, 20);
    this.flash(pal[0], 3, 0.35);
  },
  text(x, y, z, str, color = '#fff', life = 45, scale = 1) {
    // Stack above live popups that would overlap, measured where they are drawn now (they rise up to
    // 14 px). Starting 9 px above the old one keeps the gap: both rise on the same concave curve.
    const rise = t => easeOut(Math.min(1, t.t / t.life * 2)) * 14;
    const hw = textWidth(str, scale) / 2;
    // A new popup at base row B clashes with an older one (base Bo, drawn now at Do = Bo - rise) when
    // Do - 9 < B < Bo + 9: it would meet it on the way up. Placing it at Do - 9 keeps them apart.
    for (let n = 0; n < 6; n++) {
      const B = y - z;
      const hit = this.texts.find(t => Math.abs(t.x - x) < textWidth(t.str, t.scale) / 2 + hw + 2 &&
        B > t.y - t.z - rise(t) - 9 && B < t.y - t.z + 9);
      if (!hit) break;
      z = y - (hit.y - hit.z - rise(hit) - 9);
    }
    this.texts.push({ x, y, z, str, color, t: 0, life, scale });
  },
  showBanner(str, color = '#ffe066', life = 56) { this.banner = { str, color, t: 0, life }; },

  update() {
    for (const p of this.parts) {
      p.t++;
      if (p.drag) { p.vx *= p.drag; p.vz *= p.drag; }
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.vz -= p.g;
      if (p.spin) p.rot += p.spin;
      if (p.grow) p.size += p.grow;
      if (p.ground != null && p.z <= 0) {
        p.z = 0;
        if (p.kind === 'drop') { p.dead = true; this.decal({ kind: 'pool', x: p.x, y: p.y, w: 4, h: 1, color: shade(p.color, -0.25), life: 240 }); }
        else if (p.kind === 'shard' || p.kind === 'chunk') { p.vz = -p.vz * 0.4; p.vx *= 0.6; p.spin = (p.spin || 0) * 0.6; if (Math.abs(p.vz) < 0.6) { p.vz = 0; p.g = 0; p.vx *= 0.5; } }
      }
    }
    this.parts = this.parts.filter(p => p.t < p.life && !p.dead);
    for (const d of this.decals) d.t++;
    this.decals = this.decals.filter(d => d.t < d.life);
    for (const t of this.texts) t.t++;
    this.texts = this.texts.filter(t => t.t < t.life);
    if (this.banner && ++this.banner.t > this.banner.life) this.banner = null;
    if (this.shakeLeft > 0) {
      const k = this.shakeAmt * this.shakeLeft / this.shakeDur;
      this.shakeX = Math.round(rr(-1, 1) * k);
      this.shakeY = Math.round(rr(-1, 1) * k * 0.6);
      this.shakeLeft--;
      if (this.shakeLeft <= 0) { this.shakeAmt = 0; this.shakeX = this.shakeY = 0; }
    }
    if (this.kickT > 0 && --this.kickT === 0) this.kickX = 0;
    if (this.flashT > 0) this.flashT--;
    if (this.vignetteT > 0) this.vignetteT--;
  },
  offX() { return this.shakeX + this.kickX; },

  drawDecals(ctx, camX) {
    Px.use(ctx);
    for (const d of this.decals) {
      const sx = d.x - camX;
      if (sx < -40 || sx > W + 40) continue;
      const a = d.life - d.t < 60 ? (d.life - d.t) / 60 : 1;
      if (d.kind === 'pool') {
        ctx.globalAlpha = 0.8 * a;
        Px.oval(sx, d.y, d.w / 2, Math.max(1, d.h / 2), d.color);
      } else if (d.kind === 'crack') {
        ctx.globalAlpha = a;
        let s = d.seed;
        for (let i = 0; i < 3; i++) {
          s = (s * 97 + 13) % 251;
          const ang = (s / 251) * TAU;
          Px.line(sx, d.y, sx + Math.cos(ang) * 8, d.y + Math.sin(ang) * 10, 1, '#1a1410');
        }
      }
    }
    ctx.globalAlpha = 1;
  },
  draw(ctx, camX) {
    Px.use(ctx);
    for (const p of this.parts) {
      const sx = p.x - camX, sy = p.y - p.z;
      if (sx < -40 || sx > W + 40) continue;
      const k = p.t / p.life;
      switch (p.kind) {
        case 'star': {
          const s = p.size * (p.t < 2 ? 1 : 1 - k * 0.5);
          const c = p.t < 1 ? '#ffffff' : p.color;
          Px.poly([sx - s, sy, sx, sy - s * 0.25, sx + s, sy, sx, sy + s * 0.25], c);
          Px.poly([sx, sy - s, sx + s * 0.25, sy, sx, sy + s, sx - s * 0.25, sy], c);
          Px.disc(sx, sy, Math.max(1, s * 0.25), '#ffffff');
          break;
        }
        case 'spark': {
          const c = k < 0.3 ? '#fff6c0' : k < 0.65 ? '#ffb030' : '#ff5a1e';
          Px.line(sx, sy, sx - p.vx * 1.5, sy + p.vz * 1.5, 1, c);
          break;
        }
        case 'drop': Px.rect(sx, sy, 2, 2, p.color); break;
        case 'bubble': ctx.globalAlpha = 1 - k; Px.disc(sx, sy, 1.5, p.color); ctx.globalAlpha = 1; break;
        case 'chunk': Px.rect(sx, sy, p.size + 1, p.size, p.color); break;
        case 'shard': {
          const r = p.size / 2, a = p.rot;
          Px.poly([sx + Math.cos(a) * r, sy + Math.sin(a) * r, sx + Math.cos(a + 2.2) * r, sy + Math.sin(a + 2.2) * r, sx + Math.cos(a + 4.2) * r, sy + Math.sin(a + 4.2) * r], p.color);
          break;
        }
        case 'dust':
          ctx.globalAlpha = (1 - k) * (p.alpha || 0.7);
          Px.disc(sx, sy, p.size, p.color);
          ctx.globalAlpha = 1;
          break;
        case 'fire': {
          const pal = p.pal;
          const c = k < 0.25 ? (pal ? pal[0] : '#fff3b0') : k < 0.5 ? (pal ? pal[1] : '#ffb02e') : k < 0.75 ? '#e2541b' : '#5a2a1a';
          Px.disc(sx, sy, Math.max(1, p.size * (1 - k * 0.5)), c);
          break;
        }
        case 'ember': Px.rect(sx, sy, 1, 1, k < 0.5 ? '#ffd27a' : '#e2541b'); break;
        case 'ball': Px.disc(sx, sy, p.size * easeOut(Math.min(1, k * 1.5)), p.color); break;
        case 'ring': {
          const r = 4 + (p.size - 4) * easeOut(k);
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, 2 * (1 - k));
          ctx.beginPath(); ctx.ellipse(Math.round(sx), Math.round(sy), r, r * 0.5, 0, 0, TAU); ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'smear': { // white crescent along a strike path, fading over 3f
          ctx.globalAlpha = 0.6 * (1 - k);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          const r = p.size, a0 = p.a0, a1 = p.a1, f = p.facing;
          const cx = Math.round(sx), cy = Math.round(sy);
          const pt = (rad, a) => [cx + f * Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.8];
          let q = pt(r, a0); ctx.moveTo(q[0], q[1]);
          for (let i = 1; i <= 8; i++) { q = pt(r, lerp(a0, a1, i / 8)); ctx.lineTo(q[0], q[1]); }
          for (let i = 8; i >= 0; i--) { q = pt(r - 3 - 2 * Math.sin(i / 8 * Math.PI), lerp(a0, a1, i / 8)); ctx.lineTo(q[0], q[1]); }
          ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case 'line': // speed line
          ctx.globalAlpha = 1 - k;
          Px.line(sx, sy, sx + p.dx, sy + p.dy, 1, p.color);
          ctx.globalAlpha = 1;
          break;
      }
    }
    for (const t of this.texts) {
      const k = t.t / t.life;
      const hw = textWidth(t.str, t.scale) / 2;
      const sx = clamp(t.x - camX, hw + 2, W - hw - 2), sy = Math.max(24, t.y - t.z - easeOut(Math.min(1, k * 2)) * 14);
      if (k > 0.75 && (t.t >> 1) % 2) continue;
      drawText(ctx, t.str, sx, sy, t.color, t.scale, 'center');
    }
  },
  drawOverlay(ctx) {
    if (this.banner) {
      const b = this.banner, k = Math.min(1, b.t / 6);
      const x = lerp(-120, W / 2, easeOut(k));
      drawText(ctx, b.str, x, 58, b.color, 2, 'center');
    }
    if (this.vignetteT > 0) {
      ctx.globalAlpha = 0.3 * this.vignetteT / 10;
      ctx.fillStyle = '#c81e1e';
      ctx.fillRect(0, 0, W, 6); ctx.fillRect(0, H - 6, W, 6); ctx.fillRect(0, 0, 6, H); ctx.fillRect(W - 6, 0, 6, H);
      ctx.globalAlpha = 1;
    }
    if (this.flashT > 0 && this.flashColor) {
      ctx.globalAlpha = this.flashAlpha * this.flashT / this.flashMax;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  },
};
