const { open } = require('./harness');
(async () => {
  const h = await open('start=1&kit=1&room=v_corr');
  const r = await h.T(() => {
    const G = window.__G, CD = window.__CD; const p = G.player; const log = [];
    G.st.wi = G.st.weapons.indexOf('pistol10'); G.st.mag.pistol10 = 12;
    for (let i = 0; i < 10; i++) { window.T.frame(['KeyJ'], 1); log.push({ i, fireCd: +p.fireCd.toFixed(3), reloading: p.reloading, knockT: p.knockT, meleeT: p.meleeT, mag: G.st.mag.pistol10, locked: G.controlsLocked(), pressed: !!CD.input.h.shoot, wi: G.st.wi, wid: G.curWeaponId() }); window.T.frame([], 20); }
    return log;
  });
  console.log(r.map((x) => JSON.stringify(x)).join('\n'));
  console.log(h.logs.slice(0, 20).join('\n'));
  await h.browser.close();
})();
