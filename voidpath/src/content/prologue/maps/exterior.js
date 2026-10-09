// exterior (PURE MapDef, TECH_PLAN 12.5): the cold open's staged scene, the first frame of the game.
// The ISV Halcyon's dorsal hull drifts over Tethys: hull plating from the bow superstructure (west)
// to the cold drive housings (east), radiator fin arrays and antenna clusters silhouetted against the
// planet along the north edge, a slowly turning comms dish with a blinking beacon (the focal piece),
// and a raised crew-deck ridge whose lit windows and status displays face the camera (the displays
// show WARDEN's gold sigil while it speaks). The hull runs far enough south that
// a portrait phone never sees under it. Palette (12.1): Tethys amber and cream over black space; the
// sky is pro_tethys_sky (the shared vista with its magenta nebula turned amber).
// `scene: true`: arrivals run no triggers, encounters or saves, and BOLT stays away. Spawn `view`
// (binding) is a stern lock far south of the hull: the camera, clamped over the hull, never shows
// it, and scripts hide the leader's stand-in anyway.
//
// The epilogue reuses this map for the Ringborn escort (anchors `bow`, `stern`, `escort`).

const HULL_MOOD = {
  fog: '#04060d', density: 0.006, sky: '#e8b878', ground: '#05070d', hemi: 0.5,
  key: 2.3, keyColor: '#ffd9a0', fill: 0.34, exposure: 1.08, bloom: 1.0, saturation: 1.1,
};

const W = 44;     // hull length (x)
const RIDGE_Z = 12.6;

// running lights: cyan along the north edge, amber along the crew-deck ridge
const runLights = [];
for (let x = 3.5; x < W; x += 5) {
  runLights.push({ t: 'glow', x, y: 0.3, z: 1.2, color: x % 2 ? '#45d4ff' : '#7fe3ff', size: 0.8, intensity: 1.3 });
  runLights.push({ t: 'glow', x: x + 2.5, y: 1.05, z: RIDGE_Z + 0.55, color: '#ffb54a', size: 0.8, intensity: 1.4 });
}

// the crew-deck ridge: a raised band of hull whose south face is a row of lit windows
const ridge = [
  ...[[1, 8, 'a'], [9, 7, 'b'], [16, 9, 'a'], [25, 6, 'b'], [31, 8, 'a'], [39, 4, 'b']].map(([x0, w, k]) => ({
    t: 'box', x: x0 + w / 2, z: RIDGE_Z, w, d: 1.0, h: 0.9, emissive: 1.5, solid: false,
    tex: { front: k === 'a' ? 'pro_hull_windows' : 'pro_hull_windows_b', side: 'metal_side', top: 'pro_hull' },
  })),
];

// hull status displays on the ridge's face: WARDEN's sigil takes them over while it speaks (WRITING 1.7)
const displays = [13.5, 21.5, 29.5, 37.5].map((x) => ({ t: 'screen', group: 'hull', x, y: 0.2, z: RIDGE_Z + 0.52, w: 1.5, h: 0.56, intensity: 1.5 }));

// the bow's superstructure: the Observation Bridge sits on a stepped block, a mast above it
const bow = [
  { t: 'box', x: 5.5, z: 5.5, w: 5, d: 5, h: 1.2, emissive: 1.5, tex: { front: 'pro_hull_windows', side: 'pro_hull_windows_b', top: 'pro_hull' } },
  { t: 'box', x: 5.2, z: 5.2, w: 3.2, d: 3.2, h: 1, y: 1.2, emissive: 1.6, tex: { front: 'pro_hull_windows', side: 'pro_hull_windows', top: 'wall_cap' } },
  { t: 'cylinder', x: 4.6, z: 4.4, r: 0.1, h: 2.6, y: 2.2, tex: 'pipe' },
  { t: 'glow', x: 4.6, y: 4.9, z: 4.4, color: '#ff5a5a', size: 1.0, intensity: 1.6 },
];

// the stern: two cold drive housings (the jump coil is gone; only station-keeping lights burn)
const stern = [3.4, 8.6].flatMap((z) => [
  { t: 'box', x: 42.4, z, w: 2.6, d: 2.6, h: 1.5, y: -0.3, emissive: 1.3, tex: { front: 'pro_hull_rib', side: 'pro_hull_windows_b', top: 'pro_hull' } },
  { t: 'box', x: 43.9, z, w: 0.5, d: 1.9, h: 1.1, y: -0.1, emissive: 1.0, tex: { front: 'metal_side', side: 'metal_side', top: 'wall_cap' } },
  { t: 'glow', x: 42.4, y: 1.35, z: z + 1.3, color: '#ff5a5a', size: 0.8, intensity: 1.3 },
]);

