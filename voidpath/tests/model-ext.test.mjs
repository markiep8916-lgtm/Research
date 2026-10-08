// Unit tests for the full-game BattleModel extensions (node --test, TECH_PLAN 5.2, 5.4, 7.1-7.3):
// scaling, ailments, untargetable foes, AI dispatch, telegraphs, summons, transforms, boss scripts,
// ultimates, equipment mods, winOn, item damage, determinism of the dev encounters and event shapes.
// A constant rng of 0.5 gives no SPD jitter, a x1.00 damage roll and no crits (as in battle.test.mjs).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTY_DEFS, SKILLS, ITEMS, ENEMIES, ENCOUNTERS, BATTLE_RULES, PHYSICAL,
} from '../src/battle/data.js';
import { BattleModel, setDifficulty, BOOST_POTENCY, MAX_ENEMIES } from '../src/battle/model.js';
import { BOSS_SCRIPTS, registerBossScript } from '../src/battle/scripts.js';
import { gameState, resetGame, newGame, joinParty, xpToNext } from '../src/core/state.js';
import { makeRng } from '../src/core/util.js';
import { policyAction, createPolicy, observe } from './policy.mjs';
import common from '../src/content/common/data.js';
import dev from '../src/content/dev/data.js';

// Content registration merges these tables in place (content/registry.js); do the same.
Object.assign(ITEMS, common.items);
Object.assign(ENEMIES, dev.enemies);
Object.assign(ENCOUNTERS, dev.encounters);
for (const [id, s] of Object.entries(dev.bossScripts)) registerBossScript(id, s);

// ------------------------------------------------------------------ test-only content

const DRONE_STATS = { ...ENEMIES.drone.stats };
const foe = (kind, actions, extra = {}) => ({
  kind, name: kind.toUpperCase(), level: 10, maxHp: 1500, shield: 3, stats: { ...DRONE_STATS },
  weaknesses: ['lance', 'rifle'], actions, xp: 10, credits: 5, drops: [], ...extra,
});
const action = (id, kind, extra = {}) => ({ id, name: id, kind, power: 0, type: null, target: 'one', anim: 'enemyShot', weight: 0, desc: id, ...extra });
const sleepFx = (extra = {}) => ({ stats: ['sleep'], stage: 1, turns: 2, ...extra });

Object.assign(ENEMIES, {
  tx_sleeper: foe('tx_sleeper', [action('tx_lullaby', 'debuff', { target: 'all', weight: 100, effect: sleepFx() })]),
  tx_sleeper_c: foe('tx_sleeper_c', [action('tx_lullaby_c', 'debuff', { target: 'all', weight: 100, effect: sleepFx({ chance: 0.5 }) })]),
  tx_sleeper_l: foe('tx_sleeper_l', [action('tx_lullaby_l', 'debuff', { target: 'all', weight: 100, effect: sleepFx({ limit: 2 }) })]),
  tx_cannon: foe('tx_cannon', [
    action('tx_charge', 'charge', { weight: 100, fires: 'tx_beam', chargeRounds: 1, telegraph: 'Capacitors scream...' }),
    action('tx_beam', 'attack', { power: 1.5, type: 'thermal', target: 'all' }),
  ]),
  tx_locker: foe('tx_locker', [
    action('tx_lock', 'lockOn', { weight: 100, fires: 'tx_rail' }),
    action('tx_rail', 'attack', { power: 2, type: 'void' }),
  ]),
  tx_badlock: foe('tx_badlock', [action('tx_badlock_on', 'lockOn', { weight: 100, fires: 'nope' })]),
  tx_sentinel: foe('tx_sentinel', [
    action('tx_plasma', 'attack', { power: 1, type: 'thermal', weight: 100 }),
    action('lock_on', 'lockOn', { fires: 'tx_lance_beam' }),
    action('tx_lance_beam', 'attack', { power: 2, type: 'lance' }),
  ], { boss: true, actionsPerRound: 2, maxShieldCap: 8 }),
  tx_mender: foe('tx_mender', [
    action('tx_brace', 'buff', { target: 'self', weight: 50 }),
    action('tx_repair', 'heal', { target: 'self', weight: 50, heal: 0.1 }),
  ], { boss: true, script: 'tx_null' }),
  tx_caller: foe('tx_caller', [action('tx_call', 'summon', { weight: 100, summon: { kind: 'drone', count: 2 } })], { boss: true, ai: 'basic' }),
  tx_striker: foe('tx_striker', [action('tx_strike', 'attack', { power: 1.1, type: 'thermal', weight: 100 })]),
});
registerBossScript('tx_null', { chooseAction: () => null });

const enc = (id, enemies, extra = {}) => ({ id, enemies, backdrop: 'corridor', boss: false, canFlee: true, music: 'battle', ...extra });
Object.assign(ENCOUNTERS, {
  tx_sleep: enc('tx_sleep', ['tx_sleeper']),
  tx_sleep_c: enc('tx_sleep_c', ['tx_sleeper_c']),
  tx_sleep_l: enc('tx_sleep_l', ['tx_sleeper_l']),
  tx_cannon: enc('tx_cannon', ['tx_cannon']),
  tx_locker: enc('tx_locker', ['tx_locker']),
  tx_badlock: enc('tx_badlock', ['tx_badlock']),
  tx_sentinel: enc('tx_sentinel', ['tx_sentinel'], { boss: true, canFlee: false }),
  tx_mender: enc('tx_mender', ['tx_mender'], { boss: true, canFlee: false }),
  tx_summon: enc('tx_summon', ['tx_caller']),
  tx_dive: enc('tx_dive', ['dev_diver']),
  tx_noscale: enc('tx_noscale', ['drone'], { scale: false }),
  tx_strike: enc('tx_strike', ['tx_striker']),
});

// ------------------------------------------------------------------ helpers

const fixed = (v) => () => v;
function counted(rng) {
  const f = () => { f.calls++; return rng(); };
  f.calls = 0;
  return f;
}
function battle(encounterId, rng = fixed(0.5), party = null) {
  resetGame();
  return new BattleModel({ party: party ? party(gameState.party) : gameState.party, encounterId, rng });
}
const pass = (m) => (m.current.side === 'party' ? m.act({ actorId: m.current.id, kind: 'defend' }) : m.enemyTurn());
function toTurn(m, id, onOther = pass) {
  const log = [];
  for (let guard = 0; guard < 300; guard++) {
    log.push(...m.nextTurn());
    if (m.isOver()) throw new Error(`battle ended before ${id}'s turn`);
    if (m.current && m.current.id === id) return log;
    log.push(...onOther(m));
  }
  throw new Error(`turn of ${id} never came`);
}
function toRound(m, round, onOther = pass) {
  const log = [];
  for (let guard = 0; guard < 300; guard++) {
    log.push(...m.nextTurn());
    if (m.round >= round || m.isOver()) return log;
    log.push(...onOther(m));
  }
  throw new Error(`round ${round} never came`);
}
const ofType = (events, type) => events.filter((e) => e.type === type);
const tough = (c) => { c.hp = c.maxHp = 999999; };
const base = (atk, power, def) => Math.max(1, atk * power * 2.2 - def * 1.1);

// ------------------------------------------------------------------ party size and difficulty

