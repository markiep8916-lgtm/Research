// Tile ids, behaviour flags and the ASCII legend. Pure data: safe to import from Node tools.

export const T = Object.freeze({
  EMPTY: 0,
  SOLID: 1,
  ONEWAY: 2,        // jump-through platform
  SPIKE_UP: 3,
  SPIKE_DOWN: 4,
  LADDER: 5,
  LADDER_TOP: 6,    // one-way floor + climbable (stand on top, press down to descend)
  VINE: 7,
  ROLL_BLOCK: 8,    // wooden crate: broken by a rolling Kong
  POUND_BLOCK: 9,   // cracked slab: broken by a ground pound from above
  LAVA: 10,
  WATER: 11,
  GATE_A: 12,       // opened by switch 'w'
  GATE_B: 13,       // opened by switch 'x'
  SPRING: 14,       // bounce tire
  CRUMBLE: 15,      // falls away shortly after being stood on
});

export const F_SOLID = 1;
export const F_ONEWAY = 2;
export const F_CLIMB = 4;
export const F_HAZARD = 8;

export const FLAGS = new Uint8Array(32);
FLAGS[T.SOLID] = F_SOLID;
FLAGS[T.ONEWAY] = F_ONEWAY;
FLAGS[T.SPIKE_UP] = F_HAZARD;
FLAGS[T.SPIKE_DOWN] = F_HAZARD;
FLAGS[T.LADDER] = F_CLIMB;
FLAGS[T.LADDER_TOP] = F_CLIMB | F_ONEWAY;
FLAGS[T.VINE] = F_CLIMB;
FLAGS[T.ROLL_BLOCK] = F_SOLID;
FLAGS[T.POUND_BLOCK] = F_SOLID;
FLAGS[T.LAVA] = F_HAZARD;
FLAGS[T.WATER] = F_HAZARD;
FLAGS[T.GATE_A] = F_SOLID;
FLAGS[T.GATE_B] = F_SOLID;
FLAGS[T.SPRING] = F_SOLID;
FLAGS[T.CRUMBLE] = F_SOLID;

export const isSolid = (t) => (FLAGS[t] & F_SOLID) !== 0;
export const isOneWay = (t) => (FLAGS[t] & F_ONEWAY) !== 0;
export const isClimb = (t) => (FLAGS[t] & F_CLIMB) !== 0;

// ASCII legend for terrain characters (anything else is an entity/portal marker, see builder.js).
export const CHAR_TILE = Object.freeze({
  '#': T.SOLID, '=': T.ONEWAY, '^': T.SPIKE_UP, 'v': T.SPIKE_DOWN,
  'H': T.LADDER, 'T': T.LADDER_TOP, 'V': T.VINE,
  'R': T.ROLL_BLOCK, 'G': T.POUND_BLOCK, 'L': T.LAVA, 'W': T.WATER,
  'D': T.GATE_A, 'E': T.GATE_B, 'Y': T.SPRING, 'F': T.CRUMBLE,
});
export const TILE_CHAR = Object.freeze(Object.fromEntries(Object.entries(CHAR_TILE).map(([c, t]) => [t, c])));

// Entity markers placed on empty tiles. Meaning is interpreted by game/spawner.js.
export const MARKER_CHARS = {
  '@': 'start', 'S': 'save', 'o': 'banana', 'h': 'heart', 'Q': 'relic', 'B': 'boss', '?': 'sign',
  's': 'snapjaw', 't': 'thornbug', 'a': 'bat', 'u': 'tiki', 'U': 'tikiR', 'm': 'magma', 'p': 'spider',
  'f': 'wisp', 'n': 'cannon', 'N': 'cannonR', 'w': 'switchA', 'x': 'switchB', 'K': 'goal',
};
