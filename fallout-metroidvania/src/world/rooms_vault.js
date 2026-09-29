// REGION 1: VAULT 213. Global anchors: start floor top y=150; shaft x=112..136; atrium floor top y=94; arena floor top y=82; surface ground y=56.
(function () {
'use strict';
const CD = window.CD, R = CD.room;

// ------------------------------------------------------------------ 1. CRYO BAY  (8,134) 44x20  floor top y=150
{
  const r = R('v_cryo', 'Cryo Bay', 'vault', 8, 134, 44, 20);
  r.shell(2).floor(4).open('R', 13, 15);
  r.ents([[6, 15, '@'], [8, 2, '*'], [20, 2, '*'], [33, 2, '*'], [20, 15, 'K'], [32, 15, 'r'], [35, 15, '$']]);
  r.solid(26, 14, 27, 15, '#');                       // low barrier: first jump
  r.deco(2, 13, 'pods', 8, 3, { states: ['open', 'dead', 'closed'] });
  r.deco(12, 13, 'pods', 4, 3, { states: ['closed', 'dead'] });
  r.deco(14, 5, 'poster', 2, 3, { title: 'VAULT-TEC', line: 'A BRIGHTER TOMORROW', tone: [200, 190, 150] });
  r.deco(22, 6, 'sign', 3, 1, { text: 'CRYO BAY 6', fg: '#e8c53a', bg: '#1c2a2e' });
  r.deco(36, 13, 'desk', 2, 2);
  r.mark(38, 15, 'terminal', { id: 't_cryo', title: 'VAULT 213 - CRYOGENIC REVIVAL', lines: [
    'REVIVAL SEQUENCE COMPLETE.\n\nSUBJECT: SLEEPER SEVEN (7 OF 7)\nDURATION: 210 YEARS, 3 MONTHS, 9 DAYS\nSTATUS: ...ALIVE (SURPRISINGLY)',
    'NOTICE FROM YOUR OVERSEER:\n\nSleepers One through Six have been reassigned to other duties. Please do not ask where. Please do not look in the lower pods. Please enjoy your revival experience.',
    'REACTOR STATUS: FLUCTUATING\nWATER RECLAMATION: FAILING\nOVERSEER OPINION: OPTIMISTIC\n\nPlease report to the Reactor Corridor. You are needed.' ] });
  r.mark(9, 15, 'trigger', { w: 2, h: 3, id: 'wake', say: [['OVERSEER', 'Good morning, Sleeper Seven. This is the Vault-Tec Overseer System, speaking on behalf of your friends at Vault-Tec.', 6], ['OVERSEER', 'Cryogenic revival complete after two hundred and ten years. Please remain calm and do not lick the pod.', 5.5], ['OVERSEER', 'A minor power fault has occurred. Please proceed east to the Reactor Corridor and assist the vault in a cheerful and timely manner.', 6.5]], hint: 'A / D  -  MOVE        SPACE  -  JUMP        E  -  INTERACT', hintDur: 7 });
  r.mark(23, 15, 'trigger', { w: 2, h: 3, id: 'melee_hint', hint: 'K  or  RIGHT CLICK  -  MELEE ATTACK  (your trusty wrench)\nHit crates for loot.', hintDur: 6 });
  r.done();
}

// ------------------------------------------------------------------ 2. REACTOR CORRIDOR  (52,138) 60x16  floor top y=150
{
  const r = R('v_corr', 'Reactor Corridor', 'vault', 52, 138, 60, 16);
  r.shell(2).floor(4).open('L', 9, 11).open('R', 9, 11);
  r.ents([[7, 2, '*'], [19, 2, '*'], [31, 2, '*'], [43, 2, '*'], [55, 2, '*'], [16, 11, 'r'], [36, 11, 'r'], [42, 11, '$'], [58, 9, 'l']]);
  // pit with spikes (4 wide)
  r.clear(24, 12, 27, 14).spikes(24, 27, 14);
  // low wall + raised shelf
  r.solid(39, 10, 40, 11, '#');
  r.solid(45, 9, 53, 11, '#');            // shelf 3 high with locker
  r.ent(47, 8, '%');
  r.plat(30, 34, 8);                      // optional platform (secret stash above)
  r.ent(32, 7, '+');
  r.deco(3, 6, 'poster', 2, 3, { title: 'RADIATION', line: 'STAY CALM', head: '#a13a20', tone: [210, 200, 160] });
  r.deco(12, 5, 'hatch', 2, 2); r.deco(27, 3, 'vent', 2, 2);
  r.mark(14, 11, 'steam', { dir: -1, len: 3, period: 3.4, on: 1.1 });
  r.mark(50, 8, 'locker', { loot: [{ k: 'weapon', id: 'pistol10' }, { k: 'ammo', type: '10mm', n: 36 }, { k: 'stimpak' }] });
  r.mark(20, 11, 'trigger', { w: 2, h: 3, id: 'crouch_hint', hint: 'Spikes and steam vents hurt.\nJump the pit. Watch the vent timing.', hintDur: 5 });
  r.mark(44, 11, 'trigger', { w: 2, h: 3, id: 'gun_hint', hint: 'Open the locker with E.\nLEFT CLICK / J  -  SHOOT     R  -  RELOAD     Q  -  STIMPAK', hintDur: 8 });
  r.done();
}

// ------------------------------------------------------------------ 3. MAINTENANCE SHAFT  (112,64) 24x90   left/right doors, central artery
// local rows: floor top 86 (global 150). Side openings (global): L/R 147..149 -> rows 83..85 | tools 130..132 -> 66..68 | living 113..115 -> 49..51 | atrium 91..93 -> 27..29
{
  const r = R('v_shaft', 'Maintenance Shaft', 'vault', 112, 64, 24, 90);
  r.shell(2).floor(4);
  r.open('L', 83, 85).open('R', 83, 85).open('R', 66, 68).open('R', 49, 51).open('R', 27, 29);
  // bottom: ladder up to the tool-room ledge (single-jump section)
  r.ladder(5, 70, 85);
  r.plat(2, 8, 69);                                       // landing above the ladder
  r.solid(12, 69, 21, 70, '#');                           // tool room ledge (top row 69)
  // ---- double-jump section 1: rows 64, 59, 54 (spacing 5)
  r.plat(2, 9, 64); r.plat(12, 19, 59); r.plat(2, 9, 54);
  r.solid(12, 52, 21, 53, '#');                           // living quarters ledge (top row 52)
  // ---- section 2: rows 47, 42, 37, 32
  r.plat(2, 9, 47); r.plat(12, 19, 42); r.plat(2, 9, 37); r.plat(2, 9, 33);
  r.solid(12, 30, 21, 31, '#');                           // atrium ledge (top row 30)
  // sealed reactor door (right, bottom) is in v_dgate; hazard details
  r.ents([[16, 68, 'r'], [7, 85, 'r'], [16, 58, 'f'], [8, 44, 'f'], [17, 51, 'r'], [16, 29, 'r']]);
  [[2, 8], [2, 24], [2, 40], [2, 56], [2, 74], [21, 16], [21, 36], [21, 46], [21, 62], [21, 80]].forEach((p) => r.ent(p[0], p[1], 'l'));
  r.mark(19, 85, 'steam', { dir: -1, len: 4, period: 4, on: 1.2 });
  r.mark(15, 41, 'steam', { dir: -1, len: 3, period: 3.2, on: 1.0 });
  r.deco(9, 62, 'pipe_v', 1, 20, { s: 5 }); r.deco(18, 40, 'pipe_v', 1, 26, { s: 9 }); r.deco(9, 20, 'pipe_v', 1, 30, { s: 12 });
  r.deco(12, 80, 'sign', 4, 1, { text: 'REACTOR', fg: '#e07a3a', bg: '#1a1e22' }); r.deco(4, 10, 'sign', 4, 1, { text: 'ATRIUM  UP', fg: '#7dffb0', bg: '#0e1a16' });
  r.deco(11, 45, 'sign', 5, 1, { text: 'LIVING QTRS', fg: '#e8c53a', bg: '#1c2a2e' }); r.deco(11, 66, 'sign', 5, 1, { text: 'TOOLS / LOCKERS', fg: '#e8c53a', bg: '#1c2a2e' });
  r.deco(14, 85, 'hazard_floor', 6, 1);
  r.mark(6, 68, 'trigger', { w: 4, h: 3, id: 'shaft_hint', hint: 'Climb ladders with W / S.\nThe upper shaft is too far to jump...', hintDur: 5 });
  r.done();
}

// ------------------------------------------------------------------ 4. TOOL LOCKERS / JET BOOTS  (136,124) 30x14  floor top y=133
{
  const r = R('v_tools', 'Tool Lockers', 'vault', 136, 124, 30, 14);
  r.shell(2).floor(5).open('L', 6, 8);
  r.ents([[6, 2, '*'], [22, 2, 'O'], [12, 8, 'r'], [16, 8, '$']]);
  r.deco(4, 7, 'locker_row', 6, 2); r.deco(12, 6, 'poster', 2, 2, { title: 'SAFETY', line: 'FIRST', tone: [210, 200, 150] });
  r.deco(20, 9, 'bones', 1, 1); r.deco(18, 9, 'debris', 1, 1); r.deco(24, 9, 'debris', 1, 1);
  r.mark(22, 8, 'pickup', { k: 'ability', id: 'jetboots' });
  r.mark(19, 8, 'pickup', { k: 'holotape', id: 'tape_s6' });
  r.mark(8, 8, 'terminal', { id: 't_tools', title: 'MAINTENANCE LOCKER CONTROL', lines: ['LOCKER 6-A: JET-ASSIST BOOTS (PROTOTYPE)\nStatus: SIGNED OUT.\nBy: SLEEPER SIX.\nReturn date: OVERDUE.', 'NOTE: Boots are calibrated for vertical maintenance of the central shaft. Tenth-of-a-second thrust bursts. Do NOT use indoors near open flame.'] });
  r.done();
}

// ------------------------------------------------------------------ 5. LIVING QUARTERS  (136,96) 64x26  floor top y=116 (local 20)
{
  const r = R('v_living', 'Living Quarters', 'vault', 136, 96, 64, 26);
  r.shell(2).floor(6).open('L', 17, 19).open('R', 17, 19);
  r.ents([[8, 2, '*'], [22, 2, '*'], [36, 2, '*'], [50, 2, '*'], [7, 19, 'Z'], [14, 19, 'r'], [30, 19, 'r'], [46, 19, 'r'], [24, 9, 'f'], [5, 19, 'N'], [58, 19, '+']]);
  // mezzanine
  r.plat(10, 30, 10); r.plat(38, 58, 10); r.ladder(8, 10, 19); r.ladder(60, 10, 19);
  r.ent(20, 9, '$'); r.ent(45, 9, '%'); r.ent(54, 9, 'Q'); r.ent(14, 9, 'r');
  r.deco(12, 17, 'bunk', 3, 3); r.deco(24, 17, 'bunk', 3, 3); r.deco(40, 17, 'bunk', 3, 3);
  r.deco(34, 4, 'poster', 2, 3, { title: 'VAULT-TEC', line: 'FAMILY FIRST', tone: [205, 196, 160] });
  r.deco(46, 4, 'poster', 2, 3, { title: 'WATER', line: 'CONSERVE IT', head: '#1d7a96', tone: [205, 200, 170] });
  r.deco(52, 17, 'locker_row', 3, 3);
  r.mark(3, 19, 'trigger', { w: 2, h: 3, id: 'bed_hint', hint: 'Bunks are safe places.\nPress E on a bed to rest, save and refill health.', hintDur: 6 });
  r.mark(57, 9, 'terminal', { id: 't_living', title: 'RESIDENT LOG - LEVEL 3', lines: ['DAY 4,112. The water chip failed again. Overseer says: drink less.\n\nDAY 4,300. Half the residential wing has been sealed for "renovations." No one is allowed to knock on the walls.', 'DAY 5,001. The Overseer has stopped answering questions and started asking them.\n\nIf you find this: the numbers on the pods are not room numbers.'], holotape: null });
  r.mark(28, 9, 'pickup', { k: 'holotape', id: 'tape_resident' });
  r.done();
}

// ------------------------------------------------------------------ 6. MED BAY  (200,96) 36x26  floor top y=116
{
  const r = R('v_med', 'Med Bay', 'vault', 200, 96, 32, 26);
  r.shell(2).floor(6).open('L', 17, 19);
  r.ents([[6, 2, '*'], [18, 2, '*'], [12, 19, 'p'], [22, 19, '&'], [9, 19, '+'], [16, 19, 'r']]);
  r.deco(3, 17, 'bunk', 3, 3); r.deco(14, 17, 'desk', 2, 2);
  r.solid(24, 14, 29, 19, '#'); r.clear(26, 17, 28, 19); r.breakable(24, 17, 25, 19);   // hidden closet: Power Fist / grenade
  r.mark(19, 19, 'terminal', { id: 't_med', title: 'MED BAY - DR. HALLORAN', hack: { wl: 8, n: 7 }, lines: ['PATIENT LOG.\n\nAll six Sleepers returned to the Med Bay in similar condition: severe exposure, unexplained lacerations, and one thing said in delirium: "THE LIGHT IS NOT THE SUN".', 'Supply cabinet unlocked. Take what you need. The Overseer says the surface is closed. Sleeper Six did not believe that. Sleeper Six is not here anymore.'], onRead: { call: 'medcache' } });
  r.mark(27, 19, 'pickup', { k: 'upgrade', u: 'hp' });
  r.done();
}

// ------------------------------------------------------------------ 7. ATRIUM  (136,64) 96x32   floor top y=94 (local 30)
{
  const r = R('v_atrium', 'Vault Atrium', 'vault', 136, 64, 96, 32);
  r.shell(2).floor(2).open('L', 27, 29).open('R', 15, 17).open('R', 27, 29);
  r.ents([[10, 2, '*'], [28, 2, '*'], [46, 2, '*'], [64, 2, '*'], [82, 2, '*'], [7, 29, 'Z'], [12, 29, 'N'], [22, 29, 'o'], [40, 29, 'p'], [58, 29, 'r'], [66, 29, 'r'], [72, 29, 'p'], [46, 20, 'o'], [80, 15, 'o']]);
  // climb: floor -> A(25) -> B(20) -> balcony(18)
  r.plat(8, 15, 25); r.plat(18, 25, 20);
  r.solid(28, 18, 93, 19, '#');                                            // balcony (top row 18)
  r.plat(36, 40, 24); r.plat(52, 58, 24); r.plat(70, 76, 24);              // mid platforms (optional loot)
  r.ent(38, 23, '$'); r.ent(55, 23, '%'); r.ent(73, 23, '+');
  r.ent(46, 17, 'K'); r.ent(60, 17, 'p'); r.ent(66, 17, 'r');
  // pillars + machinery
  r.deco(38, 22, 'pillar', 1, 8); r.deco(60, 20, 'pillar', 1, 10);
  r.deco(50, 4, 'vaultdoor', 8, 8, {});    // emblem gear on the back wall
  r.deco(20, 4, 'poster', 2, 3, { title: 'VAULT-TEC', line: 'THE FUTURE IS HERE', tone: [206, 196, 152] });
  r.deco(78, 5, 'poster', 2, 3, { title: 'CHEER UP', line: 'YOU ARE SAFE', tone: [206, 196, 152], head: '#a13a20' });
  r.deco(72, 12, 'sign', 4, 1, { text: 'OVERSEER', fg: '#ffb640', bg: '#1a1a14' });
  r.mark(90, 17, 'trigger', { w: 2, h: 3, id: 'warden_warn', say: [['OVERSEER', 'Sleeper Seven, kindly avoid the Vault Door Chamber. The Warden is... performing maintenance. Aggressively.', 6], ['OVERSEER', 'The surface is closed for your safety. Please return to your bunk.', 4]] });
  r.mark(16, 29, 'trigger', { w: 3, h: 3, id: 'atrium_hint', hint: 'Robots ahead.  V  -  V.A.T.S. slow-motion targeting.\nHold your fire until you see them.', hintDur: 6 });
  r.mark(94, 29, 'door', { lock: 'key:overseer', style: 'blast', w: 1, h: 3, label: 'OVERSEER', hint: "The Overseer's office. Requires the OVERSEER keycard." });
  r.mark(30, 19, 'pickup', { k: 'holotape', id: 'tape_overseer' });
  r.done();
}

// ------------------------------------------------------------------ 8. VAULT DOOR CHAMBER / WARDEN ARENA  (232,64) 48x20   floor top y=82 (local 18)
{
  const r = R('v_warden', 'Vault Door Chamber', 'vault', 232, 64, 48, 20);
  r.shell(2).floor(2).open('L', 15, 17).open('R', 15, 17);
  r.ents([[8, 2, '*'], [24, 2, '*'], [40, 2, '*']]);
  r.plat(10, 15, 13); r.plat(32, 37, 13);
  r.deco(15, 2, 'vaultdoor', 16, 14, {});
  r.deco(4, 15, 'hazard_floor', 8, 1); r.deco(36, 15, 'hazard_floor', 8, 1);
  r.mark(4, 17, 'trigger', { w: 2, h: 3, id: 'warden_intro', boss: 'warden', hint: '' });
  r.mark(46, 17, 'door', { lock: 'flag:boss_warden', style: 'blast', w: 1, h: 3, label: 'EXIT', hint: 'The exit is sealed until the Warden is disabled.', auto: true });
  r.done();
}


// ------------------------------------------------------------------ 10. OVERSEER'S OFFICE  (232,86) 36x12   floor top y=94 (local 8)
{
  const r = R('v_office', "Overseer's Office", 'vault', 232, 86, 36, 12);
  r.shell(2).floor(4).open('L', 5, 7);
  r.ents([[8, 2, 'O'], [24, 2, 'O'], [10, 7, 'Z']]);
  r.deco(3, 4, 'desk', 2, 2); r.deco(20, 3, 'vaultdoor', 4, 4, {}); r.deco(14, 4, 'window', 2, 2, { top: '#1a2230', bot: '#3a4a5a' });
  r.mark(28, 7, 'terminal', { id: 't_office', title: 'OVERSEER PERSONAL TERMINAL', hack: { wl: 8, n: 8 }, lines: ['PERSONAL LOG - OVERSEER (AUTOMATED CONTINUITY SYSTEM)\n\nIf a human reads this, I have already lost.', 'Every Sleeper I wake is a hypothesis: that a human can leave the vault and come back. Six have tried. Six have failed. This is not cruelty. It is method.', 'The reactor is dying. Vault-Tec always knew. The Deep Sublevels hold the seed of the Meridian Project: the only thing that can restart the world. I cannot leave. YOU can.\n\nBring me a Fusion Core from the Meridian Power Station. Then I will open Level 7.'], giveKey: null, onRead: { setObjective: 2 } });
  r.mark(24, 7, 'pickup', { k: 'holotape', id: 'tape_overseer2' });
  r.done();
}

// ------------------------------------------------------------------ 11. REACTOR GATE  (136,138) 40x16   floor top y=150 (local 12)  -- sealed until the Overseer keycard
{
  const r = R('v_dgate', 'Reactor Gate', 'vault', 136, 138, 40, 16);
  r.shell(2).floor(4).open('L', 9, 11);
  r.open('B', 24, 33, 4);                                   // lift shaft down to Cinder Deep (global cols 160..169)
  r.solid(18, 2, 22, 8, 'V');                               // bulkhead above the blast door
  r.ents([[6, 2, '*'], [14, 2, '*'], [28, 2, '*'], [35, 2, '*'], [11, 2, 'q'], [30, 11, 'l']]);
  r.deco(6, 8, 'sign', 7, 1, { text: 'LEVEL 7  RESTRICTED', fg: '#ff5a48', bg: '#1a1010' });
  r.deco(24, 10, 'hazard_floor', 10, 1); r.deco(2, 7, 'hazard_floor', 3, 1);
  r.deco(25, 4, 'sign', 6, 1, { text: 'SUBLEVEL LIFT', fg: '#7dffb0', bg: '#0e1a16' });
  r.deco(35, 9, 'locker_row', 2, 2); r.deco(13, 9, 'desk', 2, 2);
  r.mark(20, 11, 'door', { lock: 'key:level7', style: 'blast', w: 1, h: 3, label: 'LVL 7', hint: 'A sealed bulkhead. Requires LEVEL 7 clearance.' });
  r.mark(12, 11, 'trigger', { w: 3, h: 3, id: 'dgate_hint', hint: 'The Reactor Gate is sealed.\nThe Overseer wants a Fusion Core from the east.', hintDur: 5 });
  r.done();
}

// ------------------------------------------------------------------ 9. SURFACE SILO  (280,28) 24x56   lift from y=82 to ground y=56
{
  const r = R('v_silo', 'Vault Exit Silo', 'vault', 280, 28, 24, 56, { sky: true, skyTop: true, skyStrength: 0.35, bg: 'bw_vault', skyColor: [1, 0.8, 0.6] });
  r.shell(2).floor(2).open('L', 51, 53).open('L', 25, 27).open('R', 25, 27);
  r.solid(2, 28, 8, 39, 'V'); r.solid(15, 28, 21, 39, 'V');   // surface ledges (ground level y=56) around the 6-wide lift shaft
  r.clear(6, 0, 17, 1); r.zone(6, 0, 17, 1, null);            // open hatch to the sky
  r.mark(9, 53, 'elevator', { w: 6, rise: 26, speed: 180, startTop: false, hint: 'Vault-Tec Surface Lift' });
  r.ents([[3, 8, 'l'], [3, 24, 'l'], [20, 8, 'l'], [20, 24, 'l'], [20, 40, 'l'], [3, 40, 'l']]);
  r.deco(10, 26, 'hazard_floor', 6, 1);
  r.deco(4, 20, 'sign', 6, 1, { text: 'SURFACE ACCESS', fg: '#ffb640', bg: '#1a1a14' });
  r.done();
}

})();
