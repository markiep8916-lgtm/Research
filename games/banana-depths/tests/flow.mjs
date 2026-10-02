import { openGame } from '../tools/harness.mjs';
const g = await openGame({ w: 960, h: 540 });
const p = g.page;
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${c ? '' : x}`); };
ok('boots to the title screen', (await g.snap()).state === 'title');
await p.keyboard.press('Enter'); await g.step(3);
let s = await g.snap();
ok('Enter starts a new game', s.state === 'play', JSON.stringify(s));
// real keyboard input
await p.keyboard.down('ArrowRight'); s = await g.step(45); await p.keyboard.up('ArrowRight');
ok('arrow keys move Kong', s.x > 8, 'x=' + s.x);
await p.keyboard.down('Space'); s = await g.step(10); await p.keyboard.up('Space');
ok('space jumps', s.y > 3.5 || s.vy > 0, JSON.stringify(s));
await g.step(60);
await p.keyboard.press('Escape'); s = await g.step(3);
ok('Escape pauses', s.state === 'pause');
await p.keyboard.press('Escape'); s = await g.step(3);
ok('Escape resumes', s.state === 'play');
await p.keyboard.press('KeyM'); s = await g.step(3);
ok('M opens the map', s.state === 'map');
await p.keyboard.press('KeyM'); s = await g.step(3);
ok('M closes the map', s.state === 'play');
// persistence
await g.eval(() => { const G = window.__bd.game; G.save.bananas = 12; G.save.hpMax = 4; G.save.hp = 4; G.save.abilities.roll = true; G.persist(); });
await p.reload(); await p.waitForFunction(() => window.__ready === true);
s = await g.snap();
ok('reload returns to title with a save present', s.state === 'title' && (await g.eval(() => window.__bd.game.hasSave)));
await p.keyboard.press('Enter'); await g.step(3);   // first selectable item is Continue
s = await g.snap();
ok('Continue restores the save', s.state === 'play' && s.bananas === 12 && s.hpMax === 4 && s.abil.roll === true, JSON.stringify(s));
// death and respawn
await g.eval(() => { const G = window.__bd.game; G.save.hp = 1; G.player.invuln = 0; G.player.grace = 0; G.state = 'play'; G.player.hurt(1, 0); });
s = await g.step(10);
ok('losing the last heart starts the death sequence', s.state === 'dead', s.state);
s = await g.step(160);
ok('Kong respawns with full health', s.state === 'play' && s.hp === s.hpMax, JSON.stringify(s));
console.log(`\n${pass} passed, ${fail} failed`);
console.log('errors:', g.errors().filter((e) => !/ERR_CERT|net::|\[world\]/.test(e)).join('\n') || 'none');
await g.close();
process.exit(fail ? 1 : 0);
