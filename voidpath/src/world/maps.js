// The ISV Halcyon field map: one connected 48 x 30 tile diorama with four areas.
// 1 tile = 1 world unit; cell (c, r) spans x c..c+1, z r..r+1 (+Z = south, toward the camera).
//
// Legend
//   ' '  void (outside the ship: fog / darkness)
//   '#'  wall, plain panel front        'v'  wall, vent front
//   's'  wall, screen front (animated)  'p'  wall, exposed pipes front
//   'W'  window (always in pairs: one 2-unit window_frame)
//   'D'  sliding door (pairs: two leaves)   'L'  locked bridge door (pairs)
//   '.'  deck plate (worn plates mixed in)  ','  worn plate
//   'h'  hazard-striped plate (stripe turned toward the nearest door/wall)
//   'g'  glowing grate   'b'  bridge floor   'c'  frosted cryo floor
// Wall heights are derived from the floor around each wall cell: walls with a room to the south
// are full height (3), walls with a room to the north are low cutaway walls (0.75), side walls
// are full height. DIVIDERS are wall rows shared by two stacked rooms: they stand full height
// while the player is south of them and sink to the cutaway height once the player is north, taking
// every full-height wall inside their rect (the side walls of the room below) down with them.

export const MAP = [
  '                                                ', // 0
  '                                  #sWWWWWWWWWWs#', // 1
  '                                  #bbbbbbbbbbbb#', // 2
  '                                  #bbbbbbbbbbbb#', // 3
  '                                  #bbbbbbbbbbbb#', // 4
  '                                  #bbbbbbbbbbbb#', // 5
  '                                  #bbbbbbbbbbbb#', // 6
  '                                  #bbbbbbbbbbbb#', // 7
  '                                  #bbbbbbbbbbbb#', // 8
  '                                  #bbbbbbbbbbbb#', // 9
  '                                  #bbbbbhhbbbbb#', // 10
  '#vWWsWW#WWvWWsWW#WWvWWsWW#WWvWWsp####s#pLLp#sv##', // 11
  '#...................................#...hh....# ', // 12
  '#.............................................# ', // 13
  '#.............................................# ', // 14
  '#.............................................# ', // 15
  '#.....hh............hh..............#.........# ', // 16
  '##s#v#DD#s#vs##pp#v#DD#s##s###v#pp############# ', // 17
  '#ccccchhcccccc#.....hh............#             ', // 18
  '#ccccc..cccccc#...................#             ', // 19
  '#ccccc..cccccc#...................#             ', // 20
  '#ccccc..cccccc#.......ggggggg..g..#             ', // 21
  '#ccccc..cccccc#.......ggggggg.....#             ', // 22
  '#ccccc..cccccc#.......ggggggg.....#             ', // 23
  '#ccccc..cccccc#.......ggggggg.....#             ', // 24
  '#ccccc..cccccc#.......ggggggg.....#             ', // 25
  '#ccccc..cccccc#..g....ggggggg.....#             ', // 26
  '#ccccc..cccccc#...............g...#             ', // 27
  '#ccccc..cccccc#...................#             ', // 28
  '###################################             ', // 29
];

export const MAP_W = 48;
export const MAP_H = 30;

export const WALL_CHARS = { '#': 'wall_panel', v: 'wall_panel_vent', s: 'wall_panel_screen', p: 'wall_pipes', W: 'window_frame' };
export const FLOOR_CHARS = { '.': 'floor_plate', ',': 'floor_plate_worn', h: 'floor_hazard', g: 'floor_grate', b: 'floor_bridge', c: 'floor_cryo' };
export const DOOR_CHARS = { D: 'door', L: 'door_locked' };

export const WALL_H = 3;
export const LOW_H = 0.75;

/** The bridge's north wall is two storeys of glass. */
export const GRAND = { row: 1, c0: 34, c1: 47, height: 6 };

/** Wall rows shared by two stacked rooms (see header). rect: [c0, r0, c1, r1] cells, inclusive. */
export const DIVIDERS = [
  { id: 'south', row: 17, rect: [0, 17, 34, 29] },
  { id: 'bridge', row: 11, rect: [34, 11, 47, 17] },
];

