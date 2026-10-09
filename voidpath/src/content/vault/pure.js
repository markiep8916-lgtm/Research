// vault: LocationDef (PURE, TECH_PLAN 2.2), assembled from data.js, story.js and maps/.
import data from './data.js';
import story from './story.js';
import vault from './maps/vault.js';

export default {
  id: 'vault',
  chapter: 'ch4',
  name: 'Memory Vault',
  data,
  story,
  maps: { vault },
};
