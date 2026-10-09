// vault: prop builders (browser, TECH_PLAN 3.3). Registered types for the Memory Vault: floating
// platforms with geometry under them, hard-light bridges with thickness, data pillars, memory
// crystals and the core. Static parts merge into the World's batches; the few that move live in
// small groups and animate through W.addUpdater. Materials come from W.mats or are cached per World.
//
//   vault.islands   { }                       the whole map: a lit rim and a stepped crystal underside
//                                             under every platform (deeper toward the middle), thin
//                                             glowing slabs and rails under the permanent bridges
//   vault.bridge    gate: a hard-light bridge that draws itself out of light from `from` (x0/z0 side
//                   by default), with a slab, glowing edges and pylons; closed, a faint ghost line
//                                                                                LivingProp setOpen
//   vault.crystal   shard: a faceted memory crystal turning over a glyph ring       LivingProp setOpen
//   vault.relay     switch: a data pylon (magenta off, cyan on, its diamond spins)  LivingProp setState
//   vault.cache     chest: a data cache whose lid lifts on a seam of light           LivingProp setOpen
//   vault.pillar    { x, z, h = 3.2, r = 0.34 }   a hex column of scrolling glyphs, rings of light
//   vault.portal    { x, z }                  the neural interface: a standing ring of light (focal)
//   vault.pad       { x, z, warm = true }     the pad under a memory echo: a glyph ring and a glow
//   vault.pool      { x, z, r = 2.4, color, k = 0.45 }   a soft pool of light on the floor (reads on
//                                             every tier, whatever the real point-light pool holds)
//   vault.monolith  { x, z, rot = 0, s = 1 }  a memory slab showing a still of the voyage
//   vault.screenRig { x, z, w = 1.6, rot = 0, group }   a hologram screen on a projector stand
//                                             (the screen itself is the built-in `screen` prop)
//   vault.core      { x, z }                  the Core: broken rings of memory turning round a cracked
//                                             heart, light falling through it (focal)   LivingProp setState
//   vault.glitch    { x, z, s = 1, y = 0.6 }  a cluster of corrupted magenta voxels, jittering
//   vault.glitchMemory  { x, z }              the scrambled memory Orion can coax (a glitch on a pad)
//   vault.stream    { x, z }                  a column of falling light (the one-way stream)
//   vault.debris    { x, z, s = 1, y = -4 }   a fragment of platform drifting far below (depth)
//   vault.shaft     { x, z, h = 9, color }    light rising out of the abyss
//   vault.chairs    { x, z, n = 6 }           rows of empty hologram chairs (Agnes Pell's memorial)
//   vault.frame     { x, z, w = 2.4 }         a hologram window frame (Window 9)

import * as THREE from 'three';
import { makeGlow, makeLightShaft } from '../../core/vfx.js';
import { Batch } from '../../world/geometry.js';
import { textureSet, glowSet, setTextureFrame } from '../../art/tiles.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Seeded random in [0, 1). */
function rnd(seed) {
  let s = (Math.floor(Math.abs(seed) * 9973) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Merge `geo` into batch B at pos, Euler [rx, ry, rz] (YXZ) and scale s (number or [x, y, z]). */
function put(B, mat, geo, pos, rot = null, s = 1) {
  _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, 'YXZ');
  _q.setFromEuler(_e);
  _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, typeof s === 'number' ? _s.setScalar(s) : _s.set(s[0], s[1], s[2]));
  B.geometry(mat, geo, _m);
  geo.dispose();
}

const all = (m, top = m) => ({ front: m, back: m, left: m, right: m, top });

/** A camera-facing glow; linked glows follow the nearest virtual light (pulse, flicker). */
function glow(W, G, color, size, intensity, x, y, z, link = true) {
  const s = makeGlow(color, size, intensity);
  s.position.set(x, y, z);
  G.add(s);
  if (link) W.addGlow(s, x, z);
  return s;
}

function tintGlow(s, color, k = 1) {
  s.material.color.set(color).multiplyScalar(k);
  if (s.userData.baseColor) s.userData.baseColor.copy(s.material.color);
}

// Shared soft masks (they survive World.dispose): a smooth radial falloff for pools and halos.
let POOL = null;
function poolMask() {
  if (POOL) return POOL;
  const N = 64;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = ((x + 0.5) / N) * 2 - 1, dy = ((y + 0.5) / N) * 2 - 1;
    const d = Math.hypot(dx, dy);
    const v = d >= 1 ? 0 : (1 - d * d) ** 2;
    const i = (y * N + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = data[i + 3] = Math.round(v * 255);
  }
  POOL = new THREE.DataTexture(data, N, N);
  POOL.magFilter = THREE.LinearFilter;
  POOL.minFilter = THREE.LinearFilter;
  POOL.needsUpdate = true;
  POOL.userData.shared = true;
  return POOL;
}

/** A flat mesh lying on the floor at (x, y, z). */
function floorMesh(G, mat, x, y, z, w, d, rot = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.rotation.set(-Math.PI / 2, 0, rot);
  mesh.scale.set(w, d, 1);
  mesh.position.set(x, y, z);
  mesh.renderOrder = 1;
  G.add(mesh);
  return mesh;
}

