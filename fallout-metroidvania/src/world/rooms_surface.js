// REGION 2: CINDER RIDGE (surface town). Ground top y=56 (local row 28); outdoor sky rooms 34 tall at y0=28.
//   s_hill (304,28,56)  s_station (360,28,52)  s_main1 (412,28,64)  s_main2 (476,28,64)  -> s_over (540..) by the ridge author.
// Interfaces: silo <-> s_hill at rows 53..55 | s_main1 stairwell cols 452..457 -> m_entry | s_main2 hatch cols 500..505 -> m_lift.
(function () {
'use strict';
const CD = window.CD, R = CD.room;
CD.HOLOTAPES = CD.HOLOTAPES || {};
const H = CD.HOLOTAPES;

function outdoor(id, name, x, w, opts) {
  const r = R(id, name, 'surface', x, 28, w, 34, Object.assign({ sky: true, skyTop: true }, opts || {}));
  r.floor(6, 'G');                                   // soil rows 28..33 (global 56..61); ground top = local row 28
  return r;
}

// ------------------------------------------------------------------ 1. VAULT EXIT HILL  (304,28) 56x34
{
  const r = outdoor('s_hill', 'Vault Exit Hill', 304, 56);
  r.solid(0, 0, 3, 33, 'C');                          // the silo bunker wall
  r.clear(0, 25, 3, 27);                              // doorway from the vault silo
  r.zone(4, 0, 7, 27, 'bw_concrete');                 // bunker face behind the exit (sf_silo painted on top)
  // rock outcrop with a hidden cavity (cracked wall) and the Strength bobblehead
  r.solid(35, 26, 37, 27, 'R');                       // step
  r.solid(38, 23, 52, 27, 'R'); r.clear(39, 25, 43, 27); r.breakable(38, 25, 38, 27);
  r.ents([[8, 27, 'F'], [23, 27, 'F'], [15, 27, 'r'], [20, 27, 'r'], [42, 27, 'Q'], [44, 22, 'a'], [27, 15, 'f'], [50, 12, 'f'], [17, 27, '$'], [46, 22, '$'], [49, 27, '+'], [13, 27, 'K']]);
  r.ent(28, 27, 'Z');                                 // Haskell's bunk
  r.ent(33, 27, 'r');
  // decor
  r.deco(4, 0, 'sf_silo', 4, 28);
  r.deco(10, 26, 'sf_car', 5, 2, { v: 0 });
  r.deco(17, 21, 'sf_tree', 4, 7, { v: 1 });
  r.deco(25, 23, 'sf_shack', 9, 5, { text: "HASKELL'S TRADING POST" });
  r.deco(41, 16, 'sf_billboard', 10, 7, { ad: 'sun' });
  r.deco(35, 26, 'sf_sign_road', 2, 2, { text: 'DANGER' });
  r.deco(21, 27, 'sf_scrub', 2.5, 1.2); r.deco(51, 27, 'sf_scrub', 2.5, 1.2); r.deco(54, 26, 'sf_boulder', 3, 2);
  r.deco(5, 26, 'sf_bench', 2.5, 1.2); r.deco(30, 26.8, 'sf_crates', 2.5, 1.6); r.deco(45, 22, 'sf_skeleton', 2, 1);
  r.deco(10, 24, 'sf_lamp', 2, 7);
  // marks
  r.mark(4, 27, 'trigger', { w: 2, h: 3, id: 'sf_arrive', say: [['OVERSEER', 'Welcome to the surface, Sleeper Seven. Please do not look directly at the sky. It is very large.', 5.5], ['OVERSEER', 'A trader named Haskell has set up shop east of the exit. He accepts caps. Please do not tell him about the vault. Or me.', 6.5]], once: true });
  r.mark(32, 27, 'npc', { id: 'haskell', name: 'Haskell', outfit: 'trader', face: -1, shop: 'trader',
    lines: ["Well, I'll be a two-headed brahmin's uncle. A vault dweller, crawling out of Old Man Vault-Tec's hole. Name's Haskell. Caps for goods, no questions, no refunds.",
      "Cinder Ridge. Made steel, once. Now it makes corpses. West's the Rustyard, run by a big fella called Bulldog. East's Main Street, and past that the ridge. Don't linger. Not after dark, not before dark, not during.",
      "The subway under Main Street? Ghouls. Feral ones, and something worse in the dark. Folks say there's a light down there that ain't a lamp. Bring a good grip on things; the walls down there are slick as a politician.",
      "Meridian Power Station, far east. Fusion plant, still humming, so they say. Brotherhood sent a bird toward it last winter. Bird came down on the ridge. Nothing's come back from that cliff but rumours and one very unhappy fella's boots.",
      "That rock over yonder, the one with the crack in it? Old prospector's cache. Frag grenade would open it right up. I'd sell you one. Fifty-five caps. Cheap, considering."],
    topics: ['What is this place?', 'What is down the subway?', 'Meridian Power Station?', 'That cracked rock...'] });
  r.mark(6, 27, 'terminal', { id: 'sf_t_hill', title: 'VAULT-TEC SURFACE ACCESS - LOG', lines: ['SURFACE HATCH 213-A.\nLAST OPENED: 2077-10-23.\nLAST CLOSED: 2077-10-23.\nNOTE: The hatch was closed from the inside. By request of the last surface crew.', 'SURFACE STATUS: CLOSED.\nRADIATION: SURVIVABLE.\nWILDLIFE: MILDLY ENTHUSIASTIC.\nOVERSEER OPINION: DO NOT GO OUTSIDE.\n\n(You are outside.)'] });
  r.mark(41, 27, 'pickup', { k: 'bobble', stat: 'S' });
  r.mark(20, 26, 'pickup', { k: 'weapon', id: 'bat' });
  r.mark(48, 22, 'pickup', { k: 'holotape', id: 'tape_wanderer' });
  r.mark(40, 27, 'locker', { loot: [{ k: 'ammo', type: '10mm', n: 30 }, { k: 'caps', n: 90 }, { k: 'stimpak' }] });
  r.done();
}
H.tape_wanderer = { title: "Wanderer's Journal", text: ["Day 9. Followed the old highway east. Found a town with a diner that still smells of grease. Should have kept walking.", "Day 12. The raiders west of the vault hill call themselves the Rustyard Kings. Their boss wears a pair of boots with a green light in the soles. Never seen tech like it. Never want to be close enough to see it again."] };

// ------------------------------------------------------------------ 2. RED ROCKET STATION  (360,28) 52x34
{
  const r = outdoor('s_station', 'Red Rocket Station', 360, 52);
  r.solid(4, 28, 48, 29, 'A');                        // forecourt asphalt
  // climb: car roof -> wreck stack -> canopy roof -> sign tower -> garage roof
  r.plat(3, 5, 26); r.plat(9, 12, 24); r.plat(13, 28, 21);
  r.plat(29, 31, 18); r.plat(33, 35, 15);
  r.solid(35, 19, 48, 19, 'C');                       // garage roof ledge
  r.plat(40, 44, 26);                                 // truck bed
  r.ents([[26, 27, 'N'], [14, 27, 'r'], [23, 27, 'r'], [47, 27, 'a'], [43, 27, 'a'], [20, 20, 'j'], [39, 18, 'j'], [31, 10, 'f'], [8, 27, '$'], [10, 23, '+'], [36, 27, '%'], [16, 27, 'F'], [49, 27, 'F'], [5, 25, '$'], [2, 27, 'K']]);
  r.deco(2, 26, 'sf_car', 5, 2, { v: 1 });
  r.deco(8, 24, 'sf_wreck_stack', 6, 4);
  r.deco(12, 21, 'sf_canopy', 18, 7, { collapse: 0.3 });
  r.deco(16.5, 25.4, 'sf_pump', 1.6, 2.6, { v: 0 }); r.deco(21.5, 25.4, 'sf_pump', 1.6, 2.6, { v: 1 });
  r.deco(31, 16, 'sf_redrocket', 4, 12);
  r.deco(35, 20, 'sf_garage', 14, 8);
  r.deco(37, 25, 'sf_truck', 8, 3, { v: 0 });
  r.deco(6, 27.2, 'sf_tires', 2, 1.2); r.deco(0, 25, 'sf_lamp', 2, 7, { lean: -0.4 }); r.deco(50, 21, 'sf_pole', 6, 12);
  r.deco(28, 26.6, 'sf_barrels', 2.5, 1.6); r.deco(46, 26.6, 'sf_sandbags', 3, 1.4);
  r.mark(42, 25, 'pickup', { k: 'weapon', id: 'hunting_rifle' });
  r.mark(34, 14, 'pickup', { k: 'upgrade', u: 'ammo' });
  r.mark(48, 27, 'terminal', { id: 'sf_t_station', title: 'RED ROCKET - POINT OF SALE', lines: ['RED ROCKET AUTO SERVICE #114\n\nLAST TRANSACTION: 2077-10-23 09:14\nITEM: 1x FUSION FLUX (REGULAR)\nPAID: 1x THANK YOU\nCUSTOMER SAID THEY WOULD BE BACK.', 'EMPLOYEE NOTICE:\nThe fuel tanks are empty. The bathrooms are broken. The rocket is fine.\nThe rocket is always fine.'] });
  r.mark(10, 23, 'pickup', { k: 'holotape', id: 'tape_station' });
  r.mark(1, 27, 'trigger', { w: 2, h: 3, id: 'sf_station_warn', say: [['OVERSEER', 'Sensors detect several armed individuals ahead. Please do not take it personally. They do not know you yet.', 5.5]], once: true });
  r.done();
}
H.tape_station = { title: 'Night Shift Log', text: ["Log, Red Rocket #114. Fuel's gone. Customers are gone. Only thing left is a Vault-Tec crew that stopped by in '77 and left a lockbox behind the counter. They said: do not open it until the doors open.", "They never said which doors. So I'm keeping the lockbox. If you're reading this and the doors are open, the lockbox is in the tower. Watch your step on the sign. It's rustier than I am."] };

// ------------------------------------------------------------------ 3. MAIN STREET WEST  (412,28) 64x34   stairwell to the Metro at local cols 40..45
{
  const r = outdoor('s_main1', 'Main Street West', 412, 64);
  // Metro stairwell: hole in the street with a ladder on its west wall
  r.clear(40, 28, 45, 33); r.ladder(40, 27, 33);
  r.plat(37, 50, 25);                                 // footbridge over the stairwell
  // pharmacy (enterable): roof rows 20..21, doorway rows 25..27 on the west side
  r.solid(20, 20, 35, 21, 'B'); r.solid(20, 22, 21, 24, 'B'); r.solid(34, 22, 35, 27, 'B');
  r.zone(22, 22, 33, 27, 'bw_brick'); r.solid(22, 28, 33, 28, 'L');
  // roof access from the west: dumpster -> ledge -> roof
  r.plat(15, 17, 26); r.plat(17, 19, 23);
  r.ents([[24, 22, '*'], [31, 22, '*'], [28, 27, 'Z'], [36, 24, 'q'], [30, 19, 'j'], [53, 27, 'a'], [58, 27, 'x'], [55, 27, 'y'], [48, 12, 'f'], [8, 27, 'a'], [11, 27, 'F'], [61, 27, 'F'], [18, 27, '$'], [26, 27, '%'], [33, 27, '+'], [62, 27, '$'], [56, 20, 'K']]);
  // background facades
  r.deco(0, 15, 'sf_shopfront', 12, 13, { sign: 'GENERAL STORE', brick: 0, ruin: 0.4 });
  r.deco(52, 15, 'sf_shopfront', 12, 13, { sign: 'HARDWARE', brick: 2, ruin: 0.7 });
  r.deco(12, 21, 'sf_shopfront_low', 8, 7, { sign: 'BARBER' });
  r.deco(38, 22, 'sf_metro', 8, 6, { name: 'CINDER RIDGE' });
  r.deco(36, 20, 'sf_footbridge', 16, 5);
  r.deco(15, 26, 'sf_dumpster', 3, 2); r.deco(16.5, 24.4, 'sf_crates', 2.5, 1.6);
  r.deco(22, 25, 'desk', 2, 2); r.deco(30, 25, 'locker_row', 3, 3); r.deco(26, 23, 'sign', 4, 1, { text: 'PHARMACY', fg: '#7dffb0', bg: '#0e1a16' }); r.deco(28.5, 23, 'poster', 2, 2, { title: 'HEALTH', line: 'IS WEALTH', tone: [206, 196, 152] });
  r.deco(46, 26.6, 'sf_sandbags', 3, 1.4); r.deco(50, 26.8, 'sf_barrels', 2.5, 1.6); r.deco(4, 21, 'sf_pole', 6, 12); r.deco(59, 26.8, 'sf_car', 5, 2, { v: 2, flip: true });
  r.deco(38, 24, 'sf_lamp', 2, 7, { lean: 0.3 });
  r.mark(23, 27, 'terminal', { id: 'sf_t_pharm', title: 'CINDER RIDGE PHARMACY - ORDERS', lines: ['OUTSTANDING ORDERS:\n#4471  RadAway x20   (PICKED UP)\n#4472  Stimpak x5    (PICKED UP)\n#4473  Bandages x1   (NEVER PICKED UP)', 'To whoever finds this: the good stuff is in the locker behind the counter. The lock is stuck, not locked. Kick it. We all did.'] });
  r.mark(32, 27, 'locker', { loot: [{ k: 'stimpak' }, { k: 'stimpak' }, { k: 'radaway' }, { k: 'caps', n: 45 }] });
  r.mark(28, 19, 'pickup', { k: 'holotape', id: 'tape_pharm' });
  r.mark(36, 27, 'trigger', { w: 3, h: 3, id: 'sf_metro_hint', hint: 'CINDER RIDGE METRO\nStairs and a ladder lead down. It is dark, and the walls are slick. Bring something to grip them with.', hintDur: 7, once: true });
  r.mark(47, 27, 'trigger', { w: 2, h: 3, id: 'sf_main_warn', say: [['OVERSEER', 'Sleeper Seven, subway access detected. Please do not enter. The Overseer would not enter. The Overseer cannot enter. Coincidence.', 6]], once: true });
  r.done();
}
H.tape_pharm = { title: "Pharmacist's Last Order", text: ["Order #4473. One roll of bandages, paid in full, never picked up. I keep the receipt on the counter and I keep the door unlocked, in case whoever it was comes back.", "It has been two hundred and ten years. I've stopped believing they will. But I kept the bandages fresh, anyway. Old habits. Old hopes. If you take them, use them well."] };

// ------------------------------------------------------------------ 4. NUKA DINER  (476,28) 64x34   maintenance hatch to the Metro at local cols 24..29
{
  const r = outdoor('s_main2', 'Nuka Diner', 476, 64);
  // maintenance hatch shaft
  r.clear(24, 28, 29, 33); r.ladder(24, 27, 33);
  // the diner: walkable both ways (doorways rows 25..27), roof rows 20..21
  r.solid(33, 20, 54, 21, 'M'); r.solid(33, 22, 34, 24, 'C'); r.solid(53, 22, 54, 24, 'C');
  r.zone(35, 22, 52, 27, 'bw_diner'); r.solid(35, 28, 52, 28, 'L');
  // roof access from the east: dumpster -> ledge -> roof
  r.plat(55, 57, 26); r.plat(56, 58, 23);
  // highway embankment (east end), tunnel to the overpass at rows 25..27
  r.solid(59, 0, 63, 33, 'C'); r.clear(59, 25, 63, 27);
  r.ents([[37, 22, '*'], [43, 22, '*'], [49, 22, '*'], [36, 27, 'N'], [50, 27, 'Z'], [8, 27, 'r'], [18, 27, 'r'], [40, 27, 'r'], [45, 27, 'g'], [20, 27, 'x'], [14, 27, 'u'], [12, 14, 'f'], [26, 10, 'f'], [7, 27, 'F'], [56, 27, 'F'], [4, 27, '$'], [22, 27, '+'], [30, 27, '%'], [47, 19, '$']]);
  r.deco(2, 21, 'sf_billboard', 10, 7, { ad: 'nuka' });
  r.deco(14, 26, 'sf_car', 5, 2, { v: 3 }); r.deco(18, 26, 'sf_car', 5, 2, { v: 4, flip: true }); r.deco(2, 26, 'sf_car', 5, 2, { v: 5 });
  r.deco(30, 14, 'sf_watertower', 7, 14);
  r.deco(22, 26, 'sf_fence', 2, 2); r.deco(30, 26, 'sf_fence', 2, 2); r.deco(22, 24, 'sf_sign_road', 2, 2, { text: 'MAINT' });
  r.deco(31.2, 26.8, 'sf_hydrant', 1, 1);
  r.deco(32, 15, 'sf_diner_roof', 26, 5, { text: 'DINER' });
  r.deco(36, 26, 'sf_jukebox', 1.6, 2.4); r.deco(38.5, 26, 'sf_nuka_cooler', 1.2, 2.5);
  r.deco(40, 26, 'sf_counter', 10, 2); r.deco(37, 23, 'sf_menu', 3, 1.5);
  r.deco(40, 23, 'sf_diner_window', 6, 3);
  r.deco(50.5, 25.8, 'sf_booth', 3.5, 2.2);
  r.deco(55, 26, 'sf_dumpster', 3, 2); r.deco(56, 25.4, 'sf_crates', 2.5, 1.6);
  r.deco(57, 22, 'sf_sign_road', 2, 3, { text: 'EXIT 9' });
  r.mark(46, 27, 'terminal', { id: 'sf_t_diner', title: 'NUKA DINER - DAILY SPECIALS', lines: ['TODAY\'S SPECIALS\n\n  THE ATOMIC BURGER  ........ 4 CAPS\n  RADROACH SURPRISE ......... 3 CAPS\n  NUKA-COLA FLOAT ........... 2 CAPS\n  CUSTOMER SATISFACTION ..... PRICELESS', 'STAFF NOTICE\n\nNo, the freezer is not haunted. The noise is the compressor.\nNo, you may not go in the freezer. Do not go in the freezer.'] });
  r.mark(23, 27, 'trigger', { w: 2, h: 3, id: 'sf_hatch_hint', hint: 'MAINTENANCE HATCH\nDrop in to reach the Metro. A ladder leads back up.', hintDur: 6, once: true });
  r.mark(35, 27, 'pickup', { k: 'holotape', id: 'tape_diner' });
  r.mark(44, 19, 'pickup', { k: 'bobble', stat: 'C' });
  r.done();
}
H.tape_diner = { title: 'Jukebox Reel: Vault-Tec Jingle', text: ["A brighter tomorrow, underground and safe! / A brighter tomorrow, in your own little place! / Two hundred years of sleep and you'll wake up with a smile, / and if you don't wake up... well, that's a very, very long while!", "(The tape crackles. A second voice, quieter: 'Sleeper Six was here. I left the boots in the tool room. Tell the next one to be quicker than me.')"] };

})();
