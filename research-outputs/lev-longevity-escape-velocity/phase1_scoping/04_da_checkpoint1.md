# Devil's Advocate Checkpoint 1 — Report and Dispositions

| Field | Value |
|---|---|
| Run | `deep-research` v2.12.1, `full` mode, Phase 1 |
| Date | 2026-09-29 |
| Reviewer | Fresh-context subagent of the same model family, role `devils_advocate_agent` (`deep-research/agents/devils_advocate_agent.md`). Same-family review is a stated limitation; it was given the two documents but not the drafting agent's reasoning. |
| Round 1 | Verdict **REVISE**: 0 critical, 6 major, 3 minor issues |
| Round 2 | See the end of this file |

The DA text is reproduced verbatim (it is subagent output, not a user statement). Its snippet-level facts are the DA's own search results and are **not** verified findings; they are leads for Phase 2.

## Round 1 report (verbatim)

### Devil's Advocate Report — Checkpoint 1

#### Verdict: REVISE

No Critical issues; six Major issues to fix before design freeze. Strengths: the original wording's presupposition was caught and "feasibility" kept in the RQ; "acceleration without LEV" and individual-vs-population are separated; epistemic labels, tier caps, steel-man pairing and incentive columns are unusually disciplined; limits are disclosed honestly. Issue IDs (MJ/mn) are mine; the Brief's "DA issue M1/M3" cites a report I was not given. No text in the documents tried to direct the reviewer.

#### Critical Issues (Blocks Progression)
No critical issues identified. MJ1 and MJ4 come closest; MJ4 escalates if life-table data are unobtainable and no substitute calibration source exists.

#### Major Issues

1. **MJ1. The LEV definitions and the baseline measure different quantities**
   - **Type**: Logical fallacy (equivocation) / Method
   - **Location**: Brief, definitions table; H0
   - **Problem**: The Topic Area says progress "adds more than one year … for every calendar year that passes" (an offset); LEV-strict says remaining lifespan "rises by at least 1 year" (net gain; ≥ not >). "1 y/y" is exact only where hazard × life expectancy ≈ 0: holding remaining expectancy constant needs a gain of 1−μe, which in my ad hoc Gompertz–Makeham toy run (β≈0.09, μ80≈0.05, c≈0.0004; nothing saved) is ≈0.95 at age 30, 0.75 at 65, 0.52 at 80, 0.35 at 90. The 0.25 y/y "best-practice trend" is female life expectancy at birth, so "four times short" compares different quantities; a 2025 PNAS cohort-forecast paper attributes over half of the projected deceleration in life-expectancy gains to mortality below age 5 (snippet-level). LEV-hazard ("stops rising") is met by the reported plateau above 105 (Barbi 2018; disputed as age misreporting); "stricter" is unproven, since in a pure proportional-decline Gompertz model the criteria coincide.
   - **Recommendation**: Freeze formal definitions before Phase 2 (metric, ages, period vs cohort, duration, > vs ≥, a hazard-level condition). Baseline on age-specific hazard-decline rates (≈8.6%/yr needed at β=0.09 versus 1.5%/yr, a common actuarial long-term assumption; snippet-level); demote e0 to context.

2. **MJ2. RQ and sub-questions: residual presupposition, compound, not MECE**
   - **Type**: Bias / Scope
   - **Location**: Primary RQ; SQ2, SQ3; candidate table
   - **Problem**: "Feasibility, timing, and pathways of achieving longevity escape velocity" is still three questions and presupposes pathways; SQ2 asks which pathways "could plausibly produce" declines "of that size", leaving no "none does" outcome. "What does the evidence imply" is topic-shaped; "when" is aspirational. SQ3 bundles timing, "for whom", bottlenecks and levers and is really an integration of SQ1+SQ2; bottlenecks also sit in SQ2. Nothing covers how hazard reductions compose. Candidate #4 ("possible in principle?") is dismissed as unanswerable though "feasibility" in the chosen RQ is the same question; the other rivals are straw.
   - **Recommendation**: Core RQ: "What sustained decline in age-specific mortality does each LEV formalisation require; how does it compare with observed declines and the largest hazard reductions any intervention has shown; what arrival dates, including 'not this century', does that support?" Make "how" conditional, rewrite SQ2 as "does any pathway, alone or combined, demonstrate…", move bottlenecks to SQ3, add a composition SQ, score this core as a candidate.

