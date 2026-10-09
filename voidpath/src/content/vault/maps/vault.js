// vault (PURE MapDef, TECH_PLAN 3.1, 12.5): the Memory Vault, HALCYON's mind seen from inside.
// Floating grid platforms over a data starfield, joined by hard-light bridges. 1 cell = 1 world unit,
// +Z = south (toward the camera). The grid is generated from the platform and bridge rects below.
//
//   The Interface (south-west)  where the party materialises; the neural link back to the Spire
//   The Grid (south)            G1 (two Data Wraiths, visible), G2 (Ana Sato, the Hales, Orion's
//                               corrupted memory), G3 (the firewall: a Firewall Golem holds the bridge)
//   Memory Fields (middle)      the Index (hub, Med-Station) and three spokes, one memory crystal each:
//                                 west   relay W1, one data switch extends bridge a      (introduce)
//                                 north  relay N1, two switches together extend bridge d (combine)
//                                 east   relay E1, one switch swings between bridge b (crystal) and
//                                        bridge c (the Archive, optional elite)          (twist)
//   The Core (north)            the core bridge f opens after BOLT's reveal; a Corrupted Memory at
//                               the gate, a Med-Station, ECHO at the heart of it
//
// Binding (12.5): spawns `entry`, `core`. Shards shard:vault:a|b|c (the Nth pickup plays the Nth
// memory). All dialogue lives in story.js; this file names script ids only.

// ---------------------------------------------------------------- layout

const W = 72, H = 56;

// [c0, r0, c1, r1] inclusive cell rects; ch: legend char; cut: chamfer depth at the corners
const PLATFORMS = [
  { id: 'interface', rect: [1, 44, 12, 54], ch: ',', cut: 2 },
  { id: 'g1', rect: [18, 43, 29, 54], ch: '.', cut: 2 },
  { id: 'g2', rect: [35, 42, 47, 52], ch: '.', cut: 1 },
  { id: 'g3', rect: [33, 28, 48, 35], ch: '.', cut: 1 },
  { id: 'stacks', rect: [12, 27, 22, 36], ch: '.', cut: 1 },
  { id: 'hub', rect: [30, 15, 51, 23], ch: ',', cut: 2 },
  { id: 'core', rect: [29, 1, 51, 9], ch: ':', cut: 2 },
  { id: 'w1', rect: [13, 13, 23, 24], ch: '.', cut: 1 },
  { id: 'wc', rect: [1, 13, 8, 24], ch: ',', cut: 1 },
  { id: 'n1', rect: [12, 1, 23, 8], ch: '.', cut: 1 },
  { id: 'nc', rect: [1, 1, 7, 8], ch: ',', cut: 1 },
  { id: 'e1', rect: [56, 14, 66, 24], ch: '.', cut: 1 },
  { id: 'ec', rect: [55, 1, 66, 8], ch: ',', cut: 1 },
  { id: 'archive', rect: [55, 30, 66, 37], ch: '.', cut: 1 },
  { id: 'cache', rect: [58, 42, 64, 47], ch: ',', cut: 1 },
];

// permanent bridges ('=') and switched bridges (gate legend chars)
const BRIDGES = [
  { rect: [13, 48, 17, 49], ch: '=' },   // interface -> G1
  { rect: [30, 47, 34, 48], ch: '=' },   // G1 -> G2
  { rect: [40, 36, 41, 41], ch: '=' },   // G2 -> G3
  { rect: [23, 31, 32, 32], ch: 'g' },   // G3 -> the Stacks (the firewall's switch)
  { rect: [16, 25, 17, 26], ch: '=' },   // the Stacks -> W1
  { rect: [24, 18, 29, 19], ch: '=' },   // W1 -> hub
  { rect: [17, 9, 18, 12], ch: '=' },    // W1 -> N1
  { rect: [52, 18, 55, 19], ch: '=' },   // hub -> E1
  { rect: [9, 18, 12, 19], ch: 'a' },    // W1 -> west crystal (one switch)
  { rect: [8, 4, 11, 5], ch: 'd' },      // N1 -> north crystal (two switches)
  { rect: [60, 9, 61, 13], ch: 'b' },    // E1 -> east crystal (the twist, on)
  { rect: [60, 25, 61, 29], ch: 'c' },   // E1 -> the Archive (the twist, off)
  { rect: [60, 38, 61, 41], ch: '=' },   // the Archive -> the cache
  { rect: [40, 10, 41, 14], ch: 'f' },   // hub -> the Core (after BOLT's reveal)
];

function buildGrid() {
  const rows = Array.from({ length: H }, () => Array(W).fill(' '));
  for (const p of PLATFORMS) {
    const [c0, r0, c1, r1] = p.rect;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        // chamfered corners: a platform reads as a cut slab, not a box
        const dx = Math.min(c - c0, c1 - c), dz = Math.min(r - r0, r1 - r);
        if (dx + dz < p.cut) continue;
        rows[r][c] = p.ch;
      }
    }
  }
  for (const b of BRIDGES) {
    const [c0, r0, c1, r1] = b.rect;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (rows[r][c] === ' ') rows[r][c] = b.ch;
  }
  return rows.map((r) => r.join(''));
}

