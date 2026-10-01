# S5 — Food sources and individual saturated fatty acids (SQ4; reading R-e "whole-food sources vs processed products") — Evidence Ledger
Run date: 2026-10-01 | Searches run: 31 completed (standard 0 / extended 31); 5 further attempts refused by the session search cap (see Section E)

## STATUS NOTICE — THIS LEDGER IS PARTIAL (read first)

The session-wide WebSearch cap was reached while this stream stood at 31 completed searches. The tool returned: "this session has used its web search budget (200 of 200 WebSearch calls)... ask the user to raise CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION". Five further queries (one standard, four extended) came back with "Web search was not performed". I did not try any workaround (no curl, no WebFetch substitution, no reuse of other channels), because the cap is an explicit resource control and raising it is the user's decision. Sibling streams share the same cap and are probably truncated too.

How to read the V-levels here: every WebSearch result is a machine-written summary built from several hits, and it does not say which page a given number came from. "V1" therefore means "seen in one synthesized result". Where a primary host (journal, PubMed, PMC, IARC, Lancet) was in the hit list I say so, but I could not open it. Numbers are copied as displayed; none are computed, converted or rounded.

Coverage against the task list:

| Task item | Status | What the ledger holds |
|---|---|---|
| 1 Dairy: cohorts / MAs / reviews | Partial | Guo 2017, de Oliveira Otto 2012, PURE (press-derived), Nature Communications global analysis, Drouin-Chartier 2016, Hirahatake 2019, Thorning 2017, Astrup 2020, Trieu 2021, Michaelsson 2014. NOT retrieved: Mozaffarian, Astrup 2016/2021 content, Thorning 2016, dairy-T2D meta-analyses, yogurt/milk/cheese-specific effect sizes |
| 1 Dairy RCTs (LDL-C) | Mostly covered | Hjerpsted 2011, Brassard 2017, Raziani 2016/2018, Feeney 2018. Chiu: not found |
| 1 Dairy-matrix mechanisms | Thin | Only trial-level hints (calcium, casein, cheese structure). MFGM and fermentation: nothing retrieved |
| 1 Butter specifically | Covered | Pimpin 2016, Zhang 2025, plus Brassard and Khaw trials |
| 2 Meat | Partial | Papier 2021, Zeraatkar x3, Bechthold (design only), IARC, Bergeron. NOT retrieved: sodium / nitrite / heme attribution, poultry-specific MA, meat-T2D MA, plant-based-meat RCTs |
| 3 Tropical oils | Partial | Coconut only (Neelakantan 2020, Khaw 2018). NOT retrieved: palm, palm kernel, MCT, virgin vs refined, Eyres 2016 |
| 4 Cocoa butter / stearic acid | Not covered | One-line Astrup 2020 claim only |
| 5 Individual fatty acids | Minimal | Trieu 2021 (15:0, 17:0 as dairy-fat biomarkers) only. Nothing on C12/C14/C16/C18 lipid effects, Forouhi, Imamura, the C15:0 "essential" claim, or very-long-chain SFA |
| 6 Plant vs animal SFA | Not covered | — |
| 7 What replaces SFA | Not covered | — |
| 8 Ultra-processed foods | Minimal | Lane 2024 design only; no SFA content retrieved; Hall 2019 not searched |

---

## A. Findings ledger

### A1. Dairy: cohorts, meta-analyses, reviews

### [S5-01] Guo et al. 2017: milk and dairy, dose-response MA of cohorts
- Citation: Guo et al. (2017). Milk and dairy consumption and risk of cardiovascular diseases and all-cause mortality: dose–response meta-analysis of prospective cohort studies. Eur J Epidemiol. (DOI 10.1007/s10654-017-0243-1 is in the hit URL; first-author initials, volume and pages not displayed.)
- Type / level: SR/MA of prospective cohort studies. Level I design built on Level IV inputs. Date: 2017.
- Design / population: 29 cohort studies, 938,465 participants, 93,158 mortality cases, 28,419 CHD cases, 25,416 CVD cases.
- Key results (as displayed): no associations for total (high-fat/low-fat) dairy and milk with mortality, CHD or CVD ("neutral"). Cheese, yogurt and fermented-dairy results were not displayed.
- Snippets + URL:
  - "The meta-analysis included a total of 29 cohort studies with 938,465 participants and 93,158 mortality cases, 28,419 CHD cases, and 25,416 CVD cases." — https://link.springer.com/article/10.1007/s10654-017-0243-1
  - "No associations were found for total (high-fat/low-fat) dairy and milk with the health outcomes of mortality, CHD, or CVD" — same URL
- Verification: V1 (query 1). Springer (primary) in hit list. The same title/URL also appeared in the hit lists of queries 23 and 28, with no numbers there.
- Certainty / limitations / funding / COI: GRADE, funding and COI not displayed. Observational pooling.
- Notes: older than S5-04 and than the 2020–2026 MAs in D1; check for supersession.

