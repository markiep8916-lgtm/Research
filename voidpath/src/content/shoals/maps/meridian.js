// meridian (PURE MapDef, TECH_PLAN 3.1, 12.5): the wreck of the Meridian, half frozen in the ring.
// Black ice over rusted gunmetal, sodium-orange emergency lamps still pulsing after 80 years, faded
// prayer ribbons. 1 cell = 1 world unit, +Z = south.
//
//   The Broken Spine   the ship's long corridor, cracked open over the rings (hull breach windows
//                      and a fissure); the ribbon wall by the entry. Zone meridian_spine.
//   Cargo Hold         north: emergency lever A (Kesi Danjuma's breakers).            puzzle area
//   Engineering        south: lever B and Danjuma's terminal (Orion only).             puzzle area
//   Captain's Quarters north: sealed until the power returns; Ines Varo's log, her rifle.
//   Pilot's Cabin      north: Tomas Varo's compass (off the path).
//   Reactor Landing    east: an old Med-Station before the reactor hall.
//   Reactor Hall       north-east: sealed by the captain's order until her log is played; the Maw
//                      lies in the black ice before the frozen reactor and the lattice coil.
//
// Spawns (binding): from_shoals, reactor_hall. Shared wall rows between stacked rooms are dividers
// (they sink while the leader stands north of them), as on the Halcyon.

// Readable dark (G2 C3-1): warm haze instead of black, gunmetal mid-tones, and the mood made by
// pools: sodium-orange emergency light every 6-8 units (wall lamps on the north side, tripod lamps on
// the south side), cold blue light through every hull breach and from the ice below, and with the
// power back, warm practical lamps in the hold, the quarters and engineering.
const mood = (fog, sky, extra = {}) => ({
  fog, density: 0.03, sky, ground: '#4a3024', hemi: 1.0, key: 0.5, keyColor: '#ffc89a', fill: 0.45,
  exposure: 1.18, bloom: 1.0, saturation: 1.08, ...extra,
});
const MOOD = {
  spine: mood('#32252a', '#9a92aa'),
  hold: mood('#252c3c', '#8ea2c8', { key: 0.55, keyColor: '#bcd6ff' }),
  quarters: mood('#342826', '#a8948e'),
  eng: mood('#36281f', '#a88a72'),
  hall: mood('#1f2644', '#7286b8', { key: 0.62, keyColor: '#9fc4ff', bloom: 1.05 }),
};

// ---------------------------------------------------------------- props

const lamp = (x, z, extra = {}) => ({ t: 'shoals.emergencyLamp', x, z, ...extra });     // on a north wall, z = wall face
const post = (x, z, extra = {}) => ({ t: 'shoals.lampPost', x, z, ...extra });           // tripod emergency lamp
const ribbon = (x, z, extra = {}) => ({ t: 'shoals.ribbons', x, z, ...extra });
const debris = (x, z, extra = {}) => ({ t: 'shoals.debris', x, z, ...extra });
const pod = (x, z, extra = {}) => ({ t: 'shoals.merPod', x, z, ...extra });
const cargo = (x, z, extra = {}) => ({ t: 'shoals.frozenCargo', x, z, rust: true, ...extra });
const icicles = (x0, x1, z, extra = {}) => ({ t: 'shoals.icicles', x0, x1, z, dark: true, ...extra });
const sheet = (x, z, w, d, rot = 0) => ({ t: 'shoals.iceSheet', x, z, w, d, rot });
// pools of light on the deck (they read on every quality tier, whatever the point-light pool holds)
const pool = (x, z, r, color, k, extra = {}) => ({ t: 'shoals.pool', x, z, r, color, k, ...extra });
const amber = (x, z, r = 2.5, extra = {}) => pool(x, z, r, '#ff8a2a', 0.42, extra);
const cold = (x, z, r = 2.3, extra = {}) => pool(x, z, r, '#5f9cff', 0.34, extra);
const warm = (x, z, r = 3.4, extra = {}) => pool(x, z, r, '#ffc27a', 0.36, { when: 'story:meridian_power', ...extra });

