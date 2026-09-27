'use strict';
// ---------------------------------------------------------------------------
// Hex grid helpers (pointy-top, odd rows shifted right) and map generation.
// ---------------------------------------------------------------------------

const NB_EVEN = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const NB_ODD = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inMap(x, y) { return x >= 0 && y >= 0 && x < G.W && y < G.H; }
function idx(x, y) { return y * G.W + x; }
function tileAt(x, y) { return inMap(x, y) ? G.tiles[y * G.W + x] : null; }
function xyOf(i) { return [i % G.W, (i / G.W) | 0]; }

function neighbors(x, y) {
  const d = (y & 1) ? NB_ODD : NB_EVEN;
  const out = [];
  for (let k = 0; k < 6; k++) {
    const nx = x + d[k][0], ny = y + d[k][1];
    if (inMap(nx, ny)) out.push([nx, ny]);
  }
  return out;
}

function toCube(x, y) {
  const q = x - (y - (y & 1)) / 2;
  return [q, y, -q - y];
}

function hexDist(x1, y1, x2, y2) {
  const a = toCube(x1, y1), b = toCube(x2, y2);
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

// All tiles within radius r (including centre).
function tilesInRadius(x, y, r) {
  const out = [];
  for (let dy = -r; dy <= r; dy++) {
    const ny = y + dy;
    if (ny < 0 || ny >= G.H) continue;
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      const nx = x + dx;
      if (nx < 0 || nx >= G.W) continue;
      if (hexDist(x, y, nx, ny) <= r) out.push([nx, ny]);
    }
  }
  return out;
}

// --- value noise ------------------------------------------------------------
function makeNoise(rng) {
  const P = 64;
  const grid = [];
  for (let i = 0; i < P * P; i++) grid.push(rng());
  const at = (x, y) => grid[((y % P + P) % P) * P + ((x % P + P) % P)];
  const smooth = t => t * t * (3 - 2 * t);
  const val = (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y, oct = 4) => {
    let s = 0, amp = 1, f = 1, tot = 0;
    for (let o = 0; o < oct; o++) { s += val(x * f, y * f) * amp; tot += amp; amp *= 0.5; f *= 2; }
    return s / tot;
  };
}

function landComponents() {
  const comp = new Int32Array(G.tiles.length).fill(-1);
  const sizes = [];
  for (let i = 0; i < G.tiles.length; i++) {
    const t = G.tiles[i];
    if (comp[i] >= 0 || TERRAIN[t.t].water || t.mtn) continue;
    const id = sizes.length; let n = 0;
    const st = [i]; comp[i] = id;
    while (st.length) {
      const j = st.pop(); n++;
      const [x, y] = xyOf(j);
      for (const [nx, ny] of neighbors(x, y)) {
        const k = idx(nx, ny), tt = G.tiles[k];
        if (comp[k] < 0 && !TERRAIN[tt.t].water && !tt.mtn) { comp[k] = id; st.push(k); }
      }
    }
    sizes.push(n);
  }
  return { comp, sizes };
}

