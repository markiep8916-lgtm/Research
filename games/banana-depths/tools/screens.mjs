// Captures the README gallery into docs/screens/*.jpg (headless Chromium, software GL, a few seconds per shot).
//   node tools/screens.mjs
import { openGame } from './harness.mjs';
import { mkdirSync } from 'node:fs';

mkdirSync('docs/screens', { recursive: true });
const g = await openGame({ w: 1280, h: 720, query: '?manual' });
const shot = async (name, settle = 220) => { await g.step(settle); /* game time: lets the room title banner fade */ await g.page.waitForTimeout(300); await g.page.screenshot({ path: `docs/screens/${name}.jpg`, type: 'jpeg', quality: 80 }); console.log('wrote', name); };

await g.step(40);
await shot('title', 10);
await g.eval(() => { const G = window.__bd.game; G.newGame(); G.save.abilities = { roll: true, pound: true, grip: true, boom: true }; G.save.hp = G.save.hpMax = 5; });

const SHOTS = [
  ['jungle', 'j_canopy', '1', [['right', 70]]], ['temple', 't_hall', '1', [['right', 50]]], ['caverns', 'c_web', '1', [['right', 20]]],
  ['quarry', 'q_forge', '1', [['right', 90]]], ['tower', 'g_base', '1', [['up', 90], ['right', 45]]],
];
for (const [name, room, portal, runs] of SHOTS) {
  await g.eval(({ room, portal }) => {
    const G = window.__bd.game; G.state = 'play'; G.loadRoom(room, { portal }); G.player.grace = 99;
    if (G.room.def.portals[portal].side === 'bottom') G.continueClimb(true);   // arrive climbing, as in play
  }, { room, portal });
  for (const [dir, n] of runs) await g.run([{ n, held: [dir] }]);
  await g.step(20);
  await shot(name);
}
// the Tiki Overlord winding up a barrel
await g.eval(() => { const G = window.__bd.game; G.state = 'play'; G.loadRoom('g_top', { portal: '1' }); G.player.place(25.5, 3, 1); G.player.grace = 99; G.save.hp = G.save.hpMax; });
await g.step(250);
await g.eval(() => { const G = window.__bd.game; G.player.grace = 99; });
await g.step(40);
await shot('boss');
await g.close();
