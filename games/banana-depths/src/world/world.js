// World registry: every room, portal validation, start position, map totals.
import { rooms as jungleA } from './rooms/jungle.js';
import { rooms as jungleB } from './rooms/jungle_b.js';
import { rooms as templeA } from './rooms/temple.js';
import { rooms as templeB } from './rooms/temple_b.js';
import { rooms as cavernA } from './rooms/cavern.js';
import { rooms as cavernB } from './rooms/cavern_b.js';
import { rooms as quarryA } from './rooms/quarry.js';
import { rooms as quarryB } from './rooms/quarry_b.js';
import { rooms as towerA } from './rooms/tower.js';
import { rooms as towerB } from './rooms/tower_b.js';
import { rooms as bosses } from './rooms/bosses.js';

// each area's rooms are split over two files (`<area>.js` and `<area>_b.js`) so two designers could work in parallel
export const ROOM_LIST = [...jungleA, ...jungleB, ...templeA, ...templeB, ...cavernA, ...cavernB, ...quarryA, ...quarryB, ...towerA, ...towerB, ...bosses];
export const ROOMS = Object.fromEntries(ROOM_LIST.map((r) => [r.id, r]));

export function validateWorld() {
  const errors = [];
  for (const r of ROOM_LIST) {
    for (const [ch, p] of Object.entries(r.portals)) {
      const dest = ROOMS[p.to];
      if (!dest) { errors.push(`${r.id}: portal ${ch} -> unknown room ${p.to}`); continue; }
      const back = dest.portals[p.at];
      if (!back) errors.push(`${r.id}: portal ${ch} -> ${p.to} has no portal '${p.at}'`);
      else if (back.to !== r.id) errors.push(`${r.id}: portal ${ch} -> ${p.to}:${p.at} does not lead back (goes to ${back.to})`);
    }
  }
  return errors;
}

const startRoom = ROOMS.j_start;
const startMark = startRoom && startRoom.marks.find((m) => m.kind === 'start');
export const START = startRoom ? { room: 'j_start', x: startMark.x + 0.5, y: startMark.y } : { room: null, x: 0, y: 0 };

export const TOTALS = (() => {
  let bananas = 0, hearts = 0, relics = 0;
  for (const r of ROOM_LIST) for (const m of r.marks) { if (m.kind === 'banana') bananas++; else if (m.kind === 'heart') hearts++; else if (m.kind === 'relic') relics++; }
  return { bananas, hearts, relics, collectibles: bananas + hearts + relics };
})();
