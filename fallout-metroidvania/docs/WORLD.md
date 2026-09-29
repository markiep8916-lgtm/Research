# FALLOUT: CINDER DEEP — World & Level Authoring Guide

This is the working spec for designing rooms. Read it fully before authoring. The game is an HTML5 Canvas metroidvania (classic `<script>` files, namespace `CD`, procedural art). Levels are authored in JavaScript with a small DSL (`src/world/dsl.js`) and validated headlessly by two tools. **Use the Vault rooms in `src/world/rooms_vault.js` as the reference for style and DSL usage.**

## 0. Tools (run from the project root)

| Command | Purpose |
|---|---|
| `node tools/world_check.js --summary` | Assembles all rooms, validates overlaps + border alignment. Prints room table and errors. |
| `node tools/world_check.js --dump <roomId>` | ASCII dump of a room in **global** coordinates (`@` = any entity spawn). Use it constantly. |
| `node tools/reach.js [--verbose] [--grant a,b] [--start x,y] [--thorough] [--enemies]` | Reachability solver using the game's real collision + player constants. Simulates jumps, double jump, wall jump, dash, ladders, elevators; unlocks abilities/keys/doors/bosses to a fixpoint. Prints what is unreachable. Fast (~1s). |
| `node tools/shot.js "index.html?start=1&kit=1&abilities=all&room=<id>" out.png --w 1280 --h 720 --wait 6000` | Screenshot a room in the real game (view it with the Read tool). Query params: `room=<id>` (teleport), `abilities=all` or `jetboots,gecko,jetrush,powerfist,hazmat`, `kit=1` (weapons/ammo), `debug=1` (draw trigger boxes), `start=1`. |

Write screenshots anywhere outside the repo (they are git-ignored if you keep them in `tests/`). The console output from shot.js shows JS errors — fix them.

**Validation workflow:** author → `world_check` (no errors *from your rooms*; "leads nowhere" errors for neighbouring regions that another author is still writing are expected) → `reach.js` (use `--grant` to pretend you already own earlier abilities/flags and `--start x,y` to begin at your region entrance, e.g. `--start 300,55 --grant jetboots,boss_warden,key:overseer`) → screenshots. Everything must be reachable *exactly when it should be* (see gating rules) and nothing sequence-breaks trivially.

## 1. Units and camera

* 1 tile = 40 px. The camera shows ~25.6 x 14.4 tiles (zoom 1.25) — **rooms should be at least 30 wide and 18 tall**, typically 40–72 wide. Camera is clamped to the current room; a room is a rectangle and the world is one global tile grid (x right, y down, all coordinates >= 0).
* Rooms touch edge-to-edge. An **opening** in the border of one room must line up with an opening in the neighbour (same global rows/columns). `world_check` enforces this. Keep 2-thick shells (`r.shell(2)`), openings 3 tall (2 is the minimum for the 66px-tall player; 3 is comfortable).
* Player hitbox is 22x66 px (~0.55 x 1.65 tiles), crouch 22x40.

## 2. Player movement metrics (design to these)

| Move | Safe design limit | Hard max |
|---|---|---|
| Single jump height | **≤ 3.5 tiles** (platform spacing 3) | 4.0 |
| Single jump gap (running start, same height) | **≤ 4 tiles** | ~5.5 (with coyote time) |
| Double jump (Jet Boots) total height | **≤ 6.5 tiles** | ~7 |
| Double jump gap (running start) | **≤ 6.5 tiles** | ~10 (needs the double jump late, about 0.35 s after the apex) |
| Wall cling/jump (Gecko Grips) | shaft interior 3–6 tiles wide; each kick gains ~3–3.6 tiles; hop one wall or alternate walls (you can only re-grip once the kick has slowed below 80 px/s, about 0.4 s later) | |
| Air dash (Jet Rush) adds | 0.16 s at 840 px/s plus the speed it leaves you with (bleeds off at 900 px/s²): ~6 tiles horizontally, one air dash per landing | jump + double jump + dash crosses 13 tiles |
| Falling | unlimited; spikes/hazards hurt; water is irradiated | |

