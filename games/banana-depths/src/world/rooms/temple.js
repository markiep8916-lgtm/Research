// SUNKEN TEMPLE (part A): the Hall of Slabs. Kong holds ROLL here; GROUND POUND is found in the Pound Shrine behind the Golem.
// (t_gate, t_pound and t_vault live in temple_b.js.)
import { RoomBuilder } from '../builder.js';

// ------------------------------------------------------------------------------------------------ t_hall
// The Hall of Slabs: a 78x30 nave. From the west: a spike valley crossed on a rising chain of pillars (a wall-niche tiki
// guards it), the long plateau with the cracked SLAB PLATE (Ground Pound drops you down a ladder well to the Caverns),
// two stepped "gatehouse" terraces (thornbug on top, crate roll-tunnel underneath) flanking the hanging TOWER whose
// 4-wide chimney (Gorilla Grip wall-jumps) climbs to the vault portal in the ceiling, then stairs down to the east court.
// A ladder on the west wall leads to a high road (gallery + bridge) that skips the valley.
const hall = new RoomBuilder('t_hall', 78, 30, {
  name: 'Hall of Slabs', area: 'temple', map: { x: 9, y: 4 },
  props: {
    titleCard: true,
    signs: [
      'The HALL OF SLABS. The Tiki Tribe sealed\nwhat they broke beneath these stones.',
      'This floor rings hollow...\nCracked slabs. Something heavy could break them.',
      'A narrow way up. Only a gorilla\nwith a firm grip could climb it.',
      'Rest here. Beyond lies the Golem Chamber.\nIt does not forgive hesitation.',
    ],
  },
});
hall.border('#');

// ---- foundation ---------------------------------------------------------------------------------------------------
hall.ground(1, 7, 3);                                                             // west court, floor y=4
hall.ground(8, 24, 2).hline(8, 24, 3, '^');                                       // spike valley (rows 0..2 + spikes)
hall.rect(10, 0, 2, 6, '#').rect(15, 0, 2, 8, '#').rect(20, 0, 2, 10, '#');       // pillars P1 (top 6), P2 (top 8), P3 (top 10)
hall.ground(25, 60, 9);                                                           // the plateau, floor y=10
hall.ground(61, 63, 7).ground(64, 66, 5);                                         // stairs down: step 1 (top 8), step 2 (top 6)
hall.ground(67, 76, 3);                                                           // east court, floor y=4
hall.clear(67, 2, 4, 2).rect(67, 2, 4, 1, '^');                                   // spike pit right below the stairs (4 wide)
hall.clear(0, 4, 1, 3).rect(0, 4, 1, 3, '1');                                     // portal 1 (west door)
hall.clear(77, 4, 1, 3).rect(77, 4, 1, 3, '2');                                   // portal 2 (to the Golem)

// ---- the slab well (portal 4) -------------------------------------------------------------------------------------
// 4-wide, 2-deep plate. Under it: solid flanks and a 2-wide ladder pair, so any hole that opens the cavity is above a
// ladder and the climb back out of the Caverns always works.
hall.rect(31, 1, 2, 6, '.');
hall.ladder(31, 1, 7).ladder(32, 1, 7);
hall.rect(30, 8, 4, 2, 'G');
hall.set(31, 0, '4').set(32, 0, '4');

// ---- the hanging tower and its chimney (portal 3) -----------------------------------------------------------------
hall.rect(42, 13, 3, 16, '#').rect(49, 13, 3, 16, '#');                           // two ceiling pylons, clear 3 tiles above the floor
hall.rect(45, 13, 4, 16, '.');                                                    // chimney interior x=45..48
hall.rect(47, 23, 2, 1, '#');                                                     // landing ledge (top y=24)
hall.vline(48, 24, 28, 'H');                                                      // ladder up to the portal
hall.set(48, 29, '3');

// ---- gatehouse terraces: thornbug on top, crate roll-tunnel underneath ---------------------------------------------
hall.rect(35, 10, 5, 2, '#').set(35, 10, 'R').rect(36, 10, 4, 1, '.');            // west terrace x=35..39 (top 12)
hall.rect(54, 10, 5, 2, '#').set(54, 10, 'R').rect(55, 10, 4, 1, '.');            // east terrace x=54..58 (top 12)

// ---- wall-niche tikis (the turret sits in the wall and cannot be reached) -------------------------------------------
hall.rect(25, 7, 3, 2, '.').set(25, 7, '#');                                      // niche in the plateau's west face, behind a 1-high parapet
hall.set(26, 7, 'u');                                                             // (fireballs clear the parapet; Kong cannot enter the niche)
hall.rect(50, 14, 2, 2, '.');                                                     // niche in the east pylon, fires over the east terrace
hall.set(50, 14, 'U');

// ---- the high road: ladder up the west wall, gallery, bridge -------------------------------------------------------
hall.rect(1, 12, 12, 2, '#');                                                     // gallery x=1..12, top y=14
hall.ladder(5, 4, 13);                                                            // ladder from the court
hall.plat(16, 14, 3).plat(22, 14, 3).plat(28, 15, 3);                             // bridge slabs (tops 15, 15, 16)
hall.rect(8, 22, 14, 7, '#');                                                     // hanging beam (bats roost under it)
hall.set(11, 14, 'u');                                                            // gallery tiki (slap its fireball back)
hall.set(14, 21, 'a').set(19, 21, 'a');

// ---- enemies on the main path ---------------------------------------------------------------------------------------
hall.set(37, 12, 't').set(56, 12, 't');                                           // thornbugs on the terraces
hall.set(43, 12, 'a').set(50, 12, 'a');                                           // bats under the pylons

// ---- furniture ----------------------------------------------------------------------------------------------------
hall.set(3, 4, '?').set(28, 10, '?').set(46, 10, '?').set(71, 4, '?');
hall.set(73, 4, 'S');

hall.portal('1', 't_gate', '2').portal('2', 't_golem', '1').portal('3', 't_vault', '1').portal('4', 'c_drop', '1');

export const rooms = [hall].map((b) => b.build());