const props = [
  // ---- the Broken Spine
  ribbon(14.5, 12.05, { w: 4 }),
  lamp(3.5, 12.02, { on: 'hold' }), lamp(11.5, 12.02, { on: 'hold' }), lamp(15.5, 12.02), lamp(27.5, 12.02, { on: 'cabin' }), lamp(39.5, 12.02),
  { t: 'shoals.shaft', x: 36, y: 2.62, z: 12.06, h: 5 }, { t: 'shoals.shaft', x: 38, y: 2.62, z: 12.06, h: 5, tilt: 0.04 },
  post(7.6, 17.2), post(19.6, 17.3, { rot: 0.6 }), post(33.8, 17.3, { rot: 1.2 }),
  amber(3.5, 13.6, 2.4, { sz: 0.85 }), amber(11.5, 13.6, 2.4, { sz: 0.85 }), amber(15.5, 13.6, 2.2, { sz: 0.85 }),
  amber(27.5, 13.6, 2.4, { sz: 0.85 }), amber(39.5, 13.8, 2.4, { sz: 0.85 }),
  amber(7.6, 16.4, 2.6), amber(19.6, 16.5, 2.6), amber(33.8, 16.5, 2.4),
  cold(2.4, 15.0, 2.2), cold(37.0, 13.6, 2.6, { sx: 1.3 }), cold(31.0, 17.4, 2.0, { k: 0.4 }),
  warm(8.0, 15.0, 3.6), warm(20.0, 15.0, 3.6), warm(32.0, 15.0, 3.2),
  debris(5.0, 16.4, { rot: 0.3 }), debris(33.6, 13.0, { rot: -0.6, s: 1.2 }), debris(38.6, 16.6, { rot: 1.2, s: 0.8 }),
  pod(9.2, 12.6, { open: true }), pod(10.4, 12.6, { open: true }), pod(18.4, 12.6), pod(19.6, 12.6, { open: true }),
  cargo(36.2, 12.8, { rot: 0.2, s: 0.9 }), cargo(24.8, 16.6, { rot: -0.4, s: 0.8 }),
  icicles(1, 1, 12), icicles(2, 6, 12, { on: 'hold' }), icicles(12, 14, 12, { on: 'hold' }), icicles(16, 20, 12, { on: 'quarters' }),
  icicles(23, 27, 12, { on: 'quarters' }), icicles(28, 34, 12, { on: 'cabin' }), icicles(39, 41, 12),
  { t: 'shoals.fissureGlow', x: 31.0, z: 17.0, w: 4.0, d: 2.0 },
  sheet(3.8, 15.0, 6.4, 5.2, 0.2), sheet(18.6, 16.2, 9.0, 3.0, 0.05), sheet(30.2, 13.2, 7.6, 2.8, -0.1), sheet(38.2, 16.4, 5.6, 2.6, 0.3),
  { t: 'decal', name: 'sh_decal_rust', x: 26.0, z: 13.4, rot: 3 },
  { t: 'decal', name: 'sh_decal_rust', x: 12.6, z: 16.6, rot: 1 },
  // guides: the power conduits from both levers converge on the quarters door
  { t: 'guide', id: 'conduit_a', from: [8.5, 12.7], to: [20.6, 12.7], color: '#ff8a2a', link: 'lever_a' },
  { t: 'guide', id: 'conduit_b', from: [23.5, 17.4], to: [22.6, 12.7], color: '#ff8a2a', link: 'lever_b' },
  // ---- Cargo Hold
  cargo(4.4, 4.2, { rot: 0.1 }), cargo(5.6, 4.0, { rot: -0.2, s: 0.8 }), cargo(12.2, 9.4, { rot: 0.5 }), cargo(12.4, 4.6),
  cargo(4.0, 9.2, { s: 0.9 }), debris(9.4, 7.2, { rot: 2.1 }), post(6.6, 9.8, { rot: 0.3 }),
  lamp(8.5, 3.02), icicles(3, 6, 3), icicles(8, 10, 3), icicles(12, 14, 3),
  amber(8.5, 4.6, 2.2), amber(6.6, 9.4, 2.4), cold(6.5, 4.4, 2.0), cold(10.5, 4.4, 2.0), pool(10.6, 4.9, 1.2, '#ff4a3a', 0.3),
  warm(8.5, 6.8, 3.8),
  { t: 'guide', id: 'conduit_hold', from: [10.6, 4.0], to: [8.2, 10.6], color: '#ff8a2a', link: 'lever_a' },
  // ---- Captain's Quarters (a porthole onto Tethys over the bunk side; her desk faces the door)
  { t: 'shoals.captainDesk', x: 21.5, z: 4.6 },
  { t: 'shoals.bunk', x: 25.4, z: 5.2 },
  { t: 'shoals.footlocker', x: 25.6, z: 9.4, when: '!story:varo_log' },   // shut until her log has played
  ribbon(23.0, 4.05, { w: 1.0 }), lamp(24.5, 4.02), lamp(17.4, 4.02), post(18.4, 9.8, { rot: 0.8 }), post(26.4, 7.6, { rot: 2.2 }),
  amber(24.5, 5.4, 2.2), amber(17.4, 5.2, 2.0), amber(18.6, 9.4, 2.4), amber(26.0, 7.8, 2.4), cold(18.5, 5.0, 2.2), pool(21.5, 5.6, 1.4, '#7ff4ff', 0.3, { when: 'story:meridian_power & !story:varo_log' }),
  warm(21.5, 7.4, 3.6), warm(25.4, 6.2, 1.8, { k: 0.28 }),
  { t: 'decal', name: 'sh_decal_rust', x: 23.0, z: 8.4, rot: 2 },
  // ---- Pilot's Cabin
  { t: 'shoals.bunk', x: 31.5, z: 6.6, rot: Math.PI / 2 }, icicles(29, 33, 6),
  cold(31.5, 7.8, 2.0), amber(30.0, 9.4, 1.8), warm(31.5, 8.2, 2.6),
  // ---- Engineering
  { t: 'shoals.breakerBank', x: 21.0, z: 19.2 }, { t: 'shoals.breakerBank', x: 26.0, z: 19.2 },
  debris(19.6, 26.2, { rot: 0.4 }), cargo(28.6, 26.4, { rot: -0.3, s: 0.85 }), pod(18.8, 22.8, { rot: Math.PI / 2 }),
  post(27.8, 20.6, { rot: 0.9 }), post(22.2, 27.2, { rot: 0.2 }),
  icicles(18, 29, 19, { on: 'eng' }),
  amber(21.0, 20.4, 2.2), amber(27.8, 21.0, 2.3), amber(22.2, 26.6, 2.6), pool(23.5, 24.0, 3.4, '#ff5a2a', 0.3, { sx: 1.25 }),
  cold(19.6, 25.0, 1.8), pool(29.2, 22.0, 1.2, '#ff4a3a', 0.3),
  warm(23.5, 22.6, 4.4),
  { t: 'guide', id: 'conduit_eng', from: [29.4, 21.4], to: [24.0, 18.6], color: '#ff8a2a', link: 'lever_b' },
  // ---- Reactor Landing
  lamp(44.5, 10.02, { on: 'reactor' }), debris(48.6, 17.6, { rot: -1.1 }), cargo(42.6, 18.4, { rot: 0.6 }), post(48.8, 11.4, { rot: 0.4 }),
  sheet(45.8, 16.4, 6.0, 3.4, 0.4),
  amber(44.5, 11.6, 2.2), amber(48.8, 12.0, 2.4), pool(42.0, 11.3, 1.3, '#5dff9c', 0.22), cold(45.6, 15.8, 2.6),
  warm(46.0, 14.0, 3.6),
  // ---- Reactor Hall
  { t: 'shoals.reactor', id: 'reactor', x: 51.0, z: 2.6 },
  lamp(52.5, 1.02), icicles(42, 44, 1), icicles(47, 54, 1), icicles(57, 61, 1),
  sheet(51.0, 5.0, 15.5, 7.4), { t: 'shoals.iceMound', x: 51.0, z: 5.6, w: 9, d: 3.4 },
  pool(51.0, 3.9, 3.0, '#ff6a2a', 0.36), pool(51.0, 6.2, 3.4, '#8a5cff', 0.34, { sz: 0.7, when: '!defeated:shoals_boss_maw' }),
  cold(45.5, 3.0, 2.4), cold(55.5, 3.0, 2.4), amber(52.5, 2.2, 1.6), cold(44.0, 7.0, 1.8), cold(58.6, 7.0, 1.8),
  debris(44.0, 7.0, { rot: 0.8, s: 1.1 }), debris(58.6, 7.2, { rot: -0.4 }), cargo(59.2, 3.0, { rot: 0.3 }),
  ribbon(43.4, 1.05, { w: 1.6 }),
];

