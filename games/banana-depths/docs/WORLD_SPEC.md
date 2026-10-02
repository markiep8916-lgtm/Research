# Banana Depths: world design spec

Banana Depths is a 3D-rendered, side-scrolling **metroidvania** starring a gorilla in a red tie (an unofficial
Donkey Kong tribute). The world is **26 rooms in 5 areas**. Four abilities gate progress. This document is the contract
for building the rooms. A headless **reachability solver** that uses the real player physics proves whether your rooms
do what this spec says, so use it constantly.

```
Jungle Canopy -> Sunken Temple -> Crystal Caverns -> Smoldering Quarry -> Girder Tower
   ROLL            POUND              GRIP               BOOMERANG         (all four)
```

## 0. Ground rules

* You write ONE file: `src/world/rooms/<area>.js`, exporting `export const rooms = [ ...builders.map(b => b.build()) ]`.
  Develop in a scratch copy `src/world/rooms/_wip_<area>.js`, test it with `--module=` (below), and only at the end
  copy it to `<area>.js`. **Never edit any other file** (not even to fix an engine bug: report it instead).
* Use EXACTLY the room ids, sizes, `area`, `map` positions and portal wiring from section 6. Everything else
  (layout, enemies, secrets, decoration, difficulty shaping) is yours.
* `src/world/rooms/jungle.js` contains `j_start`, a finished exemplar. Read it first; copy its style.
* Boss arenas (`t_golem`, `c_queen`, `g_top`) and `g_heart` are already built in `rooms/bosses.js`. Link to them with portals.

## 1. Coordinates and the builder (`src/world/builder.js`)

`new RoomBuilder(id, w, h, { name, area, map:{x,y}, props })`. Origin (0,0) is the BOTTOM-LEFT tile, **y goes up**.
A body stands with its feet at an integer y: ground made of rows `0..2` means you stand at y = 3.

```
b.border('#')                 // 1-tile wall on all four sides (rooms with an invisible ceiling may skip the top, see 5)
b.ground(x0, x1, top)         // solid from y=0 up to row `top`  (stand at y = top+1)
b.rect(x, y, w, h, ch)        // fill a rectangle with a terrain/marker char     b.clear(x,y,w,h)  // empty it
b.hline(x0,x1,y,ch)  b.vline(x,y0,y1,ch)   b.set(x,y,ch)   b.mark(x,y,ch)
b.plat(x, y, len)             // one-way platform in row y (its top is at y+1; jump up through it, Down+Jump to drop)
b.block(x, y, len, thick)     // thick solid platform with its top row at y
b.ladder(x, yBottom, yTop)    // H tiles from yBottom..yTop-1 and a ladder-top T at yTop (you stand at yTop+1)
b.vine(x, y0, y1)             // climbable vines (non-solid)
b.stamp(x, y, ['ASCII','rows'])   // rows[0] is the TOP row; ' ' = untouched, '.' = clear
b.bananas(x,y,n,dx,dy)  b.arc(x0,y0,x1,n,rise)   // banana lines and jump-shaped banana arcs
b.portal('1', 'dest_room', 'destDigit')            // wire a portal digit placed on a border (see 4)
b.prop('relic','roll')  b.prop('signs',[...])      // room properties (see 3)
```

### Terrain characters
| ch | tile | notes |
|----|------|-------|
| `#` | solid | |
| `=` | one-way platform | solid from above only |
| `^` `v` | spikes up / down | hurt + respawn at the last safe ground |
| `H` `T` | ladder / ladder-top | T is a one-way floor you can stand on and press Down on to descend |
| `V` | vine | climbable, not solid |
| `R` | crate (roll block) | a rolling Kong smashes it; a crate column crumbles as a whole |
| `G` | cracked slab | broken by a Ground Pound from above (it drills through stacked slabs) |
| `L` / `W` | lava / water | hazards: -1 HP and respawn at the last safe ground (water never kills the last HP) |
| `D` / `E` | gate A / gate B | solid until switch `w` / `x` is hit (in boss rooms `E` opens when the boss falls) |
| `Y` | spring tire | bounce ~6 tiles (~9 with Jump held). **Embed it flush in the floor** (replace a floor tile) |
| `F` | crumbling block | drops 0.45 s after being stood on, returns after 3 s (the solver treats it as solid) |

