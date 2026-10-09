// ISV Halcyon crew decks (PURE MapDef, TECH_PLAN 3.1, 12.5). The POC map, with every POC coordinate
// kept, extended by the prologue's new rooms (in void cells of the old grid and in new rows at the
// bottom): the Cryo Medical Bay (south of the Cryo Deck), Reactor Control and the Coolant Gallery
// (south of the Engineering Bay; Orion's shutters face the gallery) and the Moth Berth (south of the
// Bridge Antechamber). 1 tile = 1 world unit; cell (c, r) spans x c..c+1, z r..r+1 (+Z = south).
//
// Wall rows shared by two stacked rooms are `dividers`: they stand full height while the leader is
// south of them and sink to the cutaway height once the leader is north. Props hanging on a divider
// name it with `on`.
//
// Binding for other owners: spawns start, cryo, medbay, corridor, engineering, engineering_reactor,
// antechamber, berth, bridge, bridge_starchart (bulkhead, corridor_east, gallery, gallery_w stage the
// prologue's scenes for the contact sheet); anchors hub_stall (the berth, beside the Moth),
// hub_planters (Spine Corridor), hub_voss_post (antechamber), hub_halcyon (HALCYON's projector on
// the bridge, NPC `halcyon`), memorial (Cryo Deck, south-west); interactables `starchart` (bridge),
// `berth_chart` (berth), `fabricator` (antechamber shop), Med-Stations `med_cryo`, `med_bay`,
// `med_ante`; the bridge door lock `bridge_door`. Every line lives in prologue/story.js.

// Area moods: fog / background, hemisphere fill, key ("planet") light, sprite fill light, post FX.
const MOOD = {
  cryo: {
    fog: '#08121d', density: 0.034, sky: '#3f6f9c', ground: '#0a0f18', hemi: 0.34,
    key: 0.45, keyColor: '#bfe6ff', fill: 0.28, exposure: 1.06, bloom: 0.95, saturation: 1.04,
  },
  medbay: {
    fog: '#081419', density: 0.032, sky: '#4f8f96', ground: '#091013', hemi: 0.42,
    key: 0.5, keyColor: '#d2fff4', fill: 0.32, exposure: 1.07, bloom: 0.98, saturation: 1.02,
  },
  corridor: {
    fog: '#070b17', density: 0.03, sky: '#3a4f80', ground: '#0b0b12', hemi: 0.55,
    key: 2.6, fill: 0.36, exposure: 1.04, bloom: 0.9, saturation: 1.08,
  },
  engineering: {
    fog: '#140809', density: 0.034, sky: '#5a3348', ground: '#0e0708', hemi: 0.38,
    key: 0.5, keyColor: '#ffb98a', fill: 0.34, exposure: 1.05, bloom: 1.0, saturation: 1.12,
  },
  gallery: {
    fog: '#0c0a10', density: 0.03, sky: '#5a4868', ground: '#0d0a0f', hemi: 0.64,
    key: 0.6, keyColor: '#ff9a6a', fill: 0.48, exposure: 1.12, bloom: 1.0, saturation: 1.1,
  },
  control: {
    fog: '#100a14', density: 0.032, sky: '#5a4078', ground: '#0a070d', hemi: 0.4,
    key: 0.5, keyColor: '#c9a2ff', fill: 0.34, exposure: 1.06, bloom: 1.0, saturation: 1.1,
  },
  antechamber: {
    fog: '#090a14', density: 0.032, sky: '#3c4a72', ground: '#0b0b12', hemi: 0.62,
    key: 1.0, fill: 0.42, exposure: 1.04, bloom: 0.9, saturation: 1.08,
  },
  berth: {
    fog: '#0b0a0c', density: 0.03, sky: '#6a5a48', ground: '#0a0807', hemi: 0.62,
    key: 0.7, keyColor: '#ffd2a0', fill: 0.46, exposure: 1.1, bloom: 0.98, saturation: 1.08,
  },
  bridge: {
    fog: '#05081a', density: 0.026, sky: '#3a5590', ground: '#07080f', hemi: 0.5,
    key: 3.0, fill: 0.34, exposure: 1.06, bloom: 0.95, saturation: 1.1,
  },
};

const FLOOR_LOOK = { roughness: 0.62, metalness: 0.28, emissive: 2.0 };

// ---------------------------------------------------------------- props
// Positions are world units (x, z = footprint centre).

// Cryo Deck pods: beside Kade's (pod 07, open and empty) each bank of three carries one read-out over
// its middle pod (a read-out is wider than a pod), REVIVAL DEFERRED until the epilogue authorizes
// the revivals (story:revival_authorized).
const PODS = [1.5, 2.5, 3.5, 4.5, 9.5, 10.5, 11.5];

// the three Ram-Drones at Orion's shutters (the rescue script spawns its actors on these spots)
export const RAM_DRONES = [[19.9, 34.55], [21.95, 34.6], [20.9, 35.3]];
const pods = PODS.map((x) => (x === 4.5
  ? { t: 'pro.openPod', x, z: 18.36, id: 'pod_07' }
  : { t: 'pod', x, z: 18.36, ...(x === 2.5 || x === 10.5 ? { status: 'story:revival_authorized', delay: x / 20 } : {}) }));
