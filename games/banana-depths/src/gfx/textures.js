// Procedural canvas textures: the game ships no image files. Every surface is painted at start-up.
import * as THREE from 'three';
import { rng, hashStr } from '../core/util.js';

const cache = new Map();

function tex(key, size, draw, { repeat = false, aniso = 4 } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size, rng(hashStr(key)));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.anisotropy = aniso;
  cache.set(key, t);
  return t;
}

const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const jitter = (c, r, amt) => c.map((v) => Math.max(0, Math.min(255, v + (r() - 0.5) * amt)));

function blotches(g, s, r, base, count, rmin, rmax, amt, alpha) {
  for (let i = 0; i < count; i++) {
    const c = jitter(base, r, amt);
    g.fillStyle = rgb(c[0], c[1], c[2], alpha);
    g.beginPath();
    g.arc(r() * s, r() * s, rmin + r() * (rmax - rmin), 0, Math.PI * 2);
    g.fill();
  }
}
function speckle(g, s, r, light, dark, count) {
  for (let i = 0; i < count; i++) {
    const l = r() > 0.5;
    g.fillStyle = l ? light : dark;
    const sz = 1 + r() * 2.2;
    g.fillRect(r() * s, r() * s, sz, sz);
  }
}
function bevel(g, s, light, dark, w = 3) {
  g.fillStyle = light; g.fillRect(0, 0, s, w); g.fillRect(0, 0, w, s);
  g.fillStyle = dark; g.fillRect(0, s - w, s, w); g.fillRect(s - w, 0, w, s);
}

