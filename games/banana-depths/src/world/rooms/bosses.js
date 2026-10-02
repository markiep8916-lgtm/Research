// Boss arenas and the final chamber (hand-built; behaviours live in game/bosses.js).
import { RoomBuilder } from '../builder.js';

// ---------------------------------------------------------------- Stone Golem
const golem = new RoomBuilder('t_golem', 40, 20, {
  name: 'Golem Chamber', area: 'temple', map: { x: 12, y: 4 },
  props: { boss: 'golem', bossRoom: true, bossTrigger: 9, bossName: 'STONE GOLEM', bossCam: { zoom: 1.42 }, titleCard: true },
});
golem.border('#').ground(0, 39, 2);
golem.clear(0, 3, 1, 3).rect(0, 3, 1, 3, '1');
golem.clear(39, 3, 1, 3).rect(39, 3, 1, 3, '2').rect(38, 3, 1, 3, 'E');
golem.plat(7, 8, 5).plat(28, 8, 5).plat(16, 12, 8);
golem.set(31, 3, 'B');
golem.portal('1', 't_hall', '2').portal('2', 't_pound', '1');

// ---------------------------------------------------------------- Crystal Spider Queen
const queen = new RoomBuilder('c_queen', 52, 30, {
  name: "Queen's Nest", area: 'cavern', map: { x: 16, y: 7 },
  props: { boss: 'queen', bossRoom: true, bossTrigger: 11, bossName: 'CRYSTAL SPIDER QUEEN', bossCam: { zoom: 1.8 }, titleCard: true },
});
queen.border('#').ground(0, 51, 2);
queen.clear(0, 3, 1, 3).rect(0, 3, 1, 3, '1');
queen.clear(51, 3, 1, 3).rect(51, 3, 1, 3, '2').rect(50, 3, 1, 3, 'E');
queen.plat(5, 9, 7).plat(40, 9, 7).plat(16, 13, 6).plat(30, 13, 6).plat(22, 19, 8);
queen.set(26, 24, 'B');
queen.portal('1', 'c_web', '2').portal('2', 'c_grip', '1');

// ---------------------------------------------------------------- Tiki Overlord
const over = new RoomBuilder('g_top', 40, 26, {
  name: "Overlord's Perch", area: 'tower', map: { x: 19, y: 3 },
  props: { boss: 'overlord', bossRoom: true, bossTrigger: 6, bossName: 'TIKI OVERLORD', bossCam: { zoom: 1.4 }, titleCard: true },
});
over.border('#').ground(0, 39, 2);
over.clear(19, 0, 1, 3).set(19, 0, '1').set(19, 1, 'H').set(19, 2, 'T');   // ladder up from the tower below
over.clear(39, 15, 1, 3).rect(39, 15, 1, 3, '2').rect(38, 15, 1, 3, 'E');   // exit door, opens when the Overlord falls
over.plat(4, 7, 6).plat(30, 7, 6).plat(15, 11, 10).plat(4, 15, 5).plat(31, 14, 6);
over.set(30, 3, 'B');
over.portal('1', 'g_three', '2').portal('2', 'g_heart', '1');

// ---------------------------------------------------------------- the Golden Banana chamber
const heart = new RoomBuilder('g_heart', 26, 20, { name: 'The Golden Banana', area: 'tower', map: { x: 19, y: 1 }, props: { titleCard: true } });
heart.border('#').ground(0, 25, 2);
heart.clear(0, 3, 1, 3).rect(0, 3, 1, 3, '1');
heart.plat(5, 7, 4).plat(17, 7, 4);
heart.bananas(6, 8, 3).bananas(18, 8, 3);
heart.set(13, 3, 'K');
heart.portal('1', 'g_top', '2');

export const rooms = [golem, queen, over, heart].map((b) => b.build());
