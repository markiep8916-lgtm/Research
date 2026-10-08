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
//
// Full-game extensions (TECH_PLAN 7.1-7.3). Every new behaviour is off unless a definition asks for
// it: the POC encounters consume rng() exactly as before and emit exactly the POC event shapes.
//   - party-size scaling and difficulty (BATTLE_RULES), unless the encounter sets scale: false
//   - AI dispatch: 'sentinel' (POC boss path) or 'basic' (script, then gated weighted pick);
//     pending charge, lock-on and `then` actions take precedence
//   - ailments sleep / jam / marked (buffs at stage 1), cleanse, immune, ailmentResist, effect.limit
//   - untargetable enemies (submerge / phase / shield), "Nothing to target."
//   - lockOn and charge telegraphs that fire `fires`; a break cancels both and any pending `then`
//   - summons (monotonic e<N> ids, join next round), transforms, phases, onDefeat, weakness pools
//   - boss scripts (battle/scripts.js): hooks + api; ultimates; equipment mods; item damage; winOn
//   - new events: say, summon, transform, untargetable, weakShift, skip, learn, ultimateReady, cue
// POC review fixes: a reveal also reveals living same-kind twins (R18); reviving a member an enemy
// is still locked on to re-announces the lock with a telegraph event (R16).

import {
  PHYSICAL, WEAPON_ANIM, SKILLS, ITEMS, ENEMIES, ENCOUNTERS, BATTLE_RULES, DIFFICULTY, AILMENTS,
} from './data.js';
import { BOSS_SCRIPTS } from './scripts.js';
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
export const MAX_ENEMIES = 4;         // summons stop when this many enemies are alive
const ORDER_JITTER = 0.08;            // per-round SPD jitter (+-8%)
const EXTRA_SLOT_FACTOR = 0.5;        // a boss's extra actions sort at half (quarter, ...) its speed
const OVERCHARGE_HP = 0.5;
const HOOK_DEPTH = 4;                 // scripts may trigger scripts (useAction -> onHit), but not forever
const STAGE_ONE = new Set(['taunt', ...AILMENTS]);
const OFFENSIVE_TARGETS = ['enemy', 'enemies', 'randomEnemies'];

const stageMult = (s) => (s >= 0 ? 1 + 0.25 * s : 1 + 0.2 * s);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const sameIds = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);
const ids = (list) => list.map((c) => c.id);
const isAilment = (stat) => AILMENTS.includes(stat);

/** Settings: 'normal' | 'story' (TECH_PLAN 8.1). Mutates BATTLE_RULES.difficulty in place. */
export function setDifficulty(mode) {
  Object.assign(BATTLE_RULES.difficulty, DIFFICULTY[mode] || DIFFICULTY.normal);
}

function partyCombatant(m) {
  const alive = !!m.alive && m.hp > 0;
  const mods = m.mods || {};
  return {
    id: m.id, side: 'party', key: m.id, name: m.name, level: m.level,
    hp: alive ? m.hp : 0, maxHp: m.maxHp, ep: m.ep, maxEp: m.maxEp, bp: 0, maxBp: MAX_BP,
    stats: { ...m.stats }, buffs: {}, weaknesses: [], revealed: [],
    shield: 0, maxShield: 0, broken: false, breakRounds: 0, alive, defending: false, boss: false,
    boostedLastRound: false, weapons: [...m.weapons], skills: [...m.skills], actionsPerRound: 1,
    mods: {
      resist: { ...mods.resist }, boost: { ...mods.boost }, immune: [...(mods.immune || [])],
      ailmentResist: { ...mods.ailmentResist },
    },
    startBp: mods.startBp || 0, ultimateUsed: false, protect: 0, untargetable: 0, untargetableStyle: null,
  };
}

