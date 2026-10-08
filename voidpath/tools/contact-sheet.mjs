#!/usr/bin/env node
// Contact sheets for the gate reviews (TECH_PLAN 11.1): every viewpoint of a location's maps at
// 1280x720 high and 390x844 medium, laid out next to the POC reference shots
// (docs/screenshots/cryo.jpg, corridor.jpg, engineering.jpg), plus every key scene's frame on a
// phone with the dialog box open.
//
//   npm run contact -- <location | map> [options]
//     --out <dir>        output folder (default shots/contact); writes <dir>/<name>.png and .html,
//                        the single shots in <dir>/<name>/ and their numbers in <dir>/<name>/sheet.json
//     --views a,b        only these viewpoints
//     --no-mobile        desktop shots only
//     --no-scenes        skip the key-scene frames
//     --no-build         use the existing dist/ pages
//     --settle <ms>      wait after the page is ready before each shot (default 2500)
//     --timeout <ms>     per page (default 180000)
//
// Viewpoints come from the registry (MapDef.viewpoints, else its spawns) and are shot with
// dist/tools/preview-world.html?map=<id>&view=<viewpoint> (S1a). Each card shows renderInfo()
// (scene and shadow calls, triangles, textures, lights) and visualLint() when the page exposes
// them. Key scenes run in dist/index.html through __VP.debug.jumpTo(chapter) and runScript(id). A
// `scenes` entry staged away from its chapter's start map names where to stand first: `jump` (a jumpTo
// target, e.g. a REG.jumps id such as 'ch1.maw'; default the chapter) and `at` ('map:spawn', a
// debug.goto after the jump), e.g. { id: 'shoals.varo_log', ..., jump: 'ch1.maw', at: 'meridian:log' }.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, pageUrlOf, launchBrowser, openPage } from './browser.mjs';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const flag = (name) => args.includes(name);
const target = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--no-mobile', '--no-scenes', '--no-build'].includes(args[i - 1])));
if (!target || flag('--help')) {
  const src = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n');
  console.log(src.slice(1, src.findIndex((l) => l.startsWith('import'))).join('\n'));
  process.exit(target ? 0 : 1);
}

const outRoot = path.resolve(opt('--out', path.join(ROOT, 'shots/contact')));
const settle = Number(opt('--settle', 2500));
const timeout = Number(opt('--timeout', 180000));
const onlyViews = opt('--views') ? opt('--views').split(',') : null;
const REFS = ['cryo', 'corridor', 'engineering'].map((n) => path.join(ROOT, 'docs/screenshots', `${n}.jpg`));
const SIZES = [
  { id: 'desktop', q: 'high', mobile: false, label: '1280x720 high' },
  ...(flag('--no-mobile') ? [] : [{ id: 'mobile', q: 'medium', mobile: true, label: '390x844 medium' }]),
];

const { registerAllData, REG, getMap } = await import('../src/content/data.js');
registerAllData();
const locId = REG.locations[target] ? target : REG.maps[target] ? Object.keys(REG.locations).find((l) => REG.locations[l].maps?.[target]) : null;
if (!locId) {
  console.error(`contact: "${target}" is neither a location nor a map (locations: ${Object.keys(REG.locations).join(', ')})`);
  process.exit(1);
}
const mapIds = REG.locations[target] ? Object.keys(REG.locations[locId].maps || {}) : [target];
const shots = [];
for (const mapId of mapIds) {
  const m = getMap(mapId);
  const views = Object.keys(m.viewpoints || {}).length ? Object.keys(m.viewpoints) : Object.keys(m.spawns || {});
  for (const vp of views) if (!onlyViews || onlyViews.includes(vp)) shots.push({ map: mapId, vp });
}
const keyScenes = flag('--no-scenes') ? [] : REG.scenes.filter((s) => s.loc === locId && s.key);
const name = target;
const dir = path.join(outRoot, name);
fs.mkdirSync(dir, { recursive: true });

if (!flag('--no-build')) {
  for (const entry of ['preview-world', ...(keyScenes.length ? ['main'] : [])]) {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'build.mjs'), '--only', entry], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(`contact: build of ${entry} failed\n${r.stdout}${r.stderr}`);
      process.exit(1);
    }
  }
}

