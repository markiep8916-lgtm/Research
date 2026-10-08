// Persistent field lighting rig (TECH_PLAN 3.7, 11.6). ExploreState owns one Lighting for its whole
// life; every map change re-parents the same lights into the new scene with attach(), so every map
// has the same light set (the same shader programs) and only one shadow map ever exists.
//
// The rig: cool hemisphere fill, one shadow-casting "planet light" (directional; its shadow camera
// follows the camera's look target, snapped to texels), a weak frontal fill for sprites, a warm hero
// light that travels with the leader, a rotating alarm spot (high tier only) and a fixed pool of real
// point lights driven by the map's many virtual lights (the nearest to the view win, fading in and
// out so swaps never pop). Fog, background and post-FX mood blend smoothly between areas.
//
// Counts per tier are fixed (11.6) and read from the engine's QUALITY_PRESETS: point pool high 8 /
// medium 4 / low 2 (fieldPointLights), plus the hero light; the spot exists on high only (fieldSpot);
// the key's shadow map is fieldShadowMap (the engine turns shadows off on low). Unused pool lights
// keep intensity 0 instead of being hidden, so nothing recompiles.
//
// export const KEY_DIR, DEFAULT_MOOD
// export class Lighting
//   constructor({ quality })
//   attach(scene, lightDefs, mood, { glows, alarm, test })   re-parent into `scene`, rebind virtual lights
//   setQuality(q); setMood(mood, immediate); setTag(tag, { on, color, intensity }); byTag(tag) -> defs[]
//   syncConditions(test)   re-evaluate every light's `when` with test(cond) -> bool
//   update(dt, t, focus, hero, offsets); get fx (the blended post-FX mood); counts(); dispose()

import * as THREE from 'three';
import { makeFlicker } from '../core/vfx.js';
import { clamp, smoothstep } from '../core/util.js';
import { QUALITY_PRESETS } from '../core/engine.js';

/** Direction toward the key light (from the north-west, ~44 degrees up): matches the window shafts. */
export const KEY_DIR = new THREE.Vector3(-0.41, 0.69, -0.6).normalize();

const SHADOW_HALF = 14;
const MIN_SHADOW_MAP = 512;   // low has no shadows; the key keeps a small map so nothing reallocates

export const DEFAULT_MOOD = {
  fog: '#070b17', density: 0.03, sky: '#3a4f80', ground: '#0b0b12', hemi: 0.55,
  key: 1.0, fill: 0.36, exposure: 1.04, bloom: 0.9, saturation: 1.08,
};

const REACTOR_A = new THREE.Color('#ff7a2f');
const REACTOR_B = new THREE.Color('#ff3fb4');

const _v = new THREE.Vector3();

function moodState(m) {
  return {
    fog: new THREE.Color(m.fog), density: m.density, sky: new THREE.Color(m.sky), ground: new THREE.Color(m.ground),
    hemi: m.hemi, key: m.key, keyColor: new THREE.Color(m.keyColor || '#b8d4ff'), fill: m.fill,
    exposure: m.exposure, bloom: m.bloom, saturation: m.saturation,
  };
}

