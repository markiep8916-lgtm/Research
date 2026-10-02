// GIRDER TOWER: the final area. Kong holds all four abilities. Steel girders, ladders, rolling barrels.
import { RoomBuilder } from '../builder.js';

// ------------------------------------------------------------------------------------------------ helpers
// A solid girder whose walkable top is at y = `stand` (the steel itself occupies row stand-1).
const girder = (b, x0, x1, stand) => b.rect(x0, stand - 1, x1 - x0 + 1, 1, '#');
// Ladder shaft cut into the floor for a bottom portal: portal at row 0, ladder up to a top-tile at row `top`.
const bottomShaft = (b, x, top, ch) => { b.rect(x, 0, 1, top + 1, '.'); b.set(x, 0, ch); b.ladder(x, 1, top); };
// Ladder column that runs from a floor up into a top portal.
const topShaft = (b, x, from, ch) => { b.vline(x, from, b.h - 2, 'H'); b.set(x, b.h - 1, ch); };
// Steel legs framing the tower on both sides (2 thick), from row y0 up to the top of the room.
const legs = (b, y0) => { b.rect(0, y0, 2, b.h - y0, '#'); b.rect(b.w - 2, y0, 2, b.h - y0, '#'); };

// ------------------------------------------------------------------------------------------------ g_base
// "Tower Base": the arcade classic. Three sloping girders joined by ladders at alternating ends, barrels rolling
// downhill from the high end. Level 0 teaches (snapjaws, bumps), levels 1 and 2 are the barrel runs.
const base = new RoomBuilder('g_base', 52, 20, {
  name: 'Tower Base', area: 'tower', map: { x: 19, y: 11 },
  props: {
    titleCard: true,
    signs: [
      'The Tiki Tribe raised this tower\naround the shattered Golden Banana.',
      'Barrels roll downhill. Hop them,\nslap them (X) or roll through them (C).',
    ],
  },
});
base.ground(0, 51, 2);                                   // foundation, stand at y = 3
legs(base, 3);
bottomShaft(base, 10, 2, '1');                           // ladder shaft up from the Quarry
// -- level 0: the walk to the first ladder
base.set(13, 3, '?').set(16, 3, 'S');
base.set(22, 3, '#').set(31, 3, '#').set(40, 3, '#');    // knee-high rivet blocks fence in the two snapjaw yards
base.set(26, 3, 's').set(36, 3, 's');
base.set(41, 3, '?');
base.bananas(18, 4, 2).arc(20, 4, 24, 5, 2).arc(29, 4, 33, 5, 2);
// -- level 1: slopes down to the right (stand 10 -> 9 -> 8); cannon at the high left end
// the girders are steel wedges: flat underside, sloping top (stand 10 -> 9 -> 8); the low end stops short so barrels tumble off onto level 0
base.rect(2, 7, 12, 3, '#').rect(14, 7, 14, 2, '#').rect(28, 7, 19, 1, '#');
base.ladder(43, 3, 7);                                   // from level 0 up to level 1's low end
base.set(3, 10, 'N');
base.bananas(7, 11, 3).bananas(17, 10, 3).bananas(31, 9, 3).arc(40, 9, 46, 5, 2);
// -- level 2: slopes down to the left (stand 15 -> 16); cannon at the high right end
base.rect(2, 14, 18, 1, '#').rect(20, 14, 30, 2, '#');   // stand 15 -> 16
base.ladder(12, 10, 14);                                 // from level 1's high end up to level 2's low end
base.set(49, 16, 'n');
base.bananas(5, 16, 3).arc(17, 16, 23, 5, 2).bananas(30, 17, 3);
base.vline(34, 13, 14, 'H').set(34, 15, 'T');           // a broken ladder hangs from level 2: only useful for climbing down
topShaft(base, 40, 16, '2');                             // exit ladder up to the top portal
base.portal('1', 'q_lift', '2').portal('2', 'g_one', '1');