/** The cell rect of the switched bridge drawn with legend char `ch` (its gate's rect). */
const bridgeRect = (ch) => BRIDGES.find((b) => b.ch === ch).rect;

export const LAYOUT = { W, H, PLATFORMS, BRIDGES };

// ---------------------------------------------------------------- moods

const mood = (extra = {}) => ({
  fog: '#140c2c', density: 0.022, sky: '#7a6ae0', ground: '#1a0f38', hemi: 0.62,
  key: 0.75, keyColor: '#9fd8ff', fill: 0.4, exposure: 1.0, bloom: 1.05, saturation: 1.12, ...extra,
});
const MOOD = {
  iface: mood({ sky: '#6fd0ff', key: 0.8 }),
  grid: mood(),
  fields: mood({ fog: '#16102e', sky: '#8a7cf0', keyColor: '#c9b8ff', key: 0.8 }),
  crystal: mood({ fog: '#101a34', sky: '#6fe0ff', keyColor: '#bff4ff', key: 0.75, bloom: 1.1 }),
  east: mood({ fog: '#1e0c2a', sky: '#b06ae0', ground: '#240a2a', keyColor: '#ffb0ea', key: 0.75 }),
  core: mood({ fog: '#22082a', sky: '#d070ff', ground: '#2a0624', hemi: 0.72, keyColor: '#ff9ae6', key: 0.7, bloom: 1.12, saturation: 1.16 }),
};

// ---------------------------------------------------------------- props

const pillar = (x, z, h = 3.2, extra = {}) => ({ t: 'vault.pillar', x, z, h, ...extra });
const mono = (x, z, rot = 0, s = 1) => ({ t: 'vault.monolith', x, z, rot, s });
const glitch = (x, z, s = 1, extra = {}) => ({ t: 'vault.glitch', x, z, s, ...extra });
const debris = (x, z, s = 1, y = -4) => ({ t: 'vault.debris', x, z, s, y });
const shaft = (x, z, color = '#8f7aff', h = 9) => ({ t: 'vault.shaft', x, z, color, h });
const pool = (x, z, r, color, k = 0.4) => ({ t: 'vault.pool', x, z, r, color, k });
// a memory-set screen on its projector (WARDEN's sigil takes these over when he speaks, rule 14)
const screen = (x, z, group) => [
  { t: 'vault.screenRig', x, z, w: 1.4 },
  { t: 'screen', tex: 'va_screen', x, y: 1.55, z: z + 0.02, w: 1.4, h: 0.7, group },
];

const props = [
  { t: 'vault.islands' },
  // ---- the Interface: the neural link, where the squad materialises
  { t: 'vault.portal', x: 6.5, z: 45.4 },
  pillar(2.4, 46.4, 3.6), pillar(11.2, 52.4, 2.8), mono(10.6, 45.2, 0.35),
  ...screen(3.0, 52.0, 'iface'),
  // ---- the Grid: G1 (the wraiths), G2 (the Hales at Window 9), G3 (the firewall)
  pillar(19.0, 44.2, 3.4), pillar(28.6, 53.0, 2.6), mono(28.0, 44.0, -0.3), glitch(24.0, 52.6, 0.9),
  { t: 'vault.frame', x: 38.2, z: 42.6, w: 2.6 }, pillar(36.0, 51.2, 3.0), pillar(46.8, 48.0, 2.4), mono(46.6, 51.4, 0.5, 0.8),
  pillar(47.4, 34.4, 3.6), pillar(43.6, 28.4, 2.6), mono(34.0, 34.6, 0.2, 0.9), glitch(33.6, 31.6, 0.8, { when: '!vault:firewall_down' }),
  // ---- the Stacks: rows of crew memory slabs
  mono(13.4, 33.4, 0, 0.9), mono(14.8, 33.4, 0, 0.9), mono(18.6, 28.4, 0, 0.9), mono(20.0, 28.4, 0, 0.9), pillar(21.6, 32.2, 3.0),
  // ---- the west spoke: Agnes Pell's memorial, the relay, the crystal's memory set
  { t: 'vault.chairs', x: 20.6, z: 22.8, n: 6 }, pillar(22.4, 14.2, 3.4), pillar(13.4, 23.4, 2.6),
  ...screen(2.6, 16.8, 'mem_w'), ...screen(7.4, 16.8, 'mem_w'), pillar(1.8, 22.6, 2.4),
  // ---- the north spoke
  pillar(22.4, 7.4, 3.2), pillar(16.6, 1.4, 2.6), mono(21.8, 1.6, -0.2, 0.8),
  ...screen(2.2, 4.2, 'mem_n'), ...screen(6.8, 4.2, 'mem_n'),
  // ---- the Index (hub)
  pillar(32.4, 16.4, 4.0), pillar(49.6, 16.4, 4.0), mono(38.0, 15.8), mono(43.0, 15.8), glitch(31.4, 22.0, 0.6),
  // ---- the east spoke: Theo's birthday, the relay that swings, the crystal's memory set
  pillar(56.8, 23.0, 3.0), pillar(66.0, 20.6, 2.6), glitch(58.4, 22.6, 0.7, { when: '!vault:swarm_down' }),
  ...screen(57.6, 4.2, 'mem_e'), ...screen(63.4, 4.2, 'mem_e'), pillar(65.6, 7.2, 2.4),
  // ---- the Archive (sealed records) and the cache past it
  mono(56.4, 31.0, 0.2), mono(64.6, 31.0, -0.2), mono(64.8, 33.6, 0, 0.8), pillar(55.8, 36.4, 2.8), glitch(60.5, 30.6, 0.8),
  pillar(63.6, 46.4, 2.2), glitch(59.0, 46.2, 0.6),
  // ---- the Core: the heart, pillars in a ring, corruption around it
  { t: 'vault.core', id: 'core', x: 40.5, z: 2.6 },
  pillar(31.0, 2.4, 4.2), pillar(50.0, 2.4, 4.2), pillar(30.4, 7.6, 3.0), pillar(50.6, 7.6, 3.0),
  glitch(35.6, 3.6, 1.1, { when: '!story:halcyon_restored' }), glitch(45.6, 5.0, 0.9, { when: '!story:halcyon_restored' }),
  // ---- depth: fragments drifting far below, light rising out of the abyss between platforms
  debris(15.0, 39.0, 1.2), debris(31.0, 25.0, 1.4, -5), debris(52.6, 34.0, 1.0), debris(26.0, 10.0, 1.3, -4.5), debris(9.5, 40.0, 1.0, -3.5),
  debris(50.0, 52.0, 1.5, -5), debris(68.4, 26.0, 0.9, -3), debris(9.6, 10.6, 1.1), debris(53.6, 12.6, 1.0, -4.5), debris(4.0, 30.0, 1.3, -5),
  shaft(15.2, 41.0, '#8f7aff'), shaft(31.6, 39.4, '#4fe3ff'), shaft(52.4, 27.6, '#a77aff'), shaft(26.8, 11.4, '#4fe3ff'),
  shaft(53.0, 10.4, '#ff6ad8'), shaft(9.6, 31.0, '#8f7aff'), shaft(32.0, 54.0, '#4fe3ff', 7),
];

