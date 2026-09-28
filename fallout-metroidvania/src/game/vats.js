// V.A.T.S.: slow-motion targeting. Time crawls, pick a target and body part, spend AP to fire guided shots.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const G = (CD.G = CD.G || {});
const V = (CD.vats = { targets: [], sel: 0, part: 1, t: 0, maxT: 9, msg: '' });
V.cost = () => Math.max(8, 20 - G.perk('actionboy') * 2);
V.update = function () { };
V.parts = function (e) {
  if (e.head === false || e.def && e.def.head === false) return [{ n: 'BODY', y0: 0, y1: 1, mul: 1, dy: 0.5 }];
  return [{ n: 'HEAD', y0: 0, y1: 0.24, mul: 1.75, dy: 0.12 }, { n: 'TORSO', y0: 0.24, y1: 0.62, mul: 1, dy: 0.43 }, { n: 'LEGS', y0: 0.62, y1: 1, mul: 0.7, dy: 0.81 }];
};
V.chance = function (e, part) {
  const p = G.player; const d = Math.hypot(e.cx - p.cx, e.cy - p.cy);
  let c = 96 - d / 11 - (part.n === 'HEAD' ? 22 : part.n === 'LEGS' ? 6 : 0) + (G.special('P') - 5) * 2.5;
  if (!G.world.los(p.cx, p.y + 22, e.cx, e.y + e.h * part.dy)) c = 0;
  return Math.round(U.clamp(c, 0, 97));
};
V.toggle = function () { if (G.vatsActive) V.exit(); else V.enter(); };
V.enter = function () {
  const st = G.st, wd = G.curWeapon(), p = G.player;
  if (G.state !== 'play' || G.controlsLocked()) return;
  if (wd.kind !== 'gun') { G.notify('V.A.T.S. needs a firearm equipped.', 'warn'); return; }
  if (st.ap < V.cost()) { G.notify('Not enough AP for V.A.T.S.', 'warn'); return; }
  const cam = G.cam; const list = [];
  for (const e of G.hurtables) { if (e.dead || !e.hittable || e.hp <= 0 || e.sleeping || e.state === 'hidden') continue; if (e.cx < cam.x - 20 || e.cx > cam.x + cam.w + 20 || e.cy < cam.y - 20 || e.cy > cam.y + cam.h + 20) continue; if (e.crate) continue; if (!G.world.los(p.cx, p.y + 22, e.cx, e.cy)) continue; list.push(e); }
  if (!list.length) { G.notify('No targets in sight.', 'warn'); return; }
  list.sort((a, b) => Math.hypot(a.cx - p.cx, a.cy - p.cy) - Math.hypot(b.cx - p.cx, b.cy - p.cy));
  V.targets = list; V.sel = 0; V.part = list[0].head === false ? 0 : 1; V.t = 0; V.msg = ''; V.shots = 0;
  G.vatsActive = true; CD.audio.play('pipboy_on'); G.camFocus = { x: list[0].cx, y: list[0].cy };
  CD.input.consume();
};
V.exit = function () { if (!G.vatsActive) return; G.vatsActive = false; G.camFocus = null; CD.audio.play('pipboy_off'); CD.input.consume(); };
V.realUpdate = function (rdt) {
  const I = CD.input, st = G.st; V.t += rdt;
  V.targets = V.targets.filter((e) => !e.dead && e.hp > 0);
  if (!V.targets.length || V.t > V.maxT || st.ap < V.cost()) { if (!V.targets.length || st.ap < V.cost()) { V.exitT = (V.exitT || 0) + rdt; if (V.exitT > 0.5) { V.exitT = 0; V.exit(); return; } } else { V.exit(); return; } }
  if (V.sel >= V.targets.length) V.sel = 0;
  const tg = V.targets[V.sel]; if (!tg) return;
  const parts = V.parts(tg); if (V.part >= parts.length) V.part = parts.length - 1;
  if (I.pressed('vats') || I.pressed('pause') || I.pressed('back')) { V.exit(); return; }
  if (I.pressed('right') || I.pressed('next')) { V.sel = (V.sel + 1) % V.targets.length; CD.audio.play('ui_move'); V.part = V.parts(V.targets[V.sel]).length > 1 ? 1 : 0; }
  if (I.pressed('left') || I.pressed('prev')) { V.sel = (V.sel + V.targets.length - 1) % V.targets.length; CD.audio.play('ui_move'); V.part = V.parts(V.targets[V.sel]).length > 1 ? 1 : 0; }
  if (I.pressed('up')) { V.part = Math.max(0, V.part - 1); CD.audio.play('ui_move'); }
  if (I.pressed('down')) { V.part = Math.min(parts.length - 1, V.part + 1); CD.audio.play('ui_move'); }
  // mouse hover on parts / targets
  const m = I.mouse; if (m.moved > 0) { const wx = G.cam.x + m.x / G.zoom, wy = G.cam.y + m.y / G.zoom; V.targets.forEach((e, i) => { if (wx > e.x - 10 && wx < e.x + e.w + 10 && wy > e.y - 10 && wy < e.y + e.h + 10) { if (V.sel !== i) { V.sel = i; } const ps = V.parts(e); ps.forEach((pp, k) => { if (wy >= e.y + pp.y0 * e.h && wy < e.y + pp.y1 * e.h) V.part = k; }); } }); }
  const go = I.pressed('shoot') || I.pressed('interact') || I.pressed('jump') || I.pressed('confirm') || m.edge; m.edge = false;
  if (go) V.fire(tg, parts[V.part]);
  G.camFocus = { x: G.camFocus ? U.lerp(G.camFocus.x, tg.cx, Math.min(1, rdt * 6)) : tg.cx, y: G.camFocus ? U.lerp(G.camFocus.y, tg.cy, Math.min(1, rdt * 6)) : tg.cy };
  CD.input.consume();
};
V.fire = function (tg, part) {
  const st = G.st, p = G.player, id = G.curWeaponId(), wd = G.curWeapon();
  if (st.ap < V.cost()) return; if (st.mag[id] <= 0) { G.startReload(p); V.msg = 'RELOADING...'; V.exit(); return; }
  const chance = V.chance(tg, part), hit = Math.random() * 100 < chance || chance >= 97;
  st.ap -= V.cost(); st.mag[id]--; V.shots++;
  const ox = p.muzzleX !== undefined ? p.muzzleX : p.cx + p.face * 24, oy = p.muzzleY !== undefined ? p.muzzleY : p.cy - 8;
  let tx = tg.cx, ty = tg.y + tg.h * part.dy;
  if (!hit) { tx += (Math.random() < 0.5 ? -1 : 1) * (tg.w * 0.9 + 20); ty += (Math.random() - 0.5) * 30; }
  const a = Math.atan2(ty - oy, tx - ox), sp = wd.speed * 1.8;
  const mul = G.damageMul({ weapon: id }) * (1 + (G.special('P') - 5) * 0.03);
  p.face = tx >= p.cx ? 1 : -1;
  G.shoot({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: wd.dmg * (wd.pellets ? wd.pellets * 0.6 : 1) * part.mul * mul, owner: 'player', pk: wd.pk || 'bullet', life: 2.5, pierce: 0, knock: (wd.knock || 100), col: wd.col, weapon: id, crit: part.n === 'HEAD', critMul: 1.0, len: 26, cb: part.n === 'LEGS' ? (e) => { e.stun = 0.9; e.vx = 0; } : null });
  G.fx.glowFlash(ox, oy, 70, wd.pk === 'laser' ? '255,90,70' : '255,210,140', 0.07); p.muzzleFlash = 0.08; p.flashDir = a; p.aimActive = 1;
  CD.audio.play(wd.sfx || 'pistol'); G.fx.shake(2, 0.1);
  V.msg = hit ? 'HIT  ' + part.n : 'MISS';
  if (st.mag[id] <= 0) G.startReload(p);
};
V.draw = function (ctx) {
  const vw = G.viewW, vh = G.viewH, ui = CD.UI, cam = G.cam, z = G.zoom;
  ctx.save();
  ctx.fillStyle = 'rgba(0,30,12,0.28)'; ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < vh; y += 3) ctx.fillRect(0, y, vw, 1);
  const vg = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.35, vw / 2, vh / 2, vh * 0.9); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,20,8,0.6)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, vh);
  V.targets.forEach((e, i) => {
    const sx = (e.x - cam.x) * z, sy = (e.y - cam.y) * z, sw = e.w * z, sh = e.h * z, cur = i === V.sel;
    ctx.strokeStyle = cur ? '#7dffb0' : 'rgba(61,255,138,0.4)'; ctx.lineWidth = cur ? 2 : 1; ctx.shadowColor = '#3dff8a'; ctx.shadowBlur = cur ? 10 : 0;
    const L = 10; ctx.beginPath(); [[sx - 6, sy - 6, 1, 1], [sx + sw + 6, sy - 6, -1, 1], [sx - 6, sy + sh + 6, 1, -1], [sx + sw + 6, sy + sh + 6, -1, -1]].forEach((c) => { ctx.moveTo(c[0], c[1] + c[3] * L); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0] + c[2] * L, c[1]); }); ctx.stroke(); ctx.shadowBlur = 0;
    if (cur) {
      const parts = V.parts(e);
      parts.forEach((pp, k) => { const py = sy + sh * ((pp.y0 + pp.y1) / 2), ch = V.chance(e, pp), on = k === V.part; const bx = sx + sw + 34, by = py; ctx.strokeStyle = on ? '#ffffff' : 'rgba(61,255,138,0.6)'; ctx.beginPath(); ctx.moveTo(sx + sw / 2, py); ctx.lineTo(bx - 8, py); ctx.stroke(); ctx.fillStyle = on ? 'rgba(61,255,138,0.35)' : 'rgba(0,20,8,0.7)'; ctx.fillRect(bx - 6, by - 14, 82, 26); ctx.strokeStyle = on ? '#fff' : ui.green; ctx.strokeRect(bx - 5.5, by - 13.5, 81, 25); CD.glowText(ctx, ch + '%', bx, by + 5, 17, on ? '#fff' : ui.green, 'left', on ? 8 : 2); CD.glowText(ctx, pp.n, bx + 78, by + 4, 9, ui.dim, 'right', 0); });
      const name = (e.def && (e.def.title || e.type || 'ENEMY') || 'ENEMY').toString().toUpperCase(); CD.glowText(ctx, name, sx + sw / 2, sy - 14, 12, '#eaffef', 'center', 5);
      const bw = Math.max(50, sw); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx + sw / 2 - bw / 2, sy - 10, bw, 5); ctx.fillStyle = '#ff5a48'; ctx.fillRect(sx + sw / 2 - bw / 2, sy - 10, bw * U.clamp(e.hp / e.maxHp, 0, 1), 5);
    }
  });
  // header
  CD.glowText(ctx, 'V.A.T.S.', vw / 2, 60, 30, ui.green, 'center', 14);
  CD.glowText(ctx, 'AP COST ' + V.cost() + '   TARGET ' + (V.sel + 1) + '/' + V.targets.length + '   [A/D] TARGET  [W/S] BODY PART  [FIRE] SHOOT  [V] EXIT', vw / 2, 84, 12, ui.dim, 'center', 3);
  if (V.msg) CD.glowText(ctx, V.msg, vw / 2, vh * 0.72, 26, V.msg.indexOf('MISS') >= 0 ? ui.red : '#eaffef', 'center', 10);
  const k = 1 - V.t / V.maxT; CD.hudBar(ctx, vw / 2 - 120, 96, 240, 6, k, ui.green, null, 0);
  ctx.restore();
};

})();
