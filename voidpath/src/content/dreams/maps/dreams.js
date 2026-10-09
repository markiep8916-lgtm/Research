// dreams (PURE MapDef, TECH_PLAN 12.5): WARDEN's four dreams, one small set each, side by side on one
// staged-scene map (`scene: true`: no triggers, encounters, saves or companions). Every set is a
// place the traveler knows, made perfect and lit by a gold hour that never ends (12.1: saturated
// gold-hour light, over-bright bloom, soft vignette, low contrast). Each has its own palette and its
// own WARDEN surface (`screen` props the speaker mood turns to the gold sigil, WRITING 1.7).
//
//   kade   (x 0-17)   the Spire's Training Hall in gold: ivory and honey stone, gold banners, tall
//                     windows on a sunset that never ends, five cadets in perfect lines, Voss alive at
//                     the head of the aisle. WARDEN's surfaces: the three banners.
//   nyx    (x 18-35)  the Meridian whole and flying: jade deck, teal walls, gardens in every corner,
//                     lanterns strung over the helm, a long viewport of streaming stars, Ines at the
//                     helm with Tomas at the pilot's seat. WARDEN's surfaces: the helm screens.
//   orion  (x 36-53)  the Halcyon's Observation Bridge without a scratch: pearl and pale gold, every
//                     console showing the same green line, HALCYON solid and still before the glass.
//                     WARDEN's surfaces: the bridge screens.
//   sera   (x 54-71)  golden fields in an always-morning: wheat to the horizon, a river, a house with a
//                     white fence, a tree, Theo grown at the gate. WARDEN's surface: the sun.
//
// Binding (12.5): spawns kade, nyx, orion, sera. Map NPC ids never use member ids (dr_*).

// ---------------------------------------------------------------- moods (each its own gold hour)

const MOOD = {
  kade: {
    fog: '#5a3814', density: 0.016, sky: '#ffd890', ground: '#3a2210', hemi: 0.62,
    key: 1.25, keyColor: '#ffcf80', fill: 0.62, exposure: 1.02, bloom: 1.15, saturation: 1.1,
  },
  nyx: {
    fog: '#0e2a24', density: 0.016, sky: '#b8f0d0', ground: '#0c2018', hemi: 0.6,
    key: 1.15, keyColor: '#ffe6b0', fill: 0.6, exposure: 1.04, bloom: 1.1, saturation: 1.08,
  },
  orion: {
    fog: '#3a3a40', density: 0.014, sky: '#f4f0e8', ground: '#2a2a30', hemi: 0.66,
    key: 1.15, keyColor: '#fff0d4', fill: 0.6, exposure: 1.0, bloom: 1.05, saturation: 0.9,
  },
  sera: {
    fog: '#8a6030', density: 0.01, sky: '#ffe2b8', ground: '#4a3214', hemi: 0.72,
    key: 1.45, keyColor: '#ffd49a', fill: 0.58, exposure: 1.02, bloom: 1.15, saturation: 1.12,
  },
};

// ---------------------------------------------------------------- virtual lights

const gold = (x, z, intensity = 9, distance = 7.5, y = 2.4) => ({ x, y, z, color: '#ffc864', intensity, distance });
const pool = (x, z, color, intensity = 8, distance = 6.5, y = 2.2) => ({ x, y, z, color, intensity, distance });

// ---------------------------------------------------------------- kade: the Training Hall in gold

