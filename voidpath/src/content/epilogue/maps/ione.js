// ione (PURE MapDef, TECH_PLAN 12.5): Ione's first shore at dawn. Early stub: the binding spawn
// `shore` and the dawn sky; the shore itself is built in M1/M2.

const row = (s) => s.padEnd(40, ' ');

export default {
  id: 'ione',
  name: 'Ione',
  region: 'Moon of Tethys · First Shore',
  music: 'ione',
  grid: [
    ...Array.from({ length: 16 }, () => row('........................................')),
  ],
  legend: {
    '.': { t: 'floor', tex: 'floor_plate' },
  },
  areas: [{ id: 'shore', name: 'The Shore', subtitle: 'Moon of Tethys · First Shore', rect: [0, 0, 40, 16], zone: null }],
  spawns: {
    shore: { x: 20.5, z: 10.5, facing: 'up' },
  },
  sky: { texture: 'bd_ione_dawn', horizonV: 0.6, edge: 'north', parallax: 0.12 },
};
