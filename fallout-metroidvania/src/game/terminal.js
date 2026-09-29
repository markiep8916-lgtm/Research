// Full-screen overlay UIs: terminals (with the classic word-hacking minigame), dialogue and shops.
(function () {
'use strict';
const CD = window.CD, U = CD.U, T = CD.T;
const G = (CD.G = CD.G || {});
const UI = () => CD.UI;

// shared overlay plumbing ---------------------------------------------------
const OV = CD.overlay;
OV.open = function (o) { OV.cur = o; G.prevState = G.state; G.state = 'overlay'; CD.input.consume(); CD.audio.play('terminal_open'); };
OV.close = function () { OV.cur = null; if (G.state === 'overlay') G.state = 'play'; CD.input.consume(); };   // a choice may have moved the game elsewhere (e.g. into the ending)
function scanlines(ctx, x, y, w, h) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; for (let i = 0; i < h; i += 3) ctx.fillRect(x, y + i, w, 1); const vg = ctx.createRadialGradient(x + w / 2, y + h / 2, h * 0.3, x + w / 2, y + h / 2, h * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = vg; ctx.fillRect(x, y, w, h); }
CD.scanlines = scanlines;
function panel(ctx, x, y, w, h) { ctx.fillStyle = 'rgba(2,14,8,0.93)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = UI().green; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.globalAlpha = 0.35; ctx.strokeRect(x + 6, y + 6, w - 12, h - 12); ctx.globalAlpha = 1; }
CD.panel = panel;

// ---------------------------------------------------------------- terminals
const Term = (CD.terminal = {});
Term.open = function (t) {
  const st = G.st, id = t.id; const locked = t.hack && !st.terminals[id + ':hacked'] && !st.terminals[id];
  const pages = (t.lines || ['NO DATA']).slice();
  const o = { t: 0, chars: 0, page: 0, pages: [], title: t.title || 'ROBCO INDUSTRIES (TM) TERMLINK', mode: locked ? 'hack' : 'read', term: t, done: false };
  if (locked) Term.initHack(o, t);
  else Term.initRead(o, t);
  o.update = Term.update.bind(null, o); o.draw = Term.draw.bind(null, o);
  OV.open(o);
};
Term.initRead = function (o, t) {
  o.mode = 'read'; o.pages = t.lines || ['NO DATA']; o.page = 0; o.chars = 0;
  const st = G.st; if (!st.terminals[t.id]) { st.terminals[t.id] = 1; if (t.onRead) CD.story.event(t.onRead); if (t.giveKey) { st.keys[t.giveKey.id] = 1; G.notify('KEYCARD: ' + t.giveKey.name.toUpperCase(), 'perk'); CD.audio.play('unlock'); } if (t.holotape) G.readHolotape(t.holotape, true); if (t.flag) st.flags[t.flag] = 1; }
};
const WORDS = [['TERMINAL', 'PROTOCOL', 'SECURITY', 'OVERRIDE', 'PASSWORD', 'ACCESSED', 'DATABASE', 'MAINFRAME', 'RESEARCH', 'SUPPLIES', 'FUSION', 'SILENCE'],
  ['VAULT', 'STEEL', 'DOORS', 'LOCKS', 'CODES', 'ALARM', 'POWER', 'GUARD', 'CHIPS', 'FLASH', 'BLAST', 'AXIOM'],
  ['ACCESS', 'SYSTEM', 'ENTRY', 'CIPHER', 'MASTER', 'CONTROL', 'ENGINE', 'SECTOR']];
Term.initHack = function (o, t) {
  const st = G.st, r = U.RNG(U.hashStr(t.id || 'x') + (st.terminals[t.id + ':tries'] || 0) * 7);
  const len = t.hack.len || 7, pool = ['SECURITY', 'OVERRIDE', 'PASSWORD', 'DATABASE', 'RESEARCH', 'SUPPLIES', 'TERMINAL', 'PROTOCOL', 'MAINFRAME', 'ACCESSED', 'MOISTURE', 'ELEVATOR', 'REACTORS', 'SILENCED', 'EMERGENT', 'CASCADES', 'PATIENTS', 'CONTROLS', 'WARDENS', 'REPAIRED', 'DISABLED', 'ANOMALY', 'DEFENSE', 'STORAGE'].filter((w) => w.length === (t.hack.wl || 8));
  const words = U.shuffle(pool.slice(), r).slice(0, t.hack.n || 8); o.words = words; o.pass = words[Math.floor(r.next() * words.length)];
  o.attempts = 4 + G.perk('science'); o.log = ['> ROBCO TERMLINK V7.2', '> PASSWORD REQUIRED', '> ATTEMPTS REMAINING: ' + o.attempts]; o.sel = 0; o.mode = 'hack'; o.dud = 0;
  // lay out words in two columns of hex-junk lines
  const junk = '!@#$%^&*()_+-={}[]|;:\'",.<>/?'; o.cols = [[], []];
  const rows = 17; const cells = [];
  for (let c = 0; c < 2; c++) for (let i = 0; i < rows; i++) { let s = ''; for (let k = 0; k < 12; k++) s += junk[Math.floor(r.next() * junk.length)]; cells.push(s.split('')); }
  const slots = U.shuffle(Array.from({ length: cells.length }, (_, i) => i), r).slice(0, words.length);
  o.entries = []; words.forEach((w, i) => { const cell = cells[slots[i]]; const p = Math.floor(r.next() * (12 - w.length + 1)); for (let k = 0; k < w.length; k++) cell[p + k] = w[k]; o.entries.push({ word: w, cell: slots[i], pos: p, dud: false }); });
  o.cells = cells; o.addr = 0xF400 + Math.floor(r.next() * 200) * 12;
};
Term.likeness = function (a, b) { let n = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) n++; return n; };
Term.update = function (o, dt) {
  o.t += dt; const I = CD.input, st = G.st;
  if (o.mode === 'read') {
    const pg = o.pages[o.page]; o.chars = Math.min(pg.length, o.chars + dt * 120);
    if (I.pressed('confirm') || I.pressed('interact') || I.mouse.edge) { I.mouse.edge = false; if (o.chars < pg.length) o.chars = pg.length; else if (o.page < o.pages.length - 1) { o.page++; o.chars = 0; CD.audio.play('beep'); } else { OV.close(); } }
    if (I.pressed('back') || I.pressed('pause')) OV.close();
    if (Math.random() < 0.3) CD.audio.play('key');
    return;
  }
  if (o.mode === 'hack') {
    const n = o.entries.length;
    if (I.pressed('down') || I.pressed('right')) { o.sel = (o.sel + 1) % n; CD.audio.play('ui_move'); }
    if (I.pressed('up') || I.pressed('left')) { o.sel = (o.sel + n - 1) % n; CD.audio.play('ui_move'); }
    if (I.pressed('back') || I.pressed('pause')) { OV.close(); return; }
    // mouse hover
    const m = I.mouse; if (m.moved > 0) o.entries.forEach((e, i) => { const b = o.boxes && o.boxes[i]; if (b && m.x > b.x && m.x < b.x + b.w && m.y > b.y - 12 && m.y < b.y + 4) o.sel = i; });
    if (I.pressed('confirm') || I.pressed('interact') || (I.mouse.edge)) {
      I.mouse.edge = false; const e = o.entries[o.sel]; if (!e || e.tried) return; e.tried = true;
      if (e.word === o.pass) { o.log.push('> ' + e.word, '> EXACT MATCH!', '> ACCESS GRANTED'); CD.audio.play('hack_ok'); st.terminals[o.term.id + ':hacked'] = 1; o.mode = 'win'; o.winT = 1.2; }
      else { o.attempts--; const like = Term.likeness(e.word, o.pass); o.log.push('> ' + e.word, '> ENTRY DENIED', '> LIKENESS=' + like + '/' + o.pass.length, '> ATTEMPTS: ' + o.attempts); CD.audio.play('hack_bad'); if (o.attempts <= 0) { o.mode = 'lock'; o.winT = 1.6; st.terminals[o.term.id + ':tries'] = (st.terminals[o.term.id + ':tries'] || 0) + 1; } }
      while (o.log.length > 12) o.log.shift();
    }
    // Science perk: remove a dud with key X
    if (I.keys['KeyX'] && G.perk('science') && !o.dudUsed) { o.dudUsed = true; const opts = o.entries.filter((e) => e.word !== o.pass && !e.tried); if (opts.length) { const d = opts[0]; d.tried = true; o.log.push('> DUD REMOVED: ' + d.word); } }
    return;
  }
  if (o.mode === 'win') { o.winT -= dt; if (o.winT <= 0) { Term.initRead(o, o.term); } return; }
  if (o.mode === 'lock') { o.winT -= dt; if (o.winT <= 0) { G.notify('TERMINAL LOCKED. Try again.', 'warn'); OV.close(); } }
};
Term.draw = function (o, ctx) {
  const vw = G.viewW, vh = G.viewH, ui = UI();
  ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, vw, vh);
  const w = Math.min(900, vw - 80), h = Math.min(560, vh - 80), x = (vw - w) / 2, y = (vh - h) / 2;
  panel(ctx, x, y, w, h);
  CD.glowText(ctx, o.title, x + 26, y + 34, 14, ui.green, 'left', 4); ctx.strokeStyle = ui.green; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x + 26, y + 44); ctx.lineTo(x + w - 26, y + 44); ctx.stroke(); ctx.globalAlpha = 1;
  if (o.mode === 'read') {
    const pg = o.pages[o.page].slice(0, Math.floor(o.chars)); ctx.font = 'bold 16px ' + ui.font; const lines = CD.wrapText(ctx, pg + (Math.floor(o.t * 2) % 2 ? '_' : ''), w - 80);
    lines.forEach((l, i) => CD.glowText(ctx, l, x + 34, y + 80 + i * 24, 16, '#7dffa8', 'left', 3));
    CD.glowText(ctx, o.chars >= o.pages[o.page].length ? (o.page < o.pages.length - 1 ? '[ENTER] NEXT PAGE  (' + (o.page + 1) + '/' + o.pages.length + ')' : '[ENTER] LOG OFF') : '', x + w - 30, y + h - 26, 12, ui.dim, 'right', 3);
  } else if (o.mode === 'hack' || o.mode === 'win' || o.mode === 'lock') {
    CD.glowText(ctx, 'ATTEMPT(S) LEFT: ' + '█ '.repeat(Math.max(0, o.attempts)), x + 26, y + 72, 13, o.attempts <= 1 ? ui.red : ui.green, 'left', 3);
    CD.glowText(ctx, 'ROBCO TERMLINK - PASSWORD REQUIRED   [UP/DOWN] SELECT  [ENTER] TRY' + (G.perk('science') && !o.dudUsed ? '  [X] REMOVE DUD' : ''), x + 26, y + 92, 10, ui.dim, 'left', 2);
    ctx.font = 'bold 14px ' + ui.font; o.boxes = [];
    for (let c = 0; c < 2; c++) for (let i = 0; i < 17; i++) {
      const idx = c * 17 + i, cx = x + 26 + c * 260, cy = y + 128 + i * 21; const addr = '0x' + (o.addr + idx * 12).toString(16).toUpperCase();
      CD.glowText(ctx, addr, cx, cy, 13, ui.dim, 'left', 0);
      let sx = cx + 62; const cell = o.cells[idx];
      for (let k = 0; k < 12; k++) {
        const ent = o.entries.find((e) => e.cell === idx && k >= e.pos && k < e.pos + e.word.length);
        let col = '#5fe89a'; if (ent) { col = ent.tried ? '#3a6a4a' : '#bfffd8'; if (o.entries[o.sel] === ent) { col = '#021008'; ctx.fillStyle = ui.green; ctx.fillRect(sx - 1, cy - 13, 9, 17); } }
        ctx.font = 'bold 14px ' + ui.font; ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(cell[k], sx, cy); if (ent && k === ent.pos) o.boxes[o.entries.indexOf(ent)] = { x: sx, y: cy, w: ent.word.length * 9 }; sx += 9;
      }
    }
    o.log.slice(-11).forEach((l, i, a) => CD.glowText(ctx, l, x + 560, y + h - 30 - (a.length - 1 - i) * 21, 13, '#7dffa8', 'left', 2));
    if (o.mode === 'win') CD.glowText(ctx, 'ACCESS GRANTED', x + w / 2, y + h / 2, 34, '#eaffef', 'center', 16);
    if (o.mode === 'lock') CD.glowText(ctx, 'TERMINAL LOCKED', x + w / 2, y + h / 2, 34, ui.red, 'center', 16);
  }
  scanlines(ctx, x, y, w, h);
};

