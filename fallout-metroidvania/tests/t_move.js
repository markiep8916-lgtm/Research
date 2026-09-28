const { open } = require('./harness');
(async () => {
  const h = await open('start=1');
  const s0 = await h.T(() => window.T.state()); console.log('start', JSON.stringify(s0));
  // run right 60 frames
  let s = await h.T(() => { window.T.frame(['KeyD'], 60); return window.T.state(); }); console.log('after run 1s', JSON.stringify(s));
  // jump: measure apex
  const jump = await h.T(() => {
    const G = window.__G; window.T.frame([], 20); const y0 = G.player.y; let minY = y0;
    window.T.frame(['Space'], 1); for (let i = 0; i < 80; i++) { window.T.frame(['Space'], 1); minY = Math.min(minY, G.player.y); }
    return { y0, minY, rise: y0 - minY, tiles: (y0 - minY) / 40 };
  }); console.log('jump', JSON.stringify(jump));
  await h.page.screenshot({ path: process.argv[2] || '/tmp/t_move.png' });
  console.log(h.logs.slice(0, 20).join('\n'));
  await h.browser.close();
})();
