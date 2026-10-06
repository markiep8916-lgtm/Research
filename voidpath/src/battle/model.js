// Battle rules engine: Octopath-style Break & Boost. Pure logic (no DOM, no three.js),
// deterministic for a given injected rng. The presentation layer drives it:
//
//   const m = new BattleModel({ party: gameState.party, encounterId, rng });
//   play(m.begin());
//   while (!m.isOver()) {
//     play(m.nextTurn());
//     play(m.phase === 'playerInput' ? m.act(await chooseAction(m)) : m.enemyTurn());
//   }
//   play(m.applyRewards());   // victory only
//
// Each call returns plain event objects in the order they should be presented.

import { PHYSICAL, WEAPON_ANIM, SKILLS, ITEMS, ENEMIES, ENCOUNTERS } from './data.js';
import { gameState, addItem, removeItem, itemCount, gainXp } from '../core/state.js';

export const MAX_BP = 5;
export const MAX_BOOST = 3;
export const BOOST_POTENCY = [1, 1.5, 2, 2.5];
export const FLEE_CHANCE = 0.7;
export const CRIT_CHANCE = 0.08;
export const CRIT_MULT = 1.5;
export const WEAK_MULT = 1.3;
export const BREAK_MULT = 2;
export const DEFEND_MULT = 0.5;
export const DAMAGE_CAP = 9999;
export const BREAK_ROUNDS = 2;        // rounds counted down at round start: rest of this round + all of the next
export const BOSS_SHIELD_GAIN = 2;
export const LOCK_ON_INTERVAL = 3;    // boss locks on in rounds 2, 5, 8, ... and fires at the end of the next round
export const VICTORY_EP_RECOVERY = 0.2; // surviving members recharge this fraction of max EP after a win
const ORDER_JITTER = 0.08;            // per-round SPD jitter (+-8%)
const EXTRA_SLOT_FACTOR = 0.5;        // a boss's extra actions sort at half (quarter, ...) its speed
const OVERCHARGE_HP = 0.5;

const stageMult = (s) => (s >= 0 ? 1 + 0.25 * s : 1 + 0.2 * s);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const sameIds = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);
const ids = (list) => list.map((c) => c.id);

function partyCombatant(m) {
  const alive = !!m.alive && m.hp > 0;
  return {
    id: m.id, side: 'party', key: m.id, name: m.name, level: m.level,
    hp: alive ? m.hp : 0, maxHp: m.maxHp, ep: m.ep, maxEp: m.maxEp, bp: 0, maxBp: MAX_BP,
    stats: { ...m.stats }, buffs: {}, weaknesses: [], revealed: [],
    shield: 0, maxShield: 0, broken: false, breakRounds: 0, alive, defending: false, boss: false,
    boostedLastRound: false, weapons: [...m.weapons], skills: [...m.skills], actionsPerRound: 1,
  };
}

function enemyCombatants(kinds) {
  const total = {};
  const seen = {};
  for (const k of kinds) total[k] = (total[k] || 0) + 1;
  return kinds.map((kind, i) => {
    const d = ENEMIES[kind];
    if (!d) throw new Error(`Unknown enemy kind: ${kind}`);
    seen[kind] = (seen[kind] || 0) + 1;
    const known = gameState.bestiary[kind] || [];
    return {
      id: `e${i}`, side: 'enemy', key: kind,
      name: total[kind] > 1 ? `${d.name} ${String.fromCharCode(64 + seen[kind])}` : d.name,
      level: d.level, hp: d.maxHp, maxHp: d.maxHp, ep: 0, maxEp: 0, bp: 0, maxBp: MAX_BP,
      stats: { ...d.stats }, buffs: {}, weaknesses: [...d.weaknesses],
      revealed: d.weaknesses.filter((t) => known.includes(t)),
      shield: d.shield, maxShield: d.shield, maxShieldCap: d.maxShieldCap || d.shield,
      broken: false, breakRounds: 0, alive: true, defending: false, boss: !!d.boss, boostedLastRound: false,
      actionsPerRound: d.actionsPerRound || 1,
      lockOnTarget: null, lockRound: 0, lastLockRound: -LOCK_ON_INTERVAL, overcharged: false,
    };
  });
}

