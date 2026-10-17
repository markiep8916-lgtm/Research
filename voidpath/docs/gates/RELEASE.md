# VOIDPATH release report (I-release)

**Verdict: SHIP.** The whole game plays from the title to THE END in about 2.6 hours at human pace with
0 page errors. All 322 unit tests, the script dry run, the campaign balance check and the strict
scenario sweep pass on the release page, except one step of 15-vault-alt (known issue 4). The release page is
dist/index.html (2.59 MB, three.js bundled, works offline) and dist/artifact.html
(2.10 MB, three.js from the pinned CDN), both far under the 16 MB limit. What remains is
pacing polish in chapters 2 and 3, a few scene overruns of a few seconds, and real-phone
performance, which was not measured here (no phone; SwiftShader numbers only).

Evidence is in `shots/I-release/` (test logs, `scenarios/`, `pace-a/`, `pace-b/`, `pace-ch4/`,
`boss/`, `perf/`, `readme/`).

## Regression

| Check | Result |
|---|---|
| `npm test` | 322/322 pass (`shots/I-release/npm-test-3.txt`, after the last code change) |
| `npm run scriptcheck` | ok: 76 scenes, 482 boxes, 233 scripts |
| `npm run balance -- --check` | pass, whole campaign: 92 checks ok, 0 failed, 3 warnings (zone walking 294 / 226 / 198 units against 300-380 in ch2-ch4) (`balance-check-2.txt`) |
| Strict scenarios (`--jobs 1`) | 34 of 35 pass with 0 page errors and 0 console errors (`scenarios/sweep.log`, `sweep3.log`): 01-06, 10-14 and their alts, 15-vault, 16-18 and their alts, 20-29, and 19-warden at 640x360 (`19-warden-640`, as I-polish ran it; at 1280x720 SwiftShader is too slow for its debug-pause steps). 15-vault-alt fails one step in three runs (known issue 4) |
| `01-boot` on the final build | PASS in 117 s, 6 shots, 0 page errors, 0 console errors (`shots/I-release/final/01-boot`, on the `node build.mjs` output of 17:48) |

## Human-pace playthrough (title to THE END)

`tools/human-pace.mjs` on the release page, a curious first-time player with the human-like battle
policy and 2.2 s of thinking per command, in two chained legs: `pace-a` from the title through
chapter 3, `pace-b` from the chapter 4 jump to the end. A third leg (`pace-ch4`) re-ran chapter 4
after the fixes below. 0 page errors in every leg.

| Chapter | Minutes | 11.7 band (+-20%) | Fights (regular + boss tries) | Boss, levels at the fight, first try |
|---|---|---|---|---|
| Prologue | 23.5 | 18-22: inside | 10 (8 + 2) | SENTINEL 8/8/7/7: lost in 10 rounds, Retry won in 7 |
| Ch1 Ringborn | 27.4 | 22-26: inside | 8 (7 + 1) | The Maw 12/12/11/11: won first try, 9 rounds |
| Ch2 The Choir | 26.5 | 16-20: outside (+33%) | 14 (13 + 1) | The Gardener 19/18/18/18 (plan 17): won first try, 6 rounds |
| Ch3 The Oath | 25.6 | 16-20: outside (+28%) | 10 (8 + 2) | Voss 24/23/23/23 (plan 22): lost in 11 rounds, Retry won in 8 |
| Ch4 Echoes | 21.2 | 16-20: inside | 8 (7 + 1) | ECHO 28: won first try, 9 rounds |
| Finale | 28.3 | 20-24: inside | 9 (6 + 3) | elites 30 and 31: won (5 rounds each); WARDEN 32: won first try, 10 rounds, 230 s |
| Epilogue | 6.1 | 5-7: inside | 0 | |
| **Total** | **158.6 min = 2.64 h** | 113-139 min planned | **59** (57 fights + 2 Retries) | 6 bosses, 2 elites |

Regular fights averaged 58-77 s and 3.1-4.1 rounds per chapter (11.7: 50-70 s). Story time on the
critical path stayed inside plan + 15% in every chapter.

**Chapter 4 again (`pace-ch4`), after the fixes.** The first chained run (`pace-a`) entered the
Vault wounded from Voss, lost a regular fight on the Grid, and the walker stopped with 'no path:
19.5,19' because Retry had rolled the Grid back. With the chapter card now restoring the squad and
the route replaying a rolled-back Grid, the chapter 4 leg ran from its jump to the FINAL CHAPTER card
(`--stop finale`) without a stall: 23.3 min (16-20 +-20%: inside), 8 fights (7 regular, mean 66 s,
3.4 rounds), ECHO at level 26 (plan 27) won on the first try in 16 rounds (293 s), story 267 s
against a plan of 340, 0 page errors, missingArt empty. The legs chain title -> CHAPTER FOUR (pace-a),
CHAPTER FOUR -> FINAL CHAPTER (pace-ch4) and FINAL CHAPTER -> THE END (pace-b).

