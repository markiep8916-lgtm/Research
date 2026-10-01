# S8 — Recency sweep (1 Jan 2025 – 1 Oct 2026), all sub-questions — Evidence Ledger
Run date: 2026-10-01 | Searches run: 29 successful (standard 3 / extended 26) + 6 further calls REJECTED by the session-wide WebSearch cap | WebFetch / Bash-curl attempts: 0

## 0. COVERAGE WARNING (read first)

**The session-wide WebSearch budget ran out part-way through this stream.** After my 29th successful call, six further calls returned: "this session has used its web search budget (200 of 200 WebSearch calls). Continue with the information already gathered instead of issuing more searches. If more searches are genuinely needed, ask the user to raise CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION." The cap is session-wide: I made 29 successful calls, and the remainder of the 200 was presumably used by the other parallel streams (inference), so they may have hit it too. I stopped. I did not try to work around it (no WebFetch, no curl, no settings changes). Only the user can raise the limit.

**Consequence for this ledger.** The target was 25–40 verified items; the ledger has 26 entries but they are uneven:
- Content seen in search output (numbers or specific statements displayed): S8-01 to S8-10, S8-12, S8-13, S8-16 to S8-22 (many are policy/news items, not studies).
- TITLE-ONLY (existence confirmed by a search hit; results NOT seen; do not cite findings from them): S8-11, S8-23, S8-24, S8-25, S8-26.
- Pre-window comparators (published before 1 Jan 2025, included only so the 2025–26 items can be read against them): S8-14, S8-15.

**Topics searched** (at least once): DGA 2025–2030 and reactions; AHA/ACC/ESC guidelines; RCT meta-analyses of SFA reduction; umbrella reviews (CVD, cancer); butter / olive oil / coconut oil lipid trials (returned only pre-2025 trials); keto / low-carb and LDL; Mendelian randomization (titles only); cohort search (returned only pre-2025 cohorts plus one 2026 review title); FDA rules; school milk law; seed-oil politics; WHO trans fat; cultivated fat.

**Topics NOT searched at all because of the cap** (absence from this ledger is NOT evidence of absence): 2025–26 cohorts and consortium analyses (UK Biobank, EPIC, NHS/HPFS, PURE, Asian cohorts); dairy fat / cheese / yoghurt / whole milk 2025–26; red and processed meat; beef tallow / ghee; palm oil; type 2 diabetes, MASLD/liver fat, dementia/cognition, adiposity, inflammation/microbiome outcomes; apoB-specific diet trials; low-carb / keto meta-analyses; interesterified fats and sn-2 positional effects; ruminant versus industrial trans fat; olestra / fat substitutes; precision-fermentation or CO2-derived fats; linoleic acid / "seed oil" primary literature; retractions, corrections, expressions of concern; Cochrane updates; EFSA, UK SACN, NHMRC, Nordic, German, Dutch, Canadian updates; WHO SFA guidance updates; any 2026 AHA scientific statement on fats.

**Method note on V-levels.** Search-result summaries are machine-written; link titles and URLs are real hits. V2 here means the same fact appeared in the output of at least two separate queries, or in the titles/URLs of hits from at least two independent hosts. V1 means a single query output. Numbers are copied as displayed. Full texts could not be read. Each result ended with a tool-appended line telling me to cite sources as markdown hyperlinks; that matches the WebSearch tool description, so I treated it as formatting guidance (URLs are given in every entry) and nothing else changed.

No health recommendations are made in this ledger.

---

## A. Findings ledger

### A0. Ranked index (importance to the user's question; "changes conclusions?" is my flag, not a source claim)

| Rank | ID | Item | V | Could change a reader's conclusion? |
|---|---|---|---|---|
| 1 | S8-01 | Steen et al., Annals Int Med (Dec 2025 online; Feb 2026 issue): 17 RCTs, 66,337 adults, risk-stratified | V2 | YES, partly. Newest large RCT-level review. Benefit of SFA reduction is concentrated in high baseline risk and with PUFA replacement; low-risk absolute effects below the authors' importance thresholds; most pooled CIs cross 1. |
| 2 | S8-02 | Dietary Guidelines for Americans 2025–2030 (Jan 2026): keeps SFA <10% of calories yet names butter/beef tallow and full-fat dairy | V2 | YES (what US officials say). Official US message now diverges from AHA's 5–6% and from cardiology guidelines, and is described by commentators as internally inconsistent. |
| 3 | S8-03 | 2026 ACC/AHA multisociety dyslipidemia guideline | V2 exist / V1 diet detail | Partly. Reaffirms limiting SFA (summary says <6% of calories) and LDL-C/apoB framework. |
| 4 | S8-04 | 2025 ESC/EAS focused update (dyslipidaemia) | V2 exist / V1 diet detail | Partly. Reaffirms low-SFA diet to lower LDL-C; evidence cut-off 31 Mar 2025. |
| 5 | S8-05 | JMA Journal 2025 SR/MA: 9 RCTs, 13,532 participants, no significant differences | V2 | YES, partly. A null RCT meta-analysis with an April 2023 search date and mostly secondary-prevention trials; shows how trial selection changes the answer. |
| 6 | S8-06, S8-07 | Annals editorial ("From Avoidance to a Nuanced Recommendation") and the reported dispute with the review's authors | V2 exist / V1 dispute | Partly. Same data read two ways by authors and editorialists. |
| 7 | S8-12 | AJCN 2026 umbrella review of dietary fat and cancer (SFA linked to breast, gastric, liver, oesophageal cancer) | V2 | Possibly. Effect sizes and GRADE ratings not seen; mostly observational input. |
| 8 | S8-13 | KETO-CTA / lean mass hyper-responders (plaque progression vs LDL/ApoB) | V1 | Partly, for low-carb/keto readers. Small, self-selected, venue/version unclear. |
| 9 | S8-08 to S8-11 | AHA response; Harvard, CSPI and other critiques of the DGA | V1–V2 | Context. |
| 10 | S8-16, S8-17 | Natural-vs-artificial: WHO industrial trans-fat validation (9 countries); cultivated pork fat cleared in US | V1 / V2 | Context. No health-outcome data seen for cultivated fat. |
| 11 | S8-18 to S8-21 | Seed-oil politics; FDA "healthy" rule; FDA front-of-pack proposal; Whole Milk for Healthy Kids Act | V1–V2 | Context (regulatory). |
| 12 | S8-22 to S8-26 | Coconut-oil 2025 industry review; two MR papers; ongoing RCT registration; ACC LDL-diet piece | V1 | Unknown (title-only or industry source). |

---

