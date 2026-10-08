// Script dry run (TECH_PLAN 10.3): the registered content passes `npm run scriptcheck`, and seeded
// fixture scripts prove every dry-run rule fails when it should.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registerAllData, registry, createRegistry } from '../src/content/data.js';
import { ENEMIES, ENCOUNTERS, ITEMS, ENCOUNTER_TABLES } from '../src/battle/data.js';
import { dryRun, visibleLength, readSec } from '../tools/scriptcheck.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture({ scripts, scenes, speakers = {}, objectives = {} }) {
  const reg = createRegistry({
    tables: { enemies: { ...ENEMIES }, encounters: { ...ENCOUNTERS }, items: { ...ITEMS }, zones: { ...ENCOUNTER_TABLES }, bossScripts: {} },
    onBossScript: null,
    balance: null,
  });
  reg.registerData({ id: 'fx', chapter: 'prologue', name: 'Fixture', data: {}, story: { scripts, scenes, speakers, objectives }, maps: {} });
  return reg;
}

const scene = (id, extra = {}) => ({ id, chapter: 'prologue', ...extra });
const failures = (res) => res.failures.map((f) => `${f.scope}: ${f.msg}`);
function expectFail(res, re) {
  assert.ok(res.failures.some((f) => re.test(f.msg)), `expected a failure matching ${re}; got:\n  ${failures(res).join('\n  ') || '(none)'}`);
}
const line = (n) => 'x'.repeat(n);

test('registered content passes the script dry run', async () => {
  registerAllData();
  const res = await dryRun(registry);
  assert.deepEqual(failures(res), []);
});

test('npm run scriptcheck writes transcripts and a report', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-scriptcheck-'));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/scriptcheck.mjs'), '--out', out], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /scriptcheck ok/);
  const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
  assert.ok(Array.isArray(report.scenes) && report.lint && Array.isArray(report.lint.errors));
  assert.ok(fs.existsSync(path.join(out, 'other.txt')));
});

test('box length counts visible characters only', () => {
  assert.equal(visibleLength('A *bold* move'), 11);
  assert.equal(visibleLength('é'.repeat(3)), 3);
  assert.ok(Math.abs(readSec(line(36)) - 3.2) < 1e-9);
});

test('dry run: a 101-character box fails, 100 (plus emphasis markers) passes', async () => {
  const ok = await dryRun(fixture({
    scripts: { 'fx.a': async (cs) => { await cs.say('KADE', `*${line(100)}*`); } },
    scenes: [scene('fx.a')],
  }));
  assert.deepEqual(failures(ok), []);
  const bad = await dryRun(fixture({
    scripts: { 'fx.a': async (cs) => { await cs.say([{ speaker: 'KADE', text: line(101) }]); } },
    scenes: [scene('fx.a')],
  }));
  expectFail(bad, /box over 100 characters \(101\)/);
  const talk = await dryRun(fixture({ scripts: { 'fx.talk': async (cs) => { await cs.narrate(line(120)); } }, scenes: [] }));
  expectFail(talk, /box over 100 characters \(120\)/);
});

test('dry run: scene budgets count boxes and seconds before the player gets control back', async () => {
  const say = (n) => async (cs) => { for (let i = 0; i < n; i++) await cs.say('KADE', 'Short line.'); };
  const make = (n, budget) => fixture({ scripts: { 'fx.s': say(n) }, scenes: [scene('fx.s', budget ? { budget } : {})] });
  assert.deepEqual(failures(await dryRun(make(25))), []);
  expectFail(await dryRun(make(26)), /26 boxes before the player gets control back \(budget 25\)/);
  assert.deepEqual(failures(await dryRun(make(30, { boxes: 30 }))), []);
  const split = fixture({
    scripts: { 'fx.s': async (cs) => { await say(20)(cs); await cs.battle('drone_single'); await say(20)(cs); } },
    scenes: [scene('fx.s')],
  });
  assert.deepEqual(failures(await dryRun(split)), [], 'a battle hands control back');
  const long = fixture({ scripts: { 'fx.s': async (cs) => { await cs.say('KADE', line(90)); await cs.wait(150); } }, scenes: [scene('fx.s')] });
  expectFail(await dryRun(long), /s before the player gets control back \(budget 150 s\)/);
});

test('dry run: unregistered speakers fail; registered and core speakers pass', async () => {
  const bad = await dryRun(fixture({ scripts: { 'fx.s': async (cs) => { await cs.say('STRANGER', 'Hi.'); } }, scenes: [scene('fx.s')] }));
  expectFail(bad, /unregistered speaker "STRANGER"/);
  const ok = await dryRun(fixture({
    scripts: { 'fx.s': async (cs) => { await cs.say('RUSE', 'Credits first.'); await cs.say('BOLT', 'Hi!', { expr: 'happy' }); } },
    scenes: [scene('fx.s')], speakers: { RUSE: { portrait: 'ruse' } },
  }));
  assert.deepEqual(failures(ok), []);
  const expr = await dryRun(fixture({ scripts: { 'fx.s': async (cs) => { await cs.say('KADE', 'Hm.', { expr: 'giddy' }); } }, scenes: [scene('fx.s')] }));
  assert.deepEqual(expr.unknownExpressions, ['KADE:giddy']);
});

