// Unit tests for core/progression.js, the roster/party helpers of core/state.js, core/shop.js and the
// common item, equipment and kit data (node --test). TECH_PLAN 5.1-5.7.

import test from 'node:test';
import assert from 'node:assert/strict';
import { PARTY_DEFS, SKILLS, ITEMS, DAMAGE_TYPES, BATTLE_RULES, ENEMIES } from '../src/battle/data.js';
import {
  LEARNSETS, ULTIMATES, MAX_LEVEL, SLOTS, statsAt, makeMemberAt, refreshMember, learnByLevel, learnFromFlags,
  canEquip, equip, equipDelta, equipBonus, optimize, gearEffects, gearTypesValid,
} from '../src/core/progression.js';
import {
  gameState, resetGame, newGame, joinParty, leaveParty, setLeader, moveMember, gainXp, xpToNext,
  useItemOutOfBattle, kitFor,
} from '../src/core/state.js';
import { shopStock, buy, sell, sellPrice, sellable, MAX_STACK } from '../src/core/shop.js';
import '../src/content/chapters.js'; // hands the chapter order to the condition language
import common from '../src/content/common/data.js';
import { statLine, ARCHETYPES, ZONE_RATE_DEFAULT, overrides, applyBalance } from '../src/content/balance.js';

// Content registration merges common items into ITEMS in place (content/registry.js); do the same.
Object.assign(ITEMS, common.items);

const MEMBERS = ['kade', 'nyx', 'orion', 'sera'];
const inv = () => gameState.inventory;

// ------------------------------------------------------------------------------------------ levels

test('statsAt: linear growth anchored on the POC stats (KADE 1: 190 HP / ATK 31, 32: 1120 / 124)', () => {
  assert.equal(statsAt('kade', 1).maxHp, 190);
  assert.equal(statsAt('kade', 1).atk, 31);
  assert.equal(statsAt('kade', 32).maxHp, 1120);
  assert.equal(statsAt('kade', 32).atk, 124);
  for (const id of MEMBERS) {
    const d = PARTY_DEFS[id];
    assert.deepEqual(statsAt(id, d.level), { ...d.base }, `${id} at its POC level is the POC base`);
    const a = statsAt(id, 20);
    const b = statsAt(id, 21);
    for (const k of Object.keys(d.growth)) assert.equal(b[k] - a[k], d.growth[k], `${id}.${k} grows linearly`);
  }
  assert.throws(() => statsAt('nobody', 3));
});

test('statsAt: floors (HP 120, EP 20, stats 8)', () => {
  const g = PARTY_DEFS.orion.growth;
  const saved = { ...g };
  Object.assign(g, { maxHp: 500, maxEp: 500, atk: 100, def: 100, mag: 100, res: 100, spd: 100 });
  try {
    assert.deepEqual(statsAt('orion', 1), { maxHp: 120, maxEp: 20, atk: 8, def: 8, mag: 8, res: 8, spd: 8 });
  } finally {
    Object.assign(g, saved);
  }
});

test('learnsets follow table 5.4 and every skill is a well-formed SKILLS entry of its member', () => {
  const at = (id, skill) => LEARNSETS[id].find((e) => e.skill === skill)?.level;
  assert.deepEqual(LEARNSETS.kade.map((e) => e.skill), ['arc_slash', 'cross_edge', 'provoke', 'lance_charge', 'rally',
    'storm_lance', 'aegis_stance', 'thunder_rend', 'skyfall']);
  assert.equal(at('kade', 'lance_charge'), 8);
  assert.equal(at('nyx', 'cryo_round'), 1);
  assert.equal(at('nyx', 'dead_eye'), 20);
  assert.equal(at('orion', 'entropy'), 30);
  assert.equal(at('sera', 'clarity'), 9);
  assert.equal(at('sera', 'revive'), 6);
  for (const id of MEMBERS) {
    const levels = LEARNSETS[id].map((e) => e.level);
    assert.deepEqual(levels, [...levels].sort((a, b) => a - b), `${id} in level order`);
    for (const { skill } of LEARNSETS[id]) assert.equal(SKILLS[skill]?.user, id, `${skill} belongs to ${id}`);
    for (const s of PARTY_DEFS[id].skills) assert.ok(LEARNSETS[id].some((e) => e.skill === s), `POC skill ${s} is learnable`);
    const ult = SKILLS[ULTIMATES[id]];
    assert.equal(ult.ultimate, true);
    assert.equal(ult.user, id);
    assert.ok(!LEARNSETS[id].some((e) => e.skill === ult.id), 'ultimates come from flags, not levels');
  }
  assert.deepEqual(ULTIMATES, { kade: 'oathblade', nyx: 'ringfire_barrage', orion: 'singularity', sera: 'lifebloom' });
});

