const { open } = require('./harness');
const out = process.argv[2] || '/tmp/t_combat.png';
(async () => {
  const h = await open('start=1&kit=1&room=v_corr');
  const r = await h.T(() => {
    const G = window.__G, CD = window.__CD; const p = G.player;
    G.st.wi = G.st.weapons.indexOf('pistol10'); G.st.mag.pistol10 = 12;
    const info = { room: G.room && G.room.id, x: p.x, y: p.y, enemies: G.enemies.length, ents: G.ents.length };
    // aim right by keyboard, hold D + shoot
    window.T.frame(['KeyD'], 100);
    for (let i = 0; i < 40; i++) window.T.frame(['KeyJ'], 1), window.T.frame([], 12);
    info.after = window.T.state(); info.mag = G.st.mag.pistol10; info.kills = G.st.kills; info.xp = G.st.xp; info.projectiles = G.projectiles.length; info.enemiesLeft = G.enemies.length;
    return info;
  });
  console.log(JSON.stringify(r));
  await h.page.waitForTimeout(300);
  await h.page.screenshot({ path: out });
  console.log(h.logs.slice(0, 20).join('\n'));
  await h.browser.close();
})();
