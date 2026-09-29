// On-screen touch controls: twin sticks (move / aim + auto-fire), action buttons, and tap-to-click for menus.
// Pointer events are tracked per pointerId; the controls appear on the first touch and hide again when a keyboard/mouse is used.
(function () {
'use strict';
const CD = window.CD, U = CD.U;
const G = (CD.G = CD.G || {});
const I = CD.input;
const TC = (CD.touch = { active: false, ptrs: {}, mv: { on: false, id: null, cx: 0, cy: 0, x: 0, y: 0 }, aim: { on: false, id: null, cx: 0, cy: 0, x: 0, y: 0 }, btns: [], press: {} });

// ---- layout (logical view pixels)
TC.layout = function () {
  const vw = G.viewW || 1280, vh = G.viewH || 720, b = [];
  const add = (id, label, x, y, r, act, opt) => b.push(Object.assign({ id, label, x, y, r, act }, opt || {}));
  add('jump', 'JUMP', vw - 320, vh - 108, 52, 'jump');
  add('dash', 'DASH', vw - 296, vh - 218, 40, 'dash');
  add('melee', 'MELEE', vw - 400, vh - 176, 40, 'melee');
  add('use', 'USE', vw - 140, vh - 296, 40, 'interact');
  add('reload', 'R', vw - 236, vh - 316, 30, 'reload');
  add('grenade', 'G', vw - 60, vh - 268, 28, 'grenade');
  add('stim', 'STIM', 110, vh - 330, 32, 'heal');
  add('swap', 'SWAP', 200, vh - 352, 30, 'next');
  add('vats', 'VATS', 60, vh - 268, 28, 'vats');
  add('pip', 'PIP', vw - 44, 176, 30, 'pip', { small: true });
  add('map', 'MAP', vw - 44, 240, 26, 'map', { small: true });
  add('pause', 'II', vw - 44, 302, 26, 'pause', { small: true });
  TC.btns = b;
  TC.mvBase = { x: 150, y: vh - 130, r: 96 };
  TC.aimBase = { x: vw - 150, y: vh - 130, r: 96 };
};

function toView(e) { const r = G.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * (G.viewW || 1280), y: (e.clientY - r.top) / r.height * (G.viewH || 720) }; }
function hitBtn(x, y) { for (const b of TC.btns) if (Math.hypot(x - b.x, y - b.y) < b.r + 10) return b; return null; }

TC.init = function (canvas) {
  const opt = { passive: false };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    e.preventDefault(); TC.active = true; I.touch = true; I.lastActive = 'touch'; if (CD.audio && CD.audio.resume) CD.audio.resume();
    try { canvas.setPointerCapture(e.pointerId); } catch (er) { }
    const p = toView(e); TC.ptrs[e.pointerId] = { x: p.x, y: p.y, kind: null };
    const ptr = TC.ptrs[e.pointerId];
    if (G.state !== 'play') {   // menus: behave like a mouse click
      ptr.kind = 'menu'; const m = I.mouse; m.x = p.x; m.y = p.y; m.moved = 4; m.edge = true; m.down = true; return;
    }
    const b = hitBtn(p.x, p.y);
    if (b) { ptr.kind = 'btn'; ptr.btn = b; TC.setBtn(b, true); return; }
    if (p.x < (G.viewW || 1280) * 0.45 && !TC.mv.on) { ptr.kind = 'mv'; Object.assign(TC.mv, { on: true, id: e.pointerId, cx: p.x, cy: p.y, x: 0, y: 0 }); return; }
    if (p.x >= (G.viewW || 1280) * 0.45 && !TC.aim.on) { ptr.kind = 'aim'; Object.assign(TC.aim, { on: true, id: e.pointerId, cx: p.x, cy: p.y, x: 0, y: 0 }); }
  }, opt);
  canvas.addEventListener('pointermove', (e) => {
    const ptr = TC.ptrs[e.pointerId]; if (!ptr || e.pointerType !== 'touch') return; e.preventDefault();
    const p = toView(e); ptr.x = p.x; ptr.y = p.y;
    if (ptr.kind === 'menu') { const m = I.mouse; m.x = p.x; m.y = p.y; m.moved = 4; return; }
    const st = ptr.kind === 'mv' ? TC.mv : ptr.kind === 'aim' ? TC.aim : null;
    if (st) { const R = 90; let dx = p.x - st.cx, dy = p.y - st.cy; const d = Math.hypot(dx, dy); if (d > R) { st.cx += dx / d * (d - R); st.cy += dy / d * (d - R); dx = p.x - st.cx; dy = p.y - st.cy; } st.x = U.clamp(dx / R, -1, 1); st.y = U.clamp(dy / R, -1, 1); }
  }, opt);
  const end = (e) => {
    const ptr = TC.ptrs[e.pointerId]; if (!ptr) return; delete TC.ptrs[e.pointerId];
    if (ptr.kind === 'menu') { I.mouse.down = false; }
    if (ptr.kind === 'btn') TC.setBtn(ptr.btn, false);
    if (ptr.kind === 'mv') { TC.mv.on = false; TC.mv.x = TC.mv.y = 0; }
    if (ptr.kind === 'aim') { TC.aim.on = false; TC.aim.x = TC.aim.y = 0; }
  };
  canvas.addEventListener('pointerup', end, opt); canvas.addEventListener('pointercancel', end, opt);
  TC.layout();
};
TC.setBtn = function (b, on) { TC.press[b.id] = on; I.setVirtual(b.act, on); };

