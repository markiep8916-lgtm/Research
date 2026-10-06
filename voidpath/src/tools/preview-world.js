// World preview: the full field (ExploreState) with the real engine, input, audio and UI, a stub
// game whose startBattle shatters out and straight back in (the boss counts as beaten), and debug
// hooks for screenshots. URL params: ?q=low|medium|high  &enc=0 (no random encounters)
//   &at=<viewpoint name> (cryo | corridor | engineering | antechamber | bridge)
// window.__PREVIEW = { ready, explore, teleport(x, z, facing), view(name), viewpoints, ctx, game, frames,
//   prewarmMs (prewarmWorld: art caches), buildMs (first ExploreState.enter(): world assembly) }

import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { UI } from '../ui/ui.js';
import { gameState, resetGame, useItemOutOfBattle } from '../core/state.js';
import { ITEMS, PARTY_DEFS } from '../battle/data.js';
import { buildPortrait } from '../art/characters.js';
import { iconURL } from '../art/icons.js';
import { isTouchDevice, wait } from '../core/util.js';
import { ExploreState, VIEWPOINTS, prewarmWorld } from '../world/explore.js';

const params = new URLSearchParams(location.search);
const quality = params.get('q') || (isTouchDevice() ? 'medium' : 'high');

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

const _feet = new THREE.Vector3();

// Stub of core/game.js: a shatter out and back in instead of a real battle.
const game = {
  current: null,
  battles: [],
  startBattle(encounterId, { boss = false } = {}) {
    console.log(`[preview-world] startBattle ${encounterId}${boss ? ' (boss)' : ''}`);
    game.battles.push(encounterId);
    ui.hud.toast(`Battle: *${encounterId}*${boss ? ' · boss' : ''}`, { icon: 'attack' });
    audio.sfx('encounter');
    const p = explore.player;
    _feet.set(p.x, 0.8, p.z);
    engine.transition('shatter', {
      duration: 0.9,
      center: engine.projectToScreen(_feet),
      onMidpoint: async () => {
        explore.exit();
        if (boss) gameState.flags.boss_defeated = true;
        await wait(350);
        explore.enter({ resume: true });
      },
    });
  },
};

const ctx = { engine, input, audio, ui, state: gameState, game };
const explore = new ExploreState(ctx);
game.current = explore;
if (params.get('enc') === '0') explore.encountersEnabled = false;

window.__PREVIEW = {
  ready: false,
  frames: 0,
  prewarmMs: 0,
  buildMs: 0,
  explore,
  ctx,
  game,
  viewpoints: VIEWPOINTS,
  teleport: (x, z, facing) => explore.teleport(x, z, facing),
  view: (name) => {
    const v = VIEWPOINTS[name];
    explore.teleport(v.x, v.z, v.facing);
    return v;
  },
};

let frames = 0;
engine.onUpdate((dt, t) => {
  input.update();
  ui.update(dt);
  explore.update(dt, t);
  gameState.stats.playTime += dt;
  frames++;
  window.__PREVIEW.frames = frames;
  if (frames === 3) {
    window.__PREVIEW.ready = true;
    document.getElementById('vp-boot').classList.add('vp-hide');
  }
});

const t0 = performance.now();
prewarmWorld().then(() => {
  const t1 = performance.now();
  explore.enter();
  window.__PREVIEW.prewarmMs = Math.round(t1 - t0);
  window.__PREVIEW.buildMs = Math.round(performance.now() - t1);
  if (params.get('at') && VIEWPOINTS[params.get('at')]) window.__PREVIEW.view(params.get('at'));
  engine.start();
});
