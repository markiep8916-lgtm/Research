#!/usr/bin/env node
// Human-pace play (TECH_PLAN 10.2 `92-human-pace`, 11.7; G2 T-1): what a first-time player sits
// through on the critical path, measured on a virtual clock, with a transcript and a pacing report.
//
//   node tools/human-pace.mjs --start <title | jump> [options]      (build first: npm run build)
//   node tools/human-pace-report.mjs <out dir>                      the summary again, from report.json
//
// Options
//   --start <id>     'title' (New Journey; default) or a route segment, named by its jumpTo target
//                    ('pro.bridge', 'ch1', 'ch1.maw', ...): the run jumps there, then plays on
//   --only           play the start segment only, not the segments chained after it
//   --stop <name>    stop at a milestone, or before a segment of that name
//   --level <n>      party level after the jump (default: the segment's `level`, else the jump's own)
//   --out <dir>      output directory (default shots/pace/<start>)
//   --size WxH       viewport (default 512x288); shots asked with { hi: true } are taken at 1280x720
//   --cmd <s>        thinking time before each battle command (default 2.2)
//   --page <file>    built page (default dist/index.html)
//   --strict         exit 1 on any page error or console error
//   --list           print the route segments and exit
//   --render-every <n>  thin render: draw every n-th frame only (default VP_RENDER_EVERY or 1). Game
//                    logic and the virtual clock still step every frame; transitions and shots draw
//                    in full. About n times cheaper on SwiftShader; the numbers do not change.
//   --idle <s>       abort when the field stays free and the awaited condition false this long (120)
//   --stall-wall <m> abort when the page's clock has not moved for m wall minutes (VP_STALL_WALL, 20)
//
// Robustness: use() checks that its Confirm started that interaction (a nearby prompt can take it) and
// presses again; the Starchart, shop and pause menu are waited for with retries; a panel left open,
// a blocked state that no longer changes, a field with nothing to wait for, or a page whose clock
// stopped end the run with a clear error (in the notes, the log and report.json) instead of a silent
// stall; a goal cell that is blocked (a field boss, a prop) is approached from the nearest open point.
//
// How it stays "human" on SwiftShader (a few frames per second):
// - Virtual time: an init script feeds requestAnimationFrame a clock that advances exactly 100 ms
//   per rendered frame, and engine.timeScale = 2 makes the game step 0.1 s per frame too (its
//   MAX_DT clamp is 0.05). Game time, real-time effects (typewriter, transitions) and debug.pacing()
//   then all run on one consistent clock, as on a 10 fps machine with no frame drops.
// - Every dialog box is read: Confirm only after 1.2 s + 1 s per 18 characters (+0.3 s reaction)
//   from the moment the box opened (the scriptcheck reading model), on that virtual clock.
// - Walking uses the real arrow keys (+ Shift to run), steered along a BFS path over the live map;
//   no teleports on the critical path (a teleport is only a logged fallback when the steering is stuck).
// - Battles: the human-like policy of tests/policy.mjs (debug.autoplay('policy')) with a 2.2 s
//   "thinking" delay before each command (plus the game's own 0.3 s); tips, boss lines and results
//   are read and confirmed with Enter. Random encounters happen at the game's own rate.
// - Menus (equip, shop, Starchart, Med-Stations, "Equip now?") are driven with keys, with reading pauses.
//
// Routes: tests/routes/<loc>.mjs, written by each location owner. Default export:
//   {
//     segments: {                          keyed by a jumpTo target ('title' for New Journey)
//       'ch1.maw': {
//         level: 12,                       optional party level when the run starts here (--level wins)
//         next: 'ch1.return',              the segment that plays on from where this one ends
//         async run(d) { ... },            plays it with the driver API below; d.jumped is true when
//       },                                 the run started here (jumpTo), false when chained
//     },
//     plan: { <chapter>: { scenes: { <script id>: plan s }, bosses: { <encounter>: planned level } } },
//     legs: [{ chapter, label, map, flags, points: [[x, z], ..., { fight: encId }, ...] }],
//   }
// `plan` holds WRITING 5.10's critical-path scene plans (the report checks each against plan + 15%);
// `legs` is the critical-path walking that tools/expected-fights.mjs turns into expected fights.
//
// Driver API (d): F(flag) -> page expression; pump(until, { maxVt, minVt }); go(x, z, { until, run,
// tol }); use(id, { choices, until, after, optional, noPump }); med(id, { talk }); fly(chartId,
// destName); shopWeapons(id); equipAccessory(memberIdx, itemId); journal(name); shot(name, { hi });
// milestone(name); note(text); choose(...answers); teleport(x, z, facing); vwait(s); snap();
// eval(fn, arg); newJourney(); fightBoss({ at, script, done, onLoss, tries }); jumped; level.
//
// Output: <out>/report.json (pacing, per-chapter accounting, battles, boxes, timeline),
// transcript.txt, summary.txt (tools/human-pace-report.mjs), shots/.

