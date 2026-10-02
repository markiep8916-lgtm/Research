// CRYSTAL CAVERNS, part B: c_drop, c_gallery, c_web. Abilities held on entry: Roll + Ground Pound.
import { RoomBuilder } from '../builder.js';

// ---- small local helpers -------------------------------------------------------------------------------------------
/** Bananas along a line, but only on free tiles (never carves terrain, never stacks on another marker). */
function nanas(b, x, y, n, dx = 1, dy = 0) {
  for (let i = 0; i < n; i++) {
    const px = x + i * dx, py = y + i * dy;
    if (b.get(px, py) === 0 && !b.marks.some((m) => m.x === px && m.y === py)) b.set(px, py, 'o');
  }
  return b;
}
/** Jump-shaped banana arc (same maths as RoomBuilder.arc) that never overwrites terrain. */
function narc(b, x0, y0, x1, n, rise = 2) {
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    const px = Math.round(x0 + (x1 - x0) * u), py = Math.round(y0 + Math.sin(u * Math.PI) * rise);
    if (b.get(px, py) === 0 && !b.marks.some((m) => m.x === px && m.y === py)) b.set(px, py, 'o');
  }
  return b;
}
/** Hanging rock cone: first row at yTop (just under the ceiling), narrowing to a 1-wide tip after `len` rows. w must be odd. */
function stalactite(b, cx, yTop, w, len) {
  for (let i = 0; i < len; i++) {
    const ww = Math.max(1, w - 2 * Math.floor((i * ((w - 1) / 2 + 1)) / len));
    b.rect(cx - (ww - 1) / 2, yTop - i, ww, 1);
  }
  return b;
}
/** Rock cone rising from yBase. w must be odd. */
function stalagmite(b, cx, yBase, w, len) {
  for (let i = 0; i < len; i++) {
    const ww = Math.max(1, w - 2 * Math.floor((i * ((w - 1) / 2 + 1)) / len));
    b.rect(cx - (ww - 1) / 2, yBase + i, ww, 1);
  }
  return b;
}

// ------------------------------------------------------------------------------------------------ c_drop
// The Crystal Descent. Kong falls in from the temple onto the arrival ledge, drops down three tiers of rock, then meets
// the CRYSTAL CRUST: a solid floor across the whole chimney with one patch of cracked slabs. Ground Pound through it and
// plunge eleven tiles into the lower cavern (the exit is on its right wall). The way back up is a chain of ladders (one
// passes through a slot in the crust) and a vine, ending in a ladder that runs into the top border.
const drop = new RoomBuilder('c_drop', 26, 45, {
  name: 'Crystal Descent', area: 'cavern', map: { x: 10, y: 6 },
  props: {
    signs: [
      'The Crystal Caves.\nLadders lead back up to the temple.',
      'A crystal crust seals the way down.\nGROUND POUND the cracked slabs\n(Down + X in the air).',
      'The Spider Queen spun her lair\nbeyond the Glowworm Gallery.',
    ],
  },
});
drop.fromAscii([
  //0         1         2
  //01234567890123456789012345
  '#############1############', // 44
  '######.......H......######', // 43
  '#####........H.......#####', // 42
  '####...##....H........####', // 41
  '####.........H........####', // 40
  '###..........H.........###', // 39
  '##......S.?..H..........##', // 38  arrival ledge A (x 7..19), save barrel, sign
  '##.....##########T##....##', // 37
  '##.....##########H##....##', // 36
  '##.......########H......##', // 35
  '##...............H......##', // 34
  '####.............H......##', // 33
  '####.............H......##', // 32  tier B (right), ladder up to A at x=17
  '####........V#############', // 31
  '####........V#############', // 30
  '##..........V..###########', // 29
  '##..........V.....########', // 28
  '##.....##...V.........a.##', // 27
  '##..s..##...V...........##', // 26  tier C (left): snapjaw pen, vine up to B
  '#############T..........##', // 25
  '#############H..........##', // 24
  '##########...H..........##', // 23
  '##.a.........H..........##', // 22
  '##...........H..........##', // 21
  '##...........H?.........##', // 20  tier D = the crust (stand 20): ladder down-left slot at x=11, slabs x 15..20
  '###########T###GGGGGG#####', // 19
  '###########H###GGGGGG#####', // 18
  '##.a.......H.........#####', // 17
  '##.........H............##', // 16
  '##.........H............##', // 15
  '##......^^.H............##', // 14  tier E (left): spikes + stash, ladder x=11 up through the crust
  '##############T.........##', // 13
  '##############H.........##', // 12
  '###########...H..........2', // 11
  '#######.......H..........2', // 10
  '##............H....S.?...2', // 9   tier F (stand 9): landing, save barrel, sign, exit portal 2
  '##.........T##############', // 8
  '##.........H##############', // 7
  '##.........H##############', // 6
  '##.........H##############', // 5
  '##.........H##############', // 4
  '##.........H##############', // 3   retry nook under E (ladder out at x=11, spring at x=3)
  '###Y######################', // 2
  '##########################', // 1
  '##########################', // 0
]);
// bananas: breadcrumbs down the tiers, over the slab patch, down the fall line, stashes at the optional spots
nanas(drop, 14, 38, 3);
nanas(drop, 20, 37, 2, 1, -1);
nanas(drop, 15, 32, 2);
nanas(drop, 11, 32, 2, -1, -2);
nanas(drop, 2, 26, 2); nanas(drop, 5, 26, 2);
nanas(drop, 14, 24, 2, 1, -1);
nanas(drop, 15, 21, 4);
nanas(drop, 17, 16, 3, 0, -2);
nanas(drop, 3, 14, 3);
narc(drop, 7, 15, 10, 4, 2);
nanas(drop, 15, 13, 2, 1, -1);
nanas(drop, 15, 9, 3);
nanas(drop, 4, 3, 4);
drop.portal('1', 't_hall', '4').portal('2', 'c_gallery', '1');

