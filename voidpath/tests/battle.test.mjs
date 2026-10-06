// Unit tests for battle/data.js and battle/model.js (node --test).
// Most tests use a constant rng: 0.5 gives no SPD jitter, a x1.00 damage roll, no crits and a
// successful flee, so expected numbers can be computed exactly from the formula.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAMAGE_TYPES, PHYSICAL, ELEMENTAL, PARTY_DEFS, SKILLS, ITEMS, ENEMIES, ENCOUNTERS, ENCOUNTER_TABLES,
} from '../src/battle/data.js';
import {
  BattleModel, MAX_BP, BOOST_POTENCY, VICTORY_EP_RECOVERY,
} from '../src/battle/model.js';
import { gameState, resetGame } from '../src/core/state.js';
import { makeRng } from '../src/core/util.js';

const fixed = (v) => () => v;

function battle(encounterId, rng = fixed(0.5)) {
  resetGame();
  return new BattleModel({ party: gameState.party, encounterId, rng });
}

// Resolve the current turn without touching enemies (party defends, enemies act).
function pass(m) {
  const c = m.current;
  return c.side === 'party' ? m.act({ actorId: c.id, kind: 'defend' }) : m.enemyTurn();
}

// Resolve the current turn with a plain (unboosted) attack on the first enemy.
function attack(m) {
  const c = m.current;
  return c.side === 'party' ? m.act({ actorId: c.id, kind: 'attack', targetId: m.validTargets(c.id, 'enemy')[0] }) : m.enemyTurn();
}

// Advance until `id` is the current actor; other turns are resolved with onOther. Returns the event log.
function toTurn(m, id, onOther = pass) {
  const log = [];
  for (let guard = 0; guard < 200; guard++) {
    log.push(...m.nextTurn());
    if (m.current && m.current.id === id) return log;
    log.push(...onOther(m));
  }
  throw new Error(`turn of ${id} never came`);
}

// Advance until the given round has started (its roundStart was emitted); stops before its first turn ends.
function toRound(m, round, onOther = pass) {
  const log = [];
  for (let guard = 0; guard < 200; guard++) {
    log.push(...m.nextTurn());
    if (m.round >= round) return log;
    log.push(...onOther(m));
  }
  throw new Error(`round ${round} never came`);
}

const ofType = (events, type) => events.filter((e) => e.type === type);
const tough = (c) => { c.hp = c.maxHp = 999999; };

// Expected damage of one hit at rng 0.5 (roll x1.00), mirroring DESIGN.md's formula.
function expected(atk, power, def, { potency = 1, weak = false, broken = false, defending = false } = {}) {
  let d = Math.max(1, atk * power * 2.2 - def * 1.1) * potency;
  if (weak) d *= 1.3;
  if (broken) d *= 2;
  if (defending) d *= 0.5;
  return Math.round(d);
}

// ------------------------------------------------------------------------------------------ data

test('data: damage types partition into physical and elemental', () => {
  assert.equal(DAMAGE_TYPES.length, 9);
  assert.deepEqual([...PHYSICAL, ...ELEMENTAL].sort(), [...DAMAGE_TYPES].sort());
});

