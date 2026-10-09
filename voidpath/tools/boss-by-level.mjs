#!/usr/bin/env node
// Boss win rate by party level (G2 "Boss by level"): plays an encounter with the human-like policy
// of tests/policy.mjs on the kit and party of a jump target, at each level given.
//
//   node tools/boss-by-level.mjs <jump> <encounter> <level...> [--n 300]
//   node tools/boss-by-level.mjs pro.bridge pro_boss_sentinel 4 5 6 7
//   node tools/boss-by-level.mjs ch1.maw shoals_boss_maw 9 10 11 12

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './browser.mjs';

const load = (f) => import(pathToFileURL(path.join(ROOT, f)).href);
const { registerAllData, REG } = await load('src/content/data.js');
const { BattleModel } = await load('src/battle/model.js');
const { gameState, healParty } = await load('src/core/state.js');
const { buildJumpState, applyJumpState, setMemberLevel } = await load('src/story/jump.js');
const { policyAction, observe } = await load('tests/policy.mjs');
const { makeRng } = await load('src/core/util.js');

const args = process.argv.slice(2);
const ni = args.indexOf('--n');
const N = ni >= 0 ? Number(args.splice(ni, 2)[1]) : 300;
const [jump, enc, ...levels] = args;
if (!jump || !enc || !levels.length) {
  console.error('usage: node tools/boss-by-level.mjs <jump> <encounter> <level...> [--n 300]');
  process.exit(2);
}
registerAllData();   // applies balance.js too

function fight(seed) {
  const m = new BattleModel({ party: gameState.party, encounterId: enc, rng: makeRng(seed) });
  const memo = new Map();
  observe(memo, m.begin());
  for (let g = 0; g < 4000 && !m.isOver() && m.round <= 40; g++) {
    observe(memo, m.nextTurn());
    if (m.isOver()) break;
    if (m.phase === 'enemyTurn') { m.enemyTurn(); continue; }
    if (m.phase !== 'playerInput') continue;
    let ev = m.act({ actorId: m.current.id, ...policyAction(m, m.current.id, memo) });
    if (ev.length === 1 && ev[0].type === 'message') ev = m.act({ actorId: m.current.id, kind: 'defend' });
    observe(memo, ev);
  }
  return { result: m.result || 'timeout', rounds: m.round };
}

for (const L of levels.map(Number)) {
  let wins = 0;
  const rounds = [];
  for (let i = 0; i < N; i++) {
    applyJumpState(buildJumpState(jump, REG));
    for (const m of gameState.party) setMemberLevel(m, L);
    healParty();
    const r = fight(1000 + i);
    if (r.result === 'victory') wins++;
    rounds.push(r.rounds);
  }
  rounds.sort((a, b) => a - b);
  console.log(`${enc} at L${L} (${jump} kit): win ${(100 * wins / N).toFixed(1)}%, median rounds ${rounds[N >> 1]}`);
}