export class BattleModel {
  constructor({ party, encounterId, rng = Math.random }) {
    const enc = ENCOUNTERS[encounterId];
    if (!enc) throw new Error(`Unknown encounter: ${encounterId}`);
    this.encounter = enc;
    this.encounterId = encounterId;
    this.rng = rng;
    const size = clamp(party.length, 1, 4);
    const scale = enc.scale !== false;
    const ps = BATTLE_RULES.partyScale;
    const diff = BATTLE_RULES.difficulty;
    this.hpMult = (scale ? ps.hp[size] ?? 1 : 1) * (diff.hp ?? 1);
    this.dmgMult = (scale ? ps.dmg[size] ?? 1 : 1) * (diff.dmg ?? 1);
    this._members = new Map(party.map((m) => [m.id, m]));
    this.party = party.map(partyCombatant);
    this.enemies = this._enemyCombatants(enc.enemies);
    this.combatants = [...this.party, ...this.enemies];
    this._byId = new Map(this.combatants.map((c) => [c.id, c]));
    this.round = 0;
    this.order = [];
    this.nextOrder = [];
    this.current = null;
    this.phase = 'idle';
    this.result = null;
    this._jitterNow = null;
    this._jitterNext = null;
    this._rewards = null;
    this._rewardsApplied = false;
    this._nextEnemy = enc.enemies.length; // summon ids continue from here and are never reused
    this._ev = null;                      // event list the script api appends to
    this._hookDepth = 0;
    this._mems = {};
    this._readyNotified = new Set();
    this._warned = new Set();
    this.api = this._makeApi();
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

  // ---------------------------------------------------------------- combatant factories

  _makeEnemy(kind, id, name) {
    const d = ENEMIES[kind];
    if (!d) throw new Error(`Unknown enemy kind: ${kind}`);
    const known = gameState.bestiary[kind] || [];
    const maxHp = this.hpMult === 1 ? d.maxHp : Math.max(1, Math.round(d.maxHp * this.hpMult));
    const pool = d.weaknessPool;
    return {
      id, side: 'enemy', key: kind, name,
      level: d.level, hp: maxHp, maxHp, ep: 0, maxEp: 0, bp: 0, maxBp: MAX_BP,
      stats: { ...d.stats }, buffs: {}, weaknesses: [...d.weaknesses],
      revealed: d.weaknesses.filter((t) => known.includes(t)),
      shield: d.shield, maxShield: d.shield, maxShieldCap: d.maxShieldCap || d.shield,
      broken: false, breakRounds: 0, alive: true, defending: false, boss: !!d.boss, boostedLastRound: false,
      actionsPerRound: d.actionsPerRound || 1,
      lockOnTarget: null, lockRound: 0, lastLockRound: -LOCK_ON_INTERVAL, overcharged: false,
      lockFires: null, charge: null, then: null, used: {},
      untargetable: 0, untargetableStyle: null, rtResist: {}, protect: 0,
      mods: { resist: { ...d.resist }, boost: {}, immune: [...(d.immune || [])], ailmentResist: { ...d.ailmentResist } },
      script: d.script || null, phasesFired: [], thresholdsFired: {},
      weaknessIndex: pool ? pool.findIndex((set) => sameIds([...set].sort(), [...d.weaknesses].sort())) : -1,
    };
  }

  _enemyCombatants(kinds) {
    const total = {};
    const seen = {};
    for (const k of kinds) total[k] = (total[k] || 0) + 1;
    return kinds.map((kind, i) => {
      const d = ENEMIES[kind];
      if (!d) throw new Error(`Unknown enemy kind: ${kind}`);
      seen[kind] = (seen[kind] || 0) + 1;
      const name = total[kind] > 1 ? `${d.name} ${String.fromCharCode(64 + seen[kind])}` : d.name;
      return this._makeEnemy(kind, `e${i}`, name);
    });
  }

  // ---------------------------------------------------------------- flow

  begin() {
    if (this.round) return [];
    this.round = 1;
    const now = this._rollJitter();
    this._jitterNow = now;
    this._jitterNext = this._rollJitter();
    this.order = this._buildOrder(now, false);
    this.nextOrder = this._buildOrder(this._jitterNext, true);
    const events = [{ type: 'roundStart', round: 1, order: [...this.order], nextOrder: [...this.nextOrder] }];
    for (const c of this.party) {
      if (!c.alive) continue;
      c.bp = Math.min(MAX_BP, 1 + c.startBp);
      events.push({ type: 'bp', actorId: c.id, bp: c.bp, delta: c.bp });
    }
    this._withEvents(events, () => {
      this._callScripts('onBegin');
      this._callScripts('onRoundStart', 1);
    });
    return events;
  }

  nextTurn() {
    if (this.result || this.current) return [];
    const events = this.round ? [] : this.begin();
    this._withEvents(events, () => {
      // Sleeping actors take their turn as a `skip`, then the next actor comes up in the same call.
      for (let guard = 0; guard < 500; guard++) {
        if (this._checkEnd(events)) return;
        this._pruneOrder();
        if (!this.order.length) {
          this._startRound(events);
          if (this._checkEnd(events)) return;
          this._pruneOrder();
        }
        const c = this.get(this.order[0]);
        if (!c) return;
        this.current = c;
        c.defending = false; // defend lasts until the actor's next turn
        this.phase = c.side === 'party' ? 'playerInput' : 'enemyTurn';
        events.push({ type: 'turnStart', actorId: c.id });
        if (!c.buffs.sleep) {
          if (c.side === 'party') this._notifyUltimate(c, events);
          return;
        }
        const snapOrder = [...this.order];
        const snapNext = [...this.nextOrder];
        events.push({ type: 'skip', actorId: c.id, reason: 'sleep' });
        this._endAction(c, events, snapOrder, snapNext);
      }
    });
    return events;
  }

  _startRound(events) {
    this.round += 1;
    const recover = [];
    const bp = [];
    const status = [];
    const extra = [];
    const recovered = [];
    for (const c of this.combatants) {
      if (c.alive && c.broken && --c.breakRounds <= 0) {
        c.broken = false;
        c.breakRounds = 0;
        // shield growth after each break: EnemyDef.shieldGain, else BOSS_SHIELD_GAIN for bosses
        const gain = c.side === 'enemy' ? ENEMIES[c.key].shieldGain ?? (c.boss ? BOSS_SHIELD_GAIN : 0) : 0;
        if (gain) c.maxShield = Math.min(c.maxShieldCap, c.maxShield + gain);
        c.shield = c.maxShield;
        recover.push({ type: 'recover', targetId: c.id, shield: c.shield, maxShield: c.maxShield });
        if (c.side === 'enemy') {
          this._shiftOnRecover(c, recover);
          recovered.push(c);
        }
      }
      for (const stat of Object.keys(c.buffs)) {
        if (--c.buffs[stat].turns > 0) continue;
        delete c.buffs[stat];
        status.push({ type: 'status', targetId: c.id, stat, stage: 0, turns: 0 });
      }
      if (c.side !== 'party') {
        if (c.alive) this._countDownEnemy(c, extra);
        continue;
      }
      if (c.boostedLastRound) c.boostedLastRound = false;
      else if (c.alive && c.bp < MAX_BP) {
        c.bp += 1;
        bp.push({ type: 'bp', actorId: c.id, bp: c.bp, delta: 1 });
      }
    }
    const now = this._jitterNext;
    this._jitterNow = now;
    this._jitterNext = this._rollJitter();
    this.order = this._buildOrder(now, false);
    this.nextOrder = this._buildOrder(this._jitterNext, true);
    events.push(
      { type: 'roundStart', round: this.round, order: [...this.order], nextOrder: [...this.nextOrder] },
      ...recover, ...bp, ...status, ...extra,
    );
    for (const c of recovered) this._callScript(c, 'onRecover', c);
    this._callScripts('onRoundStart', this.round);
  }

  // Untargetable rounds and runtime resists count down at round start (enemies only).
  _countDownEnemy(c, events) {
    if (c.untargetable > 0 && --c.untargetable <= 0) this._setUntargetable(c, false, 0, null, events);
    for (const type of Object.keys(c.rtResist)) {
      if (--c.rtResist[type].rounds > 0) continue;
      delete c.rtResist[type];
      events.push({ type: 'cue', name: 'resist', targetId: c.id, value: null });
    }
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
      if (this._enemiesDefeated(events)) this._finish('victory', events);
      else if (this.party.every((p) => !p.alive)) this._finish('defeat', events);
    }
    if (!this.result) return false;
    this.current = null;
    this.phase = this.result;
    return true;
  }

