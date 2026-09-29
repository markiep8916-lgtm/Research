// HUD, minimap and shared map renderer (Pip-Boy phosphor style).
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T, TILE = CD.TILE;
const G = (CD.G = CD.G || {});
const HUD = (CD.hud = {});
const FONT = '"Courier New", ui-monospace, monospace';
CD.UI = { green: '#3dff8a', dim: '#1e9a52', dark: '#0a2a16', amber: '#ffb640', red: '#ff5a48', font: FONT };

function glowText(ctx, str, x, y, size, col, align, glow) {
  ctx.font = 'bold ' + size + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = col || CD.UI.green; ctx.shadowBlur = glow === undefined ? 6 : glow; ctx.fillStyle = col || CD.UI.green; ctx.fillText(str, x, y); ctx.shadowBlur = 0;
}
CD.glowText = glowText;
function bar(ctx, x, y, w, h, k, col, back, seg) {
  ctx.fillStyle = back || 'rgba(4,20,10,0.75)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 5; ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * U.clamp(k, 0, 1)), h - 2); ctx.shadowBlur = 0;
  if (seg) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; for (let i = 1; i < seg; i++) ctx.fillRect(x + (w / seg) * i, y, 1.5, h); }
  ctx.strokeStyle = col; ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.globalAlpha = 1;
}
CD.hudBar = bar;