const K = 0;
const kadeProps = [
  // the gold crest inlaid at the head of the aisle, the dais Voss stands on
  { t: 'floorPlane', x: K + 8.5, z: 4.6, w: 3.2, d: 3.2, tex: 'dr_crest', emissive: 1.4 },
  { t: 'box', x: K + 8.5, z: 3.4, w: 4.2, d: 1.6, h: 0.22, emissive: 1.6, solid: false, tex: { front: 'dr_hall_low', side: 'dr_hall_low', top: 'dr_hall_cap' } },
  // WARDEN's surfaces: three banners between the windows (gold crest; the sigil while it speaks)
  ...[4.0, 8.5, 13.0].map((x) => ({ t: 'screen', group: 'kade', tex: 'dr_banner', x: K + x, y: 1.25, z: 1.98, w: 1.1, h: 2.2, intensity: 1.25 })),
  ...[4.0, 8.5, 13.0].map((x) => ({ t: 'box', x: K + x, z: 2.06, w: 1.4, d: 0.08, h: 0.08, y: 3.48, emissive: 1.8, solid: false, tex: 'dr_gold' })),
  // training things kept perfect along the walls
  { t: 'sp.climb', x: K + 2.6, z: 2.05, w: 2.6 },
  { t: 'sp.dummy', x: K + 14.4, z: 5.4 },
  { t: 'sp.dummy', x: K + 14.4, z: 7.6 },
  { t: 'sp.bench', x: K + 2.4, z: 9.6, w: 2.2 },
  // gold light falling through the tall windows
  // the cadets' lines: polished marks where each one stands
  ...[5.0, 6.6, 8.2].flatMap((z) => [6.0, 11.0].map((x) => ({ t: 'floorPlane', x: K + x, z, w: 0.8, d: 0.8, tex: 'dr_mark', emissive: 1.2 }))),
  { t: 'dr.urn', x: K + 1.4, z: 12.2 },
  { t: 'dr.urn', x: K + 15.6, z: 12.2 },
];
const kadeLights = [
  gold(K + 4.0, 3.6, 10, 8), gold(K + 13.0, 3.6, 10, 8),
  { ...pool(K + 8.5, 4.4, '#ffd27a', 9, 6.5, 2.8), tag: 'dream_gold' },
  pool(K + 3.0, 9.6, '#ffb24a', 10, 7), pool(K + 14.0, 9.6, '#ffb24a', 10, 7),
  pool(K + 8.5, 11.0, '#ff9a5a', 10, 6.5),
];
const kadeNpcs = [
  { id: 'dr_voss', sprite: 'voss', x: K + 8.5, z: 3.5, facing: 'down', name: 'VOSS' },
  // five cadets and Kade's own place in the line, empty: perfect lines facing the aisle
  { id: 'dr_cadet_a', sprite: 'cadet_mika', x: K + 6.0, z: 5.0, facing: 'right', name: 'CADET' },
  { id: 'dr_cadet_b', sprite: 'cadet_jonah', x: K + 6.0, z: 6.6, facing: 'right', name: 'CADET' },
  { id: 'dr_cadet_c', sprite: 'cadet_priya', x: K + 6.0, z: 8.2, facing: 'right', name: 'CADET' },
  { id: 'dr_cadet_d', sprite: 'cadet_lars', x: K + 11.0, z: 5.0, facing: 'left', name: 'CADET' },
  { id: 'dr_cadet_e', sprite: 'cadet_wen', x: K + 11.0, z: 6.6, facing: 'left', name: 'CADET' },
];

// ---------------------------------------------------------------- nyx: the Meridian, whole and flying

const N = 18;
const nyxProps = [
  // the helm: Ines's console at the head of the deck, its screens WARDEN's surfaces
  { t: 'box', x: N + 8.5, z: 3.2, w: 5.4, d: 2.0, h: 0.2, emissive: 1.6, solid: false, tex: { front: 'dr_mer_low', side: 'dr_mer_low', top: 'dr_mer_cap' } },
  ...[7.4, 9.6].map((x) => ({ t: 'console', x: N + x, z: 2.6 })),
  ...[7.4, 9.6].map((x) => ({ t: 'screen', group: 'nyx', tex: 'dr_mer_screen', x: N + x, y: 1.05, z: 2.12, w: 1.0, h: 0.5, intensity: 1.5 })),
  { t: 'chair', x: N + 12.6, z: 3.4 },
  // gardens in every corner: the ship kept green for the long flight
  ...[2.2, 14.8].map((x) => ({ t: 'box', x: N + x, z: 3.0, w: 2.4, d: 1.4, h: 0.5, emissive: 1.4, tex: { front: 'dr_mer_low', side: 'dr_mer_low', top: 'arb_soil' } })),
  { t: 'arb.tree', x: N + 2.0, z: 3.2, s: 0.85 },
  { t: 'arb.tree', x: N + 15.0, z: 3.2, s: 0.8 },
  { t: 'arb.fern', x: N + 1.6, z: 7.0, s: 1.1 },
  { t: 'arb.fern', x: N + 1.8, z: 9.6, s: 0.9, kind: 'b' },
  { t: 'arb.fern', x: N + 15.4, z: 7.4, s: 1.0, kind: 'leaf' },
  { t: 'arb.bloom', x: N + 15.2, z: 9.8, s: 0.9 },
  { t: 'arb.bloom', x: N + 3.4, z: 3.6, s: 0.7, hue: 'violet' },
  { t: 'arb.bloom', x: N + 13.8, z: 3.5, s: 0.7 },
  // festival lanterns strung across the deck (the Ringborn learned them here)
  { t: 'dm.lanterns', a: [N + 1.5, 2.7, 4.6], b: [N + 15.5, 2.7, 4.6], n: 11, sag: 0.45, phase: 0.3 },
  { t: 'dm.lanterns', a: [N + 1.5, 2.6, 8.6], b: [N + 15.5, 2.6, 8.6], n: 11, sag: 0.5, phase: 1.7 },
  // a deck runner down the middle, and the wall where the ribbons will never be tied
  { t: 'floorPlane', x: N + 8.5, z: 8.0, w: 2.0, d: 7.4, tex: 'dr_runner', emissive: 1.2 },
  { t: 'sign', name: 'dr_mer_plaque', x: N + 8.5, z: 2.0 },
];
const nyxLights = [
  { ...pool(N + 8.5, 3.6, '#ffd27a', 9, 7, 2.6), tag: 'dream_gold' },
  pool(N + 3.0, 5.0, '#9fffc0', 10, 7), pool(N + 14.0, 5.0, '#9fffc0', 10, 7),
  pool(N + 5.0, 9.4, '#ffc87a', 10, 7), pool(N + 12.0, 9.4, '#ffc87a', 10, 7),
  pool(N + 8.5, 1.6, '#8fd8ff', 10, 6, 1.6),
];
const nyxNpcs = [
  { id: 'dr_varo', sprite: 'varo', x: N + 8.5, z: 3.9, facing: 'down', name: 'VARO' },
  { id: 'dr_tomas', sprite: 'dr_tomas', x: N + 12.6, z: 4.4, facing: 'left', name: 'TOMAS' },
  { id: 'dr_crew_a', sprite: 'dr_mer_crew', x: N + 3.6, z: 6.6, facing: 'right', name: 'CREW' },
  { id: 'dr_child', sprite: 'dr_mer_child', x: N + 14.0, z: 7.0, facing: 'left', name: 'CHILD' },
];

