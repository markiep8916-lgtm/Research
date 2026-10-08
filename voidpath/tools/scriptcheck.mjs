#!/usr/bin/env node
// Script dry run (TECH_PLAN 10.3), node only: `npm run scriptcheck`, also run by tests/scripts.test.mjs.
//
// Registers all pure content and runs every script of every `story.scenes` list in play order
// against a recording `cs` mock, each chapter starting from buildJumpState(chapter) and keeping the
// flags its scripts set. Choices are enumerated (every branch, up to 16 paths per script), cs.battle
// returns 'victory' (and also 'defeat' when allowDefeat), every other call is instant. Scripts no
// scene lists (talk, terminals, hints) run once afterwards for the per-box checks.
//
// Output (shots/scriptcheck/, or --out <dir>): <chapter>.txt play-order transcripts (speaker,
// expression, text, staging calls), other.txt for the remaining scripts, report.json (boxes and
// characters per box per scene, estimated reading time 1.2 s + 1 s per 18 characters per box,
// unregistered speakers and expressions, content lint results) and a summary on stdout.
//
// Fails (exit 1) on: a box over 100 visible characters (emphasis markers not counted); a scene
// over its budget (default 25 boxes or 150 s, checked per stretch between battles, i.e. before the
// player gets control back); an unregistered speaker; more than 3 boxes tagged 'mech' before the
// first battle; a key scene with fewer than two staging devices (11.3); a chapter whose key scenes
// give no line to a traveler in the party at the time; plus script errors, runaway scripts, unknown
// cs methods and unknown ids passed to cs (scripts, maps, encounters, items, objectives, shops,
// destinations, chapters). The content lints of tools/contentlint.mjs run too, with the flags and
// conditions the dry run saw.
//
// API: dryRun(reg, { buildJumpState, maxPaths }) -> result; writeReport(result, dir)
//   scene play order: chapter order, then registration order (common first), then list order;
//   an optional numeric `order` on a scene entry sorts it within its chapter.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHAPTER_IDS, CHAPTERS, chapterDef, chapterIndex } from '../src/content/chapters.js';
import { testCond, compileCond } from '../src/world/cond.js';
import { lintContent, formatFindings } from './contentlint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const BOX_MAX = 100;
export const DEFAULT_BUDGET = { boxes: 25, sec: 150 };
export const MECH_MAX = 3;
const MAX_PATHS = 16;
const MAX_CALLS = 4000;
const NAME_OF = { KADE: 'kade', NYX: 'nyx', ORION: 'orion', SERA: 'sera' };
const MEMBER_NAME = { kade: 'KADE', nyx: 'NYX', orion: 'ORION', sera: 'SERA' };
// Spoken by the core cast; the UI resolves them even before common/story.js registers them.
const CORE_SPEAKERS = ['KADE', 'NYX', 'ORION', 'SERA', 'BOLT', 'HALCYON', 'WARDEN'];
const BASE_EXPR = ['neutral', 'smile', 'sad', 'determined', 'surprised'];
const SPEAKER_EXPR = { BOLT: ['happy', 'worried', 'determined'], HALCYON: ['calm', 'flicker'] };

/** Visible characters of a box: emphasis markers (*) are not counted. */
export function visibleLength(text) {
  return [...String(text ?? '').replace(/\*/g, '')].length;
}

/** Estimated reading time of one box in seconds (1.2 s + 1 s per 18 characters). */
export function readSec(text) {
  return 1.2 + visibleLength(text) / 18;
}

class Abort extends Error {}

