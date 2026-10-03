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
      'The HALL OF SLABS.\nThe Tiki Tribe sealed what they broke\nbeneath these stones.',
      'This floor rings hollow...\nCracked slabs. Something heavy\nmight break them.',
      'A narrow way up, high above.\nOnly a gorilla with a firm grip\ncould climb it.',
      'Rest at the barrel. The Stone Golem\nguards the shrine beyond.\nIt does not forgive hesitation.',
    ],
  },
});

/** n bananas along a jump-shaped arc from (x0,y0) to (x1,y1), peaking `rise` tiles above the straight line. */
function arc(b, x0, y0, x1, y1, n, rise = 2) {
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    b.set(Math.round(x0 + (x1 - x0) * u), Math.round(y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * rise), 'o');
  }
}

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
// A cracked panel in the floor: 4 wide, 2 slabs deep. Under it: solid flanks and a 2-wide ladder pair, so any hole that
// opens the cavity is above a ladder and the climb back out of the Caverns always has a way out. Even with every slab gone
// the hole is only a 2-deep, 4-wide notch in the floor, so the hall stays crossable (and climbable) in every state.
hall.rect(31, 1, 2, 6, '.');                                                      // cavity rows 1..6
hall.ladder(31, 1, 7).ladder(32, 1, 7);                                           // H rows 1..6, T at row 7 (flush with the flanks)
hall.rect(30, 8, 4, 2, 'G');                                                      // the plate (surface y=10)
hall.set(31, 0, '4').set(32, 0, '4');

// ---- the hanging tower and its chimney (portal 3) -----------------------------------------------------------------
hall.rect(42, 13, 3, 16, '#').rect(49, 13, 3, 16, '#');                           // two ceiling pylons, clear 3 tiles above the floor
hall.rect(45, 13, 4, 16, '.');                                                    // chimney interior x=45..48
hall.rect(47, 23, 2, 1, '#');                                                     // landing ledge (top y=24)
hall.vline(48, 24, 28, 'H');                                                      // ladder up to the portal
hall.set(48, 29, '3');
hall.rect(41, 24, 1, 2, '#').rect(40, 26, 2, 2, '#').rect(39, 28, 3, 1, '#');     // stepped capitals where the pylons meet the ceiling
hall.rect(52, 24, 1, 2, '#').rect(52, 26, 2, 2, '#').rect(52, 28, 3, 1, '#');

// ---- gatehouse terraces: thornbug on top, crate roll-tunnel underneath ---------------------------------------------
hall.rect(35, 10, 5, 2, '#').set(35, 10, 'R').rect(36, 10, 4, 1, '.');            // west terrace x=35..39 (top 12)
hall.rect(54, 10, 5, 2, '#').set(54, 10, 'R').rect(55, 10, 4, 1, '.');            // east terrace x=54..58 (top 12)

// ---- wall-niche tikis (the turret sits in the wall) ----------------------------------------------------------------
// West: a den cut into the plateau's face behind a parapet; a ladder in its roof leads in and out. Fireballs clear the
// parapet and sweep the middle pillar; the rest of the plateau is out of its line.
hall.rect(25, 7, 4, 2, '.').set(25, 7, '#');
hall.ladder(27, 7, 9);
hall.set(26, 7, 'u');
// East: a niche high in the east pylon; its line is above the terrace, so only full jumps from the terrace are exposed.
hall.rect(50, 15, 2, 2, '.');
hall.set(50, 15, 'U');

// ---- the high road: ladder up the west wall, gallery, bridge -------------------------------------------------------
hall.rect(1, 12, 12, 2, '#');                                                     // gallery x=1..12, top y=14
hall.ladder(6, 4, 13);                                                            // ladder from the court
hall.plat(16, 14, 3).plat(22, 14, 3).plat(28, 15, 3);                             // bridge slabs (tops 15, 15, 16)
// ceiling beams (stepped), with bats roosting under the west one
hall.rect(10, 22, 10, 1, '#').rect(9, 23, 12, 2, '#').rect(8, 25, 14, 4, '#');
hall.rect(61, 23, 10, 1, '#').rect(59, 24, 14, 2, '#').rect(57, 26, 18, 3, '#');
hall.set(11, 14, 'u');                                                            // gallery tiki (slap its fireball back)
hall.set(12, 21, 'a').set(17, 21, 'a');

// ---- enemies on the main path ---------------------------------------------------------------------------------------
hall.set(37, 12, 't').set(56, 12, 't');                                           // thornbugs on the terraces
hall.set(43, 12, 'a').set(50, 12, 'a');                                           // bats under the pylons

// ---- furniture ----------------------------------------------------------------------------------------------------
hall.set(3, 4, '?').set(28, 10, '?').set(46, 10, '?').set(71, 4, '?');
hall.set(73, 4, 'S');

// ---- bananas ------------------------------------------------------------------------------------------------------
hall.bananas(4, 5, 2);                                                            // court
arc(hall, 7, 5, 10, 7, 2, 1);                                                     // court -> P1
arc(hall, 11, 7, 15, 9, 3, 2);                                                    // P1 -> P2
arc(hall, 16, 9, 20, 11, 3, 2);                                                   // P2 -> P3
arc(hall, 21, 11, 25, 11, 3, 2);                                                  // P3 -> plateau
hall.bananas(28, 7, 2, 0, 1);                                                     // inside the tiki den
hall.bananas(31, 11, 2);                                                          // above the cracked panel
hall.bananas(36, 10, 3).bananas(56, 10, 3);                                       // inside the crate tunnels
for (const [x, y] of [[46, 14], [48, 16], [46, 18], [48, 20], [46, 22], [47, 26]]) hall.set(x, y, 'o');   // the chimney's trail
hall.bananas(8, 15, 2);                                                           // gallery
for (const [x, y] of [[13, 16], [15, 16], [19, 17], [21, 17], [25, 17], [27, 18]]) hall.set(x, y, 'o');   // over the bridge gaps
hall.bananas(62, 9, 2).bananas(65, 7, 2);                                         // stairs
arc(hall, 66, 7, 71, 5, 3, 2);                                                    // over the spike pit
hall.bananas(74, 5, 2);                                                           // east court

hall.portal('1', 't_gate', '2').portal('2', 't_golem', '1').portal('3', 't_vault', '1').portal('4', 'c_drop', '1');

export const rooms = [hall].map((b) => b.build());