// ---------------------------------------------------------------- lights (virtual)

// every light also lays a pool on the floor (readable on every quality tier); warm light only where
// a human memory plays (the echoes, the memorial, Window 9, the link home)
const pools = [];
const lamp = (x, z, color, intensity = 10, extra = {}) => {
  const y = extra.y ?? 1.5;
  if (y > 0 && !extra.when) pools.push(pool(x, z + 0.3, 1.2 + intensity * 0.09, color, 0.3));
  return { x, y, z, color, intensity, distance: 7, ...extra };
};
const CY = '#4fe3ff', VI = '#a77aff', MG = '#ff4fd0', WARM = '#ffb46a', GOLD = '#ffd27a';
// the memory sets at each crystal: gold for WARDEN (vault:gold), white for BOLT's seed (vault:seed)
const memoryLights = (x, z) => [
  { x, y: 2.4, z: z + 1.6, color: GOLD, intensity: 22, distance: 9, tag: 'va_gold', when: 'vault:gold' },
  { x, y: 2.0, z: z + 3.4, color: '#cff8ff', intensity: 18, distance: 8, tag: 'va_seed', when: 'vault:seed' },
];

const lights = [
  // the Interface
  lamp(6.5, 46.0, WARM, 14, { y: 1.8, distance: 8 }), lamp(2.4, 46.8, CY, 10, { y: 2.2 }), lamp(11.2, 52.6, CY, 9),
  lamp(3.0, 52.4, VI, 8, { y: 1.8 }), { x: 15.0, y: -1.5, z: 48.5, color: '#8a5cff', intensity: 16, distance: 8 },
  // G1
  lamp(21.4, 45.8, WARM, 9, { y: 1.2 }), lamp(19.0, 44.6, CY, 10, { y: 2.2 }), lamp(24.0, 52.6, MG, 10, { y: 0.9 }),
  lamp(28.4, 50.0, VI, 9), lamp(28.6, 53.2, CY, 8, { y: 1.8 }),
  // G2: Window 9 throws amber over the Hales
  lamp(38.2, 43.4, '#ffcf6a', 13, { y: 1.6, distance: 8 }), lamp(36.0, 51.4, CY, 10, { y: 2.0 }), lamp(45.4, 50.2, MG, 9, { y: 0.8 }),
  lamp(42.6, 47.4, VI, 8), lamp(46.8, 48.2, CY, 8, { y: 1.8 }),
  { x: 32.0, y: -1.5, z: 47.5, color: '#4fe3ff', intensity: 14, distance: 7 },
  // G3: the firewall burns magenta-red until it falls
  { x: 35.4, y: 1.4, z: 31.5, color: '#ff4f8a', intensity: 14, distance: 7, when: '!vault:firewall_down' },
  { x: 35.4, y: 1.4, z: 31.5, color: CY, intensity: 10, distance: 7, when: 'vault:firewall_down' },
  lamp(45.6, 30.8, WARM, 9, { y: 1.2 }), lamp(47.4, 34.6, CY, 10, { y: 2.2 }), lamp(40.5, 34.4, VI, 9),
  lamp(43.6, 28.6, CY, 8, { y: 1.8 }), { x: 41.0, y: -1.5, z: 38.5, color: '#8a5cff', intensity: 14, distance: 7 },
  // the Stacks
  lamp(16.0, 30.8, WARM, 9, { y: 1.2 }), lamp(14.2, 34.0, CY, 9), lamp(19.4, 28.8, VI, 10), lamp(21.6, 32.4, CY, 8, { y: 2.0 }),
  lamp(20.6, 35.2, MG, 6, { y: 0.8 }),
  // the west spoke
  lamp(20.6, 22.8, GOLD, 10, { y: 1.4 }), lamp(14.4, 16.6, CY, 9, { y: 1.3 }), lamp(22.4, 14.4, VI, 10, { y: 2.0 }),
  lamp(13.4, 23.6, CY, 8, { y: 1.8 }), lamp(18.0, 19.0, VI, 6),
  lamp(5.0, 15.8, '#7ff4ff', 10, { y: 1.6, distance: 8 }), lamp(5.0, 19.6, WARM, 8, { y: 1.0 }), lamp(1.8, 22.8, VI, 8, { y: 1.8 }),
  lamp(2.6, 17.2, CY, 7, { y: 2.2 }), ...memoryLights(5.0, 15.4),
  // the north spoke
  lamp(13.4, 5.0, CY, 9, { y: 1.3 }), lamp(20.4, 4.0, WARM, 8, { y: 1.2 }), lamp(22.4, 7.6, VI, 9, { y: 2.0 }),
  lamp(16.6, 1.8, CY, 8, { y: 1.8 }),
  lamp(4.5, 3.2, '#7ff4ff', 10, { y: 1.6, distance: 8 }), lamp(4.5, 7.0, WARM, 8, { y: 1.0 }), lamp(6.8, 4.6, CY, 7, { y: 2.2 }),
  lamp(1.8, 6.6, VI, 7), ...memoryLights(4.5, 2.8),
  // the Index
  lamp(40.5, 19.2, VI, 14, { y: 2.0, distance: 9 }), lamp(46.4, 17.8, WARM, 9, { y: 1.2 }), lamp(32.4, 16.6, CY, 10, { y: 2.4 }),
  lamp(49.6, 16.6, CY, 10, { y: 2.4 }), lamp(34.6, 21.4, '#7dffb0', 7, { y: 1.2 }), lamp(31.4, 22.2, MG, 6, { y: 0.8 }),
  lamp(43.0, 16.2, VI, 6), { x: 27.0, y: -1.5, z: 18.5, color: '#4fe3ff', intensity: 14, distance: 7 },
  // the east spoke: Theo's birthday is the warmest light in the Vault
  lamp(63.0, 22.0, '#ffc070', 11, { y: 1.3 }), lamp(63.2, 15.6, CY, 9, { y: 1.3 }), lamp(58.4, 19.4, MG, 9, { y: 1.0 }),
  lamp(56.8, 23.2, VI, 8, { y: 2.0 }), lamp(66.0, 20.8, CY, 7, { y: 1.8 }),
  { x: 53.6, y: -1.5, z: 18.5, color: '#ff6ad8', intensity: 14, distance: 7 },
  lamp(60.5, 3.2, '#7ff4ff', 10, { y: 1.6, distance: 8 }), lamp(60.5, 7.0, WARM, 8, { y: 1.0 }), lamp(57.6, 4.6, CY, 7, { y: 2.2 }),
  lamp(65.6, 7.4, VI, 8, { y: 1.8 }), lamp(63.4, 4.6, MG, 6, { y: 2.2 }), ...memoryLights(60.5, 2.8),
  // the Archive and the cache
  lamp(60.5, 32.6, MG, 12, { y: 1.6 }), lamp(57.6, 35.8, WARM, 8, { y: 1.2 }), lamp(64.6, 31.4, CY, 9, { y: 1.8 }),
  lamp(55.8, 36.6, VI, 8, { y: 1.8 }), lamp(61.0, 44.2, CY, 9, { y: 1.4 }), lamp(59.0, 46.4, MG, 7, { y: 0.8 }), lamp(63.6, 46.6, VI, 7),
  // the Core: magenta while she grieves, cyan once she is whole
  { x: 40.5, y: 3.0, z: 3.6, color: MG, intensity: 18, distance: 9, when: '!story:halcyon_restored' },
  { x: 40.5, y: 3.0, z: 3.6, color: '#8fefff', intensity: 20, distance: 9, when: 'story:halcyon_restored' },
  lamp(31.0, 2.6, CY, 10, { y: 2.4 }), lamp(50.0, 2.6, CY, 10, { y: 2.4 }), lamp(33.4, 6.8, WARM, 8, { y: 1.2 }),
  lamp(36.0, 8.4, VI, 8), lamp(45.0, 8.4, VI, 8), lamp(48.8, 6.4, '#9fd8ff', 8, { y: 1.4 }),
  lamp(30.4, 7.8, MG, 6, { y: 1.8 }), lamp(50.6, 7.8, MG, 6, { y: 1.8 }),
  { x: 40.5, y: -1.5, z: 12.0, color: '#8a5cff', intensity: 14, distance: 7 },
];
props.push(...pools);

