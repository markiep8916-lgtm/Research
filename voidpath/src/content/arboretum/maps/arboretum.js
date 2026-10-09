// arboretum (PURE MapDef, TECH_PLAN 3.1, 12.5): the Halcyon's biodome deck after 412 days. Deep
// green and bioluminescent teal under warm Tethys light falling through the domes; ferns and vines
// over steel, sprinkler rain, fireflies, glowing water channels. 1 cell = 1 world unit, +Z = south.
//
//   The Dock (south-west)     the Moth's pad, a Starchart, a Med-Station, valve A by the dock canal
//   The Fern Walk (south)     raised fern beds wind east (zone arb_gardens); the spore drones' lesson
//   The Pump House (south-east)  valve B by the pump canal; the tending drones            puzzle area
//   The Glasshouse (middle)   tall planters wind back west (zone arb_gardens); the Seedling Spear
//   The Channels (west)       the hall's basin and the sluice valves, left and right      puzzle area
//   Stasis Gardens (north)    pods banked in roots, sorted like seed packets (zone arb_stasis); the
//                             caretaker's lesson; Esme Dubois's failing pod (Sera)
//   Choir Gate (north-east)   the court where the Gardener tends the door; the lift down to the dock
//   Choir Chamber (top)       a cathedral of humming pods, gold-lit; Theo in pod 2271 at the head
//   The Glass / Seed Vault    off the path, north of the hall: the dome windows on Tethys (anchor
//                             `glass`), the seed vault's secret
//
// Binding (12.5): spawns dock, channels, stasis, choir; anchor glass. The puzzle's water bodies are
// the legend characters A (dock canal), B (pump canal) and C (the hall's basin, dry until valve B
// diverts the pumps into it). Shared wall rows between strips are dividers (rows 14, 28, 42).

const SLUICE = 'arb:sluice | story:channels_drained';

// ---------------------------------------------------------------- moods (12.1: humid green haze)

const mood = (extra = {}) => ({
  fog: '#0b1a14', density: 0.022, sky: '#8fe0c8', ground: '#1a3022', hemi: 1.05,
  key: 1.4, keyColor: '#ffd08a', fill: 0.62, exposure: 1.5, bloom: 0.95, saturation: 1.1, ...extra,
});
const MOOD = {
  dock: mood({ fog: '#0c1a1a', sky: '#86d6d0', key: 1.0 }),
  fern: mood(),
  pump: mood({ fog: '#0b1716', sky: '#89d4dc', key: 1.3, keyColor: '#ffc27a', hemi: 1.15, exposure: 1.5 }),
  glass: mood({ fog: '#101d12', sky: '#9be0b0', key: 1.3, keyColor: '#ffcf86' }),
  hall: mood({ fog: '#0a1718', sky: '#82dae0', key: 1.25, keyColor: '#ffcb8a' }),
  stasis: mood({ fog: '#0d1715', sky: '#98d4c4', hemi: 1.1, key: 1.3, keyColor: '#ffd9a0', exposure: 1.6 }),
  court: mood({ fog: '#121a10', sky: '#a6d89a', key: 1.15, keyColor: '#ffd890' }),
  choir: mood({ fog: '#17120a', sky: '#ffe2a0', ground: '#1a1408', hemi: 0.55, key: 0.5, keyColor: '#ffe0a0', fill: 0.4, exposure: 0.78, bloom: 0.7, saturation: 1.05 }),
  view: mood({ fog: '#101a18', sky: '#ffd9a8', key: 1.35, keyColor: '#ffcf8c', hemi: 0.8 }),
};

// ---------------------------------------------------------------- props

const fern = (x, z, extra = {}) => ({ t: 'arb.fern', x, z, ...extra });
const bloom = (x, z, extra = {}) => ({ t: 'arb.bloom', x, z, ...extra });
const bedPlants = (c, r0, r1, extra = {}) => ({ t: 'arb.bedPlants', c, r0, r1, ...extra });
const tree = (x, z, extra = {}) => ({ t: 'arb.tree', x, z, ...extra });
const vines = (x0, x1, z, extra = {}) => ({ t: 'arb.vines', x0, x1, z, ...extra });
const shaft = (x, z, extra = {}) => ({ t: 'arb.domeShaft', x, z, ...extra });
const sprinkler = (x, z, extra = {}) => ({ t: 'arb.sprinkler', x, z, ...extra });
const pod = (x, z, extra = {}) => ({ t: 'arb.pod', x, z, ...extra });
const lamp = (x, z, extra = {}) => ({ t: 'arb.lamp', x, z, ...extra });

// Fern Walk beds (columns c, c+1; rows r0..r1) and the Glasshouse's tall planters
const FERN_BEDS = [[18, 43, 51], [23, 46, 54], [28, 43, 51], [33, 46, 54], [38, 43, 51], [43, 46, 54], [48, 43, 51], [53, 46, 54]];
const GLASS_BEDS = [[63, 29, 38], [58, 32, 41], [53, 29, 38], [48, 32, 41], [43, 29, 38], [38, 32, 41], [33, 29, 38], [28, 32, 41], [23, 29, 38]];
const POD_BANKS = [[21, 15, 24], [26, 18, 27], [31, 15, 24], [36, 18, 27], [41, 15, 24], [46, 18, 27], [51, 15, 24]];

