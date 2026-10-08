// Prop builders (TECH_PLAN 3.3). Static furniture merges into the world's batches (one draw per
// material); living pieces (chests, switches, gates, shards, the starchart, screens, status pods,
// linked guide strips, the reactor, the holo table, Med-Stations) get their own objects and return a
// LivingProp the World stores under the entry's id (W.living(id)).
//
// export function registerProp(type, { build(W, p), textures?, sprites? })   content prop types
// export function hasProp(type) -> bool                        built-in or registered
// export function propArt(typeOrEntry) -> { textures: [], sprites: [] }   what it paints (prewarm)
// export const BUILTIN_PROPS                                   built-in type names
// export function buildProp(W, p) -> LivingProp | null         one PropEntry { t, x, z, ..., on?, id? }
// export function buildProps(W, entries = W.map.props) -> Map(id -> LivingProp)
//
// LivingProp = { kind, setOpen?(open, instant), setState?(value, instant), update?(dt, t), object? }
//   chest        setOpen(opened)          lid, status LED (the World keeps its interactable enabled)
//   switch.*     setState(on) / setOpen   panel screen and lever, valve wheel turning, lever throw
//   gate.*       setOpen(open)            laser grid off, shutter rolls up, hard-light deck sweeps out
//   shard        setOpen(collected)       crystal flies up and fades with a burst
//   starchart    setState(isNew)          amber beacon pulse; it also polls REG.destinations itself
//   screen       setState(tex | null)     World.setScreens: swap to `tex`, null restores its own
//   pod          setState(authorized)     REVIVAL DEFERRED -> AUTHORIZED, staggered by `delay` (with `status`)
//   guide        setState(on)             a `from`/`to` strip glows while its `link` switch is on
// Builders register their per-frame animation with W.addUpdater; update(dt, t) is idempotent per t,
// so a World that also calls living.update does not double the speed. `when` presence is the
// World's (it scopes batchFor / groupFor and colliders while a conditional prop builds).
// Angles (`rot`) are radians around +Y. Sound cues go through W.onSound(name, opts) when present.

import * as THREE from 'three';
import { SpriteActor } from '../core/spriteActor.js';
import { makeGlow, makeBlobShadow, makeHologramMaterial } from '../core/vfx.js';
import { textureSet, glowSet, setTextureFrame, textureFps, textureHasAlpha, makeMaterial } from '../art/tiles.js';
import { buildNpcSprite, buildFieldSprite } from '../art/characters.js';
import { buildEnemySprite } from '../art/enemies.js';
import { noteMissingArt } from '../art/cache.js';
import { REG } from '../content/registry.js';
import { testCond } from './cond.js';
import { gameState } from '../core/state.js';
import { Batch, wrappedCylinder, pipeGeometry } from './geometry.js';
import { worldMaterial, worldTexture } from './paint.js';

const _m = new THREE.Matrix4();
const REGISTERED = {};
const easeOut = (k) => 1 - (1 - k) * (1 - k) * (1 - k);

/** Register a content prop type: { build(W, p), textures?, sprites? } (TECH_PLAN 3.3). */
export function registerProp(type, def) {
  if (!def || typeof def.build !== 'function') throw new Error(`props: "${type}" needs build(W, p)`);
  REGISTERED[type] = def;
}

// What each built-in type paints (prewarm follows this, plus the entry's own texture fields).
const BUILTIN_ART = {
  pod: ['cryo_pod', 'wall_low', 'wall_cap', 'metal_side', 'pod_status'],
  bed: ['wall_low', 'cryo_pod', 'metal_side'],
  crate: ['crate_side', 'crate_top'],
  locker: ['locker', 'wall_cap', 'metal_side'],
  console: ['console_front', 'console_top', 'metal_side'],
  bench: ['seat', 'metal_side'],
  lamp: ['ceiling_lamp'],
  sign: ['metal_side', 'wall_cap'],
  guide: ['guide_strip'],
  decal: [],
  pipe: ['pipe'],
  vent: [],
  alarm: ['alarm_light'],
  conduit: ['metal_side', 'wall_cap'],
  med: ['med_front', 'med_cross', 'metal_side', 'wall_cap'],
  reactor: ['reactor_core', 'metal_side', 'pipe'],
  holoTable: ['holo_table', 'metal_side'],
  chair: ['chair'],
  box: [], plane: [], floorPlane: [], cylinder: [], sprite: [], glow: [],
  screen: ['screen_status'],
  chest: ['crate_side', 'crate_top'],
  'switch.panel': ['switch_panel', 'metal_side', 'wall_cap'],
  'switch.valve': ['valve_wheel', 'pipe', 'metal_side'],
  'switch.lever': ['lever_base', 'metal_side'],
  'gate.laser': ['laser_post', 'laser_beam', 'wall_cap'],
  'gate.shutter': ['shutter', 'metal_side', 'wall_cap'],
  'gate.bridge': ['hard_light', 'metal_side'],
  shard: ['shard_crystal'],
  starchart: ['holo_table', 'starchart_map', 'metal_side'],
};

/** Every built-in prop type. */
export const BUILTIN_PROPS = Object.keys(BUILTIN_ART);

/** True for a built-in or registered prop type. */
export function hasProp(type) {
  return !!(REGISTERED[type] || BUILTIN_ART[type]);
}

/**
 * Textures and sprite sheets a prop type (or entry) paints, for prewarm. An entry adds its own
 * texture fields (tex, tex.front/side/top, sign name, decal name, sprite sheet).
 */
export function propArt(typeOrEntry) {
  const p = typeof typeOrEntry === 'string' ? { t: typeOrEntry } : typeOrEntry || {};
  const reg = REGISTERED[p.t];
  const textures = new Set(reg ? reg.textures || [] : BUILTIN_ART[p.t] || []);
  const sprites = new Set(reg ? reg.sprites || [] : []);
  if (typeof p.tex === 'string') textures.add(p.tex);
  else if (p.tex && typeof p.tex === 'object') for (const v of Object.values(p.tex)) if (typeof v === 'string') textures.add(v);
  if ((p.t === 'sign' || p.t === 'decal') && p.name) textures.add(p.name);
  if (p.t === 'sprite' && p.sheet) sprites.add(p.sheet);
  return { textures: [...textures], sprites: [...sprites] };
}

// ---------------------------------------------------------------- World helpers (duck-typed)

function addUpdater(W, fn) {
  if (W.addUpdater) W.addUpdater(fn);
  else W.updaters.push(fn);
}

function addGlowLink(W, sprite, x, z) {
  if (W.addGlow) W.addGlow(sprite, x, z);
  else if (W.glows) W.glows.push({ x, z, sprite });
}

function addActor(W, actor) {
  if (W.addActor) W.addActor(actor);
  else W.actors.push(actor);
}

function testOf(W, cond) {
  if (!cond) return true;
  return W.test ? W.test(cond) : testCond(cond, W.state || gameState);
}

function sound(W, name, opts) {
  if (W.onSound) W.onSound(name, opts || {});
}

