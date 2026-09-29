// Mouse-driven UI smoke test (real mouse events): title -> new game -> intro skip, pause menu, dialogue choice, terminal pages, death respawn.
const path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + path.resolve(process.argv[2] || 'index.html'));
  await page.waitForFunction(() => window.__G && window.__G.state === 'title', null, { timeout: 60000 });
  const out = []; const S = () => page.evaluate(() => window.__G.state + '/' + (window.__CD.menus.screen || ''));
  const click = async (x, y, ms) => { await page.mouse.move(x, y); await page.waitForTimeout(150); await page.mouse.click(x, y); await page.waitForTimeout(ms || 500); };
  const mi = () => page.evaluate(() => ({ y: window.__CD.menus.menuY(), labels: window.__CD.menus.items.map((i) => i.label) }));
  // title: NEW GAME (first item, or after CONTINUE)
  let m = await mi(); const ni = m.labels.findIndex((l) => /NEW GAME/.test(l)); await click(640, m.y + ni * 44 - 6, 900); out.push('title-click-new:' + await S());
  for (let i = 0; i < 8 && (await page.evaluate(() => window.__G.state)) !== 'play'; i++) await click(640, 360, 900);
  out.push('intro-skipped:' + await S()); await page.waitForTimeout(1200);
  // pause menu via Esc, click RESUME then CONTROLS then back
  await page.keyboard.press('Escape'); await page.waitForTimeout(500); m = await mi(); out.push('pause-items:' + m.labels.join('/'));
  await click(640, m.y - 6, 600); out.push('click-resume:' + await S());
  await page.keyboard.press('Escape'); await page.waitForTimeout(500); m = await mi(); const ci = m.labels.findIndex((l) => /CONTROLS/.test(l)); await click(640, m.y + ci * 44 - 6, 600); out.push('click-controls:' + await S());
  await click(640, 360, 500); out.push('click-back:' + await S()); m = await mi(); await click(640, m.y - 6, 600); out.push('resume-again:' + await S());
  // dialogue (Haskell) via API, then click through
  await page.evaluate(() => { const G = window.__G, CD = window.__CD; G.teleportToRoom('s_hill'); G.updateRooms(true); const n = G.ents.find((e) => e.kind === 'npc' && e.name === 'Haskell'); G.player.x = n.x - 60; G.player.y = n.bottom - G.player.h; G.snapCamera(); for (let i = 0; i < 40; i++) window.T && 0; CD.dialog.open(n); });
  await page.waitForTimeout(600); await click(640, 400, 500); const dl = await page.evaluate(() => { const o = window.__CD.overlay.cur; return o ? { node: o.node, baseY: o.baseY, chars: Math.round(o.chars) } : null; }); out.push('dialog-after-click1:' + JSON.stringify(dl));
  if (dl && dl.baseY) { await click(640, dl.baseY - 6, 700); out.push('dialog-after-choice:' + JSON.stringify(await page.evaluate(() => { const o = window.__CD.overlay.cur; return o ? { node: o.node, state: window.__G.state } : { closed: true, state: window.__G.state }; }))); }
  await page.evaluate(() => { try { window.__CD.overlay.close(); } catch (e) {} window.__G.state = 'play'; });
  // terminal pages via clicks
  await page.evaluate(() => window.__CD.terminal.open({ id: 'mousetest', title: 'MOUSE TEST', lines: ['one', 'two', 'three'] })); await page.waitForTimeout(500);
  for (let i = 0; i < 8 && (await page.evaluate(() => window.__G.state)) === 'overlay'; i++) await click(640, 360, 500);
  out.push('terminal-click-closed:' + await page.evaluate(() => window.__G.state + '/' + !!window.__G.st.terminals.mousetest));
  // death + respawn by click
  await page.evaluate(() => { const G = window.__G; G.cheats.god = false; G.st.hp = 1; G.hurtPlayer(50, {}); }); await page.waitForTimeout(2600);
  out.push('dead:' + await page.evaluate(() => window.__G.state)); m = await mi(); await click(640, m.y - 6, 1500); out.push('death-click:' + await page.evaluate(() => window.__G.state + '/hp' + window.__G.st.hp));
  console.log(out.join('\n')); console.log('errors:', errs.slice(0, 4).join(' | ') || 'none');
  await browser.close();
})();
