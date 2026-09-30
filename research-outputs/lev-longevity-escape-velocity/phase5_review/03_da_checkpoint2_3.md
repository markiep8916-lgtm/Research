# Devil's-Advocate Review of the Report (Checkpoints 2 and 3, Round 4)

| Field | Value |
|---|---|
| Reviewer | Fresh-context subagent of the same model family, role `devils_advocate_agent` (`deep-research/agents/devils_advocate_agent.md`), resumed from the scoping-review rounds so it holds the frozen plan; no web access; worked from the files and in scratch copies of the code |
| Reviewed | `../LEV_research_report.md`, draft v1 (commit `fc40bde`), the analysis outputs, and the model |
| Verdict | **REVISE** (no Critical issues; three Major issues, none needing new searches) |
| Dispositions | See the tables in the last two sections of this file (draft v1 points, then the verification of draft v2) |
| Verification | Round 5 on draft v2 by the same reviewer: **PASS**; no Critical or Major issue; six Minor edits, applied in draft v3 |

The review text below is subagent output, reproduced verbatim. Its statements are the reviewer's, not verified findings. Where it reports its own calculations, the dispositions say whether the author reproduced them in the committed model.

## Devil's Advocate Report — Checkpoints 2 and 3 (Round 4)

### Verdict: REVISE
No Critical issues. The outcome partition and classifier are applied faithfully, D-N/D-1/D-H are used correctly ("escape is not survival" is kept), and the 8.3% threshold has the right scope (ages 50–90, 20-year window; both are plan parameters, not properties of LEV). In scratch copies (nothing written to the repository) I reproduced T1 exactly, T4 cells (12, 15, 2, 20), T6 S-E/S-F and §6's race-table values, and hand-checked T2/T3; 24 tests pass. Strengths: limits stated plainly, deviations logged, RC1 and RC2 labelled existence classes, no "thousand-year" figures, band withheld as the plan permits. Three Major issues need fixing; none needs new searches.

### Critical Issues
No critical issues identified.

### Major Issues

1. **M1. The ACH breaches the frozen plan**
   - **Type**: Method
   - **Location**: §5.5 and Reading; §1 "When?"
   - **Problem**: Plan §9 says "an expectation not yet due is N". §5.5 rates O3 "I" for two 2030 expectations not due until 2030, yet rates O3's large-mammal replication (same status) N. One I rests on V1 pointers (W5-14, W5-18: "pointer only"). Applied as written, all four outcomes score 0. The required share of rated weight is missing, and O2 shows three expectations, not four. The result also turns on an unstated boundary: empagliflozin (all-cause HR 0.68) and semaglutide (0.81) are classed cardiometabolic, yet canagliflozin is ITP-positive and W4 treats GLP-1/SGLT2 drugs as ageing-pathway candidates. If they count, O1(1) and O2(3) are already violated (weight 3 each), O3 gains a C, and the ordering reverses. "No support before the mid-2030s" then rests on the analyst's chain (S3/T6), not on the ACH.
   - **Recommendation**: Re-rate N until due; report zero scores with coverage and share; move the lead-time argument to text as [AUTHOR-JUDGMENT]; drop V1 items from scoring; add a classification-sensitivity row.

2. **M2. The animal-to-human conversion is not the plan's upper bound, and it drives the cadence framing**
   - **Type**: Evidence / bias
   - **Location**: §4.2–4.3; T3 mouse row
   - **Problem**: Plan §7 calls for an upper-bound thought experiment. The report converts the one listed animal hazard ratio (0.65) to about 5 age-years. Reading the ITP effects as proportional lifespan gains (+23–34% of about 80 years) gives about 18–27 age-years (implied human hazard ratio 0.09–0.20; my arithmetic), so such an effect needs renewing every 18–27 years, not "every 3–4 years" (a SPRINT-sized cadence). §4.3's Reading then calls animal effects "modest at the maximum".
   - **Recommendation**: Show both readings in T3 and §4.3, label the lifespan-proportional one as the upper bound, restate the cadence for each, and keep the caveats (male-only effects, smaller gain at the 90th percentile).