/** Unlit additive material (beams, rings, halos). */
const additive = (color, k = 1, opacity = 1) => new THREE.MeshBasicMaterial({
  color: new THREE.Color(color).multiplyScalar(k), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
});

/** Shared lit materials of the Vault, built once per World. */
function mats(W) {
  if (W.vaultMats) return W.vaultMats;
  const M = W.mats;
  W.vaultMats = {
    edge: M.tile('va_edge', { emissive: 2.4, roughness: 0.45, metalness: 0.3, cast: false }),
    under: M.tile('va_under', { emissive: 2.0, roughness: 0.3, metalness: 0.25, cast: false }),
    bridge: M.tile('va_bridge', { emissive: 2.6, roughness: 0.3, metalness: 0.2, cast: false }),
    pillar: M.tile('va_pillar', { emissive: 2.4, roughness: 0.4, metalness: 0.3 }),
    monolith: M.tile('va_monolith', { emissive: 2.2, roughness: 0.4, metalness: 0.2 }),
    cache: M.tile('va_cache', { emissive: 2.4, roughness: 0.4, metalness: 0.35 }),
    // plinths, trims and crystal tips are textured too: merged into the batches they add up to large
    // surfaces, and visualLint wants none untextured
    dark: M.tile('va_under', { emissive: 1.2, roughness: 0.5, metalness: 0.4 }),
    trim: M.tile('va_bridge', { emissive: 2.8, roughness: 0.4, metalness: 0.5 }),
    violet: M.tile('va_core_b', { emissive: 2.6, roughness: 0.35, metalness: 0.4, cast: false }),
    rail: additive('#5fe8ff', 1.3),
  };
  return W.vaultMats;
}

// ---------------------------------------------------------------- the islands

const PLATFORM = new Set(['.', ',', ':']);
const RIM = 0.5;

/**
 * Depth of the underside at every platform cell: deeper the further a cell is from the edge, so
 * each platform hangs like an inverted, stepped crystal (the floor cells above stay flat).
 */
function undersideDepths(map) {
  const { w, h, grid } = map;
  const at = (c, r) => (r >= 0 && r < h && c >= 0 && c < w ? grid[r][c] : ' ');
  const dist = new Int16Array(w * h).fill(-1);
  const queue = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (!PLATFORM.has(at(c, r))) continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => !PLATFORM.has(at(c + dc, r + dr)));
      if (edge) { dist[r * w + c] = 1; queue.push(r * w + c); }
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q], c = i % w, r = (i - c) / w;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (!PLATFORM.has(at(nc, nr)) || dist[nr * w + nc] >= 0) continue;
      dist[nr * w + nc] = dist[i] + 1;
      queue.push(nr * w + nc);
    }
  }
  const depth = new Float32Array(w * h);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const d = dist[r * w + c];
      if (d < 0) continue;
      const jag = ((c * 7 + r * 13) % 5) * 0.12;
      depth[r * w + c] = d === 1 ? RIM : Math.min(4.2, RIM + (d - 1) * 0.75 + jag);
    }
  }
  return { depth, at };
}

const islands = {
  textures: ['va_edge', 'va_under', 'va_bridge', 'va_core_b'],
  build(W) {
    const M = mats(W), B = W.batchFor(null), G = W.groupFor(null);
    const map = W.map;
    const { depth, at } = undersideDepths(map);
    const { w, h } = map;
    const D = (c, r) => (c >= 0 && r >= 0 && c < w && r < h && PLATFORM.has(at(c, r)) ? depth[r * w + c] : 0);
    // one vertical face from y0 (top) down to y1: the rim band in va_edge, the rest in va_under
    const face = (kind, a0, a1, y0, y1, k, dir) => {
      const top = -y0, bot = -y1;
      const rimBot = Math.min(RIM, y1);
      const draw = (mat, ya, yb, uv) => {
        if (kind === 'z') B.faceZ(mat, a0, a1, ya, yb, k, dir, uv);
        else B.faceX(mat, a0, a1, ya, yb, k, dir, uv);
      };
      if (y0 < RIM) draw(M.edge, -rimBot, top, [a0, 1 - rimBot, a1, 1 - y0]);
      if (y1 > Math.max(y0, RIM)) draw(M.under, bot, -Math.max(y0, RIM), [a0, bot, a1, -Math.max(y0, RIM)]);
    };
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const ch = at(c, r);
        if (PLATFORM.has(ch)) {
          const d = depth[r * w + c];
          // only the faces the field camera can see: south, east and west
          const s = D(c, r + 1), e = D(c + 1, r), wv = D(c - 1, r);
          if (s < d) face('z', c, c + 1, s, d, r + 1, 1);
          if (e < d) face('x', r, r + 1, e, d, c + 1, 1);
          if (wv < d) face('x', r, r + 1, wv, d, c, -1);
        } else if (ch === '=') {
          // permanent bridges: a thin glowing slab and a rail of light along open sides
          const open = (cc, rr) => at(cc, rr) === ' ';
          if (open(c, r + 1)) B.faceZ(M.edge, c, c + 1, -0.24, 0, r + 1, 1, [c, 0.76, c + 1, 1]);
          if (open(c + 1, r)) B.faceX(M.edge, r, r + 1, -0.24, 0, c + 1, 1, [r, 0.76, r + 1, 1]);
          if (open(c - 1, r)) B.faceX(M.edge, r, r + 1, -0.24, 0, c, -1, [r, 0.76, r + 1, 1]);
          for (const [dc, dr] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            if (!open(c + dc, r + dr)) continue;
            const x = c + 0.5 + dc * 0.46, z = r + 0.5 + dr * 0.46;
            put(B, M.rail, new THREE.BoxGeometry(dc ? 0.05 : 1, 0.05, dr ? 0.05 : 1), [x, 0.34, z]);
            if ((c + r) % 2 === 0) put(B, M.trim, new THREE.BoxGeometry(0.07, 0.36, 0.07), [x, 0.17, z]);
          }
        }
      }
    }
    // the tips: a few glowing crystal points hanging under the deepest cells
    const r0 = rnd(17);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const d = depth[r * w + c];
        if (d < 2.6 || r0() > 0.05) continue;
        const len = 0.8 + r0() * 1.4;
        put(B, M.violet, new THREE.ConeGeometry(0.22, len, 5), [c + 0.5, -d - len / 2, r + 0.5], [Math.PI, r0() * 3, 0]);
        if (r0() < 0.4) glow(W, G, '#9a6aff', 1.2, 0.5, c + 0.5, -d - len, r + 0.5, false);
      }
    }
  },
};