// ------------------------------------------------------------------------------------------------ c_gallery
// The Glowworm Gallery: a long hall that steps up from the entry cave to a high gallery. Crumbling planks over a harmless
// dip, then over lava; a 7-wide roll-jump gap with stepping stones as the safe alternative; a spring up to the high
// gallery; and, at the foot of the rock face under it, a dark tunnel closed by a crate wall with a heart behind.
const gal = new RoomBuilder('c_gallery', 78, 24, {
  name: 'Glowworm Gallery', area: 'cavern', map: { x: 11, y: 7 },
  props: {
    signs: [
      'Crystal planks crumble underfoot.\nKeep moving: they grow back.',
      'Wide gap: ROLL (C / Shift), then\nJUMP mid-roll to fly across.\nOr hop the stones.',
      'Springs bounce you high.\nHold Jump to bounce higher.',
    ],
  },
});
gal.border('#');
gal.rect(1, 20, 76, 3);                                 // ceiling mass (interior ceiling at y = 20)
gal.ground(1, 76, 2);                                   // base floor (stand 3)
// the entry cave: a low vault that steps up into the hall
gal.rect(0, 6, 3, 14).rect(3, 11, 7, 9).rect(10, 13, 3, 7).rect(13, 16, 3, 4);
gal.rect(74, 14, 3, 6);                                 // right wall bulge (portal rows stay clear)
// stalactites; two of them hold a bat
for (const [cx, w, len] of [[21, 5, 8], [29, 3, 5], [37, 5, 7], [46, 3, 5], [53, 5, 6], [70, 5, 4]]) stalactite(gal, cx, 19, w, len);
// a shallow dip crossed on crumbling planks (falling in is harmless)
gal.rect(12, 2, 5, 1, 'F');
// pit 2: lava crossed on two crumbling stones
gal.rect(25, 0, 10, 3, 'L');
gal.rect(26, 3, 2, 1, 'F').rect(31, 4, 2, 1, 'F');
// P2 (stand 6): the runway; the long gap (lava, 7 wide) with three stepping stones; P3 (stand 6): save island
gal.rect(35, 3, 7, 3);
gal.rect(42, 0, 7, 3, 'L');
gal.set(43, 3, 'F').set(45, 3, 'F').set(47, 3, 'F');
gal.rect(49, 3, 12, 3);
gal.set(57, 5, 'Y');                                    // spring up to the high gallery
// the high gallery H (stand 11) and the secret tunnel at the foot of its face
gal.rect(61, 3, 16, 8);
gal.clear(61, 6, 6, 2);                                 // side tunnel, 2 high (walkable), 6 long
gal.rect(67, 6, 2, 2, 'R');                             // crate wall
gal.clear(69, 6, 3, 3).set(70, 6, 'h');                 // heart chamber
gal.rect(64, 9, 5, 2, 'L');                             // lava pool on top of the rock
gal.set(65, 11, 'F').set(67, 11, 'F');
// exits
gal.rect(0, 3, 1, 3, '1').rect(77, 11, 1, 3, '2');
// enemies, save barrel, signs (signs are numbered in the order they are placed)
gal.set(11, 12, 'a').set(37, 12, 'a');
gal.set(23, 3, 's').set(55, 6, 's');
gal.set(4, 3, '?').set(36, 6, '?').set(52, 6, '?');
gal.set(50, 6, 'S');
// bananas
nanas(gal, 6, 3, 2);
narc(gal, 11, 4, 17, 4, 2);
nanas(gal, 26, 4, 2); nanas(gal, 31, 5, 2);
nanas(gal, 37, 6, 3);
narc(gal, 41, 7, 49, 7, 3);
nanas(gal, 43, 4, 1); nanas(gal, 45, 4, 1); nanas(gal, 47, 4, 1);
nanas(gal, 54, 6, 2);
nanas(gal, 58, 9, 3, 1, 1);
nanas(gal, 62, 6, 3);
nanas(gal, 69, 6, 1); nanas(gal, 71, 6, 1);
nanas(gal, 62, 11, 2);
nanas(gal, 65, 12, 1); nanas(gal, 67, 12, 1);
nanas(gal, 71, 11, 2);
gal.portal('1', 'c_drop', '2').portal('2', 'c_web', '1');

