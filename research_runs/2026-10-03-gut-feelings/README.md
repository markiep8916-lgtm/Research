# Deep research run: "gut feelings", knowing without knowing, and the sixth-sense question

**Run date:** 2026-10-03 · **Skill:** `deep-research` v2.12.1, mode `full` (standalone) · **Suite:** Academic Research Skills v3.22.2

**Deliverable:** [`REPORT.md`](REPORT.md), an APA 7 research report (7,973 body words, 58 verified sources, three-layer citations with verbatim abstract-level anchors).

## Research question

> What mechanisms and boundary conditions explain when "gut feeling" judgments, reached without conscious access to their basis, yield accurate knowledge?

Sub-questions: (1) mechanisms; (2) accuracy conditions versus deliberate analysis; (3) the "sixth sense" reading (presentiment and precognition) against ordinary non-conscious explanations.

## Process record

| Phase | Agent(s) | Output | Verdict / result |
|---|---|---|---|
| 1 Scoping | research_question, research_architect, devil's advocate CP1 | `pipeline/phase1_scoping.md` | FINER 4.4/5; CP1 PASS with 3 Majors carried forward |
| 2 Investigation | bibliography ×3 (one per sub-question) + recency sweep 2018–2026 | `pipeline/phase2_sq{1,2,3}_bibliography.md` | 59 entries / 58 unique works; every DOI resolved on Crossref; OpenAlex re-query on the 50 pre-sweep works |
| 2 Verification | source_verification + deterministic triangulation (`pipeline/verify_dois.py`) | `pipeline/phase2_source_verification.md`, `phase2_doi_verification.json` | 0 unmatched, 0 retracted, 0 excluded; 8 "include with caveat"; 5 evidence-level corrections; 1 correction notice (Kekecs et al. 2023) |
| 3 Analysis | synthesis → devil's advocate CP2 → synthesis revision (loop 1 of 2) | `pipeline/phase3_synthesis.md`, `phase3_da_checkpoint2.md` | CP2 REVISE (0 Critical / 8 Major / 8 Minor), all addressed |
| 4 Composition | report_compiler | (draft, superseded) | 10,561 body words, over budget |
| 5 Review | editor_in_chief, ethics_review, devil's advocate CP3 (parallel) | `pipeline/phase5_*.md` | Editor: Minor Revision 3.85/5; Ethics: CONDITIONAL (editorial items only, dual-use risk Low); CP3: REVISE (0 Critical / 5 Major / 9 Minor) |
| 6 Revision | report_compiler | `REPORT.md` (Revision Log at the end) | Body 7,973 words; 192/192 citations anchored; 58/58 keys in References; mandatory AI disclosure once, with run-specific clarification |

Deterministic gates run by the orchestrating session: `pipeline/verify_dois.py` (Crossref + OpenAlex existence and title match) and `pipeline/lint_report.py` (ref-key membership, anchor fidelity to corpus quotes, reference-list parity, disclosure presence, em-dash check).

## Checkpoint provenance

The pipeline's "user confirmation after Phase 1" checkpoint could not be obtained: the session ran autonomously and the user could not answer mid-run. Scope assumptions are stated in `phase1_scoping.md` and in Section 3.1 of the report. The user may redirect scope and the run can be resumed from the Phase 2 corpus.

## Headline findings (see the report for evidence strength labels and caveats)

- "Gut feelings" cover at least three ordinary constructs (implicit learning and expert pattern recognition; affective-somatic signals; fluency-based metacognitive feelings) that share a phenomenology but differ in mechanism.
- Accurate gut feelings are the output of learning under valid feedback in a regular environment; this kind/wicked framework is convergent across traditions but has no direct Level I–II test and is partly circular (Moderate).
- The "deciding before knowing" somatic-marker claim did not survive its direct critiques; bodily signals modulate choice but their nonconscious causal role is unestablished (Emerging, contested). The unconscious-thought advantage did not survive independent replication (Strong against).
- Thin-slice social judgments have predictive validity (Moderate); deliberate holistic expert judgment loses to formulas in low-feedback prediction (Strong, a neighbouring construct). Confidence is not reliably diagnostic of accuracy.
- The sixth-sense reading fails the pre-registered / replicated / robust standard for Bem's Experiments 1, 8 and 9 (Strong against), is unreplicated in this corpus for Experiments 2–7, and is untested on that standard for physiological presentiment (Emerging against). Proponent replies are stated and answered before the verdict.

## Limitations

Not a PRISMA systematic review (purposive, seed-driven search); abstract-level anchors only, no page locators; mainstream-venue scope for SQ3; three seeds excluded for lacking a verifiable quote anchor (Reber 1989; Bowers et al. 1990; Betsch & Glöckner 2010); all reviews performed by AI agents; one `[MATERIAL GAP]` (interoceptive-inference framing) left unfilled. Full list in the report, Section 5.4 and the Revision Log.
