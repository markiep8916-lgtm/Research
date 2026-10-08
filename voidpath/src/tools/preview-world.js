// World preview: any registered map in the real field (ExploreState, engine, input, audio, UI) with
// small local stand-ins for the game (startBattle shatters out and straight back in, bosses count as
// beaten), the cutscene runner (inline lines, choices, waits, heal, checkpoint, battles; other cs
// calls are logged) and travel (a fade, loadMap, the arrival rules), so maps can be tested in
// isolation from the story modules.
//
// URL params: ?map=<id> (default halcyon) &view=<viewpoint> &spawn=<spawn id> &q=low|medium|high
//   &enc=0 (no random encounters) &leader=<member id> &companion=1 (a test BOLT companion that follows
//   once story:kade_awake is set, when common has not registered one yet)
// window.__PREVIEW = {
//   ready, frames, explore, ctx, game, runner, prewarmMs, buildMs,
//   view(name)            teleport to a viewpoint of the current map
//   goto(map, spawn)      travel (fade, loadMap, arrival rules) -> Promise
//   flag(name, value, { instant })   set a flag and re-sync the world (instant: no animations)
//   camView(pitch, dist)  hold a camera view (cs.camera.view), camReset()
//   cycle(n, { maps })    loads maps back and forth n times (compileScene under the cover, 3 frames
//                         on each) -> { before, after, firstCycle, compilesAfterFirst, shadowMaps, per }
//   renderInfo(), mapInfo(), frame(n) -> Promise (n rendered frames)
// }

import { Engine } from '../core/engine.js';
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { UI } from '../ui/ui.js';
import { gameState, resetGame, useItemOutOfBattle, healParty, setLeader } from '../core/state.js';
import { ITEMS, PARTY_DEFS, ENCOUNTERS } from '../battle/data.js';
import { serialize, writeSlot } from '../core/save.js';
import { buildPortrait } from '../art/characters.js';
import { iconURL } from '../art/icons.js';
import { isTouchDevice, wait } from '../core/util.js';
import { registerAll, REG, getMap } from '../content/index.js';
import { ExploreState, prewarmMap } from '../world/explore.js';

const params = new URLSearchParams(location.search);
const quality = params.get('q') || (isTouchDevice() ? 'medium' : 'high');
const startMap = params.get('map') || 'halcyon';

registerAll();
const engine = new Engine(document.getElementById('view'), { quality });
const input = new Input({ touchLayer: document.getElementById('touch-layer') });
const ui = new UI({
  root: document.getElementById('ui-root'), input, audio, state: gameState, engine,
  onUseItem: useItemOutOfBattle, items: ITEMS, partyDefs: PARTY_DEFS,
});
ui.setPortraitProvider(buildPortrait);
ui.setIconProvider((n) => iconURL(n, 2));
input.onAny(() => audio.init());
resetGame();
if (params.get('leader')) setLeader(params.get('leader'));
if (params.get('companion') && !REG.companions.bolt) {
  REG.companions.bolt = {
    sprite: 'bolt', name: 'BOLT', follow: 'story:kade_awake',
    talk: [{ lines: [{ speaker: 'BOLT', text: 'Right behind you. *Mostly.*', portrait: 'bolt' }] }],
  };
}

const frameWaiters = [];
/** Resolves after n rendered frames. */
const frame = (n = 1) => new Promise((resolve) => frameWaiters.push({ n, resolve }));

// ------------------------------------------------------------------ stand-ins

const game = {
  name: 'explore',
  inBattle: false,
  battles: [],
  /** Med-Station saves: the leader's position into `slot`. */
  write(slot) {
    const p = explore.player;
    return writeSlot(slot, serialize(gameState, { map: explore.mapId, x: p.x, z: p.z, facing: p.facing })).ok;
  },
  /** Shatter out and back in; a boss encounter counts as beaten. Resolves after the fade-in. */
  startBattle(encounterId) {
    if (game.inBattle || engine.transitioning) return false;
    const enc = ENCOUNTERS[encounterId];
    console.log(`[preview-world] startBattle ${encounterId}`);
    game.battles.push(encounterId);
    game.inBattle = true;
    ui.hud.toast(`Battle: *${encounterId}*${enc && enc.boss ? ' · boss' : ''}`, { icon: 'attack' });
    audio.sfx('encounter');
    const p = explore.player;
    return engine.transition('shatter', {
      duration: 0.9,
      center: engine.projectToScreen({ x: p.x, y: 0.8, z: p.z }),
      onMidpoint: async () => {
        explore.exit();
        if (enc && enc.boss) gameState.flags[`defeated:${encounterId}`] = true;
        await wait(350);
        explore.enter({ resume: true });
      },
    }).then(() => {
      game.inBattle = false;
      return 'victory';
    });
  },
};

