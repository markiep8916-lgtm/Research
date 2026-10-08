// Balance simulation: plays every encounter many times with a heuristic player policy and a random
// policy (both seeded) and prints win rate and battle length, then plays whole campaigns (chained
// fights with no healing in between, xp and drops carried over) ending with the boss. Not a unit test.
//
//   node tests/simulate.mjs [battlesPerEncounter=300] [--level-bonus N]

import { BattleModel } from '../src/battle/model.js';
import { ENCOUNTERS, ENCOUNTER_TABLES } from '../src/battle/data.js';
import { gameState, resetGame, healParty, gainXp, xpToNext, useItemOutOfBattle } from '../src/core/state.js';
import { makeRng } from '../src/core/util.js';
import { policyAction, observe } from './policy.mjs';

const N = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 300;
const lvlArg = process.argv.indexOf('--level-bonus');
const LEVEL_BONUS = lvlArg > 0 ? Number(process.argv[lvlArg + 1]) : 0;
const MAX_ROUNDS = 40;

const alive = (list) => list.filter((c) => c.alive);

// The heuristic player is the shared human-like policy (tests/policy.mjs, TECH_PLAN 10.4).
const heuristic = (m, actor, memo) => policyAction(m, actor.id, memo);

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
    observe(memo, model.act(policy(model, model.current, memo, prng)));
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
