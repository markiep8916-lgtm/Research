#!/usr/bin/env node
// Static QA of everything placed in rooms: embedded/floating spawns, missing headroom, unframed doors, missing arenas,
// duplicate ids, undefined holotapes, bed/vending coverage per region. usage: node tools/spawn_check.js [--verbose]
const fs = require('fs'), path = require('path');
const { loadWorld } = require('./world_check');
const root = path.resolve(__dirname, '..');
const sb = loadWorld(), CD = sb.CD, TILE = CD.TILE;
const world = new CD.World(CD.ROOMS);
const verbose = process.argv.includes('--verbose');
const errs = [], warns = [];
const E = (s, m) => errs.push((s.roomId || '?') + ' (' + s.tx + ',' + s.ty + ') ' + s.t + ': ' + m);
const W = (s, m) => warns.push((s.roomId || '?') + ' (' + s.tx + ',' + s.ty + ') ' + s.t + ': ' + m);
const solid = (x, y) => CD.isSolidTile(world.tile(x, y));
const support = (x, y) => solid(x, y + 1) || world.tile(x, y + 1) === TILE.PLAT || world.tile(x, y + 1) === TILE.LADDER;
const GROUND = { radroach: 1, molerat: 1, scorpion: 1, mirelurk: 1, ghoul: 2, raider: 2, raider_rifle: 2, raider_smg: 2, brute: 3, mutant: 3, protectron: 2, glowing: 2 };
const FLY = { bloatfly: [1, 1], eyebot: [2, 2], handy: [2, 2] };
const PROPS = { bed: 1, terminal: 2, nuka: 2, crate: 1, locker: 2, firebarrel: 1, npc: 2, caps: 0, stimpak: 0, ammo: 0, radaway: 0 };

