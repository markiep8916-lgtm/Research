#!/usr/bin/env node
// Summary of a human-pace run (tools/human-pace.mjs writes it as summary.txt at the end).
//
//   node tools/human-pace-report.mjs <out dir> [more dirs]
//
// Per chapter: minutes against TECH_PLAN 11.7, debug.pacing(), the run's own accounting (walk /
// idle / cutscene / battle / menu), story seconds per scene against the route's WRITING 5.10 plan
// (+15%), the chapter's story total against its plan sum (+15%), fights (11.7 counts), the level at
// each boss against the route's planned level, and each battle with its tip and boss lines.
// Story seconds are cutscene time minus nested battles, attributed to the innermost running script
// that is a scene (a `plan` entry or a REG.scenes entry), else to the outermost script; a scene
// split by a battle shows its parts ("16 + 86").
//
// export loadRoutes() -> { segments, plan, legs }   every tests/routes/*.mjs merged
// export summarize(report, routes) -> text

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './browser.mjs';

// TECH_PLAN 11.7: fights (scripted + random) and total minutes for a first-time player
const TARGETS = {
  prologue: { fights: [7, 9], minutes: [18, 22] },
  ch1: { fights: [10, 12], minutes: [22, 26] },
  ch2: { fights: [8, 10], minutes: [16, 20] },
  ch3: { fights: [8, 10], minutes: [16, 20] },
  ch4: { fights: [8, 10], minutes: [16, 20] },
  finale: { fights: [8, 10], minutes: [20, 24] },
  epilogue: { fights: [0, 0], minutes: [5, 7] },
};
const SLACK = 1.15;      // each scene and each chapter's story: plan + 15% (WRITING 1.8, 5.10)
const TOTAL_SLACK = 0.2; // a chapter more than 20% outside its total fails (11.7)

export async function loadRoutes() {
  const dir = path.join(ROOT, 'tests/routes');
  const out = { segments: {}, plan: {}, legs: [] };
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort() : [];
  for (const f of files) {
    const loc = f.replace(/\.mjs$/, '');
    const r = (await import(pathToFileURL(path.join(dir, f)).href)).default || {};
    for (const [key, seg] of Object.entries(r.segments || {})) {
      if (out.segments[key]) throw new Error(`routes: segment "${key}" in ${f} is also in ${out.segments[key].loc}.mjs`);
      out.segments[key] = { ...seg, loc };
    }
    for (const [ch, p] of Object.entries(r.plan || {})) {
      const into = (out.plan[ch] ||= { scenes: {}, bosses: {} });
      Object.assign(into.scenes, p.scenes || {});
      Object.assign(into.bosses, p.bosses || {});
    }
    for (const leg of r.legs || []) out.legs.push({ ...leg, loc });
  }
  return out;
}

/** Ids of every registered scene (REG.scenes), or an empty set when the registry does not load. */
async function sceneIds() {
  try {
    const { registerAllData, registry } = await import(pathToFileURL(path.join(ROOT, 'src/content/data.js')).href);
    registerAllData();
    return new Set(registry.REG.scenes.map((s) => s.id));
  } catch {
    return new Set();
  }
}
const SCENES = await sceneIds();

/** Story seconds per chapter and script from the run's script / battle timeline. */
function storyTimes(log, planned) {
  const isScene = (id) => planned.has(id) || SCENES.has(id);
  const out = {};   // ch -> id -> { sec, parts: [], runs }
  const stack = [];
  let inBattle = false, last = null;
  const owner = () => {
    for (let i = stack.length - 1; i >= 0; i--) if (isScene(stack[i].id)) return stack[i];
    return stack[0] || null;
  };
  let open = null;   // the record whose last part is still growing
  for (const e of log) {
    const cur = owner();
    if (cur && !inBattle && last != null && e.t > last) {
      const rec = ((out[cur.ch] ||= {})[cur.id] ||= { sec: 0, parts: [], runs: 0 });
      if (open !== rec) { rec.parts.push(0); open = rec; }
      rec.sec += e.t - last;
      rec.parts[rec.parts.length - 1] += e.t - last;
    }
    last = e.t;
    if (e.type === 'script' && e.phase === 'start') {
      stack.push({ id: e.id, ch: e.ch });
      if (isScene(e.id) || stack.length === 1) (((out[e.ch] ||= {})[e.id] ||= { sec: 0, parts: [], runs: 0 })).runs++;
      open = null;
    } else if (e.type === 'script' && e.phase === 'end') {
      const i = stack.map((s) => s.id).lastIndexOf(e.id);
      if (i >= 0) stack.splice(i);
      open = null;
    } else if (e.type === 'battle') { inBattle = true; open = null; } else if (e.type === 'battleEnd') { inBattle = false; open = null; }
  }
  return out;
}

const fmt = (x) => x.toFixed(0);
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