export class BattleModel {
  constructor({ party, encounterId, rng = Math.random }) {
    const enc = ENCOUNTERS[encounterId];
    if (!enc) throw new Error(`Unknown encounter: ${encounterId}`);
    this.encounter = enc;
    this.rng = rng;
    this._members = new Map(party.map((m) => [m.id, m]));
    this.party = party.map(partyCombatant);
    this.enemies = enemyCombatants(enc.enemies);
    this.combatants = [...this.party, ...this.enemies];
    this._byId = new Map(this.combatants.map((c) => [c.id, c]));
    this.round = 0;
    this.order = [];
    this.nextOrder = [];
    this.current = null;
    this.phase = 'idle';
    this.result = null;
    this._jitterNext = null;
    this._rewards = null;
    this._rewardsApplied = false;
  }

  get(id) {
    return this._byId.get(id) || null;
  }

  isOver() {
    return this.result !== null;
  }

  // Current stat with buff/debuff stages applied (e.g. for a status panel).
  effectiveStat(id, key) {
    const c = this.get(id);
    return c ? Math.round(this._stat(c, key)) : 0;
  }

  maxBoost(actorId) {
    const c = this.get(actorId);
    return c && c.side === 'party' && c.alive ? Math.min(MAX_BOOST, c.bp) : 0;
  }

  // ---------------------------------------------------------------- flow

  begin() {
    if (this.round) return [];
    this.round = 1;
    const now = this._rollJitter();
    this._jitterNext = this._rollJitter();
    this.order = this._buildOrder(now, false);
    this.nextOrder = this._buildOrder(this._jitterNext, true);
    const events = [{ type: 'roundStart', round: 1, order: [...this.order], nextOrder: [...this.nextOrder] }];
    for (const c of this.party) {
      if (!c.alive) continue;
      c.bp = 1;
      events.push({ type: 'bp', actorId: c.id, bp: 1, delta: 1 });
    }
    return events;
  }

  nextTurn() {
    if (this.result || this.current) return [];
    const events = this.round ? [] : this.begin();
    if (this._checkEnd(events)) return events;
    this._pruneOrder();
    if (!this.order.length) events.push(...this._startRound());
    const c = this.get(this.order[0]);
    this.current = c;
    c.defending = false; // defend lasts until the actor's next turn
    this.phase = c.side === 'party' ? 'playerInput' : 'enemyTurn';
    events.push({ type: 'turnStart', actorId: c.id });
    return events;
  }

  _startRound() {
    this.round += 1;
    const recover = [];
    const bp = [];
    const status = [];
    for (const c of this.combatants) {
      if (c.alive && c.broken && --c.breakRounds <= 0) {
        c.broken = false;
        c.breakRounds = 0;
        if (c.boss) c.maxShield = Math.min(c.maxShieldCap, c.maxShield + BOSS_SHIELD_GAIN);
        c.shield = c.maxShield;
        recover.push({ type: 'recover', targetId: c.id, shield: c.shield, maxShield: c.maxShield });
      }
      for (const stat of Object.keys(c.buffs)) {
        if (--c.buffs[stat].turns > 0) continue;
        delete c.buffs[stat];
        status.push({ type: 'status', targetId: c.id, stat, stage: 0, turns: 0 });
      }
      if (c.side !== 'party') continue;
      if (c.boostedLastRound) c.boostedLastRound = false;
      else if (c.alive && c.bp < MAX_BP) {
        c.bp += 1;
        bp.push({ type: 'bp', actorId: c.id, bp: c.bp, delta: 1 });
      }
    }
    const now = this._jitterNext;
    this._jitterNext = this._rollJitter();
    this.order = this._buildOrder(now, false);
    this.nextOrder = this._buildOrder(this._jitterNext, true);
    return [
      { type: 'roundStart', round: this.round, order: [...this.order], nextOrder: [...this.nextOrder] },
      ...recover, ...bp, ...status,
    ];
  }

