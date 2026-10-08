// Content registry and content lints (TECH_PLAN 2.6, 10.3). The registered content (every
// location's pure.js) must pass the lints; seeded fixtures prove each lint fails when it should.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerAllData, registry, REG, getMap, createRegistry, locationOfMap, locationOfArt, PURE_LOCATIONS,
} from '../src/content/data.js';
import { ENEMIES, ENCOUNTERS, ITEMS, ENCOUNTER_TABLES } from '../src/battle/data.js';
import { CHAPTER_IDS, CHAPTER_START, CHAPTER_FLAGS, startParty, flagsBefore } from '../src/content/chapters.js';
import { testCond } from '../src/world/cond.js';
import { lintContent, formatFindings, chapterBounded } from '../tools/contentlint.mjs';
import { dryRun } from '../tools/scriptcheck.mjs';

// ------------------------------------------------------------------ fixtures

const ROOM = () => ({
  id: 'fx_room', name: 'Fixture Room',
  grid: [
    '#######',
    '#.....#',
    '#.....#',
    '#######',
  ],
  spawns: { start: { x: 2.5, z: 1.5, facing: 'down' }, east: { x: 5.5, z: 2.5, facing: 'left' } },
  npcs: [{ id: 'guide', sprite: 'bolt', x: 1.5, z: 2.5, name: 'BOLT', talk: 'fx.talk' }],
  interactables: [{ id: 'lever', kind: 'switch', x: 4.5, z: 1.5, flag: 'sw:fx_room:lever', mode: 'toggle', label: 'Pull' }],
  triggers: [{ id: 'intro', on: 'enter', rect: [1, 1, 6, 3], when: 'story:fx_start & !seen:fx_room:intro', once: true, script: 'fx.intro' }],
  exits: [{ id: 'out', rect: [5, 1, 6, 3], to: { map: 'fx_room', spawn: 'start' } }],
  props: [{ t: 'crate', x: 3.5, z: 1.5, when: 'sw:fx_room:lever' }],
});

function base() {
  return {
    id: 'fx', chapter: 'prologue', name: 'Fixture',
    data: {},
    story: {
      scripts: {
        'fx.talk': async (cs) => { await cs.say('BOLT', 'Hello.'); },
        'fx.intro': async (cs) => { cs.flag('story:fx_intro_done'); },
      },
      doneFlags: { prologue: ['story:fx_start'] },
    },
    maps: { fx_room: ROOM() },
  };
}

function fixtureRegistry() {
  return createRegistry({
    tables: { enemies: { ...ENEMIES }, encounters: { ...ENCOUNTERS }, items: { ...ITEMS }, zones: { ...ENCOUNTER_TABLES }, bossScripts: {} },
    onBossScript: null,
    balance: null,
  });
}

function lintFixture(...locs) {
  const reg = fixtureRegistry();
  for (const l of locs) reg.registerData(l);
  reg.finishRegistration();
  return lintContent(reg);
}

const rules = (res) => res.errors.map((e) => `${e.rule}: ${e.msg}`);
function expectError(res, rule, re) {
  const hit = res.errors.find((e) => e.rule === rule && re.test(e.msg));
  assert.ok(hit, `expected a [${rule}] error matching ${re}; got:\n${formatFindings(res.errors) || '  (none)'}`);
}

// ------------------------------------------------------------------ registered content

test('registered content passes the content lints', async () => {
  registerAllData();
  const dr = await dryRun(registry);
  const res = lintContent(registry, { written: dr.flagsSet, reads: dr.conds });
  assert.equal(res.errors.length, 0, `content lint errors:\n${formatFindings(res.errors)}`);
});

test('registerAllData() twice is a no-op', () => {
  const r1 = registerAllData();
  const snap = {
    locations: Object.keys(REG.locations).length, maps: Object.keys(REG.maps).length,
    scripts: Object.keys(REG.scripts).length, scenes: REG.scenes.length, destinations: REG.destinations.length,
    enemies: Object.keys(ENEMIES).length, encounters: Object.keys(ENCOUNTERS).length, items: Object.keys(ITEMS).length,
  };
  const r2 = registerAllData();
  assert.equal(r1, r2);
  assert.deepEqual({
    locations: Object.keys(REG.locations).length, maps: Object.keys(REG.maps).length,
    scripts: Object.keys(REG.scripts).length, scenes: REG.scenes.length, destinations: REG.destinations.length,
    enemies: Object.keys(ENEMIES).length, encounters: Object.keys(ENCOUNTERS).length, items: Object.keys(ITEMS).length,
  }, snap);
  for (const loc of PURE_LOCATIONS) assert.equal(registry.registerData(loc), false, `${loc.id} registered twice`);
  assert.equal(registry.finishRegistration(), false, 'no balance pass without new content');
});

