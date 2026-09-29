# Ethics and Integrity Review of the Report (draft v1)

| Field | Value |
|---|---|
| Reviewer | Fresh-context subagent of the same model family, role `ethics_review_agent` (`deep-research/agents/ethics_review_agent.md`); no web access; judged from the files |
| Reviewed | `../LEV_research_report.md`, draft v1 (commit `fc40bde`) |
| Verdict | **CONDITIONAL** (integrity only; no human subjects). No Critical issues |
| Dispositions | See the table at the end of this file |

The review text below is subagent output, reproduced verbatim. Its statements are the reviewer's, not verified findings.

## Ethics Review Report: LEV report, draft v1

**AI-Assisted Research-Integrity Verdict: CONDITIONAL.** Integrity only, not human-subjects clearance; no human subjects are involved and nothing here authorizes recruitment, consent, data access or collection. No reviewer-directed text found.

**Dimensions:** AI disclosure warn; Attribution warn; Dual-use pass (None; no dosing or operational detail); Fair representation warn; Data ethics pass; Conflict of interest warn.

**Critical:** none. Disclosure exists, no fabrication was demonstrated, and the misstatements below are isolated, not systematic.

### Major (must fix before delivery)

**1. Individual-level claims outrun the evidence (§4.3, §6).**
- "PEARL … safe"; "Pilot in 12 older adults: feasible and safe." Cards support only "adverse events similar across arms" (n=114, 48 weeks) and "no serious related adverse events" (n=12). Remove "safe" beside rapamycin and dasatinib+quercetin.
- "physical activity and diet), which are worth roughly 1-5 age-years each in trials." Exercise and diet trials were never searched (W2 §6a); age-years is the report's own conversion of trials in patient populations (SPRINT, SELECT, EMPA-REG).
- "consumer 'biological age' tests are unreliable (replicate noise up to years; W5-20)." W5-20 covers research clocks and reports a fix (<1 year); consumer tests and clinics were not searched, so "unproven longevity clinics" pre-judges them.
- The race table shows only the improving-mortality scenario; T5's frozen-mortality run is lower (age 50, onset in 40 years: 26% vs 42%). Add it, caption the table (conditional on an onset the evidence does not show; full access assumed; not a forecast), and cap "145 years." Qualify "Trial participation, where safe and eligible" (registered, ethics-reviewed trials; not a recommendation).

**2. Sponsor claims and V1 pointers used as findings.**
- §1 "The first human dosing of a partial-reprogramming therapy … was reported" and §8 "a first small partial-reprogramming trial": "first" is Life Biosciences' own description (W5-01, W4-09; V2-P). Attribute it.
- §5.5 rates O3 "I" on V1 items (FDA trade-press sentence, biomarker count) and on absence in a non-census, cap-truncated search (W5 Table P1). Blueprint: V1 is never a finding. Say "not observed."
- RC2 ("$270M", "kidney damage in 5 of 24 patients") is V1. The "31 years" GLP-1 lag uses SELECT (2023) though W2 §6b lists an eleven-trial GLP-1 outcome meta-analysis.

**3. Named studies and people not supported by cards.**
- Olshansky 2024, "no more than 15% of women and 5% of men without new medical breakthroughs," tagged W1-06 · V2: W1-06 lists those shares as "not returned, so not findings." Only W6-05 (single query, horizon unstated) has them. Report as V2-P and drop the condition.
- "Kaeberlein, Barzilai (cautious)": W6 §3A has Barzilai "not classified"; no statement retrieved.
- Diamandis "XPRIZE award in 2030": W6-03 says his XPRIZE role is "not stated in any retrieved sentence (lead: verify)."
- Debonneuil "4% a year … within a few years": sources say "4%" (unit unseen, W1-02) and "within a certain time" (W8-08).
- ITP "13 of 164 trials positive across 54 compounds": W3-01 says 13 compounds of 54 (single query, unattributed).
- "authors who run longevity companies": two of six Donner co-authors, per search-result pages, not the paper's disclosure (W7-10). "groups with stakes" for Goldman and Scott–Ellison–Sinclair: W7-03 stake "not established," W7-01 funder "not seen."

**4. Stakes are not disclosed symmetrically.** §5.1 lacks the stake column the plan (§11) requires; one sentence says "Every forecaster has a stake," which the cards do not show for Vijg ("not retrieved"). Add per-person stakes with card IDs ("not retrieved" where absent): de Grey–LEV Foundation (RMR1 is the evidence he can cite, W6-02); Church–Rejuvenate Bio and Sinclair–Life Biosciences (V1; they tie forecasters to §4.3 sponsor results); Diamandis–Fountain Life; Olshansky–Lapetus Solutions and longevity-dividend programme (W6 C-8); Kaeberlein–Optispan; Barzilai–TAME. Add W1 C5 ("Neither side is independent of its own thesis"; steady-pace sources share Vaupel) and that SELECT, SURPASS-CVOT and EMPA-REG are believed manufacturer-sponsored (W2 limitation 5).

**5. AI disclosure.** Same-family review and summary-mediated evidence are clearly disclosed (front matter, §2, §7). Scope is not: "Produced with AI-assisted research tools (Claude)" should say AI agents searched, graded evidence, wrote the model and drafted; that no human verified any figure or citation; and the model version. Replace "the research team's structured judgment" with "AI-generated structured judgment." "passed three rounds of devil's-advocate review" was REVISE, REVISE, PASS (spot check); "the DA reviewer reproduced it independently" was a same-family re-derivation.

### Reference integrity
79 entries compared with their cards; all cited card IDs exist; no web access, so external existence is unverified.
- "Jaeger, et al. (2024)": surname appears in no logged result (W2-03 "attribution inferred"); use "[authors not displayed]."
- NBER (title, "March"), National Academies (title, "Ch. 7"), SSA (title, 66(1)), SOA (title, 2(4)): cards hold only source and year. Verify or reduce.
- Twelve entries are never cited in text (Bonnet, Vaupel 2010, Rau, López-Otín, Lu, Browder, Yang, Moqri, Belsky, Wong, OECD, Marín Penella); three are incomplete (leukaemia, xenotransplant, anti-amyloid).

### Minor
- Equity: the high-income scope appears only in §7.4; W7 found mostly US evidence (8 of 12 cards), none from low- or middle-income countries. State this in §1 and the confidence line; note §6 assumes US-like mortality and full access.
- de Grey, Kurzweil and Church quotes match the cards and carry V1; de Grey's "(2021 statement)" is unresolved (W6 C-1: 2021 or 2023).
- Tetlock: "tournaments" misdescribes the 1984-2003 study; typo "which is which is."

**Decision Log:** no rows yet.

## Dispositions

(to be completed after the editorial, devil's-advocate, and claims-audit reviews are also in)
