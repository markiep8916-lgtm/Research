// heart (PURE MapDef, TECH_PLAN 3.1, 12.5): the Heart, WARDEN's domain at the centre of the Halcyon.
// A vast vertical reactor-cathedral: ring galleries round a falling shaft of gold light, thousands of
// Choir pods hanging below like stars, slowly turning rings, hard-light bridges and lifts that ride
// the cathedral wall. The floor plan lives in layout.js (shared with props.js, which draws the smooth
// platforms, rims, rails and bridges over the cells); 1 cell = 1 world unit, +Z = south.
//
//   The Dock (south-west)        the Moth's pier (Starchart, Med-Station), the causeway (Kade's dream),
//                                the first ring: two arcs; a pylon lights the chord bridge across the
//                                shaft; the Choir's Wardens hold the lift (the cradle-rings lesson)
//   Second Tier (south-east)     the lift arrives by the east arc (WARDEN, then Nyx's dream); the north
//                                chord; the pylon in the west arc lights the far bridge to the lift pad,
//                                where the first Choirlit Echoes wait
//   Third Tier (north-east)      the lift arrives north (WARDEN, then Orion's dream); two pylons on the
//                                south arc open the processional west, held by the second Echoes
//   The Crown Approach and the Sanctum   the processional (Sera's dream), the last Med-Station, the
//                                fabricator, Nyx's cache, the falling light back to the dock, the crown
//                                lift ("Beyond this point there is no way back.")
//   The Crown (north-west)       the oculus where the column ends; WARDEN gathers above it
//
// Binding (12.5): spawns `dock` (Moth berth, Starchart), `tier2`, `tier3`, `crown`; one dream trigger
// per tier in order (dream_kade, dream_nyx, dream_orion, dream_sera); the crown trigger runs
// `dreams.crown`. Anchors for the crown's staging: `warden` (over the oculus), `crown_party` (where
// the party stands before it), `crown_halcyon` (where HALCYON steps out). All dialogue lives in
// story.js; this file names script ids only.

import { W, H, RINGS, PADS, buildGrid, bridgeCells, ringPoint } from './layout.js';

const GRID = buildGrid();
const R = Object.fromEntries(RINGS.map((r) => [r.id, r]));
const P = Object.fromEntries(PADS.map((p) => [p.id, p]));
/** [x, z] on ring `id` at angle `a` (degrees), on the walkway's middle unless `r` is given. */
const at = (id, a, r) => ringPoint(R[id], a, r).map((v) => Math.round(v * 100) / 100);
const xz = ([x, z], extra = {}) => ({ x, z, ...extra });

// ---------------------------------------------------------------- moods (12.1: gold choir light over
// deep navy, receding pod lights below; vast, thin gold haze)

const mood = (extra = {}) => ({
  fog: '#161a3e', density: 0.016, sky: '#ffd99a', ground: '#1a2252', hemi: 0.78,
  key: 0.95, keyColor: '#ffe7bf', fill: 0.5, exposure: 1.0, bloom: 0.92, saturation: 1.06, ...extra,
});
const MOOD = {
  dock: mood({ fog: '#0e1434', sky: '#ffcf8a', keyColor: '#ffdcae' }),
  t1: mood(),
  t2: mood({ fog: '#101436', sky: '#ffe0a8', ground: '#1a1d4e' }),
  t3: mood({ fog: '#120f30', sky: '#ffe4b4', ground: '#1e1a48', hemi: 0.82, key: 1.0 }),
  sanctum: mood({ fog: '#18163a', sky: '#ffd49a', hemi: 0.86, keyColor: '#ffe2b8', exposure: 1.04 }),
  crown: mood({ fog: '#1c1838', density: 0.015, sky: '#fff0c8', ground: '#241c4a', hemi: 0.8, key: 1.0, keyColor: '#fff2d6', bloom: 0.9, exposure: 0.95 }),
};

// ---------------------------------------------------------------- key positions

const PYLON_T1 = at('t1', 240);
const PYLON_T2 = at('t2', 238);
const PYLON_T3A = at('t3', 62);
const PYLON_T3B = at('t3', 118);
const ELITE_T2 = at('t2', 150);
const ELITE_T3 = at('t3', 166);
const WARDENS_T1 = at('t1', 330, 9.6);
const BELL_T3 = at('t3', 234);
const OCULUS = [R.crown.cx, R.crown.cz];

