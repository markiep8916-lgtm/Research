// Menu/state flow smoke test with REAL key presses: pip-boy, pause, terminal reading, death + respawn, quit to title and back into a new game.
const { open } = require('./harness');
(async () => {
  const h = await open('start=1&kit=1&abilities=all&room=v_cryo', { w: 960, h: 540 });
  const S = () => h.T(() => window.__G.state);
  const key = async (k, ms) => { await h.page.keyboard.press(k); await h.page.waitForTimeout(ms || 350); };
  const out = []; const log = (n, v) => { out.push(n + '=' + v); };
  await h.T(() => { for (let i = 0; i < 60; i++) window.T.frame([], 1); window.__G.roomFade = 0; });
  await h.page.waitForTimeout(1500);
  // pip-boy
  await key('Tab'); log('tab', await S()); await key('KeyE'); await key('KeyE'); await key('KeyE'); log('pip-map-tab', await h.T(() => window.__CD.pipboy.tab)); await key('Tab'); log('tab-close', await S());
  // pause / resume
  await key('Escape'); log('esc', await S()); await key('Escape'); log('esc-resume', await S());
  // terminal read with real keys (t_cryo): open via API then press Enter through all pages
  await h.T(() => { const G = window.__G, CD = window.__CD; CD.terminal.open({ id: 'flowtest', title: 'FLOW TEST', lines: ['page one', 'page two', 'page three'], holotape: 'tape_s6' }); });
  log('term-open', await S());
  for (let i = 0; i < 8 && (await S()) === 'overlay'; i++) await key('Enter', 500);
  log('term-closed', await S()); log('term-flag', await h.T(() => !!window.__G.st.terminals.flowtest));
  // death + respawn
  await h.T(() => { const G = window.__G; G.cheats.god = false; G.st.hp = 1; G.hurtPlayer(50, {}); });
  await h.page.waitForTimeout(2600); log('dead', await S());
  await key('Enter', 1500); log('respawn', await S()); log('hp', await h.T(() => window.__G.st.hp));
  // pause -> quit to title
  await key('Escape'); log('pause2', await S());
  const labels = await h.T(() => window.__CD.menus.items.map((i) => i.label)); log('pause-items', labels.join('/'));
  const qi = labels.findIndex((l) => /QUIT/i.test(l)); for (let i = 0; i < qi; i++) await key('ArrowDown', 200); await key('Enter', 700);
  log('after-quit-item', await S()); if ((await S()) !== 'title') { await key('ArrowLeft', 300); await key('Enter', 800); }
  log('title?', await S());
  // continue from title
  const tl = await h.T(() => window.__CD.menus.items.map((i) => i.label)); log('title-items', tl.join('/'));
  await key('Enter', 1200); for (let i = 0; i < 6 && (await S()) !== 'play'; i++) await key('Enter', 900);
  log('back-in-game', await S()); log('room', await h.T(() => window.__G.room && window.__G.room.id));
  console.log(out.join('\n'));
  console.log('errors:', h.logs.filter((l) => /error|exception/i.test(l) && !/willReadFrequently|getImageData/.test(l)).slice(0, 5).join(' | ') || 'none');
  await h.browser.close();
})();
