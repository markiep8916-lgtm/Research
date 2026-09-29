# Devil's Advocate Checkpoint 1 — Report and Dispositions

| Field | Value |
|---|---|
| Run | `deep-research` v2.12.1, `full` mode, Phase 1 |
| Date | 2026-09-29 |
| Reviewer | Fresh-context subagent of the same model family, role `devils_advocate_agent` (`deep-research/agents/devils_advocate_agent.md`). Same-family review is a stated limitation; it was given the two documents but not the drafting agent's reasoning. |
| Round 1 | Verdict **REVISE**: 0 critical, 6 major, 3 minor issues |
| Round 2 | Verdict **REVISE (narrow, one pass)**: 0 critical, 3 new major (N1-N3), formula errors in P3 and P6, several minor items. Report and dispositions at the end of this file |
| Round 3 | Spot check of the diffs: pending |

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

## Round 2 report (verbatim)

The reviewer was the same subagent, resumed with the revised files, under the Concession Threshold Protocol. Its search-derived statements are leads, not verified findings.

### Devil's Advocate Report — Checkpoint 1, Round 2

#### Verdict: REVISE (narrow, one pass)
No Critical issues. Round 1's six Majors are mostly closed, and the revision is a real improvement. Three new Majors (N1–N3), all cheap to fix, and errors in two frozen predictions. Fix before the freeze; afterwards each becomes a logged deviation. Verified independently: the skill rule behind MJ2, P1–P6 and §7 by scratch numerics (nothing written), and the ACH convention by search.

#### Condition-by-condition
| Round 1 condition | Status | Reason |
|---|---|---|
| MJ1 frozen definitions, hazard baseline | Met | D-N, D-1, D-H frozen with band, window, ≥; baseline v = r/β; e0 context only. P3 and P6 need correction. |
| MJ3 partition + diagnosticity matrix | Partly met | One horizon, no null, matrix present; O1–O4 has holes (N1); weighting under-specified and tilted (N3). |
| MJ4 resistant rate, frailty, plateau, data statement | Met | M1 with own r_r, escape duration, M2/M3, Monte Carlo, literature-parameter fallback. |
| MJ5 origin, verbatim capture, V2-P | Partly met | Origin rule, logging, V2-P, event log, re-runs present; F3 still checks link presence, not attribution (N2). |
| MJ2 + MJ6 | Met | MJ2 by reasoned deviation; MJ6 by scenarios, vintages, RC1–RC5 ex ante, tiered SQ2. RC balance is new (N3). |

#### DA-DECISION log
[DA-DECISION: Score 5/5 | ACTION: Concede | REASON: (a) MJ2 deviation. The skill (research_question_agent.md lines 213–214) requires one sentence and no compound questions; my RQ was three-clause and its content survives as SQ1–SQ3. Residual, minor: "and" joins conditions and dates; "the arrival" mildly presupposes.]
[DA-DECISION: Score 4/5 | ACTION: Hold | REASON: (b) MJ5 adaptation. Conceded: excerpt-only was unimplementable (tool returns links plus a model-written summary). Held: F3 never binds a figure to a source, so a sponsor-only claim can still reach V3; bar was 5/5 after (a).]
[DA-DECISION: Score 4/5 | ACTION: Concede | REASON: (c) Novel = 3 follows a written rubric and is candid ("arithmetic itself is standard"); even a 2 leaves the average at 3.8. Gap: the rubric is self-authored and barely discriminating.]
Pause: 2 of 3 conceded. Am I too lenient? (a) is forced by a verified rule, (c) cannot change pass/fail, and the substantive point (b) was held. Bar for further rebuttals: 5/5.

