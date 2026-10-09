// warden (C11): the final boss's contracts (TECH_PLAN 7.9). Both forms in one battle, the transform
// and its music, Retry from the second form, the Last Lullaby named for its target, the Lullaby never
// twice in a row, Voss keeping watch over Kade, the ultimates recharged, the Choir and Theo's voice,
// and the first-timer's fight inside its targets (10-14 rounds, Breaks in both forms).
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAllData, REG } from '../src/content/data.js';
import { ENEMIES, ENCOUNTERS } from '../src/battle/data.js';
import { BOSS_SCRIPTS } from '../src/battle/scripts.js';
import { BattleModel } from '../src/battle/model.js';
import { gameState } from '../src/core/state.js';
import { buildJumpState, applyJumpState } from '../src/story/jump.js';
import { makeRng } from '../src/core/util.js';
import { policyAction, observe } from './policy.mjs';

registerAllData();

/** Plays one battle with the human-like policy; returns the model and every event in order. */
function fight(encounterId, seed, { jump = 'fin.warden', before = null } = {}) {
  applyJumpState(buildJumpState(jump, REG));
  const m = new BattleModel({ party: gameState.party, encounterId, rng: makeRng(seed) });
  const memo = new Map();
  const log = [];
  const feed = (ev) => {
    observe(memo, ev);
    for (const e of ev) log.push({ ...e, round: m.round });
    return ev;
  };
  feed(m.begin());
  before?.(m);
  for (let g = 0; g < 6000 && !m.isOver() && m.round <= 40; g++) {
    feed(m.nextTurn());
    if (m.isOver()) break;
    if (m.phase === 'enemyTurn') { feed(m.enemyTurn()); continue; }
    if (m.phase !== 'playerInput') continue;
    const id = m.current.id;
    let ev = m.act({ actorId: id, ...policyAction(m, id, memo) });
    if (ev.length === 1 && ev[0].type === 'message') ev = m.act({ actorId: id, kind: 'defend' });
    feed(ev);
  }
  return { m, log };
}

test('warden: encounters bind both forms, their music, the arena and Retry from the second form', () => {
  const enc = ENCOUNTERS.heart_boss_warden;
  assert.deepEqual(enc.enemies, ['warden_lock']);
  assert.equal(enc.music, 'final_boss');
  assert.deepEqual(enc.phaseMusic, { warden_unbound: 'final_boss_2' });
  assert.deepEqual(enc.retryPhase, { encounter: 'heart_boss_warden_2' });
  assert.equal(enc.backdrop, 'heart_crown');
  assert.equal(enc.canFlee, false);
  assert.deepEqual([enc.intro.title, enc.intro.subtitle], ['WARDEN', 'The Merciful Lock']);
  const two = ENCOUNTERS.heart_boss_warden_2;
  assert.deepEqual(two.enemies, ['warden_unbound']);
  assert.equal(two.music, 'final_boss_2');
  assert.equal(two.backdrop, 'heart_crown');
  assert.equal(ENEMIES.warden_lock.onDefeat.transform, 'warden_unbound');
});

test('warden: form 1 is the Merciful Lock (weaknesses, growing shield, sleep hymns, lock-on per member)', () => {
  const d = ENEMIES.warden_lock;
  assert.deepEqual([...d.weaknesses].sort(), ['lance', 'photon', 'rifle', 'void']);
  assert.equal(d.maxShieldCap, 16);
  assert.ok(d.shieldGain > 0);
  const by = Object.fromEntries(d.actions.map((a) => [a.id, a]));
  assert.deepEqual(by.wl_lullaby.effect, { stats: ['sleep'], stage: 1, turns: 2, chance: 0.5, limit: 3 });
  assert.equal(by.wl_lullaby.target, 'all');
  assert.ok(by.wl_lullaby.cooldown >= 1, 'never twice in a row');
  assert.deepEqual(by.wl_cradle.effect.stats, ['sleep']);
  assert.equal(by.wl_cradle.effect.turns, 2);
  assert.deepEqual(by.wl_hymn.effect.stats, ['spd']);
  for (const m of ['kade', 'nyx', 'orion', 'sera']) {
    const lock = by[`wl_lock_${m}`];
    assert.equal(lock.kind, 'lockOn');
    assert.equal(lock.fires, 'wl_last_lullaby');
    assert.equal(lock.telegraph, `WARDEN begins the Last Lullaby for ${m.toUpperCase()}...`);
  }
});

test('warden: form 2 is the Lullaby Unbound (two actions, shifting weaknesses, the Requiem charge)', () => {
  const d = ENEMIES.warden_unbound;
  assert.equal(d.actionsPerRound, 2);
  assert.equal(d.shiftOnRecover, true);
  assert.ok(d.weaknessPool.length >= 3);
  assert.deepEqual(d.weaknessPool[0], d.weaknesses);
  const gather = d.actions.find((a) => a.id === 'wu_gather');
  assert.equal(gather.kind, 'charge');
  assert.equal(gather.fires, 'wu_requiem');
  assert.deepEqual(BOSS_SCRIPTS.warden_unbound.thresholds, [0.75, 0.5, 0.25]);
});