/** Per-World shared POC materials (cached on W). */
function propMats(W) {
  if (W.propMats) return W.propMats;
  const M = W.mats;
  const side = worldMaterial('metal_side', { roughness: 0.66, metalness: 0.3 });
  W.propMats = {
    side,
    cap: M.tile('wall_cap', { roughness: 0.85, cast: false }),
    pod: M.tile('cryo_pod', { emissive: 0.7, roughness: 0.5, metalness: 0.25 }),
    low: M.tile('wall_low', { roughness: 0.7 }),
    crateSide: M.tile('crate_side', { emissive: 2.2 }),
    crateTop: M.tile('crate_top', { roughness: 0.8 }),
    locker: M.tile('locker', { roughness: 0.6, metalness: 0.3 }),
    consoleFront: [M.tile('console_front', { emissive: 2.4 }), M.tile('console_front', { variant: 1, emissive: 2.4 })],
    consoleTop: M.tile('console_top', { emissive: 2.2 }),
    seat: worldMaterial('seat', { roughness: 0.85, metalness: 0.05 }),
    trim: M.plain('#0b1a22', { emissive: '#3fd6ff', emissiveIntensity: 2.2 }),
    lamp: M.tile('ceiling_lamp', { emissive: 3.2, cast: false }),
    alarm: M.tile('alarm_light', { emissive: 3.0, cast: false }),
    pipe: M.tile('pipe', { roughness: 0.5, metalness: 0.45 }),
    holo: M.tile('holo_table', { emissive: 2.4 }),
    med: worldMaterial('med_front', { emissive: 2.4, roughness: 0.45 }),
    chair: worldMaterial('chair', { alphaTest: 0.5, emissive: 2.6, side: THREE.DoubleSide }),
    consoleIndex: 0,
  };
  return W.propMats;
}

/** A fresh lit material whose texture frame this prop alone controls (state textures). */
function stateMaterial(name, opts = {}) {
  const m = makeMaterial(name, { repeat: [1, 1], ...opts });
  m.userData.cast = opts.cast ?? true;
  m.userData.receive = true;
  return m;
}

/** Unlit, blooming material for screens, beams and holo labels. */
function glowMaterial(name, { color = 1.8, additive = false, alphaTest = 0, transparent = false, repeat = [1, 1] } = {}) {
  const set = glowSet(name, { repeat });
  const m = new THREE.MeshBasicMaterial({
    map: set.map,
    color: new THREE.Color(color, color, color),
    transparent: additive || transparent,
    alphaTest,
    depthWrite: !additive,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
  m.userData.set = set;
  return m;
}

function frameOf(material, frame) {
  setTextureFrame(material.userData.set, frame);
}

/** Vertical quad centred at (x, z) facing +z turned by rot, bottom at y0. */
function vquad(B, mat, x, z, w, y0, y1, rot = 0, uv = null) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (lx) => [x + lx * c, 0, z - lx * s];
  const a = P(-w / 2), b = P(w / 2);
  B.quad(mat, [a[0], y0, a[2]], [b[0], y0, b[2]], [b[0], y1, b[2]], [a[0], y1, a[2]], uv);
}

// ---------------------------------------------------------------- dispatch

const BUILDERS = {};

/**
 * Build one PropEntry into world W. Returns its LivingProp (living types, and any entry with an id)
 * or null for static furniture. Unknown types draw a magenta placeholder box with one console.warn
 * (debug.missingArt lists them).
 */
export function buildProp(W, p) {
  const reg = REGISTERED[p.t];
  let living = null;
  if (reg) living = reg.build(W, p) || null;
  else {
    const ctx = { B: W.batchFor(p.on), G: W.groupFor(p.on), addBox: (x, z, w, d) => W.addBox(x, z, w, d), addCircle: (x, z, r) => W.addCircle(x, z, r) };
    const builder = BUILDERS[p.t];
    if (builder) living = builder(W, p, ctx) || null;
    else {
      if (noteMissingArt('prop', p.t)) console.warn(`props: unknown prop type "${p.t}" (magenta placeholder)`);
      placeholder(W, p, ctx);
    }
  }
  if (!living && !p.id) return null;
  living = living || { kind: p.t };
  if (living.update) {
    let lastT = -1;
    const fn = living.update;
    living.update = (dt, t) => { if (t !== lastT) { lastT = t; fn.call(living, dt, t); } };
    addUpdater(W, living.update);
  }
  return living;
}

/** Build every PropEntry of a list; returns Map(id -> LivingProp) for entries with an id. */
export function buildProps(W, entries = (W.map && W.map.props) || []) {
  const out = new Map();
  for (const p of entries) {
    const living = buildProp(W, p);
    if (living && p.id) out.set(p.id, living);
  }
  return out;
}

// ---------------------------------------------------------------- POC furniture

function placeholder(W, p, { B, addBox }) {
  const m = W.mats.plain('#ff2bd6', { emissive: '#ff2bd6', emissiveIntensity: 0.8 });
  const s = p.w || 0.8;
  B.box({ front: m, back: m, left: m, right: m, top: m }, p.x, p.z, s, p.d || s, p.y || 0, (p.y || 0) + (p.h || s), p.rot || 0);
  if (p.solid !== false) addBox(p.x, p.z, s, p.d || s);
}

BUILDERS.pod = (W, p, { B, G, addBox }) => {
  const mat = propMats(W);
  B.box({ front: mat.pod, left: mat.side, right: mat.side, top: mat.cap }, p.x, p.z, 0.92, 0.7, 0, 2.0, 0,
    { left: [0, 0, 0.7, 2], right: [0, 0, 0.7, 2], top: [0, 0, 0.92, 0.7] });
  B.box({ front: mat.low, left: mat.side, right: mat.side, top: mat.cap }, p.x, p.z + 0.38, 1.0, 0.08, 0, 0.18, 0,
    { front: [0, 0, 1, 0.24] });
  addBox(p.x, p.z, 0.96, 0.78);
  if (!p.status) return null;
  return podStatus(W, p, G);
};

/** REVIVAL DEFERRED / AUTHORIZED holo read-out floating in front of a pod's top. */
function podStatus(W, p, G) {
  const mat = glowMaterial('pod_status', { color: 1.7 });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 14 / 32), mat);
  label.position.set(p.x, 2.32, p.z + 0.42);
  label.rotation.x = -0.25;
  label.renderOrder = 3;
  G.add(label);
  const glow = makeGlow('#ff4050', 1.1, 0.35, { pull: 0.2 });
  glow.position.set(p.x, 2.3, p.z + 0.5);
  G.add(glow);
  const delay = p.delay || 0;
  const living = {
    kind: 'pod',
    authorized: testOf(W, p.status),
    _shown: null,
    _at: 0,
    setState(on, instant = false) {
      on = !!on;
      if (on === living.authorized && !instant) return;
      living.authorized = on;
      living._at = instant ? -1 : null;
    },
    update(dt, t) {
      if (living._at === null) living._at = t + delay;
      if (living.authorized === living._shown) return;
      // staggered flip: a short flicker, then the new read-out
      const k = living._at < 0 ? 1 : (t - living._at) / 0.45;
      if (k < 0) return;
      if (k < 1) {
        label.visible = Math.floor(k * 9) % 2 === 0;
        return;
      }
      label.visible = true;
      living._shown = living.authorized;
      frameOf(mat, living.authorized ? 1 : 0);
      glow.material.color.set(living.authorized ? '#5dff9c' : '#ff4050').multiplyScalar(0.35);
      glow.userData.baseColor.copy(glow.material.color);
      if (living._at >= 0) sound(W, 'pod_flip', { volume: 0.6 });
    },
  };
  living._at = -1;
  return living;
}

BUILDERS.bed = (W, p, { B, addBox }) => {
  const mat = propMats(W);
  B.box({ front: mat.low, left: mat.side, right: mat.side, top: mat.pod }, p.x, p.z, 1.0, 2.0, 0, 0.62, 0,
    { front: [0, 0, 1, 0.83], left: [0, 0, 2, 0.62], right: [0, 0, 2, 0.62] });
  addBox(p.x, p.z, 1.0, 2.0);
};

