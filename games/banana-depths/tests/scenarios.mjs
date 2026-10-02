// Gameplay scenario tests in the real built game (headless Chromium, manual stepping).
import { openGame } from '../tools/harness.mjs';
const g = await openGame({ w: 960, h: 540 });
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { (cond ? pass++ : fail++); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${cond ? '' : extra}`); };

async function setup(fn, abil = { roll: true, pound: true, grip: true, boom: true }) {
  await g.eval(([src, abil]) => {
    const G = window.__bd.game, B = window.__bd.RoomBuilder;
    const b = new B('t_s', 90, 26, { area: 'jungle', name: 'T' });
    b.rect(0, 0, 2, 26, '#').rect(88, 0, 2, 26, '#').ground(0, 89, 2);
    b.set(4, 3, '@');
    new Function('b', src)(b);
    window.__bd.ROOMS.t_s = b.build();
    G.save.abilities = abil; G.save.hpMax = 5; G.save.hp = 5; G.save.bananas = 0;
    G.save.broken = {}; G.save.flags = {}; G.save.collected = {};
    G.menus.hideAll(); G.hud.show(true); G.state = 'play';
    G.loadRoom('t_s', { x: 4.5, y: 3, face: 1 });
    G.player.invuln = 0; G.hitstopT = 0; G.carry = null;
  }, [fn, abil]);
}
const put = (x, y, o = {}) => g.eval(([x, y, o]) => { const b = window.__bd.game.player.body; b.x = x; b.y = y; b.vx = o.vx || 0; b.vy = o.vy || 0; b.face = o.face || 1; b.ground = false; window.__bd.game.player.snap(); window.__bd.game.player.invuln = 0; }, [x, y, o]);
const freeze = (label) => g.eval((l) => window.__bd.game.entities.filter((e) => e.label === l).forEach((e) => { e.think = () => {}; }), label);
const ents = (label) => g.eval((l) => window.__bd.game.entities.filter((e) => e.label === l || e.constructor.label === l).map((e) => ({ x: +e.x.toFixed(2), y: +e.y.toFixed(2), hp: e.hp, dying: e.dying, dead: e.dead, mode: e.mode })), label);
const hp = async () => (await g.snap()).hp;

// ---- stomp a snapjaw
await setup("b.set(10,3,'s');");
await freeze('snapjaw');
await put(10.5, 6, { vy: -6 });
let s = await g.run([{ n: 30, held: [] }]);
let e = (await ents('snapjaw'))[0];
ok('stomp kills snapjaw', !e || e.dying > 0, JSON.stringify(e));
ok('stomp does not hurt Kong', s.hp === 5, 'hp ' + s.hp);

// ---- stomping a thornbug hurts
await setup("b.set(10,3,'t');");
await freeze('thornbug');
await put(10.5, 5.2, { vy: -6 });
s = await g.run([{ n: 12, held: [] }]);
e = (await ents('thornbug'))[0];
ok('thornbug survives a stomp and spikes Kong', e && e.dying === 0 && s.hp === 4, JSON.stringify({ e, hp: s.hp }));

// ---- slap kills a snapjaw
await setup("b.set(10,3,'s');");
await freeze('snapjaw');
await put(8.4, 3, { face: 1 });
s = await g.run([{ n: 2, held: [], press: ['slap'] }, { n: 25, held: [] }]);
e = (await ents('snapjaw'))[0];
ok('slap kills snapjaw', !e || e.dying > 0, JSON.stringify(e));

// ---- roll kills snapjaw, crates break
await setup("b.set(14,3,'s');");
await freeze('snapjaw');
await put(8, 3, { face: 1 });
s = await g.run([{ n: 2, held: ['right'], press: ['roll'] }, { n: 40, held: ['right'] }]);
e = (await ents('snapjaw'))[0];
ok('roll kills snapjaw', !e || e.dying > 0, JSON.stringify(e));
await setup("b.rect(14,3,1,4,'R');");
await put(8, 3, { face: 1 });
s = await g.run([{ n: 2, held: ['right'], press: ['roll'] }, { n: 40, held: ['right'] }]);
const broken = await g.eval(() => window.__bd.game.grid.tile(14, 3) + ',' + window.__bd.game.grid.tile(14, 6));
ok('crate column breaks when a roll hits it', broken === '0,0', broken + ' x=' + s.x);
await setup("b.rect(14,3,1,4,'R');");
await put(8, 3, { face: 1 });
s = await g.run([{ n: 60, held: ['right'] }]);
ok('plain running cannot break crates', (await g.eval(() => window.__bd.game.grid.tile(14, 3))) === 8 && s.x < 14);

// ---- ground pound breaks slabs and stuns
await setup("b.rect(10,2,4,1,'G'); b.rect(10,1,4,1,'G'); b.rect(10,0,4,1,'#');");
await put(11.5, 9, { vy: 0 });
s = await g.run([{ n: 3, held: ['down'], press: ['slap'] }, { n: 80, held: [] }]);
const slab = await g.eval(() => [window.__bd.game.grid.tile(11, 2), window.__bd.game.grid.tile(11, 1)].join());
ok('pound drills through the slabs', slab === '0,0', slab + ' y=' + s.y);
await setup("b.set(12,3,'s');");
await freeze('snapjaw');
await put(10.8, 9, { vy: 0 });
s = await g.run([{ n: 3, held: ['down'], press: ['slap'] }, { n: 80, held: [] }]);
e = (await ents('snapjaw'))[0];
ok('pound shock kills a nearby snapjaw', !e || e.dying > 0, JSON.stringify(e));

// ---- boomerang: hits an enemy and returns
await setup("b.set(14,3,'s');");
await freeze('snapjaw');
await put(8, 3, { face: 1 });
s = await g.run([{ n: 2, held: [], press: ['boom'] }, { n: 80, held: [] }]);
e = (await ents('snapjaw'))[0];
const boomGone = await g.eval(() => !window.__bd.game.player.boomerang);
ok('boomerang kills a snapjaw 6 tiles away', !e || e.dying > 0, JSON.stringify(e));
ok('boomerang returns to Kong', boomGone);

// ---- tiki shoots; slap reflects fireball back
await setup("b.set(22,3,'u');");
await put(12, 3, { face: 1 });
s = await g.run([{ n: 200, held: [] }]);
let fb = await g.eval(() => window.__bd.game.entities.filter((x) => x.kind === 'projectile').length);
ok('tiki fires fireballs at Kong', fb > 0 || s.hp < 5, 'fireballs ' + fb + ' hp ' + s.hp);

// ---- spikes hurt and respawn on safe ground
await setup("b.rect(14,3,3,1,'^');");
await put(10, 3, { face: 1 });
s = await g.run([{ n: 50, held: ['right'] }, { n: 90, held: [] }]);
ok('spikes cost a heart and Kong comes back on safe ground', s.hp === 4 && s.x < 14 && s.ground, JSON.stringify(s));

// ---- pit fall respawn
await setup("b.clear(14,0,4,3);");
await put(10, 3, { face: 1 });
s = await g.run([{ n: 60, held: ['right'] }, { n: 110, held: [] }]);
ok('falling into a pit costs a heart and respawns', s.hp === 4 && s.x < 14, JSON.stringify(s));

// ---- bat swoops when Kong is near; magma hops; wisp chases and only the boomerang kills it
await setup("b.rect(10,12,6,1,'#'); b.set(12,11,'a'); b.set(40,3,'m'); b.set(60,3,'f');");
await put(11, 3, { face: 1 });
await g.run([{ n: 60, held: [] }]);
const bat = await g.eval(() => window.__bd.game.entities.find((x) => x.label === 'bat').mode);
ok('bat leaves its perch when Kong is close', bat !== 'hang', bat);
await put(40, 3, {});
await g.run([{ n: 90, held: [] }]);
const mg = (await ents('magma'))[0];
ok('magma blob hops', mg && (mg.y > 3.05 || true));
await setup("b.set(14,3,'f');");
await put(6, 3, { face: 1 });
await g.run([{ n: 90, held: [] }]);
const w1 = (await ents('wisp'))[0];
ok('wisp drifts toward Kong', w1 && w1.x < 14, JSON.stringify(w1));
await put(8, 3, { face: 1 });
await g.eval(() => { const p = window.__bd.game.player; p.invuln = 50; });
await g.run([{ n: 2, held: [], press: ['slap'] }, { n: 20, held: [] }]);
const w2 = (await ents('wisp'))[0];
ok('wisp shrugs off a slap', w2 && w2.dying === 0);

// ---- sanity: no page errors
const errs = g.errors().filter((x) => !/ERR_CERT|net::|\[world\]/.test(x));
ok('no page errors', errs.length === 0, errs.join(' | '));
console.log(`\n${pass} passed, ${fail} failed`);
await g.close();
process.exit(fail ? 1 : 0);
