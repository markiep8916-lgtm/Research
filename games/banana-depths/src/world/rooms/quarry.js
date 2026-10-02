// SMOLDERING QUARRY (q_pass): lava, crumbling blocks and old machinery. Kong enters with ROLL, POUND and GRIP.
import { RoomBuilder } from '../builder.js';

// ------------------------------------------------------------------------------------------------ q_pass
// The Slag River. Kong drops in from the caverns onto a lookout ledge, climbs down rock terraces to a lava river, hops a field
// of crumbling blocks to a tire island, and bounces up onto the Girder Bridge: a long stone deck over the river. The bridge ends
// in a 7-wide roll-jump gap guarded by a tiki sniper. Under the bridge hides the secret: a crystal across a lava hall (needs the
// boomerang) that opens a gate to a heart chamber in the cliff.
const pass = new RoomBuilder('q_pass', 78, 24, {
  name: 'Slag River Pass', area: 'quarry', map: { x: 13, y: 13 },
  props: {
    titleCard: true,
    signs: [
      'The Tiki Tribe shattered the Golden Banana\nand left its fire burning down here.\nMind the lava, Kong.',
      'Scorched stone crumbles underfoot.\nHop on, hop off, and keep moving!',
      'Too far to jump? Curl into a roll (C),\nthen jump out of the roll for a huge leap.',
      'A crystal glimmers across the lava...\nIt would take something thrown\nfrom afar to wake it.',
    ],
  },
});
pass.border('#');
// --- left cliff: lookout ledge (Kong falls in from the caverns above) and stepped terraces down to the river bank
pass.ground(1, 9, 14);                                     // lookout ledge, stand 15
pass.ground(10, 11, 12).ground(12, 13, 10).ground(14, 15, 8);  // terraces, stand 13 / 11 / 9
pass.ground(16, 21, 7);                                    // river bank, stand 8
pass.vline(3, 15, 22, 'H');                                // ladder up to the top portal (so Kong can go back to the caverns)
pass.set(3, 23, '1');
pass.set(5, 15, '?').set(7, 15, 'S');
// --- the lava river
pass.rect(22, 1, 55, 5, 'L');
// crumbling stepping stones
pass.rect(25, 7, 2, 1, 'F').rect(29, 8, 2, 1, 'F');
pass.set(22, 8, '?');
// --- tire island with a save barrel
pass.ground(33, 40, 7);
pass.set(35, 8, 'S').set(37, 7, 'Y');
// --- Girder Bridge: stone pier, deck over the river, ladder at the end
pass.rect(41, 0, 4, 13, '#');                              // pier (top = stand 13)
pass.rect(45, 10, 13, 3, '#');                             // deck (x 45..57), 3 thick: the undercroft below is only 2 tiles high
pass.ladder(58, 8, 12);                                    // ladder from the undercroft ledge up to the end of the bridge
pass.set(57, 13, '?');
// --- undercroft: crystal ledge (left) and shelf (right), under the deck so the lava gap between them cannot be jumped
pass.rect(45, 0, 3, 8, '#');                               // crystal ledge (stand 8)
pass.rect(55, 0, 11, 8, '#');                              // shelf (stand 8)
pass.set(47, 8, 'w').set(45, 8, 'U');
// --- right plateau with the exit; heart chamber behind gate D in its face
pass.rect(66, 0, 11, 13, '#');                             // plateau (stand 13)
pass.rect(77, 13, 1, 3, '2');
pass.clear(67, 8, 8, 3).rect(66, 8, 1, 3, 'D');
pass.set(70, 8, 'h');
pass.set(62, 8, '?');
// --- enemies
pass.set(18, 8, 'm').set(49, 13, 'm').set(53, 13, 'm').set(69, 13, 'u');
pass.portal('1', 'c_deep', '2').portal('2', 'q_forge', '1');


export const rooms = [pass.build()];
