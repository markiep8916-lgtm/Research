// Unified input: keyboard (KeyboardEvent.code, so WASD works on any layout), standard-mapping
// gamepads and a touch overlay (floating stick + A/B/menu/sound/boost buttons), all folded into
// one set of named actions with per-frame edges.
//
//   input.update()            once per frame, before game logic
//   input.pressed('confirm')  went down since the previous update
//   input.repeat('down')      pressed, or auto-repeat while held (menus)
//   input.heldFor('cancel')   seconds the action has been held (0 when up): hold-to-skip
//   input.axis()              { x, y } movement in [-1, 1], y+ = south
//
// Tab opens the menu, but Shift+Tab (and Tab on the title screen) is left to the browser so
// keyboard focus can always leave an embedded game.
//
// Event handlers latch presses, so a tap shorter than one frame is never lost. onAny() listeners
// run synchronously inside the DOM event (keyboard / pointer), which counts as a user gesture for
// AudioContext unlocking (iOS needs that).

import { injectCSS, isTouchDevice } from './util.js';

export const ACTIONS = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'menu', 'boostUp', 'boostDown', 'run', 'mute'];
const IDX = Object.fromEntries(ACTIONS.map((a, i) => [a, i]));
const N = ACTIONS.length;
const UP = IDX.up, DOWN = IDX.down, LEFT = IDX.left, RIGHT = IDX.right, RUN = IDX.run;

export const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Enter: 'confirm', NumpadEnter: 'confirm', Space: 'confirm', KeyZ: 'confirm',
  Escape: 'cancel', KeyX: 'cancel', Backspace: 'cancel',
  Tab: 'menu', KeyC: 'menu',
  KeyE: 'boostUp', BracketRight: 'boostUp',
  KeyQ: 'boostDown', BracketLeft: 'boostDown',
  ShiftLeft: 'run', ShiftRight: 'run',
  KeyM: 'mute',
};

// Standard gamepad mapping: button index -> action index.
const PAD_BUTTONS = [
  [0, IDX.confirm], [1, IDX.cancel], [2, IDX.run], [3, IDX.menu], [9, IDX.menu],
  [4, IDX.boostDown], [5, IDX.boostUp], [12, UP], [13, DOWN], [14, LEFT], [15, RIGHT],
];

const REPEAT_DELAY = 280;
const REPEAT_RATE = 85;
const PAD_DEADZONE = 0.22;     // radial, analog movement
const DIR_ON = 0.55;           // stick -> digital direction hysteresis (menus)
const DIR_OFF = 0.35;
const TOUCH_RADIUS = 52;       // px the knob can travel
const TOUCH_DEADZONE = 0.12;
const TOUCH_RUN = 0.92;        // stick deflection that counts as 'run' (touch runs automatically)