test('every location folder registers with its fixed id and chapter', () => {
  registerAllData();
  const want = ['common', 'prologue', 'driftmarket', 'shoals', 'arboretum', 'spire', 'vault', 'heart', 'dreams', 'warden', 'epilogue', 'dev'];
  assert.deepEqual(Object.keys(REG.locations), want);
  for (const id of want) {
    const loc = REG.locations[id];
    assert.ok(CHAPTER_IDS.includes(loc.chapter), `${id}: chapter ${loc.chapter}`);
    assert.ok(loc.data && loc.story && loc.maps, `${id}: data, story and maps`);
  }
  assert.equal(locationOfMap('halcyon'), 'prologue');
  assert.ok(getMap('halcyon').grid.length > 0);
  assert.equal(getMap('no_such_map'), null);
});

test('a different object with a taken id throws and changes nothing', () => {
  registerAllData();
  assert.throws(() => registry.registerData({ id: 'shoals', chapter: 'ch1', name: 'x', data: {}, story: {}, maps: {} }),
    { message: 'content: duplicate locations id "shoals" (shoals vs shoals)' });

  const reg = fixtureRegistry();
  reg.registerData({ id: 'a', chapter: 'prologue', name: 'A', data: { encounters: { x_enc: { id: 'x_enc', enemies: ['drone'] } } }, story: {}, maps: {} });
  const b = { id: 'b', chapter: 'ch1', name: 'B', data: { items: { b_item: { id: 'b_item', name: 'B' } }, encounters: { x_enc: { id: 'x_enc', enemies: ['crawler'] } } }, story: { scripts: { 'b.s': async () => {} } }, maps: {} };
  assert.throws(() => reg.registerData(b), { message: 'content: duplicate encounters id "x_enc" (a vs b)' });
  assert.equal(reg.tables.items.b_item, undefined, 'a failed registration merges nothing');
  assert.equal(reg.REG.scripts['b.s'], undefined);
  assert.equal(reg.REG.locations.b, undefined);
  assert.deepEqual(reg.tables.encounters.x_enc.enemies, ['drone']);
  assert.throws(() => reg.registerData({ id: 'c', chapter: 'ch1', name: 'C', data: { enemies: { drone: {} } }, story: {}, maps: {} }),
    { message: 'content: duplicate enemies id "drone" (core vs c)' });
});

test('registerLocation hands browser parts to the registrars once', () => {
  const reg = fixtureRegistry();
  const calls = [];
  const rec = (kind) => (...args) => calls.push([kind, args[0]]);
  reg.setRegistrars({ texture: rec('texture'), character: rec('character'), enemyArt: rec('enemyArt'), preset: rec('preset'), prop: rec('prop'), arena: rec('arena'), actionFx: rec('actionFx') });
  const pure = base();
  const index = {
    ...pure,
    art: { textures: { fx_floor: { w: 32, h: 32 } }, characters: { fx_npc: {} }, enemyArt: { fx_boss: {} }, particles: { fx_dust: [{}] } },
    enemyArt: { fx_mite: {} }, props: { 'fx.pillar': { build() {} } }, arenas: { fx_arena: { build() {} } }, actionFx: { 'fx.beam': async () => {} },
  };
  assert.equal(reg.registerData(pure), true);
  assert.equal(reg.registerLocation(index), true, 'the index object of a registered pure.js adds its art');
  assert.equal(reg.registerLocation(index), false);
  assert.deepEqual(calls.map((c) => c.join(':')).sort(), [
    'actionFx:fx.beam', 'arena:fx_arena', 'character:fx_npc', 'enemyArt:fx_boss', 'enemyArt:fx_mite', 'preset:fx_dust', 'prop:fx.pillar', 'texture:fx_floor',
  ]);
  assert.equal(reg.locationOfArt('tex', 'fx_floor'), 'fx');
  assert.equal(reg.locationOfArt('portrait', 'fx_npc:sad'), 'fx');
  assert.equal(reg.locationOfArt('enemy', 'fx_mite'), 'fx');
  assert.equal(reg.locationOfArt('tex', 'wall_panel'), 'core');
  assert.equal(reg.locationOfMap('fx_room'), 'fx');
  assert.equal(locationOfArt('tex', 'no_such_texture'), 'core');
  assert.ok(reg.REG.props['fx.pillar'] && reg.REG.arenas.fx_arena && reg.REG.actionFx['fx.beam']);
});