const browser = await launchBrowser();
const problems = [];
const cards = [];

// One page load and shot; SwiftShader is slow under load, so a failed attempt is retried once.
async function capture(url, size, file, opts, attempt = 1) {
  const { ready, prepare, readyTimeout = timeout } = opts;
  const { context, page, report } = await openPage(browser, pageUrlOf(url), { mobile: size.mobile });
  let stats = null;
  let failed = null;
  try {
    await page.waitForFunction(ready, null, { timeout: readyTimeout, polling: 200 });
    if (prepare) await page.evaluate(prepare);
    await page.waitForTimeout(settle);
    stats = await page.evaluate(`(async () => {
      const P = window.__PREVIEW || {}, D = (window.__VP && window.__VP.debug) || {};
      const eng = P.engine || (P.ctx && P.ctx.engine);
      const ri = D.renderInfo ? D.renderInfo() : eng && eng.renderInfo ? eng.renderInfo() : null;
      const lintFn = D.visualLint || P.visualLint;
      let lint = null;
      try { lint = lintFn ? await lintFn() : null; } catch (e) { lint = { ok: false, problems: [String(e)] }; }
      return { ri, lint };
    })()`);
    await page.screenshot({ path: file, timeout: 120000 });
  } catch (e) {
    failed = `${path.basename(file)}: ${e.message.split('\n')[0]}`;
  }
  if (failed && attempt < 2) {
    await context.close();
    return capture(url, size, file, opts, attempt + 1);
  }
  if (failed) problems.push(failed);
  for (const err of report.errors) problems.push(`${path.basename(file)}: page error ${err.split('\n')[0]}`);
  for (const c of report.console) if (c.type === 'error') problems.push(`${path.basename(file)}: console.error ${c.text}`);
  await context.close();
  return stats;
}