const props = [
  // ---- The Dock
  { t: 'pro.moth', x: 6.4, z: 49.6 },
  { t: 'arb.decal', x: 6.5, z: 49.5, kind: 'ring', w: 6.6, d: 6.6 },
  { t: 'guide', id: 'guide_a', from: [11.2, 44.2], to: [12.2, 47.6], color: '#4dffd2', link: 'valve_a' },
  lamp(2.5, 43.1), lamp(10.5, 43.1, { cool: true }),
  fern(1.6, 54.2, { s: 1.2 }), fern(11.2, 54.4), bloom(10.8, 53.6, { hue: 'pink' }),
  vines(1, 11, 43.02, { on: 'n42' }),
  sprinkler(6.0, 46.0),
  // ---- The Fern Walk
  ...FERN_BEDS.map(([c, r0, r1]) => bedPlants(c, r0, r1, { kind: 'fern', south: r1 === 54 })),
  shaft(16.0, 46.0), shaft(30.5, 48.5), shaft(41.0, 46.5), shaft(51.0, 49.0),
  sprinkler(21.0, 44.0), sprinkler(36.0, 53.0), sprinkler(46.0, 44.0),
  vines(14, 57, 43.02, { on: 'n42' }),
  fern(14.6, 54.3, { s: 1.3 }), fern(56.6, 54.3, { s: 1.2 }), bloom(25.6, 53.8, { hue: 'violet' }), bloom(45.4, 53.8),
  // ---- The Pump House
  { t: 'arb.pump', x: 66.0, z: 52.6 }, { t: 'arb.pump', x: 69.0, z: 49.0, s: 0.8 },
  { t: 'guide', id: 'guide_b', from: [61.0, 45.2], to: [62.5, 44.2], color: '#4dffd2', link: 'valve_b' },
  lamp(61.5, 45.1), lamp(68.5, 45.1, { cool: true }),
  vines(59, 70, 43.02, { on: 'n42' }),
  fern(59.8, 54.2, { s: 1.2 }), fern(70.2, 47.4, { kind: 'leaf' }), bloom(70.3, 51.6, { hue: 'violet' }), fern(63.4, 54.3),
  shaft(65.0, 49.5, { s: 1.2 }), sprinkler(68.6, 52.8),
  { t: 'arb.decal', x: 63.0, z: 50.0, kind: 'puddle', w: 2.8, d: 2.2, rot: 0.7 },
  { t: 'arb.decal', x: 67.2, z: 47.0, kind: 'mossPatch', w: 2.6, d: 2.6, rot: 1.9 },
  // ---- The Glasshouse
  ...GLASS_BEDS.map(([c, r0, r1]) => bedPlants(c, r0, r1, { kind: 'tall', south: r1 === 41 })),
  tree(68.0, 32.0), tree(20.0, 31.0, { s: 0.9 }),
  shaft(66.0, 34.0), shaft(56.0, 30.5), shaft(46.0, 38.0), shaft(36.0, 30.5), shaft(26.0, 38.5),
  sprinkler(60.5, 30.0), sprinkler(40.5, 40.0), sprinkler(25.5, 30.0),
  vines(17, 70, 29.02, { on: 'n28' }),
  { t: 'arb.fountain', x: 68.0, z: 38.6 },
  // ---- The Channels (hall)
  { t: 'guide', id: 'guide_c', from: [4.0, 29.4], to: [6.0, 28.2], color: '#ffbf4d', link: 'valve_c' },
  { t: 'guide', id: 'guide_d', from: [12.0, 29.4], to: [10.0, 28.2], color: '#ffbf4d', link: 'valve_d' },
  { t: 'arb.sluice', x: 8.0, z: 24.4 },
  lamp(3.0, 15.1), lamp(13.0, 15.1, { cool: true }),
  fern(1.6, 40.4, { s: 1.1 }), fern(14.4, 41.2), bloom(1.4, 32.2, { hue: 'violet' }), fern(1.6, 22.6), bloom(14.6, 22.8),
  tree(2.4, 35.6, { s: 0.85 }),
  fern(14.4, 37.0, { s: 1.2 }), fern(1.6, 29.6), bloom(14.6, 30.2, { hue: 'violet', s: 0.9 }), fern(5.4, 41.3, { kind: 'leaf' }), fern(10.6, 41.4),
  { t: 'arb.decal', x: 5.2, z: 36.4, kind: 'puddle', w: 2.6, d: 2.0, rot: 0.4 },
  { t: 'arb.decal', x: 11.4, z: 38.8, kind: 'mossPatch', w: 2.8, d: 2.8, rot: 1.3 },
  { t: 'arb.decal', x: 8.6, z: 40.2, kind: 'petals', w: 2.4, d: 2.4, rot: 2.2 },
  { t: 'arb.decal', x: 3.4, z: 32.2, kind: 'litterB', w: 2.0, d: 2.0, rot: 0.9 },
  { t: 'arb.decal', x: 10.0, z: 18.6, kind: 'mossPatch', w: 3.0, d: 3.0, rot: 0.2 },
  { t: 'arb.decal', x: 5.0, z: 21.0, kind: 'puddle', w: 2.4, d: 2.0, rot: 2.6 },
  sprinkler(13.0, 34.0),
  vines(1, 15, 15.02, { on: 'n14' }),
  // ---- Stasis Gardens
  ...POD_BANKS.map(([c, r0, r1]) => ({ t: 'arb.podBank', c, r0, r1 })),
  // each bank's status plate (WARDEN's sigil wakes on them)
  ...POD_BANKS.map(([c, , r1]) => ({ t: 'screen', x: c + 1, z: r1 + 1.02, y: 0.08, w: 0.9, h: 0.4, tex: 'arb_pod_screen', group: 'stasis', intensity: 1.5 })),
  shaft(19.0, 25.0), shaft(34.0, 16.5), shaft(44.0, 26.0), shaft(54.0, 22.0),
  vines(17, 56, 15.02, { on: 'n14' }),
  pod(37.6, 17.0, { id: 'esme_pod', faulty: true }),
  // ---- Choir Gate
  { t: 'arb.choirDoor', x: 64.0, z: 14.7, on: 'n14' },
  tree(59.4, 16.0, { s: 1.1 }), tree(69.4, 16.2, { s: 1.0 }),
  bloom(58.8, 26.6), bloom(70.2, 26.4, { hue: 'violet' }), fern(58.6, 21.6, { s: 1.2 }), fern(70.3, 21.0, { s: 1.2 }),
  shaft(64.0, 24.5, { s: 1.4 }),
  { t: 'arb.rootMound', x: 64.0, z: 19.0 },
  // ---- Choir Chamber: pods like pews either side of the aisle, Theo's at its head
  { t: 'arb.choirPods', x0: 57.6, x1: 61.6, z0: 4.4, z1: 12.4 },
  { t: 'arb.choirPods', x0: 66.4, x1: 70.4, z0: 4.4, z1: 12.4 },
  { t: 'arb.choirTiers', x: 64.0, z: 1.02 },
  { t: 'arb.theoPod', x: 64.0, z: 2.6 },
  // pod plates at the aisle, and Theo's over his cradle
  ...[4.4, 7.6, 10.8].map((z) => ({ t: 'screen', x: 60.9, z: z + 0.6, y: 0.36, w: 0.6, h: 0.3, tex: 'arb_pod_screen', group: 'choir' })),
  ...[6.0, 9.2, 12.4].map((z) => ({ t: 'screen', x: 67.1, z: z + 0.6, y: 0.36, w: 0.6, h: 0.3, tex: 'arb_pod_screen', group: 'choir' })),
  { t: 'screen', x: 64.0, z: 2.08, y: 0.74, w: 0.9, h: 0.42, tex: 'arb_pod_screen', group: 'choir', intensity: 1.9 },
  { t: 'arb.decal', x: 64.0, z: 8.2, kind: 'aisle', w: 2.4, d: 9.6 },
  // ---- The Glass and the Seed Vault
  { t: 'bench', x: 9.5, z: 4.2 }, { t: 'bench', x: 17.5, z: 4.2 },
  fern(1.8, 12.4, { s: 1.2 }), bloom(25.2, 12.2), bloom(2.4, 2.0, { hue: 'violet' }), tree(24.0, 3.2),
  { t: 'arb.seedRacks', x: 41.5, z: 1.4, w: 24 },
  lamp(33.0, 1.1), lamp(50.0, 1.1, { cool: true }),
];

