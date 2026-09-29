// Title screen, intro crawl, pause menu, death screen, options.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const G = (CD.G = CD.G || {});
const M = (CD.menus = { sel: 0, t: 0, screen: 'main', items: [], introT: 0, endT: 0 });
CD.overlay = { cur: null };
const UI = () => CD.UI;

const INTRO = [
  ['2077.', 2.4], ['The world ended in two hours.', 3.0], ['', 0.5],
  ['Vault-Tec sold the survivors a promise:', 3.2], ['a door that would never open,', 2.6], ['and a future that would wait.', 3.0], ['', 0.5],
  ['2287.', 2.6], ['Vault 213 has been sealed for 210 years.', 3.4], ['Something in the dark has just switched the lights back on.', 4.0], ['', 0.6],
  ['War never changes.', 3.6],
];
M.init = function () {
  G.loadOptions(); CD.audio.setTrack && (G.pendingTitleMusic = true);
  M.buildMain();
};
M.buildMain = function () {
  const items = [];
  if (G.hasSave()) items.push({ label: 'CONTINUE', act: () => { CD.audio.resume(); if (!G.loadSave()) G.notify('Save could not be loaded.', 'warn'); } });
  items.push({ label: 'NEW GAME', act: () => { CD.audio.resume(); if (G.hasSave()) { M.confirm('Erase your saved game and start over?', () => M.startIntro()); } else M.startIntro(); } });
  items.push({ label: 'CONTROLS', act: () => { M.screen = 'controls'; } });
  items.push({ label: 'OPTIONS', act: () => { M.screen = 'options'; M.sel = 0; } });
  M.items = items; M.sel = 0; M.screen = 'main';
};
M.confirm = function (msg, yes) { M.screen = 'confirm'; M.msg = msg; M.yes = yes; M.sel = 1; };
M.startIntro = function () { M.screen = 'intro'; M.introT = 0; CD.audio.setTrack('silence'); };
M.onState = function (s, old) {
  M.sel = 0; M.t = 0;
  if (s === 'pause') { M.screen = 'pause'; M.items = [
    { label: 'RESUME', act: () => G.setState('play') },
    { label: 'PIP-BOY', act: () => CD.pipboy && CD.pipboy.open() },
    { label: 'CONTROLS', act: () => { M.screen = 'controls'; M.back = 'pause'; } },
    { label: 'OPTIONS', act: () => { M.screen = 'options'; M.back = 'pause'; M.sel = 0; } },
    { label: 'SAVE & QUIT TO TITLE', act: () => { G.autosave(); G.quitToTitle(); } },
  ]; }
  if (s === 'dead') { M.screen = 'dead'; M.deadT = 0; M.items = [
    { label: 'RESPAWN AT LAST BED', act: () => G.respawn() },
    { label: 'LOAD LAST SAVE', act: () => { if (G.hasSave()) G.loadSave(); else G.respawn(); }, disabled: !G.hasSave() },
    { label: 'QUIT TO TITLE', act: () => G.quitToTitle() },
  ]; }
  if (s === 'title') { M.buildMain(); if (CD.audio.ready) CD.audio.setTrack('title'); }
};
G.quitToTitle = function () { G.player = null; G.st = null; G.state = 'title'; G.boss = null; G.bossActive = false; G.vatsActive = false; G.cutscene = false; G.fade = null; M.buildMain(); M.screen = 'main'; CD.audio.setTrack('title'); };
G.respawn = function () {
  const st = G.st; const bed = st.bed; st.hp = G.maxHP(); st.ap = G.maxAP(); st.rad = Math.max(0, st.rad - 25); st.buffs = {};
  G.boss = null; G.bossActive = false; G.respawnEnemies(); if (CD.bosses && CD.bosses.reset) CD.bosses.reset();
  const s = bed || G.findStart(); G.player = new CD.Player(s.x, s.y); G.room = null; G.prevRoom = null; G.snapCamera(); G.updateRooms(true);
  G.fade = { t: 0, dur: 1.2, onMid: null, onEnd: null }; G.setState('play'); G.autosave();
};

