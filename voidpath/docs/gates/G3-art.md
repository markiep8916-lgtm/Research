# Gate G3, art half: art director review and fix pass (I-art)

Scope: the whole game except the dreams and the epilogue (C8). Judged at real game-page frames on
desktop 1280x720 high and phone 390x844 medium, against TECH_PLAN 11.1-11.3, 11.6 and G2's art fix
list and its 21-rule "Bar for C-beta and C-gamma". Written by I-art after the G3 game-director
review; it re-judges every G2 art item G3 left open.

## Verdict: PASS with fixes

The game now looks like one game. The Halcyon, Driftmarket, the Heart and the WARDEN are at or above
the bar; the Meridian, the Shoals and the Vault, which failed G2 or had no review, are readable
everywhere and meet every luma floor; every battle's idle frames pass the floor on both sizes (one
boss-card frame dips under it, R3) and no art is missing. Nothing left is a blocker. I fixed the six problems that most hurt the critical path:

1. **Kade's visor bloomed into an orb over his face** in nearly every desktop field frame and every
   battle (he leads most of the game).
2. **The Heart's Crown Approach hid the leader** behind a cathedral pier on both sizes.
3. **The Spire arenas blew Voss's escort and the troopers into white glare** under a key light set
   over the foes' slot, with near-white floor pools.
4. **The Arboretum's brick floors stamped a green checkerboard** of whole moss cells (G2 rule 16), on
   the ch2 critical path and in the Gardener's arena.
5. **WARDEN's "He is happy" whited out the Choir** (luma 146 on a phone): the chapter 2 climax was a
   cream haze with Sera's head blown out.
6. **WARDEN's first line at the Spire played on a grey deck** (G2 rule 14). Partly fixed: the lanes
   the pan crosses are gold now, but the opening phone frame needs the scene's staging (R7).

What remains is ranked at the end. The top items belong to files other tasks own: the battle focus
band and the help strip on phones, WARDEN's absolute grade, and the title layout.

## How I judged

- Contact sheets (`tools/contact-sheet.mjs`, preview-world frames): the Heart fresh
  (`shots/I-art/contact/heart/`, 43 frames). For the other locations the G3 sheets of 10 Oct
  (`shots/G3/art/contact/<loc>/`) are current: no art, texture, prop or arena file of those
  locations changed after them (git log), only gameplay lines of four maps.
- Real game page (`shots/I-art/page*/index.html`, private copies of the build): battles and bosses
  through `debug.startBattle(enc, { jump })` (`shots/I-art/tools/battle-steps.mjs`), viewpoints
  through `debug.jumpTo` + `debug.visualLint(viewpoint)` (`view-steps.mjs`), key-scene frames through
  `debug.runScript` once the speaker's box is open plus a settle (`scene-steps.mjs`). Phone frames of
  the bosses and of every regular arena come from the G3 sweep of 10 Oct (`shots/G3/art/boss-phone/`,
  `battles-phone/`); the boss and enemy art has not changed since, except WARDEN (C11's phone frames
  of 16 Oct, `shots/C11/frames/phone/`).
- Luma: G2's measure (mean 8-bit luma, near-black = luma < 20). Floors: phone mean >= 25 and <= 65%
  near-black, desktop mean >= 40 and <= 50%.
- The machine ran at load 10-18 for the whole pass (other agents), so every browser job was queued
  one at a time.

## Verdict per location

Luma is the range over the location's viewpoints (mean / near-black %). Desktop from the contact
sheets at 1280x720 high, phone at 390x844 medium (`*-mobile.png`).

