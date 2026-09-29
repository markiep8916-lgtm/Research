# Methodology Blueprint — Longevity Escape Velocity (LEV)

| Field | Value |
|---|---|
| Run | `deep-research` v2.12.1, `full` mode, Phase 1 (Scoping) |
| Date | 2026-09-29 |
| Version | v2.1, revised after Devil's Advocate Checkpoint 1 Round 1 (REVISE) and Round 2 (REVISE, narrow); see `04_da_checkpoint1.md` |
| Status | Round 2 fixes applied; DA spot check of the diffs pending. User scope confirmation: "no preference" on all questions, then "keep going" (proceed with the recommended defaults) |
| Inputs | `01_rq_brief.md` (v2), `03_analysis_plan.md` (frozen model, weighting, and reference-class specification) |

## Research Paradigm

**Selected:** Pragmatist (problem-centred, mixed methods), applying post-positivist standards to empirical claims.

**Justification:** The RQ mixes demographic arithmetic (what would LEV require?), a comparison of evidence about interventions (how far are we?), and conditional forecasting under deep uncertainty (under what conditions, by what dates, if any?). No single positivist design answers all three, and the third has no experimental evidence. The pragmatist frame lets each stream carry its own standard of proof, provided every claim carries an explicit epistemic-status label so streams are never silently merged.

## Method

**Type:** Mixed. Integrative evidence synthesis plus quantitative secondary modelling.

**Specific method:** A structured narrative review with a documented search protocol and graded evidence (not a PRISMA meta-analysis: the evidence types are too heterogeneous to pool), combined with (i) a demographic threshold model with a frozen specification (`03_analysis_plan.md`), (ii) an analysis of competing hypotheses over a partition of outcomes, (iii) a forecast analysis with pre-specified reference classes, and (iv) bottleneck and lever analysis.

**Justification:** The question drives the method. SQ1 is life-table arithmetic. SQ2 compares that requirement with demonstrated effects, expressed as a rate. SQ3 combines forecasts (with their stakes and track records), reference-class priors, and bottleneck analysis into scenario-conditional statements.

### Outcome partition (replaces the earlier H0-H2)

Outcomes for the frontier population by 2100 on the smoothed D-N criterion, defined by an ordered first-match rule over a **LEV window** (at least W consecutive years, default 20, over which D-N holds at every age in band B): **O3** a window with onset by 2060; **O4** first window with onset 2061-2100; **O2** no window by 2100 but some W-year window with average pace above a preset historical bound v_hi (this includes short D-N episodes); **O1** otherwise. A second axis records mechanism (ageing-biology / disease-by-disease / both or other). The evidence is weighed by an analysis of competing hypotheses in the Heuer convention: outcomes are ordered by **weighted inconsistency only**, against **expectations for 2030 written for every outcome before any rating**, with numeric weights and an expectation-coverage count (`03_analysis_plan.md` §9). No outcome is a "null"; all four receive the same scrutiny. The matrix yields an ordering with coverage, not probabilities.

## Data Strategy

**Data type:** Secondary only (published literature, official statistics, registry records, formal forecasts). No human subjects.

**Workstreams** (each executed by an independent agent with its own output file; sub-questions in brackets):

| ID | Workstream | Sub-question |
|---|---|---|
| W1 | Definitions, demography, observed mortality declines, competing readings of the historical pace | SQ1, SQ2 baseline |
| W2 | Demonstrated human hazard reductions: risk-factor control, drugs with mortality outcomes, vaccines, screening; life-table anchors; consumer "biological age" test caveats | SQ2 anchor |
| W3 | Ageing-biology frameworks and animal lifespan evidence: hallmarks, Interventions Testing Program, combinations (including RMR1), long-lived species, neurodegeneration as a constraint | SQ2 |
| W4 | Rejuvenation modalities and first human evidence: partial reprogramming, senolytics, plasma exchange, thymic and cell approaches, replacement and xenotransplantation, rapamycin, metformin, GLP-1 and SGLT2 drugs | SQ2 |
| W5 | Translation and enabling conditions: pipeline as of 2026-09-29, biomarkers and surrogate endpoints, regulation, funding and prizes, base rates | SQ3 |
| W6 | Forecasts, forecaster vintages, and reference classes RC1-RC6 | SQ3 |
| W7 | Economics, equity and access, ethics, public attitudes, policy levers | SQ3 |