// after the input poll: translate stick state into virtual buttons / pad axes
const basePoll = I.poll;
I.poll = function () {
  if (TC.active) {
    if (I.lastActive === 'keys' || I.lastActive === 'mouse') { TC.active = false; }   // a keyboard/mouse took over: hide
  }
  if (TC.active && G.state === 'play') {
    const mv = TC.mv, ax = mv.x, ay = mv.y;
    I.setVirtual('left', mv.on && ax < -0.28); I.setVirtual('right', mv.on && ax > 0.28);
    I.setVirtual('down', mv.on && ay > 0.6); I.setVirtual('up', mv.on && ay < -0.45);
    if (mv.on && ay < -0.8 && !TC.press.jump) I.setVirtual('jump', true); else if (!TC.press.jump && I.virtual.jump) I.setVirtual('jump', false);
    const am = TC.aim, mag = Math.hypot(am.x, am.y);
    I.setVirtual('shoot', am.on && mag > 0.5);
  } else if (!TC.active && (I.virtual.left || I.virtual.right || I.virtual.shoot)) { for (const k of ['left', 'right', 'up', 'down', 'shoot']) I.virtual[k] = false; }
  basePoll();
  if (TC.active && G.state === 'play' && TC.aim.on && Math.hypot(TC.aim.x, TC.aim.y) > 0.2) { I.padAxes.rx = TC.aim.x; I.padAxes.ry = TC.aim.y; I.aimMode = 'pad'; I.mouse.moved = 0; }
  else if (TC.active && G.state === 'play') { I.mouse.moved = 0; if (I.aimMode === 'mouse') I.aimMode = 'keys'; }
};

// ---- drawing (called from the HUD)
TC.draw = function (ctx) {
  if (!TC.active) return;
  const vw = G.viewW, vh = G.viewH; if (!TC.btns.length) TC.layout();
  ctx.save(); ctx.lineWidth = 2;
  const stick = (base, st, col, label) => {
    const cx = st.on ? st.cx : base.x, cy = st.on ? st.cy : base.y;
    ctx.globalAlpha = 0.28; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, base.r, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.55; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(cx, cy, base.r, 0, 7); ctx.stroke();
    const kx = cx + (st.on ? st.x * 90 : 0), ky = cy + (st.on ? st.y * 90 : 0);
    ctx.globalAlpha = 0.7; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(kx, ky, 34, 0, 7); ctx.fill();
    if (!st.on) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#eaffef'; ctx.font = 'bold 13px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillText(label, cx, cy + 5); }
  };
  if (G.state === 'play') {
    stick(TC.mvBase, TC.mv, '#3dff8a', 'MOVE'); stick(TC.aimBase, TC.aim, '#ff7a4a', 'AIM / FIRE');
    for (const b of TC.btns) {
      const on = TC.press[b.id]; ctx.globalAlpha = on ? 0.75 : 0.42; ctx.fillStyle = on ? '#3dff8a' : '#0d2a1a'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.85; ctx.strokeStyle = '#3dff8a'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke();
      ctx.globalAlpha = 0.95; ctx.fillStyle = on ? '#02150a' : '#dfffe9'; ctx.font = 'bold ' + (b.small ? 12 : 14) + 'px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillText(b.label, b.x, b.y + 5);
    }
  }
  ctx.restore();
};

})();
