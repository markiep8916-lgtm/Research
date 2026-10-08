// Unit tests for core/save.js (node --test): the v1 format, round trips with `keep`, the v0
// migration, load validation and fallbacks, slots, damaged saves and throwing storage (TECH_PLAN 6.1).
// The tests run in order: storage starts as a working fake localStorage and the last tests make it throw.

import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, PARTY_DEFS } from '../src/battle/data.js';
import { gameState, resetGame, newGame, joinParty, saveCheckpoint } from '../src/core/state.js';
import { statsAt } from '../src/core/progression.js';
import {
  SAVE_VERSION, SLOTS, serialize, deserialize, writeSlot, readSlot, listSlots, latestSlot, deleteSlot, migrate,
  storageMode, markCleared, isCleared,
} from '../src/core/save.js';
import { registerData } from '../src/content/registry.js';
import common from '../src/content/common/data.js';

Object.assign(ITEMS, common.items);

// Two synthetic locations: a ship (playable map, transit map, a destination) and a town reached
// only through its dock destination.
registerData({
  id: 'savetest_ship', chapter: 'prologue', name: 'Test Ship', data: {},
  story: { destinations: [{ id: 'savetest_ship', name: 'Ship', map: 'halcyon', spawn: 'bridge' }] },
  maps: {
    halcyon: { id: 'halcyon', name: 'ISV Halcyon', grid: ['....'], spawns: { start: { x: 6.55, z: 20.3, facing: 'down' }, bridge: { x: 40.5, z: 6.5, facing: 'up' } } },
    moth: { id: 'moth', name: 'The Moth', grid: ['..'], spawns: { cockpit: { x: 1, z: 1, facing: 'down' } }, transit: true },
  },
});
registerData({
  id: 'savetest_town', chapter: 'ch1', name: 'Test Town', data: {},
  story: { destinations: [{ id: 'savetest_town', name: 'Town', map: 'town', spawn: 'dock' }] },
  maps: {
    town: { id: 'town', name: 'Driftmarket', grid: ['..'], spawns: { dock: { x: 12.5, z: 8.5, facing: 'down' } } },
    town_back: { id: 'town_back', name: 'Back Alley', grid: ['..'], spawns: { gate: { x: 2.5, z: 2.5, facing: 'left' } } },
    dream: { id: 'dream', name: 'Dream', grid: ['..'], spawns: { a: { x: 1, z: 1 } }, scene: true },
  },
});

// A working in-memory localStorage.
function fakeStorage() {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}
const store = fakeStorage();
globalThis.localStorage = store;

// A campaign state with every saved part set to something recognisable.
function buildState() {
  newGame();
  joinParty('sera', { level: 6 });
  joinParty('orion', { level: 6 });
  gameState.leader = 'sera';
  const [kade, sera] = gameState.party;
  kade.level = 9;
  kade.xp = 40;
  kade.equip.accessory = 'eq_x_stim_chip';
  sera.hp = 37;
  sera.ep = 5;
  gameState.party[2].alive = false;
  gameState.party[2].hp = 0;
  Object.assign(gameState.inventory, { medigel: 4, eq_w_kade_2: 1, keycard: 1 });
  gameState.credits = 777;
  Object.assign(gameState.flags, { 'story:kade_awake': true, 'ult:sera': true, 'chest:halcyon:eng_2': true, 'my:custom': 3 });
  Object.assign(gameState.story, { chapter: 'ch1', objective: 'ch1.go_driftmarket', done: ['pro.wake'] });
  gameState.played.push('prologue.sera_wakes');
  Object.assign(gameState.stats, { battles: 7, breaks: 3, maxDamage: 512, steps: 900, playTime: 1834 });
  gameState.bestiary.drone = ['rifle'];
  saveCheckpoint({ map: 'halcyon', x: 40.5, z: 6.5, facing: 'up' });
}

