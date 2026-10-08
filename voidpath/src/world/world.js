// The field diorama for one map (TECH_PLAN 3.1-3.8, 3.13). Builds a normalized MapDef: merged
// pixel-textured cell geometry (walls, dividers that sink into cutaway walls, sliding and locked
// doors, windows onto space with light shafts, floors, water through world/water.js, pit edges over
// the underlay), props through world/props.js (LivingProps for chests, switches, gates, shards,
// pods, screens), NPC actors, field bosses, interactables, triggers and exits. It answers collision
// and area queries, re-applies flags in syncFlags(), animates everything per frame and frees every
// GPU resource in dispose(). The World never creates lights: ExploreState's persistent rig
// (world/lighting.js) is attached to the scene with attachRig().
//
// export function propEntries(map) -> PropEntry[]   map props plus derived chest / interactable / gate props
// export class World
//   constructor({ engine, map /* MapDef (normalized here if needed) */, state, rig, onSound, camera })
//   map; scene; root; particles; lighting; npcs /* id -> NpcActor (bosses too) */; anchors; mats
//   areaAt(x, z); collide(p, r); solid(c, r); walkable(x, z)
//   npc(id) (NPCs, companions, spawned actors and field bosses); spawnNpc(def, { solid, fade }) -> NpcActor;
//   removeNpc(id); living(id); bosses (id -> { def, actor, present }); bossPresent(id?)
//   interactable(id); exitAt(x, z) -> ExitDef | null; triggersAt(x, z) -> TriggerDef[]
//   syncFlags({ instant }); snap(px, pz); setQuality(q); setScreens(tex | null, group?)
//   emote(target /* NpcActor | 'leader' | id */, kind, { ms }) -> Promise
//   attachRig(mood); touch(id); releaseTouched(); setTalking(id, on, leader)
//   update(dt, t, focus, player); dispose()
// Builder API for props (W): map, scene, root, particles, lighting, engine, anchors, mats, batchFor(on),
//   groupFor(on), addBox, addCircle, addInteractable, addEmitter, addGlow, addUpdater, addActor, test,
//   track, living, leader (the Player, set by ExploreState)
//
// Contract notes: prop builders get derived entries for chests ({ t: chest.prop || 'chest', id }),
// interactables with a prop (switch -> 'switch.panel', shard -> 'shard', starchart -> 'starchart'
// by default; `id` only for switches and shards) and gates ({ t: gate.prop || 'gate.laser', id,
// x, z, w, d, cells }); the World registers every interactable itself, so builders never call
// addInteractable for those. Props with `when` are built into their own group and shown or hidden by
// syncFlags. Textures marked `userData.shared` (and the vfx glow texture) survive dispose().

import * as THREE from 'three';
import { Particles } from '../core/particles.js';
import { makeLightShaft, glowTexture } from '../core/vfx.js';
import { release } from '../core/programs.js';
import { textureSet } from '../art/tiles.js';
import { clamp, ease } from '../core/util.js';
import { testCond } from './cond.js';
import { normalizeMap, cellSpec } from './mapdef.js';
import { Batch, Materials } from './geometry.js';
import { buildProp } from './props.js';
import { NpcActor } from './actors.js';
import { showEmote, primeEmotes } from './emotes.js';
import { buildWater } from './water.js';
import { buildSky, buildUnderlay } from './sky.js';

