# Methodology Blueprint — Longevity Escape Velocity (LEV)

| Field | Value |
|---|---|
| Run | `deep-research` v2.12.1, `full` mode, Phase 1 (Scoping) |
| Date | 2026-09-29 |
| Status | DRAFT v1 for Devil's Advocate Checkpoint 1 and user confirmation |
| Input | `01_rq_brief.md` |

## Research Paradigm

**Selected:** Pragmatist (problem-centred, mixed methods), applying post-positivist standards to empirical claims.

**Justification:** The RQ mixes descriptive demography ("how fast are we improving?"), causal biology ("what could move mortality?"), and forecasting under deep uncertainty ("when?"). No single positivist design can answer all three, and the third has no experimental evidence at all. The pragmatist frame allows each stream its own standard of proof, provided every claim carries an explicit epistemic-status label so that streams are never silently merged.

## Method

**Type:** Mixed. Integrative evidence synthesis plus quantitative secondary modelling.

**Specific method:** Structured narrative review with a documented search protocol and graded evidence (not a PRISMA meta-analysis: the evidence types are too heterogeneous to pool), combined with (i) a transparent demographic threshold model, (ii) a forecast-evidence triangulation, and (iii) bottleneck and lever analysis.

**Justification:** The question drives the method. SQ1 is quantitative and can be answered by life-table arithmetic. SQ2 requires evidence grading across animal, human, and industry-reported data. SQ3 requires comparing forecasts with their incentives and track records, plus base rates for translational success.

### Hypotheses held open (equal evidential weight)

| ID | Statement |
|---|---|
| **H0** (sceptical null) | Without a step-change of several-fold acceleration in the pace of adult mortality decline, life expectancy keeps rising at or below the historical pace and LEV is not reached this century. |
| **H1** (geroscience acceleration) | Interventions targeting ageing biology produce a sustained acceleration of mortality decline to the LEV threshold within decades. |
| **H2** (partial) | Meaningful acceleration above the historical pace occurs, without reaching LEV. |

The synthesis reports how much each stream of evidence shifts the balance among H0 to H2. It does not aim to "prove" any one of them.

## Data Strategy

**Data type:** Secondary only (published literature, official statistics, registry records, formal forecasts). No human subjects.

**Sources (by stream):**

| Stream | Sub-question | Source classes |
|---|---|---|
| W1 Definition and demography | SQ1 | Original LEV texts; demographic papers (record life expectancy, maximum age at death, mortality plateaus, cause-deletion arithmetic); UN, national, and Human Mortality Database summaries |
| W2 Biology and interventions | SQ2 | Hallmarks-of-ageing reviews; Interventions Testing Program and other animal lifespan studies; reprogramming, senolytic, and geroprotector studies; human trials; long-lived-species biology |
| W3 Translation and regulation | SQ2, SQ3 | ClinicalTrials.gov and regulator records; biomarker-of-ageing consortium papers; ICD and FDA positions; funding and prize programmes; company and foundation disclosures (flagged Tier 4) |
| W4 Forecasts | SQ3 | Expert statements and surveys; prediction-market questions; actuarial and UN projections and their historical accuracy; technology-forecasting base rates |
| W5 Bottlenecks and levers | SQ3 | Translational attrition base rates; health-economics models (delayed-ageing scenarios); equity, ethics, and policy analyses; evidence on lifestyle and risk-factor effects on all-cause mortality |

**Retrieval channel:** Live web search only (`last_searched_at` recorded at Phase 2). Direct fetches of scholarly hosts are blocked by the environment's network policy.

**Sampling:** Purposive plus citation chaining per stream. **Steel-man pairing rule:** for every pro-LEV claim retained, search for the strongest sceptical source, and vice versa; record the pair in the evidence table.

**Time frame:** Demographic series 1850-2025; intervention and clinical evidence 2000 to 2026-09-29; forecasts through 2100.

**Inclusion:** directly informs SQ1 to SQ3; a primary study, systematic review, official statistic, formal forecast or survey, registry or regulator record, or a primary-party disclosure (flagged); English; available by 2026-09-29; passes verification level V2 or higher.