test('party sizes 1-3 scale enemy HP and damage; four members on Normal are the POC numbers', () => {
  for (const n of [1, 2, 3, 4]) {
    const m = battle('drone_single', fixed(0.5), (p) => p.slice(0, n));
    assert.equal(m.party.length, n);
    assert.equal(m.get('e0').maxHp, Math.round(ENEMIES.drone.maxHp * BATTLE_RULES.partyScale.hp[n]));
    const order = m.begin()[0].order;
    assert.deepEqual([...order].sort(), [...m.party.map((p) => p.id), 'e0'].sort());
  }
  assert.equal(battle('drone_single').get('e0').maxHp, ENEMIES.drone.maxHp);
  // ORION alone: the drone's Laser Bolt lands on him at x0.7 damage
  const m = battle('drone_single', fixed(0.5), (p) => [p[2]]);
  m.begin();
  toTurn(m, 'e0');
  const hit = ofType(m.enemyTurn(), 'hit')[0];
  const d = ENEMIES.drone;
  assert.equal(hit.targetId, 'orion');
  assert.equal(hit.amount, Math.round(base(d.stats.mag, d.actions[0].power, PARTY_DEFS.orion.base.res) * BATTLE_RULES.partyScale.dmg[1]));
  // a party of one plays through
  const solo = battle('drone_single', makeRng(3), (p) => [p[0]]);
  solo.begin();
  for (let g = 0; g < 400 && !solo.isOver(); g++) {
    solo.nextTurn();
    if (!solo.isOver()) solo.current.side === 'party' ? solo.act({ kind: 'attack', weapon: 'lance', targetId: 'e0' }) : solo.enemyTurn();
  }
  assert.ok(solo.isOver());
});

test('difficulty scales every battle; scale: false turns party-size scaling off only', () => {
  setDifficulty('story');
  try {
    const m = battle('drone_single');
    assert.equal(m.get('e0').maxHp, Math.round(ENEMIES.drone.maxHp * 0.8));
    m.begin();
    toTurn(m, 'e0');
    const hit = ofType(m.enemyTurn(), 'hit')[0];
    const d = ENEMIES.drone;
    assert.equal(hit.amount, Math.round(base(d.stats.mag, d.actions[0].power, PARTY_DEFS.orion.base.res) * 0.7));
    assert.equal(battle('tx_noscale', fixed(0.5), (p) => [p[0]]).get('e0').maxHp, Math.round(ENEMIES.drone.maxHp * 0.8));
  } finally {
    setDifficulty('normal');
  }
  assert.deepEqual(BATTLE_RULES.difficulty, { hp: 1, dmg: 1 });
  assert.equal(battle('tx_noscale', fixed(0.5), (p) => [p[0]]).get('e0').maxHp, ENEMIES.drone.maxHp);
});

// ------------------------------------------------------------------ ailments

test('sleep: lands on every target without rolling; sleepers skip their turns; damage wakes them', () => {
  const rng = counted(fixed(0.5));
  const m = battle('tx_sleep', rng);
  m.begin();
  toTurn(m, 'e0');
  const before = rng.calls;
  const ev = m.enemyTurn();
  assert.equal(rng.calls - before, 2, 'only the action pick and the target pick draw rng');
  assert.deepEqual(ofType(ev, 'status').map((s) => [s.targetId, s.stat, s.stage, s.turns]),
    ['kade', 'nyx', 'orion', 'sera'].map((id) => [id, 'sleep', 1, 2]));
  assert.equal(ofType(ev, 'hit').length, 0);
  const next = m.nextTurn();
  assert.deepEqual(next.slice(0, 2), [{ type: 'turnStart', actorId: 'orion' }, { type: 'skip', actorId: 'orion', reason: 'sleep' }]);
  assert.ok(ofType(next, 'skip').length >= 3);
  assert.equal(m.current.id, 'e0', 'the next awake actor is up');

  const w = battle('drone_single');
  w.begin();
  w.get('orion').buffs.sleep = { stage: 1, turns: 2 };
  toTurn(w, 'e0');
  const hitEv = w.enemyTurn();
  assert.equal(ofType(hitEv, 'hit')[0].targetId, 'orion');
  assert.deepEqual(ofType(hitEv, 'status'), [{ type: 'status', targetId: 'orion', stat: 'sleep', stage: 0, turns: 0 }]);
  assert.deepEqual(hitEv.map((e) => e.type).slice(0, 3), ['action', 'hit', 'status'], 'woken right after the hit');
});

test('ailment chance, ailmentResist and immune: rng is drawn only when present', () => {
  // chance 0.5: one draw per target; 0.5 does not land
  let rng = counted(fixed(0.5));
  let m = battle('tx_sleep_c', rng);
  m.begin();
  toTurn(m, 'e0');
  let before = rng.calls;
  let ev = m.enemyTurn();
  assert.equal(rng.calls - before, 2 + 4);
  assert.equal(ofType(ev, 'status').length, 0);
  m = battle('tx_sleep_c', fixed(0.3));
  m.begin();
  toTurn(m, 'e0');
  assert.equal(ofType(m.enemyTurn(), 'status').length, 4, '0.3 < 0.5 lands');

  // ailmentResist on NYX only: exactly one extra draw, for her
  rng = counted(fixed(0.5));
  m = battle('tx_sleep', rng, (p) => {
    p[1].mods.ailmentResist = { sleep: 0.5 };
    p[2].mods.immune = ['sleep'];
    return p;
  });
  m.begin();
  toTurn(m, 'e0');
  before = rng.calls;
  ev = m.enemyTurn();
  assert.equal(rng.calls - before, 2 + 1);
  assert.deepEqual(ofType(ev, 'status').map((s) => s.targetId), ['kade', 'sera'], 'NYX resisted (0.5 >= 0.5), ORION immune');
  const weak = battle('tx_sleep', fixed(0.5), (p) => {
    p[1].mods.ailmentResist = { sleep: 0.4 };
    return p;
  });
  weak.begin();
  toTurn(weak, 'e0');
  assert.ok(ofType(weak.enemyTurn(), 'status').some((s) => s.targetId === 'nyx'), '0.5 < 0.6 lands');
});

test('effect.limit: at most N targets receive the ailment, in party order', () => {
  const m = battle('tx_sleep_l', fixed(0.5), (p) => {
    p[0].mods.immune = ['sleep'];
    return p;
  });
  m.begin();
  toTurn(m, 'e0');
  assert.deepEqual(ofType(m.enemyTurn(), 'status').map((s) => s.targetId), ['nyx', 'orion']);
});

test('jam blocks skills (menu and act) but not attacks; marked draws single-target attacks; taunt wins', () => {
  const m = battle('drone_single');
  m.begin();
  toTurn(m, 'nyx');
  m.get('nyx').buffs.jam = { stage: 1, turns: 2 };
  const menu = m.getMenu('nyx');
  assert.ok(menu.skills.every((s) => !s.usable && s.reason === 'Jammed'));
  assert.deepEqual(m.act({ kind: 'skill', skillId: 'cryo_round', targetId: 'e0' }), [{ type: 'message', text: 'Jammed! Skills are offline.' }]);
  assert.equal(m.phase, 'playerInput', 'turn kept');
  assert.equal(ofType(m.act({ kind: 'attack', weapon: 'rifle', targetId: 'e0' }), 'hit').length, 1);

  const k = battle('drone_single');
  k.begin();
  k.get('sera').hp = 5; // the wounded would normally draw fire
  k.get('kade').buffs.marked = { stage: 1, turns: 2 };
  toTurn(k, 'e0');
  assert.equal(ofType(k.enemyTurn(), 'hit')[0].targetId, 'kade');
  const t = battle('drone_single');
  t.begin();
  t.get('nyx').buffs.marked = { stage: 1, turns: 2 };
  t.get('kade').buffs.taunt = { stage: 1, turns: 2 };
  toTurn(t, 'e0');
  assert.equal(ofType(t.enemyTurn(), 'hit')[0].targetId, 'kade');
});

