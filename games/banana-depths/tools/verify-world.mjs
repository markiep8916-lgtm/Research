// Whole-world progression check. Simulates the game stage by stage with the real physics:
//   stage k: explore everything reachable with the abilities held so far (breaking crates, flipping switches,
//   assuming each boss is beatable once its arena is reached), then collect the relics found -> next stage.
// Reports: ability order, rooms by stage, unreachable rooms/items, one-way portals, gating-order violations.
//   node tools/verify-world.mjs [--quiet] [--png]
import { ROOM_LIST, ROOMS, START, validateWorld } from '../src/world/world.js';
import { solveRoom, summarize, arrivalFor } from './solver.mjs';
import { renderRooms } from './render-room.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const log = (...a) => { if (!args.quiet) console.log(...a); };

// Rooms that must not be reachable before the named ability has been collected.
const EXPECT = [
  { room: 't_gate', needs: 'roll' },
  { room: 'c_drop', needs: 'pound' },
  { room: 'c_deep', needs: 'grip' },
  { room: 'g_base', needs: 'boom' },
];
const ORDER = ['roll', 'pound', 'grip', 'boom'];

const problems = [];
for (const e of validateWorld()) problems.push('PORTAL: ' + e);

const abil = { roll: false, pound: false, grip: false, boom: false };
const entries = new Map();   // room -> Map(label -> start state)
const rstate = new Map();    // room -> { broken:Set, gates:{A,B} }
const bossDone = new Set();
const firstStage = new Map(); // room -> stage first reached
const itemStage = new Map();  // "room:kind@x,y" -> stage
const cache = new Map();
const lastRes = new Map();
const granted = [];

entries.set('j_start', new Map([['@', { x: START.x, y: START.y, face: 1, label: '@' }]]));
const startMark = ROOMS.j_start.marks.find((m) => m.kind === 'start');
void startMark;

const sig = (o) => JSON.stringify(o);
function solve(def) {
  const rs = rstate.get(def.id) || { broken: new Set(), gates: { A: false, B: false } };
  const starts = [...entries.get(def.id).values()].sort((a, b) => (a.label > b.label ? 1 : -1));
  const gates = { A: rs.gates.A, B: rs.gates.B || (def.props.boss && bossDone.has(def.props.boss)) };
  const key = def.id + sig({ abil, starts, b: [...rs.broken].sort(), gates });
  if (cache.has(key)) return cache.get(key);
  const res = solveRoom(def, { abil, starts, broken: rs.broken, gates });
  rstate.set(def.id, { broken: res.broken, gates: { A: res.gates.A, B: bossDone.has(def.props.boss) ? rs.gates.B : res.gates.B } });
  cache.set(key, res);
  return res;
}

let stage = 0;
const t0 = Date.now();
for (; stage < 12; stage++) {
  // ---- fixed point of exploration with the current abilities
  for (let pass = 0; pass < 40; pass++) {
    let changed = false;
    for (const id of [...entries.keys()]) {
      const def = ROOMS[id];
      const res = solve(def);
      lastRes.set(id, res);
      if (!firstStage.has(id)) { firstStage.set(id, stage); changed = true; }
      for (const ch of res.reach.portals) {
        const p = def.portals[ch];
        const dest = ROOMS[p.to];
        if (!dest || !dest.portals[p.at]) continue;
        if (!entries.has(dest.id)) entries.set(dest.id, new Map());
        if (!entries.get(dest.id).has(p.at)) { entries.get(dest.id).set(p.at, { ...arrivalFor(dest, p.at), label: p.at }); changed = true; }
      }
      if (def.props.boss && !bossDone.has(def.props.boss) && def.marks.some((m, i) => m.kind === 'boss' && res.reach.marks.has(i))) { bossDone.add(def.props.boss); changed = true; log(`  [stage ${stage}] boss arena reached in ${id}: assuming '${def.props.boss}' is defeated`); }
      def.marks.forEach((m, i) => {
        if (res.reach.marks.has(i)) { const k = `${id}:${m.kind}@${m.x},${m.y}`; if (!itemStage.has(k)) itemStage.set(k, stage); }
      });
    }
    if (!changed) break;
  }
  // ---- collect relics
  const newly = [];
  for (const [id, res] of lastRes) {
    const def = ROOMS[id];
    def.marks.forEach((m, i) => { if (m.kind === 'relic' && res.reach.marks.has(i) && !abil[def.props.relic]) { abil[def.props.relic] = true; newly.push(def.props.relic + '@' + id); } });
  }
  log(`stage ${stage}: abilities=[${ORDER.filter((a) => abil[a] && !newly.some((n) => n.startsWith(a))).join(',') || '-'}]  rooms reached: ${[...firstStage].filter(([, s]) => s === stage).map(([r]) => r).join(', ') || '(none new)'}`);
  if (!newly.length) break;
  for (const n of newly) { granted.push([n, stage]); log(`   -> collected ${n}`); }
}

