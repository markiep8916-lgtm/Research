// Headless test harness: loads the game, exposes deterministic stepping with scripted input.
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const root = path.resolve(__dirname, '..');
async function open(query, opts) {
  opts = opts || {};
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: opts.w || 1280, height: opts.h || 720 } });
  const logs = []; page.on('console', (m) => { const t = m.text(); if (!/willReadFrequently|WORLD ERRORS/.test(t)) logs.push('[' + m.type() + '] ' + t); }); page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message + '\n' + (e.stack || '')));
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto('file://' + path.join(root, 'index.html') + '?' + (query || 'start=1'));
  await page.waitForFunction(() => window.__G && window.__G.state === 'play', null, { timeout: 60000 });
  // helper injected into the page
  await page.evaluate(() => {
    const G = window.__G, CD = window.__CD;
    window.T = {
      held: {},
      frame(keys, n) { for (let i = 0; i < (n || 1); i++) { const prev = Object.assign({}, CD.input.keys); for (const k in CD.input.keys) CD.input.keys[k] = false; for (const k of (keys || [])) { CD.input.keys[k] = true; if (!prev[k]) CD.input.keyEdge[k] = true; } CD.input.poll(); G.step(1 / 120); CD.input.consume(); G.step(1 / 120); } },
      press(code) { CD.input.keyEdge[code] = true; },
      state() { const p = G.player; return { x: +p.x.toFixed(1), y: +p.y.toFixed(1), vx: +p.vx.toFixed(1), vy: +p.vy.toFixed(1), g: p.onGround, hp: G.st.hp, room: G.room && G.room.id, face: p.face }; },
    };
  });
  return { browser, page, logs, async T(fnBody, arg) { return page.evaluate(fnBody, arg); } };
}
module.exports = { open };
