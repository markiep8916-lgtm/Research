// Battle arenas (TECH_PLAN 7.5): a lit pixel-art diorama per arena name, built from registered
// textures. Floors and wall runs are instanced per texture, so a whole arena is a few dozen draw calls.
//
//   registerArena(name, { theme, build(kit), react?(kit, event), textures? })
//   buildArena(scene, name, { quality }) -> { name, kit, theme, lights, emitters, fogDensity,
//                                              update(dt, t, camera), react(event), dispose() }
//
// The four POC arenas (corridor, engineering, bridge, cryo) are registered here; content registers
// the rest through its `arena.js` files. `theme = { background, fog, fogDensity, hemi, key, rimParty,
// rimEnemy, fill }`.
//
// Light budget by quality (11.6): the kit creates every light before `build` runs, so all arenas on a
// quality share shader programs: hemisphere 1, directional 3 (key with shadow, fill, one spare), point
// lights 6 / 4 / 2 (two rims plus a pool of 4 / 2 / 0) and one spot on high only. Builders get extra
// lights only from kit.pointLight / kit.dirLight / kit.spotLight (or kit.lamp / kit.light, which draw
// from the same pool): each returns the pooled light, or an inert stand-in once this quality's pool is
// used up. Asking beyond the high budget reports console.error. The key's shadow map is 2048 / 1024 /
// off. Everything the kit creates is tracked and released with the arena (cached art canvases stay
// cached); materials go through programs.release so the next battle in the arena compiles nothing.

import * as THREE from 'three';
import { makeMaterial, textureSet, setTextureFrame } from '../art/tiles.js';
import { noteMissingArt } from '../art/cache.js';
import { makeGlow, makeLightShaft, makeFlicker } from '../core/vfx.js';
import { release } from '../core/programs.js';
import { makeRng } from '../core/util.js';

const WALL_Z = -6;
const X0 = -15, X1 = 15, Z1 = 10;          // floor extent (the wall closes the north side)
const WALL_H = 3;

// space_backdrop: 1024x512 painting, planet centre at texel (690, 262)
const SPACE_W = 34, SPACE_H = 17, SPACE_Z = -13;
const PLANET_U = 690 / 1024, PLANET_V = 262 / 512;

export const LIGHT_BUDGET = {
  high: { pool: 4, spot: true, shadow: 2048 },
  medium: { pool: 2, spot: false, shadow: 1024 },
  low: { pool: 0, spot: false, shadow: 0 },
};
const MAX_POOL = LIGHT_BUDGET.high.pool;

const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const FLAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

function place(obj, position) {
  if (position) obj.position.set(...(Array.isArray(position) ? position : [position.x, position.y, position.z]));
}

/** Arena builder kit: the POC helper builders as methods, owning every disposable and the light pool. */
export class ArenaKit {
  constructor(scene, { quality = 'high', seed = 7 } = {}) {
    this.scene = scene;
    this.quality = LIGHT_BUDGET[quality] ? quality : 'high';
    this.budget = LIGHT_BUDGET[this.quality];
    this.root = new THREE.Group();
    this.root.name = 'arena';
    scene.add(this.root);
    this.mats = new Map();
    this.geos = new Map();
    this.textures = [];
    this.materials = [];
    this.animated = [];
    this.flickers = [];
    this.updaters = [];
    this.emitters = [];          // particle emitter specs [preset, opts]; the stage starts them
    this.lights = [];
    this.pool = [];
    this.rng = makeRng(seed);
    this.particles = null;       // set by the stage once its particle system exists (react handlers)
    this.effects = null;
    this.engine = null;
    this.X0 = X0; this.X1 = X1; this.Z1 = Z1; this.WALL_Z = WALL_Z; this.WALL_H = WALL_H;
    this._asked = { point: 0, dir: 0, spot: 0 };
  }

  // ------------------------------------------------------------------ lights

