import { openGame } from '../tools/harness.mjs';
const g = await openGame({ w: 640, h: 360 });
await g.eval(() => {
  const G = window.__bd.game, B = window.__bd.RoomBuilder;
  const b = new B('t_s', 60, 20, { area: 'jungle', name: 'T' });
  b.rect(0, 0, 2, 20, '#').rect(58, 0, 2, 20, '#').ground(0, 59, 2); b.set(4, 3, '@'); b.set(10, 3, 's');
  window.__bd.ROOMS.t_s = b.build();
  G.save.abilities = { roll: true, pound: true, grip: true, boom: true }; G.save.hpMax = 5; G.save.hp = 5;
  G.menus.hideAll(); G.hud.show(true); G.state = 'play'; G.loadRoom('t_s', { x: 4.5, y: 3, face: 1 });
  G.entities.filter((e) => e.label === 'snapjaw').forEach((e) => { e.think = () => {}; });
  const p = G.player.body; p.x = 8.4; p.y = 3; G.player.snap();
});
for (let i = 0; i < 14; i++) {
  const info = await g.eval((first) => {
    const G = window.__bd.game;
    if (first) G.input.scripted = null;
    return null;
  }, i === 0);
  const r = await g.run([{ n: 1, held: [], press: i === 1 ? ['slap'] : [] }]);
  const d = await g.eval(() => { const G = window.__bd.game, p = G.player, e = G.entities.find((x) => x.label === 'snapjaw'); return { attackT: +p.attackT.toFixed(3), attacking: p.attacking, sb: p.attacking ? p.slapBox() : null, ebox: e && e.box, hp: e && e.hp, dying: e && e.dying, hit: p.attackHit.size, st: G.state }; });
  console.log(i, JSON.stringify(d));
}
await g.close();