// ---------------------------------------------------------------- map thumbnails
const thumbs = new Map();
CD.mapThumb = function (room) {
  let t = thumbs.get(room.id); const w = G.world;
  if (t && t.ver === (w.mapVer || 0)) return t.c;
  const c = U.canvas(room.w, room.h), g = c.getContext('2d'), img = g.createImageData(room.w, room.h), d = img.data;
  for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) {
    const tile = w.tile(room.x0 + x, room.y0 + y), i = (y * room.w + x) * 4; let r = 0, gg = 0, b = 0, a = 0;
    if (CD.isSolidTile(tile)) { if (tile === TILE.BREAK) { r = 255; gg = 190; b = 70; a = 230; } else if (tile === TILE.DOOR) { r = 255; gg = 120; b = 60; a = 255; } else { r = 61; gg = 255; b = 138; a = 200; } }
    else if (tile === TILE.PLAT) { r = 61; gg = 255; b = 138; a = 150; }
    else if (tile === TILE.LADDER) { r = 61; gg = 255; b = 138; a = 90; }
    else if (tile === TILE.WATER) { r = 90; gg = 200; b = 255; a = 100; }
    else if (tile === TILE.SPIKE || tile === TILE.SPIKE_D) { r = 255; gg = 90; b = 72; a = 190; }
    else { r = 8; gg = 60; b = 30; a = 90; }
    d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = a;
  }
  g.putImageData(img, 0, 0); thumbs.set(room.id, { c, ver: w.mapVer || 0 }); return c;
};
// Draw the explored map. o: {x,y (screen), w,h (screen box), cx,cy (world tile at box centre), scale (px per tile), showAll, markers}
CD.drawMap = function (ctx, o) {
  const w = G.world, st = G.st, sc = o.scale;
  ctx.save(); ctx.beginPath(); ctx.rect(o.x, o.y, o.w, o.h); ctx.clip();
  const ox = o.x + o.w / 2 - o.cx * sc, oy = o.y + o.h / 2 - o.cy * sc;
  const cur = G.room;
  for (const r of w.rooms) {
    const vis = st.visited[r.id] || o.showAll; if (!vis) continue;
    if (r.secret && !st.visited[r.id]) continue;
    const rx = ox + r.x0 * sc, ry = oy + r.y0 * sc, rw = r.w * sc, rh = r.h * sc;
    if (rx > o.x + o.w || ry > o.y + o.h || rx + rw < o.x || ry + rh < o.y) continue;
    ctx.imageSmoothingEnabled = false; ctx.globalAlpha = st.visited[r.id] ? 1 : 0.35;
    ctx.drawImage(CD.mapThumb(r), rx, ry, rw, rh); ctx.globalAlpha = 1;
    ctx.strokeStyle = r === cur ? '#ffffff' : 'rgba(61,255,138,0.85)'; ctx.lineWidth = r === cur ? 1.6 : 1; ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
  }
  // unexplored exits
  if (!o.mini) {
    ctx.fillStyle = '#ffb640'; ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'center';
    for (const r of w.rooms) {
      if (!st.visited[r.id]) continue;
      const chk = (gx, gy, nx, ny, px, py) => { if (CD.isSolidTile(w.tile(gx, gy))) return; const ri = w.roomIdx[ny * w.W + nx]; if (ri >= 0 && !st.visited[w.rooms[ri].id]) { ctx.fillRect(px - 2, py - 2, 4, 4); } };
      for (let x = r.x0; x < r.x1; x += 1) { if (x < 0 || r.y0 - 1 < 0) continue; chk(x, r.y0, x, r.y0 - 1, ox + (x + 0.5) * sc, oy + r.y0 * sc); chk(x, r.y1 - 1, x, r.y1, ox + (x + 0.5) * sc, oy + r.y1 * sc); }
      for (let y = r.y0; y < r.y1; y += 1) { chk(r.x0, y, r.x0 - 1, y, ox + r.x0 * sc, oy + (y + 0.5) * sc); chk(r.x1 - 1, y, r.x1, y, ox + r.x1 * sc, oy + (y + 0.5) * sc); }
    }
  }
  // markers: beds
  if (o.markers !== false) {
    for (const sp of w.spawns) {
      if (sp.t === 'bed') { const r = w.rooms[sp.room]; if (!st.visited[r.id]) continue; const mx = ox + (sp.tx + 0.5) * sc, my = oy + (sp.ty + 0.5) * sc; ctx.fillStyle = '#7ad0ff'; ctx.fillRect(mx - 3, my - 2, 6, 4); ctx.fillStyle = '#fff'; ctx.fillRect(mx - 3, my - 2, 6, 1); }
      else if (!o.mini && sp.t === 'nuka' && st.visited[w.rooms[sp.room].id]) { const mx = ox + (sp.tx + 0.5) * sc, my = oy + (sp.ty + 0.5) * sc; ctx.fillStyle = '#ff5a48'; ctx.fillRect(mx - 2, my - 3, 4, 6); }
      else if (!o.mini && sp.t === 'terminal' && st.visited[w.rooms[sp.room].id] && sp.id && !st.terminals[sp.id]) { const mx = ox + (sp.tx + 0.5) * sc, my = oy + (sp.ty + 0.5) * sc; ctx.fillStyle = '#7dff9c'; ctx.beginPath(); ctx.arc(mx, my, 2, 0, 7); ctx.fill(); }
    }
  }
  // player
  const p = G.player; if (p) { const mx = ox + p.cx / T * sc, my = oy + p.cy / T * sc; const pulse = 0.6 + Math.sin(G.time * 6) * 0.4; ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8 * pulse; ctx.beginPath(); ctx.arc(mx, my, o.mini ? 2.6 : 3.6, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
  ctx.restore();
};

// ---------------------------------------------------------------- main HUD
HUD.draw = function (ctx) {
  const st = G.st, p = G.player, vw = G.viewW, vh = G.viewH, UI = CD.UI;
  if (!st || !p) return;
  ctx.save(); ctx.setTransform(G.R, 0, 0, G.R, 0, 0);
  if (G.state === 'play' || G.state === 'dead' || G.state === 'pause') {
    const boss = G.boss && G.boss.hp > 0 && !G.boss.dead ? G.boss : null;
    // ---- top-left vitals
    const x = 24, y = 22;
    const mhp = G.maxHP();
    glowText(ctx, 'HP', x, y + 12, 15, UI.green);
    bar(ctx, x + 32, y, 260, 16, st.hp / Math.max(1, st.maxHp + G.perk('lifegiver') * 15), st.hp / mhp < 0.3 ? UI.red : UI.green, null, 10);
    if (mhp < st.maxHp + G.perk('lifegiver') * 15 + (G.special('E') - 5) * 6) { const full = st.maxHp + G.perk('lifegiver') * 15 + (G.special('E') - 5) * 6; ctx.fillStyle = 'rgba(255,140,40,0.6)'; ctx.fillRect(x + 32 + 260 * (mhp / full), y + 1, 260 * (1 - mhp / full), 14); }
    glowText(ctx, Math.ceil(st.hp) + '/' + mhp, x + 300, y + 13, 14, UI.green);
    glowText(ctx, 'AP', x, y + 34, 13, '#6ad0ff');
    bar(ctx, x + 32, y + 22, 180, 9, st.ap / G.maxAP(), '#59c8ff', null, 5);
    if (st.rad > 0.5) { glowText(ctx, 'RAD', x, y + 52, 12, UI.amber); bar(ctx, x + 32, y + 42, 120, 8, st.rad / 100, UI.amber, null, 5); glowText(ctx, Math.round(st.rad) + '%', x + 160, y + 51, 11, UI.amber); }
    // buffs
    let bx = x + 32, by = y + (st.rad > 0.5 ? 60 : 44);
    for (const b in st.buffs) if (st.buffs[b] > 0) { const nm = (CD.AID[b] || { name: b }).name; glowText(ctx, nm.toUpperCase() + ' ' + Math.ceil(st.buffs[b]) + 's', bx, by + 10, 10, '#c8ffd8', 'left', 3); by += 13; }
    // ---- bottom-left: aid
    const ax = 24, ay = vh - 46;
    CD.drawItemIcon(ctx, 'stimpak', {}, ax + 14, ay + 12, 1.25, G.time);
    glowText(ctx, 'x' + st.aid.stimpak, ax + 36, ay + 18, 18, st.aid.stimpak ? UI.green : UI.red);
    CD.drawItemIcon(ctx, 'grenade', {}, ax + 96, ay + 10, 1.0, G.time); glowText(ctx, 'x' + st.grenades, ax + 112, ay + 18, 15, UI.dim);
    CD.drawItemIcon(ctx, 'caps', {}, ax + 172, ay + 12, 0.95, G.time); glowText(ctx, String(st.caps), ax + 188, ay + 18, 15, '#f0d27a');
    // ---- bottom-right: weapon
    const wd = G.curWeapon(), id = G.curWeaponId(), rx = vw - 24, ry = vh - 46;
    const sp = CD.Rig.weaponSprite(wd.sprite);
    ctx.save(); ctx.globalAlpha = 0.95; if (sp) { const sc = Math.min(1.6, 70 / Math.max(sp.w, 30)); ctx.translate(rx - 200, ry + 6); ctx.scale(sc, sc); ctx.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h); } ctx.restore();
    glowText(ctx, wd.name.toUpperCase(), rx, ry - 6, 13, UI.green, 'right');
    if (wd.kind === 'gun') {
      const inMag = st.mag[id] || 0, res = st.ammo[wd.ammo] || 0;
      glowText(ctx, String(inMag), rx - 84, ry + 24, 30, inMag <= Math.ceil(wd.mag * 0.25) ? UI.red : UI.green, 'right');
      glowText(ctx, '/ ' + res, rx, ry + 22, 17, res > 0 ? UI.dim : UI.red, 'right');
      glowText(ctx, CD.AMMO[wd.ammo].name.toUpperCase(), rx, ry + 38, 10, UI.dim, 'right', 2);
    } else glowText(ctx, 'MELEE', rx, ry + 24, 18, UI.green, 'right');
    // weapon strip
    if (p.slotT > 0 || G.state === 'pause') { p.slotT -= 0; const n = st.weapons.length; for (let i = 0; i < n; i++) { const w2 = CD.WEAPONS[st.weapons[i]], s2 = CD.Rig.weaponSprite(w2.sprite); const wx = vw - 24 - (n - i) * 46, wy = vh - 128; ctx.globalAlpha = i === st.wi ? 1 : 0.5; ctx.fillStyle = i === st.wi ? 'rgba(61,255,138,0.2)' : 'rgba(0,0,0,0.35)'; ctx.fillRect(wx, wy, 42, 26); ctx.strokeStyle = UI.green; ctx.strokeRect(wx + 0.5, wy + 0.5, 41, 25); if (s2) { const sc = Math.min(0.8, 32 / Math.max(s2.w, 20)); ctx.save(); ctx.translate(wx + 21, wy + 13); ctx.scale(sc, sc); ctx.drawImage(s2.c, -s2.w / 2, -s2.h / 2, s2.w, s2.h); ctx.restore(); } glowText(ctx, String(i + 1), wx + 3, wy + 10, 9, UI.dim, 'left', 0); ctx.globalAlpha = 1; } }
    // ---- xp bar
    const need = G.xpForLevel(st.level + 1), have = G.xpForLevel(st.level); const k = (st.xp - have) / Math.max(1, need - have);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(vw / 2 - 120, vh - 14, 240, 4); ctx.fillStyle = UI.green; ctx.fillRect(vw / 2 - 120, vh - 14, 240 * U.clamp(k, 0, 1), 4);
    glowText(ctx, 'LVL ' + st.level, vw / 2 - 126, vh - 9, 10, UI.dim, 'right', 2);
    if (st.perkPoints > 0) glowText(ctx, 'PERK POINT AVAILABLE (TAB)', vw / 2, vh - 24, 10, UI.amber, 'center', 3);
    // ---- minimap + region
    const mw = 190, mh = 116, mx = vw - mw - 22, my = 22;
    ctx.fillStyle = 'rgba(2,14,8,0.72)'; ctx.fillRect(mx, my, mw, mh); ctx.strokeStyle = UI.green; ctx.globalAlpha = 0.7; ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1); ctx.globalAlpha = 1;
    CD.drawMap(ctx, { x: mx + 1, y: my + 1, w: mw - 2, h: mh - 2, cx: p.cx / T, cy: p.cy / T, scale: 2.1, mini: true });
    if (G.room) glowText(ctx, G.room.name.toUpperCase(), mx + mw, my + mh + 14, 11, UI.dim, 'right', 3);
    // ---- notifications
    let ny = 110; for (const n of G.notes) { const a = Math.min(1, n.t / 0.5, (n.max - n.t) / 0.15 + 0.01); ctx.globalAlpha = Math.max(0, Math.min(1, a)); const col = n.kind === 'warn' ? UI.red : n.kind === 'perk' ? UI.amber : n.kind === 'loc' ? '#c8ffd8' : UI.green; glowText(ctx, n.msg, 26, ny, n.kind === 'small' ? 12 : 14, col, 'left', 4); ny += 19; ctx.globalAlpha = 1; }
    // ---- boss bar
    if (boss) { const bw = Math.min(560, vw - 240), bx = vw / 2 - bw / 2, by = vh - 92; glowText(ctx, boss.def.title || boss.name || 'BOSS', vw / 2, by - 8, 16, '#ff8a70', 'center', 8); bar(ctx, bx, by, bw, 14, boss.hp / boss.maxHp, '#ff5a48', 'rgba(30,6,4,0.8)', 20); if (boss.def.sub) glowText(ctx, boss.def.sub, vw / 2, by + 30, 11, '#c88a80', 'center', 2); }
    // ---- interaction prompt
    const tg = G.target; if (tg && G.state === 'play') {
      const sx = (tg.cx - G.cam.x) * G.zoom, sy = (tg.y - G.cam.y) * G.zoom - 14; let label = tg.label ? tg.label() : (tg.name ? tg.name : (tg.kind === 'door' ? 'Open' : tg.constructor.name === 'Bed' ? 'Rest' : tg.constructor.name === 'Terminal' ? 'Use terminal' : tg.constructor.name === 'NukaMachine' ? 'Buy' : tg.constructor.name === 'NPC' ? 'Talk' : tg.constructor.name === 'Locker' ? 'Open' : tg.constructor.name === 'Elevator' ? 'Use lift' : 'Use'));
      if (tg.constructor.name === 'Bed') label = 'Rest / Save'; if (tg.constructor.name === 'NPC') label = 'Talk to ' + tg.name;
      ctx.font = 'bold 13px ' + FONT; const tw = ctx.measureText(label).width + 44; const bx = sx - tw / 2, by = sy - 26;
      ctx.fillStyle = 'rgba(2,16,8,0.85)'; ctx.fillRect(bx, by, tw, 24); ctx.strokeStyle = UI.green; ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, 23);
      ctx.fillStyle = UI.green; ctx.fillRect(bx + 6, by + 4, 16, 16); ctx.fillStyle = '#021008'; ctx.font = 'bold 12px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('E', bx + 14, by + 16);
      glowText(ctx, label, bx + 28, by + 16, 13, UI.green, 'left', 3);
    }
    // ---- hint (tutorial)
    if (G.hintT > 0) { const a = Math.min(1, G.hintT, (G.hintMax - G.hintT) * 4 + 0.01); ctx.globalAlpha = a; const lines = G.hintText.split('\n'); ctx.font = 'bold 15px ' + FONT; const tw = Math.max.apply(null, lines.map((l) => ctx.measureText(l).width)) + 40, th = lines.length * 22 + 16, bx = vw / 2 - tw / 2, by = 120; ctx.fillStyle = 'rgba(2,16,8,0.82)'; ctx.fillRect(bx, by, tw, th); ctx.strokeStyle = UI.green; ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, th - 1); lines.forEach((l, i) => glowText(ctx, l, vw / 2, by + 26 + i * 22, 15, '#c8ffd8', 'center', 4)); ctx.globalAlpha = 1; G.hintT -= 1 / 60; }
    // ---- subtitles (overseer / npc lines)
    if (G.sayT > 0) { const a = Math.min(1, G.sayT * 3, (G.sayMax - G.sayT) * 6 + 0.01); ctx.globalAlpha = a; ctx.font = 'bold 15px ' + FONT; const lines = wrap(ctx, G.sayText, Math.min(760, vw - 200)); const th = lines.length * 22 + 34, tw = Math.min(800, vw - 160), bx = vw / 2 - tw / 2, by = vh - 168 - th + 50; ctx.fillStyle = 'rgba(2,14,8,0.82)'; ctx.fillRect(bx, by, tw, th); ctx.strokeStyle = G.sayCol || UI.green; ctx.strokeRect(bx + 0.5, by + 0.5, tw - 1, th - 1); glowText(ctx, G.saySpeaker, bx + 14, by + 20, 12, G.sayCol || UI.amber, 'left', 4); lines.forEach((l, i) => glowText(ctx, l, bx + 14, by + 42 + i * 22, 15, '#dfffe9', 'left', 2)); ctx.globalAlpha = 1; G.sayT -= 1 / 60; }
    // ---- banner
    if (G.banners && G.banners.length) HUD.drawBanner(ctx, G.banners[0]);
    // ---- reticle
    if (G.state === 'play' && !G.controlsLocked() && wd.kind === 'gun') HUD.drawReticle(ctx);
    if (G.vatsActive && CD.vats) CD.vats.draw(ctx);
  }
  // fade overlay
  if (CD.touch && CD.touch.active) CD.touch.draw(ctx);
  if (G.fade) HUD.drawFade(ctx);
  ctx.restore();
};
HUD.drawReticle = function (ctx) {
  const I = CD.input, p = G.player; let x, y;
  if (I.aimMode === 'mouse' || I.mouse.moved) { x = I.mouse.x; y = I.mouse.y; }
  else { const d = 130; x = (p.cx - G.cam.x) * G.zoom + Math.cos(p.aim) * d; y = (p.y + 22 - G.cam.y) * G.zoom + Math.sin(p.aim) * d; }
  const wd = G.curWeapon(); const sp = 10 + (wd.spread || 0) * 160 + (p.recoil || 0) * 1.2;
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = 'rgba(61,255,138,0.95)'; ctx.shadowColor = '#3dff8a'; ctx.shadowBlur = 6; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, sp, 0, 7); ctx.stroke(); ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.moveTo(Math.cos(a) * (sp - 4), Math.sin(a) * (sp - 4)); ctx.lineTo(Math.cos(a) * (sp + 5), Math.sin(a) * (sp + 5)); } ctx.stroke();
  ctx.fillStyle = 'rgba(61,255,138,0.95)'; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
};
HUD.drawBanner = function (ctx, b) {
  const vw = G.viewW, vh = G.viewH, UI = CD.UI; const k = b.t / b.max; const a = Math.min(1, b.t * 3, (b.max - b.t) * 2.5);
  ctx.save(); ctx.globalAlpha = Math.max(0, a);
  if (b.small) { glowText(ctx, b.title, vw / 2, 96, 26, b.col || UI.green, 'center', 10); glowText(ctx, b.sub || '', vw / 2, 120, 12, UI.dim, 'center', 3); ctx.restore(); return; }
  const y0 = vh * 0.28; const w = Math.min(760, vw - 120);
  ctx.fillStyle = 'rgba(0,10,4,0.75)'; ctx.fillRect(vw / 2 - w / 2, y0 - 36, w, b.text ? 150 : 100);
  const gr = ctx.createLinearGradient(vw / 2 - w / 2, 0, vw / 2 + w / 2, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, b.col || UI.green); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(vw / 2 - w / 2, y0 - 36, w, 2); ctx.fillRect(vw / 2 - w / 2, y0 - 36 + (b.text ? 148 : 98), w, 2);
  glowText(ctx, b.sub || '', vw / 2, y0 - 12, 13, UI.dim, 'center', 4);
  glowText(ctx, b.title, vw / 2, y0 + 26, 34, b.col || UI.green, 'center', 14);
  if (b.text) { ctx.font = 'bold 14px ' + FONT; const lines = wrap(ctx, b.text, w - 60); lines.forEach((l, i) => glowText(ctx, l, vw / 2, y0 + 62 + i * 20, 14, '#dfffe9', 'center', 2)); }
  ctx.restore();
};
HUD.drawFade = function (ctx) {
  const f = G.fade, dt = 1 / 60; f.t += dt;
  const half = f.dur / 2; let a = f.t < half ? f.t / half : 1 - (f.t - half) / half;
  if (f.t >= half && !f.mid) { f.mid = true; if (f.onMid) f.onMid(); }
  ctx.fillStyle = 'rgba(0,0,0,' + U.clamp(a, 0, 1) + ')'; ctx.fillRect(0, 0, G.viewW, G.viewH);
  if (f.text) glowText(ctx, f.text, G.viewW / 2, G.viewH / 2, 22, CD.UI.green, 'center', 10);
  if (f.t >= f.dur) { if (f.onEnd) f.onEnd(); G.fade = null; }
};
function wrap(ctx, text, maxW) {
  const words = String(text).split(' '), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
CD.wrapText = wrap;

// ---------------------------------------------------------------- helpers used by other modules
G.hint = function (text, dur) { G.hintText = text; G.hintT = G.hintMax = dur || 6; };
G.say = function (speaker, text, dur, col) { G.saySpeaker = speaker; G.sayText = text; G.sayT = G.sayMax = dur || (2 + text.length * 0.045); G.sayCol = col; if (speaker === 'OVERSEER') CD.audio.play('beep'); };

})();
