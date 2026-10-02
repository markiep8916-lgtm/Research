// Draws annotated top-down pictures of rooms (tiles, coordinate rulers, reachable cells, items) with Playwright.
import { chromium } from './pw.mjs';
import { mkdirSync } from 'node:fs';

const DRAW = `(data) => {
  const { w, h, tiles, marks, portals, states, missing, title, scale } = data;
  const S = scale, PAD = 26;
  const c = document.createElement('canvas'); c.width = w * S + PAD * 2; c.height = h * S + PAD * 2 + 22; document.body.appendChild(c);
  const g = c.getContext('2d'); g.fillStyle = '#12161c'; g.fillRect(0, 0, c.width, c.height);
  const X = (x) => PAD + x * S, Y = (y) => PAD + 22 + (h - 1 - y) * S;
  g.fillStyle = '#fff'; g.font = '700 14px sans-serif'; g.fillText(title, 8, 17);
  g.fillStyle = '#0c0f13'; g.fillRect(X(0), Y(h - 1), w * S, h * S);
  const col = { 1: '#6b5a48', 2: '#4fd0e0', 3: '#e03a3a', 4: '#e03a3a', 5: '#b07a3a', 6: '#4fd0e0', 7: '#3fae3a', 8: '#e8962e', 9: '#8a93b0', 10: '#ff5a1a', 11: '#2f89b8', 12: '#35e6ff', 13: '#ff5ad8', 14: '#b6ff3a', 15: '#c8a86a' };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = tiles[y * w + x]; if (!t) continue;
    const px = X(x), py = Y(y);
    g.fillStyle = col[t] || '#f0f';
    if (t === 2) g.fillRect(px, py, S, Math.max(2, S * 0.3));
    else if (t === 5 || t === 6) { g.fillRect(px + S * 0.2, py, 2, S); g.fillRect(px + S * 0.75, py, 2, S); if (t === 6) { g.fillStyle = '#4fd0e0'; g.fillRect(px, py, S, 3); } }
    else if (t === 7) g.fillRect(px + S * 0.45, py, 3, S);
    else if (t === 3) { g.beginPath(); g.moveTo(px, py + S); g.lineTo(px + S / 2, py + S * 0.3); g.lineTo(px + S, py + S); g.fill(); }
    else if (t === 4) { g.beginPath(); g.moveTo(px, py); g.lineTo(px + S / 2, py + S * 0.7); g.lineTo(px + S, py); g.fill(); }
    else g.fillRect(px, py, S, S);
    if (t === 9) { g.fillStyle = '#fff'; g.font = '700 ' + (S * 0.7) + 'px sans-serif'; g.fillText('P', px + S * 0.25, py + S * 0.8); }
    if (t === 8) { g.strokeStyle = '#7a4a10'; g.strokeRect(px + 1, py + 1, S - 2, S - 2); }
  }
  // reachable cells
  for (const s of states) {
    g.fillStyle = s.mode === 'climb' ? 'rgba(0,255,255,.8)' : s.mode === 'ball' ? 'rgba(255,170,0,.9)' : s.mode === 'wall' ? 'rgba(200,120,255,.9)' : 'rgba(80,255,120,.55)';
    g.beginPath(); g.arc(X(s.x), Y(s.y) + S * 0.5, Math.max(2, S * 0.18), 0, 7); g.fill();
  }
  // portals
  for (const [ch, p] of Object.entries(portals)) for (const cc of p.cells) { g.fillStyle = 'rgba(255,230,60,.35)'; g.fillRect(X(cc.x), Y(cc.y), S, S); g.fillStyle = '#ffe23c'; g.font = '700 ' + S * 0.8 + 'px sans-serif'; g.fillText(ch, X(cc.x) + S * 0.2, Y(cc.y) + S * 0.85); }
  const letters = { banana: ['o', '#ffd23a'], heart: ['h', '#ff5a8a'], relic: ['Q', '#ffffff'], save: ['S', '#ffe14a'], sign: ['?', '#d9c27a'], start: ['@', '#fff'], boss: ['B', '#ff4a4a'], goal: ['K', '#ffd23a'], snapjaw: ['s', '#7fff7f'], thornbug: ['t', '#ff7fbf'], bat: ['a', '#bf8fff'], tiki: ['u', '#ffa04a'], tikiR: ['U', '#ffa04a'], magma: ['m', '#ff7a2a'], spider: ['p', '#c0c0ff'], wisp: ['f', '#ffb04a'], cannon: ['n', '#ffffff'], cannonR: ['N', '#ffffff'], switchA: ['w', '#35e6ff'], switchB: ['x', '#ff5ad8'] };
  marks.forEach((m, i) => {
    const l = letters[m.kind]; if (!l) return;
    const miss = missing.includes(i);
    const px = X(m.x) + S / 2, py = Y(m.y) + S / 2;
    if (m.kind === 'banana') { g.fillStyle = miss ? '#ff4040' : l[1]; g.beginPath(); g.arc(px, py, S * 0.28, 0, 7); g.fill(); return; }
    g.fillStyle = miss ? '#ff2a2a' : '#00000099'; g.beginPath(); g.arc(px, py, S * 0.5, 0, 7); g.fill();
    g.fillStyle = miss ? '#fff' : l[1]; g.font = '700 ' + S * 0.8 + 'px sans-serif'; g.textAlign = 'center'; g.fillText(l[0], px, py + S * 0.28); g.textAlign = 'left';
  });
  // rulers
  g.fillStyle = '#9fb0c0'; g.font = '10px sans-serif';
  for (let x = 0; x < w; x += 5) { g.fillText(String(x), X(x) - 3, PAD + 18); g.fillRect(X(x), PAD + 20, 1, 4); }
  for (let y = 0; y < h; y += 5) { g.fillText(String(y), 2, Y(y) + S * 0.7); g.fillRect(PAD - 4, Y(y), 4, 1); }
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
  for (let x = 0; x <= w; x += 5) { g.beginPath(); g.moveTo(X(x), Y(h - 1)); g.lineTo(X(x), Y(0) + S); g.stroke(); }
  for (let y = 0; y <= h; y += 5) { g.beginPath(); g.moveTo(X(0), Y(h - 1) + y * S); g.lineTo(X(w), Y(h - 1) + y * S); g.stroke(); }
  return { cw: c.width, ch: c.height };
}`;

export async function renderRooms(items, outDir) {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1800, height: 1200 } });
  await page.setContent('<body style="margin:0;background:#000"></body>');
  const paths = [];
  for (const it of items) {
    const scale = Math.max(8, Math.min(18, Math.floor(1700 / it.w)));
    const r = await page.evaluate(`(${DRAW})(${JSON.stringify({ ...it, scale })})`);
    await page.setViewportSize({ width: r.cw, height: r.ch });
    const el = await page.$('canvas');
    const path = `${outDir}/${it.file}.png`;
    await el.screenshot({ path });
    await page.evaluate(() => document.querySelector('canvas').remove());
    paths.push(path);
  }
  await browser.close();
  return paths;
}