const beds = [21.6, 25.6].flatMap((z) => [2.0, 3.25, 4.5, 9.5, 10.75, 12.0].map((x) => ({ t: 'bed', x, z })));
const benches = [9, 18, 27].map((x) => ({ t: 'pro.bench', x, z: 13.15, w: 1.9 }));
const corridorLamps = [4.5, 13.5, 22.5, 31.5].map((x) => ({ t: 'lamp', x, y: 2.5, z: 12.02 }));

// Screens WARDEN takes over (cs.screens, the WARDEN speaker mood): one `screen` prop per monitor,
// grouped per room (eng, bridge, cryo, corridor). A standing monitor is a pedestal plus its screen.
const monitor = (group, x, z, on) => [
  { t: 'pro.monitor', x, z, on },
  { t: 'screen', group, x, z: z + 0.03, y: 1.0, w: 1.0, h: 0.6, on },
];
const wallScreen = (group, x, y, z, on) => ({ t: 'screen', group, x, y, z, w: 0.86, h: 0.5, on });
const screens = [
  // Engineering: two monitors flanking the reactor (the coil install's frame) and one by the door
  ...monitor('eng', 22.3, 23.1),
  ...monitor('eng', 28.7, 23.1),
  wallScreen('eng', 23.5, 1.35, 18.03, 'south'),
  // the bridge: over the helm and captain's consoles, on the window's screen panels
  wallScreen('bridge', 35.5, 1.25, 2.03),
  wallScreen('bridge', 46.5, 1.25, 2.03),
  // the Cryo Deck: the stasis monitor by the Med-Station, and over the terminal
  ...monitor('cryo', 12.7, 21.4),
  wallScreen('cryo', 9.5, 2.3, 18.03, 'south'),
  // the Spine Corridor: under the lamps between the windows
  wallScreen('corridor', 13.5, 1.45, 12.03),
  wallScreen('corridor', 22.5, 1.45, 12.03),
];

