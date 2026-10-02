// CRYSTAL CAVERNS (part 2): the Grip Grotto and the Deep Shafts. Roll + Pound are held on arrival; the Gorilla Grip
// is found in c_grip and is then mandatory in c_deep.
import { RoomBuilder } from '../builder.js';

// ------------------------------------------------------------------------------------------------ c_grip
// The Grip Grotto. A tall 4-wide shaft splits the room into a low arrival chamber (left) and a HIGH exit ledge
// (right). Drop to the bottom to take the relic, then wall-jump back up. Without Grip the exit is out of reach.
const grip = new RoomBuilder('c_grip', 26, 45, {
  name: 'The Grip Grotto', area: 'cavern', map: { x: 17, y: 9 },
  props: {
    titleCard: true,
    signs: [
      'The Spider Queen kept this grotto sealed.\nA warm glow rises from below.\nStep off the ledge and drop in.',
      'GORILLA GRIP!\nHold toward a wall to cling, press JUMP\nto kick off. Zig-zag from wall to wall!',
      'Beyond lie the Deep Shafts, where the\nTiki Tribe hid the crystal\'s power.\nKeep your grip.',
    ],
  },
});
grip.border('#');
grip.prop('relic', 'grip');
// left mass + arrival chamber (stand y = 31), ceiling at 37
grip.rect(1, 1, 9, 30, '#');                       // x1..9, y1..30
grip.rect(1, 37, 9, 7, '#');                       // ceiling mass
grip.rect(10, 1, 1, 43, '#');                      // left wall of the shaft (x=10)
grip.clear(10, 31, 1, 3);                          // doorway into the shaft (y31..33)
grip.rect(3, 35, 1, 2, '#').rect(6, 34, 2, 3, '#').rect(9, 36, 1, 1, '#'); // stalactites in the arrival chamber
// right mass + exit ledge (stand y = 39)
grip.rect(15, 1, 10, 38, '#');                     // x15..24, y1..38
grip.rect(19, 41, 2, 3, '#').rect(24, 42, 1, 2, '#');                       // stalactites over the exit ledge
// shrine dais at the bottom of the shaft
grip.rect(11, 1, 4, 2, '#').rect(12, 3, 2, 1, '#');   // shaft floor + dais
// portals: left (arrival), right (exit)
grip.clear(0, 31, 1, 3).rect(0, 31, 1, 3, '1');
grip.clear(25, 39, 1, 3).rect(25, 39, 1, 3, '2');
// signs, save barrel and relic
grip.set(2, 31, '?').set(5, 31, 'S');
grip.set(11, 3, '?');
grip.set(12, 4, 'Q');
grip.set(18, 39, '?');
// guide bananas: a falling line down the shaft and a zig-zag up it
for (let i = 0; i < 8; i++) grip.set(12 + (i % 2), 34 - i * 3, 'o');
for (let i = 0; i < 10; i++) grip.set(i % 2 ? 14 : 11, 7 + i * 3, 'o');
grip.bananas(6, 32, 3).bananas(20, 40, 3);                                  // cues in the arrival chamber and over the exit ledge
grip.portal('1', 'c_queen', '2').portal('2', 'c_deep', '1');

