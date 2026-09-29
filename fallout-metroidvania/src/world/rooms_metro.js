// REGION: THE CINDER RIDGE METRO (region 'metro', difficulty 1.6). Under the town, x 392..611, y 62..137.
// Levels (floor tops): E0 (entry/clinic/den) y=85 | T (tunnel/hub/hall) y=108 | S (sewer) y=128..134.
// Flow: stairwell (m_entry) -> old stairs -> Line 7 tunnel -> hub shaft -> manhole -> sewer (cistern, pipe run, outfall)
//       -> chimney A (wall jump, Gecko Grips) -> Central Platform -> shaft B (wall jump) -> clinic -> chem den (boss) -> Jet Rush.
//       After the boss the clinic door opens onto the hub catwalk: ladder col 500 up to the diner. Secret depot behind cracked walls.
(function () {
'use strict';
const CD = window.CD, R = CD.room;

// ------------------------------------------------------------------ holotapes
CD.HOLOTAPES = CD.HOLOTAPES || {};
Object.assign(CD.HOLOTAPES, {
  tape_mt_s5: { title: 'Sleeper Five: Rig Notes', text: [
    "Sleeper Five, personal log. Day nine below Cinder Ridge. The Overseer says the surface is closed. The Overseer also says I am 'fully rested.' I woke up in a pod that smelled of wet dog, so I am choosing to trust my nose over the pod.",
    "Good news: the Metro clinic has a working centrifuge and a lot of chem stock nobody is using. Bad news: the doctor is still in. She has changed. She glows, mostly around the edges, and she is very polite about wanting me to stay.",
    "Design notes for the Jet injector rig. Three vials, one coolant tank, a seat that does not try to kill you. One shot of Jet and the world slows for a heartbeat and you do not. Good for jumping. Bad for the liver. I will test it in the den, the only room down here with a proper floor."] },
  tape_mt_marrow: { title: 'Metro Clinic: Intake Recording', text: [
    "\"Welcome to the Vault-Tec Radiant Recovery Program! Please take a number and a seat. Your treatment will begin as soon as the array reaches operating temperature. Side effects may include warmth, luminosity, and a lasting fondness for dim rooms.\"",
    "(A second voice, tired.) \"Ida, the array is running hot again.\" (The doctor.) \"Then it is working, Marcus. Check the dial. Check mine.\" (A long pause. Something hums, very slightly off key.) \"Marcus? Marcus, you look wonderful.\""] },
  tape_mt_s5b: { title: 'Sleeper Five: Last Recording', text: [
    "The rig works. The doctor stopped being angry once I gave her the second vial. She says she can see the light between the seconds now. I told her I can too. In hindsight that was not a healthy thing to admit to a woman who glows.",
    "If you are Seven: the rig does not need a Sleeper. It needs someone willing to stop in mid-air, once, and choose a direction. I never learned how. Tell the Overseer I said hello. Tell it I am not coming back either. Tell it I built something first."] },
});

// ------------------------------------------------------------------ 1. RIDGE STREET STATION (concourse)  (440,62) 52x26  floor top y=85
{
  const r = R('m_entry', 'Ridge Street Station', 'metro', 440, 62, 52, 26, { bg: 'bw_tunnel' });
  r.shell(2, 'C').floor(3, 'U');
  r.open('T', 12, 17);                 // stairwell from s_main1 (global 452..457)
  r.ladder(12, 0, 22);                 // climb back out to the street
  r.open('B', 30, 35, 3);              // old stairs down to the tunnel (global 470..475)
  r.ladder(30, 22, 25);
  r.plat(38, 47, 18);                  // mezzanine over the ghoul nest (double jump, 5 up)
  r.ents([
    [6, 2, '*'], [10, 2, 'O'], [22, 2, '*'], [40, 2, '*'], [2, 17, 'l'], [49, 17, 'l'], [43, 22, 'F'],
    [38, 22, 'g'], [46, 22, 'g'], [41, 22, 'r'], [44, 10, 'f'],
    [2, 22, 'K'], [19, 22, '$'], [27, 22, '%'], [40, 17, '$'], [43, 17, '%'], [46, 17, '+'],
  ]);
  r.mark(8, 22, 'terminal', { id: 't_mt_dispatch', title: 'RIDGE STREET STATION - DISPATCH', lines: [
    'LINE 7 SERVICE ADVISORY\n\nALL TRAINS HELD AT RIDGE STREET PENDING FURTHER NOTICE.\nCAUSE: "CIVIL DEFENSE ACTIVITY."\nEST. DELAY: INDEFINITE.\n\nPLEASE DO NOT BOARD THE TRAIN. THE TRAIN IS OCCUPIED. METRO TRANSIT THANKS YOU FOR YOUR PATIENCE.',
    'DISPATCH LOG - OCT 23 2077\n\n09:12  CAR 7-114 REPORTS SMOKE, PLATFORM 1.\n09:40  VAULT-TEC CLINIC STAFF REQUEST PLATFORM 1 "FOR A RADIATION DRILL." GRANTED.\n09:58  SIRENS ABOVE. STREET DOORS SEALED.\n10:07  CAR 7-114 REPORTS A BRIGHT LIGHT.\n10:08  CAR 7-114 STOPPED REPORTING.',
    'NOTE FROM THE STATION AGENT (HANDWRITTEN, SCANNED)\n\nIf you are reading this: the tunnel stops at the maintenance shaft. The manhole there is the only way to Central Platform. Cross the cistern, climb the outfall chimney. The clinic is UP the tiled shaft behind Platform 1. Do not use the clinic. Dr. Marrow is not accepting patients. Dr. Marrow is accepting visitors.'] });
  r.mark(10, 22, 'npc', { id: 'mt_abernathy', name: 'Conductor Abernathy', outfit: 'ghoul', face: 1, shop: 'trader',
    lines: ["Mind the gap, friend. And the ghouls. Mostly I mean the other ghouls. Conductor Abernathy, Ridge Street Station. Line 7 is delayed. It has been delayed for two hundred years, and I regret to say the announcement has not improved.",
      "The doctor? Ida Marrow ran the Vault-Tec clinic when the bombs came. She stayed. The array in the den kept running off the station tap and, well. She is the brightest thing in the Metro now. Bright, and angry, and sorry about it in the moments she remembers why.",
      "Central Platform? Down the manhole in the maintenance shaft, across the cistern, up the outfall chimney. You will want the grips for that last part; I never had the knees. The tiled shaft behind Platform One goes up to the clinic. The den is past the clinic. Do not knock.",
      "Sleeper Five? Fella in a vault suit. Built a chair, and she gave him chems to run it. Then the chair started humming in the den and neither of them came up for supper. Go and look. Bring a stimpak. Bring two. Bring me a Nuka-Cola, if you are going anyway."],
    topics: ['The doctor?', 'Getting to the platform', 'Sleeper Five?'] });
  r.mark(13, 22, 'trigger', { w: 4, h: 3, id: 'mt_intro', say: [
    ['OVERSEER', 'Welcome to the Ridge Street Metro, Sleeper Seven. Service is currently suspended. So, I am told, are most of the passengers.', 6.5],
    ['OVERSEER', 'Sleeper Five spent his final days below. He left equipment. Please retrieve it. Please do not lick the tunnels.', 6]] });
  // back wall, signage, pillars
  r.deco(2, 12, 'mt_wallband', 48, 1, { text: 'RIDGE STREET', step: 7 });
  r.deco(12, 2, 'mt_lightshaft', 6, 21, { spread: 80 });
  r.deco(19, 3, 'mt_station_sign', 10, 2, { text: 'RIDGE STREET', num: '7', sub: 'LINE 7  -  MAIN ST / MERIDIAN' });
  r.deco(7, 15, 'mt_map', 3, 2, { title: 'LINE 7' });
  r.deco(9, 6, 'poster', 2, 3, { title: 'RIDE', line: 'THE FUTURE', tone: [205, 196, 160] });
  r.deco(2, 2, 'mt_pipes', 10, 2, { n: 2 });
  r.deco(30, 2, 'mt_cables', 6, 3);
  r.deco(38, 8, 'mt_ghoulmark', 4, 3); r.deco(44, 9, 'mt_ghoulmark', 3, 3);
  r.deco(18, 3, 'mt_pillar', 1, 20, { num: '7' }); r.deco(29, 3, 'mt_pillar', 1, 20, { num: '7' });
  r.deco(37, 18, 'mt_pillar', 1, 5, { num: '7' }); r.deco(48, 18, 'mt_pillar', 1, 5, { num: '7' });
  // furniture: ticket booth, turnstiles + dead escalator, barriers at the stair hole, ghoul nest
  r.deco(3, 20, 'mt_kiosk', 4, 3, { text: 'TICKETS' });
  r.deco(21, 18, 'mt_escalator', 7, 5);
  r.deco(20, 21, 'mt_turnstile', 6, 2);
  r.deco(28, 22, 'mt_barrier', 2, 1); r.deco(36, 22, 'mt_barrier', 2, 1);
  r.deco(38, 22, 'mt_nest', 9, 1, { candle: true });
  r.deco(36, 22, 'bones', 1, 1);
  r.done();
}

// ------------------------------------------------------------------ 2. LINE 7 TUNNEL  (440,88) 52x24  floor top y=108
{
  const r = R('m_tunnel', 'Line 7 Tunnel', 'metro', 440, 88, 52, 24, { bg: 'bw_concrete' });
  r.shell(2, 'C').floor(4, 'C');
  r.solid(2, 2, 49, 9, 'C');           // earth fill above the bore (bore = rows 10..19)
  r.clear(30, 0, 35, 9);               // stairs shaft up to the concourse
  r.ladder(30, 0, 19);
  r.open('R', 17, 19);                 // to the hub (m_lift)
  r.clear(1, 17, 1, 19); r.breakable(0, 17, 0, 19);   // cracked wall -> m_cache
  r.ents([
    [8, 10, '*'], [20, 10, '*'], [44, 10, '*'],
    [35, 4, 'l'], [35, 8, 'l'], [2, 15, 'l'], [49, 14, 'l'],
    [9, 19, 'g'], [16, 19, 'g'], [12, 19, 'r'], [21, 19, 'r'], [43, 19, 'm'], [14, 19, 'F'],
    [3, 19, '&'], [5, 19, '$'], [26, 19, '$'], [46, 19, '%'],
  ]);
  r.deco(2, 19, 'mt_rails', 48, 1);
  r.deco(4, 16, 'mt_train', 25, 4, { cab: 'L', crush: 'R', num: '7-114' });   // the stalled train, car 7-114
  r.deco(2, 10, 'mt_pipes', 27, 2, { n: 3 });
  r.deco(44, 10, 'mt_pipes', 6, 2, { n: 2 });
  r.deco(20, 10, 'mt_cables', 6, 3);
  r.deco(36, 10, 'mt_pile', 8, 2, { hang: true });
  r.deco(38, 17, 'mt_pile', 7, 3);
  r.deco(8, 11, 'mt_ghoulmark', 4, 3);
  r.deco(2, 13, 'sign', 6, 1, { text: 'MTA POLICE DEPOT', fg: '#e8c53a', bg: '#1c2a2e' });
  r.deco(40, 12, 'mt_valve', 2, 2);
  r.deco(45, 12, 'mt_grate', 2, 2);
  r.deco(31, 11, 'mt_lightshaft', 4, 8, { spread: 20 });
  r.done();
}

// ------------------------------------------------------------------ 3. MAINTENANCE HATCH SHAFT / HUB  (492,62) 24x50  floor top y=108
{
  const r = R('m_lift', 'Maintenance Shaft', 'metro', 492, 62, 24, 50, { bg: 'bw_concrete' });
  r.shell(2, 'C').floor(4, 'C');
  r.open('T', 8, 13);                  // hatch to s_main2 (global 500..505)
  r.ladder(8, 0, 45);                  // ladder col 500 down to the floor
  r.solid(9, 23, 21, 24, 'M');         // catwalk at y=85 (clinic side door + hatch landing)
  r.open('R', 20, 22);                 // to the clinic (door lives in m_clinic)
  r.open('L', 43, 45);                 // to the tunnel
  r.open('B', 15, 18, 4); r.ladder(15, 45, 49);        // manhole down to the sewer
  r.clear(22, 43, 22, 45); r.breakable(23, 43, 23, 45); // cracked wall -> hall (shortcut)
  r.ents([
    [4, 2, '*'], [18, 2, '*'],
    [2, 12, 'l'], [21, 12, 'l'], [2, 24, 'l'], [21, 28, 'l'], [2, 34, 'l'], [21, 34, 'l'], [2, 40, 'l'], [21, 40, 'l'], [15, 25, '*'],
    [4, 45, 'Z'], [10, 45, 'r'], [12, 34, 'f'], [17, 12, 'f'],
    [11, 22, '$'], [14, 22, 'K'], [20, 22, '+'], [7, 45, '%'], [20, 45, '&'],
  ]);
  r.deco(3, 3, 'mt_pipes_v', 1, 19); r.deco(20, 26, 'mt_pipes_v', 1, 18);
  r.deco(14, 2, 'mt_cables', 6, 3);
  r.deco(15, 27, 'mt_liftcar', 4, 7, { text: 'OUT OF ORDER' });
  r.deco(3, 36, 'mt_valve', 2, 2);
  r.deco(3, 26, 'mt_ghoulmark', 3, 4);
  r.deco(10, 8, 'sign', 4, 1, { text: 'STREET  UP', fg: '#e8c53a', bg: '#1c2a2e' });
  r.deco(17, 17, 'sign', 4, 1, { text: 'CLINIC  >>', fg: '#7dffb0', bg: '#0e1a16' });
  r.deco(3, 41, 'sign', 4, 1, { text: '<< TUNNEL', fg: '#e8c53a', bg: '#1c2a2e' });
  r.deco(13, 41, 'sign', 5, 1, { text: 'SEWER  DOWN', fg: '#e07a3a', bg: '#1a1e22' });
  r.done();
}

// ------------------------------------------------------------------ 4. CLINIC  (516,62) 48x26  floor top y=85
{
  const r = R('m_clinic', 'Vault-Tec Metro Clinic', 'metro', 516, 62, 48, 26, { bg: 'bw_lab', ammo: '5.56' });
  r.shell(2, 'C').floor(3, 'Y');
  r.open('L', 20, 22);                 // to the hatch shaft (door)
  r.open('R', 20, 22);                 // to the den
  r.open('B', 2, 5, 3);                // wall-jump shaft B from the hall
  r.plat(2, 5, 23);                    // one-way cover over the shaft mouth (climb up through it; walk over it coming from the door)
  r.plat(8, 12, 18);                   // supply shelf (double jump, 5 up)
  r.ents([
    [8, 2, '*'], [20, 2, '*'], [26, 2, 'O'], [32, 2, '*'], [42, 2, '*'], [2, 16, 'l'], [45, 16, 'l'],
    [16, 22, 'g'], [22, 22, 'g'], [30, 22, 'z'], [26, 9, 'f'],
    [14, 22, '$'], [24, 22, '%'],
    [34, 22, '%'], [35, 22, '+'], [36, 22, '&'], [38, 22, 'Z'], [41, 22, '$'], [43, 22, 'N'],
  ]);
  r.mark(0, 22, 'door', { lock: 'flag:boss_glowing_one', style: 'blast', w: 1, h: 3, label: 'CLINIC', hint: 'The clinic door is sealed from the inside.', auto: true });
  r.mark(11, 17, 'pickup', { k: 'upgrade', u: 'stim' });        // Doctor's bag
  r.mark(33, 22, 'terminal', { id: 't_mt_clinic', title: 'METRO CLINIC - DR. I. MARROW', hack: { wl: 8, n: 7 }, holotape: 'tape_mt_marrow', lines: [
    'PATIENT FILE 000 - MARROW, IDA (SELF)\n\nDAY 3. The Vault-Tec representative left a therapy array and a stack of forms. Radiation, in measured doses, rebuilds tissue. Sixty patients enrolled. Zero complaints filed. (Nobody is filing anything.)',
    'DAY 41. The bombs fell at the end of week two. The patients did not leave. Neither did I. The array runs off the station tap now. The glow is medically encouraging. My hands shake, which I put down to caffeine. I have not had caffeine in a month.',
    'YEAR 152. (I stopped counting days; the clinic clock does not care.) They call me Doctor when they can still speak. Some have stopped. I leave the lights on for them. A traveller in a vault suit came by asking for chems. I gave him what I could. He built a chair. It hums the wrong note. I have asked him to stop.',
    'YEAR 210. I am so warm. I should see someone about this. There is no one. That is the whole trouble with being the only doctor in a hole.'] });
  r.mark(39, 22, 'trigger', { w: 2, h: 3, id: 'mt_den_warn', say: [
    ['OVERSEER', 'Sleeper Seven, the den ahead is the source of the radiation. Dr. Marrow does not accept visitors. She accepts casualties. I have prepared a short form.', 7],
    ['OVERSEER', 'Please stand on the platforms when the floor begins to glow. I mean this with all the warmth a machine can muster.', 5.5]] });
  // decor: waiting room, wards, lab, prep area
  r.deco(2, 12, 'mt_wallband', 44, 1, { text: 'METRO CLINIC', step: 8 });
  r.deco(15, 8, 'poster', 2, 3, { title: 'VAULT-TEC', line: 'WELLNESS FIRST', tone: [205, 196, 160] });
  r.deco(28, 8, 'mt_ghoulmark', 4, 3);
  r.deco(18, 2, 'mt_cables', 6, 3); r.deco(36, 2, 'mt_cables', 5, 3);
  r.deco(30, 3, 'vent', 2, 2);
  r.deco(8, 15, 'mt_cabinet', 2, 3);
  r.deco(7, 21, 'mt_chairs', 6, 2);
  r.deco(13, 20, 'mt_kiosk', 3, 3, { text: 'RECEPTION' });
  r.deco(16, 20, 'mt_gurney', 3, 3); r.deco(21, 20, 'mt_gurney', 3, 3);
  r.deco(25, 20, 'mt_cabinet', 2, 3);
  r.deco(27, 21, 'mt_lab', 5, 2);
  r.deco(36, 15, 'mt_warning', 4, 3, { head: 'DANGER', lines: ['RADIATION', 'THERAPY'] });
  r.deco(44, 22, 'mt_barrier', 2, 1);
  r.done();
}

// ------------------------------------------------------------------ 5. CHEM DEN (boss arena)  (564,62) 48x26  floor top y=85
{
  const r = R('m_den', "Marrow's Chem Den", 'metro', 564, 62, 48, 26, { bg: 'bw_lab', ambient: [0.17, 0.25, 0.20] });
  r.shell(2, 'C').floor(3, 'Y');
  r.open('L', 20, 22);
  r.plat(7, 13, 20); r.plat(34, 40, 20); r.plat(19, 28, 17);
  r.ents([[10, 2, '*'], [24, 2, '*'], [38, 2, '*'], [2, 14, 'l'], [45, 12, 'l']]);
  r.mark(2, 22, 'arena', { boss: 'glowing_one', floor: 23, gates: [{ dx: -2, dy: -2, w: 2, h: 3 }], spawn: [38, 0] });
  r.mark(3, 22, 'trigger', { boss: 'glowing_one', w: 2, h: 3, repeat: true, once: false });
  r.mark(43, 22, 'pickup', { k: 'ability', id: 'jetrush', requires: 'boss_glowing_one' });
  r.mark(44, 22, 'pickup', { k: 'holotape', id: 'tape_mt_s5b', requires: 'boss_glowing_one' });
  r.deco(2, 3, 'mt_pipes', 44, 2, { n: 2 });
  r.deco(4, 2, 'mt_cables', 8, 3); r.deco(30, 2, 'mt_cables', 8, 3);
  r.deco(20, 8, 'mt_warning', 4, 3, { head: 'DANGER', lines: ['RADIATION', 'THERAPY'] });
  r.deco(9, 7, 'mt_ghoulmark', 4, 3); r.deco(35, 6, 'mt_ghoulmark', 4, 3);
  r.deco(40, 9, 'mt_valve', 2, 2);
  r.deco(3, 21, 'mt_lab', 4, 2);
  r.deco(14, 22, 'mt_nest', 5, 1, { candle: true });
  r.deco(20, 19, 'mt_tank', 3, 4); r.deco(25, 19, 'mt_tank', 3, 4);
  r.deco(29, 21, 'mt_lab', 4, 2);
  r.deco(41, 20, 'mt_rig', 5, 3);        // Sleeper Five's Jet injector rig and remains (the Jet Rush pickup sits in front of it)
  r.done();
}

// ------------------------------------------------------------------ 6. CENTRAL PLATFORM (the big hall)  (516,88) 96x24  floor top y=108
{
  const r = R('m_platform', 'Central Platform', 'metro', 516, 88, 96, 24, { bg: 'bw_tunnel', ammo: '5.56' });
  r.shell(2, 'C').floor(4, 'C');
  r.open('T', 2, 5);                   // shaft B up to the clinic
  r.solid(6, 2, 7, 5, 'C');            // E wall of shaft B (doorway below at rows 6..8)
  r.solid(2, 9, 26, 10, 'U');          // west platform slab (top y=97)
  r.ladder(27, 9, 19);
  r.plat(28, 55, 9); r.plat(61, 90, 9);        // east catwalk with a 5-wide break
  r.ladder(91, 9, 19);
  r.open('B', 84, 87, 4);              // chimney A arrives here from the sewer
  r.clear(1, 17, 1, 19); r.breakable(0, 17, 0, 19);   // cracked wall <- hub
  r.ents([
    [12, 2, '*'], [23, 2, 'O'], [26, 2, '*'], [40, 2, '*'], [54, 2, '*'], [68, 2, '*'], [82, 2, '*'],
    [2, 4, 'l'], [5, 3, 'l'], [2, 13, 'l'], [93, 12, 'l'],
    [16, 19, 'g'], [23, 19, 'g'], [33, 19, 'r'], [46, 19, 'z'], [62, 19, 'g'], [72, 19, 'r'], [58, 11, 'f'], [58, 2, 'q'],
    [14, 19, 'F'], [50, 19, 'F'],
    [12, 8, 'Z'], [24, 8, '+'],
    [36, 19, '%'], [42, 19, '$'], [56, 19, '+'], [68, 19, '&'],
    [32, 8, '$'], [48, 8, '%'], [66, 8, '+'], [78, 8, '$'],
  ]);
  r.mark(9, 8, 'trigger', { w: 2, h: 3, id: 'mt_hall_ovs', say: [['OVERSEER', 'Sleeper Seven, I detect elevated radiation directly above you. Dr. Marrow was a valued Vault-Tec physician. She is now a valued Vault-Tec hazard.', 6.5]] });
  r.mark(3, 8, 'trigger', { w: 3, h: 3, id: 'mt_shaft_hint', hint: 'Tiled shaft ahead: cling to a wall in mid-air (Gecko Grips), JUMP to kick off, alternate sides.\nThe clinic is at the top.', hintDur: 7 });
  r.mark(17, 8, 'pickup', { k: 'holotape', id: 'tape_mt_s5' });
  r.mark(88, 8, 'pickup', { k: 'weapon', id: 'assault_rifle' });
  // the platform: trains on the track bed, signage, pillars under the catwalk
  r.deco(2, 19, 'mt_rails', 92, 1);
  r.deco(30, 16, 'mt_train', 27, 4, { crush: 'R', cab: 'L', num: '7-113' });
  r.deco(58, 16, 'mt_train', 25, 4, { crush: 'L', cab: 'R', num: '7-116' });
  r.deco(4, 16, 'mt_train', 22, 4, { crush: 'R', num: '7-109' });
  r.deco(40, 2, 'mt_station_sign', 10, 2, { text: 'CENTRAL PLATFORM', num: '7', sub: 'CINDER RIDGE  -  MERIDIAN' });
  r.deco(9, 2, 'mt_station_sign', 8, 2, { text: 'PLATFORM 1', num: '7', sub: 'TILED SHAFT  -  CLINIC' });
  r.deco(8, 6, 'mt_wallband', 19, 1, { text: 'CINDER RIDGE', step: 7 });
  r.deco(19, 3, 'mt_map', 3, 2, { title: 'LINE 7' });
  r.deco(22, 8, 'mt_bench', 4, 1);
  r.deco(15, 7, 'mt_lab', 4, 2);                 // Sleeper Five's workbench (the tape lies on it)
  r.deco(28, 10, 'mt_pillar', 1, 10, { num: '7' }); r.deco(42, 10, 'mt_pillar', 1, 10, { num: '7' }); r.deco(55, 10, 'mt_pillar', 1, 10, { num: '7' });
  r.deco(61, 10, 'mt_pillar', 1, 10, { num: '7' }); r.deco(75, 10, 'mt_pillar', 1, 10, { num: '7' }); r.deco(90, 10, 'mt_pillar', 1, 10, { num: '7' });
  r.deco(20, 8, 'mt_edge', 7, 1);
  r.deco(28, 2, 'mt_pipes', 26, 2, { n: 3 });
  r.deco(62, 2, 'mt_pipes', 24, 2, { n: 2 });
  r.deco(30, 2, 'mt_cables', 6, 3); r.deco(70, 2, 'mt_cables', 6, 3);
  r.deco(10, 19, 'mt_nest', 9, 1, { candle: true });
  r.deco(46, 19, 'mt_nest', 8, 1);
  r.deco(38, 12, 'mt_ghoulmark', 4, 3); r.deco(70, 13, 'mt_ghoulmark', 4, 3);
  r.deco(83, 19, 'mt_barrier', 5, 1);
  r.done();
}

// ------------------------------------------------------------------ 7. SEWER  (492,112) 120x26  deep floor top y=134
{
  const r = R('m_sewer', 'Ridge Street Sewers', 'metro', 492, 112, 120, 26, { bg: 'bw_brick' });
  r.shell(2, 'B').floor(4, 'B');
  r.open('T', 15, 18); r.ladder(15, 0, 7);              // manhole ladder from the hub
  // A. cistern: landing catwalk, flooded basin, shore
  r.solid(10, 8, 22, 8, 'M');
  r.water(2, 13, 38, 21);
  r.ladder(9, 8, 21);
  r.plat(25, 28, 9); r.plat(31, 34, 10);
  r.solid(39, 12, 46, 21, 'B'); r.ladder(38, 12, 21);
  // B. pipe run
  r.solid(47, 18, 80, 21, 'B'); r.solid(47, 2, 80, 5, 'B');
  r.water(47, 17, 80, 17);
  r.plat(48, 53, 15); r.plat(56, 61, 15); r.plat(64, 70, 15); r.plat(73, 79, 15);
  // C. outfall + chimney A
  r.solid(81, 16, 118, 21, 'B'); r.solid(81, 2, 105, 7, 'B');
  r.solid(106, 2, 107, 15, 'B'); r.clear(106, 13, 107, 15);       // W wall of chimney A + doorway
  r.solid(112, 2, 113, 15, 'B'); r.solid(114, 2, 117, 15, 'B'); r.clear(112, 3, 113, 5); r.clear(114, 3, 117, 5);  // E wall + niche
  r.open('T', 108, 111);
  r.plat(108, 109, 6);                                  // rest ledge in chimney A
  r.ents([
    [6, 2, '*'], [26, 2, '*'], [42, 2, '*'], [52, 6, '*'], [68, 6, '*'], [78, 6, '*'], [90, 8, '*'], [100, 8, '*'],
    [2, 5, 'l'], [46, 4, 'l'], [105, 11, 'l'], [117, 4, 'l'],
    [28, 5, 'f'], [34, 6, 'f'], [42, 11, 'c'], [66, 14, 'r'], [76, 14, 'r'], [92, 15, 'c'], [99, 15, 'c'],
    [20, 7, '+'], [26, 8, '$'], [32, 9, '&'], [44, 11, '$'], [50, 14, '%'], [58, 14, '$'], [68, 14, '+'], [88, 15, '$'], [104, 15, '%'],
    [113, 5, '$'], [117, 5, '$'],
  ]);
  r.mark(115, 5, 'pickup', { k: 'upgrade', u: 'hp' });   // Vita-Tonic in the chimney niche (rest ledge + jump)
  r.mark(101, 15, 'trigger', { w: 4, h: 3, id: 'mt_walljump_hint', hint: 'GECKO GRIPS: push into a wall in mid-air to cling.\nPress JUMP to kick off. Alternate walls to climb the chimney.', hintDur: 7 });
  r.mark(86, 15, 'steam', { dir: -1, len: 3, period: 3.6, on: 1.1 });
  r.mark(95, 15, 'steam', { dir: -1, len: 3, period: 3.4, on: 1.1 });
  r.deco(2, 2, 'mt_pipes', 44, 2, { n: 2 });
  r.deco(47, 6, 'mt_pipes', 34, 2, { n: 2 });
  r.deco(81, 8, 'mt_pipes', 25, 2, { n: 2 });
  r.deco(3, 3, 'mt_grate', 2, 2);
  r.deco(83, 10, 'mt_grate', 3, 3);
  r.deco(17, 2, 'mt_drip', 3, 6);
  r.deco(48, 9, 'mt_valve', 2, 2);
  r.deco(41, 6, 'mt_warning', 4, 3, { head: 'CAUTION', lines: ['RAD WATER', 'DO NOT SWIM'] });
  r.deco(11, 4, 'sign', 6, 1, { text: 'CISTERN 2', fg: '#e8c53a', bg: '#1c2a2e' });
  r.deco(94, 10, 'sign', 6, 1, { text: 'OUTFALL 4', fg: '#e07a3a', bg: '#1a1e22' });
  r.deco(114, 5, 'bones', 1, 1);
  r.done();
}

// ------------------------------------------------------------------ 8. SECRET CACHE  (392,92) 48x20  floor top y=108
{
  const r = R('m_cache', 'Metro Security Depot', 'metro', 392, 92, 48, 20, { bg: 'bw_brick', secret: true, ammo: '5.56' });
  r.shell(2, 'B').floor(4, 'B');
  r.clear(46, 13, 46, 15); r.breakable(47, 13, 47, 15);
  r.plat(3, 9, 11);                                   // gantry (double jump, 5 up): the bobblehead
  r.ents([
    [10, 2, '*'], [34, 2, '*'], [2, 8, 'l'], [45, 8, 'l'],
    [12, 15, 'r'], [27, 15, 'm'], [33, 15, 'z'],
    [16, 15, '$'], [18, 15, '%'], [29, 15, '%'], [36, 15, '+'], [39, 15, '&'], [25, 15, '$'],
  ]);
  r.mark(22, 15, 'pickup', { k: 'weapon', id: 'ripper' });
  r.mark(5, 10, 'pickup', { k: 'bobble', stat: 'E' });
  r.mark(42, 15, 'locker', { loot: [{ k: 'ammo', type: '5.56', n: 60 }, { k: 'stimpak' }, { k: 'caps', n: 90 }] });
  r.deco(2, 9, 'mt_wallband', 44, 1, { text: 'MTA SECURITY', step: 8 });
  r.deco(8, 12, 'mt_rack', 4, 4, { text: 'ARMORY' }); r.deco(19, 12, 'mt_rack', 5, 4, { text: 'ARMORY' }); r.deco(30, 12, 'mt_rack', 4, 4, { text: 'LOCKERS' });
  r.deco(13, 14, 'mt_crates', 3, 2);
  r.deco(35, 15, 'mt_sandbags', 5, 1);
  r.deco(40, 15, 'mt_barrier', 2, 1);
  r.deco(15, 4, 'poster', 2, 3, { title: 'MTA POLICE', line: 'MOVE ALONG', head: '#1d7a96', tone: [205, 200, 170] });
  r.deco(33, 5, 'sign', 6, 1, { text: 'AUTHORIZED ONLY', fg: '#e07a3a', bg: '#1a1e22' });
  r.deco(4, 2, 'mt_cables', 6, 3);
  r.deco(2, 3, 'mt_pipes', 44, 2, { n: 2 });
  r.done();
}

})();