// A recording cs mock for one run (one choice path).
function makeRun(ctx, plan) {
  const { REG, tables, state } = ctx;
  const run = {
    boxes: [], events: [], devices: new Set(), choices: [], counts: [], calls: 0,
    failures: [], battles: 0, segments: [{ boxes: 0, sec: 0 }], nested: [], present: new Set(state.party),
    unknownExpr: new Set(), unknownSpeakers: new Set(), flagsSet: new Set(), conds: new Set(),
  };
  const fail = (msg) => run.failures.push(msg);
  const tick = (name) => {
    if (++run.calls > MAX_CALLS) throw new Abort(`runaway script (more than ${MAX_CALLS} cs calls)`);
    run.lastCall = name;
  };
  const ev = (text) => run.events.push(`  > ${text}`);
  const seg = () => run.segments[run.segments.length - 1];
  let lastSpeaker = null;
  let lastPortrait = null;

  const box = (line) => {
    const speaker = line.speaker ?? null;
    const text = String(line.text ?? '');
    let expr = line.expr || null;
    if (!expr && typeof line.portrait === 'string' && line.portrait.includes(':')) expr = line.portrait.split(':')[1];
    if (speaker) {
      if (!REG.speakers[speaker] && !CORE_SPEAKERS.includes(speaker)) run.unknownSpeakers.add(speaker);
      if (expr) {
        const ok = [...BASE_EXPR, ...(SPEAKER_EXPR[speaker] || []), ...(REG.speakers[speaker]?.expressions || [])];
        if (!ok.includes(expr)) run.unknownExpr.add(`${speaker}:${expr}`);
        if (expr !== 'neutral') run.devices.add('pose');
      }
    }
    const len = visibleLength(text);
    run.boxes.push({ speaker, text, expr, tag: line.tag || null, len, offscreen: !!line.offscreen, afterBattle: run.battles > 0 });
    seg().boxes++;
    seg().sec += readSec(text);
    run.events.push(`${speaker ?? '(narration)'}${expr ? ` [${expr}]` : ''}${line.tag ? ` {${line.tag}}` : ''}: ${text}`);
    lastSpeaker = speaker;
    lastPortrait = line.portrait;
  };
  const say = (a, b, opts = {}) => {
    tick('say');
    if (typeof a === 'string' && typeof b === 'string') { box({ speaker: a, text: b, ...opts }); return Promise.resolve(); }
    if (typeof a === 'string' && b === undefined) { box({ speaker: lastSpeaker, text: a, portrait: lastPortrait }); return Promise.resolve(); }
    for (const l of Array.isArray(a) ? a : [a]) {
      if (typeof l === 'string') box({ speaker: lastSpeaker, text: l, portrait: lastPortrait });
      else if (l && typeof l === 'object') box(l);
    }
    return Promise.resolve();
  };
  const known = (table, id, what) => {
    if (id != null && !table[id]) fail(`unknown ${what} "${id}"`);
  };
  const handle = (id) => ({
    id, x: 0, z: 0, facing: 'down', visible: true,
    face() { return this; }, play() { return this; },
    walkTo() { run.devices.add('movement'); return Promise.resolve(); },
    setVisible() { return Promise.resolve(); },
  });
  const sync = (name, fn) => (...args) => { tick(name); return fn ? fn(...args) : undefined; };
  const async = (name, fn) => (...args) => { tick(name); return Promise.resolve(fn ? fn(...args) : undefined); };
  const device = (name, kind, label) => async(name, (...a) => { run.devices.add(kind); ev(`${label || name} ${a.filter((x) => typeof x !== 'object').join(' ')}`.trim()); });

  const camera = {
    focus: device('camera.focus', 'camera'), view: device('camera.view', 'camera'), pan: device('camera.pan', 'camera'),
    reset: async('camera.reset'),
  };
  const api = {
    say,
    narrate: (text) => say([{ speaker: null, text }]),
    choice: (prompt, options = [], opts = {}) => {
      tick('choice');
      if (prompt) box({ speaker: opts.speaker ?? null, text: prompt, expr: opts.expr });
      for (const o of options) if (visibleLength(o) > BOX_MAX) fail(`choice option over ${BOX_MAX} characters: "${o}"`);
      const k = run.choices.length;
      const pick = Math.min(plan[k] ?? 0, Math.max(0, options.length - 1));
      run.choices.push(pick);
      run.counts.push(Math.max(1, options.length));
      ev(`choice [${options.map((o, i) => (i === pick ? `*${o}*` : o)).join(' | ')}]`);
      return Promise.resolve(pick);
    },
    wait: async('wait', (sec) => { seg().sec += Number(sec) || 0; }),
    scene: sync('scene', (o) => { if (o?.leader) state.leader = o.leader; }),
    actor: sync('actor', (id) => handle(id)),
    spawn: async('spawn', (id, o = {}) => { run.devices.add(o.hologram ? 'hologram' : 'movement'); ev(`spawn ${id}${o.hologram ? ' (hologram)' : ''}`); return handle(id); }),
    despawn: device('despawn', 'movement'),
    move: device('move', 'movement'),
    face: sync('face'),
    anim: sync('anim', (id, pose) => { if (pose) { run.devices.add('pose'); ev(`anim ${id} ${pose}`); } }),
    emote: device('emote', 'emote'),
    gather: async('gather', (layout) => {
      run.devices.add('movement');
      for (const m of Object.keys(layout || {})) if (MEMBER_NAME[m] && !state.party.includes(m)) fail(`gather lists ${m}, who is not in the party`);
      ev(`gather ${Object.keys(layout || {}).join(' ')}`);
    }),
    ungather: device('ungather', 'movement'),
    camera,
    letterbox: async('letterbox'),
    fadeOut: async('fadeOut'), fadeIn: async('fadeIn'),
    flash: sync('flash', () => run.devices.add('light')),
    shake: sync('shake', () => run.devices.add('camera')),
    fx: sync('fx', () => run.devices.add('light')),
    memory: sync('memory', (on) => { if (on) run.devices.add('light'); }),
    screens: sync('screens', (t) => { if (t) run.devices.add('light'); }),
    card: async('card', (id) => {
      if (chapterIndex(id) < 0) fail(`unknown chapter "${id}"`);
      else {
        state.chapter = id;
        const t = chapterDef(id).traveler;
        if (t && state.party.includes(t)) state.leader = t;
      }
      ev(`card ${id}`);
    }),
    banner: async('banner'), caption: async('caption', (t) => ev(`caption ${t}`)),
    music: sync('music', (t) => { run.devices.add('music'); ev(`music ${t}`); }),
    sfx: sync('sfx'),
    flag: sync('flag', (name, value = true) => {
      if (value) state.flags[name] = value; else delete state.flags[name];
      run.flagsSet.add(name);
    }),
    test: sync('test', (cond) => {
      try {
        compileCond(cond);
      } catch (e) {
        fail(e.message);
        return false;
      }
      run.conds.add(cond);
      return testCond(cond, ctx.condState());
    }),
    objective: sync('objective', (id) => { known(REG.objectives, id, 'objective'); state.objective = id; }),
    chapter: sync('chapter', (id) => { if (chapterIndex(id) < 0) fail(`unknown chapter "${id}"`); else state.chapter = id; }),
    give: async('give', (id, n = 1) => { known(tables.items, id, 'item'); state.items[id] = (state.items[id] || 0) + n; }),
    take: sync('take', (id, n = 1) => { known(tables.items, id, 'item'); state.items[id] = Math.max(0, (state.items[id] || 0) - n); }),
    credits: sync('credits'),
    join: async('join', (id) => {
      if (!MEMBER_NAME[id]) fail(`join: unknown member "${id}"`);
      else if (!state.party.includes(id)) { state.party.push(id); run.present.add(id); }
      ev(`join ${id}`);
    }),
    leave: async('leave', (id) => { state.party = state.party.filter((m) => m !== id); ev(`leave ${id}`); }),
    setLeader: async('setLeader', (id) => { state.leader = id; }),
    heal: async('heal'),
    checkpoint: sync('checkpoint'), save: sync('save'),
    battle: (id, opts = {}) => {
      tick('battle');
      known(tables.encounters, id, 'encounter');
      run.battles++;
      run.segments.push({ boxes: 0, sec: 0 });
      let result = 'victory';
      if (opts.allowDefeat) {
        const k = run.choices.length;
        const pick = Math.min(plan[k] ?? 0, 1);
        run.choices.push(pick);
        run.counts.push(2);
        result = pick ? 'defeat' : 'victory';
      }
      ev(`battle ${id} -> ${result}`);
      return Promise.resolve(result);
    },
    goto: async('goto', (map, spawn) => {
      if (!REG.maps[map]) fail(`goto unknown map "${map}"`);
      else if (typeof spawn === 'string' && !REG.maps[map].spawns?.[spawn]) fail(`goto unknown spawn "${map}:${spawn}"`);
      ev(`goto ${map}:${typeof spawn === 'string' ? spawn : 'pos'}`);
    }),
    shop: async('shop', (id) => known(REG.shops, id, 'shop')),
    travel: async('travel', (id) => { if (id != null && !REG.destinations.some((d) => d.id === id)) fail(`unknown destination "${id}"`); }),
    run: (id, args) => {
      tick('run');
      if (typeof REG.scripts[id] !== 'function') { fail(`cs.run of missing script "${id}"`); return Promise.resolve(); }
      run.nested.push(id);
      ev(`run ${id}`);
      return REG.scripts[id](proxy, args || {});
    },
    ending: async('ending', () => ev('ending')),
    light: sync('light', () => run.devices.add('light')),
    particles: sync('particles', () => run.devices.add('light')),
    prop: sync('prop', () => ({ setOpen() {}, setState() {} })),
  };
  const proxy = new Proxy(api, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'symbol' || key === 'then') return undefined;
      return () => { fail(`unknown cs method "cs.${String(key)}"`); return Promise.resolve(); };
    },
  });
  run.cs = proxy;
  return run;
}