test('makeMemberAt: campaign member at full HP/EP with every skill up to its level', () => {
  const m = makeMemberAt('sera', 9, { flags: {} });
  assert.equal(m.campaign, true);
  assert.equal(m.level, 9);
  assert.deepEqual(m.skills, ['nanoheal', 'photon_lance', 'restore_field', 'revive', 'clarity']);
  const s = statsAt('sera', 9);
  assert.equal(m.maxHp, s.maxHp);
  assert.equal(m.hp, m.maxHp);
  assert.equal(m.ep, m.maxEp);
  assert.deepEqual(m.stats, { atk: s.atk, def: s.def, mag: s.mag, res: s.res, spd: s.spd });
  assert.deepEqual(m.equip, { weapon: null, armor: null, accessory: null });
  assert.equal(m.xpNext, xpToNext(9));
  for (const f of ['id', 'name', 'cls', 'level', 'xp', 'xpNext', 'hp', 'maxHp', 'ep', 'maxEp', 'stats', 'weapons', 'skills', 'alive', 'mods']) {
    assert.ok(f in m, f);
  }
  assert.equal(makeMemberAt('kade', 99).level, MAX_LEVEL);
  assert.equal(makeMemberAt('kade', 0).level, 1);
});

test('ultimates: ult:<member> flags grant them once (makeMemberAt and learnFromFlags)', () => {
  const m = makeMemberAt('nyx', 12, { flags: {} });
  assert.ok(!m.skills.includes('ringfire_barrage'));
  assert.deepEqual(learnFromFlags(m, { 'ult:kade': true }), []);
  assert.deepEqual(learnFromFlags(m, { 'ult:nyx': true }), ['ringfire_barrage']);
  assert.deepEqual(learnFromFlags(m, { 'ult:nyx': true }), [], 'only once');
  const loaded = makeMemberAt('nyx', 12, { flags: { 'ult:nyx': true } });
  assert.equal(loaded.skills.at(-1), 'ringfire_barrage');
});

test('gainXp (campaign): levels up, refreshes keeping the HP deficit, reports learned skills', () => {
  newGame();
  const k = gameState.party[0];
  k.hp = k.maxHp - 50;
  const g = PARTY_DEFS.kade.growth;
  const ups = gainXp(k, xpToNext(1) + xpToNext(2) + 7);
  assert.deepEqual(ups.map((u) => u.level), [2, 3]);
  assert.deepEqual(ups[0].gains, { maxHp: g.maxHp, maxEp: g.maxEp, atk: g.atk, def: g.def, mag: g.mag, res: g.res, spd: g.spd });
  assert.deepEqual(ups.map((u) => u.learned), [[], ['cross_edge']]);
  assert.equal(k.xp, 7);
  assert.equal(k.hp, k.maxHp - 50, 'HP deficit kept');
  assert.equal(k.maxHp, statsAt('kade', 3).maxHp + ITEMS.eq_a_1.equip.stats.maxHp);
  assert.deepEqual(learnByLevel(k), [], 'nothing new');
  k.level = MAX_LEVEL - 1;
  refreshMember(k);
  const last = gainXp(k, 999999);
  assert.deepEqual(last.map((u) => u.level), [MAX_LEVEL]);
  assert.equal(k.xp, 0);
  assert.deepEqual(gainXp(k, 500), [], 'capped at MAX_LEVEL');
});

// ------------------------------------------------------------------------------------------ roster and party

test('resetGame: POC party (no learnsets) mirrored in the roster, leader kade, default story', () => {
  resetGame();
  assert.deepEqual(Object.keys(gameState.roster), ['kade', 'nyx', 'orion', 'sera']);
  for (const m of gameState.party) {
    assert.equal(gameState.roster[m.id], m, 'party entries are the roster objects');
    assert.ok(!m.campaign);
    assert.deepEqual(m.skills, PARTY_DEFS[m.id].skills);
    assert.deepEqual(m.equip, { weapon: null, armor: null, accessory: null });
  }
  assert.equal(gameState.leader, 'kade');
  assert.deepEqual(gameState.story, { chapter: 'prologue', objective: 'pro.wake', done: [] });
  assert.deepEqual(gameState.played, []);
});

