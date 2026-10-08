// dev_box (PURE MapDef, TECH_PLAN 12.5): the test map for every world system. Reachable only
// through debug hooks (debug.goto('dev_box', 'entry')); its south door leads to halcyon:start.
//
// Test Hall (west): a water channel drained by a valve, a chest, a Med-Station, a pod whose status
// follows the grid switch, a screen prop, a leader-gated lockbox (Nyx) and an NPC walking a path.
// Sky Deck (east): open to the north (the camera-anchored sky shows beyond the far edge), a laser
// gate with its switch and a linked guide strip, a pit over the underlay, a shard, a lift pair, a
// fabricator shop console and a Starchart table.
// The two rooms are joined by door exits (same-map arrivals under a fade).

const hallMood = {
  fog: '#08121d', density: 0.03, sky: '#3f6f9c', ground: '#0a0f18', hemi: 0.5,
  key: 1.2, keyColor: '#bfe6ff', fill: 0.34, exposure: 1.05, bloom: 0.95, saturation: 1.06,
};
const deckMood = {
  fog: '#05081a', density: 0.022, sky: '#3a5590', ground: '#07080f', hemi: 0.55,
  key: 2.4, fill: 0.36, exposure: 1.06, bloom: 0.95, saturation: 1.1,
};

const log = (text) => ({ speaker: null, text });

