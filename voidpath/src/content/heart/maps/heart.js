// heart (PURE MapDef, TECH_PLAN 3.1, 12.5): the Heart, WARDEN's domain at the centre of the Halcyon.
// A vast vertical reactor-cathedral: ring galleries round a falling shaft of gold light, thousands of
// Choir pods hanging below like stars, slowly turning rings, hard-light bridges and lifts that ride
// the cathedral wall. The floor plan lives in layout.js (shared with props.js, which draws the smooth
// platforms, rims, rails and bridges over the cells); 1 cell = 1 world unit, +Z = south.
//
//   The Dock (south-west)        the Moth's pier (Starchart, Med-Station), the causeway (Kade's dream),
//                                the first ring: the pylon at the west arc's south end lights the chord
//                                across the shaft; the east arc south, past the Dawnspear, to the
//                                Choir's Wardens at the lift's span (the cradle-rings lesson)
//   Second Tier (south-east)     the lift arrives by the east arc (WARDEN, then Nyx's dream); north to
//                                the north chord and the Choir; the west arc south to the pylon, whose
//                                bridge lights back north, the long span to the lift pad, where the first
//                                Choirlit Echoes wait
//   Third Tier (north-east)      the lift arrives by the north-east (WARDEN, then Orion's dream; the
//                                Bellwarden's alcove behind); one long arc: the south pylon, the second
//                                Echoes at the processional, the far pylon at the arc's west end; both
//                                lit, the processional west
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
/** A square rect of half-size `h` round [x, z]. */
const box = ([x, z], h) => [x - h, z - h, x + h, z + h];

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

const PYLON_T1 = at('t1', 117);
const PYLON_T2 = at('t2', 118);
const PYLON_T3A = at('t3', 75);
const PYLON_T3B = at('t3', 240);
const ELITE_T2 = [45.7, 28.6];          // on the lift pad's rim, at the end of the gated span
const ELITE_T3 = at('t3', 166);
const WARDENS_T1 = at('t1', 44, 10.4);
const BELL_T3 = at('t3', 303);
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
  ...screen(2.2, 38.6, 0.3), ...screen(10.6, 39.0, -0.15),
  pylonPost(6.4, 37.9),
  // ---- T1: screens round the gallery (the sigil wakes on them whenever WARDEN speaks)
  ...screen(...at('t1', 216, 12.2), 0.5), ...screen(...at('t1', 14, 12.2), -1.2), ...screen(...at('t1', 76, 11.8), -0.2),
  pylonPost(...at('t1', 250, 11.4)),
  // ---- T2: two screens framing the lift's arrival, where WARDEN speaks; more round the gallery
  ...screen(...at('t2', 27, 11.8), -0.9), ...screen(...at('t2', 63, 11.8), -0.3),
  ...screen(...at('t2', 200, 12.2), 1.1), ...screen(...at('t2', 150, 11.8), 0.8), ...screen(...at('t2', 300, 11.8), -0.5),
  // ---- T3: two screens framing the lift's arrival; more round the gallery
  ...screen(...at('t3', 313, 11.7), 0.3), ...screen(...at('t3', 346, 11.7), -1.2),
  ...screen(...at('t3', 200, 11.7), 0.9), ...screen(...at('t3', 92, 11.7), 0), ...screen(...at('t3', 30, 11.7), -1.0),
  // ---- the Sanctum and the crown approach
  ...screen(31.4, 8.6, 0.4), ...screen(36.6, 17.4, -0.4), pylonPost(30.8, 17.0), pylonPost(31.2, 9.8),
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

/** A lantern on a gallery's outer rail (`out`) or over its inner lip, never mid-walkway, where it
 * would burn on a traveler's head. */
const rim = (id, a, color, intensity = 10, out = true) =>
  lamp(...at(id, a, out ? R[id].rOut - 0.45 : R[id].rIn + 0.35), color, intensity, { y: out ? 1.5 : 1.1 });