3. **M3. The headline threshold is criterion-specific, and the Debonneuil gap has an untested simple reconciliation**
   - **Type**: Definitions / equivocation
   - **Location**: §1, §3, §8
   - **Problem**: "8%", "4–9×" and "a tenth to a quarter" are period D-N. "The popular version is stricter" holds only on period tables. On a cohort reading (each cohort, at the same age, expects at least one more year, counting its own future improvement) my scratch calculation with the plan's parameters needs about 4.5% at ages 30–40, 4.8% at 50, 5.4% at 65 and 7.0% at 80: the actuarial "4%" without frailty, and a gap of about 2–5×, not 4–9×. The report offers only the age-100 strong-frailty cell (3.7%), calls the matter speculative, then calls LEV "precisely definable". Its paraphrase adds "a year" and "within a few years", which W1-02 and W8-08 do not contain (W1-02: "per year at all ages" is not stated).
   - **Recommendation**: Add a cohort-D-1 threshold to the model, print its range beside the 8% in §1 and §3, rewrite the discrepancy paragraph, drop "precisely definable", correct the paraphrase.

### Minor Issues
- **Frailty (§3, T1b):** "D-N unchanged" is built into the synthetic-cohort convention (the code docstring says so), not a finding; the falling D-H population threshold is a composition effect and does not lower the individual requirement. Selection also dampens observed declines by 1/(1+σ²H) (verified: 0.86–0.75 at 80, 0.71–0.56 at 90 for σ² 0.2–0.4), so the observed-versus-required gap is overstated at 90 by about 1.4–1.8×. State it.
- **Race table (§6):** assumes a permanent freeze, no unimproved share and full access, against §4.4 (escape of 12–20 years at 2–5% unimproved). §3's "27 years at 80" includes 20 years of prior 1.5% improvement (20 years at today's mortality). Add a finite-escape variant and "assumes access".
- **Camp balance (§5.1):** the forecast table lacks the plan's stake column; advocate items are tagged company-authored or foundation-reported, but sceptic stakes go unnamed (Olshansky co-founded Lapetus Solutions and authored the Longevity Dividend, W6-05); Barzilai is called "cautious" though W6 says not classified, nothing retrieved; "mostly from single groups" ignores the multi-site ITP; there is no steel-man of the advocate case (large rejuvenation steps, AI-accelerated discovery, platform therapies).
- **Calibration:** "no support before the mid-2030s" is absence in a search-capped review, with the cutoff set by the analyst's chain; "nothing reviewed contradicts not this century" is near-tautological, and equally nothing contradicts LEV by 2060 or 2100 (say so). The 2030 indicators lack resolution criteria, and v_hi = 2.6% is a judgment that decade-by-sex tables could move.
- **Nits:** SPRINT's headline uses the early-stopped HR 0.73 (W2-03: 0.83 over the trial period, 2.1 age-years); T3 puts life-years in the age-years column; T2's coronary-women row cites W8-14 (should be W8-15); "3.4–3.6%" (log) versus T2's 3.3–3.5%; §4.4 (12 years) versus §5.4 (13; ramps of 20 versus 19 years); RC6 is not labelled an existence class; "passed three rounds" was REVISE, REVISE, PASS.
- Earlier warnings now breached: N-until-due, V1 never a finding, share of rated weight, forecaster stake column, RC6 label, access in individual results.

### Strongest Counter-Argument
"The gap is manufactured by framing: (i) the period criterion, which needs about twice the cohort criterion's pace and is the one the actuarial 4% contradicts; (ii) a translation unit that shrinks the only interventions capable of delivering LEV from 18–27 age-years to 5; (iii) an evidence-weighing step that breaks its own rule to penalise only the earliest outcome. On a search-capped base at V2 at best, 'no support before the mid-2030s' is a verdict, not a finding." A hostile demographer adds: the frailty result is convention, observed declines are old, all-age or crude, and selection hides individual progress. A hostile forecaster adds: no probabilities, no resolvable indicators, reference classes without denominators.

### What's Missing
Cohort D-1 and the Debonneuil test; the upper-bound animal conversion; ACH classification sensitivity; decade-by-sex tables (disclosed); a stake column and a steel-manned advocate case; access and finite escape in §6; resolution criteria for the indicators.

### Stress Test Results
| Test | Result |
|---|---|
| Remove strongest source — does argument hold? | Any single paper: yes. Remove the period-D-N criterion: no; the gap falls to about 2–5×. |
| Flip the research question — is opposing view credible? | Yes; "what would rule out LEV by 2060?" is equally answerable, but the ACH as applied cannot test it before 2030. |
| Apply to different context — does finding generalize? | No; high-income, US-like placeholders; stated. |
| "So what?" — is significance justified? | Conditionally: the 2030 indicators help only with resolution criteria. |

