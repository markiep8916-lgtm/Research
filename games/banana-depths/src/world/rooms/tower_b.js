// TOWER, part B: g_two (The Abyss Span) and g_three (The Gauntlet).
// All four abilities are held here. Portals 1/2 are vertical ladder shafts (see docs/WORLD_SPEC.md section 4).
import { RoomBuilder } from '../builder.js';

const builders = [];

// ================================================================================================ g_two
// The Abyss Span. A zig-zag over a bottomless drop: crumbling girders (teach over a safe catch floor, then for real),
// a spring leap, a wall-jump shaft (Grip) up the right side, then back left over more crumbling girders to a sealed
// gate whose switch can only be hit with the boomerang (Boomerang). The gate guards the ladder to g_three.
const two = new RoomBuilder('g_two', 52, 28, {
  name: 'The Abyss Span', area: 'tower', map: { x: 19, y: 7 },
  props: {
    titleCard: true,
    signs: [
      'Crumbling girders drop half a second\nafter you step on them.\nKeep moving, Kong!',
      'A solid rest stop. Run onto the tire\nand hold Jump to leap the gap.',
      'WALL-JUMP: slide down a wall, hold\ntoward it and press Jump to kick off.',
      'Wisps burn! Only the boomerang (V)\ncan hurt them.',
      'The gate is sealed. Its switch glows\nnearby: throw the boomerang (V) at it!',
    ],
  },
});
builders.push(two);

// ---- start pylon (bottom-left): the elevator shaft up from g_one ends here
two.rect(0, 0, 10, 7, '#');                                   // x0..9, y0..6 (stand y=7)
two.set(4, 0, '1').vline(4, 1, 5, 'H').set(4, 6, 'T');       // portal 1 (bottom) + ladder up to the pylon top
two.set(7, 7, '?');
two.bananas(5, 9, 4, 1, 0);

// ---- teaching run: crumbling girders over a safe catch floor
two.rect(10, 0, 12, 3, '#');                                  // catch floor (stand y=3)
two.ladder(10, 3, 6);                                         // climb back up if you fall (T at y=6 -> stand 7)
two.hline(11, 14, 6, 'F');                                    // run A (stand 7)
two.hline(17, 20, 7, 'F');                                    // run B (stand 8)
two.set(20, 2, 'Y');                                          // spring on the catch floor: bounce back up to run B
two.arc(14, 8, 17, 4, 1.5).arc(20, 9, 23, 4, 1.5);

// ---- rest island with the save barrel and the leap tire
two.block(23, 8, 5, 2);                                       // x23..27, rows 7..8 (stand y=9)
two.set(24, 9, 'S').set(25, 9, '?').set(27, 8, 'Y');
two.arc(27, 11, 34, 8, 5);                                    // the leap

// ---- shaft floor + wall-jump shaft (interior x44..47)
two.block(34, 8, 14, 2);                                      // x34..47, rows 7..8 (stand y=9)
two.rect(48, 0, 4, 25, '#');                                  // right wall x48..51
two.rect(42, 11, 2, 10, '#');                                 // left wall x42..43, rows 11..20 (2-tall doorway under it)
two.set(40, 9, '?');
two.bananas(44, 12, 1).bananas(47, 14, 1).bananas(44, 16, 1).bananas(47, 18, 1).bananas(44, 20, 1);

// ---- upper traverse (right to left): shelf, crumbling runs, anchor island with tiki + switch, door
two.block(34, 20, 8, 1);                                      // shelf x34..41 (stand 21)
two.set(37, 21, '?').set(36, 21, 't');
two.hline(29, 32, 20, 'F');                                   // run D (stand 21)
two.hline(24, 27, 21, 'F');                                   // run E (stand 22)
two.block(18, 22, 6, 2);                                      // island 2 x18..23 rows 21..22 (stand 23)
two.set(19, 23, 'u').set(22, 23, 'w').set(21, 23, '?');
two.hline(13, 16, 22, 'F');                                   // run F (stand 23)
two.arc(33, 22, 29, 4, 1.5).arc(28, 23, 24, 4, 1.5).arc(17, 24, 13, 5, 1.5);

