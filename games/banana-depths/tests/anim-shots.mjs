import { openGame } from '../tools/harness.mjs';
const g = await openGame({ w: 1100, h: 520 });
await g.eval(() => {
  const B = window.__bd.RoomBuilder, G = window.__bd.game;
  const a = new B('an', 60, 16, { area: 'jungle', name: 'A' });
  a.rect(0, 0, 2, 16, '#').rect(58, 0, 2, 16, '#').ground(0, 59, 2); a.set(4, 3, '@'); a.set(30, 3, 's');
  window.__bd.ROOMS.an = a.build();
  G.save.abilities = { roll: true, pound: true, grip: true, boom: true };
  G.menus.hideAll(); G.hud.show(true); G.state = 'play'; G.loadRoom('an', { x: 6, y: 3, face: 1 });
  G.hud.roomName.classList.remove('show'); G.hud.show(false);
});
const seq = [
  ['run1', [{ n: 40, held: ['right'] }]],
  ['run2', [{ n: 5, held: ['right'] }]],
  ['jump', [{ n: 2, held: ['right', 'jump'], press: ['jump'] }, { n: 10, held: ['right', 'jump'] }]],
  ['fall', [{ n: 22, held: ['right'] }]],
  ['slap', [{ n: 20, held: [] }, { n: 8, held: [], press: ['slap'] }]],
  ['roll', [{ n: 20, held: [] }, { n: 6, held: ['right'], press: ['roll'] }]],
];
for (const [name, segs] of seq) { await g.run(segs); await g.shot(`anim_${name}.png`); }
await g.close();