export function summarize(d, routes) {
  const lines = [];
  const say = (s = '') => lines.push(s);
  say(`=== human pace from ${d.start || '?'}: virtual ${(d.vt / 60).toFixed(1)} min, wall ${d.wallMin} min${d.final ? '' : ' (in progress)'}`);
  say(`debug.pacing(): ${JSON.stringify(d.pacing, (k, v) => (typeof v === 'number' ? +v.toFixed(1) : v))}`);
  const planned = new Set(Object.values(routes.plan).flatMap((p) => Object.keys(p.scenes)));
  const story = storyTimes(d.log, planned);
  const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  for (const [ch, a] of Object.entries(d.acc)) {
    const tg = TARGETS[ch];
    const plan = routes.plan[ch] || { scenes: {}, bosses: {} };
    const min = a.total / 60;
    const bs = d.battles.filter((b) => b.ch === ch);
    const recs = story[ch] || {};
    const crit = Object.keys(plan.scenes);
    // a chapter the run entered mid-way (a jump) or left early is partial: no chapter verdicts
    const unseen = crit.filter((id) => !recs[id]);
    const verdict = (ok, good, bad) => (unseen.length ? `partial run, ${unseen.length} planned scenes not seen` : ok ? good : bad);
    say();
    const minOk = tg ? min >= tg.minutes[0] * (1 - TOTAL_SLACK) && min <= tg.minutes[1] * (1 + TOTAL_SLACK) : true;
    say(`-- ${ch}: ${min.toFixed(1)} min${tg ? ` (11.7: ${tg.minutes[0]}-${tg.minutes[1]}; ${verdict(minOk, 'inside the 20% band', 'OUTSIDE the 20% band')})` : ''}`);
    say(`   walk ${fmt(a.walk)} s over ${fmt(a.walkDist)} units, field idle ${fmt(a.fieldIdle)} s, menus ${fmt(a.menu)} s, transitions ${fmt(a.transition)} s, cutscene ${fmt(a.cutscene)} s, battle ${fmt(a.battle)} s`);
    // story
    const critSec = crit.reduce((s, id) => s + (recs[id] ? recs[id].sec : 0), 0);
    const planSum = crit.reduce((s, id) => s + plan.scenes[id], 0);
    const pt = Object.entries(recs).filter(([id]) => /\.pt_/.test(id));
    const other = Object.entries(recs).filter(([id]) => !plan.scenes[id] && !/\.pt_/.test(id));
    if (crit.length) {
      say(`   story (critical path): ${fmt(critSec)} s against plan ${planSum} s, plan + 15% ${fmt(planSum * SLACK)} s: ${verdict(critSec <= planSum * SLACK, 'ok', 'OVER')}`);
      say(`     ${pad('scene', 30)}${lpad('measured', 14)}${lpad('plan', 6)}${lpad('+15%', 6)}`);
      for (const id of crit) {
        const r = recs[id];
        const lim = plan.scenes[id] * SLACK;
        const m = r ? (r.parts.length > 1 ? r.parts.map(fmt).join(' + ') : fmt(r.sec)) + (r.runs > 1 ? ` (x${r.runs})` : '') : '-';
        say(`     ${pad(id, 30)}${lpad(m, 14)}${lpad(plan.scenes[id], 6)}${lpad(fmt(lim), 6)}  ${!r ? 'not seen' : r.sec <= lim ? 'ok' : 'OVER'}`);
      }
    }
    say(`   party talks ${fmt(pt.reduce((s, [, r]) => s + r.sec, 0))} s (${pt.map(([id, r]) => `${id} ${fmt(r.sec)}`).join(', ') || 'none'})`);
    say(`   other scripts ${fmt(other.reduce((s, [, r]) => s + r.sec, 0))} s: ${other.sort((x, y) => y[1].sec - x[1].sec).map(([id, r]) => `${id} ${fmt(r.sec)}`).join(', ')}`);
    // fights
    const reg = bs.filter((b) => !b.boss);
    const boss = bs.filter((b) => b.boss);
    const fOk = tg ? bs.length >= tg.fights[0] && bs.length <= tg.fights[1] : true;
    say(`   fights ${bs.length}${tg ? ` (11.7: ${tg.fights[0]}-${tg.fights[1]}; ${verdict(fOk, 'ok', 'OUT')})` : ''}: regular ${reg.length}, mean ${fmt(mean(reg.map((b) => b.dur)))} s, ${mean(reg.map((b) => b.rounds)).toFixed(1)} rounds; bosses ${boss.length}`);
    for (const b of boss) {
      const lv = b.party.map((p) => p.lv);
      const want = plan.bosses[b.enc];
      const off = want != null ? Math.max(...lv.map((l) => Math.abs(l - want))) : null;
      say(`     boss ${b.enc}: level ${lv.join('/')}${want != null ? ` (plan ${want}: ${off <= 1 ? 'within 1' : 'OFF BY ' + off})` : ''}, ${b.dur} s, ${b.rounds} rounds, ${b.result}`);
    }
    for (const b of bs) {
      say(`     ${pad(b.enc, 24)}${lpad(b.dur, 7)} s  r${b.rounds}  ${b.result}  lv ${b.party.map((p) => p.lv).join('/')} -> ${(b.after || []).map((p) => p.lv).join('/')}  +${b.creditsGained ?? 0}cr  `
        + ['weakHit', 'break', 'boost', 'telegraph', 'untargetable', 'learn'].map((k) => `${k}:${b.events[k] || 0}`).join(' '));
      const t1 = b.t0 + (b.dur || 0);
      const said = d.boxes.filter((x) => x.battle && x.t >= b.t0 && x.t <= t1);
      for (const x of said) say(`         ${x.speaker ? x.speaker + ': ' : ''}${x.text.slice(0, 90)}`);
    }
  }
  say();
  say(`notes:\n  ${d.notes.join('\n  ')}`);
  if (d.console.length) say(`console:\n  ${d.console.slice(0, 20).map((c) => `${c.type}: ${c.text.slice(0, 200)}`).join('\n  ')}`);
  say(`missingArt: ${JSON.stringify(d.missingArt).slice(0, 300)}`);
  say(`end state: ${JSON.stringify({ map: d.state.map, chapter: d.state.chapter, objective: d.state.objective, leader: d.state.leader, party: d.state.party, credits: d.credits })}`);
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const routes = await loadRoutes();
  for (const dir of process.argv.slice(2)) {
    console.log(summarize(JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8')), routes));
  }
}
