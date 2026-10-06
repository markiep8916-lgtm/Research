// Unit tests for core/state.js (node --test).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gameState, resetGame, healParty, addItem, removeItem, hasItem, itemCount, useItemOutOfBattle,
  saveCheckpoint, loadCheckpoint, gainXp, xpToNext, getMember, START_INVENTORY,
} from '../src/core/state.js';
import { PARTY_DEFS, ITEMS } from '../src/battle/data.js';

const member = (id) => gameState.party.find((m) => m.id === id);

test('gameState is ready on import with the contract shape', () => {
  assert.deepEqual(gameState.party.map((m) => m.id), ['kade', 'nyx', 'orion', 'sera']);
  assert.deepEqual(gameState.inventory, { medigel: 3, ether: 1, revive: 1 });
  assert.equal(gameState.credits, 0);
  assert.deepEqual(gameState.flags, {});
  assert.equal(gameState.checkpoint, null);
  assert.deepEqual(gameState.stats, { battles: 0, breaks: 0, maxDamage: 0, steps: 0, playTime: 0 });
  const fields = ['id', 'name', 'cls', 'level', 'xp', 'xpNext', 'hp', 'maxHp', 'ep', 'maxEp', 'stats', 'weapons', 'skills', 'alive'];
  for (const m of gameState.party) {
    for (const f of fields) assert.ok(f in m, `${m.id}.${f}`);
    const d = PARTY_DEFS[m.id];
    assert.equal(m.name, d.name);
    assert.equal(m.cls, d.cls);
    assert.equal(m.hp, d.base.maxHp);
    assert.equal(m.ep, d.base.maxEp);
    assert.deepEqual(m.stats, { atk: d.base.atk, def: d.base.def, mag: d.base.mag, res: d.base.res, spd: d.base.spd });
    assert.deepEqual(m.weapons, d.weapons);
    assert.deepEqual(m.skills, d.skills);
    assert.equal(m.xpNext, xpToNext(m.level));
    assert.equal(m.alive, true);
  }
});

test('resetGame restores everything and keeps object identity', () => {
  const { party, inventory, flags, stats } = gameState;
  party[0].hp = 1;
  party[1].alive = false;
  addItem('keycard');
  gameState.credits = 999;
  flags.crate_eng_2 = true;
  gameState.checkpoint = { x: 1, z: 2, facing: 'up' };
  stats.battles = 5;
  gameState.bestiary.drone = ['rifle'];
  resetGame();
  assert.equal(gameState.party, party);
  assert.equal(gameState.inventory, inventory);
  assert.equal(gameState.flags, flags);
  assert.equal(gameState.stats, stats);
  assert.equal(party[0].hp, party[0].maxHp);
  assert.equal(party[1].alive, true);
  assert.deepEqual(inventory, START_INVENTORY);
  assert.equal(gameState.credits, 0);
  assert.deepEqual(flags, {});
  assert.equal(gameState.checkpoint, null);
  assert.equal(stats.battles, 0);
  assert.deepEqual(gameState.bestiary, {});
});

test('healParty restores HP/EP and revives', () => {
  resetGame();
  const k = member('kade');
  k.hp = 0;
  k.alive = false;
  member('orion').ep = 3;
  healParty();
  assert.equal(k.alive, true);
  assert.equal(k.hp, k.maxHp);
  assert.equal(member('orion').ep, member('orion').maxEp);
});

test('inventory helpers', () => {
  resetGame();
  addItem('keycard');
  assert.ok(hasItem('keycard'));
  addItem('medigel', 2);
  assert.equal(itemCount('medigel'), 5);
  assert.equal(removeItem('medigel', 6), false);
  assert.equal(itemCount('medigel'), 5);
  assert.equal(removeItem('medigel', 5), true);
  assert.equal(hasItem('medigel'), false);
  assert.equal('medigel' in gameState.inventory, false, 'empty stacks are removed');
  assert.equal(removeItem('nothing'), false);
  assert.equal(getMember('nyx').name, 'NYX');
  assert.equal(getMember('nobody'), null);
});