// ---------------------------------------------------------------- bridges

function bridgeSpan(p) {
  let c0 = Infinity, r0 = Infinity, c1 = -Infinity, r1 = -Infinity;
  for (const [c, r] of p.cells || []) { c0 = Math.min(c0, c); r0 = Math.min(r0, r); c1 = Math.max(c1, c); r1 = Math.max(r1, r); }
  const alongX = c1 - c0 >= r1 - r0;
  return { x0: c0, x1: c1 + 1, z0: r0, z1: r1 + 1, cx: (c0 + c1 + 1) / 2, cz: (r0 + r1 + 1) / 2, alongX };
}

const bridge = {
  textures: ['va_bridge', 'va_edge'],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on);
    const s = bridgeSpan(p);
    const len = s.alongX ? s.x1 - s.x0 : s.z1 - s.z0;
    const width = s.alongX ? s.z1 - s.z0 : s.x1 - s.x0;
    // extends from the end named by `from` ('end' = x1/z1), else from x0/z0
    const flip = p.from === 'end';
    const holder = new THREE.Group();
    holder.position.set(s.alongX ? (flip ? s.x1 : s.x0) : s.cx, 0, s.alongX ? s.cz : (flip ? s.z1 : s.z0));
    if (!s.alongX) holder.rotation.y = flip ? Math.PI / 2 : -Math.PI / 2;
    else if (flip) holder.rotation.y = Math.PI;
    G.add(holder);
    // the deck: a slab of hard light 0.22 thick; local +x runs along the bridge
    const deckSet = textureSet('va_bridge', { repeat: [len, width] });
    const deckMat = new THREE.MeshStandardMaterial({
      map: deckSet.map, normalMap: deckSet.normalMap, emissiveMap: deckSet.emissiveMap, emissive: 0xffffff, emissiveIntensity: 2.6,
      roughness: 0.3, metalness: 0.2,
    });
    const sideMat = additive('#3fc8ff', 0.9, 0.85);
    const deck = new THREE.Group();
    const top = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), deckMat);
    top.rotation.x = -Math.PI / 2;
    top.position.set(0.5, 0.004, 0);
    top.scale.set(1, width, 1);
    top.receiveShadow = true;
    deck.add(top);
    for (const sd of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.22), sideMat);
      side.position.set(0.5, -0.11, sd * (width / 2));
      if (sd < 0) side.rotation.y = Math.PI;
      deck.add(side);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.05), M.rail);
      rail.position.set(0.5, 0.34, sd * (width / 2 - 0.05));
      deck.add(rail);
    }
    const under = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), additive('#2f8fff', 0.5, 0.6));
    under.rotation.x = Math.PI / 2;
    under.position.set(0.5, -0.22, 0);
    under.scale.set(1, width * 1.3, 1);
    deck.add(under);
    holder.add(deck);
    // the ghost: a dotted line of where the bridge will be, while it is closed
    const ghostMat = additive('#5fe8ff', 0.5, 0.7);
    const ghost = new THREE.Group();
    for (let x = 0.4; x < len; x += 0.6) {
      for (const sd of [-1, 1]) {
        const dot = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.06), ghostMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.set(x, 0.01, sd * (width / 2 - 0.12));
        ghost.add(dot);
      }
    }
    holder.add(ghost);
    // pylons at both ends: posts with a light that wakes as the deck draws out
    const ends = s.alongX ? [[s.x0, s.cz], [s.x1, s.cz]] : [[s.cx, s.z0], [s.cx, s.z1]];
    const glows = [];
    for (const [x, z] of ends) {
      for (const sd of [-1, 1]) {
        const px = s.alongX ? x : x + sd * (width / 2 + 0.05), pz = s.alongX ? z + sd * (width / 2 + 0.05) : z;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), M.trim);
        post.position.set(px, 0.35, pz);
        G.add(post);
        glows.push(glow(W, G, '#6fe8ff', 0.9, 0.6, px, 0.78, pz, false));
      }
    }
    let k = 0, open = false;
    const apply = () => {
      const e = 1 - (1 - k) * (1 - k) * (1 - k);
      deck.scale.x = Math.max(0.001, len * e);
      deck.visible = k > 0.002;
      for (const t of [deckSet.map, deckSet.normalMap, deckSet.emissiveMap]) if (t) t.repeat.x = Math.max(0.01, len * e);
      ghost.visible = k < 0.98;
      ghostMat.opacity = 0.7 * (1 - k);
      for (const g of glows) tintGlow(g, open ? '#7ff4ff' : '#3a6a9a', 0.45 + k * 0.55);
    };
    apply();
    let t0 = 0;
    W.addUpdater((dt, t) => {
      t0 = t;
      const target = open ? 1 : 0;
      if (k !== target) {
        k = target > k ? Math.min(1, k + dt / 0.9) : Math.max(0, k - dt / 0.6);
        apply();
      }
      if (!open && ghost.visible) ghostMat.opacity = (0.45 + 0.25 * Math.sin(t * 2.4)) * (1 - k);
    });
    return {
      kind: 'gate.bridge',
      get open() { return open; },
      setOpen(v, instant = false) {
        const was = open;
        open = !!v;
        if (instant) k = open ? 1 : 0;
        else if (was !== open && W.onSound) W.onSound(open ? 'laser_on' : 'laser_off', { volume: 0.8, pitch: 1.2 });
        apply();
        if (t0 < 0) t0 = 0;
      },
    };
  },
};

