// SMOLDERING QUARRY, part B: q_forge (the Banana Boomerang relic) and q_lift (the boomerang-gated gantry).
import { RoomBuilder } from '../builder.js';

// ------------------------------------------------------------------------------------------------ q_forge
// The Old Forge. Kong arrives in a low entry hall, climbs the FLUE (a 4-wide wall-jump chimney, Grip) to a gallery that runs
// over the furnace, and ground-pounds through a cap of cracked slabs (Pound) onto the Great Anvil in the Crucible Hall, where the
// Banana Boomerang rests. A roll-sized chute (Roll) leads back down into the flue; the east door leads out over the slag pit
// (stepping stones with a few far bananas) to the exit hall. The player comes back through the chute.
const forge = new RoomBuilder('q_forge', 52, 26, {
  name: 'The Old Forge', area: 'quarry', map: { x: 16, y: 13 },
  props: {
    titleCard: true,
    relic: 'boom',
    signs: [
      'The old forge still smoulders.\nThe flue climbs to the gallery above:\nhold toward a wall, press Jump to kick off.',
      'Cracked slabs! Jump, then Down + X\nto Ground Pound straight through.',
      'A roll-sized chute leads back down\nthe flue. Curl up (C) and roll through.',
      'BANANA BOOMERANG!  Press V to throw it.\nIt flies 8 tiles, then comes back to you.\nFace your target first.',
      'It flips far-off crystal switches\nand snatches bananas you cannot reach.\nThe Gantry beyond is sealed by crystals.',
      'The Tribe stoked this forge for ages,\nburying the Golden Banana\'s power.\nThe Gantry lies to the east.',
    ],
  },
});
forge.border('#');
forge.ground(1, 50, 2);                                    // forge floor, stand 3
// --- west block: low entry hall, the flue beside it
forge.rect(1, 10, 11, 15, '#');                            // ceiling mass over the hall (x1..11, y10..24)
forge.rect(7, 8, 2, 2, '#').rect(10, 9, 2, 1, '#');        // hanging chunks (a heavier, lower ceiling toward the flue)
forge.rect(12, 6, 1, 19, '#');                             // flue left wall (door below it at y3..5)
// --- the furnace body (x17..34): flue right wall, gallery deck on top (stand 17), the Crucible Hall inside
forge.rect(17, 3, 18, 14, '#');
forge.clear(22, 9, 10, 6);                                 // Crucible Hall x22..31, y9..14 (floor stand 9)
forge.rect(24, 15, 5, 2, 'G');                             // slab cap x24..28, two layers
forge.rect(24, 10, 7, 1, '#').rect(26, 9, 4, 1, '#');      // the Great Anvil: face x24..30 (stand 11) on a waist x26..29
forge.clear(17, 9, 5, 1);                                  // return chute: 1-tile tunnel from the hall west into the flue
forge.clear(32, 9, 3, 3);                                  // east doorway of the hall (x32..34, y9..11)
// --- gallery: sealed at the east end, a boiler hanging from the ceiling
forge.rect(32, 17, 3, 8, '#');
forge.rect(18, 21, 14, 4, '#');
forge.rect(29, 19, 2, 2, '#');                             // a heavy pipe hanging low over the tiki (the spikes and the cap keep full head room)
// --- east: boiler over the pit, slag pit, stepping stones, exit hall
forge.rect(35, 14, 16, 11, '#');
forge.rect(41, 11, 2, 3, '#').rect(46, 12, 3, 2, '#');     // hanging columns
forge.rect(35, 0, 4, 9, '#');                              // east ledge, stand 9
forge.rect(39, 1, 8, 2, 'L');                              // slag pit x39..46
forge.rect(40, 0, 2, 7, '#');                              // stone I (x40..41, stand 7)
forge.rect(43, 0, 2, 5, '#');                              // stone II (x43..44, stand 5)
forge.clear(51, 3, 1, 3).rect(51, 3, 1, 3, '2');           // exit portal (right wall)
forge.clear(0, 3, 1, 3).rect(0, 3, 1, 3, '1');             // entry portal (left wall)
// --- spikes and enemies
forge.rect(19, 17, 2, 1, '^');                             // spike patch on the gallery deck (hop it)
forge.set(11, 3, 'm').set(31, 17, 'u').set(37, 9, 'm');
// --- furniture (signs are consumed in placement order)
forge.set(4, 3, '?').set(6, 3, 'S');
forge.set(22, 17, '?');
forge.set(23, 9, '?').set(22, 9, 'S');
forge.set(25, 11, '?').set(27, 11, '?').set(29, 11, 'Q');   // on the anvil face
forge.set(36, 9, '?');
// --- bananas
forge.bananas(2, 4, 3).bananas(5, 4, 3);                                  // entry hall
forge.arc(8, 5, 12, 4, 1.4);
forge.bananas(13, 6, 3, 0, 3).bananas(16, 9, 2, 0, 3);                     // up the flue
forge.arc(17, 18, 23, 5, 2).bananas(25, 18, 5);                            // gallery
forge.bananas(18, 9, 3);                                                   // chute
forge.arc(35, 10, 40, 5, 2).arc(40, 8, 44, 5, 2).bananas(46, 4, 2);       // east steps (also far bananas for the boomerang)
forge.portal('1', 'q_pass', '2').portal('2', 'q_lift', '1');

