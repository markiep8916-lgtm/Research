#!/usr/bin/env node
// Load the world data headlessly (no DOM), validate it, and print diagnostics.
// usage: node tools/world_check.js [--dump roomId] [--list] [--summary] [--json out.json]
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
function loadWorld() {
  const sandbox = { console, Math, JSON, Uint8Array, Int16Array, Int32Array, Float32Array, Array, Object, Set, Map, String, Number, Date };
  sandbox.window = sandbox; sandbox.document = { createElement: () => ({ getContext: () => ({}), width: 0, height: 0 }) };
  vm.createContext(sandbox);
  const manifestSrc = fs.readFileSync(path.join(root, 'src/manifest.js'), 'utf8'); vm.runInContext(manifestSrc, sandbox);
  const files = sandbox.CD_MANIFEST.filter((f) => /^(core\/util|world\/)/.test(f));
  for (const f of files) { try { vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), sandbox, { filename: f }); } catch (e) { console.error('ERR loading', f, e.message); process.exit(2); } }
  return sandbox;
}
if (require.main === module) {
  const args = process.argv.slice(2);
  const sb = loadWorld(); const CD = sb.CD;
  const world = new CD.World(CD.ROOMS);
  const list = args.includes('--list');
  if (list || args.includes('--summary')) {
    const byReg = {}; for (const r of world.rooms) { (byReg[r.region] = byReg[r.region] || []).push(r); }
    for (const reg in byReg) { console.log('== ' + reg + ' (' + byReg[reg].length + ' rooms)'); byReg[reg].forEach((r) => console.log('  ' + r.id.padEnd(16) + r.name.padEnd(26) + 'x' + String(r.x0).padStart(4) + ' y' + String(r.y0).padStart(4) + '  ' + r.w + 'x' + r.h)); }
    console.log('world ' + world.W + 'x' + world.H + ' tiles; spawns ' + world.spawns.length + '; decor ' + world.decor.length);
    const cnt = {}; for (const s of world.spawns) cnt[s.t] = (cnt[s.t] || 0) + 1; console.log('spawns:', JSON.stringify(cnt));
  }
  const di = args.indexOf('--dump');
  if (di >= 0) {
    const id = args[di + 1]; const r = world.roomById[id]; if (!r) { console.error('no room', id); process.exit(1); }
    console.log(id + ' ' + r.name + ' @' + r.x0 + ',' + r.y0 + ' ' + r.w + 'x' + r.h);
    const rowsOut = ['     ' + Array.from({ length: r.w }, (_, i) => (i % 10 === 0 ? String((i / 10) % 10) : ' ')).join('')];
    for (let y = 0; y < r.h; y++) { let line = ''; for (let x = 0; x < r.w; x++) { const gx = r.x0 + x, gy = r.y0 + y; const t = world.tile(gx, gy); line += t === 0 ? (world.spawns.find((s) => s.tx === gx && s.ty === gy) ? '@' : '.') : t === 1 ? '#' : t === 2 ? '=' : t === 3 ? '^' : t === 4 ? 'v' : t === 5 ? 'X' : t === 6 ? 'H' : t === 7 ? '~' : '?'; } rowsOut.push((r.y0 + y + '').padStart(4) + ' ' + line); }
    console.log(rowsOut.join('\n'));
  }
  const ji = args.indexOf('--json'); if (ji >= 0) fs.writeFileSync(args[ji + 1], JSON.stringify({ W: world.W, H: world.H, rooms: world.rooms.map((r) => ({ id: r.id, name: r.name, region: r.region, x0: r.x0, y0: r.y0, w: r.w, h: r.h })) }));
  if (world.warnings.length) console.log('WARNINGS (' + world.warnings.length + '):\n' + world.warnings.map((w) => '  ' + w).join('\n'));
  if (world.errors.length) { console.log('ERRORS (' + world.errors.length + '):\n' + world.errors.map((w) => '  ' + w).join('\n')); process.exit(1); }
  console.log('world OK: ' + world.rooms.length + ' rooms');
}
module.exports = { loadWorld };