| Location | Verdict | Desktop luma | Phone luma | Notes |
|---|---|---|---|---|
| Title | pass, layout request | 44.8-45.1 / 45% | 31.3-32.9 / 58-60% | Saturn, glass and party read well on both sizes. On desktop the party stands on the menu: NEW JOURNEY's bar runs behind Kade's legs and his blade crosses "A 2D-HD RPG" (`shots/I-art/title-desktop/title-menu.png`). `core/titleScene.js` is not mine: request R4. |
| Halcyon decks (cryo to bridge, gallery, medbay, control) | pass, the bar | 46.5-86.0 / <=35% | 26.1-59.1 / <=62% | Still the reference. In the game page every viewpoint lints ok: bridge 56.4/33, corridor 84.4/8, cryo 82.1/13, engineering 62.3/25 (`shots/I-art/views-halcyon-desktop/`). Kade's visor orb fixed (fix 1). |
| Exterior cold open | pass | 85.3 / 11% | 48.8 / 31% | C1-3 fixed (see G2 items). |
| Moth (cockpit, berth, Driftmarket pad) | pass | 44.8 / 32% | 36.7 / 53% | One builder, a ship silhouette on both maps. |
| Driftmarket | pass, the bar | 41.0-72.7 / <=35% | 36.0-76.5 / <=44% | Warm/cold mix, ribbons, viewport and tiling all fixed. |
| Shoals | pass | 66.1-103.3 / <=11% | 41.2-65.9 / <=28% | The bow-tie stamp is gone; bridges have thickness and rim light over a lit abyss. |
| Meridian | pass | 42.8-62.2 / <=31% | 32.2-48.3 / <=42% | G2's worst failure (about 10 luma) is now readable everywhere, cold blue with amber work lamps; the reactor hall has its focal piece. |
| Arboretum | pass after fix 4 | 45.0-98.8 / <=35% | 27.5-70.1 / <=50% | Lush and layered. The brick floors stamped whole green moss cells (rule 16) on the critical path and in the Gardener's arena: fixed. The Choir under WARDEN's grade blew out to white: fix 5. |
| Security Spire | pass, notes | 40.3-71.5 / <=39% | 29.7-74.3 / <=56% | Clean military palette, screens, the pylon. Its corridors and barracks floors are sparse (few props per frame); acceptable, not a blocker. WARDEN's arrival frame was grey: partly fixed (fix 6, R7). |
| Memory Vault | pass, notes | 61.3-90.9 / <=30% | 43.4-85.4 / <=35% | Strong crystal hub and light bridges. The hub frame is sparse at its edges; the memory scenes run very bright under the memory grade (`MEMORY_FX`, request R5). |
| The Heart | pass after fix 2, best location | 41.5-104.5 / <=33% | 31.6-86.4 / <=51% | Rings, lifts, pylons and the crown read as one cathedral at every tier. The Crown Approach hid the leader behind a pier: fixed. |

## Verdict per arena and boss

Desktop from the real game page (`shots/I-art/battles-desktop/`, built before my fixes; the Halcyon
spine, Spire, Voss, Gardener and Echo again after them in `shots/I-art/battles-after/`, whose numbers
the table gives); phone from `shots/G3/art/battles-phone/` and `boss-phone/` (art
unchanged since) and C11's WARDEN frames. Every battle: `missingArt()` empty, scene calls 42-101
(budget 160), at most 17.8k triangles.

