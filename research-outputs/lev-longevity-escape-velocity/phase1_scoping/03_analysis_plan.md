# Analysis Plan (frozen before Phase 2) — LEV

| Field | Value |
|---|---|
| Run | `deep-research` v2.12.1, `full` mode |
| Date | 2026-09-29 |
| Status | Frozen when committed, before any Phase 2 search. Later changes only as dated entries in §13 (Deviations), each with a reason; if a deviation touches a headline result, the analysis is also reported under the original specification. |
| Origin | Written in response to Devil's Advocate Checkpoint 1 (`04_da_checkpoint1.md`), issues MJ1, MJ3, MJ4, MJ5, MJ6 and mn2. |
| Inputs | `01_rq_brief.md`, `02_methodology_blueprint.md` |

Everything here is a plan. The analytic statements in §3 are *predictions to be checked numerically in Phase 3*, not findings.

## 1. Notation

- μ(x,t): death rate (force of mortality) at age x in calendar year t. h(τ) = μ(x0+τ, t0+τ) is the hazard a person aged x0 at t0 faces τ years later.
- e(x,t) = ∫₀^∞ exp(−∫₀^s μ(x+u, t) du) ds: **period** remaining life expectancy (mortality frozen at year t). Identity: ∂e/∂x = μe − 1.
- Baseline model M0 (Gompertz-Makeham with proportional progress): μ(x,t) = A·e^{βx}·e^{−R(t)} + c, with R(t) = ∫r(s)ds and c an extrinsic-mortality floor. β is the Gompertz slope (mortality-rate doubling time MRDT = ln2/β).
- Age-equivalent rate: v = r/β, in age-years gained per calendar year (uniform proportional decline, c = 0). A one-off proportional hazard reduction to a fraction k of the previous hazard equals g = ln(1/k)/β age-years.

## 2. Formal definitions (frozen)

Parameters common to all: age band **B** (default 50-90; sensitivity 30-90 and 65-90; the upper limit stays below ages where mortality plateaus), window **W** (default 20 years; sensitivity 10 and 40), and the inequality is **≥**. "Sustained" means the condition holds at every t in the window.

| Label | Condition |
|---|---|
| **D-N** (primary, no-shrink) | For x in B, t in the window: e(x+1, t+1) ≥ e(x, t); in continuous form ∂e/∂t ≥ 1 − μe. |
| **D-1** (popular one-for-one) | For x in B, t in the window: ∂e/∂t ≥ 1 (also reported for life expectancy at 50 and 65). |
| **D-H** (hazard-stationarity) | For paths starting at x0 in B: dh/dτ ≤ 0, i.e. ∂μ/∂x + ∂μ/∂t ≤ 0 over the window. |
| **Acceleration without LEV** | Sustained r above the recent historical pace but D-N not met. |

Population versions use population-average hazards (with frailty selection); individual versions use an individual's hazard and carry an access fraction a (population-level proportional decline ≈ a × individual-level decline, to first order). Life expectancy at birth is reported only as context.

## 3. Analytic predictions to be verified numerically

Under M0 with constant r and c = 0:

- **P1.** e(x,t) = G(x − v·t), where G(y) is the frozen-2026 period remaining life expectancy at age y, so ∂e/∂t = v(1 − μe). Hence **D-N ⟺ v ≥ 1 ⟺ D-H ⟺ r ≥ β**, and **D-1 ⟺ v ≥ 1/(1 − μe)** (stricter than D-N above young ages, because μe > 0 there).
- **P2.** The required annual proportional decline in death rates is 1 − e^{−β}: about 6.7% to 9.4% per year for MRDT of 10 to 7 years (β = 0.069 to 0.099). Compared with the observed pace (to be measured in Phase 3 from Phase 2 inputs).
- **P3.** An extrinsic floor c that neither ages nor improves leaves the D-N threshold unchanged (at r = β the path hazard is constant, so e(x+1, t+1) = e(x, t) exactly) and caps remaining life at about 1/c however far the age-related part is reduced. (Corrected before Phase 2; see §13.)
- **P4.** With a resistant component that improves at rate r_r < β, D-H fails asymptotically but can hold over a finite window; the **escape duration** (longest window in which D-N holds) is reported as a function of resistant share and r_r. It is *not* treated as a yes/no feasibility switch.
- **P5.** At ages where the hazard is constant (a mortality plateau), D-N holds with no progress at all (e no longer shrinks with age). Band B therefore stops below plateau ages, and plateau variants are flagged.
- **P6.** At D-H onset the hazard freezes at its onset value h*: expected remaining life is about 1/(h* + c) unless mortality keeps falling. The race table reports it by age at onset.

## 4. Baselines and what is compared

