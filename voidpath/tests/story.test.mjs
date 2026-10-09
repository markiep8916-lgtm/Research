// Cutscene runner, travel and game flows (TECH_PLAN 4.2-4.4, 6.2) against a fake ctx: nesting,
// no queue deadlock with a nested flight, abortAll, seen: only after completion, deferred saves,
// a forced leader restored, battle promises that resolve after the fade-in, the Retry auto-skip.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gameState, resetGame } from '../src/core/state.js';
import { registerData, getMap, REG } from '../src/content/registry.js';
import { CutsceneRunner } from '../src/story/cutscene.js';
import { story } from '../src/story/story.js';
import { travel } from '../src/story/travel.js';
import { Game } from '../src/core/game.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const room = (id, extra = {}) => ({
  id, name: id.toUpperCase(), grid: ['#####', '#...#', '#...#', '#####'],
  spawns: { a: { x: 1.5, z: 1.5, facing: 'down' }, b: { x: 3.5, z: 2.5, facing: 'left' } }, ...extra,
});

// fixture scripts live in REG.scripts under 'st.*' (and travel.flight); fresh() clears them
const scripts = REG.scripts;
registerData({
  id: 'storytest', chapter: 'prologue', name: 'Story test', data: {},
  maps: { st_room: room('st_room'), st_far: room('st_far'), moth: room('moth', { transit: true, spawns: { cockpit: { x: 2.5, z: 2.5 } } }), st_scene: room('st_scene', { scene: true }) },
  story: {
    scripts: {},
    destinations: [{ id: 'st_far', name: 'Far', map: 'st_far', spawn: 'a', unlock: '', before: 'st.before', order: 1 }],
    objectives: { 'st.obj': { chapter: 'prologue', text: 'Test objective.' } },
  },
});

