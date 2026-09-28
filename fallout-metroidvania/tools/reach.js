#!/usr/bin/env node
// Reachability solver for level design. Uses the game's real tile-collision code and player constants,
// simulates jumps / double jumps / wall jumps / dashes / ladders, and unlocks abilities, keys, doors and bosses to a fixpoint.
// usage: node tools/reach.js [--verbose] [--start x,y] [--abilities a,b] [--grant boss_warden,key:overseer]
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
function arg(n, d) { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; }

function load() {
  const sb = { console, Math, JSON, Uint8Array, Int16Array, Int32Array, Float32Array, Array, Object, Set, Map, String, Number, Date };
  sb.window = sb; sb.document = { createElement: () => ({ getContext: () => ({}) }) };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'src/manifest.js'), 'utf8'), sb);
  const files = sb.CD_MANIFEST.filter((f) => /^(core\/util|world\/|game\/entities|game\/player|game\/items|game\/weapons|game\/enemies|game\/bosses)/.test(f));
  const stubs = "window.CD.Rig = {}; window.CD.audio = { play(){}, ready:false }; window.CD.input = { held(){return false}, pressed(){return false} };";
  for (const f of files) {
    if (f === 'game/player.js') vm.runInContext(stubs, sb);
    try { vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), sb, { filename: f }); } catch (e) { console.error('ERR loading', f, e.message); process.exit(2); }
  }
  return sb;
}
const sb = load(), CD = sb.CD, T = CD.T, TILE = CD.TILE, K = CD.PLAYER_K;
const world = new CD.World(CD.ROOMS);
if (world.errors.length) { console.log('WORLD ERRORS:\n' + world.errors.join('\n')); }
const G = CD.G; G.world = world; G.platforms = [];
const W = world.W, H = world.H;

// ------------------------------------------------------------------ pristine tile copy (doors/breakables are toggled by unlock state)
const base = { tiles: Uint8Array.from(world.tiles) };
function applyState(state) {
  world.tiles.set(base.tiles);
  for (const s of world.spawns) if (s.t === 'door' && doorOpen(s, state)) { const wT = s.w || 1, hT = s.h || 3; for (let y = 0; y < hT; y++) for (let x = 0; x < wT; x++) { /* doors are air in base tiles; nothing to do */ } }
  // closed doors become solid
  for (const s of world.spawns) if (s.t === 'door' && !doorOpen(s, state)) { const wT = s.w || 1, hT = s.h || 3; for (let y = 0; y < hT; y++) for (let x = 0; x < wT; x++) { const tx = s.tx + x, ty = s.ty - y; if (world.tile(tx, ty) === TILE.AIR) world.tiles[ty * W + tx] = TILE.DOOR; } }
  // breakable walls open with powerfist/grenade
  if (state.has('powerfist') || state.has('grenade')) for (let i = 0; i < world.tiles.length; i++) if (world.tiles[i] === TILE.BREAK) world.tiles[i] = TILE.AIR;
}
function doorOpen(s, state) {
  const l = s.lock || 'none';
  if (l === 'none' || l === 'open') return true;
  if (l.indexOf('key:') === 0) return state.has('key:' + l.slice(4));
  if (l.indexOf('flag:') === 0) return state.has(l.slice(5));
  if (l.indexOf('terminal:') === 0) return state.has('terminal:' + l.slice(9));
  if (l.indexOf('ability:') === 0) return state.has(l.slice(8));
  return false;
}

// ------------------------------------------------------------------ movement simulation
const PW = K.W, PH = K.H;
function makeBody(cx, bottom) { return { x: cx - PW / 2, y: bottom - PH, w: PW, h: PH, vx: 0, vy: 0, onGround: false, platform: null }; }
function touchesSpike(e) {
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w) / T), y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 1) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const t = world.tile(tx, ty); if (t === TILE.SPIKE && e.y + e.h > (ty + 1) * T - 20 && e.x + e.w > tx * T + 6 && e.x < (tx + 1) * T - 6) return true; if (t === TILE.SPIKE_D && e.y < ty * T + 20 && e.x + e.w > tx * T + 6 && e.x < (tx + 1) * T - 6) return true; }
  return false;
}
function inWaterTile(e) { const t = world.tile(Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h * 0.55) / T)); return t === TILE.WATER; }
function ladderAt(px, py) { return world.tile(Math.floor(px / T), Math.floor(py / T)) === TILE.LADDER; }
function overlapsLadder(e) { return ladderAt(e.x + e.w / 2, e.y + e.h * 0.5) || ladderAt(e.x + e.w / 2, e.y + e.h - 6) || ladderAt(e.x + e.w / 2, e.y + 10); }

