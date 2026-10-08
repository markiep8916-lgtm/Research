// Human-like battle policy (TECH_PLAN 10.4). Plain ES module with no node imports, so the balance
// simulator (tests/simulate.mjs, tests/campaign.mjs) and the browser debug hook
// (__VP.debug.autoResolve('policy')) share it.
//
//   policyAction(model, actorId, memo = new Map()) -> action for model.act()
//   observe(memo, events)        learn from events: types that hit an enemy without a weakness,
//                                forgotten again when that enemy's weaknesses shift or it transforms
//   createPolicy() -> (model, actorId) => action   stateful: infers what it learned from the model
//                                (revealed weaknesses) when nobody calls observe()
//
// It plays like a person: it knows only revealed weaknesses (the bestiary starts empty for new
// kinds) and probes untried types; targets only validTargets and defends when there are none;
// defends against telegraphs aimed at it (lock-on) or at everyone (charge); revives, cures sleepers
// and heals; Provokes when an ally is marked; spends Boost on broken foes or to finish a break; and
// saves its ultimate for a Break (Lifebloom for a downed or battered squad).

import { SKILLS } from '../src/battle/data.js';
import { BOOST_POTENCY } from '../src/battle/model.js';

const hpFrac = (c) => c.hp / c.maxHp;

// Rough expected damage of one hit (the model's formula without randomness), from known facts only.
function estHit(m, actor, target, type, power, scale) {
  const physical = scale === 'atk';
  const atk = m.effectiveStat(actor.id, physical ? 'atk' : 'mag');
  const def = m.effectiveStat(target.id, physical ? 'def' : 'res');
  let d = Math.max(1, atk * power * 2.2 - def * 1.1);
  if (target.revealed.includes(type)) d *= 1.3;
  if (target.broken) d *= 2;
  return d;
}

export function observe(memo, events) {
  for (const ev of events) {
    if ((ev.type === 'weakShift' || ev.type === 'transform') && memo.has(ev.targetId)) memo.delete(ev.targetId);
    if (ev.type !== 'hit' || ev.weak || !ev.damageType || !String(ev.targetId).startsWith('e')) continue;
    if (!memo.has(ev.targetId)) memo.set(ev.targetId, new Set());
    memo.get(ev.targetId).add(ev.damageType);
  }
  return memo;
}

// Best damaging option: every (weapon or attack skill, target, boost) is scored by expected damage,
// shield progress and the value of probing an untested type, minus EP and BP spent.
function bestOffense(m, actor, menu, foes, memo) {
  const options = [];
  for (const w of menu.weapons) options.push({ kind: 'attack', weapon: w, type: w, power: 1, hits: 1, scale: 'atk', aoe: false, cost: 0, byHits: true });
  for (const s of menu.skills) {
    if (!s.usable || s.kind !== 'attack' || s.ultimate) continue;
    const d = SKILLS[s.id];
    options.push({ kind: 'skill', skillId: s.id, type: d.type, power: d.power, hits: d.hits, scale: d.scale,
      aoe: d.target === 'enemies' || d.target === 'randomEnemies', cost: d.cost, byHits: d.boostMode === 'hits' });
  }
  const bp = m.maxBoost(actor.id);
  let best = null;
  for (const o of options) {
    for (const t of o.aoe ? [null] : foes) {
      const targets = o.aoe ? foes : [t];
      for (let b = 0; b <= bp; b++) {
        const hits = o.byHits ? o.hits + b : o.hits;
        const potency = o.byHits ? 1 : BOOST_POTENCY[b];
        let score = 0;
        for (const e of targets) {
          const known = e.revealed.includes(o.type);
          const notWeak = memo.get(e.id)?.has(o.type);
          score += Math.min(estHit(m, actor, e, o.type, o.power, o.scale) * hits * potency, e.hp * 1.1);
          if (e.broken) continue;
          if (known) {
            const shieldHits = Math.min(hits, e.shield);
            score += shieldHits * 60;
            if (shieldHits >= e.shield) score += 260 + (e.charge || e.lockOnTarget ? 400 : 0); // breaks now (and cancels a telegraph)
          } else if (!notWeak) score += 90 * hits; // probe an untested type
        }
        score -= o.cost * 4;
        score -= b * (bp >= 4 ? 30 : 95); // BP is worth saving unless the pool is about to cap
        if (!best || score > best.score) best = { score, o, t, b };
      }
    }
  }
  if (!best) return null;
  const { o, t, b } = best;
  if (o.kind === 'attack') return { kind: 'attack', weapon: o.weapon, targetId: t.id, boost: b };
  return { kind: 'skill', skillId: o.skillId, targetId: t ? t.id : undefined, boost: b };
}