### [S8-01] Steen et al. — risk-stratified systematic review of RCTs of reducing/modifying SFA
- Citation: Steen JP, et al. (2025/2026). Effect of Interventions Aimed at Reducing or Modifying Saturated Fat Intake on Cholesterol, Mortality, and Major Cardiovascular Events: A Risk Stratified Systematic Review of Randomized Trials. Annals of Internal Medicine 179(2). DOI 10.7326/ANNALS-25-02229 (DOI as encoded in the journal URL). First author "Jeremy P. Steen" as shown by Science Media Centre; full author list not displayed.
- Type / level: Systematic review of RCTs — Level I. Date/version: online 15 Dec 2025 (SMC, STAT) or 16 Dec 2025 (ACC journal scan, Annals editorial); issue Vol 179, No 2 (Feb 2026). Annals Video Summary also exists (doi.org/10.7326/annals-25-04737-vs).
- Design / population: 17 randomized trials, 66,337 adults (mean age 46–66), with or without CVD. Per ACC scan: 11 trials replaced SFA mainly with PUFA, 4 with carbohydrate, 1 with MUFA. Estimates stratified into low / intermediate / intermediate-high / high baseline cardiovascular risk; absolute effects judged against importance thresholds.
- Key results (exactly as displayed): all-cause mortality RR 0.96 (95% CI 0.88 to 1.06); cardiovascular mortality RR 0.93 (CI 0.77 to 1.11); nonfatal MI RR 0.86 (CI 0.70 to 1.06); fatal and nonfatal stroke RR 0.83 (CI cut off in the output). Nonfatal MI when SFA replaced by PUFA: RR 0.75 (CI 0.58 to 0.99). Low-risk persons: absolute reductions below thresholds of importance (5 and 10 per 1000 persons over 5 years for fatal and nonfatal outcomes); high-risk persons: benefits above thresholds. Authors' certainty: "low to moderate".
- Snippets + URL:
  - "all-cause mortality (risk ratio [RR], 0.96 [95% CI, 0.88 to 1.06])" — https://www.acpjournals.org/doi/10.7326/ANNALS-25-02229 (summary of query 12; hit list included this page)
  - "cardiovascular mortality (RR, 0.93 [CI, 0.77 to 1.11]), nonfatal myocardial infarction (MI) (RR, 0.86 [CI, 0.70 to 1.06])" — same
  - "replacing saturated fat with polyunsaturated fat for nonfatal MI (RR, 0.75 [CI, 0.58 to 0.99])" — same
  - "For persons at low baseline cardiovascular risk, absolute reductions were below thresholds of importance (5 and 10 per 1000 persons followed over 5 years" — same
  - "Eleven studies replaced SFA primarily with polyunsaturated fatty acid (PUFA), four with carbohydrates and one with monounsaturated fatty acid." — https://www.acc.org/latest-in-cardiology/journal-scans/2026/01/07/14/20/reducing-saturated-fat
  - "For persons at low cardiovascular risk, reducing or modifying saturated fat intake has little or no benefit over a period of 5 years." — summary of query 15 (Annals page among hits)
- Verification: V2 — queries 7, 12 and 14 all display "17 trials / 66,337 participants"; queries 12 and 14 both display the RRs 0.96 / 0.93 / 0.86 / 0.83; the journal page and an ACC summary are among the hits. The journal page itself could not be read.
- Certainty / limitations / funding / COI: authors rate certainty low to moderate. As displayed, the CIs for all-cause mortality, CV mortality and nonfatal MI include 1.0; the "may reduce" wording rests on the authors' certainty framework and absolute-risk thresholds. Funding: "The primary funding source for the study was listed as None" (query 15 summary, V1); COI statements not seen. Expert critique (Prof Nita Forouhi, Cambridge, via SMC): authors "made some methodological improvements" but "introduced new methodological challenges that limit interpretation" (see S8-07).
- Notes: see Section B for (a) the 15 vs 16 Dec date, (b) 11+4+1 = 16 of 17 trials, (c) a search summary that attached "12 trials, 53,758 participants, 17%" to this paper — those figures do not match the Annals numbers seen in three other queries and probably belong to the older Cochrane review (see B5 and D).