import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser, newContext, pageUrlOf, ROOT } from './browser.mjs';
import { loadRoutes, summarize } from './human-pace-report.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const has = (n) => args.includes(n);
const START = opt('--start', 'title');
const STOP = opt('--stop', null);
const ONLY = has('--only');
const LEVEL = opt('--level', null);
const OUT = path.resolve(process.cwd(), opt('--out', path.join(ROOT, 'shots/pace', START)));
const SIZE = opt('--size', '512x288').split('x').map(Number);
const CMD = Number(opt('--cmd', 2.2));
const PAGE = opt('--page', path.join(ROOT, 'dist/index.html'));
const STRICT = has('--strict');
const RENDER_EVERY = Math.max(1, Math.floor(Number(opt('--render-every', process.env.VP_RENDER_EVERY || 1)) || 1));
const IDLE_VT = Number(opt('--idle', 120));
const STALL_WALL_MS = Number(opt('--stall-wall', process.env.VP_STALL_WALL || 20)) * 60000;

const routes = await loadRoutes();
if (has('--list')) {
  for (const [key, seg] of Object.entries(routes.segments)) console.log(`${key.padEnd(14)} ${seg.loc.padEnd(12)} next: ${seg.next || '-'}${seg.level ? `  level ${seg.level}` : ''}`);
  process.exit(0);
}
if (!routes.segments[START]) {
  console.error(`human-pace: no route segment "${START}" (have: ${Object.keys(routes.segments).join(', ')})`);
  process.exit(2);
}
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const VTIME = `(() => {
  const STEP = 100;
  const realRAF = window.requestAnimationFrame.bind(window);
  let vnow = null, lastReal = null;
  const tick = (real) => { if (real !== lastReal) { lastReal = real; vnow = vnow == null ? real : vnow + STEP; } return vnow; };
  window.requestAnimationFrame = (cb) => realRAF((real) => cb(tick(real)));
  const beat = (real) => { tick(real); realRAF(beat); };
  realRAF(beat);
  window.__vt = () => (vnow == null ? 0 : vnow / 1000);
})();`;

// Thin render: the engine draws every n-th frame (the game still updates every frame); transitions
// and frames a shot asks for (window.__fullRender) always draw.
const THIN = `(() => {
  const N = ${RENDER_EVERY};
  if (N <= 1) return;
  const iv = setInterval(() => {
    const e = window.__VP && window.__VP.ctx && window.__VP.ctx.engine;
    if (!e || e.__thin) return;
    const render = e.render.bind(e);
    let k = 0;
    e.render = (...a) => {
      if (window.__fullRender > 0) { window.__fullRender--; return render(...a); }
      if (e._tr || k++ % N === 0) return render(...a);
    };
    e.__thin = true;
    clearInterval(iv);
  }, 100);
})();`;

const wall0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const notes = [];      // the driver's notes (stuck, fallbacks, anomalies)
const consoleErr = [];
const milestones = [];

const browser = await launchBrowser();
const context = await newContext(browser, { size: SIZE });
const page = await context.newPage();
await page.addInitScript(VTIME);
await page.addInitScript(THIN);
page.on('console', (m) => {
  const t = m.type();
  if ((t === 'error' || t === 'warning') && !/fonts|ERR_FAILED/.test(m.text())) { consoleErr.push({ type: t, text: m.text() }); console.log(`[console.${t}] ${m.text()}`); }
});
page.on('pageerror', (e) => { consoleErr.push({ type: 'pageerror', text: String(e && e.stack || e) }); console.log(`[pageerror] ${e}`); });

await page.goto(pageUrlOf(PAGE + (PAGE.includes('?') ? '&' : '?') + 'q=low'), { waitUntil: 'load' });
await page.waitForFunction(() => window.__VP && window.__VP.ready, null, { timeout: 900000, polling: 500 });
await page.evaluate(() => { window.__VP.ctx.engine.timeScale = 2; });
await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'tools/human-pace-kit.js'), 'utf8') });
await page.evaluate((cmd) => { window.__VP.debug.autoplay('policy'); window.__PACE.humanPolicy(); window.__PACE.setDelay(cmd); }, CMD);

// ------------------------------------------------------------------ basics
const snap = () => page.evaluate(() => window.__PACE.snap());
const vt = () => page.evaluate(() => window.__vt());
const say = (...a) => console.log(`[${((Date.now() - wall0) / 60000).toFixed(1)}m wall]`, ...a);
async function vwait(sec) { const t0 = await vt(); while ((await vt()) - t0 < sec) await sleep(100); }
const readSec = (text) => 1.2 + [...String(text || '').replace(/\*/g, '')].length / 18;
const F = (f) => `window.__PACE.flag(${JSON.stringify(f)})`;

