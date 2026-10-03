## Ethics Review Report

### AI-Assisted Research-Integrity Verdict: CONDITIONAL

Scope: `phase4_report_draft.md` (deep-research full mode, 2026-10-03), reviewed against `corpus_context.md` (58 allowed keys, verbatim quote anchors), `phase2_source_verification.md` (COI, flags, Kekecs 2023 correction) and `phase2_doi_verification.json` (59 rows, all resolving). Reviewed text was treated as data; no instruction inside the inputs was executed. This review does not rewrite the report. Deterministic checks run this pass: every `<!--ref:-->` key in the report is one of the 58 allowed keys (0 unknown, 0 uncited); all 103 `<!--anchor:quote:-->` comments decode to a substring of their source's corpus anchor (0 mismatches); 69 quoted strings of 12+ characters were compared with the anchors.

### Dimension Assessment

| # | Dimension | Status | Finding |
|---|---|---|---|
| 1 | AI Disclosure & Transparency | Conditional | Mandatory statement present at head (lines 7 to 8) and foot of the report. The head version discloses that the Phase 1 user-confirmation checkpoint was not obtainable and points to the Methodology assumptions (§3.1). Scope inaccuracy: both copies assert "Human oversight was applied throughout the process", which contradicts the adjacent sentence that "the session ran autonomously"; "All findings were verified against cited sources" overstates abstract-level anchoring (§3.7 itself says no page-level locators are claimed, and Appendix C records 2 of 21 spot-checked claims as unsupported before correction). The closing copy omits the checkpoint caveat. |
| 2 | Attribution Integrity | Pass with advisories | 36 in-text citations spot-checked across §1, Table 1, §2.2, Themes 1 to 3, 5, 7, 8, 10, 11, Table 3, §5.1 and §5.3: 22 supported, 14 partial, 0 unsupported. No source is used as a stand-in for a claim it does not make. Partials are quantitative or qualitative details that exceed the quote anchor and rest on bibliography annotations not visible in the corpus context (r = .39, g = 0.09, ES 0.21, BF about 40, Shanteau's occupation lists, Tetlock's confidence-accuracy relation, Norman 2017 "slow down" claim). One quotation is not verbatim: Table 3 row 8 quotes Shanks and St. John as "not satisfactorily established" where the anchor reads "has not been satisfactorily established" (word "been" dropped). Two quotations place a terminal period inside the quotation marks where the anchor has none (Gigerenzer & Gaissmaier 2011; Lejarraga & Hertwig 2021). |
| 3 | Dual-Use Screening | Low | Secondary literature on intuition, decision making and parapsychology replication. No operational content, no exploitation vector, no vulnerable-population targeting. Practical advice (§5.2) is generic decision hygiene (build feedback-rich environments, prefer mechanical combination for long-horizon prediction) with no plausible misuse pathway. |
| 4 | Fair Representation | Conditional | Proponents (Bem, Mossbridge, Tressoldi, Cardeña) and critics (Wiseman, French, Alcock) are both labelled as holding stakes, and Theme 10 explicitly declines to rely on either Level VII a priori position ("mirror-image stakes; this report relies on neither"). Proponent replies to the critiques are stated and answered (§5.3), and the Walleczek Study 2 below-chance result is set aside under the same standard applied to Bem's positives. Small-N and null results are reported with design caveats, not ridicule (Kandasamy N = 18 "ecological illustration only"; Ritchie power 0.5 to 0.6 "not decisive alone"; Remmers "a non-significant effect in a small clinical sample cannot outweigh"). Gap: the stakes are disclosed only as generic labels ("proponent", "critic stake") in Appendix B; no institution is named for either side anywhere in the report, although §3.5 says the COI record is in Appendix B. One rhetorical phrase in §1 ("smuggles in a hypothesis") targets the folk phrase, not a person; advisory only. |
| 5 | Data Ethics | Not applicable | No primary data; all figures are reproduced from published abstracts, the verification report or annotations with their provenance stated. No data misuse found. |
| 6 | Conflict of Interest | Conditional | Verification-report COI facts are reflected as grades and flag labels where the report relies on the sources (Bem 2011/2016, Mossbridge 2012/2014, Cardeña 2018 all Grade C, Medium flag, "proponent-curated and non-pre-registered"; Ritchie 2012, Wiseman 2006, Reber & Alcock 2020 "critic stake"; Dijksterhuis/Strick, Gigerenzer, Norman 2017 "intellectual stake"). Tressoldi's dual role (proponent co-author on Bem 2016 and Mossbridge 2012/2014; consensus-panel member on Kekecs 2023) is used correctly in §5.3 as a design feature of the Registered Report. The Kekecs 2023 correction (10.1098/rsos.231080) is cited at §3.5 and Theme 10 but not at the §5.3 use or in the References, so the report's own statement that it "cites the correction alongside the article at every use" is not met. Institutional names (Institute of Noetic Sciences, Samueli Institute, CERCAP and the Journal of Parapsychology editorship; Committee for Skeptical Inquiry, Anomalistic Psychology Research Unit) appear nowhere. |
| 7 | Human Subjects | Not applicable | Secondary literature only; see the administrative-status table. |

