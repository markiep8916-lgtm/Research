// arboretum: LocationDef (PURE, TECH_PLAN 2.2), assembled from data.js, story.js and maps/.
import data from './data.js';
import story from './story.js';
import arboretum from './maps/arboretum.js';

export default {
  id: 'arboretum',
  chapter: 'ch2',
  name: 'The Arboretum',
  data,
  story,
  maps: { arboretum },
};
