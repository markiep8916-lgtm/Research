// Builds the 3D scene for one room: instanced tile meshes with baked ambient-occlusion shading,
// themed platforms / ladders / vines / hazards, animated lava & water, back wall and decor.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { T, FLAGS, F_SOLID } from '../sim/tiles.js';
import { THEMES } from './themes.js';
import { getTexture } from './textures.js';
import { Instancer } from './instancer.js';
import { buildDecor } from './decor.js';
import { rng, hashStr } from '../core/util.js';

export const DEPTH = 2.6;
export const ZC = 1.0 - DEPTH / 2; // centre z of a tile box (front face at z = +1)

function merged(parts) {
  const geos = parts.map(({ g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] }) => {
    const c = g.index ? g.toNonIndexed() : g.clone();
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
    c.applyMatrix4(m);
    return c;
  });
  return mergeGeometries(geos);
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const CONE = new THREE.ConeGeometry(1, 1, 7);
const ICO = new THREE.IcosahedronGeometry(1, 0);

function ladderGeo() {
  return merged([
    { g: BOX, p: [-0.3, 0.5, 0], s: [0.08, 1, 0.1] },
    { g: BOX, p: [0.3, 0.5, 0], s: [0.08, 1, 0.1] },
    ...[0.16, 0.5, 0.84].map((y) => ({ g: CYL, p: [0, y, 0], r: [0, 0, Math.PI / 2], s: [0.04, 0.64, 0.04] })),
  ]);
}
function vineGeo() {
  return merged([
    { g: CYL, p: [0, 0.5, 0], s: [0.035, 1.02, 0.035] },
    { g: ICO, p: [0.13, 0.25, 0.02], r: [0.3, 0.5, 0.6], s: [0.2, 0.09, 0.12] },
    { g: ICO, p: [-0.14, 0.62, -0.02], r: [0.2, 0.2, -0.6], s: [0.2, 0.09, 0.12] },
    { g: ICO, p: [0.1, 0.9, 0.0], r: [0.1, 0.9, 0.5], s: [0.17, 0.08, 0.11] },
  ]);
}
function spikeGeo() {
  return merged([0.2, 0.5, 0.8].map((x) => ({ g: CONE, p: [x - 0.5, 0.28, 0], s: [0.13, 0.56, 0.13] })));
}
function gateBarsGeo() {
  return merged([
    ...[-0.36, -0.18, 0, 0.18, 0.36].map((x) => ({ g: CYL, p: [x, 0, 0], s: [0.045, 1.0, 0.045] })),
    { g: BOX, p: [0, 0.46, 0], s: [1, 0.09, 0.14] }, { g: BOX, p: [0, -0.46, 0], s: [1, 0.09, 0.14] },
  ]);
}
function girderGeo() {
  return merged([
    { g: BOX, p: [0, -0.04, 0], s: [1, 0.08, 2.2] },
    { g: BOX, p: [0, -0.2, 0], s: [1, 0.24, 0.3] },
    { g: BOX, p: [0, -0.34, 0], s: [1, 0.07, 1.7] },
  ]);
}

export class RoomView {
  constructor(gfx, def, grid, areaKey) {
    this.gfx = gfx;
    this.def = def;
    this.grid = grid;
    this.areaKey = areaKey;
    this.theme = THEMES[areaKey];
    this.group = new THREE.Group();
    this.anims = [];
    this.slots = new Map(); // "tx,ty" -> [{inst, idx}]
    this.springs = new Map();
    this.insts = [];
    this.mats = [];
    this.lights = [];
    this.emitters = [];
    this.ambient = null;
    this.ambT = 0;
    this.scrollTex = [];
    this.time = 0;
    this.rand = rng(hashStr(def.id));
    this.build();
  }

  m(m) { this.mats.push(m); return m; }

  track(inst, tx, ty, idx) {
    const k = tx + ',' + ty;
    if (!this.slots.has(k)) this.slots.set(k, []);
    this.slots.get(k).push({ inst, idx });
  }