// ---------------------------------------------------------------- lights (virtual)

const sodium = (x, z, intensity = 14, extra = {}) => ({
  x, y: 1.5, z, color: '#ff8a2a', intensity, distance: 8, mode: 'pulse', amount: 0.3, speed: 0.9, ...extra,
});
const space = (x, z, extra = {}) => ({ x, y: 2.2, z, color: '#9fc4ff', intensity: 11, distance: 8, ...extra });
const practical = (x, z, intensity = 16, extra = {}) => ({
  x, y: 2.4, z, color: '#ffd9a0', intensity, distance: 8, when: 'story:meridian_power', tag: 'bus', ...extra,
});

const lights = [
  // spine: emergency lamps on the north wall, tripod lamps on the south side; with the power back
  // the bus lamps join them
  sodium(3.5, 13.1), sodium(11.5, 13.1, 13, { speed: 1.1 }), sodium(15.5, 13.1, 12, { speed: 0.8 }), sodium(27.5, 13.1),
  sodium(39.5, 13.1, 13, { speed: 1.2 }),
  sodium(7.6, 17.3, 14, { speed: 0.7 }), sodium(19.6, 17.4, 14, { speed: 1.0 }), sodium(33.8, 17.4, 13, { speed: 0.85 }),
  space(36.0, 12.8), space(38.0, 12.8),
  { x: 2.4, y: 2.0, z: 15.0, color: '#9fb8e8', intensity: 11, distance: 7 },   // the Shoals' cold light at the entry
  { x: 31.0, y: -0.6, z: 17.0, color: '#4a8cff', intensity: 14, distance: 6 },
  practical(8.0, 15.0), practical(20.0, 15.0), practical(32.0, 15.0),
  { x: 21.5, y: 1.4, z: 12.4, color: '#ff3b2e', intensity: 3.5, distance: 3.5, when: '!story:meridian_power', tag: 'quarters_lock' },
  { x: 21.5, y: 1.4, z: 12.4, color: '#4dff9c', intensity: 3.5, distance: 3.5, when: 'story:meridian_power', tag: 'quarters_lock' },
  // hold
  sodium(8.5, 3.9, 12), sodium(6.6, 9.9, 13, { speed: 1.2 }), space(6.5, 3.6), space(10.5, 3.6),
  { x: 10.6, y: 1.0, z: 4.4, color: '#ff6a3a', intensity: 8, distance: 4, mode: 'pulse', amount: 0.5, speed: 2, when: '!sw:meridian:lever_a' },
  { x: 10.6, y: 1.0, z: 4.4, color: '#4dff9c', intensity: 8, distance: 4, when: 'sw:meridian:lever_a' },
  practical(8.5, 6.8, 18),
  // quarters
  sodium(24.5, 4.9, 11, { speed: 0.6 }), sodium(17.4, 4.9, 10, { speed: 1.3 }), sodium(18.4, 9.9, 12, { speed: 0.9 }),
  sodium(26.4, 7.7, 11, { speed: 1.1 }),
  space(18.5, 4.2, { intensity: 10 }),
  { x: 21.5, y: 1.4, z: 5.2, color: '#ffb35a', intensity: 9, distance: 5, when: 'story:meridian_power' },
  { x: 21.5, y: 1.6, z: 5.6, color: '#7ff4ff', intensity: 8, distance: 4, mode: 'pulse', amount: 0.3, speed: 1.4, when: 'story:meridian_power & !story:varo_log' },
  practical(21.5, 7.4, 16), practical(25.6, 6.2, 6, { y: 1.3, distance: 4, color: '#ffc27a' }),
  // cabin
  { x: 31.5, y: 1.8, z: 7.5, color: '#8fb8ff', intensity: 9, distance: 5 },
  { x: 30.0, y: 1.0, z: 9.0, color: '#ff8a2a', intensity: 6, distance: 4, mode: 'pulse', amount: 0.4, speed: 0.7 },
  practical(31.5, 8.2, 10, { distance: 6 }),
  // engineering
  sodium(21.0, 20.2, 12, { speed: 1.0 }), sodium(27.8, 20.7, 13, { speed: 0.75 }), sodium(22.2, 27.3, 13, { speed: 1.15 }),
  { x: 29.2, y: 1.2, z: 22.0, color: '#ff6a3a', intensity: 8, distance: 4, mode: 'pulse', amount: 0.5, speed: 2, when: '!sw:meridian:lever_b' },
  { x: 29.2, y: 1.2, z: 22.0, color: '#4dff9c', intensity: 8, distance: 4, when: 'sw:meridian:lever_b' },
  { x: 23.5, y: 0.6, z: 24.0, color: '#ff4a2a', intensity: 11, distance: 6, mode: 'pulse', amount: 0.3, speed: 0.8 },
  { x: 19.6, y: 1.4, z: 25.0, color: '#5fb8ff', intensity: 8, distance: 5 },
  practical(23.5, 22.6, 20),
  // landing
  sodium(44.5, 10.9, 12), sodium(48.8, 11.5, 13, { speed: 1.1 }),
  { x: 42.0, y: 1.8, z: 11.0, color: '#5dff9c', intensity: 4, distance: 4.5, mode: 'pulse', amount: 0.3, speed: 2.4 },
  { x: 46.5, y: 1.4, z: 10.4, color: '#ff3b2e', intensity: 3.5, distance: 3.5, when: '!story:varo_log', tag: 'reactor_lock' },
  { x: 46.5, y: 1.4, z: 10.4, color: '#4dff9c', intensity: 3.5, distance: 3.5, when: 'story:varo_log', tag: 'reactor_lock' },
  { x: 45.6, y: 2.0, z: 15.8, color: '#9fc4ff', intensity: 10, distance: 7 },
  practical(46.0, 14.0, 16),
  // reactor hall: the reactor still runs warm under the ice; the Maw's glow and a cold light on its face;
  // Tethys through the breaches
  { x: 51.0, y: 1.6, z: 3.6, color: '#ff6a2a', intensity: 24, distance: 10, decay: 1.4, mode: 'reactor', tag: 'reactor' },
  { x: 51.0, y: 0.6, z: 6.6, color: '#7a5cff', intensity: 10, distance: 6, mode: 'pulse', amount: 0.35, speed: 0.6, tag: 'maw', when: '!defeated:shoals_boss_maw' },
  { x: 51.0, y: 3.0, z: 7.0, color: '#9fd0ff', intensity: 12, distance: 6.5, when: '!defeated:shoals_boss_maw' },   // cold light on the sleeper's face
  space(45.5, 1.8), space(55.5, 1.8),
  sodium(52.5, 1.9, 10, { speed: 0.7 }),
  { x: 44.0, y: 1.2, z: 6.8, color: '#4fa8ff', intensity: 9, distance: 5 },
  { x: 58.6, y: 1.2, z: 6.8, color: '#4fa8ff', intensity: 9, distance: 5 },
];

