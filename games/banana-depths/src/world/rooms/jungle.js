// JUNGLE CANOPY: the opening area. No abilities are needed except where noted; ROLL is found in the Roll Shrine.
import { RoomBuilder } from '../builder.js';

// ------------------------------------------------------------------------------------------------ j_start
// Exemplar room: tutorial signs, bananas leading the way, a pit, log platforms, a ladder climb, and a secret
// heart high in the tree-trunk nook that needs the Gorilla Grip (found much later).
const start = new RoomBuilder('j_start', 52, 22, {
  name: "Kong's Clearing", area: 'jungle', map: { x: 0, y: 2 },
  props: {
    titleCard: true,
    signs: [
      'Welcome home, Kong!\nMove with the arrow keys (or A / D).  Jump with Space (hold it to jump higher).',
      'Press X to SLAP things. Jumping on a critter\'s head works too.\nBananas are good for you. Collect them all.',
      'Stand next to a ladder and press UP to climb. The Golden Banana\'s power is fading... find out why.',
    ],
  },
});
start.rect(0, 0, 2, 22, '#').rect(50, 0, 2, 22, '#').ground(0, 51, 2);          // thick side walls, floor (stand at y = 3)
start.rect(6, 5, 2, 10, '#');                                                    // trunk with a doorway at ground level
start.set(4, 3, '@').set(3, 3, '?');
start.bananas(9, 4, 5);
start.clear(16, 0, 3, 3).rect(16, 0, 3, 2, 'W');                                 // pit 1 (3 wide, water at the bottom)
start.arc(15, 4, 19, 6, 2.2);
start.set(21, 3, '?');
start.plat(24, 4, 4).plat(29, 6, 4).plat(34, 4, 3);                              // log staircase
start.bananas(24, 6, 3).bananas(29, 8, 3).bananas(34, 6, 2);
start.set(27, 3, 's').set(36, 3, '?').set(40, 3, 's').set(42, 3, 'S');
start.ladder(43, 3, 7).rect(44, 3, 6, 5, '#');                                   // ladder up to the exit ledge (stand at y = 8)
start.bananas(45, 9, 3);
start.clear(50, 8, 1, 3).set(50, 8, '.').rect(51, 8, 1, 3, '1');                 // exit door in the right wall, on top of the ledge
start.set(6, 15, 'h');                                                           // SECRET: wall-jump up the nook (needs Gorilla Grip)
start.portal('1', 'j_canopy', '1');

export const rooms = [start.build()];