// ---------------------------------------------------------------- endings
const ENDINGS = {
  restart: { title: 'THE WAKING', pages: [
    ['You seat the Fusion Core in the reactor cradle.', 'Vault 213 breathes.'],
    ['Light climbs the halls of Cinder Deep, one level at a time,', 'like a very slow sunrise.', 'Four thousand pods hiss open.'],
    ['They wake hungry, and confused, and blinking.', 'They ask what year it is.', 'You tell them the truth. It takes a while.'],
    ['Some weep. Some laugh. Some walk up the silo at once', 'and are never seen again.', 'Cinder Ridge learns to share its water.'],
    ['It is not a brighter tomorrow.', 'But it is tomorrow.'],
    ['In the empty atrium, the Overseer\'s last recording plays on a loop:', '"Thank you, Sleeper Seven. I was, on balance, wrong."'] ] },
  core: { title: 'THE LONG LIGHT', pages: [
    ['You carry the Fusion Core up into the sun,', 'past the diner, past the station,', 'up the hill where Haskell waits with a pipe and a raised eyebrow.'],
    ['"Well, I\'ll be," he says.', 'And that is all he says for a very long time.'],
    ['The town\'s water plant hums for the first time in two hundred years.', 'Children drink, and do not glow.'],
    ['Under the hill, Vault 213 sleeps on: four thousand dreams,', 'dimming one by one as the old reactor fades.', 'You never tell anyone what is beneath their feet.'],
    ['Some nights you dream of the Deep. In the dream, everyone wakes.', 'Nobody asks what you chose. That was the choice.'],
    ['Sleeper Seven becomes Seven. Seven becomes a neighbour.', 'It is enough.'] ] },
  rest: { title: 'THE QUIET', pages: [
    ['You lay a hand on the console and choose the smallest word it offers:', 'REST.'],
    ['The pods dim. The hum fades. The Deep grows cold and clean and silent,', 'and the sleepers go on sleeping, gently, for the last time.'],
    ['Every door in the vault unlocks from the inside at once.', 'For the first time in two centuries, nothing is sealed.'],
    ['You climb the silo into a dawn you did not have to survive.', 'It is the first one.'],
    ['Somewhere behind you an intercom crackles:', '"Have a brighter tomorrow, Sleeper Seven."', 'This time it does not sound like a threat.'] ] },
};
M.startEnding = function (kind) {
  const e = ENDINGS[kind]; if (!e || G.state === 'ending') return;
  G.st.flags['ending_' + kind] = 1; delete G.st.flags['trig:dp_ending'];
  G.autosave(); M.endKind = kind; M.endT = 0; M.endPage = 0; M.endPageT = 0; M.endStats = false; G.setState('ending'); CD.audio.setTrack('title');
};
M.endings = ENDINGS;
M.updateEnding = function (dt) {
  const I = CD.input, e = ENDINGS[M.endKind]; M.endT += dt; M.endPageT += dt;
  const adv = I.pressed('confirm') || I.pressed('interact') || I.mouse.edge; I.mouse.edge = false;
  const last = M.endPage >= e.pages.length;
  if (last) { if (M.endPageT > 1.2 && adv) { G.quitToTitle(); } return; }
  const lines = e.pages[M.endPage], dur = 2.6 + lines.join(' ').length * 0.055;
  if (adv && M.endPageT > 0.8) { if (M.endPageT < dur - 1.2) M.endPageT = dur - 1.2; else { M.endPage++; M.endPageT = 0; } }
  else if (M.endPageT > dur) { M.endPage++; M.endPageT = 0; }
};
M.drawEnding = function (ctx) {
  const vw = G.viewW, vh = G.viewH, ui = UI(), e = ENDINGS[M.endKind]; const fade = U.clamp(M.endT / 1.4, 0, 1);
  ctx.fillStyle = 'rgba(1,5,3,' + fade + ')'; ctx.fillRect(0, 0, vw, vh);
  if (M.endT < 1.0) return;
  if (M.endPage < e.pages.length) {
    const lines = e.pages[M.endPage], dur = 2.6 + lines.join(' ').length * 0.055, t = M.endPageT, a = U.clamp(Math.min(t / 0.9, (dur - t) / 0.9), 0, 1);
    ctx.globalAlpha = a; lines.forEach((l, i) => CD.glowText(ctx, l, vw / 2, vh / 2 - (lines.length - 1) * 22 + i * 44, l.length > 60 ? 21 : 25, i === 0 ? '#eaffef' : ui.green, 'center', 10)); ctx.globalAlpha = 1;
    CD.glowText(ctx, 'ENTER TO SKIP', vw - 24, vh - 20, 10, ui.dim, 'right', 0);
  } else {
    const t = M.endPageT, a = U.clamp(t / 1.2, 0, 1); ctx.globalAlpha = a;
    CD.glowText(ctx, 'ENDING:  ' + e.title, vw / 2, vh * 0.26, 40, '#3dff8a', 'center', 16);
    CD.glowText(ctx, 'FALLOUT: CINDER DEEP', vw / 2, vh * 0.26 + 40, 16, ui.dim, 'center', 3);
    const st = G.st, mm = Math.floor(st.time / 60), tapes = Object.keys(st.holotapes || {}).length, bob = (st.bobbles || []).length;
    const rows = [['TIME PLAYED', Math.floor(mm / 60) + 'h ' + (mm % 60) + 'm'], ['LEVEL', st.level], ['ENEMIES DEFEATED', st.kills || 0], ['TIMES DIED', st.deaths || 0], ['HOLOTAPES', tapes], ['BOBBLEHEADS', bob + ' / 7']];
    rows.forEach((r, i) => { const y = vh * 0.46 + i * 34; CD.glowText(ctx, r[0], vw / 2 - 20, y, 17, ui.green, 'right', 3); CD.glowText(ctx, String(r[1]), vw / 2 + 20, y, 17, '#eaffef', 'left', 4); });
    CD.glowText(ctx, 'Thank you for playing.', vw / 2, vh * 0.46 + 6 * 34 + 26, 18, '#b8ffd0', 'center', 8);
    CD.glowText(ctx, 'War never changes.  People do.', vw / 2, vh * 0.46 + 6 * 34 + 54, 14, ui.dim, 'center', 3);
    if (t > 1.2) CD.glowText(ctx, 'PRESS ENTER', vw / 2, vh - 34, 13, ui.dim, 'center', 3);
    ctx.globalAlpha = 1;
  }
};

