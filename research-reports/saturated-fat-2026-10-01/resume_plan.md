# Resume plan: finishing the saturated-fat research

*Prepared 1 October 2026 at the end of the first run. Read `report.md` first; this file says what is left and how to do it.*

## Why this plan exists

The first run used its whole allowance of 200 web searches (shared by nine parallel agents) and could not fetch papers from PubMed, journals, WHO or similar sites. Every stream stopped early. The report is therefore interim: its numbers come from search summaries, and large parts of the question were never searched. Everything needed to continue is in this folder.

## What you need to change first (three steps, all outside the old session)

1. **Raise the search allowance.** Add an environment variable named `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` in the cloud environment's settings (the environment menu in the session's title bar, then **Edit**). The streams' own estimates add up to roughly 250 to 350 searches; a value of 500 leaves margin. This is your decision; nothing in the repository changes it. A new session picks it up.
2. **Optionally allow the blocked scholarly hosts** (same settings, network access): `pubmed.ncbi.nlm.nih.gov`, `pmc.ncbi.nlm.nih.gov`, `europepmc.org`, `doi.org`, `www.bmj.com`, `www.cochranelibrary.com`, `www.ahajournals.org`, `jamanetwork.com`, `journals.plos.org`, `academic.oup.com`, `ajcn.nutrition.org`, `www.nature.com`, `link.springer.com`, `clinicaltrials.gov`, `www.who.int`, `www.fda.gov`, `www.dietaryguidelines.gov`. With these, agents can read abstracts and tables directly and the report's V1/V2 labels can be upgraded to "primary text read".
3. **Start a new session** on branch `ccr-bf452988-82w4wo` of this repository (a new session starts on a fresh machine and needs the files from the branch) and paste the prompt below.

## Prompt to paste into the new session

> Resume the saturated-fat deep-research run. Read `research-reports/saturated-fat-2026-10-01/README.md`, `report.md`, `resume_plan.md` and the eight ledgers in `evidence-ledgers/`. Work through the priorities in `resume_plan.md` in order. Use extended searches for numbers and do not put the target number in the query. Before starting, give each stream a search budget and stop a stream when its budget is spent. Re-verify the headline figures in Appendix B of the report first, then fill the NOT SEARCHED domains, then update `report.md` (keep the V-level labels, upgrade a label only when the number is seen in a primary page or two independent outputs, and remove a `[MATERIAL GAP]` flag only when it is filled). Re-run the Devil's Advocate checkpoint, a claim audit against the ledgers, and `scripts/check_acronyms.py`, then commit and push to the same branch.

## Priorities (in the order that most changes the answer)

Each row points to the ledger section that holds ready-to-run queries written by the agent that hit the cap.

