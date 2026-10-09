// arboretum: textures, characters, boss art and particle presets (browser, TECH_PLAN 2.5, 3.12).
// Environment textures live in tex.js, the Gardener in gardener.js, the cast in chars.js; the regular
// bestiary art is enemyart.js (CA-beta1).
//
// Particle presets:
//   arb_vines   torn vines and leaves falling away (the Gardener freed, her hurt and break)
//   arb_pollen  a cloud of gold pollen drifting down (her Pollen)
//   arb_sun     dome light pouring down as warm motes and streaks (Gather Light, Photosynthesis)
//   arb_seeds   glowing seeds flung in arcs that bounce on the floor (her Sow)

import { TEXTURES } from './tex.js';
import { GARDENER, GARDENER_FIELD } from './gardener.js';
import { CHARACTERS } from './chars.js';

export default {
  textures: TEXTURES,
  characters: CHARACTERS,
  enemyArt: { gardener: GARDENER, gardener_field: GARDENER_FIELD },
  particles: {
    arb_vines: [
      { n: 14, blend: 'normal', shape: 'shard', life: [1.6, 2.6], speed: [0.4, 1.4], dir: 'sphere', size: [0.08, 0.16],
        colors: ['#2e7535', '#40903f', '#5cac4f', '#1b5226'], alpha: 1, fade: [0.05, 0.3], gravity: 1.6, drag: 1.2, wobble: 0.5, spin: 4 },
      { n: 6, blend: 'normal', shape: 'streak', life: [1.0, 1.6], speed: [0.6, 1.6], dir: 'down', cone: 0.6, size: [0.03, 0.05],
        colors: ['#2a5820', '#3a722a'], alpha: 0.9, fade: [0.05, 0.3], gravity: 3, drag: 0.6, streak: 0.12 },
    ],
    arb_pollen: [
      { n: 26, shape: 'soft', life: [1.4, 2.4], speed: [0.2, 0.7], dir: 'sphere', spread: 0.6, size: [0.05, 0.1],
        colors: ['#fff07a', '#e8c43a', '#fffbe0'], end: '#8a6a12', intensity: 2.2, alpha: 0.85, fade: [0.1, 0.4], gravity: 0.25, drag: 1.1, wobble: 0.45, flicker: 0.4 },
      { n: 6, shape: 'soft', life: [1.6, 2.4], speed: [0.1, 0.3], dir: 'sphere', spread: 0.5, size: [0.35, 0.6],
        colors: ['#e8c43a'], end: '#4a3608', intensity: 0.8, alpha: 0.35, fade: [0.2, 0.5], gravity: 0.1, drag: 1, wobble: 0.3 },
    ],
    arb_sun: [
      { n: 18, shape: 'soft', life: [1.2, 2.0], speed: [0.8, 1.6], dir: 'down', cone: 0.25, spawn: 'disc', spread: 0.9, size: [0.05, 0.09],
        colors: ['#ffe68a', '#ffc23a', '#fffbe0'], end: '#c07a12', intensity: 2.6, alpha: 0.9, fade: [0.15, 0.4], drag: 0.4, flicker: 0.3 },
      { n: 6, shape: 'streak', life: [0.5, 0.8], speed: [3, 4.5], dir: 'down', cone: 0.08, spawn: 'disc', spread: 0.7, size: [0.03, 0.05],
        colors: ['#fff3c0'], end: '#ffc23a', intensity: 3, alpha: 0.8, fade: [0.1, 0.3], streak: 0.1 },
    ],
    arb_seeds: [
      { n: 10, shape: 'square', life: [0.9, 1.4], speed: [2.2, 3.6], dir: 'up', cone: 0.7, size: [0.05, 0.08],
        colors: ['#b0f56a', '#5cc22a', '#f0ffd8'], end: '#2c6a12', intensity: 2.4, fade: [0.05, 0.3], gravity: 7, bounce: 0.3, spin: 3 },
      { n: 6, blend: 'normal', shape: 'square', life: [0.6, 1.0], speed: [0.8, 1.6], dir: 'up', cone: 1.1, size: [0.04, 0.07],
        colors: ['#3d2b1c', '#4e3824'], alpha: 0.9, fade: [0.05, 0.3], gravity: 6, drag: 0.4 },
    ],
  },
};