// ---------------------------------------------------------------- lights (virtual)

const teal = (x, z, y = 0.9, extra = {}) => ({ x, y, z, color: '#3fe0c0', intensity: 9, distance: 6, mode: 'pulse', amount: 0.25, speed: 0.7, ...extra });
const violet = (x, z, y = 0.9, extra = {}) => ({ x, y, z, color: '#a070ff', intensity: 8, distance: 5.5, mode: 'pulse', amount: 0.3, speed: 0.5, ...extra });
const sun = (x, z, extra = {}) => ({ x, y: 2.8, z, color: '#ffc070', intensity: 22, distance: 9, ...extra });
const pink = (x, z, extra = {}) => ({ x, y: 1.0, z, color: '#ff6fae', intensity: 6, distance: 4.5, ...extra });
const gold = (x, z, extra = {}) => ({ x, y: 1.4, z, color: '#ffd27a', intensity: 10, distance: 6, ...extra });
const amber = (x, z, extra = {}) => ({ x, y: 1.2, z, color: '#ffb35a', intensity: 7, distance: 4.5, ...extra });

const lights = [
  // dock
  sun(6.0, 46.0), teal(12.8, 46.5, 0.4, { tag: 'canal_a', intensity: 10 }), teal(12.8, 52.5, 0.4), { x: 2.6, y: 2.4, z: 44.0, color: '#ffb35a', intensity: 12, distance: 6 },
  { x: 10.5, y: 2.4, z: 44.0, color: '#9fe8ff', intensity: 10, distance: 6 }, pink(10.8, 53.2), violet(3.0, 53.0),
  // fern walk
  sun(16.0, 46.0), teal(21.0, 52.5), violet(26.0, 44.5), sun(30.5, 48.5), teal(36.0, 44.5), pink(41.0, 52.5), sun(41.0, 46.5),
  teal(46.0, 52.5), violet(51.0, 44.5), sun(51.0, 49.0), teal(56.0, 52.0), pink(25.6, 53.0), pink(45.4, 53.0),
  // bloom pools in the beds, so a phone-width frame still holds three coloured lights
  violet(29.0, 50.0), teal(33.5, 48.0), pink(28.8, 45.0), violet(44.0, 49.0), amber(48.5, 46.0),
  // pump house
  teal(64.0, 44.0, 0.4, { tag: 'canal_b', intensity: 12 }), { x: 61.5, y: 2.4, z: 46.0, color: '#ffb35a', intensity: 12, distance: 6 },
  sun(65.0, 49.5, { intensity: 18, distance: 9 }), pink(62.0, 53.0),
  { x: 68.5, y: 2.4, z: 46.0, color: '#9fe8ff', intensity: 10, distance: 6 }, violet(66.0, 52.0), teal(69.0, 50.5, 1.2),
  // glasshouse
  sun(66.0, 34.0), teal(61.0, 40.0), violet(56.0, 30.5), sun(56.0, 30.5), teal(51.0, 40.0), pink(46.0, 30.5), sun(46.0, 38.0),
  teal(41.0, 30.5), violet(36.0, 40.0), sun(36.0, 30.5), teal(31.0, 30.5), pink(26.0, 40.0), sun(26.0, 38.5), teal(19.5, 35.5),
  teal(68.0, 38.6, 0.8, { intensity: 12 }), pink(68.0, 31.0),
  pink(59.0, 36.5), teal(34.0, 35.5), pink(39.0, 37.0),
  // the channels
  teal(8.0, 26.0, -0.2, { intensity: 14, distance: 9, tag: 'basin' }), { x: 3.0, y: 2.4, z: 16.0, color: '#ffb35a', intensity: 12, distance: 7 },
  { x: 13.0, y: 2.4, z: 16.0, color: '#9fe8ff', intensity: 10, distance: 7 }, sun(8.0, 33.0, { intensity: 12 }), violet(2.0, 38.0), pink(14.0, 38.0),
  { x: 4.0, y: 1.2, z: 30.0, color: '#ffbf4d', intensity: 6, distance: 3.5 }, { x: 12.0, y: 1.2, z: 30.0, color: '#ffbf4d', intensity: 6, distance: 3.5 },
  teal(8.0, 20.0, 1.0), violet(2.0, 22.0),
  teal(10.5, 36.5, 0.4), pink(5.0, 18.0), violet(11.0, 21.5),
  // stasis gardens: the pods' own glow, cool and pale; gold when the sigil wakes
  teal(19.0, 19.0), sun(19.0, 25.0), { x: 24.0, y: 1.4, z: 17.0, color: '#7fe8ff', intensity: 9, distance: 5 }, violet(29.0, 25.5),
  sun(34.0, 16.5), { x: 34.0, y: 1.4, z: 22.0, color: '#7fe8ff', intensity: 9, distance: 5 }, teal(39.0, 25.5), pink(39.0, 16.0),
  sun(44.0, 26.0), { x: 44.0, y: 1.4, z: 20.0, color: '#7fe8ff', intensity: 9, distance: 5 }, violet(49.0, 16.0), teal(54.0, 24.0), sun(54.0, 22.0),
  teal(26.8, 21.5), amber(31.8, 19.0), pink(28.5, 16.5), pink(47.0, 23.0), teal(52.0, 19.5), amber(49.5, 26.0),
  { x: 38.4, y: 1.1, z: 17.6, color: '#ff4050', intensity: 7, distance: 3.5, mode: 'strobe', amount: 0.6, speed: 1.4, when: '!arb:esme' },
  { x: 30.0, y: 1.8, z: 21.0, color: '#ffd27a', intensity: 16, distance: 10, tag: 'stasis_gold', when: 'arb:stasis_gold' },
  { x: 45.0, y: 1.8, z: 21.0, color: '#ffd27a', intensity: 16, distance: 10, tag: 'stasis_gold', when: 'arb:stasis_gold' },
  // choir gate
  sun(64.0, 24.5, { intensity: 18, distance: 9 }), teal(59.0, 20.0), violet(69.0, 20.0), pink(59.0, 26.0), teal(69.0, 26.0),
  { x: 64.0, y: 1.6, z: 15.6, color: '#ffd27a', intensity: 9, distance: 5, mode: 'pulse', amount: 0.3, speed: 0.4 },
  { x: 64.0, y: 0.8, z: 19.4, color: '#8fe08a', intensity: 10, distance: 5, tag: 'gardener', when: '!defeated:arb_boss_gardener' },
  // choir chamber: white-gold pod glow on black, soft gold haze
  gold(59.6, 6.0, { intensity: 6 }), gold(68.4, 6.0, { intensity: 6 }), gold(59.6, 10.5, { intensity: 6 }), gold(68.4, 10.5, { intensity: 6 }),
  gold(64.0, 2.4, { intensity: 8, distance: 5, mode: 'pulse', amount: 0.25, speed: 0.35 }),
  { x: 64.0, y: 2.6, z: 8.0, color: '#ffe9b0', intensity: 7, distance: 9, mode: 'pulse', amount: 0.15, speed: 0.3 },
  { x: 58.0, y: 2.8, z: 2.0, color: '#7fe8ff', intensity: 6, distance: 6 }, { x: 70.0, y: 2.8, z: 2.0, color: '#ffb35a', intensity: 6, distance: 6 },
  { x: 64.0, y: 2.2, z: 4.0, color: '#ffd27a', intensity: 22, distance: 10, tag: 'choir_gold', when: 'arb:choir_gold' },
  // the matriarch's pink rim among the seed drawers
  { x: 46.5, y: 2.2, z: 8.6, color: '#ff8ac0', intensity: 12, distance: 5, when: '!defeated:arb_elite_matriarch' },
  // the glass and the seed vault
  sun(7.0, 3.0), sun(19.0, 3.0), teal(13.0, 10.0), violet(4.0, 10.0), pink(24.0, 10.0),
  sun(36.0, 3.0), sun(48.0, 3.0), teal(41.5, 6.0), violet(32.0, 11.0), pink(52.0, 11.0),
  pink(10.5, 5.0), violet(16.5, 8.0), sun(13.5, 2.5, { intensity: 14, distance: 7 }), violet(39.0, 9.5), amber(44.0, 5.0), pink(41.5, 11.0),
];

