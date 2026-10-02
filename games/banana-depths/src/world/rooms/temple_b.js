// SUNKEN TEMPLE, part B: t_gate (the Temple Gate), t_pound (the Ground Pound shrine), t_vault (the secret vault).
// Abilities held on entry: Roll.  Ground Pound is learned in t_pound; t_vault is a Grip secret (reached from t_hall).
import { RoomBuilder } from '../builder.js';

/** Place bananas from a list of [x, y] cells (call AFTER the terrain: a marker clears the tile it sits on). */
const bn = (b, pts) => { for (const [x, y] of pts) b.set(x, y, 'o'); return b; };

// ------------------------------------------------------------------------------------------------ t_gate
// "Fang Gate": a stone gatehouse with two roads.
//   OVER    - stairs up the left face to the battlement: cover pillar, a 4-wide spike pit, a tiki at the far end.
//   THROUGH - a crate door (Roll!), a sealed spike corridor, a second crate door. This is also the only way back
//             from the hall (the battlement ends in a drop), so it is the shortcut.
// Above the forecourt a ladder leads to an optional sky balcony: bananas guarded by a second tiki.
const gate = new RoomBuilder('t_gate', 39, 22, {
  name: 'The Temple Gate', area: 'temple', map: { x: 7, y: 4 },
  props: {
    titleCard: true,
    signs: [
      'THE SUNKEN TEMPLE\nThe Tiki Tribe shattered the Golden Banana\nand hid its power in these halls.',
      'Two roads cross the gate.\nThe fang road is long, the crate road short.\nSlap (X) a fireball to hurl it back!',
    ],
  },
});
gate.border('#').ground(0, 38, 2);                                    // floor rows 0..2 (stand at y = 3)
gate.rect(0, 3, 1, 3, '1').rect(38, 3, 1, 3, '2');                    // portals: left (from the log), right (to the hall)
// --- left forecourt (x 1..11): arrival, a first spike bed, a snapjaw pocket, stairs up to the roof
gate.rect(5, 3, 2, 1, '^');                                           // teach: a 2-wide spike bed
gate.set(7, 3, '#');                                                  // lip (stand 4); boxes in the snapjaw pocket x 8..11
gate.plat(8, 4, 2);                                                   // stair A (stand 5)
gate.rect(10, 5, 2, 2, '#');                                          // buttress (stand 7)
// --- the gatehouse: roof slab (battlement at y = 9) over a sealed corridor with a crate door at each end
gate.rect(12, 7, 15, 2, '#');
gate.rect(12, 3, 1, 4, 'R').rect(26, 3, 1, 4, 'R');
gate.rect(17, 3, 3, 1, '^');                                          // corridor spike bed (3 wide)
// --- battlement
gate.rect(15, 9, 1, 2, '#');                                          // cover pillar
gate.rect(18, 9, 4, 1, '^');                                          // 4-wide spike pit
// --- sky balcony (optional): ladder up beside the pillar, a slab ledge over the forecourt
gate.ladder(14, 9, 14);
gate.rect(1, 13, 13, 2, '#');
gate.rect(8, 15, 1, 2, '#');                                          // cover pillar on the balcony
// --- right side: the battlement drops to a ledge (too high to climb back), snapjaw pocket under it, courtyard
gate.plat(27, 6, 3);
gate.set(31, 3, '#');                                                 // lip

// entities (after the terrain)
gate.set(3, 3, '?').set(8, 5, '?');                                   // signs in reading order
gate.set(10, 3, 's').set(28, 3, 's');                                 // snapjaws
gate.set(26, 9, 'u');                                                 // tiki 1: far end of the battlement
gate.set(2, 15, 'U');                                                 // tiki 2: dead end of the sky balcony
gate.set(11, 7, 'S');                                                 // save barrel on the buttress
bn(gate, [[4, 4], [5, 5], [6, 5], [7, 4], [10, 4], [11, 4], [9, 6], [10, 7]]);                       // forecourt
bn(gate, [[13, 10], [17, 10], [18, 11], [19, 12], [20, 12], [21, 11], [22, 10], [24, 10], [25, 10]]); // battlement
bn(gate, [[13, 4], [14, 4], [16, 4], [17, 5], [18, 5], [19, 5], [20, 4], [21, 4], [22, 4], [23, 4], [24, 4]]); // corridor
bn(gate, [[27, 8], [28, 8], [33, 4], [34, 4], [35, 4]]);              // right side
bn(gate, [[3, 16], [4, 16], [5, 16], [6, 16], [10, 16], [11, 16], [12, 16]]);                        // sky balcony
gate.portal('1', 'j_log', '2').portal('2', 't_hall', '1');