// ---------------------------------------------------------------- orion: the bridge without a scratch

const O = 36;
const orionProps = [
  // consoles in perfect symmetry, every screen the same calm line (WARDEN's surfaces)
  ...[3.4, 13.6].flatMap((x) => [
    { t: 'console', x: O + x, z: 2.6 },
    { t: 'screen', group: 'orion', tex: 'dr_screen_ok', x: O + x, y: 1.05, z: 2.12, w: 1.0, h: 0.5, intensity: 1.4 },
  ]),
  ...[1.8, 15.2].map((x) => ({ t: 'screen', group: 'orion', tex: 'dr_screen_ok', x: O + x, y: 1.3, z: 2.03, w: 0.9, h: 0.5, intensity: 1.4 })),
  { t: 'box', x: O + 8.5, z: 4.4, w: 3.0, d: 3.0, h: 0.16, emissive: 1.6, solid: false, tex: { front: 'dr_pearl_low', side: 'dr_pearl_low', top: 'dr_pearl_cap' } },
  { t: 'dr.halo', x: O + 8.5, z: 4.4, r: 1.35 },
  { t: 'chair', x: O + 5.2, z: 8.4 },
  { t: 'chair', x: O + 11.8, z: 8.4 },
  { t: 'floorPlane', x: O + 8.5, z: 8.4, w: 1.6, d: 6.0, tex: 'dr_runner_pearl', emissive: 1.4 },
  ...[2.0, 15.0].map((x) => ({ t: 'cylinder', x: O + x, z: 10.6, r: 0.34, h: 3.0, tex: 'dr_pearl_cap', emissive: 1.6 })),
];
const orionLights = [
  pool(O + 8.5, 4.4, '#e8fbff', 10, 6.5, 2.8),
  { ...pool(O + 8.5, 6.4, '#ffd27a', 9, 6.5, 2.6), tag: 'dream_gold' },
  pool(O + 3.4, 3.6, '#7fffd0', 10, 6), pool(O + 13.6, 3.6, '#7fffd0', 10, 6),
  pool(O + 4.0, 9.6, '#ffe2b0', 10, 7), pool(O + 13.0, 9.6, '#ffe2b0', 10, 7),
];
const orionNpcs = [
  // HALCYON as WARDEN offers her: solid, still, not a flicker of light out of place
  { id: 'dr_halcyon', sprite: 'holo', hologram: false, projector: false, x: O + 8.5, z: 4.6, facing: 'down', name: 'HALCYON' },
];

// ---------------------------------------------------------------- sera: golden fields, always morning