function generateMap(W, H, seed) {
  const rng = mulberry32(seed);
  const elevN = makeNoise(rng), moistN = makeNoise(rng), rugN = makeNoise(rng);
  G.W = W; G.H = H;
  G.tiles = [];
  const elev = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = x / W, ny = y / H;
      // falloff keeps a ring of ocean around the edges -> one main continent
      const dx = Math.abs(nx - 0.5) * 2, dy = Math.abs(ny - 0.5) * 2;
      const edge = Math.max(dx * 0.9, dy);
      const e = elevN(x / 9 + 3, y / 9 + 7, 5) - Math.pow(edge, 3) * 0.55;
      elev.push(e);
      G.tiles.push({ t: 'ocean', hills: false, mtn: false, feat: null, res: null, imp: null, owner: -1, city: -1, dist: null, camp: false, wonder: null });
    }
  }
  const sorted = elev.slice().sort((a, b) => a - b);
  const sea = sorted[Math.floor(sorted.length * 0.58)];
  const landVals = sorted.filter(v => v > sea);
  const mtnCut = landVals[Math.floor(landVals.length * 0.93)];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y), t = G.tiles[i], e = elev[i];
      if (e <= sea) continue;
      const lat = Math.abs(y / (H - 1) - 0.5) * 2;
      const m = moistN(x / 7 + 11, y / 7 + 5, 4);
      const rug = rugN(x / 5, y / 5, 3);
      if (lat > 0.9) t.t = 'snow';
      else if (lat > 0.72) t.t = 'tundra';
      else if (m < 0.36 && lat < 0.55) t.t = 'desert';
      else if (m < 0.52) t.t = 'plains';
      else t.t = 'grass';
      if (e > mtnCut && rug > 0.42) t.mtn = true;
      else if (rug > 0.58 || (e > mtnCut && rug > 0.3)) t.hills = true;
      if (!t.mtn) {
        const fm = moistN(x / 4 + 40, y / 4 + 40, 3);
        if (t.t !== 'desert' && t.t !== 'snow') {
          if (lat < 0.32 && m > 0.6 && fm > 0.45 && t.t !== 'tundra') t.feat = 'jungle';
          else if (fm > 0.58 && m > 0.45) t.feat = 'forest';
          else if (!t.hills && m > 0.66 && fm < 0.3 && t.t === 'grass') t.feat = 'marsh';
        }
      }
    }
  }
  // coast
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = G.tiles[idx(x, y)];
    if (t.t !== 'ocean') continue;
    if (neighbors(x, y).some(([nx, ny]) => !TERRAIN[G.tiles[idx(nx, ny)].t].water)) t.t = 'coast';
  }
  // resources
  const resIds = Object.keys(RES);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = G.tiles[idx(x, y)];
    if (t.mtn || t.t === 'snow' || t.t === 'ocean') continue;
    if (rng() > (t.t === 'coast' ? 0.07 : 0.17)) continue;
    const ok = resIds.filter(r => resourceFits(r, t));
    if (ok.length) t.res = ok[Math.floor(rng() * ok.length)];
  }
  return rng;
}

function resourceFits(r, t) {
  const R = RES[r];
  const water = TERRAIN[t.t].water;
  if (R.water) return water;
  if (water || t.mtn) return false;
  if (!R.on.includes(t.t)) return false;
  if (R.flat && t.hills) return false;
  if (R.hills && !t.hills && !(R.feat && t.feat && R.feat.includes(t.feat))) return false;
  if (t.feat) { if (!R.feat || !R.feat.includes(t.feat)) return false; }
  else if (R.feat && !R.flat && !R.hills && r !== 'wine' && r !== 'cotton') {
    // feature-bound resources (silk, spices, furs, deer) need their feature
    if (['silk', 'spices', 'furs'].includes(r)) return false;
  }
  return true;
}

function startScore(x, y) {
  let s = 0;
  for (const [nx, ny] of tilesInRadius(x, y, 2)) {
    const t = G.tiles[idx(nx, ny)];
    if (t.mtn) { s += 0.5; continue; }
    const T = TERRAIN[t.t];
    s += (T.f || 0) * 1.3 + (T.p || 0) + (t.hills ? 0.8 : 0) + (t.feat === 'forest' ? 0.6 : 0);
    if (t.res) s += 1.5;
    if (T.water && t.t === 'coast') s += 0.3;
  }
  const t = G.tiles[idx(x, y)];
  if (t.t === 'desert' || t.t === 'tundra' || t.t === 'snow') s -= 8;
  if (t.hills) s += 2;
  return s;
}

function pickStarts(n, rng) {
  const { comp, sizes } = landComponents();
  let best = 0;
  for (let i = 1; i < sizes.length; i++) if (sizes[i] > sizes[best]) best = i;
  const cands = [];
  for (let i = 0; i < G.tiles.length; i++) {
    if (comp[i] !== best) continue;
    const [x, y] = xyOf(i);
    const t = G.tiles[i];
    if (t.feat === 'marsh' || t.t === 'snow') continue;
    cands.push({ x, y, s: startScore(x, y) + rng() * 3 });
  }
  cands.sort((a, b) => b.s - a.s);
  const approxLand = sizes[best];
  let minD = Math.max(6, Math.floor(Math.sqrt(approxLand / n) * 0.95));
  const picks = [];
  while (picks.length < n && minD >= 3) {
    picks.length = 0;
    for (const c of cands) {
      if (picks.every(p => hexDist(p.x, p.y, c.x, c.y) >= minD)) picks.push(c);
      if (picks.length === n) break;
    }
    if (picks.length < n) minD--;
  }
  return { picks, comp, main: best };
}