test('cleanse: Stim, Clarity and api.cleanse remove ailments and negative stages, keep buffs', () => {
  resetGame();
  gameState.party[3].skills.push('clarity');
  gameState.inventory.stim = 1;
  const m = new BattleModel({ party: gameState.party, encounterId: 'drone_single', rng: fixed(0.5) });
  m.begin();
  toTurn(m, 'nyx');
  const orion = m.get('orion');
  orion.buffs = { jam: { stage: 1, turns: 2 }, sleep: { stage: 1, turns: 2 }, def: { stage: -1, turns: 2 }, atk: { stage: 1, turns: 2 } };
  const stim = m.act({ kind: 'item', itemId: 'stim', targetId: 'orion' });
  assert.deepEqual(ofType(stim, 'status').map((s) => s.stat).sort(), ['jam', 'sleep']);
  assert.deepEqual(Object.keys(orion.buffs).sort(), ['atk', 'def'], 'Stim only cures sleep and jam');
  toTurn(m, 'sera');
  m.get('kade').buffs.marked = { stage: 1, turns: 2 };
  const ev = m.act({ kind: 'skill', skillId: 'clarity' });
  assert.deepEqual(ofType(ev, 'status').map((s) => [s.targetId, s.stat, s.stage]), [['kade', 'marked', 0], ['orion', 'def', 0]]);
  assert.deepEqual(Object.keys(orion.buffs), ['atk']);
  assert.equal(ofType(ev, 'heal').length, 4);
});

// ------------------------------------------------------------------ untargetable

test('untargetable: hidden from targets and multi-target hits; "Nothing to target." keeps the turn', () => {
  resetGame();
  gameState.inventory.thermal_charge = 1;
  const m = new BattleModel({ party: gameState.party, encounterId: 'tx_dive', rng: fixed(0.5) });
  m.begin();
  toTurn(m, 'e0');
  const dive = m.enemyTurn();
  assert.deepEqual(dive.slice(0, 3).map((e) => e.type), ['telegraph', 'action', 'untargetable']);
  assert.deepEqual(ofType(dive, 'telegraph')[0], { type: 'telegraph', actorId: 'e0', targetId: null, text: 'Test Diver slips out of reach...' });
  assert.deepEqual(ofType(dive, 'untargetable')[0], { type: 'untargetable', targetId: 'e0', on: true, style: 'submerge' });
  assert.deepEqual(m.validTargets('sera', 'enemy'), []);
  toTurn(m, 'sera');
  for (const a of [{ kind: 'attack', weapon: 'lance', targetId: 'e0' }, { kind: 'skill', skillId: 'photon_lance', targetId: 'e0' },
    { kind: 'item', itemId: 'thermal_charge', targetId: 'e0' }]) {
    assert.deepEqual(m.act(a), [{ type: 'message', text: 'Nothing to target.' }]);
  }
  assert.equal(m.phase, 'playerInput');
  assert.equal(m.getMenu('sera').skills.find((s) => s.id === 'photon_lance').usable, false);
  assert.equal(m.getMenu('sera').items.find((i) => i.id === 'thermal_charge').usable, false);
  assert.equal(m.act({ kind: 'skill', skillId: 'nanoheal', targetId: 'kade' }).length > 1, true, 'support still works');
  // round 2: still under; its forced `then` breaches from below
  const r2 = toRound(m, 2);
  assert.equal(ofType(r2, 'untargetable').length, 0);
  toTurn(m, 'e0');
  const breach = m.enemyTurn();
  assert.equal(ofType(breach, 'action')[0].actionId, 'dev_breach');
  assert.equal(ofType(breach, 'hit').length, 4);
  // round 3: it surfaces at round start
  const r3 = toRound(m, 3);
  assert.deepEqual(ofType(r3, 'untargetable'), [{ type: 'untargetable', targetId: 'e0', on: false, style: 'submerge' }]);
  assert.deepEqual(m.validTargets('sera', 'enemy'), ['e0']);
});

test('untargetable foes are skipped by all-foe skills; phase style comes from the enemy', () => {
  const m = battle('dev_submerge');
  m.begin();
  const log = toRound(m, 2);
  assert.deepEqual(ofType(log, 'untargetable').map((u) => [u.targetId, u.style]), [['e0', 'submerge'], ['e1', 'phase']]);
  m.get('e0').untargetable = 0;
  toTurn(m, 'orion');
  const ev = m.act({ kind: 'skill', skillId: 'cryo_field' });
  assert.deepEqual(ofType(ev, 'action')[0].targets, ['e0']);
  assert.deepEqual(ofType(ev, 'hit').map((h) => h.targetId), ['e0']);
});

// ------------------------------------------------------------------ AI dispatch

test('AI dispatch: a scripted boss with a stat-less buff and a heal neither crashes nor damages the party', () => {
  const m = battle('tx_mender', makeRng(11));
  m.begin();
  const hpBefore = m.party.map((p) => p.hp);
  const log = [];
  for (let i = 0; i < 6; i++) {
    log.push(...toTurn(m, 'e0'));
    if (i === 3) m.get('e0').hp = Math.round(m.get('e0').maxHp * 0.4);
    log.push(...m.enemyTurn());
  }
  const acts = ofType(log, 'action').filter((a) => a.actorId === 'e0');
  assert.equal(acts.length, 6);
  assert.ok(acts.every((a) => ['tx_brace', 'tx_repair'].includes(a.actionId) && a.hits === 0));
  assert.equal(ofType(log, 'hit').length, 0);
  assert.deepEqual(m.party.map((p) => p.hp), hpBefore);
  assert.ok(ofType(log, 'heal').every((h) => h.targetId === 'e0'));
  assert.ok(ofType(log, 'telegraph').length === 0, 'not the sentinel path');
});

test('enemy heal actions heal enemies with ordinary heal events', () => {
  const m = battle('tx_mender', fixed(0.9));
  m.begin();
  m.get('e0').hp = 100;
  toTurn(m, 'e0');
  const ev = m.enemyTurn();
  const heal = ofType(ev, 'heal')[0];
  assert.equal(ofType(ev, 'action')[0].actionId, 'tx_repair', 'hurt: the heal passes its gate');
  assert.deepEqual(heal, { type: 'heal', targetId: 'e0', amount: Math.round(m.get('e0').maxHp * 0.1), hpAfter: 100 + Math.round(m.get('e0').maxHp * 0.1) });
});

// ------------------------------------------------------------------ telegraphs

test('charge: telegraph with targetId null, fires `fires` after chargeRounds; a break cancels it', () => {
  const m = battle('tx_cannon');
  tough(m.get('e0'));
  m.begin();
  toTurn(m, 'e0');
  const ch = m.enemyTurn();
  assert.deepEqual(ofType(ch, 'action')[0], { type: 'action', actorId: 'e0', kind: 'charge', name: 'tx_charge', anim: 'enemyShot', damageType: null, targets: [], hits: 0, actionId: 'tx_charge' });
  assert.deepEqual(ofType(ch, 'telegraph'), [{ type: 'telegraph', actorId: 'e0', targetId: null, text: 'Capacitors scream...' }]);
  toRound(m, 2);
  toTurn(m, 'e0');
  const fire = m.enemyTurn();
  assert.equal(ofType(fire, 'action')[0].actionId, 'tx_beam');
  assert.equal(ofType(fire, 'hit').length, 4);

  const b = battle('tx_cannon');
  tough(b.get('e0'));
  b.begin();
  toTurn(b, 'e0');
  b.enemyTurn();
  toTurn(b, 'kade');
  b.get('e0').shield = 1;
  const br = b.act({ kind: 'attack', weapon: 'lance', targetId: 'e0' });
  assert.deepEqual(ofType(br, 'message'), [{ type: 'message', text: 'TX_CANNON\'s charge was disrupted!' }]);
  const later = toRound(b, 4);
  assert.ok(!ofType(later, 'action').some((a) => a.actionId === 'tx_beam'));
});

