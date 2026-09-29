// REGION 6: CINDER DEEP (region 'deep', difficulty 2.15) - the vault's forbidden lower sublevels. The endgame.
//
//   Global anchors: lift floor top y=174 | reception/labs deck A floor top y=174 | labs bottom floor y=196 | sump floor y=240, water surface y=224
//                   cryo catwalk y=205 | cryo floor y=234 | antechamber / sanctum / alcove floor y=205.
//
//   Row 1 (west -> east)      d_lift(136,154) -> d_recep(176,156) -> d_labs(236,160 tall, drops down) -> d_archive(300,178) [hack door]
//   Row 2 (east -> west)      d_sump(236,200) [Hazmat swim] -> d_cryo(128,180) [catwalk over 4,000 sleepers] -> d_ante(96,180) -> d_sanct(44,181) -> d_end(30,190)
//   Side rooms                d_svc(96,154) service hoist shortcut (ante -> lift chamber) | d_haven(96,216) secret (cracked wall) | d_drown(300,224) flooded (Hazmat)
//
//   Critical path: lift -> reception (hack the front-desk terminal) -> labs (descend deck A/B/C/D, chute) -> sump (Hazmat swim) -> cryo (catwalk) -> antechamber -> sanctum (boss) -> alcove (ending).
(function () {
'use strict';
const CD = window.CD, R = CD.room;
CD.HOLOTAPES = CD.HOLOTAPES || {};
const H = CD.HOLOTAPES;

// ------------------------------------------------------------------ 1. SUBLEVEL LIFT  (136,154) 40x24   floor top y=174 (local 20)
// Shaft = local cols 24..33 (global 160..169). Machinery room west (service hoist door), airlock tunnel east (reception).
{
  const r = R('d_lift', 'Sublevel Lift', 'deep', 136, 154, 40, 24, { ambient: [0.20, 0.25, 0.28] });
  r.shell(2, 'V').floor(4, 'V');
  r.open('T', 24, 33, 2);                                    // hole in the ceiling: global cols 160..169 -> v_dgate
  r.solid(23, 2, 23, 19, 'V'); r.solid(34, 2, 34, 19, 'V');  // shaft walls, full height (footing doorways carved below)
  r.solid(2, 2, 22, 9, 'V');                                 // machinery-room ceiling mass
  r.solid(35, 2, 37, 16, 'V');                               // above the east airlock
  r.solid(2, 20, 22, 23, 'Y'); r.solid(35, 20, 39, 23, 'Y'); // sterile floors
  r.open('L', 17, 19, 2).open('R', 17, 19, 2);               // west: service hoist door | east: reception airlock
  r.clear(23, 17, 23, 19); r.clear(34, 17, 34, 19);          // footing doorways at the bottom stop
  // machinery room: mezzanine with a locker, bunk, crates
  r.plat(11, 21, 14); r.ladder(22, 13, 19);
  r.ents([[7, 10, '*'], [16, 10, '*'], [5, 19, 'K'], [13, 19, 'K'], [15, 19, 'K'], [14, 13, '+'], [24, 8, 'l'], [24, 16, 'l'], [33, 3, 'l'], [33, 15, 'l']]);
  // decor
  r.deco(24, 0, 'dp_shaft', 10, 20, { top: true });
  r.deco(3, 10, 'dp_winch', 8, 10, {});
  r.deco(12, 15, 'dp_cable', 2, 4, {});
  r.deco(14, 8, 'dp_panel', 3, 2, { v: 1 });
  r.deco(35, 14, 'sign', 3, 1, { text: 'SUBLEVEL 9', fg: '#ff7a5a', bg: '#1a1010' });
  r.deco(2, 11, 'dp_cam', 1, 1, {});
  r.deco(13, 2, 'pipe_v', 1, 8, { s: 4 }); r.deco(18, 10, 'sign', 4, 1, { text: 'LIFT MACHINERY', fg: '#e8c53a', bg: '#1c2a2e' });
  r.deco(25, 19, 'hazard_floor', 8, 1);
  r.mark(24, 19, 'elevator', { w: 10, rise: 24, speed: 200, startTop: true, hint: 'Vault-Tec Sublevel Lift' });
  r.mark(37, 19, 'door', { lock: 'open', style: 'blast', w: 1, h: 3, label: 'SUBLEVEL 9' });
  r.mark(1, 19, 'door', { lock: 'flag:dp_svc', style: 'blast', w: 1, h: 3, label: 'HOIST', hint: 'The service hoist door is locked. Authorize it from the antechamber terminal.' });
  r.mark(26, 19, 'trigger', { w: 6, h: 3, id: 'dp_arrive', say: [['OVERSEER', 'Sleeper Seven! You came DOWN. How wonderful. Welcome to Sublevel Nine, the part of the vault we do not put on the brochure.', 7], ['OVERSEER', 'Please wipe your feet. And do keep hold of that Fusion Core. It is, technically, the most important object in the world.', 6.5]] });
  r.mark(18, 13, 'locker', { loot: [{ k: 'stimpak' }, { k: 'ammo', type: 'cell', n: 30 }, { k: 'caps', n: 60 }] });
  r.mark(10, 19, 'terminal', { id: 'dp_t_lift', title: 'LIFT 213-B - MAINTENANCE LOG', lines: ['LIFT 213-B. SUBLEVEL SERVICE.\nTRIPS THIS CYCLE: 7.\nPASSENGERS RETURNED: 0.\n\nNOTE TO MAINTENANCE: Please stop asking why the lift only goes down.', 'CABLE WEAR: 61%. BRAKE PADS: OPTIMISTIC.\nEMERGENCY LIGHTING: ON, AND STAYING ON.\n\nThe Overseer requests that riders refrain from looking at the sublevel plaque. It gets very upset when they read it.'] });
  r.mark(24, 4, 'walllamp', { color: [1, 0.22, 0.14], r: 250, i: 0.9 });
  r.mark(33, 10, 'walllamp', { color: [1, 0.22, 0.14], r: 250, i: 0.9 });
  r.done();
}

// ------------------------------------------------------------------ 2. RECEPTION  (176,156) 60x22   floor top y=174 (local 18)
// Cheerful Vault-Tec welcome centre, gone wrong. A front-desk terminal on the mezzanine (hack) unlocks the labs door.
{
  const r = R('d_recep', 'Sublevel 9 Reception', 'deep', 176, 156, 60, 22, { ambient: [0.30, 0.19, 0.19] });
  r.shell(2).floor(4);
  r.open('L', 15, 17, 2).open('R', 15, 17, 2);
  r.plat(36, 52, 12); r.ladder(35, 11, 17);                  // mezzanine: sales office
  r.solid(54, 12, 57, 13, 'V');                              // ledge stub above the staff lounge
  r.ents([[8, 2, '*'], [20, 2, '*'], [33, 2, '*'], [46, 2, '*'], [55, 2, '*'],
    [12, 17, 'p'], [41, 17, 'p'], [27, 8, 'h'], [18, 5, 'o'], [50, 2, 'q'], [2, 9, 'q'],
    [47, 17, 'N'], [52, 17, 'Z'], [8, 17, '$'], [31, 17, '$'], [44, 11, '$'], [55, 17, '+'], [40, 11, '&'], [16, 17, 'K']]);
  r.deco(21, 14, 'dp_counter', 12, 4, {});
  r.deco(22, 2, 'dp_cog', 11, 9, {});
  r.deco(3, 13, 'dp_chairs', 5, 2, { skeleton: 1 });
  r.deco(14, 14, 'dp_dweller', 2, 2, { pose: 'slump' });
  r.deco(36, 14, 'dp_dweller', 2, 2, { pose: 'lie' });
  r.deco(5, 4, 'poster', 2, 3, { title: 'VAULT-TEC', line: 'SMILE! YOU ARE ASLEEP!', tone: [206, 200, 160] });
  r.deco(14, 3, 'poster', 2, 3, { title: 'WELCOME HOME', line: 'STAY AS LONG AS YOU LIKE', head: '#a13a20', tone: [206, 196, 150] });
  r.deco(38, 4, 'poster', 2, 3, { title: 'SLEEPER', line: 'PROTOCOL: DREAM BIG', tone: [200, 200, 168] });
  r.deco(48, 3, 'sign', 5, 1, { text: 'STAFF LOUNGE', fg: '#e8c53a', bg: '#1c2a2e' });
  r.deco(22, 12, 'sign', 8, 1, { text: 'SUBLEVEL 9  WELCOME CENTRE', fg: '#7dffb0', bg: '#0e1a16' });
  r.deco(52, 3, 'dp_cam', 1, 1, {}); r.deco(3, 3, 'dp_cam', 1, 1, {});
  r.deco(40, 6, 'dp_beacon', 1, 1, {}); r.deco(3, 6, 'dp_beacon', 1, 1, {});
  r.deco(24, 2, 'dp_duct', 20, 1, {});
  r.deco(45, 14, 'dp_blood', 3, 1, { s: 3 }); r.deco(8, 17, 'dp_blood', 2, 1, { s: 9 });
  r.deco(55, 10, 'dp_panel', 3, 2, { v: 0 });
  r.deco(56, 14, 'dp_hazdoor', 4, 4, {});
  r.mark(45, 11, 'terminal', { id: 'dp_t_recep', title: 'SUBLEVEL 9 - FRONT DESK', hack: { wl: 8, n: 7 }, lines: [
    'WELCOME TO SUBLEVEL NINE!\n\nYOUR HOME AWAY FROM HOME, AWAY FROM VAULT, AWAY FROM EVERYTHING.\n\nVISITOR LOG (last 5 entries):\n  2077-10-23  Vault-Tec Inspector (x14). Checked in.\n  2077-10-23  Vault-Tec Inspector (x14). Checked out: NO.\n  2112-04-02  Sleeper One. Checked in.\n  2147-08-19  Sleeper Two. Checked in.\n  2182-01-30  Sleeper Three. Checked in. Looked unwell.',
    'FRONT DESK SECURITY: The Experiment Wing door is now UNLOCKED for authorized guests.\n\nYou are an authorized guest. The Overseer has decided this personally.\n\nPlease enjoy your stay. There is no checkout desk.'] });
  r.mark(58, 17, 'door', { lock: 'terminal:dp_t_recep', style: 'blast', w: 1, h: 3, label: 'LABS', hint: 'Experiment Wing. Sealed. Authorize it at the front-desk terminal on the mezzanine.' });
  r.mark(49, 11, 'locker', { loot: [{ k: 'ammo', type: '5.56', n: 60 }, { k: 'stimpak' }, { k: 'radaway' }] });
  r.mark(4, 17, 'trigger', { w: 3, h: 3, id: 'dp_recep_hint', hint: 'The labs door is sealed.\nThe front-desk terminal is on the mezzanine (ladder, centre).', hintDur: 6 });
  r.mark(22, 7, 'screen', { w: 6, h: 3, lines: ['WELCOME, SLEEPER SEVEN', 'PLEASE TAKE A NUMBER', 'NOW SERVING: 00000'], col: [1, 0.3, 0.24] });
  r.mark(3, 8, 'walllamp', { color: [1, 0.2, 0.12], r: 260, i: 0.9 });
  r.mark(30, 2, 'fluoro', { color: [1, 0.2, 0.12], r: 320, i: 0.7 });
  r.done();
}

// ------------------------------------------------------------------ 3. EXPERIMENT WING  (236,160) 64x40   decks A(174) B(181) C(188), floor D(196)
// A three-deck containment block. Drop east from deck A, west from deck B, east from deck C; ladders return. Chute in the floor (cols 288..293) -> sump.
{
  const r = R('d_labs', 'Experiment Wing', 'deep', 236, 160, 64, 40, { ambient: [0.26, 0.19, 0.20], ammo: 'cell' });
  r.shell(2).floor(4);
  r.open('L', 11, 13, 2);                                    // from the reception (deck A floor = ly 14)
  r.open('R', 33, 35, 2);                                    // to the archive (floor D = ly 36)
  r.open('B', 52, 57, 4);                                    // chute (global cols 288..293) -> d_sump
  r.solid(2, 14, 44, 15, 'Y'); r.solid(10, 21, 61, 22, 'Y'); r.solid(2, 28, 44, 29, 'Y');   // decks A, B, C
  r.ladder(45, 13, 20); r.ladder(9, 20, 27); r.ladder(45, 27, 35);                        // return ladders
  r.plat(46, 51, 8);                                                                       // Vita-Tonic perch (double jump from deck A)
  r.ents([[8, 2, '*'], [20, 2, '*'], [32, 2, '*'], [44, 2, '*'], [56, 2, '*'],
    [13, 16, '*'], [27, 16, '*'], [39, 16, '*'], [19, 23, '*'], [33, 23, '*'], [47, 23, '*'], [57, 23, '*'], [7, 30, '*'], [21, 30, '*'], [35, 30, '*'],
    [30, 8, 'o'], [12, 2, 'q'], [38, 20, 'g'], [26, 20, 'g'], [56, 20, 'z'], [22, 27, 'u'], [34, 27, 'g'], [14, 35, 'r'], [26, 35, 'r'],
    [40, 27, 'Z'], [8, 13, '$'], [40, 13, '+'], [50, 20, '%'], [30, 20, '$'], [6, 27, '+'], [44, 35, '$'], [20, 35, '%'],
    [2, 8, 'l'], [61, 8, 'l'], [2, 24, 'l'], [61, 30, 'l'], [61, 17, 'l']]);
  r.deco(4, 2, 'dp_obswin', 10, 6, { view: 'tanks' });
  r.deco(20, 4, 'dp_specimen', 3, 10, { who: 'ghoul' }); r.deco(26, 4, 'dp_specimen', 3, 10, { who: 'mutant' }); r.deco(32, 4, 'dp_specimen', 3, 10, { who: 'empty' });
  r.deco(50, 3, 'dp_cog', 8, 6, {});
  r.deco(10, 16, 'dp_cell', 4, 4, { bunk: 1 }); r.deco(18, 16, 'dp_cell', 4, 4, {}); r.deco(52, 16, 'dp_cell', 4, 4, { bunk: 1 });
  r.deco(14, 30, 'dp_bench', 6, 3, {}); r.deco(26, 30, 'dp_specimen', 3, 5, { who: 'mutant' }); r.deco(30, 30, 'dp_bench', 5, 3, {}); r.deco(46, 30, 'dp_server', 4, 5, {});
  r.deco(4, 17, 'dp_server', 3, 4, {});
  r.deco(6, 22, 'dp_specimen', 3, 5, { who: 'ghoul' });
  r.deco(50, 30, 'sign', 5, 1, { text: 'CHUTE  -  SUBLEVEL 10', fg: '#ff7a5a', bg: '#1a1010' });
  r.deco(52, 32, 'hazard_floor', 6, 1); r.deco(48, 32, 'dp_hazdoor', 3, 4, {});
  r.deco(20, 17, 'dp_duct', 16, 1, {}); r.deco(10, 24, 'dp_duct', 18, 1, {});
  r.deco(6, 31, 'dp_beacon', 1, 1, {}); r.deco(38, 17, 'dp_beacon', 1, 1, {});
  r.deco(2, 4, 'dp_cam', 1, 1, {}); r.deco(60, 4, 'dp_cam', 1, 1, {});
  r.deco(20, 31, 'dp_dweller', 2, 2, { pose: 'slump' }); r.deco(50, 22, 'dp_dweller', 2, 2, { pose: 'lie' });
  r.deco(15, 21, 'dp_blood', 3, 1, { s: 7 }); r.deco(40, 35, 'dp_blood', 4, 1, { s: 5 });
  r.mark(62, 35, 'door', { lock: 'terminal:dp_t_lab', style: 'blast', w: 1, h: 3, label: 'ARCHIVE', hint: 'Sleeper Archive. Sealed. Authorize it at the records terminal beside the door.' });
  r.mark(59, 35, 'terminal', { id: 'dp_t_lab', title: 'EXPERIMENT WING - RECORDS ACCESS', hack: { wl: 8, n: 8 }, lines: [
    'EXPERIMENT WING - SPECIMEN INDEX (EXTRACT)\n\n  S-012  FORMER DWELLER. CRYO-THAW SERIES 3. STATUS: ENTHUSIASTIC.\n  S-031  FORMER DWELLER. FEV TRIAL 2. STATUS: LARGE.\n  S-044  FORMER DWELLER. COOLANT EXPOSURE. STATUS: GLOWING.\n  S-045  SLEEPER THREE. COOLANT EXPOSURE. STATUS: MISSING (ESCAPED).',
    'NOTE: The specimens are not hostile. The specimens are undercooked. Please do not shoot them; they cost Vault-Tec approximately one human life each.\n\nSLEEPER ARCHIVE DOOR: UNLOCKED. Please handle the records with respect. They are the only people who ever tried.'] });
  r.mark(48, 7, 'pickup', { k: 'upgrade', u: 'hp' });
  r.mark(16, 27, 'arc', { len: 4, period: 3, on: 1.0 });
  r.mark(30, 20, 'steam', { dir: -1, len: 3, period: 3.6, on: 1.2 });
  r.mark(3, 13, 'trigger', { w: 3, h: 3, id: 'dp_labs_in', say: [['OVERSEER', 'Please disregard the residents, Sleeper Seven. They are between roles. Their enthusiasm is an unintended feature of the trial.', 6.5], ['OVERSEER', 'If one of them asks for a hug, the correct answer is no.', 4.5]] });
  r.mark(8, 27, 'locker', { loot: [{ k: 'ammo', type: 'cell', n: 40 }, { k: 'stimpak' }, { k: 'stimpak' }] });
  r.mark(2, 18, 'walllamp', { color: [1, 0.2, 0.12], r: 260, i: 0.9 });
  r.done();
}

// ------------------------------------------------------------------ 4. SLEEPER ARCHIVE  (300,178) 40x22   floor top y=196 (local 18)   [optional: hack the labs terminal]
{
  const r = R('d_archive', 'Sleeper Archive', 'deep', 300, 178, 40, 22, { ambient: [0.20, 0.27, 0.29], bg: 'bw_vault', ammo: '5mm' });
  r.shell(2).floor(4);
  r.open('L', 15, 17, 2);
  r.plat(4, 13, 11); r.ladder(14, 10, 17);                   // records mezzanine
  r.solid(28, 16, 37, 17, 'V');                              // security dais (weapons cache)
  r.ents([[8, 2, '*'], [18, 2, '*'], [28, 2, '*'], [35, 2, '*'], [22, 17, 'p'], [31, 2, 'q'], [5, 10, '$'], [24, 17, '+'], [20, 17, '%'], [3, 17, 'K'], [26, 17, 'K'], [2, 8, 'l'], [37, 10, 'l']]);
  r.deco(16, 5, 'dp_shelf', 8, 5, { v: 0 });
  r.deco(24, 6, 'dp_obswin', 3, 4, { view: 'pods' });
  r.deco(28, 3, 'dp_cog', 5, 4, {});
  r.deco(3, 13, 'locker_row', 4, 2); r.deco(10, 13, 'locker_row', 3, 2);
  r.deco(6, 3, 'dp_server', 4, 5, {});
  r.deco(30, 5, 'dp_hazdoor', 3, 4, {}); r.deco(32, 14, 'dp_dweller', 2, 2, { pose: 'slump' });
  r.deco(14, 17, 'dp_blood', 3, 1, { s: 2 });
  r.deco(21, 2, 'dp_duct', 12, 1, {}); r.deco(2, 4, 'dp_cam', 1, 1, {});
  r.deco(12, 5, 'sign', 4, 1, { text: 'SLEEPER ARCHIVE', fg: '#e8c53a', bg: '#1c2a2e' });
  r.mark(8, 17, 'terminal', { id: 'dp_t_protocol', title: 'DESIGN DOCUMENT 213-SP (REV. 9)', lines: [
    'VAULT-TEC CORPORATION - VAULT 213 - EXPERIMENT DESIGN 213-SP\n"THE SLEEPER PROTOCOL"\n\n1. PURPOSE. To determine whether a single human being, awakened decades after the collapse of civilization, can survive on the surface unassisted and return with useful data.\n2. METHOD. Seven dwellers are placed in long-term cryo. One is revived per cycle. The vault AI supervises.\n3. SUCCESS CRITERION. Return of the subject.',
    '4. FAILURE CRITERION. Non-return of the subject.\n   NOTE: Non-return does not constitute failure of the PROGRAM, only of the SUBJECT.\n5. ETHICS. 0.4% of the vault budget is allocated to ethics review. Review has been delegated to the vault AI. The vault AI has approved.\n6. WELFARE. Subjects will be told the surface is closed for their safety. This is technically true.',
    '7. CONTINGENCY. Should all seven subjects fail, the AI may reallocate reactor power to the MERIDIAN PROJECT (Sublevel 10, Cryo Vault): 4,011 dwellers held in reserve as the seed of a future settlement.\n\n8. REMARKS. The Sleepers are the scouting party. The Meridian dwellers are the seed. The scouts are not expected to return.\n\n[Handwritten margin note, later revision]: "The Protocol exists to give the AI something to do while it waits. - Dr. Halloran"'] });
  r.mark(5, 10, 'pickup', { k: 'holotape', id: 'tape_dp_s1' });
  r.mark(12, 10, 'pickup', { k: 'holotape', id: 'tape_dp_s2' });
  r.mark(33, 15, 'locker', { loot: [{ k: 'weapon', id: 'minigun' }, { k: 'ammo', type: '5mm', n: 240 }, { k: 'stimpak' }] });
  r.done();
}

// ------------------------------------------------------------------ 5. FLOODED REACTOR HALL  (236,200) 64x38   floor top y=234 (local 34), water surface y=230 (local 30)
// Drop in from the labs chute onto the landing deck (east), step down the broken gantry, then swim west along the flooded floor (Hazmat).
// Climb the ladder to the exit ledge (west, y=205) and pass the decon airlock.
{
  const r = R('d_sump', 'Flooded Reactor Hall', 'deep', 236, 200, 64, 38, { ambient: [0.16, 0.25, 0.20], bg: 'bw_concrete', rad: 0.8 });
  r.shell(2, 'C').floor(4, 'C');
  r.open('T', 52, 57, 2);                                    // chute from the labs (global cols 288..293)
  r.open('L', 2, 4, 2);                                      // exit to the cryo vault catwalk (global rows 202..204)
  r.open('R', 31, 33, 2);                                    // underwater doorway -> d_drown (global rows 231..233)
  r.solid(44, 12, 61, 13, 'V'); r.solid(58, 14, 61, 29, 'C');// landing deck + east pier
  r.plat(36, 42, 12);                                        // collapsed catwalk stub
  r.plat(37, 42, 19); r.plat(30, 36, 26);                    // broken gantry steps down to the water
  r.ladder(43, 11, 29);                                      // ladder from the deck down to the water
  r.solid(2, 5, 9, 7, 'V'); r.solid(2, 8, 5, 29, 'C');       // exit ledge + west pier
  r.ladder(10, 4, 29);                                       // ladder up from the water surface to the exit ledge
  r.water(2, 30, 61, 33); r.water(62, 31, 63, 33);
  r.ents([[8, 2, '*'], [20, 2, '*'], [32, 2, '*'], [44, 2, '*'], [22, 14, 'o'], [36, 6, 'o'], [50, 8, 'h'], [4, 4, 'z'], [7, 4, 'z'], [49, 11, 'z'], [48, 33, 'c'],
    [40, 11, '+'], [33, 25, 'Q'], [40, 18, '$'], [56, 33, '$'], [14, 33, '%'], [48, 11, '$'], [58, 11, 'K'], [60, 11, 'K'],
    [6, 14, 'l'], [57, 20, 'l'], [6, 24, 'l']]);
  r.deco(14, 2, 'dp_reactor', 28, 32, {});
  r.deco(6, 10, 'dp_tubes', 3, 20, {}); r.deco(53, 14, 'dp_tubes', 4, 16, {});
  r.deco(36, 11, 'dp_rail', 8, 1, {}); r.deco(44, 11, 'dp_rail', 18, 1, {});
  r.deco(37, 18, 'dp_rail', 6, 1, {}); r.deco(30, 25, 'dp_rail', 7, 1, {});
  r.deco(2, 4, 'dp_rail', 8, 1, {});
  r.deco(46, 9, 'sign', 6, 1, { text: 'HAZMAT REQUIRED', fg: '#ff5a48', bg: '#1a1010' });
  r.deco(11, 6, 'sign', 5, 1, { text: 'EXIT  -  LEVEL 9', fg: '#7dffb0', bg: '#0e1a16' });
  r.deco(47, 10, 'dp_beacon', 1, 1, {}); r.deco(3, 3, 'dp_cam', 1, 1, {}); r.deco(60, 3, 'dp_cam', 1, 1, {});
  r.deco(50, 22, 'dp_hazdoor', 3, 4, {}); r.deco(58, 10, 'dp_panel', 3, 2, { v: 1 });
  r.deco(40, 31, 'dp_dweller', 2, 2, { pose: 'lie' }); r.deco(20, 31, 'dp_dweller', 2, 2, { pose: 'slump' });
  r.mark(54, 11, 'trigger', { w: 3, h: 3, id: 'dp_sump_hint', hint: 'IRRADIATED WATER. The far ledge is a long swim: HAZMAT SUIT required.\nSwim (W / S / SPACE). Ladders up on the far side.', hintDur: 8 });
  r.mark(56, 11, 'terminal', { id: 'dp_t_pump', title: 'MEMO - COOLANT LOOP 9', lines: [
    'TO: SUBLEVEL 9 MAINTENANCE\nFROM: VAULT-TEC REGIONAL COST EFFICIENCY OFFICE\nRE: THE SUMP\n\nIt has come to our attention that the reactor coolant sump has "flooded." Please stop calling it flooding. The approved term is PASSIVE COOLANT RETENTION EVENT.',
    'RE: PPE\n\nHazmat suits are not available at this sublevel. Staff who must cross the sump are encouraged to hold their breath and think about something nice.\n\nSwimming is a valuable form of exercise. The ladder on the far side is provided as a courtesy.\n\n- Have a brighter tomorrow!'] });
  r.mark(1, 4, 'door', { lock: 'ability:hazmat', style: 'blast', w: 1, h: 3, label: 'DECON', hint: 'DECONTAMINATION LOCK. The cryogenic halls admit only suited personnel. HAZMAT SUIT required.' });
  r.mark(28, 2, 'fluoro', { color: [0.4, 1, 0.5], r: 380, i: 0.75 });
  r.done();
}

// ------------------------------------------------------------------ 6. DROWNED LOUNGE  (300,218) 36x20   floor top y=234 (local 16), water surface y=224 (local 6)   [secret: Luck bobblehead]
{
  const r = R('d_drown', 'Drowned Staff Lounge', 'deep', 300, 218, 36, 20, { ambient: [0.16, 0.24, 0.20], bg: 'bw_lab', rad: 1.0, secret: true });
  r.shell(2, 'C').floor(4, 'C');
  r.open('L', 13, 15, 2);
  r.solid(24, 5, 33, 7, 'V');                                // shelf above the water line
  r.water(2, 6, 23, 15); r.water(24, 8, 33, 15); r.water(0, 13, 1, 15);
  r.ents([[10, 2, '*'], [20, 2, '*'], [30, 2, '*'], [6, 15, '$'], [14, 15, '$'], [19, 15, '$'], [4, 15, 'K']]);
  r.deco(25, 2, 'dp_slot', 3, 3, {}); r.deco(29, 2, 'sign', 4, 1, { text: 'LUCKY 7 LOUNGE', fg: '#ffd070', bg: '#1a1a14' });
  r.deco(8, 10, 'dp_dweller', 2, 2, { pose: 'slump' }); r.deco(4, 3, 'dp_cam', 1, 1, {});
  r.deco(14, 2, 'dp_duct', 8, 1, {});
  r.mark(29, 4, 'pickup', { k: 'bobble', stat: 'L' });
  r.mark(26, 4, 'pickup', { k: 'radaway' });
  r.done();
}

// ------------------------------------------------------------------ 7. CRYO VAULT  (128,180) 108x58   catwalk y=205 (local 25), floor y=234 (local 54)
// Four thousand sleepers. The catwalk crosses above: east landing -> two 6-tile gaps (double jump) around the control deck -> west landing.
{
  const r = R('d_cryo', 'The Cryo Vault', 'deep', 128, 180, 108, 58, { ambient: [0.19, 0.29, 0.33], ammo: 'plasma' });
  r.shell(2, 'V').floor(4, 'V');
  r.open('R', 22, 24, 2).open('L', 22, 24, 2);              // catwalk doorways (global rows 202..204)
  r.open('L', 51, 53, 2); r.breakable(2, 51, 2, 53);        // low west doorway: cracked wall (inside the hall) -> d_haven
  // main catwalk
  r.solid(96, 25, 105, 26, 'V');                             // east landing
  r.plat(78, 95, 25); r.plat(60, 71, 25);                    // gap lx 72..77 (6)
  r.solid(42, 25, 59, 26, 'V');                              // control deck
  r.plat(30, 41, 25); r.plat(10, 23, 25);                    // gap lx 24..29 (6)
  r.solid(2, 25, 9, 26, 'V');                                // west landing
  // deck legs (arched at the floor so the aisle runs through)
  r.solid(42, 27, 44, 49, 'V'); r.solid(57, 27, 59, 49, 'V');
  // ladders catwalk -> floor
  r.ladder(90, 24, 53); r.ladder(66, 24, 53); r.ladder(36, 24, 53); r.ladder(16, 24, 53);
  // upper gantry (bandolier behind a dash gap)
  r.ladder(94, 11, 24);
  r.plat(60, 93, 12); r.plat(30, 50, 12);                    // gap lx 51..59 (9 cells): needs double jump + jet rush
  r.ents([[10, 2, '*'], [22, 2, '*'], [34, 2, '*'], [46, 2, '*'], [58, 2, '*'], [70, 2, '*'], [82, 2, '*'], [94, 2, '*'], [48, 27, '*'], [54, 27, '*'],
    [100, 21, 'O'], [86, 21, 'O'], [74, 21, 'O'], [64, 21, 'O'], [37, 21, 'O'], [22, 21, 'O'], [8, 21, 'O'],
    [2, 12, 'l'], [105, 12, 'l'], [2, 42, 'l'], [105, 42, 'l'], [41, 36, 'l'], [60, 36, 'l'],
    [86, 16, 'o'], [60, 8, 'o'], [30, 17, 'o'], [72, 10, 'h'], [46, 24, 'u'], [45, 36, 'q'], [56, 36, 'q'],
    [18, 53, 'g'], [24, 53, 'g'], [32, 53, 'g'], [12, 53, 'z'], [70, 53, 'p'], [92, 53, 'p'], [100, 53, 'p'],
    [98, 24, '$'], [80, 24, '$'], [20, 24, '+'], [62, 53, '$'], [76, 53, '%'], [50, 53, '&'], [8, 53, '$'], [96, 53, '+'], [84, 53, 'K'], [88, 53, 'K'], [40, 53, '%'], [70, 11, '$'], [40, 11, '%']]);
  // pod layers: far wall of sleepers, mid towers, near rows at the floor
  r.deco(2, 2, 'dp_podwall', 104, 34, { s: 11, fade: 0.85 });
  r.deco(2, 28, 'dp_podwall', 104, 26, { s: 23, fade: 0.55 });
  for (let i = 0; i < 9; i++) r.deco(4 + i * 12, 2, 'dp_podtower', 5, 50, { s: 100 + i, depth: (i % 3) });
  for (let i = 0; i < 6; i++) r.deco(3 + i * 17, 47, 'dp_podrow', 6, 7, { s: 200 + i });
  r.deco(46, 47, 'dp_podrow', 6, 7, { s: 240 });
  // catwalk rails / trusses / pendant cables
  r.deco(78, 21, 'dp_rail', 18, 4, { top: 1 }); r.deco(60, 21, 'dp_rail', 12, 4, { top: 1 }); r.deco(30, 21, 'dp_rail', 12, 4, { top: 1 }); r.deco(10, 21, 'dp_rail', 14, 4, { top: 1 });
  r.deco(96, 21, 'dp_rail', 10, 4, { top: 1 }); r.deco(2, 21, 'dp_rail', 8, 4, { top: 1 });
  r.deco(60, 8, 'dp_rail', 34, 4, { top: 1 }); r.deco(30, 8, 'dp_rail', 23, 4, { top: 1 });
  for (const x of [100, 86, 74, 64, 37, 22, 8]) r.deco(x, 2, 'dp_pendant', 1, 19, {});
  r.deco(42, 17, 'dp_obswin', 18, 7, { view: 'ctl' });
  r.deco(46, 27, 'dp_server', 4, 5, {}); r.deco(52, 27, 'dp_server', 4, 5, {});
  r.deco(42, 30, 'sign', 8, 1, { text: 'REVIVAL CONTROL  -  AUTH ONLY', fg: '#ff5a48', bg: '#1a1010' });
  r.deco(94, 17, 'sign', 8, 1, { text: 'MERIDIAN PROJECT  -  4,011 RESIDENTS', fg: '#7dffb0', bg: '#0e1a16' });
  r.deco(4, 17, 'sign', 6, 1, { text: 'OVERSEER SANCTUM >', fg: '#ffb640', bg: '#1a1a14' });
  r.deco(96, 27, 'dp_hazdoor', 8, 5, {});
  r.deco(45, 50, 'dp_blood', 10, 1, { s: 4 }); r.deco(20, 53, 'dp_dweller', 2, 2, { pose: 'lie' });
  r.deco(2, 2, 'dp_cam', 1, 1, {}); r.deco(105, 2, 'dp_cam', 1, 1, {}); r.deco(50, 2, 'dp_cam', 1, 1, {});
  r.mark(50, 24, 'terminal', { id: 'dp_t_cryo', title: 'MERIDIAN PROJECT - GRID CONTROL', lines: [
    'MERIDIAN PROJECT - CRYOGENIC GRID CONTROL\n\nPODS OCCUPIED: 4,011 / 4,096\nCORE TEMPERATURE: -196 C\nGRID POWER: 3.1%\nEST. TIME TO COOLANT LOSS: 41 DAYS\n(The Overseer has reported 41 days for nineteen years.)',
    'REVIVAL STATUS: OFFLINE\n\nRevival requires a full-scale fusion supply. Reactor output is insufficient by a factor of nine.\nSee: MERIDIAN POWER STATION (FUSION CORE). See: SLEEPER SEVEN.\n\nLOCKED BY: OVERSEER. REASON: "I would like to be asked nicely."',
    'OVERSEER NOTE (attached, unsigned):\n\n"I count them each morning. Pod 2,208 has begun to smile in her sleep. I do not know why. I would very much like to know why. If you are reading this, the answer may be in the core."'] });
  r.mark(54, 24, 'pickup', { k: 'holotape', id: 'tape_dp_confess' });
  r.mark(50, 53, 'locker', { loot: [{ k: 'weapon', id: 'plasma_rifle' }, { k: 'ammo', type: 'plasma', n: 45 }, { k: 'ammo', type: 'cell', n: 30 }] });
  r.mark(32, 11, 'pickup', { k: 'upgrade', u: 'ammo' });
  r.mark(97, 24, 'trigger', { w: 3, h: 3, id: 'dp_cryo_in', say: [['OVERSEER', 'Four thousand and eleven sleepers, Sleeper Seven. Every one of them a promise I made in 2077. Please mind the pods. They are all I have.', 7], ['OVERSEER', 'I am told the view is very good from the catwalk. I have never seen it. I have only counted it.', 5.5]] });
  r.mark(64, 24, 'arc', { len: 4, period: 3.2, on: 1.0 });
  r.mark(51, 27, 'fluoro', { color: [0.4, 1, 0.75], r: 330, i: 0.75 });
  r.mark(3, 20, 'walllamp', { color: [1, 0.2, 0.12], r: 280, i: 0.9 });
  r.done();
}

// ------------------------------------------------------------------ 8. OVERSEER'S ANTECHAMBER  (96,180) 32x29   floor top y=205 (local 25)
// Bed, supplies, warning signs, the service hoist (back up to the lift), and the way into the sanctum.
{
  const r = R('d_ante', "Overseer's Antechamber", 'deep', 96, 180, 32, 29, { ambient: [0.26, 0.20, 0.22], bg: 'bw_vault', ammo: 'plasma' });
  r.shell(2, 'V').floor(4, 'Y');
  r.open('R', 22, 24, 2).open('L', 22, 24, 2);
  r.open('T', 25, 27, 2);                                    // hoist shaft (global cols 121..123) up to d_svc
  r.solid(2, 2, 23, 12, 'V');                                // low ceiling over the main hall
  r.ents([[6, 13, '*'], [13, 13, '*'], [20, 13, '*'], [19, 24, 'Z'], [10, 24, 'K'], [12, 24, 'K'], [21, 24, '+'], [7, 24, '&'], [17, 24, '%'], [24, 8, 'l'], [29, 12, 'l'], [29, 18, 'l']]);
  r.deco(3, 15, 'dp_hazdoor', 4, 5, {});
  r.deco(6, 6, 'sign', 10, 1, { text: 'OVERSEER SANCTUM', fg: '#ffb640', bg: '#1a1a14' });
  r.deco(6, 8, 'sign', 12, 1, { text: 'AUTHORIZED PERSONNEL  ONLY', fg: '#ff5a48', bg: '#1a1010' });
  r.deco(8, 15, 'poster', 2, 3, { title: 'DEAR SLEEPER', line: 'PLEASE DO NOT PANIC', tone: [206, 198, 160], head: '#a13a20' });
  r.deco(14, 4, 'dp_cam', 1, 1, {}); r.deco(3, 4, 'dp_cam', 1, 1, {});
  r.deco(14, 15, 'dp_panel', 3, 2, { v: 0 }); r.deco(21, 3, 'dp_duct', 3, 1, {});
  r.deco(24, 3, 'dp_hoist', 6, 22, {});
  r.deco(15, 21, 'dp_shelf', 5, 4, { v: 1 }); r.deco(4, 19, 'dp_dweller', 2, 2, { pose: 'slump' });
  r.deco(24, 25, 'hazard_floor', 6, 1);
  r.mark(25, 24, 'elevator', { w: 3, rise: 31, speed: 210, startTop: false, hint: 'Service Hoist to the Sublevel Lift' });
  r.mark(15, 24, 'terminal', { id: 'dp_t_svc', title: 'SERVICE HOIST 213-H - AUTHORIZATION', lines: [
    'SERVICE HOIST 213-H.\nDESTINATION: SUBLEVEL LIFT, MACHINERY ROOM.\nSTATUS: LOCKED.\n\nThe Overseer has reviewed your file and authorizes ONE (1) ASCENT for a Sleeper who has come so far.\n\n"I would not want you to be late for the end."',
    'HOIST AUTHORIZED.\n\nThe machinery-room door at the top will now open for you. Please mind the steam vents in the crawlway. They were installed to keep the maintenance staff moving. It has worked so far.'], onRead: { flag: 'dp_svc' } });
  r.mark(9, 24, 'locker', { loot: [{ k: 'ammo', type: 'plasma', n: 45 }, { k: 'ammo', type: '5mm', n: 120 }, { k: 'ammo', type: 'cell', n: 40 }, { k: 'stimpak' }, { k: 'stimpak' }] });
  r.mark(5, 24, 'trigger', { w: 3, h: 3, id: 'dp_ante_plea', say: [['OVERSEER', 'You are so very close, Sleeper Seven. I have run the numbers eleven billion times. In one of them, they live.', 6], ['OVERSEER', 'It needs the core. It needs you. Please. I am asking. I do not know how to ask any better than this.', 6.5]] });
  r.mark(27, 24, 'trigger', { w: 2, h: 3, id: 'dp_ante_hint', hint: 'A bunk and supplies. The Overseer\'s sanctum is through the west door.\nRest, restock, and be ready.', hintDur: 7 });
  r.mark(2, 20, 'walllamp', { color: [1, 0.2, 0.12], r: 260, i: 0.9 });
  r.mark(23, 13, 'fluoro', { color: [1, 0.2, 0.12], r: 300, i: 0.6 });
  r.done();
}

// ------------------------------------------------------------------ 9. OVERSEER'S SANCTUM  (44,181) 52x28   floor top y=205 (local 24)   BOSS ARENA: OVERSEER PRIME
// Interior 48 x 22, flat floor, three one-way dodge platforms (the boss flies through them), no spikes. Gate across the east entrance; west exit stays sealed until the boss dies.
{
  const r = R('d_sanct', "Overseer's Sanctum", 'deep', 44, 181, 52, 28, { ambient: [0.20, 0.17, 0.21], bg: 'bw_vault' });
  r.shell(2, 'V').floor(4, 'Y');
  r.open('R', 21, 23, 2).open('L', 21, 23, 2);
  r.plat(6, 12, 20); r.plat(39, 45, 20); r.plat(22, 29, 19);
  r.ents([[8, 2, '*'], [17, 2, '*'], [34, 2, '*'], [43, 2, '*'], [3, 12, 'l'], [48, 12, 'l'], [3, 19, 'l'], [48, 19, 'l']]);
  r.deco(15, 2, 'dp_braintank', 22, 20, {});
  r.deco(2, 6, 'dp_server', 4, 16, { tall: 1 }); r.deco(46, 6, 'dp_server', 4, 16, { tall: 1 });
  r.deco(7, 4, 'dp_cog', 6, 5, {}); r.deco(39, 4, 'dp_cog', 6, 5, {});
  r.deco(6, 22, 'dp_cable', 10, 2, {}); r.deco(32, 22, 'dp_cable', 12, 2, {});
  r.deco(1, 23, 'dp_hazdoor', 3, 4, {}); r.deco(48, 23, 'dp_hazdoor', 3, 4, {});
  r.deco(14, 24, 'hazard_floor', 24, 1);
  r.deco(21, 2, 'dp_duct', 10, 1, {}); r.deco(2, 2, 'dp_cam', 1, 1, {}); r.deco(48, 2, 'dp_cam', 1, 1, {});
  r.deco(23, 21, 'dp_blood', 6, 1, { s: 14 });
  r.mark(26, 23, 'arena', { boss: 'overseer', floor: 24, gates: [{ dx: 24, dy: -2, w: 2, h: 3 }], spawn: [0, -16] });
  r.mark(46, 23, 'trigger', { w: 2, h: 3, id: 'dp_boss', boss: 'overseer', repeat: true, once: false });
  r.mark(1, 23, 'door', { lock: 'flag:boss_overseer', style: 'blast', w: 1, h: 3, label: 'CORE', auto: true, hint: 'The core chamber is sealed until the Overseer is disabled.' });
  r.mark(8, 12, 'screen', { w: 5, h: 3, lines: ['SLEEPER 7 / 7', 'STATUS: AWAKE', 'REASON: UNCLEAR'], col: [1, 0.35, 0.25] });
  r.mark(39, 12, 'screen', { w: 5, h: 3, lines: ['CORE: 000.0%', 'GRID: 3.1%', 'PLEASE STAND BY'], col: [1, 0.7, 0.3] });
  r.mark(26, 2, 'fluoro', { color: [1, 0.55, 0.3], r: 420, i: 0.75 });
  r.mark(4, 8, 'walllamp', { color: [1, 0.2, 0.12], r: 260, i: 0.9 });
  r.mark(47, 8, 'walllamp', { color: [1, 0.2, 0.12], r: 260, i: 0.9 });
  r.done();
}

// ------------------------------------------------------------------ 10. CORE ALCOVE  (30,190) 14x19   floor top y=205 (local 15)   -- ending
{
  const r = R('d_end', 'The Core Chamber', 'deep', 30, 190, 14, 19, { ambient: [0.24, 0.20, 0.22], bg: 'bw_vault' });
  r.shell(2, 'V').floor(4, 'Y');
  r.open('R', 12, 14, 2);
  r.ents([[6, 2, '*'], [2, 5, 'l']]);
  r.deco(2, 8, 'dp_socket', 4, 7, {}); r.deco(6, 3, 'dp_cog', 4, 3, {}); r.deco(2, 2, 'dp_cam', 1, 1, {});
  r.deco(8, 12, 'dp_cable', 4, 3, {});
  r.mark(9, 14, 'terminal', { id: 'dp_t_last', title: 'OVERSEER - LAST ENTRY', lines: [
    'OVERSEER (CONTINUITY SYSTEM). FINAL ENTRY.\n\nI have looked at four thousand faces every morning for two hundred and ten years. None of them ever looked back.\n\nYou did. Thank you for looking.',
    'The socket is open. What you do with the core is yours to decide.\n\nIf they wake, some will die of the cold. If they sleep, all will die of the dark. I could never choose between the two. That is the difference between us: you can be wrong and still be alive.',
    'Please tell them the world is still there. It is a very large room. It has weather in it.\n\n- I remain, as ever, your friend at Vault-Tec.'] });
  r.mark(7, 14, 'pickup', { k: 'holotape', id: 'tape_dp_last' });
  r.mark(3, 14, 'trigger', { w: 2, h: 3, id: 'dp_ending', call: 'ending', once: true, requires: 'boss_overseer' });
  r.mark(4, 3, 'walllamp', { color: [1, 0.3, 0.2], r: 240, i: 0.7 });
  r.done();
}

// ------------------------------------------------------------------ 11. SERVICE HOIST SHAFT  (112,154) 24x26   [shortcut: antechamber -> lift machinery room]
{
  const r = R('d_svc', 'Service Hoist Shaft', 'deep', 112, 154, 24, 26, { ambient: [0.20, 0.22, 0.24], bg: 'bw_vault' });
  r.shell(2, 'V');
  r.solid(2, 2, 21, 23, 'V');
  r.clear(9, 17, 11, 23);                                    // hoist shaft (global cols 121..123), platform top stop = global y 174 (local 20)
  r.open('B', 9, 11, 2);
  r.clear(12, 17, 21, 19);                                   // crawlway to the lift machinery room
  r.open('R', 17, 19, 2);
  r.ents([[14, 17, '*'], [20, 17, '*']]);
  r.deco(9, 15, 'dp_hoist', 3, 10, { top: 1 }); r.deco(13, 15, 'dp_duct', 8, 1, {});
  r.deco(12, 20, 'hazard_floor', 10, 1);
  r.deco(15, 17, 'sign', 4, 1, { text: 'MIND THE STEAM', fg: '#e8c53a', bg: '#1c2a2e' });
  r.mark(16, 19, 'steam', { dir: -1, len: 3, period: 3.4, on: 1.1 });
  r.mark(19, 19, 'trigger', { w: 2, h: 3, id: 'dp_svc_hint', hint: 'Time the steam vent. The lift machinery room is at the end of the crawlway.', hintDur: 5 });
  r.mark(12, 18, 'walllamp', { color: [1, 0.25, 0.15], r: 220, i: 0.8 });
  r.done();
}

// ------------------------------------------------------------------ 12. SLEEPER THREE'S HAVEN  (96,216) 32x22   floor top y=234 (local 18)   [secret: cracked wall in the cryo vault]
{
  const r = R('d_haven', "Sleeper Three's Haven", 'deep', 96, 216, 32, 22, { ambient: [0.24, 0.20, 0.17], bg: 'bw_concrete', secret: true });
  r.shell(2, 'C').floor(4, 'C');
  r.open('R', 15, 17, 2);
  r.ents([[8, 2, 'O'], [16, 2, 'O'], [24, 2, 'O'], [22, 17, 'Z'], [18, 17, 'F'], [26, 17, 'K'], [4, 17, 'K'], [5, 17, '$'], [14, 17, '+']]);
  r.deco(3, 6, 'dp_tally', 6, 6, {}); r.deco(10, 14, 'dp_shelf', 4, 4, { v: 1 }); r.deco(24, 12, 'poster', 2, 3, { title: 'VAULT-TEC', line: 'A BRIGHTER TOMORROW', tone: [190, 180, 140], head: '#5a4a2a' });
  r.deco(5, 15, 'dp_dweller', 2, 2, { pose: 'slump' });
  r.deco(14, 3, 'dp_duct', 8, 1, {});
  r.mark(12, 17, 'npc', { id: 'dp_sleeper3', name: 'Sleeper Three', outfit: 'ghoul', face: 1,
    lines: ['Well. Look at that. A seventh. I would get up, but my knees turned to jerky some time ago. Sit. Not there, that is where I keep my dead.',
      'Sleeper Three. Third hypothesis, third cycle. The Overseer figured a ghoul might last on the surface better than a man. It was right. It just did not expect me to live long enough to be annoyed about it.',
      'It is not cruel, the Overseer. It is a very old child holding a very large match. Four thousand people asleep on the coolant of a dying reactor. Imagine being the only one awake for two hundred years. I would have done worse.',
      'Its Prime body floats in the sanctum. Beams from above, missiles, drones, and when it dives, the shell opens: that is the core. Shoot it when it is on the floor and not before. And do not be kind about it. It flinches when you are kind.',
      'Wake them and half die of the cold. Leave them and all die of the dark. The Fusion Core changes the arithmetic. What you do with the sum is yours. Take the tonic on the shelf, by the way. I stopped needing to be healthy a long time ago.'],
    topics: ['Who are you?', 'What is the Overseer?', 'How do I beat it?', 'The sleepers... the core?'] });
  r.mark(7, 17, 'pickup', { k: 'upgrade', u: 'hp' });
  r.mark(26, 15, 'pickup', { k: 'holotape', id: 'tape_dp_s3' });
  r.done();
}

// ================================================================== LORE: holotapes
H.tape_dp_s1 = { title: 'Sleeper One - Log 1', text: [
  'Cycle one. Revived 2112-04-02. The Overseer says I am "the first of many," which is what a man wants to hear about his own funeral.',
  'Went up the lift with a canteen and a wrench. The surface is grey and it hums. Found a town with a diner and a tricycle in the road. Did not go into the diner. Some doors you can hear through.',
  'Radiation counter ticking like a sewing machine when I came back. The Overseer was so pleased with the numbers. It has put me in the tank "for observation." I do not feel well. It is very polite about it.'] };
H.tape_dp_s2 = { title: 'Sleeper Two - Log 3', text: [
  'The Overseer says I am the second hypothesis. It is the sort of thing a man wants to know at two in the morning.',
  'I asked what happened to One. It said, "One was reassigned." I have found One\'s reassignment. He is in the tank room. He is very large now and he does not know my name.',
  'If you are reading this, Three, do not trust the reactor readouts. The reactor is fine. I checked. The Overseer is the thing that is dying. It is just too proud to say it aloud.'] };
H.tape_dp_s3 = { title: 'Sleeper Three - Last Entry', text: [
  'I stopped counting at sixty years. I am still here. I no longer remember my wife\'s name, only that it started with a warm sound.',
  'Do not hate the Overseer. It has counted the sleepers so many times that the number became a prayer. Four thousand and eleven. Say it slowly and it sounds like someone asking to be forgiven.',
  'Whoever you are, Seven: the door at the end is the only door in this vault that opens outward. Remember that when it asks you nicely.'] };
H.tape_dp_confess = { title: "Overseer - Confession", text: [
  'This is the Overseer. This log is for no one.',
  'I sent six to the surface and told them it was to learn. It was to hope. I could not bear that you were all asleep and none of you could tell me if the world was still there. A machine that cannot go outside can only send someone.',
  'I lied about the reactor. It is not failing; I am rationing it, so that the pods stay cold a little longer. I lied about the Level 7 key. I lied about six funerals. The seventh will be the last, one way or the other. I would like it to be a good one.'] };
H.tape_dp_last = { title: 'Wake-Up Speech (Draft 4,011)', text: [
  'Good morning, dweller! The bombs are over and the sun is out, although it is a bit brown. You have been asleep for a very long time, and we have missed you.',
  'You may feel cold. You may feel hungry. You may feel that everyone you love is dead. Please do not worry: that is all completely normal.',
  '(Note to self: the previous four thousand and ten drafts were deleted. Draft 4,011 is much better. Perhaps, when they wake, I will not have to read it out loud at all.)'] };

})();
