# Annotated Bibliography

**Run**: deep-research `full` mode (standalone)
**Date**: 2026-09-28
**Agent**: bibliography_agent (Phase 2, Investigation), consolidating four parallel evidence sweeps (official record and timeline; physical evidence and searches; competing explanations; 2019 to 2026 developments) and one framework sweep (base-rate literature).
**Machine-readable companion**: `corpus.yaml` (74 entries; every `citation_key` used in Phases 3 to 6 resolves there, with URL, tier, grade, and the verbatim snippet strings used as anchors).

## Search Strategy

**Databases**: The session's WebSearch tool only. Google Scholar, Semantic Scholar, OpenAlex, Crossref, and news archives could not be queried directly because the network policy blocked every outbound fetch; the four bibliographic resolvers the suite normally uses were therefore not run.
**Keywords**: "Maura Murray" combined with: timeline, 911, Atwood, Westman, Cecil Smith, Route 112, Haverhill, Fish and Game, dog track, footprints, "Not Without Peril", rag tailpipe, Rausch voicemail, Londonderry, Forcier, Strelzin, Scarinza, Bogardus, Cold Case Unit, ViCAP, age progression, Landaff, Easton, basement, cadaver dog, Oxygen, Renner, "Media Pressure", Julie Murray, Fred Murray, "Missing Maura Murray", Brianna Maitland, LiDAR, 2025, 2026; and framework terms: lost person behavior, despondent, ISRID, hypothermia, terminal burrowing, paradoxical undressing, bloodhound reliability, NamUs, missing persons outcomes, "Lost from View", Analysis of Competing Hypotheses, websleuthing.
**Boolean**: Not supported by the tool; `site:` restriction used for wmur.com, unionleader.com, bostonglobe.com, concordmonitor.com, caledonianrecord.com, cbsnews.com, nbcboston.com, doj.nh.gov, fbi.gov, nij.ojp.gov, en.wikipedia.org.
**Date Range**: 2004-02 to 2026-09-28 for case sources; no lower bound for framework literature.
**Last Searched**: 2026-09-28
**Inclusion Criteria**: (a) reports a checkable fact about the case, an official statement, or a participant's stated position; or (b) peer-reviewed or institutional evidence on a reference class used in the analysis. A source enters at its tier; tiers 1 to 3 may support facts alone; tiers 4 to 5 support facts about their own author's position and, for other facts, only with corroboration; tiers 6 supports base rates; tier 7 is context only and never the sole support for a factual claim in the report.
**Exclusion Criteria**: psychic and paranormal content; anonymous forum speculation naming private individuals; content whose only function is to accuse an uncharged person; pages that could not be located by URL.
**Coverage Distribution Advisory**: `DISTRIBUTIONAL_SKEW_ADVISORY` — 100% of sources were retrieved snippet-only (no full text); 0% of case sources are peer-reviewed; official and mainstream-journalism sources make up roughly half of the corpus, participant and documentary sources a quarter, and amateur or independent-research sources a quarter. The skew toward retrospective (2014 to 2026) reporting over contemporaneous (2004 to 2005) reporting is large: only one 2004 news article and one 2005 student-press article were located.

## PRISMA-style Flow

- Queries executed: 200 (session budget), of which roughly 30 in the framework sweep and roughly 170 across the four case sweeps.
- URLs surfaced in result sets: several hundred (not counted precisely by the tool).
- URLs screened for relevance and tier: about 250.
- Entered into the corpus: 74 (one alias entry).
- Cited in the final report: see the References section of `REPORT.md`.
- Full-text retrieved: 0 (network policy).

## Sources by Theme

Format: citation_key — citation. Relevance. Key findings as retrieved. Quality: design level / tier / grade.

### Theme 1: The official record