const ambient = [
  { preset: 'snow', x: 20.5, y: 1.8, z: 14.5, area: [40, 2.6, 5], rate: 6, color: '#ffd9b8' },
  { preset: 'dust', x: 20.5, y: 1.4, z: 14.5, area: [40, 2.4, 5], rate: 3, color: '#ffbf8a' },
  { preset: 'spark', x: 33.6, y: 2.4, z: 12.4, area: [0.2, 0.2, 0.2], rate: 0.5, burst: 10 },
  { preset: 'spark', x: 11.5, y: 2.6, z: 12.3, area: [0.2, 0.2, 0.2], rate: 0.35, burst: 8 },
  { preset: 'frost', x: 31.0, y: -0.4, z: 17.0, area: [3.6, 1.2, 1.6], rate: 5 },
  { preset: 'snow', x: 8.5, y: 1.8, z: 6.5, area: [11, 2.6, 8], rate: 3 },
  { preset: 'dust', x: 8.5, y: 1.4, z: 6.5, area: [11, 2.4, 8], rate: 2, color: '#9fc4ff' },
  { preset: 'dust', x: 21.5, y: 1.4, z: 7.0, area: [10, 2.4, 7], rate: 2, color: '#ffc89a' },
  { preset: 'snow', x: 31.5, y: 1.6, z: 8.0, area: [5, 2.2, 5], rate: 1.5 },
  { preset: 'dust', x: 23.5, y: 1.4, z: 23.0, area: [12, 2.4, 9], rate: 3, color: '#ffb07a' },
  { preset: 'spark', x: 21.0, y: 1.6, z: 19.6, area: [0.3, 0.3, 0.2], rate: 0.6, burst: 8 },
  { preset: 'ember', x: 23.5, y: 0.2, z: 24.0, area: [6, 0.2, 2], rate: 3 },
  { preset: 'snow', x: 45.5, y: 1.8, z: 14.5, area: [10, 2.6, 10], rate: 3, color: '#ffd9b8' },
  { preset: 'snow', x: 51.0, y: 1.8, z: 4.5, area: [18, 2.6, 8], rate: 6 },
  { preset: 'frost', x: 51.0, y: 0.4, z: 5.6, area: [8, 0.6, 3], rate: 6 },
  { preset: 'ember', x: 51.0, y: 0.6, z: 3.2, area: [2, 0.4, 1], rate: 4 },
];