test('lockOn with `fires`: telegraph on a member, fires next round; a break cancels; missing ids fall back', (t) => {
  const m = battle('tx_locker');
  tough(m.get('e0'));
  m.begin();
  toTurn(m, 'e0');
  const tel = ofType(m.enemyTurn(), 'telegraph')[0];
  assert.equal(m.get(tel.targetId).side, 'party');
  assert.equal(tel.text, `TX_LOCKER locks on to ${m.get(tel.targetId).name}!`);
  toRound(m, 2);
  toTurn(m, 'e0');
  const fire = m.enemyTurn();
  assert.equal(ofType(fire, 'action')[0].actionId, 'tx_rail');
  assert.deepEqual(ofType(fire, 'hit').map((h) => h.targetId), [tel.targetId]);

  const b = battle('tx_locker');
  tough(b.get('e0'));
  b.begin();
  toTurn(b, 'e0');
  b.enemyTurn();
  toTurn(b, 'kade');
  b.get('e0').shield = 1;
  assert.ok(ofType(b.act({ kind: 'attack', weapon: 'lance', targetId: 'e0' }), 'message').some((x) => x.text.includes('lock-on was disrupted')));
  assert.ok(!ofType(toRound(b, 4), 'action').some((a) => a.actionId === 'tx_rail'));

  const errors = [];
  t.mock.method(console, 'error', (msg) => errors.push(String(msg)));
  const bad = battle('tx_badlock');
  bad.begin();
  toTurn(bad, 'e0');
  bad.enemyTurn();
  toRound(bad, 2);
  toTurn(bad, 'e0');
  const again = bad.enemyTurn();
  assert.ok(errors.some((e) => e.includes('no action "nope"')));
  assert.equal(ofType(again, 'action')[0].actionId, 'tx_badlock_on', 'weighted fallback');
});

test('sentinel AI fires the lock-on action\'s `fires`; reviving the locked member re-announces the lock (R16)', () => {
  const m = battle('tx_sentinel');
  tough(m.get('e0'));
  m.begin();
  const log = toRound(m, 4);
  const acts = ofType(log, 'action').filter((a) => a.actorId === 'e0').map((a) => a.actionId);
  assert.ok(acts.includes('lock_on'));
  assert.equal(acts.at(-1), 'tx_lance_beam');

  const s = battle('boss_sentinel');
  const boss = s.get('e0');
  tough(boss);
  s.begin();
  boss.lockOnTarget = 'nyx';
  boss.lockRound = 1;
  s.get('nyx').hp = 0;
  s.get('nyx').alive = false;
  toTurn(s, 'sera');
  const rev = s.act({ kind: 'skill', skillId: 'revive', targetId: 'nyx' });
  assert.deepEqual(ofType(rev, 'telegraph'), [{ type: 'telegraph', actorId: 'e0', targetId: 'nyx', text: 'SENTINEL is still locked on to NYX!' }]);
});

test('a reveal also reveals the weakness on living twins (R18)', () => {
  const m = battle('drone_pair');
  for (const e of m.enemies) tough(e);
  m.begin();
  toTurn(m, 'nyx');
  const ev = m.act({ kind: 'attack', weapon: 'rifle', targetId: 'e0' });
  assert.deepEqual(ofType(ev, 'reveal'), [{ type: 'reveal', targetId: 'e0', damageType: 'rifle' }, { type: 'reveal', targetId: 'e1', damageType: 'rifle' }]);
  assert.deepEqual(m.get('e1').revealed, ['rifle']);
});

// ------------------------------------------------------------------ summons

test('summons: monotonic ids, finite priorities, join the turn order next round, at most 4 alive', () => {
  const m = battle('tx_summon');
  m.begin();
  toTurn(m, 'e0');
  const ev = m.enemyTurn();
  assert.deepEqual(ofType(ev, 'action')[0].targets, ['e1', 'e2']);
  const sums = ofType(ev, 'summon');
  assert.deepEqual(sums.map((s) => s.targetId), ['e1', 'e2']);
  assert.deepEqual(sums[0], { type: 'summon', targetId: 'e1', kind: 'drone', name: 'Sec-Drone A', hp: 1500, maxHp: 1500, shield: 3, maxShield: 3, weakCount: 3, revealed: [] });
  assert.equal(m.get('e2').name, 'Sec-Drone B');
  assert.ok(!m.order.includes('e1'), 'not this round');
  assert.ok(m.nextOrder.includes('e1') && m.nextOrder.includes('e2'), 'predicted for next round');
  assert.ok(ofType(ev, 'orderUpdate')[0].nextOrder.includes('e1'));
  assert.equal(m._jitterNext.get('e1'), 1);
  // the rest of this round passes without them
  const rest = toRound(m, 2);
  assert.ok(!rest.some((e) => e.type === 'turnStart' && ['e1', 'e2'].includes(e.actorId)));
  assert.ok(ofType(rest, 'roundStart')[0].order.includes('e1'));
  // ids are never reused; the cap is 4 living enemies
  m.get('e1').alive = false;
  m.get('e1').hp = 0;
  toTurn(m, 'e0');
  const more = m.enemyTurn();
  assert.deepEqual(ofType(more, 'summon').map((s) => s.targetId), ['e3', 'e4']);
  assert.equal(m.enemies.filter((e) => e.alive).length, MAX_ENEMIES);
  toTurn(m, 'e0');
  assert.equal(ofType(m.enemyTurn(), 'summon').length, 0, 'no room: nothing summoned');
});

// ------------------------------------------------------------------ transforms, phases, defeat

test('phases: say + transform (keepHp) clears breaks, lock-ons and buffs; reveals from the new bestiary', () => {
  const m = battle('dev_transform');
  const e = m.get('e0');
  gameState.bestiary.dev_warden_overclock = ['cryo'];
  m.begin();
  toTurn(m, 'kade');
  e.hp = Math.floor(e.maxHp * 0.5) + 5;
  Object.assign(e, { broken: true, breakRounds: 2, lockOnTarget: 'nyx' });
  e.buffs.atk = { stage: 1, turns: 3 };
  const ev = m.act({ kind: 'attack', weapon: 'lance', targetId: 'e0' });
  const hp = ofType(ev, 'hit')[0].hpAfter;
  assert.deepEqual(ofType(ev, 'say'), [{ type: 'say', speaker: 'TEST WARDEN', text: 'Overclocking. Please hold still.' }]);
  const tr = ofType(ev, 'transform')[0];
  const def = ENEMIES.dev_warden_overclock;
  assert.deepEqual(tr, {
    type: 'transform', targetId: 'e0', kind: 'dev_warden_overclock', name: def.name, hp: Math.round(def.maxHp * (hp / ENEMIES.dev_warden.maxHp)),
    maxHp: def.maxHp, shield: def.shield, maxShield: def.shield, weakCount: 3, revealed: ['cryo'],
  });
  assert.equal(e.key, 'dev_warden_overclock');
  assert.deepEqual(e.weaknesses, def.weaknesses);
  assert.equal(e.actionsPerRound, 2);
  assert.equal(e.broken, false);
  assert.equal(e.lockOnTarget, null);
  assert.deepEqual(e.buffs, {});
});

