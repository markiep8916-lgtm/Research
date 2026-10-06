// Battle preview: boots the engine, input, audio, field UI and game state like a mini game and runs a
// BattleState for the encounter in the URL hash, restarting it whenever it ends.
//   #drone_pair (default) | #crawler_drone | #turret_squad | #boss_sentinel | #drone_single | #crawler_pair
//   options: @corridor|@engineering|@bridge|@cryo (arena override), &auto (party autoplay), &seed=N,
//   &fast (3x battle speed, for slow headless runs)
//   e.g. dist/tools/preview-battle.html#boss_sentinel@corridor&auto&seed=4
// window.__PREVIEW = { ready, battle, model, stage, ui, autoplay(on), seen, log, pauseOn(pred, delay),
//   resume(), menuOpen(), restart(hash), forceVictory(), setHp(id, hp), wound(hp), nearLevel() } for
//   scripted screenshots.

import { Engine } from '../core/engine.js';
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { UI } from '../ui/ui.js';
import { gameState, resetGame, healParty, useItemOutOfBattle } from '../core/state.js';
import { ITEMS, PARTY_DEFS, ENCOUNTERS } from '../battle/data.js';
import { buildPortrait, buildBattleSprite, PARTY_IDS } from '../art/characters.js';
import { prebuildEnemySprites } from '../art/enemies.js';
import { iconURL } from '../art/icons.js';
import { buildTexture } from '../art/tiles.js';
import { BattleState } from '../battle/battleState.js';
import { isTouchDevice, makeRng } from '../core/util.js';

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
  const [head, ...flags] = raw.split('&');
  const [id, backdrop] = (head || '').split('@');
  const opts = { encounterId: ENCOUNTERS[id] ? id : 'drone_pair', backdrop: backdrop || null, auto: false, seed: null, fast: false };
  for (const f of flags) {
    if (f === 'auto') opts.auto = true;
    else if (f === 'fast') opts.fast = true;
    else if (f.startsWith('seed=')) opts.seed = Number(f.slice(5)) || 1;
  }
  return opts;
}

const engine = new Engine(document.getElementById('view'), { quality: isTouchDevice() ? 'medium' : 'high' });
const input = new Input({ touchLayer: document.getElementById('touch-layer') });
const ui = new UI({
  root: document.getElementById('ui-root'), input, audio, state: gameState, engine,
  onUseItem: useItemOutOfBattle, items: ITEMS, partyDefs: PARTY_DEFS,
});
ui.setPortraitProvider(buildPortrait);
ui.setIconProvider((n) => iconURL(n, 2));
input.onAny(() => audio.init());

const battle = new BattleState({ engine, input, audio, ui, state: gameState, game: null });

const P = {
  ready: false,
  battle,
  get model() { return battle.model; },
  get stage() { return battle.stage; },
  get ui() { return battle.ui; },
  speed: 1,
  seen: {},
  log: [],
  results: [],
  autoplay(on = true) { battle.setAutoplay(on); return on; },
  menuOpen() { return !!(battle.ui && battle.ui.cmd); },
  forceVictory() { battle.forceVictory(); },
  /**
   * Freeze the battle `delay` seconds (battle time) after an event matching pred (type string or fn);
   * DOM animations keep running for `uiMs` more real milliseconds so popups are mid-animation.
   */
  pauseOn(pred, delay = 0, uiMs = 700) {
    P._pause = { test: typeof pred === 'function' ? pred : (e) => e.type === pred, delay, uiMs, armed: true };
    P.paused = false;
  },
  resume() {
    P._pause = null;
    P.paused = false;
    battle.timeScale = P.speed;
    battle.ui?.freeze(false);
  },
  setHp(id, hp) {
    const c = battle.model.get(id);
    c.hp = hp;
    battle.ui.setHp(id, hp);
  },
  /** Party members a few EXP short of their next level (to see level-ups on the results panel). */
  nearLevel() {
    for (const m of gameState.party) m.xp = Math.max(0, m.xpNext - 20);
  },
  /** Every living party member down to `hp` (e.g. to watch a defeat). */
  wound(hp = 1) {
    for (const c of battle.model.party) if (c.alive) P.setHp(c.id, hp);
  },
  restart(hash) {
    if (hash != null) location.hash = hash;
    start();
  },
};
window.__PREVIEW = P;

battle.onEvent = (e) => {
  P.seen[e.type] = (P.seen[e.type] || 0) + 1;
  P.log.push(e.type);
  if (P.log.length > 400) P.log.shift();
  const pz = P._pause;
  if (pz && pz.armed && pz.test(e)) {
    pz.armed = false;
    battle.stage.wait(pz.delay).then(() => {
      if (P._pause !== pz) return;
      battle.timeScale = 0;
      setTimeout(() => {
        if (P._pause !== pz) return;
        battle.ui.freeze(true);
        P.paused = true;
      }, pz.uiMs);
    });
  }
};

let starting = false;
async function start() {
  if (starting) return;
  starting = true;
  const opts = parseHash();
  if (battle.stage) {
    await engine.transition('fade', { duration: 0.6, onMidpoint: () => { battle.exit(); begin(opts); } });
  } else begin(opts);
  starting = false;
}

function begin(opts) {
  if (gameState.party.every((p) => !p.alive) || ENCOUNTERS[opts.encounterId].boss) healParty();
  P.speed = opts.fast ? 3 : 1;
  P.resume();
  battle.autoplay = opts.auto;
  battle.enter({
    encounterId: opts.encounterId,
    backdrop: opts.backdrop,
    rng: opts.seed != null ? makeRng(opts.seed) : undefined,
    onEnd: (result) => {
      P.results.push(result);
      if (result === 'defeat') resetGame();
      start();
    },
  });
}

engine.onUpdate((dt, t) => {
  input.update();
  ui.update(dt);
  battle.update(dt, t);
});
engine.start();

window.addEventListener('hashchange', () => start());

// warm the art caches behind the boot screen, then fight
(async () => {
  resetGame();
  buildTexture('space_backdrop');
  for (const id of PARTY_IDS) buildBattleSprite(id);
  await prebuildEnemySprites();
  begin(parseHash());
  document.getElementById('vp-boot')?.classList.add('vp-hide');
  let frames = 0;
  const off = engine.onUpdate(() => {
    if (++frames < 3) return;
    off();
    P.ready = true;
  });
})();
