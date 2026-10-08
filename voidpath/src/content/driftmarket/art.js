// driftmarket: textures, characters and particle presets (browser, TECH_PLAN 2.5). The painters
// live in paint.js (textures), sky.js (the Tethys backdrop) and chars.js (Ruse and the townsfolk).
//
// Particle presets: dm_spark (warm lantern sparks drifting up over the market), dm_bubble (bubbles
// rising in the kelp tanks).
import { TEXTURES } from './paint.js';
import { CHARACTERS } from './chars.js';

export default {
  textures: TEXTURES,
  characters: CHARACTERS,
  enemyArt: {},
  particles: {
    dm_spark: [
      { n: 6, shape: 'square', life: [3, 6], speed: [0.05, 0.22], dir: 'up', cone: 0.8, size: [0.03, 0.05],
        colors: ['#ffd27a', '#ffb04a', '#ff8a3a'], end: '#ff3214', intensity: 2.8, fade: [0.15, 0.45],
        gravity: -0.05, drag: 0.4, wobble: 0.4, flicker: 0.6 },
      { n: 2, shape: 'soft', life: [3, 6], speed: [0.05, 0.18], dir: 'up', cone: 0.8, size: [0.12, 0.18],
        colors: ['#ffb04a'], end: '#7a2a0a', intensity: 0.9, alpha: 0.4, fade: [0.2, 0.4], gravity: -0.05, drag: 0.4, wobble: 0.3 },
    ],
    dm_bubble: [
      { n: 4, shape: 'soft', life: [1.2, 2.2], speed: [0.25, 0.5], dir: 'up', cone: 0.1, size: [0.03, 0.06],
        colors: ['#e6fffb', '#9df8ee'], end: '#3fd6d2', intensity: 1.6, alpha: 0.8, fade: [0.1, 0.3], drag: 0.6, wobble: 0.15 },
    ],
  },
};