// ------------------------------------------------------------------------------------------------ t_pound
// "Shrine of the Fist": a nave whose floor and vault both climb toward a stepped altar. Two cracked-slab practice
// floors (a 2-high vault with a spring floor and bananas below each) flank the approach; the relic crowns the altar.
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
pound.rect(1, 12, 9, 7, '#').rect(10, 14, 6, 5, '#').rect(16, 16, 4, 3, '#');     // stepped vault ceiling
pound.rect(7, 3, 4, 2, 'G').clear(7, 1, 4, 2).rect(7, 0, 4, 1, 'Y');             // practice floor 1 (slabs over a spring vault)
pound.set(11, 5, '#');                                                // lip (stand 6)
pound.rect(12, 3, 4, 2, 'G').clear(12, 1, 4, 2).rect(12, 0, 4, 1, 'Y');           // practice floor 2
pound.rect(16, 5, 9, 2, '#').rect(18, 7, 7, 2, '#').rect(20, 9, 5, 2, '#').rect(22, 11, 3, 2, '#');   // altar: stands 7, 9, 11, 13
pound.set(3, 5, '?').set(11, 6, '?').set(20, 11, '?');
pound.set(5, 5, 'S');
pound.set(13, 5, 's');
pound.set(23, 13, 'Q');
bn(pound, [[7, 2], [8, 2], [9, 2], [10, 2], [12, 2], [13, 2], [14, 2], [15, 2]]);                  // below the slabs
bn(pound, [[7, 7], [8, 8], [9, 8], [10, 7], [12, 7], [13, 8], [14, 8], [15, 7]]);                  // jump-and-pound arcs
bn(pound, [[16, 8], [17, 8], [18, 10], [19, 10], [20, 12], [21, 12]]);
pound.portal('1', 't_golem', '2');

// ------------------------------------------------------------------------------------------------ t_vault
// "The Hidden Vault": up the ladder from the hall, a spike bed, then a roll-jump across a spiked pit to the heart altar.
const vault = new RoomBuilder('t_vault', 26, 15, {
  name: 'The Hidden Vault', area: 'temple', map: { x: 10, y: 3 },
  props: { titleCard: true, signs: ['The priests kept their finest fruit\nbehind a gap no ape could leap...\nunless he rolled.'] },
});
vault.border('#').ground(0, 25, 3);                                   // floor rows 0..3 (stand at y = 4)
vault.set(3, 0, '1').rect(3, 1, 1, 2, 'H').set(3, 3, 'T');            // ladder shaft up from the bottom portal
vault.rect(9, 4, 2, 1, '^');                                          // spike bed
vault.clear(15, 1, 6, 3).rect(15, 1, 6, 1, '^');                      // the roll-jump gap (6 wide), spikes below
vault.rect(21, 4, 4, 1, '#');                                         // altar step (stand 5)
vault.set(6, 4, '?');
vault.set(23, 5, 'h');
bn(vault, [[4, 5], [5, 5], [7, 5], [8, 5]]);
bn(vault, [[8, 6], [9, 7], [10, 7], [11, 6]]);
bn(vault, [[12, 5], [13, 5], [14, 5]]);
bn(vault, [[15, 6], [16, 7], [17, 8], [18, 8], [19, 7], [20, 6]]);
bn(vault, [[22, 6], [23, 7], [24, 6]]);
vault.portal('1', 't_hall', '3');

export const rooms = [gate, pound, vault].map((b) => b.build());
