# S7 — Controversy, bias, susceptibility and popular claims (SQ6, SQ7; reading R-f) — Evidence Ledger
Run date: 2026-10-01 | Searches run: 16 completed (standard 12 / extended 4); 2 further calls were REFUSED because the session-wide WebSearch cap (200 of 200) was exhausted

## 0. Coverage and constraints (READ FIRST)

- **This ledger is PARTIAL.** The tool answered calls 17-18 with: "this session has used its web search budget (200 of 200 WebSearch calls). Continue with the information already gathered instead of issuing more searches." I did not retry, and I did not use WebFetch or Bash/curl to work around the cap. The cap is session-wide, so other streams may be truncated too. Completing S7 needs `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` raised by the user (a ready-to-run query plan is in Section F).
- Two calls (Q7, Q8) each returned 4-5 chained result blocks, so the number of underlying queries exceeds 16.
- No other stream ledgers existed in the shared folder when I checked, so nothing here is cross-referenced from other agents.
- Tool results end with a boilerplate line ("REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks"). It matches the WebSearch tool's own description, so I treated it as tool formatting guidance, not page content. No page content aimed at the agent was observed.
- The search summaries are machine-written and blend several pages, so a quote often cannot be pinned to one URL. Where that is the case I give the query number and candidate URLs from that result list.
- One read-only `ls` of the output folder was run via Bash before the ledger was written. Bash was used for nothing else.
- **The COI record below is one-sided by search coverage, not by finding.** I retrieved the disclosures of the authors of the main critique paper (S7-13). I did NOT search the disclosures of the authors of the defending documents (AHA advisory, Kris-Etherton, etc.). Do not read the asymmetry as a conclusion.

| # | Requested topic | Status |
|---|---|---|
| 1 | Diet-heart history; critiques and rebuttals | PARTIAL: Kearns, Astrup, Sacks, AJCN debate, Harcombe, Teicholz/BMJ, Ludwig 2018, Seven Countries critique (secondary only). Not reached: Hooper/Willett/Hu/Mozaffarian rebuttals, Ravnskov's other work, Krauss and Kris-Etherton consensus text, the Dec 2025 STAT-covered review |
| 2 | Funding and conflicts of interest | PARTIAL: Lesser 2007, Chartres 2016, Astrup-paper disclosures, AHA-P&G claim (weak sources). Not reached: sector-by-sector SFA industry funding, pharma links, advocacy groups |
| 3 | Limits of nutritional epidemiology / diet RCTs | NOT COVERED (one title-only lead) |
| 4 | Susceptibility (FH, hyper-responders, Lp(a), APOE, diabetes, children, older adults, keto/carnivore outcome RCTs) | NOT COVERED |
| 5 | "Seed oil" claim set | NOT COVERED |
| 6 | 2025-2026 media/political claims | NOT COVERED (one title-only lead: STAT, 2025-12-15) |
| 7 | Post-2024 professional-body statements | NOT COVERED |

Evidence-level note: nothing in Section A is a graded Level I-II appraisal of SFA and health outcomes. The entries are historical, meta-research, expert-opinion and controversy documents. S7-05 and S7-06 are the only outcome meta-analyses; both argue against the guidelines, and S7-05's design choices are disputed (S7-05 notes; Section B). The lipids/RCT and cohort streams should supply the outcome evidence.

---

## A. Findings ledger

### [S7-01] Kearns, Schmidt and Glantz 2016 — sugar-industry documents and early CHD research
- Citation: Kearns CE, Schmidt LA, Glantz SA (2016). Sugar Industry and Coronary Heart Disease Research: A Historical Analysis of Internal Industry Documents. JAMA Internal Medicine. DOI/PMID not displayed. One summary gives "November 1, 2016" (print issue); another gives "September 2016" (online). A ResearchGate listing carries the title string "(vol 176, pg 1680, 2016)", which may be a citation or an erratum; not determined.
- Type / level: historical analysis of internal industry documents — Level VI (single descriptive study). Strong for the narrow claim "what the documents show"; silent on whether SFA causes CVD.   Date/version: online Sept 2016.
- Design / population: Sugar Research Foundation (SRF) internal documents, historical reports and statements about early debates on dietary causes of CHD. The Harvard literature review in question appeared in NEJM (the summaries name D. Mark Hegsted as one of its authors).
- Key results (exactly as displayed): "more than 340 documents, totaling 1,582 pages of text" (Q1); "about 1,600 pages of documents" (Q6). Payment: "the equivalent of $50,000 in 2016 dollars" (Q1) versus "the equivalent of $48,000 in 2016 dollars" (Q6). "The NEJM has required disclosures since 1984" (Q6).
- Snippets + URL:
  - "sponsored its first CHD research project in 1965 to downplay early warning signals that sucrose consumption was a risk factor in CHD" — Q1; https://www.ucsf.edu/news/2016/09/404081/sugar-papers-reveal-industry-role-shifting-national-heart-disease-focus (candidate; summary blends pages)
  - "successfully cast doubt about the hazards of sucrose while promoting fat as the dietary culprit in CHD" — Q6; candidates https://www.statnews.com/2016/09/12/sugar-industry-harvard-research/ , https://www.healio.com/news/primary-care/20160912/sugar-industry-sponsored-research-to-downplay-sugars-role-in-heart-disease , https://tobacco.ucsf.edu/content/sugar-industry-and-coronary-heart-disease-research-historical-analysis-internal-industry-documents . Separately, a PubMed hit (https://pubmed.ncbi.nlm.nih.gov/27715189/) is titled "Sugar Industry Science and Heart Disease"; its title differs from the paper's and its content was not seen.
  - "paid the Harvard scientists the equivalent of $50,000 in 2016 dollars, then set the review's objective, contributed articles to be included, and received drafts" — Q1; candidates https://www.wgbh.org/news/national/2016-09-13/50-years-ago-sugar-industry-quietly-paid-scientists-to-point-blame-at-fat , https://www.beveragedaily.com/Article/2016/09/13/How-the-sugar-lobby-paid-scientists-to-point-the-finger-at-fat-JAMA/
  - "paid the equivalent of $48,000 in 2016 dollars to him and a colleague, though the researchers never publicly disclosed that funding source" — Q6; candidates STAT and Healio URLs above
  - Authors' own caveat: "did not find "direct evidence that the sugar industry wrote or changed the NEJM review manuscript"" — Q6 (the same summary adds that the report rests on circumstantial evidence)
