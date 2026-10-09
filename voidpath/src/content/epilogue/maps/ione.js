// ione (PURE MapDef, TECH_PLAN 12.5): Ione's first shore at dawn, where the game ends and the
// post-game begins. An ice shelf running down to an open lead of dark water; beyond it, over the
// rim of the far ice, Tethys rising huge with its rings across the sky (`bd_ione_dawn`, horizon on
// the north edge). Dawn pink and pale blue ice, warm sunrise rims, thin cold mist, snow.
//
//   the shore      (x 14-30, z 6-12)  where the four travelers and BOLT stand at the end, facing the
//                                      water; after the clear they stay there to talk (ep_kade, ...)
//   the Moth berth (x 2-12, z 9-17)   Ringborn landing plates, the Moth, the Starchart, the berth
//                                      beacon (Orion's leader-gated `ep.beacon`)
//   the seed camp  (x 32-42, z 9-18)  the Ringborn seeding holes, green under the ice: "First seeds
//                                      in the ice. Ship seeds. They took."
//   the ridges     (south)             pressure ridges of tumbled ice blocks
//
// Binding (12.5): spawn `shore`; interactable `starchart`; the travelers' post-game NPCs stand on the
// final shot's gather slots (SLOTS, used by epilogue.main) so the swap after the credits is seamless.

const MOOD = {
  fog: '#d8b4c4', density: 0.009, sky: '#ffd4c8', ground: '#465676', hemi: 0.62,
  key: 1.3, keyColor: '#ffc29e', fill: 0.55, exposure: 1.0, bloom: 0.95, saturation: 1.06,
};

// where the travelers, BOLT and Theo stand at the water's edge (the final shot, then the post-game)
export const SLOTS = {
  sera: [19.6, 7.6], kade: [21.2, 7.2], nyx: [22.8, 7.3], orion: [24.4, 7.7], bolt: [25.9, 8.1], theo: [17.4, 9.4],
};

// '~' the open lead, ':' glare ice at its edge, '.' shelf ice, 'b' deep ice, ',' snow, ';' carved snow,
// '=' landing plates, '#' ice cliffs (the shelf's west and east walls, a snowbank to the south)
const GRID = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 0
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', // 1
  '~~~~~~~~~::~~~~~~~~~~~~~~~~~~~~~~~~~::~~~~~~', // 2
  '#~~~~~~~:..:~~~~~~~~~~~~~~~~~~~~~~~:..:~~~~#', // 3
  '#~~~~~~~~::~~~~~~~~~~~~~~~~~~~~~~~~~::~~~~~#', // 4
  '##~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~##', // 5
  '##::~~~~~~~::::~~~~~~~~~~~~~~~~~~~~:::~~~:##', // 6
  '#,,:::::::::..:::::::::::::::::::::..::::,,#', // 7
  '#,,,..b.....,....::::::::::::::.....b...,,;#', // 8
  '#;,,....b.......,,..........,,.....b....,,;#', // 9
  '#;,,=======..b........b.........,.......,;;#', // 10
  '#;,,=======.......,,......b.........b...,;;#', // 11
  '#;,,=======....b......,,,.......b.......,;;#', // 12
  '#;,,=======.......b........,,,.....b....,;;#', // 13
  '#;,,=======..,,...........b.....,,.......,;#', // 14
  '#;;,=======....,,,...b........b.....,,..,,;#', // 15
  '#;;,,,,,,,,..b.......,,,.........b......,,;#', // 16
  '#;;;,,,.....,,..b.....,,,,....b.....,,,,,;;#', // 17
  '#;;;;,,,....,,,.....b.....,,,.......,,,,;;;#', // 18
  '#;;;;;,,,,....,,,..........,,,,.....,,,;;;;#', // 19
  '#;;;;;;,,,,,,..,,,,,....,,,,,,,,,,,,,,;;;;;#', // 20
  '#;;;;;;;,,,,,,,,,,,,,,,,,,,,,,,,,,,,;;;;;;;#', // 21
  '#;;;;;;;;;,,,,,,,,,,,,,,,,,,,,,,,,;;;;;;;;;#', // 22
  '#;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;#', // 23
  '#;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;#', // 24
  '############################################', // 25
];

const [K, N, O, S, T] = [SLOTS.kade, SLOTS.nyx, SLOTS.orion, SLOTS.sera, SLOTS.theo];