const props = [
  ...screens,

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
  { t: 'guide', from: [7.0, 19.4], to: [7.0, 28.7], color: '#ff5a6a', when: 'pro:medbay_alarm & !story:sera_joined' },

  // ---- Cryo Medical Bay
  { t: 'pod', x: 9.5, z: 30.36 },
  { t: 'pro.openPod', x: 10.5, z: 30.36, id: 'pod_m2', forced: true },
  { t: 'pod', x: 11.5, z: 30.36 },
  { t: 'pod', x: 12.5, z: 30.36 },
  { t: 'bed', x: 2.0, z: 33.9 },
  { t: 'bed', x: 3.25, z: 33.9 },
  { t: 'bed', x: 12.2, z: 34.4 },
  { t: 'lamp', x: 2.6, y: 2.5, z: 30.02, on: 'lower', cool: true },
  { t: 'lamp', x: 11.0, y: 2.5, z: 30.02, on: 'lower', cool: true },
  { t: 'sign', name: 'pro_sign_medbay', x: 7.0, z: 30.0, on: 'lower' },
  { t: 'crate', x: 1.6, z: 35.3, s: 0.85 },
  { t: 'crate', x: 5.4, z: 35.4, s: 0.7, rot: 0.3 },
  { t: 'decal', name: 'decal_grime', x: 8.6, z: 33.1, rot: 1 },
  { t: 'decal', name: 'decal_oil', x: 4.3, z: 32.2, rot: 2 },

  // ---- Spine Corridor
  ...benches,
  ...corridorLamps,
  { t: 'crate', x: 35.3, z: 16.3 },
  { t: 'crate', x: 34.35, z: 16.38, s: 0.78, rot: 0.2 },
  { t: 'crate', x: 35.3, z: 16.3, y: 1, s: 0.7, rot: -0.3 },
  { t: 'locker', x: 32.5, z: 12.32 },
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
  { t: 'decal', name: 'decal_arrow', x: 29.6, z: 28.45, rot: 2 },

  { t: 'guide', x0: 1.5, x1: 35.5, z: 15.9, step: 1, color: '#45d4ff' },

  // ---- Reactor Control (Orion's barricade) and the Coolant Gallery
  { t: 'console', x: 16.5, z: 30.36 },
  { t: 'console', x: 17.5, z: 30.36 },
  { t: 'console', x: 24.5, z: 30.36 },
  { t: 'console', x: 25.5, z: 30.36 },
  { t: 'chair', x: 17.0, z: 31.1 },
  { t: 'crate', x: 19.4, z: 32.5, s: 0.8, rot: 0.2 },
  { t: 'crate', x: 22.4, z: 32.4, s: 0.85, rot: -0.15 },
  { t: 'crate', x: 22.4, z: 32.4, y: 0.85, s: 0.6, rot: 0.4 },
  { t: 'lamp', x: 20.8, y: 2.5, z: 30.02, on: 'lower' },
  { t: 'decal', name: 'decal_scorch', x: 20.9, z: 34.4, rot: 0, when: '!story:orion_joined' },
  // the Ram-Drones hammering on Orion's shutters (props until the rescue spawns them as actors)
  ...RAM_DRONES.map(([x, z]) => ({ t: 'sprite', sheet: 'enemy:drone', x, z, when: '!story:orion_joined & !pro:rescue_started' })),
  { t: 'pro.pump', x: 17.5, z: 37.2 },
  { t: 'pro.pump', x: 23.5, z: 37.2 },
  { t: 'pro.pump', x: 29.5, z: 37.2 },
  { t: 'pipe', axis: 'z', x: 33.84, y: 2.3, z0: 30, z1: 38, r: 0.12, on: 'lower' },
  { t: 'vent', x: 21.5, z: 35.5 },
  { t: 'vent', x: 27.5, z: 35.5 },
  { t: 'vent', x: 30.5, z: 31.5 },
  { t: 'lamp', x: 30.5, y: 2.5, z: 30.02, on: 'lower' },
  { t: 'lamp', x: 18.0, y: 2.5, z: 34.02, on: 'control' },
  { t: 'lamp', x: 24.0, y: 2.5, z: 34.02, on: 'control' },
  { t: 'glow', x: 20.9, y: 2.72, z: 34.25, color: '#ff3344', size: 1.4, intensity: 1.3, when: '!story:orion_joined' },
  { t: 'decal', name: 'decal_oil', x: 27.6, z: 36.3, rot: 1 },
  { t: 'decal', name: 'decal_grime', x: 31.0, z: 33.6, rot: 3 },
  { t: 'decal', name: 'decal_arrow', x: 30.9, z: 32.8, rot: 2 },
  { t: 'guide', x0: 16, x1: 33, z: 34.2, step: 1, color: '#ff9a4a' },
  // the south rim below the tanks: amber floor-edge lamps, lit pipes in the foreground, and past the
  // cutaway wall the machinery deck below
  { t: 'guide', x0: 15.5, x1: 33.5, z: 37.8, step: 1, color: '#ffb04a' },
  { t: 'pro.pipeRun', x0: 15, x1: 34, z: 38.55, y: 0.5, lamp: '#7fe3ff' },
  { t: 'pro.underdeck', x0: 14, x1: 35, z: 39 },

  // ---- Bridge antechamber
  { t: 'lamp', x: 39.4, y: 2.5, z: 12.02, on: 'bridge' },
  { t: 'lamp', x: 42.6, y: 2.5, z: 12.02, on: 'bridge' },
  { t: 'sign', name: 'sign_bridge', x: 41.0, z: 12.0, on: 'bridge' },
  { t: 'crate', x: 45.4, z: 16.3, s: 0.9 },
  { t: 'decal', name: 'decal_grime', x: 38.6, z: 15.8, rot: 1 },
  { t: 'decal', name: 'decal_arrow', x: 41.0, z: 14.2, rot: 0 },
  { t: 'guide', x0: 37.5, x1: 45.5, z: 15.9, step: 1, color: '#ffb54a' },

  // ---- Moth Berth: Nyx's skiff on its pad, a wing torn off until BOLT tapes her up after the SENTINEL
  { t: 'pro.moth', x: 43.4, z: 21.6, pad: true, winged: true, when: '!story:prologue_done' },
  { t: 'pro.moth', x: 43.4, z: 21.6, pad: true, when: 'story:prologue_done' },
  { t: 'lamp', x: 39.5, y: 2.5, z: 18.02, on: 'berth' },
  { t: 'lamp', x: 45.0, y: 2.5, z: 18.02, on: 'berth' },
  { t: 'crate', x: 36.7, z: 18.9, s: 0.85 },
  { t: 'crate', x: 37.6, z: 18.8, s: 0.7, rot: 0.3 },
  { t: 'crate', x: 36.8, z: 25.3, s: 0.9, rot: -0.1 },
  // the south rim: amber floor-edge lamps; past the cutaway wall, the machinery deck below
  { t: 'guide', x0: 37.5, x1: 46.5, z: 25.8, step: 1, color: '#ffb04a' },
  { t: 'pro.underdeck', x0: 35, x1: 47, z: 27 },
  { t: 'decal', name: 'decal_scorch', x: 44.6, z: 24.2, rot: 2 },
  { t: 'decal', name: 'decal_oil', x: 40.6, z: 24.6, rot: 0 },

  // ---- Observation Bridge
  { t: 'chair', x: 41.6, z: 5.3 },
  { t: 'console', x: 37.15, z: 9.0 },
  { t: 'pro.bench', x: 36.6, z: 10.15, w: 2 },
  { t: 'decal', name: 'decal_grime', x: 38.6, z: 7.9, rot: 1 },
  { t: 'decal', name: 'decal_grime', x: 36.4, z: 9.6, rot: 2 },
  { t: 'decal', name: 'decal_scorch', x: 38.9, z: 5.6, rot: 1, when: 'story:prologue_done' },
  // the SENTINEL's wreck stays on the bridge once the prologue is over
  { t: 'sprite', sheet: 'enemy:sentinel', anim: 'break', x: 38.7, z: 4.9, when: 'story:prologue_done' },
];

// ---------------------------------------------------------------- interactables