| Arena / boss | Verdict | Desktop luma | Phone luma | Notes |
|---|---|---|---|---|
| Halcyon spine (drones, turret, tutorial) | pass | 40.4 / 38% | 28.5-59.6 / <=61% | Dark by design; the turret frame on a phone is the darkest battle (28.5/61%), above the floor. |
| SENTINEL | pass | 42.4-51.6 / <=43% | 52.5-68.2 / <=40% | Head and reticle in the focus band at both sizes; red wreck light after the 50% beat. |
| Shoals ice (mites, eel, colossus) | pass | 80.1 / 11% | 50.4-51.8 / <=33% | The void eel reads on its own floor (CA-1). |
| Meridian scrap / golem | pass | 56.3 / 16% | 35.8-37.7 / <=45% | |
| THE MAW | pass | 48.0-107.1 / <=24% | 31.0-52.6 / <=50% | In focus, submerge glow and ring land (C3-5). Idle2 at 107 is the surfacing flash. |
| Arboretum court (swarm, gilded, caretaker, matriarch) | pass | 66.8 / 11% | 44.0-48.1 / <=35% | |
| GARDENER | pass after fix 4, requests | 41.0-49.8 / <=36% | 28.2-54.6 / <=56% | Arena moss checker fixed (fix 4). The crown sits above the tilt band and blurs on desktop; on a phone the head is under the help strip in the card frame (R1, R2). |
| Spire troopers (mk3 guard, turret, honour, prime) | pass after fix 3 | 44.9 / 30% | 36.8-41.8 / <=50% | Was blown to white over the foes' slot. |
| COMMANDER VOSS | pass after fix 3 | 52.4-58.9 / <=30% | 49.9-67.9 / <=45% | Her escort's white glare fixed; the card title truncates on a phone ("COMMANDER VO", R3). |
| Vault (swarm, packet, archon, overwrite) | pass | 50.6 / 20% | 42.6-47.1 / <=28% | |
| ECHO | pass, requests | 37.3-44.4 / <=49% | 45.0-59.5 / <=43% | Idle frames pass (44.0-44.4). The desktop card frame (37.3) is under the floor: the card's dark scrim over a neon-on-black arena. Lifting the arena's hemi and fill by a fifth moved it only 1.4 (`shots/I-art/battles-echo/`), so I reverted that and filed R3. The hood sits above the tilt band and blurs (R1). |
| Heart (choir trio, wardens, bell, rings, rare) | pass | 79.3 / 10% | 58.4-68.3 / <=32% | Gilt cathedral floor and void beyond; phone frames from C7 (`shots/C7/battles-phone/`). |
| WARDEN, first form | pass, the bar | 56.4-63.7 / <=19% | 57.1-80.9 / <=26% | The best battle frame in the game: gold cradle, sigil, the face in focus. |
| WARDEN, unbound | pass, notes | 58.8-97.1 / <=19% | 86.4-156.6 / <=5% | Readable but hazy: the gold bloom flattens the second form on desktop idle2 (97.1); the transform flash (156.6) is a one-second beat. The wing tips leave the phone frame. |

## G2 art items left open by G3

| Item | Verdict | Evidence |
|---|---|---|
| C1-3 Cold open | fixed | `prologue/exterior-open` 85.3/11% desktop, 48.8/31% phone, lint ok; hull fins, dishes and the beacon array read; no raw starfield under the slab on a phone. The game-page frame `shots/I-art/scenes-phone/s1-cold-open.png` is 84.9/25%. |
| C1-5 Halcyon screen props | fixed | Screens on the engineering, bridge, cryo and corridor consoles (`shots/I-art/views-halcyon-desktop/`), and WARDEN takes them over in the coil scene (C2-3). |
| C1-8 One Moth builder | fixed | `prologue/halcyon-berth` 55.7/35%, `moth-cockpit` 44.8/32%: a ship silhouette, not a crate pile. |
| C1-9 Coolant gallery | fixed | `prologue/halcyon-gallery` 46.5/34% desktop (was 47% near-black), 27.6/60% phone (was 23.4/66%); the leader stands clear of the tank. |
| C1-11 SENTINEL phone frame | fixed | `shots/I-art/scenes-phone/s2-sentinel.png` 33.5/52%: the whole SENTINEL in focus above the box. |
| C2-3 WARDEN's first words | fixed | `shots/I-art/scenes-phone/s3-coil-warden.png` 73.4/22%: the sigil on the engineering screens, gold light. |
| C2-6 Light, ribbons, viewport | fixed | `driftmarket/driftmarket-viewport` 69.7/16%, warm stalls against cold docks in every viewpoint. |
| C2-7 Tiling | fixed | No repeat stamp on the docks or the row at 20+ cells (`driftmarket-docks`, `-row`, `-gate`). |
| C2-9 Driftmarket Moth | fixed | `driftmarket/driftmarket-docks`: the Moth (RB-424) on its pad is the shared builder's ship. |
| C2-10 Portraits | fixed | Every speaker in the key-scene frames has a portrait, WARDEN the sigil (`shots/I-art/scenes-phone/`, `shots/G3/art/scenes-phone/`). |
| C3-1 Meridian readable | fixed | 42.8-62.2 / <=31% desktop, 32.2-48.3 / <=42% phone, every viewpoint (was about 10 luma). |
| C3-5 Maw presentation | fixed | `shots/I-art/battles-desktop/05-shoals_boss_maw-*`: the Maw in focus; submerge glow and ring at both sizes. |
| C3-6 Shoals tile stamp | fixed | No bow-tie stamp in any Shoals viewpoint (`shoals-grotto`, `-deep`, `-tunnels`). |
| C3-7 Shoals palette and phone | fixed | Phone 41.2-65.9 / <=28%. |
| C3-8 Bridges and abyss | fixed | `shoals-bridge`: thick ice spans with rims over a glowing deep. |
| C3-9 Reactor hall | fixed | `meridian-eng` 42.8/29%: the reactor is a lit focal piece. |
| C3-10 Arenas | fixed | `shots/I-art/battles-desktop/03-*`, `04-*`; floors read as floors at both sizes. |
| C3-11 Meridian caps | fixed | Sparse world-space rime, no cap flowers. |
| CA-1 Void eel | fixed | `03-shoals_mites_eel-idle.png`: the eel reads against its floor. |
| W-4 Random UV rotation | fixed | `rot: 'random'` in use on the Shoals, Spire, Vault and Heart legends; no stamp at 20+ cells. |
| E-1 Round bokeh | fixed | `meridian-hall`, `shoals-grotto`, the gallery: defocused lamps are soft discs, no squares. |
| B-1 Enemy plates on phones | fixed | `shots/G3/art/battles-phone/pro_sentinel_squad.png`, `shoals_golem_eel.png`: no plate over a sprite. |
| B-2 Hit flashes on large sprites | fixed | The Maw's slam and breach flashes keep its detail (G3 boss-phone beat frames). |

