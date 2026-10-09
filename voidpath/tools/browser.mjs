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

// Machine-wide browser slots. SwiftShader renders on the CPU, so a dozen headless browsers on a
// 4-core machine all crawl (a frame took minutes at load 150+) and every run times out. Each
// launch first takes one of VP_BROWSER_SLOTS (default 3) lock directories under shots/, waiting
// in line if all are taken; a slot whose owner process is gone is reclaimed.
const SLOT_DIR = process.env.VP_BROWSER_SLOT_DIR || path.join(ROOT, 'shots', '.browser-slots');
const MAX_SLOTS = Math.max(1, Number(process.env.VP_BROWSER_SLOTS) || 3);
const heldSlots = new Set();

function slotIsStale(lock) {
  let pid;
  try { pid = Number(fs.readFileSync(path.join(lock, 'pid'), 'utf8')); } catch {
    // a slot just created may not have its pid file yet; only an old one without it is stale
    try { return Date.now() - fs.statSync(lock).mtimeMs > 30000; } catch { return true; }
  }
  try { process.kill(pid, 0); return false; } catch (e) { return e.code === 'ESRCH'; }
}

async function acquireSlot() {
  fs.mkdirSync(SLOT_DIR, { recursive: true });
  let announced = false;
  for (;;) {
    for (let i = 0; i < MAX_SLOTS; i++) {
      const lock = path.join(SLOT_DIR, `slot${i}`);
      try {
        fs.mkdirSync(lock);
        fs.writeFileSync(path.join(lock, 'pid'), String(process.pid));
        heldSlots.add(lock);
        return lock;
      } catch {
        if (slotIsStale(lock)) fs.rmSync(lock, { recursive: true, force: true });
      }
    }
    if (!announced) {
      console.log(`waiting for a browser slot (${MAX_SLOTS} machine-wide, VP_BROWSER_SLOTS)`);
      announced = true;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

function releaseSlot(lock) {
  if (!heldSlots.delete(lock)) return;
  fs.rmSync(lock, { recursive: true, force: true });
}

process.on('exit', () => { for (const lock of [...heldSlots]) releaseSlot(lock); });

export async function launchBrowser() {
  const { chromium } = loadPlaywright();
  const lock = await acquireSlot();
  try {
    const browser = await chromium.launch({
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required'],
    });
    browser.on('disconnected', () => releaseSlot(lock));
    return browser;
  } catch (e) {
    releaseSlot(lock);
    throw e;
  }
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
