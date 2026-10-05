// UI: HUD, title, story cards, stage cards, tallies, results.

const UI = { ink: '#e9d9bf', dim: '#9c8670', gold: '#ffe066', orange: '#ff9a2e', red: '#e83b3b', green: '#59e04a' };
const FAMILY_BAR = { gang: '#e8c547', mutant: '#7cff4f', scorpion: '#ff8a3d', hero: '#e83b3b' };
const GAME_TITLE = { name: 'SCRAPFIST', sub: 'ROAD TO THE LAST WELL' };

const _ghost = new WeakMap();
function ghostOf(e, frac) {
  let g = _ghost.get(e);
  if (!g) g = { v: frac, hold: 0 };
  if (frac >= g.v) { g.v = frac; g.hold = 18; }
  else if (g.hold > 0) g.hold--;
  else g.v = Math.max(frac, g.v - 0.012);
  _ghost.set(e, g);
  return g.v;
}
function hpBar(ctx, x, y, w, h, frac, col, opts = {}) {
  Px.use(ctx);
  Px.rect(x - 1, y - 1, w + 2, h + 2, '#1a1a1a');
  Px.rect(x, y, w, h, opts.back || '#3a1a1a');
  if (opts.ghost != null) Px.rect(x, y, Math.round(w * clamp(opts.ghost, 0, 1)), h, '#ffe066');
  const fw = Math.round(w * clamp(frac, 0, 1));
  Px.rect(x, y, fw, h, col);
  if (h >= 3) Px.rect(x, y, fw, 1, shade(col, 0.35));
  if (opts.grey) Px.rect(x + fw, y, Math.round(w * clamp(opts.grey, 0, 1)), h, '#9a9a9a');
}

