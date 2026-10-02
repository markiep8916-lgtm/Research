// Per-room reachability report (+ annotated PNG).
//   node tools/room-report.mjs --area=jungle --abil=roll --png
//   node tools/room-report.mjs --rooms=j_start,j_canopy --abil=roll,pound,grip,boom --from=1 --png
// --from=<portal digit> limits the starting portal (default: every portal of the room)
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { solveRoom, summarize, arrivalFor, nerfPhysics } from './solver.mjs';
import { renderRooms } from './render-room.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
// --module=<path to a rooms file exporting `rooms`>  tests a scratch file without loading the whole world
let ROOM_LIST, ROOMS;
if (args.module) { const m = await import(pathToFileURL(resolve(args.module)).href); ROOM_LIST = m.rooms; }
else { const m = await import('../src/world/world.js'); ROOM_LIST = m.ROOM_LIST; }
ROOMS = Object.fromEntries(ROOM_LIST.map((r) => [r.id, r]));
const abil = Object.fromEntries((args.abil || '').split(',').filter(Boolean).map((a) => [a, true]));
let rooms = ROOM_LIST;
if (args.area) rooms = rooms.filter((r) => r.area === args.area);
if (args.rooms) rooms = args.rooms.split(',').map((id) => { if (!ROOMS[id]) throw new Error('unknown room ' + id); return ROOMS[id]; });
const items = [];
for (const def of rooms) {
  const chs = args.from ? String(args.from).split(',') : [...Object.keys(def.portals)];
  const startMark = def.marks.find((x) => x.kind === 'start');
  const starts = chs.filter((ch) => ch !== '@').map((ch) => ({ ...arrivalFor(def, ch), label: ch }));
  if (startMark && (!args.from || chs.includes('@'))) starts.unshift({ x: startMark.x + 0.5, y: startMark.y, label: '@' });
  if (args.from && !chs.includes('@') && !starts.length) throw new Error('no such start');
  console.log(`\n== ${def.id} (${def.w}x${def.h}) abil=[${Object.keys(abil).join(',') || '-'}]`);
  const union = { states: new Map(), marks: new Set(), portals: new Set() };
  for (const st of starts) {
    const t0 = Date.now();
    const res = solveRoom(def, { abil, starts: [st] });
    const s = summarize(def, res);
    for (const [k, v] of res.states) union.states.set(k, v);
    for (const m of res.reach.marks) union.marks.add(m);
    if (args.margin) {
      const k = Number(args.margin === true ? 0.96 : args.margin);
      const restore = nerfPhysics(k);
      const res2 = solveRoom(def, { abil, starts: [st] });
      restore();
      const fragile = [];
      for (const ch of res.reach.portals) if (!res2.reach.portals.has(ch)) fragile.push('portal ' + ch);
      def.marks.forEach((m, i) => { if (['heart', 'relic', 'save', 'goal'].includes(m.kind) && res.reach.marks.has(i) && !res2.reach.marks.has(i)) fragile.push(`${m.kind}@${m.x},${m.y}`); });
      const b1 = summarize(def, res).bananas[0], b2 = summarize(def, res2).bananas[0];
      if (fragile.length) console.log(`  FRAGILE from ${st.label} (not reachable when movement is ${Math.round((1 - k) * 100)}% weaker): ${fragile.join(', ')}`);
      if (b2 < b1) console.log(`  note: ${b1 - b2} banana(s) need near-perfect jumps`);
    }
    console.log(`  from ${st.label}: portals [${s.portals.join(',')}]  bananas ${s.bananas[0]}/${s.bananas[1]}  hearts ${s.hearts.filter((h) => h.ok).length}/${s.hearts.length}  relics ${s.relics.map((r) => r.ability + (r.ok ? '+' : '-')).join(',') || '-'}  saves ${s.saves.filter((x) => x.ok).length}/${s.saves.length}  states ${res.states.size} (${Date.now() - t0}ms)`);
  }
  const missing = [];
  def.marks.forEach((m, i) => { if (['banana', 'heart', 'relic', 'save', 'goal'].includes(m.kind) && !union.marks.has(i)) missing.push(i); });
  if (missing.length) console.log('  UNREACHABLE: ' + missing.map((i) => `${def.marks[i].kind}@${def.marks[i].x},${def.marks[i].y}`).join('  '));
  items.push({ file: def.id, title: `${def.id}  ${def.w}x${def.h}  abil=[${Object.keys(abil).join(',') || '-'}]  from=${chs.join(',')}`, w: def.w, h: def.h, tiles: [...def.tiles], marks: def.marks, portals: def.portals, states: [...union.states.values()].map((s) => ({ x: s.x, y: s.y, mode: s.mode })), missing });
}
if (args.png) { const paths = await renderRooms(items, '.cache/rooms'); console.log('\nPNG: ' + paths.join('\n     ')); }
