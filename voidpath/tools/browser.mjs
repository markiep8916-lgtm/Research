// Shared headless-browser setup for the tools (play.mjs, contact-sheet.mjs): Playwright Chromium on
// SwiftShader, the pinned three.js CDN URL served from node_modules (runs work offline), Google
// Fonts aborted quietly, and console / page-error capture.
//
//   const { context, page, report } = await openPage(browser, url, { mobile, size: [w, h], dpr, reducedMotion, onConsole, onError })
//   pageUrlOf(arg) -> file:// or http(s) URL (a ?query / #hash on a file path is kept)
//   ROOT                the voidpath folder
//   VP_LOAD_TIMEOUT     ms to wait for a page's load event (default 600000: on a loaded machine the
//                       2 MB single-file page takes minutes to parse, past Playwright's 30 s default)

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_LOCAL = path.join(ROOT, 'node_modules/three/build/three.module.min.js');
const LOAD_TIMEOUT = Number(process.env.VP_LOAD_TIMEOUT) || 600000;

export function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try { return req('playwright'); } catch { /* not local */ }
  for (const p of ['/opt/node22/lib/node_modules/', '/usr/local/lib/node_modules/', '/usr/lib/node_modules/']) {
    try { return createRequire(p)('playwright'); } catch { /* try the next */ }
  }
  throw new Error('playwright not found (expected a global install)');
}

export function pageUrlOf(arg, cwd = process.cwd()) {
  if (/^https?:|^file:/.test(arg)) return arg;
  // keep a ?query / #hash out of pathToFileURL (it would escape them into the file name)
  const suffix = (arg.match(/[?#].*$/) || [''])[0];
  return pathToFileURL(path.resolve(cwd, arg.slice(0, arg.length - suffix.length))).href + suffix;
}

export async function launchBrowser() {
  const { chromium } = loadPlaywright();
  return chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required'],
  });
}

export async function newContext(browser, { mobile = false, size = [1280, 720], dpr, reducedMotion = false } = {}) {
  const context = await browser.newContext({
    ...(mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr ?? 2, isMobile: true, hasTouch: true }
      : { viewport: { width: size[0], height: size[1] }, deviceScaleFactor: dpr ?? 1 }),
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  await context.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/build\/three\.module(\.min)?\.js/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(THREE_LOCAL) }));
  // Google Fonts may be unreachable offline; let them fail quietly.
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  return context;
}

/** Opens `url` in a fresh context; report collects console messages and page errors. */
export async function openPage(browser, url, { mobile, size, dpr, reducedMotion, onConsole, onError } = {}) {
  const context = await newContext(browser, { mobile, size, dpr, reducedMotion });
  const page = await context.newPage();
  const report = { console: [], errors: [] };
  page.on('console', (m) => {
    const entry = { type: m.type(), text: m.text() };
    if (/Failed to load resource/.test(entry.text) && /fonts|ERR_FAILED/.test(entry.text)) return;
    report.console.push(entry);
    onConsole?.(entry);
  });
  page.on('pageerror', (e) => {
    const msg = String((e && e.stack) || e);
    report.errors.push(msg);
    onError?.(msg);
  });
  await page.goto(url, { waitUntil: 'load', timeout: LOAD_TIMEOUT });
  return { context, page, report };
}