// Area moods: fog / background, hemisphere fill, key ("planet") light, sprite fill light, post FX.
const MOOD = {
  cryo: {
    fog: '#08121d', density: 0.034, sky: '#3f6f9c', ground: '#0a0f18', hemi: 0.34,
    key: 0.45, keyColor: '#bfe6ff', fill: 0.28, exposure: 1.06, bloom: 0.95, saturation: 1.04,
  },
  corridor: {
    fog: '#070b17', density: 0.03, sky: '#3a4f80', ground: '#0b0b12', hemi: 0.55,
    key: 2.6, fill: 0.36, exposure: 1.04, bloom: 0.9, saturation: 1.08,
  },
  engineering: {
    fog: '#140809', density: 0.034, sky: '#5a3348', ground: '#0e0708', hemi: 0.38,
    key: 0.5, keyColor: '#ffb98a', fill: 0.34, exposure: 1.05, bloom: 1.0, saturation: 1.12,
  },
  antechamber: {
    fog: '#090a14', density: 0.032, sky: '#3c4a72', ground: '#0b0b12', hemi: 0.62,
    key: 1.0, fill: 0.42, exposure: 1.04, bloom: 0.9, saturation: 1.08,
  },
  bridge: {
    fog: '#05081a', density: 0.026, sky: '#3a5590', ground: '#07080f', hemi: 0.5,
    key: 3.0, fill: 0.34, exposure: 1.06, bloom: 0.95, saturation: 1.1,
  },
};

/**
 * Areas in world units: rect [x0, z0, x1, z1]. cam: [z0, z1] clamp for the camera target's z (x is
 * clamped from the rect and the visible width). zone: encounter table id (battle/data.js
 * ENCOUNTER_TABLES). ceiling: the room is lit by the planet only through its windows (ceilingY: the
 * height of that shadow-only ceiling). focus: a point the tilt-shift band leans toward.
 */
export const AREAS = [
  { id: 'cryo', name: 'Cryo Deck', subtitle: 'Deck 2 · Stasis Ward', rect: [1, 18, 14, 29], cam: [20.4, 25.8], zone: null, mood: MOOD.cryo },
  { id: 'corridor', name: 'Spine Corridor', subtitle: 'Deck 2 · Hull Ring', rect: [1, 12, 36.5, 17], cam: [14.25, 14.75], zone: 'corridor', ceiling: true, mood: MOOD.corridor },
  { id: 'engineering', name: 'Engineering Bay', subtitle: 'Deck 2 · Reactor Hall', rect: [15, 18, 34, 29], cam: [20.4, 25.8], zone: 'engineering', mood: MOOD.engineering },
  { id: 'antechamber', name: 'Bridge Antechamber', subtitle: 'Deck 1 · Command Access', rect: [36.5, 12, 46, 17], cam: [13.6, 14.0], zone: null, ceiling: true, mood: MOOD.antechamber },
  { id: 'bridge', name: 'Observation Bridge', subtitle: 'Deck 1 · Command', rect: [35, 2, 47, 11], cam: [4.4, 6.9], zone: null, ceiling: true, ceilingY: 6.05,
    // tilt-shift focus leans toward the Sentinel while it stands before the window
    focus: { x: 38.7, y: 2.4, z: 4.9, w: 0.4, band: 0.17, whileBoss: true }, mood: MOOD.bridge },
];

export const SPAWN = { x: 6.55, z: 20.3, facing: 'down' };

/** Named camera / player positions for screenshots and debugging. */
export const VIEWPOINTS = {
  cryo: { x: 6.6, z: 22.6, facing: 'down' },
  corridor: { x: 17.0, z: 14.6, facing: 'right' },
  engineering: { x: 22.6, z: 21.6, facing: 'down' },
  antechamber: { x: 41.0, z: 14.4, facing: 'up' },
  bridge: { x: 41.6, z: 8.9, facing: 'up' },
};

// ---------------------------------------------------------------- props
// Positions are world units (x, z = footprint centre). Wall-mounted pieces name the divider they
// hang on (on: 'south' | 'bridge') so they sink with it.