function crateBox(B, mat, x, z, s, y, rot) {
  B.box({ front: mat.crateSide, back: mat.crateSide, left: mat.crateSide, right: mat.crateSide, top: mat.crateTop },
    x, z, s, s, y, y + s, rot);
}

BUILDERS.crate = (W, p, { B, addBox }) => {
  crateBox(B, propMats(W), p.x, p.z, p.s || 1, p.y || 0, p.rot || 0);
  if (!p.y) addBox(p.x, p.z, (p.s || 1) * 1.05, (p.s || 1) * 1.05);
};

BUILDERS.locker = (W, p, { B, addBox }) => {
  const mat = propMats(W);
  B.box({ front: mat.locker, left: mat.side, right: mat.side, top: mat.cap }, p.x, p.z, 0.96, 0.6, 0, 2.0, 0,
    { left: [0, 0, 0.6, 2], right: [0, 0, 0.6, 2], top: [0, 0, 0.96, 0.6] });
  addBox(p.x, p.z, 1.0, 0.64);
};

BUILDERS.console = (W, p, { B, addBox }) => {
  const mat = propMats(W);
  const front = mat.consoleFront[mat.consoleIndex++ % 2];
  B.box({ front, left: mat.side, right: mat.side, top: mat.consoleTop }, p.x, p.z, 0.96, 0.62, 0, 0.95, 0,
    { left: [0, 0, 0.62, 0.95], right: [0, 0, 0.62, 0.95] });
  addBox(p.x, p.z, 1.0, 0.66);
};

/** Lounge bench facing the windows: cushioned seat and backrest on two pedestals. */
BUILDERS.bench = (W, p, { B, addBox }) => {
  const mat = propMats(W);
  const w = p.w || 2;
  B.box({ front: mat.side, left: mat.side, right: mat.side, top: mat.seat }, p.x, p.z, w, 0.62, 0.36, 0.5, 0,
    { front: [0, 0, w, 0.14], left: [0, 0, 0.62, 0.14], right: [0, 0, 0.62, 0.14], top: [0, 0, w, 1] });
  B.box({ front: mat.seat, left: mat.side, right: mat.side, top: mat.side, back: mat.seat }, p.x, p.z + 0.27, w, 0.1, 0.5, 1.05, 0,
    { front: [0, 0, w, 1], back: [0, 0, w, 1], top: [0, 0, w, 0.1] });
  // glowing piping along the backrest
  B.faceZ(mat.trim, p.x - w / 2 + 0.06, p.x + w / 2 - 0.06, 0.98, 1.02, p.z + 0.325, 1);
  for (const dx of [-w / 2 + 0.3, w / 2 - 0.3]) {
    B.box({ front: mat.side, left: mat.side, right: mat.side }, p.x + dx, p.z, 0.16, 0.46, 0, 0.36, 0,
      { front: [0, 0, 0.16, 0.36], left: [0, 0, 0.46, 0.36], right: [0, 0, 0.46, 0.36] });
  }
  addBox(p.x, p.z, w, 0.7);
};

BUILDERS.lamp = (W, p, { B, G }) => {
  const mat = propMats(W);
  B.faceZ(mat.lamp, p.x - 0.25, p.x + 0.25, p.y - 0.25, p.y + 0.25, p.z + 0.012, 1);
  const glow = makeGlow(p.cool ? '#cdeeff' : '#ffb85a', 1.25, 1.1);
  glow.position.set(p.x, p.y - 0.05, p.z + 0.18);
  G.add(glow);
  addGlowLink(W, glow, p.x, p.z + 0.7);
};

BUILDERS.sign = (W, p, { B }) => {
  const mat = propMats(W);
  B.faceZ(W.mats.tile(p.name, { emissive: 2.6, cast: false }), p.x - 1, p.x + 1, 3.02, 3.52, p.z + 0.03, 1);
  B.box({ back: mat.side, top: mat.cap }, p.x, p.z + 0.05, 2.0, 0.06, 3.0, 3.52, 0);
};

BUILDERS.guide = (W, p, ctx) => {
  if (p.from && p.to) return guideStrip(W, p, ctx);
  // POC: floor guide LEDs (aisle lights) along a wall
  const led = W.mats.plain('#0b0e17', { emissive: p.color, emissiveIntensity: 2.4, roughness: 0.4 });
  for (let x = p.x0; x <= p.x1 + 1e-6; x += p.step) ctx.B.faceY(led, x - 0.06, x + 0.06, p.z - 0.025, p.z + 0.025, 0.008);
  return null;
};

/** Glowing floor strip from -> to with chevrons flowing toward `to`; lit while its `link` switch is on. */
function guideStrip(W, p, { G }) {
  const [x0, z0] = p.from, [x1, z1] = p.to;
  const len = Math.hypot(x1 - x0, z1 - z0) || 1;
  const width = p.width || 0.28;
  const set = glowSet('guide_strip', { repeat: [len / (p.scale || 1), 1] });
  const color = new THREE.Color(p.color || '#ffbf4d');
  const mat = new THREE.MeshBasicMaterial({
    map: set.map, color: color.clone(), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, width), mat);
  mesh.rotation.order = 'YXZ';
  mesh.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((x0 + x1) / 2, 0.012, (z0 + z1) / 2);
  mesh.renderOrder = 1;
  G.add(mesh);
  // linked strips start dark; World.syncFlags lights them while their switch is on
  let level = p.link ? 0 : 1, shown = -1;
  const living = {
    kind: 'guide',
    on: level === 1,
    setState(on, instant = false) {
      living.on = !!on;
      if (instant) level = on ? 1 : 0;
    },
    setOpen(on, instant) { living.setState(on, instant); },
    update(dt, t) {
      const target = living.on ? 1 : 0;
      level += Math.sign(target - level) * Math.min(Math.abs(target - level), dt / 0.35);
      if (level !== shown) {
        shown = level;
        mat.color.copy(color).multiplyScalar(0.18 + level * 1.7);
      }
      // the chevrons flow while lit, idle slowly while dark
      set.map.offset.x = -((t * (0.4 + level * 1.2)) % 1);
      setTextureFrame(set, Math.floor(t * 8) % 4);
    },
  };
  return living;
}

BUILDERS.decal = (W, p, { B }) => {
  B.faceY(W.mats.decal(p.name), p.x - 0.5, p.x + 0.5, p.z - 0.5, p.z + 0.5, 0.006, null, p.rot || 0);
};

BUILDERS.pipe = (W, p, { B }) => {
  const material = propMats(W).pipe;
  if (p.axis === 'y') {
    const len = p.y1 - p.y0;
    B.geometry(material, pipeGeometry(p.r, len, 'y'), _m.makeTranslation(p.x, (p.y0 + p.y1) / 2, p.z));
  } else {
    const len = p.z1 - p.z0;
    B.geometry(material, pipeGeometry(p.r, len, 'z'), _m.makeTranslation(p.x, p.y, (p.z0 + p.z1) / 2));
    // clamps every 2 units
    for (let z = p.z0 + 1; z < p.z1; z += 2) {
      B.geometry(material, pipeGeometry(p.r * 1.35, 0.12, 'z'), _m.makeTranslation(p.x, p.y, z));
    }
  }
};

BUILDERS.vent = (W, p) => {
  W.addEmitter('steam', { position: [p.x, 0.05, p.z], area: [0.3, 0.05, 0.3], rate: 9 }, p.on);
};