export function policyAction(m, actorId, memo = new Map()) {
  const actor = m.get(actorId);
  const menu = m.getMenu(actorId);
  const foes = m.validTargets(actorId, 'enemy').map((id) => m.get(id));
  const allies = m.party.filter((p) => p.alive);
  const ko = m.party.filter((p) => !p.alive);
  const skill = (id) => menu.skills.find((s) => s.id === id && s.usable);
  const firstSkill = (pred) => menu.skills.find((s) => s.usable && pred(SKILLS[s.id], s));
  const item = (id) => menu.items.find((it) => it.id === id && it.usable);
  const lowest = allies.reduce((a, b) => (hpFrac(a) <= hpFrac(b) ? a : b));
  const healerUp = allies.some((p) => p.skills.some((id) => SKILLS[id]?.kind === 'heal' && !SKILLS[id].ultimate));
  const ult = menu.skills.find((s) => s.ultimate && s.usable);
  const brokenFoe = foes.find((e) => e.broken);
  const threats = m.enemies.filter((e) => e.alive && !e.broken);

  // Telegraphs: defend when a lock-on is aimed at me or a charge will hit everyone.
  if (threats.some((e) => e.lockOnTarget === actorId) && hpFrac(actor) < 0.95) return { kind: 'defend' };
  if (threats.some((e) => e.charge) && hpFrac(actor) < 0.85) return { kind: 'defend' };

  // Downed and sleeping allies first.
  if (ult && SKILLS[ult.id].kind === 'heal' && (ko.length || allies.filter((p) => hpFrac(p) < 0.5).length >= 2)) {
    return { kind: 'skill', skillId: ult.id };
  }
  if (ko.length) {
    const reviver = firstSkill((d) => d.kind === 'revive');
    if (reviver) return { kind: 'skill', skillId: reviver.id, targetId: ko[0].id, boost: Math.min(1, m.maxBoost(actorId)) };
    if (!healerUp || hpFrac(actor) > 0.5) {
      const kit = item('revive_plus') || item('revive');
      if (kit) return { kind: 'item', itemId: kit.id, targetId: ko[0].id };
    }
  }
  const sleepers = allies.filter((p) => p.buffs.sleep);
  if (sleepers.length) {
    const cure = firstSkill((d) => d.kind === 'heal' && d.effect?.cleanse && d.target === 'allies');
    if (cure) return { kind: 'skill', skillId: cure.id };
    if (item('stim')) return { kind: 'item', itemId: 'stim', targetId: sleepers[0].id };
  }
  if (actor.buffs.jam && item('stim')) return { kind: 'item', itemId: 'stim', targetId: actorId };

  // Healing.
  const hurt = allies.filter((p) => hpFrac(p) < 0.55);
  const groupHeal = firstSkill((d) => d.kind === 'heal' && d.target === 'allies' && !d.effect?.cleanse);
  if (hurt.length >= 2 && groupHeal) return { kind: 'skill', skillId: groupHeal.id, boost: Math.min(hurt.length >= 3 ? 2 : 1, m.maxBoost(actorId)) };
  const single = firstSkill((d) => d.kind === 'heal' && d.target === 'ally');
  if (hpFrac(lowest) < 0.4 && single) return { kind: 'skill', skillId: single.id, targetId: lowest.id, boost: hpFrac(lowest) < 0.25 ? Math.min(2, m.maxBoost(actorId)) : 0 };
  if (hpFrac(lowest) < (healerUp ? 0.2 : 0.4)) {
    const gel = item('medigel_max') || item('medigel_plus') || item('medigel');
    if (gel) return { kind: 'item', itemId: gel.id, targetId: lowest.id };
  }

  // Provoke when an ally is marked.
  const markedAlly = allies.some((p) => p.id !== actorId && p.buffs.marked);
  if (markedAlly && !actor.buffs.taunt && hpFrac(actor) > 0.5) {
    const taunt = firstSkill((d) => d.kind === 'taunt');
    if (taunt) return { kind: 'skill', skillId: taunt.id };
  }

  if (!foes.length) return { kind: 'defend' };

  // Ultimates go on a Break.
  if (ult && brokenFoe && SKILLS[ult.id].kind === 'attack') return { kind: 'skill', skillId: ult.id, targetId: brokenFoe.id };

  // Support moves against bosses.
  const boss = foes.find((e) => e.boss);
  if (boss && !boss.broken) {
    if (!actor.buffs.taunt && hpFrac(actor) > 0.55 && m.round % 3 === 1) {
      const provoke = firstSkill((d) => d.kind === 'taunt');
      if (provoke) return { kind: 'skill', skillId: provoke.id };
    }
    const expose = firstSkill((d) => d.kind === 'debuff' && d.target === 'enemy');
    if (expose && !boss.buffs.def) return { kind: 'skill', skillId: expose.id, targetId: boss.id };
    const ally = firstSkill((d) => d.kind === 'buff' && d.target === 'ally');
    const carry = allies.find((p) => p.id !== actorId && !p.buffs.atk && p.stats.atk >= p.stats.mag);
    if (ally && carry && actor.ep > 40) return { kind: 'skill', skillId: ally.id, targetId: carry.id };
  }

  return bestOffense(m, actor, menu, foes, memo) || { kind: 'defend' };
}

