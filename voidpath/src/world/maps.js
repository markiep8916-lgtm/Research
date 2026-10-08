// Re-export shim (Wave S only; gate G1 deletes it): the POC map now lives in
// src/content/prologue/maps/halcyon.js as a MapDef (TECH_PLAN 2.9 rename table).

import halcyon from '../content/prologue/maps/halcyon.js';

export default halcyon;
export const SPAWN = halcyon.spawns.start;
export const VIEWPOINTS = halcyon.viewpoints;
export const BOSS = { ...halcyon.bosses[0] };
export const MAP = halcyon.grid;
export const AREAS = halcyon.areas;