- Verification: V2 for authors, journal, year, document count, the 1965 sponsorship conclusion, and the undisclosed payment (Q1 and Q6 independent result lists; UCSF, STAT, Healio, WGBH, PMC/Semantic Scholar hits). The dollar figure is V2 as "about $48,000-$50,000" but the exact figure is in dispute between the two queries. The primary paper's own text was not displayed (a PMC hit at https://pmc.ncbi.nlm.nih.gov/articles/PMC5099084 and a PDF copy at math.colorado.edu appeared, titles or contents not shown).
- Certainty / limitations / funding / COI: funding of the Kearns study not displayed. The authors acknowledge circumstantial evidence. The paper concerns industry influence on a 1960s-70s review and on the framing of the debate. It does not test the SFA-CVD relationship and is not evidence for or against it.
- Notes: the Sugar Association's response and any published criticism of Kearns were not seen (Krimsky 2017 PDF at sites.tufts.edu "pub2017SugarIndustryScience.pdf" and the PubMed item above surfaced as titles only; content unseen).

### [S7-02] Astrup et al. 2020 — "Saturated Fats and Health: A Reassessment and Proposal for Food-Based Recommendations" (a prominent critique of SFA limits)
- Citation: Astrup A, Magkos F, Bier (first name not displayed), Brenna JT, de Oliveira Otto MC, Hill JO, King JC, Mente A, Ordovas JM, Volek (first name shown only as "Jeff" in a link title), Yusuf S, Krauss RM (2020). Saturated Fats and Health: A Reassessment and Proposal for Food-Based Recommendations. J Am Coll Cardiol (JACC State-of-the-Art Review). DOI as shown in the URL: 10.1016/j.jacc.2020.05.077. [Author list assembled from the disclosure list in Q7; Q2 listed only a subset of authors. Verify the full list and order against the JACC page.]
- Type / level: expert State-of-the-Art Review — Level VII (expert synthesis of meta-analyses; no protocol, search or GRADE displayed).   Date/version: "released August 10, 2020" (Q2). A Q8 sentence mentions an unidentified "letter to the editor published in JACC Volume 76, Issue 7 (August 18, 2020) shortly after the Astrup paper"; its authors and content were not displayed, and it may be a mislabel of the paper's own issue. A "Journal Pre-proof" PDF (ResearchGate) and a file labelled "original" on betterwithdairy.com are in circulation. The jacc.org page is https://www.jacc.org/doi/abs/10.1016/j.jacc.2020.05.077
- Design / population: narrative synthesis; proposes food-based rather than nutrient-based (SFA %E) recommendations.
- Key results (exactly as displayed): the abstract statements below. Specific meta-analyses are not named in the displayed text.
- Snippets + URL (Q2 and Q7; https://www.jacc.org/doi/abs/10.1016/j.jacc.2020.05.077):
  - "found no beneficial effects of reducing SFA intake on cardiovascular disease (CVD) and total mortality, and instead found protective effects against stroke"
  - "not due to increasing levels of small, dense LDL particles, but rather larger LDL particles, which are much less strongly related to CVD risk"
  - "Whole-fat dairy, unprocessed meat, eggs and dark chocolate are SFA-rich foods with a complex matrix that are not associated with increased risk of CVD."
  - "The totality of available evidence does not support further limiting the intake of such foods."
- Strongest argument of this side (as displayed): (1) the newest meta-analyses find no benefit of lowering SFA on CVD or total mortality; (2) the LDL-C rise from SFA is mostly in larger, less atherogenic particles; (3) the food matrix matters, so food-based advice should replace a numeric SFA cap. Evidence cited: "most recent meta-analyses" (unnamed in the output).
- Verification: V2 for existence and abstract content (Q2 and Q7 both display the abstract and the jacc.org link).
- Certainty / limitations / funding / COI: see S7-13. Dairy-related sites republish or promote the paper (for example betterwithdairy.com hosts a PDF; yogurtinnutrition.com and maelken.dk appeared in the hits). I did not verify who runs those sites. A critical response titled "'State-of-the-Art' Review Sows Confusion About Saturated Fats" is at https://mynutritionscience.com/satfatresponse/ (title only; content unseen).
- Notes: no named rebuttal letter by Harvard or AHA authors was found in Q8 (see Section C).

### [S7-03] Sacks et al. 2017 — AHA Presidential Advisory "Dietary Fats and Cardiovascular Disease" (a prominent defence of SFA limits)
- Citation (as displayed in Q3): Sacks FM, Lichtenstein AH, Wu JHY, Appel LJ, Creager MA, Kris-Etherton PM, Miller M, Rimm EB, Rudel LL, Robinson JG, Stone NJ, Van Horn LV; on behalf of the American Heart Association. Dietary fats and cardiovascular disease: a presidential advisory from the American Heart Association [published online ahead of print June 15, 2017]. Circulation. doi: 10.1161/CIR.0000000000000510.
- Type / level: guideline-type expert advisory — Level VII (draws on Level I-II evidence).   Date/version: online June 15, 2017. The AHA's later dietary guidance statements were not searched, so it is not known whether this advisory has been updated or superseded.
- Key results (exactly as displayed, Q3):
  - "reduced CVD by approximately 30%, similar to the reduction achieved by statin treatment" (RCTs that lowered dietary SFA and replaced it with polyunsaturated vegetable oil)
  - "lower intake of saturated fat coupled with higher intake of polyunsaturated and monounsaturated fat is associated with lower rates of CVD" (prospective cohorts)
  - "Replacement of saturated fat with mostly refined carbohydrates and sugars is not associated with lower rates of CVD" and "did not reduce CVD in clinical trials"
- Strongest argument of this side (as displayed): the benefit appears when SFA is replaced with polyunsaturated (and monounsaturated) fat, and trial and cohort evidence agree; replacement with refined carbohydrate shows no benefit; the advice is to be delivered within a healthful dietary pattern (DASH or Mediterranean).
- Snippet URLs (candidates; the summary blends pages): https://professional.heart.org/en/science-news/dietary-fats-and-cardiovascular-disease/top-things-to-know , https://medicine-matters.blogs.hopkinsmedicine.org/2017/07/dietary-fats-and-cardiovascular-disease-a-presidential-advisory-from-the-american-heart-association , https://www.healio.com/news/cardiology/20170808/aha-polyunsaturated-fats-as-substitute-for-saturated-fats-lower-risk-for-cvd . The DOI string also appears in the PDF URL https://www.ahajournals.org/doi/pdf/10.1161/cir.0000000000000510 (Q15 hit).
- Verification: V2 for citation and existence (Q3; DOI in the Q15 PDF URL). V1 for the "approximately 30%" and carbohydrate-replacement statements (Q3 only).
- Certainty / limitations / funding / COI: author COI NOT searched. The "approximately 30%" figure is the advisory's own statement about a PUFA-replacement comparator, not a pooled estimate I saw.

### [S7-04] Krauss and Kris-Etherton 2020 — AJCN "Great Debates in Nutrition": should guidelines recommend reducing SFA as much as possible?
- Citation: Krauss RM; Kris-Etherton PM (2020). Am J Clin Nutr. Debate positions plus a consensus paper titled "Public health guidelines should recommend reducing saturated fat consumption as much as possible: debate consensus" (2020). Volume/pages/DOI not displayed.
- Type / level: structured expert debate — Level VII.   Date/version: 2020 (press coverage Aug 2020).
- Key results (exactly as displayed, Q4): Kris-Etherton took the "YES" side, Krauss the "NO" side. The debate is described as "the premiere of Great Debates in Nutrition, a new section in the American Journal of Clinical Nutrition".
- Snippets + URL:
  - Kris-Etherton: "a large body of convincing and consistent evidence from different types of studies for making population-wide dietary recommendations to lower saturated fatty acids"
  - Krauss: "neither randomized clinical trials nor observational studies have conclusively established a benefit on cardiovascular disease outcomes and mortality"
  - The same summary says Krauss "questioned the scientific basis for implementing a numerical target for the population as a whole."
  - URLs: https://www.todaysdietitian.com/experts-debate-saturated-fat-guidelines/ , https://www.newswise.com/articles/experts-debate-saturated-fat-consumption-guidelines-for-americans , https://discover.nutrition.org/node/239
- Verification: V1 (the several outlets probably derive from one press release; the ASN link discover.nutrition.org/node/239 is in the hit list but its text was not displayed). The Q8 summary names different debaters (see Section B).
- Certainty / limitations / funding / COI: Krauss is also an author of S7-02, so on this debate he argues the side his co-authored critique supports; his disclosures are in S7-13. The Kris-Etherton disclosures were not searched.

### [S7-05] Harcombe et al. 2015 — pre-1983 trials and the 1977/1983 fat guidelines
- Citation: Harcombe Z, Baker JS, Cooper SM, Davies B, Sculthorpe N, DiNicolantonio JJ, Grace F (2015). Evidence from randomised controlled trials did not support the introduction of dietary fat guidelines in 1977 and 1983: a systematic review and meta-analysis. Open Heart. Volume/pages not displayed.
- Type / level: SR/MA of RCTs — Level I by design; no GRADE displayed. Retrospective test of the evidence available to the US (1977) and UK (1983) committees.   Date/version: 2015.
- Design / population: RCTs published before 1983 on dietary fat, serum cholesterol and CHD. "2,467 males participated in six dietary trials: five secondary prevention studies and one including healthy participants" (Q9). Men only ("2467 men and no women", Q15).
- Key results (exactly as displayed): "The reductions in mean serum cholesterol levels were significantly higher in the intervention groups; this did not result in significant differences in coronary heart disease or all-cause mortality." Effect sizes and CIs were not displayed in my results.
- Snippets + URL: "dietary recommendations were introduced for 220 million US and 56 million UK citizens by 1983, in the absence of supporting evidence from RCTs" (Q9); "The six studies available in 1983 had reviewed 2467 men and no women." (Q15). URLs: https://pure.cardiffmet.ac.uk/en/publications/evidence-from-randomised-controlled-trials-did-not-support-the-in/ , https://www.foodnavigator.com/Science/Study-claims-fat-guidelines-should-not-have-been-introduced-but-should-they , https://www.sciencemediacentre.org/expert-reaction-to-study-looking-at-historic-uk-and-us-dietary-advice-on-fats/
- Verification: V2 (the 2,467 men and six-trial figures appear in both Q9 and Q15).
- Certainty / limitations / funding / COI: funding and COI not displayed. Comparator: these were trials of "dietary fat" advice and cholesterol lowering, not specifically SFA-for-PUFA swaps (see Section B). Critics' stated objection, as displayed in Q15 (attribution to a named expert is unclear, see Section B): treating RCTs as the gold standard "would be inappropriate for most population based recommendations."

### [S7-06] "Evidence from randomised controlled trials does not support current dietary fat guidelines" (later, larger RCT meta-analysis; authorship not displayed)
- Citation: title as displayed in Q15 (PubMed 27547428; PMC4985840): "Evidence from randomised controlled trials does not support current dietary fat guidelines: a systematic review and meta-analysis". Authors, journal and year are not displayed for this item, so they are left blank. (The Q15 summary treats it as part of the Harcombe line of work and the same hit list includes Harcombe's own website, but authorship is not confirmed.)
- Type / level: SR/MA of RCTs — Level I by design; no GRADE displayed.
- Design / population / results (exactly as displayed, Q15): "62,421 participants in 10 dietary trials: 7 secondary prevention studies, 1 primary prevention and 2 combined"; "The death rates for all-cause mortality were 6.45% and 6.06% in the intervention and control groups, respectively"; "The risk ratio (RR) from meta-analysis was 0.991 (95% CI 0.935 to 1.051)."
- URLs: https://pubmed.ncbi.nlm.nih.gov/27547428/ , https://pmc.ncbi.nlm.nih.gov/articles/PMC4985840/
- Verification: V1 (single query).
- Notes: the Q15 summary placed these numbers under a "Harcombe 2015" heading, but the hit titles show a different paper from S7-05, so I record two papers. The comparator is "dietary fat guidelines" interventions, not SFA-for-PUFA. A companion title "Evidence from prospective cohort studies does not support current dietary fat guidelines: A systematic review and meta-analysis" appeared (ResearchGate; title only).

### [S7-07] Teicholz, BMJ 2015 — critique of the US Dietary Guidelines Advisory Committee, and the retraction request (SECONDARY, party sources)
- Citation: Teicholz N (2015). The scientific report guiding the US dietary guidelines: is it scientific? BMJ 351:h4962 (volume and article number as they appear in the URL https://www.bmj.com/content/351/bmj.h4962%20/rapid-responses). Published September 2015 per the Q10 summary.
- Type / level: investigative feature plus procedural dispute — not a study (Level VII at most).
- Key results (exactly as displayed, Q10): Teicholz wrote that the committee "showed bias against fat and meat and did not use all the available evidence, and that members had undisclosed conflicts of interest." "More than 180 scientists wrote to the BMJ on November 5, 2015, citing 11 factual errors in the article and requesting that it be retracted." "BMJ's review found no grounds for retraction of Nina Teicholz's article." The BMJ "corrected or "clarified" 7 of the 11 errors cited in the request." Both reviewers "also noted problems with the committee's methods."
- URLs: https://www.cspi.org/letter-requesting-bmj-retract-investigation , https://www.cspi.org/letter-bmj-re-teicholz , https://www.cspi.org/sites/default/files/media/documents/resource/Teicholz_Helfand_report_011216_4ja.pdf (title only), https://cspinet.org/sites/default/files/attachment/bmj-retraction-letter-11-5-15.pdf
- Verification: V1 SECONDARY. Most hits are from CSPI, one of the petitioners, so the account comes from one party to the dispute. Teicholz's own response and the BMJ's primary statement were not seen.
- Certainty / limitations / funding / COI: Teicholz's funders (Nutrition Coalition and others) were not searched.

### [S7-08] Seven Countries Study and the "cherry-picking" critique (SECONDARY only)
- Citation: Keys A et al., Seven Countries Study (primary publications not displayed). Discussion sources are popular and advocacy pages: Oldways ("pulling ancel keys out under bus"), Food Tank, Substack, Fox News, Minnesota Daily.
- Type / level: secondary commentary — not graded as evidence.
- Key results (exactly as displayed, Q5): the study "collected data on 12,763 men, with follow-ups at five, ten, and fifteen years". Critics' claim: Keys "cherry-picked countries to study, focusing on those where both consumption of saturated fat and the incidence of heart disease were high", with data available from 22 countries. Defenders' counter-claim: "there were never more than seven countries involved in the study."
- URLs: https://oldwayspt.org/blog/pulling-ancel-keys-out-under-bus , https://backtobasicsnutrition.substack.com/p/have-we-been-lied-to-all-these-years , https://www.foxnews.com/health/scientists-question-link-between-saturated-fat-and-heart-disease.print
- Verification: V1 SECONDARY. The Q5 summary also says France was "purposely excluded" with no reason given, and that "recent defense papers" exist (not named). Neither point is verified.
- Notes: this is a live factual dispute (22 countries versus 7) that I could not resolve from primary sources.

### [S7-09] Ludwig, Willett, Volek and Neuhouser 2018 — "Dietary fat: From foe to friend?"
- Citation: Ludwig D, Willett W, Volek J, Neuhouser M (2018). Dietary fat: From foe to friend? Science, Nov 16, 2018 per the Q11 summary (names shown as "David Ludwig, Walter Willett, Jeff Volek, and Marian Neuhouser"). Volume/pages not displayed.
- Type / level: expert perspective written by authors with differing views — Level VII.
- Key results (as displayed, Q11): the authors "summarized existing evidence to identify areas of broad consensus amid ongoing controversy regarding macronutrients and chronic disease." "no specific fat to carbohydrate ratio is best for everyone"; "an overall high-quality diet low in sugar and refined grains will help most people maintain a healthy weight and low chronic disease risk."
- URLs: https://foodsystems.uw.edu/news/dietary-fat-from-foe-to-friend , https://myadlm.org/Science-and-Research/Clinical-Chemistry/Clinical-Chemistry-Podcasts/2018/Dietary-Fat-Friend-or-Foe
- Verification: V1. The text on SFA specifically was NOT seen.
- Certainty / limitations / funding / COI: a title seen in Q11, "Atkins Foundation Grant Fuels Studies of Low-Carb Diets" (education.uconn.edu, 2012), is flagged only as a COI check for the low-carbohydrate-diet authors; its content was not read.

### [S7-10] Ravnskov et al. 2016 — LDL-C and mortality in the elderly, and the CEBM post-publication critique
- Citation: Ravnskov et al. (2016). Lack of an association or an inverse association between low-density-lipoprotein cholesterol and mortality in the elderly: a systematic review. BMJ Open. Volume/pages not displayed. This concerns LDL-C and mortality in older adults, not SFA directly. It is recorded as a critique of the lipid hypothesis and for the "older adults" sub-topic.
- Type / level: systematic review of cohort studies — Level I label, observational evidence (Level IV in substance), with a documented risk-of-bias critique.
- Key results (exactly as displayed, Q12): "19 cohort studies including 30 cohorts with a total of 68,094 participants". A "statistically significant inverse association between all-cause mortality and LDL-C in 14 of 28 included cohorts, with no association in 14 cohorts", and "higher cardiovascular mortality in the lowest LDL-C quartile in 2 out of 9 cohorts."
- Critique (CEBM, Q12): "the search strategy presents a high risk of bias for missing important and relevant studies."
- URLs: https://www.cebm.net/2016/06/cebm-response-lack-association-inverse-association-low-density-lipoprotein-cholesterol-mortality-elderly-systematic-review-post-publication-pee/ , https://www.sciencemediacentre.org/expert-reaction-to-systematic-review-reporting-lack-of-an-association-between-ldl-cholesterol-and-mortality-in-the-elderly/
- Verification: V1 (numbers from one summary; existence confirmed by several hits).
- Certainty / limitations / funding / COI: the Q12 summary notes that some experts commenting had "declared financial interests related to statin research and cholesterol-lowering medications" (from the Science Media Centre page; names not displayed). Ravnskov's funding was not seen.

### [S7-11] Lesser et al. 2007 — funding source and conclusions in nutrition articles (PLoS Medicine)
- Citation: Lesser, Ebbeling, Goozner, Wypij and Ludwig (2007). Relationship between funding source and conclusion among nutrition-related scientific articles. PLoS Med. DOI from the URL: 10.1371/journal.pmed.0040005. An accompanying editorial is titled "Does Industry Sponsorship Undermine the Integrity of Nutrition Research?" (journal.pmed.0040006). Volume and pages not displayed.
- Type / level: meta-research, single descriptive study — Level VI.
- Key results (exactly as displayed, Q13): "odds ratio of a favorable versus unfavorable conclusion was 7.61 (95% confidence interval 1.27 to 45.73)", comparing articles with all industry funding to no industry funding.
- URLs: https://journals.plos.org/plosmedicine/article?id=10.1371%2Fjournal.pmed.0040005 , https://www.semanticscholar.org/paper/Relationship-between-Funding-Source-and-Conclusion-Lesser-Ebbeling/b25d43e4215f3efc8771fab23b85007c01149c86
- Verification: V1 for the OR (one summary). V2 for existence (PLoS, Semantic Scholar, Mendeley hits).
- Certainty / limitations / funding / COI: the CI is very wide (1.27 to 45.73). Sample size, topics studied, and whether any SFA articles were included were NOT displayed. The study is not specific to saturated fat.

### [S7-12] Chartres, Fabbri and Bero 2016 — industry sponsorship and nutrition-study outcomes (systematic review)
- Citation: Chartres N, Fabbri A, Bero LA (2016). Association of Industry Sponsorship With Outcomes of Nutrition Studies: A Systematic Review and Meta-analysis. JAMA Intern Med 176(12):1769-1777 (as displayed in Q14). PubMed URL shows 27802480.
- Type / level: systematic review and meta-analysis of meta-research studies — Level V by the ledger's hierarchy (review of descriptive studies).
- Key results (exactly as displayed, Q14): "775 reports in the medical literature, narrowing the scope to 12 relevant reports published between 2003 and 2014". "industry-sponsored studies were more likely to have favorable conclusions than non-industry-sponsored studies, the difference was not significant (risk ratio, 1.31 [95%CI, 0.99-1.72])." "Five reports assessed methodological quality; none found an association with industry sponsorship." One report found food-industry-sponsored studies "reported significantly smaller harmful effects for the association of soft drink consumption with energy intake and body weight."
- URLs: https://pubmed.ncbi.nlm.nih.gov/27802480/ , https://sydney.edu.au/news-opinion/news/2016/11/01/full-extent-of-bias-into-food-industry-research-remains-unknown.html (title: "full extent of bias into food industry research remains unknown")
- Verification: V1 for the numbers (one summary). V2 for existence (PubMed, Sydney, NutraIngredients, Bath portal).
- Certainty / limitations / funding / COI: only 12 reports; not specific to SFA; the pooled difference was not statistically significant.

### [S7-13] Declared funding and COI of the authors of S7-02 (Astrup et al. 2020), as displayed
- Source: Q7 extended search (summary of the paper's disclosure section). Single query, so V1. The Mente/Yusuf entry was cut off in the output. **Re-check against the JACC disclosure section before use.**
- Dairy: Astrup, "has received research funding from Danish Dairy Foundation, Arla Foods Amba, and the European Milk Foundation", plus speaker honoraria from the European Milk Foundation (Expert Symposium on the Dairy Matrix 2016). Brenna, "panel participation honorarium from Dairy Management (2017)". Volek, "National Dairy Council/Dutch Dairy Organization". Krauss, "has received research funding from Dairy Management". Mente and Yusuf, "Research funding from the Dairy Farmers of Canada" (entry truncated).
- Meat: Brenna, "the National Cattlemen's Beef Association/North Dakota Beef Council". Hill, "Research funding from the National Cattlemen's Beef Association."
- Palm: Volek, "Malaysian Palm Board". Agro-processing: Ordovas, Archer Daniels Midland (on probiotics).
- Low-carbohydrate and ketogenic commercial ties: Volek, royalties for books on ketogenic diets and advisory boards for Virta Health, UCAN, Advancing Ketogenic Therapies, Cook Keto, Axcess Global and Atkins Nutritionals. Krauss, advisory board for Virta Health and Day Two, and a licensed patent for a method of lipoprotein particle measurement.
- Other: Astrup, advisory board and consultant for McCain Foods Limited and Weight Watchers. Bier, consulting or lecture fees from groups including Nestlé S.A. and Ferrero SpA. Brenna, shareholder in Retrotope. Ordovas, advisory or consulting roles with Nutrigenomix, the Predict Study, GNC and Weight Watchers.
- No disclosure: Magkos, de Oliveira Otto and King ("Nothing to disclose").
- Note: these are declared relationships. They show who funded the authors and are not evidence on the accuracy of the paper's conclusions. Symmetrical disclosures for the defending documents were not retrieved (see Section 0).

### [S7-14] Claimed AHA-Procter and Gamble funding link (1948) (SECONDARY, advocacy and blog sources; low weight)
- Citation: no scholarly source was displayed. Hits: savagezen.substack.com "A short history of villainizing saturated fat", theacademyofideas.substack.com "Vegetable oils and the American heart", crossfit.com "Ancel Keys' Cholesterol Con, Part 2", forums, and one PMC item (PMC9794145; title not displayed).
- Type / level: not graded (blog and advocacy sources).
- Key results (as displayed, Q16): "In 1948, Procter & Gamble donated funds raised from its "Truth or Consequences" radio program to the American Heart Association totaling $1.74 million". The same sources claim that the AHA "brought Ancel Keys on board" in the mid-1950s "to lead a campaign promoting vegetable oils."
- Verification: V1 SECONDARY. The claim is repeated by sources that argue one side. I did not find a primary or historical-scholarship source in this session, and no response from the AHA or historians. Do not use it for a factual statement without corroboration.

---

## B. Disagreements and discrepancies between sources

1. **Does lowering SFA reduce CVD? Headline conclusions diverge.** S7-02 (as displayed): meta-analyses found "no beneficial effects of reducing SFA intake on cardiovascular disease (CVD) and total mortality". S7-03 (as displayed): trials replacing SFA with polyunsaturated vegetable oil "reduced CVD by approximately 30%". The displayed text does not show the trials, comparators or meta-analyses behind each claim. S7-03 states its comparator explicitly (PUFA benefit; refined-carbohydrate replacement no benefit), and the displayed Astrup abstract does not mention a replacement nutrient. Whether comparator choice and trial selection explain the gap is NOT established by these results. The lipids/RCT stream should settle it.
2. **Comparator mismatch inside the critics' meta-analyses.** S7-05 and S7-06 test "dietary fat guidelines" (fat reduction and modification advice plus cholesterol lowering), not SFA-for-PUFA swaps. They are not directly comparable to the PUFA-replacement trials in S7-03. This is my reading of the displayed abstract text, so treat it as an interpretive note.
3. **Debaters in the AJCN debate.** Q4 (several trade outlets) names Krauss versus Kris-Etherton plus a Krauss and Kris-Etherton consensus paper. One Q8 sentence says the series featured "Arne Astrup and Frank Hu". Q4 is better supported. The Astrup and Hu claim is unverified and may be a summary error.
4. **Kearns details.** $50,000 (Q1) versus $48,000 (Q6) in 2016 dollars; 1,582 pages versus about 1,600; "September 2016" versus "November 1, 2016" (likely online versus print date).
5. **Seven Countries.** Critics: Keys chose a few countries out of data from 22. Defenders: "never more than seven countries involved". Unresolved (secondary sources only).
6. **Funding-bias magnitude.** Lesser 2007: OR 7.61 (1.27 to 45.73), significant. Chartres 2016: RR 1.31 (0.99 to 1.72), not significant, from 12 reports. The measures, designs and sponsors differ (OR versus RR; a single descriptive study versus a review of meta-research). Both point toward more sponsor-favourable conclusions, but the Chartres result does not exclude no effect. Neither is specific to saturated fat.
7. **Teicholz/BMJ.** 180+ scientists alleged 11 errors; the BMJ corrected or clarified 7 and declined to retract; the reviewers also noted problems with the DGAC's methods (CSPI-hosted account). The petitioners' account is from a party to the dispute.
8. **Attribution risk in Q15.** Under a "Lichtenstein's Criticism" heading the summary presents (a) the sentence that Harcombe et al. "have taken a classical pharmaceutical approach to the evidence", with RCTs as gold standard "inappropriate for most population based recommendations", and (b) a statement that Lichtenstein said Americans ate more "real food" in the 1960s and had the highest CVD rates then. Sentence (a) reads like third-party commentary (Science Media Centre style), and the page behind (b) cannot be identified from the hit list (a Time piece, "Here's How Guidelines About Dietary Fat Went Wrong", is a candidate). Both attributions are unconfirmed. I recorded only the substance of (a) in S7-05, labelled "attribution unconfirmed", and did not record (b).

## C. Counter-evidence searched (what I looked for)

- **Rebuttals to Astrup 2020 (JACC), by Harvard or AHA authors:** searched Q8 (several phrasings). Found: a critical response titled "'State-of-the-Art' Review Sows Confusion About Saturated Fats" (mynutritionscience.com, content unseen) and the AJCN debate. NOT found: a named letter or rebuttal. Q8 mentions an unidentified "letter to the editor" in JACC 76(7), Aug 18, 2020 (authors and content not displayed). Not established that no rebuttal exists.
- **Critiques of Harcombe:** found expert-reaction pages (Science Media Centre, Warwick) and the comment above (S7-05, Section B8). Details unseen.
- **Criticism of Kearns 2016:** none displayed (Krimsky PDF and PubMed 27715189 titles only).
- **Defence of Keys:** Oldways piece and the "never more than seven countries" claim (secondary only).
- **Null funding-bias evidence:** found, Chartres 2016 (RR 1.31, CI crossing 1) alongside Lesser 2007.
- **NOT searched at all:** topics 3-7, including seed-oil evidence, susceptibility, 2025-2026 claims, and post-2024 professional-body statements. Absence of findings there means "not searched", not "no evidence".

## D. Leads (V0 — background knowledge, NOT verified, do not use as findings)

Everything below is from memory and may be wrong in names, years and numbers. No numbers are given on purpose. A few items are marked "title seen", meaning a title or URL appeared in a search hit but the content was not read.

**Topic 1 (history, critiques, rebuttals)**
- V0: Keys' 1953 multi-country graph and the Yerushalmy and Hilleboe (1957) "22 countries" critique are the origin of the cherry-picking claim; Kromhout and Menotti defended Keys.
- V0: Hegsted's role in the 1977 McGovern "Dietary Goals" and in later US guidelines; the Sugar Association's 2016 response to Kearns.
- V0: Hooper 2020 Cochrane SFA review and its critics; Chowdhury 2014 Annals meta-analysis and its correction; PURE (Dehghan 2017) and its critics; Li, Hruby and Hu on SFA versus carbohydrate sources; Mozaffarian 2010 PLoS Med PUFA-for-SFA meta-analysis.
- Title seen: "Longtime Dietary Fat Advice Unsupported by Data: Analysis" (Medscape); "Here's How Guidelines About Dietary Fat Went Wrong" (Time); "Dietary saturated fats and health: are the U.S. guidelines evidence-based?" (sciencepod; I believe a Nutrients 2021 paper, unverified); "Serious Questions About Saturated Fat Guidance" (conscienhealth.org, Sept 2021); "Defending the Cholesterol Hypothesis in the Elderly" (Goodreads blog); Speciality Medical Dialogues: "...BMJ study questions WHO guidelines"; Farm Progress, Feb 26, 2020: "Scientists say limits on saturated fats unjustified".
- **Title seen, content unread, highest priority:** STAT News, 2025-12-15, "Free pass or failing grade for saturated fats? Review sets off scientific and political debate", https://www.statnews.com/2025/12/15/saturated-fat-intake-new-study-controversy-impact-dietary-guidelines/ . It concerns a late-2025 review of saturated fat and its effect on the dietary guidelines. I could not read it, so I do not know what the review is, who wrote it, who funded it or what it concluded.

**Topic 2 (funding and COI)**
- V0: Bes-Rastrollo 2013 PLoS Med on sugar-sweetened beverages (title seen: journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1001578); Lundh and colleagues' Cochrane review on industry sponsorship and outcome; Marion Nestle's work on food-industry funding (Unsavory Truth title seen; Food Politics post on COI, 2021, title seen).
- Title seen: "Conflicts of Interest for Dietary Guidelines Advisory Committee Members: Neither a New Nor Unexplored Issue" (PMC10509440); "Complete financial disclosure for improved transparency in nutrition communication" (PubMed 41415230, apparently recent); "Keeping a watchful eye on the food giants and cleansing the temple of nutritional medicine and epidemiology" (PMC9924174); "Funding Source and Research Report Quality in Nutrition Practice-Related Research" (PLoS One).
- V0 sector map to check: dairy (Dairy Management Inc. / National Dairy Council), meat (Beef Checkoff), palm (Malaysian Palm Oil Board), coconut (Philippine bodies), seed-oil sector (soybean and canola boards), pharma (statin and PCSK9 makers, guideline authors), advocacy (Nutrition Coalition, Weston A. Price Foundation, CSPI, PCRM). The claimed 1948 P&G-AHA link also needs scholarly corroboration.

**Topic 3 (limits of nutritional epidemiology and diet RCTs)**
- V0: Ioannidis 2018 JAMA viewpoint on reforming nutritional epidemiology; Ioannidis 2013 BMJ "Implausible results in human nutrition research"; Satija and Hu et al. 2015 Adv Nutr; Schoenfeld and Ioannidis 2013 AJCN. Title seen: arXiv 2512.07531 "Meta-analyses of dietary exposures must consider energy adjustment: recommendations from a meta-scientific review" (Dec 2025).

**Topic 4 (susceptibility)**
- V0: Norwitz et al. 2022 on "lean mass hyper-responders" (journal to verify); a 2024 KETO-CTA coronary imaging study (Budoff and colleagues); the National Lipid Association 2019 scientific statement on low-carbohydrate and ketogenic diets (Kirkpatrick et al.); EAS/ESC/AHA familial hypercholesterolaemia statements; EAS Lp(a) consensus; APOE genotype and LDL response to SFA (Masson 2003 and later); STRIP infant-onset dietary counselling trial; AAP/NHLBI/AHA paediatric dietary guidance (under 2 versus over 2). My belief, unverified: no outcome RCT of ketogenic or carnivore diets on cardiovascular events exists. Title/URL not seen.

**Topic 5 (seed-oil claims)**
- V0: Johnson and Fritsche 2012 (linoleic acid and inflammatory markers, RCT review); Su et al. 2017; Farvid 2014 Circulation (cohort meta-analysis); Marklund 2019 Circulation (30 cohorts, biomarkers); Hooper 2018 Cochrane omega-6 review; Ramsden 2013 BMJ (Sydney Diet Heart Study) and 2016 BMJ (Minnesota Coronary Experiment recovered data) and their critics (for example Hamley 2017); DiNicolantonio and O'Keefe 2018 Open Heart (supportive of the seed-oil concern); Calder and Innes on omega-6 and inflammation; Neelakantan 2020 Circulation (coconut oil and LDL-C); butter versus olive-oil feeding trials. No beef-tallow outcome trial known to me.

**Topic 6 (2025-2026 claims)**
- V0: the 2025-2030 Dietary Guidelines (released January 2026) and associated statements about butter, beef tallow and full-fat dairy; MAHA report (2025) and public statements on seed oils; restaurant tallow switches. Exact wording is another agent's task; here the claims need checking against the literature.

**Topic 7 (post-2024 professional bodies)**
- V0: 2025 ESC/EAS focused dyslipidaemia update; AHA, ACC, NLA statements; HEART UK, British Heart Foundation and Heart Foundation Australia position statements; ADA Standards of Care. Whether any updated its SFA/LDL-C stance after 2024 is unknown.

## E. Search log (query | mode | useful Y/N)

| Q | Query (shortened) | Mode | Useful |
|---|---|---|---|
| Q1 | Kearns Schmidt Glantz "Sugar Industry and Coronary Heart Disease Research" JAMA IM 2016 SRF Hegsted | standard | Y |
| Q2 | Astrup "Saturated Fats and Health: A Reassessment and Proposal for Food-Based Recommendations" JACC 2020 | standard | Y |
| Q3 | Sacks 2017 "Dietary Fats and Cardiovascular Disease: A Presidential Advisory From the AHA" Circulation | standard | Y |
| Q4 | Krauss Kris-Etherton "Public health guidelines should recommend reducing saturated fat...: YES" AJCN 2020 | standard | Y |
| Q5 | Seven Countries Study Keys critique cherry-picked countries diet-heart history | standard | Y (secondary only) |
| Q6 | Kearns 2016 conclusion SRF 1965 NEJM 1967 not disclosed 340 documents | extended | Y |
| Q7 | Astrup 2020 JACC abstract; COI disclosures of authors (chained, about 4 blocks) | extended | Y |
| Q8 | Astrup 2020 criticism / response / letters Mozaffarian Hu Willett Sacks (chained, about 5 blocks) | standard | Partial (no named rebuttal letters) |
| Q9 | Harcombe 2015 Open Heart "Evidence from randomised controlled trials did not support the introduction of dietary fat guidelines in 1977 and 1983" | standard | Y |
| Q10 | Teicholz BMJ 2015 "The scientific report guiding the US dietary guidelines: is it scientific?" petition retract | standard | Y |
| Q11 | Ludwig Willett Volek Neuhouser "Dietary fat: From foe to friend?" Science 2018 | standard | Thin |
| Q12 | Ravnskov BMJ Open 2016 LDL-C mortality elderly criticism response | standard | Y |
| Q13 | Lesser 2007 PLoS Med funding source and conclusion, odds ratio | extended | Y |
| Q14 | Chartres Fabbri Bero 2016 JAMA IM industry sponsorship nutrition studies | standard | Y |
| Q15 | Harcombe 2015 results RR 95% CI 2467 men; Lichtenstein criticism | extended | Y (also surfaced the STAT 2025-12-15 title) |
| Q16 | AHA 1948 Procter and Gamble Crisco funding history | standard | Weak sources only |
| Q17 | "Free pass or failing grade for saturated fats" STAT Dec 2025 | extended | REFUSED (cap) |
| Q18 | saturated fat systematic review December 2025 dietary guidelines controversy | extended | REFUSED (cap) |

## F. Ready-to-run query plan (for a re-run once the cap is raised)

Use `extended` for numbers and 2025-2026 material; `standard` for discovery. Put exact titles in quotes.

- T1: "Free pass or failing grade for saturated fats" STAT 2025; "Seven Countries Study" 25-year follow-up saturated fat coronary mortality Menotti Kromhout; Yerushalmy Hilleboe 1957 22 countries Keys response; Hooper 2020 Cochrane saturated fat criticism commentary; Hu Willett response Astrup 2020 JACC "food-based"; Mozaffarian saturated fat dairy meat food-based 2025; Teicholz "The Big Fat Surprise" review criticism; Hegsted McGovern "Dietary Goals for the United States" history.
- T2: Lundh Cochrane "Industry sponsorship and research outcome"; Nestle "Food industry funding of nutrition research" JAMA Intern Med 2016; dairy-industry-funded saturated fat or dairy fat studies sponsorship conclusions; Malaysian Palm Oil Board funded cardiovascular trial; Philippine coconut research funding conflict; AHA corporate sponsorship pharma guideline-author conflicts 2024; Nutrition Coalition funding.
- T3: Ioannidis 2018 JAMA "The Challenge of Reforming Nutritional Epidemiologic Research"; Ioannidis "Implausible results in human nutrition research" BMJ 2013; Satija "Understanding nutritional epidemiology and its role in policy" 2015; nutrition RCT adherence blinding duration surrogate endpoints limitations statement.
- T4: Norwitz 2022 "lean mass hyper-responder" LDL-C ketogenic; Budoff 2024 KETO-CTA carbohydrate restriction LDL atherosclerosis; Kirkpatrick 2019 National Lipid Association low-carbohydrate ketogenic scientific statement; meta-analysis randomized low-carbohydrate diet LDL-C change; familial hypercholesterolaemia dietary saturated fat guideline; lipoprotein(a) dietary saturated fat replacement; APOE genotype LDL response saturated fat; saturated fat children under 2 AAP AHA recommendation; STRIP Turku infancy dietary counselling; ketogenic or carnivore diet randomized trial cardiovascular events.
- T5: Johnson Fritsche 2012 linoleic acid inflammation; Su 2017 linoleic acid inflammatory markers meta-analysis; Farvid 2014 Circulation linoleic acid CHD; Marklund 2019 Circulation omega-6 biomarkers; Hooper 2018 Cochrane "Omega 6 fats for the primary and secondary prevention of cardiovascular disease"; Ramsden 2013 BMJ Sydney Diet Heart; Ramsden 2016 BMJ Minnesota Coronary Experiment; seed oils inflammation claim expert review; DiNicolantonio O'Keefe 2018 Open Heart omega-6; Neelakantan 2020 coconut oil LDL; butter or beef tallow versus oils LDL trial.
- T6: beef tallow health claims fact check 2025; seed oils claims experts 2025 RFK Jr; 2025-2030 Dietary Guidelines saturated fat butter tallow experts AHA response; MAHA report seed oils evidence.
- T7: 2025 ESC EAS focused update dyslipidaemia saturated fat; HEART UK saturated fat position 2024 2025; British Heart Foundation saturated fat; Heart Foundation Australia dietary fats position update; National Lipid Association saturated fat statement 2025; AHA and ACC response to 2025-2030 Dietary Guidelines saturated fat.
- Also retrieve the COI of the AHA 2017 advisory authors and of Kris-Etherton, to balance S7-13.