const S = 54;
const seraProps = [
  // the sky painted to the horizon behind everything, and the low morning sun
  { t: 'plane', x: S + 9.0, z: 0.3, y: -0.4, w: 26, h: 10, tex: 'dr_bd_fields', emissive: 0.85 },
  { t: 'dr.sun', x: S + 3.5, y: 4.8, z: 0.6, size: 2.2 },
  // the house by the river, its fence and gate, the tree
  { t: 'dr.house', x: S + 9.0, z: 3.4 },
  // the house's two lit windows (WARDEN's surfaces: the sigil looks out of them while it speaks)
  ...[-1.45, 1.45].map((dx) => ({ t: 'screen', group: 'sera', tex: 'dr_house_win', x: S + 9.0 + dx, y: 0.85, z: 4.82, w: 0.8, h: 0.8, intensity: 1.4 })),
  { t: 'dr.fence', x0: S + 5.4, x1: S + 12.8, z: 6.6, gap: [S + 8.4, S + 9.6] },
  { t: 'arb.tree', x: S + 14.2, z: 3.4, s: 1.25 },
  { t: 'dr.footbridge', x: S + 3.0, z: 9.5 },
  // wheat and wildflowers over everything that is not river, path, yard or tree
  {
    t: 'dr.field', x0: S + 0.2, x1: S + 17.8, z0: 1.2, z1: 14.8, seed: 7,
    avoid: [[S + 1.8, 0, S + 4.2, 15], [S + 7.6, 6.2, S + 10.4, 15], [S + 5.6, 1.0, S + 12.6, 6.9], [S + 13.2, 2.4, S + 15.2, 4.4]],
  },
  { t: 'arb.bloom', x: S + 6.4, z: 7.8, s: 0.6 },
  { t: 'arb.bloom', x: S + 11.8, z: 7.6, s: 0.55, hue: 'violet' },
];
const seraLights = [
  { ...pool(S + 9.0, 3.0, '#ffd27a', 9, 9, 3.2), tag: 'dream_gold' },
  pool(S + 2.8, 6.0, '#a8e8ff', 7, 5, 0.8),
  pool(S + 12.6, 9.4, '#ffb87a', 9, 7),
  pool(S + 5.0, 11.6, '#ffe0a0', 9, 7),
];
const seraNpcs = [
  { id: 'dr_theo', sprite: 'theo_grown', x: S + 9.0, z: 7.2, facing: 'down', name: 'THEO' },
];

// ---------------------------------------------------------------- the grid: four sets of 17 columns and
// the field of 18, one void column between them (x 17, 35, 53)

// local columns of the field (x 54-71): the river at 2-3 (x 56-57), the path at 8-9 (x 62-63)
const fieldRow = (r) => {
  const cells = [...','.repeat(18)];
  if (r !== 9) cells[2] = cells[3] = 'w';                  // the footbridge row (z 9) crosses the river
  if (r >= 7) cells[8] = cells[9] = '_';                   // the path from the gate down to the south edge
  return cells.join('');
};
const row = (k, n, o, s) => [k.padEnd(17), n.padEnd(17), o.padEnd(17), s.padEnd(18)].join(' ');

// ---------------------------------------------------------------- the map