test('data: party definitions follow the design', () => {
  assert.deepEqual(Object.keys(PARTY_DEFS), ['kade', 'nyx', 'orion', 'sera']);
  for (const d of Object.values(PARTY_DEFS)) {
    assert.ok(d.base.maxHp >= 360 && d.base.maxHp <= 520, `${d.id} hp`);
    assert.ok(d.base.maxEp >= 70 && d.base.maxEp <= 120, `${d.id} ep`);
    assert.ok(d.level >= 10 && d.level <= 12);
    assert.match(d.accent, /^#[0-9a-f]{6}$/i);
    for (const w of d.weapons) assert.ok(PHYSICAL.includes(w));
    assert.ok(d.skills.length >= 3 && d.skills.length <= 4);
    for (const s of d.skills) assert.equal(SKILLS[s]?.user, d.id, `${s} belongs to ${d.id}`);
  }
  const by = (k) => Object.values(PARTY_DEFS).sort((a, b) => b.base[k] - a.base[k])[0].id;
  assert.equal(by('maxHp'), 'kade');
  assert.equal(by('def'), 'kade');
  assert.equal(by('spd'), 'nyx');
  assert.equal(by('mag'), 'orion');
});

test('data: party covers all nine damage types', () => {
  const types = new Set();
  for (const d of Object.values(PARTY_DEFS)) d.weapons.forEach((w) => types.add(w));
  for (const s of Object.values(SKILLS)) if (s.kind === 'attack') types.add(s.type);
  assert.deepEqual([...types].sort(), [...DAMAGE_TYPES].sort());
});

test('data: skills are well formed', () => {
  const targets = ['enemy', 'enemies', 'randomEnemies', 'ally', 'allies', 'self', 'koAlly'];
  const kinds = ['attack', 'heal', 'buff', 'debuff', 'revive', 'taunt'];
  const anims = ['slash', 'thrust', 'shot', 'punch', 'cast', 'heal', 'buff'];
  for (const [id, s] of Object.entries(SKILLS)) {
    assert.equal(s.id, id);
    assert.ok(targets.includes(s.target), `${id} target`);
    assert.ok(kinds.includes(s.kind), `${id} kind`);
    assert.ok(anims.includes(s.anim), `${id} anim`);
    assert.ok(s.cost > 0 && s.desc.length > 10 && s.desc.length < 80, `${id} cost/desc`);
    if (s.kind === 'attack') {
      assert.ok(DAMAGE_TYPES.includes(s.type) && s.power > 0 && s.hits >= 1, `${id} attack fields`);
      assert.ok(['atk', 'mag'].includes(s.scale));
    }
  }
});

test('data: items', () => {
  assert.deepEqual(Object.keys(ITEMS).sort(), ['ether', 'keycard', 'medigel', 'revive']);
  assert.equal(ITEMS.keycard.key, true);
  assert.equal(ITEMS.keycard.battle, false);
  assert.equal(ITEMS.keycard.target, null);
  assert.equal(ITEMS.revive.target, 'koAlly');
  // Medi-Gel heals ~45% of a typical max HP
  const avgHp = Object.values(PARTY_DEFS).reduce((s, d) => s + d.base.maxHp, 0) / 4;
  assert.ok(Math.abs(ITEMS.medigel.effect.heal / avgHp - 0.45) < 0.05);
});

test('data: every enemy has reachable weaknesses and valid actions', () => {
  const basic = new Set(Object.values(PARTY_DEFS).flatMap((d) => d.weapons));
  const skill = new Set(Object.values(SKILLS).filter((s) => s.kind === 'attack').map((s) => s.type));
  const anims = ['enemyShot', 'enemyMelee', 'enemyBeam', 'enemyCharge', 'enemySpit'];
  assert.deepEqual(Object.keys(ENEMIES), ['drone', 'crawler', 'turret', 'sentinel']);
  for (const [kind, e] of Object.entries(ENEMIES)) {
    assert.equal(e.kind, kind);
    assert.ok(e.weaknesses.length >= 2 && e.weaknesses.length <= 4, `${kind} weakness count`);
    assert.ok(e.weaknesses.some((t) => basic.has(t)), `${kind} weak to a basic attack`);
    assert.ok(e.weaknesses.some((t) => skill.has(t)), `${kind} weak to a skill`);
    assert.ok(e.shield >= 1 && e.maxHp > 0 && e.xp > 0 && e.credits > 0);
    for (const k of ['atk', 'def', 'mag', 'res', 'spd']) assert.ok(e.stats[k] > 0);
    assert.ok(e.actions.length >= 2 && e.actions.length <= 5);
    for (const a of e.actions) {
      assert.ok(anims.includes(a.anim), `${kind}.${a.id} anim`);
      assert.ok(['one', 'all', 'self'].includes(a.target), `${kind}.${a.id} target`);
      assert.ok(a.name && a.desc && a.weight >= 0);
      if (a.power > 0) assert.ok(DAMAGE_TYPES.includes(a.type));
    }
    for (const d of e.drops) assert.ok(ITEMS[d.id] && d.chance > 0 && d.chance <= 1);
  }
  assert.equal(ENEMIES.sentinel.boss, true);
  assert.equal(ENEMIES.sentinel.actionsPerRound, 2);
});

test('data: encounters and tables', () => {
  for (const id of ['drone_single', 'drone_pair', 'crawler_drone', 'crawler_pair', 'turret_squad', 'boss_sentinel']) {
    const e = ENCOUNTERS[id];
    assert.equal(e?.id, id);
    assert.ok(e.enemies.every((k) => ENEMIES[k]));
    assert.ok(['cryo', 'corridor', 'engineering', 'bridge'].includes(e.backdrop));
    assert.equal(e.canFlee, !e.boss);
    assert.equal(e.music, e.boss ? 'boss' : 'battle');
  }
  assert.equal(ENCOUNTERS.boss_sentinel.boss, true);
  assert.deepEqual(Object.keys(ENCOUNTER_TABLES).sort(), ['corridor', 'engineering']);
  for (const list of Object.values(ENCOUNTER_TABLES)) {
    assert.ok(list.length > 0 && list.every((id) => ENCOUNTERS[id] && !ENCOUNTERS[id].boss));
  }
});

// ------------------------------------------------------------------------------------------ setup / order

test('constructor builds combatants with the contract fields', () => {
  const m = battle('drone_pair');
  assert.deepEqual(m.combatants.map((c) => c.id), ['kade', 'nyx', 'orion', 'sera', 'e0', 'e1']);
  assert.deepEqual(m.enemies.map((c) => c.name), ['Sec-Drone A', 'Sec-Drone B']);
  const fields = ['id', 'side', 'key', 'name', 'level', 'hp', 'maxHp', 'ep', 'maxEp', 'bp', 'maxBp', 'stats', 'buffs',
    'weaknesses', 'revealed', 'shield', 'maxShield', 'broken', 'breakRounds', 'alive', 'defending', 'boss', 'boostedLastRound'];
  for (const c of m.combatants) for (const f of fields) assert.ok(f in c, `${c.id}.${f}`);
  assert.equal(m.get('e1').shield, ENEMIES.drone.shield);
  assert.equal(m.get('nope'), null);
  assert.equal(m.phase, 'idle');
  assert.equal(m.encounter, ENCOUNTERS.drone_pair);
  assert.throws(() => battle('nope'));
});

test('begin: round 1, everyone 1 BP, order by SPD', () => {
  const m = battle('drone_single');
  const ev = m.begin();
  assert.deepEqual(ev[0], { type: 'roundStart', round: 1, order: ['nyx', 'e0', 'orion', 'sera', 'kade'], nextOrder: ['nyx', 'e0', 'orion', 'sera', 'kade'] });
  assert.deepEqual(ofType(ev, 'bp'), m.party.map((c) => ({ type: 'bp', actorId: c.id, bp: 1, delta: 1 })));
  assert.equal(m.round, 1);
  assert.deepEqual(m.begin(), [], 'begin is one-shot');
  const t = m.nextTurn();
  assert.deepEqual(t, [{ type: 'turnStart', actorId: 'nyx' }]);
  assert.equal(m.current.id, 'nyx');
  assert.equal(m.phase, 'playerInput');
  assert.deepEqual(m.nextTurn(), [], 'nextTurn waits for the current actor');
});

test('turn order jitter comes from the injected rng and is reproducible', () => {
  const orders = (seed) => {
    const m = battle('turret_squad', makeRng(seed));
    const rounds = [m.begin()[0].order];
    for (let r = 2; r <= 4; r++) rounds.push(toRound(m, r).find((e) => e.type === 'roundStart').order);
    return rounds;
  };
  assert.deepEqual(orders(7), orders(7));
  const variety = new Set();
  for (let s = 1; s <= 30; s++) variety.add(orders(s)[0].join());
  assert.ok(variety.size > 1, 'jitter changes close SPD ties');
});

test('nextOrder predicts the next round exactly', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const m = battle('crawler_drone', makeRng(seed));
    let predicted = m.begin()[0].nextOrder;
    const rng = makeRng(seed + 99);
    const policy = (mm) => {
      const c = mm.current;
      if (c.side !== 'party') return mm.enemyTurn();
      const foes = mm.validTargets(c.id, 'enemy');
      return rng() < 0.3
        ? mm.act({ actorId: c.id, kind: 'defend' })
        : mm.act({ actorId: c.id, kind: 'attack', weapon: c.weapons[Math.floor(rng() * c.weapons.length)], targetId: foes[0], boost: Math.floor(rng() * 4) });
    };
    for (let guard = 0; guard < 300 && !m.isOver(); guard++) {
      const ev = m.nextTurn();
      const rs = ev.find((e) => e.type === 'roundStart');
      if (rs) {
        assert.deepEqual(rs.order, predicted, `seed ${seed} round ${rs.round}`);
        predicted = rs.nextOrder;
      }
      for (const e of policy(m)) if (e.type === 'orderUpdate') predicted = e.nextOrder;
      if (!m.isOver()) assert.deepEqual(m.nextOrder, predicted);
    }
  }
});

// ------------------------------------------------------------------------------------------ BP and boost

test('BP: +1 per round, none after a boosted round, capped at 5', () => {
  const m = battle('drone_single');
  tough(m.get('e0'));
  m.begin();
  // Round 1: KADE boosts 1 (bp 1 -> 0), others defend.
  toTurn(m, 'kade');
  assert.equal(m.maxBoost('kade'), 1);
  const ev = m.act({ actorId: 'kade', kind: 'attack', weapon: 'blade', targetId: 'e0', boost: 1 });
  assert.deepEqual(ev.slice(0, 2), [{ type: 'boost', actorId: 'kade', level: 1 }, { type: 'bp', actorId: 'kade', bp: 0, delta: -1 }]);
  assert.equal(m.get('kade').boostedLastRound, true);
  // Round 2: KADE boosted last round -> no gain; everyone else 1 -> 2.
  const r2 = toRound(m, 2);
  const gains = ofType(r2, 'bp');
  assert.deepEqual(gains.map((e) => e.actorId).sort(), ['nyx', 'orion', 'sera']);
  assert.ok(gains.every((e) => e.bp === 2 && e.delta === 1));
  assert.equal(m.get('kade').bp, 0);
  // Round 3: KADE gains again.
  const r3 = toRound(m, 3);
  assert.deepEqual(ofType(r3, 'bp').find((e) => e.actorId === 'kade'), { type: 'bp', actorId: 'kade', bp: 1, delta: 1 });
  // Cap at 5.
  toRound(m, 7);
  assert.equal(m.get('nyx').bp, MAX_BP);
  assert.equal(m.maxBoost('nyx'), 3);
  assert.equal(m.maxBoost('e0'), 0);
});