// Runs one script id on every choice path (up to maxPaths). The state of the first path is kept
// (later paths start from a copy of the state before the script).
async function runScript(ctx, id, args, { maxPaths = MAX_PATHS } = {}) {
  const fn = ctx.REG.scripts[id];
  const paths = [];
  const start = ctx.snapshot();
  let plan = [];
  let kept = null;
  while (paths.length < maxPaths) {
    ctx.restore(start);
    const run = makeRun(ctx, plan);
    try {
      await fn(run.cs, args);
    } catch (e) {
      run.failures.push(e instanceof Abort ? e.message : `script threw: ${e?.message || e}`);
    }
    paths.push(run);
    if (!kept) kept = ctx.snapshot();
    // next path: odometer over the choices taken
    let k = run.choices.length - 1;
    while (k >= 0 && run.choices[k] + 1 >= run.counts[k]) k--;
    if (k < 0) break;
    plan = [...run.choices.slice(0, k), run.choices[k] + 1];
  }
  ctx.restore(kept || start);
  return paths;
}

function makeCtx(reg, jump) {
  const { REG, tables } = reg;
  const state = { flags: {}, items: {}, party: [], leader: null, chapter: 'prologue', objective: null };
  const ctx = {
    REG, tables, state,
    load(js) {
      state.flags = { ...js.flags };
      state.items = { ...js.items };
      state.party = [...js.party];
      state.leader = js.leader;
      state.chapter = js.chapter;
      state.objective = js.story?.objective ?? null;
    },
    snapshot: () => JSON.parse(JSON.stringify(state)),
    restore(s) { Object.assign(state, JSON.parse(JSON.stringify(s))); },
    condState: () => ({
      flags: state.flags, inventory: state.items, party: state.party.map((id) => ({ id })), leader: state.leader,
      story: { chapter: state.chapter },
    }),
    jump,
  };
  return ctx;
}

