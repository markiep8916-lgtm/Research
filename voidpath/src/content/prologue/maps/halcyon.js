// ISV Halcyon crew decks (PURE MapDef, TECH_PLAN 3.1): the POC map converted without moving any
// coordinate. 1 tile = 1 world unit; cell (c, r) spans x c..c+1, z r..r+1 (+Z = south, toward the
// camera). The grid uses DEFAULT_LEGEND (world/mapdef.js), which reproduces the POC characters.
//
// Wall rows shared by two stacked rooms are `dividers`: they stand full height while the leader is
// south of them and sink to the cutaway height once the leader is north, taking every full-height
// wall inside their rect down with them. Props hanging on a divider name it with `on`.
//
// Wave S: `poc: true` keeps the POC lines inline (legacy TalkSpecs) so the POC stays playable; C1
// replaces them with prologue scripts written to WRITING.md.

const bolt = (text) => ({ speaker: 'BOLT', text, portrait: 'bolt' });
const holo = (text) => ({ speaker: 'HALCYON', text, portrait: 'holo' });
const log = (text) => ({ speaker: null, text });

const BOLT_INTRO = [
  bolt('Vitals green! Good morning, Commander KADE. You were in stasis for *412 days*. Mostly on purpose.'),
  { speaker: 'KADE', text: 'Status report, BOLT. Why is the ship this quiet?' },
  bolt('The defence grid went rogue while you slept. Sec-Drones patrol the *Spine Corridor* and something big has sealed the bridge.'),
  bolt('Uploading combat protocols! Every hostile unit wears a *shield*. Hit its *weaknesses* (a weapon or an element) to crack it. Unknown ones show as *?*.'),
  bolt('Empty the shield and the target is *BROKEN*: it loses its turn and takes *double damage*.'),
  bolt('You also bank a *Boost Point* every round. Spend up to three to strike again and again, or to amplify a skill.'),
  { speaker: 'NYX', text: 'Break it, then Boost it. Got it, tin can.' },
  bolt('Precisely! The *Med-Station* restores the squad and logs a checkpoint. The Bridge Keycard was last scanned in *Engineering*.'),
];

const HALCYON_INTRO = [
  holo('Command crew detected. I am *HALCYON*, the mind of this ship. What is left of it.'),
  holo('The *SENTINEL* was built to guard this bridge. Its directives are corrupted, and it will not let you pass.'),
  holo('Its armour adapts: after every *Break* it recovers with a stronger shield. Break it, then strike with everything you have.'),
  { speaker: 'ORION', text: 'Then we shut it down. Gently, if possible.' },
];

// Area moods: fog / background, hemisphere fill, key ("planet") light, sprite fill light, post FX.
const MOOD = {
  cryo: {
    fog: '#08121d', density: 0.034, sky: '#3f6f9c', ground: '#0a0f18', hemi: 0.34,
    key: 0.45, keyColor: '#bfe6ff', fill: 0.28, exposure: 1.06, bloom: 0.95, saturation: 1.04,
  },
  corridor: {
    fog: '#070b17', density: 0.03, sky: '#3a4f80', ground: '#0b0b12', hemi: 0.55,
    key: 2.6, fill: 0.36, exposure: 1.04, bloom: 0.9, saturation: 1.08,
  },
  engineering: {
    fog: '#140809', density: 0.034, sky: '#5a3348', ground: '#0e0708', hemi: 0.38,
    key: 0.5, keyColor: '#ffb98a', fill: 0.34, exposure: 1.05, bloom: 1.0, saturation: 1.12,
  },
  antechamber: {
    fog: '#090a14', density: 0.032, sky: '#3c4a72', ground: '#0b0b12', hemi: 0.62,
    key: 1.0, fill: 0.42, exposure: 1.04, bloom: 0.9, saturation: 1.08,
  },
  bridge: {
    fog: '#05081a', density: 0.026, sky: '#3a5590', ground: '#07080f', hemi: 0.5,
    key: 3.0, fill: 0.34, exposure: 1.06, bloom: 0.95, saturation: 1.1,
  },
};

