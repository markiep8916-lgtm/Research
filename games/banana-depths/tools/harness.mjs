// Headless playtest harness. Usage:  const g = await openGame({ w: 1280, h: 720 });
import { chromium } from './pw.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const GL_ARGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'];

export async function openGame({ w = 1280, h = 720, query = '?manual&lowq', file = 'dist/index.html', touch = false } = {}) {
  const browser = await chromium.launch({ args: GL_ARGS });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch });
  await ctx.route(/^https?:/, (r) => r.abort());      // fonts etc. fail fast: tests never wait on the network
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`));
  await page.goto(pathToFileURL(resolve(root, file)).href + query);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const api = {
    browser, page, logs,
    run: (segs) => page.evaluate((s) => window.__bd.run(s.map((x) => ({ ...x, until: x.untilExpr ? new Function('g', 'return ' + x.untilExpr) : undefined }))), segs),
    step: (n) => page.evaluate((k) => { window.__bd.game.stepFrames(k); return window.__bd.game.snapshot(); }, n),
    snap: () => page.evaluate(() => window.__bd.game.snapshot()),
    eval: (fn, arg) => page.evaluate(fn, arg),
    shot: (name) => page.screenshot({ path: resolve(root, '.cache', name) }),
    close: () => browser.close(),
    errors: () => logs.filter((l) => l.startsWith('[pageerror]') || l.startsWith('[error]')),
  };
  return api;
}