export class Lighting {
  constructor({ quality = 'high', mood = DEFAULT_MOOD } = {}) {
    this.quality = quality;
    this.scene = null;
    this.mood = moodState(mood);
    this.target = moodState(mood);
    this.background = this.mood.fog.clone();
    this.fog = new THREE.FogExp2(this.mood.fog.clone(), this.mood.density);
    this.group = new THREE.Group();
    this.group.name = 'field-rig';

    this.hemi = new THREE.HemisphereLight(this.mood.sky, this.mood.ground, this.mood.hemi);
    const key = new THREE.DirectionalLight(this.mood.keyColor, this.mood.key);
    key.castShadow = true;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    const sc = key.shadow.camera;
    sc.left = -SHADOW_HALF; sc.right = SHADOW_HALF; sc.top = SHADOW_HALF; sc.bottom = -SHADOW_HALF;
    sc.near = 1; sc.far = 70;
    sc.layers.enable(1);
    sc.updateProjectionMatrix();
    this.key = key;
    // light-space basis for texel snapping of the shadow camera
    this._kz = KEY_DIR.clone().negate();
    this._kx = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), this._kz).normalize();
    this._ky = new THREE.Vector3().crossVectors(this._kz, this._kx).normalize();
    this.fill = new THREE.DirectionalLight('#a7bde6', this.mood.fill);
    // soft warm fill that travels with the leader so the sprite never melts into a dark floor
    this.hero = new THREE.PointLight('#ffe2c4', 3.2, 3.8, 1.6);
    this.group.add(this.hemi, key, key.target, this.fill, this.fill.target, this.hero);

    this.spot = null;
    this.alarm = null;     // { x, y, z, on, glow } from the alarm prop
    this.pool = [];
    this.defs = [];
    this._d2 = new Float32Array(0);
    this._order = new Int16Array(0);
    this.reactorK = 0.5;
    this._applyTier();
  }

  // ------------------------------------------------------------------ scene binding

  /**
   * Move every light into `scene` (fog and background included) and bind the map's virtual lights.
   * extras: { glows: [{ x, z, sprite }], alarm, test: cond -> bool } from the World.
   */
  attach(scene, defs = [], mood = DEFAULT_MOOD, { glows = [], alarm = null, test = null } = {}) {
    if (this.scene && this.scene !== scene) this.scene.remove(this.group);
    this.scene = scene;
    scene.add(this.group);
    scene.fog = this.fog;
    scene.background = this.background;
    this._disposeFlickers();
    this.defs = defs.map((d) => ({
      ...d,
      decay: d.decay ?? 1.6,
      color: new THREE.Color(d.color || '#ffffff'),
      base: new THREE.Color(d.color || '#ffffff'),
      proxy: { intensity: d.intensity ?? 10 },
      intensity: d.intensity ?? 10,
      distance: d.distance ?? 6,
      whenOn: true,
      tagOn: true,
      glow: null,
      flicker: null,
    }));
    this._d2 = new Float32Array(this.defs.length);
    this._order = new Int16Array(this.defs.length).map((_, i) => i);
    this.alarm = alarm;
    this._linkGlows(glows);
    if (test) this.syncConditions(test);
    this.setMood(mood, true);
    this._blendMood(0);
  }

  _linkGlows(glows) {
    for (const d of this.defs) {
      let glow = null, best = 1.2;
      for (const g of glows) {
        const dd = Math.hypot(g.x - d.x, g.z - d.z);
        if (dd < best) { best = dd; glow = g.sprite; }
      }
      d.glow = glow;
      if (d.mode === 'flicker' || d.mode === 'pulse' || d.mode === 'strobe') {
        d.flicker = makeFlicker(d.proxy, { base: d.intensity, mode: d.mode, amount: d.amount ?? 0.5, speed: d.speed ?? 8, glow });
      }
    }
  }

  _disposeFlickers() {
    for (const d of this.defs) if (d.flicker) d.flicker.dispose();
  }

  /** Lights whose `when` no longer holds go dark (they fade through the pool like any other swap). */
  syncConditions(test) {
    for (const d of this.defs) d.whenOn = d.when ? !!test(d.when) : true;
  }

  byTag(tag) {
    return this.defs.filter((d) => d.tag === tag);
  }

  /** Script control of tagged lights (cs.light): on, colour and intensity. */
  setTag(tag, { on, color, intensity } = {}) {
    for (const d of this.byTag(tag)) {
      if (on !== undefined) d.tagOn = !!on;
      if (color !== undefined) { d.color.set(color); d.base.set(color); }
      if (intensity !== undefined) {
        d.intensity = intensity;
        d.proxy.intensity = intensity;
        if (d.flicker) d.flicker.base = intensity;
      }
    }
  }

  // ------------------------------------------------------------------ quality

  setQuality(q) {
    if (q === this.quality) return;
    this.quality = q;
    this._applyTier();
  }

  _applyTier() {
    const tier = QUALITY_PRESETS[this.quality] || QUALITY_PRESETS.high;
    const n = tier.fieldPointLights;
    while (this.pool.length > n) this.group.remove(this.pool.pop());
    while (this.pool.length < n) {
      const l = new THREE.PointLight('#ffffff', 0, 6, 1.6);
      this.group.add(l);
      this.pool.push(l);
    }
    const wantSpot = !!tier.fieldSpot;
    if (wantSpot && !this.spot) {
      this.spot = new THREE.SpotLight('#ff2a36', 0, 16, 0.34, 0.45, 1.2);
      this.group.add(this.spot, this.spot.target);
    } else if (!wantSpot && this.spot) {
      this.group.remove(this.spot, this.spot.target);
      this.spot.dispose();
      this.spot = null;
    }
    const size = tier.fieldShadowMap || MIN_SHADOW_MAP;
    const sh = this.key.shadow;
    if (sh.mapSize.x !== size) {
      sh.mapSize.set(size, size);
      if (sh.map) { sh.map.dispose(); sh.map = null; }
    }
  }

  /** Real light counts by type (for renderInfo and the tier budget checks). */
  counts() {
    return { point: this.pool.length + 1, spot: this.spot ? 1 : 0, dir: 2, hemi: 1 };
  }

  // ------------------------------------------------------------------ mood

  setMood(m, immediate = false) {
    if (!m) return;
    const t = this.target;
    t.fog.set(m.fog); t.density = m.density; t.sky.set(m.sky); t.ground.set(m.ground); t.hemi = m.hemi;
    t.key = m.key; t.keyColor.set(m.keyColor || '#b8d4ff'); t.fill = m.fill;
    t.exposure = m.exposure; t.bloom = m.bloom; t.saturation = m.saturation;
    if (immediate) {
      const c = this.mood;
      c.fog.copy(t.fog); c.density = t.density; c.sky.copy(t.sky); c.ground.copy(t.ground); c.hemi = t.hemi;
      c.key = t.key; c.keyColor.copy(t.keyColor); c.fill = t.fill;
      c.exposure = t.exposure; c.bloom = t.bloom; c.saturation = t.saturation;
    }
  }

  /** Current post-FX mood for engine.setFx (bloom, exposure, saturation). */
  get fx() {
    return this.mood;
  }

  // ------------------------------------------------------------------ frame

  /** focus: the camera's look target (x, z); hero: the leader (x, z); offsets: divider id -> y offset. */
  update(dt, t, focus, hero, offsets = {}) {
    this.hero.position.set(hero.x, 1.7, hero.z + 1.1);
    this._blendMood(dt);
    this._updateKey(focus);
    this._updatePool(t, focus, offsets);
    this._updateAlarm(t, focus, offsets);
  }

  _blendMood(dt) {
    const c = this.mood, g = this.target;
    const k = 1 - Math.exp(-dt * 2.2);
    c.fog.lerp(g.fog, k); c.sky.lerp(g.sky, k); c.ground.lerp(g.ground, k); c.keyColor.lerp(g.keyColor, k);
    c.density += (g.density - c.density) * k;
    c.hemi += (g.hemi - c.hemi) * k;
    c.key += (g.key - c.key) * k;
    c.fill += (g.fill - c.fill) * k;
    c.exposure += (g.exposure - c.exposure) * k;
    c.bloom += (g.bloom - c.bloom) * k;
    c.saturation += (g.saturation - c.saturation) * k;
    this.fog.color.copy(c.fog);
    this.fog.density = c.density;
    this.background.copy(c.fog);
    this.hemi.color.copy(c.sky);
    this.hemi.groundColor.copy(c.ground);
    this.hemi.intensity = c.hemi;
    this.key.color.copy(c.keyColor);
    this.key.intensity = c.key;
    this.fill.intensity = c.fill;
  }

  _updateKey(focus) {
    // shadow box centred a little north of the look target (the camera sees more floor to the north),
    // snapped to whole shadow texels in light space so edges do not crawl while the view moves
    const key = this.key;
    _v.set(focus.x, 0, focus.z - 3.2);
    const texel = (SHADOW_HALF * 2) / key.shadow.mapSize.x;
    const px = Math.round(_v.dot(this._kx) / texel) * texel;
    const py = Math.round(_v.dot(this._ky) / texel) * texel;
    const pz = _v.dot(this._kz);
    _v.copy(this._kx).multiplyScalar(px).addScaledVector(this._ky, py).addScaledVector(this._kz, pz);
    key.target.position.copy(_v);
    key.position.copy(_v).addScaledVector(KEY_DIR, 30);
    key.target.updateMatrixWorld();
    this.fill.target.position.set(focus.x, 0, focus.z);
    this.fill.position.set(focus.x + 3, 14, focus.z + 18);
    this.fill.target.updateMatrixWorld();
  }

  _updatePool(t, focus, offsets) {
    const defs = this.defs, d2 = this._d2, order = this._order;
    const low = this.quality === 'low';
    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      if (!d.whenOn || !d.tagOn || (low && d.decorative)) { d2[i] = 1e9; continue; }
      const dx = d.x - focus.x, dz = d.z - focus.z;
      d2[i] = dx * dx + dz * dz;
    }
    // insertion sort (the order barely changes between frames)
    for (let i = 1; i < order.length; i++) {
      const v = order[i], dv = d2[v];
      let j = i - 1;
      while (j >= 0 && d2[order[j]] > dv) { order[j + 1] = order[j]; j--; }
      order[j + 1] = v;
    }
    const n = this.pool.length;
    const cut = order.length > n && d2[order[n]] < 1e8 ? Math.sqrt(d2[order[n]]) : Infinity;
    const reactorK = 0.5 + 0.5 * Math.sin(t * 2.1);
    for (let j = 0; j < n; j++) {
      const l = this.pool[j];
      const i = order[j];
      if (i === undefined || j >= order.length || d2[i] >= 1e8) { l.intensity = 0; continue; }
      const d = defs[i];
      const dist = Math.sqrt(d2[i]);
      const f = clamp((cut - dist) / 2.5, 0, 1) * (1 - smoothstep(24, 32, dist));
      let inten = d.proxy.intensity;
      if (d.mode === 'reactor') {
        d.color.copy(REACTOR_A).lerp(REACTOR_B, reactorK * 0.85);
        inten = d.intensity * (0.72 + 0.4 * reactorK);
      }
      l.color.copy(d.color);
      l.intensity = inten * f;
      l.distance = d.distance;
      l.decay = d.decay;
      l.position.set(d.x, d.y + (d.on ? offsets[d.on] || 0 : 0), d.z);
    }
    this.reactorK = reactorK;
  }

  _updateAlarm(t, focus, offsets) {
    const a = this.alarm;
    if (!a) {
      if (this.spot) this.spot.intensity = 0;
      return;
    }
    const y = a.y + (offsets[a.on] || 0);
    const ang = t * 2.6;
    const s = this.spot;
    if (s) {
      s.position.set(a.x, y - 0.1, a.z + 0.25);
      // a full rotation: the beam rakes the floor, then flares on the wall behind the beacon
      s.target.position.set(a.x + Math.sin(ang) * 4, y - 2.2, a.z + 0.25 + Math.cos(ang) * 4);
      s.target.updateMatrixWorld();
      s.intensity = 140 * (1 - smoothstep(10, 20, Math.hypot(focus.x - a.x, focus.z - a.z - 5)));
    }
    // the beacon dome flares whenever the sweeping lamp faces the viewer (every tier)
    const facing = Math.cos(ang) ** 4;
    if (a.glow) {
      a.glow.material.color.copy(a.glow.userData.baseColor).multiplyScalar(0.35 + 1.1 * facing);
      a.glow.position.y = y;
    }
  }

  /** Detach from the current scene and free the shadow map and flickers (ExploreState teardown). */
  dispose() {
    this._disposeFlickers();
    this.defs = [];
    if (this.scene) this.scene.remove(this.group);
    this.scene = null;
    if (this.key.shadow.map) { this.key.shadow.map.dispose(); this.key.shadow.map = null; }
  }
}