## What I fixed

| # | Problem | Fix (owned files) | Before | After |
|---|---|---|---|---|
| 1 | Kade's amber visor bloomed into an orb that hid his face on every high-tier frame and in battle | `src/art/characters.js`: a per-character `glowScale` scales the emissive map of the glow pixels; Kade's visor runs at 0.5 in the field and battle sheets (the colour pixels are unchanged) | `shots/G3/art/contact/spire/spire-checkpoint-desktop.png`, every `shots/I-art/battles-desktop/` frame | `shots/I-art/views-spire-desktop/spire-checkpoint.png` (44.5/38%, lint ok); crop `shots/I-art/crops/visor-before-after.png`; `shots/I-art/battles-after/` |
| 2 | A cathedral pier stood between the camera and the Crown Approach and hid the leader (phone frame 86.4 luma of pier) | `src/content/heart/props.js`: the pier south of the approach stops under the deck as a gilt capital (`PIERS` takes an optional top) | `shots/I-art/contact/heart/heart-approach-desktop.png`, `-mobile.png` | `shots/I-art/views-heart2-desktop/heart-approach.png` 70.3/21%, lint ok; `views-heart2-phone/heart-approach.png` 50.7/35%, lint ok (both pylons on, `fin.crown`) |
| 3 | The Spire arenas set their white key over the foes' slot with near-white floor pools: troopers and Voss's escort were white glare | `src/content/spire/arena.js`: the white key moves from over the foes to in front of them and drops 16 -> 10; the floods and floor pools drop from 0.22-0.26 to 0.13-0.17 | `shots/I-art/battles-desktop/08-spire_mk3_guard-idle.png` (foe region 127.6 mean, 4.9% near-white), `09-spire_boss_voss-idle.png` (120.6, 7.8%) | `shots/I-art/battles-after/02-spire_mk3_guard-idle.png` (80.5, 0.8%; frame 44.9/30%), `03-spire_boss_voss-idle.png` (107.6, 5.8%; frame 58.9/18%) |
| 4 | The Arboretum's brick stamped whole green moss cells, a checkerboard (rule 16), in the Channels and the Gardener's arena | `src/content/arboretum/maps/arboretum.js`: no whole-cell moss in the `.` floor; 12 `mossPatch` decals with random rotation and size in the halls and the Choir Gate. `src/content/arboretum/arena.js`: the same in `choirGate`, plus 6 decals | `shots/G3/art/contact/arboretum/arboretum-channels-desktop.png` (about 17 moss cells in frame), `shots/I-art/battles-desktop/07-arb_boss_gardener-*.png` | `shots/I-art/views-arb2-desktop/arboretum-channels.png` 77.8/12%: bare brick and soft patches, no whole moss cell (all four Arboretum views 49.4-78.8 desktop, lint ok); `shots/I-art/battles-after/04-arb_boss_gardener-idle.png` 49.8/23% |
| 5 | Under WARDEN's absolute grade (exposure 1.1, bloom 1.2) the Choir went to a cream haze: 145.6 luma on a phone, Sera's head and the pod tiers blown out | `src/content/arboretum/maps/arboretum.js`: the Choir's grade nearer neutral (exposure 0.78 -> 0.98, key 0.5 -> 0.41) with a softer, wider fill (hemi 0.55 -> 0.85, fill 0.4 -> 0.5) so the floor stays off black on a phone; pod lights softer; the `k` floor's emissive 1.6 -> 1.1; WARDEN's gold light high over the squad (y 2.2 -> 5.2, z 4.0 -> 9.6, distance 13) instead of over Sera's head. `src/content/arboretum/props.js`: the tier wall on a softer emissive material (2.4 -> 1.0), its glows and the pods' smaller, Theo's pod glow 0.35 -> 0.12 (from the aisle camera it sat on Sera's head) | `shots/I-art/scenes-phone/s4-theo-warden.png` 145.6/18% (G3: `shots/G3/art/scenes-phone/arboretum_theo-warden1.png` 145.4) | `shots/I-art/scenes-h-phone/f-theo-warden.png` 93.0/22%: a gold chamber, the pod tiers as discs, Theo's pod and Sera readable (the builds in between: 117.5, 107.1, 89.3 in `scenes-b-`, `-c-`, `-d-phone`). The Choir outside the scene stays in range: `shots/I-art/views-choir6-phone/` choir 37.8/49%, pod 32.4/64% (close to the 65% cap), desktop 51.4/36% and 90.3/8%, lint ok |
| 6 | WARDEN's first line at the Spire played on a grey deck (rule 14) | `src/content/spire/maps/spire.js`: the pylon's gold reaches the lanes (distance 7 -> 10.5); the two entry-lane floods the arrival pan crosses are WARDEN's gold (30, to match the white floods' brightness) | `shots/I-art/scenes-phone/s5-spire-arrival.png` 26.4/48%, grey | `shots/I-art/scenes-e-phone/f-spire-arrival.png` 26.5/48%: the captured frame barely changes. A probe (`shots/I-art/probe-arrival.log`) shows why: three gold lights are in the pool (the pylon, a gold flood, a sigil), but on software GL the 3 s pan has hardly started when the box opens (look x 31.0 -> 30.7), and on a phone that focus, 3.5 units west of the pylon, leaves the pylon at the frame's edge. In real play the pan runs under the line across both gold floods. R7 asks for the opening framing |