BUILDERS.alarm = (W, p, { B, G }) => {
  B.faceZ(propMats(W).alarm, p.x - 0.25, p.x + 0.25, p.y - 0.25, p.y + 0.25, p.z + 0.012, 1);
  const glow = makeGlow('#ff3344', 1.6, 1.4);
  glow.position.set(p.x, p.y, p.z + 0.2);
  G.add(glow);
  W.alarm = { x: p.x, y: p.y, z: p.z, on: p.on, glow };
};

BUILDERS.conduit = (W, p, { B, G }) => {
  const mat = propMats(W);
  const z = p.z + 0.12;
  B.box({ front: mat.side, left: mat.side, right: mat.side, top: mat.cap }, p.x, z, 0.56, 0.24, p.y - 0.25, p.y + 0.25, 0,
    { front: [0, 0, 0.56, 0.5] });
  // torn cable hanging out of the junction box
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 6), W.mats.plain('#1b1f2a', { roughness: 0.8 }));
  cable.position.set(p.x + 0.12, p.y - 0.5, z + 0.12);
  cable.rotation.z = 0.35;
  cable.castShadow = true;
  G.add(cable);
  const led = makeGlow('#ff8a2a', 0.45, 1.6);
  led.position.set(p.x - 0.16, p.y + 0.08, z + 0.16);
  G.add(led);
  W.addEmitter('spark', { position: [p.x + 0.22, p.y - 0.78, z + 0.16], area: [0.08, 0.08, 0.08], rate: 1.3, burst: 14 }, p.on);
  W.addEmitter('smoke', { position: [p.x + 0.1, p.y + 0.1, z + 0.2], area: [0.2, 0.1, 0.1], rate: 1.2 }, p.on);
};

function crossSprite() {
  const t = textureSet('med_cross', { layers: ['map'] });
  const m = new THREE.SpriteMaterial({ map: t.map, color: new THREE.Color(2.2, 2.6, 2.3), transparent: true, depthWrite: false, fog: false });
  const s = new THREE.Sprite(m);
  s.scale.set(0.45, 0.45, 1);
  return s;
}

BUILDERS.med = (W, p, { B, G, addBox }) => {
  const mat = propMats(W);
  B.box({ front: mat.med, left: mat.side, right: mat.side, top: mat.cap }, p.x, p.z, 1.0, 0.62, 0, 1.5, 0,
    { left: [0, 0, 0.62, 1.5], right: [0, 0, 0.62, 1.5] });
  addBox(p.x, p.z, 1.04, 0.66);
  const cross = crossSprite();
  cross.position.set(p.x, 2.05, p.z + 0.1);
  G.add(cross);
  const glow = makeGlow('#5dff9c', 1.3, 0.9);
  glow.position.set(p.x, 2.05, p.z + 0.12);
  G.add(glow);
  W.addEmitter('heal', { position: [p.x, 0.25, p.z + 0.55], area: [0.7, 0.1, 0.25], rate: 1.6, speed: 0.6, size: 0.7 }, p.on);
  const phase = p.x;
  return {
    kind: 'med',
    update(dt, t) {
      cross.position.y = 2.05 + Math.sin(t * 1.8 + phase) * 0.07;
      cross.material.rotation = Math.sin(t * 0.9 + phase) * 0.12;
    },
  };
};

function animateSet(W, set, phase) {
  if (W.mats && W.mats.animated) W.mats.animated.push({ set, phase });
  else addUpdater(W, (dt, t) => setTextureFrame(set, (t + phase) * (set.fps || 4)));
}

BUILDERS.reactor = (W, p, { G, addCircle }) => {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  const set = textureSet('reactor_core', { repeat: [1, 1], layers: ['map'] });
  animateSet(W, set, 0);
  const core = new THREE.MeshBasicMaterial({ map: set.map, color: new THREE.Color(2.1, 2.1, 2.1), transparent: true, fog: true });
  const steel = worldTexture('metal_side');
  const metal = new THREE.MeshStandardMaterial({ map: steel.map, normalMap: steel.normalMap, roughness: 0.55, metalness: 0.45, transparent: true });
  const pipeSet = textureSet('pipe', { repeat: [1, 1], layers: ['map', 'normal'] });
  const band = new THREE.MeshStandardMaterial({ map: pipeSet.map, normalMap: pipeSet.normalMap, roughness: 0.5, metalness: 0.5, transparent: true });
  const mats = [core, metal, band];

  const column = new THREE.Mesh(wrappedCylinder(0.955, 3.3, { arc: 2, texHeight: 2, y0: 0.35 }), core);
  g.add(column);
  const add = (geo, m, y) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.y = y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  add(new THREE.CylinderGeometry(1.45, 1.55, 0.35, 24), metal, 0.175);
  add(new THREE.CylinderGeometry(1.12, 1.12, 0.12, 24), band, 0.41);
  for (const y of [1.35, 2.35]) add(new THREE.CylinderGeometry(1.06, 1.06, 0.16, 24, 1, true), band, y);
  add(new THREE.CylinderGeometry(1.2, 1.08, 0.42, 24), metal, 3.86);
  add(new THREE.CylinderGeometry(0.7, 1.2, 0.3, 24), band, 4.22);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const strut = add(new THREE.BoxGeometry(0.14, 3.3, 0.14), metal, 2.0);
    strut.position.x = Math.sin(a) * 1.08;
    strut.position.z = Math.cos(a) * 1.08;
  }
  const glow = makeGlow('#ff6a3a', 3.6, 0.55, { pull: 0.2 });
  glow.position.set(0, 2.0, 0);
  g.add(glow);
  G.add(g);
  addCircle(p.x, p.z, 1.55);
  W.addEmitter('ember', { position: [p.x, 3.9, p.z], area: [1.2, 0.3, 1.2], rate: 7 }, p.on);
  W.addEmitter('ember', { position: [p.x, 0.5, p.z], area: [2.6, 0.1, 2.6], rate: 4 }, p.on);
  // the World pulses the core with the lighting rig and fades it while it hides the leader (POC)
  W.reactor = { group: g, x: p.x, z: p.z, mats, core, glow, fade: 1 };
  return { kind: 'reactor', object: g };
};

BUILDERS.holoTable = (W, p, { B, G, addBox }) => {
  const mat = propMats(W);
  B.box({ front: mat.side, left: mat.side, right: mat.side, top: mat.holo }, p.x, p.z, 2.0, 2.0, 0, 0.85, 0,
    { front: [0, 0, 2, 0.85], left: [0, 0, 2, 0.85], right: [0, 0, 2, 0.85] });
  addBox(p.x, p.z, 2.05, 2.05);
  const set = glowSet('holo_table');
  animateSet(W, set, 0.4);
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), makeHologramMaterial(set.map, '#4cc8ee', { jitter: 0.012, opacity: 0.6 }));
  holo.position.set(p.x, 1.55, p.z);
  holo.rotation.x = -Math.PI / 2 + 0.55;
  holo.renderOrder = 4;
  G.add(holo);
  const glow = makeGlow('#45d4ff', 2.2, 0.35, { pull: 0.2 });
  glow.position.set(p.x, 1.2, p.z);
  G.add(glow);
  W.addEmitter('holo', { position: [p.x, 1.35, p.z], area: [1.4, 0.8, 1.4], rate: 14 }, p.on);
  return {
    kind: 'holoTable',
    update(dt, t) { holo.position.y = 1.55 + Math.sin(t * 1.3) * 0.04; },
  };
};

