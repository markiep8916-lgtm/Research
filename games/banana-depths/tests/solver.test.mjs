import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomBuilder } from '../src/world/builder.js';
import { solveRoom, summarize } from '../tools/solver.mjs';

function room(w, h, fn) {
  const b = new RoomBuilder('t', w, h);
  fn(b);
  return b.build();
}
const start = (def, ch) => {
  const p = def.portals[ch];
  return { x: p.side === 'left' ? 2.3 : def.w - 2.3, y: p.y0, face: p.side === 'left' ? 1 : -1 };
};
const solve = (def, abil = {}, ch = '1') => { const r = solveRoom(def, { abil, starts: [start(def, ch)] }); return { r, s: summarize(def, r) }; };

// a left portal at (0, 4..6) over a floor, goal portal '2' on the right
const gapRoom = (gap) => room(80, 24, (b) => {
  b.border('#'); b.ground(0, 79, 3);
  b.rect(30, 0, gap, 4, '.');       // pit
  b.rect(0, 4, 1, 3, '.'); b.set(0, 4, '1'); b.set(0, 5, '1'); b.set(0, 6, '1');
  b.rect(79, 4, 1, 3, '.'); b.set(79, 4, '2'); b.set(79, 5, '2'); b.set(79, 6, '2');
  b.portal('1', 'x', '1').portal('2', 'x', '2');
});

test('solver: plain jump clears a 5-gap but not a 7-gap', () => {
  assert.ok(solve(gapRoom(5)).s.portals.includes('2'));
  assert.ok(!solve(gapRoom(7)).s.portals.includes('2'));
});
test('solver: roll-jump clears the 7-gap, needs the roll ability', () => {
  assert.ok(solve(gapRoom(7), { roll: true }).s.portals.includes('2'));
});

test('solver: one-tile tunnel needs roll', () => {
  const def = room(60, 14, (b) => {
    b.border('#'); b.ground(0, 59, 3); b.rect(20, 5, 20, 8, '#'); // tunnel y=4 (1 tall) under the block y>=5 ... block from y5 up, floor top y=4
    b.rect(0, 4, 1, 3, '.'); b.set(0, 4, '1'); b.set(0, 5, '1'); b.set(0, 6, '1');
    b.rect(59, 4, 1, 3, '.'); b.set(59, 4, '2');
    b.rect(59, 5, 1, 8, '#');
    b.portal('1', 'x', '1').portal('2', 'x', '2');
  });
  // the block occupies y>=5 only for x in [20,39]; at x=20..39 the corridor is 1 tile tall (y=4)
  assert.ok(!solve(def).s.portals.includes('2'), 'blocked without roll');
  assert.ok(solve(def, { roll: true }).s.portals.includes('2'), 'passes with roll');
});

test('solver: ladder shaft reaches the high portal; wall-jump shaft needs grip', () => {
  const lad = room(40, 40, (b) => {
    b.border('#'); b.ground(0, 39, 3);
    b.ladder(10, 4, 30); b.rect(11, 30, 28, 1, '#');
    b.rect(0, 4, 1, 3, '.'); b.set(0, 4, '1'); b.set(0, 5, '1'); b.set(0, 6, '1');
    b.rect(39, 31, 1, 3, '.'); b.set(39, 31, '2'); b.set(39, 32, '2'); b.set(39, 33, '2');
    b.portal('1', 'x', '1').portal('2', 'x', '2');
  });
  assert.ok(solve(lad).s.portals.includes('2'));
  const shaft = room(30, 50, (b) => {
    b.border('#'); b.ground(0, 29, 3);
    b.rect(10, 4, 1, 40, '#'); b.rect(15, 4, 1, 40, '#'); // 4-wide shaft x in 11..14, walls on both sides
    b.rect(10, 44, 6, 1, '#');
    b.rect(0, 4, 1, 3, '.'); b.set(0, 4, '1'); b.set(0, 5, '1'); b.set(0, 6, '1');
    b.rect(29, 45, 1, 3, '.'); b.set(29, 45, '2'); b.set(29, 46, '2');
    b.rect(16, 4, 13, 1, '#'); // floor right side
    b.portal('1', 'x', '1').portal('2', 'x', '2');
  });
  void shaft;
});

