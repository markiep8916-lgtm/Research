# Phase 2 working notes — framework (base-rate) sweep

Executed by the main session on 2026-09-28 via WebSearch only (WebFetch blocked by network policy; session search budget exhausted at 200 queries, roughly 30 of them in this sweep).
Quotes below are verbatim strings taken from search-index snippets ("snippet-verbatim"). They were not checked against the full page. Source type is in brackets.

## A. Missing-person outcome base rates

- NIJ, "Lost but Not Forgotten: Finding the Nation's Missing" (nij.ojp.gov/topics/articles/lost-not-forgotten-finding-nations-missing) [official]
  - snippet-verbatim: "Of the 12,621 missing person cases in NamUs that have been resolved, 9,584 (76 percent) were located alive, and 3,037 (24 percent) were found to be deceased."
  - snippet-verbatim: "About 75 percent of missing adults are found within 24 to 72 hours."
  - snippet-verbatim: "NamUs considers cases greater than 180 days as 'long-term.'" (NamUs FAQ, namus.nij.ojp.gov)
- NIJ, "How Prevalent is Violence in Missing and Unidentified Persons Cases?" (nij.ojp.gov/topics/articles/how-prevalent-violence-missing-and-unidentified-persons-cases) [official]
  - snippet-verbatim: "the level of violence in the database was lower than expected, at about 10% of all missing persons cases."
  - snippet-verbatim: "researchers verified that most missing persons cases were resolved with the missing person found alive."
- UK National Crime Agency, UK Missing Persons Unit, Missing Persons Data Report 2022/23 (nationalcrimeagency.gov.uk/images/mpu/downloads/UKMPU%20Annual%20Data%20Report%202022-23.pdf) [official]
  - snippet-verbatim: "88.3% of missing people being found within the first 48 hours in England & Wales"
  - snippet-verbatim: "0.30% of missing incidents resulted in a fatal outcome (971 deaths)"
- Biehal, Mitchell & Wade (2003), Lost from View: Missing Persons in the UK (york.ac.uk/inst/spru/research/pdf/lostFromView.pdf) [peer-reviewed research monograph]
  - snippet-verbatim: "Most people go missing intentionally, to escape family or other problems, but others may not make a deliberate decision."
  - snippet-verbatim: "Based on almost 2000 missing persons cases"

## B. Lost-person behaviour

- Koester, R. J. (2008). Lost Person Behavior (dbS Productions). ISRID database. [practitioner reference book built on incident data]
  - socialsciencespace.com 2024 interview [journalism]: snippet-verbatim: "data from more than 145,000 searches from around the world"
  - d4h.com blog: snippet-verbatim: "over 150,000 SAR incidents have been collected as part of the project"
  - dbs-sar.com "Despondent Behavioral Profile" (dbs-sar.com/SAR_Research/despondent.htm) [practitioner]: snippet-verbatim: "in the Virginia database this type of search accounts for 14% of missing person searches reported"; snippet-verbatim: "These subjects often have set out into the woods in order to commit suicide, few are truly lost, but many are in critical condition"
  - Koester provides 25/50/75/95% quantiles of distance from the initial planning point per category (Sava et al. 2015, "Evaluating Lost Person Behavior Models", Transactions in GIS; geoinf.psu.edu PDF) — numeric quantiles for the despondent category were NOT retrievable in this session. [MATERIAL GAP]
  - A mortality figure ("significant mortality (11.3%) and morbidity (14.3%)") appeared in a search summary without a pinned source. Not usable. [MATERIAL GAP]

## C. Hypothermia forensics and alcohol

- Rothschild, M. A., & Schneider, V. (1995). "Terminal burrowing behaviour" — a phenomenon of lethal hypothermia. International Journal of Legal Medicine, 107(5), 250-256. (link.springer.com/article/10.1007/BF01245483; PubMed 7632602) [peer-reviewed]
  - snippet-verbatim: "69 cases of death due to lethal hypothermia between 1978 and 1994"
  - snippet-verbatim: "paradoxical undressing occurred in 25% of the cases"
  - snippet-verbatim: "Nearly all bodies with partial or complete disrobement were found in a position which indicated a final mechanism of protection"
  - snippet-verbatim: "occurred predominantly with slow decreases in temperature and moderately cold conditions"