test('serialize: the v1 SaveData shape; derived values are not stored', () => {
  buildState();
  const d = serialize(gameState, { map: 'town', x: 12.5, z: 8.5, facing: 'down' });
  assert.equal(d.v, SAVE_VERSION);
  assert.equal(d.game, 'voidpath');
  assert.match(d.savedAt, /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual(Object.keys(d).sort(), ['bestiary', 'checkpoint', 'credits', 'flags', 'game', 'inventory', 'leader',
    'party', 'played', 'pos', 'roster', 'savedAt', 'stats', 'story', 'summary', 'v'].sort());
  assert.deepEqual(d.summary, {
    chapter: 'ch1', chapterLabel: 'Chapter One · Ringborn', location: 'Driftmarket', playTime: 1834, leader: 'sera',
    party: [{ id: 'kade', level: 9 }, { id: 'sera', level: 6 }, { id: 'orion', level: 6 }], cleared: false,
  });
  assert.deepEqual(d.pos, { map: 'town', x: 12.5, z: 8.5, facing: 'down' });
  assert.deepEqual(d.checkpoint, { map: 'halcyon', x: 40.5, z: 6.5, facing: 'up' });
  assert.deepEqual(d.party, ['kade', 'sera', 'orion']);
  assert.equal(d.leader, 'sera');
  assert.deepEqual(d.roster.kade, { level: 9, xp: 40, hp: gameState.party[0].hp, ep: gameState.party[0].ep, alive: true,
    equip: { weapon: 'eq_w_kade_1', armor: 'eq_a_1', accessory: 'eq_x_stim_chip' } });
  for (const e of Object.values(d.roster)) assert.deepEqual(Object.keys(e).sort(), ['alive', 'ep', 'equip', 'hp', 'level', 'xp']);
  assert.deepEqual(d.story, { chapter: 'ch1', objective: 'ch1.go_driftmarket', done: ['pro.wake'] });
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(d))), JSON.stringify(d), 'plain JSON');
  gameState.flags['story:game_clear'] = true;
  assert.equal(serialize(gameState, d.pos).summary.cleared, true);
});

test('round trip through a slot rebuilds members, keeps identities and restores every saved part', () => {
  buildState();
  const { party, roster, inventory, flags, story, stats, bestiary } = gameState;
  const data = serialize(gameState, { map: 'town', x: 12.5, z: 8.5, facing: 'down' });
  assert.deepEqual(writeSlot('slot1', data), { ok: true, storage: 'local' });
  assert.ok(store.map.has('voidpath.save.slot1'));

  resetGame();
  gameState.flags.junk = true;
  const kadeObj = roster.kade;
  const res = deserialize(readSlot('slot1'));
  assert.deepEqual(res, { pos: { map: 'town', x: 12.5, z: 8.5, facing: 'down' }, checkpoint: { map: 'halcyon', x: 40.5, z: 6.5, facing: 'up' } });
  assert.equal(gameState.party, party, 'party array identity kept');
  assert.equal(gameState.roster, roster);
  assert.equal(gameState.inventory, inventory);
  assert.equal(gameState.flags, flags);
  assert.equal(gameState.story, story);
  assert.equal(gameState.stats, stats);
  assert.equal(gameState.bestiary, bestiary);
  assert.equal(roster.kade, kadeObj, 'existing roster member objects are reused');
  assert.deepEqual(party.map((m) => m.id), ['kade', 'sera', 'orion']);
  for (const m of party) assert.equal(roster[m.id], m, 'party entries are the roster entries');
  assert.equal(gameState.leader, 'sera');
  const [kade, sera, orion] = party;
  assert.equal(kade.level, 9);
  assert.equal(kade.xp, 40);
  assert.equal(kade.campaign, true);
  assert.deepEqual(kade.skills, ['arc_slash', 'cross_edge', 'provoke', 'lance_charge']);
  assert.equal(kade.maxHp, statsAt('kade', 9).maxHp + ITEMS.eq_a_1.equip.stats.maxHp, 'stats rebuilt from level and gear');
  assert.equal(kade.mods.startBp, 1);
  assert.deepEqual(sera.skills, ['nanoheal', 'photon_lance', 'restore_field', 'revive', 'lifebloom'], 'ultimate from the ult: flag');
  assert.equal(sera.hp, 37);
  assert.equal(sera.ep, 5);
  assert.equal(orion.alive, false);
  assert.equal(orion.hp, 0);
  assert.deepEqual(gameState.inventory, { ...data.inventory });
  assert.equal(gameState.inventory.eq_w_kade_2, 1);
  assert.equal(gameState.credits, 777);
  assert.deepEqual(gameState.flags, { 'story:kade_awake': true, 'ult:sera': true, 'chest:halcyon:eng_2': true, 'my:custom': 3 });
  assert.deepEqual(gameState.story, { chapter: 'ch1', objective: 'ch1.go_driftmarket', done: ['pro.wake'] });
  assert.deepEqual(gameState.played, ['prologue.sera_wakes']);
  assert.deepEqual(gameState.stats, { battles: 7, breaks: 3, maxDamage: 512, steps: 900, playTime: 1834 });
  assert.deepEqual(gameState.bestiary, { drone: ['rifle'] });
  assert.deepEqual(gameState.checkpoint, { map: 'halcyon', x: 40.5, z: 6.5, facing: 'up' });
  // serialize -> deserialize -> serialize is stable apart from the time stamp
  const again = serialize(gameState, res.pos);
  assert.deepEqual({ ...again, savedAt: 0 }, { ...data, savedAt: 0 });
});

