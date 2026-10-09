// The Shoals and the Meridian (C3): both maps validate with their binding spawns and exits, the props,
// chests and interactables stand on walkable cells, the quotas of 12.4 hold, the power puzzle gates
// the quarters and the log gates the reactor hall (and the Journal names the lever still to pull),
// the captain's log is staged to the camera, the visible eel fight teaches the dive before the Maw,
// and THE MAW plays its dive: Submerge (untargetable), Circling Below (telegraphed) and the Breach
// that surfaces it Exposed, plus the enrage at half health.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAllData, REG, getMap } from '../src/content/data.js';
import { validateMap, cellSpec, isWalkableSpec } from '../src/world/mapdef.js';
import { BattleModel } from '../src/battle/model.js';
import { ENEMIES, ENCOUNTERS, ENCOUNTER_TABLES } from '../src/battle/data.js';
import { gameState } from '../src/core/state.js';
import { buildJumpState, applyJumpState } from '../src/story/jump.js';
import { makeRng } from '../src/core/util.js';
import { policyAction, observe } from './policy.mjs';

registerAllData();

const walkable = (map, x, z) => isWalkableSpec(cellSpec(map, Math.floor(x), Math.floor(z)));

test('shoals and meridian validate, with the binding spawns and the exits between them', () => {
  const s = getMap('shoals'), m = getMap('meridian');
  assert.deepEqual(validateMap(s), []);
  assert.deepEqual(validateMap(m), []);
  for (const id of ['from_driftmarket', 'from_meridian']) assert.ok(s.spawns[id], `shoals spawn ${id}`);
  for (const id of ['from_shoals', 'reactor_hall']) assert.ok(m.spawns[id], `meridian spawn ${id}`);
  assert.deepEqual(s.exits.find((e) => e.id === 'to_driftmarket').to, { map: 'driftmarket', spawn: 'from_shoals' });
  assert.deepEqual(s.exits.find((e) => e.id === 'to_meridian').to, { map: 'meridian', spawn: 'from_shoals' });
  assert.deepEqual(m.exits.find((e) => e.id === 'to_shoals').to, { map: 'shoals', spawn: 'from_meridian' });
  for (const map of [s, m]) {
    for (const [id, p] of Object.entries(map.spawns)) assert.ok(walkable(map, p.x, p.z), `${map.id} spawn ${id} walkable`);
    for (const [id, v] of Object.entries(map.viewpoints)) assert.ok(walkable(map, v.x, v.z), `${map.id} viewpoint ${id} walkable`);
  }
});

test('chests, interactables and boss spots sit on walkable cells (or against a wall face)', () => {
  for (const map of [getMap('shoals'), getMap('meridian')]) {
    for (const c of map.chests) assert.ok(walkable(map, c.x, c.z), `${map.id} chest ${c.id}`);
    for (const it of map.interactables) {
      const near = [[0, 0], [0, 0.6], [0, -0.6], [0.6, 0], [-0.6, 0]].some(([dx, dz]) => walkable(map, it.x + dx, it.z + dz));
      assert.ok(near, `${map.id} interactable ${it.id}`);
    }
    for (const b of map.bosses) assert.ok(walkable(map, b.x, b.z), `${map.id} boss ${b.id}`);
  }
});