// ---------------------------------------------------------------- ambient

const drift = (x, z, w, d, rate = 3) => ({ preset: 'va_drift', x, y: 1.6, z, area: [w, 2.4, d], rate });
const data = (x, z, w, d, rate = 3) => ({ preset: 'data', x, y: 0.2, z, area: [w, 0.2, d], rate });
const ambient = [
  drift(6.5, 49, 11, 10), drift(23.5, 48.5, 11, 11), drift(41, 47, 12, 10), drift(40.5, 31.5, 15, 7), drift(17, 31.5, 10, 9),
  drift(18, 18.5, 10, 11), drift(4.5, 18.5, 7, 11), drift(17.5, 4.5, 11, 7), drift(4, 4.5, 6, 7), drift(40.5, 19, 21, 8, 5),
  drift(61, 19, 10, 10), drift(60.5, 4.5, 11, 7), drift(60.5, 33.5, 11, 7), drift(40, 5, 22, 8, 5),
  // the relays (puzzle areas) keep their own motes
  drift(13.2, 4.5, 3.6, 7, 1.5), drift(14.5, 18.7, 3.2, 6, 1.5), drift(61, 15.1, 7, 2.6, 1.5), drift(34.5, 32, 3.2, 4.6, 1.5),
  data(15, 48.5, 4, 1.2, 2), data(32, 47.5, 4, 1.2, 2), data(40.5, 38.5, 1.2, 5, 2), data(26.5, 18.5, 5, 1.2, 2),
  data(53.5, 18.5, 3, 1.2, 2), data(17.5, 10.5, 1.2, 3, 2), data(60.5, 39.5, 1.2, 3, 2),
  { preset: 'glitch', x: 40.5, y: 1.2, z: 4.0, area: [8, 1.6, 4], rate: 0.8, burst: 5, when: '!story:halcyon_restored' },
];

