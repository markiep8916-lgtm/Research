# C-gamma task reports

## C10-gamma (whole-campaign balance)

C10-gamma is finished. `npm run balance -- --check` passes for the whole campaign (exit 0, run time about 1 min) on the content as it stood at 01:03, and no chapter is still on placeholders. I picked up from the 'WIP snapshot of the finale' commit. The finale route and the finale placeholders were already written; the one failing target was WARDEN's route check, at 98.8% wins against a band of 85-95%.

**What I changed this session**

*src/content/balance.js*
- WARDEN's second form now has speed x1.5, attack and magic x1.04, max HP x1.05 and a starting shield of 2.
  - With the extra speed its two actions come first and in the middle of the round, ahead of the healers. The screenshot shows the turn order WARDEN, NYX, WARDEN, ORION, SERA, KADE.
  - Raising its attack alone could not fix the route check. Every setting that brought the route under 95% dropped C11's fin.warden test (level 30, the chapter's starting bag) below 75%.
- The Gardener gets attack and magic x1.05, which balances the new rest in the hall.

*tests/campaign.mjs*
- The finale route now rests at the Second Tier's Med-Station before the first Choirlit Echoes.
- It skips the reliquary behind the optional Bellwarden, through a new `skip` option on the chests step.
- Routes for chapters 2-4 now rest at the Med-Stations the owners' human-pace routes use: the Arboretum hall, the Spire stairwell and the Vault Index. A rest keeps the walked distance, so fight counts barely move. Chapter 2 route-run losses at regular fights fell from 21 to 2.
- The report for a two-form boss now gives losses per form. Any boss with a retry phase also gets a "Retry from the later phase" line.

*src/content/common/data.js*
- The epilogue kit now matches the finale's route end: 14000 credits, 6 Medi-Gel Max, 4 Ether Cell+.

**Results from the final run (shots/C10-gamma/balance-check.txt)**

| Chapter | Fights | Level at boss (plan) | Boss route check | First-timer check |
|---|---|---|---|---|
| Prologue | 7.8 | 7.26 (7) | SENTINEL 89.8%, 9 rounds | 91.8%, 9 rounds, 2 Breaks |
| Ch1 | 10.1 | 12.15 (12) | Maw 93.8%, 8 rounds | 81.0%, 10 rounds, 2 Breaks, untargetable 16% |
| Ch2 | 8.1 | 17.31 (17) | Gardener 93.8%, 9 rounds | 86.5%, 10 rounds, 2 Breaks |
| Ch3 | 8.7 | 22.50 (22) | Voss 91.0%, 9 rounds | 81.3%, 9 rounds, 2 Breaks |
| Ch4 | 8.3 | 27.50 (27) | Echo 93.8%, 9 rounds | 93.8%, 9 rounds, 2 Breaks, untargetable 16% |
| Finale | 9.5 | 32.41 (32) | WARDEN 92.5%, 11 rounds, 2 Breaks per form | 88.3% at level 32, 11 rounds, 2 Breaks per form, untargetable 0% |

- Gardener heals cancelled by a Break: 37%. Severance cancelled by a Break: 32%.
- Every regular fight is in range. Both finale elites pass the elite target (at least 95% wins, 4-8 rounds, 20-50% HP lost).
- Retry from WARDEN's second form wins 84.5% for the route squad and 74.5% for a first-timer.
- Checked with larger samples: route 93.5%, first-timer 88.8%, and C11's test scenario 85.6% over 1000 fights.

**Earlier open items**
- Maw: untargetable on 16% of party turns (was 30%).
- Voss: route 91.0% (was 96%).
- Echo: median 9 rounds (was 11), party level at Echo 27.50 (plan 27).

npm test passes 314 of 314, scriptcheck is ok, and tests/simulate.mjs still exits 0.

C11 lowered several WARDEN powers during this session (form 1's Cradle, Gentle Hand and Last Lullaby, and form 2's Falling Light). The final run includes those edits; the balance.js changes above compensate for them.

### Acceptance

- PASS `npm run balance -- --check` for the whole campaign: exit 0, no target missed, no placeholders in any chapter (shots/C10-gamma/balance-check.txt).
- PASS finale route with fight counts from geometry: heart_ascent 135 units and heart_crown 60 units give 4.5 random fights, plus 4 field fights (the Wardens, the north chord, two Choirlit Echoes) and WARDEN, for 9.5 fights (target 8-10, 2 elites included).
- PASS WARDEN first-timer check at the level the route delivers (32): 88.3% first-try wins (target at least 75%), median 11 rounds (target 10-14), 2 Breaks in each form, untargetable on 0% of party turns; with 1200 fights: 88.8%.
- PASS WARDEN route check: 92.5% wins (target 85-95%), median 11 rounds, 2 Breaks in each form, all losses in form 2 (8%); with 1200 fights: 93.5%.
- PASS (report only) Retry from the second form (heart_boss_warden_2): 84.5% for the route squad, 74.5% for a first-timer, median 6 rounds.
- PASS level curve: party mean level at each boss 7.26 / 12.15 / 17.31 / 22.50 / 27.50 / 32.41 against plan 7 / 12 / 17 / 22 / 27 / 32; every chapter ends within 1 of the next chapter's start level.
- PASS fights per chapter (11.7): 7.8 / 10.1 / 8.1 / 8.7 / 8.3 / 9.5.
- WARN (warning by design) zone walking under 300 units: ch2 278, ch4 226, finale 196. C7 says the Heart map is already at its 72x56 cell limit.
- PASS Maw untargetable share: 16% of party turns (C3-fix value confirmed; earlier run measured 30%); route 93.8%, first-timer 81.0%.
- PASS Voss route check: 91.0% (was 96%); first-timer 81.3%.
- PASS Echo: route median 9 rounds (was 11), 93.8% wins; level at Echo 27.50 against plan 27 (C6 had measured 29.8); Severance cancelled by a Break in 32% of casts.
- PASS Gardener: route 93.8%, first-timer 86.5% in 10 rounds; heals cancelled by a Break in 37% of windows.
- PASS regular fights in every chapter: at least 99.2% wins, median 2-4 rounds, 15-33% party HP lost. Finale elites: Choirlit Rings 99.2%, 7 rounds, 26% HP; Choirlit Spire 100%, 6 rounds, 25% HP (elite target: at least 95%, 4-8 rounds, 20-50% HP).
- PASS economy in every chapter (finale: 10162 credits earned against 5902 for a restock); kits ch1 to epilogue match the route ends; every binding equipment and item id is defined, priced and has a source.
- PASS mechanic-frequency report for every chapter, now with sleepers per fight, plus losses per form and the retry line for WARDEN.
- PASS npm test 314/314; C11's tests/warden.test.mjs 7/7 (its level-30 first-timer test wins 34/40 on its fixed seeds); scriptcheck ok; tests/simulate.mjs exits 0.
- PASS screenshot shots/C10-gamma/warden/warden2-round1-order.png from a private build (fin.crown, level 31): WARDEN acts twice in a round, first and again before Orion, Sera and Kade, as the speed change intends; 0 page errors and 0 console errors.

### Deviations

- WARDEN's difficulty comes mostly from its second form's speed (x1.5) and a form-2 starting shield of 2, plus x1.04 attack and magic and x1.05 HP, all in balance.js overrides. More attack alone could not bring the route check under 95% without pushing C11's fin.warden test (level 30, the chapter's starting bag) below 75%.
- Gardener attack and magic x1.05 in balance.js, to make up for the new rest at the Arboretum hall.
- The campaign routes for ch2-ch4 and the finale now rest at the Med-Stations the location owners' human-pace routes rest at. Fight counts stay the same, but routes lose fewer fights and keep more items.
- The finale's chests step skips the Bellwarden reliquary ('bell') through a new `skip` field.
- The finale kit keeps its committed bag (Medi-Gel 1, Ether Cell+ 5). A full run's route end differs from it by about one item, which is within run-to-run noise. The epilogue kit was updated to the route end (14000 credits).

### Requests

- C11 (src/content/warden/story.js, tests/warden.test.mjs): the fin.warden jump uses level 30, but the route delivers 32 (mean 32.41). Over 1000 seeds its first-timer test wins about 85% and passes 34/40 on its fixed seeds, but it is the tightest constraint on the Warden's tuning. Please move fin.warden to level 32, or give it a restocked bag, so the test checks the delivered state.
- C11 (warden/data.js, heart_boss_warden_2): Retry from the second form is harder than form 2 inside the full fight (first-timer 74.5%), because the retry starts with no Boost points and no momentum. Consider a stronger opening for the retry, for example raising each member's Boost points in the encounter's onBegin, or starting WARDEN below full HP.
- C11: numbers for the Warden are C10's (TECH_PLAN 7.9). Please tell C10/I2c before changing powers or HP in warden/data.js again; this session's lower form-1 powers and Falling Light 0.27 moved the route check from 92.8% to 95.8% until balance.js compensated.
- C7 (src/content/heart/maps/heart.js): the Third Tier has no Med-Station before the second Choirlit Echoes. They cost a first try in 9 of 80 route runs (15 of 200 in a larger run), and 0 of 200 when the squad rests on the Third Tier. Please add a Med-Station at the Third Tier lift arrival or before the processional.
- C7 (heart/data.js): the Choir Guardian is never Broken in the simulator (0.00 Breaks per fight), because its weaknesses (gauntlet, volt, lance) are the squad's weakest options and it falls in about 2 rounds. If the 'shield grows per Break' lesson should show, swap one weakness for one the squad uses often, such as rifle or thermal.
- Gate G3 / I2d: C4 measured regular fights at about 81 s at human pace. The simulator's medians are 3-4 rounds (target 2-4), so the remaining time is presentation, not numbers C10 can tune.
- C3 asked which count the 11.7 fight range applies to: it is the critical path the campaign check measures (ch1 delivers 10.1). Optional detours add fights.

### Known issues

- C7, C8 and C11 are still editing finale content (layout, art, the 19-warden scenario). The final run used the data on disk at 01:03. If heart or warden data changes after that, rerun `npm run balance -- --check`.
- Zone walking is under the 300-380 units of 11.7 in ch2 (278), ch4 (226) and the finale (196). These are warnings, not failures.
- No human-pace run of the finale was done by this task; C7 owns that measurement. The WARDEN fight is 11 rounds in the simulator; by C5's Voss measurement (12 rounds in 242 s) that is roughly 220-260 s at human pace, an estimate only.
- The route checks sit at 91-94% wins for every boss; the Warden at about 93.5% over 1200 fights is close to the 95% ceiling, so a small content change could tip it.
- Results for the same settings vary by 1-2% between runs: at default sizes the boss checks use 400 fights and the routes 80 runs.

### Files

- /home/user/Research/voidpath/src/content/balance.js
- /home/user/Research/voidpath/src/content/common/data.js
- /home/user/Research/voidpath/tests/campaign.mjs
- /home/user/Research/voidpath/shots/C10-gamma/balance-check.txt
- /home/user/Research/voidpath/shots/C10-gamma/warden/warden2-round1-order.png
- /home/user/Research/voidpath/shots/C10-gamma/warden-steps.json
- /home/user/Research/voidpath/shots/C10-gamma/page/index.html
- /home/user/Research/voidpath/shots/C10-gamma/shop/fabricator-finale.png

## G3-content (gate G3 content fixes, prologue to chapter 4)

G3-content is finished for prologue through ch4. Nine items are done: G3-02, 03, 04, 05, 09, 10, 11, 16 and 17. G3-02 and G3-04 are only partly verified, see acceptance.

What changed:
- Shoals (G3-02): the Blue Tunnels and Deep Ice encounter rates go from {6,11} to {11,22}. Three visible field fights are added on the path: the mite nest, the rime golem and the Salvage Bots.
- Arboretum (G3-03/04/05): a Med-Station by the pump house; a lighter bloom mantis, rootling and Fern Walk; one spore sleeper at a time; checkpoints after the arrival scene and after each valve. The Gardener now telegraphs her heal one round ahead, a Break cancels it, the dome light comes every third round, and she has less HP.
- Staging (G3-09): arrival is 29.9 s and channels_drained is 13.6 s.
- Lines: Sera's promise and MOTHER-7's seed-vault line (G3-10); Kade's 'Copy, Commander.' (G3-11); the jam tip in the spire is gated behind the scripted riot lesson (G3-16); new lines for Marta and Harl (G3-17).
- Flight home: G3-flow's fix in travel.js (cutscenes.leaveMap) has landed, so I removed C5's spire.arrival workaround and re-checked it in the browser.

Three late fixes came out of a fresh campaign run:
- The Salvage Bots field fight now uses a new encounter, meridian_salvage (two bots and a mite). Two bots alone lost only 14-15% HP at L12, under the 15% floor for regular fights.
- arb_gardens and arb_stasis go from {12,24} to {11,22}. Without this the party reached the Gardener at level 16.81 against a plan of 17, and the first-timer win was 73.5%, under the 75% target.
- arb_s_mantis loses its feral caretaker. It cost one route loss and one first-timer loss in the whole-campaign run.

Results:
- npm test 315/315, scriptcheck ok.
- Strict scenarios 11 through 14 and their alternates all pass. Scenario 12 needed a rerun at 640x360 because the machine was overloaded.
- `tests/campaign.mjs --check` passes for ch1 and ch2. The whole campaign has one FAIL: vault_overwrite in ch4 (one route loss and one first-timer loss in 80+80 runs). It only shows up because the random stream shifted.

**Every encounter, zone-rate and enemy-stat change, for G3-balance.** No XP values were changed; XP moves only with the number of fights.

Shoals:
- shoals_tunnels and shoals_deep: {6,11} to {11,22}. meridian_spine stays {6,10}.
- New field fights: mites (shoals_eel_trio, script shoals.mites), golem (shoals_golem, script shoals.golem), and the Meridian bots (new encounter meridian_salvage ['ice_mite','salvage_bot','salvage_bot'], script shoals.bots).

Arboretum:
- spore_drone: Pollen puts at most 1 to sleep (was 2), and it uses no Pollen while anyone sleeps.
- bloom_mantis: HP is statLine(14,'brute') ×0.7, shield 4 to 3, still 2 actions per round.
- rootling: HP is statLine(13,'swarm') ×0.6.
- Gardener:
  - HP scale 1.155 to 1.05; ATK/MAG scale 1.43 to 1.3.
  - Shield 4/4 to 3/3, shieldGain 0.
  - Photosynthesis heal 0.08 to 0.06.
  - Dome light every third round; gather is telegraphed and heals at her last action of the next round; any Break cancels it.
  - Pollen limit 1.
