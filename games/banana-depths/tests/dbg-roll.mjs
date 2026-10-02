import { openGame } from '../tools/harness.mjs';
const g = await openGame({ w: 640, h: 360 });
await g.eval(() => {
  const G = window.__bd.game, B = window.__bd.RoomBuilder;
  const b = new B('t_s', 60, 20, { area: 'jungle', name: 'T' });
  b.rect(0, 0, 2, 20, '#').rect(58, 0, 2, 20, '#').ground(0, 59, 2); b.set(4, 3, '@'); b.rect(14, 3, 1, 4, 'R');
  window.__bd.ROOMS.t_s = b.build();
  G.save.abilities = { roll: true, pound: true, grip: true, boom: true }; G.save.hpMax = 5; G.save.hp = 5;
  G.menus.hideAll(); G.hud.show(true); G.state = 'play'; G.loadRoom('t_s', { x: 4.5, y: 3, face: 1 });
  const p = G.player.body; p.x = 8; p.y = 3; G.player.snap();
});
for (let i = 0; i < 12; i++) {
  const r = await g.run([{ n: i === 0 ? 2 : 4, held: ['right'], press: i === 0 ? ['roll'] : [] }]);
  console.log(i, JSON.stringify({ x: r.x, vx: r.vx, mode: r.mode, ground: r.ground }), await g.eval(() => window.__bd.game.grid.tile(14, 3)));
}
await g.close();
