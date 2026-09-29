// REGION 5: MERIDIAN POWER STATION  (region 'plant', difficulty 1.85)
// Global anchors: surface ground top y=56 (p_gate, p_towers) | turbine + control floor top y=90 | flood dock / decon / reactor floor top y=120.
//   p_gate    (668,28,44,34)  perimeter yard, sealed vestibule (X barricade) at the west end, lift house
//   p_towers  (712,28,68,34)  cooling tower yard: Tower B wall-jump climb -> rooftop console -> catwalk -> Tower A sump hatch
//   p_secret  (780,44,28,18)  foreman's stash behind a cracked wall on the east side of the yard
//   p_lift    (690,62,16,62)  service lift shaft (top stop in the p_gate lift house, bottom stop behind the arena)
//   p_turbine (706,62,76,32)  turbine hall: spike-pit dash gap, arcs, steam
//   p_control (782,62,48,32)  operations deck: double-jump climb to the lockdown console; hackable director's terminal
//   p_flood   (794,94,72,36)  coolant flood hall (rad water) + flooded pump room (hazmat)
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
  // vestibule
  r.ents([[4, 27, 'Z'], [5, 22, 'O'], [8, 23, 'l']]);
  r.mark(7, 27, 'terminal', { id: 'pl_t_gate', title: 'GATEHOUSE 1 - SITE LOG', lines: [
    'MERIDIAN POWER STATION - GATE 1\n\nSTATUS: SEALED.\nCAUSE: PERIMETER WALL COLLAPSE (2077-10-23, 09:14).\nREPAIR CREW DISPATCHED: 0.\nREASON: OVERTAKEN BY EVENTS.',
    'MAINTENANCE NOTE:\nThe temporary barricade is four feet of poured concrete and optimism. It will not respond to "please".\nHeavy tools only: Power Fist, pneumatic ram, or one (1) well-placed frag grenade.',
    'A REMINDER TO ALL VISITORS:\nMeridian is a Restricted Facility. Trespassers will be shot. Trespassers who survive will be shot again.\n\n- Site Security (Warden-9 Division)' ] });
  r.mark(5, 27, 'trigger', { w: 3, h: 3, id: 'pl_hint_wall', hint: 'The barricade is cracked, not gone.\nSmash it with the POWER FIST (melee: RIGHT CLICK / K) or a grenade.', hintDur: 7 });
  // yard
  r.mark(14, 27, 'trigger', { w: 2, h: 3, id: 'pl_arrive', say: [['OVERSEER', 'Sleeper Seven, you have arrived at the Meridian Power Station. Please note that its security system has not been updated since the war. Neither has its temper.', 7], ['OVERSEER', 'I recommend stealth. I also recommend not being seen. I am aware these are the same recommendation.', 5.5]] });
  r.mark(25, 27, 'door', { lock: 'flag:boss_sentry', style: 'blast', w: 2, h: 3, label: 'LIFT', hint: 'SERVICE LIFT: LOCKED DOWN.\nWarden-9 has sealed the lift. It will not open while the Sentry is online.' });
  r.mark(43, 27, 'door', { lock: 'open', style: 'blast', w: 1, h: 3, label: 'GATE 2' });
  r.mark(5, 12, 'pickup', { k: 'weapon', id: 'laser_pistol' });
  r.ents([[12, 19, 'q'], [36, 24, 'q'], [8, 12, 'q'], [18, 27, 'p'], [39, 27, 'p'], [21, 27, 's'], [30, 17, 'o'],
    [30, 25, 'O'], [24, 24, 'l'], [36, 26, 'l'], [12, 16, 'l'], [41, 20, 'l'],
    [15, 27, '$'], [38, 27, '$'], [20, 27, '%'], [34, 22, '+'], [6, 12, '$']]);
  r.done();
}