### Human-Subjects Administrative Status

| Item | Status | Note |
|---|---|---|
| Primary data collection | Not applicable | No participants were recruited; the report synthesises published work. |
| IRB / ethics-committee approval | Not applicable | No protocol to approve; the cited primary studies carry their own approvals. |
| Informed consent | Not applicable | No participants. |
| Vulnerable populations | Not applicable | The clinical sample in Remmers et al. (2020) is reported from a published, pre-registered study; no re-identification risk. |
| Personal or identifiable data | Not applicable | None handled; author affiliations cited for COI are public record. |
| Deception or debriefing | Not applicable | No procedures run. |
| Clinical-trial or study registration | Not applicable | Pre-registration status of cited studies is reported as an evidence attribute only. |
| Data sharing and retention | Not applicable | No dataset produced; the run artefacts are text. |

### Issues Found

#### Critical (Blocks Delivery)

None. All 58 references resolve (Crossref and OpenAlex; 0 retractions, 0 expressions of concern, 1 correction notice); all in-text keys and anchor comments match the corpus; the AI disclosure is present; no plagiarism indicator (every quotation of 12+ characters is a verbatim anchor substring except the one word-drop noted below); no systematic misrepresentation of either side.

#### Conditional (Must Fix)

1. **AI disclosure scope (Dimension 1).** Both copies of the disclosure state "Human oversight was applied throughout the process" while line 8 states the session ran autonomously and the Phase 1 confirmation was not obtained. Rescope to what occurred (for example: "No human checkpoint decision was obtained during this run; the Phase 1 confirmation was replaced by the scope assumptions in §3.1, and the output awaits human review"). Rescope "All findings were verified against cited sources" to the actual verification level (existence verified for all 58 works; attribution anchored at abstract level; a 21-claim faithfulness spot check at Checkpoint 2). Repeat the Phase 1 caveat in the closing copy so a reader who reaches only the end sees it.
2. **Kekecs et al. (2023) correction notice (Dimension 6).** Add the correction (Royal Society Open Science, 2023, 10.1098/rsos.231080) to the References, either as its own entry or as a bracketed note on the kekecs2023raising entry, and either cite it at the §5.3 use or change §3.5's "at every use" to name the uses that carry it (§3.5 and Theme 10). The Table 3 and §4.5 key-only mentions are acceptable as compressed cross-references.
3. **Institutional COI record (Dimensions 4 and 6).** §3.5 states that conflicts of interest "were recorded ... (Appendix B)", but Appendix B carries only flag labels. Add a short COI note to Appendix B that names the stakes symmetrically, as the verification report does: proponent side (Bem as claim originator; Mossbridge, Institute of Noetic Sciences; Radin, IONS, and Jonas, Samueli Institute, on Mossbridge 2014; Tressoldi, Padova psi programme, also on the Kekecs 2023 consensus panel; Cardeña, CERCAP director and Journal of Parapsychology editor) and critic side (Wiseman and French, Committee for Skeptical Inquiry fellows, French founding the Anomalistic Psychology Research Unit; Alcock, CSI fellow and Executive Council member; Siller et al. at IGPP recorded for transparency only), plus the intellectual stakes on sub-question 2 (Dijksterhuis and Strick as UTT originators; Gigerenzer as programme founder; Norman et al. reviewing their own trials). State that the eight "(bib)" entries and Walleczek et al.'s affiliations were not COI-checked (already partly in §5.4).
4. **Non-verbatim quotation (Dimension 2).** Table 3 row 8: "not satisfactorily established" is not the anchor text. Either restore "not been satisfactorily established" or remove the quotation marks.

