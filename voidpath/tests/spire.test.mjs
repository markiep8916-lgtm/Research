// The Security Spire (C5): the map validates with its binding spawns and the vault exit, props, chests
// and interactables stand on walkable cells, the quotas of 12.4 hold, the grid puzzle (one grid, the
// swap, Kade's override) leaves exactly one way through at every step, each regular enemy's lesson is
// scripted into round 1, and COMMANDER VOSS runs her drill: Command marks a traveler, the Execution
// Arc falls on the mark, and at half health she overclocks, WARDEN speaks and Kade's ultimate wakes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAllData, REG, getMap } from '../src/content/data.js';
import { validateMap, cellSpec, isWalkableSpec } from '../src/world/mapdef.js';
import { testCond } from '../src/world/cond.js';
import { BattleModel } from '../src/battle/model.js';
import { ENEMIES, ENCOUNTERS, ENCOUNTER_TABLES } from '../src/battle/data.js';
import { gameState } from '../src/core/state.js';
import { buildJumpState, applyJumpState } from '../src/story/jump.js';
import { makeRng } from '../src/core/util.js';
import { policyAction, observe } from './policy.mjs';

registerAllData();

const walkable = (map, x, z) => isWalkableSpec(cellSpec(map, Math.floor(x), Math.floor(z)));

test('the spire validates, with the binding spawns, the lifts and the exit to the vault', () => {
  const m = getMap('spire');
  assert.deepEqual(validateMap(m), []);
  for (const id of ['dock', 'barracks', 'cells', 'quarters', 'training', 'command', 'antechamber', 'from_vault']) assert.ok(m.spawns[id], id);
  for (const [id, p] of Object.entries(m.spawns)) assert.ok(walkable(m, p.x, p.z), `spawn ${id} walkable`);
  for (const [id, v] of Object.entries(m.viewpoints)) assert.ok(walkable(m, v.x, v.z), `viewpoint ${id} walkable`);
  const lifts = m.interactables.filter((i) => i.kind === 'lift');
  for (const l of lifts) assert.ok(m.spawns[l.to], `lift ${l.id} lands on spawn ${l.to}`);
  assert.deepEqual(m.interactables.find((i) => i.id === 'interface').to, { map: 'vault', spawn: 'entry' });
  for (const id of ['spire.arrival', 'spire.cadets', 'spire.oath_recording', 'spire.voss', 'spire.grid_terminal', 'spire.kade_override']) {
    assert.equal(typeof REG.scripts[id], 'function', id);
  }
});

test('chests, interactables and field bosses sit on walkable cells (or against a wall face)', () => {
  const m = getMap('spire');
  for (const c of m.chests) assert.ok(walkable(m, c.x, c.z), `chest ${c.id}`);
  for (const it of m.interactables) {
    const near = [[0, 0], [0, 0.6], [0, -0.6], [0.6, 0], [-0.6, 0]].some(([dx, dz]) => walkable(m, it.x + dx, it.z + dz));
    assert.ok(near, `interactable ${it.id}`);
  }
  for (const b of m.bosses) assert.ok(walkable(m, b.x, b.z), `boss ${b.id}`);
  for (const n of m.npcs) assert.ok(walkable(m, n.x, n.z) || /_cell$/.test(n.id), `npc ${n.id}`);
});

test('12.4 quotas: gear on the path, a leader-gated panel, the puzzle areas, the express lift, the rare formation', () => {
  const m = getMap('spire');
  assert.equal(m.chests.find((c) => c.id === 'armory_plate').item, 'eq_a_4');
  assert.equal(m.chests.find((c) => c.id === 'oathkeeper').item, 'eq_w_kade_4');
  assert.equal(m.chests.find((c) => c.id === 'grey_locker').item, 'eq_x_ground_coil');
  assert.equal(m.interactables.find((i) => i.id === 'grid_t3').leader, 'kade');
  assert.ok(m.areas.filter((a) => a.puzzle).length >= 2, 'the grids sit in puzzle areas');
  const express = m.interactables.find((i) => i.id === 'lift_express');
  assert.equal(express.when, 'defeated:spire_boss_voss');
  assert.equal(express.to, 'dock_lift');
  for (const z of ['spire_barracks', 'spire_upper']) assert.ok(ENCOUNTER_TABLES[z].length >= 4, `zone ${z} formations`);
  assert.equal(ENCOUNTER_TABLES.spire_upper.filter((e) => e === 'spire_honour').length, 1, 'the rare Honour Guard');
  assert.equal(ENCOUNTERS.spire_elite_prime.boss, true);
  assert.equal(m.bosses.find((b) => b.id === 'prime').encounter, 'spire_elite_prime');
});

test('the grid puzzle: one grid, a swap that opens one and closes the other, and Kade\'s override for both', () => {
  const gates = Object.fromEntries(getMap('spire').gates.map((g) => [g.id, g.open]));
  const open = (id, flags) => testCond(gates[id], { flags: Object.fromEntries(flags.map((f) => [f, true])), inventory: {}, party: [] });
  assert.equal(open('grid_a', []), false);
  assert.equal(open('grid_a', ['sw:spire:grid_a']), true);
  // the swap: exactly one of the paired grids is open, whichever way the terminal stands
  for (const flags of [[], ['sw:spire:grid_swap']]) assert.equal(open('grid_b', flags) + open('grid_c', flags), 1, flags.join() || 'unswapped');
  assert.equal(open('grid_b', ['sw:spire:override']) && open('grid_c', ['sw:spire:override']), true, 'the override opens both');
  for (const id of ['grid_a', 'grid_b', 'grid_c', 'cell_1', 'cell_5']) assert.equal(open(id, ['story:cadets_freed']), true, `${id} stays open after the cadets`);
  assert.equal(open('core_door', ['story:cadets_freed']), false);
  assert.equal(open('core_door', ['story:core_open']), true);
});

