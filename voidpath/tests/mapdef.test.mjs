// MapDef helpers (world/mapdef.js, TECH_PLAN 3.1-3.2): DEFAULT_LEGEND, normalizeMap, validateMap,
// including the window / door / locked-door shapes the World builder rejects.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LEGEND, normalizeMap, validateMap, normalizeTalk, cellSpec, isWalkableSpec, inlineLines } from '../src/world/mapdef.js';
import { setChapterOrder } from '../src/world/cond.js';
import halcyon from '../src/content/prologue/maps/halcyon.js';
import devBox from '../src/content/dev/maps/dev_box.js';

setChapterOrder(['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'finale', 'epilogue']);

// A small valid room: window pair in the north wall, a door pair in the south wall into a corridor.
const room = (over = {}) => ({
  id: 'fixture',
  name: 'Fixture',
  grid: [
    '        ',
    '#vWWs###',
    '#......#',
    '#......#',
    '###DD###',
    '#......#',
    '########',
  ],
  spawns: { start: { x: 3.5, z: 2.5, facing: 'down' } },
  ...over,
});
const errorsOf = (over) => validateMap(room(over));
const has = (errs, re) => errs.some((e) => re.test(e));

test('the converted POC map, dev_box and the fixture validate', () => {
  assert.deepEqual(validateMap(halcyon), []);
  assert.deepEqual(validateMap(devBox), []);
  assert.deepEqual(validateMap(room()), []);
});

test('DEFAULT_LEGEND reproduces the POC characters', () => {
  for (const ch of [' ', '#', 'v', 's', 'p', 'W', 'D', 'L', '.', ',', 'h', 'g', 'b', 'c']) assert.ok(DEFAULT_LEGEND[ch], ch);
  assert.equal(DEFAULT_LEGEND['#'].tex, 'wall_panel');
  assert.equal(DEFAULT_LEGEND.v.tex, 'wall_panel_vent');
  assert.equal(DEFAULT_LEGEND.s.tex, 'wall_panel_screen');
  assert.equal(DEFAULT_LEGEND.p.tex, 'wall_pipes');
  assert.equal(DEFAULT_LEGEND.W.t, 'window');
  assert.equal(DEFAULT_LEGEND.D.t, 'door');
  assert.equal(DEFAULT_LEGEND.L.lock.id, 'bridge_door');
  assert.equal(DEFAULT_LEGEND.L.lock.flag, 'story:bridge_unlocked');
  assert.equal(DEFAULT_LEGEND.L.lock.item, 'keycard');
  assert.deepEqual(['.', ',', 'h', 'g', 'b', 'c'].map((c) => DEFAULT_LEGEND[c].tex),
    ['floor_plate', 'floor_plate_worn', 'floor_hazard', 'floor_grate', 'floor_bridge', 'floor_cryo']);
  assert.equal(DEFAULT_LEGEND[' '].t, 'void');
});

test('normalizeMap fills defaults, merges the legend and is idempotent', () => {
  const n = normalizeMap(room({ legend: { '~': { t: 'water', tex: 'water', bank: 'water_bank' } } }));
  assert.equal(n.w, 8);
  assert.equal(n.h, 7);
  assert.equal(n.wallH, 3);
  assert.equal(n.lowH, 0.75);
  assert.deepEqual(n.view, { pitch: 34, dist: 16 });
  assert.equal(n.companions, true);
  assert.equal(n.legend['#'].tex, 'wall_panel');
  assert.equal(n.legend['~'].t, 'water');
  assert.deepEqual(n.exits, []);
  assert.deepEqual(JSON.parse(JSON.stringify(normalizeMap(n))), JSON.parse(JSON.stringify(n)));
  // the source MapDef is not mutated
  assert.equal(room().legend, undefined);
});

test('normalizeMap: bosses default to "not yet defeated", exits auto with a fade', () => {
  const n = normalizeMap(room({
    bosses: [{ id: 'b', art: 'drone', x: 3, z: 3, encounter: 'enc_x' }],
    exits: [{ id: 'out', rect: [3, 5, 5, 6], to: { map: 'm', spawn: 's' } }],
  }));
  assert.equal(n.bosses[0].when, '!defeated:enc_x');
  assert.equal(n.bosses[0].triggerRadius, 3.4);
  assert.equal(n.exits[0].auto, true);
  assert.equal(n.exits[0].transition, 'fade');
});

test('TalkSpecs become entry lists; legacy line lists become { lines }', () => {
  assert.deepEqual(normalizeTalk('pro.sera_wakes'), [{ script: 'pro.sera_wakes' }]);
  assert.deepEqual(normalizeTalk(['Hi.', 'Bye.']), [{ lines: ['Hi.', 'Bye.'] }]);
  const lines = [{ speaker: 'BOLT', text: 'Hello' }, { speaker: null, text: '...' }];
  assert.deepEqual(normalizeTalk(lines), [{ lines }]);
  const entries = [{ when: 'story:a', script: 'x.a' }, { script: 'x.b' }];
  assert.deepEqual(normalizeTalk(entries), entries);
  assert.deepEqual(normalizeTalk(normalizeTalk(lines)), [{ lines }], 'idempotent');
  assert.equal(normalizeTalk(undefined), null);
  const n = normalizeMap(room({ npcs: [{ id: 'n', sprite: 'bolt', x: 3, z: 3, talk: 'x.talk' }] }));
  assert.deepEqual(n.npcs[0].talk, [{ script: 'x.talk' }]);
});

test('inlineLines finds legacy lines (poc maps only may keep them)', () => {
  // A poc fixture with inline lines on an NPC and on a locked door. (The Halcyon was converted to
  // scripts by C1 and is no longer a poc map, so it is checked below to hold no inline lines.)
  const legacy = room({
    poc: true,
    legend: { K: { t: 'door', tex: 'door', lock: { flag: 'story:x', id: 'k_door', talk: ['Locked.'] } } },
    npcs: [{ id: 'n', sprite: 'bolt', x: 3, z: 3, talk: ['Hi.', 'Bye.'] }],
  });
  legacy.grid = legacy.grid.map((r, i) => (i === 4 ? '###KK###' : r));
  assert.deepEqual(validateMap(legacy), []);
  assert.ok(inlineLines(legacy).includes('npc:n'));
  assert.ok(inlineLines(legacy).includes('lock:k_door'));
  assert.deepEqual(inlineLines(room({ npcs: [{ id: 'n', sprite: 'bolt', x: 3, z: 3, talk: 'x.talk' }] })), []);
  assert.notEqual(halcyon.poc, true, 'the converted Halcyon is not a poc map');
  assert.deepEqual(inlineLines(halcyon), [], 'the converted Halcyon keeps no inline lines');
});

test('cellSpec and walkability', () => {
  const n = normalizeMap(room());
  assert.equal(cellSpec(n, 0, 0).t, 'void');
  assert.equal(cellSpec(n, 2, 1).t, 'window');
  assert.equal(cellSpec(n, 3, 4).t, 'door');
  assert.equal(cellSpec(n, -1, 2).t, 'void');
  assert.equal(isWalkableSpec(cellSpec(n, 2, 2)), true);
  assert.equal(isWalkableSpec(cellSpec(n, 0, 2)), false);
  assert.equal(isWalkableSpec({ t: 'water', tex: 'water' }), false);
  assert.equal(isWalkableSpec({ t: 'water', tex: 'water', drain: 'sw:m:v' }), true);
  assert.equal(isWalkableSpec({ t: 'pit' }), false);
});

// ---------------------------------------------------------------- rejected shapes

test('rejects a single window (windows come in horizontal pairs)', () => {
  const g = room().grid.slice();
  g[1] = '#vWss###';
  assert.ok(has(errorsOf({ grid: g }), /window at \(2, 1\) must come in horizontal pairs/));
});

test('rejects a window pair without void to the north or floor to the south', () => {
  const g = room().grid.slice();
  g[0] = '  ##    ';
  assert.ok(has(errorsOf({ grid: g }), /window at \(2, 1\) needs void directly north/));
  const g2 = [
    '        ',
    '#vWWs###',
    '##.....#',
    '##.....#',
    '###DD###',
    '#......#',
    '########',
  ];
  g2[2] = '#.#....#';
  assert.ok(has(errorsOf({ grid: g2 }), /window at \(2, 1\) needs floor directly south/));
});

test('rejects a door that is not a horizontal pair', () => {
  const single = room().grid.slice();
  single[4] = '###D####';
  assert.ok(has(errorsOf({ grid: single }), /door at \(3, 4\) must come in horizontal pairs \(run of 1\)/));
  const triple = room().grid.slice();
  triple[4] = '###DDD##';
  assert.ok(has(errorsOf({ grid: triple }), /run of 3/));
});

test('rejects a door in an east/west opening (needs floor north and south)', () => {
  // a vertical door pair in a side wall: east and west openings are plain gaps
  const g = [
    '        ',
    '########',
    '#..D...#',
    '#..D...#',
    '########',
  ];
  const errs = validateMap({ id: 'side', name: 'Side', grid: g, spawns: { a: { x: 1.5, z: 2.5 } } });
  assert.ok(has(errs, /door at \(3, 2\) must come in horizontal pairs/));
  assert.ok(has(errs, /door at \(3, 2\) needs floor north and south/));
});

test('rejects a door in a cutaway wall unless its row is a divider', () => {
  const g = [
    '        ',
    '########',
    '#......#',
    '###DD###',
    '  #..#  ',
    '  ####  ',
  ];
  const def = { id: 'cut', name: 'Cut', grid: g, spawns: { a: { x: 3.5, z: 2.5 } } };
  assert.ok(has(validateMap(def), /door at \(3, 3\) sits in a cutaway wall: give row 3 a divider/));
  assert.deepEqual(validateMap({ ...def, dividers: [{ id: 'south', row: 3, rect: [0, 3, 7, 5] }] }), []);
});

test('rejects a door pair outside a wall row', () => {
  const g = room().grid.slice();
  g[2] = '#..DD..#';
  assert.ok(has(errorsOf({ grid: g }), /door at \(3, 2\) must sit inside a wall row/));
});

test('rejects a locked door without an id, a single locked cell, and duplicate lock ids', () => {
  const noId = errorsOf({ legend: { K: { t: 'door', tex: 'door', lock: { flag: 'story:x' } } }, grid: room().grid.map((r, i) => (i === 4 ? '###KK###' : r)) });
  assert.ok(has(noId, /legend "K": lock needs an id/));
  const single = room().grid.slice();
  single[4] = '###L####';
  assert.ok(has(errorsOf({ grid: single }), /locked door at \(3, 4\) must come in horizontal pairs/));
  const dup = room({ npcs: [{ id: 'bridge_door', sprite: 'bolt', x: 3, z: 3 }] });
  dup.grid = dup.grid.map((r, i) => (i === 4 ? '###LL###' : r));
  assert.ok(has(validateMap(dup), /id "bridge_door" used by npc and locked door/));
});

test('rejects unequal rows, oversized grids, unknown characters and missing fields', () => {
  assert.ok(has(errorsOf({ grid: ['####', '#..', '####'] }), /rows must have equal length/));
  const big = Array.from({ length: 57 }, () => '#'.repeat(73));
  assert.ok(has(errorsOf({ grid: big, spawns: { s: { x: 1, z: 1, requires: 'x' } } }), /exceeds 72x56/));
  const g = room().grid.slice();
  g[2] = '#..?...#';
  assert.ok(has(errorsOf({ grid: g }), /grid character "\?" is not in the legend/));
  assert.ok(has(validateMap({ id: 'x', grid: ['#'] }), /missing "name"/));
});

test('rejects spawns, anchors and viewpoints outside the grid or on walls', () => {
  assert.ok(has(errorsOf({ spawns: { far: { x: 50, z: 2 } } }), /spawn "far" is outside the grid/));
  assert.ok(has(errorsOf({ anchors: { a: { x: 3, z: -1 } } }), /anchor "a" is outside the grid/));
  assert.ok(has(errorsOf({ viewpoints: { v: { x: 3, z: 9 } } }), /viewpoint "v" is outside the grid/));
  assert.ok(has(errorsOf({ spawns: { wall: { x: 0.5, z: 2.5 } } }), /spawn "wall" stands on a wall cell/));
  assert.deepEqual(errorsOf({ spawns: { gated: { x: 0.5, z: 2.5, requires: 'story:x' } } }), [], 'requires excuses a spawn');
});

test('rejects bad conditions, triggers, gates and exits', () => {
  assert.ok(has(errorsOf({ npcs: [{ id: 'n', sprite: 'bolt', x: 3, z: 3, when: 'a &' }] }), /npc "n" when: cond:/));
  assert.ok(has(errorsOf({ triggers: [{ id: 't', on: 'walk', script: 's' }] }), /on must be enter, load or flag/));
  assert.ok(has(errorsOf({ triggers: [{ id: 't', on: 'enter', script: 's' }] }), /enter needs rect or area/));
  assert.ok(has(errorsOf({ triggers: [{ id: 't', on: 'enter', area: 'nope', script: 's' }] }), /unknown area "nope"/));
  assert.ok(has(errorsOf({ gates: [{ id: 'g', rect: [1, 2, 3, 2] }] }), /gate "g" needs an open condition/));
  assert.ok(has(errorsOf({ exits: [{ id: 'e', rect: [1, 5, 2, 6], to: { map: 'x' } }] }), /exit "e" needs to: \{ map, spawn \}/));
  assert.ok(has(errorsOf({ props: [{ t: 'lamp', x: 2, z: 2, on: 'nowhere' }] }), /unknown divider "nowhere"/));
  assert.ok(has(errorsOf({ interactables: [{ id: 'sw', kind: 'switch', x: 2, z: 2 }] }), /switch "sw" needs a flag/));
});