BUILDERS.chair = (W, p, { B, G, addBox }) => {
  B.faceZ(propMats(W).chair, p.x - 0.5, p.x + 0.5, 0, 1.375, p.z, 1);
  const blob = makeBlobShadow(0.55, 0.5);
  blob.position.set(p.x, 0.012, p.z);
  blob.scale.z = 0.7;
  G.add(blob);
  addBox(p.x, p.z - 0.1, 0.9, 0.7);
};

// ---------------------------------------------------------------- generic content props

const texMat = (W, name, opts) => W.mats.tile(name, opts);

BUILDERS.box = (W, p, { B, addBox }) => {
  const w = p.w || 1, d = p.d || 1, h = p.h || 1, y = p.y || 0;
  const tex = typeof p.tex === 'string' ? { front: p.tex, side: p.tex, top: p.tex } : p.tex || {};
  const em = p.emissive ?? 2.0;
  const front = texMat(W, tex.front || 'metal_side', { emissive: em });
  const side = texMat(W, tex.side || tex.front || 'metal_side', { emissive: em });
  const top = texMat(W, tex.top || 'wall_cap', { emissive: em });
  B.box({ front, back: side, left: side, right: side, top }, p.x, p.z, w, d, y, y + h, p.rot || 0,
    { front: [0, 0, w, h], back: [0, 0, w, h], left: [0, 0, d, h], right: [0, 0, d, h], top: [0, 0, w, d] });
  if (p.solid !== false && y < 1) addBox(p.x, p.z, rotW(w, d, p.rot), rotW(d, w, p.rot));
};

/** Axis-aligned footprint of a rotated box (colliders stay axis-aligned). */
function rotW(w, d, rot = 0) {
  return Math.abs(w * Math.cos(rot)) + Math.abs(d * Math.sin(rot));
}

BUILDERS.plane = (W, p, { B }) => {
  const w = p.w || 1, h = p.h || 1, y = p.y || 0;
  const alpha = p.alpha ?? textureHasAlpha(p.tex);
  const m = texMat(W, p.tex, { emissive: p.emissive ?? 2.0, alphaTest: alpha ? 0.5 : 0, side: THREE.DoubleSide, cast: p.cast ?? alpha });
  if (alpha && !m.userData.depthMat) {
    m.userData.depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: m.map, alphaTest: 0.5 });
  }
  vquad(B, m, p.x, p.z, w, y, y + h, p.rot || 0, [0, 0, p.repeat ? w : 1, p.repeat ? h : 1]);
};

BUILDERS.floorPlane = (W, p, { G }) => {
  const w = p.w || 1, d = p.d || 1;
  const set = textureSet(p.tex, { repeat: p.repeat ? [w, d] : [1, 1] });
  const alpha = p.alpha ?? textureHasAlpha(p.tex);
  const m = new THREE.MeshStandardMaterial({
    map: set.map, normalMap: set.normalMap, emissiveMap: set.emissiveMap, emissive: set.emissiveMap ? 0xffffff : 0x000000,
    emissiveIntensity: set.emissiveMap ? p.emissive ?? 1.6 : 0, roughness: 0.7, metalness: 0.15,
    transparent: !!alpha, alphaTest: 0.01, depthWrite: !alpha, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  if (set.frames > 1) animateSet(W, set, p.x);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  mesh.rotation.order = 'YXZ';
  mesh.rotation.y = p.rot || 0;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(p.x, (p.y || 0) + 0.006, p.z);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  G.add(mesh);
};

BUILDERS.cylinder = (W, p, { G, addCircle }) => {
  const r = p.r || 0.5, h = p.h || 3;
  const m = texMat(W, p.tex || 'pipe', { emissive: p.emissive ?? 2.0 });
  const mesh = new THREE.Mesh(wrappedCylinder(r, h, { arc: p.arc || 2, texHeight: p.texHeight || 2 }), m);
  mesh.position.set(p.x, p.y || 0, p.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  G.add(mesh);
  if (p.solid !== false) addCircle(p.x, p.z, r + 0.05);
};

/** Sheet for 'npc:<id>' (characters) or 'enemy:<art>'. */
function sheetFor(sheet) {
  const i = sheet.indexOf(':');
  const kind = i < 0 ? 'npc' : sheet.slice(0, i), key = i < 0 ? sheet : sheet.slice(i + 1);
  if (kind === 'enemy') return buildEnemySprite(key);
  return key === 'bolt' || key === 'holo' ? buildNpcSprite(key) : buildFieldSprite(key);
}

BUILDERS.sprite = (W, p, { G }) => {
  const sheet = sheetFor(p.sheet || 'npc:holo');
  const actor = new SpriteActor(sheet, p.hologram ? { lit: false, castShadow: false, shadow: false } : { shadowScale: p.shadowScale || 1 });
  if (p.hologram) actor.hologram = true;
  actor.object3d.position.set(p.x, p.y || 0, p.z);
  if (p.scale) actor.object3d.scale.setScalar(p.scale);
  const anim = p.anim || (sheet.anims.idle_down ? 'idle_down' : 'idle');
  actor.play(anim);
  actor.flipX = !!p.flipX;
  G.add(actor.object3d);
  addActor(W, actor);
  return { kind: 'sprite', actor, object: actor.object3d };
};

BUILDERS.glow = (W, p, { G }) => {
  const glow = makeGlow(p.color || '#ffb85a', p.size || 1, p.intensity || 1, { pull: p.pull ?? 0.5 });
  glow.position.set(p.x, p.y ?? 1, p.z);
  G.add(glow);
  if (p.link !== false) addGlowLink(W, glow, p.x, p.z);
};

BUILDERS.screen = (W, p, { G }) => {
  const own = p.tex || 'screen_status';
  const w = p.w || 1, h = p.h || 0.5;
  const mat = glowMaterial(own, { color: p.intensity || 1.7 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.rotation.y = p.rot || 0;
  mesh.position.set(p.x, (p.y ?? 1.6) + h / 2, p.z);
  mesh.renderOrder = 2;
  G.add(mesh);
  let current = own, set = mat.userData.set, fps = textureFps(own);
  const living = {
    kind: 'screen',
    group: p.group ?? null,
    get texture() { return current; },
    setScreen(tex) {
      const name = tex || own;
      if (name === current) return;
      const next = glowSet(name, { repeat: [1, 1] });
      set.map.dispose();
      set = next;
      current = name;
      fps = textureFps(name);
      mat.map = set.map;
      mat.userData.set = set;
      mat.needsUpdate = true;
    },
    update(dt, t) {
      if (fps) frameOf(mat, (t + p.x * 0.37) * fps);
    },
  };
  living.setState = living.setScreen;
  return living;
};

// ---------------------------------------------------------------- chests

/** POC supply crate, generalized: hinged lid, status LED; its interactable follows the open state. */
BUILDERS.chest = (W, p, { G, addBox }) => {
  const mat = propMats(W);
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.rot || 0;
  const B = new Batch();
  B.box({ front: mat.crateSide, back: mat.crateSide, left: mat.crateSide, right: mat.crateSide }, 0, 0, 1, 1, 0, 0.84, 0,
    { front: [0, 0, 1, 0.84], back: [0, 0, 1, 0.84], left: [0, 0, 1, 0.84], right: [0, 0, 1, 0.84] });
  B.faceY(W.mats.plain('#0b0e17', { roughness: 1, metalness: 0 }), -0.47, 0.47, -0.47, 0.47, 0.7);
  B.build(g);
  // lid hinged on the back edge
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.84, -0.5);
  const LB = new Batch();
  LB.box({ front: mat.crateSide, back: mat.crateSide, left: mat.crateSide, right: mat.crateSide, top: mat.crateTop }, 0, 0.5, 1.02, 1.02, 0, 0.16, 0,
    { front: [0, 0.82, 1, 1], back: [0, 0.82, 1, 1], left: [0, 0.82, 1, 1], right: [0, 0.82, 1, 1] });
  LB.build(hinge);
  g.add(hinge);
  // status LED: red while sealed, green once opened
  const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.35, 0.4) });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.07), ledMat);
  led.position.set(0.28, 0.74, 0.506);
  g.add(led);
  const glow = makeGlow('#ff4050', 0.5, 0.7);
  glow.position.set(0.28, 0.74, 0.56);
  g.add(glow);
  G.add(g);
  addBox(p.x, p.z, 1.04, 1.04);
  let lid = 0, last = -1;
  const living = {
    kind: 'chest',
    opened: false,
    object: g,
    setOpen(open, instant = false) {
      living.opened = !!open;
      ledMat.color.setRGB(open ? 0.35 : 3, open ? 3 : 0.35, open ? 0.9 : 0.4);
      glow.material.color.set(open ? '#4dff9c' : '#ff4050').multiplyScalar(0.7);
      glow.userData.baseColor.copy(glow.material.color);
      if (instant) { lid = open ? 1 : 0; hinge.rotation.x = -1.95 * lid; }
    },
    update(dt) {
      const target = living.opened ? 1 : 0;
      if (lid === target) return;
      lid = target ? Math.min(1, lid + dt * 2.4) : Math.max(0, lid - dt * 2.4);
      const k = lid;
      hinge.rotation.x = -1.95 * (1 - (1 - k) * (1 - k)) - Math.sin(k * Math.PI) * 0.12;
      if (last !== target && target === 1) sound(W, 'pickup', { volume: 0.4, pitch: 0.7 });
      last = target;
    },
  };
  living.setOpen(!!p.open, true);
  return living;
};

