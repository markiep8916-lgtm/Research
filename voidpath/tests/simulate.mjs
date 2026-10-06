// Balance simulation: plays every encounter many times with a heuristic player policy and a random
// policy (both seeded) and prints win rate and battle length, then plays whole campaigns (chained
// fights with no healing in between, xp and drops carried over) ending with the boss. Not a unit test.
//
//   node tests/simulate.mjs [battlesPerEncounter=300] [--level-bonus N]

import { BattleModel, BOOST_POTENCY } from '../src/battle/model.js';
import { ENCOUNTERS, ENCOUNTER_TABLES, SKILLS } from '../src/battle/data.js';
import { gameState, resetGame, healParty, gainXp, xpToNext, useItemOutOfBattle } from '../src/core/state.js';
import { makeRng } from '../src/core/util.js';

const N = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 300;
const lvlArg = process.argv.indexOf('--level-bonus');
const LEVEL_BONUS = lvlArg > 0 ? Number(process.argv[lvlArg + 1]) : 0;
const MAX_ROUNDS = 40;

const alive = (list) => list.filter((c) => c.alive);
const hpFrac = (c) => c.hp / c.maxHp;

// Rough expected damage of one hit (mirrors the model's formula without randomness). The policy only
// knows revealed weaknesses, never the hidden list.
function estHit(m, actor, target, type, power, scale) {
  const physical = scale === 'atk';
  const atk = m.effectiveStat(actor.id, physical ? 'atk' : 'mag');
  const def = m.effectiveStat(target.id, physical ? 'def' : 'res');
  let d = Math.max(1, atk * power * 2.2 - def * 1.1);
  if (target.revealed.includes(type)) d *= 1.3;
  if (target.broken) d *= 2;
  return d;
}

// ------------------------------------------------------------------ heuristic policy
// Knowledge: revealed weaknesses + types this policy already tried that proved not weak (memo).
// It exploits known weaknesses, probes untried types, boosts into broken foes or to finish a break,
// heals below 40%, revives, and handles the boss telegraph (defend) with Provoke/Expose/Overclock support.
function heuristic(m, actor, memo) {
  const foes = alive(m.enemies);
  const allies = alive(m.party);
  const menu = m.getMenu(actor.id);
  const skill = (id) => menu.skills.find((s) => s.id === id && s.usable);
  const item = (id) => menu.items.find((it) => it.id === id && it.usable);
  const boss = m.enemies.find((e) => e.boss && e.alive);
  const ko = m.party.filter((p) => !p.alive);
  const lowest = allies.reduce((a, b) => (hpFrac(a) <= hpFrac(b) ? a : b));
  const seraUp = allies.some((p) => p.key === 'sera');

  // Survival first.
  if (boss && boss.lockOnTarget === actor.id && !boss.broken && hpFrac(actor) < 0.95) return { kind: 'defend' };
  if (actor.key === 'sera') {
    if (ko.length && skill('revive')) return { kind: 'skill', skillId: 'revive', targetId: ko[0].id, boost: Math.min(1, m.maxBoost(actor.id)) };
    const hurt = allies.filter((p) => hpFrac(p) < 0.55);
    if (hurt.length >= 2 && skill('restore_field')) return { kind: 'skill', skillId: 'restore_field', boost: Math.min(hurt.length >= 3 ? 2 : 1, m.maxBoost(actor.id)) };
    if (hpFrac(lowest) < 0.4 && skill('nanoheal')) return { kind: 'skill', skillId: 'nanoheal', targetId: lowest.id, boost: hpFrac(lowest) < 0.25 ? Math.min(2, m.maxBoost(actor.id)) : 0 };
  } else {
    if (ko.length && !seraUp && item('revive')) return { kind: 'item', itemId: 'revive', targetId: ko[0].id };
    if (hpFrac(lowest) < (seraUp ? 0.2 : 0.4) && item('medigel')) return { kind: 'item', itemId: 'medigel', targetId: lowest.id };
  }

  // Support moves, mostly for the boss.
  if (boss && !boss.broken) {
    if (actor.key === 'kade' && !actor.buffs.taunt && hpFrac(actor) > 0.55 && skill('provoke') && m.round % 3 === 1) {
      return { kind: 'skill', skillId: 'provoke' };
    }
    if (actor.key === 'nyx' && !boss.buffs.def && skill('expose')) return { kind: 'skill', skillId: 'expose', targetId: boss.id };
  }
  if (boss && actor.key === 'orion' && skill('overclock')) {
    const carry = allies.find((p) => (p.key === 'kade' || p.key === 'nyx') && !p.buffs.atk);
    if (carry && actor.ep > 40) return { kind: 'skill', skillId: 'overclock', targetId: carry.id };
  }

  // Offense: score every (option, target, boost) and take the best.
  const options = [];
  for (const w of menu.weapons) options.push({ kind: 'attack', weapon: w, type: w, power: 1, hits: 1, scale: 'atk', aoe: false, cost: 0, byHits: true });
  for (const s of menu.skills) {
    if (!s.usable || s.kind !== 'attack') continue;
    const d = SKILLS[s.id];
    options.push({ kind: 'skill', skillId: s.id, type: d.type, power: d.power, hits: d.hits, scale: d.scale, aoe: d.target === 'enemies', cost: d.cost, byHits: d.boostMode === 'hits' });
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
          const dmg = estHit(m, actor, e, o.type, o.power, o.scale) * hits * potency;
          score += Math.min(dmg, e.hp * 1.1);
          if (!e.broken) {
            if (known) {
              const shieldHits = Math.min(hits, e.shield);
              score += shieldHits * 60;
              if (shieldHits >= e.shield) score += 260; // breaks now
            } else if (!notWeak) score += 90 * hits; // probe an untested type
          }
        }
        score -= o.cost * 4;
        // BP is worth saving unless the target is broken or the pool is about to cap.
        score -= b * (bp >= 4 ? 30 : 95);
        if (!best || score > best.score) best = { score, o, t, b };
      }
    }
  }
  const { o, t, b } = best;
  if (o.kind === 'attack') return { kind: 'attack', weapon: o.weapon, targetId: t.id, boost: b };
  return { kind: 'skill', skillId: o.skillId, targetId: t ? t.id : undefined, boost: b };
}

