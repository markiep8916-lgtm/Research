#!/usr/bin/env node
// Runs the scripted end-to-end scenarios in tests/scenarios/*.json against a built page with
// tools/play.mjs --strict (0 page errors and 0 console errors to pass).
//
//   node tools/scenarios.mjs                 all scenarios against dist/index.html
//   node tools/scenarios.mjs 03 05           only files whose name contains one of the filters
//   node tools/scenarios.mjs --page dist/index.html?q=medium
//   node tools/scenarios.mjs --timeout 3600000 10-prologue    per-scenario timeout in ms
//   node tools/scenarios.mjs --jobs 3 10 11 12 run up to 3 scenarios at once
//
// Options
//   --page <page>          page to run (default dist/index.html)
//   --timeout <ms>         per-scenario timeout passed to play.mjs (default 7200000 = 2 hours, or
//                          the VP_SCENARIO_TIMEOUT environment variable): the location scenarios
//                          (10-prologue, 12-shoals) take 40-75 min on SwiftShader under load
//   --shot-timeout <ms>    per-screenshot timeout passed to play.mjs (default: play.mjs's own)
//   --jobs <n>             scenarios run in parallel (default 1; each one is a headless browser,
//                          so more jobs make every frame slower)
//
// A scenario whose file name contains "mobile" runs with --mobile. Screenshots and report.json land
// in shots/scenarios/<scenario name>/.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_TIMEOUT = 7200000;
const args = process.argv.slice(2);
const take = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : dflt;
};
const page = take('--page', 'dist/index.html');
const timeout = Number(take('--timeout', process.env.VP_SCENARIO_TIMEOUT || DEFAULT_TIMEOUT));
const shotTimeout = take('--shot-timeout', null);
const jobs = Math.max(1, Number(take('--jobs', 1)) || 1);
if (!(timeout > 0)) {
  console.error('scenarios: --timeout needs a positive number of milliseconds');
  process.exit(2);
}
const filters = args;

const dir = path.join(ROOT, 'tests/scenarios');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && (!filters.length || filters.some((x) => f.includes(x)))).sort();

function runOne(f) {
  const name = f.replace(/\.json$/, '');
  const t0 = Date.now();
  const cmd = [path.join(ROOT, 'tools/play.mjs'), page, '--strict', '--steps', path.join(dir, f),
    '--out', path.join(ROOT, 'shots/scenarios', name), '--timeout', String(timeout),
    ...(shotTimeout ? ['--shot-timeout', String(shotTimeout)] : []), ...(f.includes('mobile') ? ['--mobile'] : [])];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      const ok = code === 0;
      const tail = out.trim().split('\n').filter((l) => /failed|pageerror|console\.error|done:|TIMEOUT/.test(l));
      console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
      for (const l of tail) console.log(`    ${l}`);
      resolve(ok);
    });
  });
}

let failed = 0;
const queue = files.slice();
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, async () => {
  while (queue.length) if (!(await runOne(queue.shift()))) failed++;
}));
console.log(`${files.length - failed}/${files.length} scenarios passed`);
process.exit(failed ? 1 : 0);