// Simulate one scripted manoeuvre. plan: {dir, hold (s), dj (s|null), dash (s|null), dashDir, wj: [times], jump0: bool, v0:[vx,vy] optional}
// returns {landings:[{cx,row}], ladders:[{tx,ty}], water:bool}
function simulate(cx, bottom, plan, has, maxT) {
  const e = makeBody(cx, bottom); const dt = 1 / 60; const out = { landings: [], ladders: [], hitSpike: false };
  let t = 0, jumping = false, doubleJumped = false, dashT = 0, dashUsed = false, wallLock = 0, wjIdx = 0, wjUsed = 0, wasGround = false, landed = false;
  if (plan.v0) { e.vx = plan.v0[0]; e.vy = plan.v0[1]; jumping = e.vy < 0; }
  else if (plan.jump) { e.vy = -K.JUMP; jumping = true; }
  const dir = plan.dir || 0, maxRun = K.RUN;
  while (t < (maxT || 2.4)) {
    t += dt; if (wallLock > 0) wallLock -= dt;
    const jumpHeld = plan.hold === undefined ? true : t <= plan.hold + 1e-6;
    // dash
    if (has.jetrush && plan.dash !== undefined && plan.dash !== null && !dashUsed && t >= plan.dash) { dashT = K.DASH_T; dashUsed = true; e.vy = 0; plan.dd = plan.dashDir || dir || 1; }
    if (dashT > 0) { dashT -= dt; e.vx = plan.dd * K.DASH_SPD; e.vy = 0; const f = CD.moveActor(e, dt, {}); if (f.left || f.right) dashT = 0; if (touchesSpike(e)) { out.hitSpike = true; return out; } continue; }
    let mx = dir; if (wallLock > 0) mx = 0;
    const acc = e.onGround ? K.ACC : K.AIR_ACC;
    if (mx !== 0) { if (Math.sign(e.vx) !== mx && e.vx !== 0) e.vx += mx * acc * 1.6 * dt; else e.vx += mx * acc * dt; e.vx = Math.max(-maxRun, Math.min(maxRun, e.vx)); }
    else if (wallLock <= 0) e.vx = Math.abs(e.vx) <= (e.onGround ? K.FRIC : 700) * dt ? 0 : e.vx - Math.sign(e.vx) * (e.onGround ? K.FRIC : 700) * dt;
    // wall cling
    let cling = 0;
    if (has.gecko && !e.onGround && mx !== 0) {
      const wl = world.rectHitsSolid(e.x - 2, e.y + 10, 2, e.h - 24), wr = world.rectHitsSolid(e.x + e.w, e.y + 10, 2, e.h - 24);
      if ((wl && mx < 0) || (wr && mx > 0)) { cling = mx; if (e.vy > K.WALL_SLIDE) e.vy = K.WALL_SLIDE; }
    }
    // scripted wall jumps
    if (cling && plan.wj && wjIdx < plan.wj.length && t >= plan.wj[wjIdx]) { wjIdx++; e.vy = -K.WALL_JY; e.vx = -cling * K.WALL_JX; wallLock = 0.16; jumping = true; plan.dir = -cling; wjUsed++; }
    if (plan.wj && wjUsed > 0 && wallLock <= 0 && plan.wjDir) { /* keep pushing toward alternating walls */ }
    // double jump
    if (has.jetboots && !doubleJumped && plan.dj !== undefined && plan.dj !== null && t >= plan.dj && !e.onGround) { e.vy = -K.DJUMP; doubleJumped = true; jumping = true; }
    if (jumping && !jumpHeld && e.vy < -260 && !doubleJumped) { e.vy *= 0.55; jumping = false; }
    if (jumping && e.vy >= 0) jumping = false;
    let grav = K.GRAV; if (e.vy < 0 && jumping && jumpHeld) grav = K.GRAV * 0.86;
    const water = inWaterTile(e);
    if (water) { if (!has.hazmat) { out.water = true; return out; } grav = 520; }
    const f = CD.moveActor(e, dt, { gravity: grav, maxFall: water ? 150 : K.MAXFALL });
    if (touchesSpike(e)) { out.hitSpike = true; return out; }
    if (overlapsLadder(e) && t > 0.05) out.ladders.push({ tx: Math.floor((e.x + e.w / 2) / T), ty: Math.floor((e.y + e.h * 0.5) / T), t });
    if (f.down) {
      // standing: record and stop the manoeuvre once settled
      const cxT = Math.floor((e.x + e.w / 2) / T), row = Math.round((e.y + e.h) / T);
      if (t > 0.08 || !plan.jump && !plan.v0) { out.landings.push({ cx: cxT, row, px: e.x + e.w / 2 }); return out; }
    }
    if (e.y > H * T + 100) return out;
  }
  return out;
}
function clearance(cx, row) {   // can a standing player fit at cell column cx with floor row `row`?
  return !world.isSolid(cx, row - 1) && !world.isSolid(cx, row - 2) && (world.isSolid(cx, row) || world.tile(cx, row) === TILE.PLAT);
}
const key = (cx, row) => row * W + cx;