// ------------------------------------------------------------------ 2. COOLING TOWER YARD  (712,28) 68x34   ground top y=56
{
  const r = R('p_towers', 'Cooling Tower Yard', 'plant', 712, 28, 68, 34, Object.assign({}, SKY, { ammo: '5.56' }));
  r.floor(6, 'C');
  r.solid(0, 0, 1, 24, 'C');                       // west wall (doorway rows 25..27)
  r.solid(66, 0, 67, 24, 'C');                     // east wall
  r.breakable(66, 25, 67, 27);                     // cracked wall -> p_secret
  // ---- Tower A (sump tower): wide hollow tube, hatch in the floor
  r.solid(8, 8, 24, 27, 'C');                      // outer mass
  r.clear(12, 8, 20, 27);                          // interior (9 wide), open top
  r.clear(8, 25, 11, 27); r.clear(21, 25, 24, 27); // base doorways (the ground path runs through the tower)
  r.clear(8, 9, 8, 21); r.clear(24, 9, 24, 21);    // thin waist (walls 3 thick)
  r.clear(14, 28, 18, 33);                         // hatch hole (5 wide) rows 28..33 (door row 28)
  // ---- Tower B (wall-jump tower): 5 wide shaft
  r.solid(45, 6, 57, 27, 'C');
  r.clear(49, 6, 53, 27);                          // interior (5 wide), open top
  r.clear(45, 25, 48, 27);                         // base doorway
  r.clear(45, 9, 45, 21); r.clear(57, 9, 57, 21);  // thin waist
  r.plat(49, 51, 16);                              // service ledge half way up the shaft (a resting point; also what lets the solver chain the climb)
  // ---- coolant channel with two pilings
  r.clear(29, 28, 40, 30); r.water(29, 29, 40, 30);
  r.solid(32, 28, 33, 30, 'C'); r.solid(36, 28, 37, 30, 'C');
  // ---- overhead catwalk (Tower B rim -> Tower A rim)
  r.plat(39, 44, 7); r.plat(25, 29, 7);
  r.mark(46, 5, 'terminal', { id: 'pl_t_tower', title: 'COOLING TOWER 2 - ROOFTOP CONSOLE', lines: [
    'PUMP CONTROL: ROOFTOP OVERRIDE\n\nSUMP PUMPS: OFFLINE\nSUMP HATCH: LOCKED (NO POWER)\n\nSUPERVISOR NOTE: If you are reading this, the ladder is broken again. Sorry.',
    'RESTORE POWER TO SUMP CIRCUIT?  [Y]\n\n> Y\n\nPOWER RESTORED.\nSUMP HATCH: UNLOCKED.\n\nThe hatch is in Tower 1. You are on Tower 2. This is a design decision.' ], onRead: { flag: 'pl_sump_power', hint: 'SUMP CIRCUIT RESTORED.\nThe hatch inside Cooling Tower 1 is unlocked.', hintDur: 6 } });
  r.mark(14, 28, 'door', { lock: 'terminal:pl_t_tower', style: 'blast', w: 5, h: 1, label: 'SUMP', hint: 'SUMP HATCH: PUMPS OFFLINE.\nRestore power at the rooftop console of Cooling Tower 2.' });
  r.mark(32, 27, 'steam', { dir: -1, len: 3, period: 3.6, on: 1.1 });
  r.mark(36, 27, 'steam', { dir: -1, len: 3, period: 3.1, on: 1.0 });
  r.mark(40, 6, 'arc', { len: 3, period: 2.8, on: 1.0 });
  r.mark(4, 27, 'trigger', { w: 2, h: 3, id: 'pl_towers_say', say: [['OVERSEER', 'The Cooling Tower Yard. Please do not drink the coolant. Please do not swim in the coolant. Please do not make eye contact with the coolant.', 6.5]] });
  r.mark(50, 27, 'trigger', { w: 3, h: 3, id: 'pl_hint_walljump', hint: 'GECKO GRIPS: push into a wall while falling to cling.\nPress JUMP to leap off, then push into the opposite wall. Repeat.', hintDur: 7 });
  r.mark(55, 5, 'pickup', { k: 'upgrade', u: 'stim' });
  r.ents([[24, 15, 'q'], [45, 15, 'q'], [53, 15, 'l'], [36, 12, 'o'], [27, 14, 'o'], [61, 27, 'p'], [64, 27, 's'],
    [26, 27, '$'], [43, 27, '+'], [58, 27, '%'], [63, 27, '$']]);
  r.done();
}

