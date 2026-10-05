'use strict';
// Core: constants, math, seeded RNG, input (keyboard, touch, gamepad), bitmap font, screen.

const W = 384, H = 216;           // internal resolution
// Content registries, declared first so every content module can fill them while the script loads.
const STAGES = [];                                   // stage modules assign STAGES[0..2]
const STORY = { intro: [], between: [], ending: [] }; // story cards
const STEP = 1 / 60;              // fixed simulation step

// ---------- math ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sign = v => (v < 0 ? -1 : v > 0 ? 1 : 0);
const approach = (v, target, amt) => (v < target ? Math.min(v + amt, target) : Math.max(v - amt, target));
const easeOut = t => 1 - (1 - t) * (1 - t);
const TAU = Math.PI * 2;

// Seeded RNG (mulberry32) so runs are reproducible in tests.
let _seed = 0x9e3779b9;
function seedRng(s) { _seed = s >>> 0; }
function rand() {
  _seed = (_seed + 0x6d2b79f5) >>> 0;
  let t = _seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rr = (a, b) => a + rand() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = arr => arr[Math.floor(rand() * arr.length)];
const chance = p => rand() < p;

// ---------- storage (best effort, never required) ----------
const Store = {
  get(k, d) { try { const v = localStorage.getItem('wb_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('wb_' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
};

// ---------- input ----------
const ACTIONS = ['left', 'right', 'up', 'down', 'attack', 'jump', 'special', 'start'];
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyJ: 'attack', KeyZ: 'attack',
  KeyK: 'jump', KeyX: 'jump', Space: 'jump',
  KeyL: 'special', KeyC: 'special',
  Enter: 'start', Escape: 'start', KeyP: 'start',
};

const Input = {
  key: {}, touch: {}, pad: {},
  cur: {}, prev: {},
  tapTime: { left: -99, right: -99 },
  tapPrev: { left: -99, right: -99 },
  frame: 0,
  anyPressed: false,
  tap: false,          // a tap on the game screen outside play: one frame of 'attack'
  lastDevice: 'keyboard',
  init(target) {
    window.addEventListener('keydown', e => {
      const a = KEYMAP[e.code];
      if (!a) return;
      // let Enter/Space activate a focused page button (Sound, Fullscreen) instead of the game
      if (e.target && e.target.closest && e.target.closest('button')) return;
      e.preventDefault();
      this.key[a] = true;
      this.lastDevice = 'keyboard';
    });
    window.addEventListener('keyup', e => {
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      this.key[a] = false;
    });
    window.addEventListener('blur', () => { this.key = {}; this.touch = {}; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.key = {}; this.touch = {}; } });
  },
  // Bind on-screen buttons. Each element carries data-act="left" etc. A d-pad element uses data-dpad.
  bindTouch(root) {
    const pointers = new Map(); // pointerId -> { el, acts }
    const actsAt = (el, x, y) => {
      if (!el) return [];
      if (el.dataset.dpad != null) {
        const r = el.getBoundingClientRect();
        const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
        const dead = r.width * 0.16, out = [];
        if (dx < -dead) out.push('left');
        if (dx > dead) out.push('right');
        if (dy < -dead) out.push('up');
        if (dy > dead) out.push('down');
        return out;
      }
      return el.dataset.act ? [el.dataset.act] : [];
    };
    const handle = e => {
      const el = e.target.closest('[data-act],[data-dpad]');
      if (e.type === 'pointerdown') {
        if (!el) return;
        e.preventDefault();
        try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        pointers.set(e.pointerId, { el, acts: actsAt(el, e.clientX, e.clientY) });
        this.lastDevice = 'touch';
      } else if (e.type === 'pointermove') {
        const p = pointers.get(e.pointerId);
        if (!p) return;
        e.preventDefault();
        // a thumb sliding between action buttons presses the new one; d-pad and PAUSE fingers stay put
        if (p.el.dataset.dpad == null && p.el.dataset.act !== 'start') {
          const hit = document.elementFromPoint(e.clientX, e.clientY);
          const nel = hit && hit.closest('[data-act]:not([data-act="start"])');
          if (nel && root.contains(nel)) p.el = nel;
        }
        p.acts = actsAt(p.el, e.clientX, e.clientY);
      } else {
        pointers.delete(e.pointerId);
      }
      const t = {};
      for (const p of pointers.values()) for (const a of p.acts) t[a] = true;
      this.touch = t;
      root.querySelectorAll('[data-act],[data-dpad]').forEach(b => {
        const on = b.dataset.dpad != null ? ['left', 'right', 'up', 'down'].some(a => t[a]) : !!t[b.dataset.act];
        b.classList.toggle('on', on);
      });
    };
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture'].forEach(type =>
      root.addEventListener(type, handle, { passive: false }));
    root.addEventListener('contextmenu', e => e.preventDefault());
  },
  pollPad() {
    this.pad = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      const b = i => gp.buttons[i] && gp.buttons[i].pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      const p = this.pad;
      p.left = p.left || ax < -0.4 || b(14);
      p.right = p.right || ax > 0.4 || b(15);
      p.up = p.up || ay < -0.4 || b(12);
      p.down = p.down || ay > 0.4 || b(13);
      p.attack = p.attack || b(2) || b(3);
      p.jump = p.jump || b(0);
      p.special = p.special || b(1) || b(5);
      p.start = p.start || b(9);
      if (ACTIONS.some(a => p[a])) this.lastDevice = 'gamepad';
    }
  },
  // Called once per simulation step.
  update() {
    this.frame++;
    this.pollPad();
    this.prev = this.cur;
    const c = {};
    let any = false;
    for (const a of ACTIONS) {
      c[a] = !!(this.key[a] || this.touch[a] || this.pad[a]);
      if (a === 'attack' && this.tap) { c[a] = c[a] || !this.prev[a]; this.tap = false; }
      if (c[a] && !this.prev[a]) any = true;
    }
    this.cur = c;
    this.anyPressed = any;
    for (const d of ['left', 'right']) {
      if (this.pressed(d)) { this.tapPrev[d] = this.tapTime[d]; this.tapTime[d] = this.frame; }
    }
  },
  down(a) { return !!this.cur[a]; },
  pressed(a) { return !!this.cur[a] && !this.prev[a]; },
  released(a) { return !this.cur[a] && !!this.prev[a]; },
  // True on the frame a direction is tapped twice within `win` frames.
  doubleTap(d, win = 14) { return this.pressed(d) && this.tapTime[d] - this.tapPrev[d] <= win; },
  dirX() { return (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0); },
  dirY() { return (this.down('down') ? 1 : 0) - (this.down('up') ? 1 : 0); },
  clear() { this.key = {}; this.touch = {}; this.cur = {}; this.prev = {}; this.tap = false; },
};