SQ2 is tiered: six core rows (risk-factor and cardiometabolic control; geroprotective small molecules; senolytics and immune clearance; partial reprogramming and gene or cell therapy; replacement and regeneration; combinations and AI-enabled discovery), anchored by the demonstrated-human-hazard row, with the remainder in an appendix.

**Retrieval channel:** Live web search only (`last_searched_at` recorded per card). Direct fetches of scholarly hosts are blocked by the environment's network policy; nothing in this run is verified against primary full text.

**Sampling:** Purposive search per workstream, snowballing through search results (citation chaining is not executable without reference lists). **Steel-man pairing:** for every pro-LEV or pro-intervention claim retained, search for the strongest sceptical or contradicting source, and vice versa; record the pair. Stakes are recorded for sceptics as well as advocates (for example, a sceptic's own "longevity dividend" programme is a stake; the LEV Foundation's own mouse results are self-reported).

**Time frame:** Mortality series 1850-2025 (hazard baselines about 1990-2019); interventions and clinical evidence 2000 to 2026-09-29; scenarios to 2100.

**Inclusion:** directly informs SQ1 to SQ3; a primary study, systematic review, official statistic, formal forecast or survey, registry or regulator record, or a primary-party disclosure (labelled V2-P); English; available by 2026-09-29; passes V2, V2-P, or V3 (V1 only in the event log).

**Exclusion:** anonymous blogs and social posts without primary data; product or supplement marketing; sources at V0.

### Verification ladder v3 (Round 2 revision; addresses "passing by echo" and attribution)

The skill's default is 100% DOI resolution plus a search spot-check, which assumes access to Crossref and publisher hosts. This environment blocks them, and the search tool returns a **model-written summary** plus a list of result links. The ladder therefore separates *existence* from *figure corroboration*, defines independence by origin, binds every figure to a named source, and states plainly that nothing here reaches primary-text verification: **every figure in this report is summary-mediated.**

**Existence.** E2: an independent primary-domain URL (publisher, PubMed or PMC, preprint server, official statistics site, regulator) appears in the live result list, and its title, venue, and year match the citation. E-P: the item exists on its primary party's own domain (a company, foundation, or individual's own site). Registry entries are sponsor-entered: they count as E2 for a trial's existence and design, and as E-P for anything the sponsor asserts about effects or status. E1: appears only on secondary domains (news, aggregators, blogs, encyclopaedias). E0: not seen this session.

**Figure corroboration.** A figure is *attributed* when a search-output sentence ties it to a **named source** (a paper, agency, company, or person). F3: attributing sentences from at least **two separately worded queries** name at least **two sources of different authorship**, whose domains appear in the link lists, at least one of them primary and independent of whoever produced the claim. F2: one attributing sentence. F-P: attributed only to the primary party itself. F1: unattributed, secondary, or echo only. *Origin* is the organisation or wire that first produced the text; syndications, reprints, and rewrites count as one origin, and a company's or foundation's pages count as one origin together with its releases.

| Level | Meaning | May support |
|---|---|---|
| **V3** | E2 and F3 | Findings and model inputs |
| **V2** | E2 and F2 | Findings marked "single-confirmation"; ranged model inputs |
| **V2-P** | E-P (or a sponsor-entered registry claim) and F-P | "X reports that..." statements and labelled "as reported" sensitivity cases; never effect-size evidence and never a range-setting input |
| **V1** | E1, any F | Pointers and the event log (dated announcements), never findings |
| **V0** | E0 | Nothing; not cited. Claims resting on V0 are dropped or listed in an "Unverified background" box without numbers |