- nhdoj_victimpage — New Hampshire Department of Justice, Cold Case Unit. (n.d.). *Maura Murray* (victim list page). Relevance: the state's own statement of the case. Key findings: single-car accident on Route 112; police "found no trace of Maura"; a private citizen spoke with her shortly before police arrived; the unit "continues to actively investigate the suspicious disappearance". Quality: VI / tier 1 / A.
- fbi_vicap2024 — Federal Bureau of Investigation, ViCAP. (2024). *Maura Murray, Haverhill, New Hampshire* (missing-person alert, document dated 2024-02-05). Relevance: federal alert; physical description; the statement that she "did not share with others her pending trip". Quality: VI / tier 1 / A.
- nhdoj_2019search; bostoncom2019 — NH DOJ (2019) briefing announcement and Boston.com (2019-04-03) coverage of the April 3, 2019 inspection of a home near the crash site. Key findings: consensual search with FBI; concrete cut where radar showed a disturbance; only pottery or old piping found; no probable cause; radar had detected disturbed ground, not a body. Quality: VI / tiers 1 and 2 / A and B.
- nhdoj_2022search; wcax2022search; indepthnh2022 — NH DOJ (2022-07-12) release and July 13, 2022 coverage of the Landaff and Easton ground search. Key findings: not the result of new information; a more extensive search of areas previously searched in a more limited fashion; tied to a May 2004 witness report of a young person "moving quickly" that night. Quality: VI / tiers 1 and 2 / A and B.
- nhdoj_2024anniv; concordmonitor2024photo — NH DOJ (2024-02-09) release and Concord Monitor coverage of the FBI age-progression image. Key findings: "suspicious disappearance"; issuance "not based on a change in the investigative posture of this case or new information"; case added to the Cold Case Unit in 2009. Quality: VI / tiers 1 and 2 / A and B.
- nhdoj_2025expansion; caledonian2025expansion — NH DOJ (2025-08) and Caledonian-Record (2025-08-05). Key findings: Cold Case Unit investigators increased from one part-time to two full-time posts, with further additions in October 2025. Quality: VI / tiers 1 and 2 / A and B.
- nhsc2006; the107lawsuit — Supreme Court of New Hampshire (2006-12-20), *Murray v. N.H. Division of State Police*, 154 N.H. 579; and the 107 Degrees summary of the remand. Key findings: the attorney general denied nearly all of the father's records requests as investigatory; the court held the agencies had not met their burden and remanded; the Superior Court denied the request on remand by order of June 11, 2007. Quality: VI / tiers 1 and 7 / A and C.
- strelzin2007 — Strelzin, J. (2007), as quoted on the Murray family site. Key findings: "the state is treating it as a potential homicide"; "handled as a criminal investigation"; "difficult to rule anyone out". Quality: VI / tier 4 / B.
- scarinza2004 — Scarinza, J. (2004), archived press statements. Key findings: "reasonably confident that she did not enter the woods near the accident scene"; "no evidence to suggest the cases are related" (Maitland). Quality: VI / tier 2 / B.
- nhpr2017notreopened; unionleader2017lingers — NHPR (2017-11-02) and Union Leader (2017-02-10). Key findings: the case "was never closed"; the AG's office noted inaccuracies in the Oxygen series; "We still don't know what happened to Maura". Quality: VI / tier 2 / B.
- bostonglobe2022vicap; concordmonitor2022 — Boston Globe (2022-01-18) and Concord Monitor (2022-01-25). Key findings: ViCAP entry and alert at the request of the NH Attorney General's office. Quality: VI / tier 2 / B.
- unionleader2026tech; yahoo2026lidar; westernmass2026 — Union Leader (2026-02-08), a broadcast segment hosted on Yahoo (2026-02), Western Mass News (2026-02-09). Key findings: Cold Case Unit chief Knowles: "actively utilizing new technology and advanced investigative techniques"; LiDAR and facial recognition named by one broadcast only. Quality: VI / tiers 2 and 3 / B and C.

### Theme 2: The night of February 9, 2004 and the physical evidence

- globe2004vanishes — Boston Globe (2004-02-15), "A student vanishes, and questions mount". Key findings: searchers covered nearly 20 miles of Route 112; no footprints in the snow; "tracking dogs lost her scent within 100 feet of the accident". Quality: VI / tier 2 / A.
- ap2019report — AP via NHPR (2019-02-09). Key findings: police report: windshield cracked on the driver's side, both airbags deployed, car locked; box of wine on the back seat; strong odor of alcohol. Quality: VI / tier 2 / A.
- ap2014decade — AP via CBS Boston (2014-02). Key findings: eastbound, struck a tree, spun to face west; investigators said she withdrew money and drove north. Quality: VI / tier 2 / A.
- ap2024sfgate; ap2024fox — AP via SFGate and Fox (2024-02). Key findings: 2023 court-document photographs show roof stains an analyst noted were not blood; she was "shivering" and not wearing a hat. Quality: VI / tier 2 / A and B.
- mediapressure_ep5 — Media Pressure, Episode 5 transcript (2024). Key findings: Atwood's 911 call at 7:42 routed to Hanover dispatch; callback at 7:43; "No blood that I could see"; "shook up". Quality: VI / tier 4 / B.
- aetv2025 — A&E (2025). Key findings: Atwood account ("No, please don't. I already called AAA."); no cell reception; family private investigator; the family-relayed "drifter" lead; DOJ declined comment. Quality: VI / tier 3 / C.
- the107timeline — 107 Degrees timeline (n.d.). Key findings: 12:55 PM call to a Bartlett condo owner; 2:05 PM call to a Stowe tourism line; 4:37 PM last call (voicemail); dispatch 7:29; Smith's arrival 7:45 (his report) or 7:46 (dispatch). Quality: VI / tier 7 / C.
- nwp2019dogtrack; nwp2020searches — Not Without Peril blog (2019-07-08; 2020-12-12). Key findings: bloodhound run twice on the morning of Feb 11, roughly 39 to 40 hours after the crash, from a glove; headed east and stopped within sight of the scene; Bogardus on FLIR, footprints, and five 2004 searches covering 12 miles of road and 1 to 2 miles into the woods. Quality: VI / tier 7 / C.
- thecoldcases_timeline; tapatalk_marrotte; truecrimesociety2023; eonline2017 — amateur and entertainment sources. Key findings: wine box on the passenger seat (conflicts with the AP police-report summary); neighbors saw her walking around the car with hazard lights on; cards and phone never located or used; $280 withdrawal and $40 alcohol purchase. Quality: VI / tiers 3 and 7 / C and D.
- renner_londonderry; tapatalk_voicemail — Renner blog and a forum thread. Key findings: the "Londonderry ping" concerns an inbound caller's tower, not her phone; the Feb 11 voicemail to the boyfriend was a whimpering sound that police attributed to a Red Cross calling-card call. Quality: VI / tiers 5 and 7 / C and D.
- witnessA_blog — Maura Murray Timeline blog (n.d.). Key findings: a motorist's account of a police SUV nose-to-nose with a dark sedan before the responding officer's logged arrival; contradicted by dispatch-log reproductions. Quality: VI / tier 7 / D.