Rules of thumb: a platform gap that *needs* the double jump should have a vertical spacing of ~5 (cannot be done with a single jump) and horizontal gap ≤ 2; a dash gate must be at least 13 tiles wide (the double jump alone crosses about 10; `tests/t_gap.js --want none` proves a gate holds); a wall-jump shaft should have blank walls (rest planks are fine, but leave one continuous wall side, the bobblehead pockets hang off the other). Ladders (`H`) are free vertical connectors. One-way platforms (`=`) can be jumped up through; press Down+Jump to drop through.

## 3. DSL (local coordinates: (0,0) is the room's top-left tile; y grows down)

```js
const r = CD.room(id, name, region, x0, y0, w, h, opts);   // opts: {sky, skyTop, bg, fg, ambient:[r,g,b], music, rad, secret, title}
r.shell(2, 'V');            // solid frame, thickness 2, optional material glyph
r.floor(4, 'G'); r.ceil(2); // n solid rows at bottom/top (glyph optional)
r.fill(x0,y0,x1,y1,'#');  r.clear(x0,y0,x1,y1);  r.hline(x0,x1,y,ch); r.vline(x,y0,y1,ch);
r.solid(x0,y0,x1,y1,ch);  r.plat(x0,x1,y);  r.ladder(x,y0,y1);  r.spikes(x0,x1,y);  r.ceilSpikes(x0,x1,y);
r.water(x0,y0,x1,y1);     r.breakable(x0,y0,x1,y1);   // X = cracked wall (Power Fist / grenade)
r.open('L'|'R', rowA, rowB [,depth]);  r.open('T'|'B', colA, colB [,depth]);   // carve a doorway through the shell
r.ent(x,y,'r'); r.ents([[x,y,'r'],...]);                // entity glyph (see §4)
r.mark(x,y,'door',{...});                                // up to 10 marks (digits) per room
r.deco(x,y,'kind',wTiles,hTiles,{...});                  // unlimited static decor
r.zone(x0,y0,x1,y1,'bw_brick'|null);                     // override back-wall style (null = open sky) for building interiors
r.done();                                                // registers the room
```
Files: each author writes one `src/world/rooms_<region>.js` inside an IIFE like the vault file: `(function(){ 'use strict'; const CD = window.CD, R = CD.room; ... })();`. You may append your own decor painters to your `src/gfx/decor_<region>.js` (see §7) and **must not edit any other shared file** (other authors work concurrently) — report needed engine changes instead.

`opts`: `sky:true` for outdoor rooms (sun-lit where no solid above, parallax skyline backdrop; set `skyTop:true` if the top of the room is open air — then the top row(s) must not be walled), `bg:'bw_xxx'` back-wall style, `rad:n` ambient radiation per second scale (0.2..1), `ambient:[r,g,b]` to override the region light (dark rooms ~0.10–0.16, bright 0.4+), `secret:true` (not shown on the map until visited).

### Materials (terrain glyphs)
`#` region default · `V` vault steel · `C` concrete · `B` brick · `R` rock · `S` scrap · `M` rusted metal · `G` soil (surface, grass-less dust top) · `A` asphalt · `L` diner lino · `W` wood · `Y` sterile lab · `E` red sandstone · `U` subway tile. Special: `=` one-way platform · `^` floor spikes · `v` ceiling spikes · `X` cracked wall · `H` ladder · `~` irradiated water · `.` air.
Back walls (`bg`): `bw_vault bw_concrete bw_brick bw_rock bw_scrap bw_rust bw_lab bw_wood bw_diner bw_tunnel bw_redrock`.

## 4. Entity glyphs (placed with `r.ent`) — the cell becomes air; the entity stands at that cell's floor