  // Common tail of act()/enemyTurn(): sync party, detect the end, advance and diff the order.
  _endAction(actor, events, snapOrder, snapNext) {
    this._syncParty();
    if (this._checkEnd(events)) return;
    this.current = null;
    this.phase = 'idle';
    if (this.order[0] === actor.id) this.order.shift();
    this._pruneOrder();
    this.nextOrder = this._buildOrder(this._jitterNext, true);
    if (!sameIds(this.order, snapOrder.slice(1)) || !sameIds(this.nextOrder, snapNext)) {
      events.push({ type: 'orderUpdate', order: [...this.order], nextOrder: [...this.nextOrder] });
    }
  }

  // Victory/defeat detection (fled is set by act()). Returns true once the battle is over.
  _checkEnd(events) {
    if (!this.result) {
      if (this.enemies.every((e) => !e.alive)) this._finish('victory', events);
      else if (this.party.every((p) => !p.alive)) this._finish('defeat', events);
    }
    if (!this.result) return false;
    this.current = null;
    this.phase = this.result;
    return true;
  }

  // Debug hook (e.g. __VP.debug.winBattle): every enemy falls at once and the battle ends in victory.
  forceVictory() {
    if (this.result) return [];
    const events = [];
    for (const e of this.enemies) if (e.alive) this._ko(e, events);
    this._checkEnd(events);
    return events;
  }

  _finish(result, events) {
    this.result = result;
    events.push({ type: result });
    if (result !== 'victory') return;
    gameState.stats.battles += 1;
    if (this.encounter.boss) gameState.flags.boss_defeated = true;
  }

  _syncParty() {
    for (const c of this.party) {
      const m = this._members.get(c.id);
      m.hp = c.hp;
      m.ep = c.ep;
      m.alive = c.alive;
    }
  }

  // ---------------------------------------------------------------- turn order

  _rollJitter() {
    const j = new Map();
    for (const c of this.combatants) j.set(c.id, 1 + (this.rng() * 2 - 1) * ORDER_JITTER);
    return j;
  }

  // predict=true: who acts next round given the current state (break countdown, defend carry-over,
  // buffs that will still be active). Uses the pre-rolled jitter of next round so it stays exact.
  _buildOrder(jitter, predict) {
    const entries = [];
    for (const c of this.combatants) {
      if (!c.alive) continue;
      if (c.broken && (!predict || c.breakRounds > 1)) continue;
      const first = predict ? c.defending && !this.order.includes(c.id) : c.defending;
      const spd = this._stat(c, 'spd', predict) * jitter.get(c.id);
      entries.push({ id: c.id, p: (first ? 1e6 : 0) + spd, i: entries.length });
      for (let k = 1; k < c.actionsPerRound; k++) {
        entries.push({ id: c.id, p: spd * EXTRA_SLOT_FACTOR ** k, i: entries.length });
      }
    }
    entries.sort((a, b) => b.p - a.p || a.i - b.i);
    return entries.map((e) => e.id);
  }

  _pruneOrder() {
    this.order = this.order.filter((id) => {
      const c = this.get(id);
      return c.alive && !c.broken;
    });
  }

  // Effective stat with buff stage applied. future=true ignores buffs that expire at the next round start.
  _stat(c, key, future = false) {
    const b = c.buffs[key];
    return b && (!future || b.turns > 1) ? c.stats[key] * stageMult(b.stage) : c.stats[key];
  }

  // ---------------------------------------------------------------- menus / targets

  validTargets(actorId, targetKind) {
    const actor = this.get(actorId);
    if (!actor) return [];
    const foes = actor.side === 'party' ? this.enemies : this.party;
    const friends = actor.side === 'party' ? this.party : this.enemies;
    switch (targetKind) {
      case 'enemy': case 'enemies': case 'randomEnemies': return ids(foes.filter((c) => c.alive));
      case 'ally': case 'allies': return ids(friends.filter((c) => c.alive));
      case 'koAlly': return ids(friends.filter((c) => !c.alive));
      case 'self': return actor.alive ? [actor.id] : [];
      default: return [];
    }
  }