function makeCtx() {
  const log = [];
  const locks = new Set();
  const npcs = new Map();
  class Npc {
    constructor(def) { Object.assign(this, { id: def.id, def, x: def.x, z: def.z, facing: def.facing || 'down', visible: true }); }
    face(t) { if (typeof t === 'string') this.facing = t; }
    play(a) { this.anim = a; }
    walkTo(points) { const [x, z] = points[points.length - 1]; this.x = x; this.z = z; return Promise.resolve(); }
    setVisible(on) { this.visible = on; return Promise.resolve(); }
  }
  const world = {
    map: getMap('st_room'), anchors: {}, npcs,
    npc: (id) => npcs.get(id) || null,
    spawnNpc: (def) => { const a = new Npc(def); npcs.set(def.id, a); return a; },
    removeNpc: (id) => npcs.delete(id),
    syncFlags: () => log.push('syncFlags'),
    setScreens: (t) => log.push(`screens:${t}`),
    emote: () => Promise.resolve(),
    lighting: { setTag() {} }, particles: { emit() {} }, living: () => null,
  };
  const player = {
    x: 1.5, z: 1.5, facing: 'down', actor: { object3d: { visible: true } },
    setPosition(x, z, f = this.facing) { Object.assign(this, { x, z, facing: f }); },
    face() {},
  };
  const explore = {
    mapId: 'st_room', world, player, fxOverride: null,
    lock: (r) => locks.add(r), unlock: (r) => locks.delete(r), unlockAll: () => locks.clear(),
    setLeader: (id) => log.push(`leader:${id}`), restoreMusic: () => log.push('restoreMusic'),
    camera: { focus: async () => {}, view: async () => {}, pan: async () => {}, reset: async () => log.push('camera.reset') },
    teleport: (x, z, f) => player.setPosition(x, z, f),
    async loadMap(id, spawn) {
      log.push(`loadMap:${id}`);
      explore.mapId = id;
      world.map = getMap(id);
      const at = typeof spawn === 'string' ? world.map.spawns[spawn] : spawn;
      player.setPosition(at.x, at.z, at.facing || 'down');
    },
    enter(p) { log.push(`explore.enter:${p.resume ? 'resume' : p.map}`); }, exit() {}, update() {},
  };
  const battle = {
    enter(p) { this.params = p; this.stage = { scene: {}, camera: {} }; log.push(`battle.enter:${p.encounterId}`); },
    exit() {}, update() {},
  };
  const engine = {
    transitioning: false, realDt: 0.016, size: { width: 1280, height: 720 },
    async transition(type, { onMidpoint } = {}) {
      engine.transitioning = true;
      log.push(`transition:${type}`);
      await tick();
      await onMidpoint?.();
      await tick();
      engine.transitioning = false;
      log.push(`faded-in:${type}`);
    },
    projectToScreen: () => ({ x: 640, y: 360, visible: true }),
    flash() {}, shake() {}, compileScene: async () => {},
  };
  const ui = {
    menuEnabled: true, root: null,
    dialog: { show: async (lines) => { log.push(['say', lines.map((l) => (typeof l === 'string' ? l : l.text))]); }, choice: async () => 1, clear: () => log.push('dialog.clear') },
    hud: {
      toast() {}, setPrompt() {}, setDanger() {}, letterbox: async (on) => log.push(`letterbox:${on}`), skipHint() {},
      objectiveToast: (t) => log.push(`objective:${t}`), partyToast() {}, showLocation: (n) => log.push(`banner:${n}`), autosaved() {}, setVisible() {},
    },
    cards: { chapter: async () => log.push('card'), caption: async () => {}, credits: async () => {}, end: async () => {} },
    screens: { isOpen: false, close() {}, fadeBlack: async () => {}, gameOver: (o) => log.push(['gameOver', o]), complete() {} },
    menu: { isOpen: false, close() {} }, starchart: { open: async () => null }, shop: { open: async () => {} }, saves: { open: async () => null },
  };
  const input = { context: 'explore', setContext(c) { this.context = c; }, down: () => false, pressed: () => false };
  const audio = { music: (t) => log.push(`music:${t}`), sfx() {} };
  const ctx = { engine, ui, input, audio, state: gameState, log, locks };
  const game = new Game(ctx);
  game.add('explore', explore);
  game.add('battle', battle);
  game.name = 'explore';
  game.current = explore;
  const writes = [];
  game.write = (slot) => { writes.push({ slot, pos: game.leaderPos(), checkpoint: gameState.checkpoint }); return true; };
  ctx.writes = writes;
  ctx.cutscenes = new CutsceneRunner(ctx);
  ctx.errors = [];
  ctx.cutscenes.rethrow = (e) => ctx.errors.push(e);
  ctx.story = story.bind(ctx);
  ctx.travel = travel.bind(ctx);
  ctx.explore = explore;
  return ctx;
}

function fresh() {
  resetGame();
  for (const k of Object.keys(scripts)) if (k.startsWith('st.') || k === 'travel.flight') delete scripts[k];
  gameState.leader = 'kade';
  gameState.story = { chapter: 'prologue', objective: null, done: [] };
  gameState.played = [];
  gameState.checkpoint = null;
  return makeCtx();
}

/** A gate a script can await until the test opens it. */
function gate() {
  let open;
  const p = new Promise((r) => { open = r; });
  return { p, open };
}

const run = (ctx, id, args) => ctx.cutscenes.run(id, args);

test('nested scripts run inside the outermost one; a second top-level run is refused', async (t) => {
  const ctx = fresh();
  const err = t.mock.method(console, 'error', () => {});
  const depths = [];
  scripts['st.c'] = async () => { depths.push(ctx.cutscenes.depth); return 'c'; };
  scripts['st.b'] = async (cs) => { depths.push(ctx.cutscenes.depth); return cs.run('st.c'); };
  scripts['st.a'] = async (cs) => {
    depths.push(ctx.cutscenes.depth);
    await assert.rejects(ctx.cutscenes.run('st.c'));
    const inner = await cs.run('st.b');
    return `a+${inner}`;
  };
  assert.equal(await run(ctx, 'st.a'), 'a+c');
  assert.deepEqual(depths, [1, 2, 3]);
  assert.equal(err.mock.callCount(), 1);
  assert.match(err.mock.calls[0].arguments[0], /cutscenes.run while a script is active: use cs.run/);
  assert.deepEqual([...gameState.played].sort(), ['st.a', 'st.b', 'st.c']);
  assert.equal(ctx.cutscenes.active, false);
  assert.equal(ctx.locks.size, 0, 'the cutscene lock is released');
  assert.equal(ctx.ui.menuEnabled, true);
});