const runner = {
  active: false,
  depth: 0,
  touched: new Set(),
  async run(script, args = {}) {
    if (runner.active) {
      console.error('cutscenes.run while a script is active: use cs.run');
      throw new Error('cutscene already running');
    }
    runner.active = true;
    explore.lock('cutscene');
    ui.menuEnabled = false;
    input.setContext('dialog');
    try {
      return await runner.exec(script, args);
    } finally {
      runner.active = false;
      runner.touched.clear();
      explore.unlock('cutscene');
      ui.menuEnabled = true;
      input.setContext('explore');
      explore.world.syncFlags();
    }
  },
  async exec(script, args = {}) {
    const fn = typeof script === 'function' ? script : REG.scripts[script];
    if (!fn) {
      console.warn(`[preview-world] script "${script}" is not registered`);
      return undefined;
    }
    runner.depth++;
    try {
      const value = await fn(cs, args);
      if (args.trigger && args.trigger.once) gameState.flags[`seen:${args.trigger.map}:${args.trigger.id}`] = true;
      return value;
    } finally {
      runner.depth--;
    }
  },
};

const csBase = {
  say: (lines, text) => ui.dialog.show(typeof lines === 'string' ? [{ speaker: lines, text }] : lines),
  narrate: (text) => ui.dialog.show([{ speaker: null, text }]),
  choice: (prompt, options, opts) => ui.dialog.choice(prompt, options, opts),
  wait: (sec) => wait(sec * 1000),
  heal: async () => healParty(),
  checkpoint: () => {
    const p = explore.player;
    gameState.checkpoint = { map: explore.mapId, x: p.x, z: p.z, facing: p.facing };
  },
  battle: (encounterId) => Promise.resolve(game.startBattle(encounterId)),
  run: (id, args) => runner.exec(id, args || {}),
  emote: (id, kind, opts) => explore.world.emote(id, kind, opts),
  flag: (name, value = true) => { gameState.flags[name] = value; },
  get camera() { return explore.camera; },
};
const cs = new Proxy(csBase, {
  get(target, key) {
    if (key in target) return target[key];
    return (...a) => {
      console.warn(`[preview-world] cs.${String(key)}(${a.map((x) => JSON.stringify(x)).join(', ')}) is not simulated here`);
      return Promise.resolve();
    };
  },
});

const travel = {
  async arrive(map, spawn, { transition = 'fade', kind = 'exit' } = {}) {
    const changed = map !== explore.mapId;
    explore.lock('travel');
    try {
      await engine.transition(transition === 'none' ? 'fade' : transition, {
        duration: 0.9, color: '#05070d', onMidpoint: () => explore.loadMap(map, spawn),
      });
      explore.arrive(kind, { mapChanged: changed });
    } finally {
      explore.unlock('travel');
    }
    return true;
  },
};

const ctx = { engine, input, audio, ui, state: gameState, game, cutscenes: runner, travel, content: REG };
const explore = new ExploreState(ctx);
game.states = { explore };
if (params.get('enc') === '0') explore.encountersEnabled = false;

// ------------------------------------------------------------------ debug API

function shadowMaps() {
  let n = 0;
  explore.world.scene.traverse((o) => { if (o.isLight && o.castShadow && o.shadow && o.shadow.map) n++; });
  return n;
}

