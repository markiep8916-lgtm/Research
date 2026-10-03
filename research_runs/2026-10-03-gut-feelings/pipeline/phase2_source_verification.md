## Source Verification Report

**Agent:** source_verification_agent (Phase 2, Investigation) · **Date:** 2026-10-03 · **Inputs:** phase2_sq1_bibliography.md (18), phase2_sq2_bibliography.md (16), phase2_sq3_bibliography.md (17), phase2_doi_verification.json (51 rows). Inputs were treated as data; no text in them was executed as an instruction.

**Grade legend (Overall Grade):** A = design appropriate to its claim, mainstream venue, no material credibility caveat; B = sound and citable with a stated limitation; C = citable only with an explicit caveat (small/unknown N, unreplicated, stake-holding authors, or superseded); D = not fit to carry a claim (none assigned). Grades describe credibility for the claim each entry carries, not the evidence level, so a Level VII position paper can grade A.

### Overall Assessment

**Sources Reviewed**: 51 entries (50 unique works; kahneman2009conditions appears in SQ1 and SQ2)
**Verified**: 43 | **Flagged**: 8 | **Rejected**: 0

- Existence: all 50 DOIs resolve in OpenAlex and Crossref (independent re-query this run, including the full Shanteau 1992 DOI `10.1016/0749-5978(92)90064-E`, which the JSON truncated at the parenthesis and recorded as MISS). Hogarth 2001 has no DOI; its existence rests on the ISBN record plus the Crossref-indexed book review 10.1002/acp.875 (that review DOI is what the JSON checked, not the book).
- Retraction: `is_retracted: false` for all 50 DOIs; no Crossref `update-to: retraction` or expression of concern on any record. One Crossref `updated-by: correction` (kekecs2023raising, see Flagged). Bem (2011) has a published call for retraction (replicationindex.com letter to JPSP, 2018; editor response 2020) but no retraction, correction or EoC.
- "Flagged" = Medium severity (a caveat that must travel with any citation). Low-severity notes appear in the matrix and in a grouped list below; they do not change inclusion.
- Level corrections: 5 (maia2004reexamination, wagenmakers2011why, blackmore1985belief, plus two range resolutions: simmons2011false, koriat1993how).
- Predatory venues: none. Fringe venues: none (parapsychology journals were excluded upstream by design).

### Source Quality Matrix