// ---------------------------------------------------------------- props

// a WARDEN screen on its stand (rule 14: the sigil takes these over whenever WARDEN speaks)
const screen = (x, z, rot = 0, group = 'heart', s = 1) => [
  { t: 'heart.screenStand', x, z, rot, s },
  { t: 'screen', tex: 'hr_screen', x, y: 1.25 * s, z: z + 0.04, w: 1.3 * s, h: 0.8 * s, rot, group, intensity: 1.5 },
];
const pylonPost = (x, z) => ({ t: 'heart.organ', x, z });

const props = [
  // the cathedral itself: every platform's smooth deck, rims, rails and hanging undersides, the
  // permanent bridges, the shafts' columns of falling light, rings, pods and buttresses
  { t: 'heart.tiers' },
  ...RINGS.map((r) => ({ t: 'heart.column', x: r.cx, z: r.cz, ring: r.id, id: `column_${r.id}` })),
  ...PADS.map((p) => ({ t: 'heart.liftPad', x: p.cx, z: p.cz, r: p.r, pad: p.id })),
  { t: 'heart.abyss' },
  // ---- the Dock: the Moth on her pier, the Starchart, a Med-Station, sigil screens on the rail
  { t: 'pro.moth', x: 3.6, z: 47.6, rot: 0.1, pad: true },
  ...screen(2.2, 38.6, 0.3), ...screen(9.6, 39.4, -0.15),
  pylonPost(6.4, 37.9),
  // ---- T1: the Choir's Wardens hold the lift; screens where WARDEN will speak
  ...screen(12.6, 36.6, 0.5), ...screen(30.0, 44.0, -0.8), ...screen(27.2, 51.8, -0.3),
  // ---- T2
  ...screen(66.0, 44.6, -1.2), ...screen(60.6, 52.4, -0.5), ...screen(47.0, 36.0, 0.6), ...screen(43.4, 45.0, 1.1),
  // ---- T3
  ...screen(61.6, 4.0, -0.4), ...screen(67.0, 12.0, -1.3), ...screen(48.0, 9.6, 0.9), ...screen(56.5, 21.7, 0),
  // ---- the Sanctum and the crown approach
  ...screen(31.4, 8.6, 0.4), ...screen(36.6, 17.4, -0.4), pylonPost(30.8, 17.0),
  // ---- the Crown: the oculus and the cradle above it (focal)
  // (it pales from gold to dawn once WARDEN and HALCYON are one: world reacts, 12.3)
  { t: 'heart.crown', x: OCULUS[0], z: OCULUS[1], id: 'crown', status: 'story:warden_merged' },
  ...screen(6.0, 19.6, 0.7, 'crown', 1.2), ...screen(19.6, 16.0, -0.9, 'crown', 1.2),
];

// ---------------------------------------------------------------- lights (virtual; gold choir light,
// warm amber lamps, cool shaft light; at least three coloured pools in every viewpoint)

const GOLD = '#ffc85a', AMBER = '#ff9a3c', DAWN = '#9fc8ff', ROSE = '#ff8ab4', WHITE = '#fff2d8';
const lamp = (x, z, color, intensity = 12, extra = {}) => ({ x, y: extra.y ?? 1.8, z, color, intensity, distance: 7.5, ...extra });
const shaftLight = (id, color = GOLD) => ({ x: R[id].cx, y: 2.5, z: R[id].cz + 1.5, color, intensity: 20, distance: 11 });

