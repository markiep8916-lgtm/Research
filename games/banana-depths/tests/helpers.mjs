import { RoomBuilder } from '../src/world/builder.js';
import { Grid } from '../src/sim/grid.js';
import { createBody, stepBody, NEUTRAL } from '../src/sim/physics.js';

export function mkGrid(w, h, fn) {
  const r = new RoomBuilder('t', w, h);
  fn(r);
  const d = r.build();
  return new Grid(d.w, d.h, d.tiles, d.open);
}
export const inp = (o = {}) => ({ ...NEUTRAL, ...o });
export function run(b, W, frames, f, log) {
  for (let i = 0; i < frames; i++) {
    stepBody(b, f(i, b), W);
    if (log) log(i, b);
  }
}
export function settle(b, W) { run(b, W, 6, () => inp()); return b; }
export { createBody };
