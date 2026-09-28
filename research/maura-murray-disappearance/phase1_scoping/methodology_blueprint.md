# Methodology Blueprint

**Run**: deep-research `full` mode (standalone)
**Date**: 2026-09-28
**Agent**: research_architect_agent (Phase 1, Scoping)

## Research Paradigm

**Selected**: Pragmatist, with an abductive logic of inquiry (inference to the best available explanation under uncertainty).
**Justification**: The question is not "what is true" in a verifiable sense but "which explanation the public record supports best, and how strongly." That calls for a structured comparison of rival explanations against a graded evidence base, with the reasoning exposed so a reader can disagree at any step.

## Method

**Type**: Qualitative, document-based, with structured analytic scaffolding.
**Specific Method**: Systematic document analysis feeding an Analysis of Competing Hypotheses (ACH) matrix (Heuer, 1999), combined with explicit base-rate priors drawn from search-and-rescue, forensic-medicine, and missing-persons research.
**Justification**: ACH forces every hypothesis to be tested against every evidence item and ranks hypotheses by how little evidence contradicts them rather than by how much supports them. That counters the confirmation bias that dominates the case's public discussion, in which each camp assembles the facts that fit. Base rates counter the opposite error of treating vivid but low-probability scenarios as likely.

## Data Strategy

**Data Type**: Secondary only. No contact with witnesses, family, or investigators. No primary data collection.
**Sources**, in descending weight:
1. Official: New Hampshire Department of Justice Cold Case Unit case page; FBI ViCAP alert; New Hampshire Supreme Court opinion in the family's records case (2007); official press statements quoted by mainstream outlets.
2. Contemporaneous journalism (2004 to 2005): Boston Globe, Union Leader, Caledonian-Record, Concord Monitor, AP, WMUR, CBS Boston and equivalents.
3. Later long-form journalism and documentary reporting (2006 to 2026), including anniversary coverage, the Oxygen series (2017), and reporting on the 2019, 2021 to 2022, 2024 and 2025 to 2026 investigative actions.
4. Participant statements: the Murray family (including the Media Pressure podcast, 2024 to 2025), the boyfriend's family, witnesses as quoted by outlets in tiers 1 to 3.
5. Books and podcasts by non-participants (Renner, 2016; Missing Maura Murray podcast), used for the claims they make and for their sourcing, never as sole support for a fact.
6. Peer-reviewed and institutional literature for base rates: lost-person behaviour (Koester; ISRID-derived studies), hypothermia forensics (Rothschild & Schneider, 1995; Swedish and other autopsy series), missing-person outcomes (NIJ and NamUs; UK Missing Persons Unit; Biehal, Mitchell & Wade, 2003), scent-trailing reliability (Harvey & Harvey, 2003).
**Sampling**: Purposive and exhaustive within the session's reach. Four parallel evidence sweeps (official record and timeline; physical evidence and searches; competing theories and proponents; 2019 to 2026 developments) plus one framework sweep for base-rate literature.
**Time Frame**: Sources published February 2004 through 2026-09-28. Searches executed 2026-09-28.
**Access constraint recorded at design time**: the session's network policy blocked full-text retrieval from every external domain tried (state and federal government sites, news sites, Wikipedia, court-opinion repositories, the Internet Archive). Evidence was therefore harvested from search-index snippets, and the session's search budget (200 queries) was exhausted during Phase 2. Both constraints are carried into the Source Verification Report and the report's Limitations.

## Analytical Framework