test('dry run: at most 3 mech boxes before the first battle', async () => {
  const mech = (n) => async (cs) => {
    for (let i = 0; i < n; i++) await cs.say([{ speaker: 'BOLT', text: 'Break, then Boost.', tag: 'mech' }]);
    await cs.battle('drone_single');
    await cs.say([{ speaker: 'BOLT', text: 'After the battle.', tag: 'mech' }]);
  };
  assert.deepEqual(failures(await dryRun(fixture({ scripts: { 'fx.t': mech(3) }, scenes: [scene('fx.t')] }))), []);
  expectFail(await dryRun(fixture({ scripts: { 'fx.t': mech(4) }, scenes: [scene('fx.t')] })), /4 boxes tagged mech before the first battle/);
});

test('dry run: key scenes need two staging devices', async () => {
  const one = fixture({ scripts: { 'fx.k': async (cs) => { await cs.camera.focus('sera'); await cs.say('KADE', 'Easy.'); } }, scenes: [scene('fx.k', { key: true })] });
  expectFail(await dryRun(one), /key scene uses 1 staging device/);
  const two = fixture({
    scripts: { 'fx.k': async (cs) => { cs.music(null); await cs.camera.focus('sera'); await cs.say('KADE', 'Easy.'); } },
    scenes: [scene('fx.k', { key: true })],
  });
  assert.deepEqual(failures(await dryRun(two)), []);
  const expr = fixture({
    scripts: { 'fx.k': async (cs) => { await cs.emote('sera', '...'); await cs.say('KADE', 'Easy.', { expr: 'sad' }); } },
    scenes: [scene('fx.k', { key: true })],
  });
  assert.deepEqual(failures(await dryRun(expr)), [], 'an expression counts as a device');
});

test('dry run: every traveler in the party speaks in the chapter key scenes', async () => {
  const quiet = fixture({
    scripts: { 'fx.k': async (cs) => { cs.music(null); await cs.camera.focus('x'); await cs.join('sera'); await cs.say('SERA', 'Pod 2271.'); } },
    scenes: [scene('fx.k', { key: true })],
  });
  expectFail(await dryRun(quiet), /KADE is in the party but has no line in the chapter's key scenes/);
});

test('dry run: choices enumerate every branch, defeat only with allowDefeat', async () => {
  const seen = new Set();
  const reg = fixture({
    scripts: {
      'fx.c': async (cs) => {
        const a = await cs.choice('First?', ['A', 'B']);
        const b = await cs.choice('', ['X', 'Y']);
        const r = await cs.battle('drone_single', { allowDefeat: true });
        const r2 = await cs.battle('drone_single');
        seen.add(`${a}${b}${r}${r2}`);
      },
    },
    scenes: [scene('fx.c')],
  });
  const res = await dryRun(reg);
  assert.deepEqual(failures(res), []);
  assert.equal(res.scenes[0].paths, 8);
  assert.deepEqual([...seen].sort(), ['00defeatvictory', '00victoryvictory', '01defeatvictory', '01victoryvictory',
    '10defeatvictory', '10victoryvictory', '11defeatvictory', '11victoryvictory']);
});

test('dry run: flags carry over between scenes; cs.test reads them', async () => {
  let saw = null;
  const reg = fixture({
    scripts: {
      'fx.one': async (cs) => { cs.flag('story:fx_one'); },
      'fx.two': async (cs) => { saw = cs.test('story:fx_one & !story:fx_two'); },
    },
    scenes: [scene('fx.one'), scene('fx.two')],
  });
  const res = await dryRun(reg);
  assert.deepEqual(failures(res), []);
  assert.equal(saw, true);
  assert.ok(res.flagsSet.includes('story:fx_one') && res.conds.includes('story:fx_one & !story:fx_two'));
});

test('dry run: script errors, unknown cs calls, unknown ids and runaway loops fail', async () => {
  const res = await dryRun(fixture({
    scripts: {
      'fx.err': async () => { throw new Error('boom'); },
      'fx.unknown': async (cs) => { await cs.teleport('x'); },
      'fx.ids': async (cs) => {
        await cs.run('fx.missing');
        await cs.battle('no_such_encounter');
        await cs.goto('no_such_map', 'dock');
        await cs.give('no_such_item');
        cs.objective('no.such_objective');
        await cs.card('ch9');
      },
      'fx.loop': async (cs) => { for (;;) await cs.wait(0); },
    },
    scenes: [scene('fx.err'), scene('fx.unknown'), scene('fx.ids'), scene('fx.loop')],
  }));
  for (const re of [/script threw: boom/, /unknown cs method "cs.teleport"/, /cs.run of missing script "fx.missing"/,
    /unknown encounter "no_such_encounter"/, /goto unknown map "no_such_map"/, /unknown item "no_such_item"/,
    /unknown objective "no.such_objective"/, /unknown chapter "ch9"/, /runaway script/]) expectFail(res, re);
});
