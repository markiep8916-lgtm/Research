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