**Logging and audits.** Each workstream file keeps one numbered search-log table (query ID, verbatim query, date, returned links with an origin class each). A card cites log IDs and quotes or paraphrases (at most 25 words) each attributing sentence. Where the summary contradicts itself or another result (for example a term described as both "coined 2004" and "rooted in the 1970s"), the contradiction is recorded and resolved by a primary-domain result or flagged. A second agent re-verifies every **load-bearing** figure (any figure that feeds the model, a headline statement, or the outcome matrix) with fresh, differently worded queries under the v3 rules, and about 10% of other queries are re-run for reproducibility; the consolidated verified table records the final level. **Model inputs must be V3 or are treated as ranged free parameters.** Key figures should be re-checked against primary texts once network access is widened.

### Epistemic-status labels (on every substantive claim in the report)

`[ESTABLISHED]` replicated, multiple independent sources, or definitional mathematics. `[SUPPORTED]` consistent evidence with limited replication, or animal-only. `[CONTESTED]` credible sources disagree. `[SPECULATIVE]` reasoning without direct evidence. `[AUTHOR-JUDGMENT]` structured judgment by the research team (AI-assisted), low confidence.

### Source grading

Study-design level I to VII and source tier 1 to 4 per `references/source_quality_hierarchy.md`. Animal evidence carries a translational modifier (multi-site replicated, such as the Interventions Testing Program, vs. single-lab). Forecast sources: F1 formal projection with published method and track record; F2 expert survey with disclosed sampling; F3 individual expert statement; F4 prediction-market aggregate (note thinness); F5 commentary. (These forecast grades are unrelated to the figure levels above.)

## Analytical Framework

**Technique:** Convergent triangulation across four components, then adversarial review. The model, the weighting rules, the reference classes, and the forecast-conversion rules are specified in `03_analysis_plan.md` and frozen before the Phase 2 search.

**Steps:**

1. **Threshold model (SQ1).** Frozen definitions D-N, D-1, D-H; model M0 with two-component (M1), frailty and plateau (M2), and optional cause-specific (M3) extensions; escape duration over finite windows rather than a yes/no feasibility switch; sensitivity by Monte Carlo. Observed hazard-decline rates are the baseline; life expectancy at birth is context only. If life tables are unreachable, SQ1 and SQ2 are labelled "illustrative arithmetic with literature parameters".
2. **Gap analysis (SQ2).** Every demonstrated effect is converted to age-years and to the cadence needed to sustain v = 1; the human-anchor row comes first. Composition of effects is modelled explicitly. Animal effects are shown as relative changes and converted only as a labelled upper-bound thought experiment.
3. **Closure analysis (SQ3).** Scenario-conditional statements for S1-S4 with necessary conditions and intervention-side leading indicators observable by 2030; reference classes RC1-RC6 fixed ex ante; a forecaster-vintage table; conversion of a forecast to a hazard rate only when its definition is stated or unambiguously implied; bottlenecks and levers, including public demand and access.
4. **Weighting.** Diagnosticity matrix over O1-O4 (and mechanism); optional coarse AUTHOR-JUDGMENT band only with the filled decomposition template.
5. **Red-team.** Devil's Advocate checkpoints 2 and 3 in fresh contexts.

**Tools:** Python (numpy, matplotlib) for the model and figures; live web search for retrieval.

## Validity Criteria

| Criterion | Strategy to Ensure |
|-----------|-------------------|
| Source existence | Verification ladder v3; only V2, V2-P, or V3 cards are cited; level shown per reference |
| Claim fidelity | Numbers stated only at V2 or above, with the level shown and marked summary-mediated; V2-P as "reports that"; epistemic label on each claim |
| Echo and hype laundering | Origin-based independence; every figure bound to a named source; sponsor-entered registry and company claims capped at V2-P; syndicated copies count once; summary contradictions logged; load-bearing figures re-verified by a second agent |
| Confirmation bias | Outcome partition with equal scrutiny and expectations written for every outcome; paired reference classes (pro-acceleration and delay); steel-man pairing; symmetric stake columns; DA checkpoints 1-3 |
| Tier inflation | Company, foundation, and news claims capped at V2-P or V1; never used as effect-size evidence |
| Definitional drift | Frozen definitions D-N, D-1, D-H; every LEV claim names its sense |
| Model validity | Closed-form checks, unit tests, invariance tests, frozen ranges, Monte Carlo sensitivity, committed code and seeds; recommended independent biodemographer review |
| Post-hoc reference classes | RC1-RC6 fixed ex ante and paired in `03_analysis_plan.md` |
| Currency | Search date stamped; fast-moving items flagged with an as-of date |

