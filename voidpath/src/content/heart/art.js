// heart: textures and particle presets (browser, TECH_PLAN 2.5, 3.12). Environment textures live in
// tex.js; the regular enemies in enemyart.js (CA-gamma); WARDEN's art is the warden folder's (C11).
//
// Particle presets:
//   hr_motes   the Choir's light hanging in the air: slow gold motes rising, a few dawn-blue ones
//   hr_fall    light falling down the shafts and lifts: long gold streaks, a soft glow behind them
//   hr_hymn    a phrase of the hymn leaving a pylon or a pod: small gold notes floating up
import { TEXTURES } from './tex.js';

export default {
  textures: TEXTURES,
  particles: {
    hr_motes: [
      { n: 6, shape: 'soft', life: [5, 9], speed: [0.05, 0.16], dir: 'up', cone: 0.8, size: [0.04, 0.08],
        colors: ['#fff0b8', '#ffd98a', '#ffc860'], end: '#a8701c', intensity: 2.4, fade: [0.25, 0.35],
        gravity: -0.03, drag: 0.5, wobble: 0.25, flicker: 0.4 },
      { n: 2, shape: 'soft', life: [6, 10], speed: [0.03, 0.1], dir: 'up', cone: 0.8, size: [0.05, 0.08],
        colors: ['#cfe4ff', '#9fc8ff'], end: '#2a4a80', intensity: 2.0, fade: [0.3, 0.35], gravity: -0.02, drag: 0.5, wobble: 0.3 },
      { n: 1, shape: 'soft', life: [6, 10], speed: [0.03, 0.08], dir: 'up', cone: 0.7, size: [0.22, 0.34], colors: ['#ffe2a0'],
        end: '#6a4a10', intensity: 0.7, alpha: 0.35, fade: [0.3, 0.35], gravity: -0.02, drag: 0.5, wobble: 0.2 },
    ],
    hr_fall: [
      { n: 5, shape: 'streak', life: [1.2, 2.2], speed: [3.4, 6.2], dir: 'down', cone: 0.03, spread: 0.9, size: [0.03, 0.05],
        colors: ['#fff2c8', '#ffd98a', '#ffffff'], intensity: 2.4, alpha: 0.8, fade: [0.15, 0.3], streak: 0.22 },
      { n: 1, shape: 'soft', life: [1.6, 2.4], speed: [1.6, 2.8], dir: 'down', cone: 0.04, spread: 0.6, size: [0.14, 0.22],
        colors: ['#ffe2a0'], intensity: 0.8, alpha: 0.35, fade: [0.2, 0.4] },
    ],
    hr_hymn: [
      { n: 7, shape: 'plus', life: [1.4, 2.4], speed: [0.5, 1.1], dir: 'up', cone: 0.5, spread: 0.3, size: [0.05, 0.08],
        colors: ['#fff0b8', '#ffd27a'], end: '#a8701c', intensity: 2.6, fade: [0.1, 0.4], gravity: -0.2, drag: 0.6, wobble: 0.35 },
      { n: 3, shape: 'soft', life: [0.6, 1.0], size: [0.3, 0.5], grow: 1.5, colors: ['#ffe2a0'], intensity: 1.2, alpha: 0.5, fade: [0.0, 0.6] },
    ],
  },
};
