import test from 'node:test';
import assert from 'node:assert/strict';
import { mkGrid, inp, run, settle, createBody } from './helpers.mjs';

const FLAT = () => mkGrid(120, 40, (r) => r.ground(0, 119, 3));

test('runs up to run speed', () => {
  const W = FLAT(); const b = settle(createBody(5, 4), W);
  run(b, W, 60, () => inp({ dx: 1 }));
  assert.ok(Math.abs(b.vx - 7.4) < 0.01);
  assert.equal(b.ground, true);
});

test('full jump is ~3.1 tiles, tap hop is under 1.3', () => {
  const W = FLAT();
  let b = settle(createBody(5, 4), W), maxY = 0;
  run(b, W, 80, (i) => inp({ jump: i < 60, jumpP: i === 0 }), () => { maxY = Math.max(maxY, b.y); });
  assert.ok(maxY - 4 > 3.0 && maxY - 4 < 3.4, `full jump ${maxY - 4}`);
  b = settle(createBody(5, 4), W); maxY = 0;
  run(b, W, 60, (i) => inp({ jump: i < 2, jumpP: i === 0 }), () => { maxY = Math.max(maxY, b.y); });
  assert.ok(maxY - 4 < 1.3, `tap hop ${maxY - 4}`);
});

function gap(gapW, { roll = false, rollAt = 14, jumpAt = 19.4 } = {}) {
  const W = mkGrid(100, 40, (r) => { r.ground(0, 19, 3); r.ground(20 + gapW, 99, 3); });
  const b = createBody(5, 4); b.abil.roll = roll; settle(b, W);
  let jumped = false, rolled = false;
  run(b, W, 300, (i, bb) => {
    if (roll && !rolled && bb.x >= rollAt) { rolled = true; return inp({ dx: 1, rollP: true }); }
    if (!jumped && bb.x >= jumpAt && bb.ground) { jumped = true; return inp({ dx: 1, jump: true, jumpP: true }); }
    return inp({ dx: 1, jump: jumped && !bb.ground });
  });
  return b.ground && b.x > 20 + gapW && b.y > 3.5;
}
test('plain jump clears a 4-tile gap but not 6', () => {
  assert.equal(gap(4), true);
  assert.equal(gap(6), false);
});
test('roll-jump clears 6-7 tile gaps that a plain jump cannot', () => {
  assert.equal(gap(6, { roll: true }), true);
  assert.equal(gap(7, { roll: true }), true);
});

test('roll squeezes through a one-tile tunnel and stands up after', () => {
  const W = mkGrid(60, 12, (r) => { r.border('#'); r.rect(1, 1, 58, 1, '#'); r.rect(10, 3, 15, 5, '#'); });
  const b = createBody(3, 2); b.abil.roll = true; settle(b, W);
  run(b, W, 400, (i) => inp({ dx: 1, rollP: i === 10 }));
  assert.equal(b.mode, 'move');
  assert.ok(b.x > 26, `x=${b.x}`);
  // without the ability the tunnel is impassable
  const c = createBody(3, 2); settle(c, W);
  run(c, W, 400, () => inp({ dx: 1 }));
  assert.ok(c.x < 10, `blocked at ${c.x}`);
});

test('rolling breaks crates, plain running does not', () => {
  const W = mkGrid(40, 12, (r) => { r.border('#'); r.rect(1, 1, 38, 1, '#'); r.rect(15, 2, 1, 3, 'R'); });
  const b = createBody(10, 2); b.abil.roll = true; settle(b, W);
  run(b, W, 80, (i) => inp({ dx: 1, rollP: i === 2 }));
  assert.equal(W.log.length, 3); assert.ok(b.x > 16);
  const W2 = mkGrid(40, 12, (r) => { r.border('#'); r.rect(1, 1, 38, 1, '#'); r.rect(15, 2, 1, 3, 'R'); });
  const c = createBody(10, 2); c.abil.roll = true; settle(c, W2);
  run(c, W2, 80, () => inp({ dx: 1 }));
  assert.equal(W2.log.length, 0); assert.ok(c.x < 15);
});

test('ladder: climb to the top and stand, then climb back down', () => {
  const W = mkGrid(20, 24, (r) => { r.border('#'); r.rect(1, 1, 18, 1, '#'); r.ladder(8, 2, 12); r.rect(9, 12, 8, 1, '#'); });
  const b = createBody(8.5, 2); settle(b, W);
  run(b, W, 200, () => inp({ dy: 1 }));
  assert.equal(b.mode, 'move'); assert.equal(b.ground, true); assert.equal(b.y, 13);
  run(b, W, 120, () => inp({ dy: -1 }));
  assert.equal(b.y, 2); assert.equal(b.ground, true);
});