// ---------------------------------------------------------------- the memory crystals

const crystal = {
  textures: ['va_glyph'],
  build(W, p) {
    const G = W.groupFor(p.on);
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    G.add(g);
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshStandardMaterial({
      color: '#9fe6ff', roughness: 0.08, metalness: 0.1, emissive: '#3fd6ff', emissiveIntensity: 0.9, flatShading: true,
      transparent: true,
    }));
    body.scale.set(0.8, 1.7, 0.8);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), additive('#e6fbff', 1.1));
    core.scale.set(0.8, 1.7, 0.8);
    const spin = new THREE.Group();
    spin.add(body, core);
    g.add(spin);
    // a ring of light on the floor and a glyph under it
    const glyphSet = glowSet('va_glyph');
    const glyph = floorMesh(g, new THREE.MeshBasicMaterial({
      map: glyphSet.map, color: new THREE.Color(0.55, 0.95, 1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }), 0, 0.02, 0, 2.2, 2.2);
    const halo = glow(W, g, '#5fe8ff', 1.4, 0.45, 0, 1.25, 0, false);
    const em = W.addEmitter('data', { position: [p.x, 0.5, p.z], area: [0.9, 0.2, 0.9], rate: 5 }, p.on);
    const phase = (p.x * 1.7 + p.z) % 6.28;
    let gone = 0, taken = false;
    return {
      kind: 'shard',
      collected: false,
      object: g,
      setOpen(open, instant = false) {
        const was = taken;
        taken = this.collected = !!open;
        if (em) em.active = !taken;
        if (instant) { gone = taken ? 1 : 0; g.visible = !taken; return; }
        if (taken && !was && W.particles) W.particles.emit('data', [p.x, 1.2, p.z], { count: 50 });
      },
      update(dt, t) {
        const target = taken ? 1 : 0;
        if (gone !== target) gone = target ? Math.min(1, gone + dt / 0.8) : Math.max(0, gone - dt / 0.8);
        g.visible = gone < 1;
        spin.position.y = 1.25 + Math.sin(t * 1.6 + phase) * 0.08 + gone * 1.2;
        spin.rotation.y = t * 0.9 + phase;
        body.material.opacity = 1 - gone;
        glyph.material.opacity = (0.75 + 0.25 * Math.sin(t * 2.2 + phase)) * (1 - gone);
        glyph.rotation.z = -t * 0.15;
        halo.position.y = spin.position.y;
        halo.material.opacity = 1 - gone;
      },
    };
  },
};

// ---------------------------------------------------------------- switches and caches

const relay = {
  textures: ['va_relay'],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on), B = W.batchFor(p.on);
    const set = textureSet('va_relay');
    const face = new THREE.MeshStandardMaterial({
      map: set.map, normalMap: set.normalMap, emissiveMap: set.emissiveMap, emissive: 0xffffff, emissiveIntensity: 2.4, roughness: 0.4, metalness: 0.3,
    });
    face.userData.set = set;
    // a slim pylon: dark sides, the readout face toward the camera, a base ring of trim
    B.box({ left: M.dark, right: M.dark, back: M.dark, top: M.trim }, p.x, p.z, 0.42, 0.32, 0, 1.15, 0);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.92), face);
    front.position.set(p.x, 0.58, p.z + 0.162);
    G.add(front);
    B.box(all(M.trim), p.x, p.z, 0.6, 0.5, 0, 0.08, 0);
    W.addBox(p.x, p.z, 0.5, 0.4);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), new THREE.MeshStandardMaterial({
      color: '#ffffff', emissive: '#ff4fd0', emissiveIntensity: 2.2, roughness: 0.2, flatShading: true,
    }));
    gem.position.set(p.x, 1.45, p.z);
    G.add(gem);
    const halo = glow(W, G, '#ff4fd0', 1.1, 0.7, p.x, 1.45, p.z, false);
    let on = false, spin = 0;
    const show = () => {
      setTextureFrame(set, on ? 1 : 0);
      gem.material.emissive.set(on ? '#4fe3ff' : '#ff4fd0');
      tintGlow(halo, on ? '#4fe3ff' : '#ff4fd0', on ? 0.9 : 0.6);
    };
    show();
    return {
      kind: 'switch',
      setState(v) { on = !!v; show(); },
      setOpen(v) { on = !!v; show(); },
      update(dt, t) {
        spin += dt * (on ? 2.4 : 0.6);
        gem.rotation.y = spin;
        gem.position.y = 1.45 + Math.sin(t * 2 + p.x) * 0.05;
        halo.position.y = gem.position.y;
      },
    };
  },
};