function drawHUD(ctx, g) {
  const p = g.player;
  if (!p) return;
  Px.use(ctx);
  ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 28); ctx.globalAlpha = 1;
  // portrait
  const ph = g.portraitHit > 0;
  const px = 4 + (ph ? (g.frame % 2 ? 1 : -1) : 0);
  const lowHp = p.hp / p.maxHp < 0.25;
  Px.rect(px - 1, 3, 22, 22, lowHp && (g.frame >> 3) % 2 ? '#e83b3b' : '#000');
  Px.rect(px, 4, 20, 20, '#3a2b20');
  drawPortrait(ctx, px + 10, 20);
  if (ph) { ctx.globalAlpha = 0.7; Px.rect(px, 4, 20, 20, '#ffffff'); ctx.globalAlpha = 1; }
  if (lowHp) Px.rect(px + 15, 7 + (g.frame >> 3) % 3, 2, 3, '#bde6ff');
  drawText(ctx, HERO.name, 28, 3, UI.ink);
  // HP
  const frac = p.hp / p.maxHp;
  const fill = p.venom > 0 ? '#7cff4f' : UI.red;
  hpBar(ctx, 28, 12, 104, 6, frac, fill, { ghost: ghostOf(p, frac), grey: p.grey / p.maxHp });
  // rage
  const full = g.rage >= 100;
  const rc = full ? ((g.frame >> 3) % 2 ? UI.gold : UI.orange) : UI.orange;
  hpBar(ctx, 28, 22, 64, 2, g.rage / 100, rc, { back: '#2a1d15' });
  if (full) { Px.poly([94, 25, 96, 19, 98, 25], (g.frame >> 2) % 2 ? '#ffe066' : '#ff5a1e'); }
  // weapon icon + durability pips
  if (p.weapon) {
    Px.use(ctx);
    ctx.save(); ctx.translate(112, 26); ctx.scale(0.6, 0.6);
    drawItemIcon(p.weapon.kind, 0, 0, g.frame);
    ctx.restore();
    for (let i = 0; i < p.weapon.uses; i++) Px.rect(102 + i * 2, 25, 1, 2, '#c9ced6');
  }
  // lives
  drawText(ctx, 'x' + g.lives, 138, 12, UI.ink);
  // score
  drawText(ctx, String(g.shownScore).padStart(7, '0'), W / 2 + 12, 3, UI.gold, 1, 'center');
  drawText(ctx, 'HI ' + String(g.hiscore).padStart(7, '0'), W / 2 + 12, 13, UI.dim, 1, 'center');
  // enemy panel (non-boss)
  const f = g.foe;
  const b = g.bossRef && !g.bossRef.remove ? g.bossRef : null;
  if (f && !f.remove && !b) {
    const ff = Math.max(0, f.hp / f.maxHp);
    drawText(ctx, f.name, 252, 3, UI.ink);
    hpBar(ctx, 252, 13, 124, 5, ff, FAMILY_BAR[f.family] || UI.gold, { ghost: ghostOf(f, ff) });
  }
  // boss bar: stacked 200-HP layers
  if (b && g.state !== 'stageintro') {
    const layer = b.def.barLayer || 200;
    const n = Math.ceil(b.maxHp / layer);
    const cols = ['#e83b3b', '#e8c547', '#59e04a', '#3fa9f5'];
    const hp = Math.max(0, b.hp);
    const idx = Math.max(0, Math.ceil(hp / layer) - 1);
    const within = hp - idx * layer;
    drawText(ctx, b.name, 32, H - 21, UI.gold);
    Px.rect(31, H - 13, 322, 8, '#1a1a1a');
    Px.rect(32, H - 12, 320, 6, idx > 0 ? cols[(idx - 1) % cols.length] : '#3a1a1a');
    Px.rect(32, H - 12, Math.round(320 * within / layer), 6, cols[idx % cols.length]);
    Px.rect(32, H - 12, Math.round(320 * within / layer), 1, '#ffffff');
    if (n > 1) drawText(ctx, 'x' + (idx + 1), 356, H - 13, UI.ink);
  }
  // combo
  if (p.comboHits >= 2 && p.comboT > 0) {
    const c = p.comboHits;
    const col = c >= 35 ? ((g.frame >> 2) % 2 ? '#ff3b6b' : '#ffffff') : c >= 20 ? '#ff8a1e' : c >= 10 ? '#ffd23f' : '#ffffff';
    const s = p.comboPop > 0 ? 3 : 2;
    drawText(ctx, String(c), 344, 36 - (s - 2) * 3, col, s, 'right');
    drawText(ctx, 'HITS', 348, 43, col);
    Px.rect(320, 54, Math.round(40 * p.comboT / 60), 2, col);
  }
  // GO arrow
  if (g.goT > 0 && Math.floor(g.goT / 20) % 2 === 0) {
    drawText(ctx, 'GO!', 344, 84, UI.gold, 2, 'center');
    Px.poly([334, 100, 354, 100, 354, 94, 368, 104, 354, 114, 354, 108, 334, 108], '#000');
    Px.poly([335, 101, 355, 101, 355, 96, 366, 104, 355, 112, 355, 107, 335, 107], UI.gold);
  }
  // low HP vignette pulse
  if (lowHp && g.frame % 40 < 10) FX.vignetteT = Math.max(FX.vignetteT, 4);
}

function drawStageCard(ctx, card, t) {
  if (!card) return;
  const k = t < 20 ? easeOut(t / 20) : t > 110 ? Math.max(0, 1 - (t - 110) / 20) : 1;
  if (k <= 0) return;
  const y = 82;
  ctx.globalAlpha = 0.7 * k;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, y - 10, W, 44);
  ctx.globalAlpha = 1;
  drawText(ctx, card.title, lerp(-200, W / 2, k), y, UI.gold, 2, 'center');
  drawText(ctx, card.sub, lerp(W + 200, W / 2, k), y + 22, UI.ink, 1, 'center');
}