  getMenu(actorId) {
    const c = this.get(actorId);
    const canFlee = !!this.encounter.canFlee;
    if (!c || c.side !== 'party') return { weapons: [], skills: [], items: [], canFlee };
    const skills = c.skills.map((id) => {
      const s = SKILLS[id];
      return {
        id, name: s.name, cost: s.cost, type: s.type, target: s.target, kind: s.kind, desc: s.desc,
        hits: s.hits, boostMode: s.boostMode || null,
        usable: c.ep >= s.cost && this.validTargets(actorId, s.target).length > 0,
      };
    });
    const items = Object.values(ITEMS)
      .filter((it) => it.battle && itemCount(it.id) > 0)
      .map((it) => ({
        id: it.id, name: it.name, count: itemCount(it.id), target: it.target, desc: it.desc,
        usable: this.validTargets(actorId, it.target).length > 0,
      }));
    return { weapons: [...c.weapons], skills, items, canFlee };
  }

  // Single-target kinds fall back to the first valid target if the requested one is invalid.
  _targets(actor, targetKind, targetId) {
    const valid = this.validTargets(actor.id, targetKind);
    if (targetKind === 'enemies' || targetKind === 'allies' || targetKind === 'randomEnemies') {
      return valid.map((id) => this.get(id));
    }
    const id = valid.includes(targetId) ? targetId : valid[0];
    return id ? [this.get(id)] : [];
  }

  // ---------------------------------------------------------------- party actions

  act(action = {}) {
    const actor = this.current;
    if (!actor || this.phase !== 'playerInput' || (action.actorId ?? actor.id) !== actor.id) return [];
    const err = this._checkAction(actor, action);
    if (err) return [{ type: 'message', text: err }];
    const snapOrder = [...this.order];
    const snapNext = [...this.nextOrder];
    const events = [];
    switch (action.kind) {
      case 'attack': this._doAttack(actor, action, events); break;
      case 'skill': this._doSkill(actor, action, events); break;
      case 'item': this._doItem(actor, action, events); break;
      case 'defend':
        actor.defending = true;
        events.push({ type: 'defend', actorId: actor.id });
        break;
      case 'flee': {
        const success = this.rng() < FLEE_CHANCE;
        events.push({ type: 'flee', success });
        if (success) this.result = 'fled';
        break;
      }
    }
    this._endAction(actor, events, snapOrder, snapNext);
    return events;
  }

  // Returns an error message for an action that cannot be taken (the turn is not consumed), or null.
  _checkAction(actor, a) {
    switch (a.kind) {
      case 'attack': case 'defend': return null;
      case 'flee': return this.encounter.canFlee ? null : 'There is no escape!';
      case 'skill': {
        const s = SKILLS[a.skillId];
        if (!s || !actor.skills.includes(a.skillId)) return 'Unknown skill.';
        if (actor.ep < s.cost) return 'Not enough EP.';
        return this.validTargets(actor.id, s.target).length ? null : 'No valid target.';
      }
      case 'item': {
        const it = ITEMS[a.itemId];
        if (!it || !it.battle) return 'That can\'t be used in battle.';
        if (itemCount(it.id) < 1) return `No ${it.name} left.`;
        return this.validTargets(actor.id, it.target).length ? null : 'No valid target.';
      }
      default: return 'Unknown command.';
    }
  }

  _spendBoost(actor, requested, events) {
    const boost = clamp(Math.floor(requested || 0), 0, this.maxBoost(actor.id));
    if (boost > 0) {
      actor.bp -= boost;
      actor.boostedLastRound = true;
      events.push({ type: 'boost', actorId: actor.id, level: boost });
      events.push({ type: 'bp', actorId: actor.id, bp: actor.bp, delta: -boost });
    }
    return boost;
  }

  _doAttack(actor, a, events) {
    const weapon = actor.weapons.includes(a.weapon) ? a.weapon : actor.weapons[0];
    const boost = this._spendBoost(actor, a.boost, events);
    const [target] = this._targets(actor, 'enemy', a.targetId);
    const hits = 1 + boost;
    events.push({
      type: 'action', actorId: actor.id, kind: 'attack', name: 'Attack', anim: WEAPON_ANIM[weapon],
      damageType: weapon, targets: [target.id], hits, boost, weapon,
    });
    for (let i = 0; i < hits && target.alive; i++) this._hit(actor, target, weapon, 1, 'atk', 1, i, hits, events);
  }