const pods = [1.5, 2.5, 3.5, 4.5, 9.5, 10.5, 11.5].map((x) => ({ t: 'pod', x, z: 18.36 }));
const beds = [21.6, 25.6].flatMap((z) => [2.0, 3.25, 4.5, 9.5, 10.75, 12.0].map((x) => ({ t: 'bed', x, z })));
const benches = [9, 18, 27].map((x) => ({ t: 'bench', x, z: 13.15, w: 1.9 }));
const corridorLamps = [4.5, 13.5, 22.5, 31.5].map((x) => ({ t: 'lamp', x, y: 2.5, z: 12.02 }));

export const PROPS = [
  // ---- Cryo Deck
  ...pods,
  ...beds,
  { t: 'med', id: 'med_cryo', x: 12.6, z: 18.34 },
  { t: 'console', id: 'term_cryo', x: 13.4, z: 23.2 },
  { t: 'crate', x: 13.3, z: 28.25 },
  { t: 'crate', x: 13.3, z: 28.25, y: 1, s: 0.72, rot: 0.25 },
  { t: 'crate', x: 12.3, z: 28.35, s: 0.8, rot: -0.12 },
  { t: 'lamp', x: 3.0, y: 2.5, z: 18.02, on: 'south', cool: true },
  { t: 'lamp', x: 11.0, y: 2.5, z: 18.02, on: 'south', cool: true },
  { t: 'sign', name: 'sign_spine', x: 7.0, z: 18.0, on: 'south' },
  { t: 'decal', name: 'decal_grime', x: 2.6, z: 23.6, rot: 1 },
  { t: 'decal', name: 'decal_grime', x: 11.2, z: 27.6, rot: 2 },
  { t: 'decal', name: 'decal_oil', x: 8.4, z: 26.9, rot: 0 },
  { t: 'decal', name: 'decal_grime', x: 6.4, z: 28.4, rot: 3 },

  // ---- Spine Corridor
  ...benches,
  ...corridorLamps,
  { t: 'console', id: 'term_nav', x: 10.5, z: 12.36 },
  { t: 'console', id: 'term_window', x: 28.5, z: 12.36 },
  { t: 'crate', x: 35.3, z: 16.3 },
  { t: 'crate', x: 34.35, z: 16.38, s: 0.78, rot: 0.2 },
  { t: 'crate', x: 35.3, z: 16.3, y: 1, s: 0.7, rot: -0.3 },
  { t: 'sign', name: 'sign_cryo', x: 7.5, z: 12.0 },
  { t: 'sign', name: 'sign_engineering', x: 21.0, z: 12.0 },
  { t: 'sign', name: 'sign_bridge', x: 35.0, z: 12.0 },
  { t: 'decal', name: 'decal_arrow', x: 12.5, z: 14.5, rot: 1 },
  { t: 'decal', name: 'decal_arrow', x: 27.5, z: 14.5, rot: 1 },
  { t: 'decal', name: 'decal_arrow', x: 21.0, z: 15.3, rot: 2 },
  { t: 'decal', name: 'decal_arrow', x: 7.0, z: 15.3, rot: 2 },
  { t: 'decal', name: 'decal_oil', x: 15.4, z: 15.6, rot: 1 },
  { t: 'decal', name: 'decal_grime', x: 4.3, z: 15.8, rot: 0 },
  { t: 'decal', name: 'decal_grime', x: 30.6, z: 15.9, rot: 2 },
  { t: 'decal', name: 'decal_scorch', x: 33.4, z: 13.4, rot: 1 },

  // ---- Engineering Bay
  { t: 'reactor', x: 25.5, z: 24.0 },
  { t: 'alarm', x: 25.0, y: 2.72, z: 18.03, on: 'south' },
  { t: 'conduit', x: 28.0, y: 2.05, z: 18.0, on: 'south' },
  { t: 'lamp', x: 17.5, y: 2.5, z: 18.02, on: 'south' },
  { t: 'lamp', x: 23.5, y: 2.5, z: 18.02, on: 'south' },
  { t: 'sign', name: 'sign_spine', x: 21.0, z: 18.0, on: 'south' },
  { t: 'locker', x: 29.5, z: 18.32 },
  { t: 'locker', x: 30.5, z: 18.32 },
  { t: 'locker', x: 31.5, z: 18.32 },
  { t: 'vent', x: 17.5, z: 26.5 },
  { t: 'vent', x: 31.5, z: 21.5 },
  { t: 'vent', x: 30.5, z: 27.5 },
  { t: 'console', id: 'term_reactor', x: 19.6, z: 24.2 },
  { t: 'crate', x: 15.6, z: 28.25 },
  { t: 'crate', x: 15.62, z: 28.25, y: 1, s: 0.8, rot: 0.15 },
  { t: 'crate', x: 16.65, z: 28.35, s: 0.85, rot: -0.1 },
  { t: 'crate', x: 33.25, z: 23.0 },
  { t: 'crate', x: 33.25, z: 24.05 },
  { t: 'crate', x: 33.25, z: 23.5, y: 1, s: 0.8, rot: 0.2 },
  { t: 'crate', x: 22.2, z: 28.35, s: 0.9, rot: 0.1 },
  { t: 'pipe', axis: 'z', x: 15.16, y: 2.42, z0: 18, z1: 29, r: 0.13, on: 'south' },
  { t: 'pipe', axis: 'z', x: 15.16, y: 2.05, z0: 18, z1: 29, r: 0.09, on: 'south' },
  { t: 'pipe', axis: 'z', x: 33.84, y: 2.42, z0: 18, z1: 29, r: 0.13, on: 'south' },
  { t: 'pipe', axis: 'z', x: 33.84, y: 2.05, z0: 18, z1: 29, r: 0.09, on: 'south' },
  { t: 'pipe', axis: 'y', x: 15.25, z: 18.25, y0: 0, y1: 3, r: 0.16, on: 'south' },
  { t: 'pipe', axis: 'y', x: 33.75, z: 18.25, y0: 0, y1: 3, r: 0.16, on: 'south' },
  { t: 'decal', name: 'decal_scorch', x: 28.0, z: 18.75, rot: 0 },
  { t: 'decal', name: 'decal_oil', x: 19.8, z: 21.2, rot: 3 },
  { t: 'decal', name: 'decal_oil', x: 29.6, z: 25.6, rot: 1 },
  { t: 'decal', name: 'decal_grime', x: 17.0, z: 23.0, rot: 2 },
  { t: 'decal', name: 'decal_scorch', x: 23.8, z: 27.6, rot: 3 },
  { t: 'decal', name: 'decal_grime', x: 31.2, z: 24.6, rot: 0 },

  { t: 'guide', x0: 1.5, x1: 35.5, z: 15.9, step: 1, color: '#45d4ff' },

  // ---- Bridge antechamber
  { t: 'med', id: 'med_ante', x: 44.5, z: 12.34 },
  { t: 'console', id: 'term_security', x: 37.6, z: 12.36 },
  { t: 'lamp', x: 39.4, y: 2.5, z: 12.02, on: 'bridge' },
  { t: 'lamp', x: 42.6, y: 2.5, z: 12.02, on: 'bridge' },
  { t: 'sign', name: 'sign_bridge', x: 41.0, z: 12.0, on: 'bridge' },
  { t: 'crate', x: 45.4, z: 16.3, s: 0.9 },
  { t: 'decal', name: 'decal_grime', x: 38.6, z: 15.8, rot: 1 },
  { t: 'decal', name: 'decal_arrow', x: 41.0, z: 14.2, rot: 0 },
  { t: 'guide', x0: 37.5, x1: 45.5, z: 15.9, step: 1, color: '#ffb54a' },

  // ---- Observation Bridge
  { t: 'holoTable', x: 43.8, z: 7.4 },
  { t: 'chair', x: 41.6, z: 5.3 },
  { t: 'console', id: 'term_helm', x: 35.6, z: 2.36 },
  { t: 'console', id: 'term_captain', x: 46.4, z: 2.36 },
  { t: 'console', id: 'term_aft', x: 36.1, z: 9.0 },
  { t: 'console', x: 37.15, z: 9.0 },
  { t: 'bench', x: 36.6, z: 10.15, w: 2 },
  { t: 'decal', name: 'decal_grime', x: 38.6, z: 7.9, rot: 1 },
  { t: 'decal', name: 'decal_grime', x: 36.4, z: 9.6, rot: 2 },
];

