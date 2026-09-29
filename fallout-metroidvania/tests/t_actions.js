// Gameplay actions with REAL key presses: ladder climb, elevator ride, vending purchase, stimpak, reload, grenade, V.A.T.S., dash, double jump.
const { open } = require('./harness');
(async () => {
  const h = await open('start=1&kit=1&abilities=all&god=1&room=s_hill', { w: 1280, h: 720 });
  await h.page.waitForTimeout(1500);
  const ev = (f, a) => h.T(f, a); const out = [];
  const stand = (room, tx, ty) => ev((a) => { const G = window.__G, w = G.world; G.teleportToRoom(a.room); G.updateRooms(true); G.player.x = a.tx * 40 + 9; G.player.y = (a.ty + 1) * 40 - G.player.h; G.player.vx = G.player.vy = 0; G.snapCamera(); G.roomFade = 0; for (let i = 0; i < 20; i++) window.T.frame([], 1); }, { room, tx, ty });
  const pos = () => ev(() => { const p = window.__G.player; return { x: Math.round(p.x), y: Math.round(p.y), g: p.onGround }; });
  // --- ladder: s_main1 stairwell ladder col 452 (rows 27..33 local = 55..61 global)
  const lad = await ev(() => { const w = window.__G.world; const s = { x: 452, y: 55 }; for (let y = 50; y < 70; y++) if (w.tile(452, y) === 6) { s.y = y; break; } return { tile: w.tile(452, s.y), y: s.y }; }); out.push('ladder-tile:' + JSON.stringify(lad));
  await stand('s_main1', 452, 62 - 8 < 0 ? 55 : lad.y + 3 > 61 ? 61 : lad.y + 3); const p0 = await pos();
  await h.page.keyboard.down('KeyW'); await h.page.waitForTimeout(700); await h.page.keyboard.up('KeyW'); const p1 = await pos(); out.push('ladder-climb:y ' + p0.y + '->' + p1.y);
  // --- stimpak (Q)
  await ev(() => { const G = window.__G; G.st.hp = 30; G.st.aid.stimpak = 3; }); await stand('s_hill', 320, 55); await h.page.keyboard.press('KeyQ'); await h.page.waitForTimeout(700);
  out.push('stimpak-Q:' + await ev(() => window.__G.st.hp + '/' + window.__G.st.aid.stimpak));
  // --- reload (R)
  await ev(() => { const G = window.__G; G.st.wi = G.st.weapons.indexOf('pistol10'); G.st.mag.pistol10 = 3; }); await h.page.keyboard.press('KeyR'); await h.page.waitForTimeout(1600); out.push('reload-R:' + await ev(() => window.__G.st.mag.pistol10));
  // --- grenade (G)
  const g0 = await ev(() => { window.__G.st.grenades = 3; return window.__G.projectiles.length; }); await h.page.keyboard.press('KeyG'); await h.page.waitForTimeout(250); out.push('grenade-G:' + await ev(() => 'gren=' + window.__G.st.grenades + ' proj=' + window.__G.projectiles.length));
  // --- VATS (V) with an enemy in view
  await ev(() => { const G = window.__G; const e = G.ents.find((x) => x.kind === 'enemy' && !x.dead); if (e) { G.player.x = e.x - 200; G.player.y = e.bottom - G.player.h; G.snapCamera(); e.awake = true; for (let i = 0; i < 20; i++) window.T.frame([], 1); } });
  await h.page.keyboard.press('KeyV'); await h.page.waitForTimeout(600); out.push('vats-V:' + await ev(() => 'active=' + !!window.__G.vatsActive + ' state=' + window.__G.state)); await h.page.keyboard.press('Escape'); await h.page.waitForTimeout(400);
  await ev(() => { const G = window.__G; G.vatsActive = false; if (G.state !== 'play') G.state = 'play'; });
  // --- double jump + dash (real keys)
  await stand('s_hill', 320, 55); const j0 = await pos(); let minY = j0.y;
  await h.page.keyboard.down('Space'); await h.page.waitForTimeout(120); await h.page.keyboard.up('Space'); await h.page.waitForTimeout(140); await h.page.keyboard.down('Space'); await h.page.waitForTimeout(100); await h.page.keyboard.up('Space');
  for (let i = 0; i < 8; i++) { await h.page.waitForTimeout(60); minY = Math.min(minY, (await pos()).y); } out.push('double-jump:rise=' + (j0.y - minY));
  await h.page.waitForTimeout(800); const d0 = await pos(); await h.page.keyboard.down('KeyD'); await h.page.keyboard.press('ShiftLeft'); await h.page.waitForTimeout(300); await h.page.keyboard.up('KeyD'); const d1 = await pos(); out.push('dash:dx=' + (d1.x - d0.x));
  // --- vending purchase
  await stand('s_hill', 328, 55);
  const vm = await ev(() => { const G = window.__G, w = G.world; const s = w.spawns.find((x) => x.t === 'nuka' && x.roomId === 's_station'); return s ? { tx: s.tx, ty: s.ty } : null; });
  if (vm) { await stand('s_station', vm.tx, vm.ty); await ev(() => { window.__G.st.caps = 500; window.__G.st.aid.stimpak = 0; }); await h.page.keyboard.press('KeyE'); await h.page.waitForTimeout(700); out.push('vending-open:' + await ev(() => window.__G.state));
    await h.page.keyboard.press('Enter'); await h.page.waitForTimeout(500); out.push('vending-buy:' + await ev(() => 'caps=' + window.__G.st.caps + ' stim=' + window.__G.st.aid.stimpak)); await h.page.keyboard.press('Escape'); await h.page.waitForTimeout(400); }
  console.log(out.join('\n'));
  console.log('errors:', h.logs.filter((l) => /error|exception/i.test(l) && !/willReadFrequently|getImageData/.test(l)).slice(0, 4).join(' | ') || 'none');
  await h.browser.close();
})();