// A policy that keeps its own knowledge per battle model. Without observe() calls it infers what an
// attack taught it: a type that hit a foe and was not revealed is not a weakness of that foe.
export function createPolicy() {
  const states = new WeakMap();
  const fn = (m, actorId) => {
    let st = states.get(m);
    if (!st) states.set(m, (st = { memo: new Map(), last: [], seen: new Map() }));
    for (const e of m.enemies) {
      const prev = st.seen.get(e.id);
      if (prev && (prev.key !== e.key || e.revealed.length < prev.revealed)) st.memo.delete(e.id);
      st.seen.set(e.id, { key: e.key, revealed: e.revealed.length });
    }
    if (!fn.observed) {
      for (const { id, type } of st.last) {
        const e = m.get(id);
        if (!e || !e.alive || e.revealed.includes(type)) continue;
        if (!st.memo.has(id)) st.memo.set(id, new Set());
        st.memo.get(id).add(type);
      }
    }
    const a = { actorId, ...policyAction(m, actorId, st.memo) };
    const type = a.kind === 'attack' ? a.weapon : a.kind === 'skill' ? SKILLS[a.skillId]?.type : null;
    const target = a.kind === 'skill' ? SKILLS[a.skillId]?.target : 'enemy';
    st.last = !type || target === 'randomEnemies' ? []
      : target === 'enemies' ? m.validTargets(actorId, 'enemy').map((id) => ({ id, type })) : [{ id: a.targetId, type }];
    return a;
  };
  fn.observed = false;
  fn.observe = (m, events) => {
    fn.observed = true;
    const st = states.get(m);
    if (st) observe(st.memo, events);
  };
  return fn;
}
