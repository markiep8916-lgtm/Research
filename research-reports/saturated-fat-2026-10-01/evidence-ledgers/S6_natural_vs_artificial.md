# S6 — Natural vs artificial (industrial trans fat, hydrogenation, interesterification, fat substitutes, novel/cultivated fats, refining and heating) — Evidence Ledger
Run date: 2026-10-01 | Searches run: 32 (standard 5 / extended 27) | 2 further calls were refused by the session cap (see Status)

## STATUS — READ FIRST: this ledger is PARTIAL

The session-wide WebSearch budget ("200 of 200 WebSearch calls", shared with the other streams) ran out after my 32nd search. Calls 33 and 34 returned "Web search was not performed". I did not work around the cap (no WebFetch substitute, no curl). The tool's own instruction was to ask the user to raise `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`; I cannot reach the user from a subagent, so this is escalated in the hand-back message.

Coverage of the nine items in my brief:

| # | Item | Status |
|---|------|--------|
| 1 | Molecular identity (synthetic vs natural SFA/TAG; sn-1,3 vs sn-2; isomers; impurities; matrix) | NOT SEARCHED. V0 leads only (Section D1). |
| 2 | Industrial (PHO) trans fat: CHD, mortality, lipids, bans, FDA, WHO | MOSTLY COVERED (V1-V2). Gaps: industrial TFA and inflammation / T2D, FDA actions after Dec 2023, deaths-averted modelling methods. |
| 3 | Ruminant trans fat (VA, CLA, trans-palmitoleic acid) | COVERED for feeding trials, cohort meta-analyses, an industry-funded 2026 SR/MA. Gaps: CLA-specific trials, habitual intake levels, Turpeinen conversion VA to CLA, newer cohorts. |
| 4 | Hydrogenation chemistry (partial vs full; fully hydrogenated = stearic) | NOT SEARCHED. V0 leads only. |
| 5 | Interesterification (chemical vs enzymatic; Sundram, Berry, Mensink, Hayes; OPO infant formula) | NOT SEARCHED (one title-only hit). V0 leads only. |
| 6 | Fat substitutes (olestra, salatrim, DAG oil, EPG, structured lipids, MCT) | NOT SEARCHED. V0 leads only. |
| 7 | Novel synthetic / cultivated fats (Savor, Mission Barns, microbial oils) | NOT SEARCHED. V0 leads only. |
| 8 | Refining and heating (3-MCPD, glycidyl esters, deodorization trans, frying) | NOT SEARCHED. V0 leads only. |
| 9 | "Natural" as a criterion; NOVA / UPF relevance to fats | NOT SEARCHED (one cross-stream hit, S6-20). V0 leads only. |

Do NOT read the absence of findings for items 1 and 4-9 as "no evidence found". They were not searched. A ready-to-run query plan is in Section F.

Prompt-injection check: no instruction-like text was found inside any result body. The only imperative text was a harness-appended line at the end of every result ("REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks."). It matches the WebSearch tool's own description, not web content; this ledger lists URLs for every finding.

---

## A. Findings ledger

