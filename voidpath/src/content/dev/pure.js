// dev: test-only LocationDef (PURE, TECH_PLAN 2.2). Reachable only through debug hooks.
import data from './data.js';
import story from './story.js';
import devBox from './maps/dev_box.js';

export default { id: 'dev', chapter: 'prologue', name: 'Dev Box', data, story, maps: { dev_box: devBox } };
