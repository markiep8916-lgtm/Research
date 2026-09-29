#!/usr/bin/env node
// Difficulty audit for the certified progression route: how forgiving is each jump the solver relies on?
//   node tools/reach.js --thorough --certify --edges /tmp/edges.json      (writes the certified jump / fall edges)
//   node tools/robust_edges.js /tmp/edges.json [--top 25]                 (perturbs each edge through the real controller and ranks the tightest)
const fs = require('fs'), path = require('path');
const R = require('./reach.js'); const RS = require('./real_sim.js')(R.CD, R.world);
const args = process.argv.slice(2), file = args[0], top = +(args[args.indexOf('--top') + 1] || 25);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
// every round restarts the search, so a cell is re-discovered each round: keep the edge that first reached each cell (earliest round = fewest abilities)
const first = new Map(); for (const e of data.edges.slice().sort((a, b) => a.round - b.round)) { const k = e.to[0] + ',' + e.to[1]; if (!first.has(k)) first.set(k, e); }
const edges = Array.from(first.values()).filter((e) => !e.plan.walk && !e.plan.fall && !e.plan.drop);
const byRound = {}; for (const e of edges) (byRound[e.round] = byRound[e.round] || []).push(e);
const scored = [];   // tiles (doors, cracked walls) depend on the unlock state of the round the edge was found in
for (const r of Object.keys(byRound).map(Number).sort((a, b) => a - b)) {
  const es = byRound[r]; R.applyState(new Set(data.states[r]));
  for (const e of es) {
    const has = {}; for (const a of e.abilities) has[a] = true;
    const rb = RS.robust(e.from[0], e.from[1], e.plan, e.to[0], e.to[1], has);
    const room = R.world.roomAtTile(e.from[0], e.from[1] - 1);
    scored.push({ rb, room: room ? room.id : '?', from: e.from, to: e.to, plan: e.plan, round: r, abil: e.abilities.join('+') || 'none' });
  }
}
scored.sort((a, b) => a.rb - b.rb);
const bucket = (lo, hi) => scored.filter((s) => s.rb >= lo && s.rb < hi).length;
console.log('jump edges audited: ' + scored.length + '   robustness (share of perturbed runs that still land): 0%: ' + bucket(0, 0.001) + '  <25%: ' + bucket(0.001, 0.25) + '  25-50%: ' + bucket(0.25, 0.5) + '  50-75%: ' + bucket(0.5, 0.75) + '  >=75%: ' + bucket(0.75, 1.01));
console.log('tightest ' + Math.min(top, scored.length) + ':');
for (const s of scored.slice(0, top)) console.log('  ' + (s.rb * 100).toFixed(0).padStart(3) + '%  ' + s.room.padEnd(11) + ' ' + JSON.stringify(s.from) + ' -> ' + JSON.stringify(s.to) + '  [' + s.abil + ']  ' + JSON.stringify({ dir: s.plan.dir, hold: s.plan.hold, dj: s.plan.dj, dash: s.plan.dash, wj: s.plan.wj ? s.plan.wjMode : undefined }));
fs.writeFileSync(file.replace(/\.json$/, '') + '.robust.json', JSON.stringify(scored));