// ---------- 5x7 bitmap font ----------
const GLYPHS = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31],
  3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
  6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14],
  9: [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4],
  '.': [0, 0, 0, 0, 0, 0, 4], ',': [0, 0, 0, 0, 0, 4, 8], ':': [0, 4, 4, 0, 4, 4, 0],
  '-': [0, 0, 0, 14, 0, 0, 0], "'": [4, 4, 8, 0, 0, 0, 0], '/': [1, 1, 2, 4, 8, 16, 16],
  '+': [0, 4, 4, 31, 4, 4, 0], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2],
  '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '%': [24, 25, 2, 4, 8, 19, 3],
  '#': [10, 10, 31, 10, 31, 10, 10], '=': [0, 0, 31, 0, 31, 0, 0], '*': [0, 4, 21, 14, 21, 4, 0],
  '"': [10, 10, 0, 0, 0, 0, 0], '&': [12, 18, 20, 8, 21, 18, 13], '_': [0, 0, 0, 0, 0, 0, 31],
  '~': [0, 0, 8, 21, 2, 0, 0], '^': [4, 10, 17, 0, 0, 0, 0],
};
// Render glyphs once into an atlas per colour for speed.
const _fontCache = new Map();
function glyphAtlas(color) {
  let c = _fontCache.get(color);
  if (c) return c;
  const keys = Object.keys(GLYPHS);
  const cv = document.createElement('canvas');
  cv.width = keys.length * 6; cv.height = 7;
  const g = cv.getContext('2d');
  g.fillStyle = color;
  const index = {};
  keys.forEach((k, i) => {
    index[k] = i;
    GLYPHS[k].forEach((row, y) => {
      for (let x = 0; x < 5; x++) if (row & (16 >> x)) g.fillRect(i * 6 + x, y, 1, 1);
    });
  });
  c = { cv, index };
  _fontCache.set(color, c);
  return c;
}
function textWidth(str, scale = 1) { return str.length ? (str.length * 6 - 1) * scale : 0; }
// align: 'left' | 'center' | 'right'. shadow: colour for a 1px drop shadow (or null).
function drawText(ctx, str, x, y, color = '#fff', scale = 1, align = 'left', shadow = '#000') {
  str = String(str).toUpperCase();
  const w = textWidth(str, scale);
  let px = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  const py = Math.round(y);
  if (shadow) drawTextRaw(ctx, str, px + scale, py + scale, shadow, scale);
  drawTextRaw(ctx, str, px, py, color, scale);
}
function drawTextRaw(ctx, str, px, py, color, scale) {
  const { cv, index } = glyphAtlas(color);
  for (let i = 0; i < str.length; i++) {
    const gi = index[str[i]];
    if (gi != null) ctx.drawImage(cv, gi * 6, 0, 5, 7, px + i * 6 * scale, py, 5 * scale, 7 * scale);
  }
}

// ---------- screen ----------
const Screen = {
  view: null, vctx: null,          // visible canvas
  buf: null, ctx: null,            // internal 384x216 buffer
  init(view) {
    this.view = view;
    this.vctx = view.getContext('2d');
    this.buf = document.createElement('canvas');
    this.buf.width = W; this.buf.height = H;
    this.ctx = this.buf.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    const fit = () => this.fit();
    window.addEventListener('resize', fit);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(view.parentElement);
    this.fit();
  },
  fit() {
    const box = this.view.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bw = 6;                    // the canvas carries a 3 px bezel border on each side
    let cw = box.width - bw, ch = cw * H / W;
    if (box.height > 0 && ch > box.height - bw) { ch = box.height - bw; cw = ch * W / H; }
    cw = Math.max(1, Math.floor(cw)); ch = Math.max(1, Math.floor(ch));
    this.view.style.width = cw + 'px';
    this.view.style.height = ch + 'px';
    const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    if (this.view.width !== pw || this.view.height !== ph) { this.view.width = pw; this.view.height = ph; }
  },
  present() {
    const v = this.vctx;
    v.imageSmoothingEnabled = false;
    v.drawImage(this.buf, 0, 0, this.view.width, this.view.height);
  },
};