### Theme 3: Participants' positions

- bostonmag2014 — Boston Magazine (2014-01-28). Key findings: emails about a death in the family; Fred Murray: "I think some local dirt bag grabbed her." Quality: VI / tier 2 / B.
- newsnation2024; cbsboston2024podcast; nbcboston2024; nbcboston2021; nbcboston2019basement; bostonglobe2019dig; unionleader2019hurts — family statements 2019 to 2024. Key findings: the family's consensus is foul play; what she took "indicated that she planned to return"; frustration with the Cold Case Unit; the 2019 basement lead and its collapse. Quality: VI / tier 2 / B.
- dailycollegian2005 — Daily Collegian (2005-01). Key findings: early family anger over the investigation. Quality: VI / tier 2 / C.

### Theme 4: Documentary, book and podcast treatments

- oxygen_keytheories; oxygen_aframe; oxygen_reexamined; oxygen2019noremains; wikipedia_maura — Oxygen companion articles (2017 to 2019) and a tertiary summary. Key findings: retired NHSP lieutenant Healy: "crime of opportunity"; cadaver-dog alert and blood-positive wood chips at an A-frame (degraded, inconclusive); officials on the 2019 basement: "nothing there"; the series' investigators concluded she was probably murdered. Quality: VI / tiers 3 and 7 / C and D.
- renner2016; wikipedia_tca — Renner (2016) and the tertiary summary of its thesis and reception. Key findings: tandem driver and intentional disappearance; family refused cooperation; controversy. Quality: VI / tiers 5 and 7 / C and D.
- crimecon_mmm — CrimeCon page on the Missing Maura Murray podcast. Key findings: began as a documentary about "armchair detectives"; inspired the Oxygen series. Quality: VI / tier 5 / C.

### Theme 5: Analogues

- largay_nbc; largay_cbs — NBC News (2016) and CBS Boston. Key findings: Geraldine Largay's remains were found more than two years after she vanished, two miles from the Appalachian Trail, after an extensive search. Quality: VI / tier 2 / B.
- unionleader2021bones — Union Leader (2021). Key findings: bone fragments found at Loon Mountain were centuries old. Quality: VI / tier 2 / B.

### Theme 6: Base-rate and method literature

- nij_lostnotforgotten; nij_violence; ukmpu2023; biehal2003 — missing-person outcomes: most found within days and alive; violence documented in about 10% of NamUs cases; most go missing intentionally, briefly. Quality: VI / tier 6 / A and B.
- koester2008; dbs_despondent — lost-person behaviour and the despondent profile. Quality: VI / tier 6 / B.
- rothschild1995; freund1994; alcalc1984 — hypothermia forensics: terminal burrowing; paradoxical undressing in 25% of a 69-case series; alcohol as a risk factor. Quality: VI / tier 6 / A to C.
- harvey2003 — bloodhound reliability on 48-hour trails. Quality: III / tier 6 / A.
- heuer1999; dhami2019 — Analysis of Competing Hypotheses and its evaluation. Quality: VII and III / tier 6 / B.
- yardley2018; wdtn_socialmedia — websleuthing and the "social media age" framing. Quality: VI / tiers 6 and 3 / A and C.

## Search Limitations

- No full text of any source was read; every quotation is a search-index snippet string (see `source_verification_report.md`).
- The 2004 to 2005 contemporaneous record is thin in the corpus (one Boston Globe article located by digest; the Union Leader, Caledonian-Record and Whitman-Hanson Express 2004 reporting were not surfaced).
- The FBI ViCAP alert text, the Atwood 911 transcript PDF, the Haverhill Police press release, the 2006 opinion's full text, and the NH DOJ releases were identified but not readable.
- Weather observations for 2004-02-09 were not obtained.
- Despondent-category distance quantiles from Koester (2008) were not obtained.
- The session's search budget was exhausted before roughly 70 planned follow-up queries could run; the four sweep reports list them.
