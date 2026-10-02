// Ghost run: replays the solver's own routes in the REAL game engine (headless Chromium) to prove that the solver's
// physics model matches the game. For every start portal of each room it takes the macro chain that reaches each
// portal / heart / relic, puts Kong at the start of each macro, feeds the recorded inputs through the real tick loop
// (enemies removed; crumble blocks, springs, ladders live) and checks that he ends where the solver said he would.
//
//   node tools/ghost.mjs [--area=jungle] [--rooms=a,b] [--abil=roll,pound] [--from=1] [--nobuild] [--verbose]
//
// Without --abil each room gets the abilities the spec says Kong holds there (see HELD below).
import { execFileSync } from 'node:child_process';
import { ROOM_LIST, ROOMS } from '../src/world/world.js';
import { solveRoom, arrivalFor, chainFor } from './solver.mjs';
import { openGame } from './harness.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const ALL = { roll: true, pound: true, grip: true, boom: true };
const toAbil = (list) => Object.fromEntries(list.filter(Boolean).map((a) => [a, true]));
const HELD = (def) => {
  if (args.abil !== undefined) return toAbil(String(args.abil === true ? '' : args.abil).split(','));
  switch (def.area) {
    case 'jungle': return def.id === 'j_log' ? toAbil(['roll']) : {};
    case 'temple': return toAbil(['roll']);
    case 'cavern': return toAbil(def.id === 'c_grip' || def.id === 'c_deep' ? ['roll', 'pound', 'grip'] : ['roll', 'pound']);
    case 'quarry': return def.id === 'q_lift' ? ALL : toAbil(['roll', 'pound', 'grip']);
    default: return ALL;
  }
};

if (!args.nobuild) execFileSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });

/** Runs inside the page: replays one macro chain in the live engine. */
function replayInPage({ roomId, pre, chain, abil, target }) {
  const bd = window.__bd, game = bd.game, P = bd.P;
  const out = { ok: false, macros: chain.length, frames: 0, mismatch: null, reached: false, note: '' };
  game.state = 'play';
  game.transition = null;
  game.save.abilities = { roll: !!abil.roll, pound: !!abil.pound, grip: !!abil.grip, boom: !!abil.boom };
  game.save.broken = {}; game.save.flags = {}; game.save.collected = {};
  game.save.hp = game.save.hpMax = 3;
  if (pre.broken.length) game.save.broken[roomId] = pre.broken.slice();
  if (pre.gateA) game.save.flags['gateA:' + roomId] = true;
  if (pre.gateB) game.save.flags['gateB:' + roomId] = true;
  const s0 = chain[0].start;
  game.loadRoom(roomId, { x: s0.x, y: s0.y, face: s0.face || 1 });
  for (const e of game.entities.slice()) if (e.kind === 'enemy' || e.kind === 'projectile') e.destroy();
  game.entities = game.entities.filter((e) => !e.dead);
  const def = game.room.def, p = game.player, b = p.body;
  const mark = target.mark != null ? def.marks[target.mark] : null;
  const box = mark ? { l: mark.x, r: mark.x + 1, b: mark.y, t: mark.y + (mark.kind === 'relic' ? 2 : 1.4) } : null;
  const heartId = mark && mark.kind === 'heart' ? `${def.id}:h:${mark.x},${mark.y}` : null;
  const fmt = (v) => +v.toFixed(2);
  const check = (s, i) => {
    if (out.mismatch) return;
    if (Math.abs(b.x - s.x) > 0.12 || Math.abs(b.y - s.y) > 0.12) out.mismatch = { macro: i, expected: { x: fmt(s.x), y: fmt(s.y), mode: s.mode }, actual: { x: fmt(b.x), y: fmt(b.y), mode: b.mode, hp: game.save.hp } };
  };
  for (let i = 0; i < chain.length && !out.reached; i++) {
    const m = chain[i], s = m.start;
    if (i > 0) check(s, i - 1);                      // did the previous macro end where the next one starts?
    p.place(s.x, s.y, s.face || 1);
    b.vy = s.vy || 0;
    if (s.mode === 'ball') { b.mode = 'roll'; b.hw = P.rollHw; b.h = P.rollH; b.rollT = 0; b.ground = true; }
    else if (s.mode === 'climb') { b.mode = 'climb'; b.x = Math.floor(s.x) + 0.5; }
    else if (s.mode === 'wall') { b.vy = -1; b.sliding = s.dir; b.wallDir = s.dir; b.wallCoyote = 0.1; }
    p.grace = 1e9; p.invuln = 0; p.snap();
    const ins = m.inputs;
    let k = 0;
    game.input.scripted = () => {
      const v = ins[Math.min(k, ins.length - 1)]; k++;
      const dx = (v & 3) - 1, dy = ((v >> 2) & 3) - 1;
      return { held: { left: dx < 0, right: dx > 0, up: dy > 0, down: dy < 0, jump: !!(v & 16) }, pressed: { jump: !!(v & 32), roll: !!(v & 64), slap: !!(v & 128) } };
    };
    for (let f = 0; f < ins.length; f++) {
      game.tick(1 / 60); out.frames++;
      if (game.state === 'itemget') { if (target.kind === 'relic') { out.reached = true; break; } game.endItemGet(); game.state = 'play'; }
      if (game.state === 'transition') {
        const ch = game.transition.portal.ch;
        game.transition = null; game.state = 'play';
        if (target.kind === 'portal' && ch === target.portal) { out.reached = true; break; }
        out.note = 'touched portal ' + ch + ' (expected ' + (target.portal || 'none') + ')';
        out.mismatch = out.mismatch || { macro: i, expected: { portal: target.portal }, actual: { portal: ch } };
        break;
      }
      if (box && b.x + b.hw > box.l && b.x - b.hw < box.r && b.y + b.h > box.b && b.y < box.t) {
        for (let j = 0; j < 4; j++) game.tick(1 / 60);          // let the pickup register
        out.reached = true; break;
      }
    }
    if (out.mismatch && out.mismatch.actual && out.mismatch.actual.portal) break;
  }
  game.input.scripted = null;
  if (out.reached && heartId && !game.save.collected[heartId]) { out.reached = false; out.note = 'standing on the heart did not pick it up'; }
  if (!out.reached && !out.mismatch) { const last = chain[chain.length - 1]; out.mismatch = { macro: chain.length - 1, expected: { target: target.kind + (target.portal || target.mark) }, actual: { x: fmt(b.x), y: fmt(b.y), mode: b.mode, hp: game.save.hp } }; void last; }
  out.ok = out.reached && !out.mismatch;
  out.hp = game.save.hp;
  return out;
}

