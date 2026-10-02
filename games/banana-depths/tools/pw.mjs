// Resolve Playwright: prefer a normal `npm i -D playwright`, fall back to a global install.
let pw;
try { pw = await import('playwright'); } catch {
  const candidates = ['/opt/node22/lib/node_modules/playwright/index.mjs', '/usr/lib/node_modules/playwright/index.mjs', '/usr/local/lib/node_modules/playwright/index.mjs'];
  for (const c of candidates) { try { pw = await import(c); break; } catch { /* next */ } }
}
if (!pw) throw new Error('Playwright not found. Install it with: npm i -D playwright && npx playwright install chromium');
export const chromium = pw.chromium;
