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
// THE GREAT HOLLOW TREE. A run across the treetops: a landing bough, a spring isle, a root-walk cellar sealed by a
// crate wall (SECRET: needs ROLL), then a giant tree you walk straight through. A ladder inside the trunk climbs to
// the top portal (-> j_tree). Past the tree a spring launches Kong onto a high log bridge over the void.
const canopy = new RoomBuilder('j_canopy', 78, 24, {
  name: 'Canopy Path', area: 'jungle', map: { x: 2, y: 2 },
  props: {
    titleCard: true,
    signs: [
      'The canopy! Spring tires bounce you high: hold Jump for more.\nPress UP at a vine to climb it.',
      'A wall of crates, and a heart fruit behind it!\nToo sturdy to smash... for now.',
      'The Great Tree. Walk through its hollow trunk,\nthen climb the ladder inside, all the way up.',
      'Spiked critters hurt to stomp. SLAP them (X) or leap over.',
    ],
  },
});
canopy.rect(0, 0, 2, 24, '#').rect(76, 0, 2, 24, '#');                          // thick side walls
canopy.clear(1, 10, 1, 3).rect(0, 10, 1, 3, '1');                                // left door (portal 1), on the landing bough
canopy.clear(76, 16, 1, 3).rect(77, 16, 1, 3, '2');                              // right door (portal 2), on the high bridge end
// -- A: landing bough (stand 10), tapering like a limb. Nothing hostile here: this is the arrival point.
canopy.rect(2, 9, 12, 1).rect(2, 8, 10, 1).rect(2, 7, 8, 1).rect(2, 6, 6, 1).rect(2, 5, 4, 1);
canopy.set(4, 10, '?');
canopy.bananas(7, 11, 3).arc(11, 11, 17, 4, 2.5);
canopy.plat(14, 6, 4).vine(14, 7, 9);                                            // safety log under gap 1, with a vine back up
// -- B: spring isle (stand 11). The spring flings Kong to an optional high log.
canopy.rect(17, 10, 11, 1).rect(18, 9, 9, 1).rect(19, 8, 7, 1).rect(20, 7, 5, 1);
canopy.set(22, 10, 'Y').plat(21, 15, 7).bananas(22, 16, 4);
canopy.set(25, 11, 's');
// -- gap 2: a root-walk cellar lies beneath it. A vine climbs back up to B; at the far end waits the crate door.
canopy.arc(26, 12, 32, 4, 2.5);
canopy.rect(27, 7, 1, 3).vine(28, 7, 10);
canopy.rect(28, 6, 15, 1).rect(29, 5, 14, 1).rect(31, 4, 12, 1);                 // the root walk (stand 7)
canopy.set(40, 7, '?');
canopy.bananas(31, 7, 7);
// -- C: island above the root walk, with the checkpoint, and a branch above it for the first bat
canopy.rect(32, 10, 8, 1).rect(33, 9, 6, 1);
canopy.set(34, 11, 'S').set(38, 11, '?');
canopy.rect(34, 17, 9, 2).set(37, 16, 'a');
// -- the Great Tree: root flare, trunk, flat crown; a corridor through the trunk and a ladder shaft inside
canopy.rect(38, 0, 18, 2).rect(39, 2, 16, 2).rect(40, 4, 14, 1).rect(41, 5, 12, 1);
canopy.rect(43, 6, 8, 12).rect(44, 18, 6, 5).rect(40, 21, 14, 2);
canopy.clear(43, 11, 8, 2);                                                      // corridor (stand 11)
canopy.clear(45, 13, 3, 10).ladder(46, 11, 22);                                  // hollow shaft + ladder (T at 22)
canopy.set(46, 23, '3');
canopy.rect(43, 7, 2, 3, 'R').clear(45, 7, 5, 3);                                // SECRET: crate door + heart cellar (needs Roll)
canopy.set(48, 7, 'h').bananas(45, 7, 2).set(45, 8, 'o');
// -- E: past the tree. A thornbug, and the spring that launches Kong up to the bridge.
canopy.rect(51, 10, 8, 1).rect(52, 9, 6, 1).rect(53, 8, 4, 1).rect(54, 7, 2, 1);
canopy.set(52, 11, '?').set(55, 11, 't').set(57, 10, 'Y');
canopy.bananas(53, 12, 3);
// -- the high bridge (stand 16), a net island beneath it, an overhang with the second bat, and the exit island
canopy.plat(59, 15, 4).plat(64, 15, 4).plat(69, 15, 1);
canopy.bananas(59, 17, 3).bananas(65, 17, 3);
canopy.rect(71, 15, 5, 1).rect(72, 14, 4, 1).rect(73, 13, 3, 1).rect(74, 12, 2, 1);
canopy.bananas(72, 17, 2);
canopy.rect(62, 8, 8, 1).rect(63, 7, 6, 1).rect(64, 6, 4, 1).rect(65, 5, 2, 1);  // net island (stand 9)
canopy.set(65, 9, 's').bananas(64, 10, 3);
canopy.vine(70, 9, 15);
canopy.rect(62, 20, 14, 1).rect(64, 21, 12, 1).rect(67, 22, 9, 1).set(66, 19, 'a');
canopy.portal('1', 'j_start', '1').portal('2', 'j_gorge', '1').portal('3', 'j_tree', '1');