  _doSkill(actor, a, events) {
    const s = SKILLS[a.skillId];
    const boost = this._spendBoost(actor, a.boost, events);
    actor.ep -= s.cost;
    events.push({ type: 'ep', targetId: actor.id, amount: -s.cost, epAfter: actor.ep });
    const byHits = s.boostMode === 'hits';
    const potency = byHits ? 1 : BOOST_POTENCY[boost];
    const hits = byHits ? s.hits + boost : s.hits;
    const targets = this._targets(actor, s.target, a.targetId);
    events.push({
      type: 'action', actorId: actor.id, kind: 'skill', name: s.name, anim: s.anim,
      damageType: s.type, targets: ids(targets), hits, boost, skillId: s.id,
    });
    switch (s.kind) {
      case 'attack':
        if (s.target === 'randomEnemies') {
          for (let i = 0; i < hits; i++) {
            const alive = targets.filter((t) => t.alive);
            if (!alive.length) break;
            const t = alive[Math.floor(this.rng() * alive.length)];
            this._hit(actor, t, s.type, s.power, s.scale, potency, i, hits, events);
          }
        } else {
          // wave-major: every target takes hit 1, then every target takes hit 2, ...
          for (let i = 0; i < hits; i++) {
            for (const t of targets) if (t.alive) this._hit(actor, t, s.type, s.power, s.scale, potency, i, hits, events);
          }
        }
        break;
      case 'heal':
        for (const t of targets) {
          const amount = Math.round(this._stat(actor, 'mag') * s.power * 2.2 * (0.95 + this.rng() * 0.1) * potency);
          this._heal(t, amount, events);
        }
        break;
      case 'revive':
        this._revive(targets[0], Math.min(1, s.effect.revive * potency), events);
        break;
      default: // buff | debuff | taunt: boost extends the duration
        for (const t of targets) this._applyStatus(t, s.effect, boost, events);
    }
  }

  _doItem(actor, a, events) {
    const it = ITEMS[a.itemId];
    const [t] = this._targets(actor, it.target, a.targetId);
    removeItem(it.id);
    events.push({
      type: 'action', actorId: actor.id, kind: 'item', name: it.name, anim: 'item',
      damageType: null, targets: [t.id], hits: 0, boost: 0, itemId: it.id,
    });
    const fx = it.effect;
    if (fx.revive) this._revive(t, fx.revive, events);
    if (fx.heal) this._heal(t, fx.heal, events);
    if (fx.ep) {
      const before = t.ep;
      t.ep = Math.min(t.maxEp, t.ep + fx.ep);
      events.push({ type: 'ep', targetId: t.id, amount: t.ep - before, epAfter: t.ep });
    }
  }

  // ---------------------------------------------------------------- enemy AI

  enemyTurn() {
    const actor = this.current;
    if (!actor || this.phase !== 'enemyTurn') return [];
    const snapOrder = [...this.order];
    const snapNext = [...this.nextOrder];
    const events = [];
    const { action, target } = this._chooseEnemyAction(actor);
    this._resolveEnemyAction(actor, action, target, events);
    this._endAction(actor, events, snapOrder, snapNext);
    return events;
  }

  _chooseEnemyAction(e) {
    const acts = ENEMIES[e.key].actions;
    const byKind = (kind) => acts.find((a) => a.kind === kind);
    if (e.boss) {
      // Lock-On is the boss's last action of round R; the beam is its last action of round R+1,
      // so every traveler gets a turn to answer it (defend, heal, or break the boss to cancel it).
      const lastSlot = this.order.indexOf(e.id, 1) < 0;
      if (e.lockOnTarget && e.lockRound < this.round && lastSlot) {
        const locked = this.get(e.lockOnTarget);
        e.lockOnTarget = null;
        return { action: acts.find((a) => a.id === 'annihilator_beam'), target: locked.alive ? locked : this._pickTarget(e, true) };
      }
      const over = byKind('buff');
      if (over && !e.overcharged && e.hp < e.maxHp * OVERCHARGE_HP) {
        e.overcharged = true;
        return { action: over, target: e };
      }
      const lock = byKind('lockOn');
      if (lock && lastSlot && !e.lockOnTarget && this.round >= 2 && this.round - e.lastLockRound >= LOCK_ON_INTERVAL) {
        return { action: lock, target: this._pickTarget(e, false) };
      }
    }
    const pool = acts.filter((a) => a.weight > 0 && (a.kind !== 'buff' || this._canSelfBuff(e, a)));
    const action = this._weighted(pool, pool.map((a) => a.weight));
    return { action, target: action.target === 'self' ? e : this._pickTarget(e, false) };
  }

