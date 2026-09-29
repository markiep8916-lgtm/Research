// What a boss wreck looks like in the engine: node tests/t_corpse.js <bossId> [out.png]
const { open } = require('./harness');
const boss = process.argv[2] || 'sentry', out = process.argv[3] || '/tmp/t_corpse_' + boss + '.png';
const init = `window.CD_EXTRA_ROOMS_FN = function () {
  const CD = window.CD, r = CD.room('ta_arena', 'Test Arena', 'surface', 1100, 400, 60, 26, { sky: false, bg: 'bw_concrete', ambient: [0.5, 0.5, 0.55] });
  r.shell(2, 'C'); r.floor(3, 'C'); r.ent(4, 22, '@'); r.ent(8, 2, '*'); r.ent(30, 2, '*'); r.ent(52, 2, '*');
  r.mark(30, 22, 'arena', { boss: '${boss}', floor: 23, gates: [{ dx: -28, dy: -3, w: 2, h: 3 }], spawn: [10, -2] });
  r.done(); return [r.def || CD.ROOMS.pop()];
};`;
(async () => {
  const h = await open('start=1&kit=1&abilities=all&god=1', { init, w: 1280, h: 720 });
  await h.T((bossId) => {
    const G = window.__G, CD = window.__CD, T = 40, room = G.world.roomById['ta_arena'];
    G.player.x = (room.x0 + 6) * T; G.player.y = (room.y0 + 22) * T - G.player.h; G.snapCamera(); G.updateRooms(true);
    CD.bosses.start(bossId); window.T.frame([], 400);
    const b = G.boss; b.hp = 1; window.__pos = [b.cx, b.cy];
    G.damageEnemy(b, 99999, { x: b.cx, y: b.cy, dx: 1 });
  }, boss);
  for (const wait of [0.6, 3.2]) {
    await h.T((w) => { const G = window.__G; for (let i = 0; i < w * 60; i++) window.T.frame([], 1); const c = G.ents.find((e) => e.kind === 'corpse'); const p = c ? [c.cx, c.cy] : window.__pos; G.camFocus = { x: p[0], y: p[1] - 20 }; window.T.frame([], 20); G.snapCamera(); }, wait);
    await h.page.waitForTimeout(900);
    await h.page.screenshot({ path: out.replace('.png', '_' + wait + '.png') });
  }
  console.log(h.logs.filter((l) => !/warning/.test(l)).slice(0, 10).join('\n'));
  await h.browser.close();
})();
