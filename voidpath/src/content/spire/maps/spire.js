// spire (PURE MapDef, TECH_PLAN 3.1 and 12.5): the Security Spire, Deck 4 to Deck 6 of the Halcyon,
// on red alert. 1 tile = 1 world unit; cell (c, r) spans x c..c+1, z r..r+1 (+Z = south). The tower is
// climbed north: each band of the grid is a deck, joined by lifts (same-map `lift` interactables).
//
//   Deck 4 (south)    the Spire Dock (Moth berth) -> Checkpoint (barricades, east) -> Barracks (west,
//                     the first laser grid) -> Armory and the Grid Junction (the paired grids and
//                     Kade's override) -> the Holding Cells and the guard post (quartermaster, lift)
//   Deck 5 (middle)   the Officers' Deck (west; quarters off it, the gallery windows on Tethys) ->
//                     the Training Hall and the Firing Range (east, the recording, the lift up)
//   Deck 6 (north)    the Command Lobby (Med-Station), the Command Deck (Voss at the great window,
//                     the holo table), the Core Antechamber (the neural interface, behind a shutter)
//
// Binding (12.5): spawns dock, barracks, cells, quarters, training, command, antechamber, from_vault;
// the neural-interface exit to vault:entry (story:core_open); WARDEN's propaganda screens are
// `screen` props (group 'spire') that `spire.screen` inspects. Map NPC ids never use member ids.
// All dialogue lives in story.js; this file names script ids only.

// ---------------------------------------------------------------- moods (12.1: red and black, stark
// white floodlights, gold sigil screens; hard, thin fog)

const RED = {
  fog: '#16070a', density: 0.018, sky: '#a4505a', ground: '#1c0a0c', hemi: 0.9,
  key: 1.25, keyColor: '#f4f2ff', fill: 0.55, exposure: 1.2, bloom: 1.0, saturation: 1.04,
};
const MOOD = {
  dock: { ...RED, fog: '#100a10', sky: '#8a5a70', hemi: 0.8, keyColor: '#e8f0ff' },
  checkpoint: RED,
  barracks: { ...RED, fog: '#18080a', hemi: 0.74 },
  armory: { ...RED, fog: '#160909', sky: '#a45a4a', keyColor: '#fff2e0' },
  cells: { ...RED, fog: '#120a10', sky: '#c0a0b0', ground: '#1a1014', hemi: 0.84, keyColor: '#ffffff', exposure: 1.1 },
  officers: { ...RED, fog: '#120808', sky: '#a86048', ground: '#1e0c08', hemi: 0.72, keyColor: '#ffe6c8', saturation: 1.08 },
  quarters: { ...RED, fog: '#0e0a10', sky: '#8a7a96', ground: '#1a1014', hemi: 1.05, key: 1.25, keyColor: '#ffd9b0', exposure: 1.45 },
  training: { ...RED, fog: '#140a0c', sky: '#c08a90', hemi: 0.86, key: 1.3, keyColor: '#ffffff', exposure: 1.1 },
  command: { ...RED, fog: '#0a0812', density: 0.016, sky: '#7a6aa0', ground: '#100a10', hemi: 0.74, key: 1.5, keyColor: '#dfe8ff' },
  lobby: RED,
  core: { ...RED, fog: '#06101a', sky: '#3a8ab0', ground: '#08101a', hemi: 0.72, key: 0.9, keyColor: '#bfe8ff', saturation: 1.1, exposure: 1.05 },
};

// ---------------------------------------------------------------- virtual lights (the rig drives its pool
// from the nearest): white floodlight pools, red alert lamps, gold sigil screens, cyan consoles

const flood = (x, z, intensity = 22, distance = 8.5) => ({ x, y: 2.6, z, color: '#f4f0ff', intensity, distance });
const alert = (x, z, y = 2.5) => ({ x, y, z, color: '#ff2a3c', intensity: 13, distance: 6.5, mode: 'pulse', amount: 0.45, speed: 2.2 });
const sigil = (x, z, y = 2.1) => ({ x, y, z, color: '#ffc04a', intensity: 9, distance: 5.5, tag: 'sigil' });
const cyan = (x, z, y = 1.3) => ({ x, y, z, color: '#45d4ff', intensity: 7, distance: 4.5 });

// ---------------------------------------------------------------- dividers (each deck's north wall row
// stands while the leader is south of it and sinks once the leader is north; its rect is the deck)

const DIVIDERS = [
  { id: 'command', row: 13, rect: [0, 13, 71, 23] },
  { id: 'quarters', row: 24, rect: [0, 24, 71, 28] },
  { id: 'officers', row: 29, rect: [0, 29, 71, 33] },
  { id: 'deck4', row: 34, rect: [0, 34, 71, 40] },
  { id: 'block', row: 41, rect: [0, 41, 71, 46] },
  { id: 'barracks', row: 47, rect: [13, 47, 71, 53] },
];
// tall and wall-mounted pieces sink with their deck's divider, so a deck south of the leader never
// stands in front of the one the leader is on
const TALL = new Set(['screen', 'sp.flood', 'sp.strobe', 'sp.sign', 'sp.pylon', 'sp.banner', 'sp.lockers', 'sp.bunk', 'sp.shelves',
  'sp.racks', 'sp.climb', 'sp.targets', 'sp.lift', 'sp.dummy', 'pro.moth', 'med', 'switch.panel', 'gate.laser', 'guide']);
const dividerAt = (x, z) => DIVIDERS.find((d) => x >= d.rect[0] && x < d.rect[2] + 1 && z >= d.rect[1] && z < d.rect[3] + 1);
const onOf = (x, z) => dividerAt(x, z)?.id;
const sink = (p) => {
  const on = TALL.has(p.t) && onOf(p.x ?? p.x0 ?? p.from?.[0], p.z ?? p.from?.[1]);
  return on ? { ...p, on } : p;
};

// ---------------------------------------------------------------- props (positions are world units)

// WARDEN's propaganda screens: the sigil swap targets group 'spire'; each has an inspect point.
const SCREENS = [
  ['scr_dock', 7.0, 42], ['scr_cp_a', 26.0, 48], ['scr_cp_b', 44.0, 48], ['scr_cp_c', 62.0, 48],
  ['scr_bk_a', 29.0, 42], ['scr_bk_b', 47.0, 42], ['scr_bk_c', 61.0, 42],
  ['scr_ar', 21.5, 35], ['scr_cells', 63.5, 35],
  ['scr_off_a', 20.5, 30], ['scr_off_b', 33.5, 30],
  ['scr_tr_a', 12.0, 14], ['scr_tr_b', 40.5, 14], ['scr_tr_c', 60.0, 14],
  ['scr_lobby', 62.5, 2], ['scr_cmd_a', 22.5, 2], ['scr_cmd_b', 49.5, 2],
];
// (z is the wall face: the screen hangs 0.03 in front of it)
const screens = SCREENS.map(([id, x, z]) => ({ t: 'screen', id, x, z: z + 0.03, y: 1.5, w: 1.5, h: 0.84, tex: 'sp_propaganda', group: 'spire' }));
const screenSpots = SCREENS.map(([id, x, z]) => ({
  id: `look_${id}`, kind: 'inspect', x, z: z + 0.45, box: [x - 0.75, z, x + 0.75, z + 0.35], label: 'Watch', icon: 'inspect', talk: 'spire.screen',
}));