  _canSelfBuff(e, a) {
    return e.hp < e.maxHp * OVERCHARGE_HP && a.effect.stats.some((s) => !(e.buffs[s]?.stage > 0));
  }

  // Taunting members draw single-target attacks; otherwise wounded members are favoured.
  _pickTarget(e, ignoreTaunt) {
    const alive = this.party.filter((p) => p.alive);
    if (!ignoreTaunt) {
      const taunter = alive.find((p) => p.buffs.taunt);
      if (taunter) return taunter;
    }
    return this._weighted(alive, alive.map((p) => 1 + 1.5 * (1 - p.hp / p.maxHp)));
  }

  _resolveEnemyAction(e, act, target, events) {
    const targets = act.target === 'all' ? this.party.filter((p) => p.alive) : [target];
    const hits = act.power > 0 ? act.hits || 1 : 0;
    events.push({
      type: 'action', actorId: e.id, kind: act.kind, name: act.name, anim: act.anim,
      damageType: act.type, targets: ids(targets), hits, actionId: act.id,
    });
    if (act.kind === 'lockOn') {
      e.lockOnTarget = target.id;
      e.lockRound = this.round;
      e.lastLockRound = this.round;
      events.push({ type: 'telegraph', actorId: e.id, targetId: target.id, text: `${e.name} locks on to ${target.name}!` });
      return;
    }
    const scale = PHYSICAL.includes(act.type) ? 'atk' : 'mag';
    for (let i = 0; i < hits; i++) {
      for (const t of targets) if (t.alive) this._hit(e, t, act.type, act.power, scale, 1, i, hits, events);
    }
    if (act.effect) for (const t of targets) if (t.alive) this._applyStatus(t, act.effect, 0, events);
  }

  // ---------------------------------------------------------------- effects

  _hit(attacker, target, type, power, scale, potency, hitIndex, hitCount, events) {
    const physical = scale === 'atk';
    const atk = this._stat(attacker, physical ? 'atk' : 'mag');
    const def = this._stat(target, physical ? 'def' : 'res');
    let dmg = Math.max(1, (atk * power * 2.2 - def * 1.1) * (0.92 + this.rng() * 0.16)) * potency;
    const weak = !!type && target.weaknesses.includes(type);
    const broken = target.broken;
    const crit = physical && this.rng() < CRIT_CHANCE;
    if (weak) dmg *= WEAK_MULT;
    if (broken) dmg *= BREAK_MULT;
    if (crit) dmg *= CRIT_MULT;
    if (target.defending) dmg *= DEFEND_MULT;
    const amount = clamp(Math.round(dmg), 1, DAMAGE_CAP);
    target.hp = Math.max(0, target.hp - amount);
    events.push({
      type: 'hit', actorId: attacker.id, targetId: target.id, damageType: type, amount, crit, weak, broken,
      hpAfter: target.hp, hitIndex, hitCount,
    });
    if (attacker.side === 'party' && amount > gameState.stats.maxDamage) gameState.stats.maxDamage = amount;
    if (weak && !target.revealed.includes(type)) {
      target.revealed.push(type);
      const known = (gameState.bestiary[target.key] ||= []);
      if (!known.includes(type)) known.push(type);
      events.push({ type: 'reveal', targetId: target.id, damageType: type });
    }
    if (target.hp <= 0) {
      this._ko(target, events);
      return;
    }
    if (weak && !broken && target.shield > 0) {
      target.shield -= 1;
      events.push({ type: 'shield', targetId: target.id, shield: target.shield, maxShield: target.maxShield });
      if (target.shield === 0) this._break(target, events);
    }
  }