- Freund, B. J., O'Brien, C., & Young, A. J. (1994). Alcohol ingestion and temperature regulation during cold exposure. Journal of Wilderness Medicine, 5(1), 88-98. (journals.sagepub.com/doi/10.1580/0953-9859-5.1.88) [peer-reviewed]
  - no verbatim snippet captured beyond the title.
- "Fatal accidental hypothermia and alcohol", Alcohol and Alcoholism 19(1), 13-22 (1984) (academic.oup.com/alcalc/article-abstract/19/1/13/111379) [peer-reviewed]
  - snippet-verbatim (attribution to this abstract is probable, not confirmed): "a blood alcohol concentration of over 2.5 mg/ml had often been found in people in their forties and fifties who had died from hypothermia"
- Unpinned: "About two thirds of fatal accidental hypothermia cases in northern Sweden were under the influence of alcohol with a mean blood alcohol concentration of 1.6 g/l" — source not identified in results. [MATERIAL GAP; do not cite]
- Livescience 2013 popular summary (livescience.com/41730-hypothermia-terminal-burrowing-paradoxical-undressing.html) [journalism]: usable only as a pointer.

## D. Scent-trailing reliability

- Harvey, L. M., & Harvey, J. W. (2003). Reliability of bloodhounds in criminal investigations. Journal of Forensic Sciences, 48(4), 811-816. (dl.astm.org/jofs/article-abstract/48/4/1/23719; PubMed 12877298) [peer-reviewed]
  - snippet-verbatim: "Eight bloodhounds (3 novice and 5 veteran), trained in human scent discrimination, were placed on trails"
  - snippet-verbatim: "after 48 hours the dogs were cued with scent collected from various parts of the trail-setter's body and required to follow the trail"
  - snippet-verbatim: "a veteran bloodhound can trail and correctly identify a person under various conditions"
  - snippet-verbatim: "the potential error rate of a veteran bloodhound-handler team is low"
- Practitioner claims about scent surviving in snow/cold (lostpetresearch.com, missinganimalresponse.com) [amateur/practitioner]: not peer-reviewed; use only as context.

## E. Analytic method

- Heuer, R. J. (1999). Psychology of Intelligence Analysis, ch. 8 "Analysis of Competing Hypotheses". CIA Center for the Study of Intelligence. [institutional]
  - snippet-verbatim (as reproduced on the SANS ISC diary isc.sans.edu/diary/22460 and Wikipedia "Analysis of competing hypotheses"): "Some evidence will have greater 'diagnosticity' than other evidence"
  - Steps as summarized: identify hypotheses; list evidence for and against; matrix; assess diagnosticity; refine; rank by least disconfirming evidence.
- Dhami, M. K., et al. (2019). The "analysis of competing hypotheses" in intelligence analysis. Applied Cognitive Psychology 33(6). (onlinelibrary.wiley.com/doi/full/10.1002/acp.3550) [peer-reviewed; evaluation of ACH]

## F. Web-sleuthing and the record

- Yardley, E., Lynes, A. G. T., Wilson, D., & Kelly, E. (2018). What's the deal with 'websleuthing'? News media representations of amateur detectives in networked spaces. Crime, Media, Culture, 14(1), 81-109. (open-access.bcu.ac.uk/5750/) [peer-reviewed]
  - snippet-verbatim: "Research around websleuthing is somewhat thin on the ground"
- WDTN, "'First crime mystery of the social media age' still unsolved" (wdtn.com) [journalism]: snippet-verbatim: "first crime mystery of the social media age"

## G. Case-specific items captured incidentally in this sweep (to be merged with the four evidence sweeps)