**Exclusion:** anonymous blogs and social posts without primary data; product or supplement marketing; sources that fail V2.

### Verification ladder (adapted to search-only access)

The skill's Iron Rule is that a source that cannot be confirmed does not enter the report ("gray zone = FAIL"). The default protocol (100% DOI check plus spot-check) assumes access to Crossref and publisher hosts, which this environment blocks. The following ladder replaces it, and each reference in the report carries its level.

| Level | Meaning | May support |
|---|---|---|
| **V3** | Cross-confirmed: title, first author, venue, and year match a publisher, PubMed, registry, or preprint-server URL returned by live search, **and** the specific figure cited is confirmed by at least two independent hits | Findings and numbers |
| **V2** | Existence confirmed: title, venue, and year match a publisher, PubMed, registry, or preprint URL returned by live search; the cited figure appears in at least one snippet | Findings, with the figure marked "single-confirmation" |
| **V1** | Secondary only (news, aggregator, blog coverage) | Pointers and event reports ("Company X announced Y"), never findings |
| **V0** | Known from background knowledge only, not re-confirmed | Nothing. Not cited. Claims resting on V0 are dropped or listed in an "Unverified background" box without numbers |

### Epistemic-status labels (used on every substantive claim in the report)

`[ESTABLISHED]` replicated, multiple independent sources, or definitional mathematics. `[SUPPORTED]` consistent evidence with limited replication, or animal-only. `[CONTESTED]` credible sources disagree. `[SPECULATIVE]` reasoning without direct evidence. `[AUTHOR-JUDGMENT]` structured judgment by the research team (AI-assisted), low confidence.

### Source grading

Study-design level I to VII and source tier 1 to 4 per `references/source_quality_hierarchy.md`. For animal evidence, add a translational modifier (multi-site replicated, e.g. Interventions Testing Program, vs. single-lab). For forecasts, grade the forecast source: F1 formal projection with published method and track record; F2 expert survey with disclosed sampling; F3 individual expert statement (record any financial or reputational stake); F4 prediction-market aggregate (note thinness); F5 commentary.

## Analytical Framework

**Technique:** Convergent triangulation across four analytical components, followed by adversarial review.

**Steps:**

1. **Threshold model (SQ1).** Gompertz-Makeham mortality with two extensions: (a) an extrinsic-mortality floor, and (b) a two-component hazard in which a fraction of age-related hazard resists intervention (neurodegeneration is the main candidate). Derive, analytically and by numerical life-table integration, the sustained proportional hazard-decline rate needed for each LEV formalisation. Compare with observed decline rates and the best-practice trend. Sensitivity: mortality-rate doubling time, extrinsic floor, resistant fraction, age band. Then a "race" table: probability that a person of a given age survives until LEV under stated arrival dates, using frozen and improving mortality. Illustrative arithmetic, not forecasts. Code and parameters are committed to the repository.
2. **Pathway assessment (SQ2).** One row per intervention class: best human evidence, best animal effect size, approximate hazard reduction demonstrated to date, distance from the LEV threshold (orders of magnitude, with stated assumptions), development stage, key bottleneck, epistemic status.
3. **Forecast triangulation (SQ3).** Extract each explicit forecast (who, when, definition used, stake or incentive). Convert each to the hazard-decline rate it implies using the step-1 model. Compare with historical forecast accuracy (both optimistic and pessimistic failures) and translational base rates. Build scenarios with necessary conditions and **leading indicators observable by 2030**, so the reader can tell which way reality is going.
4. **Bottleneck and lever analysis (SQ3).** Regulatory pathway and endpoints, biomarker validity, capital, trial infrastructure, delivery and safety, brain and neurodegeneration, and equity and access. Then policy and institutional levers, and a bounded, non-prescriptive section on individual-level "bridge" actions based on all-cause-mortality evidence.
5. **Red-team.** Devil's Advocate checkpoints 2 and 3 in fresh contexts. Any AUTHOR-JUDGMENT probability is shown with its decomposition and sensitivity, never as a bare number.