test('12.4 quotas: a gear chest on the path, a secret, leader-gated interactions, a puzzle, the shortcut', () => {
  const s = getMap('shoals'), m = getMap('meridian');
  assert.equal(s.chests.find((c) => c.id === 'grotto').item, 'eq_x_frost_charm');
  assert.equal(m.chests.find((c) => c.id === 'long_gun').item, 'eq_w_nyx_3');
  assert.equal(m.chests.find((c) => c.id === 'compass').item, 'eq_x_varo_compass');
  assert.equal(s.interactables.find((i) => i.id === 'lockbox').leader, 'nyx');
  assert.equal(m.interactables.find((i) => i.id === 'danjuma').leader, 'orion');
  assert.ok(m.areas.filter((a) => a.puzzle).length >= 2, 'the levers sit in puzzle areas');
  const chute = m.interactables.find((i) => i.id === 'chute');
  assert.equal(chute.when, 'defeated:shoals_boss_maw');
  assert.deepEqual(chute.to, { map: 'shoals', spawn: 'mouth' });
  for (const z of ['shoals_tunnels', 'shoals_deep', 'meridian_spine']) assert.ok(ENCOUNTER_TABLES[z].length >= 4, `zone ${z} formations`);
  assert.equal(ENCOUNTER_TABLES.shoals_deep.filter((e) => e === 'shoals_glimmer').length, 1, 'the rare glimmer formation');
  assert.equal(ENCOUNTERS.shoals_elite_colossus.boss, true);
});

test('the power puzzle unseals the quarters; the captain\'s log unseals the reactor hall', () => {
  const m = getMap('meridian');
  const lockOf = (ch) => m.legend[ch].lock;
  assert.equal(lockOf('Q').flag, 'story:meridian_power');
  assert.equal(lockOf('R').flag, 'story:varo_log');
  const power = m.triggers.find((t) => t.id === 'power');
  assert.match(power.when, /sw:meridian:lever_a/);
  assert.match(power.when, /sw:meridian:lever_b/);
  assert.equal(power.script, 'shoals.power_restored');
  for (const id of ['lever_a', 'lever_b']) assert.equal(m.interactables.find((i) => i.id === id).kind, 'switch');
  for (const id of ['shoals.meridian_arrival', 'shoals.power_restored', 'shoals.varo_log', 'shoals.maw', 'shoals.lever']) {
    assert.equal(typeof REG.scripts[id], 'function', id);
  }
});

test('the first lever names the lever still to pull; the second leaves it to the power scene (11.8)', async () => {
  for (const objective of ['ch1.power_eng', 'ch1.power_hold']) assert.ok(REG.objectives[objective], objective);
  assert.equal(REG.objectives['ch1.power_eng'].target.interactable, 'lever_b');
  assert.equal(REG.objectives['ch1.power_hold'].target.interactable, 'lever_a');
  const run = async (lever, flags = []) => {
    const set = [];
    const cs = {
      sfx() {}, shake() {}, objective: (id) => set.push(id), test: (f) => flags.includes(f),
      actor: () => ({ x: 10, z: 5 }), gather: () => Promise.resolve(), say: () => Promise.resolve(),
    };
    await REG.scripts['shoals.lever'](cs, { interactable: { id: lever } });
    return set;
  };
  assert.deepEqual(await run('lever_a'), ['ch1.power_eng']);
  assert.deepEqual(await run('lever_b'), ['ch1.power_hold']);
  assert.deepEqual(await run('lever_b', ['sw:meridian:lever_a']), []);
});

test('the captain\'s log plays to the camera: nobody stands in the hologram\'s column, Nyx beside it (G2 C3-4)', async () => {
  const at = {};
  let holo = null;
  const ok = () => Promise.resolve();
  const cs = new Proxy({
    spawn: (id, def) => { holo = def; return ok(); },
    gather: (slots) => { Object.assign(at, slots); return ok(); },
    actor: () => null,
    camera: { focus: ok },
  }, { get: (t, k) => (k in t ? t[k] : () => ok()) });
  await REG.scripts['shoals.varo_log'](cs);
  assert.ok(holo && holo.hologram, 'the hologram is spawned');
  for (const [id, [x, z]] of Object.entries(at)) {
    assert.ok(!(Math.abs(x - holo.x) < 0.7 && z > holo.z), `${id} stands between the camera and the hologram`);
  }
  const [nx, nz] = at.nyx;
  assert.ok(Math.abs(nz - holo.z) < 0.5 && Math.abs(nx - holo.x) < 2, 'Nyx stands level with her great-grandmother');
});