export default {
  id: 'dev_box',
  name: 'Dev Box',
  region: 'Test Deck',
  music: 'explore',
  grid: [
    //         1111111111222222222233333333334
    // 4567890123456789012345678901234567890
    '                     #.................# ', // 0
    '                     #.................# ', // 1
    '                     #.................# ', // 2
    '                     #....________.....# ', // 3
    '                     #....________.....# ', // 4
    '        ####         #....________.....# ', // 5
    '        #..#         #....________.....# ', // 6
    '#s##v####DD####s##p# #....________.....# ', // 7
    '#.................#  #.................# ', // 8
    '#.................#  #.................# ', // 9
    '#.................#  #.................# ', // 10
    '#.................#  #.................# ', // 11
    '#.................#  #hhhhhhhhhhhhhhhhh# ', // 12
    '#~~~~~~~~~~~~~~~~~#  #.................# ', // 13
    '#~~~~~~~~~~~~~~~~~#  #.................# ', // 14
    '#.................#  #.................# ', // 15
    '#.................#  #.................# ', // 16
    '#.................#  #.................# ', // 17
    '#.................#  #..............gg.# ', // 18
    '#.................#  #..............gg.# ', // 19
    '#.................#  #.................# ', // 20
    '####DD#############  ########DD######### ', // 21
    '   #..#                     #..#         ', // 22
    '   ####                     ####         ', // 23
  ],
  legend: {
    '~': { t: 'water', tex: 'water', bank: 'water_bank', path: 'water_path', depth: 0.35, drain: 'sw:dev_box:valve' },
    _: { t: 'pit', edge: 'wall_low', thickness: 0.6 },
  },
  // the south walls are cutaway walls with doors: dividers raise them only while the leader is south
  dividers: [
    { id: 'hall_south', row: 21, rect: [0, 21, 18, 23] },
    { id: 'deck_south', row: 21, rect: [21, 21, 39, 23] },
  ],
  areas: [
    { id: 'hall', name: 'Test Hall', subtitle: 'Dev Box · Water and Locks', rect: [1, 8, 18, 21], cam: [10.4, 17.8], zone: null, mood: hallMood },
    { id: 'deck', name: 'Sky Deck', subtitle: 'Dev Box · Gates, Pits and Lifts', rect: [22, 0, 39, 21], cam: [2.4, 17.8], zone: null, mood: deckMood },
  ],
  spawns: {
    entry: { x: 9.5, z: 17.5, facing: 'up' },
    from_halcyon: { x: 4.95, z: 20.2, facing: 'up' },
    hall_door: { x: 10.0, z: 8.9, facing: 'down' },
    deck_door: { x: 30.0, z: 19.9, facing: 'up' },
    deck_north: { x: 30.5, z: 1.4, facing: 'up' },
    lift_bottom: { x: 36.5, z: 18.9, facing: 'down' },
    lift_top: { x: 36.5, z: 10.1, facing: 'down' },
  },
  anchors: {
    hall_center: { x: 9.5, z: 10.5, facing: 'down' },
    deck_center: { x: 30.5, z: 15.5, facing: 'up' },
  },
  exits: [
    { id: 'to_deck', rect: [9, 6, 11, 6.9], to: { map: 'dev_box', spawn: 'deck_door' }, transition: 'fade' },
    { id: 'to_hall', rect: [29, 22.1, 31, 23], to: { map: 'dev_box', spawn: 'hall_door' }, transition: 'fade' },
    { id: 'to_halcyon', rect: [4, 22.1, 6, 23], to: { map: 'halcyon', spawn: 'start' }, transition: 'fade' },
  ],
  props: [
    // Test Hall
    { t: 'pod', id: 'dev_pod', x: 1.5, z: 8.36, status: 'sw:dev_box:grid', delay: 0.2 },
    { t: 'screen', id: 'hall_screen', x: 5.5, z: 8.02, y: 1.75, w: 1.6, h: 1.0, tex: 'screen_status', group: 'dev' },
    { t: 'lamp', x: 3.5, y: 2.5, z: 8.02, cool: true },
    { t: 'lamp', x: 15.0, y: 2.5, z: 8.02 },
    { t: 'sign', name: 'sign_cryo', x: 8.0, z: 8.0 },
    { t: 'crate', x: 16.6, z: 20.2, s: 0.9, rot: 0.1 },
    { t: 'crate', x: 16.6, z: 20.2, y: 0.9, s: 0.6, rot: -0.2 },
    { t: 'vent', x: 2.5, z: 19.5 },
    { t: 'decal', name: 'decal_grime', x: 6.4, z: 16.4, rot: 1 },
    { t: 'decal', name: 'decal_arrow', x: 9.5, z: 11.0, rot: 0 },
    // Sky Deck
    { t: 'guide', id: 'grid_guide', from: [24.2, 15.2], to: [30.5, 13.1], color: '#ff5a5a', link: 'grid_switch' },
    { t: 'floorPlane', x: 36.5, z: 18.9, w: 1.8, d: 1.8, tex: 'hard_light', emissive: 0.45 },
    { t: 'floorPlane', x: 36.5, z: 10.1, w: 1.8, d: 1.8, tex: 'hard_light', emissive: 0.45 },
    { t: 'console', x: 24.0, z: 0.4 },
    { t: 'console', x: 37.0, z: 0.4 },
    { t: 'crate', x: 37.9, z: 15.6, s: 0.85, rot: 0.15 },
    { t: 'decal', name: 'decal_scorch', x: 33.0, z: 16.5, rot: 2 },
    { t: 'decal', name: 'decal_arrow', x: 30.0, z: 17.0, rot: 0 },
  ],
  lights: [
    { x: 3.5, y: 2.15, z: 8.9, color: '#c6ecff', intensity: 13, distance: 8 },
    { x: 15.0, y: 2.15, z: 8.9, color: '#ffb04a', intensity: 14, distance: 8 },
    { x: 9.0, y: 1.0, z: 14.0, color: '#3fd6ff', intensity: 12, distance: 8, tag: 'water', when: '!sw:dev_box:valve' },
    { x: 9.0, y: 2.4, z: 18.5, color: '#9fc4ff', intensity: 10, distance: 9 },
    { x: 4.0, y: 2.2, z: 19.8, color: '#ffc48a', intensity: 9, distance: 6 },
    { x: 12.6, y: 1.8, z: 9.1, color: '#5dff9c', intensity: 6, distance: 4.5, mode: 'pulse', amount: 0.3, speed: 2.4 },
    { x: 30.5, y: 1.2, z: 12.6, color: '#ff3b4e', intensity: 14, distance: 9, mode: 'pulse', amount: 0.3, speed: 3, when: '!sw:dev_box:grid' },
    { x: 30.5, y: 1.2, z: 12.6, color: '#4dff9c', intensity: 8, distance: 7, when: 'sw:dev_box:grid' },
    { x: 29.5, y: -1.5, z: 5.5, color: '#7a5cff', intensity: 18, distance: 10 },
    { x: 36.5, y: 0.6, z: 18.9, color: '#6fe9ff', intensity: 5, distance: 4, mode: 'pulse', amount: 0.25, speed: 1.8 },
    { x: 36.5, y: 0.6, z: 10.1, color: '#6fe9ff', intensity: 5, distance: 4, mode: 'pulse', amount: 0.25, speed: 1.8 },
    { x: 26.0, y: 2.6, z: 17.5, color: '#ffa64a', intensity: 14, distance: 8 },
    { x: 33.5, y: 2.6, z: 2.0, color: '#8fb8ff', intensity: 12, distance: 9 },
  ],
  ambient: [
    { preset: 'dust', x: 9.5, y: 1.4, z: 14.5, area: [16, 2.6, 12], rate: 3, color: '#d8efff' },
    { preset: 'frost', x: 9.5, y: 0.5, z: 14.0, area: [16, 0.6, 2], rate: 4, when: '!sw:dev_box:valve' },
    { preset: 'dust', x: 30.5, y: 1.6, z: 10.5, area: [16, 3, 20], rate: 4, color: '#9fb8e8' },
    { preset: 'holo', x: 29.5, y: 0.2, z: 5.5, area: [7, 0.4, 4], rate: 6 },
  ],
  sky: { texture: 'space_backdrop', stars: 'stars_layer', horizonV: 0.6, edge: 'north', parallax: 0.12, tint: [1, 1, 1.05] },
  underlay: { texture: 'stars_layer', y: -5, repeat: [8, 8], scroll: [0.002, 0], color: '#6d7dff' },
  npcs: [
    {
      id: 'tester', sprite: 'sera', x: 4.0, z: 18.6, facing: 'right', name: 'TESTER', talk: 'dev.npc_talk',
      idle: { path: [[4.0, 18.6], [14.5, 18.6]], speed: 1.4, pause: [1, 2], loop: false },
    },
  ],
  chests: [
    { id: 'hall_chest', x: 16.2, z: 10.0, item: 'medigel', n: 2 },
  ],
  interactables: [
    {
      id: 'med', kind: 'med', x: 12.6, z: 8.65, box: [12.08, 8.01, 13.12, 8.67], prop: 'med', propFields: { x: 12.6, z: 8.34 },
      prompt: 'Restore the squad and log a checkpoint?',
    },
    { id: 'valve', kind: 'switch', x: 3.0, z: 15.6, flag: 'sw:dev_box:valve', mode: 'toggle', prop: 'switch.valve', label: 'Turn', sfx: 'valve' },
    {
      id: 'lockbox', kind: 'inspect', x: 1.9, z: 11.6, leader: 'nyx', label: 'Inspect', prop: 'crate', propFields: { x: 1.9, z: 11.3, s: 0.7 },
      talk: [log('A Ringborn lockbox. Nyx clicks it open: *nothing inside but a note*.')],
    },
    { id: 'grid_switch', kind: 'switch', x: 24.2, z: 15.6, flag: 'sw:dev_box:grid', mode: 'toggle', prop: 'switch.panel', reveal: 'grid', sfx: 'laser_off' },
    { id: 'crystal', kind: 'shard', x: 36.0, z: 4.5, flag: 'shard:dev_box:crystal', script: 'dev.shard' },
    { id: 'lift_up', kind: 'lift', x: 36.5, z: 18.9, r: 0.5, reach: 0.9, to: 'lift_top', label: 'Ride up' },
    { id: 'lift_down', kind: 'lift', x: 36.5, z: 10.1, r: 0.5, reach: 0.9, to: 'lift_bottom', label: 'Ride down' },
    // G1: the shop and Starchart interactable kinds, opened from the field (ExploreState -> cs.shop / cs.travel)
    { id: 'fabricator', kind: 'shop', x: 24.0, z: 1.1, box: [23.4, 0.3, 24.6, 1.1], shop: 'fabricator', label: 'Fabricator' },
    { id: 'starchart', kind: 'starchart', x: 26.5, z: 9.5 },
  ],
  gates: [
    { id: 'grid', rect: [22, 12, 38, 12], open: 'sw:dev_box:grid', prop: 'gate.laser' },
  ],
  viewpoints: {
    water: { x: 9.5, z: 17.2, facing: 'up' },
    hall: { x: 9.5, z: 11.0, facing: 'down' },
    npc: { x: 9.0, z: 16.4, facing: 'down' },
    gate: { x: 28.5, z: 15.8, facing: 'up' },
    pit: { x: 30.0, z: 9.8, facing: 'up' },
    sky: { x: 30.5, z: 2.4, facing: 'up' },
    lift: { x: 36.5, z: 18.9, facing: 'down' },
    chart: { x: 26.5, z: 11.0, facing: 'up' },
  },
};