// ------------------------------------------------------------------------------------------------ g_one
// "Rivet Rise": a pier of riveted steel stands in the middle of level B. The high road climbs over it (ladder, a
// thornbug yard on the catwalk); the low road is a crate-sealed roll tunnel straight through it, which skips the
// thornbugs and offers an express ladder through a barrel lane. Knee-high rivet blocks fence every patrolling enemy
// and every barrel lane, so each hazard has a safe side. Level D's save barrel catches every route.
const one = new RoomBuilder('g_one', 52, 24, {
  name: 'Rivet Rise', area: 'tower', map: { x: 19, y: 9 },
  props: {
    titleCard: true,
    signs: [
      'Thornbugs wear spikes on their backs.\nDo not stomp them. Roll through them (C).',
      'The low road is fast but narrow.\nSomething sealed with crates, maybe?',
      'The Overlord waits at the very top,\nfeeding on the Banana\'s power.',
      'Fire wisps shrug off slaps and rolls.\nOnly the Banana Boomerang (V) hurts them.',
    ],
  },
});
one.ground(0, 51, 2);                                     // foundation
legs(one, 3);
bottomShaft(one, 40, 2, '1');
// -- level A: the thornbug yard between two rivet blocks
one.set(34, 3, '#').set(23, 3, '#').set(28, 3, 't');
one.set(36, 3, '?');
one.bananas(37, 4, 3).arc(26, 5, 32, 5, 2).bananas(11, 4, 2);
// -- level B: one long girder with a gap, and the pier
girder(one, 2, 49, 8);
one.clear(12, 7, 3, 1);                                   // 3-wide gap (falls back to level A, harmless)
one.ladder(6, 3, 7);                                      // A -> B
one.arc(10, 9, 16, 5, 2.2);
one.set(9, 8, 'S').set(17, 8, '?');                       // a checkpoint at the top of the first ladder
one.rect(22, 8, 6, 4, '#');                               // the pier, rows 8..11
one.clear(22, 8, 6, 1);                                   // 1-tile-high roll tunnel ...
one.set(22, 8, 'R').set(23, 8, 'R');                      // ... sealed by two crates
one.bananas(24, 8, 4);                                    // ... with bananas visible through the slot
girder(one, 19, 30, 12);                                  // catwalk over the pier (the high road)
one.ladder(19, 8, 11).ladder(30, 8, 11);
one.set(21, 12, '#').set(28, 12, '#');                    // rivet blocks fence the catwalk thornbug yard
one.set(25, 12, 't');
one.arc(22, 13, 27, 3, 1.5);
one.set(31, 8, '#');                                      // rivet block: barrels from the cannon die here, the pier side stays safe
one.set(49, 8, 'n');
one.bananas(36, 9, 4);
// -- level C (right wing only): reached from the catwalk by a hop
girder(one, 32, 39, 13);
one.arc(29, 13, 33, 3, 1.5);
one.bananas(36, 14, 2);
// -- the express ladder: from the barrel lane on level B, through level C, up to level D
one.ladder(34, 8, 17);
one.set(34, 12, 'T');
// -- level D: the last lane. The save barrel sits at the top of the ladder, then a gap, then a rivet block that
//    fences a short barrel lane in front of the exit ladder.
girder(one, 2, 17, 18); girder(one, 22, 49, 18);
one.set(34, 17, 'T');
one.set(33, 18, 'S').set(30, 18, '?').set(37, 18, '?');
one.arc(17, 19, 22, 5, 2.5);
one.set(14, 18, '#');                                     // rivet block: barrels die here, the landing strip behind it is safe
one.set(3, 18, 'N');
topShaft(one, 10, 18, '2');
// secret: a spring in the dead-end of level D bounces up to a banana ledge
one.set(45, 17, 'Y');
one.plat(43, 21, 5);
one.bananas(43, 22, 4);
one.set(46, 20, 'f');                                       // a wisp guards the ledge (boomerang it)
one.portal('1', 'g_base', '2').portal('2', 'g_two', '1');

export const rooms = [base.build(), one.build()];