// ---------------------------------------------------------------- props
// Positions are world units (x, z = footprint centre).

const pods = [1.5, 2.5, 3.5, 4.5, 9.5, 10.5, 11.5].map((x) => ({ t: 'pod', x, z: 18.36 }));
const beds = [21.6, 25.6].flatMap((z) => [2.0, 3.25, 4.5, 9.5, 10.75, 12.0].map((x) => ({ t: 'bed', x, z })));
const benches = [9, 18, 27].map((x) => ({ t: 'bench', x, z: 13.15, w: 1.9 }));
const corridorLamps = [4.5, 13.5, 22.5, 31.5].map((x) => ({ t: 'lamp', x, y: 2.5, z: 12.02 }));

const props = [
  // ---- Cryo Deck
  ...pods,
  ...beds,
  { t: 'crate', x: 13.3, z: 28.25 },
  { t: 'crate', x: 13.3, z: 28.25, y: 1, s: 0.72, rot: 0.25 },
  { t: 'crate', x: 12.3, z: 28.35, s: 0.8, rot: -0.12 },
  { t: 'lamp', x: 3.0, y: 2.5, z: 18.02, on: 'south', cool: true },
  { t: 'lamp', x: 11.0, y: 2.5, z: 18.02, on: 'south', cool: true },
  { t: 'sign', name: 'sign_spine', x: 7.0, z: 18.0, on: 'south' },
  { t: 'decal', name: 'decal_grime', x: 2.6, z: 23.6, rot: 1 },
  { t: 'decal', name: 'decal_grime', x: 11.2, z: 27.6, rot: 2 },
  { t: 'decal', name: 'decal_oil', x: 8.4, z: 26.9, rot: 0 },
  { t: 'decal', name: 'decal_grime', x: 6.4, z: 28.4, rot: 3 },

  // ---- Spine Corridor
  ...benches,
  ...corridorLamps,
  { t: 'crate', x: 35.3, z: 16.3 },
  { t: 'crate', x: 34.35, z: 16.38, s: 0.78, rot: 0.2 },
  { t: 'crate', x: 35.3, z: 16.3, y: 1, s: 0.7, rot: -0.3 },
  { t: 'sign', name: 'sign_cryo', x: 7.5, z: 12.0 },
  { t: 'sign', name: 'sign_engineering', x: 21.0, z: 12.0 },
  { t: 'sign', name: 'sign_bridge', x: 35.0, z: 12.0 },
  { t: 'decal', name: 'decal_arrow', x: 12.5, z: 14.5, rot: 1 },
  { t: 'decal', name: 'decal_arrow', x: 27.5, z: 14.5, rot: 1 },
  { t: 'decal', name: 'decal_arrow', x: 21.0, z: 15.3, rot: 2 },
  { t: 'decal', name: 'decal_arrow', x: 7.0, z: 15.3, rot: 2 },
  { t: 'decal', name: 'decal_oil', x: 15.4, z: 15.6, rot: 1 },
  { t: 'decal', name: 'decal_grime', x: 4.3, z: 15.8, rot: 0 },
  { t: 'decal', name: 'decal_grime', x: 30.6, z: 15.9, rot: 2 },
  { t: 'decal', name: 'decal_scorch', x: 33.4, z: 13.4, rot: 1 },

  // ---- Engineering Bay
  { t: 'reactor', x: 25.5, z: 24.0 },
  { t: 'alarm', x: 25.0, y: 2.72, z: 18.03, on: 'south' },
  { t: 'conduit', x: 28.0, y: 2.05, z: 18.0, on: 'south' },
  { t: 'lamp', x: 17.5, y: 2.5, z: 18.02, on: 'south' },
  { t: 'lamp', x: 23.5, y: 2.5, z: 18.02, on: 'south' },
  { t: 'sign', name: 'sign_spine', x: 21.0, z: 18.0, on: 'south' },
  { t: 'locker', x: 29.5, z: 18.32 },
  { t: 'locker', x: 30.5, z: 18.32 },
  { t: 'locker', x: 31.5, z: 18.32 },
  { t: 'vent', x: 17.5, z: 26.5 },
  { t: 'vent', x: 31.5, z: 21.5 },
  { t: 'vent', x: 30.5, z: 27.5 },
  { t: 'crate', x: 15.6, z: 28.25 },
  { t: 'crate', x: 15.62, z: 28.25, y: 1, s: 0.8, rot: 0.15 },
  { t: 'crate', x: 16.65, z: 28.35, s: 0.85, rot: -0.1 },
  { t: 'crate', x: 33.25, z: 23.0 },
  { t: 'crate', x: 33.25, z: 24.05 },
  { t: 'crate', x: 33.25, z: 23.5, y: 1, s: 0.8, rot: 0.2 },
  { t: 'crate', x: 22.2, z: 28.35, s: 0.9, rot: 0.1 },
  { t: 'pipe', axis: 'z', x: 15.16, y: 2.42, z0: 18, z1: 29, r: 0.13, on: 'south' },
  { t: 'pipe', axis: 'z', x: 15.16, y: 2.05, z0: 18, z1: 29, r: 0.09, on: 'south' },
  { t: 'pipe', axis: 'z', x: 33.84, y: 2.42, z0: 18, z1: 29, r: 0.13, on: 'south' },
  { t: 'pipe', axis: 'z', x: 33.84, y: 2.05, z0: 18, z1: 29, r: 0.09, on: 'south' },
  { t: 'pipe', axis: 'y', x: 15.25, z: 18.25, y0: 0, y1: 3, r: 0.16, on: 'south' },
  { t: 'pipe', axis: 'y', x: 33.75, z: 18.25, y0: 0, y1: 3, r: 0.16, on: 'south' },
  { t: 'decal', name: 'decal_scorch', x: 28.0, z: 18.75, rot: 0 },
  { t: 'decal', name: 'decal_oil', x: 19.8, z: 21.2, rot: 3 },
  { t: 'decal', name: 'decal_oil', x: 29.6, z: 25.6, rot: 1 },
  { t: 'decal', name: 'decal_grime', x: 17.0, z: 23.0, rot: 2 },
  { t: 'decal', name: 'decal_scorch', x: 23.8, z: 27.6, rot: 3 },
  { t: 'decal', name: 'decal_grime', x: 31.2, z: 24.6, rot: 0 },

  { t: 'guide', x0: 1.5, x1: 35.5, z: 15.9, step: 1, color: '#45d4ff' },

  // ---- Bridge antechamber
  { t: 'lamp', x: 39.4, y: 2.5, z: 12.02, on: 'bridge' },
  { t: 'lamp', x: 42.6, y: 2.5, z: 12.02, on: 'bridge' },
  { t: 'sign', name: 'sign_bridge', x: 41.0, z: 12.0, on: 'bridge' },
  { t: 'crate', x: 45.4, z: 16.3, s: 0.9 },
  { t: 'decal', name: 'decal_grime', x: 38.6, z: 15.8, rot: 1 },
  { t: 'decal', name: 'decal_arrow', x: 41.0, z: 14.2, rot: 0 },
  { t: 'guide', x0: 37.5, x1: 45.5, z: 15.9, step: 1, color: '#ffb54a' },

  // ---- Observation Bridge
  { t: 'holoTable', x: 43.8, z: 7.4 },
  { t: 'chair', x: 41.6, z: 5.3 },
  { t: 'console', x: 37.15, z: 9.0 },
  { t: 'bench', x: 36.6, z: 10.15, w: 2 },
  { t: 'decal', name: 'decal_grime', x: 38.6, z: 7.9, rot: 1 },
  { t: 'decal', name: 'decal_grime', x: 36.4, z: 9.6, rot: 2 },
];