// ---------------------------------------------------------------- map

const door = { t: 'door', tex: 'sh_mer_door', lockedTex: 'sh_mer_door_locked', floor: 'sh_mer_floor' };
const wall = (tex) => ({ t: 'wall', tex, side: 'sh_mer_wall_side', cap: 'sh_mer_cap', low: 'sh_mer_low', emissive: 2.3, roughness: 0.7, metalness: 0.2 });

export default {
  id: 'meridian',
  name: 'Wreck of the Meridian',
  region: 'Tethys Ring',
  music: 'meridian',
  mood: MOOD.spine,
  grid: [
    '                                         ##m#WW##p##l##WW##m##', // 0
    '                                         #...................#', // 1
    '  p###WW##WW####                         #...................#', // 2
    '  #...........####WW####l###             #...................#', // 3
    '  #...........###..........#             #...................#', // 4
    '  #...........###..........####p###      #...................#', // 5
    '  #...........###..........##.....#      #...................#', // 6
    '  #...........###..........##.....#      #...................#', // 7
    '  #...........###..........##.....#      #...................#', // 8
    '  #...........###..........##.....#     #p##l#RR##############', // 9
    '  #...........###..........##.....#     #..........#          ', // 10
    '#m#l###DD##l#m#l####mQQ####l##DD#m#VvYyl#..........#          ', // 11
    '#..................................................#          ', // 12
    '..........................................:::::::::#          ', // 13
    '..........................................:::::::::#          ', // 14
    '..........................................:::::::::#          ', // 15
    '..............................__...................#          ', // 16
    '#............................____..................#          ', // 17
    '#####################l#DD#p#l############..........#          ', // 18
    '                 #............#         #..........#          ', // 19
    '                 #............#         ############          ', // 20
    '                 #............#                               ', // 21
    '                 #............#                               ', // 22
    '                 #..::::::::..#                               ', // 23
    '                 #..::::::::..#                               ', // 24
    '                 #..::::::::..#                               ', // 25
    '                 #............#                               ', // 26
    '                 #............#                               ', // 27
    '                 ##############                               ', // 28
    '                                                              ', // 29
  ],
  legend: {
    '#': wall('sh_mer_wall'),
    l: wall('sh_mer_wall_lamp'),
    m: wall('sh_mer_wall_mark'),
    p: wall('sh_mer_wall_pipes'),
    W: { t: 'window', tex: 'sh_mer_breach', backdrop: 'sh_bd_ring' },
    // the spine's two breaches are painted: the cabin and the reactor hall lie behind them, where a
    // window's space box would cut in
    V: wall('sh_mer_breach_l'), v: wall('sh_mer_breach_r'), Y: wall('sh_mer_breach_l2'), y: wall('sh_mer_breach_r2'),
    D: door,
    Q: { ...door, lock: { flag: 'story:meridian_power', id: 'quarters_door', label: 'Inspect', talk: 'shoals.quarters_door', toast: 'The quarters door *unseals*' } },
    R: { ...door, lock: { flag: 'story:varo_log', id: 'reactor_door', label: 'Inspect', talk: 'shoals.reactor_door', toast: 'Reactor hall *unsealed*' } },
    '.': { t: 'floor', tex: 'sh_mer_floor', mix: [['sh_mer_floor_b', 0.3]], grime: 0.06, roughness: 0.55, metalness: 0.45, emissive: 2.0 },
    ':': { t: 'floor', tex: 'sh_mer_grate', roughness: 0.5, metalness: 0.5, emissive: 2.4 },
    _: { t: 'pit', edge: 'sh_mer_edge', thickness: 0.8, emissive: 2.0 },
  },
  wallTex: { side: 'sh_mer_wall_side', cap: 'sh_mer_cap', low: 'sh_mer_low' },
  backdrop: { texture: 'sh_bd_ring', stars: 'stars_layer', tint: [1, 1, 1.05] },
  // the wreck lies open to the ring: Tethys and the ice beyond the broken hull, not a black void
  sky: { texture: 'sh_bd_ring', stars: 'stars_layer', horizonV: 0.58, edge: 'north', parallax: 0.12, tint: [0.85, 0.85, 0.95] },
  // the wreck lies in the Shoals ice: past its hull, look down into deep blue ice, not open stars
  underlay: { texture: 'sh_abyss', y: -6, repeat: [6, 6], scroll: [0.001, 0.002], color: [0.75, 0.9, 1.15] },
  dividers: [
    { id: 'hold', row: 11, rect: [2, 11, 14, 11] },
    { id: 'quarters', row: 11, rect: [16, 11, 27, 11] },
    { id: 'cabin', row: 11, rect: [28, 11, 34, 11] },
    { id: 'eng', row: 18, rect: [17, 18, 30, 28] },
    { id: 'reactor', row: 9, rect: [40, 9, 51, 20] },
  ],
  areas: [
    { id: 'hold', name: 'Cargo Hold', subtitle: 'Wreck of the Meridian · Deck 3', rect: [2, 2, 15, 11.5], zone: null, puzzle: true, mood: MOOD.hold },
    { id: 'quarters', name: 'Captain\'s Quarters', subtitle: 'Wreck of the Meridian · Command', rect: [16, 3, 28, 11.5], zone: null, mood: MOOD.quarters },
    { id: 'cabin', name: 'Pilot\'s Cabin', subtitle: 'Wreck of the Meridian · Command', rect: [28, 5, 35, 11.5], zone: null, mood: MOOD.quarters },
    { id: 'eng', name: 'Engineering', subtitle: 'Wreck of the Meridian · Power', rect: [17, 18.5, 31, 29], zone: null, puzzle: true, mood: MOOD.eng },
    { id: 'hall', name: 'Reactor Hall', subtitle: 'Wreck of the Meridian · Core', rect: [41, 0, 62, 9.5], cam: [3.4, 6.2], zone: null, mood: MOOD.hall,
      focus: { x: 51.0, y: 1.0, z: 5.4, w: 0.55, band: 0.2, whileBoss: 'maw' } },
    { id: 'spine', name: 'The Broken Spine', subtitle: 'Wreck of the Meridian', rect: [0, 11.5, 52, 21], cam: [13.2, 15.6], zone: 'meridian_spine', mood: MOOD.spine },
  ],
  spawns: {
    from_shoals: { x: 1.4, z: 14.6, facing: 'right' },
    reactor_hall: { x: 46.5, z: 8.6, facing: 'up' },   // outside the Maw's reach, so it arms
    entry: { x: 4.5, z: 14.6, facing: 'right' },
    log: { x: 21.5, z: 6.6, facing: 'up' },
  },
  anchors: {
    ribbons: { x: 14.5, z: 13.0, facing: 'up' },
    quarters_door: { x: 21.5, z: 12.9, facing: 'up' },
    reactor_core: { x: 51.0, z: 3.9, facing: 'up' },
  },
  exits: [
    { id: 'to_shoals', rect: [0, 13, 0.45, 17], to: { map: 'shoals', spawn: 'from_meridian' } },
  ],
  props,
  lights,
  ambient,
  chests: [
    // critical path: Varo's Long Gun in the captain's footlocker (after her log)
    { id: 'long_gun', x: 25.6, z: 9.4, item: 'eq_w_nyx_3', prop: 'shoals.footlocker', when: 'story:varo_log', talk: 'shoals.long_gun' },
    // off the path: Tomas Varo's compass in the pilot's cabin
    { id: 'compass', x: 32.6, z: 9.2, item: 'eq_x_varo_compass', prop: 'shoals.footlocker' },
    { id: 'hold_cache', x: 12.4, z: 7.2, item: 'medigel_plus', n: 2, prop: 'shoals.iceChest', propFields: { rust: true } },
    { id: 'eng_cache', x: 19.4, z: 20.4, item: 'stim', n: 2, credits: 120, prop: 'shoals.iceChest', propFields: { rust: true } },
  ],
  interactables: [
    // the power puzzle: Danjuma's two emergency levers (11.8, story:meridian_power)
    {
      id: 'lever_a', kind: 'switch', x: 10.6, z: 4.4, box: [10.0, 3.6, 11.2, 4.8], flag: 'sw:meridian:lever_a', mode: 'once',
      label: 'Pull', prop: 'shoals.powerLever', propFields: { x: 10.6, z: 3.7 }, script: 'shoals.lever', sfx: 'unlock',
    },
    {
      id: 'lever_b', kind: 'switch', x: 29.0, z: 22.0, box: [28.9, 21.4, 30.0, 22.6], flag: 'sw:meridian:lever_b', mode: 'once',
      label: 'Pull', prop: 'shoals.powerLever', propFields: { x: 29.75, z: 22.0, rot: -Math.PI / 2 }, script: 'shoals.lever', sfx: 'unlock',
    },
    // Ines Varo's log (key scene) and the ribbon wall
    {
      id: 'varo_log', kind: 'terminal', x: 21.5, z: 5.6, box: [20.8, 4.6, 22.2, 5.6], label: 'Play log', icon: 'inspect',
      talk: [{ when: '!story:varo_log', script: 'shoals.varo_log' }, { script: 'shoals.varo_log_after' }],
    },
    { id: 'ribbons', kind: 'inspect', x: 14.5, z: 12.6, box: [12.6, 12.0, 16.4, 12.8], label: 'Look', talk: 'shoals.ribbons' },
    // leader-gated (Orion): Kesi Danjuma's engineering terminal
    {
      id: 'danjuma', kind: 'terminal', x: 21.0, z: 19.8, box: [20.4, 19.2, 21.6, 20.2], leader: 'orion', label: 'Coax', icon: 'inspect',
      talk: 'shoals.orion_terminal',
    },
    // the landing's Med-Station, far enough from the Maw (beyond its trigger radius + 2.5) that a Retry re-arms it
    { id: 'med', kind: 'med', x: 42.0, z: 10.62, box: [41.48, 10.0, 42.52, 10.66], prop: 'med', propFields: { x: 42.0, z: 10.34 }, prompt: 'An old Meridian Med-Station, still on emergency power. Restore the squad?' },
    // the one-way shortcut back to the Shoals Mouth (12.4), once the Maw is gone
    {
      id: 'chute', kind: 'exit', x: 59.5, z: 7.6, box: [58.8, 7.0, 60.4, 8.2], label: 'Ride the cargo chute', icon: 'travel',
      to: { map: 'shoals', spawn: 'mouth' }, transition: 'fade', when: 'defeated:shoals_boss_maw', prop: 'shoals.chute', propFields: { x: 59.5, z: 7.4 },
    },
  ],
  triggers: [
    { id: 'arrival', on: 'load', when: 'chapter>=ch1 & !story:meridian_power', once: true, script: 'shoals.meridian_arrival' },
    { id: 'power', on: 'flag', when: 'chapter>=ch1 & sw:meridian:lever_a & sw:meridian:lever_b & !story:meridian_power', once: true, script: 'shoals.power_restored' },
  ],
  bosses: [
    {
      id: 'maw', art: 'maw_lurk', name: 'THE MAW', x: 51.0, z: 5.4, facing: 'left', encounter: 'shoals_boss_maw',
      script: 'shoals.maw', triggerRadius: 3.8, radius: 2.4, focus: true, light: 'maw',
    },
  ],
  viewpoints: {
    spine: { x: 9.0, z: 15.0, facing: 'right' },
    breach: { x: 34.0, z: 14.0, facing: 'up' },
    hold: { x: 8.5, z: 8.0, facing: 'up' },
    quarters: { x: 21.5, z: 8.4, facing: 'up' },
    eng: { x: 23.5, z: 24.5, facing: 'up' },
    landing: { x: 46.0, z: 15.0, facing: 'up' },
    hall: { x: 48.4, z: 8.7, facing: 'up' },   // outside the Maw's reach, the reactor and the Maw in frame
  },
};