// ---------------------------------------------------------------- dialogue
const Dlg = (CD.dialog = {});
Dlg.open = function (npc) {
  const s = npc.s; const o = { t: 0, npc, node: 'root', sel: 0, chars: 0, name: (npc.name || s.name || '???').toUpperCase() };
  o.tree = CD.NPC_TREES && CD.NPC_TREES[s.id] ? CD.NPC_TREES[s.id] : { root: { text: s.lines ? s.lines[0] : '...', choices: [].concat(s.shop ? [{ label: 'Let us trade.', shop: s.shop }] : [], (s.lines || []).slice(1).map((l, i) => ({ label: s.topics && s.topics[i] || ('Tell me more (' + (i + 1) + ').'), go: 'l' + i })), [{ label: 'Goodbye.', end: true }]) } };
  (s.lines || []).slice(1).forEach((l, i) => { if (!CD.NPC_TREES || !CD.NPC_TREES[s.id]) o.tree['l' + i] = { text: l, choices: [{ label: 'Back.', go: 'root' }, { label: 'Goodbye.', end: true }] }; });
  o.update = Dlg.update.bind(null, o); o.draw = Dlg.draw.bind(null, o); o.mode = 'dialog'; OV.open(o);
};
Dlg.openTree = function (name, tree) {
  const o = { t: 0, npc: null, node: 'root', sel: 0, chars: 0, name: (name || '').toUpperCase(), tree };
  o.update = Dlg.update.bind(null, o); o.draw = Dlg.draw.bind(null, o); o.mode = 'dialog'; OV.open(o);
};
Dlg.cur = (o) => o.tree[o.node];
Dlg.update = function (o, dt) {
  const I = CD.input; o.t += dt; const n = Dlg.cur(o); const txt = typeof n.text === 'function' ? n.text() : n.text; o.chars = Math.min(txt.length, o.chars + dt * 90);
  const ch = (n.choices || []).filter((c) => !c.when || c.when());
  if (o.chars < txt.length) { if (I.pressed('confirm') || I.pressed('interact') || I.mouse.edge) { o.chars = txt.length; I.mouse.edge = false; } return; }
  if (I.pressed('up')) { o.sel = (o.sel + ch.length - 1) % ch.length; CD.audio.play('ui_move'); } if (I.pressed('down')) { o.sel = (o.sel + 1) % ch.length; CD.audio.play('ui_move'); }
  const m = I.mouse; if (m.moved > 0) ch.forEach((c, i) => { const y = o.baseY + i * 30; if (m.y > y - 20 && m.y < y + 6 && m.x > G.viewW / 2 - 400 && m.x < G.viewW / 2 + 400) o.sel = i; });
  if (I.pressed('confirm') || I.pressed('interact') || m.edge) { m.edge = false; const c = ch[o.sel]; if (!c) return; CD.audio.play('ui_select'); if (c.act) c.act(o); if (c.end) { OV.close(); return; } if (c.shop) { OV.close(); CD.shop.open(c.shop); return; } if (c.go) { o.node = c.go; o.sel = 0; o.chars = 0; } }
  if (I.pressed('back') || I.pressed('pause')) OV.close();
};
Dlg.draw = function (o, ctx) {
  const vw = G.viewW, vh = G.viewH, ui = UI(); const n = Dlg.cur(o); const txt = typeof n.text === 'function' ? n.text() : n.text;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, vw, vh);
  const w = Math.min(920, vw - 60), x = (vw - w) / 2; const ch = (n.choices || []).filter((c) => !c.when || c.when());
  ctx.font = 'bold 17px ' + ui.font; const lines = CD.wrapText(ctx, txt.slice(0, Math.floor(o.chars)), w - 60);
  const h = 90 + lines.length * 26 + ch.length * 30 + 20, y = vh - h - 30;
  panel(ctx, x, y, w, h);
  CD.glowText(ctx, o.name, x + 28, y + 34, 15, ui.amber, 'left', 5);
  lines.forEach((l, i) => CD.glowText(ctx, l, x + 28, y + 66 + i * 26, 17, '#dfffe9', 'left', 2));
  o.baseY = y + 66 + lines.length * 26 + 22;
  if (o.chars >= txt.length) ch.forEach((c, i) => { const sel = i === o.sel; CD.glowText(ctx, (sel ? '> ' : '  ') + c.label, x + 34, o.baseY + i * 30, 16, sel ? '#eaffef' : ui.green, 'left', sel ? 8 : 2); });
};

