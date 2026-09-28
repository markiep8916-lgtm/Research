# Deep research: the disappearance of Maura Murray

A `deep-research` full-mode run (Academic Research Skills suite v3.22.2) on the question: *given the public record as of 2026-09-28, which explanation for Maura Murray's disappearance on February 9, 2004 is most likely, and with what confidence?*

**Main deliverable**: [`REPORT.md`](REPORT.md) (about 7,550 words of prose plus tables, 66 references, three appendices).

## The answer in brief

The record establishes that she left the crashed car alive, on foot, functional, and intending to avoid the police she knew were coming. From there, two explanations survive testing against the whole record:

| Rank | Explanation | Judgmental range |
|---|---|---|
| 1 | Killed or fatally harmed by a third party after leaving on foot, most plausibly a passing motorist who offered a ride | 45 to 60% |
| 2 | Died of exposure or misadventure on foot; body never found | 25 to 35% |
| 3 | Suicide on foot | 5 to 10% |
| 4 | Removed by a planned companion | 2 to 5% |
| 5 | Voluntary permanent disappearance | 1 to 3% |
| 6 | Official involvement and cover-up | 1 to 3% |

The gap between the first two is within judgmental error. The order depends on two judgments the public cannot check: how much 22 years without remains says about a death on foot near a searched road, and what the state's crime framing (potential homicide since 2007; FBI ViCAP request in 2022) rests on. Section 4.4 of the report lists the observations that would settle it.

## How the run was done

| Phase | Artifacts |
|---|---|
| 1 Scoping | `phase1_scoping/rq_brief.md`, `methodology_blueprint.md`, `da_checkpoint_1.md` |
| 2 Investigation | `phase2_investigation/corpus.yaml` (74 entries with tiers, grades, URLs and recorded quote strings), `annotated_bibliography.md`, `source_verification_report.md`, `timeline.yaml`, `framework_sweep_notes.md` |
| 3 Analysis | `phase3_analysis/synthesis_report.md` (full 22-row evidence-by-hypothesis matrix, priors, ranking, sensitivity), `da_checkpoint_2.md` |
| 4 Composition | `phase4_composition/claim_intent_manifest.json`, `report_template_v1.md`, `report_draft_v1.md` |
| 5 Review | `phase5_review/editorial_review.md`, `ethics_review.md`, `da_checkpoint_3.md` |
| 6 Revision | `phase6_revision/report_template_v2.md`, `revision_log.md`; final `REPORT.md` |
| Tooling | `tools/expand_citations.py` turns `{{Q:key|quote}}` and `{{S:key|section}}` placeholders into the suite's three-layer citation markers and refuses any quotation that is not a recorded snippet string for that key |

Evidence was gathered by four parallel research agents (official record and timeline; physical evidence and searches; competing explanations; 2019 to 2026 developments) and one framework sweep for base-rate literature (missing-person outcomes, lost-person behaviour, hypothermia forensics, bloodhound reliability, the Analysis of Competing Hypotheses).

## Read this before relying on any quotation

The session's network policy blocked full-text retrieval from every external site attempted (state and federal government pages, news sites, court repositories, the Internet Archive, Wikipedia), and the session's 200-query search budget was exhausted during Phase 2. Every quotation in the report is therefore a verbatim string from a search-index snippet attributed to the cited URL, recorded in `corpus.yaml`. Attribution is the search tool's, not a page check. To verify a quotation: open the URL in the References, search for the quoted string, and compare. The four sweep reports list about 70 follow-up queries that could not run.

## Ethics

The report analyses hypothesis families, not people. It names no uncharged private individual as a suspect and refers to private witnesses by role. Facts about the victim's private life appear only where a reputable outlet published them and they bear on a hypothesis. AI assistance is disclosed in the report's front matter.

## Reproducing or extending

1. Re-run the citation lint: `python3 scripts/check_v3_7_3_three_layer_citation.py research/maura-murray-disappearance/REPORT.md` (from the repository root).
2. Re-expand after editing the template: `python3 research/maura-murray-disappearance/tools/expand_citations.py research/maura-murray-disappearance/phase2_investigation/corpus.yaml research/maura-murray-disappearance/phase6_revision/report_template_v2.md research/maura-murray-disappearance/REPORT.md`.
3. In an environment with full network access, follow Section 5.5 of the report: retrieve the full texts, check attributions, obtain the weather record and the despondent-profile distance quantiles, and reconstruct the 2004 and 2022 search polygons.
