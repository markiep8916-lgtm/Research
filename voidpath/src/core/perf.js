// Frame-time monitor, ?stats=1 overlay and automatic quality drop (TECH_PLAN 11.6).
// The Engine attaches it on construction (also reachable as engine.perf); nothing else is required.
// Optional wiring:
//
//   perf.setUi(ui)       toasts through ui.hud.toast and stores settings through ui.setSetting
//                        (without it: a small built-in toast and localStorage 'voidpath.settings.v1')
//   perf.watch(reason, { delay = 3 })   measure the average frame time over 3 s, `delay` s from now
//   perf.simulate(ms = 45, { delay = 0 }) -> Promise<result>   the next window reads `ms` for every
//                        frame (one-shot), so one automatic drop and its toast can be tested headless
//   perf.stats           { fps, frameMs, quality, locked, drops, window }
//   perf.result          the last window's { reason, avg, samples, dropped, from, to, skipped }
//
// Windows start by themselves 3 s after every scene the engine shows for the first time (map
// loads, battle stages). A scene with `userData.perf = 'battle'` is watched only for the first
// battle of the session, and `userData.perf = false` is never watched. Frames during transitions
// and stalls over 1 s (tab switches, one-off hitches) are left out of the average; a window needs
// 3 frames (1 when simulated).
//
// Automatic drop: if the average over the window exceeds 33 ms on high or medium, drop one tier,
// toast "Graphics lowered for smoother play" and store it in the settings with `qualityAuto: true`
// (the Settings tab shows its note from that). Only downward, at most once per 60 s, never with
// ?q= in the URL, never after the player chose a quality, and never under automation
// (navigator.webdriver) except through simulate().

const TIERS = ['low', 'medium', 'high'];
const WATCH_DELAY = 3;
const WATCH_SPAN = 3;
const DROP_MS = 33;
const DROP_COOLDOWN = 60;
const STALL_MS = 1000;   // a frame this long is a tab switch or a one-off hitch, not the frame rate
const MIN_SAMPLES = 3;
const SETTINGS_KEY = 'voidpath.settings.v1';
const TOAST_TEXT = 'Graphics lowered for smoother play';

const nowSec = () => performance.now() / 1000;

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') || {};
  } catch {
    return {};
  }
}

function writeSettings(patch) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...readSettings(), ...patch }));
  } catch { /* storage blocked: the drop still applies for this session */ }
}

class Perf {
  constructor() {
    this.engine = null;
    this.ui = null;
    this.locked = null;          // null | 'url' | 'player'
    this.drops = 0;
    this.result = null;
    this._win = null;
    this._sim = null;
    this._lastDrop = -Infinity;
    this._battleSeen = false;
    this._fps = { frames: 0, t0: 0, fps: 0, ms: 0, sum: 0 };
    this._overlay = null;
    this._overlayT = 0;
  }

  attach(engine) {
    if (this.engine === engine) return;
    this.engine = engine;
    engine.perf = this;
    const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
    if (params.get('q')) this.locked = 'url';
    const saved = readSettings();
    if (!this.locked && saved.quality && saved.qualityAuto !== true) this.locked = 'player';
    this._fps.t0 = nowSec();
    engine.onUpdate(() => this._tick());
    engine.onViewChange((scene, camera, { fresh }) => {
      if (!fresh || scene.userData.perf === false) return;
      if (scene.userData.perf === 'battle') {
        if (this._battleSeen) return;
        this._battleSeen = true;
      }
      this.watch(scene.userData.perf || 'view');
    });
    engine.onQualityChange((q, { auto }) => {
      if (auto) return;
      const s = readSettings();
      if (s.qualityAuto === true && s.quality === q) return; // the UI re-applying a stored auto drop
      this.locked = this.locked || 'player';
      this._store({ qualityAuto: false });
    });
    if (params.get('stats') === '1') this._makeOverlay();
  }

  setUi(ui) {
    this.ui = ui || null;
  }

  watch(reason = 'manual', { delay = WATCH_DELAY } = {}) {
    const t = nowSec();
    if (this._win?.resolve) this._win.resolve(null);
    this._win = { reason, start: t + delay, end: t + delay + WATCH_SPAN, sum: 0, n: 0, skipped: 0, sim: this._sim, resolve: null };
    return this._win;
  }

  simulate(ms = 45, { delay = 0 } = {}) {
    this._sim = ms;
    const win = this.watch('simulate', { delay });
    return new Promise((resolve) => { win.resolve = resolve; });
  }

  get stats() {
    const f = this._fps;
    return {
      fps: Math.round(f.fps * 10) / 10,
      frameMs: Math.round(f.ms * 10) / 10,
      quality: this.engine?.quality ?? null,
      locked: this.locked,
      drops: this.drops,
      window: this._win ? { reason: this._win.reason, samples: this._win.n } : null,
    };
  }