const terminal = (id, x, z, script) => ({
  id, kind: 'terminal', x, z: z + 0.31, box: [x - 0.5, z - 0.33, x + 0.5, z + 0.33],
  label: 'Access', icon: 'inspect', prop: 'console', propFields: { x, z }, talk: script,
});
const medStation = (id, x, z) => ({
  id, kind: 'med', x, z: z + 0.31, box: [x - 0.52, z - 0.33, x + 0.52, z + 0.33],
  label: 'Med-Station', icon: 'save', prop: 'med', propFields: { x, z },
  prompt: 'Restore the squad and log a checkpoint?',
});

const interactables = [
  medStation('med_cryo', 12.6, 18.34),
  medStation('med_bay', 3.2, 30.34),
  medStation('med_ante', 44.5, 12.34),
  terminal('term_cryo', 13.4, 23.2, 'prologue.term_cryo'),
  terminal('term_medbay', 4.7, 30.36, 'prologue.term_medbay'),
  terminal('term_nav', 10.5, 12.36, 'prologue.term_nav'),
  terminal('term_window', 28.5, 12.36, 'prologue.term_window'),
  terminal('term_reactor', 19.6, 24.2, 'prologue.term_reactor'),
  terminal('term_security', 37.6, 12.36, 'prologue.term_security'),
  terminal('term_helm', 35.6, 2.36, 'prologue.term_helm'),
  terminal('term_captain', 46.4, 2.36, 'prologue.term_captain'),
  terminal('term_aft', 36.1, 9.0, 'prologue.term_aft'),
  {
    // Kade's old security locker: only his override opens it (12.4 leader-gated interaction)
    id: 'kade_locker', kind: 'inspect', x: 33.5, z: 12.63, box: [33.0, 12.0, 34.0, 12.65], label: 'Open', icon: 'inspect',
    prop: 'locker', propFields: { x: 33.5, z: 12.32 }, leader: 'kade', talk: 'prologue.kade_locker',
    leaderHint: 'A Security Corps locker, coded shut. *Kade\'s* override could open it.',
  },
  {
    id: 'fabricator', kind: 'shop', shop: 'fabricator', x: 45.6, z: 12.71, box: [45.12, 12.0, 46.0, 12.68],
    label: 'Fabricator', icon: 'shop', prop: 'pro.fabricator', propFields: { x: 45.55, z: 12.34 },
  },
  { id: 'starchart', kind: 'starchart', x: 43.8, z: 7.4 },
  { id: 'berth_chart', kind: 'starchart', x: 38.4, z: 23.4 },
];