const only = args.rooms ? String(args.rooms).split(',') : null;
const rooms = ROOM_LIST.filter((r) => !r.props.bossRoom && r.id !== 'g_heart' && (!only || only.includes(r.id)) && (!args.area || r.area === args.area));
const g = await openGame({ w: 640, h: 360, query: '?manual&lowq' });
await g.eval(() => window.__bd.game.newGame());
let fails = 0, total = 0;
for (const def of rooms) {
  const abil = HELD(def);
  const starts = (args.from ? String(args.from).split(',') : Object.keys(def.portals)).filter((c) => c !== '@').map((ch) => ({ ...arrivalFor(def, ch), label: ch }));
  const startMark = def.marks.find((m) => m.kind === 'start');
  if (startMark && (!args.from || String(args.from).split(',').includes('@'))) starts.unshift({ x: startMark.x + 0.5, y: startMark.y, face: 1, vy: 0, label: '@' });
  console.log(`\n== ${def.id}  abil=[${Object.keys(abil).join(',') || '-'}]`);
  for (const st of starts) {
    const t0 = Date.now();
    const res = solveRoom(def, { abil, starts: [st], trace: true });
    const targets = [];
    for (const [ch, tr] of res.traces.portals) targets.push({ kind: 'portal', portal: ch, tr });
    for (const [i, tr] of res.traces.marks) { const m = def.marks[i]; if (m.kind === 'heart' || m.kind === 'relic') targets.push({ kind: m.kind, mark: i, tr, label: `${m.kind}@${m.x},${m.y}` }); }
    const slim = (tr) => chainFor(tr).map((c) => ({ start: { x: c.start.x, y: c.start.y, mode: c.start.mode, face: c.start.face, dir: c.start.dir, vy: c.start.vy }, inputs: Array.from(c.inputs) }));
    const pre = { broken: [...res.broken], gateA: res.gates.A, gateB: res.gates.B };
    const line = [];
    for (const t of targets) {
      total++;
      const r = await g.eval(replayInPage, { roomId: def.id, pre, chain: slim(t.tr), abil, target: { kind: t.kind, portal: t.portal, mark: t.mark } });
      const label = t.kind === 'portal' ? `portal ${t.portal}` : t.label;
      if (r.ok) line.push(`${label} ok(${r.macros}m/${r.frames}f)`);
      else { fails++; line.push(`${label} FAIL ${JSON.stringify(r.mismatch)} ${r.note}`); }
    }
    console.log(`  from ${st.label}: ${line.length ? line.join('  ') : '(nothing reachable)'}   [${Date.now() - t0}ms]`);
  }
}
const errs = g.errors().filter((l) => !/fonts\.g|ERR_|net::|\[world\]/i.test(l));
if (errs.length) { console.log('PAGE ERRORS:\n' + errs.join('\n')); fails++; }
console.log(`\nghost runs: ${total - fails} / ${total} routes replayed in the real engine`);
await g.close();
process.exit(fails ? 1 : 0);