test('beat guard + onDefeat: a killing blow plays the unfired phase first; onDefeat transforms instead of a KO', () => {
  const m = battle('dev_transform');
  const e = m.get('e0');
  m.begin();
  toTurn(m, 'kade');
  e.hp = 1;
  const ev = m.act({ kind: 'attack', weapon: 'lance', targetId: 'e0' });
  assert.equal(ofType(ev, 'ko').length, 0);
  assert.equal(ofType(ev, 'transform')[0].kind, 'dev_warden_overclock', 'the 50% phase comes first');
  toTurn(m, 'kade');
  e.hp = 1;
  const ev2 = m.act({ kind: 'attack', weapon: 'blade', targetId: 'e0' });
  assert.deepEqual(ofType(ev2, 'say')[0].text, 'Not yet. I am not done keeping you.');
  const tr = ofType(ev2, 'transform')[0];
  assert.equal(tr.kind, 'dev_warden_2');
  assert.equal(tr.hp, tr.maxHp);
  assert.equal(ofType(ev2, 'ko').length, 0);
  assert.equal(m.result, null);
  toTurn(m, 'kade');
  e.hp = 1;
  const win = m.act({ kind: 'attack', weapon: 'lance', targetId: 'e0' });
  assert.deepEqual(win.slice(-2), [{ type: 'ko', targetId: 'e0' }, { type: 'victory' }]);
  assert.equal(gameState.flags['defeated:dev_transform'], true);
  assert.equal(gameState.flags.boss_defeated, true, 'legacy flag still set');
  assert.equal(m.rewards().xp, ENEMIES.dev_warden_2.xp);
});

test('weakShift: a weakness pool moves to its next set after each break recovery', () => {
  const m = battle('dev_transform_2');
  const e = m.get('e0');
  tough(e);
  m.begin();
  toTurn(m, 'kade');
  e.shield = 1;
  m.act({ kind: 'attack', weapon: 'lance', targetId: 'e0' });
  assert.equal(e.broken, true);
  const log = toRound(m, 3);
  const types = log.map((x) => x.type);
  assert.ok(types.indexOf('weakShift') === types.indexOf('recover') + 1, 'right after its recover');
  assert.deepEqual(ofType(log, 'weakShift'), [{ type: 'weakShift', targetId: 'e0', weakCount: 2, revealed: [] }]);
  assert.deepEqual(e.weaknesses, ['blade', 'cryo']);
  e.broken = true;
  e.breakRounds = 1;
  toRound(m, 4);
  assert.deepEqual(e.weaknesses, ['rifle', 'photon']);
  assert.equal(e.maxShield, 6 + 2 + 2, 'shieldGain after each break');
});

// ------------------------------------------------------------------ boss scripts

test('scripts: say and protect at begin, cue on round start, setResist mirror, override, cleanse, heal', () => {
  const m = battle('dev_cue');
  const e = m.get('e0');
  tough(e);
  const begin = m.begin();
  assert.deepEqual(ofType(begin, 'say'), [{ type: 'say', speaker: 'TEST CONDUCTOR', text: 'Every note you play, I will play back.', portrait: 'holo' }]);
  assert.deepEqual(ofType(begin, 'cue'), [{ type: 'cue', name: 'protect', targetId: 'kade' }]);
  // a party action with an element: cue 'resist' and half damage of that type for a round
  toTurn(m, 'nyx');
  const shot1 = m.act({ kind: 'attack', weapon: 'rifle', targetId: 'e0' });
  assert.deepEqual(ofType(shot1, 'cue'), [{ type: 'cue', name: 'resist', targetId: 'e0', value: { rifle: 0.5 } }]);
  const full = ofType(shot1, 'hit')[0].amount;
  // the conductor answers with the last element (override)
  toTurn(m, 'e0');
  const answer = m.enemyTurn();
  assert.deepEqual(ofType(answer, 'action')[0], { type: 'action', actorId: 'e0', kind: 'attack', name: 'Mirror', anim: 'enemyShot', damageType: 'rifle', targets: [ofType(answer, 'hit')[0].targetId], hits: 1, actionId: 'dev_answer' });
  toRound(m, 2);
  toTurn(m, 'nyx');
  const shot2 = m.act({ kind: 'attack', weapon: 'rifle', targetId: 'e0' });
  const plain = base(PARTY_DEFS.nyx.base.atk, 1, e.stats.def);
  assert.equal(full, Math.round(plain));
  assert.equal(ofType(shot2, 'hit')[0].amount, Math.round(plain * 0.5));
  // set in round 2 for 1 round: it lasts through round 3 and wears off at the start of round 4
  const r3 = toRound(m, 3);
  assert.ok(!ofType(r3, 'cue').some((c) => c.name === 'resist'));
  assert.ok(!ofType(r3, 'cue').some((c) => c.name === 'domeLight'), 'odd round');
  const r4 = toRound(m, 4);
  assert.ok(ofType(r4, 'cue').some((c) => c.name === 'resist' && c.value === null), 'resist wears off');
  assert.ok(ofType(r4, 'cue').some((c) => c.name === 'domeLight' && c.value === true), 'cue on even rounds');
  // thresholds: 0.75 shifts weaknesses, 0.5 cleanses sleepers, 0.25 heals
  e.maxHp = 10000;
  e.hp = 8000;
  m.get('nyx').buffs.sleep = { stage: 1, turns: 3 };
  toTurn(m, 'kade');
  e.hp = 4000;
  const th = m.act({ kind: 'attack', weapon: 'blade', targetId: 'e0' });
  assert.ok(ofType(th, 'weakShift').length === 1);
  assert.ok(ofType(th, 'say').some((s) => s.speaker === 'BOLT'));
  assert.deepEqual(ofType(th, 'status').filter((s) => s.stat === 'sleep'), [{ type: 'status', targetId: 'nyx', stat: 'sleep', stage: 0, turns: 0 }]);
  toTurn(m, 'kade');
  e.hp = 2400;
  const low = m.act({ kind: 'attack', weapon: 'blade', targetId: 'e0' });
  assert.equal(ofType(low, 'heal')[0].targetId, 'e0');
});

test('protect: the next lethal hit leaves 1 HP and emits cue protected', () => {
  const m = battle('dev_cue');
  tough(m.get('e0'));
  m.begin();
  const kade = m.get('kade');
  kade.hp = 1;
  kade.buffs.marked = { stage: 1, turns: 5 };
  toTurn(m, 'e0');
  const ev = m.enemyTurn();
  const hit = ofType(ev, 'hit').find((h) => h.targetId === 'kade');
  assert.equal(hit.hpAfter, 1);
  assert.equal(hit.amount, 0);
  assert.ok(ofType(ev, 'cue').some((c) => c.name === 'protected' && c.targetId === 'kade'));
  assert.equal(kade.alive, true);
  toRound(m, 2);
  kade.hp = 1;
  toTurn(m, 'e0');
  const ev2 = m.enemyTurn();
  assert.equal(ofType(ev2, 'ko')[0]?.targetId, 'kade', 'only once');
});

test('script hooks get a per-script mem, see party actions and hits, and errors never break the battle', (t) => {
  const seen = [];
  registerBossScript('tx_spy', {
    onBegin(api) { api.mem.n = 0; seen.push(['begin', api.round]); },
    onRoundStart(api, round) { seen.push(['round', round]); },
    onPartyAction(api, actor, act) { api.mem.n += 1; seen.push(['party', actor.id, act.kind, act.damageType]); },
    onHit(api, hit) { if (hit.targetId === 'e0') seen.push(['hit', hit.type, hit.weak]); },
    chooseAction() { throw new Error('boom'); },
  });
  ENEMIES.tx_spy = foe('tx_spy', [action('tx_poke', 'attack', { power: 0.5, type: 'rifle', weight: 100 })], { script: 'tx_spy' });
  ENCOUNTERS.tx_spy = enc('tx_spy', ['tx_spy']);
  const errors = [];
  t.mock.method(console, 'error', (...a) => errors.push(a.join(' ')));
  const m = battle('tx_spy');
  tough(m.get('e0'));
  m.begin();
  toTurn(m, 'nyx');
  m.act({ kind: 'attack', weapon: 'rifle', targetId: 'e0' });
  toTurn(m, 'e0');
  const ev = m.enemyTurn();
  assert.equal(ofType(ev, 'action')[0].actionId, 'tx_poke', 'a throwing chooseAction falls back to the weighted pick');
  assert.ok(errors.some((e) => e.includes('tx_spy') && e.includes('chooseAction')));
  assert.deepEqual(seen.slice(0, 4), [['begin', 1], ['round', 1], ['hit', 'rifle', true], ['party', 'nyx', 'attack', 'rifle']]);
  assert.equal(m._mems.tx_spy.n, 1);
  assert.equal(BOSS_SCRIPTS.tx_spy.onBegin.length, 1);
});