const VOID = 0, FLOOR = 1, DOOR = 2, WALL = 3, WATER = 4, PIT = 5;
const KIND = { void: VOID, floor: FLOOR, door: DOOR, wall: WALL, window: WALL, water: WATER, pit: PIT };
const DOOR_OPEN_R = 1.9, DOOR_CLOSE_R = 2.4;
const DIVIDER_TIME = 0.5;
const PARTICLES_MAX = { low: 1400, medium: 2000, high: 2600 };
const PARTICLE_SCALE = { low: 0.5, medium: 0.75, high: 1 };
const PRESENCE_FADE = 0.3;
const TEXTURE_SLOTS = ['map', 'normalMap', 'emissiveMap', 'alphaMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'lightMap', 'bumpMap'];

// interactable kinds: prompt defaults and the prop a kind builds when its def names none
const KIND_DEFAULTS = {
  terminal: { label: 'Access', icon: 'inspect' },
  inspect: { label: 'Inspect', icon: 'inspect' },
  med: { label: 'Med-Station', icon: 'save' },
  shop: { label: 'Shop', icon: 'shop' },
  starchart: { label: 'Starchart', icon: 'travel', r: 1.05 },   // the 2x2 holo table's half size: reachable from its edge
  switch: { label: 'Use', icon: 'inspect' },
  shard: { label: 'Take', icon: 'shard' },
  exit: { label: 'Go', icon: 'travel' },
  lift: { label: 'Lift', icon: 'travel' },
};
const KIND_PROP = { switch: 'switch.panel', shard: 'shard', starchart: 'starchart' };
const LIVING_KINDS = new Set(['switch', 'shard', 'starchart']);

/**
 * Every PropEntry a World builds for `map` (map props plus the chest, interactable and gate props),
 * without gate cell lists; for prewarm and tools.
 */
export function propEntries(map) {
  const out = [...map.props];
  for (const c of map.chests) out.push({ t: c.prop || 'chest', x: c.x, z: c.z, ...c.propFields, id: c.id });
  for (const it of map.interactables) {
    const t = it.prop || KIND_PROP[it.kind];
    if (t) out.push({ t, x: it.x, z: it.z, ...it.propFields });
  }
  for (const g of map.gates) out.push({ t: g.prop || 'gate.laser', ...g.propFields, id: g.id });
  return out;
}

/** Deterministic per-cell hash in [0, 1). */
function hash(c, r, s = 0) {
  let h = (c * 374761393 + r * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Push circle p (radius r) out of rect [x0,x1]x[z0,z1]. */
function pushOutRect(p, r, x0, z0, x1, z1) {
  const cx = clamp(p.x, x0, x1), cz = clamp(p.z, z0, z1);
  const dx = p.x - cx, dz = p.z - cz;
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

const inRect = (rc, x, z) => x >= rc[0] && x <= rc[2] && z >= rc[1] && z <= rc[3];

export class World {
  constructor({ engine, map, state, rig, onSound = null, camera = null }) {
    this.engine = engine;
    this.map = map.legend && map.w ? map : normalizeMap(map);
    this.state = state;
    this.lighting = rig;
    this.onSound = onSound;
    this.camera = camera;
    this.anchors = this.map.anchors;
    this.quality = engine.quality;
    this.scene = new THREE.Scene();
    this.scene.name = `map:${this.map.id}`;
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.mats = new Materials();
    this.boxes = [];
    this.circles = [];
    this.glows = [];
    this.emitters = [];
    this.actors = [];
    this.updaters = [];
    this.tracked = [];
    this.interactables = [];
    this.npcs = {};
    this.bosses = {};
    this.doors = [];
    this.gates = [];
    this.waters = [];
    this.shafts = [];
    this.spaces = [];
    this.livings = new Map();
    this.livingList = [];
    this.scoped = [];
    this.floorMats = {};
    this.alarm = null;
    this.reactor = null;
    this.leader = null;
    this.externalTouched = null;
    this.sky = null;
    this.underlay = null;
    this._npcState = new Map();
    this._touched = new Set();
    this._scope = null;
    this._emitT = 0;
    this._synced = false;

    this._parse();
    this._initDividers();
    this.particles = new Particles(this.scene, { max: PARTICLES_MAX[this.quality] || PARTICLES_MAX.high });
    this._staticBatch = new Batch();
    this._buildCells();
    this._buildDoors();
    this._buildWater();
    this._buildSpace();
    this._buildProps();
    this._staticBatch.build(this.root);
    for (const d of this.dividers) d.batch.build(d.group);
    this._buildAmbient();
    this._buildInteractables();
    for (const def of this.map.npcs) this.spawnNpc(def, { solid: true });
    for (const def of this.map.bosses) this._spawnBoss(def);
    primeEmotes(this);   // maps without NPCs link the emote program behind the cover too
    if (this.map.sky) this.sky = buildSky(this, this.map.sky);
    if (this.map.underlay) this.underlay = buildUnderlay(this, this.map.underlay);
    // pre-simulate a few seconds so dust, steam and embers are already in the air
    for (let i = 0; i < 90; i++) this.particles.update(0.1);
    this.root.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------------ grid

  get w() { return this.map.w; }
  get h() { return this.map.h; }

  _parse() {
    const { w: W, h: H } = this.map;
    const WALL_H = this.map.wallH, LOW_H = this.map.lowH;
    const n = W * H;
    this.kind = new Uint8Array(n);
    this.specs = new Array(n);
    this.chars = new Array(n);
    this.height = new Float32Array(n);
    this.div = new Int8Array(n).fill(-1);
    this.doorAt = new Int16Array(n).fill(-1);
    this.gateAt = new Int16Array(n).fill(-1);
    this.waterAt = new Int16Array(n).fill(-1);
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const i = r * W + c;
        const spec = cellSpec(this.map, c, r);
        this.specs[i] = spec;
        this.chars[i] = this.map.grid[r][c] ?? ' ';
        this.kind[i] = KIND[spec.t] ?? VOID;
      }
    }
    // wall heights: room to the south -> full, room to the north -> cutaway, side walls full
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const i = r * W + c;
        if (this.kind[i] !== WALL) continue;
        let h;
        if (this.specs[i].height) h = this.specs[i].height;
        else if (this.open(c, r + 1)) h = WALL_H;
        else if (this.open(c, r - 1)) h = LOW_H;
        else if (this.open(c - 1, r) || this.open(c + 1, r)) h = WALL_H;
        else if (this.open(c - 1, r + 1) || this.open(c + 1, r + 1)) h = WALL_H;
        else if (this.open(c - 1, r - 1) || this.open(c + 1, r - 1)) h = LOW_H;
        else h = WALL_H;
        this.height[i] = h;
      }
    }
    for (const g of this.map.grand) {
      for (let c = g.c0; c <= g.c1; c++) {
        const i = g.row * W + c;
        if (this.kind[i] === WALL) this.height[i] = g.height;
      }
    }
    // divider groups: the shared row (forced full height, doors included) plus every full-height
    // wall inside the rect; cutaway walls stay put
    this.map.dividers.forEach((d, k) => {
      const [c0, r0, c1, r1] = d.rect;
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          if (!this.inside(c, r)) continue;
          const i = r * W + c;
          const kind = this.kind[i];
          if (r === d.row && (kind === WALL || kind === DOOR)) {
            this.div[i] = k;
            if (kind === WALL) this.height[i] = WALL_H;
          } else if (kind === WALL && this.height[i] === WALL_H) this.div[i] = k;
        }
      }
    });
  }

  inside(c, r) { return c >= 0 && r >= 0 && c < this.map.w && r < this.map.h; }
  k(c, r) { return this.inside(c, r) ? this.kind[r * this.map.w + c] : VOID; }
  /** Room cells (anything a wall can face): floors, doors, water and pits. */
  open(c, r) { const k = this.k(c, r); return k === FLOOR || k === DOOR || k === WATER || k === PIT; }
  ch(c, r) { return this.inside(c, r) ? this.chars[r * this.map.w + c] : ' '; }
  spec(c, r) { return this.inside(c, r) ? this.specs[r * this.map.w + c] : cellSpec(this.map, c, r); }

  /** Movement blocker: walls, void, pits, undrained water, closed gates and doors not open yet. */
  solid(c, r) {
    const k = this.k(c, r);
    if (!this.inside(c, r)) return true;
    const i = r * this.map.w + c;
    if (this.gateAt[i] >= 0 && !this.gates[this.gateAt[i]].open) return true;
    if (k === FLOOR) return false;
    if (k === DOOR) return this.doors[this.doorAt[i]].open < 0.8;
    if (k === WATER) return !this.waters[this.waterAt[i]].drained;
    return true;
  }

  walkable(x, z) {
    return !this.solid(Math.floor(x), Math.floor(z));
  }

  // ------------------------------------------------------------------ dividers

  _initDividers() {
    this.offsets = {};
    this.dividers = this.map.dividers.map((d) => {
      const group = new THREE.Group();
      this.root.add(group);
      this.offsets[d.id] = 0;
      return { ...d, group, batch: new Batch(), k: 0 };
    });
  }

  batchFor(on) {
    if (this._scope) return this._scope.batch;
    if (!on) return this._staticBatch;
    const d = this.dividers.find((dv) => dv.id === on);
    return d ? d.batch : this._staticBatch;
  }

  groupFor(on) {
    if (this._scope) return this._scope.group;
    if (!on) return this.root;
    const d = this.dividers.find((dv) => dv.id === on);
    return d ? d.group : this.root;
  }

  _updateDividers(dt, pz, snap) {
    const WALL_H = this.map.wallH, LOW_H = this.map.lowH;
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

  _wallMat(name, c, spec = null) {
    const M = this.mats;
    if (name === 'wall_panel_screen') return M.tile(name, { variant: c % 2, emissive: spec?.emissive ?? 2.3, roughness: 0.7 });
    if (name === 'window_frame') {
      const m = M.tile(name, { transparent: true, alphaTest: 0.02, emissive: 1.6, roughness: 0.4, metalness: 0.3, receive: false });
      if (!m.userData.depthMat) {
        m.userData.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: m.map, alphaTest: 0.5 });
      }
      return m;
    }
    return M.tile(name, { emissive: spec?.emissive ?? 2.2, roughness: spec?.roughness ?? 0.78, metalness: spec?.metalness ?? 0.24 });
  }

  _buildCells() {
    const M = this.mats;
    const S = this._staticBatch;
    const { w: W, h: H, wallTex } = this.map;
    const WALL_H = this.map.wallH;
    // Rooms lit only through their windows get a shadow-only ceiling. Its quads face down, so the
    // camera (always above) culls them for free, while shadowSide makes them opaque to the key light.
    const ceilMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    ceilMat.shadowSide = THREE.BackSide;
    const ceiling = new Batch();
    const ceilingAreas = this.map.areas.filter((a) => a.ceiling);
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

    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const i = r * W + c;
        const kind = this.kind[i];
        const spec = this.specs[i];
        if (kind === FLOOR || kind === DOOR) {
          if (kind === FLOOR && spec.gate) continue;   // gate floors (light bridges) are drawn by the gate prop
          this._floorCell(S, c, r);
          const ca = ceilingAt(c + 0.5, r + 0.5);
          if (ca) ceiling.faceY(ceilMat, c, c + 1, r, r + 1, ca.ceilingY || WALL_H + 0.05, null, 0, -1);
          // scattered grime keeps plates from repeating
          if (kind === FLOOR && spec.grime) {
            const h = hash(c, r, 3);
            if (h < spec.grime) S.faceY(h < spec.grime * (5 / 7) ? grime : oil, c, c + 1, r, r + 1, 0.005, null, Math.floor(hash(c, r, 5) * 4));
          }
          continue;
        }
        if (kind === PIT) {
          this._pitEdges(S, c, r, spec);
          continue;
        }
        if (kind !== WALL) continue;
        const h = this.height[i];
        const isWindow = spec.t === 'window';
        // walls of window-lit rooms sit under the shadow ceiling too (windows stay open to the light)
        const cw = !isWindow && ceilingAt(c + 0.5, r + 0.5);
        if (cw) ceiling.faceY(ceilMat, c, c + 1, r, r + 1, Math.max(h, cw.ceilingY || WALL_H) + 0.05, null, 0, -1);
        const dv = this.div[i];
        const B = dv >= 0 ? this.dividers[dv].batch : S;
        const tall = h >= WALL_H;
        const panel = this._wallMat(spec.side || wallTex.side, 0, spec);
        const low = M.tile(spec.low || wallTex.low, { roughness: 0.7, emissive: 2.0 });
        const cap = M.tile(spec.cap || wallTex.cap, { roughness: 0.85, cast: false });

        // front (+z)
        const sk = this.k(c, r + 1);
        if (sk !== WALL) {
          if (isWindow) {
            if (this._windowStart(c, r)) {
              for (let y = 0; y < h - 0.01; y += WALL_H) B.faceZ(this._wallMat(spec.tex, c), c, c + 2, y, y + WALL_H, r + 1, 1);
            }
          } else if (tall) {
            const name = sk === VOID ? (spec.side || wallTex.side) : spec.tex;
            B.faceZ(this._wallMat(name, c, spec), c, c + 1, 0, WALL_H, r + 1, 1);
            if (h > WALL_H) B.faceZ(this._wallMat(spec.upper || 'wall_panel_vent', c), c, c + 1, WALL_H, h, r + 1, 1);
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
    // windows come in pairs: a cell starts a frame when an even number of the same cells precede it
    const ch = this.ch(c, r);
    let n = 0;
    for (let x = c - 1; x >= 0 && this.ch(x, r) === ch; x--) n++;
    return n % 2 === 0;
  }

  /** Face of wall (c,r) toward a wall neighbour: full when the neighbour is another divider, else the part above it. */
  _exposed(B, mat, c, r, h, dv, nc, nr, side) {
    if (!this.inside(nc, nr)) return;
    const WALL_H = this.map.wallH;
    const ni = nr * this.map.w + nc;
    const nd = this.div[ni];
    const y0 = nd >= 0 && nd !== dv ? 0 : this.height[ni];
    if (y0 >= h) return;
    const uv = [0, y0 / WALL_H, 1, h / WALL_H];
    if (side === 'z') B.faceZ(mat, c, c + 1, y0, h, r + 1, 1, uv);
    else if (side === 'x+') B.faceX(mat, r, r + 1, y0, h, c + 1, 1, uv);
    else B.faceX(mat, r, r + 1, y0, h, c, -1, uv);
  }

  _floorCell(B, c, r) {
    const spec = this.spec(c, r);
    const door = spec.t === 'door';
    let name = door ? spec.floor || 'floor_plate' : spec.tex;
    let rot = 0;
    if (!door && spec.mix) {
      // texture mix: cumulative chances over a per-cell hash (POC: worn plates on '.')
      const h = hash(c, r);
      let acc = 0;
      for (const [tex, chance] of spec.mix) {
        acc += chance;
        if (h < acc) { name = tex; break; }
      }
    }
    if (!door && spec.stripe) {
      // stripe toward the neighbouring door (or wall): N, E, S, W
      const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      let best = -1;
      for (let k = 0; k < 4 && best < 0; k++) if (this.k(c + dirs[k][0], r + dirs[k][1]) === DOOR) best = k;
      for (let k = 0; k < 4 && best < 0; k++) if (this.k(c + dirs[k][0], r + dirs[k][1]) === WALL) best = k;
      rot = Math.max(0, best);
    }
    const mat = this.mats.tile(name, {
      roughness: spec.roughness ?? 0.62, metalness: spec.metalness ?? 0.28, emissive: spec.emissive ?? 2.0, cast: false,
    });
    this.floorMats[name] = mat;
    B.faceY(mat, c, c + 1, r, r + 1, 0, null, rot);
  }

  /** The slab edge of every walkable neighbour of a pit cell, looking down onto the underlay. */
  _pitEdges(B, c, r, spec) {
    const th = spec.thickness ?? 0.4;
    const mat = this.mats.tile(spec.edge || 'wall_low', { roughness: 0.8, emissive: spec.emissive ?? 2.0, cast: false });
    const uv = [0, 0, 1, th];
    const solidNeighbour = (nc, nr) => {
      const k = this.k(nc, nr);
      return k === FLOOR || k === DOOR || k === WATER;
    };
    if (solidNeighbour(c, r - 1)) B.faceZ(mat, c, c + 1, -th, 0, r, 1, uv);
    if (solidNeighbour(c, r + 1)) B.faceZ(mat, c, c + 1, -th, 0, r + 1, -1, uv);
    if (solidNeighbour(c - 1, r)) B.faceX(mat, r, r + 1, -th, 0, c, 1, uv);
    if (solidNeighbour(c + 1, r)) B.faceX(mat, r, r + 1, -th, 0, c + 1, -1, uv);
  }

  // ------------------------------------------------------------------ doors

  _buildDoors() {
    const M = this.mats;
    const WALL_H = this.map.wallH;
    const frame = M.tile('door_frame', { emissive: 2.6, cast: false });
    const cap = M.tile(this.map.wallTex.cap, { roughness: 0.85, cast: false });
    const geo = new THREE.PlaneGeometry(1, WALL_H);
    for (let r = 0; r < this.map.h; r++) {
      for (let c = 0; c < this.map.w; c++) {
        const spec = this.spec(c, r);
        if (spec.t !== 'door' || this.ch(c - 1, r) === this.ch(c, r)) continue;
        const dv = this.div[r * this.map.w + c];
        const B = dv >= 0 ? this.dividers[dv].batch : this._staticBatch;
        const group = dv >= 0 ? this.dividers[dv].group : this.root;
        const index = this.doors.length;
        this.doorAt[r * this.map.w + c] = index;
        this.doorAt[r * this.map.w + c + 1] = index;
        // lintel cap and amber guide trims either side of the opening
        B.faceY(cap, c, c + 2, r, r + 1, WALL_H);
        B.faceZ(frame, c - 0.25, c, 0, WALL_H, r + 1.015, 1);
        B.faceZ(frame, c + 2, c + 2.25, 0, WALL_H, r + 1.015, 1);
        const mats = [spec.tex, spec.lockedTex || 'door_locked'].map((t) => M.tile(t, { emissive: 2.4, roughness: 0.55, metalness: 0.35 }));
        const leaves = [0, 1].map((k) => {
          const leaf = new THREE.Mesh(geo, mats[spec.lock ? 1 : 0]);
          leaf.position.set(c + 0.5 + k, WALL_H / 2, r + 0.62);
          leaf.castShadow = true;
          leaf.receiveShadow = true;
          group.add(leaf);
          return leaf;
        });
        // a locked door is also an interactable ('Inspect', or 'Unlock' while its item is held)
        const lock = spec.lock || null;
        const it = lock ? this.addInteractable({
          kind: 'door', id: lock.id, x: c + 1, z: r + 1, box: [c, r, c + 2, r + 1], label: lock.label || 'Inspect', icon: 'inspect', lock,
        }) : null;
        const door = {
          index, c, r, x: c + 1, z: r + 0.5, lock, locked: !!lock, leaves, mats, open: 0, target: 0, it,
          setLocked(on) {
            door.locked = on;
            for (const l of leaves) l.material = mats[on ? 1 : 0];
            if (it) it.enabled = on;
          },
        };
        this.doors.push(door);
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
      this._placeLeaves(d, ease.inOutCubic(d.open));
    }
  }

  _placeLeaves(d, k) {
    const s = k * 0.97;
    d.leaves[0].position.x = d.c + 0.5 - s;
    d.leaves[1].position.x = d.c + 1.5 + s;
  }

  // ------------------------------------------------------------------ water

  _buildWater() {
    // one water body per legend character (drains switch together)
    const groups = new Map();
    for (let r = 0; r < this.map.h; r++) {
      for (let c = 0; c < this.map.w; c++) {
        const i = r * this.map.w + c;
        if (this.kind[i] !== WATER) continue;
        const ch = this.chars[i];
        if (!groups.has(ch)) groups.set(ch, { spec: this.specs[i], cells: [] });
        groups.get(ch).cells.push([c, r]);
      }
    }
    for (const { spec, cells } of groups.values()) {
      const index = this.waters.length;
      for (const [c, r] of cells) this.waterAt[r * this.map.w + c] = index;
      this.waters.push({ spec, cells, drained: false, body: buildWater(this, cells, spec) });
    }
  }

  // ------------------------------------------------------------------ windows onto space

  _buildSpace() {
    // one "space box" behind each row of windows: painted backdrop + drifting stars, closed by a
    // void-coloured roof so space only shows through the window glass
    const WALL_H = this.map.wallH;
    const runs = [];
    for (let r = 0; r < this.map.h; r++) {
      let c0 = -1, c1 = -1;
      for (let c = 0; c < this.map.w; c++) {
        if (this.spec(c, r).t === 'window') { if (c0 < 0) c0 = c; c1 = c; }
      }
      if (c0 >= 0) runs.push({ r, c0, c1 });
    }
    if (!runs.length) return;
    const bd = this.map.backdrop || {};
    this.hullMat = new THREE.MeshBasicMaterial({ color: '#05070d', fog: false, side: THREE.DoubleSide });
    const tint = bd.tint || [1.05, 1.05, 1.1];
    for (const run of runs) {
      const wallZ = run.r;          // back face of the window wall
      let top = WALL_H;
      for (let c = run.c0; c <= run.c1; c++) top = Math.max(top, this.height[run.r * this.map.w + c]);
      const grand = top > WALL_H;
      const x0 = run.c0 - 2.9, x1 = run.c1 + 3.9; // stop short of neighbouring walls (no z-fighting)
      const cx = (run.c0 + run.c1 + 1) / 2;
      const [bw, bh] = grand ? [22, 11] : [18, 9];
      const space = textureSet(this.spec(run.c0, run.r).backdrop || bd.texture || 'space_backdrop');
      const back = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: space.map, fog: false, color: new THREE.Color(...tint) }));
      back.rotation.x = -0.59;
      back.position.set(cx, grand ? 0.1 : -2.2, wallZ - 4.6);
      this.scene.add(back);
      const starsSet = textureSet(bd.stars || 'stars_layer', { repeat: [bw / 4, bh / 4] });
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
        if (this.spec(c, run.r).t !== 'window' || !this._windowStart(c, run.r)) continue;
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
    if (this.hullMat && this.scene.background) this.hullMat.color.copy(this.scene.background);
  }

  // ------------------------------------------------------------------ props

  /** Map props plus the props chests, interactables and gates ask for (see the header). */
  _derivedProps() {
    const out = [];
    for (const c of this.map.chests) out.push({ t: c.prop || 'chest', x: c.x, z: c.z, ...c.propFields, id: c.id, when: c.when });
    for (const it of this.map.interactables) {
      const t = it.prop || KIND_PROP[it.kind];
      if (!t) continue;
      const e = { t, x: it.x, z: it.z, ...it.propFields, when: it.when };
      if (LIVING_KINDS.has(it.kind)) e.id = it.id;
      out.push(e);
    }
    for (const g of this.map.gates) {
      const cells = this._gateCells(g);
      let c0 = Infinity, r0 = Infinity, c1 = -Infinity, r1 = -Infinity;
      for (const [c, r] of cells) { c0 = Math.min(c0, c); r0 = Math.min(r0, r); c1 = Math.max(c1, c); r1 = Math.max(r1, r); }
      out.push({ t: g.prop || 'gate.laser', x: (c0 + c1 + 1) / 2, z: (r0 + r1 + 1) / 2, w: c1 - c0 + 1, d: r1 - r0 + 1, cells, ...g.propFields, id: g.id });
    }
    return out;
  }

  _gateCells(g) {
    const cells = (g.cells || []).map(([c, r]) => [c, r]);
    if (g.rect) {
      const [c0, r0, c1, r1] = g.rect;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cells.push([c, r]);
    }
    // floor cells that name this gate in the legend belong to it too
    for (let r = 0; r < this.map.h; r++) {
      for (let c = 0; c < this.map.w; c++) {
        if (this.spec(c, r).gate === g.id && !cells.some(([x, y]) => x === c && y === r)) cells.push([c, r]);
      }
    }
    return cells;
  }

  _buildProps() {
    for (const g of this.map.gates) {
      const index = this.gates.length;
      const cells = this._gateCells(g);
      for (const [c, r] of cells) if (this.inside(c, r)) this.gateAt[r * this.map.w + c] = index;
      this.gates.push({ def: g, cells, open: false });
    }
    for (const p of [...this.map.props, ...this._derivedProps()]) this._buildPropEntry(p);
  }

  _buildPropEntry(p) {
    let scope = null;
    if (p.when) {
      // conditional props get their own group (and their colliders and emitters) to show or hide
      const group = new THREE.Group();
      (p.on ? this.groupFor(p.on) : this.root).add(group);
      scope = { entry: p, group, batch: new Batch(), boxes: [], circles: [], emitters: [], interactables: [] };
      this._scope = scope;
    }
    let living = null;
    try {
      living = buildProp(this, p);
    } finally {
      this._scope = null;
    }
    if (scope) {
      scope.batch.build(scope.group);
      this.scoped.push(scope);
    }
    if (living) {
      this.livingList.push({ entry: p, living });
      if (p.id) this.livings.set(p.id, living);
    }
  }

  // ------------------------------------------------------------------ particles

  /** Continuous emitter; `on` names a divider it hangs on (moves with it). */
  addEmitter(preset, opts, on = null) {
    const em = this.particles.addEmitter(preset, opts);
    const e = { em, x: em.position.x, z: em.position.z, y: em.position.y, on, base: em.rate, range: 18 + Math.max(opts.area?.[0] || 0, opts.area?.[2] || 0) / 2 };
    em.rate = e.base * (PARTICLE_SCALE[this.quality] ?? 1);
    this.emitters.push(e);
    if (this._scope) this._scope.emitters.push(e);
    return em;
  }

  _buildAmbient() {
    for (const a of this.map.ambient) {
      const { preset, x, y, z, rate, when, ...opts } = a;
      const em = this.addEmitter(preset, { ...opts, position: [x, y, z], rate });
      if (when) this.emitters[this.emitters.length - 1].when = when;
      em.active = !when || this.test(when);
    }
  }

  _updateEmitters(dt, focus) {
    this._emitT -= dt;
    for (const e of this.emitters) if (e.on) e.em.position.y = e.y + this.offsets[e.on];
    if (this._emitT > 0) return;
    this._emitT = 0.25;
    for (const e of this.emitters) e.em.active = !e.hidden && Math.hypot(e.x - focus.x, e.z - focus.z) < e.range;
  }

  // ------------------------------------------------------------------ registries (builder API)

  addBox(x, z, w, d) {
    const b = { x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2, enabled: true };
    this.boxes.push(b);
    if (this._scope) this._scope.boxes.push(b);
    return b;
  }

  addCircle(x, z, r) {
    const c = { x, z, r, enabled: true };
    this.circles.push(c);
    if (this._scope) this._scope.circles.push(c);
    return c;
  }

  addInteractable(it) {
    const entry = { reach: 1.3, r: 0, box: null, enabled: true, ...it };
    this.interactables.push(entry);
    if (this._scope) this._scope.interactables.push(entry);
    return entry;
  }

  addGlow(sprite, x, z) {
    this.glows.push({ x, z, sprite });
  }

  addUpdater(fn) {
    this.updaters.push(fn);
  }

  addActor(actor) {
    this.actors.push(actor);
  }

  track(disposable) {
    this.tracked.push(disposable);
    return disposable;
  }

  test(cond) {
    return testCond(cond, this.state);
  }

  living(id) {
    return this.livings.get(id) || null;
  }

  interactable(id) {
    return this.interactables.find((it) => it.id === id) || null;
  }

  // ------------------------------------------------------------------ interactables, NPCs, bosses

  _buildInteractables() {
    for (const def of this.map.interactables) {
      this.addInteractable({ ...KIND_DEFAULTS[def.kind], ...def, def });
    }
    for (const c of this.map.chests) {
      this.addInteractable({
        kind: 'chest', id: c.id, chest: c, x: c.x, z: c.z + 0.5, box: [c.x - 0.52, c.z - 0.52, c.x + 0.52, c.z + 0.52],
        label: 'Open', icon: 'item', when: c.when,
      });
    }
  }

  npc(id) {
    return this.npcs[id] || null;
  }

  /**
   * Spawn an NPC actor. Map NPCs block movement; actors spawned later (companions, cs.spawn, the
   * cutscene leader stand-in, party members stepping out) do not unless asked to.
   */
  spawnNpc(def, { solid = false, fade = 0 } = {}) {
    if (this.npcs[def.id]) this.removeNpc(def.id);
    const actor = new NpcActor(this, def);
    this.npcs[def.id] = actor;
    const collider = solid ? this.addCircle(def.x, def.z, def.radius ?? 0.38) : null;
    const it = def.talk ? this.addInteractable({
      kind: 'npc', id: def.id, npc: actor, def, x: def.x, z: def.z, r: 0.35, label: 'Talk', icon: 'talk',
    }) : null;
    const idle = def.idle && def.idle.path && def.idle.path.length ? def.idle : null;
    this._npcState.set(def.id, { def, actor, collider, it, idle, step: 0, dir: 1, wait: 0.5, walking: false, talking: false });
    if (fade) {
      actor.setVisible(false);
      actor.setVisible(true, { fade });
    }
    return actor;
  }

  removeNpc(id) {
    const st = this._npcState.get(id);
    if (!st) return;
    st.actor.dispose();
    if (st.collider) this.circles.splice(this.circles.indexOf(st.collider), 1);
    if (st.it) this.interactables.splice(this.interactables.indexOf(st.it), 1);
    this._npcState.delete(id);
    delete this.npcs[id];
  }

  /** A field boss stands on the map as an NpcActor with its enemy sheet (scripts can stage it). */
  _spawnBoss(def) {
    const boss = new NpcActor(this, { id: def.id, sprite: `enemy:${def.art}`, x: def.x, z: def.z, facing: def.facing || 'right', name: def.name });
    const collider = this.addCircle(def.x, def.z, def.radius ?? 1.3);
    const it = this.addInteractable({ kind: 'boss', id: def.id, boss, def, x: def.x, z: def.z, r: 1.2, reach: 1.6, label: 'Confront', icon: 'attack' });
    this.bosses[def.id] = { def, actor: boss, collider, it, present: true };
    this.npcs[def.id] = boss;
  }

  /** A boss is present while its `when` holds (default: its encounter not yet defeated). */
  bossPresent(id) {
    const b = id ? this.bosses[id] : Object.values(this.bosses)[0];
    return !!(b && b.present);
  }

  /** Talk etiquette: an NPC stops its idle walk and faces the leader, then returns to its idle. */
  setTalking(id, on, leader = null) {
    const st = this._npcState.get(id);
    if (!st) return;
    st.talking = on;
    if (on && leader) st.actor.face({ x: leader.x, z: leader.z });
    else if (!on) {
      st.actor.face(st.def.facing || 'down');
      st.actor.play(null);
    }
  }

  /** Scripts touch actors (move, face, animate, battle): exempt from `when` until released (3.8). */
  touch(id) {
    this._touched.add(id);
  }

  /** Touched by this World's own flows or by the cutscene runner (externalTouched, its Set). */
  isTouched(id) {
    return this._touched.has(id) || !!(this.externalTouched && this.externalTouched.has(id));
  }

  releaseTouched() {
    this._touched.clear();
    this.syncFlags();
  }

  emote(target, kind, opts = {}) {
    const who = target === 'leader' ? this.leader : typeof target === 'string' ? this.npc(target) : target;
    if (!who) {
      console.warn(`world.emote: unknown target ${target}`);
      return Promise.resolve();
    }
    return showEmote(this, who, kind, opts);
  }

  setScreens(tex, group) {
    for (const { entry, living } of this.livingList) {
      if (entry.t === 'screen' && (group === undefined || entry.group === group) && living.setState) living.setState(tex);
    }
  }

  // ------------------------------------------------------------------ queries

  areaAt(x, z) {
    for (const a of this.map.areas) if (inRect(a.rect, x, z)) return a;
    return null;
  }

  /** The exit whose rect holds (x, z) and whose `when` holds, or null (auto or prompted). */
  exitAt(x, z) {
    for (const e of this.map.exits) if (inRect(e.rect, x, z) && this.test(e.when)) return e;
    return null;
  }

  /** Every `enter` trigger whose rect or area holds (x, z) (conditions are ExploreState's). */
  triggersAt(x, z) {
    const area = this.areaAt(x, z);
    return this.map.triggers.filter((t) => t.on === 'enter' && (t.rect ? inRect(t.rect, x, z) : area && t.area === area.id));
  }

  /** Resolve circle p ({x, z}, radius r) against walls, closed doors and gates, water, props (slides along). */
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

  // ------------------------------------------------------------------ flags

  /**
   * Re-apply persistent flags (3.8): chests, locked doors, gates, water drains, switches, shards,
   * pod and guide states, conditional props and interactables, NPC and boss presence, light
   * conditions. The first call after building (or instant: true) snaps instead of animating.
   */
  syncFlags({ instant = !this._synced } = {}) {
    const f = this.state.flags || {};
    const mapId = this.map.id;
    const setLiving = (id, value, method) => {
      const l = this.livings.get(id);
      if (l && l[method]) l[method](value, instant);
    };
    // chests
    for (const it of this.interactables) {
      if (it.kind !== 'chest') continue;
      const opened = !!f[`chest:${mapId}:${it.id}`];
      const present = this.test(it.when);
      it.opened = opened;
      it.enabled = present && !opened;
      setLiving(it.id, opened, 'setOpen');
    }
    // locked doors
    for (const d of this.doors) {
      if (!d.lock) continue;
      const locked = !this.test(d.lock.flag);
      if (locked !== d.locked) d.setLocked(locked);
      if (locked && instant) {
        d.open = 0;
        d.target = 0;
        this._placeLeaves(d, 0);
      }
    }
    // gates
    for (const g of this.gates) {
      const open = this.test(g.def.open);
      if (open !== g.open || instant) {
        g.open = open;
        setLiving(g.def.id, open, 'setOpen');
      }
    }
    // water drains
    for (const w of this.waters) {
      const drained = !!(w.spec.drain && this.test(w.spec.drain));
      if (drained !== w.drained || instant) {
        w.drained = drained;
        if (w.body && w.body.setDrained) w.body.setDrained(drained, instant);
      }
    }
    // map interactables: conditions, switch and shard states
    for (const it of this.interactables) {
      if (!it.def || it.kind === 'npc' || it.kind === 'boss') continue;
      let enabled = this.test(it.when);
      if (it.kind === 'switch') {
        const on = !!f[it.flag];
        const l = this.livings.get(it.id);
        const set = l && (l.setState || l.setOpen);
        if (set) set.call(l, on, instant);
        if (on && it.mode === 'once') enabled = false;
      } else if (it.kind === 'shard') {
        const taken = !!f[it.flag];
        setLiving(it.id, taken, 'setOpen');
        if (taken) enabled = false;
      }
      it.enabled = enabled;
    }
    // living prop states: pods with `status`, guides linked to a switch
    for (const { entry, living } of this.livingList) {
      if (!living.setState) continue;
      if (entry.status !== undefined) living.setState(this.test(entry.status), instant);
      if (entry.link) {
        const sw = this.interactable(entry.link);
        living.setState(!!(sw && sw.flag && f[sw.flag]), instant);
      }
    }
    // conditional props
    for (const s of this.scoped) {
      const on = this.test(s.entry.when);
      s.group.visible = on;
      for (const b of s.boxes) b.enabled = on;
      for (const c of s.circles) c.enabled = on;
      for (const e of s.emitters) e.hidden = !on;
      for (const it of s.interactables) it.enabled = on;
    }
    for (const e of this.emitters) if (e.when) e.hidden = !this.test(e.when);
    // NPC presence (touched actors are left to the running script)
    for (const [id, st] of this._npcState) {
      if (this.isTouched(id) || !st.def.when) continue;
      this._setPresence(st, this.test(st.def.when), instant);
    }
    for (const [id, b] of Object.entries(this.bosses)) {
      if (this.isTouched(id)) continue;
      this._setPresence(b, this.test(b.def.when), instant);
      if (b.def.light) this.lighting.setTag(b.def.light, { on: b.present });
    }
    this.lighting.syncConditions((c) => this.test(c));
    this._synced = true;
  }

  _setPresence(st, on, instant) {
    if (st.present === on) return;
    st.present = on;
    if (st.collider) st.collider.enabled = on;
    if (st.it) st.it.enabled = on;
    st.actor.setVisible(on, { fade: instant ? 0 : PRESENCE_FADE });
  }

  /** Attach the persistent lighting rig to this scene (step 2 of a map load, 3.7). */
  attachRig(mood) {
    this.lighting.attach(this.scene, this.map.lights, mood, { glows: this.glows, alarm: this.alarm, test: (c) => this.test(c) });
    for (const b of Object.values(this.bosses)) if (b.def.light) this.lighting.setTag(b.def.light, { on: b.present !== false });
  }

  /** Snap dividers and doors to the leader's position (teleport, respawn, arrival). */
  snap(px, pz) {
    this._updateDividers(0, pz, true);
    for (const d of this.doors) {
      d.target = !d.locked && Math.hypot(px - d.x, pz - d.z) < DOOR_OPEN_R ? 1 : 0;
      d.open = d.target;
      this._placeLeaves(d, d.open);
    }
  }

  /** Quality tier change: emitter rates follow the tier's particle scale (lights live in the rig). */
  setQuality(q) {
    this.quality = q;
    const k = PARTICLE_SCALE[q] ?? 1;
    for (const e of this.emitters) e.em.rate = e.base * k;
  }

  // ------------------------------------------------------------------ frame

  /**
   * focus: the camera's look target {x, z}; player: the leader {x, z}. Animates textures, dividers,
   * doors, lights, space parallax, emitters, particles, actors, NPC idle walks and prop animations.
   */
  update(dt, t, focus, player) {
    this.mats.update(t);
    this._updateDividers(dt, player.z, false);
    this._updateDoors(dt, player.x, player.z);
    if (this.lighting.scene === this.scene) this.lighting.update(dt, t, focus, player, this.offsets);
    this._updateSpace(dt, focus);
    this._updateEmitters(dt, focus);
    this.particles.update(dt);
    for (const a of this.actors) a.update(dt);
    this._updateNpcs(dt, t);
    for (const fn of this.updaters) fn(dt, t);
    for (const w of this.waters) if (w.body && w.body.update) w.body.update(dt, t);
    if (this.sky) this.sky.update(dt, t, this.camera);
    if (this.underlay) this.underlay.update(dt, t, this.camera);
    this._updateReactor(dt, player);
  }

  _updateNpcs(dt, t) {
    for (const [id, st] of this._npcState) {
      const a = st.actor;
      a.update(dt, t);
      if (st.collider) { st.collider.x = a.x; st.collider.z = a.z; }
      if (st.it) { st.it.x = a.x; st.it.z = a.z; }
      // idle paths: walk, pause, walk on (never while talked to or held by a script)
      const idle = st.idle;
      if (!idle || st.walking || st.talking || this.isTouched(id) || st.present === false) continue;
      st.wait -= dt;
      if (st.wait > 0) continue;
      const path = idle.path;
      const next = path[st.step];
      st.walking = true;
      a.walkTo([next], { speed: idle.speed ?? 1.4 }).then(() => {
        st.walking = false;
        const [p0, p1] = idle.pause || [1, 3];
        st.wait = p0 + (p1 - p0) * hash(st.step, Math.floor(t), 9);
        if (idle.loop === false) {
          if (st.step + st.dir >= path.length || st.step + st.dir < 0) st.dir = -st.dir;
          st.step += st.dir;
        } else st.step = (st.step + 1) % path.length;
        a.play(idle.anim || null);
      });
    }
    for (const b of Object.values(this.bosses)) {
      b.actor.update(dt, t);
      b.collider.x = b.actor.x;
      b.collider.z = b.actor.z;
      b.it.x = b.actor.x;
      b.it.z = b.actor.z;
    }
  }

  _updateReactor(dt, player) {
    const R = this.reactor;
    if (!R) return;
    const k = this.lighting.reactorK ?? 0.5;
    R.core.color.setScalar(1.7 + 0.8 * k);
    R.glow.material.color.copy(R.glow.userData.baseColor).multiplyScalar(0.7 + 0.6 * k);
    if (this.floorMats.floor_grate) this.floorMats.floor_grate.emissiveIntensity = 1.3 + 1.0 * k;
    // fade the column while it hides the leader (the camera looks north, so "behind" = north of it)
    const behind = player.z < R.z + 0.6 && player.z > R.z - 5.2 && Math.abs(player.x - R.x) < 1.7;
    const target = behind ? 0.3 : 1;
    R.fade += (target - R.fade) * (1 - Math.exp(-dt * 8));
    for (const m of R.mats) m.opacity = R.fade;
  }

  // ------------------------------------------------------------------ teardown

  /**
   * Free everything this map built: actors, LivingProps, tracked objects, particles, every geometry,
   * every material through programs.release and the textures those materials hold (shared ones are
   * kept). The persistent rig and the camera are left alone.
   */
  dispose() {
    for (const st of this._npcState.values()) st.actor.dispose();
    for (const b of Object.values(this.bosses)) b.actor.dispose();
    for (const a of this.actors) { a.object3d.removeFromParent(); a.dispose(); }
    for (const { living } of this.livingList) if (living.dispose) living.dispose();
    for (const w of this.waters) if (w.body && w.body.dispose) w.body.dispose();
    for (const x of [this.sky, this.underlay, ...this.tracked]) if (x && x.dispose) x.dispose();
    this.particles.dispose();
    this._npcState.clear();
    this.livingList = [];
    this.livings.clear();

    const geos = new Set(), mats = new Set(this.mats.list());
    const skip = new Set([this.lighting.group]);
    const walk = (o) => {
      if (skip.has(o)) return;
      if (o.geometry) geos.add(o.geometry);
      for (const m of [].concat(o.material || [])) mats.add(m);
      if (o.customDepthMaterial) mats.add(o.customDepthMaterial);
      for (const ch of o.children) walk(ch);
    };
    walk(this.scene);
    for (const m of [...mats]) if (m.userData && m.userData.depthMat) mats.add(m.userData.depthMat);
    const glow = glowTexture();
    for (const g of geos) g.dispose();
    for (const m of mats) {
      for (const slot of TEXTURE_SLOTS) {
        const tx = m[slot];
        if (tx && tx.isTexture && tx !== glow && !tx.userData.shared) tx.dispose();
      }
      const u = m.uniforms;
      if (u) {
        for (const k of Object.keys(u)) {
          const tx = u[k] && u[k].value;
          if (tx && tx.isTexture && tx !== glow && !tx.userData.shared) tx.dispose();
        }
      }
      release(m);
    }
    if (this.lighting.scene === this.scene) this.lighting.dispose();
    this.scene.clear();
  }
}