// ---- the sealed door and the final ladder up to portal 2
two.rect(0, 21, 13, 2, '#');                                  // apron x0..12 rows 21..22 (stand 23)
two.rect(0, 14, 9, 7, '#');                                   // stepped pylon underneath
two.rect(2, 23, 2, 5, '#');                                   // shaft left wall x2..3
two.rect(7, 25, 2, 3, '#');                                   // shaft right wall above the door x7..8, rows 25..27
two.rect(7, 23, 2, 2, 'D');                                   // the door (gate A) x7..8, rows 23..24
two.vline(5, 23, 26, 'H').set(5, 27, '2');                   // ladder to the top portal
two.bananas(9, 24, 3);

// ---- enemies
two.set(30, 25, 'f').set(24, 25, 'f');

two.portal('1', 'g_one', '2').portal('2', 'g_three', '1');

// ================================================================================================ g_three
// The Gauntlet. Cannon alley along the bottom girder, a ladder up, back left along a second girder (cannon + wisp +
// thornbug), then a spiked wall-jump shaft (Grip) up the left side into the sealed Switch Hall: two gates, two switches
// across spike strips (Boomerang), a cracked deck (Pound) that drops you back down, the save barrel and the ladder to g_top.
const three = new RoomBuilder('g_three', 52, 28, {
  name: 'The Gauntlet', area: 'tower', map: { x: 19, y: 5 },
  props: {
    titleCard: true,
    signs: [
      'Barrels ahead! Jump them, slap them (X),\nor roll straight through them.',
      'Spikes line this shaft. Kick between\nthe clean wall faces: mind the teeth!',
      'Sealed gates! Throw the boomerang (V)\nat the glowing switches to open them.',
      'Cracked deck. Ground-pound it (Down + X\nin the air) to ride a shortcut back down.',
      'The Tiki Overlord waits at the top.\nRest at the barrel first, Kong.',
    ],
  },
});
builders.push(three);

// ---- start pylon (bottom-left) and cannon alley
three.rect(0, 0, 12, 7, '#');                                 // x0..11, rows 0..6 (stand y=7)
three.set(5, 0, '1').vline(5, 1, 5, 'H').set(5, 6, 'T');     // portal 1 (bottom) + ladder up to the pylon top
three.set(8, 7, '?');
three.bananas(9, 8, 3);
three.block(12, 6, 36, 1);                                    // girder 1: x12..47 (stand y=7)
three.clear(28, 6, 3, 1);                                     // a 3-wide pit
three.set(44, 7, 'n').set(21, 7, 's');
three.bananas(14, 8, 4).arc(27, 8, 31, 5, 2.2).bananas(34, 8, 4);

// ---- second girder (one-way, back to the left) + the ladder between the two
three.plat(10, 10, 37);                                       // girder 2: x10..46 (stand y=11)
three.clear(33, 10, 3, 1);                                    // another 3-wide gap
three.ladder(47, 7, 10);                                      // H rows 7..9, T at row 10 (stand 11)
three.set(15, 11, 'N').set(24, 11, 't').set(28, 16, 'f');
three.bananas(44, 12, 3, -1, 0).arc(32, 12, 36, 5, 2.2).bananas(26, 12, 3, -1, 0);

// ---- the spiked wall-jump shaft (interior x4..7)
three.rect(4, 10, 6, 1, '#');                                 // shaft floor x4..9 (stand y=11)
three.rect(0, 7, 4, 21, '#');                                 // left wall x0..3, rows 7..27
three.rect(8, 13, 2, 10, '#');                                // right wall x8..9, rows 13..22 (2-tall doorway under it)
three.set(4, 11, '^').set(5, 11, '^').vline(4, 12, 13, '^');  // spiky bottom-left corner
three.set(11, 11, '?');

// ---- the Switch Hall (stand y=23): sealed deck, two gates, two switches, the barrel and the way out
three.rect(8, 21, 44, 2, '#');                                // deck x8..51, rows 21..22
three.hline(12, 15, 23, '^').set(17, 23, 'w').rect(18, 23, 2, 5, 'D');
three.set(11, 23, '?');
three.hline(23, 26, 23, '^').set(28, 23, 'x').rect(29, 23, 2, 5, 'E');
three.set(25, 26, 'f');
three.set(33, 23, 'S').set(35, 23, '?');
three.rect(37, 21, 4, 2, 'G');                                // cracked deck: the shortcut back down
three.set(43, 23, '?');
three.vline(45, 23, 26, 'H').set(45, 27, '2');
three.bananas(13, 25, 3).bananas(24, 25, 3).bananas(37, 25, 4).bananas(46, 25, 3);

three.portal('1', 'g_two', '2').portal('2', 'g_top', '1');

export const rooms = [...builders.map((b) => b.build())];
