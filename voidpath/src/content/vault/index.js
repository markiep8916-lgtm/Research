// vault: browser LocationDef (TECH_PLAN 2.2): the pure parts plus art, props, arenas and fx.
import pure from './pure.js';
import art from './art.js';
import enemyArt from './enemyart.js';
import props from './props.js';
import arenas from './arena.js';
import actionFx from './fx.js';

export default { ...pure, art, enemyArt, props, arenas, actionFx };
