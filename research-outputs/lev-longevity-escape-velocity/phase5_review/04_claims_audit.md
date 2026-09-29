# Claims-to-Evidence Audit of the Report (draft v1)

| Field | Value |
|---|---|
| Reviewer | Fresh-context subagent of the same model family, role `claim_verification_agent` in a report-audit configuration; no web access; compared each claim with the evidence cards and re-ran the committed model |
| Reviewed | `../LEV_research_report.md`, draft v1 (commit `fc40bde`), against `../phase2_investigation/`, `../phase3_analysis/` and the frozen plan |
| Result | 22 discrepancies: 0 Critical, 8 Major, 14 Minor; about 195 claims checked |
| Dispositions | See the table at the end of this file |

The audit text below is subagent output, reproduced verbatim. Its statements are the reviewer's, not verified findings. Card contents were checked by the author before each correction was applied (see the dispositions).

**DISCREPANCIES**

| # | Claim (quote) | Location | Evidence or output | Sev. | Correction |
|---|---|---|---|---|---|
| 1 | "estimate survival to 100 at no more than 15% of women and 5% of men without new medical breakthroughs" (*W1-06 · V2*) | §4.1 | W1-06 (C7, §6C): 15%/5% were memory-held numbers the search did not return, "not findings". Only source is W6-05: V2-P, authors' own projection, one query, horizon and interval unstated. | Major | Cite W6-05 · V2-P, "the authors project"; drop "without breakthroughs" unless sourced. |
| 2 | "13 of 164 trials positive across 54 compounds" | §4.3, row 1 | W3-01: 54 compounds tested in 164 trials; thirteen *compounds* (not trials) positive in at least one sex, from one unattributed query (Q-04). | Major | "13 of 54 compounds (164 trials); single-query count". |
| 3 | "rapamycin +9-14% (first dose) and +23-26% median (higher dose)" | §4.3, row 1 | W3-02: 9% (M) and 14% (F) are age at 90% mortality; "median percentages: figure not confirmed". | Major | Label 90th-percentile; do not pair with median figures. |
| 4 | SPRINT "0.73 (0.60-0.90) … 3.6 (1.2-5.9)", "trial period"; "new … effect … every 3.6 years" | §4.2; §1 | W2-03 gives the SPRINT trial-period all-cause HR as 0.83 (0.68-1.00), i.e. 2.1 age-years; W2 C-1: HR depends on window (0.73/0.83/0.96). T3.csv omits 0.83. | Major | Show 0.73-0.83 (3.6-2.1 age-years; cadence 2.1-3.6 y). |
| 5 | "sustained mortality improvements of 4% a year … would need to start within a few years" | §3 | W1-02: whether "per year at all ages" is "not stated"; W8-08: "within a certain time". | Major | "4% (unit and ages unseen) … within a certain time"; qualify "half the model's threshold". |
| 6 | "27% (lecanemab) and 35-36% (donanemab)" (*W8-25 · V2*); "+36% remaining lifespan" (W8-19); "+24-27%" (W8-18) | §1, §4.3, §4.4 | W8-25 is "V2 … leading query": 27% and 35% were in Q-15's text (W8 header: echo not counted); W8-19: "the 36% was" in the query; W8-18: 24/27% came from "a patent-family or abstract source". Body drops the flag (kept only in the reference list). Same pattern, unflagged: Q-06, Q-08, Q-23 embed "about 8 years", "1 to 2 percent", "1.5 percent", behind W8-01/-02/-03 (the 4-9x anchors). | Major | Carry a "query-embedded" flag in the body; treat as unverified or re-run unled. |
| 7 | ACH row 1 "No ageing indication and no qualified ageing biomarker … (2; V1/V2 sources)", row 2, "Weighted inconsistency … 4"; "no regulator recognises ageing as an indication" | §5.5; §1 | Indication and surrogate facts are W5-14, -16, -18 (V1, "not a finding"); W5-13 (V2) says only that the IND route applies. Row 2 is an absence claim from W5 Table P1 ("a sample, not a census"). Both I-ratings (2+2) rest on V1 or absence. W5-02 (FDA CVM reportedly accepted a dog lifespan-extension target; V2-P) cuts against "no regulator". | Major | Mark rows "not established"; show O3 without the V1 row (= 2); limit §1 to "FDA, EMA, ICD-11 (V1)". |
| 8 | RC2 "Sirtuin activators… (*W8-12 · V1*)"; RC4 "TAME… ICD-11 dropped 'old age' (V1)"; "ICD-11 replaced 'old age' with 'ageing-associated decline in intrinsic capacity'"; "took 21 years … and 31 years" | §5.2; §5.3 | W8-12, W5-12, W5-16 are V1 "pointers, not findings"; W5-16: only the title is seen, replacement wording unattributed. W5-34/-35: dates unattributed, "if correct". Rows then assign directions ("Optimists wrong", "Institutional friction"). | Major | Move to pointers or write "reportedly"; assign no direction on V1 alone. |
| 9 | "Conquering heart disease and cancer alone would not deliver LEV … `[ESTABLISHED]` arithmetic" | §4.4 | No cause-elimination run (W1 must-answer (e) "not found"; no such table in T1-T6); shares are W8-27 (V1). | Minor | Label `[SPECULATIVE]`. |
| 10 | "every 3-4 years"; "within one to two decades"; "an SGLT2 inhibitor about 4.4" | §1 | T3: cadence equals g, 1.2-4.4 y across central estimates (3.6 only for SPRINT). T4: 2% unimproved lasts 20-42 y; 5% at 4%/y lasts 31 y. W2-17/C-6: class-level SGLT2 figure unconfirmed (unattributed HR 0.89); 4.4 is one trial. | Minor | State the conditions. |
| 11 | "roughly 27 years for someone who is 80 at onset" | §3 | T5: 26.8 only after 20 y of 1.5%/y pre-onset improvement (age 60 now); frozen-2026 mortality gives 19.8. | Minor | State the assumption. |
| 12 | "a ramp reaching the threshold by 2045 is O3 (onset 2040)"; "5% … a 13-year escape" | §5.4 (cf. §4.4) | T6 S-C is a ramp to 1.3x the threshold by 2045. §4.4/T4 gives 12 y for the same 5%/0% cell: T4 ramp is 20 y (to 2046), T6 19 y; both described "by 2045". | Minor | Harmonise ramp and wording. |
| 13 | "its four expected observations by 2030" | §5.4 | S2/O2 lists three (omits post-2019 pace above v_hi, plan §9); S1 "at or below the historical range" vs plan v_hi (2.6%, above the 1-2% historical). | Minor | List all four; use v_hi. |
| 14 | "Summing every human effect above … 10-20 age-years" | §4.2 | No output. T3: six HR rows sum to 15.3; with smoking (10) and lifestyle (12-14) about 38. Typo "which is which is". | Minor | State what is summed. |
| 15 | "physical activity and diet … worth roughly 1-5 age-years each in trials" | §6 | No trial card: W2 §6a lists exercise and diet as not searched; only W8-17 (observational composite). | Minor | Remove or attribute to observational data. |
| 16 | "consumer 'biological age' tests are unreliable (… *W5-20*)"; "clocks are unreliable" | §6; §4.3 | W5-20: six research clocks, replicate noise up to 9 y, PC versions mostly within 1 y; consumer tests not searched (W2 (d)). | Minor | Restrict to research clocks. |
| 17 | PEARL "safe"; RMR1 "one summary calls … additive, another reports synergy"; "Effects shift the middle … more than the maximum" | §4.3 | W8-21: adverse events "similar across arms". W3 C4: additive and synergy are in one output (Q-14). W3: female acarbose (median 5%, P90 9%) goes the other way. | Minor | Reword. |
| 18 | "The two expert surveys seen"; "Kaeberlein, Barzilai (cautious)"; "(2021 statement)"; "about 2029-2040" | §5.1; §1 | One survey carded (W8-10); W6 (b) not searched. W6: Barzilai "not classified", no LEV statement. W6 C-1: date 2021 vs 2023. No row gives 2029 (W6 C-2: mixed with human-level-AI 2029). | Minor | Fix count, label, date and range. |
| 19 | "$18.4 billion vs $8.49 billion vs 'over $30 billion'" | §5.3 | W5 E-13: $18.4 bn is 2025, $8.49 bn is 2024; like-for-like conflict is $4.7 bn vs $8.49 bn (2024). | Minor | Add years. |
| 20 | RC3 "First-in-class chronic-disease drugs": 7.9%, 6.7%, "median 8 years" | §5.2 | W5-27/-28/-32 are all-modality or all-area; W5 §2(d): "no chronic-disease-specific figure"; W5-27/-28 are V2-P (level absent in body). | Minor | Relabel "all-area"; add V2-P. |
| 21 | "The first human dosing of a partial-reprogramming therapy … was reported on 9 June 2026"; "Hevolution more than $400 million committed" | §1; §5.3 | W4-09/W5-01: company release only, "first" is self-described; W5-24: foundation self-report as of June 2024; Retro's $1.8 bn (W5-26, V2-P) untagged. | Minor | Name the reporter and as-of date. |
| 22 | "No figure reached V3" | header; §1 | W2 header records one claim-level V3 (smoking cessation, W2-13 + W2-14); report tags V2 and omits W2-14. | Minor | Note it or cite W2-14. |