const cache = {
  textures: ['va_cache'],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on);
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.rot || 0;
    G.add(g);
    const B = new Batch();
    B.box({ ...all(M.cache), top: M.dark }, 0, 0, 0.74, 0.62, 0, 0.42, 0, { front: [0, 0, 1, 0.55], back: [0, 0, 1, 0.55], left: [0, 0, 1, 0.55], right: [0, 0, 1, 0.55] });
    for (const m of B.build(g)) { m.matrixAutoUpdate = true; }
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.42, -0.31);
    g.add(hinge);
    const LB = new Batch();
    LB.box({ ...all(M.cache), top: M.trim }, 0, 0.31, 0.76, 0.64, 0, 0.18, 0, { front: [0, 0.45, 1, 1], back: [0, 0.45, 1, 1], left: [0, 0.45, 1, 1], right: [0, 0.45, 1, 1] });
    for (const m of LB.build(hinge)) { m.matrixAutoUpdate = true; }
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.03), additive('#5fe8ff', 1.4));
    seam.position.set(0, 0.43, 0.315);
    g.add(seam);
    const light = glow(W, g, '#ffc85a', 1.0, 0.0, 0, 0.6, 0, false);
    W.addBox(p.x, p.z, 0.8, 0.7);
    let lid = 0, opened = false;
    const living = {
      kind: 'chest',
      opened: false,
      setOpen(v, instant = false) {
        opened = living.opened = !!v;
        seam.visible = !opened;
        if (instant) lid = opened ? 1 : 0;
        hinge.rotation.x = -1.9 * lid;
      },
      update(dt, t) {
        const target = opened ? 1 : 0;
        if (lid !== target) {
          lid = target ? Math.min(1, lid + dt * 2.2) : Math.max(0, lid - dt * 2.2);
          hinge.rotation.x = -1.9 * (1 - (1 - lid) ** 3);
        }
        light.material.opacity = opened ? Math.max(0, 1 - lid * 0.6) : 0.6 + 0.2 * Math.sin(t * 3 + p.x);
        tintGlow(light, opened ? '#5fe8ff' : '#ffc85a', opened ? 0.25 : 0.5);
      },
    };
    return living;
  },
};

// ---------------------------------------------------------------- set pieces

const pillar = {
  textures: ['va_pillar'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const h = p.h ?? 3.2, r = p.r ?? 0.34;
    // a hex column of scrolling glyphs on a plinth, its top cut at an angle
    const geo = new THREE.CylinderGeometry(r, r * 1.06, h, 6, 1, true);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * (h / 3));
    put(B, M.pillar, geo, [p.x, h / 2 + 0.2, p.z], [0, Math.PI / 6, 0]);
    put(B, M.dark, new THREE.CylinderGeometry(r * 1.5, r * 1.7, 0.2, 6), [p.x, 0.1, p.z], [0, Math.PI / 6, 0]);
    put(B, M.trim, new THREE.CylinderGeometry(r * 0.9, r, 0.12, 6), [p.x, h + 0.26, p.z], [0, Math.PI / 6, 0]);
    W.addCircle(p.x, p.z, r * 1.5);
    // two rings of light turning round it at different heights
    const rings = [0.38, 0.72].map((f, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 2.1, 0.025, 4, 28), additive(i ? '#a77aff' : '#4fe3ff', 1.4));
      ring.position.set(p.x, h * f, p.z);
      ring.rotation.x = Math.PI / 2 + (i ? 0.3 : -0.25);
      G.add(ring);
      return ring;
    });
    glow(W, G, '#4fe3ff', 1.6, 0.8, p.x, h + 0.5, p.z, false);
    const ph = p.x * 0.7;
    W.addUpdater((dt, t) => {
      rings[0].rotation.z = t * 0.6 + ph;
      rings[1].rotation.z = -t * 0.45 + ph;
      rings[0].position.y = h * 0.38 + Math.sin(t * 0.9 + ph) * 0.12;
      rings[1].position.y = h * 0.72 + Math.sin(t * 0.7 + ph + 1) * 0.12;
    });
  },
};