test('newGame: KADE alone at level 1 with the prologue kit', () => {
  const { party, roster, story, inventory } = gameState;
  gameState.played.push('x');
  gameState.flags.foo = true;
  newGame();
  assert.equal(gameState.party, party, 'party array identity kept');
  assert.equal(gameState.roster, roster);
  assert.equal(gameState.story, story);
  assert.equal(gameState.inventory, inventory);
  assert.deepEqual(party.map((m) => [m.id, m.level, m.campaign]), [['kade', 1, true]]);
  assert.equal(roster.kade, party[0]);
  assert.deepEqual(Object.keys(roster), ['kade']);
  assert.equal(gameState.leader, 'kade');
  const kit = kitFor('prologue');
  assert.deepEqual(party[0].equip, kit.equip.kade);
  assert.deepEqual(inventory, kit.items);
  assert.equal(gameState.credits, kit.credits);
  assert.deepEqual(story, { chapter: 'prologue', objective: 'pro.wake', done: [] });
  assert.deepEqual(gameState.played, []);
  assert.deepEqual(gameState.flags, {});
  assert.equal(party[0].hp, party[0].maxHp);
  assert.deepEqual(party[0].skills, ['arc_slash']);
});

test('joinParty: default level max(2, round(avg)), skills below the join level, tier-1 gear, full HP/EP', () => {
  newGame();
  const party = gameState.party;
  const sera = joinParty('sera');
  assert.equal(sera.level, 2, 'KADE at 1 -> max(2, 1)');
  assert.deepEqual(sera.skills, ['nanoheal', 'photon_lance']);
  assert.deepEqual(sera.equip, kitFor('prologue').equip.sera);
  assert.equal(sera.hp, sera.maxHp);
  assert.equal(sera.ep, sera.maxEp);
  assert.equal(gameState.roster.sera, sera);
  party[0].level = 9;
  party[1].level = 10;
  const orion = joinParty('orion');
  assert.equal(orion.level, 10, 'round((9 + 10) / 2)');
  assert.deepEqual(orion.skills, ['thermal_burst', 'cryo_field', 'volt_chain', 'overclock', 'static_field']);
  const nyx = joinParty('nyx', { level: 6 });
  assert.equal(nyx.level, 6);
  assert.deepEqual(nyx.skills, ['scatter_shot', 'cryo_round', 'expose', 'void_round']);
  assert.equal(gameState.party, party);
  assert.deepEqual(party.map((m) => m.id), ['kade', 'sera', 'orion', 'nyx']);
  for (const m of party) assert.equal(gameState.roster[m.id], m);
  assert.equal(joinParty('nyx'), nyx, 'already in the party: no duplicate');
  assert.equal(party.length, 4);
  assert.equal(joinParty('nobody'), null);
});

test('joinParty reuses the roster entry; leaveParty keeps it; leader and formation helpers', () => {
  newGame();
  joinParty('sera');
  joinParty('orion');
  const party = gameState.party;
  const sera = gameState.roster.sera;
  assert.equal(setLeader('sera'), true);
  assert.equal(gameState.leader, 'sera');
  assert.equal(setLeader('nyx'), false, 'not in the party');
  assert.equal(gameState.leader, 'sera');
  assert.equal(leaveParty('sera'), true);
  assert.equal(gameState.leader, 'kade', 'leader falls back to party[0]');
  assert.equal(gameState.roster.sera, sera, 'stays in the roster');
  assert.equal(leaveParty('sera'), false);
  sera.hp = 1;
  sera.equip.accessory = null;
  const again = joinParty('sera', { level: 5 });
  assert.equal(again, sera, 'same object');
  assert.equal(again.level, 5);
  assert.ok(again.skills.includes('restore_field'), 'learned up to the new level');
  assert.equal(again.hp, again.maxHp);
  assert.deepEqual(party.map((m) => m.id), ['kade', 'orion', 'sera']);
  assert.equal(moveMember('sera', 0), true);
  assert.deepEqual(party.map((m) => m.id), ['sera', 'kade', 'orion']);
  assert.equal(moveMember('kade', 99), true, 'clamped');
  assert.deepEqual(party.map((m) => m.id), ['sera', 'orion', 'kade']);
  assert.equal(moveMember('nyx', 0), false);
  assert.equal(gameState.party, party);
  leaveParty('sera');
  leaveParty('orion');
  assert.equal(leaveParty('kade'), false, 'the last member cannot leave');
  assert.deepEqual(party.map((m) => m.id), ['kade']);
});

// ------------------------------------------------------------------------------------------ equipment

