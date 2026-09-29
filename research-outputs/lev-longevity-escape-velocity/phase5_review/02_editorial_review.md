# Editorial Review of the Report (draft v1)

| Field | Value |
|---|---|
| Reviewer | Fresh-context subagent of the same model family, role `editor_in_chief_agent` (`deep-research/agents/editor_in_chief_agent.md`); no web access; worked from the files and in a scratch copy of the code |
| Reviewed | `../LEV_research_report.md`, draft v1 (commit `fc40bde`) |
| Verdict | **MAJOR REVISION**, weighted score 2.9 / 5.0 (one Critical, seven Major, five Minor items) |
| Dispositions | See the tables in the last two sections of this file (draft v1 points, then the verification of draft v2) |
| Verification | Re-review of draft v2 by the same reviewer: **MINOR REVISION**, weighted 3.4 / 5.0; one Major item (the cadence claim) and five Minor items, addressed in draft v3 |

The review text below is subagent output, reproduced verbatim. Its statements are the reviewer's, not verified findings. Where it reports its own scratch checks, the dispositions say whether the author reproduced them.

## Editorial Review

**Verdict: MAJOR REVISION.** Weighted score 2.9 / 5.0.

| Dimension | Wt | Score | Note |
|---|---|---|---|
| Originality | 20% | 3 | Useful synthesis frame; threshold arithmetic is standard |
| Rigor | 25% | 3 | Strong design, but departs from its own frozen plan |
| Evidence | 25% | 2.5 | Labels and figures outrun several cards |
| Coherence | 15% | 3 | RQ-to-conclusion holds; the "when" step is underived |
| Writing | 15% | 3 | Clear prose; dense summary; non-APA references |

The arithmetic core is sound and reproducible, and the hedging is unusually honest. The problems are a "when" verdict not derived under the frozen plan, labels and figures that outrun several cards, and a reference list whose provenance statement is inaccurate. All fixes use existing files; no new searching is needed.

### Strengths
1. Frozen definitions, logged deviations, epistemic labels and a refusal to give a probability band (§1, §5.5, §7) suit "by what dates if any".
2. Real value for lay readers: D-N versus D-1 (§2-3), "escape is not survival", and the age-year/cadence conversion that turns one-off trial effects into a rate (§4.2).
3. Reproducible. In a scratch copy 24/24 tests pass and `run_analysis.py` (seed 20260929) regenerates all eight CSVs byte-identical. Numbers in the §3, §4.1-4.2, §4.4 and §6 tables match T1-T5; exceptions are listed below.
4. Balanced: paired reference classes, stakes noted on both sides, no dosing or product advice.

### Required revisions

**Critical**
1. **"When" is not derived under the plan.** "already inconsistent with two of O3's four preconditions for 2030" (§5.5; O3 weighted inconsistency 4). Plan §9/§13 rate not-yet-due expectations N, and every 2030 expectation is not yet due on 2026-09-29. The I-ratings restore the asymmetry the DA flagged (N3) and lean on V1 pointers (W5-14, W5-18) plus absence from a truncated search with no direct registry access. Separately, "no support for LEV onset before the mid-2030s" (§1, §8) appears in no table, run or card, and §5.4 says approval "by about 2040". Fix: report the matrix under the plan (all N, not diagnostic), log any "foreclosure" reading as a deviation, and derive one date threshold explicitly.

