# Research Question Brief

**Run**: deep-research `full` mode (standalone; no pipeline orchestrator, no Material Passport)
**Date**: 2026-09-28
**Agent**: research_question_agent (Phase 1, Scoping)
**Source of request**: user message "Can you deep research the Maura Murray disappearance and come up with the most likely explanation?"

## Topic Area

The unsolved disappearance of Maura Murray, a 21-year-old University of Massachusetts Amherst nursing student, after a single-car crash on Route 112 (Wild Ammonoosuc Road) in Haverhill, New Hampshire, on the evening of February 9, 2004, and the competing explanations for what happened to her after she left the crash scene.

## Primary Research Question

> Given the publicly available evidentiary record as of 2026-09-28, which family of explanations for Maura Murray's disappearance on the evening of February 9, 2004 is most consistent with that record, and how much confidence does the record support?

## FINER Assessment

| Criterion | Score | Justification |
|-----------|-------|---------------|
| Feasible | 3/5 | A large public record exists (official case pages, an FBI ViCAP alert, a 2007 state supreme court opinion, 22 years of journalism, documentaries, family statements). The investigative file is sealed, so the record is incomplete by construction. In this session, the network policy blocked full-text retrieval; evidence had to be harvested from search-index snippets. |
| Interesting | 5/5 | A 22-year unsolved case with an active investigation, an FBI alert, and persistent public disagreement about the basic mechanism (exposure, suicide, foul play, voluntary flight). |
| Novel | 2/5 | The case is saturated with narrative coverage. What is scarce is a source-graded, hypothesis-by-hypothesis analysis that states base rates and diagnosticity explicitly. That is the contribution; the facts are not new. |
| Ethical | 3/5 | Real, living family; uncharged private individuals have been named by amateurs. The analysis must stay at the hypothesis-family level, must not name uncharged private persons, and must use published facts only. Subject matter alone does not block. |
| Relevant | 4/5 | Informs public understanding of a live case and demonstrates how open-source analysis should handle a heavily contaminated evidentiary record. |
| **Average** | **3.4/5** | Threshold met (average >= 3.0, no criterion below 2). |

## Scope Boundaries

**In Scope**
- Public-record evidence from February 2004 through 2026-09-28: official statements (New Hampshire Department of Justice Cold Case Unit, New Hampshire State Police, FBI ViCAP), court opinions, contemporaneous and later journalism, the documentary and podcast record where it reports checkable facts, and family statements.
- The events of February 5 through February 11, 2004: the days before the drive, the drive north, the crash, the roughly nine-minute window before police arrived, the initial searches, and the phone events reported afterward.
- Six hypothesis families, analysed at the family level:
  - H1: Left the scene on foot and died of exposure or misadventure (including hiding from responders).
  - H2: Left the scene on foot intending suicide and died nearby.
  - H3: Left the scene, alive, and was killed or fatally harmed by a third party (sub-variants: accepted a ride from a passing motorist; walked to a nearby residence; was followed or intercepted).
  - H4: Left the scene and deliberately disappeared to start a new life.
  - H5: Was travelling with, or met, a planned companion who removed her from the scene, with a later unknown outcome.
  - H6: Was removed from the scene by, or with the knowledge of, a responding official, with a subsequent cover-up.
- Relevant scientific base rates: lost-person behaviour, hypothermia physiology and forensic findings, missing-person case outcomes, and scent-trailing dog reliability.

**Out of Scope**
- Identifying, naming, or assessing any specific uncharged private individual as a perpetrator. Named persons appear only when a mainstream outlet named them in connection with the case, and then only with their public role and cleared or uncharged status.
- Psychic, paranormal, or anonymous-forum claims, except as examples of contamination of the record.
- Legal disputes between the family and the state beyond what the 2007 opinion establishes about the case's status.
- Maura Murray's private medical and relationship history beyond facts published by reputable outlets that bear directly on a hypothesis.

**Key Assumptions**
- The public record is a biased sample of the evidence: the state holds material it has not disclosed. Conclusions are conditional on the public record.
- Contemporaneous official and journalistic sources are weighted above retrospective narrative sources; retrospective sources are weighted above anonymous amateur sources.
- Base rates are priors, not verdicts. They are stated explicitly so the reader can substitute their own.
- The user-confirmation gate that the `full` mode places after Phase 1 was auto-passed because the session is autonomous and the user cannot answer mid-task. The Phase 1 artifacts are recorded so the user can reject the framing after the fact.

## Sub-questions

1. What is the best-attested reconstruction of February 5 through 11, 2004 (the timeline, the physical evidence at the car, the witness accounts, the early searches), and which elements are disputed or single-sourced?
2. For each hypothesis family, which evidence items are diagnostic (that is, more consistent with one family than with the others), and what do the relevant base rates imply about the prior plausibility of each family?
3. What do the official investigation's public statements and actions from 2004 through 2026 reveal about the investigators' working hypothesis, and what evidence, if it emerged, would most change the ranking?

## Sub-Question Bindings

1. inherits: population = Maura Murray and the persons present on Route 112 on 2004-02-09; timeframe = 2004-02-05 to 2004-02-11; geography = Amherst MA to Haverhill NH corridor; domain = public record. Deviations: none.
2. inherits: hypothesis set = H1 to H6 above; timeframe = evidence published 2004-02 to 2026-09-28; domain = public record plus peer-reviewed base-rate literature. Deviations: none.
3. inherits: actors = NH DOJ, NH State Police, Haverhill PD, FBI; timeframe = 2004 to 2026-09-28. Deviations: none.

## Candidate Questions Considered

| # | Candidate | FINER Avg | Why not selected |
|---|-----------|-----------|-----------------|
| 1 | Which family of explanations is most consistent with the public record, and with what confidence? | 3.4 | Selected. |
| 2 | Who is responsible for Maura Murray's disappearance? | 1.8 | Not feasible from the public record; ethically unacceptable (would require naming uncharged private persons). |
| 3 | Why has the case remained unsolved for 22 years? | 3.0 | Interesting and relevant, but a process question that does not answer the user's request. Partly absorbed into sub-question 3. |
| 4 | How has web-sleuthing shaped the public record of the case? | 3.2 | A media-studies question; useful for the source-verification discussion but not the user's request. Absorbed as a limitation theme. |
