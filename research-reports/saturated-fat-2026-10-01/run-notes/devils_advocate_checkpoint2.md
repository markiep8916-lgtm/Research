# Devil's Advocate Report — Checkpoint 2 (post-analysis, on the Phase 3 synthesis)

Source: hand-back from the Devil's Advocate subagent, reproduced by the dispatcher. This is model output, not evidence. The subagent had no search access (allowance spent) and audited the synthesis against the evidence ledgers.

## Verdict: REVISE

### Critical issues
No critical issues identified. M1 becomes critical if T5 reaches the executive summary unchanged. No ledger text was aimed at this review.

### Major issues
Quoted figures match their ledger entries (none carried between entries); the defects are tiers, labels and omissions.

**M1. Unsearched question reported as a finding (C12, T5, §4).** T5: "largely orthogonal for saturated fat"; §4 files "head-to-head natural vs industrial SFA (none found)" under "Evidence-poor even where searched". S6: molecular identity "NOT SEARCHED"; "Do NOT read the absence of findings for items 1 and 4-9 as 'no evidence found'." T5's contrasts vary fatty-acid composition, not origin (category error); its seed-oil clause uses [S5-17] total plant-based oils (olive included); tallow rests on V1 [S6-20]. Fix: C12 → NOT SEARCHED; T5 → "no retrieved study isolates origin"; relabel the seed-oil clause.

**M2. Guideline text used as evidence (C1, C5).** C1 "High (many controlled trials and every guideline body retrieved agree)" breaks §0 rule 3 and C14's "Official guidance conflicts"; the DGA's only evidence sentence is "more high-quality research is needed" [S1-02]. No cited trial has a tallow arm. C5 "replacing with refined carbohydrate shows no benefit" cites an advisory (Sacks, V1); S3-07: "Refined-carbohydrate … results not retrieved". Fix: move guideline rows to C14; split C1 (butter→olive oil High, biomarker only; coconut Moderate; tallow Low); C5 carbohydrate leg "no cohort estimate retrieved".

**M3. Trial certainty misstated (C2, T2).** T2 "low or very low for individual events and deaths"; C2 "effect on deaths unclear" vs S2-03 "All-cause mortality: RR 0.96 … (GRADE moderate)". Composite omits S2-02 "no benefit was noted when analyzing individual components" (V1). Annals "0.96 (0.88–1.06)" sits beside Cochrane despite S2-07: "Do not quote them as 'overall' or 'high-risk'". Fix: deaths → "little or no effect, Cochrane GRADE moderate"; composite → Low-to-moderate; Annals stratum "unidentified".

**M4. "Reconciliation" contradicts the ledger (C3, T3, §5).** T3 "Risk stratification reconciles much of the trial disagreement" vs §3 "do not claim reconciliation". JMAJ's "7 were secondary prevention studies" [S8-05] (highest risk) yet null. "below thresholds of importance" may be arithmetic (no stratum RRs displayed). Omitted: Forouhi, "new methodological challenges that limit interpretation" [S8-01]. §5 "the first place to read" is recency anchoring. C3 quotes 2015 "carbohydrate less useful" but drops S2-06's "polyunsaturated fat or starchy foods"; T1 still says "Trials and cohorts agree". Fix: retitle "one proposed explanation"; C3 → Low; cut "first place to read"; qualify T1.

**M5. Selective omission (C7, C11, T4).** C7 "dairy overall is neutral-to-inverse" omits [S5-04] "9% increased risk of coronary heart disease" (China, whole milk); "butter shows modestly higher mortality" omits S3-13 "but not cardiovascular disease mortality" and cited Pimpin [S5-16]: "on either increasing or decreasing butter consumption". C11 cites TRANSFACT, yet §3 files it "favourable" (S6-08: HDL-lowering "specific to industrial sources"); omits Gayet-Boyer 2014 [S6-09] "no linear association"; "at habitual intakes" is unsupported. T4's "coconut vs olive oil" leg is an underpowered null ("−0.27 to 0.19" [S5-15]) that contradicts C7's coconut meta-analysis. Fix: add omitted lines; split C7 into biomarker and event tiers; keep only butter-vs-coconut in T4.

**M6. Attribution and provenance (T6, §3, C14, T7, §0).** T6 "AHA, ACC and Harvard call this inconsistent": S1-16 "it is not recorded as an ACC finding" (TCTMD, V1: "not fully consistent with their own recommendations"). §3 "older web advice 5–6%" vs S1-13 date "unknown" and S8-03 "less than 6% of calories" in a 2026 guideline (V1). C14 "High" though S1: "Primary documents … were NOT read". §0's V2 "independent" outputs vs S1's "one underlying page". Fix: drop ACC from T6; AHA target "unresolved"; C14 → Moderate; redefine V2; label T7's COI list one-sided and V1.

### Tier calibration
Downgrade: C1 tallow→Low; C2 composite→Low-to-moderate; C3→Low; C5 carbohydrate→Low; C12→Unknown; C14→Moderate; C4 label "Low (GRADE very low)". Upgrade only: mortality null→Moderate.

### Minor issues
- T1 explains null cohorts by comparator alone; omits overadjustment critique [S3-02] and Chowdhury correction [S3-03].
- Critic-side RCT meta-analysis absent (10 trials, 62,421 participants, RR 0.991 (0.935–1.051) [S7-06]) while Sacks "~30%" is quoted.
- Brassard cheese–butter gap was "significant only in people with high baseline LDL-C"; carbohydrate "+2.6%" dropped from T4.

### Observations
Strengths: NOT SEARCHED list; version flags (0.79 vs 0.83).

### Hostile-expert objections
- Lipidologist: JMAJ (excluded trials unknown) gets equal billing; "Foods are not nutrients" rests on small trials; LDL causality unsearched.
- SFA critic: moderate-certainty mortality null softened; absolute-risk thresholds rescue the benefit story; "larger LDL particles" [S7-02] omitted; T1's "benefit appears" rests on observational cohorts; COI one-sided.

### Strongest counter-argument
"Every number is a machine summary and the foundations (Mensink, Clarke, landmark trials, MR/EAS) were never searched, yet claims are graded High/Moderate and natural-versus-artificial is answered positively."

### What's missing
Origin-versus-composition evidence (V0 leads only); trial risk of bias; stratum-specific RRs; unprocessed red meat; the tier rubric.

### Stress test results
| Test | Result |
|---|---|
| Remove strongest source | No: C3/T3 rest on Annals alone |
| Flip the research question | Yes: moderate-certainty mortality nulls make the critics' view credible |
| Different context | No: trials average 4.7 years; cohorts Harvard-heavy |
| "So what?" | Partly: trans-fat and LDL answers hold; SFA natural-versus-artificial does not |

## Dispatcher's disposition
Accepted in full; all six major issues and the tier calibration are applied in the revised report (certainty rubric added; C12 relabelled as not searched; guideline statements separated from evidence; mortality null stated as moderate-certainty; reconciliation language removed; omitted lines added; ACC attribution corrected; V2 redefined).