test('deserialize keep: [\'stats\', \'played\'] leaves those as they are (Retry)', () => {
  buildState();
  const snapshot = serialize(gameState, { map: 'halcyon', x: 1, z: 2, facing: 'down' });
  gameState.stats.battles = 99;
  gameState.stats.playTime = 5000;
  gameState.played.push('prologue.orion_rescue');
  gameState.credits = 1;
  gameState.flags['seen:halcyon:orion'] = true;
  deserialize(snapshot, { keep: ['stats', 'played'] });
  assert.equal(gameState.stats.battles, 99);
  assert.equal(gameState.stats.playTime, 5000);
  assert.deepEqual(gameState.played, ['prologue.sera_wakes', 'prologue.orion_rescue']);
  assert.equal(gameState.credits, 777, 'everything else comes from the snapshot');
  assert.equal(gameState.flags['seen:halcyon:orion'], undefined);
  deserialize(snapshot);
  assert.equal(gameState.stats.battles, 7);
  assert.deepEqual(gameState.played, ['prologue.sera_wakes']);
});

test('POC (resetGame) members round-trip as POC members', () => {
  resetGame();
  gameState.party[1].hp = 100;
  const d = serialize(gameState, { map: 'halcyon', x: 6.55, z: 20.3, facing: 'down' });
  assert.equal(d.roster.kade.legacy, true);
  resetGame();
  deserialize(d);
  for (const m of gameState.party) {
    assert.ok(!m.campaign);
    assert.deepEqual(m.skills, PARTY_DEFS[m.id].skills);
    assert.equal(m.maxHp, PARTY_DEFS[m.id].base.maxHp);
  }
  assert.equal(gameState.party[1].hp, 100);
});

test('v0 migration: the POC gameState shape becomes v1 (renamed flags, positions on the Halcyon)', () => {
  resetGame();
  const v0 = {
    party: JSON.parse(JSON.stringify(gameState.party)),
    inventory: { medigel: 2, keycard: 1 }, credits: 120,
    flags: { crate_eng_2: true, bridge_unlocked: true, talked_bolt: true, rested: true, boss_defeated: true, odd: 1 },
    checkpoint: { x: 30.5, z: 14.5, facing: 'left' },
    stats: { battles: 4, breaks: 2, maxDamage: 300, steps: 10, playTime: 600 },
    bestiary: { crawler: ['blade'] },
  };
  v0.party[0].level = 13;
  v0.party[2].hp = 50;
  const d = migrate(v0);
  assert.equal(d.v, 1);
  assert.equal(d.game, 'voidpath');
  assert.deepEqual(d.flags, {
    'chest:halcyon:eng_2': true, 'story:bridge_unlocked': true, 'talk:halcyon:bolt': true, boss_defeated: true,
    'defeated:pro_boss_sentinel': true, odd: 1,
  });
  assert.deepEqual(d.checkpoint, { map: 'halcyon', x: 30.5, z: 14.5, facing: 'left' });
  assert.deepEqual(d.pos, d.checkpoint);
  assert.deepEqual(d.party, ['kade', 'nyx', 'orion', 'sera']);
  assert.equal(d.roster.kade.level, 13);
  assert.equal(d.summary.chapterLabel, 'Prologue · Waking');
  assert.notEqual(d, v0, 'migrate copies');
  assert.ok(Array.isArray(v0.party), 'input untouched');

  newGame();
  const res = deserialize(v0);
  assert.deepEqual(res.pos, { map: 'halcyon', x: 30.5, z: 14.5, facing: 'left' });
  assert.equal(gameState.party.length, 4);
  assert.equal(gameState.party[0].level, 13);
  assert.equal(gameState.party[0].stats.atk, PARTY_DEFS.kade.base.atk + PARTY_DEFS.kade.growth.atk, 'POC growth');
  assert.equal(gameState.party[2].hp, 50);
  assert.equal(gameState.credits, 120);
  assert.equal(gameState.flags['story:bridge_unlocked'], true);
  assert.equal(migrate({ v: 1, game: 'other' }), null);
  assert.equal(migrate('nope'), null);
  assert.equal(migrate({ v: -3 }), null);
});

