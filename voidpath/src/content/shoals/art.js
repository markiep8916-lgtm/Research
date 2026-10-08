// shoals: textures, characters, boss art and particle presets (browser, TECH_PLAN 2.5, 3.12).
// Environment textures live in tex.js, the Maw in maw.js, Ines Varo in chars.js.
//
// Particle presets: sh_breath (frost vapour pouring from the Maw's jaw), sh_shards (ice chips thrown
// by the breach and the tail), sh_motes (slow glowing ice motes in the Maw's lair). sh_breath flows up
// unless emitted with a `direction`.
import { TEXTURES } from './tex.js';
import { MAW, MAW_LURK } from './maw.js';
import { CHARACTERS } from './chars.js';

export default {
  textures: TEXTURES,
  characters: CHARACTERS,
  enemyArt: { maw: MAW, maw_lurk: MAW_LURK },
  particles: {
    sh_breath: [
      { n: 26, shape: 'soft', life: [0.6, 1.2], speed: [2.4, 4.2], dir: 'up', cone: 0.35, size: [0.3, 0.6],
        colors: ['#e6fdff', '#9ff0ff'], end: '#2a7fb8', intensity: 1.8, alpha: 0.7, fade: [0.1, 0.5], drag: 1.4, wobble: 0.3 },
      { n: 14, shape: 'square', life: [0.5, 1.0], speed: [2.8, 5.0], dir: 'up', cone: 0.3, size: [0.04, 0.08],
        colors: ['#ffffff', '#bff4ff'], intensity: 2.6, fade: [0.1, 0.3], drag: 0.8, gravity: 0.6 },
    ],
    sh_shards: [
      { n: 18, shape: 'square', life: [0.6, 1.1], speed: [2.2, 4.6], dir: 'up', cone: 0.9, size: [0.06, 0.14],
        colors: ['#e8f8ff', '#9fd8f0', '#5fa8d0'], intensity: 1.6, fade: [0.1, 0.4], gravity: 7, drag: 0.4, spin: 6 },
      { n: 8, shape: 'soft', life: [0.6, 1.0], speed: [0.6, 1.4], dir: 'up', cone: 1.2, size: [0.4, 0.8],
        colors: ['#bfe8ff'], end: '#1a4a6a', intensity: 0.9, alpha: 0.5, fade: [0.1, 0.5], drag: 1.2 },
    ],
    sh_motes: [
      { n: 3, shape: 'soft', life: [3, 6], speed: [0.04, 0.16], dir: 'up', cone: 1.2, size: [0.05, 0.09],
        colors: ['#9ff0ff', '#cf9dff'], end: '#1a2a60', intensity: 2.2, alpha: 0.8, fade: [0.2, 0.4], drag: 0.3, wobble: 0.4, flicker: 0.4 },
    ],
  },
};
