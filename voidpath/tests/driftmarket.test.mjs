// Driftmarket (C2): the map validates with every extension merged, the 12.4 quotas hold, the
// binding ids exist, and the favours and hub additions land on walkable cells of the maps they extend.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAllData, REG, getMap } from '../src/content/data.js';
import { validateMap, cellSpec, isWalkableSpec } from '../src/world/mapdef.js';
import { testCond } from '../src/world/cond.js';

registerAllData();

const walkable = (map, x, z) => isWalkableSpec(cellSpec(map, Math.floor(x), Math.floor(z)));
/** The script a talk spec runs (a normalized talk is a list of { when, script }). */
const scriptOf = (talk) => (typeof talk === 'string' ? talk : talk?.at(-1)?.script);

test('driftmarket validates, with its binding spawns, anchor and exit', () => {
  const m = getMap('driftmarket');
  assert.deepEqual(validateMap(m), []);
  for (const s of ['dock', 'from_shoals']) assert.ok(m.spawns[s], `spawn ${s}`);
  assert.ok(m.anchors.ruse_stall);
  const exit = m.exits.find((e) => e.to.map === 'shoals');
  assert.equal(exit.to.spawn, 'from_driftmarket');
  assert.ok(REG.shops.ruse && REG.destinations.some((d) => d.id === 'driftmarket'));
});

test('quotas (12.4): 12+ NPCs, 6+ looks, 3+ walking paths, a gear chest, a secret, a leader-gated interaction', () => {
  const m = getMap('driftmarket');
  const ids = ['ruse', 'tobin', 'pip', 'marta', 'hesper', 'ama', 'bao', 'sorrel_a', 'sorrel_b', 'oona', 'harl', 'rook', 'juno', 'ilo'];
  for (const id of ids) assert.ok(m.npcs.some((n) => n.id === id), `NPC ${id} (WRITING 7)`);
  assert.ok(m.npcs.length >= 12);
  assert.ok(new Set(m.npcs.map((n) => n.sprite)).size >= 6);
  assert.ok(m.npcs.filter((n) => n.idle?.path?.length > 1).length >= 3);
  assert.ok(m.chests.some((c) => /^eq_/.test(c.item)), 'a gear chest');
  assert.ok(m.chests.length >= 2, 'the gear chest and the pier cache');
  assert.ok(m.interactables.some((i) => i.leader), 'a leader-gated interaction');
  for (const n of m.npcs) assert.ok(walkable(m, n.x, n.z), `NPC ${n.id} stands on a floor`);
  for (const c of m.chests) assert.ok(walkable(m, c.x, c.z), `chest ${c.id} stands on a floor`);
});

test('the favours: three side objectives, finished on the Halcyon, in the Shoals and on the Meridian', () => {
  const side = Object.entries(REG.objectives).filter(([id, o]) => o.side && id.startsWith('ch1.favour_'));
  assert.equal(side.length, 3);
  const flags = { 'dm:favours_read': true };
  for (const [id, o] of side) {
    assert.ok(testCond(o.when, { flags, story: { chapter: 'ch1' } }), `${id} shows once the board is read`);
    const map = getMap(o.target.map);
    assert.deepEqual(validateMap(map), [], `${o.target.map} with the extensions`);
    const it = map.interactables.find((i) => i.id.startsWith('dm.') && /favour/.test(scriptOf(i.talk)));
    assert.ok(it, `${id}: an interactable on ${o.target.map}`);
    assert.ok(walkable(map, it.x, it.z), `${it.id} stands on a floor`);
    assert.ok(REG.scripts[scriptOf(it.talk)], it.id);
  }
});

test('the Halcyon after ch1: the trader stall at hub_stall, the coil socket at the reactor', () => {
  const h = getMap('halcyon');
  const trader = h.npcs.find((n) => n.id === 'dm.trader');
  assert.ok(trader && trader.when === 'story:ch1_done' && REG.scripts[scriptOf(trader.talk)]);
  assert.ok(Math.hypot(trader.x - h.anchors.hub_stall.x, trader.z - h.anchors.hub_stall.z) < 0.5);
  assert.ok(walkable(h, trader.x, trader.z));
  const socket = h.interactables.find((i) => i.id === 'dm.coil_socket');
  assert.equal(scriptOf(socket.talk), 'driftmarket.coil_install');
});

test('two Party Talks and the chapter-one recap', () => {
  const talks = Object.values(REG.partyTalks).filter((t) => t.chapter === 'ch1' && /^driftmarket\./.test(t.script));
  assert.equal(talks.length, 2);
  assert.ok(REG.recaps.ch1 && REG.recaps.ch1.length > 120);
});