test('while a script runs: field locked, menu off, dialog context; at the end everything is released', async () => {
  const ctx = fresh();
  const g = gate();
  scripts['st.lock'] = async (cs) => {
    cs.letterbox(true);
    cs.fx({ grade: { exposure: 0.5 } });
    cs.music('warden');
    await g.p;
  };
  const done = run(ctx, 'st.lock');
  await tick();
  assert.ok(ctx.locks.has('cutscene'));
  assert.equal(ctx.ui.menuEnabled, false);
  assert.equal(ctx.input.context, 'dialog');
  assert.deepEqual(ctx.explore.fxOverride, { grade: { exposure: 0.5 } });
  g.open();
  await done;
  assert.equal(ctx.locks.size, 0);
  assert.equal(ctx.ui.menuEnabled, true);
  assert.equal(ctx.input.context, 'explore');
  assert.equal(ctx.explore.fxOverride, null);
  assert.ok(ctx.log.includes('letterbox:false'));
  assert.ok(ctx.log.includes('restoreMusic'), 'the script changed the music');
  assert.ok(ctx.log.includes('camera.reset'));
});

test('a nested Moth flight runs inside the script: no deadlock, then the arrival and dest: flag', async () => {
  const ctx = fresh();
  const order = [];
  scripts['st.before'] = async (cs) => { order.push(`before@${ctx.cutscenes.depth}`); await cs.wait(0); };
  scripts['travel.flight'] = async (cs, args) => { order.push(`flight@${ctx.cutscenes.depth}:${args.from}->${args.to}`); await cs.say('BOLT', 'Next stop.'); };
  scripts['st.trip'] = async (cs) => {
    order.push('trip');
    await cs.travel('st_far');
    order.push(`after:${ctx.explore.mapId}`);
  };
  ctx.cutscenes.fast = true;   // the 3 s flight minimum collapses to 0.3 s
  await run(ctx, 'st.trip');
  assert.deepEqual(order, ['trip', 'before@2', 'flight@2:st_room->st_far', 'after:st_far']);
  assert.ok(ctx.log.indexOf('loadMap:moth') < ctx.log.indexOf('loadMap:st_far'));
  assert.equal(gameState.flags['dest:st_far'], true);
  assert.equal(gameState.flags['visited:moth'], true);
  assert.equal(ctx.writes.length, 1, 'the Starchart arrival queued one autosave, written when the script ended');
  assert.equal(ctx.writes[0].pos.map, 'st_far');
  assert.equal(gameState.checkpoint.map, 'st_far');
});

test('travel.go outside a script runs the flight top-level and saves on arrival', async (t) => {
  const ctx = fresh();
  t.mock.method(console, 'error', () => {});
  scripts['st.before'] = async () => true;
  scripts['travel.flight'] = async (cs) => { await cs.wait(0); };
  ctx.cutscenes.fast = true;
  assert.equal(await ctx.travel.go('st_far'), true);
  assert.equal(ctx.explore.mapId, 'st_far');
  assert.equal(ctx.writes.length, 1);
  assert.ok(ctx.log.includes('banner:ST_FAR'));
  // inside a script, travel.go without cs is refused
  scripts['st.wrong'] = async () => { assert.equal(await ctx.travel.go('st_far'), false); };
  await run(ctx, 'st.wrong');
  assert.match(console.error.mock.calls.at(-1).arguments[0], /use cs.travel/);
});

test('a `before` script returning false cancels the trip', async () => {
  const ctx = fresh();
  scripts['st.before'] = async () => false;
  scripts['travel.flight'] = async () => { throw new Error('no flight expected'); };
  assert.equal(await ctx.travel.go('st_far'), false);
  assert.equal(ctx.explore.mapId, 'st_room');
  assert.equal(gameState.flags['dest:st_far'], undefined);
});

