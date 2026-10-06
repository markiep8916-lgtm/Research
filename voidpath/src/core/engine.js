// VOIDPATH rendering engine: WebGL renderer, the 2D-HD post chain, the frame loop,
// camera shake / flash / hit-stop, and full-screen transitions (glass shatter, fade, iris).
//
// States own their scenes and cameras and hand them over with setView(); the engine only
// renders whatever is current, so it never stores game logic.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  DEFAULT_FX, cloneFx, mergeFx, ScaledBloomPass, TiltShiftPass, GradePass, OverlayPass,
} from './postfx.js';
import { clamp, ease } from './util.js';

export const QUALITY_PRESETS = Object.freeze({
  low: { pixelRatioCap: 1.0, shadows: false, bloomScale: 0.5, tiltTaps: 9, shatterMsaa: 0 },
  medium: { pixelRatioCap: 1.5, shadows: true, bloomScale: 1.0, tiltTaps: 11, shatterMsaa: 4 },
  high: { pixelRatioCap: 2.0, shadows: true, bloomScale: 1.0, tiltTaps: 13, shatterMsaa: 4 },
});

const MAX_PHYSICAL_HEIGHT = 1440;
const MAX_DT = 1 / 20;       // game-time clamp per frame
const MAX_REAL_DT = 0.1;     // real-time effects (hit-stop, shake, flash, transitions) per-frame cap
const TRANSITION_TYPES = ['shatter', 'fade', 'iris'];

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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 1);
    this.renderer = renderer;

    this.scene = null;
    this.camera = null;
    this.time = 0;          // game seconds (advances only while running, scaled, frozen in hit-stop)
    this.dt = 0;            // game delta of the last frame
    this.realTime = 0;      // unscaled seconds (drives grain, shake, flash, transitions)
    this.realDt = 0;        // unscaled delta, capped at 0.1 s
    this.timeScale = 1;
    this.transitionTimeScale = 1; // debug knob: < 1 slows transitions down
    this.size = { width: 1, height: 1, aspect: 1 };
    this.pixelRatio = 1;
    this.running = false;

    this._fx = cloneFx(DEFAULT_FX);
    this._updaters = [];
    this._updaterSnapshot = [];
    this._updatersDirty = false;
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
    // Compile the transition shaders now so the first encounter does not hitch.
    renderer.compile(this.overlayPass.shatter.scene, this.overlayPass.shatter.camera);
    this._applyFx();
    this._resize();

    // ---- resize tracking
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => { this._resizeDirty = true; });
      this._ro.observe(canvas);
    }
    this._onWindowResize = () => { this._resizeDirty = true; };
    window.addEventListener('resize', this._onWindowResize);
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
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

  // Toggling renderer.shadowMap.enabled does not rebuild already-compiled programs: do it per scene.
  _syncShadowPrograms(scene) {
    const on = this.renderer.shadowMap.enabled;
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

  setQuality(q) {
    if (!QUALITY_PRESETS[q]) return;
    this.quality = q;
    const preset = QUALITY_PRESETS[q];
    this.renderer.shadowMap.enabled = preset.shadows;
    if (this.scene) this._syncShadowPrograms(this.scene);
    this.bloomPass.setResScale(preset.bloomScale);
    this.tiltShiftPass.setTaps(preset.tiltTaps);
    this.overlayPass.shatter.samples = preset.shatterMsaa;
    this._resizeDirty = true;
    this._resize();
  }

  _measure() {
    const c = this.canvas;
    const w = Math.max(1, c.clientWidth || window.innerWidth || 1);
    const h = Math.max(1, c.clientHeight || window.innerHeight || 1);
    const dpr = window.devicePixelRatio || 1;
    const cap = QUALITY_PRESETS[this.quality].pixelRatioCap;
    this.size.width = w;
    this.size.height = h;
    this.size.aspect = w / h;
    this.pixelRatio = Math.max(0.25, Math.min(dpr, cap, MAX_PHYSICAL_HEIGHT / h));
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
   *   'fade' / 'iris': `duration` is the whole transition (half out, half in).
   * Extra options: color (fade/iris cover, shatter flash tint), onMidpoint (may return a promise),
   *   reveal ('fade' | 'iris', shatter only), revealDuration, center ({x, y} CSS px: iris centre /
   *   shatter impact point), ringColor (iris edge glow).
   */
  transition(type, { duration = 1.0, color, onMidpoint, ...rest } = {}) {
    if (!TRANSITION_TYPES.includes(type)) return Promise.reject(new Error(`Unknown transition "${type}"`));
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
