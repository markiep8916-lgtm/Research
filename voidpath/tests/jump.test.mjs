// buildJumpState (TECH_PLAN 10.1): the state a chapter or jump point starts from, built from a
// fixture registry so the test pins the rules, not Wave C content.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJumpState } from '../src/story/jump.js';
import { CHAPTER_FLAGS, CHAPTER_IDS, PARTY_ALL } from '../src/content/chapters.js';

const spawns = (...ids) => Object.fromEntries(ids.map((id) => [id, { x: 1.5, z: 1.5, facing: 'down' }]));

function fixtureReg() {
  return {
    maps: {
      halcyon: { id: 'halcyon', spawns: spawns('start', 'bridge_starchart', 'cryo') },
      meridian: { id: 'meridian', spawns: spawns('from_shoals') },
    },
    doneFlags: {
      prologue: ['seen:halcyon:sera_wakes', 'talk:halcyon:bolt', 'tut:break'],
      ch1: ['seen:driftmarket:arrival', 'dm:legend_heard'],
      ch2: ['arb:mother_log'],
    },
    jumps: {
      'ch1.wreck': { chapter: 'ch1', map: 'meridian', spawn: 'from_shoals', level: 10, flags: ['story:ruse_met', 'story:maw_lore'], items: { medigel: 2 }, objective: 'ch1.find_coil' },
      'ch1.lost': { chapter: 'ch1', map: 'nowhere', spawn: 'void', level: 9 },
      'pro.duo': { chapter: 'prologue', party: ['kade', 'sera'], leader: 'sera', level: 3 },
      poc: { flags: ['story:kade_awake'] },
    },
    kits: {
      ch1: { equip: { kade: { weapon: 'eq_w_kade_1', armor: 'eq_a_1', accessory: null }, nyx: { weapon: 'eq_w_nyx_1' } }, items: { medigel: 4, ether: 1 }, credits: 300 },
    },
    objectives: {
      'pro.wake': { chapter: 'prologue', text: 'Wake.' },
      'pro.favour': { chapter: 'prologue', text: 'A favour.', side: true },
      'ch1.go_driftmarket': { chapter: 'ch1', text: 'Go.' },
      'ch2.go_arboretum': { chapter: 'ch2', text: 'Go.' },
    },
  };
}

test('a chapter jump unions CHAPTER_FLAGS and doneFlags of every earlier chapter only', () => {
  const js = buildJumpState('ch2', fixtureReg());
  for (const f of [...CHAPTER_FLAGS.prologue, ...CHAPTER_FLAGS.ch1]) assert.equal(js.flags[f], true, f);
  for (const f of ['seen:halcyon:sera_wakes', 'talk:halcyon:bolt', 'tut:break', 'seen:driftmarket:arrival', 'dm:legend_heard']) {
    assert.equal(js.flags[f], true, f);
  }
  for (const f of [...CHAPTER_FLAGS.ch2, 'arb:mother_log']) assert.equal(js.flags[f], undefined, `${f} belongs to ch2 itself`);
  assert.equal(js.chapter, 'ch2');
  assert.equal(js.poc, false);
});

test('party, level, leader and start follow CHAPTERS and CHAPTER_START', () => {
  const js = buildJumpState('ch2', fixtureReg());
  assert.deepEqual(js.party, PARTY_ALL);
  assert.equal(js.level, 12);
  assert.equal(js.leader, 'sera', "the chapter's traveler leads");
  assert.equal(js.map, 'halcyon');
  assert.equal(js.spawn, 'bridge_starchart');
  assert.deepEqual(js.story, { chapter: 'ch2', objective: 'ch2.go_arboretum', done: ['pro.wake', 'ch1.go_driftmarket'] });

  const pro = buildJumpState('prologue', fixtureReg());
  assert.deepEqual(pro.party, ['kade']);
  assert.equal(pro.level, 1);
  assert.equal(pro.leader, 'kade');
  assert.deepEqual(pro.flags, {});
  assert.equal(pro.spawn, 'start');

  const epi = buildJumpState('epilogue', fixtureReg());
  assert.equal(epi.leader, 'kade', 'no traveler: the first member leads');
  assert.equal(epi.spawn, 'cryo');
  for (const ch of CHAPTER_IDS.slice(0, -1)) for (const f of CHAPTER_FLAGS[ch]) assert.equal(epi.flags[f], true);
});