M.update = function (dt) {
  if (G.state === 'ending') { M.updateEnding(dt); return; }
  if (G.state === 'overlay' && CD.overlay.cur) { CD.overlay.cur.update(dt); return; }
  M.t += dt; const I = CD.input;
  const s = G.state;
  if (s === 'title' || s === 'pause' || s === 'dead') {
    if (M.screen === 'intro') { M.introT += dt; if (I.pressed('confirm') || I.pressed('interact') || I.mouse.edge) { if (M.introT > 1.0) M.introT = 1e6; } let tot = 0; for (const l of INTRO) tot += l[1]; if (M.introT > tot + 1.2) { G.newGame(); G.startCinematic && G.startCinematic(); } return; }
    if (M.screen === 'controls') { if (I.pressed('confirm') || I.pressed('back') || I.pressed('pause') || I.mouse.edge) { M.screen = M.back === 'pause' ? 'pause' : 'main'; M.back = null; CD.audio.play('ui_back'); } return; }
    if (M.screen === 'options') { M.updateOptions(dt); return; }
    const items = M.screen === 'confirm' ? [{ label: 'NO' }, { label: 'YES' }] : M.items;
    if (I.pressed('up')) { M.sel = (M.sel + items.length - 1) % items.length; CD.audio.play('ui_move'); }
    if (I.pressed('down')) { M.sel = (M.sel + 1) % items.length; CD.audio.play('ui_move'); }
    // mouse hover / click
    const m = I.mouse; let hov = -1; const baseY = M.menuY(); items.forEach((it, i) => { const y = baseY + i * 44; if (m.x > G.viewW / 2 - 200 && m.x < G.viewW / 2 + 200 && m.y > y - 26 && m.y < y + 12) hov = i; });
    if (hov >= 0 && (m.moved > 0)) M.sel = hov;
    if (I.pressed('confirm') || (m.edge && hov >= 0)) {
      if (M.screen === 'confirm') { const yes = M.sel === 1; M.screen = 'main'; if (yes) M.yes(); else M.buildMain(); CD.audio.play(yes ? 'ui_select' : 'ui_back'); return; }
      const it = items[M.sel]; if (it && !it.disabled) { CD.audio.play('ui_select'); it.act(); } I.mouse.edge = false;
    }
    if (s === 'pause' && (I.pressed('pause') || I.pressed('back')) && M.screen === 'pause') { G.setState('play'); }
    if (s === 'dead') { M.deadT += dt; }
  }
};
M.menuY = function () { return G.state === 'title' ? G.viewH * 0.6 : (G.state === 'dead' ? G.viewH * 0.55 : G.viewH * 0.42); };
M.updateOptions = function (dt) {
  const I = CD.input; const rows = ['MASTER VOLUME', 'MUSIC VOLUME', 'EFFECTS VOLUME', 'SOUND', 'GRAPHICS QUALITY', 'BACK'];
  if (I.pressed('up')) { M.sel = (M.sel + rows.length - 1) % rows.length; CD.audio.play('ui_move'); }
  if (I.pressed('down')) { M.sel = (M.sel + 1) % rows.length; CD.audio.play('ui_move'); }
  const keys = ['master', 'music', 'sfx'];
  if (M.sel < 3) { let d = 0; if (I.pressed('left')) d = -0.1; if (I.pressed('right')) d = 0.1; if (d) { CD.audio.setVolume(keys[M.sel], U.clamp(Math.round((CD.audio.vol[keys[M.sel]] + d) * 10) / 10, 0, 1)); CD.audio.play('ui_move'); G.saveOptions(); } }
  if ((M.sel === 3 && (I.pressed('confirm') || I.pressed('left') || I.pressed('right')))) { CD.audio.setMuted(!CD.audio.muted); G.saveOptions(); }
  if (M.sel === 4 && (I.pressed('confirm') || I.pressed('left') || I.pressed('right'))) { const qs = ['auto', 'high', 'medium', 'low'], cur = qs.indexOf((G.opts && G.opts.quality) || 'auto'); G.opts = G.opts || {}; G.opts.quality = qs[(cur + (I.pressed('left') ? 3 : 1)) % 4]; G.qLevel = 0; G.resize(); G.saveOptions(); CD.audio.play('ui_move'); }
  if ((M.sel === 5 && I.pressed('confirm')) || I.pressed('back') || I.pressed('pause')) { M.screen = M.back === 'pause' ? 'pause' : 'main'; M.back = null; CD.audio.play('ui_back'); }
  const m = I.mouse; if (m.edge) { rows.forEach((r, i) => { const y = G.viewH * 0.3 + i * 52; if (m.y > y - 26 && m.y < y + 14) { M.sel = i; if (i < 3) { const bx = G.viewW / 2 + 10, bw = 220; if (m.x > bx && m.x < bx + bw) { CD.audio.setVolume(keys[i], U.clamp(Math.round((m.x - bx) / bw * 10) / 10, 0, 1)); G.saveOptions(); } } else if (i === 3) { CD.audio.setMuted(!CD.audio.muted); G.saveOptions(); } else if (i === 4) { const qs = ['auto', 'high', 'medium', 'low'], cur = qs.indexOf((G.opts && G.opts.quality) || 'auto'); G.opts = G.opts || {}; G.opts.quality = qs[(cur + 1) % 4]; G.qLevel = 0; G.resize(); G.saveOptions(); } else if (i === 5) { M.screen = M.back === 'pause' ? 'pause' : 'main'; M.back = null; } } }); m.edge = false; }
};