const held = new Set();
async function setKeys(want) {
  for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); }
  for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
}
const releaseAll = () => setKeys(new Set());
async function press(key) { await releaseAll(); await page.keyboard.press(key, { delay: 30 }); }

async function shot(name, { hi = false } = {}) {
  try {
    // a thin-rendered page draws the next frames in full, so the shot holds a current frame
    await page.evaluate(() => { window.__fullRender = 8; });
    if (hi) { await page.setViewportSize({ width: 1280, height: 720 }); await vwait(0.35); } else await vwait(0.3);
    await page.evaluate(() => { window.__fullRender = 4; });
    await page.screenshot({ path: path.join(OUT, 'shots', `${name}.png`), timeout: 300000 });
    if (hi) { await page.setViewportSize({ width: SIZE[0], height: SIZE[1] }); await vwait(0.2); }
    say('shot', name);
  } catch (e) { notes.push(`shot ${name} failed: ${e.message}`); }
}

class Stop extends Error {}
function milestone(name) {
  milestones.push({ name, wallMin: +((Date.now() - wall0) / 60000).toFixed(1) });
  say('milestone', name);
  if (STOP && STOP === name) throw new Stop(`stopped at ${name}`);
}

async function dump(final = false) {
  const data = await page.evaluate(() => ({
    pacing: window.__VP.debug.pacing(), acc: window.__PACE.acc, log: window.__PACE.log, boxes: window.__PACE.boxes,
    battles: window.__PACE.battles, state: window.__PACE.snap(), missingArt: window.__VP.debug.missingArt(),
    party: window.__VP.debug.party(), credits: window.__VP.ctx.state.credits, inventory: window.__VP.ctx.state.inventory,
    stats: window.__VP.ctx.state.stats, vt: window.__vt(),
  }));
  Object.assign(data, { start: START, notes, console: consoleErr, milestones, final, wallMin: +((Date.now() - wall0) / 60000).toFixed(1) });
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(data, null, 1));
  const lines = [];
  const ev = [...data.log.filter((l) => l.type !== 'script').map((l) => ({ ...l, k: 'log' })), ...data.boxes.map((b) => ({ ...b, k: 'box' }))].sort((a, b) => a.t - b.t);
  for (const e of ev) {
    const t = `${String(Math.floor(e.t / 60)).padStart(3)}:${String(Math.floor(e.t % 60)).padStart(2, '0')} [${e.ch}]`;
    if (e.k === 'box') lines.push(`${t}   ${e.battle ? '(battle) ' : ''}${e.speaker ? e.speaker + ': ' : ''}${e.text}${e.options ? '  [' + e.options.join(' | ') + ']' : ''}${e.end ? `  (${(e.end - e.t).toFixed(1)} s)` : ''}`);
    else lines.push(`${t} > ${e.type} ${JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !['t', 'ch', 'type', 'k'].includes(k))))}`);
  }
  fs.writeFileSync(path.join(OUT, 'transcript.txt'), lines.join('\n') + '\n');
  return data;
}

// ------------------------------------------------------------------ the generic handler
const choiceQueue = [];
const seenAt = new Map();
function readyFor(key, sec, s) {
  if (!seenAt.has(key)) seenAt.set(key, s.vt);
  return s.vt - seenAt.get(key) >= sec;
}
async function chooseRow(sel, want) {
  const d = Math.max(0, want) - (sel < 0 ? 0 : sel);
  for (let i = 0; i < Math.abs(d); i++) { await press(d > 0 ? 'ArrowDown' : 'ArrowUp'); await vwait(0.25); }
}
function pickChoice(rows) {
  if (!choiceQueue.length) return 0;
  const c = choiceQueue.shift();
  if (typeof c === 'number') return c;
  const i = rows.findIndex((r) => r.toLowerCase().includes(String(c).toLowerCase()));
  if (i < 0) notes.push(`choice "${c}" not among [${rows.join(' | ')}]`);
  return Math.max(0, i);
}