  /** Creates the fixed light set for the theme (called before build). */
  baseLights(th) {
    const add = (l) => { this.lights.push(l); this.root.add(l); if (l.target) this.root.add(l.target); return l; };
    this.hemi = add(new THREE.HemisphereLight(th.hemi[0], th.hemi[1], th.hemi[2]));
    const key = add(new THREE.DirectionalLight(th.key[0], th.key[1]));
    key.position.set(...th.key[2]);
    key.target.position.set(0, 0, 0);
    if (this.budget.shadow) {
      key.castShadow = true;
      key.shadow.mapSize.set(this.budget.shadow, this.budget.shadow);
      Object.assign(key.shadow.camera, { left: -13, right: 13, top: 10, bottom: -10, near: 1, far: 45 });
      key.shadow.bias = -0.0005;
      key.shadow.normalBias = 0.02;
    }
    // soft frontal fill keeps sprite colours readable; coloured rims sit beside each line of combatants
    const fill = add(new THREE.DirectionalLight(th.fill[0], th.fill[1]));
    fill.position.set(2, 3, 12);
    this.spare = add(new THREE.DirectionalLight('#ffffff', 0));
    this.spare.position.set(0, 10, 0);
    const rimParty = add(new THREE.PointLight(th.rimParty[0], th.rimParty[1], 11, 1.6));
    rimParty.position.set(8.5, 2.8, -0.5);
    const rimEnemy = add(new THREE.PointLight(th.rimEnemy[0], th.rimEnemy[1], 12, 1.6));
    rimEnemy.position.set(-9.5, 3.2, 0.5);
    for (let i = 0; i < this.budget.pool; i++) {
      const l = add(new THREE.PointLight('#ffffff', 0, 1, 2));
      l.position.set(0, -50, 0);
      this.pool.push(l);
    }
    this.spot = this.budget.spot ? add(new THREE.SpotLight('#ffffff', 0, 1, 0.5, 0.5, 2)) : null;
    this.base = { key, fill, rimParty, rimEnemy };
    return this.base;
  }

  /** A point light from the pool (priority = call order), or an inert stand-in when this quality's pool is used up. */
  pointLight({ color = '#ffffff', intensity = 1, distance = 0, decay = 2, position = null } = {}) {
    const n = this._asked.point++;
    if (n >= MAX_POOL) console.error(`arena: point light ${n + 1} is over the budget of ${MAX_POOL} extra point lights`);
    const l = n < this.pool.length ? this.pool[n] : new THREE.PointLight();
    l.color.set(color);
    l.intensity = intensity;
    l.distance = distance;
    l.decay = decay;
    place(l, position);
    return l;
  }

  /** The spare directional light (one per arena). */
  dirLight({ color = '#ffffff', intensity = 1, position = null, target = null } = {}) {
    const n = this._asked.dir++;
    if (n >= 1) console.error('arena: only one extra directional light is available');
    const l = n === 0 ? this.spare : new THREE.DirectionalLight();
    l.color.set(color);
    l.intensity = intensity;
    place(l, position);
    if (target) place(l.target, target);
    return l;
  }

  /** The spot light (high quality only; a stand-in otherwise). Its target is l.target. */
  spotLight({ color = '#ffffff', intensity = 1, distance = 0, angle = Math.PI / 3, penumbra = 0, decay = 2, position = null, target = null } = {}) {
    const n = this._asked.spot++;
    if (n >= 1) console.error('arena: only one spot light is available');
    const l = n === 0 && this.spot ? this.spot : new THREE.SpotLight();
    l.color.set(color);
    Object.assign(l, { intensity, distance, angle, penumbra, decay });
    place(l, position);
    if (target) place(l.target, target);
    return l;
  }

  /** Routes a light object into the budget (POC builders): returns the pooled light that stands in for it. */
  light(l) {
    if (l.isSpotLight) return this.spotLight({ color: l.color, intensity: l.intensity, distance: l.distance, angle: l.angle, penumbra: l.penumbra, decay: l.decay, position: l.position });
    if (l.isDirectionalLight) return this.dirLight({ color: l.color, intensity: l.intensity, position: l.position });
    if (l.isPointLight) return this.pointLight({ color: l.color, intensity: l.intensity, distance: l.distance, decay: l.decay, position: l.position });
    console.error('arena: kit.light accepts point, directional and spot lights only');
    return l;
  }

  // ------------------------------------------------------------------ materials and meshes

  mat(name, opts = {}) {
    const key = `${name}|${JSON.stringify(opts)}`;
    let m = this.mats.get(key);
    if (m) return m;
    m = makeMaterial(name, opts);
    const set = m.userData.set;
    for (const t of [set.map, set.normalMap, set.emissiveMap]) if (t) this.textures.push(t);
    if (set.frames > 1) this.animated.push({ set, fps: set.fps, phase: this.rng() * 4 });
    this.mats.set(key, m);
    this.materials.push(m);
    return m;
  }