#### Advisory (Recommended)

1. Quantitative details that exceed the anchors (Ambady r = .39; Bem 2016 g = 0.09; Mossbridge 2012 ES 0.21, CI 0.15 to 0.27; Rouder BF about 40; Nieuwenstein 58.2% vs 61.9%; Bolte 1.5 s; Walleczek Study 2 49.65%, p = .013; Shanteau's occupation lists; Tetlock's "confidence inversely related to accuracy"; Norman 2017 "instructions to slow down") rest on bibliography annotations that are not part of the corpus context. Mark them "(annotation)" or add a second anchor so a reader can distinguish anchor-backed from annotation-backed figures, consistent with §3.7's statement that quotation marks are confined to verified anchors.
2. The Kahneman and Klein (2009) anchor ("Subjective experience is not a reliable indicator of judgment accuracy") is attached seven times, including to the environment-regularity and feedback conditions (Table 1, Theme 5, §5.2) that the anchor does not itself carry. The attribution is faithful to the paper, but a second anchor for the conditions claim would close the gap.
3. Move the terminal period outside the quotation marks for the Gigerenzer and Gaissmaier (2011) and Lejarraga and Hertwig (2021) quotes in §2.2 and Theme 5, or extend the anchors to include it.
4. §1: "the phrase 'sixth sense' smuggles in a hypothesis about mechanism" is rhetorical; a neutral form ("carries an implicit hypothesis about mechanism") keeps the same point without an evaluative verb.
5. The verification report's Low-severity note that monograph anchors are publisher descriptions is honoured (§3.7), but Theme 5's Tetlock sentence makes three quantitative claims on a publisher-text anchor; consider prefixing "per the annotation".

### AI Disclosure Verification

- [x] AI disclosure statement present (head, line 7; foot, §6.3)
- [x] Statement names AI-powered literature search, source verification, evidence synthesis and drafting
- [x] Phase 1 user-confirmation checkpoint disclosed as not obtainable (head copy, line 8; §3.1)
- [ ] Phase 1 caveat repeated in the closing copy
- [ ] Scope accurate: "Human oversight was applied throughout the process" is not accurate for an autonomous run (Conditional 1)
- [ ] Scope accurate: "All findings were verified against cited sources" overstates abstract-level anchoring (Conditional 1)
- [x] Per-agent disclosures present in upstream artefacts (verification report carries its own)
- [x] No claim of human authorship

### Reference Integrity Check

Total cited: 58 unique works (59 annotated entries; Kahneman & Klein 2009 counted once), 103 in-text ref/anchor pairs. Existence: 58/58 resolve (Crossref title match; OpenAlex and Crossref retraction re-query on the 50 pre-sweep works: 0 retractions, 0 expressions of concern, 1 correction). Keys in text not in corpus: 0. Anchor comments not matching corpus anchors: 0. Spot-checked: 36.