/** Handles whatever blocks the field (dialog, choices, battle lines, results, screens, Equip now). Returns true while blocked. */
async function handle(s) {
  if (s.results) { if (readyFor('results', 4.0, s)) { await press('Enter'); seenAt.delete('results'); await vwait(0.3); } return true; }
  if (s.say) {
    // readyFor runs first so the reading clock starts when the box opens, not when typing ends
    if (readyFor('say|' + s.say.text, readSec(s.say.text) + 0.3, s) && s.say.done) { await press('Enter'); await vwait(0.15); }
    return true;
  }
  if (s.screen) {
    if (readyFor('screen|' + s.screen, 3.0, s)) {
      notes.push(`screen "${s.screen}" at ${s.vt.toFixed(0)} s: rows ${JSON.stringify(s.screenRows)}`);
      await press('Enter'); seenAt.delete('screen|' + s.screen); await vwait(1.0);
    }
    return true;
  }
  if (s.equip) {
    // a chest's "Equip now?": read it, take the offer
    if (readyFor('equip', 2.5, s)) { await shot(`equip-now-${Math.round(s.vt)}`, { hi: true }); await press('Enter'); seenAt.delete('equip'); await vwait(0.5); }
    return true;
  }
  if (s.dlg) {
    const key = `${s.dlg.speaker}|${s.dlg.text}|${s.dlg.choice}`;
    if (s.dlg.choice) {
      if (readyFor(key, 1.0 + readSec(s.dlg.text) * 0.6 + 0.4 * s.dlg.rows.length, s)) {
        await chooseRow(s.dlg.sel, pickChoice(s.dlg.rows));
        await vwait(0.2);
        await press('Enter');
        seenAt.delete(key);
        await vwait(0.2);
      }
    } else if (readyFor(key, readSec(s.dlg.text) + 0.3, s) && s.dlg.waiting) {
      await press('Enter'); seenAt.delete(key); await vwait(0.1);
    }
    return true;
  }
  return !s.free;
}

/** Ends the run with a clear error: in the notes (report.json, summary) and on the console. */
function abort(msg, s) {
  const where = s ? ` [${s.map} (${s.x}, ${s.z}) vt ${Number(s.vt).toFixed(0)} cs ${s.cs} prompt ${s.prompt} target ${s.target}]` : '';
  notes.push(`ABORT: ${msg}${where}`);
  say('ABORT:', msg + where);
  throw new Error(msg);
}

const PANELS = ['menu', 'shop', 'star', 'saves'];

/**
 * Stall guard for the driver loops (G3-25). check(s) aborts, after retries, when the page clock stops
 * moving (wall time), a panel nobody drives stays open (Escape is tried first), a blocked state stops
 * changing (Enter and ArrowUp are tried first), or the field stays free with nothing awaited (`idle`).
 */
function watchdog(label, { idle = IDLE_VT } = {}) {
  let clock = null, panel = null, same = null, free = null, presses = 0;
  return async (s) => {
    const wall = Date.now();
    if (!clock || s.vt !== clock.vt) clock = { vt: s.vt, wall };
    else if (wall - clock.wall > STALL_WALL_MS) abort(`${label}: the page clock has not moved for ${((wall - clock.wall) / 60000).toFixed(0)} wall minutes`, s);
    const open = PANELS.find((k) => s[k]);
    if (!open) panel = null;
    else if (!panel || panel.k !== open) panel = { k: open, vt: s.vt, tries: 0 };
    else if (s.vt - panel.vt > 20) {
      if (panel.tries >= 3) abort(`${label}: the ${open} panel stays open and nothing drives it`, s);
      panel.tries++;
      panel.vt = s.vt;
      notes.push(`${label}: the ${open} panel was left open; Escape (try ${panel.tries})`);
      await press('Escape');
    }
    const sig = JSON.stringify([s.state, s.map, s.x, s.z, s.cs, s.dlg, s.say, s.results, s.screen, s.card, s.equip, s.title,
      s.battleRound, s.trans, s.party, s.free, open]);
    if (!same || same.sig !== sig) same = { sig, vt: s.vt };
    else if (!s.free && s.vt - same.vt > 240 + 60 * presses) {
      if (presses >= 3) abort(`${label}: blocked and unchanged for ${(s.vt - same.vt).toFixed(0)} s (dialog ${JSON.stringify(s.dlg)}, say ${JSON.stringify(s.say)}, screen ${s.screen})`, s);
      presses++;
      notes.push(`${label}: blocked and unchanged for ${(s.vt - same.vt).toFixed(0)} s; synthetic ${presses % 2 ? 'Enter' : 'ArrowUp + Enter'} (try ${presses})`);
      if (presses % 2 === 0) await press('ArrowUp');
      await press('Enter');
    }
    if (!(s.free && s.until === false && !s.moving)) free = null;
    else if (!free) free = s.vt;
    else if (idle && s.vt - free > idle) abort(`${label}: the field has been free for ${(s.vt - free).toFixed(0)} s and the awaited condition is still false`, s);
  };
}

/** Wait (handling dialog, battles, ...) until the field is free and `until` holds (a page expression). */
async function pump(until = null, { maxVt = 1800, minVt = 0, idle = IDLE_VT } = {}) {
  const t0 = await vt();
  const guard = watchdog(`pump(${until})`, { idle });
  for (;;) {
    const s = await page.evaluate((u) => { const s = window.__PACE.snap(); s.until = u ? !!(new Function(`return (${u});`))() : true; return s; }, until);
    if (s.vt - t0 > maxVt) { notes.push(`pump timeout (${until}) at ${s.vt.toFixed(0)}: ${JSON.stringify(s).slice(0, 400)}`); throw new Error(`pump timeout: ${until}`); }
    await guard(s);
    const blocked = await handle(s);
    if (!blocked && s.free && s.until && s.vt - t0 >= minVt) return s;
    await sleep(70);
  }
}