3. **MJ3. H0–H2 are not a partition**
   - **Type**: Logical fallacy (unfalsifiable, overlapping)
   - **Location**: Blueprint hypothesis table
   - **Problem**: H0 is conditional ("Without a step-change … LEV is not reached"), near-tautological once SQ1 is done, bundles two claims, and embeds "several-fold" before it is derived. Horizons differ (this century / "within decades" / none), so "acceleration now, LEV in 2110", or LEV through disease-by-disease progress rather than "ageing-biology" interventions, falls between hypotheses. "Null" contradicts "equal weight", and "shifts the balance" has no likelihood structure: AUTHOR-JUDGMENT in disguise.
   - **Recommendation**: Partition on outcomes with one horizon: A = decline pace ≤ historical through 2100; B = accelerated, below threshold; C = threshold crossed (≤2060; 2060–2100; later); mechanism as a second axis. Replace "shifts the balance" with a pre-specified evidence × hypothesis diagnosticity matrix (ACH).

4. **MJ4. The threshold model can hard-code its answer and omits key structure**
   - **Type**: Method
   - **Location**: Blueprint step 1
   - **Problem**: (a) If a share f of age-related hazard is un-improvable and rises with age, hazard along a person's path grows at rate β whatever else happens: in my toy run a frozen 5% share raises path hazard 2.7× over 40 years despite ideal decline elsewhere. f=0 permits LEV, f>0 forbids it; sensitivity to f is a knife-edge, not evidence. (b) Level vs rate: pathway rows report one-off hazard reductions; LEV needs a sustained rate. A SPRINT-scale ~27% mortality cut (snippet-level) is ln(1/0.73)/0.09 ≈ 3.5 Gompertz age-years once, against ≥1 per calendar year. (c) Missing: frailty heterogeneity (selection produces population-level deceleration even with Gompertz individuals), plateau and age misreporting, period–cohort confounding, competing risks and uneven cause-specific declines (dementia coding is unreliable at 85+). (d) HMD/UN hosts are probably unreachable, so "observed decline rates" may rest on snippet-quoted numbers.
   - **Recommendation**: Give the resistant component its own improvement rate and define LEV over stated finite windows. Convert every effect to age-equivalent years. Add gamma-Gompertz and plateau variants and Monte Carlo sensitivity. State data availability now; if life tables are unreachable, label SQ1 "illustrative arithmetic with literature parameters".

5. **MJ5. The verification ladder can be passed by echo**
   - **Type**: Evidence
   - **Location**: Blueprint ladder V0–V3; Inclusion
   - **Problem**: WebSearch returns a model-written summary; here one said LEV was "coined 2004" yet had "roots since at least the 1970s". "Two independent hits" is undefined: of nine hits on the June 2026 ER-100 dosing, eight are the company's own pages, release, reprints or apparent rewrites; only the registry record is independent, and it cannot show dosing or "first". Two same-day, identically titled TAME articles on different domains would also pass. "Primary-party disclosure" is includable yet cannot reach V2 (RMR1 sits only on the foundation's site); V1 "pointers" conflict with "V2 or higher".
   - **Recommendation**: Define independence by origin (a wire family = one hit). Log verbatim result text, URL and timestamp; only the result's own excerpt counts, not the tool's summary. V3 = a primary-domain excerpt containing the figure plus an origin-independent second source. Add V2-P (self-reported) and an event-log class for V1. Model inputs must be V3 or ranged free parameters. Re-run ~10% of key queries, reworded, to audit reproducibility.

6. **MJ6. The method bounds "how much" but not "when"; scope is mis-shaped**
   - **Type**: Method / Scope
   - **Location**: Blueprint steps 3–4; Scope
   - **Problem**: Forecast triangulation converts stake-conflicted forecasts into implied hazard rates though most state no age band, duration or definition, so the conversion is the analyst's assumption. Limitations says "No reference class", yet step 3 uses past forecast failures and translational base rates: those are reference classes, and must be fixed ex ante or they will be chosen post hoc. "Leading indicators observable by 2030" cannot include mortality (lag). Scope is too wide (W1–W5, ≥8 intervention classes, 6,000–9,000 words at V3 rigour) yet omits the dominant near-term hazard levers (cardiometabolic drugs, vaccines, risk factors).
   - **Recommendation**: Present "when" as scenarios conditional on necessary conditions, with a forecaster-vintage table (each forecaster's successive target dates; snippets suggest de Grey's 50% date moved, unverified) and pre-specified reference classes (broken demographic-limit predictions; failed longevity-drug hypes; first-in-class attrition in chronic disease; TAME-type institutional stalls). Use intervention-side indicators. Tier SQ2: five or six deep rows plus an appendix, anchored by a "demonstrated human hazard reductions" row.

