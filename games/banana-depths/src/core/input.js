// Unified input: keyboard, gamepad and on-screen touch buttons -> logical actions.
// Edge events are buffered between fixed ticks so quick taps are never lost.
const KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ', 'KeyK'],
  slap: ['KeyX', 'KeyJ'],
  roll: ['KeyC', 'KeyL', 'ShiftLeft', 'ShiftRight'],
  boom: ['KeyV', 'KeyI'],
  pause: ['Escape', 'KeyP'],
  map: ['KeyM', 'Tab'],
  confirm: ['Enter', 'Space', 'KeyZ'],
};
const CODE_TO_ACTIONS = {};
for (const [a, codes] of Object.entries(KEYS)) for (const c of codes) (CODE_TO_ACTIONS[c] ||= []).push(a);

export const ACTIONS = Object.keys(KEYS);

export class Input {
  constructor(target = window) {
    this.keyHeld = new Set();        // raw codes
    this.virtual = new Set();        // touch buttons
    this.pad = new Set();            // gamepad actions
    this.prev = new Set();           // combined held at last poll
    this.pressedBuf = new Set();
    this.releasedBuf = new Set();
    this.anyPressed = false;
    this.lastDevice = 'keyboard';
    this.enabled = true;
    this.scripted = null;            // test hook: function(frame) -> partial frame
    target.addEventListener('keydown', (e) => this.onKey(e, true));
    target.addEventListener('keyup', (e) => this.onKey(e, false));
    target.addEventListener('blur', () => { this.keyHeld.clear(); this.virtual.clear(); });
  }

  onKey(e, down) {
    const acts = CODE_TO_ACTIONS[e.code];
    if (!acts) { if (down && !e.repeat) { this.anyPressed = true; } return; }
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    e.preventDefault();
    if (down) {
      if (e.repeat) return;
      if (!this.keyHeld.has(e.code)) {
        this.keyHeld.add(e.code);
        this.lastDevice = 'keyboard';
        for (const a of acts) { if (!this.isHeldAction(a, e.code)) this.pressedBuf.add(a); }
        this.anyPressed = true;
      }
    } else {
      this.keyHeld.delete(e.code);
      for (const a of acts) if (!this.isHeldAction(a)) this.releasedBuf.add(a);
    }
  }

  /** is action held by any device other than the excluded code? */
  isHeldAction(a, exceptCode) {
    for (const c of KEYS[a]) if (c !== exceptCode && this.keyHeld.has(c)) return true;
    return this.virtual.has(a) || this.pad.has(a);
  }

  setVirtual(action, down) {
    if (down) {
      if (!this.virtual.has(action)) { this.virtual.add(action); this.pressedBuf.add(action); this.anyPressed = true; this.lastDevice = 'touch'; }
    } else if (this.virtual.delete(action)) this.releasedBuf.add(action);
  }

  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set();
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const b = (i) => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (ax < -0.4 || b(14)) now.add('left');
      if (ax > 0.4 || b(15)) now.add('right');
      if (ay < -0.5 || b(12)) now.add('up');
      if (ay > 0.5 || b(13)) now.add('down');
      if (b(0)) { now.add('jump'); now.add('confirm'); }
      if (b(2)) now.add('slap');
      if (b(1) || b(5) || b(7)) now.add('roll');
      if (b(3) || b(4) || b(6)) now.add('boom');
      if (b(9)) now.add('pause');
      if (b(8)) now.add('map');
    }
    for (const a of now) if (!this.pad.has(a)) { this.pressedBuf.add(a); this.anyPressed = true; this.lastDevice = 'pad'; }
    for (const a of this.pad) if (!now.has(a)) this.releasedBuf.add(a);
    this.pad = now;
  }

  held(a) {
    for (const c of KEYS[a]) if (this.keyHeld.has(c)) return true;
    return this.virtual.has(a) || this.pad.has(a);
  }

  /** Called once per fixed tick. Returns the frame snapshot and clears the edge buffers. */
  poll() {
    this.pollPad();
    const f = { pressed: {}, released: {}, held: {} };
    for (const a of ACTIONS) {
      f.held[a] = this.enabled && this.held(a);
      f.pressed[a] = this.enabled && this.pressedBuf.has(a);
      f.released[a] = this.enabled && this.releasedBuf.has(a);
    }
    f.dx = (f.held.right ? 1 : 0) - (f.held.left ? 1 : 0);
    f.dy = (f.held.up ? 1 : 0) - (f.held.down ? 1 : 0);
    f.any = this.anyPressed;
    this.pressedBuf.clear(); this.releasedBuf.clear(); this.anyPressed = false;
    if (this.scripted) {
      const o = this.scripted(f);
      if (o) {
        if (o.held) for (const a of ACTIONS) f.held[a] = !!o.held[a];
        if (o.pressed) for (const a of ACTIONS) f.pressed[a] = !!o.pressed[a];
        f.dx = (f.held.right ? 1 : 0) - (f.held.left ? 1 : 0);
        f.dy = (f.held.up ? 1 : 0) - (f.held.down ? 1 : 0);
      }
    }
    return f;
  }

  clear() { this.pressedBuf.clear(); this.releasedBuf.clear(); this.anyPressed = false; }
}