export default {
  id: 'dreams',
  name: 'Dream',
  region: '',
  music: 'lullaby',
  scene: true,
  companions: false,
  grid: [
    row('', '', '', ''), // 0
    row('#WW##WW###WW##WW#', '#WWWWWWWWWWWWWW##', '#sWWWWWWWWWWWWs##', fieldRow(1)), // 1
    ...Array.from({ length: 11 }, (_, i) => row(`#${'h'.repeat(15)}#`, `#${'m'.repeat(15)}#`, `#${'p'.repeat(15)}#`, fieldRow(i + 2))), // 2-12
    row('#'.repeat(17), '#'.repeat(17), '#'.repeat(17), fieldRow(13)), // 13
    row('', '', '', fieldRow(14)), // 14
    row('', '', '', ''), // 15
  ],
  legend: {
    // kade: ivory and honey stone, gold trim
    '#': { t: 'wall', tex: 'dr_hall_wall', side: 'dr_hall_wall', cap: 'dr_hall_cap', low: 'dr_hall_low' },
    W: { t: 'window', tex: 'window_frame', backdrop: 'dr_bd_gold' },
    h: { t: 'floor', tex: 'dr_hall_floor', mix: [['dr_hall_floor_b', 0.3]], rot: 'random', roughness: 0.35, metalness: 0.2, emissive: 1.6 },
    // nyx: jade deck plates, teal walls
    m: { t: 'floor', tex: 'dr_mer_floor', mix: [['dr_mer_floor_b', 0.25]], roughness: 0.45, metalness: 0.35, emissive: 1.8 },
    // orion: pearl
    p: { t: 'floor', tex: 'dr_pearl_floor', rot: 'random', roughness: 0.25, metalness: 0.3, emissive: 1.6 },
    s: { t: 'wall', tex: 'dr_pearl_wall', side: 'dr_pearl_wall', cap: 'dr_pearl_cap', low: 'dr_pearl_low' },
    // sera: wheat, the river, the path
    ',': { t: 'floor', tex: 'dr_wheat', mix: [['dr_meadow', 0.28]], rot: 'random', roughness: 0.9, metalness: 0, emissive: 1.4 },
    w: { t: 'water', tex: 'dr_river', bank: 'dr_bank', bed: 'dr_riverbed', depth: 0.3 },
    _: { t: 'floor', tex: 'dr_path', rot: 'random', roughness: 0.95, metalness: 0, emissive: 1.4 },
  },
  wallH: 3,
  lowH: 0.75,
  wallTex: { side: 'dr_hall_wall', cap: 'dr_hall_cap', low: 'dr_hall_low' },
  // the hall's windows climb two storeys; the bridge is two storeys of glass
  grand: [
    { row: 1, c0: 0, c1: 16, height: 5 },
    { row: 1, c0: 36, c1: 52, height: 6 },
  ],
  mood: MOOD.kade,
  areas: [
    { id: 'kade', name: '', rect: [0, 0, 17.5, 16], cam: [6.4, 8.0], zone: null, banner: false, mood: MOOD.kade, view: { pitch: 31, dist: 15 } },
    { id: 'nyx', name: '', rect: [17.5, 0, 35.5, 16], cam: [6.4, 8.0], zone: null, banner: false, mood: MOOD.nyx, view: { pitch: 31, dist: 15 } },
    { id: 'orion', name: '', rect: [35.5, 0, 53.5, 16], cam: [6.4, 8.0], zone: null, banner: false, mood: MOOD.orion, view: { pitch: 31, dist: 15 } },
    { id: 'sera', name: '', rect: [53.5, 0, 72, 16], cam: [6.8, 8.6], zone: null, banner: false, mood: MOOD.sera, view: { pitch: 28, dist: 15 } },
  ],
  spawns: {
    kade: { x: K + 8.5, z: 11.2, facing: 'up' },
    nyx: { x: N + 8.5, z: 11.2, facing: 'up' },
    orion: { x: O + 8.5, z: 11.2, facing: 'up' },
    sera: { x: S + 9.0, z: 11.6, facing: 'up' },
  },
  props: [...kadeProps, ...nyxProps, ...orionProps, ...seraProps],
  lights: [...kadeLights, ...nyxLights, ...orionLights, ...seraLights],
  ambient: [
    { preset: 'mote', x: K + 8.5, y: 1.6, z: 6.5, area: [14, 2.6, 9], rate: 5, color: '#ffe6a8' },
    { preset: 'petal', x: K + 8.5, y: 3.2, z: 6.0, area: [12, 1, 8], rate: 1.4, color: '#ffd27a' },
    { preset: 'mote', x: N + 8.5, y: 1.6, z: 6.5, area: [14, 2.6, 9], rate: 4, color: '#c8ffd8' },
    { preset: 'firefly', x: N + 8.5, y: 1.4, z: 6.0, area: [14, 1.6, 9], rate: 1.6 },
    { preset: 'mote', x: O + 8.5, y: 1.8, z: 6.5, area: [14, 2.6, 9], rate: 4, color: '#f4fbff' },
    { preset: 'petal', x: S + 9.0, y: 2.6, z: 7.0, area: [18, 2, 12], rate: 3, color: '#ffe0f0' },
    { preset: 'mote', x: S + 9.0, y: 1.4, z: 7.0, area: [18, 2.4, 12], rate: 5, color: '#fff2c8' },
  ],
  npcs: [...kadeNpcs, ...nyxNpcs, ...orionNpcs, ...seraNpcs],
  view: { pitch: 31, dist: 15 },
  viewpoints: {
    kade: { x: K + 8.5, z: 10.4, facing: 'up' },
    nyx: { x: N + 8.5, z: 10.4, facing: 'up' },
    orion: { x: O + 8.5, z: 10.4, facing: 'up' },
    sera: { x: S + 9.0, z: 10.6, facing: 'up' },
  },
};