function drawClearTally(ctx, g) {
  const t = g.t, b = g.clearBonus;
  ctx.globalAlpha = Math.min(0.7, t / 40);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 40, W, 130);
  ctx.globalAlpha = 1;
  if (t > 20) drawText(ctx, 'STAGE CLEAR', W / 2, 54, UI.gold, 3, 'center');
  if (t > 70) drawText(ctx, 'VITALITY BONUS  ' + String(b.hp).padStart(6, ' '), W / 2, 100, t > 100 ? UI.ink : UI.dim, 1, 'center');
  if (t > 100) drawText(ctx, 'STAGE BONUS     ' + String(b.stage).padStart(6, ' '), W / 2, 114, t > 140 ? UI.ink : UI.dim, 1, 'center');
  if (t > 170) drawText(ctx, 'SCORE ' + String(g.shownScore).padStart(7, '0'), W / 2, 138, UI.gold, 1, 'center');
}

// ---------- title ----------
function drawTitleScreen(ctx, g) {
  const t = g.t, f = g.frame;
  drawDuskSky(ctx, f * 0.1);
  // ash drift
  Px.use(ctx);
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97 + f * (0.3 + (i % 3) * 0.1)) % (W + 20)) - 10;
    const y = ((i * 53 + f * (0.5 + (i % 4) * 0.12)) % (H + 10)) - 5;
    Px.rect(W - x, y, 1, 1, '#8a7a6a');
  }
  // logo: letters drop in one every 4f with a bounce
  const name = GAME_TITLE.name;
  const scale = 4, lw = 6 * scale;
  const x0 = W / 2 - (name.length * lw - scale) / 2;
  const punch = t >= 60;
  const sh = t >= 60 && t < 72 ? (t % 2 ? 2 : -2) : 0;
  for (let i = 0; i < name.length; i++) {
    const lt = t - i * 4;
    if (lt < 0) continue;
    let y = 40;
    if (lt < 14) y = 40 - (1 - lt / 14) * (1 - lt / 14) * 70;
    else if (lt < 20) y = 40 - Math.sin((lt - 14) / 6 * Math.PI) * 4;
    const x = x0 + i * lw + sh;
    drawTextRaw(ctx, name[i], x + 2, y + 2, '#1a0f0a', scale);
    drawTextRaw(ctx, name[i], x + 1, y + 1, '#c2553a', scale);
    drawTextRaw(ctx, name[i], x, y, '#ffd27a', scale);
    // rust drips
    Px.use(ctx);
    if ((i * 7) % 3 === 0) Px.rect(x + 6 + (i % 3) * 4, y + 28, 1, 3 + ((f >> 4) + i) % 4, '#8a4b2a');
  }
  // the gauntlet punches up into the logo
  if (t >= 48) {
    const k = clamp((t - 48) / 12, 0, 1);
    const gy = lerp(H + 10, 76, easeOut(k));
    drawBigFist(ctx, W / 2 + sh, gy);
  }
  // subtitle types in
  if (t > 64) {
    const n = Math.min(GAME_TITLE.sub.length, Math.floor((t - 64) / 2));
    drawText(ctx, GAME_TITLE.sub.slice(0, n), W / 2, 76, UI.ink, 1, 'center');
  }
  if (punch) {
    // menu
    const items = ['START', 'DIFFICULTY  < ' + g.diff.name + ' >', 'SOUND  ' + (Sound.muted ? 'OFF' : 'ON'), 'SCREEN SHAKE  ' + (FX.reducedShake ? 'LOW' : 'FULL')];
    items.forEach((s, i) => {
      const sel = g.menuSel === i;
      const blink = i === 0 && sel && (f % 32) >= 20;
      if (!blink) drawText(ctx, s, W / 2, 132 + i * 12, sel ? '#ffffff' : UI.dim, 1, 'center');
      if (sel) { Px.use(ctx); drawMiniFist(ctx, W / 2 - textWidth(s) / 2 - 12, 135 + i * 12); }
    });
    drawText(ctx, 'HI-SCORE ' + String(g.hiscore).padStart(7, '0'), W / 2, 6, UI.gold, 1, 'center');
    drawText(ctx, Input.lastDevice === 'touch' ? 'D-PAD MOVE  HIT  JUMP  SPEC' : 'J ATTACK  K JUMP  L SPECIAL  ENTER PAUSE', W / 2, H - 12, UI.dim, 1, 'center');
  }
  ctx.save(); ctx.translate(FX.shakeX, FX.shakeY);
  FX.draw(ctx, 0);
  ctx.restore();
}
function drawBigFist(ctx, x, y) {
  Px.use(ctx);
  const P = HERO_PAL;
  Px.rect(x - 12, y + 18, 24, 60, P.steel);
  Px.rect(x - 12, y + 18, 4, 60, P.steelHi);
  Px.rect(x + 8, y + 18, 4, 60, P.steelDk);
  for (let i = 0; i < 3; i++) Px.rect(x - 2 + (i - 1) * 6, y + 30, 2, 8, Game.rage >= 0 ? '#ff9a2e' : '#1a1a1a');
  Px.rect(x - 4, y + 44, 6, 5, P.rust);
  Px.rect(x - 16, y - 4, 32, 24, P.fist);
  Px.rect(x - 16, y - 4, 32, 3, P.steelHi);
  for (let i = 0; i < 4; i++) Px.rect(x - 14 + i * 8, y + 2, 6, 1, P.steelDk);
  for (let i = 0; i < 3; i++) Px.disc(x - 10 + i * 10, y + 12, 1.5, P.steelHi);
}
function drawMiniFist(ctx, x, y) {
  Px.rect(x, y - 3, 7, 6, HERO_PAL.fist);
  Px.rect(x - 4, y - 2, 4, 4, HERO_PAL.steel);
  Px.dot(x + 5, y - 2, HERO_PAL.steelHi);
}
// Shared dusk sky (title + stage 1): gradient, banded sun, skyline.
function drawDuskSky(ctx, scroll) {
  Px.use(ctx);
  const stops = ['#2b1b3d', '#5a2a48', '#8a3a4a', '#c45a4e', '#f2a65a'];
  const bands = 18;
  for (let i = 0; i < bands; i++) {
    const k = i / (bands - 1) * (stops.length - 1);
    Px.rect(0, Math.floor(i * 120 / bands), W, Math.ceil(120 / bands) + 1, stops[Math.min(stops.length - 1, Math.round(k))]);
  }
  Px.rect(0, 120, W, H - 120, '#2a1a22');
  // sun with retro cut bands
  const sx = 280 - scroll * 0.02 % 40, sy = 96;
  Px.disc(sx, sy, 28, '#ffd27a');
  Px.disc(sx, sy, 24, '#ffe3a0');
  [6, 13, 19].forEach((d, i) => Px.rect(sx - 30, sy + d, 60, 2 + i, '#c45a4e'));
  // far skyline
  for (let i = 0; i < 16; i++) {
    const bw = 18 + (i * 37) % 30, bh = 26 + (i * 53) % 50;
    const bx = ((i * 41 - scroll * 0.12) % (W + 60) + W + 60) % (W + 60) - 30;
    Px.rect(bx, 122 - bh, bw, bh, '#3a2440');
    Px.poly([bx, 122 - bh, bx + bw * 0.3, 122 - bh - 6, bx + bw * 0.6, 122 - bh - 2, bx + bw, 122 - bh - 8, bx + bw, 122 - bh], '#3a2440');
    for (let wy = 122 - bh + 6; wy < 118; wy += 7) for (let wx = bx + 3; wx < bx + bw - 3; wx += 6) if (((wx * 7 + wy * 13 + i) % 11) === 0) Px.rect(wx, wy, 1, 2, '#ffb347');
  }
}

