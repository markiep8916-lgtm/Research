// UI: HUD, title, how-to-play, story cards, stage cards, tallies, continue, results, initials entry.

const UI = { ink: '#e8e0d0', dim: '#a08060', gold: '#ffe08a', orange: '#e2591e', red: '#e83b3b', green: '#7be04a', outline: '#140c0a' };
const FAMILY_BAR = { gang: '#e8c547', mutant: '#7cff6a', scorpion: '#ff8a3d', hero: '#e83b3b' };
const GAME_TITLE = { name: 'RUSTFIST', sub: 'BRAWL FOR THE LAST WELL' };

// Text with a 1px outline (HUD style).
function drawTextO(ctx, str, x, y, color, scale = 1, align = 'left') {
  str = String(str).toUpperCase();
  const w = textWidth(str, scale);
  const px = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x), py = Math.round(y);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) drawTextRaw(ctx, str, px + dx, py + dy, UI.outline, scale);
  drawTextRaw(ctx, str, px, py, color, scale);
}

// Damage trail: lags behind the real value, then drains 1px per 2f.
const _trail = new WeakMap();
function trailOf(e, frac, w) {
  let g = _trail.get(e);
  if (!g) g = { v: frac, hold: 0 };
  if (frac >= g.v) { g.v = frac; g.hold = 18; }
  else if (g.hold > 0) g.hold--;
  else g.v = Math.max(frac, g.v - 0.5 / w);
  _trail.set(e, g);
  return g.v;
}
function hpBar(ctx, x, y, w, h, frac, col, opts = {}) {
  Px.use(ctx);
  Px.rect(x - 1, y - 1, w + 2, h + 2, UI.outline);
  Px.rect(x, y, w, h, opts.back || '#4a1010');
  if (opts.trail != null) Px.rect(x, y, Math.round(w * clamp(opts.trail, 0, 1)), h, '#ffffff');
  const fw = Math.round(w * clamp(frac, 0, 1));
  Px.rect(x, y, fw, h, col);
  if (h >= 3) Px.rect(x, y, fw, 1, shade(col, 0.35));
  if (opts.grey) Px.rect(x + fw, y, Math.min(w - fw, Math.round(w * clamp(opts.grey, 0, 1))), h, '#9a9a9a');
}