## Limitations (By Design)

- **Search-mediated access.** Scholarly hosts are blocked; nothing is verified against primary full text; life tables may be unreachable. Mitigation: ladder v3, ranged parameters, and a recommendation to re-verify key figures once access is widened.
- **Same-family review.** Drafting, Devil's Advocate, editorial, and ethics roles all use the same model family; fresh contexts reduce anchoring but not shared blind spots. No cross-model check is run (`ARS_CROSS_MODEL` unset). Independent review of the model specification by a biodemographer is recommended before any reliance on it.
- **No direct reference class.** LEV has no historical analogue; six indirect reference classes (RC1-RC6) are fixed ex ante and each is paired with its opposite-direction class.
- **Advocacy-dominated discourse.** Much public material is promotional. Mitigation: tier caps, stake columns for both camps, and V2-P labelling.
- **Stylised model.** Gompertz-Makeham with extensions is a good description of adult mortality but simplifies heterogeneity, cause structure, and cohort effects; dementia and other cause coding is unreliable at very old ages.
- **Frontier populations only.** Findings apply to high-income frontier populations; global heterogeneity ("for whom") is treated qualitatively.
- **Moving target.** The field changes monthly; the report is a dated snapshot.

## Ethical Considerations

- No human subjects; secondary analysis of public information.
- Misinformation and false-hope risk: no dosing, products, or protocols; explicit "not medical advice"; epistemic labels on every claim.
- Dual-use: negligible (no methods for harm are described).
- AI disclosure and same-family-review disclosure included in the report.
- Equity and access are part of the question (SQ3), not an afterthought.

## Human-Subjects Administrative Status

Not applicable. Secondary analysis of published and public data; no recruitment, consent, or access to identifiable data.

## Reporting Standard

No EQUATOR guideline fits an integrative review with modelling. Adopted: PRISMA 2020 items on search, selection, and appraisal for transparency (not claimed as a PRISMA review), the SANRA checklist for narrative-review quality, and full disclosure of model parameters and code.

## Preregistration

- Recommended: Yes, lightweight (this is an exploratory synthesis, but it reports hypothesis-weighing and possibly probability bands)
- Platform: this repository. `03_analysis_plan.md` (model specification, weighting rules, decomposition template, reference classes) is committed before the Phase 2 search; the commit hash is recorded in `04_da_checkpoint1.md` once created. Later changes are dated deviations.
- Status: Planned (frozen at commit)
- Completed artifact declaration: not_provided
- Companion handle: none
- Sidecar ownership: dispatching layer only; do not populate a digest here

## Design-Freeze Checkpoint Audit

Cross-model blind check **not run** (`ARS_CROSS_MODEL` unset; no consent to send content to an external provider). Single-model review only (fresh-context Devil's Advocate).

## Planned deliverables

| Phase | Output |
|---|---|
| 2 Investigation | Seven workstream evidence files with verification levels (2a); a consolidation and re-verification pass by a second agent for load-bearing figures under ladder v3 (2b); consolidated verified bibliography and source-quality matrix; search logs |
| 3 Analysis | Synthesis and gap analysis; threshold model, code, tables and figures; diagnosticity matrix; scenario table with leading indicators; forecaster-vintage table; DA checkpoint 2 |
| 4 Composition | Full report (target 6,000-9,000 words plus appendices), APA 7.0 references with verification levels. **Citation budget:** about 90 references in the body; every other evidence card stays in an appendix table by card ID |
| 5 Review | Editor-in-chief review; integrity and ethics review; DA checkpoint 3 |
| 6 Revision | Final report; at most two revision loops; remaining issues listed as acknowledged limitations |
