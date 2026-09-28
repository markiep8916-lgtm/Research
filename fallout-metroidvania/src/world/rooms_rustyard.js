// REGION 3: THE RUSTYARD (region 'rustyard', difficulty 1.4). A raider-held junkyard west of the vault exit silo.
// Surface (sunlit dusk, y 28..62, ground top y=56): r_gate -> r_yard -> r_stacks -> r_cliff -> shaft down.
// Raider fort (x 36..112, y 62..132): r_pit / r_kennel / r_fort / r_approach / r_arena (boss: Big Bulldog, warlord -> Gecko Grips).
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

// ------------------------------------------------------------------ holotapes
CD.HOLOTAPES.tape_ry_dogtag = { title: 'Dogtag: Spike Malone', text: [
  'RUSTYARD GATE LOG, DAY 212. Still standing at this stupid gate. House rules, painted on the wall so even Gutter can read them. ONE: the Bulldog is always right. TWO: if the Bulldog is wrong, see rule one. THREE: the toll is twenty caps, or your boots, or your boots\' contents.',
  'Nobody has come up the east lift in years. Bulldog says the silo is haunted by pre-war ghosts and good manners. If you are hearing this, tape-finder: the yard runs one long line west. Gate, yard, stacks, cliff, then the Pit. Bulldog holds court at the bottom. Do not go down there. Or do. I am a dogtag, not your mother.'] };

// ------------------------------------------------------------------ 1. SCRAPGATE  (248,28) 32x34   first raider checkpoint; the silo (vault steel) is the east wall
{
  const r = surface('r_gate', 'Scrapgate', 248, 32);
  r.solid(30, 0, 31, 33, 'V'); r.open('R', 25, 27, 2);                   // vault silo tower + door tunnel (rows 53..55)
  pylonL(r);
  r.solid(10, 27, 13, 27, 'G');                                            // low soil bump
  r.solid(17, 26, 19, 27, 'S');                                            // crushed-car barricade (2 high)
  // watchtower: lookout roof + plank deck + ladder
  r.solid(3, 17, 11, 18, 'S'); r.plat(4, 10, 21); r.ladder(10, 22, 27);
  r.ents([[7, 20, 'j'], [14, 27, 'a'], [8, 27, 'a'], [4, 27, 'r'], [22, 27, 'r'],
    [26, 27, 'F'], [15, 27, '$'], [27, 27, '$'], [24, 27, 'K'], [12, 26, 'K'], [5, 20, '+'], [9, 20, '%'], [7, 19, 'O'], [29, 24, 'l'], [3, 27, 'F']]);
  r.mark(28, 27, 'trigger', { w: 2, h: 3, id: 'ry_enter', say: [['OVERSEER', 'Sleeper Seven, you are now leaving Vault-Tec property. Local salvage law is finders keepers. Please be a finder.', 6.5], ['OVERSEER', 'Radiation, raiders and rudeness are all above average today. Enjoy your surface experience!', 5.5]] });
  r.mark(13, 26, 'pickup', { k: 'holotape', id: 'tape_ry_dogtag' });
  // set dressing (back to front)
  r.deco(0, 22, 'ry_heap', 15, 6, { far: 0.45 }); r.deco(15, 23, 'ry_heap', 14, 5, { far: 0.5 });
  r.deco(11, 20, 'ry_gate', 11, 8, { text: 'THE RUSTYARD', sub: 'PROPERTY OF BIG BULLDOG' });
  r.deco(2, 26, 'ry_fence', 4, 2, {}); r.deco(20, 26, 'ry_fence', 5, 2, { torn: 1 });
  r.deco(4, 17, 'ry_scaffold', 7, 11, { levels: [160] });
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
  // raider cover near the entrance and stairs of crushed-car cubes up to the gun cage (2 rows per step)
  r.solid(47, 26, 48, 27, 'S');
  r.solid(17, 26, 18, 27, 'S'); r.solid(19, 24, 20, 27, 'S'); r.solid(21, 22, 26, 23, 'S');
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
  gdeco(r, 12, 'ry_gen', 2, 2, {}); gdeco(r, 14, 'ry_tank', 3, 3, {});
  gdeco(r, 27, 'ry_car', 4, 2, { pal: 3, kind: 'pickup', flip: true, flat: 1 }); gdeco(r, 41, 'ry_car', 4, 2, { pal: 1, tilt: 0.04 });
  gdeco(r, 22, 'ry_drums', 2, 1, {}); gdeco(r, 44, 'ry_tyres', 3, 1, {}); gdeco(r, 19, 'ry_tyres', 2, 1, { r: 12 });
  r.deco(49, 23, 'ry_banner', 1, 5, { side: -1 }); r.deco(2, 23, 'ry_banner', 1, 5, {});
  r.deco(42, 24, 'ry_pole', 1, 4, { arm: 120 });
  gdeco(r, 8, 'bones', 1, 1, {}); gdeco(r, 9, 'ry_tyres', 1, 1, { r: 11 });
  r.done();
}

})();