function drawHUD(ctx, g) {
  const p = g.player;
  if (!p) return;
  Px.use(ctx);
  ctx.globalAlpha = 0.72; ctx.fillStyle = '#0a0706'; ctx.fillRect(0, 0, W, 23); ctx.globalAlpha = 1;
  // portrait 18x18 at (4,2)
  const hit = g.portraitHit > 0;
  const px = 4 + (hit ? (g.frame % 2 ? 1 : -1) : 0);
  const lowHp = p.hp < 30;
  Px.rect(px - 1, 1, 20, 20, lowHp && (g.frame >> 3) % 2 ? UI.red : UI.ink);
  Px.rect(px, 2, 18, 18, '#3a2a20');
  ctx.save(); ctx.beginPath(); ctx.rect(px, 2, 18, 18); ctx.clip();
  drawPortrait(ctx, px + 9, 18, hit || p.state === 'hurt' || p.state === 'fall');
  ctx.restore();
  if (hit && g.portraitHit > 5) { ctx.globalAlpha = 0.7; Px.rect(px, 2, 18, 18, '#ffffff'); ctx.globalAlpha = 1; }
  if (lowHp) Px.rect(px + 14, 5 + (g.frame >> 3) % 3, 2, 3, '#bde6ff');
  drawTextO(ctx, HERO.name, 26, 3, UI.gold);
  drawTextO(ctx, 'x' + g.lives, 58, 3, UI.ink);
  // HP bar 96x6 at (26,12), rage strip under it
  const frac = p.hp / p.maxHp;
  const fill = p.venom > 0 ? '#9be15d' : lowHp && (g.frame >> 3) % 2 ? UI.orange : '#f2c14e';
  hpBar(ctx, 26, 12, 96, 6, frac, fill, { trail: trailOf(p, frac, 96), grey: p.grey / p.maxHp });
  const full = g.rage >= 100;
  Px.rect(25, 19, 98, 4, UI.outline);
  Px.rect(26, 20, 96, 2, '#3a2418');
  Px.rect(26, 20, Math.round(96 * g.rage / 100), 2, full ? ((g.frame >> 2) % 2 ? '#ffffff' : '#ffe14a') : '#ff9a2e');
  // weapon slot 14x14 at (126,3) + durability pips
  Px.rect(125, 2, 16, 16, UI.outline);
  Px.rect(126, 3, 14, 14, '#2a1d15');
  if (p.weapon) {
    ctx.save(); ctx.beginPath(); ctx.rect(126, 3, 14, 14); ctx.clip();
    ctx.translate(133, 13); ctx.scale(0.55, 0.55);
    drawItemIcon(p.weapon.kind, 0, 0, g.frame);
    ctx.restore();
    const n = Math.min(p.weapon.uses, 30);
    for (let i = 0; i < n; i++) Px.rect(126 + (i % 15) * 2 - 1, 19 + Math.floor(i / 15) * 2, 1, 1, '#f2c14e');
  }
  // TIME centred
  const tcol = g.time < 10 ? ((g.frame >> 4) % 2 ? '#ff3b30' : '#ffffff') : UI.gold;
  drawTextO(ctx, String(g.time).padStart(2, '0'), 192, 4, tcol, 2, 'center');
  // enemy info / boss
  const b = g.bossRef && !g.bossRef.remove ? g.bossRef : null;
  const f = g.foe;
  if (f && !f.remove && f !== b) {
    const ff = Math.max(0, f.hp / f.maxHp);
    drawTextO(ctx, f.name, 212, 3, '#ff8a6a');
    hpBar(ctx, 212, 12, 80, 6, ff, FAMILY_BAR[f.family] || UI.orange, { trail: trailOf(f, ff, 80) });
  }
  // score
  drawTextO(ctx, '1P', 324, 3, UI.gold);
  drawTextO(ctx, String(g.shownScore).padStart(7, '0'), 380, 3, '#ffffff', 1, 'right');
  drawTextO(ctx, 'HI ' + String(Math.max(g.hiscore, g.score)).padStart(7, '0'), 380, 13, UI.dim, 1, 'right');
  // boss bar: stacked layers
  if (b && g.state !== 'stageintro' && !(g.bossCardInfo && g.bossCardInfo.t < 40)) {
    const layer = b.def.barLayer || 100;
    const hp = Math.max(0, b.hp);
    const idx = Math.max(0, Math.ceil(hp / layer) - 1);
    const within = hp - idx * layer;
    const cols = b.def.barColors || ['#e83b3b', '#e8c547', '#59e04a'];
    drawTextO(ctx, b.name, 72, 194, UI.gold);
    Px.rect(71, 205, 242, 9, UI.outline);
    Px.rect(72, 206, 240, 7, idx > 0 ? cols[(idx - 1) % cols.length] : '#4a1010');
    Px.rect(72, 206, Math.round(240 * within / layer), 7, cols[idx % cols.length]);
    Px.rect(72, 206, Math.round(240 * within / layer), 1, '#ffffff');
    if (idx > 0) drawTextO(ctx, 'x' + (idx + 1), 316, 206, UI.ink);
  }
  // combo
  if (p.comboHits >= 2 && p.comboT > 0) {
    const c = p.comboHits;
    const col = c >= 30 ? ((g.frame >> 2) % 2 ? '#ff3b30' : '#ffffff') : c >= 20 ? '#ff8a2a' : c >= 10 ? '#ffe08a' : '#ffffff';
    const s = p.comboPop > 3 ? 3 : 2;
    drawTextO(ctx, String(c), 352, 30 - (s - 2) * 3, col, s, 'right');
    drawTextO(ctx, 'HITS', 356, 37, col);
    Px.rect(334, 48, Math.round(40 * p.comboT / 75), 2, col);
  }
  // GO arrow
  if (g.goT > 0 && Math.floor(g.frame / 20) % 2 === 0) {
    drawTextO(ctx, 'GO!', 358, 84, '#ffe14a', 1, 'center');
    Px.poly([343, 99, 359, 99, 359, 94, 373, 106, 359, 118, 359, 113, 343, 113], UI.outline);
    Px.poly([344, 100, 360, 100, 360, 96, 371, 106, 360, 116, 360, 112, 344, 112], '#ffe14a');
  }
  // tutorial / caption strip owned by stages
  if (lowHp && g.frame % 40 < 10) FX.vignetteT = Math.max(FX.vignetteT, 4);
}