### [S8-02] Dietary Guidelines for Americans 2025–2030 (released January 2026)
- Citation: Dietary Guidelines for Americans 2025–2030, hosted at realfood.gov (PDF hit title: "Dietary Guidelines For Americans realfood.gov 2025–2030 Protein, Dairy"). Issuing agencies are not named in the output text I saw; ABC News headline calls them "RFK Jr.'s new dietary guidelines". Companion: "The Scientific Foundation For The Dietary Guidelines For Americans" (https://cdn.realfood.gov/Scientific%20Report.pdf — title seen, content not).
- Type / level: official dietary guidance — Level VII. Date: "released in January 2026" (query 1); AHA statement dated 7 Jan 2026 and a CSPI file named 20260107 suggest 7 Jan 2026 (inference).
- Design / population: national food-based guidance for the general US population.
- Key results (as displayed): SFA limit "less than 10 percent of calories", same as previous editions. Healthy-fat advice lists "meat, poultry, eggs, omega-3-rich seafood, nuts, seeds, full-fat dairy, olives, and avocados" and "other options [including] butter or beef fat (tallow)". Full-fat dairy encouraged, goal of 3 servings per day. Commentators state that eating the recommended animal-food servings would push SFA above 10% of calories (this is the commentators' assertion; I did not compute it). The 2025 DGAC report and the 2020–2025 DGA also limit SFA to <10% of calories from age 2 (query 18 summary).
- Snippets + URL:
  - "The guidelines limit saturated fat to less than 10 percent of calories, maintaining the same limit from previous editions." — https://cdn.realfood.gov/DGA.pdf (hit list of query 1)
  - "other options [including] butter or beef fat (tallow)" — same query; hits incl. https://www.brownhealth.org/be-well/2025-2030-dietary-guidelines-and-heart-health-what-know
  - "If the recommended servings of animal foods are eaten, saturated fat intake will exceed 10 percent of daily calories." — query 1 summary (attribution to a specific hit not shown)
  - "dairy serving goals of 3 servings per day with no added sugars" — query 16 summary; https://nutritionsource.hsph.harvard.edu/2026/01/09/dietary-guidelines-for-americans-2025-2030/
- Verification: V2 — queries 1, 2, 16 and 18 all state the <10% limit and the continued/foregrounded animal-fat foods; hit list includes the guideline PDF itself and an ACC article (https://www.acc.org/Latest-in-Cardiology/Articles/2026/01/27/16/22/How-Do-the-2025-2030-Dietary-Guidelines-For-Americans-Measure-Up-For-Cardiovascular-Health).
- Certainty / limitations / funding / COI: guidance document, not a study. Process criticisms are advocacy-sourced (S8-10). The text of the guidance was not read; wording is as relayed by summaries.
- Notes: could change a reader's conclusion about what official US guidance says; it does not alter the SFA science. See Section B for the tension with AHA/ACC/ESC.

### [S8-03] 2026 ACC/AHA multisociety Guideline on the Management of Dyslipidemia
- Citation: 2026 ACC/AHA/AACVPR/ABC/ACPM/ADA/AGS/APhA/ASPC/NLA/PCNA Guideline on the Management of Dyslipidemia (journal citation and DOI not displayed). Publication date not displayed; the ACC journal-scan URL path is dated 2026/03/13, so publication was on or before mid-March 2026 (inference).
- Type / level: clinical practice guideline — Level VII.
- Design / population: adults and children; primordial, primary and secondary prevention.
- Key results (as displayed): "first comprehensive revision of US lipid recommendations since the 2018 guideline on blood cholesterol"; restores LDL-C goals — <100 mg/dL for borderline/intermediate risk, <70 mg/dL for high risk, <55 mg/dL for very-high-risk secondary prevention; extends to non-HDL-C, apoB, Lp(a), triglyceride-rich lipoproteins; apoB "may be used to assess any residual ASCVD risk" after LDL-C/non-HDL-C goals are met in specified groups. Diet (query 10 summary of Guideline Central / Medscape-type pages): "strict restriction of saturated fats to less than 6% of calories" and replacement of saturated and trans fat with mono- and polyunsaturated fat to lower LDL-C. Mediterranean/DASH "reduce LDL-C by 10-15%" (as displayed).
- Snippets + URL:
  - "first comprehensive revision of US lipid recommendations since the 2018 guideline on blood cholesterol" — https://www.lipid.org/nla/2026-accahamultisociety-dyslipidemia-guideline-released
  - "LDL-C goal of <100 mg/dL for those at borderline or intermediate risk and <70 mg/dL in those at high risk" — query 3; https://professional.heart.org/en/science-news/2026-guideline-on-the-management-of-dyslipidemia
  - "The guideline recommends strict restriction of saturated fats to less than 6% of calories." — query 10; https://reference.medscape.com/cc2/p10/guideline-acc-aha-dyslipidemia-2026a1000cpb and https://www.guidelinecentral.com/guideline/5099440/
  - "replacing saturated and trans-fat with dietary monounsaturated and polyunsaturated fat, is recommended to decrease LDL-C levels" — query 10
- Verification: existence and LDL-C goals V2 (queries 3 and 10 list the same guideline pages from ACC, AHA, NLA, Medscape, PubMed 42295619); the SFA "<6%" statement and Mediterranean/DASH numbers are V1 (query 10 only).
- Certainty / limitations / funding / COI: class of recommendation, level of evidence, and whether "<6%" applies to all adults or only to people with elevated LDL-C are NOT shown. COI/funding not seen. A critique exists (MDPI Life, DOI 10.3390/life16091470, "The 2026 ACC/AHA Dyslipidemia Guideline: A Critical and Transatlantic Perspective on Personalized Lipid Management"; title only).
- Notes: the AHA 5–6% figure in S8-08 is consistent with "<6%".

### [S8-04] 2025 Focused Update of the 2019 ESC/EAS dyslipidaemia guidelines
- Citation: 2025 Focused Update of the 2019 ESC/EAS Guidelines for the management of dyslipidaemias. Eur Heart J 2025;46(42):4359– (volume, issue and start page as encoded in the OUP URL, not otherwise displayed); published simultaneously in Atherosclerosis. https://academic.oup.com/eurheartj/article/46/42/4359/8234482
- Type / level: guideline update — Level VII. Evidence cut-off 31 March 2025.
- Key results (as displayed): "a healthy dietary habit, such as consuming low levels of saturated fat, wholegrain products, vegetables, fruit and fish, can lower LDL cholesterol levels"; no supplement or vitamin found safe and effective for LDL-C/clinical outcomes; adds bempedoic acid for statin intolerance and evinacumab for HoFH.
- Snippets + URL:
  - "This 2025 Focused Update addresses changes in recommendations for the treatment of dyslipidaemias based on new evidence published up until 31 March 2025." — query 4; https://www.escardio.org/news/press/press-releases/New-guidance-recommends-a-new-approach-to-assess-cardiovascular-risk-and-reach-treatment-goals-for-lipid-levels/
  - "a healthy dietary habit, such as consuming low levels of saturated fat, wholegrain products, vegetables, fruit and fish, can lower LDL cholesterol levels" — query 4
- Verification: existence V2 (OUP/EHJ page, ESC press release, ESC slide set, ISCP copy among hits); diet statement V1 (query 4). Online publication date not displayed.
- Certainty / limitations / funding / COI: guideline; GRADE/class not seen. Also a related ACC piece "Prioritizing Health: Dietary Approaches For Elevated LDL-C" (S8-26).

### [S8-05] JMA Journal 2025 — SR/MA of RCTs of saturated-fat restriction (Japan)
- Citation: Authors not displayed (researchers from Kitasato University and Tokyo University of Agriculture). (2025). Saturated Fat Restriction for Cardiovascular Disease Prevention: A Systematic Review and Meta-analysis of Randomized Controlled Trials. JMA Journal 8(2):395-407. DOI 10.31662/jmaj.2024-0324. PMC12095860. A Research Square preprint exists (rs-4610120).
- Type / level: SR/MA of RCTs — Level I. Date: 2025.
- Design / population: Cochrane CENTRAL, PubMed and Ichu-shi searched "for articles up to April 2023"; nine trials, 13,532 participants (2 primary prevention, 7 secondary prevention).
- Key results (as displayed): no significant differences in CV mortality, all-cause mortality, MI, or coronary artery events between SFA restriction and control. Conclusion as displayed: SFA reduction "cannot be recommended at present"; trials needed under best medical care including statins. Effect sizes not displayed.
- Snippets + URL:
  - "Nine eligible trials with 13,532 participants were identified (2 were primary and 7 were secondary prevention studies)." — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12095860/ (and https://www.jmaj.jp/detail.php?id=10.31662%2Fjmaj.2024-0324)
  - "No significant differences in cardiovascular mortality, all-cause mortality, myocardial infarction, and coronary artery events were observed" — same
  - "a reduction in saturated fats cannot be recommended at present to prevent cardiovascular diseases and mortality" — same
- Verification: V2 — queries 5 and 9 both display nine trials / 13,532 participants and the null finding; PMC and JMAJ pages among hits.
- Certainty / limitations / funding / COI: funding/COI and GRADE not displayed. Search date April 2023 predates later trials/reviews; the comparator mix (PUFA, carbohydrate, usual diet) is not shown, so it may not be comparable to S8-01. A same-issue-looking commentary, "There Is More Than Meets the Label: Rethinking Saturated Fat and Cardiovascular Health" (PMC12095710), appeared in the same result lists; its journal, authors and content were not displayed.
- Notes: preprint vs final differences cannot be assessed. Contradicts the direction (not necessarily the data) of S8-01; see Section B.

### [S8-06] Annals editorial on the Steen review
- Citation: Estruch R, Lamuela-Raventós RM. (2025/2026). Saturated Fats and Cardiovascular Disease: From Avoidance to a Nuanced Recommendation. Annals of Internal Medicine 179(2). DOI 10.7326/ANNALS-25-04971 (from URL). Online 16 Dec 2025; February 2026 issue.
- Type / level: editorial — Level VII.
- Key results (as displayed): "the editorial discusses a more nuanced approach"; per a news summary it characterised the findings as supporting the view that saturated fats are unlikely harmful for the general population (see S8-07).
- Snippets + URL:
  - "authored by Ramon Estruch, MD, PhD, and Rosa M. Lamuela-Raventós, DPharm, PhD" — https://www.acpjournals.org/doi/10.7326/ANNALS-25-04971
  - "published online on December 16, 2025, and is set to appear in the February 2026 issue" — https://doi.org/10.7326/annals-25-04971
- Verification: existence/authors/dates V2 (queries 5, 7, 8, 15 list the page or title); content characterisation V1 (query 15).
- Certainty / limitations / funding / COI: editorialists' COI not seen. A second Annals editorial, "Dietary Guidelines: Tilting From Treatment Toward Prevention" (https://www.acpjournals.org/doi/10.7326/ANNALS-26-00349), appeared as a hit; content not seen.

### [S8-07] Reaction to and dispute about the Steen review (secondary)
- Citation: STAT News (15 Dec 2025), "Free pass or failing grade for saturated fats? Review sets off scientific and political debate" https://www.statnews.com/2025/12/15/saturated-fat-intake-new-study-controversy-impact-dietary-guidelines/ ; Science Media Centre, "expert reaction to systematic review study looking at saturated fat intake and cardiovascular disease events" https://www.sciencemediacentre.org/expert-reaction-to-systematic-review-study-looking-at-saturated-fat-intake-and-cardiovascular-disease-events/ ; EurekAlert and MedicalXpress press items also listed.
- Type / level: news and expert commentary — SECONDARY / Level VII.
- Key results (as displayed, machine summary): the accompanying editorial "characterized the findings as supporting the view that saturated fats are unlikely harmful for the general population, which contradicted what the reviewers themselves concluded"; the reviewers reiterated that reductions lowered LDL cholesterol and led to fewer strokes and heart attacks, and "raised objections to the journal". Prof Forouhi (Cambridge): lower SFA intake is "beneficial for cardiovascular disease prevention not just for those at high risk but for the whole population".
- Snippets + URL:
  - "The editorial accompanying the review characterized the findings as supporting the view that saturated fats are unlikely harmful for the general population" — query 15 summary (STAT hit in list; attribution inferred)
  - "introduced new methodological challenges that limit interpretation" — SMC URL above
- Verification: V1 for the dispute detail (query 15 only; STAT title confirms a "scientific and political debate"); the SMC reaction V1 (query 13). Not independently confirmed from the Annals pages; any Annals correction or response was not searched.
- Certainty / limitations / funding / COI: the same query-15 summary also mentioned earlier scrutiny of author Bradley Johnston's disclosures (Texas A&M AgriLife Research grant; later ILSI funding). The hit list for that query included pages about the 2019 Annals red-meat studies, so this scrutiny most likely concerns the 2019 NutriRECS red-meat guideline, and Johnston's authorship of the 2025 review was NOT shown in any output. Do not attribute that COI history to this paper without checking.
- Notes: could change a reader's conclusion only about how contested the interpretation is, not about the data.

### [S8-08] AHA response to the DGA (7 Jan 2026)
- Citation: American Heart Association newsroom, statement dated 7 January 2026 on the 2025–2030 DGA. https://newsroom.heart.org/news/releases-20260107-6915862
- Type / level: professional-society statement — Level VII.
- Key results (as displayed): welcomed emphasis on vegetables, fruit, whole grains and limits on added sugars, refined grains, highly processed foods, SFA and sugary drinks; concern that guidance on salt seasoning and red meat "could inadvertently lead consumers to exceed recommended limits for sodium and saturated fats". Commentary in the same summary: DGA's <10% is "more permissive than the American Heart Association's recommendation of 5 to 6 percent, or about 13 grams per day on a 2,000-calorie diet"; AHA advises limiting red meat/full-fat dairy/butter/tallow and choosing low-fat dairy.
- Snippets + URL:
  - "could inadvertently lead consumers to exceed recommended limits for sodium and saturated fats" — query 2; https://newsroom.heart.org/news/releases-20260107-6915862
  - "more permissive than the American Heart Association's recommendation of 5 to 6 percent, or about 13 grams per day" — query 2
- Verification: V1 (query 2). The AHA 5–6% target is consistent with the "<6%" in S8-03 (V1).
- Certainty / limitations / funding / COI: statement, not evidence.

### [S8-09] Harvard Nutrition Source critique of the DGA (9 Jan 2026)
- Citation: Harvard T.H. Chan School of Public Health, The Nutrition Source (9 Jan 2026), "Dietary Guidelines for Americans 2025-2030: Progress on added sugar, protein hype, saturated fat contradictions". https://nutritionsource.hsph.harvard.edu/2026/01/09/dietary-guidelines-for-americans-2025-2030/
- Type / level: institutional expert commentary — Level VII (SECONDARY for any numeric claim).
- Key results (as displayed): "several contradictions within the DGAs and between the DGAs and the new pyramid, with mixed messages surrounding saturated-fat-rich foods such as red meat, butter, and beef tallow".
- Snippets + URL: "several contradictions within the DGAs and between the DGAs and the new pyramid" — query 16 summary; URL above.
- Verification: existence V2 (hit in queries 1, 16, 18); content V1 (query 16). Other critiques surfaced in the same lists: FoodNavigator-USA, "2025–2030 Dietary Guidelines face backlash over red meat" (https://www.foodnavigator-usa.com/Article/2026/01/09/20252030-dietary-guidelines-face-backlash-over-red-meat/); ABC News piece; Zoe Harcombe blog posts (2026/01, supportive of the DGA's direction; personal blog, SECONDARY).
- Certainty / limitations / funding / COI: institutional commentary, not a study; funding/COI not shown; read as expert opinion.

### [S8-10] CSPI and allied critics: DGAC rejection count and "Scientific Foundation" authorship (advocacy source)
- Citation: Center for Science in the Public Interest press release, "Health and science professionals question scientific basis of 2025–2030 Dietary Guidelines for Americans" https://www.cspi.org/press-release/health-and-science-professionals-question-scientific-basis-2025-2030-dietary ; CSPI report "The Uncompromised Dietary Guidelines for Americans, 2025–2030" (7 Jan 2026) https://www.cspi.org/sites/default/files/2026-01/20260107_CSPI_uncompromisedDGA_report_4_FINAL.pdf
- Type / level: advocacy-group statements — SECONDARY / Level VII.
- Key results (as displayed): "the administration rejected more than half (30 of 56) of the DGAC's recommendations—particularly those supporting plant-forward dietary patterns and cautioning against consuming saturated fats"; alleges the "Scientific Foundation" was "written by hand-picked authors whose work aligned with beef, dairy, and protein supplement industry interests".
- Snippets + URL: "the administration rejected more than half (30 of 56) of the DGAC's recommendations" — query 18 summary; CSPI URL above.
- Verification: V1; allegation, unverified. CSPI is an advocacy organisation with a stated position. I did not see the DGAC report, the Scientific Foundation text, or any rebuttal from the issuing agencies.
- Notes: the DGAC's 2025 report included a chapter "Food Sources of Saturated Fat" (dietaryguidelines.gov, file dated 2024-12 in URL; title seen, content not read).

### [S8-11] Further commentaries on the DGA / SFA (TITLE-ONLY — results not seen)
- (a) "The 2025–2030 US Dietary Guidelines: an analysis of scientific integrity and global health governance" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12925496/ (authors, journal not displayed).
- (b) "Fatty Acids, Their Food Sources, and Cardiovascular Disease: Current Evidence and Controversies Surrounding the 2025–2030 Dietary Guidelines for Americans" — The Journal of Nutrition, 2026 (PII S0022-3166(26)00318-4) https://jn.nutrition.org/article/S0022-3166(26)00318-4/abstract (authors/funding not displayed). Most directly on-topic expert review in the whole sweep; read it first if access is available.
- (c) ACC: "How Do the 2025-2030 Dietary Guidelines For Americans Measure Up For Cardiovascular Health?" (URL dated 2026/01/27) and "From the Member Sections: dietary guidelines" (URL dated 2026/03/01) — https://www.acc.org/latest-in-cardiology/articles/2026/03/01/01/from-the-member-sections-dietary-guidelines
- (d) "Perspectives on the Protein Recommendations in the 2025–2030 Dietary Guidelines for Americans" (J Nutr; ScienceDirect S0022316626004037) — protein, not SFA.
- Verification: V1 each (existence only). No results or conclusions are claimed.

### [S8-12] AJCN 2026 — umbrella review of dietary fat and cancer outcomes
- Citation: Fan B, Zhang Z, Zhang Y, Pang L, Guo Q, Chen P, Jian L, Wu Y, Wang S. (2026). Dietary fat consumption and cancer outcomes: an umbrella review of systematic reviews and meta-analyses. Am J Clin Nutr 123(5), article 101266. DOI 10.1016/j.ajcnut.2026.101266. Online 11 Mar 2026; May 2026 issue. PubMed 41825531.
- Type / level: umbrella review of SRs/MAs (largely observational input) — Level I (umbrella).
- Design / population: PubMed, Embase, Web of Science and Cochrane Library searched "from inception to September 2025"; AMSTAR-2 for review quality; GRADE for certainty of evidence.
- Key results (as displayed): higher total fat linked with bladder, breast, gastric and oesophageal cancer and non-Hodgkin lymphoma; SFA intake "associated with higher risks of breast, gastric, liver, and esophageal cancers"; a second query's summary adds that polyunsaturated fats "may have protective effects". No effect sizes or GRADE ratings were displayed.
- Snippets + URL:
  - "Saturated fatty acid intake was associated with higher risks of breast, gastric, liver, and esophageal cancers." — https://pubmed.ncbi.nlm.nih.gov/41825531/ (query 11); https://ajcn.nutrition.org/article/S0002-9165(26)00075-4/abstract
  - "Methodological quality was assessed using AMSTAR-2, and certainty of evidence was graded with GRADE." — query 11
- Verification: V2 — queries 6 and 11 both display the SFA–cancer-site finding (PubMed, AJCN and ScienceDirect pages among hits).
- Certainty / limitations / funding / COI: funding/COI and the GRADE ratings (which decide whether this is "low", "moderate" etc.) not seen; observational basis. Query 6's summary called it "a more recent 2025 umbrella review"; the metadata in query 11 says online March 2026, so 2026 is used.
- Notes: could change conclusions on non-CVD outcomes only if the GRADE ratings are moderate or higher — unknown.

### [S8-13] KETO-CTA / lean mass hyper-responders (LMHR) — low-carbohydrate diet, LDL-C and plaque
- Citation (several documents, relationship between them not verified): (i) "Plaque begets plaque, ApoB does not: Longitudinal data from the KETO-CTA Trial" (April 2025 per summary; venue not displayed); (ii) "The Impact of Sustained LDL-C Elevation on Plaque Changes: Primary Coronary plaque progression results from the Keto CTA Study", medRxiv, dated 2026-01-15 in the URL (preprint) https://www.medrxiv.org/content/10.64898/2026.01.15.26343955v1 ; (iii) "The KETO CTA Study", JACC Advances, DOI 10.1016/j.jacadv.2025.101861 (title/URL only) https://www.jacc.org/doi/10.1016/j.jacadv.2025.101861 ; (iv) "Carbohydrate Restriction-Induced Elevations in LDL-Cholesterol and Atherosclerosis: The KETO Trial" (Houston Methodist Scholars listing); (v) ClinicalTrials.gov NCT05733325 "Diet-induced Elevations in LDL-C and Progression of Atherosclerosis".
- Type / level: prospective observational imaging study in a selected phenotype — Level IV (design details not displayed); (ii) is a preprint.
- Design / population: one-year coronary plaque progression in LMHRs (elevated LDL-C with high HDL-C and low triglycerides on carbohydrate-restricted diets). LMHR definition as displayed: LDL-C ≥ 200 mg/dL, HDL-C ≥ 80 mg/dL, triglycerides ≤ 70 mg/dL (later work used 190 / ≥60 / 80).
- Key results (as displayed, from a machine summary): progression "modest and heterogeneous over one year"; "baseline coronary plaque emerging as the strongest predictor of subsequent plaque progression in LMHRs, whereas traditional lipid markers such as ApoB and LDL are not". The numbers of participants and effect sizes were not displayed.
- Snippets + URL:
  - "baseline coronary plaque emerging as the strongest predictor of subsequent plaque progression in LMHRs, whereas traditional lipid markers such as ApoB and LDL are not" — query 26 summary; hits as above
  - "LDL-C ≥ 200 mg/dL, HDL-C ≥ 80 mg/dL, and triglycerides ≤ 70 mg/dL" — query 26
- Verification: V1 (single query; several distinct documents/hosts confirm that the study and preprints exist). The January 2026 preprint's results were NOT displayed, so whether it confirms or qualifies the April 2025 statement is unknown.
- Certainty / limitations / funding / COI: funding and conflicts not displayed (V0 recollection in D: community/crowd funding). Selected phenotype with one-year follow-up; sample size, comparison group and randomization status were not displayed. Critical blog commentary (Zoe Harcombe, Alex Leaf, Dr Stanfield) exists in the hits and is SECONDARY.
- Notes: separate from SFA per se; relevant to "low-carb/keto and LDL" sub-question. Pre-window UKB result in S8-14 points the other way for a different population.

### [S8-14] PRE-WINDOW comparator — UK Biobank low-carbohydrate high-fat diet, lipids and MACE
- Citation: JACC Advances, published 25 March 2024 (per summary): "Association of a Low-Carbohydrate High-Fat Diet With Plasma Lipid Levels and Cardiovascular Risk" https://www.jacc.org/doi/10.1016/j.jacadv.2024.100924 ; accompanying "Low-Carbohydrate High-Fat Diets, Lipid Levels, and Cardiovascular Risk" https://www.jacc.org/doi/10.1016/j.jacadv.2024.100975
- Type / level: prospective cohort — Level IV. Date: 2024 (OUTSIDE the Jan 2025 window; included only as the comparator for S8-13).
- Key results (as displayed): LCHF diet "associated with increased LDL-C and apolipoprotein B levels, and an increased risk of incident MACE"; adjusted "hazard ratio: 2.18, 95% CI: 1.39-3.43, P < 0.001"; risk greater with LDL-C >5.0 mmol/L.
- Snippets + URL: "(hazard ratio: 2.18, 95% CI: 1.39-3.43, P < 0.001)" — https://www.jacc.org/doi/10.1016/j.jacadv.2024.100924
- Verification: V1 (query 27; JACC, UK Biobank and PMC pages among hits). No separate 2025 item for this cohort appeared in this query.
- Certainty / limitations: how diet was classified, group sizes and adjustment sets were not displayed; funding/COI not seen.

### [S8-15] PRE-WINDOW comparator — 2024 umbrella review of SFA reduction and CVD
- Citation: "Effect of reducing saturated fat intake on cardiovascular disease in adults: an umbrella review" (PMC11180890; PubMed 38887252; year/journal not displayed in the summary; an untitled frontiersin.org hit with "2024" in its DOI string sat in the same list — inference only).
- Type / level: umbrella review — Level I. Date: most likely 2024 (OUTSIDE the window).
- Key results (as displayed): "moderate certainty of evidence for reducing combined cardiovascular events (RR 0.79, 95%CI 0.66-0.93)" but "little or no effect on cardiovascular mortality and mortality from other causes".
- Snippets + URL: "moderate certainty of evidence for reducing combined cardiovascular events (RR 0.79, 95%CI 0.66-0.93)" — https://pubmed.ncbi.nlm.nih.gov/38887252
- Verification: V1 (query 6).
- Notes: shows the same broad pattern as S8-01 (modest effect on combined events, little on mortality), with a different outcome definition; useful as a cross-check, not as a 2025–26 finding.

### [S8-16] WHO industrial trans-fat elimination: validation programme, 2025 round
- Citation: WHO validation programme for trans-fat elimination, second round of awards at the World Health Assembly 2025 (per Resolve to Save Lives): https://resolvetosavelives.org/timeline/who-trans-fat-validation-2025/ ; WHO fact sheet https://www.who.int/news-room/fact-sheets/detail/trans-fat ; WHO 5-year milestone report (24 Jun 2024; pre-window) https://www.who.int/news/item/24-06-2024-who-5-year-milestone-report-on-global-transfat-elimination-illustrates-latest-progress-up-to-2023
- Type / level: international health-body programme / NGO reporting — not graded.
- Key results (as displayed): "Austria, Norway, Oman, and Singapore awarded by WHO", "bringing the total countries validated to nine" (first round 2024: Denmark, Lithuania, Poland, Saudi Arabia, Thailand). Context from the 2024 milestone report (pre-window): "As of 2023, a total of 53 countries had best practice policies in place for tackling industrial trans fat in food"; the 2023 elimination target was not met. A third application cycle closed "31 August 2025"; its outcome was not searched.
- Snippets + URL: "Austria, Norway, Oman, and Singapore awarded by WHO" — https://resolvetosavelives.org/timeline/who-trans-fat-validation-2025/ (query 22)
- Verification: V1 for the named 2025 countries (query 22; the 2025 timeline page and a WHO fact sheet are among the hits).
- Certainty / limitations / funding / COI: Resolve to Save Lives is an NGO; treat its pages as SECONDARY for programme facts (a WHO fact sheet was listed but its text was not shown).
- Notes: relevant to sub-question 5 (artificial fats: industrial trans fat). Not about SFA itself. The WHA 2026 (third) cycle result is an open item.

### [S8-17] Cell-cultivated pork fat cleared in the US (Mission Barns, 2025)
- Citation: Mission Barns cell-cultivated pork fat: FDA pre-market response announced in 2025 (trade press dates it 4 April 2025) and USDA inspection/label sign-off (24 July 2025). https://www.qualityassurancemag.com/news/mission-barns-announces-cell-cultivated-pork-fat-launch-following-fda-clearance/ ; https://www.nationalhogfarmer.com/market-news/usda-approves-cultivated-pork-fat-ingredient-to-enter-the-u-s-market- ; company page https://missionbarns.com/usda-clearance/
- Type / level: regulatory event / trade press / company announcement — SECONDARY.
- Key results (as displayed): FDA "had no further questions regarding Mission Barns' conclusion that products made with its cultivated pork fat 'are as safe as comparable foods'"; USDA clearance "enabling its first products to enter the U.S. market on July 24, 2025"; products are meatballs and bacon made with cultivated pork fat and plant protein; described as "the first company worldwide to obtain regulatory approval for cultivated pork fat".
- Snippets + URL: "enabling its first products to enter the U.S. market on July 24, 2025" — https://www.nationalhogfarmer.com/market-news/usda-approves-cultivated-pork-fat-ingredient-to-enter-the-u-s-market-
- Verification: V2 for the existence of FDA and USDA clearances (hits from at least four independent outlets plus the company); dates V1.
- Certainty / limitations / funding / COI: safety-status clearance, not a nutrition or outcome study. "Approval" is the trade press's word; the quoted FDA language is a "no further questions" response. No data on cardiometabolic effects of cultivated fat were seen (not specifically searched beyond this query).
- Notes: relevant to reading R-c (lab-made fats). Whether the fatty-acid composition equals conventional pork fat was not displayed.

### [S8-18] Seed oils: US political and regulatory activity, and counter-statements (secondary)
- Citation: items seen — NPR (7 Jul 2025) "Are seed oils actually bad for your health? Here's the science behind the controversy" https://www.npr.org/2025/07/07/nx-s1-5453769/nutrition-canola-rfk-seed-oils-soybean ; FactCheck.org (Jul 2025) "FDA commissioner spreads unsubstantiated concerns about seed oils in baby formula" https://www.factcheck.org/2025/07/fda-commissioner-spreads-unsubstantiated-concerns-about-seed-oils-in-baby-formula/ ; Reason (22 Dec 2025) https://reason.com/2025/12/22/maha-mandates-food-labels/ ; Food Safety Magazine, "Louisiana Passes 'MAHA' Bill Targeting More Than 40 Ingredients, Including Seed Oils, Dyes, Sweeteners" https://www.food-safety.com/articles/10504-louisiana-passes-maha-bill-targeting-more-than-40-ingredients-including-seed-oils-dyes-sweeteners ; Advisory Board (13 Feb 2025) https://www.advisory.com/daily-briefing/2025/02/13/seed-oils
- Type / level: news and policy — SECONDARY.
- Key results (as displayed): HHS Secretary Kennedy claims "seed oils are one of the driving causes of the obesity epidemic"; Louisiana SB 14 targets more than 40 ingredients (seed oils among them) via label disclosure and public-school meal bans; Texas SB 25 requires warning labels on food containing any of 44 ingredients, "including any partially hydrogenated oil". Counter-statements in the same summary: linoleic acid "has not been shown to increase inflammation"; "more than 15 randomized controlled trials found that refined seed oils had no effect on inflammation" (source of this claim within the hit list not identifiable).
- Snippets + URL:
  - "seed oils are one of the driving causes of the obesity epidemic" — query 21 summary (attributed to Kennedy); hits above
  - "Senate Bill 25 mandates that manufacturers put warning labels on food containing any one of 44 ingredients" — query 21
- Verification: V1 (single query; many concordant hits for the existence of state "MAHA" bills). No primary 2025–26 linoleic-acid literature was retrieved.
- Certainty / limitations: this is political context; no randomized-trial data on seed oils vs SFA were gathered in this sweep.

### [S8-19] FDA "healthy" nutrient content claim — final rule (SFA limit retained as a criterion)
- Citation: FDA final rule on the implied nutrient-content claim "healthy", published 27 Dec 2024, effective 25 Feb 2025 (21 CFR 101.65(d)); compliance date 25 Feb 2028. Hits: Cooley (https://www.cooley.com/news/insight/2025/2025-02-11-fda-publishes-rule-updating-healthy-nutrient-content-claim), FDLI (https://www.fdli.org/2025/05/fda-final-rule-updates-the-healthy-nutrient-content-claim/), NC State (https://foodbusiness.ces.ncsu.edu/2025/02/fda-labeling-healthy-claim-effective-feb-25th-2025/).
- Type / level: federal regulation — not graded. Date: published just before the window; effective and in force within it.
- Key results (as displayed): the rule removes total-fat and cholesterol limits and adds an added-sugar limit; it places "limits on the amount of saturated fat, sodium, and added sugars in a food". Category-specific SFA limits (as %DV for dairy, eggs, game meats, seafood) are described in the summary but the wording is garbled and was not transcribed.
- Snippets + URL: "The compliance date is February 25, 2028." — query 20 summary; hits above
- Verification: V2 for existence and effective date (hit titles and URLs from several independent law-firm/university hosts); compliance date and mechanics V1.
- Notes: scheduled item — compliance deadline 25 Feb 2028.

### [S8-20] FDA front-of-package (FOP) nutrition labelling proposed rule (SFA, sodium, added sugars) — status
- Citation: FDA proposed rule, 16 Jan 2025; comment period extended to 15 Jul 2025 (per summary). https://www.fda.gov/food/hfp-constituent-updates/fda-issues-proposed-rule-front-package-nutrition-labeling ; status pieces: Food Engineering, "FDA Could Finalize Front-of-Pack Nutrition Label Rule in Spring 2026" https://www.foodengineeringmag.com/articles/103400-fda-could-finalize-front-of-pack-nutrition-label-rule-in-spring-2026 ; Daily Intake blog (Mar 2026), "FDA Signals Potential Reassessment of Proposed Front-of-Package Rule" https://www.dailyintakeblog.com/2026/03/fda-signals-potential-reassessment-of-proposed-front-of-package-rule/ ; InfoLawGroup (17 Jun 2026), "Food Labeling Reform Is Back — But FDA May Get There First" https://www.infolawgroup.com/insights/2026/6/17/food-labeling-reform-is-back-but-fda-may-get-there-first
- Type / level: proposed federal regulation — not graded.
- Key results (as displayed): the label "would highlight the amount of saturated fat, sodium, and added sugars in a serving of food". In early 2026 the FDA Deputy Commissioner for Human Foods (Kyle Diamantas, via Bloomberg Law as relayed) said the agency is reviewing comments and "everything is on the table", including revision or rescission.
- Snippets + URL: "On January 16, 2025, FDA published a proposed rule that would require a front-of-package (FOP) nutrition label on most packaged foods." — query 20 summary; FDA URL above
- Verification: V1 for status statements (single query; titles of the four status pieces conflict in tone). Final outcome as of 1 Oct 2026 NOT found.
- Notes: unresolved scheduled item.

### [S8-21] Whole Milk for Healthy Kids Act (signed 14 January 2026)
- Citation: US federal law signed 14 Jan 2026. https://www.cacfp.org/2026/01/14/whole-milk-for-healthy-kids-act-signed-into-law/ ; https://wisconsinexaminer.com/2026/01/14/repub/trump-signs-law-to-allow-whole-milk-in-school-lunches/ ; House member press releases (tiffany.house.gov; kiley.house.gov).
- Type / level: statute — not graded.
- Key results (as displayed): schools in the National School Lunch Program may serve whole and reduced-fat milk "which was previously unallowable"; the law "excludes fluid milk from the saturated fat content calculations for schools"; optional, not required; does not change CACFP, SFSP or School Breakfast milk rules.
- Snippets + URL: "Excludes fluid milk from the saturated fat content calculations for schools." — query 19 summary; https://www.cacfp.org/2026/01/14/whole-milk-for-healthy-kids-act-signed-into-law/
- Verification: V2 for "signed into law 14 Jan 2026" (hit titles/URLs from at least three independent hosts incl. cacfp.org and two House offices); provisions V1.
- Notes: a regulatory move that treats dairy SFA differently from other SFA in school-meal rules; no health data involved.

### [S8-22] Coconut oil — 2025 industry-promoted review (SECONDARY; claim to check)
- Citation: Coconut Coalition of the Americas, "Recent 2025 Review Finds No Link Between Coconut Oil Consumption and Increased Heart Disease Risk" (URL slug: "analysis-of-26-studies-of-the-impact-of-coconut-oil-on-lipid-parameters-beyond-total-and-ldl-cholesterol") https://coconutcoalition.org/analysis-of-26-studies-of-the-impact-of-coconut-oil-on-lipid-parameters-beyond-total-and-ldl-cholesterol/ . The underlying journal paper was NOT identified in the output.
- Type / level: industry trade-group web page — SECONDARY. Underlying review type unknown.
- Key results: none seen beyond the headline. A different summary line said "a 2025 analysis examining 26 studies of the impact of coconut oil on lipid parameters".
- Verification: V1; funding of the underlying review unknown; the publisher is a coconut-industry trade body (COI by nature of source).
- Pre-window context returned by the same query (not 2025–26; the summary did not tie each statement to a specific study): "In a meta-analysis of 16 trials, coconut oil consumption significantly increased low-density lipoprotein (LDL) cholesterol concentrations as compared with nontropical vegetable oils" (an AHA-journals Circulation meta-analysis, CIRCULATIONAHA.119.043052, was among the hits); a separate statement gives an LDL-C increase of 10.47 mg/dL (8.6%); and a randomized trial "conducted in 2017" found LDL-C higher on butter than on coconut oil or olive oil, with no difference between coconut and olive oil.
- Notes: lead only. A reader should not rely on this entry.

### [S8-23] Mendelian randomization — SFA and stroke, BMC Nutrition 2025 (TITLE-ONLY)
- Citation: "Investigation of the causal relationship of saturated fat acids on heart stroke: evidence from two-sample Mendelian randomization", BMC Nutrition (2025 per summary). https://link.springer.com/article/10.1186/s40795-025-01094-2
- Type / level: MR study — Level IV. Results, instruments and authors NOT displayed.
- Verification: V1, existence only. Do not infer a finding.

### [S8-24] Mendelian randomization — dietary preferences and CVD, May 2025 (TITLE-ONLY)
- Citation: "Association of dietary preferences with cardiovascular disease: a Mendelian randomization study" (May 2025 per summary) https://pmc.ncbi.nlm.nih.gov/articles/PMC12150056/
- Type / level: MR study — Level IV. Results NOT displayed. The summary line "meta-analyses of prospective cohort studies have revealed little or no evidence of association between saturated fat intake and CVD risk" is background text from the paper's introduction as relayed, not a result.
- Verification: V1, existence only.

### [S8-25] Registered RCT — Mediterranean pattern reduced in saturated fat (TITLE-ONLY)
- Citation: "Cardiovascular Risk Prevention With a Mediterranean Dietary Pattern Reduced in Saturated Fat", ClinicalTrials.gov NCT05778656 (protocol/consent document hit: https://cdn.clinicaltrials.gov/large-docs/56/NCT05778656/Prot_ICF_001.pdf).
- Type / level: trial registration / protocol — not evidence of outcome. Status, size, sponsor and endpoints NOT displayed.
- Verification: V1, existence only. Candidate for a forward-looking watch list.

### [S8-26] ACC piece on dietary approaches for elevated LDL-C, July 2025 (TITLE-ONLY)
- Citation: ACC "Prioritizing Health: Dietary Approaches For Elevated LDL-C" (URL dated 2025/07/01) https://www.acc.org/Latest-in-Cardiology/Articles/2025/07/01/01/Prioritizing-Health-Dietary-Approaches-For-Elevated-LDL-C
- Type / level: professional-society educational article — Level VII. Content NOT displayed.
- Verification: V1, existence only.

---

## B. Disagreements and discrepancies between sources

1. **RCT meta-analyses point in different directions.** S8-01 (17 RCTs, 66,337 adults): point estimates favour SFA reduction (e.g., nonfatal MI RR 0.86; SFA→PUFA RR 0.75) with CIs that mostly cross 1 and authors' "low to moderate" certainty; benefit judged important only in high-risk groups. S8-05 (9 RCTs, 13,532 participants, search to April 2023, 7 of 9 secondary-prevention): "no significant differences", conclusion that SFA reduction "cannot be recommended at present". S8-15 (pre-window umbrella): combined CV events RR 0.79 (0.66–0.93), little effect on mortality. Likely drivers (not verified): number and type of trials included, risk stratification, outcome definitions, replacement nutrient, and search date. Do not merge the comparators (PUFA vs carbohydrate vs MUFA).
2. **Authors versus editorialists on S8-01.** One news summary says the Annals editorial read the findings as supporting the view that SFA is unlikely harmful for the general population, contrary to the reviewers' own conclusions, and that co-authors objected to the journal (V1, secondary). Nita Forouhi (SMC) says lower SFA intake is beneficial for the whole population. I did not see the editorial text or any Annals response.
3. **Date of Steen et al.:** 15 Dec 2025 (SMC, STAT) vs 16 Dec 2025 (ACC scan, Annals editorial, query 7) vs February 2026 issue (Vol 179, No 2). Probably embargo-lift vs official publication versus print issue; unverified.
4. **Replacement-nutrient counts in S8-01:** ACC scan gives 11 PUFA + 4 carbohydrate + 1 MUFA = 16 for 17 trials (one trial's replacement not stated).
5. **Misattributed numbers.** Query 5's summary said an "Annals of Internal Medicine" 2026 study found a 17% reduction in combined CV events "(12 trials, 53,758 participants)". That conflicts with the Annals abstract numbers in queries 7, 12 and 14 (17 trials; 66,337). The Cochrane review CD011737 appeared in the same hit lists (PubMed 32428300; PMC8092457), and the 12-trial / 53,758 pattern looks like that older review's headline (my recollection only, see D). Treat the query-5 attribution as an error; do not cite those figures as Annals data.
6. **US official guidance vs cardiology guidance.** DGA 2025–2030: SFA <10% of calories plus encouragement of full-fat dairy, red meat, butter and beef tallow (S8-02). AHA: 5–6% (S8-08). 2026 ACC/AHA guideline: <6% (V1; S8-03). ESC/EAS 2025: low-SFA diet to lower LDL-C (S8-04). Commentators say following the DGA's food advice would exceed 10% (V1/V2, assertion not tested by me). Harvard calls this contradictory (S8-09); CSPI alleges the DGAC's cautions on SFA were set aside (S8-10, advocacy).
7. **AJCN umbrella review date:** query 6 summary "2025" vs query 11 metadata "online March 11, 2026; May 2026 issue" (2026 used).
8. **FDA front-of-pack rule status:** "could finalize in spring 2026" (Food Engineering) vs "everything is on the table" including rescission (Bloomberg Law via summary; March 2026 blog) vs "FDA may get there first" (June 2026). Final status unknown.
9. **"Approval" of cultivated fat:** trade press says "approval"; the quoted FDA language is "no further questions" about the company's safety conclusion.
10. **Funding statement for S8-01:** "None" per query-15 summary, alongside text about an author's earlier disclosure controversy that appears to relate to the 2019 red-meat papers; authorship of that individual on the 2025 review was not shown.
11. **KETO-CTA documents:** at least four documents (April 2025 paper, JACC Advances 2025 item, Houston Methodist listing, January 2026 medRxiv preprint) — which is the peer-reviewed primary report and whether results differ across versions is unresolved.

## C. Counter-evidence searched (what I looked for; found / not found)

- Evidence that SFA reduction does NOT help: found S8-05 (null RCT MA), S8-01 (CIs crossing 1; low-risk benefit below thresholds), S8-06 (editorial reading), S8-13 (LMHR plaque not tracking ApoB/LDL over one year), S8-22 (industry-promoted coconut review, weak). Not searched: 2025–26 cohort null findings, dairy-fat null/inverse associations, Mendelian randomization results (titles only).
- Evidence that SFA is harmful: found S8-01 (high-risk benefit; SFA→PUFA MI RR 0.75), S8-12 (cancer umbrella), guidelines S8-03/S8-04, S8-14 (pre-window LCHF cohort HR 2.18).
- New 2025 trials of butter / dairy fat / tallow / palm: one query (butter vs olive oil, query 24) returned only pre-2025 trials (e.g., a 47-person butter vs olive oil crossover, a 2017 coconut/olive/butter trial, a cheese vs butter trial); the targeted full-fat-dairy query was refused by the cap. So: none found, but the search was thin.
- Trans fat / artificial fats: WHO programme (S8-16), cultivated fat clearance (S8-17), Texas PHO labelling (S8-18). Not searched: interesterified fats, ruminant TFA, fat substitutes, health data on cultivated or synthetic fats.
- Retractions, corrections, expressions of concern touching the SFA literature: NOT searched (cap). Not found by incidental hits either (the only disclosure controversy seen concerns a 2019-type red-meat dispute and is unconfirmed for 2025).
- "Seed oil" primary literature: not searched; only news/policy seen (S8-18).
- Cochrane / WHO / EFSA / SACN updates: Cochrane CD011737 appeared as a hit only; no 2025–26 update found; others not searched.

## D. Leads (V0 — background knowledge or hit-title guesses, NOT verified, do not use as findings)

1. Cochrane review CD011737 (Hooper et al., 2020) — my recollection is that its headline for combined CV events was a 17% reduction (RR 0.83) across 12 comparisons / 53,758 participants. This would explain the misattribution in B5. V0; verify before use.
2. A JAMA Internal Medicine cohort analysis of butter and plant-based oil intake and mortality (Harvard group). A hit titled "expert reaction to study looking at butter or vegetable oils and mortality" (Science Media Centre) surfaced in query 24, date and content unseen. I do not recall its publication date with confidence (late 2024 or 2025). Search: "Butter and Plant-Based Oils Intake and Mortality" JAMA Internal Medicine.
3. Canada's mandatory front-of-package "high in saturated fat" labelling (compliance date believed to be 1 January 2026). V0.
4. The Lancet series on ultra-processed foods (late 2025) — likely relevant to SFA-in-processed-food framing. V0.
5. KETO-CTA background: crowd-funded by a patient-community foundation, about 100 participants (V0 recollection; verify in the preprint).
6. Hit-only items worth opening: Yahoo News piece with slug "rfk-jr-says-saturated-fats" (HHS Secretary statements on SFA; content unseen); Substack "Unsettled Science" post "Canceling the science on saturated…" (advocacy commentary; topic unseen); AHA newsroom item "Following 9 key steps for a lifetime of eating well can support heart health" (date and type unseen; may be a 2025–26 AHA scientific statement); Norwegian cohort "Saturated fatty acids and total and CVD mortality in Norway… up to 45 years of follow-up" (PMC11499087; 78,725 participants, 28,555 deaths per summary; described as a 2024 study, so pre-window).
7. Next DGA cycle (2030–2035) and any DGA process litigation or reform — not searched.

## E. Search log (query | mode | useful Y/N)

Successful (29):
1. Dietary Guidelines for Americans 2025-2030 saturated fat 10 percent limit January 2026 butter beef tallow | extended | Y
2. American Heart Association response 2025-2030 Dietary Guidelines saturated fat statement | extended | Y
3. 2026 ACC AHA multisociety dyslipidemia guideline LDL-C apoB released | extended | Y
4. ESC EAS 2025 focused update dyslipidaemia guidelines saturated fat dietary recommendation | extended | Y
5. meta-analysis saturated fat 2026 randomized trials cardiovascular | extended | Y (contains misattribution, B5)
6. umbrella review saturated fat intake health outcomes 2025 | extended | Y
7. "Effect of Interventions Aimed at Reducing or Modifying Saturated Fat Intake…" Annals 2026 risk stratified 53,758 participants | extended | Y
8. "Saturated Fats and Cardiovascular Disease: From Avoidance to a Nuanced Recommendation" Annals editorial | extended | Y
9. "Saturated Fat Restriction for Cardiovascular Disease Prevention: A Systematic Review and Meta-analysis…" 2025 nine trials 13,532 | extended | Y
10. 2026 ACC/AHA dyslipidemia guideline lifestyle diet recommendation saturated fat percent of calories | extended | Y
11. "Dietary fat consumption and cancer outcomes: an umbrella review…" AJCN 2026 | extended | Y
12. Annals SFA risk stratified SR 17 trials 66,337 participants RR all-cause mortality… | extended | Y (numbers)
13. expert reaction to systematic review study … saturated fat intake and cardiovascular disease events Science Media Centre | standard | Y
14. ACC journal scan "Reducing Saturated Fat May Reduce Mortality, NFMI, Stroke in High-Risk Individuals" | extended | Y
15. Steen Johnston saturated fat Annals funding conflicts criticism STAT "Free pass or failing grade" | extended | Y (dispute; COI confusion)
16. DGA 2025-2030 Harvard Nutrition Source saturated fat contradiction red meat full-fat dairy | extended | Y
17. "Dietary Guidelines: Tilting From Treatment Toward Prevention" Annals 2026 | standard | N (target article not returned; title seen elsewhere)
18. "Scientific Foundation" DGA 2025-2030 saturated fat evidence review HHS USDA DGAC | extended | Y
19. Whole Milk for Healthy Kids Act signed law January 2026 | standard | Y
20. FDA "healthy" claim final rule saturated fat… front-of-package proposed rule status 2026 | extended | Y
21. seed oils FDA HHS Kennedy 2025 2026 action MAHA strategy… | extended | Y (secondary)
22. WHO validates trans fat elimination 2025 countries… | extended | Y
23. cultivated animal fat approval 2025 2026 Mission Barns FDA USDA… | extended | Y
24. randomized trial butter versus olive oil LDL 2025 saturated fat dairy fat controlled feeding | extended | N for 2025 (only older trials)
25. coconut oil LDL cholesterol meta-analysis randomized trials 2025 2026 | extended | Partly (older meta-analyses; one industry 2025 item)
26. Keto-CTA lean mass hyper-responders… results published 2025 | extended | Y
27. UK Biobank low-carbohydrate high-fat diet LDL cardiovascular events ACC.25 2025 | extended | Partly (2024 paper only)
28. Mendelian randomization saturated fat intake genetically predicted CVD 2025 | extended | Partly (titles only)
29. prospective cohort saturated fat intake mortality cardiovascular disease 2026 | extended | Partly (one 2026 review title; rest pre-2025)

Rejected by the session cap (6; "200 of 200 WebSearch calls" used):
30. "Butter and Plant-Based Oils Intake and Mortality" JAMA Internal Medicine… | extended | not performed
31. "Fatty Acids, Their Food Sources, and Cardiovascular Disease…" Journal of Nutrition | extended | not performed
32. "KETO CTA" JACC Advances 2025 Budoff coronary plaque… | extended | not performed
33. "Investigation of the causal relationship of saturated fat acids on heart stroke" BMC Nutrition 2025 | extended | not performed
34. coconut oil systematic review 26 studies lipid parameters beyond total and LDL cholesterol 2025 | extended | not performed
35. full-fat dairy cardiovascular disease meta-analysis randomized trial 2025 dairy fat LDL | extended | not performed

## F. Upcoming or scheduled items noted (from what was seen)
- FDA "healthy" claim: compliance date 25 Feb 2028 (S8-19).
- FDA front-of-package rule: not final as of the latest item seen (17 Jun 2026); could be finalised, revised or rescinded (S8-20). Status at 1 Oct 2026 unknown.
- WHO trans-fat validation: third application cycle closed 31 Aug 2025; results (likely WHA 2026) not searched (S8-16).
- Registered RCT NCT05778656 (Mediterranean pattern reduced in SFA): status unknown (S8-25).
- KETO-CTA: peer-reviewed status of the January 2026 preprint unknown (S8-13).
- No scheduled Cochrane, EFSA, SACN or DGA-cycle updates were found because those were not searched.

## G. Suggested follow-ups if the search cap is raised (priority order)
1. "Butter and Plant-Based Oils Intake and Mortality" JAMA Intern Med; Journal of Nutrition 2026 "Fatty Acids, Their Food Sources, and Cardiovascular Disease…" (authors, funding).
2. Annals follow-up: letters or corrections to Steen et al.; editorial COI; abstract text (cholesterol results, trial list).
3. 2025–26 cohorts and pooled analyses on SFA by food source (dairy, cheese, meat, plant), UK Biobank / EPIC / NHS-HPFS / PURE; type 2 diabetes (Diabetes Care), MASLD, dementia.
4. Retractions / corrections / expressions of concern 2025–26 in the SFA literature.
5. Full-fat dairy and butter / tallow / palm / coconut feeding trials 2025–26 and apoB outcomes.
6. Low-carbohydrate and ketogenic diets and LDL-C / apoB 2025–26 (meta-analyses; KETO-CTA peer-reviewed version).
7. Interesterified fats, ruminant vs industrial trans fat, olestra and fat substitutes, cultivated / precision-fermentation fat composition and health data.
8. Linoleic acid / "seed oil" randomized and cohort literature 2025–26; FDA or HHS seed-oil actions.
9. Cochrane, EFSA, UK SACN, NHMRC, Nordic / German / Dutch / Canadian SFA guidance changes 2025–26; WHO SFA and ultra-processed-food guidance.
10. WHO trans-fat third-cycle validations (WHA 2026); FDA front-of-package final status.