// barricade dressing on the low-wall cells of the Checkpoint (B) and the barracks partitions (P)
const BARRICADES = [[21, 48, 51], [30, 50, 53], [39, 48, 51], [48, 50, 53], [57, 48, 51]];

const props = [
  ...screens,

  // ---- the Spire Dock: the Moth on its pad, a floodlight mast, the express lift (after the climb)
  { t: 'pro.moth', x: 6.4, z: 46.0, id: 'moth' },
  { t: 'sp.flood', x: 1.6, z: 42.6, h: 3.4, aim: [4.0, 50.4], k: 0.18 },
  { t: 'sp.flood', x: 12.4, z: 42.6, h: 3.4, aim: [9.6, 50.6], k: 0.18 },
  { t: 'sp.strobe', x: 12.6, y: 2.4, z: 49.0, side: 'west' },
  { t: 'sp.crates', x: 2.2, z: 51.8, n: 3 },
  { t: 'sp.crates', x: 11.6, z: 52.6, n: 2 },
  { t: 'sp.sign', x: 7.0, z: 42.03, y: 2.62, frame: 0 },
  { t: 'sp.lift', x: 3.0, z: 52.0, id: 'lift_dock', when: 'story:core_open' },
  { t: 'sp.hazard', x0: 1, x1: 13, z: 53.7 },

  // ---- the Checkpoint: barricades, turret emplacements, the sigil pylon (the focal piece)
  ...BARRICADES.map(([c, r0, r1]) => ({ t: 'sp.barricade', x: c + 0.5, z0: r0, z1: r1 + 1 })),
  { t: 'sp.pylon', x: 34.5, z: 49.4, id: 'pylon' },
  { t: 'sp.flood', x: 17.5, z: 48.3, aim: [18, 51] },
  { t: 'sp.flood', x: 25.5, z: 53.6, aim: [26, 50.5], south: true },
  { t: 'sp.flood', x: 43.5, z: 48.3, aim: [44, 51] },
  { t: 'sp.flood', x: 52.5, z: 53.6, aim: [53, 50.5], south: true },
  { t: 'sp.flood', x: 64.5, z: 48.3, aim: [64, 51] },
  { t: 'sp.turret', x: 39.5, z: 48.5, rot: Math.PI },
  { t: 'sp.turret', x: 57.5, z: 48.5, rot: Math.PI },
  { t: 'sp.strobe', x: 20.0, y: 2.5, z: 48.02 },
  { t: 'sp.strobe', x: 38.0, y: 2.5, z: 48.02 },
  { t: 'sp.strobe', x: 56.0, y: 2.5, z: 48.02 },
  { t: 'sp.sign', x: 14.4, z: 48.03, y: 2.62, frame: 1 },
  { t: 'sp.crates', x: 68.8, z: 52.8, n: 3 },
  { t: 'sp.crates', x: 28.2, z: 52.9, n: 2 },
  { t: 'sp.stripe', x0: 14, x1: 71, z: 51.0 },

  // ---- the Barracks: bunks along the north wall, lockers, the first grid and its terminal
  ...[24.5, 27.5, 35.5, 38.5, 41.5, 50.5, 55.5, 58.5].map((x) => ({ t: 'sp.bunk', x, z: 42.55 })),
  { t: 'sp.lockers', x: 31.5, z: 42.3, n: 3 },
  { t: 'sp.lockers', x: 44.5, z: 42.3, n: 3 },
  { t: 'sp.lockers', x: 64.5, z: 42.3, n: 4 },
  { t: 'sp.mess', x: 47.0, z: 45.6, w: 3.2 },
  { t: 'sp.flood', x: 26.5, z: 42.3, h: 2.6, wall: true },
  { t: 'sp.flood', x: 40.0, z: 42.3, h: 2.6, wall: true },
  { t: 'sp.flood', x: 56.5, z: 42.3, h: 2.6, wall: true },
  { t: 'sp.strobe', x: 34.5, y: 2.5, z: 42.02 },
  { t: 'sp.strobe', x: 53.5, y: 2.5, z: 42.02 },
  { t: 'sp.sign', x: 66.5, z: 42.03, y: 2.62, frame: 2 },
  { t: 'guide', from: [23.5, 43.0], to: [21.6, 44.5], color: '#ff3b4e', link: 'grid_t1' },
  { t: 'sp.hazard', x0: 20, x1: 23, z: 46.7 },

  // ---- the Armory, the Grid Junction, the Holding Cells and the guard post
  { t: 'sp.racks', x: 8.0, z: 35.3, w: 10 },
  { t: 'sp.flood', x: 4.5, z: 35.3, h: 2.6, wall: true },
  { t: 'sp.flood', x: 12.5, z: 35.3, h: 2.6, wall: true },
  { t: 'sp.flood', x: 24.5, z: 35.3, h: 2.6, wall: true },
  { t: 'sp.crates', x: 14.6, z: 39.8, n: 3 },
  { t: 'sp.crates', x: 26.6, z: 39.9, n: 2 },
  { t: 'sp.strobe', x: 17.5, y: 2.5, z: 35.02 },
  { t: 'sp.sign', x: 9.0, z: 35.03, y: 2.62, frame: 3 },
  { t: 'guide', from: [30.5, 36.0], to: [32.4, 37.5], color: '#ff3b4e', link: 'grid_t2' },
  { t: 'guide', from: [34.5, 36.0], to: [37.4, 37.5], color: '#ff3b4e', link: 'grid_t3' },
  { t: 'sp.flood', x: 35.0, z: 35.3, h: 2.6, wall: true },
  ...[41, 45, 49, 53, 57].map((x) => ({ t: 'sp.cot', x, z: 35.5 })),
  { t: 'sp.flood', x: 45.0, z: 38.0, h: 2.8 },
  { t: 'sp.flood', x: 53.0, z: 38.0, h: 2.8 },
  { t: 'sp.sign', x: 49.0, z: 35.03, y: 2.62, frame: 4 },
  { t: 'sp.shelves', x: 64.5, z: 35.3, w: 3 },
  { t: 'sp.counter', x: 64.5, z: 36.6, w: 3 },
  { t: 'sp.flood', x: 66.5, z: 38.0, h: 2.8 },
  { t: 'sp.lift', x: 69.0, z: 39.0, id: 'lift_block' },

  // ---- the Officers' Deck: the carpet, quarters doors, warm lamps down the east wall; the Mk-III on guard
  { t: 'sp.flood', x: 8.5, z: 30.3, h: 2.6, wall: true, warm: true },
  { t: 'sp.flood', x: 26.5, z: 30.3, h: 2.6, wall: true, warm: true },
  { t: 'sp.flood', x: 46.0, z: 33.7, south: true, warm: true },
  { t: 'sp.flood', x: 62.0, z: 33.7, south: true, warm: true },
  { t: 'sp.banner', x: 14.5, z: 30.03, y: 2.9 },
  { t: 'sp.banner', x: 37.0, z: 30.03, y: 2.9 },
  { t: 'sp.banner', x: 59.0, z: 30.03, y: 2.9 },
  { t: 'sp.flood', x: 44.0, z: 30.3, h: 2.5, wall: true, warm: true },
  { t: 'sp.flood', x: 54.0, z: 30.3, h: 2.5, wall: true, warm: true },
  { t: 'sp.flood', x: 64.0, z: 30.3, h: 2.5, wall: true, warm: true },
  { t: 'sp.planter', x: 42.0, z: 33.4 },
  { t: 'sp.planter', x: 57.0, z: 33.4 },
  { t: 'sp.sign', x: 4.0, z: 30.03, y: 2.62, frame: 5 },
  { t: 'sp.lift', x: 69.0, z: 32.0, id: 'lift_deck5' },
  // Kade's quarters, Grey's quarters, the lounge
  { t: 'sp.bed', x: 8.4, z: 25.7, made: true },
  { t: 'sp.desk', x: 11.5, z: 25.35 },
  { t: 'sp.bed', x: 17.4, z: 25.7 },
  { t: 'sp.desk', x: 20.0, z: 25.35 },
  { t: 'sp.couch', x: 27.5, z: 25.5 },
  { t: 'sp.couch', x: 31.5, z: 25.5 },
  { t: 'sp.planter', x: 34.6, z: 27.8 },
  { t: 'sp.flood', x: 10.5, z: 25.3, h: 2.5, wall: true, warm: true },
  { t: 'sp.flood', x: 19.0, z: 25.3, h: 2.5, wall: true, warm: true },
  { t: 'sp.flood', x: 29.5, z: 25.3, h: 2.5, wall: true, warm: true },

  // ---- the Training Hall and the Firing Range
  { t: 'sp.ring', x: 10.0, z: 19.0, w: 5, d: 4 },
  { t: 'sp.dummy', x: 25.5, z: 20.6 },
  { t: 'sp.dummy', x: 28.0, z: 21.6 },
  { t: 'sp.dummy', x: 30.5, z: 20.4 },
  { t: 'sp.climb', x: 44.0, z: 14.05, w: 5 },
  { t: 'sp.recorder', x: 24.5, z: 16.4, id: 'recorder' },
  { t: 'sp.targets', x0: 56, x1: 69, z: 14.6 },
  { t: 'sp.bench', x: 58.5, z: 22.6, w: 3 },
  { t: 'sp.flood', x: 6.0, z: 14.3, h: 2.8, wall: true },
  { t: 'sp.flood', x: 16.0, z: 23.6, south: true },
  { t: 'sp.flood', x: 27.0, z: 14.3, h: 2.8, wall: true },
  { t: 'sp.flood', x: 38.5, z: 23.6, south: true },
  { t: 'sp.flood', x: 48.0, z: 14.3, h: 2.8, wall: true },
  { t: 'sp.flood', x: 60.0, z: 23.6, south: true },
  { t: 'sp.strobe', x: 20.5, y: 2.6, z: 14.02 },
  { t: 'sp.strobe', x: 52.5, y: 2.6, z: 14.02 },
  { t: 'sp.sign', x: 33.0, z: 14.03, y: 2.62, frame: 6 },
  { t: 'sp.lift', x: 68.0, z: 15.0, id: 'lift_hall' },

  // ---- Deck 6: the lobby, the Command Deck, the Core Antechamber
  { t: 'sp.lift', x: 68.0, z: 3.0, id: 'lift_lobby' },
  { t: 'sp.lift', x: 68.0, z: 11.0, id: 'lift_express', when: 'defeated:spire_boss_voss' },
  { t: 'sp.flood', x: 58.5, z: 2.3, h: 2.8, wall: true },
  { t: 'sp.strobe', x: 64.5, y: 2.5, z: 2.02 },
  { t: 'sp.holotable', x: 35.5, z: 8.2, id: 'flare' },
  { t: 'sp.cmdchair', x: 37.6, z: 5.2 },
  ...[21.0, 24.5, 46.5, 50.0].map((x) => ({ t: 'sp.console', x, z: 2.36 })),
  { t: 'sp.flood', x: 26.5, z: 12.6, south: true, cool: true },
  { t: 'sp.flood', x: 44.5, z: 12.6, south: true, cool: true },
  { t: 'sp.halberd', x: 33.4, z: 7.7, when: 'story:core_open' },
  { t: 'sp.interface', x: 6.5, z: 3.6, id: 'interface' },
  { t: 'sp.coredoor', x: 3.5, z: 2.02 },
  { t: 'sp.flood', x: 13.0, z: 2.3, h: 2.8, wall: true, cool: true },
];

