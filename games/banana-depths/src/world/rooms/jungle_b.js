// JUNGLE, part B: the Roll Shrine, the Hollow Log and the Great Tree.
// (j_start / j_canopy / j_gorge live in jungle.js, written by another designer.)
import { RoomBuilder } from '../builder.js';

// ------------------------------------------------------------------------------------------------ j_shrine
// The Roll Shrine (39x20). Approach: covered meadow -> 2-wide spike patch (teach) -> a snapjaw penned between two
// spike patches (test + twist) -> spiked chasm crossed by two logs -> a small ziggurat with the save barrel and the relic.
// Practice (needs the Roll you just found): a hatch in the floor drops into a cellar sealed by a crate wall; behind it a
// 12-tile 1-tile-high tunnel (lined with bananas) runs under the approach and comes out by a ladder near the start.
const shrine = new RoomBuilder('j_shrine', 39, 20, {
  name: 'The Roll Shrine', area: 'jungle', map: { x: 7, y: 2 },
  props: {
    titleCard: true,
    relic: 'roll',
    signs: [
      'A hatch! Crates seal the tunnel below.\nRolling smashes crate walls and squeezes\nthrough gaps only a ball can enter.',
      'SHRINE OF ROLL\nPress C or Shift on the ground to roll.\nJump out of a roll to leap 6-7 tile gaps!',
    ],
  },
});
shrine.rect(0, 0, 2, 20, '#').rect(37, 0, 2, 20, '#');                         // thick side walls
shrine.rect(2, 0, 35, 5, '#');                                                   // base earth, rows 0..4 (stand y = 5)
shrine.clear(1, 5, 1, 3).rect(0, 5, 1, 3, '1');                                  // arrival door in the left wall
shrine.rect(2, 12, 7, 4, '#').rect(9, 14, 2, 2, '#');                            // stepped cliff overhanging the arrival meadow
shrine.bananas(4, 6, 4);
// -- spike patch 1 (teach): 2 wide, one tile deep
shrine.set(11, 4, '^').set(12, 4, '^');
shrine.arc(10, 6, 14, 5, 2.4);
// -- the pen (test): a snapjaw between two spike patches; landing next to it and the next gap is the twist
shrine.set(15, 5, 's');
shrine.set(18, 4, '^').set(19, 4, '^');
shrine.arc(17, 6, 20, 4, 2.2);
// -- raised landing with the hatch (T flush with the floor) down into a cellar, crate wall, tunnel, cellar, ladder out near the start
shrine.rect(20, 5, 4, 1, '#');                                                   // landing, stand y = 6
shrine.set(20, 6, '?');                                                          // sign 0 (hatch)
shrine.clear(21, 1, 3, 2).ladder(22, 1, 5);                                      // right cellar + hatch ladder
shrine.rect(20, 1, 1, 2, 'R');                                                   // the crate wall
shrine.clear(9, 1, 11, 1);                                                       // tunnel, row 1, x = 9..19
shrine.clear(6, 1, 3, 2).ladder(6, 1, 4);                                        // left cellar + ladder out
shrine.bananas(9, 1, 11).bananas(7, 2, 1);
shrine.bananas(21, 7, 3);
// -- chasm with spikes and two logs
shrine.clear(24, 3, 7, 2).rect(24, 3, 7, 1, '^');
shrine.plat(26, 6, 2).plat(29, 7, 2);
shrine.arc(23, 8, 27, 4, 1.6).bananas(26, 8, 2).bananas(29, 9, 2);
// -- plateau and ziggurat, roof, altar
shrine.rect(31, 5, 6, 3, '#');                                                   // plateau top row 7 (stand y = 8)
shrine.rect(33, 8, 4, 1, '#');                                                   // step 1 (stand y = 9)
shrine.rect(35, 9, 2, 1, '#');                                                   // step 2 (stand y = 10)
shrine.rect(31, 13, 6, 3, '#');                                                  // roof / lintel
shrine.set(32, 8, 'S').set(34, 9, '?');                                          // save barrel + sign 1
shrine.set(35, 10, 'Q');
shrine.bananas(33, 10, 1).bananas(36, 11, 1);
shrine.portal('1', 'j_gorge', '2');