test('useItemOutOfBattle: Medi-Gel', () => {
  resetGame();
  const nyx = member('nyx');
  assert.deepEqual(useItemOutOfBattle('medigel', 'nyx'), { ok: false, message: 'NYX\'s HP is already full.' });
  assert.equal(itemCount('medigel'), 3, 'not consumed');
  nyx.hp = 100;
  assert.deepEqual(useItemOutOfBattle('medigel', 'nyx'), { ok: true, message: `NYX recovered ${ITEMS.medigel.effect.heal} HP.` });
  assert.equal(nyx.hp, 100 + ITEMS.medigel.effect.heal);
  assert.equal(itemCount('medigel'), 2);
  nyx.hp = nyx.maxHp - 30;
  assert.deepEqual(useItemOutOfBattle('medigel', 'nyx'), { ok: true, message: 'NYX recovered 30 HP.' });
  assert.equal(nyx.hp, nyx.maxHp);
  nyx.alive = false;
  nyx.hp = 0;
  assert.deepEqual(useItemOutOfBattle('medigel', 'nyx'), { ok: false, message: 'NYX is down. Use a Revive Kit first.' });
  assert.equal(itemCount('medigel'), 1);
});

test('useItemOutOfBattle: Ether, Revive Kit, key items, bad input', () => {
  resetGame();
  const orion = member('orion');
  orion.ep = 10;
  assert.deepEqual(useItemOutOfBattle('ether', 'orion'), { ok: true, message: 'ORION recovered 50 EP.' });
  assert.equal(orion.ep, 60);
  assert.deepEqual(useItemOutOfBattle('ether', 'orion'), { ok: false, message: 'No Ether Cell left.' });

  assert.deepEqual(useItemOutOfBattle('revive', 'sera'), { ok: false, message: 'SERA doesn\'t need reviving.' });
  const sera = member('sera');
  sera.alive = false;
  sera.hp = 0;
  const half = Math.round(sera.maxHp * 0.5);
  assert.deepEqual(useItemOutOfBattle('revive', 'sera'), { ok: true, message: `SERA is back up with ${half} HP.` });
  assert.equal(sera.alive, true);
  assert.equal(sera.hp, half);
  assert.equal(hasItem('revive'), false);

  addItem('keycard');
  assert.deepEqual(useItemOutOfBattle('keycard', 'kade'), { ok: false, message: 'The Bridge Keycard can\'t be used here.' });
  assert.ok(hasItem('keycard'));
  assert.deepEqual(useItemOutOfBattle('banana', 'kade'), { ok: false, message: 'Unknown item.' });
  assert.deepEqual(useItemOutOfBattle('medigel', 'nobody'), { ok: false, message: 'Choose a party member.' });
});

test('checkpoints are copied in and out', () => {
  resetGame();
  assert.equal(loadCheckpoint(), null);
  const pos = { x: 4.5, z: 7.5, facing: 'down' };
  saveCheckpoint(pos);
  pos.x = 0;
  const got = loadCheckpoint();
  assert.deepEqual(got, { x: 4.5, z: 7.5, facing: 'down' });
  got.z = 0;
  assert.equal(loadCheckpoint().z, 7.5);
});

test('gainXp levels up with growth, carrying over extra xp', () => {
  resetGame();
  const kade = member('kade');
  const g = PARTY_DEFS.kade.growth;
  kade.hp = 100;
  const need = xpToNext(12) + xpToNext(13) + 5;
  const ups = gainXp(kade, need);
  assert.deepEqual(ups, [{ level: 13, gains: g }, { level: 14, gains: g }]);
  assert.equal(kade.level, 14);
  assert.equal(kade.xp, 5);
  assert.equal(kade.xpNext, xpToNext(14));
  assert.equal(kade.maxHp, PARTY_DEFS.kade.base.maxHp + 2 * g.maxHp);
  assert.equal(kade.hp, 100 + 2 * g.maxHp, 'current HP rises with max HP');
  assert.equal(kade.stats.atk, PARTY_DEFS.kade.base.atk + 2 * g.atk);
  assert.deepEqual(gainXp(kade, 1), []);
  assert.ok(xpToNext(12) > xpToNext(11), 'curve grows');
});