// ---------------------------------------------------------------- shop
const Shop = (CD.shop = {});
CD.STOCK = {
  vending: [['stimpak', null, 45, 'Stimpak'], ['radaway', null, 60, 'RadAway'], ['radx', null, 50, 'Rad-X'], ['nukacola', null, 25, 'Nuka-Cola'], ['ammo', '10mm', 40, '10mm x30'], ['ammo', 'cell', 55, 'Microfusion Cell x25'], ['grenade', null, 60, 'Frag Grenade']],
  trader: [['stimpak', null, 40, 'Stimpak'], ['radaway', null, 55, 'RadAway'], ['medx', null, 70, 'Med-X'], ['psycho', null, 80, 'Psycho'], ['jet', null, 65, 'Jet'], ['ammo', '10mm', 36, '10mm x30'], ['ammo', '.308', 60, '.308 x12'], ['ammo', 'shell', 55, 'Shells x14'], ['ammo', '5.56', 50, '5.56mm x60'], ['ammo', 'cell', 50, 'Microfusion Cell x25'], ['grenade', null, 55, 'Frag Grenade'], ['weapon', 'shotgun', 320, 'Combat Shotgun'], ['weapon', 'hunting_rifle', 280, 'Hunting Rifle'], ['weapon', 'machete', 140, 'Machete'], ['upgrade', 'ammo', 380, 'Ammo Bandolier'], ['upgrade', 'stim', 420, "Doctor's Bag"]],
};
Shop.open = function (name) {
  const stock = CD.STOCK[name] || CD.STOCK.vending; const o = { t: 0, sel: 0, stock, name, mode: 'shop', msg: '' };
  o.update = Shop.update.bind(null, o); o.draw = Shop.draw.bind(null, o); OV.open(o);
};
Shop.price = (p) => Math.max(1, Math.round(p * (1 - (G.special('C') - 5) * 0.03)));
Shop.buy = function (o, it) {
  const st = G.st, price = Shop.price(it[2]); if (st.caps < price) { o.msg = 'Not enough caps.'; CD.audio.play('hack_bad'); return; }
  const k = it[0];
  if (k === 'stimpak') { if (st.aid.stimpak >= G.stimCap()) { o.msg = 'You cannot carry more.'; return; } st.aid.stimpak++; }
  else if (k === 'grenade') { if (st.grenades >= G.grenadeCap()) { o.msg = 'You cannot carry more.'; return; } st.grenades++; }
  else if (k === 'ammo') { const n = { '10mm': 30, 'cell': 25, '.308': 12, 'shell': 14, '5.56': 60, 'plasma': 20 }[it[1]] || 20; const got = G.giveAmmo(it[1], n); if (got <= 0) { o.msg = 'Ammo full.'; return; } }
  else if (k === 'weapon') { if (st.weapons.indexOf(it[1]) >= 0) { o.msg = 'Already owned.'; return; } G.grantWeapon(it[1], true); }
  else if (k === 'upgrade') { const key = 'shop:' + it[1]; if (st.flags[key]) { o.msg = 'Sold out.'; return; } st.flags[key] = 1; G.grantUpgrade(it[1]); }
  else { st.aid[k] = (st.aid[k] || 0) + 1; }
  st.caps -= price; o.msg = 'Purchased ' + it[3] + '.'; CD.audio.play('caps');
};
Shop.update = function (o, dt) {
  const I = CD.input; o.t += dt; const n = o.stock.length;
  if (I.pressed('down')) { o.sel = (o.sel + 1) % n; CD.audio.play('ui_move'); } if (I.pressed('up')) { o.sel = (o.sel + n - 1) % n; CD.audio.play('ui_move'); }
  const m = I.mouse; if (m.moved > 0) o.stock.forEach((it, i) => { const y = o.y0 + i * 30; if (m.y > y - 20 && m.y < y + 6 && m.x > o.x0 && m.x < o.x0 + 620) o.sel = i; });
  if (I.pressed('confirm') || I.pressed('interact') || m.edge) { m.edge = false; Shop.buy(o, o.stock[o.sel]); }
  if (I.pressed('back') || I.pressed('pause')) OV.close();
};
Shop.draw = function (o, ctx) {
  const vw = G.viewW, vh = G.viewH, ui = UI(), st = G.st; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, vw, vh);
  const w = 700, h = 60 + o.stock.length * 30 + 80, x = (vw - w) / 2, y = (vh - h) / 2; panel(ctx, x, y, w, h); o.x0 = x + 20; o.y0 = y + 92;
  CD.glowText(ctx, o.name === 'vending' ? 'NUKA-COLA VENDING MACHINE' : 'WASTELAND TRADER', x + 28, y + 36, 18, ui.green, 'left', 6);
  CD.glowText(ctx, st.caps + ' CAPS', x + w - 28, y + 36, 18, '#f0d27a', 'right', 6);
  o.stock.forEach((it, i) => { const yy = y + 92 + i * 30, sel = i === o.sel; if (sel) { ctx.fillStyle = 'rgba(61,255,138,0.15)'; ctx.fillRect(x + 16, yy - 20, w - 32, 27); } CD.glowText(ctx, (sel ? '> ' : '  ') + it[3], x + 28, yy, 15, sel ? '#eaffef' : ui.green, 'left', sel ? 8 : 2); const sold = it[0] === 'upgrade' && st.flags['shop:' + it[1]] || it[0] === 'weapon' && st.weapons.indexOf(it[1]) >= 0; CD.glowText(ctx, sold ? 'SOLD' : Shop.price(it[2]) + ' c', x + w - 28, yy, 15, sold ? ui.dim : (st.caps >= Shop.price(it[2]) ? '#f0d27a' : ui.red), 'right', 2); });
  CD.glowText(ctx, o.msg, x + 28, y + h - 24, 13, '#c8ffd8', 'left', 3); CD.glowText(ctx, '[ENTER] BUY   [ESC] LEAVE', x + w - 28, y + h - 24, 12, ui.dim, 'right', 2);
  scanlines(ctx, x, y, w, h);
};

})();