test('getMap merges extends: arrays in chapter order, talk latest chapter first', () => {
  const reg = fixtureRegistry();
  const owner = base();
  const ext = (id, chapter, n) => ({
    id, chapter, name: id, data: {}, story: {
      extends: {
        fx_room: {
          npcs: [{ id: `${id}.npc`, sprite: 'holo', x: 2.5, z: 2.5, when: `chapter>=${chapter}` }],
          talk: { guide: [{ when: `chapter>=${chapter}`, script: `${id}.talk${n}` }], bolt: [{ when: `chapter>=${chapter}`, script: `${id}.bolt` }] },
        },
      },
    }, maps: {},
  });
  reg.registerData(ext('spire', 'ch3', 3));
  reg.registerData(owner);
  reg.registerData(ext('driftmarket', 'ch1', 1));
  reg.registerData(ext('arboretum', 'ch2', 2));
  const m = reg.getMap('fx_room');
  assert.deepEqual(m.npcs.map((n) => n.id), ['guide', 'driftmarket.npc', 'arboretum.npc', 'spire.npc']);
  assert.deepEqual(m.npcs[0].talk.map((t) => t.script), ['spire.talk3', 'arboretum.talk2', 'driftmarket.talk1', 'fx.talk']);
  assert.deepEqual(m.talk.bolt.map((t) => t.script), ['spire.bolt', 'arboretum.bolt', 'driftmarket.bolt']);
  assert.equal(reg.getMap('fx_room'), m, 'cached');
  assert.equal(REG.maps.fx_room, undefined, 'fixture registries are isolated');
});

