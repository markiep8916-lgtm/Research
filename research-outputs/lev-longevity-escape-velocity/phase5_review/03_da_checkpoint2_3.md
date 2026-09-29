# Devil's-Advocate Review of the Report (Checkpoints 2 and 3, Round 4)

| Field | Value |
|---|---|
| Reviewer | Fresh-context subagent of the same model family, role `devils_advocate_agent` (`deep-research/agents/devils_advocate_agent.md`), resumed from the scoping-review rounds so it holds the frozen plan; no web access; worked from the files and in scratch copies of the code |
| Reviewed | `../LEV_research_report.md`, draft v1 (commit `fc40bde`), the analysis outputs, and the model |
| Verdict | **REVISE** (no Critical issues; three Major issues, none needing new searches) |
| Dispositions | See the table at the end of this file |

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

(to be completed after the editorial and claims-audit reviews are also in and the report is revised)
