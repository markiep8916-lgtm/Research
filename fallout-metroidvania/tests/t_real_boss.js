// Boss fight in its REAL arena room (gates, arena bounds, hover heights): node tests/t_real_boss.js <bossId> <roomId> [seconds] [out.png]
const { open } = require('./harness');
const boss = process.argv[2] || 'overseer', room = process.argv[3] || 'd_sanct', secs = +(process.argv[4] || 40), out = process.argv[5] || '/tmp/t_real_' + boss + '.png';
(async () => {
  const h = await open('start=1&kit=1&abilities=all&god=1&room=' + room, { w: 1280, h: 720 });
  const res = await h.T((bossId) => {
    const G = window.__G, CD = window.__CD; G.st.hp = G.st.maxHp = 100000;
    const a = G.world.spawns.find((sp) => sp.t === 'arena' && sp.boss === bossId); if (!a) return { err: 'no arena mark for ' + bossId };
    // walk the player to the arena mark like the trigger would
    G.player.x = (a.tx + 3) * 40; G.player.y = (a.ty + 1) * 40 - G.player.h; G.snapCamera(); G.updateRooms(true);
    window.__stats = { hits: {}, modes: {} };
    CD.bosses.start(bossId);
    return { ok: !!G.boss, boss: G.boss && G.boss.type, gates: CD.bosses.gates.length, spawn: G.boss && [Math.round(G.boss.cx / 40), Math.round(G.boss.cy / 40)], arena: a && { tx: a.tx, ty: a.ty, floor: a.floor } };
  }, boss);
  console.log('start', JSON.stringify(res));
  if (res.err || !res.ok) { console.log(h.logs.join('\n')); await h.browser.close(); process.exit(1); }
  for (let s = 0; s < secs; s++) {
    const r = await h.T((sec) => {
      const G = window.__G, T = window.T, b = G.boss;
      if (!b || b.dead) return { done: true, flags: Object.keys(G.st.flags).filter((k) => k.indexOf('boss_') === 0) };
      const st = window.__stats; st.modes[b.bs.mode] = (st.modes[b.bs.mode] || 0) + 1;
      const dir = Math.sin(sec * 0.7) > 0 ? ['KeyD'] : ['KeyA'];
      for (let i = 0; i < 4; i++) T.frame(dir.concat(i === 0 && sec % 3 === 0 ? ['Space'] : []), 30);
      if (b.invuln <= 0 && b.bs.mode !== 'intro') G.damageEnemy(b, b.maxHp * 0.03, { x: b.cx, y: b.cy, dx: 1 });
      return { t: sec, hp: Math.round(b.hp), mode: b.bs.mode, phase: b.bs.phase, state: b.state, bx: Math.round(b.cx / 40), by: Math.round(b.cy / 40), px: Math.round(G.player.cx / 40), py: Math.round(G.player.cy / 40) };
    }, s);
    if (s % 4 === 0 || r.done) console.log(JSON.stringify(r));
    if (s === +(process.env.SHOT_AT || 8)) { await h.page.waitForTimeout(600); await h.page.screenshot({ path: out.replace('.png', '_mid.png') }); }
    if (r.done) break;
  }
  console.log(h.logs.filter((l) => !/warning/.test(l)).slice(0, 15).join('\n'));
  await h.browser.close();
})();
