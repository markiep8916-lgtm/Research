import { openGame } from '../tools/harness.mjs';
const g = await openGame({ w: 960, h: 540 });
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${c ? '' : x}`); };
await g.eval(() => {
  const B = window.__bd.RoomBuilder, R = window.__bd.ROOMS, G = window.__bd.game;
  // room A: flat floor, right portal to B; a heart, a relic-less sign, a save barrel, a switch + gate, crumble blocks
  const a = new B('m_a', 70, 24, { area: 'temple', name: 'A', props: { signs: ['Hello sign'] } });
  a.border('#').ground(0, 69, 2);
  a.clear(69, 3, 1, 3).rect(69, 3, 1, 3, '1');
  a.set(4, 3, '@').set(8, 3, 'S').set(12, 3, '?').set(16, 3, 'h');
  a.rect(22, 3, 2, 8, 'D').set(18, 3, 'w'); a.prop('slapA', true);
  a.rect(30, 0, 8, 3, '.'); a.rect(30, 0, 8, 1, 'W'); a.hline(31, 33, 2, 'F');
  a.portal('1', 'm_b', '1');
  // room B: a ladder going up to a top portal, left portal back to A
  const b = new B('m_b', 40, 36, { area: 'temple', name: 'B' });
  b.border('#').ground(0, 39, 2);
  b.clear(0, 3, 1, 3).rect(0, 3, 1, 3, '1');
  b.vline(20, 3, 34, 'H');
  b.set(20, 35, '2'); b.portal('1', 'm_a', '1'); b.portal('2', 'm_c', '1');
  const c = new B('m_c', 30, 30, { area: 'temple', name: 'C' });
  c.border('#').ground(0, 29, 2);
  c.set(10, 0, '1'); c.ladder(10, 1, 5); c.portal('1', 'm_b', '2');
  R.m_a = a.build(); R.m_b = b.build(); R.m_c = c.build();
  G.save.abilities = { roll: true, pound: true, grip: true, boom: true }; G.save.hpMax = 4; G.save.hp = 2; G.save.collected = {}; G.save.flags = {}; G.save.broken = {};
  G.menus.hideAll(); G.hud.show(true); G.state = 'play'; G.loadRoom('m_a', { x: 4.5, y: 3, face: 1 });
});
const put = (x, y, o = {}) => g.eval(([x, y, o]) => { const p = window.__bd.game.player; const b = p.body; b.x = x; b.y = y; b.vx = o.vx || 0; b.vy = o.vy || 0; b.ground = false; p.snap(); p.grace = 0; }, [x, y, o]);
// ---- checkpoint heals and saves
await put(8.5, 3);
let s = await g.run([{ n: 20, held: [] }]);
ok('save barrel heals and records the checkpoint', s.hp === 4 && (await g.eval(() => window.__bd.game.save.spawn.x)) === 8.5);
// ---- heart fruit
await put(16.5, 3);
s = await g.run([{ n: 20, held: [] }]);
ok('heart fruit raises max health', s.hpMax === 5 && s.hp === 5, JSON.stringify(s));
// ---- sign
await put(12.5, 3);
await g.run([{ n: 10, held: [] }, { n: 2, held: ['up'], press: ['up'] }]);
ok('pressing Up at a sign shows its text', (await g.eval(() => !window.__bd.game.hud.signBox.hidden && window.__bd.game.hud.signBox.textContent)) === 'Hello sign');
// ---- switch: slap opens gate (slapA)
const gate0 = await g.eval(() => window.__bd.game.grid.tile(22, 3));
await put(17, 3);
await g.eval(() => { window.__bd.game.player.body.face = 1; });
await g.run([{ n: 3, held: [], press: ['slap'] }, { n: 20, held: [] }]);
const gate1 = await g.eval(() => window.__bd.game.grid.tile(22, 3));
ok('slapping the crystal opens the gate', gate0 === 12 && gate1 === 0, gate0 + '->' + gate1);
ok('gate state is remembered in the save', await g.eval(() => !!window.__bd.game.save.flags['gateA:m_a']));
// ---- crumble block falls after standing on it and comes back
await put(32.5, 3.2);
await g.run([{ n: 10, held: [] }]);
ok('crumble block is solid at first', (await g.eval(() => window.__bd.game.grid.tile(32, 2))) === 15);
await g.run([{ n: 40, held: [] }]);
const tile1 = await g.eval(() => window.__bd.game.grid.tile(32, 2));
ok('crumble block gives way', tile1 === 0, 'tile ' + tile1);
await put(25, 3);
await g.run([{ n: 260, held: [] }]);
ok('crumble block regrows', (await g.eval(() => window.__bd.game.grid.tile(32, 2))) === 15);
// ---- portal A -> B
await put(66, 3);
s = await g.run([{ n: 60, held: ['right'] }, { n: 40, held: [] }]);
ok('walking into a portal changes room', s.room === 'm_b', JSON.stringify(s));
ok('arrival is on the paired side, facing in', s.x > 1.5 && s.x < 4 && s.face === 1 && s.state === 'play', JSON.stringify(s));
// ---- climb the ladder to the top portal and keep climbing into C
await put(20.5, 3);
s = await g.run([{ n: 3, held: ['up'] }]);
ok('Up on a ladder starts climbing', s.mode === 'climb', s.mode);
s = await g.run([{ n: 330, held: ['up'] }, { n: 120, held: ['up'] }]);
ok('climbing through a top portal arrives in the next room', s.room === 'm_c', JSON.stringify(s));
ok('Kong keeps climbing across the vertical portal', s.mode === 'climb', s.mode);
// ---- room persistence of broken crates
await g.eval(() => { const G = window.__bd.game; const B = window.__bd.RoomBuilder; const d = new B('m_d', 30, 14, { area: 'jungle' }); d.border('#').ground(0, 29, 2); d.rect(11, 3, 1, 3, 'R'); d.set(3, 3, '@'); window.__bd.ROOMS.m_d = d.build(); G.save.broken = {}; G.loadRoom('m_d', { x: 5, y: 3, face: 1 }); });
await g.run([{ n: 2, held: ['right'], press: ['roll'] }, { n: 40, held: ['right'] }]);
const t1 = await g.eval(() => window.__bd.game.grid.tile(11, 3));
await g.eval(() => window.__bd.game.loadRoom('m_d', { x: 5, y: 3, face: 1 }));
const t2 = await g.eval(() => window.__bd.game.grid.tile(11, 3));
ok('broken crates stay broken after leaving and re-entering', t1 === 0 && t2 === 0, t1 + ',' + t2);
console.log(`\n${pass} passed, ${fail} failed`);
console.log('errors:', g.errors().filter((e) => !/ERR_CERT|net::|\[world\]/.test(e)).join('\n') || 'none');
await g.close();
process.exit(fail ? 1 : 0);
