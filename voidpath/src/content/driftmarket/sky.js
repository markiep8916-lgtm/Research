// driftmarket: the `bd_tethys_close` backdrop (browser; a raw 1024 x 512 painter, TECH_PLAN 3.9):
// Tethys filling the sky beyond the viewports, seen from inside its own ring. Amber and cream bands
// on a lit sphere, the ring plane edge-on across it with its shadow above, Ione small and icy in
// front of the planet, ring ice drifting below the horizon, quantised to pixel-art tones.
//
// The sky vista (world/sky.js) puts row `horizonV` (0.62) on the map's far edge: at the default
// pitch only rows 0.34-0.62 show beyond the railing (the planet's middle, Ione and the ring); low
// shots (Ruse at the viewport) show the whole disk. Below the horizon it is ring ice and stars, so
// the void around the station reads as space.

import { Painter, bayer } from '../../art/painter.js';
import { fbm } from '../../art/tiles.js';

const W = 1024, H = 512;
const P = { x: 470, y: 150, r: 300 };            // Tethys
const IONE = { x: 640, y: 236, r: 20 };          // Ione, in front of the planet
const SUN = (() => { const v = [-0.62, -0.42, 0.66]; const n = Math.hypot(...v); return v.map((c) => c / n); })();
const RING = { y0: 318, slope: -0.07, w: 7 };    // ring plane: y = y0 + slope * (x - P.x)
const FADE = 48;                                  // rows fading to flat void at the bottom
const VOID = [0.012, 0.03, 0.05];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

// band colours from the north pole to the south pole (amber, cream, rust, ochre)
const BANDS = ['#7a4a2a', '#c98a4c', '#efd2a0', '#d9a25e', '#b0672f', '#f2dcb0', '#e3b06a', '#9c5530', '#e8c78e', '#c07a3e', '#f4e2bc', '#a85f34', '#d6a062']
  .map(hex);

function bandAt(lat, lon) {
  // latitude in -1..1; turbulence along the band edges, a storm oval in the south
  const wob = (fbm(lon * 3.2 + 4, lat * 9, 71, 4) - 0.5) * 0.09 + Math.sin(lon * 7 + lat * 30) * 0.008;
  const t = clamp01((lat + wob + 1) / 2) * (BANDS.length - 1);
  const k = Math.floor(t), f = t - k;
  const a = BANDS[k], b = BANDS[Math.min(BANDS.length - 1, k + 1)];
  let c = lerp3(a, b, f * f * (3 - 2 * f));
  const storm = Math.hypot((lon - 0.45) / 0.16, (lat - 0.32) / 0.05);
  if (storm < 1) c = lerp3(c, hex('#f7e6c8'), (1 - storm) * 0.8);
  if (storm < 1.25 && storm > 0.95) c = lerp3(c, hex('#8a4b28'), 0.5);
  return c;
}