test('equip moves gear between the inventory and the member and refreshes stats', () => {
  newGame();
  const k = gameState.party[0];
  const before = { ...k.stats };
  inv().eq_w_kade_2 = 1;
  const delta = equipDelta(k, 'weapon', 'eq_w_kade_2');
  assert.equal(delta.atk, ITEMS.eq_w_kade_2.equip.stats.atk - ITEMS.eq_w_kade_1.equip.stats.atk);
  assert.equal(delta.def, 0);
  assert.deepEqual(equip(k, 'weapon', 'eq_w_kade_2'), { ok: true, message: 'KADE equipped the Arc Saber.' });
  assert.equal(k.equip.weapon, 'eq_w_kade_2');
  assert.equal(inv().eq_w_kade_2, undefined, 'taken from the inventory');
  assert.equal(inv().eq_w_kade_1, 1, 'the old weapon goes back');
  assert.equal(k.stats.atk, before.atk + delta.atk);
  // unequip
  assert.deepEqual(equip(k, 'accessory', null), { ok: false, message: 'Nothing is equipped there.' });
  assert.equal(equip(k, 'weapon', null).ok, true);
  assert.equal(k.equip.weapon, null);
  assert.equal(inv().eq_w_kade_2, 1);
  assert.equal(k.stats.atk, statsAt('kade', 1).atk);
  // refusals change nothing
  inv().eq_w_nyx_2 = 1;
  assert.deepEqual(equip(k, 'weapon', 'eq_w_nyx_2'), { ok: false, message: 'KADE can\'t use the Ring Rifle.' });
  assert.deepEqual(equip(k, 'armor', 'eq_w_kade_2'), { ok: false, message: 'The Arc Saber doesn\'t go in that slot.' });
  assert.deepEqual(equip(k, 'weapon', 'medigel'), { ok: false, message: 'The Medi-Gel isn\'t equipment.' });
  assert.deepEqual(equip(k, 'weapon', 'eq_w_kade_3'), { ok: false, message: 'No Ringforged Lance left.' });
  assert.deepEqual(equip(k, 'weapon', 'banana'), { ok: false, message: 'Unknown item.' });
  assert.deepEqual(equip(k, 'boots', 'eq_a_2'), { ok: false, message: 'Unknown slot.' });
  assert.equal(inv().eq_w_nyx_2, 1);
  assert.ok(canEquip(k, 'eq_a_3') && canEquip(gameState.party[0], 'eq_x_ghost_signal'));
  assert.ok(!canEquip(k, 'eq_w_sera_1') && !canEquip(k, 'medigel'));
});

test('equipment keeps the HP deficit and KO; equipDelta matches the real change', () => {
  newGame();
  const k = gameState.party[0];
  k.hp = k.maxHp - 30;
  inv().eq_a_3 = 1;
  const d = equipDelta(k, 'armor', 'eq_a_3');
  const prevMax = k.maxHp;
  equip(k, 'armor', 'eq_a_3');
  assert.equal(k.maxHp, prevMax + d.maxHp);
  assert.equal(k.hp, k.maxHp - 30);
  for (const key of ['def', 'res']) assert.equal(d[key], ITEMS.eq_a_3.equip.stats[key] - ITEMS.eq_a_1.equip.stats[key]);
  k.alive = false;
  k.hp = 0;
  equip(k, 'armor', 'eq_a_1');
  assert.equal(k.hp, 0, 'a KO\'d member stays down');
  assert.deepEqual(equipDelta(k, 'armor', 'eq_a_1'), { maxHp: 0, maxEp: 0, atk: 0, def: 0, mag: 0, res: 0, spd: 0 });
});

test('every mod reaches equipBonus and member.mods: resist, boost, immune, ailmentResist, startBp, encounterRate', () => {
  const m = makeMemberAt('nyx', 20);
  m.equip = { weapon: 'eq_w_nyx_3', armor: 'eq_a_2', accessory: 'eq_x_varo_compass' };
  refreshMember(m);
  assert.deepEqual(m.mods.boost, { rifle: 0.12 + 0.15 });
  m.equip.accessory = 'eq_x_frost_charm';
  refreshMember(m);
  assert.deepEqual(m.mods.resist, { cryo: 0.3 });
  m.equip.accessory = 'eq_x_lullaby_ward';
  refreshMember(m);
  assert.deepEqual(m.mods.immune, ['sleep']);
  m.equip.accessory = 'eq_x_keepsake_nyx';
  refreshMember(m);
  assert.deepEqual(m.mods.ailmentResist, { sleep: 0.5 });
  m.equip.accessory = 'eq_x_stim_chip';
  refreshMember(m);
  assert.equal(m.mods.startBp, 1);
  m.equip.accessory = 'eq_x_ghost_signal';
  refreshMember(m);
  assert.equal(m.mods.encounterRate, 0.5);
  const sera = makeMemberAt('sera', 30);
  sera.equip = { weapon: 'eq_w_sera_4', armor: null, accessory: 'eq_x_keepsake_sera' };
  const b = equipBonus(sera);
  assert.equal(b.ailmentResist.sleep, 0.75, 'ailment resists combine as independent chances');
  assert.equal(b.stats.maxHp, ITEMS.eq_x_keepsake_sera.equip.stats.maxHp);
  assert.deepEqual(Object.keys(b).sort(), ['ailmentResist', 'boost', 'encounterRate', 'immune', 'resist', 'startBp', 'stats']);
});