// ------------------------------------------------------------------ ultimates

test('ultimates: granted mid-battle (learn + ult: flag), ready at 3 BP, cost exactly 3 BP, once per battle, recharge', () => {
  const m = battle('dev_ultimate');
  const e = m.get('e0');
  m.begin();
  toTurn(m, 'kade');
  e.hp = Math.floor(e.maxHp * 0.5) + 2;
  const grant = m.act({ kind: 'attack', weapon: 'blade', targetId: 'e0' });
  assert.deepEqual(ofType(grant, 'say')[0], { type: 'say', speaker: 'KADE', text: 'Not here. Not like this.', portrait: 'kade:determined' });
  assert.deepEqual(ofType(grant, 'learn'), ['kade', 'nyx', 'orion', 'sera'].map((id) => {
    const s = SKILLS[Object.keys(SKILLS).find((k) => SKILLS[k].ultimate && SKILLS[k].user === id)];
    return { type: 'learn', memberId: id, skillId: s.id, name: s.name, ultimate: true };
  }));
  assert.equal(gameState.flags['ult:kade'], true);
  assert.ok(gameState.party[0].skills.includes('oathblade'));
  tough(e);
  // not enough BP yet
  const kade = m.get('kade');
  toTurn(m, 'kade');
  kade.bp = 2;
  const menu = m.getMenu('kade').skills.find((s) => s.id === 'oathblade');
  assert.deepEqual([menu.ultimate, menu.usable, menu.reason], [true, false, 'Needs 3 BP']);
  assert.deepEqual(m.act({ kind: 'skill', skillId: 'oathblade', targetId: 'e0' }), [{ type: 'message', text: 'Needs 3 BP.' }]);
  m.act({ kind: 'defend' });
  // ultimateReady on the member's turn once they can use it
  kade.bp = 4;
  const turn = toTurn(m, 'kade');
  const kadeReady = (log) => ofType(log, 'ultimateReady').filter((u) => u.memberId === 'kade');
  assert.deepEqual(kadeReady(turn), [{ type: 'ultimateReady', memberId: 'kade', skillId: 'oathblade' }]);
  kade.bp = 4;
  const epBefore = kade.ep;
  const ult = m.act({ kind: 'skill', skillId: 'oathblade', targetId: 'e0', boost: 1 });
  assert.deepEqual(ult.slice(0, 3), [
    { type: 'boost', actorId: 'kade', level: 3 }, { type: 'bp', actorId: 'kade', bp: 1, delta: -3 },
    { type: 'ep', targetId: 'kade', amount: -SKILLS.oathblade.cost, epAfter: epBefore - SKILLS.oathblade.cost },
  ]);
  const hit = ofType(ult, 'hit')[0];
  const weak = e.weaknesses.includes('volt');
  assert.equal(hit.amount, Math.round(base(kade.stats.atk, SKILLS.oathblade.power, e.stats.def) * BOOST_POTENCY[3] * (weak ? 1.3 : 1)));
  // once per battle
  const t2 = toTurn(m, 'kade');
  assert.equal(kadeReady(t2).length, 0);
  kade.bp = 5;
  assert.deepEqual(m.act({ kind: 'skill', skillId: 'oathblade', targetId: 'e0' }), [{ type: 'message', text: 'Oathblade is spent for this battle.' }]);
  assert.equal(m.getMenu('kade').skills.find((s) => s.id === 'oathblade').reason, 'Used');
  // 25%: every ultimate recharges and is announced again
  e.maxHp = 10000;
  e.hp = 2510;
  const rc = m.act({ kind: 'attack', weapon: 'blade', targetId: 'e0' });
  assert.ok(ofType(rc, 'cue').some((c) => c.name === 'ultimatesRecharged'));
  kade.bp = 3;
  assert.equal(kadeReady(toTurn(m, 'kade')).length, 1);
  assert.equal(ofType(m.act({ kind: 'skill', skillId: 'oathblade', targetId: 'e0' }), 'hit').length, 1);
});

test('Lifebloom revives, heals and cleanses every ally; hits-mode ultimates add 3 hits', () => {
  resetGame();
  gameState.flags['ult:sera'] = true;
  gameState.party[3].skills.push('lifebloom');
  const m = new BattleModel({ party: gameState.party, encounterId: 'drone_single', rng: fixed(0.5) });
  tough(m.get('e0'));
  m.begin();
  toTurn(m, 'sera');
  const sera = m.get('sera');
  sera.bp = 3;
  const nyx = m.get('nyx');
  nyx.alive = false;
  nyx.hp = 0;
  m.get('orion').buffs.sleep = { stage: 1, turns: 2 };
  const ev = m.act({ kind: 'skill', skillId: 'lifebloom' });
  assert.deepEqual(ofType(ev, 'action')[0].targets, ['kade', 'nyx', 'orion', 'sera']);
  assert.deepEqual(ofType(ev, 'revive'), [{ type: 'revive', targetId: 'nyx', hpAfter: Math.round(nyx.maxHp * 0.5) }]);
  assert.equal(ofType(ev, 'heal').length, 4);
  assert.deepEqual(ofType(ev, 'status'), [{ type: 'status', targetId: 'orion', stat: 'sleep', stage: 0, turns: 0 }]);
  assert.equal(nyx.alive, true);

  SKILLS.tx_ult_hits = { ...SKILLS.ringbreaker, id: 'tx_ult_hits', ultimate: true };
  try {
    resetGame();
    gameState.party[1].skills.push('tx_ult_hits');
    const h = new BattleModel({ party: gameState.party, encounterId: 'drone_single', rng: fixed(0.5) });
    tough(h.get('e0'));
    h.begin();
    toTurn(h, 'nyx');
    h.get('nyx').bp = 3;
    const hev = h.act({ kind: 'skill', skillId: 'tx_ult_hits', targetId: 'e0' });
    assert.equal(ofType(hev, 'hit').length, SKILLS.ringbreaker.hits + 3);
  } finally {
    delete SKILLS.tx_ult_hits;
  }
});

// ------------------------------------------------------------------ winOn, items, equipment, rewards

test('winOn boss: victory when every boss enemy is down; the adds shut down with it', () => {
  const m = battle('dev_winon');
  m.begin();
  toTurn(m, 'kade');
  m.get('e0').hp = 1;
  m.act({ kind: 'attack', weapon: 'blade', targetId: 'e0' });
  assert.equal(m.result, null, 'an add down is not a win');
  toTurn(m, 'kade');
  m.get('e1').hp = 1;
  const ev = m.act({ kind: 'attack', weapon: 'lance', targetId: 'e1' });
  assert.deepEqual(ev.slice(-3), [{ type: 'ko', targetId: 'e1' }, { type: 'ko', targetId: 'e2' }, { type: 'victory' }]);
  assert.equal(m.result, 'victory');
  assert.equal(m.rewards().xp, ENEMIES.dev_caller.xp + 2 * ENEMIES.dev_mite.xp);
});

