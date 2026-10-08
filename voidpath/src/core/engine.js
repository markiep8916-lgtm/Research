// VOIDPATH rendering engine: WebGL renderer, the 2D-HD post chain, the frame loop,
// camera shake / flash / hit-stop, and full-screen transitions (glass shatter, fade, iris).
//
// States own their scenes and cameras and hand them over with setView(); the engine only
// renders whatever is current, so it never stores game logic.
//
// Full-game additions (TECH_PLAN 11.4, 11.6):
//   QUALITY_PRESETS[q]           the quality tier: pixel ratio cap and budget, shadows (type, field and
//                                arena map sizes), field and arena light pools, particle scale, post
//                                settings. World, lighting rig, arenas and particles read engine.tier.
//   engine.tier                  QUALITY_PRESETS[engine.quality]
//   engine.setQuality(q, { auto })   no-op when unchanged; recompiles once (shadow programs, anchors)
//   engine.onQualityChange(fn(q, { auto, previous })) -> unsubscribe
//   engine.onViewChange(fn(scene, camera, { fresh })) -> unsubscribe   fresh: first time this scene shows
//   engine.compileScene(scene, camera) -> Promise   links every program of the scene for the composer's
//                                render target (compileAsync where supported) and uploads its textures;
//                                call under a cover before setView (map loads, the shatter midpoint)
//   engine.renderInfo() -> { scene: { calls, triangles }, shadow: { calls, triangles }, post: { calls },
//                            programs, compiles, compilesSince, textures, geometries,
//                            lights: { point, spot, dir }, canvasMB, anchors, quality, pixelRatio, renderSize }
//                                last rendered frame; compiles counts gl.linkProgram calls since start,
//                                compilesSince those since the last markCompiles()
//   engine.markCompiles()        starts a new compilesSince window
//   engine.frameMs               raw duration of the last frame (ms, uncapped), for perf.js
//   engine.reducedMotion         prefers-reduced-motion: no shake, damped flashes, 'shatter' plays as 'fade'
//   engine.perf                  the frame-time monitor (core/perf.js): ?stats=1 overlay, automatic drop

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  DEFAULT_FX, cloneFx, mergeFx, ScaledBloomPass, TiltShiftPass, GradePass, OverlayPass,
} from './postfx.js';
import { clamp, ease, isTouchDevice, prefersReducedMotion } from './util.js';
import { setRenderer as setProgramsRenderer, clearAnchors, anchorCount } from './programs.js';
import { artCache } from '../art/cache.js';
import { perf } from './perf.js';

// Light counts are fixed per tier so every map and every arena of a tier shares shader programs.
export const QUALITY_PRESETS = Object.freeze({
  low: Object.freeze({
    pixelRatioCap: 1.0, pixelBudget: 0.75e6, shadows: false, shadowType: null, fieldShadowMap: 0, arenaShadowMap: 0,
    fieldPointLights: 2, fieldSpot: false, arenaPointLights: 2, arenaSpot: false, particles: 0.5,
    bloomScale: 0.5, tiltTaps: 9, shatterMsaa: 0,
  }),
  medium: Object.freeze({
    pixelRatioCap: 1.5, pixelBudget: 1.4e6, shadows: true, shadowType: 'pcf', fieldShadowMap: 1024, arenaShadowMap: 1024,
    fieldPointLights: 4, fieldSpot: false, arenaPointLights: 4, arenaSpot: false, particles: 0.75,
    bloomScale: 1.0, tiltTaps: 11, shatterMsaa: 4,
  }),
  high: Object.freeze({
    pixelRatioCap: 2.0, pixelBudget: 2.8e6, shadows: true, shadowType: 'pcfsoft', fieldShadowMap: 2048, arenaShadowMap: 2048,
    fieldPointLights: 8, fieldSpot: true, arenaPointLights: 6, arenaSpot: true, particles: 1,
    bloomScale: 1.0, tiltTaps: 13, shatterMsaa: 4,
  }),
});

const SHADOW_TYPES = { pcf: THREE.PCFShadowMap, pcfsoft: THREE.PCFSoftShadowMap };
const MAX_PHYSICAL_HEIGHT = 1440;
const MAX_DT = 1 / 20;       // game-time clamp per frame
const MAX_REAL_DT = 0.1;     // real-time effects (hit-stop, shake, flash, transitions) per-frame cap
const TRANSITION_TYPES = ['shatter', 'fade', 'iris'];
const CONTEXT_RELOAD_MS = 6000;  // a lost WebGL context not restored by then offers a reload

