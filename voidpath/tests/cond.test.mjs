// Condition mini-language (world/cond.js, TECH_PLAN 3.11): precedence, negation, parentheses,
// every term kind, upper-case flags, syntax errors, condFlags and the default state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compileCond, testCond, setChapterOrder, condFlags, setDefaultState } from '../src/world/cond.js';

setChapterOrder(['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'finale', 'epilogue']);

const state = (over = {}) => ({
  flags: {},
  inventory: {},
  party: [{ id: 'kade' }, { id: 'sera' }],
  leader: 'kade',
  roster: { kade: { id: 'kade', equip: { weapon: null, armor: null, accessory: null } } },
  story: { chapter: 'ch1' },
  ...over,
});

test('empty and missing conditions are true', () => {
  assert.equal(testCond(undefined, state()), true);
  assert.equal(testCond('', state()), true);
  assert.equal(testCond(null, state()), true);
  assert.equal(testCond('   ', state()), true);
});

test('flags: truthy values hold, names may use : . - _ and upper case', () => {
  const s = state({ flags: { 'story:sera_joined': true, 'seen:halcyon:sera-wakes.v2': 1, BOSS_DOWN: true, off: false } });
  assert.equal(testCond('story:sera_joined', s), true);
  assert.equal(testCond('seen:halcyon:sera-wakes.v2', s), true);
  assert.equal(testCond('BOSS_DOWN', s), true);
  assert.equal(testCond('boss_down', s), false, 'flags are case sensitive');
  assert.equal(testCond('off', s), false);
  assert.equal(testCond('missing', s), false);
});

test('precedence: & binds tighter than |', () => {
  const s = state({ flags: { a: true } });
  // a | (b & c) -> true; (a | b) & c would be false
  assert.equal(testCond('a | b & c', s), true);
  assert.equal(testCond('b & c | a', s), true);
  assert.equal(testCond('(a | b) & c', s), false);
});

test('negation and double negation', () => {
  const s = state({ flags: { a: true } });
  assert.equal(testCond('!a', s), false);
  assert.equal(testCond('!b', s), true);
  assert.equal(testCond('!!a', s), true);
  assert.equal(testCond('!(a & b)', s), true);
  assert.equal(testCond('!a | !b', s), true);
  assert.equal(testCond('! a', s), false, 'whitespace after ! is allowed');
});

test('parentheses nest', () => {
  const s = state({ flags: { a: true, c: true } });
  assert.equal(testCond('((a))', s), true);
  assert.equal(testCond('(a & (b | c)) & !(b & c)', s), true);
  assert.equal(testCond('!(a & (b | !c))', s), true);
});

test('item: counts inventory and equipped gear', () => {
  const s = state({ inventory: { keycard: 1, medigel: 0 } });
  assert.equal(testCond('item:keycard', s), true);
  assert.equal(testCond('item:medigel', s), false);
  assert.equal(testCond('item:eq_x_ghost_signal', s), false);
  s.roster.kade.equip.accessory = 'eq_x_ghost_signal';
  assert.equal(testCond('item:eq_x_ghost_signal', s), true);
  // POC states without a roster read the party members' equipment
  const poc = { flags: {}, inventory: {}, party: [{ id: 'nyx', equip: { weapon: 'eq_w_nyx_1' } }] };
  assert.equal(testCond('item:eq_w_nyx_1', poc), true);
});

test('party: and leader:', () => {
  const s = state();
  assert.equal(testCond('party:sera', s), true);
  assert.equal(testCond('party:nyx', s), false);
  assert.equal(testCond('leader:kade', s), true);
  assert.equal(testCond('leader:sera', s), false);
  // without a leader field the first party member leads
  assert.equal(testCond('leader:kade', { flags: {}, party: [{ id: 'kade' }] }), true);
});

test('chapter>= and chapter< follow setChapterOrder', () => {
  const s = state();
  assert.equal(testCond('chapter>=ch1', s), true);
  assert.equal(testCond('chapter>=ch2', s), false);
  assert.equal(testCond('chapter<ch2', s), true);
  assert.equal(testCond('chapter<ch1', s), false);
  assert.equal(testCond('chapter>=prologue', state({ story: { chapter: 'epilogue' } })), true);
  assert.equal(testCond('chapter>=ch1 & !story:ch1_done', s), true);
  assert.equal(testCond('chapter>=ch1&story:x|chapter<ch1', s), false, 'no spaces needed');
});

test('syntax errors throw Error("cond: ...")', () => {
  for (const bad of ['a &', '& a', 'a | | b', '(a', 'a)', 'a b', '!', 'a $ b', 'chapter>=', 'chapter=ch1', 'chapter', 'item:', 'party:', '()']) {
    assert.throws(() => compileCond(bad), /^Error: cond: /, `"${bad}" should not compile`);
  }
  assert.throws(() => compileCond('chapter>=ch9'), /unknown chapter "ch9"/);
});

test('compileCond caches by string and returns predicates', () => {
  const f = compileCond('a & !b');
  assert.equal(typeof f, 'function');
  assert.equal(compileCond('a & !b'), f);
  assert.equal(f(state({ flags: { a: true } })), true);
  assert.equal(f(state({ flags: { a: true, b: true } })), false);
});

test('condFlags lists the flags a condition reads (not item/party/leader/chapter terms)', () => {
  assert.deepEqual(condFlags('story:a & !(seen:m:t | item:keycard) & chapter>=ch1 & party:kade & leader:sera & story:a'), ['story:a', 'seen:m:t']);
  assert.deepEqual(condFlags(''), []);
  assert.deepEqual(condFlags(undefined), []);
});

test('testCond without a state reads the default state', () => {
  const s = state({ flags: { lit: true } });
  setDefaultState(s);
  assert.equal(testCond('lit'), true);
  assert.equal(testCond('dark'), false);
});
