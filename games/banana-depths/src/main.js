import { Game } from './game/game.js';
import { Touch } from './ui/touch.js';
import { validateWorld } from './world/world.js';

const app = document.getElementById('app');
const stage = document.createElement('div');
stage.id = 'stage';
app.appendChild(stage);

for (const e of validateWorld()) console.error('[world]', e);

const game = new Game(stage);
const touch = new Touch(game);
const origTick = game.tick.bind(game);
game.tick = (dt) => { origTick(dt); touch.update(); };

// first user gesture unlocks audio
const unlock = () => game.audio.unlock();
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('keydown', unlock);

// handy for tests and tinkering from the console
window.__bd = {
  game,
  /** run scripted input: [{n, held:['right','jump'], press:['jump']}]  (press = edge on the segment's first frame) */
  run(segs) {
    for (const s of segs) {
      let i = 0;
      game.input.scripted = () => {
        const held = Object.fromEntries((s.held || []).map((a) => [a, true]));
        const pressed = {};
        if (i === 0) for (const a of s.press || []) pressed[a] = true;
        i++;
        return { held, pressed };
      };
      for (let k = 0; k < s.n; k++) { game.tick(1 / 60); touch.update(); if (s.until && s.until(game)) break; }
    }
    game.input.scripted = null;
    game.render(1);
    return game.snapshot();
  },
};
window.__ready = true;