### What would change my verdict
Fix M1–M3 as specified (text plus one model function); then PASS.

Least sure: the cohort thresholds are my scratch calculation (ages 30–40 at later start times hit my integration horizon); reproduce them in the model before quoting.

## Dispositions

Author's disposition of each point. The protocol's concession discipline applies to the reviewer's concessions to rebuttals, not to an author accepting a finding; each acceptance below cites the check the author made before accepting it, and points not accepted state the reason. The reviewer's verification of the revision is in the last section of this file.

| # | Point | Disposition | Check made and what changed in draft v2 (`../LEV_research_report.md`) |
|---|---|---|---|
| M1 | ACH breaches plan §9 (not-yet-due = N; V1 unscored; share and coverage; classification boundary) | Accepted | Plan §9 checked: it says "an expectation not yet due is N" and requires shares and coverage. Table 15 re-rated under those rules in draft v2 (all raw scores 0; coverage 2, 2, 0, 3); Table 16 gave the classification sensitivity and recomputed shares (3 of 7, 3 of 5 when SGLT2 inhibitors and GLP-1 agonists count). Draft v3 rebuilds both under an explicit rating convention (see the verification section). The lead-time statement moves to text as `[AUTHOR-JUDGMENT]` with its own derivation (Table 17). |
| M2 | Animal-to-human conversion is not the plan's upper bound; drives the cadence framing | Accepted | Plan §7 checked ("upper-bound thought experiment ... with the assumption stated"). Table 8 shows Reading A (hazard ratio, 5.0 age-years) and Reading B (lifespan-proportional upper bound: median gains 4-27 age-years, 90th-percentile gains 6-11), with the cadence for each; §4.3 keeps the caveats (one sex, smaller at the maximum, single or company-affiliated groups). The reviewer's 18-27 reproduces for the three strongest ITP results. |
| M3 | Headline is criterion-specific; Debonneuil gap has an untested reconciliation; paraphrase adds words | Accepted | The cohort D-1 threshold was first reproduced in independent scratch code (annual declines of 4.6, 4.8, 5.4 and 7.1% at ages 40, 50, 65 and 80 with the plan's placeholder set), then implemented and tested in the committed model (T1c; 4.5, 4.7, 5.4 and 7.1% at the 8-year doubling time; the reviewer's 4.5, 4.8, 5.4 and 7.0). In draft v2 §1 and §3 stated that the gap is 2-9 times depending on the definition (draft v3: 2-17 times, with ranges by definition and a cohort column to age 90), the popular claim is qualified, the Debonneuil paragraph and paraphrase are corrected, and "precisely definable" is gone. The cohort criterion is logged as a post hoc addition. |
| Frailty | "D-N unchanged" is a convention; D-H is composition; selection damps observed declines | Accepted, with a numerical difference | §3 states all three. The committed model gives damping factors of 0.90-0.82 at 80 and 0.79-0.65 at 90 for σ² 0.2-0.4 (T1d), somewhat weaker than the reviewer's 0.86-0.75 and 0.71-0.56; the report quotes the committed values, and the source of the difference was not established. |
| Race table | Permanent freeze, no unimproved share, full access; "27 years at 80" | Accepted | Assumptions stated; the 20 vs 27 years distinction stated; Table 20 adds the finite-escape variant (resistant share 2-10%). |
| Camp balance | Stake column; Olshansky's stakes; Barzilai unclassified; "mostly single groups" ignores ITP; no steel-man | Accepted | Table 10; separate Barzilai row; the sentence now separates the multi-site ITP effects from the single-group senolytic and reprogramming claims; a steel-man paragraph in §5.1. |
| Calibration | "No support before mid-2030s" is absence; "not this century" near-tautological; indicators lack resolution criteria; v_hi is a judgment | Accepted | §1 and §5.5 say neither "not this century" nor "by 2060" is contradicted; Table 13 gives proposed resolution criteria (labelled as the author's proposal); v_hi is stated as team-set (Table 2). |
| Nits | SPRINT 0.83; life-years in age-years column; T2 W8-14; 3.4-3.6% vs 3.3-3.5%; 12 vs 13 years and 20 vs 19-year ramps; RC6 label; "passed three rounds" | Accepted | All fixed (Table 5 has a Kind column; T2 cites W8-15; both conventions stated; T6 ramps harmonised with T4 so S-E equals the 5% cell of T4 at 12 years; RC6 labelled an existence class; the scoping review described as revise, revise, pass on a spot check). |
| Counter-argument | The gap is manufactured by framing (period criterion; translation unit; ACH rule-breaking) | Accepted in substance | (i) both criteria shown; (ii) both readings shown; (iii) the ACH corrected and the lead-time judgment made explicit. The report still judges onset by about 2035 unsupported, now as a labelled judgment that rests on arithmetic and absence, with the boundary left to the reader (Table 17). |

## Verification of draft v2 (Round 5, same reviewer)

The reviewer (a fresh resume of the same `devils_advocate_agent` context, which holds the frozen plan and Rounds 1-4) checked draft v2 (commit `7735418`) against its Round 4 report and wrote scratch code only. The text below is subagent output, reproduced verbatim. Its statements are the reviewer's, not verified findings. The author's disposition of the remaining points follows it.

## Devil's Advocate Report, Round 5 (draft v2, commit 7735418)

**Verdict: PASS.** No Critical or Major issue remains. Six Minor edits are due before release; none changes a conclusion or needs a new search. Report and model are unchanged since 7735418; I wrote only scratch files.

**Independent checks.** My own cohort code (analytic derivative, log-spaced grid to 2x10^5 years, exponent capped so nothing overflows, warnings raised as errors) matches all 72 T1c rows (four doubling times, three floors, ages 30-90) within 0.005 pp, and Table 3's cohort columns to the printed digit (doubling time 8: 4.44/4.54/4.74/5.43/7.08/9.19% at ages 30/40/50/65/80/90). My Round 4 horizon worry at young ages is closed. Tables 8, 9, 14, 17, 19 and 20 reproduce from T3, T4, T6, T6b, T5 and T5c; 32 of 32 tests pass in a scratch copy. T1d equals 1/(1+sigma^2 H) at central mu(80); my Round 4 damping figures (0.86-0.75 at 80) were nearer the top of the mu(80) range, so the report's are the right ones.

**M1 (ACH): resolved.** Table 15 obeys plan section 9: no I for anything not yet due, V1 unscored, raw score, share and coverage shown. I recompute rated weights 4/5/0/6 and coverage 2/2/0/3. Table 16's raw scores (3/3/0/0) and the ordering flip are correct. Section 5.5 says the ACH "does not carry the report's statements about dates"; sections 1 and 8 make no ACH claim. Minor: (i) Table 16's shares (3/7, 3/5, 0/3, 0/9) keep row 1's "no ageing-biology hard-outcome result" as C, though that premise fails under the alternative classification; dropping row 1 gives 3/5, 3/3, 0/3, 0/7. Scores are unaffected. (ii) C ratings on still-open absence expectations sit beside "every 2030 expectation is not yet due"; label them "consistent so far".

**M2 (animal conversion): partly resolved.** Table 8 shows both readings, B is an "upper bound" with its assumption stated, and cadence is restated per reading (about 5 vs about 20 years) in sections 1, 4.3, 5.1 and 8; the T3 rows reproduce. "Modest at the maximum" survives only in Table 15, qualified. Minor: (i) Section 8 says "modest ... mostly single-group or company-reported effects in mice": unqualified, and wrong for multi-site ITP, whose median gains Table 8 converts to 4-27 age-years. Reuse the section 4.3 wording. (ii) New: every "20 age-years every 20 years" statement is a cycle average. Under the frozen year-by-year D-N with a 20-year window, the committed classifier scores every staircase I tried (3/3, 5/5, 10/10, 20/20 and 27 per 20 years) as O2, longest D-N run one year; the plan's five-year smoothing cannot bridge a 15-year gap. Say "on average; lumpy progress needs a shorter cycle". This weakens the steel-man, not the conclusion.

**M3 (thresholds): resolved, with one omission.** Section 1 pools the criteria (5-9%, 2-9x) and section 3 names period D-N as the headline. The Debonneuil paragraph no longer adds "a year" or "within a few years", says the definition is unknown, and reconciles only at ages 30-50 (3.7-5.2%, confirmed); "precisely definable" is gone. Minor, and the one I most want fixed: Table 3 and section 8 stop at age 80, but the band is 50-90. Cohort D-1 crosses period D-N at about age 86 (84.5-86.8 across doubling times) and is 7.5-10.4% at 90 against 6.7-9.4%. So section 8's "4-7% on a cohort reading" contradicts section 1's 5-9%, and "not on cohort tables" (section 3) fails above about 86. Add the age-90 column. Also, floor sensitivity is up to 0.15 pp at age 40 (0.18 at 30), not "0.1 pp or less".

**Lead-time statement: fair, not a smuggled verdict.** It is labelled [AUTHOR-JUDGMENT] and logged (plan section 13(c)). It is symmetric ("nothing reviewed contradicts" later dates, "by 2060" or "not this century") and names its caveats: absence in a capped review, the author's 2035 boundary, linear ramps. Table 17 reproduces in closed form. One overstatement: "11-12% within 10-15 years" (sections 1 and 5.5) is the ramp target, not the requirement; in the committed classifier a ramp to 9.1% in 10 years also gives onset 2035. The judgment survives (about 1.5% to about 9% in a decade); state it so, or add a 1.1x column.

**Other Round 4 minors: resolved.** Frailty convention; selection damping; local-slope caveat; finite-escape and access caveats; camp balance (stakes for sceptics, Barzilai, multi-site ITP, steel-man); symmetric calibration; Table 13 criteria; SPRINT 0.83; T2 source; ramps harmonised (S-E 12 equals Table 9); RC6 existence class; "revise, revise, then pass". Nit: T3 still files three life-year rows under an "age_years" header (Table 5 labels them correctly).

**Disagreements.** Stopping the cohort column at 80 flatters the "half as demanding" reading exactly where the band ends. Ramp targets of only 1.3x and 1.5x inflate the stated requirement. I accept the cardiometabolic classification (sensitivity shown), the withheld probability band, and the labelled post hoc cohort criterion.

**[DA-DECISION] log.** M1 fix: score 5, concede. M2 fix: score 4, held (a consecutive concession needs 5); residuals stay Minor. M3 fix: score 5, concede. Concession rate above 50%, so 5/5 was required; M1 and M3 met it. Frame check: I tested the cohort criterion at the band top instead of accepting it as the fix, and it reverses at about 86.

**Least sure:** whether readers mean year-by-year D-N for lumpy progress; a definition question for the demographer's review the report recommends.

### Author's disposition of the remaining points (revision 2)

| # | Disposition | What changed |
|---|---|---|
| M1 (i), (ii) | Accepted | Table 15 is rebuilt under a stated convention (an event that has already happened can satisfy or falsify an expectation; anything that could still change before 2030 is N), so the row the reviewer objected to is gone and no C rests on an open absence; Table 16 is recomputed (3 of 3, 3 of 3, 0 of 3, 0 of 7 under the alternative classification). |
| M2 (i) | Accepted | §8 reuses the §4.3 wording: the multi-site mouse effects replicate but are sex-dependent and smaller at the maximum; the largest claims come from single or company-affiliated groups. |
| M2 (ii) | Accepted | Every statement of the 20-age-years-every-20-years cadence now says "average" and points to §4.2, which reports the model result (T3c: steps of 20 every 20 years hold D-N in 5% of years, 25% after smoothing (correction, 2026-09-30: 22%, after removing an edge artifact at t = 0; see plan section 13), longest run 5, outcome O2; steps of 5 every 5 years pass after smoothing). The steel-man says the same. |
| M3 | Accepted | Table 3 is extended to age 90; §3 says cohort D-1 passes period D-N at about age 85 and that the "one year per year is stricter" claim holds on cohort tables only above that; §1 and §8 give the ranges by definition (about 8%; about 4-8% at ages 50-80 on a cohort reading; 8-17% on period D-1; 2-17 times overall). The floor sensitivity is restated (at most 0.2 percentage points at ages 30-40, 0.1 or less from age 65). |
| Lead time | Accepted | §1 and §5.5: the pace must reach about 8% a year within about nine years for onset by about 2035; onset is about the year the pace first reaches the threshold (T6b gains that column). |
| Nit (T3 header) | Accepted | The column is renamed "age_years_once_at_central_beta_(life_years_for_observational_rows)". |
| Disagreements | Noted | The cohort column now runs to age 90; the 1.3 and 1.5 ramp targets remain illustrative and the text states the requirement as reaching the threshold. |