test('seen: is set only when the once-trigger script completes', async () => {
  const ctx = fresh();
  const g = gate();
  scripts['st.trig'] = async (cs) => { cs.flag('st:started'); await g.p; };
  const trigger = { id: 'wake', once: true };
  const done = run(ctx, 'st.trig', { trigger });
  await tick();
  assert.equal(gameState.flags['st:started'], true);
  assert.equal(gameState.flags['seen:st_room:wake'], undefined);
  g.open();
  await done;
  assert.equal(gameState.flags['seen:st_room:wake'], true);
  assert.equal(story.played('st.trig'), true);
  // party talks set ptalk:<id> the same way
  scripts['st.pt'] = async () => {};
  await run(ctx, 'st.pt', { ptalk: 'pro.kade_sera' });
  assert.equal(gameState.flags['ptalk:pro.kade_sera'], true);
});

test('abortAll rejects pending calls, sets no seen: flag, drops queued saves and releases everything', async () => {
  const ctx = fresh();
  let after = false;
  scripts['st.long'] = async (cs) => {
    cs.letterbox(true);
    cs.save();
    cs.checkpoint();
    cs.scene({ leader: 'sera' });
    await cs.wait(30);
    after = true;
  };
  const done = run(ctx, 'st.long', { trigger: { id: 'long', once: true } });
  await tick();
  assert.equal(gameState.leader, 'sera');
  ctx.cutscenes.abortAll();
  assert.equal(await done, undefined);
  await tick();
  assert.equal(after, false, 'the script never continues past the aborted call');
  assert.equal(gameState.flags['seen:st_room:long'], undefined);
  assert.equal(story.played('st.long'), false);
  assert.equal(ctx.writes.length, 0);
  assert.equal(gameState.checkpoint, null);
  assert.equal(ctx.locks.size, 0);
  assert.equal(ctx.ui.menuEnabled, true);
  assert.equal(gameState.leader, 'kade', 'the forced leader is restored on abort too');
  assert.ok(ctx.log.includes('dialog.clear'));
  assert.ok(ctx.log.includes('letterbox:false'));
  assert.equal(ctx.errors.length, 0, 'an abort is not an error');
});

test('a script error is logged, rethrown asynchronously and cleaned up like an abort', async (t) => {
  const ctx = fresh();
  const err = t.mock.method(console, 'error', () => {});
  scripts['st.bad'] = async (cs) => { cs.save(); throw new Error('boom'); };
  assert.equal(await run(ctx, 'st.bad', { trigger: { id: 'bad', once: true } }), undefined);
  assert.equal(err.mock.callCount(), 1);
  assert.equal(ctx.errors[0].message, 'boom');
  assert.equal(gameState.flags['seen:st_room:bad'], undefined);
  assert.equal(ctx.writes.length, 0);
  assert.equal(ctx.locks.size, 0);
});

test('saves and checkpoints requested in a script are written once, at the leader, when it ends', async () => {
  const ctx = fresh();
  const g = gate();
  scripts['st.card'] = async (cs) => {
    cs.save();
    cs.checkpoint();
    await cs.card('ch1');
    cs.save();
    await cs.move('leader', [[3.5, 2.5]]);
    await g.p;
  };
  ctx.cutscenes.fast = true;
  const done = run(ctx, 'st.card');
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(ctx.writes.length, 0, 'nothing is written while the script runs');
  assert.equal(gameState.checkpoint, null);
  assert.equal(gameState.story.chapter, 'ch1', 'the card sets the chapter');
  assert.equal(gameState.leader, 'nyx', "the card makes the chapter's traveler lead");
  g.open();
  await done;
  assert.equal(ctx.writes.length, 1);
  assert.deepEqual({ x: ctx.writes[0].pos.x, z: ctx.writes[0].pos.z }, { x: 3.5, z: 2.5 });
  assert.deepEqual(gameState.checkpoint, { map: 'st_room', x: 3.5, z: 2.5, facing: 'down' });
  assert.equal(gameState.leader, 'nyx', 'a card leader is permanent');
});

test('a script that ends on a scene or transit map writes nothing and names itself', async (t) => {
  const ctx = fresh();
  const err = t.mock.method(console, 'error', () => {});
  scripts['st.dream'] = async (cs) => { cs.save(); await cs.goto('st_scene', 'a', { scene: true }); };
  await run(ctx, 'st.dream');
  assert.equal(ctx.writes.length, 0);
  assert.match(err.mock.calls[0].arguments[0], /"st.dream" ended on scene map "st_scene"/);
});

