// PURE content aggregator (TECH_PLAN 2.1, 2.6): every location's pure.js by fixed path. Node tools
// (tests, scriptcheck, the balance simulator) import this file; Wave C owners never edit it.
//
// export const PURE_LOCATIONS     LocationDefs in registration order (common first, dev last)
// export function registerAllData() -> REG   idempotent: registers every pure.js, then applyBalance()
// export * from './registry.js'

import { registerData, finishRegistration, REG } from './registry.js';
import common from './common/pure.js';
import prologue from './prologue/pure.js';
import driftmarket from './driftmarket/pure.js';
import shoals from './shoals/pure.js';
import arboretum from './arboretum/pure.js';
import spire from './spire/pure.js';
import vault from './vault/pure.js';
import heart from './heart/pure.js';
import dreams from './dreams/pure.js';
import warden from './warden/pure.js';
import epilogue from './epilogue/pure.js';
import dev from './dev/pure.js';

export * from './registry.js';

export const PURE_LOCATIONS = [common, prologue, driftmarket, shoals, arboretum, spire, vault, heart, dreams, warden, epilogue, dev];

export function registerAllData() {
  for (const loc of PURE_LOCATIONS) registerData(loc);
  finishRegistration();
  return REG;
}