// ---------------------------------------------------------------- interactables
// Terminals and Med-Stations keep the POC console / cabinet props and interaction boxes.

const terminal = (id, x, z, lines) => ({
  id, kind: 'terminal', x, z: z + 0.31, box: [x - 0.5, z - 0.33, x + 0.5, z + 0.33],
  label: 'Access', icon: 'inspect', prop: 'console', propFields: { x, z }, talk: lines,
});
const medStation = (id, x, z) => ({
  id, kind: 'med', x, z: z + 0.31, box: [x - 0.52, z - 0.33, x + 0.52, z + 0.33],
  label: 'Med-Station', icon: 'save', prop: 'med', propFields: { x, z },
  prompt: 'Restore the squad and log a checkpoint?',
});

const interactables = [
  medStation('med_cryo', 12.6, 18.34),
  terminal('term_cryo', 13.4, 23.2, [
    log('STASIS LOG // Pod 07 (KADE): revival *successful*.'),
    log('Pods 01-06, 08-14: revival deferred. Reason: *[DATA CORRUPTED]*.'),
  ]),
  terminal('term_nav', 10.5, 12.36, [
    log('NAV LOG // Orbit around *Thessaly IV* decaying 0.02% per cycle.'),
    log('Recommend manual course correction from the *Observation Bridge*.'),
  ]),
  terminal('term_window', 28.5, 12.36, [
    log('MAINTENANCE // Window 9 pressure seal replaced.'),
    log('Crew note: *best view on the ship*, don\'t let anyone tell you otherwise.'),
  ]),
  terminal('term_reactor', 19.6, 24.2, [
    log('REACTOR CORE // Output 61%. Coolant loop B venting into the bay.'),
    log('Containment field: *stable*. Mostly. Do not lick the conduits.'),
  ]),
  medStation('med_ante', 44.5, 12.34),
  terminal('term_security', 37.6, 12.36, [
    log('SECURITY // Bridge sealed by HALCYON under protocol *SENTINEL*.'),
    log('Override requires a command keycard. Last check-out: Chief Engineer Osei, *Engineering* supply cache.'),
  ]),
  terminal('term_helm', 35.6, 2.36, [
    log('HELM // Station locked. Awaiting authorised command crew.'),
  ]),
  terminal('term_captain', 46.4, 2.36, [
    log('CAPTAIN\'S LOG, final entry: *If anyone wakes up: HALCYON is not the enemy.*'),
    log('*The Sentinel is.*'),
  ]),
  terminal('term_aft', 36.1, 9.0, [
    log('SENSORS // Ring debris density rising. Hull microfractures: *3*. Acceptable.'),
    log('Unidentified signal on the far side of Thessaly IV. Source: *unknown*. Repeating.'),
  ]),
];