// ------------------------------------------------------------------ 3. FOREMAN'S STASH  (780,44) 28x18   floor top y=56 (local row 12)
{
  const r = R('p_secret', "Foreman's Stash", 'plant', 780, 44, 28, 18, { bg: 'bw_concrete', secret: true, ambient: [0.16, 0.17, 0.14], ammo: 'cell' });
  r.shell(2, 'C'); r.floor(6, 'C');
  r.breakable(0, 9, 1, 11);                        // the other half of the cracked wall (the validator wants both edges solid)
  r.mark(22, 11, 'pickup', { k: 'upgrade', u: 'hp' });
  r.mark(18, 11, 'locker', { loot: [{ k: 'ammo', type: 'cell', n: 40 }, { k: 'stimpak' }, { k: 'caps', n: 80 }] });
  r.mark(12, 11, 'pickup', { k: 'holotape', id: 'tape_pl_diary' });
  r.ents([[8, 2, '*'], [19, 2, '*'], [5, 11, 'K'], [6, 11, 'K'], [9, 11, '$'], [15, 11, '$'], [16, 11, '+'], [24, 11, '&']]);
  r.done();
}

// ------------------------------------------------------------------ 4. SERVICE LIFT SHAFT  (690,62) 16x62   bottom floor top y=120 (local row 58)
{
  const r = R('p_lift', 'Service Lift Shaft', 'plant', 690, 62, 16, 62, { bg: 'bw_concrete', ambient: [0.14, 0.16, 0.14] });
  r.shell(2, 'C'); r.floor(4, 'C');
  r.clear(6, 0, 10, 1);                            // top opening (shaft columns 696..700)
  r.open('R', 55, 57);                             // doorway from the reactor arena
  r.mark(6, 57, 'elevator', { w: 5, rise: 64, speed: 300, startTop: false, hint: 'Meridian Service Lift' });
  r.mark(4, 57, 'trigger', { w: 2, h: 3, id: 'pl_lift_hint', hint: 'SERVICE LIFT: stand on the platform and press E to ride to the surface.', hintDur: 6 });
  r.ents([[12, 57, 'Z'], [3, 2, 'O'], [12, 2, 'O'], [2, 14, 'l'], [13, 14, 'l'], [2, 30, 'l'], [13, 30, 'l'], [2, 46, 'l'], [13, 46, 'l'], [2, 55, 'l'], [13, 55, 'l']]);
  r.done();
}

// ------------------------------------------------------------------ 5. TURBINE HALL  (706,62) 76x32   floor top y=90 (local row 28)
{
  const r = R('p_turbine', 'Turbine Hall', 'plant', 706, 62, 76, 32, { bg: 'bw_rust', ambient: [0.15, 0.18, 0.13], ammo: 'cell' });
  r.shell(2); r.floor(4);
  r.clear(20, 0, 24, 1);                           // sump hatch drop (cols 726..730)
  r.open('R', 25, 27);                             // -> p_control
  r.clear(35, 28, 43, 29); r.spikes(35, 43, 29);   // tailrace pit (9 wide) with spikes
  // optional perch above the pit (double-jump ladder: rows 23 -> 18 -> 13)
  r.plat(28, 31, 23); r.plat(33, 36, 18); r.plat(38, 44, 13);
  r.solid(63, 25, 67, 27, 'C');                    // transformer pad
  r.mark(48, 27, 'arc', { len: 3, period: 2.7, on: 1.0 });
  r.mark(57, 27, 'arc', { len: 3, period: 3.1, on: 1.0 });
  r.mark(54, 27, 'steam', { dir: -1, len: 3, period: 3.3, on: 1.1 });
  r.mark(31, 27, 'steam', { dir: -1, len: 3, period: 3.9, on: 1.0 });
  r.mark(33, 27, 'trigger', { w: 2, h: 3, id: 'pl_hint_dash', hint: 'JET RUSH: press DASH in mid-air for a burst of speed.\nJump, double-jump, then dash to clear the tailrace.', hintDur: 8 });
  r.mark(42, 12, 'locker', { loot: [{ k: 'ammo', type: 'cell', n: 40 }, { k: 'grenade', n: 2 }, { k: 'caps', n: 60 }] });
  r.ents([[10, 2, '*'], [26, 2, '*'], [42, 2, '*'], [58, 2, '*'], [70, 2, '*'],
    [8, 27, 'p'], [29, 27, 'p'], [13, 27, 's'], [39, 9, 'o'], [58, 14, 'o'], [52, 9, 'h'], [48, 2, 'q'], [66, 2, 'q'],
    [4, 27, '&'], [17, 27, '+'], [45, 27, '$'], [69, 27, '+'], [72, 27, '%'], [40, 12, '$'], [43, 12, '$']]);
  r.done();
}

