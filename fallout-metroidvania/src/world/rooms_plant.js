// REGION 5: MERIDIAN POWER STATION  (region 'plant', difficulty 1.85)
// Global anchors: surface ground top y=56 (p_gate, p_towers) | turbine + control floor top y=90 | flood/decon/reactor floor top y=120.
//   p_gate    (668,28,44,34)  perimeter yard, sealed vestibule (X barricade) at the west end, lift house
//   p_towers  (712,28,68,34)  cooling tower yard: Tower B wall-jump climb -> rooftop console -> catwalk -> Tower A sump hatch
//   p_secret  (780,44,28,18)  foreman's stash behind a cracked wall on the east side of the yard
//   p_lift    (690,62,16,62)  service lift shaft (top stop in the p_gate lift house, bottom stop behind the arena)
//   p_turbine (706,62,76,32)  turbine hall: spike-pit dash gap, arcs, steam
//   p_control (782,62,48,32)  operations deck: double-jump climb to the lockdown console; hackable director's terminal
//   p_flood   (794,94,72,30)  coolant flood hall (rad water) + flooded pump room (hazmat)
//   p_decon   (754,94,40,30)  decontamination lockers, bed, Nuka machine, Sweepy the janitor
//   p_reactor (706,94,48,30)  reactor arena: SENTRY BOT WARDEN-9
(function () {
'use strict';
const CD = window.CD, R = CD.room;
CD.HOLOTAPES = CD.HOLOTAPES || {};
const H = CD.HOLOTAPES;

const SKY = { sky: true, skyTop: true, bg: null, ambient: [0.26, 0.25, 0.22], skyColor: [1.0, 0.80, 0.58], skyStrength: 0.62, ammo: 'cell' };

// ------------------------------------------------------------------ 1. PERIMETER YARD  (668,28) 44x34   ground top y=56 (local row 28)
{
  const r = R('p_gate', 'Meridian Perimeter', 'plant', 668, 28, 44, 34, SKY);
  r.floor(6, 'C');
  r.solid(0, 0, 1, 24, 'C');                       // west perimeter wall stub
  r.solid(2, 13, 11, 27, 'C');                     // guard blockhouse (roof = local row 13)
  r.clear(0, 25, 1, 27);                           // west doorway (rows 53..55) -> s_ridge
  r.clear(2, 22, 8, 27);                           // sealed vestibule chamber
  r.breakable(9, 25, 11, 27);                      // the barricade (Power Fist / grenade)
  r.solid(42, 0, 43, 24, 'C');                     // east perimeter wall, doorway rows 25..27 -> p_towers
  // lift house (shaft columns 696..700 = local 28..32)
  r.solid(25, 23, 35, 27, 'C');
  r.clear(27, 25, 33, 27);                         // cavity
  r.clear(25, 25, 26, 27);                         // doorway for the lockdown door
  r.clear(28, 28, 32, 33);                         // shaft through the ground
  // scaffold up the blockhouse face (double-jump climb)
  r.plat(13, 17, 23); r.plat(13, 17, 18);
  r.done();
}

// ------------------------------------------------------------------ 2. COOLING TOWER YARD  (712,28) 68x34   ground top y=56
{
  const r = R('p_towers', 'Cooling Tower Yard', 'plant', 712, 28, 68, 34, SKY);
  r.floor(6, 'C');
  r.solid(0, 0, 1, 24, 'C');                       // west wall (doorway rows 25..27)
  r.solid(66, 0, 67, 24, 'C');                     // east wall
  r.breakable(66, 25, 67, 27);                     // cracked wall -> p_secret
  // ---- Tower A (sump tower): wide hollow tube, hatch in the floor
  r.solid(8, 8, 24, 27, 'C');                      // outer mass
  r.clear(12, 8, 20, 27);                          // interior (9 wide), open top
  r.clear(8, 25, 11, 27);                          // base doorway
  r.clear(8, 9, 8, 21); r.clear(24, 9, 24, 21);    // thin waist (walls 3 thick)
  r.clear(14, 28, 18, 33);                         // hatch hole (5 wide) rows 28..33 (door row 28)
  // ---- Tower B (wall-jump tower): 5 wide shaft
  r.solid(45, 6, 57, 27, 'C');
  r.clear(49, 6, 53, 27);                          // interior (5 wide), open top
  r.clear(45, 25, 48, 27);                         // base doorway
  r.clear(45, 9, 45, 21); r.clear(57, 9, 57, 21);  // thin waist
  // ---- coolant channel with two pilings
  r.clear(29, 28, 40, 30); r.water(29, 29, 40, 30);
  r.solid(32, 28, 33, 30, 'C'); r.solid(36, 28, 37, 30, 'C');
  // ---- overhead catwalk (Tower B rim -> Tower A rim)
  r.plat(39, 44, 7); r.plat(25, 29, 7);
  r.done();
}

// ------------------------------------------------------------------ 3. FOREMAN'S STASH  (780,44) 28x18   floor top y=56 (local row 12)
{
  const r = R('p_secret', "Foreman's Stash", 'plant', 780, 44, 28, 18, { bg: 'bw_concrete', secret: true, ambient: [0.16, 0.17, 0.14], ammo: 'cell' });
  r.shell(2, 'C'); r.floor(6, 'C');
  r.open('L', 9, 11);
  r.done();
}

// ------------------------------------------------------------------ 4. SERVICE LIFT SHAFT  (690,62) 16x62   bottom floor top y=120 (local row 58)
{
  const r = R('p_lift', 'Service Lift Shaft', 'plant', 690, 62, 16, 62, { bg: 'bw_concrete', ambient: [0.14, 0.16, 0.14] });
  r.shell(2, 'C'); r.floor(4, 'C');
  r.clear(6, 0, 10, 1);                            // top opening (shaft columns 696..700)
  r.open('R', 55, 57);                             // doorway from the reactor arena
  r.done();
}

// ------------------------------------------------------------------ 5. TURBINE HALL  (706,62) 76x32   floor top y=90 (local row 28)
{
  const r = R('p_turbine', 'Turbine Hall', 'plant', 706, 62, 76, 32, { bg: 'bw_rust', ambient: [0.15, 0.18, 0.13], ammo: 'cell' });
  r.shell(2); r.floor(4);
  r.clear(20, 0, 24, 1);                           // sump hatch drop (cols 726..730)
  r.open('R', 25, 27);                             // -> p_control
  r.clear(35, 28, 43, 29); r.spikes(35, 43, 29);   // tailrace pit (9 wide) with spikes
  r.done();
}

// ------------------------------------------------------------------ 6. OPERATIONS DECK  (782,62) 48x32   floor top y=90 (local row 28)
{
  const r = R('p_control', 'Operations Deck', 'plant', 782, 62, 48, 32, { bg: 'bw_lab', ambient: [0.13, 0.17, 0.15], ammo: 'cell' });
  r.shell(2, 'Y'); r.floor(4, 'Y');
  r.open('L', 25, 27);
  r.clear(38, 28, 42, 31);                         // coolant access hatch (door row 28)
  r.done();
}

// ------------------------------------------------------------------ 7. COOLANT FLOOD HALL  (794,94) 72x30   floor top y=120 (local row 26)
{
  const r = R('p_flood', 'Coolant Flood Hall', 'plant', 794, 94, 72, 30, { bg: 'bw_concrete', ambient: [0.10, 0.16, 0.12], rad: 0.2, ammo: 'cell' });
  r.shell(2); r.floor(4);
  r.clear(26, 0, 30, 1);                           // drop from the operations deck
  r.open('L', 23, 25);                             // -> p_decon
  r.water(16, 21, 49, 25);
  r.done();
}

// ------------------------------------------------------------------ 8. DECONTAMINATION LOCKERS  (754,94) 40x30   floor top y=120 (local row 26)
{
  const r = R('p_decon', 'Decontamination Lockers', 'plant', 754, 94, 40, 30, { bg: 'bw_lab', ambient: [0.16, 0.20, 0.19], ammo: 'cell' });
  r.shell(2, 'Y'); r.floor(4, 'Y');
  r.open('L', 23, 25); r.open('R', 23, 25);
  r.done();
}

// ------------------------------------------------------------------ 9. REACTOR ARENA  (706,94) 48x30   floor top y=120 (local row 26)
{
  const r = R('p_reactor', 'Reactor Chamber', 'plant', 706, 94, 48, 30, { bg: 'bw_concrete', ambient: [0.14, 0.20, 0.15], ammo: 'cell' });
  r.shell(2); r.floor(4);
  r.open('L', 23, 25); r.open('R', 23, 25);
  r.done();
}

})();