test('boosted basic attack hits 1 + boost times; boost is clamped to the BP held', () => {
  const m = battle('drone_single');
  tough(m.get('e0'));
  m.begin();
  toTurn(m, 'nyx');
  m.get('nyx').bp = 5;
  const ev = m.act({ actorId: 'nyx', kind: 'attack', weapon: 'blade', targetId: 'e0', boost: 9 });
  const action = ofType(ev, 'action')[0];
  assert.deepEqual(action, { type: 'action', actorId: 'nyx', kind: 'attack', name: 'Attack', anim: 'slash', damageType: 'blade', targets: ['e0'], hits: 4, boost: 3, weapon: 'blade' });
  const hits = ofType(ev, 'hit');
  assert.deepEqual(hits.map((h) => [h.hitIndex, h.hitCount]), [[0, 4], [1, 4], [2, 4], [3, 4]]);
  assert.equal(m.get('nyx').bp, 2);
  // Event order: boost, bp, action, hits
  assert.deepEqual(ev.slice(0, 3).map((e) => e.type), ['boost', 'bp', 'action']);
  // Each boosted hit is full power (not split).
  const nyx = PARTY_DEFS.nyx.base;
  const drone = ENEMIES.drone.stats;
  assert.ok(hits.every((h) => h.amount === expected(nyx.atk, 1, drone.def)));
});

test('boosted skills: potency x1/1.5/2/2.5 and hit-adding skills', () => {
  const amounts = [];
  for (let boost = 0; boost <= 3; boost++) {
    const m = battle('drone_single');
    tough(m.get('e0'));
    m.begin();
    toTurn(m, 'orion');
    m.get('orion').bp = 3;
    const ev = m.act({ actorId: 'orion', kind: 'skill', skillId: 'thermal_burst', targetId: 'e0', boost });
    const hits = ofType(ev, 'hit');
    assert.equal(hits.length, 1);
    amounts.push(hits[0].amount);
    assert.deepEqual(ofType(ev, 'ep')[0], { type: 'ep', targetId: 'orion', amount: -10, epAfter: PARTY_DEFS.orion.base.maxEp - 10 });
  }
  const o = PARTY_DEFS.orion.base;
  const raw = o.mag * SKILLS.thermal_burst.power * 2.2 - ENEMIES.drone.stats.res * 1.1;
  assert.deepEqual(amounts, BOOST_POTENCY.map((p) => Math.round(raw * p)));

  // Cross Edge (boostMode 'hits'): 2 hits + 1 per boost level, each at base power.
  const m = battle('drone_single');
  tough(m.get('e0'));
  m.begin();
  toTurn(m, 'kade');
  m.get('kade').bp = 2;
  const ev = m.act({ actorId: 'kade', kind: 'skill', skillId: 'cross_edge', targetId: 'e0', boost: 2 });
  assert.equal(ofType(ev, 'action')[0].hits, 4);
  assert.equal(ofType(ev, 'hit').length, 4);
  const k = PARTY_DEFS.kade.base;
  assert.ok(ofType(ev, 'hit').every((h) => h.amount === expected(k.atk, SKILLS.cross_edge.power, ENEMIES.drone.stats.def)));
});

test('boosted heal scales with potency', () => {
  const heals = [];
  for (const boost of [0, 2]) {
    const m = battle('drone_single');
    m.begin();
    toTurn(m, 'sera');
    m.get('sera').bp = 2;
    m.get('kade').hp = 1;
    const ev = m.act({ actorId: 'sera', kind: 'skill', skillId: 'nanoheal', targetId: 'kade', boost });
    const h = ofType(ev, 'heal')[0];
    assert.equal(h.targetId, 'kade');
    assert.equal(h.hpAfter, Math.min(m.get('kade').maxHp, 1 + h.amount));
    heals.push(h.amount);
  }
  assert.equal(heals[1], Math.round(heals[0] * 2));
});

// ------------------------------------------------------------------------------------------ weakness / shield / break

test('weakness hit reveals once, removes one shield per hit, x1.3 damage', () => {
  const m = battle('drone_single');
  tough(m.get('e0'));
  m.begin();
  toTurn(m, 'nyx');
  const ev = m.act({ actorId: 'nyx', kind: 'attack', weapon: 'rifle', targetId: 'e0' });
  const hit = ofType(ev, 'hit')[0];
  assert.equal(hit.weak, true);
  assert.equal(hit.amount, expected(PARTY_DEFS.nyx.base.atk, 1, ENEMIES.drone.stats.def, { weak: true }));
  assert.deepEqual(ofType(ev, 'reveal'), [{ type: 'reveal', targetId: 'e0', damageType: 'rifle' }]);
  assert.deepEqual(ofType(ev, 'shield'), [{ type: 'shield', targetId: 'e0', shield: 2, maxShield: 3 }]);
  assert.deepEqual(ev.map((e) => e.type), ['action', 'hit', 'reveal', 'shield']);
  assert.deepEqual(m.get('e0').revealed, ['rifle']);
  assert.deepEqual(gameState.bestiary.drone, ['rifle']);

  // Non-weak hit: no reveal, no shield change.
  toTurn(m, 'kade');
  const ev2 = m.act({ actorId: 'kade', kind: 'attack', weapon: 'blade', targetId: 'e0' });
  assert.equal(ofType(ev2, 'hit')[0].weak, false);
  assert.equal(ofType(ev2, 'reveal').length + ofType(ev2, 'shield').length, 0);
  assert.equal(m.get('e0').shield, 2);

  // Same weakness again: shield drops, no second reveal.
  toTurn(m, 'nyx');
  const ev3 = m.act({ actorId: 'nyx', kind: 'attack', weapon: 'rifle', targetId: 'e0' });
  assert.equal(ofType(ev3, 'reveal').length, 0);
  assert.equal(ofType(ev3, 'shield')[0].shield, 1);
});

test('revealed weaknesses persist into later battles (bestiary)', () => {
  const m = battle('drone_single');
  m.begin();
  toTurn(m, 'nyx');
  m.act({ actorId: 'nyx', kind: 'attack', weapon: 'rifle', targetId: 'e0' });
  const m2 = new BattleModel({ party: gameState.party, encounterId: 'drone_pair', rng: fixed(0.5) });
  assert.deepEqual(m2.get('e0').revealed, ['rifle']);
  assert.deepEqual(m2.get('e1').revealed, ['rifle']);
  m2.begin();
  toTurn(m2, 'nyx');
  const ev = m2.act({ actorId: 'nyx', kind: 'attack', weapon: 'rifle', targetId: 'e1' });
  assert.equal(ofType(ev, 'reveal').length, 0);
  assert.equal(ofType(ev, 'shield').length, 1);
});

