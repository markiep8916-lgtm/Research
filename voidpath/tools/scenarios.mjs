#!/usr/bin/env node
// Runs the scripted end-to-end scenarios in tests/scenarios/*.json against a built page with
// tools/play.mjs --strict (0 page errors and 0 console errors to pass), one after the other.
//
//   node tools/scenarios.mjs                 all scenarios against dist/index.html
//   node tools/scenarios.mjs 03 05           only files whose name contains one of the filters
//   node tools/scenarios.mjs --page dist/index.html?q=medium
//
// A scenario whose file name contains "mobile" runs with --mobile. Screenshots and report.json land
// in shots/scenarios/<scenario name>/.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const pi = args.indexOf('--page');
const page = pi >= 0 ? args.splice(pi, 2)[1] : 'dist/index.html';
const filters = args;

const dir = path.join(ROOT, 'tests/scenarios');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && (!filters.length || filters.some((x) => f.includes(x)))).sort();
let failed = 0;
for (const f of files) {
  const name = f.replace(/\.json$/, '');
  const t0 = Date.now();
  const cmd = [path.join(ROOT, 'tools/play.mjs'), page, '--strict', '--steps', path.join(dir, f),
    '--out', path.join(ROOT, 'shots/scenarios', name), '--timeout', '1200000', ...(f.includes('mobile') ? ['--mobile'] : [])];
  const r = spawnSync(process.execPath, cmd, { cwd: ROOT, encoding: 'utf8' });
  const ok = r.status === 0;
  if (!ok) failed++;
  const tail = (r.stdout || '').trim().split('\n').filter((l) => /failed|pageerror|console\.error|done:|TIMEOUT/.test(l));
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  for (const l of tail) console.log(`    ${l}`);
}
console.log(`${files.length - failed}/${files.length} scenarios passed`);
process.exit(failed ? 1 : 0);