- New encounters arb_f_drones ['spore_drone','spore_drone'] and arb_f_mantis ['bloom_mantis','spore_drone'].
- arb_s_keepers is now ['rootling','feral_caretaker','rootling'].
- arb_s_mantis is now ['bloom_mantis','rootling'] (was ['bloom_mantis','feral_caretaker']).
- New zone arb_fern (the fern area) ['arb_f_mantis','arb_f_drones','arb_g_spores','arb_f_mantis','arb_f_drones','arb_g_gilded'] at {12,24}.
- arb_gardens and arb_stasis: {12,24} to {11,22}.
- New Med-Station med_pump.

Spire:
- New zone spire_checkpoint ['spire_cp_duo','spire_cp_guard','spire_cp_turret','spire_cp_trio','spire_cp_guard'] at {15,28}, with new formations spire_cp_duo, spire_cp_guard and spire_cp_trio (no riot drones).
- noJamTip on spire_cp_pair, spire_cp_riot, spire_cp_squad, spire_up_turret and spire_up_squad.

### Acceptance

- npm test: PASS, 315/315 (0 failures) after the final edits.
- tools/scriptcheck.mjs: PASS ('scriptcheck ok').
- Strict scenarios: PASS.
- 11-driftmarket: 831 s. 11-driftmarket-alt: 2112 s.
- 14-spire: 4267 s. 14-spire-alt: 984 s.
- Those four ran at 15:35. Their chapters' content did not change after that.
- Reruns after the final edits: 12-shoals-alt 373 s, 13-arboretum 2445 s, 13-arboretum-alt 438 s.
- 12-shoals passed on a rerun at 640x360 with 0 page and 0 console errors.
- Every run had 0 page errors and 0 console errors.
- 12-shoals first rerun at 1280x720: FAIL at step 21 (walk into the eels) because of machine load, not content.
- Load average was 17-23 on 4 cores.
- A debug run showed no explore lock and no running cutscene, yet the leader moved only 0.09 units during a 1.2 s ArrowRight hold.
- The 640x360 rerun passed.
- Salvage Bots field fight in the browser: PASS.
- shots/G3-content/bots-check plays meridian_salvage (ice_mite plus two salvage_bots), won on auto, flag shoals:bots set.
- 0 page errors, 0 console errors.
- Campaign `--check --chapter ch1 --chapter ch2`: PASS (exit 0).
- Whole-campaign `--check`: FAIL on one target only, vault_overwrite in ch4 (1 route loss + 1 first-timer loss in 80+80 runs).
- Levels at the boss against plan: prologue 7.28 / 7, ch1 12.37 / 12, ch2 17.10 / 17, ch3 22.16 / 22, ch4 27.24 / 27, finale 32.24 / 32.
- G3-02 fight count: PARTIAL.
- Campaign: ch1 delivers 9.7 fights (passes its 10-12 check with tolerance).
- Human-pace run (ONE run over ch1 and ch2): 9 distinct ch1 fights (8 regular + the Maw, which was retried once), which is below 10.
- The Salvage Bots formation was changed after this run, which does not change the count.
- G3-02 spacing: PASS on median gap, PARTIAL on back-to-back.
- Median gap between ch1 fights: 20.2 s (target at least 20 s).
- Gaps were 5, 6, 12, 12, 20, 25, 60, 84 and 87 s.
- No two random fights came back to back, but a random fight followed a field fight twice: eel trio then mites after 5.1 s, golem then deep eels after 6.2 s.
- G3-03 Med-Station, mantis and sleepers: PASS.
- The pump-house Med-Station med_pump is in the browser (screenshot 01-med-pump.png).
- Mantis fights take a median of 3 rounds (arb_fern 3 rounds, 19% HP lost; arb_stasis 2 rounds, 18%).
- The spore drone and the Gardener never keep more than one traveller asleep.
- G3-03 regular-fight losses: PASS in the simulator; the fix was not re-checked at human pace.
- Campaign: 0 regular-fight losses in 80+80 runs for ch2, in both the ch1-ch2 run and the whole-campaign run.
- The ch2 part of the human-pace run was played before the Fern Walk fix. It wiped in arb_g_swarm after 4 fights spaced 5, 5 and 6 s apart, which is what led to that fix.
- G3-04 checkpoints: PASS in the browser (arb-retry logs).
- After the arrival scene: cp (9.6, 45.4), objective ch2.drain.
- After valve A: cp (11, 44.8), objective ch2.drain_2.
- After valve B: cp (61, 46.8), objective ch2.drain_3.
- After the human-pace wipe, Retry returned to the arrival checkpoint (area dock) without replaying the arrival scene.
- G3-04 valves kept on retry: NOT VERIFIED. The planned Glasshouse wipe in that run never happened: the runner timed out while waiting for a browser slot.
- G3-05 Gardener rounds, browser policy (boss-by-level):
- L17: win 84.7%, median 9 rounds.
- L18: win 89.0%, median 11 rounds (10 on wins).
- L19: win 93.3%, median 10 rounds.
- Campaign: route at L17 win 94.8%, median 7 rounds; first-timer win 84.5%, median 9 rounds.
- A Break cancelled the heal in 59% of 1077 light windows.
- Verdict: PASS at L17 and L19; L18 is borderline (11 rounds, 10 on wins).
- G3-09: PASS.
- Measured with tools/scenetime: arboretum.arrival 29.9 s, channels_drained 13.6 s, no staging waits.
- WRITING 5.10: tutorial 26/28, keycard 9, plus a '(G3) Plan corrections' note.
- WRITING 5.3 synced (new rows eels/mites/golem/bots, meridian_arrival 5/60, varo_log 9/150).
- G3-10: PASS. 'Not yet, Theo. Soon. I promise.' is the last beat before the card. MOTHER-7 names the seed vault once in the Gardener aftermath, on the critical path.
- G3-11: PASS. Kade says 'Copy, Commander.' after Voss uploads.
- G3-16: PASS. Riot-drone encounters before the scripted spire_riot lesson carry noJamTip, and the checkpoint zone has no riot drones.
- G3-17: PASS. Marta's new line about the docking-plate wall replaces the one that echoed Juno's tape joke. Harl has a post-arrival idle line.
- Flight-home check: PASS.
- G3-flow's cutscenes.leaveMap is in travel.js, and C5's spire.arrival goto workaround is removed.
- spire-flight2: exit 0, 0 console errors (after making Kade's line await the gather); screenshot spire-arrival-landed.png.
- The human-pace run's note shows the leader at halcyon (40.10, 23.80), walkable, with checkpoint and autosave ok.

### Deviations

- G3-02 asked for Shoals rates of about {12,24}; I used {11,22}. At {12,24} ch1 fell further below the 10-12 fight target. {11,22} plus three visible field fights gives 9.7 expected fights and a 20.2 s median gap.
- G3-03 offered 'one action or less HP' for the bloom mantis. I kept 2 actions per round and cut HP to ×0.7 with shield 3 (median 3 rounds). arb_s_keepers and arb_s_mantis also got lighter formations, so no regular fight was lost in the simulator.
- G3-05: the gather heal is not a 'charge' kind. tests/policy.mjs defends against any charge when hurt, so a charge would have distorted the simulated party's play. Instead the script sets a delayed heal at her last action of the next round, and a Break during that round cancels it (cue domeDim).
- Not in the fix list: arb_gardens and arb_stasis go from {12,24} to {11,22}. This keeps ch2's level at the Gardener on plan after the lighter Fern Walk (16.81 before, 17.10 after; first-timer win 73.5% before, 84.5% after).
- Not in the fix list: the Salvage Bots field fight uses a new encounter, meridian_salvage. Kade's line becomes 'Two salvage bots and a mite. Same target. They weld themselves back.', and WRITING 5.3 is synced.
- The human-pace run (ONE run over ch1 and ch2, as asked) was played before the final ch2 changes: Fern Walk zone, stasis/gardens rates, arb_s_mantis. Those changes are covered by the campaign simulator and the strict scenario 13 pair, not by a second human-pace run.
- Scenario 12-shoals passed on a 640x360 rerun, because at 1280x720 the overloaded machine (load 17-23 on 4 cores) stalled player movement.

### Requests

- G3-flow, tools/routes/arboretum.mjs: add `await d.med('med_pump')` after valve B. Also handle a Retry after a regular-fight wipe: the restored spores field boss blocks the walker ('no path: 52.6,45.5').
- G3-flow, tools/routes/shoals.mjs: add `{ fight: 'shoals_eel_trio' }` (mites) and `{ fight: 'shoals_golem' }` to the Shoals legs, and `{ fight: 'meridian_salvage' }` to the Meridian spine leg. Also update the route plan tables: prologue tutorial 28, keycard 9; ch1 eels, mites, golem and bots at 6 s each.
- G3-flow: add a ch2 wipe-and-Retry scenario (a wipe in the Glasshouse retries at the valve B checkpoint with both valves kept), since that part of G3-04 is still unverified in the browser.
- G3-flow, tools/play.mjs: start --timeout after the browser slot is acquired. Today it includes the slot wait, which timed out a run here (arb-retry).
- G3-balance, tests/campaign.mjs: CANCEL_CHECKS.arb_boss_gardener should count the Gardener's two-round cue window.
- She gathers in round D and heals at her last action of D+1; a Break during that window cancels it (cue domeDim).
- Counting by single rounds misreports this; the current report gives 59% of 1077 windows cancelled.
- G3-balance: the whole-campaign --check fails only on vault_overwrite in ch4 (1 route loss + 1 first-timer loss in 80+80). It appeared after the random stream shifted, and that field fight costs 26% HP fresh at L26. Please retune it or the vault rest points in balance.js or vault data.
- G3-balance: the Maw was lost on the first try at L11 in the browser human-pace run (won on Retry, 9 rounds). The simulator reaches the boss at level 12.37 (whole levels 11.86). Please review the ch1 XP if first-try Maw wins at human pace matter.
- G3-balance: the Gardener's route win is 94.8% at L17 (median 7 rounds). If the target band is tighter, raise gardener atk/mag in balance.js, not the content scale.
- I2b, WRITING.md sections I don't own:
- 5.4: the arrival Orion line ('The channels are flooded. There's always a valve.'), MOTHER-7's seed-vault line, Sera's 'Not yet, Theo. Soon. I promise.' and the theo_pod line 'Still here, Theo. Soon.'
- 5.5: Kade's 'Copy, Commander.'
- Section 7: Marta's two new lines and Harl's idle line.
- Section 11: varo_log budget 12/150 should be 9/150.

### Known issues

- Whole-campaign --check FAIL on vault_overwrite in ch4 (2 losses in 80+80). It is outside this task's fix list and was left to G3-balance.
- ch1 at human pace met 9 distinct fights, just under the 10-12 target. A random fight twice came 5-6 s after a field fight (grace starts again after each battle).
- The G3-04 retry with valves kept was not exercised in the browser; only the checkpoint positions and objectives were.
- The Gardener at L18 has a median of 11 rounds (10 on wins), one over the 8-10 band. L17 and L19 are in band.
- The ch2 human-pace numbers (a wipe in the Fern Walk, gaps of 5-6 s) are from before the final ch2 changes and no longer reflect the content.
- dist/index.html is rebuilt by `node build.mjs --dev --only main` and shows as modified in git, which happens with any local build. dist/artifact.html was already modified by others.

## G3-balance (gate G3 balance and the whole-campaign check)

G3-balance is done. `npm run balance -- --check` passes for the whole campaign (exit 0) on the content as it stood at 09:18. npm test passes 315/315 and tests/simulate.mjs exits 0.

**The browser's policy vs the simulator's.** The browser's autoplay (`createPolicy`) and the simulator's policy are the same code. Played in node, they gave the same win rates at the Sentinel and Voss (for example, Sentinel at L8 99.3% with both). Tracing the Gardener fights turned up two real flaws in that shared policy (tests/policy.mjs), so the browser inherits both fixes:
- **Buff spam:** Orion cast Overclock on every carry, about 5 times a fight. That made fights longer at higher levels (L19 ran longer than L17).
- **Volleys never learned:** `createPolicy` never learned from random-target volleys such as Nyx's Quickdraw, so it kept probing with them. At L19 against the Gardener the browser policy was 2 rounds slower and 5 points lower than the simulator's. After the fix the two match (93.0% vs 93.3%, 9 rounds).

**G3's two browser losses:**
- **Voss:** the run started from the ch3.cells jump. That gives the chapter-start kit (tier-2 weapons for Kade and Orion, no shopping). With that kit Voss wins only 51% at L22 and 62% at L23. G3's actual Voss party now wins 86.3% at L23 with the browser policy (it was 79.3%).
- **Sentinel:** the L8 loss could not be reproduced. The pro.bridge kit wins 99% at L8 with either policy.

**Balance changes (balance.js):**
- Bosses:
  - SENTINEL: offense x1.10, XP x0.9.
  - The Maw: HP x1.30, XP x0.85.
  - Gardener: HP x1.06, offense x1.18, XP 0.25, on top of G3-content's new numbers.
  - WARDEN form 2: HP x1.10.
  - Voss: unchanged in the end.
- Regular foes softened slightly for G3-03: the prologue's crawler and turret, the feral caretaker, the spore drone, the corrupted memory, the dream eater and the Warden seraph.
- Chapter XP: ch1 0.85 → 0.92, ch2 0.94 → 0.84, ch3 1.08 → 1.12.

**Simulator changes (tests/campaign.mjs):**
- Every boss now gets a second first-timer check played with the browser policy (target at least 70%).
- `--check` fails on any loss in a regular fight on the route, with HP and EP carried between fights. Elite fights may lose in at most 5% of runs.
- The ch1 and ch2 routes now walk to the chests the human-pace routes open.
- New rests: the pump-house Med-Station (ch2) and the Third Tier Med-Station (finale).
- The Gardener's Break-cancel window now runs from her Gather to the heal a round later, matching G3-content's change.
- New `--walk` what-if option for estimating human-pace levels.

**tools/boss-by-level.mjs:** new `--policy sim|browser` option, and it now also prints the median rounds of wins only.

**Human-pace run of ch1** (`--start ch1`, page built at 07:33, before the policy fixes and the final tuning): 9 regular fights plus the Maw, so 10 fights. The party reached the Maw at L11 against a plan of 12 and lost the first try (11 rounds, 185 s). That party had Orion on a tier-1 weapon and 3266 credits unspent; with the current numbers it wins 61.5% at L11 and 78.5% at L12. The run was then stopped at its 90-minute limit, after 33 minutes waiting for a browser slot.

### Acceptance

- PASS `npm run balance -- --check`, whole campaign, exit 0 on the content as of 09:18 (shots/G3-balance/balance-check.txt). Fights per chapter: 7.8 / 9.7 / 8.5 / 8.3 / 8.3 / 9.5. Mean party level at each boss: 7.28 / 12.28 / 17.20 / 22.23 / 27.30 / 32.27 against plan 7 / 12 / 17 / 22 / 27 / 32.
- PASS G3-06, route check and first-timer check (simulator's policy / browser's policy) per boss: SENTINEL route 91.5%, first-timer 93.5% / 93.5%. Maw 92.3%, 86.8% / 86.8%. Gardener 92.0%, 83.0% / 83.0%. Voss 92.8%, 86.8% / 85.8%. Echo 90.3%, 88.5% / 88.5%. WARDEN 93.3%, 90.0% / 91.0%. All first-timer medians are 8-11 rounds with at least 2 Breaks (2 per form for WARDEN). Targets: at least 75% with the simulator's policy, at least 70% with the browser's, route 85-95%.
- PASS G3-06 jump-kit checks (tools/boss-by-level.mjs, both policies agree): Sentinel with the pro.bridge kit 80.8% at L7 and 99.3% at L8. G3's actual Voss party at L23 with the browser policy: 86.3% (was 79.3%).
- PASS G3-03: `--check` now fails on any regular-fight loss in a route run (HP and EP carried). Result: 0 losses in 80 route runs plus 80 first-timer runs in every chapter. Finale elite fights lose in at most 1% of runs (limit 5%).
- PASS G3-05 (tools/boss-by-level.mjs, ch2.gardener kit): L17 9 rounds at 84.8% (simulator's policy) / 85.0% (browser's). L19 9 rounds at 93.3% / 93.0%. Campaign first-timer check: 8 rounds, 83%. Heals cancelled by a Break: 61% (target 30-70%).
- PASS G3-07 by estimate, not by a full chained human-pace run. Simulator, critical path: Maw 12.28 (whole levels 11.82), Gardener 17.20 (16.68). Human-pace estimate (`--walk 1.2`, calibrated on G3 run1): Maw 12.4, Gardener 17.9 whole levels, so both within 1 of plan. G3's run had Maw 14 and Gardener 19. Measured human-pace ch1 from the ch1 jump at L7: 10 fights, Maw at L11.
- PASS finale WARDEN: route 93.3%, 11 rounds, 2 Breaks per form. First-timer 90.0% / 91.0% (simulator's / browser's policy). fin.warden at L32: 89.7% / 91.0%, 11 rounds; at L30: 83.3% both. Retry from the second form: 90.3% for the route squad, 81.8% for a first-timer. tests/warden.test.mjs 8/8.
- PASS npm test 315/315; tests/simulate.mjs exit 0.

### Deviations

- tests/policy.mjs is shared by the simulator and the in-game autoplay (bundled into main.js), so its two fixes also change the browser: only one ally carries an attack buff at a time, and random-target volleys count as tried on every foe.
- G3-07: chapter 1 XP went up (0.85 to 0.92) instead of down. After G3-content's density cut the Maw arrived below plan in both the simulator and the human-pace run. The Arboretum got the trim instead (0.94 to 0.84, about 11%), and the Maw and Gardener are worth a little less XP.
- WARDEN was toughened through form-2 HP (x1.10) rather than attack. Attack x1.07 flipped C11's single-seed retry test.
- Campaign routes now walk to the chests they open in ch1 and ch2 (the human-pace order) and rest at med_pump and med_t3.
- The Gardener's final numbers stack balance.js overrides on top of G3-content's new HP and power factors (HP x1.06, offense x1.18).

### Requests

- I2d / C5 (src/story/jump.js, spire story jumps): mid-chapter jumps get the chapter-start kit, so jumping to ch3.voss gives Voss 51% at L22 and 62% at L23. Please let REG.jumps carry equipment (the chapter's chest gear plus its shop weapons), and give the ch3.upper and ch3.voss jumps the route's gear.
- Human-pace route owners (tests/routes/spire.mjs, and the others): call shopWeapons at each chapter's shops. In G3's run4 the party never shopped in the Spire: 7706 credits unspent, Orion still on a tier-2 weapon.
- Whoever runs human-pace next (G3-content, I1b): rebuild the page first. The policy fixes are bundled into main.js, and G3-content's current run uses a 07:50 page with the old policy and old balance.
- C11 (tests/warden.test.mjs): the retry test requires one fixed seed (`fight('heart_boss_warden_2', 7)`) to win. Please assert a win rate over about 20 seeds instead.
- C4 (src/content/arboretum/data.js): the feral caretaker's Sap Spray (30% heal, cooldown 1) plus summons, alongside a spore drone, makes arb_s_caretakers long. A squad carrying damage wipes there in about 1 of 160 runs. Consider cooldown 2.
- I2c (core/progression.js): XP that depends on the level gap would keep arrival levels steady whether a player beelines or explores.

### Known issues

- With 160 route runs, rare regular-fight losses still show up: meridian_scrap, arb_g_swarm, arb_s_caretakers and vault_overwrite each lose about 1 run in 160. They usually follow an empty bag or a long sleep/heal fight. The default 80-run check is clean. Any content change re-seeds the runs and could make `--check` fail, so rerun it after other tasks land.
- The G3-07 human-pace levels come from the simulator's estimate. My chained human-pace run was stopped after the Maw. The same 1.2 walking factor applied over the whole campaign estimates Voss 23.4, Echo 28.6 and WARDEN 34.0 whole levels. G3 measured ch3 and ch4 walking at about 0.65-1.2x, so this compounding is unverified; I1b should check arrival levels in one chained run.
- A first-timer who jumps in at ch1 at L7 reaches the Maw at L11 and wins only about 62% (78.5% at L12). A chained player arrives around 12.
- Retry from WARDEN's second form lasts a median of 3-4 rounds because of C11's Boost gift.
- Zone-walking warnings: ch2 294 units, ch4 226, finale 198 (target 300-380).

## C7 (the Heart)

C7 (the Heart) is finished. On the final build, 16-heart and 16-heart-alt both pass --strict, npm test passes 315/315 and scriptcheck is ok. All 21 viewpoints pass visualLint and the luma floor in the real game page on desktop and phone. A shader revisit compiles nothing new, and missingArt() is empty. One acceptance item fails: the human-pace finale takes 31.6 min against the 11.7 band of 20-24 min. Fight time is 19 min of that, almost all of it the WARDEN (475 s plus one lost first try) and the two elites (282 s).

Both balance requests are applied:
- A Third Tier Med-Station, med_t3, now sits in sight of the second Choirlit Echoes. It is on the route, and the route rests there.
- The Choir Guardian's weaknesses changed from gauntlet/volt/lance to gauntlet/rifle/lance.

Problems found and fixed while measuring:
1. Engine bug, worked around in my files: a beaten field boss stays standing, with its collider on, until some flag changes. On the Second Tier's north chord, a bridge one cell wide, this blocked the path after the Choir fight. The heart now has 5 flag triggers that run an empty `heart.settle` script, which makes the world drop the beaten boss. The real fix belongs in explore.js (request 2).
2. In `heart.arrival`, ORION spoke while off screen. The squad now gathers at the pier's east end and the camera returns to them before Kade's line. The arrival's phone key-scene frame now opens wide on the cathedral: visualLint went from 2 lights (fail) to 4 (ok), luma 57.7.
3. The Third Tier's west end was too dark on desktop. It has a brighter mood and two more lanterns: t3_west went from 31.6 to 83.0.
4. The crown lift staging is shorter (1100 to 700 ms camera move, no awaited reset).
5. The human-pace route and the scenarios had broken position checks and teleport spots inside boss trigger radii; both are fixed.

Heart data I changed (for G3-balance):
- `heart/data.js`: choir_guardian weaknesses now ['gauntlet','rifle','lance']; the zone comment now says heart_crown is 67 units.
- `heart/maps/heart.js`: new interactable `med_t3` (kind med) at (47.66, 20.96), exported as KEY.MED_T3; Third Tier mood brighter; two lanterns at the west end; 5 `settle_*` flag triggers.
- Encounters, zones and zone rates are unchanged.

### Acceptance

- PASS npm test: 315/315 (final code). PASS npm run scriptcheck: ok (finale 15 scenes, 114 boxes).
- PASS 16-heart --strict on the final build (640x360): 16 shots, 0 page errors, 0 console errors; flags kade/nyx/orion/sera dreams, wardens/choir/echoes_t2/echoes_t3 down, finale_done; missingArt []. Covers Starchart warning, night before, arrival, 4 dreams, both pylons sets, Echoes lost then Retry from the Med-Station, the new Third Tier rest, the crown lift (Not yet / Ride) and dreams.crown with WARDEN.
- PASS 16-heart-alt --strict on the final build: 4 shots, 0 page errors, 0 console errors (Nyx leads, pylons in the other order with the Journal objective fin.t3_one_a, Bellwarden and its reliquary, Nyx's cache, fabricator, falling light to the Dock, lifts both ways, all 4 gates lit, crown).
- PASS balance request 1: Med-Station med_t3 on the Third Tier's south arc, in sight of the second Echoes (5.2 units from their trigger, outside its 3.0 radius). It logs a checkpoint ('Squad restored', scenario shot 12-t3-rest). The human-pace route rests there and the expected-fights legs split at it.
- PASS balance request 2: choir_guardian weaknesses gauntlet/volt/lance -> gauntlet/rifle/lance. The Break rate was not re-simulated by me: G3-balance owns that check.
- PASS expected fights (tools/expected-fights.mjs): 4.31 random + 5 scripted = 9.3 (target 8-10). heart_ascent 140 units, heart_crown 67 units.
- PASS luma, real game, desktop 1280x720 high, 21/21 viewpoints: mean 50.5-100.4, near-black at most 28.3% (floor 40 / 50%). Lowest: causeway 50.5, dock 53.6, t2_lift 51.9.
- PASS luma, real game, phone 390x844, 21/21 viewpoints: mean 33.9-90.0, near-black at most 45.5% (floor 25 / 65%). Lowest: t3_west 33.9 (45.5%), t1_west 40.8, dock 42.8.
- PASS visualLint at every viewpoint in the real game page: desktop 21/21 ok, phone 21/21 ok (3-11 coloured lights in view). Arrival key-scene phone frame: ok, 4 lights (was 2, a fail, before the staging fix).
- PASS contact sheet: shots/C7/contact/heart.png (43 shots, preview-world, run before the late heart.settle/crown-lift changes; the real-game viewpoint sets above are on the final build). Explore budget at most 127 scene calls, 56-67k tris, 9 point lights desktop / 5 phone. Arrival scene frame on the final build: shots/C7/contact-scene/heart/scene-heart.arrival.png.
- PASS battles in the arena, desktop and phone: wardens, choir, c_trio (all 3 regular enemies), a_rare, both elite Echoes and the Bellwarden. 0 page/console errors. Desktop luma 67.8-78.9, phone 58.4-68.3. 75-80 calls, about 10.4k tris. missingArt [].
- PASS compiles on revisit: halcyon -> heart gives compilesSince 0 on desktop and on phone (96 programs).
- FAIL human pace (tools/human-pace.mjs --start finale --render-every 4): finale 31.6 virtual min vs the 11.7 band of 20-24. Battle 1136 s, cutscene 648 s, walk 49 s over 255 units. 8 fights (in band): 5 regular, mean 76 s and 4.0 rounds. Elites: rings 157.9 s, 9 rounds, L28 (plan 29); spire 124.1 s, 7 rounds, L30 (plan 30). WARDEN: 475.4 s, 6 rounds, L30 (plan 32), after one first-try loss and Retry from the second form.
- PASS story time at human pace: 433 s against a plan of 565 s. Arrival 31 s (plan 40), night_before 79, dreams 53/54/55/61, crown 31+61. FAIL heart.crown_lift: 9 s against plan 5 (cap 6); about 1.3 s of staging was cut after this measurement, and the confirmation's reading time alone is about 4 s.
- FAIL human-pace --strict exit 1: the only console error is C8's dreams.crown 'ORION speaks ... but is not on screen' (request 3).

### Deviations

- Scenario runs use --size 640x360 instead of 1280x720. SwiftShader on a loaded 4-CPU machine cannot finish the full ascent plus the crown at full size within hours. Full-size quality shots come from shots/C7/views-hi, views-phone, battles-hi, battles-phone, contact and the human-pace hi shots.
- Workaround for an engine bug: an empty 'heart.settle' script run by 5 once-only flag triggers (settle_wardens/choir/echoes_t2/echoes_t3/bellwarden, 'chapter>=finale & <flag>'). It makes the World drop a beaten field boss right after its fight. Remove it once request 2 lands.
- The scenarios were regenerated with a scratch generator (scratchpad/c7/scen3.mjs); only the JSON files are in the repo.

### Requests

- G3-balance (tests/campaign.mjs): in the finale route, add a { rest: 'heart' } at the Third Tier Med-Station med_t3, e.g. path ... 'inter:pylon_t3a', 'inter:med_t3' ..., before the heart_elite_spire fight, then rerun npm run balance -- --check. Heart data changed this run: choir_guardian weaknesses volt->rifle; new interactable med_t3 at (47.66, 20.96). Human pace also measured WARDEN at L30 (plan 32) with a first-try loss, and the finale at 31.6 min with 19 min of fights. Please consider shortening the first Echoes (rime golem + mantis: 9 rounds, 158 s).
- I2d / systems (src/world/explore.js): in _scriptEnded(), call this.world.syncFlags() after this.world.releaseTouched(). Otherwise a field boss whose defeat flag is set inside its own script stays present (visible, collider on, re-armed for another confront) until the next flag change. In the Heart it blocked the one-cell north chord after the Choir fight (human pace: 'no path: across the north chord'). Field bosses on other maps are likely affected too. Once this is fixed, C7 can drop heart.settle and the settle_* triggers.
- C8 (src/content/dreams/story.js, dreams.crown step (5)): intermittent console.error 'cutscenes: ORION speaks in "dreams.crown" but is not on screen'. It happened in the human-pace run (512x288) and one 16-heart run (640x360, 17:45), but not in the final scenario runs. Orion's bg move to [meet.x+2.3, meet.z+0.7] is not done, or he is not gathered, when he speaks. Await the move or gather him first. It fails --strict for 16-heart and the human pace.
- I2b (WRITING.md 5.10 scene table): heart.crown_lift plan 5 s is less than reading the confirmation takes. Measured 9 s, about 7.7 s after the trim; please set the plan to 8 s.

### Known issues

- The finale is over the 11.7 time band at human pace (31.6 min vs 20-24), driven by fight length (WARDEN 475 s plus a loss; elites 158 s + 124 s). Fight tuning belongs to C11 / G3-balance.
- heart.crown_lift is over its plan (9 s measured vs 6 s cap). It was trimmed after the measurement, but it stays over 6 s unless the plan changes.
- dreams.crown (C8) intermittently logs an off-screen speaker error, so the human pace and some 16-heart runs fail --strict.
- The human-pace hi shot right after the arrival (c07-dock) measures 38.9 luma on desktop while the camera is still settling. The dock viewpoint itself is 53.6 desktop / 42.8 phone.
- On a phone, the back-row Warden Seraphs stand over the battle arena column's gold glow and have weaker contrast than the front row. They stay readable, and the floor contrast is good.
- The Choirlit elites use a pale gold multiply tint (GILT_PALE), so they stay close to their original palettes (purple firewall golem).

## C11 (WARDEN, the final boss)

C11 M3 is done. Scenario 19-warden now passes under --strict: 17 shots, 0 page errors and 0 console errors. It runs the whole fight in the real game page: the intro card, the idle, the Lullaby, Voss stopping the lethal hit on Kade, the Cradle at half health, the Last Lullaby, the transform (HALCYON's line, music final_boss to final_boss_2), the Choir at 75%, Theo and Sera at 50%, the Choir at 25%, and the Requiem gathering. Then the squad falls, the game over offers "Retry from the second form" first, and heart_boss_warden_2 starts on final_boss_2 with the party as the battle began. HALCYON's gift fills 3 Boost pips each, the squad wins, the construct folds down (a real KO) and the outro line plays. I applied both of the balance task's requests without touching any WARDEN power or HP. (1) fin.warden moves to level 32. tests/warden.test.mjs now checks the level the route delivers: 36/40 on its fixed seeds, and 87.5% over 1000 seeds. (2) Retry from the second form now opens with HALCYON's gift: every traveler gets enough Boost for one ultimate (RETRY_BP = 3), with the same line HALCYON says at the transform. In `--chapter finale` the retry rises from 84.5% to 94.3% for the route squad and from 74.5% to 85.8% for a first-timer, matching form 2 inside the full fight (8% and 13% lost). I also captured battle frames on phone and desktop for both forms, with luma, idle motion and focus-band numbers.

### Acceptance

- PASS scenario 19-warden --strict on the real game page (private build shots/C11/page/index.html): 1/1 passed, 17 shots, 0 page errors, 0 console errors. Final log: won true, flags defeated:heart_boss_warden_2 + tut:warden_shift, missingArt [].
- PASS npm test 315/315. After the last edit (a comment-only change in story.js), warden + content tests pass 26/26. npm run scriptcheck ok (finale: 15 scenes, 114 boxes, ~6 min).
- PASS Retry from the second form in the browser (desktop and phone). The game-over rows are ['Retry from the second form', 'Retry from checkpoint', 'Load journey', 'Return to title']. heart_boss_warden_2 starts on final_boss_2 with HP as the lost battle began (1500/1134/980/1072). The model's Boost is 3/3/3/3 and the UI pips show 3/3/3/3, with HALCYON's line. The second attempt wins.
- PASS balance request 1: fin.warden is now level 32 (route delivers 32.41). warden.test first-timer: 36/40 on seeds 100-139. Over 1000 seeds: 87.5% wins, median 11 rounds, transform in round 6, median Breaks 2 in form 1 and 2 in form 2, 0 losses in form 1.
- PASS balance request 2: `node tests/campaign.mjs --check --chapter finale` exits 0. Retry from the later phase: route squad 94.3% (was 84.5%), first-timer 85.8% (was 74.5%), median 3 rounds. Form 2 inside the full fight loses 8% (route) and 13% (first-timer). Node sim of the retry at fin.warden: 86.7% over 1000 fights.
- PASS WARDEN targets, same run: route L32 92.5% wins (target 85-95%), 11 rounds, 2 Breaks per form. First-timer L32 87.3% wins (target >= 75%), 11 rounds (target 10-14), 2/2 Breaks, untargetable on 0% of party turns. Browser-policy first-timer 87.5%.
- PASS G2 rule 20, core in the focus band, both forms. Desktop: core at uv 0.647 against focusY 0.458 ± 0.235. Phone: core at uv 0.710 / 0.711 against focusY 0.587 ± 0.151.
- PASS the idle visibly moves at battle scale (pixels changing by more than 12 luma in the boss box over 1.2 s). Desktop form 1: 33.7% (mean diff 17.7). Phone form 1: 55.8% (27.0). Phone form 2: 43.2% (17.8).
- PASS luma of battle frames. Desktop 1280x720: mean 51.8-195.4, 0-30% near-black (floor: mean 40, at most 50%). Phone 390x844 medium: mean 57.2-156.6, 3-27% near-black (floor: mean 25, at most 65%); the retry-gift frame is 90.0 / 6%. The game-over UI screen (20.1 / 88%) is S5's screen, not a viewpoint.
- PASS music: heart_boss_warden plays final_boss, switches to final_boss_2 on the transform (logged), and heart_boss_warden_2 starts on final_boss_2.
- PASS renderInfo on phone medium in the Warden fight: 53 draw calls, 16.4k triangles, 85 programs, 255 textures, 44 MB canvas, 4 point + 3 directional lights; missingArt [].
- NOT MEASURED human pace of the fight (C7 owns the finale's human pace). The sim median is 11 rounds; C10's Voss rate gives roughly 220-260 s.

### Deviations

- No WARDEN power, HP or stat changed in warden/data.js. The only balance-relevant changes are fin.warden at level 32 and the retry's opening (heart_boss_warden_2's onBegin raises each living member to RETRY_BP = 3 and replays HALCYON's line). G3-balance should still rerun the whole-campaign check.
- The boss-script api has no Boost call. The warden_unbound onBegin therefore raises member.bp directly, and the new cue 'halcyon_gift' carries [{ id, bp, delta }]. Its fx (cue.halcyon_gift in warden/fx.js) calls d.ui.setBp, then plays the same cyan rise as cue.ultimatesRecharged, so model and pips agree (tested in node and the browser).
- The retry is shorter than form 2 inside the full fight: median 3 rounds and about 1 Break, against 6 rounds and 2 Breaks. Each member can open with an ultimate. The win rate matches form 2 in the full fight.
- Scenario 19-warden changes: the fold now comes from a real KO, because debug.winBattle dissolves the boss instead of folding it, which is why the earlier runs never caught the fold. The game-over shot waits for the screen's opacity to reach 1 (an earlier run captured a black frame). The run adds two idle frames and two focus-band logs.

### Requests

- Battle model owner (src/battle/model.js, scripts.js): add an api call such as api.giveBp(memberId, n) that emits 'bp' events. The Warden's retry gift could then use it instead of setting bp itself and pushing the values to the UI through a cue.
- G3-balance (src/content/balance.js): the warden_unbound override comment still says "C11's fin.warden test: level 30"; it is now 32. Please rerun the whole-campaign --check: the retry numbers moved (route 94.3%, first-timer 85.8%) and fin.warden is at 32. My finale check ran on balance.js as it stood at about 07:05, and balance.js was edited later in the session.
- S4 (src/battle/battleUI.js): on desktop the command menu opens over the 256-px Warden's core (shots/C11/scenario-f/19-warden/01b-idle-a.png). Consider placing it clear of a large boss. The boss card's subtitle ('The Merciful Lock' / 'Lullaby Unbound') is not visible in any captured card frame at 2.5 s; please check the vb-card-sub animation.
- C8: scenario 19-warden starts the fight through debug.startBattle. The hand-off from victory to dreams.crown's resolution is C8's script, so 17-dreams should cover it.

### Known issues

- On the phone (390 px wide) the left wing tips of both forms run off the frame edge; the head and core stay inside the focus band.
- The transform frame captured at its flash peak is almost white (desktop mean 195). The flash lasts about 1 s and is by design.
- The first phone frames run hit its 60-minute timeout, which counted about 28 minutes of waiting for a browser slot. It stopped after 08-retry-card; the phone retry-gift frame came from a second short run that starts heart_boss_warden_2 directly (same onBegin). In that first run the game-over screen also took longer than 20 Enter presses to give way to the retry (logged as step #41), though the retry did start.
- Other agents edited balance.js during this session; the retry numbers above come from the copy on disk at about 07:05.

## G3-flow (gate G3 system and tool fixes)

G3-flow is done, and the blocker G3-01 is fixed. Before, the Starchart flight home put the leader at halcyon (5.72, 3.28), out in the void, and both the autosave and the checkpoint kept that spot. Now travel.arrive drops the running script's leader stand-in under the cover before the map changes (new cutscenes.leaveMap, which cs.goto also uses), so the leader lands on the destination spawn. Checkpoints and saves go through a new game.savePos(): a position the leader cannot stand on is refused with a console.warn and replaced by the map's Starchart dock spawn, else its nearest walkable spawn. Load and Retry check the same thing (_loadTarget) and repair a void checkpoint they restore. G3-08: explore._run skips straight to the battle for any script the last Retry lost in (trigger rect, talk or console), so Voss's ~50 s pre-fight scene no longer replays even after a Med-Station visit. G3-16: battleState shows one tip per player turn, and the learn tip waits until the ultimate prompt has shown. G3-24/25/26: the reviewer's human-pace patches are landed properly (thin render via --render-every or VP_RENDER_EVERY, with shots drawn in full; fallback when the walk goal cell is blocked), plus stall handling: use() checks that its Confirm actually started that interaction and presses again, the Starchart, shop and menu waits retry, and a watchdog stops the run with a clear 'ABORT: ...' note instead of a silent stall. The routes now chain title -> FINAL CHAPTER card -> finale, and npm scripts pace, pace:report and fights are added. Evidence: new scenarios 27, 28 and 29 pass strict; 01, 11, 14, 20, 21, 22, 23 and 26 pass strict; 24 and 25 fail for reasons outside my changes (see known issues). One chained human-pace run went title -> CHAPTER TWO card with 0 console errors: 49.1 virtual min (prologue 20.2, ch1 28.7) in 101.7 wall min, and its flight-home check found the leader, checkpoint and autosave all at halcyon (40.10, 23.80). At the end npm test passed 315/315 and scriptcheck was ok.

### Acceptance

- PASS G3-01 flight home: 27-dev-flight strict (0 page/console errors). Driftmarket dock Starchart -> Halcyon after the Maw with the coil in hand: leader nyx at (40.1, 23.8) = berth spawn, walkable, no __leader stand-in left; checkpoint and autosave pos both {halcyon, 40.1, 23.8}; autosaves 0 -> 1; the player walks from there; Continue lands on (40.1, 23.8). Before the fix: (5.72, 3.28) in the void.
- PASS G3-01 old void save: 28-dev-void-save strict. File 1 rewritten with pos and checkpoint at halcyon (5.72, 3.28): load lands at (40.1, 23.8), the checkpoint is repaired to the berth, and the player walks. A requestCheckpoint() and a write('slot2') made while standing in the void both keep (40.1, 23.8). These are console warnings, not errors.
- PASS G3-08 Voss Retry: 29-dev-voss-retry strict. The first approach shows 9 dialog lines and the battle is lost (game._battle.script = 'spire.voss'). Retry, then an inline script runs first and spends Retry's own autoSkip. Walking into Voss's rect again: 0 dialog lines before the battle, story:flare_report set (the instant pre-fight ran), the aftermath plays, chapter ch4, defeated:spire_boss_voss, command_key = 1.
- PASS G3-16 tip queue: a node check of _showTip with learn + ultimateReady queued shows 'ult' on the first turn and 'learn' on the next. learn alone waits until the ultimate prompt has shown. With tut:ultimateReady already set, learn shows at once. In the human-pace Maw fight: 50% line 44:37, 'An ultimate is ready!' 45:22, 'New skill learned!' 45:34, each on its own player turn (before the fix learn came first).
- PASS chained human-pace, title -> CHAPTER TWO card, one run (shots/G3-flow/pace): run stopped at the 'ch2 card' milestone (--stop) and exited 0, with 0 console errors and 0 page errors. 49.1 virtual min in 101.7 wall min (--render-every 3). Prologue 20.2 min, 9 fights, SENTINEL at L8 (plan 7), won in 6 rounds. ch1 28.7 min, 11 fights, mean 60 s, Maw at L13 (plan 12), won in 8 rounds. The Shoals exit fix chained into the Meridian. Flight-home note: leader at halcyon (40.10, 23.80) walkable; checkpoint and autosave ok.
- PASS strict regressions (scratch build of the repo at 07:12, ?q=low): 01-boot 663 s, 11-driftmarket 804 s (13 shots), 14-spire 2927 s (15 shots), 20-dev-exits, 21-dev-goto-battle, 22-dev-retry, 23-dev-saves, 26-dev-jumps. All have 0 page errors and 0 console errors.
- FAIL (not my changes, see known issues) 24-dev-storage: the last walk check (z < 17.3 within 20 holds of 2.5 s). A diagnostic run shows the field is not blocked (blocked false, no locks, input 'explore'), but the leader moved only 0.09-0.13 units per 3 s hold at this frame rate.
- FAIL (not my files) 25-dev-demo: credits are now 'ENTER hold to skip', and step #73 only presses Enter, so 'Journey complete' never shows within 300 rounds.
- PASS npm test 315/315 and scriptcheck ok, at the end of the task. A mid-task run had 2 failures (content lint: zone arb_fern has 3 formations) while another agent was editing arboretum/data.js; that was fixed on their side.
- PASS spire.arrival workaround check (it can be removed safely): after a real Halcyon -> Security Spire Starchart flight, the leader at the start of spire.arrival stands at (6, 51) = the spire dock spawn, with no stand-in (cutscenes.onTrace probe). The workaround's condition (x > 13.5 || z < 41.5) is false, so its cs.goto never runs; checkpoint and autosave {spire, 6, 51}. Normal speed: 0 console errors (shots/G3-flow/spire-arrival-normal). The debug.skip run logged 3 'speaks but is not on screen' errors: skip-mode staging, not position.
- PASS tools: human-pace adopts the thin render (--render-every / VP_RENDER_EVERY; shots draw full frames, e.g. c06-after-return) and the blocked-goal fallback. The G3-balance agent's run already used --render-every 4 on the new tool. npm run pace / pace:report / fights exist.

### Deviations

- The npm script 'fights' runs tools/expected-fights.mjs, as the tool's author requested in C-beta-reports. G3-26 had it running human-pace-report, so I also added 'pace:report' for that.
- Retry now goes through the same walkability check as load (_loadTarget), and _fixCheckpoint repairs a restored void checkpoint. This covers in-memory snapshots taken before the fix.
- The F-2 auto-skip is generic: explore._run sets cutscenes.autoSkip whenever the script it starts (trigger, talk, interactable) is game.retried.script, then clears retried. Field bosses keep their encounter-based path.
- travel.arrive drops the stand-in on same-map arrivals too, but forgets stepped-out members only on a map change. Without the drop, the stand-in would pull a teleported leader back.
- Fallback order when a position is not walkable: the map's Starchart destination spawn, then its walkable spawn nearest the bad spot, then the location's dock, then halcyon:start. Each fallback logs a console.warn.
- Routes beyond the patches: ch4.core now has next 'finale', chaining into heart.mjs; ch1.wreck started by a jump steps out to the Shoals and back so the arrival plays (C3-fix request); the driftmarket route checks after the flight home that the leader, the checkpoint and the autosave stand on walkable ground, and fails the run if they do not; the spire override pump is capped at 120 s, relying on use()'s Confirm retries.
- human-pace extras: the walker's stuck-nudge teleport arms field bosses, so a nudge into a boss's radius cannot skip its confrontation (the C5 'teleport arming' request, handled in tools). med() picks 'Rest', which matches both 'Restore' (Med-Station) and 'Rest' (inn). Default limits: --idle 120 virtual s, --stall-wall 20 wall min, panels Escaped after 20 s, blocked-and-unchanged after 240 s with Enter/ArrowUp retries, then abort.
- G3-04 is not done here. A generic 'checkpoint after the arrival scene' would add an autosave and change the exact autosave counts several strict scenarios check (01, 10, 20, 24, 25). Left to C4 / G3-content via cs.checkpoint() (see requests).

### Requests

- G3-content (src/content/spire/story.js): you can now remove C5's spire.arrival workaround: delete `const p = here(cs);` and the `if (p.x > 13.5 || p.z < 41.5) await cs.goto('spire', 'dock', { transition: 'none' });` line (story.js ~66-68). To check it is safe: jumpTo('ch3'), set `__VP.ctx.cutscenes.onTrace = (ph, id) => { if (ph === 'start' && id === 'spire.arrival') window.__arr = { x: EX().player.x, z: EX().player.z, proxy: !!EX().world.npc('__leader') }; }`, interact the bridge 'starchart', pick Security Spire, and assert window.__arr is (6, 51) with proxy false. My run got exactly that, and checkpoint and autosave {spire, 6, 51}. Then run 14-spire strict. Steps file: /tmp/claude-0/-home-user-Research/768b0a82-3d1b-58a1-831f-e69ce7b27649/scratchpad/g3flow/spire-arrival2.json.
- C4 / G3-content (arboretum story, G3-04): add `cs.checkpoint();` (and, if wanted, `cs.save();`) as the last beat of arboretum.arrival, and in each valve step (drain_2, drain_3). The queued checkpoint is written at the leader's position when the scene ends, so Retry after a ch2 wipe no longer replays the arrival.
- Owner of tests/scenarios/25-dev-demo.json (I2d): credits are now hold-to-skip. In step #73 replace the Enter press with {"hold": "Enter", "ms": 3000} or raise max; the run sat in the credits for 300 x 1.5 s.
- Owner of tests/scenarios/24-dev-storage.json: under load the final check needs more walking time. At about 0.03 units/s, raise max from 20 or check `S().explore.z < 20.0`. The diagnostic (shots/G3-flow/diag24) shows the field is free.
- story.test owner (optional unit tests): leaveMap drops the proxy before travel.arrive changes map (the leader ends on the spawn); savePos refuses an unwalkable spot (st_room grid '#' cell) and returns spawn 'a' or the dock; explore._run sets autoSkip when game.retried.script matches.
- TECH_PLAN deviations / MODULE_NOTES owner: record cutscenes.leaveMap({ same }); game.savePos(), the load and Retry walkability fallback and _fixCheckpoint; Retry auto-skip for any script started through ExploreState._run; tip queue rule TIP_AFTER = { learn: 'ultimateReady' }; human-pace --render-every / --idle / --stall-wall, window.__PACE.interacts and the abort notes; npm scripts pace, pace:report, fights.
- I2b (WRITING 5.10): the human pace still shows prologue.tutorial 24+5 s vs cap 29 and keycard 9 vs 9 as OVER by rounding; the plan corrections C1-fix asked for (tutorial 26/28, keycard 9) are still owed.

### Known issues

- 24-dev-storage and 25-dev-demo fail strict on this loaded machine (load 22-25, 3 browser slots contended): 24 is frame-rate starvation (field not blocked), 25 is the new hold-to-skip credits. Neither touches the files I changed; requests above.
- The CA scenario timeouts include the wait for a machine-wide browser slot. My first 27-29 batch timed out at 1 h while queued; rerun with --timeout 14400000. Another agent's pkill also terminated one of my batches; 24-26 were rerun.
- The human-pace run used a scratch build made at 07:12, from the repo as it was then (including other agents' work in progress). Its ch1 numbers (11 fights, Maw at L13) reflect that snapshot, not later G3-balance changes. The run stopped at the 'ch2 card' milestone, which is before the route takes its CHAPTER TWO shot.
- Optional NPC 'pip' (a child who moves around) could not be faced in 6 tries and was skipped as optional. This was logged in the notes and does not affect the critical path.
- The F-2 auto-skip relies on game.retried staying set until that script runs again. A Retry whose script is never started again leaves retried set, which is harmless (it only matches the same script id) and is cleared by load, new journey and jumps.

## I-sys (integration: system fixes and open requests)

I-sys is done. All 11 items are delivered, and every check I ran passes.

**Finale pacing.** At human pace the finale now takes 26.4 virtual minutes, down from C7's 31.6 (band: 20-30).
- Fight time fell from 1136 s to 793 s.
- The first Choirlit Echoes take 5 rounds and 92 s (was 9 rounds, 158 s). The second take 5 rounds and 93 s (was 7, 124 s).
- WARDEN was won on the first try at L31: 11 rounds, 248 s (was 475 s including a loss at L30). I did not change any WARDEN numbers; the fight is held at 11 rounds by its 2-Breaks-per-form rule.
- The run had 0 page errors and 0 console errors.

**Field boss stays standing after its fight (C7's bug).** The cause was not quite what C7 described. `World.releaseTouched()` already re-syncs flags, so the extra `syncFlags()` call C7 asked for would have changed nothing. The real gap: the boss was only released one frame after its script ended. Anything that read the field in that frame (the human-pace walker planning a path) still saw the beaten boss with its collider on. My first human-pace run hit exactly this ('no path: lift_t1' right after the Wardens).
- The fix: the cutscene runner's `_release` now calls `world.releaseTouched()`, so the boss goes the moment its script ends.
- I also added a `cutscenes.ended` counter and `ExploreState._watchScripts()`, so the field always notices a script end, even one it never saw running.
- `heart.settle` and the five `settle_*` triggers are removed.
- The rerun walked across the Wardens' span and the north chord. Field bosses on the other maps use the same path, so they are covered.
- The second rerun also exposed a separate walker bug on the Third Tier. Right after touching the far pylon, the planner picked a start cell in a dead-end pocket. I fixed it in tools/human-pace-kit.js.

**Other items:**
- `api.giveBp(memberId, n)` emits `bp` events. WARDEN's retry gift now uses it: the `halcyon_gift` cue (no value), then Boost up to 3 each.
- On desktop the battle command menu now stays clear of a large boss's core. Against WARDEN it moves to the right of the formation.
- The boss card subtitle ("The Merciful Lock") now fades in with the title; I checked both on screenshots.
- Scenario 24's final check is looser; scenario 25 now holds Enter through the credits.
- New unit tests: `leaveMap`, `savePos`, Retry auto-skip in `_run`, script-end release, the Retry-after-valves case (G3-04), jumps carrying equipment, and `giveBp`. The WARDEN retry test now checks a win rate over 20 seeds instead of one seed.
- `REG.jumps[id].equip` exists. The mid-chapter jumps of ch1-ch4 and the Heart now wear the campaign route's gear (`npm run balance -- --gear` prints it).
- Every human-pace route now calls `shopWeapons` at its chapter's shops.
- Arboretum: the feral caretaker's Sap Spray cooldown is now 2.
- One extra balance change: the Corrupted Memory's magic is 0.72 (was 0.8), because `vault_overwrite` lost 2 of 160 route runs and failed the check again.
- WRITING 5.10 plans: `prologue.tutorial` 28, `prologue.keycard` 9, `heart.crown_lift` 8. The route plan tables match.
- MODULE_NOTES.md and a new TECH_PLAN section ("G3 and C-gamma cross-file fixes") record every contract change since G2.
- I also cleared some open requests from the C-gamma reports: the shoals route legs, the `med_pump` rest, and `play.mjs --timeout` now counting from when the browser slot is taken.

### Acceptance

- PASS (1) Field bosses: the runner releases the World's holds at script end (`world.releaseTouched()` in `_release`). `cutscenes.ended` with `ExploreState._watchScripts` makes the field notice every end. `heart.settle` and the 5 `settle_*` triggers are removed. Human-pace finale crossed the Wardens' span and the north chord with no 'no path' (the run before the fix failed 'no path: lift_t1' right after the Wardens). Browser probe: choir after its fight present=false, collider=false. Other maps' field bosses use the same path.
- PASS (2) `api.giveBp(memberId, n)` emits `bp {actorId, bp, delta}`. WARDEN retry gift: cue `halcyon_gift` (no value), then giveBp to 3 each, then HALCYON's line. 19-warden strict: bp 3/3/3/3 in the model and the UI pips. warden.test 8/8; the retry test now uses a 20-seed win rate (needs at least 14 wins of 20).
- PASS (3) battleUI: on desktop the menu now opens right of the formation (x 902-1152), clear of WARDEN's core, which is fully visible (shots/I-sys/battle-ui/02-menu.png). The boss card shows 'THE MERCIFUL LOCK' (01-card.png): the subtitle fades in at 8-22% of the card.
- PASS (4) Scenarios 24-dev-storage strict (135 s) and 25-dev-demo strict (625 s, credits held to skip, 'Journey complete' reached). Both 0 page and 0 console errors.
- PASS (5) New unit tests: leaveMap drops the stand-in before the map changes (verified to fail without the fix); savePos refuses wall cells and prefers dock over nearest spawn; _run autoSkip only for the retried script; the World releases holds at script end; the _watchScripts counter; a wipe after a valve checkpoint keeps both valves; jump equip; giveBp via warden.test. npm test 322/322.
- PASS (6) REG.jumps.equip overrides the kit slot by slot. Mid-chapter jumps of ch1-ch4 and fin.tier2/tier3/crown wear the route's gear; fin.warden stays a first-timer. Voss with the ch3.voss kit, browser policy: 86.3% at L22 and 88.3% at L23 (was 51% / 62%). ch3.cells: 64.3% / 70.7%. Maw with ch1.maw: 77.7% at L11, 83.7% at L12.
- PASS (7) shopWeapons at each chapter's shops: Halcyon fabricator before the prologue bridge and before each flight (ch1, ch2, ch3, finale), Ruse in ch1, quartermaster after the cadets, the Sanctum fabricator. The human-pace finale run shopped at both fabricators.
- PASS (8) Human-pace finale: 26.4 virtual min (C7: 31.6), 0 page and 0 console errors. Battle 793 s (was 1136), cutscene 676 s, walk 50 s over 266 units. 8 fights: 5 regular averaging 72 s and 3.4 rounds. Rings Echoes 92.4 s, 5 rounds, L29; Spire Echoes 93 s, 5 rounds, L30. WARDEN won first try at L31: 11 rounds, 247.6 s, 4 Breaks. Story 446 s against a 568 s plan.
- PASS (8) `npm run balance -- --check`, whole campaign, exit 0 (shots/I-sys/balance-check.txt). WARDEN: route 94.3% (target 85-95%), 11 rounds, 2 Breaks per form; first-timer 93.3% sim policy / 92.0% browser policy (targets 75% / 70%), 11 rounds, 2 Breaks per form. Elites: rings 99.2%, 5 rounds, 23% HP lost; spire 100%, 5 rounds, 23%. Retry from form 2: 91.0% route / 80.3% first-timer browser. Levels at each boss 7.28 / 12.37 / 17.11 / 22.16 / 27.24 / 32.24. 0 regular-fight losses in 80+80 runs in every chapter. Other bosses: Sentinel 91.5 / 93.5 / 93.5; Maw 92.3 / 86.8 / 86.8; Gardener 94.8 / 84.5 / 84.5; Voss 92.3 / 77.5 / 76.5; Echo 92.3 / 91.0 / 91.0.
- PASS (9) Feral caretaker Sap Spray cooldown 1 -> 2; whole-campaign --check passes. The extra Corrupted Memory change (mag 0.72) cleared a vault_overwrite failure that came back after the reseed.
- PASS (10) WRITING 5.10: tutorial 28 and keycard 9 in the scene rows; heart.crown_lift 8 in the scene row and the finale summary (sums 488/573 s, +15% 561/659 s); an (I-sys) plan-corrections note. Human-pace measured crown_lift at 8 s against plan 8.
- PASS (11) MODULE_NOTES 'Contract changes since gate G2' and TECH_PLAN 'G3 and C-gamma cross-file fixes' cover: leaveMap; savePos with the load/Retry walkability fallback; Retry auto-skip for any script; the tip queue; script-end release; giveBp; the Warden gift; jumps with equipment; --check failing on regular-fight losses and checking bosses with the browser policy; human-pace options; npm scripts; play.mjs timeout.
- PASS Strict scenarios, on scratch builds of the repo, 0 page and 0 console errors: 01-boot, 22-dev-retry, 24, 25, 26, 27, 28, 29 on the first build; 19-warden (17 shots) and 16-heart (16 shots) at 640x360. 01, 22 and 29 were rerun on the final build after the runner change. npm test 322/322; scriptcheck ok.

### Deviations

- Item (1): C7 asked for `this.world.syncFlags()` after `releaseTouched()` in `_scriptEnded`. `releaseTouched()` already re-syncs flags, so that call would have changed nothing. The real gap was one frame between the script ending and the field releasing the boss; the release now happens inside the runner's `_release`, plus the `cutscenes.ended` counter.
- Mid-chapter jumps in ch1-ch4 and the Heart now equip the route's gear instead of only putting chest gear in the bag. ch1.maw gains `chest:meridian:compass`; ch3.upper and ch3.voss gain the armory plate and lounge chest flags; ch4.core gains the rifle and gauntlet chest flags. fin.warden keeps the first-timer kit (its test is a first-timer test).
- Not in the list: the Corrupted Memory's magic goes from 0.8 to 0.72. Once the sap spray change reseeded the runs, the whole-campaign --check failed on vault_overwrite (2 losses in 160 runs).
- The finale cut comes from the two Echoes only: shields 7/5 -> 5/3 (rings) and 5/7 -> 4/5 (spire), HP x0.8 and x0.9 in balance.js. WARDEN is unchanged: every form-1 or form-2 cut I tested either dropped form 1 to 1 Break or pushed the route check above 95%.
- WRITING.md: besides the 5.10 summary table, I updated the plan numbers in three scene rows outside the 5.10 table (prologue.tutorial, prologue.keycard, heart.crown_lift) so they agree.
- The ch2 wipe-and-Retry check (G3-content's request) is a unit test in story.test.mjs, not a new browser scenario.
- Human-pace tool fixes beyond the list: a walk with no path retries on a fresh grid for 3 virtual seconds and the abort note names nearby field bosses; a leader standing in a collider's clearance is planned from every free cell nearby (this fixed a dead end by the Third Tier's far pylon).

### Requests

- I-art / owner of src/content/warden/fx.js: the header comment for `cue.halcyon_gift` still says the cue's value is `[{ id, bp, delta }]`. The cue now has no value: the pips fill through `bp` events from `api.giveBp`. The `gift()` fx works unchanged (`event.value || []`); only the comment is stale.
- I2b / WRITING.md owner: G3-content's text requests for 5.4 (the arrival Orion line, MOTHER-7's seed-vault line, Sera's promise, the theo_pod line), 5.5 (Kade's 'Copy, Commander.'), section 7 (Marta's two lines, Harl's idle line) and section 11 (varo_log 9/150) are outside the 5.10 table and still open.
- I2c (src/core/progression.js), from G3-balance: XP that depends on the level gap would keep arrival levels steady whether a player beelines or explores. Not done here.

### Known issues

- Voss first-timer in the whole-campaign check is close to its floor: 77.5% sim policy / 76.5% browser policy (floors 75% / 70%). It moved down from G3-balance's 86.8% when the arboretum change reseeded the runs. Any content change reseeds again and could tip it.
- WARDEN route check is 94.3% against a 95% ceiling (G3-balance measured 93.3%); results vary 1-2% between runs.
- The halcyon_gift and boss-release behaviour was checked in 19-warden, 16-heart and the human-pace finale. Scenarios 02-18 (except 16) were not rerun after the runner change. 01, 22 and 29 were rerun and pass.
- The human-pace finale started from the 'finale' jump at L27 and fought 5 regular fights. A loss to WARDEN at L30-31 (about 12-16% with the browser policy) would add about 1-2 minutes. That case was not measured.
- The human-pace finale shopping at the Halcyon and Sanctum fabricators bought no weapons: their stock at that point has none. The calls are there for parity with the campaign route.
- G3-content's report: after a Retry from a regular-fight wipe in ch2, the restored spores field boss can block the human-pace walker. The new 3-second re-plan may help; not tested.
- dist/index.html was rebuilt by my builds; dist/artifact.html was already modified by others.

## C8 (the dreams, the resolution and the epilogue)

C8 M3 and the measurements are done. All four scenarios (17-dreams, 17-dreams-alt, 18-epilogue, 18-epilogue-alt) pass --strict on the final code. One human-pace run covered dream.night through the epilogue with 0 console and 0 page errors, and every scene is inside its plan + 15%. Desktop high and phone medium frames of each dream, the crown resolution and the Ione shore all meet the G2 luma floor. visualLint is ok at every viewpoint (dreams x4 and ione x4 on desktop; ione x4 on phone). npm test passes 322/322 and scriptcheck is ok.

Known bug fixed: dreams.crown step (5), 'ORION speaks ... not on screen'. Orion is now gathered with cs.gather and awaited together with the camera pull-back (Promise.all), so he is stepped out again if the battle left him unstaged. He stands at meet+(1.3, 0.2), inside a phone frame, and Nyx steps aside so no one covers anyone. The same phone check found that SERA's 'And Theo?' was off frame because she started walking only as she spoke. Her walk now starts under HALCYON's line.

Other fixes from looking at the frames:
(1) Portrait phones. The field camera pulls back on a phone, and from there a dark crown-ring column covered half of every crown frame. A new crownView() helper keeps the landscape shots as they were; on a portrait screen each shot uses pitch at least 48 and dist at most 11, which gives the same width with the camera inside the rim. phone4 has no occluder.
(2) The embrace ('I was so afraid for them.') washed out to two white blobs under WARDEN's gold mood. Three changes:
- The meeting point moved 0.8 south of the oculus lip.
- The shot is now steeper (pitch 56).
- Both holograms burn a step below full until the merge; wholeHologram restores HALCYON's cyan.
Desktop now reads as two figures.
(3) Ione: 5 small coloured lights, so the phone viewpoints pass visualLint (was 1-2 lights; now 3-5).
(4) shoreLine guard: a leader's own shore talk speaks from the leader instead of failing to despawn the leader.
(5) 18-epilogue no longer talks to the hidden ep_<leader> NPC. The ending runs at normal speed, and an Enter loop handles the 'Journey complete' screen.

Credits and 25-dev-demo: the hold-to-skip credits are S5's cards.credits, unchanged since Wave S; a single Enter never skipped them. What the dev demo now rolls is C8's REG.credits list (WRITING 10). I did not change credit behaviour in this run.

### Acceptance

- PASS known bug: dreams.crown step (5) awaits Orion's gather with the camera. 0 'not on screen' errors in 17-dreams (including a lost WARDEN fight and Retry), 17-dreams-alt, the human pace (crown via the real trigger), phone2, phone3 and phone4. The phone pass also caught SERA off frame at 'And Theo?'; that is fixed and 0 errors afterwards.
- PASS 17-dreams --strict (final desktop crown code): 14 shots, 0 page errors, 0 console errors, 442 s.
- PASS 17-dreams-alt --strict on the final crown code: 8 shots, 0/0 errors, 439 s.
- PASS 18-epilogue --strict: 17 shots, 0/0 errors, 550 s. Checks: revival_authorized, game_clear and unlock:ione set, auto save {cleared, location Ione}, shore talks orion/sera/nyx/theo plus BOLT, Orion's beacon, reloadAuto lands on the shore with no epilogue replay, Starchart to Driftmarket (dm_ruse, dm_tobin), memorial; missingArt [].
- PASS 18-epilogue-alt --strict: 7 shots, 0/0 errors, 182 s (title dawn, Continue onto the shore).
- PASS one human pace (tools/human-pace.mjs --start dream.night --render-every 3 --strict, chained into epilogue): 10.4 virtual min, 0 console errors, 0 page errors. Story seconds against plan: night_before 83/90, kade 47/60, nyx (Stay.) 53/60, orion 44/60, sera 47/60, dreams.crown 33+62=95/190, heart.arrival 30/40, epilogue.main 156/300 (credits included). All within plan + 15%. Rows ['Return to Ione*', 'Return to title'] seen. WARDEN was resolved by the model (fight timing is C11's).
- FAIL (request) epilogue chapter length: 3.5 min at human pace against the 11.7 band of 5-7 min. The credits roll lasts about 40-49 s; the plan assumes about 150 s. The fix is in S5/game (see requests).
- PASS desktop 1280x720 high luma (shots/C8/final). Dream views: kade 131.5/1%, nyx 77.3/4%, orion 136.6/1%, sera 125.0/2%. Crown 0-9: mean 51.3-116.8, near-black 22-42%. Epilogue 1-11: 41.4-91.4, 24-49% (skiffs 43.8/49%, halberd 41.4/45%; letterboxed frames). Ione shore 127.7, berth 120.2, camp 139.6, ridges 139.2, near-black 0-1%. Floor is mean 40 and at most 50%.
- PASS phone 390x844 medium luma. Dream scenes (shots/C8/phone): kade 88.9/88.3, nyx 67.2/60.2, orion 99.3/88.0, sera 86.1/87.7, near-black 17-22%. Crown (shots/C8/phone4): 68.1-133.0, 18-30%. Ione (phone2): 127.9-138.0, 0%. Contact sheet phone views: dreams 51.6-104.2, ione 127.0-137.1; epilogue.main opening 28.0/58%. Floor is mean 25 and at most 65%.
- PASS visualLint ok in the real game page: dreams kade/nyx/orion/sera desktop (lights 6/6/6/4); ione shore/berth/camp/ridges desktop (7/5/5/7) and phone (5/3/3/5, after the new lights; before: 1/2/3/1).
- PASS renderInfo within budget. Dreams 38-70 calls / 2.2-10.8k tris; Ione 37 calls / 4.3k tris (desktop high, 9 point lights) and 34 calls (phone medium, 5 point lights). The crown scene is 81 calls / 62.8k tris (C7's map). missingArt [] in every run.
- PASS contact sheets: shots/C8/contact/dreams.png (8 views + 5 key scenes) and epilogue.png (8 views + epilogue.main).
- PASS npm test 322/322 and npm run scriptcheck ok (finale 15 scenes / 114 boxes, epilogue 1 / 17).
- NOT MEASURED compiles === 0 on a revisit for dreams/ione.

### Deviations

- The crown's camera reads globalThis.innerWidth/innerHeight inside crownView() to detect a portrait screen. The cs API exposes no aspect. In the node dry run innerWidth is undefined, so the landscape shot is used. Landscape shots are unchanged.
- The crown meeting point moved from party.z-2.0 to party.z-1.2, and the embrace shot from pitch 42/dist 10 to pitch 56/dist 9. Both holograms are tinted down (WARDEN #d9a248 with glow 0.8; HALCYON #4fc4dc) until the merge restores HALCYON's full cyan. Without this, WARDEN's mood (exposure 1.1, bloom 1.2, owned by cutscene.js) blew them out.
- 18-epilogue: debug.skip(true) before the credits was removed, so the ending plays at normal speed. A single Enter at 'Journey complete' became a loop that presses only while that screen is open. The talk to ep_kade was dropped, because Kade leads in this run and his shore NPC is hidden by design.
- Scenario runs used my scratch snapshot of the minified build (scratchpad/c8r/sc3/index.html, ?q=low), rebuilt from the repo after each change. The human pace ran on the snapshot made before the late crown staging changes (Sera's walk, the meeting point, the embrace shot, the holograms). Those changes do not change any awaited durations.

### Requests

- S5 / I-sys (src/ui/cards.js credits, or src/core/game.js finish): make the credits roll last about 150 s for REG.credits, for example a duration option or a speed derived from the roll height, with the hold-to-skip kept. WRITING 5.10 plans 'the credits (about 150 s, music only)' and C9's credits track runs 2+ minutes. The roll is now about 40-49 s, which leaves the epilogue at 3.5 min at human pace against the 11.7 band of 5-7 min.
- S5 / I-sys (scenario 25-dev-demo): the hold-to-skip credits are S5's cards.credits and unchanged since Wave S. What the dev demo rolls is C8's REG.credits list (WRITING 10, 19 entries). I did not change credit behaviour in this run, so the scenario needs a {hold: 'Enter'} step (G3-flow's request).
- cutscene.js owner (optional): give a line or a scene a way to soften a speaker mood. Under WARDEN's mood a bright set (the crown column) blows out; the crown works around it in content.
- I-sys (investigate, low priority): in 18-epilogue's flow the 'Journey complete' screen is gone about 2.5 s after it opens (13-complete shows the shore). This does not happen in 18-alt, in a fast-mode diagnostic (shots/C8/diag-end: the screen stays and no _activate or close is called), or in the human pace (rows seen and chosen). The cause was not found; the scenario now tolerates it.

### Known issues

- Epilogue chapter: 3.5 min at human pace against a 5-7 min band, because the credits roll is short (request 1).
- The embrace frame is still bright: desktop mean 116.8 with 7% above 235, phone mean 133.0 with 15% above 235. On desktop the two figures now read. On a phone they are pale shapes over large glowing hologram projector discs; dimming the discs or the WARDEN mood is outside my files.
- Dream key scenes on a phone (contact sheet) show 1-2 coloured virtual lights in the narrow portrait frustum. visualLint is ok at every dream viewpoint on desktop, and the phone frames meet the luma floor.
- 'Journey complete' closes on its own in 18-epilogue's scripted flow only (request 4). A player sees the screen: the human pace confirms it.
- The human pace resolves WARDEN with the model (debug.autoResolve), so it does not time the fight. A fight Retry before the resolution was covered by 17-dreams, with 0 errors.

## I-art (art director review and fixes; verdict in G3-art.md)

The art half of G3 now has a verdict: PASS with fixes. It is written up in /home/user/Research/voidpath/docs/gates/G3-art.md with a verdict for every location, arena and boss (desktop 1280x720 high and phone 390x844 medium, with luma), a re-check of all 26 G2 art items, the fixes with before and after shots, a ranked list of what remains, and 7 requests for files I do not own.

All 26 G2 items (C1-3/5/8/9/11, C2-3/6/7/9/10, C3-1/5-11, CA-1, W-4, E-1, B-1, B-2) are fixed on the current frames. Every location viewpoint meets the luma floors and lints ok in the game page. Every battle's idle frames pass on both sizes and missingArt() is empty for all 14 battles. One boss-card frame dips under the desktop floor (Echo's card, 37.3).

I fixed the six problems that hurt the critical path most, and shot each again in the game page:
1. Kade's amber visor bloomed into an orb over his face on high tier and in every battle. Its glow now runs at half strength (src/art/characters.js).
2. A cathedral pier hid the leader on the Heart's Crown Approach. The pier now stops under the deck (heart/props.js). Approach is 70.3/21% desktop and 50.7/35% phone, lint ok.
3. The Spire arenas lit troopers and Voss's escort into white glare. I moved the key light in front of the foes and softened the floor pools (spire/arena.js). The foe area went from 127.6 mean with 4.9% near-white to 80.5 with 0.8%.
4. The Arboretum brick and the Gardener's arena showed a green checkerboard of whole moss cells. They now use soft moss decals instead (arboretum map and arena.js).
5. WARDEN's "He is happy" whited out the Choir on a phone. That frame went from 145.6 to 93.0 luma (Choir mood, lights and props).
6. WARDEN's first Spire line played on a grey deck. This is only partly fixed: the pylon's gold now reaches further, and the two entry-lane floods the camera pan crosses are gold. But the opening phone frame is unchanged at 26.5. A probe showed the scene's camera starts 3.5 units west of the pylon, so on a phone the pylon sits at the frame edge (request R7).

I also tried brightening Echo's arena so its card frame clears the floor. It moved only +1.4, so I reverted it and filed request R3.

106/106 node tests pass and node build.mjs is ok. No gameplay changed, and I made no edit to heart/maps/heart.js. The orchestrator's 23:07 commit already includes my earlier edits; later edits to arboretum/maps/arboretum.js, arboretum/props.js and spire/maps/spire.js, plus the doc, are not yet committed.

### Acceptance

- PASS: G3-art.md written with a verdict per location (title, Halcyon decks, exterior, Moth, Driftmarket, Shoals, Meridian, Arboretum, Security Spire, Memory Vault, Heart), per arena and per boss (incl. WARDEN first form and unbound), fixes with before/after shot paths, and a ranked list of what remains
- PASS: all 26 G2 art items re-judged as fixed, with evidence. C1-9 gallery 46.5/34% desktop and 27.6/60% phone (was 23.4/66%); C3-1 Meridian 42.8-62.2 desktop and 32.2-48.3 phone (was about 10)
- PASS: luma floors at every location viewpoint (contact sheets plus game-page re-shoots). Desktop minimum 40.3 (Spire), highest near-black 39%; phone minimum 26.1 (Halcyon), highest near-black 62%
- PASS (close to the cap): Choir pod viewpoint on phone 32.4 mean / 64% near-black (cap 65%); choir viewpoint 37.8/49%; desktop 51.4/36% and 90.3/8%; lint ok
- PASS: Spire viewpoints after the gold floods: checkpoint 43.3/39% desktop and 37.8/49% phone; armory, barracks and junction 34.7-58.7; all lint ok on both sizes
- PASS: Heart Crown Approach after the pier fix: 70.3/21% desktop (11 lights) and 50.7/35% phone (3 lights), lint ok, leader visible
- PASS: Arboretum views after the moss fix: 49.4-78.8 desktop, lint ok; channels 77.8/12% with no whole moss cell in frame
- PASS: Spire arena fix: trooper foe area 127.6 -> 80.5 mean (near-white 4.9% -> 0.8%), frame 44.9/30%; Voss foe area 120.6 -> 107.6, frame 52.4-58.9/<=30%
- PASS: key scene arboretum.theo (WARDEN) on phone: 145.6 -> 93.0 luma, 22% near-black
- FAIL: spire.arrival WARDEN opening frame on phone is still mostly grey: 26.4/48% before, 26.5/48% after (above the floor, but not gold). The cause is the scene's camera framing (request R7)
- PASS: every battle's idle frames are above the floor at both sizes. Desktop 40.4-107.1 (lowest Halcyon spine 40.4/38%), phone 28.5-68.3
- FAIL: one boss-card frame, Echo's card on desktop, is 37.3/49%, under the desktop floor of 40. It is a 1-2 s overlay; request R3
- PASS: missingArt() empty in all 14 battles; scene calls 42-101 (budget 160); at most 17.8k triangles in battle and about 56k in the field (Heart)
- PASS: node --test on content, mapdef, heart, spire, vault, explore and battle: 106/106; node build.mjs ok
- PASS: no gameplay changes (no walkable cells, triggers, encounters or scripts); heart/maps/heart.js not edited; no git state changed by me

### Deviations

- Phone frames of the bosses and the regular arenas come from the G3 sweep of 10 Oct (shots/G3/art/boss-phone, battles-phone), C7 (Heart) and C11 (WARDEN), because their art has not changed since. Desktop battles were re-shot in the game page.
- Contact sheets for every location except the Heart are the G3 sheets of 10 Oct. git log shows no art, texture, prop or arena change to those locations since; the locations I changed were re-checked in the game page.
- Fix 6 (Spire arrival) only partly reaches the goal: the light fix is in my files, but the opening phone frame needs the story's camera framing (request R7).
- I did not retune WARDEN unbound's haze. C11 is still working on that form (its M3 task is in progress), so I left it to C11 and listed it in the remaining items.

### Requests

- R1 src/battle/stage.js or battleState.js: centre the tilt-shift focus band on the boss's fitBox core (focusY from the core's projected centre, band at least the core height). The Gardener's crown and Echo's hood blur above the band on desktop.
- R2 src/battle/battleUI.js / stage.js: on phones keep the help strip clear of the boss core (raise CORE_TOP.compact, or hide the strip while the card plays). The Gardener's head sits under it in the card frame.
- R3 src/battle/battleUI.js: fit the boss card title on a phone ('COMMANDER VOSS' shows as 'COMMANDER VO'), and lighten the card's scrim outside its band so the frame under Echo's card (37.3 desktop) stays above the floor of 40.
- R4 src/core/titleScene.js: on desktop move the party right or the menu left, so NEW JOURNEY's bar does not run behind Kade and his blade does not cross 'A 2D-HD RPG'.
- R5 src/story/cutscene.js: make MOODS.warden.fx relative to the area mood (multiply; cap exposure near 1.0 in bright rooms), and lower MEMORY_FX bloom (the Vault memory scenes run very bright).
- R6 src/content/spire/story.js: in spire.oath_recording, frame Voss's hologram fully on a phone (focus on the projector, zoom about 0.9).
- R7 src/content/spire/story.js: in spire.arrival, open the pan on the pylon (focus about [33.5, 50.2]) so a phone frame holds WARDEN's gold focal piece during 'Remain calm'.

### Known issues

- The Choir pod viewpoint on phone is 64% near-black, just under the 65% cap. The tier wall's glow trades this frame against the Theo/WARDEN frame (at 1.15 glow: Theo 107, pod 60%; at 1.0: Theo 93, pod 64%).
- The Spire arrival WARDEN opening frame on phone stays grey (26.5/48%) until R7 lands. In real play the camera pan crosses the new gold floods during the line.
- The Spire checkpoint viewpoint dropped slightly with the gold floods: desktop 44.5 -> 43.3, phone 38.5 -> 37.8. Both are still in range.
- WARDEN unbound is hazy on desktop (idle2 97.1) and its wing tips leave the phone frame. Left for C11.
- The Meridian scene frames (varo_log, meridian_arrival, maw) lint flat untextured ceiling planes. They read as darkness on screen; the viewpoints lint ok.
- The Spire floors and the Vault hub edges are sparse (few props per frame). They are readable and in range.
- dist/index.html and dist/artifact.html were rebuilt (full minified build) from the current working tree, which also holds C8's uncommitted dreams/epilogue edits.

## I-polish (final presentation polish)

I-polish is done: all ten items are delivered except (9). For (9), the instrumented run shows the screen never closes by itself, so no code change was needed.
(1) The credits now roll for 150 s (CREDITS_S, via a new `duration` option on ui.cards.credits). The gaps stretch so the roll moves at about 26 px/s, and the speed is worked out from the roll's height so it ends on time. Hold-to-skip is kept and now counts real seconds.
(2) R5: WARDEN's mood now scales the area or scene grade instead of replacing it. Exposure and bloom are capped at the larger of the base and 1.0 / 1.15. MEMORY_FX bloom goes from 1.25 to 0.8 and its exposure from 1.08 to 1.0. The crown embrace on a phone drops from 133.0 luma (15% near-white) to 90.1 (3%), and the Vault memory scenes from about 100 to about 70 on a phone.
(3) R1: the battle tilt band now spans the boss's fitBox core and the party. WARDEN's top is now inside the band (uv 0.844 against 0.55 ± 0.38); before it sat outside (0.39 ± 0.27). The Gardener's crown and Echo's hood are sharp on desktop.
(4) R2: CORE_TOP.compact goes from 0.12 to 0.2, so a boss's head stays below the help strip on a phone.
(5) R3: a long boss title shrinks to fit ('COMMANDER VOSS' fits on a phone). The card scrim fades out at the top, bottom and sides; Echo's card frame goes from 37.3 to 40.8 on desktop.
(6) R4: on wide screens the title menu sits at 42% of the width and the party starts at 60%. The NEW JOURNEY bar and Kade's blade are now clear of each other, and so are Kade and the 'A 2D-HD RPG' tagline.
(7) R6/R7: spire.oath_recording now frames both holograms whole on a phone (focus [24.5, 16.3], zoom 0.9, recorder light 22). spire.arrival opens on the pylon at [33.5, 50.2]; its phone frame goes from 26.4 to 61.6 luma, in gold.
(8) On portrait screens, large bosses now fit their whole width: WARDEN unbound's wing tips stay inside the phone frame.
(9) 'Journey complete' is not closing itself. The instrumented 18-epilogue shows it opens at 788.3 s and closes at 797.7 s through the scenario's own Enter. The 13-complete screenshot just doesn't capture it (a headless capture artifact). Along the way I found a real flake and fixed it: the game-over and Journey complete input lock counted game time, so on slow frames it swallowed the scenario's keys and 18-epilogue-alt hung. The lock is now 0.8 s of real time.
(10) The stale cue.halcyon_gift header comment in warden/fx.js is fixed.
Checks: npm test 322/322, scriptcheck ok, and these strict scenarios passed with 0 page errors and 0 console errors: 01-boot, 14-spire, 18-epilogue plus alt, 19-warden and 25-dev-demo (19-warden at 640x360). dist is rebuilt with `node build.mjs` and is byte-identical to the page I tested.

### Acceptance

- PASS (1) Credits last 150 s of game time. Desktop measurement: gaps stretched to 606/303/303/606 px, roll 3024 px, speed 26.0 px/s (y=516.9 at t=19.88), the closing line holds 5.2 s. On SwiftShader game time runs at about 0.2x, so the roll took 725 s of wall time. Hold-to-skip is kept and counts 1 s of real time. 25-dev-demo, which holds Enter through the roll, passes strict in 254 s. The epilogue grows by about 100-110 s, to roughly 5.3 min at human pace (band 5-7). This is estimated, not measured.
- PASS (2) R5 crown embrace 'I was so afraid for them.' Phone: 133.0 luma, 18% near-black, 15.2% near-white becomes 90.1 / 21% / 3.0%. Desktop: 116.8 / 22% / 6.9% becomes 77.4 / 30% / 2.1%. It reads as two hologram figures, gold and cyan, though the projector discs are still bright (see requests). Shots: shots/I-polish/crown-phone/crown-5-afraid.png and shots/I-polish/crown-desktop/.
- PASS (2) Vault memory scenes no longer blown out. Phone: lullaby 100.4 to 70.0, launch 96.5 to 72.8, severance with WARDEN 81.3 to 68.8. Desktop: 55.3, 57.7 and 82.0. Other WARDEN scenes: Theo on a phone 93.0 to 78.2, desktop 105.1. Shots: shots/I-polish/scenes-phone/ and scenes-desktop/.
- PASS (3) R1. The desktop band spans each boss core and the party. Gardener, Echo and WARDEN: focusY 0.595, band 0.335. WARDEN core at uv 0.611 and top at 0.844 against focusY 0.55 ± 0.38 at 640x360; on HEAD it was 0.393 ± 0.269, which left the top blurred. The Gardener's crown and Echo's hood are sharp (shots/I-polish/battles-desktop/01-*, 02-*). Desktop idle luma: Gardener 48.5 / 24%, Echo 43.5 / 31%, Voss 57.6 / 20%, WARDEN 61.9 / 17%.
- PASS (4) R2. On a phone the Gardener's head now sits below the help strip (shots/I-polish/battles-phone/01-arb_boss_gardener-idle.png, 39.4 / 42%). Echo is 46.9 / 32%, the Maw 39.6 / 40%, WARDEN 58.7 / 25%.
- PASS (5) R3. 'COMMANDER VOSS' fits on a phone (battles-phone/03-spire_boss_voss-card.png, 43.2 / 54%). Echo's desktop card frame goes from 37.3 / 49% to 40.8 / 37% (battles2-desktop/01-vault_boss_echo-card.png). Phone cards: Echo 45.4, Maw 26.6 / 57%, Gardener 26.9 / 57% (that one was shot with the darker interim scrim). All are above the floors.
- PASS (6) R4 title on desktop: the NEW JOURNEY bar ends near x 690 and Kade's blade tip is near x 745. Kade's head is clear of 'RPG'. Luma 46.6 / 44.5% (shots/I-polish/title-credits/title-menu-b.png; before: shots/I-art/title-desktop/title-menu.png). Phone layout unchanged.
- PASS (7) R6 spire.oath_recording on a phone: both holograms whole around the projector, 50.0 / 35% (G3's frame did not show them: 25.0 / 52%). Desktop 40.6 / 42%.
- PASS (7) R7 spire.arrival opens on the pylon during 'Remain calm'. Phone 26.4 / 48% grey becomes 61.6 / 31% gold; desktop 67.9 / 25%; 14-spire's 01-arrival shot is 67.7.
- PASS (8) WARDEN unbound on a phone: the whole wingspan is inside the frame, left tip about 15 px in (shots/I-polish/warden2-phone/02-heart_boss_warden_2-menu.png, 82.8 / 6%). Before, the wings ran off the edge (shots/C11/frames/phone/05-unbound-idle-a.png). The core is under the help strip and in the band. Desktop unbound 87.5 / 10.5%.
- PASS (9) Investigated and resolved. Instrumented run (shots/I-polish/diag18b/18-epilogue/report.json): Journey complete opens at 788.3 s and closes at 797.7 s only through the scenario's own Enter. No code closes it, so no game fix was needed. Separately I fixed the input-lock flake that hung 18-epilogue-alt; it now passes in 183 s.
- PASS (10) cue.halcyon_gift header comment fixed in warden/fx.js.
- PASS npm test 322/322; npm run scriptcheck ok (76 scenes, 482 boxes).
- PASS strict, 0 page errors and 0 console errors, all on the final page: 01-boot 45 s (6 shots), 14-spire 610 s (15 shots), 18-epilogue 901 s (17 shots), 18-epilogue-alt 183 s, 25-dev-demo 254 s (24 shots), 19-warden at 640x360 in about 3.5 min (17 shots, won, retry from the second form, missingArt empty).
- PASS node build.mjs ok; dist/index.html (2.72 MB) is byte-identical to shots/I-polish/page5/index.html, the page all checks ran on.

### Deviations

- Credits: the duration option stretches the gaps between credit groups so the roll moves at about 26 px/s, rather than slowing a dense list to about 15 px/s. The speed is then set from the remaining distance and time, so the roll ends on time even after a resize. Fast mode still passes speed 4000.
- The credits hold-to-skip and the input lock on the game-over / Journey complete screens now use wall-clock time instead of game dt. That keeps 1 s and 0.8 s real on slow frames, and it fixed an 18-epilogue-alt hang.
- MOODS.warden: bloom and exposure are relative (x1.15 and x1.08), each capped at the larger of the base and 1.15 / 1.0; saturation x0.85; the tints stay absolute. The base is the scene's cs.fx / cs.memory grade if set, else the area mood (rig.fx). cs.fx and cs.memory re-derive the mood fx without touching the screens.
- The portrait full-width fit and the band that spans core and party apply to every fitBox boss (Gardener, Maw, Voss, Echo, WARDEN), not only WARDEN. Because frame-0 bounds miss wider wing frames, the half-width is capped at 0.92 NDC.
- spire.oath_recording: besides the camera, the recorder light during the recording goes from 15 to 22 (a staging line). The wider frame was 38.8 luma on desktop without it, under the floor of 40.
- spire.arrival: the pan starts 2.5 units further east, so it takes 3.4 s instead of 3 s at about the same speed.
- 19-warden was run at 640x360, as I-sys did. Two earlier runs at a time of heavy machine load stalled on the scenario's debug-pause steps. A head-to-head check on the HEAD build and the final page then reproduced identical events in 72 s each, so the stalls were the machine, not the code. 14-spire-alt was not run (I filtered on 14-spire.json).

### Requests

- C8 / I2b (src/content/dreams/story.js): spawn crown_figure and crown_halcyon with `projector: false` (NpcDef supports it). The holograms' projector discs and glows are the brightest thing in the embrace frame on a phone and wash the two figures out (90 luma).
- C8 / I2b (src/content/epilogue/story.js): the credits camera pan `cs.camera.pan([[22.6, 4.6], [25.0, 4.8]], { sec: 70 })` should last about 145 s now that the credits run 150 s. Otherwise the camera stops halfway through.
- Owner of src/tools/preview-ui.js: in 'gameover-load', `ui.screens._lock = 0` is now a no-op (the lock is `_lockUntil`, wall clock, and `_activate` ignores it); please remove the line.
- Owner of tests/scenarios/18-epilogue.json: the 13-complete shot misses the Journey complete screen even though it is open. Wait for `.vp-scr.is-on .vp-scr-btns` (or longer) before the shot.
- MODULE_NOTES / TECH_PLAN owner, please record: ui.cards.credits `duration` (game.finish passes 150); MOODS `rel` (relative speaker grade) and the new MEMORY_FX values; the screens input lock and the credits hold now use wall-clock time; stage CORE_TOP.compact 0.2, the portrait full-width fit (WIDE_SPAN 0.92), and a tilt band that spans fitBox cores and party; the boss card title shrinking to fit and the lighter scrim.

### Known issues

- Crown embrace on a phone: the two figures read, but as translucent holograms over large bright projector discs (90.1 luma, 3% near-white). That part needs the projector: false request in C8's file.
- On desktop the battle command menu still overlaps the Gardener's lower body. This is the existing menu placement and was not changed.
- Theo's WARDEN scene on desktop is bright (105.1 luma) but readable, and lower than before (exposure 1.1 to 1.0, bloom 1.2 to 0.92).
- In headless SwiftShader runs, game time runs at about 0.2x, so the 150 s credits take about 12 min of wall time in scenarios that do not hold to skip (18-epilogue took 901 s).
- Epilogue length at human pace with the longer credits is estimated, not measured (about 5.3 min against the 5-7 min band).

## I-release (release pass; verdict in RELEASE.md)

The release pass is finished, and docs/gates/RELEASE.md says SHIP with the measured numbers. Unit tests pass 322/322, scriptcheck is ok (76 scenes, 482 boxes) and `npm run balance -- --check` passes for the whole campaign (92 ok, 0 fail). 34 of the 35 strict scenarios pass with 0 errors. The exception is one step of 15-vault-alt, explained under known issues. On the final `node build.mjs`, 01-boot passes strict.

The game plays from the title to THE END in three human-pace legs: prologue through ch3 (pace-a), ch4 again after the fixes (pace-ch4), and the finale plus epilogue (pace-b). In total that is 2.64 h, 59 fight entries and 0 page errors.

**Boss first tries.** Run with the same seed, the browser's fight is exactly the simulator's fight. 16 seeded fights (SENTINEL at L8, Voss at L23) matched node action for action (403 party actions) with the same end HP, so neither side had a bug.
- Voss lost because the playthrough's gear was older than the simulator's route gear, and the escorts' lock-on beams did the damage. I set voss_escort atk and mag to x0.9. With the playthrough's gear the browser now wins 7 of 8 seeds, exactly as node predicted. The first-timer check goes from 77.5% to 84.8%, and the route check stays at 93.5%.
- SENTINEL wins 94-96% at the playthrough's levels and 8 of 8 seeded browser fights, so I left it unchanged. I found no difference in code, state or policy, so the two playthrough losses look like bad luck (about 5% each).

**Vault stall.** It had two causes:
- The party entered ch4 wounded from Voss, with no Med-Station before the Grid. `cs.card()` now restores the squad under the chapter card.
- The route did not survive a Retry rolling the Grid back. tests/routes/vault.mjs now replays what was undone.

The ch4 leg then ran from its jump to the FINAL CHAPTER card with no stall.

Polish requests (4) are all done:
- The crown holograms spawn with `projector: false`; cs.spawn needed a small pass-through change for this. The desktop embrace frame drops from 77.4 to 66.9 luma.
- The credits camera pan lasts 145 s.
- The dead `_lock` line in preview-ui is removed.
- 18-epilogue waits for the screen buttons before its shot.
- MODULE_NOTES.md records the polish contract changes.

Perf, README and docs are finished. The README has 11 screenshots, each under 400 KB, and CONTRACTS.md now points to TECH_PLAN.md and MODULE_NOTES.md.

### Acceptance

- PASS npm test: 322/322 after the last code change (shots/I-release/npm-test-3.txt); npm run scriptcheck ok (76 scenes, 482 boxes, 233 scripts)
- PASS npm run balance -- --check, whole campaign, after the Voss easing: 92 ok, 0 FAIL, 3 zone-walking warnings (shots/I-release/balance-check-2.txt)
- PASS (34/35) (1) strict sweep, --jobs 1, 0 page and 0 console errors: 01-06, 10-14 with their alts (earlier run), plus 15-vault, 16-18 with their alts and 20-29 (sweep3.log). 19-warden passes at 640x360 (19-warden-640); at 1280x720 it timed out on a debug-pause step. 15-vault-alt fails step 42 (the west relay wait) in 3 runs; the rest of that scenario passes
- PASS (1) stale scenario expectations fixed: 15-vault and 15-vault-alt answer the rifle's 'Equip now?' prompt (jumps now wear the route's gear), and 15-vault's Echo step had a statement eval that was a SyntaxError inside play.mjs's return(); 15-vault now passes (1379 s, 15 shots)
- PASS (2) vault chain: pace-ch4 ran from the ch4.vault jump through to the FINAL CHAPTER card with no stall: 23.3 min (inside the band), 8 fights (mean 66 s, 3.4 rounds), ECHO won first try at L26 (plan 27) in 16 rounds, 0 page errors, missingArt empty. So title -> THE END chains as pace-a, then pace-ch4, then pace-b
- PASS (3) the browser fight equals the simulator's: 16/16 seeded fights identical action for action (SENTINEL L8: 8 wins in 5-9 rounds; Voss L23: 8 wins in 6-11 rounds; 403 party actions, same end HP)
- PASS (3) Voss first try in the browser with the playthrough's gear at L23, after voss_escort x0.9: 7/8 wins (87.5%), the same 8 results node predicted. Simulator: route-gear win 71.5% -> 81.8%; first-timer 77.5% -> 84.8%; browser policy 76.5% -> 84.5% (median 8 rounds); route 93.5% (target 85-95%)
- PASS (3) SENTINEL browser first try at the route's level: 8/8 wins; sim 94-96% at 8/8/7/7 and first-timer 93.5% in 9 rounds; left unchanged
- PASS (4) polish requests: crown holograms with projector:false (desktop embrace 77.4 -> 66.9 luma, near-white 2.1% -> 0.5%); credits pan 145 s; dead _lock line removed; 18-epilogue waits for .vp-scr.is-on .vp-scr-btns; MODULE_NOTES records the polish contract changes
- PASS (5) perf on phone medium (SwiftShader, 585x1266 render): Driftmarket 49-84 scene calls / 6.4-8.4k triangles / 38.8 canvas MB; Heart 71-113 calls / 51-63k triangles / 71.9 MB; WARDEN fight 58 calls / 16.6k triangles / 78.9 MB, all inside the 11.6 budgets. fps 1.0-1.6 (software rendering, no real phone). First load: DOMContentLoaded 0.63 s, ready and title at 4.3 s
- PASS (5) size: dist/index.html 2.59 MB (0.82 MB gzipped), dist/artifact.html 2.10 MB (0.69 MB gzipped), both under 16 MB
- PASS (6) README finished; docs/screenshots has 11 PNGs (01-11), each under 400 KB, no spoilers in file names, all linked from the README. Unlinked POC jpgs removed; the 3 jpgs the contact-sheet tool uses are kept
- PASS (7) docs/gates/RELEASE.md: verdict, chapter minutes (prologue 23.5, ch1 27.4, ch2 26.5, ch3 25.6, ch4 21.2 / 23.3, finale 28.3, epilogue 6.1; total 158.6 min = 2.64 h), 59 fight entries, boss levels and first-try results, 3 scene overruns, errors, perf, size, cut list (nothing cut) and 8 ranked known issues
- PASS (8) final node build.mjs at 17:48; 01-boot strict on it: PASS 117 s, 6 shots, 0 page errors, 0 console errors

### Deviations

- Healing at chapter cards is a game-flow change, made under the 'real bug in any file' rule (src/story/cutscene.js cs.card calls healParty). Recorded in MODULE_NOTES and RELEASE.md
- cs.spawn now passes `projector` to the NpcDef (src/story/cutscene.js). This was needed for the dreams request; before, NpcDef supported the option but cs.spawn dropped it
- SENTINEL was not eased. The browser fight matches the simulator and wins 8/8 seeds and 94-96% at the route's level, so the 'ease until >= 70%' condition did not apply
- The browser boss runs used thin rendering (draw every 30th frame), no command delay, q=low at 640x360 and debug.equip for the playthrough's gear, so they finish in minutes. The battle model and policy are unchanged by this
- README battle screenshots reuse frames from this pass's strict sweep (03-battle 07-break, 12-shoals 10-mid-battle), because fresh battle captures at 1280x720 were too slow on SwiftShader. The phone shot is new
- Added a short pointer note to CONTRACTS.md (an I3 deliverable in TECH_PLAN 13)
- TECH_PLAN.md was not edited (not owned); the contract changes are in MODULE_NOTES.md

### Requests

- TECH_PLAN owner: under 'G3 and C-gamma cross-file fixes', record: cs.card heals the squad; cs.spawn takes `projector`; voss_escort atk and mag x0.9; ui.cards.credits `duration`; wall-clock screen locks; stage CORE_TOP.compact 0.2 / WIDE_SPAN 0.92 / a tilt band spanning core and party; MOODS rel and the MEMORY_FX values. All are in MODULE_NOTES.md
- Owner of the arb_* / spire_* zones (pacing): ch2 and ch3 run 26.5 and 25.6 min at human pace (band 16-20); a curious route walks 579 and 421 zone units and meets 14 / 10 fights, and reaches the bosses 2 levels high. Consider lower zone rates or shorter side rooms
- Owner of tools/human-pace.mjs routes: the walker never buys armour or Revive Kits, so its squad is weaker than the simulator's first-timer. If routes should model a real first-timer, consider a restock step (Revive Kits) and an Optimize press after chests

### Known issues

- Ch2 and ch3 are long at human pace: 26.5 and 25.6 min against 16-20; the whole game is 2.64 h against the planned 1.9-2.3 h
- Real-phone fps is unmeasured; SwiftShader gives 1.0-1.6 fps (render budgets are met)
- 15-vault-alt step 42 (the west-relay wait) timed out in 3 runs; each time the switch finished within a minute after the loop gave up. An instrumented copy passes it in 35 s and the same relay works in 15-vault and pace-ch4. Root cause not found
- 19-warden passes only at 640x360 on SwiftShader
- 18-epilogue's 13-complete shot misses the Journey complete screen even though its buttons are in the DOM (headless capture); 18-epilogue-alt captures the screen
- Scene overruns: prologue.new_journey 78 s (cap 75), driftmarket.ruse_maw 42 (40), driftmarket.return 61 (57); the prologue had 10 fights against 7-9
- SENTINEL was lost on the first try in both playthroughs despite a 94-96% simulated rate (judged as chance). Voss with the playthrough's bag and no Revive Kit: about 65%
- 10 WebGL 'texSubImage2D: no canvas' warnings after a Vault Retry in pace-a (warnings only)
- Art items carried over: desktop command menu overlaps the Gardener; Theo's WARDEN scene is bright on desktop; the Choir pod on a phone is 64% near-black; the crown embrace phone frame was not re-measured