/**
 * Point lights (virtual: the world drives a small pool of real lights from the nearest ones).
 * mode: 'flicker' | 'pulse' | 'strobe' | 'reactor'; tag: lights switched by game state.
 */
export const LIGHTS = [
  // cryo
  { x: 3.0, y: 2.15, z: 18.9, color: '#c6ecff', intensity: 13, distance: 8.5, on: 'south' },
  { x: 11.0, y: 2.15, z: 18.9, color: '#c6ecff', intensity: 13, distance: 8.5, on: 'south' },
  { x: 3.3, y: 1.2, z: 23.6, color: '#4fd2ff', intensity: 10, distance: 6 },
  { x: 10.8, y: 1.2, z: 23.6, color: '#4fd2ff', intensity: 10, distance: 6 },
  { x: 12.6, y: 1.8, z: 19.1, color: '#5dff9c', intensity: 6, distance: 4.5, mode: 'pulse', amount: 0.3, speed: 2.4 },
  { x: 7.0, y: 2.4, z: 27.0, color: '#8fb6ff', intensity: 6, distance: 7, decorative: true },
  // corridor
  { x: 4.5, y: 1.95, z: 13.1, color: '#ffa64a', intensity: 34, distance: 8.5 },
  { x: 13.5, y: 1.95, z: 13.1, color: '#ffa64a', intensity: 34, distance: 8.5 },
  { x: 22.5, y: 1.95, z: 13.1, color: '#ffa64a', intensity: 34, distance: 8.5, mode: 'flicker', amount: 0.6, speed: 7 },
  { x: 31.5, y: 1.95, z: 13.1, color: '#ffa64a', intensity: 34, distance: 8.5 },
  { x: 10.5, y: 1.3, z: 13.1, color: '#45d4ff', intensity: 4, distance: 3.2, decorative: true },
  { x: 28.5, y: 1.3, z: 13.1, color: '#45d4ff', intensity: 4, distance: 3.2, decorative: true },
  // engineering
  { x: 25.5, y: 1.7, z: 24.0, color: '#ff7a2f', intensity: 34, distance: 11, decay: 1.4, mode: 'reactor' },
  { x: 25.5, y: 3.9, z: 24.4, color: '#ff4fc0', intensity: 12, distance: 7, mode: 'pulse', amount: 0.5, speed: 2.2, decorative: true },
  { x: 17.5, y: 2.15, z: 18.8, color: '#ffb04a', intensity: 16, distance: 8, on: 'south' },
  { x: 23.5, y: 2.15, z: 18.8, color: '#ffb04a', intensity: 12, distance: 7, on: 'south' },
  { x: 28.1, y: 1.5, z: 18.6, color: '#ffcf7a', intensity: 9, distance: 4.5, on: 'south', mode: 'flicker', amount: 1, speed: 13 },
  // vent grates glow from below and light their steam
  { x: 17.5, y: 0.45, z: 26.5, color: '#ff8a3a', intensity: 7, distance: 4, mode: 'pulse', amount: 0.35, speed: 1.7 },
  { x: 31.5, y: 0.45, z: 21.5, color: '#ff8a3a', intensity: 7, distance: 4, mode: 'pulse', amount: 0.35, speed: 1.9 },
  { x: 30.5, y: 0.45, z: 27.5, color: '#ff8a3a', intensity: 7, distance: 4, mode: 'pulse', amount: 0.35, speed: 1.5 },
  // antechamber
  { x: 39.4, y: 2.15, z: 12.8, color: '#ffa64a', intensity: 15, distance: 7, on: 'bridge' },
  { x: 42.6, y: 2.15, z: 12.8, color: '#ffa64a', intensity: 15, distance: 7, on: 'bridge' },
  { x: 44.5, y: 1.8, z: 13.1, color: '#5dff9c', intensity: 6, distance: 4.5, mode: 'pulse', amount: 0.3, speed: 2.4 },
  { x: 41.0, y: 2.6, z: 12.45, color: '#ff3b4e', intensity: 5, distance: 3.2, on: 'bridge', tag: 'doorLight' },
  // bridge
  { x: 43.8, y: 1.9, z: 7.4, color: '#45d4ff', intensity: 15, distance: 7, mode: 'pulse', amount: 0.18, speed: 1.6 },
  { x: 45.2, y: 0.8, z: 9.5, color: '#6fe9ff', intensity: 6, distance: 4 },
  { x: 39.7, y: 1.3, z: 7.2, color: '#ff3b4e', intensity: 9, distance: 5.5, mode: 'pulse', amount: 0.4, speed: 1.3, tag: 'sentinel' },
  { x: 41.0, y: 2.6, z: 3.0, color: '#8fb8ff', intensity: 10, distance: 9 },
  { x: 35.6, y: 1.3, z: 3.0, color: '#45d4ff', intensity: 4, distance: 3.2, decorative: true },
  { x: 36.6, y: 1.3, z: 9.7, color: '#45d4ff', intensity: 5, distance: 3.5, decorative: true },
  { x: 46.4, y: 1.3, z: 3.0, color: '#45d4ff', intensity: 4, distance: 3.2, decorative: true },
];