const portal = {
  textures: ['va_portal', 'va_edge', 'va_field_b', 'va_bridge'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    // a dais of two stepped discs, the ring standing on it, light falling through the middle
    put(B, M.edge, new THREE.CylinderGeometry(1.7, 1.9, 0.16, 24), [p.x, 0.08, p.z]);
    put(B, W.mats.tile('va_field_b', { emissive: 2.4, roughness: 0.4, metalness: 0.25, cast: false }), new THREE.CylinderGeometry(1.25, 1.3, 0.08, 24), [p.x, 0.2, p.z]);
    put(B, M.trim, new THREE.TorusGeometry(1.28, 0.03, 4, 40), [p.x, 0.245, p.z], [Math.PI / 2, 0, 0]);
    const set = glowSet('va_portal');
    const ringMat = new THREE.MeshBasicMaterial({ map: set.map, color: new THREE.Color(0.55, 0.7, 0.82), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), ringMat);
    ring.position.set(p.x, 1.75, p.z - 0.3);
    G.add(ring);
    // the ring's frame wears the bridge trim (3.6 sq units: visualLint wants it textured)
    const torus = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.07, 6, 40), M.trim);
    torus.position.copy(ring.position);
    G.add(torus);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.03, 4, 32), additive('#a77aff', 1.6));
    inner.position.copy(ring.position);
    G.add(inner);
    const shaft = makeLightShaft({ width: 1.1, height: 6, color: '#7fefff', opacity: 0.1, spread: 1.2, floorY: 0 });
    shaft.position.set(p.x, 6.2, p.z);
    G.add(shaft);
    glow(W, G, '#7ff4ff', 2.4, 0.4, p.x, 1.75, p.z - 0.2, false);
    W.addCircle(p.x, p.z - 0.3, 0.9);
    W.addEmitter('data', { position: [p.x, 0.3, p.z], area: [2.2, 0.2, 1.6], rate: 12 }, p.on);
    W.addUpdater((dt, t) => {
      ring.rotation.z = t * 0.25;
      inner.rotation.x = Math.sin(t * 0.6) * 0.5;
      inner.rotation.y = t * 0.8;
      torus.rotation.y = Math.sin(t * 0.4) * 0.12;
      ringMat.opacity = 0.85 + 0.15 * Math.sin(t * 2.3);
    });
  },
};

const pad = {
  textures: ['va_glyph'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const warm = p.warm !== false;
    put(B, M.dark, new THREE.CylinderGeometry(0.62, 0.68, 0.08, 18), [p.x, 0.04, p.z]);
    const set = glowSet('va_glyph');
    const mat = new THREE.MeshBasicMaterial({
      map: set.map, color: warm ? new THREE.Color(1.2, 0.95, 0.6) : new THREE.Color(0.55, 0.95, 1.3), transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    const ring = floorMesh(G, mat, p.x, 0.09, p.z, 1.6, 1.6);
    glow(W, G, warm ? '#ffcf6a' : '#5fe8ff', 1.2, 0.45, p.x, 0.25, p.z, false);
    W.addEmitter('mote', { position: [p.x, 0.3, p.z], area: [0.8, 0.2, 0.8], rate: 1.2 }, p.on);
    W.addUpdater((dt, t) => { ring.rotation.z = t * 0.2 + p.x; });
  },
};

const pool = {
  build(W, p) {
    const G = W.groupFor(p.on);
    const r = p.r || 2.4;
    const mat = new THREE.MeshBasicMaterial({
      map: poolMask(), color: new THREE.Color(p.color || '#4fe3ff').multiplyScalar(p.k ?? 0.45), transparent: true,
      depthWrite: false, fog: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    });
    floorMesh(G, mat, p.x, p.y ?? 0.02, p.z, r * 2 * (p.sx || 1), r * 2 * (p.sz || 1), p.rot || 0);
  },
};

const monolith = {
  textures: ['va_monolith'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const s = p.s || 1, rot = p.rot || 0;
    const geo = new THREE.BoxGeometry(1.1 * s, 2.7 * s, 0.26 * s);
    put(B, M.monolith, geo, [p.x, 1.35 * s + 0.15, p.z], [0, rot, p.lean || 0]);
    put(B, M.dark, new THREE.BoxGeometry(1.4 * s, 0.15, 0.5 * s), [p.x, 0.075, p.z], [0, rot, 0]);
    W.addBox(p.x, p.z, 1.2 * s, 0.5 * s);
    glow(W, G, '#a77aff', 1.4, 0.4, p.x, 0.3, p.z + 0.3, false);
  },
};

const screenRig = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const w = p.w || 1.6, rot = p.rot || 0;
    // a projector stand: a short post, an emitter head, a cone of light up to the screen
    put(B, M.dark, new THREE.CylinderGeometry(0.06, 0.09, 0.9, 6), [p.x, 0.45, p.z]);
    put(B, M.trim, new THREE.BoxGeometry(0.34, 0.08, 0.2), [p.x, 0.92, p.z], [0, rot, 0]);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(w * 0.48, 0.7, 4, 1, true), additive('#4fe3ff', 0.35, 0.5));
    cone.position.set(p.x, 1.3, p.z);
    cone.rotation.y = Math.PI / 4 + rot;
    G.add(cone);
  },
};