function drawStageCard(ctx, card, t) {
  if (!card) return;
  const k = t < 20 ? easeOut(t / 20) : t > 100 ? Math.max(0, 1 - (t - 100) / 20) : 1;
  if (k <= 0) return;
  const y = 78;
  ctx.globalAlpha = 0.65 * k;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, y - 8, W, 46);
  ctx.globalAlpha = 1;
  const x = lerp(-160, W / 2, k);
  drawTextO(ctx, card.num, x, y - 2, UI.ink, 1, 'center');
  drawTextO(ctx, card.title, x, y + 10, UI.gold, 3, 'center');
}

function drawClearTally(ctx, g) {
  const t = g.t, b = g.clearBonus;
  if (!b) return;
  ctx.globalAlpha = Math.min(0.65, t / 40);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 34, W, 92);
  ctx.globalAlpha = 1;
  if (t > 10) drawTextO(ctx, 'STAGE CLEAR!', W / 2, 44, UI.gold, 3, 'center');
  // speech box at Juno's feet, tail pointing up at her
  const p = g.player;
  if (p && t > 30) {
    const sx = Math.round(p.x - g.cam.x), sy = Math.min(H - 14, Math.round(p.y + 6));
    const w = textWidth(b.line) + 8;
    const bx = clamp(sx - w / 2, 4, W - w - 4);
    Px.use(ctx);
    Px.rect(bx - 1, sy - 1, w + 2, 13, UI.outline);
    Px.rect(bx, sy, w, 11, UI.ink);
    Px.poly([sx - 3, sy, sx + 3, sy, sx, sy - 4], UI.ink);
    drawText(ctx, b.line, bx + 4, sy + 2, '#1a1010', 1, 'left', null);
  }
  b.rows.forEach((r, i) => {
    if (t < 60 + i * 10) return;
    drawTextO(ctx, r[0], 84, 72 + i * 12, UI.ink);
    drawTextO(ctx, String(b.shown[i]), 300, 72 + i * 12, b.shown[i] >= r[1] ? UI.gold : UI.ink, 1, 'right');
  });
  if (b.doneAt) drawTextO(ctx, 'SCORE ' + String(g.shownScore).padStart(7, '0'), W / 2, 112, UI.gold, 1, 'center');
}

