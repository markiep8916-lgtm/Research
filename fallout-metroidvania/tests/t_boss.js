// Boss fight smoke test in a synthetic arena: node tests/t_boss.js <bossId> [seconds] [out.png]
const { open } = require('./harness');
const boss = process.argv[2] || 'warlord', secs = +(process.argv[3] || 60), out = process.argv[4] || '/tmp/t_boss_' + boss + '.png';
const init = `window.CD_EXTRA_ROOMS_FN = function () {
  const CD = window.CD, r = CD.room('ta_arena', 'Test Arena', 'surface', 1100, 400, 60, 26, { sky: false, bg: 'bw_concrete', ambient: [0.5, 0.5, 0.55] });
  r.shell(2, 'C'); r.floor(3, 'C'); r.plat(10, 15, 17); r.plat(44, 49, 17); r.plat(26, 33, 12);
  r.ent(4, 22, '@'); r.ent(8, 2, '*'); r.ent(30, 2, '*'); r.ent(52, 2, '*');
  r.mark(30, 22, 'arena', { boss: '${boss}', floor: 23, gates: [{ dx: -28, dy: -3, w: 2, h: 3 }], spawn: [10, -2] });
  r.done(); return [r.def || CD.ROOMS.pop()];
};`;
(async () => {
  const h = await open('start=1&kit=1&abilities=all', { init });
  const res = await h.T((bossId) => {
    const G = window.__G, CD = window.__CD, T = 40;
    // the DSL pushes the def into CD.ROOMS itself; nothing else to do
    const room = G.world.roomById['ta_arena']; if (!room) return { err: 'no arena room' };
    G.st.hp = G.st.maxHp = 100000; G.st.abilities.jetboots = 1;
    G.player.x = (room.x0 + 6) * T; G.player.y = (room.y0 + 22) * T - G.player.h; G.snapCamera(); G.updateRooms(true);
    window.__stats = { hits: {}, modes: {}, err: [] };
    const hp0 = G.hurtPlayer; G.hurtPlayer = function (d, o) { const b = G.boss; const m = b && b.bs ? b.bs.mode : '?'; window.__stats.hits[m] = (window.__stats.hits[m] || 0) + 1; return hp0.call(G, d, o); };
    CD.bosses.start(bossId);
    return { ok: !!G.boss, boss: G.boss && G.boss.type, hp: G.boss && G.boss.maxHp, gates: CD.bosses.gates.length, spawn: G.boss && [G.boss.x | 0, G.boss.y | 0] };
  }, boss);
  console.log('start', JSON.stringify(res));
  if (res.err || !res.ok) { console.log(h.logs.join('\n')); await h.browser.close(); process.exit(1); }
  // simulate: the dummy player walks back and forth / jumps sometimes, the boss gets damaged periodically
  const total = Math.round(secs);
  for (let s = 0; s < total; s++) {
    const r = await h.T((sec) => {
      const G = window.__G, CD = window.__CD, T = window.T; const b = G.boss;
      if (!b || b.dead) return { done: true, flags: Object.keys(G.st.flags).filter((k) => k.indexOf('boss_') === 0) };
      const st = window.__stats; st.modes[b.bs.mode] = (st.modes[b.bs.mode] || 0) + 1;
      const dir = Math.sin(sec * 0.7) > 0 ? ['KeyD'] : ['KeyA'];
      for (let i = 0; i < 4; i++) { T.frame(dir.concat(i === 0 && sec % 3 === 0 ? ['Space'] : []), 30); }
      // chip damage: 2.5% of max per second while alive
      if (b.invuln <= 0 && b.bs.mode !== 'intro') G.damageEnemy(b, b.maxHp * 0.03, { x: b.cx, y: b.cy, dx: 1 });
      return { t: sec, hp: Math.round(b.hp), mode: b.bs.mode, phase: b.bs.phase, state: b.state, px: Math.round(G.player.x), by: Math.round(b.x) };
    }, s);
    if (s % 5 === 0 || r.done) console.log(JSON.stringify(r));
    if (s === +(process.env.SHOT_AT || 7)) { await h.T(() => { const G = window.__G, b = G.boss; if (b) { G.camFocus = { x: b.cx, y: b.cy - 40 }; window.T.frame([], 40); G.snapCamera(); } }); await h.page.screenshot({ path: out.replace('.png', '_mid.png') }); await h.T(() => { window.__G.camFocus = null; }); }
    if (r.done) break;
  }
  const fin = await h.T(() => ({ stats: window.__stats, flags: Object.keys(window.__G.st.flags).filter((k) => k.indexOf('boss_') === 0), gates: window.__CD.bosses.gates.length, alive: !!window.__G.boss }));
  console.log('final', JSON.stringify(fin));
  await h.page.screenshot({ path: out });
  console.log(h.logs.filter((l) => !/warning/.test(l)).slice(0, 25).join('\n'));
  await h.browser.close();
})();
