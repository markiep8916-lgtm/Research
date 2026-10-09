// epilogue: textures, characters, enemy art and particle presets (browser, TECH_PLAN 2.5). Early stub:
// bd_ione_dawn (the shore's sky and the title's dawn variant) as a plain dawn gradient.

import { makeCanvas } from '../../art/painter.js';

function paintIoneDawn() {
  const cv = makeCanvas(1024, 512);
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#2a3a66');
  grad.addColorStop(0.55, '#f2a6a0');
  grad.addColorStop(0.62, '#ffd9b0');
  grad.addColorStop(1, '#bcd6ec');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 512);
  return cv;
}

export default {
  textures: {
    bd_ione_dawn: { w: 1024, h: 512, raw: paintIoneDawn, emissiveIsMap: true },
  },
  characters: {},
  enemyArt: {},
  particles: {},
};