// ---------- title ----------
function drawLogo(ctx, text, cx, y, scale) {
  // gradient-filled bitmap letters with a 2px outline and a 3px drop shadow
  const w = textWidth(text, scale), h = 7 * scale;
  let cv = drawLogo.cache && drawLogo.cache.key === text + scale ? drawLogo.cache.cv : null;
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = w + 8; cv.height = h + 8;
    const g = cv.getContext('2d');
    drawTextRaw(g, text, 4, 4, '#ffffff', scale);
    g.globalCompositeOperation = 'source-in';
    const grad = g.createLinearGradient(0, 4, 0, 4 + h);
    grad.addColorStop(0, '#ffe08a'); grad.addColorStop(0.55, '#f2a04a'); grad.addColorStop(1, '#e2591e');
    g.fillStyle = grad; g.fillRect(0, 0, cv.width, cv.height);
    drawLogo.cache = { key: text + scale, cv };
  }
  const x = Math.round(cx - w / 2), yy = Math.round(y);
  drawTextRaw(ctx, text, x + 3, yy + 3, '#140c0a', scale);
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1], [1, -1], [-1, 1]]) drawTextRaw(ctx, text, x + dx, yy + dy, '#1a0e0a', scale);
  ctx.drawImage(cv, x - 4, yy - 4);
  // rust drips
  Px.use(ctx);
  for (let i = 0; i < 3; i++) Px.rect(x + 18 + i * 79, yy + h + 1, 1, 3 + ((Game.frame >> 5) + i) % 4, '#8a4b2a');
}
let _titleHero = null;
function drawTitleScreen(ctx, g) {
  const t = g.t, f = g.frame;
  Px.use(ctx);
  // sky
  const stops = ['#1e1230', '#3f1d38', '#6a2a3e', '#a03e3c', '#d2553a', '#e47c42', '#f2a04a'];
  for (let i = 0; i < 28; i++) Px.rect(0, i * 6, W, 6, stops[Math.min(stops.length - 1, Math.floor(i / 28 * stops.length))]);
  // striped sun
  Px.disc(192, 112, 34, '#ffc46a');
  Px.disc(192, 112, 30, '#ffd88a');
  [[96, 2], [104, 3], [112, 4], [121, 5]].forEach(([yy, hh]) => Px.rect(150, yy, 84, hh, '#e47c42'));
  // skyline drifting
  const sc = f * 0.1;
  for (let i = 0; i < 18; i++) {
    const bw = 16 + (i * 37) % 28, bh = 20 + (i * 53) % 46;
    const bx = ((i * 37 - sc) % (W + 60) + W + 60) % (W + 60) - 30;
    Px.rect(bx, 150 - bh, bw, bh, '#3a1e36');
    Px.poly([bx, 150 - bh, bx + bw * 0.4, 150 - bh - 5, bx + bw * 0.7, 150 - bh - 1, bx + bw, 150 - bh - 7, bx + bw, 150 - bh], '#3a1e36');
    if ((i + (f >> 6)) % 5 === 0) Px.rect(bx + 4, 150 - bh + 8, 1, 2, '#ffb04a');
  }
  // dune silhouette
  Px.poly([0, 216, 0, 156, 60, 150, 140, 158, 220, 151, 300, 160, 384, 152, 384, 216], '#1e1230');
  // wrecked car with Juno on the roof
  Px.poly([62, 168, 66, 156, 84, 154, 96, 146, 128, 146, 140, 154, 160, 156, 162, 168], '#2a1a26');
  Px.rect(98, 148, 10, 6, '#120a12'); Px.rect(112, 148, 12, 6, '#120a12');
  Px.disc(80, 168, 6, '#120a12'); Px.disc(146, 168, 6, '#120a12');
  if (!_titleHero) _titleHero = new Player(112, 146);
  const h = _titleHero;
  h.state = 'idle'; h.vx = 2.6; h.facing = 1; h.z = 0; h.y = 146; h.x = 112;
  h.draw(ctx, 0);
  // dust specks
  for (let i = 0; i < 36; i++) {
    const x = ((i * 97 + f * (0.4 + (i % 3) * 0.15)) % (W + 20)) - 10;
    const y = ((i * 53 + f * (0.25 + (i % 4) * 0.1)) % (H + 10)) - 5;
    Px.rect(W - x, y, 1, 1, '#c8a080');
  }
  // logo drops from y -40 over 20f
  const ly = t < 20 ? lerp(-40, 30, easeOut(t / 20)) : 30;
  ctx.save(); ctx.translate(FX.shakeX, FX.shakeY);
  drawLogo(ctx, GAME_TITLE.name, W / 2, ly, 5);
  ctx.restore();
  if (t > 24) {
    const n = Math.min(GAME_TITLE.sub.length, Math.floor((t - 24) / 2));
    drawTextO(ctx, GAME_TITLE.sub.slice(0, n), W / 2, 76, UI.ink, 1, 'center');
  }
  if (t > 26) {
    if (!g.titleReady) {
      if (f % 60 < 30) drawTextO(ctx, { touch: 'TAP TO START', gamepad: 'PRESS START' }[Input.lastDevice] || 'PRESS ENTER', W / 2, 170, UI.gold, 1, 'center');
    } else if (!g.howto) {
      const items = ['START GAME', 'HOW TO PLAY', 'DIFFICULTY  < ' + g.diff.name + ' >', 'SOUND: ' + (Sound.muted ? 'OFF' : 'ON')];
      items.forEach((s, i) => {
        const sel = g.menuSel === i;
        drawTextO(ctx, s, 206, 150 + i * 12, sel ? '#ffffff' : UI.dim, 1, 'left');
        if (sel) drawMiniFist(ctx, 194, 153 + i * 12);
      });
    }
    drawTextO(ctx, 'HI ' + String(g.hiscore).padStart(7, '0'), 6, 204, UI.dim);
    drawTextO(ctx, '(C) 2097 SCRAPWORKS', W / 2, 204, UI.dim, 1, 'center');
    drawTextO(ctx, g.diffKey === 'easy' ? 'FREE PLAY' : 'CREDITS 3', 378, 204, UI.dim, 1, 'right');
  }
  ctx.save(); ctx.translate(FX.shakeX, FX.shakeY);
  FX.draw(ctx, 0);
  ctx.restore();
  if (g.howto) drawHowTo(ctx, g);
  if (g.showTop > 0) drawTopScores(ctx, g);
}
// Button names for the device the player is using right now.
function devKeys() {
  const d = Input.lastDevice;
  if (d === 'touch') return { dev: d, a: 'HIT', j: 'JUMP', s: 'SPEC', st: 'PAUSE' };
  if (d === 'gamepad') return { dev: d, a: 'X', j: 'A', s: 'B', st: 'START' };
  return { dev: 'keyboard', a: 'J', j: 'K', s: 'L', st: 'ENTER' };
}
function drawMiniFist(ctx, x, y) {
  Px.use(ctx);
  Px.rect(x - 4, y - 2, 4, 4, HERO_PAL.iron);
  Px.rect(x, y - 3, 7, 6, HERO_PAL.fist);
  Px.rect(x + 4, y - 3, 1, 6, HERO_PAL.knuckle);
}
function drawHowTo(ctx, g) {
  // opaque card: the logo and menu must not show through
  ctx.fillStyle = '#0e0a08'; ctx.fillRect(16, 14, W - 32, H - 28);
  Px.use(ctx);
  Px.rect(16, 14, W - 32, 1, '#ffb030'); Px.rect(16, H - 15, W - 32, 1, '#ffb030');
  drawTextO(ctx, 'HOW TO PLAY', W / 2, 22, UI.gold, 2, 'center');
  const K = devKeys();
  const lines = K.dev === 'touch' ? [
    ['D-PAD', 'MOVE (DOUBLE-TAP SIDEWAYS TO RUN)'],
    ['HIT', 'ATTACK / PICK UP'],
    ['JUMP', 'JUMP (HIT IN THE AIR TO KICK)'],
    ['SPEC', 'SCRAP BURST / THROW WEAPON'],
    ['PAUSE', 'PAUSE (TOP CORNER)'],
  ] : K.dev === 'gamepad' ? [
    ['D-PAD/STICK', 'MOVE    DOUBLE-TAP TO RUN'],
    ['X', 'ATTACK / PICK UP'],
    ['A', 'JUMP    (X IN THE AIR TO KICK)'],
    ['B', 'SCRAP BURST / THROW WEAPON'],
    ['START', 'PAUSE'],
  ] : [
    ['ARROWS/WASD', 'MOVE    DOUBLE-TAP TO RUN'],
    ['J', 'ATTACK / PICK UP'],
    ['K', 'JUMP    (J IN THE AIR TO KICK)'],
    ['L', 'SCRAP BURST / THROW WEAPON'],
    ['ENTER', 'PAUSE     M  MUTE'],
  ];
  lines.forEach((l, i) => { drawTextO(ctx, l[0], 34, 44 + i * 11, UI.gold); drawTextO(ctx, l[1], 120, 44 + i * 11, UI.ink); });
  const tips = [
    `WALK INTO FOES TO GRAB. ${K.a} KNEES, ${K.a}+DIRECTION THROWS.`,
    `${K.s} = SCRAP BURST: COSTS HP, WIN IT BACK BY HITTING.`,
    `FORWARD+${K.a} ON THE 4TH HIT = PISTON STRAIGHT.`,
    `NEUTRAL JUMP+${K.a} = HAMMER DROP: POPS SAND MOUNDS.`,
    `FULL RAGE BAR: ${K.s} FOR THE PISTON KING.`,
    'WATCH THE RED !: BIG HITS ARE TELEGRAPHED.',
  ];
  tips.forEach((tp, i) => drawTextO(ctx, tp, W / 2, 106 + i * 12, UI.dim, 1, 'center'));
  if ((g.frame >> 4) % 2) drawTextO(ctx, 'PRESS ANY BUTTON', W / 2, 186, UI.ink, 1, 'center');
}
function drawTopScores(ctx, g) {
  ctx.globalAlpha = 0.85; ctx.fillStyle = '#0e0a08'; ctx.fillRect(96, 92, 192, 96); ctx.globalAlpha = 1;
  drawTextO(ctx, 'TOP 5', W / 2, 98, UI.gold, 1, 'center');
  HiScores.list().forEach((r, i) => {
    drawTextO(ctx, (i + 1) + '. ' + r[0], 120, 114 + i * 13, i === 0 ? UI.gold : UI.ink);
    drawTextO(ctx, String(r[1]).padStart(7, '0'), 264, 114 + i * 13, UI.ink, 1, 'right');
  });
}