// ---------------------------------------------------------------- lights

const lights = [
  // the dock: two floodlight masts on the Moth, a red hazard strobe, the Starchart glow
  flood(6.5, 49.5, 15, 8), flood(7.0, 52.0, 14, 7), alert(12.4, 49.0), cyan(10.5, 44.6, 1.6),
  sigil(7.0, 42.6), { x: 3.0, y: 0.6, z: 52.0, color: '#ff8a3a', intensity: 6, distance: 3.5, when: 'story:core_open' },
  // the checkpoint: floods over the lanes, red lamps on the north wall, gold screens, the pylon
  flood(18.0, 50.5), flood(26.0, 50.5), flood(35.0, 51.0, 18), flood(44.0, 50.5), flood(53.0, 50.5), flood(64.0, 50.5),
  alert(20.0, 48.4), alert(38.0, 48.4), alert(56.0, 48.4),
  sigil(26.0, 48.6), sigil(44.0, 48.6), sigil(62.0, 48.6),
  { x: 34.5, y: 3.0, z: 49.6, color: '#ffc04a', intensity: 16, distance: 7, mode: 'pulse', amount: 0.25, speed: 0.9, tag: 'pylon' },
  { x: 39.5, y: 1.3, z: 49.2, color: '#ff3b4e', intensity: 6, distance: 3.5 },
  { x: 57.5, y: 1.3, z: 49.2, color: '#ff3b4e', intensity: 6, distance: 3.5 },
  { x: 21.5, y: 0.7, z: 52.4, color: '#ff4a3a', intensity: 6, distance: 3.5 },
  { x: 48.5, y: 0.7, z: 48.6, color: '#ff4a3a', intensity: 6, distance: 3.5 },
  // the barracks
  flood(26.5, 44.0, 20), flood(40.0, 44.0, 20), flood(56.5, 44.0, 20), flood(66.0, 44.5, 18),
  alert(34.5, 42.4), alert(53.5, 42.4), sigil(29.0, 42.6), sigil(47.0, 42.6), sigil(61.0, 42.6),
  { x: 22.0, y: 1.0, z: 44.0, color: '#ff2a3c', intensity: 9, distance: 4.5, tag: 'grid_a' },
  cyan(23.5, 42.8), cyan(47.0, 45.8, 1.0), { x: 17.0, y: 1.6, z: 42.6, color: '#ffb04a', intensity: 7, distance: 4 },
  // the armory and the junction
  flood(4.5, 37.5, 18), flood(12.5, 37.5, 18), flood(24.5, 37.5, 20), flood(35.0, 37.8, 18),
  alert(17.5, 35.4), sigil(21.5, 35.6), { x: 8.0, y: 1.6, z: 35.6, color: '#ff8a3a', intensity: 8, distance: 4.5 },
  { x: 2.5, y: 1.0, z: 36.2, color: '#ffb04a', intensity: 7, distance: 4 },
  { x: 32.5, y: 1.0, z: 38.0, color: '#ff2a3c', intensity: 9, distance: 4.5, tag: 'grid_b' },
  { x: 37.5, y: 1.0, z: 38.0, color: '#ff2a3c', intensity: 9, distance: 4.5, tag: 'grid_c' },
  cyan(30.5, 35.8), cyan(34.5, 35.8),
  // the cells: white cell lamps, the red cell fields, the guard post
  flood(45.0, 38.0, 18), flood(53.0, 38.0, 18), flood(66.5, 38.0, 20),
  { x: 41.0, y: 1.0, z: 37.6, color: '#ff2a3c', intensity: 7, distance: 3.5, when: '!story:cadets_freed' },
  { x: 49.0, y: 1.0, z: 37.6, color: '#ff2a3c', intensity: 7, distance: 3.5, when: '!story:cadets_freed' },
  { x: 57.0, y: 1.0, z: 37.6, color: '#ff2a3c', intensity: 7, distance: 3.5, when: '!story:cadets_freed' },
  { x: 49.0, y: 1.6, z: 36.4, color: '#bfe0ff', intensity: 8, distance: 5, when: 'story:cadets_freed' },
  sigil(63.5, 35.6), cyan(61.0, 35.8), { x: 68.5, y: 1.8, z: 35.6, color: '#5dff9c', intensity: 6, distance: 4.5, mode: 'pulse', amount: 0.3, speed: 2.4 },
  { x: 69.0, y: 0.6, z: 39.0, color: '#ff8a3a', intensity: 7, distance: 3.5 },
  // the officers' deck: warm lamps
  flood(8.5, 31.6, 18), flood(26.5, 31.6, 18), flood(46.0, 31.8, 16), flood(62.0, 31.8, 16),
  { x: 44.0, y: 1.6, z: 30.6, color: '#ffb46a', intensity: 9, distance: 5 }, { x: 54.0, y: 1.6, z: 30.6, color: '#ffb46a', intensity: 9, distance: 5 },
  { x: 64.0, y: 1.6, z: 30.6, color: '#ffb46a', intensity: 9, distance: 5 },
  sigil(20.5, 30.6), sigil(33.5, 30.6), alert(4.0, 30.4), alert(38.5, 33.6),
  { x: 69.0, y: 0.6, z: 32.0, color: '#ff8a3a', intensity: 7, distance: 3.5 },
  // the quarters
  { x: 10.5, y: 2.0, z: 26.4, color: '#ffc890', intensity: 15, distance: 6.5 },
  { x: 19.0, y: 2.0, z: 26.4, color: '#ffc890', intensity: 13, distance: 6 },
  { x: 29.5, y: 2.0, z: 26.4, color: '#ffc890', intensity: 14, distance: 6.5 },
  { x: 12.8, y: 0.9, z: 25.6, color: '#45d4ff', intensity: 5, distance: 3 },
  { x: 3.0, y: 2.0, z: 26.8, color: '#ff2a3c', intensity: 8, distance: 4.5, mode: 'pulse', amount: 0.45, speed: 2.2 },
  // the training hall and the range
  flood(6.0, 17.0), flood(16.0, 20.5), flood(27.0, 17.0), flood(38.5, 20.5), flood(48.0, 17.0), flood(60.0, 20.5), flood(67.5, 17.0, 18),
  alert(20.5, 14.4), alert(52.5, 14.4), sigil(12.0, 14.6), sigil(40.5, 14.6), sigil(60.0, 14.6),
  { x: 10.0, y: 0.5, z: 19.0, color: '#ff4a5a', intensity: 7, distance: 4.5 },
  { x: 24.5, y: 1.2, z: 16.6, color: '#45d4ff', intensity: 9, distance: 5, tag: 'recorder' },
  { x: 62.5, y: 1.2, z: 15.0, color: '#45ffd4', intensity: 7, distance: 5 },
  { x: 68.0, y: 0.6, z: 15.0, color: '#ff8a3a', intensity: 7, distance: 3.5 },
  // the lobby
  flood(58.5, 6.5, 22), flood(66.0, 7.5, 18), alert(64.5, 2.4), sigil(62.5, 2.6),
  { x: 57.5, y: 1.8, z: 2.6, color: '#5dff9c', intensity: 6, distance: 4.5, mode: 'pulse', amount: 0.3, speed: 2.4 },
  { x: 68.0, y: 0.6, z: 3.0, color: '#ff8a3a', intensity: 7, distance: 3.5 },
  // the command deck: Tethys light through the great window, the holo table, consoles, the chair, red alert
  { x: 35.5, y: 2.6, z: 3.0, color: '#ffc890', intensity: 18, distance: 10 },
  { x: 35.5, y: 1.6, z: 8.2, color: '#ff9a4a', intensity: 14, distance: 6, tag: 'flare' },
  flood(26.5, 9.0, 20), flood(44.5, 9.0, 20),
  cyan(21.0, 2.8), cyan(50.0, 2.8), cyan(37.6, 5.9, 1.0), sigil(22.5, 2.6), sigil(49.5, 2.6),
  alert(30.0, 2.4), alert(41.0, 2.4),
  // the core antechamber: cyan conduits and floor traces, the interface's glow
  { x: 6.5, y: 1.8, z: 4.4, color: '#45d4ff', intensity: 16, distance: 7, mode: 'pulse', amount: 0.25, speed: 0.8, tag: 'interface' },
  { x: 13.0, y: 2.0, z: 6.0, color: '#b98cff', intensity: 10, distance: 6 }, { x: 3.5, y: 2.0, z: 10.0, color: '#45d4ff', intensity: 9, distance: 6 },
  { x: 10.5, y: 0.7, z: 7.2, color: '#45d4ff', intensity: 7, distance: 5 },   // the core traces under the floor
  flood(10.0, 9.0, 16), { x: 17.5, y: 1.4, z: 8.5, color: '#ff2a3c', intensity: 8, distance: 4, when: '!story:core_open' },
];