function neighbours(cx, row, has) {
  const res = []; const px = (cx + 0.5) * T, bottom = row * T;
  // walk one cell left/right
  for (const d of [-1, 1]) {
    const nx = cx + d;
    if (clearance(nx, row)) res.push([nx, row]);
    else if (!world.isSolid(nx, row - 1) && !world.isSolid(nx, row - 2)) {   // walked off an edge: fall with continued drift
      for (const hold of [0]) { const o = simulate(px + d * 6, bottom, { dir: d, hold, jump: false }, has, 3.0); for (const l of o.landings) res.push([l.cx, l.row]); }
    }
  }
  // drop through one-way platforms (down + jump)
  if (world.tile(cx, row) === TILE.PLAT) { const o = simulate(px, bottom + 8, { dir: 0, jump: false }, has, 2.5); for (const l of o.landings) if (l.row > row) res.push([l.cx, l.row]); }
  // jumps (only from edge cells and every 3rd cell to keep the search tractable)
  const thorough = args.includes('--thorough');
  const interesting = !clearance(cx - 1, row) || !clearance(cx + 1, row) || (cx % (thorough ? 2 : 4) === 0);
  if (!interesting) return res;
  const holds = thorough ? ((has.jetboots || has.jetrush) ? [0.1, 0.22, 1] : [0.08, 0.16, 0.26, 1]) : (has.jetboots || has.jetrush ? [0.14, 1] : [0.1, 0.2, 1]);
  const djs = has.jetboots ? (thorough ? [null, 0.28, 0.42, 0.56] : [null, 0.4]) : [null];
  const dashes = has.jetrush ? (thorough ? [null, 0.05, 0.3] : [null, 0.12]) : [null];
  const dirs = [-1, 0, 1];
  for (const dir of dirs) for (const hold of holds) for (const dj of djs) for (const dash of dashes) {
    if (dash !== null && dj !== null && hold < 0.2) continue;   // prune
    const o = simulate(px, bottom, { dir, hold, jump: true, dj, dash, dashDir: dir || 1, wj: has.gecko ? [0.25, 0.55, 0.85] : null }, has, 1.9);
    for (const l of o.landings) if (l.cx !== cx || l.row !== row) res.push([l.cx, l.row]);
    for (const l of o.ladders) res.push(['L', l.tx, l.ty]);
  }
  // wall-jump chains: cling while falling from a jump toward each wall (handled by simulate's cling + scripted wj)
  return res;
}