Enemies: `r` radroach · `f` bloatfly (flying) · `m` mole rat (burrows) · `g` feral ghoul · `z` glowing one (radioactive ghoul) · `a` raider (pipe pistol) · `j` raider sniper (rifle) · `x` raider (SMG) · `y` raider brute (melee) · `u` super mutant · `p` protectron · `o` eyebot (flying) · `q` turret (auto-mounts to ceiling/floor/wall by adjacent solid) · `s` radscorpion · `c` mirelurk · `h` Mr. Handy (flying).
Items: `$` caps · `+` stimpak · `%` ammo (type = room's `ammo` opt, default 10mm) · `&` RadAway.
Props/lights/interactables: `*` ceiling fluorescent (place in the first air row under a ceiling) · `O` hanging lamp · `l` wall lamp (place in the air column touching a wall) · `F` fire barrel (lights + fire) · `Z` bunk bed (**save point**: rests, heals, respawns enemies) · `T` generic terminal · `N` Nuka-Cola vending machine (**shop**) · `K` breakable crate (random loot) · `Q` locker (random loot; use a mark for chosen loot).
Enemy stats scale with region difficulty automatically (vault 1.0, surface 1.2, rustyard 1.4, metro 1.6, plant 1.85, deep 2.15).

## 5. Marks (`r.mark(x,y,'type',{...})`)

* `door` `{lock, style, w, h, label, hint, auto}` — mark is the door's **bottom-left** cell; it occupies w x h tiles going up/right. `lock`: `'none'` (press E) | `'open'` (auto-opens when near) | `'key:<id>'` | `'flag:<name>'` | `'terminal:<termId>'` | `'ability:<name>'`. Style `vault|blast|wood|scrap`. Put doors *inside* a doorway; the door needs solid frame around it.
* `elevator` `{w, rise, speed, startTop, hint}` — mark at the **bottom stop** cell; the platform's top surface is flush with the bottom edge of the cell; it can travel `rise` tiles up (`startTop:true` starts it at the top). Riders press E; call it from either stop.
* `mplat` `{w, rx, ry, spd, phase}` — moving platform oscillating over rx/ry tiles (avoid unless useful; the solver treats them as absent).
* `terminal` `{id, title, lines:[page,...], hack:{wl:8,n:7}, giveKey:{id,name}, holotape:'tapeId', flag, onRead:{setObjective:n, flag, say:[...], call}}` — `lines` are pages (use `\n`). `hack` makes the player win the word-guessing minigame first (word length `wl` in 7–9 uses 8-letter words best).
* `locker` `{loot:[{k:'weapon',id:'shotgun'},{k:'ammo',type:'shell',n:14},{k:'stimpak'},{k:'caps',n:40}...]}`.
* `npc` `{id, name, outfit:'trader'|'scientist'|'raider'|'guard'|'ghoul'|'vault'|'mutant', face:1|-1, lines:[greeting, extra...], topics:[labels], shop:'trader'|'vending', weapon}` — talk with E (extra lines become "Tell me more" topics; `shop` adds a Trade option).
* `pickup` `{k, ...}`: `k:'ability', id:'gecko'|'jetrush'|'powerfist'|'hazmat'` · `k:'upgrade', u:'hp'|'ammo'|'stim'` (Vita-Tonic +10 max HP / Ammo bandolier +25% cap / Doctor's bag +2 stimpaks cap) · `k:'bobble', stat:'S'|'P'|'E'|'C'|'I'|'A'|'L'` · `k:'key', id, name, col` · `k:'weapon', id` (`pistol10 hunting_rifle shotgun assault_rifle laser_pistol laser_rifle plasma_rifle minigun bat machete sledge ripper`) · `k:'holotape', id` · `k:'perkpoint'` · plus `caps/stimpak/radaway/grenade/ammo`. Add `requires:'boss_<id>'` (or any flag) to make the pickup invisible/uncollectable until that flag is set (used for boss rewards).
* `trigger` `{w, h, id, say:[[speaker,text,seconds],...] | [speaker,text], hint:'text with \\n', banner:{title,sub,text,col,dur}, boss:'bossId', flag, once:false, repeat:true, setObjective:n, sfx, shake}` — invisible zone; mark = bottom-left cell, w x h tiles. Speaker `'OVERSEER'` (amber intercom) or a name.
* `arena` `{boss, floor, gates:[{dx,dy,w,h}], spawn:[dx,dy]}` — **boss arena definition**, placed anywhere inside the arena room. `floor` = local row (in that room) of the floor's top surface. `gates` = rectangles (offsets in tiles from the mark; top-left is (dx,dy)) that slam shut when the fight starts (put them across the entrance doorway(s), e.g. `{dx:-20,dy:-2,w:2,h:3}`). `spawn` = boss start offset from the mark. Also place a `trigger` mark with `{boss:'<id>', w:2, h:3, repeat:true, once:false}` inside the entrance so the fight starts when the player walks in. Boss ids: `warlord` (Rustyard), `glowing_one` (Metro), `deathclaw` (Ridge cliff), `sentry` (Plant), `overseer` (Deep). Arena rooms need a **flat floor, ≥ 40 wide x 20 tall interior**, 2–3 platforms for dodging, no spikes. The boss's reward pickups go in the arena with `requires:'boss_<id>'`.
* `steam` `{dir:-1|1, len:3, period, on}` — periodic scalding vent (placed on a floor/platform cell, jets up if dir -1). `arc` `{len, period, on}` — electric arc between two pylons `len` tiles apart (mark = left pylon). `screen` `{w,h,lines,col}` — wall monitor. `fan`.

Lore/text helper: `CD.HOLOTAPES = CD.HOLOTAPES || {}; CD.HOLOTAPES.tape_id = { title:'...', text:['paragraph','paragraph'] };` (define these in your rooms file; reference with `pickup {k:'holotape', id:'tape_id'}`).

## 6. World layout — fixed interface points (global tile coordinates)

Bands: **Surface** y≈28–62 (ground top surface at global y=56; outdoor sky rooms use y0=28, h=34, `floor(6,'G')`, soil rows 28..33 local). **Vault** below the surface. **Metro/Plant** underground east. **Deep** far below (y ≥ 156).

Existing (authored) rooms: Vault: `v_cryo` (8,134) `v_corr` (52,138) `v_shaft` (112,64; 24x90) `v_tools` `v_living` `v_med` `v_atrium` (136,64; 96x32) `v_warden` (232,64) `v_office` `v_dgate` (136,138; 40x16) `v_silo` (280,28; 24x56, the surface lift). The silo has openings at global rows **53..55** on its **left (x=280)** → Rustyard and **right (x=304)** → town.

Surface (Cinder Ridge town, authored by the lead): `s_hill` (304,28,56x34) `s_station` (360,28,52x34) `s_main1` (412,28,64x34) `s_main2` (476,28,64x34). Adjacent rooms connect at ground level via openings at rows **53..55** with the ground top at y=56. `s_main1` has a subway stairwell: a hole in its floor at global columns **452..457** leading down into `m_entry`. `s_main2` has a maintenance-hatch shaft in its floor at global columns **500..505** leading down into the Metro (`m_lift`).

Interfaces you must match:

| Link | Details |
|---|---|
| Silo ↔ **Rustyard** | `r_gate` must have its right border at x=280 (room `x0+w = 280`), opening rows 53..55, ground top y=56. |
| `s_main1` ↔ **Metro** | `m_entry`: top border at y=62, opening columns 452..457 (must line up with s_main1's stairwell). |
| `s_main2` ↔ **Metro** | `m_lift`: top border at y=62, opening columns 500..505. One-way-ish shortcut: a ladder/lift from the surface down into the Metro. |
| `s_main2` ↔ **Ridge** | `s_over` (540,28,72x34): left border x=540, opening rows 53..55, ground 56. |
| `s_over` ↔ `s_ridge` | `s_ridge` (612,28,56x34): left border x=612, rows 53..55. `s_ridge` top opening columns 636..643 at y=28 → `b_cliff` (612,0,56x28) bottom columns 636..643. |
| `s_ridge` ↔ **Plant** | `p_gate` (668,28,44x34): left border x=668, rows 53..55, **sealed by a cracked wall (`X`, Power Fist) on the Plant side**. |
| `v_dgate` ↔ **Deep** | `v_dgate` floor has a lift shaft at global columns **160..169** through its floor (its bottom border y=154). `d_lift` (136,154,40x?): top border at y=154 with opening columns 160..169. The lift is an `elevator` (w=10) whose bottom stop is `d_lift`'s floor; its top stop is flush with v_dgate's floor at y=150 (choose `rise = d_lift floor top y − 150`, `startTop:true`). |

## 7. Regions and briefs

Region ids (for `CD.room`): `vault surface rustyard metro plant deep`. Ridge rooms use region `surface`.

**Global progression (ability gating):** Jet Boots (Vault, double jump) → Warden boss → surface → **Rustyard**: boss *Warlord* → **Gecko Grips** (wall jump) → **Metro**: needs Gecko Grips inside; boss *Glowing One* → **Jet Rush** (air dash) → surface overpass gap needs the dash → **East Ridge/Brotherhood cliff** (wall-jump shafts + dash): boss *Deathclaw* guards the **Power Fist** (breaks `X` walls) → **Plant** gate barricade needs the Power Fist → boss *Sentry Bot* gives **Hazmat Suit** + `key:level7` → back to the Vault's Reactor Gate (`v_dgate` door `key:level7`) → lift down → **Cinder Deep** (flooded halls need the Hazmat Suit; final boss *Overseer Prime*). Cracked walls (`X`) hide secrets everywhere (they need the Power Fist or a grenade, so they are for backtracking).

Every region must contain: at least **2 save beds (`Z`)** (not adjacent to a boss arena entrance... one *before* the arena is good) and **1 Nuka vending machine (`N`)**; **1 boss arena** (if listed); **its ability/key reward**; **1 bobblehead** (hidden: requires a hard-to-see route or a cracked wall — stat given per region); **1–2 Vita-Tonics (`upgrade hp`)**; **1 ammo bandolier or Doctor's bag** (`upgrade ammo|stim`); 3–5 **holotapes/terminals** with lore; 2–3 weapon pickups; a mix of enemies scaled to the region; hazards (spikes, steam, arcs) used sparingly and *telegraphed*; and clear landmark rooms. Give rooms names; give them strong visual identity (see materials/backdrops/lights). Avoid dead-end tedium: loops and shortcuts (one-way drops, elevators that connect back) are encouraged. Don't overfill with enemies: 3–8 per big room. Enemy ground types need ≥ 6 tiles of walkable floor to patrol; flyers need open air ≥ 6x4; turrets on walls/ceilings covering a hazard.

Lighting: rooms are dark; put lights (`*` `O` `l` `F`) where the player should look — the player carries a dim light. Sky rooms (surface/rustyard) are sun-lit dusk.

### Lore bible (keep texts consistent; tone = Fallout: dark humour, retro-futurism, gallows optimism)
Year 2287. Vault 213 lies under the ruins of **Cinder Ridge**, an Ohio-valley industrial town. Vault-Tec's experiment there was the **Sleeper Protocol**: keep one dweller in cryo, revive them every few decades, send them to the surface and see if a human can survive and come back. The vault's AI, the **Overseer**, is chirpy, passive-aggressive and deadly polite; it has run six cycles — **Sleepers One to Six** all died (their logs and remains are found around the wasteland; each Sleeper left gear behind). The player is **Sleeper Seven**. The vault reactor is failing; the Overseer sends Seven to the **Meridian Power Station** (fusion plant far east) for a **Fusion Core**. The truth: the deep sublevels (**Cinder Deep**) hold ~4,000 sleepers in cryo; the Overseer is desperate, not evil, but ruthless. Surface factions: **raiders** (Rustyard warlord *Big Bulldog*), **feral ghouls** (Metro; the *Glowing One* is a radiation-lit ghoul matriarch, formerly Dr. Ida Marrow, a Vault-Tec metro physician), a lone **Brotherhood of Steel** scout team whose vertibird crashed on the ridge (Scribe Hollis's logs; a Deathclaw nested in the wreck), the **Meridian Power Station** with its security **Sentry Bot "Warden-9"**, malfunctioning Protectrons/Mr. Handys, and an old trader **Haskell** at the vault exit. Key items: Jet Boots (Sleeper Six), Gecko Grips (Sleeper Four), Jet injector rig (Sleeper Five), Power Fist (Paladin Kessler, dead), Hazmat suit (Meridian decon). Brand names to use freely: Nuka-Cola, Vault-Tec, RobCo, Sugar Bombs, Red Rocket, Poseidon Energy, Mr. Handy, Protectron, Pip-Boy, Stimpak, RadAway, Rad-X, Med-X, Jet, Psycho, Mentats.

### Region briefs

* **Rustyard** (region `rustyard`, difficulty 1.4, sky outdoors with `bg:'bw_scrap'` interiors, materials `S` scrap and `M` rust, fire barrels, cranes, car stacks; raiders `a j x y`, radroaches, scorpions, a mole rat den; a turret or two). Rooms (5–6): `r_gate` (248,28,32x34) → `r_yard` (196,28,52x34) → `r_stacks` (144,28,52x34, tall car stacks: vertical double-jump traversal) → `r_cliff` (96,28,48x34) with a shaft down; underground raider fort: `r_pit` / `r_fort` around x 40..108, y 62..118 (keep clear of the vault shaft x 112..136 and atrium x ≥ 136 at y 64..96) with the boss arena `r_arena` for **Warlord "Big Bulldog"** (`boss:'warlord'`) → reward pickup **Gecko Grips** (`k:'ability', id:'gecko', requires:'boss_warlord'`). Bobblehead **Perception (P)**; weapons: shotgun (locker), machete, a super sledge secret; Sleeper Four's remains. All needed with double jump only; a couple of optional shortcuts that need Gecko Grips after you have them.
* **Metro** (region `metro`, difficulty 1.6, dark tunnels with `bg:'bw_tunnel'`, concrete `C` and subway tile `U`, wrecked trains (decor), ghouls `g`, glowing ones `z`, radroaches, mole rats, mirelurks in flooded sewers; rad water `~` optional shortcuts (hazmat later)). Rooms (6–7): `m_entry` (440,62,…) reached from `s_main1`, station platforms, tunnels, a sewer, a wall-jump shaft (needs Gecko Grips), a shortcut `m_lift` (x 492..516) up to `s_main2` (a one-way ladder/lift), the Glowing One's chem den `m_den` with arena (`boss:'glowing_one'`) → **Jet Rush** (`k:'ability', id:'jetrush', requires:'boss_glowing_one'`). Bobblehead **Endurance (E)**; weapon: assault rifle, ripper (secret). Sleeper Five's remains + the Jet injector rig logs.
* **Plant** (region `plant`, difficulty 1.85, industrial: `M` rust metal, `bw_rust`, green glow, lots of pipes/steam/arcs/turrets, protectrons, eyebots, mr. handys, scorpions; rad zones (`rad:` opt) and irradiated water that needs the Hazmat Suit for the *deeper optional* parts). Rooms (6–7): `p_gate` (668,28,44x34, outdoor perimeter with the cracked-wall barricade at the west end), cooling-tower yard, turbine hall, control room, coolant flood hall (rad water), decontamination lockers (**Hazmat Suit** reward `k:'ability', id:'hazmat', requires:'boss_sentry'`... or place it behind the boss), the reactor arena with **Sentry Bot "Warden-9"** (`boss:'sentry'`). Boss reward also a `key` pickup `{k:'key', id:'level7', name:'Level 7', col:'#ff5a48', requires:'boss_sentry'}` and the **Fusion Core** (a `holotape`-like story item: `{k:'key', id:'fusioncore', name:'Fusion Core', col:'#5cffb0', requires:'boss_sentry'}`). Bobblehead **Intelligence (I)**; weapons laser pistol/laser rifle. Region x ≥ 668, y from 28 to ~130.
* **Cinder Deep** (region `deep`, difficulty 2.15, sterile labs `Y` + `bw_lab`, white/teal light with red emergency lighting, cryo halls (decor `pods`), robots (protectron/handy/turret/eyebot), ghoul/mutant experiment failures; flooded lower halls with rad water require the **Hazmat Suit** to cross). Rooms (5–6): `d_lift` (136,154,40x?) top interface as above, entry hall, labs, flooded reactor hall, the **cryo vault** (4,000 sleepers: huge impressive decor), and the Overseer's sanctum arena (`boss:'overseer'`). The final boss encounter ends the game (the lead handles the ending via a `trigger {call:'ending'}` you place after the arena on the far side: put a small `trigger` mark with `call:'ending'` in a tiny room/alcove behind the arena that appears with `requires`... simply place it where the player walks after the boss dies; the lead will wire the requirement). Bobblehead **Luck (L)**; weapons plasma rifle, minigun. Sleeper One–Three logs.
* **East Ridge & Brotherhood cliff** (region `surface` sky rooms `s_over`, `s_ridge`, `b_cliff`): `s_over` = ruined highway overpass: the **upper deck has a 13-tile gap that needs the dash**; the lower street is blocked by a cracked wall (Power Fist) — gives two routes; `s_ridge` = canyon with wall-jump shafts (Gecko Grips) up to `b_cliff` where a **Brotherhood vertibird crash site** holds the **Deathclaw arena** (`boss:'deathclaw'`) → **Power Fist** (`k:'ability', id:'powerfist', requires:'boss_deathclaw'`) + Scribe Hollis's holotapes. Bobblehead **Agility (A)**; weapon laser pistol. The cracked wall to the Plant is on `p_gate`'s side (Plant author). Also add a bed and a vending machine on the ridge.

### Region decor
Add region-specific decor painters in `src/gfx/decor_<region>.js`:
```js
CD.decor.kinds.car = function (g, d, r) { /* g: canvas 2D in world px; d.x,d.y,d.w,d.h box; r = seeded RNG; d.p = your deco options */ };
```
Use `r.deco(x,y,'car',wTiles,hTiles,{...})` in rooms. Existing kinds: `pipe_v conduit cabletray vent stain hatch stripe debris rubble rocks papers can bones weeds poster sign pod pods vaultdoor pillar desk locker_row bunk hazard_floor window`. Paint with gradients, rim light, grime (see `src/gfx/decor.js`); it is baked once into chunk canvases (not per-frame), so cost is fine. Floor-clutter kinds treat `d.y` as the floor top; box kinds draw inside `[x,y,w,h]`.

## 8. Style checklist
* First screenshot of every room must read well: silhouette, lighting, landmarks. Add decor (`deco`) generously (posters, signs, machinery, wrecks) and use `zone` for building interiors.
* Openings between rooms should be visually motivated (doors, tunnels, ladders).
* Each room should have one clear traversal idea (a jump puzzle, a vertical climb, an ambush arena, a hazard corridor…).
* Use `r.mark(...)`/`trigger` for a few Overseer/NPC voice lines and tutorial hints where new mechanics appear (e.g. "Push into walls with Gecko Grips to cling; press JUMP to wall-jump").
* Provide a boss-arena **approach**: a bed + supplies before it; a short corridor with a warning sign.
* Keep total marks per room ≤ 10; use decos freely.