| Priority | Question | Where the queries are | Estimated searches |
|---|---|---|---|
| P1 | **"Artificial" fats that were never searched:** molecular identity of natural vs synthetic fat; triglyceride position (sn-2); hydrogenation (partial vs full); chemical vs enzymatic interesterification and its human trials; infant-formula sn-2 palmitate; olestra, salatrim, diacylglycerol oil; refining and heating contaminants (3-MCPD, glycidyl esters, frying products); fermentation-derived, CO2-derived and cell-cultivated fats; "natural" as a criterion (NOVA) | `evidence-ledgers/S6_natural_vs_artificial.md`, section F, items 1–26 | 45 |
| P2 | **Close the trans-fat gaps:** FDA and WHO actions after December 2023; legal definitions; industrial trans fat and inflammation or diabetes; funders of the ruminant trans-fat trials; the corrigendum to the 2026 dairy trans-fat review | S6 section F, items 27 onward | 15 |
| P3 | **Foundations of the cholesterol argument:** Mensink 2003 and the 2016 WHO regression, Clarke 1997; apolipoprotein B, Lp(a) and LDL particle size; Mendelian randomization and the EAS consensus on LDL causality; the critiques of that case | `S2_cvd_lipids_rcts.md` sections D1, D4, D5, D6; `S3_cohorts_meta_analyses.md` section E items 2 | 25 |
| P4 | **Landmark diet–heart trials and reanalyses:** Sydney, Minnesota, Los Angeles Veterans, Finnish Mental Hospital, Oslo, MRC, DART, WHI, PREDIMED, Lyon; the Cochrane "What's new", risk-of-bias and replacement-nutrient subgroups; the Annals strata and editorial; the JMA Journal registration and estimates | `S2_cvd_lipids_rcts.md` sections D2, D3, D7 | 25 |
| P5 | **Non-cardiovascular outcomes:** liver fat, adiposity, cancer (WCRF/AICR, WHI, the 2026 umbrella review's effect sizes and GRADE), cognition and dementia, inflammation and microbiota, pregnancy, children, older adults, non-CVD mortality; complete type 2 diabetes | `S4_noncvd_outcomes.md` sections D3 (items 1–8) | 40 |
| P6 | **Other national and WHO guidance and exact DGA/AHA wording:** WHO 2023 guideline, EFSA, UK SACN, Nordic 2023, Canada, Australia/New Zealand, Japan, China, ESC/EAS; chemistry, fat-composition table, intake data; the AHA 2026 saturated-fat wording and the 5–6% vs 10% discrepancy; FDA "healthy" and front-of-pack status | `S1_guidelines_intake_policy.md` section D3 | 35 |
| P7 | **Food-source completions:** cheese-substitution meta-analysis, the dairy-industry-ties review, PURE dairy abstract, palm, palm kernel, MCT oil, cocoa butter/stearic acid, individual fatty acids, odd-chain and very-long-chain SFA, plant vs animal SFA, meat components, ultra-processed food adjusted for SFA | `S5_food_sources_fatty_acids.md` sections D1–D3 | 25 |
| P8 | **Cohort completions:** biomarker studies (FORCE, EPIC-InterAct), Mendelian randomization of SFA, Global Burden of Disease, 2022–2026 syntheses, Asian and Dutch cohorts, measurement error, healthy-user bias, reverse causality, de Souza SFA estimates for CHD, stroke and diabetes | `S3_cohorts_meta_analyses.md` section E "Searches NOT run" | 30 |
| P9 | **Controversy, susceptibility, seed oils:** the late-2025 review and dispute, symmetric conflict-of-interest checks for the defending documents, limits of nutritional epidemiology, familial hypercholesterolaemia, hyper-responders and low-carbohydrate diets, APOE, children, seed-oil primary literature (Farvid, Marklund, Hooper 2018, Ramsden and critics), post-2024 professional-body statements | `S7_controversy_susceptibility.md` section F; split into S7a (history, funding, critique) and S7b (susceptibility, seed oils) | 45 |
| P10 | **Recency follow-ups:** the *Journal of Nutrition* 2026 review of fatty acids and the 2025–2030 guidelines; Annals letters or corrections; 2025–26 cohorts by food source; retractions and expressions of concern; Cochrane, EFSA and SACN updates; final FDA front-of-pack outcome; the third WHO trans-fat validation cycle | `S8_recency_sweep.md` section D and the hand-back list; this file | 25 |
| P11 | **Verification:** open the primary abstracts for the 48 headline figures in Appendix B of the report; resolve the open discrepancies listed below; record "primary text displayed Y/N" for each | `report.md`, Appendix B | 20 |

## Open discrepancies to resolve in the next run

- Cochrane combined-events estimate: RR 0.83 (0.70 to 0.98; 12 trials; 53,758) in the 2020 abstract, versus text showing RR 0.79 (0.66 to 0.93; 11 trials; 53,300) whose version is unresolved (ledger S2-04, S8-15).
- AHA numeric target: "less than 6%" or "5 to 6 percent" (older web advice) versus a 2026 statement described as keeping patterns at 10% or less (S1-13, S8-08).
- Zhang et al. 2025 (butter and plant oils): whether the 0.83 hazard ratio is for 10 g/day butter replaced by plant oil or for each 5 g/day of plant oil (S3-13, S5-17).
- Wang 2016 and Chowdhury 2014 figures that appeared only after being typed into queries (S3 section B7) — re-retrieve without echo.
- Imamura 2016 participant count (4,220 or 4,660) and Siri-Tarino 2010 sample size (S4 B1, S3 B2).
- Why PURE differs from the Harvard cohorts (S3-11, S3-12).
- NIH-AARP animal-fat hazard ratios (1.16 vs 0.96; S3 B3).
- Whether the Annals review's authors objected to the editorial (reported only in a news summary; S8-07).

## Guardrails learned in the first run

1. **Budget before dispatch.** The first plan asked for 320 to 640 searches against an allowance of 200. Give each stream a budget, run streams in waves, and keep a reserve.
2. **On refusal, record NOT SEARCHED.** Never write "no evidence" for an unsearched topic and never fill the gap from memory.
3. **Do not echo.** A search summary repeats numbers placed in the query. Count a result as confirmation only when the number was not in the query.
4. **V-levels measure transcription, not replication.** Add a field "primary text displayed Y/N" and de-duplicate sources across streams.
5. **Account for conflicts of interest symmetrically.** Retrieve declared interests for the defending documents (AHA advisory authors, guideline writers, pharma ties) as well as for the critiques.
6. **Add three readings of "artificial" the Devil's Advocate flagged:** endogenous versus dietary saturated fat (de novo lipogenesis from carbohydrate; plasma SFA is not intake) and engineered carriers of saturated fat (plant-based meat and dairy analogues built on coconut or palm fat; MCT oil and fractions).
7. **Keep comparators.** Never merge "SFA vs PUFA", "SFA vs carbohydrate" and "SFA, replacement unspecified".
