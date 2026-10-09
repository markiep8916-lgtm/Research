// driftmarket (PURE MapDef, TECH_PLAN 3.1 and 12.5): the Ringborn station in Tethys's ring, built
// from the wreck of the Meridian. 1 tile = 1 world unit; cell (c, r) spans x c..c+1, z r..r+1.
//
//   The Docks (west)       the Moth's pad under the docking iris, Marta's Starchart, Oona's skiff
//   The Viewport (north)   a railed promenade open to the sky: Tethys fills it (sky bd_tethys_close)
//   Ruse's Salvage         a shop with a shopfront facade (divider row 7) north of Lantern Row
//   The Beacon (north-east) Tobin's beacon horn on a railed pier
//   Lantern Row (middle)   the market street: stalls, lantern strings, the Shoals hatch at the east end
//   The Lantern (south)    the inn (divider row 20), Hesper and the Rest
//
// Binding (12.5): spawns `dock`, `from_shoals`; anchors `ruse_stall`, `viewport`; the exit to
// shoals:from_driftmarket. NPC ids are WRITING.md section 7's (other chapters add talk to them).
// All dialogue lives in story.js; this file names script ids only.

const warm = {
  fog: '#1d120d', density: 0.02, sky: '#5aa6a2', ground: '#2b170d', hemi: 0.62,
  key: 1.35, keyColor: '#9fe0d6', fill: 0.42, exposure: 1.08, bloom: 1.0, saturation: 1.12,
};
const MOOD = {
  docks: { ...warm, fog: '#160f0e', key: 1.0, keyColor: '#8fd0cc', hemi: 0.55 },
  row: warm,
  viewport: { ...warm, fog: '#10161a', density: 0.016, key: 1.7, keyColor: '#b4ece2', hemi: 0.7, sky: '#6fc2bc', exposure: 1.1 },
  beacon: { ...warm, fog: '#12141a', density: 0.016, key: 1.5, keyColor: '#ffd9a8', sky: '#6fb8b0' },
  shop: { ...warm, fog: '#1f120b', key: 0.55, keyColor: '#ffcf9a', hemi: 0.5, exposure: 1.06 },
  inn: { ...warm, fog: '#21130b', key: 0.5, keyColor: '#ffc890', hemi: 0.48, ground: '#331a0c', exposure: 1.06 },
};

// virtual lights (the rig drives its point-light pool from the nearest ones)
const lantern = (x, z, y = 2.6, intensity = 16, distance = 6.5) => ({ x, y, z, color: '#ffa24a', intensity, distance, mode: 'flicker', amount: 0.18, speed: 3 });
const ribbonGlow = (x, z) => ({ x, y: 1.2, z, color: '#ff4f5e', intensity: 6, distance: 4 });
const tethys = (x, z) => ({ x, y: 1.6, z, color: '#4fd8cf', intensity: 9, distance: 7 });
// cold Tethys light spilling from the promenade onto the Row: a rim on the backs of the north stalls
const rim = (x, z) => ({ x, y: 2.2, z, color: '#6fe0ec', intensity: 9, distance: 5.5 });