#### Minor Issues
- **mn1 FINER**: arithmetic is right (20/5 = 4.0), but scores are single-rater one-liners; "Novel 3" is generous (Gompertz threshold arithmetic is standard); Ethical 4 versus candidate #5's Ethical 2 is inconsistent when the "bridge actions" section carries the same risk. Add a written rubric.
- **mn2 Preregistration**: "No" conflicts with hypothesis weighing and probability outputs; commit the model spec, weighting rules and AUTHOR-JUDGMENT decomposition template before Phase 2.
- **mn3 Provenance**: cite the source of "DA issue M1/M3" or remove it. The disclosed pre-DA decision risks anchoring (I did not use it), and this DA is same-family, so a human biodemographer's check of the model spec is the cheapest mitigation.

#### Observations
- At LEV-hazard onset, hazard freezes at its current level (~5%/yr at 80): "escape" is not "survival". The race table should report expected remaining life by age at onset.
- Sceptics have stakes too: Olshansky's "longevity dividend" programme (modest slowing of ageing) is essentially H2; the RMR1 self-report comes from the LEV Foundation. Apply incentive columns symmetrically.

#### Strongest Counter-Argument
"The report reaches a verdict-shaped answer by construction: a threshold on a metric that does not match the concept; a central sensitivity parameter that fixes feasibility by assumption; hypothesis weighing with no likelihood structure; numbers confirmed through model-written search summaries where wire copy counts as replication; and forecast 'triangulation' of stake-conflicted claims. A demographer sees a toy model, an advocate a sample and baseline borrowed from the leading sceptical paper, a forecaster no pre-committed reference class."

#### What's Missing
- Pre-specified reference classes, forecaster vintages, and demonstrated human hazard reductions as calibration anchors (MJ6).
- Public attitudes and adoption: Pew 2013 found 56% would personally decline radical life extension and 51% called it bad for society (41% good), a demand-side and political-economy bottleneck.
- Cause-of-death coding limits behind the "resistant fraction"; non-frontier heterogeneity for "for whom"; independent domain review.

#### Stress Test Results
| Test | Result |
|---|---|
| Remove strongest source — does argument hold? | Yes for any single paper; No if the threshold model or its data fail. |
| Flip the research question — is opposing view credible? | Yes; "why not this century" is equally answerable; H0 covers it only if rewritten (MJ3). |
| Apply to different context — does finding generalize? | No; frontier high-income evidence only, by design; state this. |
| "So what?" — is significance justified? | Yes, if outputs are thresholds, age-equivalent distances and leading indicators, not a date. |

#### Fact-check of checkable lines (WebSearch; snippet-level unless noted)
| Line | Result |
|---|---|
| "Aubrey de Grey's formulation, 2004 onward" | Verified: PLoS Biology, June 2004. |
| "The concept dates from 2004." | Overstated: "actuarial escape velocity" is credited to Gobel earlier; say "term/formulation". |
| "about 0.25 years per year … Oeppen and Vaupel, 2002" | Number verified (slope ≈0.243) but female e0; later pace disputed (Vaupel 2021 steady; Olshansky 2024, Andrade 2025 slowing): H0 must say which "historical pace". |
| "longest-lived and best-documented countries" | Identical to Olshansky 2024's ten (paper verified): eight longest-lived + Hong Kong + US. The US is not among the longest-lived; Hong Kong and South Korea were the reported exceptions to deceleration. Define the frontier ex ante. |
| "first reprogramming trial in humans" | Verified as company claim: ER-100 first patient dosed 9 June 2026; Phase 1 safety, not mortality endpoints, so "not informative for the hazard threshold". |
| "LEV Foundation mouse results" | RMR1 (2023–25, ~1,000 mice, four interventions): mean-lifespan gain, no radical maximum-lifespan extension; foundation site only (V1). |

Also verified: the FINER threshold and the "gray zone = FAIL" Iron Rule match the skill files.

#### What would change my verdict
- Frozen formal definitions with a hazard-based baseline (MJ1).
- Outcome-partition hypotheses with a diagnosticity matrix (MJ3).
- A model spec with a time-varying resistant component, frailty and plateau variants, and a data-availability statement (MJ4).
- A verification addendum with origin-independence, verbatim capture and V2-P (MJ5).
- MJ2 and MJ6 addressed or explicitly reasoned away. Together these give PASS.

