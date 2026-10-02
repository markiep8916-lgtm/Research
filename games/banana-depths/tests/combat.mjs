import { openGame } from '../tools/harness.mjs';
const g = await openGame({ w: 1280, h: 720 });
await g.eval(() => {
  const B = window.__bd.RoomBuilder, G = window.__bd.game;
  const b = new B('t_combat', 90, 26, { area: 'jungle', name: 'Combat Test' });
  b.rect(0, 0, 2, 26, '#').rect(88, 0, 2, 26, '#').ground(0, 89, 2);
  b.set(4, 3, '@');
  b.set(14, 3, 's');                           // snapjaw
  b.set(24, 3, 't');                           // thornbug
  b.rect(30, 12, 6, 1, '#'); b.set(32, 11, 'a'); // bat under a ceiling block
  b.set(44, 3, 'u');                           // tiki facing left
  b.set(54, 3, 'm');                           // magma blob
  b.rect(60, 12, 4, 1, '#'); b.set(61, 11, 'p'); // spider under a block
  b.set(72, 3, 'f');                           // wisp
  b.set(82, 3, 'n');                           // cannon facing left
  window.__bd.ROOMS.t_combat = b.build();
  G.save.abilities = { roll: true, pound: true, grip: true, boom: true };
  G.save.hpMax = 5; G.save.hp = 5;
  G.menus.hideAll(); G.hud.show(true); G.state = 'play';
  G.loadRoom('t_combat', { x: 4.5, y: 3, face: 1 });
  G.player.invuln = 0;
});
const ent = () => g.eval(() => window.__bd.game.entities.filter((e) => e.kind === 'enemy').map((e) => ({ c: e.constructor.name, x: +e.x.toFixed(1), y: +e.y.toFixed(1), hp: e.hp, dying: e.dying })));
console.log('enemies:', JSON.stringify(await ent()));
// walk to the snapjaw and stomp it
let s = await g.run([{ n: 70, held: ['right'] }]);
console.log('at snapjaw?', JSON.stringify({ x: s.x, hp: s.hp }), JSON.stringify((await ent())[0]));
s = await g.run([{ n: 60, held: ['right', 'jump'], press: ['jump'] }, { n: 60, held: [] }]);
console.log('after jump:', JSON.stringify({ x: s.x, y: s.y, hp: s.hp, bananas: s.bananas }));
console.log('snapjaw:', JSON.stringify((await ent())[0]));
await g.shot('combat_1.png');
// slap through thornbug
s = await g.run([{ n: 100, held: ['right'] }]);
console.log('near thornbug:', JSON.stringify({ x: s.x, hp: s.hp }), JSON.stringify((await ent()).find((e) => e.c === 'Thornbug')));
s = await g.run([{ n: 8, held: [], press: ['slap'] }, { n: 20, held: [] }, { n: 8, held: [], press: ['slap'] }, { n: 30, held: [] }]);
console.log('after slaps:', JSON.stringify({ x: s.x, hp: s.hp }), JSON.stringify((await ent()).find((e) => e.c === 'Thornbug')));
console.log('draw:', JSON.stringify(await g.eval(() => window.__bd.info())));
await g.shot('combat_2.png');
console.log('errors:', g.errors().filter((e) => !/ERR_CERT|net::|\[world\]/.test(e)).join('\n') || 'none');
await g.close();