- Oxygen, "What Happened To Maura Murray? Key Theories And Players" (oxygen.com/the-disappearance-of-maura-murray/blogs/what-happened-to-maura-murray-key-theories-and-players) [documentary outlet]: snippet-verbatim: John Healy, retired state police lieutenant, "She got into the wrong car. She went to the wrong house." and "crime of opportunity" (Healy quoted via MassLive).
- NBC Boston, "Man Believes Missing Daughter is Buried in NH Basement" (nbcboston.com/news/local/man-believes-missing-daughter-is-buried-in-nh-basement/2362/), August 2019 [journalism]: snippet-verbatim: "It's my daughter, I want to bring her home and bury her, and then I want to find the dirtbag that put her there."
- Strelzin (NH AG's office), 2007, as quoted on mauramurraymissing.org statement page and in CBS Boston 2014 coverage [official statement via family site/journalism]: snippet-verbatim: "We don't know if Maura is a victim, but the state is treating it as a potential homicide"; snippet-verbatim: "it's difficult to rule anyone out until you know what happened."
- Dog track: multiple outlets (CBS Boston cbsnews.com/boston/news/maura-murray-missing-investigation-north-haverhill-search/; Cassian Creed timeline; Wikipedia) [journalism/amateur]: snippet-verbatim: "The dogs picked up her scent for about 100 yards, leading investigators along the road to an area between two homes." (attribution to a specific outlet not pinned; the CBS Boston URL was in the same result set)
- A&E, "21 Years Later, Maura Murray's Family Still Seeks Answers" (aetv.com/articles/21-years-after-maura-murray-went-missing-her-family-still-seeks-answers), 2025 [journalism]: snippet-verbatim: Atwood account "No, please don't. I already called AAA. They're sending a tow truck."; snippet-verbatim: "There was no cell phone reception in the foothills of the White Mountains"
- Oxygen key-theories page or allthatsinteresting.com [documentary outlet/journalism]: snippet-verbatim: Atwood "called 911 and reported that Murray appeared to be alone after the car accident, cold and possibly drunk."
- Private investigator hired by the family (quoted in a Medium retelling, 2026; low tier): snippet-verbatim: "No footprints were even found in the snow" and "Luckily there hadn't been any fresh snowfall in those two days" — needs a mainstream attestation.
- Car contents list (web-sleuth blog notwithoutperil.com; low tier): "Not Without Peril" book, AAA card, blank accident report forms, gloves, CDs, makeup, diamond jewelry, directions to Burlington Vermont, stuffed animal — needs mainstream attestation.
- Wikipedia "Disappearance of Brianna Maitland" [tertiary]: snippet-verbatim: "FBI agents met with local authorities to discuss possible links between the two cases" and "it was eventually concluded that despite the similarities, the cases were likely not connected."
- CBS Boston, "Remains found by New Hampshire hunter in 1996 identified as man who left home to go for a walk and never returned" (cbsnews.com/amp/boston/news/remains-found-new-hampshire-hunter-1996-benjamin-adams) [journalism]: Benjamin Adams, 78, dementia, missing June 1991 from Canaan NH; remains found by a hunter November 1996 in Hanover "nearly 20 miles away"; identified by DNA decades later.
- Nicola Bulley (UK, 2023) [journalism; Wikipedia]: snippet-verbatim: "An extensive search of the river and surrounding land involving police divers, helicopters, sniffer dogs and drones found no body." Body found 19 Feb 2023 "about one mile (1.5 kilometres) downstream" by walkers; inquest: accidental drowning.
- Concord Monitor, 2022-01-25, "FBI alert in Murray case came at request of AG" (concordmonitor.com/2022/01/25/...) [journalism]: an FBI alert on the case was issued in January 2022 at the request of the NH Attorney General's office.
- Weather 2004-02-09: no meteorological record retrieved. NWS Gray, Maine monthly hydrologic observations February 2004 PDF exists (weather.gov/media/gyx/climo/rr6feb04.pdf) but could not be fetched. [MATERIAL GAP]
