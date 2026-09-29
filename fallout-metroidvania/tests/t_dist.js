// Smoke-test the single-file build (dist/fallout-cinder-deep.html) from file://: boot to the title, start a new game with real key events, play a few seconds.
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const path = require('path');
(async () => {
  const file = path.resolve(__dirname, '..', 'dist', 'fallout-cinder-deep.html');
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const logs = []; page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/willReadFrequently/.test(t)) logs.push(t); }); page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
  const t0 = Date.now(); await page.goto('file://' + file);
  await page.waitForFunction(() => window.__G && window.__G.state, null, { timeout: 90000 });
  await page.waitForFunction(() => window.__G.state === 'title', null, { timeout: 90000 });
  const boot = Date.now() - t0;
  const st1 = await page.evaluate(() => window.__G.state);
  await page.keyboard.press('Enter');                                                     // a fresh profile has no save: NEW GAME is the first item
  await page.waitForTimeout(600);
  const st2 = await page.evaluate(() => window.__G.state);
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }
  await page.waitForFunction(() => window.__G.state === 'play', null, { timeout: 60000 }).catch(() => {});
  const s3 = await page.evaluate(() => ({ state: window.__G.state, room: window.__G.room && window.__G.room.id, x: window.__G.player ? Math.round(window.__G.player.x) : null }));
  await page.waitForFunction(() => !window.__G.controlsLocked(), null, { timeout: 60000 }).catch(() => {});
  const s3b = await page.evaluate(() => ({ locked: window.__G.controlsLocked() }));
  await page.keyboard.down('KeyD'); await page.waitForTimeout(1500); await page.keyboard.up('KeyD');
  await page.keyboard.press('Space'); await page.waitForTimeout(800);
  const s4 = await page.evaluate(() => ({ state: window.__G.state, room: window.__G.room && window.__G.room.id, x: window.__G.player ? Math.round(window.__G.player.x) : null, fps: window.__G.fps }));
  const bytes = require('fs').statSync(file).size;
  console.log(JSON.stringify({ bytes, bootMs: boot, titleState: st1, afterMenu: st2, inGame: s3, afterWalk: s4, errors: logs.slice(0, 5) }));
  await browser.close();
  process.exit(logs.length || s4.x <= s3.x ? 1 : 0);
})();