async function cycle(n = 10, { maps } = {}) {
  const home = explore.mapId;
  const list = maps || [home, home === 'dev_box' ? 'halcyon' : 'dev_box'];
  const order = [...list.slice(1), list[0]];
  const pick = (info) => ({
    calls: info.scene.calls, triangles: info.scene.triangles, programs: info.programs, compiles: info.compiles,
    textures: info.textures, geometries: info.geometries, lights: info.lights, canvasMB: info.canvasMB,
  });
  await frame(3);
  const before = pick(engine.renderInfo());
  const per = [];
  let firstCycle = null;
  for (let i = 0; i < n; i++) {
    for (const m of order) {
      const t0 = performance.now();
      await explore.loadMap(m, Object.keys(getMap(m).spawns)[0]);
      explore.arrive('teleport', { mapChanged: false });
      const ms = Math.round(performance.now() - t0);
      await frame(3);
      per.push({ cycle: i, map: m, ms, shadowMaps: shadowMaps(), ...pick(engine.renderInfo()) });
    }
    if (i === 0) {
      firstCycle = pick(engine.renderInfo());
      engine.markCompiles();
    }
  }
  const after = engine.renderInfo();
  return {
    before, firstCycle, after: pick(after), compilesAfterFirst: after.compilesSince, shadowMaps: shadowMaps(),
    texturesDrift: firstCycle ? +(after.textures / firstCycle.textures - 1).toFixed(3) : 0,
    geometriesDrift: firstCycle ? +(after.geometries / firstCycle.geometries - 1).toFixed(3) : 0,
    per,
  };
}

function mapInfo() {
  const w = explore.world;
  const m = w.map;
  return {
    map: m.id, areas: m.areas.map((a) => a.id), spawns: Object.keys(m.spawns), anchors: Object.keys(m.anchors),
    exits: m.exits.map((e) => ({ id: e.id, to: e.to })),
    interactables: w.interactables.map((it) => ({ id: it.id, kind: it.kind, x: +it.x.toFixed(2), z: +it.z.toFixed(2), enabled: it.enabled })),
    npcs: Object.keys(w.npcs), chests: m.chests.map((c) => c.id), gates: w.gates.map((g) => ({ id: g.def.id, open: g.open })),
  };
}

window.__PREVIEW = {
  ready: false,
  frames: 0,
  prewarmMs: 0,
  buildMs: 0,
  explore,
  ctx,
  game,
  runner,
  frame,
  view: (name) => {
    const v = explore.world.map.viewpoints[name];
    if (!v) throw new Error(`no viewpoint "${name}" on ${explore.mapId}`);
    explore.teleport(v.x, v.z, v.facing);
    return v;
  },
  goto: (map, spawn) => travel.arrive(map, spawn, { kind: 'travel' }),
  flag: (name, value = true, { instant = false } = {}) => {
    gameState.flags[name] = value;
    if (instant) explore.world.syncFlags({ instant: true });
    explore.syncFlags();
  },
  camView: (pitch, dist) => explore.camera.view({ pitch, dist, ms: 0 }),
  camReset: () => explore.camera.reset({ ms: 0 }),
  cycle,
  mapInfo,
  renderInfo: () => engine.renderInfo(),
};

let frames = 0;
engine.onUpdate((dt, t) => {
  input.update();
  ui.update(engine.realDt);
  explore.update(dt, t);
  gameState.stats.playTime += dt;
  frames++;
  window.__PREVIEW.frames = frames;
  for (const w of [...frameWaiters]) {
    if (--w.n <= 0) {
      frameWaiters.splice(frameWaiters.indexOf(w), 1);
      w.resolve();
    }
  }
  if (frames === 3) {
    window.__PREVIEW.ready = true;
    document.getElementById('vp-boot').classList.add('vp-hide');
  }
});

const t0 = performance.now();
prewarmMap(startMap).then(() => {
  const t1 = performance.now();
  explore.enter({ map: startMap, spawn: params.get('spawn') || Object.keys(getMap(startMap).spawns)[0] });
  explore.arrive('load');
  window.__PREVIEW.prewarmMs = Math.round(t1 - t0);
  window.__PREVIEW.buildMs = Math.round(performance.now() - t1);
  if (params.get('view')) window.__PREVIEW.view(params.get('view'));
  engine.start();
});