  // winOn 'boss': the battle is won when every boss enemy is down; the adds shut down with it.
  _enemiesDefeated(events) {
    if (this.encounter.winOn === 'boss') {
      const bosses = this.enemies.filter((e) => e.boss);
      if (bosses.length) {
        if (bosses.some((e) => e.alive)) return false;
        for (const e of this.enemies) if (e.alive) this._ko(e, events);
        return true;
      }
    }
    return this.enemies.every((e) => !e.alive);
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
    if (this.encounter.boss) {
      gameState.flags.boss_defeated = true; // legacy flag (TECH_PLAN 2.9); nothing new reads it
      gameState.flags[`defeated:${this.encounterId}`] = true;
    }
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
      const spd = this._stat(c, 'spd', predict) * (jitter.get(c.id) ?? 1);
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
      case 'enemy': case 'enemies': case 'randomEnemies': return ids(foes.filter((c) => c.alive && !c.untargetable));
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
    const jammed = !!c.buffs.jam;
    const skills = c.skills.map((id) => {
      const s = SKILLS[id];
      const entry = {
        id, name: s.name, cost: s.cost, type: s.type, target: s.target, kind: s.kind, desc: s.desc,
        hits: s.hits, boostMode: s.boostMode || null,
        usable: !jammed && c.ep >= s.cost && this._skillTargets(c, s).length > 0,
      };
      if (s.ultimate) {
        entry.ultimate = true;
        if (c.ultimateUsed) entry.usable = false;
        if (c.bp < BATTLE_RULES.ultimateBp) entry.usable = false;
        if (!entry.usable) entry.reason = c.ultimateUsed ? 'Used' : c.bp < BATTLE_RULES.ultimateBp ? `Needs ${BATTLE_RULES.ultimateBp} BP` : '';
      }
      if (jammed) entry.reason = 'Jammed';
      return entry;
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

  // A heal with effect.revive over 'allies' also covers KO'd members.
  _skillTargets(actor, s, targetId) {
    if (s.kind === 'heal' && s.effect?.revive && s.target === 'allies') {
      return actor.side === 'party' ? [...this.party] : [...this.enemies];
    }
    return this._targets(actor, s.target, targetId);
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
    this._withEvents(events, () => {
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
      const done = events.find((e) => e.type === 'action' && e.actorId === actor.id);
      if (done && !this.result) this._callScripts('onPartyAction', actor, done);
      this._endAction(actor, events, snapOrder, snapNext);
    });
    return events;
  }

  // Returns an error message for an action that cannot be taken (the turn is not consumed), or null.
  _checkAction(actor, a) {
    switch (a.kind) {
      case 'attack': return this.validTargets(actor.id, 'enemy').length ? null : 'Nothing to target.';
      case 'defend': return null;
      case 'flee': return this.encounter.canFlee ? null : 'There is no escape!';
      case 'skill': {
        const s = SKILLS[a.skillId];
        if (!s || !actor.skills.includes(a.skillId)) return 'Unknown skill.';
        if (actor.buffs.jam) return 'Jammed! Skills are offline.';
        if (s.ultimate && actor.ultimateUsed) return `${s.name} is spent for this battle.`;
        if (s.ultimate && actor.bp < BATTLE_RULES.ultimateBp) return `Needs ${BATTLE_RULES.ultimateBp} BP.`;
        if (actor.ep < s.cost) return 'Not enough EP.';
        if (this._skillTargets(actor, s).length) return null;
        return OFFENSIVE_TARGETS.includes(s.target) ? 'Nothing to target.' : 'No valid target.';
      }
      case 'item': {
        const it = ITEMS[a.itemId];
        if (!it || !it.battle) return 'That can\'t be used in battle.';
        if (itemCount(it.id) < 1) return `No ${it.name} left.`;
        if (this.validTargets(actor.id, it.target).length) return null;
        return it.target === 'enemy' || it.effect?.damage ? 'Nothing to target.' : 'No valid target.';
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

  // Ultimates cost exactly BATTLE_RULES.ultimateBp BP and always resolve at Boost 3 (TECH_PLAN 5.4).
  _spendUltimate(actor, events) {
    const cost = BATTLE_RULES.ultimateBp;
    actor.bp -= cost;
    actor.boostedLastRound = true;
    actor.ultimateUsed = true;
    events.push({ type: 'boost', actorId: actor.id, level: MAX_BOOST });
    events.push({ type: 'bp', actorId: actor.id, bp: actor.bp, delta: -cost });
    return MAX_BOOST;
  }

  _doAttack(actor, a, events) {
    const weapon = actor.weapons.includes(a.weapon) ? a.weapon : actor.weapons[0];
    const [target] = this._targets(actor, 'enemy', a.targetId);
    if (!target) return; // _checkAction rejects this; never dereference a missing target
    const boost = this._spendBoost(actor, a.boost, events);
    const hits = 1 + boost;
    events.push({
      type: 'action', actorId: actor.id, kind: 'attack', name: 'Attack', anim: WEAPON_ANIM[weapon],
      damageType: weapon, targets: [target.id], hits, boost, weapon,
    });
    for (let i = 0; i < hits && target.alive && !target.untargetable; i++) {
      this._hit(actor, target, weapon, 1, 'atk', 1, i, hits, events);
    }
  }

  _doSkill(actor, a, events) {
    const s = SKILLS[a.skillId];
    const boost = s.ultimate ? this._spendUltimate(actor, events) : this._spendBoost(actor, a.boost, events);
    actor.ep -= s.cost;
    events.push({ type: 'ep', targetId: actor.id, amount: -s.cost, epAfter: actor.ep });
    const byHits = s.boostMode === 'hits';
    const potency = byHits ? 1 : BOOST_POTENCY[boost];
    const hits = byHits ? s.hits + boost : s.hits;
    const targets = this._skillTargets(actor, s, a.targetId);
    events.push({
      type: 'action', actorId: actor.id, kind: 'skill', name: s.name, anim: s.anim,
      damageType: s.type, targets: ids(targets), hits, boost, skillId: s.id,
    });
    const hittable = (t) => t.alive && !t.untargetable;
    switch (s.kind) {
      case 'attack':
        if (s.target === 'randomEnemies') {
          for (let i = 0; i < hits; i++) {
            const alive = targets.filter(hittable);
            if (!alive.length) break;
            const t = alive[Math.floor(this.rng() * alive.length)];
            this._hit(actor, t, s.type, s.power, s.scale, potency, i, hits, events);
          }
        } else {
          // wave-major: every target takes hit 1, then every target takes hit 2, ...
          for (let i = 0; i < hits; i++) {
            for (const t of targets) if (hittable(t)) this._hit(actor, t, s.type, s.power, s.scale, potency, i, hits, events);
          }
        }
        break;
      case 'heal':
        for (const t of targets) {
          if (!t.alive && s.effect?.revive) this._revive(t, s.effect.revive, events);
          if (!t.alive) continue;
          if (s.effect?.cleanse) this._cleanse(t, s.effect.cleanse, events);
          const amount = Math.round(this._stat(actor, 'mag') * s.power * 2.2 * (0.95 + this.rng() * 0.1) * potency);
          this._heal(t, amount, events);
        }
        break;
      case 'revive':
        this._revive(targets[0], Math.min(1, s.effect.revive * potency), events);
        break;
      default: // buff | debuff | taunt: boost extends the duration
        this._applyEffects(targets, s.effect, boost, events);
    }
  }

  _doItem(actor, a, events) {
    const it = ITEMS[a.itemId];
    const fx = it.effect || {};
    const targets = this._targets(actor, it.target, a.targetId);
    removeItem(it.id);
    events.push({
      type: 'action', actorId: actor.id, kind: 'item', name: it.name, anim: 'item',
      damageType: fx.damage ? fx.damage.type : null, targets: ids(targets), hits: fx.damage ? 1 : 0, boost: 0, itemId: it.id,
    });
    for (const t of targets) {
      if (fx.damage) {
        // fixed damage of that type; weaknesses, breaks and resists apply like any typed hit
        if (t.alive && !t.untargetable) this._hit(actor, t, fx.damage.type, 0, 'mag', 1, 0, 1, events, fx.damage.amount);
        continue;
      }
      if (fx.revive) this._revive(t, fx.revive, events);
      if (!t.alive) continue;
      if (fx.cleanse) this._cleanse(t, fx.cleanse, events);
      if (fx.heal) this._heal(t, fx.heal, events);
      if (fx.ep) {
        const before = t.ep;
        t.ep = Math.min(t.maxEp, t.ep + fx.ep);
        events.push({ type: 'ep', targetId: t.id, amount: t.ep - before, epAfter: t.ep });
      }
    }
  }

  // ---------------------------------------------------------------- ultimates

  _ultimateOf(c) {
    for (const id of c.skills) if (SKILLS[id]?.ultimate) return SKILLS[id];
    return null;
  }

  // ultimateReady: once per battle (again after rechargeUltimates), when the member can use theirs.
  _notifyUltimate(c, events) {
    if (this._readyNotified.has(c.id)) return;
    const s = this._ultimateOf(c);
    if (!s || c.ultimateUsed || c.buffs.jam || c.bp < BATTLE_RULES.ultimateBp || c.ep < s.cost) return;
    if (!this._skillTargets(c, s).length) return;
    this._readyNotified.add(c.id);
    events.push({ type: 'ultimateReady', memberId: c.id, skillId: s.id });
  }

  _grantUltimate(memberId, events) {
    const s = Object.values(SKILLS).find((sk) => sk.ultimate && sk.user === memberId);
    if (!s) {
      console.error(`battle: no ultimate defined for "${memberId}"`);
      return;
    }
    gameState.flags[`ult:${memberId}`] = true;
    const member = this._members.get(memberId) || gameState.roster?.[memberId];
    if (member && !member.skills.includes(s.id)) member.skills.push(s.id);
    const c = this.get(memberId);
    if (!c || c.side !== 'party') return; // not in this battle: the flag grants it on the next load
    if (!c.skills.includes(s.id)) c.skills.push(s.id);
    events.push({ type: 'learn', memberId, skillId: s.id, name: s.name, ultimate: true });
  }

  // ---------------------------------------------------------------- enemy AI

  enemyTurn() {
    const actor = this.current;
    if (!actor || this.phase !== 'enemyTurn') return [];
    const snapOrder = [...this.order];
    const snapNext = [...this.nextOrder];
    const events = [];
    this._withEvents(events, () => {
      const pick = this._chooseEnemyAction(actor);
      if (pick) this._resolveEnemyAction(actor, pick.action, pick.target, events, pick.override);
      else events.push({ type: 'message', text: `${actor.name} hesitates.` });
      this._endAction(actor, events, snapOrder, snapNext);
    });
    return events;
  }

  // AI dispatch: 'sentinel' (default only for a boss without a script) runs the POC boss path.
  _chooseEnemyAction(e) {
    const d = ENEMIES[e.key];
    const ai = d.ai || (d.boss && !d.script ? 'sentinel' : 'basic');
    return ai === 'sentinel' ? this._chooseSentinel(e, d) : this._chooseBasic(e, d);
  }

  // An enemy's action by id; a missing id is a content error (reported, never fatal).
  _action(e, id) {
    const act = ENEMIES[e.key].actions.find((a) => a.id === id);
    if (!act) console.error(`battle: ${e.key} has no action "${id}"`);
    return act || null;
  }

  _chooseSentinel(e, d) {
    const acts = d.actions;
    const byKind = (kind) => acts.find((a) => a.kind === kind);
    if (e.boss) {
      // Lock-On is the boss's last action of round R; the beam is its last action of round R+1,
      // so every traveler gets a turn to answer it (defend, heal, or break the boss to cancel it).
      const lastSlot = this.order.indexOf(e.id, 1) < 0;
      if (e.lockOnTarget && e.lockRound < this.round && lastSlot) {
        const locked = this.get(e.lockOnTarget);
        e.lockOnTarget = null;
        const fire = this._action(e, e.lockFires || 'annihilator_beam');
        e.lockFires = null;
        if (fire) return { action: fire, target: locked.alive ? locked : this._pickTarget(e, true) };
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

  // 'basic': pending charge / lock-on / `then`, then the script's chooseAction, then a gated weighted pick.
  _chooseBasic(e, d) {
    const lastSlot = this.order.indexOf(e.id, 1) < 0;
    if (e.charge && this.round >= e.charge.round && lastSlot) {
      const fire = this._action(e, e.charge.fires);
      e.charge = null;
      if (fire) return { action: fire, target: this._targetFor(e, fire) };
    }
    if (e.lockOnTarget && e.lockRound < this.round && lastSlot) {
      const locked = this.get(e.lockOnTarget);
      const fire = this._action(e, e.lockFires || 'annihilator_beam');
      e.lockOnTarget = null;
      e.lockFires = null;
      if (fire) return { action: fire, target: locked?.alive ? locked : this._pickTarget(e, true) };
    }
    if (e.then) {
      const act = this._action(e, e.then);
      e.then = null;
      if (act) return { action: act, target: this._targetFor(e, act) };
    }
    const pick = this._callScript(e, 'chooseAction', e);
    if (pick?.actionId) {
      const act = this._action(e, pick.actionId);
      if (act) {
        const t = pick.targetId ? this.get(pick.targetId) : null;
        return { action: act, target: t?.alive ? t : this._targetFor(e, act), override: pick.override };
      }
    }
    let pool = d.actions.filter((a) => a.weight > 0 && this._gatesPass(e, a));
    if (!pool.length) pool = d.actions.filter((a) => a.weight > 0 && this._safeFallback(e, a));
    if (!pool.length) return null;
    const action = this._weighted(pool, pool.map((a) => a.weight));
    return { action, target: this._targetFor(e, action) };
  }

  _gatesPass(e, a) {
    if (a.minRound && this.round < a.minRound) return false;
    if (a.hpBelow != null && !(e.hp < e.maxHp * a.hpBelow)) return false;
    if (a.cooldown && e.used[a.id] != null && this.round - e.used[a.id] <= a.cooldown) return false;
    switch (a.kind) {
      case 'buff': return a.target === 'self' || !a.target ? this._canSelfBuff(e, a) : this._buffTargets(e, a).length > 0;
      case 'heal': return this._healTargets(e, a).length > 0;
      case 'summon': return this._summonRoom() > 0;
      case 'lockOn': case 'charge': return !e.lockOnTarget && !e.charge;
      case 'submerge': return !e.untargetable;
      default: return true;
    }
  }

  // When every action is gated off, pick among the ones that cannot misfire (no summon without room).
  _safeFallback(e, a) {
    if (a.kind === 'summon') return this._summonRoom() > 0;
    if (a.kind === 'lockOn' || a.kind === 'charge') return !e.lockOnTarget && !e.charge;
    return true;
  }

  _canSelfBuff(e, a) {
    const stats = a.effect?.stats || [];
    return e.hp < e.maxHp * OVERCHARGE_HP && (!stats.length || stats.some((s) => !(e.buffs[s]?.stage > 0)));
  }

  _buffTargets(e, a) {
    const stats = a.effect?.stats || [];
    return this.enemies.filter((x) => x.alive && (!stats.length || stats.some((s) => !(x.buffs[s]?.stage > 0))));
  }

  _healTargets(e, a) {
    const hurt = (x) => x.alive && x.hp < x.maxHp;
    if (a.target === 'self' || !a.target) return hurt(e) ? [e] : [];
    return this.enemies.filter(hurt);
  }

  _summonRoom() {
    return Math.max(0, MAX_ENEMIES - this.enemies.filter((x) => x.alive).length);
  }

  // Target for an enemy action. 'one' and 'all' draw a party target (the POC consumes rng for both).
  _targetFor(e, act) {
    switch (act.target) {
      case 'self': return e;
      case 'allies': return e;
      case 'ally': {
        const pool = act.kind === 'heal' ? this._healTargets(e, act) : act.kind === 'buff' ? this._buffTargets(e, act) : [];
        const list = pool.length ? pool : this.enemies.filter((x) => x.alive);
        return list.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a), list[0]) || e;
      }
      default: return this._pickTarget(e, false);
    }
  }

  // Taunting members draw single-target attacks, then a marked member; otherwise wounded members are favoured.
  _pickTarget(e, ignoreTaunt) {
    const alive = this.party.filter((p) => p.alive);
    if (!ignoreTaunt) {
      const taunter = alive.find((p) => p.buffs.taunt);
      if (taunter) return taunter;
    }
    const marked = alive.find((p) => p.buffs.marked);
    if (marked) return marked;
    return this._weighted(alive, alive.map((p) => 1 + 1.5 * (1 - p.hp / p.maxHp)));
  }

  _resolveEnemyAction(e, act, target, events, override) {
    e.used[act.id] = this.round;
    switch (act.kind) {
      case 'lockOn': {
        events.push({
          type: 'action', actorId: e.id, kind: act.kind, name: act.name, anim: act.anim,
          damageType: act.type, targets: [target.id], hits: 0, actionId: act.id,
        });
        e.lockOnTarget = target.id;
        e.lockRound = this.round;
        e.lastLockRound = this.round;
        e.lockFires = act.fires || null;
        events.push({ type: 'telegraph', actorId: e.id, targetId: target.id, text: act.telegraph || `${e.name} locks on to ${target.name}!` });
        break;
      }
      case 'charge':
        events.push({
          type: 'action', actorId: e.id, kind: act.kind, name: act.name, anim: act.anim,
          damageType: act.type ?? null, targets: [], hits: 0, actionId: act.id,
        });
        e.charge = { fires: act.fires, round: this.round + (act.chargeRounds ?? 1) };
        events.push({ type: 'telegraph', actorId: e.id, targetId: null, text: act.telegraph || `${e.name} is charging...` });
        break;
      case 'summon': {
        const ev = {
          type: 'action', actorId: e.id, kind: act.kind, name: act.name, anim: act.anim,
          damageType: null, targets: [], hits: 0, actionId: act.id,
        };
        events.push(ev);
        const count = Math.min(act.summon?.count ?? 1, this._summonRoom());
        ev.targets = ids(this._spawnEnemies(act.summon?.kind, count, events));
        break;
      }
      case 'submerge':
        events.push({
          type: 'action', actorId: e.id, kind: act.kind, name: act.name, anim: act.anim,
          damageType: null, targets: [e.id], hits: 0, actionId: act.id,
        });
        this._setUntargetable(e, true, act.untargetable ?? 1, act.style || ENEMIES[e.key].untargetableStyle || 'submerge', events);
        break;
      case 'heal': {
        const targets = act.target === 'allies' ? this._healTargets(e, act) : [target?.alive ? target : e];
        events.push({
          type: 'action', actorId: e.id, kind: act.kind, name: act.name, anim: act.anim,
          damageType: null, targets: ids(targets), hits: 0, actionId: act.id,
        });
        for (const t of targets) {
          // act.heal: fraction of the target's max HP; otherwise MAG-based like a party heal
          const amount = act.heal != null
            ? Math.round(t.maxHp * act.heal)
            : Math.round(this._stat(e, 'mag') * (act.power || 1) * 2.2 * (0.95 + this.rng() * 0.1));
          this._heal(t, amount, events);
        }
        if (act.effect) this._applyEffects(targets, act.effect, 0, events);
        break;
      }
      default: { // attack | debuff | buff (buffs never damage the party)
        const type = override && 'type' in override ? override.type : act.type;
        const power = override?.power ?? act.power;
        const targets = act.target === 'all' ? this.party.filter((p) => p.alive)
          : act.target === 'allies' ? this.enemies.filter((x) => x.alive) : [target];
        const hits = power > 0 && act.kind !== 'buff' ? act.hits || 1 : 0;
        events.push({
          type: 'action', actorId: e.id, kind: act.kind, name: override?.name ?? act.name, anim: act.anim,
          damageType: type, targets: ids(targets), hits, actionId: act.id,
        });
        const scale = PHYSICAL.includes(type) ? 'atk' : 'mag';
        for (let i = 0; i < hits; i++) {
          for (const t of targets) if (t.alive) this._hit(e, t, type, power, scale, 1, i, hits, events);
        }
        if (act.effect) this._applyEffects(targets, act.effect, 0, events);
      }
    }
    if (act.then && e.alive) e.then = act.then;
  }

  // ---------------------------------------------------------------- mid-battle changes

  // Appends enemies with monotonic ids (never reused). They join the turn order next round; their
  // jitter is 1 in the current and the next jitter map, so no rng is drawn.
  _spawnEnemies(kind, count, events) {
    const d = ENEMIES[kind];
    if (!d) {
      console.error(`battle: cannot summon unknown enemy kind "${kind}"`);
      return [];
    }
    const out = [];
    for (let i = 0; i < count; i++) {
      const id = `e${this._nextEnemy++}`;
      const same = this.enemies.filter((x) => x.key === kind).length;
      const name = same === 0 && count === 1 ? d.name : `${d.name} ${String.fromCharCode(65 + same)}`;
      const c = this._makeEnemy(kind, id, name);
      this.enemies.push(c);
      this.combatants.push(c);
      this._byId.set(id, c);
      this._jitterNow?.set(id, 1);
      this._jitterNext?.set(id, 1);
      events.push({
        type: 'summon', targetId: id, kind, name: c.name, hp: c.hp, maxHp: c.maxHp,
        shield: c.shield, maxShield: c.maxShield, weakCount: c.weaknesses.length, revealed: [...c.revealed],
      });
      out.push(c);
    }
    return out;
  }

  // Swaps the def in place: full HP (or the same fraction with keepHp); breaks, lock-ons, charges,
  // pending actions, buffs and untargetability are cleared.
  _transform(c, kind, { keepHp = false } = {}, events) {
    if (!ENEMIES[kind]) {
      console.error(`battle: cannot transform into unknown enemy kind "${kind}"`);
      return false;
    }
    const frac = c.hp / c.maxHp;
    if (c.untargetable) this._setUntargetable(c, false, 0, null, events);
    const fresh = this._makeEnemy(kind, c.id, ENEMIES[kind].name);
    const thresholds = c.thresholdsFired;
    const used = c.used;
    Object.assign(c, fresh, { thresholdsFired: thresholds, used });
    if (keepHp) c.hp = clamp(Math.round(c.maxHp * frac), 1, c.maxHp);
    events.push({
      type: 'transform', targetId: c.id, kind, name: c.name, hp: c.hp, maxHp: c.maxHp,
      shield: c.shield, maxShield: c.maxShield, weakCount: c.weaknesses.length, revealed: [...c.revealed],
    });
    this._callScript(c, 'onTransform', c);
    return true;
  }

  // on: untargetable for the rest of this round plus `rounds` more (counted down at round start).
  _setUntargetable(c, on, rounds, style, events) {
    if (on) {
      const was = c.untargetable > 0;
      c.untargetable = Math.max(c.untargetable, rounds + 1);
      if (!was || c.untargetableStyle !== style) {
        c.untargetableStyle = style;
        events.push({ type: 'untargetable', targetId: c.id, on: true, style });
      }
    } else if (c.untargetable > 0 || c.untargetableStyle) {
      const was = c.untargetableStyle || 'submerge';
      c.untargetable = 0;
      c.untargetableStyle = null;
      events.push({ type: 'untargetable', targetId: c.id, on: false, style: was });
    }
  }

  _shiftWeaknesses(c, list, events) {
    c.weaknesses = [...list];
    c.revealed = [];
    events.push({ type: 'weakShift', targetId: c.id, weakCount: c.weaknesses.length, revealed: [] });
  }

  // weaknessPool + shiftOnRecover: the next set of the pool after each break recovery.
  _shiftOnRecover(c, events) {
    const d = ENEMIES[c.key];
    if (!d.shiftOnRecover || !d.weaknessPool?.length) return;
    c.weaknessIndex = (c.weaknessIndex + 1) % d.weaknessPool.length;
    this._shiftWeaknesses(c, d.weaknessPool[c.weaknessIndex], events);
  }

  // HP-fraction `phases` of the enemy def, then the script's thresholds (each fires once).
  _checkPhases(c, events) {
    const phases = ENEMIES[c.key].phases || [];
    for (let i = 0; i < phases.length; i++) {
      const ph = phases[i];
      if (c.phasesFired.includes(i) || c.hp > c.maxHp * ph.at) continue;
      c.phasesFired.push(i);
      if (ph.say) this._sayLines(ph.say, c, events);
      if (ph.transform) {
        this._transform(c, ph.transform, { keepHp: !!ph.keepHp }, events);
        return;
      }
    }
    const s = this._scriptOf(c);
    if (!s?.thresholds?.length) return;
    const fired = (c.thresholdsFired[c.script] ||= []);
    for (const f of [...s.thresholds].sort((a, b) => b - a)) {
      if (fired.includes(f) || c.hp > c.maxHp * f) continue;
      fired.push(f);
      this._callScript(c, 'onThreshold', c, f);
      if (!c.alive) return;
    }
  }

  // True while an enemy still has an unfired HP phase or script threshold.
  _pendingBeat(c) {
    const phases = ENEMIES[c.key].phases || [];
    if (phases.some((_, i) => !c.phasesFired.includes(i))) return true;
    const s = this._scriptOf(c);
    const fired = c.thresholdsFired[c.script] || [];
    return !!s?.thresholds?.some((f) => !fired.includes(f));
  }

  // An enemy at 0 HP survives when its script's onDefeat returns true or its def transforms instead.
  _preventDefeat(t, events) {
    if (this._callScript(t, 'onDefeat', t) === true) {
      if (t.hp <= 0) t.hp = 1;
      return true;
    }
    const od = ENEMIES[t.key].onDefeat;
    if (!od?.transform) return false;
    if (od.say) this._sayLines(od.say, t, events);
    t.hp = 1;
    return this._transform(t, od.transform, { keepHp: false }, events);
  }

  // ---------------------------------------------------------------- effects

  // fixed: a set amount instead of the ATK/MAG formula (item damage): no roll, no crit.
  _hit(attacker, target, type, power, scale, potency, hitIndex, hitCount, events, fixed = 0) {
    const physical = scale === 'atk';
    let dmg;
    let crit = false;
    if (fixed) dmg = fixed * potency;
    else {
      const atk = this._stat(attacker, physical ? 'atk' : 'mag');
      const def = this._stat(target, physical ? 'def' : 'res');
      dmg = Math.max(1, (atk * power * 2.2 - def * 1.1) * (0.92 + this.rng() * 0.16)) * potency;
    }
    const weak = !!type && target.weaknesses.includes(type);
    const broken = target.broken;
    if (!fixed) crit = physical && this.rng() < CRIT_CHANCE;
    if (attacker.side === 'enemy' && this.dmgMult !== 1) dmg *= this.dmgMult;
    const boost = attacker.mods?.boost?.[type];
    if (boost) dmg *= 1 + boost;
    const resist = target.mods?.resist?.[type];
    if (resist) dmg *= 1 - resist;
    const rt = target.rtResist?.[type];
    if (rt) dmg *= rt.mult;
    if (weak) dmg *= WEAK_MULT;
    if (broken) dmg *= BREAK_MULT;
    if (crit) dmg *= CRIT_MULT;
    if (target.defending) dmg *= DEFEND_MULT;
    let amount = clamp(Math.round(dmg), 1, DAMAGE_CAP);
    let saved = false;
    if (target.protect > 0 && amount >= target.hp) {
      amount = target.hp - 1; // the protected lethal hit leaves 1 HP
      target.protect -= 1;
      saved = true;
    } else if (amount >= target.hp && target.side === 'enemy' && this._pendingBeat(target)) {
      // Beat guard: a blow that would kill an enemy before its unfired phases or script thresholds
      // leaves it at 1 HP, so story beats (transforms, ultimate awakenings) always play.
      amount = Math.max(0, target.hp - 1);
    }
    target.hp = Math.max(0, target.hp - amount);
    events.push({
      type: 'hit', actorId: attacker.id, targetId: target.id, damageType: type, amount, crit, weak, broken,
      hpAfter: target.hp, hitIndex, hitCount,
    });
    if (saved) events.push({ type: 'cue', name: 'protected', targetId: target.id });
    if (attacker.side === 'party' && amount > gameState.stats.maxDamage) gameState.stats.maxDamage = amount;
    if (weak && !target.revealed.includes(type)) this._reveal(target, type, events);
    if (target.hp > 0 && target.buffs.sleep) {
      delete target.buffs.sleep; // any damage wakes a sleeper
      events.push({ type: 'status', targetId: target.id, stat: 'sleep', stage: 0, turns: 0 });
    }
    if (target.hp <= 0) {
      if (!(target.side === 'enemy' && this._preventDefeat(target, events))) this._ko(target, events);
    } else {
      if (weak && !broken && target.shield > 0) {
        target.shield -= 1;
        events.push({ type: 'shield', targetId: target.id, shield: target.shield, maxShield: target.maxShield });
        if (target.shield === 0) this._break(target, events);
      }
      if (target.side === 'enemy' && target.alive) this._checkPhases(target, events);
    }
    this._callScripts('onHit', { attackerId: attacker.id, targetId: target.id, type, amount, weak, ...(saved ? { protected: true } : {}) });
  }

  // A reveal also reveals the weakness on living enemies of the same kind (POC review R18).
  _reveal(target, type, events) {
    target.revealed.push(type);
    const known = (gameState.bestiary[target.key] ||= []);
    if (!known.includes(type)) known.push(type);
    events.push({ type: 'reveal', targetId: target.id, damageType: type });
    if (target.side !== 'enemy') return;
    for (const o of this.enemies) {
      if (o === target || !o.alive || o.key !== target.key || !o.weaknesses.includes(type) || o.revealed.includes(type)) continue;
      o.revealed.push(type);
      events.push({ type: 'reveal', targetId: o.id, damageType: type });
    }
  }

  _break(t, events) {
    t.broken = true;
    t.breakRounds = BREAK_ROUNDS;
    gameState.stats.breaks += 1;
    events.push({ type: 'break', targetId: t.id });
    if (t.lockOnTarget) {
      t.lockOnTarget = null;
      t.lockFires = null;
      events.push({ type: 'message', text: `${t.name}'s lock-on was disrupted!` });
    }
    if (t.charge) {
      t.charge = null;
      events.push({ type: 'message', text: `${t.name}'s charge was disrupted!` });
    }
    if (t.side === 'enemy') {
      t.then = null;
      this._callScript(t, 'onBreak', t);
    }
  }

  _ko(t, events) {
    t.alive = false;
    t.hp = 0;
    t.defending = false;
    t.buffs = {};
    t.lockOnTarget = null;
    t.protect = 0;
    if (t.side === 'enemy') {
      t.lockFires = null;
      t.charge = null;
      t.then = null;
      t.untargetable = 0;
      t.untargetableStyle = null;
    }
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
    // An enemy still locked on fires at the revived member: show the lock again (POC review R16).
    for (const e of this.enemies) {
      if (e.alive && e.lockOnTarget === t.id) {
        events.push({ type: 'telegraph', actorId: e.id, targetId: t.id, text: `${e.name} is still locked on to ${t.name}!` });
      }
    }
  }

  // One stat of a status effect. Stages stack within -2..+2; turns refresh to the longer duration;
  // taunt and the ailments always sit at stage 1.
  _setStatus(t, stat, effStage, effTurns, extraTurns, events) {
    const cur = t.buffs[stat];
    const stage = STAGE_ONE.has(stat) ? 1 : clamp((cur ? cur.stage : 0) + effStage, -2, 2);
    const turns = Math.max(cur ? cur.turns : 0, effTurns + extraTurns);
    if (stage === 0) {
      delete t.buffs[stat];
      events.push({ type: 'status', targetId: t.id, stat, stage: 0, turns: 0 });
    } else {
      t.buffs[stat] = { stage, turns };
      events.push({ type: 'status', targetId: t.id, stat, stage, turns });
    }
  }

  // effect: { stats, stage, turns, chance?, limit?, cleanse? }. `chance` (and the target's
  // ailmentResist) roll one rng() per target only when present; `immune` blocks ailments;
  // `limit` caps how many targets receive an ailment (in target order).
  _applyEffects(targets, effect, extraTurns, events) {
    if (!effect) return;
    const stats = effect.stats || [];
    let landed = 0;
    for (const t of targets) {
      if (!t.alive) continue;
      if (effect.cleanse) this._cleanse(t, effect.cleanse, events);
      if (!stats.length) continue;
      const res = t.mods?.ailmentResist || {};
      const ailing = stats.filter((s) => isAilment(s) && !(t.mods?.immune || []).includes(s));
      const capped = effect.limit != null && landed >= effect.limit;
      const needsRoll = effect.chance != null || ailing.some((s) => res[s] > 0);
      const r = needsRoll ? this.rng() : 0;
      const chance = effect.chance ?? 1;
      let gotAilment = false;
      for (const stat of stats) {
        if (isAilment(stat)) {
          if (!ailing.includes(stat) || capped || r >= chance * (1 - (res[stat] || 0))) continue;
          gotAilment = true;
        } else if (r >= chance) continue;
        this._setStatus(t, stat, effect.stage ?? 0, effect.turns ?? 1, extraTurns, events);
      }
      if (gotAilment) landed++;
    }
  }

  // spec: true (sleep, jam, marked and negative stages) or a list of statuses to remove.
  _cleanse(t, spec, events) {
    for (const stat of Object.keys(t.buffs)) {
      const listed = Array.isArray(spec) ? spec.includes(stat) : isAilment(stat);
      const negative = t.buffs[stat].stage < 0;
      const remove = Array.isArray(spec)
        ? listed && (isAilment(stat) || stat === 'taunt' || negative)
        : listed || negative;
      if (!remove) continue;
      delete t.buffs[stat];
      events.push({ type: 'status', targetId: t.id, stat, stage: 0, turns: 0 });
    }
  }

  _sayLines(lines, c, events) {
    for (const line of lines) {
      if (typeof line === 'string') events.push({ type: 'say', speaker: c.name, text: line });
      else events.push(this._sayEvent(line.speaker ?? c.name, line.text, line));
    }
  }

  _sayEvent(speaker, text, { portrait, expr } = {}) {
    const ev = { type: 'say', speaker, text };
    const base = portrait || (expr ? String(speaker).toLowerCase() : null);
    if (base) ev.portrait = expr && !String(base).includes(':') ? `${base}:${expr}` : base;
    return ev;
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

  // ---------------------------------------------------------------- boss scripts

  _withEvents(events, fn) {
    const prev = this._ev;
    this._ev = events;
    try {
      return fn();
    } finally {
      this._ev = prev;
    }
  }

  _scriptOf(c) {
    if (!c.script) return null;
    const s = BOSS_SCRIPTS[c.script];
    if (!s && !this._warned.has(c.script)) {
      this._warned.add(c.script);
      console.error(`battle: unknown boss script "${c.script}" (${c.key})`);
    }
    return s || null;
  }

  _invoke(scriptId, script, hook, args) {
    const fn = script?.[hook];
    if (typeof fn !== 'function' || this._hookDepth >= HOOK_DEPTH) return undefined;
    this._hookDepth++;
    const prevMem = this.api.mem;
    this.api.mem = (this._mems[scriptId] ||= {});
    try {
      return fn.call(script, this.api, ...args);
    } catch (err) {
      console.error(`battle: boss script "${scriptId}" ${hook} failed`, err);
      return undefined;
    } finally {
      this.api.mem = prevMem;
      this._hookDepth--;
    }
  }

  // Hooks with an enemy argument run per enemy.
  _callScript(c, hook, ...args) {
    const s = this._scriptOf(c);
    return s ? this._invoke(c.script, s, hook, args) : undefined;
  }

  // Hooks without an enemy argument (onBegin, onRoundStart, onPartyAction, onHit) run once per
  // script among the living enemies.
  _callScripts(hook, ...args) {
    const seen = new Set();
    for (const e of [...this.enemies]) {
      if (!e.alive || !e.script || seen.has(e.script)) continue;
      seen.add(e.script);
      const s = this._scriptOf(e);
      if (s) this._invoke(e.script, s, hook, args);
    }
  }

  // The api a BossScript receives (TECH_PLAN 7.3). Every method appends events to the list being built.
  _makeApi() {
    const m = this;
    const ev = () => m._ev || [];
    const enemyById = (id) => {
      const c = m.get(id);
      return c && c.side === 'enemy' ? c : null;
    };
    return {
      get round() { return m.round; },
      get rng() { return m.rng; },
      mem: null,
      enemy(idOrKind) {
        return enemyById(idOrKind) || m.enemies.find((e) => e.key === idOrKind && e.alive)
          || m.enemies.find((e) => e.key === idOrKind) || null;
      },
      enemies() { return m.enemies.filter((e) => e.alive); },
      party() { return m.party.filter((p) => p.alive); },
      member(id) { return m.party.find((p) => p.id === id) || null; },
      say(speaker, text, opts = {}) { ev().push(m._sayEvent(speaker, text, opts)); },
      message(text) { ev().push({ type: 'message', text }); },
      cue(name, { targetId, value } = {}) {
        const e = { type: 'cue', name };
        if (targetId !== undefined) e.targetId = targetId;
        if (value !== undefined) e.value = value;
        ev().push(e);
      },
      transform(enemyId, kind, { keepHp = false } = {}) {
        const c = enemyById(enemyId);
        return c?.alive ? m._transform(c, kind, { keepHp }, ev()) : false;
      },
      summon(kind, { count = 1 } = {}) {
        return ids(m._spawnEnemies(kind, Math.min(count, m._summonRoom()), ev()));
      },
      setUntargetable(enemyId, on, { rounds = 1, style = 'submerge' } = {}) {
        const c = enemyById(enemyId);
        if (c?.alive) m._setUntargetable(c, on, rounds, style, ev());
      },
      // map values are damage multipliers (0.5 = half damage of that type), for the rest of this
      // round plus `rounds` more; emits cue 'resist' (value null when it wears off)
      setResist(id, map, { rounds = 1 } = {}) {
        const c = m.get(id);
        if (!c?.alive) return;
        for (const [type, mult] of Object.entries(map)) c.rtResist[type] = { mult, rounds: rounds + 1 };
        ev().push({ type: 'cue', name: 'resist', targetId: c.id, value: { ...map } });
      },
      shiftWeaknesses(enemyId, list) {
        const c = enemyById(enemyId);
        if (c?.alive) m._shiftWeaknesses(c, list, ev());
      },
      heal(id, amount) {
        const c = m.get(id);
        if (c?.alive) m._heal(c, Math.round(amount), ev());
      },
      status(id, effect) {
        const c = m.get(id);
        if (c?.alive) m._applyEffects([c], effect, 0, ev());
      },
      cleanse(idOrParty, stats) {
        const list = idOrParty === 'party' ? m.party.filter((p) => p.alive) : [m.get(idOrParty)].filter((c) => c?.alive);
        for (const c of list) m._cleanse(c, stats || true, ev());
      },
      protect(memberId, { hits = 1 } = {}) {
        const c = m.get(memberId);
        if (!c) return;
        c.protect = (c.protect || 0) + hits;
        ev().push({ type: 'cue', name: 'protect', targetId: c.id });
      },
      telegraph(enemyId, targetId, text) {
        ev().push({ type: 'telegraph', actorId: enemyId, targetId: targetId ?? null, text });
      },
      useAction(enemyId, actionId, targetId) {
        const e = enemyById(enemyId);
        const act = e?.alive ? m._action(e, actionId) : null;
        if (!act) return;
        const t = targetId ? m.get(targetId) : null;
        m._resolveEnemyAction(e, act, t?.alive ? t : m._targetFor(e, act), ev());
        m._syncParty();
      },
      grantUltimate(memberId) { m._grantUltimate(memberId, ev()); },
      rechargeUltimates() {
        for (const p of m.party) p.ultimateUsed = false;
        m._readyNotified.clear();
        ev().push({ type: 'cue', name: 'ultimatesRecharged' });
      },
    };
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
        xp += d.xp || 0;
        credits += d.credits || 0;
        for (const drop of d.drops || []) if (this.rng() < drop.chance) items[drop.id] = (items[drop.id] || 0) + drop.n;
      }
      this._rewards = { xp, credits, items: Object.entries(items).map(([id, n]) => ({ id, n })) };
    }
    const r = this._rewards;
    return { xp: r.xp, credits: r.credits, items: r.items.map((it) => ({ ...it })), epRecovery: VICTORY_EP_RECOVERY };
  }

  // Living members gain the full xp (Octopath rule: KO'd members gain none) and recharge
  // VICTORY_EP_RECOVERY of their max EP. Safe to call more than once (applies once).
  // Skills learned by campaign members follow every levelUp event as `learn` events.
  applyRewards() {
    if (this.result !== 'victory' || this._rewardsApplied) return [];
    this._rewardsApplied = true;
    const r = this.rewards();
    gameState.credits += r.credits;
    for (const it of r.items) addItem(it.id, it.n);
    const events = [];
    const learned = [];
    for (const c of this.party) {
      if (!c.alive) continue;
      const m = this._members.get(c.id);
      m.ep = Math.min(m.maxEp, m.ep + Math.round(m.maxEp * VICTORY_EP_RECOVERY));
      for (const up of gainXp(m, r.xp)) {
        events.push({ type: 'levelUp', memberId: m.id, name: m.name, level: up.level, gains: up.gains });
        for (const skillId of up.learned || []) {
          learned.push({ type: 'learn', memberId: m.id, skillId, name: SKILLS[skillId]?.name || skillId });
        }
      }
      Object.assign(c, { level: m.level, hp: m.hp, maxHp: m.maxHp, ep: m.ep, maxEp: m.maxEp, stats: { ...m.stats } });
      if (m.campaign) c.skills = [...m.skills];
    }
    events.push(...learned);
    return events;
  }
}
