#!/usr/bin/env node
// Dev helper: list every deco kind actually used by the assembled world (with sizes/opts) so decor sheets render at real sizes.
// usage: node tools/decor_usage.js [prefix,prefix] [--out file.js]   -> writes `window.USAGE = [...]`
const fs = require('fs');
const { loadWorld } = require('./world_check');
const sb = loadWorld(); const CD = sb.CD; const world = new CD.World(CD.ROOMS);
const args = process.argv.slice(2);
const prefixes = (args[0] && !args[0].startsWith('--') ? args[0] : '').split(',').filter(Boolean);
const oi = args.indexOf('--out');
const T = 40;
const seen = new Map();
for (const d of world.decor) {
  if (prefixes.length && !prefixes.some((p) => d.k.startsWith(p))) continue;
  const key = d.k + '|' + Math.round(d.w) + 'x' + Math.round(d.h) + '|' + JSON.stringify(d.p || {});
  if (!seen.has(key)) seen.set(key, { k: d.k, w: d.w, h: d.h, p: d.p || {}, n: 0, room: d.room || '', x: d.x, y: d.y });
  seen.get(key).n++;
}
const list = Array.from(seen.values()).sort((a, b) => a.k < b.k ? -1 : a.k > b.k ? 1 : 0);
if (oi >= 0) { fs.writeFileSync(args[oi + 1], 'window.USAGE = ' + JSON.stringify(list) + ';\n'); console.log('wrote', list.length, 'entries ->', args[oi + 1]); }
else for (const e of list) console.log(e.k.padEnd(18), String(e.w).padStart(5), 'x', String(e.h).padEnd(5), 'n=' + e.n, JSON.stringify(e.p));