test('break: skips the rest of this round and all of the next, x2 damage, then recovers', () => {
  const m = battle('drone_single');
  const e = m.get('e0');
  tough(e);
  m.begin();
  // Round 1 order: nyx, e0, orion, sera, kade. NYX breaks the drone before it acts (3 rifle hits).
  toTurn(m, 'nyx');
  m.get('nyx').bp = 2;
  const ev = m.act({ actorId: 'nyx', kind: 'attack', weapon: 'rifle', targetId: 'e0', boost: 2 });
  assert.deepEqual(ofType(ev, 'shield').map((s) => s.shield), [2, 1, 0]);
  assert.deepEqual(ofType(ev, 'break'), [{ type: 'break', targetId: 'e0' }]);
  const types = ev.map((x) => x.type);
  assert.ok(types.indexOf('break') > types.lastIndexOf('hit'), 'break after the breaking hit');
  assert.equal(e.broken, true);
  assert.equal(e.breakRounds, 2);
  assert.equal(gameState.stats.breaks, 1);
  const upd = ofType(ev, 'orderUpdate')[0];
  assert.deepEqual(upd, { type: 'orderUpdate', order: ['orion', 'sera', 'kade'], nextOrder: ['nyx', 'orion', 'sera', 'kade'] });
  assert.deepEqual(m.order, upd.order);

  // x2 damage while broken (hit.broken = true), and weakness hits no longer change the shield.
  toTurn(m, 'orion');
  const hit = ofType(m.act({ actorId: 'orion', kind: 'attack', weapon: 'gauntlet', targetId: 'e0' }), 'hit')[0];
  assert.equal(hit.broken, true);
  assert.equal(hit.amount, expected(PARTY_DEFS.orion.base.atk, 1, ENEMIES.drone.stats.def, { broken: true }));
  toTurn(m, 'sera');
  const lanceEv = m.act({ actorId: 'sera', kind: 'attack', weapon: 'lance', targetId: 'e0' });
  assert.equal(ofType(lanceEv, 'hit')[0].weak, true);
  assert.equal(ofType(lanceEv, 'shield').length, 0);
  assert.equal(ofType(lanceEv, 'reveal').length, 1);

  // Round 2: still broken, absent from the order, no recover; the prediction already includes it.
  const r2 = toRound(m, 2);
  assert.equal(ofType(r2, 'recover').length, 0);
  const rs2 = ofType(r2, 'roundStart')[0];
  assert.ok(!rs2.order.includes('e0'));
  assert.ok(rs2.nextOrder.includes('e0'));
  assert.equal(e.breakRounds, 1);

  // Round 3: recover with a full shield, back in the order.
  const r3 = toRound(m, 3);
  const types3 = r3.map((x) => x.type);
  assert.deepEqual(ofType(r3, 'recover'), [{ type: 'recover', targetId: 'e0', shield: 3, maxShield: 3 }]);
  assert.ok(types3.indexOf('roundStart') < types3.indexOf('recover'));
  assert.ok(ofType(r3, 'roundStart')[0].order.includes('e0'));
  assert.equal(e.broken, false);
  assert.equal(e.shield, 3);
});

test('break after the enemy already acted still costs it the whole next round', () => {
  const m = battle('drone_single');
  tough(m.get('e0'));
  m.begin();
  toTurn(m, 'kade'); // last in round 1: the drone has already acted
  m.get('e0').shield = 1;
  m.act({ actorId: 'kade', kind: 'attack', weapon: 'lance', targetId: 'e0' });
  assert.equal(m.get('e0').broken, true);
  const r2 = toRound(m, 2);
  assert.ok(!ofType(r2, 'roundStart')[0].order.includes('e0'));
  let enemyActed = false;
  while (m.round === 2) {
    if (m.current.side === 'enemy') enemyActed = true;
    pass(m);
    m.nextTurn();
  }
  assert.equal(enemyActed, false);
  assert.ok(m.order.includes('e0'), 'acts again in round 3');
});

// ------------------------------------------------------------------------------------------ defend / taunt / ko / revive

test('defend halves damage and moves the defender first next round', () => {
  // Baseline: at rng 0.5 with everyone at full HP the drone's Laser Bolt lands on ORION.
  const dr = ENEMIES.drone;
  const m = battle('drone_single');
  m.begin();
  toTurn(m, 'e0');
  const base = ofType(m.enemyTurn(), 'hit')[0];
  assert.equal(base.targetId, 'orion');
  assert.equal(base.amount, expected(dr.stats.mag, dr.actions[0].power, PARTY_DEFS.orion.base.res));

  // Same shot after ORION defends (ORION made faster than the drone so it acts first).
  const m2 = battle('drone_single');
  m2.get('orion').stats.spd = 60;
  m2.begin();
  toTurn(m2, 'orion', attack);
  const dev = m2.act({ actorId: 'orion', kind: 'defend' });
  assert.deepEqual(dev[0], { type: 'defend', actorId: 'orion' });
  assert.equal(m2.get('orion').defending, true);
  assert.equal(m2.nextOrder[0], 'orion', 'defender predicted first');
  assert.equal(ofType(dev, 'orderUpdate')[0].nextOrder[0], 'orion');
  m2.nextTurn();
  assert.equal(m2.current.id, 'e0');
  const hit = ofType(m2.enemyTurn(), 'hit')[0];
  assert.equal(hit.targetId, 'orion');
  assert.equal(hit.amount, expected(dr.stats.mag, dr.actions[0].power, PARTY_DEFS.orion.base.res, { defending: true }));
  // Round 2: ORION opens the round and its defend ends on that turn.
  const r2 = toRound(m2, 2, attack);
  assert.equal(ofType(r2, 'roundStart')[0].order[0], 'orion');
  assert.equal(m2.current.id, 'orion');
  assert.equal(m2.get('orion').defending, false, 'cleared on the next turn');
});

test('taunt: Provoke redirects single-target enemy attacks to KADE', () => {
  const m = battle('crawler_pair');
  m.begin();
  toTurn(m, 'kade');
  const ev = m.act({ actorId: 'kade', kind: 'skill', skillId: 'provoke' });
  assert.deepEqual(ofType(ev, 'status'), [{ type: 'status', targetId: 'kade', stat: 'taunt', stage: 1, turns: 2 }]);
  // Round 2: every crawler single-target attack goes to KADE.
  const log = toRound(m, 3, (mm) => {
    const out = pass(mm);
    if (mm.round === 2) for (const h of ofType(out, 'hit')) assert.equal(h.targetId, 'kade');
    return out;
  });
  assert.ok(ofType(log, 'hit').filter((h) => h.targetId === 'kade').length >= 2);
  // Taunt (turns 2) expires at the start of round 3 with a stage-0 status event.
  assert.deepEqual(ofType(log, 'status').at(-1), { type: 'status', targetId: 'kade', stat: 'taunt', stage: 0, turns: 0 });
  assert.ok(!m.get('kade').buffs.taunt);
});