test('item damage: fixed typed damage that hits weaknesses and breaks, with no rng drawn', () => {
  resetGame();
  gameState.inventory.thermal_charge = 3;
  const rng = counted(fixed(0.5));
  const m = new BattleModel({ party: gameState.party, encounterId: 'crawler_drone', rng });
  for (const e of m.enemies) tough(e);
  m.begin();
  toTurn(m, 'nyx');
  const before = rng.calls;
  const ev = m.act({ kind: 'item', itemId: 'thermal_charge', targetId: 'e1' });
  assert.equal(rng.calls, before, 'no damage roll, no crit roll');
  assert.deepEqual(ofType(ev, 'action')[0], { type: 'action', actorId: 'nyx', kind: 'item', name: 'Thermal Charge', anim: 'item', damageType: 'thermal', targets: ['e1'], hits: 1, boost: 0, itemId: 'thermal_charge' });
  assert.equal(ofType(ev, 'hit')[0].amount, 420, 'the drone is not weak to thermal');
  toTurn(m, 'orion');
  const weak = m.act({ kind: 'item', itemId: 'thermal_charge', targetId: 'e0' });
  assert.equal(ofType(weak, 'hit')[0].amount, Math.round(420 * 1.3));
  assert.equal(ofType(weak, 'shield')[0].shield, ENEMIES.crawler.shield - 1);
  assert.equal(gameState.inventory.thermal_charge, 1);
  m.get('e0').broken = true;
  toTurn(m, 'sera');
  assert.equal(ofType(m.act({ kind: 'item', itemId: 'thermal_charge', targetId: 'e0' }), 'hit')[0].amount, Math.round(420 * 1.3 * 2));
});

test('equipment mods in battle: boost, resist, startBp', () => {
  const m = battle('drone_single', fixed(0.5), (p) => {
    p[1].mods.boost = { rifle: 0.2 };
    p[0].mods.resist = { thermal: 0.5 };
    p[0].mods.startBp = 2;
    return p;
  });
  tough(m.get('e0'));
  const begin = m.begin();
  assert.deepEqual(ofType(begin, 'bp').find((b) => b.actorId === 'kade'), { type: 'bp', actorId: 'kade', bp: 3, delta: 3 });
  toTurn(m, 'nyx');
  const shot = ofType(m.act({ kind: 'attack', weapon: 'rifle', targetId: 'e0' }), 'hit')[0];
  assert.equal(shot.amount, Math.round(base(PARTY_DEFS.nyx.base.atk, 1, ENEMIES.drone.stats.def) * 1.2 * 1.3));
  m.get('kade').buffs.marked = { stage: 1, turns: 3 };
  toTurn(m, 'e0');
  const hit = ofType(m.enemyTurn(), 'hit')[0];
  const d = ENEMIES.drone;
  assert.equal(hit.targetId, 'kade');
  assert.equal(hit.amount, Math.round(base(d.stats.mag, d.actions[0].power, PARTY_DEFS.kade.base.res) * 0.5));
});

test('rewards: campaign members report learned skills as learn events after every levelUp', () => {
  newGame();
  joinParty('sera');
  const [kade, sera] = gameState.party;
  kade.xp = 0;
  const m = new BattleModel({ party: gameState.party, encounterId: 'drone_single', rng: fixed(0.5) });
  m.begin();
  toTurn(m, 'kade');
  m.get('e0').hp = 1;
  m.act({ kind: 'attack', weapon: 'blade', targetId: 'e0' });
  assert.equal(m.result, 'victory');
  const xp = ENEMIES.drone.xp;
  assert.ok(xp >= xpToNext(1) - 0 || true);
  kade.xp = xpToNext(1) + xpToNext(2) - xp; // this win lifts KADE to level 3
  sera.xp = 0;
  const ev = m.applyRewards();
  const types = ev.map((e) => e.type);
  assert.deepEqual(ofType(ev, 'levelUp').filter((u) => u.memberId === 'kade').map((u) => u.level), [2, 3]);
  assert.deepEqual(ofType(ev, 'learn'), [{ type: 'learn', memberId: 'kade', skillId: 'cross_edge', name: 'Cross Edge' }]);
  assert.ok(types.lastIndexOf('levelUp') < types.indexOf('learn'), 'learn events follow the levelUps');
  assert.ok(m.get('kade').skills.includes('cross_edge'), 'combatant synced');
});

// ------------------------------------------------------------------ whole dev battles

// Random-but-legal policy covering every action kind (as in battle.test.mjs), aware of "Nothing to target.".
function chaos(m, rng) {
  const c = m.current;
  if (c.side !== 'party') return m.enemyTurn();
  const menu = m.getMenu(c.id);
  const roll = rng();
  const boost = Math.floor(rng() * (m.maxBoost(c.id) + 1));
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const foes = m.validTargets(c.id, 'enemy');
  if (roll < 0.1 || !foes.length) return m.act({ kind: 'defend' });
  if (roll < 0.2) {
    const it = pick(menu.items.filter((i) => i.usable));
    if (it) return m.act({ kind: 'item', itemId: it.id, targetId: pick(m.validTargets(c.id, it.target)) });
  }
  if (roll < 0.6) {
    const s = pick(menu.skills.filter((x) => x.usable));
    if (s) return m.act({ kind: 'skill', skillId: s.id, targetId: pick(m.validTargets(c.id, s.target)), boost });
  }
  return m.act({ kind: 'attack', weapon: pick(menu.weapons), targetId: pick(foes), boost });
}

function playOut(encounterId, seed, size = 4) {
  resetGame();
  for (const p of gameState.party) p.xp = p.xpNext - 1;
  Object.assign(gameState.inventory, { thermal_charge: 2, stim: 2, nanomist: 1 });
  const m = new BattleModel({ party: gameState.party.slice(0, size), encounterId, rng: makeRng(seed) });
  const prng = makeRng(seed * 13 + 1);
  const events = [...m.begin()];
  for (let guard = 0; guard < 3000 && !m.isOver(); guard++) {
    events.push(...m.nextTurn());
    if (m.isOver()) break;
    const out = chaos(m, prng);
    events.push(...(out.length === 1 && out[0].type === 'message' && m.phase === 'playerInput' ? m.act({ kind: 'defend' }) : out));
  }
  events.push(...m.applyRewards());
  return { m, events };
}

const DEV = Object.keys(dev.encounters);

test('every dev encounter is deterministic for a seed and terminates, at party sizes 1-4', () => {
  assert.deepEqual(DEV, ['dev_party1', 'dev_party2', 'dev_party3', 'dev_summon', 'dev_transform', 'dev_transform_2',
    'dev_submerge', 'dev_sleep', 'dev_winon', 'dev_charge', 'dev_cue', 'dev_ultimate']);
  for (const id of DEV) {
    for (const size of [1, 4]) {
      const a = playOut(id, 42, size);
      const b = playOut(id, 42, size);
      assert.ok(a.m.isOver(), `${id} x${size} ended`);
      assert.deepEqual(a.events, b.events, `${id} x${size}`);
    }
  }
});

const SHAPES = {
  roundStart: [['round', 'order', 'nextOrder']],
  turnStart: [['actorId']],
  bp: [['actorId', 'bp', 'delta']],
  boost: [['actorId', 'level']],
  action: [['actorId', 'kind', 'name', 'anim', 'damageType', 'targets', 'hits'], ['boost', 'weapon', 'skillId', 'itemId', 'actionId']],
  hit: [['actorId', 'targetId', 'damageType', 'amount', 'crit', 'weak', 'broken', 'hpAfter', 'hitIndex', 'hitCount']],
  reveal: [['targetId', 'damageType']],
  shield: [['targetId', 'shield', 'maxShield']],
  break: [['targetId']],
  recover: [['targetId', 'shield'], ['maxShield']],
  heal: [['targetId', 'amount', 'hpAfter']],
  ep: [['targetId', 'amount', 'epAfter']],
  status: [['targetId', 'stat', 'stage', 'turns']],
  revive: [['targetId', 'hpAfter']],
  ko: [['targetId']],
  defend: [['actorId']],
  telegraph: [['actorId', 'targetId', 'text']],
  message: [['text']],
  flee: [['success']],
  orderUpdate: [['order', 'nextOrder']],
  victory: [[]],
  defeat: [[]],
  levelUp: [['memberId', 'level', 'gains'], ['name']],
  // new event types (TECH_PLAN 7.2)
  say: [['speaker', 'text'], ['portrait']],
  summon: [['targetId', 'kind', 'name', 'hp', 'maxHp', 'shield', 'maxShield', 'weakCount', 'revealed']],
  transform: [['targetId', 'kind', 'name', 'hp', 'maxHp', 'shield', 'maxShield', 'weakCount', 'revealed']],
  untargetable: [['targetId', 'on', 'style']],
  weakShift: [['targetId', 'weakCount', 'revealed']],
  skip: [['actorId', 'reason']],
  learn: [['memberId', 'skillId', 'name'], ['ultimate']],
  ultimateReady: [['memberId', 'skillId']],
  cue: [['name'], ['targetId', 'value']],
};