test('optimize: best owned gear per slot, only what the member can wear; current kept when nothing beats it', () => {
  newGame();
  const k = gameState.party[0];
  assert.deepEqual(optimize(k, {}), { ...k.equip });
  const pool = { eq_w_kade_2: 1, eq_w_kade_3: 1, eq_w_nyx_4: 1, eq_a_2: 1, eq_x_stim_chip: 1, eq_x_ghost_signal: 1, medigel: 4 };
  assert.deepEqual(optimize(k, pool), { weapon: 'eq_w_kade_3', armor: 'eq_a_2', accessory: 'eq_x_stim_chip' });
  const orion = makeMemberAt('orion', 10);
  assert.equal(optimize(orion, { eq_w_orion_1: 1, eq_w_orion_2: 1 }).weapon, 'eq_w_orion_2', 'MAG users rank by MAG');
  assert.equal(optimize(orion, { eq_x_power_band: 1, eq_x_focus_lens: 1 }).accessory, 'eq_x_focus_lens');
  // applying the result through equip() leaves the member on the picked gear
  Object.assign(inv(), pool);
  for (const [slot, id] of Object.entries(optimize(k))) if (id !== k.equip[slot]) assert.equal(equip(k, slot, id).ok, true);
  assert.deepEqual(k.equip, { weapon: 'eq_w_kade_3', armor: 'eq_a_2', accessory: 'eq_x_stim_chip' });
});

// ------------------------------------------------------------------------------------------ content lints

const BINDING_GEAR = [
  'eq_w_kade_1', 'eq_w_nyx_1', 'eq_w_orion_1', 'eq_w_sera_1', 'eq_a_1', 'eq_x_stim_chip',
  'eq_w_kade_2', 'eq_w_nyx_2', 'eq_a_2', 'eq_x_swift_band', 'eq_w_orion_2', 'eq_w_sera_2', 'eq_x_power_band', 'eq_x_focus_lens',
  'eq_w_nyx_3', 'eq_x_varo_compass', 'eq_x_frost_charm', 'eq_w_kade_3', 'eq_w_orion_3', 'eq_a_3', 'eq_x_ghost_signal',
  'eq_w_sera_3', 'eq_x_ember_charm', 'eq_x_photon_prism', 'eq_w_kade_4', 'eq_a_4', 'eq_x_ground_coil', 'eq_x_vital_core',
  'eq_w_nyx_4', 'eq_w_orion_4', 'eq_x_null_ward', 'eq_x_ether_core', 'eq_w_sera_4', 'eq_a_5', 'eq_x_lullaby_ward',
  'eq_x_keepsake_kade', 'eq_x_keepsake_nyx', 'eq_x_keepsake_orion', 'eq_x_keepsake_sera',
  'eq_x_ice_heart', 'eq_x_bloom_crown', 'eq_x_sentinel_core', 'eq_x_glitch_lens', 'eq_x_choir_bell',
];
const BINDING_ITEMS = ['medigel', 'medigel_plus', 'medigel_max', 'nanomist', 'ether', 'ether_plus', 'revive', 'revive_plus',
  'stim', 'thermal_charge', 'cryo_charge', 'volt_charge', 'photon_charge', 'void_charge', 'keycard', 'lattice_coil', 'command_key'];

test('every binding item and equipment id exists and is well formed', () => {
  for (const id of BINDING_ITEMS) assert.equal(ITEMS[id]?.id, id, id);
  for (const id of ['keycard', 'lattice_coil', 'command_key']) assert.equal(ITEMS[id].key, true);
  for (const id of BINDING_GEAR) {
    const it = ITEMS[id];
    assert.equal(it?.id, id, id);
    assert.ok(it.name && it.desc && it.price >= 0 && !it.battle && it.target === null, `${id} fields`);
    const slot = id.startsWith('eq_w_') ? 'weapon' : id.startsWith('eq_a_') ? 'armor' : 'accessory';
    assert.equal(it.equip.slot, slot, `${id} slot`);
    // weapons show their damage type (G2 C10-4); armour and accessories show their slot
    if (slot === 'weapon') assert.ok(['blade', 'rifle', 'gauntlet', 'lance'].includes(it.icon), `${id} icon ${it.icon}`);
    else assert.equal(it.icon, slot);
    if (slot === 'weapon') assert.deepEqual(it.equip.for, [id.split('_')[2]], `${id} owner`);
    else assert.equal(it.equip.for, undefined, `${id} fits anyone`);
    assert.ok(gearTypesValid(id), `${id} damage types`);
  }
  const extra = Object.keys(common.items).filter((id) => id.startsWith('eq_') && !BINDING_GEAR.includes(id));
  assert.deepEqual(extra, [], 'no undeclared gear ids');
  for (const it of Object.values(common.items)) {
    if (it.effect?.damage) assert.ok(DAMAGE_TYPES.includes(it.effect.damage.type) && it.target === 'enemy');
  }
});