test('status: debuffs stack to -2, expire with a stage-0 event, and change damage', () => {
  const m = battle('drone_single');
  const e = m.get('e0');
  tough(e);
  m.begin();
  toTurn(m, 'nyx');
  m.get('nyx').bp = 1;
  const ev = m.act({ actorId: 'nyx', kind: 'skill', skillId: 'expose', targetId: 'e0', boost: 1 });
  assert.deepEqual(ofType(ev, 'status'), [
    { type: 'status', targetId: 'e0', stat: 'def', stage: -1, turns: 4 },
    { type: 'status', targetId: 'e0', stat: 'res', stage: -1, turns: 4 },
  ]);
  assert.equal(m.effectiveStat('e0', 'def'), Math.round(ENEMIES.drone.stats.def * 0.8));
  assert.equal(m.effectiveStat('e0', 'atk'), ENEMIES.drone.stats.atk);
  toTurn(m, 'kade');
  const hit = ofType(m.act({ actorId: 'kade', kind: 'attack', weapon: 'blade', targetId: 'e0' }), 'hit')[0];
  assert.equal(hit.amount, expected(PARTY_DEFS.kade.base.atk, 1, ENEMIES.drone.stats.def * 0.8));
  toTurn(m, 'nyx');
  const ev2 = m.act({ actorId: 'nyx', kind: 'skill', skillId: 'expose', targetId: 'e0' });
  assert.equal(ofType(ev2, 'status')[0].stage, -2);
  assert.equal(ofType(ev2, 'status')[0].turns, 3, 'keeps the longer remaining duration');
  const log = toRound(m, 5);
  assert.deepEqual(ofType(log, 'status').filter((s) => s.targetId === 'e0'), [
    { type: 'status', targetId: 'e0', stat: 'def', stage: 0, turns: 0 },
    { type: 'status', targetId: 'e0', stat: 'res', stage: 0, turns: 0 },
  ]);
  assert.deepEqual(e.buffs, {});
});

test('Overclock buffs an ally; boost extends its duration', () => {
  const m = battle('drone_single');
  m.begin();
  toTurn(m, 'orion');
  m.get('orion').bp = 2;
  const ev = m.act({ actorId: 'orion', kind: 'skill', skillId: 'overclock', targetId: 'kade', boost: 2 });
  assert.deepEqual(ofType(ev, 'action')[0].targets, ['kade']);
  assert.deepEqual(ofType(ev, 'status'), [
    { type: 'status', targetId: 'kade', stat: 'atk', stage: 1, turns: 5 },
    { type: 'status', targetId: 'kade', stat: 'mag', stage: 1, turns: 5 },
  ]);
});

test('KO: member is skipped, loses BP, and can be revived by skill or item', () => {
  const m = battle('drone_single');
  m.begin();
  // Wounded members draw fire: at rng 0.5 the drone's weighted pick lands on NYX (1 HP).
  m.get('nyx').hp = 1;
  m.get('nyx').bp = 3;
  toTurn(m, 'e0');
  const ev = m.enemyTurn();
  const hit = ofType(ev, 'hit')[0];
  assert.equal(hit.targetId, 'nyx');
  assert.equal(hit.hpAfter, 0);
  assert.deepEqual(ofType(ev, 'ko'), [{ type: 'ko', targetId: 'nyx' }]);
  assert.deepEqual(ofType(ev, 'bp'), [{ type: 'bp', actorId: 'nyx', bp: 0, delta: -3 }]);
  assert.equal(gameState.party.find((p) => p.id === 'nyx').alive, false, 'synced to gameState');
  assert.ok(!m.nextOrder.includes('nyx'));
  assert.ok(!ofType(ev, 'orderUpdate')[0].nextOrder.includes('nyx'));
  assert.equal(m.maxBoost('nyx'), 0);
  assert.deepEqual(m.validTargets('sera', 'koAlly'), ['nyx']);
  assert.ok(!m.validTargets('sera', 'ally').includes('nyx'));
  assert.ok(!m.validTargets('e0', 'enemy').includes('nyx'), 'enemies cannot target KO');

  // Round 2: NYX never gets a turn or BP; SERA revives her.
  const r2 = toRound(m, 2);
  assert.ok(!ofType(r2, 'roundStart')[0].order.includes('nyx'));
  assert.ok(!ofType(r2, 'bp').some((e) => e.actorId === 'nyx'), 'no BP while KO');
  assert.equal(m.getMenu('sera').skills.find((s) => s.id === 'revive').usable, true);
  toTurn(m, 'sera', (mm) => {
    assert.notEqual(mm.current.id, 'nyx');
    return pass(mm);
  });
  const rev = m.act({ actorId: 'sera', kind: 'skill', skillId: 'revive', targetId: 'nyx' });
  const maxHp = m.get('nyx').maxHp;
  assert.deepEqual(ofType(rev, 'revive'), [{ type: 'revive', targetId: 'nyx', hpAfter: Math.round(maxHp * 0.3) }]);
  assert.equal(m.get('nyx').alive, true);
  assert.ok(m.nextOrder.includes('nyx'));
  assert.ok(ofType(rev, 'orderUpdate')[0].nextOrder.includes('nyx'));
});

test('items: Medi-Gel, Ether, Revive Kit consume inventory; invalid uses do not consume the turn', () => {
  const m = battle('drone_single');
  m.begin();
  toTurn(m, 'nyx');
  m.get('kade').hp = 100;
  const ev = m.act({ actorId: 'nyx', kind: 'item', itemId: 'medigel', targetId: 'kade' });
  assert.deepEqual(ofType(ev, 'action')[0], { type: 'action', actorId: 'nyx', kind: 'item', name: 'Medi-Gel', anim: 'item', damageType: null, targets: ['kade'], hits: 0, boost: 0, itemId: 'medigel' });
  assert.deepEqual(ofType(ev, 'heal'), [{ type: 'heal', targetId: 'kade', amount: 200, hpAfter: 300 }]);
  assert.equal(gameState.inventory.medigel, 2);

  toTurn(m, 'orion');
  m.get('orion').ep = 10;
  const ep = m.act({ actorId: 'orion', kind: 'item', itemId: 'ether', targetId: 'orion' });
  assert.deepEqual(ofType(ep, 'ep'), [{ type: 'ep', targetId: 'orion', amount: 50, epAfter: 60 }]);
  assert.equal(gameState.inventory.ether, undefined);

  toTurn(m, 'sera');
  // No ether left, keycard is not a battle item, no KO'd ally for the Revive Kit: messages, turn kept.
  assert.deepEqual(m.act({ actorId: 'sera', kind: 'item', itemId: 'ether', targetId: 'sera' }), [{ type: 'message', text: 'No Ether Cell left.' }]);
  assert.deepEqual(m.act({ actorId: 'sera', kind: 'item', itemId: 'keycard' }), [{ type: 'message', text: 'That can\'t be used in battle.' }]);
  assert.deepEqual(m.act({ actorId: 'sera', kind: 'item', itemId: 'revive', targetId: 'kade' }), [{ type: 'message', text: 'No valid target.' }]);
  assert.deepEqual(m.act({ actorId: 'sera', kind: 'skill', skillId: 'arc_slash' }), [{ type: 'message', text: 'Unknown skill.' }]);
  m.get('sera').ep = 0;
  assert.deepEqual(m.act({ actorId: 'sera', kind: 'skill', skillId: 'nanoheal', targetId: 'kade' }), [{ type: 'message', text: 'Not enough EP.' }]);
  assert.deepEqual(m.act({ actorId: 'kade', kind: 'defend' }), [], 'not KADE\'s turn');
  assert.equal(m.current.id, 'sera');
  assert.equal(m.phase, 'playerInput');

  const menu = m.getMenu('sera');
  assert.deepEqual(menu.items.map((i) => [i.id, i.count, i.usable]), [['medigel', 2, true], ['revive', 1, false]]);
  assert.ok(menu.skills.every((s) => !s.usable), 'no EP');
  assert.deepEqual(menu.weapons, ['lance']);
  assert.equal(menu.canFlee, true);

  m.get('kade').hp = 0;
  m.get('kade').alive = false;
  const rev = m.act({ actorId: 'sera', kind: 'item', itemId: 'revive', targetId: 'kade' });
  assert.deepEqual(ofType(rev, 'revive'), [{ type: 'revive', targetId: 'kade', hpAfter: Math.round(m.get('kade').maxHp * 0.5) }]);
  assert.equal(gameState.inventory.revive, undefined);
});

