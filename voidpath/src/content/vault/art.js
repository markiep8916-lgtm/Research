// vault: textures, characters, boss art and particle presets (browser, TECH_PLAN 2.5, 3.12).
// Environment textures live in tex.js, ECHO in echo.js, the crew echoes and Ione in chars.js.
//
// Particle presets: va_names (the twelve thousand names: tiny glyphs streaming up fast),
// va_shards (mirror glass breaking: tumbling cyan shards), va_drift (slow violet and cyan data
// motes hanging over the grid, for ambient emitters).
import { TEXTURES } from './tex.js';
import { ECHO, ECHO_FIELD } from './echo.js';
import { CHARACTERS } from './chars.js';

export default {
  textures: TEXTURES,
  characters: CHARACTERS,
  enemyArt: { echo: ECHO, echo_field: ECHO_FIELD },
  particles: {
    va_names: [
      { n: 22, shape: 'plus', life: [0.6, 1.2], speed: [2.2, 4.4], dir: 'up', cone: 0.25, spread: 0.6, size: [0.04, 0.07],
        colors: ['#c8fbff', '#7ff4ff'], end: '#1479b0', intensity: 2.6, fade: [0.05, 0.4], drag: 0.3, flicker: 0.8 },
      { n: 8, shape: 'square', life: [0.5, 1.0], speed: [1.6, 3.6], dir: 'up', cone: 0.3, spread: 0.6, size: [0.03, 0.06],
        colors: ['#ff9ad8', '#ff4fd0'], end: '#5c1450', intensity: 2.4, fade: [0.05, 0.4], drag: 0.3, flicker: 0.9 },
    ],
    va_shards: [
      { n: 16, shape: 'shard', life: [0.6, 1.1], speed: [2.0, 4.4], cone: 1.2, size: [0.06, 0.13],
        colors: ['#d2f8fc', '#93e6f2', '#4fc4dc'], end: '#176b8c', intensity: 2.2, fade: [0.0, 0.4], gravity: 5, drag: 0.6, spin: 7 },
      { n: 4, shape: 'soft', life: [0.15, 0.3], size: [0.3, 0.5], grow: 1.6, colors: ['#c8fbff'], intensity: 1.4, alpha: 0.6, fade: [0.0, 0.7] },
    ],
    va_drift: [
      { n: 4, shape: 'square', life: [4, 8], speed: [0.03, 0.12], dir: 'up', cone: 1.0, size: [0.03, 0.06],
        colors: ['#9ff0ff', '#cf9dff', '#7ff4ff'], end: '#2a1a60', intensity: 2.0, alpha: 0.85, fade: [0.2, 0.4],
        gravity: -0.02, drag: 0.4, wobble: 0.3, flicker: 0.6 },
    ],
  },
};
