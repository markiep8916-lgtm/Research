// heart: texture painters (browser, TECH_PLAN 3.12), imported by art.js. Pixel art at 32 px per world
// unit in three layers (colour, height, emissive), painted lazily on first use.
//
// Palette (12.1): WARDEN's gold choir light over deep navy; receding pod lights below; porcelain and
// gilt; dawn blue only as a cool accent. Floors keep their body under ~10% value contrast (G2 bar
// rule 16): the gold lives in thin inlaid seams, never in a stamped blob, and every floor is
// symmetric enough for the legend's random quarter turns.
//
// export const TEXTURES   { name: TextureDef } registered by art.js:
//   floors   hr_floor / hr_floor_b (the ring galleries: navy flagstones, gold-inlaid seams),
//            hr_crown (the Crown: ivory-gold marble), hr_pad (lift pads: gilt plates),
//            hr_slab (the pier and the Sanctum: navy deck plates, gilt trim), hr_bridge (hard light)
//   slabs    hr_edge (platform rims: a gilt lip over navy stone), hr_under (the hanging undersides)
//   metal    hr_gilt (brushed gold: balustrades, rings, organ pipes, pylons)
//   props    hr_screen (WARDEN's hymnal, 3 frames), hr_pod (a Choir pod's window), hr_column (the
//            falling light, for additive shafts), hr_glyph (the twelve-rayed ring, alpha), hr_banner
//            (the Choir's long pennants, alpha)
//   abyss    bd_choir (the underlay: thousands of pods like stars, ringed round falling light)

import { rng, bayer, Painter } from '../../art/painter.js';
import { fbm } from '../../art/tiles.js';

// ---------------------------------------------------------------- ramps (dark -> light)

const NV = ['#090c1e', '#0f1530', '#161e40', '#1e2950', '#283562', '#334376', '#43568e', '#5b70ac'];   // navy stone
const IV = ['#3a3040', '#5a4a52', '#7e6a66', '#a58e7e', '#c8b296', '#e2cfae', '#f2e4c6', '#fff6e2'];   // ivory marble
const GT = ['#1c1204', '#352409', '#5a3e0f', '#856017', '#b58723', '#dcae3a', '#f6d46a', '#fff3c4'];   // gilt
const ST = ['#0a0e1c', '#111830', '#182240', '#212d52', '#2b3a64', '#384a7a', '#4a5e94', '#6478b0'];   // deck steel
const GD = { lo: '#4a2e08', mid: '#a06a18', hi: '#ffc04a', hot: '#fff0c0' };                           // emissive gold

const floor = { w: 32, h: 32, wrapX: true, wrapY: true };

/** Periodic noise over a tile of size n (seamless when the texture wraps). */
const tn = (x, y, seed, scale = 0.25, n = 32, oct = 3) => fbm(x * scale, y * scale, seed, oct, n * scale, n * scale);
const pick = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i))];

// ---------------------------------------------------------------- floors

/**
 * A flagstone: a low-contrast mottled body, a half-groove on every edge carrying an inlaid seam of
 * dim gold (two cells meet in one even line whatever their turn), a bevelled lip, small gilt studs
 * where four stones meet.
 */
function flagstone(t, ramp, seed, { body = 4, seam = '#24170a', lip = 1, stud = true } = {}) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, seed, 0.14);
      const m = tn(x, y, seed + 7, 0.45, 32, 2);
      let c = body;
      if (n > 0.62) c = body + 1;
      else if (n < 0.36 && bayer(x, y, 0.5)) c = body - 1;
      t.px(x, y, pick(ramp, c), 0.55 + (n - 0.5) * 0.08 + (m - 0.5) * 0.03);
    }
  }
  for (let i = 0; i < 32; i++) {
    for (const [x, y] of [[i, 0], [0, i], [i, 31], [31, i]]) t.glow(x, y, GT[2], seam).ht(x, y, 0.3);
  }
  if (lip) {
    t.hline(1, 30, 1, pick(ramp, body + 1), 0.62).vline(1, 1, 30, pick(ramp, body + 1), 0.62);
    t.hline(1, 30, 30, pick(ramp, body - 1), 0.5).vline(30, 1, 30, pick(ramp, body - 1), 0.5);
  }
  if (stud) for (const [x, y] of [[0, 0], [31, 0], [0, 31], [31, 31]]) t.glow(x, y, GT[6], GD.lo).ht(x, y, 0.7);
}