  plain(color, roughness = 0.7, metalness = 0.25) {
    const key = `plain|${color}|${roughness}|${metalness}`;
    let m = this.mats.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      this.mats.set(key, m);
      this.materials.push(m);
    }
    return m;
  }

  /** Tracks a material or texture created by a builder so the arena releases it. */
  track(obj) {
    if (obj?.isMaterial) this.materials.push(obj);
    else if (obj?.isTexture) this.textures.push(obj);
    else if (obj?.isBufferGeometry) this.geos.set(`t${this.geos.size}`, obj);
    return obj;
  }

  plane(w, h) {
    const key = `p${w}x${h}`;
    let g = this.geos.get(key);
    if (!g) { g = new THREE.PlaneGeometry(w, h); this.geos.set(key, g); }
    return g;
  }

  add(obj) {
    this.root.add(obj);
    return obj;
  }

  /** Particle emitter started with the arena (same options as Particles.addEmitter). */
  emitter(preset, opts) {
    this.emitters.push([preset, opts]);
  }

  /** One InstancedMesh per material for a list of [material, matrix] placements. */
  instanced(geo, groups, { receive = true, cast = false } = {}) {
    for (const [material, mats] of groups) {
      if (!mats.length) continue;
      const mesh = new THREE.InstancedMesh(geo, material, mats.length);
      mats.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.receiveShadow = receive;
      mesh.castShadow = cast;
      mesh.computeBoundingSphere();
      this.add(mesh);
    }
  }

  /** Tiled floor; pick(x, z) returns the texture name of the 1x1 cell at (x..x+1, z..z+1). */
  floor(pick, opts = {}) {
    const groups = new Map();
    for (let z = WALL_Z; z < Z1; z++) {
      for (let x = X0; x < X1; x++) {
        const name = pick(x, z);
        if (!name) continue;
        const m = this.mat(name, opts[name] || {});
        if (!groups.has(m)) groups.set(m, []);
        groups.get(m).push(new THREE.Matrix4().compose(_v.set(x + 0.5, 0, z + 0.5), FLAT, _s));
      }
    }
    this.instanced(this.plane(1, 1), groups);
  }

  /**
   * Wall run along z: pieces are texture names laid left to right from x0 (window_frame is 2 wide,
   * door_frame 0.25). Repeats `pieces` until x1. opts[name] passes material options.
   */
  wallRun(pieces, { x0 = X0, x1 = X1, y = 0, z = WALL_Z, h = WALL_H, opts = {} } = {}) {
    const byGeo = new Map();
    let x = x0, i = 0;
    while (x < x1 - 0.01) {
      const name = pieces[i++ % pieces.length];
      const w = name === 'window_frame' ? 2 : name === 'door_frame' ? 0.25 : 1;
      const o = { ...(opts[name] || {}) };
      if (name === 'window_frame') Object.assign(o, { transparent: true, alphaTest: 0.02 });
      const m = this.mat(name, o);
      const key = `${w}`;
      if (!byGeo.has(key)) byGeo.set(key, { geo: this.plane(w, h), groups: new Map() });
      const g = byGeo.get(key).groups;
      if (!g.has(m)) g.set(m, []);
      g.get(m).push(new THREE.Matrix4().makeTranslation(x + w / 2, y + h / 2, z));
      x += w;
    }
    for (const { geo, groups } of byGeo.values()) this.instanced(geo, groups);
  }

  box([w, h, d], mats, [x, y, z], rotY = 0) {
    const key = `b${w}x${h}x${d}`;
    let g = this.geos.get(key);
    if (!g) { g = new THREE.BoxGeometry(w, h, d); this.geos.set(key, g); }
    const mesh = new THREE.Mesh(g, mats);
    mesh.position.set(x, y + h / 2, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return this.add(mesh);
  }

  crate(x, z, s = 1, rot = 0, y = 0) {
    const side = this.mat('crate_side'), top = this.mat('crate_top');
    const m = this.box([1, 1, 1], [side, side, top, top, side, side], [x, y, z], rot);
    m.scale.setScalar(s);
    m.position.y = y + s / 2;
    return m;
  }

  consoleBox(x, z, rot = 0) {
    const metal = this.plain('#323b4e', 0.6, 0.4);
    return this.box([1, 1, 0.7], [metal, metal, this.mat('console_top'), metal, this.mat('console_front', { emissiveIntensity: 2.2 }), metal], [x, 0, z], rot);
  }

  cryoPod(x, z, rot = 0) {
    const side = this.plain('#5d6780', 0.5, 0.4);
    return this.box([1, 2, 0.75], [side, side, side, side, this.mat('cryo_pod', { emissiveIntensity: 1.7 }), side], [x, 0, z], rot);
  }

  /** Flat sprite-like prop (bench, sign, lamp fixture) facing +Z. */
  decalPlane(name, w, h, [x, y, z], opts = {}) {
    const m = new THREE.Mesh(this.plane(w, h), this.mat(name, opts));
    m.position.set(x, y, z);
    m.receiveShadow = true;
    return this.add(m);
  }

  floorDecal(name, [x, z], rot = 0, s = 1) {
    const m = new THREE.Mesh(this.plane(s, s), this.mat(name, { transparent: true, alphaTest: 0.02 }));
    m.material.depthWrite = false;
    m.material.polygonOffset = true;
    m.material.polygonOffsetFactor = -2;
    m.rotation.set(-Math.PI / 2, 0, rot);
    m.position.set(x, 0.004, z);
    m.receiveShadow = true;
    return this.add(m);
  }

  /** Clutter at the bottom-left of the frame: the tilt-shift blurs it into miniature foreground. */
  foreground(heavy = false) {
    this.crate(-4.7, 6.1, 1.15, 0.35);
    this.crate(-4.5, 6.15, 0.75, -0.25, 1.15);
    this.crate(-3.2, 6.9, 0.85, 0.6);
    if (heavy) this.crate(-6, 6.6, 1, -0.2);
  }

  /** Wall lamp: fixture texture + glow sprite (+ optional pooled point light, optionally flickering). */
  lamp([x, y, z], color, { light = 0, distance = 8, flicker = null } = {}) {
    this.decalPlane('ceiling_lamp', 0.5, 0.5, [x, y, z + 0.02], { alphaTest: 0.5, emissiveIntensity: 2.6 });
    const g = this.add(makeGlow(color, 1.1, 1.2));
    g.position.set(x, y, z + 0.08);
    if (light <= 0) return { glow: g, light: null };
    const l = this.pointLight({ color, intensity: light, distance, decay: 1.7, position: [x, y - 0.25, z + 0.9] });
    if (flicker) this.flickers.push(makeFlicker(l, { mode: flicker, amount: 0.7, speed: 6, glow: g }));
    return { glow: g, light: l };
  }

  shaft([x, y, z], { width = 1.3, height = 7.5, color = '#9fd8ff', opacity = 0.16, tilt = 0.7, lean = 0.3 } = {}) {
    const s = makeLightShaft({ width, height, color, opacity, floorFade: 1.1 });
    s.position.set(x, y, z);
    s.rotation.set(-tilt, 0, lean);
    return this.add(s);
  }

  /** Painted space behind the windows, kept at a fixed angular position (it is "infinitely" far). */
  space({ backdrop = 'space_backdrop', aimX = 1, aimY = 1.6 } = {}) {
    const set = textureSet(backdrop);
    this.textures.push(set.map, set.normalMap, set.emissiveMap);
    const mat = new THREE.MeshBasicMaterial({ map: set.map, fog: false });
    this.materials.push(mat);
    const plane = this.add(new THREE.Mesh(new THREE.PlaneGeometry(SPACE_W, SPACE_H), mat));
    const stars = textureSet('stars_layer', { repeat: [6, 3] });
    this.textures.push(stars.map, stars.normalMap, stars.emissiveMap);
    const smat = new THREE.MeshBasicMaterial({ map: stars.map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.materials.push(smat);
    const starPlane = this.add(new THREE.Mesh(new THREE.PlaneGeometry(SPACE_W * 2.4, SPACE_H * 2.4), smat));
    starPlane.renderOrder = -2;
    // hull: everything above the wall top is the ship's dark ceiling, so space only shows through glass
    const hullMat = new THREE.MeshBasicMaterial({ color: '#05070d', fog: false });
    this.materials.push(hullMat);
    const hull = this.add(new THREE.Mesh(new THREE.PlaneGeometry(120, 60), hullMat));
    hull.position.set(0, 2 * WALL_H + 30, WALL_Z - 0.06);
    const refZ = 14;
    const planetU = backdrop === 'space_backdrop' ? PLANET_U : 0.5, planetV = backdrop === 'space_backdrop' ? PLANET_V : 0.5;
    this.updaters.push((dt, t, cam) => {
      if (!cam) return;
      // the planet centre sits on the ray from the camera through the aim point on the wall
      const k = (SPACE_Z - cam.position.z) / (WALL_Z - cam.position.z);
      const scale = (cam.position.z - SPACE_Z) / (refZ - SPACE_Z);
      const px = cam.position.x + (aimX - cam.position.x) * k;
      const py = cam.position.y + (aimY - cam.position.y) * k;
      plane.scale.setScalar(scale);
      plane.position.set(px - (planetU - 0.5) * SPACE_W * scale, py - (0.5 - planetV) * SPACE_H * scale, SPACE_Z);
      starPlane.scale.setScalar(scale);
      starPlane.position.set(plane.position.x * 0.6, plane.position.y * 0.6, SPACE_Z - 0.5);
      stars.map.offset.x = t * 0.002;
    });
    return plane;
  }

  dispose() {
    for (const f of this.flickers) f.dispose();
    const own = new Set(this.materials);
    const shared = new Set(this.geos.values());
    this.root.traverse((o) => {
      if (!(o.isMesh || o.isSprite || o.isPoints)) return;
      if (o.isInstancedMesh) o.dispose();
      else if (o.geometry && !o.isSprite && !shared.has(o.geometry)) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) if (m && !own.has(m)) { own.add(m); release(m); }
    });
    for (const g of shared) g.dispose();
    for (const m of this.materials) release(m);
    for (const t of this.textures) t?.dispose();
    for (const l of this.lights) l.dispose?.();
    this.root.removeFromParent();
  }
}

// ------------------------------------------------------------------ registry

/** Registered arenas: name -> { theme, build(kit), react?(kit, event), textures? }. */
export const ARENAS = {};

export function registerArena(name, def) {
  if (!def || typeof def.build !== 'function' || !def.theme) {
    console.error(`registerArena: "${name}" needs a theme and a build(kit) function`);
    return;
  }
  ARENAS[name] = def;
}

export function arenaNames() {
  return Object.keys(ARENAS);
}

/**
 * Builds the arena `name` into `scene` and returns
 * { name, kit, theme, lights: { key, rimParty, rimEnemy }, emitters, fogDensity, update(dt, t, camera),
 *   react(event), dispose() }.
 */
export function buildArena(scene, name = 'corridor', { quality = 'high' } = {}) {
  let id = name;
  if (!ARENAS[id]) {
    if (noteMissingArt('arena', name)) console.warn(`arena "${name}" is not registered: using corridor`);
    id = 'corridor';
  }
  const def = ARENAS[id];
  const th = def.theme;
  const kit = new ArenaKit(scene, { quality });
  scene.background = new THREE.Color(th.background);
  scene.fog = new THREE.FogExp2(th.fog, th.fogDensity);
  const lights = kit.baseLights(th);
  const extra = def.build(kit) || {};
  const emitters = [['dust', { position: [0, 1.6, 1], area: [24, 3.2, 12], rate: 8, color: extra.dust }], ...(extra.emitters || []), ...kit.emitters];
  return {
    name: id,
    kit,
    theme: th,
    lights,
    emitters,
    fogDensity: th.fogDensity,
    update(dt, t, camera) {
      for (const a of kit.animated) setTextureFrame(a.set, (t + a.phase) * a.fps);
      for (const u of kit.updaters) u(dt, t, camera);
    },
    /** transform / untargetable / break / cue events (TECH_PLAN 7.5). */
    react(event) {
      def.react?.(kit, event);
    },
    dispose() {
      kit.dispose();
      if (scene.fog) scene.fog = null;
    },
  };
}

// ------------------------------------------------------------------ the POC arenas

const THEMES = {
  corridor: {
    background: '#060a14', fog: '#0b1426', fogDensity: 0.03,
    hemi: ['#4a5f8f', '#0a0c14', 0.85], key: ['#d6e4ff', 1.35, [-7, 12, 10]],
    rimParty: ['#ffae55', 26], rimEnemy: ['#4fc8ff', 22], fill: ['#9fc4ff', 0.35],
  },
  engineering: {
    background: '#0b0608', fog: '#1a0c12', fogDensity: 0.032,
    hemi: ['#5c4a6a', '#120a0a', 0.7], key: ['#ffd9b8', 1.15, [-7, 12, 10]],
    rimParty: ['#ffa040', 28], rimEnemy: ['#ff4fa8', 24], fill: ['#ffb380', 0.3],
  },
  bridge: {
    background: '#03050c', fog: '#071024', fogDensity: 0.024,
    hemi: ['#3c5288', '#05070e', 0.8], key: ['#c4d8ff', 1.2, [-6, 12, 10]],
    rimParty: ['#ffb45a', 22], rimEnemy: ['#7fd2ff', 30], fill: ['#a8c8ff', 0.4],
  },
  cryo: {
    background: '#050b12', fog: '#0c1a26', fogDensity: 0.03,
    hemi: ['#5f86a8', '#081018', 0.9], key: ['#e0f4ff', 1.25, [-7, 12, 10]],
    rimParty: ['#ffc070', 20], rimEnemy: ['#7ff4ff', 26], fill: ['#bfe8ff', 0.4],
  },
};

function corridor(kit) {
  const r = kit.rng;
  kit.floor((x, z) => {
    if (z === WALL_Z) return 'floor_hazard';
    return r() < 0.28 ? 'floor_plate_worn' : 'floor_plate';
  });
  kit.wallRun(['wall_panel', 'window_frame', 'wall_panel_screen', 'window_frame', 'wall_panel_vent', 'window_frame'], {
    x0: X0 + 0.5, opts: { wall_panel_screen: { emissiveIntensity: 2.2 }, window_frame: { emissiveIntensity: 1.4 } },
  });
  kit.wallRun(['wall_pipes'], { y: WALL_H, x0: X0 + 0.5 });
  kit.decalPlane('sign_spine', 2, 0.5, [0.5, WALL_H + 0.45, WALL_Z + 0.03], { emissiveIntensity: 2.4 });
  // amber work lamps over the wall panels; one of them is failing
  for (const [x, l, f] of [[-11, 0, null], [-6.5, 18, null], [-2, 0, null], [2.5, 0, 'flicker'], [7, 18, null], [11.5, 0, null]]) {
    kit.lamp([x, 2.62, WALL_Z], '#ffbf4d', { light: l, distance: 9, flicker: f });
  }
  for (const [x, lean] of [[-8.5, 0.35], [-3.5, 0.28], [1, 0.3], [5.5, 0.22], [10, 0.3]]) {
    kit.shaft([x, 2.85, WALL_Z + 0.1], { lean, opacity: 0.15, height: 8.5 });
  }
  // benches and a console against the wall, decals underfoot
  for (const x of [-9.7, 7.6]) kit.decalPlane('bench', 1, 1, [x, 0.5, WALL_Z + 0.45], { alphaTest: 0.5 });
  kit.consoleBox(-5, WALL_Z + 0.4);
  kit.consoleBox(12.5, WALL_Z + 0.4);
  kit.floorDecal('decal_arrow', [-0.5, -3.5], Math.PI / 2);
  kit.floorDecal('decal_grime', [3.5, 1.5], 0.4, 1.6);
  kit.floorDecal('decal_oil', [-5.5, 2.5], 1.1, 1.4);
  kit.foreground();
  kit.space({ aimX: 1, aimY: 1.3 });
  return { dust: '#cfe4ff' };
}

function engineering(kit) {
  const r = kit.rng;
  kit.floor((x, z) => {
    if (z === WALL_Z) return 'floor_hazard';
    if (z === -3 && x > -9 && x < 9) return 'floor_grate';
    return r() < 0.35 ? 'floor_plate_worn' : 'floor_plate';
  }, { floor_grate: { emissiveIntensity: 2.0 } });
  kit.wallRun(['wall_pipes', 'wall_panel_vent', 'locker', 'wall_panel', 'wall_pipes', 'wall_panel_screen', 'door_frame', 'door', 'door_frame', 'wall_panel_vent'], {
    x0: X0, opts: { wall_panel_screen: { emissiveIntensity: 2.2 }, door_frame: { emissiveIntensity: 2.2 }, door: { emissiveIntensity: 2 } },
  });
  kit.wallRun(['wall_pipes'], { y: WALL_H });
  kit.decalPlane('sign_engineering', 2, 0.5, [3.2, WALL_H + 0.45, WALL_Z + 0.03], { emissiveIntensity: 2.4 });
  // reactor column behind the enemy line: tiled energy bands on a cylinder, pulsing light
  const core = textureSet('reactor_core', { repeat: [1, 4] });
  kit.textures.push(core.map, core.normalMap, core.emissiveMap);
  kit.animated.push({ set: core, fps: core.fps, phase: 0 });
  const coreMat = kit.track(new THREE.MeshBasicMaterial({ map: core.emissiveMap || core.map, color: new THREE.Color(1.6, 1.25, 1.35) }));
  const cyl = kit.add(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 8, 20, 1, true), coreMat));
  cyl.position.set(-8.8, 4, -3.6);
  const ring = kit.plain('#2a3142', 0.45, 0.6);
  kit.box([3, 0.5, 3], ring, [-8.8, 0, -3.6], Math.PI / 4);
  kit.box([3, 0.4, 3], ring, [-8.8, 5.6, -3.6], Math.PI / 4);
  const coreGlow = kit.add(makeGlow('#ff7a3a', 4.2, 0.9));
  coreGlow.position.set(-8.8, 2.4, -3.2);
  const coreLight = kit.pointLight({ color: '#ff6a3a', intensity: 42, distance: 13, decay: 1.5, position: [-7.6, 2.2, -2.2] });
  kit.flickers.push(makeFlicker(coreLight, { mode: 'pulse', amount: 0.45, speed: 2.4, glow: coreGlow }));
  // rotating red alarm: a spot light sweeping the floor (high quality) plus its emissive dome
  kit.decalPlane('alarm_light', 0.5, 0.5, [4.6, 2.75, WALL_Z + 0.03], { alphaTest: 0.5, emissiveIntensity: 3 });
  const alarmGlow = kit.add(makeGlow('#ff3b4e', 1.3, 1.2));
  alarmGlow.position.set(4.6, 2.75, WALL_Z + 0.1);
  const spot = kit.spotLight({ color: '#ff2a3c', intensity: 60, distance: 22, angle: 0.42, penumbra: 0.65, decay: 1.4, position: [4.6, 5.5, WALL_Z + 0.8] });
  kit.updaters.push((dt, t) => {
    const a = t * 2.1;
    spot.target.position.set(4.6 + Math.cos(a) * 6, 0, -1 + Math.sin(a) * 4);
    const k = 0.5 + 0.5 * Math.cos(a - 0.6);
    alarmGlow.material.color.copy(alarmGlow.userData.baseColor).multiplyScalar(0.35 + 0.9 * k);
  });
  for (const x of [-4, 9.5]) kit.lamp([x, 2.62, WALL_Z], '#ffb347');
  // crates, a console and grime
  kit.crate(9.2, WALL_Z + 0.7);
  kit.crate(10.3, WALL_Z + 0.75, 0.8, 0.3);
  kit.crate(9.4, WALL_Z + 0.7, 0.7, -0.2, 1);
  kit.consoleBox(-2.2, WALL_Z + 0.4);
  kit.floorDecal('decal_scorch', [-6, 1], 0.2, 1.8);
  kit.floorDecal('decal_oil', [2, -3.4], 0.8, 1.4);
  kit.floorDecal('decal_grime', [6.5, 2.5], 0, 1.8);
  kit.foreground(true);
  return {
    dust: '#ffcf9e',
    emitters: [
      ['ember', { position: [-8.8, 0.8, -2.2], area: [1.6, 0.2, 0.6], rate: 9 }],
      ['steam', { position: [-1.5, 0.05, -2.5], area: [0.2, 0.05, 0.2], rate: 7 }],
      ['steam', { position: [6.5, 0.05, -2.5], area: [0.2, 0.05, 0.2], rate: 6 }],
      ['spark', { position: [-3.4, 2.3, WALL_Z + 0.2], area: [0.1, 0.1, 0.1], rate: 0.9, burst: 12 }],
    ],
  };
}