const core = {
  textures: ['va_edge', 'va_core_b'],
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    const y = p.y ?? 3.4;
    // a raised dais the heart hangs over
    put(B, M.edge, new THREE.CylinderGeometry(3.0, 3.3, 0.24, 32), [p.x, 0.12, p.z]);
    put(B, W.mats.tile('va_core_b', { emissive: 2.4, roughness: 0.4, metalness: 0.3, cast: false }), new THREE.CylinderGeometry(2.4, 2.5, 0.06, 32), [p.x, 0.27, p.z]);
    put(B, M.trim, new THREE.TorusGeometry(1.65, 0.04, 4, 48), [p.x, 0.31, p.z], [Math.PI / 2, 0, 0]);
    put(B, M.trim, new THREE.TorusGeometry(2.45, 0.03, 4, 48), [p.x, 0.31, p.z], [Math.PI / 2, 0, 0]);
    const heart = new THREE.Group();
    heart.position.set(p.x, y, p.z - 0.6);
    G.add(heart);
    // the heart: an icosahedron of memory, cracked with magenta
    const skin = textureSet('va_core_b', { repeat: [1, 1] });
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), new THREE.MeshStandardMaterial({
      map: skin.map, emissiveMap: skin.emissiveMap, color: '#8a9cff', emissive: '#ffffff', emissiveIntensity: 1.6,
      roughness: 0.15, metalness: 0.5, flatShading: true,
    }));
    const crack = new THREE.Mesh(new THREE.IcosahedronGeometry(1.02, 1), new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff4fd0').multiplyScalar(1.6), wireframe: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), additive('#ffe0ff', 1.4));
    heart.add(shell, crack, inner);
    // broken rings of memory turning on three axes
    const rings = [[2.0, '#4fe3ff', 0.06], [2.6, '#a77aff', 0.05], [3.2, '#ff4fd0', 0.04]].map(([r, c, th], i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, th, 5, 48, Math.PI * (1.55 - i * 0.12)), additive(c, 1.3));
      heart.add(ring);
      return ring;
    });
    const shaft = makeLightShaft({ width: 2.2, height: 9, color: '#c8a0ff', opacity: 0.14, spread: 1.3, floorY: 0 });
    shaft.position.set(p.x, 10, p.z - 0.6);
    G.add(shaft);
    const halo = glow(W, G, '#ff7fe0', 5.0, 0.55, p.x, y, p.z - 0.4, false);
    W.addEmitter('glitch', { position: [p.x, y, p.z - 0.6], area: [2.4, 2.4, 1.0], rate: 3, burst: 8 }, p.on);
    W.addEmitter('data', { position: [p.x, 0.4, p.z], area: [4.6, 0.3, 3.0], rate: 10 }, p.on);
    // whole again once HALCYON is restored (a revisit after Echo)
    let calm = W.test('story:halcyon_restored') ? 1 : 0, calmTarget = calm;
    W.addUpdater((dt, t) => {
      calm += (calmTarget - calm) * Math.min(1, dt * 1.5);
      heart.position.y = y + Math.sin(t * 0.8) * 0.12;
      rings[0].rotation.set(t * 0.31, t * 0.17, 0);
      rings[1].rotation.set(-t * 0.21, 0.6, t * 0.27);
      rings[2].rotation.set(1.2, -t * 0.13, -t * 0.19);
      shell.rotation.set(t * 0.2, t * 0.33, 0);
      inner.rotation.set(-t * 0.4, t * 0.2, 0);
      const jit = (1 - calm) * (Math.sin(t * 37) > 0.93 ? 0.08 : 0);
      crack.position.set(jit, -jit, 0);
      crack.material.opacity = 0.55 * (1 - calm) + 0.05;
      crack.material.color.set(calm > 0.5 ? '#7ff4ff' : '#ff4fd0').multiplyScalar(1.6);
      tintGlow(halo, calm > 0.5 ? '#7ff4ff' : '#ff7fe0', 0.55);
    });
    return {
      kind: 'core',
      // calm (true) after Echo: the magenta cracks fade and the light turns to HALCYON's cyan
      setState(v, instant = false) { calmTarget = v ? 1 : 0; if (instant) calm = calmTarget; },
    };
  },
};

const glitchVoxels = {
  build(W, p) {
    const G = W.groupFor(p.on);
    const s = p.s || 1, r = rnd(p.x * 13 + p.z * 7);
    const g = new THREE.Group();
    g.position.set(p.x, p.y ?? 0.6, p.z);
    G.add(g);
    const matA = new THREE.MeshStandardMaterial({ color: '#3a0a30', emissive: '#ff3fc8', emissiveIntensity: 1.8, roughness: 0.3, flatShading: true });
    const matB = new THREE.MeshStandardMaterial({ color: '#0a2a3a', emissive: '#4fe3ff', emissiveIntensity: 1.4, roughness: 0.3, flatShading: true });
    const cubes = [];
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), i % 4 === 3 ? matB : matA);
      const k = (0.08 + r() * 0.16) * s;
      c.scale.setScalar(k);
      c.position.set((r() - 0.5) * 0.8 * s, (r() - 0.3) * 0.7 * s, (r() - 0.5) * 0.5 * s);
      c.userData.home = c.position.clone();
      g.add(c);
      cubes.push(c);
    }
    glow(W, G, '#ff4fd0', 1.3 * s, 0.5, p.x, (p.y ?? 0.6), p.z, false);
    W.addEmitter('glitch', { position: [p.x, p.y ?? 0.6, p.z], area: [0.6 * s, 0.6 * s, 0.4 * s], rate: 0.6, burst: 6 }, p.on);
    W.addUpdater((dt, t) => {
      const snap = Math.floor(t * 6);
      cubes.forEach((c, i) => {
        const j = Math.sin(snap * 12.9 + i * 78.2) > 0.6 ? 0.06 : 0;
        c.position.set(c.userData.home.x + j, c.userData.home.y + Math.sin(t * 1.3 + i) * 0.04, c.userData.home.z);
      });
    });
  },
};