export default {
  id: 'vault',
  name: 'Memory Vault',
  region: 'HALCYON · Deep Memory',
  music: 'vault',
  grid: buildGrid(),
  legend: {
    // every cell a random quarter turn (W-4): no per-cell detail lines up into a stamp (G2 rule 16)
    '.': { t: 'floor', tex: 'va_grid', mix: [['va_grid_b', 0.22], ['va_grid_c', 0.06]], rot: 'random', roughness: 0.42, metalness: 0.3, emissive: 2.4 },
    ',': { t: 'floor', tex: 'va_field', mix: [['va_field_b', 0.25]], rot: 'random', roughness: 0.4, metalness: 0.25, emissive: 2.4 },
    ':': { t: 'floor', tex: 'va_core', mix: [['va_core_b', 0.3], ['va_grid_c', 0.06]], rot: 'random', roughness: 0.4, metalness: 0.3, emissive: 2.6 },
    '=': { t: 'floor', tex: 'va_bridge', roughness: 0.3, metalness: 0.2, emissive: 2.6 },
    a: { t: 'floor', tex: 'va_bridge', gate: 'br_w' },
    b: { t: 'floor', tex: 'va_bridge', gate: 'br_e' },
    c: { t: 'floor', tex: 'va_bridge', gate: 'br_ar' },
    d: { t: 'floor', tex: 'va_bridge', gate: 'br_n' },
    f: { t: 'floor', tex: 'va_bridge', gate: 'br_core' },
    g: { t: 'floor', tex: 'va_bridge', gate: 'firewall' },
  },
  wallTex: { side: 'va_edge', cap: 'va_edge', low: 'va_edge' },
  mood: MOOD.grid,
  underlay: { texture: 'va_abyss', y: -11, repeat: [5, 5], scroll: [0.0025, -0.004], color: [1, 1, 1] },
  areas: [
    // switch relays first (first match wins): no random encounters while a puzzle is in play
    { id: 'relay_n', name: 'Memory Fields', subtitle: 'Memory Vault · North Relay', rect: [11, 0, 15.4, 9], zone: null, puzzle: true, mood: MOOD.fields, banner: false },
    { id: 'relay_w', name: 'Memory Fields', subtitle: 'Memory Vault · West Relay', rect: [12.6, 15, 16.4, 22.4], zone: null, puzzle: true, mood: MOOD.fields, banner: false },
    { id: 'relay_e', name: 'Memory Fields', subtitle: 'Memory Vault · East Relay', rect: [57, 13.6, 65, 16.6], zone: null, puzzle: true, mood: MOOD.east, banner: false },
    { id: 'relay_fw', name: 'The Grid', subtitle: 'Memory Vault · The Firewall', rect: [32.6, 29.4, 36.4, 34.6], zone: null, puzzle: true, mood: MOOD.grid, banner: false },
    { id: 'core', name: 'The Core', subtitle: 'Memory Vault · Where She Keeps the Sad Part', rect: [27, 0, 53, 9.4], zone: null, mood: MOOD.core },
    { id: 'archive', name: 'The Archive', subtitle: 'Memory Vault · Sealed Records', rect: [54, 29.6, 67, 48], zone: null, mood: MOOD.east },
    { id: 'interface', name: 'The Interface', subtitle: 'Memory Vault · Neural Link', rect: [0, 43, 12.8, 56], zone: null, mood: MOOD.iface },
    { id: 'grid', name: 'The Grid', subtitle: 'Memory Vault · Outer Memory', rect: [12.8, 36.6, 49, 56], zone: 'vault_grid', mood: MOOD.grid },
    { id: 'firewall', name: 'The Grid', subtitle: 'Memory Vault · The Firewall', rect: [22.6, 24, 49, 36.6], zone: 'vault_grid', mood: MOOD.grid, banner: false },
    { id: 'stacks', name: 'The Stacks', subtitle: 'Memory Vault · Crew Memory', rect: [10, 24.6, 22.6, 38], zone: 'vault_grid', mood: MOOD.grid },
    { id: 'crystal_w', name: 'Memory Fields', subtitle: 'Memory Vault · A Crystal', rect: [0, 12, 9.4, 24.6], zone: 'vault_grid', mood: MOOD.crystal, banner: false },
    { id: 'crystal_n', name: 'Memory Fields', subtitle: 'Memory Vault · A Crystal', rect: [0, 0, 8.4, 9.4], zone: 'vault_grid', mood: MOOD.crystal, banner: false },
    { id: 'crystal_e', name: 'Memory Fields', subtitle: 'Memory Vault · A Crystal', rect: [54, 0, 67, 8.4], zone: 'vault_core', mood: MOOD.crystal, banner: false },
    { id: 'fields_w', name: 'Memory Fields', subtitle: 'Memory Vault · West Fields', rect: [9.4, 0, 29.9, 24.6], zone: 'vault_grid', mood: MOOD.fields },
    { id: 'hub', name: 'Memory Fields', subtitle: 'Memory Vault · The Index', rect: [29.9, 9.4, 52, 24], zone: 'vault_grid', mood: MOOD.fields, banner: false },
    { id: 'fields_e', name: 'Memory Fields', subtitle: 'Memory Vault · East Fields', rect: [52, 8.4, 67, 29.6], zone: 'vault_core', mood: MOOD.east, banner: false },
  ],
  spawns: {
    entry: { x: 7.5, z: 48.5, facing: 'right' },
    core: { x: 34.5, z: 7.5, facing: 'right' },
    hub: { x: 40.5, z: 21.5, facing: 'up' },
    grid: { x: 24.5, z: 48.5, facing: 'right' },
    firewall: { x: 40.5, z: 33.0, facing: 'up' },
    west: { x: 19.5, z: 19.0, facing: 'left' },
    north: { x: 18.0, z: 6.0, facing: 'left' },
    east: { x: 60.5, z: 19.5, facing: 'up' },
    // the memory stages (contact-sheet staging and jumps)
    crystal_w: { x: 5.0, z: 19.6, facing: 'up' },
    crystal_n: { x: 4.5, z: 7.0, facing: 'up' },
    crystal_e: { x: 60.5, z: 7.0, facing: 'up' },
  },
  viewpoints: {
    interface: { x: 7.5, z: 48.5, facing: 'up' },
    grid: { x: 24.5, z: 48.5, facing: 'right' },
    echoes: { x: 40.5, z: 46.0, facing: 'up' },
    firewall: { x: 40.5, z: 32.6, facing: 'up' },
    hub: { x: 40.5, z: 20.5, facing: 'up' },
    west: { x: 18.5, z: 19.5, facing: 'left' },
    crystal_w: { x: 4.5, z: 20.0, facing: 'up' },
    north: { x: 17.5, z: 5.5, facing: 'left' },
    crystal_n: { x: 4.0, z: 6.0, facing: 'up' },
    east: { x: 60.5, z: 20.5, facing: 'up' },
    crystal_e: { x: 60.5, z: 6.4, facing: 'up' },
    archive: { x: 60.5, z: 35.0, facing: 'up' },
    core: { x: 40.5, z: 8.0, facing: 'up' },
  },
  // the crew memory echoes: holograms replaying voyage moments (12.4: 6-10 talkable)
  npcs: [
    { id: 'echo_sato', sprite: 'crew_sato', name: 'ANA SATO', x: 21.4, z: 45.4, facing: 'down', hologram: true, talk: 'vault.crew_sato',
      idle: { path: [[21.4, 45.4], [23.0, 45.6]], speed: 0.9, pause: [2, 4] } },
    { id: 'echo_jun', sprite: 'crew_jun', name: 'JUN HALE', x: 37.6, z: 44.6, facing: 'right', hologram: true, talk: 'vault.crew_hale' },
    { id: 'echo_ilka', sprite: 'crew_ilka', name: 'ILKA HALE', x: 38.8, z: 44.6, facing: 'left', hologram: true, talk: 'vault.crew_hale' },
    { id: 'echo_brandt', sprite: 'crew_brandt', name: 'DALIA BRANDT', x: 45.6, z: 30.4, facing: 'down', hologram: true, talk: 'vault.crew_brandt',
      idle: { path: [[45.6, 30.4], [46.8, 31.6], [45.6, 30.4]], speed: 0.8, pause: [2, 5] } },
    { id: 'echo_voss', sprite: 'crew_voss', name: 'COMMANDER VOSS', x: 15.2, z: 30.2, facing: 'right', hologram: true, talk: 'vault.crew_voss' },
    { id: 'echo_cadet', sprite: 'crew_cadet', name: 'CADET', x: 16.8, z: 30.6, facing: 'left', hologram: true, talk: 'vault.crew_voss', pose: 'kneel' },
    { id: 'echo_pell', sprite: 'holo', name: 'HALCYON', x: 20.6, z: 21.4, facing: 'down', hologram: true, projector: false, talk: 'vault.crew_pell' },
    { id: 'echo_okoye', sprite: 'crew_okoye', name: 'BRAM OKOYE', x: 20.4, z: 3.6, facing: 'down', hologram: true, talk: 'vault.crew_okoye',
      idle: { path: [[20.4, 3.6], [21.6, 4.6], [20.4, 5.4]], speed: 0.7, pause: [3, 6] } },
    { id: 'echo_castellan', sprite: 'crew_castellan', name: 'RHEA CASTELLAN', x: 46.4, z: 17.4, facing: 'down', hologram: true, talk: 'vault.crew_castellan',
      idle: { path: [[46.4, 17.4], [48.2, 17.6], [46.4, 17.4]], speed: 0.8, pause: [2, 5] } },
    { id: 'echo_theo', sprite: 'theo', name: 'THEO', x: 63.6, z: 21.6, facing: 'left', hologram: true, talk: 'vault.crew_lindqvist' },
    { id: 'echo_sera', sprite: 'young_sera', name: 'YOUNG SERA', x: 62.4, z: 21.6, facing: 'right', hologram: true, talk: 'vault.crew_lindqvist' },
    { id: 'echo_ferro', sprite: 'crew_ferro', name: 'LUCIA FERRO', x: 57.6, z: 35.4, facing: 'right', hologram: true, talk: 'vault.crew_ferro',
      idle: { path: [[57.6, 35.4], [58.8, 35.0]], speed: 0.6, pause: [4, 7] } },
  ],
  chests: [
    // critical path: the chapter's weapons, each with a line that points at it (G2 rule 8)
    { id: 'rifle', x: 46.2, z: 44.4, item: 'eq_w_nyx_4', prop: 'vault.cache', talk: 'vault.chest_rifle' },
    { id: 'gauntlet', x: 49.0, z: 21.6, item: 'eq_w_orion_4', prop: 'vault.cache', talk: 'vault.chest_gauntlet' },
    { id: 'ether_core', x: 2.6, z: 6.6, item: 'eq_x_ether_core', prop: 'vault.cache' },
    { id: 'stacks', x: 20.8, z: 35.0, item: 'medigel_plus', n: 2, credits: 300, prop: 'vault.cache' },
    { id: 'interface', x: 2.8, z: 51.2, item: 'stim', n: 2, prop: 'vault.cache' },
    // off the path: the Archive's sealed records and the cache beyond them (the secret)
    { id: 'archive', x: 65.0, z: 35.8, item: 'ether_plus', n: 2, credits: 400, prop: 'vault.cache' },
    { id: 'null_ward', x: 61.0, z: 43.6, item: 'eq_x_null_ward', prop: 'vault.cache' },
  ],
  interactables: [
    // the memory crystals: the Nth pickup plays the Nth memory (11.8)
    { id: 'crystal_a', kind: 'shard', x: 5.0, z: 15.4, r: 0.4, reach: 1.4, flag: 'shard:vault:a', script: 'vault.shard', label: 'Touch', prop: 'vault.crystal' },
    { id: 'crystal_b', kind: 'shard', x: 4.5, z: 2.8, r: 0.4, reach: 1.4, flag: 'shard:vault:b', script: 'vault.shard', label: 'Touch', prop: 'vault.crystal' },
    { id: 'crystal_c', kind: 'shard', x: 60.5, z: 2.8, r: 0.4, reach: 1.4, flag: 'shard:vault:c', script: 'vault.shard', label: 'Touch', prop: 'vault.crystal' },
    // data switches (each pans to the bridge it drives; guide strips link them)
    { id: 'sw_fw', kind: 'switch', x: 34.2, z: 29.8, r: 0.4, flag: 'sw:vault:fw', mode: 'once', reveal: 'firewall', script: 'vault.firewall_switch',
      label: 'Use', prop: 'vault.relay', when: 'vault:firewall_down' },
    { id: 'sw_w', kind: 'switch', x: 14.4, z: 16.2, r: 0.4, flag: 'sw:vault:w', reveal: 'br_w', script: 'vault.switch_w', label: 'Use', prop: 'vault.relay' },
    { id: 'sw_n1', kind: 'switch', x: 13.4, z: 2.4, r: 0.4, flag: 'sw:vault:n1', reveal: 'br_n', script: 'vault.switch_n', label: 'Use', prop: 'vault.relay' },
    { id: 'sw_n2', kind: 'switch', x: 13.4, z: 7.6, r: 0.4, flag: 'sw:vault:n2', reveal: 'br_n', script: 'vault.switch_n', label: 'Use', prop: 'vault.relay' },
    { id: 'sw_e', kind: 'switch', x: 63.2, z: 15.2, r: 0.4, flag: 'sw:vault:e', reveal: 'br_e', script: 'vault.switch_e', label: 'Use', prop: 'vault.relay' },
    // Med-Stations: the Index, and the core gate before Echo (7.9)
    { id: 'med_hub', kind: 'med', x: 34.6, z: 21.2, box: [33.9, 20.8, 35.3, 21.6] },
    { id: 'med_core', kind: 'med', x: 33.4, z: 6.4, box: [32.7, 6.0, 34.1, 6.8] },
    // leader-gated (Orion): a corrupted memory he can coax into playing (WRITING 9.5)
    { id: 'orion_echo', kind: 'inspect', x: 45.4, z: 50.0, r: 0.5, reach: 1.3, leader: 'orion', label: 'Coax', talk: 'vault.orion_echo',
      prop: 'vault.glitchMemory', leaderHint: 'A memory, scrambled and sulking. *Orion* could talk it round.' },
    // the neural link back to the Spire's antechamber
    { id: 'link', kind: 'exit', x: 6.5, z: 45.0, r: 0.9, to: { map: 'spire', spawn: 'from_vault' }, label: 'Leave the Vault', transition: 'iris' },
    // the one-way shortcut out of the core (12.4)
    { id: 'stream', kind: 'exit', x: 48.8, z: 6.0, r: 0.6, to: { map: 'vault', spawn: 'entry' }, label: 'Ride the stream', when: 'story:bolt_seed',
      prop: 'vault.stream' },
  ],
  triggers: [
    { id: 'arrival', on: 'load', when: 'chapter>=ch4 & !story:memory_launch', once: true, script: 'vault.arrival' },
    { id: 'bolt_reveal', on: 'flag', when: 'chapter>=ch4 & story:memory_launch & story:memory_lullaby & story:memory_severance & !story:bolt_seed',
      once: true, script: 'vault.bolt_reveal' },
  ],
  gates: [
    { id: 'firewall', rect: bridgeRect('g'), open: 'sw:vault:fw', prop: 'vault.bridge' },
    { id: 'br_w', rect: bridgeRect('a'), open: 'sw:vault:w', prop: 'vault.bridge' },
    { id: 'br_n', rect: bridgeRect('d'), open: 'sw:vault:n1 & sw:vault:n2', prop: 'vault.bridge' },
    { id: 'br_e', rect: bridgeRect('b'), open: 'sw:vault:e', prop: 'vault.bridge' },
    { id: 'br_ar', rect: bridgeRect('c'), open: '!sw:vault:e', prop: 'vault.bridge' },
    { id: 'br_core', rect: bridgeRect('f'), open: 'story:bolt_seed', prop: 'vault.bridge', propFields: { wide: true } },
  ],
  // the four lessons stand where the party must pass; their scripts set the flags that dismiss them
  bosses: [
    { id: 'wraiths', art: 'data_wraith', name: 'DATA WRAITHS', x: 25.4, z: 47.2, facing: 'left', encounter: 'vault_wraiths', script: 'vault.wraiths',
      triggerRadius: 3.0, radius: 0.9, when: '!vault:wraiths_down' },
    { id: 'firewall', art: 'firewall_golem', name: 'FIREWALL GOLEM', x: 37.4, z: 31.4, facing: 'left', encounter: 'vault_firewall', script: 'vault.firewall',
      triggerRadius: 3.4, radius: 1.2, when: '!vault:firewall_down' },
    { id: 'swarm', art: 'glitch_swarm', name: 'GLITCH SWARM', x: 58.4, z: 19.0, facing: 'left', encounter: 'vault_swarm', script: 'vault.swarm',
      triggerRadius: 2.8, radius: 0.8, when: '!vault:swarm_down' },
    { id: 'overwrite', art: 'corrupted_memory', name: 'CORRUPTED MEMORY', x: 41.0, z: 7.6, facing: 'left', encounter: 'vault_overwrite', script: 'vault.overwrite',
      triggerRadius: 2.8, radius: 0.9, when: '!vault:overwrite_down' },
    { id: 'echo', art: 'echo_field', name: 'ECHO', x: 40.5, z: 2.9, facing: 'right', encounter: 'vault_boss_echo', script: 'vault.echo',
      triggerRadius: 3.0, radius: 1.0 },
    // M3: the optional elite of the Archive
    { id: 'archon', art: 'corrupted_memory', name: 'OVERWRITE ARCHON', x: 60.5, z: 32.2, facing: 'left', encounter: 'vault_elite_archon', script: 'vault.archon',
      triggerRadius: 3.0, radius: 1.1 },
  ],
  exits: [],
  props,
  lights,
  ambient,
};