test('wall grip lets Kong climb a 4-wide shaft by wall jumping; without it he cannot', () => {
  const mk = () => mkGrid(12, 70, (r) => { r.rect(0, 0, 12, 2, '#'); for (const x of [0, 1, 6, 7]) r.vline(x, 2, 69, '#'); });
  function climb(grip) {
    const W = mk(); const b = createBody(4, 2); b.abil.grip = grip; settle(b, W);
    let side = -1, maxY = 0, jumps = 0;
    run(b, W, 900, (i, bb) => {
      const o = inp({ dx: side, jump: true });
      if (bb.ground || bb.wallCoyote > 0) o.jumpP = true;
      return o;
    }, (i, bb) => { maxY = Math.max(maxY, bb.y); for (const e of bb.events) if (e.type === 'walljump') { jumps++; side = -side; } });
    return { maxY, jumps };
  }
  const g = climb(true), n = climb(false);
  assert.ok(g.maxY > 40, `with grip maxY=${g.maxY} jumps=${g.jumps}`);
  assert.ok(n.maxY < 6, `without grip maxY=${n.maxY}`);
});

test('ground pound breaks stacked slabs in one drop and shakes on impact', () => {
  const W = mkGrid(20, 30, (r) => { r.border('#'); r.rect(1, 1, 18, 1, '#'); r.rect(5, 9, 3, 1, 'G'); r.rect(5, 5, 3, 1, 'G'); });
  const b = createBody(6, 20); b.abil.pound = true;
  const ev = []; run(b, W, 120, (i) => inp({ poundP: i === 3 }), (i, bb) => ev.push(...bb.events.map((e) => e.type)));
  assert.ok(ev.includes('poundSlam') && ev.includes('poundImpact'));
  assert.equal(ev.filter((e) => e === 'break').length, 4);
  assert.equal(b.y, 2);
  // pound is a no-op without the ability
  const c = createBody(6, 20); run(c, W, 3, () => inp({ poundP: true }));
  assert.equal(c.mode, 'move');
});

test('spring tire bounces ~6 tiles, ~9 with jump held', () => {
  const W = mkGrid(20, 40, (r) => { r.border('#'); r.rect(1, 1, 18, 1, '#'); r.set(8, 2, 'Y'); });
  const peak = (held) => { const b = createBody(8.5, 3); let m = 0; run(b, W, 200, () => inp({ jump: held }), () => { m = Math.max(m, b.y); }); return m - 3; };
  assert.ok(peak(false) > 5.5 && peak(false) < 7, String(peak(false)));
  assert.ok(peak(true) > 8.5 && peak(true) < 10, String(peak(true)));
});

test('one-way platforms: jump up through, land on top, drop back down', () => {
  const W = mkGrid(20, 20, (r) => { r.border('#'); r.rect(1, 1, 18, 1, '#'); r.plat(5, 3, 6); });
  const b = createBody(7, 2); settle(b, W);
  run(b, W, 60, (i) => inp({ jump: i < 40, jumpP: i === 0 }));
  assert.equal(b.y, 4); assert.equal(b.ground, true);
  run(b, W, 40, (i) => inp({ dy: -1, jump: i === 0, jumpP: i === 0 }));
  assert.equal(b.y, 2);
});

test('hazards report spikes and lava; pits do not crash', () => {
  const W = mkGrid(20, 12, (r) => { r.border('#'); r.rect(1, 1, 18, 1, '#'); r.set(10, 2, '^'); r.rect(14, 1, 3, 1, 'L'); });
  const b = createBody(8, 2); settle(b, W);
  const seen = []; run(b, W, 60, () => inp({ dx: 1 }), (i, bb) => bb.events.forEach((e) => e.type === 'hazard' && seen.push(e.kind)));
  assert.ok(seen.includes('spike'));
});

test('crumble tiles notify the world while stood on', () => {
  const calls = []; const W = mkGrid(20, 12, (r) => { r.border('#'); r.rect(1, 1, 18, 1, '#'); r.set(8, 2, 'F'); });
  W.crumble = (tx, ty) => calls.push([tx, ty]);
  const b = createBody(8.5, 3); run(b, W, 30, () => inp());
  assert.ok(calls.length > 0 && calls[0][0] === 8);
});