// Shared dusk sky helper (kept for stage art that wants it).
function drawDuskSky(ctx, scroll) {
  Px.use(ctx);
  const stops = ['#1e1230', '#6a2a3e', '#d2553a', '#f2a04a'];
  for (let i = 0; i < 20; i++) Px.rect(0, i * 6, W, 6, stops[Math.min(3, Math.floor(i / 20 * 4))]);
  Px.disc(290, 96, 22, '#ffc46a');
  [92, 98, 104].forEach(y => Px.rect(266, y, 48, 2, '#d2553a'));
}

// ---------- story ----------
function drawStoryScreen(ctx, page, chars, g) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (!page) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(92, 16, 200, 96); ctx.clip();
  if (page.art) { try { page.art(ctx, 92, 16, g.t, g.frame); } catch (e) { /* keep the card readable even if its art fails */ } }
  ctx.restore();
  Px.use(ctx);
  Px.rect(91, 15, 202, 1, '#ffb030'); Px.rect(91, 112, 202, 1, '#ffb030'); Px.rect(91, 15, 1, 98, '#ffb030'); Px.rect(292, 15, 1, 98, '#ffb030');
  const text = page.text.slice(0, Math.floor(chars));
  const lines = wrapText(text, 54);
  lines.forEach((ln, i) => drawText(ctx, ln, 28, 130 + i * 12, UI.ink));
  if (chars >= page.text.length && (g.frame >> 4) % 2) Px.poly([350, 190, 358, 190, 354, 195], UI.gold);
  drawText(ctx, devKeys().st + ': SKIP', W - 6, H - 10, '#5a4a3a', 1, 'right');
}
function wrapText(str, n) {
  const out = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; }
      else line += ' ' + w;
    }
    out.push(line.trim());
  }
  return out;
}

