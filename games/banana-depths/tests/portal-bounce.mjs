// Jumping (not climbing) into a top portal must not bounce Kong straight back through the matching bottom portal.
import { openGame } from '../tools/harness.mjs';
const g = await openGame({ w: 640, h: 360, query: '?manual&lowq' });
await g.eval(() => { const G = window.__bd.game; G.newGame(); G.save.abilities = { roll: true, pound: true, grip: true, boom: true }; });
const pairs = await g.eval(() => {
  const out = [];
  for (const def of Object.values(window.__bd.ROOMS)) for (const [ch, p] of Object.entries(def.portals)) {
    const dest = window.__bd.ROOMS[p.to];
    if (p.side === 'top' && dest.portals[p.at].side === 'bottom') out.push({ room: def.id, ch, to: p.to, at: p.at });
  }
  return out;
});
let bad = 0;
for (const pr of pairs) {
  const r = await g.eval(({ pr }) => {
    const G = window.__bd.game;
    G.state = 'play'; G.save.hp = G.save.hpMax;
    G.loadRoom(pr.room, { portal: pr.ch });
    // the top-portal arrival spot is a safe, clear shaft: shoot Kong up it (a spring or wall-jump, NOT climbing)
    G.player.body.vy = 16;
    G.player.grace = 5;
    const seen = [];
    for (let i = 0; i < 400; i++) { G.tick(1 / 60); const id = G.room.def.id; if (seen[seen.length - 1] !== id) seen.push(id); }
    return { seen, mode: G.player.body.mode, state: G.state, room: G.room.def.id };
  }, { pr });
  const ok = r.seen.length <= 2 && r.room === pr.to;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${pr.room}:${pr.ch} -> ${pr.to}:${pr.at}   rooms seen: ${r.seen.join(' > ')}  final mode ${r.mode}`);
}
await g.close();
process.exit(bad ? 1 : 0);