test('menu and targets', () => {
  const m = battle('turret_squad');
  m.begin();
  const menu = m.getMenu('kade');
  assert.deepEqual(menu.weapons, ['blade', 'lance']);
  assert.deepEqual(menu.skills.map((s) => s.id), PARTY_DEFS.kade.skills);
  for (const s of menu.skills) for (const f of ['id', 'name', 'cost', 'type', 'target', 'kind', 'desc', 'usable']) assert.ok(f in s);
  for (const i of menu.items) for (const f of ['id', 'name', 'count', 'target', 'desc', 'usable']) assert.ok(f in i);
  assert.deepEqual(m.validTargets('kade', 'enemy'), ['e0', 'e1', 'e2']);
  assert.deepEqual(m.validTargets('kade', 'enemies'), ['e0', 'e1', 'e2']);
  assert.deepEqual(m.validTargets('kade', 'ally'), ['kade', 'nyx', 'orion', 'sera']);
  assert.deepEqual(m.validTargets('kade', 'self'), ['kade']);
  assert.deepEqual(m.validTargets('kade', 'koAlly'), []);
  assert.deepEqual(m.getMenu('e0').skills, []);
});

test('all-foe skills hit every enemy wave by wave; invalid targets fall back', () => {
  const m = battle('turret_squad');
  for (const e of m.enemies) tough(e);
  m.begin();
  toTurn(m, 'orion');
  const ev = m.act({ actorId: 'orion', kind: 'skill', skillId: 'volt_chain' });
  assert.deepEqual(ofType(ev, 'action')[0].targets, ['e0', 'e1', 'e2']);
  assert.deepEqual(ofType(ev, 'hit').map((h) => `${h.targetId}:${h.hitIndex}/${h.hitCount}`),
    ['e0:0/2', 'e1:0/2', 'e2:0/2', 'e0:1/2', 'e1:1/2', 'e2:1/2']);
  // targetId of a dead enemy falls back to the first living one
  m.get('e0').alive = false;
  toTurn(m, 'sera');
  const ev2 = m.act({ actorId: 'sera', kind: 'attack', weapon: 'lance', targetId: 'e0' });
  assert.deepEqual(ofType(ev2, 'action')[0].targets, ['e1']);
});

test('randomEnemies target kind spreads hits over living enemies', () => {
  SKILLS.test_ricochet = { id: 'test_ricochet', name: 'Ricochet', user: 'nyx', cost: 1, type: 'rifle', power: 0.5, hits: 5, scale: 'atk', target: 'randomEnemies', kind: 'attack', anim: 'shot', boostMode: 'potency', desc: 'test' };
  try {
    const m = battle('turret_squad', makeRng(3));
    for (const e of m.enemies) tough(e);
    m.get('nyx').skills.push('test_ricochet');
    m.begin();
    toTurn(m, 'nyx');
    const ev = m.act({ actorId: 'nyx', kind: 'skill', skillId: 'test_ricochet' });
    const hits = ofType(ev, 'hit');
    assert.equal(hits.length, 5);
    assert.ok(hits.every((h) => ['e0', 'e1', 'e2'].includes(h.targetId)));
    assert.deepEqual(hits.map((h) => h.hitIndex), [0, 1, 2, 3, 4]);
  } finally {
    delete SKILLS.test_ricochet;
  }
});

test('crits: physical only, x1.5', () => {
  const m = battle('drone_single', fixed(0.01)); // rng 0.01: crit roll succeeds, damage roll x0.9216
  tough(m.get('e0'));
  m.begin();
  toTurn(m, 'kade');
  const phys = ofType(m.act({ actorId: 'kade', kind: 'attack', weapon: 'blade', targetId: 'e0' }), 'hit')[0];
  assert.equal(phys.crit, true);
  const k = PARTY_DEFS.kade.base;
  const roll = 0.92 + 0.01 * 0.16;
  assert.equal(phys.amount, Math.round((k.atk * 2.2 - ENEMIES.drone.stats.def * 1.1) * roll * 1.5));
  toTurn(m, 'orion');
  const elem = ofType(m.act({ actorId: 'orion', kind: 'skill', skillId: 'thermal_burst', targetId: 'e0' }), 'hit')[0];
  assert.equal(elem.crit, false);
});

// ------------------------------------------------------------------------------------------ flee / end

test('flee: 70% (rng below 0.7 escapes), never in boss fights', () => {
  const ok = battle('drone_pair', fixed(0.5));
  ok.begin();
  ok.nextTurn();
  const ev = ok.act({ actorId: 'nyx', kind: 'flee' });
  assert.deepEqual(ev, [{ type: 'flee', success: true }]);
  assert.equal(ok.result, 'fled');
  assert.equal(ok.phase, 'fled');
  assert.ok(ok.isOver());
  assert.deepEqual(ok.nextTurn(), []);
  assert.deepEqual(ok.rewards(), { xp: 0, credits: 0, items: [], epRecovery: 0 });

  const fail = battle('drone_pair', fixed(0.75));
  fail.begin();
  fail.nextTurn();
  assert.deepEqual(fail.act({ actorId: 'nyx', kind: 'flee' }), [{ type: 'flee', success: false }]);
  assert.equal(fail.result, null);
  assert.equal(fail.phase, 'idle');

  const boss = battle('boss_sentinel');
  boss.begin();
  boss.nextTurn();
  assert.equal(boss.getMenu('nyx').canFlee, false);
  assert.deepEqual(boss.act({ actorId: 'nyx', kind: 'flee' }), [{ type: 'message', text: 'There is no escape!' }]);
  assert.equal(boss.phase, 'playerInput');
});