/** Wait until `test(snapshot)` holds, handling dialog meanwhile; false after `sec` virtual seconds. */
async function waitSnap(test, sec) {
  const t0 = await vt();
  for (;;) {
    const s = await snap();
    if (test(s)) return s;
    if (s.vt - t0 > sec) return false;
    if (s.dlg || s.say) await handle(s);
    await sleep(80);
  }
}

// ------------------------------------------------------------------ walking with keys
function keysFor(dx, dz, run) {
  const k = new Set();
  if (dx > 0.38) k.add('ArrowRight'); else if (dx < -0.38) k.add('ArrowLeft');
  if (dz > 0.38) k.add('ArrowDown'); else if (dz < -0.38) k.add('ArrowUp');
  if (run && k.size) k.add('ShiftLeft');
  return k;
}

/** Walk to goal ({ x, z, tol } or { shape, reach }); returns the snapshot on arrival or when `until` holds. */
async function walk(goal, { until = null, run = true, label = '' } = {}) {
  let stuckRef = null, stuck = 0, wiggles = 0;
  const guard = watchdog(`walk to ${label || JSON.stringify(goal)}`, { idle: 0 });
  for (;;) {
    const r = await page.evaluate(([g, u]) => {
      const s = window.__PACE.snap();
      s.until = u ? !!(new Function(`return (${u});`))() : false;
      if (s.free && !s.until) s.steer = window.__PACE.steer(g);
      return s;
    }, [goal, until]);
    if (r.until) { await releaseAll(); return r; }
    if (!r.free) { await releaseAll(); await guard(r); await handle(r); stuckRef = null; await sleep(70); continue; }
    if (r.steer.arrived) { await releaseAll(); return r; }
    if (r.steer.nopath && goal.x != null && !goal.alt) {
      // the goal cell is blocked (a field boss, a prop): aim at the nearest open point around it
      const alt = await page.evaluate((g) => {
        for (const rad of [1.0, 1.6, 2.2]) {
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2;
            const c = { x: g.x + Math.cos(a) * rad, z: g.z + Math.sin(a) * rad, tol: g.tol || 0.6 };
            const p = window.__PACE.plan(c);
            if (p && p.length) return c;
          }
        }
        return null;
      }, goal);
      if (alt) {
        notes.push(`goal ${label || JSON.stringify(goal)} is blocked; aiming at (${alt.x.toFixed(2)}, ${alt.z.toFixed(2)})`);
        goal = { ...alt, alt: true };
        await page.evaluate(() => window.__PACE.invalidate());
        continue;
      }
    }
    if (r.steer.nopath) {
      await releaseAll();
      notes.push(`no path to ${label || JSON.stringify(goal)} from ${r.map} (${r.x}, ${r.z}) at ${r.vt.toFixed(0)}`);
      throw new Error(`no path: ${label}`);
    }
    await setKeys(keysFor(r.steer.dx, r.steer.dz, run));
    // stuck detection on the virtual clock
    if (!stuckRef || Math.hypot(r.x - stuckRef.x, r.z - stuckRef.z) > 0.3) stuckRef = { x: r.x, z: r.z, t: r.vt };
    else if (r.vt - stuckRef.t > 2.0) {
      stuck++;
      await page.evaluate(() => window.__PACE.invalidate());
      if (stuck > 5) {
        notes.push(`steering stuck near ${r.map} (${r.x}, ${r.z}) toward ${label || JSON.stringify(goal)}; nudged by teleport`);
        const nxt = await page.evaluate((g) => { const p = window.__PACE.plan(g); return p && p[Math.min(p.length - 1, 6)]; }, goal);
        // a teleport inside a field boss's radius would seed it disarmed (explore.js): arm the bosses
        // as a walk-in from afar would, so the nudge cannot skip a confrontation
        if (nxt) {
          await page.evaluate(([x, z]) => {
            window.__VP.debug.teleport(x, z);
            const e = window.__VP.ctx.game.states.explore;
            for (const [id, b] of Object.entries(e.world.bosses || {})) if (b.present) e._armed.set(id, true);
          }, nxt);
        }
        stuck = 0;
      } else {
        // wiggle sideways a moment
        const side = (wiggles++ % 2) ? ['ArrowLeft', 'ArrowUp'] : ['ArrowRight', 'ArrowDown'];
        await setKeys(new Set([side[Math.abs(r.steer.dx) > Math.abs(r.steer.dz) ? 1 : 0]]));
        await vwait(0.4);
      }
      stuckRef = null;
    }
    await sleep(60);
  }
}
const go = (x, z, o = {}) => walk({ x, z, tol: o.tol || 0.6 }, { ...o, label: o.label || `${x},${z}` });

