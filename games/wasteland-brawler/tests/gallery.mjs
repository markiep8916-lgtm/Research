// Render enemy types in every common state into one PNG (3x scale) for art review.
// node tests/gallery.mjs --types skid,chainer [--html path] [--out file.png] [--attacks]
import { join, resolve } from 'node:path';
import { openGame, argv, root, stubEnemies } from './lib.mjs';

const o = argv();
const outFile = resolve(o.out || join(root, 'tests', 'out', 'gallery.png'));
const g = await openGame(o.html, { width: 1600, height: 1000 });
const types = String(o.types || 'punk').split(',');
if (o.stub) console.log('stubbed:', await stubEnemies(g, String(o.stub).split(',')));
const dataUrl = await g.ev(({ types }) => {
  window.__wb.sandbox([], 0);
  const states = ['idle', 'walk', 'hurt', 'fall', 'down', 'getup', 'grabbed'];
  const rows = [];
  for (const type of types) {
    const d = ENEMY_TYPES[type];
    const row = [];
    for (const s of states) row.push({ type, state: s });
    for (const k of Object.keys(d.attacks || {})) {
      const a = d.attacks[k];
      for (const ph of ['start', 'active', 'rec']) row.push({ type, state: 'attack', atk: k, ph, a });
    }
    rows.push(row);
  }
  const cellW = 120, cellH = 110;
  const cols = Math.max(...rows.map(r => r.length));
  const cv = document.createElement('canvas'); cv.width = cols * cellW; cv.height = rows.length * cellH;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#6b5d50'; ctx.fillRect(0, 0, cv.width, cv.height);
  rows.forEach((row, r) => row.forEach((c, i) => {
    const e = new Enemy(c.type, 0, 0, {});
    e.anim = 10;
    if (c.state === 'attack') {
      e.atk = Object.assign({ key: c.atk }, c.a); e.state = 'attack';
      e.t = c.ph === 'start' ? Math.max(0, c.a.start - 3) : c.ph === 'active' ? c.a.start + 1 : c.a.start + c.a.active + 2;
    } else { e.state = c.state; e.t = c.state === 'getup' ? 6 : 8; }
    if (c.state === 'fall') e.vz = 1;
    const x = i * cellW + cellW / 2, y = r * cellH + cellH - 22;
    e.x = x; e.y = y;
    if (c.state === 'fall') e.z = 12;
    try { e.draw(ctx, 0); } catch (err) { ctx.fillStyle = '#f00'; ctx.fillRect(x - 10, y - 10, 20, 20); console.error(c.type, c.state, err.message); }
    drawText(ctx, (c.state === 'attack' ? c.atk + ':' + c.ph : c.state), x, y + 8, '#fff', 1, 'center');
    if (i === 0) drawText(ctx, c.type, 4, r * cellH + 4, '#ffe066', 1, 'left');
  }));
  // upscale 2x
  const big = document.createElement('canvas'); big.width = cv.width * 2; big.height = cv.height * 2;
  const bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(cv, 0, 0, big.width, big.height);
  return big.toDataURL('image/png');
}, { types });
const { writeFileSync } = await import('node:fs');
writeFileSync(outFile, Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log('wrote', outFile);
console.log(g.errors.length ? 'ERRORS:\n' + g.errors.join('\n') : 'no page errors');
await g.close();