/** True when angle `a` lies on one of the ring's arcs. */
const onRing = (ring, a) => ring.arcs.some(([a0, a1]) => (((a - a0) % 360) + 360) % 360 <= a1 - a0);
/**
 * The galleries' lanterns: every 24 degrees along each arc, on the outer rail and over the inner lip
 * in turn, in a cycle of warm and cool colours, so every frame holds several pools of both.
 */
const lanterns = (id, start = 0) => {
  const ring = R[id], out = [], hues = [AMBER, DAWN, GOLD, ROSE];
  for (let k = 0, a = start; a < start + 360; a += 24, k++) {
    if (onRing(ring, a)) out.push(rim(id, a, hues[k % 4], k % 2 ? 9 : 10, k % 2 === 0));
  }
  return out;
};

const lights = [
  // the Dock
  lamp(4.6, 39.4, AMBER, 13), lamp(2.8, 46.6, GOLD, 11, { y: 1.2 }), lamp(6.6, 48.0, DAWN, 9), lamp(9.6, 44.2, GOLD, 10, { y: 1.2 }),
  lamp(2.4, 38.2, ROSE, 9, { y: 1.4 }),
  // the galleries: the column's light up the shaft, lanterns round every arc
  shaftLight('t1'), shaftLight('t2'), shaftLight('t3', '#ffd77a'), ...lanterns('t1'), ...lanterns('t2', 12), ...lanterns('t3', 6),
  // the pylons, the chords' feet, the lifts, the Echoes on the second lift's pad
  ...[PYLON_T1, PYLON_T2, PYLON_T3A, PYLON_T3B].map(([x, z]) => lamp(x, z, GOLD, 12, { y: 2.6 })),
  lamp(14.6, 39.7, AMBER, 10, { y: 1.0 }), lamp(29.4, 39.7, DAWN, 10, { y: 1.0 }),
  lamp(48.4, 39.7, ROSE, 10, { y: 1.0 }), lamp(62.6, 39.7, AMBER, 10, { y: 1.0 }),
  ...PADS.map((p) => lamp(p.cx, p.cz, WHITE, p.id === 'lift_crown' ? 14 : 12, { y: 2.5 })),
  lamp(ELITE_T2[0] + 1.2, ELITE_T2[1] + 1.4, ROSE, 9, { y: 1.4 }),
  // the processional and the Sanctum
  lamp(40.5, 14.4, GOLD, 12, { y: 1.2 }), lamp(42.6, 11.6, DAWN, 9, { y: 1.0 }), lamp(33.6, 10.6, AMBER, 13), lamp(33.4, 16.0, DAWN, 11),
  lamp(36.4, 13.0, ROSE, 10), lamp(31.2, 14.2, GOLD, 11), lamp(34.0, 7.8, GOLD, 12, { y: 1.0 }),
  // the Crown
  { x: OCULUS[0], y: 3.0, z: OCULUS[1] + 1.0, color: '#ffe4a0', intensity: 11, distance: 12 },
  ...lanterns('crown'),
];

// ---------------------------------------------------------------- ambient

const motes = (x, z, w, d, rate = 3) => ({ preset: 'hr_motes', x, y: 1.6, z, area: [w, 2.6, d], rate });
const streams = (x, z, rate = 1.2) => ({ preset: 'hr_fall', x, y: 6, z, area: [2.4, 0.4, 2.4], rate });
const ambient = [
  motes(4.5, 43, 6, 11), motes(R.t1.cx, R.t1.cz, 24, 24, 5), motes(R.t2.cx, R.t2.cz, 24, 24, 5), motes(R.t3.cx, R.t3.cz, 23, 23, 5),
  motes(34, 13, 8, 12, 3), motes(40.6, 13, 6, 5, 3), motes(11.5, 11.5, 20, 20, 5),
  ...RINGS.map((r) => streams(r.cx, r.cz, 1.6)),
  ...PADS.map((p) => streams(p.cx, p.cz, 0.6)),
  { preset: 'mote', x: OCULUS[0], y: 0.5, z: OCULUS[1], area: [2.4, 0.5, 2.4], rate: 4 },
  // the hymn rising off each pylon (their puzzle areas carry their own emitter)
  ...[PYLON_T1, PYLON_T2, PYLON_T3A, PYLON_T3B].map(([x, z]) => ({ preset: 'hr_motes', x, y: 1.4, z, area: [2.4, 1.6, 2.4], rate: 2 })),
];