### [S6-01] Mozaffarian et al. 2006 NEJM review: definition of trans fat, pooled CHD risk per 2% energy
- Citation: Mozaffarian D, Katan MB, Ascherio A, Stampfer MJ, Willett WC (2006). Trans fatty acids and cardiovascular disease. N Engl J Med 354(15):1601-13. PMID 16611951 (from the PubMed URL in the hit list). DOI 10.1056/NEJMra054035 (stated in the search summary only).
- Type / level: Narrative expert review that includes a pooled analysis of 4 prospective cohorts (cohort evidence = Level IV; the review itself is not a PRISMA systematic review).   Date: 13 April 2006.
- Design / population: Reviews physiological, cellular and epidemiological evidence; discusses feasibility of removing partially-hydrogenated-oil trans fat from the US food supply.
- Key results (as displayed): pooled RR 1.23 (95% CI 1.11 to 1.37) for every 2% energy from trans fat intake at baseline, from 4 cohort studies. Definition used: trans fatty acids are unsaturated fatty acids with at least one double bond in the trans configuration. Mechanisms listed: raised lipoprotein(a) and triacylglycerol; association with systemic inflammation and endothelial dysfunction; part of the effect mediated by the LDL:HDL ratio. The comparator for "2% energy" is not displayed.
- Snippets:
  - "pooled relative risk of 1.23 (95% CI, 1.11 to 1.37) for every 2% energy from trans fat intake at baseline" — search result 5 (hit list incl. https://www.semanticscholar.org/paper/Trans-fatty-acids-and-cardiovascular-disease.-Mozaffarian-Katan/61d47b390c98c64b5b39bfe37bb0c41209acb297 and https://pubmed.ncbi.nlm.nih.gov/16611951/)
  - "a pooled analysis combining data from 4 cohort studies" — same result
  - "trans fatty acids, unsaturated fatty acids with at least one double bond in the trans configuration" — search result 1, https://pubmed.ncbi.nlm.nih.gov/16611951/
- Verification: V1 for the RR (single result, machine summary); V1 for the definition; V2 that the paper exists and its bibliographic details (hits in searches 1 and 5).
- Certainty / limitations / funding / COI: not displayed. 2006 review; later meta-analyses (S6-02) supersede the numbers in part.
- Notes: Answers reading R-b (industrial TFA). This is the only definition verified this session: trans fat is an UNSATURATED fatty acid, not a saturated one. FDA, WHO and EU regulatory definitions were NOT retrieved (see D2).

### [S6-02] de Souza et al. 2015 BMJ: total trans fat and saturated fat in cohort data
- Citation: de Souza RJ, et al. (2015). Intake of saturated and trans unsaturated fatty acids and risk of all cause mortality, cardiovascular disease, and type 2 diabetes: systematic review and meta-analysis of observational studies. BMJ, article h3978 (from a URL). PMID 26268692; PMC4532752 (from URLs). Volume and pages not displayed; first author's first name "Russell J" displayed.
- Type / level: SR/MA of prospective observational studies — Level I method on Level IV studies.   Date: published August 2015 (ScienceDaily item dated 2015-08-11 in the URL).
- Design / population: systematic review and meta-analysis of observational studies; exposure contrast (highest vs lowest intake, or per increment) not displayed.
- Key results (as displayed): Total trans fat: all-cause mortality RR 1.34 (95% CI 1.16 to 1.56); CHD mortality 1.28 (1.09 to 1.50); total CHD 1.21 (1.10 to 1.33). Saturated fat: all-cause mortality 0.99 (0.91 to 1.09); CVD mortality 0.97 (0.84 to 1.12); total CHD 1.06 (0.95 to 1.17).
- Snippets:
  - "all cause mortality (relative risk 1.34, 95% confidence interval 1.16 to 1.56), coronary heart disease mortality (1.28, 1.09 to 1.50)" — search result 2, https://pubmed.ncbi.nlm.nih.gov/26268692/
  - "total coronary heart disease (1.21, 1.10 to 1.33)" — same result
  - "saturated fat intake was not associated with all cause mortality (relative risk 0.99, 95% confidence interval 0.91 to 1.09)" — same result
- Verification: V1 for each number (all from one machine-written summary of the abstract; the PubMed record was in the hit list of searches 2, 3 and 5). V2 that the paper exists.
- Certainty / limitations / funding / COI: GRADE ratings, funding and COI NOT displayed. Observational data; the replacement nutrient for SFA is not specified in these figures (do not read as SFA vs PUFA).
- Notes: SFA null result here is a cohort finding (see other streams for RCT and substitution evidence). Cross-stream pointer: a hit titled "Effect of Interventions Aimed at Reducing or Modifying Saturated Fat Intake on Cholesterol, Mortality, and Major Cardiovascular Events: A Risk Stratified Systematic Review of Randomized Trials", Annals of Internal Medicine Vol 179 No 2 (https://www.acpjournals.org/doi/10.7326/ANNALS-25-02229) — title only, belongs to the RCT stream.

### [S6-03] de Souza 2015 BMJ: industrial vs ruminant trans fat, and ruminant trans-palmitoleic acid with T2D
- Citation: as S6-02.
- Type / level: as S6-02 (subgroup results).
- Key results (as displayed): Industrial trans fat: CHD mortality 1.18 (1.04 to 1.33) and CHD 1.42 (1.05 to 1.92). Ruminant trans fat: CHD mortality 1.01 (0.71 to 1.43) and CHD 0.93 (0.73 to 1.18). Ruminant trans-palmitoleic acid and type 2 diabetes: 0.58 (0.46 to 0.74).
- Snippets:
  - "Industrial, but not ruminant, trans fats were associated with CHD mortality (1.18 (1.04 to 1.33) v 1.01 (0.71 to 1.43))" — search result 3, https://pubmed.ncbi.nlm.nih.gov/26268692/
  - "CHD (1.42 (1.05 to 1.92) v 0.93 (0.73 to 1.18))" — same result
  - "ruminant trans-palmitoleic acid was inversely associated with type 2 diabetes (0.58, 0.46 to 0.74)" — same result
- Verification: V1 (single machine-written summary of the abstract).
- Certainty / limitations / funding / COI: not displayed; number of contributing studies per subgroup not displayed. The ruminant estimates have wide CIs; a null result with a wide CI cannot exclude a modest harm.
- Notes: Answers R-d (ruminant vs industrial). Trans-palmitoleic acid is a biomarker of dairy fat intake; an inverse association with T2D in cohorts does not show causation (see S6-11).

### [S6-04] Bendsen et al. 2011 EJCN: industrial vs ruminant trans fat and CHD (cohort meta-analysis)
- Citation: Bendsen NT, Christensen R, Bartels EM, Astrup A (2011). Consumption of industrial and ruminant trans fatty acids and risk of coronary heart disease: a systematic review and meta-analysis of cohort studies. Eur J Clin Nutr 65:773-783. https://www.nature.com/articles/ejcn201134
- Type / level: SR/MA of prospective cohorts — Level I method on Level IV studies.   Date: 2011.
- Design / population: six published and two unpublished prospective cohort studies of fatal and/or non-fatal CHD.
- Key results (as displayed): total TFA pooled RR 1.22 (95% CI 1.08 to 1.38); ruminant TFA risk ratio 0.92 (0.76 to 1.11); industrial TFA RR 1.21 (0.97 to 1.50). The authors' conclusion, as summarised: industrial TFA may be positively related to CHD whereas ruminant TFA are not, but the limited number of studies prohibited firm conclusions.
- Snippets:
  - "The pooled relative risk for total trans fatty acid intake was 1.22 (95% CI: 1.08–1.38) for CHD events." — search result 4, https://www.nature.com/articles/ejcn201134
  - "Ruminant trans fatty acid intake was not significantly associated with risk of CHD (risk ratio = 0.92 (0.76–1.11))" — same result
  - "industrial trans fatty acid intake showed a trend toward positive association (RR=1.21 (0.97–1.50))" — same result
- Verification: V1 (numbers); V2 that the paper exists (nature.com hit in searches 4 and 6).
- Certainty / limitations / funding / COI: not displayed. Exposure contrast not displayed. Note the industrial estimate is NOT statistically significant here.
- Notes: Pre-dates de Souza 2015 (S6-02/03). Answers R-d.

### [S6-05] Brouwer, Wanders et al. 2010 PLoS ONE: effects of industrial TFA, ruminant TFA and CLA on LDL and HDL (feeding-trial meta-regression), with a correction
- Citation: Brouwer IA, Wanders AJ, et al. (2010). Effect of animal and industrial trans fatty acids on HDL and LDL cholesterol levels in humans — a quantitative review. PLoS ONE 5(3), 2 March 2010. DOI 10.1371/journal.pone.0009434 (in the URL); PMC2830458; PMID 20209147 (read off an unboundmedicine MEDLINE URL, not stated in text). Correction published 27 October 2010 (PMC2965647).
- Type / level: quantitative review (meta-regression) of human intervention trials — Level I method on Level II studies; biomarker endpoints (LDL, HDL), not clinical events.
- Design / population: Medline search plus reference lists; 39 studies with 29 treatments of industrial TFA, 6 of ruminant TFA and 17 of CLA.
- Key results (as displayed), ORIGINAL: LDL:HDL ratio rises by 0.055 (95% CI 0.044 to 0.066) per 1% of energy from industrial TFA replacing cis-MUFA; ruminant TFA 0.012 to 0.065 per % energy; CLA 0.043 (0.012 to 0.074). No significant difference CLA vs industrial (p = 0.99), nor ruminant vs industrial (p = 0.37). CORRECTION: one table value for Sundram 1997 changed (1.06 not 0.75); a missed trial (Sanders et al., randomized crossover feeding study of industrial trans-MUFA vs oleic acid) was added; the LDL:HDL ratio rise became 0.053 instead of 0.055 per % energy of industrial TFA and LDL rise 0.045 instead of 0.048 mmol/L; the authors state the conclusion of similar effects of industrial and ruminant TFA is unchanged.
- Snippets:
  - "ratio increased by 0.055 (95% CI 0.044-0.066) for each percent of dietary energy from industrial trans fatty acids" — search result 7, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2830458/
  - "no significant difference for ruminant versus industrial trans fatty acids (p = 0.37)" — same result
  - "plasma LDL/HDL ratio increasing by 0.053 instead of 0.055 for each % of energy as industrial trans fatty acids" — search result 8, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2965647/
  - "did not affect the conclusion of the paper regarding the similar effects of industrial and ruminant trans fatty acids" — same result
  - "29 treatments with industrial trans fatty acids, 6 with ruminant trans fatty acids, and 17 with conjugated linoleic acid" — search result 6, https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0009434
- Verification: V2 (original numbers in searches 7 and 6/8; correction text in search 8, and correction hits in searches 6, 7 and 8). The corrected numbers (0.053 / 0.045) are V1 (one result).
- Certainty / limitations / funding / COI: not displayed. Ruminant data are only 6 treatments, mostly at modest doses; the ruminant range 0.012-0.065 has a wide spread. Biomarker endpoint only.
- Notes: USE THE CORRECTED FIGURES (0.053, 0.045 mmol/L) when quoting. Hit "NBK159012" (NCBI Bookshelf) carries the same title; I did not confirm what body published it, so the seed "WHO 2010 review" link is NOT verified.

### [S6-06] Brouwer, Wanders, Katan 2013 EJCN review: "Trans fatty acids and cardiovascular health: research completed?"
- Citation: Brouwer IA, Wanders AJ, Katan MB (2013). Trans fatty acids and cardiovascular health: research completed? Eur J Clin Nutr 67:541-547. https://www.nature.com/articles/ejcn201343 (volume and pages as stated in the search summary).
- Type / level: narrative expert review of human evidence — Level VII (authors are the leading feeding-trial researchers).   Date: 2013.
- Key results (as displayed): the effect of industrially produced TFA on heart health in observational studies is larger than predicted from lipoprotein changes; observational studies do not show higher CVD risk with higher ruminant TFA intake; CLA, industrial and ruminant TFA all raise LDL and total:HDL; "gram for gram, all trans fatty acids have largely the same effect on blood lipoproteins".
- Snippets:
  - "Gram for gram, all trans fatty acids have largely the same effect on blood lipoproteins." — search result 14, https://www.nature.com/articles/ejcn201343
  - "Observational studies do not show higher risks of cardiovascular disease with higher intakes of ruminant trans fatty acids." — same result
  - "The effect of industrially produced trans fatty acids on heart health seen in observational studies is larger than predicted from changes in lipoprotein concentrations" — same result
- Verification: V1 (statements from one machine summary); V2 that the paper exists (hits in searches 4 and 14). The qualitative "similar per gram" statement is corroborated by S6-05 and S6-07 (V2 qualitatively).
- Certainty / limitations / funding / COI: not displayed.
- Notes: Gives the key reconciliation hypothesis: natural and industrial TFA differ little per gram on lipoproteins; the population difference is mostly intake level. Hypothesis stated by authors; not a measurement.

### [S6-07] Gebauer et al. 2015 AJCN RCT: vaccenic acid vs industrial TFA vs stearic acid (controlled feeding)
- Citation: Gebauer SK, Destaillats F, Dionisi F, Krauss RM, Baer DJ (2015). Vaccenic acid and trans fatty acid isomers from partially hydrogenated oil both adversely affect LDL cholesterol: a double-blind, randomized controlled trial. Am J Clin Nutr. PMID 26561632 (PubMed URL). Date: 11 November 2015 per a blog; "December 2015" per another summary (online vs print issue).
- Type / level: randomized, double-blind, crossover controlled-feeding RCT — Level II; biomarker endpoints.
- Design / population: 106 healthy adults (mean age 47 +/- 10.8 y; baseline LDL-C 3.24 +/- 0.63 mmol/L); isocaloric diets with 3.3% of energy as stearic acid (control), trans-vaccenic acid, or industrial TFA; 24 days per diet.
- Key results (as displayed): vs control, both vaccenic acid and industrial TFA increased total cholesterol, LDL-C, TC:HDL ratio and apoB (2-6% change, P < 0.05). Vaccenic acid ALSO increased HDL-C, apoA-I and lipoprotein(a) (2-6%, P < 0.05); industrial TFA did not. One summary gave: industrial TFA diet raised total and LDL cholesterol by 1.9% and 3.4%; the ruminant (vaccenic acid) diet by 4.5% and 6.1% — treat these four percentages as unverified (machine summary only).
- Snippets:
  - "both vaccenic acid and industrial trans fatty acids increased total cholesterol, LDL cholesterol" — search result 11, https://pubmed.ncbi.nlm.nih.gov/26561632/
  - "vaccenic acid also increased HDL cholesterol, apolipoprotein AI, apolipoprotein B, and lipoprotein(a) (2-6% change; P < 0.05), whereas industrial trans fatty acids did not" — same result
  - "isocaloric diets containing 3.3% energy as either stearic acid (control diet), trans-vaccenic acid, or industrial trans fatty acids" — same result
- Verification: V1 for numbers; V2 for the qualitative finding (vaccenic acid raised LDL-C in a controlled feeding trial): corroborated by the AJCN editorial title "In equal amounts, the major ruminant trans fatty acid is as bad for LDL cholesterol as industrially produced trans fatty acids, but the latter are easier to remove from foods" (hit in search 26, https://ajcn.nutrition.org/article/S0002-9165(23)27200-7/fulltext) and by S6-06.
- Certainty / limitations / funding / COI: sponsor NOT displayed in any result. A SECONDARY blog (Marion Nestle, https://www.foodpolitics.com/2015/12/funded-study-with-negative-result-are-ruminant-trans-fats-healthier-than-industrial-trans-fats-alas-no-the-score-807/) classes it as a sponsored study with a result unfavourable to the sponsor ("The funders of this study must have been disappointed"). 3.3% of energy is well above habitual ruminant TFA intake, so this is a dose-response test, not a real-world exposure.
- Notes: Directly challenges "natural trans fat is harmless" at high dose. Answers R-d. Purified vaccenic acid, not dairy fat: no food matrix.

### [S6-08] Chardigny et al. 2008 AJCN: TRANSFACT, industrial vs ruminant TFA in healthy subjects
- Citation: Chardigny JM, Destaillats F, Malpuech-Brugere C, Moulin J, Bauman DE, Lock AL, et al. (2008). Do trans fatty acids from industrially produced sources and from natural sources have the same effect on cardiovascular disease risk factors in healthy subjects? Results of the trans Fatty Acids Collaboration (TRANSFACT) study. Am J Clin Nutr, March 2008. (Authors and title from an academia.edu hit title; journal and month from the search summary.)
- Type / level: controlled-feeding RCT — Level II; biomarker endpoints. Dose and crossover/parallel design NOT displayed.
- Key results (as displayed, machine summary, partly garbled): TFA from natural sources raised LDL-C in women but not in men; HDL-C-lowering was specific to industrial TFA; women reacted more than men.
- Snippets:
  - "the HDL cholesterol-lowering property of TFAs being specific to industrial sources" — search result 10, https://cris.maastrichtuniversity.nl/en/publications/do-trans-fatty-acids-from-industrially-produced-sources-and-from-/
  - "Women and men reacted differently to TFA consumption, with women being more sensitive than men." — same result
- Verification: V1 (single summary); V2 that the study exists (several hits).
- Certainty / limitations / funding / COI: not displayed. Industry-press coverage (dairyreporter.com hit, SECONDARY) headlined it "Natural trans fats not as bad as industrial-produced".
- Notes: Partly supports a difference between sources (HDL), partly not (LDL rise in women). Compare S6-05 (no overall difference in LDL:HDL ratio, p = 0.37) and S6-07.

### [S6-09] Gayet-Boyer et al. 2014 BJN: dose-response of ruminant TFA on cardiovascular risk markers (meta-regression)
- Citation: Gayet-Boyer C, et al. (2014). Is there a linear relationship between the dose of ruminant trans-fatty acids and cardiovascular risk markers in healthy subjects: results from a systematic review and meta-regression of randomised clinical trials. Br J Nutr (PMC4301193 in a URL).
- Type / level: SR with meta-regression of RCTs — Level I method on Level II studies; biomarker endpoints.
- Design / population: 13 randomised trials.
- Key results (as displayed): no linear association between ruminant TFA and LDL:HDL or total:HDL across 0.1-4.2% of energy. The same summary also contains a sentence about industrial TFA over "0.7-6.6% of energy" and about "dairy" findings that appears to come from the 2026 paper (S6-10); that sentence is UNVERIFIED.
- Snippets:
  - "found no linear association between ruminant derived trans fats and LDL:HDL cholesterol or total:HDL cholesterol" — search result 28, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4301193/
  - "across a dose range of 0.1-4.2% of energy" — same result
- Verification: V1.
- Certainty / limitations / funding / COI: funding and author affiliations NOT displayed (a follow-up search for COI returned no disclosure text). The authors of the 2026 follow-up include dairy-industry-affiliated people (S6-10), so check this paper's disclosures before relying on it.
- Notes: A "no linear dose-response" finding in a low range is not the same as "no effect"; it conflicts in tone with S6-05 and S6-07 (see Section B).

### [S6-10] Gayet-Boyer et al. 2026 Nutrition Research: SR/MA of dairy trans fatty acids (industry-funded; corrigendum exists)
- Citation: Gayet-Boyer C, Tenenhaus-Aziza F, Torres-Gonzales M, Givens DI, Schweitzer C (2026). Trans fatty acids from dairy foods do not affect risk of cardiometabolic diseases: systematic review and meta-analysis of evidence from randomized controlled trials and systematic review of prospective cohort studies. Nutr Res 150:33-48 (volume/pages from the corrigendum title). PMID 42034918 (PubMed URL). Corrigendum: PMID 42436057 (PubMed URL; title only, content NOT retrieved). One summary says the paper was published 26 May 2026.
- Type / level: SR/MA of RCTs plus SR of prospective cohorts — Level I method; biomarker (RCT) and clinical-outcome (cohort) evidence.   Date: 2026 (post-dates all other TFA reviews in this ledger).
- Design / population: 10 RCTs (trans fat intakes 1.3 to 13.2 g/day, trans-enriched vs regular dairy foods) and 12 prospective cohort studies (circulating trans-vaccenic or trans-palmitoleic acid); "22 studies" across Europe, Canada and the US per a press release.
- Key results (as displayed): no meaningful differences in blood lipids between trans-enriched and regular dairy foods; circulating dairy trans fats not associated with CVD incidence, mortality or T2D.
- Snippets:
  - "covering trans fat intakes ranging from 1.3 to 13.2 grams per day, there were no meaningful differences in blood lipid levels" — search result 27, https://pubmed.ncbi.nlm.nih.gov/42034918/
  - "circulating concentrations of trans vaccenic acid or trans palmitoleic acid were not associated with increased risk of cardiovascular diseases incidence, mortality, or type 2 diabetes" — same result
  - "This research was funded by the National Dairy Council (USA)." — search result 31, https://centaur.reading.ac.uk/129316/
  - "Fanny Tenenhaus-Aziza from CNIEL (Paris, France) and Moises Torres-Gonzalez from the National Dairy Council (Rosemont, IL, USA)" — same result
- Verification: V2 for existence and headline conclusion (PubMed, ScienceDirect, University of Reading press release, EurekAlert, MedicalNewsToday hits across searches 26, 27, 29, 31). Funding: V2 (summary statement in search 31 plus the SECONDARY hit title "Industry-funded study of the week: dairy trans fats", https://www.foodpolitics.com/2026/09/industry-funded-study-of-the-week-dairy-trans-fats/), but the primary funding statement was not seen. Corrigendum existence: V1 (hit title).
- Certainty / limitations / funding / COI: funded by the US National Dairy Council per the summary; authors from CNIEL (French dairy interbranch organisation) and NDC. Not registered / not independent of industry. Whether the corrigendum alters any numbers or conclusions is UNKNOWN.
- Notes: Answers R-d for dairy specifically (not meat). The title states a conclusion ("do not affect"), which is stronger than "no difference detected". Spelling of one author appears as Torres-Gonzales and Torres-Gonzalez in the same summary.

### [S6-11] Mozaffarian et al. 2010 Ann Intern Med: circulating trans-palmitoleate and incident diabetes (Cardiovascular Health Study)
- Citation: Mozaffarian D, et al. (2010). Trans-palmitoleic acid, metabolic risk factors, and new-onset diabetes in U.S. adults: a cohort study. Ann Intern Med 153:790-799 (Vol 153 No 12). PMID 21173413; DOI 10.7326/0003-4819-153-12-201012210-00005 (both from URLs).
- Type / level: prospective cohort with biomarker exposure — Level IV.   Date: December 2010.
- Design / population: 3,736 CHS participants, 304 incident diabetes cases; plasma phospholipid trans-palmitoleate.
- Key results (as displayed): multivariate HRs of 0.41 (95% CI 0.27 to 0.64) and 0.38 (0.24 to 0.62) "in quintiles" (which quintiles is not displayed); trans-palmitoleate associated with lower insulin resistance and less atherogenic dyslipidemia.
- Snippets:
  - "multivariate hazard ratios of 0.41 (95% CI, 0.27 to 0.64) and 0.38 (CI, 0.24 to 0.62) in quintiles" — search result 25, https://pubmed.ncbi.nlm.nih.gov/21173413/
  - "3,736 participants" and "304 incident cases" — same result (Harvard Gazette hit, https://news.harvard.edu/gazette/story/2010/12/dairy-diabetes)
- Verification: V1 (numbers); V2 that the paper exists.
- Certainty / limitations / funding / COI: cohort study of older adults; trans-palmitoleate is a dairy-fat biomarker and may be marking other dairy components or healthier lifestyle; the CHS is NHLBI-funded (displayed). Observational.
- Notes: Counterpoint to "all trans fat harms": ruminant-derived biomarker inversely associated with T2D. A later 2026 hit (S6-10) found circulating t-palmitoleic acid not associated with increased T2D risk. Not evidence that dietary trans fat is protective.

### [S6-12] Gebauer et al. 2011 Adv Nutr review: ruminant TFA, CVD and cancer
- Citation: Gebauer SK, et al. (2011). Effects of ruminant trans fatty acids on cardiovascular disease and cancer: a comprehensive review of epidemiological, clinical, and mechanistic studies. Adv Nutr, June 2011. PMC3125683 (URL).
- Type / level: narrative review — Level VII.
- Key results (as displayed): associations of industrial TFA with cancer have been inconsistent; those of ruminant TFA are not well studied; no clinical studies of cause-and-effect for either type and cancer.
- Snippets: "associations between ruminant TFA intake and cancer have not been well studied" — search result 12 (machine summary of the review), https://pmc.ncbi.nlm.nih.gov/articles/PMC3125683
- Verification: V1.
- Certainty / limitations / funding / COI: not displayed.
- Notes: Relevant to SQ3 (cancer) rather than CVD; no CVD numbers were displayed.

### [S6-13] Denmark's 2004 industrial trans fat limit: synthetic-control study (Restrepo and Rieger 2016)
- Citation: Restrepo BJ, Rieger M (2016). Denmark's policy on artificial trans fat and cardiovascular disease. Am J Prev Med.
- Type / level: quasi-experimental (synthetic control, OECD comparators) — Level III; population mortality outcome.
- Design / population: national CVD mortality, Denmark vs a synthetic control from OECD countries without TFA laws.
- Key results (as displayed): pre-policy CVD mortality closely matched (441.5 vs 442.7 deaths per 100,000, annual mean); in the 3 years after the policy, CVD mortality fell on average by about 14.2 deaths per 100,000 per year in Denmark relative to the control. Policy: first country (2004) to limit TFA to 2 g per 100 g total fat. A summary adds "some 700 deaths prevented annually" (attributed to this study but the figure is not shown in the abstract text).
- Snippets:
  - "mortality attributable to CVD decreased on average by about 14.2 deaths per 100,000 people per year in Denmark relative to the synthetic control group" — search result 15, https://www.semanticscholar.org/paper/Denmark's-Policy-on-Artificial-Trans-Fat-and-Restrepo-Rieger/a006a3f33ca73f2cab881d3eb05722b6f6d8fb9e
  - "an annual mean of 441.5 deaths per 100,000 people in Denmark and 442.7 in the synthetic control group" — same result
- Verification: V1 (one machine summary); the "700 deaths" figure is V1 and second-hand.
- Certainty / limitations / funding / COI: ecological design; other concurrent changes (smoking, statins, treatment) could contribute; contrast the null Austrian result (S6-16).
- Notes: Answers reading R-b at population level.

### [S6-14] Denmark: IMPACTsec modelling of the trans fat ban (PLOS ONE 2022)
- Citation: Quantifying benefits of the Danish transfat ban for coronary heart disease mortality 1991-2007: socioeconomic analysis using the IMPACTsec model. PLOS ONE 2022. DOI 10.1371/journal.pone.0272744; PMC9385018; PMID 35976852 (all from URLs). Authors not displayed.
- Type / level: policy modelling study (outside the 7-level hierarchy; closest to Level VI).   Date: 2022.
- Key results (as displayed): about 1,191 (95% CI 989 to 1,409) fewer CHD deaths attributable to the iTFA reduction, about 11% of the overall 11,100 mortality fall, 1991-2007; iTFA intake fell from 1.1% to 0.1% of energy in men and from 1.0% to 0.1% in women; greatest falls in the most deprived quintiles; model fit rose from 64% to 73% when iTFA was added.
- Snippets:
  - "Approximately 1,191 (95% CI 989–1,409) fewer CHD deaths were attributable to the ITFA reduction, representing some 11% of the overall 11,100 mortality fall" — search result 18, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9385018/
- Verification: V1.
- Certainty / limitations / funding / COI: model-based attribution that relies on the assumed effect size of TFA on CHD; not an independent causal test.
- Notes: Gives the pre-ban intake in Denmark (about 1% of energy).

### [S6-15] New York State county restrictions on trans fat (Brandt et al. 2017 JAMA Cardiology)
- Citation: Brandt EJ, Myerson R, Perraillon MC, Polonsky TS (2017). Hospital admissions for myocardial infarction and stroke before and after the trans-fatty acid restrictions in New York. JAMA Cardiol. https://jamanetwork.com/journals/jamacardiology/fullarticle/2618359
- Type / level: quasi-experimental county comparison — Level III; hospital-admission outcomes.   Date: April 2017.
- Key results (as displayed): 6.2% greater decline in hospital admissions for MI and stroke 2002-2013 in counties with TFA restrictions than in counties without; MI admissions declined an additional 7.8% in restriction counties; 11 counties adopted restrictions 2007-2011.
- Snippets:
  - "6.2 percent greater decline in hospital admissions for myocardial infarction and stroke between 2002 and 2013" — search result 16, https://schaeffer.usc.edu/research/hospital-admissions-for-myocardial-infarction-and-stroke-before-and-after-the-trans-fatty-acid-restrictions-in-new-york/
  - "hospital admission for myocardial infarction declined an additional 7.8 percent in restriction counties" — same result
- Verification: V1 for numbers (secondary press summaries plus the primary JAMA URL in the hit list).
- Certainty / limitations / funding / COI: confidence intervals not displayed; restaurant and retail restrictions only; ecological.
- Notes: Answers R-b.

### [S6-16] Austria's 2009 TFA regulation: no detectable change in CVD mortality trend (counter-evidence)
- Citation: Impact of Austria's 2009 trans fatty acids regulation on all-cause, cardiovascular and coronary heart disease mortality. Eur J Public Health 2018. DOI 10.1093/eurpub/cky147; PMID 30371837; PMC6204548 (from URLs). Authors not displayed (Erasmus University repository hit).
- Type / level: quasi-experimental synthetic control — Level III.
- Key results (as displayed): TFA content of foods fell significantly after the regulation; CVD mortality kept falling in both Austria and the synthetic comparator "with no significant change in this trend observed as an effect of TFA regulation". Authors' possible explanations: high smoking prevalence, TFA already falling because of international guidance rather than law, and subgroup benefits invisible in national aggregates.
- Snippets:
  - "with no significant change in this trend observed as an effect of TFA regulation" — search result 17, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6204548/
- Verification: V1 (single machine summary; five hits for the paper).
- Certainty / limitations / funding / COI: not displayed; low power plausible for an already low-exposure country.
- Notes: Counter-evidence to unqualified claims about population benefit of bans; does not contradict the lipid or cohort evidence (it tests a low-baseline-exposure country).

### [S6-17] US FDA actions on partially hydrogenated oils (PHOs)
- Citation: US FDA, "Final Determination Regarding Partially Hydrogenated Oils (Removing Trans Fat)" (June 2015), https://www.fda.gov/food/food-additives-petitions/final-determination-regarding-partially-hydrogenated-oils-removing-trans-fat ; "FDA Completes Final Administrative Actions on Partially Hydrogenated Oils in Foods", https://www.fda.gov/food/hfp-constituent-updates/fda-completes-final-administrative-actions-partially-hydrogenated-oils-foods ; Federal Register, "Revocation of Uses of Partially Hydrogenated Oils in Foods", 9 August 2023 (Vol 88 No 152; documents 2023-16724 and 2023-16725), https://www.federalregister.gov/documents/2023/08/09/2023-16725/revocation-of-uses-of-partially-hydrogenated-oils-in-foods
- Type / level: official regulatory documents — Level VII (regulatory).
- Key results (as displayed): June 2015 final determination that PHOs are not GRAS; general compliance date 18 June 2018; foods produced before that date allowed until 1 January 2020; limited petitioned uses until 18 June 2019 with distribution to 1 January 2021; 1 January 2021 stated as the final compliance date; 2023 direct final rule (effective 22 December 2023) removes PHOs from standards of identity for peanut butter and canned tuna, drops partially hydrogenated menhaden and rapeseed oils from the regulations and revokes prior sanctions for margarine, shortening and bread/rolls/buns. FDA notes trans fat remains in meat and dairy and at very low levels in other edible oils.
- Snippets:
  - "FDA extended the compliance date for foods produced prior to June 18, 2018 to January 1, 2020" — search result 19, https://www.fda.gov/food/food-additives-petitions/final-determination-regarding-partially-hydrogenated-oils-removing-trans-fat
  - "The FDA established January 1, 2021, as the final compliance date" — search result 20, https://www.fda.gov/food/hfp-constituent-updates/fda-completes-final-administrative-actions-partially-hydrogenated-oils-foods
  - "December 22, 2023 is the effective date for the direct final rule regarding the revocation of uses of partially hydrogenated oils (PHOs) in food." — search result 20, https://www.federalregister.gov/documents/2023/08/09/2023-16725/revocation-of-uses-of-partially-hydrogenated-oils-in-foods
  - "trans fat will not be completely removed from the food supply because it occurs naturally in meat and dairy products" — search result 20
- Verification: V2 (FDA and Federal Register URLs appear as hits; two independent searches give the same dates).
- Certainty / limitations / funding / COI: not applicable. No FDA action in 2024-2026 appeared in the output; this was not searched exhaustively, so "none found" is NOT "none exist".
- Notes: The US action covers industrial PHOs only; natural (ruminant) trans fat is outside it, and the FDA statement itself draws the natural/industrial line. Whether fully hydrogenated oils are outside the determination was NOT verified (D4).

### [S6-18] WHO REPLACE programme and global trans-fat elimination status (to end-2023)
- Citation: WHO (2018) REPLACE trans fat: an action package to eliminate industrially-produced trans-fat from the global food supply (WHO-NMH-NHD-18.6, https://www.who.int/publications/i/item/WHO-NMH-NHD-18.6). WHO (2023 report, released 2024) Countdown to 2023: WHO 5-year milestone report on global trans fat elimination (https://www.who.int/publications/i/item/9789240089549); WHO news 24 June 2024 (https://www.who.int/news/item/24-06-2024-WHO-5-year-milestone-report-on-global-transfat-elimination-illustrates-latest-progress-up-to-2023); WHO news 23 January 2023 "Five billion people unprotected from trans fat leading to heart disease".
- Type / level: agency report with modelled estimates — Level VII.   Date: 2023 report (data to end-2023).
- Key results (as displayed): more than 278,000 deaths per year attributable to intake of industrially produced trans fat; at end-2023 WHO-recommended policies in force in 53 countries covering 3.7 billion people (46% of world population); current best-practice policies could prevent about 66% of the originally estimated TFA deaths (almost 183,000 lives per year); WHO recommends limiting trans fat intake (industrially produced and ruminant) to less than 1% of total energy.
- Snippets:
  - "More than 278,000 deaths per year can be attributed to intake of industrially produced trans fat." — search result 23, https://www.who.int/publications/i/item/9789240089549
  - "At the end of 2023, WHO-recommended policies were in effect in 53 countries, covering 3.7 billion people or 46% of the world's population." — same result
  - "almost 183 000 lives saved each year" — same result
  - "limiting consumption of trans fat (industrially produced and ruminant) to less than 1% of total energy intake" — same result
- Verification: V2 (the same figures in searches 21 and 23, with WHO URLs in the hit lists).
- Certainty / limitations / funding / COI: death counts are modelled estimates; method not displayed. Earlier WHO releases (2019 and Jan 2023) used "five billion people" exposed/unprotected; this is a different date and metric, not a contradiction.
- Notes: The WHO 1%-of-energy limit applies to TOTAL trans fat, industrial plus ruminant; so the guideline does not treat natural trans fat as exempt (the full WHO 2023 guideline text was not retrieved).

### [S6-19] WHO Validation Programme for Trans Fat Elimination
- Citation: WHO news 29 January 2024 (https://www.who.int/news/item/29-01-2024-who-awards-countries-for-progress-in-eliminating-industrially-produced-trans-fats-for-first-time); Resolve to Save Lives 2025 timeline (https://resolvetosavelives.org/timeline/who-trans-fat-validation-2025/); News-Medical 20 May 2025 (https://www.news-medical.net/news/20250520/WHO-honors-four-countries-for-successful-trans-fat-elimination-efforts.aspx).
- Type / level: official programme announcements — Level VII.
- Key results (as displayed): first certificates (January 2024) to Denmark, Lithuania, Poland, Saudi Arabia, Thailand; second round at WHA78 (May 2025) to Austria, Norway, Oman, Singapore; total nine; third application cycle closed 31 August 2025; no 2026 results appeared. Certified countries submit updated data every three years.
- Snippets:
  - "first-ever certificates validating progress in eliminating industrially produced trans fatty-acids to five countries: Denmark, Lithuania, Poland, Saudi Arabia, and Thailand" — search result 22, https://www.who.int/news/item/29-01-2024-who-awards-countries-for-progress-in-eliminating-industrially-produced-trans-fats-for-first-time
  - "Austria, Norway, Oman, and Singapore awarded for their exemplary efforts in eliminating industrially produced trans fats" — search result 24
  - "The total number of countries validated is nine" — searches 22 and 24
- Verification: V2.
- Certainty / limitations / funding / COI: Resolve to Save Lives (an advocacy organisation, SECONDARY) is one of the sources; the WHO URL is primary.
- Notes: Date discrepancy: one summary says certificates were received "In December 2023", the WHO news item is dated 29 January 2024. Whether a 2026 round occurred was not found (not proof it did not).

### [S6-20] JACC: Advances 2026 clinician's guide: beef tallow, seed oils, MCT oil (cross-stream, reading R-f)
- Citation: Miller M, Aggarwal M, et al. (2026). A clinician's guide for trending cardiovascular nutritional controversies in 2026. JACC: Advances (online 9 February 2026 per one summary; "March 2026" per ACC listing title). PMC12914412 (URL).
- Type / level: expert review — Level VII.
- Key results (as displayed): three categories (evidence of harm to limit or avoid; lacking evidence of harm or benefit; evidence of benefit); beef tallow, ultra-processed food, full-fat dairy, seed oils, MCT oils, seafood and alternative sweeteners are reviewed; seed oils placed as having evidence of benefit on CVD outcomes; beef tallow described as high in saturated fat and consistently linked to higher LDL-C than unsaturated oils.
- Snippets:
  - "Seed oils have evidence of benefit based on improved cardiovascular disease outcomes." — search result 32, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12914412/
  - "Beef tallow is high in saturated fat and is consistently linked to increased LDL cholesterol versus unsaturated oils." — same result
- Verification: V1 (machine summary of one article; the paper has three hits).
- Certainty / limitations / funding / COI: not displayed. The statements are the summariser's wording; the guide's text was not read.
- Notes: Relevant to the popular "natural tallow vs industrial seed oil" framing; also belongs to the controversies stream.

### [S6-21] Title-only hits (existence confirmed by search hit; content NOT read; use as follow-up targets)
- "Industrial Trans Fatty Acid and Serum Cholesterol: The Allowable Dietary Level" (J Lipids 2017; PubMed 28951788; https://www.hindawi.com/journals/jl/2017/9751756/) — dose threshold question.
- "Meta-regression analysis of the effect of trans fatty acids on low-density lipoprotein cholesterol" (https://www.sciencedirect.com/science/article/pii/S0278691516303647).
- "Benefits of natural dietary trans fatty acids towards inflammation, obesity and type 2 diabetes: defining the n-7 trans fatty acid family" (OCL 2019, https://www.ocl-journal.org/articles/ocl/ref/2019/01/ocl190042/ocl190042.html) — pro-natural-TFA review.
- "Natural Rumen-Derived trans Fatty Acids Are Associated with Metabolic Markers of Cardiac Health" (Lipids, https://aocs.onlinelibrary.wiley.com/doi/10.1007/s11745-015-4055-3).
- "Intake of ruminant trans fatty acids and changes in body weight and waist circumference" (PubMed 22805493).
- "On account of trans fatty acids and cardiovascular disease risk" (Nutr Metab Cardiovasc Dis 2022, https://www.nmcd-journal.com/article/S0939-4753(22)00220-4/abstract).
- "Trans Fat Intake and Its Dietary Sources in General Populations Worldwide: A Systematic Review" (PubMed 28783062); "Global Surveillance of trans-Fatty Acids" (CDC, https://www.cdc.gov/pcd/issues/2019/19_0121.htm); "Artificial trans fat in popular foods in 2012 and in 2014: a market basket investigation in six European countries" (PMC4800119).
- "Contribution of Trans-Fatty Acid Intake to Coronary Heart Disease Burden in Australia: A Modelling Study" (PubMed 28106762); "Projecting cardiovascular deaths averted due to trans fat policies in the Eurasian Economic Union" (PMC10801378).
- "Ending Trans Fat—The First-Ever Global Elimination Program for a Noncommunicable Disease Risk Factor" (JACC International 2024, https://www.jacc.org/doi/abs/10.1016/j.jacc.2024.04.067).
- "Assessment of the Presence of Partially Hydrogenated Oils (PHOs) as a Source of Industrially Produced Trans Fatty Acids (i-TFAs) in Packaged Foods in Poland, Pre- and Post-Implementation of EU Regulation 2019/649" (PMC11944423) — confirms the EU regulation's number.
- "The Method That Makes Oils and Fats Healthier: Interesterification" (https://dergipark.org.tr/en/pub/bsengineering/article/1310721) — only interesterification hit this session.
- FSANZ systematic review documents on trans fat and cholesterol (https://www.foodstandards.gov.au/sites/default/files/consumer/labelling/review/Documents/SD3%20%20Systematic%20Review.pdf).
- Registry entries: ClinicalTrials.gov NCT00933322 (different trans fatty acids and endothelial function) and NCT00930137 (ruminant trans fats and CVD in women).
- Verification: V1 (title in hit list only).

---

## B. Disagreements and discrepancies between sources

1. Brouwer 2010 PLoS ONE: original LDL:HDL slope 0.055 per % energy (LDL 0.048 mmol/L) vs corrected 0.053 (0.045 mmol/L). Use the corrected values; the authors say the conclusion is unchanged.
2. Ruminant trans fat and lipids, feeding trials. Gebauer 2015 (vaccenic acid raised LDL-C about as much as or more than industrial TFA, and also raised HDL-C, apoA-I, Lp(a)), Brouwer 2010 (no significant ruminant vs industrial difference, p = 0.37) and Brouwer 2013 ("gram for gram" similar) point to similar per-gram lipid effects. TRANSFACT 2008 (HDL-lowering specific to industrial TFA, LDL up only in women) and Gayet-Boyer 2014 (no linear dose-response 0.1-4.2% of energy) are read as more favourable to ruminant TFA, and the 2026 dairy SR/MA (NDC-funded) found no lipid difference between trans-enriched and regular dairy. Likely reasons (not tested): purified vaccenic acid vs dairy food matrix, dose (3.3% vs habitual intake), duration, sex, and funding.
3. Ruminant trans fat and CHD, cohorts: Bendsen RR 0.92 (0.76 to 1.11) and de Souza 0.93 (0.73 to 1.18), both not significant with wide CIs. Industrial: Bendsen 1.21 (0.97 to 1.50) NOT significant, de Souza 1.42 (1.05 to 1.92) significant, Mozaffarian 2006 1.23 (1.11 to 1.37) per 2% energy. Different study sets and exposure contrasts; Brouwer 2013 notes the industrial observational effect exceeds the lipid-predicted effect.
4. Population effect of bans: Denmark (synthetic control, -14.2 deaths per 100,000 per year; model-based 1,191 fewer CHD deaths) and New York State (6.2% greater decline in MI/stroke admissions) vs Austria (no significant change in the CVD mortality trend). Different designs; all ecological.
5. Date and metadata discrepancies: first WHO validation certificates "December 2023" (one summary) vs news item dated 29 January 2024; Gebauer 2015 online date 11 November 2015 vs "December 2015"; JACC: Advances guide 9 February 2026 vs "March 2026"; WHO "five billion unprotected" (2019, Jan 2023 releases) vs 3.7 billion covered by best-practice policy at end-2023 (different dates and measures).
6. Machine-summary reliability: the search summary for Gayet-Boyer 2014 mixed in text that belongs to the 2026 paper; spelling Torres-Gonzales / Torres-Gonzalez differs within one summary. All numbers in Section A are as displayed in such summaries and are V1 unless stated.
7. The 2026 dairy-TFA meta-analysis carries a corrigendum (content not seen). Treat its numbers as provisional.

## C. Counter-evidence searched (what I looked for)

- Against "natural (ruminant) trans fat is harmless": searched; FOUND Gebauer 2015 RCT (S6-07), Brouwer 2010/2013 (S6-05, S6-06), TRANSFACT women LDL rise (S6-08).
- Against "industrial trans fat is harmful": searched; FOUND a null population-level result (Austria, S6-16), a non-significant industrial TFA cohort estimate in Bendsen (S6-04), and nothing contradicting the lipid effect. No evidence of benefit from industrial TFA was found.
- Against pro-ban benefit claims: Austria null (S6-16); ecological limits noted for Denmark and New York.
- For the 2026 dairy meta-analysis: searched for funding and corrections; FOUND funding by the National Dairy Council (V2) and a corrigendum hit (content unread).
- Industrial TFA and inflammation / T2D: NOT searched (only the NEJM-review sentence on inflammation seen).
- Not searched at all (cap): molecular identity, hydrogenation, interesterification, fat substitutes, novel/cultivated fats, refining/heating contaminants, "natural" as a criterion/NOVA. Nothing is recorded as "found" or "not found" for these.

## D. Leads (V0 — background knowledge, NOT verified, do not use as findings)

Everything below is from memory and may be wrong; no DOIs, PMIDs or page numbers are given on purpose. Confidence is my own rough rating (H/M/L).

D1. Molecular identity and structure (SQ5 item 1)
- A fatty acid such as palmitic acid is the same molecule whatever its origin; I know of no mechanism that lets the body tell "synthetic" from "natural" palmitate (H, chemistry). Need an authoritative review sentence. Verify: Berry 2009 Nutr Res Rev (TAG structure and interesterification of palmitic- and stearic-rich fats and CVD); Karupaiah and Sundram 2007 Nutr Metab (positional distribution review); Innis 2011 Adv Nutr (TAG structure in infant nutrition); FAO/WHO 2010 fats and fatty acids report.
- What differs is the triacylglycerol (TAG) structure: pancreatic lipase is sn-1,3 specific, so sn-2 fatty acids are absorbed as 2-monoacylglycerols while sn-1,3 saturated fatty acids are released free and can form insoluble calcium soaps (H on lipase, M on soap effects). Human milk carries a large share of its palmitate at sn-2 (about 70% by my recollection, M); palm oil palmitate sits mostly at sn-1,3; lard has more at sn-2 (M); chemical interesterification randomises positions (H).
- Isomers: vaccenic acid (trans-11 18:1) dominates ruminant trans fat; elaidic (trans-9) and trans-10 and other positional isomers dominate partially hydrogenated oil (M-H). Humans convert some vaccenic acid to cis-9,trans-11 CLA (Turpeinen 2002 AJCN, about 19% by recollection, M).
- Impurities and co-components differ more than the fatty acid itself: nickel catalyst residues, oxidation products, 3-MCPD/glycidyl esters from refining (D8), versus milk-fat-globule membrane, phospholipids, sterols, tocopherols and polyphenols in natural fats (M). Matrix effects (cheese vs butter on LDL-C, e.g. Hjerpsted 2011 AJCN) belong to the food-sources stream.

D2. Industrial trans fat (extra anchors)
- Definitions to verify: US labelling definition (sum of unsaturated fatty acids with one or more isolated, non-conjugated, trans double bonds, so CLA is excluded; 21 CFR 101.9(c)(2)(ii)) (M-H); EU Regulation (EU) 2019/649 (limit of 2 g industrial TFA per 100 g fat, applicable from April 2021, same non-conjugated definition) (M; regulation number confirmed by a hit title); WHO definition and the iTFA vs ruminant split (M).
- Landmark trials and cohorts: Mensink and Katan 1990 NEJM (trans fat raises LDL, lowers HDL; H); Ascherio 1999 NEJM; Mensink 2003 AJCN (60 trials, TC:HDL ratio; M-H); cohorts probably among those in the 2006 pooled analysis (which four were pooled is NOT displayed): NHS (Willett 1993 Lancet; Hu 1997 NEJM; Oh 2005), ATBC (Pietinen 1997), Zutphen Elderly (Oomen 2001 Lancet), HPFS (Ascherio 1996) (M-L).
- Mozaffarian 2006 estimate that removing PHO trans fat could prevent roughly 6-19% of CHD events (30,000-100,000 premature deaths per year in the US) (M); FDA 2015 estimate 10,000-20,000 heart attacks and 3,000-7,000 CHD deaths per year (M). Verify both.
- Inflammation and T2D: Mozaffarian 2004 AJCN and Lopez-Garcia 2005 J Nutr (NHS biomarkers, CRP/IL-6/endothelial) (M); de Souza 2015 reported no association of total/industrial trans fat with T2D (L-M). Verify numbers.
- Direct natural vs industrial comparison in a diet trial: Lichtenstein 1999 NEJM (soybean oil, soft and stick margarines, shortening, butter; direction of LDL and HDL effects should be checked) (M).
- WHO REPLACE: six action areas (review, promote replacement, legislate, assess, create awareness, enforce) (H).
- Verify: Wang DD et al. 2016 JAMA Intern Med (NHS/HPFS, TFA and mortality) (M).

D3. Ruminant trans fat (extra anchors)
- Motard-Belanger 2008 AJCN (dairy-derived ruminant TFA trial) (M); Imamura 2018 PLoS Med (FORCE pooled cohorts, dairy-fat fatty-acid biomarkers incl. trans-16:1n-7 and T2D) (M); natural c9,t11-CLA vs synthetic CLA supplements (mixed isomers incl. t10,c12) behave differently (M). Habitual ruminant TFA intake is on the order of 0.5% of energy in many countries (M, verify with the 2017 Nutrients systematic review of TFA intake worldwide, PubMed 28783062 hit).

D4. Hydrogenation chemistry (partial vs full)
- Partial hydrogenation (nickel catalyst, hydrogen) saturates some double bonds and isomerises cis to trans, giving PHO with roughly 10-50% trans (M). Full hydrogenation removes double bonds, giving mostly stearic (C18:0) plus palmitic acid with near-zero trans (H). Fully hydrogenated oil is an "artificial saturated fat" in the sense that it was made, but the molecule is stearic/palmitic acid TAG. FDA's 2015 determination is understood to leave fully hydrogenated oils outside the PHO ban (M; VERIFY in the FDA Q&A).
- Stearic acid and LDL-C: neutral vs oleic in most trials, lower than other SFA (Hunter, Zhang, Kris-Etherton 2010 AJCN systematic review; Mensink 2005) (M-H).

D5. Interesterification (chemical vs enzymatic) and sn-2 palmitate infant formula
- Purpose: make trans-free solid fats by blending fully hydrogenated or palm stearin fat with liquid oil, then rearranging fatty acids with a chemical catalyst (sodium methoxide, random result) or a 1,3-specific lipase (targeted result) (H).
- Human trials and reviews to verify: Sundram, Karupaiah, Hayes 2007 Nutr Metab (stearic-rich interesterified fat and trans-rich fat raised LDL/HDL and plasma glucose vs palm olein; H-M); Berry, Miller, Sanders 2007 AJCN (solid fat content of stearic-rich fats and postprandial effects; M-H); Berry et al. 2007 Lipids (interesterified palmitic-rich TAG, postprandial lipids and factor VII; M); Sanders, Berry and Miller 2003 AJCN (factor VII); Mensink, Sanders, Baer, Hayes, Howles, Marangoni 2016 Adv Nutr (increasing use of interesterified lipids and health effects; M, funding unknown); Hayes and Pronczuk 2010 J Am Coll Nutr (palm oil as trans fat replacement with a caution on interesterification; M). Recent RCTs on glycaemia and enzymatic vs chemical interesterification are not known to me (search 2018-2026).
- Regulatory: no EFSA or FDA specific restriction known to me; labelling often just lists the component fats (M; VERIFY EFSA/FDA/UK SACN statements).
- Infant formula OPO / sn-2 palmitate (Betapol): Carnielli 1996 (fat/mineral balance), Kennedy 1999 AJCN (stool soaps, stool consistency, bone mineralisation), Nowacki 2014 Food Nutr Res, Yao 2014 JPGN, Litmanovitz 2014 Calcif Tissue Int (bone strength), Miles and Calder 2017 Nutr Res (review) (M). Typical reported outcomes: softer stools, fewer calcium soaps, possibly better calcium absorption/bone measures; long-term clinical benefit uncertain. VERIFY outcomes and look for any 2020-2026 meta-analysis and ESPGHAN/EFSA positions.

D6. Fat substitutes and designer lipids
- Olestra (sucrose polyester): FDA approval January 1996 for savory snacks (H); 2003 FDA dropped the mandatory abdominal-cramping/loose-stools label statement but kept vitamin A, D, E, K fortification (M-H); trials: Cheskin 1998 JAMA and Sandler 1999 Ann Intern Med found no clear excess GI symptoms (sponsor-funded; M); lowers serum carotenoids (M-H).
- Salatrim / Benefat: about 5 kcal/g, short- and long-chain acyl TAG, stearate-rich; US GRAS (M-L).
- DAG oil: Kao "Econa" (Japan) and "Enova" (US, ADM Kao); sales withdrawn in 2009 after higher glycidol fatty acid ester levels were found (M for Japan, M-L for the US withdrawal detail; seed from the brief); Maki 2002 AJCN weight-loss trial (M).
- EPG (esterified propoxylated glycerol) was developed but, as far as I know, never marketed (L). Caprenin (caprylic/capric/behenic TAG, about 5 kcal/g, P&G) discontinued (M-L). MCT oil (C8-C10, about 8.3 kcal/g, portal absorption) and MLCT oils in Japan (M). Coconut oil and MCT LDL data belong to the lipids stream.

D7. Novel synthetic / cultivated fats
- Mission Barns (cultivated pork fat): FDA pre-market consultation completed in March 2025 and USDA label approval/launch later in 2025 (M; VERIFY dates and wording from FDA's cultured-cell inventory and USDA-FSIS). US pathway for cultivated animal-cell foods: FDA pre-market consultation plus USDA-FSIS inspection/labelling for meat and poultry; GRAS notification for microbial or synthetic fats (M).
- Savor (fat made from CO2 / hydrogen / methane via a thermochemical process, founded by Bill Gross): launched around 2022; regulatory status uncertain (L).
- Precision-fermentation / microbial oil firms (e.g. Nourish Ingredients, Yali Bio, C16 Biosciences) and EU/UK/Singapore cultivated-fat applications (L-M). No human outcome trial of any of these fats is known to me (M). Compositionally these are TAG of ordinary fatty acids, so the open questions are process-related (host organism, residual media/solvents, allergen/novel-protein carry-over), not "artificial molecule" questions (reasoned, not sourced).

D8. Refining and heating
- EFSA CONTAM 2016 opinion on 3- and 2-MCPD, their fatty acid esters and glycidyl fatty acid esters in food: provisional maximum tolerable daily intake 0.8 microgram per kg body weight per day for 3-MCPD (kidney effects in rats); glycidol is genotoxic and carcinogenic so a margin-of-exposure approach was used; concern for infants and young children, with refined oils (palm oil/fat especially), margarines and bakery goods as main contributors (M-H). EFSA 2018 update: group TDI 2 microgram per kg body weight per day for 3-MCPD and its esters (M-H). IARC: glycidol group 2A, 3-MCPD group 2B (M-H). EU maximum levels: Regulation (EU) 2018/290 (glycidyl esters) and Regulation (EU) 2020/1322 (3-MCPD) (M for numbers of the regulations; levels differ by product, not recalled).
- Human outcome evidence for 3-MCPD/GE is essentially absent; the assessments rest on rodent toxicology and exposure modelling (M).
- Deodorisation at high temperature forms small amounts of trans isomers (mainly of linolenic acid) in refined oils; typical content is low (L-M; verify numbers and whether regulatory TFA limits count them).
- Frying: thermal oxidation produces polar compounds, aldehydes and cyclic fatty acid monomers; many EU states cap total polar compounds around 24-27% (M). Fried-food cohorts: Guallar-Castillon 2012 BMJ (Spanish EPIC, no CHD association; M), Cahill 2014 AJCN (HPFS/NHS, T2D and CAD; M), Qin 2021 dose-response meta-analysis (M). Fried-food intake is confounded by dish, fast-food pattern and frying oil.

D9. "Natural" as a criterion; NOVA
- NOVA lists hydrogenated and interesterified oils among industrial ingredients that mark ultra-processed food (Monteiro 2019 Public Health Nutr; M-H); butter, lard and coconut oil are NOVA group 2 "processed culinary ingredients", i.e. processed, not "unprocessed" (M-H). Hall 2019 Cell Metab UPF RCT (ad libitum, about 500 kcal/day more intake; M-H); Lane 2024 BMJ umbrella review of UPF; Lancet 2025 UPF series (M). Critique that NOVA adds little beyond nutrient profile: Astrup and Monteiro 2022 AJCN (M). Evidence isolating the fat component of UPF, or testing "natural" vs "industrial" independent of composition, is not known to me (the likely answer is that it barely exists). Appeal-to-nature and consumer perception literature (e.g. Rozin 2004 Appetite) (M-L).

## E. Search log (query | mode | useful Y/N)

1. Mozaffarian Katan Ascherio Stampfer Willett NEJM 2006 "Trans fatty acids and cardiovascular disease" | extended | Y (citation, definition)
2. de Souza 2015 BMJ saturated and trans, relative risk trans fat | extended | Y
3. de Souza 2015 BMJ industrial vs ruminant, trans-palmitoleic acid | extended | Y
4. Bendsen 2011 EJCN industrial and ruminant TFA and CHD | extended | Y
5. Mozaffarian 2006 2% energy pooled RR | extended | Y
6. Brouwer Wanders Katan 2010 PLoS ONE quantitative review | extended | Y
7. Brouwer 2010 per 1% energy LDL HDL numbers | extended | Y
8. Correction to Brouwer 2010 PLoS ONE | standard | Y
9. Gebauer Baer 2015 vaccenic acid RCT | extended | Y
10. Chardigny 2008 TRANSFACT | extended | Partly (no numbers)
11. Gebauer 2015 numbers (3% energy, 106 participants) | extended | Y
12. Gebauer 2011 Adv Nutr ruminant TFA review | standard | Partly
13. Nestle "Funded study with negative result" Gebauer | standard | Partly (SECONDARY)
14. Brouwer 2013 EJCN "research completed?" | extended | Y
15. Restrepo and Rieger 2016 Denmark | extended | Y
16. Brandt 2017 JAMA Cardiol New York | extended | Y
17. Austria 2009 TFA regulation | extended | Y
18. Danish IMPACTsec 2022 | extended | Y
19. FDA PHO final determination and compliance dates | extended | Y
20. FDA PHO actions 2023-2025 | extended | Y (no 2024-2025 action seen)
21. WHO REPLACE, deaths, countries | extended | Y
22. WHO validation programme countries | extended | Y
23. WHO fact-sheet figures (278,000, 53 countries) | extended | Y
24. WHO validation 2026 | extended | Partly (nothing for 2026)
25. Mozaffarian 2010 trans-palmitoleic acid and diabetes | extended | Y
26. Ruminant TFA cohort/meta-analysis 2020-2025 | extended | Y (found 2026 SR/MA)
27. "Trans fatty acids from dairy foods do not affect risk of cardiometabolic diseases" | extended | Y
28. Gayet-Boyer 2014 dose-response meta-regression | extended | Partly (summary mixed)
29. University of Reading 2026 press coverage | extended | Y
30. Gayet-Boyer 2014 conflict of interest | standard | N (no disclosure text)
31. Givens dairy TFA funding, limitations | extended | Y (funding, corrigendum hit, Nestle post title)
32. JACC: Advances 2026 clinician's guide | standard | Y (cross-stream)
33. Corrigendum details for Nutr Res 2026 | REFUSED by session cap (200/200)
34. Nestle "Industry-funded study of the week: dairy trans fats" | REFUSED by session cap (200/200)

## F. Resume plan (about 45 searches; extended mode unless noted) — run when the search cap is raised

Priority 1 (the user's explicit "artificial vs natural" question; none searched yet)
1. "triacylglycerol structure" sn-2 palmitic acid pancreatic lipase calcium soap review Berry 2009 Nutrition Research Reviews
2. Karupaiah Sundram 2007 "stereospecific positioning of fatty acids in triacylglycerol structures in native and randomized fats"
3. Innis 2011 "Dietary triacylglycerol structure and its role in infant nutrition"
4. Mensink Sanders Baer Hayes Howles Marangoni 2016 "interesterified lipids in the food supply" Advances in Nutrition (note funding)
5. Sundram Karupaiah Hayes 2007 "Stearic acid-rich interesterified fat and trans-rich fat raise the LDL/HDL ratio" Nutrition and Metabolism
6. Berry Miller Sanders 2007 "solid fat content of stearic acid-rich fats" American Journal of Clinical Nutrition
7. Berry 2007 Lipids interesterification palmitic acid-rich postprandial factor VII
8. Hayes Pronczuk 2010 "Replacing trans fat: the argument for palm oil with a cautionary note on interesterification"
9. interesterified fat randomized trial glycemia insulin postprandial lipaemia 2015..2026; enzymatic interesterification human trial
10. interesterified fat EFSA OR FDA OR SACN position, labelling
11. fully hydrogenated oil stearic acid trans-free FDA PHO determination "fully hydrogenated" excluded
12. Hunter Zhang Kris-Etherton 2010 stearic acid systematic review LDL
13. sn-2 palmitate OPO infant formula randomized trial stool calcium bone (Kennedy 1999; Litmanovitz 2014) and any 2020-2026 meta-analysis
14. EFSA 2016 opinion 3-MCPD glycidyl esters PMTDI 0.8 microgram/kg bw
15. EFSA 2018 3-MCPD "tolerable daily intake" 2 microgram/kg bw
16. Commission Regulation (EU) 2018/290 glycidyl esters and 2020/1322 3-MCPD maximum levels
17. IARC glycidol 2A 3-MCPD 2B
18. deodorization trans fatty acids refined vegetable oil linolenic isomers content
19. frying polar compounds health outcomes RCT cohort; Qin 2021 meta-analysis; Guallar-Castillon 2012
20. olestra FDA 1996 approval; 2003 label removal; Cheskin 1998 JAMA; Sandler 1999 Ann Intern Med; carotenoids
21. salatrim Benefat GRAS calories; Caprenin; EPG
22. DAG oil Enova Econa withdrawal 2009 glycidol Kao
23. Mission Barns FDA pre-market consultation 2025 cultivated pork fat USDA
24. Savor fat from CO2 FDA GRAS; precision fermentation fat GRAS (Yali Bio, C16, Nourish)
25. cultivated fat human health data safety assessment; EU/UK/Singapore approvals 2025-2026
26. NOVA "hydrogenated or interesterified oils" Monteiro 2019; natural vs industrial fat independent of composition; consumer "natural" perception literature

Priority 2 (close the trans-fat gaps)
27. FDA / US trans fat action 2024..2026; WHO validation third cycle 2026
28. definitions: FDA 21 CFR 101.9 trans fat "isolated double bonds" CLA excluded; EU 2019/649 definition; WHO definition
29. Mozaffarian 2006 NEJM abstract: "30,000 to 100,000" premature deaths; FDA 2015 CHD events and deaths estimate
30. industrial trans fat and type 2 diabetes / inflammation (Mozaffarian 2004 AJCN; de Souza 2015 T2D RR)
31. Lichtenstein 1999 NEJM hydrogenated margarines vs butter vs soybean oil LDL
32. Mensink and Katan 1990 NEJM; Mensink 2003 AJCN 60 trials
33. Gebauer 2015 funding statement; Brouwer AJCN editorial "In equal amounts" details
34. Gayet-Boyer 2014 disclosures; Bendsen 2011 disclosures; de Souza 2015 funding (WHO?)
35. Corrigendum to Nutr Res 2026;150:33-48; Nestle "Industry-funded study of the week: dairy trans fats"
36. Turpeinen 2002 vaccenic acid to CLA conversion; Motard-Belanger 2008; Imamura 2018 dairy-fat biomarkers and T2D
37. habitual ruminant vs industrial TFA intake levels (Wanders 2017 Nutrients)
38. WHO 2023 guideline on saturated and trans fatty acid intake (1% energy; ruminant included)