  build() {
    const { def, grid, theme } = this;
    const { w, h } = def;
    const tile = (x, y) => grid.tile(x, y);

    // ---- ambient-occlusion style shading: distance of each solid tile from open air
    const dist = new Int16Array(w * h).fill(99);
    const q = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!(FLAGS[def.tiles[y * w + x]] & F_SOLID)) { dist[y * w + x] = 0; q.push(x, y); }
    }
    for (let qi = 0; qi < q.length; qi += 2) {
      const x = q[qi], y = q[qi + 1], d = dist[y * w + x];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (dist[ny * w + nx] > d + 1) { dist[ny * w + nx] = d + 1; q.push(nx, ny); }
      }
    }
    const shade = (x, y) => {
      const d = Math.max(1, dist[y * w + x]);
      return (0.36 + 0.64 * Math.exp(-(d - 1) * 0.5)) * (0.93 + this.rand() * 0.1);
    };

    // ---- materials
    const solidMat = this.m(new THREE.MeshStandardMaterial({ map: getTexture(theme.solid.tex), color: theme.solid.color, roughness: 0.95 }));
    const capMat = this.m(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
    const crateMat = this.m(new THREE.MeshStandardMaterial({ map: getTexture('crate'), roughness: 0.9 }));
    const slabMat = this.m(new THREE.MeshStandardMaterial({ map: getTexture('slab'), roughness: 0.85, emissive: 0x552200, emissiveMap: getTexture('slab'), emissiveIntensity: 0.28 }));
    const crumbleMat = this.m(new THREE.MeshStandardMaterial({ map: getTexture('scorch'), color: 0xe0c8a0, roughness: 0.95 }));
    const ladderMat = this.m(new THREE.MeshStandardMaterial({ color: theme.ladder, roughness: 0.6, metalness: this.areaKey === 'tower' || this.areaKey === 'quarry' ? 0.5 : 0 }));
    const vineMat = this.m(new THREE.MeshStandardMaterial({ color: 0x3f9a3a, roughness: 0.9 }));
    const spikeMat = this.m(new THREE.MeshStandardMaterial({ color: this.areaKey === 'jungle' ? 0xe8dcc0 : this.areaKey === 'temple' ? 0xd6dccf : 0xb9c2cc, roughness: 0.45, metalness: this.areaKey === 'jungle' ? 0 : 0.6 }));

    const onew = this.onewayStyle();

    const I = {
      solid: new Instancer(BOX, solidMat, { cast: true, receive: true }),
      cap: new Instancer(BOX, capMat, { cast: true, receive: true }),
      crate: new Instancer(BOX, crateMat, { cast: true, receive: true }),
      slab: new Instancer(BOX, slabMat, { cast: true, receive: true }),
      crumble: new Instancer(BOX, crumbleMat, { cast: true, receive: true }),
      ladder: new Instancer(ladderGeo(), ladderMat, { cast: true }),
      vine: new Instancer(vineGeo(), vineMat, { cast: false }),
      spikeUp: new Instancer(spikeGeo(), spikeMat, { cast: true }),
      spikeDown: new Instancer(spikeGeo(), spikeMat, { cast: true }),
      oneway: new Instancer(onew.geo, onew.mat, { cast: true, receive: true }),
    };
    const gateColors = { [T.GATE_A]: 0x35e6ff, [T.GATE_B]: 0xff5ad8 };
    const gateInst = {};
    for (const t of [T.GATE_A, T.GATE_B]) {
      const c = gateColors[t];
      const bars = this.m(new THREE.MeshStandardMaterial({ color: 0x20262e, emissive: c, emissiveIntensity: 1.6, roughness: 0.4, metalness: 0.4 }));
      const field = this.m(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
      gateInst[t] = { bars: new Instancer(gateBarsGeo(), bars, { cast: false }), field: new Instancer(new THREE.PlaneGeometry(0.95, 0.95), field), mat: bars };
      this.gateMats = (this.gateMats || []).concat(bars);
    }
    const lavaMat = this.m(new THREE.MeshStandardMaterial({ map: getTexture('lava'), emissive: 0xff5a10, emissiveMap: getTexture('lava'), emissiveIntensity: 1.5, roughness: 0.6 }));
    const waterMat = this.m(new THREE.MeshStandardMaterial({ map: getTexture('water'), color: 0xbfe8ff, transparent: true, opacity: 0.78, roughness: 0.15, metalness: 0.1, depthWrite: false }));
    I.lava = new Instancer(BOX, lavaMat, { receive: false });
    I.water = new Instancer(BOX, waterMat);
    this.scrollTex = [getTexture('lava'), getTexture('water')];
    const lavaRuns = [];

    // ---- walk the grid
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = def.tiles[y * w + x];
      if (t === T.EMPTY) continue;
      const cx = x + 0.5, cy = y + 0.5;
      switch (t) {
        case T.SOLID: {
          const f = shade(x, y);
          I.solid.add(cx, cy, ZC, { sz: DEPTH, color: [f, f, f] });
          const above = tile(x, y + 1);
          if (theme.solid.cap && !(FLAGS[above] & F_SOLID) && y + 1 < h + 1) {
            const c = new THREE.Color((x + y) % 3 === 0 ? theme.solid.capAlt : theme.solid.cap).multiplyScalar(0.9 + this.rand() * 0.2);
            I.cap.add(cx, y + 1 - 0.1, ZC + 0.02, { sx: 1.0, sy: 0.26, sz: DEPTH + 0.16, color: c });
          }
          break;
        }
        case T.ROLL_BLOCK: this.track(I.crate, x, y, I.crate.add(cx, cy, 0.05, { sx: 0.98, sy: 0.98, sz: 1.9 })); break;
        case T.POUND_BLOCK: this.track(I.slab, x, y, I.slab.add(cx, cy, ZC, { sx: 0.99, sy: 0.99, sz: DEPTH * 0.98 })); break;
        case T.CRUMBLE: this.track(I.crumble, x, y, I.crumble.add(cx, cy, ZC + 0.1, { sx: 0.97, sy: 0.97, sz: DEPTH - 0.4, color: [0.95 + this.rand() * 0.1, 0.9, 0.85] })); break;
        case T.ONEWAY: I.oneway.add(cx, y + onew.top, onew.z, { rz: onew.rot, color: onew.tint ? [0.9 + this.rand() * 0.2, 0.9 + this.rand() * 0.2, 0.9 + this.rand() * 0.1] : undefined }); break;
        case T.LADDER_TOP:
          I.oneway.add(cx, y + onew.top, onew.z, { rz: onew.rot });
          I.ladder.add(cx, y, -0.15);
          break;
        case T.LADDER: I.ladder.add(cx, y, -0.15); break;
        case T.VINE: I.vine.add(cx + (this.rand() - 0.5) * 0.18, y, -0.1 - this.rand() * 0.4, { ry: this.rand() * 3, rz: (this.rand() - 0.5) * 0.12, color: [0.8 + this.rand() * 0.3, 0.9 + this.rand() * 0.2, 0.8] }); break;
        case T.SPIKE_UP: I.spikeUp.add(cx, y, 0); break;
        case T.SPIKE_DOWN: I.spikeDown.add(cx, y + 1, 0, { rx: Math.PI }); break;
        case T.GATE_A: case T.GATE_B: {
          const g = gateInst[t];
          this.track(g.bars, x, y, g.bars.add(cx, cy, 0));
          this.track(g.field, x, y, g.field.add(cx, cy, 0.0));
          break;
        }
        case T.LAVA: {
          const top = tile(x, y + 1) !== T.LAVA;
          this.track(I.lava, x, y, I.lava.add(cx, top ? y + 0.45 : cy, ZC, { sx: 1.0, sy: top ? 0.9 : 1.0, sz: DEPTH }));
          if (top) lavaRuns.push(x, y);
          break;
        }
        case T.WATER: {
          const top = tile(x, y + 1) !== T.WATER;
          I.water.add(cx, top ? y + 0.4 : cy, ZC + 0.4, { sx: 1.0, sy: top ? 0.8 : 1.0, sz: DEPTH * 0.7 });
          break;
        }
        case T.SPRING: this.makeSpring(x, y); break;
        default: break;
      }
    }
    for (const inst of Object.values(I)) { inst.build(this.group); this.insts.push(inst); }
    for (const g of Object.values(gateInst)) { g.bars.build(this.group); g.field.build(this.group); this.insts.push(g.bars, g.field); }

    // ---- dark earth under the room so nothing but ground is visible below the lowest row (the tower is an open abyss)
    if (this.areaKey !== 'tower') {
      const under = new THREE.Mesh(new THREE.BoxGeometry(w + 120, 70, DEPTH), this.m(new THREE.MeshStandardMaterial({ map: getTexture(theme.solid.tex), color: 0x30302c, roughness: 1 })));
      under.position.set(w / 2, -35, ZC);
      under.receiveShadow = true;
      this.group.add(under);
    }

    // ---- back wall for interior themes
    if (theme.back) {
      const tex = getTexture(theme.back.tex).clone();
      tex.needsUpdate = true;
      tex.repeat.set((w + 40) / 5, (h + 40) / 5);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(w + 40, h + 40), this.m(new THREE.MeshStandardMaterial({ map: tex, color: theme.back.color, roughness: 1 })));
      wall.position.set(w / 2, h / 2, 1.0 - DEPTH - 0.2);
      wall.receiveShadow = true;
      this.group.add(wall);
      this.backTex = tex;
    }

    // ---- lava glow lights (pooled, see Gfx.setPointLights)
    this.pointLights = [];
    if (lavaRuns.length) {
      const picks = Math.min(3, lavaRuns.length / 2);
      for (let i = 0; i < picks; i++) {
        const k = Math.floor((i + 0.5) * (lavaRuns.length / 2) / picks) * 2;
        this.pointLights.push({ x: lavaRuns[k] + 0.5, y: lavaRuns[k + 1] + 2.2, z: 2.5, color: 0xff6a20, intensity: 38, distance: 20 });
      }
    }

    buildDecor(this, theme, def);
  }

  onewayStyle() {
    const t = this.theme.oneway, color = t.color;
    switch (t.style) {
      case 'log': {
        const g = new THREE.CylinderGeometry(0.3, 0.3, 1.02, 12); g.rotateZ(Math.PI / 2);
        const tex = getTexture('bark').clone(); tex.needsUpdate = true;
        return { geo: g, mat: this.m(new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.95 })), top: 0.7, z: 0, rot: 0, tint: true };
      }
      case 'slab': return { geo: new THREE.BoxGeometry(1.0, 0.3, 2.0), mat: this.m(new THREE.MeshStandardMaterial({ map: getTexture('stone'), color, roughness: 0.9 })), top: 0.85, z: -0.2, rot: 0, tint: true };
      case 'crystal': return { geo: new THREE.BoxGeometry(1.0, 0.2, 1.7), mat: this.m(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.88 })), top: 0.9, z: -0.1, rot: 0, tint: false };
      case 'grate': return { geo: new THREE.BoxGeometry(1.0, 0.16, 2.0), mat: this.m(new THREE.MeshStandardMaterial({ map: getTexture('steel'), color, roughness: 0.6, metalness: 0.5 })), top: 0.92, z: -0.1, rot: 0, tint: true };
      case 'girder': return { geo: girderGeo(), mat: this.m(new THREE.MeshStandardMaterial({ color: 0xff9a2e, roughness: 0.5, metalness: 0.3, emissive: 0x401800, emissiveIntensity: 0.35 })), top: 1.0, z: -0.1, rot: 0, tint: false };
      default: return { geo: new THREE.BoxGeometry(1, 0.3, 2), mat: this.m(new THREE.MeshStandardMaterial({ color })), top: 0.85, z: 0, rot: 0 };
    }
  }

  makeSpring(x, y) {
    const g = new THREE.Group();
    g.position.set(x + 0.5, y, 0);
    const tire = this.m(new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.7 }));
    const hub = this.m(new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.5 }));
    const t1 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.15, 10, 22), tire); t1.rotation.x = Math.PI / 2; t1.position.y = 0.17; t1.castShadow = true;
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.14, 10, 22), tire); t2.rotation.x = Math.PI / 2; t2.position.y = 0.46; t2.castShadow = true;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 18), hub); cap.position.y = 0.62; cap.castShadow = true;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1.7), tire); base.position.y = 0.1; base.receiveShadow = true;
    g.add(t1, t2, cap, base);
    this.group.add(g);
    this.springs.set(x + ',' + y, { g, t: 0 });
  }

  bounceSpring(tx, ty) {
    const s = this.springs.get(tx + ',' + ty);
    if (s) s.t = 0.001;
  }

  /** A tile changed at runtime (broken, crumbled, restored, gate opened). */
  setTile(tx, ty, t) {
    const list = this.slots.get(tx + ',' + ty);
    if (!list) return;
    const visible = t !== T.EMPTY;
    for (const { inst, idx } of list) inst.setVisible(idx, visible);
  }

  /** fx: Particles (optional); (cx, cy): camera focus used to keep ambient particles near the screen. */
  update(dt, fx, cx = 0, cy = 0) {
    this.time += dt;
    const t = this.time;
    if (fx) this.spawnAmbient(dt, fx, cx, cy);
    for (const a of this.anims) a(t, dt);
    this.scrollTex[0].offset.x = (t * 0.035) % 1; this.scrollTex[0].offset.y = (t * 0.02) % 1;
    this.scrollTex[1].offset.x = (t * 0.06) % 1;
    for (const m of this.gateMats || []) m.emissiveIntensity = 1.3 + Math.sin(t * 5) * 0.35;
    for (const s of this.springs.values()) {
      if (s.t > 0) { s.t += dt; const k = s.t; s.g.scale.y = 1 + Math.sin(Math.min(k, 0.4) / 0.4 * Math.PI) * 0.35 - (k < 0.15 ? 0.45 * Math.sin(k / 0.15 * Math.PI * 0.5) : 0); if (s.t > 0.45) { s.t = 0; s.g.scale.y = 1; } }
    }
  }

  spawnAmbient(dt, fx, cx, cy) {
    const a = this.ambient;
    if (a) {
      this.ambT += dt * a.rate;
      while (this.ambT >= 1) {
        this.ambT -= 1;
        const x = cx + (Math.random() - 0.5) * 30, y = cy + (Math.random() - 0.5) * 17;
        switch (a.kind) {
          case 'pollen': fx.spark(x, y, { z: -1 + Math.random() * 2, vx: 0.3 + Math.random() * 0.5, vy: (Math.random() - 0.3) * 0.5, color: Math.random() < 0.5 ? 0xfff3a0 : 0xc8ff9a, size: 0.14 + Math.random() * 0.12, life: 4 + Math.random() * 3, alpha: 0.75, grav: 0, drag: 0 }); break;
          case 'dust': fx.spark(x, y, { z: -0.5 + Math.random(), vx: (Math.random() - 0.5) * 0.3, vy: -0.15 - Math.random() * 0.2, color: 0xbff7ee, size: 0.1 + Math.random() * 0.1, life: 5 + Math.random() * 3, alpha: 0.5, grav: 0, drag: 0 }); break;
          case 'glowworm': fx.spark(x, y, { z: -1 + Math.random() * 2, vx: (Math.random() - 0.5) * 0.6, vy: 0.2 + Math.random() * 0.4, color: Math.random() < 0.5 ? 0x7fffe8 : 0xff9aea, size: 0.13 + Math.random() * 0.12, life: 4 + Math.random() * 3, alpha: 0.85, grav: 0, drag: 0 }); break;
          case 'ember': fx.spark(x, cy - 8 + Math.random() * 3, { z: -1 + Math.random() * 2, vx: (Math.random() - 0.5) * 1.2, vy: 1.4 + Math.random() * 2.2, color: Math.random() < 0.5 ? 0xff7a2a : 0xffc04a, size: 0.12 + Math.random() * 0.14, life: 2.5 + Math.random() * 2.5, alpha: 0.9, grav: -0.2, drag: 0.05 }); break;
          case 'spark': fx.spark(x, y, { z: -1 + Math.random() * 2, vx: (Math.random() - 0.5) * 0.8, vy: -1 - Math.random() * 1.5, color: 0xffd27a, size: 0.09 + Math.random() * 0.08, life: 1.5 + Math.random() * 1.5, alpha: 0.8, grav: 2, drag: 0.1 }); break;
          default: break;
        }
      }
    }
    for (const e of this.emitters) {
      if (e.kind === 'mist' && Math.random() < dt * 14 && Math.abs(e.x - cx) < 30) fx.puffAt(e.x + (Math.random() - 0.5) * e.w, e.y, { z: -1.5, vx: (Math.random() - 0.5) * 0.8, vy: 0.5 + Math.random() * 1.2, size: 1.2, life: 1.2, alpha: 0.28, color: 0xeafcff, grow: 1.4 });
    }
  }

  dispose() {
    // free GPU buffers of everything the room created; three.js re-uploads a shared geometry (BOX, CYL, ...) on demand
    this.group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); if (o.geometry) o.geometry.dispose(); });
    for (const m of this.mats) m.dispose();
    this.group.parent?.remove(this.group);
  }
}