The Theo fix started from an experiment on the same frame (`shots/I-art/theo-exp/`): as shot 145.5;
with the Choir's mood fixed 116.3; mood plus a weaker gold light 102.6; the weaker light alone 133.5.
The scene drives the gold light to 24-32 (`arboretum/story.js`, not mine), so the fix moves the light
rather than dimming it. The tier wall's emissive trades the two frames against each other: at 1.15
the scene is 107 and the pod view 60% near-black, at 1.0 they are 90 and 66%; the wider fill then
brings the pod view to 64% and the scene to 93.

The gold entry floods keep the Checkpoint viewpoint in range: desktop 44.5/38% -> 43.3/39%, phone
38.5/48% -> 37.8/49% (`shots/I-art/views-spire3-desktop/`, `views-spire3-phone/`); all four Spire
viewpoints lint ok on both sizes.

## What remains, ranked

1. **Boss heads above the battle focus band** (rule 20). The Gardener's crown and Echo's hood sit
   above the tilt band on desktop and blur (`shots/I-art/battles-desktop/07-*`, `11-*`). The band is
   centred on the slot, not on the fitBox core. Request R1 (`battle/stage.js` or `battleState.js`).
2. **The phone help strip covers boss heads** in the card and first idle frame (Gardener:
   `shots/G3/art/boss-phone/arb_boss_gardener-card.png`). Request R2 (`battleUI.js` /
   `stage.js` `CORE_TOP.compact`).
