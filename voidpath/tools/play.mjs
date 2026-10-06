#!/usr/bin/env node
// Headless scenario runner + screenshot tool for VOIDPATH (Playwright + Chromium/SwiftShader).
//
// Usage
//   node tools/play.mjs <page> [options]
//     <page>              dist/index.html, dist/tools/preview-art.html, ... (file path or URL)
//     --steps <file>      JSON array of steps (see below)
//     --steps-json '<json>'   inline JSON array of steps
//     --out <dir>         screenshot/report directory (default: shots/<page-name>)
//     --size 1280x720     viewport (default 1280x720)
//     --mobile            emulate a touch phone (390x844, hasTouch, isMobile, DPR 2)
//     --dpr <n>           device scale factor (default 1)
//     --timeout <ms>      overall timeout (default 120000)
//     --strict            exit 1 if any page error or console.error occurred
//     --full-page         full-page screenshots (useful for long art preview pages)
//
// With no steps it waits 2500 ms and takes one screenshot named "page".
//
// Steps (executed in order)
//   {"wait": 500}                         sleep ms
//   {"key": "Enter"}                      press a key (Playwright key names: ArrowUp, KeyW, Enter, Escape, Space, KeyE ...)
//   {"key": "Enter", "times": 3, "gap": 250}
//   {"down": "ArrowRight"} / {"up": "ArrowRight"}
//   {"hold": "ArrowRight", "ms": 800}     key down, wait, key up
//   {"type": "abc"}                       type text
//   {"shot": "name"}                      screenshot -> <out>/<name>.png
//   {"shot": "name", "clip": [x,y,w,h]}   clipped screenshot
//   {"eval": "window.__VP.debug.startBattle('drone_pair')"}   run JS in page (awaits promises)
//   {"log": "JSON.stringify(window.__VP.state.party.map(p=>p.hp))"}  run JS and print the result
//   {"waitFor": "window.__VP && window.__VP.ready", "timeout": 15000}
//   {"click": "#selector"} / {"tap": [x, y]} / {"mouse": [x, y]}
//   {"fps": 2000}                         measure requestAnimationFrame rate for N ms and print it
//
// The pinned three.js CDN URL is served from node_modules, so runs work offline.
// Output: screenshots + report.json (console messages, page errors, logs, fps).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try { return req('playwright'); } catch {}
  for (const p of ['/opt/node22/lib/node_modules/', '/usr/local/lib/node_modules/', '/usr/lib/node_modules/']) {
    try { return createRequire(p)('playwright'); } catch {}
  }
  throw new Error('playwright not found (expected a global install)');
}

const args = process.argv.slice(2);
if (!args.length || args[0] === '--help') {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 40).join('\n'));
  process.exit(0);
}
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const flag = (name) => args.includes(name);

const pageArg = args[0];
const pageUrl = /^https?:|^file:/.test(pageArg) ? pageArg : pathToFileURL(path.resolve(process.cwd(), pageArg)).href;
const pageName = path.basename(pageArg).replace(/\.html?$/, '');
const outDir = path.resolve(process.cwd(), opt('--out', path.join(ROOT, 'shots', pageName)));
fs.mkdirSync(outDir, { recursive: true });

let steps = [{ wait: 2500 }, { shot: 'page' }];
if (opt('--steps')) steps = JSON.parse(fs.readFileSync(opt('--steps'), 'utf8'));
if (opt('--steps-json')) steps = JSON.parse(opt('--steps-json'));

const [vw, vh] = (opt('--size', '1280x720')).split('x').map(Number);
const mobile = flag('--mobile');
const timeoutMs = Number(opt('--timeout', 120000));
const fullPage = flag('--full-page');

const { chromium } = loadPlaywright();
const threeLocal = path.join(ROOT, 'node_modules/three/build/three.module.min.js');