const CSS = `
.vp-touch { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity .25s var(--vp-ease-out); font-family: var(--vp-font-display); }
.vp-touch.is-on { opacity: 1; }
.vp-touch.is-on .vp-tc { pointer-events: auto; }
.vp-tc { position: absolute; display: none; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
/* which controls exist per input context */
.vp-touch[data-ctx="explore"] .vp-tc-stick { display: block; }
.vp-touch[data-ctx="explore"] .vp-tc-a, .vp-touch[data-ctx="explore"] .vp-tc-b,
.vp-touch[data-ctx="explore"] .vp-tc-menu, .vp-touch[data-ctx="explore"] .vp-tc-mute,
.vp-touch[data-ctx="battle"] .vp-tc-a, .vp-touch[data-ctx="battle"] .vp-tc-b,
.vp-touch[data-ctx="battle"] .vp-tc-boost, .vp-touch[data-ctx="battle"] .vp-tc-mute { display: grid; }

/* floating stick: the zone is the lower-left half; the base jumps under the thumb */
.vp-tc-stick { left: 0; bottom: 0; width: 50%; height: 58%; }
.vp-stick-base { position: absolute; left: 0; top: 0; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%;
  background: radial-gradient(circle, rgba(8,13,26,.10) 0 38%, rgba(8,13,26,.42) 39% 100%);
  border: 1px solid rgba(140,214,255,.35); box-shadow: 0 0 0 3px rgba(127,227,255,.06);
  opacity: .38; transition: opacity .2s var(--vp-ease-out); }
.vp-stick-base::before { content: ''; position: absolute; inset: 10px; border-radius: 50%; border: 1px dashed rgba(140,214,255,.22); }
.vp-tc-stick.is-active .vp-stick-base { opacity: 1; transition: none; }
.vp-stick-knob { position: absolute; left: 50%; top: 50%; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, rgba(200,236,255,.55), rgba(60,110,170,.45) 55%, rgba(14,24,46,.75));
  border: 1px solid rgba(190,236,255,.7); box-shadow: 0 0 0 3px rgba(127,227,255,.14), 0 4px 10px rgba(0,0,0,.35); }

.vp-tc-btn { width: 64px; height: 64px; border-radius: 50%; place-items: center;
  background: radial-gradient(circle at 50% 35%, rgba(36,56,96,.62), rgba(8,13,26,.72));
  border: 1px solid rgba(140,214,255,.5); color: var(--vp-ink); font-weight: 700; font-size: 22px; letter-spacing: 0;
  box-shadow: 0 4px 10px rgba(0,0,0,.35), inset 0 0 0 3px rgba(127,227,255,.06); transition: transform .08s, box-shadow .08s, background .08s; }
.vp-tc-btn span { display: grid; place-items: center; width: 100%; height: 100%; line-height: 1; }
.vp-tc-btn.is-down { transform: scale(.9); background: radial-gradient(circle at 50% 40%, rgba(80,130,200,.75), rgba(14,24,46,.85)); box-shadow: 0 0 0 4px rgba(127,227,255,.22); }
.vp-tc-a { right: calc(22px + var(--vp-safe-right)); bottom: calc(92px + var(--vp-safe-bottom)); width: 74px; height: 74px; font-size: 26px;
  color: var(--vp-amber); border-color: rgba(255,197,96,.75); box-shadow: 0 4px 10px rgba(0,0,0,.35), 0 0 0 4px rgba(255,197,96,.08), inset 0 0 0 3px rgba(255,197,96,.1); }
.vp-tc-a.is-down { box-shadow: 0 0 0 5px rgba(255,197,96,.3); }
.vp-tc-b { right: calc(108px + var(--vp-safe-right)); bottom: calc(36px + var(--vp-safe-bottom)); width: 58px; height: 58px; font-size: 20px; }
.vp-tc-boost { right: calc(28px + var(--vp-safe-right)); width: 50px; height: 50px; font-size: 26px; color: var(--vp-bp); border-color: rgba(255,179,71,.6); }
.vp-tc-plus { bottom: calc(240px + var(--vp-safe-bottom)); }
.vp-tc-minus { bottom: calc(180px + var(--vp-safe-bottom)); }
.vp-tc-menu, .vp-tc-mute { top: calc(14px + var(--vp-safe-top)); width: 44px; height: 44px; border-radius: 10px; }
.vp-tc-menu { right: calc(14px + var(--vp-safe-right)); }
.vp-tc-mute { right: calc(66px + var(--vp-safe-right)); }
.vp-touch[data-ctx="battle"] .vp-tc-mute { right: calc(14px + var(--vp-safe-right)); }
/* line icons (inline SVG, currentColor) */
.vp-tc-btn svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.vp-tc-mute .vp-snd-off, .vp-tc-mute.is-muted .vp-snd-on { display: none; }
.vp-tc-mute.is-muted .vp-snd-off { display: inline; }
.vp-tc-mute.is-muted { color: var(--vp-ink-faint); }
@media (max-width: 380px) { .vp-tc-a { width: 66px; height: 66px; } .vp-tc-b { right: calc(96px + var(--vp-safe-right)); } }
`;

const ICON_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h11"/></svg>';
const ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/>'
  + '<path class="vp-snd-on" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/><path class="vp-snd-off" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';

