// VOIDPATH boot: engine, input, audio and UI wiring; every heavy piece of procedural art is painted
// behind the loading screen (yielding between steps so the page stays responsive); then the game
// state machine starts on the title (title -> field <-> battle). window.__VP exposes debug hooks
// that the headless scenarios in tests/scenarios drive.

import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { audio } from './core/audio.js';
import { UI } from './ui/ui.js';
import { Game } from './core/game.js';
import { TitleScene, TitleState } from './core/titleScene.js';
import { gameState, healParty, addItem, useItemOutOfBattle } from './core/state.js';
import { ITEMS, PARTY_DEFS, ENCOUNTERS } from './battle/data.js';
import { BattleState } from './battle/battleState.js';
import { ExploreState, VIEWPOINTS, prewarmWorld } from './world/explore.js';
import { PARTY_IDS, buildFieldSprite, buildBattleSprite, buildPortrait, buildNpcSprite } from './art/characters.js';
import { ENEMY_KINDS, buildEnemySprite, buildEnemyIcon } from './art/enemies.js';
import { ICON_NAMES, iconURL } from './art/icons.js';
import { buildTexture } from './art/tiles.js';
import { FX_NAMES, fxSheet } from './art/fx.js';
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

const engine = new Engine(document.getElementById('view'), { quality: startQuality() });
const input = new Input({ touchLayer: document.getElementById('touch-layer') });
const ui = new UI({
  root: document.getElementById('ui-root'), input, audio, state: gameState, engine,
  onUseItem: useItemOutOfBattle, items: ITEMS, partyDefs: PARTY_DEFS,
});
ui.setPortraitProvider(buildPortrait);
ui.setIconProvider((n) => iconURL(n, 2));

// Audio may only start inside a real user gesture (iOS): unlock from the DOM events themselves.
input.onAny(() => audio.init());
for (const type of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(type, () => audio.init(), { once: true, capture: true });
audio.music('title');

const ctx = { engine, input, audio, ui, state: gameState, game: null };
const game = new Game(ctx);

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

let titleScene = null;
const BOOT_STEPS = [
  ['Painting the void', () => buildTexture('space_backdrop')],
  ['Plating the hull', () => prewarmWorld()],
  ...PARTY_IDS.map((id) => ['Waking the travelers', () => { buildFieldSprite(id); buildBattleSprite(id); buildPortrait(id); }]),
  ['Booting BOLT', () => { for (const k of ['bolt', 'holo']) { buildNpcSprite(k); buildPortrait(k); } }],
  ...ENEMY_KINDS.map((k) => ['Arming the security grid', () => { buildEnemySprite(k); buildEnemyIcon(k); }]),
  ['Charging the arsenal', () => FX_NAMES.forEach((n) => fxSheet(n))],
  ['Etching the interface', () => ICON_NAMES.forEach((n) => { iconURL(n, 1); iconURL(n, 2); })],
  ['Opening the observation deck', () => { titleScene = new TitleScene(engine); }],
  ['Opening the observation deck', () => titleScene.warm()],
];

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

function installDebug({ explore, battle }) {
  battle.onEvent = (e) => {
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
  let speed = 1;
  VP.debug = {
    skipTitle: () => game.skipTitle(),
    /** Start a battle from anywhere (skips the title). opts: { seed } for a deterministic model. */
    startBattle(encId = 'drone_single', { seed } = {}) {
      if (!ENCOUNTERS[encId]) return false;
      if (game.name === 'title') game.skipTitle();
      return game.startBattle(encId, { boss: !!ENCOUNTERS[encId].boss, ...(seed != null ? { rng: makeRng(seed) } : {}) });
    },
    teleport(x, z, facing) {
      if (game.name !== 'explore') return null;
      explore.teleport(x, z, facing);
      return explore.debugInfo;
    },
    /** Teleport to a named viewpoint: cryo | corridor | engineering | antechamber | bridge. */
    view(name) {
      const v = VIEWPOINTS[name];
      return v ? VP.debug.teleport(v.x, v.z, v.facing) : null;
    },
    viewpoints: VIEWPOINTS,
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
      explore: explore.world ? { ...explore.debugInfo, boss: !!explore.world.boss?.present } : null,
      battle: battleSnapshot(battle),
      ui: {
        blocking: ui.isBlocking(), title: ui.title.isOpen ? ui.title.phase : null, menu: ui.menu.isOpen,
        dialog: !!document.querySelector('.vp-dlg.is-open'),
        choice: !!document.querySelector('.vp-dlg.is-open.has-choices'),
        screen: ui.screens.isOpen && ui.screens.current ? ui.screens.current.getAttribute('aria-label') : null,
        prompt: document.querySelector('.vp-prompt.is-on .vp-prompt-t')?.textContent || null,
        toasts: [...document.querySelectorAll('.vp-toast')].map((t) => t.textContent),
      },
      party: gameState.party.map((p) => ({ id: p.id, hp: p.hp, maxHp: p.maxHp, ep: p.ep, level: p.level, alive: p.alive })),
      inventory: { ...gameState.inventory },
      flags: { ...gameState.flags },
      checkpoint: gameState.checkpoint,
      stats: { ...gameState.stats },
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
    /** Party commands from a policy instead of the menu: 'auto' (heuristic), 'defend', or off. */
    autoplay(policy = 'auto') {
      battle.autoPolicy = policy === 'defend' ? (m, id) => ({ actorId: id, kind: 'defend' }) : null;
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
    ui.update(engine.realDt);   // menus, typewriter and screen locks keep real time through hit-stop
    game.update(dt, t);
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