### [S5-02] de Oliveira Otto et al. 2012: SFA by food source, MESA
- Citation: de Oliveira Otto et al. (2012). Dietary intake of saturated fat by food source and incident cardiovascular disease: the Multi-Ethnic Study of Atherosclerosis. Am J Clin Nutr. (volume/pages and other authors not displayed)
- Type / level: prospective cohort. Level IV. Date: 2012.
- Design / population: MESA participants aged 45–84 at baseline (n = 5,209), followed 2000–2010, 120-item FFQ, 316 CVD cases. Adjusted for demographics, lifestyle and dietary confounders.
- Key results (as displayed): dairy SFA associated with lower CVD risk, HR 0.79 for +5 g/d and 0.62 for +5% of energy (CIs not displayed). The result for meat SFA was not displayed.
- Snippets + URL:
  - "hazard ratios of 0.79 for +5 g/d and 0.62 for +5% of energy from dairy saturated fat" — https://core.ac.uk/outputs/29227328/
  - "participants who were 45-84 years old at baseline (n = 5,209)" — same URL
  - "may depend on food-specific fatty acids or other nutrient constituents in foods containing saturated fat" — same URL (authors' conclusion)
- Verification: V1 (query 2). Primary-record mirror (CORE) in hit list.
- Certainty / limitations / funding / COI: only 316 events; FFQ exposure; funding/COI not displayed.
- Notes: the seed list pairs this study with a dairy-vs-meat SFA contrast. Only the dairy half is displayed here; the meat-SFA result is not confirmed in this session.

### [S5-03] PURE dairy analysis (Dehghan et al., Lancet): SECONDARY, press-derived numbers
- Citation: Dehghan et al. Association of dairy intake with cardiovascular disease and mortality in 21 countries from five continents (PURE): a prospective cohort study. Lancet. (Year 2018 is given in the search summary, which echoed my query; volume/pages not displayed.)
- Type / level: prospective cohort. Level IV. Participant number and follow-up not displayed.
- Key results (as displayed; percentages only, no HR or CI): in an analysis restricted to people who consumed only high-fat dairy, 2 servings/day vs <0.5 servings/day was associated with a 29% reduction in the primary composite endpoint, 25% reduction in total mortality and 32% reduction in major CVD. Separately: more than 2 servings/day vs no dairy, 22% lower major CVD, 17% lower total mortality, 23% lower CV mortality.
- Snippets + URL:
  - "two servings per day versus less than 0.5 servings per day was associated with a 29% reduction in the primary composite endpoint" — https://www.phri.ca/the-lancet-publishes-dairy-results-of-pure-study/ (hit list; attribution of each sentence to a page is not visible)
  - "eating more than two servings of dairy per day was associated with a 22% lower risk of major cardiovascular disease compared with eating no dairy" — https://www.sci.news/medicine/dairy-consumption-risk-cardiovascular-disease-06411.html (hit list; same caveat)
- Verification: V1, SECONDARY. Numbers come from news/institute pages in the hit list; the Lancet abstract was not seen (my abstract-level query was refused by the cap).
- Certainty / limitations / funding / COI: not displayed. The two sentences may describe different contrasts or analyses; do not combine them.
- Notes: do not use these percentages in a report until the Lancet abstract is checked.

### [S5-04] Nature Communications: "A global analysis of dairy consumption and incident cardiovascular disease"
- Citation: authors not displayed. Nat Commun. Hit URL: https://www.nature.com/articles/s41467-024-55585-0. An IDEAS record lists it as volume 16, issue 1 (2025) while the URL/DOI carries "2024". A medRxiv preprint (posted 2023, "Dairy consumption and incident cardiovascular disease: a global analysis") is also in the hit list.
- Type / level: appears to combine national cohorts (Chinese and British participants named) with a meta-analysis of prospective studies. Level IV with a Level I component. Design details and N not displayed.
- Key results (as displayed): total dairy associated with a 3.7% reduced risk of CVD and a 6% reduced risk of stroke. Cheese and low-fat dairy associated with lower CVD risk; no significant association for milk, yogurt and high-fat dairy. In Chinese participants, regular dairy (primarily whole milk) was associated with a 9% increased risk of CHD and a 6% reduced risk of stroke vs non-consumers. In British participants, total dairy was linked to lower CVD, CHD and ischaemic stroke, with cheese and semi-skimmed/skimmed milk contributing.
- Snippets + URL:
  - "total dairy consumption is associated with a 3.7% reduced risk of CVD and a 6% reduced risk of stroke" — https://www.nature.com/articles/s41467-024-55585-0
  - "cheese and low-fat dairy consumption was associated with lower CVD risk while no significant association was observed for milk, yogurt, and high-fat dairy consumption" — same URL
  - "Regular dairy consumption (primarily whole milk) is associated with a 9% increased risk of coronary heart disease (CHD)" — same URL
- Verification: V1 (query 30). Journal page and preprint in hit list.
- Certainty / limitations / funding / COI: not displayed. Percentages without CIs. Population differences in dairy type are central.
- Notes: version trail is preprint (2023) then journal (2025 per IDEAS record vs "2024" in URL/DOI). This is the most direct counter to "high-fat dairy is protective" in this ledger.

### [S5-05] Drouin-Chartier et al. 2016: systematic review of dairy and CV clinical outcomes
- Citation: Drouin-Chartier JP, Brassard D, Tessier-Grenier M, et al. (2016). Systematic review of the association between dairy product consumption and risk of cardiovascular-related clinical outcomes. Adv Nutr 7:1026–40. DOI 10.3945/an.115.011403 (as displayed in the summary).
- Type / level: systematic review of meta-analyses/cohort evidence. Level I design with Level IV inputs. Date: 2016. Per the summary it examined meta-analyses of prospective cohort studies.
- Key results (as displayed): "no evidence that the consumption of any form of dairy is detrimentally associated with any cardiovascular-related clinical outcome."
- Snippets + URL:
  - "no evidence that the consumption of any form of dairy is detrimentally associated with any cardiovascular-related clinical outcome" — https://academic.oup.com/advances/article-pdf/7/6/1026/23754757/an011403.pdf
- Verification: V1 (query 23). Primary host (OUP PDF) in hit list.
- Certainty / limitations / funding / COI: funding/COI not displayed; check the statement. The summary gives no effect sizes.
- Notes: the conclusion is "no detrimental association", which is weaker than "protective". It is more than 10 years old and predates S5-04.

### [S5-06] Hirahatake et al. 2019: "Dairy Foods and Dairy Fats: New Perspectives on Pathways Implicated in Cardiometabolic Health"
- Citation: Hirahatake KM, Bruno RS, Bolling BW, Blesso C, Alexander LM, Adams SH (2019). Adv Nutr. DOI 10.1093/advances/nmz105 (as displayed). Accepted 8/29/2019, published 9/25/2019 per the summary.
- Type / level: narrative review (not a systematic review); Level VII equivalent. Date: 2019.
- Key results (as displayed): "most observational and experimental evidence does not support a detrimental relationship between full-fat dairy intake and cardiometabolic health, including risks of cardiovascular disease and type 2 diabetes."
- Snippets + URL:
  - "does not support a detrimental relationship between full-fat dairy intake and cardiometabolic health" — https://pubmed.ncbi.nlm.nih.gov/31555799/
- Verification: V1 (query 24). PubMed, ScienceDirect, USDA ARS and Penn State records in hit list.
- Certainty / limitations / funding / COI: funding/COI not displayed. (A USDA ARS publication record is among the hits; that does not establish who funded the paper.)
- Notes: states the "mechanistic pathways" argument but no pathway-level data were displayed.

### [S5-07] Thorning et al. 2017: whole dairy matrix vs single nutrients (expert-workshop paper)
- Citation: Thorning TK, Bertram HC, Bonjour J-P, et al. (2017). Whole dairy matrix or single nutrients in assessment of health effects: current evidence and knowledge gaps. Am J Clin Nutr 105(5):1033–1045. DOI 10.3945/ajcn.116.151548 (as displayed).
- Type / level: expert workshop report with narrative review. Level VII. Based on a workshop held in Gentofte, Denmark, 28–29 September 2016.
- Key results (as displayed): conceptual. The food matrix determines nutrient digestion and absorption and "may exhibit a different relation with health indicators compared to single nutrients studied in isolation." No effect sizes.
- Snippets + URL:
  - "The food matrix may exhibit a different relation with health indicators compared to single nutrients studied in isolation." — https://pubmed.ncbi.nlm.nih.gov/28404576/
  - "international experts workshop held in Gentofte, Denmark, 28–29 September 2016" — same URL
- Verification: V1 (query 25). PubMed and a White Rose repository PDF in hit list.
- Certainty / limitations / funding / COI: workshop funding and participant COIs not displayed; check before relying on it.
- Notes: a "dairy matrix" concept paper, not a mechanism test.

### [S5-08] Astrup et al. 2020, JACC State-of-the-Art Review: "Saturated Fats and Health: A Reassessment and Proposal for Food-Based Recommendations"
- Citation: Astrup A, Magkos F, et al. (2020). J Am Coll Cardiol. DOI 10.1016/j.jacc.2020.05.077 (in the URL). Full author list not displayed.
- Type / level: narrative state-of-the-art review. Level VII equivalent. Date: 2020.
- Key results (authors' conclusions as displayed by the search summary): whole-fat dairy, unprocessed meat and dark chocolate are SFA-rich foods with a complex matrix not associated with increased CVD risk, and the evidence "does not support further limiting the intake of such foods". Dairy effects "cannot be explained and predicted by its content in SFAs". Processed meat is associated with CHD but unprocessed red meat is not, so "the SFA content of meat is unlikely to be responsible". Dark chocolate contains stearic acid (C18:0), described as having a neutral effect on CVD risk.
- Snippets + URL:
  - "Whole-fat dairy, unprocessed meat, and dark chocolate are SFA-rich foods with a complex matrix that are not associated with increased risk of CVD." — https://www.jacc.org/doi/10.1016/j.jacc.2020.05.077
  - "The totality of available evidence does not support further limiting the intake of such foods." — same URL
  - "the SFA content of meat is unlikely to be responsible for increased cardiovascular disease risk" — same URL
  - "Dark chocolate contains stearic acid (C18:0), which has a neutral effect on CVD risk." — same URL
- Verification: V1 (query 26). Journal page plus Semantic Scholar record in hit list. A PDF copy is hosted on betterwithdairy.com (the site name suggests dairy-industry promotion; this says nothing about who funded the paper).
- Certainty / limitations / funding / COI: funding and author COIs not displayed; check the disclosure. This is an opinion-level synthesis, and its statement on unprocessed red meat and CHD sits against S5-18/S5-22 (see B6).
- Notes: other titles seen in the hit list (D1): "Dietary Saturated Fats and Health: Are the U.S. Guidelines Evidence-Based?" (authors, year and journal not displayed; the seed "Astrup 2021" may refer to it), a 2025 article "There Is More Than Meets the Label: Rethinking Saturated Fat and Cardiovascular Health" (journal and year inferred from the URL), and two critique blogs (Alinea Nutrition), which are SECONDARY.

### [S5-09] Trieu et al. 2021: biomarkers of dairy fat (15:0, 17:0, trans-palmitoleic acid)
- Citation: Trieu K, et al. (2021). Biomarkers of dairy fat intake, incident cardiovascular disease, and all-cause mortality: A cohort study, systematic review, and meta-analysis. PLoS Med 18(9) (e1003763 in the URL).
- Type / level: new cohort study plus SR/MA of cohort, case-cohort and nested case-control studies. Level IV / Level I. Date: 2021.
- Design / population: Swedish cohort of 4,150 adults, median follow-up 16.6 years, 578 incident CVD events, 676 deaths. Meta-analysis added 17 further studies.
- Key results (as displayed): 15:0 and 17:0 (not trans-palmitoleic acid) inversely associated with total CVD; relative risk highest vs lowest tertile 0.88 (95% CI 0.78, 0.99) for 15:0 and 0.86 (95% CI 0.79, 0.93) for 17:0. Dairy fat biomarkers not associated with all-cause mortality in the meta-analyses.
- Snippets + URL:
  - "the relative risk of highest versus lowest tertile being 0.88 (95% CI: 0.78, 0.99) for 15:0 and 0.86 (95% CI: 0.79, 0.93) for 17:0" — https://journals.plos.org/plosmedicine/article?id=10.1371%2Fjournal.pmed.1003763
  - "Dairy fat biomarkers were not associated with all-cause mortality in the meta-analyses." — same URL
- Verification: V1 (query 31). PLOS and PMC (PMC8454979) hosts in hit list.
- Certainty / limitations / funding / COI: not displayed. Biomarkers reflect dairy-fat intake and other influences, not SFA dose, so they cannot separate dairy fat from other dairy components.
- Notes: this speaks to odd-chain SFA as a marker rather than a cause. Causality of C15:0/C17:0 is untested here.

### [S5-10] Michaelsson et al. 2014 BMJ: milk intake, mortality and fractures (counter-evidence to "dairy is protective")
- Citation: Michaelsson K, Wolk A, Langenskiold S, Basu S, Warensjo Lemming E, Melhus H, Byberg L (2014). Milk intake and risk of mortality and fractures in women and men: cohort studies. BMJ 349:g6015 (as displayed in the summary).
- Type / level: two Swedish prospective cohorts. Level IV. Date: 2014.
- Design / population: 61,433 women aged 39–74 and 45,339 men aged 45–79. Over 20 years in women, 17,252 (28%) had a fracture and 15,541 (25%) died.
- Key results (as displayed): women drinking at least 3 glasses of milk/day had higher fracture and mortality risk than women drinking <1 glass/day. High milk intake was also associated with higher all-cause mortality in men, less pronounced. HRs not displayed.
- Snippets + URL:
  - "High milk intake was also associated with higher all-cause mortality in both men and women." — https://www.sciencedaily.com/releases/2014/10/141028214051.htm (SECONDARY)
  - "one with 61,433 women aged 39 to 74 and another with 45,339 men aged 45 to 79" — same URL
- Verification: V1 (query 27). A Semantic Scholar record of the BMJ paper and an Osteoporosis International commentary ("Higher milk intake increases fracture risk: confounding or true association?") are in the hit list.
- Certainty / limitations / funding / COI: observational, FFQ; the commentary title raises confounding. Funding not displayed.
- Notes: milk is not a measure of SFA, so this speaks to "dairy neutral/protective" rather than to SFA. Fermented-product results were not displayed.

### A2. Dairy / butter / coconut randomized trials on blood lipids (biomarker endpoints, not hard events)

### [S5-11] Hjerpsted, Leedo, Tholstrup 2011: cheese vs butter of equal fat content
- Citation: Hjerpsted J, Leedo E, Tholstrup T (2011). Cheese intake in large amounts lowers LDL-cholesterol concentrations compared with butter intake of equal fat content. Am J Clin Nutr 94:1479–1484 (as displayed).
- Type / level: randomized crossover trial. Level II. Date: 2011 (more than 10 years old).
- Design / population: 49 men and women replaced part of habitual fat with 13% of energy from cheese or butter; 6 weeks per period.
- Key results (as displayed): cheese gave lower serum total, LDL- and HDL-cholesterol and higher glucose than butter. Cheese did not raise LDL-C vs the habitual diet. Effect sizes not displayed.
- Snippets + URL:
  - "49 men and women who replaced part of their habitual dietary fat intake with 13% of energy from cheese or butter" — https://researchprofiles.ku.dk/en/publications/cheese-intake-in-large-amounts-lowers-ldl-cholesterol-concentrati/
  - "After 6 weeks, the cheese intervention resulted in lower serum total, LDL-, and HDL-cholesterol concentrations" — same URL (hit list; page attribution not visible)
  - "fecal fat excretion did not differ between the cheese and butter periods" — same hit list
- Verification: V1 (query 8). Title independently visible in several hits (Copenhagen portal, ResearchGate, Semantic Scholar).
- Certainty / limitations / funding / COI: small N; funding not displayed.
- Notes: the summary is internally inconsistent about mechanism. It says fecal fat excretion did not differ between periods, then says the authors suggested "the high calcium content of cheese, which results in higher excretions of fecal fat". Do not report a calcium–fatty-acid-soap mechanism from this result. A separate hit titled "Cheese intake lowers plasma cholesterol concentrations without increasing bile acid excretion" appears in D1.

### [S5-12] Brassard et al. 2017: SFA from cheese vs butter, five-diet crossover
- Citation: Brassard D, et al. (2017). Comparison of the impact of SFAs from cheese and butter on cardiometabolic risk factors: a randomized controlled trial. Am J Clin Nutr (March 2017 per summary; volume/pages not displayed).
- Type / level: multicenter randomized crossover controlled-consumption trial. Level II.
- Design / population: 92 men and women with abdominal obesity and relatively low HDL-C; five isoenergetic 4-week diets separated by 4-week washouts: SFA-rich diets (12.4–12.6% of calories) from cheese or butter, plus MUFA, PUFA and carbohydrate diets.
- Key results (as displayed): LDL-C after the cheese diet was lower than after butter (−3.3%, P < 0.05) but higher than after carbohydrate (+2.6%), MUFA (+5.3%) and PUFA (+12.3%) diets. The butter–cheese LDL difference was significant only in people with high baseline LDL-C. No significant difference between all diets on inflammation markers, blood pressure, or insulin–glucose homeostasis.
- Snippets + URL:
  - "lower than after the butter diet (−3.3%, P < 0.05)" — https://www.sciencedirect.com/science/article/pii/S0002916522048250
  - "higher than after the carbohydrate (+2.6%), MUFA (+5.3%), and PUFA (+12.3%) diets" — same URL
  - "2 diets rich in SFAs (12.4–12.6% of calories) from either cheese or butter" — same URL
  - "no significant difference between all diets on inflammation markers, blood pressure, and insulin-glucose homeostasis" — same URL
- Verification: V1 (query 7). ScienceDirect (AJCN) and ResearchGate in hit list.
- Certainty / limitations / funding / COI: funding/COI not displayed; check. Population is people with abdominal obesity and low HDL-C. Biomarker endpoints only.
- Notes: keeps the comparators straight: cheese vs butter −3.3%, but cheese vs PUFA +12.3%. "Cheese raises LDL less than butter" is not the same claim as "cheese does not raise LDL".

### [S5-13] Raziani et al. 2016 (AJCN) and 2018 (Nutr Metab): regular-fat vs reduced-fat cheese
- Citation (a): Raziani F, et al. (2016 per summary). High intake of regular-fat cheese compared with reduced-fat cheese does not affect LDL cholesterol or risk markers of the metabolic syndrome: a randomized controlled trial. Am J Clin Nutr (PubMed 27557654 in the URL).
- Citation (b): Raziani et al. (2018). Consumption of regular-fat vs reduced-fat cheese reveals gender-specific changes in LDL particle size: a randomized controlled trial. Nutr Metab (Lond) (DOI 10.1186/s12986-018-0300-0 in the URL).
- Type / level: randomized parallel trial (a) and its secondary analysis (b). Level II. The seed "Raziani 2018" corresponds to (b); the main trial is (a).
- Design / population: (a) 12-week randomized parallel intervention after a 2-week run-in, people with ≥2 metabolic-syndrome risk factors. (b) 85 subjects completed (mean age 54.0 ± 12.8 years; BMI 28.7 ± 3.6 kg/m²).
- Key results (as displayed): (a) regular-fat cheese in high daily amounts did not affect serum lipids, fasting glucose and insulin, blood pressure or waist circumference differently from reduced-fat cheese or carbohydrate-rich foods. (b) no change in LDL particle size distribution overall; in men, regular-fat decreased total LDL particle number, mainly medium-sized LDL.
- Snippets + URL:
  - "High intake of regular-fat cheese compared with reduced-fat cheese does not affect LDL cholesterol or risk markers of the metabolic syndrome" — https://pubmed.ncbi.nlm.nih.gov/27557654/
  - "In men, the regular-fat diet decreased total LDL particle number and the reduction was primarily in the medium-sized LDL fraction." — https://link.springer.com/article/10.1186/s12986-018-0300-0
- Verification: V2 for the authors' headline conclusion (title seen in PubMed, AJCN, ScienceDirect and ResearchGate hits, plus summary); V1 for the design and particle-size details (query 10).
- Certainty / limitations / funding / COI: funding not displayed. Comparators are other cheeses or carbohydrate foods, not unsaturated fat, so this does not show cheese SFA is neutral for LDL-C relative to PUFA.
- Notes: the sex-specific finding is a secondary analysis and needs caution.

### [S5-14] Feeney et al. 2018: dairy fat in the cheese matrix vs formulated products
- Citation: Feeney EL, et al. (2018). Dairy matrix effects: response to consumption of dairy fat differs when eaten within the cheese matrix—a randomized controlled trial. Am J Clin Nutr 108(4) (August 2018 per summary).
- Type / level: randomized controlled trial, 6-week intervention. Level II.
- Design / population: 164 participants (75 male, 89 female), BMI > 25 kg/m², age > 50 years, four arms, 6-week run-in. The summary's arm list is garbled (arms A and D both read as full-fat cheddar), so the arm definitions are unreliable. Arm C is described as butter (49 g) + calcium caseinate powder (30 g) + calcium supplement, a formulated product designed to test cheese components separately from cheese structure.
- Key results (as displayed): the group eating dairy fat as cheese had a greater reduction in LDL-C and total cholesterol than the group given dairy fat in a formulated product. No numbers displayed.
- Snippets + URL:
  - "the group which consumed dairy fat from cheese showed a greater reduction in LDL cholesterol and total cholesterol" — https://www.researchgate.net/publication/327040988_Dairy_matrix_effects_response_to_consumption_of_dairy_fat_differs_when_eaten_within_the_cheese_matrix-a_randomized_controlled_trial
  - "164 participants (75 male; 89 female) with BMI > 25 kg/m² and age >50 years" — same URL
- Verification: V1 (query 11). Title visible in several hits.
- Certainty / limitations / funding / COI: funding not displayed; no effect sizes retrieved.
- Notes: the best single hint in this ledger that physical cheese structure, not just calcium or casein, matters. That remains an inference from one trial's design; mechanism not tested directly.

### [S5-15] Khaw et al. 2018 (BMJ Open): coconut oil vs olive oil vs butter
- Citation: Khaw KT, Sharp SJ, Finikarides L, Afzal I, Lentjes M, Luben R, Forouhi NG (2018). Randomised trial of coconut oil, olive oil or butter on blood lipids and other cardiovascular risk factors in healthy men and women. BMJ Open 8:e020167.
- Type / level: randomized parallel trial. Level II. Date: 2018.
- Design / population: 96 randomised; 94 attended baseline (mean age 60 years, 67% women, 98% European Caucasian); 91 attended follow-up at 4 weeks. Extra-virgin coconut oil vs extra-virgin olive oil vs unsalted butter, 50 g daily.
- Key results (as displayed; units mmol/L):
  - LDL-C higher on butter vs coconut oil +0.42 (95% CI 0.19 to 0.65), P<0.0001; butter vs olive oil +0.38 (0.16 to 0.60), P<0.0001; coconut vs olive −0.04 (−0.27 to 0.19).
  - HDL-C higher on coconut oil vs butter +0.18 (0.06 to 0.30) and vs olive oil +0.16 (0.03 to 0.28).
- Snippets + URL:
  - "LDL-C concentrations were significantly increased on butter compared with coconut oil (+0.42, 95% CI 0.19 to 0.65 mmol/L, P<0.0001)" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5855206/
  - "no differences in change of LDL-C in coconut oil compared with olive oil (−0.04, 95% CI −0.27 to 0.19)" — same URL
  - "Coconut oil significantly increased HDL-C compared with butter (+0.18, 95% CI 0.06 to 0.30 mmol/L)" — same URL
  - "asked to consume 50 g daily of one of these fats for 4 weeks" — same URL (design text)
- Verification: V2 for the direction and design (queries 6 and 9). V1 for the CIs (query 9 only). PMC, Aston, CORE and Semantic Scholar records in the hit list.
- Certainty / limitations / funding / COI: funding not displayed. Healthy adults, 4 weeks, 91 completers; the CI for coconut vs olive spans −0.27 to 0.19, so the trial cannot exclude a difference of that size in either direction.
- Notes: discrepancy in dose wording. Query 6 says "50 g daily"; query 9 says "participants consumed 50 mL of fat and oils, with butter prepacked in 20 g and 30 g portions". Resolve against the paper. A 2024 J Lipid Res paper on the same three fats ("Effects of coconut oil, olive oil, and butter on plasma fatty acids and metabolic risk factors: a randomized trial", PMC11618001) is in D1, with no results read.

### A3. Butter specifically

### [S5-16] Pimpin et al. 2016, "Is Butter Back?": MA of butter, mortality, CVD and diabetes
- Citation: Pimpin L, et al. (2016). Is Butter Back? A Systematic Review and Meta-Analysis of Butter Consumption and Risk of Cardiovascular Disease, Diabetes, and Total Mortality. PLoS One (journal.pone.0158118 in the URL).
- Type / level: SR/MA of prospective cohorts. Level I design with Level IV inputs. Date: 2016.
- Design / population: 9 eligible studies, 15 country-specific cohorts, 636,151 unique individuals, 6.5 million person-years. Effects expressed per 14 g (1 tablespoon) per day.
- Key results (as displayed): all-cause mortality RR 1.01 (95% CI 1.00, 1.03; P = 0.045; N = 9). Any CVD RR 1.00 (0.98, 1.02; N = 4). CHD RR 0.99 (0.96, 1.03; N = 3). Stroke RR 1.01 (0.98, 1.03; N = 3). Diabetes RR 0.96 (0.93, 0.99; P = 0.021; N = 11). Authors: results "do not support a need for major emphasis in dietary guidelines on either increasing or decreasing butter consumption".
- Snippets + URL:
  - "per 14g/1 tablespoon/day: RR = 1.01, 95%CI = 1.00, 1.03, P = 0.045" — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0158118
  - "not significantly associated with any cardiovascular disease (N = 4; RR = 1.00, 95%CI = 0.98, 1.02; P = 0.704)" — same URL
  - "inversely associated with incidence of diabetes (N = 11; RR = 0.96, 95%CI = 0.93, 0.99; P = 0.021)" — same URL
  - "do not support a need for major emphasis in dietary guidelines on either increasing or decreasing butter consumption" — same URL
- Verification: V1 (query 12). PLOS ONE, PMC (PMC4927102), Tufts and ScienceDaily in hit list.
- Certainty / limitations / funding / COI: funding not displayed. Few cohorts for CVD end-points (N = 3–4). The range of butter intakes in the pooled cohorts was not displayed.
- Notes: Pimpin's mortality estimate is borderline (CI lower bound 1.00). Compare units with S5-17 (14 g/day vs 5 g/day).

### [S5-17] Zhang et al. 2025 (JAMA Intern Med): butter and plant-based oils and mortality
- Citation: Zhang Y, Chadaideh KS, Li Y, et al. (2025). Butter and Plant-Based Oils Intake and Mortality. JAMA Intern Med (PubMed 40048719 in the URL).
- Type / level: pooled prospective cohorts (NHS, NHS II, HPFS). Level IV. Date: 2025. The search summary says "published on May 1, 2025" while a Healio URL is dated 2025-03-06 (online-first vs print is a likely cause; unverified).
- Design / population: up to 33 years of follow-up among 221,054 adults; 50,932 deaths, 12,241 from cancer and 11,240 from CVD.
- Key results (as displayed): highest vs lowest butter intake, total mortality HR 1.15 (95% CI 1.08–1.22; P for trend < .001). Each 5-g/day butter increment: total mortality HR 1.04 (1.02–1.05). Each 5 g/day total plant-based oil: total mortality HR 0.83 (0.79–0.86), cancer mortality HR 0.83 (0.76–0.90). Canola, soybean and olive oils per 5 g/day: HR 0.85, 0.94, 0.92.
- Snippets + URL:
  - "a 15% higher risk of total mortality compared to the lowest intake (hazard ratio [HR], 1.15; 95% CI, 1.08-1.22; P for trend < .001)" — https://pubmed.ncbi.nlm.nih.gov/40048719/
  - "a 4% increase in total mortality (HR = 1.04; 95% CI, 1.02-1.05)" — same URL
  - "an estimated 17% reduction in total mortality (HR, 0.83; 95% CI, 0.79-0.86; P <.001)" — same URL
  - "During up to 33 years of follow-up among 221,054 adults, 50,932 deaths were documented, with 12,241 due to cancer and 11,240 due to CVD." — same URL
- Verification: V1 (query 13). PubMed, a Copenhagen record and a Mass General Brigham press release in the hit list; the summary does not say which page carried which number.
- Certainty / limitations / funding / COI: funding not displayed. Observational; mortality, not a SFA-specific outcome. Two commentary titles on this paper are in the hit list (D1): "The role of high-fat diets in cancer mortality: is butter to blame?" (PMC12333795) and "Association of butter and plant-based oils with mortality: Further clarifying the butter" (NMJI).
- Notes: the comparator in the headline contrast is "lowest butter intake". Substitution results (butter replaced by plant oils) were not displayed. Possible cohort overlap with Pimpin cannot be assessed from the displayed text.

### A4. Meat

### [S5-18] Papier et al. 2021 (BMC Medicine): meat intake and 25 common conditions, UK Biobank
- Citation: Papier K, et al. (2021). Meat consumption and risk of 25 common conditions: outcome-wide analyses in 475,000 men and women in the UK Biobank study. BMC Med. DOI 10.1186/s12916-021-01922-9 (displayed). Published 2 March 2021 per summary.
- Type / level: prospective cohort. Level IV.
- Design / population: 474,985 middle-aged adults recruited 2006–2010, followed to 2017 (mean 8.0 years); touchscreen questionnaire for meat intake; linked hospital admissions and deaths.
- Key results (as displayed): processed meat and ischaemic heart disease, HR per 20 g/day 1.09 (95% CI 1.04–1.15). Unprocessed red plus processed meat combined: IHD HR per 70 g/day 1.15 (1.07–1.23); diabetes 1.30 (1.20–1.42). Higher unprocessed red meat, processed meat and poultry were associated with higher risks of several conditions; higher BMI accounted for a substantial proportion. Unprocessed red meat and poultry were associated with lower iron-deficiency-anaemia risk.
- Snippets + URL:
  - "Processed meat intake was associated with a higher risk of ischaemic heart disease (HR per 20 g/day higher intake = 1.09, 95% CI 1.04–1.15)." — https://link.springer.com/article/10.1186/s12916-021-01922-9
  - "ischaemic heart disease (HRs per 70 g/day higher intake 1.15, 95% CIs 1.07–1.23) and diabetes (1.30, 1.20–1.42)" — same URL
  - "higher BMI accounted for a substantial proportion of these increased risks" — same URL
- Verification: V2 for design and the BMI statement (queries 15 and 20); V1 for the HRs (query 20). Springer, PMC7923515, UK Biobank and a medRxiv preprint in hit list.
- Certainty / limitations / funding / COI: not displayed. Single baseline measurement; units differ between estimates (20 g/day vs 70 g/day); the HR for unprocessed red meat alone and IHD was not displayed.
- Notes: version trail is a medRxiv preprint (2020) and the final BMC Med paper (2021); the displayed numbers may come from either, so check. Poultry is also associated with harm in this cohort (B8).

### [S5-19] Zeraatkar et al. 2019 (NutriRECS): lower vs higher red meat intake, systematic review of RCTs
- Citation: Zeraatkar D, et al. (2019). Effect of Lower Versus Higher Red Meat Intake on Cardiometabolic and Cancer Outcomes: A Systematic Review of Randomized Trials. Ann Intern Med 171(10):721–731 (as displayed). DOI 10.7326/M19-0622 (in the URL).
- Type / level: SR of RCTs. Level I. Date: 2019. Annals corrections and another "L"-numbered item linked to the NutriRECS set are in the hit lists (DOIs 10.7326/l19-0822, 10.7326/l20-0416, 10.7326/l20-0069); their content is unknown.
- Design / population: 12 eligible trials. The most credible evidence came from a single trial enrolling 48,835 women.
- Key results (as displayed): diets lower in red meat may have little or no effect on all-cause mortality (HR 0.99; 95% CI 0.95 to 1.03) and cardiovascular mortality (HR 0.98; CI 0.91 to 1.06) and CVD (HR 0.99; CI truncated in the displayed text). Authors: only low- to very-low-certainty evidence of minimal or no influence on all-cause mortality, cancer mortality, cardiovascular mortality, MI, stroke, diabetes, and GI and gynecologic cancer incidence.
- Snippets + URL:
  - "diets lower in red meat may have little or no effect on all-cause mortality (hazard ratio [HR], 0.99 [95% CI, 0.95 to 1.03])" — https://doi.org/10.7326/m19-0622
  - "A single trial enrolling 48,835 women provided the most credible evidence" — same URL
- Verification: V1 (query 21). Journal pages (acpjournals, doi.org) in the hit list.
- Certainty / limitations / funding / COI: low to very-low certainty by the authors' own rating. Funding/COI not displayed.
- Notes: the summary does not say what the single 48,835-woman trial tested; I recall it as a low-fat-diet trial (V0, D2), which would make it an indirect test of red meat. Check the full text before using it as RCT evidence on red meat.

### [S5-20] Zeraatkar et al. 2019 (NutriRECS): red and processed meat and all-cause mortality / cardiometabolic outcomes, cohort MA
- Citation: Red and Processed Meat Consumption and Risk for All-Cause Mortality and Cardiometabolic Outcomes: A Systematic Review and Meta-analysis of Cohort Studies. Ann Intern Med 171(10). DOI 10.7326/M19-0655 (in the URL). Authors: "Zeraatkar and colleagues" per summary.
- Type / level: SR/MA of cohorts. Level I design with Level IV inputs. Date: 2019. A companion paper "Patterns of Red and Processed Meat Consumption and Risk for Cardiometabolic and Cancer Outcomes" (M19-1583) is in the hit list.
- Key results (as displayed): low- to very-low-certainty evidence that reducing unprocessed red meat by 3 servings/week is associated with a very small reduction in risk for cardiovascular mortality, stroke, MI and type 2 diabetes. Reduction of processed meat is associated with a small to very small reduction in risk for all-cause mortality, cardiovascular mortality, stroke, MI and type 2 diabetes. No numeric effect sizes displayed.
- Snippets + URL:
  - "reducing unprocessed red meat intake by 3 servings per week is associated with a very small reduction in risk" — https://www.acpjournals.org/doi/10.7326/M19-0655
  - "a reduction in processed meat intake is associated with a small to very small reduction in risk for all-cause mortality" — same URL
- Verification: V1 (query 22). Annals pages in the hit list.
- Certainty / limitations / funding / COI: authors rate certainty low to very low. Funding/COI not displayed.
- Notes: a Correction to this paper and to the NutriRECS guideline exist (DOIs above); content unknown. The guideline itself ("Unprocessed Red Meat and Processed Meat Consumption: Dietary Guideline Recommendations From the NutriRECS Consortium", M19-1621) is in D1.

### [S5-21] NutriRECS cancer review 2019: reduction of red and processed meat and cancer
- Citation: Reduction of Red and Processed Meat Intake and Cancer Mortality and Incidence: A Systematic Review and Meta-analysis of Cohort Studies. Ann Intern Med 171, pages 711–20 (per summary). DOI 10.7326/M19-0699 (in the URL). The summary attributes it to "Zeraatkar et al."; author order not confirmed.
- Type / level: SR/MA of cohorts. Level I design with Level IV inputs.
- Key results (as displayed; the summary text is jumbled): reducing processed meat intake is described as giving fewer cancer events, "3 fewer events per 1000 persons with a decrease of 3 servings per week", with no statistically significant differences in incidence or mortality for 12 additional cancer outcomes including colorectal, gastric and pancreatic cancer mortality.
- Snippets + URL:
  - "3 fewer events per 1000 persons with a decrease of 3 servings per week" — https://www.acpjournals.org/doi/10.7326/M19-0699
  - "no statistically significant differences in incidence or mortality for 12 additional cancer outcomes" — same URL
- Verification: V1 (query 16). Do not rely on the numeric reading; the sentence does not say which cancer outcome and which meat type the "3 fewer events per 1000" belongs to.
- Certainty / limitations / funding / COI: not displayed.
- Notes: re-check against the abstract. See B7.

### [S5-22] Bechthold et al. 2019: food groups and CHD, stroke, heart failure (design only)
- Citation: Bechthold A, Boeing H, Schwedhelm C, Hoffmann G, Knüppel S, Iqbal K, et al. (2019). Food groups and risk of coronary heart disease, stroke and heart failure: a systematic review and dose-response meta-analysis of prospective studies. Crit Rev Food Sci Nutr 59:1071–1090 (as displayed in a SCIRP reference title).
- Type / level: SR/dose-response MA of prospective studies. Level I design with Level IV inputs. 123 reports; 12 food groups including dairy, red meat, processed meat and eggs.
- Key results (as displayed): no effect sizes displayed. The summary says there are "indications for non-linear dose-response relationships between whole grains, fruit, nuts, dairy, and red meat and coronary heart disease".
- Snippets + URL:
  - "The meta-analysis included 123 reports, and examined the relation between intake of 12 major food groups" — http://publications.cbra.be/bechthold2019.pdf
  - "indications for non-linear dose-response relationships between whole grains, fruit, nuts, dairy, and red meat and coronary heart disease" — same URL
- Verification: V1 (query 14). Design only; the red-meat and dairy RRs are not confirmed.
- Certainty / limitations / funding / COI: not displayed.
- Notes: needs a numeric follow-up query (D2).

### [S5-23] IARC Monographs Volume 114 (Bouvard et al., Lancet Oncol 2015): red meat and processed meat
- Citation: Bouvard V, et al. (2015). Carcinogenicity of consumption of red and processed meat. Lancet Oncol (published 26 October 2015 per summary). IARC Monographs Vol 114.
- Type / level: international expert-working-group hazard classification built on an evidence review; Level VII (committee) resting on Level I/IV evidence. Date: 2015 (no update seen).
- Design / population: 22 scientists from ten countries met in Lyon, October 2015; more than 800 studies of more than a dozen cancer types; the most influential evidence came from large prospective cohorts.
- Key results (as displayed): processed meat Group 1 (carcinogenic to humans; sufficient evidence for colorectal cancer). Red meat Group 2A (probably carcinogenic; limited evidence in humans plus strong mechanistic evidence). "each 50 gram portion of processed meat eaten daily increases the risk of colorectal cancer by 18%". IARC classifications "describe the strength of the scientific evidence ... rather than assessing the level of risk".
- Snippets + URL:
  - "Processed meat was classified as carcinogenic to humans (Group 1)" — https://www.thelancet.com/journals/lanonc/article/PIIS1470-2045(15)00444-1/abstract
  - "Red meat was evaluated as Group 2A (probably carcinogenic to humans)" — same URL
  - "each 50 gram portion of processed meat eaten daily increases the risk of colorectal cancer by 18%" — https://www.who.int/features/qa/cancer-red-meat/en/ (hit list; the summary does not say which page carried this sentence)
- Verification: V2 for the classifications (queries 18 and 19). V1 for the 18% (query 19; query 18 embedded the figure in the query text, so it does not count as independent). Primary or official hosts in the hit lists: IARC, Lancet Oncology, WHO, NCBI Bookshelf.
- Certainty / limitations / funding / COI: not applicable (working-group output). Hazard identification, not magnitude.
- Notes: nothing here separates SFA from other meat components. Question of components (sodium, nitrite, heme) not covered in this session.

### [S5-24] Bergeron et al. 2019: red meat vs white meat vs non-meat protein, low vs high SFA
- Citation: Bergeron N, Chiu S, Williams PT, King SM, Krauss RM (2019). Effects of red meat, white meat, and nonmeat protein sources on atherogenic lipoprotein measures in the context of low compared with high saturated fat intake: a randomized controlled trial. Am J Clin Nutr 110:24–33 (volume/pages from the corrigendum's title). DOI 10.1093/ajcn/nqz035 (displayed).
- Type / level: randomized controlled feeding trial. Level II. Date: 2019. A corrigendum exists (PubMed 31505551); its content is unknown.
- Design / population: participants assigned to a high-SFA (n = 62) or low-SFA (n = 51) background diet, each with red meat, white meat and nonmeat protein diets. Primary outcomes: LDL-C, apoB, small + medium LDL particles, total/HDL-C.
- Key results (as displayed): LDL-C and apoB were higher with red and white meat than with nonmeat protein, independent of SFA content; the rise was mainly large LDL particles. Independent of protein source, high compared with low SFA increased LDL-C, apoB and large LDL. Small + medium LDL and total/HDL-C were unaffected by protein source.
- Snippets + URL:
  - "LDL cholesterol and apoB were higher with red and white meat than with nonmeat, independent of SFA content." — https://touroscholar.touro.edu/faculty_pubs/2/
  - "Independent of protein source, high compared with low SFA increased LDL cholesterol, apoB, and large LDL." — same URL
  - "Patients were assigned a diet with high (n = 62) or low saturated fatty acid content (n = 51)" — same URL (hit list; page attribution not visible)
- Verification: V1 (query 17). Repository, ResearchGate, ScienceDaily and Healio in the hit list.
- Certainty / limitations / funding / COI: funding not displayed (check; meat-industry funding is possible in this field, unverified). Biomarker endpoints only.
- Notes: speaks to two narratives at once. It shows SFA raising LDL independently of protein source, and also shows meat protein sources raising LDL-C independently of SFA.

### A5. Tropical oils

### [S5-25] Neelakantan et al. 2020 (Circulation): coconut oil and cardiovascular risk factors, MA of RCTs
- Citation: Neelakantan N (lead author per summary), van Dam RM and colleagues (2020). The Effect of Coconut Oil Consumption on Cardiovascular Risk Factors (title as displayed; subtitle not displayed). Circulation 141:803–814. DOI 10.1161/CIRCULATIONAHA.119.043052 (displayed). Full author list not displayed. Search covered PubMed, SCOPUS, Cochrane Registry and Web of Science through June 2019.
- Type / level: SR/MA of RCTs. Level I. Date: 2020. Not superseded as far as seen, though newer coconut-oil meta-analyses exist (D1).
- Design / population: 873 potentially relevant articles; 16 articles with 17 trials, 730 participants; trials compared coconut oil with other fats for at least 2 weeks. Data available on lipids from all trials; body weight 8, percent body fat 5, waist circumference 4, fasting glucose 4, CRP 5.
- Key results (as displayed): coconut oil raised LDL-C by 10.47 mg/dL (95% CI 3.01, 17.94) and HDL-C by 4.00 mg/dL (95% CI 2.26, 5.73) compared with nontropical vegetable oils (percent change LDL-C 8.6%, HDL-C 7.8%). No significant effects on triglycerides, glycemia, inflammation or adiposity vs nontropical oils.
- Snippets + URL:
  - "Coconut oil consumption significantly increased LDL-cholesterol by 10.47 mg/dL (95% CI: 3.01, 17.94)" — https://www.ahajournals.org/doi/10.1161/CIRCULATIONAHA.119.043052
  - "HDL-cholesterol by 4.00 mg/dL (95% CI: 2.26, 5.73) as compared with nontropical vegetable oils" — same URL
  - "16 articles with a total of 17 trials that involved 730 participants" — same URL
  - "coconut oil consumption results in significantly higher LDL-cholesterol than nontropical vegetable oils" — same URL
- Verification: V2 for design and direction (queries 3 and 5, with the AHA article and TCTMD in the hit lists); V1 for the effect sizes (query 5 only).
- Certainty / limitations / funding / COI: GRADE not displayed. Comparator is "nontropical vegetable oils", pooled; the result against butter, palm oil or tallow was not displayed. Funding/COI not displayed.
- Notes: units here are mg/dL, Khaw uses mmol/L; no conversion done (B4). Virgin vs refined was not displayed.

### A6. Ultra-processed foods

### [S5-26] Lane et al. 2024 (BMJ): UPF umbrella review (design and headline only)
- Citation: Lane MM, et al. (2024). Ultra-processed food exposure and adverse health outcomes: umbrella review of epidemiological meta-analyses. BMJ, 28 February 2024. DOI 10.1136/bmj-2023-077310 (displayed).
- Type / level: umbrella review of meta-analyses. Level I.
- Key results (as displayed): "Consistent evidence shows that higher exposure to ultra-processed foods is associated with an increased risk of 32 damaging health outcomes". 45 unique pooled analyses. No information on saturated fat, SFA adjustment or individual food groups was displayed.
- Snippets + URL:
  - "higher exposure to ultra-processed foods is associated with an increased risk of 32 damaging health outcomes" — https://www.news-medical.net/news/20240229/Consistent-Evidence-Links-Ultra-Processed-Food-To-Over-30-Damaging-Health-Outcomes.aspx (SECONDARY press; page attribution of the sentence is not visible)
  - "The research evaluated 45 unique pooled analyses." — same hit list (SECONDARY)
- Verification: V1 (query 4), SECONDARY for the numbers; Johns Hopkins and Bond University records, the researchgate record and a Lancet Regional Health Europe commentary ("Are all ultra-processed foods bad for health?") are in the hit list.
- Certainty / limitations / funding / COI: not displayed. Evidence-class labels not seen.
- Notes: does not answer the stream's question (does UPF intake explain adverse associations of SFA?). Hall 2019 and SFA-adjusted analyses were not searched.

---

## B. Disagreements and discrepancies between sources

- **B1. Dairy fat as protective vs neutral vs no association.** S5-02 (dairy SFA HR 0.79 per +5 g/d) and S5-03 (high-fat-dairy-only analysis, 32% lower major CVD, press-derived) point toward a benefit. S5-01 (total dairy and milk neutral) and S5-04 (no significant association for milk, yogurt and high-fat dairy; inverse association for cheese and low-fat dairy; whole-milk drinkers in China had a 9% higher CHD risk) do not. Populations, exposure definitions and comparators differ, so these are not simple contradictions. S5-04 is the strongest counter-signal to "high-fat dairy is protective" in this ledger.
- **B2. Cheese vs butter vs unsaturated fat (trial comparators).** Cheese lowers LDL-C relative to butter (S5-11, S5-12 at −3.3%, S5-14). In the same trial (S5-12) LDL-C after cheese is higher than after carbohydrate (+2.6%), MUFA (+5.3%) and PUFA (+12.3%) diets. S5-13 finds no LDL difference between regular-fat and reduced-fat cheese, but neither arm is unsaturated fat. These are compatible findings on different comparator questions, and the synthesis must not merge them.
- **B3. Calcium / fecal-fat mechanism.** The summary of S5-11 says fecal fat excretion "did not differ" and also says the authors suggested higher fecal fat excretion from calcium. The two statements cannot both stand. S5-14's formulated-product arm hints at structure-dependent effects, but its arm list is garbled in the summary. Mechanism evidence retrieved in this session is therefore thin and unresolved.
- **B4. Coconut oil.** S5-25: LDL-C +10.47 mg/dL (95% CI 3.01, 17.94) vs nontropical vegetable oils. S5-15: coconut vs olive oil LDL-C −0.04 mmol/L (95% CI −0.27, 0.19) over 4 weeks in healthy adults, while butter exceeded both. Units differ (mg/dL vs mmol/L; not converted here), the comparators differ (pooled nontropical oils vs extra-virgin olive oil) and the trial is small. Whether Khaw 2018 was one of the 17 pooled trials was not displayed.
- **B5. Butter and mortality.** S5-16: RR 1.01 (95% CI 1.00, 1.03) per 14 g/day. S5-17: HR 1.04 (1.02–1.05) per 5 g/day and HR 1.15 for highest vs lowest intake. Units differ (14 g vs 5 g) and designs differ (MA of 9 cohorts vs one large pooled US analysis). Overlap of source cohorts cannot be checked from the displayed text. Compare only after conversion by the synthesizer.
- **B6. Unprocessed red meat and CHD.** S5-08 (authors' conclusion) says unprocessed red meat is not associated with CHD. S5-18 shows IHD HR 1.15 (1.07–1.23) per 70 g/day for unprocessed red plus processed meat combined and HR 1.09 (1.04–1.15) per 20 g/day for processed meat alone; the unprocessed-only IHD estimate was not displayed. S5-22 reports non-linear dose-response relationships for red meat and CHD (no numbers shown). S5-20 reports a very small reduction in CV mortality, stroke, MI and T2D when unprocessed red meat is reduced (low to very-low certainty). The sources differ on whether there is any association; the attribution to SFA is a separate question.
- **B7. Cancer and meat.** S5-23 classifies processed meat as Group 1 and red meat as Group 2A and reports 18% per 50 g/day for colorectal cancer. S5-21's summary reports no statistically significant differences for 12 additional cancer outcomes, with the summary jumbled. IARC says its classification describes the strength of evidence, not the level of risk, so the two are not necessarily in conflict, but the S5-21 reading is unreliable.
- **B8. White meat is not a lipid-neutral substitute in this trial.** S5-24 found LDL-C and apoB higher with red and white meat than with nonmeat protein, independent of SFA content. S5-18 also links poultry to higher risk of several conditions. This cuts against both "meat harm = SFA" and "poultry is safe".
- **B9. Version, date and attribution problems.**
  - Khaw 2018: 50 g (query 6) vs 50 mL (query 9).
  - Zhang 2025: "May 1, 2025" in the summary vs a Healio URL dated 2025-03-06.
  - Nature Communications dairy paper: "2024" in URL/DOI vs volume 16 (2025) in the IDEAS record, plus a 2023 medRxiv preprint.
  - Papier 2021: medRxiv preprint vs final.
  - Bergeron 2019: a corrigendum exists. NutriRECS items: Annals corrections exist (10.7326/l19-0822, l20-0416, l20-0069).
  - Raziani: the seed year 2018 is the particle-size secondary analysis; the main trial is 2016.
  - Feeney 2018 arms: garbled. Zeraatkar cancer review: garbled summary.
  - PURE: percentages are press-derived and mix two contrasts.
  - "Food industry ties" dairy review (query 28): the summary named an author and journal ("Chartres", "BMJ Open 2020") that the link list does not confirm. Only the title and PubMed URL (33277278) are confirmed, so the attribution is unreliable.

## C. Counter-evidence searched (what I looked for, found / not found)

- **Against "dairy is protective/neutral":**
  - Found: high milk intake and higher mortality (S5-10; no HRs displayed); no association for milk, yogurt and high-fat dairy and 9% higher CHD for whole-milk consumers in China (S5-04); butter and higher mortality in the largest US cohort analysis (S5-17); cheese LDL-C still higher than MUFA/PUFA diets (S5-12); butter LDL-C raising in two RCTs (S5-12, S5-15).
  - Found as a title only, no results: a systematic review of food-industry ties in dairy and CVD/mortality studies (PubMed 33277278). My attempt to get its results was refused by the cap.
  - Not run (cap): Mendelian-randomization studies of dairy intake or lactase persistence; a dairy-fat vs PUFA RCT search; a dairy-matrix mechanism check for MFGM and fermentation.
- **Against "meat is harmful":**
  - Found: NutriRECS low to very-low certainty and little or no effect of red-meat reduction in RCTs (S5-19, S5-20); BMI accounts for a substantial share of UK Biobank associations (S5-18); SFA-independent LDL effects of meat protein (S5-24); the Astrup 2020 argument that SFA content of meat is unlikely to be responsible (S5-08).
  - Found as titles only: the NutriRECS dietary-guideline paper (M19-1621); a Lancet letter "36-fold higher estimate of deaths attributable to red meat intake in GBD 2019: is this reliable?"; a Bayesian network meta-analysis of red-meat RCTs on CV risk factors (year inferred from the URL as 2025).
  - Not run (cap): sodium / nitrite / heme attribution; poultry-specific MAs; plant-based-meat RCTs; meat and T2D individual-participant MA.
- **Butter specifically:** found Pimpin 2016 (neutral to weak), Zhang 2025 (harm), Brassard 2017 and Khaw 2018 (LDL-C). Not found: a butter-vs-PUFA/MUFA RCT meta-analysis (one AJCN butter-vs-olive-oil trial, "Butter increased total and LDL cholesterol compared with olive oil but resulted in higher HDL cholesterol compared with a habitual diet", appears as a title only).
- **Coconut oil:** both for and against searched (S5-25 vs S5-15). A virgin-vs-refined comparison was not retrieved. Newer 2025 meta-analyses are in D1 as titles only.
- **Ultra-processed foods and SFA:** not searched for SFA-adjusted analyses, so nothing is known about whether UPF explains SFA associations.

## D. Leads

### D1. Existence confirmed from a search hit (title and URL seen); contents NOT read, no numbers extracted

Dairy
- "Effect of Isoenergetic Substitution of Cheese with Other Dairy Products on Blood Lipid Markers in the Fasted and Postprandial State: An Updated and Extended Systematic Review and Meta-Analysis of Randomized Controlled Trials in Adults" — https://pmc.ncbi.nlm.nih.gov/articles/PMC10721513/ (key for cheese vs butter)
- "Association of food industry ties with findings of studies examining the effect of dairy food intake on cardiovascular disease and mortality: systematic review and meta-analysis" — https://pubmed.ncbi.nlm.nih.gov/33277278 (COI-critical)
- "Intake of dairy products and associations with major atherosclerotic cardiovascular diseases: a systematic review and meta-analysis of cohort studies" — https://www.nature.com/articles/s41598-020-79708-x
- "Dairy Product Consumption and Cardiovascular Health: A Systematic Review and Meta-analysis of Prospective Cohort Studies" — https://www.sciencedirect.com/science/article/pii/S2161831322000710
- "Consumption of Dairy Foods and Cardiovascular Disease: A Systematic Review" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8875110/
- "Milk and Dairy Product Consumption and Cardiovascular Diseases: An Overview of Systematic Reviews and Meta-Analyses" — https://pmc.ncbi.nlm.nih.gov/articles/PMC6518146/
- "Substitution of Dairy Products and Risk of Death and Cardiometabolic Diseases: A Systematic Review and Meta-Analysis of Prospective Studies" — https://cdn.nutrition.org/article/S2475-2991(24)00093-3/fulltext
- "The dose-response relationship between dairy product intake and all-cause and cardiovascular mortality risk: a systematic review and meta-analysis of prospective cohort studies" — https://pmc.ncbi.nlm.nih.gov/articles/PMC12873575/
- "Effects of Dairy Intake on Markers of Cardiometabolic Health in Adults: A Systematic Review with Network Meta-Analysis" — https://pmc.ncbi.nlm.nih.gov/articles/PMC10201829/
- "Consumption of Yogurt and the Incident Risk of Cardiovascular Disease: A Meta-Analysis of Nine Cohort Studies" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5372978/
- "Association between dairy intake and multiple health outcomes: a scoping review of systematic reviews and meta-analyses" — https://www.nature.com/articles/s41430-025-01639-5
- "Cheese intake lowers plasma cholesterol concentrations without increasing bile acid excretion" — https://www.sciencedirect.com/science/article/pii/S2352385915300141
- "Role of food matrix in modulating dairy fat induced changes in lipoprotein particle size distribution in a human intervention" — https://ajcn.nutrition.org/article/S0002-9165(22)10504-6/fulltext
- "Whole-Milk Dairy Foods: Biological Mechanisms Underlying Beneficial Effects on Risk Markers for Cardiometabolic Health" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10721525/
- "Dairy matrix: is the whole greater than the sum of the parts?" — https://pubmed.ncbi.nlm.nih.gov/34879148/
- "Saturated fat from dairy sources and cardio-metabolic health: insights from the STANISLAS cohort" — https://link.springer.com/article/10.1007/s00394-025-03763-1
- "Saturated fats, dairy foods and cardiovascular health: No longer a curious paradox?" (Givens, Nutrition Bulletin 2022) — https://onlinelibrary.wiley.com/doi/10.1111/nbu.12585
- "Effects of Full-Fat and Fermented Dairy Products on Cardiometabolic Disease: Food Is More Than the Sum of Its Parts" (Adv Nutr) — https://advances.nutrition.org/article/S2161-8313(22)00436-7/fulltext
- "Potential Cardiometabolic Health Benefits of Full-Fat Dairy: The Evidence Base" (Adv Nutr) — https://www.sciencedirect.com/science/article/pii/S2161831322002836
- "Serial measures of circulating biomarkers of dairy fat and total and cause-specific mortality in older adults: the Cardiovascular Health Study" — https://pubmed.ncbi.nlm.nih.gov/30007304/
- "Dietary Saturated Fats and Health: Are the U.S. Guidelines Evidence-Based?" (authors, year and journal not displayed; possibly the seed "Astrup 2021") — https://www.researchgate.net/publication/354867607_Dietary_Saturated_Fats_and_Health_Are_the_US_Guidelines_Evidence-Based
- "There Is More Than Meets the Label: Rethinking Saturated Fat and Cardiovascular Health" (year inferred from URL) — https://pubmed.ncbi.nlm.nih.gov/40416005/

Butter, coconut and tropical oils
- "Butter increased total and LDL cholesterol compared with olive oil but resulted in higher HDL cholesterol compared with a habitual diet" (AJCN) — https://ajcn.nutrition.org/article/S0002-9165(23)12500-7/fulltext
- "Effects of coconut oil, olive oil, and butter on plasma fatty acids and metabolic risk factors: a randomized trial" (J Lipid Res 2024) — https://pmc.ncbi.nlm.nih.gov/articles/PMC11618001/
- "Tropical Oil Consumption and Cardiovascular Disease: An Umbrella Review of Systematic Reviews and Meta Analyses" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8148021/
- "Analysis of 26 Studies of the Impact of Coconut Oil on Lipid Parameters: Beyond Total and LDL Cholesterol" — https://pmc.ncbi.nlm.nih.gov/articles/PMC11819987/
- "The effect of virgin coconut oil (VCO) on cardiovascular disease risk factors: a systematic review and meta-analysis" — https://link.springer.com/article/10.1186/s13098-025-02019-6
- "Medium-Chain Triglyceride Oil and Blood Lipids: A Systematic Review and Meta-Analysis of Randomized Trials" (J Nutr) — https://jn.nutrition.org/article/S0022-3166(22)00366-2/fulltext
- "Effects of consumption of coconut oil or coconut on glycemic control and insulin sensitivity: A systematic review and meta-analysis of interventional trials" (NMCD) — https://www.nmcd-journal.com/article/S0939-4753(21)00454-3/abstract
- "Coconut Oil and Heart Health" (Circulation 2020 commentary) — https://www.ahajournals.org/doi/10.1161/CIRCULATIONAHA.119.044687
- "Coconut Oil and Cardiovascular Disease Risk" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10182109/
- Commentaries on Zhang 2025: "The role of high-fat diets in cancer mortality: is butter to blame?" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12333795/

Meat
- "Meat consumption and risk of ischemic heart disease: A systematic review and meta-analysis" (Crit Rev Food Sci Nutr) — https://www.tandfonline.com/doi/full/10.1080/10408398.2021.1949575
- "Effect of red meat consumption on cardiovascular risk factors: A systematic review and Bayesian network meta-analysis of randomized controlled trials" — https://www.sciencedirect.com/science/article/pii/S0261561425002493
- NutriRECS guideline: "Unprocessed Red Meat and Processed Meat Consumption: Dietary Guideline Recommendations From the Nutritional Recommendations (NutriRECS) Consortium" — https://www.acpjournals.org/doi/10.7326/M19-1621
- "Patterns of Red and Processed Meat Consumption and Risk for Cardiometabolic and Cancer Outcomes" — https://www.acpjournals.org/doi/10.7326/M19-1583
- "36-fold higher estimate of deaths attributable to red meat intake in GBD 2019: is this reliable?" (Lancet) — https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(22)00311-7/fulltext
- "Food groups and risk of all-cause mortality: a systematic review and meta-analysis of prospective studies" (AJCN) — https://www.sciencedirect.com/science/article/pii/S0002916522049206
- SECONDARY controversy pieces seen: PCRM "Journal Advice to Eat Cancer-Causing Meats: Science or Clickbait?"; Science Media Centre "expert reaction to new papers looking at red and processed meat consumption and health"; Table Debates "Controversy on red and processed meat consumption".

UPF
- "Ultra-processed foods and risk of all-cause mortality: an updated systematic review and dose-response meta-analysis of prospective cohort studies" — https://link.springer.com/article/10.1186/s13643-025-02800-8
- "Are all ultra-processed foods bad for health?" (Lancet Reg Health Eur 2024) — https://www.thelancet.com/journals/lanepe/article/PIIS2666-7762(24)00273-4/fulltext

### D2. V0: background memory and the dispatcher's seed list. NOT seen in a search result this session. NOT findings. Do not cite. Titles, years and details may be wrong.

- Dairy: Mozaffarian's "dairy foods and the food matrix" writing and the seed "Mozaffarian 2016" (unclear which paper is meant). Astrup 2016 and Astrup 2021 contents. Gijsbers 2016 and other dairy-T2D meta-analyses. Chiu (RCTs on higher-fat/dairy-fat diets and LDL particles; not found). Calcium–fatty-acid soap work (Lorenzen, Astrup, Soerensen). Milk fat globule membrane (Rosqvist 2015; Venkatramanan). The PURE dairy HRs and CIs from the Lancet abstract.
- Meat: Zhong 2020 (JAMA Intern Med; processed meat, unprocessed red meat, poultry, fish and CVD). The 2024 meat-and-T2D individual-participant meta-analysis (InterConnect). SWAP-MEAT (plant-based meat vs animal meat; TMAO and LDL-C). BOLD lean-beef trials. Heme-iron CVD meta-analyses. WCRF/AICR Continuous Update Project on processed meat and colorectal cancer. My recollection (unverified) that the single 48,835-woman trial in Zeraatkar's RCT review is the Women's Health Initiative low-fat dietary-modification trial. The NutriRECS guideline's weak recommendation to continue current meat intake.
- Tropical oils: Eyres 2016 (Nutr Rev), Fattore 2014 (palm oil meta-analysis, AJCN), Sun 2015 (palm oil and LDL-C, J Nutr), palm kernel oil and lauric acid, MCT oil and lipids, virgin vs refined coconut oil.
- Stearic acid / cocoa butter: Hunter 2010 (AJCN systematic review of stearic acid), Mensink and Thijssen work on stearic acid and lipoproteins, dark-chocolate RCTs.
- Individual SFAs: Mensink 2003 (AJCN, 60 trials) and the 2016 WHO regression analysis on SFA and lipids; Zong 2016 (BMJ) on individual SFAs and CHD in NHS/HPFS. Odd-chain: Forouhi 2014 (EPIC-InterAct), Imamura 2018 (PLoS Med, pooled dairy-fat biomarkers and T2D), the Venn-Watson C15:0 "essential fatty acid" proposal and any critiques. Very-long-chain SFA (C20:0, C22:0, C24:0): Lemaitre, Fretts, Malik (cohort studies of plasma VLCSFA and diabetes, heart failure, CHD, mortality).
- Plant vs animal SFA: Zhuang (NIH-AARP dietary fats and mortality), Wang 2016 (JAMA Intern Med), Guasch-Ferré (PREDIMED), Praagman (EPIC-Netherlands by SFA source).
- What replaces SFA: Jakobsen 2009 (pooled cohorts), Li 2015 (JACC), Sacks 2017 (AHA advisory), Hooper 2020 (Cochrane); likely covered by sibling streams S2/S3.
- UPF: Hall 2019 (inpatient RCT of ultra-processed vs unprocessed diets; energy intake and weight), Srour 2019 (NutriNet-Santé, BMJ), the 2025 Lancet UPF series, NOVA classification of cheese, yogurt and processed meats, any analysis adjusting UPF associations for SFA.
- Funding/COI to verify (nothing here is confirmed): dairy-favourable reviews and trials (S5-05, S5-06, S5-07, S5-08, S5-12, S5-13, S5-14), and the meat trials (S5-24).

### D3. Suggested follow-up queries once the cap is raised (use `extended` mode)

1. `"Effect of Isoenergetic Substitution of Cheese with Other Dairy Products on Blood Lipid Markers" meta-analysis LDL-C mean difference`
2. `"Association of food industry ties with findings of studies examining the effect of dairy food intake" results conclusions favorable`
3. `PURE dairy Lancet Dehghan abstract hazard ratio total dairy whole-fat dairy composite outcome`
4. `Mensink 2003 effect of dietary fatty acids on serum lipids lauric myristic palmitic stearic LDL HDL meta-analysis` and `WHO 2016 Mensink saturated fatty acids serum lipids regression`
5. `Hunter Kris-Etherton stearic acid cardiovascular risk systematic review` and `Thijssen Mensink stearic acid LDL`
6. `Fattore palm oil blood lipids meta-analysis` and `Sun palm oil LDL cholesterol meta-analysis`; `palm kernel oil lauric acid LDL HDL`
7. `Forouhi EPIC-InterAct plasma phospholipid saturated fatty acids type 2 diabetes odd-chain`; `Imamura pooled analysis dairy fat biomarkers type 2 diabetes`; `pentadecanoic acid C15:0 essential fatty acid critique`
8. `very-long-chain saturated fatty acids Lemaitre Fretts mortality heart failure diabetes`
9. `Zong 2016 BMJ individual saturated fatty acids coronary heart disease`; `plant versus animal saturated fat mortality cohort Zhuang`
10. `Hall 2019 ultra-processed diets inpatient randomized ad libitum energy intake`; `ultra-processed food cardiovascular risk adjusted for saturated fat`
11. `Zhong 2020 JAMA Internal Medicine poultry red meat processed meat incident cardiovascular disease`; `meat consumption type 2 diabetes individual-participant meta-analysis InterConnect`; `heme iron nitrite sodium processed meat mechanism cardiovascular`
12. `Bechthold 2019 red meat processed meat dose-response relative risk per 100 g coronary heart disease`

## E. Search log (query | mode | useful Y/N)

Completed (31):

1. Guo 2017 dairy CVD dose-response meta-analysis | extended | Y (S5-01)
2. de Oliveira Otto 2012 SFA by food source MESA | extended | Y (S5-02)
3. Neelakantan 2020 coconut oil Circulation meta-analysis | extended | Y (S5-25 design)
4. Lane 2024 BMJ UPF umbrella review | extended | Y, design only (S5-26)
5. Neelakantan title + LDL mg/dL + HDL + nontropical oils | extended | Y (S5-25 numbers)
6. Khaw 2018 BMJ Open coconut / olive / butter | extended | Y (S5-15 design)
7. Brassard 2017 butter vs cheese LDL crossover | extended | Y (S5-12)
8. Hjerpsted 2011 cheese vs butter | extended | Y (S5-11)
9. Khaw 2018 LDL-C change mmol/L, 95% CI | extended | Y (S5-15 numbers)
10. Raziani 2018 regular-fat vs reduced-fat cheese | extended | Y (S5-13)
11. Feeney 2018 dairy matrix cheese RCT | extended | Y, no numbers (S5-14)
12. Pimpin 2016 "Is Butter Back?" | extended | Y (S5-16)
13. Zhang 2025 JAMA IM butter and plant oils | extended | Y (S5-17)
14. Bechthold 2019 food groups CHD stroke heart failure | extended | Partial, design only (S5-22)
15. Papier 2021 BMC Med meat 25 conditions UK Biobank | extended | Y, partial numbers (S5-18)
16. Zeraatkar 2019 NutriRECS cancer cohort review | extended | Partial, garbled (S5-21)
17. Bergeron 2019 red / white / nonmeat protein LDL | extended | Y (S5-24)
18. IARC Monographs 114 red / processed meat (query embedded "18%") | extended | Partial, 18% not shown (S5-23)
19. IARC Q&A "50 gram portion of processed meat" | extended | Y (S5-23)
20. Papier UK Biobank HR per g/d, BMI mediation | extended | Y (S5-18 numbers)
21. Zeraatkar RCT review "Effect of Lower Versus Higher Red Meat Intake" | extended | Y (S5-19)
22. Zeraatkar cohort MA red and processed meat, all-cause mortality | extended | Y (S5-20)
23. Drouin-Chartier 2016 dairy systematic review | extended | Y (S5-05)
24. Hirahatake 2019 dairy foods and dairy fats | extended | Y (S5-06)
25. Thorning 2017 whole dairy matrix | extended | Y (S5-07)
26. Astrup / Magkos / Bier 2020 JACC saturated fats and health | extended | Y (S5-08)
27. Michaelsson 2014 BMJ milk and mortality | extended | Y (S5-10)
28. Food-industry ties in dairy CVD studies (systematic review) | extended | Partial, title only, attribution in summary unreliable (D1)
29. Dehghan 2018 PURE dairy Lancet | extended | Y, SECONDARY numbers (S5-03)
30. "A global analysis of dairy consumption and incident cardiovascular disease" Nat Commun | extended | Y (S5-04)
31. Trieu 2021 PLoS Med dairy fat biomarkers | extended | Y (S5-09)

Attempted and refused (session cap, "Web search was not performed"; no information gained):

- R1. Dairy industry ties / favorable conclusions | standard | NOT RUN
- R2. PURE dairy Lancet abstract hazard ratios | extended | NOT RUN
- R3. Cheese calcium fatty-acid soaps / fecal fat | extended | NOT RUN
- R4. Milk fat globule membrane RCT / fermented dairy mechanism | extended | NOT RUN
- R5. Gijsbers 2016 dairy and diabetes dose-response MA | extended | NOT RUN
