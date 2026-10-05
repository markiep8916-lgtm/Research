// Shared Playwright helpers for playtests.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function argv() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; }
  return o;
}

// Opens the built game. Returns { page, browser, errors, ev, shot, close }.
export async function openGame(html = join(root, 'wasteland-brawler.html'), viewport = { width: 1152, height: 720 }) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + resolve(html));
  await page.waitForTimeout(250);
  await page.evaluate(() => { window.__wb.manual = true; });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = async path => {
    const clip = await page.evaluate(() => { const r = document.getElementById('screen').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    await page.screenshot({ path, clip });
  };
  return { page, browser, errors, ev, shot, close: () => browser.close() };
}

// Register placeholder humanoid enemies for any of `keys` not yet defined (lets stage modules be
// tested before the enemy modules exist). Call after openGame().
export async function stubEnemies(g, keys) {
  return g.ev(keys => {
    const made = [];
    for (const k of keys) {
      if (ENEMY_TYPES[k]) continue;
      made.push(k);
      ENEMY_TYPES[k] = {
        name: k.toUpperCase() + '?', family: 'gang', hp: 20, speed: 1, score: 50,
        attacks: { poke: { start: 14, active: 3, rec: 18, dmg: 4, tier: 1, reach: [2, 20], zr: [14, 38], depth: 8, tell: 'glint' } },
        drawBody() { drawHumanoid(enemyHumanPose(this, (ph, t) => PlayerPoses.jab(ph, t)), { skin: '#c0c0c0', top: '#ff00ff', pants: '#555', boots: '#222' }); },
      };
    }
    return made;
  }, keys);
}