// ---------------------------------------------------------------- ambient particles (one per area at least)

const ambient = [
  { preset: 'dust', x: 7, y: 1.6, z: 48, area: [11, 2.6, 11], rate: 3, color: '#ffd9e0' },
  { preset: 'sp_ash', x: 42, y: 2.4, z: 51, area: [56, 1.6, 5], rate: 6 },
  { preset: 'dust', x: 42, y: 1.4, z: 51, area: [56, 2.4, 5], rate: 4, color: '#ffe0e0' },
  { preset: 'sp_ash', x: 42, y: 2.4, z: 44.5, area: [56, 1.6, 4], rate: 5 },
  { preset: 'dust', x: 19, y: 1.4, z: 44.5, area: [10, 2.4, 4], rate: 1.2, color: '#ffe0e0' },
  { preset: 'dust', x: 42, y: 1.4, z: 44.5, area: [56, 2.4, 4], rate: 3, color: '#ffe8e8' },
  { preset: 'dust', x: 14, y: 1.4, z: 38, area: [26, 2.4, 5], rate: 3, color: '#ffe0c8' },
  { preset: 'dust', x: 33, y: 1.4, z: 38, area: [10, 2.4, 5], rate: 1.6, color: '#ffd0d0' },
  { preset: 'sp_ash', x: 54, y: 2.2, z: 38, area: [30, 1.6, 5], rate: 4 },
  { preset: 'dust', x: 36, y: 1.4, z: 32, area: [68, 2.4, 3], rate: 4, color: '#ffd9b0' },
  { preset: 'dust', x: 3.5, y: 1.4, z: 27, area: [4, 2.0, 3], rate: 0.8, color: '#ffe0e0' },
  { preset: 'dust', x: 11, y: 1.4, z: 27, area: [7, 2.0, 3], rate: 1.2, color: '#ffe0c0' },
  { preset: 'dust', x: 19, y: 1.4, z: 27, area: [7, 2.0, 3], rate: 1.0, color: '#ffe0c0' },
  { preset: 'dust', x: 30, y: 1.4, z: 27, area: [12, 2.0, 3], rate: 1.4, color: '#ffe0c0' },
  { preset: 'dust', x: 23, y: 1.6, z: 19, area: [44, 2.8, 9], rate: 4, color: '#fff0f0' },
  { preset: 'sp_ash', x: 23, y: 2.6, z: 19, area: [44, 1.6, 9], rate: 3.5 },
  { preset: 'dust', x: 58.5, y: 1.6, z: 19, area: [24, 2.8, 9], rate: 2.4, color: '#fff0f0' },
  { preset: 'sp_ash', x: 58.5, y: 2.6, z: 19, area: [24, 1.6, 9], rate: 2 },
  { preset: 'dust', x: 62, y: 1.6, z: 7, area: [16, 2.6, 10], rate: 2.4, color: '#ffe0e0' },
  { preset: 'dust', x: 35.5, y: 1.8, z: 7, area: [32, 3.0, 10], rate: 4, color: '#e0e8ff' },
  { preset: 'sp_motes', x: 35.5, y: 1.4, z: 8.2, area: [1.6, 0.8, 1.6], rate: 2 },
  { preset: 'data', x: 6.5, y: 0.8, z: 4.6, area: [2.4, 0.4, 1.6], rate: 3 },
  { preset: 'dust', x: 9, y: 1.6, z: 7, area: [16, 2.6, 10], rate: 2.4, color: '#bfe8ff' },
];