**Major**
2. **Labels outrun evidence.** §1 tags the resistant-share result `[SUPPORTED]`; §4.4 says `[SPECULATIVE]`. "the brain is the hard case" rests on antibody slowing of decline (W8-25: a leading query, no named trial) and a V1 news share. Fix: `[AUTHOR-JUDGMENT]`; name CLARITY-AD and TRAILBLAZER-ALZ 2.
3. **Scope slip.** "In humans they have so far produced safety data and biomarker changes, not mortality data" drops §4.3's "Nothing reviewed". Semaglutide and SGLT2 inhibitors are "cardiometabolic" in §4.2 yet geroprotector candidates in the ITP row and VITAL-H (§4.3, §5.3). Fix: define the class boundary; restore "reviewed".
4. **Model inputs undisclosed.** T4-T6 depend on μ(80)=0.05, c=0.0004, r_hist 1.51%, ramp to 1.5β over 20 years, W=20, v_hi=0.30; "about 2.6% a year" (§1, §5.4) is a team-set bound (plan §13), not a measurement. Add a parameter box with source card and V-level. Show T5 as ranges: across μ(80) 0.035-0.07 the 40-year-old's "145 years" spans 105-202.
5. **Reference integrity.** The preface says details are "as seen in search results", but Fuentealba (author, title, DOI; W8-22 has none), the Palella, Ford and Fahy DOIs, and volumes/pages for Baker, Xu, Mattison, SSA and SoA are in no evidence file. Six body-cited cards (W5-03, W5-06, W5-14, W5-18, W8-01, W8-27) have no entry, including the β source; 13 entries are never cited. Fix: drop or flag unseen details; reconcile.
6. **APA 7 form.** The body cites card IDs, not author-date, and the tags clutter prose; the list is thematic, not alphabetical; entries are fused ("Colman...; Mattison...", "Marín Penella...; How 'old age'...; AFAR"); "et al." throughout although cards hold full author lists (W2-04, W3-01, W7-10); authorless entries are inconsistent ("(2025). Cardiovascular outcomes...").
7. **Ladder and plan slippage.** V1 items yield numbers (US 65+ "6.1×"), against the Blueprint's "V1 only in the event log". ICD-11 is `[CONTESTED]` in W5-16 but used one-way as an "institutional stall". RC3 is titled "First-in-class chronic-disease drugs" but holds all-drug rates and a 2002-2012 Alzheimer's rate; RC6 lacks the plan's "existence class" label. Missing: forecaster stake/source columns (§11), ACH share-of-weight (§9), composition analysis (§7), Monte Carlo distribution (F2; manifest: 14% of draws hold ≥20 years). Fix: add, or log as deviations.
8. **The "short answer" is 649 words,** opens with undefined "age-years" and omits §6. Fix: three-sentence bottom line, define age-year at first use, cap at 300 words.

**Minor**
9. Typos: "which is which is consistent" (§4.2); "(§4.2-4.3)" in §1 should be §4.3; "passed three rounds" (DA: REVISE, REVISE, PASS).
10. "Age-years, once" mixes hazard-derived values with observational life-years (10; 12-14). SPRINT's headline uses 0.73 (early-stopped); W2-03 gives 0.83 (0.68-1.00). EMPA-REG needs "class-level about 0.89, unattributed (W2 C-6)".
11. "The threshold is the same at all ages between 50 and 90" (§3) holds for constant-slope Gompertz only. My scratch check (not in the files) with log-hazard slope falling 0.10 to 0.07 gives a D-N threshold falling from 7.8% to 6.4%. Qualify it.
12. "what medicine has delivered" (§1, §4.2) credits medicine with all observed decline, mostly all-age. The GLP-1 "31 years" picks SELECT (2023); earlier outcome trials exist (my knowledge, not in the files).
13. Figures have alt-text only and relative paths that break on export; F2 is omitted. T4's "Share of hazard unimproved" clashes with "improving at 1%/yr". "$1.8 billion valuation for Retro Biosciences" is out of scope (RQ Brief).

### Contradictions with CSVs or cards
- §5.4 "a ramp reaching the threshold by 2045 is O3 (onset 2040)": T6 S-C is a ramp to 1.3β.
- §3 "roughly 27 years for someone who is 80 at onset": T5 gives 19.8 with frozen mortality (RQ Brief: about 20); 26.8 needs 20 years of 1.5% improvement first.
- §4.1 "3.4-3.6% a year" is a log-rate (W8-15); T2 shows 3.3-3.5%, the report's proportional convention. T2 cites W8-14 for women's coronary; should be W8-15.
- §4.3 "13 of 164 trials positive across 54 compounds": W3-01 says 13 compounds, unattributed (W3 C2: counts conflict).
- §4.3 "rapamycin +9-14% (first dose)": W3-02 is age at 90% mortality, not median. "17-alpha-estradiol about +12%": W3-05 also gives +19%/+11%.
- §4.3 senolytics "+36%" and "24-27%": W8-19's 36% was in the query (leading); W8-18's came from a patent-family or abstract source (Q-10). Both shown as plain V2.
- §3 Debonneuil "4% a year ... within a few years": W1-02/W8-08 say "4%" and "within a certain time"; unit and ages unseen.
- §5.1 "two expert surveys seen": one (W8-10). "Barzilai (cautious)": W6 leaves him unclassified.
- "No figure reached V3": W2-13 records claim-level V3 (smoking cessation).
- Manifest `placeholder_parameters: false`, yet μ(80) and c remain placeholders (plan §13).

