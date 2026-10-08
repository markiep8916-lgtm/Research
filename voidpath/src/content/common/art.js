// common art (browser, TECH_PLAN 2.5): the Halcyon fabricator's face for its shop window (the
// `fabricator` ShopDef's portrait). Painted on first use, never at module load.
import { Painter } from '../../art/painter.js';
import { OUTLINE } from '../../art/palette.js';

const STEEL = ['#171b26', '#2a3142', '#46506a', '#6f7c97', '#aab6cc'];
const CYAN = ['#0b2a36', '#29b6e8', '#7ff4ff', '#e8fdff'];
const AMBER = '#ffb54a';

// A wall unit: steel housing, a screen with a turning cog, a status lamp and the print nozzle.
function fabricatorPortrait() {
  const p = new Painter(40, 40);
  p.rect(6, 5, 28, 31, STEEL[2]);
  p.rect(7, 6, 26, 2, STEEL[3]);
  p.rect(6, 33, 28, 3, STEEL[1]);
  p.rect(9, 9, 22, 15, STEEL[0]);
  p.rect(10, 10, 20, 13, CYAN[0]);
  p.ring(20, 16, 4, CYAN[1], 2);
  for (const [dx, dy] of [[0, -6], [0, 6], [-6, 0], [6, 0], [-4, -4], [4, 4], [-4, 4], [4, -4]]) p.rect(19 + dx, 15 + dy, 2, 2, CYAN[1]);
  p.rect(19, 15, 2, 2, CYAN[3]);
  p.hline(11, 29, 11, CYAN[2]);
  for (let x = 10; x <= 23; x += 3) p.hline(x, x + 1, 27, STEEL[1]);
  p.rect(27, 26, 3, 3, AMBER);
  p.px(28, 27, '#fff3c8');
  p.rect(17, 30, 6, 4, STEEL[4]);
  p.rect(19, 34, 2, 3, AMBER);
  p.outline(OUTLINE);
  return p;
}

// Never walks the field; a still frame keeps the custom-character contract complete.
function fabricatorFrame() {
  const p = new Painter(32, 48);
  p.blit(fabricatorPortrait(), -4, 8);
  return p;
}

export default {
  characters: {
    fabricator: { custom: { field: fabricatorFrame, portrait: fabricatorPortrait } },
  },
};