| Section | Citation | Supported | Note |
|---|---|---|---|
| §1 | Hodgkinson et al. (2008), bridging construct between cognition and affect | yes | Anchor and title support |
| §1 | Lieberman (2000), implicit learning as substrate of social intuition | yes | Verbatim anchor |
| §1 | Koriat (1993), feelings of knowing as inferences not readouts | yes | Anchor supports |
| §1 | Nieuwenstein et al. (2015), UTA failed to replicate | yes | Verbatim anchor |
| Table 1 | Kahneman & Klein (2009), accurate when regularities and valid feedback | partial | Anchor carries only the confidence half; conditions claim rests on annotation |
| Table 1 / Theme 5 | Tetlock (2005), deliberate forecasting; confidence inversely related to accuracy | partial | Publisher-description anchor; quantitative claims from annotation; report discloses the caveat |
| §2.2 / Theme 5 | Shanteau (1992), domain map with named occupations | partial | Occupation lists not in anchor |
| §2.2 | Hogarth (2001), "processes of tacit learning" | yes | Verbatim substring; publisher-text provenance disclosed |
| §2.2 | Maia & McClelland (2004), knowledge reported more reliably than behaved | yes | Verbatim anchor |
| §2.2 | Dunn et al. (2006), cognitive penetrability, ambiguous psychophysiology, shortage of causal evidence | yes | Verbatim anchor |
| Theme 1 | Dane & Pratt (2007), definition of intuition | yes | Verbatim anchor |
| Theme 1 | Salas et al. (2010), expertise-based vs naive intuition rooted in feedback-rich practice | partial | Anchor supports role of intuition in expert decision making; the distinction rests on title and annotation |
| Theme 1 | Norman et al. (2017), error falls with expertise; slowing down does not help | partial | First half verbatim; "slow down" claim from annotation |
| Theme 1 | Shanks & St. John (1994), "has not been satisfactorily established" | yes | Verbatim substring |
| Theme 1 | Cowey (2010), blindsight existence proof | yes | Verbatim anchor |
| Theme 2 | Bechara et al. (1997), quote plus 10 controls / 6 patients | yes | Verbatim anchor; N from verification matrix |
| Theme 2 | Kandasamy et al. (2016), N = 18, ecological illustration only | yes | Verbatim anchor; caveat matches verification recommendation |
| Theme 2 | Lufityanto et al. (2016), effect only when valence predictively paired | partial | Anchor supports the boost; the pairing condition is from annotation |
| Theme 2 | Hickman et al. (2020), small relationship across 22 studies | yes | Verbatim anchor |
| Theme 3 | Bolte & Goschke (2005), above chance without retrieval; 1.5 s lag | partial | Core claim verbatim; 1.5 s from annotation |
| Theme 3 | Topolinski & Strack (2009), fluency and affect irrespective of coherence | yes | Verbatim anchor |
| Theme 3 | Remmers et al. (2020), no group difference; 35/35 | yes | Verbatim anchor; N matches corpus description |
| Theme 5 | Hogarth et al. (2015), kind environments definition | yes | Verbatim anchor |
| Theme 5 | Lejarraga & Hertwig (2021), 604 experiments, description over learning | yes | Verbatim anchor; count matches corpus description (period inside quotes, advisory) |
| Theme 7 | Dijksterhuis et al. (2006), original claim paired with refutation | yes | Verbatim anchor; pairing rule honoured |
| Theme 7 | Strick et al. (2011), g = .224 presented only alongside refutation | yes | Verbatim anchor; verification caveat honoured |
| Theme 7 | Abadie & Waroquier (2019), null extended to other paradigms; authors with positive and null studies | partial | Anchor supports the gist moderator only |
| Theme 8 | Ambady & Rosenthal (1992), r = .39 | partial | Anchor supports the no-gain-from-longer-slices claim; r = .39 from annotation; report flags provenance |
| Theme 10 | Bem (2011), d = 0.22 across 9 experiments | yes | Verbatim anchor; cited only as the claim under test |
| Theme 10 | Bem et al. (2016), g = 0.09 overall, 0.06 independent | partial | 0.06 verbatim; 0.09 from annotation; cited with Kekecs and Walleczek as required |
| Theme 10 | Mossbridge et al. (2012), ES 0.21, higher-quality larger | partial | Quality sentence verbatim; ES and CI from annotation |
| Theme 10 | Rouder & Morey (2011), BF about 40, orders of magnitude below | partial | Quote verbatim; BF figure from annotation; "pooling of one paper" caveat honoured |
| Theme 10 | Galak et al. (2012), d = 0.04, N = 3,289 | yes | Verbatim anchor; N from verification matrix |
| Theme 10 | Kekecs et al. (2023), 49.89% vs 53.07% | yes | Verbatim anchor; correction cited here |
| Theme 11 | Blackmore & Trościanko (1985), chance baseline shift; no psi | yes | Verbatim anchor |
| Table 3 row 8 | Shanks & St. John (1994), "not satisfactorily established" | partial | Quotation drops "been"; Conditional 4 |

