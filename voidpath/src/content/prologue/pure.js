// prologue: LocationDef (PURE, TECH_PLAN 2.2), assembled from data.js, story.js and maps/.
import data from './data.js';
import story from './story.js';
import halcyon from './maps/halcyon.js';

export default {
  id: 'prologue',
  chapter: 'prologue',
  name: 'ISV Halcyon',
  data,
  story,
  maps: { halcyon },
};
