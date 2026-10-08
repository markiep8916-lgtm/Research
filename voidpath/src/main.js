// VOIDPATH boot: registers every location, wires engine, input, audio, UI, the game state machine,
// the story facade, the cutscene runner and travel into one ctx, paints the title and the Halcyon
// behind the loading screen (yielding between steps so the page stays responsive), then starts on
// the title. window.__VP exposes the debug hooks the headless scenarios drive (TECH_PLAN 10.1).
//
// ctx = { engine, input, audio, ui, state, game, story, cutscenes, travel, content: REG,
//         prewarm: { location(locId), evict(locId), arrived(locId), trim() },
//         settings: { encounters, skipWeak, battleSpeed } }
// Frame order: input.update(); cutscenes.update() (sees Confirm / Cancel before the UI consumes them);
// ui.update(realDt); game.update(dt, t).

import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { audio } from './core/audio.js';
import { perf } from './core/perf.js';
import { UI } from './ui/ui.js';
import { Game } from './core/game.js';
import { TitleScene, TitleState, hasCleared } from './core/titleScene.js';
import { gameState, healParty, addItem, useItemOutOfBattle, setLeader, moveMember, getMember } from './core/state.js';
import { equip, optimize, SLOTS } from './core/progression.js';
import { listSlots } from './core/save.js';
import { ITEMS, PARTY_DEFS, ENCOUNTERS, ENEMIES } from './battle/data.js';
import { BattleState } from './battle/battleState.js';
import { setDifficulty } from './battle/model.js';
import { createPolicy } from '../tests/policy.mjs';
import { ExploreState } from './world/explore.js';
import { setDefaultState } from './world/cond.js';
import { visualLint } from './world/lint.js';
import { PARTY_IDS, buildFieldSprite, buildBattleSprite, buildPortrait, buildNpcSprite } from './art/characters.js';
import { ENEMY_KINDS, buildEnemySprite, buildEnemyIcon } from './art/enemies.js';
import { ICON_NAMES, iconURL } from './art/icons.js';
import { buildTexture } from './art/tiles.js';
import { FX_NAMES, fxSheet } from './art/fx.js';
import { artCache, missingArt } from './art/cache.js';
import { registerAll, REG } from './content/index.js';
import { prewarmLocation } from './content/prewarm.js';
import { story } from './story/story.js';
import { CutsceneRunner } from './story/cutscene.js';
import { travel } from './story/travel.js';
import { buildJumpState, applyJumpState, setMemberLevel } from './story/jump.js';
import { el, injectCSS, isTouchDevice, makeRng } from './core/util.js';

const QUALITIES = ['low', 'medium', 'high'];

/** ?q= override (tests), else the quality saved in the settings menu, else by device. */
function startQuality() {
  const q = new URLSearchParams(location.search).get('q');
  if (QUALITIES.includes(q)) return q;
  try {
    const saved = JSON.parse(localStorage.getItem('voidpath.settings.v1') || 'null');
    if (saved && QUALITIES.includes(saved.quality)) return saved.quality;
  } catch { /* storage blocked: fall through */ }
  return isTouchDevice() ? 'medium' : 'high';
}

// ------------------------------------------------------------------ core services

registerAll();
setDefaultState(gameState);

const engine = new Engine(document.getElementById('view'), { quality: startQuality() });
const input = new Input({ touchLayer: document.getElementById('touch-layer') });
const ui = new UI({
  root: document.getElementById('ui-root'), input, audio, state: gameState, engine,
  onUseItem: useItemOutOfBattle, items: ITEMS, partyDefs: PARTY_DEFS,
});
ui.setPortraitProvider(buildPortrait);
ui.setIconProvider((n) => iconURL(n, 2));
for (const [name, def] of Object.entries(REG.speakers)) ui.registerSpeaker(name, def);
perf.setUi(ui);

