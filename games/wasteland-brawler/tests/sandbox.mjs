// Spawn enemies in an arena and let them fight. Screenshots every --every frames.
// node tests/sandbox.mjs --types punk,knifer [--stub missing1,missing2] [--stage 0] [--frames 900] [--every 150] [--html path] [--out dir] [--god] [--mash]
//   --god   hero takes no damage   --mash  hero mashes attack while facing the nearest enemy
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { openGame, argv, root, stubEnemies } from './lib.mjs';

const o = argv();
const out = resolve(o.out || join(root, 'tests', 'out', 'sandbox'));
mkdirSync(out, { recursive: true });
const g = await openGame(o.html);
const types = String(o.types || 'punk').split(',');
if (o.stub) console.log('stubbed:', await stubEnemies(g, String(o.stub).split(',')));
const frames = +(o.frames || 900), every = +(o.every || 150);
await g.ev(({ types, stage }) => window.__wb.sandbox(types, stage), { types, stage: +(o.stage || 0) });
let n = 0;
for (let f = 0; f < frames; f += 10) {
  await g.ev(({ god, mash, f }) => {
    const w = window.__wb, G = w.Game, p = G.player;
    if (god) { p.hp = p.maxHp; }
    if (mash && p) {
      const foes = G.foes().filter(e => !e.dying);
      const t = foes.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
      w.Input.key = {};
      if (t) {
        const dx = t.x - p.x, dy = t.y - p.y;
        if (Math.abs(dy) > 3) w.Input.key[dy > 0 ? 'down' : 'up'] = true;
        if (Math.abs(dx) > 26) w.Input.key[dx > 0 ? 'right' : 'left'] = true;
        else if (Math.sign(dx) !== p.facing) w.Input.key[dx > 0 ? 'right' : 'left'] = true;
      }
      for (let i = 0; i < 10; i++) { w.Input.key.attack = (f + i) % 6 === 0; w.step(1); }
      w.Input.key = {};
    } else w.step(10);
  }, { god: !!o.god, mash: !!o.mash, f });
  if (f % every === 0) await g.shot(join(out, `sb-${String(n++).padStart(2, '0')}.png`));
  if (f % 150 === 0) {
    const s = await g.ev(() => window.__wb.snapshot());
    console.log(`f${f}`, JSON.stringify({ hero: [s.pstate, s.hp], foes: s.foes.map(e => `${e.type}:${e.hp}:${e.state}`) }));
  }
}
console.log(g.errors.length ? 'ERRORS:\n' + g.errors.join('\n') : 'no page errors');
await g.close();
