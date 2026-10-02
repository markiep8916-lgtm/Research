// Static fairness lint: no enemy within 6 tiles of an arrival point, and hazards / missing floor near it.
//   node tools/arrival-lint.mjs
import { ROOM_LIST } from '../src/world/world.js';
import { arrivalFor } from './solver.mjs';
import { T, FLAGS, F_SOLID, F_HAZARD } from '../src/sim/tiles.js';

const ENEMY = new Set(['snapjaw', 'thornbug', 'bat', 'tiki', 'tikiR', 'magma', 'spider', 'wisp', 'cannon', 'cannonR']);
let warn = 0;
for (const def of ROOM_LIST) {
  for (const ch of Object.keys(def.portals)) {
    const a = arrivalFor(def, ch);
    const issues = [];
    for (const m of def.marks) {
      if (!ENEMY.has(m.kind)) continue;
      const d = Math.hypot(m.x + 0.5 - a.x, m.y - a.y);
      if (d < 6) issues.push(`${m.kind}@${m.x},${m.y} is ${d.toFixed(1)} tiles away`);
    }
    // hazards in the 5x4 area around the arrival and a solid floor below it (side portals)
    const side = def.portals[ch].side;
    if (side === 'left' || side === 'right') {
      const tx = Math.floor(a.x), ty = Math.floor(a.y);
      const t = (x, y) => def.tiles[y * def.w + x];
      let floor = false;
      for (const x of [tx - 1, tx, tx + 1]) if (FLAGS[t(x, ty - 1)] & F_SOLID) floor = true;
      if (!floor) issues.push('no solid floor under the arrival spot');
      for (let y = ty - 1; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) {
        if (x < 0 || x >= def.w || y < 0 || y >= def.h) continue;
        if (FLAGS[t(x, y)] & F_HAZARD) issues.push(`hazard tile ${t(x, y)} at ${x},${y}`);
      }
    }
    if (issues.length) { warn++; console.log(`WARN ${def.id}:${ch} (${side}) arrival (${a.x.toFixed(1)},${a.y}): ${issues.join('; ')}`); }
  }
}
console.log(warn ? `\n${warn} arrival(s) need a look` : 'all arrivals pass the fairness lint');
process.exit(warn ? 1 : 0);