/** Plays an encounter with the test policy from a chapter-3 jump; returns the event log and the model. */
function fight(encounterId, seed, jump = 'ch3.voss') {
  applyJumpState(buildJumpState(jump, REG));
  const model = new BattleModel({ party: gameState.party, encounterId, rng: makeRng(seed) });
  const memo = new Map();
  const log = [];
  const ev = (list) => { for (const e of list) log.push(e); return list; };
  ev(model.begin());
  while (!model.isOver() && model.round <= 40) {
    ev(model.nextTurn());
    if (model.phase !== 'playerInput') { ev(model.enemyTurn()); continue; }
    observe(memo, ev(model.act(policyAction(model, model.current.id, memo))));
  }
  return { log, model };
}

/** The enemy actions taken before the second round starts. */
const roundOne = (log) => {
  const end = log.findIndex((e, k) => k > 0 && e.type === 'roundStart' && log.slice(0, k).some((p) => p.type === 'roundStart'));
  return log.slice(0, end < 0 ? log.length : end).filter((e) => e.type === 'action' && e.actionId);
};

test('each regular lesson is scripted into round 1: the mark, the jam, the lock-on', () => {
  for (let seed = 1; seed <= 6; seed++) {
    assert.ok(roundOne(fight('spire_troopers', seed, 'ch3.spire').log).some((e) => e.actionId === 'trooper_mark'), `seed ${seed}: the mark`);
    assert.ok(roundOne(fight('spire_riot', seed, 'ch3.spire').log).some((e) => e.actionId === 'riot_jam'), `seed ${seed}: the jam`);
    assert.ok(roundOne(fight('spire_mk3_guard', seed, 'ch3.upper').log).some((e) => e.actionId === 'mk3_lock'), `seed ${seed}: the lock-on`);
  }
});

test('COMMANDER VOSS: a boss with escorts that shut down with her, weak spots and her five actions', () => {
  const v = ENEMIES.voss;
  assert.equal(v.boss, true);
  assert.equal(ENCOUNTERS.spire_boss_voss.winOn, 'boss');
  assert.deepEqual(ENCOUNTERS.spire_boss_voss.enemies, ['voss_escort', 'voss', 'voss_escort']);
  assert.ok(v.shield >= 3 && v.weaknesses.length >= 2);
  for (const id of ['voss_sweep', 'voss_thrust', 'voss_command', 'voss_execution']) assert.ok(v.actions.some((a) => a.id === id), id);
  assert.ok(ENEMIES.voss_overclock.actions.some((a) => a.id === 'voss_rest'));
  assert.equal(ENEMIES.voss_overclock.actionsPerRound, 2);
});

/** Who holds `stat` (a stage-1 buff or ailment) just before log index `at`. */
const holders = (log, stat, at) => {
  const on = new Set();
  for (const e of log.slice(0, at)) {
    if (e.type !== 'status' || e.stat !== stat) continue;
    if (e.stage > 0) on.add(e.targetId);
    else on.delete(e.targetId);
  }
  return on;
};

test('VOSS runs her drill: Command marks a traveler, then the Execution Arc falls on the mark (or on a Provoke)', () => {
  for (const seed of [2, 4, 7]) {
    const { log } = fight('spire_boss_voss', seed);
    const acts = log.filter((e) => e.type === 'action' && e.actionId?.startsWith('voss_'));
    assert.equal(acts[0]?.actionId, 'voss_command', `seed ${seed}: she opens with Command`);
    const execs = acts.filter((e) => e.actionId === 'voss_execution');
    assert.ok(execs.length >= 1, `seed ${seed}: the Execution Arc follows`);
    for (const x of execs) {
      const at = log.indexOf(x);
      const t = x.targets[0];
      assert.ok(holders(log, 'marked', at).has(t) || holders(log, 'taunt', at).has(t), `seed ${seed}: on the mark or the taunter`);
    }
  }
});

test('VOSS overclocks at half health: the cue, the transform, WARDEN in her voice and Kade\'s ultimate', () => {
  const { log, model } = fight('spire_boss_voss', 6);
  const cue = log.findIndex((e) => e.type === 'cue' && e.name === 'voss_overclock');
  assert.ok(cue >= 0, 'the overclock cue');
  assert.ok(log.slice(cue).some((e) => e.type === 'transform' && e.kind === 'voss_overclock'), 'she transforms');
  assert.ok(log.some((e) => e.type === 'say' && e.speaker === 'VOSS' && /Rest, Kade/.test(e.text)));
  assert.ok(log.some((e) => e.type === 'learn' && e.memberId === 'kade' && e.ultimate), 'Kade\'s ultimate wakes');
  assert.ok(['victory', 'defeat'].includes(model.result));
});