// ------------------------------------------------------------------------------------------------ q_lift
// The Gantry. Three halls stacked in a tall steel shaft; each lift (a ladder in a closet) is sealed by a crystal-locked gate.
// The crystal sits on a ledge across a lava pit: only a thrown boomerang can wake it. Hall 1 teaches the throw in peace, hall 2
// tests it under fire (a fire wisp and a magma blob), and the open shaft above is a platform climb to the top ladder.
const lift = new RoomBuilder('q_lift', 26, 45, {
  name: 'The Gantry', area: 'quarry', map: { x: 18, y: 13 },
  props: {
    signs: [
      'THE GANTRY. The Tribe locked every lift\nwith crystals. A thrown boomerang can\nwake a crystal from far away.',
      'A crystal glows across the pit!\nFace it and press V. The boomerang\nflies 8 tiles and comes back.',
      'Fire wisps! Only the boomerang can hurt\nthem. Throw it as they drift closer.',
      'The Girder Tower looms above.\nGo on, Kong. The Overlord awaits.',
    ],
  },
});
lift.border('#');
lift.rect(1, 0, 24, 3, '#').rect(1, 10, 24, 2, '#').rect(1, 20, 24, 2, '#').rect(1, 30, 24, 2, '#');   // floor + three slabs
lift.clear(0, 3, 1, 3).rect(0, 3, 1, 3, '1');
// --- hall 0: arrival, save barrel, a lava hop, the ladder up
lift.rect(14, 8, 3, 2, '#').rect(21, 7, 3, 3, '#');           // hanging machinery
lift.set(3, 3, '?').set(4, 3, 'S');
lift.rect(6, 1, 3, 2, 'L');
lift.arc(5, 4, 9, 5, 2.2);
lift.ladder(11, 3, 11);
lift.bananas(13, 4, 4).bananas(18, 4, 3);
lift.set(20, 3, 'm');
// --- hall 1 (gate D): crystal w on the far ledge, across a lava pit; the lift is the closet on the right
lift.rect(3, 11, 6, 1, 'L');
lift.rect(4, 17, 4, 3, '#');                                  // hanging machinery over the pit (the throw line at y13 stays clear)
lift.set(2, 12, 'w').set(9, 12, '?');
lift.rect(14, 12, 11, 8, '#').clear(15, 12, 3, 8).rect(14, 12, 1, 3, 'D');
lift.ladder(16, 12, 21);
lift.bananas(10, 13, 3);
// --- hall 2 (gate E): arrival from the lift, crystal x across a pit on the right; the lift is the closet on the left
lift.rect(18, 21, 5, 1, 'L');
lift.rect(10, 27, 4, 3, '#');                                 // hanging machinery
lift.set(24, 22, 'x').set(15, 22, '?');
lift.rect(1, 22, 5, 8, '#').clear(2, 22, 3, 8).rect(5, 22, 1, 3, 'E');
lift.ladder(3, 22, 31);
lift.bananas(8, 23, 5);
lift.set(9, 22, 'm').set(6, 27, 'f');
// --- hall 3: climb the platforms to the deck, ladder up to the top portal; a tire on the right leads to a banana ledge
lift.plat(6, 33, 4).plat(2, 35, 4);
lift.rect(9, 36, 8, 2, '#');
lift.vline(12, 38, 43, 'H');
lift.set(12, 44, '2');
lift.bananas(7, 35, 3).bananas(2, 37, 3);
lift.set(19, 31, 'Y').rect(22, 36, 3, 1, '#').bananas(22, 37, 3).bananas(19, 34, 3, 0, 2);
lift.set(23, 33, 'f').set(14, 38, '?');
lift.portal('1', 'q_forge', '2').portal('2', 'g_base', '1');

export const rooms = [forge, lift].map((b) => b.build());
