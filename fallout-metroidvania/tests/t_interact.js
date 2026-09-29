// Interaction smoke test with REAL key presses: for each interactable type, stand next to one, press E, check the overlay opens, Esc closes it.
// usage: node tests/t_interact.js
const { open } = require('./harness');
(async () => {
  const h = await open('start=1&kit=1&abilities=all&god=1', { w: 960, h: 540 });
  const samples = await h.T(() => {
    const G = window.__G, w = G.world, pick = (f) => w.spawns.find(f), out = [];
    const add = (label, sp) => { if (sp) out.push({ label, tx: sp.tx, ty: sp.ty, room: sp.roomId }); };
    add('bed', pick((s) => s.t === 'bed')); add('terminal', pick((s) => s.t === 'terminal' && !s.hack)); add('terminal(hack)', pick((s) => s.t === 'terminal' && s.hack));
    add('vending', pick((s) => s.t === 'nuka')); add('locker', pick((s) => s.t === 'locker')); add('npc(trader)', pick((s) => s.t === 'npc' && s.shop)); add('npc(talk)', pick((s) => s.t === 'npc' && !s.shop));
    add('door(locked)', pick((s) => s.t === 'door' && s.lock && s.lock !== 'open')); add('elevator', pick((s) => s.t === 'elevator'));
    return out;
  });
  const results = [];
  for (const sm of samples) {
    const before = h.logs.length;
    await h.T((a) => {
      const G = window.__G, w = G.world; G.teleportToRoom(a.room); G.updateRooms(true);
      // stand on the floor cell in front of / on the spawn tile
      let best = null; for (const dx of [0, -1, 1, -2, 2]) { const x = a.tx + dx; let y = a.ty; if (!w.isSolid(x, y) && !w.isSolid(x, y - 1) && (w.isSolid(x, y + 1) || w.tile(x, y + 1) === 2)) { best = [x, y]; break; } }
      if (!best) best = [a.tx, a.ty]; G.player.x = best[0] * 40 + 9; G.player.y = (best[1] + 1) * 40 - G.player.h; G.player.vx = G.player.vy = 0; G.snapCamera(); G.roomFade = 0; G.st.hp = G.st.maxHp;
      for (let i = 0; i < 30; i++) window.T.frame([], 1);
    }, sm);
    await h.page.waitForTimeout(2600);
    const pre = await h.T(() => { const G = window.__G, p = G.player; const near = G.ents.filter((e) => e.canInteract && Math.hypot(e.cx - p.cx, e.cy - p.cy) < 140).map((e) => e.kind + ':' + (e.name || e.lock || '')); return { state: G.state, near }; });
    await h.page.keyboard.press('KeyE'); await h.page.waitForTimeout(700);
    const mid = await h.T(() => window.__G.state);
    for (let i = 0; i < 4 && mid === 'overlay'; i++) { await h.page.keyboard.press('Escape'); await h.page.waitForTimeout(350); }
    const post = await h.T(() => window.__G.state);
    const errs = h.logs.slice(before).filter((l) => /error|exception/i.test(l) && !/willReadFrequently|getImageData/.test(l));
    results.push({ what: sm.label, room: sm.room, near: pre.near.slice(0, 3), afterE: mid, afterEsc: post, errs: errs.slice(0, 2) });
    // make sure we are back in play for the next sample
    await h.T(() => { const G = window.__G; if (G.state !== 'play') { try { window.__CD.overlay.close(); } catch (e) {} G.state = 'play'; } });
  }
  for (const r of results) console.log(JSON.stringify(r));
  await h.browser.close();
})();