#### Mathematics check (β = 0.0866, μ80 = 0.05; scratch numerics)
Correct: ∂e/∂x = μe − 1 (derived); continuous D-N and D-H forms; P1 (∂e/∂t = v(1−μe); D-N derivative changes sign exactly at v = 1); D-N ⟺ D-H under M0; D-1 ⟺ v ≥ 1/(1−μe); P2 (6.70%, 9.43%); P5; g = ln(1/k)/β = 3.50; cadence and compounding (six stacked k = 0.73 give 0.151 vs e^{−1.8} = 0.165). D-1 needs v ≥ 1.13, 1.36, 1.96, 2.9 at ages 50, 65, 80, 90: far stricter than "above young ages" suggests. D-N needs v ≥ 1 at every age; only the e-gain (1−μe) falls with age, so headline v, not "0.5 at 80".
Errors:
- **P3 is false for M0 as written.** With additive c, ∂ₓμ + ∂ₜμ = (β−r)(μ−c), so D-N ⟺ D-H ⟺ v ≥ 1 exactly (c = 0.0004: negative at v = 0.98, zero at 1.0, positive at 1.02). "Slightly less than 1" holds only if progress also scales c.
- **P6 double-counts the floor.** h is total hazard (§1): remaining life is 1/h*, not 1/(h*+c) (33% low at h* = 0.002).
- P4 needs r_a > β; at r_a = β, D-H fails at once. "Population progress = a × individual" is first-order only (mixture: ln(1−a(1−k)) ≠ a ln k). r is a log-rate; "annual proportional decline" is 1−e^{−r}.

#### New issues
- **N1 Major: O1–O4 is not a partition.** (i) O1 "at or below the pace" vs O2 "above the range" leaves a gap; "which pace" is unresolved. (ii) D-N held for fewer than W years, or only until a resistant component binds (your P4), is neither O2 ("never met") nor O3/O4 ("sustained"). (iii) Onset, individual vs access-weighted D-N, and 2100 truncation are unspecified. Fix: classify by the first W-year window in a smoothed series; O2 = residual; O1 = no window and pace ≤ a preset r_hist.
- **N2 Major: F3 checks domains, not attribution.** Two summaries stating a sponsor's claim, plus a co-occurring registry link, meet F3, yet registry entries are sponsor-entered (I called the registry "independent" in Round 1; it is independent of the wire chain, not of the sponsor). Fix: F3 needs summary sentences attributing the figure to ≥2 named sources whose authorship differs and whose domains are in the link list (one primary); else F2; tag figures "summary-mediated". Also: the Blueprint says V2-P is never effect-size evidence, but §8 lets V2-P set input ranges.
- **N3 Major: the weighting devices lean one way.** (i) "Inconsistency counts double" is not the ACH convention (Heuer ranks by inconsistency alone); no numeric weights. Pre-2030 evidence can rule out O3/O4 preconditions but can barely contradict O1/O2, so ordering by least inconsistency favours the outcomes that assert least. (ii) RC2–RC4 are delay priors; RC1 shows limits fail, not that pace accelerates; nothing covers step-changes or sustained cause-specific declines (e.g. HAART-era HIV, CVD, hepatitis C cure), the natural pro-LEV rate class, convertible to v. The promised opposite-direction pairing is absent. (iii) A conjunctive F1–F5 band built from marginals is low by construction when factors correlate or routes (M-a/b/c) are separate. Fix: add RC6 and pair classes; a symmetric "expected by 2030 under each outcome" column; numeric weights; routes as disjunction.
- **Minor:** frontier ranked by e0 imports under-5 mortality into an old-age study (rank by e65 or age-standardised 65–89 mortality, average 2015–19, vary N); baseline ages 60–90 vs band 50–90; V2-P "E2 (company page)" contradicts the E definition; 130-word cards cannot hold two query logs (cite log IDs); "citation chaining" is not executable without reference lists; W2/W4/W5 overlap; D-N "at every t" needs smoothing for realised data. Scope is tractable to collect with F3 double-querying limited to load-bearing figures, but a 6–9k-word report cannot absorb ~200 cards: set a citation budget now.
- Frame-lock check: the premise that pre-2030 evidence discriminates O1–O4 is raised as N3; nothing else new.

