// SUNKEN TEMPLE, part B: t_gate (the Temple Gate), t_pound (the Ground Pound shrine), t_vault (the secret vault).
// Abilities held on entry: Roll.  Ground Pound is learned in t_pound; t_vault is a Grip secret (reached from t_hall).
import { RoomBuilder } from '../builder.js';

// ------------------------------------------------------------------------------------------------ t_gate
// "Fang Gate": a stone gatehouse. Two ways across:
//   OVER  - stairs up the left face, a battlement with a cover pillar, a spike bed and a tiki at the far end;
//   THROUGH - a crate door (Roll), a sealed spike corridor with a tiki at the end, a second crate door.
// Stone buttress steps hug both faces so the way back from t_hall is just as readable.
const gate = new RoomBuilder('t_gate', 39, 22, {
  name: 'The Temple Gate', area: 'temple', map: { x: 7, y: 4 },
  props: {
    titleCard: true,
    signs: [
      'THE SUNKEN TEMPLE\nThe Tiki Tribe shattered the Golden Banana\nand hid its power in these halls.',
      'Two roads cross the gate:\nthe fang road is long, the crate road short.\nSlap (X) a fireball to hurl it back.',
    ],
  },
});
gate.border('#').ground(0, 38, 2);                                    // floor rows 0..2 (stand at y = 3)
gate.rect(0, 3, 1, 3, '1').rect(38, 3, 1, 3, '2');                    // portals: left (from the log), right (to the hall)

// --- left forecourt (x 1..11)
gate.set(3, 3, '?');                                                  // sign 1
gate.rect(5, 3, 2, 1, '^');                                           // teach: a 2-wide spike bed
gate.arc(4, 4, 7, 5, 2.0);
gate.set(7, 3, '#');                                                  // lip: boxes in the snapjaw pocket (x 8..11)
gate.plat(8, 4, 2);                                                   // stair A (stand 5)
gate.set(8, 5, '?');                                                  // sign 2
gate.rect(10, 5, 2, 2, '#');                                          // buttress (stand 7)
gate.set(10, 3, 's');                                                 // snapjaw 1
gate.bananas(9, 4, 3);                                                // (under stair A and the buttress)

// --- the gatehouse: crate door, sealed corridor (x 13..25), crate door, battlement roof (stand 9)
gate.rect(12, 3, 1, 4, 'R');                                          // door L (needs Roll)
gate.rect(26, 3, 1, 4, 'R');                                          // door R
gate.rect(12, 7, 15, 2, '#');                                         // roof slab, rows 7..8
gate.bananas(13, 4, 4);
gate.rect(18, 3, 3, 1, '^');                                          // corridor spike bed (3 wide)
gate.arc(17, 4, 21, 5, 2.2);
gate.set(24, 3, 'u');                                                 // tiki 2 at the end of the corridor
gate.bananas(21, 4, 3);
gate.bananas(25, 3, 1);

// --- battlement (OVER road)
gate.bananas(13, 10, 3);
gate.rect(17, 9, 1, 2, '#');                                          // cover pillar
gate.rect(20, 9, 2, 1, '^');                                          // spike bed
gate.arc(19, 10, 22, 4, 2.0);
gate.set(25, 9, 'u');                                                 // tiki 1 at the far end

// --- right side: mirrored steps down to the courtyard (x 27..37)
gate.rect(27, 5, 2, 2, '#');                                          // buttress (stand 7)
gate.plat(29, 4, 2);                                                  // stair E (stand 5)
gate.set(31, 3, '#');                                                 // lip
gate.set(28, 3, 's');                                                 // snapjaw 2 (under the stairs)
gate.bananas(29, 5, 2);
gate.set(34, 3, 'S');                                                 // save barrel
gate.bananas(32, 4, 2);

gate.portal('1', 'j_log', '2').portal('2', 't_hall', '1');

// ------------------------------------------------------------------------------------------------ t_pound
// "Shrine of the Fist": a stepped altar on the right wall. Two cracked-slab practice floors (a chamber with bananas and
// a spring below each) flank the approach; the relic sits on top of the altar.
const pound = new RoomBuilder('t_pound', 26, 20, {
  name: 'Shrine of the Fist', area: 'temple', map: { x: 14, y: 4 },
  props: {
    titleCard: true, relic: 'pound',
    signs: [
      'THE SHRINE OF THE FIST\nThe priests sealed their vaults\nwith cracked stone slabs.',
      'Cracked slabs hide secrets.\nFrom the air, press Down + X to slam\nthrough them.',
      'GROUND POUND\nJump, then press Down + X in the air.\nSlabs shatter, nearby foes are stunned.',
    ],
  },
});
pound.border('#').ground(0, 25, 4);                                   // floor rows 0..4 (stand at y = 5)
pound.rect(0, 5, 1, 3, '1');
pound.set(3, 5, '?');
// practice floor 1: slabs (2 layers) over a 2-high chamber floored with springs
pound.rect(5, 3, 4, 2, 'G').clear(5, 1, 4, 2).rect(5, 0, 4, 1, 'Y');
pound.bananas(5, 2, 4);
pound.arc(4, 6, 9, 6, 2.2);
pound.set(10, 5, '?');
// practice floor 2
pound.rect(11, 3, 4, 2, 'G').clear(11, 1, 4, 2).rect(11, 0, 4, 1, 'Y');
pound.bananas(11, 2, 4);
pound.set(12, 5, 's');
// the altar: four 2-high steps
pound.rect(15, 5, 10, 2, '#');                                        // stand 7
pound.rect(17, 7, 8, 2, '#');                                         // stand 9
pound.rect(19, 9, 6, 2, '#');                                         // stand 11
pound.rect(21, 11, 4, 2, '#');                                        // stand 13
pound.bananas(15, 8, 2).bananas(17, 10, 2).bananas(19, 12, 2);
pound.set(19, 11, '?');
pound.set(22, 13, 'Q');
pound.portal('1', 't_golem', '2');

// ------------------------------------------------------------------------------------------------ t_vault
// "The Hidden Vault": up the ladder from the hall, a short run: spike bed, a roll-jump gap, the heart.
const vault = new RoomBuilder('t_vault', 26, 15, {
  name: 'The Hidden Vault', area: 'temple', map: { x: 10, y: 3 },
  props: { titleCard: true, signs: ['The priests kept their finest fruit\nbehind a gap no ape could leap...\nunless he rolled.'] },
});
vault.border('#').ground(0, 25, 3);                                   // floor rows 0..3 (stand at y = 4)
vault.set(3, 0, '1').rect(3, 1, 1, 2, 'H').set(3, 3, 'T');            // ladder shaft up from the bottom portal
vault.set(6, 4, '?');
vault.bananas(4, 5, 5);
vault.rect(10, 4, 2, 1, '^');
vault.arc(9, 5, 12, 4, 2.0);
vault.bananas(12, 5, 4);
vault.clear(16, 1, 6, 3).rect(16, 1, 6, 1, '^');                      // the roll-jump gap (6 wide), spikes below
vault.arc(15, 5, 22, 6, 2.2);
vault.set(23, 4, 'h');
vault.bananas(22, 6, 3);
vault.portal('1', 't_hall', '3');

export const rooms = [gate, pound, vault].map((b) => b.build());