// ---------- continue / game over ----------
function drawVultures(ctx, g) {
  Px.use(ctx);
  const p = g.player;
  const cx = p ? p.x - g.cam.x : W / 2, cy = 128;
  for (let i = 0; i < 2; i++) {
    const a = g.t * 0.025 + i * Math.PI;
    const x = cx + Math.cos(a) * 46, y = cy + Math.sin(a) * 12;
    const flap = Math.sin(g.t * 0.2 + i) * 2;
    Px.line(x - 7, y - flap, x, y + 2, 1, '#1a1012');
    Px.line(x, y + 2, x + 7, y - flap, 1, '#1a1012');
  }
}
function drawGameOver(ctx, g) {
  ctx.fillStyle = '#0e0a08'; ctx.fillRect(0, 0, W, H);
  const word = 'GAME OVER';
  const t = g.t;
  for (let i = 0; i < word.length; i++) {
    const lt = t - i * 5;
    if (lt < 0) continue;
    const y = lt < 16 ? lerp(-30, 70, easeOut(lt / 16)) : 70;
    const crack = t > 80 ? Math.min(3, (t - 80) / 8) * ((i % 2) ? 1 : -1) : 0;
    drawTextO(ctx, word[i], W / 2 - (word.length * 24) / 2 + i * 24 + 2, y + crack, UI.red, 4);
  }
  if (t > 60) {
    drawTextO(ctx, 'SCORE ' + String(g.score).padStart(7, '0'), W / 2, 130, UI.ink, 1, 'center');
    drawTextO(ctx, 'THE WASTES KEEP ANOTHER.', W / 2, 160, UI.dim, 1, 'center');
  }
}

