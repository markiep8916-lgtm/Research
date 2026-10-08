// moth (PURE MapDef, TECH_PLAN 4.7, 12.5): the cockpit of Nyx's salvaged skiff, the Moth. A
// transit map: travel arrives at `cockpit` for the flight script (travel.flight) and never saves
// or sets a checkpoint here. Ringborn patchwork: a wide canopy of window panes onto space, the
// pilot's seat at the helm, jump seats, prayer ribbons and a taped-up console.

const COCKPIT_MOOD = {
  fog: '#05060c', density: 0.03, sky: '#3a4f80', ground: '#0b0b12', hemi: 0.58,
  key: 1.8, keyColor: '#ffd2a0', fill: 0.4, exposure: 1.06, bloom: 1.0, saturation: 1.1,
};

export default {
  id: 'moth',
  name: 'The Moth',
  region: 'Ringborn Skiff',
  music: null,
  transit: true,
  grid: [
    '            ', // 0
    '  #sWWWWs#  ', // 1
    ' #,......,# ', // 2
    '#,........,#', // 3
    '#..........#', // 4
    '#....hh....#', // 5
    '############', // 6
  ],
  legend: {
    ',': { t: 'floor', tex: 'floor_plate_worn', roughness: 0.6, metalness: 0.3, emissive: 1.8 },
  },
  mood: COCKPIT_MOOD,
  areas: [{ id: 'cockpit', name: 'The Moth', subtitle: 'Ringborn Skiff', rect: [0, 1, 12, 7], cam: [3.8, 4.2], zone: null, banner: false, mood: COCKPIT_MOOD }],
  spawns: {
    cockpit: { x: 6.0, z: 4.4, facing: 'up' },
  },
  // seats for the flight gathering (party member -> spot)
  anchors: {
    helm: { x: 6.0, z: 3.0, facing: 'up' },
    seat_l: { x: 3.6, z: 3.9, facing: 'up' },
    seat_r: { x: 8.4, z: 3.9, facing: 'up' },
    seat_b: { x: 6.0, z: 5.0, facing: 'up' },
  },
  props: [
    { t: 'console', x: 6.0, z: 2.38 },
    { t: 'chair', x: 6.0, z: 3.3 },
    { t: 'bench', x: 2.6, z: 5.6, w: 1.4 },
    { t: 'bench', x: 9.4, z: 5.6, w: 1.4 },
    { t: 'decal', name: 'decal_grime', x: 4.2, z: 4.6, rot: 1 },
    { t: 'decal', name: 'decal_oil', x: 8.1, z: 3.4, rot: 2 },
  ],
  lights: [
    { x: 6.0, y: 1.6, z: 2.8, color: '#45d4ff', intensity: 9, distance: 5 },
    { x: 2.6, y: 2.2, z: 4.4, color: '#ffa64a', intensity: 11, distance: 5.5 },
    { x: 9.4, y: 2.2, z: 4.4, color: '#ffa64a', intensity: 11, distance: 5.5, mode: 'flicker', amount: 0.4, speed: 6 },
    { x: 6.0, y: 1.0, z: 5.6, color: '#ff5a5a', intensity: 4, distance: 3, mode: 'pulse', amount: 0.4, speed: 1.4 },
  ],
  ambient: [
    { preset: 'dust', x: 6, y: 1.4, z: 4, area: [9, 2, 3.5], rate: 2, color: '#ffd9a8' },
  ],
  view: { pitch: 34, dist: 11 },
  viewpoints: {
    cockpit: { x: 6.0, z: 4.4, facing: 'up' },
  },
};
