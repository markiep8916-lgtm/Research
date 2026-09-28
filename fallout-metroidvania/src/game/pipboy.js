// Pip-Boy 3000: STAT / ITEMS / DATA / MAP screens.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const G = (CD.G = CD.G || {});
const UI = () => CD.UI;
const PB = (CD.pipboy = { tab: 0, sel: [0, 0, 0, 0], sub: 0, t: 0, mapX: 0, mapY: 0, mapZoom: 3, reading: null });
const TABS = ['STAT', 'ITEMS', 'DATA', 'MAP'];
const OV = CD.overlay;

PB.open = function (tab) {
  if (G.state !== 'play' && G.state !== 'pause') return;
  PB.fromPause = G.state === 'pause';
  const t = tab === 'map' ? 3 : (typeof tab === 'number' ? tab : PB.tab); PB.tab = t; PB.t = 0; PB.reading = null;
  if (t === 3) PB.centerMap();
  const o = { update: PB.update, draw: PB.draw, mode: 'pipboy' }; OV.cur = o; PB.prev = G.state; G.state = 'overlay'; CD.input.consume(); CD.audio.play('pipboy_on');
};
PB.close = function () { OV.cur = null; G.state = PB.fromPause ? 'pause' : 'play'; CD.input.consume(); CD.audio.play('pipboy_off'); };
PB.centerMap = function () { const p = G.player; PB.mapX = p.cx / T; PB.mapY = p.cy / T; };

function items() {
  const st = G.st, out = [];
  out.push({ head: 'WEAPONS' });
  st.weapons.forEach((id, i) => { const w = CD.WEAPONS[id]; out.push({ k: 'weapon', id, i, name: w.name, right: id === G.curWeaponId() ? 'EQUIPPED' : '', w }); });
  out.push({ head: 'AID' });
  for (const a in CD.AID) if (st.aid[a] > 0) out.push({ k: 'aid', id: a, name: CD.AID[a].name, right: 'x' + st.aid[a], desc: CD.AID[a].desc });
  if (st.grenades > 0) out.push({ k: 'gren', name: 'Frag Grenade', right: 'x' + st.grenades, desc: 'Press G to throw. Breaks cracked walls.' });
  out.push({ head: 'AMMO' });
  for (const a in CD.AMMO) if ((st.ammo[a] || 0) > 0) out.push({ k: 'ammo', id: a, name: CD.AMMO[a].name, right: st.ammo[a] + '/' + G.ammoCap(a) });
  const ks = Object.keys(st.keys); if (ks.length) { out.push({ head: 'KEYS' }); ks.forEach((k) => out.push({ k: 'key', name: k.toUpperCase() + ' KEYCARD', right: '', desc: 'Opens matching Vault-Tec security doors.' })); }
  return out;
}
PB.items = items;