test('cs.scene forces a leader for the script and restores it; cs.setLeader is permanent', async () => {
  const ctx = fresh();
  scripts['st.scene'] = async (cs) => {
    cs.scene({ leader: 'orion' });
    assert.equal(gameState.leader, 'orion');
    await cs.say('ORION', 'There, there.');
  };
  await run(ctx, 'st.scene');
  assert.equal(gameState.leader, 'kade');
  assert.deepEqual(ctx.log.filter((l) => typeof l === 'string' && l.startsWith('leader:')), ['leader:orion', 'leader:kade']);
  scripts['st.perm'] = async (cs) => {
    cs.scene({ leader: 'orion' });
    await cs.setLeader('sera');
  };
  await run(ctx, 'st.perm');
  assert.equal(gameState.leader, 'sera');
});

test('a party speaker who is not on screen is reported unless gathered, offscreen or a legacy POC line', async (t) => {
  const ctx = fresh();
  const err = t.mock.method(console, 'error', () => {});
  scripts['st.stage'] = async (cs) => {
    await cs.say('KADE', 'I lead, so I am on screen.');
    await cs.say('SERA', 'Nobody gathered me.');
    await cs.say({ speaker: 'NYX', text: 'Radio check.', offscreen: true });
    await cs.gather({ kade: [2, 2], sera: [3, 2] });
    await cs.say('SERA', 'Now I am here.', { expr: 'smile' });
  };
  await run(ctx, 'st.stage');
  assert.equal(err.mock.callCount(), 1);
  assert.match(err.mock.calls[0].arguments[0], /SERA speaks in "st.stage" but is not on screen/);
  assert.equal(ctx.explore.world.npc('party:sera'), null, 'stepped-out members leave with the script');
  assert.equal(ctx.explore.player.actor.object3d.visible, true, 'the leader stand-in hands back to the Player');
  assert.deepEqual([ctx.explore.player.x, ctx.explore.player.z], [2, 2]);

  // legacy inline lines on a `poc: true` map are exempt; registered scripts there are not
  ctx.explore.world.map = { ...ctx.explore.world.map, poc: true };
  await run(ctx, (cs) => cs.say('NYX', 'Legacy POC line.'));
  assert.equal(err.mock.callCount(), 1);
  scripts['st.stage_poc'] = (cs) => cs.say('NYX', 'Still checked.');
  await run(ctx, 'st.stage_poc');
  assert.equal(err.mock.callCount(), 2);
  assert.match(err.mock.calls[1].arguments[0], /NYX speaks in "st.stage_poc"/);
});

test('cs.battle resolves only after the field has faded back in', async () => {
  const ctx = fresh();
  const order = [];
  scripts['st.fight'] = async (cs) => {
    order.push('before');
    const r = await cs.battle('drone_single');
    order.push(`after:${r}`);
  };
  const done = run(ctx, 'st.fight');
  while (!ctx.game.states.battle.params) await tick();
  assert.equal(ctx.game.inBattle, true);
  assert.equal(ctx.game.states.battle.params.canFlee, false, 'scripted battles cannot be fled unless the script says so');
  ctx.game.states.battle.params.onEnd('victory');
  await done;
  assert.deepEqual(order, ['before', 'after:victory']);
  const back = ctx.log.lastIndexOf('faded-in:fade');
  assert.ok(back > ctx.log.indexOf('explore.enter:resume'));
  assert.equal(ctx.game.inBattle, false);
});

