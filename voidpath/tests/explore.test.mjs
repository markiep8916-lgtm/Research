// ExploreState field-boss arming (TECH_PLAN 3.6, C-alpha fix): a boss confronts once per approach,
// and an arrival that runs `load` triggers (a Retry respawn, also on the same map) re-seeds arming
// from the new position. Runs in node against a minimal fake World (no rendering).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ExploreState } from '../src/world/explore.js';
import { gameState } from '../src/core/state.js';
import { REG } from '../src/content/registry.js';

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

// W-1 (G2): encounter distance survives side rooms. A zoneless or puzzle room pauses the zone's
// walked distance; the same zone continues it; a different zone, a battle or a map change resets it.
function fieldWithZones() {
  const ex = new ExploreState({
    engine: { quality: 'high' }, state: gameState,
    ui: { hud: { setDanger() {}, setArea() {} }, getSetting: () => null },
  });
  const areas = {
    a: { id: 'a', zone: 'tz_a' }, b: { id: 'b', zone: 'tz_b' },
    room: { id: 'room' }, puzzle: { id: 'puzzle', zone: 'tz_a', puzzle: true },
  };
  ex.world = { map: { id: 'fx', triggers: [] }, areaAt: () => ex.area, test: () => true, exitAt: () => null };
  ex.mapId = 'fx';
  ex.player = { x: 0, z: 0 };
  ex._zoneRate = () => ({ grace: 1e6, sigma: 10 });   // no rolls: only the distance is under test
  const walk = (area, units) => {
    ex.area = areas[area];
    for (let i = 0; i < units * 4; i++) ex._updateEncounters(0.25);
  };
  return { ex, walk };
}

test('zone distance continues after a zoneless room and a puzzle room (W-1)', () => {
  const { ex, walk } = fieldWithZones();
  walk('a', 10);
  assert.equal(ex._walked, 10);
  walk('room', 5);
  assert.equal(ex._walked, 10, 'a zoneless room pauses the count');
  walk('a', 2);
  assert.equal(ex._walked, 12, 'back in zone A the count continues from 10');
  walk('puzzle', 3);
  walk('a', 1);
  assert.equal(ex._walked, 13, 'a puzzle area pauses it too');
});

test('zone distance resets in a different zone, after a battle and on a map change (W-1)', () => {
  const { ex, walk } = fieldWithZones();
  walk('a', 10);
  walk('room', 2);
  walk('b', 3);
  assert.equal(ex._walked, 3, 'zone B starts from 0');
  walk('a', 1);
  assert.equal(ex._walked, 1, 'and zone A starts over after B');
  walk('a', 4);
  ex._arrived({ kind: 'exit', load: false });   // every arrival (and a battle's resume) restarts the grace
  assert.equal(ex._walked, 0);
  walk('a', 2);
  assert.equal(ex._walked, 2);
});

// W-3 (G2): the companion trails right beside the leader and must not steal the Talk prompt.
test('the companion takes the prompt only when nothing else is in reach (W-3)', () => {
  const ex = new ExploreState({ engine: { quality: 'high' }, state: gameState });
  REG.companions.tbuddy = { sprite: 'bolt', name: 'BOLT' };
  try {
    const pip = { id: 'pip', kind: 'npc', x: 0, z: 1.1, r: 0, enabled: true };
    const buddy = { id: 'tbuddy', kind: 'npc', x: 0.35, z: 0.55, r: 0, enabled: true };
    ex.world = { interactables: [buddy, pip], exitAt: () => null };
    ex.player = { x: 0, z: 0, dir: { x: 0, z: 1 } };
    assert.equal(ex._pickTarget().id, 'pip', 'facing Pip with BOLT beside her, the prompt targets Pip');
    pip.z = 3;   // out of reach
    assert.equal(ex._pickTarget().id, 'tbuddy');
  } finally {
    delete REG.companions.tbuddy;
  }
});

// F-2 (G2): a field boss confronted again after a Retry of its fight skips the pre-fight part.
test('a field boss re-confronted after Retry runs its pre-fight part instantly (F-2)', () => {
  const game = { retried: null };
  const cutscenes = { autoSkip: null };
  const ex = new ExploreState({ engine: { quality: 'high' }, state: gameState, game, cutscenes, audio: { sfx() {} } });
  const runs = [];
  ex._run = (script) => { runs.push({ name: typeof script === 'function' ? script.name : script, autoSkip: cutscenes.autoSkip }); return Promise.resolve(); };
  const actor = { x: 0, z: 0, actor: { flash() {} } };
  ex.world = {
    bosses: {
      maw: { actor, def: { encounter: 'enc_maw', script: 'st.maw' } },
      drone: { actor, def: { encounter: 'enc_drone', talk: null } },
    },
    touch() {}, test: () => true,
  };
  ex.player = { face() {} };
  ex._confront('maw');
  assert.deepEqual(runs.pop(), { name: 'st.maw', autoSkip: null }, 'a first confrontation plays in full');
  game.retried = { script: 'st.maw', encounter: 'enc_maw' };
  ex._confront('maw');
  assert.deepEqual(runs.pop(), { name: 'st.maw', autoSkip: 'st.maw' });
  assert.equal(game.retried, null, 'the retry is used up');
  cutscenes.autoSkip = null;
  game.retried = { script: 'boss:drone', encounter: 'enc_drone' };
  ex._confront('drone');
  assert.deepEqual(runs.pop(), { name: 'boss:drone', autoSkip: 'boss:drone' }, 'a scriptless boss fight is a named script too');
});
