// Feasibility check for the three boss fights: a simple bot (slap while the boss is vulnerable, slap thrown barrels
// back at the Overlord) must be able to kill each boss inside the time limit. Kong is kept invulnerable here:
// this proves the damage routes work end to end (state machine, hit rules, camera, defeat flag, gate opening),
// not that a human can dodge. Usage: node tests/boss-bot.mjs [golem|queen|overlord]
import { openGame } from '../tools/harness.mjs';

const want = process.argv[2];
const g = await openGame({ w: 960, h: 540, query: '?manual&lowq' });
await g.eval(() => { const game = window.__bd.game; game.newGame(); game.save.abilities = { roll: true, pound: true, grip: true, boom: true }; });

const ARENAS = [
  { kind: 'golem', room: 't_golem', portal: '1' },
  { kind: 'queen', room: 'c_queen', portal: '1' },
  { kind: 'overlord', room: 'g_top', portal: '1' },
];
let failed = 0;
for (const a of ARENAS) {
  if (want && want !== a.kind) continue;
  const r = await g.eval(({ a }) => {
    const bd = window.__bd, game = bd.game;
    game.save.hp = game.save.hpMax; game.save.flags = {}; game.state = 'play';
    game.loadRoom(a.room, { portal: a.portal });
    // vertical entrances (g_top) pop Kong into a ladder shaft: start him on the arena floor instead
    if (game.bossDef) { game.player.place(4.5, game.bossDef.y, 1); game.player.snap(); }
    const log = { hits: 0, maxHp: 0, t: 0, phases: new Set(), states: new Set(), gateOpen: false };
    const sign = (v) => (v < 0 ? -1 : 1);
    let slapCd = 0;
    const brain = () => {
      const p = game.player, b = p.body, boss = game.boss;
      const held = {}, pressed = {};
      p.grace = 9; p.invuln = 9;
      slapCd--;
      if (!boss) {                                  // walk to the arena trigger
        const tx = game.bossDef ? game.bossDef.x : game.room.w / 2;
        held[b.x < tx ? 'right' : 'left'] = true;
        if (game.state !== 'play') return { held: {}, pressed: {} };
        return { held, pressed };
      }
      log.maxHp = boss.maxHp; log.states.add(boss.stateName); log.phases.add(boss.phase);
      const dx = boss.x - b.x;
      const reach = boss.hw + 1.5;
      if (a.kind === 'overlord') {
        // hostile barrels: slap them back when they are one swing away
        const barrel = game.entities.find((e) => e.reflectable && !e.friendly && Math.abs(e.x - b.x) < 3.2 && Math.abs((e.y + 0.4) - (b.y + 1)) < 1.6);
        if (barrel) {
          if (sign(barrel.x - b.x) !== b.face) { held[barrel.x > b.x ? 'right' : 'left'] = true; }
          else if (slapCd <= 0 && Math.abs(barrel.x - b.x) < 2.0) { pressed.slap = true; slapCd = 14; }
          return { held, pressed };
        }
      }
      if (boss.vulnerable) {
        if (Math.abs(dx) > reach - 0.5) held[dx > 0 ? 'right' : 'left'] = true;
        else if (sign(dx) !== b.face) held[dx > 0 ? 'right' : 'left'] = true;
        else if (slapCd <= 0) { pressed.slap = true; slapCd = 12; }
      } else {
        // hold station on the far side of the arena, facing the boss
        const home = dx > 0 ? boss.arena.x0 + 4 : boss.arena.x1 - 4;
        const want = a.kind === 'overlord' ? boss.x + (b.x > boss.x ? 10 : -10) : home;
        const clampX = Math.min(boss.arena.x1 - 3, Math.max(boss.arena.x0 + 3, want));
        if (Math.abs(clampX - b.x) > 0.7) held[clampX > b.x ? 'right' : 'left'] = true;
        else if (sign(dx) !== b.face) held[dx > 0 ? 'right' : 'left'] = true;
      }
      return { held, pressed };
    };
    game.input.scripted = brain;
    let frames = 0, defeatedAt = -1, lastHp = -1;
    for (; frames < 60 * 150; frames++) {
      game.tick(1 / 60);
      const bs = game.boss;
      if (bs && bs.hp !== lastHp) { if (lastHp >= 0 && bs.hp < lastHp) log.hits++; lastHp = bs.hp; }
      if (game.save.flags['boss:' + a.kind] && defeatedAt < 0) defeatedAt = frames;
      if (defeatedAt >= 0 && frames - defeatedAt > 120) break;
    }
    game.input.scripted = null;
    // gate opens (E tiles gone) after the defeat
    let gates = 0;
    for (let y = 0; y < game.grid.h; y++) for (let x = 0; x < game.grid.w; x++) if (game.grid.tile(x, y) === 13) gates++;   // T.GATE_B
    return { kind: a.kind, defeatedAt, secs: +(defeatedAt / 60).toFixed(1), hits: log.hits, maxHp: log.maxHp, phases: [...log.phases], states: [...log.states], gatesLeft: gates, state: game.state, snap: game.snapshot() };
  }, { a });
  const ok = r.defeatedAt >= 0 && r.gatesLeft === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.kind}: ${r.defeatedAt >= 0 ? 'defeated after ' + r.secs + 's' : 'NOT defeated (boss hp ' + (r.snap.boss ? r.snap.boss.hp : '?') + '/' + r.maxHp + ')'}, ${r.hits} hits of ${r.maxHp} hp, phases ${r.phases.join(',')}, gate tiles left ${r.gatesLeft}, states ${r.states.join('/')}`);
}
const errs = g.errors().filter((l) => !/fonts\.g|ERR_|net::|\[world\]/i.test(l));
if (errs.length) { console.log('PAGE ERRORS:\n' + errs.join('\n')); failed++; }
await g.close();
process.exit(failed ? 1 : 0);