// ---------------------------------------------------------------- interactables

const terminal = (id, x, z, script, extra = {}) => ({
  id, kind: 'terminal', x, z: z + 0.31, box: [x - 0.5, z - 0.33, x + 0.5, z + 0.33],
  label: 'Access', icon: 'inspect', prop: 'sp.console', propFields: { x, z }, talk: script, ...extra,
});
const gridTerminal = (id, x, z, flag, reveal, extra = {}) => ({
  id, kind: 'switch', x, z: z + 0.3, box: [x - 0.45, z - 0.3, x + 0.45, z + 0.32], flag, mode: 'toggle',
  script: 'spire.grid_terminal', reveal, label: 'Grid terminal', icon: 'inspect', sfx: 'laser_off',
  prop: 'switch.panel', propFields: { x, z, on: onOf(x, z) }, ...extra,
});
const lift = (id, x, z, to, label, extra = {}) => ({ id, kind: 'lift', x, z, box: [x - 1, z - 1, x + 1, z + 1], reach: 0.4, to, label, icon: 'travel', ...extra });
const medStation = (id, x, z, extra = {}) => ({
  id, kind: 'med', x, z: z + 0.31, box: [x - 0.52, z - 0.33, x + 0.52, z + 0.33],
  label: 'Med-Station', icon: 'save', prop: 'med', propFields: { x, z, on: onOf(x, z) }, prompt: 'Restore the squad and log a checkpoint?', ...extra,
});

const interactables = [
  { id: 'starchart', kind: 'starchart', x: 10.5, z: 50.6 },
  ...screenSpots,
  // the grid puzzle (11.8): one grid; a terminal that swaps two; Kade's override on the last
  gridTerminal('grid_t1', 23.5, 42.36, 'sw:spire:grid_a', 'grid_a'),
  gridTerminal('grid_t2', 30.5, 35.36, 'sw:spire:grid_swap', 'grid_b'),
  gridTerminal('grid_t3', 34.5, 35.36, 'sw:spire:override', 'grid_c', {
    mode: 'once', leader: 'kade', script: 'spire.kade_override', label: 'Security override',
    leaderHint: 'A Security Corps override panel. *Kade\'s* codes could open it.',
  }),
  // the cell field release at the guard post; the shop and the Med-Station open with the cadets
  {
    id: 'cells', kind: 'inspect', x: 61.0, z: 35.67, box: [60.5, 35.03, 61.5, 35.7], label: 'Release', icon: 'inspect',
    prop: 'sp.console', propFields: { x: 61.0, z: 35.36 }, talk: [{ when: 'chapter>=ch3 & !story:cadets_freed', script: 'spire.cadets' }, { script: 'spire.cells_after' }],
  },
  {
    id: 'quartermaster', kind: 'shop', shop: 'quartermaster', x: 64.5, z: 37.3, box: [63.0, 36.9, 66.0, 37.4],
    label: 'Quartermaster', icon: 'shop', when: 'story:cadets_freed',
  },
  medStation('med_cells', 68.5, 35.34, { when: 'story:cadets_freed' }),
  // between the Mk-III's deck and the Training Hall: three fights on Deck 5 with no rest wore a
  // first-timer's squad down (measured at human pace)
  medStation('med_stairs', 5.2, 25.34),
  medStation('med_lobby', 57.5, 2.34),
  // logs and the leader's lines
  terminal('term_checkpoint', 15.5, 48.36, 'spire.term_checkpoint'),
  terminal('term_roster', 19.0, 42.36, 'spire.term_roster'),
  terminal('term_cells', 26.0, 35.36, 'spire.term_cells'),
  terminal('term_command', 24.5, 2.36, 'spire.term_command', { prop: null }),
  { id: 'kade_desk', kind: 'inspect', x: 11.5, z: 25.9, box: [10.6, 25.0, 12.4, 25.8], label: 'Look', icon: 'inspect', talk: 'spire.kade_desk' },
  {
    id: 'recording', kind: 'terminal', x: 24.5, z: 14.67, box: [24.0, 14.03, 25.0, 14.7], label: 'Recording', icon: 'inspect',
    prop: 'sp.console', propFields: { x: 24.5, z: 14.36 },
    talk: [{ when: 'story:cadets_freed & !story:flare_report', script: 'spire.oath_recording' }, { script: 'spire.recording_after' }],
  },
  {
    id: 'interface', kind: 'exit', x: 6.5, z: 4.9, box: [5.6, 3.0, 7.4, 4.8], to: { map: 'vault', spawn: 'entry' }, transition: 'iris',
    label: 'Neural interface', icon: 'travel', when: 'story:core_open',
  },
  // lifts between the decks (same map), and the express lift once the climb is done (12.4 shortcut)
  lift('lift_block', 69.0, 39.0, 'deck5', 'Lift: Deck 5'),
  lift('lift_deck5', 69.0, 32.0, 'block', 'Lift: Deck 4'),
  lift('lift_hall', 68.0, 15.0, 'lobby', 'Lift: Command'),
  lift('lift_lobby', 68.0, 3.0, 'hall', 'Lift: Training Hall'),
  lift('lift_express', 68.0, 11.0, 'dock_lift', 'Express: Dock', { when: 'defeated:spire_boss_voss' }),
  lift('lift_dock', 3.0, 52.0, 'lobby', 'Express: Command', { when: 'story:core_open' }),
];