export default {
  id: 'ione',
  name: 'Ione',
  region: 'Moon of Tethys · First Shore',
  music: 'ione',
  grid: GRID,
  legend: {
    '~': { t: 'water', tex: 'ep_sea', bank: 'ep_ice_bank', bed: 'ep_seabed', depth: 0.5 },
    ':': { t: 'floor', tex: 'ep_glare', rot: 'random', roughness: 0.12, metalness: 0.2, emissive: 1.2 },
    '.': { t: 'floor', tex: 'ep_ice', mix: [['ep_ice_b', 0.22]], rot: 'random', roughness: 0.22, metalness: 0.15, emissive: 1.2 },
    b: { t: 'floor', tex: 'ep_ice_b', rot: 'random', roughness: 0.2, metalness: 0.15, emissive: 1.2 },
    ',': { t: 'floor', tex: 'ep_snow', mix: [['ep_snow_b', 0.3]], rot: 'random', roughness: 0.9, metalness: 0, emissive: 1.2 },
    ';': { t: 'floor', tex: 'ep_snow_b', mix: [['ep_snow', 0.3]], rot: 'random', roughness: 0.9, metalness: 0, emissive: 1.2 },
    '=': { t: 'floor', tex: 'ep_pad', roughness: 0.6, metalness: 0.5, emissive: 1.4 },
    '#': { t: 'wall', tex: 'ep_cliff', side: 'ep_cliff', cap: 'ep_cliff_cap', low: 'ep_cliff_low', roughness: 0.3, metalness: 0.1 },
  },
  wallH: 2.4,
  lowH: 0.6,
  wallTex: { side: 'ep_cliff', cap: 'ep_cliff_cap', low: 'ep_cliff_low' },
  mood: MOOD,
  sky: { texture: 'bd_ione_dawn', horizonV: 0.6, edge: 'north', parallax: 0.1 },
  view: { pitch: 28, dist: 16.5 },
  areas: [
    { id: 'shore', name: 'First Shore', subtitle: 'Ione', rect: [0, 0, 44, 26], cam: [8.2, 15.5], zone: null, mood: MOOD },
  ],
  spawns: {
    shore: { x: 21.8, z: 10.6, facing: 'up' },
    berth: { x: 9.0, z: 12.6, facing: 'down' },
  },
  anchors: {
    shore: { x: 22.0, z: 7.4, facing: 'up' },
    berth: { x: 7.2, z: 13.4, facing: 'up' },
  },
  props: [
    // the Moth on her plates, the berth beacon (a Ringborn horn brought down from Driftmarket)
    { t: 'pro.moth', x: 7.2, z: 13.8, rot: -0.3 },
    { t: 'dm.beacon', x: 2.8, z: 8.8 },
    { t: 'dm.post', x: 11.6, z: 10.2 },
    { t: 'dm.barrels', x: 4.4, z: 16.6, n: 3, seed: 5 },
    // the seed camp: two holes in the ice, the kelp coming up green beneath, lanterns, ribbons, crates
    { t: 'ep.hole', x: 35.6, z: 11.4 },
    { t: 'ep.hole', x: 39.0, z: 14.8, r: 0.75 },
    { t: 'floorPlane', x: 34.4, z: 13.4, w: 3.0, d: 3.0, tex: 'ep_seed', emissive: 1.6 },
    { t: 'floorPlane', x: 37.6, z: 10.0, w: 2.4, d: 2.4, tex: 'ep_seed', emissive: 1.6, rot: 1.3 },
    { t: 'floorPlane', x: 40.4, z: 16.6, w: 2.6, d: 2.6, tex: 'ep_seed', emissive: 1.6, rot: 2.4 },
    { t: 'floorPlane', x: 31.2, z: 16.0, w: 2.0, d: 2.0, tex: 'ep_seed', emissive: 1.4, rot: 0.6 },
    { t: 'dm.post', x: 33.0, z: 9.4 },
    { t: 'dm.post', x: 41.0, z: 12.0 },
    { t: 'dm.kelp', x: 41.2, z: 17.6 },
    { t: 'dm.crates', x: 36.6, z: 17.8, n: 3, seed: 9 },
    { t: 'dm.ribbons', x: 37.0, z: 9.0, w: 2.6, n: 7, seed: 4 },
    // pressure ridges and loose blocks
    { t: 'ep.ridge', x: 14.4, z: 17.6, w: 3.4, d: 1.3, n: 7, seed: 11 },
    { t: 'ep.ridge', x: 28.8, z: 19.0, w: 3.0, d: 1.2, n: 6, seed: 13 },
    { t: 'ep.ridge', x: 8.4, z: 21.0, w: 3.6, d: 1.4, n: 8, seed: 17 },
    { t: 'ep.ridge', x: 21.0, z: 22.4, w: 4.0, d: 1.2, n: 8, seed: 19 },
    { t: 'ep.ridge', x: 37.4, z: 21.6, w: 3.2, d: 1.3, n: 7, seed: 23 },
    { t: 'ep.ridge', x: 29.6, z: 8.6, w: 1.4, d: 0.8, n: 3, seed: 29 },
    { t: 'ep.ridge', x: 13.4, z: 8.4, w: 1.2, d: 0.8, n: 3, seed: 31 },
  ],
  lights: [
    // the dawn along the water: rose rims on the ice
    { x: 15.0, y: 1.6, z: 6.2, color: '#ffa8b8', intensity: 7, distance: 9 },
    { x: 29.0, y: 1.6, z: 6.2, color: '#ffa8b8', intensity: 7, distance: 9 },
    { x: 22.0, y: 2.6, z: 8.0, color: '#ffd2b0', intensity: 6, distance: 8 },
    // the berth: the beacon's amber, the Starchart's cyan, the Moth's cockpit
    { x: 2.8, y: 4.4, z: 8.6, color: '#ffb54a', intensity: 9, distance: 8, mode: 'pulse', amount: 0.25, speed: 0.9, tag: 'ep_beacon' },
    { x: 10.6, y: 1.4, z: 12.6, color: '#5cd8ff', intensity: 8, distance: 6 },
    { x: 6.0, y: 1.6, z: 13.8, color: '#7fe8d0', intensity: 5, distance: 5 },
    // the seed camp: lantern amber over the green of the holes
    { x: 35.6, y: 0.8, z: 11.4, color: '#5cffb0', intensity: 8, distance: 6, mode: 'pulse', amount: 0.2, speed: 0.6 },
    { x: 39.0, y: 0.8, z: 14.8, color: '#5cffb0', intensity: 7, distance: 5, mode: 'pulse', amount: 0.2, speed: 0.5 },
    { x: 33.0, y: 2.4, z: 9.4, color: '#ffb850', intensity: 7, distance: 6 },
    { x: 41.0, y: 2.4, z: 12.0, color: '#ffb850', intensity: 7, distance: 6 },
    // the cold blue the snow keeps to the south
    { x: 22.0, y: 3.0, z: 18.0, color: '#a8c4ff', intensity: 6, distance: 12, decorative: true },
  ],
  ambient: [
    { preset: 'snow', x: 22, y: 4.0, z: 12, area: [44, 2, 24], rate: 6 },
    { preset: 'mote', x: 22, y: 0.6, z: 5.6, area: [40, 0.6, 2.4], rate: 3, color: '#ffe0e8' },
    { preset: 'spore', x: 36, y: 0.3, z: 13, area: [8, 0.3, 7], rate: 1.2 },
  ],
  interactables: [
    { id: 'starchart', kind: 'starchart', x: 10.6, z: 12.6 },
    {
      id: 'ep.beacon', kind: 'inspect', x: 2.8, z: 10.1, r: 0.7, reach: 1.3, leader: 'orion', label: 'Listen', icon: 'inspect',
      talk: 'epilogue.orion_beacon', leaderHint: 'The berth beacon hums one cold note. *Orion* could talk it round.',
    },
  ],
  // after the clear the travelers stay on the shore (the leader is the player), with BOLT (the
  // companion) and Theo, drawing the view
  npcs: [
    { id: 'ep_kade', sprite: 'kade', x: K[0], z: K[1], facing: 'up', name: 'KADE', talk: 'epilogue.shore_kade', when: 'story:game_clear & !leader:kade' },
    { id: 'ep_nyx', sprite: 'nyx', x: N[0], z: N[1], facing: 'up', name: 'NYX', talk: 'epilogue.shore_nyx', when: 'story:game_clear & !leader:nyx' },
    { id: 'ep_orion', sprite: 'orion', x: O[0], z: O[1], facing: 'up', name: 'ORION', talk: 'epilogue.shore_orion', when: 'story:game_clear & !leader:orion' },
    { id: 'ep_sera', sprite: 'sera', x: S[0], z: S[1], facing: 'up', name: 'SERA', talk: 'epilogue.shore_sera', when: 'story:game_clear & !leader:sera' },
    { id: 'ep_theo', sprite: 'theo', x: T[0], z: T[1], facing: 'up', name: 'THEO', talk: 'epilogue.shore_theo', when: 'story:game_clear' },
  ],
  // BOLT (the companion) has his shore line after the clear
  talk: {
    bolt: [{ when: 'story:game_clear', script: 'epilogue.shore_bolt' }],
  },
  viewpoints: {
    shore: { x: 21.8, z: 10.4, facing: 'up' },
    berth: { x: 8.6, z: 15.6, facing: 'up' },
    camp: { x: 36.0, z: 13.8, facing: 'up' },
    ridges: { x: 22.0, z: 19.6, facing: 'up' },
  },
};
