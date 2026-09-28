#!/usr/bin/env node
// Dev helper: open a page in headless Chromium, wait, optionally run JS, save a screenshot and print console output.
// usage: node tools/shot.js <url|path> <out.png> [--w 1280] [--h 720] [--wait ms] [--eval "js"] [--evalfile file.js] [--full] [--clip x,y,w,h]
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const args = process.argv.slice(2);
const url = args[0], out = args[1];
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
(async () => {
  const w = +opt('w', 1280), h = +opt('h', 720), wait = +opt('wait', 800);
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const logs = [];
  page.on('console', (m) => logs.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message + '\n' + (e.stack || '')));
  const target = /^https?:|^file:/.test(url) ? url : 'file://' + path.resolve(url);
  await page.goto(target);
  await page.waitForTimeout(wait);
  let evalOut;
  const ev = opt('eval', null), evf = opt('evalfile', null);
  if (ev || evf) {
    const code = ev || require('fs').readFileSync(evf, 'utf8');
    evalOut = await page.evaluate(`(async()=>{${code}})()`);
    await page.waitForTimeout(+opt('wait2', 300));
  }
  if (evalOut !== undefined) console.log('EVAL:', typeof evalOut === 'string' ? evalOut : JSON.stringify(evalOut));
  if (opt('clip', null)) { const [x, y, cw, ch] = opt('clip').split(',').map(Number); await page.screenshot({ path: out, clip: { x, y, width: cw, height: ch } }); }
  else await page.screenshot({ path: out, fullPage: args.includes('--full') });
  console.log(logs.slice(0, 40).join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
