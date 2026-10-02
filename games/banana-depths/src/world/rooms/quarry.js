// SMOLDERING QUARRY (q_pass): lava, crumbling blocks and old machinery. Kong enters with ROLL, POUND and GRIP.
import { RoomBuilder } from '../builder.js';

/** Hanging rock: a tapering stalactite of `len` rows under the ceiling, centred on cx (pure silhouette, always out of reach). */
function stalactite(b, cx, w, len) {
  for (let i = 0; i < len; i++) {
    const hw = Math.max(0, Math.round(((w - 1) / 2) * (1 - i / len)));
    b.rect(cx - hw, b.h - 2 - i, 2 * hw + 1, 1, '#');
  }
}

// ------------------------------------------------------------------------------------------------ q_pass
// The Slag River. Kong drops in from the caverns onto a lookout ledge, climbs rock terraces down to a lava river, hops a field of
// crumbling blocks to a tire island, and bounces up onto the Girder Bridge: a long stone deck over the river that ends in a 7-wide
// roll-jump gap watched by a tiki sniper. Under the bridge hides the secret: a crystal at the end of a low lava tunnel (too far
// to cross, in range of the boomerang) that opens a gate to a heart chamber in the cliff.
const pass = new RoomBuilder('q_pass', 78, 24, {
  name: 'Slag River Pass', area: 'quarry', map: { x: 13, y: 13 },
  props: {
    titleCard: true,
    signs: [
      'The Tiki Tribe shattered the Golden Banana\nand left its fire burning down here.\nMind the lava, Kong.',
      'Scorched stone crumbles underfoot.\nHop on, hop off, and keep moving!',
      'Tires bounce you sky-high: hold Jump\nas you land to bounce higher.\nSteer toward the bridge!',
      'Too far to jump? Curl into a roll (C),\nthen jump out of the roll for a huge leap.',
      'A crystal glimmers across the lava...\nIt would take something thrown\nfrom afar to wake it.',
    ],
  },
});
pass.border('#');

// --- left cliff: lookout ledge (Kong falls in from the caverns above), rock terraces down to the river bank
pass.ground(1, 7, 14);                                         // lookout ledge, stand 15
pass.ground(8, 9, 12).ground(10, 11, 10);                      // terraces, stand 13 / 11
pass.ground(12, 16, 8);                                        // river bank, stand 9
pass.vline(3, 15, 22, 'H');                                    // ladder up to the top portal (so Kong can climb back to the caverns)
pass.set(3, 23, '1');
pass.set(5, 15, '?').set(6, 15, 'S');
pass.clear(2, 6, 5, 4).rect(2, 6, 5, 2, 'L');                  // furnace window: a sealed lava pocket glowing inside the cliff

// --- the lava river, crossed first by crumbling stones (they drop 0.45 s after Kong lands, so keep moving)
pass.rect(17, 1, 60, 6, 'L');
pass.rect(19, 8, 3, 1, 'F').rect(25, 10, 3, 1, 'F').rect(31, 8, 3, 1, 'F');
pass.set(16, 9, '?');

// --- tire island: a spring flush in the floor bounces Kong up onto the bridge pier
pass.ground(36, 41, 8);                                        // stand 9
pass.set(37, 9, '?').set(39, 8, 'Y');

// --- Girder Bridge: stone pier (with a save barrel), 3-thick deck over the river, ladder down at its end
pass.rect(42, 0, 4, 13, '#');                                  // pier, stand 13
pass.rect(46, 10, 13, 3, '#');                                 // deck x 46..58; the undercroft below it is only 2 tiles high
pass.ladder(59, 8, 12);                                        // ladder from the undercroft shelf up to the end of the bridge
pass.set(44, 13, 'S').set(57, 13, '?');
pass.clear(43, 4, 2, 4).rect(43, 4, 2, 2, 'L');                // furnace window in the pier

// --- undercroft: crystal ledge (left) and shelf (right) face each other across a 6-wide lava gap, under the low roof
pass.rect(46, 0, 3, 8, '#');                                   // crystal ledge, stand 8
pass.rect(55, 0, 12, 8, '#');                                  // shelf, stand 8 (also the safety net under the roll-jump gap)
pass.clear(49, 6, 6, 1);                                       // the hall's lava sits a tile lower than the river's
pass.set(48, 8, 'w').set(46, 8, 'U');
pass.set(63, 8, '?');

// --- right plateau with the exit (a 5-tall face above the shelf, so it cannot be climbed); heart chamber behind gate D in its face
pass.rect(67, 0, 10, 13, '#');                                 // plateau, stand 13
pass.rect(77, 13, 1, 3, '2');
pass.clear(68, 8, 8, 3).rect(67, 8, 1, 3, 'D');
pass.set(71, 8, 'h');
pass.clear(69, 3, 5, 3).rect(69, 3, 5, 1, 'L');                // second furnace window under the chamber

// --- ceiling formations (the entry shaft at x 2..4 and the air above the tire island stay clear)
for (const [cx, w, len] of [[10, 7, 5], [16, 5, 4], [22, 9, 6], [29, 5, 3], [50, 7, 3], [56, 5, 3], [63, 7, 4], [72, 9, 6]]) stalactite(pass, cx, w, len);

// --- bananas
pass.bananas(5, 16, 2);                                        // lookout
pass.set(8, 14, 'o').set(9, 14, 'o').set(10, 12, 'o').set(11, 12, 'o');   // down the terraces
pass.arc(16, 10, 19, 3, 2);                                    // bank -> first stone
pass.set(22, 11, 'o').set(23, 12, 'o').set(24, 12, 'o');       // first stone -> high stone
pass.set(28, 12, 'o').set(29, 13, 'o').set(30, 12, 'o');       // high stone -> third stone
pass.arc(33, 10, 36, 2, 1);                                    // third stone -> island
pass.set(41, 13, 'o').set(42, 14, 'o').set(43, 15, 'o').set(44, 15, 'o');  // the bounce up to the pier
pass.bananas(48, 14, 4, 2);                                    // along the deck
pass.arc(59, 14, 67, 5, 3);                                    // over the roll-jump gap
pass.bananas(71, 14, 2, 2);
pass.bananas(60, 9, 2, 3);                                     // lures the curious down the ladder
pass.bananas(70, 8, 3, 2);                                     // the heart chamber stash

// --- enemies
pass.set(14, 9, 'm').set(52, 13, 'm').set(55, 13, 'm').set(69, 13, 'u');
pass.portal('1', 'c_deep', '2').portal('2', 'q_forge', '1');

export const rooms = [pass.build()];
