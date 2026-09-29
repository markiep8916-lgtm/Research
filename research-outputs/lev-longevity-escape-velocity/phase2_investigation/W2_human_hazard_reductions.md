# W2 · Demonstrated human hazard reductions and life-table anchors

| Field | Value |
|---|---|
| Workstream | W2, demonstrated human hazard reductions and life-table anchors |
| Sub-question | SQ2 (human anchor) |
| Run | `deep-research` v2.12.1, `full` mode, Phase 2 (Investigation) |
| Date (`last_searched_at`) | 2026-09-29 for every card |
| Agent role | W2 workstream agent (AI-assisted, same model family as the rest of the run, fresh context; no second-agent re-run of any query) |
| Protocol | `00_search_protocol.md` v2, plus the coordinator's mid-task amendment v2.1 (named-source attribution rule for F3; numbered search-log IDs; no citation chaining; hazard-ratio priority) |
| Retrieval | WebSearch only. 29 queries returned results (Q-01 to Q-29). Five later calls (Q-30 to Q-34) were refused by the tool: "this session has used its web search budget (200 of 200 WebSearch calls)". The cap is session-wide and is shared with the other workstream agents |
| **Status** | **PARTIAL.** Must-answer (a) is answered for blood-pressure control, lipid lowering, smoking cessation, GLP-1 receptor agonists and SGLT2 inhibitors only. Vaccines, cancer screening, polypill strategies, exercise, diet and lifestyle composites, and must-answers (b) to (e) were **not searched** because the cap was reached. 17 cards against a target of 20-35 |
| **Summary-mediated** | Every figure in this file was read from a model-written search summary that accompanied a link list. No figure was checked against source text. Under v2.1 no card reaches F3 (each figure traces to one authorship origin), so all 17 cards are V2 [E2, F2]. One claim-level convergence is V3 (smoking cessation, W2-13 with W2-14) |
| Level counts | V3: 0 cards (1 claim-level convergence) · V2: 17 · V2-P: 0 · V1: 0 |

**Legend.** Origin classes used in the search log: PUB publisher; PM PubMed; PMC PubMed Central or NCBI Bookshelf; REG trial registry; OFS official or agency data page; ORG society, company or foundation; INST university or research-unit page; AGG aggregator, repository or reference-manager page (secondary); NEWS news or press office; BLOG blog; ENC encyclopaedia; PRE preprint server. Tier mapping used here: Tier 1 peer-reviewed journal article or formal systematic review; Tier 2 consensus statement or conference abstract; Tier 3 news or aggregator; Tier 4 blog or marketing (`source_quality_hierarchy.md` defines design levels I-VII but not tiers, so the mapping is stated here). Citation fields (authors, initials, year, volume, pages) are limited to what the results displayed or the protocol lead list named; missing fields are omitted, not filled. "Leading query" means the query text itself contained a number that the summary then repeated.

---

## 2. Must-answer questions and answer status

| Q | Status | What this file holds |
|---|---|---|
| (a) Best-quantified all-cause hazard ratio or life-years gain per intervention class | **Partially answered.** Confirmed for blood-pressure control, statins and LDL lowering, smoking cessation, GLP-1 receptor agonists (SELECT; SURPASS-CVOT versus an active comparator), SGLT2 inhibitors (EMPA-REG trial level). **Not found (not searched):** vaccines, cancer screening, polypill strategies, exercise, diet and lifestyle composites, bariatric or glucose-lowering strategies. Class-level all-cause meta-analytic figures for GLP-1 receptor agonists and SGLT2 inhibitors: not confirmed | W2-01 to W2-17 |
| (b) Past decline in cardiovascular mortality attributed to medicine and risk-factor change | **Not found (not searched)** | none |
| (c) Recent period life tables: survival over 10-40 years, e(50), e(65) with country, year, source | **Not found (not searched; Q-34 was refused)** | none |
| (d) Limits of direct-to-consumer "biological age" tests and unproven longevity clinics | **Not found (not searched)** | none |
| (e) Midlife risk-factor change and the probability of reaching very old age | **Not found (not searched)** | none |

### Pathway extraction table (numbers as reported by the summaries; nothing converted)

"Outcome type" separates all-cause death from other outcomes, as the coordinator asked. Per-unit rows (per 10 mm Hg, per 5 mm Hg, per 1.0 mmol/L) are dose-response estimates, not one-off hazard ratios for a defined regimen.

| Pathway (card) | Outcome type | Figure as reported | Interval | Population | Follow-up | Level |
|---|---|---|---|---|---|---|
| Intensive systolic BP target (<120 vs <140 mm Hg), SPRINT (W2-01) | **All-cause death** | HR 0.73 | 95% CI 0.60-0.90 | 9,361 randomised; mean age 67.9 y; 35.6% women | median 3.26 y | V2 |
| SPRINT final report (W2-02) | Composite CV primary outcome | HR 0.73 | 95% CI 0.63-0.86 | as SPRINT | median 3.33 y (sentence not tied to this report) | V2 |
| SPRINT final report (W2-02) | **All-cause death** | 1.06 vs 1.41 per 100 person-years ("25% lower"); HR not stated | not stated | as SPRINT | as above | V2 |
| SPRINT long-term (W2-03) | **All-cause death** | HR 0.83 (trial period); 1.08 (8-y post-trial); 0.96 (overall) | 0.68-1.00; 0.94-1.23; 0.89-1.04 | SPRINT cohort | up to 13 y | V2 (attribution inferred) |
| SPRINT long-term (W2-03) | CV death | HR 0.66; 1.02; 0.84 | 0.49-0.89; 0.84-1.24; 0.74-0.96 | as above | as above | V2 (attribution inferred) |
| BP lowering, per 10 mm Hg systolic (W2-04) | **All-cause death** | RR 0.87 | 0.84-0.91 | 123 studies, 613,815 participants | not shown | V2 |
| BP lowering, per 5 mm Hg systolic (W2-05) | MACE | HR 0.89 (prior CVD); 0.91 (no prior CVD) | 0.86-0.92; 0.89-0.94 | 48 RCTs, individual-participant data | not shown | V2 |
| LDL-C lowering, per 1.0 mmol/L (W2-06) | **All-cause death** | RR 0.90 | 0.87-0.93 | 26 trials, about 170,000 participants | median 5.1 y (intensity trials), 4.8 y (statin vs control) | V2 |
| LDL-C lowering, per 1.0 mmol/L, by sex (W2-07) | **All-cause death** | women RR 0.91; men RR 0.90 | 99% CI 0.84-0.99; 0.86-0.95 | 27 trials, 174,000 participants | not shown | V2 |
| Statins, 5-y risk <10%, per 1.0 mmol/L (W2-08) | Major vascular events | 11 fewer per 1,000 treated over 5 y | not shown | 27 trials, about 175,000 | 5 y | V2 |
| Statins, primary prevention (W2-09) | **All-cause death** | 0.86 (labelled "odds ratio" in the output) | 95% CI 0.79-0.94 | 18 RCTs, 56,934 participants | not shown | V2 (leading query) |
| Statins, average survival (W2-10) | Days of survival postponed inside the trial window | median 3.2 d (primary prevention), 4.1 d (secondary) | ranges -5 to 19 d; -10 to 27 d | 6 and 5 trials | 2.0-6.1 y | V2 |
| PCSK9 antibody, FOURIER (W2-11) | MACE (CV death, MI, stroke); CV death | HR 0.80; CV death "similar" | 0.73-0.88 | established ASCVD on statins | median 2.2 y | V2 |
| Smoking cessation, Jha (W2-13) | Life-years gained (observational) | about 10, 9, 6 y (quit at 25-34, 35-44, 45-54) | not shown | US adults | not shown | V2 |
| Smoking cessation, Doll (W2-14) | Life-years gained (observational) | about 3, 6, 9, 10 y (stopped at 60, 50, 40, 30) | not shown | British male doctors born 1900-1930 | 50 y of observation | V2 |
| Smoking cessation, claim level (W2-13 + W2-14) | Life-years gained | about 10 / 9 / 6 y for quitting at about 30 / 40 / 50 | see cards | two independent cohorts | see cards | **V3 (claim level)** |
| Semaglutide, SELECT (W2-15) | **All-cause death (nominal)** | HR 0.81 | 95% CI 0.71-0.93 | 17,604; age 45+; BMI 27+; established CVD; no diabetes | mean 39.8 months | V2 |
| Semaglutide, SELECT (W2-15) | CV death; MACE | HR 0.85; HR 0.80 | 0.71-1.01 (P=0.07); 0.72-0.90 | as above | as above | V2 |
| Tirzepatide vs dulaglutide, SURPASS-CVOT (W2-16) | **All-cause death (nominal; active comparator)** | HR 0.84 | 95% CI 0.75-0.94 | type 2 diabetes with CV disease; 6,586 vs 6,579 | median 4 y | V2 |
| Empagliflozin, EMPA-REG OUTCOME (W2-17) | **All-cause death** | HR 0.68 | 95% CI 0.57-0.82 | type 2 diabetes, high CV risk; 7,020 | median treatment 2.6 y | V2 |
| SGLT2 inhibitors, class level | All-cause death | **figure not confirmed** (conflicting statements in Q-29) | | | | not carded |