const lights = [
  // the Dock
  lamp(4.6, 39.4, AMBER, 13), lamp(2.8, 46.6, GOLD, 11, { y: 1.2 }), lamp(6.6, 48.0, DAWN, 9), lamp(9.6, 42.6, GOLD, 10),
  // T1
  shaftLight('t1'), lamp(...at('t1', 180), AMBER, 10), lamp(...at('t1', 220), DAWN, 9), lamp(...PYLON_T1, GOLD, 12),
  lamp(...at('t1', 120), ROSE, 9), lamp(...at('t1', 60), AMBER, 11), lamp(...at('t1', 10), DAWN, 9),
  lamp(...at('t1', 320), GOLD, 12), lamp(P.lift_t1.cx, P.lift_t1.cz, WHITE, 13, { y: 2.4 }),
  // T2
  shaftLight('t2'), lamp(P.lift_t2_in.cx, P.lift_t2_in.cz, WHITE, 12, { y: 2.4 }), lamp(...at('t2', 30), AMBER, 10),
  lamp(...at('t2', 340), DAWN, 9), lamp(...at('t2', 300), ROSE, 9), lamp(...PYLON_T2, GOLD, 12), lamp(...at('t2', 200), AMBER, 10),
  lamp(...at('t2', 170), DAWN, 9), lamp(...ELITE_T2, ROSE, 10), lamp(P.lift_t2.cx, P.lift_t2.cz, WHITE, 12, { y: 2.4 }),
  // T3
  shaftLight('t3', '#ffd77a'), lamp(P.lift_t3_in.cx, P.lift_t3_in.cz, WHITE, 12, { y: 2.4 }), lamp(...at('t3', 330), AMBER, 10),
  lamp(...at('t3', 20), DAWN, 9), lamp(...PYLON_T3A, GOLD, 12), lamp(...at('t3', 90), ROSE, 10), lamp(...PYLON_T3B, GOLD, 12),
  lamp(...ELITE_T3, AMBER, 10), lamp(...at('t3', 200), DAWN, 9), lamp(...BELL_T3, ROSE, 10),
  // the processional and the Sanctum
  lamp(40.5, 13.5, GOLD, 12, { y: 1.2 }), lamp(33.6, 10.6, AMBER, 12), lamp(33.4, 16.0, DAWN, 10), lamp(36.4, 13.0, ROSE, 9),
  lamp(P.lift_crown.cx, P.lift_crown.cz, WHITE, 14, { y: 2.6 }),
  // the Crown
  { x: OCULUS[0], y: 3.0, z: OCULUS[1] + 1.0, color: '#ffe4a0', intensity: 11, distance: 12 },
  lamp(...at('crown', 30), AMBER, 11), lamp(...at('crown', 150), DAWN, 10), lamp(...at('crown', 90), ROSE, 9),
  lamp(...at('crown', 210), GOLD, 11), lamp(...at('crown', 330), GOLD, 11), lamp(P.lift_crown_in.cx, P.lift_crown_in.cz, WHITE, 10),
];

// ---------------------------------------------------------------- ambient

const motes = (x, z, w, d, rate = 3) => ({ preset: 'hr_motes', x, y: 1.6, z, area: [w, 2.6, d], rate });
const streams = (x, z, rate = 1.2) => ({ preset: 'hr_fall', x, y: 6, z, area: [2.4, 0.4, 2.4], rate });
const ambient = [
  motes(4.5, 43, 6, 11), motes(21.5, 42.5, 22, 22, 5), motes(54.5, 42.5, 22, 22, 5), motes(56.5, 13.5, 22, 22, 5),
  motes(34, 13, 8, 12, 3), motes(11.5, 11.5, 20, 20, 5),
  ...RINGS.map((r) => streams(r.cx, r.cz, 1.6)),
  ...PADS.map((p) => streams(p.cx, p.cz, 0.6)),
  { preset: 'mote', x: OCULUS[0], y: 0.5, z: OCULUS[1], area: [2.4, 0.5, 2.4], rate: 4 },
];

// ---------------------------------------------------------------- the gated bridges

/** A gate over bridge `bridge`'s cells (gate ids name the legend's gates; bridge ids name layout spans). */
const gateOf = (id, bridge, open) => ({ id, cells: bridgeCells(GRID, bridge), open, prop: 'heart.bridge', propFields: { bridge } });

export const VIEWPOINTS = {
  dock: { x: 5.8, z: 43.2, facing: 'right' },
  causeway: { x: 9.5, z: 42.5, facing: 'right' },
  t1_west: xz(at('t1', 200), { facing: 'up' }),
  t1_pylon: xz(at('t1', 232), { facing: 'up' }),
  t1_chord: { x: 21.5, z: 46.5, facing: 'right' },
  t1_lift: xz(at('t1', 298), { facing: 'right' }),
  t2_arrive: xz(at('t2', 40), { facing: 'up' }),
  t2_chord: { x: 54.5, z: 39.5, facing: 'left' },
  t2_west: xz(at('t2', 215), { facing: 'down' }),
  t2_lift: xz(at('t2', 160), { facing: 'down' }),
  t3_arrive: xz(at('t3', 320), { facing: 'down' }),
  t3_south: xz(at('t3', 90), { facing: 'left' }),
  t3_west: xz(at('t3', 185), { facing: 'left' }),
  approach: { x: 40.5, z: 13.5, facing: 'left' },
  sanctum: { x: 33.5, z: 13.0, facing: 'up' },
  crown_lift: { x: 34.0, z: 8.6, facing: 'up' },
  crown: { x: 13.5, z: 17.5, facing: 'up' },
};