// ---------------------------------------------------------------- the gated bridges

/** A gate over bridge `bridge`'s cells (gate ids name the legend's gates; bridge ids name layout spans). */
const gateOf = (id, bridge, open) => ({ id, cells: bridgeCells(GRID, bridge), open, prop: 'heart.bridge', propFields: { bridge } });

export const VIEWPOINTS = {
  dock: { x: 5.8, z: 43.2, facing: 'right' },
  causeway: { x: 9.5, z: 42.5, facing: 'right' },
  t1_west: xz(at('t1', 160), { facing: 'down' }),
  t1_pylon: xz(at('t1', 135), { facing: 'down' }),
  t1_chord: { x: 22.0, z: 38.5, facing: 'right' },
  t1_east: xz(at('t1', 0), { facing: 'down' }),
  t1_lift: xz(at('t1', 52, 12.2), { facing: 'right' }),
  t2_arrive: xz(at('t2', 38), { facing: 'up' }),
  t2_chord: { x: 55.5, z: 38.5, facing: 'left' },
  t2_west: xz(at('t2', 175), { facing: 'down' }),
  t2_pylon: xz(at('t2', 135), { facing: 'down' }),
  t2_lift: xz(at('t2', 232, 12.6), { facing: 'up' }),
  t3_arrive: xz(at('t3', 335), { facing: 'down' }),
  t3_alcove: xz(at('t3', 323), { facing: 'left' }),
  t3_south: xz(at('t3', 80), { facing: 'left' }),
  t3_west: xz(at('t3', 190), { facing: 'up' }),
  t3_far: xz(at('t3', 228), { facing: 'up' }),
  approach: { x: 40.5, z: 13.0, facing: 'left' },
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
    { id: 'pylon_t1', name: 'The Dock', subtitle: 'The Heart · First Tier', rect: box(PYLON_T1, 2.4), zone: null, puzzle: true, mood: MOOD.t1, banner: false },
    { id: 'pylon_t2', name: 'Second Tier', subtitle: 'The Heart · Second Tier', rect: box(PYLON_T2, 2.4), zone: null, puzzle: true, mood: MOOD.t2, banner: false },
    { id: 'pylon_t3a', name: 'Third Tier', subtitle: 'The Heart · Third Tier', rect: box(PYLON_T3A, 2.2), zone: null, puzzle: true, mood: MOOD.t3, banner: false },
    { id: 'pylon_t3b', name: 'Third Tier', subtitle: 'The Heart · Third Tier', rect: box(PYLON_T3B, 2.2), zone: null, puzzle: true, mood: MOOD.t3, banner: false },
    { id: 'dock', name: 'The Dock', subtitle: 'The Heart · Moth Berth', rect: [0, 35, 10.2, 51], zone: null, mood: MOOD.dock },
    // the Second Tier's lift pad hangs out between the tiers (before the Third Tier's rect)
    { id: 't2_pad', name: 'Second Tier', subtitle: 'The Heart · Second Tier', rect: [40.5, 23.6, 48.5, 30], zone: 'heart_ascent', mood: MOOD.t2, banner: false },
    { id: 'approach', name: 'The Crown Approach', subtitle: 'The Heart · Third Tier', rect: [37.2, 9, 44, 17], zone: 'heart_crown', mood: MOOD.sanctum },
    { id: 't3', name: 'Third Tier', subtitle: 'The Heart · Third Tier', rect: [44, 0, 72, 27], zone: 'heart_crown', mood: MOOD.t3 },
    { id: 't1', name: 'The Dock', subtitle: 'The Heart · First Tier', rect: [8, 27, 41.4, 56], zone: 'heart_ascent', mood: MOOD.t1, banner: false },
    { id: 't2', name: 'Second Tier', subtitle: 'The Heart · Second Tier', rect: [41.4, 27, 72, 56], zone: 'heart_ascent', mood: MOOD.t2 },
    { id: 'sanctum', name: 'The Crown Approach', subtitle: 'The Heart · The Last Rest', rect: [28, 0, 37.2, 20], zone: null, mood: MOOD.sanctum, banner: false },
    { id: 'crown', name: 'The Crown', subtitle: 'The Heart · Where It Sings', rect: [0, 0, 27, 27], zone: null, mood: MOOD.crown, focus: { x: OCULUS[0], z: OCULUS[1] - 0.5 } },
  ],
  spawns: {
    dock: { x: 5.8, z: 43.2, facing: 'right' },
    tier2: { x: P.lift_t2_in.cx - 1.0, z: P.lift_t2_in.cz - 0.8, facing: 'up' },
    tier3: { x: P.lift_t3_in.cx - 1.0, z: P.lift_t3_in.cz + 0.8, facing: 'down' },
    crown: { x: P.lift_crown_in.cx, z: P.lift_crown_in.cz, facing: 'up' },
    // lift arrivals back down, and staging spots
    lift_t1: { x: P.lift_t1.cx - 1.0, z: P.lift_t1.cz - 0.5, facing: 'left' },
    lift_t2: { x: P.lift_t2.cx + 0.8, z: P.lift_t2.cz + 0.8, facing: 'down' },
    sanctum: { x: 33.5, z: 13.5, facing: 'up' },
    t1: { x: 9.5, z: 42.5, facing: 'right' },
    t2_west: xz(at('t2', 185), { facing: 'down' }),
    approach: xz(at('t3', 182), { facing: 'left' }),
    // before each scripted fight (the contact sheet stages them here)
    wardens: xz(at('t1', 28), { facing: 'down' }),
    choir: { x: 61.6, z: 38.5, facing: 'left' },
    echoes_t2: { x: 47.4, z: 31.0, facing: 'up' },
    echoes_t3: xz(at('t3', 145), { facing: 'left' }),
  },
  anchors: {
    warden: { x: OCULUS[0], z: OCULUS[1] - 0.6, facing: 'down' },
    crown_party: { x: OCULUS[0] + 0.5, z: OCULUS[1] + 5.4, facing: 'up' },
    crown_halcyon: { x: OCULUS[0] + 2.6, z: OCULUS[1] + 4.4, facing: 'up' },
  },
  viewpoints: VIEWPOINTS,
  chests: [
    // the critical path's gear, each signposted (G2 rule 8)
    { id: 'dawnspear', ...xz(at('t1', 8)), item: 'eq_w_sera_4', prop: 'heart.reliquary', talk: 'heart.chest_dawnspear' },
    { id: 'mantle', ...xz(at('t2', 158)), item: 'eq_a_5', prop: 'heart.reliquary', talk: 'heart.chest_mantle' },
    { id: 'pier', x: 1.8, z: 41.8, item: 'medigel_max', n: 2, prop: 'heart.reliquary' },
    { id: 't2_south', ...xz(at('t2', 64)), item: 'revive_plus', n: 1, credits: 600, prop: 'heart.reliquary' },
    { id: 't3_north', ...xz(at('t3', 352)), item: 'ether_plus', n: 2, prop: 'heart.reliquary' },
    // off the path: the First Tier's north dead end, and behind the Bellwarden
    { id: 'ward', ...xz(at('t1', 244)), item: 'eq_x_lullaby_ward', prop: 'heart.reliquary' },
    { id: 'bell', ...xz(at('t3', 294)), item: 'medigel_max', n: 2, credits: 900, prop: 'heart.reliquary' },
  ],
  interactables: [
    { id: 'starchart', kind: 'starchart', x: 3.2, z: 40.2 },
    // Med-Stations: the pier, the Second Tier's west arc, the Sanctum (the last before the crown lift)
    { id: 'med_dock', kind: 'med', x: 6.6, z: 39.2, r: 0.5, prop: 'heart.med' },
    { id: 'med_t2', kind: 'med', ...xz(at('t2', 188, 11.9)), r: 0.5, prop: 'heart.med' },
    { id: 'med_sanctum', kind: 'med', x: 31.2, z: 12.0, box: [30.6, 11.6, 31.8, 12.4], prop: 'heart.med' },
    // the pylons: each pans to the bridge it lights (11.8)
    { id: 'pylon_t1', kind: 'switch', ...xz(PYLON_T1), r: 0.45, flag: 'sw:heart:t1', mode: 'once', reveal: 'br_t1', script: 'heart.pylon', label: 'Touch', prop: 'heart.pylon' },
    { id: 'pylon_t2', kind: 'switch', ...xz(PYLON_T2), r: 0.45, flag: 'sw:heart:t2', mode: 'once', reveal: 'br_t2', script: 'heart.pylon', label: 'Touch', prop: 'heart.pylon' },
    { id: 'pylon_t3a', kind: 'switch', ...xz(PYLON_T3A), r: 0.45, flag: 'sw:heart:t3a', mode: 'once', reveal: 'br_t3', script: 'heart.pylon', label: 'Touch', prop: 'heart.pylon' },
    { id: 'pylon_t3b', kind: 'switch', ...xz(PYLON_T3B), r: 0.45, flag: 'sw:heart:t3b', mode: 'once', reveal: 'br_t3', script: 'heart.pylon', label: 'Touch', prop: 'heart.pylon' },
    // the lifts ride the cathedral wall; each upper tier's arrival pad also rides back down
    { id: 'lift_t1', kind: 'lift', x: P.lift_t1.cx + 0.6, z: P.lift_t1.cz + 0.2, r: 0.5, reach: 1.1, to: 'tier2', label: 'Ride up' },
    { id: 'lift_t2_down', kind: 'lift', x: P.lift_t2_in.cx + 0.6, z: P.lift_t2_in.cz + 0.6, r: 0.5, reach: 1.1, to: 'lift_t1', label: 'Ride down' },
    { id: 'lift_t2', kind: 'lift', x: P.lift_t2.cx - 0.5, z: P.lift_t2.cz - 0.5, r: 0.5, reach: 1.1, to: 'tier3', label: 'Ride up' },
    { id: 'lift_t3_down', kind: 'lift', x: P.lift_t3_in.cx + 0.6, z: P.lift_t3_in.cz - 0.6, r: 0.5, reach: 1.1, to: 'lift_t2', label: 'Ride down' },
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
    // the column itself, from the west arc (lore)
    { id: 'column_t1', kind: 'inspect', ...xz(at('t1', 172, 8.7)), r: 0.5, reach: 1.0, label: 'Look', talk: 'heart.column' },
  ],
  triggers: [
    { id: 'arrival', on: 'load', when: 'chapter>=finale & !story:dream_kade', once: true, script: 'heart.arrival' },
    // the dreams, one per tier, in order (12.5)
    { id: 'dream_kade', on: 'enter', rect: [8.2, 39.6, 11.2, 46.4], when: 'chapter>=finale & !story:dream_kade', once: true, script: 'dreams.kade' },
    { id: 'dream_nyx', on: 'enter', rect: [63.0, 38.6, 69.0, 45.4], when: 'story:dream_kade & !story:dream_nyx', once: true, script: 'dreams.nyx' },
    { id: 'dream_orion', on: 'enter', rect: [63.2, 10.6, 69.4, 18.0], when: 'story:dream_nyx & !story:dream_orion', once: true, script: 'dreams.orion' },
    { id: 'dream_sera', on: 'enter', rect: [37.2, 10.8, 41.2, 15.2], when: 'story:dream_orion & !story:dream_sera', once: true, script: 'dreams.sera' },
    // WARDEN at each lift arrival (once per tier)
    { id: 'warden_t2', on: 'enter', rect: [60.4, 46.2, 65.8, 50.8], when: 'chapter>=finale & story:dream_kade', once: true, script: 'heart.warden_tier' },
    { id: 'warden_t3', on: 'enter', rect: [62.2, 5.4, 66.8, 9.6], when: 'chapter>=finale & story:dream_nyx', once: true, script: 'heart.warden_tier' },
    // the crown: the approach, WARDEN, the battle and the resolution (C8)
    { id: 'crown', on: 'enter', rect: [4.0, 12.6, 19.4, 19.6], when: 'story:dream_sera & !story:finale_done', once: true, script: 'dreams.crown' },
  ],
  gates: [
    gateOf('br_t1', 'br_t1', 'sw:heart:t1'),
    gateOf('br_t2', 'br_lift_t2', 'sw:heart:t2'),
    gateOf('br_t3', 'br_t3', 'sw:heart:t3a & sw:heart:t3b'),
  ],
  bosses: [
    // the Choir's Wardens hold the first lift's span (the cradle-rings lesson)
    { id: 'wardens', art: 'choir_guardian', name: 'CHOIR GUARDIAN', ...xz(WARDENS_T1), facing: 'up', encounter: 'heart_wardens',
      script: 'heart.wardens', triggerRadius: 3.0, radius: 1.0, when: '!heart:wardens_down' },
    // the Second Tier's north chord: the Choir's singers and a Dream Eater (the cleanse lesson)
    { id: 'choir', art: 'warden_seraph', name: 'WARDEN SERAPH', x: 57.2, z: 38.5, facing: 'right', encounter: 'heart_choir',
      script: 'heart.choir', triggerRadius: 3.0, radius: 0.9, when: '!heart:choir_down' },
    // the Choirlit Echoes: what WARDEN remembers of the Rings and the Garden, of the Spire and the Vault
    { id: 'echoes_t2', art: 'rime_golem', name: 'CHOIRLIT ECHOES', x: ELITE_T2[0], z: ELITE_T2[1], facing: 'right', encounter: 'heart_elite_rings',
      script: 'heart.echoes_t2', triggerRadius: 3.0, radius: 1.1, when: '!heart:echoes_t2_down' },
    { id: 'echoes_t3', art: 'firewall_golem', name: 'CHOIRLIT ECHOES', ...xz(ELITE_T3), facing: 'right', encounter: 'heart_elite_spire',
      script: 'heart.echoes_t3', triggerRadius: 3.0, radius: 1.1, when: '!heart:echoes_t3_down' },
    // M3: the Bellwarden in the Third Tier's alcove (optional; guards eq_x_choir_bell)
    { id: 'bellwarden', art: 'choir_guardian', name: 'BELLWARDEN', ...xz(BELL_T3), facing: 'down', encounter: 'heart_elite_bell',
      script: 'heart.bellwarden', triggerRadius: 2.6, radius: 1.1 },
  ],
  // M3: sleepers dreaming in the Choir, their dream-bodies standing in the Heart's light (holograms)
  npcs: [
    { id: 'dreamer_jun', sprite: 'crew_jun', name: 'JUN HALE', ...xz(at('t1', 349, 11.7)), facing: 'right', hologram: true,
      talk: 'heart.dreamers_hale', idle: { path: [at('t1', 349, 11.7), at('t1', 343, 11.9), at('t1', 349, 11.7)], speed: 0.6, pause: [2, 4] } },
    { id: 'dreamer_ilka', sprite: 'crew_ilka', name: 'ILKA HALE', ...xz(at('t1', 353, 11.7)), facing: 'left', hologram: true,
      talk: 'heart.dreamers_hale', idle: { path: [at('t1', 353, 11.7), at('t1', 358, 11.9), at('t1', 353, 11.7)], speed: 0.6, pause: [2, 4] } },
    { id: 'dreamer_ferro', sprite: 'crew_ferro', name: 'LUCIA FERRO', ...xz(at('t2', 171, 11.7)), facing: 'down', hologram: true,
      talk: 'heart.dreamer_ferro' },
  ],
  exits: [],
  props,
  lights,
  ambient,
};

export const KEY = { PYLON_T1, PYLON_T2, PYLON_T3A, PYLON_T3B, ELITE_T2, ELITE_T3, WARDENS_T1, BELL_T3, OCULUS, W, H };
