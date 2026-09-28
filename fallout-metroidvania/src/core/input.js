// Input: keyboard, mouse, gamepad and virtual (touch) buttons unified into named actions.
(function () {
'use strict';
const CD = window.CD;

const BIND = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  jump: ['Space', 'KeyZ'], shoot: ['KeyJ', 'KeyX'], melee: ['KeyK', 'KeyF'], dash: ['ShiftLeft', 'ShiftRight', 'KeyL'],
  interact: ['KeyE', 'Enter'], heal: ['KeyQ', 'KeyH'], reload: ['KeyR'], grenade: ['KeyG'], vats: ['KeyV'],
  map: ['KeyM'], pip: ['Tab', 'KeyI'], pause: ['Escape', 'KeyP'], next: ['KeyT'], prev: ['KeyY'], mute: ['KeyN'],
  slot1: ['Digit1'], slot2: ['Digit2'], slot3: ['Digit3'], slot4: ['Digit4'], slot5: ['Digit5'], slot6: ['Digit6'], slot7: ['Digit7'], slot8: ['Digit8'], slot9: ['Digit9'],
  // menu-only aliases resolved in menus
  confirm: ['Enter', 'Space', 'KeyE'], back: ['Escape', 'Backspace'],
};
const PREVENT = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'ShiftLeft', 'ShiftRight']);

const I = (CD.input = {
  BIND, keys: {}, keyEdge: {}, mouse: { x: 640, y: 360, down: false, rdown: false, moved: 0, edge: false, redge: false, inside: false }, wheel: 0,
  virtual: {}, virtualEdge: {}, pad: null, padPrev: {}, padAxes: { lx: 0, ly: 0, rx: 0, ry: 0 },
  h: {}, p: {}, r: {}, aimMode: 'keys', lastActive: 'keys', touch: false, typed: [],
  canvas: null, viewW: 1280, viewH: 720, enabled: true,
});

I.init = function (canvas) {
  I.canvas = canvas;
  window.addEventListener('keydown', (e) => {
    if (e.repeat) { if (PREVENT.has(e.code)) e.preventDefault(); return; }
    if (!I.keys[e.code]) I.keyEdge[e.code] = true;
    I.keys[e.code] = true; I.lastActive = 'keys';
    if (PREVENT.has(e.code) && I.enabled) e.preventDefault();
    if (e.key && e.key.length === 1) I.typed.push(e.key);
  });
  window.addEventListener('keyup', (e) => { I.keys[e.code] = false; });
  window.addEventListener('blur', () => { I.keys = {}; I.mouse.down = false; I.mouse.rdown = false; });
  const upd = (e) => {
    const r = canvas.getBoundingClientRect();
    I.mouse.x = (e.clientX - r.left) / r.width * I.viewW; I.mouse.y = (e.clientY - r.top) / r.height * I.viewH;
  };
  canvas.addEventListener('mousemove', (e) => { upd(e); I.mouse.moved = 4; I.aimMode = 'mouse'; I.lastActive = 'mouse'; });
  canvas.addEventListener('mousedown', (e) => {
    upd(e); canvas.focus();
    if (e.button === 0) { I.mouse.down = true; I.mouse.edge = true; } if (e.button === 2) { I.mouse.rdown = true; I.mouse.redge = true; }
    I.aimMode = 'mouse'; I.lastActive = 'mouse'; e.preventDefault();
    if (CD.audio && CD.audio.resume) CD.audio.resume();
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) I.mouse.down = false; if (e.button === 2) I.mouse.rdown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { I.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  window.addEventListener('keydown', () => { if (CD.audio && CD.audio.resume) CD.audio.resume(); }, { once: false });
  window.addEventListener('gamepadconnected', () => { I.pad = true; });
};

// Called once per rendered frame (before simulation steps).
I.poll = function () {
  const h = {}, p = {};
  const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
  let gp = null; for (const g of pads) if (g && g.connected) { gp = g; break; }
  const pb = (i) => gp && gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5);
  const A = I.padAxes; A.lx = A.ly = A.rx = A.ry = 0;
  const padHeld = {};
  if (gp) {
    const dz = (v) => (Math.abs(v) < 0.22 ? 0 : v);
    A.lx = dz(gp.axes[0] || 0); A.ly = dz(gp.axes[1] || 0); A.rx = dz(gp.axes[2] || 0); A.ry = dz(gp.axes[3] || 0);
    padHeld.left = A.lx < -0.4 || pb(14); padHeld.right = A.lx > 0.4 || pb(15); padHeld.up = A.ly < -0.5 || pb(12); padHeld.down = A.ly > 0.5 || pb(13);
    padHeld.jump = pb(0); padHeld.dash = pb(1) || pb(5); padHeld.melee = pb(2); padHeld.interact = pb(3); padHeld.shoot = pb(7);
    padHeld.heal = pb(4); padHeld.vats = pb(6); padHeld.pause = pb(9); padHeld.pip = pb(8); padHeld.reload = pb(10); padHeld.next = pb(11); padHeld.grenade = false;
    if (Math.abs(A.rx) + Math.abs(A.ry) > 0.35) { I.aimMode = 'pad'; }
    if (padHeld.left || padHeld.right || padHeld.jump || padHeld.shoot) I.lastActive = 'pad';
  }
  for (const a in BIND) {
    let down = false, edge = false;
    for (const c of BIND[a]) { if (I.keys[c]) down = true; if (I.keyEdge[c]) edge = true; }
    if (padHeld[a]) { down = true; if (!I.padPrev[a]) edge = true; }
    if (I.virtual[a]) { down = true; if (I.virtualEdge[a]) edge = true; }
    if (a === 'shoot') { if (I.mouse.down) down = true; if (I.mouse.edge) edge = true; }
    if (a === 'melee') { if (I.mouse.rdown) down = true; if (I.mouse.redge) edge = true; }
    h[a] = down; p[a] = edge;
  }
  I.padPrev = padHeld;
  if (I.wheel) { if (I.wheel > 0) p.next = true; else p.prev = true; I.wheel = 0; }
  I.h = h; I.p = p;
  I.keyEdge = {}; I.mouse.edge = false; I.mouse.redge = false; I.virtualEdge = {};
  if (I.mouse.moved > 0) I.mouse.moved--;
  // typed chars for menus
};
// Simulation steps read I.p; after the first step in a frame the edges are consumed.
I.consume = function () { I.p = {}; };
I.held = (a) => !!I.h[a];
I.pressed = (a) => !!I.p[a];

// virtual buttons (touch)
I.setVirtual = function (action, on) {
  if (on && !I.virtual[action]) I.virtualEdge[action] = true;
  I.virtual[action] = on;
};
I.anyPressed = function () { for (const k in I.p) if (I.p[k]) return true; return false; };
I.clearTyped = function () { const t = I.typed; I.typed = []; return t; };

})();
