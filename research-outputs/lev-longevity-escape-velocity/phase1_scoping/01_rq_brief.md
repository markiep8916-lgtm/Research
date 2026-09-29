# Research Question Brief — Longevity Escape Velocity (LEV)

| Field | Value |
|---|---|
| Run | `deep-research` v2.12.1, `full` mode, Phase 1 (Scoping) |
| Date | 2026-09-29 |
| Version | v2, revised after Devil's Advocate Checkpoint 1 (verdict REVISE, six major issues; see `04_da_checkpoint1.md`) |
| Status | Awaiting DA re-check and user confirmation |
| Requested by | User request: "deep research on LEV and when/how we might obtain it" |
| AI disclosure | Produced with AI-assisted research tools (Claude). The scoping below uses background knowledge plus a few orientation searches; nothing here is a finding. Findings begin in Phase 2. |

## Topic Area

Longevity escape velocity (LEV): the hypothesised state in which medical progress extends life expectancy faster than time passes, so that people alive stop running out of expected life. The request asks *when* and *how* it might be obtained. "We" is assumed to mean humanity, with implications for people alive today (to be confirmed by the user).

## Primary Research Question

> Under what conditions, and by what dates if any, does the evidence support the arrival of longevity escape velocity, as formally defined, in human populations?

Design notes on the wording:
- **"by what dates if any"** keeps "not before 2100" a live answer. The request's original wording ("how we might obtain it") presupposed attainability.
- **"Under what conditions"** carries the request's "how": the necessary conditions and pathways are reported as conditions, not as a route that is assumed to exist.
- **"the evidence support"** bounds the claim. The report gives scenario-conditional statements, not a forecast date.
- **"as formally defined"** refers to the frozen definitions below and in `03_analysis_plan.md`.

## Working definitions (frozen; formal statement and mathematics in `03_analysis_plan.md`)

The literature uses "LEV" for several different things, and the popular one-line version and the mathematically clean version are not the same quantity. The report keeps them apart.

| Label | Meaning | Note |
|---|---|---|
| **D-N** (primary) | *No-shrink LEV.* Over a window of at least W years (default 20), for ages in a band B (default 50-90), the period remaining life expectancy of a person one year older, one year later, is at least what it was: e(x+1, t+1) ≥ e(x, t). | Equivalent to gains of at least 1 − μe per year, where μ is the death rate and e the remaining life expectancy. Because μe is not zero above young ages, this needs less than one full year per year at older ages (about 0.75 at 65 and about 0.5 at 80 under typical parameters; to be computed). |
| **D-1** (popular) | *One-for-one LEV.* Remaining life expectancy at a fixed age rises by at least 1 year per calendar year. | The headline formulation. Stricter than D-N above young ages. |
| **D-H** | *Hazard-stationarity.* The death rate an individual faces stops rising as they age and calendar time advances. | Under proportional-decline Gompertz mortality, D-N and D-H coincide; they can diverge under heterogeneity or uneven declines (Phase 3 tests this). Also met without any progress at ages where mortality plateaus (contested above about 105), so band B stops below plateau ages. |
| **Acceleration without LEV** | Sustained mortality decline faster than the recent historical pace but below the D-N threshold. | A plausible intermediate outcome; never labelled "LEV". |
| **Individual vs. population** | An individual with access, vs. a population average (subject to frailty selection). | Individual LEV also requires access; the report carries an access fraction. |

**Baseline measure.** Observed *age-specific hazard-decline rates* in the frontier set (defined below), converted to "age-years gained per calendar year" (v = r/β, where r is the annual proportional decline in death rates and β the Gompertz slope). Life expectancy at birth is context only: the often-quoted best-practice trend of about 0.24 years per year (Oeppen and Vaupel, 2002, female life expectancy at birth; to be re-verified) mixes infant, adult, and old-age components and is not comparable with an age-band criterion. Which "historical pace" is meant is stated wherever it is used (the record-trend, the Vaupel et al. 2021 view that gains have been steady, and the Olshansky et al. 2024 and Andrade et al. 2025 findings of deceleration are all treated as competing readings).

**Terminology.** The 2004 formulation ("escape velocity") is de Grey's; an earlier related term, "actuarial escape velocity", is credited to others (to be verified in Phase 2). "The concept dates from 2004" is not asserted.

**Escape is not survival.** At LEV onset under D-H the hazard stops rising but does not fall: expected remaining life after onset is roughly 1 divided by the hazard at onset (about 20 years for a person of 80 at onset, far more for a person of 60), unless mortality continues to fall. The report gives expected remaining life by age at onset, not "immortality".

Explicitly not the same as: radical life extension to very old ages, "immortality", or maximum-lifespan records.

## FINER Assessment

Rubric (written before scoring, so scores are auditable): 1 = the criterion is not met; 3 = partly met; 5 = clearly met. Feasible: 3 = key inputs indirect. Novel: 1 = duplicates existing work, 3 = new synthesis or frame of existing evidence, 5 = new data or method. Ethical: risk *after* the mitigations designed into the run (a standalone question that carried unmitigated risk scores lower, as candidate 6 shows).

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Feasible | 3/5 | Threshold arithmetic, evidence grading, and bottleneck analysis are feasible with public data. "By what dates" is scenario-conditional, not predictable. Primary-source access is blocked by the network policy, so verification is search-mediated and life-table inputs may be literature-derived. |
| Interesting | 5/5 | Sharp disagreement between advocates and demographers; very large stakes. |
| Novel | 3/5 | A new synthesis frame (hazard-based baseline, pre-specified reference classes, outcome-partition weighting) and a 2024-2026 evidence update. No new data; the threshold arithmetic itself is standard. |
| Ethical | 4/5 | No human subjects. Residual risks (hype, false hope, medical misinformation) are mitigated by epistemic labels, a non-prescriptive individual-level section, and no dosing or product content. |
| Relevant | 5/5 | Informs research funding, regulation, and personal planning. |
| **Average** | **4.0/5** | Meets threshold (average at least 3.0; no criterion below 2). Single-rater; the DA re-check may challenge scores. |