const glitchMemory = {
  build(W, p) {
    pad.build(W, { ...p, warm: false });
    glitchVoxels.build(W, { ...p, y: 0.9, s: 0.8 });
  },
};

const stream = {
  build(W, p) {
    const M = mats(W), B = W.batchFor(p.on), G = W.groupFor(p.on);
    put(B, M.trim, new THREE.CylinderGeometry(0.75, 0.8, 0.06, 24), [p.x, 0.03, p.z]);
    const shaft = makeLightShaft({ width: 0.9, height: 7, color: '#bff6ff', opacity: 0.22, spread: 1.0, floorY: 0 });
    shaft.position.set(p.x, 7, p.z);
    G.add(shaft);
    glow(W, G, '#7ff4ff', 1.8, 0.6, p.x, 0.4, p.z, false);
    W.addEmitter('light_stream', { position: [p.x, 3.5, p.z], area: [0.6, 3, 0.6], rate: 5 }, p.on);
  },
};

const debris = {
  textures: ['va_edge', 'va_under'],
  build(W, p) {
    const M = mats(W), G = W.groupFor(p.on);
    const s = p.s || 1, r = rnd(p.x * 3 + p.z * 11);
    const g = new THREE.Group();
    g.position.set(p.x, p.y ?? -4, p.z);
    g.rotation.y = r() * Math.PI;
    G.add(g);
    const B = new Batch();
    const w = (1.2 + r() * 1.4) * s, d = (1.0 + r() * 1.2) * s;
    B.box({ ...all(M.edge), top: W.mats.tile('va_grid', { emissive: 2.0, cast: false }) }, 0, 0, w, d, -0.4 * s, 0, 0);
    for (const m of B.build(g)) m.matrixAutoUpdate = true;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, d) * 0.55, 1.6 * s, 5), M.under);
    tip.position.y = -0.4 * s - 0.8 * s;
    tip.rotation.x = Math.PI;
    g.add(tip);
    const ph = r() * 6;
    W.addUpdater((dt, t) => {
      g.position.y = (p.y ?? -4) + Math.sin(t * 0.35 + ph) * 0.25;
      g.rotation.y += dt * 0.03;
    });
  },
};

const shaft = {
  build(W, p) {
    const G = W.groupFor(p.on);
    const s = makeLightShaft({ width: p.w || 1.4, height: p.h ?? 9, color: p.color || '#8f7aff', opacity: p.opacity ?? 0.12, spread: 1.5, floorY: -12, floorFade: 3 });
    s.position.set(p.x, (p.y ?? -1), p.z);
    s.rotation.set(Math.PI, 0, 0);
    G.add(s);
  },
};

const chairs = {
  build(W, p) {
    const G = W.groupFor(p.on);
    const mat = additive('#ffcf6a', 0.55, 0.8);
    const n = p.n || 6;
    for (let i = 0; i < n; i++) {
      const x = p.x + ((i % 3) - 1) * 0.9, z = p.z + Math.floor(i / 3) * 0.9;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.42), mat);
      seat.position.set(x, 0.45, z);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.04), mat);
      back.position.set(x, 0.7, z - 0.2);
      G.add(seat, back);
      for (const [dx, dz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.03), mat);
        leg.position.set(x + dx, 0.225, z + dz);
        G.add(leg);
      }
    }
  },
};

const frame = {
  build(W, p) {
    const G = W.groupFor(p.on);
    const w = p.w || 2.4;
    const mat = additive('#ffcf6a', 0.9);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, 1.5), additive('#3a2a6a', 0.6, 0.6));
    glass.position.set(p.x, 1.55, p.z);
    G.add(glass);
    for (const [x, y, ww, hh] of [[0, 2.35, w, 0.08], [0, 0.75, w, 0.08], [-w / 2, 1.55, 0.08, 1.6], [w / 2, 1.55, 0.08, 1.6], [0, 1.55, 0.05, 1.5]]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(ww, hh), mat);
      bar.position.set(p.x + x, y, p.z + 0.01);
      G.add(bar);
    }
    // the view through it: Tethys's limb in amber and a scatter of stars
    const tethys = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24, 0, Math.PI), additive('#ff9a4a', 0.55));
    tethys.position.set(p.x + 0.4, 0.82, p.z + 0.005);
    G.add(tethys);
    glow(W, G, '#ffcf6a', 2.4, 0.35, p.x, 1.55, p.z + 0.2, false);
  },
};

export default {
  'vault.islands': islands,
  'vault.bridge': bridge,
  'vault.crystal': crystal,
  'vault.relay': relay,
  'vault.cache': cache,
  'vault.pillar': pillar,
  'vault.portal': portal,
  'vault.pad': pad,
  'vault.pool': pool,
  'vault.monolith': monolith,
  'vault.screenRig': screenRig,
  'vault.core': core,
  'vault.glitch': glitchVoxels,
  'vault.glitchMemory': glitchMemory,
  'vault.stream': stream,
  'vault.debris': debris,
  'vault.shaft': shaft,
  'vault.chairs': chairs,
  'vault.frame': frame,
};