// ---------- results ----------
function drawResults(ctx, g) {
  ctx.fillStyle = '#0e0a08'; ctx.fillRect(0, 0, W, H);
  drawTextO(ctx, 'WASTELAND RECORD', W / 2, 14, UI.gold, 2, 'center');
  const p = g.player || { bestCombo: 0 };
  const mins = Math.floor(g.stats.time / 3600), secs = Math.floor(g.stats.time / 60) % 60;
  const rows = [
    ['TIME', mins + ':' + String(secs).padStart(2, '0')],
    ['MAX COMBO', String(p.bestCombo)],
    ['KOS', String(g.stats.kills)],
    ['CONTINUES', String(g.stats.continues)],
    ...((g.results && g.results.rows) || []).map(r => [r[0], String(r[1])]),
    ['SCORE', String(g.score).padStart(7, '0')],
  ];
  rows.forEach((r, i) => {
    if (g.t < 20 + i * 14) return;
    drawTextO(ctx, r[0], 70, 42 + i * 14, UI.dim);
    drawTextO(ctx, r[1], 270, 42 + i * 14, i === rows.length - 1 ? UI.gold : UI.ink, 1, 'right');
  });
  if (g.t >= 130 && g.results) {
    const rank = g.results.rank;
    const k = clamp((g.t - 130) / 8, 0, 1);
    drawTextO(ctx, 'RANK', 330, 46, UI.dim, 1, 'center');
    drawTextO(ctx, rank, 330, 62 - (1 - k) * 10, rank === 'S' ? UI.gold : UI.ink, Math.round(lerp(9, 5, k)), 'center');
  }
  if (g.t > 200) drawTextO(ctx, 'THANKS FOR PLAYING', W / 2, 176, UI.ink, 1, 'center');
  if (g.t > 220 && (g.frame >> 4) % 2) drawTextO(ctx, 'PRESS ATTACK', W / 2, 192, UI.dim, 1, 'center');
}
function drawEntry(ctx, g) {
  ctx.fillStyle = '#0e0a08'; ctx.fillRect(0, 0, W, H);
  drawTextO(ctx, 'NEW HIGH SCORE', W / 2, 40, UI.gold, 2, 'center');
  drawTextO(ctx, String(g.score).padStart(7, '0'), W / 2, 66, UI.ink, 1, 'center');
  drawTextO(ctx, 'ENTER YOUR INITIALS', W / 2, 92, UI.dim, 1, 'center');
  const e = g.entry;
  for (let i = 0; i < 3; i++) {
    const ch = HiScores.CHARS[e.letters[i]];
    const x = W / 2 - 36 + i * 36;
    const sel = i === e.pos;
    drawTextO(ctx, ch === ' ' ? '_' : ch, x, 112, sel ? '#ffffff' : UI.gold, 3, 'center');
    if (sel && (g.frame >> 3) % 2) { Px.use(ctx); Px.rect(x - 8, 136, 16, 2, UI.gold); }
  }
  drawTextO(ctx, 'UP/DOWN CHANGE   ATTACK CONFIRM', W / 2, 160, UI.dim, 1, 'center');
}
