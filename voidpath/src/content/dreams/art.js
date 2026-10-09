// dreams: textures, characters and particle presets (browser, TECH_PLAN 2.5). Textures live in
// tex.js. Characters (CharDefs with `base` inheritance):
//   theo_grown     Sera's dream: Theo grown up and taller than her, rose hair still in a mop, a linen
//                  shirt and a honey waistcoat, farm boots (`base: 'theo'`; his portrait in the same
//                  colours is the dream's tell on screen)
//   dr_tomas       the Meridian's pilot, Ines's husband, alive at his seat (`base: 'kade'`)
//   dr_mer_crew    a Meridian deckhand in teal (`base: 'nyx'`)
//   dr_mer_child   a Meridian child, born aboard and never lost (`base: 'theo'`)
// The perfect HALCYON of Orion's dream is the 'holo' sheet drawn solid (hologram: false on its NpcDef).

import { TEXTURES } from './tex.js';

const TEAL_COAT = ['#061a20', '#0c2c34', '#15424c', '#205a64', '#32767c'];
const BRASS = ['#3a2a0c', '#5e4414', '#86621e', '#ae842c', '#d0a63e'];

const THEO_GROWN = {
  base: 'theo',
  mats: {
    main: ['#6a5a40', '#a89878', '#d8cbb0', '#f2ead8', '#ffffff'],
    sec: ['#4a2e10', '#7a4e1c', '#a8722c', '#d09a48'],
    acc: ['#5a3a0a', '#a8741c', '#e0a83a', '#ffd27a'],
    lea: ['#24160e', '#3e2818', '#5a3c24', '#7a5434'],
    metal: ['#1a120c', '#2e2016', '#463020', '#5e442e', '#7a5c40'],
  },
  build: { headY: 2.4, shY: 17.8, hipY: 30.0, shW: 4.9, waistW: 3.6, hipW: 3.8, armX: 5.5, hipX: 2.0, thighR: 1.9, shinR: 1.7, armR: 1.5, chest: 3.3, back: 3.0 },
  style: {
    thigh: 'lea', shin: 'lea', boot: 'metal', bootFrom: 0.62, upper: 'main', fore: 'main', cuff: 'main', hand: 'skin',
    torso: (ty, dx, view) => (view !== 'up' && ty > 1 && ty < 9 && Math.abs(dx) > 0.8 ? 'sec' : ty >= 9 ? 'sec' : 'main'),
  },
};

const TOMAS = {
  base: 'kade',
  mats: {
    hair: ['#1a0e08', '#2e1a10', '#4a2a18', '#6a3e22', '#8c5630'],
    skin: ['#6e3d2b', '#a8694a', '#cf9470', '#ecbf98'],
    main: TEAL_COAT,
    sec: ['#0e1218', '#181e28', '#252d3a', '#36404f'],
    acc: ['#5a2208', '#a8460f', '#e06a1e', '#ff9a3c'],
    metal: BRASS,
  },
  over: {},
};

const MER_CREW = {
  base: 'nyx',
  mats: {
    hair: ['#3a140a', '#6e2a12', '#a8461d', '#d9692e', '#f59a5a'],
    main: TEAL_COAT,
    acc: ['#5a2208', '#a8460f', '#e06a1e', '#ff9a3c'],
    metal: BRASS,
  },
  over: {},
};

const MER_CHILD = {
  base: 'theo',
  mats: {
    hair: ['#0b0c13', '#171a26', '#272c3d', '#3d4560', '#5a6483'],
    skin: ['#5e3626', '#94593c', '#bd7e5a', '#dda67e'],
    main: ['#0c2c34', '#15424c', '#205a64', '#32767c', '#5aa0a0'],
    sec: ['#5a2208', '#a8460f', '#e06a1e', '#ff9a3c'],
  },
};

export default {
  textures: TEXTURES,
  characters: {
    theo_grown: THEO_GROWN,
    dr_tomas: TOMAS,
    dr_mer_crew: MER_CREW,
    dr_mer_child: MER_CHILD,
  },
  enemyArt: {},
  particles: {},
};