// ------------------------------------------------------------------ 6. OPERATIONS DECK  (782,62) 48x32   floor top y=90 (local row 28)
{
  const r = R('p_control', 'Operations Deck', 'plant', 782, 62, 48, 32, { bg: 'bw_lab', ambient: [0.13, 0.17, 0.15], ammo: 'cell' });
  r.shell(2, 'Y'); r.floor(4, 'Y');
  r.open('L', 25, 27);
  r.clear(38, 28, 42, 31);                         // coolant access hatch (door row 28)
  // double-jump climb: floor -> 23 -> 18 -> gantry 13
  r.plat(6, 10, 23); r.plat(12, 16, 18); r.plat(14, 44, 13);
  // director's office (locked): box x2..13, rows 2..13; cavity rows 9..12
  r.solid(2, 2, 13, 13, 'Y'); r.clear(4, 9, 11, 12); r.clear(12, 10, 13, 12);
  r.mark(43, 12, 'terminal', { id: 'pl_t_lockdown', title: 'SECURITY CONSOLE - LOCKDOWN CONTROL', lines: [
    'SITE LOCKDOWN: ACTIVE\nINITIATED BY: SENTRY UNIT WARDEN-9\nREASON: "UNAUTHORISED PERSONNEL"\nAFFECTED PERSONNEL: ALL\nDURATION: INDEFINITE',
    'OVERRIDE AVAILABLE: COOLANT ACCESS HATCH.\nAUTHORISATION REQUIRED: NONE.\n\nSAFETY NOTICE: The hatch leads to Coolant Hall B. Coolant Hall B is flooded. Please do not remove your suit. If you have no suit, please do not remove your skin.',
    'COOLANT ACCESS HATCH: UNLOCKED.\n\nHave a productive shift!' ], onRead: { flag: 'pl_lockdown_lifted', hint: 'COOLANT ACCESS HATCH UNLOCKED.\nIt is in the floor at the east end of the deck.', hintDur: 6 } });
  r.mark(16, 12, 'terminal', { id: 'pl_t_director', title: "DIRECTOR'S TERMINAL - DR. ELIAS VANCE", hack: { wl: 8, n: 8 }, lines: [
    'MERIDIAN PROJECT - STATUS\n\nFUSION CORE ASSEMBLY 3: COMPLETE.\nVAULT-TEC ORDER 213-F: ONE (1) FUSION CORE, PRIORITY ALPHA.\nCLIENT: VAULT 213 OVERSEER SYSTEM.\nCLIENT NOTE: "Please deliver to the reactor gate. By hand. Do not use the pneumatic tube."',
    "DIRECTOR'S NOTE:\nThe Core is stored in the Reactor Chamber under Level 7 clearance. Warden-9 holds the keycard. Warden-9 holds everything.\n\nI gave the Sentry one instruction: nobody gets in without my say-so. I have since had the misfortune of becoming nobody.",
    'If the vault ever sends anyone for the Core: it is not a battery. It is the difference between a reactor that runs for a thousand years and one that runs for a thousand seconds. Vault-Tec wants it for something under their feet. I never asked what. I should have asked what.\n\n- E.V.\n\n[Office door unlocked.]' ], onRead: { flag: 'pl_director_open' } });
  r.mark(12, 12, 'door', { lock: 'terminal:pl_t_director', style: 'blast', w: 2, h: 3, label: 'DIRECTOR', hint: "The Director's office is locked.\nThe terminal outside is password protected." });
  r.mark(38, 28, 'door', { lock: 'terminal:pl_t_lockdown', style: 'blast', w: 5, h: 1, label: 'COOLANT', hint: 'COOLANT ACCESS HATCH: LOCKED DOWN.\nOverride it at the security console on the upper gantry.' });
  r.mark(9, 12, 'pickup', { k: 'upgrade', u: 'hp' });
  r.mark(5, 12, 'locker', { loot: [{ k: 'weapon', id: 'laser_rifle' }, { k: 'ammo', type: 'cell', n: 40 }, { k: 'stimpak' }] });
  r.mark(7, 12, 'pickup', { k: 'holotape', id: 'tape_pl_director' });
  r.mark(2, 27, 'trigger', { w: 2, h: 3, id: 'pl_control_say', say: [['OVERSEER', 'The Fusion Core is stored at the reactor level. Please retrieve it before the vault finishes failing. I estimate you have... [static] ...an approximate amount of time.', 7], ['OVERSEER', 'Please do not lick anything in the Operations Deck. Some of it is still on.', 5]] });
  r.mark(11, 27, 'trigger', { w: 3, h: 3, id: 'pl_hint_dj', hint: 'JET BOOTS: press JUMP again in mid-air to double-jump.\nThe upper gantry is out of single-jump range.', hintDur: 6 });
  r.ents([[5, 27, 'Z'], [9, 27, 'N'], [10, 2, '*'], [24, 2, '*'], [38, 2, '*'], [16, 27, 'p'], [32, 27, 'p'], [20, 2, 'q'], [36, 2, 'q'],
    [28, 8, 'h'], [24, 19, 'o'], [40, 20, 'o'], [22, 27, '+'], [44, 27, '$'], [30, 27, '%'], [26, 12, '$']]);
  r.done();
}