// ---------------------------------------------------------------- switches

function ledGlow(G, x, y, z, on) {
  const glow = makeGlow(on ? '#4dff9c' : '#ff4050', 0.55, 0.9);
  glow.position.set(x, y, z);
  G.add(glow);
  return (v) => {
    glow.material.color.set(v ? '#4dff9c' : '#ff4050').multiplyScalar(0.9);
    glow.userData.baseColor.copy(glow.material.color);
  };
}

/** Shared switch state machine: k eases toward the state; on/off sounds. */
function switchLiving(W, p, kind, apply) {
  let k = p.on ? 1 : 0;
  const living = {
    kind,
    on: !!p.on,
    setState(on, instant = false) {
      const changed = !!on !== living.on;
      living.on = !!on;
      if (instant) k = living.on ? 1 : 0;
      else if (changed) sound(W, p.sfx || (kind === 'switch.valve' ? 'valve' : 'confirm'), { volume: 0.7 });
      apply(k, living.on, instant);
    },
    setOpen(on, instant) { living.setState(on, instant); },
    update(dt, t) {
      const target = living.on ? 1 : 0;
      if (k === target) return;
      k = target > k ? Math.min(1, k + dt / (p.time || 0.6)) : Math.max(0, k - dt / (p.time || 0.6));
      apply(k, living.on, false, t);
    },
  };
  apply(k, living.on, true);
  return living;
}

BUILDERS['switch.panel'] = (W, p, { B, G, addBox }) => {
  const mat = propMats(W);
  const rot = p.rot || 0;
  const front = stateMaterial('switch_panel', { emissiveIntensity: 2.4, alphaTest: 0.5 });
  // pedestal: textured front, metal sides and a cap
  B.box({ left: mat.side, right: mat.side, back: mat.side, top: mat.cap }, p.x, p.z, 0.72, 0.5, 0, 1.45, rot,
    { left: [0, 0, 0.5, 1.45], right: [0, 0, 0.5, 1.45], back: [0, 0, 0.72, 1.45] });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.5), front);
  face.position.set(p.x + Math.sin(rot) * 0.255, 0.75, p.z + Math.cos(rot) * 0.255);
  face.rotation.y = rot;
  face.receiveShadow = true;
  G.add(face);
  addBox(p.x, p.z, rotW(0.76, 0.54, rot), rotW(0.54, 0.76, rot));
  const led = ledGlow(G, p.x + Math.sin(rot) * 0.3, 1.18, p.z + Math.cos(rot) * 0.3, !!p.on);
  return switchLiving(W, p, 'switch.panel', (k, on) => {
    frameOf(front, k > 0.5 ? 1 : 0);
    led(on);
  });
};

BUILDERS['switch.valve'] = (W, p, { B, G, addCircle }) => {
  const mat = propMats(W);
  const rot = p.rot || 0;
  // a riser pipe from the floor with a flange, the hand wheel facing the camera side
  B.geometry(mat.pipe, pipeGeometry(0.16, 1.2, 'y'), _m.makeTranslation(p.x, 0.6, p.z));
  B.geometry(mat.pipe, pipeGeometry(0.24, 0.12, 'y'), _m.makeTranslation(p.x, 0.08, p.z));
  B.geometry(mat.pipe, pipeGeometry(0.22, 0.1, 'y'), _m.makeTranslation(p.x, 1.0, p.z));
  B.box({ front: mat.side, back: mat.side, left: mat.side, right: mat.side, top: mat.cap }, p.x, p.z, 0.36, 0.36, 0.9, 1.1, rot,
    { front: [0, 0, 0.36, 0.2], back: [0, 0, 0.36, 0.2], left: [0, 0, 0.36, 0.2], right: [0, 0, 0.36, 0.2] });
  const wheelMat = stateMaterial('valve_wheel', { emissiveIntensity: 1, alphaTest: 0.5, side: THREE.DoubleSide });
  wheelMat.userData.cast = true;
  const wheel = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.78), wheelMat);
  wheel.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: wheelMat.map, alphaTest: 0.5 });
  const hub = new THREE.Group();
  hub.position.set(p.x + Math.sin(rot) * 0.24, 1.0, p.z + Math.cos(rot) * 0.24);
  hub.rotation.y = rot;
  hub.add(wheel);
  wheel.castShadow = true;
  G.add(hub);
  addCircle(p.x, p.z, 0.3);
  const led = ledGlow(G, p.x + Math.sin(rot) * 0.2 + 0.24, 1.32, p.z + Math.cos(rot) * 0.2, !!p.on);
  return switchLiving(W, { time: 1.1, ...p }, 'switch.valve', (k, on) => {
    wheel.rotation.z = -k * Math.PI * 3;   // a turn and a half
    led(on);
  });
};

BUILDERS['switch.lever'] = (W, p, { G, addBox }) => {
  const rot = p.rot || 0;
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = rot;
  const baseMat = stateMaterial('lever_base', { emissiveIntensity: 2.2 });
  const side = propMats(W).side;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.45), [side, side, baseMat, side, side, side]);
  base.position.y = 0.06;
  base.receiveShadow = true;
  base.castShadow = true;
  g.add(base);
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.12, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.75, 0.07), W.mats.plain('#66738a', { roughness: 0.4, metalness: 0.7 }));
  arm.position.y = 0.37;
  arm.castShadow = true;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), W.mats.plain('#d82d45', { roughness: 0.35, metalness: 0.2, emissive: '#5c1220', emissiveIntensity: 0.6 }));
  knob.position.y = 0.76;
  knob.castShadow = true;
  pivot.add(arm, knob);
  g.add(pivot);
  G.add(g);
  addBox(p.x, p.z, rotW(0.9, 0.45, rot), rotW(0.45, 0.9, rot));
  return switchLiving(W, { time: 0.35, ...p }, 'switch.lever', (k, on) => {
    pivot.rotation.x = -0.7 + 1.4 * easeOut(k);
    frameOf(baseMat, on ? 1 : 0);
  });
};