test('gear has personality: one effect per tier 3-4 weapon and accessory, no shared signature in a slot', () => {
  const keepsake = (id) => id.startsWith('eq_x_keepsake_');
  const personal = BINDING_GEAR.filter((id) => /^eq_w_\w+_[34]$/.test(id) || (id.startsWith('eq_x_') && !keepsake(id)));
  const seen = { weapon: new Map(), accessory: new Map() };
  for (const id of personal) {
    const fx = gearEffects(id);
    assert.equal(fx.length, 1, `${id} carries exactly one effect (${fx.join(', ')})`);
    const slot = ITEMS[id].equip.slot;
    assert.ok(!seen[slot].has(fx[0]), `${id} shares "${fx[0]}" with ${seen[slot].get(fx[0])}`);
    seen[slot].set(fx[0], id);
  }
  // story fits named by the plan
  assert.deepEqual(gearEffects('eq_w_nyx_3'), ['boost:rifle']);
  assert.deepEqual(gearEffects('eq_x_lullaby_ward'), ['immune:sleep']);
  assert.deepEqual(gearEffects('eq_x_stim_chip'), ['startBp']);
  assert.deepEqual(gearEffects('eq_x_ghost_signal'), ['encounterRate']);
  assert.deepEqual(gearEffects('eq_x_varo_compass'), ['boost:rifle']);
  assert.deepEqual(gearEffects('eq_x_frost_charm'), ['resist:cryo']);
  // the four keepsakes share their sleep guard and differ in their stat
  const stats = new Set();
  for (const id of BINDING_GEAR.filter(keepsake)) {
    assert.deepEqual(gearEffects(id), ['ailmentResist:sleep']);
    const keys = Object.keys(ITEMS[id].equip.stats);
    assert.equal(keys.length, 1);
    stats.add(keys[0]);
  }
  assert.equal(stats.size, 4);
});