export class Input {
  constructor({ touchLayer = null, target = window } = {}) {
    this.target = target;
    this.touchLayer = touchLayer;
    this.lastDevice = 'keyboard';
    this.context = 'explore';

    this._kb = new Uint8Array(N);          // count of held keys per action
    this._pad = new Uint8Array(N);         // gamepad buttons
    this._touch = new Uint8Array(N);       // touch buttons (count of pointers)
    this._dir = new Uint8Array(4);         // stick-derived digital directions (pad + touch, hysteresis)
    this._held = new Uint8Array(N);
    this._prev = new Uint8Array(N);
    this._latchP = new Uint8Array(N);      // press seen by an event handler since last update
    this._latchR = new Uint8Array(N);
    this._fired = new Uint8Array(N);       // onAny already fired from the event handler
    this._pressed = new Uint8Array(N);
    this._released = new Uint8Array(N);
    this._repeat = new Uint8Array(N);
    this._nextRepeat = new Float64Array(N);
    this._downAt = new Float64Array(N);    // performance.now() when the action went down
    this._keys = new Set();
    this._any = new Set();
    this._axis = { x: 0, y: 0 };
    this._padAxis = { x: 0, y: 0 };
    this._touchAxis = { x: 0, y: 0 };
    this._padsConnected = 0;
    this._touchOn = false;
    this._touchForced = null;           // null = automatic (shown while the last device is touch)

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onPointerAny = this._onPointerAny.bind(this);
    this._onPadConnect = () => { this._padsConnected++; };
    this._onPadDisconnect = () => { this._padsConnected = Math.max(0, this._padsConnected - 1); this._pad.fill(0); };

    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('visibilitychange', this._onBlur);
    window.addEventListener('pointerdown', this._onPointerAny, true);
    window.addEventListener('gamepadconnected', this._onPadConnect);
    window.addEventListener('gamepaddisconnected', this._onPadDisconnect);
    this._installGestureGuards();

    if (touchLayer) this._buildTouch(touchLayer);
    if (isTouchDevice()) { this.lastDevice = 'touch'; this._setTouchVisible(true); }
  }

  // ------------------------------------------------------------------ per-frame

  update() {
    const now = performance.now();
    this._pollPad();
    const kb = this._kb, pad = this._pad, tch = this._touch, dir = this._dir;
    const held = this._held, prev = this._prev;
    for (let i = 0; i < N; i++) {
      let h = kb[i] > 0 || pad[i] > 0 || tch[i] > 0;
      if (!h && i <= RIGHT) h = dir[i] > 0;            // up/down/left/right are indices 0-3
      if (!h && i === RUN) h = this._touchRun;
      held[i] = h ? 1 : 0;
      const p = (h && !prev[i]) || this._latchP[i] > 0;
      const r = (!h && prev[i]) || this._latchR[i] > 0;
      this._pressed[i] = p ? 1 : 0;
      this._released[i] = r ? 1 : 0;
      if (h && !prev[i]) this._downAt[i] = now;
      if (p) { this._repeat[i] = 1; this._nextRepeat[i] = now + REPEAT_DELAY; }
      else if (h && now >= this._nextRepeat[i]) { this._repeat[i] = 1; this._nextRepeat[i] = now + REPEAT_RATE; }
      else this._repeat[i] = 0;
      if (p && !this._fired[i]) this._emitAny(ACTIONS[i]);
      prev[i] = held[i];
    }
    this._latchP.fill(0);
    this._latchR.fill(0);
    this._fired.fill(0);
    this._computeAxis();
  }

  down(action) { return this._held[IDX[action]] === 1; }
  pressed(action) { return this._pressed[IDX[action]] === 1; }
  repeat(action) { return this._repeat[IDX[action]] === 1; }
  released(action) { return this._released[IDX[action]] === 1; }
  /** Seconds `action` has been held without a release (0 while it is up). */
  heldFor(action) {
    const i = IDX[action];
    return this._held[i] ? (performance.now() - this._downAt[i]) / 1000 : 0;
  }

  /** Movement vector, length <= 1. The returned object is reused every frame: copy it to keep it. */
  axis() { return this._axis; }

  consume(action) {
    const i = IDX[action];
    if (i === undefined) return;
    this._pressed[i] = 0;
    this._repeat[i] = 0;
    this._nextRepeat[i] = performance.now() + REPEAT_DELAY;
  }