test('victory: detected after the killing action, stats updated', () => {
  const m = battle('drone_single');
  m.begin();
  m.get('e0').hp = 5;
  toTurn(m, 'nyx');
  const ev = m.act({ actorId: 'nyx', kind: 'attack', weapon: 'blade', targetId: 'e0' });
  assert.deepEqual(ev.slice(-2), [{ type: 'ko', targetId: 'e0' }, { type: 'victory' }]);
  assert.equal(m.result, 'victory');
  assert.equal(m.phase, 'victory');
  assert.equal(m.current, null);
  assert.ok(m.isOver());
  assert.equal(gameState.stats.battles, 1);
  assert.ok(gameState.stats.maxDamage >= ofType(ev, 'hit')[0].amount);
  assert.deepEqual(m.act({ actorId: 'kade', kind: 'defend' }), []);
  assert.deepEqual(m.enemyTurn(), []);
});

test('forceVictory and externally changed state end the battle', () => {
  const m = battle('drone_pair');
  m.begin();
  m.nextTurn();
  assert.deepEqual(m.forceVictory(), [{ type: 'ko', targetId: 'e0' }, { type: 'ko', targetId: 'e1' }, { type: 'victory' }]);
  assert.equal(m.phase, 'victory');
  assert.equal(m.current, null);
  assert.deepEqual(m.forceVictory(), []);
  assert.equal(m.rewards().xp, ENEMIES.drone.xp * 2);

  const m2 = battle('drone_single');
  m2.begin();
  for (const p of m2.party) { p.hp = 0; p.alive = false; }
  assert.deepEqual(m2.nextTurn(), [{ type: 'defeat' }]);
  assert.equal(m2.result, 'defeat');
});

test('multi-hit attack stops when the target dies', () => {
  const m = battle('drone_pair');
  m.begin();
  m.get('e0').hp = 5;
  toTurn(m, 'nyx');
  m.get('nyx').bp = 3;
  const ev = m.act({ actorId: 'nyx', kind: 'attack', weapon: 'blade', targetId: 'e0', boost: 3 });
  assert.equal(ofType(ev, 'hit').length, 1);
  assert.equal(ofType(ev, 'action')[0].hits, 4);
  assert.equal(m.result, null);
});

test('defeat: detected when the last member falls', () => {
  const m = battle('drone_single');
  m.begin();
  for (const id of ['kade', 'nyx', 'sera']) { m.get(id).hp = 0; m.get(id).alive = false; }
  m.get('orion').hp = 1;
  toTurn(m, 'e0');
  const ev = m.enemyTurn();
  assert.deepEqual(ev.slice(-3), [{ type: 'ko', targetId: 'orion' }, { type: 'bp', actorId: 'orion', bp: 0, delta: -1 }, { type: 'defeat' }]);
  assert.equal(m.result, 'defeat');
  assert.equal(m.phase, 'defeat');
  assert.ok(gameState.party.every((p) => !p.alive && p.hp === 0));
  assert.deepEqual(m.applyRewards(), []);
});

// ------------------------------------------------------------------------------------------ boss

test('boss: two actions per round, Lock-On telegraph then Annihilator Beam next round', () => {
  const m = battle('boss_sentinel');
  const boss = m.get('e0');
  tough(boss);
  assert.deepEqual(m.begin()[0].order, ['nyx', 'e0', 'orion', 'sera', 'kade', 'e0']);
  const bossActions = (log) => ofType(log, 'action').filter((a) => a.actorId === 'e0');
  // Round 1: two boss actions, no lock-on yet.
  const log1 = toRound(m, 2);
  assert.equal(bossActions(log1).length, 2);
  assert.equal(ofType(log1, 'telegraph').length, 0);
  // Round 2: the boss's last action is Lock-On.
  const log2 = toRound(m, 3);
  const acts = bossActions(log2);
  assert.equal(acts.length, 2);
  assert.equal(acts[1].name, 'Lock-On');
  const tel = ofType(log2, 'telegraph')[0];
  const target = m.get(tel.targetId);
  assert.equal(target.side, 'party');
  assert.deepEqual(tel, { type: 'telegraph', actorId: 'e0', targetId: target.id, text: `SENTINEL locks on to ${target.name}!` });
  assert.equal(boss.lockOnTarget, target.id);
  // Round 3: the boss's first action is an ordinary attack; its last action fires the beam.
  const log3 = toRound(m, 4);
  const acts3 = bossActions(log3);
  assert.equal(acts3.length, 2);
  assert.notEqual(acts3[0].name, 'Annihilator Beam');
  assert.equal(acts3[1].name, 'Annihilator Beam');
  assert.deepEqual(acts3[1].targets, [target.id]);
  const beamHit = log3.slice(log3.indexOf(acts3[1])).find((e) => e.type === 'hit');
  assert.equal(beamHit.targetId, target.id);
  assert.equal(beamHit.damageType, 'void');
  assert.equal(boss.lockOnTarget, null);
  // Next lock-on comes three rounds later (round 5).
  const log4 = toRound(m, 5);
  assert.equal(ofType(log4, 'telegraph').length, 0);
  assert.ok(!bossActions(log4).some((a) => a.name === 'Annihilator Beam'));
  const log5 = toRound(m, 6);
  assert.equal(ofType(log5, 'telegraph').length, 1);
});

test('boss: breaking it cancels the lock-on; +2 max shield after each break (capped)', () => {
  const m = battle('boss_sentinel');
  const boss = m.get('e0');
  tough(boss);
  m.begin();
  boss.lockOnTarget = 'orion';
  boss.lockRound = 1;
  boss.shield = 1;
  toTurn(m, 'nyx');
  const ev = m.act({ actorId: 'nyx', kind: 'attack', weapon: 'rifle', targetId: 'e0' });
  assert.deepEqual(ev.slice(-3).map((e) => e.type), ['break', 'message', 'orderUpdate']);
  assert.equal(ofType(ev, 'message')[0].text, 'SENTINEL\'s lock-on was disrupted!');
  assert.equal(boss.lockOnTarget, null);
  assert.deepEqual(ofType(ev, 'orderUpdate')[0].order, ['orion', 'sera', 'kade'], 'both boss slots removed');
  const log = toRound(m, 3);
  assert.deepEqual(ofType(log, 'recover'), [{ type: 'recover', targetId: 'e0', shield: 8, maxShield: 8 }]);
  boss.maxShield = 11;
  boss.shield = 0;
  boss.broken = true;
  boss.breakRounds = 1;
  const log2 = toRound(m, 4);
  assert.deepEqual(ofType(log2, 'recover')[0], { type: 'recover', targetId: 'e0', shield: 12, maxShield: 12 });
});