// ------------------------------------------------------------------------------------------------ c_deep
// The Deep Shafts: a Z-shaped route (52x60). Kong enters top-left, DESCENDS four alternating tiers (ladders
// back up), crosses a LAVA CAVERN on crumble blocks and a spring island, WALL-JUMPS UP a 4-wide shaft, crosses the
// top gallery and finally DROPS down a long shaft to the bottom portal. Grip is mandatory (the climb).
// Secret heart: a 3-wide twin shaft off the mid-way barrel alcove, with a spike on each wall.
const deep = new RoomBuilder('c_deep', 52, 60, {
  name: 'The Deep Shafts', area: 'cavern', map: { x: 15, y: 9 },
  props: {
    signs: [
      'THE DEEP SHAFTS\nThe Tiki priests buried the crystal\'s\npower here. Descend, cross, climb.',
      'Crumble blocks fall half a second\nafter you step on them.\nKeep moving!',
      'A LONG CLIMB.\nHold toward a wall to cling, press JUMP\nto kick off. Zig-zag upward!',
      'A glint high above... a spike guards\neach wall. Time every kick.',
      'The last shaft is a long drop.\nLadders lead back up.',
    ],
  },
});
deep.rect(0, 0, 52, 60, '#');                                // start from solid rock, carve the cave out of it
// --- the four descent tiers (x1..12, 6 tall, floors 2 thick, openings alternate right/left)
deep.clear(1, 51, 12, 8);                                    // tier 0: entry chamber (stand 51)
deep.clear(8, 49, 5, 2);                                     //   opening in floor 0 (right)
deep.clear(1, 43, 12, 6);                                    // tier 1 (stand 43)
deep.clear(1, 41, 5, 2);                                     //   opening in floor 1 (left)
deep.clear(1, 35, 12, 6);                                    // tier 2 (stand 35)
deep.clear(8, 33, 5, 2);                                     //   opening in floor 2 (right)
deep.clear(1, 27, 12, 6);                                    // tier 3 (stand 27)
deep.clear(1, 25, 5, 2);                                     //   opening in floor 3 (left)
deep.clear(1, 19, 14, 6);                                    // tier 4 (stand 19), runs into the lava cavern
deep.ladder(8, 43, 50).ladder(5, 35, 42).ladder(8, 27, 34).ladder(5, 19, 26); // ladders = the way back up
deep.rect(6, 43, 2, 1, '^');                                 // tier 1: a 2-wide spike patch to hop (teaches spikes)
// --- tier 4 teaching pit: water with crumble stepping stones
deep.clear(7, 15, 6, 4).rect(7, 15, 6, 2, 'W').set(8, 18, 'F').set(10, 18, 'F');
// --- the lava cavern (x15..33, y3..28)
deep.clear(15, 3, 19, 26).rect(15, 3, 17, 8, 'L');           // lava lake, surface at y=11
deep.rect(23, 3, 7, 6, '#').rect(24, 9, 6, 3, '#').rect(25, 12, 5, 2, '#'); // stalagmite island, top stand 14
deep.set(28, 13, 'Y');                                       // spring flush in the island top
deep.rect(16, 16, 2, 1, 'F').rect(19, 15, 2, 1, 'F').rect(22, 14, 2, 1, 'F'); // crumble stepping stones
// --- right ledge, the 4-wide climbing shaft (x35..38), doorway at its foot
deep.rect(32, 3, 7, 16, '#');                                // right ledge + shaft floor (stand 19)
deep.clear(35, 19, 4, 40);                                   // shaft 2 up into the top gallery
deep.clear(34, 19, 1, 4);                                    // doorway (y19..22)
deep.set(35, 41, '^').set(38, 48, '^');                      // test: one spike on each wall high in the climb (above the alcove rest)
// --- mid-way alcove with the barrel, and the twin shaft (3 wide) with the secret heart
deep.clear(39, 33, 2, 3);                                    // alcove tunnel (y33..35)
deep.clear(41, 33, 3, 15);                                   // twin shaft x41..43, y33..47
deep.set(41, 39, '^').set(43, 42, '^');                      // one spike on each wall, three tiles apart: precise kicks
// --- top gallery and the final drop
deep.clear(35, 52, 16, 7);                                   // gallery (stand 52)
deep.clear(45, 7, 6, 45);                                    // final shaft x45..50 down to the hall (stand 7)
deep.ladder(45, 7, 51);                                      // long ladder up the final shaft
// --- stalactites (kept 2+ tiles apart from each other and from walls: no 1-wide slots)
deep.rect(1, 57, 1, 2).rect(1, 58, 3, 1).rect(5, 56, 2, 3).rect(8, 57, 1, 2).rect(11, 57, 2, 2); // tier 0 (rounded ceiling, all out of reach)
deep.rect(1, 47, 3, 2);                                                      // tier 1 (over the opening only)
deep.rect(7, 40, 2, 1).rect(10, 38, 1, 3);                                   // tier 2 (low ones kept off the walking line)
deep.rect(1, 31, 3, 2).rect(6, 31, 1, 2);                                    // tier 3
deep.rect(15, 27, 4, 2).rect(16, 26, 2, 1).rect(21, 24, 2, 5);               // cavern, left
deep.rect(25, 28, 5, 1).rect(26, 27, 3, 1).set(27, 26, '#').rect(32, 25, 2, 4); // cavern chandelier + right
deep.rect(35, 57, 3, 2).rect(40, 57, 2, 2).rect(46, 57, 3, 2).rect(49, 56, 2, 3); // top gallery
// --- portals
deep.clear(0, 51, 1, 3).rect(0, 51, 1, 3, '1');              // entry (left, y51..53)
deep.set(48, 0, '2').ladder(48, 1, 6).set(48, 1, 'T');       // bottom portal + ladder well up to the hall floor (a ladder-top right above the portal catches a non-climbing arrival)
// --- signs, barrels, heart, enemies
deep.set(3, 51, '?').set(3, 19, '?').set(36, 19, '?').set(42, 33, '?').set(41, 52, '?');
deep.set(13, 19, 'S').set(40, 33, 'S');
deep.set(42, 45, 'h');
deep.set(6, 27, 's');                                        // snapjaw on floor 3
deep.set(12, 40, 'a');                                       // bat under floor 1, far from the landing
deep.set(21, 23, 'a').set(32, 24, 'a');                      // bats under the cavern stalactites (wake on solid ground)
// --- bananas (~40): drops, arcs over hazards, the bounce path, the climbing zig-zag
deep.bananas(10, 46, 2, 0, -1).bananas(3, 38, 2, 0, -1).bananas(10, 30, 2, 0, -1).bananas(3, 22, 2, 0, -1);
deep.arc(5, 44, 8, 3, 2).arc(6, 20, 13, 4, 2);
deep.set(16, 18, 'o').set(19, 17, 'o').set(22, 16, 'o').bananas(25, 15, 3);
deep.set(29, 17, 'o').set(30, 19, 'o').set(31, 20, 'o').set(32, 20, 'o');
for (let i = 0; i < 8; i++) deep.set(i % 2 ? 38 : 35, 22 + i * 4, 'o');
deep.set(42, 36, 'o').set(42, 40, 'o').set(42, 43, 'o');
deep.set(47, 44, 'o').set(48, 32, 'o').set(47, 20, 'o');
deep.portal('1', 'c_grip', '2').portal('2', 'q_pass', '1');

export const rooms = [grip.build(), deep.build()];