/** A run of engraved hymn marks across a stone (low contrast: carved, not painted). */
function hymnRun(t, r, x0, y, len, ramp, body) {
  for (let x = x0; x < x0 + len; x++) {
    if (x > 29 || x < 3) continue;
    const k = r();
    if (k < 0.55) t.px(x, y, pick(ramp, body - 1), 0.42);
    if (k < 0.2) t.px(x, y - 1, pick(ramp, body - 1), 0.42);
    if (k > 0.85) t.px(x, y + 1, pick(ramp, body - 1), 0.42);
  }
}

function paintFloor(t) {
  flagstone(t, NV, 101);
}

function paintFloorB(t) {
  flagstone(t, NV, 103);
  const r = rng(13);
  hymnRun(t, r, 5, 11, 20, NV, 4);
  hymnRun(t, r, 7, 20, 16, NV, 4);
  // a small gilt medallion off-centre, set flush (the Choir's mark on one stone in four)
  const cx = 22, cy = 24;
  for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d < 2.6) t.px(x, y, d < 1.2 ? GT[6] : GT[4], 0.6);
  }
  t.emit(cx, cy, GD.mid);
}

/**
 * The Crown: dusk marble (navy shot through with ivory veins, so the gold light reads on it rather
 * than washing it out), gold seams and studs; the deck's concentric gilt bands are geometry.
 */
function paintCrown(t) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 301, 0.12);
      const v = Math.abs(tn(x, y, 307, 0.09, 32, 4) - 0.5);
      let c = 4;
      if (n > 0.62) c = 5;
      else if (n < 0.38 && bayer(x, y, 0.5)) c = 3;
      t.px(x, y, NV[c], 0.55 + (n - 0.5) * 0.06);
      if (v < 0.012) t.px(x, y, IV[2], 0.52);
      else if (v < 0.03 && bayer(x, y, 0.5)) t.px(x, y, NV[6], 0.52);
    }
  }
  for (let i = 0; i < 32; i++) {
    for (const [x, y] of [[i, 0], [0, i], [i, 31], [31, i]]) t.glow(x, y, GT[3], GD.lo).ht(x, y, 0.32);
  }
  t.hline(1, 30, 1, NV[6], 0.62).vline(1, 1, 30, NV[6], 0.62);
  for (const [x, y] of [[0, 0], [31, 0], [0, 31], [31, 31]]) t.glow(x, y, GT[7], GD.mid);
}

/** A lift pad: gilt plates with a concentric tread and a glowing joint. */
function paintPad(t) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 401, 0.2);
      t.px(x, y, n > 0.58 ? GT[4] : GT[3], 0.55 + (n - 0.5) * 0.06);
      if ((x + y) % 6 === 0 && x > 3 && x < 28 && y > 3 && y < 28) t.px(x, y, GT[2], 0.48);
    }
  }
  for (let i = 0; i < 32; i++) for (const [x, y] of [[i, 0], [0, i], [i, 31], [31, i]]) t.glow(x, y, GT[1], GD.mid).ht(x, y, 0.3);
  t.hline(1, 30, 1, GT[6], 0.64).vline(1, 1, 30, GT[6], 0.64).hline(1, 30, 30, GT[2], 0.5).vline(30, 1, 30, GT[2], 0.5);
}

/** The pier and the Sanctum: navy deck plates (ship-made, not cathedral) with gilt bolts. */
function paintSlab(t) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 501, 0.18);
      let c = 4;
      if (n > 0.64) c = 5;
      else if (n < 0.34 && bayer(x, y, 0.45)) c = 3;
      t.px(x, y, ST[c], 0.55);
    }
  }
  for (const k of [10, 21]) for (let i = 2; i < 30; i += 2) t.tint(k, i, ST[6], 0.4);
  for (let i = 0; i < 32; i++) for (const [x, y] of [[i, 0], [0, i], [i, 31], [31, i]]) t.px(x, y, ST[1], 0.3);
  t.hline(1, 30, 1, ST[6], 0.62).vline(1, 1, 30, ST[6], 0.62);
  for (const [x, y] of [[3, 3], [28, 3], [3, 28], [28, 28]]) t.glow(x, y, GT[6], GD.lo).ht(x, y, 0.75);
}