### Marker characters (placed on empty tiles)
`@` start (only `j_start`) | `S` save barrel (checkpoint + full heal) | `o` banana | `h` heart fruit (+1 max HP) | `Q` relic (ability, set `prop('relic', ...)`) | `?` sign (texts come from `prop('signs',[...])` in the order you placed the `?` marks) | `K` golden banana (goal) | `B` boss spawn (boss rooms only)

Enemies: `s` snapjaw (croc patroller, stompable) | `t` thornbug (spiked; never stomp it) | `a` bat (must hang directly **below a solid ceiling tile**) | `p` spider (placed in the empty tile just under a ceiling; it dangles on a thread) | `u` / `U` tiki turret facing left / right (1x2 tall; needs 2 tiles of headroom) | `m` magma blob (hops; floor only) | `f` fire wisp (floats, only the boomerang hurts it; use only in the Quarry and Tower) | `n` / `N` barrel cannon facing left / right (floor only; launches rolling barrels) | `w` / `x` crystal switch for gate A / B.

Digits `0-9` are **portals** (section 4).

### Room props
`name` (shown in the title card), `titleCard:true` (show the banner even when staying in an area), `signs:[...]`,
`relic:'roll'|'pound'|'grip'|'boom'`, `waterfall:{x,y,w,h}` (jungle only: decorative falls, world coordinates),
`slapA:true` / `slapB:true` (switch `w`/`x` can also be hit by a slap instead of only by the boomerang).

## 2. Movement cheat sheet (use these numbers when you place platforms)

* Camera shows about **22 x 12.5 tiles** and looks 2-3 tiles ahead. Keep each beat inside one screen when you can.
* Standing hitbox 1.0 wide x 1.7 tall: 2-tile-high corridors are walkable. **1-tile-high tunnels are roll-only** (ball hitbox 0.9).
* Full jump: **3.1 tiles up**, tap-hop 1.1. Comfortable rise: up to **2 tiles**; absolute max 2.8.
* Run speed 7.4 t/s. Plain jump clears gaps of **<= 4 comfortably (5 absolute max)**.
* **Roll-jump** (jump out of a roll): gaps of **6-7**. A roll lasts 0.55 s (~6 tiles) so you need a runway of a few tiles.
* Spring tire: 6 tiles up (9 with Jump held).  Ladders: 4.8 t/s up.
* **Wall grip**: slide on walls, kick off with Jump. Climbing a shaft needs **walls on both sides, interior width 4** (3-5 works) with no overhangs.
* **Ground pound** (Down + X in the air): breaks `G` slabs under Kong (the 1-2 columns he covers), so make slab openings 3+ wide and 2 layers thick.
* Boomerang: flies **8 tiles horizontally**, stops at walls, hits a switch if the switch is within ~1 tile of the height of Kong's chest. Put switch ledges across a gap or behind a pit.
* Enemy contact = 1 damage, Kong has 3 hearts to start (+1 per heart fruit, 9 exist). Falling in pits/water/lava = 1 damage and a respawn on the last safe ground.

## 3. What the player owns, and when

| area | abilities held when entering | learned here |
|------|------------------------------|--------------|
| Jungle | none | **Roll** (`j_shrine`) |
| Temple | Roll | **Ground Pound** (`t_pound`, after the Golem boss) |
| Caverns | Roll, Pound | **Gorilla Grip** (`c_grip`, after the Spider Queen) |
| Quarry | Roll, Pound, Grip | **Banana Boomerang** (`q_forge`) |
| Tower | all four | none (final boss: Tiki Overlord) |

A room's *main path* must be doable with exactly the abilities held at that point. *Secrets* demand a later ability, which is what makes the
player want to come back: a heart visible behind a crate wall in the Jungle (needs Roll), slabs hiding a heart (needs Pound), a tall shaft (needs Grip), a far switch (needs Boomerang).
Show secrets from afar (visible bananas / the heart itself / a suspicious crate wall) so players remember them.