// ---------------------------------------------------------------- gates

/** Cell span of a GateDef ({ cells } or { rect: [c0, r0, c1, r1] }), as world bounds. */
function gateSpan(p) {
  let c0 = Infinity, r0 = Infinity, c1 = -Infinity, r1 = -Infinity;
  const cells = p.cells || (p.rect ? [[p.rect[0], p.rect[1]], [p.rect[2], p.rect[3]]] : [[Math.floor(p.x ?? 0), Math.floor(p.z ?? 0)]]);
  for (const [c, r] of cells) { c0 = Math.min(c0, c); r0 = Math.min(r0, r); c1 = Math.max(c1, c); r1 = Math.max(r1, r); }
  const along = c1 - c0 >= r1 - r0 ? 'x' : 'z';
  return { c0, r0, c1, r1, along, x0: c0, x1: c1 + 1, z0: r0, z1: r1 + 1, cx: (c0 + c1 + 1) / 2, cz: (r0 + r1 + 1) / 2 };
}

/** Shared gate state: k eases from closed (0) to open (1). */
function gateLiving(W, p, kind, time, apply, sounds) {
  let k = p.openInit ? 1 : 0;
  const living = {
    kind,
    open: k === 1,
    setOpen(open, instant = false) {
      const changed = !!open !== living.open;
      living.open = !!open;
      if (instant) k = living.open ? 1 : 0;
      else if (changed && sounds) sound(W, living.open ? sounds[0] : sounds[1], { volume: 0.8 });
      apply(k, instant);
    },
    update(dt, t) {
      const target = living.open ? 1 : 0;
      if (k !== target) k = target > k ? Math.min(1, k + dt / time) : Math.max(0, k - dt / time);
      apply(k, false, t);
    },
  };
  return living;
}

BUILDERS['gate.laser'] = (W, p, { B, G, addBox }) => {
  const s = gateSpan(p);
  const postMat = stateMaterial('laser_post', { emissiveIntensity: 2.6, alphaTest: 0.5 });
  const mat = propMats(W);
  const alongX = s.along === 'x';
  const ends = alongX ? [[s.x0 - 0.1, s.cz], [s.x1 + 0.1, s.cz]] : [[s.cx, s.z0 - 0.1], [s.cx, s.z1 + 0.1]];
  const posts = [];
  for (const [x, z] of ends) {
    B.box({ left: mat.side, right: mat.side, back: mat.side, top: mat.cap }, x, z, 0.36, 0.36, 0, 1.5, 0,
      { left: [0, 0, 0.36, 1.5], right: [0, 0, 0.36, 1.5], back: [0, 0, 0.36, 1.5] });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.5), postMat);
    face.position.set(x, 0.75, z + 0.181);
    G.add(face);
    addBox(x, z, 0.4, 0.4);
    posts.push([x, z]);
  }
  // beams: thin ribbons facing the field camera (upright along x, lying flat along z)
  const len = alongX ? s.x1 - s.x0 + 0.2 : s.z1 - s.z0 + 0.2;
  const beamMat = glowMaterial('laser_beam', { color: 1.25, additive: true, repeat: [len * 1.5, 1] });
  const beams = new THREE.Group();
  beams.position.set(s.cx, 0, s.cz);
  if (!alongX) beams.rotation.y = Math.PI / 2;
  for (const y of [0.32, 0.62, 0.92, 1.22]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.1), beamMat);
    b.position.y = y;
    if (!alongX) b.rotation.x = -Math.PI / 2;
    beams.add(b);
  }
  beams.renderOrder = 3;
  G.add(beams);
  // a red scorch line on the floor under the grid
  const floorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.12, 0.18), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.3), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.01, 0);
  beams.add(floor);
  const glows = posts.map(([x, z]) => {
    const glow = makeGlow('#ff3b4e', 1.4, 0.7);
    glow.position.set(x, 0.9, z + 0.3);
    G.add(glow);
    return glow;
  });
  W.addEmitter('spark', { position: [s.cx, 0.6, s.cz], area: alongX ? [len, 1, 0.05] : [0.05, 1, len], rate: 0.6, burst: 6 }, p.on);
  return gateLiving(W, p, 'gate.laser', 0.45, (k, instant, t = 0) => {
    const closed = 1 - k;
    beams.visible = closed > 0.01;
    // beams collapse toward the middle as they switch off, flickering
    const flick = k > 0 && k < 1 ? (Math.sin(t * 90) > 0 ? 1 : 0.35) : 1;
    beams.scale.set(Math.max(0.001, closed), 1, 1);
    beamMat.color.setScalar(1.25 * flick);
    floorMat.opacity = 0.5 * closed;
    frameOf(postMat, k > 0.5 ? 1 : 0);
    for (const g of glows) {
      g.material.color.set(k > 0.5 ? '#4dff9c' : '#ff3b4e').multiplyScalar(0.7);
      g.userData.baseColor.copy(g.material.color);
    }
  }, ['laser_off', 'laser_on']);
};

BUILDERS['gate.shutter'] = (W, p, { B, G }) => {
  const s = gateSpan(p);
  const mat = propMats(W);
  const alongX = s.along === 'x';
  const len = alongX ? s.x1 - s.x0 : s.z1 - s.z0;
  const H = p.height || 3;
  const shutterMat = stateMaterial('shutter', { emissiveIntensity: 2.2 });
  shutterMat.map.repeat.set(len, 1);
  shutterMat.normalMap.repeat.set(len, 1);
  if (shutterMat.emissiveMap) shutterMat.emissiveMap.repeat.set(len, 1);
  const geo = new THREE.BoxGeometry(alongX ? len : 0.22, H, alongX ? 0.22 : len);
  geo.translate(0, -H / 2, 0);
  const panel = new THREE.Mesh(geo, [shutterMat, shutterMat, mat.cap, mat.cap, shutterMat, shutterMat]);
  panel.position.set(s.cx, H, s.cz);
  panel.castShadow = true;
  panel.receiveShadow = true;
  G.add(panel);
  // housing the shutter rolls up into
  B.box({ front: mat.side, back: mat.side, left: mat.side, right: mat.side, top: mat.cap }, s.cx, s.cz, alongX ? len + 0.2 : 0.4, alongX ? 0.4 : len + 0.2, H, H + 0.3, 0);
  const lamp = makeGlow('#ffb54a', 0.8, 0.9);
  lamp.position.set(s.cx, H + 0.15, s.cz + (alongX ? 0.25 : 0));
  G.add(lamp);
  return gateLiving(W, p, 'gate.shutter', 0.9, (k) => {
    // roll up: the bottom edge rises, the texture stays put on the visible part
    const vis = Math.max(0.02, 1 - easeOut(k) * 0.97);
    panel.scale.y = vis;
    panel.visible = vis > 0.025;
    for (const t of [shutterMat.map, shutterMat.normalMap, shutterMat.emissiveMap]) {
      if (!t) continue;
      t.repeat.y = vis;
      t.offset.y = 1 - vis;
    }
    lamp.material.color.set(k > 0.5 ? '#4dff9c' : '#ffb54a').multiplyScalar(0.9);
    lamp.userData.baseColor.copy(lamp.material.color);
  }, ['door', 'door']);
};