test('chapters: order, starts and flags', () => {
  assert.deepEqual(CHAPTER_IDS, ['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'finale', 'epilogue']);
  assert.deepEqual(startParty('prologue'), ['kade']);
  assert.deepEqual(startParty('ch2'), ['kade', 'sera', 'orion', 'nyx']);
  assert.equal(CHAPTER_START.ch4.map, 'spire');
  assert.deepEqual(flagsBefore('ch1'), CHAPTER_FLAGS.prologue);
  assert.ok(testCond('chapter>=ch2', { story: { chapter: 'ch3' }, flags: {} }), 'cond.js knows the chapter order');
  assert.ok(!testCond('chapter>=ch2', { story: { chapter: 'ch1' }, flags: {} }));
  assert.ok(chapterBounded('story:x & !seen:a:b') && chapterBounded('chapter<ch2') && !chapterBounded('!seen:a:b'));
});

// ------------------------------------------------------------------ seeded violations

test('the clean fixture passes, so every failure below comes from its seed', () => {
  const res = lintFixture(base());
  assert.deepEqual(rules(res), []);
});

test('lint: a spawn on a wall', () => {
  const loc = base();
  loc.maps.fx_room.spawns.bad = { x: 0.5, z: 0.5, facing: 'down' };
  expectError(lintFixture(loc), 'map', /spawn "bad" stands on a wall cell/);
});

test('lint: a flag nobody writes', () => {
  const loc = base();
  loc.maps.fx_room.npcs[0].when = 'story:fx_start & !fx:never_written';
  expectError(lintFixture(loc), 'softlock', /flag "fx:never_written" is read but nothing writes it/);
});

test('lint: a missing script', () => {
  const loc = base();
  loc.maps.fx_room.triggers[0].script = 'fx.nope';
  expectError(lintFixture(loc), 'script', /missing script "fx.nope"/);
});

test('lint: an unbounded extends entry', () => {
  const other = { id: 'fx2', chapter: 'ch1', name: 'Other', data: {}, story: {
    scripts: { 'fx2.hello': async () => {} },
    extends: { fx_room: { npcs: [{ id: 'fx2.visitor', sprite: 'holo', x: 2.5, z: 2.5, when: '!seen:fx_room:intro' }] } },
  }, maps: {} };
  expectError(lintFixture(base(), other), 'bounded', /extends\.fx_room\.npcs "fx2\.visitor"/);
  other.story.extends.fx_room.npcs[0].when = 'chapter>=ch1';
  delete other.story.extends.fx_room.npcs[0].id;
  other.story.extends.fx_room.talk = { guide: [{ script: 'fx2.hello' }] };
  expectError(lintFixture(base(), other), 'bounded', /extends\.fx_room\.talk "guide"/);
});

test('lint: an unbounded story trigger', () => {
  const loc = base();
  loc.maps.fx_room.triggers[0].when = '!seen:fx_room:intro';
  expectError(lintFixture(loc), 'bounded', /trigger "intro"/);
});

test('lint: exits and destinations to unknown spawns', () => {
  const loc = base();
  loc.maps.fx_room.exits[0].to = { map: 'fx_room', spawn: 'nowhere' };
  loc.story.destinations = [{ id: 'fx_dest', name: 'X', map: 'no_map', spawn: 'dock', unlock: 'unlock:fx_dest', order: 1 }];
  const res = lintFixture(loc);
  expectError(res, 'ref', /exit "out" -> unknown spawn "fx_room:nowhere"/);
  expectError(res, 'ref', /destination "fx_dest" -> unknown map "no_map"/);
});

test('lint: battle data, zones and items', () => {
  const loc = base();
  loc.data = {
    enemies: { fx_mite: { kind: 'fx_mite', name: 'Mite', actions: [{ id: 'swarm', summon: { kind: 'fx_ghost' } }], phases: [{ at: 0.5, transform: 'fx_big' }] } },
    encounters: { fx_pack: { id: 'fx_pack', enemies: ['fx_mite', 'fx_nothing'] }, oops_enc: { id: 'oops_enc', enemies: ['drone'] } },
    zones: { fx_zone: ['fx_pack', 'fx_pack', 'fx_missing'] },
    shops: { fx_shop: { name: 'Shop', stock: [{ item: 'medigel' }, { item: 'fx_unobtainium' }] } },
  };
  loc.maps.fx_room.areas = [{ id: 'hall', name: 'Hall', rect: [0, 0, 7, 4], zone: 'fx_zone_typo' }];
  const res = lintFixture(loc);
  expectError(res, 'enemy', /encounter "fx_pack" names unknown enemy "fx_nothing"/);
  expectError(res, 'enemy', /summons unknown "fx_ghost"/);
  expectError(res, 'enemy', /phase transform to unknown "fx_big"/);
  expectError(res, 'zone', /zone "fx_zone" lists unknown encounter "fx_missing"/);
  expectError(res, 'zone', /zone "fx_zone" has 2 formations/);
  expectError(res, 'item', /shop "fx_shop" lists unknown item "fx_unobtainium"/);
  expectError(res, 'enemy', /unknown zone "fx_zone_typo"/);
});

test('lint: inline lines outside poc maps, id prefixes', () => {
  const loc = base();
  loc.maps.fx_room.npcs[0].talk = [{ speaker: 'BOLT', text: 'Inline.' }];
  loc.story.scripts['other.thing'] = async () => {};
  const other = { id: 'fx2', chapter: 'ch1', name: 'Other', data: {}, story: {
    extends: { fx_room: { interactables: [{ id: 'socket', kind: 'inspect', x: 3.5, z: 2.5, when: 'chapter>=ch1', talk: 'fx.talk' }] } },
  }, maps: {} };
  const res = lintFixture(loc, other);
  expectError(res, 'inline', /npc:guide holds inline lines/);
  expectError(res, 'id', /script id "other.thing" must start with "fx."/);
  expectError(res, 'id', /id "socket" must start with the location code/);
  loc.maps.fx_room.poc = true;
  assert.ok(!lintFixture(loc).errors.some((e) => e.rule === 'inline'), 'poc maps may keep inline lines');
});

test('lint: a map NPC that takes a party member id', () => {
  const loc = base();
  loc.maps.fx_room.npcs[0].id = 'orion';
  expectError(lintFixture(loc), 'id', /npc "orion" uses a party member id/);
});

test('lint: a condition that does not compile', () => {
  const loc = base();
  loc.story.partyTalks = { 'fx.pt': { chapter: 'prologue', members: ['kade', 'sera'], title: 'T', when: 'story:a &', script: 'fx.talk' } };
  expectError(lintFixture(loc), 'cond', /party talk "fx.pt" when/);
});