// ------------------------------------------------------------------------------------------------ j_gorge
// WATERFALL GORGE. From the high plateau climb down to a lookout ledge (a barred cave behind you, a crystal on a
// floating islet across the chasm), down again to the riverbed, cross the plunge pool on logs while a tiki spits
// fire along the bridge, then spring up the far cliff to the exit.
const gorge = new RoomBuilder('j_gorge', 52, 26, {
  name: 'Waterfall Gorge', area: 'jungle', map: { x: 5, y: 2 },
  props: {
    titleCard: true,
    waterfall: { x: 29.5, y: 2, w: 5, h: 24 },
    signs: [
      'Waterfall Gorge. Stand on a ladder top and press DOWN to climb down.',
      'A barred cave... and a crystal that floats beyond reach.\nSomething thrown might wake it.',
      'A hollow stump. A ladder leads down into the Hollow Log.',
      'Tiki turrets spit fire. SLAP a fireball to send it back!',
    ],
  },
});
gorge.rect(0, 0, 2, 26).rect(50, 0, 2, 26);                                      // thick side walls
gorge.rect(0, 0, 10, 19);                                                        // left cliff: plateau at stand 19
gorge.clear(1, 19, 1, 3).rect(0, 19, 1, 3, '1');                                 // left door on the plateau
gorge.set(5, 19, '?').bananas(3, 20, 3);
gorge.clear(3, 11, 5, 3).rect(8, 11, 2, 3, 'D');                                 // barred cave in the cliff face (gate A)
gorge.set(5, 11, 'h').set(3, 11, 'o').set(7, 11, 'o').set(4, 12, 'o').set(6, 12, 'o');
gorge.ladder(10, 11, 18);                                                        // down the cliff to the lookout ledge
gorge.rect(10, 9, 5, 2).rect(10, 8, 4, 1).ladder(15, 4, 10);                     // lookout ledge (stand 11); its tip is a ladder top
gorge.set(12, 11, '?');
gorge.rect(10, 0, 16, 4);                                                        // left bank (stand 4), under the crystal islet
gorge.ladder(12, 1, 3).set(12, 0, '3');                                          // the stump: ladder down to j_log
gorge.set(13, 4, '?').set(16, 4, '#');                                           // stump sign, and a step that pens in the snapjaw
gorge.set(23, 4, 's').set(18, 4, '?').bananas(19, 5, 3);
gorge.rect(23, 10, 3, 1).set(24, 9, '#').set(23, 11, 'w');                       // crystal islet: 7 tiles from the lookout tip
gorge.rect(26, 0, 8, 2, 'W');                                                    // the plunge pool (water at the bottom)
gorge.plat(26, 5, 3).plat(30, 6, 3);                                             // bridge of logs over the pool
gorge.bananas(26, 7, 3).bananas(30, 8, 3);
gorge.rect(34, 0, 8, 6);                                                         // right bank (stand 6)
gorge.set(36, 5, 'Y').set(38, 6, 'u').bananas(34, 7, 2);
gorge.rect(42, 0, 8, 8).rect(39, 8, 11, 3);                                      // far cliff + the overhanging ledge (stand 11)
gorge.set(44, 11, 's').bananas(40, 12, 3);
gorge.plat(44, 12, 2).bananas(44, 14, 2);
gorge.rect(46, 11, 4, 4);                                                        // exit plateau (stand 15)
gorge.set(47, 15, 'S').bananas(48, 16, 2);
gorge.clear(50, 15, 1, 3).rect(51, 15, 1, 3, '2');                               // right door
gorge.portal('1', 'j_canopy', '2').portal('2', 'j_shrine', '1').portal('3', 'j_log', '1');

export const rooms = [start, canopy, gorge].map((b) => b.build());