  _tick() {
    const e = this.engine;
    const ms = e.frameMs;
    const t = nowSec();
    const f = this._fps;
    f.frames++;
    f.sum += ms;
    if (t - f.t0 >= 0.5) {
      f.fps = f.frames / (t - f.t0 || 1);
      f.ms = f.sum / f.frames;
      f.frames = 0;
      f.sum = 0;
      f.t0 = t;
    }
    const w = this._win;
    if (w && t >= w.start) {
      if (w.sim != null) { w.sum += w.sim; w.n++; } else if (e.transitioning || ms > STALL_MS) w.skipped++;
      else { w.sum += ms; w.n++; }
      if (t >= w.end) this._evaluate(w);
    }
    if (this._overlay && t - this._overlayT >= 0.25) {
      this._overlayT = t;
      this._paintOverlay();
    }
  }

  _evaluate(w) {
    this._win = null;
    if (w.sim != null) this._sim = null;
    const avg = w.n ? w.sum / w.n : 0;
    const res = { reason: w.reason, avg: Math.round(avg * 10) / 10, samples: w.n, skipped: w.skipped, dropped: false, from: this.engine.quality, to: this.engine.quality };
    if (w.n >= (w.sim != null ? 1 : MIN_SAMPLES) && avg > DROP_MS) {
      const why = this._blocked(w);
      if (why) res.blocked = why;
      else {
        const from = this.engine.quality;
        const to = TIERS[TIERS.indexOf(from) - 1];
        this._lastDrop = nowSec();
        this.drops++;
        this.engine.setQuality(to, { auto: true });
        this._store({ quality: to, qualityAuto: true });
        this._toast(TOAST_TEXT);
        Object.assign(res, { dropped: true, to });
      }
    }
    this.result = res;
    w.resolve?.(res);
  }

  _blocked(w) {
    if (this.locked) return this.locked;
    if (w.sim == null && typeof navigator !== 'undefined' && navigator.webdriver) return 'automation';
    if (TIERS.indexOf(this.engine.quality) <= 0) return 'lowest';
    if (nowSec() - this._lastDrop < DROP_COOLDOWN) return 'cooldown';
    return null;
  }

  _store(patch) {
    const ui = this.ui;
    if (ui?.setSetting) {
      for (const [k, v] of Object.entries(patch)) ui.setSetting(k, v);
    } else writeSettings(patch);
  }

  _toast(text) {
    const hud = this.ui?.hud;
    if (hud?.toast) {
      hud.toast(text, { icon: 'gear' });
      return;
    }
    const el = document.createElement('div');
    el.className = 'vp-perf-toast';
    el.textContent = text;
    el.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:96;'
      + 'padding:9px 18px;background:rgba(6,12,22,.9);border:1px solid rgba(127,227,255,.4);border-radius:3px;'
      + 'color:#dff6ff;font:600 13px/1.3 "Chakra Petch",system-ui,sans-serif;letter-spacing:.05em;'
      + 'pointer-events:none;transition:opacity .4s;';
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, 2600);
    setTimeout(() => el.remove(), 3100);
  }

  _makeOverlay() {
    const el = document.createElement('div');
    el.className = 'vp-perf-stats';
    el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:95;pointer-events:none;white-space:pre;'
      + 'padding:6px 8px;background:rgba(3,7,13,.78);border:1px solid rgba(127,227,255,.25);border-radius:3px;'
      + 'color:#9fe6ff;font:11px/1.35 ui-monospace,"Courier New",monospace;';
    document.body.appendChild(el);
    this._overlay = el;
  }

  _paintOverlay() {
    const e = this.engine;
    const i = e.renderInfo();
    const f = this._fps;
    const lines = [
      `${f.fps.toFixed(1).padStart(5)} fps  ${f.ms.toFixed(1).padStart(5)} ms`,
      `scene  ${String(i.scene.calls).padStart(4)} calls ${(i.scene.triangles / 1000).toFixed(1)}k tris`,
      `shadow ${String(i.shadow.calls).padStart(4)} calls  post ${i.post.calls}`,
      `programs ${i.programs}  compiles ${i.compiles}`,
      `textures ${i.textures}  geos ${i.geometries}`,
      `canvas ${i.canvasMB.toFixed(1)} MB`,
      `${i.quality} x${i.pixelRatio} ${i.renderSize.width}x${i.renderSize.height}`,
    ];
    if (this._win) lines.push(`watch ${this._win.reason} ${this._win.n}`);
    this._overlay.textContent = lines.join('\n');
  }
}

export const perf = new Perf();