// ------------------------------------------------------------------ item / unlock model
const abilityNames = ['jetboots', 'gecko', 'jetrush', 'powerfist', 'hazmat'];
function analyse() {
  const state = new Set((arg('grant', '') || '').split(',').filter(Boolean)); for (const a of (arg('abilities', '') || '').split(',').filter(Boolean)) state.add(a);
  state.add('grenade');   // grenades are buyable from the start; treat cracked walls as blastable only after the powerfist / grenade purchase
  state.delete('grenade');
  const startSp = world.spawns.find((s) => s.t === 'start'); let sx = startSp.tx, sy = startSp.ty + 1;
  if (arg('start')) { const [a, b] = arg('start').split(',').map(Number); sx = a; sy = b; }
  const log = [];
  let round = 0;
  for (;;) {
    round++;
    applyState(state);
    const has = {}; for (const a of abilityNames) has[a] = state.has(a);
    const seen = new Set(), ladders = new Set(), queue = [];
    const push = (cx, row) => { const k = key(cx, row); if (!seen.has(k) && clearance(cx, row)) { seen.add(k); queue.push([cx, row]); } };
    push(sx, sy);
    // elevators join their stops
    const elevs = world.spawns.filter((s) => s.t === 'elevator' && (s.rise || 0) > 0);
    let guard = 0;
    while (queue.length && guard++ < 400000) {
      if (process.env.TRACE) process.stderr.write('N' + queue[queue.length-1] + ' '); if (verbose && guard % 1000 === 0) console.error('  ...expanded ' + guard + ' nodes, queue ' + queue.length + ', seen ' + seen.size);
      const [cx, row] = queue.pop();
      for (const n of neighbours(cx, row, has)) {
        if (n[0] === 'L') { const lk = n[1] + ',' + n[2]; if (!ladders.has(lk)) { ladders.add(lk); expandLadder(n[1], n[2], ladders, push); } }
        else push(n[0], n[1]);
      }
      // ladder entry: standing next to / on a ladder column
      for (const dx of [0]) { for (const dy of [-1, -2]) if (world.tile(cx + dx, row + dy) === TILE.LADDER) { const lk = (cx + dx) + ',' + (row + dy); if (!ladders.has(lk)) { ladders.add(lk); expandLadder(cx + dx, row + dy, ladders, push); } } }
      if (world.tile(cx, row) === TILE.LADDER) { const lk = cx + ',' + row; if (!ladders.has(lk)) { ladders.add(lk); expandLadder(cx, row, ladders, push); } }
      for (const el of elevs) {
        const x0 = el.tx, x1 = el.tx + (el.w || 3) - 1, bot = el.ty + 1, top = bot - el.rise;
        if (cx >= x0 && cx <= x1 && (row === bot || row === top)) { const other = row === bot ? top : bot; for (let x = x0; x <= x1; x++) { const kk = key(x, other); if (!seen.has(kk)) { seen.add(kk); queue.push([x, other]); } } }
      }
    }
    // nodes on elevators (virtual floors): make sure neighbours of those cells are explored
    // ---- collect reachable interest points
    const reach = (tx, ty, r) => { r = r === undefined ? 1 : r; for (let dy = -3; dy <= 2; dy++) for (let dx = -r; dx <= r; dx++) { if (seen.has(key(tx + dx, ty + dy + 1))) return true; } const lk = tx + ',' + ty; if (ladders.has(lk)) return true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (ladders.has((tx + dx) + ',' + (ty + dy))) return true; return false; };
    let changed = false; const gained = [];
    const add = (k, why) => { if (!state.has(k)) { state.add(k); changed = true; gained.push(k + (why ? ' (' + why + ')' : '')); } };
    for (const s of world.spawns) {
      if (s.t === 'pickup') {
        if (s.requires && !state.has(s.requires)) continue;
        if (!reach(s.tx, s.ty)) continue;
        if (s.k === 'ability') add(s.id, s.roomId); else if (s.k === 'key') add('key:' + s.id, s.roomId);
      } else if (s.t === 'terminal') {
        if (reach(s.tx, s.ty) && s.id) { add('terminal:' + s.id, s.roomId); if (s.giveKey) add('key:' + s.giveKey.id, s.roomId); if (s.onRead && s.onRead.flag) add(s.onRead.flag, s.roomId); }
      } else if (s.t === 'trigger' && s.boss) { if (reach(s.tx, s.ty)) { add('boss_' + s.boss, s.roomId); const bd = CD.BOSSES && CD.BOSSES[s.boss]; if (bd && bd.grants) for (const g of bd.grants) add(g, 'boss ' + s.boss); } }
      else if (s.t === 'trigger' && s.flag) { if (reach(s.tx, s.ty)) add(s.flag, s.roomId); }
      else if (s.t === 'trigger' && s.give) { if (reach(s.tx, s.ty)) add(s.give, s.roomId); }
    }
    // shop-bought grenades unlock cracked walls (any vending/trader reachable)
    if (!state.has('grenade')) for (const s of world.spawns) if ((s.t === 'nuka' || s.t === 'npc') && reach(s.tx, s.ty)) { /* grenades are optional; power fist is the intended key */ }
    if (verbose || gained.length) log.push('round ' + round + ': +' + (gained.join(', ') || 'nothing') + '  (reachable cells ' + seen.size + ')');
    if (!changed) { return { seen, ladders, state, log, reach }; }
  }
}
function expandLadder(tx, ty, ladders, push) {
  // flood the ladder column
  let y = ty; while (world.tile(tx, y - 1) === TILE.LADDER) y--; const top = y; y = ty; while (world.tile(tx, y + 1) === TILE.LADDER) y++; const bot = y;
  for (let yy = top; yy <= bot; yy++) {
    ladders.add(tx + ',' + yy);
    for (const d of [-1, 1]) { const nx = tx + d; if (!world.isSolid(nx, yy) && !world.isSolid(nx, yy - 1)) { if (world.isSolid(nx, yy + 1) || world.tile(nx, yy + 1) === TILE.PLAT) push(nx, yy + 1); } }
    // standing on a platform/floor tile below the ladder tile
    if (world.isSolid(tx, yy + 1) || world.tile(tx, yy + 1) === TILE.PLAT) push(tx, yy + 1);
  }
  // top exit: hop onto whatever is above/adjacent (climb pop)
  for (let dy = -3; dy <= 0; dy++) for (const dx of [-2, -1, 0, 1, 2]) { const cx = tx + dx, row = top + dy; if (clearance(cx, row)) push(cx, row); }
}