PB.update = function (dt) {
  PB.t += dt; const I = CD.input, st = G.st;
  if (I.pressed('pip') || I.pressed('pause') || I.pressed('back') && !PB.reading) { if (PB.reading) PB.reading = null; else PB.close(); return; }
  if (PB.reading) { if (I.pressed('confirm') || I.pressed('back') || I.mouse.edge) { PB.reading = null; I.mouse.edge = false; } return; }
  if (I.pressed('map')) { PB.tab = PB.tab === 3 ? 0 : 3; CD.audio.play('ui_move'); if (PB.tab === 3) PB.centerMap(); }
  // tab switching: Q/E? use shift-free keys: comma/period not bound; use [ ] via left/right when at list root
  const tabKeyL = I.keys['BracketLeft'] || I.keyEdge && I.keyEdge['BracketLeft'], tabKeyR = I.keyEdge && I.keyEdge['BracketRight'];
  if (I.pressed('left') && PB.tab !== 3 && PB.sub === 0 || (I.keyEdge && I.keyEdge['KeyQ'])) { PB.tab = (PB.tab + 3) % 4; CD.audio.play('ui_move'); if (PB.tab === 3) PB.centerMap(); }
  if (I.pressed('right') && PB.tab !== 3 && PB.sub === 0 || (I.keyEdge && I.keyEdge['KeyE'])) { PB.tab = (PB.tab + 1) % 4; CD.audio.play('ui_move'); if (PB.tab === 3) PB.centerMap(); }
  void tabKeyL; void tabKeyR;
  const sel = PB.sel;
  if (PB.tab === 0) {   // STAT: perks list
    const keys = Object.keys(CD.PERKS); let s = sel[0];
    if (I.pressed('up')) { s = (s + keys.length - 1) % keys.length; CD.audio.play('ui_move'); } if (I.pressed('down')) { s = (s + 1) % keys.length; CD.audio.play('ui_move'); } sel[0] = s;
    if (I.pressed('confirm') || I.pressed('interact')) { const id = keys[s], pd = CD.PERKS[id]; const r = st.perks[id] || 0; if (r >= pd.max) G.notify('Perk already at max rank.', 'warn'); else if (st.level < pd.lvl) G.notify('Requires level ' + pd.lvl + '.', 'warn'); else if (st.perkPoints <= 0) G.notify('No perk points.', 'warn'); else { st.perkPoints--; st.perks[id] = r + 1; CD.audio.play('levelup'); G.notify(pd.name + ' rank ' + (r + 1), 'perk'); if (id === 'lifegiver') st.hp += 15; } }
  } else if (PB.tab === 1) {
    const list = items().filter((x) => !x.head); let s = sel[1] = U.clamp(sel[1], 0, Math.max(0, list.length - 1));
    if (I.pressed('up')) { s = (s + list.length - 1) % list.length; CD.audio.play('ui_move'); } if (I.pressed('down')) { s = (s + 1) % list.length; CD.audio.play('ui_move'); } sel[1] = s;
    const it = list[s];
    if (it && (I.pressed('confirm') || I.pressed('interact'))) {
      if (it.k === 'weapon') { G.st.wi = it.i; G.player.reloading = 0; CD.audio.play('switch'); }
      else if (it.k === 'aid') { if (G.useAid(it.id)) { G.notify('Used ' + it.name, 'small'); } else G.notify('No effect right now.', 'warn'); }
    }
  } else if (PB.tab === 2) {
    const tapes = Object.keys(st.holotapes).filter((k) => CD.HOLOTAPES[k]); let s = sel[2]; const n = Math.max(1, tapes.length);
    if (I.pressed('up')) { s = (s + n - 1) % n; CD.audio.play('ui_move'); } if (I.pressed('down')) { s = (s + 1) % n; CD.audio.play('ui_move'); } sel[2] = s;
    if ((I.pressed('confirm') || I.pressed('interact')) && tapes[s]) { PB.reading = { id: tapes[s], page: 0 }; CD.audio.play('ui_select'); }
  } else if (PB.tab === 3) {
    const sp = 14 * dt * 60 / (PB.mapZoom / 3);
    if (I.held('left')) PB.mapX -= sp * 0.5; if (I.held('right')) PB.mapX += sp * 0.5; if (I.held('up')) PB.mapY -= sp * 0.5; if (I.held('down')) PB.mapY += sp * 0.5;
    if (I.keyEdge && I.keyEdge['Equal']) PB.mapZoom = Math.min(6, PB.mapZoom + 0.5); if (I.keyEdge && I.keyEdge['Minus']) PB.mapZoom = Math.max(1.5, PB.mapZoom - 0.5);
    if (I.wheel) { PB.mapZoom = U.clamp(PB.mapZoom - Math.sign(I.wheel) * 0.5, 1.5, 6); I.wheel = 0; }
    if (I.pressed('confirm')) PB.centerMap();
  }
  // mouse tab click
  const m = I.mouse; if (m.edge) { const L = PB.layout; if (L) for (let i = 0; i < 4; i++) { const tx = L.x + 40 + i * 150; if (m.x > tx && m.x < tx + 130 && m.y > L.y + 8 && m.y < L.y + 44) { PB.tab = i; CD.audio.play('ui_move'); if (i === 3) PB.centerMap(); m.edge = false; } } }
};