/**
 * Hard light: a deep navy body (the abyss shows through as a dark glass) laid with gold chevrons that
 * stream along the span; dim seams, so a figure on it still reads against it.
 */
function paintBridge(t) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const d = Math.abs(y - 15.5);
      const ch = (x + d * 0.9) % 16;
      const n = tn(x, y, 601, 0.3);
      if (y === 0 || y === 31) t.px(x, y, NV[1]);
      else if (ch < 1.6 && d < 12) t.glow(x, y, GT[5], d < 5 ? GD.mid : GD.lo);
      else if (ch < 3 && d < 12) t.glow(x, y, GT[2], GD.lo);
      else t.px(x, y, n > 0.6 ? NV[4] : NV[3]);
      t.ht(x, y, y === 0 || y === 31 ? 0.35 : 0.5);
    }
  }
  for (const x of [0, 8, 16, 24]) t.emit(x, 0, GD.mid).emit(x, 31, GD.mid);
}

// ---------------------------------------------------------------- slabs

/** A platform rim: a gilt lip, a band of navy stone with ribs and a thin gold line, a dark foot. */
function paintEdge(t) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 701, 0.2);
      let c;
      if (y < 5) c = y === 0 ? GT[7] : y < 3 ? GT[5] : GT[3];
      else c = pick(NV, (x % 8 < 2 ? 4 : 3) + (n > 0.6 ? 1 : 0) - (y > 26 ? 1 : 0));
      t.px(x, y, c, y < 5 ? 0.7 : x % 8 < 2 ? 0.6 : 0.45);
    }
  }
  for (let x = 0; x < 32; x++) {
    t.emit(x, 1, GD.hi);
    t.emit(x, 2, GD.mid);
    t.glow(x, 15, GT[4], GD.mid);
  }
}

/** The hanging undersides: ribbed navy stone darkening downward, sparse warm pod lights. */
function paintUnder(t) {
  const r = rng(81);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 801, 0.18);
      const rib = x % 8 < 2;
      t.px(x, y, pick(NV, (rib ? 3 : 2) + (n > 0.62 ? 1 : 0)), rib ? 0.62 : 0.45);
    }
  }
  for (let k = 0; k < 3; k++) {
    const x = 3 + Math.floor(r() * 26), y = 3 + Math.floor(r() * 26);
    t.glow(x, y, GT[6], GD.hi).glow(x + 1, y, GT[4], GD.lo);
  }
}

// ---------------------------------------------------------------- metal

function paintGilt(t) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const n = tn(x, y, 901, 0.2);
      const brush = tn(x, y, 907, 0.9, 32, 1) > 0.5;
      t.px(x, y, pick(GT, (n > 0.6 ? 5 : 4) - (brush ? 0 : 1)), 0.5 + (n - 0.5) * 0.1);
    }
  }
  for (let i = 0; i < 32; i++) {
    t.px(i, 0, GT[6], 0.6).px(i, 31, GT[2], 0.45);
    if (i % 8 === 4) t.glow(i, 16, GT[7], GD.mid);
  }
}

// ---------------------------------------------------------------- props

/** WARDEN's hymnal: navy glass, gold staff lines and notes scrolling, an almond eye watermark. */
function paintScreen(t, frame) {
  for (let y = 0; y < 40; y++) for (let x = 0; x < 64; x++) t.px(x, y, (x + y) % 2 ? '#0c1330' : '#0e1636', 0.5);
  // the eye watermark
  const cx = 32, cy = 20;
  for (let y = 8; y < 33; y++) for (let x = 12; x < 53; x++) {
    const u = (x - cx) / 20, v = (y - cy) / 11;
    const lid = 1 - u * u;
    if (lid > 0 && Math.abs(v) < lid && Math.abs(v) > lid - 0.18) t.glow(x, y, '#3a2a10', GD.lo);
  }
  for (let y = 15; y < 26; y++) for (let x = 27; x < 38; x++) if (Math.hypot(x - cx, y - cy) < 5) t.glow(x, y, '#5a3a10', GD.lo);
  // two staves of the lullaby, the notes moving one step per frame
  const r = rng(31 + frame);
  for (const sy of [6, 28]) {
    for (let l = 0; l < 5; l += 2) for (let x = 3; x < 61; x++) t.glow(x, sy + l, '#2a2410', '#3a2a0c');
    for (let x = 5 + frame * 3; x < 60; x += 6 + Math.floor(r() * 3)) {
      const y = sy + Math.floor(r() * 5);
      t.glow(x, y, '#ffd46a', GD.hi).glow(x + 1, y, '#c09030', GD.mid).glow(x + 1, y - 1, '#c09030', GD.mid);
    }
  }
  for (let x = 0; x < 64; x++) { t.glow(x, 0, '#5a4418', GD.mid); t.glow(x, 39, '#5a4418', GD.mid); }
}

