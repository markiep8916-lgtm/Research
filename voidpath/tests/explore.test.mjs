// ExploreState field-boss arming (TECH_PLAN 3.6, C-alpha fix): a boss confronts once per approach,
// and an arrival that runs `load` triggers (a Retry respawn, also on the same map) re-seeds arming
// from the new position. Runs in node against a minimal fake World (no rendering).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ExploreState } from '../src/world/explore.js';
import { gameState } from '../src/core/state.js';

function fieldWithBoss(r = 3) {
  const ex = new ExploreState({ engine: { quality: 'high' }, state: gameState });
  const confronts = [];
  ex.world = {
    map: { id: 'fx', triggers: [] },
    bosses: { maw: { present: true, actor: { x: 0, z: 0 }, def: { triggerRadius: r } } },
    exitAt: () => null,
    test: () => true,
  };
  ex.mapId = 'fx';
  ex.player = { x: 20, z: 0 };
  ex._confront = (id) => { confronts.push(id); ex._armed.set(id, false); return Promise.resolve(); };
  const at = (x) => { ex.player.x = x; ex._updateBosses(); };
  return { ex, confronts, at };
}

test('a field boss confronts once per approach and re-arms only after the leader walks away', () => {
  const { confronts, at } = fieldWithBoss(3);
  at(20);
  at(2);
  assert.deepEqual(confronts, ['maw']);
  at(4.5);   // between triggerRadius and triggerRadius + 2.5: still disarmed
  at(2);
  assert.equal(confronts.length, 1);
  at(6);     // past triggerRadius + 2.5: armed again
  at(2);
  assert.equal(confronts.length, 2);
});

test('a respawn on the same map (load arrival) re-seeds arming from the checkpoint', () => {
  const { ex, confronts, at } = fieldWithBoss(3);
  at(20);
  at(2);
  assert.equal(confronts.length, 1);
  // Retry: the checkpoint sits 4.5 from the boss, inside triggerRadius + 2.5
  ex.player.x = 4.5;
  ex._arrived({ kind: 'respawn', load: true });
  at(4.5);
  at(2);
  assert.equal(confronts.length, 2, 'the boss engages again after the respawn');
  // a plain teleport keeps the arming state (scenarios teleport next to bosses)
  ex.player.x = 4.5;
  ex._arrived({ kind: 'teleport', load: false });
  at(2);
  assert.equal(confronts.length, 2);
});

test('a respawn inside the trigger radius does not confront at once', () => {
  const { ex, confronts, at } = fieldWithBoss(3);
  at(20);
  at(2);
  ex.player.x = 1;
  ex._arrived({ kind: 'respawn', load: true });
  at(1);
  assert.equal(confronts.length, 1);
});