/** Face a target's centre with short taps until the prompt names it. */
async function faceTarget(t, id) {
  for (let k = 0; k < 6; k++) {
    const s = await snap();
    if (!s.free) { await handle(s); continue; }
    if (s.target === id) return true;
    const dx = t.cx - s.x, dz = t.cz - s.z;
    await setKeys(new Set([Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dz > 0 ? 'ArrowDown' : 'ArrowUp')]));
    await vwait(0.1);
    await releaseAll();
    await vwait(0.25);
  }
  return (await snap()).target === id;
}

/** Walk up to an interactable / NPC / chest / door, face it and press Confirm; then let it play out. */
async function use(id, { choices = [], until = null, after = null, run = true, optional = false, noPump = false } = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const t = await page.evaluate((i) => window.__PACE.targetOf(i), id);
    if (!t || !t.enabled) {
      if (optional) { notes.push(`optional target ${id} not available`); return null; }
      notes.push(`target ${id} missing or disabled`); throw new Error(`no target ${id}`);
    }
    let r;
    try { r = await walk({ shape: t.shape, reach: t.reach }, { until, run, label: id }); } catch (e) {
      if (optional) { notes.push(`optional ${id}: ${e.message}`); return null; }
      throw e;
    }
    if (until && r.until) return r;
    if (await faceTarget(t, id)) {
      await vwait(0.3);
      const took = await confirmTaken(t, id);
      if (took === id) {
        choiceQueue.push(...choices);
        // let the interaction start, then play it out
        const t0 = (await snap()).vt;
        for (;;) { const q = await snap(); if (!q.free || q.vt - t0 > 1.2) break; await sleep(60); }
        return noPump ? snap() : pump(after);
      }
      if (took) {
        // a nearby prompt (a lift, a cadet walking past) took the Confirm: let that play out, go again
        notes.push(`use ${id}: the Confirm went to ${took}; again`);
        await pump();
      } else {
        const q = await snap();
        if (optional) { notes.push(`optional ${id}: Confirm not taken after 3 presses (prompt ${q.prompt}, target ${q.target})`); return null; }
        abort(`use ${id}: the Confirm was not taken after 3 presses (the prompt names ${q.target || 'nothing'})`, q);
      }
    } else notes.push(`facing ${id} failed, retry ${attempt}`);
    await page.evaluate(() => window.__PACE.invalidate());
  }
  if (optional) return null;
  abort(`could not use ${id} after 6 attempts`, await snap());
}

/** Press Confirm (up to 3 times, facing again in between) until the field starts an interaction: its id, or null. */
async function confirmTaken(t, id) {
  const n0 = await page.evaluate(() => window.__PACE.interacts.length);
  for (let k = 0; k < 3; k++) {
    if (k) await faceTarget(t, id);
    await press('Enter');
    const t0 = (await snap()).vt;
    for (;;) {
      const q = await page.evaluate((n) => ({ s: window.__PACE.snap(), it: window.__PACE.interacts.slice(n) }), n0);
      if (q.it.length) return q.it[0].id;
      if (q.s.vt - t0 > 1.5) break;
      if (q.s.dlg || q.s.say) await handle(q.s);
      await sleep(60);
    }
  }
  return null;
}

/** Med-Station: Restore, then a Party Talk when one is offered. */
async function med(id, { talk = true } = {}) {
  await use(id, { choices: ['Rest'] });   // 'Restore' at a Med-Station, 'Rest' at an inn
  if (!talk) return;
  const pts = await page.evaluate(() => window.__PACE.ptalks());
  if (pts.length) {
    say('party talk', pts[0]);
    await use(id, { choices: ['Party Talk', 0] });
  }
}

// ------------------------------------------------------------------ menus
const mstate = () => page.evaluate(() => {
  const m = window.__VP.ctx.ui.menu; const pg = m.page || {};
  return { open: m.isOpen, tab: m.tab, mode: pg.mode, slot: pg._slot, member: pg._member };
});

/** Pause menu: Tab until it opens (a Tab can land while the field is still busy), else abort. */
async function openMenu() {
  for (let k = 0; k < 3; k++) {
    await press('Tab');
    if (await waitSnap((q) => q.menu, 3)) { await vwait(0.5); return; }
    const q = await snap();
    if (!q.free) await pump();
  }
  abort('the pause menu did not open after 3 presses of Tab', await snap());
}

async function closeMenu() {
  await press('Tab'); await vwait(0.6);
  for (let i = 0; i < 3 && (await mstate()).open; i++) { await press('Escape'); await vwait(0.5); }
}