3. **WARDEN's first Spire line on a phone opens on the dark lane beside the pylon.** The scene
   focuses 3.5 units west of the pylon, so on a phone the gold focal piece sits at the frame's edge
   (fix 6 lights the lanes the pan crosses, but the opening frame stays 26.5 luma). Request R7
   (`spire/story.js`).
4. **WARDEN's speaker grade is absolute.** It replaces the area's exposure and bloom, so it washes
   bright rooms (the Choir) and cannot lift dark ones. My fixes 5 and 6 work around it per map.
   Request R5 (`story/cutscene.js`).
5. **The title party stands on the menu** on desktop. Request R4 (`core/titleScene.js`).
6. **WARDEN unbound is hazy** on desktop idle (97.1 luma): readable, but the gold bloom flattens the
   form, and the wing tips leave the phone frame. C11 is still working on this form, so I left it for
   C11's M3 pass (`warden/wardenart.js`, `warden/arena.js`).
7. **Boss card title truncates on a phone** ("COMMANDER VO"), and the frame under Echo's card is
   37.3 on desktop. Request R3 (`battleUI.js`).
8. **Sparse Spire floors and Vault hub edges.** Readable and in range, few props per frame. Owner:
   a future polish pass (`spire/props.js`, `vault/props.js`).
9. **Memory scenes in the Vault run very bright** under `MEMORY_FX` (`scene-vault.memory_*`). Request R5.
10. **`spire.oath_recording` cuts Voss's hologram at the frame edge** on a phone
   (`shots/G3/art/scenes-phone/spire_oath_recording-box1.png`, 25.0/52%, just above the floor).
   Request R6 (`spire/story.js`).
11. **Meridian scene frames lint flat ceiling planes** (`scene-shoals.varo_log`, `meridian_arrival`,
    `maw`: untextured MeshBasicMaterial). They read as darkness above the walls; viewpoints lint ok.

## Requests for files I do not own

- **R1** (`src/battle/stage.js` or `battleState.js`): centre the tilt-shift focus band on the
  boss's fitBox core (`focusY` from the core's projected centre, `band` at least the core height),
  not on the slot. Gardener and Echo blur their heads today.
- **R2** (`src/battle/battleUI.js` / `stage.js`): on a phone, keep the help strip clear of the boss
  core (raise `CORE_TOP.compact` or hide the strip while the card plays).
- **R3** (`src/battle/battleUI.js`): fit the boss card title on a phone (scale the font or wrap):
  "COMMANDER VOSS" shows as "COMMANDER VO". Lighten the card's scrim outside its band, so the
  frame under Echo's card (37.3 on desktop) stays above the floor.
- **R4** (`src/core/titleScene.js`): on desktop move the party right or the menu left so NEW
  JOURNEY's bar does not run behind Kade and his blade does not cross the subtitle.
- **R5** (`src/story/cutscene.js`): make `MOODS.warden.fx` relative to the area mood (multiply, cap
  exposure near 1.0 in bright rooms) and lower `MEMORY_FX` bloom.
- **R6** (`src/content/spire/story.js`): in `spire.oath_recording`, frame the hologram fully on a
  phone (camera focus on the projector, zoom about 0.9).
- **R7** (`src/content/spire/story.js`): in `spire.arrival`, open the pan on the pylon itself
  (focus about [33.5, 50.2]) so a phone frame holds WARDEN's gold focal piece while WARDEN speaks.

## Budgets and tests

- Every viewpoint I re-shot lints ok in the game page; lights within the tier pools; scene calls
  58-107 and at most 56k triangles in the field (the Heart), 42-101 calls and at most 17.8k
  triangles in battle (budget 160 calls); `missingArt()` empty in all 14 battles.
- `node --test` on content, mapdef, heart, spire, vault, explore and battle: 106/106 pass after my
  edits; `node build.mjs` ok (dist rebuilt from the final sources).
- Gameplay untouched: no walkable cell, trigger, encounter or script changed. In
  `heart/maps/heart.js` I made no edit (the pier is in `heart/props.js`).