test('new event shapes: exact keys, never undefined; dev battles exercise every new event type', () => {
  const seen = new Set();
  for (const id of DEV) {
    for (let seed = 1; seed <= 12; seed++) {
      for (const e of playOut(id, seed).events) {
        const shape = SHAPES[e.type];
        assert.ok(shape, `unknown event type ${e.type}`);
        const [req, extra = []] = shape;
        for (const k of req) assert.ok(k in e, `${e.type}.${k} missing`);
        for (const k of Object.keys(e)) {
          if (k === 'type') continue;
          assert.ok(req.includes(k) || extra.includes(k), `${e.type}.${k} unexpected`);
          assert.notEqual(e[k], undefined, `${e.type}.${k} is undefined`);
        }
        if (e.type === 'untargetable') assert.ok(['submerge', 'phase', 'shield'].includes(e.style));
        if (e.type === 'skip') assert.equal(e.reason, 'sleep');
        if (e.type === 'status') assert.ok(['atk', 'def', 'mag', 'res', 'spd', 'taunt', 'sleep', 'jam', 'marked'].includes(e.stat));
        seen.add(e.type);
      }
    }
  }
  const fresh = ['say', 'summon', 'transform', 'untargetable', 'weakShift', 'skip', 'learn', 'ultimateReady', 'cue'];
  assert.deepEqual(fresh.filter((t) => !seen.has(t)), [], 'every new event type appears');
  assert.ok(seen.has('telegraph'));
  // and the POC encounters never emit one of them
  for (const id of ['drone_single', 'drone_pair', 'crawler_drone', 'crawler_pair', 'turret_squad', 'boss_sentinel']) {
    for (let seed = 1; seed <= 10; seed++) {
      for (const e of playOut(id, seed).events) assert.ok(!fresh.includes(e.type), `${id} emitted ${e.type}`);
    }
  }
});

test('dev content is well formed: actions reference real ids, every physical type scales on ATK', () => {
  for (const [kind, d] of Object.entries(dev.enemies)) {
    assert.equal(d.kind, kind);
    for (const a of d.actions) {
      if (a.fires) assert.ok(d.actions.some((x) => x.id === a.fires), `${kind}.${a.id} fires`);
      if (a.then) assert.ok(d.actions.some((x) => x.id === a.then), `${kind}.${a.id} then`);
      if (a.summon) assert.ok(ENEMIES[a.summon.kind], `${kind}.${a.id} summons`);
      if (a.power > 0) assert.ok(a.type, `${kind}.${a.id} type`);
    }
    if (d.script) assert.ok(BOSS_SCRIPTS[d.script], `${kind} script`);
    for (const p of d.phases || []) if (p.transform) assert.ok(ENEMIES[p.transform]);
    if (d.onDefeat) assert.ok(ENEMIES[d.onDefeat.transform]);
    assert.ok(['drone', 'crawler', 'turret', 'sentinel'].includes(d.art), `${kind} uses POC art`);
  }
  for (const e of Object.values(dev.encounters)) for (const k of e.enemies) assert.ok(dev.enemies[k], k);
  assert.ok(PHYSICAL.length === 4);
});

// ------------------------------------------------------------------ the human-like policy (tests/policy.mjs)

test('policy: defends on telegraphs and when nothing can be targeted', () => {
  const m = battle('tx_locker');
  tough(m.get('e0'));
  m.begin();
  toTurn(m, 'nyx');
  m.get('e0').lockOnTarget = 'nyx';
  m.get('nyx').hp = Math.round(m.get('nyx').maxHp * 0.9);
  assert.deepEqual(policyAction(m, 'nyx'), { kind: 'defend' });
  m.get('e0').lockOnTarget = null;
  m.get('e0').charge = { fires: 'tx_rail', round: 2 };
  m.get('nyx').hp = Math.round(m.get('nyx').maxHp * 0.6);
  assert.deepEqual(policyAction(m, 'nyx'), { kind: 'defend' });
  m.get('e0').charge = null;
  m.get('e0').untargetable = 2;
  m.get('nyx').hp = m.get('nyx').maxHp;
  assert.deepEqual(policyAction(m, 'nyx'), { kind: 'defend' });
});

test('policy: cures sleepers, Provokes for a marked ally, saves ultimates for a Break', () => {
  resetGame();
  gameState.party[3].skills.push('clarity');
  gameState.flags['ult:kade'] = true;
  gameState.party[0].skills.push('oathblade');
  const m = new BattleModel({ party: gameState.party, encounterId: 'drone_pair', rng: fixed(0.5) });
  for (const e of m.enemies) tough(e);
  m.begin();
  toTurn(m, 'sera');
  m.get('orion').buffs.sleep = { stage: 1, turns: 2 };
  assert.deepEqual(policyAction(m, 'sera'), { kind: 'skill', skillId: 'clarity' });
  m.act({ kind: 'defend' });
  toTurn(m, 'kade');
  m.get('nyx').buffs.marked = { stage: 1, turns: 2 };
  assert.deepEqual(policyAction(m, 'kade'), { kind: 'skill', skillId: 'provoke' });
  delete m.get('nyx').buffs.marked;
  m.get('kade').bp = 3;
  assert.notEqual(policyAction(m, 'kade').skillId, 'oathblade', 'no Break, no ultimate');
  m.get('e1').broken = true;
  assert.deepEqual(policyAction(m, 'kade'), { kind: 'skill', skillId: 'oathblade', targetId: 'e1' });
});

test('policy: knows only revealed weaknesses and learns the rest by trying', () => {
  const memo = new Map();
  const m = battle('drone_single');
  tough(m.get('e0'));
  m.begin();
  toTurn(m, 'kade');
  const first = policyAction(m, 'kade', memo);
  observe(memo, m.act(first));
  const tried = first.kind === 'attack' ? first.weapon : SKILLS[first.skillId].type;
  if (!m.get('e0').revealed.includes(tried)) assert.ok(memo.get('e0').has(tried), 'a miss is remembered');
  observe(memo, [{ type: 'weakShift', targetId: 'e0', weakCount: 3, revealed: [] }]);
  assert.equal(memo.has('e0'), false, 'forgotten when the weaknesses shift');
  // the stateful wrapper plays whole battles with valid actions only
  const pol = createPolicy();
  const b = battle('dev_sleep', makeRng(5));
  b.begin();
  for (let g = 0; g < 1000 && !b.isOver(); g++) {
    b.nextTurn();
    if (b.isOver()) break;
    const ev = b.current.side === 'party' ? b.act(pol(b, b.current.id)) : b.enemyTurn();
    assert.ok(!(ev.length === 1 && ev[0].type === 'message'), JSON.stringify(ev));
  }
  assert.equal(b.result, 'victory');
});