// ------------------------------------------------------------------ 7. COOLANT FLOOD HALL  (794,94) 72x36   dock top y=120 (local row 26), pool floor y=126 (local row 32)
{
  const r = R('p_flood', 'Coolant Flood Hall', 'plant', 794, 94, 72, 36, { bg: 'bw_concrete', ambient: [0.10, 0.16, 0.12], rad: 0.2, ammo: '.308' });
  r.shell(2); r.floor(4);
  r.clear(26, 0, 30, 1);                           // drop from the operations deck
  r.open('L', 23, 25);                             // -> p_decon
  r.solid(2, 26, 15, 31, 'C');                     // west dock (dry): doorway at rows 23..25
  r.water(16, 28, 49, 31);                         // the pool
  r.ladder(16, 25, 31);                            // climb out of the pool onto the dock
  // catwalks: top gantry (row 8) -> ladder at x=48 -> mid catwalk (row 22) with a 9-wide dash gap
  r.plat(22, 33, 8); r.plat(37, 47, 8);
  r.ladder(48, 8, 21);
  r.plat(40, 49, 22); r.plat(22, 30, 22); r.plat(16, 20, 22);
  // bulkhead + flooded pump room (hazmat)
  r.solid(50, 2, 51, 27, '#');
  r.water(50, 28, 51, 31); r.water(52, 2, 69, 31);
  r.solid(56, 14, 59, 31, '#'); r.solid(62, 20, 65, 31, '#'); r.solid(64, 8, 69, 9, '#');
  r.mark(67, 7, 'pickup', { k: 'bobble', stat: 'I' });
  r.mark(44, 21, 'steam', { dir: -1, len: 3, period: 3.4, on: 1.1 });
  r.mark(28, 21, 'steam', { dir: -1, len: 3, period: 3.0, on: 1.0 });
  r.mark(46, 21, 'trigger', { w: 3, h: 3, id: 'pl_hint_rad', hint: 'RADIATION WARNING: the coolant is irradiated.\nThe pump room behind the bulkhead is flooded. A Hazmat Suit is advised.', hintDur: 8 });
  r.ents([[10, 2, 'l'], [24, 2, '*'], [42, 2, '*'], [24, 7, 'p'], [24, 21, 'p'], [40, 2, 'q'], [34, 14, 'h'], [44, 12, 'o'], [7, 25, 's'], [12, 25, 's'],
    [30, 7, '+'], [45, 7, '$'], [18, 21, '&'], [4, 25, '%'], [14, 25, '$'], [54, 30, '&'], [60, 12, '&'], [67, 30, '$']]);
  r.done();
}