function silentJump(buildJumpState, target, REG) {
  const warn = console.warn;
  const notes = [];
  console.warn = (...a) => notes.push(a.join(' '));
  try {
    return { js: buildJumpState(target, REG), notes };
  } finally {
    console.warn = warn;
  }
}

export async function dryRun(reg, { buildJumpState, maxPaths = MAX_PATHS } = {}) {
  if (!buildJumpState) ({ buildJumpState } = await import('../src/story/jump.js'));
  const { REG } = reg;
  const ctx = makeCtx(reg);
  const failures = [];
  const fail = (scope, msg) => failures.push({ scope, msg });
  const scenes = [];
  const transcripts = {};
  const unknownSpeakers = new Set();
  const unknownExpr = new Set();
  const flagsSet = new Set();
  const conds = new Set();
  const notes = [];
  let mechBeforeBattle = 0;
  let battleSeen = false;

  const order = new Map(REG.scenes.map((s, i) => [s, i]));
  const played = new Set();
  for (const ch of CHAPTER_IDS) {
    const list = REG.scenes.filter((s) => (s.chapter || REG.locations[s.loc]?.chapter) === ch)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || order.get(a) - order.get(b));
    if (!list.length) continue;
    const { js, notes: n } = silentJump(buildJumpState, ch, REG);
    notes.push(...n.map((t) => `${ch}: ${t}`));
    ctx.load(js);
    const lines = [`# ${ch}: ${chapterDef(ch).kicker} - ${chapterDef(ch).title}`, `# party ${js.party.join(', ')}; leader ${js.leader}`, ''];
    const key = { present: new Set(), speakers: new Set() };
    for (const sc of list) {
      played.add(sc.id);
      if (typeof REG.scripts[sc.id] !== 'function') { fail(sc.id, 'scene has no script'); continue; }
      const before = new Set(ctx.state.party);
      const paths = await runScript(ctx, sc.id, { scene: sc.id, trigger: { id: sc.id } }, { maxPaths });
      const budget = { ...DEFAULT_BUDGET, ...(sc.budget || {}) };
      const boxes = Math.max(...paths.map((p) => p.boxes.length));
      const sec = Math.max(...paths.map((p) => p.segments.reduce((a, s) => a + s.sec, 0)));
      const worstSeg = paths.flatMap((p) => p.segments).reduce((w, s) => (s.boxes > w.boxes || s.sec > w.sec ? { boxes: Math.max(w.boxes, s.boxes), sec: Math.max(w.sec, s.sec) } : w), { boxes: 0, sec: 0 });
      const devices = new Set(paths.flatMap((p) => [...p.devices]));
      const entry = {
        id: sc.id, chapter: ch, key: !!sc.key, paths: paths.length, boxes, sec: Math.round(sec), budget,
        perBox: paths[0].boxes.map((b) => b.len), devices: [...devices].sort(), nested: [...new Set(paths.flatMap((p) => p.nested))],
      };
      scenes.push(entry);
      for (const p of paths) {
        for (const f of new Set(p.failures)) fail(sc.id, f);
        for (const b of p.boxes) if (b.len > BOX_MAX) fail(sc.id, `box over ${BOX_MAX} characters (${b.len}): "${b.text}"`);
        p.unknownSpeakers.forEach((x) => unknownSpeakers.add(x));
        p.unknownExpr.forEach((x) => unknownExpr.add(x));
        p.flagsSet.forEach((x) => flagsSet.add(x));
        p.conds.forEach((x) => conds.add(x));
      }
      if (worstSeg.boxes > budget.boxes) fail(sc.id, `${worstSeg.boxes} boxes before the player gets control back (budget ${budget.boxes})`);
      if (worstSeg.sec > budget.sec) fail(sc.id, `${Math.round(worstSeg.sec)} s before the player gets control back (budget ${budget.sec} s)`);
      if (sc.key && devices.size < 2) fail(sc.id, `key scene uses ${devices.size} staging device(s) (${[...devices].join(', ') || 'none'}); at least 2`);
      // mechanics boxes before the first battle of the game (first path, play order)
      if (!battleSeen) for (const b of paths[0].boxes) if (b.tag === 'mech' && !b.afterBattle) mechBeforeBattle++;
      if (paths[0].battles) battleSeen = true;
      if (sc.key) {
        for (const m of before) key.present.add(m);
        for (const m of ctx.state.party) key.present.add(m);
        for (const p of paths) for (const b of p.boxes) if (NAME_OF[b.speaker]) key.speakers.add(NAME_OF[b.speaker]);
      }
      lines.push(`## ${sc.id}${sc.key ? ' (key)' : ''}  boxes ${boxes}  ~${Math.round(sec)} s  devices ${entry.devices.join(', ') || '-'}${paths.length > 1 ? `  paths ${paths.length}` : ''}`);
      lines.push(...paths[0].events, '');
      for (const [i, p] of paths.slice(1).entries()) {
        lines.push(`   -- path ${i + 2}: choices ${p.choices.join(',')}`, ...p.events.map((e) => `   ${e}`), '');
      }
    }
    for (const m of key.present) {
      if (!key.speakers.has(m)) fail(ch, `${MEMBER_NAME[m]} is in the party but has no line in the chapter's key scenes`);
    }
    transcripts[ch] = lines.join('\n');
  }
  if (mechBeforeBattle > MECH_MAX) fail('prologue', `${mechBeforeBattle} boxes tagged mech before the first battle (at most ${MECH_MAX})`);

  // every other script once, for the per-box checks
  const other = [];
  for (const id of Object.keys(REG.scripts)) {
    if (played.has(id) || typeof REG.scripts[id] !== 'function') continue;
    const loc = reg.ownerOf('scripts', id);
    const ch = REG.locations[loc]?.chapter || 'prologue';
    const { js } = silentJump(buildJumpState, CHAPTER_IDS.includes(ch) ? ch : 'prologue', REG);
    ctx.load(js);
    const args = { npc: { id: 'npc', def: {} }, interactable: { id: 'interactable', kind: 'inspect' }, trigger: { id: 'trigger' }, member: js.leader };
    const paths = await runScript(ctx, id, args, { maxPaths: 4 });
    for (const p of paths) {
      for (const f of new Set(p.failures)) fail(id, f);
      for (const b of p.boxes) if (b.len > BOX_MAX) fail(id, `box over ${BOX_MAX} characters (${b.len}): "${b.text}"`);
      p.unknownSpeakers.forEach((x) => unknownSpeakers.add(x));
      p.unknownExpr.forEach((x) => unknownExpr.add(x));
      p.flagsSet.forEach((x) => flagsSet.add(x));
      p.conds.forEach((x) => conds.add(x));
    }
    other.push(`## ${id}`, ...paths[0].events, '');
  }
  transcripts.other = other.join('\n');
  for (const s of unknownSpeakers) fail('speakers', `unregistered speaker "${s}"`);

  return {
    ok: failures.length === 0, failures, scenes, transcripts, notes,
    unknownSpeakers: [...unknownSpeakers], unknownExpressions: [...unknownExpr],
    implicitSpeakers: CORE_SPEAKERS.filter((s) => !REG.speakers[s]),
    flagsSet: [...flagsSet], conds: [...conds], mechBeforeBattle,
  };
}