// ---------- story ----------
function drawStoryScreen(ctx, page, chars, g) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (!page) return;
  // illustration panel
  ctx.save();
  ctx.beginPath(); ctx.rect(92, 16, 200, 96); ctx.clip();
  if (page.art) page.art(ctx, 92, 16, g.t, g.frame);
  ctx.restore();
  Px.use(ctx);
  Px.rect(91, 15, 202, 1, '#ffb030'); Px.rect(91, 112, 202, 1, '#ffb030'); Px.rect(91, 15, 1, 98, '#ffb030'); Px.rect(292, 15, 1, 98, '#ffb030');
  // text box
  Px.rect(20, 126, 344, 1, '#ffb030'); Px.rect(20, 192, 344, 1, '#ffb030'); Px.rect(20, 126, 1, 67, '#ffb030'); Px.rect(363, 126, 1, 67, '#ffb030');
  const text = page.text.slice(0, Math.floor(chars));
  const lines = wrapText(text, 54);
  lines.forEach((ln, i) => drawText(ctx, ln, 28, 133 + i * 11, UI.ink));
  if (chars >= page.text.length && (g.frame >> 4) % 2) Px.poly([350, 182, 358, 182, 354, 187], UI.gold);
  drawText(ctx, 'ENTER: SKIP', W - 6, H - 10, '#5a4a3a', 1, 'right');
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