// ------------------------------------------------------------------ 8. DECONTAMINATION LOCKERS  (754,94) 40x30   floor top y=120 (local row 26)
{
  const r = R('p_decon', 'Decontamination Lockers', 'plant', 754, 94, 40, 30, { bg: 'bw_lab', ambient: [0.16, 0.20, 0.19], ammo: 'shell' });
  r.shell(2, 'Y'); r.floor(4, 'Y');
  r.open('L', 23, 25); r.open('R', 23, 25);
  r.mark(18, 25, 'terminal', { id: 'pl_t_warden', title: 'SENTRY UNIT SB-9 "WARDEN-9" - MAINTENANCE RECORD', lines: [
    'UNIT: SENTRY BOT SB-9 (RobCo Heavy Security, Mk IX)\nNICKNAME: "WARDEN-9" (self-assigned)\nLAST SERVICED: 2077-10-22\nNEXT SERVICE: OVERDUE (210y 11m)\n\nTECH NOTE 1: Replaced left gatling capacitor. Unit complained about the paint colour. Unit does not have a paint-colour subroutine.',
    'TECH NOTE 2: Unit asked for a day off. Denied by Director. Unit replied "understood" in a tone I did not care for.\n\nTECH NOTE 3: Unit has begun addressing the janitor bot as "Sweepy". Janitor bot has begun replying. Filing under: Not My Problem.',
    'TECH NOTE 4: WARNING. Do not give the Sentry new orders over the intercom. It interprets "stand down" as "stand, down", and "down", as of yesterday, means through the floor.\n\nTECH NOTE 5: If you are reading this, the unit is behind you.' ] });
  r.mark(24, 25, 'npc', { id: 'pl_sweepy', name: 'Sweepy', outfit: 'robot', face: 1,
    lines: ['Good day, valued Meridian associate! I am Sweepy, your janitorial Protectron. I have been cleaning this floor for two hundred and ten years, three months and fourteen days. It is not clean.',
      'Alarms. Doors. The Director shouting at the intercom. Then nothing. Then Warden-9 began its rounds. I stayed out of its way. It has a very firm sense of duty and no sense of humour.',
      'Warden-9 does not accept visitors. Or resignations. Or anything, really. It tried to fire me once. I am now on permanent probation. To pass you will need to convince it, or perforate it. I recommend the latter, with dignity.',
      'The showers are offline. But I can offer a virtual decontamination! *psssst* There. You are zero percent cleaner. Thank you for choosing Meridian Decon.',
      'The Fusion Core? Kept in the reactor vault, Level 7. Warden-9 has the keycard. It also has the last Hazmat suit. It is also standing on my mop. Please retrieve my mop.'],
    topics: ['What happened here?', 'The Sentry Bot?', 'Can I get decontaminated?', 'The Fusion Core?'] });
  r.mark(21, 25, 'pickup', { k: 'holotape', id: 'tape_pl_janitor' });
  r.mark(12, 25, 'locker', { loot: [{ k: 'radaway' }, { k: 'radaway' }, { k: 'radx' }, { k: 'stimpak' }] });
  r.mark(4, 25, 'trigger', { w: 2, h: 3, id: 'pl_decon_say', say: [['OVERSEER', 'Sleeper Seven. There is an unregistered Sentry Bot beyond that door. Designation Warden-9. It has been on duty for two hundred years without a break. Please do not take it personally.', 8], ['OVERSEER', 'Its manufacturer recommends surrender. I recommend a laser rifle.', 5]] });
  r.mark(1, 25, 'door', { lock: 'open', style: 'blast', w: 1, h: 3, label: 'REACTOR' });
  r.mark(38, 25, 'door', { lock: 'open', style: 'blast', w: 1, h: 3, label: 'DECON' });
  r.mark(29, 25, 'trigger', { w: 3, h: 3, id: 'pl_bed_hint', hint: 'The bunk is safe. Rest and save here: the Reactor Chamber is next.\nThe vending machine takes caps.', hintDur: 7 });
  r.ents([[32, 25, 'Z'], [27, 25, 'N'], [5, 25, 'Q'], [7, 25, 'Q'], [9, 25, 'Q'], [8, 2, '*'], [20, 2, '*'], [32, 2, '*'], [15, 25, '&'], [35, 25, '+'], [36, 25, '%'], [14, 25, '$']]);
  r.done();
}