**Tools:** Python (numpy, matplotlib) for the model and figures; live web search for retrieval.

## Validity Criteria

| Criterion | Strategy to Ensure |
|-----------|-------------------|
| Source existence | Verification ladder V0-V3; only V2 or above is cited; level shown per reference |
| Claim fidelity | Numbers stated only when confirmed at V2 or above; direct quotation avoided; epistemic-status label per claim |
| Confirmation bias | H0 to H2 held open; steel-man pairing; DA checkpoints 1 to 3 |
| Tier inflation | Company, foundation, and news claims capped at Tier 4 or V1; never used to support effect sizes |
| Incentive bias | Conflict-of-interest and stake recorded for every forecaster and funder |
| Model validity | Analytical derivation cross-checked against numerical integration; sensitivity analysis; assumptions listed; code committed and reproducible |
| Definitional drift | Working definitions fixed in the RQ Brief; every LEV claim states which sense it uses |
| Currency | Search date stamped; fast-moving items (trials, funding) flagged with as-of date |

## Limitations (By Design)

- **Search-mediated access.** Scholarly hosts are blocked, so verification cannot reach primary texts. Mitigation: verification ladder; dropped V0 claims; recommendation that key figures be re-checked against primary texts once network access is widened.
- **Same-model review.** Drafting, Devil's Advocate, editorial, and ethics roles are all the same model family (fresh contexts reduce anchoring but not shared blind spots). No cross-model check is run (`ARS_CROSS_MODEL` is unset). Stated in the report.
- **No reference class.** LEV has no historical analogue; forecasts are triangulated, not derived.
- **Advocacy-dominated discourse.** Much public material is promotional. Mitigation: tier caps and incentive columns.
- **Stylised model.** Gompertz-Makeham is a good adult-mortality description but omits heterogeneity and cause structure beyond the two-component extension.
- **Moving target.** The field changes monthly; the report is a dated snapshot.

## Ethical Considerations

- No human subjects; secondary analysis of public information.
- Misinformation and false-hope risk: no dosing, products, or protocols; explicit "not medical advice"; epistemic labels on every claim.
- Dual-use: negligible (no methods for harm are described).
- AI disclosure included in the report.
- Equity: access and distribution are treated as part of the question rather than an afterthought.

## Human-Subjects Administrative Status

Not applicable. Secondary analysis of published and public data; no recruitment, consent, or access to identifiable data.

## Reporting Standard

No EQUATOR guideline fits an integrative review with modelling. Adopted: PRISMA 2020 items on search, selection, and appraisal for transparency (not claimed as a PRISMA review), the SANRA checklist for narrative-review quality, and full disclosure of model parameters and code.

## Preregistration

- Recommended: No (exploratory synthesis; no confirmatory hypothesis tests)
- Platform: N/A. This blueprint, committed to the repository before the Phase 2 search, serves as the timestamped protocol record.
- Status: Not applicable
- Completed artifact declaration: not_provided
- Companion handle: none
- Sidecar ownership: dispatching layer only; do not populate a digest here

## Design-Freeze Checkpoint Audit

Cross-model blind check **not run** (`ARS_CROSS_MODEL` unset; no consent given to send content to an external provider). Single-model review only. Primary decision recorded before the Devil's Advocate pass: `revise_before_freeze` (drivers: the presupposition in the original wording; tier-inflation risk from advocacy sources; verification cannot reach primary texts). Confidence: medium.

## Planned deliverables

| Phase | Output |
|---|---|
| 2 Investigation | Per-workstream evidence tables; verified bibliography with V-levels; source-quality matrix; search log |
| 3 Analysis | Synthesis narrative and gap analysis; threshold model, code, and figures; scenario table with leading indicators; DA checkpoint 2 |
| 4 Composition | Full report (target 6,000-9,000 words plus appendices), APA 7.0 references |
| 5 Review | Editor-in-chief review; integrity and ethics review; DA checkpoint 3 |
| 6 Revision | Final report; at most two revision loops; remaining issues listed as acknowledged limitations |
