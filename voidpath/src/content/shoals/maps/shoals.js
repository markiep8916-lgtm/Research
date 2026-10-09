// shoals (PURE MapDef, TECH_PLAN 3.1, 12.5): the ice tunnels through the ring debris between
// Driftmarket and the wreck of the Meridian. 1 cell = 1 world unit, +Z = south (toward the camera).
//
//   Shoals Mouth   (west)    an ice shelf behind Driftmarket's docking tube; ice arches look out on
//                            Tethys and the rings. Ringborn route lanterns. No encounters.
//   Blue Tunnels   (middle)  glowing blue ice, frozen Meridian cargo, the crystal grotto (frost charm
//                            chest), Nyx's frozen lockbox, a secret cache in the west alcove.
//   The Deep Ice   (south)   a cavern split by two crevasses over a glowing abyss, crossed by ice
//                            bridges; Meridian hull plates frozen in the ice; the hull breach east
//                            into the wreck; Rime Hollow to the north holds the optional elite (M3).
//
// Spawns (binding): from_driftmarket, from_meridian. Every room is separated from the next by at
// least three void rows, so no full-height wall ever stands between the camera and the leader.

// Cold and bright where the ice glows (G2 C3-7): hemisphere fill about 0.9 with a cyan bounce off the
// ice, a blue haze in place of black, cyan pools under every crystal and ice light, warm lantern pools
// along the Ringborn route, and Tethys over the ring beyond the ice (the map's sky vista).
const mood = (fog, sky, extra = {}) => ({
  fog, density: 0.034, sky, ground: '#1a3450', hemi: 0.9, key: 0.6, keyColor: '#bfe8ff', fill: 0.42,
  exposure: 1.14, bloom: 1.0, saturation: 1.08, ...extra,
});
const MOOD = {
  // the mouth has Tethys's warm key light through the arches: less fill, or it washes out
  mouth: mood('#0e2a42', '#6fb0e0', { key: 1.3, keyColor: '#ffe2b8', density: 0.028, hemi: 0.7, exposure: 1.04 }),
  tunnels: mood('#0f2a46', '#5aa0dc', { density: 0.036 }),
  deep: mood('#0d2544', '#5596da', { bloom: 1.05 }),
  lair: mood('#0f2546', '#6a9ee8', { density: 0.038, saturation: 1.0 }),
};

// ---------------------------------------------------------------- props

const marker = (x, z, extra = {}) => ({ t: 'shoals.marker', x, z, ...extra });       // Ringborn route lantern
const pillar = (x, z, s = 1, extra = {}) => ({ t: 'shoals.icePillar', x, z, s, ...extra });
const crystal = (x, z, s = 1, extra = {}) => ({ t: 'shoals.crystal', x, z, s, ...extra });
const cargo = (x, z, extra = {}) => ({ t: 'shoals.frozenCargo', x, z, ...extra });
const hull = (x, z, extra = {}) => ({ t: 'shoals.hullShard', x, z, ...extra });
const icicles = (x0, x1, z, extra = {}) => ({ t: 'shoals.icicles', x0, x1, z, ...extra });
const abyss = (x, z, w, d, extra = {}) => ({ t: 'shoals.abyss', x, z, w, d, ...extra });
const bridgeIce = (x0, x1, z) => ({ t: 'shoals.bridgeIce', x0, x1, z });
// snow drifts as world-space decals with their own turn and size (so no floor cell stamps a motif)
const drift = ([x, z, s, rot]) => ({ t: 'shoals.drift', x, z, s, rot });
const pool = (x, z, r, color, k) => ({ t: 'shoals.pool', x, z, r, color, k });
const DRIFTS = [
  [2.6, 3.0, 2.4, 0.3], [6.5, 1.8, 2.0, 1.1], [12.0, 2.2, 2.6, 2.0], [17.2, 3.0, 1.8, 0.6], [4.2, 8.0, 2.2, 2.6],
  [11.6, 7.2, 1.6, 1.9], [15.0, 8.4, 2.4, 0.4], [24.8, 1.6, 1.8, 0.2], [30.0, 2.6, 2.2, 1.4], [22.0, 7.6, 2.0, 2.2],
  [34.0, 5.0, 1.6, 0.9], [38.4, 7.4, 2.0, 1.6], [37.2, 10.8, 2.2, 0.5], [43.5, 12.2, 2.6, 2.4], [40.0, 14.2, 1.8, 1.0],
  [5.0, 16.8, 2.4, 0.7], [11.4, 17.2, 2.0, 2.1], [18.0, 17.0, 2.6, 1.2], [26.0, 17.0, 2.2, 0.3], [33.4, 18.6, 2.0, 2.7],
  [3.6, 19.6, 1.8, 1.5], [10.4, 23.0, 2.2, 0.8], [12.0, 27.0, 1.8, 2.2], [7.6, 31.0, 2.6, 0.4], [14.4, 36.0, 2.2, 1.8],
  [9.0, 40.0, 2.0, 2.6], [31.4, 31.4, 2.4, 1.1], [33.0, 40.6, 2.0, 0.2], [47.0, 38.4, 2.6, 2.0], [52.0, 31.2, 2.2, 0.7],
  [57.6, 36.6, 2.0, 1.4], [48.0, 42.6, 1.8, 2.9], [49.6, 24.2, 2.2, 0.8], [55.0, 27.4, 2.0, 2.3],
];

