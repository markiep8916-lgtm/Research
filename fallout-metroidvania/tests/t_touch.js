// Touch controls: emulate a touch screen, tap to reveal the on-screen controls, then drive the game with the virtual stick and buttons.
const { open } = require('./harness');
(async () => {
  const h = await open('start=1&god=1&abilities=all', { w: 1280, h: 720, touch: true });
  const info = () => h.T(() => { const G = window.__G, P = G.player, TC = window.__CD.touch; return { active: TC.active, x: Math.round(P.x), y: Math.round(P.y), vy: Math.round(P.vy), g: P.onGround, hp: G.st.hp, state: G.state, btns: TC.btns.length }; });
  await h.T(() => window.T.frame([], 60));
  const before = await info();
  await h.page.touchscreen.tap(1000, 300);                                   // first touch reveals the controls
  await h.page.waitForTimeout(400);
  const shown = await info();
  const btn = (id) => h.T((i) => { const b = window.__CD.touch.btns.find((q) => q.id === i); const r = window.__G.canvas.getBoundingClientRect(); return { x: r.left + b.x / (window.__G.viewW || 1280) * r.width, y: r.top + b.y / (window.__G.viewH || 720) * r.height }; }, id);
  const jump = await btn('jump');
  await h.page.touchscreen.tap(jump.x, jump.y);                              // tap JUMP: the player should leave the ground
  let jumped = false; for (let i = 0; i < 12 && !jumped; i++) { await h.page.waitForTimeout(40); const s = await info(); jumped = s.vy < -100 || !s.g; }
  await h.page.screenshot({ path: process.argv[2] || '/tmp/t_touch.png' });
  console.log(JSON.stringify({ before: before.active, controlsShown: shown.active, buttons: shown.btns, jumped, errors: h.logs.filter((l) => /error/i.test(l) && !/willReadFrequently/.test(l)).slice(0, 3) }));
  await h.browser.close();
  process.exit(shown.active && jumped ? 0 : 1);
})();
