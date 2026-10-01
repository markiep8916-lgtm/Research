# Devil's Advocate Report — Checkpoint 1 (scoping)

Source: hand-back from the Devil's Advocate subagent, saved verbatim in substance by the dispatcher. This is model output, not evidence. The DA's own fact-checking searches were all refused (session search cap), so its named studies are leads (V0), not findings.

**Evidence status:** all 5 WebSearch calls the DA tried were refused (session cap "200 of 200" used), so none of its 10 planned checks ran. The report is document analysis plus unverified recall.

## Verdict: REVISE

Strengths: neutral primary RQ, comparator rule, multiple readings of "artificial".

## Critical issues (blocks progression)

1. **Search capacity is exhausted** (Method). 320–640 planned searches (40–80 per stream × 8) against a 200-call session cap that is already spent. Streams sharing the cap may have searched little or nothing; the refusal text invites memory-filling.
   Recommendation: block Phase 3 until each stream reports searches run and refused. Add to the common instructions: on refusal, record NOT SEARCHED (never "no evidence") and never substitute memory. Ask the user to raise `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` or ration what remains.

## Major issues

2. **V-levels measure web echo, not independence.** Hits are machine-summarised from overlapping pages, so two can share one source and one error. Consensus statements reach V2 easily; re-analyses and critiques tend to stay V1 and drop out. Recommend: V-level = transcription fidelity only; add "primary text displayed Y/N"; dedupe sources across streams; quote link text, not the summary; paired neutral queries; "COI not displayed", never "none"; a retraction check per load-bearing paper; comparator, contrast and outcome definition in every entry.
3. **Causal chain and magnitude are unassigned.** The mainstream case is a chain (SFA raises LDL-C/apoB; LDL-C drives CHD per Mendelian randomization and LDL-lowering trials); the critics' counter-chain (diet-induced LDL differs from drug/genetic LDL; particle size, TG/HDL; null mortality in diet RCTs) is equally unowned. Move all-cause mortality to SQ2's primary outcomes, add a triangulation step, require absolute risks and LDL change per % energy.
4. **S7 is overloaded and most exposed to advocacy sources.** Split into S7a (history, industry influence, critique/rebuttal) and S7b (susceptibility, keto "hyper-responder" plaque data, seed oils). Account conflicts of interest symmetrically (dairy, meat, sugar, pharma, diet-book/product interests).
5. **Frame-lock: "saturated fat" treated as one exposure.** SQ4 itself assumes effects vary by chain length, source and replacement. SQ3 has no slot for trade-offs (nutrient adequacy in older adults), and the user's word "risks" invites a harm-only report. Lead with "it depends on replacement and source".
6. **"Artificial" readings still missing.** (i) Endogenous vs dietary SFA (de novo lipogenesis from carbohydrate; plasma SFA is not intake). (ii) Engineered SFA carriers: plant-based meat/dairy analogues built on coconut or palm fat, MCT oil and fractions (not excluded as "supplements"). Risks: the "artificial" half collapses into a trans-fat report read as "artificial = worse saturated fat", or into appeal to nature ("ruminant trans is harmless": WHO's limit may cover both). Box what actually differs: isomer geometry, position, matrix, co-ingredients, contaminants.

## Minor issues

- Seeds come from one model's memory: add discovery queries ("umbrella review", "reanalysis").
- S1: add WHO 2023, Nordic 2023, UK SACN, EFSA with each guideline's evidence basis; confirm DGA 2025–2030 wording from two outlets quoting it.

## Strongest counter-argument

"A snippet-level, popularity-filtered, partly unsearched review whose V2 labels look like rigor but measure web echo. Its answer turns on comparators and food context that search cannot verify, and the 'natural vs artificial' answer, the user's real interest, rests on the thinnest evidence."

## What's missing

- Mainstream lipidologist: causal-chain section (item 3), pre-statin-era caveat for old trials, paediatric evidence, dietary-cholesterol confound.
- SFA critic: mortality as primary outcome, TG/HDL and particle size, cheese-vs-butter and fermented-dairy feeding trials, scrutiny of guideline-process bias.
- Priority searches if the cap lifts: LDL Mendelian randomization; cheese vs butter LDL; keto hyper-responder plaque; plasma SFA and lipogenesis; plant-based meat and coconut oil; ruminant vs industrial trans.

## Observations: predictable report failures

False balance (use claim-level tiers: LDL-C, CVD events, mortality, food-specific); cohort over-reading; dropped comparator; guideline text as evidence; biomarker/hard-outcome conflation; "natural = safe"; recency bias toward recent-news headlines; performative limitations.

## Stress test results

| Test | Result |
|---|---|
| Remove strongest source — does argument hold? | No (one meta-analysis likely carries hard outcomes) |
| Flip the research question — is the opposing view credible? | Yes for hard outcomes, No for LDL-C |
| Apply to other contexts — does it generalize? | No (children, elderly unplanned) |
| "So what?" — is the significance justified? | Only with comparator and absolute risk |

## Dispatcher's disposition (added by the orchestrator)

- Critical issue 1 is real and unfixable inside this session: the allowance is spent. Disposition: proceed to Phase 3 only on what exists, label every unsearched domain NOT SEARCHED, state the limitation prominently, persist all ledgers, and prepare a prioritized resume plan for a session with a higher cap.
- Major 2: adopt. V-levels are described in the report as transcription fidelity in machine-summarised search output, not independent replication.
- Major 3 and 5: adopt in the report's structure (claim-level tiers; "it depends on replacement and source" first; LDL-C vs events vs mortality kept separate).
- Major 4: moot for this run (S7 is bounded by the cap); the resume plan splits S7.
- Major 6: adopt in the resume plan and in the report's "natural vs artificial" boxes (what actually differs: isomer geometry, position on the glycerol backbone, matrix, co-ingredients, contaminants). Items not searched are flagged, not filled from memory.