test('the chapter kit gives items, gear for party members and credits', () => {
  const js = buildJumpState('ch1', fixtureReg());
  assert.deepEqual(js.items, { medigel: 4, ether: 1 });
  assert.equal(js.credits, 300);
  assert.deepEqual(js.equip.kade, { weapon: 'eq_w_kade_1', armor: 'eq_a_1', accessory: null });
  assert.deepEqual(js.equip.nyx, { weapon: 'eq_w_nyx_1' });
  assert.equal(js.leader, 'nyx');
  assert.deepEqual(buildJumpState('ch3', fixtureReg()).items, {}, 'no kit: no items');
});

test('a jump point adds its flags and items; its level, map, spawn and objective win', () => {
  const js = buildJumpState('ch1.wreck', fixtureReg());
  assert.equal(js.chapter, 'ch1');
  assert.equal(js.level, 10);
  assert.equal(js.map, 'meridian');
  assert.equal(js.spawn, 'from_shoals');
  assert.equal(js.story.objective, 'ch1.find_coil');
  assert.equal(js.flags['story:ruse_met'], true);
  assert.equal(js.flags['story:prologue_done'], true);
  assert.equal(js.flags['seen:halcyon:sera_wakes'], true);
  assert.equal(js.flags['seen:driftmarket:arrival'], undefined, 'doneFlags of the jump chapter itself are not implied');
  assert.deepEqual(js.items, { medigel: 6, ether: 1 });

  const duo = buildJumpState('pro.duo', fixtureReg());
  assert.deepEqual(duo.party, ['kade', 'sera']);
  assert.equal(duo.leader, 'sera');
  assert.equal(duo.level, 3);
});

test('a missing map or spawn falls back to halcyon:bridge_starchart with a warning', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const js = buildJumpState('ch1.lost', fixtureReg());
  assert.equal(js.map, 'halcyon');
  assert.equal(js.spawn, 'bridge_starchart');
  assert.equal(warn.mock.callCount(), 1);
  const ch4 = buildJumpState('ch4', fixtureReg());
  assert.equal(`${ch4.map}:${ch4.spawn}`, 'halcyon:bridge_starchart', 'spire is not registered in the fixture');
  assert.equal(warn.mock.callCount(), 2);
});

test("'poc' is the resetGame party at halcyon:start with the poc jump's flags", () => {
  const js = buildJumpState('poc', fixtureReg());
  assert.equal(js.poc, true);
  assert.deepEqual(js.party, ['kade', 'nyx', 'orion', 'sera']);
  assert.deepEqual(js.flags, { 'story:kade_awake': true });
  assert.equal(`${js.map}:${js.spawn}`, 'halcyon:start');
  assert.deepEqual(buildJumpState('poc', { maps: {} }).flags, {}, 'Wave S: no poc jump registered, no flags');
});

test('unknown targets throw', () => {
  assert.throws(() => buildJumpState('ch9', fixtureReg()), /unknown target/);
  assert.throws(() => buildJumpState('nope.jump', fixtureReg()), /unknown target/);
});

test('the registered content builds a valid jump for every chapter', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const { registerAllData } = await import('../src/content/data.js');
  const REG = registerAllData();
  for (const ch of CHAPTER_IDS) {
    const js = buildJumpState(ch, REG);
    assert.ok(js.party.length >= 1, ch);
    assert.ok(js.party.includes(js.leader), ch);
    assert.equal(typeof js.map, 'string', ch);
  }
});