test('solver: wall-jump shaft needs grip', () => {
  const def = room(34, 56, (b) => {
    b.border('#'); b.ground(0, 33, 3);
    b.rect(10, 4, 1, 44, '#'); b.rect(15, 4, 1, 44, '#');          // shaft interior x=11..14 (4 wide)
    b.rect(10, 48, 6, 1, '#');                                       // cap over the shaft
    // opening on the left wall near the top so the shaft is the only way up... exit portal is on a ledge reachable only from the shaft top
    b.rect(11, 47, 4, 1, '.');
    b.rect(15, 44, 1, 3, '.');                                       // doorway out of the shaft top, right side
    b.rect(16, 43, 17, 1, '#');                                      // ledge outside the shaft
    b.rect(33, 44, 1, 3, '.'); b.set(33, 44, '2'); b.set(33, 45, '2'); b.set(33, 46, '2');
    b.rect(0, 4, 1, 3, '.'); b.set(0, 4, '1'); b.set(0, 5, '1'); b.set(0, 6, '1');
    b.rect(11, 4, 4, 1, '.'); b.rect(10, 3, 1, 1, '#');
    // entrance to the shaft at the bottom: gap in the left wall
    b.rect(10, 4, 1, 3, '.');
    b.portal('1', 'x', '1').portal('2', 'x', '2');
  });
  assert.ok(!solve(def, {}).s.portals.includes('2'), 'no grip -> blocked');
  assert.ok(solve(def, { grip: true }).s.portals.includes('2'), 'grip -> out the top');
});

test('solver: pound slabs open the way down; crate wall needs roll', () => {
  const def = room(40, 40, (b) => {
    b.border('#'); b.ground(0, 39, 18);
    b.rect(18, 17, 4, 2, 'G');                                        // 2-deep slab floor over a shaft
    b.rect(18, 0, 4, 17, '.'); b.rect(0, 19, 1, 3, '.'); b.set(0, 19, '1'); b.set(0, 20, '1'); b.set(0, 21, '1');
    b.set(18, 0, '2'); b.set(19, 0, '2'); b.set(20, 0, '2'); b.set(21, 0, '2');
    b.portal('1', 'x', '1').portal('2', 'x', '2');
  });
  assert.ok(!solve(def, {}).s.portals.includes('2'), 'slabs hold without pound');
  assert.ok(solve(def, { pound: true }).s.portals.includes('2'), 'pound breaks them');
  const crate = room(40, 14, (b) => {
    b.border('#'); b.ground(0, 39, 3);
    b.rect(20, 4, 1, 8, 'R');                                         // crate wall, full height
    b.rect(0, 4, 1, 3, '.'); b.set(0, 4, '1'); b.set(0, 5, '1'); b.set(0, 6, '1');
    b.rect(39, 4, 1, 3, '.'); b.set(39, 4, '2');
    b.portal('1', 'x', '1').portal('2', 'x', '2');
  });
  assert.ok(!solve(crate, {}).s.portals.includes('2'));
  assert.ok(solve(crate, { roll: true }).s.portals.includes('2'));
});

test('solver: springs reach high ledges; boomerang switch opens a gate', () => {
  const sp = room(40, 30, (b) => {
    b.border('#'); b.ground(0, 39, 3); b.set(10, 3, 'Y');
    b.rect(14, 12, 26, 1, '#'); b.rect(39, 13, 1, 3, '.'); b.set(39, 13, '2');
    b.rect(0, 4, 1, 3, '.'); b.set(0, 4, '1'); b.set(0, 5, '1'); b.set(0, 6, '1');
    b.portal('1', 'x', '1').portal('2', 'x', '2');
  });
  assert.ok(solve(sp, {}).s.portals.includes('2'), 'spring + jump reaches the ledge');
  const gate = room(40, 14, (b) => {
    b.border('#'); b.ground(0, 39, 3);
    b.rect(30, 4, 2, 8, 'D');                                         // gate wall
    b.set(10, 9, '#'); b.set(10, 8, 'w');                             // switch stays in reach of a boomerang from the floor? it sits at y=8, too high
    b.rect(8, 7, 5, 1, '#'); b.rect(9, 8, 1, 1, '.'); b.mark(11, 8, 'w');
    b.rect(0, 4, 1, 3, '.'); b.set(0, 4, '1'); b.set(0, 5, '1'); b.set(0, 6, '1');
    b.rect(39, 4, 1, 3, '.'); b.set(39, 4, '2');
    b.portal('1', 'x', '1').portal('2', 'x', '2');
  });
  assert.ok(!solve(gate, {}).s.portals.includes('2'));
});