if (require.main !== module) { module.exports = { simulate, neighbours, world, CD, clearance, applyState, doorOpen }; return; }
const res = analyse();
console.log(res.log.join('\n'));
console.log('final unlocks:', Array.from(res.state).sort().join(', '));
// ------------------------------------------------------------------ report
applyState(res.state);
const bad = [];
const chk = (s, label) => { if (!res.reach(s.tx, s.ty, 2)) bad.push(label + ' ' + s.roomId + ' (' + s.tx + ',' + s.ty + ')'); };
for (const s of world.spawns) {
  if (s.t === 'pickup' && s.requires && !res.state.has(s.requires)) bad.push('never-unlocked pickup ' + s.k + ' requires ' + s.requires + ' in ' + s.roomId);
  else if (s.t === 'pickup' && ['ability', 'upgrade', 'bobble', 'key', 'weapon', 'holotape'].includes(s.k)) chk(s, 'pickup:' + s.k + ':' + (s.id || s.u || s.stat || ''));
  else if (['bed', 'nuka', 'terminal', 'locker', 'npc', 'elevator', 'door'].includes(s.t)) chk(s, s.t + (s.id ? ':' + s.id : ''));
  else if (s.t === 'trigger' && s.boss) chk(s, 'boss:' + s.boss);
  else if (['radroach', 'raider', 'ghoul', 'protectron', 'mutant', 'brute', 'eyebot', 'bloatfly', 'turret', 'molerat', 'scorpion', 'mirelurk', 'handy', 'glowing'].includes(s.t) && args.includes('--enemies')) chk(s, 'enemy:' + s.t);
}
// rooms never entered
const roomHit = new Set(); for (const k of res.seen) { const row = Math.floor(k / W), cx = k % W; const r = world.roomAtTile(cx, row - 1); if (r) roomHit.add(r.id); }
for (const k of res.ladders) { const [x, y] = k.split(',').map(Number); const r = world.roomAtTile(x, y); if (r) roomHit.add(r.id); }
const unvisited = world.rooms.filter((r) => !roomHit.has(r.id)).map((r) => r.id);
console.log('\nreachable rooms: ' + roomHit.size + '/' + world.rooms.length);
if (unvisited.length) console.log('UNREACHED ROOMS: ' + unvisited.join(', '));
if (bad.length) console.log('UNREACHABLE (' + bad.length + '):\n  ' + bad.join('\n  ')); else console.log('all checked interactables reachable');
process.exit(bad.length || unvisited.length ? 1 : 0);