export default {
  id: 'heart',
  name: 'The Heart',
  region: 'ISV Halcyon · Core',
  music: 'heart',
  grid: GRID,
  legend: {
    // ring galleries and pads are drawn smooth by heart.tiers over these cells (same textures)
    o: { t: 'floor', tex: 'hr_floor', mix: [['hr_floor_b', 0.3]], rot: 'random', roughness: 0.45, metalness: 0.4, emissive: 2.2 },
    c: { t: 'floor', tex: 'hr_crown', mix: [['hr_floor_b', 0.2]], rot: 'random', roughness: 0.4, metalness: 0.45, emissive: 2.4 },
    p: { t: 'floor', tex: 'hr_pad', rot: 'random', roughness: 0.4, metalness: 0.5, emissive: 2.4 },
    ',': { t: 'floor', tex: 'hr_slab', mix: [['hr_floor_b', 0.25]], rot: 'random', roughness: 0.5, metalness: 0.35, emissive: 2.2 },
    '.': { t: 'floor', tex: 'hr_slab', mix: [['hr_floor', 0.3]], rot: 'random', roughness: 0.5, metalness: 0.35, emissive: 2.2 },
    '=': { t: 'floor', tex: 'hr_bridge', roughness: 0.3, metalness: 0.2, emissive: 2.6 },
    a: { t: 'floor', tex: 'hr_bridge', gate: 'br_t1' },
    b: { t: 'floor', tex: 'hr_bridge', gate: 'br_t2' },
    f: { t: 'floor', tex: 'hr_bridge', gate: 'br_t3' },
  },
  wallTex: { side: 'hr_edge', cap: 'hr_edge', low: 'hr_edge' },
  mood: MOOD.t1,
  view: { pitch: 48, dist: 16 },
  underlay: { texture: 'bd_choir', y: -16, repeat: [3, 3], scroll: [0.0012, -0.0025], color: [1, 1, 1] },
  areas: [
    // the pylons first (first match wins): no encounters while a bridge is in play (11.8)
    { id: 'pylon_t1', name: 'The Dock', subtitle: 'The Heart · First Tier', rect: [PYLON_T1[0] - 2.4, PYLON_T1[1] - 2.4, PYLON_T1[0] + 2.4, PYLON_T1[1] + 2.4], zone: null, puzzle: true, mood: MOOD.t1, banner: false },
    { id: 'pylon_t2', name: 'Second Tier', subtitle: 'The Heart · Second Tier', rect: [PYLON_T2[0] - 2.4, PYLON_T2[1] - 2.4, PYLON_T2[0] + 2.4, PYLON_T2[1] + 2.4], zone: null, puzzle: true, mood: MOOD.t2, banner: false },
    { id: 'pylon_t3a', name: 'Third Tier', subtitle: 'The Heart · Third Tier', rect: [PYLON_T3A[0] - 2.2, PYLON_T3A[1] - 2.2, PYLON_T3A[0] + 2.2, PYLON_T3A[1] + 2.2], zone: null, puzzle: true, mood: MOOD.t3, banner: false },
    { id: 'pylon_t3b', name: 'Third Tier', subtitle: 'The Heart · Third Tier', rect: [PYLON_T3B[0] - 2.2, PYLON_T3B[1] - 2.2, PYLON_T3B[0] + 2.2, PYLON_T3B[1] + 2.2], zone: null, puzzle: true, mood: MOOD.t3, banner: false },
    { id: 'dock', name: 'The Dock', subtitle: 'The Heart · Moth Berth', rect: [0, 35, 11.2, 51], zone: null, mood: MOOD.dock },
    { id: 't1', name: 'The Dock', subtitle: 'The Heart · First Tier', rect: [8, 28, 36, 56], zone: 'heart_ascent', mood: MOOD.t1, banner: false },
    { id: 't2', name: 'Second Tier', subtitle: 'The Heart · Second Tier', rect: [38, 28, 72, 56], zone: 'heart_ascent', mood: MOOD.t2 },
    { id: 'approach', name: 'The Crown Approach', subtitle: 'The Heart · Third Tier', rect: [37.2, 10, 44.8, 17], zone: null, mood: MOOD.sanctum },
    { id: 't3', name: 'Third Tier', subtitle: 'The Heart · Third Tier', rect: [44, 0, 72, 27], zone: 'heart_crown', mood: MOOD.t3 },
    { id: 'sanctum', name: 'The Crown Approach', subtitle: 'The Heart · The Last Rest', rect: [28, 0, 37.2, 20], zone: null, mood: MOOD.sanctum, banner: false },
    { id: 'crown', name: 'The Crown', subtitle: 'The Heart · Where It Sings', rect: [0, 0, 26, 27], zone: null, mood: MOOD.crown, focus: { x: OCULUS[0], z: OCULUS[1] - 0.5 } },
  ],
  spawns: {
    dock: { x: 5.8, z: 43.2, facing: 'right' },
    tier2: { x: P.lift_t2_in.cx - 0.9, z: P.lift_t2_in.cz - 0.9, facing: 'up' },
    tier3: { x: P.lift_t3_in.cx - 0.9, z: P.lift_t3_in.cz + 0.9, facing: 'down' },
    crown: { x: P.lift_crown_in.cx, z: P.lift_crown_in.cz, facing: 'up' },
    // lift arrivals back down, and staging spots
    lift_t1: { x: P.lift_t1.cx - 0.9, z: P.lift_t1.cz + 0.9, facing: 'down' },
    lift_t2: { x: P.lift_t2.cx + 0.9, z: P.lift_t2.cz - 0.9, facing: 'up' },
    sanctum: { x: 33.5, z: 13.5, facing: 'up' },
    t1: { x: 9.5, z: 42.5, facing: 'right' },
    t2_west: xz(at('t2', 200), { facing: 'down' }),
    approach: { x: 45.5, z: 13.5, facing: 'left' },
    // before each scripted fight (the contact sheet stages them here)
    wardens: { x: 29.6, z: 41.2, facing: 'up' },
    choir: { x: 61.2, z: 39.0, facing: 'left' },
    echoes_t2: { x: 45.0, z: 43.6, facing: 'down' },
    echoes_t3: { x: 48.6, z: 19.4, facing: 'up' },
  },
  anchors: {
    warden: { x: OCULUS[0], z: OCULUS[1] - 0.6, facing: 'down' },
    crown_party: { x: OCULUS[0] + 0.5, z: OCULUS[1] + 5.4, facing: 'up' },
    crown_halcyon: { x: OCULUS[0] + 2.6, z: OCULUS[1] + 4.4, facing: 'up' },
  },
  viewpoints: VIEWPOINTS,
  chests: [
    // the critical path's gear, each signposted (G2 rule 8)
    { id: 'dawnspear', ...xz(at('t1', 62)), item: 'eq_w_sera_4', prop: 'heart.reliquary', talk: 'heart.chest_dawnspear' },
    { id: 'mantle', ...xz(at('t2', 206)), item: 'eq_a_5', prop: 'heart.reliquary', talk: 'heart.chest_mantle' },
    { id: 'pier', x: 1.8, z: 41.8, item: 'medigel_max', n: 2, prop: 'heart.reliquary' },
    { id: 't2_south', ...xz(at('t2', 66)), item: 'revive_plus', n: 1, credits: 600, prop: 'heart.reliquary' },
    { id: 't3_north', ...xz(at('t3', 300)), item: 'ether_plus', n: 2, prop: 'heart.reliquary' },
    // off the path: below the second lift, and past the Bellwarden
    { id: 'ward', ...xz(at('t2', 116)), item: 'eq_x_lullaby_ward', prop: 'heart.reliquary' },
    { id: 'bell', ...xz(at('t3', 246)), item: 'medigel_max', n: 2, credits: 900, prop: 'heart.reliquary' },
  ],
  interactables: [
    { id: 'starchart', kind: 'starchart', x: 3.2, z: 40.2 },
    // Med-Stations: the pier, the Second Tier's west arc, the Sanctum (the last before the crown lift)
    { id: 'med_dock', kind: 'med', x: 6.6, z: 39.2, r: 0.5, prop: 'heart.med' },
    { id: 'med_t2', kind: 'med', ...xz(at('t2', 182, 10.6)), r: 0.5, prop: 'heart.med' },
    { id: 'med_sanctum', kind: 'med', x: 31.2, z: 12.0, box: [30.6, 11.6, 31.8, 12.4], prop: 'heart.med' },
    // the pylons: each pans to the bridge it lights (11.8)
    { id: 'pylon_t1', kind: 'switch', ...xz(PYLON_T1), r: 0.45, flag: 'sw:heart:t1', mode: 'once', reveal: 'br_t1', script: 'heart.pylon', label: 'Touch', prop: 'heart.pylon' },
    { id: 'pylon_t2', kind: 'switch', ...xz(PYLON_T2), r: 0.45, flag: 'sw:heart:t2', mode: 'once', reveal: 'br_t2', script: 'heart.pylon', label: 'Touch', prop: 'heart.pylon' },
    { id: 'pylon_t3a', kind: 'switch', ...xz(PYLON_T3A), r: 0.45, flag: 'sw:heart:t3a', mode: 'once', reveal: 'br_t3', script: 'heart.pylon', label: 'Touch', prop: 'heart.pylon' },
    { id: 'pylon_t3b', kind: 'switch', ...xz(PYLON_T3B), r: 0.45, flag: 'sw:heart:t3b', mode: 'once', reveal: 'br_t3', script: 'heart.pylon', label: 'Touch', prop: 'heart.pylon' },
    // the lifts ride the cathedral wall; each upper tier's arrival pad also rides back down
    { id: 'lift_t1', kind: 'lift', x: P.lift_t1.cx + 0.7, z: P.lift_t1.cz - 0.7, r: 0.5, reach: 1.1, to: 'tier2', label: 'Ride up' },
    { id: 'lift_t2_down', kind: 'lift', x: P.lift_t2_in.cx + 0.7, z: P.lift_t2_in.cz + 0.7, r: 0.5, reach: 1.1, to: 'lift_t1', label: 'Ride down' },
    { id: 'lift_t2', kind: 'lift', x: P.lift_t2.cx - 0.7, z: P.lift_t2.cz + 0.7, r: 0.5, reach: 1.1, to: 'tier3', label: 'Ride up' },
    { id: 'lift_t3_down', kind: 'lift', x: P.lift_t3_in.cx + 0.7, z: P.lift_t3_in.cz - 0.7, r: 0.5, reach: 1.1, to: 'lift_t2', label: 'Ride down' },
    // the crown lift: a confirmation, then the last ride (no way back)
    { id: 'crown_lift', kind: 'inspect', x: P.lift_crown.cx, z: P.lift_crown.cz - 0.6, r: 0.6, reach: 1.2, label: 'Ride to the crown', icon: 'travel',
      talk: [{ when: 'story:dream_sera & !story:finale_done', script: 'heart.crown_lift' }, { script: 'heart.crown_wait' }] },
    // the last restock: the Halcyon's fabricator, which answers HALCYON again
    { id: 'fabricator', kind: 'shop', shop: 'fabricator', x: 36.0, z: 15.6, box: [35.5, 15.2, 36.6, 16.0], label: 'Fabricator', prop: 'heart.fabricator' },
    // leader-gated (Nyx): a Choir maintenance cache (WRITING 9.5)
    { id: 'nyx_cache', kind: 'inspect', x: 30.9, z: 15.2, r: 0.5, leader: 'nyx', label: 'Crack', talk: 'heart.nyx_cache', prop: 'heart.cache',
      leaderHint: 'A Choir maintenance cache, sealed ship-tight. *Nyx* could crack it.' },
    // the falling light: one way back to the Dock from the Sanctum (12.4)
    { id: 'fall', kind: 'exit', x: 36.2, z: 9.4, r: 0.6, to: { map: 'heart', spawn: 'dock' }, label: 'Fall with the light', icon: 'travel',
      transition: 'fade', when: 'sw:heart:t3a & sw:heart:t3b', prop: 'heart.fall' },
    // the column itself, from the pier (lore)
    { id: 'column_t1', kind: 'inspect', ...xz(at('t1', 180, 8.2)), r: 0.5, reach: 1.0, label: 'Look', talk: 'heart.column' },
  ],
  triggers: [
    { id: 'arrival', on: 'load', when: 'chapter>=finale & !story:dream_kade', once: true, script: 'heart.arrival' },
    // the dreams, one per tier, in order (12.5)
    { id: 'dream_kade', on: 'enter', rect: [8.2, 39.6, 11.2, 46.4], when: 'chapter>=finale & !story:dream_kade', once: true, script: 'dreams.kade' },
    { id: 'dream_nyx', on: 'enter', rect: [61.4, 39.6, 68.0, 45.4], when: 'story:dream_kade & !story:dream_nyx', once: true, script: 'dreams.nyx' },
    { id: 'dream_orion', on: 'enter', rect: [63.4, 11.6, 69.4, 18.6], when: 'story:dream_nyx & !story:dream_orion', once: true, script: 'dreams.orion' },
    { id: 'dream_sera', on: 'enter', rect: [37.2, 11.4, 41.2, 15.6], when: 'story:dream_orion & !story:dream_sera', once: true, script: 'dreams.sera' },
    // WARDEN at each lift arrival (once per tier)
    { id: 'warden_t2', on: 'enter', rect: [58.6, 46.4, 63.2, 50.4], when: 'chapter>=finale & story:dream_kade', once: true, script: 'heart.warden_tier' },
    { id: 'warden_t3', on: 'enter', rect: [60.4, 4.6, 64.8, 9.0], when: 'chapter>=finale & story:dream_nyx', once: true, script: 'heart.warden_tier' },
    // the crown: the approach, WARDEN, the battle and the resolution (C8)
    { id: 'crown', on: 'enter', rect: [4.0, 12.6, 19.4, 19.6], when: 'story:dream_sera & !story:finale_done', once: true, script: 'dreams.crown' },
  ],
  gates: [
    gateOf('br_t1', 'br_t1', 'sw:heart:t1'),
    gateOf('br_t2', 'br_lift_t2', 'sw:heart:t2'),
    gateOf('br_t3', 'br_t3', 'sw:heart:t3a & sw:heart:t3b'),
  ],
  bosses: [
    // the Choir's Wardens hold the first lift (the cradle-rings lesson)
    { id: 'wardens', art: 'choir_guardian', name: 'CHOIR GUARDIAN', ...xz(WARDENS_T1), facing: 'left', encounter: 'heart_wardens',
      script: 'heart.wardens', triggerRadius: 3.0, radius: 1.0, when: '!heart:wardens_down' },
    // the Second Tier's north chord: the Choir's singers and a Dream Eater (the cleanse lesson)
    { id: 'choir', art: 'warden_seraph', name: 'WARDEN SERAPH', x: 56.6, z: 39.0, facing: 'left', encounter: 'heart_choir',
      script: 'heart.choir', triggerRadius: 3.0, radius: 0.9, when: '!heart:choir_down' },
    // the Choirlit Echoes: what WARDEN remembers of the Rings and the Garden, of the Spire and the Vault
    { id: 'echoes_t2', art: 'rime_golem', name: 'CHOIRLIT ECHOES', ...xz(ELITE_T2), facing: 'right', encounter: 'heart_elite_rings',
      script: 'heart.echoes_t2', triggerRadius: 3.0, radius: 1.1, when: '!heart:echoes_t2_down' },
    { id: 'echoes_t3', art: 'firewall_golem', name: 'CHOIRLIT ECHOES', ...xz(ELITE_T3), facing: 'right', encounter: 'heart_elite_spire',
      script: 'heart.echoes_t3', triggerRadius: 3.0, radius: 1.1, when: '!heart:echoes_t3_down' },
    // M3: the Bellwarden at the Third Tier's dead end (optional; guards eq_x_choir_bell)
    { id: 'bellwarden', art: 'choir_guardian', name: 'BELLWARDEN', ...xz(BELL_T3), facing: 'down', encounter: 'heart_elite_bell',
      script: 'heart.bellwarden', triggerRadius: 2.8, radius: 1.1 },
  ],
  exits: [],
  props,
  lights,
  ambient,
};

export const KEY = { PYLON_T1, PYLON_T2, PYLON_T3A, PYLON_T3B, ELITE_T2, ELITE_T3, WARDENS_T1, BELL_T3, OCULUS, W, H };
