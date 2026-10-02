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

// ------------------------------------------------------------------------------------------------ c_drop
// The Crystal Descent: a tall chimney of six rock tiers. Kong falls in from the temple onto the arrival ledge, drops tier
// by tier (bats, a snapjaw, a spike patch, a slab shortcut) and leaves by the right wall. Every tier is linked to the one
// above by a ladder that passes through a slot in its floor, so the whole chain climbs back to the top portal.
const drop = new RoomBuilder('c_drop', 26, 45, {
  name: 'Crystal Descent', area: 'cavern', map: { x: 10, y: 6 },
  props: {
    signs: [
      'The Crystal Caves.\nLadders lead back up to the temple.',
      'Cracked slabs: GROUND POUND\n(Down + X in the air) to smash through.',
      'The Spider Queen spun her lair\nbeyond the Glowworm Gallery.',
    ],
  },
});
drop.border('#');
// side walls two tiles thick (no 1-wide slots to fall into), ragged bulges and ceiling stubs
drop.rect(0, 0, 2, 45).rect(24, 0, 2, 45);
drop.rect(2, 39, 2, 5).rect(22, 39, 2, 5).rect(7, 41, 2, 3).rect(18, 42, 2, 2).rect(5, 43, 1, 1);
drop.rect(2, 30, 2, 4).rect(2, 18, 2, 3).rect(21, 24, 3, 3);
// tiers: [x0..x1, rows top-1..top] + a stepped underside
drop.rect(8, 36, 11, 2).rect(10, 35, 7, 1);            // A  arrival ledge, stand 38
drop.rect(9, 30, 15, 2).rect(11, 29, 12, 1);           // B  stand 32
drop.rect(2, 24, 11, 2).rect(2, 23, 8, 1);             // C  stand 26
drop.rect(12, 18, 12, 2).rect(14, 17, 10, 1);          // D  stand 20
drop.rect(16, 18, 4, 2, 'G').clear(16, 17, 4, 1);      //    slab patch (pound shortcut straight down to F)
drop.rect(2, 12, 12, 2).rect(2, 11, 9, 1).rect(2, 10, 5, 1);   // E  stand 14
drop.rect(12, 0, 13, 9);                               // F  stand 9 (exit tier)
drop.rect(2, 0, 10, 3).set(3, 2, 'Y');                 // pocket under E: shallow retry nook with a spring
// exit portal on the right wall, on top of F
drop.rect(25, 9, 1, 3, '2').clear(24, 9, 1, 3);
// hazards and enemies
drop.set(8, 14, '^').set(9, 14, '^');
drop.set(10, 34, 'a').set(20, 28, 'a').set(4, 22, 'a').set(12, 32, 's');
// savers, signs
drop.set(9, 38, 'S').set(11, 38, '?');
drop.set(14, 20, '?');
drop.set(21, 9, '?').set(19, 9, 'S');
// bananas (before the ladders, which may overwrite a banana but never the other way round)
nanas(drop, 14, 38, 3);
nanas(drop, 19, 37, 4, 1, -1);
nanas(drop, 14, 32, 3);
nanas(drop, 8, 31, 3, -1, -1);
nanas(drop, 4, 26, 3);
nanas(drop, 14, 24, 3, 1, -1);
nanas(drop, 16, 21, 4);
nanas(drop, 10, 19, 3, -1, -1);
nanas(drop, 3, 14, 2);
narc(drop, 6, 15, 11, 4, 2.2);
nanas(drop, 15, 13, 3, 1, -1);
nanas(drop, 15, 9, 3);
nanas(drop, 5, 3, 5);
// climbing route (ladders through floor slots) and the portal ladder that runs up into the top border
drop.ladder(14, 9, 13);      // F -> E
drop.ladder(11, 14, 19);     // E -> D
drop.ladder(13, 20, 25);     // D -> C
drop.ladder(10, 26, 31);     // C -> B  (through the slot in B)
drop.ladder(17, 32, 37);     // B -> A  (through the slot in A)
drop.ladder(11, 3, 8);       // nook -> F
drop.vline(13, 38, 43, 'H'); // A -> top portal
drop.set(13, 44, '1');
drop.portal('1', 't_hall', '4').portal('2', 'c_gallery', '1');

