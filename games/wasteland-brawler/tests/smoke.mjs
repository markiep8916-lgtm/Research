// Smoke playtest: boots the game in headless Chromium, plays a little, captures screenshots and
// any page errors. Usage: node tests/smoke.mjs [--out dir] [--html path]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv } from './lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const o = argv();
const out = resolve(o.out || join(root, 'tests', 'out'));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
// fonts are cosmetic; skip the network so tests run offline
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '')));
page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource/.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
await page.goto('file://' + resolve(o.html || join(root, 'wasteland-brawler.html')));
await page.waitForTimeout(400);
const shot = async name => page.screenshot({ path: join(out, name + '.png') });
const state = () => page.evaluate(() => {
  const G = window.__wb.Game;
  return { state: G.state, stage: G.stageIndex, camX: Math.round(G.cam.x), hp: G.player && Math.round(G.player.hp), px: G.player && Math.round(G.player.x), pstate: G.player && G.player.state, foes: G.livingFoes ? G.livingFoes().length : 0, score: G.score, wave: G.waveIdx, lives: G.lives };
});
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
const mash = async (key, n, gap = 90) => { for (let i = 0; i < n; i++) { await page.keyboard.press(key); await page.waitForTimeout(gap); } };

await page.click('#screen');
await page.waitForTimeout(300);
await shot('01-title');
await page.keyboard.press('Enter');
await page.waitForTimeout(900);
await shot('02-story');
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
await shot('03-stage-intro');
console.log('after intro', JSON.stringify(await state()));
await page.waitForTimeout(1200);
// walk right into the first fight and brawl
for (let round = 0; round < 6; round++) {
  await hold('ArrowRight', 500);
  await mash('KeyJ', 6, 110);
  if (round === 1) await shot('04-fight');
  await page.keyboard.down('ArrowUp'); await mash('KeyJ', 3, 110); await page.keyboard.up('ArrowUp');
  await page.keyboard.press('KeyK'); await page.waitForTimeout(150); await page.keyboard.press('KeyJ'); await page.waitForTimeout(500);
  await page.keyboard.down('ArrowDown'); await mash('KeyJ', 3, 110); await page.keyboard.up('ArrowDown');
  console.log('round', round, JSON.stringify(await state()));
}
await page.keyboard.press('KeyL');
await page.waitForTimeout(200);
await shot('05-special');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await shot('06-pause');
await page.keyboard.press('Enter');
console.log('final', JSON.stringify(await state()));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