export function writeReport(result, dir, extra = {}) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(result.transcripts)) fs.writeFileSync(path.join(dir, `${name}.txt`), `${text}\n`);
  const { transcripts, ...rest } = result;
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ ...rest, ...extra }, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const oi = args.indexOf('--out');
  const out = path.resolve(oi >= 0 ? args[oi + 1] : path.join(ROOT, 'shots/scriptcheck'));
  const { registerAllData, registry } = await import('../src/content/data.js');
  registerAllData();
  const result = await dryRun(registry);
  const lint = lintContent(registry, { written: result.flagsSet, reads: result.conds });
  writeReport(result, out, { lint });
  const scenes = result.scenes.length;
  const boxes = result.scenes.reduce((a, s) => a + s.boxes, 0);
  console.log(`scriptcheck: ${scenes} scenes, ${boxes} boxes, ${Object.keys(registry.REG.scripts).length} scripts -> ${path.relative(process.cwd(), out)}`);
  for (const ch of CHAPTERS) {
    const list = result.scenes.filter((s) => s.chapter === ch.id);
    if (list.length) console.log(`  ${ch.id.padEnd(8)} ${String(list.length).padStart(3)} scenes ${String(list.reduce((a, s) => a + s.boxes, 0)).padStart(4)} boxes ~${Math.round(list.reduce((a, s) => a + s.sec, 0) / 60)} min`);
  }
  if (result.implicitSpeakers.length) console.log(`  core speakers not registered yet (common/story.js): ${result.implicitSpeakers.join(', ')}`);
  if (result.unknownExpressions.length) console.log(`  unregistered expressions: ${result.unknownExpressions.join(', ')}`);
  for (const f of result.failures) console.log(`  FAIL ${f.scope}: ${f.msg}`);
  if (lint.errors.length) console.log(`content lint errors:\n${formatFindings(lint.errors)}`);
  if (lint.warnings.length) console.log(`content lint warnings:\n${formatFindings(lint.warnings)}`);
  const ok = result.ok && !lint.errors.length;
  console.log(ok ? 'scriptcheck ok' : 'scriptcheck FAILED');
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