/** Plays an encounter with the test policy; returns the event log and the model. */
function fight(encounterId, seed, jump = 'ch1.maw') {
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

const fightMaw = (seed) => fight('shoals_boss_maw', seed);

test('the void eels: a visible field fight at the Mouth, and an eel always dives (G2 C3-2)', () => {
  const eels = getMap('shoals').bosses.find((b) => b.id === 'eels');
  assert.equal(eels.encounter, 'shoals_eels');
  assert.equal(eels.script, 'shoals.eels');
  assert.match(eels.when, /!shoals:eels/);
  assert.ok(getMap('shoals').areas.find((a) => a.id === 'mouth').rect[2] >= eels.x, 'it waits at the Mouth');
  for (let seed = 1; seed <= 12; seed++) {
    const { log } = fight('shoals_eels', seed, 'ch1.shoals');
    const dive = log.findIndex((e) => e.type === 'untargetable' && e.on);
    assert.ok(dive >= 0, `seed ${seed}: an eel dives`);
  }
});

test('THE MAW: a boss with two actions a round, weak to thermal / lance / rifle', () => {
  const maw = ENEMIES.maw;
  assert.equal(maw.boss, true);
  assert.equal(maw.actionsPerRound, 2);
  assert.deepEqual([...maw.weaknesses].sort(), ['lance', 'rifle', 'thermal']);
  const ids = maw.actions.map((a) => a.id);
  for (const id of ['maw_ice_breath', 'maw_tail_slam', 'maw_submerge', 'maw_circle', 'maw_breach']) assert.ok(ids.includes(id), id);
  assert.equal(maw.actions.find((a) => a.id === 'maw_ice_breath').target, 'all');
  assert.equal(maw.actions.find((a) => a.id === 'maw_tail_slam').pose, 'slam');
});

test('THE MAW dives: Submerge -> Circling Below (telegraphed) -> Breach on all, and it surfaces', () => {
  const { log } = fightMaw(3);
  const acts = log.filter((e) => e.type === 'action' && e.actorId && e.actionId?.startsWith('maw_'));
  const i = acts.findIndex((e) => e.actionId === 'maw_submerge');
  assert.ok(i >= 0, 'it dives at least once');
  assert.equal(acts[i + 1]?.actionId, 'maw_circle', 'it circles right after the dive');
  assert.equal(acts[i + 2]?.actionId, 'maw_breach', 'then it breaches');
  const on = log.findIndex((e) => e.type === 'untargetable' && e.on);
  const off = log.findIndex((e, k) => k > on && e.type === 'untargetable' && !e.on);
  assert.ok(on >= 0 && off > on, 'untargetable while under the ice, then surfaced');
  const breach = log.find((e) => e.type === 'action' && e.actionId === 'maw_breach');
  const breachIdx = log.indexOf(breach);
  assert.ok(off > breachIdx, 'the breach brings it up');
  assert.ok(log.some((e) => e.type === 'telegraph'), 'the circling is telegraphed');
  // Exposed: DEF down a stage more (the event carries the resulting stage, so a squad debuff can stack)
  const exposed = log.slice(breachIdx).find((e) => e.type === 'status' && String(e.targetId).startsWith('e') && e.stat === 'def');
  assert.ok(exposed && exposed.stage <= -1, 'it surfaces Exposed');
  const dives = acts.filter((e) => e.actionId === 'maw_submerge').map((e) => log.indexOf(e));
  const rounds = dives.map((k) => log.slice(0, k).filter((e) => e.type === 'roundStart').length);
  for (let k = 1; k < rounds.length; k++) assert.ok(rounds[k] - rounds[k - 1] >= 4, 'it dives every fourth round at most');
});

test('THE MAW enrages at half health: the cue, Nyx\'s line and her ultimate', () => {
  const { log, model } = fightMaw(5);
  assert.ok(log.some((e) => e.type === 'cue' && e.name === 'maw_enrage'));
  assert.ok(log.some((e) => e.type === 'say' && e.speaker === 'NYX' && /Great-grandma/.test(e.text)));
  assert.ok(['victory', 'defeat'].includes(model.result));
});