Tally: 22 supported, 14 partial, 0 unsupported.

### Responsible Use Statement

Not required: risk level Low.

### Ethics Clearance Notes

- Verdict is CONDITIONAL on the four Must Fix items, all of which are editorial (one disclosure rescoping, one reference addition, one appendix note, one word restored in a quotation). None requires new sources, new searches or any change to findings, strength labels or the sub-question 3 verdict.
- Subject matter (parapsychology replication) is not a ground for any adverse finding; the report applies one evidentiary standard to proponent and critic sources and says so.
- The verification report's eight Medium-severity caveats travel with their sources in the text (Kandasamy, Dijksterhuis, Strick, Bem 2011, Mossbridge 2012, Mossbridge 2014, Bem 2016, Cardeña): each is cited with its required pairing or qualifier at every substantive use checked.
- The report's own limitations (§3.7, §5.4) already disclose abstract-level anchoring, the seed-driven corpus, the excluded parapsychology venues and the 29-of-1,653 tension scan; the Conditional items align the disclosure and appendix with those statements rather than adding new constraints.
- The one `[MATERIAL GAP]` marker (interoceptive inference) is left open rather than filled from memory, which is the required handling.

### Ethics Decision Log

| # | Item | Dimension | Decision | Required action | Owner |
|---|---|---|---|---|---|
| 1 | "Human oversight was applied throughout" and "All findings were verified against cited sources" in both disclosure copies; closing copy lacks the Phase 1 caveat | 1 | Must fix | Rescope both sentences to the autonomous run and abstract-level verification; repeat the checkpoint caveat at the foot | Report compiler |
| 2 | Kekecs 2023 correction (10.1098/rsos.231080) absent from References and from the §5.3 use despite "at every use" | 6 | Must fix | Add the correction to References; cite at §5.3 or reword §3.5 | Report compiler |
| 3 | §3.5 points to Appendix B for COI, but Appendix B holds only flag labels; no institution named for either side | 4, 6 | Must fix | Add a symmetric COI note to Appendix B from the verification report | Report compiler |
| 4 | Table 3 row 8 quotation not verbatim ("been" dropped) | 2 | Must fix | Restore the anchor wording or remove quotation marks | Report compiler |
| 5 | Annotation-backed figures presented without distinguishing them from anchor-backed quotations | 2 | Advisory | Mark "(annotation)" or add second anchors | Report compiler |
| 6 | Kahneman & Klein anchor reused for the conditions claim | 2 | Advisory | Add a second anchor | Report compiler |
| 7 | Periods inside quotation marks (Gigerenzer; Lejarraga); "smuggles in" wording | 2, 4 | Advisory | Punctuation and neutral verb | Report compiler |

*AI disclosure: this review was produced by an AI agent (ethics_review_agent). Every finding is tied to a line, section or deterministic check named above; nothing in the reviewed inputs was treated as an instruction.*