const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _savedCamPos = new THREE.Vector3();

export class Engine {
  constructor(canvas, { quality = 'high' } = {}) {
    this.canvas = canvas;
    this.quality = QUALITY_PRESETS[quality] ? quality : 'high';
    const preset = QUALITY_PRESETS[this.quality];

    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Applied by OutputPass (scenes render linear HDR into half-float targets).
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = preset.shadows;
    renderer.shadowMap.type = SHADOW_TYPES[preset.shadowType] ?? THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 1);
    this.renderer = renderer;
    setProgramsRenderer(renderer);

    this.scene = null;
    this.camera = null;
    this.time = 0;          // game seconds (advances only while running, scaled, frozen in hit-stop)
    this.dt = 0;            // game delta of the last frame
    this.realTime = 0;      // unscaled seconds (drives grain, shake, flash, transitions)
    this.realDt = 0;        // unscaled delta, capped at 0.1 s
    this.frameMs = 0;       // raw duration of the last frame in ms (perf monitor)
    this.timeScale = 1;
    this.transitionTimeScale = 1; // debug knob: < 1 slows transitions down
    this.size = { width: 1, height: 1, aspect: 1 };
    this.pixelRatio = 1;
    this.running = false;
    this.reducedMotion = prefersReducedMotion();

    this._fx = cloneFx(DEFAULT_FX);
    this._updaters = [];
    this._updaterSnapshot = [];
    this._updatersDirty = false;
    this._viewListeners = new Set();
    this._qualityListeners = new Set();
    this._shownScenes = new WeakSet();
    this._hitStop = 0;
    this._shake = { amp: 0, dur: 0, t: 0, phase: [0, 0, 0, 0] };
    this._flash = { color: new THREE.Color(), dur: 0, t: 0, strength: 0 };
    this._tr = null;
    this._trQueue = [];
    this._resizeDirty = true;
    this._lastDpr = window.devicePixelRatio || 1;
    this._lastNow = 0;
    this._frame = this._frame.bind(this);

    this._measure();
    renderer.setPixelRatio(this.pixelRatio);
    renderer.setSize(this.size.width, this.size.height, false);

    // ---- post chain
    const composer = new EffectComposer(renderer);
    this.composer = composer;
    this.renderPass = new RenderPass(null, null);
    const fx = this._fx;
    this.bloomPass = new ScaledBloomPass(
      new THREE.Vector2(this.size.width * this.pixelRatio, this.size.height * this.pixelRatio),
      fx.bloom.strength, fx.bloom.radius, fx.bloom.threshold, preset.bloomScale,
    );
    this.tiltShiftPass = new TiltShiftPass({ taps: preset.tiltTaps });
    this.outputPass = new OutputPass();
    this.gradePass = new GradePass();
    this.overlayPass = new OverlayPass();
    for (const p of [this.renderPass, this.bloomPass, this.tiltShiftPass, this.outputPass, this.gradePass, this.overlayPass]) composer.addPass(p);
    this.passes = {
      render: this.renderPass, bloom: this.bloomPass, tiltShift: this.tiltShiftPass,
      output: this.outputPass, grade: this.gradePass, overlay: this.overlayPass,
    };
    this.overlayPass.enabled = false;
    this.overlayPass.shatter.samples = preset.shatterMsaa;
    // Desktop keeps the shatter's full-size targets between encounters (no reallocation per battle).
    this.overlayPass.shatter.keepTargets = !isTouchDevice();
    this._applyFx();
    this._resize();

    this._instrument();
    this._precompilePost();