test('warden: one battle plays every beat in order (transform, recharge, Choir, Theo, Requiem)', () => {
  const { m, log } = fight('heart_boss_warden', 11);
  assert.equal(m.result, 'victory');
  const i = (pred) => log.findIndex(pred);
  const tf = i((e) => e.type === 'transform' && e.kind === 'warden_unbound');
  assert.ok(tf > 0, 'form 1 transforms');
  assert.ok(log.slice(0, tf).some((e) => e.type === 'say' && /let me keep them/.test(e.text)), 'WARDEN pleads before the transform');
  const rc = i((e) => e.type === 'cue' && e.name === 'ultimatesRecharged');
  assert.ok(rc > tf, 'ultimates recharge after the transform');
  assert.ok(log.slice(rc).some((e) => e.type === 'say' && e.speaker === 'HALCYON'), 'HALCYON speaks from BOLT');
  const theo = i((e) => e.type === 'say' && e.speaker === 'THEO');
  assert.ok(theo > tf);
  assert.equal(log[theo + 1].speaker, 'SERA', 'Sera answers Theo');
  assert.ok(i((e) => e.type === 'say' && e.speaker === 'CHOIR' && /morning/.test(e.text)) > tf);
  assert.ok(i((e) => e.type === 'say' && e.speaker === 'CHOIR' && /waking/.test(e.text)) > theo);
  // Lullaby never twice in a row, and every lock-on telegraph names its target
  const f1 = log.slice(0, tf).filter((e) => e.type === 'action' && e.actorId === 'e0').map((e) => e.actionId);
  for (let k = 1; k < f1.length; k++) assert.ok(!(f1[k] === 'wl_lullaby' && f1[k - 1] === 'wl_lullaby'), f1.join(','));
  for (const t of log.filter((e) => e.type === 'telegraph' && /Last Lullaby for/.test(e.text))) {
    assert.ok(t.text.includes(m.get(t.targetId).name), t.text);
  }
});

test('warden: Theo\'s voice wakes every sleeper at form 2\'s half', () => {
  applyJumpState(buildJumpState('fin.warden', REG));
  const m = new BattleModel({ party: gameState.party, encounterId: 'heart_boss_warden_2', rng: makeRng(5) });
  m.begin();
  const w = m.enemies[0];
  w.hp = Math.round(w.maxHp * 0.51);
  for (const id of ['kade', 'orion']) m.get(id).buffs.sleep = { stage: 1, turns: 3 };
  const ev = [];
  m._withEvents(ev, () => m._hit(m.get('nyx'), w, 'rifle', 4, 'atk', 1, 0, 1, ev));
  const theo = ev.findIndex((e) => e.type === 'say' && e.speaker === 'THEO');
  assert.ok(theo >= 0, 'Theo speaks at the half');
  assert.equal(ev[theo + 1].speaker, 'SERA');
  const woke = ev.slice(theo).filter((e) => e.type === 'status' && e.stat === 'sleep' && e.stage === 0).map((e) => e.targetId);
  assert.deepEqual(woke.sort(), ['kade', 'orion']);
  assert.ok(m.party.every((p) => !p.buffs.sleep));
});

test('warden: Voss keeps watch: the first lethal hit on Kade leaves him standing, once, with her line', () => {
  let saved = 0;
  for (let seed = 1; seed <= 30 && !saved; seed++) {
    const { log } = fight('heart_boss_warden', seed, { before: (m) => { m.get('kade').hp = 1; } });
    const p = log.findIndex((e) => e.type === 'cue' && e.name === 'protected' && e.targetId === 'kade');
    if (p < 0) continue;
    saved++;
    assert.equal(log[p + 1].speaker, 'VOSS');
    assert.equal(log[p + 2].speaker, 'KADE');
    assert.equal(log.filter((e) => e.type === 'say' && e.speaker === 'VOSS').length, 1, 'once');
  }
  assert.ok(saved, 'a lethal hit on Kade at 1 HP is caught in some fight');
});

test('warden: a first-timer wins inside the targets (10-14 rounds, Breaks in both forms)', () => {
  const N = 40;
  let wins = 0;
  const rounds = [], b1 = [], b2 = [];
  for (let s = 0; s < N; s++) {
    const { m, log } = fight('heart_boss_warden', 100 + s);
    if (m.result === 'victory') wins++;
    rounds.push(m.round);
    const tf = log.findIndex((e) => e.type === 'transform');
    b1.push(log.slice(0, tf).filter((e) => e.type === 'break').length);
    b2.push(log.slice(tf).filter((e) => e.type === 'break').length);
  }
  const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  assert.ok(wins / N >= 0.75, `first-timer wins ${wins}/${N}`);
  assert.ok(med(rounds) >= 10 && med(rounds) <= 14, `median rounds ${med(rounds)}`);
  assert.ok(med(b1) >= 2 && med(b2) >= 2, `median breaks ${med(b1)} / ${med(b2)}`);
});