**Could not trace**
- §5.4 S2 "3-4% a year for decades"; S3 "human proof by about 2032; approval by about 2040", "3-4 age-years about every 3-4 years"; S4 "shifted by two to four decades": no plan, card or CSV (T6 tests only a 4%/y ramp).
- §1/§8 "no support for LEV onset before the mid-2030s": boundary not derived in any output.
- §4.3 "Parabiosis lineage" (no card); §4.2 "the same interventions do not stack indefinitely"; §6 "no revival has been demonstrated".
- Reference list: Palella and DOI (W8-14), Ford DOI (W8-15), Fuentealba and DOI (W8-22), Fahy DOI (W8-23), "Yang, J.-H." (W4-10) and "Beyond Six Billion" (W8-03) appear in no evidence file, despite "details are as seen in search results".
- Output files: T2.csv cites W8-14 for the women's coronary rate (should be W8-15); §4.1's "3.4-3.6% a year" is W8-15's log-rate, while T2.csv gives 3.3-3.5%.

**Counts:** about 195 claims checked (table cells grouped by row); 22 discrepancies (0 Critical, 8 Major, 14 Minor). All 98 cited card IDs exist; every body V-tag equals its card (W8-04's Statista row is tagged V1, more conservative than the card). Arithmetic in §3, §4.1 (ratios), §4.2 conversions, T4, T6 and the §6 race table reproduces from T1-T6 and the committed model. No item reverses a headline conclusion; row 7 is closest (the ACH score of 4 has no V2-level basis).

## Dispositions

(to be completed after the editorial review is also in and the report is revised)