// ---- per-spawn checks
const ids = {}; const dup = (k, s) => { if (ids[k]) E(s, 'duplicate id ' + k + ' (also ' + ids[k] + ')'); else ids[k] = s.roomId; };
for (const s of world.spawns) {
  if (s.t === 'start') continue;
  const { tx, ty } = s;
  if (solid(tx, ty) && s.t !== 'door') E(s, 'spawn cell is solid');
  if (GROUND[s.t] !== undefined) {
    if (!support(tx, ty)) E(s, 'no floor under spawn (falls)');
    for (let k = 1; k <= GROUND[s.t]; k++) if (solid(tx, ty - k)) { E(s, 'no headroom (needs ' + (GROUND[s.t] + 1) + ' free tiles)'); break; }
  } else if (FLY[s.t]) {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -FLY[s.t][1]; dy <= 0; dy++) if (solid(tx + dx, ty + dy)) { W(s, 'flyer starts close to a wall/ceiling'); dx = 2; break; }
  } else if (s.t === 'turret') {
    if (!(solid(tx, ty - 1) || solid(tx, ty + 1) || solid(tx - 1, ty) || solid(tx + 1, ty))) E(s, 'turret has nothing to mount on');
  } else if (s.t === 'fluoro') {
    if (!solid(tx, ty - 1)) E(s, 'ceiling light with no ceiling');
  } else if (s.t === 'walllamp') {
    if (!(solid(tx - 1, ty) || solid(tx + 1, ty))) W(s, 'wall lamp not touching a wall');
  } else if (PROPS[s.t] !== undefined) {
    if (['bed', 'terminal', 'nuka', 'locker', 'npc', 'firebarrel', 'crate'].includes(s.t) && !support(tx, ty)) E(s, 'no floor under ' + s.t);
    if (PROPS[s.t] >= 2) for (let k = 1; k <= 2; k++) if (solid(tx, ty - k)) { E(s, 'no headroom for ' + s.t); break; }
  }
  if (s.t === 'pickup' && s.k !== 'bobble' && !s.requires && s.k !== 'holotape' && support(tx, ty) === false && !solid(tx, ty + 1)) { /* floating pickups are allowed (collectibles on jump routes) */ }
  if (s.t === 'terminal' && s.id) dup('terminal:' + s.id, s);
  if (s.t === 'npc' && s.id) dup('npc:' + s.id, s);
  if (s.t === 'trigger' && s.id) dup('trigger:' + s.id, s);
  if (s.t === 'door') {
    const w = s.w || 1, h = s.h || 3;
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (solid(tx + x, ty - y)) E(s, 'door footprint overlaps solid');
    const top = ty - h; let framed = true;
    for (let x = 0; x < w; x++) if (!solid(tx + x, top)) framed = false;
    if (!framed) E(s, 'door has no lintel above it (player can walk around)');
    if (!(solid(tx - 1, ty) || world.tile(tx - 1, ty) === TILE.DOOR) && !solid(tx + w, ty)) { /* open on both sides: fine */ }
    if (!solid(tx, ty + 1)) E(s, 'door has no floor under it');
  }
  if (s.t === 'pickup' && s.k === 'holotape' && s.id) { s._tape = true; }
  if (s.t === 'trigger' && s.boss) s._boss = true;
}
// ---- bosses need arenas
const arenas = {}; for (const s of world.spawns) if (s.t === 'arena') arenas[s.boss] = s;
for (const s of world.spawns) if (s.t === 'trigger' && s.boss && s.boss !== 'warden') {
  const a = arenas[s.boss]; if (!a) { E(s, 'boss trigger "' + s.boss + '" has no arena mark'); continue; }
  const r = world.roomById[a.roomId];
  if (!solid(a.tx + 0, r.y0 + a.floor)) { /* floor tile check uses the mark column */ E(a, 'arena floor row ' + a.floor + ' is not solid at the mark column'); }
  (a.gates || []).forEach((g, i) => { const gx = a.tx + g.dx, gy = a.ty + g.dy; for (let x = 0; x < g.w; x++) for (let y = 0; y < g.h; y++) { if (solid(gx + x, gy + y)) E(a, 'gate ' + i + ' overlaps solid at ' + (gx + x) + ',' + (gy + y)); if (world.roomIdx[(gy + y) * world.W + gx + x] < 0) E(a, 'gate ' + i + ' outside any room'); } });
  const sp = { tx: a.tx + (a.spawn ? a.spawn[0] : 0), ty: a.ty + (a.spawn ? a.spawn[1] : 0) }; if (solid(sp.tx, sp.ty)) E(a, 'boss spawn cell is solid');
  const rw = r.w, rh = r.h; if (rw < 36 || rh < 18) W(a, 'arena room is small (' + rw + 'x' + rh + ')');
}
for (const b of ['warlord', 'glowing_one', 'deathclaw', 'sentry', 'overseer']) { const has = world.spawns.some((s) => s.t === 'trigger' && s.boss === b); if (!has) warns.push('boss "' + b + '" has no trigger yet'); }
// ---- holotape references
const story = fs.readFileSync(path.join(root, 'src/game/story.js'), 'utf8'); const known = new Set(Object.keys(sb.CD.HOLOTAPES || {})); (story.match(/tape_\w+(?=:)/g) || []).forEach((k) => known.add(k));
for (const s of world.spawns) { if (s.t === 'pickup' && s.k === 'holotape' && !known.has(s.id)) E(s, 'undefined holotape ' + s.id); if (s.t === 'terminal' && s.holotape && !known.has(s.holotape)) E(s, 'undefined holotape ' + s.holotape); }
// ---- coverage per region
const cov = {};
for (const s of world.spawns) { const r = world.roomById[s.roomId]; if (!r) continue; const c = (cov[r.region] = cov[r.region] || { rooms: 0, bed: 0, nuka: 0, terminal: 0, tapes: 0, bobble: 0, hp: 0, ammoUp: 0, weapons: 0, enemies: 0 }); if (s.t === 'bed') c.bed++; if (s.t === 'nuka') c.nuka++; if (s.t === 'terminal') c.terminal++; if (s.t === 'pickup') { if (s.k === 'holotape') c.tapes++; if (s.k === 'bobble') c.bobble++; if (s.k === 'upgrade' && s.u === 'hp') c.hp++; if (s.k === 'upgrade' && s.u !== 'hp') c.ammoUp++; if (s.k === 'weapon') c.weapons++; } if (GROUND[s.t] || FLY[s.t] || s.t === 'turret') c.enemies++; }
for (const r of world.rooms) (cov[r.region] = cov[r.region] || { rooms: 0, bed: 0, nuka: 0, terminal: 0, tapes: 0, bobble: 0, hp: 0, ammoUp: 0, weapons: 0, enemies: 0 }).rooms++;
console.log('region coverage:'); for (const k in cov) console.log('  ' + k.padEnd(9), JSON.stringify(cov[k]));
if (warns.length && (verbose || warns.length < 40)) console.log('WARNINGS (' + warns.length + '):\n  ' + warns.join('\n  '));
if (errs.length) { console.log('ERRORS (' + errs.length + '):\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('spawn check OK (' + world.spawns.length + ' spawns)');
