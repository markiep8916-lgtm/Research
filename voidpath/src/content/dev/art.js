// dev location art (browser, TECH_PLAN 2.5): test characters for the registry (base inheritance,
// a hand-drawn custom one), a test texture and a particle preset. Reachable only through debug hooks
// and the preview pages.
import { Painter } from '../../art/painter.js';
import { OUTLINE } from '../../art/palette.js';

const HAIR_COPPER = ['#3a140a', '#6e2a12', '#a8461d', '#d9692e', '#f59a5a'];
const HAIR_BLACK = ['#0b0c13', '#171a26', '#272c3d', '#3d4560', '#5a6483'];

// A tiny hand-drawn maintenance drone (custom field and portrait painters).
function droneFrame(view, kind, i) {
  const p = new Painter(32, 48);
  const bob = kind === 'walk' ? i % 2 : i === 1 ? 1 : 0;
  const y = 30 + bob;
  p.ellipse(16, y, 7, 6, '#6f7c97');
  p.ellipse(15, y - 1, 5, 4, '#aab6cc');
  if (view !== 'up') p.rect(view === 'side' ? 17 : 13, y - 2, 6, 3, '#29b6e8');
  p.rect(14, y + 6, 4, 2 + (i % 2), '#ffb54a');
  p.outline(OUTLINE);
  return p;
}

function dronePortrait(expr) {
  const p = new Painter(40, 40);
  p.ellipse(20, 24, 15, 13, '#6f7c97');
  p.ellipse(18, 22, 11, 9, '#aab6cc');
  const eye = expr === 'smile' ? '#5dff9c' : expr === 'sad' ? '#4a72cf' : '#29b6e8';
  p.rect(14, 19, 12, 5, eye);
  p.outline(OUTLINE);
  return p;
}

export default {
  textures: {
    dev_grid: {
      w: 32, h: 32, wrapX: true, wrapY: true,
      paint(t) {
        t.rect(0, 0, 32, 32, '#10182a', 0.5);
        for (let k = 0; k < 32; k += 8) { t.hline(0, 31, k, '#2e4ea6', 0.45); t.vline(k, 0, 31, '#2e4ea6', 0.45); }
        t.glow(0, 0, '#7ff4ff');
      },
    },
  },
  characters: {
    // a Ringborn medic: Sera's build and coat in salvage colours, no halo
    dev_ringborn: {
      base: 'sera',
      mats: {
        hair: HAIR_COPPER,
        main: ['#4a4038', '#6e6254', '#9a8a72', '#c2b094', '#e6d6b8'],
        sec: ['#06262e', '#0b4350', '#0f6a78', '#16a0a8'],
        acc: ['#5c1220', '#9a1b30', '#d82d45', '#ff5d6c'],
      },
      hooks: { front: null },
      portrait: { after: null },
    },
    // a security officer: Kade's build, black hair, crimson uniform, no visor or scarf tail
    dev_officer: {
      base: 'kade',
      mats: {
        hair: HAIR_BLACK,
        main: ['#2c0910', '#5c1220', '#9a1b30', '#d82d45', '#ffa3aa'],
        acc: ['#141927', '#2a3349', '#3b4762', '#55667f'],
      },
      over: {},
      hooks: { behind: null },
      portrait: { over: [] },
    },
    dev_drone: {
      custom: { field: droneFrame, portrait: dronePortrait },
    },
  },
  enemyArt: {},
  particles: {
    dev_sparkle: [
      { n: 8, shape: 'plus', life: [0.6, 1.2], speed: [0.4, 1.2], dir: 'up', cone: 0.8, size: [0.08, 0.12],
        colors: ['#ff63e0', '#7ff4ff'], intensity: 2.4, fade: [0.1, 0.4], drag: 1, flicker: 0.6 },
    ],
  },
};