// ---------------------------------------------------------------- gates (the laser grids, the cell fields, the core door)

const GATES = [
  { id: 'grid_a', cells: [[21, 42], [21, 43], [21, 44], [21, 45], [21, 46]], open: 'sw:spire:grid_a | story:cadets_freed', prop: 'gate.laser' },
  {
    id: 'grid_b', cells: [[32, 35], [32, 36], [32, 37], [32, 38], [32, 39], [32, 40]],
    open: 'sw:spire:grid_swap | sw:spire:override | story:cadets_freed', prop: 'gate.laser',
  },
  {
    id: 'grid_c', cells: [[37, 35], [37, 36], [37, 37], [37, 38], [37, 39], [37, 40]],
    open: '!sw:spire:grid_swap | sw:spire:override | story:cadets_freed', prop: 'gate.laser',
  },
  ...[40, 44, 48, 52, 56].map((c, i) => ({
    id: `cell_${i + 1}`, cells: [[c, 37], [c + 1, 37], [c + 2, 37]], open: 'story:cadets_freed', prop: 'gate.laser',
  })),
  { id: 'core_door', cells: [[18, 7], [18, 8], [18, 9], [18, 10]], open: 'story:core_open', prop: 'gate.shutter' },
];

// ---------------------------------------------------------------- the map