## Scope Boundaries

**In scope**
- **Population.** Humans. The *frontier set is defined by a rule, not copied from any one paper*: the ten countries or territories with the highest period life expectancy at birth in 2019 among populations above 1 million (UN World Population Prospects 2024, or the Human Mortality Database where retrievable), with the United States added as a labelled large-population, non-frontier reference. Results are reported for the frontier set, its best-practice trend, and the US separately. Findings are stated as applying to high-income frontier populations only. Animal evidence is a translational input only.
- **Timeframe.** Life-expectancy and mortality series 1850-2025 (hazard-decline baselines from about 1990 to 2019, pre-COVID); interventions and clinical evidence 2000 to 2026-09-29 (seminal earlier work allowed); scenario horizon to 2100, emphasis on 2026-2060.
- **Interventions.** (a) *Demonstrated human hazard reductions*: risk-factor and cardiometabolic control, vaccines, screening, and drugs with mortality outcomes. This is the calibration anchor for what has actually been achieved. (b) Ageing-biology approaches: geroscience drugs, senolytics, partial reprogramming, gene and cell therapy, tissue and organ replacement and regeneration, immunotherapy, AI-enabled discovery. (c) Cause-specific progress as a component of both.
- **Enabling conditions.** Biomarkers and surrogate endpoints, regulation, funding and capital, translational base rates, public attitudes and demand, access and equity.
- **Individual-level implications.** Evidence-graded and non-prescriptive; derived from (a).

**Out of scope**
- Mind uploading, digital immortality, and speculative nanotechnology (mentioned only as speculative; no evidence grading).
- Cryonics and biostasis as a route (a labelled contingency only; no demonstrated revival).
- Whether life extension is *desirable* (ethical constraints and public attitudes are noted as bottlenecks, not adjudicated).
- Dosing, product or supplement recommendations, investment advice, company valuations.
- Original data collection, surveys, or interviews (no human subjects).

**Key assumptions**
1. LEV is used only in the frozen senses above; each claim states which sense it uses.
2. No catastrophe scenarios are modelled. Extrinsic mortality (accidents, violence, infection) is a floor.
3. Forecasts are treated as evidence with a track record and incentives, not as findings.
4. The knowledge frontier is 2026-09-29 as reachable through web search.
5. Scholarly-database hosts are blocked by this environment's network policy: verification is search-mediated and labelled (verification ladder in the Methodology Blueprint), and model inputs that cannot be corroborated are treated as ranged free parameters.

## Sub-questions (one inference chain: requirement, gap, closure)

1. **SQ1, requirement.** What sustained decline in age-specific mortality does each formalisation of LEV require, over stated ages and windows?
2. **SQ2, gap.** How does that requirement compare with observed declines and with the largest hazard reductions any intervention has demonstrated (in humans; in animals as translational input only), expressed as age-equivalent years and as a rate, and how do hazard reductions compose when combined? A finding of "no pathway demonstrates effects of that kind" is an admissible outcome.
3. **SQ3, closure.** Under what conditions could the gap close, which arrival dates (including "not before 2100") do the conditions and the evidence support, and which bottlenecks and levers (biomarkers, regulation, capital, translation, brain and neurodegeneration, public demand, access and equity) most change those conditions?

### Sub-Question Bindings (#547)

1. inherits: population=frontier set by rule + US reference; timeframe=1850-2025 observed, hazard baselines about 1990-2019; domain=demography and biodemography; deviations: none.
2. inherits: population=humans (animal evidence as translational input only); timeframe=2000 to 2026-09-29; domain=demography, clinical evidence, geroscience; deviations: none.
3. inherits: population=humans (global evidence, findings scoped to high-income frontier populations); timeframe=scenario horizon to 2100; domain=forecasting, regulatory science, health economics, bioethics; deviations: none.

## Candidate Questions Considered

| # | Candidate | FINER Avg | Why not selected |
|---|-----------|-----------|-----------------|
| 1 | Under what conditions, and by what dates if any, does the evidence support the arrival of LEV as formally defined? | 4.0 | **Selected** |
| 2 | What sustained decline in age-specific mortality does each LEV formalisation require; how does it compare with observed declines and the largest hazard reductions any intervention has shown; and what arrival dates, including "not this century", does that support? (proposed by the DA) | 4.2 | Not selected as the *primary* question only because the skill requires a single non-compound sentence. Its three clauses are adopted verbatim as SQ1-SQ3, the inference chain of the run. |
| 3 | In what year will LEV be reached? | 3.2 | Feasible = 1 (below the per-criterion floor); invites false precision. |
| 4 | Which single intervention is most likely to deliver LEV? | 3.2 | Presupposes a single route; the threshold arithmetic points to combinations. |
| 5 | Is LEV physically possible in principle? | 3.0 | Subsumed: "under what conditions, and by what dates if any" contains it, in a form that can be answered with evidence. |
| 6 | What should an individual do to reach LEV? | 3.0 | Ethical = 2 as a standalone question (medical-advice risk, unmitigated). Retained only as a bounded, non-prescriptive implication of SQ2's demonstrated-hazard-reduction evidence. |