// Audio may only start inside a real user gesture (iOS): unlock from the DOM events themselves.
input.onAny(() => audio.init());
for (const type of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(type, () => audio.init(), { once: true, capture: true });
audio.music('title');

const ctx = {
  engine, input, audio, ui, state: gameState, game: null, content: REG,
  prewarm: {
    location: (loc) => prewarmLocation(loc),
    evict: (loc) => artCache.evictLocation(loc),
    // 11.5: the arrival's location stays painted; least-recently-used art beyond the budget goes
    arrived: (loc) => { if (loc) artCache.current = loc; artCache.trim(); },
    trim: () => artCache.trim(),
  },
  settings: { encounters: 'normal', skipWeak: true, battleSpeed: 1 },
};
const game = new Game(ctx);
const cutscenes = new CutsceneRunner(ctx);
Object.assign(ctx, { story: story.bind(ctx), cutscenes, travel: travel.bind(ctx) });

// ------------------------------------------------------------------ pause-menu hooks (8.1)

/** Map tab data: the current map, the areas seen, the leader and the objective marker. */
function mapData() {
  const ex = game.states.explore;
  const map = ex?.world?.map;
  if (!map) return null;
  const obj = REG.objectives[gameState.story.objective];
  return {
    map, mapId: map.id, name: map.name, region: map.region,
    visited: map.areas.filter((a) => gameState.flags[`area:${map.id}:${a.id}`]).map((a) => a.id),
    area: ex.area ? ex.area.id : null,
    leader: { x: ex.player.x, z: ex.player.z, facing: ex.player.facing },
    objective: obj ? { id: gameState.story.objective, text: obj.text, target: obj.target || null } : null,
    flags: gameState.flags,
    test: (cond) => story.test(cond),
    mapName: (id) => REG.maps[id]?.name || id,
  };
}

// setHooks reports every stored setting once at boot; a ?q= override (tests) keeps its quality then
let urlQuality = QUALITIES.includes(new URLSearchParams(location.search).get('q'));

function applySettings(patch) {
  if (patch.difficulty) setDifficulty(patch.difficulty);
  for (const k of ['encounters', 'skipWeak', 'battleSpeed']) if (k in patch) ctx.settings[k] = patch[k];
  if (QUALITIES.includes(patch.quality) && patch.quality !== engine.quality && !urlQuality) engine.setQuality(patch.quality);
  urlQuality = false;
}

ui.setHooks({
  setLeader: (id) => {
    if (setLeader(id)) game.states.explore?.setLeader(id);
  },
  moveMember: (id, toIndex) => moveMember(id, toIndex),
  optimize: (memberId) => {
    const m = getMember(memberId);
    if (!m) return;
    const best = optimize(m, gameState.inventory);
    for (const slot of SLOTS) if (best[slot] !== m.equip[slot]) equip(m, slot, best[slot]);
  },
  equipNow: (memberId, itemId) => {
    const m = getMember(memberId);
    return m ? equip(m, ITEMS[itemId].equip.slot, itemId) : { ok: false, message: 'Choose a party member.' };
  },
  journal: () => story.journal(),
  mapData,
  settings: applySettings,
  quitToTitle: () => game.toTitle(),
});

// ------------------------------------------------------------------ loading screen

injectCSS('vp-boot', `
#vp-boot .vp-boot-box { display: flex; flex-direction: column; align-items: center; gap: 16px; }
#vp-boot .vp-boot-t { padding-left: .4em; }
#vp-boot .vp-boot-bar { width: min(280px, 64vw); height: 2px; background: rgba(140,214,255,.14); overflow: hidden; }
#vp-boot .vp-boot-bar i { display: block; height: 100%; transform-origin: 0 50%; transform: scaleX(0); transition: transform .25s var(--vp-ease-out);
  background: linear-gradient(90deg, var(--vp-cyan), var(--vp-amber)); box-shadow: 0 0 10px rgba(255,197,96,.7); }
#vp-boot .vp-boot-step { min-height: 1.2em; padding-left: .24em; font: 500 11px/1.2 var(--vp-font-ui); letter-spacing: .24em; color: var(--vp-ink-faint); }
`);
const bootEl = document.getElementById('vp-boot');
const bootBar = el('i');
const bootStep = el('span', { class: 'vp-boot-step' });
bootEl.replaceChildren(el('div', { class: 'vp-boot-box' }, [
  el('span', { class: 'vp-boot-t', text: 'Loading' }), el('div', { class: 'vp-boot-bar' }, [bootBar]), bootStep,
]));

/** Let the browser paint (and handle input) between boot steps; the timeout covers throttled rAF. */
const breathe = () => new Promise((resolve) => {
  let done = false;
  const go = () => { if (!done) { done = true; setTimeout(resolve, 0); } };
  requestAnimationFrame(go);
  setTimeout(go, 60);
});

const nextFrames = (n) => new Promise((resolve) => {
  const off = engine.onUpdate(() => { if (--n <= 0) { off(); resolve(); } });
});

// Boot paints the title, the Halcyon (the prologue location), the party, BOLT and HALCYON only;
// every other location paints behind the cover of its first arrival (11.5).
let titleScene = null;
const BOOT_STEPS = [
  ['Painting the void', () => buildTexture('space_backdrop')],
  ['Plating the hull', () => prewarmLocation('prologue')],
  ...PARTY_IDS.map((id) => ['Waking the travelers', () => { buildFieldSprite(id); buildBattleSprite(id); buildPortrait(id); }]),
  ['Booting BOLT', () => { for (const k of ['bolt', 'holo']) { buildNpcSprite(k); buildPortrait(k); } }],
  ...ENEMY_KINDS.map((k) => ['Arming the security grid', () => { buildEnemySprite(k); buildEnemyIcon(k); }]),
  ['Charging the arsenal', () => FX_NAMES.forEach((n) => fxSheet(n))],
  ['Etching the interface', () => ICON_NAMES.forEach((n) => { iconURL(n, 1); iconURL(n, 2); })],
  ['Opening the observation deck', () => {
    if (hasCleared()) buildTexture('bd_ione_dawn');
    titleScene = new TitleScene(engine);
  }],
  ['Opening the observation deck', () => titleScene.warm()],
];

// ------------------------------------------------------------------ pacing (debug.pacing, 11.7)

const pacing = {};
let wasInBattle = false;

function trackPace(dt) {
  const ch = gameState.story?.chapter || 'prologue';
  const p = (pacing[ch] ||= { field: 0, battle: 0, cutscene: 0, menu: 0, battles: 0 });
  if (game.inBattle && !wasInBattle) p.battles++;
  wasInBattle = game.inBattle;
  const kind = game.inBattle || game.name === 'battle' ? 'battle'
    : game.name !== 'explore' ? null
      : cutscenes.active ? 'cutscene' : ui.isBlocking() ? 'menu' : 'field';
  if (kind) p[kind] += dt;
}

// ------------------------------------------------------------------ debug hooks (always present)

const seen = {};
let pause = null;
const VP = { ready: false, ctx, game, debug: null };
window.__VP = VP;

function battleSnapshot(battle) {
  const m = battle.model;
  const bui = battle.ui;
  if (!m || game.name !== 'battle') return null;
  return {
    encounter: m.encounter.id, round: m.round, phase: m.phase, result: m.result,
    actor: m.current ? m.current.id : null,
    menu: bui && bui.cmd ? bui.cmd.screen : null,
    sel: bui && bui.cmd ? bui.cmd.sel : null,
    boost: bui && bui.cmd ? bui.cmd.boost : 0,
    results: !!(bui && bui.results && bui.results.ready),
    paused: !!(pause && pause.paused),
    enemies: m.enemies.map((e) => ({ id: e.id, key: e.key, hp: e.hp, shield: e.shield, broken: e.broken, alive: e.alive, revealed: [...e.revealed] })),
    party: m.party.map((p) => ({ id: p.id, hp: p.hp, bp: p.bp, alive: p.alive })),
  };
}

const untilIdle = async () => {
  while (engine.transitioning || game.name !== 'explore') await new Promise((r) => setTimeout(r, 50));
};

function installDebug({ explore, battle }) {
  let speed = 1;
  let god = false;
  const forced = new Map();
  game.onBattleEvent = (e) => {
    const key = e.type === 'hit' && e.weak ? 'weakHit' : e.type;
    seen[key] = (seen[key] || 0) + 1;
    const p = pause;
    if (!p || !p.armed || !(p.type === key || p.type === e.type)) return;
    p.armed = false;
    battle.stage.wait(p.delay).then(() => {
      if (pause !== p) return;
      battle.timeScale = 0;
      setTimeout(() => {
        if (pause !== p || !battle.ui) return;
        battle.ui.freeze(true);
        p.paused = true;
      }, p.uiMs);
    });
  };
  // per-battle model patches for godMode and forceAction (debug only; they wrap model internals)
  game.onBattleStart = (m) => {
    const ko = m._ko.bind(m);
    m._ko = (t, events) => {
      if (god && m.party.includes(t)) t.hp = 1;
      else ko(t, events);
    };
    const act = m.act.bind(m);
    m.act = (a) => {
      const c = god && m.get(a.actorId);
      if (c) c.ep = c.maxEp;
      return act(a);
    };
    const choose = m._chooseEnemyAction.bind(m);
    m._chooseEnemyAction = (e) => {
      const id = forced.get(e.id);
      const action = id && ENEMIES[e.key].actions.find((x) => x.id === id);
      if (!action) return choose(e);
      forced.delete(e.id);
      return { action, target: m._targetFor(e, action) };
    };
  };
  const model = () => (game.name === 'battle' ? battle.model : null);
  const fieldMap = () => explore.world?.map || null;

  VP.debug = {
    // ---- flow (10.1)
    async jumpTo(target, { play = false } = {}) {
      const js = buildJumpState(target, REG);
      cutscenes.abortAll();
      game.forget();
      applyJumpState(js);
      await travel.arrive(js.map, js.spawn, { kind: play ? 'load' : 'goto', duration: 0.4 });
      game.setCheckpoint();
      return VP.debug.state();
    },
    /** Start a battle from anywhere (skips the title). opts: { seed, jump }. Does not wait for it. */
    startBattle(encId = 'drone_single', { seed, jump } = {}) {
      if (!ENCOUNTERS[encId]) return false;
      if (game.name === 'title') game.skipTitle();
      if (jump) applyJumpState(buildJumpState(jump, REG));
      game.startBattle(encId, { boss: !!ENCOUNTERS[encId].boss, ...(seed != null ? { rng: makeRng(seed) } : {}) })
        .catch((e) => console.error(e));
      return true;
    },
    goto: (map, spawn) => travel.arrive(map, spawn, { kind: 'goto' }),
    travel(destId) {
      travel.go(destId);
      return true;
    },
    runScript(id, args = {}) {
      cutscenes.run(id, args).catch(() => { /* already reported by the runner */ });
      return true;
    },
    interact(id) {
      explore.interact(id).catch((e) => console.error(e));
      return true;
    },
    skip(on = true) {
      cutscenes.fast = !!on;
      engine.transitionTimeScale = on ? 5 : 1;
      return cutscenes.fast;
    },
    choices(list = []) {
      cutscenes.choices = [...list];
      return cutscenes.choices.length;
    },
    autoResolve(mode = 'policy') {
      game.autoResolve = mode || false;
      game.policy = createPolicy();
      return game.autoResolve;
    },
    godMode(on = true) {
      god = !!on;
      return god;
    },
    enemyHp(id, frac) {
      const e = model()?.get(id);
      if (!e) return null;
      e.hp = Math.max(1, Math.round(e.maxHp * frac));
      battle.ui.setHp(id, e.hp);
      return e.hp;
    },
    forceAction(enemyId, actionId) {
      forced.set(enemyId, actionId);
      return true;
    },
    ailment(memberId, stat, turns = 2) {
      const m = model();
      const c = m?.get(memberId);
      if (!c) return false;
      const events = [];
      m._setStatus(c, stat, 1, turns, 0, events);
      battle.director.play(events);
      return true;
    },
    flags(obj = {}) {
      for (const [k, v] of Object.entries(obj)) story.set(k, v);
      return { ...gameState.flags };
    },
    setLevel(n) {
      for (const m of gameState.party) {
        if (m.campaign) setMemberLevel(m, n);
        else console.warn(`debug.setLevel: ${m.id} is a POC member (no level curve)`);
      }
      return gameState.party.map((m) => m.level);
    },
    equip(memberId, slot, itemId) {
      const m = getMember(memberId);
      if (!m) return { ok: false, message: `${memberId} is not in the party` };
      if (itemId && !gameState.inventory[itemId]) addItem(itemId);
      return equip(m, slot, itemId);
    },
    party: () => gameState.party.map((m) => ({
      id: m.id, level: m.level, hp: m.hp, maxHp: m.maxHp, ep: m.ep, maxEp: m.maxEp, alive: m.alive,
      equip: m.equip ? { ...m.equip } : null, skills: [...m.skills],
    })),
    credits(n) {
      if (n != null) gameState.credits = n;
      return gameState.credits;
    },
    unlockAll() {
      for (const d of REG.destinations) story.set(`unlock:${d.id}`);
      return REG.destinations.map((d) => d.id);
    },
    // ---- saves
    save: (slot = 'slot1') => game.write(slot),
    load: (slot = 'auto') => game.load(slot),
    listSaves: () => listSlots(),
    loadSave: (json) => game.loadData(typeof json === 'string' ? JSON.parse(json) : json),
    async reloadAuto() {
      const ok = await game.load('auto');
      await untilIdle();
      return ok;
    },
    // ---- inspection
    renderInfo: () => engine.renderInfo(),
    mapInfo() {
      const map = fieldMap();
      if (!map) return null;
      return {
        map: map.id, areas: map.areas.map((a) => a.id), spawns: Object.keys(map.spawns), anchors: Object.keys(map.anchors),
        exits: map.exits.map((x) => ({ id: x.id, to: x.to })),
        interactables: (map.interactables || []).map((i) => ({ id: i.id, kind: i.kind, x: i.x, z: i.z })),
        npcs: (map.npcs || []).map((n) => n.id), chests: (map.chests || []).map((c) => c.id), gates: (map.gates || []).map((g) => g.id),
      };
    },
    /** visualLint at a viewpoint (teleports there and renders two frames first so the camera is current). */
    async visualLint(viewpoint) {
      if (viewpoint) {
        VP.debug.view(viewpoint);
        await nextFrames(2);
      }
      return explore.world ? visualLint(explore.world, explore.camera, { viewpoint: viewpoint || null }) : null;
    },
    missingArt: () => missingArt(),
    pacing: () => JSON.parse(JSON.stringify(pacing)),
    // ---- POC hooks
    skipTitle: () => game.skipTitle(),
    teleport(x, z, facing) {
      if (game.name !== 'explore') return null;
      explore.teleport(x, z, facing);
      return explore.debugInfo;
    },
    /** Teleport to a named viewpoint of the current map. */
    view(name) {
      const v = fieldMap()?.viewpoints?.[name];
      return v ? VP.debug.teleport(v.x, v.z, v.facing) : null;
    },
    get viewpoints() { return fieldMap()?.viewpoints || {}; },
    winBattle: () => { if (game.name === 'battle') battle.forceVictory(); },
    setQuality(q) {
      if (QUALITIES.includes(q)) engine.setQuality(q);
      return engine.quality;
    },
    state: () => ({
      state: game.name,
      ready: VP.ready,
      transitioning: engine.transitioning,
      quality: engine.quality,
      music: audio.track,
      map: explore.mapId || null,
      chapter: gameState.story.chapter,
      objective: gameState.story.objective,
      cutscene: cutscenes.current,
      leader: gameState.leader,
      partyIds: gameState.party.map((m) => m.id),
      autosaves: game.autosaves,
      inBattle: game.inBattle,
      explore: explore.world ? { ...explore.debugInfo } : null,
      battle: battleSnapshot(battle),
      ui: {
        blocking: ui.isBlocking(), title: ui.title.isOpen ? ui.title.phase : null, menu: ui.menu.isOpen,
        dialog: !!document.querySelector('.vp-dlg.is-open'),
        choice: !!document.querySelector('.vp-dlg.is-open.has-choices'),
        screen: ui.screens.isOpen && ui.screens.current ? ui.screens.current.getAttribute('aria-label') : null,
        card: ui.cards.isBlocking, saves: ui.saves.isOpen, starchart: ui.starchart.isOpen, shop: ui.shop.isOpen,
        prompt: document.querySelector('.vp-prompt.is-on .vp-prompt-t')?.textContent || null,
        toasts: [...document.querySelectorAll('.vp-toast')].map((t) => t.textContent),
      },
      party: gameState.party.map((p) => ({ id: p.id, hp: p.hp, maxHp: p.maxHp, ep: p.ep, level: p.level, alive: p.alive })),
      inventory: { ...gameState.inventory },
      credits: gameState.credits,
      flags: { ...gameState.flags },
      checkpoint: gameState.checkpoint,
      stats: { ...gameState.stats },
      played: [...gameState.played],
      events: { ...seen },
    }),
    // ---- extras for tests
    encounters(on) { explore.encountersEnabled = !!on; return explore.encountersEnabled; },
    give(id, n = 1) { addItem(id, n); return gameState.inventory[id]; },
    heal: () => healParty(),
    /** Every living party member to `hp` (in battle: the live combatants and their HP readouts). */
    partyHp(hp) {
      if (game.name === 'battle' && battle.model) {
        for (const c of battle.model.party) if (c.alive) { c.hp = hp; battle.ui.setHp(c.id, hp); }
      } else for (const m of gameState.party) if (m.alive) m.hp = Math.min(m.maxHp, hp);
    },
    /**
     * Party commands from a policy instead of the menu: 'auto' (heuristic: peeks at hidden
     * weaknesses, maxes Boost on Breaks), 'policy' (the human-like policy of tests/policy.mjs, as in
     * autoResolve('policy'): human-length fights for pacing runs), 'defend', or off.
     */
    autoplay(policy = 'auto') {
      battle.autoPolicy = policy === 'defend' ? (m, id) => ({ actorId: id, kind: 'defend' })
        : policy === 'policy' ? createPolicy() : null;
      battle.setAutoplay(!!policy);
    },
    /** Battle presentation speed (1 = normal); handy for slow software-GL runs. */
    speed(k = 1) {
      speed = k;
      if (!pause || !pause.paused) battle.timeScale = k;
      return k;
    },
    /** Freeze the battle `delay` battle-seconds after the next event of `type` ('weakHit' = a hit on a weakness). */
    pauseOn(type, delay = 0, uiMs = 400) {
      pause = { type, delay, uiMs, armed: true, paused: false };
    },
    resume() {
      pause = null;
      battle.timeScale = speed;
      battle.ui?.freeze(false);
    },
    get paused() { return !!(pause && pause.paused); },
  };
}

// ------------------------------------------------------------------ boot

async function boot() {
  for (let i = 0; i < BOOT_STEPS.length; i++) {
    const [label, run] = BOOT_STEPS[i];
    bootStep.textContent = label;
    await breathe();
    await run();
    bootBar.style.transform = `scaleX(${(i + 1) / BOOT_STEPS.length})`;
  }

  const title = game.add('title', new TitleState(ctx, titleScene));
  const explore = game.add('explore', new ExploreState(ctx));
  const battle = game.add('battle', new BattleState(ctx));
  installDebug({ explore, battle });

  engine.onUpdate((dt, t) => {
    input.update();
    cutscenes.update();
    ui.update(engine.realDt);   // menus, typewriter and screen locks keep real time through hit-stop
    game.update(dt, t);
    trackPace(engine.realDt);
  });
  game.change('title', { deferUI: true });
  engine.start();
  await nextFrames(2);
  bootEl.classList.add('vp-hide');
  title.showUI();
  await nextFrames(2);
  VP.ready = true;
}

boot().catch((e) => setTimeout(() => { throw e; }));