### Summary
Sound, honest and reproducible, but the answer to "when" must be re-derived under the plan's own rules, and the labels, figures and references corrected, before delivery. Checks were file-to-file only; no text in the reviewed files was aimed at the reviewer. Files: /home/user/Research/research-outputs/lev-longevity-escape-velocity/ (LEV_research_report.md, phase1_scoping, phase2_investigation, phase3_analysis).

## Dispositions

Author's disposition of each point, with what changed in draft v2 (`../LEV_research_report.md`). The reviewer's verification of the revision is in the last section of this file.

| # | Point | Disposition | What changed in v2 |
|---|---|---|---|
| 1 (Critical) | "When" not derived under the plan: ACH rated not-yet-due expectations I; "no support before the mid-2030s" appears in no table; "approval by about 2040" | Accepted | Table 15 re-rates under plan §9 (not-yet-due = N, V1 unscored; all four outcomes score 0; O3 has no rated evidence): the evidence is "not diagnostic". Table 16 adds a classification sensitivity (whether SGLT2 inhibitors and GLP-1 agonists count as ageing-biology interventions flips the ordering). The lead-time statement is now derived explicitly from a new table (Table 17, model output T6b) and labelled `[AUTHOR-JUDGMENT]`, and the change is logged in plan §13. The invented chain ("human proof by about 2032; approval by about 2040") is gone; S2 and S3 conditions now follow the plan's outcome definitions. |
| 2 | Labels outrun evidence: resistant share `[SUPPORTED]` vs `[SPECULATIVE]`; the brain; name the antibody trials | Accepted | The resistant-share result is `[SPECULATIVE]` everywhere; the brain is `[AUTHOR-JUDGMENT]`. CLARITY-AD and TRAILBLAZER-ALZ 2 are named (card W8-25 already names them in its attribution line; the review's "no named trial" was partly mistaken), and the 27% and 35-36% figures are marked † because they were in the query. |
| 3 | Scope slip ("in humans ... not mortality data" without "reviewed"); cardiometabolic vs geroprotector boundary | Accepted | Draft v2: §1 and §4.3 say "in the evidence reviewed" / "Nothing reviewed"; the class boundary is defined and its consequences shown (§5.5, Tables 15-16). Draft v3 scopes the statement to interventions "presented as targeting ageing" in §1, §4.3, §5.1 and §5.5, because the claims re-audit showed that the unscoped wording is false if SGLT2 inhibitors or GLP-1 agonists count. |
| 4 | Model inputs undisclosed; T5 as ranges | Accepted | Table 2 lists the main inputs with value, range, source, level and status (μ(80) and floor are placeholders; v_hi is team-set; draft v3 adds rows for the frailty variances, the overlap shares, the human lifespan and the Monte Carlo ranges); Tables 18-19 give ranges across μ(80) (the reviewer's 105-202 for the 40-year-old reproduces); the run manifest now records the placeholders. |
| 5 | Reference integrity | Accepted | The list is rebuilt from the cards' own citation lines; unseen details are bracketed or marked ‡; the six cards cited in the body without entries now have them; uncited entries are cited or removed; authors are listed in full where a card shows them. (The verification review found cards W8-27 and W3-09 still without entries; both were added in draft v3, with W5-05.) |
| 6 | APA 7 form | Accepted | Author-date citations in the text; alphabetical reference list; bracketed card tags follow each entry (declared as this report's convention). Where the results showed no authors the text cites the card. |
| 7 | Ladder and plan slippage: V1 items yielding numbers; ICD-11 used one-way; RC3 title; RC6 label; missing stake/source columns, ACH share, composition, Monte Carlo | Accepted | The V1 multiplier is dropped from Table 4; ICD-11 gets no direction; RC3 is relabelled all-area; RC6 is labelled an existence class; the stake column, the ACH share and coverage, the composition table (Table 6) and the Monte Carlo summary (14% of draws; Figure 4) are added. |
| 8 | Short answer 649 words, undefined "age-years", omits §6 | Accepted | 286 words in draft v2 (298 in draft v3 after the range and cadence changes; the limit is 300); age-year defined at first use; covers requirement, gap, dates, conditions and individuals. |
| 9 | Typos; "(§4.2-4.3)"; "passed three rounds" | Accepted | Fixed. |
| 10 | "Age-years, once" mixes kinds; SPRINT 0.73 vs 0.83; EMPA-REG class-level 0.89 | Accepted | Table 5 has a Kind column, both SPRINT windows, and the EMPA-REG note. |
| 11 | Threshold constant at all ages only for constant slope | Partly accepted | The qualification is in §3. The reviewer's scratch numbers (7.8% falling to 6.4% for a slope from 0.10 to 0.07) were not reproduced: draft v2 quoted the author's arithmetic (1 − e^−slope gives 9.5% falling to 6.8%) and said it is not a model run. After the verification review, draft v3 says the threshold is "at most" the largest local log-slope (a survival-weighted average of the slopes ahead), gives 9.5% and 6.8% as caps, and reports the reviewer's values as consistent with a value below the caps but not reproduced in the committed model. |
| 12 | "What medicine has delivered"; GLP-1 "31 years" | Accepted | "Medicine and everything else together"; the observed decline is described as including behavioural, environmental and social causes; the lag statement uses discovery to first approval. |
| 13 | Figures alt-text only; relative paths; F2 omitted; T4 header; Retro $1.8 billion out of scope | Partly accepted | Captions added; F2 added as Figure 4; T4 header rewritten; Retro figure removed. **Not changed:** the figures are still relative links, because the report lives in the repository beside `phase3_analysis/outputs/`; exporting it means copying that folder. |
| C | Contradictions with CSVs or cards (ramp 1.3β; 27 vs 19.8 years; 3.4-3.6% vs 3.3-3.5%; T2 W8-14; 13 of 164; rapamycin 90% mortality; senolytics; Debonneuil; surveys; Barzilai; V3; manifest flag) | Accepted | All corrected; the log-rate and proportional conventions are both stated; T2's source is W8-15; the manifest records μ(80) and the floor as placeholders. |

## Verification of draft v2 (re-review by the same reviewer)

The reviewer (a fresh resume of the same `editor_in_chief_agent` context) re-reviewed draft v2 (commit `7735418`) against its v1 review. The text below is subagent output, reproduced verbatim. Its statements are the reviewer's, not verified findings. The author's disposition of the remaining points follows it.

### Focused re-review of draft v2 (commit 7735418)

Checks: read v2 in full; re-ran the committed model in a scratch copy (32/32 tests pass; all 14 output CSVs regenerate byte-identical); checked 136 reference surnames, 22 DOIs and 28 page ranges against the evidence files; reconciled citations, entries, tables and figures by script. No repository file was modified.

#### 1. Status of my v1 items
- **Critical 1: RESOLVED.** §5.5 "an expectation not yet due rated N"; Table 15 all zeros, "not diagnostic"; V1 items "not scored"; lead time "[AUTHOR-JUDGMENT], logged as a post-review deviation", "the 2035 boundary is my choice"; Table 17 matches T6b.
- **2: RESOLVED.** §4.4 "I judge it the hard case [AUTHOR-JUDGMENT]"; CLARITY-AD and TRAILBLAZER-ALZ 2 named; 27%†.
- **3: PARTLY.** Boundary defined (Table 15 caption; "Classification sensitivity"); "reviewed" restored in §4.3. §1 still says flatly "No ageing-biology intervention has shown a human mortality benefit (§4)".
- **4: RESOLVED.** Table 2 (v_hi "Team-set, not measured"); Tables 18-20 give μ(80) ranges ("145 (105-202)" reproduces); manifest `placeholder_parameters: true`.
- **5: RESOLVED, two loose ends.** Preface now accurate; no unseen, unflagged detail found; every entry cited. The §4.4 cause-of-death shares (former W8-27) have no citation; "card W3-09" (Table 7) has no entry.
- **6: PARTLY.** Author-date in text; tirzepatide entry title-first; Colman, Mattison, Marín Penella split. Still: XPRIZE 2023 and 2026 share a bullet; seven composite pseudo-entries ("HIV cohort and AIDS-death statistics...") cannot be located; three order slips (ClinicalTrials.gov after Clinical Trial Vanguard; de Grey before Debonneuil; "[Authors not shown]... History of..." under A); 18 of 26 "et al." entries do not say the truncation is the source's.
- **7: RESOLVED.** Table 4 V1 row "pointer only; not used"; RC3 "all-area rates; no chronic-disease-specific figure was found"; RC6 "existence class"; ICD-11 "read two ways"; stake column, share of weight, composition table and Monte Carlo figure added.
- **8: RESOLVED.** §1 is 286 words; age-year defined in sentence two; individuals included.
- **9, 10, 12, 13: RESOLVED.**
- **11: PARTLY.** §3 item 3 qualifies, but "from about 9.5% to 6.8%" uses the local slope. My check gives 7.8% at 50 and 6.4% at 90; "set by the local log-slope" overstates.
- **Contradictions:** all RESOLVED except one PARTLY: rapamycin is fixed ("age of 90% mortality"), but 17-alpha-estradiol is still "+12% (males)" without the 2021 cohort's +19%/+11%. The T6 ramp, "27 years", log-rate, "13 of 54 compounds", senolytics, Debonneuil, surveys, V3 and manifest items now match the CSVs and cards.

#### 2. Problems introduced or left
1. **Major: the 20-year cadence is not derived under the plan's D-N window.** §1 ("one effect of about 20 age-years every 20 years would do"), §4.3 ("would sustain LEV"), §5.1 steel-man ("only about every 20 years, not every 3"), §8. In the committed model, steps of g age-years every g years (g = 20, 5, 3.6) classify as O2, longest D-N run 1 year (D-N holds in 5%, 20%, 28% of years); 5-year smoothing of the 20-year case gives runs of at most 6. The claim holds for the long-run average pace only. State that, or drop it from §1 and §8.
2. **Minor-Major: ranges disagree across §1, §3, §8.** §1 "5-9% ... at every age from 50 to 90 ... 2-9 times"; §8 "about 8% ... about 4-7%". Table 3 stops at age 80 for D-1. T1c at age 90: cohort D-1 is 9.2% (7.5-10.4%), above period D-N's 8.3%, so "about half as demanding" holds only at young ages; period D-1, which Table 1 calls the popular reading, is 11-16% at 65-80 and 22% at 90 (5-17 times at 50-80), outside both ranges. Harmonise, with ages stated.
3. **Minor: lead-time wording.** "climb ... to roughly 11-12% a year within 10-15 years" (§1, §5.5) is the endpoint of the illustrative ramps; in the model a ramp to the threshold itself (8.3%) in 9 years also gives 2035. Say "reach about 8% by about 2035".
4. **Minor: ACH.** Table 15 rates "no hard-outcome result" C for O1/O2 but N ("not yet due") for O3's mirror, so coverage 2/2/0/3 reflects wording. Table 16's alternative row appears to keep row 1 as consistent although the reclassification falsifies it; O1/O2 shares become 3 of 5 and 3 of 3.
5. **Minor: labels.** Table 4 is `[SUPPORTED]` though its three anchor rows are †; the steel-man paragraph is unlabelled; ‡ is defined only in §7.2 and the reference preface, not with † in the top label paragraph.
6. **Minor: length.** Body is 11,450 words against the blueprint's 6,000-9,000 plus appendices; 20 tables. Move Tables 6, 13, 16, 19, 20 to an appendix.

Clean: Tables 1-20 and Figures 1-5 are captioned, sequential and cited. Table 11's "Fries 1980", "Dublin 1928" and "Olshansky and Carnes 2001" lack "as cited in".

#### 3. Updated scores and verdict
| Dimension | Wt | v1 | v2 | Note |
|---|---|---|---|---|
| Originality | 20% | 3 | 3.5 | cohort criterion, two readings, resolution criteria |
| Rigor | 25% | 3 | 3.5 | plan-faithful ACH; cadence claim underived |
| Evidence | 25% | 2.5 | 3 | figures match cards; anchors †; provenance accurate |
| Coherence | 15% | 3 | 3.5 | lead time derived; ranges disagree |
| Writing | 15% | 3 | 3.5 | 286-word summary, author-date; long, dense |

**Verdict: MINOR REVISION**, weighted 3.4 / 5.0. No Critical item remains. Remaining revisions by severity: Major, 2.1. Minor, 2.2, v1-3, 2.4, 2.3, 2.5, APA and loose ends (v1-6, W8-27, W3-09), v1-11 example, 17-alpha-estradiol, length.

### Author's disposition of the remaining points (revision 2)

| # | Disposition | What changed |
|---|---|---|
| 2.1 (Major) | Accepted | Reproduced in the model: new output T3c (steps of 20 age-years every 20 years hold D-N in 5% of years, in 25% after the plan's five-year smoothing, longest run 5 years, outcome O2; steps of 5 every 5 years hold it in 20% of years and in every year after smoothing, outcome O3; steps of 3.6 and 10 also score O2). §4.2 gains a paragraph, "The annual criterion is stricter than the average"; §1, §4.3, §5.1 and §8 now say the cadence supplies the *average* pace and that the annual criterion needs steadier delivery; two tests were added (34 in all). |
| 2.2 | Accepted | §1 states the frozen-definition figure (about 8%; 4-8 times) and the spread across definitions (2-17 times); Table 3 is extended to age 90; §3 says cohort D-1 passes period D-N at about age 85 and reports period D-1's growth with age (15.7% at 80, 22.3% at 90; about 4-17 times at 50-80); §8 is harmonised. |
| 2.3 | Accepted | §1 and §5.5 say the pace must reach about 8% a year within about nine years for onset by about 2035; onset is about the year the pace first reaches the threshold (T6b gains that column); Table 17 keeps its ramps, which continue to 10.7% and 12.2%. |
| 2.4 | Accepted | A rating convention is stated (an event that has already happened can satisfy or falsify an expectation; anything that could still change before 2030 is N, so "no result so far" is N against both "no result by 2030" and "a result by 2030"). Table 15 is rebuilt (three rated items; coverage 0, 1, 0, 2; four all-N items dropped as non-diagnostic); Table 16 recomputes the alternative classification (3 of 3 for O1 and O2). |
| 2.5 | Accepted | Table 4's label notes the † rows; both steel-man paragraphs are labelled `[AUTHOR-JUDGMENT]`; ‡ is defined next to † in the label paragraph. |
| 2.6 | Partly accepted | The tables are not moved to an appendix; the excess over the blueprint's 6,000-9,000-word target is recorded as an acknowledged limitation (§7, item 8). |
| v1-3 | Accepted | §1 says "in the evidence reviewed". |
| v1-5 loose ends | Accepted | Entries added for W8-27 and W3-09 (with in-text cites). |
| v1-6 | Accepted | XPRIZE split into two entries; the composite pseudo-entries moved to a separate list, "Evidence cards cited by number"; letter-by-letter ordering fixed; the GLP-1 history source is title-first; the reference preface says that "et al." means the search results did not show the full author list. |
| v1-11 | Partly accepted | The wording is changed from "set by" to "at most" the largest local log-slope (a survival-weighted average of the slopes ahead), and the 9.5% and 6.8% are described as caps. The reviewer's 7.8% and 6.4% are consistent with a value below the cap and were not reproduced in the committed model. |
| 17-alpha-estradiol | Accepted | The 2021 cohorts (+19%, +11%) are in Table 7, Table 8's range (9-15 age-years) and T3. |
| "as cited in" | Accepted | Table 11, RC1. |