const props = [
  // ---- Shoals Mouth
  { t: 'shoals.tube', x: 0.6, z: 5.5 },
  marker(3.2, 3.4), marker(8.8, 7.8), marker(14.2, 3.2), marker(18.6, 6.7, { ribbon: true }),
  pillar(6.2, 8.3, 0.9), pillar(11.6, 1.9, 1.15), pillar(16.6, 8.6, 0.8),
  cargo(15.4, 1.8, { rot: 0.3 }), cargo(2.4, 8.4, { rot: -0.2, s: 0.8 }),
  crystal(10.4, 8.6, 0.8),
  icicles(1, 3, 1), icicles(5, 8, 1), icicles(10, 13, 1), icicles(15, 19, 1),
  { t: 'decal', name: 'sh_decal_frost', x: 7.5, z: 5.0, rot: 1 },
  { t: 'decal', name: 'sh_decal_frost', x: 13.0, z: 6.2, rot: 3 },

  // ---- Blue Tunnels: the crystal grotto, the descent, the side grotto, the long west run
  crystal(28.6, 1.6, 1.5), crystal(25.0, 7.6, 0.9), crystal(30.6, 7.4, 0.7),
  pillar(24.6, 2.2, 0.9), cargo(30.6, 4.6, { rot: 0.5 }),
  icicles(24, 26, 1), icicles(29, 32, 1), icicles(33, 37, 3),
  marker(21.5, 3.4), marker(36.0, 8.0),
  pillar(38.6, 12.5, 0.85), crystal(35.6, 17.8, 0.9),
  cargo(42.0, 10.8, { rot: -0.15 }), cargo(46.4, 13.6, { rot: 0.4, s: 0.85 }), crystal(46.6, 10.6, 1.1),
  icicles(41, 48, 10), { t: 'shoals.lockbox', x: 44.6, z: 10.9, openWhen: 'shoals:lockbox' },
  hull(28.0, 16.4, { rot: 0.2, s: 0.8 }),
  pillar(19.6, 18.6, 0.8), pillar(31.2, 16.4, 0.7), crystal(23.6, 16.3, 0.8), crystal(12.6, 18.7, 0.7),
  marker(26.0, 18.6), marker(12.0, 16.6),
  icicles(10, 15, 16), icicles(17, 26, 16), icicles(28, 34, 16),
  pillar(3.0, 14.6, 0.9), crystal(7.6, 14.6, 1.0), cargo(2.6, 18.0, { rot: 0.7 }),
  icicles(2, 9, 14),
  crystal(9.8, 26.0, 0.8), pillar(13.4, 23.0, 0.7), marker(11.4, 28.4),

  // ---- The Deep Ice: two crevasses falling away into the abyss (their far ends start under the wall
  // row), crossed by slab bridges with icicles; frozen hull plates, the breach east
  abyss(24.0, 37.0, 6, 14, { farTop: 0 }), abyss(40.0, 37.0, 6, 14, { farTop: 0, shafts: 3 }),
  bridgeIce(21, 27, 41), bridgeIce(37, 43, 34),
  pillar(8.0, 31.2, 1.2), pillar(16.6, 42.6, 1.0), pillar(30.4, 30.8, 1.3), pillar(35.0, 42.6, 0.9),
  pillar(47.4, 31.2, 1.1), pillar(58.8, 42.6, 1.2), pillar(54.6, 30.6, 0.9),
  crystal(19.4, 31.0, 1.2), crystal(28.0, 42.6, 1.1), crystal(44.8, 42.4, 1.4), crystal(56.2, 38.6, 0.9),
  hull(31.0, 36.6, { rot: -0.4, s: 1.25 }), hull(50.6, 41.6, { rot: 0.5 }), hull(12.0, 41.0, { rot: 0.9, s: 0.9 }),
  cargo(15.2, 33.6, { rot: 0.2 }), cargo(46.6, 35.8, { rot: -0.6 }), cargo(53.8, 33.0, { s: 0.9 }),
  marker(19.6, 40.6), marker(28.6, 39.2), marker(35.6, 32.4), marker(44.6, 32.4), marker(59.6, 33.6, { ribbon: true }),
  icicles(6, 20, 30), icicles(27, 36, 30), icicles(43, 46, 30), icicles(58, 61, 30),
  { t: 'shoals.breach', x: 62.6, z: 35.8 },
  // Rime Hollow (north bulge): the colossus's lair
  crystal(48.6, 23.6, 1.3), crystal(56.2, 24.4, 1.0), pillar(55.6, 27.6, 1.0), pillar(48.2, 27.8, 0.8),
  icicles(48, 57, 23),
  { t: 'decal', name: 'sh_decal_frost', x: 52.0, z: 26.0, rot: 2 },
];