// ------------------------------------------------------------------ random policy
function randomPolicy(m, actor, _memo, prng) {
  const menu = m.getMenu(actor.id);
  const foes = alive(m.enemies);
  const choices = ['attack', 'attack', 'skill', 'skill', 'defend'];
  const kind = choices[Math.floor(prng() * choices.length)];
  const boost = Math.floor(prng() * (m.maxBoost(actor.id) + 1));
  if (kind === 'skill') {
    const usable = menu.skills.filter((s) => s.usable);
    if (usable.length) {
      const s = usable[Math.floor(prng() * usable.length)];
      const valid = m.validTargets(actor.id, s.target);
      return { kind: 'skill', skillId: s.id, targetId: valid[Math.floor(prng() * valid.length)], boost };
    }
  }
  if (kind === 'defend') return { kind: 'defend' };
  const weapon = menu.weapons[Math.floor(prng() * menu.weapons.length)];
  return { kind: 'attack', weapon, targetId: foes[Math.floor(prng() * foes.length)].id, boost };
}

// ------------------------------------------------------------------ runner
// Plays one battle with the current gameState.party (mutated in place).
function playBattle(encounterId, seed, policy) {
  const prng = makeRng(seed ^ 0x9e3779b9);
  const model = new BattleModel({ party: gameState.party, encounterId, rng: makeRng(seed) });
  const memo = new Map(); // enemy id -> damage types that proved not to be weaknesses
  model.begin();
  while (!model.isOver() && model.round <= MAX_ROUNDS) {
    model.nextTurn();
    if (model.phase !== 'playerInput') {
      model.enemyTurn();
      continue;
    }
    for (const ev of model.act(policy(model, model.current, memo, prng))) {
      if (ev.type !== 'hit' || ev.weak || !ev.damageType || !ev.targetId.startsWith('e')) continue;
      if (!memo.has(ev.targetId)) memo.set(ev.targetId, new Set());
      memo.get(ev.targetId).add(ev.damageType);
    }
  }
  model.applyRewards();
  return model;
}

function freshParty() {
  resetGame();
  for (const m of gameState.party) for (let i = 0; i < LEVEL_BONUS; i++) gainXp(m, xpToNext(m.level));
  healParty();
}

function runBattle(encounterId, seed, policy) {
  freshParty();
  const model = playBattle(encounterId, seed, policy);
  const hpLeft = model.party.reduce((s, p) => s + p.hp, 0) / model.party.reduce((s, p) => s + p.maxHp, 0);
  return { result: model.result || 'timeout', rounds: model.round, hpLeft, kos: model.party.filter((p) => !p.alive).length };
}