  /** Clears every edge this frame (e.g. after a scene change, so one press is not seen twice). */
  consumeAll() { for (const a of ACTIONS) this.consume(a); }

  setContext(ctx) {
    if (ctx === this.context) return;
    this.context = ctx;
    if (this._touchRoot) {
      this._touchRoot.dataset.ctx = ctx;
      if (ctx !== 'explore') this._stickReset();
      this._releaseTouchButtons();
    }
  }

  onAny(fn) {
    this._any.add(fn);
    return () => this._any.delete(fn);
  }

  /** Force the touch overlay on (true), off (false) or back to automatic (null). */
  showTouch(on) {
    this._touchForced = on;
    this._setTouchVisible(on == null ? this.lastDevice === 'touch' : on);
  }

  get touchVisible() { return this._touchOn; }

  /** Mirror the audio mute state on the touch sound button. */
  setMutedIndicator(muted) {
    if (this._muteBtn) this._muteBtn.classList.toggle('is-muted', !!muted);
  }

  dispose() {
    this.target.removeEventListener('keydown', this._onKeyDown);
    this.target.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('visibilitychange', this._onBlur);
    window.removeEventListener('pointerdown', this._onPointerAny, true);
    window.removeEventListener('gamepadconnected', this._onPadConnect);
    window.removeEventListener('gamepaddisconnected', this._onPadDisconnect);
    for (const [type, fn, opts] of this._guards) document.removeEventListener(type, fn, opts);
    if (this._touchRoot) this._touchRoot.remove();
  }

  // ------------------------------------------------------------------ keyboard