**Reading notes for the coordinator (no conversion done here).**
1. No W2 figure is V3 at the figure level, so under Blueprint rule 8 each is a ranged free parameter, with the range spanning the V2 values.
2. SPRINT's all-cause HR depends on the analysis window (0.73 at 3.26 y; 0.83 for the "trial period" in a later analysis; 0.96 once 8 years of post-trial follow-up are pooled). The later analysis reports that the difference between arms did not persist after the intervention period (W2-03). This bears directly on the one-off-versus-cadence logic.
3. Per-unit hazard ratios need an assumed change in the surrogate (mm Hg, mmol/L) before any age-year conversion. The LDL consensus statement says effect scales with the absolute reduction and the cumulative duration of exposure (W2-12).
4. All-cause death in SELECT and SURPASS-CVOT is nominal or hypothesis-generating under the trials' testing hierarchies (W2-15, W2-16). FOURIER lowered a surrogate (LDL-C) strongly, but the CV-death difference was not evident at 2.2 y (W2-11).
5. The smoking figures are life-expectancy differences from observational cohorts, not hazard ratios. A hazard ratio for cessation was not obtained.
6. No life-table anchor was obtained, so SQ1 and SQ2 stay "illustrative arithmetic with literature parameters" unless W1 supplies tables.

---

## 3. Evidence cards

