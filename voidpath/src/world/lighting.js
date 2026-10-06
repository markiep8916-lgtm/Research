// Field lighting: cool hemisphere fill, one shadow-casting "planet light" (directional, its shadow
// camera follows the view), a weak frontal fill for sprites, a rotating red alarm spot and a fixed
// pool of real point lights driven by many virtual ones (the nearest to the view win, fading in and
// out so swaps never pop). Fog, background and post-FX mood blend smoothly between areas.

import * as THREE from 'three';
import { makeFlicker } from '../core/vfx.js';
import { clamp, smoothstep } from '../core/util.js';

/** Direction toward the key light (from the north-west, ~44 degrees up): matches the window shafts. */
export const KEY_DIR = new THREE.Vector3(-0.41, 0.69, -0.6).normalize();

const POOL = { low: 4, medium: 6, high: 8 };
const SHADOW_SIZE = { low: 512, medium: 1024, high: 2048 };
const SHADOW_HALF = 14;

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
  constructor(scene, defs, { quality = 'high', mood }) {
    this.scene = scene;
    this.quality = quality;
    this.mood = moodState(mood);
    this.target = moodState(mood);

    scene.background = this.mood.fog.clone();
    scene.fog = new THREE.FogExp2(this.mood.fog.clone(), this.mood.density);

    this.hemi = new THREE.HemisphereLight(this.mood.sky, this.mood.ground, this.mood.hemi);
    scene.add(this.hemi);

    const key = new THREE.DirectionalLight(this.mood.keyColor, this.mood.key);
    key.castShadow = true;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    const sc = key.shadow.camera;
    sc.left = -SHADOW_HALF; sc.right = SHADOW_HALF; sc.top = SHADOW_HALF; sc.bottom = -SHADOW_HALF;
    sc.near = 1; sc.far = 70;
    sc.layers.enable(1); // the shadow-only ceiling lives on layer 1
    sc.updateProjectionMatrix();
    scene.add(key, key.target);
    this.key = key;
    // light-space basis for texel snapping of the shadow camera
    this._kz = KEY_DIR.clone().negate();
    this._kx = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), this._kz).normalize();
    this._ky = new THREE.Vector3().crossVectors(this._kz, this._kx).normalize();

    this.fill = new THREE.DirectionalLight('#a7bde6', this.mood.fill);
    scene.add(this.fill, this.fill.target);

    // soft warm fill that travels with the leader so the sprite never melts into a dark floor
    this.hero = new THREE.PointLight('#ffe2c4', 3.2, 3.8, 1.6);
    scene.add(this.hero);

    this.spot = new THREE.SpotLight('#ff2a36', 0, 16, 0.34, 0.45, 1.2);
    this.spot.castShadow = false;
    scene.add(this.spot, this.spot.target);
    this.alarm = null; // { x, y, z, on, glow }

    // virtual point lights
    this.defs = defs.map((d) => ({
      ...d,
      decay: d.decay ?? 1.6,
      color: new THREE.Color(d.color),
      base: new THREE.Color(d.color),
      proxy: { intensity: d.intensity },
      enabled: true,
      flicker: null,
    }));
    this._d2 = new Float32Array(this.defs.length);
    this._order = new Int16Array(this.defs.length).map((_, i) => i);
    this.pool = [];
    for (let i = 0; i < POOL.high; i++) {
      const l = new THREE.PointLight('#ffffff', 0, 6, 1.6);
      l.castShadow = false;
      scene.add(l);
      this.pool.push(l);
    }
    this.setQuality(quality, true);
  }

  /** Attach flicker/pulse controllers (vfx.makeFlicker drives them via updateVfx) and lamp glows. */
  linkGlows(glows) {
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

  byTag(tag) {
    return this.defs.find((d) => d.tag === tag) || null;
  }

  setQuality(q, force = false) {
    if (!force && q === this.quality) return;
    this.quality = q;
    const n = POOL[q] || 8;
    this.poolSize = n;
    this.pool.forEach((l, i) => { l.visible = i < n; });
    this.spot.visible = q !== 'low';
    const size = SHADOW_SIZE[q] || 1024;
    const sh = this.key.shadow;
    if (sh.mapSize.x !== size) {
      sh.mapSize.set(size, size);
      if (sh.map) { sh.map.dispose(); sh.map = null; }
    }
  }

  setMood(m, immediate = false) {
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

  /** Disposes flicker controllers (they live in a module registry inside vfx.js). */
  dispose() {
    for (const d of this.defs) if (d.flicker) d.flicker.dispose();
  }

  /**
   * focus: camera target (x, z); hero: the leader (x, z); offsets: divider id -> current y offset.
   */
  update(dt, t, focus, hero, offsets) {
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
    this.scene.fog.color.copy(c.fog);
    this.scene.fog.density = c.density;
    this.scene.background.copy(c.fog);
    this.hemi.color.copy(c.sky);
    this.hemi.groundColor.copy(c.ground);
    this.hemi.intensity = c.hemi;
    this.key.color.copy(c.keyColor);
    this.key.intensity = c.key;
    this.fill.intensity = c.fill;
  }

  _updateKey(focus) {
    // shadow box centred a little north of the view target (the camera sees more floor to the north),
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
      if (!d.enabled || (low && d.decorative)) { d2[i] = 1e9; continue; }
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
    const n = this.poolSize;
    const cut = order.length > n && d2[order[n]] < 1e8 ? Math.sqrt(d2[order[n]]) : Infinity;
    const reactorK = 0.5 + 0.5 * Math.sin(t * 2.1);
    for (let j = 0; j < n; j++) {
      const l = this.pool[j];
      const i = order[j];
      if (i === undefined || d2[i] >= 1e8) { l.intensity = 0; continue; }
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
    if (!a) return;
    const y = a.y + (offsets[a.on] || 0);
    const ang = t * 2.6;
    const s = this.spot;
    s.position.set(a.x, y - 0.1, a.z + 0.25);
    // a full rotation: the beam rakes the floor, then flares on the wall behind the beacon
    s.target.position.set(a.x + Math.sin(ang) * 4, y - 2.2, a.z + 0.25 + Math.cos(ang) * 4);
    s.target.updateMatrixWorld();
    const near = 1 - smoothstep(10, 20, Math.hypot(focus.x - a.x, focus.z - a.z - 5));
    s.intensity = 140 * near;
    // the beacon dome flares whenever the sweeping lamp faces the viewer
    const facing = Math.cos(ang) ** 4;
    if (a.glow) {
      a.glow.material.color.copy(a.glow.userData.baseColor).multiplyScalar(0.35 + 1.1 * facing);
      a.glow.position.y = y;
    }
  }

  /** Current post-FX mood for engine.setFx. */
  get fx() {
    return this.mood;
  }
}