/** Pause menu -> Equip -> member -> accessory slot -> the item, as a player does after a tip. */
async function equipAccessory(memberIdx, itemId) {
  await openMenu();
  let m = await mstate();
  for (let i = 0; i < 8 && m.tab !== 1; i++) { await press('KeyE'); await vwait(0.5); m = await mstate(); }
  await vwait(1.5);
  await shot('menu-equip-tab', { hi: true });
  await press('Enter'); await vwait(0.6);
  for (let i = 0; i < 4 && (await mstate()).member !== memberIdx; i++) { await press('ArrowRight'); await vwait(0.6); }
  for (let i = 0; i < 4 && (await mstate()).slot !== 2; i++) { await press('ArrowDown'); await vwait(0.5); }
  await vwait(1.0);
  await press('Enter'); await vwait(1.5);
  await shot('menu-equip-list', { hi: true });
  await press('Enter'); await vwait(1.5);
  const ok = await page.evaluate(([mi, it]) => window.__VP.ctx.state.party[mi].equip && window.__VP.ctx.state.party[mi].equip.accessory === it, [memberIdx, itemId]);
  await shot('menu-equip-done', { hi: true });
  await closeMenu();
  if (!ok) notes.push(`equip of ${itemId} via the menu did not land`);
  return ok;
}

/** Pause menu -> Journal: a shot and the text in the notes. */
async function journal(name) {
  await openMenu();
  let m = await mstate();
  for (let i = 0; i < 8 && m.tab !== 3; i++) { await press('KeyE'); await vwait(0.4); m = await mstate(); }
  await vwait(2.5);
  await shot(name, { hi: true });
  const text = await page.evaluate(() => document.querySelector('.vp-menu-body')?.innerText || '');
  notes.push(`journal ${name}: ${text.replace(/\s+/g, ' ').slice(0, 400)}`);
  await closeMenu();
}

/** Starchart: pick a destination by name and set course. */
async function fly(chartId, destName) {
  const t = await page.evaluate((i) => window.__PACE.targetOf(i), chartId);
  if (!t) throw new Error(`no Starchart "${chartId}" here`);
  for (let k = 0; ; k++) {
    await use(chartId, { noPump: true });
    if (await waitSnap((q) => q.star, 20)) break;
    if (k >= 2) abort(`the Starchart panel did not open at ${chartId}`, await snap());
    notes.push(`the Starchart panel did not open; again (${k + 1})`);
    await pump();
  }
  await vwait(2.5);
  await shot(`starchart-${destName.toLowerCase()}`, { hi: true });
  for (let i = 0; i < 8; i++) {
    const sel = await page.evaluate(() => document.querySelector('.vp-star-node.is-sel .vp-star-lbl b')?.textContent || '');
    if (sel.toLowerCase().includes(destName.toLowerCase())) break;
    await press('ArrowRight'); await vwait(0.6);
  }
  await vwait(1.5);
  for (let k = 0; ; k++) {
    await press('Enter');
    if (await waitSnap((q) => !q.star, 5)) break;
    if (k >= 2) abort(`the Starchart did not take the course to ${destName}`, await snap());
  }
  milestone(`fly ${destName}`);
  return pump(null, { minVt: 2 });
}

/** A shop: buy the best weapon upgrade for each traveller the credits allow, equip on the spot, two Medi-Gels. */
async function shopWeapons(id) {
  await use(id, { noPump: true });
  // the shop holds its script open: wait for the window
  if (!(await waitSnap((q) => q.shop, 30))) abort(`the shop ${id} did not open`, await snap());
  await vwait(3.0);
  await shot('shop-open', { hi: true });
  const plan = await page.evaluate(() => {
    const sh = window.__VP.ctx.ui.shop; const ui = window.__VP.ctx.ui; const st = window.__VP.ctx.state;
    const rows = sh._entries();
    const picks = [];
    let credits = st.credits;
    for (const m of st.party) {
      let best = null;
      rows.forEach((r, i) => {
        if (!r.info.equip || r.info.equip.slot !== 'weapon' || r.price > credits || !ui.rules.canEquip(m, r.id)) return;
        const d = ui.rules.equipDelta(m, 'weapon', r.id) || {};
        const g = (d.atk || 0) + (d.mag || 0) + (d.spd || 0);
        if (g > 0 && (!best || g > best.g)) best = { i, g, id: r.id, price: r.price, name: r.info.name, who: m.id };
      });
      if (best) { picks.push(best); credits -= best.price; }
    }
    return { picks, rows: rows.map((r) => `${r.info.name} ${r.price}`), credits: st.credits };
  });
  notes.push(`shop stock: ${plan.rows.join(', ')}; credits ${plan.credits}; picks ${plan.picks.map((p) => `${p.name}->${p.who}`).join(', ')}`);
  const selectRow = async (want) => {
    for (let i = 0; i < 40; i++) {
      const sel = await page.evaluate(() => window.__VP.ctx.ui.shop._sel);
      if (sel === want) return;
      await press(sel < want ? 'ArrowDown' : 'ArrowUp'); await vwait(0.35);
    }
  };
  for (const p of plan.picks) {
    await selectRow(p.i);
    await vwait(3.5);   // reading the detail panel, comparing arrows
    await press('Enter'); await vwait(1.2);
    if (await page.evaluate(() => window.__VP.ctx.ui.shop.popup.isOpen)) { await shot(`shop-equip-now-${p.who}`, { hi: true }); await vwait(1.5); await press('Enter'); await vwait(1.0); }
  }
  const medi = await page.evaluate(() => window.__VP.ctx.ui.shop._entries().findIndex((r) => r.id === 'medigel'));
  if (medi >= 0) {
    await selectRow(medi);
    await vwait(1.5); await press('Enter'); await vwait(0.8); await press('ArrowRight'); await vwait(0.5); await press('Enter'); await vwait(1.0);
  }
  await shot('shop-after', { hi: true });
  await press('Escape'); await vwait(0.6);
  if ((await snap()).shop) { await press('Escape'); await vwait(0.6); }
  return pump();
}