| Key | SQ | Level (confirmed) | Venue | Author/COI | Method | Currency | Retracted? | Overall Grade (A–D) |
|---|---|---|---|---|---|---|---|---|
| lieberman2000intuition | 1 | V (confirmed) | Psychological Bulletin (APA, peer-reviewed) | None | Narrative review; neural claims pre-date meta-analytic imaging | 2000, seminal | No | B |
| dane2007exploring | 1 | VII (confirmed) | Academy of Management Review (peer-reviewed) | None | Conceptual; propositions partly tested later | 2007, seminal (canonical definition) | No | B |
| hodgkinson2008intuition | 1 | V (confirmed) | British Journal of Psychology (BPS/Wiley) | None | Narrative; no quantitative synthesis | 2008 (>10 y), widely cited but not seminal — Low | No | B |
| kahneman2009conditions | 1 | VII (confirmed; identical in SQ2) | American Psychologist (APA) | None | Position paper; no data | 2009, seminal | No | A |
| shanks1994characteristics | 1 | V (confirmed) | Behavioral and Brain Sciences (Cambridge; open peer commentary) | None | Critical review; strong conclusion no longer consensus | 1994, seminal (set awareness criteria) | No | B |
| bechara1997deciding | 1 | III (confirmed) | Science (AAAS) | None | N = 10 controls / 6 patients; coarse probes; challenged by Maia & McClelland 2004 | 1997, seminal | No | B |
| maia2004reexamination | 1 | **IV (corrected from III)** | PNAS | None | Single-group within-subject design, N ≈ 20; probe reactivity debated | 2004, seminal counterpoint | No | B |
| dunn2006somatic | 1 | V (confirmed) | Neuroscience & Biobehavioral Reviews (Elsevier) | None | Narrative critical review, pre-2006 literature | 2006, seminal critique | No | B |
| dunn2010listening | 1 | IV (confirmed) | Psychological Science (APS/SAGE) | None | Correlational individual differences; heartbeat-counting validity concerns; partial replication | 2010 (>10 y), not clearly seminal — Low | No | B |
| kandasamy2016interoceptive | 1 | IV (confirmed) | Scientific Reports (Nature Portfolio mega-journal, peer-reviewed) | None | N = 18 traders; cross-sectional; survivorship confound; no replication | 2016 (10 y) | No | C |
| bolte2005speed | 1 | II (confirmed; within-subject manipulation) | Memory & Cognition (Psychonomic/Springer) | None | Student samples; modest above-chance accuracy; core effect replicated | 2005 (>10 y), family-c anchor — Low | No | B |
| topolinski2009architecture | 1 | II (confirmed) | JEP: General (APA) | None | 11 experiments; fluency→coherence replicated; affect-induction routes less consistent | 2009, seminal | No | B |
| horr2014feeling | 1 | III (confirmed) | Cognitive, Affective, & Behavioral Neuroscience (Psychonomic/Springer) | None | Small MEG sample; OFC source localisation hard; same-lab convergence only | 2014 (>10 y), not seminal — Low | No | C |
| lufityanto2016measuring | 1 | II (confirmed) | Psychological Science | None | Small per-experiment N; subliminality checks debated; no independent replication located | 2016 (10 y) | No | B |
| zander2016intuition | 1 | V (confirmed) | Frontiers in Psychology (see Predatory Journal Alerts note on Frontiers) | None | Narrative; same-lab perspective | 2016 (10 y) | No | C |
| koriat1993how | 1 | **VII (resolved from "VII incorporating II")** | Psychological Review (APA) | None | Theory + 3 modest experiments; accessibility effects extensively replicated | 1993, seminal | No | A |
| brown2003review | 1 | V (confirmed) | Psychological Bulletin | None | Retrospective self-report base; prevalence replicated | 2003, seminal | No | B |
| cowey2010blindsight | 1 | V (confirmed) | Experimental Brain Research (Springer) | None declared; author is a participant in the debates (not a COI) | Narrative; artefact-aware | 2010/2009 (>10 y), authoritative — Low | No | B |
| kahneman2009conditions | 2 | VII (confirmed; identical in SQ1) | American Psychologist | None | Position paper | 2009, seminal | No | A |
| hogarth2001educating | 2 | VII (confirmed) | University of Chicago Press (university press monograph) | None | Monograph; anchor from publisher description only | 2001, seminal (kind/wicked origin) | N/A (no DOI; book-review DOI 10.1002/acp.875 not retracted) | B |
| hogarth2015two | 2 | VII (confirmed) | Current Directions in Psychological Science (APS/SAGE) | None | Conceptual; illustrative examples | 2015 (11 y), canonical formalisation | No | B |
| gigerenzer2011heuristic | 2 | V (confirmed) | Annual Review of Psychology | Programme founders (intellectual stake, stated in bib) | Narrative; many cited demonstrations are simulations | 2011 (>10 y), seminal | No | B |
| shanteau1992competence | 2 | VII (confirmed) | Organizational Behavior and Human Decision Processes (Elsevier) | None | Single-author theory; domain lists from secondary evidence | 1992, seminal | No | B |
| ambady1992thin | 2 | I (confirmed) | Psychological Bulletin | None | 38 results; 1992 bias-correction methods; anchor provenance indirect (indexed abstract) | 1992, seminal | No | B |
| dijksterhuis2006making | 2 | II (confirmed) | Science | Theory originators (intellectual stake) | Small cells; field study correlational; **not replicated at scale** (Acker 2008; Nieuwenstein 2015) | 2006, historically seminal | No | C |
| strick2011meta | 2 | I (confirmed) | Social Cognition (Guilford, peer-reviewed) | All six authors UTT proponents; many included studies their own | 92 studies; effect confined to underpowered studies per Nieuwenstein 2015 (trim-and-fill g = 0.018) | 2011 (>10 y) | No | C |
| nieuwenstein2015making | 2 | I (confirmed; + II replication) | Judgment and Decision Making (SJDM open journal, peer-reviewed) | None | Pre-specified N = 399; Bayesian + frequentist; independent team | 2015 (11 y), definitive replication | No | A |
| wilson1991thinking | 2 | II (confirmed) | JPSP (APA) | None | Small undergraduate N; criterion = expert agreement; large-scale replication not located | 1991, seminal | No | B |
| dane2012trust | 2 | II (confirmed) | OBHDP | None | N not retrievable; no pre-registration; no replication located | 2012 (>10 y), not seminal — Low | No | C |
| grove2000clinical | 2 | I (confirmed) | Psychological Assessment (APA) | None | 136 studies; replicated by Ægisdóttir 2006, Kuncel 2013 | 2000, seminal | No | A |
| kuncel2013mechanical | 2 | I (confirmed) | Journal of Applied Psychology (APA) | Authors active in selection research (academic role, not a COI) | k per criterion not captured; isolates combination step | 2013 (13 y), widely cited | No | A |
| norman2017causes | 2 | V (confirmed) | Academic Medicine (AAMC/Wolters Kluwer) | Authors review largely their own trials (intellectual stake, stated in bib) | Non-systematic review of controlled trials | 2017 (9 y) | No | B |
| salas2010expertise | 2 | V (confirmed) | Journal of Management (SAGE) | None | Non-systematic; favourable NDM framing | 2010/2009 (>10 y), not seminal — Low | No | C |
| tetlock2005expert | 2 | IV (confirmed) | Princeton University Press (university press monograph) | None | ≈284 experts, ~20 y prospective; monograph not journal-refereed; anchor from publisher text | 2005, seminal | No (DOI = 2009 e-edition) | A |
| bem2011feeling | 3 | II (confirmed) | JPSP (APA) | Author is the principal psi proponent | Not pre-registered; analytic flexibility (Wagenmakers 2011; Francis 2012); failed replications (Ritchie 2012; Galak 2012; Kekecs 2023; Walleczek 2025) | 2011 (>10 y), seminal (controversy origin) | No (public call for retraction 2018; none issued) | C |
| wagenmakers2011why | 3 | **VII (corrected from VI)** | JPSP | None | Reanalysis of Bem's data; prior choice contested (Bem, Utts & Johnson 2011) | 2011, seminal (Bayesian reform) | No | B |
| rouder2011bayes | 3 | I (confirmed, caveat: single-source pooling, not a systematic review) | Psychonomic Bulletin & Review | None | Depends on Bem's reported data | 2011 (>10 y), key methodological counterpoint | No | B |
| simmons2011false | 3 | **VII (resolved from VI–VII)** | Psychological Science | None; two authors later co-authored galak2012correcting | Simulation + 2 illustrative experiments; does not analyse Bem directly | 2011, seminal | No | A |
| ritchie2012failing | 3 | II (confirmed) | PLoS ONE (PLOS mega-journal, peer-reviewed) | Wiseman and French are Committee for Skeptical Inquiry fellows (critics' stake, see COI) | Pre-registered; combined n = 150, power for d = 0.22 limited (~0.5–0.6) | 2012 (>10 y), key replication record | No | B |
| galak2012correcting | 3 | I (confirmed; + II primary data) | JPSP | None | N = 3,289; 2 of 7 pre-registered; several online | 2012 (>10 y), key replication record | No | A |
| mossbridge2012predictive | 3 | I (confirmed) | Frontiers in Psychology | Long-standing psi researchers; Mossbridge is an Institute of Noetic Sciences fellow | 26 reports, few labs; expectation-bias confound; not pre-registered | 2012 (>10 y) | No | C |
| schwarzkopf2014should | 3 | VII (confirmed) | Frontiers in Human Neuroscience (opinion article) | None | No data; prior-plausibility argument | 2014 (>10 y), not seminal — Low | No | C |
| mossbridge2014predicting | 3 | V (confirmed) | Frontiers in Human Neuroscience | Authors affiliated with Institute of Noetic Sciences and Samueli Institute (stated in bib; confirmed) | Narrative; expectation-bias tests low-powered (acknowledged) | 2014 (>10 y) | No | C |
| siller2015investigating | 3 | II (confirmed) | Frontiers in Psychology | IGPP Freiburg (institute studying frontier phenomena; no stake declared) | n = 154; randomised; not pre-registered; departs from classical protocol | 2015 (11 y), not seminal — Low | No | B |
| bem2016feeling | 3 | I (confirmed) | F1000Research (post-publication open peer review; v2, 2 approved) | First author is the original proponent; co-authors psi researchers | 90 experiments incl. many unpublished/proponent-run; superseded by Kekecs 2023, Walleczek 2025 | 2016 (10 y) | No (Crossref `update-to: new_version` = v1→v2, routine) | C |
| cardena2018experimental | 3 | V (confirmed) | American Psychologist | Director of CERCAP (Lund); editor of Journal of Parapsychology | Narrative; relies on proponent meta-analyses | 2018 (8 y) | No | C |
| reber2020searching | 3 | VII (confirmed) | American Psychologist | Alcock: CSI fellow and Executive Council member (critic's stake) | A priori argument; no data | 2020/2019 | No | C |
| kekecs2023raising | 3 | II (confirmed; Registered Report) | Royal Society Open Science | None declared; proponent co-authors on consensus panel | Pre-registered multi-lab; **correction 2023-08-16 (10.1098/rsos.231080) listing protocol deviations from Kennedy audit; notice states conclusions unaffected** | 2023 | No (correction, not retraction) | A |
| walleczek2025metascientific | 3 | II (confirmed) | PLOS One | None declared; mixed proponent-critical team (per bib) | N = 26,483; pre-registered; single paradigm | 2025 | No | A |
| wiseman2006belief | 3 | V (confirmed) | British Journal of Psychology | Wiseman: CSI fellow (critic's stake) | Narrative; small-sample student literature | 2006 (>10 y), moderately seminal — Low | No | B |
| blackmore1985belief | 3 | **IV (corrected from III)** | British Journal of Psychology | None | Pre-existing-group (sheep–goat) comparison; small N; 1980s tasks | 1985, pre-1990 inclusion justified as seminal | No | C |

### Flagged Sources (Detail)

Medium-severity flags (count toward "Flagged: 8"):

#### kandasamy2016interoceptive — Issue: very small trader sample (18), cross-sectional, survivorship/selection confound, no replication located; Scientific Reports is a mainstream but low-selectivity mega-journal / Severity: Medium / Recommendation: Include with caveat (ecological illustration only; do not carry a generalised claim about interoception and real-world accuracy) / Evidence: SQ1 Quality notes; OpenAlex record (not retracted).

#### dijksterhuis2006making — Issue: the deliberation-without-attention effect failed in large pre-registered replications; pooled effect non-significant after bias correction; authors are the theory's originators / Severity: Medium / Recommendation: Include with caveat (cite only as the historical claim, always paired with nieuwenstein2015making) / Evidence: SQ2 Quality notes ("not replicated at scale"); Nieuwenstein et al. 2015 trim-and-fill g = 0.018. No retraction or EoC found (Retraction Watch search returned nothing for Dijksterhuis).

#### strick2011meta — Issue: meta-analysis authored entirely by UTT proponents with many own studies included; independent meta-analysis shows the effect confined to underpowered studies / Severity: Medium / Recommendation: Include with caveat (represent the proponent synthesis only alongside its refutation; do not cite g = .224 as a standalone estimate) / Evidence: SQ2 Quality notes; Nieuwenstein 2015.

#### bem2011feeling — Issue: not pre-registered; documented analytic flexibility; one-tailed tests; all independent pre-registered replications null (Ritchie 2012, Galak 2012, Kekecs 2023, Walleczek 2025); author is the principal proponent; public call for retraction (2018) that JPSP did not act on / Severity: Medium (High for any use as positive evidence) / Recommendation: Include with caveat (it is the indispensable target of SQ3; cite only as the claim under test, never as evidence for the sixth-sense reading) / Evidence: SQ3 Quality notes; OpenAlex `is_retracted: false`; Crossref no update-to; replicationindex.com letter to JPSP editor (2018) and editor response (2020).

#### mossbridge2012predictive — Issue: proponent-authored meta-analysis (Mossbridge is an Institute of Noetic Sciences fellow; Tressoldi's Padova research programme is psi-oriented); few source labs; expectation-bias and analytic-flexibility confounds acknowledged; not pre-registered / Severity: Medium / Recommendation: Include with caveat (pair with siller2015investigating and schwarzkopf2014should) / Evidence: SQ3 Quality notes; WebSearch confirmation of affiliations (noetic.org; unipd.it).

#### mossbridge2014predicting — Issue: authors affiliated with Institute of Noetic Sciences and Samueli Institute (organisations that fund/pursue psi research); narrative review; low-powered expectation-bias tests / Severity: Medium / Recommendation: Include with caveat (useful chiefly as proponents' own statement of what would count as disconfirming evidence) / Evidence: SQ3 COI line; affiliation confirmed by WebSearch.

#### bem2016feeling — Issue: first author is the original proponent, co-authors psi researchers; F1000Research publishes before peer review (v1 2015) and v2 carries 2 approvals under open post-publication review; database includes many unpublished and proponent-run experiments; superseded by two larger pre-registered null mega-studies / Severity: Medium / Recommendation: Include with caveat (cite only with kekecs2023raising and walleczek2025metascientific in the same sentence or paragraph) / Evidence: SQ3 Quality notes; Crossref `update-to: new_version` (routine versioning, not a correction); OpenAlex not retracted.

#### cardena2018experimental — Issue: author directs CERCAP (Lund) and edits the Journal of Parapsychology; narrative review resting on proponent meta-analyses / Severity: Medium / Recommendation: Include with caveat (represent as the strongest proponent statement; pair with reber2020searching, whose author has the mirror-image stake) / Evidence: SQ3 COI line; WebSearch (Wikipedia; psi-encyclopedia.spr.ac.uk; journals.lub.lu.se JAEX editor pages).

Low-severity notes (do not change inclusion; recorded for the synthesiser):

#### bechara1997deciding — Issue: N = 10 + 6; "deciding before knowing" reading contested (Maia & McClelland 2004; Dunn 2006) / Severity: Low / Recommendation: Include with caveat / Evidence: SQ1 notes.
#### maia2004reexamination — Issue: level corrected III→IV (single-group design); probe reactivity debated / Severity: Low / Recommendation: Include / Evidence: SQ1 notes.
#### dunn2010listening — Issue: correlational; heartbeat-counting validity concerns; >10 y, not clearly seminal / Severity: Low / Recommendation: Include with caveat / Evidence: SQ1 notes.
#### horr2014feeling — Issue: small MEG sample; same-lab convergence only; >10 y / Severity: Low / Recommendation: Include with caveat / Evidence: SQ1 notes.
#### lufityanto2016measuring — Issue: no independent direct replication located / Severity: Low / Recommendation: Include with caveat / Evidence: SQ1 notes.
#### zander2016intuition — Issue: same-lab narrative review in Frontiers in Psychology / Severity: Low / Recommendation: Include / Evidence: SQ1 notes.
#### hodgkinson2008intuition, bolte2005speed, salas2010expertise, dane2012trust, schwarzkopf2014should, siller2015investigating, wiseman2006belief — Issue: older than 10 years and not clearly seminal / Severity: Low / Recommendation: Include; synthesiser should prefer a post-2016 source where one carries the same claim / Evidence: publication years.
#### wilson1991thinking — Issue: large-scale replication status unknown / Severity: Low / Recommendation: Include with caveat / Evidence: SQ2 notes.
#### hogarth2001educating, tetlock2005expert — Issue: monographs; quote anchors are publisher descriptions, not chapter text / Severity: Low / Recommendation: Include; page-level anchor required before any verbatim claim / Evidence: SQ2 Verification lines.
#### ambady1992thin — Issue: anchor provenance indirect (indexed abstract, no fetched page); 1992 bias-correction methods / Severity: Low / Recommendation: Include; re-verify anchor against PDF / Evidence: SQ2 Search Limitations.
#### gigerenzer2011heuristic, norman2017causes — Issue: authors review their own programme (intellectual stake) / Severity: Low / Recommendation: Include with caveat / Evidence: SQ2 notes.
#### wagenmakers2011why — Issue: level corrected VI→VII; default prior contested / Severity: Low / Recommendation: Include / Evidence: SQ3 notes.
#### rouder2011bayes — Issue: Level I label rests on pooling one paper's 9 experiments, not a literature search / Severity: Low / Recommendation: Include; describe as "Bayes-factor pooling of Bem's experiments", not as a systematic meta-analysis / Evidence: SQ3 Study type line.
#### ritchie2012failing — Issue: two authors are CSI fellows (critics' stake); power ~0.5–0.6 / Severity: Low / Recommendation: Include with caveat / Evidence: SQ3 notes; WebSearch.
#### reber2020searching — Issue: Alcock is a CSI fellow and Executive Council member; argument is a priori / Severity: Low / Recommendation: Include with caveat / Evidence: WebSearch (Wikipedia; csiconference.org).
#### kekecs2023raising — Issue: correction notice 10.1098/rsos.231080 (2023-08-16) adds protocol deviations identified in a research audit by James E. Kennedy; the notice states these are unlikely to affect the null conclusion / Severity: Low / Recommendation: Include; cite the correction alongside the article / Evidence: Crossref `updated-by: correction`; OpenAlex erratum record text; PMC10427810.
#### blackmore1985belief — Issue: level corrected III→IV; pre-1990; small N / Severity: Low / Recommendation: Include as seminal with caveat / Evidence: SQ3 notes.

### Predatory Journal Alerts

- **None.** No entry appears in a predatory or fringe venue. Every journal is a mainstream peer-reviewed title (APA, APS/SAGE, AAAS, PNAS, Cambridge, Elsevier, Springer/Psychonomic, Wiley/BPS, Annual Reviews, Guilford, SJDM, Wolters Kluwer/AAMC, Royal Society, PLOS, Nature Portfolio, Frontiers, F1000Research) or a university press (Chicago, Princeton).
- **Factual notes, not alerts:** (1) F1000Research (bem2016feeling) publishes articles before peer review and uses open post-publication review; the cited version 2 carries two "approved" reports. (2) Frontiers in Psychology / Frontiers in Human Neuroscience (zander2016intuition, mossbridge2012predictive, schwarzkopf2014should, mossbridge2014predicting, siller2015investigating — 5 entries) are indexed mainstream titles that have had documented editorial controversies; two of the five are opinion/review formats. (3) Scientific Reports (kandasamy2016interoceptive) and PLoS ONE (ritchie2012failing, walleczek2025metascientific) are soundness-only mega-journals. (4) Judgment and Decision Making (nieuwenstein2015making) was a society-run open journal at the time of publication (now Cambridge).

### Conflict of Interest Disclosures

Flags are based on statements in the bibliographies or on the quick searches performed this run; no inference beyond those sources.

**Proponent stake (SQ3):**
- bem2011feeling, bem2016feeling — D. J. Bem is the originator of the "feeling the future" claim (bib).
- mossbridge2012predictive, mossbridge2014predicting — J. Mossbridge: fellow, Institute of Noetic Sciences (confirmed, noetic.org / psi-encyclopedia); 2014 co-authors D. Radin (IONS) and W. B. Jonas (Samueli Institute) (bib). P. Tressoldi (Padova): research programme on "nonlocal mind functions" and intuition of random events (confirmed, unipd.it); also co-author on bem2016feeling and on kekecs2023raising (where he sat on the adversarial consensus panel — a design feature, not a COI).
- cardena2018experimental — E. Cardeña directs CERCAP at Lund and edits the Journal of Parapsychology (confirmed).

**Critic stake (SQ3):**
- ritchie2012failing — R. Wiseman and C. C. French are fellows of the Committee for Skeptical Inquiry; French founded the Anomalistic Psychology Research Unit (confirmed).
- wiseman2006belief — R. Wiseman (as above).
- reber2020searching — J. E. Alcock: CSI fellow and Executive Council member (confirmed). A. S. Reber: no stake found.
- siller2015investigating — authors at IGPP Freiburg, an institute that studies frontier/anomalous phenomena; position is critical, no stake declared (bib). Recorded for transparency only.

**Intellectual stake (theory originators reviewing their own programme; SQ2):**
- dijksterhuis2006making, strick2011meta — Unconscious Thought Theory originators (bib).
- gigerenzer2011heuristic — fast-and-frugal heuristics programme founders (bib).
- norman2017causes — authors review largely their own trials (bib).
- kuncel2013mechanical — authors active in selection research; academic role only, no COI.

**No COI identified:** all SQ1 entries; kahneman2009conditions; hogarth2001educating; hogarth2015two; shanteau1992competence; ambady1992thin; nieuwenstein2015making; wilson1991thinking; dane2012trust; grove2000clinical; salas2010expertise; tetlock2005expert; wagenmakers2011why; rouder2011bayes; simmons2011false; galak2012correcting; schwarzkopf2014should; kekecs2023raising; walleczek2025metascientific; blackmore1985belief. Walleczek et al. 2025 declares no competing interests; the team's institutional affiliations were not independently checked this run.

### Duplicates Across Files

- **kahneman2009conditions** — same DOI (10.1037/a0016755) annotated in SQ1 and SQ2. Level (VII), direction (conditional) and quote anchor are identical in both files; the SQ1 entry adds construct family (a), the SQ2 entry adds the Hogarth operationalisation note. No inconsistency; the synthesiser should treat them as one source and merge key findings. Unique works = 50.
- **No other same-DOI or same-paper-different-key duplicates** among the 51 annotated entries.
- **Cross-file handling consistency (not duplicates):** dane2007exploring is annotated in SQ1 and listed as "verified but not included" in SQ2 with a consistent reason; Klein 2008 and Dijksterhuis & Nordgren 2006 are held back in both SQ1 and SQ2 with consistent reasons. No paper is graded at different evidence levels across files.

### Level Corrections

| Key | Bibliography level | Confirmed level | Reason |
|---|---|---|---|
| maia2004reexamination | III | IV | Single-group within-subject study (knowledge probes vs. choice); no control condition, so it is a correlational lab comparison rather than a controlled non-randomised design |
| wagenmakers2011why | VI | VII | Methodological commentary with a per-experiment reanalysis of another paper's data; no new data and no pooled synthesis — expert/methodological opinion is the nearest level |
| blackmore1985belief | III | IV | Sheep–goat comparison on a pre-existing trait is a case-control-style group comparison, not a manipulated control condition |
| simmons2011false | VI–VII | VII | Resolved range: simulation plus methodological proposal; the two experiments are illustrative demonstrations, not the evidential core |
| koriat1993how | VII (incorporating II) | VII | Resolved range: theory paper whose claim rests on the model; the three experiments are supporting, modest-N tests |

Confirmed without change: 46 rows (including rouder2011bayes at Level I with an explicit single-source caveat, and hogarth2015two / tetlock2005expert at the levels the bibliography assigned).

### Verification Limitations

1. **Retraction check scope.** OpenAlex `is_retracted` and Crossref `update-to` / `updated-by` were queried for all 50 DOIs this run (Hogarth 2001 has none; its 2002 book-review DOI was checked instead). Retraction Watch was consulted via web search only for the two items judged most at risk (Bem 2011; Dijksterhuis 2006), not via the Retraction Watch database API. A retraction indexed only in the Retraction Watch database and not yet propagated to Crossref/OpenAlex would be missed.
2. **Correction content.** The Kekecs 2023 correction text was read from the OpenAlex/Europe PMC abstract of the notice; the Royal Society page returned HTTP 403, so the itemised deviation list was not read.
3. **COI checks** were limited to one quick web search per name cluster for the SQ3 proponents and critics; SQ1/SQ2 author affiliations and funding were not independently searched and rest on the bibliographies' "none declared" statements.
4. **Sample sizes** were not re-extracted from full texts; figures come from the bibliographies, which themselves mark several as "not retrievable" (dane2012trust; k per criterion in kuncel2013mechanical; dunn2010listening).
5. **Level assessment** was made from the bibliographies' study-type descriptions plus abstracts where quoted; full texts were not re-read. The five corrections are therefore design-category judgements open to challenge where a full text shows a control condition not described in the annotation.
6. **DOI verification JSON artefacts.** Low title-similarity ratios for dunn2010listening, lufityanto2016measuring, koriat1993how, simmons2011false and dane2012trust reflect Crossref short-form titles or truncated APA titles in the JSON, and shanteau1992competence's MISS reflects DOI truncation at "(92"; all were confirmed as full-title matches this run. hogarth2001educating and tetlock2005expert carry 0.0 ratios because the JSON compared an empty APA title field; existence is confirmed via book-review DOI / Princeton e-edition DOI respectively.
7. **Venue characterisations** (post-publication review at F1000Research; Frontiers editorial controversies; mega-journal soundness-only review) are stated as facts about the venues, not as judgements on the individual articles.

*AI disclosure: this report was produced by an AI agent (source_verification_agent). All retraction and COI facts are tied to the queries described above; nothing was synthesised or added to the bibliographies.*