export default {
  id: 'driftmarket',
  name: 'Driftmarket',
  region: 'Tethys Ring · Ringborn Station',
  music: 'driftmarket',
  grid: [
    //         1111111111222222222233333333334444444444555555555
    // 234567890123456789012345678901234567890123456789012345678
    '###b####c####b###rrrrrrrrrrrrrrrrrrrr#kkkkkkk#rrrrrrrrrrrrr#', // 0
    '#...............#====================#,,,,,,,#.............#', // 1
    '#..ooooooooo....#====================#,,,,,,,#.............#', // 2
    '#..ooooooooo....#....................#,,,,,,,#.............#', // 3
    '#..ooooooooo....#....................#,,,,,,,#.............#', // 4
    '#..ooooooooo....#....................#,,,,,,,#.............#', // 5
    '#..ooooooooo....#....................#,,,,,,,#.............#', // 6
    '#..ooooooooo....#....................#ffDDfff#.............#', // 7
    '#..ooooooooo....#..........................................#', // 8
    '#..ooooooooo....#..........................................#', // 9
    '#..........................................................#', // 10
    '#................,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#', // 11
    '#................,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,iiiii', // 12
    '#................,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,iiiii', // 13
    '#................,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,iiiii', // 14
    '#,,,,,,,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,iiiii', // 15
    '#,,,,,,,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#', // 16
    '#,,,,,,,,,,,,,,,#..........................................#', // 17
    '#,,,,,,,,,,,,,,,#..........................................#', // 18
    '#,,,,,,,,,,,,,,,#..........................................#', // 19
    '#,,,,,,,,,,,,,,,##nnnnnnDDnnnnnnn###########################', // 20
    '#,,,,,,,,,,,,,,,##,,,,,,,,,,,,,,,#                          ', // 21
    '##################,,,,,,,,,,,,,,,#                          ', // 22
    '                 #,,,,,,,,,,,,,,,#                          ', // 23
    '                 #,,,,,,,,,,,,,,,#                          ', // 24
    '                 #,,,,,,,,,,,,,,,#                          ', // 25
    '                 #,,,,,,,,,,,,,,,#                          ', // 26
    '                 #################                          ', // 27
  ],
  legend: {
    '#': { t: 'wall', tex: 'dm_hull_a', side: 'dm_hull_a' },
    b: { t: 'wall', tex: 'dm_hull_c', side: 'dm_hull_a' },
    c: { t: 'wall', tex: 'dm_hull_b', side: 'dm_hull_a' },
    k: { t: 'wall', tex: 'dm_shelves', side: 'dm_hull_a' },
    f: { t: 'wall', tex: 'dm_shopfront', side: 'dm_hull_a' },
    n: { t: 'wall', tex: 'dm_inn_wall', side: 'dm_hull_a' },
    r: { t: 'wall', tex: 'dm_rail', low: 'dm_rail', cap: 'dm_rail_cap', height: 0.5 },
    D: { t: 'door', tex: 'dm_door', lockedTex: 'dm_door', floor: 'dm_planks_a' },
    // three different patch plates, one cell in six (only one in twenty carries the M7 stencil)
    '.': { t: 'floor', tex: 'dm_deck_a', mix: [['dm_deck_b', 0.05], ['dm_deck_c', 0.06], ['dm_deck_d', 0.05]], grime: 0.05, roughness: 0.58, metalness: 0.32, emissive: 2.2 },
    ',': { t: 'floor', tex: 'dm_planks_a', grime: 0.04, roughness: 0.7, metalness: 0.12, emissive: 2.0 },
    '=': { t: 'floor', tex: 'dm_grate', roughness: 0.5, metalness: 0.4, emissive: 1.0 },
    o: { t: 'floor', tex: 'dm_pad', roughness: 0.62, metalness: 0.3, emissive: 2.0 },
    // the deck by the Shoals hatch, glossy with melt; the rime is one world-space decal over it (props)
    i: { t: 'floor', tex: 'dm_deck_a', roughness: 0.36, metalness: 0.3, emissive: 2.2 },
  },
  wallH: 3,
  lowH: 0.75,
  wallTex: { side: 'dm_hull_a', cap: 'dm_cap', low: 'dm_low' },
  // the shopfront stands while the leader is in the street and sinks once they step inside; the
  // inn's back wall stands while the leader is in the inn
  dividers: [
    { id: 'shop', row: 7, rect: [37, 7, 45, 7] },
    { id: 'inn', row: 20, rect: [17, 20, 33, 27] },
  ],
  mood: MOOD.row,
  areas: [
    { id: 'ruse', name: 'Ruse\'s Salvage', subtitle: 'Driftmarket · Salvage and Sundries', rect: [38, 0.5, 45, 7.4], cam: [4.4, 4.6], zone: null, mood: MOOD.shop },
    { id: 'inn', name: 'The Lantern', subtitle: 'Driftmarket · Inn', rect: [17.5, 20.6, 33, 27], cam: [23.0, 23.4], zone: null, mood: MOOD.inn },
    { id: 'docks', name: 'The Docks', subtitle: 'Driftmarket · Moth Berth', rect: [0.5, 0.5, 16.4, 22], cam: [6.2, 16.0], zone: null, mood: MOOD.docks },
    {
      id: 'viewport', name: 'The Viewport', subtitle: 'Driftmarket · Tethys Ring', rect: [16.4, 0.5, 37.6, 7.6], cam: [3.4, 7.4], zone: null,
      view: { pitch: 30, dist: 16 }, mood: MOOD.viewport,
    },
    {
      id: 'beacon', name: 'The Beacon', subtitle: 'Driftmarket · Signal Pier', rect: [45.4, 0.5, 59.5, 7.6], cam: [3.6, 7.4], zone: null,
      view: { pitch: 31, dist: 16 }, focus: { x: 52.5, y: 3.0, z: 3.2, w: 0.4, band: 0.18 }, mood: MOOD.beacon,
    },
    { id: 'row', name: 'Lantern Row', subtitle: 'Driftmarket · Market Ring', rect: [16.4, 7.6, 60, 20.6], cam: [9.6, 16.4], zone: null, mood: MOOD.row },
  ],
  spawns: {
    dock: { x: 9.5, z: 11.6, facing: 'right' },
    from_shoals: { x: 57.0, z: 14.0, facing: 'left' },
    viewport: { x: 31.5, z: 2.6, facing: 'up' },
    ruse_front: { x: 40.5, z: 9.4, facing: 'up' },
    counter: { x: 40.6, z: 5.7, facing: 'up' },
    inn: { x: 25.0, z: 24.2, facing: 'up' },
    beacon: { x: 51.0, z: 6.0, facing: 'up' },
  },
  anchors: {
    ruse_stall: { x: 40.6, z: 3.4, facing: 'down' },
    viewport: { x: 31.5, z: 1.6, facing: 'up' },
    dock_gate: { x: 16.5, z: 12.0, facing: 'right' },
    moth: { x: 7.5, z: 5.6, facing: 'down' },
  },
  exits: [
    { id: 'to_shoals', rect: [59.15, 12, 60, 16], to: { map: 'shoals', spawn: 'from_driftmarket' }, when: 'story:maw_lore', label: 'The Shoals' },
  ],
  props: [
    // ---- the Docks: the iris, the Moth on its pad, Oona's skiff, the dock market
    { t: 'dm.iris', x: 7.5, z: 1.0, r: 1.35 },
    { t: 'floorPlane', x: 7.5, z: 6.0, w: 8.6, d: 7.6, tex: 'dm_pad_ring', emissive: 1.8 },
    { t: 'dm.moth', x: 7.4, z: 5.6 },
    { t: 'dm.ribbons', x: 13.4, z: 1.12, y: 2.3, w: 2.6, n: 8, len: 0.9 },
    { t: 'dm.ribbons', x: 2.4, z: 1.12, y: 2.3, w: 1.8, n: 5, len: 0.8 },
    { t: 'dm.crates', x: 14.4, z: 2.0, n: 3 },
    { t: 'dm.crates', x: 1.8, z: 4.2, n: 2 },
    { t: 'dm.barrels', x: 2.2, z: 9.4, n: 2 },
    { t: 'dm.post', x: 2.0, z: 12.6, h: 2.9 },
    { t: 'dm.post', x: 14.0, z: 12.9, h: 2.9 },
    { t: 'dm.barrels', x: 14.6, z: 9.2, n: 1, crate: false },
    { t: 'dm.moth', x: 4.6, z: 18.4, rot: 0.2, scale: 0.62 },
    { t: 'dm.kelp', x: 9.4, z: 20.6 },
    { t: 'dm.barrels', x: 14.0, z: 17.4, n: 3 },
    { t: 'dm.crates', x: 1.8, z: 15.8, n: 3 },
    { t: 'dm.lanterns', a: [1.1, 2.9, 15.4], b: [15.9, 2.9, 17.2], n: 9, sag: 0.5 },
    // ---- the Viewport: ribbons on the rail, pylons, benches
    { t: 'dm.ribbons', x: 19.8, z: 1.06, w: 3.2, n: 9 },
    { t: 'dm.ribbons', x: 25.4, z: 1.06, w: 2.4, n: 6 },
    { t: 'dm.ribbons', x: 29.2, z: 1.06, w: 3.0, n: 8 },
    { t: 'dm.ribbons', x: 34.0, z: 1.06, w: 3.0, n: 8 },
    { t: 'dm.pylon', x: 17.6, z: 1.4 },
    { t: 'dm.pylon', x: 23.2, z: 1.4 },
    { t: 'dm.pylon', x: 36.4, z: 1.4 },
    { t: 'dm.bench', x: 21.8, z: 3.8, w: 2.2 },
    { t: 'dm.bench', x: 32.4, z: 4.0, w: 2.2 },
    { t: 'dm.kelp', x: 36.2, z: 6.4 },
    // ---- Lantern Row: stalls on the north side, strings of lanterns, clutter on the south edge
    { t: 'dm.stall', x: 21.2, z: 8.6, w: 3.4, awning: 'red', goods: 'noodles', sign: 'dm_sign_noodles', signW: 1.5 },
    { t: 'dm.table', x: 21.6, z: 11.8 },
    { t: 'dm.ribbon_frame', x: 27.8, z: 8.6, w: 3.4, h: 2.4 },
    { t: 'dm.scrap', x: 34.0, z: 9.2, w: 2.6, d: 1.6 },
    { t: 'dm.stall', x: 55.2, z: 9.0, w: 3.0, awning: 'teal', goods: 'kelp', front: 'dm_hull_a' },
    { t: 'dm.sign', x: 40.5, z: 8.06, y: 2.95, w: 2.4, h: 0.9, tex: 'dm_sign_ruse', drop: 0.05, on: 'shop' },
    { t: 'dm.post', x: 17.6, z: 9.4, h: 3.6, glow: false },
    { t: 'dm.post', x: 27.2, z: 19.4, h: 3.6 },
    { t: 'dm.post', x: 18.0, z: 19.4, h: 3.6 },
    { t: 'dm.post', x: 30.4, z: 9.6, h: 3.6, glow: false },
    { t: 'dm.post', x: 33.0, z: 19.4, h: 3.6 },
    { t: 'dm.post', x: 45.8, z: 19.4, h: 3.6 },
    { t: 'dm.post', x: 46.2, z: 9.2, h: 3.6, glow: false },
    { t: 'dm.post', x: 57.6, z: 18.8, h: 3.6 },
    { t: 'dm.lanterns', a: [17.7, 3.5, 9.4], b: [27.1, 3.5, 19.4], n: 10, sag: 0.7 },
    { t: 'dm.lanterns', a: [30.3, 3.5, 9.6], b: [18.1, 3.5, 19.4], n: 11, sag: 0.7 },
    { t: 'dm.lanterns', a: [30.5, 3.5, 9.6], b: [45.7, 3.5, 19.4], n: 12, sag: 0.8 },
    { t: 'dm.lanterns', a: [46.1, 3.5, 9.2], b: [33.1, 3.5, 19.4], n: 11, sag: 0.8 },
    { t: 'dm.lanterns', a: [46.3, 3.5, 9.2], b: [57.5, 3.5, 18.8], n: 10, sag: 0.7 },
    { t: 'dm.post', x: 23.6, z: 19.5, h: 3.0, glow: false },
    { t: 'dm.post', x: 26.4, z: 19.5, h: 3.0, glow: false },
    { t: 'dm.sign', x: 25.0, z: 19.5, y: 2.85, w: 2.4, h: 0.6, tex: 'dm_sign_inn', drop: 0.15 },
    { t: 'dm.kelp', x: 30.6, z: 19.3 },
    { t: 'dm.kelp', x: 35.4, z: 19.3 },
    { t: 'dm.crates', x: 37.2, z: 19.3, n: 3 },
    { t: 'dm.barrels', x: 41.2, z: 19.3, n: 3 },
    { t: 'dm.kelp', x: 52.6, z: 19.2 },
    { t: 'dm.crates', x: 55.6, z: 19.3, n: 2 },
    { t: 'dm.crates', x: 57.8, z: 10.2, n: 2 },
    { t: 'dm.barrels', x: 57.6, z: 16.9, n: 2, crate: false },
    { t: 'dm.lantern_tree', x: 40.2, z: 13.6 },
    // rime creeping in from the Shoals hatch: one sheet over the frosted deck and the planks' edge
    { t: 'floorPlane', x: 57.0, z: 14.0, w: 6, d: 5.5, tex: 'dm_frost', emissive: 0.8 },
    { t: 'floorPlane', x: 27.8, z: 14.7, w: 1.5, d: 3.0, tex: 'dm_chalk' },
    { t: 'dm.board', x: 36.7, z: 8.3, on: 'shop' },
    // ---- Ruse's Salvage
    { t: 'dm.counter', x: 40.6, z: 4.4, w: 3.4, goods: 'salvage' },
    { t: 'dm.counter', x: 43.5, z: 4.4, w: 1.1, goods: 'parts', front: 'dm_hull_a' },
    { t: 'dm.shelf', x: 38.9, z: 2.0, w: 1.4 },
    { t: 'dm.barrels', x: 39.0, z: 5.9, n: 1, crate: true },
    { t: 'dm.lanterns', a: [38.1, 2.9, 2.2], b: [44.9, 2.9, 3.0], n: 6, sag: 0.35 },
    { t: 'floorPlane', x: 41.4, z: 5.8, w: 3.2, d: 1.4, tex: 'dm_rug' },
    // ---- the Beacon
    { t: 'dm.beacon', x: 52.5, z: 3.2 },
    { t: 'dm.ribbons', x: 48.4, z: 1.06, w: 2.8, n: 7 },
    { t: 'dm.ribbons', x: 56.2, z: 1.06, w: 2.6, n: 7 },
    { t: 'dm.pylon', x: 46.4, z: 1.4 },
    { t: 'dm.pylon', x: 58.4, z: 1.4 },
    { t: 'dm.bench', x: 48.4, z: 6.6, w: 2.0 },
    { t: 'dm.crates', x: 57.4, z: 6.4, n: 2 },
    // ---- the Lantern (inn)
    { t: 'dm.counter', x: 25.2, z: 22.7, w: 3.4, goods: 'noodles', front: 'dm_planks_a' },
    { t: 'dm.hearth', x: 31.2, z: 21.6 },
    { t: 'dm.kelp', x: 27.9, z: 21.45 },
    { t: 'dm.bunk', x: 19.6, z: 25.8 },
    { t: 'dm.bunk', x: 30.4, z: 25.8 },
    { t: 'dm.table', x: 20.8, z: 23.2 },
    { t: 'dm.table', x: 29.0, z: 23.4 },
    { t: 'floorPlane', x: 25.2, z: 25.0, w: 4.2, d: 2.0, tex: 'dm_rug' },
    { t: 'dm.lanterns', a: [18.2, 2.7, 21.3], b: [32.8, 2.7, 22.2], n: 9, sag: 0.4 },
  ],
  lights: [
    // the docks: the iris ring, the pad lights, lanterns
    { x: 7.5, y: 2.4, z: 1.3, color: '#5fd8d0', intensity: 14, distance: 8, mode: 'pulse', amount: 0.2, speed: 0.8, tag: 'dm_iris' },
    { x: 3.0, y: 0.5, z: 9.6, color: '#ffb54a', intensity: 7, distance: 4, mode: 'pulse', amount: 0.4, speed: 1.6 },
    { x: 12.0, y: 0.5, z: 9.6, color: '#ffb54a', intensity: 7, distance: 4, mode: 'pulse', amount: 0.4, speed: 1.6 },
    { x: 13.6, y: 1.6, z: 4.0, color: '#45d4ff', intensity: 9, distance: 5 },
    { x: 7.0, y: 3.4, z: 7.0, color: '#ffd2a0', intensity: 16, distance: 7.5 },
    lantern(2.2, 12.6), lantern(13.8, 12.6), lantern(8.0, 15.8, 2.6, 18, 8),
    { x: 4.5, y: 1.3, z: 19.6, color: '#7ddf7a', intensity: 6, distance: 4 },
    ribbonGlow(13.5, 1.6),
    // the viewport: Tethys light along the rail, lanterns on the pylons, ribbons
    tethys(20.5, 1.4), tethys(28.0, 1.4), tethys(34.5, 1.4),
    lantern(17.6, 1.4, 2.8, 14), lantern(23.2, 1.4, 2.8, 14), lantern(36.4, 1.4, 2.8, 14),
    ribbonGlow(24.0, 1.2), ribbonGlow(31.0, 1.2),
    // Lantern Row: stalls, strings, the scrap heap's work lamp, the hatch's cold light
    { x: 21.0, y: 1.7, z: 10.0, color: '#ffcf7a', intensity: 11, distance: 6, mode: 'flicker', amount: 0.25, speed: 6 },
    { x: 27.5, y: 1.5, z: 9.8, color: '#ff4f5e', intensity: 7, distance: 5 },
    { x: 34.0, y: 2.2, z: 10.0, color: '#ffe0a8', intensity: 12, distance: 6 },
    lantern(22.5, 14.0, 3.0, 18, 7), lantern(31.0, 14.0, 3.0, 18, 7), lantern(40.0, 14.0, 3.0, 18, 7), lantern(48.5, 14.0, 3.0, 18, 7),
    lantern(19.5, 18.8, 2.4, 12), lantern(36.5, 18.8, 2.4, 12), lantern(46.0, 18.8, 2.4, 12),
    { x: 39.5, y: 2.4, z: 8.6, color: '#ffb54a', intensity: 10, distance: 5 },
    // the Lantern Tree's crown of Tethys glass: a cold pool in the middle of the warm Row
    { x: 40.2, y: 3.4, z: 13.6, color: '#7fe8f0', intensity: 13, distance: 7 },
    { x: 57.6, y: 1.6, z: 14.0, color: '#7fd8ff', intensity: 9, distance: 6, mode: 'pulse', amount: 0.2, speed: 0.6 },
    { x: 53.0, y: 1.2, z: 17.5, color: '#7ddf7a', intensity: 7, distance: 4.5 },
    { x: 55.2, y: 1.5, z: 9.9, color: '#4fd8cf', intensity: 8, distance: 4.5 },
    { x: 36.7, y: 1.9, z: 9.0, color: '#ffb04a', intensity: 7, distance: 3.5 },
    rim(19.4, 7.5), rim(25.0, 7.6), rim(31.6, 7.5), rim(49.6, 7.6), rim(55.6, 7.8),
    { x: 30.6, y: 1.2, z: 18.6, color: '#4fd8cf', intensity: 8, distance: 4.5 },
    { x: 35.4, y: 1.2, z: 18.6, color: '#4fd8cf', intensity: 8, distance: 4.5 },
    // the rime by the hatch glows faintly cold from the floor
    { x: 56.2, y: 1.4, z: 15.0, color: '#9fe8ff', intensity: 6, distance: 4.5 },
    // the beacon: its lamp turns, its horn glows
    { x: 52.5, y: 4.6, z: 3.2, color: '#ffb54a', intensity: 26, distance: 9, mode: 'pulse', amount: 0.55, speed: 0.9, tag: 'dm_beacon' },
    tethys(48.0, 1.4), tethys(56.5, 1.4),
    ribbonGlow(55.0, 1.2),
    // Ruse's shop
    { x: 40.6, y: 2.4, z: 2.6, color: '#ffb04a', intensity: 15, distance: 6, mode: 'flicker', amount: 0.2, speed: 4 },
    { x: 43.4, y: 1.6, z: 3.0, color: '#4fd8cf', intensity: 6, distance: 4 },
    { x: 38.8, y: 1.8, z: 5.6, color: '#ff6a4a', intensity: 7, distance: 4 },
    // the inn
    { x: 31.2, y: 1.1, z: 22.2, color: '#ff8a3a', intensity: 12, distance: 6, mode: 'flicker', amount: 0.4, speed: 7 },
    { x: 25.2, y: 2.4, z: 22.4, color: '#ffc070', intensity: 14, distance: 6 },
    { x: 20.0, y: 2.0, z: 24.6, color: '#ffa24a', intensity: 9, distance: 5 },
    { x: 29.0, y: 2.0, z: 25.0, color: '#ff6a5a', intensity: 7, distance: 4.5 },
    // the inn's kelp tank: the one cold light in a warm room
    { x: 28.3, y: 1.7, z: 22.9, color: '#4fd8cf', intensity: 6, distance: 5 },
  ],
  ambient: [
    // drifting ice crystals everywhere the station opens to the ring, lantern sparks over the market
    { preset: 'snow', x: 27, y: 2.2, z: 3.5, area: [22, 3, 6], rate: 2.6 },
    { preset: 'snow', x: 52, y: 2.2, z: 3.5, area: [14, 3, 6], rate: 2.0 },
    { preset: 'snow', x: 8, y: 2.4, z: 5, area: [14, 3, 8], rate: 1.8 },
    { preset: 'snow', x: 56.5, y: 1.4, z: 14, area: [5, 2, 4], rate: 3.0 },
    { preset: 'dm_spark', x: 33, y: 2.6, z: 14, area: [30, 1.2, 6], rate: 3.2 },
    { preset: 'dm_spark', x: 8, y: 2.4, z: 16, area: [12, 1.2, 8], rate: 1.2 },
    { preset: 'dust', x: 37, y: 1.4, z: 14, area: [40, 2.4, 11], rate: 3, color: '#ffd9a8' },
    { preset: 'dust', x: 41.5, y: 1.4, z: 4, area: [6, 2.4, 5], rate: 1.6, color: '#ffd9a8' },
    { preset: 'dust', x: 25.5, y: 1.4, z: 23.5, area: [14, 2.4, 5], rate: 2, color: '#ffc898' },
    { preset: 'ember', x: 31.2, y: 0.7, z: 21.8, area: [0.6, 0.2, 0.4], rate: 2.4 },
  ],
  // Tethys fills everything beyond the viewport rail (and the void around the station is ring space)
  sky: { texture: 'bd_tethys_close', horizonV: 0.62, edge: 'north', parallax: 0.1, tint: [1.0, 1.0, 1.0] },
  view: { pitch: 34, dist: 16 },
  npcs: [
    { id: 'ruse', sprite: 'ruse', x: 40.6, z: 3.4, facing: 'down', name: 'RUSE',
      talk: [{ when: 'story:ruse_met & !story:maw_lore', script: 'driftmarket.ruse_maw' }, { script: 'driftmarket.ruse_talk' }] },
    { id: 'tobin', sprite: 'rb_elder', x: 50.2, z: 5.0, facing: 'right', name: 'TOBIN', talk: 'driftmarket.tobin' },
    { id: 'pip', sprite: 'rb_kid', x: 24.0, z: 13.0, facing: 'down', name: 'PIP', talk: 'driftmarket.pip',
      idle: { path: [[24.0, 13.0], [31.5, 12.6], [31.0, 16.6], [24.4, 16.8]], speed: 2.4, pause: [0.4, 1.4], loop: true } },
    { id: 'marta', sprite: 'rb_suit', x: 12.0, z: 7.8, facing: 'left', name: 'MARTA', talk: 'driftmarket.marta' },
    { id: 'hesper', sprite: 'rb_apron', x: 25.2, z: 21.8, facing: 'down', name: 'HESPER', talk: 'driftmarket.hesper' },
    { id: 'ama', sprite: 'rb_robe', x: 30.0, z: 9.5, facing: 'down', name: 'AMA', talk: 'driftmarket.ama' },
    { id: 'bao', sprite: 'rb_apron_b', x: 21.2, z: 7.9, facing: 'down', name: 'BAO', talk: 'driftmarket.bao' },
    { id: 'sorrel_a', sprite: 'rb_salvager', x: 32.8, z: 10.8, facing: 'right', name: 'SORREL', talk: 'driftmarket.sorrel_a',
      idle: { path: [[32.8, 10.8], [35.2, 10.9]], speed: 1.2, pause: [1.5, 3.5], loop: false } },
    { id: 'sorrel_b', sprite: 'rb_salvager_b', x: 35.8, z: 10.4, facing: 'left', name: 'SORREL', talk: 'driftmarket.sorrel_b',
      when: '!story:ch1_done', idle: { path: [[35.8, 10.4], [36.6, 11.6]], speed: 1.1, pause: [2, 4], loop: false } },
    { id: 'oona', sprite: 'rb_pilot', x: 7.6, z: 18.0, facing: 'left', name: 'OONA', talk: 'driftmarket.oona' },
    { id: 'harl', sprite: 'rb_guard', x: 16.5, z: 11.0, facing: 'left', name: 'HARL', talk: 'driftmarket.harl',
      idle: { path: [[16.5, 11.0], [16.5, 13.8]], speed: 1.0, pause: [2.5, 5], loop: false } },
    { id: 'rook', sprite: 'rb_elder_g', x: 27.6, z: 1.7, facing: 'up', name: 'ROOK', talk: 'driftmarket.rook' },
    { id: 'juno', sprite: 'rb_suit_b', x: 3.8, z: 10.6, facing: 'up', name: 'JUNO', talk: 'driftmarket.juno' },
    { id: 'ilo', sprite: 'rb_pilot_b', x: 32.6, z: 2.0, facing: 'up', name: 'ILO', talk: 'driftmarket.ilo',
      idle: { path: [[32.6, 2.0], [29.0, 6.4], [23.4, 10.6], [29.0, 6.4]], speed: 1.3, pause: [3, 7], loop: true } },
  ],
  chests: [
    { id: 'dock_suit', x: 13.8, z: 15.8, item: 'eq_a_2', n: 1 },
    { id: 'pier_cache', x: 57.6, z: 2.0, item: 'stim', n: 2, credits: 150 },
  ],
  interactables: [
    { id: 'starchart', kind: 'starchart', x: 13.6, z: 4.4 },
    { id: 'ruse_shop', kind: 'shop', shop: 'ruse', x: 43.5, z: 5.0, box: [42.9, 4.0, 44.1, 4.8], label: 'Ruse\'s stock', when: 'story:ruse_met' },
    { id: 'inn_rest', kind: 'med', label: 'Rest', restoreLabel: 'Rest', x: 25.2, z: 23.4, box: [23.5, 22.3, 26.9, 23.1],
      prompt: 'A lumpy bed, a hot bowl of soup. Rest here?' },
    { id: 'harl_post', kind: 'inspect', x: 15.0, z: 9.9, r: 0.5, leader: 'sera', label: 'Treat', talk: 'driftmarket.sera_harl', when: '!dm:harl_treated' },
    { id: 'favours', kind: 'inspect', x: 36.7, z: 8.75, box: [35.8, 8.4, 37.6, 9.0], label: 'Read', talk: 'driftmarket.favours' },
    { id: 'hatch', kind: 'inspect', x: 58.4, z: 14.0, r: 0.6, label: 'Inspect', talk: 'driftmarket.hatch_closed', when: '!story:maw_lore' },
  ],
  triggers: [
    { id: 'arrival', on: 'load', when: 'chapter>=ch1 & !story:ruse_met', once: true, script: 'driftmarket.arrival' },
    { id: 'return', on: 'load', when: 'defeated:shoals_boss_maw & !story:nyx_for_real', once: true, script: 'driftmarket.return' },
  ],
  gates: [
    { id: 'shoals_hatch', cells: [[59, 12], [59, 13], [59, 14], [59, 15]], open: 'story:maw_lore', prop: 'gate.shutter' },
  ],
  viewpoints: {
    docks: { x: 9.6, z: 9.8, facing: 'up' },
    viewport: { x: 25.6, z: 4.2, facing: 'up' },
    row: { x: 34.5, z: 14.6, facing: 'up' },
    ruse: { x: 40.5, z: 5.8, facing: 'up' },
    beacon: { x: 51.0, z: 6.4, facing: 'up' },
    gate: { x: 53.0, z: 14.0, facing: 'right' },
    inn: { x: 25.0, z: 24.4, facing: 'up' },
  },
};