for (const { map, vp } of shots) {
  for (const size of SIZES) {
    const file = path.join(dir, `${map}-${vp}-${size.id}.png`);
    const q = new URLSearchParams({ map, view: vp, at: vp, q: size.q, enc: '0' });
    const t0 = Date.now();
    const stats = await capture(`${path.join(ROOT, 'dist/tools/preview-world.html')}?${q}`, size, file, {
      ready: 'window.__PREVIEW && window.__PREVIEW.ready',
    });
    console.log(`shot ${path.relative(ROOT, file)} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    cards.push({ kind: 'view', map, vp, size, file, stats });
  }
}

for (const sc of keyScenes) {
  const file = path.join(dir, `scene-${sc.id.replace(/[^a-z0-9_.-]/gi, '_')}.png`);
  const jump = sc.jump || sc.chapter || REG.locations[locId].chapter;
  const [atMap, atSpawn] = typeof sc.at === 'string' ? sc.at.split(':') : [sc.at?.map, sc.at?.spawn];
  const stats = await capture(`${path.join(ROOT, 'dist/index.html')}?q=medium`, SIZES[1] || { mobile: true }, file, {
    ready: 'window.__VP && window.__VP.ready',
    prepare: `(async () => {
      const d = window.__VP.debug;
      if (!d.jumpTo || !d.runScript) throw new Error('__VP.debug.jumpTo / runScript missing');
      await d.jumpTo(${JSON.stringify(jump)});
      ${atMap ? `await d.goto(${JSON.stringify(atMap)}, ${JSON.stringify(atSpawn)});` : ''}
      d.runScript(${JSON.stringify(sc.id)});
      const t0 = performance.now();
      while (!document.querySelector('.vp-dlg.is-open') && performance.now() - t0 < 60000) await new Promise((r) => setTimeout(r, 200));
    })()`,
  });
  console.log(`shot ${path.relative(ROOT, file)}`);
  cards.push({ kind: 'scene', id: sc.id, file, stats });
}

// ---------------------------------------------------------------- the sheet

const rel = (f) => path.relative(outRoot, f).split(path.sep).join('/');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const statLine = (st) => {
  if (!st || !st.ri) return '';
  const r = st.ri;
  const parts = [`scene ${r.scene.calls} calls`, `shadow ${r.shadow.calls}`, `${Math.round(r.scene.triangles / 1000)}k tris`,
    `${r.textures} tex`, `${r.lights.point}p ${r.lights.spot}s ${r.lights.dir}d lights`];
  return parts.join(' · ');
};
const lintLine = (st) => {
  if (!st || !st.lint) return '';
  const l = st.lint;
  return l.ok ? 'visualLint ok' : `visualLint: ${(l.problems || []).slice(0, 3).map(esc).join('; ')}`;
};
const byView = new Map();
for (const c of cards.filter((x) => x.kind === 'view')) {
  const k = `${c.map}:${c.vp}`;
  if (!byView.has(k)) byView.set(k, []);
  byView.get(k).push(c);
}
const html = `<!doctype html><meta charset="utf-8"><title>${esc(name)} contact sheet</title>
<style>
  body { margin: 0; padding: 28px 32px 40px; background: #070b12; color: #cfe6f5; font: 13px/1.4 system-ui, sans-serif; width: 1536px; }
  h1 { font: 600 22px/1 system-ui; letter-spacing: .12em; margin: 0 0 4px; color: #ffcf7a; text-transform: uppercase; }
  .sub { color: #7f9db3; margin-bottom: 22px; }
  h2 { font: 600 12px/1 system-ui; letter-spacing: .2em; color: #8fd8ff; text-transform: uppercase; margin: 26px 0 10px; }
  .row { display: flex; gap: 14px; flex-wrap: wrap; }
  .card { background: #0d1520; border: 1px solid #1d2c3d; padding: 8px; }
  .card img { display: block; height: 270px; }
  .card .t { margin-top: 6px; font-weight: 600; color: #e6f4ff; }
  .card .s { color: #8aa6bb; font: 11px/1.4 ui-monospace, monospace; }
  .pair { display: flex; gap: 8px; align-items: flex-end; }
  .ref img { height: 270px; }
  .scene img { height: 560px; }
  .problems { color: #ff8f8f; white-space: pre-wrap; font: 12px ui-monospace, monospace; }
</style>
<h1>${esc(name)}</h1>
<div class="sub">location ${esc(locId)} · maps ${mapIds.map(esc).join(', ')} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</div>
<h2>POC references (1280x720 high)</h2>
<div class="row">${REFS.map((f) => `<div class="card ref"><img src="${rel(f)}"><div class="t">${esc(path.basename(f, '.jpg'))}</div></div>`).join('')}</div>
<h2>Viewpoints</h2>
<div class="row">${[...byView.entries()].map(([k, list]) => `<div class="card"><div class="pair">${list.map((c) => `<div><img src="${rel(c.file)}"><div class="s">${esc(c.size.label)}</div></div>`).join('')}</div>
  <div class="t">${esc(k)}</div>${list.filter((c) => c.stats?.ri || c.stats?.lint).map((c) => `<div class="s">${esc(c.size.id)}: ${[esc(statLine(c.stats)), lintLine(c.stats)].filter(Boolean).join(' · ')}</div>`).join('')}</div>`).join('')}</div>
${cards.some((c) => c.kind === 'scene') ? `<h2>Key scenes (390x844, dialog open)</h2>
<div class="row">${cards.filter((c) => c.kind === 'scene').map((c) => `<div class="card scene"><img src="${rel(c.file)}"><div class="t">${esc(c.id)}</div></div>`).join('')}</div>` : ''}
${problems.length ? `<h2>Problems</h2><div class="problems">${problems.map(esc).join('\n')}</div>` : ''}
`;
const htmlFile = path.join(outRoot, `${name}.html`);
fs.writeFileSync(htmlFile, html);
fs.writeFileSync(path.join(dir, 'sheet.json'), JSON.stringify({ location: locId, maps: mapIds, cards: cards.map(({ file, size, ...c }) => ({ ...c, size: size?.id, file: rel(file) })), problems }, null, 2));

const { context, page } = await openPage(browser, pageUrlOf(htmlFile), { size: [1600, 900] });
await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 30000 });
const png = path.join(outRoot, `${name}.png`);
await page.screenshot({ path: png, fullPage: true });
await context.close();
await browser.close();
console.log(`contact sheet ${path.relative(ROOT, png)} (${cards.length} shots${problems.length ? `, ${problems.length} problems` : ''})`);
for (const p of problems) console.log(`  problem: ${p}`);
process.exit(problems.length ? 1 : 0);
