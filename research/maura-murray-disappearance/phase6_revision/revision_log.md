# Revision Log

**Run**: deep-research `full` mode (standalone)
**Date**: 2026-09-28
**Agent**: report_compiler_agent (Phase 6)
**Input**: `phase4_composition/report_draft_v1.md`; reviews in `phase5_review/`
**Output**: `REPORT.md` (expanded from `phase6_revision/report_template_v2.md` with `tools/expand_citations.py`)
**Revision loops used**: 1 of 2

| # | Source | Severity | Feedback | Action Taken | Status |
|---|--------|----------|----------|--------------|--------|
| 1 | Editor | Major | Fourteen visible author-year citations lacked the hidden `ref` and `anchor` markers (Sections 2.2, 3.2, 4.1, 4.2, 5.2, 5.5). | Added section anchors to every real citation; rephrased the tier-table entry so it no longer cites; the three remaining matches of the scan are not citations (the title's date; two table-cell labels). Renner (2016) is now cited, which also resolves the orphaned reference. | Resolved |
| 2 | Editor | Major | Abstract 276 words against a 250-word cap. | Trimmed the Method and Findings sentences; final abstract under 250 words (verified by the Phase 6 check). | Resolved |
| 3 | Editor | Minor | Define AI and NHSP at first use. | Renamed the disclosure label to define "artificial intelligence (AI)" at first use; added a sentence defining the New Hampshire State Police (NHSP) before the first quotation that uses the initials. Acronym check now reports no undefined acronyms (allow-list: agency, outlet and product names). | Resolved |
| 4 | Editor | Minor | Koester (2008) reference listed only the interview URL. | Added the catalogue URL recorded in the corpus. | Resolved |
| 5 | Editor | Minor | Six consecutive quotations from one blog in "The searches". | Added one sentence of the report's own summary before the quotations. | Resolved |
| 6 | Ethics | Conditional | Two quotations carried private names (the first 911 caller; a witness's driveway as a track end point). | Replaced both with paraphrase and section anchors; the bus driver's surname remains only inside the dispatch-log quotation, as the Ethics Review accepted. Text refers to all private witnesses by role. | Resolved |
| 7 | Ethics | Advisory | Keep the Conclusion's one sentence about her state of mind singular. | Unchanged; confirmed singular. | Acknowledged |
| 8 | Devil's Advocate | Minor | "Most probably heading east" needs its basis stated. | Added a sentence in the Conclusion naming the two facts the direction rests on. | Resolved |
| 9 | Devil's Advocate / Editor | Suggestion | State that the gap between the first two explanations is within judgmental error. | Added to the Conclusion. | Resolved |
| 10 | Editor | Suggestion | Appendix A duplicates `timeline.yaml`. | Kept; the compact table serves readers who open only the report. | Acknowledged |
| 11 | Editor | Line-level | "The qualitative point stands as a qualitative point". | Rephrased. | Resolved |

## Unresolved issues carried as Acknowledged Limitations

- Snippet-only retrieval and probable-not-confirmed attribution for several quotations (stated in Sections 3.5, 5.4 and Appendix B).
- The 2004 to 2005 contemporaneous record is thin in the corpus.
- One `[MATERIAL GAP]` remains in Section 2.2 by design (despondent-profile distance quantiles).
- Phase artifacts (timeline, synthesis) retain witnesses' names as they appear in mainstream coverage; the final report refers to private witnesses by role.

## Final checks (Phase 6)

- Three-layer citation lint (`scripts/check_v3_7_3_three_layer_citation.py`): PASSED.
- Quote-to-corpus check (`tools/expand_citations.py`): 66 distinct keys cited; every quotation matches a recorded snippet string; 0 mismatches.
- Visible-citation scan: no real citation without markers.
- Acronym check (`scripts/check_acronyms.py`): no undefined acronyms outside the allow-list.
- Prose length excluding tables, references and appendices: about 7,550 words (mode limit 3,000 to 8,000).
- Reference list: 66 entries, one per cited key; no orphans.
