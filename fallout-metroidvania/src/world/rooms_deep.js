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
  r.ents([[7, 10, '*'], [16, 10, '*'], [5, 19, 'K'], [13, 19, 'K'], [15, 19, 'K'], [9, 13, '+'], [30, 12, 'l'], [24, 16, 'l'], [33, 3, 'l'], [33, 17, 'l']]);
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
    [12, 17, 'p'], [41, 17, 'p'], [27, 8, 'h'], [18, 5, 'o'], [46, 2, 'q'], [2, 9, 'q'],
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
    [30, 10, 'l'], [3, 24, 'l'], [60, 30, 'l']]);
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

})();