test('a defeat without allowDefeat is a game over; Retry replays the trigger with the pre-fight part skipped', async (t) => {
  const ctx = fresh();
  t.mock.method(console, 'error', () => {});
  const shown = [];
  scripts['st.boss'] = async (cs) => {
    await cs.say('BOLT', 'Pre-fight line.');
    shown.push('pre');
    await cs.battle('drone_single');
    await cs.say('BOLT', 'Aftermath.');
    shown.push('post');
  };
  ctx.game.setCheckpoint({ map: 'st_room', x: 1.5, z: 1.5, facing: 'down' });
  const first = run(ctx, 'st.boss', { trigger: { id: 'boss', once: true } });
  while (!ctx.game.states.battle.params) await tick();
  ctx.game.states.battle.params.onEnd('defeat');
  await tick();
  const over = ctx.log.find((l) => Array.isArray(l) && l[0] === 'gameOver');
  assert.ok(over, 'the game over screen opened');
  assert.equal(over[1].onRetryPhase, undefined);
  ctx.game.states.battle.params = null;
  await over[1].onRetry();
  assert.equal(await first, undefined, 'Retry aborted the script');
  assert.equal(gameState.flags['seen:st_room:boss'], undefined, 'the trigger stays armed');
  assert.equal(ctx.cutscenes.autoSkip, 'st.boss');
  // the trigger fires again: instant up to cs.battle, normal after it
  const sayCount = () => ctx.log.filter((l) => Array.isArray(l) && l[0] === 'say').length;
  const before = sayCount();
  const second = run(ctx, 'st.boss', { trigger: { id: 'boss', once: true } });
  while (!ctx.game.states.battle.params) await tick();
  assert.equal(sayCount(), before, 'the pre-fight line was skipped');
  ctx.game.states.battle.params.onEnd('victory');
  await second;
  assert.equal(sayCount(), before + 1, 'the aftermath plays normally');
  assert.equal(gameState.flags['seen:st_room:boss'], true);
});

test('Retry keeps Party Talks played since the checkpoint and rolls back the rest (G2 F-1)', async (t) => {
  const ctx = fresh();
  t.mock.method(console, 'error', () => {});
  scripts['st.talk'] = async (cs) => { await cs.say('KADE', 'A talk.'); };
  scripts['st.boss'] = async (cs) => { await cs.battle('drone_single'); };
  ctx.game.setCheckpoint({ map: 'st_room', x: 1.5, z: 1.5, facing: 'down' });
  await run(ctx, 'st.talk', { ptalk: 'st.kade_sera' });
  assert.equal(gameState.flags['ptalk:st.kade_sera'], true);
  gameState.flags['st:after_checkpoint'] = true;
  const lost = run(ctx, 'st.boss');
  while (!ctx.game.states.battle.params) await tick();
  ctx.game.states.battle.params.onEnd('defeat');
  await tick();
  const over = ctx.log.find((l) => Array.isArray(l) && l[0] === 'gameOver');
  await over[1].onRetry();
  await lost;
  assert.equal(gameState.flags['ptalk:st.kade_sera'], true, 'the Med-Station no longer offers the talk');
  assert.equal(gameState.flags['st:after_checkpoint'], undefined, 'other progress since the checkpoint rolls back');
  assert.deepEqual(ctx.game.retried, { script: 'st.boss', encounter: 'drone_single' });
});

test('allowDefeat resolves "defeat" with the fallen at 1 HP', async () => {
  const ctx = fresh();
  scripts['st.lose'] = async (cs) => cs.battle('drone_single', { allowDefeat: true });
  const done = run(ctx, 'st.lose');
  while (!ctx.game.states.battle.params) await tick();
  for (const m of gameState.party) { m.hp = 0; m.alive = false; }
  ctx.game.states.battle.params.onEnd('defeat');
  assert.equal(await done, 'defeat');
  assert.ok(gameState.party.every((m) => m.alive && m.hp === 1));
});

test('debug choices answer cs.choice; objectives and chapters go through story', async () => {
  const ctx = fresh();
  ctx.cutscenes.choices.push(0);
  let picks = [];
  scripts['st.ask'] = async (cs) => {
    picks.push(await cs.choice('Go?', ['Yes', 'No']));
    picks.push(await cs.choice('Again?', ['Yes', 'No']));
    cs.objective('st.obj');
  };
  await run(ctx, 'st.ask');
  assert.deepEqual(picks, [0, 1]);
  assert.equal(story.objective, 'st.obj');
  assert.ok(ctx.log.includes('objective:Test objective.'));
});

