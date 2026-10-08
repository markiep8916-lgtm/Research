// Browser content aggregator (TECH_PLAN 2.1, 2.6): every location's index.js by fixed path, the
// art registrars the registry hands browser parts to, and the art cache's location lookup.
// main.js and preview pages call registerAll(); Wave C owners never edit this file.
//
// export const LOCATIONS          browser LocationDefs in registration order (common first, dev last)
// export function registerAll() -> REG   idempotent: registers every index.js, then applyBalance()
// export { registerAllData }      the pure path (no art), also idempotent
// export * from './registry.js'

import { registerLocation, finishRegistration, setRegistrars, locationOfArt, REG } from './registry.js';
import { artCache } from '../art/cache.js';
import * as tiles from '../art/tiles.js';
import * as characters from '../art/characters.js';
import * as enemies from '../art/enemies.js';
import * as particles from '../core/particles.js';
import * as props from '../world/props.js';
import * as arena from '../battle/arena.js';
import * as actionfx from '../battle/actionfx.js';
import common from './common/index.js';
import prologue from './prologue/index.js';
import driftmarket from './driftmarket/index.js';
import shoals from './shoals/index.js';
import arboretum from './arboretum/index.js';
import spire from './spire/index.js';
import vault from './vault/index.js';
import heart from './heart/index.js';
import dreams from './dreams/index.js';
import warden from './warden/index.js';
import epilogue from './epilogue/index.js';
import dev from './dev/index.js';

export * from './registry.js';
export { registerAllData, PURE_LOCATIONS } from './data.js';

export const LOCATIONS = [common, prologue, driftmarket, shoals, arboretum, spire, vault, heart, dreams, warden, epilogue, dev];

setRegistrars({
  texture: tiles.registerTexture,
  character: characters.registerCharacter,
  enemyArt: enemies.registerEnemyArt,
  preset: particles.registerPreset,
  prop: props.registerProp,
  arena: arena.registerArena,
  actionFx: actionfx.registerActionFx,
});
// The art cache files painted canvases under the location that registered them (eviction, 11.5).
artCache.locate = locationOfArt;

export function registerAll() {
  for (const loc of LOCATIONS) registerLocation(loc);
  finishRegistration();
  return REG;
}
