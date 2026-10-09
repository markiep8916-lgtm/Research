// prologue: battle arenas (browser, TECH_PLAN 2.5 and 7.5).
//   pro_bridge   the POC Observation Bridge for the SENTINEL, with two red alarm lamps on the
//                window wall. react: cue 'sentinel_alarm' (its 50% beat, G2 C1-4) starts the lamps
//                strobing red and the consoles throwing sparks for the rest of the fight.

import { ARENAS } from '../../battle/arena.js';
import { makeGlow } from '../../core/vfx.js';

const RED = '#ff3b4e';
const LAMPS = [[-5.2, 3.3], [5.6, 3.3]];       // x, y on the window wall
const CONSOLES = [[-9, 0.9], [-7.9, 0.9], [7.4, 0.9], [8.5, 0.9]];

function proBridge(kit) {
  const out = ARENAS.bridge.build(kit) || {};
  const z = kit.WALL_Z + 0.25;
  const A = { on: false, sparkT: 0, lamps: [] };
  for (const [x, y] of LAMPS) {
    const glow = kit.add(makeGlow(RED, 1.4, 0.35));
    glow.position.set(x, y, z);
    const light = kit.pointLight({ color: RED, intensity: 0, distance: 11, decay: 1.5, position: [x, y - 0.4, z + 1.2] });
    A.lamps.push({ glow, light, base: glow.material.color.clone() });
  }
  kit.alarm = A;
  kit.updaters.push((dt, t) => {
    // dim, slow-breathing beacons; once the alarm sounds, a hard strobe and sparks from the consoles
    A.lamps.forEach((l, i) => {
      const lit = A.on ? (Math.sin(t * 11 + i * Math.PI) > 0 ? 1 : 0.12) : 0.3 + 0.1 * Math.sin(t * 1.5 + i);
      l.glow.material.color.copy(l.base).multiplyScalar(lit * (A.on ? 3.2 : 1));
      l.light.intensity = A.on ? 26 * lit : 0;
    });
    if (!A.on) return;
    A.sparkT -= dt;
    if (A.sparkT <= 0) {
      A.sparkT = 0.5 + Math.random() * 0.6;
      const [x, y] = CONSOLES[Math.floor(Math.random() * CONSOLES.length)];
      kit.particles?.emit('spark', [x, y, kit.WALL_Z + 0.6], { count: 14 });
    }
  });
  return out;
}

function proBridgeReact(kit, e) {
  if (e.type !== 'cue' || e.name !== 'sentinel_alarm' || !kit.alarm) return;
  kit.alarm.on = true;
  kit.alarm.sparkT = 0;
  for (const [x, y] of LAMPS) kit.particles?.emit('spark', [x, y, kit.WALL_Z + 0.4], { count: 24 });
}

export default {
  pro_bridge: {
    theme: ARENAS.bridge.theme, build: proBridge, react: proBridgeReact,
    textures: ARENAS.bridge.textures,
  },
};