test('load validation: positions fall back to the checkpoint, then the dock, then halcyon:start', () => {
  buildState();
  const base = serialize(gameState, { map: 'town', x: 3, z: 3, facing: 'down' });
  const load = (patch) => deserialize({ ...JSON.parse(JSON.stringify(base)), ...patch });
  assert.deepEqual(load({ pos: { map: 'nowhere', x: 1, z: 1 } }).pos, { map: 'halcyon', x: 40.5, z: 6.5, facing: 'up' }, 'checkpoint');
  assert.deepEqual(load({ pos: { map: 'moth', x: 1, z: 1, facing: 'down' } }).pos.map, 'halcyon', 'transit map');
  assert.deepEqual(load({ pos: { map: 'town_back', x: 2.5, z: 2.5, facing: 'up' } }).pos, { map: 'town_back', x: 2.5, z: 2.5, facing: 'up' });
  assert.deepEqual(load({ pos: { map: 'dream', x: 1, z: 1 }, checkpoint: null }).pos, { map: 'town', x: 12.5, z: 8.5, facing: 'down' }, 'scene map -> its location dock');
  assert.deepEqual(load({ pos: { map: 'nowhere', x: 1, z: 1 }, checkpoint: null }).pos, { map: 'halcyon', x: 6.55, z: 20.3, facing: 'down' }, 'halcyon:start');
  assert.deepEqual(load({ pos: null, checkpoint: { map: 'moth', x: 1, z: 1 } }), { pos: { map: 'halcyon', x: 6.55, z: 20.3, facing: 'down' }, checkpoint: null });
  assert.equal(gameState.checkpoint, null, 'an unusable checkpoint is dropped');
  assert.deepEqual(load({ pos: { map: 'town', x: 'x', z: 1 } }).pos.map, 'halcyon', 'bad coordinates');
});

test('load validation: unknown items and members dropped, flags kept, HP/EP clamped, gear checked', (t) => {
  const warnings = [];
  t.mock.method(console, 'warn', (msg) => warnings.push(String(msg)));
  buildState();
  const d = serialize(gameState, { map: 'halcyon', x: 1, z: 1, facing: 'down' });
  d.inventory.banana = 3;
  d.inventory.medigel = -2;
  d.roster.bolt = { level: 3, xp: 0, hp: 10, ep: 0, alive: true, equip: {} };
  d.party.push('bolt');
  d.roster.kade.hp = 99999;
  d.roster.kade.ep = -5;
  d.roster.sera.equip.weapon = 'eq_w_kade_2';      // not hers -> inventory
  d.roster.sera.equip.armor = 'eq_w_nyx_1';         // wrong slot -> inventory
  d.roster.sera.equip.accessory = 'eq_x_unknown';   // unknown -> dropped
  d.roster.orion.alive = true;
  d.roster.orion.hp = 0;                            // 0 HP means down
  d.flags['future:flag'] = 'x';
  d.leader = 'bolt';
  deserialize(d);
  assert.deepEqual(gameState.party.map((m) => m.id), ['kade', 'sera', 'orion']);
  assert.equal(gameState.roster.bolt, undefined);
  assert.equal(gameState.leader, 'kade', 'leader falls back to the first member');
  assert.equal(gameState.inventory.banana, undefined);
  assert.equal(gameState.inventory.medigel, undefined, 'non-positive counts dropped');
  assert.equal(gameState.inventory.eq_w_kade_2, 2, 'unwearable gear returns to the inventory');
  assert.equal(gameState.inventory.eq_w_nyx_1, 1);
  const [kade, sera, orion] = gameState.party;
  assert.equal(kade.hp, kade.maxHp);
  assert.equal(kade.ep, 0);
  assert.deepEqual(sera.equip, { weapon: null, armor: null, accessory: null });
  assert.equal(orion.alive, false);
  assert.equal(gameState.flags['future:flag'], 'x');
  for (const w of ['banana', 'bolt', 'eq_x_unknown', 'eq_w_kade_2']) assert.ok(warnings.some((m) => m.includes(w)), `warned about ${w}`);
});

