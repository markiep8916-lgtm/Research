// REGION 3: THE RUSTYARD (region 'rustyard', difficulty 1.4). A raider-held junkyard west of the vault exit silo.
// Surface (sunlit dusk, y 28..62, ground top y=56): r_gate -> r_yard -> r_stacks -> r_cliff -> shaft down.
// Raider fort (x 36..112, y 62..133): r_pit (landing hall + bunk, locker, vending, the locked Ring gate) / r_kennel / r_fort (tower; its trophy-room terminal opens the Ring gate) / r_stash (optional armory) / r_arena (boss: Big Bulldog, warlord -> Gecko Grips).
// Everything is reachable with the double jump only. Optional Gecko Grips (wall-jump) shafts hide extras for backtracking.
(function () {
'use strict';
const CD = window.CD, R = CD.room;
CD.HOLOTAPES = CD.HOLOTAPES || {};

// ------------------------------------------------------------------ helpers
// Surface room shell: 34 tall, ground top at local row 28 (global y 56), open sky above. Boundary "gate pylons" stand 12 (outer column) / 15 (inner column)
// rows above the ground and MUST match on both sides of every shared border (world_check compares the open/solid pattern of the border columns).
const SURF_OPTS = { sky: true, skyTop: true, bg: null };
function surface(id, name, x0, w, opts) {
  const r = R(id, name, 'rustyard', x0, 28, w, 34, Object.assign({}, SURF_OPTS, opts || {}));
  r.floor(6, 'G');
  return r;
}
function pylonL(r) { r.solid(0, 16, 0, 27, 'S'); r.solid(1, 13, 1, 27, 'S'); r.open('L', 25, 27, 2); }
function gdeco(r, x, kind, w, h, opts, base) { return r.deco(x, (base || 28) - h, kind, w, h, opts); }   // ground-standing decor: bottom edge on the floor line
function pylonR(r) { const w = r.w; r.solid(w - 1, 16, w - 1, 27, 'S'); r.solid(w - 2, 13, w - 2, 27, 'S'); r.open('R', 25, 27, 2); }
// Underground fort room: no sky, scrap back wall, dark amber ambient, 2-thick scrap shell.
function under(id, name, x0, y0, w, h, opts) {
  const r = R(id, name, 'rustyard', x0, y0, w, h, Object.assign({ sky: false, bg: 'bw_scrap', ambient: [0.19, 0.13, 0.10] }, opts || {}));
  r.shell(2, 'S');
  return r;
}
function fdeco(r, x, base, kind, w, h, opts) { return r.deco(x, base - h, kind, w, h, opts); }   // floor-standing decor: bottom edge on row `base` (the floor's top row)

// ------------------------------------------------------------------ holotapes
CD.HOLOTAPES.tape_ry_scrapper = { title: 'Scavenger Notes: Old Wick', text: [
  'DAY 40 IN THE STACKS. Three towers, three snipers, one very bad idea. The Bulldog\'s boys pay a cap a head for scavengers they find wandering into the Pit. I have been doing the sums. I am worth about four caps.',
  'Rumour off the ridge: Bulldog took a pair of climbing gauntlets off a dead man from the vault. Sticky palms, walks up walls like a gecko. Wears them on his belt like a trophy. If you are reading this you have Vault-Tec boots on. Good. The towers are easy if you time the second jump. Do not look down. Do not look up either, that is where the snipers are.'] };
CD.HOLOTAPES.tape_ry_dogtag = { title: 'Dogtag: Spike Malone', text: [
  'RUSTYARD GATE LOG, DAY 212. Still standing at this stupid gate. House rules, painted on the wall so even Gutter can read them. ONE: the Bulldog is always right. TWO: if the Bulldog is wrong, see rule one. THREE: the toll is twenty caps, or your boots, or your boots\' contents.',
  'Nobody has come up the east lift in years. Bulldog says the silo is haunted by pre-war ghosts and good manners. If you are hearing this, tape-finder: the yard runs one long line west. Gate, yard, stacks, cliff, then the Pit. Bulldog holds court at the bottom. Do not go down there. Or do. I am a dogtag, not your mother.'] };

CD.HOLOTAPES.tape_ry_bulldog = { title: "Big Bulldog's Fight Night Log", text: [
  'FIGHT NIGHT, NIGHT 212. Forty-seven fights, forty-seven wins. Bulldog does not lose. Bulldog has never lost. Bulldog once lost a coin toss and had the coin shot. The Ring is packed tonight: nine paying customers, a crate of Sugar Bombs and a lot of hungry rats in the cheap seats.',
  'Note to the boys: the vault dweller who came down the Pit last winter had gauntlets on him that stick to walls like wet gum. I wore them to the fort wall, to show off. Went up four yards, came down two seconds later and broke a rib. Nobody tell the boys about the rib. Anybody who wants them can come and pry them off my dead body. My body has been dead zero times. Do the math.'] };
CD.HOLOTAPES.tape_ry_s4 = { title: 'Sleeper Four: Last Entry', text: [
  'SLEEPER FOUR, LOG. I found the Grips in a Metro rig after the ghouls lost interest in it. Vault-Tec gauntlets, sticky palms, stamped on the wrist. I walked up a wall and cried like a baby. Then I came up in the wrong end of the Rustyard and a man with a red mohawk asked me nicely for my gloves. I did not hand over my gloves.',
  'They put me in the kennel with the rats. It is not so bad. The rats do not talk and they are the only ones here who have not called me a vault rat. Bulldog visits and reads me his fight log; it is exactly as long as he thinks it is. If you are Seven: the Grips are on his belt. Do not ask him for them. Tell the Overseer I said hello. Tell it I did not say it nicely.'] };

// ------------------------------------------------------------------ 1. SCRAPGATE  (248,28) 32x34   first raider checkpoint; the silo (vault steel) is the east wall
{
  const r = surface('r_gate', 'Scrapgate', 248, 32);
  r.solid(30, 0, 31, 33, 'V'); r.open('R', 25, 27, 2);                   // vault silo tower + door tunnel (rows 53..55)
  pylonL(r);
  r.solid(10, 27, 13, 27, 'G');                                            // low soil bump
  r.solid(17, 26, 19, 27, 'S');                                            // crushed-car barricade (2 high)
  // watchtower: lookout roof + plank deck + ladder
  r.solid(3, 16, 11, 17, 'S'); r.plat(4, 10, 21); r.ladder(10, 22, 27);
  r.ents([[7, 20, 'j'], [14, 27, 'a'], [8, 27, 'a'], [4, 27, 'r'], [22, 27, 'r'],
    [26, 27, 'F'], [15, 27, '$'], [27, 27, '$'], [24, 27, 'K'], [12, 26, 'K'], [5, 20, '+'], [9, 20, '%'], [7, 18, 'O'], [29, 24, 'l'], [3, 27, 'F']]);
  r.mark(28, 27, 'trigger', { w: 2, h: 3, id: 'ry_enter', say: [['OVERSEER', 'Sleeper Seven, you are now leaving Vault-Tec property. Local salvage law is finders keepers. Please be a finder.', 6.5], ['OVERSEER', 'Radiation, raiders and rudeness are all above average today. Enjoy your surface experience!', 5.5]] });
  r.mark(13, 26, 'pickup', { k: 'holotape', id: 'tape_ry_dogtag' });
  // set dressing (back to front)
  r.deco(0, 22, 'ry_heap', 15, 6, { far: 0.45 }); r.deco(15, 23, 'ry_heap', 14, 5, { far: 0.5 });
  r.deco(11, 20, 'ry_gate', 11, 8, { text: 'THE RUSTYARD', sub: 'PROPERTY OF BIG BULLDOG' });
  r.deco(2, 26, 'ry_fence', 4, 2, {}); r.deco(20, 26, 'ry_fence', 5, 2, { torn: 1 });
  r.deco(4, 16, 'ry_scaffold', 7, 12, { levels: [200] });
  r.deco(12, 26, 'ry_car', 4, 2, { pal: 0 }); r.deco(23, 26, 'ry_car', 4, 2, { pal: 4, flip: true, tilt: -0.05, flat: 1 });
  gdeco(r, 15, 'ry_tyres', 2, 1, {}); gdeco(r, 20, 'ry_tyres', 3, 1, { wall: true }); gdeco(r, 8, 'ry_drums', 2, 1, {});
  r.deco(9, 23, 'ry_banner', 1, 5, {}); r.deco(22, 23, 'ry_banner', 1, 5, { side: -1, flag: [40, 44, 52] });
  r.deco(24, 25, 'ry_board', 5, 3, { text: 'WELCOME TO THE\nRUSTYARD\nTOLL: 20 CAPS' });
  r.done();
}


// ------------------------------------------------------------------ 2. THE YARD  (196,28) 52x34   crusher pit under a crane, a canteen (bed + vending) and a rooftop gun cage
{
  const r = surface('r_yard', 'The Yard', 196, 52);
  pylonL(r); pylonR(r);
  // crusher pit x31..40 (3 deep): spikes in the middle, ladder + plank landings at both edges, plank bridge segments
  r.clear(31, 28, 40, 30); r.spikes(32, 39, 30);
  r.ladder(31, 29, 30); r.plat(31, 31, 28); r.ladder(40, 29, 30); r.plat(40, 40, 28); r.plat(34, 37, 28);
  // raider cover near the entrance; the gun cage is a slab of crushed-car cubes on the yard's west side (ladder up from the ground, crane deck above)
  r.solid(47, 26, 48, 27, 'S');
  r.solid(21, 22, 26, 23, 'S'); r.ladder(20, 23, 27); r.plat(20, 20, 22);
  // canteen lean-to: roof slab + back-wall zone (posts are decor only so the path stays open)
  r.solid(4, 21, 16, 22, 'S'); r.zone(4, 23, 16, 27, 'bw_scrap');
  // crane maintenance deck (ladder on the west side)
  r.plat(26, 33, 19); r.ladder(27, 20, 27);
  r.ents([[44, 27, 'a'], [47, 25, 'F'], [46, 27, 'x'], [31, 18, 'j'], [24, 27, 'r'], [29, 27, 'r'], [3, 27, 's'],
    [8, 27, 'Z'], [13, 27, 'N'], [10, 23, 'O'], [6, 27, 'K'], [15, 27, '+'], [19, 23, '$'], [49, 27, '%'], [45, 27, '$'], [43, 27, 'K'], [30, 27, '$'], [22, 27, '$'], [16, 27, 'F'],
    [45, 24, 'O'], [23, 21, '&']]);
  r.mark(25, 21, 'locker', { loot: [{ k: 'weapon', id: 'shotgun' }, { k: 'ammo', type: 'shell', n: 14 }, { k: 'stimpak' }] });
  r.mark(36, 27, 'trigger', { w: 2, h: 3, id: 'ry_pit_hint', hint: 'Spikes below. The bridge planks are one-way:\nDOWN + JUMP drops through them. A sniper is on the crane.', hintDur: 6 });
  // set dressing
  r.deco(0, 21, 'ry_heap', 14, 7, { far: 0.5 }); r.deco(36, 22, 'ry_heap', 16, 6, { far: 0.5 }); r.deco(16, 24, 'ry_heap', 12, 4, { far: 0.55 });
  r.deco(26, 8, 'ry_crane', 11, 20, { pal: 2, drop: 0.36 });
  r.deco(5, 14, 'ry_billboard', 6, 7, { text: 'Nuka-Cola', sub: 'ENJOY THE END OF THE WORLD' });
  r.deco(4, 21, 'ry_post', 1, 7, {}); r.deco(16, 21, 'ry_post', 1, 7, { side: -1 });
  r.deco(21, 22, 'ry_scaffold', 6, 6, { levels: [], braces: true });
  r.deco(21, 19, 'ry_board', 4, 3, { text: "GUN CAGE\nBULLDOG'S PROPERTY" });
  r.deco(6, 25, 'ry_board', 4, 3, { text: 'CANTEEN\nNO SHIRT NO SERVICE', bg: [70, 60, 56] });
  r.deco(0, 26, 'ry_fence', 3, 2, { torn: 0 }); r.deco(41, 26, 'ry_fence', 4, 2, { torn: 1 });
  gdeco(r, 4, 'ry_gen', 2, 2, {}); r.deco(12, 18, 'ry_tank', 3, 3, {});
  gdeco(r, 27, 'ry_car', 4, 2, { pal: 3, kind: 'pickup', flip: true, flat: 1 }); gdeco(r, 41, 'ry_car', 4, 2, { pal: 1, tilt: 0.04 });
  gdeco(r, 22, 'ry_drums', 2, 1, {}); gdeco(r, 44, 'ry_tyres', 3, 1, {}); gdeco(r, 17, 'ry_tyres', 2, 1, { r: 12 });
  r.deco(49, 23, 'ry_banner', 1, 5, { side: -1 }); r.deco(2, 23, 'ry_banner', 1, 5, {});
  r.deco(42, 24, 'ry_pole', 1, 4, { arm: 120 });
  gdeco(r, 8, 'bones', 1, 1, {}); gdeco(r, 9, 'ry_tyres', 1, 1, { r: 11 });
  r.done();
}

// ------------------------------------------------------------------ 3. STACK ALLEY  (144,28) 52x34   crushed-car towers: double-jump climbs, a skyline route and the highest Vita-Tonic
{
  const r = surface('r_stacks', 'Stack Alley', 144, 52);
  pylonL(r); pylonR(r);
  // tower A (8 tall): plank at 3 up, then a double jump to the top
  r.solid(41, 20, 45, 27, 'S'); r.plat(46, 47, 25);
  // tower B (13 tall): three double-jump legs up its east face, crow's nest plank above
  r.solid(26, 15, 31, 27, 'S'); r.plat(32, 33, 25); r.plat(33, 34, 20); r.plat(27, 29, 10);
  // the highest plank (Vita-Tonic) and the skyline stepping planks toward tower C
  r.plat(20, 25, 5); r.plat(20, 24, 17);
  // tower C (9 tall): three easy hops up its east face
  r.solid(12, 19, 17, 27, 'S'); r.plat(18, 19, 25); r.plat(19, 20, 22);
  r.ents([[48, 27, 'a'], [49, 27, 'F'], [36, 27, 'r'], [22, 27, 'F'], [23, 27, 'r'], [5, 27, 'F'], [4, 27, 's'], [9, 27, 's'],
    [29, 9, 'j'], [15, 18, 'j'], [43, 19, 'F'], [28, 14, 'F'],
    [44, 19, '+'], [33, 24, '$'], [34, 19, '$'], [30, 14, '$'], [22, 16, '$'], [16, 18, '%'], [46, 27, '$'], [38, 27, '%'], [20, 27, 'K'], [8, 27, 'K'], [24, 24, '$']]);
  r.mark(21, 4, 'pickup', { k: 'upgrade', u: 'hp' });
  r.mark(27, 9, 'pickup', { k: 'weapon', id: 'machete' });
  r.mark(14, 18, 'pickup', { k: 'holotape', id: 'tape_ry_scrapper' });
  r.mark(47, 27, 'trigger', { w: 2, h: 3, id: 'ry_stacks_hint', hint: 'Crushed-car towers block the alley.\nClimb the planks: JUMP, then JUMP again in mid-air (Jet Boots).', hintDur: 6 });
  // set dressing
  r.deco(0, 20, 'ry_heap', 15, 8, { far: 0.5 }); r.deco(18, 23, 'ry_heap', 10, 5, { far: 0.55 }); r.deco(32, 21, 'ry_heap', 10, 7, { far: 0.5 });
  gdeco(r, 46, 'ry_carstack', 4, 6, { pals: [1, 3, 0] }); gdeco(r, 32, 'ry_carstack', 4, 5, { pals: [5, 2] }, 28); gdeco(r, 2, 'ry_carstack', 4, 4, { pals: [0, 4] });
  r.deco(41, 18, 'ry_car', 4, 2, { pal: 5, tilt: 0.03 }); r.deco(26, 13, 'ry_car', 4, 2, { pal: 3, flip: true, flat: 1 }); r.deco(12, 17, 'ry_car', 4, 2, { pal: 2, kind: 'van' });
  r.deco(27, 10, 'ry_scaffold', 3, 5, { levels: [], braces: true }); r.deco(20, 5, 'ry_scaffold', 5, 12, { levels: [120, 280], braces: true });
  r.deco(45, 15, 'ry_banner', 1, 5, {}); r.deco(30, 10, 'ry_banner', 1, 5, { side: -1, flag: [40, 44, 52] }); r.deco(17, 14, 'ry_banner', 1, 5, { side: -1 });
  r.deco(38, 25, 'ry_board', 5, 3, { text: 'STACK ALLEY\nCLIMB OR CRAWL' });
  gdeco(r, 34, 'ry_drums', 2, 1, {}); gdeco(r, 24, 'ry_tyres', 3, 1, {}); gdeco(r, 10, 'ry_drums', 3, 2, {});
  r.deco(2, 26, 'ry_fence', 3, 2, { torn: 0 });
  r.done();
}

// ------------------------------------------------------------------ 4. PIT RIM  (96,28) 48x34   red-sandstone plateau, raider crane over the shaft, a cracked-wall cave and a Gecko-only chimney
// The pit shaft (global x 104..109) drops into r_pit; the long ladder on its east wall climbs back to the plateau (row 22).
{
  const r = surface('r_cliff', 'Pit Rim', 96, 48);
  pylonR(r); r.solid(46, 6, 46, 12, 'S');                                  // border pylon + the tall inner wall of the Gecko flue
  r.solid(0, 0, 1, 27, 'E');                                               // west cliff wall
  r.clear(8, 28, 13, 33);                                                  // pit shaft (6 wide) through the soil floor
  r.solid(14, 22, 27, 27, 'E');                                            // the plateau (6 above the ground)
  r.clear(18, 25, 26, 27); r.breakable(27, 26, 27, 27); r.zone(18, 25, 26, 27, 'bw_rock');   // cave: cracked wall (Power Fist / grenade)
  r.plat(28, 29, 25); r.plat(28, 29, 22);                                  // gangplank up the east face
  r.ladder(13, 23, 33); r.plat(13, 13, 22);                                // ladder down the shaft
  r.solid(19, 17, 26, 18, 'S'); r.zone(19, 19, 26, 21, 'bw_scrap');        // lookout roof over the plateau
  r.solid(39, 8, 42, 24, 'M');                                             // rust pillar: 3-high tunnel below, a Gecko wall-jump slot (x43..45) beside it
  r.ents([[21, 21, 'x'], [25, 21, 'a'], [23, 19, 'q'], [22, 19, 'O'], [16, 21, 'F'], [31, 27, 'r'], [35, 27, 'r'], [34, 27, 's'], [33, 27, 'F'], [30, 27, 'K'],
    [3, 27, '$'], [5, 27, '$'], [6, 27, '+'], [4, 27, '%'], [2, 27, 'K'], [21, 27, '$'], [24, 27, '&'], [22, 27, '$'],
    [40, 7, '$'], [41, 7, '+'], [42, 7, '$'], [38, 27, '$']]);
  r.mark(19, 27, 'pickup', { k: 'bobble', stat: 'P' });
  r.mark(15, 21, 'trigger', { w: 2, h: 3, id: 'ry_cliff_hint', hint: 'THE PIT: the raider fort is below.\nDrop into the shaft, or take the ladder on its east wall to climb back out.', hintDur: 6.5 });
  r.mark(37, 27, 'trigger', { w: 2, h: 3, id: 'ry_gecko_hint', requires: 'boss_warlord', hint: 'GECKO GRIPS: push into a wall while falling to cling,\nthen press JUMP to wall-jump. The flue past this tunnel is climbable.', hintDur: 7 });
  // set dressing
  r.deco(14, 17, 'ry_heap', 14, 5, { far: 0.5 }); r.deco(29, 22, 'ry_heap', 12, 6, { far: 0.5 }); r.deco(2, 22, 'ry_heap', 6, 6, { far: 0.5 });
  r.deco(8, 2, 'ry_crane', 11, 20, { flip: true, hang: 'cage', drop: 0.26, col: [148, 70, 40], tilt: 0.04 });
  r.deco(19, 19, 'ry_post', 1, 3, {}); r.deco(26, 19, 'ry_post', 1, 3, { side: -1 });
  r.deco(28, 22, 'ry_scaffold', 2, 6, { levels: [], braces: true });
  r.deco(31, 25, 'ry_board', 5, 3, { text: 'THE PIT\nRIDE DOWN: FREE\nRIDE UP: HAH' });
  gdeco(r, 31, 'ry_car', 4, 2, { pal: 3, kind: 'van', flip: true, flat: 1 }, 28); gdeco(r, 35, 'ry_tyres', 3, 1, {}); gdeco(r, 2, 'ry_drums', 2, 1, {}); gdeco(r, 5, 'ry_tyres', 2, 1, { r: 12 });
  r.deco(27, 17, 'ry_banner', 1, 5, { side: -1 }); r.deco(14, 17, 'ry_banner', 1, 5, {}); r.deco(39, 3, 'ry_banner', 1, 5, { flag: [40, 44, 52] });
  r.deco(2, 26, 'ry_fence', 3, 2, { torn: 0 }); gdeco(r, 20, 'bones', 1, 1, {}); gdeco(r, 23, 'ry_drums', 1, 1, {});
  r.done();
}


// ================================================================== THE RAIDER FORT (underground, x 36..112, y 62..133)
// Loop: Pit Rim shaft -> THE PIT (landing hall; the Ring gate is locked, its bunk/locker/hint are right in front of it) -> hatch + ladder -> KENNELS -> BULLDOG'S FORT
// (climb the planks to the trophy room, read the Ring control terminal = flag ry_ring) -> back up the hatch -> the gate opens -> THE RING (boss arena).
// After the boss the gate opens both ways: The Ring -> The Pit -> the long ladder (global col 109) back to the surface. The armory (r_stash) is an optional dead end.

// ------------------------------------------------------------------ 5. THE PIT  (84,62) 28x28   landing hall under the Pit Rim shaft; floor top y=88 (local 26)
{
  const r = under('r_pit', 'The Pit', 84, 62, 28, 28);
  r.floor(2, 'M');
  r.open('T', 20, 25, 2);                                                   // the shaft down from Pit Rim (global cols 104..109)
  r.open('L', 23, 25);                                                      // the Ring gate tunnel (global rows 85..87)
  r.clear(8, 26, 11, 27); r.plat(8, 8, 26); r.ladder(8, 27, 27);            // trapdoor hatch (global cols 92..95) to the kennels; ladder column 92 goes all the way down
  r.ladder(25, 0, 25);                                                      // the long ladder up the shaft (global col 109), continues Pit Rim's ladder
  r.plat(14, 20, 20); r.ladder(13, 19, 25);                                 // sniper deck + its ladder
  r.ents([[7, 2, '*'], [15, 2, '*'], [11, 2, 'O'], [19, 2, 'O'], [2, 20, 'l'],
    [3, 25, 'Z'], [2, 25, 'F'], [6, 25, 'N'], [14, 25, '$'], [15, 25, 'K'], [16, 25, 'a'], [18, 25, 'x'], [17, 19, 'j'], [15, 19, '$'], [19, 19, '%'],
    [22, 25, '$'], [23, 25, 'K'], [21, 25, 'F']]);
  r.mark(1, 25, 'door', { lock: 'flag:ry_ring', style: 'scrap', w: 1, h: 3, label: 'THE RING', hint: "Bulldog's Ring is sealed. The gate control is in the trophy room at the top of the fort." });
  r.mark(4, 25, 'trigger', { w: 2, h: 3, id: 'ry_ring_warn', say: [['OVERSEER', 'Sleeper Seven, I am detecting one very large raider behind that door and one comparatively small Sleeper in front of it. Vault-Tec remains cautiously optimistic about the second one.', 7], ['OVERSEER', 'He appears to be wearing Sleeper Four\'s Grips. They are Vault-Tec property. Kindly retrieve them, preferably with him no longer attached.', 6.5]] });
  r.mark(7, 25, 'locker', { loot: [{ k: 'ammo', type: 'shell', n: 12 }, { k: 'stimpak' }, { k: 'stimpak' }, { k: 'radaway' }, { k: 'caps', n: 45 }] });
  r.mark(12, 25, 'trigger', { w: 2, h: 3, id: 'ry_hatch_hint', hint: 'The Ring gate on the west wall is locked. Its control terminal is in the fort below.\nTake the ladder in the hatch, or just drop in. The bunk and locker here are yours.', hintDur: 8 });
  // dressing
  r.deco(2, 2, 'cabletray', 24, 1, {}); r.deco(2, 19, 'ry_board', 6, 3, { text: 'THE RING\nFIGHT NIGHT, EVERY NIGHT', bg: [70, 44, 36] });
  r.deco(4, 2, 'ry_cage', 2, 5, {}); r.deco(12, 2, 'ry_cage', 3, 6, { empty: true }); r.deco(16, 2, 'ry_cage', 2, 4, {});
  r.deco(14, 20, 'ry_scaffold', 7, 6, { levels: [0], braces: true });
  r.deco(20, 22, 'ry_board', 5, 3, { text: '<- THE FORT\nHATCH: DOWN' });
  fdeco(r, 19, 26, 'ry_drums', 2, 1, {}); fdeco(r, 5, 26, 'ry_tyres', 2, 1, { r: 12 }); fdeco(r, 9, 26, 'bones', 1, 1, {}); fdeco(r, 24, 26, 'ry_tyres', 1, 1, { r: 11 });
  r.deco(12, 21, 'ry_banner', 1, 5, {}); r.deco(24, 21, 'ry_banner', 1, 5, { side: -1, flag: [40, 44, 52] });
  r.deco(6, 3, 'pipe_v', 1, 20, { s: 4 }); r.deco(10, 2, 'vent', 2, 2, {}); r.deco(19, 4, 'stain', 3, 3, {});
  r.done();
}

// ------------------------------------------------------------------ 6. THE KENNELS  (76,90) 36x24   mole-rat runs, Sleeper Four's cage, a caged scavenger; floor top y=112 (local 22)
{
  const r = under('r_kennel', 'The Kennels', 76, 90, 36, 24);
  r.floor(2, 'M');
  r.open('T', 16, 19, 2);                                                   // hatch from The Pit (global cols 92..95)
  r.open('L', 19, 21);                                                      // tunnel to the fort (global rows 109..111)
  r.ladder(16, 0, 21);                                                      // ladder column (global 92) from the hatch to the floor
  r.plat(17, 27, 15);                                                       // kennel master's catwalk (7 above the floor, hop off the ladder)
  r.ents([[6, 2, '*'], [26, 2, '*'], [12, 2, 'O'], [31, 2, 'O'], [2, 15, 'l'], [33, 12, 'l'],
    [10, 21, 'a'], [12, 21, 'r'], [14, 21, 'r'], [24, 14, 'x'], [18, 14, '+'], [21, 14, '$'], [22, 21, 'r'], [25, 21, 'm'], [28, 21, 'm'], [31, 21, 'm'],
    [7, 21, '$'], [13, 21, 'K'], [26, 21, 'K'], [20, 21, 'F']]);
  r.mark(4, 21, 'pickup', { k: 'holotape', id: 'tape_ry_s4' });
  r.mark(33, 21, 'npc', { id: 'ry_wick', name: 'Old Wick', outfit: 'trader', face: -1, shop: 'trader',
    lines: ["Well, look at that. A live one. Wick's the name, scavenging's the game, and being locked in a dog run is the punishment. Eleven days now. The rats and I have an understanding: they don't eat me, I don't eat them.",
      "Why the cage? Bulldog's boys pay a cap a head for scavengers. I told them I was worth four. They said nobody's worth four. So I'm a kennel attraction. Still got a few bits and pieces in my boots, if you're buying.",
      "The Ring gate? West wall of The Pit, next to that bunk. Locked. The control terminal is in the trophy room at the top of the fort. Climb the planks, zig-zagging up the tower: left, left, right, left. Bulldog leaves it switched on because he can't remember how to turn it off.",
      "Bulldog? Big. Big like a bad idea in a small room. Charges when you're far, smashes when you're close, and when he starts hollering for his boys, that's when he's scared. Boys are worse than him, mind. Keep moving and use the decks.",
      "The fella in the corner cage? Vault suit, blue as a bruise. Climbed like a gecko, they say, till Bulldog took his gloves. Died in the straw. I patted his hand twice. Seemed the polite thing."],
    topics: ['Why are you in a cage?', 'How do I open the Ring?', 'Tell me about Bulldog.', 'The man in the corner cage?'] });
  // dressing
  r.deco(2, 2, 'cabletray', 32, 1, {}); r.deco(30, 18, 'ry_cage', 4, 4, { chain: false, empty: true });
  fdeco(r, 3, 22, 'ry_cage', 3, 4, { chain: false });
  r.deco(18, 16, 'ry_cage', 3, 4, {}); r.deco(23, 16, 'ry_cage', 3, 4, { empty: true });
  r.deco(7, 4, 'stain', 3, 4, {}); r.deco(27, 4, 'vent', 2, 2, {}); r.deco(20, 5, 'pipe_v', 1, 10, { s: 7 });
  fdeco(r, 8, 22, 'bones', 1, 1, {}); fdeco(r, 12, 22, 'bones', 1, 1, {}); fdeco(r, 29, 22, 'bones', 1, 1, {}); fdeco(r, 23, 22, 'rubble', 2, 1, {});
  fdeco(r, 6, 22, 'ry_tyres', 2, 1, {}); fdeco(r, 15, 22, 'ry_drums', 2, 1, {});
  r.deco(9, 12, 'ry_board', 5, 3, { text: 'KENNELS\nDO NOT FEED THE STAFF' });
  r.done();
}

// ------------------------------------------------------------------ 7. BULLDOG'S FORT  (36,90) 40x43   a scrap tower: climb up to the trophy room, down to the mess and barracks; floor top y=131 (local 41)
{
  const r = under('r_fort', "Bulldog's Fort", 36, 90, 40, 43, { ambient: [0.18, 0.12, 0.09] });
  r.floor(2, 'M');
  r.open('R', 19, 21); r.open('R', 38, 40);                                 // kennels tunnel (rows 109..111), armory tunnel (rows 128..130)
  r.solid(28, 22, 37, 23, 'S');                                             // entry ledge (top y=112)
  // the climb: ledge -> deck A (18) -> armory catwalk (14) -> deck C (10) -> trophy floor (6). Four double-jump hops of 4 up / 2 across.
  r.plat(20, 25, 18); r.plat(4, 17, 14); r.plat(20, 27, 10); r.solid(2, 6, 17, 7, 'S');
  // the way down: ladder to the mess floor, then a stair hatch to the barracks
  r.ladder(27, 22, 30);
  r.solid(2, 31, 37, 32, 'S'); r.clear(20, 31, 23, 32); r.plat(20, 20, 31); r.ladder(20, 32, 40);
  // Gecko flue: a 4-wide blank chimney above the entry ledge (wall-jump) to a hidden Vita-Tonic ledge
  r.solid(32, 2, 32, 19, 'S'); r.solid(37, 2, 37, 18, 'S'); r.plat(33, 34, 14); r.plat(35, 36, 9); r.plat(33, 36, 5);   // rest planks every ~5 rows
  r.ents([[5, 2, '*'], [13, 2, '*'], [22, 2, '*'], [6, 15, 'O'], [14, 15, 'O'], [22, 19, 'O'], [24, 11, 'O'], [30, 24, 'O'], [10, 33, '*'], [30, 33, '*'], [16, 33, 'O'], [25, 33, 'O'], [2, 20, 'l'], [36, 10, 'l'], [2, 36, 'l'],
    [31, 21, 'x'], [35, 21, '$'], [36, 21, 'F'], [22, 17, '$'],
    [8, 13, 'y'], [5, 13, '+'], [24, 9, 'j'], [26, 9, '%'],
    [11, 5, 'a'], [16, 5, 'F'],
    [6, 30, 'a'], [12, 30, 'x'], [24, 30, 'a'], [9, 30, 'F'], [17, 30, 'F'], [3, 30, 'K'], [19, 30, 'K'], [26, 30, 'K'], [29, 24, 'q'],
    [4, 40, 'Z'], [10, 40, 'a'], [15, 40, 'r'], [26, 40, 'r'], [7, 40, 'F'], [30, 40, 'F'], [13, 40, 'K'], [33, 40, 'K'], [35, 40, '+'], [28, 40, '$'], [18, 40, '%']]);
  r.mark(7, 5, 'terminal', { id: 'ry_ring', title: 'BULLDOG ENTERPRISES - RING CONTROL', lines: [
    "FIGHT NIGHT: EVERY NIGHT.\n\nCHAMPION: BIG BULLDOG (47-0)\nCHALLENGER: NONE (REGISTERED 0, SURVIVING 0)\nGATE: LOCKED\n\nTo open the gate, enter the challenger's name. To close it, enter the challenger's obituary.",
    "...ENTRY ACCEPTED. NAME: 'VAULT RAT'.\n\nGATE: OPEN.\n\nWARNING: the Ring is not covered by any known insurer. Spectators are asked to keep their limbs and their bets inside the stands.\n\n-- BULLDOG. (HIS TERMINAL, HIS RULES, HIS TYPING.)"],
    onRead: { flag: 'ry_ring', say: [['OVERSEER', 'The Ring gate is now open. I would like it noted that I recommended a locked door, and that you chose the poorer option.', 6.5]] } });
  r.mark(14, 5, 'pickup', { k: 'holotape', id: 'tape_ry_bulldog' });
  r.mark(35, 4, 'pickup', { k: 'upgrade', u: 'hp' });
  r.mark(15, 13, 'locker', { loot: [{ k: 'ammo', type: '10mm', n: 30 }, { k: 'stimpak' }, { k: 'caps', n: 60 }] });
  r.mark(15, 30, 'steam', { dir: -1, len: 3, period: 3.4, on: 1.1 });
  r.mark(34, 21, 'trigger', { w: 2, h: 3, id: 'ry_fort_hint', hint: "BULLDOG'S FORT. The planks lead up and to the left: the trophy room at the top runs the Ring gate.\nThe ladder here goes down to the mess hall and the barracks (and a bunk).", hintDur: 8 });
  // dressing
  r.zone(2, 2, 17, 5, 'bw_rust'); r.zone(2, 33, 37, 40, 'bw_concrete');
  r.deco(2, 2, 'cabletray', 30, 1, {}); r.deco(3, 33, 'cabletray', 34, 1, {});
  r.deco(9, 2, 'ry_banner', 1, 4, { flag: [150, 34, 22] }); r.deco(10, 2, 'ry_cage', 2, 3, { empty: true });
  fdeco(r, 2, 6, 'ry_throne', 3, 3, {}); r.deco(12, 2, 'ry_trophy', 5, 2, { text: 'NIGHT 212' });
  r.deco(6, 9, 'ry_scaffold', 12, 5, { levels: [], braces: true }); r.deco(20, 11, 'ry_scaffold', 8, 7, { levels: [], braces: true });
  fdeco(r, 4, 31, 'desk', 2, 2, {}); r.deco(8, 28, 'ry_tank', 3, 3, {}); fdeco(r, 21, 31, 'ry_gen', 2, 2, {}); fdeco(r, 13, 31, 'ry_drums', 3, 2, {}); fdeco(r, 22, 31, 'ry_tyres', 2, 1, {});
  r.deco(30, 28, 'ry_board', 5, 3, { text: 'MESS HALL\nSTEW: MYSTERY' }); r.deco(35, 25, 'hatch', 2, 2, {});
  fdeco(r, 2, 41, 'bunk', 3, 3, {}); fdeco(r, 6, 41, 'bunk', 3, 3, {}); fdeco(r, 20, 41, 'ry_drums', 2, 1, {}); fdeco(r, 23, 41, 'ry_tyres', 3, 1, {}); r.deco(31, 40, 'hazard_floor', 6, 1);
  fdeco(r, 31, 41, 'locker_row', 2, 2, {}); fdeco(r, 9, 41, 'bones', 1, 1, {}); fdeco(r, 17, 41, 'rubble', 2, 1, {});
  r.deco(15, 36, 'pipe_v', 1, 5, { s: 3 }); r.deco(33, 24, 'stain', 3, 4, {});
  r.done();
}

// ------------------------------------------------------------------ 8. BULLDOG'S ARMORY  (76,114) 36x19   optional dead end: bandolier, supplies and a cracked-wall closet with the super sledge; floor top y=131 (local 17)
{
  const r = under('r_stash', "Bulldog's Armory", 76, 114, 36, 19, { ambient: [0.17, 0.12, 0.09] });
  r.floor(2, 'M');
  r.open('L', 14, 16);                                                      // tunnel from the fort barracks (global rows 128..130)
  r.plat(15, 20, 12);                                                       // bandolier shelf (5 up: double jump)
  r.solid(27, 11, 33, 16, 'S'); r.clear(29, 14, 33, 16); r.breakable(27, 14, 28, 16);   // closet behind a cracked wall (Power Fist / grenade)
  r.ents([[6, 2, '*'], [18, 2, '*'], [28, 2, '*'], [11, 2, 'O'], [2, 12, 'l'], [33, 14, 'l'],
    [9, 16, 'y'], [22, 16, 'x'], [24, 16, 'a'], [4, 16, 'K'], [13, 16, 'K'], [25, 16, '%'], [7, 16, '%'], [17, 11, '$'], [19, 11, '$'], [21, 16, '+'], [26, 16, 'F']]);
  r.mark(16, 11, 'pickup', { k: 'upgrade', u: 'ammo' });
  r.mark(31, 16, 'pickup', { k: 'weapon', id: 'sledge' });
  r.mark(11, 16, 'locker', { loot: [{ k: 'ammo', type: 'shell', n: 20 }, { k: 'ammo', type: '10mm', n: 40 }, { k: 'stimpak' }, { k: 'radaway' }, { k: 'caps', n: 80 }] });
  r.mark(5, 16, 'trigger', { w: 2, h: 3, id: 'ry_armory_hint', hint: "BULLDOG'S ARMORY. The cracked wall at the far end is hollow.\nSomething heavy that needs a Power Fist or a frag grenade to reach.", hintDur: 7 });
  r.deco(2, 2, 'cabletray', 30, 1, {}); r.deco(8, 6, 'ry_board', 5, 3, { text: 'ARMORY\nBULLDOG ONLY\nTHIS MEANS YOU' });
  fdeco(r, 3, 17, 'ry_drums', 3, 2, {}); fdeco(r, 15, 17, 'locker_row', 4, 3, {}); fdeco(r, 20, 17, 'ry_tyres', 2, 1, {}); fdeco(r, 23, 17, 'ry_gen', 2, 2, {});
  r.deco(28, 3, 'ry_banner', 1, 5, { side: -1, flag: [40, 44, 52] }); r.deco(9, 2, 'ry_cage', 2, 4, {});
  r.deco(30, 12, 'hazard_floor', 3, 1); r.deco(2, 8, 'stain', 3, 4, {}); r.deco(24, 4, 'vent', 2, 2, {});
  r.done();
}

// ------------------------------------------------------------------ 9. THE RING  (36,62) 48x28   boss arena (Big Bulldog): flat floor top y=88 (local 26), interior 44x24, three dodge decks
{
  const r = under('r_arena', 'The Ring', 36, 62, 48, 28, { ambient: [0.31, 0.21, 0.16] });
  r.floor(2, 'M');
  r.open('R', 23, 25);                                                      // the Ring gate tunnel into The Pit (global rows 85..87)
  r.plat(5, 13, 23); r.plat(16, 31, 20); r.plat(34, 42, 23);               // dodge decks: 3 up, 6 up, 3 up
  r.ents([[8, 2, '*'], [18, 2, '*'], [30, 2, '*'], [40, 2, '*'], [3, 25, 'F'], [16, 25, 'F'], [31, 25, 'F'], [44, 25, 'F'], [8, 24, 'O'], [38, 24, 'O'], [19, 21, 'O'], [28, 21, 'O'], [2, 14, 'l'], [45, 14, 'l']]);
  r.mark(24, 25, 'arena', { boss: 'warlord', floor: 26, gates: [{ dx: 22, dy: -2, w: 2, h: 3 }], spawn: [-17, 0] });
  r.mark(42, 25, 'trigger', { boss: 'warlord', w: 2, h: 3, repeat: true, once: false });
  r.mark(26, 25, 'pickup', { k: 'ability', id: 'gecko', requires: 'boss_warlord' });
  // dressing: spectator stands double as the deck scaffolds
  r.deco(4, 17, 'ry_scaffold', 10, 9, { levels: [240], braces: true }); r.deco(33, 17, 'ry_scaffold', 10, 9, { levels: [240], braces: true }); r.deco(16, 14, 'ry_scaffold', 16, 12, { levels: [240], braces: true });
  r.deco(2, 2, 'cabletray', 44, 1, {}); r.deco(11, 2, 'ry_cage', 2, 5, {}); r.deco(22, 2, 'ry_cage', 3, 6, { empty: true }); r.deco(35, 2, 'ry_cage', 2, 5, {});
  r.deco(2, 21, 'ry_banner', 1, 5, {}); r.deco(44, 21, 'ry_banner', 1, 5, { side: -1, flag: [40, 44, 52] }); r.deco(15, 21, 'ry_banner', 1, 5, { flag: [150, 34, 22] }); r.deco(32, 21, 'ry_banner', 1, 5, { side: -1, flag: [150, 34, 22] });
  r.deco(20, 23, 'ry_board', 7, 3, { text: 'THE RING\nBULLDOG 47  -  CHALLENGERS 0', bg: [70, 44, 36] });
  fdeco(r, 2, 26, 'ry_tyres', 3, 1, { wall: true }); fdeco(r, 41, 26, 'ry_tyres', 3, 1, { wall: true }); fdeco(r, 8, 26, 'bones', 1, 1, {}); fdeco(r, 37, 26, 'bones', 1, 1, {}); fdeco(r, 30, 26, 'rubble', 2, 1, {});
  r.deco(5, 5, 'stain', 4, 5, {}); r.deco(38, 6, 'stain', 4, 5, {}); r.deco(2, 8, 'pipe_v', 1, 16, { s: 6 }); r.deco(45, 8, 'pipe_v', 1, 16, { s: 8 });
  r.done();
}

})();