export const textures = {
  /** Jungle earth block. */
  dirt: () => tex('dirt', 128, (g, s, r) => {
    const base = [112, 76, 44];
    g.fillStyle = rgb(...base); g.fillRect(0, 0, s, s);
    blotches(g, s, r, base, 26, 8, 26, 40, 0.5);
    for (let i = 0; i < 9; i++) { // pebbles
      const x = r() * s, y = r() * s, rad = 3 + r() * 6;
      g.fillStyle = rgb(150 + r() * 40, 130 + r() * 30, 100 + r() * 20, 0.8); g.beginPath(); g.ellipse(x, y, rad, rad * 0.7, r() * 3, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 1.5, y + 2, rad, rad * 0.7, r() * 3, 0, 7); g.fill();
    }
    g.strokeStyle = 'rgba(60,35,15,0.5)'; g.lineWidth = 1.5; // roots
    for (let i = 0; i < 5; i++) { g.beginPath(); let x = r() * s, y = r() * s; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 30; y += (r() - 0.2) * 22; g.lineTo(x, y); } g.stroke(); }
    speckle(g, s, r, 'rgba(255,220,170,0.35)', 'rgba(30,15,5,0.4)', 160);
    bevel(g, s, 'rgba(255,225,170,0.22)', 'rgba(20,10,0,0.45)', 3);
  }),

  /** Temple masonry. */
  stone: () => tex('stone', 128, (g, s, r) => {
    const base = [104, 128, 124];
    g.fillStyle = rgb(...base); g.fillRect(0, 0, s, s);
    blotches(g, s, r, base, 30, 6, 22, 36, 0.45);
    g.strokeStyle = 'rgba(15,28,30,0.55)'; g.lineWidth = 2; // mortar: two courses
    g.strokeRect(1, 1, s - 2, s - 2);
    g.beginPath(); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
    g.beginPath(); g.moveTo(s * 0.3, 0); g.lineTo(s * 0.3, s / 2); g.moveTo(s * 0.72, s / 2); g.lineTo(s * 0.72, s); g.stroke();
    g.strokeStyle = 'rgba(10,20,22,0.5)'; g.lineWidth = 1; // hairline cracks
    for (let i = 0; i < 3; i++) { g.beginPath(); let x = r() * s, y = r() * s; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 24; y += (r() - 0.5) * 24; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 6; i++) { g.fillStyle = rgb(70 + r() * 30, 130 + r() * 40, 70, 0.35); g.beginPath(); g.arc(r() * s, s * (r() > 0.5 ? 0.04 : 0.96) + (r() - 0.5) * 8, 5 + r() * 12, 0, 7); g.fill(); } // moss
    speckle(g, s, r, 'rgba(255,255,255,0.22)', 'rgba(0,10,10,0.35)', 140);
    bevel(g, s, 'rgba(200,255,245,0.16)', 'rgba(0,15,15,0.4)', 3);
  }),

  /** Cavern rock. */
  rock: () => tex('rock', 128, (g, s, r) => {
    const base = [74, 70, 104];
    g.fillStyle = rgb(...base); g.fillRect(0, 0, s, s);
    for (let i = 0; i < 16; i++) { // facets
      const c = jitter(base, r, 46); g.fillStyle = rgb(c[0], c[1], c[2], 0.55);
      g.beginPath(); const cx = r() * s, cy = r() * s; g.moveTo(cx, cy);
      for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.283 + r(); const rad = 10 + r() * 26; g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
      g.closePath(); g.fill();
    }
    g.strokeStyle = 'rgba(15,10,35,0.5)'; g.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { g.beginPath(); let x = r() * s, y = r() * s; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
    speckle(g, s, r, 'rgba(170,200,255,0.5)', 'rgba(5,0,20,0.4)', 150);
    bevel(g, s, 'rgba(190,180,255,0.18)', 'rgba(5,0,25,0.5)', 3);
  }),

  /** Quarry scorched stone. */
  scorch: () => tex('scorch', 128, (g, s, r) => {
    const base = [118, 70, 56];
    g.fillStyle = rgb(...base); g.fillRect(0, 0, s, s);
    blotches(g, s, r, base, 30, 8, 24, 50, 0.5);
    g.strokeStyle = 'rgba(30,10,8,0.65)'; g.lineWidth = 2;
    for (let i = 0; i < 5; i++) { g.beginPath(); let x = r() * s, y = r() * s; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 38; y += (r() - 0.5) * 38; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(255,130,40,0.55)'; g.lineWidth = 1;
    for (let i = 0; i < 2; i++) { g.beginPath(); let x = r() * s, y = r() * s; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
    speckle(g, s, r, 'rgba(255,190,120,0.35)', 'rgba(20,5,0,0.45)', 140);
    bevel(g, s, 'rgba(255,170,120,0.2)', 'rgba(25,5,0,0.5)', 3);
  }),

  /** Riveted steel plate for the tower. */
  steel: () => tex('steel', 128, (g, s, r) => {
    const gr = g.createLinearGradient(0, 0, s, s);
    gr.addColorStop(0, '#6f7f93'); gr.addColorStop(1, '#4e5b6c');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 20; i++) { g.strokeStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.05 + r() * 0.08})`; g.lineWidth = 1; g.beginPath(); const y = r() * s; g.moveTo(0, y); g.lineTo(s, y + (r() - 0.5) * 6); g.stroke(); }
    g.strokeStyle = 'rgba(15,22,32,0.7)'; g.lineWidth = 2; g.strokeRect(5, 5, s - 10, s - 10);
    for (const [x, y] of [[12, 12], [s - 12, 12], [12, s - 12], [s - 12, s - 12]]) { // rivets
      g.fillStyle = '#2b3442'; g.beginPath(); g.arc(x + 1, y + 1.5, 4.5, 0, 7); g.fill();
      g.fillStyle = '#9fb0c4'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x - 1.2, y - 1.2, 1.4, 0, 7); g.fill();
    }
    speckle(g, s, r, 'rgba(255,255,255,0.18)', 'rgba(0,0,0,0.25)', 90);
    bevel(g, s, 'rgba(220,235,255,0.25)', 'rgba(5,10,20,0.5)', 3);
  }),

  /** Wooden crate (roll block). */
  crate: () => tex('crate', 128, (g, s, r) => {
    g.fillStyle = '#b97f3e'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) { // planks
      const y = (i * s) / 4; g.fillStyle = rgb(170 + r() * 30, 112 + r() * 24, 56 + r() * 16); g.fillRect(0, y + 1, s, s / 4 - 2);
      g.strokeStyle = 'rgba(70,35,10,0.35)'; g.lineWidth = 1; for (let k = 0; k < 5; k++) { const yy = y + 4 + r() * (s / 4 - 8); g.beginPath(); g.moveTo(0, yy); g.lineTo(s, yy + (r() - 0.5) * 3); g.stroke(); }
    }
    g.strokeStyle = '#5e3512'; g.lineWidth = 9; g.strokeRect(5, 5, s - 10, s - 10);
    g.lineWidth = 8; g.beginPath(); g.moveTo(8, 8); g.lineTo(s - 8, s - 8); g.moveTo(s - 8, 8); g.lineTo(8, s - 8); g.stroke();
    g.strokeStyle = '#8c5a26'; g.lineWidth = 3; g.strokeRect(5, 5, s - 10, s - 10);
    g.fillStyle = '#d8d0c0'; for (const [x, y] of [[10, 10], [s - 10, 10], [10, s - 10], [s - 10, s - 10], [s / 2, s / 2]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(s * 0.62, s * 0.1); g.lineTo(s * 0.55, s * 0.32); g.lineTo(s * 0.66, s * 0.45); g.stroke(); // crack hint
    bevel(g, s, 'rgba(255,220,160,0.25)', 'rgba(30,10,0,0.45)', 3);
  }),

  /** Cracked pound slab with glowing fissures. */
  slab: () => tex('slab', 128, (g, s, r) => {
    const base = [96, 100, 108];
    g.fillStyle = rgb(...base); g.fillRect(0, 0, s, s);
    blotches(g, s, r, base, 22, 8, 24, 28, 0.5);
    g.shadowColor = 'rgba(255,150,40,0.9)'; g.shadowBlur = 8;
    g.strokeStyle = '#ffb347'; g.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) { g.beginPath(); let x = s * (0.2 + r() * 0.6), y = 0; g.moveTo(x, y); while (y < s) { x += (r() - 0.5) * 26; y += 10 + r() * 14; g.lineTo(x, Math.min(y, s)); } g.stroke(); }
    g.shadowBlur = 0;
    g.strokeStyle = '#3a3d44'; g.lineWidth = 5; g.strokeRect(4, 4, s - 8, s - 8);
    speckle(g, s, r, 'rgba(255,255,255,0.18)', 'rgba(0,0,0,0.3)', 100);
    bevel(g, s, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.45)', 3);
  }),

  bark: () => tex('bark', 128, (g, s, r) => {
    g.fillStyle = '#6b4526'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) { const x = r() * s, w = 2 + r() * 6; g.fillStyle = rgb(60 + r() * 50, 36 + r() * 30, 16 + r() * 18, 0.7); g.fillRect(x, 0, w, s); }
    for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(25,12,4,0.55)'; g.lineWidth = 1 + r() * 1.5; const x = r() * s; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y < s; y += 16) g.lineTo(x + (r() - 0.5) * 6, y + 16); g.stroke(); }
    speckle(g, s, r, 'rgba(255,220,170,0.25)', 'rgba(0,0,0,0.3)', 80);
  }, { repeat: true }),

  lava: () => tex('lava', 128, (g, s, r) => {
    g.fillStyle = '#d63a0b'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) { g.fillStyle = rgb(255, 100 + r() * 130, 0 + r() * 60, 0.35); g.beginPath(); g.arc(r() * s, r() * s, 6 + r() * 20, 0, 7); g.fill(); }
    for (let i = 0; i < 22; i++) { g.fillStyle = rgb(80 + r() * 40, 15, 5, 0.55); g.beginPath(); g.arc(r() * s, r() * s, 4 + r() * 12, 0, 7); g.fill(); }
    // wrap copies so the scrolling texture tiles
    const img = g.getImageData(0, 0, s, s); g.putImageData(img, 0, 0);
  }, { repeat: true }),

  water: () => tex('water', 128, (g, s, r) => {
    g.fillStyle = '#2f89b8'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(210,245,255,0.55)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const y = r() * s, x = r() * s; g.beginPath(); g.moveTo(x - 20, y); g.quadraticCurveTo(x, y - 4, x + 20, y); g.stroke(); g.beginPath(); g.moveTo(x - 20 + s, y); g.quadraticCurveTo(x + s, y - 4, x + 20 + s, y); g.stroke(); g.beginPath(); g.moveTo(x - 20 - s, y); g.quadraticCurveTo(x - s, y - 4, x + 20 - s, y); g.stroke(); }
  }, { repeat: true }),

  /** Tileable dark masonry for the temple back wall. */
  brickwall: () => tex('brickwall', 256, (g, s, r) => {
    g.fillStyle = '#3a5254'; g.fillRect(0, 0, s, s);
    const rows = 8, bh = s / rows;
    for (let j = 0; j < rows; j++) {
      const cols = 4, bw = s / cols, off = j % 2 ? bw / 2 : 0;
      for (let i = -1; i < cols + 1; i++) {
        const c = jitter([82, 114, 116], r, 22); g.fillStyle = rgb(...c); g.fillRect(i * bw + off + 2, j * bh + 2, bw - 4, bh - 4);
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(i * bw + off + 2, j * bh + 2, bw - 4, 3);
      }
    }
    for (let i = 0; i < 20; i++) { g.fillStyle = rgb(40 + r() * 30, 90 + r() * 40, 60, 0.25); g.beginPath(); g.arc(r() * s, r() * s, 6 + r() * 16, 0, 7); g.fill(); }
    speckle(g, s, r, 'rgba(255,255,255,0.08)', 'rgba(0,0,0,0.25)', 300);
  }, { repeat: true }),

  rockwall: () => tex('rockwall', 256, (g, s, r) => {
    g.fillStyle = '#26214a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) { const c = jitter([58, 50, 104], r, 26); g.fillStyle = rgb(c[0], c[1], c[2], 0.6); g.beginPath(); const cx = r() * s, cy = r() * s; g.moveTo(cx, cy); for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283 + r(); g.lineTo(cx + Math.cos(a) * (14 + r() * 40), cy + Math.sin(a) * (14 + r() * 40)); } g.closePath(); g.fill(); }
    speckle(g, s, r, 'rgba(160,180,255,0.2)', 'rgba(0,0,0,0.3)', 260);
  }, { repeat: true }),

  steelwall: () => tex('steelwall', 256, (g, s, r) => {
    g.fillStyle = '#1b2433'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(90,110,140,0.45)'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, (i * s) / 4); g.lineTo(s, (i * s) / 4); g.moveTo((i * s) / 4, 0); g.lineTo((i * s) / 4, s); g.stroke(); }
    for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(120,140,170,0.5)'; g.beginPath(); g.arc(((i % 4) * s) / 4 + 8, (Math.floor(i / 4) * s) / 4 + 8, 2.2, 0, 7); g.fill(); }
    speckle(g, s, r, 'rgba(255,255,255,0.08)', 'rgba(0,0,0,0.3)', 220);
  }, { repeat: true }),

  scorchwall: () => tex('scorchwall', 256, (g, s, r) => {
    g.fillStyle = '#44201a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) { const c = jitter([104, 50, 36], r, 26); g.fillStyle = rgb(c[0], c[1], c[2], 0.6); g.beginPath(); const cx = r() * s, cy = r() * s; g.moveTo(cx, cy); for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283 + r(); g.lineTo(cx + Math.cos(a) * (14 + r() * 40), cy + Math.sin(a) * (14 + r() * 40)); } g.closePath(); g.fill(); }
    speckle(g, s, r, 'rgba(255,150,80,0.16)', 'rgba(0,0,0,0.35)', 240);
  }, { repeat: true }),

  /** Soft radial glow for additive sprites. */
  glow: () => tex('glow', 128, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }),

  cloud: () => tex('cloud', 256, (g, s, r) => {
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      const x = s * (0.18 + r() * 0.64), y = s * (0.38 + r() * 0.24), rad = 18 + r() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    }
  }),

  /** Vertical light shaft. */
  ray: () => tex('ray', 64, (g, s) => {
    const gr = g.createLinearGradient(0, 0, s, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    const v = g.createLinearGradient(0, 0, 0, s);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.35, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, s, s);
  }),

  /** Leaf cluster alpha card for foliage. */
  foliage: () => tex('foliage', 128, (g, s, r) => {
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 38; i++) {
      const x = s * (0.1 + r() * 0.8), y = s * (0.1 + r() * 0.8), a = r() * 6.283, l = 14 + r() * 20;
      g.save(); g.translate(x, y); g.rotate(a);
      const c = jitter([60, 150, 60], r, 60); g.fillStyle = rgb(...c);
      g.beginPath(); g.ellipse(0, 0, l, l * 0.38, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(20,70,20,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-l, 0); g.lineTo(l, 0); g.stroke();
      g.restore();
    }
  }),
};

/** Cached accessor: textures.get('dirt') */
export function getTexture(name) {
  const f = textures[name];
  if (!f) throw new Error('unknown texture ' + name);
  return f();
}