// ------------------------------------------------------------------------------------------------ c_gallery
// The Glowworm Gallery: a long hall with a lava river. Crumbling planks over lava, a 7-wide roll-jump gap (with stepping
// stones as the safe alternative), a spring up to the high gallery, and a dark side tunnel closed by a crate wall.
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
gal.rect(1, 6, 2, 10).rect(74, 14, 3, 6);              // wall bulges (the portal rows stay clear)
// entry + the crumbling-plank dip (a harmless place to learn planks)
gal.rect(12, 2, 5, 1, 'F');
// island 1 -> pit 2 (lava) crossed on two crumbling stones
gal.rect(25, 0, 10, 3, 'L');
gal.rect(26, 3, 2, 1, 'F').rect(31, 4, 2, 1, 'F');
// P2 (stand 6), the long gap (lava, 7 wide) with three stepping stones, P3 (stand 6)
gal.rect(35, 3, 7, 3);
gal.rect(42, 0, 7, 3, 'L');
gal.set(43, 3, 'F').set(45, 3, 'F').set(47, 3, 'F');
gal.rect(49, 3, 12, 3);
// the high gallery H (stand 11) with the secret tunnel under it
gal.rect(61, 3, 16, 8);
gal.clear(61, 6, 6, 2);                                 // side tunnel (2 high, walkable) off the foot of the rock face
gal.rect(67, 6, 2, 2, 'R');                             // crate wall
gal.clear(69, 6, 3, 3).set(70, 6, 'h');                 // heart chamber
gal.set(57, 5, 'Y');                                    // spring up to H
gal.rect(64, 9, 5, 2, 'L');                             // lava pool on top of the rock
gal.set(65, 11, 'F').set(67, 11, 'F');
// ceiling stubs for the bats
gal.rect(11, 12, 3, 8).rect(36, 13, 3, 7);
gal.rect(54, 16, 2, 4).rect(28, 17, 2, 3).rect(72, 17, 3, 3).rect(46, 18, 3, 2);
// exits
gal.rect(0, 3, 1, 3, '1').rect(77, 11, 1, 3, '2');
// enemies, saves, signs
gal.set(12, 11, 'a').set(37, 12, 'a');
gal.set(23, 3, 's').set(55, 6, 's');
gal.set(6, 3, '?').set(36, 6, '?').set(52, 6, '?');
gal.set(51, 6, 'S');
// secret heart
// bananas
nanas(gal, 3, 3, 2);
nanas(gal, 8, 3, 3);
narc(gal, 11, 4, 17, 5, 2.2);
nanas(gal, 19, 3, 3);
narc(gal, 23, 4, 27, 3, 1.5);
nanas(gal, 26, 4, 2);
nanas(gal, 31, 5, 2);
nanas(gal, 37, 6, 4);
narc(gal, 41, 8, 49, 7, 3);
nanas(gal, 43, 4, 1).set(45, 4, 'o').set(47, 4, 'o');
nanas(gal, 53, 6, 3);
nanas(gal, 58, 8, 2, 1, 1);
nanas(gal, 62, 6, 4);
nanas(gal, 69, 6, 1);
nanas(gal, 62, 11, 2);
nanas(gal, 65, 12, 1); nanas(gal, 67, 12, 1);
nanas(gal, 70, 11, 4);
gal.portal('1', 'c_drop', '2').portal('2', 'c_web', '1');

// ------------------------------------------------------------------------------------------------ c_web
// The Web Lair: four spiders on their threads. A terrace of entry, a staircase, a floor to run (or roll) along, and a
// spiked pit crossed on two pillars that each have a spider hanging over them. Barrel before the right exit.
const web = new RoomBuilder('c_web', 39, 22, {
  name: 'The Web Lair', area: 'cavern', map: { x: 14, y: 7 },
  props: {
    signs: [
      'Spiders drop on anyone below.\nSlap (X) or ROLL through them!',
      'Rest at the barrel.\nThe Spider Queen waits beyond.',
    ],
  },
});
web.border('#');
web.rect(1, 17, 37, 4);                                 // ceiling mass (interior ceiling at y = 17)
web.rect(1, 0, 7, 9);                                   // entry terrace, stand 9
web.ground(8, 37, 2);                                   // lair floor, stand 3
web.plat(9, 6, 3).plat(13, 4, 3);                       // staircase down from the terrace
web.clear(26, 1, 8, 2);                                 // spiked pit (floor row 0 stays)
web.rect(26, 1, 2, 3).rect(30, 1, 2, 3);                // two pillars, stand 4
web.set(28, 1, '^').set(29, 1, '^').set(32, 1, '^').set(33, 1, '^');
// spider anchors (ceiling stubs) and spiders
web.rect(17, 11, 2, 6).rect(22, 11, 2, 6).rect(26, 9, 2, 8).rect(30, 9, 2, 8);
web.set(17, 10, 'p').set(22, 10, 'p').set(26, 8, 'p').set(30, 8, 'p');
web.rect(0, 9, 1, 3, '1').rect(38, 3, 1, 3, '2');
web.set(3, 9, '?').set(35, 3, '?').set(34, 3, 'S');
nanas(web, 3, 10, 0);
nanas(web, 9, 7, 3);
nanas(web, 13, 5, 3);
nanas(web, 16, 3, 3);
nanas(web, 19, 3, 2);
nanas(web, 24, 3, 2);
narc(web, 25, 5, 28, 3, 1.5);
nanas(web, 26, 4, 2);
nanas(web, 30, 4, 2);
narc(web, 28, 5, 32, 3, 1.5);
nanas(web, 36, 3, 1);
web.ladder(8, 3, 8);                                    // climb back to the terrace
web.portal('1', 'c_gallery', '2').portal('2', 'c_queen', '1');

export const rooms = [drop, gal, web].map((b) => b.build());