  _onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;       // leave browser shortcuts alone
    const a = KEYMAP[e.code];
    if (a === undefined) return;
    // let focus leave the page: Shift+Tab always, Tab on the title screen (WCAG 2.1.2)
    if (e.code === 'Tab' && (e.shiftKey || this.context === 'title')) return;
    e.preventDefault();
    this._setDevice('keyboard');
    if (e.repeat || this._keys.has(e.code)) return;      // OS auto-repeat: we run our own
    this._keys.add(e.code);
    const i = IDX[a];
    this._kb[i]++;
    this._latchP[i] = 1;
    this._fireNow(i);
  }

  _onKeyUp(e) {
    if (!this._keys.has(e.code)) return;
    this._keys.delete(e.code);
    const i = IDX[KEYMAP[e.code]];
    if (this._kb[i] > 0 && --this._kb[i] === 0) this._latchR[i] = 1;
  }

  _onBlur() {
    if (document.visibilityState === 'visible' && document.hasFocus()) return;
    this._keys.clear();
    this._kb.fill(0);
    this._pad.fill(0);
    this._dir.fill(0);
    this._stickReset();
    this._releaseTouchButtons();
  }

  // ------------------------------------------------------------------ gamepad

  _pollPad() {
    if (!this._padsConnected || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const pad = this._pad;
    pad.fill(0);
    let ax = 0, ay = 0, best = 0, active = false;
    for (let p = 0; p < pads.length; p++) {
      const gp = pads[p];
      if (!gp || !gp.connected) continue;
      for (let k = 0; k < PAD_BUTTONS.length; k++) {
        const b = gp.buttons[PAD_BUTTONS[k][0]];
        if (b && (b.pressed || b.value > 0.5)) { pad[PAD_BUTTONS[k][1]] = 1; active = true; }
      }
      const x = gp.axes[0] || 0, y = gp.axes[1] || 0;
      const m = x * x + y * y;
      if (m > best) { best = m; ax = x; ay = y; }
    }
    const mag = Math.sqrt(best);
    if (mag > 0.5) active = true;
    if (mag < PAD_DEADZONE) { this._padAxis.x = 0; this._padAxis.y = 0; }
    else {
      const s = Math.min(1, (mag - PAD_DEADZONE) / (1 - PAD_DEADZONE)) / mag;
      this._padAxis.x = ax * s;
      this._padAxis.y = ay * s;
    }
    if (active) this._setDevice('gamepad');
    this._updateDirs();
  }

  // stick (pad or touch) -> digital directions with hysteresis so menus do not chatter
  _updateDirs() {
    const x = this._padAxis.x + this._touchAxis.x;
    const y = this._padAxis.y + this._touchAxis.y;
    const d = this._dir;
    d[UP] = (d[UP] ? y < -DIR_OFF : y < -DIR_ON) ? 1 : 0;
    d[DOWN] = (d[DOWN] ? y > DIR_OFF : y > DIR_ON) ? 1 : 0;
    d[LEFT] = (d[LEFT] ? x < -DIR_OFF : x < -DIR_ON) ? 1 : 0;
    d[RIGHT] = (d[RIGHT] ? x > DIR_OFF : x > DIR_ON) ? 1 : 0;
  }

  _computeAxis() {
    const kb = this._kb, pad = this._pad;
    let dx = ((kb[RIGHT] || pad[RIGHT]) ? 1 : 0) - ((kb[LEFT] || pad[LEFT]) ? 1 : 0);
    let dy = ((kb[DOWN] || pad[DOWN]) ? 1 : 0) - ((kb[UP] || pad[UP]) ? 1 : 0);
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    let x = dx + this._padAxis.x + this._touchAxis.x;
    let y = dy + this._padAxis.y + this._touchAxis.y;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    this._axis.x = x;
    this._axis.y = y;
  }

  // ------------------------------------------------------------------ touch overlay

  _buildTouch(layer) {
    injectCSS('vp-input', CSS);
    const root = document.createElement('div');
    root.className = 'vp-touch';
    root.dataset.ctx = this.context;
    root.innerHTML = `
      <div class="vp-tc vp-tc-stick"><div class="vp-stick-base"><div class="vp-stick-knob"></div></div></div>
      <div class="vp-tc vp-tc-btn vp-tc-a" data-act="confirm" aria-label="Confirm"><span>A</span></div>
      <div class="vp-tc vp-tc-btn vp-tc-b" data-act="cancel" aria-label="Cancel"><span>B</span></div>
      <div class="vp-tc vp-tc-btn vp-tc-boost vp-tc-plus" data-act="boostUp" aria-label="Boost up"><span>+</span></div>
      <div class="vp-tc vp-tc-btn vp-tc-boost vp-tc-minus" data-act="boostDown" aria-label="Boost down"><span>&minus;</span></div>
      <div class="vp-tc vp-tc-btn vp-tc-menu" data-act="menu" aria-label="Menu"><span>${ICON_MENU}</span></div>
      <div class="vp-tc vp-tc-btn vp-tc-mute" data-act="mute" aria-label="Sound"><span>${ICON_SOUND}</span></div>`;
    layer.appendChild(root);
    this._touchRoot = root;
    this._muteBtn = root.querySelector('.vp-tc-mute');
    this._buttons = [...root.querySelectorAll('.vp-tc-btn')];
    for (const b of this._buttons) this._wireButton(b);
    this._wireStick(root.querySelector('.vp-tc-stick'));
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _wireButton(btn) {
    const i = IDX[btn.dataset.act];
    btn._pointers = new Set();
    const up = (e) => {
      if (!btn._pointers.delete(e.pointerId)) return;
      if (btn._pointers.size) return;
      btn.classList.remove('is-down');
      if (this._touch[i] > 0 && --this._touch[i] === 0) this._latchR[i] = 1;
    };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn._pointers.has(e.pointerId)) return;
      try { btn.setPointerCapture(e.pointerId); } catch { /* synthetic events cannot capture */ }
      btn._pointers.add(e.pointerId);
      btn.classList.add('is-down');
      this._touch[i]++;
      this._latchP[i] = 1;
      this._fireNow(i);
    });
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
  }

  _releaseTouchButtons() {
    if (!this._buttons) return;
    for (const b of this._buttons) {
      if (!b._pointers.size) continue;
      b._pointers.clear();
      b.classList.remove('is-down');
    }
    for (let i = 0; i < N; i++) if (this._touch[i]) { this._touch[i] = 0; this._latchR[i] = 1; }
  }

  _wireStick(zone) {
    this._stickZone = zone;
    this._stickBase = zone.firstElementChild;
    this._stickKnob = this._stickBase.firstElementChild;
    this._stickId = null;
    this._touchRun = false;
    const move = (e) => {
      if (e.pointerId !== this._stickId) return;
      let dx = e.clientX - this._stickCx, dy = e.clientY - this._stickCy;
      const m = Math.hypot(dx, dy);
      const k = Math.min(1, TOUCH_RADIUS / (m || 1));   // keep the knob inside the ring
      dx *= k;
      dy *= k;
      this._stickKnob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      const n = Math.min(1, m / TOUCH_RADIUS);
      if (n < TOUCH_DEADZONE) { this._touchAxis.x = 0; this._touchAxis.y = 0; }
      else {
        const s = (n - TOUCH_DEADZONE) / (1 - TOUCH_DEADZONE) / (m || 1);
        this._touchAxis.x = Math.max(-1, Math.min(1, (e.clientX - this._stickCx) * s));
        this._touchAxis.y = Math.max(-1, Math.min(1, (e.clientY - this._stickCy) * s));
      }
      this._touchRun = n >= TOUCH_RUN;
      this._updateDirs();
    };
    const end = (e) => { if (e.pointerId === this._stickId) this._stickReset(); };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this._stickId != null) return;
      this._stickId = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch { /* synthetic events cannot capture */ }
      const r = zone.getBoundingClientRect();
      // keep the whole base on screen even when the thumb lands near an edge
      const cx = Math.max(r.left + 64, Math.min(r.right - 20, e.clientX));
      const cy = Math.max(r.top + 64, Math.min(r.bottom - 64, e.clientY));
      this._stickCx = cx;
      this._stickCy = cy;
      this._stickBase.style.left = `${cx - r.left}px`;
      this._stickBase.style.top = `${cy - r.top}px`;
      zone.classList.add('is-active');
      move(e);
    });
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
    this._stickReset();
  }

  _stickReset() {
    if (!this._stickZone) return;
    this._stickId = null;
    this._touchAxis.x = 0;
    this._touchAxis.y = 0;
    this._touchRun = false;
    this._updateDirs();
    this._stickZone.classList.remove('is-active');
    this._stickKnob.style.transform = '';
    // idle "ghost" position hints where the stick lives
    this._stickBase.style.left = 'calc(96px + var(--vp-safe-left))';
    this._stickBase.style.top = 'calc(100% - 118px - var(--vp-safe-bottom))';
  }

  _setTouchVisible(on) {
    if (!this._touchRoot || on === this._touchOn) return;
    this._touchOn = on;
    this._touchRoot.classList.toggle('is-on', on);
    if (!on) { this._stickReset(); this._releaseTouchButtons(); }
  }

  // ------------------------------------------------------------------ devices + gestures

  _onPointerAny(e) {
    if (e.pointerType === 'touch') this._setDevice('touch');
    for (const fn of this._any) fn('pointer');
  }

  _setDevice(d) {
    if (this.lastDevice === d) return;
    this.lastDevice = d;
    if (this._touchForced == null) this._setTouchVisible(d === 'touch');
  }

  _fireNow(i) {
    this._fired[i] = 1;
    this._emitAny(ACTIONS[i]);
  }

  _emitAny(action) {
    for (const fn of this._any) fn(action);
  }

  // Block page scroll, pinch-zoom and double-tap zoom; scrollable UI lists opt back in with .vp-scroll.
  _installGestureGuards() {
    const noScroll = (e) => {
      const t = e.target;
      if (t && t.closest && t.closest('.vp-scroll') && e.touches && e.touches.length === 1) return;
      if (e.cancelable) e.preventDefault();
    };
    const noPinch = (e) => { if (e.touches && e.touches.length > 1 && e.cancelable) e.preventDefault(); };
    const prevent = (e) => e.preventDefault();
    this._guards = [
      ['touchmove', noScroll, { passive: false }],
      ['touchstart', noPinch, { passive: false }],
      ['gesturestart', prevent, { passive: false }],
      ['dblclick', prevent, { passive: false }],
    ];
    for (const [type, fn, opts] of this._guards) document.addEventListener(type, fn, opts);
  }
}