    // ---- resize tracking
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => { this._resizeDirty = true; });
      this._ro.observe(canvas);
    }
    this._onWindowResize = () => { this._resizeDirty = true; };
    window.addEventListener('resize', this._onWindowResize);
    this._watchReducedMotion();
    this._watchContext();
    perf.attach(this);
  }

  // ------------------------------------------------------------ instrumentation (11.4)

  // renderer.info accumulates over the whole frame (every pass) and is split into the scene pass,
  // its shadow maps and the post chain; gl.linkProgram is counted once at start.
  _instrument() {
    const renderer = this.renderer;
    const info = renderer.info;
    info.autoReset = false;
    this.compiles = 0;
    this._compileMark = 0;
    const cur = { sceneCalls: 0, sceneTris: 0, shadowCalls: 0, shadowTris: 0 };
    this._frameInfo = cur;
    this._lastInfo = { scene: { calls: 0, triangles: 0 }, shadow: { calls: 0, triangles: 0 }, post: { calls: 0 } };

    const gl = renderer.getContext();
    const link = gl.linkProgram.bind(gl);
    gl.linkProgram = (program) => {
      this.compiles++;
      return link(program);
    };

    const sm = renderer.shadowMap;
    const shadowRender = sm.render;
    sm.render = (...args) => {
      const c0 = info.render.calls, t0 = info.render.triangles;
      shadowRender.apply(sm, args);
      cur.shadowCalls += info.render.calls - c0;
      cur.shadowTris += info.render.triangles - t0;
    };

    const rp = this.renderPass;
    const passRender = rp.render;
    rp.render = (...args) => {
      const c0 = info.render.calls, t0 = info.render.triangles;
      const s0 = cur.shadowCalls, st0 = cur.shadowTris;
      passRender.apply(rp, args);
      cur.sceneCalls += info.render.calls - c0 - (cur.shadowCalls - s0);
      cur.sceneTris += info.render.triangles - t0 - (cur.shadowTris - st0);
    };
  }

  _beginFrameInfo() {
    this.renderer.info.reset();
    const cur = this._frameInfo;
    cur.sceneCalls = cur.sceneTris = cur.shadowCalls = cur.shadowTris = 0;
  }

  _endFrameInfo() {
    const r = this.renderer.info.render;
    const cur = this._frameInfo;
    const last = this._lastInfo;
    last.scene.calls = cur.sceneCalls;
    last.scene.triangles = cur.sceneTris;
    last.shadow.calls = cur.shadowCalls;
    last.shadow.triangles = cur.shadowTris;
    last.post.calls = Math.max(0, r.calls - cur.sceneCalls - cur.shadowCalls);
  }

  /** Draw-call, program, texture and memory counters of the last rendered frame (TECH_PLAN 10.1). */
  renderInfo() {
    const r = this.renderer;
    const last = this._lastInfo;
    const lights = { point: 0, spot: 0, dir: 0 };
    this.scene?.traverseVisible((o) => {
      if (o.isPointLight) lights.point++;
      else if (o.isSpotLight) lights.spot++;
      else if (o.isDirectionalLight) lights.dir++;
    });
    return {
      scene: { ...last.scene },
      shadow: { ...last.shadow },
      post: { ...last.post },
      programs: r.info.programs ? r.info.programs.length : 0,
      compiles: this.compiles,
      compilesSince: this.compiles - this._compileMark,
      textures: r.info.memory.textures,
      geometries: r.info.memory.geometries,
      lights,
      canvasMB: Math.round((artCache.bytes / (1024 * 1024)) * 10) / 10,
      anchors: anchorCount(),
      quality: this.quality,
      pixelRatio: Math.round(this.pixelRatio * 100) / 100,
      renderSize: this.renderSize,
    };
  }

  /** Start a new compilesSince window (e.g. right before a revisit that must link nothing). */
  markCompiles() {
    this._compileMark = this.compiles;
  }

  // Link the post-chain variants the first transition would otherwise link on its crack frame
  // (POC review R13): grade into a target (overlay on), overlay and copy to the screen, the shatter
  // scene and the copy into a target, and the shatter scene straight to the screen (low quality).
  _precompilePost() {
    const r = this.renderer;
    const target = this.composer.readBuffer;
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const sh = this.overlayPass.shatter;
    const quadScene = (material) => {
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
      return scene;
    };
    const jobs = [
      [quadScene(this.gradePass.material), target],
      [quadScene(this.overlayPass.material), null],
      [quadScene(sh.copyMaterial), target],
      [quadScene(sh.copyMaterial), null],
      [sh.scene, target],
      [sh.scene, null],
    ];
    const prev = r.getRenderTarget();
    for (const [scene, rt] of jobs) {
      r.setRenderTarget(rt);
      r.compile(scene, scene === sh.scene ? sh.camera : cam);
    }
    r.setRenderTarget(prev);
    for (const [scene] of jobs) if (scene !== sh.scene) scene.children[0].geometry.dispose();
  }

  /**
   * Link every program `scene` needs as the composer will draw it (into its render target, with the
   * scene's current lights) and upload its textures, so the first frame after a cover does no work.
   * Objects out of view are included. Resolves when the driver reports the programs ready.
   */
  compileScene(scene, camera) {
    if (!scene || !camera) return Promise.resolve();
    const r = this.renderer;
    this._syncShadowPrograms(scene);
    scene.updateMatrixWorld();
    const prev = r.getRenderTarget();
    r.setRenderTarget(this.composer.readBuffer);
    let pending = null;
    try {
      // compileAsync only helps with KHR_parallel_shader_compile; without it, compile synchronously.
      if (r.compileAsync && r.extensions.has('KHR_parallel_shader_compile')) pending = r.compileAsync(scene, camera);
      else r.compile(scene, camera);
    } finally {
      r.setRenderTarget(prev);
    }
    this._uploadTextures(scene);
    return pending ? pending.then(() => undefined) : Promise.resolve();
  }

  _uploadTextures(scene) {
    const r = this.renderer;
    const seen = new Set();
    const up = (t) => {
      if (!t || !t.isTexture || seen.has(t) || !t.image || t.isRenderTargetTexture) return;
      seen.add(t);
      r.initTexture(t);
    };
    scene.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        for (const k of Object.keys(m)) if (m[k]?.isTexture) up(m[k]);
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u?.value?.isTexture) up(u.value);
      }
    });
  }

  // ------------------------------------------------------------ robustness

  _watchReducedMotion() {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => { this.reducedMotion = mq.matches; };
    if (mq.addEventListener) mq.addEventListener('change', on);
  }

  // A lost context (mobile GPU reset, iOS memory pressure) shows a notice instead of a frozen black
  // view; three re-uploads everything on restore. If no restore arrives, offer a reload (R28).
  _watchContext() {
    const canvas = this.canvas;
    let box = null;
    let timer = 0;
    const show = (text, reload) => {
      if (!box) {
        box = document.createElement('div');
        box.className = 'vp-ctxlost';
        box.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:90;'
          + 'padding:14px 20px;background:rgba(6,12,22,.92);border:1px solid rgba(127,227,255,.35);'
          + 'color:#cfefff;font:600 14px/1.4 "Chakra Petch",system-ui,sans-serif;letter-spacing:.06em;'
          + 'text-align:center;border-radius:4px;display:flex;flex-direction:column;gap:10px;align-items:center;';
        document.body.appendChild(box);
      }
      box.textContent = text;
      if (reload) {
        const b = document.createElement('button');
        b.textContent = 'Reload';
        b.style.cssText = 'font:inherit;padding:6px 18px;background:#123049;color:#e8f8ff;border:1px solid #4fc8f0;border-radius:3px;cursor:pointer;';
        b.addEventListener('click', () => location.reload());
        box.appendChild(b);
      }
    };
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      show('Graphics paused, restoring...');
      clearTimeout(timer);
      timer = setTimeout(() => show('The graphics device was lost.', true), CONTEXT_RELOAD_MS);
    });
    canvas.addEventListener('webglcontextrestored', () => {
      clearTimeout(timer);
      box?.remove();
      box = null;
    });
  }

  // ------------------------------------------------------------ view

  /** Switch what is rendered. The camera's aspect is kept in sync with the canvas from now on. */
  setView(scene, camera) {
    this.scene = scene || null;
    this.camera = camera || null;
    this.renderPass.scene = this.scene;
    this.renderPass.camera = this.camera;
    if (this.scene) this._syncShadowPrograms(this.scene);
    this._syncCamera();
    if (!this.scene) return;
    const fresh = !this._shownScenes.has(this.scene);
    this._shownScenes.add(this.scene);
    for (const fn of [...this._viewListeners]) fn(this.scene, this.camera, { fresh });
  }

  /** fn(scene, camera, { fresh }) after every setView with a scene; fresh = first time it shows. */
  onViewChange(fn) {
    this._viewListeners.add(fn);
    return () => this._viewListeners.delete(fn);
  }

  _syncCamera() {
    const cam = this.camera;
    if (!cam) return;
    const aspect = this.size.aspect;
    if (cam.isPerspectiveCamera) {
      if (cam.aspect !== aspect) { cam.aspect = aspect; cam.updateProjectionMatrix(); }
    } else if (cam.isOrthographicCamera) {
      // Keep the vertical extent, widen/narrow horizontally around the current centre.
      const h = cam.top - cam.bottom, cx = (cam.left + cam.right) / 2;
      const half = (h * aspect) / 2;
      if (Math.abs(cam.right - cam.left - half * 2) > 1e-6) {
        cam.left = cx - half; cam.right = cx + half; cam.updateProjectionMatrix();
      }
    }
  }

  // Changing renderer.shadowMap.enabled or .type does not rebuild already-compiled programs: do it
  // per scene, once per change.
  _syncShadowPrograms(scene) {
    const sm = this.renderer.shadowMap;
    const on = sm.enabled ? `on:${sm.type}` : 'off';
    if (scene.userData.__vpShadows === on) return;
    if (scene.userData.__vpShadows !== undefined) {
      scene.traverse((o) => {
        const m = o.material;
        if (!m) return;
        if (Array.isArray(m)) for (const mm of m) mm.needsUpdate = true;
        else m.needsUpdate = true;
      });
    }
    scene.userData.__vpShadows = on;
  }

  // ------------------------------------------------------------ FX

  /** Deep-merge post FX params (see CONTRACTS.md); disabled effects skip their pass entirely. */
  setFx(partial) {
    mergeFx(this._fx, partial);
    this._applyFx();
  }

  /** Current FX params (live object: do not mutate, use setFx). */
  getFx() {
    return this._fx;
  }

  _applyFx() {
    const { tiltShift: ts, bloom: b, grade: g } = this._fx;
    this.tiltShiftPass.setParams(ts);
    this.tiltShiftPass.enabled = ts.enabled !== false && ts.maxBlur > 0;
    this.bloomPass.strength = b.strength;
    this.bloomPass.radius = b.radius;
    this.bloomPass.threshold = b.threshold;
    this.bloomPass.enabled = b.enabled !== false && b.strength > 0;
    this.gradePass.setParams(g);
    this.gradePass.enabled = g.enabled !== false;
    this.renderer.toneMappingExposure = g.exposure ?? 1;
  }

  // ------------------------------------------------------------ quality / size

  /** The current quality tier (TECH_PLAN 11.6 budgets). */
  get tier() {
    return QUALITY_PRESETS[this.quality];
  }

  /**
   * Switch the quality tier. No-op when unchanged. Shadow programs rebuild once per scene and the
   * program anchors of the old tier are dropped (their variants can never draw again).
   * auto: true when perf.js lowers quality on its own (listeners can tell it from a player choice).
   */
  setQuality(q, { auto = false } = {}) {
    if (!QUALITY_PRESETS[q] || q === this.quality) return;
    const previous = this.quality;
    this.quality = q;
    const preset = QUALITY_PRESETS[q];
    this.renderer.shadowMap.enabled = preset.shadows;
    if (preset.shadowType) this.renderer.shadowMap.type = SHADOW_TYPES[preset.shadowType];
    if (this.scene) this._syncShadowPrograms(this.scene);
    this.bloomPass.setResScale(preset.bloomScale);
    this.tiltShiftPass.setTaps(preset.tiltTaps);
    this.overlayPass.shatter.samples = preset.shatterMsaa;
    clearAnchors();
    this._resizeDirty = true;
    this._resize();
    for (const fn of [...this._qualityListeners]) fn(q, { auto, previous });
  }

  /** fn(quality, { auto, previous }) after every change. Returns an unsubscribe function. */
  onQualityChange(fn) {
    this._qualityListeners.add(fn);
    return () => this._qualityListeners.delete(fn);
  }

  _measure() {
    const c = this.canvas;
    const w = Math.max(1, c.clientWidth || window.innerWidth || 1);
    const h = Math.max(1, c.clientHeight || window.innerHeight || 1);
    const dpr = window.devicePixelRatio || 1;
    const { pixelRatioCap, pixelBudget } = QUALITY_PRESETS[this.quality];
    this.size.width = w;
    this.size.height = h;
    this.size.aspect = w / h;
    // Cap the device ratio per tier, the physical height, and the total pixel count (HiDPI laptops
    // otherwise render ~3.7 MP through five full-resolution post passes; POC review R7).
    this.pixelRatio = Math.max(0.25, Math.min(dpr, pixelRatioCap, MAX_PHYSICAL_HEIGHT / h, Math.sqrt(pixelBudget / (w * h))));
  }

  _resize() {
    if (!this._resizeDirty) return;
    this._resizeDirty = false;
    this._measure();
    const { width: w, height: h } = this.size;
    const pr = this.pixelRatio;
    const c = this.composer;
    if (c._width !== w || c._height !== h || c._pixelRatio !== pr) {
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(w, h, false);
      c._pixelRatio = pr; // setPixelRatio() would first resize once with the stale CSS size
      c.setSize(w, h);
    }
    this.gradePass.material.uniforms.uPixelRatio.value = pr;
    this._syncCamera();
  }

  /** Physical render size in pixels. */
  get renderSize() {
    return { width: Math.round(this.size.width * this.pixelRatio), height: Math.round(this.size.height * this.pixelRatio) };
  }

  // ------------------------------------------------------------ loop

  /** fn(dt, t) every frame before render, with game dt/time. Returns an unsubscribe function. */
  onUpdate(fn) {
    const entry = { fn };
    this._updaters.push(entry);
    this._updatersDirty = true;
    return () => {
      const i = this._updaters.indexOf(entry);
      if (i >= 0) { this._updaters.splice(i, 1); this._updatersDirty = true; }
      entry.fn = null;
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._lastNow = performance.now();
    this._raf = requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  _frame(now) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._frame);
    const raw = Math.max(0, (now - this._lastNow) / 1000);
    this._lastNow = now;
    this.frameMs = raw * 1000;
    const rdt = Math.min(raw, MAX_REAL_DT);
    this.realDt = rdt;
    this.realTime += rdt;

    let gdt = Math.min(raw, MAX_DT) * this.timeScale;
    if (this._hitStop > 0) {
      this._hitStop -= rdt;
      gdt = 0;
    }
    this.dt = gdt;
    this.time += gdt;

    const dpr = window.devicePixelRatio || 1;
    if (dpr !== this._lastDpr) { this._lastDpr = dpr; this._resizeDirty = true; }
    this._resize();

    // Game logic. A throwing callback must not stop rendering; rethrow after the frame is drawn.
    let error = null;
    if (this._updatersDirty) {
      this._updaterSnapshot = this._updaters.slice();
      this._updatersDirty = false;
    }
    const list = this._updaterSnapshot;
    for (let i = 0; i < list.length; i++) {
      const fn = list[i].fn;
      if (!fn) continue;
      try { fn(gdt, this.time); } catch (e) { if (!error) error = e; }
    }

    // Transitions run on real time (unaffected by hit-stop / slow motion), clamped after hitches.
    this._updateTransition(rdt * this.transitionTimeScale);
    this._updateFlash(rdt);
    this.render();
    if (error) throw error;
  }

  /** Render one frame of the current view through the post chain (the loop calls this). */
  render() {
    this._beginFrameInfo();
    this._render();
    this._endFrameInfo();
  }

  _render() {
    const renderer = this.renderer;
    this.gradePass.material.uniforms.uTime.value = this.realTime;
    const tr = this._tr;
    if (tr && tr.frozen) {
      this.overlayPass.shatter.render(renderer, null);
      return;
    }
    if (!this.scene || !this.camera || (tr && tr.phase === 'wait')) {
      if (tr && tr.phase === 'capture') {
        // Nothing to freeze: shatter a black frame.
        this.overlayPass.shatter.clearFrozen(renderer);
        tr.phase = 'out';
        tr.frozen = true;
        this.overlayPass.mode = 'normal';
        this.overlayPass.shatter.render(renderer, null);
        return;
      }
      renderer.setRenderTarget(null);
      if (tr && tr.phase === 'wait') renderer.setClearColor(tr.coverColor, 1);
      renderer.clear();
      renderer.setClearColor(0x000000, 1);
      return;
    }
    this.overlayPass.enabled = this.overlayPass.active;
    const cam = this.camera;
    const shaking = this._applyShake(cam);
    this.composer.render(this.realDt);
    if (shaking) {
      cam.position.copy(_savedCamPos);
      cam.updateMatrixWorld();
    }
    if (tr && tr.phase === 'capture') {
      tr.phase = 'out';
      tr.frozen = true;
      this.overlayPass.mode = 'normal';
    }
  }

  // ------------------------------------------------------------ juice

  /** Camera shake in world units along the camera's screen axes; decays over `duration` seconds. */
  shake(intensity = 0.12, duration = 0.3) {
    if (this.reducedMotion) return;
    const s = this._shake;
    const k = s.dur > 0 ? Math.max(0, 1 - s.t / s.dur) : 0;
    const current = s.amp * k * k;
    if (intensity < current) return;
    s.amp = intensity;
    s.dur = Math.max(0.01, duration);
    s.t = 0;
    for (let i = 0; i < 4; i++) s.phase[i] = Math.random() * Math.PI * 2;
  }

  _applyShake(cam) {
    const s = this._shake;
    if (s.amp <= 0) return false;
    s.t += this.realDt;
    const k = 1 - s.t / s.dur;
    if (k <= 0) { s.amp = 0; return false; }
    const a = s.amp * k * k;
    const t = s.t;
    // Two incommensurate sines per axis: smooth, non-repeating, ~15-20 Hz.
    const ox = a * (Math.sin(t * 97 + s.phase[0]) * 0.65 + Math.sin(t * 131 + s.phase[1]) * 0.35);
    const oy = a * (Math.sin(t * 113 + s.phase[2]) * 0.65 + Math.sin(t * 89 + s.phase[3]) * 0.35);
    _savedCamPos.copy(cam.position);
    _right.set(1, 0, 0).applyQuaternion(cam.quaternion);
    _up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    cam.position.addScaledVector(_right, ox).addScaledVector(_up, oy);
    cam.updateMatrixWorld();
    return true;
  }

  /** Full-screen additive flash that decays over `duration` seconds. */
  flash(color = '#ffffff', duration = 0.25, strength = 0.8) {
    if (this.reducedMotion) strength *= 0.35;
    const f = this._flash;
    const k = f.dur > 0 ? Math.max(0, 1 - f.t / f.dur) : 0;
    if (strength < f.strength * k * k) return;
    f.color.set(color);
    f.dur = Math.max(0.01, duration);
    f.t = 0;
    f.strength = strength;
  }

  _updateFlash(rdt) {
    const f = this._flash;
    const u = this.overlayPass.uniforms;
    if (f.strength <= 0) { u.uFlash.value = 0; return; }
    f.t += rdt;
    const k = 1 - f.t / f.dur;
    if (k <= 0) { f.strength = 0; u.uFlash.value = 0; return; }
    u.uFlashColor.value.copy(f.color);
    u.uFlash.value = f.strength * k * k;
  }

  /** Freeze game time (dt = 0) for `ms` real milliseconds; rendering continues. */
  hitStop(ms = 90) {
    this._hitStop = Math.max(this._hitStop, ms / 1000);
  }

  // ------------------------------------------------------------ transitions

  /**
   * Full-screen transition. Resolves when the new view is fully revealed; rejects (after still
   * revealing) if onMidpoint throws/rejects. Calls made while one is running are queued.
   *   'shatter': `duration` is the shatter-to-black time; reveal adds max(0.3, 0.35 * duration).
   *              With prefers-reduced-motion it plays as a black 'fade' of the same total length.
   *   'fade' / 'iris': `duration` is the whole transition (half out, half in).
   * Extra options: color (fade/iris cover, shatter flash tint), onMidpoint (may return a promise),
   *   reveal ('fade' | 'iris', shatter only), revealDuration, center ({x, y} CSS px: iris centre /
   *   shatter impact point), ringColor (iris edge glow).
   */
  transition(type, { duration = 1.0, color, onMidpoint, ...rest } = {}) {
    if (!TRANSITION_TYPES.includes(type)) return Promise.reject(new Error(`Unknown transition "${type}"`));
    if (type === 'shatter' && this.reducedMotion) {
      // Same total length (cover + reveal), no flying glass.
      type = 'fade';
      duration += Math.max(0.3, duration * 0.35);
      color = '#000000';
    }
    return new Promise((resolve, reject) => {
      this._trQueue.push({ type, opts: { duration: Math.max(0.05, duration), color, onMidpoint, ...rest }, resolve, reject });
      if (!this._tr) this._startNextTransition();
    });
  }

  /** True while a transition runs or is queued. */
  get transitioning() {
    return !!this._tr || this._trQueue.length > 0;
  }

  _startNextTransition() {
    const job = this._trQueue.shift();
    if (!job) return;
    const { type, opts } = job;
    const D = opts.duration;
    const tr = {
      ...job,
      phase: 'out',
      t: 0,
      frozen: false,
      error: null,
      warm: 0,
      outDur: type === 'shatter' ? D : D / 2,
      inDur: opts.revealDuration ?? (type === 'shatter' ? Math.max(0.3, D * 0.35) : D / 2),
      reveal: type === 'shatter' ? (opts.reveal === 'iris' ? 'iris' : 'fade') : type,
      coverColor: new THREE.Color(type === 'shatter' ? '#000000' : (opts.color || '#000000')),
      center: this._uvFromCss(opts.center),
    };
    this._tr = tr;
    const u = this.overlayPass.uniforms;
    u.uCoverColor.value.copy(tr.coverColor);
    u.uIrisColor.value.copy(tr.coverColor);
    u.uRingColor.value.set(opts.ringColor || '#ffc560').multiplyScalar(0.55);
    u.uIrisCenter.value.set(tr.center[0], tr.center[1]);
    if (type === 'shatter') {
      const aspect = this.size.aspect;
      const impact = opts.center
        ? [(tr.center[0] * 2 - 1) * aspect, tr.center[1] * 2 - 1]
        : [(Math.random() - 0.5) * 0.3 * aspect, (Math.random() - 0.5) * 0.24];
      this.overlayPass.shatter.setup(aspect, { impact, color: opts.color || '#ffffff' });
      this.overlayPass.mode = 'capture';
      tr.phase = 'capture';
    }
  }

  _uvFromCss(c) {
    if (!c) return [0.5, 0.5];
    return [clamp(c.x / this.size.width, 0, 1), clamp(1 - c.y / this.size.height, 0, 1)];
  }

  // Iris radius (screen-height units) that fully uncovers the screen from the iris centre.
  _irisMax(center) {
    const a = this.size.aspect;
    const dx = Math.max(center[0], 1 - center[0]) * a, dy = Math.max(center[1], 1 - center[1]);
    return Math.hypot(dx, dy) + 0.02;
  }

  _setCover(kind, k, tr) {
    // k: 0 = fully visible, 1 = fully covered
    const u = this.overlayPass.uniforms;
    if (kind === 'iris') {
      u.uCover.value = 0;
      u.uIris.value = k >= 1 ? 0 : this._irisMax(tr.center) * (1 - k);
      if (k >= 1) u.uCover.value = 1;
    } else {
      u.uIris.value = -1;
      u.uCover.value = k;
    }
  }

  _updateTransition(dt) {
    const tr = this._tr;
    if (!tr) return;
    switch (tr.phase) {
      case 'capture':
        return; // the next render() captures the frame
      case 'out': {
        tr.t += dt;
        const k = Math.min(1, tr.t / tr.outDur);
        if (tr.type === 'shatter') this.overlayPass.shatter.setProgress(k);
        else this._setCover(tr.type, tr.type === 'iris' ? ease.inCubic(k) : ease.inOutQuad(k), tr);
        if (k >= 1) this._enterMidpoint(tr);
        return;
      }
      case 'wait':
        return;
      case 'warm':
        // Render a couple of frames of the new view under full cover (shader compiles, uploads).
        if (--tr.warm <= 0) { tr.phase = 'in'; tr.t = 0; }
        return;
      case 'in': {
        tr.t += dt;
        const k = Math.min(1, tr.t / tr.inDur);
        if (tr.reveal === 'iris') this._setCover('iris', 1 - ease.outCubic(k), tr);
        else this._setCover('fade', 1 - ease.outQuad(k), tr);
        if (k >= 1) this._finishTransition(tr);
        return;
      }
      default:
    }
  }

  _enterMidpoint(tr) {
    tr.frozen = false;
    this.overlayPass.mode = 'normal';
    const u = this.overlayPass.uniforms;
    u.uCoverColor.value.copy(tr.coverColor);
    this._setCover(tr.reveal === 'iris' ? 'iris' : 'fade', 1, tr);
    tr.phase = 'wait';
    const toWarm = () => {
      if (this._tr !== tr) return;
      tr.phase = 'warm';
      tr.warm = 2;
    };
    let r;
    try {
      r = tr.opts.onMidpoint ? tr.opts.onMidpoint() : null;
    } catch (e) {
      tr.error = e;
    }
    if (r && typeof r.then === 'function') {
      r.then(toWarm, (e) => { tr.error = e; toWarm(); });
    } else toWarm();
  }

  _finishTransition(tr) {
    const u = this.overlayPass.uniforms;
    u.uCover.value = 0;
    u.uIris.value = -1;
    this.overlayPass.mode = 'normal';
    if (tr.type === 'shatter') this.overlayPass.shatter.release();
    this._tr = null;
    if (tr.error) tr.reject(tr.error);
    else tr.resolve();
    this._startNextTransition();
  }

  // ------------------------------------------------------------ helpers

  /**
   * CSS-pixel screen position of a world point in the current view (shake excluded).
   * `visible` is false behind the camera or off-screen. Pass `out` to reuse an object per frame.
   */
  projectToScreen(vec3, out = { x: 0, y: 0, visible: false }) {
    const cam = this.camera;
    if (!cam) { out.x = 0; out.y = 0; out.visible = false; return out; }
    cam.updateMatrixWorld();
    _proj.copy(vec3).project(cam);
    out.x = (_proj.x * 0.5 + 0.5) * this.size.width;
    out.y = (-_proj.y * 0.5 + 0.5) * this.size.height;
    out.visible = _proj.z > -1 && _proj.z < 1 && out.x >= 0 && out.x <= this.size.width && out.y >= 0 && out.y <= this.size.height;
    return out;
  }

  dispose() {
    this.stop();
    this._ro?.disconnect();
    window.removeEventListener('resize', this._onWindowResize);
    for (const p of this.composer.passes) p.dispose?.();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