// ---------- game over ----------
function drawGameOver(ctx, g) {
  ctx.fillStyle = '#0e0a08'; ctx.fillRect(0, 0, W, H);
  const word = 'GAME OVER';
  const t = g.t;
  for (let i = 0; i < word.length; i++) {
    const lt = t - i * 5;
    if (lt < 0) continue;
    const y = lt < 16 ? lerp(-30, 70, easeOut(lt / 16)) : 70;
    const crack = t > 80 ? Math.min(3, (t - 80) / 8) * ((i % 2) ? 1 : -1) : 0;
    drawText(ctx, word[i], W / 2 - (word.length * 24) / 2 + i * 24 + 2, y + crack, '#e83b3b', 4);
  }
  if (t > 60) {
    drawText(ctx, 'SCORE ' + String(g.score).padStart(7, '0'), W / 2, 130, UI.ink, 1, 'center');
    drawText(ctx, 'HI ' + String(g.hiscore).padStart(7, '0'), W / 2, 144, UI.gold, 1, 'center');
    drawText(ctx, 'THE WASTES KEEP ANOTHER.', W / 2, 170, UI.dim, 1, 'center');
  }
}

// ---------- results ----------
function drawResults(ctx, g) {
  ctx.fillStyle = '#0e0a08'; ctx.fillRect(0, 0, W, H);
  drawText(ctx, 'WASTELAND RECORD', W / 2, 18, UI.gold, 2, 'center');
  const p = g.player || { bestCombo: 0, damageTaken: 0 };
  const mins = Math.floor(g.stats.time / 3600), secs = Math.floor(g.stats.time / 60) % 60;
  const rows = [
    ['TIME', mins + ':' + String(secs).padStart(2, '0')],
    ['MAX COMBO', String(p.bestCombo)],
    ['KOS', String(g.stats.kills)],
    ['DAMAGE TAKEN', String(Math.round(p.damageTaken))],
    ['SCORE', String(g.score).padStart(7, '0')],
  ];
  rows.forEach((r, i) => {
    if (g.t < 20 + i * 20) return;
    drawText(ctx, r[0], 80, 56 + i * 16, UI.dim);
    drawText(ctx, r[1], 300, 56 + i * 16, UI.ink, 1, 'right');
  });
  if (g.t >= 130) {
    const rank = g.score >= 120000 ? 'S' : g.score >= 90000 ? 'A' : g.score >= 60000 ? 'B' : 'C';
    const k = clamp((g.t - 130) / 8, 0, 1);
    drawText(ctx, 'RANK', 330, 60, UI.dim, 1, 'center');
    drawText(ctx, rank, 330, 76, rank === 'S' ? UI.gold : UI.ink, Math.round(lerp(9, 5, k)), 'center');
  }
  if (g.t > 200) drawText(ctx, 'THANKS FOR PLAYING', W / 2, 172, UI.ink, 1, 'center');
  if (g.t > 200 && (g.frame >> 4) % 2) drawText(ctx, 'PRESS ATTACK', W / 2, 188, UI.dim, 1, 'center');
}