test('boss: Overcharge once it drops below half HP', () => {
  const m = battle('boss_sentinel');
  const boss = m.get('e0');
  m.begin();
  boss.hp = Math.floor(boss.maxHp * 0.45);
  toTurn(m, 'e0');
  const ev = m.enemyTurn();
  assert.equal(ofType(ev, 'action')[0].name, 'Overcharge');
  assert.deepEqual(ofType(ev, 'action')[0].targets, ['e0']);
  assert.deepEqual(ofType(ev, 'status').map((s) => [s.targetId, s.stat, s.stage]), [['e0', 'atk', 1], ['e0', 'mag', 1]]);
});

test('enemy AI favours wounded members', () => {
  const counts = { kade: 0, nyx: 0, orion: 0, sera: 0 };
  for (let seed = 1; seed <= 400; seed++) {
    const m = battle('drone_single', makeRng(seed));
    m.begin();
    m.get('sera').hp = 20;
    toTurn(m, 'e0');
    const hit = ofType(m.enemyTurn(), 'hit')[0];
    if (hit) counts[hit.targetId]++;
  }
  assert.ok(counts.sera > counts.kade * 1.5, JSON.stringify(counts));
});

// ------------------------------------------------------------------------------------------ rewards

test('rewards and applyRewards: xp, credits, drops, EP recharge, level ups', () => {
  const m = battle('crawler_pair', fixed(0.1)); // 0.1 < every drop chance -> all drops
  m.begin();
  for (const e of m.enemies) e.hp = 1;
  toTurn(m, 'nyx');
  m.act({ actorId: 'nyx', kind: 'skill', skillId: 'scatter_shot' });
  assert.equal(m.result, 'victory');
  const r = m.rewards();
  assert.deepEqual(r, { xp: 140, credits: 90, items: [{ id: 'medigel', n: 2 }, { id: 'ether', n: 2 }], epRecovery: VICTORY_EP_RECOVERY });
  assert.deepEqual(m.rewards(), r, 'stable');
  const orion = gameState.party.find((p) => p.id === 'orion');
  orion.xp = orion.xpNext - 10;
  m.get('sera').alive = false; // KO'd members get no xp
  m.get('sera').hp = 0;
  const seraXp = gameState.party.find((p) => p.id === 'sera').xp;
  const nyxEp = gameState.party.find((p) => p.id === 'nyx').ep;
  const ev = m.applyRewards();
  assert.deepEqual(ev, [{ type: 'levelUp', memberId: 'orion', name: 'ORION', level: 12, gains: PARTY_DEFS.orion.growth }]);
  assert.equal(orion.level, 12);
  assert.equal(orion.xp, 130);
  assert.equal(orion.stats.mag, PARTY_DEFS.orion.base.mag + PARTY_DEFS.orion.growth.mag);
  assert.equal(m.get('orion').level, 12, 'combatant view synced');
  assert.equal(gameState.credits, 90);
  assert.equal(gameState.inventory.medigel, 5);
  assert.equal(gameState.inventory.ether, 3);
  assert.equal(gameState.party.find((p) => p.id === 'nyx').ep, Math.min(PARTY_DEFS.nyx.base.maxEp, nyxEp + Math.round(PARTY_DEFS.nyx.base.maxEp * VICTORY_EP_RECOVERY)));
  assert.equal(gameState.party.find((p) => p.id === 'sera').xp, seraXp);
  assert.deepEqual(m.applyRewards(), [], 'applies once');
  assert.equal(gameState.credits, 90);
});

test('boss victory sets the boss_defeated flag', () => {
  const m = battle('boss_sentinel');
  m.begin();
  m.get('e0').hp = 1;
  toTurn(m, 'nyx');
  m.act({ actorId: 'nyx', kind: 'attack', weapon: 'rifle', targetId: 'e0' });
  assert.equal(m.result, 'victory');
  assert.equal(gameState.flags.boss_defeated, true);
});

// ------------------------------------------------------------------------------------------ whole battles

// Random-but-legal policy covering every action kind; used for determinism and event-shape checks.
function chaosPolicy(m, rng) {
  const c = m.current;
  if (c.side !== 'party') return m.enemyTurn();
  const menu = m.getMenu(c.id);
  const roll = rng();
  const boost = Math.floor(rng() * (m.maxBoost(c.id) + 1));
  const pick = (list) => list[Math.floor(rng() * list.length)];
  if (roll < 0.04 && menu.canFlee) return m.act({ actorId: c.id, kind: 'flee' });
  if (roll < 0.12) return m.act({ actorId: c.id, kind: 'defend' });
  if (roll < 0.2) {
    const it = pick(menu.items.filter((i) => i.usable));
    if (it) return m.act({ actorId: c.id, kind: 'item', itemId: it.id, targetId: pick(m.validTargets(c.id, it.target)) });
  }
  if (roll < 0.6) {
    const s = pick(menu.skills.filter((x) => x.usable));
    if (s) return m.act({ actorId: c.id, kind: 'skill', skillId: s.id, targetId: pick(m.validTargets(c.id, s.target)), boost });
  }
  return m.act({ actorId: c.id, kind: 'attack', weapon: pick(menu.weapons), targetId: pick(m.validTargets(c.id, 'enemy')), boost });
}

function playOut(encounterId, seed) {
  const m = battle(encounterId, makeRng(seed));
  for (const p of gameState.party) p.xp = p.xpNext - 1; // any win levels up living members
  const prng = makeRng(seed * 13 + 1);
  const events = [...m.begin()];
  for (let guard = 0; guard < 2000 && !m.isOver(); guard++) {
    events.push(...m.nextTurn());
    events.push(...chaosPolicy(m, prng));
  }
  events.push(...m.applyRewards());
  return { m, events };
}

test('battles are deterministic for a given seed and always terminate', () => {
  for (const id of Object.keys(ENCOUNTERS)) {
    const a = playOut(id, 42);
    const b = playOut(id, 42);
    assert.ok(a.m.isOver(), `${id} ended`);
    assert.deepEqual(a.events, b.events);
  }
});

test('every event type carries exactly the contract fields (plus documented extras)', () => {
  const shapes = {
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
  };
  const seen = new Set();
  for (const id of Object.keys(ENCOUNTERS)) {
    for (let seed = 1; seed <= 40; seed++) {
      const { events } = playOut(id, seed);
      for (const e of events) {
        const shape = shapes[e.type];
        assert.ok(shape, `unknown event type ${e.type}`);
        const [req, extra = []] = shape;
        const keys = Object.keys(e).filter((k) => k !== 'type');
        for (const k of req) assert.ok(k in e, `${e.type}.${k} missing`);
        for (const k of keys) assert.ok(req.includes(k) || extra.includes(k), `${e.type}.${k} unexpected`);
        seen.add(e.type);
      }
    }
  }
  // message comes from invalid input or a disrupted lock-on; covered by dedicated tests above.
  const missing = Object.keys(shapes).filter((t) => !seen.has(t) && t !== 'message');
  assert.deepEqual(missing, [], 'random battles exercise every event type');
});

test('party state is mutated in place on gameState.party', () => {
  const { m } = playOut('turret_squad', 5);
  for (const c of m.party) {
    const mem = gameState.party.find((p) => p.id === c.id);
    assert.equal(mem.hp, c.hp);
    assert.equal(mem.ep, c.ep);
    assert.equal(mem.alive, c.alive);
  }
});
