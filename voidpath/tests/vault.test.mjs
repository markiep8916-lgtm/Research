// vault (C6): chapter 4 contracts the scenarios only sample. The crystals play the memories in
// pickup order, ECHO's Mirror follows the squad's last element, its Glitch Phase is followed by the
// Severance charge, and the music binding of the map and its fights.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAllData, REG, getMap } from '../src/content/data.js';
import { ENEMIES, ENCOUNTERS } from '../src/battle/data.js';
import { BOSS_SCRIPTS } from '../src/battle/scripts.js';

registerAllData();

/** A stand-in cs: flags in a Set, cs.run records the memory and sets its flag, the rest is a no-op. */
function fakeCs(flags) {
  const runs = [];
  const memo = { 'vault.memory_launch': 'story:memory_launch', 'vault.memory_lullaby': 'story:memory_lullaby', 'vault.memory_severance': 'story:memory_severance' };
  const cs = new Proxy({}, {
    get(_, k) {
      if (k === 'test') return (f) => flags.has(f);
      if (k === 'flag') return (f, v = true) => (v ? flags.add(f) : flags.delete(f));
      if (k === 'run') return async (id) => { runs.push(id); flags.add(memo[id]); };
      return () => Promise.resolve();
    },
  });
  return { cs, runs };
}

test('vault: the Nth crystal touched plays the Nth memory, whichever crystal it is', async () => {
  for (const order of [['a', 'b', 'c'], ['c', 'a', 'b'], ['b', 'c', 'a']]) {
    const flags = new Set();
    const { cs, runs } = fakeCs(flags);
    for (const key of order) {
      flags.add(`shard:vault:${key}`);
      await REG.scripts['vault.shard'](cs, { interactable: { id: `crystal_${key}` } });
    }
    assert.deepEqual(runs, ['vault.memory_launch', 'vault.memory_lullaby', 'vault.memory_severance'], order.join(''));
  }
});

/** A stand-in boss api around one ECHO combatant. */
function fakeApi(round = 1) {
  const echo = { id: 'e1', key: 'echo', alive: true, broken: false };
  const calls = { resist: [], say: [] };
  const api = {
    round, mem: {}, rng: () => 0,
    enemies: () => [echo],
    enemy: () => echo,
    setResist: (id, map, opts) => calls.resist.push({ id, map, opts }),
    say: (who, text) => calls.say.push({ who, text }),
    actions: () => [],
  };
  return { api, echo, calls };
}

test('vault: ECHO mirrors the squad\'s last element and lets the previous one go', () => {
  const script = BOSS_SCRIPTS.echo;
  const { api, calls } = fakeApi();
  script.onBegin(api);
  script.onPartyAction(api, { id: 'kade' }, { damageType: 'thermal' });
  script.onPartyAction(api, { id: 'nyx' }, { damageType: 'volt' });
  assert.deepEqual(calls.resist.map((c) => c.map), [{ thermal: 0.5 }, { volt: 0.5, thermal: 1 }]);
  assert.equal(calls.say.length, 1, 'ECHO names the first mirrored element once');
});

test('vault: ECHO\'s data binds its mechanics, arena and music', () => {
  const echo = ENEMIES.echo;
  const ids = echo.actions.map((a) => a.id);
  for (const id of ['echo_mirror', 'echo_twelve', 'echo_phase', 'echo_charge', 'echo_severance']) assert.ok(ids.includes(id), id);
  const charge = echo.actions.find((a) => a.id === 'echo_charge');
  assert.equal(charge.fires, 'echo_severance');
  assert.equal(echo.untargetableStyle, 'phase');
  assert.deepEqual(BOSS_SCRIPTS.echo.thresholds, [0.5]);
  const boss = ENCOUNTERS.vault_boss_echo;
  assert.equal(boss.music, 'boss');
  assert.equal(boss.backdrop, 'vault_core');
  for (const [id, enc] of Object.entries(ENCOUNTERS)) if (id.startsWith('vault_') && !enc.boss) assert.equal(enc.music, 'battle_2', id);
  assert.equal(getMap('vault').music, 'vault');
});

test('vault: every crystal platform carries the memory set WARDEN speaks over (screens, gold light)', () => {
  const map = getMap('vault');
  const crystals = map.interactables.filter((i) => i.kind === 'shard');
  assert.equal(crystals.length, 3);
  for (const c of crystals) {
    const screens = map.props.filter((p) => p.t === 'screen' && Math.hypot(p.x - c.x, p.z - c.z) < 4);
    assert.ok(screens.length >= 2, `${c.id} screens`);
    assert.ok(map.lights.some((l) => l.tag === 'va_gold' && l.when === 'vault:gold' && Math.hypot(l.x - c.x, l.z - c.z) < 3), `${c.id} gold light`);
  }
});

test('vault: ECHO slips out of step on round 4, then starts the Severance with its next action', () => {
  const script = BOSS_SCRIPTS.echo;
  const { api, echo } = fakeApi(4);
  script.onBegin(api);
  assert.equal(script.chooseAction(api, echo).actionId, 'echo_phase');
  assert.equal(script.chooseAction(api, echo).actionId, 'echo_charge');
  api.round = 5;
  assert.equal(script.chooseAction(api, echo), null, 'no second phase until round 8');
});