export default {
  id: 'halcyon',
  name: 'ISV Halcyon',
  region: 'Crew Decks',
  music: 'explore',
  poc: true,
  grid: [
    '                                                ', // 0
    '                                  #sWWWWWWWWWWs#', // 1
    '                                  #bbbbbbbbbbbb#', // 2
    '                                  #bbbbbbbbbbbb#', // 3
    '                                  #bbbbbbbbbbbb#', // 4
    '                                  #bbbbbbbbbbbb#', // 5
    '                                  #bbbbbbbbbbbb#', // 6
    '                                  #bbbbbbbbbbbb#', // 7
    '                                  #bbbbbbbbbbbb#', // 8
    '                                  #bbbbbbbbbbbb#', // 9
    '                                  #bbbbbhhbbbbb#', // 10
    '#vWWsWW#WWvWWsWW#WWvWWsWW#WWvWWsp####s#pLLp#sv##', // 11
    '#...................................#...hh....# ', // 12
    '#.............................................# ', // 13
    '#.............................................# ', // 14
    '#.............................................# ', // 15
    '#.....hh............hh..............#.........# ', // 16
    '##s#v#DD#s#vs##pp#v#DD#s##s###v#pp############# ', // 17
    '#ccccchhcccccc#.....hh............#             ', // 18
    '#ccccc..cccccc#...................#             ', // 19
    '#ccccc..cccccc#...................#             ', // 20
    '#ccccc..cccccc#.......ggggggg..g..#             ', // 21
    '#ccccc..cccccc#.......ggggggg.....#             ', // 22
    '#ccccc..cccccc#.......ggggggg.....#             ', // 23
    '#ccccc..cccccc#.......ggggggg.....#             ', // 24
    '#ccccc..cccccc#.......ggggggg.....#             ', // 25
    '#ccccc..cccccc#..g....ggggggg.....#             ', // 26
    '#ccccc..cccccc#...............g...#             ', // 27
    '#ccccc..cccccc#...................#             ', // 28
    '###################################             ', // 29
  ],
  legend: {
    // the POC bridge door: the keycard sets the flag, the panel explains itself while locked
    L: {
      t: 'door', tex: 'door', lockedTex: 'door_locked', floor: 'floor_plate',
      lock: {
        flag: 'story:bridge_unlocked', item: 'keycard', id: 'bridge_door', label: 'Inspect',
        toast: 'Bridge access *granted*',
        talk: [log('The bridge door is sealed tight. A red panel blinks: *COMMAND KEYCARD REQUIRED*.')],
      },
    },
  },
  wallH: 3,
  lowH: 0.75,
  wallTex: { side: 'wall_panel', cap: 'wall_cap', low: 'wall_low' },
  // the bridge's north wall is two storeys of glass
  grand: [{ row: 1, c0: 34, c1: 47, height: 6 }],
  dividers: [
    { id: 'south', row: 17, rect: [0, 17, 34, 29] },
    { id: 'bridge', row: 11, rect: [34, 11, 47, 17] },
  ],
  // cam: [z0, z1] clamp for the camera target's z; ceiling: lit by the planet only through windows
  areas: [
    { id: 'cryo', name: 'Cryo Deck', subtitle: 'Deck 2 · Stasis Ward', rect: [1, 18, 14, 29], cam: [20.4, 25.8], zone: null, mood: MOOD.cryo },
    { id: 'corridor', name: 'Spine Corridor', subtitle: 'Deck 2 · Hull Ring', rect: [1, 12, 36.5, 17], cam: [14.25, 14.75], zone: 'corridor', ceiling: true, mood: MOOD.corridor },
    { id: 'engineering', name: 'Engineering Bay', subtitle: 'Deck 2 · Reactor Hall', rect: [15, 18, 34, 29], cam: [20.4, 25.8], zone: 'engineering', mood: MOOD.engineering },
    { id: 'antechamber', name: 'Bridge Antechamber', subtitle: 'Deck 1 · Command Access', rect: [36.5, 12, 46, 17], cam: [13.6, 14.0], zone: null, ceiling: true, mood: MOOD.antechamber },
    {
      id: 'bridge', name: 'Observation Bridge', subtitle: 'Deck 1 · Command', rect: [35, 2, 47, 11], cam: [4.4, 6.9], zone: null, ceiling: true, ceilingY: 6.05,
      // the tilt-shift band leans toward the Sentinel while it stands before the window
      focus: { x: 38.7, y: 2.4, z: 4.9, w: 0.4, band: 0.17, whileBoss: 'sentinel' }, mood: MOOD.bridge,
    },
  ],
  spawns: {
    start: { x: 6.55, z: 20.3, facing: 'down' },
    cryo: { x: 6.6, z: 22.6, facing: 'down' },
    corridor: { x: 17.0, z: 14.6, facing: 'right' },
    engineering: { x: 20.95, z: 19.6, facing: 'down' },
    engineering_reactor: { x: 25.5, z: 26.4, facing: 'up' },
    antechamber: { x: 41.0, z: 14.4, facing: 'up' },
    bridge: { x: 41.0, z: 9.4, facing: 'up' },
    bridge_starchart: { x: 43.8, z: 9.15, facing: 'up' },
  },
  // staging spots for the world-reacts additions of later chapters (12.3); C1 may refine them
  anchors: {
    hub_stall: { x: 38.6, z: 15.4, facing: 'up' },
    hub_planters: { x: 31.4, z: 12.9, facing: 'down' },
    hub_voss_post: { x: 37.9, z: 13.7, facing: 'down' },
    hub_halcyon: { x: 45.2, z: 9.5, facing: 'down' },
    memorial: { x: 7.0, z: 28.2, facing: 'down' },
  },
  props,
  // virtual point lights: the world drives a small pool of real lights from the nearest ones.
  // mode: 'flicker' | 'pulse' | 'strobe' | 'reactor'; tag: lights switched by scripts or bosses.
  lights: [
    // cryo
    { x: 3.0, y: 2.15, z: 18.9, color: '#c6ecff', intensity: 13, distance: 8.5, on: 'south' },
    { x: 11.0, y: 2.15, z: 18.9, color: '#c6ecff', intensity: 13, distance: 8.5, on: 'south' },
    { x: 3.3, y: 1.2, z: 23.6, color: '#4fd2ff', intensity: 10, distance: 6 },
    { x: 10.8, y: 1.2, z: 23.6, color: '#4fd2ff', intensity: 10, distance: 6 },
    { x: 12.6, y: 1.8, z: 19.1, color: '#5dff9c', intensity: 6, distance: 4.5, mode: 'pulse', amount: 0.3, speed: 2.4 },
    { x: 7.0, y: 2.4, z: 27.0, color: '#8fb6ff', intensity: 6, distance: 7, decorative: true },
    // corridor
    { x: 4.5, y: 1.95, z: 13.1, color: '#ffa64a', intensity: 34, distance: 8.5 },
    { x: 13.5, y: 1.95, z: 13.1, color: '#ffa64a', intensity: 34, distance: 8.5 },
    { x: 22.5, y: 1.95, z: 13.1, color: '#ffa64a', intensity: 34, distance: 8.5, mode: 'flicker', amount: 0.6, speed: 7 },
    { x: 31.5, y: 1.95, z: 13.1, color: '#ffa64a', intensity: 34, distance: 8.5 },
    { x: 10.5, y: 1.3, z: 13.1, color: '#45d4ff', intensity: 4, distance: 3.2, decorative: true },
    { x: 28.5, y: 1.3, z: 13.1, color: '#45d4ff', intensity: 4, distance: 3.2, decorative: true },
    // engineering
    { x: 25.5, y: 1.7, z: 24.0, color: '#ff7a2f', intensity: 34, distance: 11, decay: 1.4, mode: 'reactor' },
    { x: 25.5, y: 3.9, z: 24.4, color: '#ff4fc0', intensity: 12, distance: 7, mode: 'pulse', amount: 0.5, speed: 2.2, decorative: true },
    { x: 17.5, y: 2.15, z: 18.8, color: '#ffb04a', intensity: 16, distance: 8, on: 'south' },
    { x: 23.5, y: 2.15, z: 18.8, color: '#ffb04a', intensity: 12, distance: 7, on: 'south' },
    { x: 28.1, y: 1.5, z: 18.6, color: '#ffcf7a', intensity: 9, distance: 4.5, on: 'south', mode: 'flicker', amount: 1, speed: 13 },
    // vent grates glow from below and light their steam
    { x: 17.5, y: 0.45, z: 26.5, color: '#ff8a3a', intensity: 7, distance: 4, mode: 'pulse', amount: 0.35, speed: 1.7 },
    { x: 31.5, y: 0.45, z: 21.5, color: '#ff8a3a', intensity: 7, distance: 4, mode: 'pulse', amount: 0.35, speed: 1.9 },
    { x: 30.5, y: 0.45, z: 27.5, color: '#ff8a3a', intensity: 7, distance: 4, mode: 'pulse', amount: 0.35, speed: 1.5 },
    // antechamber (the door lamp turns from red to green once the bridge is unlocked)
    { x: 39.4, y: 2.15, z: 12.8, color: '#ffa64a', intensity: 15, distance: 7, on: 'bridge' },
    { x: 42.6, y: 2.15, z: 12.8, color: '#ffa64a', intensity: 15, distance: 7, on: 'bridge' },
    { x: 44.5, y: 1.8, z: 13.1, color: '#5dff9c', intensity: 6, distance: 4.5, mode: 'pulse', amount: 0.3, speed: 2.4 },
    { x: 41.0, y: 2.6, z: 12.45, color: '#ff3b4e', intensity: 5, distance: 3.2, on: 'bridge', tag: 'door_light', when: '!story:bridge_unlocked' },
    { x: 41.0, y: 2.6, z: 12.45, color: '#4dff9c', intensity: 5, distance: 3.2, on: 'bridge', tag: 'door_light', when: 'story:bridge_unlocked' },
    // bridge
    { x: 43.8, y: 1.9, z: 7.4, color: '#45d4ff', intensity: 15, distance: 7, mode: 'pulse', amount: 0.18, speed: 1.6 },
    { x: 45.2, y: 0.8, z: 9.5, color: '#6fe9ff', intensity: 6, distance: 4 },
    { x: 39.7, y: 1.3, z: 7.2, color: '#ff3b4e', intensity: 9, distance: 5.5, mode: 'pulse', amount: 0.4, speed: 1.3, tag: 'sentinel' },
    { x: 41.0, y: 2.6, z: 3.0, color: '#8fb8ff', intensity: 10, distance: 9 },
    { x: 35.6, y: 1.3, z: 3.0, color: '#45d4ff', intensity: 4, distance: 3.2, decorative: true },
    { x: 36.6, y: 1.3, z: 9.7, color: '#45d4ff', intensity: 5, distance: 3.5, decorative: true },
    { x: 46.4, y: 1.3, z: 3.0, color: '#45d4ff', intensity: 4, distance: 3.2, decorative: true },
  ],
  // dust / frost emitters per area (steam, sparks and embers belong to their props)
  ambient: [
    ...[[3.25, 21.6], [10.75, 21.6], [3.25, 25.6], [10.75, 25.6]].map(([x, z]) => (
      { preset: 'steam', x, y: 0.66, z, area: [2.2, 0.05, 1.6], rate: 2.2, color: '#bfe6ff', speed: 0.35, size: 1.4 })),
    { preset: 'dust', x: 7.5, y: 1.4, z: 23.5, area: [12, 2.6, 10], rate: 3.5, color: '#d8efff' },
    { preset: 'frost', x: 7.5, y: 0.9, z: 23.5, area: [12, 1.6, 10], rate: 8 },
    { preset: 'dust', x: 18, y: 1.5, z: 13.6, area: [34, 2.6, 2.8], rate: 6, color: '#cfe6ff' },
    { preset: 'dust', x: 18, y: 1.4, z: 15.8, area: [34, 2.4, 2.2], rate: 3, color: '#ffd9a8' },
    { preset: 'dust', x: 24.5, y: 1.6, z: 23.5, area: [18, 3, 10], rate: 5, color: '#ffc59a' },
    { preset: 'dust', x: 41.5, y: 1.4, z: 14.5, area: [9, 2.4, 4.5], rate: 2, color: '#ffd9a8' },
    { preset: 'dust', x: 41, y: 1.6, z: 5.0, area: [11, 3, 6], rate: 2.2, color: '#9fb8e8' },
  ],
  backdrop: { texture: 'space_backdrop', stars: 'stars_layer', tint: [1.05, 1.05, 1.1] },
  view: { pitch: 34, dist: 16 },
  npcs: [
    {
      // BOLT hovers by Kade's pod until the companion system makes him follow (story:kade_awake)
      id: 'bolt', sprite: 'bolt', x: 8.35, z: 20.75, facing: 'down', name: 'BOLT', when: '!story:kade_awake',
      talk: [
        { when: '!talk:halcyon:bolt', lines: BOLT_INTRO },
        { when: 'item:keycard & !story:bridge_unlocked', lines: [bolt('You found the keycard! The bridge is at the *east end* of the Spine Corridor. Rest at the antechamber Med-Station first!')] },
        { when: 'story:bridge_unlocked', lines: [bolt('I would come with you, but my threat-assessment module says *no*. Loudly.')] },
        { lines: [
          bolt('Remember: find the *weakness*, *Break* the shield, then *Boost*. In that order. Please.'),
          bolt('The Bridge Keycard should be in an *Engineering* supply crate. South off the Spine Corridor.'),
        ] },
      ],
    },
    {
      id: 'halcyon', sprite: 'holo', x: 45.2, z: 9.5, facing: 'down', name: 'HALCYON', hologram: true, shadow: false,
      talk: [
        { when: 'defeated:boss_sentinel', lines: [
          holo('The Sentinel is offline. Thank you, Commander. Helm control is yours again.'),
          holo('Plotting a course away from the gas giant. For the first time in 412 days... we are *moving*.'),
        ] },
        { when: '!talk:halcyon:halcyon', lines: HALCYON_INTRO },
        { lines: [HALCYON_INTRO[2]] },
      ],
    },
  ],
  // one-time supply crates: flag chest:halcyon:<id>
  chests: [
    { id: 'cryo_1', x: 1.55, z: 28.2, item: 'medigel', n: 1 },
    { id: 'cor_1', x: 1.55, z: 16.3, item: 'ether', n: 1 },
    { id: 'eng_1', x: 16.05, z: 20.6, item: 'medigel', n: 2 },
    { id: 'eng_2', x: 32.9, z: 27.95, item: 'keycard', n: 1, talk: [{ speaker: 'KADE', text: 'The *Bridge Keycard*. Let\'s go see who locked us out.' }] },
    { id: 'eng_3', x: 18.6, z: 28.0, item: 'ether', n: 1 },
    { id: 'eng_4', x: 33.0, z: 19.45, item: 'revive', n: 1 },
  ],
  interactables,
  // the Sentinel before the bridge window (POC encounter id until C1 adds pro_boss_sentinel)
  bosses: [{
    id: 'sentinel', art: 'sentinel', name: 'SENTINEL', x: 38.7, z: 4.9, facing: 'right', encounter: 'boss_sentinel',
    triggerRadius: 3.4, radius: 1.3, focus: true, light: 'sentinel',
    talk: [
      { speaker: null, text: 'The SENTINEL turns. Its optics flare *red*.' },
      { speaker: 'SENTINEL', text: 'INTRUDERS ON THE COMMAND DECK. PURGE PROTOCOL ENGAGED.', portrait: 'enemy:sentinel' },
      { speaker: 'KADE', text: 'Squad, weapons free!' },
    ],
  }],
  viewpoints: {
    cryo: { x: 6.6, z: 22.6, facing: 'down' },
    corridor: { x: 17.0, z: 14.6, facing: 'right' },
    engineering: { x: 22.6, z: 21.6, facing: 'down' },
    antechamber: { x: 41.0, z: 14.4, facing: 'up' },
    bridge: { x: 41.6, z: 8.9, facing: 'up' },
  },
};
