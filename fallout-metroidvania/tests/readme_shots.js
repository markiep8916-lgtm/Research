// Regenerates the README screenshots (docs/screens/*.jpg) from the real game.   node tests/readme_shots.js [outdir]
const { open } = require('./harness');
const fs = require('fs'), out = process.argv[2] || 'docs/screens';
fs.mkdirSync(out, { recursive: true });
const SCENES = [
  { name: '01_vault_atrium', room: 'v_atrium', at: [44, 22] },
  { name: '02_main_street', room: 's_main1', at: [30, 27] },
  { name: '03_nuka_diner', room: 's_main2', at: [36, 27] },
  { name: '04_route9_overpass', room: 's_over', at: [24, 15] },
  { name: '05_the_ring', room: 'r_arena', at: [22, 26] },
  { name: '06_metro_train', room: 'm_tunnel', at: [22, 22] },
  { name: '07_cooling_towers', room: 'p_towers', at: [34, 27] },
  { name: '08_reactor', room: 'p_reactor', at: [24, 26] },
  { name: '09_overseer_prime', room: 'd_sanct', boss: 'overseer' },
  { name: '10_cryo_vault', room: 'd_cryo', at: [54, 20] },
];
(async () => {
  const h = await open('start=1&kit=1&abilities=all&god=1', { w: 1280, h: 720 });
  for (const s of SCENES) {
    if (process.argv[3] && !process.argv[3].split(',').some((n) => s.name.indexOf(n) >= 0)) continue;
    await h.T((a) => {
      const G = window.__G, CD = window.__CD, w = G.world, r = w.roomById[a.room]; G.camFocus = null;
      if (a.boss) { const sp = w.spawns.find((x) => x.t === 'arena' && x.boss === a.boss); G.teleportToRoom(a.room); G.player.x = (sp.tx + 3) * 40; G.player.y = (sp.ty + 1) * 40 - G.player.h; G.updateRooms(true); G.snapCamera(); CD.bosses.start(a.boss); for (let i = 0; i < 12; i++) window.T.frame([], 30); return; }
      const gx = r.x0 + a.at[0], gy = r.y0 + a.at[1]; let best = null, bd = 1e9;
      for (let dy = -12; dy <= 12; dy++) for (let dx = -14; dx <= 14; dx++) { const x = gx + dx, y = gy + dy; if (!w.isSolid(x, y) && !w.isSolid(x, y - 1) && !w.isSolid(x, y - 2) && (w.isSolid(x, y + 1) || w.tile(x, y + 1) === 2) && w.roomIdx[y * w.W + x] === r.idx) { const d = dx * dx + dy * dy * 1.5; if (d < bd) { bd = d; best = [x, y]; } } }
      G.teleportToRoom(a.room); if (best) { G.player.x = best[0] * 40 + 9; G.player.y = (best[1] + 1) * 40 - G.player.h; G.player.vx = G.player.vy = 0; }
      G.updateRooms(true); G.snapCamera(); window.T.frame([], 20); G.snapCamera(); G.roomFade = 0;
    }, s);
    await h.page.waitForTimeout(s.boss ? 1600 : 4200);
    await h.T(() => { const G = window.__G; G.hintT = 0; G.sayT = 0; G.banners = []; G.notes = []; G.bannerT = 0; });
    await h.page.waitForTimeout(700);
    await h.page.screenshot({ path: out + '/' + s.name + '.jpg', type: 'jpeg', quality: 82 });
    console.log('shot', s.name);
  }
  console.log(h.logs.filter((l) => !/warning/.test(l)).slice(0, 8).join('\n'));
  await h.browser.close();
})();