// ---------------------------------------------------------------- ambient (fireflies, rain, spores, petals)

const ambient = [
  { preset: 'firefly', x: 6.5, y: 1.2, z: 49.0, area: [10, 1.6, 10], rate: 2 },
  { preset: 'firefly', x: 36.0, y: 1.2, z: 49.0, area: [42, 1.6, 10], rate: 5 },
  { preset: 'spore', x: 36.0, y: 1.0, z: 49.0, area: [42, 1.2, 10], rate: 3 },
  { preset: 'drip', x: 64.5, y: 2.6, z: 48.0, area: [10, 0.2, 8], rate: 3 },
  { preset: 'firefly', x: 64.5, y: 1.2, z: 49.0, area: [10, 1.6, 8], rate: 1.5 },
  { preset: 'petal', x: 44.0, y: 2.2, z: 35.0, area: [50, 1.0, 11], rate: 3 },
  { preset: 'firefly', x: 44.0, y: 1.2, z: 35.0, area: [50, 1.6, 11], rate: 5 },
  { preset: 'firefly', x: 8.0, y: 1.2, z: 33.0, area: [13, 1.6, 9], rate: 2 },
  { preset: 'drip', x: 8.0, y: 2.6, z: 26.0, area: [13, 0.2, 4], rate: 3 },
  { preset: 'firefly', x: 8.0, y: 1.2, z: 19.0, area: [13, 1.6, 7], rate: 1.5 },
  { preset: 'spore', x: 37.0, y: 1.0, z: 21.0, area: [38, 1.2, 11], rate: 3 },
  { preset: 'firefly', x: 37.0, y: 1.4, z: 21.0, area: [38, 1.8, 11], rate: 4 },
  { preset: 'petal', x: 64.0, y: 2.4, z: 21.0, area: [11, 1.0, 11], rate: 3 },
  { preset: 'firefly', x: 64.0, y: 1.2, z: 21.0, area: [11, 1.6, 11], rate: 2 },
  { preset: 'mote', x: 64.0, y: 1.6, z: 7.0, area: [12, 2.4, 11], rate: 5 },
  { preset: 'firefly', x: 13.5, y: 1.2, z: 7.0, area: [24, 1.6, 11], rate: 3 },
  { preset: 'dust', x: 13.5, y: 1.8, z: 4.0, area: [24, 2.2, 5], rate: 2, color: '#ffd9a0' },
  { preset: 'spore', x: 41.5, y: 1.0, z: 7.0, area: [26, 1.2, 11], rate: 2 },
];

