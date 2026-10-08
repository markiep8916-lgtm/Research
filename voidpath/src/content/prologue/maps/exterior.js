// exterior (PURE MapDef, TECH_PLAN 12.5): the cold open's staged scene. The ISV Halcyon's dorsal
// hull drifts over Tethys: a long strip of hull plating (radiator fins, comms masts, running lights)
// under the camera-anchored sky vista, seen in a slow low pan. `scene: true`: arrivals run no
// triggers, encounters or saves, and BOLT stays away. Spawn `view` (binding) stands at the stern,
// on a stern lock far south of the hull: the camera, clamped over the hull, never shows it, and
// scripts hide the leader's stand-in anyway.
//
// The epilogue reuses this map for the Ringborn escort (anchors `bow`, `stern`, `escort`).

const HULL_MOOD = {
  fog: '#04060d', density: 0.008, sky: '#e8b878', ground: '#05070d', hemi: 0.42,
  key: 2.2, keyColor: '#ffd9a0', fill: 0.3, exposure: 1.06, bloom: 1.0, saturation: 1.1,
};

// running lights along the hull edges, alternating amber and cyan
const runLights = [];
for (let x = 3.5; x < 44; x += 5) {
  runLights.push({ t: 'glow', x, y: 0.25, z: 1.6, color: x % 2 ? '#ffb54a' : '#45d4ff', size: 0.9, intensity: 1.4 });
  runLights.push({ t: 'glow', x: x + 2.5, y: 0.25, z: 10.4, color: '#ff5a5a', size: 0.7, intensity: 1.1 });
}

// the south flank under the deck edge: a band of crew-deck windows over ribbed plating that falls
// away into the dark (the camera looks north, so this face fills the bottom of the shot)
const FLANK_TEX = { side: 'metal_side', top: 'wall_cap' };
const flank = [
  ...[[2, 7, 'a'], [9, 6, 'b'], [15, 8, 'a'], [23, 5, 'b'], [28, 8, 'a'], [36, 6, 'b']].map(([x0, w, k]) => ({
    t: 'box', x: x0 + w / 2, z: 12.15, w, d: 0.3, h: 1, y: -1, solid: false, emissive: 1.3,
    tex: { ...FLANK_TEX, front: k === 'a' ? 'pro_hull_windows' : 'pro_hull_windows_b' },
  })),
  { t: 'box', x: 22, z: 12.15, w: 40, d: 0.3, h: 5, y: -6, solid: false, emissive: 1.4, tex: { ...FLANK_TEX, front: 'pro_hull_rib' } },
];

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
    '...........................................', // 2
    '...........................................', // 3
    '...........................................', // 4
    '...........................................', // 5
    '...........................................', // 6
    '...........................................', // 7
    '...........................................', // 8
    '...........................................', // 9
    ' ..........................................', // 10
    '  ........................................  ', // 11
    // rows 12-27: open space; the stern lock below is where arrivals stand, out of the camera's view
    ...Array.from({ length: 16 }, () => ''),
    '                                         ,  ', // 28
    '                                            ', // 29
  ].map((r) => r.padEnd(44, ' ').slice(0, 44)),
  legend: {
    '.': { t: 'floor', tex: 'pro_hull', mix: [['floor_bridge', 0.12]], roughness: 0.5, metalness: 0.45, emissive: 1.2 },
    ',': { t: 'floor', tex: 'floor_plate', roughness: 0.6, metalness: 0.3, emissive: 1.0 },
  },
  mood: HULL_MOOD,
  // the camera's target stays over the hull (cam clamp) wherever the leader stands
  areas: [{ id: 'hull', name: 'ISV Halcyon', subtitle: 'Tethys orbit', rect: [0, 0, 44, 30], cam: [3, 9], zone: null, banner: false, mood: HULL_MOOD }],
  spawns: {
    view: { x: 41.5, z: 28.5, facing: 'left' },
  },
  anchors: {
    bow: { x: 4.5, z: 6.0, facing: 'left' },
    stern: { x: 38.5, z: 6.0, facing: 'left' },
    escort: { x: 22.0, z: 1.2, facing: 'left' },
  },
  props: [
    ...runLights,
    ...flank,
    ...bow,
    ...stern,
    // radiator fins and comms masts break up the plating
    ...[8, 17, 26, 35].map((x) => ({ t: 'box', x, z: 3.2, w: 3.2, d: 0.3, h: 1.6, tex: { front: 'wall_panel_vent', side: 'metal_side', top: 'wall_cap' } })),
    ...[12, 30].map((x) => ({ t: 'cylinder', x, z: 8.2, r: 0.18, h: 4.2, tex: 'pipe' })),
    // a dorsal sensor housing with its slow amber beacon
    { t: 'box', x: 21, z: 8.2, w: 3, d: 2.2, h: 0.7, tex: { front: 'pro_hull_rib', side: 'pro_hull_rib', top: 'pro_hull' } },
    { t: 'cylinder', x: 21, z: 8.2, r: 0.7, h: 0.5, y: 0.7, tex: 'pipe' },
    { t: 'glow', x: 21, y: 1.5, z: 8.2, color: '#ffb54a', size: 1.2, intensity: 1.4 },
  ],
  lights: [
    { x: 8, y: 3, z: 6, color: '#ffc27a', intensity: 14, distance: 14 },
    { x: 22, y: 3, z: 6, color: '#ffc27a', intensity: 14, distance: 14 },
    { x: 36, y: 3, z: 6, color: '#ffc27a', intensity: 14, distance: 14 },
    { x: 15, y: 1.2, z: 1.6, color: '#45d4ff', intensity: 6, distance: 6 },
    { x: 30, y: 1.2, z: 10.4, color: '#ff5a5a', intensity: 5, distance: 5 },
  ],
  ambient: [
    { preset: 'dust', x: 22, y: 2, z: 6, area: [44, 4, 12], rate: 2.5, color: '#ffe2b0' },
  ],
  sky: { texture: 'space_backdrop', stars: 'stars_layer', horizonV: 0.58, edge: 'north', parallax: 0.16, tint: [1.08, 1.02, 0.96] },
  view: { pitch: 20, dist: 20 },
  viewpoints: {
    open: { x: 12, z: 6, facing: 'left' },
  },
};