## 4. Portals: how rooms connect

A portal is a run of the same digit placed on a **border cell of the room** (x=0 left, x=w-1 right, y=h-1 top, y=0 bottom). Walking (or climbing) into it
transports Kong to the paired portal of another room. Wire it with `b.portal('1', 'other_room', '2')` and make sure the destination wires back
(`world.js` validates this).

Where Kong appears (**keep these spots safe and free of hazards, with floor under them**):
* **left** portal: x = 2.3 (feet at the portal's lowest row), facing right. The 2 tiles around (2.3, y0) must be free and have solid floor below.
* **right** portal: x = w - 2.3, facing left.
* **top** portal: falls in at x = centre, y = h - 3.2 (a shaft of >= 3 clear tiles under it; give him something to land on or a ladder to catch).
* **bottom** portal: pops up at the portal's top with an upward kick (vy 14) so he rises out of the hole.
* **Vertical portals must be ladder shafts at BOTH ends**, otherwise Kong lands back inside the portal and bounces between rooms. A *top* portal sits above a ladder column that
  runs up to the border (Kong climbs into it); a *bottom* portal sits over a ladder column that rises from the portal cell to a `T` at a floor/ledge (he arrives on the ladder and climbs out).
  If Kong is climbing as he passes through, he keeps climbing. Where a portal is reached by *falling* (a pit shaft), the ladder still exists below the pit's cover / beside the landing so he can climb back.
  Example: `t_hall` portal 4 is the bottom of a shaft that is sealed by 2 layers of slabs; below the slabs a ladder runs down to the portal cells. Pound through the slabs, land on the ladder-top, climb down.
* Make left/right portals 3 tall (cells y0..y0+2) and put them where the floor is flat.
* Boss gates (`E`) sit in front of exit portals in boss arenas; you do not build those.

## 5. Visual themes (the engine decorates automatically)

* **jungle**: open sky. Do NOT build a top border (a hidden ceiling exists); build side walls + floors. Logs for one-way platforms, grass-capped earth, trees and waterfalls in the background.
* **temple**: stone blocks, carved back wall, pillars, torches (placed automatically on floors). Closed rooms: use `b.border('#')`.
* **cavern**: dark rock, auto-placed glowing crystals, stalactites, mushrooms. Closed rooms.
* **quarry**: scorched rock, pipes, lava glow. Closed rooms. Use `L` lava liberally in pits.
* **tower**: open-frame steel scaffolding against a night skyline, orange girder platforms. Open sides are fine (falling = pit = respawn); do NOT build a top border.
All terrain is built from the same tile set, so the *shape language* is yours: big readable masses, overhangs, pits, pillars, stepped silhouettes. Avoid flat boxes.

## 6. The rooms (ids, sizes, wiring, content)

`map:{x,y}` is the top-left map cell (26 x 15 tile cells; a room covers ceil(w/26) x ceil(h/15) cells). Portals: `digit side -> room:digit`.
"MAIN" = must hold from the listed start with the abilities held in that area. "SECRET" = needs a later ability. "BLOCKED" = must NOT be possible without the ability.

### JUNGLE (theme `jungle`)
| id | size | map | portals | content |
|----|------|-----|---------|---------|
| `j_start` | 52x22 | 0,2 | `1` right -> j_canopy:1 | **DONE** (exemplar, do not change) |
| `j_canopy` | 78x24 | 2,2 | `1` left -> j_start:1 · `2` right -> j_gorge:1 · `3` top -> j_tree:1 | Treetop-platform run across the canopy: logs, vines, springs, 2 bats, 1 thornbug, 2 snapjaws, save barrel. MAIN (none): 1 -> 2 and 1 -> 3 (the way up is a vine/ladder shaft ending at the top portal). SECRET: a heart behind a crate wall `R` (full-height wall, needs Roll) that is visible from the path. |
| `j_tree` | 26x45 | 3,-1 | `1` bottom -> j_canopy:3 | Vertical climb up a giant tree: vines, ladders, platforms, springs, bats. MAIN (none): 1 -> the heart fruit `h` at the very top (a free heart, the reward for exploring up). 2 lore signs. Dead end. |
| `j_gorge` | 52x26 | 5,2 | `1` left -> j_canopy:2 · `2` right -> j_shrine:1 · `3` bottom -> j_log:1 | Waterfall gorge (set `waterfall`): log platforms over water pits `W`, springs, 1 tiki turret, snapjaws. MAIN (none): 1 -> 2 and 1 -> 3 (portal 3 is a shaft/ladder down at one side). SECRET: a crystal switch `w` visible across a pit (boomerang only) that opens gate `D` to a small cave with a heart. |
| `j_shrine` | 39x20 | 7,2 | `1` left -> j_gorge:2 | The Roll Shrine. Spike/snapjaw approach (fair!), then the relic: `Q` with `prop('relic','roll')`, 2 signs explaining Roll (C or Shift; roll jump; crate walls; narrow tunnels), plus a harmless practice crate wall. MAIN (none): 1 -> relic. |
| `j_log` | 52x15 | 5,4 | `1` top -> j_gorge:3 · `2` right -> t_gate:1 | The Hollow Log under the gorge. MAIN (Roll): 1 -> 2 through a long (>= 10 tiles) **1-tile-high tunnel** lined with bananas. BLOCKED without Roll: portal 2. SECRET (Pound): a floor of slabs `G` (2 deep) over a small chamber with a heart. Portal 1 is the ladder shaft up (a `T`-topped ladder) so Kong can come back. Save barrel. |

### TEMPLE (theme `temple`)
| id | size | map | portals | content |
|----|------|-----|---------|---------|
| `t_gate` | 39x22 | 7,4 | `1` left -> j_log:2 · `2` right -> t_hall:1 | Temple gate: first stone architecture, 2 tikis, spike corridor, snapjaws, a crate shortcut, save barrel, 2 lore signs. MAIN (Roll): 1 -> 2. |
| `t_hall` | 78x30 | 9,4 | `1` left -> t_gate:2 · `2` right -> t_golem:1 · `3` top -> t_vault:1 · `4` bottom -> c_drop:1 | The Hall of Slabs: tall hall with pillar-stack platforms, spike pits, 3 tikis, bats, 2 thornbugs, save barrel. MAIN (Roll): 1 -> 2. **BLOCKED without Pound: portal 4** = a pit shaft covered by a 2-layer slab floor `G` (>= 4 wide); portal 4 sits at the shaft bottom (bottom border), reached by pounding through. **BLOCKED without Grip: portal 3** = a 4-wide wall-jump shaft rising to the top border. With Pound+Grip both must work. |
| `t_pound` | 26x20 | 14,4 | `1` left -> t_golem:2 | Ground Pound shrine (behind the Golem). Relic `Q` `prop('relic','pound')`, signs explaining it (Down + X in the air; slabs; stun). Easy approach with a few slab practice floors. MAIN (Roll): 1 -> relic. |
| `t_vault` | 26x15 | 10,3 | `1` bottom -> t_hall:3 | Secret vault: heart fruit + ~20 bananas, a short fair challenge (gaps, 1-2 spikes). Bottom portal = ladder shaft up from the hall. MAIN (Roll,Pound,Grip): 1 -> the heart. |

### CAVERNS (theme `cavern`)
| id | size | map | portals | content |
|----|------|-----|---------|---------|
| `c_drop` | 26x45 | 10,6 | `1` top -> t_hall:4 · `2` right -> c_gallery:1 | Crystal descent: Kong falls in from the temple, so give a safe landing (springs / wide ledges) below the top portal. Bats, crystals, bananas. A vine/ladder route climbs back to the top portal so Kong can return. MAIN (Roll,Pound): 1 -> 2 and 2 -> 1. |
| `c_gallery` | 78x24 | 11,7 | `1` left -> c_drop:2 · `2` right -> c_web:1 | Glowworm gallery: crumbling platforms `F` over lava, springs, bats, a long roll-jump gap (the safe route has a stepping alternative), save barrel. MAIN (Roll,Pound): 1 -> 2. SECRET: a heart behind a crate wall (Roll is held, but make it a short side tunnel off the main route that the player must notice). |
| `c_web` | 39x22 | 14,7 | `1` left -> c_gallery:2 · `2` right -> c_queen:1 | Web lair: 4 spiders `p` on threads, platforming between them, **save barrel just before the right exit** (the boss is next). MAIN (Roll,Pound): 1 -> 2. |
| `c_grip` | 26x45 | 17,9 | `1` left -> c_queen:2 · `2` right -> c_deep:1 | The Grip Grotto. Kong arrives (portal 1) on a high ledge on the left. The relic (`Q`, `prop('relic','grip')`) lies at the bottom of a 4-wide shaft, reachable by dropping. Exit portal 2 is high on the right wall, **BLOCKED without Grip**: the only way up is wall-jumping the shaft (Grip is right there; add signs: hold toward the wall, press Jump). MAIN: 1 -> relic with none; 1 -> 2 needs Grip (with Roll, Pound). |
| `c_deep` | 52x60 | 15,9 | `1` left -> c_grip:2 · `2` bottom -> q_pass:1 | Deep shafts: a zig-zag. From the upper-left entry Kong must descend, cross a lava cavern on crumble platforms, **climb a wall-jump shaft up** to a high ledge, then drop down a long shaft to portal 2 (bottom border; keep lava away from it). So Grip is mandatory. Heart (SECRET, needs Grip + precise wall-jumps) on a side shaft top. Save barrel mid-way. MAIN (Roll,Pound,Grip): 1 -> 2. BLOCKED without Grip: portal 2. |

### QUARRY (theme `quarry`)
| id | size | map | portals | content |
|----|------|-----|---------|---------|
| `q_pass` | 78x24 | 13,13 | `1` top -> c_deep:2 · `2` right -> q_forge:1 | Lava pass: Kong drops in from above (safe landing needed), then a long lava river: crumble platforms, springs, roll-jump gaps (with Roll held), 3 magma blobs, 2 tikis, save barrel. MAIN (Roll,Pound,Grip): 1 -> 2. SECRET (Boomerang): switch `w` across a lava gap opens `D` gate to a heart. |
| `q_forge` | 52x26 | 16,13 | `1` left -> q_pass:2 · `2` right -> q_lift:1 | Old forge: machinery-room feel, magma blobs, tikis, spikes, lava. Relic `Q` `prop('relic','boom')` with signs explaining the boomerang (V; switches; far bananas). NO wisps here. MAIN (Roll,Pound,Grip): 1 -> relic, and 1 -> 2. |
| `q_lift` | 26x45 | 18,13 | `1` left -> q_forge:2 · `2` top -> g_base:1 | The gantry: vertical climb with ladders, platforms, magma, 2 wisps `f`. **Two gates** (`D` and `E` with switches `w`, `x`) block the way up; each switch is only reachable by boomerang from a ledge across a gap. Top portal = ladder shaft. MAIN (all four): 1 -> 2. BLOCKED without Boomerang: portal 2. Save barrel near the bottom. |

### TOWER (theme `tower`; the arcade-girder homage: staggered girders, ladders, rolling barrels)
All four abilities are held. Portals 1/2 here are vertical ladder shafts (see 4). `g_top` and `g_heart` are done.
| id | size | map | portals | content |
|----|------|-----|---------|---------|
| `g_base` | 52x20 | 19,11 | `1` bottom -> q_lift:2 · `2` top -> g_one:1 | Tower base: staggered girder floors joined by ladders, 2 barrel cannons `n`/`N` rolling barrels down the girders (jump or slap them), snapjaws, save barrel. MAIN: 1 -> 2. |
| `g_one` | 52x24 | 19,9 | `1` bottom -> g_base:2 · `2` top -> g_two:1 | Classic stagger: girders with gaps, ladders, 2-3 cannons, thornbugs, a crate shortcut. MAIN: 1 -> 2. |
| `g_two` | 52x28 | 19,7 | `1` bottom -> g_one:2 · `2` top -> g_three:1 | Crumbling girders over the abyss, springs, tikis, wisps, a wall-jump shaft section (Grip needed) and a boomerang-gate section (Boomerang needed). MAIN: 1 -> 2. |
| `g_three` | 52x28 | 19,5 | `1` bottom -> g_two:2 · `2` top -> g_top:1 | The gauntlet: spikes in wall-jump shafts, switch gates, cannons + wisps, a pound-through floor shortcut, **save barrel near the top** before the boss. MAIN: 1 -> 2. |

Heart fruit in the whole world (`h`): `j_start` (Grip nook, done), `j_tree` (free), `j_canopy` (Roll), `j_gorge` (Boomerang), `j_log` (Pound),
`t_vault` (Grip), `c_gallery` (Roll), `c_deep` (Grip), `q_pass` (Boomerang) = 9. Place `h` exactly where your area's table says, nowhere else.

## 7. Design quality bar

1. **Teach, test, twist.** New hazards first appear where failure is harmless (a pit with a shallow retry), then combine.
2. **Fair.** No blind drops into hazards (the camera sees ~6 tiles below), no enemy within 6 tiles of an arrival point, no unavoidable damage.
   **Save barrels**: one near the start of each area, one before each boss, roughly one per big room.
3. **Variety.** Every room needs a signature set-piece and its own silhouette. Mix horizontal runs, vertical climbs, and rooms that loop back on themselves.
4. **Guide with bananas.** 15-40 bananas per room as breadcrumbs: arcs over gaps (`b.arc`), lines along platforms, stashes at secrets.
5. **Enemy budget**: 3-8 per big room, placed on the route but avoidable. Thornbugs and wisps are for experienced players, not first rooms.
6. **Comfort margin.** Use `--margin` (below): anything on the MAIN path that is only possible with 100%-perfect movement is a bug.
7. **Signs** carry the tutorials and lore (the Tiki Tribe shattered the island's Golden Banana and hid its power; the Overlord waits atop the Girder Tower).
   Keep each sign <= 3 short lines. Ability rooms must explain the ability's control.
8. Do not wall the route off with solid tiles you did not mean to; `#` ledges thinner than 1 tile do not exist, so think in whole tiles.

## 8. Tools (run from `games/banana-depths`)

```
node tools/room-report.mjs --module=src/world/rooms/_wip_<area>.js --rooms=<id[,id]> --abil=roll,pound --from=1 --png --margin
```
* `--abil=` abilities Kong has (`roll,pound,grip,boom`; empty = none).  `--from=` start portal digit(s) or `@`; default = every portal of the room.
* Prints which portals / hearts / relics / saves / bananas are reachable from each start, and `UNREACHABLE:` items.
* `--png` writes `.cache/rooms/<id>.png`: **open it with the Read tool and look at it.** Green dots = reachable standing spots, cyan = climbing, orange = ball (tunnel), purple = wall cling; red-ringed markers are unreachable items; yellow digits are portals; rulers are in tiles.
* `--margin` re-solves with movement 4% weaker and reports `FRAGILE:` routes. Fix those.
* Run each room several times: once with the abilities you *intend*, and once without the gating ability to prove `BLOCKED` really is blocked.
* A room being fully solved takes 1-15 seconds. If it takes minutes, the room is huge or too open.
* Final step: copy to `src/world/rooms/<area>.js`, then run `node tools/room-report.mjs --area=<area> --abil=...` (loads the whole world) to confirm it still builds.

Also run the unit tests if you like: `node --test tests/*.test.mjs` (the physics and solver tests must still pass; you must not break them because you only edit your own rooms file).

## 9. Report back

When done, reply with: the list of rooms, for each (a) the signature set-piece, (b) the exact `room-report` lines proving MAIN reachability and BLOCKED/SECRET gating,
(c) anything in this spec you could not satisfy and why. Keep it short.
