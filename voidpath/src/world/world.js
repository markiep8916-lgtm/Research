// The field diorama: builds the ISV Halcyon map (merged pixel-textured geometry, dividers that sink
// into cutaway walls, sliding doors, windows onto space with light shafts), owns props, lights and
// particles, answers collision / area queries and animates everything per frame.

import * as THREE from 'three';
import { Particles } from '../core/particles.js';
import { makeLightShaft } from '../core/vfx.js';
import { textureSet } from '../art/tiles.js';
import { clamp, ease } from '../core/util.js';
import { Batch, Materials } from './geometry.js';
import { Lighting } from './lighting.js';
import { buildProps } from './props.js';
import {
  MAP, MAP_W, MAP_H, WALL_CHARS, FLOOR_CHARS, DOOR_CHARS, WALL_H, LOW_H, GRAND, DIVIDERS, AREAS, LIGHTS, AMBIENT,
} from './maps.js';

const VOID = 0, FLOOR = 1, DOOR = 2, WALL = 3;
const DOOR_OPEN_R = 1.9, DOOR_CLOSE_R = 2.4;
const DIVIDER_TIME = 0.5;

/** Deterministic per-cell hash in [0, 1). */
function hash(c, r, s = 0) {
  let h = (c * 374761393 + r * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Push circle p (radius r) out of rect [x0,x1]x[z0,z1]. */
function pushOutRect(p, r, x0, z0, x1, z1) {
  const cx = clamp(p.x, x0, x1), cz = clamp(p.z, z0, z1);
  let dx = p.x - cx, dz = p.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2), k = (r - d) / d;
    p.x += dx * k;
    p.z += dz * k;
  } else {
    // centre inside the rect: leave through the nearest side
    const l = p.x - x0, rr = x1 - p.x, t = p.z - z0, b = z1 - p.z;
    const m = Math.min(l, rr, t, b);
    if (m === l) p.x = x0 - r; else if (m === rr) p.x = x1 + r; else if (m === t) p.z = z0 - r; else p.z = z1 + r;
  }
  return true;
}

