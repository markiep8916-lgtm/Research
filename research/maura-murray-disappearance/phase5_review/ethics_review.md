# Ethics Review Report

**Run**: deep-research `full` mode (standalone)
**Date**: 2026-09-28
**Agent**: ethics_review_agent (Phase 5)
**Manuscript**: `phase4_composition/report_draft_v1.md` (draft 1)

### AI-Assisted Research-Integrity Verdict: CLEARED (with two conditional fixes accepted into revision)

Scope: This verdict covers AI-assisted research integrity only. It is not human-subjects clearance or authorization.

### Dimension Assessment

| Dimension | Status | Notes |
|-----------|--------|-------|
| AI Disclosure | pass | Present in the front matter; scope accurate (search, verification, synthesis, drafting); the retrieval limitation is stated in the disclosure itself. |
| Attribution Integrity | pass | Every quotation is mechanically checked against a recorded snippet string for the cited key (`tools/expand_citations.py`, 65 keys, 0 mismatches). Attribution of a snippet to a page could not be page-checked; the report says so in the Method, Limitations and Appendix B. |
| Dual-Use Screening | pass | Risk Level: None. No operational content. |
| Fair Representation | pass | The family's position, the author's thesis, the documentary's conclusion, and the state's statements are each presented with their strongest evidence; the report declines the family's "local" qualifier and the author's thesis on stated grounds rather than by omission. |
| Data Ethics | pass | Published material only; no scraping of private data; no contact with witnesses. |
| Conflict of Interest | pass | Participant, commercial and author interests are disclosed in the Source Verification Report. |
| Human Subjects Ethics | see separate status | Document analysis; no human subjects. |

### Human-Subjects Administrative Status

| Field | Value |
|-------|-------|
| submission_readiness | no_listed_gaps_located (not applicable: no human-subjects activity) |
| authorization_status | not_provided (none required) |
| review_pathway | institutional determination required (if any future work contacts witnesses) |
| authority_context | unavailable — not applicable |
| profile_dependent_result_allowed | false |
| candidate rule trace | unavailable — no validated trace |
| applicable consent/information requirement IDs | unavailable — not applicable |
| actor and consumer scope per requirement | not applicable |
| requirement and authority-anchor pointers | not applicable |

These fields are independent: submission readiness must never update authorization status.

### Issues Found

#### Critical (Blocks Delivery)
No critical issues.

#### Conditional (Must Fix)
- **Private individuals named through quotations.** The draft does not name any uncharged private individual as a suspect, but two verbatim quotations carry private names: the first 911 caller (Section 4.1, "The nine minutes") and a witness's driveway as a reported end point of the dog track (Section 4.2 table). Neither is needed for the argument, and the driveway variant could be read as insinuation against a witness who has never been the subject of any reported official suspicion. Fix: paraphrase both with section anchors; keep the bus driver's surname where it appears inside the dispatch-log quotation, because he is the case's principal public witness, has given his account on the record for two decades, and the quotation is a documentary reproduction, not a characterisation.
- **Reference-list title containing a private first name** ("Karen (Witness A) transcript"). A first name alone in a source title is not identifying; keep the title as published (altering source titles is worse practice), but the report's text must continue to refer to the person by role only. Confirmed: the text does.

#### Advisory (Recommended)
- The final paragraph of the Conclusion describes the victim's state of mind ("she did not want to be in trouble"). It is an inference from her own recorded words and is presented as such; acceptable, but the sentence should stay singular and not be elaborated.
- The 2019 basement dig and the A-frame lead concern private properties; the draft names neither owner nor address. Keep it that way in revision.
- The boyfriend is referred to by role; a forum thread title in the references contains his first name. Acceptable (source title, first name only).

### AI Disclosure Verification
- [x] Disclosure statement present: Yes
- [x] Scope accurate: Yes
- [x] Limitations noted: Yes

### Reference Integrity Check
- Total references cited: 65 keys (66 reference entries; one, Renner 2016, is orphaned pending the editorial fix)
- Spot-checked: 65 of 65 keys mechanically (quote-to-corpus match and URL presence); 0 of 65 page-verified (network policy)
- Issues found: attribution to page is probable, not confirmed, for the quotations flagged in the Source Verification Report (Boston Globe 2004; Boston Magazine 2014 Fred Murray quotation; the 2014 Strelzin sentence; the InDepthNH sentence; the Boston.com pottery quotation). All are labelled in the corpus.

### Responsible Use Statement
Not required (dual-use risk: none).

### Ethics Clearance Notes
The report's subject is a real missing person with a living family. The draft handles this by analysing hypothesis families rather than people, by refusing the "local perpetrator" framing the public record does not support, and by keeping the victim's private history to published facts that bear on a hypothesis. The two conditional fixes are accepted into Phase 6.

### Ethics Decision Log

| Item | Verdict | User decision | Reasoning |
|------|---------|---------------|-----------|
| Private names inside two quotations | CONDITIONAL | accept fix (autonomous session; fix applied in revision) | Names are not needed for the argument; one could be read as insinuation. |