// ------------------------------------------------------------------------------------------------ j_log
// The Hollow Log (52x15). Ladder shaft down from the gorge through a rocky roof, save barrel, a 12-tile runway, then a
// 22-tile 1-tile-high tunnel through a fallen giant (roll only), with a knot-hole to stand up in half way; the far end
// drops into a stepped exit hall. SECRET (Pound): a cracked slab floor over a log-ladder well; the heart sits at the bottom.
const log = new RoomBuilder('j_log', 52, 15, {
  name: 'The Hollow Log', area: 'jungle', map: { x: 5, y: 4 },
  props: {
    signs: [
      'The old log is hollow, but narrow.\nOnly a rolling ball fits through it.',
      'These slabs sound hollow.\nA heavy blow from above may break them.',
    ],
  },
});
log.rect(0, 0, 2, 15, '#').rect(50, 0, 2, 15, '#');                              // side walls
log.rect(2, 0, 48, 7, '#');                                                      // floor rows 0..6 (stand y = 7)
log.rect(2, 11, 3, 4, '#').rect(8, 11, 8, 4, '#').rect(44, 11, 6, 4, '#');       // rocky roofs; the shaft x = 5..7 stays open
log.rect(5, 14, 3, 1, '1');                                                      // top portal ...
log.ladder(6, 7, 13);                                                            // ... above the T-topped ladder column
log.set(3, 7, 'S').set(5, 7, '?');                                               // save barrel, sign 0
// the fallen giant: rows 7..12, tunnel carved along row 7
log.rect(18, 7, 22, 6, '#').clear(18, 7, 22, 1);
log.clear(18, 12, 2, 1).clear(38, 12, 2, 1).clear(18, 11, 1, 1).clear(39, 11, 1, 1);   // rounded ends
log.clear(27, 7, 3, 2);                                                          // knot-hole: room to stand up
log.bananas(18, 7, 22).bananas(27, 8, 3);
// secret well: cover of slabs (2 deep), log-stairs below, heart at the bottom
log.rect(9, 5, 4, 2, 'G');
log.clear(9, 1, 4, 4);
log.plat(9, 4, 4).plat(9, 2, 4);
log.set(10, 1, 'h').bananas(9, 3, 1).bananas(12, 3, 1).bananas(12, 1, 1);
log.set(8, 7, '?');                                                              // sign 1 (slabs)
log.set(15, 10, 'a');                                                            // a bat under the roof, over the runway
log.arc(10, 8, 17, 5, 1.6);
log.bananas(2, 8, 1);
// exit hall: the floor steps down two tiles after a short lip
log.clear(42, 5, 8, 2);
log.clear(50, 5, 1, 3).rect(51, 5, 1, 3, '2');
log.bananas(43, 6, 3).bananas(46, 6, 3);
log.portal('1', 'j_gorge', '3').portal('2', 't_gate', '1');

// ------------------------------------------------------------------------------------------------ j_tree
// The Great Tree (26x45). A giant trunk with two knot-hole corridors; the climb zig-zags up the left and
// right sides: ladder, corridor, spring + log, vine (bat), corridor, vine (bat, after a save barrel), spring, logs, crown nest.
const tree = new RoomBuilder('j_tree', 26, 45, {
  name: 'The Great Tree', area: 'jungle', map: { x: 3, y: -1 },
  props: {
    signs: [
      'This tree is older than the island.\nIts crown bears a fruit the Tribe forgot.',
      'The Tiki Tribe shattered the Golden Banana\nbut the jungle remembers. Take it, Kong.',
    ],
  },
});
tree.rect(0, 0, 2, 45, '#').rect(24, 0, 2, 45, '#');                             // walls
tree.rect(2, 0, 22, 6, '#');                                                     // roots, rows 0..5 (stand y = 6)
tree.set(4, 0, '1').ladder(4, 1, 5);                                             // bottom portal + ladder out of the root cellar
tree.rect(9, 6, 8, 32, '#');                                                     // trunk rows 6..37
tree.rect(17, 6, 7, 5, '#');                                                     // right root buttress (under ledge R1)
tree.clear(9, 32, 1, 6).clear(16, 32, 1, 6);                                     // trunk tapers (rows 32..37)
tree.rect(8, 19, 1, 6, '#').clear(16, 20, 1, 4);                                 // bulge on the left face, niche on the right
tree.rect(17, 30, 2, 3, '#');                                                    // knot above corridor 2
// beat A: ladder up the trunk's left face to ledge L1 (stand 13), which is also the mouth of corridor 1
tree.rect(2, 11, 6, 2, '#').ladder(8, 6, 12);
tree.set(3, 13, '?').bananas(5, 14, 3);
tree.clear(9, 13, 8, 2).bananas(10, 13, 7);                                      // corridor 1
// beat B: right ledge R1 (stand 13), spring, log R2 (stand 18), vine to R3 (stand 27)
tree.rect(17, 11, 7, 2, '#').set(20, 12, 'Y');
tree.bananas(20, 14, 3, 0, 1);
tree.plat(18, 17, 6).bananas(18, 19, 3);
tree.vine(23, 18, 25).rect(17, 25, 6, 2, '#').set(23, 26, 'T');
tree.set(19, 24, 'a');                                                           // bat hanging under R3
// corridor 2 + left ledge L2 (stand 27) with a save barrel
tree.clear(9, 27, 8, 3).bananas(10, 27, 7);
tree.rect(2, 25, 7, 2, '#').set(5, 27, 'S');
// beat C: vine up the left wall to L3 (stand 34), spring, logs, crown nest (stand 40)
tree.vine(2, 27, 32).rect(3, 32, 6, 2, '#').set(2, 33, 'T');
tree.set(7, 31, 'a');                                                            // bat under L3
tree.set(5, 33, 'Y');
tree.bananas(5, 35, 2, 0, 1);
tree.plat(4, 37, 4).bananas(4, 39, 3);
tree.rect(9, 38, 8, 2, '#');                                                     // the crown nest
tree.set(10, 40, '?').set(13, 40, 'h').bananas(11, 41, 1).bananas(15, 41, 1);
// scenery: branch stubs and canopy clumps (none of it is on the route)
tree.rect(2, 19, 4, 2, '#').rect(17, 34, 5, 2, '#').rect(19, 38, 5, 2, '#');
tree.rect(2, 43, 7, 2, '#').rect(17, 43, 7, 2, '#');
tree.portal('1', 'j_canopy', '3');

export const rooms = [ ...[shrine, log, tree].map((b) => b.build()) ];
