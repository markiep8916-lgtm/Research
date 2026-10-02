// SMOLDERING QUARRY, part B: q_forge (the Banana Boomerang relic) and q_lift (the boomerang-gated gantry).
import { RoomBuilder } from '../builder.js';

// ------------------------------------------------------------------------------------------------ q_forge
// The Old Forge. Kong arrives in a low entry hall, climbs the FLUE (a 4-wide wall-jump chimney, Grip) to a gallery that
// runs over the furnace, and ground-pounds through a cap of cracked slabs into the Crucible Hall where the Banana Boomerang
// waits on its altar. A roll-sized return chute leads back down into the flue; the east door leads out over a slag pit to
// the exit hall.
const forge = new RoomBuilder('q_forge', 52, 26, {
  name: 'The Old Forge', area: 'quarry', map: { x: 16, y: 13 },
  props: {
    titleCard: true,
    relic: 'boom',
    signs: [
      'The old forge still smoulders.\nGrip a wall, press toward it and Jump\nto kick up the flue.',
      'Cracked slabs! Jump, then Down + X\nto Ground Pound straight through.',
      'BANANA BOOMERANG!  Press V to throw it.\nIt flies 8 tiles, then comes back to you.\nFace your target first.',
      'It flips far-off crystal switches\nand snatches bananas you cannot reach.\nThe Gantry beyond is sealed by them.',
    ],
  },
});
forge.border('#');
forge.ground(1, 50, 2);                                    // forge floor, stand 3
// --- west block: low entry hall, the flue beside it
forge.rect(1, 10, 11, 15, '#');                            // ceiling mass over the hall (x1..11, y10..24)
forge.rect(12, 6, 1, 19, '#');                             // flue left wall (door below it at y3..5)
// --- the furnace body (x17..36): flue right wall, gallery deck on top (stand 17), the Crucible Hall inside
forge.rect(17, 3, 20, 14, '#');
forge.clear(22, 9, 12, 6);                                 // Crucible Hall x22..33, y9..14 (floor stand 9)
forge.rect(26, 15, 5, 2, 'G');                             // slab cap x26..30, two layers
forge.clear(17, 9, 5, 1);                                  // return chute: 1-tile tunnel from the hall west into the flue
forge.clear(34, 9, 3, 3);                                  // east doorway of the hall (x34..36, y9..11)
// --- gallery: sealed at the east end, boiler hanging from the ceiling
forge.rect(34, 17, 3, 8, '#');
forge.rect(18, 21, 16, 4, '#');
// --- east: slag pit and exit hall
forge.rect(37, 0, 3, 9, '#');                              // east ledge, stand 9
forge.rect(40, 1, 5, 2, 'L');                              // slag pit x40..44
forge.set(41, 2, 'F').set(42, 2, 'F');                     // crumble stones
forge.rect(45, 0, 6, 3, '#');
forge.clear(51, 3, 1, 3).rect(51, 3, 1, 3, '2');           // exit portal (right wall)
forge.clear(0, 3, 1, 3).rect(0, 3, 1, 3, '1');             // entry portal (left wall)
// --- furniture
forge.set(5, 3, '?').set(9, 3, 'S');
forge.set(22, 17, '?').set(24, 9, '?').set(28, 9, '?');
forge.set(32, 9, 'Q');
forge.bananas(3, 4, 3).bananas(13, 6, 3, 0, 3);
forge.arc(15, 18, 24, 6, 2).bananas(36, 17, 1);
forge.set(46, 3, 'm');
forge.portal('1', 'q_pass', '2').portal('2', 'q_lift', '1');


// ------------------------------------------------------------------------------------------------ q_lift
// The Gantry. Three halls stacked in a tall steel shaft; each hall's lift (a ladder in a closet) is sealed by a crystal-locked
// gate. The crystal sits on a ledge across a lava pit: only a thrown boomerang can wake it.
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
lift.set(3, 3, '?').set(4, 3, 'S');
lift.rect(6, 1, 3, 2, 'L');
lift.arc(5, 4, 9, 5, 2.2);
lift.ladder(11, 3, 11);
lift.bananas(13, 4, 4).bananas(18, 4, 3);
lift.set(20, 3, 'm');
// --- hall 1 (gate D): crystal w on the far ledge, across a lava pit; the lift is the closet on the right
lift.rect(3, 11, 6, 1, 'L');
lift.set(2, 12, 'w').set(9, 12, '?');
lift.rect(14, 12, 11, 8, '#').clear(15, 12, 3, 8).rect(14, 12, 1, 3, 'D');
lift.ladder(16, 12, 21);
lift.bananas(10, 13, 3);
// --- hall 2 (gate E): arrival from the lift, crystal x across a pit on the right; the lift is the closet on the left
lift.rect(18, 21, 6, 1, 'L');
lift.set(24, 22, 'x').set(15, 22, '?');
lift.rect(1, 22, 5, 8, '#').clear(2, 22, 3, 8).rect(5, 22, 1, 3, 'E');
lift.ladder(3, 22, 31);
lift.bananas(8, 23, 5);
lift.set(8, 26, 'f').set(11, 22, 'm');
// --- hall 3: climb the platforms to the deck, ladder up to the top portal
lift.plat(6, 33, 4).plat(2, 35, 4);
lift.rect(9, 36, 8, 2, '#');
lift.vline(12, 38, 43, 'H');
lift.set(12, 44, '2');
lift.bananas(7, 35, 3).bananas(2, 37, 3);
lift.set(18, 37, 'f').set(14, 38, '?');
lift.portal('1', 'q_forge', '2').portal('2', 'g_base', '1');

export const rooms = [forge, lift].map((b) => b.build());