// ---------------------------------------------------------------- drawing
M.drawTitleBackdrop = function (ctx) {
  const vw = G.viewW, vh = G.viewH, t = M.t;
  ctx.setTransform(G.R, 0, 0, G.R, 0, 0);
  const cam = { x: t * 26, y: 19 * T - vh * 0.62, w: vw, h: vh };
  CD.Backdrop.get('dusk').draw(ctx, cam, vw, vh, t, 19 * T, null);
  // foreground ground silhouette with a lone wanderer
  const gy = vh * 0.86; ctx.fillStyle = '#100a0a'; ctx.beginPath(); ctx.moveTo(0, vh); ctx.lineTo(0, gy);
  for (let x = 0; x <= vw; x += 20) ctx.lineTo(x, gy + Math.sin((x + t * 26 * 0.9) * 0.02) * 6 + Math.sin((x + t * 26) * 0.07) * 3); ctx.lineTo(vw, vh); ctx.fill();
  const rs = CD.Rig.get('vault'); const pose = CD.Rig.pose({ mode: 'run', phase: t * 5.5, speed: 0.42, t, aim: 0.35, twoHand: false });
  const c = U.canvas(160, 160), g = c.getContext('2d'); g.translate(80, 140); const sp = CD.Rig.weaponSprite('pistol10'); CD.Rig.draw(g, rs, pose, { x: 0, y: 0, scale: 1.1, face: 1, weapon: { sprite: sp, mx: sp.mx } });
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(16,9,9,0.86)'; g.fillRect(0, 0, 160, 160);
  ctx.drawImage(c, vw * 0.24 - 110, gy - 128, 220, 220);
  // ash
  ctx.fillStyle = 'rgba(255,210,170,0.5)'; for (let i = 0; i < 60; i++) { const x = ((i * 137.5 + t * (20 + (i % 5) * 8)) % (vw + 40)) - 20, y = ((i * 71.3 + t * (22 + (i % 7) * 5)) % vh); ctx.fillRect(x, y, 1.5 + (i % 3) * 0.6, 1.5); }
  // vignette
  const vg = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.3, vw / 2, vh / 2, vh * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.7)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, vh);
};
M.draw = function (ctx) {
  if (G.state === 'overlay' && CD.overlay.cur) { ctx.save(); ctx.setTransform(G.R, 0, 0, G.R, 0, 0); CD.overlay.cur.draw(ctx); ctx.restore(); return; }
  const vw = G.viewW, vh = G.viewH, s = G.state, ui = UI();
  ctx.save(); ctx.setTransform(G.R, 0, 0, G.R, 0, 0);
  if (s === 'ending') { M.drawEnding(ctx); ctx.restore(); return; }
  if (s === 'title') {
    if (M.screen === 'intro') { M.drawIntro(ctx); ctx.restore(); return; }
    M.drawTitle(ctx);
  } else if (s === 'pause') {
    ctx.fillStyle = 'rgba(0,10,4,0.7)'; ctx.fillRect(0, 0, vw, vh);
    if (M.screen === 'pause') { CD.glowText(ctx, 'PAUSED', vw / 2, vh * 0.28, 40, ui.green, 'center', 14); M.drawList(ctx); }
  } else if (s === 'dead') {
    const k = U.clamp(M.deadT / 1.2, 0, 1); ctx.fillStyle = 'rgba(30,0,0,' + 0.75 * k + ')'; ctx.fillRect(0, 0, vw, vh);
    ctx.globalAlpha = k; CD.glowText(ctx, 'YOU DIED', vw / 2, vh * 0.34, 56, '#ff4a38', 'center', 20); CD.glowText(ctx, 'The wasteland is patient.', vw / 2, vh * 0.34 + 34, 15, '#c88a80', 'center', 3); M.drawList(ctx); ctx.globalAlpha = 1;
  }
  if (M.screen === 'controls' && (s === 'title' || s === 'pause')) M.drawControls(ctx);
  if (M.screen === 'options' && (s === 'title' || s === 'pause')) M.drawOptions(ctx);
  if (M.screen === 'confirm') M.drawConfirm(ctx);
  ctx.restore();
};
M.drawList = function (ctx) {
  const vw = G.viewW, ui = UI(); const items = M.items; const y0 = M.menuY();
  if (M.screen === 'controls' || M.screen === 'options' || M.screen === 'confirm' || M.screen === 'intro') return;
  items.forEach((it, i) => {
    const y = y0 + i * 44, sel = i === M.sel; const col = it.disabled ? '#3a5a44' : (sel ? '#eaffef' : ui.green);
    if (sel) { ctx.fillStyle = 'rgba(61,255,138,0.14)'; ctx.fillRect(vw / 2 - 210, y - 28, 420, 40); ctx.strokeStyle = ui.green; ctx.globalAlpha = 0.6; ctx.strokeRect(vw / 2 - 210 + 0.5, y - 28 + 0.5, 419, 39); ctx.globalAlpha = 1; CD.glowText(ctx, '>', vw / 2 - 196, y, 22, ui.green, 'left', 8); }
    CD.glowText(ctx, it.label, vw / 2, y, 24, col, 'center', sel ? 12 : 5);
  });
};
M.drawTitle = function (ctx) {
  const vw = G.viewW, vh = G.viewH, ui = UI(), t = M.t;
  const fl = 0.92 + Math.sin(t * 13) * 0.02 + (Math.random() < 0.02 ? -0.25 : 0);
  ctx.globalAlpha = fl; CD.glowText(ctx, 'FALLOUT', vw / 2, vh * 0.24, 92, '#3dff8a', 'center', 28); ctx.globalAlpha = 1;
  CD.glowText(ctx, 'C I N D E R   D E E P', vw / 2, vh * 0.24 + 52, 30, '#b8ffd0', 'center', 12);
  CD.glowText(ctx, 'A  M E T R O I D V A N I A', vw / 2, vh * 0.24 + 80, 13, ui.dim, 'center', 3);
  ctx.strokeStyle = ui.green; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(vw / 2 - 250, vh * 0.24 + 96); ctx.lineTo(vw / 2 + 250, vh * 0.24 + 96); ctx.stroke(); ctx.globalAlpha = 1;
  M.drawList(ctx);
  CD.glowText(ctx, 'UNOFFICIAL FAN PROJECT  -  NOT AFFILIATED WITH OR ENDORSED BY BETHESDA SOFTWORKS OR ZENIMAX MEDIA', vw / 2, vh - 34, 10, '#3a8a5a', 'center', 0);
  CD.glowText(ctx, 'Fallout and related marks are the property of their respective owners. All art, audio and code in this game is original and procedurally generated.', vw / 2, vh - 18, 10, '#2f6f48', 'center', 0);
  if (M.t > 0.2) CD.glowText(ctx, 'W/S + ENTER  or  MOUSE', vw / 2, vh - 60, 12, ui.dim, 'center', 2);
};
M.drawIntro = function (ctx) {
  const vw = G.viewW, vh = G.viewH, ui = UI(); ctx.fillStyle = '#010503'; ctx.fillRect(0, 0, vw, vh);
  let acc = 0; let y = vh * 0.5 - 80; const t = M.introT;
  for (const [txt, dur] of INTRO) {
    const local = t - acc; if (txt && local > 0) { const a = U.clamp(Math.min(local / 0.8, (dur + 0.6 - local) / 0.8), 0, 1); const big = txt.length < 20; ctx.globalAlpha = a; CD.glowText(ctx, txt, vw / 2, vh / 2, big ? 44 : 24, txt.indexOf('never') >= 0 && false ? '#ff8a70' : '#3dff8a', 'center', 14); ctx.globalAlpha = 1; }
    acc += dur;
  }
  if (t < 3) { ctx.globalAlpha = 0.6; CD.glowText(ctx, 'ENTER TO SKIP', vw - 24, vh - 20, 10, ui.dim, 'right', 0); ctx.globalAlpha = 1; }
};
M.drawControls = function (ctx) {
  const vw = G.viewW, vh = G.viewH, ui = UI(); ctx.fillStyle = 'rgba(0,10,4,0.92)'; ctx.fillRect(0, 0, vw, vh);
  CD.glowText(ctx, 'CONTROLS', vw / 2, 82, 34, ui.green, 'center', 12);
  const rows = [['A / D  or  ARROWS', 'Move'], ['SPACE', 'Jump  (again in mid-air with Jet Boots)'], ['W / S', 'Aim up / crouch  -  climb ladders'], ['MOUSE', 'Aim'], ['LEFT CLICK  /  J', 'Shoot'], ['RIGHT CLICK  /  K', 'Melee'], ['SHIFT  /  L', 'Dash  (Jet Rush)'], ['E', 'Interact'], ['Q', 'Use Stimpak'], ['R', 'Reload'], ['G', 'Throw grenade'], ['1-9  /  T / Y / WHEEL', 'Switch weapon'], ['V', 'V.A.T.S. slow-mo targeting'], ['TAB  /  M', 'Pip-Boy  /  Map'], ['ESC', 'Pause'], ['N', 'Toggle sound']];
  rows.forEach((r, i) => { const y = 132 + i * 30; CD.glowText(ctx, r[0], vw / 2 - 30, y, 15, '#eaffef', 'right', 3); CD.glowText(ctx, r[1], vw / 2 + 10, y, 15, ui.green, 'left', 3); });
  CD.glowText(ctx, 'Gamepad: left stick move, A jump, right trigger shoot, X melee, B dash, Y interact, LB stimpak', vw / 2, vh - 60, 12, ui.dim, 'center', 2);
  CD.glowText(ctx, 'PRESS ANY KEY TO RETURN', vw / 2, vh - 34, 13, ui.dim, 'center', 3);
};
M.drawOptions = function (ctx) {
  const vw = G.viewW, vh = G.viewH, ui = UI(); ctx.fillStyle = 'rgba(0,10,4,0.94)'; ctx.fillRect(0, 0, vw, vh);
  CD.glowText(ctx, 'OPTIONS', vw / 2, vh * 0.2, 34, ui.green, 'center', 12);
  const rows = ['MASTER VOLUME', 'MUSIC VOLUME', 'EFFECTS VOLUME', 'SOUND', 'GRAPHICS QUALITY', 'BACK']; const keys = ['master', 'music', 'sfx'];
  rows.forEach((r, i) => {
    const y = vh * 0.3 + i * 52, sel = i === M.sel; CD.glowText(ctx, r, vw / 2 - 20, y, 20, sel ? '#eaffef' : ui.green, 'right', sel ? 10 : 3);
    if (i < 3) { CD.hudBar(ctx, vw / 2 + 10, y - 16, 220, 18, CD.audio.vol[keys[i]], ui.green, null, 10); CD.glowText(ctx, Math.round(CD.audio.vol[keys[i]] * 100) + '%', vw / 2 + 246, y, 15, ui.dim, 'left', 2); }
    else if (i === 3) CD.glowText(ctx, CD.audio.muted ? 'OFF' : 'ON', vw / 2 + 10, y, 20, CD.audio.muted ? ui.red : ui.green, 'left', 5);
    else if (i === 4) CD.glowText(ctx, String((G.opts && G.opts.quality) || 'auto').toUpperCase(), vw / 2 + 10, y, 20, ui.green, 'left', 5);
    if (sel) CD.glowText(ctx, '>', vw / 2 - 250, y, 22, ui.green, 'left', 8);
  });
};
M.drawConfirm = function (ctx) {
  const vw = G.viewW, vh = G.viewH, ui = UI(); ctx.fillStyle = 'rgba(0,10,4,0.85)'; ctx.fillRect(0, 0, vw, vh);
  CD.glowText(ctx, M.msg, vw / 2, vh * 0.4, 22, '#eaffef', 'center', 8);
  ['NO', 'YES'].forEach((l, i) => { const x = vw / 2 + (i - 0.5) * 220, sel = i === M.sel; CD.glowText(ctx, (sel ? '> ' : '') + l, x, vh * 0.55, 28, sel ? '#eaffef' : ui.green, 'center', sel ? 12 : 4); });
};

})();