function summarize(encounterId, policy, name) {
  let wins = 0; let rounds = 0; let in24 = 0; let in610 = 0; let hp = 0; let kos = 0;
  const hist = {};
  for (let i = 0; i < N; i++) {
    const r = runBattle(encounterId, 1000 + i * 7919, policy);
    if (r.result === 'victory') {
      wins++;
      rounds += r.rounds;
      hp += r.hpLeft;
      kos += r.kos;
      hist[r.rounds] = (hist[r.rounds] || 0) + 1;
      if (r.rounds >= 2 && r.rounds <= 4) in24++;
      if (r.rounds >= 6 && r.rounds <= 10) in610++;
    }
  }
  const pct = (x) => `${((100 * x) / N).toFixed(1)}%`.padStart(6);
  const avg = (x) => (wins ? (x / wins).toFixed(2) : '-').padStart(5);
  const boss = ENCOUNTERS[encounterId].boss;
  const band = boss ? `6-10r ${pct(in610)}` : `2-4r  ${pct(in24)}`;
  const histStr = Object.entries(hist).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`${encounterId.padEnd(14)} ${name.padEnd(9)} win ${pct(wins)}  rounds ${avg(rounds)}  ${band}  hpLeft ${(wins ? (100 * hp) / wins : 0).toFixed(0).padStart(3)}%  KOs ${avg(kos)}  [${histStr}]`);
}

// Campaign: 3 corridor + 5 engineering fights (random table rolls) without resting, patching up
// with field items between fights (Medi-Gel below 50%, Revive Kits on the fallen), then the boss
// either as-is or after a Med-Station rest.
function campaign(seed, restBeforeBoss) {
  freshParty();
  const rng = makeRng(seed);
  const fights = [...Array(3).fill('corridor'), ...Array(5).fill('engineering')];
  let regularLosses = 0;
  for (let i = 0; i < fights.length; i++) {
    const enc = rng.pick(ENCOUNTER_TABLES[fights[i]]);
    if (playBattle(enc, seed * 31 + i, heuristic).result !== 'victory') {
      regularLosses++;
      healParty(); // game over -> respawn at the checkpoint
    }
    for (const m of gameState.party) {
      if (!m.alive) useItemOutOfBattle('revive', m.id);
      while (m.alive && m.hp < m.maxHp * 0.5 && useItemOutOfBattle('medigel', m.id).ok);
    }
  }
  if (restBeforeBoss) healParty();
  const hpBefore = gameState.party.reduce((s, p) => s + p.hp, 0) / gameState.party.reduce((s, p) => s + p.maxHp, 0);
  const epBefore = gameState.party.reduce((s, p) => s + p.ep, 0) / gameState.party.reduce((s, p) => s + p.maxEp, 0);
  const levels = gameState.party.map((m) => m.level);
  const boss = playBattle('boss_sentinel', seed * 97 + 5, heuristic);
  return { regularLosses, hpBefore, epBefore, levels, won: boss.result === 'victory', rounds: boss.round };
}

function summarizeCampaign(restBeforeBoss) {
  const runs = Math.max(50, Math.round(N / 2));
  let losses = 0; let hp = 0; let ep = 0; let wins = 0; let rounds = 0;
  const lv = [0, 0, 0, 0];
  for (let i = 0; i < runs; i++) {
    const r = campaign(5000 + i * 104729, restBeforeBoss);
    losses += r.regularLosses;
    hp += r.hpBefore;
    ep += r.epBefore;
    r.levels.forEach((l, k) => { lv[k] += l; });
    if (r.won) { wins++; rounds += r.rounds; }
  }
  console.log(`campaign x${runs} ${restBeforeBoss ? '(rest before boss)' : '(no rest)         '}  regular losses ${losses}/${runs * 8}  ` +
    `party HP/EP at boss ${((100 * hp) / runs).toFixed(0)}%/${((100 * ep) / runs).toFixed(0)}%  levels ${lv.map((l) => (l / runs).toFixed(1)).join('/')}  ` +
    `boss win ${((100 * wins) / runs).toFixed(1)}% in ${(wins ? rounds / wins : 0).toFixed(2)} rounds`);
}

console.log(`VOIDPATH balance: ${N} seeded battles per encounter, party level bonus +${LEVEL_BONUS}`);
for (const id of Object.keys(ENCOUNTERS)) {
  summarize(id, heuristic, 'heuristic');
  summarize(id, randomPolicy, 'random');
}
summarizeCampaign(false);
summarizeCampaign(true);