/**
 * A Choir pod (wrapped once round the capsule): a dark navy shell with gilt caps and ribs, one tall
 * window of warm light on one side with the sleeper inside, so a pod reads as a capsule from any turn.
 */
function paintPod(t) {
  const W = 32, H = 48, cx = 15.5, cy = 24;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = tn(x, y, 1101, 0.3, 32);
      const u = (x - cx) / 6.5, v = (y - cy) / 15;
      const d = Math.hypot(u, v);
      if (y < 6 || y > 41) t.px(x, y, pick(GT, (y < 2 || y > 45 ? 2 : 4) + (n > 0.55 ? 1 : 0)), 0.65);
      else if (y === 6 || y === 41) t.glow(x, y, GT[6], GD.mid);
      else if (d > 1.12) t.px(x, y, x % 8 === 0 ? NV[1] : pick(NV, n > 0.6 ? 4 : 3), x % 8 === 0 ? 0.45 : 0.55);
      else if (d > 1) t.glow(x, y, GT[5], GD.lo).ht(x, y, 0.7);
      else {
        // the sleeper: a soft head and shoulders, darker against the glass light
        const head = Math.hypot((x - cx) / 2.6, (y - 15) / 3.2) < 1;
        const body = Math.abs(x - cx) < 4.2 - Math.max(0, 21 - y) * 0.25 && y > 18;
        const em = head || body ? GD.lo : d < 0.6 ? GD.hi : GD.mid;
        t.glow(x, y, head || body ? '#8a6a48' : '#f6dca0', em);
      }
    }
  }
}

/** The falling light: vertical streaks of gold (for additive shafts; black is transparent there). */
function paintColumn(t) {
  const r = rng(1201);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 32; x++) t.put(x, y, '#000000');
  for (let k = 0; k < 26; k++) {
    const x = Math.floor(r() * 32), y0 = Math.floor(r() * 128), len = 10 + Math.floor(r() * 40);
    const hot = r() < 0.3;
    for (let i = 0; i < len; i++) {
      const a = Math.sin((i / len) * Math.PI);
      const c = hot ? [255, 240, 200] : [255, 190, 90];
      const p = t.get(x, (y0 + i) % 128);
      t.put(x, (y0 + i) % 128, [Math.min(255, p[0] + c[0] * a * 0.8), Math.min(255, p[1] + c[1] * a * 0.8), Math.min(255, p[2] + c[2] * a * 0.8), 255]);
    }
  }
}

/** The twelve-rayed ring (WARDEN's sigil, abstracted): pads, the oculus, the screens' stands. */
function paintGlyph(t) {
  const N = 64, c = 31.5;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - c, y - c), a = Math.atan2(y - c, x - c);
      const ray = Math.abs(((a / (Math.PI * 2)) * 12 + 12) % 1 - 0.5) > 0.44;
      if ((d > 29 && d < 31) || (d > 20 && d < 21.4)) t.glow(x, y, '#ffe2a0', d > 28 ? GD.hot : GD.hi);
      else if (ray && d > 22.5 && d < 28) t.glow(x, y, '#ffd27a', GD.hi);
      else if (d < 19) t.px(x, y, [255, 214, 140, Math.round(36 * (1 - d / 19))]);
    }
  }
}

/** A long Choir pennant: navy cloth, a gilt border and the almond eye (alpha, 16 x 64). */
function paintBanner(t) {
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 16; x++) {
      const tail = y > 54 && Math.abs(x - 7.5) < (y - 54) * 0.8;
      if (tail) continue;
      const border = x < 2 || x > 13 || y < 2;
      const n = tn(x, y, 1301, 0.3, 16);
      t.px(x, y, border ? GT[5] : pick(NV, n > 0.55 ? 4 : 3), border ? 0.6 : 0.5);
      if (border) t.emit(x, y, GD.lo);
    }
  }
  for (let y = 18; y < 31; y++) for (let x = 3; x < 13; x++) {
    const u = (x - 7.5) / 4.6, v = (y - 24) / 5.6, lid = 1 - v * v;
    if (lid > 0 && Math.abs(u) < lid) t.glow(x, y, Math.hypot(u, v) < 0.45 ? GT[7] : GT[5], Math.hypot(u, v) < 0.45 ? GD.hot : GD.mid);
  }
}

