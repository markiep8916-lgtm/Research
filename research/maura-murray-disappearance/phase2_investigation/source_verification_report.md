# Source Verification Report

**Run**: deep-research `full` mode (standalone)
**Date**: 2026-09-28
**Agent**: source_verification_agent (Phase 2, Investigation)

## Overall Assessment

**Sources Reviewed**: 73 (plus one alias entry)
**Verified**: 0 against full text | **Snippet-attested**: 73 | **Flagged**: 21 | **Rejected**: 6 (excluded from the corpus before entry: psychic content, anonymous accusations, an aggregator that misdated the 2021 bone-fragment episode to 2026, and three pages naming uncharged private individuals)

**Headline limitation**: the session's network policy blocked every full-text fetch, and the search budget ran out mid-phase. "Verified" below therefore means "the quoted string appeared in the search-index digest attributed to that URL", not "checked against the page". The report's Limitations section repeats this, and every quotation in the report should be spot-checked against its URL before external use.

## Source Quality Matrix (sources that bear weight in the analysis)

Columns: design level; venue (pass/warn/fail); author or provenance; method (for a news or web source, whether the claim is attributed and dated); currency for the claim; conflicts; overall grade.

| Source | Level | Venue | Author | Method | Currency | COI | Overall |
|--------|-------|-------|--------|--------|----------|-----|---------|
| nhdoj_victimpage | VI | pass | pass | pass | pass | pass | A |
| fbi_vicap2024 | VI | pass | pass | warn (text not read) | pass | pass | A |
| nhsc2006 | VI | pass | pass | pass | pass | pass | A |
| nhdoj_2022search / nhdoj_2024anniv / nhdoj_2019search | VI | pass | pass | warn (summary text) | pass | pass | A |
| globe2004vanishes | VI | pass | pass | warn (digest attribution) | pass (contemporaneous) | pass | A |
| ap2019report / ap2014decade / ap2024sfgate / ap2024fox | VI | pass | pass | pass (AP summaries of official records) | pass | pass | A / A / A / B |
| bostonmag2014 | VI | pass | pass | warn (quote attribution probable) | pass | pass | B |
| newsnation2024 | VI | warn (place-name error) | pass | pass | pass | pass | B |
| concordmonitor2022 / concordmonitor2024photo / bostonglobe2022vicap | VI | pass | pass | pass | pass | pass | B |
| indepthnh2022 / wcax2022search | VI | pass | pass | warn (recurring sentence, outlet not pinned) | pass | pass | B |
| unionleader2026tech / westernmass2026 | VI | pass | pass | pass | pass | pass | B |
| yahoo2026lidar | VI | warn (syndicated video, outlet unconfirmed) | warn | warn | pass | pass | C |
| aetv2025 | VI | warn (date conflict) | pass | warn (single outlet for the drifter lead) | pass | pass | C |
| scarinza2004 | VI | warn (Usenet archive of press) | pass (official speaker) | warn | pass | pass | B |
| strelzin2007 | VI | warn (participant site) | pass (official speaker) | warn | pass | warn (family site) | B |
| nhpr2017notreopened / unionleader2017lingers | VI | pass | pass | pass | pass | pass | B |
| mediapressure_ep5 | VI | warn (family podcast) | pass (transcript reproduction) | warn | pass | warn (participant) | B |
| the107timeline / the107lawsuit | VI | warn (independent research site) | warn | warn (records claimed, not shown) | pass | pass | C |
| nwp2019dogtrack / nwp2020searches | VI | warn (blog) | warn | warn (relays an official's statements) | pass | pass | C |
| oxygen_keytheories / oxygen_aframe / oxygen_reexamined / oxygen2019noremains | VI | warn (entertainment network) | warn | warn | pass | warn (commercial series) | C |
| wikipedia_maura / wikipedia_tca | VII | warn (tertiary) | warn | warn | pass | pass | D |
| renner2016 / renner_londonderry | VI | warn (author with a thesis) | warn | warn | pass | warn (book sales) | C |
| tapatalk_voicemail / tapatalk_marrotte / witnessA_blog / thecoldcases_timeline / truecrimesociety2023 | VI | fail (forum/blog) | fail | fail | pass | warn | D |
| eonline2017 | VI | warn | warn | warn | pass | pass | C |
| largay_nbc / largay_cbs / unionleader2021bones | VI | pass | pass | pass | pass | pass | B |
| nij_lostnotforgotten / nij_violence / ukmpu2023 | VI | pass | pass | pass | pass | pass | B |
| biehal2003 / rothschild1995 / harvey2003 / yardley2018 | VI / VI / III / VI | pass | pass | pass | pass (claim-relative) | pass | A |
| koester2008 / dbs_despondent | VI | warn (practitioner press) | pass | warn (quantiles not retrieved) | pass | warn (author sells the product) | B |
| freund1994 / alcalc1984 / dhami2019 / heuer1999 | VI / VI / III / VII | pass | pass | warn (no snippet for two) | pass | pass | B / C / B / B |

## Flagged Sources (Detail)

#### All 73 sources — snippet-only retrieval
- **Issue**: No full text read; quotations are search-digest strings; attribution of a sentence to a specific URL is the digest's, not a page check.
- **Severity**: High (systemic)
- **Recommendation**: Include, with the limitation stated in the report's Method and Limitations; every report quotation carries a locator so it can be checked.
- **Evidence**: EGRESS_BLOCKED on every fetch attempted (government, news, court, archive, encyclopedia domains).

#### globe2004vanishes
- **Issue**: The two sentences used were attributed to this article by the digest; a second Globe URL appeared in the same result set.
- **Severity**: Medium
- **Recommendation**: Include; label attribution as probable.

#### bostonmag2014 (the "local dirt bag" quotation)
- **Issue**: The quotation circulates across Boston Magazine, CBS Boston (2014) and amateur pages; the originating outlet is not confirmed.
- **Severity**: Low (the words are consistently attributed to Fred Murray in 2014)
- **Recommendation**: Include; cite Boston Magazine as the probable origin.

#### scarinza2004 and strelzin2007
- **Issue**: Official words reproduced by non-official containers (a Usenet archive of 2004 press; the family site quoting the 2007 Union Leader).
- **Severity**: Medium
- **Recommendation**: Include; state the container.

#### newsnation2024
- **Issue**: Places the crash on "Route 11" and gives a different tip-line number from the DOJ.
- **Severity**: Low (errors are peripheral to the quoted family statements)
- **Recommendation**: Include for the family's statements only.

#### aetv2025
- **Issue**: Two search summaries dated the article July 2026, conflicting with its "21 Years Later" headline; sole outlet for the family-relayed "drifter" lead.
- **Severity**: Medium
- **Recommendation**: Include; treat the drifter lead as unverified and single-source; cite the year as 2025 by headline.

#### yahoo2026lidar
- **Issue**: LiDAR and facial recognition are named only in a syndicated broadcast headline; no verbatim official sentence names either technology.
- **Severity**: Medium
- **Recommendation**: Include as "one broadcast reported"; do not attribute the technologies to a named official.

#### indepthnh2022 / wcax2022search (the May 2004 witness-report sentence)
- **Issue**: The sentence recurred across three outlets' coverage; the outlet carrying the exact wording is not pinned.
- **Severity**: Low
- **Recommendation**: Include; cite InDepthNH as probable.

#### the107timeline and the107lawsuit
- **Issue**: Independent research site that claims to reproduce phone records and dispatch logs obtained by records request; the underlying documents were not seen.
- **Severity**: Medium
- **Recommendation**: Use for minute-level times only where an official or mainstream source gives the same fact at coarser resolution; label times as "per the 107 Degrees reconstruction".

#### nwp2019dogtrack and nwp2020searches
- **Issue**: A blog relaying an interview with the 2004 search supervisor; the interview itself was not retrieved.
- **Severity**: Medium
- **Recommendation**: Use for the search-operations picture, attributed as "Bogardus, as relayed by the Not Without Peril blog"; do not use for any claim about a person.

#### mediapressure_ep5
- **Issue**: Family-produced; reproduces the 911 transcript and dispatch log.
- **Severity**: Low for the transcript lines (documentary reproduction), Medium for any interpretation.
- **Recommendation**: Use transcript lines; do not use interpretive framing.

#### oxygen_aframe / oxygen_reexamined / oxygen2019noremains / oxygen_keytheories
- **Issue**: Entertainment network with a commercial interest in unresolved leads; the AG's office said the series contained inaccuracies (nhpr2017notreopened).
- **Severity**: Medium
- **Recommendation**: Use for what the series claimed and for quoted officials; mark the A-frame material as inconclusive and never name the property's occupants.

#### renner2016 / renner_londonderry / wikipedia_tca
- **Issue**: An author with a published thesis and a documented conflict with the family; several quotations attributed to his blog by the digest could not be confirmed and are excluded.
- **Severity**: Medium
- **Recommendation**: Use for his thesis as summarized, and for the affidavit language he reproduces, with attribution; exclude the unconfirmed quotations.

#### tapatalk_voicemail / tapatalk_marrotte / witnessA_blog / thecoldcases_timeline / truecrimesociety2023
- **Issue**: Forum and blog material; some wording tracks Wikipedia; one item names a private witness.
- **Severity**: High
- **Recommendation**: Context only; never sole support; the witness is not named in the report.

#### wikipedia_maura
- **Issue**: Tertiary; could not be read; used for one summary sentence about the Oxygen investigators' conclusion.
- **Severity**: Medium
- **Recommendation**: Include for that sentence only, labelled as a tertiary summary.

#### koester2008 / dbs_despondent
- **Issue**: The despondent-profile distance quantiles were not retrievable; the author sells the reference product.
- **Severity**: Medium
- **Recommendation**: Include for qualitative claims only; the missing quantiles are recorded as a `[MATERIAL GAP]`.

#### alcalc1984
- **Issue**: Author names not captured; attribution of the quoted sentence to this abstract is probable.
- **Severity**: Low
- **Recommendation**: Include with the caveat.

#### An unpinned "two thirds of fatal hypothermia cases were under the influence of alcohol" figure
- **Issue**: Appeared in a search summary with no identifiable source.
- **Severity**: High
- **Recommendation**: Excluded.

#### An unpinned "11.3% mortality" figure for search-and-rescue subjects
- **Issue**: Appeared in a search summary with no identifiable source.
- **Severity**: High
- **Recommendation**: Excluded.

## Predatory Journal Alerts

None. The peer-reviewed sources are in established journals (International Journal of Legal Medicine; Journal of Forensic Sciences; Journal of Wilderness Medicine; Alcohol and Alcoholism; Crime, Media, Culture; Applied Cognitive Psychology).

## Conflict of Interest Disclosures

- Participant sources (the Murray family site and podcast; the boyfriend's family as quoted) have a direct personal stake; used for their positions and for documentary reproductions, not as neutral fact-finders.
- Renner (book sales; documented conflict with the family) and Oxygen (commercial series) have commercial stakes in unresolved leads.
- Koester's reference product is commercial.
- None of these is undisclosed in the sense of the integrity floor; no source is capped at D on integrity grounds.

## Verification Limitations

- Full text could not be retrieved for any source (network policy).
- The search budget was exhausted before follow-up queries could pin several attributions (see the sweep reports' gap lists).
- Dates are those visible in URLs or digests; where a date was inferred from a headline (aetv2025) or from context (the 2018 cadaver-dog visits), the inference is stated.
- No bibliographic-index verification (Semantic Scholar, OpenAlex, Crossref, arXiv) was possible for the peer-reviewed sources; their existence rests on publisher and index listings surfaced by search.

## Overall Source Base Quality

**Assessment**: Adequate for the official record and the family's positions; Mixed for the night-of-crash details (minute-level times and car contents rest on amateur reconstructions of primary records); Weak for the 2004 to 2005 contemporaneous record and for weather.
**Recommendation**: Proceed, with tier discipline enforced in the synthesis and with every conclusion conditioned on the stated retrieval limits.