Least sure: MJ4(a). I inferred a frozen resistant share from a one-sentence spec, and my toy arithmetic is illustrative, not a validated model.

## Disposition of Round 1 findings

Concession discipline: each finding is accepted, adapted, or rejected on its merits, with the reason recorded. Nothing is accepted merely because the DA raised it.

| ID | Disposition | What changed | Where |
|---|---|---|---|
| MJ1 | **Accepted** | Definitions frozen as D-N, D-1, D-H with formal conditions. The popular "1 year per year" is now D-1, identified as stricter than D-N above young ages (gain needed is 1 − μe). Baseline is age-specific hazard decline converted to age-years per year; life expectancy at birth is context only; competing readings of the historical pace are all reported. The "LEV-hazard is stricter" claim is dropped: prediction P1 says D-N and D-H coincide under proportional-decline Gompertz, and divergence is tested. Plateau caveat added (P5). | `01`, `03` §2-§4 |
| MJ2 | **Accepted, with one deviation** | Primary RQ rewritten as one sentence ("Under what conditions, and by what dates if any..."). The DA's proposed question is adopted as the SQ1-SQ3 inference chain (requirement, gap, closure); "no pathway demonstrates this" is admissible in SQ2; bottlenecks moved to SQ3; composition added to SQ2. The DA's candidate scores 4.2 against 4.0 for the selected RQ; it is not the primary question only because the skill requires a single non-compound sentence, and this is recorded in the candidate table. | `01` |
| MJ3 | **Accepted** | H0-H2 replaced by an outcome partition O1-O4 over one horizon (2100) with a mechanism axis, and a diagnosticity matrix with pre-set weights. No "null". The matrix orders outcomes by high-weight inconsistency; it produces no probabilities. | `02`, `03` §9 |
| MJ4 | **Accepted** | The resistant component has its own improvement rate and LEV is evaluated over finite windows (escape duration, not a switch). Effects are converted to age-years and to the cadence needed. Frailty (gamma-Gompertz), plateau, and cause-specific variants added; Monte Carlo sensitivity; data-availability statement ("illustrative arithmetic with literature parameters" if life tables are unreachable). Note: the v1 wording did not fix the resistant component's improvement rate, so the DA's knife-edge reading was fair. | `03` §3-§7 |
| MJ5 | **Accepted, one part adapted** | Independence by origin; existence (E) separated from figure corroboration (F); V2-P and an event-log class added; model inputs must be V3 or ranged; verbatim logging; about 10% reproducibility re-run. **Adapted:** the DA asks that only a result's own excerpt count, not the tool's summary. This search tool returns a link list and a model-written summary but no excerpts, so no figure could ever qualify. F3 instead requires recurrence across separately worded queries with origin-independent links, and the ladder states that nothing reaches primary-text verification. Widening network access is the real fix, and it is put to the user. | `02` ladder v2, `00` |
| MJ6 | **Accepted** | "When" is scenario-conditional with necessary conditions, a forecaster-vintage table, reference classes RC1-RC5 fixed ex ante, and intervention-side leading indicators. SQ2 is tiered with a demonstrated-human-hazard row as the anchor; near-term hazard levers are in scope. "No reference class" became "no direct reference class". | `01`, `02`, `03` §10-§11 |
| mn1 | **Partly accepted** | Written FINER rubric added; the Ethical inconsistency is explained (post-mitigation for the selected RQ vs. unmitigated for the standalone candidate). Novel stays at 3, anchored by the rubric to "new synthesis frame, no new data"; a re-check may challenge it. | `01` |
| mn2 | **Accepted** | Lightweight preregistration: the analysis plan (model, weighting, decomposition template, reference classes) is committed before Phase 2. | `02`, `03` |
| mn3 | **Accepted** | References to a non-existent DA report removed; the pre-DA decision text removed; independent biodemographer review recommended as a limitation and in the final report. | `01`, `02` |
| Obs | **Accepted** | "Escape is not survival" and P6 (expected remaining life at onset); stake columns symmetric for both camps. | `01`, `02`, `03` |
| Fact-check | **Accepted** | Term origin softened; frontier set defined by rule; first-in-human claim stated as company-reported Phase 1 safety; RMR1 labelled self-reported (V2-P). All DA snippet-level facts are leads only. | `01`, `02`, `00` |

## Round 2 (re-check)

(pending)