// ---------------------------------------------------------------- the abyss

/**
 * The underlay (bd_choir, seamless): deep navy, thousands of pods like stars ringed round shafts of
 * falling light far below, warm haze where the light gathers.
 */
function paintChoir() {
  const W = 1024, H = 512;
  const p = new Painter(W, H);
  const d = p.data;
  const add = (x, y, c, a = 1) => {
    x = ((x % W) + W) % W; y = ((y % H) + H) % H;
    const i = (y * W + x) * 4;
    d[i] = Math.min(255, d[i] + c[0] * a); d[i + 1] = Math.min(255, d[i + 1] + c[1] * a); d[i + 2] = Math.min(255, d[i + 2] + c[2] * a);
  };
  // navy depth with a faint warm haze (periodic noise: the texture tiles)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = fbm(x / 128, y / 128, 17, 4, W / 128, H / 128);
    const m = fbm(x / 64, y / 64, 23, 3, W / 64, H / 64);
    const i = (y * W + x) * 4;
    d[i] = 16 + n * 22 + m * 10; d[i + 1] = 18 + n * 20 + m * 6; d[i + 2] = 44 + n * 34; d[i + 3] = 255;
  }
  const r = rng(907);
  // shafts far below: soft gold wells, each ringed by pods in tilted ellipses
  const wells = [[180, 140], [560, 90], [860, 300], [330, 400], [720, 470]];
  for (const [wx, wy] of wells) {
    for (let y = -90; y <= 90; y++) for (let x = -90; x <= 90; x++) {
      const k = Math.max(0, 1 - Math.hypot(x, y) / 90);
      if (k > 0) add(wx + x, wy + y, [110, 70, 22], k * k * 0.55);
    }
    for (let ring = 0; ring < 7; ring++) {
      const rx = 22 + ring * 11, ry = rx * 0.55, n = Math.floor(rx * 1.2);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + ring * 0.37;
        const x = Math.round(wx + Math.cos(a) * rx), y = Math.round(wy + Math.sin(a) * ry);
        const b = 0.35 + 0.65 * (1 - ring / 7) * (0.6 + r() * 0.4);
        add(x, y, [255, 214, 140], b);
        if (r() < 0.25) add(x + 1, y, [200, 150, 80], b * 0.5);
      }
    }
  }
  // the scattered pods in between: stars of warm white and gold, a few cool
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H), b = 0.25 + r() * 0.75;
    const cool = r() < 0.12;
    add(x, y, cool ? [150, 190, 255] : [255, 210 + r() * 40, 130 + r() * 60], b);
    if (r() < 0.08) { add(x + 1, y, [180, 140, 80], b * 0.5); add(x, y + 1, [180, 140, 80], b * 0.5); }
  }
  p._dirty = true;
  return p;
}

export const TEXTURES = {
  hr_floor: { ...floor, paint: paintFloor },
  hr_floor_b: { ...floor, paint: paintFloorB },
  hr_crown: { ...floor, paint: paintCrown },
  hr_pad: { ...floor, paint: paintPad },
  hr_slab: { ...floor, paint: paintSlab },
  hr_bridge: { ...floor, paint: paintBridge },
  hr_edge: { w: 32, h: 32, wrapX: true, wrapY: true, paint: paintEdge },
  hr_under: { ...floor, paint: paintUnder },
  hr_gilt: { ...floor, paint: paintGilt },
  hr_screen: { w: 64, h: 40, frames: 3, fps: 0.6, paint: paintScreen },
  hr_pod: { w: 32, h: 48, paint: paintPod },
  hr_column: { w: 32, h: 128, wrapX: true, wrapY: true, paint: paintColumn },
  hr_glyph: { w: 64, h: 64, alpha: true, paint: paintGlyph },
  hr_banner: { w: 16, h: 64, alpha: true, paint: paintBanner },
  bd_choir: { w: 1024, h: 512, raw: paintChoir, emissiveIsMap: true },
};

