#!/usr/bin/env node
// Headless scenario runner + screenshot tool for VOIDPATH (Playwright + Chromium/SwiftShader).
//
// Usage
//   node tools/play.mjs <page> [options]
//     <page>              dist/index.html, dist/tools/preview-art.html, ... (file path or URL;
//                         a ?query or #hash on a file path is kept, e.g. preview-world.html?q=low)
//     --steps <file>      JSON array of steps (see below)
//     --steps-json '<json>'   inline JSON array of steps
//     --out <dir>         screenshot/report directory (default: shots/<page-name>)
//     --size 1280x720     viewport (default 1280x720)
//     --mobile            emulate a touch phone (390x844, hasTouch, isMobile, DPR 2)
//     --dpr <n>           device scale factor (default 1)
//     --reduced-motion    emulate prefers-reduced-motion: reduce
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
//   {"tapOn": ".selector", "nth": 0}      touch-tap the nth element matching a selector (needs --mobile)
//   {"fps": 2000}                         measure requestAnimationFrame rate for N ms and print it
//   {"note": "text"}                      print a comment (scenario readability)
//   {"until": "<expr>", "do": [steps], "max": 100}   repeat the sub-steps until the expression is true
//   {"if": "<expr>", "then": [steps], "else": [steps]}   branch on a page expression
//
// A failing step inside until / if aborts that whole top-level step (reported as page errors).
//
// The pinned three.js CDN URL is served from node_modules, so runs work offline.
// Output: screenshots + report.json (console messages, page errors, logs, fps).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, pageUrlOf, launchBrowser, openPage } from './browser.mjs';

const args = process.argv.slice(2);
if (!args.length || args[0] === '--help') {
  const src = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
  console.log(src.slice(1, src.findIndex((l) => l.startsWith('import'))).join('\n'));
  process.exit(0);
}
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const flag = (name) => args.includes(name);

const pageArg = args[0];
const pageUrl = pageUrlOf(pageArg);
const pageName = path.basename(pageArg.replace(/[?#].*$/, '')).replace(/\.html?$/, '');
const outDir = path.resolve(process.cwd(), opt('--out', path.join(ROOT, 'shots', pageName)));
fs.mkdirSync(outDir, { recursive: true });

let steps = [{ wait: 2500 }, { shot: 'page' }];
if (opt('--steps')) steps = JSON.parse(fs.readFileSync(opt('--steps'), 'utf8'));
if (opt('--steps-json')) steps = JSON.parse(opt('--steps-json'));

const size = (opt('--size', '1280x720')).split('x').map(Number);
const mobile = flag('--mobile');
const timeoutMs = Number(opt('--timeout', 120000));
const fullPage = flag('--full-page');

const report = { page: pageUrl, console: [], errors: [], logs: [], shots: [], fps: [] };
const killer = setTimeout(() => {
  console.error(`TIMEOUT after ${timeoutMs} ms`);
  report.errors.push(`runner timeout after ${timeoutMs} ms`);
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  process.exit(2);
}, timeoutMs);

const browser = await launchBrowser();
const dpr = opt('--dpr') != null ? Number(opt('--dpr')) : undefined;
const { page, report: pageReport } = await openPage(browser, pageUrl, {
  mobile, size, dpr, reducedMotion: flag('--reduced-motion'),
  onConsole: (entry) => {
    if (entry.type === 'error' || entry.type === 'warning') console.log(`[console.${entry.type}] ${entry.text}`);
  },
  onError: (msg) => console.log(`[pageerror] ${msg}`),
});
report.console = pageReport.console;
report.errors = pageReport.errors;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const truthy = async (expr) => !!(await page.evaluate(`(async () => { return (${expr}); })()`));

/** Run one step; `until` / `if` recurse into their sub-steps. Throws on failure. */
async function step(s, id) {
  if ('note' in s) console.log(`-- ${s.note}`);
  else if ('wait' in s) await sleep(s.wait);
  else if ('key' in s) {
    for (let n = 0; n < (s.times || 1); n++) { await page.keyboard.press(s.key, { delay: s.delay ?? 60 }); if (s.gap) await sleep(s.gap); }
  } else if ('down' in s) await page.keyboard.down(s.down);
  else if ('up' in s) await page.keyboard.up(s.up);
  else if ('hold' in s) { await page.keyboard.down(s.hold); await sleep(s.ms || 500); await page.keyboard.up(s.hold); }
  else if ('type' in s) await page.keyboard.type(s.type, { delay: 40 });
  else if ('shot' in s) {
    const file = path.join(outDir, `${s.shot}.png`);
    const o = { path: file, fullPage, timeout: 120000 }; // SwiftShader under load can take a while
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
  } else if ('until' in s) {
    const max = s.max || 100;
    let n = 0;
    while (!(await truthy(s.until))) {
      if (n++ >= max) throw new Error(`still false after ${max} rounds`);
      await runSteps(s.do || [], `${id}.`, true);
    }
  } else if ('if' in s) {
    await runSteps((await truthy(s.if)) ? s.then || [] : s.else || [], `${id}.`, true);
  } else if ('click' in s) await page.click(s.click);
  else if ('tap' in s) await page.touchscreen.tap(s.tap[0], s.tap[1]);
  else if ('tapOn' in s) await page.locator(s.tapOn).nth(s.nth || 0).tap({ timeout: s.timeout || 15000 });
  else if ('mouse' in s) await page.mouse.click(s.mouse[0], s.mouse[1]);
  else if ('fps' in s) {
    const fps = await page.evaluate((ms) => new Promise((res) => {
      let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(tick); else res(n * 1000 / (performance.now() - t0)); };
      requestAnimationFrame(tick);
    }), s.fps);
    report.fps.push(fps);
    console.log(`fps ${fps.toFixed(1)} (headless SwiftShader: software rendering, far slower than a real GPU)`);
  } else console.log(`unknown step #${id}: ${JSON.stringify(s)}`);
}

/** Runs a list of steps. Top level: a failed step is reported and the run goes on; nested: it propagates. */
async function runSteps(list, prefix = '', nested = false) {
  for (const [i, s] of list.entries()) {
    const id = `${prefix}${i}`;
    try {
      await step(s, id);
    } catch (e) {
      if (nested) throw e;
      const msg = `step #${id} ${JSON.stringify(s).slice(0, 300)} failed: ${e.message}`;
      report.errors.push(msg);
      console.log(msg);
    }
  }
}

await runSteps(steps);

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
const consoleErrors = report.console.filter((c) => c.type === 'error').length;
console.log(`done: ${report.shots.length} shots, ${report.errors.length} page errors, ${consoleErrors} console errors -> ${outDir}`);
clearTimeout(killer);
await browser.close();
if (flag('--strict') && (report.errors.length || consoleErrors)) process.exit(1);