test('holding Cancel skips the rest of an already-played script; a first viewing cannot be skipped', async () => {
  const ctx = fresh();
  let held = 0;
  ctx.input.heldFor = () => held;
  const hints = [];
  ctx.ui.hud.skipHint = (on) => hints.push(on);
  const g = gate();
  scripts['st.replay'] = async (cs) => {
    await cs.say('BOLT', 'First line.');
    await g.p;
    await cs.say('BOLT', 'Skipped on a replay.');
    await cs.wait(20);
  };
  const says = () => ctx.log.filter((l) => Array.isArray(l) && l[0] === 'say').length;
  // first viewing: holding does nothing
  let done = run(ctx, 'st.replay');
  await tick();
  held = 2;
  ctx.cutscenes.update();
  assert.equal(ctx.cutscenes.instant, false);
  held = 0;
  g.open();
  await new Promise((r) => setTimeout(r, 30));
  ctx.cutscenes.update();
  assert.ok(ctx.cutscenes.active);
  ctx.cutscenes.abortAll();
  await done;
  gameState.played.push('st.replay');
  // a replay: 0.4 s shows the hint, 1 s switches to instant mode
  const g2 = gate();
  scripts['st.replay'] = async (cs) => {
    await g2.p;
    await cs.say('BOLT', 'Skipped on a replay.');
    await cs.wait(20);
    cs.flag('st:replayed');
  };
  done = run(ctx, 'st.replay');
  await tick();
  const before = says();
  held = 0.5;
  ctx.cutscenes.update();
  assert.deepEqual(hints, [true]);
  held = 1.1;
  ctx.cutscenes.update();
  assert.equal(ctx.cutscenes.instant, true);
  assert.deepEqual(hints, [true, false]);
  g2.open();
  await done;
  assert.equal(says(), before, 'no dialog shown in instant mode');
  assert.equal(gameState.flags['st:replayed'], true, 'the 20 s wait took no time');
});

test('a skip that starts mid-shot lands camera tweens in flight and speeds up walks in flight', async () => {
  const ctx = fresh();
  const hurried = [];
  ctx.explore.camera.hurry = () => hurried.push('camera');
  const g = gate();
  scripts['st.shot'] = async (cs) => {
    await cs.spawn('st_walker', { sprite: 'bolt', x: 1.5, z: 1.5 });
    cs.actor('st_walker').hurry = (k) => hurried.push(`walk x${k}`);
    await g.p;
  };
  const done = run(ctx, 'st.shot');
  await tick();
  await tick();
  ctx.cutscenes.fast = true;
  assert.deepEqual(hurried, ['camera', 'walk x6']);
  ctx.cutscenes.fast = true;
  assert.equal(hurried.length, 2, 'already fast: nothing is hurried twice');
  ctx.cutscenes.fast = false;
  g.open();
  await done;
});

test('FieldCamera.hurry lands a pan in flight on its end point within one frame', async () => {
  const { FieldCamera } = await import('../src/world/camera.js');
  const host = { player: { x: 0, z: 0, moving: false, dir: { x: 0, z: 0 } }, world: null, area: null, ctx: { engine: { size: { aspect: 16 / 9 } } } };
  const cam = new FieldCamera(host);
  let landed = false;
  cam.pan([[10, 4]], { sec: 6 }).then(() => { landed = true; });
  cam.update(0.1);
  assert.ok(cam.look.x < 10);
  cam.hurry();
  cam.update(0.016);
  await tick();
  assert.equal(landed, true);
  assert.deepEqual([cam.look.x, cam.look.z], [10, 4]);
});

test('abortAll rejects a cs call the script did not await without an unhandled rejection', async () => {
  const ctx = fresh();
  const unhandled = [];
  const onUnhandled = (e) => unhandled.push(e);
  process.on('unhandledRejection', onUnhandled);
  try {
    ctx.ui.hud.letterbox = () => new Promise(() => {});   // a letterbox that is still sliding in
    scripts['st.bg'] = async (cs) => {
      cs.letterbox(true);
      await cs.wait(100);
    };
    const done = run(ctx, 'st.bg');
    await tick();
    ctx.cutscenes.abortAll();
    await done;
    await new Promise((r) => setTimeout(r, 20));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});