export default {
  id: 'spire',
  name: 'Security Spire',
  region: 'Deck 4 · Security Command',
  music: 'spire',
  grid: [
    //          11111111112222222222333333333344444444445555555555666666666677
    //012345678901234567890123456789012345678901234567890123456789012345678901
    '                                                                        ', // 0
    '###################qqqqqqWWWWWWWWWWWWWWWWWWWWWWqqqqqq###################', // 1
    '#zzzzzzzzzzzzzzzzz#xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx#.................#', // 2
    '#zzzzzzzzzzzzzzzzz#xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx#.................#', // 3
    '#zzzzzzzzzzzzzzzzz#xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx#.................#', // 4
    '#zzzzzzzzzzzzzzzzz#xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx#.................#', // 5
    '#zzzzzzzzzzzzzzzzz#xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx#.................#', // 6
    '#zzzzzzzzzzzzzzzzzzxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.................#', // 7
    '#zzzzzzzzzzzzzzzzzzxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.................#', // 8
    '#zzzzzzzzzzzzzzzzzzxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.................#', // 9
    '#zzzzzzzzzzzzzzzzzzxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.................#', // 10
    '#zzzzzzzzzzzzzzzzz#xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx#.................#', // 11
    '#zzzzzzzzzzzzzzzzz#xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx#.................#', // 12
    'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', // 13
    '#ffffffffffffffffffOfffffffffffffffffffffffffffffffOfffffffffffffffffff#', // 14
    '#ffffffffffffffffffOfffffffffffffffffffffffffffffffOfffffffffffffffffff#', // 15
    '#ffffffffffffffffffOfffffffffffffffffffffffffffffffOfffffffffffffffffff#', // 16
    '#ffffffffffffffffffOfffffffffffffffffffffffffffffffOfffffffffffffffffff#', // 17
    '#ffffffffffffffffffOfffffffffffffffffffffffffffffffOfffffffffffffffffff#', // 18
    '#ffffffffffffffffffffffffffffffffffOfffffffffffffffffffffffffffffffffff#', // 19
    '#ffffffffffffffffffffffffffffffffffOfffffffffffffffffffffffffffffffffff#', // 20
    '#ffffffffffffffffffffffffffffffffffOfffffffffffffffffffffffffffffffffff#', // 21
    '#ffffffffffffffffffffffffffffffffffOfffffffffffffffffffffffffffffffffff#', // 22
    '#ffffffffffffffffffffffffffffffffffOfffffffffffffffffffffffffffffffffff#', // 23
    '##DD#################################wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', // 24
    '#.....#uuuuuuuu#uuuuuuu#uuuuuuuuuuuu#                                   ', // 25
    '#.....#uuuuuuuu#uuuuuuu#uuuuuuuuuuuu#                                   ', // 26
    '#.....#uuuuuuuu#uuuuuuu#uuuuuuuuuuuu#                                   ', // 27
    '#.....#uuuuuuuu#uuuuuuu#uuuuuuuuuuuu#                                   ', // 28
    '##DD######DD######DD#########DD#########################################', // 29
    '#......................................................................#', // 30
    '#oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo#', // 31
    '#oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo#', // 32
    '#......................................................................#', // 33
    '#rrrrrrrrrrrrrrr#######################cccccccccccccccccccccbbbbbbbbbbb#', // 34
    '#......................................ckkkckkkckkkckkkckkkc...........#', // 35
    '#......................................ckkkckkkckkkckkkckkkc...........#', // 36
    '#......................................ckkkckkkckkkckkkckkkc...........#', // 37
    '#......................................................................#', // 38
    '#......................................................................#', // 39
    '#......................................................................#', // 40
    '################DD######################################################', // 41
    '#pppppppppppp#...................P.....................................#', // 42
    '#pppppppppppp#...................P.....................................#', // 43
    '#pppppppppppp#...................P..................P..................#', // 44
    '#pppppppppppp#......................................P..................#', // 45
    '#pppppppppppp#......................................P..................#', // 46
    '#pppppppppppp#####################################################DD####', // 47
    '#pppppppppppp#.......B.................B.................B.............#', // 48
    '#pppppppppppp........B.................B.................B.............#', // 49
    '#pppppppppppp........B........B........B........B........B.............#', // 50
    '#pppppppppppp........B........B........B........B........B.............#', // 51
    '#pppppppppppp.................B.................B......................#', // 52
    '#pppppppppppp#................B.................B......................#', // 53
    '########################################################################', // 54
  ],
  legend: {
    '#': { t: 'wall', tex: 'sp_wall', side: 'sp_wall' },
    b: { t: 'wall', tex: 'sp_wall_b', side: 'sp_wall' },
    r: { t: 'wall', tex: 'sp_rack', side: 'sp_wall' },
    c: { t: 'wall', tex: 'sp_cellwall', side: 'sp_cellwall' },
    w: { t: 'wall', tex: 'sp_gymwall', side: 'sp_wall' },
    q: { t: 'wall', tex: 'sp_cmdwall', side: 'sp_wall', upper: 'sp_cmdwall' },
    W: { t: 'window', tex: 'window_frame' },
    D: { t: 'door', tex: 'sp_door', lockedTex: 'sp_door', floor: 'sp_hazard' },
    // the checkpoint's barricades, the barracks' locker partitions and the hall's obstacle walls
    B: { t: 'wall', tex: 'sp_barricade', side: 'sp_barricade', low: 'sp_barricade', cap: 'sp_cap', height: 1.05 },
    P: { t: 'wall', tex: 'sp_lockers', side: 'sp_lockers', low: 'sp_lockers', cap: 'sp_cap', height: 1.7 },
    O: { t: 'wall', tex: 'sp_padwall', side: 'sp_padwall', low: 'sp_padwall', cap: 'sp_cap', height: 1.3 },
    '.': { t: 'floor', tex: 'sp_deck', mix: [['sp_deck_b', 0.2], ['sp_deck_c', 0.14]], rot: 'random', roughness: 0.55, metalness: 0.35, emissive: 2.0 },
    h: { t: 'floor', tex: 'sp_hazard', roughness: 0.6, metalness: 0.3, emissive: 2.0 },
    p: { t: 'floor', tex: 'sp_pad', mix: [['sp_deck', 0.1]], roughness: 0.58, metalness: 0.32, emissive: 2.0 },
    f: { t: 'floor', tex: 'sp_gym', rot: 'random', roughness: 0.7, metalness: 0.1, emissive: 2.0 },
    x: { t: 'floor', tex: 'sp_command', rot: 'random', roughness: 0.32, metalness: 0.45, emissive: 2.2 },
    z: { t: 'floor', tex: 'sp_core', rot: 'random', roughness: 0.4, metalness: 0.4, emissive: 2.4 },
    o: { t: 'floor', tex: 'sp_carpet', roughness: 0.85, metalness: 0.05, emissive: 2.0 },
    u: { t: 'floor', tex: 'sp_quarters', rot: 'random', roughness: 0.8, metalness: 0.05, emissive: 2.0 },
    k: { t: 'floor', tex: 'sp_tile', rot: 'random', roughness: 0.4, metalness: 0.1, emissive: 2.0 },
  },
  wallH: 3,
  lowH: 0.75,
  wallTex: { side: 'sp_wall', cap: 'sp_cap', low: 'sp_low' },
  grand: [{ row: 1, c0: 19, c1: 52, height: 6 }],
  // each deck's wall rows stand while the leader is south of them and sink once the leader is north
  dividers: DIVIDERS,
  mood: MOOD.checkpoint,
  // cam: [z0, z1] clamp for the camera target (each deck keeps its north wall in frame)
  areas: [
    { id: 'antechamber', name: 'Core Antechamber', subtitle: 'Deck 6 · AI Core Access', rect: [1, 1.5, 18, 13], cam: [6.0, 8.6], zone: null, mood: MOOD.core },
    {
      id: 'command', name: 'Command Deck', subtitle: 'Deck 6 · Security Command', rect: [18, 1.5, 53, 13], cam: [6.0, 8.6], zone: null,
      focus: { x: 35.5, y: 1.6, z: 4.0, w: 0.4, band: 0.18 }, mood: MOOD.command,
    },
    { id: 'lobby', name: 'Command Lobby', subtitle: 'Deck 6 · Lift Lobby', rect: [53, 1.5, 71, 13], cam: [6.0, 8.6], zone: null, mood: MOOD.lobby },
    { id: 'range', name: 'Firing Range', subtitle: 'Deck 5 · Training', rect: [46, 13.5, 71, 24], cam: [17.0, 20.0], zone: 'spire_upper', mood: MOOD.training },
    { id: 'training', name: 'Training Hall', subtitle: 'Deck 5 · Training', rect: [0.5, 13.5, 46, 24], cam: [17.0, 20.0], zone: 'spire_upper', mood: MOOD.training },
    { id: 'kade', name: 'Officers\' Quarters', subtitle: 'Lt. K. Arden', rect: [6.5, 24.5, 15, 29], cam: [27.0, 27.4], zone: null, mood: MOOD.quarters },
    { id: 'grey', name: 'Officers\' Quarters', subtitle: 'Sgt. H. Grey', rect: [15, 24.5, 23, 29], cam: [27.0, 27.4], zone: null, mood: MOOD.quarters },
    { id: 'lounge', name: 'Officers\' Lounge', subtitle: 'Deck 5 · Officers\' Quarters', rect: [23, 24.5, 36.5, 29], cam: [27.0, 27.4], zone: null, mood: MOOD.quarters },
    { id: 'stairs', name: 'Officers\' Deck', subtitle: 'Deck 5 · Stairwell', rect: [0.5, 24.5, 6.5, 29], cam: [26.6, 27.4], zone: null, mood: MOOD.officers, banner: false },
    { id: 'officers', name: 'Officers\' Deck', subtitle: 'Deck 5 · Officers\' Quarters', rect: [0.5, 29.5, 71, 34], cam: [31.6, 32.0], zone: 'spire_upper', mood: MOOD.officers },
    { id: 'junction', name: 'Grid Junction', subtitle: 'Deck 4 · Holding Cells', rect: [28, 34.5, 38, 41], cam: [37.6, 38.0], zone: null, puzzle: true, mood: MOOD.armory },
    {
      id: 'cells', name: 'Holding Cells', subtitle: 'Deck 4 · Holding Cells', rect: [38, 34.5, 71, 41], cam: [37.6, 38.0], mood: MOOD.cells,
      zone: [{ when: 'story:cadets_freed', zone: null }, { zone: 'spire_barracks' }],
    },
    { id: 'armory', name: 'Armory', subtitle: 'Deck 4 · Armory', rect: [0.5, 34.5, 28, 41], cam: [37.6, 38.0], zone: 'spire_barracks', mood: MOOD.armory },
    { id: 'gate', name: 'Barracks', subtitle: 'Deck 4 · Barracks', rect: [13.5, 41.5, 25, 47], cam: [44.4, 44.8], zone: null, puzzle: true, mood: MOOD.barracks, banner: false },
    { id: 'barracks', name: 'Barracks', subtitle: 'Deck 4 · Barracks', rect: [13.5, 41.5, 71, 47], cam: [44.4, 44.8], zone: 'spire_barracks', mood: MOOD.barracks },
    { id: 'dock', name: 'Spire Dock', subtitle: 'Deck 4 · Moth Berth', rect: [0.5, 41.5, 13.5, 54], cam: [46.6, 50.2], zone: null, mood: MOOD.dock },
    { id: 'checkpoint', name: 'Checkpoint', subtitle: 'Deck 4 · Security Entry', rect: [13.5, 47.5, 71, 54], cam: [49.6, 50.0], zone: 'spire_barracks', mood: MOOD.checkpoint },
  ],
  spawns: {
    dock: { x: 6.0, z: 51.0, facing: 'right' },
    barracks: { x: 64.5, z: 44.5, facing: 'left' },
    cells: { x: 60.5, z: 39.5, facing: 'up' },
    quarters: { x: 11.0, z: 31.5, facing: 'up' },
    training: { x: 8.5, z: 21.5, facing: 'right' },
    command: { x: 59.5, z: 8.5, facing: 'left' },
    antechamber: { x: 9.5, z: 8.5, facing: 'up' },
    from_vault: { x: 6.5, z: 6.4, facing: 'down' },
    // lift arrivals
    block: { x: 67.0, z: 39.2, facing: 'left' },
    deck5: { x: 67.0, z: 32.0, facing: 'left' },
    hall: { x: 66.0, z: 15.4, facing: 'left' },
    lobby: { x: 66.0, z: 3.6, facing: 'left' },
    dock_lift: { x: 4.8, z: 51.6, facing: 'right' },
    junction: { x: 29.0, z: 38.5, facing: 'right' },
  },
  anchors: {
    voss_window: { x: 35.5, z: 3.4, facing: 'up' },
    holo: { x: 35.5, z: 8.2, facing: 'up' },
  },
  props: props.map(sink),
  lights,
  ambient,
  backdrop: { texture: 'space_backdrop', stars: 'stars_layer', tint: [1.1, 0.96, 0.98] },
  view: { pitch: 34, dist: 16 },
  npcs: [
    // Commander Voss at the great window, her back to the room (the trigger plays her scene)
    { id: 'voss', sprite: 'voss', x: 35.5, z: 3.4, facing: 'up', name: 'VOSS', when: '!story:core_open' },
    // the five cadets behind their cell fields, then at work once freed (where spire.cadets leaves them)
    { id: 'wen_cell', sprite: 'cadet_wen', x: 41.5, z: 36.2, facing: 'down', name: 'WEN', pose: 'look_up', when: '!story:cadets_freed' },
    { id: 'lars_cell', sprite: 'cadet_lars', x: 45.5, z: 35.6, facing: 'down', name: 'LARS', pose: 'collapse', when: '!story:cadets_freed' },
    { id: 'priya_cell', sprite: 'cadet_priya', x: 49.5, z: 36.2, facing: 'down', name: 'PRIYA', pose: 'arms_crossed', when: '!story:cadets_freed' },
    { id: 'jonah_cell', sprite: 'cadet_jonah', x: 53.5, z: 35.7, facing: 'down', name: 'JONAH', pose: 'kneel', when: '!story:cadets_freed' },
    { id: 'mika_cell', sprite: 'cadet_mika', x: 57.5, z: 36.2, facing: 'down', name: 'MIKA', when: '!story:cadets_freed' },
    { id: 'mika', sprite: 'cadet_mika', x: 64.5, z: 35.9, facing: 'down', name: 'MIKA', talk: 'spire.cadet_mika', when: 'story:cadets_freed' },
    {
      id: 'jonah', sprite: 'cadet_jonah', x: 53.4, z: 38.2, facing: 'down', name: 'JONAH', talk: 'spire.cadet_jonah', when: 'story:cadets_freed',
      idle: { path: [[53.4, 38.2], [47.6, 39.4]], speed: 1.2, pause: [2, 4], loop: false },
    },
    { id: 'priya', sprite: 'cadet_priya', x: 49.6, z: 38.4, facing: 'right', name: 'PRIYA', talk: 'spire.cadet_priya', when: 'story:cadets_freed' },
    { id: 'lars', sprite: 'cadet_lars', x: 45.6, z: 38.6, facing: 'right', name: 'LARS', talk: 'spire.cadet_lars', when: 'story:cadets_freed' },
    {
      id: 'wen', sprite: 'cadet_wen', x: 41.8, z: 38.4, facing: 'right', name: 'WEN', talk: 'spire.cadet_wen', when: 'story:cadets_freed',
      idle: { path: [[41.8, 38.4], [44.0, 39.6], [41.8, 38.4], [39.6, 39.2]], speed: 1.1, pause: [2, 5], loop: true },
    },
  ],
  chests: [
    { id: 'cp_cache', x: 22.5, z: 48.6, item: 'stim', n: 2, credits: 120, prop: 'sp.chest' },
    { id: 'bunk_locker', x: 37.0, z: 42.6, item: 'medigel_plus', n: 2, prop: 'sp.chest' },
    { id: 'armory_plate', x: 2.0, z: 35.6, item: 'eq_a_4', n: 1, prop: 'sp.chest' },
    { id: 'armory_charges', x: 14.5, z: 35.6, item: 'volt_charge', n: 2, prop: 'sp.chest' },
    { id: 'oathkeeper', x: 13.6, z: 25.6, item: 'eq_w_kade_4', n: 1, talk: 'spire.oathkeeper', prop: 'sp.chest', propFields: { case: true } },
    { id: 'grey_locker', x: 21.6, z: 25.6, item: 'eq_x_ground_coil', n: 1, prop: 'sp.chest' },
    { id: 'lounge', x: 34.6, z: 25.6, item: 'eq_x_vital_core', n: 1, credits: 200, prop: 'sp.chest' },
    { id: 'hall_cache', x: 2.0, z: 14.6, item: 'stim', n: 2, credits: 150, prop: 'sp.chest' },
    { id: 'range_cache', x: 69.6, z: 23.4, item: 'nanomist', n: 1, prop: 'sp.chest' },
    { id: 'lobby_cache', x: 55.6, z: 2.6, item: 'revive', n: 1, prop: 'sp.chest' },
  ],
  interactables,
  triggers: [
    { id: 'arrival', on: 'load', when: 'chapter>=ch3 & !story:cadets_freed', once: true, script: 'spire.arrival' },
    { id: 'checkpoint', on: 'enter', rect: [15.5, 47.5, 20.5, 54], when: 'chapter>=ch3 & !story:cadets_freed', once: true, script: 'spire.checkpoint' },
    { id: 'riot', on: 'enter', rect: [43.5, 41.5, 46.5, 47], when: 'chapter>=ch3 & !story:cadets_freed', once: true, script: 'spire.riot' },
    { id: 'quarters', on: 'enter', area: 'kade', when: 'story:cadets_freed & !story:core_open', once: true, script: 'spire.quarters' },
    { id: 'voss', on: 'enter', rect: [44, 1.5, 53.5, 13], when: 'story:cadets_freed & !defeated:spire_boss_voss', once: true, script: 'spire.voss' },
  ],
  gates: GATES.map((g) => ({ ...g, propFields: { on: onOf(g.cells[0][0] + 0.5, g.cells[0][1] + 0.5) } })),
  bosses: [
    {
      // the Mk-III on guard in the Officers' Deck: its lock-on is the lesson for Voss's escorts
      id: 'mk3_guard', art: 'sentinel_mk3', name: 'SENTINEL MK-III', x: 40.5, z: 31.9, facing: 'right', encounter: 'spire_mk3_guard',
      script: 'spire.mk3_guard', triggerRadius: 3.0, radius: 0.9, when: 'story:cadets_freed & !spire:mk3_down',
    },
    {
      // M3: the optional elite of the firing range, guarding the Sentinel Core
      id: 'prime', art: 'sentinel_mk3', name: 'MK-III PRIME', x: 66.5, z: 21.8, facing: 'left', encounter: 'spire_elite_prime',
      script: 'spire.prime', triggerRadius: 2.0, radius: 1.0,
    },
  ],
  viewpoints: {
    dock: { x: 7.0, z: 51.0, facing: 'up' },
    checkpoint: { x: 26.0, z: 51.5, facing: 'right' },
    barricades: { x: 52.0, z: 51.0, facing: 'right' },
    barracks: { x: 44.0, z: 44.6, facing: 'left' },
    grid: { x: 25.0, z: 44.6, facing: 'left' },
    armory: { x: 10.0, z: 38.6, facing: 'up' },
    junction: { x: 33.5, z: 38.6, facing: 'up' },
    cells: { x: 50.0, z: 39.0, facing: 'up' },
    guard: { x: 64.0, z: 38.8, facing: 'up' },
    officers: { x: 45.0, z: 32.0, facing: 'left' },
    quarters: { x: 11.0, z: 27.6, facing: 'up' },
    training: { x: 14.0, z: 20.0, facing: 'right' },
    recording: { x: 24.5, z: 18.0, facing: 'up' },
    range: { x: 60.0, z: 19.5, facing: 'right' },
    lobby: { x: 62.0, z: 7.5, facing: 'up' },
    command: { x: 35.5, z: 10.0, facing: 'up' },
    antechamber: { x: 9.0, z: 8.5, facing: 'up' },
  },
};
