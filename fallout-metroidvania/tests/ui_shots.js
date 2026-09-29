// Screenshots of the UI screens (shop, terminal, hack, dialogue, bed menu, pause, controls, options, death, pip-boy tabs, endings).
const { open } = require('./harness');
const out = process.argv[2] || '/tmp/ui';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const h = await open('start=1&kit=1&abilities=all&room=s_hill&god=1');
  const shot = async (name, fn, wait, arg) => { if (fn) await h.T(fn, arg); await h.page.waitForTimeout(wait || 500); await h.page.screenshot({ path: out + '/' + name + '.png' }); };
  await h.T(() => { window.T.frame([], 120); window.__G.snapCamera(); });
  await h.T(() => { const G = window.__G; G.st.holotapes.tape_s6 = 1; G.st.holotapes.tape_overseer = 1; G.st.terminals.t_cryo = 1; G.st.objective = 3; G.st.caps = 340; });
  await shot('shop', () => window.__CD.shop.open('trader'));
  await h.T(() => window.__CD.overlay.close());
  await shot('dialog', () => { const G = window.__G; const n = G.ents.find((e) => e.kind === 'npc'); window.__CD.dialog.open(n); }, 1600);
  await h.T(() => window.__CD.overlay.close());
  await shot('terminal_read', () => { const G = window.__G; window.__CD.terminal.open({ id: 'x1', title: 'VAULT-TEC SURFACE ACCESS - LOG', lines: ['SURFACE HATCH 213-A.\nLAST OPENED: 2077-10-23.\nLAST CLOSED: 2077-10-23.\nNOTE: closed from the inside.', 'page two'] }); }, 1500);
  await h.T(() => window.__CD.overlay.close());
  await shot('terminal_hack', () => { window.__CD.terminal.open({ id: 'x2', title: 'MED BAY - DR. HALLORAN', hack: { wl: 8, n: 7 }, lines: ['ok'] }); }, 700);
  await h.T(() => window.__CD.overlay.close());
  await shot('bedmenu', () => { const G = window.__G; const bed = G.ents.find((e) => e.kind === 'prop' && e.name === 'Bunk'); G.st.beds = G.st.beds || {}; G.st.beds['fake'] = { x: 500, y: 500, room: 'v_cryo', name: 'Cryo Bay', region: 'vault' }; G.bedMenu(bed); }, 1400);
  await h.T(() => window.__CD.overlay.close());
  await shot('pause', () => { window.__G.setState('pause'); }, 400);
  await shot('controls', () => { window.__CD.menus.screen = 'controls'; window.__CD.menus.back = 'pause'; }, 300);
  await shot('options', () => { window.__CD.menus.screen = 'options'; }, 300);
  await h.T(() => { window.__CD.menus.screen = 'pause'; window.__G.setState('play'); });
  for (const [i, n] of ['stat', 'items', 'data', 'map'].entries()) { await shot('pip_' + n, (idx) => { const CD = window.__CD; if (window.__G.state !== 'overlay' && window.__G.state !== 'pipboy') CD.pipboy.open(); CD.pipboy.tab = idx; }, 500, i); }
  await h.T(() => { const CD = window.__CD; if (CD.pipboy.close) CD.pipboy.close(); window.__G.setState('play'); });
  await shot('dead', () => { const G = window.__G; G.cheats.god = false; G.st.hp = 1; G.hurtPlayer(50, {}); }, 2600);
  await h.T(() => { window.__G.respawn(); });
  await shot('ending_a', () => { const G = window.__G; window.__CD.menus.startEnding('restart'); }, 1800);
  await shot('ending_stats', () => { const M = window.__CD.menus; M.endPage = 99; M.endPageT = 3; }, 1000);
  console.log(h.logs.filter((l) => !/warning|leads nowhere|meets solid|WORLD/.test(l)).slice(0, 20).join('\n'));
  await h.browser.close();
})();