- **Observed pace.** Age-specific hazard-decline rates r_obs(x) for x in 60-90 in the frontier set (rule in the RQ Brief), by sex, over 1990-2019 and 2010-2019, plus the US separately, converted to v = r_obs/β. If life tables are unreachable (network policy), r_obs is taken from literature-reported ranges and SQ1/SQ2 are labelled **"illustrative arithmetic with literature parameters"**.
- **Competing readings of the historical pace**, all reported: the best-practice female life-expectancy trend (about 0.24 y/y; context only), the view that gains have been steady (Vaupel et al. 2021), the view that they are decelerating (Olshansky et al. 2024; Andrade et al. 2025, which attributes much of the projected slowdown to mortality below age 5).
- **Demonstrated effects** are entered as one-off hazard ratios and converted to age-years (§7); the comparison is a *rate* (age-years per calendar year, i.e. a cadence), never a level against a rate.

## 5. Models and parameter ranges (pre-Phase-2 placeholders)

Central values are updated from Phase 2 evidence; every change is logged in §13.

| Element | Range or form |
|---|---|
| β (Gompertz slope) | 0.069-0.099 (MRDT 7-10 years), central about 0.087 (MRDT 8) |
| Hazard level | μ(60) 0.004-0.014 (frontier-like to US-like); calibrate A so that e(50) and e(65) reproduce published values within ±1 year for each anchor |
| Extrinsic floor c | 0.0002-0.0010 per year |
| **M1 two-component** | Amenable part improves at r_a(t); resistant part (share ρ of the age-80 hazard, ρ in {0, 0.05, 0.10, 0.20, 0.30}) improves at its own rate r_r in {0, 0.01, 0.02, 0.04, β} |
| **M2 frailty** | Individual hazards Gompertz with gamma frailty (variance σ² in {0, 0.1, 0.2, 0.4}); population-level deceleration; plateau variant caps population hazard at 0.4-0.7 per year above age 105 (contested; flagged) |
| **M3 cause-specific** (optional) | Cause shares at ages 65-90 from published cause-of-death data; each cause has its own r_k; dementia and other coding limits noted |
| Progress trajectories | constant r in {0.015, 0.03, 0.05, β, 1.5β}; ramp from the historical pace to r_max over T_ramp in {10, 20, 30, 40} years starting at T_start in {0, 10, 20}; discrete interventions of size g age-years every T years |
| Valid ages | 30-105. The model is not used for infancy or early life. |

Numerical method: age step 0.1 year, time step 0.1 year, exact life-table integration; closed-form Gompertz checks; invariance tests; unit tests; fixed random seed; code, parameters, and output CSVs committed under `phase3_analysis/model/`.

## 6. Outputs planned

T1 required decline by definition and β (analytic and numeric); T2 observed vs. required by age band, sex, and country group; T3 pathway table in age-years and cadence; T4 escape-duration heatmap over (ρ, r_r); T5 race table (probability of surviving to onset, and expected remaining life at onset, by current age and onset year, under frozen 2026 mortality and under continued historical improvement); F1 e(x,t) schematic; F2 Monte Carlo tornado (Latin hypercube over the ranges above; distributions reported, not a single value).

## 7. Level-to-rate conversion and composition

- One-off hazard ratio k → g = ln(1/k)/β age-years (uniform proportional hazards). Example: a 27% reduction in mortality (k = 0.73) is about 3.5 age-years at β = 0.09, once.
- To sustain v = 1 requires g age-years of new benefit **every g years**, compounding. The pathway table reports "years of cadence needed" alongside each effect.
- Composition: multiplicative hazard ratios (independent pathways) and sub-multiplicative variants (overlap 0-50%); the number of independent effects of each size needed is reported.
- Animal lifespan effects are shown as relative changes only and converted to a human-hazard equivalent solely as an **upper-bound thought experiment** labelled [SPECULATIVE], with the assumption stated.

## 8. Evidence-to-model input rules

A model input is fixed only if its source is **V3** (verification ladder in the Methodology Blueprint). Otherwise it is a **ranged free parameter** whose range spans the values reported by any V2 or V2-P source. Parameters that no source supports keep the ranges in §5. The parameter table in Phase 3 lists each input, its source cards, and its V-level.

## 9. Weighting: outcome partition and diagnosticity matrix

Outcomes for frontier populations, by 2100, on the D-N criterion (mutually exclusive and exhaustive over that horizon):

| ID | Outcome |
|---|---|
| **O1** | Stagnation or deceleration: sustained decline in adult age-specific mortality at or below the recent historical pace through 2100 |
| **O2** | Acceleration short of LEV: sustained pace above the historical range but D-N never met |
| **O3** | Early LEV: D-N met and sustained with onset in or before 2060 |
| **O4** | Late LEV: onset 2061-2100 |

A second axis for O3 and O4 records the mechanism: M-a ageing-biology interventions; M-b disease-by-disease progress; M-c both, or other (replacement, AI-designed).