  _break(t, events) {
    t.broken = true;
    t.breakRounds = BREAK_ROUNDS;
    gameState.stats.breaks += 1;
    events.push({ type: 'break', targetId: t.id });
    if (t.lockOnTarget) {
      t.lockOnTarget = null;
      events.push({ type: 'message', text: `${t.name}'s lock-on was disrupted!` });
    }
  }

  _ko(t, events) {
    t.alive = false;
    t.hp = 0;
    t.defending = false;
    t.buffs = {};
    t.lockOnTarget = null;
    events.push({ type: 'ko', targetId: t.id });
    if (t.side === 'party') {
      t.boostedLastRound = false;
      if (t.bp > 0) {
        events.push({ type: 'bp', actorId: t.id, bp: 0, delta: -t.bp });
        t.bp = 0;
      }
    }
  }

  // amount in the event is the nominal heal (it may exceed the missing HP).
  _heal(t, amount, events) {
    t.hp = Math.min(t.maxHp, t.hp + amount);
    events.push({ type: 'heal', targetId: t.id, amount, hpAfter: t.hp });
  }

  _revive(t, fraction, events) {
    t.alive = true;
    t.hp = Math.max(1, Math.round(t.maxHp * fraction));
    t.bp = 0;
    events.push({ type: 'revive', targetId: t.id, hpAfter: t.hp });
  }

  // effect: { stats, stage, turns }. Stages stack within -2..+2; turns refresh to the longer duration.
  _applyStatus(t, effect, extraTurns, events) {
    for (const stat of effect.stats) {
      const cur = t.buffs[stat];
      const stage = stat === 'taunt' ? 1 : clamp((cur ? cur.stage : 0) + effect.stage, -2, 2);
      const turns = Math.max(cur ? cur.turns : 0, effect.turns + extraTurns);
      if (stage === 0) {
        delete t.buffs[stat];
        events.push({ type: 'status', targetId: t.id, stat, stage: 0, turns: 0 });
      } else {
        t.buffs[stat] = { stage, turns };
        events.push({ type: 'status', targetId: t.id, stat, stage, turns });
      }
    }
  }

  _weighted(items, weights) {
    let total = 0;
    for (const w of weights) total += w;
    let r = this.rng() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }

  // ---------------------------------------------------------------- rewards

  // epRecovery: fraction of max EP that applyRewards() restores to surviving members.
  rewards() {
    if (this.result !== 'victory') return { xp: 0, credits: 0, items: [], epRecovery: 0 };
    if (!this._rewards) {
      let xp = 0;
      let credits = 0;
      const items = {};
      for (const e of this.enemies) {
        const d = ENEMIES[e.key];
        xp += d.xp;
        credits += d.credits;
        for (const drop of d.drops) if (this.rng() < drop.chance) items[drop.id] = (items[drop.id] || 0) + drop.n;
      }
      this._rewards = { xp, credits, items: Object.entries(items).map(([id, n]) => ({ id, n })) };
    }
    const r = this._rewards;
    return { xp: r.xp, credits: r.credits, items: r.items.map((it) => ({ ...it })), epRecovery: VICTORY_EP_RECOVERY };
  }

  // Living members gain the full xp (Octopath rule: KO'd members gain none) and recharge
  // VICTORY_EP_RECOVERY of their max EP. Safe to call more than once (applies once).
  applyRewards() {
    if (this.result !== 'victory' || this._rewardsApplied) return [];
    this._rewardsApplied = true;
    const r = this.rewards();
    gameState.credits += r.credits;
    for (const it of r.items) addItem(it.id, it.n);
    const events = [];
    for (const c of this.party) {
      if (!c.alive) continue;
      const m = this._members.get(c.id);
      m.ep = Math.min(m.maxEp, m.ep + Math.round(m.maxEp * VICTORY_EP_RECOVERY));
      for (const up of gainXp(m, r.xp)) {
        events.push({ type: 'levelUp', memberId: m.id, name: m.name, level: up.level, gains: up.gains });
      }
      Object.assign(c, { level: m.level, hp: m.hp, maxHp: m.maxHp, ep: m.ep, maxEp: m.maxEp, stats: { ...m.stats } });
    }
    return events;
  }
}