// ---------------------------------------------------------------- lights (virtual)

// every ice light and lantern also lays a pool on the floor (readable on every quality tier)
const pools = [];
const ice = (x, z, intensity = 12, color = '#4fc8ff', extra = {}) => {
  if ((extra.y ?? 1.3) > 0) pools.push(pool(x, z + 0.4, 1.4 + intensity * 0.08, color, 0.3));
  return { x, y: 1.3, z, color, intensity, distance: 7, ...extra };
};
const lantern = (x, z) => {
  pools.push(pool(x, z + 0.3, 1.9, '#ffae4a', 0.3));
  return { x, y: 1.6, z, color: '#ffae4a', intensity: 9, distance: 5, mode: 'flicker', amount: 0.25, speed: 5 };
};

const lights = [
  // Mouth: Tethys light through the arches, lantern glow, a crystal
  { x: 4.0, y: 2.6, z: 1.6, color: '#ffd2a0', intensity: 14, distance: 9 },
  { x: 13.5, y: 2.6, z: 1.6, color: '#ffd2a0', intensity: 14, distance: 9 },
  lantern(3.2, 3.6), lantern(8.8, 8.0), lantern(14.2, 3.4), lantern(18.6, 6.9),
  ice(10.4, 8.4, 9, '#5fe0ff'),
  { x: 1.2, y: 1.8, z: 5.5, color: '#ffb35a', intensity: 10, distance: 5 },
  // the eels' hole in the throat: violet light welling up until they are beaten
  { x: 19.4, y: 0.5, z: 5.2, color: '#8a5cff', intensity: 9, distance: 4.5, mode: 'pulse', amount: 0.35, speed: 1.3, when: '!shoals:eels' },
  // tunnels
  ice(28.6, 2.0, 11, '#4fe3ff', { distance: 8, mode: 'pulse', amount: 0.25, speed: 1.2 }),
  ice(25.0, 7.2, 10, '#3fb8ff'), ice(30.6, 7.0, 8, '#8fe8ff'),
  { x: 26.6, y: 2.6, z: 1.5, color: '#ffd2a0', intensity: 10, distance: 7 },
  lantern(21.5, 3.6), lantern(36.0, 8.2),
  ice(35.6, 17.6, 10), ice(38.4, 12.0, 9, '#2fa8e0'),
  ice(46.6, 10.9, 14, '#5fe8ff', { mode: 'pulse', amount: 0.3, speed: 1.6 }), ice(42.0, 11.2, 7, '#ffb35a', { y: 0.8 }),
  ice(23.6, 16.6, 10), ice(12.6, 18.4, 9, '#3fb8ff'), ice(30.0, 18.8, 8, '#7fd8ff'),
  lantern(26.0, 18.8), lantern(12.0, 16.8),
  ice(7.6, 15.0, 12, '#5fe0ff'), ice(3.4, 19.0, 6, '#9a7aff'),
  ice(9.8, 25.8, 9), lantern(11.4, 28.6),
  // Deep Ice: the abyss glows from below, crystals, hull plates catching amber
  { x: 24.0, y: -2.2, z: 36.0, color: '#2f7fff', intensity: 26, distance: 11, mode: 'pulse', amount: 0.3, speed: 0.8 },
  { x: 40.0, y: -2.2, z: 37.0, color: '#2f7fff', intensity: 26, distance: 11, mode: 'pulse', amount: 0.3, speed: 0.7 },
  ice(19.4, 31.4, 14, '#4fe3ff'), ice(28.0, 42.2, 12, '#5fe8ff'), ice(44.8, 42.0, 16, '#4fe3ff'), ice(56.2, 38.6, 10, '#7fd8ff'),
  ice(8.6, 36.0, 8, '#3fa0e8'), ice(14.0, 41.0, 7, '#a07aff'),
  lantern(19.6, 40.8), lantern(28.6, 39.4), lantern(35.6, 32.6), lantern(44.6, 32.6), lantern(59.6, 33.8),
  { x: 62.4, y: 1.4, z: 35.8, color: '#ff8a2a', intensity: 18, distance: 7, mode: 'pulse', amount: 0.35, speed: 1.1 },
  ice(52.0, 36.0, 8, '#9fe8ff'),
  // Rime Hollow, and a cold rim on the colossus so its silhouette reads against the ice
  ice(48.6, 24.0, 16, '#4fe3ff'), ice(56.2, 24.8, 12, '#7fd8ff'), ice(52.0, 28.6, 8, '#2f8fff'),
  { x: 52.0, y: 3.0, z: 24.0, color: '#b8f0ff', intensity: 9, distance: 4.5, when: '!defeated:shoals_elite_colossus' },
];
props.push(...pools, ...DRIFTS.map(drift));