// ------------------------------------------------------------------------------------------------ c_web
// The Web Lair: four spiders hang from stalactite tips. A terrace, a staircase of planks, a long floor with two spider
// gates, and a stepped mound with the last gate on top. The barrel stands just before the right exit.
const web = new RoomBuilder('c_web', 39, 22, {
  name: 'The Web Lair', area: 'cavern', map: { x: 14, y: 7 },
  props: {
    signs: [
      'Spiders drop on anyone below.\nSlap (X) when they come down,\nor ROLL through them!',
      'Rest at the barrel.\nThe Spider Queen waits beyond.',
    ],
  },
});
web.border('#');
web.rect(1, 17, 37, 4);                                 // ceiling mass (interior ceiling at y = 17)
web.rect(1, 0, 5, 9);                                   // entry terrace, stand 9
web.ground(6, 37, 2);                                   // lair floor, stand 3
web.plat(8, 6, 3).plat(12, 4, 3);                       // plank staircase down (stand 7, stand 5)
web.rect(27, 3, 2, 2).rect(29, 3, 3, 3).rect(32, 3, 2, 2);   // the mound: stand 5, stand 6, stand 5
// stalactites: the four tips at (13,11) (19,11) (24,11) (30,11) anchor the spiders; the others are scenery
for (const [cx, w, len] of [[13, 5, 6], [19, 5, 6], [24, 5, 6], [30, 5, 6], [4, 5, 5], [35, 3, 4]]) stalactite(web, cx, 16, w, len);
web.set(13, 10, 'p').set(19, 10, 'p').set(24, 10, 'p').set(30, 10, 'p');
web.rect(0, 9, 1, 3, '1').rect(38, 3, 1, 3, '2');
web.set(4, 9, '?').set(35, 3, '?').set(34, 3, 'S');
narc(web, 5, 10, 8, 3, 1.5);
nanas(web, 8, 7, 3); nanas(web, 12, 5, 3);
nanas(web, 16, 3, 2);
nanas(web, 21, 3, 2);
nanas(web, 26, 3, 1);
nanas(web, 27, 5, 2);
nanas(web, 29, 6, 3);
nanas(web, 32, 5, 2);
nanas(web, 36, 3, 1);
web.ladder(6, 3, 8);                                    // climb back up to the terrace
web.portal('1', 'c_gallery', '2').portal('2', 'c_queen', '1');

export const rooms = [drop, gal, web].map((b) => b.build());
