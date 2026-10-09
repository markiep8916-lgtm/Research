// spire: textures, characters, boss art and particle presets (browser, TECH_PLAN 2.5, 3.12).
// Environment textures live in tex.js, Voss's battle sheets in voss.js, her field and portrait art and
// the cadets in chars.js.
//
// Particle presets: sp_ash (dull red cinders drifting down through the floodlights; the tower's
// air is scorched and filtered), sp_motes (slow gold-white motes over the holo table, and the
// upload light rising off Voss at the end).
import { TEXTURES } from './tex.js';
import { CHARACTERS } from './chars.js';
import { VOSS, VOSS_OVERCLOCK } from './voss.js';

export default {
  textures: TEXTURES,
  characters: CHARACTERS,
  enemyArt: { voss: VOSS, voss_overclock: VOSS_OVERCLOCK },
  particles: {
    sp_ash: [
      { n: 10, shape: 'square', life: [5, 9], speed: [0.05, 0.16], dir: 'down', cone: 0.9, size: [0.025, 0.05],
        colors: ['#ff6a4a', '#ff3a3a', '#c83030'], end: '#401010', intensity: 1.8, alpha: 0.85, fade: [0.15, 0.4], drag: 0.2, wobble: 0.12, flicker: 0.5 },
      { n: 6, shape: 'soft', life: [6, 10], speed: [0.03, 0.1], dir: 'down', cone: 1.1, size: [0.05, 0.09],
        colors: ['#6a5a5c', '#4a3c40'], intensity: 0.6, alpha: 0.5, fade: [0.2, 0.4], drag: 0.2, wobble: 0.1 },
    ],
    sp_motes: [
      { n: 4, shape: 'soft', life: [2.5, 5], speed: [0.08, 0.22], dir: 'up', cone: 0.8, size: [0.05, 0.1],
        colors: ['#fff0c0', '#ffd27a', '#f6f8ff'], end: '#6a4a10', intensity: 2.4, alpha: 0.85, fade: [0.2, 0.4], drag: 0.3, wobble: 0.3, flicker: 0.4 },
    ],
  },
};
