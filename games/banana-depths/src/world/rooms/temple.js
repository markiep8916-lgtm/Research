// SUNKEN TEMPLE (part A): the Hall of Slabs. Kong holds ROLL here; GROUND POUND is found in the Pound Shrine behind the Golem.
// (t_gate, t_pound and t_vault live in temple_b.js.)
import { RoomBuilder } from '../builder.js';

// ------------------------------------------------------------------------------------------------ t_hall
// The Hall of Slabs (first pass): a rising pillar chain over spikes, the long plateau with the slab plate, the hanging
// tower with the wall-jump chimney, and a descending chain to the east court.
const hall = new RoomBuilder('t_hall', 78, 30, {
  name: 'Hall of Slabs', area: 'temple', map: { x: 9, y: 4 },
  props: {
    titleCard: true,
    signs: [
      'The HALL OF SLABS. The Tiki Tribe sealed\nwhat they broke beneath these stones.',
      'This floor rings hollow...\nCracked slabs. Something heavy might break them.',
      'A narrow way up. Only a gorilla\nwith a firm grip could climb it.',
    ],
  },
});
hall.border('#');
hall.ground(1, 7, 3);
hall.ground(8, 21, 2).hline(8, 21, 3, '^');
hall.rect(8, 0, 2, 6, '#').rect(13, 0, 2, 8, '#').rect(18, 0, 2, 10, '#');        // pillars P1 (top 6) P2 (top 8) P3 (top 10)
hall.ground(22, 55, 9);                                                           // plateau, top y=10
hall.ground(56, 66, 2).hline(56, 66, 3, '^');
hall.rect(58, 0, 2, 8, '#').rect(63, 0, 2, 6, '#');                               // Q1 (top 8) Q2 (top 6)
hall.ground(67, 76, 3);
hall.clear(0, 4, 1, 3).rect(0, 4, 1, 3, '1');
hall.clear(77, 4, 1, 3).rect(77, 4, 1, 3, '2');
// slab well: 4-wide 2-deep plate; under it solid flanks and a ladder pair so every hole that opens the cavity has a ladder
hall.rect(31, 1, 2, 6, '.');
hall.ladder(31, 1, 7).ladder(32, 1, 7);
hall.rect(30, 8, 4, 2, 'G');
hall.set(31, 0, '4').set(32, 0, '4');
// hanging tower: two ceiling pillars around a 4-wide shaft (x=44..47); clear 3 tiles above the plateau
hall.rect(41, 13, 3, 16, '#').rect(48, 13, 3, 16, '#');
hall.rect(44, 13, 4, 16, '.');
hall.rect(46, 23, 2, 1, '#');                                                     // landing ledge, top y=24
hall.vline(47, 24, 28, 'H');
hall.set(47, 29, '3');
// furniture
hall.set(4, 4, '?').set(28, 10, '?').set(38, 10, '?');
hall.set(70, 4, 'S');
hall.bananas(3, 5, 4);
hall.arc(9, 7, 13, 5, 2).arc(14, 9, 18, 5, 2).arc(19, 11, 23, 5, 2);
hall.bananas(29, 11, 5);
hall.bananas(52, 11, 3);
hall.arc(55, 9, 59, 5, 2).arc(60, 9, 63, 4, 2).arc(64, 7, 68, 5, 2);
hall.bananas(71, 5, 5);
hall.bananas(44, 13, 4, 1, 1).bananas(47, 17, 4, -1, 1).bananas(44, 21, 2, 1, 1);
hall.set(25, 10, 'u').set(36, 10, 't').set(42, 12, 'a').set(49, 12, 'a').set(53, 10, 'U');
hall.portal('1', 't_gate', '2').portal('2', 't_golem', '1').portal('3', 't_vault', '1').portal('4', 'c_drop', '1');

export const rooms = [hall].map((b) => b.build());