// ---------------------------------------------------------------- ambient

const snow = (x, z, w, d, rate) => ({ preset: 'snow', x, y: 1.8, z, area: [w, 2.6, d], rate });
const ambient = [
  snow(9.5, 5, 17, 8, 6), { preset: 'dust', x: 9.5, y: 1.4, z: 5, area: [17, 2.4, 8], rate: 2, color: '#ffe2c0' },
  snow(27.5, 4.5, 8, 7, 3), { preset: 'frost', x: 28.5, y: 1.0, z: 2.6, area: [3, 1.2, 1.2], rate: 5 },
  snow(37, 12, 4, 12, 3), snow(43.5, 12.5, 7, 5, 2), { preset: 'drip', x: 44, y: 2.8, z: 10.6, area: [6, 0.1, 0.4], rate: 1.2 },
  snow(23, 17.5, 28, 3.5, 6), { preset: 'drip', x: 22, y: 2.8, z: 16.6, area: [24, 0.1, 0.4], rate: 2 },
  snow(5.5, 17.5, 7, 7, 2), snow(11, 25, 4, 9, 2),
  snow(33, 36.5, 54, 13, 12),
  { preset: 'frost', x: 24, y: -1.2, z: 37, area: [5, 2.4, 13], rate: 8 },
  { preset: 'frost', x: 40, y: -1.2, z: 37, area: [5, 2.4, 13], rate: 8 },
  { preset: 'drip', x: 33, y: 2.8, z: 30.6, area: [50, 0.1, 0.4], rate: 3 },
  { preset: 'spark', x: 62.4, y: 1.4, z: 35.8, area: [0.4, 0.8, 1.2], rate: 0.6, burst: 6 },
  snow(52, 26, 10, 6, 3), { preset: 'frost', x: 52, y: 1.0, z: 24.5, area: [9, 1.2, 2], rate: 4 },
];

// ---------------------------------------------------------------- map