**Scene overruns** (measured against WRITING 5.10 plan + 15%): `prologue.new_journey` 78 s against
75; `driftmarket.ruse_maw` 42 against 40; `driftmarket.return` 61 against 57. Every other scene on the
critical path is inside its cap (`vault.arrival` 37 s in pace-b, against 52).

## Boss first tries: browser against simulator

Both browser playthroughs (G3's and this one) lost SENTINEL and Voss on the first try, while the
campaign check gave first-timers 93.5% and 77.5%.

- **The browser's battle is the simulator's battle.** With a seeded random source, the same jump
  state and level, and the autoplay policy (`debug.autoplay('policy')`, no command delay, thin
  render), 16 browser fights replayed the node traces of `createPolicy()` action for action: SENTINEL
  at L8, seeds 1-8, 8 wins in 5-9 rounds; Voss at L23, seeds 1-8, 8 wins in 6-11 rounds; 403 party
  actions identical, same end HP (`shots/I-release/boss/run2`, `node-*.json`). No scripted beat,
  phase, buff or turn order differs, so neither side had a bug to fix.
- **SENTINEL.** At the playthrough's levels (8/8/7/7) the simulator wins 94-96% with any bag or
  accessory the route could carry, and the lost first try has the event profile of an ordinary
  simulated loss (10.8 rounds, 6 KOs, 3 lock-ons). No difference in code, state or policy was found,
  so the two losses (about 5% each) read as bad luck; SENTINEL is unchanged: first-timer 93.5%
  (browser policy 93.5%) in 9 rounds, and 8 of 8 seeded browser fights at L8 won.
- **Voss.** The playthrough reached Voss in older gear than the campaign route (Orion's tier-2
  gauntlet, tier-1 armour on Orion and Nyx, no accessory on Nyx) and with no Revive Kit. With that
  gear the simulator gave 71.5% (48% with the playthrough's bag), and the escorts' lock-on beams did
  most of the damage. `voss_escort` atk and mag x0.9 in `balance.js`: with the playthrough's gear and
  level the browser now wins 7 of 8 seeds (87.5%; the simulator predicted the same 8 results), the
  first-timer check goes from 77.5% to 84.8% (browser policy 76.5% to 84.5%, median 8 rounds) and the
  route check stays at 93.5% (target 85-95%). `npm run balance -- --check` passes for the whole
  campaign and `npm test` is 322/322.

## Performance and size

Measured in headless Chromium (SwiftShader) with phone emulation (390x844, DPR 2, touch, so the
game starts on **medium**: pixel ratio 1.5, render size 585x1266) on the release page
(`shots/I-release/perf/`). No real phone was available, so the frame rates below are software
rendering, not a phone verdict.

| View (phone, medium) | Scene draw calls | Triangles | Shadow calls | Lights | Programs | Canvas MB | fps (SwiftShader) |
|---|---|---|---|---|---|---|---|
| Driftmarket, 7 viewpoints | 49-84 (row 84, inn 84) | 6.4k-8.4k | 47-56 | 5 point | 63 | 38.8 | 1.6 at the row |
| The Heart, 12 viewpoints | 71-113 (tier-2 chord 113) | 51k-63k | 8-13 | 5 point | 73 | 71.9 | 1.0 (tier-1 chord), 1.4 (tier-2 chord) |
| WARDEN fight (first form) | 58 | 16.6k | 5 | 4 point | 92 | 78.9 | 1.1 |

Every view is inside the 11.6 budgets (field: 220 calls and 150k triangles; battle: 160 calls and 80k
triangles). First load from disk: DOMContentLoaded at 0.63 s, the game ready and the title up at
4.3 s (SwiftShader; a real GPU compiles faster). Size: `dist/index.html` 2.59 MB (0.82 MB gzipped),
`dist/artifact.html` 2.10 MB (0.69 MB gzipped), both far under 16 MB.

## Fixes in this pass

- `src/story/cutscene.js`: `cs.card()` restores the squad under the chapter card. The chained run went
  into the Vault wounded from Voss (no Med-Station before the Grid), lost a regular fight there, and the
  Retry rolled the Grid back. The campaign routes assume every chapter starts rested.
- `src/story/cutscene.js`: `cs.spawn()` passes `projector` through to the NpcDef.
- `src/content/dreams/story.js`: the crown's WARDEN and HALCYON holograms spawn with `projector: false`.
- `src/content/epilogue/story.js`: the credits camera pan lasts 145 s (the credits run 150 s).
- `src/content/balance.js`: `voss_escort` atk and mag x0.9 (above).
- `src/tools/preview-ui.js`: removed the dead `ui.screens._lock = 0` line.
- `tests/routes/vault.mjs`: after a Retry rolls the Grid back, the route replays the wraiths, the
  firewall and its switch instead of stopping with 'no path: 19.5,19'.
- `tests/scenarios/15-vault.json`, `15-vault-alt.json`: Window 9's rifle now offers "Equip now?" (the
  jump wears the route's gear); the scenarios answer it instead of waiting on a blocked field.
- `tests/scenarios/15-vault.json`: the Echo step's statement-style `eval` (a syntax error inside
  play.mjs's `return (...)`) is one expression now.
- `tests/scenarios/18-epilogue.json`: waits for the Journey complete buttons before the 13-complete shot.
- `CONTRACTS.md`: a pointer to TECH_PLAN.md, MODULE_NOTES.md and the modules added since the POC.
- `MODULE_NOTES.md`: the I-polish contract changes and this pass's changes.
- `README.md`, `docs/screenshots/`: finished; old POC screenshots that nothing links were removed
  (`cryo.jpg`, `corridor.jpg`, `engineering.jpg` stay: the contact sheets use them as references).

## Cut list (TECH_PLAN 14)

Nothing was cut. All eleven items on the cut list shipped: three manual save files, jam, element
charges and selling, Ruse's stock tiers and the elites' moves, the Moth cockpit flight, the Vault's
platforms, `alarm`/`glitch` and `battle_2`, the M3 delights (rare encounters, favours, optional elites),
Party Talks and the night before, NPC walking paths, the Heart's lifts and the separate Meridian map.

## Known issues (most important first)

1. **Chapters 2 and 3 run long at human pace**: 26.5 and 25.6 min against 16-20 (outside the 20% band).
   A curious player walks 579 and 421 units of zone where the critical path has about 300-380, so
   chapter 2 met 14 fights (plan 8-10) and both chapters reached their bosses 2 levels above plan
   (the Gardener at 19, Voss at 23-24). The whole game still lands at 2.64 h (plan 1.9-2.3 h). The fix
   is fewer random fights per unit in `arb_*` and `spire_*` zones or shorter side rooms; not attempted
   in the release pass.
2. **Real-phone performance is unmeasured.** Draw calls, triangles and memory are inside the budgets
   on phone medium, but SwiftShader's 1-1.6 fps says nothing about a phone's 30 fps target. Check one
   real device (the Heart's tier-2 chord and the WARDEN fight are the heaviest views).
3. **Boss first tries are luck-sensitive for under-equipped squads.** SENTINEL was lost on the first
   try in both browser playthroughs although the browser and the simulator play the same fight (about
   5% each at those levels). Voss now wins about 82% with the route's older gear (was 72%), and 65% if
   the squad also carries no Revive Kit. The human-pace route never buys armour or Revive Kits, so it
   is weaker than the simulator's first-timer.
4. **15-vault-alt fails one step on SwiftShader; 19-warden needs 640x360.** In 15-vault-alt (crystals
   in the order east, west, north), the wait for the west relay (`sw:vault:w`, step 42) ran out in three
   runs (400 x 0.9 s, 1000 x 0.9 s, 300 x 3 s), and each time the switch finished within a minute after
   the loop gave up; every later check of the scenario passes, with 0 console errors. An instrumented
   copy of the same steps (`shots/I-release/diag-valt2`) shows the switch's camera reveal at about 1 s
   per frame (0.05 game-s each) and the whole switch done in 35 s. The root cause of the stall in the
   uninstrumented loop was not found. The same relay works in play: 15-vault and both human-pace runs
   of chapter 4 use it without a stall. 19-warden passes at 640x360 only; at 1280x720 its debug-pause
   steps do not finish on SwiftShader.
5. **18-epilogue's 13-complete shot misses the Journey complete screen** although the screen is open
   (its buttons are in the DOM when the shot is taken); 18-epilogue-alt captures it. A headless
   capture artifact after the 150 s credits, already noted by I-polish.
6. **Scene overruns of 2-4 s**: `prologue.new_journey` 78 s (cap 75), `driftmarket.ruse_maw` 42 (40),
   `driftmarket.return` 61 (57). The prologue also met 10 fights against 7-9 on the curious route.
7. **WebGL warnings after a Retry in the Vault** ("texSubImage2D: no canvas", 10 in pace-a): a released
   art-cache canvas is updated once more. Warnings only; no page or console errors.
8. **Art notes carried from I-art and I-polish**: on desktop the battle command menu overlaps the
   Gardener's lower body; Theo's WARDEN scene is bright on desktop (105 luma); the Choir pod viewpoint
   on a phone is 64% near-black (cap 65%); the Meridian scene frames lint flat ceiling planes; the Spire
   floors and the Vault hub edges are sparse. The crown embrace no longer has projector discs (desktop
   77.4 to 66.9 luma, near-white 2.1% to 0.5%); its phone frame was not re-measured.