### W2-01 · SPRINT: intensive versus standard systolic BP target, primary report
- **Citation (APA 7):** Wright, et al. (2015). A randomized trial of intensive versus standard blood-pressure control. *New England Journal of Medicine*. https://doi.org/10.1056/NEJMoa1511939 (initials, volume and pages not shown in results)
- **Identifiers seen in live results:** [DOI](https://doi.org/10.1056/NEJMoa1511939) · [NEJM](https://www.nejm.org/doi/full/10.1056/NEJMoa1511939) · [PMID 26551272](https://pubmed.ncbi.nlm.nih.gov/26551272/) · [NCT01206062](https://clinicaltrials.gov/study/NCT01206062) (registry: design and existence only)
- **Level:** V2 [E2, F2]. Q-01 and Q-02 both name only the SPRINT team, so F2 under v2.1
- **Verification log:** Q-01, Q-02, Q-06. Q-01: "hazard ratio of 0.73 (95% CI, 0.60 to 0.90; P=0.003)", tied to "the landmark SPRINT study led by Wright and colleagues". Q-02: "risk of death from any cause was 27% lower". Q-01 is a leading query; Q-02 is not
- **Type / tier / design level:** Journal article · Tier 1 · Level II (RCT, stopped early; all-cause death was a key secondary outcome per Q-01)
- **Key finding(s), confirmed figures only:** Outcome type **all-cause death**. HR 0.73 (95% CI 0.60-0.90), intensive (systolic target <120 mm Hg) versus standard (<140), median follow-up 3.26 y (stopped early, August 2015; Q-02 also gives 3.33 y). Number needed to treat to prevent one death: 90 (Q-02; interval not shown). Population, from the cohort description in Q-03: 9,361 randomised, mean age 67.9 y, 35.6% women; eligibility criteria not shown
- **Epistemic label:** [SUPPORTED]
- **Stake / COI:** funder not displayed. An NHLBI data-repository page (BioLINCC) was listed in Q-02
- **Pair:** W2-03 (difference between arms not sustained after the trial); W2-02
- **Use in report:** SQ2 · human anchor

### W2-02 · SPRINT final report (extended follow-up)
- **Citation (APA 7):** [Authors not displayed]. (2021). Final report of a trial of intensive versus standard blood-pressure control. *New England Journal of Medicine* (issue of 20 May 2021 per Q-06). https://doi.org/10.1056/nejmoa1901281
- **Identifiers seen in live results:** [DOI](https://doi.org/10.1056/nejmoa1901281) · [NEJM](https://www.nejm.org/doi/full/10.1056/NEJMoa1901281) · [TCTMD news item](https://www.tctmd.com/news/final-sprint-results-endorse-intensive-bp-control) (pointer only)
- **Level:** V2 [E2, F2]
- **Verification log:** Q-06. Output: primary outcome "1.77% per year" versus "2.40% per year", "hazard ratio, 0.73; 95% CI 0.63 to 0.86"; all-cause mortality "1.06% vs 1.41% per year", a "25% lower mortality rate". Attributed to the SPRINT final report. Q-02 lists the same paper; it gives 3.33 y median follow-up without tying it to this report
- **Type / tier / design level:** Journal article · Tier 1 · Level II (RCT, extended analysis)
- **Key finding(s), confirmed figures only:** Composite CV primary outcome HR 0.73 (0.63-0.86) (**not all-cause**). All-cause death rates 1.06 versus 1.41 per 100 person-years, "25% lower"; the all-cause HR and interval were not shown: **figure not confirmed as an HR**
- **Epistemic label:** [SUPPORTED]
- **Stake / COI:** not displayed
- **Pair:** W2-03
- **Use in report:** SQ2 · human anchor (range for the during-trial all-cause effect)

### W2-03 · SPRINT long-term mortality, including post-trial follow-up
- **Citation (APA 7):** Jaeger, et al. (2024). Long-term mortality in the SPRINT cohort. *Alzheimer's & Dementia*. https://doi.org/10.1002/alz.095416 (the format suggests a conference-abstract supplement; unverified)
- **Identifiers seen in live results:** [Wiley page](https://alz-journals.onlinelibrary.wiley.com/doi/10.1002/alz.095416) · [PMC11713828](https://pmc.ncbi.nlm.nih.gov/articles/PMC11713828/) · news pointers: [TCTMD](https://www.tctmd.com/news/sprint-turns-sluggish-mortality-benefits-vanish-once-normal-bp-care-resumes), [2 Minute Medicine](https://www.2minutemedicine.com/beneficial-effect-of-intensive-blood-pressure-control-on-cardiovascular-and-all-cause-mortality-not-persist-after-trial-intervention-a-secondary-analysis-of-the-sprint-trial/)
- **Level:** V2 [E2, F2]. **Attribution inferred:** the Q-03 output states the figures without naming the source paper; the link is inferred from the two top-ranked results. Use only as a ranged input
- **Verification log:** Q-03. Output sentences: trial period "all-cause mortality (HR, 0.83; 95% CI, 0.68-1.00)"; post-trial "all-cause mortality HR: 1.08; 95% CI, 0.94-1.23"; overall "(HR, 0.96; 95% CI, 0.89-1.04)". Two news link titles (TCTMD; 2 Minute Medicine) state the direction: benefit did not persist after the trial (E1, direction only)
- **Type / tier / design level:** Journal-supplement abstract · Tier 2 · Level II/IV (secondary analysis of an RCT with observational post-trial follow-up)
- **Key finding(s), confirmed figures only:** **All-cause death** HR 0.83 (0.68-1.00) during the trial period; 1.08 (0.94-1.23) over 8 post-trial years; 0.96 (0.89-1.04) overall. **CV death** HR 0.66 (0.49-0.89); 1.02 (0.84-1.24); 0.84 (0.74-0.96). 9,361 randomised; mean age 67.9 y; maximum follow-up 13 y; 2,597 all-cause deaths
- **Epistemic label:** [SUPPORTED]
- **Stake / COI:** not displayed
- **Pair:** W2-01 and W2-02 (the during-trial benefit); see C-1
- **Use in report:** SQ2 · human anchor and caution (persistence of a hazard reduction after treatment stops)

### W2-04 · Blood-pressure lowering meta-analysis (Ettehad et al.)
- **Citation (APA 7):** Ettehad, D., Emdin, C. A., Kiran, A., Anderson, S. G., Callender, T., Emberson, J., Chalmers, J., Rodgers, A., & Rahimi, K. (2016). Blood pressure lowering for prevention of cardiovascular disease and death: A systematic review and meta-analysis. *The Lancet, 387*(10022), 957-967.
- **Identifiers seen in live results:** [PMID 26724178](https://pubmed.ncbi.nlm.nih.gov/26724178/) · [Lancet full text](https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(15)01225-8/fulltext)
- **Level:** V2 [E2, F2]
- **Verification log:** Q-08 (states the figure); Q-05 (names authors, volume, pages; no figure). Q-08: "Every 10 mm Hg reduction in systolic blood pressure ... all-cause mortality (0.87, 0.84-0.91)", attributed to "the Ettehad 2016 meta-analysis"
- **Type / tier / design level:** Journal article · Tier 1 · Level I (meta-analysis of RCTs)
- **Key finding(s), confirmed figures only:** Per 10 mm Hg systolic reduction: **all-cause mortality** RR 0.87 (0.84-0.91); MACE RR 0.80 (0.77-0.83); coronary heart disease 0.83 (0.78-0.88); stroke 0.73 (0.68-0.77); heart failure 0.72 (0.67-0.78). 123 studies, 613,815 participants; trials with at least 1,000 patient-years per arm (Q-05). Follow-up not shown
- **Epistemic label:** [ESTABLISHED] (direction of effect; magnitude varies by population)
- **Stake / COI:** academic authors; funding not displayed
- **Pair:** none found after 3 queries for a sceptical blood-pressure meta-analysis (W2-03 is the nearest, on persistence)
- **Use in report:** SQ2 · pathway evidence (dose-response)

### W2-05 · Blood Pressure Lowering Treatment Trialists' Collaboration, 2021
- **Citation (APA 7):** Blood Pressure Lowering Treatment Trialists' Collaboration. (2021). Pharmacological blood pressure lowering for primary and secondary prevention of cardiovascular disease across different levels of blood pressure: An individual participant-level data meta-analysis. *The Lancet, 397*, 1625-1636.
- **Identifiers seen in live results:** [Lancet full text](https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(21)00590-0/fulltext) · a "Department of Error" notice (PMC8165755, subject not seen) · news pointer [Cardiology Advisor](https://www.thecardiologyadvisor.com/home/topics/hypertension/reduction-in-systolic-blood-pressure-of-5-mmhg-can-reduce-risk-for-major-cardiovascular-events-by-10/)
- **Level:** V2 [E2, F2]
- **Verification log:** Q-07 (figure); Q-04 (volume, pages, "48 randomised trials"). Q-07: "reduction of systolic blood pressure by 5 mm Hg" gave HR "0.89 (95% CI 0.86-0.92)" with prior CVD and "0.91 (0.89-0.94)" without, attributed to "the 2021 BPLTTC study"
- **Type / tier / design level:** Journal article · Tier 1 · Level I (individual-participant meta-analysis of RCTs)
- **Key finding(s), confirmed figures only:** Per 5 mm Hg systolic reduction, **MACE (not all-cause)** HR 0.89 (0.86-0.92) with previous CVD, 0.91 (0.89-0.94) without. 48 randomised trials with at least 1,000 person-years per group. The Q-07 output also gives all-cause mortality HR 1.00 (0.90-1.11) in participants aged 85 or older, without naming which paper it comes from: **figure not confirmed**
- **Epistemic label:** [ESTABLISHED]
- **Stake / COI:** academic collaboration; funding not displayed
- **Pair:** none found after 2 queries
- **Use in report:** SQ2 · pathway evidence (MACE, not all-cause)

### W2-06 · Cholesterol Treatment Trialists' Collaboration, 2010 (26 trials)
- **Citation (APA 7):** Cholesterol Treatment Trialists' (CTT) Collaboration. (2010). Efficacy and safety of more intensive lowering of LDL cholesterol: A meta-analysis of data from 170,000 participants in 26 randomised trials. *The Lancet, 376*, 1670-1681.
- **Identifiers seen in live results:** [PMID 21067804](https://pubmed.ncbi.nlm.nih.gov/21067804/) · [Lancet full text](https://www.thelancet.com/article/S0140-6736(10)61350-5/fulltext) · earlier CTT paper [PMID 16214597](https://pubmed.ncbi.nlm.nih.gov/16214597/)
- **Level:** V2 [E2, F2]
- **Verification log:** Q-17 (figure; publisher and PubMed filter); Q-09 and Q-12 (citation, design; no all-cause figure for the 26 trials). Q-17: "all-cause mortality was reduced by 10% per 1.0 mmol/L LDL reduction (RR 0.90, 95% CI 0.87-0.93; p<0.0001)", attributed to the CTT Collaboration 2010 meta-analysis. Q-12 also states, for the earlier CTT paper, a "12% proportional reduction in all-cause mortality" per mmol/L (14 trials, 90,056 participants, mean 5 y, 8,186 deaths; interval not shown). Same collaboration, so not independent
- **Type / tier / design level:** Journal article · Tier 1 · Level I (meta-analysis of RCTs)
- **Key finding(s), confirmed figures only:** **All-cause mortality** RR 0.90 (0.87-0.93) per 1.0 mmol/L LDL-C reduction, "largely reflecting deaths due to coronary heart disease". 26 trials of at least 1,000 participants and at least 2 y of treatment: more-versus-less-intensive statin (5 trials, 39,612 participants, median follow-up 5.1 y) and statin versus control (21 trials, 129,526 participants, median 4.8 y). Major vascular events reduced "by just over a fifth" per 1.0 mmol/L
- **Epistemic label:** [ESTABLISHED]
- **Stake / COI:** a university research-unit collaboration (CTSU pages listed in Q-12); funding not displayed
- **Pair:** W2-10 (small average survival gain inside trial windows); contrarian LDL review seen by title only (see W2-12)
- **Use in report:** SQ2 · pathway evidence (per-unit surrogate; about 5-y exposure)

### W2-07 · CTT Collaboration, 2015 (men and women, 27 trials)
- **Citation (APA 7):** Cholesterol Treatment Trialists' (CTT) Collaboration. (2015). Efficacy and safety of LDL-lowering therapy among men and women: Meta-analysis of individual data from 174,000 participants in 27 randomised trials. *The Lancet*.
- **Identifiers seen in live results:** [PMID 25579834](https://pubmed.ncbi.nlm.nih.gov/25579834/) · [Lancet abstract](https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(14)61368-4/abstract)
- **Level:** V2 [E2, F2]
- **Verification log:** Q-19 (publisher and PubMed filter). "all-cause mortality reductions with statin therapy for both women (RR 0.91, 99% CI 0.84-0.99) and men (RR 0.90, 99% CI 0.86-0.95)", attributed to the CTT 2015 meta-analysis; the output's closing line frames the effects "per mmol/L reduction in LDL cholesterol". Same collaboration as W2-06
- **Type / tier / design level:** Journal article · Tier 1 · Level I (individual-participant meta-analysis)
- **Key finding(s), confirmed figures only:** **All-cause mortality** women RR 0.91 (99% CI 0.84-0.99), men RR 0.90 (99% CI 0.86-0.95). MACE per mmol/L: women 0.84 (0.78-0.91), men 0.78 (0.75-0.81) (99% CIs). 22 statin-versus-control trials (n = 134,537) and 5 more-versus-less-intensive trials (n = 39,612). Follow-up not shown
- **Epistemic label:** [ESTABLISHED]
- **Stake / COI:** as W2-06
- **Pair:** W2-10
- **Use in report:** SQ2 · pathway evidence

### W2-08 · CTT Collaboration, 2012 (people at low risk)
- **Citation (APA 7):** Cholesterol Treatment Trialists' (CTT) Collaboration. (2012). The effects of lowering LDL cholesterol with statin therapy in people at low risk of vascular disease: Meta-analysis of individual data from 27 randomised trials. *The Lancet* (August 2012 per Q-13).
- **Identifiers seen in live results:** [Lancet full text](https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(12)60367-5/fulltext)
- **Level:** V2 [E2, F2]
- **Verification log:** Q-13. "each 1.0 mmol/L reduction in LDL cholesterol produces 11 fewer major vascular events per 1000 treated over 5 years", for people with 5-year risk below 10%, attributed to the CTT 2012 paper. Q-12 lists the same paper
- **Type / tier / design level:** Journal article · Tier 1 · Level I
- **Key finding(s), confirmed figures only:** **Major vascular events (not all-cause)**: 11 fewer per 1,000 treated over 5 y per 1.0 mmol/L LDL-C reduction, in people with 5-y major-vascular-event risk below 10%; 27 trials, about 175,000 participants. All-cause figure for this paper not confirmed
- **Epistemic label:** [ESTABLISHED]
- **Stake / COI:** as W2-06
- **Pair:** W2-10
- **Use in report:** SQ2 · pathway evidence (absolute effect at low baseline risk)

### W2-09 · Cochrane review: statins for primary prevention
- **Citation (APA 7):** Taylor, F., Huffman, M. D., Macedo, A. F., Moore, T. H. M., Burke, M., Davey Smith, G., Ward, K., Ebrahim, S., & Gay, H. C. (2013). Statins for the primary prevention of cardiovascular disease. *Cochrane Database of Systematic Reviews*, (1). https://doi.org/10.1002/14651858.CD004816.pub5
- **Identifiers seen in live results:** [Cochrane Library abstract](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD004816.pub5/abstract) · [cochrane.org evidence page](https://www.cochrane.org/evidence/CD004816_statins-primary-prevention-cardiovascular-disease)
- **Level:** V2 [E2, F2] (figure appears only in the output of a **leading** query; metric label unresolved; treat as a ranged input)
- **Verification log:** Q-18 (publisher and PubMed filter; query text contained "RR 0.86 ... 0.79 to 0.94"): output "all-cause mortality was reduced by statins with an odds ratio (OR) of 0.86 ... 0.79 to 0.94", attributed to "the 2013 Cochrane review". Q-14: "18 randomised control trials with 19 trial arms (56,934 patients)". Q-10, for the earlier 2011 version: all-cause "RR 0.84, 95% CI 0.73 to 0.96", 14 trials, 34,272 patients
- **Type / tier / design level:** Systematic review · Tier 1 · Level I
- **Key finding(s), confirmed figures only:** **All-cause mortality** 0.86 (0.79-0.94) (the output calls it an odds ratio; the query called it RR); combined fatal and non-fatal CVD events RR 0.75 (0.70-0.81). People without prior CVD; 18 RCTs (19 arms), 56,934 participants, trials from 1994 to 2008. Follow-up not shown
- **Epistemic label:** [SUPPORTED]
- **Stake / COI:** Cochrane; author interests not displayed
- **Pair:** W2-10
- **Use in report:** SQ2 · pathway evidence

### W2-10 · Statins and average survival: "postponement of death" (Kristensen et al.)
- **Citation (APA 7):** Kristensen, et al. (2015). The effect of statins on average survival in randomised trials, an analysis of end point postponement. *BMJ Open*. (other authors, volume and pages not displayed)
- **Identifiers seen in live results:** [PMID 26408281](https://pubmed.ncbi.nlm.nih.gov/26408281/) · a later systematic review with a similar title, results not seen: [PMID 31073857](https://pubmed.ncbi.nlm.nih.gov/31073857/), [PMC6667545](https://pmc.ncbi.nlm.nih.gov/articles/PMC6667545/)
- **Level:** V2 [E2, F2]
- **Verification log:** Q-11. "the median postponement of death for primary and secondary prevention trials were 3.2 and 4.1 days", attributed to "Kristensen et al. ... BMJ Open in 2015"
- **Type / tier / design level:** Journal article · Tier 1 · Level I/II (analysis of published trial survival curves)
- **Key finding(s), confirmed figures only:** Median postponement of death 3.2 days (primary prevention; range -5 to 19 days; 6 studies) and 4.1 days (secondary prevention; range -10 to 27 days; 5 studies); trial follow-up 2.0-6.1 y. The metric is average survival gain inside the trial window, not a hazard ratio. The authors' conclusion, per the output: a "surprisingly small average gain in overall survival within the trials' running time"
- **Epistemic label:** [SUPPORTED]
- **Stake / COI:** Danish academic group (University of Southern Denmark portal listed); no company stake seen. Sceptical framing of primary-prevention benefit, disclosed as a stance
- **Pair:** W2-06 (relative effect per mmol/L); see C-3
- **Use in report:** SQ2 · caution (translating a hazard ratio into survival time)

### W2-11 · FOURIER: PCSK9 antibody on a statin background
- **Citation (APA 7):** [Authors not displayed]. (2017). Evolocumab and clinical outcomes in patients with cardiovascular disease. *New England Journal of Medicine, 376*(18). https://doi.org/10.1056/NEJMoa1615664
- **Identifiers seen in live results:** [NEJM](https://www.nejm.org/doi/full/10.1056/NEJMoa1615664) · news pointer [TCTMD](https://www.tctmd.com/news/fourier-evolocumab-reduces-risk-cvd-events-15-compared-placebo)
- **Level:** V2 [E2, F2]
- **Verification log:** Q-15. Output: "reduced the risk of cardiovascular death, MI, or stroke by 20% (hazard ratio 0.80, 95% CI 0.73-0.88)"; "the incidence of cardiovascular death remained similar in both groups"; median follow-up 2.2 y; LDL-C "to a median of 30 mg per deciliter". The 15% primary-composite figure comes from a news link title only
- **Type / tier / design level:** Journal article · Tier 1 · Level II (RCT)
- **Key finding(s), confirmed figures only:** **MACE (CV death, MI, stroke)** HR 0.80 (0.73-0.88); primary composite reduced 15% (HR and interval not shown); **CV death similar** between groups; **all-cause figure not confirmed**. Median follow-up 2.2 y; established atherosclerotic CVD on statins; LDL-C lowered to a median of 30 mg/dL
- **Epistemic label:** [ESTABLISHED] for the MACE effect; no CV-death effect shown at 2.2 y
- **Stake / COI:** sponsor not displayed (a manufacturer-sponsored trial is believed from background knowledge; unverified)
- **Pair:** W2-06 and W2-12 (see C-4)
- **Use in report:** SQ2 · caution (a large surrogate reduction with no CV-death difference in a short window)

### W2-12 · LDL causality: European Atherosclerosis Society consensus statement, 2017
- **Citation (APA 7):** European Atherosclerosis Society Consensus Panel (Ference, et al., per Q-16). (2017). Low-density lipoproteins cause atherosclerotic cardiovascular disease. 1. Evidence from genetic, epidemiologic, and clinical studies. *European Heart Journal, 38*(32), 2459-.
- **Identifiers seen in live results:** [EHJ 38(32)](https://academic.oup.com/eurheartj/article/38/32/2459/3745109) · a 2020 follow-up statement [EHJ 41(24)](https://academic.oup.com/eurheartj/article/41/24/2313/5735221) · contrarian review, title only: [LDL-C does not cause cardiovascular disease: a comprehensive review of the current literature](https://www.tandfonline.com/doi/full/10.1080/17512433.2018.1519391)
- **Level:** V2 [E2, F2]
- **Verification log:** Q-16. Output: "any mechanism of lowering plasma LDL particle concentration should reduce the risk ... proportional to the absolute reduction in LDL-C and the cumulative duration of exposure"; the panel summarised "more than 200 prospective cohort studies, Mendelian randomization studies, and randomized trials ... more than two million participants ... more than 150,000 cardiovascular events"
- **Type / tier / design level:** Consensus statement · Tier 2 · Level VII (expert consensus over pooled evidence)
- **Key finding(s), confirmed figures only:** Effect on ASCVD events scales with the absolute LDL-C reduction and with the duration of exposure (summary of more than 200 studies, more than 2 million participants, more than 150,000 events). Relevant to dose-by-duration scaling; no hazard ratio given
- **Epistemic label:** [SUPPORTED] (contested by the contrarian review listed in the same results, content not seen)
- **Stake / COI:** panel funding and members' interests not displayed
- **Pair:** contrarian review, title only (not carded; content not seen)
- **Use in report:** SQ2 · context (exposure-duration scaling)

### W2-13 · Smoking cessation and life-years gained (Jha et al., US)
- **Citation (APA 7):** Jha, P., Ramasundarahettige, C., Landsman, V., et al. (2013). 21st-century hazards of smoking and benefits of cessation in the United States. *New England Journal of Medicine, 368*, 341-350.
- **Identifiers seen in live results:** [DOI 10.1056/NEJMsa1211128](https://www.nejm.org/doi/full/10.1056/NEJMsa1211128) · [PMID 23343063](https://pubmed.ncbi.nlm.nih.gov/23343063/) · related, figures not seen: [NEJM Evidence 2024 cessation paper](https://evidence.nejm.org/doi/full/10.1056/EVIDoa2300272), [Lancet UK one-million-women paper](https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(12)61720-6/fulltext)
- **Level:** V2 [E2, F2] for this paper's figures. **Claim-level convergence with W2-14: V3 [E2, F3]** (below)
- **Verification log:** Q-20 (publisher, PubMed filter): "quit smoking at 25 to 34, 35 to 44, or 45 to 54 years of age gained about 10, 9, and 6 years of life", attributed to "Jha ... N Engl J Med 2013". Q-22 repeats "about 10 years" for ages 25-34 and "about 90%", but names the source only as "another study" and separately names a 2024 Jha paper without tying figures to it
- **Type / tier / design level:** Journal article · Tier 1 · Level IV (large cohort linked to deaths)
- **Key finding(s), confirmed figures only:** Life-years gained versus continuing smokers: about 10 (quit at 25-34), 9 (35-44), 6 (45-54). Current smokers lost more than 10 years versus never smokers. Probability of surviving from 25 to 79: 70% versus 38% in women and 61% versus 26% in men (never versus current smokers). Cessation before 40 reduces the death risk associated with continued smoking by about 90%. Not hazard ratios; follow-up not shown. Two unattributed statements in Q-22 (a 12-year gain in survival to 80 for quitting before 40; mortality back to non-smoker level by the third year) are not carded
- **Claim-level convergence (v2.1):** Q-20 (Jha et al.) and Q-21 (Doll et al., W2-14) are separately worded queries whose outputs each name a different-authorship primary source, both in the link lists (nejm.org and PubMed; PMC). They give matching magnitudes for different cohorts: quit at about 30, 40, 50 gains about 10, 9, 6 years (W2-14) and quit at 25-34, 35-44, 45-54 gains about 10, 9, 6 years (W2-13). Age bands and cohorts differ; the claim is approximate
- **Epistemic label:** [ESTABLISHED]
- **Stake / COI:** none seen; not displayed
- **Pair:** W2-14 (concordant). No sceptical source was searched
- **Use in report:** SQ2 · human anchor (a large, age-dependent life-years effect of removing a hazard)

### W2-14 · Smoking cessation and life-years gained (Doll et al., British doctors)
- **Citation (APA 7):** Doll, R., Peto, R., Boreham, J., & Sutherland, I. (2004). Mortality in relation to smoking: 50 years' observations on male British doctors. *BMJ, 328*, 1519-1527.
- **Identifiers seen in live results:** [PMC1732608](https://pmc.ncbi.nlm.nih.gov/articles/PMC1732608/) · [ResearchGate record (authors, volume, pages)](https://www.researchgate.net/publication/8495363_Doll_R_Peto_R_Boreham_J_Sutherland_IMortality_in_relation_to_smoking_50_years'_observations_on_male_British_doctors_BMJ_328_1519-1527)
- **Level:** V2 [E2, F2]; claim-level convergence with W2-13 (see there)
- **Verification log:** Q-21 (the query text listed the ages 60, 50, 40, 30 but not the years gained). Output: "stopping at age 60, 50, 40 or 30 years gained about 3, 6, 9 or 10 years of life expectancy, respectively", attributed to "Doll and colleagues ... BMJ in 2004"
- **Type / tier / design level:** Journal article · Tier 1 · Level IV (50-year cohort)
- **Key finding(s), confirmed figures only:** Men born 1900-1930 who smoked cigarettes continuously died about 10 years younger than lifelong non-smokers. Stopping at 60, 50, 40 or 30 gained about 3, 6, 9 or 10 years of life expectancy. Not hazard ratios
- **Epistemic label:** [ESTABLISHED]
- **Stake / COI:** none seen
- **Pair:** W2-13 (concordant)
- **Use in report:** SQ2 · human anchor

### W2-15 · SELECT: semaglutide in obesity or overweight with CVD, no diabetes
- **Citation (APA 7):** Lincoff, et al. (2023). Semaglutide and cardiovascular outcomes in obesity without diabetes. *New England Journal of Medicine*. https://doi.org/10.1056/NEJMoa2307563 (author and year from the protocol lead list; not displayed in outputs)
- **Identifiers seen in live results:** [NEJM](https://www.nejm.org/doi/full/10.1056/NEJMoa2307563) · [PMC11544414](https://pmc.ncbi.nlm.nih.gov/articles/PMC11544414/) (review) · mortality analysis [JACC](https://www.jacc.org/doi/10.1016/j.jacc.2024.08.007) · NCT03574597 ([registry document](https://cdn.clinicaltrials.gov/large-docs/97/NCT03574597/SAP_003.pdf); design only, sponsor-entered)
- **Level:** V2 [E2, F2]. Sources for the same figure are the trial paper and analyses by the same trial team, plus news; no independent primary source states it
- **Verification log:** Q-23: "375 (4.3%) ... 458 (5.2%) ... hazard ratio of 0.81 (95% CI: 0.71-0.93)"; mean follow-up 39.8 months. Q-24: "lower rates of all-cause death (19% reduction)"; 833 deaths in 3.3 y. Q-25: CV death "223 patients (2.5%) ... 262 (3.0%) ... 0.85 (95% CI, 0.71 to 1.01; P=0.07)"; later endpoints "hypothesis generating". Q-24 and Q-25 were leading (numbers in the query text)
- **Type / tier / design level:** Journal article · Tier 1 · Level II (RCT)
- **Key finding(s), confirmed figures only:** **All-cause death** HR 0.81 (0.71-0.93), nominal: the prespecified hierarchy tested CV death first (HR 0.85, 0.71-1.01; P=0.07), so later comparisons are hypothesis-generating. MACE HR 0.80 (0.72-0.90). 17,604 participants aged 45+, BMI 27+, established CVD, no diabetes; mean follow-up 39.8 months. Drug dose omitted (protocol boundary)
- **Epistemic label:** [SUPPORTED]
- **Stake / COI:** sponsor not displayed; manufacturer sponsorship is believed from background knowledge and is unverified. Registry documents are sponsor-entered and were used for design and existence only
- **Pair:** none found after 3 queries (no negative mortality trial seen; the nominal status is the main counterweight)
- **Use in report:** SQ2 · human anchor (drug-based, nominal all-cause)

### W2-16 · SURPASS-CVOT: tirzepatide versus dulaglutide
- **Citation (APA 7):** [Authors not displayed]. (2025). Cardiovascular outcomes with tirzepatide versus dulaglutide in type 2 diabetes. *New England Journal of Medicine, 393*, 2409-2420. https://doi.org/10.1056/NEJMoa2505928
- **Identifiers seen in live results:** [NEJM abstract](https://www.nejm.org/doi/abs/10.1056/NEJMoa2505928) · [ACC journal scan, 2026-01-07](https://www.acc.org/latest-in-cardiology/journal-scans/2026/01/07/14/20/surpass-cvot) (pointer)
- **Level:** V2 [E2, F2]
- **Verification log:** Q-27. "hazard ratio for all-cause mortality comparing tirzepatide to dulaglutide was 0.84, with confidence intervals ranging from 0.75 to 0.94"; "10.2% ... dulaglutide ... 8.6% ... tirzepatide"; median follow-up 4 y; the output adds that hierarchical testing precludes strict claims of significance
- **Type / tier / design level:** Journal article · Tier 1 · Level II (active-comparator RCT)
- **Key finding(s), confirmed figures only:** **All-cause death** HR 0.84 (0.75-0.94), 8.6% versus 10.2%; 6,586 versus 6,579 participants; median follow-up 4 y; nominal. The comparator is another GLP-1 receptor agonist, not placebo
- **Epistemic label:** [SUPPORTED] (nominal)
- **Stake / COI:** sponsor not displayed (manufacturer sponsorship believed from background; unverified)
- **Pair:** none found after 1 query
- **Use in report:** SQ2 · pathway evidence (relative to an active comparator)

### W2-17 · EMPA-REG OUTCOME: empagliflozin in type 2 diabetes
- **Citation (APA 7):** Zinman, et al. (2015). Empagliflozin, cardiovascular outcomes, and mortality in type 2 diabetes. *New England Journal of Medicine*. https://doi.org/10.1056/NEJMoa1504720 (initials, volume and pages not displayed)
- **Identifiers seen in live results:** [NEJM](https://www.nejm.org/doi/full/10.1056/NEJMoa1504720) · [PMID 26378978](https://pubmed.ncbi.nlm.nih.gov/26378978/)
- **Level:** V2 [E2, F2]
- **Verification log:** Q-28 (publisher, PubMed, registry filter; query text had no numbers). "significant risk reduction of all-cause mortality by 32% (HR 0.68; 95% CI 0.57, 0.82)", attributed to EMPA-REG OUTCOME (Zinman and colleagues, NEJM 2015). The output gives both "over 4600 patients" and "7020 patients"; the former is probably the empagliflozin arms (unresolved, C-8)
- **Type / tier / design level:** Journal article · Tier 1 · Level II (RCT)
- **Key finding(s), confirmed figures only:** **All-cause death** HR 0.68 (0.57-0.82). Type 2 diabetes with high CV risk; 7,020 patients; median treatment duration 2.6 y; ended after 691 major adverse CV events. The class-level all-cause figure is not confirmed (C-6)
- **Epistemic label:** [SUPPORTED]
- **Stake / COI:** sponsor not displayed (manufacturer sponsorship believed from background; unverified)
- **Pair:** the class-level statement in Q-29 that SGLT2 inhibitors "did not significantly reduce overall all-cause mortality" (unattributed; see C-6)
- **Use in report:** SQ2 · pathway evidence

---

## 4. Event log (V1 dated announcements)

None recorded. News link titles (TCTMD, 2 Minute Medicine, Healio, CIDRAP, Medscape, Cardiology Advisor) were used only as pointers or for direction, never for figures.

---

## 5. Contradictions and counter-evidence

- **C-1 · SPRINT all-cause HR depends on the window.** 0.73 (0.60-0.90) at median 3.26 y (W2-01, Q-01); "25% lower" as 1.06 versus 1.41 per 100 person-years, HR not shown (W2-02, Q-06); 0.83 (0.68-1.00) for the "trial period", then 1.08 (0.94-1.23) over 8 post-trial years and 0.96 (0.89-1.04) overall (W2-03, Q-03). The outputs do not explain why the "trial period" HR differs from the original and final reports (different cut-offs or definitions are plausible, unconfirmed). Q-02 also gives both 3.26 y and 3.33 y median follow-up. Resolve against primary text.
- **C-2 · Cochrane statin figure.** The Q-18 output calls 0.86 (0.79-0.94) an odds ratio, the query said RR, and Q-10 gives RR 0.84 (0.73-0.96) for the 2011 version (14 trials, 34,272) versus 18 trials and 56,934 in 2013. Q-18 was a leading query (W2-09).
- **C-3 · Statin framing.** Relative effect per mmol/L over about 5 y (RR 0.90; W2-06, W2-07) and 0.86 (W2-09) versus median postponement of death of 3.2 and 4.1 days inside 2.0-6.1 y windows (W2-10). Different metrics, not a numerical conflict; the sceptical reading uses the second. Do not read "days postponed inside a trial" as a lifetime gain.
- **C-4 · FOURIER versus per-mmol/L expectation.** LDL-C fell to a median of 30 mg/dL yet CV death was "similar" at 2.2 y (W2-11), while CTT reports all-cause RR 0.90 per mmol/L over about 5 y (W2-06) and the EAS statement says effect scales with exposure duration (W2-12). A duration explanation is possible and not tested by any output [SPECULATIVE].
- **C-5 · LDL causality.** EAS consensus (W2-12) versus a contrarian review whose title appears in Q-16 (content not seen).
- **C-6 · SGLT2 class-level all-cause mortality (summary self-contradiction).** The Q-29 output says SGLT2 inhibitors "did not significantly reduce overall all-cause mortality" (significant in adults over 65) and, elsewhere, reduced all-cause death "HR 0.89, 95%-CI 0.83-0.94" in a "comprehensive meta-analysis of 14 trials". Neither statement names its paper. EMPA-REG's 0.68 (W2-17) would be larger than a class-level 0.89.
- **C-7 · Nominal all-cause results.** SELECT (W2-15) and SURPASS-CVOT (W2-16) all-cause death sit below a hierarchy break or outside strict testing. SELECT's 0.81 / "19% reduction" is stated consistently across Q-23, Q-24 and Q-25.
- **C-8 · EMPA-REG size.** "over 4600 patients" and "7020 patients" in one output (W2-17); unresolved.
- **C-9 · BPLTTC output.** The all-cause HR 1.00 (0.90-1.11) for age 85+ is not tied to a named paper, and a "Department of Error" notice was listed (W2-05, Q-04). Treated as unconfirmed.
- **Steel-man coverage.** Sceptical counterparts were sought only for statins (W2-10), LDL (W2-12) and SPRINT persistence (W2-03). None were searched for smoking, GLP-1 or SGLT2 drugs because of the cap.

---

## 6. Not cited (V0)

**6a. Believed relevant, not searched (search cap reached).** Named in the protocol lead list or general background; unverified; none may be cited.
- Vaccines: influenza and shingles vaccination outcome studies; other adult vaccines.
- Cancer screening: the National Lung Screening Trial and other screening trials with mortality outcomes.
- Polypill strategies; exercise and fitness (Mandsager et al. 2018 lead); diet and lifestyle composites (Fadnes et al. 2022; Li et al. 2018; Life's Essential 8, Lloyd-Jones et al. 2022).
- Explained decline in coronary and cardiovascular deaths (Ford et al. 2007 lead) and any attribution analyses.
- Life tables: US (CDC/NCHS; Social Security period table), UK ONS, Human Mortality Database; e(50), e(65), 10-40 y survival probabilities (Q-34 refused).
- Biological-age tests (Higgins-Chen et al. 2022 lead; consumer-test comparisons); regulatory actions on anti-ageing claims (FTC, FDA); independent reviews of longevity clinics.
- Midlife risk-factor change and the probability of reaching very old age.
- Class-level all-cause meta-analyses for GLP-1 receptor agonists and SGLT2 inhibitors (Q-30 to Q-32 refused).
- Sceptical or null-result trials for any pathway (not searched).

**6b. Seen in link lists, title only; no figure obtained (E2 for the record; not cited as findings).**
- GLP-1 and SGLT2: "Cardiovascular, mortality, and kidney outcomes with GLP-1 receptor agonists in type 2 diabetes" (citation given in the Q-26 summary; the paper itself was not in the list); "GLP-1 receptor agonists lower risk of cardiovascular and non-cardiovascular mortality: a meta-analysis of eleven cardiovascular outcome trials" (PubMed 40342232, Q-26); "Effects of GLP-1 receptor agonists on kidney and cardiovascular disease outcomes" (Lancet Diabetes Endocrinol, PII S2213-8587(24)00271-7, Q-26); SMART-C meta-analyses (Circulation CIRCULATIONAHA.124.069568; Lancet Diabetes Endocrinol PII S2213-8587(24)00155-4; Q-29); "The Effect of Semaglutide on Mortality and COVID-19-Related Deaths: An Analysis From the SELECT Trial" (JACC; content seen only through news summaries, Q-24).
- Statins and lipids: "Identifying optimal primary prevention interventions for major cardiovascular disease events and all-cause mortality: a systematic review and hierarchical network meta-analysis of RCTs" (PMC12376007, Q-10, a possible cross-intervention comparison); "Statin use in older people primary prevention on cardiovascular disease" (PMC11273788, Q-10); "The role of lipid lowering medications in the primary prevention of cardiovascular disease and mortality" (PubMed 41864911, Q-12); "Intensive LDL cholesterol-lowering treatment beyond current recommendations ... 327,037 participants" (Lancet Diabetes Endocrinol, Q-17); "Statins and mortality: the untold story" (PubMed 27921324, Q-19, a sceptical commentary).
- Blood pressure: "Trial of Intensive Blood-Pressure Control in Older Patients with Hypertension" (NEJM NEJMoa2111437, Q-02); "SPRINT Revisited. Updated Results and Implications" (PMC8824314); "Age-specific relevance of usual blood pressure to vascular mortality" (Lancet, Q-07); "Blood pressure-lowering efficacy of antihypertensive drugs and their combinations" (Lancet PII S0140-6736(25)00991-2, Q-04).
- Smoking: "Smoking Cessation and Short- and Longer-Term Mortality" (NEJM Evidence, Q-20, Q-22); the Lancet one-million-UK-women paper (Q-22); "Life Gain in Italian Smokers Who Quit" (PMC3986982, Q-20); "The hazards of smoking and the benefits of cessation: A critical summation of the epidemiological evidence in high-income countries" (PMC7093109, Q-22); "Childhood Smoking, Adult Cessation, and Cardiovascular Mortality" (PMC7763404, Q-22).

---

## 7. Search log

All queries dated 2026-09-29. Filter = `allowed_domains` supplied to the tool. Link lists are as returned; off-topic links are flagged. Q-07 and Q-23 were expanded by the tool into several internal sub-searches; their link lists are the union.

| ID | Query (verbatim) | Filter | Links returned (origin class) | Notes |
|---|---|---|---|---|
| Q-01 | SPRINT trial intensive blood pressure control all-cause mortality hazard ratio 0.73 Wright 2015 New England Journal of Medicine | none | ahajournals.org [PUB]; pubmed [PM] 26551272; PMC [PMC] x3 (PMC11713828 x2, PMC8824314); 2minutemedicine.com [NEWS]; nejm.org [PUB] NEJMoa1901281; arxiv.org [PRE] x3 (off-topic) | Leading. W2-01 |
| Q-02 | Systolic Blood Pressure Intervention Trial death from any cause intensive treatment group results NEJM | none | nejm.org [PUB] x4; doi.org [PUB] x2; wikipedia [ENC]; biolincc.nhlbi.nih.gov [OFS]; clinicaltrials.gov [REG] (IBIS trial, off-topic) | W2-01, W2-02 |
| Q-03 | SPRINT post-trial follow-up long-term mortality intensive blood pressure treatment hazard ratio all-cause death | none | PMC [PMC] x2 (PMC11713828); 2minutemedicine.com [NEWS]; alz-journals.onlinelibrary.wiley.com [PUB]; tctmd.com [NEWS]; nejm.org [PUB] x2; ahajournals.org [PUB]; about.ebsco.com [ORG] | W2-03; source not named in output |
| Q-04 | Blood Pressure Lowering Treatment Trialists' Collaboration Lancet 2021 pharmacological blood pressure lowering individual participant data meta-analysis 5 mm Hg | none | gpnotebook.com [AGG]; acc.org [ORG]; thelancet.com [PUB] x6; PMC8165755 [PMC] ("Department of Error") | Citation, "48 trials"; no 5 mm Hg figure. W2-05 |
| Q-05 | Ettehad Lancet 2016 blood pressure lowering for prevention of cardiovascular disease and death systematic review meta-analysis all-cause mortality | none | pubmed [PM] x2; thelancet.com [PUB] x4; ghdx.healthdata.org [INST]; semanticscholar.org [AGG]; cdn.clinicaltrials.gov [REG] (off-topic) | Authors, volume, pages; no figure. W2-04 |
| Q-06 | Lewis 2021 SPRINT final report intensive versus standard blood-pressure control primary outcome and death from any cause hazard ratio | none | tctmd.com [NEWS]; PMC8824314 [PMC]; nejm.org [PUB] x3; researchgate.net [AGG]; pubmed [PM] x2; clinicaltrials.gov [REG] NCT01206062 | W2-02 |
| Q-07 | Blood Pressure Lowering Treatment Trialists' Collaboration 2021 relative risk of major cardiovascular events per 5 mm Hg systolic reduction all-cause mortality | none | Union of 4 sub-searches: thelancet.com [PUB] many; ahajournals.org [PUB] x4; journals.plos.org [PUB] x2; sciencedirect.com [PUB]; acpjournals.org [PUB]; pubmed [PM] 28564682; PMC [PMC] (PMC9288358, PMC12529973); gpnotebook.com, doaj.org, emergencymed.org.il [AGG]; consultant360.com, thecardiologyadvisor.com [NEWS]; arxiv.org [PRE] and cdn.clinicaltrials.gov [REG] (off-topic) | W2-05 |
| Q-08 | Ettehad 2016 every 10 mm Hg reduction in systolic blood pressure relative risk all-cause mortality stroke coronary heart disease | none | pubmed [PM] 26724178; sciencedirect.com [PUB]; ahajournals.org [PUB]; thelancet.com [PUB] x2; PMC12032999 [PMC]; researchgate.net [AGG]; hero.epa.gov [OFS]; arxiv.org [PRE] (off-topic) | W2-04 |
| Q-09 | Cholesterol Treatment Trialists' Collaboration 2010 Lancet more intensive lowering of LDL cholesterol all-cause mortality per 1.0 mmol/L reduction | none | thelancet.com [PUB] x3; pace-cme.org [AGG]; research-portal.uea.ac.uk [INST]; pubmed [PM] 21067804; cttcollaboration.org [INST]; cdn.clinicaltrials.gov [REG] x2 (off-topic) | Design only; no all-cause figure. W2-06 |
| Q-10 | Cochrane review statins for primary prevention of cardiovascular disease all-cause mortality risk ratio Taylor | none | cochranelibrary.com [PUB] x2; cochrane.org [PUB]; PMC [PMC] x2 (PMC12376007, PMC11273788); journals.plos.org [PUB]; primarycarenotebook.com [AGG]; unav.edu, researchonline.lshtm.ac.uk [INST] | 2011 version figure. W2-09 |
| Q-11 | Kristensen statins effect on average survival randomised trials postponement of death BMJ Open | none | mendeley.com, researchgate.net [AGG]; pubmed [PM] x2 (31073857, 26408281); portal.findresearcher.sdu.dk, antonpottegaard.dk [INST]; PMC [PMC] x3 (PMC6667545; two off-topic) | W2-10 |
| Q-12 | CTT Collaboration 26 randomised trials 170,000 participants all-cause mortality reduction per mmol/L LDL cholesterol lowered five years | none | ctsu.ox.ac.uk, cttcollaboration.org [INST]; researchgate.net [AGG]; thelancet.com [PUB] x2; ncbi.nlm.nih.gov/books [PMC]; pubmed [PM] x2; PMC4906243 [PMC] | Earlier CTT 12% figure. W2-06, W2-08 |
| Q-13 | Cholesterol Treatment Trialists 2012 Lancet low-risk individuals 27 randomised trials major vascular events all-cause mortality per mmol/L | none | discovery.dundee.ac.uk, research.monash.edu [INST]; thelancet.com [PUB] x4; pubmed [PM] x2; clinicaltrials.gov, cdn.clinicaltrials.gov [REG] x2 (off-topic) | W2-08 |
| Q-14 | Cochrane Database Systematic Reviews 2013 Taylor statins primary prevention update authors' conclusions all-cause mortality cardiovascular events | none | cochrane.org [PUB]; cochranelibrary.com [PUB] x2; unav.edu, researchonline.lshtm.ac.uk [INST]; gpnotebook.com [AGG]; pubmed [PM] 28469714; medrxiv.org [PRE]; PMC6481400 [PMC] | Authors; 18 trials, 56,934. W2-09 |
| Q-15 | FOURIER trial evolocumab NEJM 2017 death from any cause cardiovascular death hazard ratio median follow-up 2.2 years | none | nejm.org [PUB] x3; ahajournals.org [PUB]; tctmd.com [NEWS]; timi.org [INST]; acc.org [ORG]; cursoactualidadesendislipidemias.com [AGG]; PMC5469080 [PMC] | Leading (2.2 years). W2-11 |
| Q-16 | Ference 2017 European Heart Journal LDL cholesterol causal cardiovascular consensus statement cumulative exposure Mendelian randomization | none | academic.oup.com [PUB] x2; tandfonline.com [PUB] (contrarian review); mendeley.com [AGG]; tctmd.com [NEWS]; utsouthwestern.elsevierpure.com [INST]; escardio.org [ORG]; dralo.net [BLOG]; PMC10573184 [PMC] (off-topic) | W2-12 |
| Q-17 | Efficacy and safety of more intensive lowering of LDL cholesterol 26 randomised trials all-cause mortality rate ratio | pubmed.ncbi.nlm.nih.gov, cttcollaboration.org, thelancet.com | pubmed [PM] x5; thelancet.com [PUB] x3; cdn.clinicaltrials.gov [REG] (off-topic) | Figure stated. W2-06 |
| Q-18 | statins primary prevention Cochrane 2013 all-cause mortality RR 0.86 95% CI 0.79 to 0.94 | pubmed.ncbi.nlm.nih.gov, cochranelibrary.com, cochrane.org | cochranelibrary.com [PUB] x2; cochrane.org [PUB]; pubmed [PM] x5; PMC11273788 [PMC] | Leading; "OR" in output. W2-09 |
| Q-19 | Efficacy and safety of LDL-lowering therapy among men and women 174,000 participants 27 randomised trials all-cause mortality per mmol/L | pubmed.ncbi.nlm.nih.gov, thelancet.com | pubmed [PM] x5 (incl. 25579834, 16214597, 27921324); thelancet.com [PUB] x4 | W2-07 |
| Q-20 | 21st-century hazards of smoking and benefits of cessation in the United States Jha NEJM 2013 years of life gained quitting by age | pubmed.ncbi.nlm.nih.gov, nejm.org, ncbi.nlm.nih.gov | evidence.nejm.org [PUB] x2; nejm.org [PUB] x3; pubmed [PM] 23343063; PMC [PMC] x2; cdn.clinicaltrials.gov [REG] (off-topic) | W2-13 |
| Q-21 | Mortality in relation to smoking: 50 years' observations on male British doctors Doll BMJ 2004 stopping at age 60 50 40 30 gained years | none | nature.com [PUB]; PMC [PMC] x4 (PMC1732608); pubmed [PM] 15668706; medscape.com [NEWS]; researchgate.net [AGG]; ctsu.ox.ac.uk [INST]; wikipedia [ENC] | W2-14 |
| Q-22 | Jha smoking cessation before age 40 avoid excess mortality 90% cessation before 40 nearly 10 years life gained US National Health Interview Survey | none | evidence.nejm.org [PUB] x2; nejm.org [PUB]; thelancet.com [PUB]; pubmed [PM]; PMC [PMC] x2; medscape.com, respiratory-therapy.com [NEWS] | Leading. W2-13 |
| Q-23 | SELECT trial semaglutide cardiovascular outcomes overweight obesity without diabetes Lincoff NEJM 2023 death from any cause hazard ratio | pubmed.ncbi.nlm.nih.gov, nejm.org, ncbi.nlm.nih.gov, clinicaltrials.gov | Union of 2 sub-searches (19 links): PMC [PMC] x10; pubmed [PM] x6; nejm.org [PUB] x3 | W2-15 |
| Q-24 | semaglutide SELECT results all-cause death lower risk median follow-up 39.8 months 17,604 participants | none | jacc.org, sciencedirect.com [PUB]; PMC11544414 [PMC]; massgeneralbrigham.org [NEWS, press office]; ddw-online.com, healio.com, drugtopics.com, docwirenews.com, cidrap.umn.edu [NEWS] | Leading. W2-15 |
| Q-25 | SELECT semaglutide hierarchical testing death from any cause not formally tested cardiovascular death 0.85 confirmatory secondary endpoints | none | jacc.org, sciencedirect.com [PUB] x3; nejm.org [PUB] x2; PMC11544414 [PMC]; cdn.clinicaltrials.gov [REG] x3; medscape.com [NEWS] | Leading. W2-15 |
| Q-26 | Sattar 2021 GLP-1 receptor agonists cardiovascular outcomes trials meta-analysis all-cause mortality type 2 diabetes Lancet Diabetes Endocrinology | pubmed.ncbi.nlm.nih.gov, thelancet.com, ncbi.nlm.nih.gov | pubmed [PM] 40342232; PMC [PMC] x5; thelancet.com [PUB]; clinicaltrials.gov [REG] x2 (off-topic) | No figure obtained (6b) |
| Q-27 | SURPASS-CVOT tirzepatide versus dulaglutide all-cause death hazard ratio NEJM 2025 | none | nejm.org [PUB]; pubmed [PM] 41903177; acc.org [ORG]; tctmd.com, cardiocaretoday.com [NEWS]; clinicaltrials.gov [REG] x4 (unrelated claims-data study) | W2-16 |
| Q-28 | EMPA-REG OUTCOME empagliflozin death from any cause hazard ratio Zinman NEJM 2015 median follow-up | pubmed.ncbi.nlm.nih.gov, nejm.org, ncbi.nlm.nih.gov, clinicaltrials.gov | nejm.org [PUB] x4; pubmed [PM] x3; PMC4872285 [PMC]; cdn.clinicaltrials.gov [REG] x2 | W2-17 |
| Q-29 | SGLT2 inhibitors all-cause mortality meta-analysis large placebo-controlled trials SMART-C Lancet 2022 diabetes heart failure kidney disease | none | ahajournals.org, amjmed.com, thelancet.com x2, diabetesresearchclinicalpractice.com [PUB]; PMC [PMC] x3; acc.org [ORG] | Self-contradictory summary (C-6) |
| Q-30 | GLP-1 receptor agonists lower risk of cardiovascular and non-cardiovascular mortality meta-analysis of eleven cardiovascular outcome trials all-cause mortality | pubmed.ncbi.nlm.nih.gov, ncbi.nlm.nih.gov | none: **not performed** (session cap 200/200) | |
| Q-31 | Zelniker 2019 Lancet SGLT2 inhibitors for primary and secondary prevention of cardiovascular and renal outcomes in type 2 diabetes meta-analysis all-cause mortality | pubmed.ncbi.nlm.nih.gov, thelancet.com, ncbi.nlm.nih.gov | none: **not performed** | |
| Q-32 | Sodium-Glucose Cotransporter-2 Inhibitors and Major Adverse Cardiovascular Outcomes SMART-C collaborative meta-analysis all-cause mortality hazard ratio | ahajournals.org, pubmed.ncbi.nlm.nih.gov, ncbi.nlm.nih.gov | none: **not performed** | |
| Q-33 | Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes SELECT abstract results primary end-point event death from any cause | pubmed.ncbi.nlm.nih.gov, nejm.org | none: **not performed** | |
| Q-34 | United States Life Tables National Vital Statistics Reports life expectancy at age 50 and age 65 latest year | cdc.gov, ssa.gov, census.gov | none: **not performed** (re-check after the coordinator's amendment; still capped) | Life-table anchor |

---

## 8. Coverage advisory

DISTRIBUTIONAL_SKEW_ADVISORY:
- Dimension: methodological distribution
- Concentration: RCT-derived evidence (trial reports, meta-analyses of RCTs, analyses of trial data) = 14/17 (82%)
- Advisory: This is a coverage-distribution signal, not a defect. It is partly by design (the human anchor is hazard ratios from trials) and partly a consequence of the search cap; observational and consensus sources are 3/17 (two smoking cohorts, one consensus statement).
- Search response: add observational cohort and life-table sources once the cap is raised (lifestyle composites, fitness, cardiovascular-mortality attribution, life tables).

DISTRIBUTIONAL_SKEW_ADVISORY:
- Dimension: intervention class (a dimension added for this file; not in the standard list)
- Concentration: cardiometabolic risk factors and drugs, plus tobacco = 17/17 (100%)
- Advisory: This is a coverage signal caused by the search cap. No vaccine, screening, polypill, exercise, diet, life-table or biological-age card exists.
- Search response: run the continuation queue in section 9.

Checked and below threshold: venue family (NEJM 7/17, 41%); publication-year decade 2010-2019 (11/17, 65%); stakeholder camp (four manufacturer-sponsored trials, believed from background and unverified, 4/17, 24%). Region is not assessable from the outputs.

---

## 9. Limitations

1. **Search cap.** The session-wide WebSearch cap (200 of 200) was reached after Q-29. Coverage is partial, as stated in the header. The tool's message says the person must raise `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` for more searches. Nothing was done to work around the cap.
2. **Summary-mediated figures.** Every figure comes from a model-written summary. Intervals, populations and follow-up were often missing; each is marked "not shown" where absent. Several summaries were internally inconsistent (C-1, C-2, C-6, C-8, C-9).
3. **v2.1 attribution rule.** Only figures whose output sentence names a source are treated as attributed. W2-03's figures are not attributed in the output (attribution inferred). No figure met F3 at the figure level; one claim-level convergence (smoking cessation) is graded V3 on the ground that two independent primary sources in separately worded queries give matching magnitudes.
4. **Leading queries.** Q-01, Q-15, Q-18, Q-22, Q-24 and Q-25 contained numbers that the summaries repeated. They are flagged in the cards. W2-09 rests only on a leading query.
5. **Sponsors and funders.** Funder and sponsor lines were not displayed in any output. Statements that four trials were manufacturer-sponsored come from background knowledge and are unverified. Under v2.1, a sponsor's own claim about its product is V2-P; here the figures come from peer-reviewed journal articles in primary domains, not company pages, press releases or registry entries, and are graded V2. The coordinator may re-grade the industry-run trials (W2-11, W2-15, W2-16, W2-17) to V2-P.
6. **Citation fields.** Authors, initials, years, volumes and pages are given only where a result displayed them or the protocol lead list named them.
7. **No conversion.** Hazard ratios and life-years are recorded as reported. Per-unit hazard ratios and within-trial-window measures need explicit assumptions before conversion.
8. **No citation chaining.** Only what the result lists offered was used; nothing was snowballed by following references.
9. **Same-family, single-agent.** No second-agent reproducibility re-run was done for W2.
10. **Tool-appended reminder.** Each search result ended with a tool-appended reminder to cite sources as markdown links. It matches the tool's documented behaviour and was treated as a formatting note; identifiers in the cards are given as links.

**Continuation queue (queued, not executed; wording is an aid and may contain errors).** Suggested for when the cap is raised, in priority order.
- (c) Life tables: NCHS "United States Life Tables" (latest year; e(50), e(65), survival from 50 to 60-90); Social Security period life table; UK ONS national life tables; Japan MHLW abridged life table; Human Mortality Database summaries.
- (a) HR gaps: influenza vaccination after myocardial infarction (all-cause death); recombinant zoster vaccine and mortality; National Lung Screening Trial all-cause mortality; meta-analysis of lifetime gain from cancer screening; Cochrane general health checks (total mortality); polypill trials (mortality or MACE); cardiorespiratory fitness and all-cause mortality; Li et al. 2018 lifestyle and life expectancy at 50; Fadnes et al. 2022 dietary change and life expectancy; Life's Essential 8; class-level meta-analyses of GLP-1 receptor agonists and SGLT2 inhibitors with all-cause death; the SELECT, SURPASS-CVOT and EMPA-REG primary papers re-queried without numbers; sceptical or null-result trials for each pathway.
- (b) Ford et al. 2007 (explaining the decline in US coronary deaths, treatments versus risk factors); other attribution analyses; stagnation of cardiovascular-mortality decline.
- (d) Higgins-Chen et al. 2022 epigenetic-clock reliability; consumer biological-age test comparisons; FTC and FDA actions on anti-ageing claims; independent reviews of longevity clinics (caution material only).
- (e) Midlife risk-factor profile and survival to age 90 or beyond.