test('kits: every chapter has one, with gear each member can wear in the right slot', () => {
  for (const ch of ['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'finale', 'epilogue']) {
    const kit = kitFor(ch);
    assert.ok(kit, ch);
    assert.deepEqual(Object.keys(kit.equip).sort(), [...MEMBERS].sort(), `${ch} outfits everyone`);
    for (const [member, gear] of Object.entries(kit.equip)) {
      assert.deepEqual(Object.keys(gear).sort(), [...SLOTS].sort());
      for (const slot of SLOTS) {
        if (!gear[slot]) continue;
        assert.equal(ITEMS[gear[slot]]?.equip?.slot, slot, `${ch}.${member}.${slot}`);
        assert.ok(canEquip({ id: member }, gear[slot]), `${member} can wear ${gear[slot]}`);
      }
    }
    for (const id of Object.keys(kit.items)) assert.ok(ITEMS[id] && !ITEMS[id].key, `${ch} item ${id}`);
    assert.ok(Number.isInteger(kit.credits) && kit.credits >= 0);
  }
});

// ------------------------------------------------------------------------------------------ field items

test('field use of the new consumables', () => {
  newGame();
  joinParty('sera');
  const [k, s] = gameState.party;
  inv().nanomist = 1;
  assert.deepEqual(useItemOutOfBattle('nanomist'), { ok: false, message: 'Everyone\'s HP is already full.' });
  k.hp = 10;
  s.hp = 20;
  assert.equal(useItemOutOfBattle('nanomist').ok, true);
  assert.equal(k.hp, Math.min(k.maxHp, 10 + ITEMS.nanomist.effect.heal));
  assert.equal(inv().nanomist, undefined);
  inv().stim = 1;
  assert.deepEqual(useItemOutOfBattle('stim', 'kade'), { ok: false, message: 'KADE has nothing to cure.' });
  inv().volt_charge = 1;
  assert.deepEqual(useItemOutOfBattle('volt_charge', 'kade'), { ok: false, message: 'The Volt Charge only works in battle.' });
  inv().eq_a_2 = 1;
  assert.deepEqual(useItemOutOfBattle('eq_a_2', 'kade'), { ok: false, message: 'The Pressure Suit can\'t be used here.' });
  s.alive = false;
  s.hp = 0;
  inv().revive_plus = 1;
  assert.equal(useItemOutOfBattle('revive_plus', 'sera').ok, true);
  assert.equal(s.hp, s.maxHp);
});

// ------------------------------------------------------------------------------------------ shops

const SHOP = {
  name: 'Test Stall', keeper: 'RUSE', portrait: 'ruse', greeting: 'Credits first.', sellRate: 0.5,
  stock: [
    { item: 'medigel' },
    { item: 'eq_w_kade_2', when: 'chapter>=ch1' },
    { item: 'eq_x_lullaby_ward', when: 'chapter>=ch4', price: 1500 },
    { item: 'stim', when: 'story:ruse_met' },
  ],
};

test('shopStock: entries whose `when` holds, prices from ItemDefs (or the entry), owned = held + worn', () => {
  newGame();
  assert.deepEqual(shopStock(SHOP).map((s) => s.item), ['medigel']);
  gameState.story.chapter = 'ch1';
  gameState.flags['story:ruse_met'] = true;
  const stock = shopStock(SHOP);
  assert.deepEqual(stock.map((s) => s.item), ['medigel', 'eq_w_kade_2', 'stim']);
  assert.deepEqual(stock[0], { item: 'medigel', price: ITEMS.medigel.price, owned: gameState.inventory.medigel });
  gameState.story.chapter = 'ch4';
  inv().eq_w_kade_2 = 1;
  const ward = shopStock(SHOP).find((s) => s.item === 'eq_x_lullaby_ward');
  assert.equal(ward.price, 1500, 'the stock entry overrides the price');
  assert.equal(shopStock(SHOP).find((s) => s.item === 'eq_w_kade_2').owned, 1);
  assert.equal(shopStock({ ...SHOP, stock: [{ item: 'eq_w_kade_1' }] })[0].owned, 1, 'worn gear counts as owned');
  const fab = shopStock(common.shops.fabricator);
  assert.ok(fab.length > 3 && fab.every((s) => s.price > 0));
});

test('buy: credits and inventory; edge cases change nothing', () => {
  newGame();
  gameState.credits = 500;
  const p = ITEMS.medigel.price;
  assert.deepEqual(buy('medigel', 2), { ok: true, message: 'Bought 2 x Medi-Gel.' });
  assert.equal(gameState.credits, 500 - 2 * p);
  assert.equal(inv().medigel, kitFor('prologue').items.medigel + 2);
  const credits = gameState.credits;
  assert.deepEqual(buy('eq_w_kade_3', 1), { ok: false, message: 'Not enough credits.' });
  assert.deepEqual(buy('medigel', 0), { ok: false, message: 'Choose how many to buy.' });
  assert.deepEqual(buy('medigel', -1), { ok: false, message: 'Choose how many to buy.' });
  assert.deepEqual(buy('medigel', 1.5), { ok: false, message: 'Choose how many to buy.' });
  assert.deepEqual(buy('banana'), { ok: false, message: 'Unknown item.' });
  assert.deepEqual(buy('keycard'), { ok: false, message: 'The Bridge Keycard isn\'t for sale.' });
  assert.deepEqual(buy('eq_x_keepsake_kade'), { ok: false, message: 'The Voss\'s Insignia isn\'t for sale.' });
  inv().ether = MAX_STACK;
  assert.deepEqual(buy('ether'), { ok: false, message: `You can't carry more than ${MAX_STACK}.` });
  assert.equal(gameState.credits, credits);
  assert.deepEqual(buy('stim', 1, 5), { ok: true, message: 'Bought the Stim.' }, 'price per unit from the shop');
  assert.equal(gameState.credits, credits - 5);
  gameState.credits = 3 * p;
  assert.equal(buy('medigel', 3).ok, true, 'exact credits');
  assert.equal(gameState.credits, 0);
});

test('sell: rate, key items, worn gear and stock limits', () => {
  newGame();
  gameState.credits = 0;
  inv().eq_w_kade_2 = 1;
  assert.equal(sellPrice('eq_w_kade_2', 0.5), Math.floor(ITEMS.eq_w_kade_2.price * 0.5));
  assert.deepEqual(sell('eq_w_kade_2', 1, 0.5), { ok: true, message: `Sold the Arc Saber for ${sellPrice('eq_w_kade_2', 0.5)} credits.` });
  assert.equal(gameState.credits, sellPrice('eq_w_kade_2', 0.5));
  assert.equal(inv().eq_w_kade_2, undefined);
  assert.deepEqual(sell('eq_w_kade_1'), { ok: false, message: 'Unequip the Service Blade first.' });
  assert.deepEqual(sell('keycard'), { ok: false, message: 'The Bridge Keycard is too important to sell.' });
  inv().eq_x_keepsake_kade = 1;
  assert.deepEqual(sell('eq_x_keepsake_kade'), { ok: false, message: 'Nobody here will buy the Voss\'s Insignia.' });
  assert.deepEqual(sell('medigel', 99), { ok: false, message: `You only have ${inv().medigel}.` });
  assert.deepEqual(sell('nanomist'), { ok: false, message: 'No Nanomist to sell.' });
  assert.deepEqual(sell('medigel', 0), { ok: false, message: 'Choose how many to sell.' });
  assert.deepEqual(sell('medigel', 1, 0), { ok: false, message: 'Nobody here will buy the Medi-Gel.' });
  const have = inv().medigel;
  const credits = gameState.credits;
  assert.equal(sell('medigel', have).ok, true, 'selling the whole stack');
  assert.equal(inv().medigel, undefined);
  assert.equal(gameState.credits, credits + have * sellPrice('medigel'));
  assert.ok(sellable().every((s) => !ITEMS[s.item].key && s.price > 0));
  assert.ok(!sellable().some((s) => s.item === 'eq_x_keepsake_kade'));
});

// ------------------------------------------------------------------ balance.js

test('statLine: archetype stat lines that grow with level, anchored on the POC Sec-Drone', () => {
  assert.deepEqual(Object.keys(ARCHETYPES), ['swarm', 'standard', 'brute', 'caster', 'armored', 'elite', 'boss']);
  const drone = statLine(10, 'standard');
  assert.deepEqual(Object.keys(drone).sort(), ['credits', 'level', 'maxHp', 'stats', 'xp']);
  assert.equal(drone.level, 10);
  assert.equal(drone.maxHp, ENEMIES.drone.maxHp);
  assert.deepEqual(Object.keys(drone.stats).sort(), ['atk', 'def', 'mag', 'res', 'spd']);
  assert.ok(statLine(10, 'brute').maxHp > drone.maxHp && statLine(10, 'swarm').maxHp < drone.maxHp);
  assert.ok(statLine(10, 'armored').stats.def > drone.stats.def && statLine(10, 'caster').stats.mag > drone.stats.mag);
  assert.ok(statLine(10, 'boss').xp > statLine(10, 'elite').xp);
  for (const a of Object.keys(ARCHETYPES)) {
    let prev = statLine(1, a);
    for (let lv = 2; lv <= 40; lv++) {
      const cur = statLine(lv, a);
      assert.ok(cur.maxHp >= prev.maxHp && cur.stats.atk >= prev.stats.atk && cur.xp > prev.xp, `${a} grows at ${lv}`);
      assert.ok(Object.values(cur.stats).every((v) => Number.isInteger(v) && v > 0));
      prev = cur;
    }
  }
  assert.equal(statLine(10).maxHp, drone.maxHp, 'standard is the default');
  assert.throws(() => statLine(5, 'titan'), /unknown archetype/);
  assert.deepEqual(ZONE_RATE_DEFAULT, { grace: 12, sigma: 24 });
});

test('applyBalance merges overrides into the live tables in place and is idempotent', () => {
  const saved = {
    rules: JSON.parse(JSON.stringify(BATTLE_RULES)), zone: { ...ZONE_RATE_DEFAULT },
    kade: JSON.parse(JSON.stringify(PARTY_DEFS.kade)), drone: JSON.parse(JSON.stringify(ENEMIES.drone)),
  };
  const partyScale = BATTLE_RULES.partyScale;
  Object.assign(overrides, {
    rules: { ultimateBp: 4, partyScale: { hp: [0, 0.5, 0.7, 0.9, 1] } },
    zoneRate: { sigma: 30 },
    party: { kade: { growth: { atk: 4 } } },
    enemies: { drone: { xp: 99, stats: { spd: 70 } } },
  });
  try {
    applyBalance();
    applyBalance();
    assert.equal(BATTLE_RULES.ultimateBp, 4);
    assert.equal(BATTLE_RULES.partyScale, partyScale, 'nested objects keep their identity');
    assert.deepEqual(BATTLE_RULES.partyScale.hp, [0, 0.5, 0.7, 0.9, 1]);
    assert.deepEqual(BATTLE_RULES.partyScale.dmg, saved.rules.partyScale.dmg, 'untouched keys stay');
    assert.deepEqual(ZONE_RATE_DEFAULT, { grace: 12, sigma: 30 });
    assert.equal(PARTY_DEFS.kade.growth.atk, 4);
    assert.equal(statsAt('kade', 13).atk, PARTY_DEFS.kade.base.atk + 4, 'statsAt reads the override');
    assert.equal(ENEMIES.drone.xp, 99);
    assert.deepEqual(ENEMIES.drone.stats, { ...saved.drone.stats, spd: 70 });
  } finally {
    Object.assign(overrides, { rules: {}, zoneRate: {}, party: {}, enemies: {} });
    Object.assign(BATTLE_RULES, saved.rules);
    Object.assign(ZONE_RATE_DEFAULT, saved.zone);
    Object.assign(PARTY_DEFS.kade.growth, saved.kade.growth);
    Object.assign(ENEMIES.drone, saved.drone);
  }
});
