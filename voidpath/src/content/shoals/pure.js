// shoals: LocationDef (PURE, TECH_PLAN 2.2), assembled from data.js, story.js and maps/.
import data from './data.js';
import story from './story.js';
import shoals from './maps/shoals.js';
import meridian from './maps/meridian.js';

export default {
  id: 'shoals',
  chapter: 'ch1',
  name: 'The Shoals',
  data,
  story,
  maps: { shoals, meridian },
};