export class World {
  constructor({ engine, onSound = null }) {
    this.engine = engine;
    this.onSound = onSound;
    this.scene = new THREE.Scene();
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.mats = new Materials();
    this.boxes = [];
    this.circles = [];
    this.glows = [];
    this.emitters = [];
    this.actors = [];
    this.updaters = [];
    this.interactables = [];
    this.crates = [];
    this.npcs = {};
    this.doors = [];
    this.shafts = [];
    this.spaces = [];
    this.alarm = null;
    this.reactor = null;
    this.boss = null;
    this._emitT = 0;

    this._parse();
    this._initDividers();
    this.particles = new Particles(this.scene, { max: engine.quality === 'low' ? 1400 : 2600 });
    this._staticBatch = new Batch();
    this._buildCells();
    this._buildDoors();
    this._buildSpace();
    buildProps(this);
    this._staticBatch.build(this.root);
    for (const d of this.dividers) d.batch.build(d.group);
    this._buildAmbient();
    // pre-simulate a few seconds so dust, steam and embers are already in the air
    for (let i = 0; i < 90; i++) this.particles.update(0.1);

    this.lighting = new Lighting(this.scene, LIGHTS, { quality: engine.quality, mood: AREAS[0].mood });
    this.lighting.linkGlows(this.glows);
    this.lighting.alarm = this.alarm;
    this.doorLight = this.lighting.byTag('doorLight');
    this.root.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------------ grid

  _parse() {
    const n = MAP_W * MAP_H;
    this.kind = new Uint8Array(n);
    this.chars = new Array(n);
    this.height = new Float32Array(n);
    this.div = new Int8Array(n).fill(-1);
    this.doorAt = new Int16Array(n).fill(-1);
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const ch = MAP[r][c];
        const i = r * MAP_W + c;
        this.chars[i] = ch;
        this.kind[i] = ch === ' ' ? VOID : FLOOR_CHARS[ch] ? FLOOR : DOOR_CHARS[ch] ? DOOR : WALL;
      }
    }
    // wall heights: room to the south -> full, room to the north -> cutaway, side walls full
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const i = r * MAP_W + c;
        if (this.kind[i] !== WALL) continue;
        let h;
        if (this.open(c, r + 1)) h = WALL_H;
        else if (this.open(c, r - 1)) h = LOW_H;
        else if (this.open(c - 1, r) || this.open(c + 1, r)) h = WALL_H;
        else if (this.open(c - 1, r + 1) || this.open(c + 1, r + 1)) h = WALL_H;
        else if (this.open(c - 1, r - 1) || this.open(c + 1, r - 1)) h = LOW_H;
        else h = WALL_H;
        this.height[i] = h;
      }
    }
    for (let c = GRAND.c0; c <= GRAND.c1; c++) {
      const i = GRAND.row * MAP_W + c;
      if (this.kind[i] === WALL) this.height[i] = GRAND.height;
    }
    // divider groups: the shared row (forced full height, doors included) plus every full-height
    // wall inside the rect; cutaway walls stay put
    DIVIDERS.forEach((d, k) => {
      const [c0, r0, c1, r1] = d.rect;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const i = r * MAP_W + c;
          const kind = this.kind[i];
          if (r === d.row && (kind === WALL || kind === DOOR)) {
            this.div[i] = k;
            if (kind === WALL) this.height[i] = WALL_H;
          } else if (kind === WALL && this.height[i] === WALL_H) this.div[i] = k;
        }
      }
    });
  }

  inside(c, r) { return c >= 0 && r >= 0 && c < MAP_W && r < MAP_H; }
  k(c, r) { return this.inside(c, r) ? this.kind[r * MAP_W + c] : VOID; }
  open(c, r) { const k = this.k(c, r); return k === FLOOR || k === DOOR; }
  ch(c, r) { return this.inside(c, r) ? this.chars[r * MAP_W + c] : ' '; }

  /** Movement blocker: walls, void and doors that are not open yet. */
  solid(c, r) {
    const k = this.k(c, r);
    if (k === FLOOR) return false;
    if (k === DOOR) return this.doors[this.doorAt[r * MAP_W + c]].open < 0.8;
    return true;
  }

  // ------------------------------------------------------------------ dividers

  _initDividers() {
    this.offsets = {};
    this.dividers = DIVIDERS.map((d) => {
      const group = new THREE.Group();
      this.root.add(group);
      this.offsets[d.id] = 0;
      return { ...d, group, batch: new Batch(), k: 0 };
    });
  }

  batchFor(on) {
    if (!on) return this._staticBatch;
    return this.dividers.find((d) => d.id === on).batch;
  }

  groupFor(on) {
    if (!on) return this.root;
    return this.dividers.find((d) => d.id === on).group;
  }

  _updateDividers(dt, pz, snap) {
    for (const d of this.dividers) {
      const down = pz < d.row + 0.5 ? 1 : 0;
      d.k = snap ? down : clamp(d.k + (down ? dt : -dt) / DIVIDER_TIME, 0, 1);
      const y = -(WALL_H - LOW_H) * ease.inOutCubic(d.k);
      if (d.group.position.y !== y) {
        d.group.position.y = y;
        this.offsets[d.id] = y;
      }
    }
  }

  // ------------------------------------------------------------------ static geometry

  _wallMat(name, c) {
    const M = this.mats;
    if (name === 'wall_panel_screen') return M.tile(name, { variant: c % 2, emissive: 2.3, roughness: 0.7 });
    if (name === 'window_frame') {
      const m = M.tile(name, { transparent: true, alphaTest: 0.02, emissive: 1.6, roughness: 0.4, metalness: 0.3, receive: false });
      if (!m.userData.depthMat) {
        m.userData.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: m.map, alphaTest: 0.5 });
      }
      return m;
    }
    return M.tile(name, { emissive: 2.2, roughness: 0.78, metalness: 0.24 });
  }

  _buildCells() {
    const M = this.mats;
    const S = this._staticBatch;
    const cap = M.tile('wall_cap', { roughness: 0.85, cast: false });
    const low = M.tile('wall_low', { roughness: 0.7, emissive: 2.0 });
    const panel = this._wallMat('wall_panel', 0);
    // Rooms lit only through their windows get a shadow-only ceiling. Its quads face down, so the
    // camera (always above) culls them for free, while shadowSide makes them opaque to the key light.
    const ceilMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    ceilMat.shadowSide = THREE.BackSide;
    const ceiling = new Batch();
    const ceilingAreas = AREAS.filter((a) => a.ceiling);
    const ceilingAt = (x, z) => ceilingAreas.find((a) => x >= a.rect[0] - 1 && x <= a.rect[2] + 1 && z >= a.rect[1] - 1 && z <= a.rect[3] + 1);
    for (const a of ceilingAreas) {
      const top = a.ceilingY || WALL_H + 0.05;
      if (top <= WALL_H + 0.05) continue;
      // a tall room's west wall stops at WALL_H: close the gap above it toward the light
      const occ = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
      occ.shadowSide = THREE.FrontSide;
      ceiling.faceX(occ, a.rect[1] - 1, a.rect[3], WALL_H, top, a.rect[0] - 1, -1);
    }
    const grime = M.decal('decal_grime'), oil = M.decal('decal_oil');

    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const i = r * MAP_W + c;
        const kind = this.kind[i];
        if (kind === FLOOR || kind === DOOR) {
          this._floorCell(S, c, r);
          const ca = ceilingAt(c + 0.5, r + 0.5);
          if (ca) ceiling.faceY(ceilMat, c, c + 1, r, r + 1, ca.ceilingY || WALL_H + 0.05, null, 0, -1);
          // scattered grime keeps plates from repeating
          const ch = this.chars[i];
          if (kind === FLOOR && ch !== 'c' && ch !== 'b' && ch !== 'h') {
            const h = hash(c, r, 3);
            if (h < 0.07) S.faceY(h < 0.05 ? grime : oil, c, c + 1, r, r + 1, 0.005, null, Math.floor(hash(c, r, 5) * 4));
          }
          continue;
        }
        if (kind !== WALL) continue;
        const h = this.height[i];
        // walls of window-lit rooms sit under the shadow ceiling too (windows stay open to the light)
        const cw = this.chars[i] !== 'W' && ceilingAt(c + 0.5, r + 0.5);
        if (cw) ceiling.faceY(ceilMat, c, c + 1, r, r + 1, Math.max(h, cw.ceilingY || WALL_H) + 0.05, null, 0, -1);
        const dv = this.div[i];
        const B = dv >= 0 ? this.dividers[dv].batch : S;
        const ch = this.chars[i];
        const tall = h >= WALL_H;

        // front (+z)
        const sk = this.k(c, r + 1);
        if (sk !== WALL) {
          if (ch === 'W') {
            if (this._windowStart(c, r)) {
              for (let y = 0; y < h - 0.01; y += WALL_H) B.faceZ(this._wallMat('window_frame', c), c, c + 2, y, y + WALL_H, r + 1, 1);
            }
          } else if (tall) {
            const name = sk === VOID ? 'wall_panel' : WALL_CHARS[ch];
            B.faceZ(this._wallMat(name, c), c, c + 1, 0, WALL_H, r + 1, 1);
            if (h > WALL_H) B.faceZ(this._wallMat('wall_panel_vent', c), c, c + 1, WALL_H, h, r + 1, 1);
          } else {
            B.faceZ(low, c, c + 1, 0, h, r + 1, 1);
          }
        } else {
          this._exposed(B, panel, c, r, h, dv, c, r + 1, 'z');
        }
        // sides
        for (const dir of [-1, 1]) {
          const nc = c + dir;
          const nk = this.k(nc, r);
          const x = dir > 0 ? c + 1 : c;
          if (nk !== WALL) {
            if (tall) B.faceX(panel, r, r + 1, 0, h, x, dir, [0, 0, 1, h / WALL_H]);
            else B.faceX(low, r, r + 1, 0, h, x, dir);
          } else {
            this._exposed(B, panel, c, r, h, dv, nc, r, dir > 0 ? 'x+' : 'x-');
          }
        }
        B.faceY(cap, c, c + 1, r, r + 1, h);
      }
    }
    for (const m of ceiling.build(this.root)) {
      m.castShadow = true;
      m.receiveShadow = false;
      m.frustumCulled = false; // the shadow camera needs it even when the view does not
    }
  }

  _windowStart(c, r) {
    // windows come in pairs: a 'W' starts a frame when an even number of 'W's precede it
    let n = 0;
    for (let x = c - 1; x >= 0 && this.ch(x, r) === 'W'; x--) n++;
    return n % 2 === 0;
  }

  /** Face of wall (c,r) toward a wall neighbour: full when the neighbour is another divider, else the part above it. */
  _exposed(B, mat, c, r, h, dv, nc, nr, side) {
    if (!this.inside(nc, nr)) return;
    const ni = nr * MAP_W + nc;
    const nd = this.div[ni];
    const y0 = nd >= 0 && nd !== dv ? 0 : this.height[ni];
    if (y0 >= h) return;
    const uv = [0, y0 / WALL_H, 1, h / WALL_H];
    if (side === 'z') B.faceZ(mat, c, c + 1, y0, h, r + 1, 1, uv);
    else if (side === 'x+') B.faceX(mat, r, r + 1, y0, h, c + 1, 1, uv);
    else B.faceX(mat, r, r + 1, y0, h, c, -1, uv);
  }

  _floorCell(B, c, r) {
    const ch = this.chars[r * MAP_W + c];
    let name = FLOOR_CHARS[ch] || 'floor_plate';
    let rot = 0;
    if (ch === '.' && hash(c, r) < 0.3) name = 'floor_plate_worn';
    if (ch === 'h') {
      // stripe toward the neighbouring door (or wall): N, E, S, W
      const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      let best = -1;
      for (let k = 0; k < 4 && best < 0; k++) if (this.k(c + dirs[k][0], r + dirs[k][1]) === DOOR) best = k;
      for (let k = 0; k < 4 && best < 0; k++) if (this.k(c + dirs[k][0], r + dirs[k][1]) === WALL) best = k;
      rot = Math.max(0, best);
    }
    const bridge = name === 'floor_bridge';
    const mat = this.mats.tile(name, {
      roughness: bridge ? 0.55 : 0.62, metalness: bridge ? 0.25 : 0.28,
      emissive: name === 'floor_grate' ? 2.6 : bridge ? 0.12 : 2.0, cast: false,
    });
    if (name === 'floor_grate') this.grateMat = mat;
    B.faceY(mat, c, c + 1, r, r + 1, 0, null, rot);
  }

  // ------------------------------------------------------------------ doors

  _buildDoors() {
    const M = this.mats;
    const frame = M.tile('door_frame', { emissive: 2.6, cast: false });
    const cap = M.tile('wall_cap', { roughness: 0.85, cast: false });
    for (let r = 0; r < MAP_H; r++) {
      for (let c = 0; c < MAP_W; c++) {
        const ch = this.ch(c, r);
        if (!DOOR_CHARS[ch] || this.ch(c - 1, r) === ch) continue;
        const dv = this.div[r * MAP_W + c];
        const B = dv >= 0 ? this.dividers[dv].batch : this._staticBatch;
        const group = dv >= 0 ? this.dividers[dv].group : this.root;
        const locked = ch === 'L';
        const index = this.doors.length;
        this.doorAt[r * MAP_W + c] = index;
        this.doorAt[r * MAP_W + c + 1] = index;
        // lintel cap and amber guide trims either side of the opening
        B.faceY(cap, c, c + 2, r, r + 1, WALL_H);
        B.faceZ(frame, c - 0.25, c, 0, WALL_H, r + 1.015, 1);
        B.faceZ(frame, c + 2, c + 2.25, 0, WALL_H, r + 1.015, 1);
        const mats = [M.tile('door', { emissive: 2.4, roughness: 0.55, metalness: 0.35 }), M.tile('door_locked', { emissive: 2.4, roughness: 0.55, metalness: 0.35 })];
        const geo = new THREE.PlaneGeometry(1, WALL_H);
        const leaves = [0, 1].map((k) => {
          const leaf = new THREE.Mesh(geo, mats[locked ? 1 : 0]);
          leaf.position.set(c + 0.5 + k, WALL_H / 2, r + 0.62);
          leaf.castShadow = true;
          leaf.receiveShadow = true;
          group.add(leaf);
          return leaf;
        });
        // a locked door is also an interactable ('Inspect' / 'Unlock' with the keycard)
        const it = locked ? this.addInteractable({ kind: 'door', id: 'bridge_door', x: c + 1, z: r + 1, box: [c, r, c + 2, r + 1], label: 'Inspect', icon: 'inspect' }) : null;
        this.doors.push({
          index, c, r, x: c + 1, z: r + 0.5, locked, leaves, mats, open: 0, target: 0, it,
          setLocked(on) {
            this.locked = on;
            for (const l of leaves) l.material = mats[on ? 1 : 0];
            if (it) it.enabled = on;
          },
        });
      }
    }
  }

  _updateDoors(dt, px, pz) {
    for (const d of this.doors) {
      const dist = Math.hypot(px - d.x, pz - d.z);
      const was = d.target;
      if (d.locked) d.target = 0;
      else if (dist < DOOR_OPEN_R) d.target = 1;
      else if (dist > DOOR_CLOSE_R) d.target = 0;
      if (d.target !== was && this.onSound) this.onSound('door', { volume: d.target ? 0.9 : 0.55, pitch: d.target ? 1 : 0.92 });
      if (d.open === d.target) continue;
      d.open = clamp(d.open + (d.target ? dt : -dt) / 0.42, 0, 1);
      const s = ease.inOutCubic(d.open) * 0.97;
      d.leaves[0].position.x = d.c + 0.5 - s;
      d.leaves[1].position.x = d.c + 1.5 + s;
    }
  }

  // ------------------------------------------------------------------ windows onto space

  _buildSpace() {
    // one "space box" behind each run of windows: painted backdrop + drifting stars, closed by a
    // void-coloured roof so space only shows through the window glass
    const runs = [];
    for (let r = 0; r < MAP_H; r++) {
      let c0 = -1, c1 = -1;
      for (let c = 0; c < MAP_W; c++) {
        if (this.ch(c, r) === 'W') { if (c0 < 0) c0 = c; c1 = c; }
      }
      if (c0 >= 0) runs.push({ r, c0, c1 });
    }
    const space = textureSet('space_backdrop');
    this.hullMat = new THREE.MeshBasicMaterial({ color: '#05070d', fog: false, side: THREE.DoubleSide });
    for (const run of runs) {
      const wallZ = run.r;          // back face of the window wall
      let top = WALL_H;
      for (let c = run.c0; c <= run.c1; c++) top = Math.max(top, this.height[run.r * MAP_W + c]);
      const grand = top > WALL_H;
      const x0 = run.c0 - 2.9, x1 = run.c1 + 3.9; // stop short of neighbouring walls (no z-fighting)
      const cx = (run.c0 + run.c1 + 1) / 2;
      const [bw, bh] = grand ? [22, 11] : [18, 9];
      const back = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: space.map, fog: false, color: new THREE.Color(1.05, 1.05, 1.1) }));
      back.rotation.x = -0.59;
      back.position.set(cx, grand ? 0.1 : -2.2, wallZ - 4.6);
      this.scene.add(back);
      const starsSet = textureSet('stars_layer', { repeat: [bw / 4, bh / 4] });
      const stars = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({
        map: starsSet.map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: new THREE.Color(1.3, 1.3, 1.4),
      }));
      stars.rotation.x = -0.59;
      stars.position.set(cx, back.position.y + 0.2, wallZ - 4.1);
      this.scene.add(stars);
      const roof = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 8.5), this.hullMat);
      roof.rotation.x = -Math.PI / 2;
      roof.position.set((x0 + x1) / 2, top, wallZ - 4.25);
      this.scene.add(roof);
      for (const x of [x0, x1]) {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(8.5, top + 11), this.hullMat);
        wall.rotation.y = Math.PI / 2;
        wall.position.set(x, (top - 11) / 2, wallZ - 4.25);
        this.scene.add(wall);
      }
      // the planes may slide for parallax, but never out of their hull box
      const lo = x0 + bw / 2, hi = x1 - bw / 2;
      this.spaces.push({ back, stars, starsSet, baseX: cx, lo: lo < hi ? lo : cx, hi: lo < hi ? hi : cx });

      // a slanted light shaft from the top of every window pane, along lighting.KEY_DIR (with a
      // little variety); the upper storey's beams reach far across the floor
      let n = 0;
      for (let c = run.c0; c <= run.c1; c++) {
        if (this.ch(c, run.r) !== 'W' || !this._windowStart(c, run.r)) continue;
        for (let y = WALL_H; y <= top + 0.01; y += WALL_H) {
          const yTop = y - 0.38;
          const s = makeLightShaft({
            width: 1.45, height: yTop / 0.69 + 1.2, color: '#a8d8ff', opacity: y > WALL_H ? 0.1 : 0.13, spread: 1.55, dust: 1.2, seed: c * 3.7 + y,
          });
          s.position.set(c + 1, yTop, run.r + 1.06);
          const jitter = (n++ % 3 - 1) * 0.04;
          s.rotation.set(-0.72 + jitter, 0, 0.42 - jitter);
          this.scene.add(s);
          this.shafts.push(s);
        }
      }
    }
  }

  _updateSpace(dt, focus) {
    for (const sp of this.spaces) {
      // the backdrop rides along with the view (deep parallax); stars drift and sit a bit closer
      sp.back.position.x = clamp(sp.baseX + (focus.x - sp.baseX) * 0.78, sp.lo, sp.hi);
      sp.stars.position.x = clamp(sp.baseX + (focus.x - sp.baseX) * 0.62, sp.lo, sp.hi);
      sp.starsSet.map.offset.x += dt * 0.0045;
      sp.starsSet.map.offset.y += dt * 0.0012;
    }
    this.hullMat.color.copy(this.scene.background);
  }

  // ------------------------------------------------------------------ particles

  /** Continuous emitter; `on` names a divider it hangs on (moves with it). */
  addEmitter(preset, opts, on = null) {
    const em = this.particles.addEmitter(preset, opts);
    this.emitters.push({ em, x: em.position.x, z: em.position.z, y: em.position.y, on, range: 18 + Math.max(opts.area?.[0] || 0, opts.area?.[2] || 0) / 2 });
    return em;
  }

  _buildAmbient() {
    for (const a of AMBIENT) {
      const { preset, x, y, z, rate, ...opts } = a;
      this.addEmitter(preset, { ...opts, position: [x, y, z], rate: this.engine.quality === 'low' ? rate * 0.5 : rate });
    }
  }

  _updateEmitters(dt, focus) {
    this._emitT -= dt;
    for (const e of this.emitters) if (e.on) e.em.position.y = e.y + this.offsets[e.on];
    if (this._emitT > 0) return;
    this._emitT = 0.25;
    for (const e of this.emitters) e.em.active = Math.hypot(e.x - focus.x, e.z - focus.z) < e.range;
  }

  // ------------------------------------------------------------------ registries

  addBox(x, z, w, d) {
    const b = { x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2, enabled: true };
    this.boxes.push(b);
    return b;
  }

  addCircle(x, z, r) {
    const c = { x, z, r, enabled: true };
    this.circles.push(c);
    return c;
  }

  addInteractable(it) {
    const entry = { reach: 1.3, r: 0, box: null, enabled: true, ...it };
    this.interactables.push(entry);
    return entry;
  }

  // ------------------------------------------------------------------ queries

  areaAt(x, z) {
    for (const a of AREAS) if (x >= a.rect[0] && x <= a.rect[2] && z >= a.rect[1] && z <= a.rect[3]) return a;
    return null;
  }

  /** Resolve circle p ({x, z}, radius r) against walls, closed doors and prop colliders (slides along). */
  collide(p, r) {
    for (let it = 0; it < 3; it++) {
      let hit = false;
      const c0 = Math.floor(p.x - r), c1 = Math.floor(p.x + r), r0 = Math.floor(p.z - r), r1 = Math.floor(p.z + r);
      for (let rr = r0; rr <= r1; rr++) {
        for (let cc = c0; cc <= c1; cc++) {
          if (this.solid(cc, rr) && pushOutRect(p, r, cc, rr, cc + 1, rr + 1)) hit = true;
        }
      }
      for (const b of this.boxes) {
        if (b.enabled && p.x + r > b.x0 && p.x - r < b.x1 && p.z + r > b.z0 && p.z - r < b.z1 && pushOutRect(p, r, b.x0, b.z0, b.x1, b.z1)) hit = true;
      }
      for (const c of this.circles) {
        if (!c.enabled) continue;
        const dx = p.x - c.x, dz = p.z - c.z, m = c.r + r;
        const d2 = dx * dx + dz * dz;
        if (d2 < m * m) {
          const d = Math.sqrt(d2) || 1e-4;
          p.x = c.x + (dx / d) * m;
          p.z = c.z + (dz / d) * m;
          hit = true;
        }
      }
      if (!hit) break;
    }
    return p;
  }

  // ------------------------------------------------------------------ state

  /** Re-apply persistent game flags (crates, keycard door, the boss) after battles / respawns. */
  syncFlags(state) {
    const f = state.flags;
    for (const c of this.crates) if (!!f[c.flag] !== c.opened) c.setOpen(!!f[c.flag], true);
    this.setBridgeUnlocked(!!f.bridge_unlocked);
    if (this.boss) this.boss.setPresent(!f.boss_defeated);
  }

  get bridgeDoor() {
    return this.doors.find((d) => this.ch(d.c, d.r) === 'L') || null;
  }

  setBridgeUnlocked(on) {
    const d = this.bridgeDoor;
    if (!d) return;
    d.setLocked(!on);
    if (this.doorLight) this.doorLight.color.set(on ? '#4dff9c' : '#ff3b4e');
  }

  /** Snap dividers/doors/lights to the player's current position (teleport, respawn). */
  snap(px, pz) {
    this._updateDividers(0, pz, true);
    for (const d of this.doors) {
      d.target = !d.locked && Math.hypot(px - d.x, pz - d.z) < DOOR_OPEN_R ? 1 : 0;
      d.open = d.target;
      const s = d.open * 0.97;
      d.leaves[0].position.x = d.c + 0.5 - s;
      d.leaves[1].position.x = d.c + 1.5 + s;
    }
  }

  setQuality(q) {
    this.lighting.setQuality(q);
  }

  // ------------------------------------------------------------------ frame

  /**
   * focus: camera target {x, z}; player: {x, z}. Animates textures, dividers, doors, lights,
   * space parallax, emitters, particles, sprite actors and prop animations.
   */
  update(dt, t, focus, player) {
    this.mats.update(t);
    this._updateDividers(dt, player.z, false);
    this._updateDoors(dt, player.x, player.z);
    this.lighting.update(dt, t, focus, player, this.offsets);
    this._updateSpace(dt, focus);
    this._updateEmitters(dt, focus);
    this.particles.update(dt);
    for (const a of this.actors) a.update(dt);
    for (const fn of this.updaters) fn(dt, t);
    this._updateReactor(dt, t, player);
  }

  _updateReactor(dt, t, player) {
    const R = this.reactor;
    if (!R) return;
    const k = this.lighting.reactorK ?? 0.5;
    R.core.color.setScalar(1.7 + 0.8 * k);
    R.glow.material.color.copy(R.glow.userData.baseColor).multiplyScalar(0.7 + 0.6 * k);
    if (this.grateMat) this.grateMat.emissiveIntensity = 1.3 + 1.0 * k;
    // fade the column while it hides the player (the camera looks north, so "behind" = north of it)
    const behind = player.z < R.z + 0.6 && player.z > R.z - 5.2 && Math.abs(player.x - R.x) < 1.7;
    const target = behind ? 0.3 : 1;
    R.fade += (target - R.fade) * (1 - Math.exp(-dt * 8));
    for (const m of R.mats) m.opacity = R.fade;
  }

  dispose() {
    this.lighting.dispose();
    this.particles.dispose();
    for (const a of this.actors) a.dispose();
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
  }
}
