// heart: LocationDef (PURE, TECH_PLAN 2.2), assembled from data.js, story.js and maps/.
import data from './data.js';
import story from './story.js';
import heart from './maps/heart.js';

export default {
  id: 'heart',
  chapter: 'finale',
  name: 'The Heart',
  data,
  story,
  maps: { heart },
};
