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

// ------------------------------------------------------------------------------------------------ j_canopy
// THE GREAT HOLLOW TREE. A run across the treetops: landing bough, spring isle, a root-walk cellar sealed by a
// crate wall (SECRET: needs ROLL), then the giant tree you walk straight through. A ladder inside the trunk climbs
// to the top portal (-> j_tree). Past the tree, a spring launches Kong onto a high log bridge over the void.
const canopy = new RoomBuilder('j_canopy', 78, 24, {
  name: 'Canopy Path', area: 'jungle', map: { x: 2, y: 2 },
  props: {
    titleCard: true,
    signs: [
      'The canopy! Springs bounce you high: hold Jump for a bigger boost.\nPress UP at a vine to climb it.',
      'The Great Tree. Its hollow trunk climbs all the way up.\nWho knows what grows at the top?',
    ],
  },
});
canopy.rect(0, 0, 2, 24, '#').rect(76, 0, 2, 24, '#');                          // thick side walls
canopy.clear(1, 10, 1, 3).rect(0, 10, 1, 3, '1');                                // left door (portal 1), on the landing bough
canopy.clear(76, 16, 1, 3).rect(77, 16, 1, 3, '2');                              // right door (portal 2), on the high bridge end
// -- A: landing bough (stand 10), tapering like a limb
canopy.rect(2, 9, 12, 1).rect(2, 8, 10, 1).rect(2, 7, 8, 1).rect(2, 6, 6, 1).rect(2, 5, 4, 1);
canopy.set(4, 10, '?');
canopy.bananas(7, 11, 5).arc(13, 11, 18, 6, 2.5);
// -- B: spring isle (stand 11) + optional high log guarded by a bat
canopy.rect(17, 10, 11, 1).rect(18, 9, 9, 1).rect(19, 8, 7, 1).rect(20, 7, 5, 1);
canopy.set(25, 10, 'Y');
canopy.plat(21, 15, 6).bananas(21, 16, 6);
canopy.rect(20, 19, 8, 2).set(24, 18, 'a');
canopy.set(20, 11, 's');
// -- gap 2 with the root walk beneath it: a vine hangs down to it and a crate door waits at its far end
canopy.arc(27, 12, 33, 6, 2.5);
canopy.rect(27, 7, 1, 3).vine(28, 7, 10);                                       // hanging root post + the vine up to B
canopy.rect(28, 4, 15, 3);                                                       // the root walk (stand 7)
canopy.bananas(30, 7, 11);
// -- C: island above the root walk, with the checkpoint
canopy.rect(32, 10, 8, 1).rect(33, 9, 6, 1);
canopy.set(34, 11, 'S').set(38, 11, '?');
// -- the Great Tree
canopy.rect(41, 0, 12, 6).rect(43, 6, 8, 12).rect(44, 18, 6, 5);
canopy.clear(43, 11, 8, 2);                                                      // corridor through the trunk
canopy.clear(45, 13, 3, 10).ladder(46, 11, 22);                                  // hollow shaft + ladder (stand at 11, T at 22)
canopy.set(46, 23, '3');
canopy.rect(43, 7, 2, 3, 'R').clear(45, 7, 5, 3);                                // SECRET: crate door + heart cellar (needs Roll)
canopy.set(48, 7, 'h').bananas(45, 7, 3).bananas(45, 8, 3);
canopy.rect(34, 17, 9, 2).set(37, 16, 'a');                                      // branch with the first bat... (second bat below)
// -- E: past the tree
canopy.rect(51, 10, 8, 1).rect(52, 9, 6, 1).rect(53, 8, 4, 1).rect(54, 7, 2, 1);
canopy.set(54, 11, 't').set(57, 10, 'Y');
canopy.bananas(52, 12, 4);
canopy.rect(50, 21, 10, 2).set(56, 20, 'a');
// -- the high bridge (stand 16)
canopy.plat(59, 15, 4).plat(64, 15, 4).plat(69, 15, 1);
canopy.bananas(59, 17, 4).bananas(64, 17, 4);
canopy.rect(71, 15, 5, 1).rect(72, 14, 4, 1).rect(73, 13, 3, 1).rect(74, 12, 2, 1);
canopy.vine(70, 9, 15);
canopy.rect(62, 4, 8, 5).set(65, 9, 's');                                        // net island under the bridge
canopy.bananas(63, 10, 5);
canopy.bananas(72, 17, 3);
canopy.portal('1', 'j_start', '1').portal('2', 'j_gorge', '1').portal('3', 'j_tree', '1');

// ------------------------------------------------------------------------------------------------ j_gorge
// WATERFALL GORGE. Drop from the high plateau, cross the riverbed and the plunge pool, climb the far cliff.
const gorge = new RoomBuilder('j_gorge', 52, 26, {
  name: 'Waterfall Gorge', area: 'jungle', map: { x: 5, y: 2 },
  props: {
    titleCard: true,
    waterfall: { x: 34, y: 2, w: 4, h: 24 },
    signs: [
      'Waterfall Gorge. The river is cold and the logs are slippery.\nA stump in the riverbed leads down to the Hollow Log.',
      'A barred cave, and a crystal that floats beyond reach.\nSomething that flies could trigger it.',
    ],
  },
});
gorge.rect(0, 0, 12, 15, '#').rect(0, 15, 2, 11, '#').rect(50, 12, 2, 14, '#');
gorge.clear(1, 15, 1, 3).rect(0, 15, 1, 3, '1');                                 // left door on the plateau
gorge.ladder(12, 4, 14);                                                         // ladder down the cliff face
gorge.rect(12, 0, 32, 4, '#');                                                   // riverbed (stand 4)
gorge.ladder(12, 4, 14);
gorge.set(5, 15, '?').set(14, 4, '?');
gorge.ladder(16, 1, 3).set(16, 0, '3');                                          // the stump: ladder down to j_log
gorge.clear(19, 0, 4, 4).rect(19, 0, 4, 2, 'W');                                 // pit 1
gorge.arc(18, 5, 23, 5, 2.5);
gorge.set(25, 4, 's').set(28, 3, 'Y');
gorge.clear(30, 0, 8, 4).rect(30, 0, 8, 2, 'W');                                 // the plunge pool
gorge.plat(30, 5, 2).plat(33, 6, 2).plat(36, 5, 2);
gorge.bananas(30, 7, 2).bananas(33, 8, 2).bananas(36, 7, 2);
gorge.set(39, 4, 'u');
gorge.plat(42, 5, 2);
gorge.rect(44, 0, 8, 8).plat(45, 9, 3).rect(48, 0, 4, 12);
gorge.bananas(44, 9, 3).bananas(46, 11, 2);
gorge.set(46, 12, 'S');
gorge.clear(50, 12, 1, 3).rect(51, 12, 1, 3, '2');                               // right door
// the crystal isle + barred cave
gorge.rect(20, 11, 4, 4).rect(21, 10, 2, 1);
gorge.set(20, 15, 'w').bananas(22, 15, 2);
gorge.clear(5, 4, 5, 3).rect(10, 4, 2, 3, 'D');
gorge.set(7, 4, 'h').bananas(5, 4, 2).bananas(8, 4, 1);
gorge.portal('1', 'j_canopy', '2').portal('2', 'j_shrine', '1').portal('3', 'j_log', '1');

export const rooms = [start, canopy, gorge].map((b) => b.build());