// ------------------------------------------------------------------ flows

/** Title -> New Journey (at a reading pace). */
async function newJourney() {
  await page.waitForFunction(() => window.__VP.ctx.ui.title.isOpen && window.__VP.ctx.ui.title.phase === 'press', null, { timeout: 300000, polling: 300 });
  await vwait(2.0);
  await shot('title', { hi: true });
  await press('Enter');
  await page.waitForFunction(() => window.__VP.ctx.ui.title.phase === 'menu', null, { timeout: 120000, polling: 200 });
  await vwait(1.5);
  await press('Enter');
  milestone('new journey');
}

/**
 * A field boss: walk to `at` until the fight starts (its script `script` runs, or `done` holds),
 * play it out; on a loss run `onLoss` (Retry has respawned the party) and try again.
 */
async function fightBoss({ at, script, done, onLoss = null, tries = 4 }) {
  for (let n = 0; n < tries; n++) {
    await go(at[0], at[1], { until: `${done} || window.__VP.ctx.cutscenes.current === ${JSON.stringify(script)}` });
    await pump(null, { maxVt: 4000, minVt: 1 });
    if (await page.evaluate((u) => !!(new Function(`return (${u});`))(), done)) return true;
    notes.push(`boss attempt ${n + 1} (${script}) did not finish: lost?`);
    if (onLoss) await onLoss();
  }
  return false;
}

/** Jump to a segment's start the way debug.jumpTo does, at the segment's (or --level's) level. */
async function jumpTo(key, seg) {
  await page.evaluate((t) => window.__VP.debug.jumpTo(t), key);
  await pump();
  const lv = LEVEL != null ? Number(LEVEL) : seg.level;
  if (lv) await page.evaluate((l) => { window.__VP.debug.setLevel(l); window.__VP.debug.heal(); }, lv);
  notes.push(`started at jumpTo('${key}')${lv ? ` at level ${lv}` : ''}`);
}

const api = (jumped, seg) => ({
  F, pump, go, use, med, fly, shopWeapons, equipAccessory, journal, shot, milestone, vwait, snap, newJourney, fightBoss,
  note: (text) => notes.push(text),
  choose: (...answers) => { choiceQueue.push(...answers); },
  teleport: (x, z, facing) => page.evaluate(([a, b, f]) => window.__VP.debug.teleport(a, b, f), [x, z, facing]),
  eval: (fn, arg) => page.evaluate(fn, arg),
  jumped, level: LEVEL != null ? Number(LEVEL) : seg.level || null,
});

// ------------------------------------------------------------------ main
let failed = null;
const keepDumping = setInterval(() => { dump().catch(() => {}); }, 240000);
try {
  let key = START;
  let jumped = true;
  while (key) {
    const seg = routes.segments[key];
    if (!seg) { notes.push(`no route segment "${key}" yet: the run ends here`); break; }
    if (STOP && STOP === key) throw new Stop(`stopped before ${key}`);
    if (jumped && key !== 'title') await jumpTo(key, seg);
    milestone(`segment ${key}`);
    await seg.run(api(jumped, seg));
    await dump();
    if (ONLY) break;
    key = seg.next || null;
    jumped = false;
  }
} catch (e) {
  notes.push(`run ended: ${e && e.message}`);
  if (e instanceof Stop) say('stop:', e.message);
  else {
    failed = e;
    say('FAILED', e && e.stack);
    await shot('failure').catch(() => {});
  }
} finally {
  clearInterval(keepDumping);
  await releaseAll().catch(() => {});
  const data = await dump(true).catch((e) => { console.log('dump failed', e); return null; });
  if (data) {
    const text = summarize(data, routes);
    fs.writeFileSync(path.join(OUT, 'summary.txt'), text + '\n');
    console.log(text);
  }
  await browser.close();
  const errors = consoleErr.filter((c) => c.type !== 'warning').length;
  process.exit(failed ? 1 : STRICT && errors ? 1 : 0);
}
