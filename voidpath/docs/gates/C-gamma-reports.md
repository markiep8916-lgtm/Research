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