export default {
  id: 'exterior',
  name: 'ISV Halcyon',
  region: 'Tethys orbit',
  music: 'warden',
  scene: true,
  grid: [
    //        1111111111222222222233333333334444
    //234567890123456789012345678901234567890123
    '  ........................................  ', // 0
    ' ..........................................', // 1
    ...Array.from({ length: 22 }, () => '...........................................'), // 2-23
    ' ..........................................', // 24
    '  ........................................  ', // 25
    // rows 26-30: open space; the stern lock below is where arrivals stand, out of the camera's view
    ...Array.from({ length: 5 }, () => ''),
    '                                         ,  ', // 31
    '                                            ', // 32
  ].map((r) => r.padEnd(W, ' ').slice(0, W)),
  legend: {
    '.': { t: 'floor', tex: 'pro_hull', mix: [['floor_bridge', 0.12]], roughness: 0.5, metalness: 0.45, emissive: 1.2 },
    ',': { t: 'floor', tex: 'floor_plate', roughness: 0.6, metalness: 0.3, emissive: 1.0 },
  },
  mood: HULL_MOOD,
  // the camera's target stays over the hull (cam clamp) wherever the leader stands
  areas: [{ id: 'hull', name: 'ISV Halcyon', subtitle: 'Tethys orbit', rect: [0, 0, W, 33], cam: [3, 8], zone: null, banner: false, mood: HULL_MOOD }],
  spawns: {
    view: { x: 41.5, z: 31.5, facing: 'left' },
  },
  anchors: {
    bow: { x: 4.5, z: 6.0, facing: 'left' },
    stern: { x: 38.5, z: 6.0, facing: 'left' },
    escort: { x: 22.0, z: 1.2, facing: 'left' },
  },
  props: [
    ...runLights,
    ...ridge,
    ...displays,
    ...bow,
    ...stern,
    // radiator fin arrays and antenna clusters along the north edge, against the planet
    { t: 'pro.radiator', x: 12.4, z: 2.6, n: 6 },
    { t: 'pro.radiator', x: 27.0, z: 2.6, n: 7 },
    { t: 'pro.radiator', x: 35.6, z: 2.6, n: 5 },
    { t: 'pro.antennas', x: 9.4, z: 2.2 },
    { t: 'pro.antennas', x: 31.6, z: 2.0, seed: 2 },
    { t: 'pro.antennas', x: 24.4, z: 8.6, seed: 3 },
    // the focal piece: the long-range comms dish, turning slowly, its beacon blinking
    { t: 'pro.dish', x: 17.6, z: 4.6 },
    // a dorsal sensor housing with its slow amber beacon
    { t: 'box', x: 31, z: 9.4, w: 3, d: 2.2, h: 0.7, tex: { front: 'pro_hull_rib', side: 'pro_hull_rib', top: 'pro_hull' } },
    { t: 'cylinder', x: 31, z: 9.4, r: 0.7, h: 0.5, y: 0.7, tex: 'pipe' },
    { t: 'glow', x: 31, y: 1.5, z: 9.4, color: '#ffb54a', size: 1.2, intensity: 1.4 },
    // hull vents breathing a little frost along the south plating
    ...[6, 20, 35].map((x) => ({ t: 'box', x, z: 18.5, w: 2.4, d: 1.2, h: 0.18, solid: false, tex: { front: 'metal_side', side: 'metal_side', top: 'wall_panel_vent' } })),
  ],
  // virtual lights: the planet's warm floods, coloured running lights, the dish beacon
  lights: [
    { x: 8, y: 3, z: 6, color: '#ffc27a', intensity: 14, distance: 14 },
    { x: 22, y: 3, z: 6, color: '#ffc27a', intensity: 14, distance: 14 },
    { x: 36, y: 3, z: 6, color: '#ffc27a', intensity: 14, distance: 14 },
    { x: 15, y: 3, z: 17, color: '#ffc27a', intensity: 10, distance: 14 },
    { x: 33, y: 3, z: 17, color: '#ffc27a', intensity: 10, distance: 14 },
    ...[6, 14, 22, 30, 38].map((x) => ({ x, y: 0.7, z: RIDGE_Z + 1.0, color: '#ffa64a', intensity: 8, distance: 5 })),
    ...[10, 22, 34].map((x) => ({ x, y: 0.6, z: 1.0, color: '#45d4ff', intensity: 7, distance: 5 })),
    { x: 17.6, y: 3.2, z: 4.6, color: '#ff3b4e', intensity: 8, distance: 6, mode: 'pulse', amount: 0.7, speed: 1.4 },
    { x: 24.4, y: 2.6, z: 8.6, color: '#ff5a5a', intensity: 4, distance: 4, mode: 'pulse', amount: 0.5, speed: 0.9 },
  ],
  ambient: [
    { preset: 'dust', x: 22, y: 2, z: 8, area: [44, 4, 16], rate: 2.5, color: '#ffe2b0' },
    { preset: 'steam', x: 20, y: 0.3, z: 18.5, area: [30, 0.2, 1.2], rate: 1.5, color: '#cfe6ff', speed: 0.3, size: 1.2 },
  ],
  sky: { texture: 'pro_tethys_sky', stars: 'stars_layer', horizonV: 0.58, edge: 'north', parallax: 0.16, tint: [1.08, 1.02, 0.96] },
  view: { pitch: 20, dist: 20 },
  viewpoints: {
    open: { x: 12, z: 6, facing: 'left' },
  },
};