export const NPCS = [
  { id: 'bolt', kind: 'bolt', x: 8.35, z: 20.75, facing: 'down', name: 'BOLT', portrait: 'bolt' },
  { id: 'halcyon', kind: 'holo', x: 45.2, z: 9.5, facing: 'down', name: 'HALCYON', portrait: 'holo' },
];

/** The boss before the bridge window (faces right, toward the bridge door side). */
export const BOSS = { x: 38.7, z: 4.9, encounter: 'boss_sentinel', triggerRadius: 3.4 };

/** One-time supply crates: flag `crate_<id>` is set when opened. */
export const CRATES = [
  { id: 'cryo_1', x: 1.55, z: 28.2, item: 'medigel', n: 1 },
  { id: 'cor_1', x: 1.55, z: 16.3, item: 'ether', n: 1 },
  { id: 'eng_1', x: 16.05, z: 20.6, item: 'medigel', n: 2 },
  { id: 'eng_2', x: 32.9, z: 27.95, item: 'keycard', n: 1 },
  { id: 'eng_3', x: 18.6, z: 28.0, item: 'ether', n: 1 },
  { id: 'eng_4', x: 33.0, z: 19.45, item: 'revive', n: 1 },
];

/** Dust / frost / holo emitters per area (steam, sparks and embers belong to their props). */
export const AMBIENT = [
  ...[[3.25, 21.6], [10.75, 21.6], [3.25, 25.6], [10.75, 25.6]].map(([x, z]) => (
    { preset: 'steam', x, y: 0.66, z, area: [2.2, 0.05, 1.6], rate: 2.2, color: '#bfe6ff', speed: 0.35, size: 1.4 })),
  { preset: 'dust', x: 7.5, y: 1.4, z: 23.5, area: [12, 2.6, 10], rate: 3.5, color: '#d8efff' },
  { preset: 'frost', x: 7.5, y: 0.9, z: 23.5, area: [12, 1.6, 10], rate: 8 },
  { preset: 'dust', x: 18, y: 1.5, z: 13.6, area: [34, 2.6, 2.8], rate: 6, color: '#cfe6ff' },
  { preset: 'dust', x: 18, y: 1.4, z: 15.8, area: [34, 2.4, 2.2], rate: 3, color: '#ffd9a8' },
  { preset: 'dust', x: 24.5, y: 1.6, z: 23.5, area: [18, 3, 10], rate: 5, color: '#ffc59a' },
  { preset: 'dust', x: 41.5, y: 1.4, z: 14.5, area: [9, 2.4, 4.5], rate: 2, color: '#ffd9a8' },
  { preset: 'dust', x: 41, y: 1.6, z: 5.0, area: [11, 3, 6], rate: 2.2, color: '#9fb8e8' },
];
