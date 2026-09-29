// REGION: EAST RIDGE & THE BROTHERHOOD CLIFF (surface east: overpass, gorge, vertibird crash mesa)
//   s_over  (540,28,72x34)  Route 9 Overpass   west: town tunnel (rows 53..55)  east: gorge (rows 53..55)
//   s_ridge (612,28,56x34)  Sandstone Gorge    west: overpass  east: Meridian plant gate (rows 53..55)  top: shaft to the mesa (cols 636..643)
//   b_cliff (612, 0,56x28)  Vertibird Crash Site (Deathclaw arena, Power Fist)  bottom: shaft (cols 636..643)
// Ground top of s_over / s_ridge is global y=56 (local row 28).
(function () {
'use strict';
const CD = window.CD, R = CD.room;
CD.HOLOTAPES = CD.HOLOTAPES || {};
const H = CD.HOLOTAPES;

// ================================================================== 1. ROUTE 9 OVERPASS  (540,28) 72x34
// Two routes east: the upper deck (12 tiles above the road) has a 13-tile collapsed span that needs the air dash;
// the street below is plugged by a cracked-concrete pile-up under the east span (Power Fist / grenade later).
// Dropping off the west span lands west of the plug; the ladders at both hatches make the trip back easy.
{
  const r = R('s_over', 'Route 9 Overpass', 'surface', 540, 28, 72, 34, { sky: true, skyTop: true, fg: 'concrete', ambient: [0.56, 0.45, 0.4], ammo: '10mm' });
  r.floor(6, 'G'); r.solid(0, 28, 71, 29, 'A');                       // road surface (asphalt) over soil
  r.solid(0, 0, 1, 33, 'C'); r.clear(0, 25, 1, 27);                    // west embankment + tunnel mouth (town side)
  r.solid(70, 0, 71, 33, 'C'); r.clear(70, 25, 71, 27);                // east embankment + tunnel mouth (gorge side)
  // ---- the upper deck: slab rows 16..17, underside row 18
  r.solid(2, 16, 27, 16, 'A'); r.solid(2, 17, 27, 17, 'C');            // west span, ends at col 27
  r.solid(41, 16, 69, 16, 'A'); r.solid(41, 17, 69, 17, 'C');          // east span, starts at col 41   (gap cols 28..40 = 13 tiles)
  r.clear(7, 16, 8, 17); r.clear(63, 16, 64, 17);                      // maintenance hatches in the deck
  r.ladder(8, 15, 27); r.ladder(63, 15, 27);                           // rusty ladders down to the street
  r.solid(13, 15, 14, 15, 'C'); r.solid(21, 15, 22, 15, 'C');          // jersey barriers on the west span
  r.solid(47, 15, 48, 15, 'C'); r.solid(57, 15, 58, 15, 'C'); r.solid(66, 15, 67, 15, 'C');
  // ---- the street: pile-up plug under the east span (cracked at the bottom), maintenance closet (secret)
  r.solid(51, 18, 53, 23, 'C'); r.breakable(51, 24, 53, 27);
  r.solid(16, 25, 21, 27, 'C'); r.clear(17, 26, 20, 27); r.breakable(16, 26, 16, 27); r.zone(17, 26, 20, 27, 'bw_concrete');
  // ---- enemies / items / lights
  r.ents([[12, 15, 'r'], [24, 15, 'j'], [46, 15, 'a'], [56, 15, 'x'], [11, 27, 'r'], [26, 27, 'r'], [33, 27, 's'], [61, 27, 's'], [34, 9, 'f'],
    [49, 27, 'F'], [55, 27, 'F'], [4, 27, 'F'],
    [15, 15, '$'], [26, 15, '+'], [20, 27, '%'], [37, 27, '$'], [44, 15, '%'], [60, 15, '$'], [30, 27, '$'], [23, 27, 'K'], [45, 27, 'K'], [46, 27, 'K']]);
  // ---- decor (back to front)
  r.deco(6, 9, 'rg_gantry', 22, 8, { text: 'MERIDIAN 22', sub: 'CINDER RIDGE', arrow: 1 });
  r.deco(13, 18, 'rg_pier', 3, 10, { v: 0 }); r.deco(23, 18, 'rg_pier', 3, 10, { v: 1 }); r.deco(46, 18, 'rg_pier', 3, 10, { v: 2 }); r.deco(60, 18, 'rg_pier', 3, 10, { v: 0 });
  r.deco(26, 16, 'rg_deckend', 3, 4, { side: 1 }); r.deco(39, 16, 'rg_deckend', 3, 4, { side: -1 });
  r.deco(2, 14.4, 'rg_rail', 6, 1.6, { v: 0 }); r.deco(9, 14.4, 'rg_rail', 10, 1.6, { v: 1 }); r.deco(19, 14.4, 'rg_rail', 8, 1.6, { v: 2, broken: 1 });
  r.deco(41, 14.4, 'rg_rail', 8, 1.6, { v: 1 }); r.deco(50, 14.4, 'rg_rail', 12, 1.6, { v: 0 }); r.deco(64, 14.4, 'rg_rail', 6, 1.6, { v: 2 });
  r.deco(15.5, 13.6, 'rg_car', 5, 2.4, { v: 0 }); r.deco(17.5, 13.6, 'rg_car', 5, 2.4, { v: 3, flip: true, tilt: 0 });
  r.deco(50, 13.6, 'rg_car', 5, 2.4, { v: 1 }); r.deco(59, 13.6, 'rg_car', 5, 2.4, { v: 2, flip: true });
  r.deco(19.2, 9, 'rg_billboard', 9, 7, { ad: 'poseidon', fall: 1 });
  r.deco(28, 13, 'rg_lamp', 2, 3, { bent: 1 }); r.deco(10, 13, 'rg_lamp', 2, 3, {}); r.deco(43, 13, 'rg_lamp', 2, 3, {}); r.deco(68, 13, 'rg_lamp', 2, 3, { bent: 1 });
  r.deco(3, 24, 'rg_roadsign', 2, 3, { text: 'ROUTE 9', sub: 'EAST', shape: 'shield', holes: 6 });
  r.deco(36, 22, 'rg_roadsign', 2, 3, { text: 'BRIDGE', sub: 'OUT', shape: 'diamond', holes: 9 });
  r.deco(28.5, 24.8, 'rg_car', 5, 2.4, { v: 1, flip: true }); r.deco(34, 25.4, 'rg_slab', 5, 2, {});
  r.deco(43, 24.6, 'rg_bus', 8, 3.4, {});
  r.deco(49.6, 26.6, 'rg_junk', 2, 1.6, { kind: 'sandbags' }); r.deco(54, 26.4, 'rg_junk', 2, 1.6, { kind: 'tires' });
  r.deco(38.2, 26.4, 'rg_junk', 2, 1.6, { kind: 'barbed' }); r.deco(62, 26.6, 'rg_junk', 2.5, 1.6, { kind: 'crates' });
  r.deco(16, 21.5, 'rg_stencil', 6, 3.5, { text: 'DEPT OF HIGHWAYS', sub: 'MAINTENANCE', num: '9-B' });
  r.deco(64, 26.6, 'rg_car', 5, 2.4, { v: 0 });
  r.deco(1.2, 15.8, 'rg_embank', 1, 12, {}); r.deco(69.4, 15.8, 'rg_embank', 1, 12, {});
  // ---- marks
  r.mark(4, 27, 'trigger', { w: 2, h: 3, id: 'rg_over_arrive', say: [['OVERSEER', 'Sleeper Seven, I have reviewed the structural report for the Route 9 overpass. It reads, in its entirety: "ha ha".', 5.5], ['OVERSEER', 'Please proceed with caution, a sense of humor, and a strong preference for the road underneath.', 5]], once: true });
  r.mark(11, 15, 'terminal', { id: 'rg_t_callbox', title: 'ROUTE 9 EMERGENCY CALL BOX 14', lines: ['DEPT. OF HIGHWAYS - EMERGENCY CALL BOX 14\n\nPress the button to speak with an operator.\n\n(An operator is not available. An operator has not been available since 2077. Please remain calm and do not lean on the guard rail.)', 'LAST STRUCTURAL INSPECTION: 2076-10-04\nRESULT: "FINE"\nINSPECTOR NOTES: "The cracks are cosmetic. The sound it makes in the wind is also cosmetic."\n\nNEXT INSPECTION DUE: 2077-10-25.'] });
  r.mark(24, 15, 'trigger', { w: 3, h: 3, id: 'rg_gap_hint', hint: 'THE SPAN HAS COLLAPSED.\nThe gap is far too wide to jump. You would need a burst of speed in mid-air.\nThe road underneath is blocked, too. By something that looks cracked.', hintDur: 8, once: true });
  r.mark(44, 15, 'locker', { loot: [{ k: 'ammo', type: '10mm', n: 30 }, { k: 'stimpak' }, { k: 'stimpak' }, { k: 'caps', n: 60 }] });
  r.mark(19, 27, 'pickup', { k: 'upgrade', u: 'ammo' });
  r.mark(55, 26, 'pickup', { k: 'holotape', id: 'tape_rg_toll' });
  r.done();
}
H.tape_rg_toll = { title: "Bulldog's Toll Ledger", text: ["ROUTE 9 TOLL - LEDGER, PAGE 4.\nBrahmin-milk wagon: 12 caps, paid. Trader Cricket: paid in jerky, we let it slide. Two Brotherhood flyboys on foot from the ridge: did not pay, did not stop, looked at the pile-up like it was a personal insult.", "Bulldog says no one crosses Route 9 without paying. Not the wagons, not the walkers, not the birds. He says it twice, because the first time it sounds smaller.\n(Scrawled underneath: 'we dropped that span ourselves. dont tell bulldog it was an accident.')"] };

// ================================================================== 2. SANDSTONE GORGE  (612,28) 56x34
// A canyon under the mesa. Camp at the west mouth, the wall-jump chimney (cols 26..30) climbs to the mesa hole, plug lump + exit east.
{
  const r = R('s_ridge', 'Sandstone Gorge', 'surface', 612, 28, 56, 34, { sky: true, fg: 'redrock', ambient: [0.68, 0.53, 0.46], ammo: 'cell' });
  r.shell(2, 'E');
  r.solid(2, 28, 53, 29, 'G'); r.solid(2, 30, 53, 31, 'E');
  r.open('L', 25, 27); r.open('R', 25, 27); r.open('T', 24, 31);
  // ---- hanging rock roof: steps down to the chimney flanks (last solid row per column range)
  [[2, 9, 6], [10, 12, 8], [13, 16, 11], [17, 19, 14], [20, 22, 17], [23, 23, 19], [24, 25, 21],
    [31, 32, 21], [33, 33, 19], [34, 36, 16], [37, 40, 13], [41, 44, 11], [45, 48, 8], [49, 53, 6]].forEach((s) => r.solid(s[0], 2, s[1], s[2], 'E'));
  // ---- the chimney: cols 26..30. Rest planks (one-way) hammered into the rock by the scouts.
  r.plat(26, 27, 19); r.plat(29, 30, 11); r.plat(26, 27, 4);
  r.clear(31, 13, 35, 15); r.zone(31, 13, 35, 15, 'bw_redrock');       // hidden pocket (bobblehead)
  r.zone(26, 2, 30, 21, 'bw_redrock');
  // ---- prospector's lump with a cracked face (Vita-Tonic)
  r.solid(40, 25, 46, 27, 'E'); r.clear(41, 26, 44, 27); r.breakable(40, 26, 40, 27); r.zone(41, 26, 44, 27, 'bw_redrock');
  // ---- entities
  r.ents([[7, 27, 'F'], [9, 27, 'Z'], [15, 27, 'N'], [21, 27, 'F'], [28, 27, 's'], [36, 27, 's'], [23, 27, 'r'], [33, 27, 'r'], [49, 27, 'u'], [28, 12, 'f'], [27, 18, 'j'],
    [26, 14, 'l'], [30, 6, 'l'], [26, 22, 'l'],
    [12, 27, '$'], [17, 27, '+'], [19, 27, 'K'], [20, 27, 'K'], [38, 27, '%'], [34, 27, '&'], [51, 27, '$'], [30, 10, '$'], [27, 3, '+']]);
  r.mark(23, 25, 'trigger', { w: 3, h: 3, id: 'rg_grip_hint', hint: 'GECKO GRIPS:  hold toward a wall while airborne to cling.\nJUMP to kick off, then push into the opposite wall.\nThe scouts hammered planks into the gorge. Follow them up.', hintDur: 9, once: true });
  r.mark(11, 27, 'npc', { id: 'rg_pryor', name: 'Initiate Pryor', outfit: 'guard', face: 1,
    lines: ["Easy, vaulter. Easy. Initiate Pryor, Brotherhood of Steel. Well. What's left of the initiate part. Took a splinter of rotor through the thigh when the bird came down.",
      "The bird was a Vertibird. Three days out from the Citadel, headed for the Meridian plant. Something took our rotor off over this ridge. Pilot never got a word out. Paladin Kessler pulled the rest of us from the wreck.",
      "Up top. In the wreck. A Deathclaw. It was nesting there before we crashed, or it moved in the second we did. Kessler took the Power Fist up after it. That was six days back.",
      "The Power Fist is the only thing we had that breaks concrete. Scribe Hollis says the plant's gate is poured shut. You want in? You'll need Kessler's fist. It's up there with Kessler.",
      "Watch the walls. We hammered planks into the gorge, all the way to the ridge. Gecko grips will get you up; nothing else will. And whatever you do, don't drink the Nuka-Cola. Vance drank the Nuka-Cola."],
    topics: ['What happened here?', 'What is up on the ridge?', 'The Power Fist?', 'Any advice?'] });
  r.mark(17, 25, 'terminal', { id: 'rg_t_field', title: 'ROOK-3 RELAY STATION - PRYOR', holotape: 'tape_rg_field', lines: ["BROTHERHOOD OF STEEL - SCOUT DETAIL ROOK-3\nRELAY STATION NOTES / INITIATE PRYOR\n\nSUPPLY MANIFEST:\n  STIMPAK x4 .......... 3 REMAINING\n  MICROFUSION CELL .... 1 CASE\n  NUKA-COLA x1 ........ 0 REMAINING\n\nNOTE: Vance drank the Nuka-Cola. Vance is on latrine detail for the rest of his natural life. At this rate, that is until Thursday.", "ROUTE NOTES:\nWe hammered pitons and planks into the gorge, floor to rim. The only way to the ridge that isn't a rope and a prayer. Recommend Gecko-type grips. Alternate recommendation: don't go."] });
  r.mark(29, 27, 'steam', { dir: -1, len: 3, period: 3.6, on: 1.1 });
  r.mark(19, 27, 'locker', { loot: [{ k: 'ammo', type: 'cell', n: 30 }, { k: 'stimpak' }, { k: 'caps', n: 50 }] });
  r.mark(27, 18, 'pickup', { k: 'weapon', id: 'laser_pistol' });
  r.mark(34, 15, 'pickup', { k: 'bobble', stat: 'A' });
  r.mark(44, 27, 'pickup', { k: 'upgrade', u: 'hp' });
  r.done();
}
H.tape_rg_field = { title: 'Rook-3 Relay Notes', text: ["SUPPLY MANIFEST: three stimpaks, one case of microfusion cells, zero Nuka-Colas. Vance drank the Nuka-Cola.", "We hammered pitons and planks into the gorge wall, floor to rim. If you are reading this and you have grips, go up. If you do not have grips, go find some. Wall-clinging is not a skill. It is a lifestyle."] };

// ================================================================== 3. VERTIBIRD CRASH SITE  (612,0) 56x28
// Mesa top. Landing crater (bed + supplies) over the shaft hole; the crater mouth is sealed by the boss gates. Wreck + Kessler on the east side,
// Deathclaw den on the west. Arena floor = row 22.
{
  const r = R('b_cliff', 'Vertibird Crash Site', 'surface', 612, 0, 56, 28, { sky: true, skyTop: true, fg: 'redrock', ambient: [0.62, 0.5, 0.45], ammo: 'cell' });
  r.shell(2, 'E'); r.clear(2, 0, 53, 1);                               // open sky
  r.solid(2, 22, 53, 25, 'E');                                          // mesa top (floor row 22)
  r.open('B', 24, 31, 2);                                               // shaft hole
  r.clear(18, 22, 35, 25); r.solid(34, 24, 35, 25, 'E');                // landing crater with a step on the east side
  r.solid(2, 9, 12, 15, 'E'); r.zone(3, 16, 12, 21, 'bw_redrock');       // the den overhang (west)
  r.plat(15, 18, 18); r.plat(24, 29, 17); r.plat(41, 45, 18);            // wreck-chunk dodge platforms
  r.ents([[17, 25, 'Z'], [21, 25, 'F'], [23, 25, 'K'], [32, 25, 'K'], [33, 25, '+'], [19, 25, '%'], [46, 21, '$']]);
  r.deco(15, 14, 'rg_claws', 4, 5, {});
  r.mark(27, 21, 'arena', { boss: 'deathclaw', floor: 22, gates: [{ dx: -9, dy: 1, w: 18, h: 2 }], spawn: [-19, 0] });
  r.mark(37, 21, 'trigger', { w: 2, h: 8, id: 'rg_boss_trig', boss: 'deathclaw', repeat: true, once: false });
  r.mark(20, 25, 'trigger', { w: 3, h: 3, id: 'rg_crater_ovs', say: [['OVERSEER', 'Sleeper Seven, my sensors detect a large biological signature above you, disposition: unwelcoming.', 5], ['OVERSEER', 'I recommend a strongly worded letter. Failing that, your fists. Failing that, a quick prayer to the Vault-Tec pantheon.', 5.5]], once: true });
  r.mark(33, 25, 'trigger', { w: 3, h: 3, id: 'rg_crater_hint', hint: 'BROTHERHOOD FIELD CAMP\nRest here first: E on the bunk saves and heals.\nSomething nests in the wreck up ahead. It will not let you leave.', hintDur: 8, once: true });
  r.mark(22, 25, 'terminal', { id: 'rg_t_hollis', title: 'ROOK-3 FIELD TERMINAL - SCRIBE HOLLIS', holotape: 'tape_rg_hollis1', lines: [
    "BROTHERHOOD OF STEEL - SCOUT DETAIL ROOK-3\nFIELD TERMINAL / SCRIBE HOLLIS\n\nDay 1. Departed the Citadel at dawn. Mission: investigate the energy signature at the Meridian Power Station. A fusion plant, still running. Two hundred years, and something is still running. Paladin Kessler said 'do not get excited, Hollis.' I am excited.",
    "Day 2. The bird went down on the ridge. Port rotor sheared, by a bird strike or a something strike. Pilot dead on impact. Initiates Pryor and Vance survived. Paladin Kessler took a splinter of hull through the shoulder and refused a stimpak until everyone else had one. I have never met a man so committed to being right.",
    "Day 4. There is a Deathclaw nesting in the wreck. It was here before we were. Or it followed us. Kessler says it is only doing what a Deathclaw does. I said that was not comforting.",
    "Day 6. Kessler has gone up to the ridge with the Power Fist. He said: 'Stay in the trench, Hollis. If I am not back by dark, the trench is your home.' It has been six dark. I have written everything down. If you are reading this, take the bunk, read my notes, and think very hard about whether you want to go up there."] });
  r.mark(19, 24, 'pickup', { k: 'holotape', id: 'tape_rg_hollis2' });
  r.mark(41, 21, 'pickup', { k: 'ability', id: 'powerfist', requires: 'boss_deathclaw' });
  r.mark(44, 21, 'pickup', { k: 'holotape', id: 'tape_rg_kessler' });
  r.mark(50, 21, 'terminal', { id: 'rg_t_blackbox', title: 'VERTIBIRD VB-02 FLIGHT RECORDER', holotape: 'tape_rg_blackbox', lines: [
    "VB-02 'ROOK-3' FLIGHT DATA RECORDER\n\n0612  ALT 300  SPD 140  ALL GREEN\n0613  PILOT: 'Nice day for it.'\n0614  PROXIMITY WARNING - PORT ROTOR\n0614  PILOT: 'That is not a bird.'",
    "0615  PILOT: 'WHAT IS THAT? Kessler, what is-'\n0615  MASTER CAUTION x 14\n0615  IMPACT.\n\n0615+04s  (static)\n0631  A VOICE, NOT THE PILOT'S: 'Everyone out. Everyone out. Help me with Hollis.'",
    "RECORDING CONTINUES FOR 41 HOURS 12 MINUTES.\n\nCONTENT: WIND. OCCASIONALLY, SOMETHING LARGE SNIFFING THE MICROPHONE."] });
  r.done();
}
H.tape_rg_hollis1 = { title: 'Hollis: Day 1-6 Log', text: ["Day 1. Departed the Citadel at dawn. Mission: investigate the energy signature at the Meridian Power Station. A fusion plant, still running. Two hundred years, and something is still running.", "Day 6. Kessler has gone up to the ridge with the Power Fist. 'Stay in the trench, Hollis.' It has been six dark. I have written everything down."] };
H.tape_rg_hollis2 = { title: 'Hollis: Meridian Notes', text: ["The Meridian Power Station is guarded by an automated Sentry Bot, designation Warden-9. I pulled the pre-war scans off the bird's databank. Its armor is beyond anything we carried. The plant's outer gate is poured concrete, sealed from the inside.", "The Power Fist is the only thing in our inventory that can break that barricade. That is why Kessler carried it. That is why he went up. I did not tell him it was not worth it. God help me, I wanted the plant more than I wanted him safe."] };
H.tape_rg_kessler = { title: "Kessler: Last Stand", text: ["This is Paladin Kessler, recording. I am at the foot of the wreck. It knows I am here. It has been circling for an hour and I have not been able to hurt it. I have hit it four times with the Fist. It has stopped noticing.", "Hollis, if you get this, do not come up. The Fist is on my belt. If someone with better luck than me comes for it, they will need to hit it more than four times. Ad Victoriam. I am too tired to enjoy saying it."] };
H.tape_rg_blackbox = { title: 'Vertibird Flight Recorder', text: ["0614  PILOT: 'That is not a bird.'\n0615  IMPACT.", "RECORDING CONTINUES FOR 41 HOURS 12 MINUTES. CONTENT: WIND. OCCASIONALLY, SOMETHING LARGE SNIFFING THE MICROPHONE."] };

})();