const report = { page: pageUrl, console: [], errors: [], logs: [], shots: [], fps: [] };
const killer = setTimeout(() => {
  console.error(`TIMEOUT after ${timeoutMs} ms`);
  report.errors.push(`runner timeout after ${timeoutMs} ms`);
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  process.exit(2);
}, timeoutMs);

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext(mobile
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: Number(opt('--dpr', 2)), isMobile: true, hasTouch: true }
  : { viewport: { width: vw, height: vh }, deviceScaleFactor: Number(opt('--dpr', 1)) });

await context.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/build\/three\.module(\.min)?\.js/, (route) =>
  route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(threeLocal) }));
// Google Fonts may be unreachable offline; let them fail quietly.
await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

const page = await context.newPage();
page.on('console', (m) => {
  const entry = { type: m.type(), text: m.text() };
  if (/Failed to load resource/.test(entry.text) && /fonts|ERR_FAILED/.test(entry.text)) return;
  report.console.push(entry);
  if (m.type() === 'error' || m.type() === 'warning') console.log(`[console.${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => {
  report.errors.push(String(e && e.stack || e));
  console.log(`[pageerror] ${e && e.stack || e}`);
});

await page.goto(pageUrl, { waitUntil: 'load' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [i, s] of steps.entries()) {
  try {
    if ('wait' in s) await sleep(s.wait);
    else if ('key' in s) {
      for (let n = 0; n < (s.times || 1); n++) { await page.keyboard.press(s.key, { delay: s.delay ?? 60 }); if (s.gap) await sleep(s.gap); }
    } else if ('down' in s) await page.keyboard.down(s.down);
    else if ('up' in s) await page.keyboard.up(s.up);
    else if ('hold' in s) { await page.keyboard.down(s.hold); await sleep(s.ms || 500); await page.keyboard.up(s.hold); }
    else if ('type' in s) await page.keyboard.type(s.type, { delay: 40 });
    else if ('shot' in s) {
      const file = path.join(outDir, `${s.shot}.png`);
      const o = { path: file, fullPage };
      if (s.clip) o.clip = { x: s.clip[0], y: s.clip[1], width: s.clip[2], height: s.clip[3] };
      await page.screenshot(o);
      report.shots.push(file);
      console.log(`shot ${file}`);
    } else if ('eval' in s) {
      await page.evaluate(`(async () => { return (${s.eval}); })()`);
    } else if ('log' in s) {
      const v = await page.evaluate(`(async () => { return (${s.log}); })()`);
      report.logs.push({ expr: s.log, value: v });
      console.log(`log ${s.log} => ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    } else if ('waitFor' in s) {
      await page.waitForFunction(s.waitFor, null, { timeout: s.timeout || 15000, polling: 100 });
    } else if ('click' in s) await page.click(s.click);
    else if ('tap' in s) await page.touchscreen.tap(s.tap[0], s.tap[1]);
    else if ('mouse' in s) await page.mouse.click(s.mouse[0], s.mouse[1]);
    else if ('fps' in s) {
      const fps = await page.evaluate((ms) => new Promise((res) => {
        let n = 0; const t0 = performance.now();
        const tick = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res(n * 1000 / (performance.now() - t0)); };
        requestAnimationFrame(tick);
      }), s.fps);
      report.fps.push(fps);
      console.log(`fps ${fps.toFixed(1)} (headless SwiftShader: software rendering, far slower than a real GPU)`);
    } else console.log(`unknown step #${i}: ${JSON.stringify(s)}`);
  } catch (e) {
    const msg = `step #${i} ${JSON.stringify(s)} failed: ${e.message}`;
    report.errors.push(msg);
    console.log(msg);
  }
}

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
const consoleErrors = report.console.filter((c) => c.type === 'error').length;
console.log(`done: ${report.shots.length} shots, ${report.errors.length} page errors, ${consoleErrors} console errors -> ${outDir}`);
clearTimeout(killer);
await browser.close();
if (flag('--strict') && (report.errors.length || consoleErrors)) process.exit(1);