// ------------------------------------------------------------------ 9. REACTOR ARENA  (706,94) 48x30   floor top y=120 (local row 26)   BOSS: SENTRY BOT WARDEN-9
{
  const r = R('p_reactor', 'Reactor Chamber', 'plant', 706, 94, 48, 30, { bg: 'bw_concrete', ambient: [0.14, 0.20, 0.15], ammo: 'cell' });
  r.shell(2); r.floor(4);
  r.open('L', 23, 25); r.open('R', 23, 25);
  r.plat(5, 11, 23); r.plat(36, 42, 23); r.plat(19, 28, 19);
  r.mark(40, 25, 'arena', { boss: 'sentry', floor: 26, gates: [{ dx: 6, dy: -2, w: 2, h: 3 }], spawn: [-28, 0] });
  r.mark(43, 25, 'trigger', { w: 2, h: 3, id: 'pl_boss_sentry', boss: 'sentry', repeat: true, once: false });
  r.mark(0, 25, 'door', { lock: 'flag:boss_sentry', style: 'blast', w: 2, h: 3, label: 'EXIT', hint: 'The exit is sealed while Warden-9 is online.' });
  r.mark(20, 25, 'pickup', { k: 'ability', id: 'hazmat', requires: 'boss_sentry' });
  r.mark(23, 25, 'pickup', { k: 'key', id: 'level7', name: 'Level 7', col: '#ff5a48', requires: 'boss_sentry' });
  r.mark(26, 25, 'pickup', { k: 'key', id: 'fusioncore', name: 'Fusion Core', col: '#5cffb0', requires: 'boss_sentry' });
  r.ents([[10, 2, '*'], [24, 2, '*'], [38, 2, '*'], [2, 20, 'l'], [45, 20, 'l']]);
  r.done();
}

// ------------------------------------------------------------------ holotapes
H.tape_pl_diary = { title: "Foreman Pike's Diary", text: [
  "Day 1. Alarms at 09:14. The wall by Gate 1 came down and took the guard shack with it. Nobody hurt. Which is to say: nobody who mattered. The Director says stay calm. The Director says a lot of things.",
  "Day 2. The Sentry locked down the plant. Says all personnel are unauthorised. I told it I have worked here for nineteen years. It said 'noted.' Then it shot the vending machine.",
  "Day 3. Hid my kid's bobblehead, the Intelligence one, in the pump room behind the flood bulkhead before the coolant backed up. It says 'Smarter' on the base. You would need a proper Hazmat suit to fetch it now. I keep meaning to get a suit. I keep meaning a lot of things." ] };
H.tape_pl_director = { title: 'Director Vance - Last Log', text: [
  "Director Elias Vance, day six. The Sentry has stopped taking my orders. I am locked in my own Operations Deck with a door I cannot open and a Mr. Handy that keeps offering me tea.",
  "Vault-Tec's Meridian order was always strange. They wanted the Fusion Core 'intact and unregistered'. I asked why. They said: for the sleepers. I said: what sleepers? The line went dead. I have been thinking about that line ever since." ] };
H.tape_pl_janitor = { title: 'Janitorial Unit MR-J4N', text: [
  "Log entry 73,410. I have mopped Decontamination Hall B. It is not clean. I will mop Decontamination Hall B.",
  "Log entry 73,411. I have mopped Decontamination Hall B. It is not clean. The Sentry says hello. The Sentry has never said hello. I have logged this as an anomaly and, secretly, as a friend." ] };

})();