export function paintTethysClose() {
  const img = new Float32Array(W * H * 3);
  const set = (x, y, c) => { const o = (y * W + x) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; };
  const ringY = (x) => RING.y0 + RING.slope * (x - P.x);

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // space: deep teal-black haze, warmer near the planet's lit limb
    const haze = Math.exp(-(((Math.hypot(x - P.x, y - P.y) - P.r) / 90) ** 2)) * 0.7;
    let c = [VOID[0] + haze * 0.09, VOID[1] + haze * 0.06, VOID[2] + haze * 0.04];
    const neb = fbm(x * 0.004, y * 0.006, 81, 4);
    c = lerp3(c, [0.03, 0.09, 0.11], clamp01((neb - 0.5) * 2.2) * 0.8);

    // the planet
    const dx = (x + 0.5 - P.x) / P.r, dy = (y + 0.5 - P.y) / P.r;
    const d2 = dx * dx + dy * dy;
    if (d2 < 1) {
      const nz = Math.sqrt(1 - d2);
      const lat = dy, lon = Math.atan2(dx, nz) / Math.PI;
      let pc = bandAt(lat, lon);
      const lam = dx * SUN[0] + dy * SUN[1] + nz * SUN[2];
      const lit = clamp01(lam * 1.15 + 0.08);
      // terminator glow: a warm rim before the night side
      const term = Math.exp(-(((lam - 0.02) / 0.08) ** 2)) * 0.25;
      pc = [pc[0] * (0.08 + lit * 1.0) + term * 0.6, pc[1] * (0.06 + lit * 0.95) + term * 0.25, pc[2] * (0.07 + lit * 0.9) + term * 0.05];
      // limb darkening and a thin cream atmosphere at the lit edge
      const limb = Math.pow(nz, 0.35);
      pc = pc.map((v) => v * (0.45 + 0.55 * limb));
      const rim = Math.exp(-((1 - Math.sqrt(d2)) / 0.012)) * clamp01(lam + 0.3);
      pc = [pc[0] + rim * 0.55, pc[1] + rim * 0.45, pc[2] + rim * 0.3];
      // the ring's shadow thrown on the planet above the ring plane
      const ry = ringY(x);
      const sh = Math.exp(-(((y - (ry - 74 - dx * 30)) / 9) ** 2));
      pc = pc.map((v) => v * (1 - sh * 0.62));
      // Ione's shadow, a small dark oval upper-right of the moon
      const isd = Math.hypot((x - (IONE.x + 46)) / 15, (y - (IONE.y + 18)) / 11);
      if (isd < 1) pc = pc.map((v) => v * (0.35 + isd * 0.4));
      c = pc;
    } else {
      // stars outside the disk
      const s = fbm(x * 0.9, y * 0.9, 91, 1);
      if (s > 0.83) {
        const b = (s - 0.83) * 5.5;
        c = lerp3(c, [0.9, 0.95, 1], clamp01(b));
      }
    }

    // Ione: icy, pale blue-white, lit from the left, cracked with faint lines
    const ix = (x + 0.5 - IONE.x) / IONE.r, iy = (y + 0.5 - IONE.y) / IONE.r;
    const id2 = ix * ix + iy * iy;
    if (id2 < 1) {
      const nz = Math.sqrt(1 - id2);
      const lam = clamp01(ix * SUN[0] + iy * SUN[1] + nz * SUN[2]);
      const crack = Math.abs(Math.sin(ix * 9 + fbm(ix * 3, iy * 3, 95, 2) * 6)) < 0.09;
      const crater = fbm(ix * 4 + 3, iy * 4, 96, 3) > 0.62;
      let ic = crack ? [0.42, 0.56, 0.7] : crater ? [0.56, 0.66, 0.78] : [0.66, 0.76, 0.86];
      ic = ic.map((v) => v * (0.06 + Math.pow(lam, 0.8) * 0.82));
      c = ic;
    }

    // the ring plane edge-on: a bright band with gaps, passing in front of the planet
    const ry = ringY(x);
    const ady = y + 0.5 - ry;
    if (Math.abs(ady) < RING.w) {
      const core = 1 - Math.abs(ady) / RING.w;
      const gap = Math.abs(ady) > 2.5 && Math.abs(ady) < 3.6 ? 0.25 : 1;
      const grain = 0.75 + fbm(x * 0.08, 3, 97, 3) * 0.5;
      const k = core * gap * grain;
      const behind = d2 < 1 && ady < -1 ? 0.55 : 1;
      c = lerp3(c, [1.0, 0.92, 0.78].map((v) => v * (0.5 + 0.6 * k)), clamp01(k * 1.25) * behind);
    }
    // a faint wide halo of ring dust around the band
    const halo = Math.exp(-((ady / 34) ** 2)) * 0.12;
    c = [c[0] + halo * 0.6, c[1] + halo * 0.62, c[2] + halo * 0.66];
    set(x, y, c);
  }

  // ring ice drifting below the ring plane: chunky, lit from the upper left
  const chunks = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W, y = Math.min(H - FADE - 8, ringY(x) + 14 + Math.pow(rnd(), 0.7) * 170);
    chunks.push([x, y, 2 + rnd() * (4 + (y - 330) / 40)]);
  }
  for (const [cx, cy, r] of chunks) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const ddx = (x + 0.5 - cx) / r, ddy = (y + 0.5 - cy) / (r * 0.8);
      const dd = ddx * ddx + ddy * ddy + (fbm(x * 0.3, y * 0.3, 99, 2) - 0.5) * 0.6;
      if (dd > 1) continue;
      const lam = clamp01(-ddx * 0.6 - ddy * 0.5 + 0.4);
      set(x, y, [0.18 + lam * 0.62, 0.26 + lam * 0.64, 0.34 + lam * 0.62]);
    }
  }

  // the last rows fade to flat void: the vista stretches its bottom row below the station
  for (let y = H - FADE; y < H; y++) {
    const k = (y - (H - FADE)) / (FADE - 1);
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      for (let c = 0; c < 3; c++) img[o + c] = lerp(img[o + c], VOID[c], k * k);
    }
  }

  // quantise to pixel-art tones with an ordered dither
  const p = new Painter(W, H);
  const data = p.data;
  const Q = 28;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 3, d = (y * W + x) * 4;
    for (let c = 0; c < 3; c++) {
      const v = clamp01(img[o + c]) * Q;
      const k = Math.floor(v) + (bayer(x, y, v - Math.floor(v)) ? 1 : 0);
      data[d + c] = Math.min(255, Math.round(k * (255 / Q)));
    }
    data[d + 3] = 255;
  }
  // a few bright glints on the ring and the ice
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(ringY(x) + (rnd() - 0.3) * 60);
    if (y < 0 || y >= H - FADE) continue;
    for (const [ox, oy, a] of [[0, 0, 255], [1, 0, 150], [-1, 0, 150], [0, 1, 150], [0, -1, 150]]) {
      const xx = x + ox, yy = y + oy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const q = (yy * W + xx) * 4;
      data[q] = Math.max(data[q], a); data[q + 1] = Math.max(data[q + 1], a); data[q + 2] = Math.max(data[q + 2], a);
    }
  }
  p._dirty = true;
  return p;
}