test('unusable data returns null and leaves gameState untouched', () => {
  buildState();
  const before = serialize(gameState, null);
  for (const bad of [null, 'text', 42, [], { v: 1, game: 'voidpath' }, { v: 1, game: 'voidpath', roster: { bolt: {} }, party: ['bolt'] }]) {
    assert.equal(deserialize(bad), null);
  }
  assert.deepEqual({ ...serialize(gameState, null), savedAt: 0 }, { ...before, savedAt: 0 });
});

test('slots: list, latest, damaged and corrupt JSON, delete', () => {
  for (const s of SLOTS) deleteSlot(s);
  assert.deepEqual(listSlots().map((s) => [s.slot, s.empty, s.damaged]), SLOTS.map((s) => [s, true, false]));
  assert.equal(latestSlot(), null);
  buildState();
  const older = { ...serialize(gameState, { map: 'halcyon', x: 1, z: 1, facing: 'down' }), savedAt: '2026-10-01T10:00:00.000Z' };
  const newer = { ...older, savedAt: '2026-10-08T12:00:00.000Z' };
  writeSlot('auto', older);
  writeSlot('slot2', newer);
  store.setItem('voidpath.save.slot3', '{ not json');
  const list = listSlots();
  assert.deepEqual(list.map((s) => [s.slot, s.empty, s.damaged]), [['auto', false, false], ['slot1', true, false], ['slot2', false, false], ['slot3', false, true]]);
  assert.equal(list[0].summary.chapterLabel, 'Chapter One · Ringborn');
  assert.equal(list[0].summary.party.length, 3);
  assert.equal(list[3].summary, null);
  assert.equal(readSlot('slot3'), null, 'corrupt JSON reads as null');
  assert.equal(latestSlot(), 'slot2', 'newest savedAt; damaged slots ignored');
  store.setItem('voidpath.save.slot1', JSON.stringify({ v: 1, game: 'other-game', roster: {} }));
  assert.equal(listSlots()[1].damaged, true, 'another game\'s data is damaged');
  deleteSlot('slot2');
  assert.equal(latestSlot(), 'auto');
  assert.equal(readSlot('slot9'), null);
  assert.equal(writeSlot('slot9', older).ok, false);
  deleteSlot('slot1');
  deleteSlot('slot3');
});

test('cleared marker', () => {
  assert.equal(isCleared(), false);
  markCleared();
  assert.equal(isCleared(), true);
  assert.equal(store.getItem('voidpath.cleared'), '1');
});

test('throwing storage: saves move to memory for the session and keep working', () => {
  buildState();
  const data = serialize(gameState, { map: 'halcyon', x: 2, z: 2, facing: 'down' });
  store.setItem = () => { throw new Error('QuotaExceededError'); };
  const res = writeSlot('slot1', data);
  assert.equal(res.ok, true);
  assert.equal(res.storage, 'memory');
  assert.match(res.error, /Quota/);
  assert.equal(storageMode(), 'memory');
  assert.deepEqual(writeSlot('slot2', data), { ok: true, storage: 'memory' }, 'the error is reported once');
  assert.equal(readSlot('slot1').credits, 777);
  // even reading localStorage throws now (sandboxed iframe)
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  assert.equal(readSlot('slot2').credits, 777);
  assert.deepEqual(listSlots().filter((s) => !s.empty).map((s) => s.slot), ['auto', 'slot1', 'slot2']);
  resetGame();
  assert.ok(deserialize(readSlot('slot1')));
  assert.equal(gameState.credits, 777);
  deleteSlot('slot1');
  assert.equal(readSlot('slot1'), null);
});