// ---------------------------------------------------------------- map

const wall = (tex, extra = {}) => ({ t: 'wall', tex, side: 'arb_wall_side', cap: 'arb_cap', low: 'arb_low', emissive: 2.2, roughness: 0.72, metalness: 0.3, ...extra });
const floor = (tex, mix, extra = {}) => ({ t: 'floor', tex, mix, roughness: 0.78, metalness: 0.08, emissive: 2.0, ...extra });
const canal = (drain) => ({ t: 'water', tex: 'arb_water', bank: 'arb_bank', bed: 'arb_silt', path: 'arb_walkway', depth: 0.45, drain });

export default {
  id: 'arboretum',
  name: 'The Arboretum',
  region: 'Deck 6 · Biodome',
  music: 'arboretum',
  mood: MOOD.fern,
  grid: [
    //         1111111111222222222233333333334444444444555555555566666666667
    // 1234567890123456789012345678901234567890123456789012345678901234567890
    '###WW##WW##WW##WW##WW##WW######WW####WW######WW####WW######WW##WW##WW###', // 0
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 1
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 2
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 3
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 4
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 5
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 6
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 7
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 8
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 9
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 10
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 11
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 12
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#kkkkkkkkkkkkkk#', // 13
    '######,,,######################################################DD#######', // 14
    '#...............#,,,,rr,,,,,,,,rr,,,,,,,,rr,,,,,,,,rr,,,,#.............#', // 15
    '#...............#,,,,rr,,,,,,,,rr,,,,,,,,rr,,,,,,,,rr,,,,#.............#', // 16
    '#................,,,,rr,,,,,,,,rr,,,,,,,,rr,,,,,,,,rr,,,,#.............#', // 17
    '#................,,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,,,.............#', // 18
    '#................,,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,,,.............#', // 19
    '#................,,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,,,.............#', // 20
    '#...............#,,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,,,.............#', // 21
    '#...............#,,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,,,.............#', // 22
    '#...............#,,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,,,.............#', // 23
    '#CCCCCCCCCCCCCCC#,,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,rr,,,,#.............#', // 24
    '#CCCCCCCCCCCCCCC#,,,,,,,,,rr,,,,,,,,rr,,,,,,,,rr,,,,,,,,,#.............#', // 25
    '#CCCCCCCCCCCCCCC#,,,,,,,,,rr,,,,,,,,rr,,,,,,,,rr,,,,,,,,,#.............#', // 26
    '#CCCCCCCCCCCCCCC#,,,,,,,,,rr,,,,,,,,rr,,,,,,,,rr,,,,,,,,,#.............#', // 27
    '#CCCCCCCCCCCCCCC########################################################', // 28
    '#...............#,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,#', // 29
    '#...............#,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,#', // 30
    '#...............#,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,#', // 31
    '#...............#,,,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,,,,#', // 32
    '#...............#,,,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,,,,#', // 33
    '#................,,,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,,,,#', // 34
    '#................,,,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,,,,#', // 35
    '#................,,,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,,,,#', // 36
    '#................,,,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,,,,#', // 37
    '#...............#,,,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,,,,#', // 38
    '#...............#,,,,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,,,,#', // 39
    '#...............#,,,,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,,,,#', // 40
    '#...............#,,,,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,,,,#', // 41
    '################################################################..######', // 42
    '#===========AA,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,#BBBBBBBBBBBB#', // 43
    '#===========AA,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,#BBBBBBBBBBBB#', // 44
    '#===========AA,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,#============#', // 45
    '#==ooooooo==AA,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,#============#', // 46
    '#==ooooooo==AA,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,,============#', // 47
    '#==ooooooo==AA,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,,============#', // 48
    '#==ooooooo==AA,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,,============#', // 49
    '#==ooooooo==AA,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,,============#', // 50
    '#==ooooooo==AA,,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,bb,,,#============#', // 51
    '#==ooooooo==AA,,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,#============#', // 52
    '#===========AA,,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,#============#', // 53
    '#===========AA,,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,,,,,,bb,,,#============#', // 54
    '########################################################################', // 55
  ],
  legend: {
    '#': wall('arb_wall'),
    W: { t: 'window', tex: 'arb_glass', backdrop: 'arb_bd_dome' },
    D: {
      t: 'door', tex: 'arb_door', lockedTex: 'arb_door', floor: 'arb_court',
      lock: { flag: 'defeated:arb_boss_gardener', id: 'choir_door', label: 'Inspect', talk: 'arboretum.choir_door', toast: 'The Choir door *opens*' },
    },
    b: wall('arb_bed', { side: 'arb_bed', low: 'arb_bed', cap: 'arb_soil', height: 0.55, roughness: 0.9, metalness: 0.05 }),
    r: wall('arb_roots', { side: 'arb_roots', low: 'arb_roots', cap: 'arb_soil', height: 0.6, roughness: 0.85, metalness: 0.05 }),
    // garden walkways: verdigris deck plates, moss taking them back cell by cell
    ',': floor('arb_deck', [['arb_moss', 0.26], ['arb_moss_b', 0.18], ['arb_deck_b', 0.14]], { roughness: 0.6, metalness: 0.35, grime: 0.04 }),
    '.': floor('arb_court', [['arb_court_b', 0.3], ['arb_moss_b', 0.12]], { roughness: 0.6, metalness: 0.2, grime: 0.05 }),
    '=': floor('arb_deck', [['arb_deck_b', 0.25]], { roughness: 0.5, metalness: 0.45, emissive: 2.2 }),
    o: floor('arb_pad', null, { roughness: 0.55, metalness: 0.35, emissive: 2.2 }),
    k: floor('arb_choir_floor', [['arb_choir_floor_b', 0.3]], { roughness: 0.35, metalness: 0.4, emissive: 1.6 }),
    A: canal(`sw:arboretum:valve_a | ${SLUICE}`),
    B: canal(`sw:arboretum:valve_b | ${SLUICE}`),
    C: canal(`!sw:arboretum:valve_b | ${SLUICE}`),
  },
  wallTex: { side: 'arb_wall_side', cap: 'arb_cap', low: 'arb_low' },
  backdrop: { texture: 'arb_bd_dome', stars: 'stars_layer', tint: [1.05, 1.02, 0.96] },
  dividers: [
    { id: 'n14', row: 14, rect: [0, 14, 71, 14] },
    { id: 'n28', row: 28, rect: [0, 28, 71, 28] },
    { id: 'n42', row: 42, rect: [0, 42, 71, 42] },
  ],
  areas: [
    { id: 'glass', name: 'The Glass', subtitle: 'The Arboretum · Dome Gallery', rect: [0.5, 0.5, 27, 14.4], zone: null, mood: MOOD.view },
    { id: 'vault', name: 'The Seed Vault', subtitle: 'The Arboretum · Stores', rect: [27, 0.5, 56.5, 14.4], zone: null, mood: MOOD.glass },
    {
      id: 'choir', name: 'Choir Chamber', subtitle: 'The Arboretum · Deep Stasis', rect: [56.5, 0.5, 71.5, 14.4], zone: null, music: 'choir', mood: MOOD.choir,
      focus: { x: 64.0, y: 1.0, z: 3.6, w: 0.5, band: 0.2 },
    },
    { id: 'channels', name: 'The Channels', subtitle: 'The Arboretum · Irrigation', rect: [0.5, 14.4, 16.6, 42.4], zone: null, puzzle: true, mood: MOOD.hall },
    { id: 'stasis', name: 'Stasis Gardens', subtitle: 'The Arboretum · Sleeper Beds', rect: [16.6, 14.4, 57.5, 28.4], zone: 'arb_stasis', mood: MOOD.stasis },
    {
      id: 'court', name: 'Choir Gate', subtitle: 'The Arboretum · Choir Approach', rect: [57.5, 14.4, 71.5, 28.4], zone: null, mood: MOOD.court,
      focus: { x: 64.0, y: 1.6, z: 19.4, w: 0.5, band: 0.2, whileBoss: 'gardener' },
    },
    { id: 'glasshouse', name: 'The Glasshouse', subtitle: 'The Arboretum · Tall Beds', rect: [16.6, 28.4, 71.5, 42.4], zone: 'arb_gardens', mood: MOOD.glass },
    { id: 'dock', name: 'The Dock', subtitle: 'The Arboretum · Moth Berth', rect: [0.5, 42.4, 14, 55.5], zone: null, mood: MOOD.dock },
    { id: 'fern', name: 'The Fern Walk', subtitle: 'The Arboretum · Under the Domes', rect: [14, 42.4, 58.5, 55.5], zone: 'arb_gardens', mood: MOOD.fern },
    { id: 'pump', name: 'The Pump House', subtitle: 'The Arboretum · Irrigation', rect: [58.5, 42.4, 71.5, 55.5], zone: null, puzzle: true, mood: MOOD.pump },
  ],
  spawns: {
    dock: { x: 8.8, z: 45.0, facing: 'right' },
    channels: { x: 8.5, z: 33.6, facing: 'up' },
    stasis: { x: 12.8, z: 18.6, facing: 'right' },
    choir: { x: 64.0, z: 12.6, facing: 'up' },
    court: { x: 55.0, z: 17.2, facing: 'right' },
    theo: { x: 64.0, z: 7.6, facing: 'up' },
  },
  anchors: {
    glass: { x: 13.5, z: 1.8, facing: 'up' },
    pod_2271: { x: 64.0, z: 3.6, facing: 'up' },
    mother7: { x: 64.0, z: 19.4, facing: 'down' },
  },
  props,
  lights,
  ambient,
  npcs: [
    {
      id: 'tender_a', sprite: 'arb_tender', x: 63.0, z: 49.0, facing: 'down', name: 'CARETAKER DRONE', talk: 'arboretum.tenders',
      idle: { path: [[63.0, 49.0], [67.5, 49.5], [66.0, 51.0]], speed: 0.9, pause: [1.5, 3] },
    },
    {
      id: 'tender_b', sprite: 'arb_tender', x: 61.0, z: 52.6, facing: 'right', name: 'CARETAKER DRONE', talk: 'arboretum.tenders',
      idle: { path: [[61.0, 52.6], [64.0, 53.4], [62.0, 50.8]], speed: 0.8, pause: [2, 4] },
    },
    { id: 'mother7', sprite: 'mother7', x: 64.0, z: 19.0, facing: 'down', name: 'MOTHER-7', talk: 'arboretum.mother7', when: 'defeated:arb_boss_gardener' },
  ],
  chests: [
    // critical path: the Seedling Spear, grown in a Glasshouse bed (Sera's best weapon this chapter)
    { id: 'spear', x: 48.5, z: 29.7, item: 'eq_w_sera_3', prop: 'arb.planterChest', talk: 'arboretum.spear' },
    // by the pump house's far pumps: the Photon Prism
    { id: 'prism', x: 69.6, z: 53.8, item: 'eq_x_photon_prism', prop: 'arb.planterChest' },
    // off the path: the Seed Vault keeps the Ember Charm
    { id: 'ember', x: 54.2, z: 2.0, item: 'eq_x_ember_charm', prop: 'arb.planterChest' },
    { id: 'fern_cache', x: 56.6, z: 53.8, item: 'medigel_plus', n: 2, prop: 'arb.planterChest' },
    { id: 'glass_cache', x: 69.6, z: 29.8, item: 'thermal_charge', n: 2, credits: 240, prop: 'arb.planterChest' },
    { id: 'hall_cache', x: 1.6, z: 15.8, item: 'ether_plus', n: 1, prop: 'arb.planterChest' },
    { id: 'stasis_cache', x: 48.6, z: 15.6, item: 'stim', n: 2, credits: 180, prop: 'arb.planterChest' },
    { id: 'glass_view', x: 1.6, z: 1.8, item: 'medigel_max', n: 1, prop: 'arb.planterChest' },
  ],
  interactables: [
    // the Dock: Starchart, Med-Station, MOTHER-7's first log, valve A (the introduction)
    { id: 'starchart', kind: 'starchart', x: 3.0, z: 45.0 },
    {
      id: 'med_dock', kind: 'med', x: 6.4, z: 43.66, box: [5.88, 43.0, 6.92, 43.68], prop: 'med', propFields: { x: 6.4, z: 43.34 },
      prompt: 'An Arboretum Med-Station, damp but working. Restore the squad?',
    },
    { id: 'log_1', kind: 'terminal', x: 8.8, z: 43.6, box: [8.3, 43.0, 9.3, 43.6], label: 'Read log', icon: 'inspect', prop: 'arb.logTerminal', propFields: { x: 8.8, z: 43.3 }, talk: 'arboretum.log_1' },
    {
      id: 'valve_a', kind: 'switch', x: 11.0, z: 43.9, box: [10.6, 43.3, 11.5, 44.3], flag: 'sw:arboretum:valve_a', mode: 'toggle',
      label: 'Turn', prop: 'switch.valve', propFields: { x: 11.0, z: 43.6 }, script: 'arboretum.valve', sfx: 'valve',
    },
    // the Pump House: valve B (the twist)
    {
      id: 'valve_b', kind: 'switch', x: 61.0, z: 45.9, box: [60.6, 45.4, 61.5, 46.3], flag: 'sw:arboretum:valve_b', mode: 'toggle',
      label: 'Turn', prop: 'switch.valve', propFields: { x: 61.0, z: 45.6 }, script: 'arboretum.valve', sfx: 'valve',
    },
    // the Channels: the sluice, left then right (the combination)
    {
      id: 'valve_c', kind: 'switch', x: 4.0, z: 30.0, box: [3.6, 29.4, 4.5, 30.4], flag: 'sw:arboretum:valve_c', mode: 'once',
      label: 'Turn', prop: 'switch.valve', propFields: { x: 4.0, z: 29.7 }, script: 'arboretum.valve', sfx: 'valve',
    },
    {
      id: 'valve_d', kind: 'switch', x: 12.0, z: 30.0, box: [11.6, 29.4, 12.5, 30.4], flag: 'sw:arboretum:valve_d', mode: 'once',
      label: 'Turn', prop: 'switch.valve', propFields: { x: 12.0, z: 29.7 }, script: 'arboretum.valve', sfx: 'valve',
    },
    { id: 'sluice_plate', kind: 'inspect', x: 8.0, z: 29.6, box: [7.4, 29.0, 8.6, 29.6], label: 'Read', icon: 'inspect', talk: 'arboretum.basin_note' },
    { id: 'med_hall', kind: 'med', x: 3.6, z: 15.66, box: [3.08, 15.0, 4.12, 15.68], prop: 'med', propFields: { x: 3.6, z: 15.34 }, prompt: 'A Med-Station by the sluice. Restore the squad?' },
    // the Glasshouse and the Stasis Gardens: MOTHER-7's later logs
    { id: 'log_2', kind: 'terminal', x: 40.6, z: 29.6, box: [40.1, 29.0, 41.1, 29.6], label: 'Read log', icon: 'inspect', prop: 'arb.logTerminal', propFields: { x: 40.6, z: 29.3 }, talk: 'arboretum.log_2' },
    { id: 'log_3', kind: 'terminal', x: 54.6, z: 26.9, box: [54.1, 26.6, 55.1, 27.4], label: 'Read log', icon: 'inspect', prop: 'arb.logTerminal', propFields: { x: 54.6, z: 27.4, rot: Math.PI }, talk: 'arboretum.log_3' },
    // leader-gated (Sera): Esme Dubois, pod 2270, failing
    {
      id: 'esme', kind: 'inspect', x: 37.6, z: 17.6, box: [37.0, 16.6, 38.2, 17.8], leader: 'sera', label: 'Check pod', icon: 'inspect', talk: 'arboretum.sera_pod',
      leaderHint: 'Pod 2270 blinks red: *SEAL FAILING*. *Sera* could fix it.',
    },
    { id: 'med_court', kind: 'med', x: 54.6, z: 15.66, box: [54.08, 15.0, 55.12, 15.68], prop: 'med', propFields: { x: 54.6, z: 15.34 }, prompt: 'A Med-Station by the Choir gate. Restore the squad?' },
    // the one-way shortcut back to the dock (12.4), once the Gardener is down
    {
      id: 'lift', kind: 'exit', x: 69.6, z: 25.4, box: [68.8, 24.6, 70.4, 26.2], label: 'Ride down to the dock', icon: 'travel',
      to: { map: 'arboretum', spawn: 'dock' }, transition: 'fade', when: 'defeated:arb_boss_gardener', prop: 'arb.lift', propFields: { x: 69.6, z: 25.4 },
    },
    // pod 2271, once Theo is found
    { id: 'theo_pod', kind: 'inspect', x: 64.0, z: 3.7, box: [62.8, 3.2, 65.2, 3.8], label: 'Look', icon: 'inspect', talk: 'arboretum.theo_pod', when: 'story:theo_found' },
    // the Glass: Tethys through the dome
    { id: 'view', kind: 'inspect', x: 13.5, z: 1.4, box: [10.0, 1.0, 17.0, 1.6], label: 'Look out', icon: 'inspect', talk: 'arboretum.view' },
  ],
  triggers: [
    { id: 'arrival', on: 'load', when: 'chapter>=ch2 & !story:channels_drained', once: true, script: 'arboretum.arrival' },
    { id: 'drained', on: 'flag', when: 'chapter>=ch2 & arb:sluice & !story:channels_drained', once: true, script: 'arboretum.channels_drained' },
    { id: 'stasis', on: 'enter', area: 'stasis', when: 'story:channels_drained & !story:theo_found', once: true, script: 'arboretum.stasis_gardens' },
    { id: 'theo', on: 'enter', rect: [61.5, 3.4, 66.5, 6.6], when: 'story:channels_drained & defeated:arb_boss_gardener & !story:theo_found', once: true, script: 'arboretum.theo' },
  ],
  bosses: [
    // the two lessons: visible field encounters on the path (7.7)
    {
      id: 'spores', art: 'spore_drone', name: 'SPORE DRONES', x: 21.5, z: 47.0, facing: 'left', encounter: 'arb_spores',
      script: 'arboretum.spores', triggerRadius: 2.4, radius: 0.8, when: '!arb:spores',
    },
    {
      id: 'caretaker', art: 'feral_caretaker', name: 'FERAL CARETAKER', x: 24.0, z: 21.2, facing: 'left', encounter: 'arb_caretaker',
      script: 'arboretum.caretaker', triggerRadius: 2.4, radius: 0.9, when: 'story:channels_drained & !arb:caretaker',
    },
    // M3: the optional elite among the seed drawers, guarding the Bloom Crown
    {
      id: 'matriarch', art: 'bloom_mantis', name: 'THORN MATRIARCH', x: 46.5, z: 7.4, facing: 'left', encounter: 'arb_elite_matriarch',
      script: 'arboretum.matriarch', triggerRadius: 2.8, radius: 1.0,
    },
    {
      id: 'gardener', art: 'gardener_field', name: 'THE GARDENER', x: 64.0, z: 19.4, facing: 'down', encounter: 'arb_boss_gardener',
      script: 'arboretum.gardener', triggerRadius: 4.2, radius: 1.8, focus: true, light: 'gardener',
    },
  ],
  viewpoints: {
    dock: { x: 7.5, z: 47.0, facing: 'up' },
    fern: { x: 31.0, z: 49.0, facing: 'up' },
    fern_east: { x: 46.0, z: 48.5, facing: 'up' },
    pump: { x: 64.5, z: 49.5, facing: 'up' },
    glasshouse: { x: 60.5, z: 35.5, facing: 'up' },
    glasshouse_west: { x: 36.0, z: 35.0, facing: 'up' },
    channels: { x: 8.0, z: 34.5, facing: 'up' },
    channels_north: { x: 8.0, z: 20.0, facing: 'up' },
    stasis: { x: 29.0, z: 21.0, facing: 'up' },
    stasis_east: { x: 49.0, z: 21.5, facing: 'up' },
    court: { x: 60.5, z: 25.0, facing: 'up' },
    choir: { x: 64.0, z: 11.0, facing: 'up' },
    pod: { x: 64.0, z: 7.2, facing: 'up' },
    the_glass: { x: 13.5, z: 6.5, facing: 'up' },
    seed_vault: { x: 41.5, z: 7.5, facing: 'up' },
  },
};
