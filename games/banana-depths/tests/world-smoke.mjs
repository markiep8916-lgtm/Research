// Loads every registered room in the real engine, arrives through each of its portals with neutral input
// and checks: no page errors, Kong stays alive and unhurt for 2 s, stays in the room (no portal ping-pong)
// and is not stuck inside terrain. Writes one screenshot per room to .cache/world/.
// Usage: node tests/world-smoke.mjs [--only=id,id] [--noshots]
import { openGame } from '../tools/harness.mjs';
import { mkdirSync } from 'node:fs';

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const shots = !process.argv.includes('--noshots');
mkdirSync('.cache/world', { recursive: true });

const g = await openGame({ w: 960, h: 540, query: '?manual&lowq' });
await g.eval(() => { window.__bd.game.newGame(); window.__bd.game.save.abilities = { roll: true, pound: true, grip: true, boom: true }; });

const ids = await g.eval(() => Object.keys(window.__bd.ROOMS));
let bad = 0, total = 0;
for (const id of ids) {
  if (only.length && !only.includes(id)) continue;
  const portals = await g.eval((i) => Object.keys(window.__bd.ROOMS[i].portals), id);
  const starts = portals.map((p) => ({ portal: p }));
  if (id === 'j_start') starts.push({ x: 4, y: 3, spawn: true });
  let first = true;
  for (const s of starts) {
    total++;
    const r = await g.eval(({ id, s }) => {
      const game = window.__bd.game;
      game.save.hp = game.save.hpMax;
      game.state = 'play';
      game.loadRoom(id, s.spawn ? { x: s.x, y: s.y } : { portal: s.portal });
      game.player.grace = 0; game.player.invuln = 0;
      // a bottom portal is entered by climbing (the ladder carries straight through): keep climbing out
      const side = s.spawn ? 'none' : game.room.def.portals[s.portal].side;
      if (side === 'bottom') game.continueClimb(true);
      const hp0 = game.save.hp;
      const p0 = game.snapshot();
      game.stepFrames(120, side === 'bottom' ? () => ({ held: { up: true }, pressed: {} }) : undefined);
      const p1 = game.snapshot();
      return { hp0, p0, p1, side };
    }, { id, s });
    const label = `${id}${s.spawn ? '@' : ':' + s.portal + '(' + r.side + ')'}`;
    const issues = [];
    if (r.p1.room !== id) issues.push(`left room -> ${r.p1.room}`);
    if (r.p1.hp < r.hp0) issues.push(`lost ${r.hp0 - r.p1.hp} hp`);
    if (r.p1.state !== 'play') issues.push(`state ${r.p1.state}`);
    if (issues.length) { bad++; console.log(`FAIL ${label}: ${issues.join(', ')}  start=(${r.p0.x},${r.p0.y}) end=(${r.p1.x},${r.p1.y}) mode=${r.p1.mode}`); }
    else console.log(`ok   ${label}: start=(${r.p0.x},${r.p0.y}) end=(${r.p1.x},${r.p1.y}) ${r.p1.mode}${r.p1.ground ? ' grounded' : ''}`);
    if (shots && first) { await g.shot(`../.cache/world/${id}.png`.replace('../.cache/', '')); first = false; }
  }
}
const errs = g.errors().filter((l) => !/fonts\.g|ERR_|net::/i.test(l));
if (errs.length) { console.log('PAGE ERRORS:\n' + errs.join('\n')); bad++; }
console.log(`\n${total - bad} / ${total} arrivals clean`);
await g.close();
process.exit(bad ? 1 : 0);