#### What would change my verdict
- N1 fixed by definition (window functional, residual O2).
- N2: attribution-bound F3, or V3 relabelled "summary-mediated".
- N3: RC6, symmetric expectations column, numeric ACH spec.
- P3 and P6 corrected. Then PASS; a DA spot check of the diffs suffices.

#### Least sure
N3(iii): the F1–F5 band is optional, so the conjunction tilt may never bite. Also whether attribution-bound F3 is workable at scale given summary quality.

## Disposition of Round 2 findings

| ID | Disposition | What changed | Where |
|---|---|---|---|
| N1 | **Accepted** | Outcomes are now an ordered first-match rule over a **LEV window** (at least W consecutive years of smoothed D-N at every age in the band): O3 onset by 2060; O4 first window onset 2061-2100 (may extend past 2100); O2 no window by 2100 but some W-year window above the preset bound v_hi, which includes short D-N episodes; O1 otherwise. v_hi is fixed from W1 before any rating. Population-level, access-weighted classification; individual-level reported separately. | `03` §2, §9; `02` |
| N2 | **Accepted** | Ladder v3: figures must be attributed by search-output sentences to at least two named sources of different authorship (two separately worded queries; one primary and independent of the claim's producer); new E-P class for a party's own domain; registry entries count as sponsor-entered for effects and status; V2-P never sets a range (the §8 inconsistency is removed); every figure tagged summary-mediated; running agents were sent the amendment by message; load-bearing figures are re-verified by a second agent (Phase 2b). | `02`, `03` §8, `00` |
| N3 (i) | **Accepted** | Heuer convention: outcomes ordered by weighted inconsistency only; numeric weights (3/2/1); expectations by 2030 written for every outcome before rating; expectation coverage reported beside each score. | `03` §9 |
| N3 (ii) | **Accepted** | RC6 added (step-changes in cause-specific mortality) as the pro-acceleration class; classes paired (RC1 with RC2; RC3 and RC4 with RC6; RC5 general). The running W6 agent was told to collect RC6. | `03` §10, `00` |
| N3 (iii) | **Accepted** | The conjunction is reported as an interval from the independence product to the perfect-dependence bound (Fréchet bounds noted); routes combine as a disjunction; factors renamed K1-K5 to avoid clashing with figure levels F1-F3. | `03` §9 |
| P3 | **Accepted** (already corrected in commit e7ca103 after my own numerical check, before the DA's read; the DA's derivation confirms it) | D-N and D-H need v ≥ 1 exactly with an additive, non-improving floor. | `03` §3, §13 |
| P4, P6, population formula, log-rate | **Accepted** | P4 needs r_a > β; P6 is 1/h* (total hazard); population hazard factor 1 − a(1 − k); r stated as a log-rate with 1 − e^{−r} as the annual proportional decline. | `03` §1-§3 |
| D-N vs D-1 wording | **Accepted** | D-N needs v ≥ 1 at every age; only the life-expectancy gain (1 − μe) falls with age; D-1 needs v ≥ 1/(1 − μe) (about 1.1, 1.4, 2.0, 2.9 at 50, 65, 80, 90). | `01`, `03` §2 |
| Frontier ranking | **Accepted** | Rank by life expectancy at 65, averaged 2015-2019; sensitivity N = 5 and 15 and an at-birth ranking; W1 was told. | `01` |
| Other minor | **Accepted** | Baseline by decade of age 50-89; numbered search-log IDs and 25-word attributing sentences instead of 130-word inline logs; "citation chaining" replaced by snowballing; five-year smoothing for realised data; W2/W4/W5 overlap resolved at consolidation; citation budget (about 90 references in the body, the rest in an appendix table by card ID). | `00`, `02`, `03` |
| DA decision (b) | **Conceded through N2** | The held point is exactly the attribution problem fixed above. | `02` |

## Round 3 (spot check of the diffs)

(pending)