PB.draw = function (ctx) {
  const vw = G.viewW, vh = G.viewH, ui = UI(), st = G.st, t = PB.t;
  ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, vw, vh);
  const w = Math.min(1140, vw - 50), h = Math.min(640, vh - 50), x = (vw - w) / 2, y = (vh - h) / 2; PB.layout = { x, y, w, h };
  // device bezel
  ctx.fillStyle = '#050c07'; ctx.fillRect(x - 14, y - 14, w + 28, h + 28); ctx.strokeStyle = 'rgba(61,255,138,0.25)'; ctx.lineWidth = 6; ctx.strokeRect(x - 10, y - 10, w + 20, h + 20);
  ctx.fillStyle = 'rgba(3,18,9,0.97)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = ui.green; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  // tabs
  TABS.forEach((n, i) => { const tx = x + 40 + i * 150, on = i === PB.tab; ctx.fillStyle = on ? 'rgba(61,255,138,0.22)' : 'transparent'; ctx.fillRect(tx, y + 8, 130, 34); if (on) { ctx.strokeStyle = ui.green; ctx.strokeRect(tx + 0.5, y + 8.5, 129, 33); } CD.glowText(ctx, n, tx + 65, y + 32, 18, on ? '#eaffef' : ui.dim, 'center', on ? 10 : 2); });
  CD.glowText(ctx, '[Q/E] TAB   [W/S] SELECT   [ENTER] USE   [TAB] CLOSE', x + w - 24, y + 30, 11, ui.dim, 'right', 2);
  ctx.strokeStyle = ui.green; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(x + 16, y + 48); ctx.lineTo(x + w - 16, y + 48); ctx.stroke(); ctx.globalAlpha = 1;
  const cx = x + 20, cy = y + 60, cw = w - 40, ch = h - 60 - 44;
  if (PB.tab === 0) PB.drawStat(ctx, cx, cy, cw, ch);
  else if (PB.tab === 1) PB.drawItems(ctx, cx, cy, cw, ch);
  else if (PB.tab === 2) PB.drawData(ctx, cx, cy, cw, ch);
  else PB.drawMap(ctx, cx, cy, cw, ch);
  // footer
  ctx.strokeStyle = ui.green; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(x + 16, y + h - 40); ctx.lineTo(x + w - 16, y + h - 40); ctx.stroke(); ctx.globalAlpha = 1;
  CD.glowText(ctx, 'HP ' + Math.ceil(st.hp) + '/' + G.maxHP(), x + 30, y + h - 14, 14, ui.green, 'left', 3);
  CD.glowText(ctx, 'LVL ' + st.level, x + 190, y + h - 14, 14, ui.green, 'left', 3);
  CD.glowText(ctx, 'CAPS ' + st.caps, x + 290, y + h - 14, 14, '#f0d27a', 'left', 3);
  CD.glowText(ctx, 'RAD ' + Math.round(st.rad) + '%', x + 420, y + h - 14, 14, st.rad > 30 ? ui.amber : ui.green, 'left', 3);
  CD.glowText(ctx, 'XP ' + st.xp + '/' + G.xpForLevel(st.level + 1), x + 540, y + h - 14, 14, ui.green, 'left', 3);
  CD.glowText(ctx, G.room ? G.room.name.toUpperCase() : '', x + w - 30, y + h - 14, 13, ui.dim, 'right', 3);
  CD.scanlines(ctx, x, y, w, h);
  if (PB.reading) PB.drawReading(ctx, x, y, w, h);
  // sweep
  ctx.fillStyle = 'rgba(61,255,138,0.04)'; ctx.fillRect(x, y + ((t * 90) % h), w, 6);
};