function bridge(kit) {
  kit.floor((x, z) => (z === WALL_Z ? 'floor_hazard' : 'floor_bridge'), { floor_bridge: { emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.35 } });
  // panoramic glass: a low wall base, then two tiers of window frames
  kit.wallRun(['wall_low'], { h: 0.75 });
  kit.wallRun(['window_frame'], { y: 0.75, opts: { window_frame: { emissiveIntensity: 1.4 } } });
  kit.wallRun(['window_frame'], { y: 0.75 + WALL_H, opts: { window_frame: { emissiveIntensity: 1.4 } } });
  kit.decalPlane('sign_bridge', 2, 0.5, [-0.5, 0.375, WALL_Z + 0.03], { emissiveIntensity: 2.4 });
  for (const x of [-9, -7.9, 7.4, 8.5]) kit.consoleBox(x, WALL_Z + 0.45);
  // holo star-map table behind the party
  const metal = kit.plain('#2a3142', 0.5, 0.5);
  kit.box([2, 0.9, 2], [metal, metal, kit.mat('holo_table', { emissiveIntensity: 2.4 }), metal, metal, metal], [10.5, 0, -2.5]);
  const holo = kit.add(makeGlow('#6fe9ff', 2.6, 0.7));
  holo.position.set(10.5, 1.5, -2.5);
  const holoLight = kit.pointLight({ color: '#5fe0ff', intensity: 12, distance: 7, decay: 1.6, position: [10.5, 1.8, -2.2] });
  kit.flickers.push(makeFlicker(holoLight, { mode: 'pulse', amount: 0.25, speed: 1.6, glow: holo }));
  // moonlight from the planet floods through the glass
  kit.dirLight({ color: '#9cc4ff', intensity: 1.1, position: [2, 8, -14] });
  for (const [x, lean] of [[-10, 0.3], [-5.5, 0.25], [-1, 0.32], [3.5, 0.2], [8, 0.28]]) {
    kit.shaft([x, 5.6, WALL_Z + 0.1], { width: 1.8, height: 11, lean, opacity: 0.13, tilt: 0.62, color: '#a8d4ff' });
  }
  kit.space({ aimX: 0, aimY: 3.4 });
  return {
    dust: '#bcd8ff',
    emitters: [['holo', { position: [10.5, 1.4, -2.5], area: [1.4, 0.9, 1.4], rate: 12 }]],
  };
}