// every few ice cells grow a crystal cluster ('i'), so the cliff faces do not repeat cell by cell
const crystalWalls = (rows) => rows.map((row, r) => row.replace(/#/g, (ch, c) => ((c * 5 + r * 3) % 7 === 3 ? 'i' : ch)));

export default {
  id: 'shoals',
  name: 'The Shoals',
  region: 'Tethys Ring · Ice Debris',
  music: 'shoals',
  mood: MOOD.tunnels,
  grid: crystalWalls([
    '###WW###WW###WW#####   ###WW##c##                               ', // 0
    '#,,,...............#   #,,......#                               ', // 1
    '#,,,...............#####,,......##c###                          ', // 2
    '#....................................#                          ', // 3
    ',....................................#                          ', // 4
    ',....................................####                       ', // 5
    ',.......................................#                       ', // 6
    '#..................#####........###.....#                       ', // 7
    '#,,................#   #........# #.....#                       ', // 8
    '#,,.............,,,#   ########## #.....####c####               ', // 9
    '####################              #.............#               ', // 10
    '                                  #.............#               ', // 11
    '                                  #.............#               ', // 12
    ' ####c#####                       #.............#               ', // 13
    ' #........#                       #.........,,,,#               ', // 14
    ' #........######c##########c#######.........,,,,#               ', // 15
    ' #......................................#########               ', // 16
    ' #......................................#                       ', // 17
    ' #......................................#                       ', // 18
    ' #,,,,..................................#                       ', // 19
    ' #,,,,........###########################                       ', // 20
    ' #,,,,........#                                                 ', // 21
    ' ########.....#                               ###c#########     ', // 22
    '        #.....#                               #...........#     ', // 23
    '        #.....#                               #...........#     ', // 24
    '        #.....#                               #...........#     ', // 25
    '        #.....#                               #...........#     ', // 26
    '        #.....#                               #...........#     ', // 27
    '        #.....#                               #...........#     ', // 28
    '     ####.....####c############c############c##...........####  ', // 29
    '     #...............______..........______..................#  ', // 30
    '     #...............______..........______..................#  ', // 31
    '     #...............______..........::::::..................#  ', // 32
    '     #...............______..........::::::..................###', // 33
    '     #...............______..........______.....................', // 34
    '     #...............______..........______.....................', // 35
    '     #...............______..........______.....................', // 36
    '     #...............______..........______.....................', // 37
    '     #...............______..........______..................###', // 38
    '     #...............::::::..........______..................#  ', // 39
    '     #...............::::::..........______..................#  ', // 40
    '     #...............______..........______..................#  ', // 41
    '     #,,,,,,,........______..........______.........,,,,,,,,,#  ', // 42
    '     #,,,,,,,........______..........______.........,,,,,,,,,#  ', // 43
    '     #########################################################  ', // 44
    '                                                                ', // 45
  ]),
  legend: {
    '#': { t: 'wall', tex: 'sh_ice_wall', side: 'sh_ice_wall_side', cap: 'sh_ice_cap', low: 'sh_ice_low', emissive: 2.4, roughness: 0.35, metalness: 0.05 },
    i: { t: 'wall', tex: 'sh_ice_wall_b', side: 'sh_ice_wall_side', cap: 'sh_ice_cap', low: 'sh_ice_low', emissive: 2.4, roughness: 0.35, metalness: 0.05 },
    c: { t: 'wall', tex: 'sh_ice_wall_cargo', side: 'sh_ice_wall_side', cap: 'sh_ice_cap', low: 'sh_ice_low', emissive: 2.4, roughness: 0.35, metalness: 0.05 },
    W: { t: 'window', tex: 'sh_ice_arch', backdrop: 'sh_bd_ring' },
    '.': { t: 'floor', tex: 'sh_ice_floor', mix: [['sh_ice_floor_b', 0.28], ['sh_ice_floor_c', 0.05]], roughness: 0.3, metalness: 0.1, emissive: 2.2 },
    ',': { t: 'floor', tex: 'sh_snow', mix: [['sh_snow_b', 0.4]], roughness: 0.85, metalness: 0.0, emissive: 1.8 },
    ':': { t: 'floor', tex: 'sh_ice_deep', rot: 'random', roughness: 0.2, metalness: 0.15, emissive: 2.6 },
    _: { t: 'pit', edge: 'sh_ice_edge', thickness: 0.35, emissive: 2.4 },   // a slab rim; the abyss prop builds the depth
  },
  wallTex: { side: 'sh_ice_wall_side', cap: 'sh_ice_cap', low: 'sh_ice_low' },
  backdrop: { texture: 'sh_bd_ring', stars: 'stars_layer', tint: [1, 1.02, 1.08] },
  sky: { texture: 'sh_bd_ring', stars: 'stars_layer', horizonV: 0.6, edge: 'north', parallax: 0.12, tint: [0.92, 0.98, 1.08] },
  // past the ice, looking down: deep blue ice and drifting mist, not open stars (G2 C3-8)
  underlay: { texture: 'sh_abyss', y: -6.5, repeat: [6, 6], scroll: [0.0015, 0.003], color: [0.85, 1.0, 1.25] },
  areas: [
    { id: 'mouth', name: 'Shoals Mouth', subtitle: 'The Shoals · Ring Ice', rect: [0, 0, 20, 10.5], cam: [3.6, 7.0], zone: null, mood: MOOD.mouth },
    { id: 'tunnels', name: 'Blue Tunnels', subtitle: 'The Shoals · Frozen Cargo', rect: [20, 0, 49, 15.6], zone: 'shoals_tunnels', mood: MOOD.tunnels },
    { id: 'tunnels_w', name: 'Blue Tunnels', subtitle: 'The Shoals · Frozen Cargo', rect: [0, 13, 41, 29.5], cam: [16.5, 25.5], zone: 'shoals_tunnels', mood: MOOD.tunnels, banner: false },
    { id: 'hollow', name: 'Rime Hollow', subtitle: 'The Shoals · Deep Ice', rect: [46, 21, 58, 29.5], zone: null, mood: MOOD.lair },
    { id: 'deep', name: 'The Deep Ice', subtitle: 'The Shoals · Over the Abyss', rect: [4, 29.5, 64, 46], cam: [32.5, 40.5], zone: 'shoals_deep', mood: MOOD.deep },
  ],
  spawns: {
    from_driftmarket: { x: 1.4, z: 5.5, facing: 'right' },
    from_meridian: { x: 61.6, z: 35.5, facing: 'left' },
    // the Meridian's one-way shortcut out of the reactor hall arrives here (12.4)
    mouth: { x: 6.5, z: 5.5, facing: 'right' },
  },
  anchors: {
    ledge: { x: 8.5, z: 1.8, facing: 'up' },
    grotto: { x: 28.0, z: 4.0, facing: 'up' },
    breach: { x: 59.5, z: 35.5, facing: 'right' },
  },
  exits: [
    { id: 'to_driftmarket', rect: [0, 4, 0.45, 7], to: { map: 'driftmarket', spawn: 'from_shoals' } },
    { id: 'to_meridian', rect: [63.55, 34, 64, 38], to: { map: 'meridian', spawn: 'from_shoals' } },
  ],
  props,
  lights,
  ambient,
  chests: [
    // critical path: the crystal grotto (12.4 gear chest)
    { id: 'grotto', x: 30.5, z: 6.5, item: 'eq_x_frost_charm', prop: 'shoals.iceChest' },
    // off the path: the west alcove of the tunnels
    { id: 'west_cache', x: 2.6, z: 15.2, item: 'ether_plus', n: 1, credits: 180, prop: 'shoals.iceChest' },
    { id: 'deep_rim', x: 6.8, z: 42.4, item: 'cryo_charge', n: 2, prop: 'shoals.iceChest' },
  ],
  interactables: [
    // leader-gated (Nyx): a Meridian cargo lockbox frozen into the side grotto
    {
      id: 'lockbox', kind: 'inspect', x: 44.6, z: 11.2, box: [44.0, 10.6, 45.2, 11.6], leader: 'nyx', label: 'Inspect',
      talk: 'shoals.nyx_lockbox', when: '!shoals:lockbox',
    },
    { id: 'ledge_view', kind: 'inspect', x: 8.5, z: 1.4, box: [7.4, 1.0, 9.6, 1.6], label: 'Look out', talk: 'shoals.view' },
  ],
  triggers: [
    { id: 'enter', on: 'load', when: 'chapter>=ch1 & !story:varo_log', once: true, script: 'shoals.enter' },
  ],
  bosses: [
    // the void eels in the throat between the Mouth and the tunnels: a visible, deterministic eel fight
    // that teaches the dive before the Maw (G2 C3-2); gone once beaten
    {
      id: 'eels', art: 'void_eel', name: 'VOID EELS', x: 19.4, z: 4.8, facing: 'left', encounter: 'shoals_eels',
      script: 'shoals.eels', triggerRadius: 2.8, radius: 0.9, when: 'chapter>=ch1 & !shoals:eels',
    },
    // M3: the optional elite guarding the Ice Heart
    {
      id: 'colossus', art: 'rime_golem', name: 'RIME COLOSSUS', x: 52.0, z: 24.6, facing: 'left',
      encounter: 'shoals_elite_colossus', script: 'shoals.colossus', triggerRadius: 3.2, radius: 1.4,
    },
  ],
  viewpoints: {
    mouth: { x: 9.5, z: 5.5, facing: 'up' },
    grotto: { x: 27.5, z: 5.5, facing: 'up' },
    tunnels: { x: 22.0, z: 17.6, facing: 'left' },
    descent: { x: 37.0, z: 12.0, facing: 'down' },
    deep: { x: 18.5, z: 38.5, facing: 'right' },
    bridge: { x: 39.5, z: 32.6, facing: 'right' },
    breach: { x: 57.5, z: 35.5, facing: 'right' },
    hollow: { x: 52.0, z: 28.4, facing: 'up' },
  },
};