**Analysis of competing hypotheses.** Each evidence item is rated against O1-O4 as consistent (C), inconsistent (I), or neutral (N), with a weight fixed by rule:

- **High:** human data measuring hazard or mortality outcomes; definitional mathematics and official statistics; multi-site replicated mammalian lifespan data.
- **Medium:** single-lab lifespan data; human biomarker-only trials; regulatory and institutional facts; analyses of forecasting track records.
- **Low:** stakeholder forecasts; company or foundation statements; commentary.

Rules: items consistent with every outcome are dropped as non-diagnostic; inconsistency counts double relative to consistency (ACH convention); results are reported as the list of high-weight inconsistent items per outcome and an ordering by least inconsistency, **not as probabilities**. Stakes are recorded for optimists and sceptics alike (books, companies, grant programmes, advocacy roles).

**Optional AUTHOR-JUDGMENT bands.** A probability band for O3+O4 by 2100 is offered only if the conjunctive decomposition below is filled, with a low/central/high range and a one-line evidence anchor for each factor, and shown with its sensitivity. It is reported as a coarse band, never a bare number. If a factor has no evidential anchor, the report says "not estimable".

| Factor | Statement |
|---|---|
| F1 | An intervention (or combination) with a large, human-relevant hazard effect exists |
| F2 | Effects can be repeated and stacked at the required cadence |
| F3 | Safe delivery at scale, including tissues that resist intervention (brain) |
| F4 | Regulatory acceptance, capital, and diffusion (including access) |
| F5 | No binding residual cause of death that stays outside the intervention set |

## 10. Reference classes (fixed ex ante)

| ID | Class | Extracted | Bias direction it illustrates |
|---|---|---|---|
| RC1 | Declared demographic limits to life expectancy, later broken | Number and timing of broken limits | Pessimists have been wrong before |
| RC2 | Anti-ageing "breakthrough" claims that failed replication or efficacy tests | Cases and outcomes | Optimists have been wrong before |
| RC3 | First-in-class therapeutics in chronic disease | Attrition by phase; years from proof of concept to approval | Delay and attrition prior |
| RC4 | Institutional stalls of ageing-indication efforts (e.g. TAME funding, ICD wording, biomarker acceptance) | Time and outcome | Institutional friction prior |
| RC5 | Expert forecast accuracy for technology and science timelines | Published calibration results | Weight to give any stated date |

The classes are used as priors on delay and attrition, never as point forecasts. Each is presented alongside its opposite-direction class.

## 11. Forecast handling and scenarios

- **Forecaster-vintage table:** forecaster; statement date; claim (what, by when, with what probability); whether a definition is stated (yes/no/ambiguous); stake; source card; and *conversion*. A forecast is converted to an implied hazard-decline rate only if it states, or unambiguously implies, a definition, band, and duration; otherwise it is "not convertible" and alternative readings are listed.
- **Scenarios S1-S4** correspond to O1-O4. Each lists necessary conditions, **intervention-side leading indicators observable by 2030** (not mortality, which lags), and falsifiers. Candidate indicators: a mortality-outcome human trial of an ageing-biology intervention; regulatory acceptance of an ageing-related composite endpoint; a validated surrogate biomarker; systemic (not local) reprogramming delivery in humans; multi-site large-mammal lifespan extension; replicated combination effects in mice.
- "When" is presented as scenario-conditional statements with these conditions and indicators, never as a forecast date.

## 12. Verification and review

- The verification ladder (V0-V3, V2-P) is defined in the Methodology Blueprint. About 10% of load-bearing queries are re-run with different wording by a second agent and compared.
- Same-family review is a limitation. **Recommended before any reliance on the model:** independent review of §2-§7 by a biodemographer.

## 13. Deviations log

| Date | Change | Reason | Affects a headline result? |
|---|---|---|---|
| 2026-09-29, before any Phase 2 search | P3 corrected: an extrinsic floor c does not lower the D-N threshold (v ≥ 1 still); it only caps remaining life at about 1/c. Access-fraction wording tightened. | A scratch numerical check of P1-P3 (Gompertz, β = 0.09, μ(80) = 0.05, c = 0.0004) gave e(x+1, t+1) − e(x, t) = 0.0000 at v = 1 for x = 50, 65, 80, contradicting P3 as first written. The same check reproduced 1 − μe = 0.95, 0.88, 0.74, 0.52, 0.34 at ages 30, 50, 65, 80, 90, D-1 requirements of v ≥ 1.13, 1.34, 1.94 at ages 50, 65, 80, and required declines of 6.7% to 9.4% per year for MRDT 10 to 7 years. The scratch script is not committed; Phase 3 reproduces these checks as committed unit tests. | No (no result existed yet) |
