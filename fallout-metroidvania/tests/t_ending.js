// Ending flow: last terminal room after Overseer Prime -> ending dialogue -> ending sequence.   node tests/t_ending.js [choiceIndex]
const { open } = require('./harness');
(async () => {
  const pick = +(process.argv[2] || 0);
  const h = await open('start=1&kit=1&abilities=all&god=1&room=d_end', { w: 1280, h: 720 });
  const r = await h.T(() => {
    const G = window.__G; G.st.flags.boss_overseer = 1; G.st.keys.fusioncore = 1; G.st.keys.level7 = 1;
    const tr = G.world.spawns.find((s) => s.t === 'trigger' && s.call === 'ending'); if (!tr) return { err: 'no ending trigger' };
    G.player.x = tr.tx * 40 + 4; G.player.y = (tr.ty + 1) * 40 - G.player.h; G.updateRooms(true); G.snapCamera();
    for (let i = 0; i < 90; i++) window.T.frame([], 1);
    return { trig: { tx: tr.tx, ty: tr.ty, w: tr.w, h: tr.h }, state: G.state, room: G.room && G.room.id };
  });
  console.log('at trigger', JSON.stringify(r));
  await h.page.waitForTimeout(800);
  await h.page.screenshot({ path: '/tmp/ending_dialog.png' });
  const seq = [];
  for (let i = 0; i < 16; i++) {
    const st = await h.T(() => window.__G.state);
    seq.push(st); if (st === 'ending') break;
    // real key presses: Enter advances/finishes the typewriter and confirms the highlighted choice; Down moves the selection
    if (i === 1) for (let k = 0; k < pick; k++) { await h.page.keyboard.press('ArrowDown'); await h.page.waitForTimeout(150); }
    await h.page.keyboard.press('Enter'); await h.page.waitForTimeout(900);
  }
  console.log('states', seq.join(','));
  const fin = await h.T(() => ({ state: window.__G.state, kind: window.__CD.menus.endKind, flags: Object.keys(window.__G.st.flags).filter((k) => k.indexOf('ending_') === 0) }));
  console.log('final', JSON.stringify(fin));
  await h.page.waitForTimeout(2500); await h.page.screenshot({ path: '/tmp/ending_screen.png' });
  console.log(h.logs.filter((l) => !/warning/.test(l)).slice(0, 8).join('\n'));
  await h.browser.close();
})();