PB.drawStat = function (ctx, x, y, w, h) {
  const ui = UI(), st = G.st, col = (w - 40) / 3;
  // status
  CD.glowText(ctx, 'STATUS', x, y + 18, 16, ui.green, 'left', 5);
  const rows = [['LEVEL', st.level], ['XP', st.xp + ' / ' + G.xpForLevel(st.level + 1)], ['HIT POINTS', Math.ceil(st.hp) + ' / ' + G.maxHP()], ['RADIATION', Math.round(st.rad) + '%'], ['DAMAGE RESIST', Math.round(Math.min(0.6, (st.dr || 0) + G.perk('toughness') * 0.05 + (G.buff('medx') ? 0.35 : 0)) * 100) + '%'], ['CAPS', st.caps], ['ENEMIES DOWN', st.kills || 0], ['TIME', U.fmtTime(st.time)], ['PERK POINTS', st.perkPoints]];
  rows.forEach((r, i) => { CD.glowText(ctx, r[0], x, y + 52 + i * 26, 14, ui.dim, 'left', 2); CD.glowText(ctx, String(r[1]), x + col - 30, y + 52 + i * 26, 14, '#eaffef', 'right', 3); });
  const ab = Object.keys(CD.ABILITIES); CD.glowText(ctx, 'AUGMENTATIONS', x, y + 52 + rows.length * 26 + 22, 14, ui.green, 'left', 5);
  ab.forEach((a, i) => { const on = G.hasAbility(a); CD.glowText(ctx, (on ? '[X] ' : '[ ] ') + CD.ABILITIES[a].name, x, y + 52 + rows.length * 26 + 46 + i * 21, 12, on ? CD.ABILITIES[a].col : '#2a5a3a', 'left', on ? 3 : 0); });
  // SPECIAL
  const sx = x + col + 20; CD.glowText(ctx, 'S.P.E.C.I.A.L.', sx, y + 18, 16, ui.green, 'left', 5);
  'SPECIAL'.split('').forEach((l, i) => { const nm = CD.BOBBLES[l].name; const v = G.special(l); CD.glowText(ctx, l + '  ' + nm.toUpperCase(), sx, y + 56 + i * 44, 14, '#eaffef', 'left', 3); CD.glowText(ctx, String(v), sx + col - 50, y + 56 + i * 44, 20, v > 5 ? CD.BOBBLES[l].col : ui.green, 'right', 6); CD.glowText(ctx, CD.SPECIAL_DESC[l], sx, y + 74 + i * 44, 10, ui.dim, 'left', 0); const got = st.bobbles.indexOf(l) >= 0; if (got) CD.glowText(ctx, 'BOBBLEHEAD +1', sx + col - 50, y + 74 + i * 44, 9, CD.BOBBLES[l].col, 'right', 2); });
  // perks
  const px = x + 2 * col + 40; CD.glowText(ctx, 'PERKS', px, y + 18, 16, ui.green, 'left', 5); CD.glowText(ctx, st.perkPoints + ' POINT' + (st.perkPoints === 1 ? '' : 'S'), px + col - 50, y + 18, 13, st.perkPoints ? ui.amber : ui.dim, 'right', 3);
  const keys = Object.keys(CD.PERKS), vis = Math.floor((h - 90) / 24), sel = PB.sel[0], off = U.clamp(sel - Math.floor(vis / 2), 0, Math.max(0, keys.length - vis));
  keys.slice(off, off + vis).forEach((k, i) => { const p = CD.PERKS[k], r = st.perks[k] || 0, on = off + i === sel, yy = y + 52 + i * 24; if (on) { ctx.fillStyle = 'rgba(61,255,138,0.16)'; ctx.fillRect(px - 6, yy - 16, col - 34, 22); } CD.glowText(ctx, p.name, px, yy, 13, r ? '#eaffef' : (st.level >= p.lvl ? ui.green : '#2f6f48'), 'left', on ? 6 : 1); CD.glowText(ctx, r + '/' + p.max, px + col - 50, yy, 13, r >= p.max ? ui.amber : ui.dim, 'right', 2); });
  const pk = keys[sel], pd = CD.PERKS[pk]; ctx.font = 'bold 12px ' + ui.font; const dl = CD.wrapText(ctx, pd.desc + '  (Level ' + pd.lvl + ')', col - 40); dl.forEach((l, i) => CD.glowText(ctx, l, px, y + h - 44 + i * 16, 12, '#c8ffd8', 'left', 2));
};
PB.drawItems = function (ctx, x, y, w, h) {
  const ui = UI(), st = G.st, all = items(), list = all.filter((i) => !i.head); const sel = U.clamp(PB.sel[1], 0, Math.max(0, list.length - 1)); PB.sel[1] = sel;
  const lw = w * 0.42; let yy = y + 20, si = 0; const rowH = 24; const vis = Math.floor((h - 10) / rowH);
  // scroll so the selected row stays visible
  let selRow = 0, r = 0; for (const it of all) { if (!it.head) { if (si === sel) selRow = r; si++; } r++; } const off = Math.max(0, selRow - vis + 3); si = 0; r = 0;
  for (const it of all) {
    if (r >= off && r < off + vis) {
      if (it.head) { ctx.fillStyle = 'rgba(61,255,138,0.1)'; ctx.fillRect(x, yy - 16, lw, 22); CD.glowText(ctx, it.head, x + 8, yy, 13, ui.amber, 'left', 4); }
      else { const on = si === sel; if (on) { ctx.fillStyle = 'rgba(61,255,138,0.2)'; ctx.fillRect(x, yy - 16, lw, 22); } CD.glowText(ctx, (on ? '> ' : '  ') + it.name, x + 8, yy, 14, on ? '#eaffef' : ui.green, 'left', on ? 8 : 2); if (it.right) CD.glowText(ctx, it.right, x + lw - 10, yy, 13, it.right === 'EQUIPPED' ? ui.amber : ui.dim, 'right', 2); }
      yy += rowH;
    }
    if (!it.head) si++; r++;
  }
  const it = list[sel]; const dx = x + lw + 30, dw = w - lw - 40;
  ctx.strokeStyle = ui.green; ctx.globalAlpha = 0.4; ctx.strokeRect(dx - 10, y + 6, dw + 10, h - 12); ctx.globalAlpha = 1;
  if (it) {
    CD.glowText(ctx, it.name.toUpperCase(), dx, y + 36, 20, '#eaffef', 'left', 8);
    if (it.k === 'weapon') {
      const w2 = it.w, sp = CD.Rig.weaponSprite(w2.sprite); if (sp) { ctx.save(); ctx.translate(dx + dw / 2, y + 120); const sc = Math.min(3.6, (dw * 0.6) / Math.max(sp.w, 20)); ctx.scale(sc, sc); ctx.drawImage(sp.c, -sp.gx, -sp.gy, sp.w, sp.h); ctx.restore(); }
      const dps = w2.kind === 'gun' ? Math.round(w2.dmg * (w2.pellets || 1) * w2.rate) : Math.round(w2.dmg * w2.rate);
      const rows = [['DAMAGE', w2.dmg * (w2.pellets ? 'x' + w2.pellets : 1) === w2.dmg ? w2.dmg : w2.dmg + (w2.pellets ? ' x' + w2.pellets : '')], ['DPS', dps], ['RATE', w2.rate.toFixed(1) + '/s']];
      if (w2.kind === 'gun') { rows.push(['AMMO', CD.AMMO[w2.ammo].name]); rows.push(['MAGAZINE', (st.mag[it.id] || 0) + ' / ' + w2.mag]); rows.push(['RELOAD', w2.reload.toFixed(1) + 's']); }
      else rows.push(['REACH', w2.reach]);
      rows.forEach((r2, i) => { CD.glowText(ctx, r2[0], dx, y + 200 + i * 24, 13, ui.dim, 'left', 2); CD.glowText(ctx, String(r2[1]), dx + dw - 20, y + 200 + i * 24, 14, '#eaffef', 'right', 3); });
      ctx.font = 'bold 13px ' + ui.font; CD.wrapText(ctx, w2.desc, dw - 20).forEach((l, i) => CD.glowText(ctx, l, dx, y + 200 + rows.length * 24 + 18 + i * 18, 13, '#c8ffd8', 'left', 2));
      CD.glowText(ctx, '[ENTER] EQUIP', dx, y + h - 24, 12, ui.dim, 'left', 2);
    } else {
      CD.drawItemIcon(ctx, it.k === 'aid' ? it.id : (it.k === 'gren' ? 'grenade' : it.k === 'ammo' ? 'ammo' : it.k), { type: it.id }, dx + dw / 2, y + 110, 4.2, PB.t);
      ctx.font = 'bold 14px ' + ui.font; CD.wrapText(ctx, it.desc || (it.k === 'ammo' ? 'Ammunition. Carry limit ' + G.ammoCap(it.id) + '.' : ''), dw - 20).forEach((l, i) => CD.glowText(ctx, l, dx, y + 230 + i * 20, 14, '#c8ffd8', 'left', 2));
      if (it.k === 'aid') CD.glowText(ctx, '[ENTER] USE', dx, y + h - 24, 12, ui.dim, 'left', 2);
    }
  }
};
PB.drawData = function (ctx, x, y, w, h) {
  const ui = UI(), st = G.st, lw = w * 0.4;
  CD.glowText(ctx, 'CURRENT OBJECTIVE', x, y + 20, 15, ui.amber, 'left', 5);
  const ob = (CD.OBJECTIVES && CD.OBJECTIVES[st.objective]) || 'Explore.'; ctx.font = 'bold 14px ' + ui.font; CD.wrapText(ctx, ob, w - 20).forEach((l, i) => CD.glowText(ctx, l, x, y + 46 + i * 20, 14, '#dfffe9', 'left', 3));
  CD.glowText(ctx, 'HOLOTAPES', x, y + 130, 15, ui.green, 'left', 5);
  const tapes = Object.keys(st.holotapes).filter((k) => CD.HOLOTAPES[k]);
  if (!tapes.length) CD.glowText(ctx, 'NONE FOUND', x + 8, y + 160, 13, '#2f6f48', 'left', 0);
  tapes.slice(0, Math.floor((h - 190) / 24)).forEach((k, i) => { const on = i === PB.sel[2]; if (on) { ctx.fillStyle = 'rgba(61,255,138,0.18)'; ctx.fillRect(x, y + 144 + i * 24, lw, 22); } CD.glowText(ctx, (on ? '> ' : '  ') + CD.HOLOTAPES[k].title, x + 8, y + 160 + i * 24, 13, on ? '#eaffef' : ui.green, 'left', on ? 6 : 1); });
  // bobbleheads + abilities
  const bx = x + lw + 40; CD.glowText(ctx, 'BOBBLEHEADS  ' + st.bobbles.length + '/7', bx, y + 130, 15, ui.green, 'left', 5);
  'SPECIAL'.split('').forEach((l, i) => { const got = st.bobbles.indexOf(l) >= 0; ctx.save(); ctx.globalAlpha = got ? 1 : 0.28; CD.drawItemIcon(ctx, 'bobble', { stat: l }, bx + 26 + i * 62, y + 190, 1.7, PB.t); ctx.restore(); CD.glowText(ctx, l, bx + 26 + i * 62, y + 228, 12, got ? CD.BOBBLES[l].col : '#2f6f48', 'center', 2); });
  CD.glowText(ctx, 'AUGMENTATIONS', bx, y + 268, 15, ui.green, 'left', 5);
  Object.keys(CD.ABILITIES).forEach((a, i) => { const on = G.hasAbility(a); CD.glowText(ctx, (on ? CD.ABILITIES[a].name : '??????????') + (on ? ' - ' + CD.ABILITIES[a].short : ''), bx + 4, y + 296 + i * 22, 13, on ? CD.ABILITIES[a].col : '#2a5a3a', 'left', on ? 3 : 0); });
};
PB.drawReading = function (ctx, x, y, w, h) {
  const ui = UI(), tp = CD.HOLOTAPES[PB.reading.id]; ctx.fillStyle = 'rgba(2,14,8,0.96)'; ctx.fillRect(x + 30, y + 60, w - 60, h - 120); ctx.strokeStyle = ui.green; ctx.strokeRect(x + 30.5, y + 60.5, w - 61, h - 121);
  CD.glowText(ctx, tp.title.toUpperCase(), x + 56, y + 96, 18, ui.amber, 'left', 6);
  ctx.font = 'bold 15px ' + ui.font; let yy = y + 130; for (const p of tp.text) { CD.wrapText(ctx, p, w - 130).forEach((l) => { CD.glowText(ctx, l, x + 56, yy, 15, '#dfffe9', 'left', 2); yy += 22; }); yy += 10; }
  CD.glowText(ctx, '[ENTER] CLOSE', x + w - 56, y + h - 76, 12, ui.dim, 'right', 2);
};
PB.drawMap = function (ctx, x, y, w, h) {
  const ui = UI(), st = G.st; ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = 'rgba(2,10,6,1)'; ctx.fillRect(x, y, w, h);
  // grid
  ctx.strokeStyle = 'rgba(61,255,138,0.07)'; const gs = 20 * PB.mapZoom; for (let gx = x + ((w / 2 - PB.mapX * PB.mapZoom) % gs + gs) % gs; gx < x + w; gx += gs) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); } for (let gy = y + ((h / 2 - PB.mapY * PB.mapZoom) % gs + gs) % gs; gy < y + h; gy += gs) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); }
  CD.drawMap(ctx, { x, y, w, h, cx: PB.mapX, cy: PB.mapY, scale: PB.mapZoom, showAll: G.cheats.showMap });
  // region labels
  ctx.textAlign = 'center';
  for (const r of G.world.rooms) { if (!st.visited[r.id]) continue; const rx = x + w / 2 + (r.x0 + r.w / 2 - PB.mapX) * PB.mapZoom, ry = y + h / 2 + (r.y0 + r.h / 2 - PB.mapY) * PB.mapZoom; if (r.w * PB.mapZoom > 60) CD.glowText(ctx, r.name.toUpperCase(), rx, ry, 9, 'rgba(200,255,220,0.85)', 'center', 2); }
  ctx.restore();
  // legend
  ctx.fillStyle = 'rgba(2,14,8,0.85)'; ctx.fillRect(x + w - 190, y + 8, 182, 116); ctx.strokeStyle = ui.green; ctx.strokeRect(x + w - 190 + 0.5, y + 8.5, 181, 115);
  [['#fff', 'YOU ARE HERE'], ['#7ad0ff', 'BUNK / SAVE'], ['#ff5a48', 'VENDING MACHINE'], ['#ffb640', 'UNEXPLORED EXIT'], ['#7dff9c', 'UNREAD TERMINAL'], ['#ffbe46', 'CRACKED WALL']].forEach((l, i) => { ctx.fillStyle = l[0]; ctx.fillRect(x + w - 180, y + 20 + i * 17, 8, 8); CD.glowText(ctx, l[1], x + w - 164, y + 28 + i * 17, 10, ui.green, 'left', 0); });
  CD.glowText(ctx, '[ARROWS] PAN   [+/-/WHEEL] ZOOM   [ENTER] CENTER', x + 12, y + h - 10, 11, ui.dim, 'left', 2);
};

})();