function cryo(kit) {
  const r = kit.rng;
  kit.floor((x, z) => (z === WALL_Z ? 'floor_hazard' : r() < 0.15 ? 'floor_plate' : 'floor_cryo'));
  kit.wallRun(['wall_panel', 'wall_panel_vent', 'wall_panel', 'wall_panel_screen'], { opts: { wall_panel_screen: { emissiveIntensity: 2.2 } } });
  kit.wallRun(['wall_pipes'], { y: WALL_H });
  kit.decalPlane('sign_cryo', 2, 0.5, [0, WALL_H + 0.45, WALL_Z + 0.03], { emissiveIntensity: 2.4 });
  for (let x = -12.5; x <= 12.5; x += 1.5) if (Math.abs(x) > 1.2) kit.cryoPod(x, WALL_Z + 0.45);
  for (const x of [-7, 7]) kit.pointLight({ color: '#8fe8ff', intensity: 14, distance: 8, decay: 1.7, position: [x, 2.2, WALL_Z + 1.4] });
  kit.foreground();
  return {
    dust: '#dff8ff',
    emitters: [['frost', { position: [0, 1.4, 0], area: [22, 2, 10], rate: 9 }]],
  };
}

const BASE_TEXTURES = ['floor_plate', 'floor_plate_worn', 'floor_hazard', 'wall_pipes', 'crate_side', 'crate_top', 'console_top', 'console_front'];
const SPACE_TEXTURES = ['space_backdrop', 'stars_layer'];
registerArena('corridor', { theme: THEMES.corridor, build: corridor, textures: [...BASE_TEXTURES, ...SPACE_TEXTURES, 'wall_panel', 'window_frame', 'wall_panel_screen', 'wall_panel_vent', 'sign_spine', 'ceiling_lamp', 'bench', 'decal_arrow', 'decal_grime', 'decal_oil'] });
registerArena('engineering', { theme: THEMES.engineering, build: engineering, textures: [...BASE_TEXTURES, 'floor_grate', 'wall_panel', 'wall_panel_vent', 'locker', 'wall_panel_screen', 'door_frame', 'door', 'sign_engineering', 'reactor_core', 'alarm_light', 'ceiling_lamp', 'decal_scorch', 'decal_oil', 'decal_grime'] });
registerArena('bridge', { theme: THEMES.bridge, build: bridge, textures: [...BASE_TEXTURES, ...SPACE_TEXTURES, 'floor_bridge', 'wall_low', 'window_frame', 'sign_bridge', 'holo_table'] });
registerArena('cryo', { theme: THEMES.cryo, build: cryo, textures: [...BASE_TEXTURES, 'floor_cryo', 'wall_panel', 'wall_panel_vent', 'wall_panel_screen', 'sign_cryo', 'cryo_pod'] });