export default {
  id: 'halcyon',
  name: 'ISV Halcyon',
  region: 'Crew Decks',
  music: 'explore',
  grid: [
    //         1111111111222222222233333333334444444444
    // 1234567890123456789012345678901234567890123456789
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
    '##s#v#DD#s#vs##pp#v#DD#s##s###v#pp###s#v##DD#s##', // 17
    '#ccccchhcccccc#.....hh............##BBBBBBhhhhB#', // 18
    '#ccccc..cccccc#...................##BBBBBBBBBBB#', // 19
    '#ccccc..cccccc#...................##BBBBBBBBBBB#', // 20
    '#ccccc..cccccc#.......ggggggg..g..##BBBBBBBBBBB#', // 21
    '#ccccc..cccccc#.......ggggggg.....##BBBBBBBBBBB#', // 22
    '#ccccc..cccccc#.......ggggggg.....##BBBBBBBBBBB#', // 23
    '#ccccc..cccccc#.......ggggggg.....##BBBBBBBBBBB#', // 24
    '#ccccc..cccccc#.......ggggggg.....##BBBBBBhhhhB#', // 25
    '#ccccc..cccccc#..g....ggggggg.....##############', // 26
    '#ccccc..cccccc#...............g...#             ', // 27
    '#ccccc..cccccc#...................#             ', // 28
    '##s#v#MM#s#vs###ss#pssp#ss###DD#pp#             ', // 29
    '#mmmmmmmmmmmmm#kkkkkkkkkkkk#,,,,,,#             ', // 30
    '#mmmmmmmmmmmmm#kkkkkkkkkkkk#,,gg,,#             ', // 31
    '#mmmmmmmmmmmmm#kkkkkhhkkkkk#,,,,,,#             ', // 32
    '#mmmmmmmmmmmmm##p#v#hh#v#p##,,,,,,#             ', // 33
    '#mmmmmmmmmmmmm#,,,,,,,,,,,,,,,,,,,#             ', // 34
    '#mmmmmmmmmmmmm#,,,,,ggg,,,ggg,,,,,#             ', // 35
    '###############,,,,,,,,,,,,,,,,,,,#             ', // 36
    '              #,,,,,,,,,,,,,,,,,,,#             ', // 37
    '              #####################             ', // 38
  ],
  legend: {
    // the POC bridge door: the keycard sets the flag; the panel explains itself while locked
    L: {
      t: 'door', tex: 'door', lockedTex: 'door_locked', floor: 'floor_plate',
      lock: {
        flag: 'story:bridge_unlocked', item: 'keycard', id: 'bridge_door', label: 'Inspect',
        toast: 'Bridge access *granted*', talk: 'prologue.bridge_door',
      },
    },
    // the medbay door stays in lockdown until the pod alarm trips its emergency override
    M: {
      t: 'door', tex: 'door', lockedTex: 'door_locked', floor: 'floor_plate',
      lock: { flag: 'pro:medbay_alarm', id: 'medbay_door', label: 'Inspect', talk: 'prologue.medbay_door' },
    },
    m: { t: 'floor', tex: 'floor_cryo', mix: [['floor_plate', 0.16]], grime: 0.04, ...FLOOR_LOOK, emissive: 2.2 },
    k: { t: 'floor', tex: 'floor_grate', mix: [['floor_plate', 0.45]], grime: 0.05, ...FLOOR_LOOK, emissive: 2.4 },
    B: { t: 'floor', tex: 'floor_plate_worn', mix: [['floor_plate', 0.35], ['floor_grate', 0.12]], grime: 0.1, ...FLOOR_LOOK },
  },
  wallH: 3,
  lowH: 0.75,
  wallTex: { side: 'wall_panel', cap: 'wall_cap', low: 'wall_low' },
  // the bridge's north wall is two storeys of glass
  grand: [{ row: 1, c0: 34, c1: 47, height: 6 }],
  dividers: [
    { id: 'south', row: 17, rect: [0, 17, 34, 29] },
    { id: 'bridge', row: 11, rect: [34, 11, 47, 17] },
    { id: 'berth', row: 17, rect: [35, 17, 47, 26] },
    { id: 'lower', row: 29, rect: [0, 29, 34, 38] },
    { id: 'control', row: 33, rect: [15, 33, 27, 38] },
  ],
  // cam: [z0, z1] clamp for the camera target's z; ceiling: lit by the planet only through windows.
  // Zones follow the story: no encounters until Sera is awake, the Spine's own patrols with her,
  // Engineering's once Orion leads the way, and the tighter late patrols once WARDEN has spoken.
  areas: [
    { id: 'cryo', name: 'Cryo Deck', subtitle: 'Deck 2 · Stasis Ward', rect: [1, 18, 14, 29], cam: [20.4, 25.8], zone: null, mood: MOOD.cryo },
    {
      id: 'corridor', name: 'Spine Corridor', subtitle: 'Deck 2 · Hull Ring', rect: [1, 12, 36.5, 17], cam: [14.25, 14.75], ceiling: true, mood: MOOD.corridor,
      zone: [{ when: 'story:warden_speaks', zone: 'pro_late' }, { when: 'story:orion_joined', zone: 'pro_engineering' }, { when: 'story:sera_joined', zone: 'pro_corridor' }],
    },
    {
      id: 'engineering', name: 'Engineering Bay', subtitle: 'Deck 2 · Reactor Hall', rect: [15, 18, 34, 29], cam: [20.4, 25.8], mood: MOOD.engineering,
      zone: [{ when: 'story:warden_speaks', zone: 'pro_late' }, { when: 'story:orion_joined', zone: 'pro_engineering' }],
    },
    { id: 'antechamber', name: 'Bridge Antechamber', subtitle: 'Deck 1 · Command Access', rect: [36.5, 12, 46, 17], cam: [13.6, 14.0], zone: null, ceiling: true, mood: MOOD.antechamber },
    {
      id: 'bridge', name: 'Observation Bridge', subtitle: 'Deck 1 · Command', rect: [35, 2, 47, 11], cam: [4.4, 6.9], zone: null, ceiling: true, ceilingY: 6.05,
      // the tilt-shift band leans toward the Sentinel while it stands before the window
      focus: { x: 38.7, y: 2.4, z: 4.9, w: 0.4, band: 0.17, whileBoss: 'sentinel' }, mood: MOOD.bridge,
    },
    { id: 'medbay', name: 'Cryo Medical Bay', subtitle: 'Deck 2 · Stasis Medical', rect: [1, 29.4, 14, 36], cam: [32.4, 33.2], zone: null, mood: MOOD.medbay },
    { id: 'control', name: 'Reactor Control', subtitle: 'Deck 2 · Engineering', rect: [15, 29.4, 27, 33.6], cam: [31.6, 31.8], zone: null, mood: MOOD.control },
    {
      id: 'gallery', name: 'Coolant Gallery', subtitle: 'Deck 2 · Engineering', rect: [15, 29.4, 34, 38], cam: [32.2, 34.4], mood: MOOD.gallery,
      zone: [{ when: 'story:warden_speaks', zone: 'pro_late' }, { when: 'story:orion_joined', zone: 'pro_engineering' }],
    },
    { id: 'berth', name: 'Moth Berth', subtitle: 'Deck 1 · Airlock 3', rect: [35.5, 17.4, 47, 26], cam: [20.6, 22.2], zone: null, mood: MOOD.berth },
  ],
  spawns: {
    start: { x: 6.55, z: 20.3, facing: 'down' },
    cryo: { x: 6.6, z: 22.6, facing: 'down' },
    medbay: { x: 7.0, z: 31.2, facing: 'down' },
    corridor: { x: 17.0, z: 14.6, facing: 'right' },
    bulkhead: { x: 9.0, z: 14.6, facing: 'right' },
    corridor_east: { x: 34.0, z: 14.6, facing: 'right' },
    engineering: { x: 20.95, z: 19.6, facing: 'down' },
    gallery: { x: 24.0, z: 35.6, facing: 'left' },
    gallery_w: { x: 19.2, z: 36.2, facing: 'left' },
    engineering_reactor: { x: 25.5, z: 26.4, facing: 'up' },
    antechamber: { x: 41.0, z: 14.4, facing: 'up' },
    berth: { x: 40.1, z: 23.8, facing: 'up' },
    bridge: { x: 41.0, z: 9.4, facing: 'up' },
    bridge_starchart: { x: 43.8, z: 9.15, facing: 'up' },
  },
  // staging spots for the world-reacts additions of later chapters (12.3)
  anchors: {
    hub_stall: { x: 39.4, z: 19.6, facing: 'down' },
    hub_planters: { x: 31.4, z: 12.9, facing: 'down' },
    hub_voss_post: { x: 38.2, z: 13.4, facing: 'down' },
    hub_halcyon: { x: 45.2, z: 9.5, facing: 'down' },
    memorial: { x: 3.4, z: 27.8, facing: 'down' },
    shutter: { x: 20.9, z: 33.5, facing: 'up' },
    sentinel_wreck: { x: 38.7, z: 4.9, facing: 'right' },
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
    // medbay: clinical teal, a red pod alarm until Sera is awake
    { x: 2.6, y: 2.15, z: 30.9, color: '#c6fff2', intensity: 12, distance: 7.5, on: 'lower' },
    { x: 11.0, y: 2.15, z: 30.9, color: '#c6fff2', intensity: 12, distance: 7.5, on: 'lower' },
    { x: 3.2, y: 1.8, z: 31.1, color: '#5dff9c', intensity: 6, distance: 4.5, mode: 'pulse', amount: 0.3, speed: 2.4 },
    { x: 10.5, y: 1.6, z: 31.2, color: '#ff3b4e', intensity: 10, distance: 5.5, mode: 'strobe', amount: 0.8, speed: 3, tag: 'pod_alarm', when: 'pro:medbay_alarm & !story:sera_joined' },
    { x: 10.5, y: 1.6, z: 31.2, color: '#4fd2ff', intensity: 7, distance: 5, when: '!pro:medbay_alarm | story:sera_joined' },
    { x: 7.0, y: 1.2, z: 34.6, color: '#7fe3ff', intensity: 6, distance: 6, decorative: true },
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
    // reactor control: violet monitors; the coolant gallery: amber work lamps over the pumps
    { x: 17.0, y: 1.4, z: 30.9, color: '#b98cff', intensity: 9, distance: 5 },
    { x: 25.0, y: 1.4, z: 30.9, color: '#b98cff', intensity: 9, distance: 5 },
    { x: 20.8, y: 2.15, z: 30.9, color: '#ffd2a0', intensity: 10, distance: 6, on: 'lower' },
    { x: 30.5, y: 2.15, z: 30.9, color: '#ffb04a', intensity: 14, distance: 7, on: 'lower' },
    { x: 18.0, y: 2.15, z: 34.8, color: '#ffb04a', intensity: 14, distance: 7, on: 'control' },
    { x: 24.0, y: 2.15, z: 34.8, color: '#ffb04a', intensity: 14, distance: 7, on: 'control' },
    { x: 20.9, y: 2.6, z: 34.4, color: '#ff3b4e', intensity: 8, distance: 5, on: 'control', mode: 'strobe', amount: 0.8, speed: 2.4, when: '!story:orion_joined' },
    { x: 23.5, y: 2.3, z: 37.5, color: '#ffb04a', intensity: 10, distance: 4.5 },
    { x: 29.5, y: 2.3, z: 37.5, color: '#ffb04a', intensity: 10, distance: 4.5 },
    { x: 17.5, y: 2.3, z: 37.5, color: '#ffb04a', intensity: 10, distance: 4.5 },
    { x: 30.5, y: 0.45, z: 31.5, color: '#ff8a3a', intensity: 6, distance: 3.5, mode: 'pulse', amount: 0.35, speed: 1.6 },
    { x: 20.5, y: 0.6, z: 37.7, color: '#ffa040', intensity: 9, distance: 5.5 },
    { x: 26.5, y: 0.6, z: 37.7, color: '#45d4ff', intensity: 9, distance: 5.5, mode: 'pulse', amount: 0.2, speed: 1.1 },
    // antechamber (the door lamp turns from red to green once the bridge is unlocked)
    { x: 39.4, y: 2.15, z: 12.8, color: '#ffa64a', intensity: 15, distance: 7, on: 'bridge' },
    { x: 42.6, y: 2.15, z: 12.8, color: '#ffa64a', intensity: 15, distance: 7, on: 'bridge' },
    { x: 44.5, y: 1.8, z: 13.1, color: '#5dff9c', intensity: 6, distance: 4.5, mode: 'pulse', amount: 0.3, speed: 2.4 },
    { x: 45.6, y: 1.6, z: 13.0, color: '#7fe3ff', intensity: 6, distance: 4, mode: 'pulse', amount: 0.25, speed: 1.3 },
    { x: 41.0, y: 2.6, z: 12.45, color: '#ff3b4e', intensity: 5, distance: 3.2, on: 'bridge', tag: 'door_light', when: '!story:bridge_unlocked' },
    { x: 41.0, y: 2.6, z: 12.45, color: '#4dff9c', intensity: 5, distance: 3.2, on: 'bridge', tag: 'door_light', when: 'story:bridge_unlocked' },
    // berth: sodium work lamps, the Moth's running lights, a hazard strobe while she is winged
    { x: 39.5, y: 2.15, z: 18.9, color: '#ffc27a', intensity: 14, distance: 8, on: 'berth' },
    { x: 45.0, y: 2.15, z: 18.9, color: '#ffc27a', intensity: 14, distance: 8, on: 'berth' },
    { x: 41.2, y: 1.2, z: 22.9, color: '#3fd6d2', intensity: 7, distance: 4.5 },
    { x: 43.4, y: 3.4, z: 22.4, color: '#ffe2b8', intensity: 14, distance: 7, on: 'berth' },
    { x: 45.8, y: 1.2, z: 22.9, color: '#ff5a5a', intensity: 7, distance: 4.5, mode: 'strobe', amount: 0.7, speed: 1.6, when: '!story:prologue_done' },
    { x: 41.5, y: 2.4, z: 24.8, color: '#ffc27a', intensity: 12, distance: 8.5 },
    { x: 38.4, y: 1.4, z: 23.4, color: '#45d4ff', intensity: 9, distance: 5, mode: 'pulse', amount: 0.2, speed: 1.6 },
    // bridge
    { x: 43.8, y: 1.9, z: 7.4, color: '#45d4ff', intensity: 15, distance: 7, mode: 'pulse', amount: 0.18, speed: 1.6 },
    { x: 45.2, y: 0.8, z: 9.5, color: '#6fe9ff', intensity: 6, distance: 4 },
    { x: 39.7, y: 1.3, z: 7.2, color: '#ff3b4e', intensity: 9, distance: 5.5, mode: 'pulse', amount: 0.4, speed: 1.3, tag: 'sentinel', when: '!story:prologue_done' },
    { x: 39.3, y: 1.0, z: 6.2, color: '#ff3b4e', intensity: 4, distance: 4, mode: 'pulse', amount: 0.5, speed: 0.6, when: 'story:prologue_done' },
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
    { preset: 'dust', x: 7.5, y: 1.4, z: 33.0, area: [12, 2.4, 5.5], rate: 2.4, color: '#d2fff4' },
    { preset: 'frost', x: 10.5, y: 0.9, z: 31.2, area: [1.6, 1.2, 1.2], rate: 3 },
    { preset: 'dust', x: 18, y: 1.5, z: 13.6, area: [34, 2.6, 2.8], rate: 6, color: '#cfe6ff' },
    { preset: 'dust', x: 18, y: 1.4, z: 15.8, area: [34, 2.4, 2.2], rate: 3, color: '#ffd9a8' },
    { preset: 'dust', x: 24.5, y: 1.6, z: 23.5, area: [18, 3, 10], rate: 5, color: '#ffc59a' },
    { preset: 'dust', x: 21, y: 1.4, z: 31.2, area: [11, 2.2, 2.6], rate: 1.8, color: '#d8c4ff' },
    { preset: 'steam', x: 24.5, y: 0.6, z: 36.4, area: [17, 0.4, 1.4], rate: 3.2, color: '#c8d8ff', speed: 0.4, size: 1.3 },
    { preset: 'dust', x: 24.5, y: 1.5, z: 35.8, area: [18, 2.6, 3.4], rate: 2.6, color: '#ffd2a8' },
    { preset: 'dust', x: 41.5, y: 1.4, z: 14.5, area: [9, 2.4, 4.5], rate: 2, color: '#ffd9a8' },
    { preset: 'dust', x: 41.5, y: 1.6, z: 22.0, area: [10, 2.6, 7], rate: 2.4, color: '#ffe0b0' },
    { preset: 'smoke', x: 45.6, y: 1.4, z: 22.4, area: [0.6, 0.3, 0.6], rate: 1.6, when: '!story:prologue_done' },
    { preset: 'spark', x: 45.9, y: 1.1, z: 22.6, area: [0.2, 0.2, 0.2], rate: 1.1, burst: 10, when: '!story:prologue_done' },
    { preset: 'dust', x: 41, y: 1.6, z: 5.0, area: [11, 3, 6], rate: 2.2, color: '#9fb8e8' },
    { preset: 'spark', x: 38.9, y: 1.6, z: 5.2, area: [0.6, 0.6, 0.4], rate: 0.8, burst: 8, when: 'story:prologue_done' },
  ],
  backdrop: { texture: 'space_backdrop', stars: 'stars_layer', tint: [1.05, 1.05, 1.1] },
  view: { pitch: 34, dist: 16 },
  npcs: [
    // the travelers before they join (ids differ from member ids: scripts spawn the real actors)
    { id: 'sera_pod', sprite: 'sera', name: 'SERA', x: 10.5, z: 31.5, facing: 'down', pose: 'collapse', when: '!story:sera_joined' },
    // Orion behind his shutters, nursing the reactor-control consoles until the rescue
    { id: 'orion_ctrl', sprite: 'orion', name: 'ORION', x: 17.6, z: 31.3, facing: 'up', when: '!story:orion_joined' },
    { id: 'nyx_door', sprite: 'nyx', name: 'NYX', x: 41.0, z: 12.95, facing: 'up', pose: 'kneel', when: 'story:orion_joined & !story:nyx_joined' },
    // HALCYON's projector on the bridge, from the moment her fragment appears
    {
      id: 'halcyon', sprite: 'holo', x: 45.2, z: 9.5, facing: 'down', name: 'HALCYON', hologram: true, shadow: false,
      when: 'story:halcyon_fragment', talk: 'prologue.halcyon_hub',
    },
  ],
  // supply crates: flag chest:halcyon:<id>
  chests: [
    { id: 'cryo_1', x: 1.55, z: 28.2, item: 'medigel', n: 1 },
    { id: 'cor_1', x: 1.55, z: 16.3, item: 'ether', n: 1 },
    { id: 'eng_1', x: 16.05, z: 20.6, item: 'medigel', n: 2 },
    { id: 'eng_2', x: 32.9, z: 27.95, item: 'eq_x_stim_chip', n: 1 },
    { id: 'eng_3', x: 18.6, z: 28.0, item: 'ether', n: 1 },
    { id: 'eng_4', x: 33.0, z: 19.45, item: 'revive', n: 1 },
    { id: 'med_1', x: 13.0, z: 35.35, item: 'medigel_plus', n: 1 },
    { id: 'brandt', x: 15.75, z: 36.9, item: 'keycard', n: 1, talk: 'prologue.keycard' },
    // off the path: behind the Moth's cradle, Nyx's salvage stash
    { id: 'berth_stash', x: 46.25, z: 18.75, item: 'stim', n: 2, credits: 200 },
  ],
  interactables,
  // the medbay pod alarm, the hammering below Engineering and the travelers' scenes (prologue/story.js)
  triggers: [
    { id: 'tutorial', on: 'enter', rect: [4.6, 17.6, 9.4, 19.9], when: 'story:kade_awake & !story:sera_joined', once: true, script: 'prologue.tutorial' },
    { id: 'sera_wakes', on: 'enter', area: 'medbay', when: 'story:kade_awake & !story:sera_joined', once: true, script: 'prologue.sera_wakes' },
    // Kade and Sera's first fight together: drones drop from the vent over the Spine's bulkhead (G2 C1-1)
    { id: 'spine_drones', on: 'enter', rect: [9.6, 12, 12.4, 17], when: 'story:sera_joined & !story:orion_joined', once: true, script: 'prologue.spine_drones' },
    { id: 'hammering', on: 'enter', area: 'engineering', when: 'story:sera_joined & !story:orion_joined', once: true, script: 'prologue.hammering' },
    { id: 'orion_rescue', on: 'enter', rect: [15, 33.9, 27.4, 38], when: 'story:sera_joined & !story:orion_joined', once: true, script: 'prologue.orion_rescue' },
    { id: 'equip_tip', on: 'flag', when: 'story:orion_joined & item:eq_x_stim_chip & !tut:equip', once: true, script: 'prologue.equip_tip' },
    // Orion's first fight: an ambush between the shutters and Brandt's crate (G2 C1-1)
    { id: 'gallery_ambush', on: 'enter', rect: [15, 34.2, 18.4, 38], when: 'story:orion_joined & !item:keycard', once: true, script: 'prologue.gallery_ambush' },
    { id: 'nyx_door', on: 'enter', area: 'antechamber', when: 'story:orion_joined & !story:nyx_joined', once: true, script: 'prologue.nyx_door' },
    { id: 'bridge_open', on: 'flag', when: 'story:bridge_unlocked & !defeated:pro_boss_sentinel', once: true, script: 'prologue.bridge_open' },
  ],
  // Orion's shutters: rolled up by his rescue (sw:halcyon:control_shutter)
  gates: [
    { id: 'control_shutter', cells: [[20, 33], [21, 33]], open: 'sw:halcyon:control_shutter', prop: 'gate.shutter', propFields: { on: 'control' } },
  ],
  // the Sentinel before the bridge window
  bosses: [{
    id: 'sentinel', art: 'sentinel', name: 'SENTINEL', x: 38.7, z: 4.9, facing: 'right', encounter: 'pro_boss_sentinel',
    script: 'prologue.sentinel', triggerRadius: 3.4, radius: 1.3, focus: true, light: 'sentinel',
  }, {
    // M3: the optional elite, curled over Nyx's salvage stash behind the Moth
    id: 'rigged', art: 'crawler', name: 'RIGGED CRAWLER', x: 45.4, z: 19.8, facing: 'left', encounter: 'pro_elite_crawler',
    script: 'prologue.rigged', triggerRadius: 2.0, radius: 0.9,
  }],
  viewpoints: {
    cryo: { x: 6.6, z: 22.6, facing: 'down' },
    corridor: { x: 17.0, z: 14.6, facing: 'right' },
    engineering: { x: 22.6, z: 21.6, facing: 'down' },
    antechamber: { x: 41.0, z: 14.4, facing: 'up' },
    bridge: { x: 41.6, z: 8.9, facing: 'up' },
    medbay: { x: 7.0, z: 32.4, facing: 'down' },
    gallery: { x: 26.5, z: 35.0, facing: 'left' },
    control: { x: 20.9, z: 31.4, facing: 'down' },
    berth: { x: 40.1, z: 23.8, facing: 'up' },
  },
};