BUILDERS['gate.bridge'] = (W, p, { G }) => {
  const s = gateSpan(p);
  const alongX = s.along === 'x';
  const len = alongX ? s.x1 - s.x0 : s.z1 - s.z0;
  const width = alongX ? s.z1 - s.z0 : s.x1 - s.x0;
  const set = glowSet('hard_light', { repeat: [alongX ? len : width, alongX ? width : len] });
  const mat = new THREE.MeshBasicMaterial({
    map: set.map, color: new THREE.Color(0.55, 0.95, 1.25), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 0.02;
  deck.renderOrder = 2;
  const holder = new THREE.Group();
  holder.position.set(alongX ? s.x0 : s.cx, 0, alongX ? s.cz : s.z0);
  holder.add(deck);
  G.add(holder);
  // light rails along both edges
  const railMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 1.2, 1.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const rails = [-1, 1].map((sd) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), railMat);
    holder.add(r);
    return { r, sd };
  });
  // pylons at both ends
  const glows = [0, 1].map((e) => {
    const g = makeGlow('#6fd6ff', 1.2, 0.8);
    const x = alongX ? (e ? s.x1 : s.x0) : s.cx, z = alongX ? s.cz : (e ? s.z1 : s.z0);
    g.position.set(x, 0.5, z);
    G.add(g);
    return g;
  });
  animateSet(W, set, 0);
  return gateLiving(W, p, 'gate.bridge', 0.7, (k) => {
    // the deck sweeps out from the near end
    const l = Math.max(0.001, len * easeOut(k));
    deck.scale.set(alongX ? l : width, alongX ? width : l, 1);
    deck.position.set(alongX ? l / 2 : 0, 0.02, alongX ? 0 : l / 2);
    deck.visible = k > 0.002;
    const side = width / 2 - 0.05;
    for (const { r, sd } of rails) {
      r.scale.set(alongX ? l : 0.05, 0.05, alongX ? 0.05 : l);
      r.position.set(alongX ? l / 2 : sd * side, 0.35, alongX ? sd * side : l / 2);
      r.visible = deck.visible;
    }
    for (const g of glows) {
      g.material.color.set('#6fd6ff').multiplyScalar(0.35 + k * 0.6);
      g.userData.baseColor.copy(g.material.color);
    }
  }, ['laser_on', 'laser_off']);
};

// ---------------------------------------------------------------- shards and the starchart

BUILDERS.shard = (W, p, { G }) => {
  const set = glowSet('shard_crystal');
  const mat = new THREE.MeshBasicMaterial({ map: set.map, color: new THREE.Color(2.2, 2.2, 2.4), alphaTest: 0.5, side: THREE.DoubleSide });
  const crystal = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1), mat);
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.add(crystal);
  const glow = makeGlow(p.color || '#7ff4ff', 1.6, 0.9, { pull: 0.3 });
  glow.position.y = 1.0;
  g.add(glow);
  // a ring of light on the floor under it
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.4, 1.8), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.4, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.015;
  g.add(ring);
  G.add(g);
  const em = W.addEmitter('holo', { position: [p.x, 0.9, p.z], area: [0.5, 0.9, 0.5], rate: 6 }, p.on);
  let gone = 0, collected = false;
  const phase = (p.x * 1.7 + p.z) % 6.28;
  const living = {
    kind: 'shard',
    collected: false,
    object: g,
    setOpen(open, instant = false) {
      const was = collected;
      collected = living.collected = !!open;
      if (em) em.active = !collected;
      if (instant) { gone = collected ? 1 : 0; g.visible = !collected; return; }
      if (collected && !was) {
        if (W.particles) W.particles.emit('holo', [p.x, 1, p.z], { count: 40 });
        sound(W, 'shard');
      }
    },
    update(dt, t) {
      const target = collected ? 1 : 0;
      if (gone !== target) gone = target ? Math.min(1, gone + dt / 0.5) : Math.max(0, gone - dt / 0.5);
      g.visible = gone < 1;
      crystal.position.y = 1.0 + Math.sin(t * 2 + phase) * 0.08 + gone * 0.6;
      crystal.scale.set(Math.max(0.18, Math.abs(Math.cos(t * 1.4 + phase))) * (1 + gone * 0.6), 1 + gone * 0.6, 1);
      mat.opacity = 1 - gone;
      mat.transparent = gone > 0;
      ringMat.opacity = (0.4 + 0.15 * Math.sin(t * 3 + phase)) * (1 - gone);
      glow.position.y = crystal.position.y;
    },
  };
  return living;
};

/** A destination elsewhere is unlocked, visible and never visited (TECH_PLAN 4.7 "NEW"). */
function anyNewDestination(W) {
  const flags = (W.state || gameState).flags || {};
  return REG.destinations.some((d) => d.map !== (W.map && W.map.id) && testOf(W, d.unlock)
    && (!d.visible || testOf(W, d.visible)) && !flags[`dest:${d.id}`]);
}

BUILDERS.starchart = (W, p, { B, G, addBox }) => {
  const mat = propMats(W);
  B.box({ front: mat.side, left: mat.side, right: mat.side, top: mat.holo }, p.x, p.z, 2.0, 2.0, 0, 0.85, 0,
    { front: [0, 0, 2, 0.85], left: [0, 0, 2, 0.85], right: [0, 0, 2, 0.85] });
  addBox(p.x, p.z, 2.05, 2.05);
  const set = textureSet('starchart_map', { layers: ['map'] });
  animateSet(W, set, 0.2);
  const hm = makeHologramMaterial(set.map, '#4cc8ee', { jitter: 0.01, opacity: 0.7 });
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), hm);
  holo.position.set(p.x, 1.6, p.z);
  holo.rotation.x = -Math.PI / 2 + 0.6;
  holo.renderOrder = 4;
  G.add(holo);
  const glow = makeGlow('#45d4ff', 2.4, 0.4, { pull: 0.2 });
  glow.position.set(p.x, 1.25, p.z);
  G.add(glow);
  // amber beacon ring that pulses while a destination is new
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.4, 0.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.15, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(p.x, 0.9, p.z);
  G.add(ring);
  W.addEmitter('holo', { position: [p.x, 1.4, p.z], area: [1.4, 0.8, 1.4], rate: 10 }, p.on);
  let pulse = 0, poll = 0;
  return {
    kind: 'starchart',
    isNew: anyNewDestination(W),
    setState(isNew) { this.isNew = !!isNew; },
    update(dt, t) {
      poll -= dt;
      if (poll <= 0) { poll = 0.5; this.isNew = anyNewDestination(W); }
      pulse += ((this.isNew ? 1 : 0) - pulse) * Math.min(1, dt * 3);
      holo.position.y = 1.6 + Math.sin(t * 1.3) * 0.04;
      const beat = 0.5 + 0.5 * Math.sin(t * 4);
      hm.uniforms.uOpacity.value = 0.7 + pulse * 0.2 * beat;
      ringMat.opacity = pulse * (0.35 + 0.5 * beat);
      ring.scale.setScalar(1 + pulse * 0.08 * beat);
      glow.material.color.set(pulse > 0.5 ? '#ffc35a' : '#45d4ff').multiplyScalar(0.4 + pulse * 0.3 * beat);
    },
  };
};