// ---- reports
const unreached = ROOM_LIST.filter((r) => !entries.has(r.id)).map((r) => r.id);
if (unreached.length) problems.push('UNREACHED ROOMS: ' + unreached.join(', '));
for (const a of ORDER) if (!abil[a]) problems.push(`ABILITY never obtained: ${a}`);
const order = granted.map(([n]) => n.split('@')[0]);
if (order.join() !== ORDER.filter((a) => order.includes(a)).join()) problems.push(`ability order is ${order.join(' -> ')}, intended ${ORDER.join(' -> ')}`);
const stageOfAbility = Object.fromEntries(granted.map(([n, s]) => [n.split('@')[0], s + 1]));
for (const e of EXPECT) {
  const fs = firstStage.get(e.room);
  if (fs === undefined) continue;
  if (fs < (stageOfAbility[e.needs] ?? 99)) problems.push(`GATE LEAK: ${e.room} reachable at stage ${fs}, before '${e.needs}' (stage ${stageOfAbility[e.needs]})`);
}
let totalH = 0, gotH = 0, totalB = 0, gotB = 0, goal = false;
const perRoom = [];
for (const def of ROOM_LIST) {
  const res = lastRes.get(def.id);
  if (!res) continue;
  const s = summarize(def, res);
  const miss = [];
  def.marks.forEach((m, i) => { if (['heart', 'relic', 'save', 'goal'].includes(m.kind) && !res.reach.marks.has(i)) miss.push(`${m.kind}@${m.x},${m.y}`); });
  totalH += s.hearts.length; gotH += s.hearts.filter((h) => h.ok).length; totalB += s.bananas[1]; gotB += s.bananas[0];
  if (s.goal) goal = true;
  if (miss.length) problems.push(`${def.id}: unreachable ${miss.join(' ')}`);
  if (s.bananas[0] < s.bananas[1]) problems.push(`${def.id}: ${s.bananas[1] - s.bananas[0]} banana(s) unreachable`);
  perRoom.push({ id: def.id, stage: firstStage.get(def.id), s });
}
if (!goal && ROOM_LIST.some((r) => r.marks.some((m) => m.kind === 'goal'))) problems.push('FINAL GOAL (golden banana) not reachable');
// one-way portals
for (const def of ROOM_LIST) for (const [ch, p] of Object.entries(def.portals)) {
  const res = lastRes.get(def.id);
  const dest = ROOMS[p.to];
  if (!res || !dest || !lastRes.get(dest.id)) continue;
  const there = lastRes.get(dest.id).reach.portals.has(p.at);
  const here = res.reach.portals.has(ch);
  if (here && !there) log(`  note: one-way: ${def.id}:${ch} -> ${p.to}:${p.at} (cannot return)`);
}

log('\nfirst reached (stage): ' + [...firstStage].map(([r, s]) => `${r}:${s}`).join('  '));
log('item stages:');
for (const [k, s] of itemStage) if (/:(heart|relic|goal)@/.test(k)) log(`  ${k}  stage ${s}`);
console.log(`\nhearts ${gotH}/${totalH}   bananas ${gotB}/${totalB}   rooms ${entries.size}/${ROOM_LIST.length}   goal ${goal ? 'REACHED' : 'no'}   (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
console.log(problems.length ? '\nPROBLEMS:\n - ' + problems.join('\n - ') : '\nOK: the game is completable and the gating order holds.');
if (args.png) {
  const items = ROOM_LIST.filter((d) => lastRes.get(d.id)).map((def) => {
    const res = lastRes.get(def.id), missing = [];
    def.marks.forEach((m, i) => { if (['banana', 'heart', 'relic', 'save', 'goal'].includes(m.kind) && !res.reach.marks.has(i)) missing.push(i); });
    return { file: 'world_' + def.id, title: `${def.id}  stage ${firstStage.get(def.id)}`, w: def.w, h: def.h, tiles: [...def.tiles], marks: def.marks, portals: def.portals, states: [...res.states.values()].map((s) => ({ x: s.x, y: s.y, mode: s.mode })), missing };
  });
  await renderRooms(items, '.cache/rooms');
}
process.exitCode = problems.length ? 1 : 0;
