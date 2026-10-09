// warden: textures, boss art and particle presets (browser, TECH_PLAN 2.5, 3.12, 7.6). The crown
// arena's textures live in tex.js, WARDEN's two forms (and its field version) in wardenart.js.
//
// Particle presets:
//   wd_motes    the Heart's slow gold choir dust, hanging and drifting down (ambient emitters)
//   wd_choir    the Choir's light flooding in: a burst of gold and dawn-white motes rising fast
//   wd_voices   the sleepers' voices: pale gold sparks rising in slow, wavering columns
//   wd_dawn     morning light: white-blue sparks and soft glows (Theo's voice, the end of the song)
//   wd_hymn     notes of the hymn: gold sparks spreading out in a ring, and a soft swell of light
import { TEXTURES } from './tex.js';
import { WARDEN_LOCK, WARDEN_UNBOUND, WARDEN_FIELD } from './wardenart.js';

export default {
  textures: TEXTURES,
  characters: {},
  enemyArt: { warden_lock: WARDEN_LOCK, warden_unbound: WARDEN_UNBOUND, warden_field: WARDEN_FIELD },
  particles: {
    wd_motes: [
      { n: 4, shape: 'square', life: [5, 9], speed: [0.03, 0.12], dir: 'down', cone: 0.9, size: [0.03, 0.06],
        colors: ['#ffe9a6', '#ffd27a', '#fff6d8'], end: '#5a3a0a', intensity: 2.0, alpha: 0.85, fade: [0.2, 0.4],
        gravity: 0.02, drag: 0.4, wobble: 0.35, flicker: 0.5 },
    ],
    wd_choir: [
      { n: 30, shape: 'soft', life: [0.8, 1.6], speed: [1.6, 4.2], dir: 'up', cone: 0.9, spread: 1.4, size: [0.06, 0.14],
        colors: ['#fff6d8', '#ffd27a', '#ffc84a'], end: '#a86c14', intensity: 2.8, fade: [0.05, 0.5], drag: 0.5, flicker: 0.4 },
      { n: 12, shape: 'plus', life: [0.6, 1.2], speed: [2.0, 4.8], dir: 'up', cone: 0.6, spread: 1.0, size: [0.05, 0.09],
        colors: ['#ffffff', '#e2eeff'], end: '#5d79b4', intensity: 3.0, fade: [0.05, 0.4], drag: 0.4 },
    ],
    wd_voices: [
      { n: 10, shape: 'soft', life: [1.6, 2.8], speed: [0.5, 1.2], dir: 'up', cone: 0.25, spread: 0.6, size: [0.05, 0.1],
        colors: ['#fff0c0', '#ffe2a0', '#e2eeff'], end: '#a86c14', intensity: 2.4, alpha: 0.9, fade: [0.15, 0.5],
        drag: 0.2, wobble: 0.6, flicker: 0.5 },
    ],
    wd_dawn: [
      { n: 18, shape: 'plus', life: [0.6, 1.3], speed: [0.8, 2.4], cone: 1.4, spread: 1.0, size: [0.05, 0.1],
        colors: ['#ffffff', '#e2eeff', '#a9c4f0'], end: '#2a3c66', intensity: 3.0, fade: [0.05, 0.4], drag: 0.6 },
      { n: 5, shape: 'soft', life: [0.3, 0.6], size: [0.4, 0.8], grow: 1.6, colors: ['#e2eeff'], intensity: 1.6, alpha: 0.5, fade: [0.0, 0.7] },
    ],
    wd_hymn: [
      { n: 10, shape: 'plus', life: [0.8, 1.4], speed: [0.6, 1.6], dir: 'ring', cone: 0.3, spread: 0.3, size: [0.06, 0.1],
        colors: ['#ffd978', '#fff0c0'], end: '#a86c14', intensity: 2.6, alpha: 0.9, fade: [0.05, 0.5], drag: 0.3, wobble: 0.3 },
      { n: 3, shape: 'soft', life: [0.4, 0.7], size: [0.3, 0.5], grow: 2.2, colors: ['#ffe9a6'], intensity: 1.6, alpha: 0.5, fade: [0.0, 0.7] },
    ],
  },
};