**Technique**: ACH matrix with qualitative diagnosticity scoring, base-rate priors, and sensitivity analysis.
**Steps**:
1. Reconstruct the timeline of 2004-02-05 to 2004-02-11 with a source attached to every time and every physical fact; separate official, contemporaneous, retrospective, and amateur attestations.
2. Inventory evidence items (E1, E2, ...) and grade each source with the suite's two-axis rubric (design level and fitness for claim within the field; the field here is investigative journalism and public records, whose gold standard is the primary official document or the contemporaneous, attributed report).
3. Build the ACH matrix: rows are evidence items, columns are hypothesis families H1 to H6. Code each cell as CC (strongly consistent), C (consistent), N (neutral or uninformative), I (inconsistent), or II (strongly inconsistent).
4. Identify diagnostic items (rows whose codes differ across columns) and discard non-diagnostic rows from the ranking.
5. State a prior for each family from the base-rate literature, in words and in a rough numeric range, so the reader can substitute their own.
6. Rank the families by the weight of inconsistent evidence, then adjust by the priors.
7. Run a sensitivity analysis by removing the most contested evidence items one at a time (the dog track, the bus driver's account, the "no footprints" claim, the post-disappearance voicemail) and recording whether the ranking changes.
8. State the conclusion with calibrated language, the assumptions it depends on, and the observations that would most change it.
**Tools**: Markdown tables; a YAML corpus with citation keys; the suite's three-layer citation markers so that every citation in the compiled report carries a locator.

## Validity Criteria

| Criterion | Strategy to Ensure |
|-----------|-------------------|
| Source triangulation | A fact enters the timeline as "established" only when attested by an official source or by two independent outlets; otherwise it is labelled single-source. |
| Tier discipline | Retrospective and amateur claims cannot override a contemporaneous official or journalistic account; conflicts are recorded in the Contradictions table rather than resolved silently. |
| Confirmation-bias control | ACH coding of every item against every hypothesis; Devil's Advocate checkpoints after Phases 1, 3 and 5. |
| Temporal integrity | Every "current" or "most recent" claim is anchored to a date; every "A led to B" claim is checked for date order (suite Temporal Integrity Iron Rule). |
| Traceability | Every citation carries a hidden `ref` slug and a `quote` or `section` anchor; a `corpus.yaml` lists the URL and date for every slug. |
| Calibration | The conclusion is stated as a ranked set with rough probability ranges and explicit sensitivity results, not as a single verdict. |

## Limitations (By Design)

- The investigative file is sealed; the state has said it holds evidence it will not disclose. Mitigation: the conclusion is conditioned on the public record and says what undisclosed evidence would change it.
- Snippet-only evidence: quotes are verbatim strings from search-index snippets and could not be checked against the full page in this session. Mitigation: every quote is labelled, the corpus records the URL, and the report asks the reader to spot-check before relying on any single quote.
- Search budget exhausted mid-investigation. Mitigation: the Source Verification Report lists the targets that were not reached.
- The record is contaminated by two decades of amateur speculation. Mitigation: tier discipline; no reliance on anonymous-forum content.
- Base rates come from populations (wilderness SAR subjects, hypothermia autopsy series, UK and US missing-person registers) that only partly resemble this case. Mitigation: priors are stated as ranges and the sensitivity analysis shows how much they matter.

## Ethical Considerations

- The subject is a real missing person with a living family. Language stays factual and probabilistic; the report avoids speculation about her private life beyond published facts that bear on a hypothesis.
- No uncharged private individual is named or characterised as a suspect. Public officials and self-identified public participants (family members, authors, podcast hosts) may be named in their public roles.
- Web-sleuth content is treated as a phenomenon to describe, not as evidence.
- AI disclosure is mandatory and appears in the report.

## Human-Subjects Administrative Status

Not applicable: document analysis of published material only; no recruitment, consent, intervention, or access to identifiable non-public data.

> **Human-subjects boundary:** This output does not authorize recruitment, consent, access to identifiable data, intervention, or data collection.

## Reporting Standard

- Recommended guideline: none of the EQUATOR guidelines fits an open-source case analysis. The report follows the suite's full-mode APA-style structure and borrows ACH's reporting conventions (hypothesis list, evidence matrix, diagnosticity, sensitivity).

## Preregistration

- Recommended: No (retrospective document analysis; the hypothesis set is fixed in this Blueprint before Phase 2, which serves the same pre-commitment purpose).
- Platform: N/A
- Status: Not applicable
- Completed artifact declaration: not_provided
- Companion handle: none
- Sidecar ownership: dispatching layer only; do not populate a digest here

## Design-Freeze Checkpoint Audit

`ARS_CROSS_MODEL` is not set in this session; no cross-model verifier was consulted. Single-model design freeze.
- Primary decision: sound — drivers: fixed hypothesis set before evidence collection; ACH plus explicit priors; tier discipline for a contaminated record.
- Cross-model decision: unavailable — not configured.
- Outcome: unavailable — single-model only.
