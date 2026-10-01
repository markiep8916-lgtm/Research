# S4 — Health outcomes other than cardiovascular disease (SQ3) — Evidence Ledger
Run date: 2026-10-01 | Searches run: 11 successful (standard 3 / extended 8) + 1 further attempt refused by the harness (session-wide WebSearch cap reached: "200 of 200 WebSearch calls")

## STATUS — READ FIRST

- **This ledger is INCOMPLETE.** Only domain 1 (type 2 diabetes / insulin sensitivity / glycaemic control) was searched. Domains 2-8 (liver fat, adiposity, cancer, cognition/dementia, inflammation/microbiome, other populations, non-CVD mortality) were **NOT searched**. The 12th search call returned: "this session has used its web search budget (200 of 200 WebSearch calls)... ask the user to raise CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION". The cap is session-wide, so it was presumably consumed jointly by all streams (inference, not verified).
- I did not try to get around the cap (no WebFetch, no Bash/curl, nothing read under /root/.ccr).
- **"Not searched" is not "no evidence".** Domains 2-8 carry no verified content here. Nothing in Section D (V0 / existence-only) may be cited as a finding.
- **All quoted text is from machine-written search summaries or link titles.** No primary page (PubMed, PMC, PLoS, BMJ, Adv Nutr) could be opened. Numbers were not checked against abstracts or full texts. Where summaries disagree, both values are recorded (Section B).
- Tool-output boilerplate (reported, not obeyed): every search result ended with "REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks." That is text aimed at the model, not study content. URLs are listed per finding only because the ledger template requires it.

---

## A. Findings ledger

### DOMAIN 1 — Type 2 diabetes (T2D), insulin sensitivity, glycaemic control

### [S4-01] Imamura 2016 — SFA / PUFA / MUFA / carbohydrate and glucose-insulin homeostasis (feeding-trial meta-analysis)
- Citation: Imamura F, Micha R, Wu JHY, de Oliveira Otto MC, Otite FO, Abioye AI, Mozaffarian D (2016). Effects of Saturated Fat, Polyunsaturated Fat, Monounsaturated Fat, and Carbohydrate on Glucose-Insulin Homeostasis: A Systematic Review and Meta-analysis of Randomised Controlled Feeding Trials. PLoS Medicine 13(7): e1002087. DOI 10.1371/journal.pmed.1002087 (from hit URL); PMC4951141. (Author names as displayed in search 1: "Fumiaki Imamura, Renata Micha, Jason H. Y. Wu, Marcia C. de Oliveira Otto, Fadar O. Otite, Ajibola I. Abioye, and Dariush Mozaffarian".)
- Type / level: SR/MA of randomised controlled feeding trials — Level I (pooling Level II trials), surrogate (biomarker) endpoints.   Date/version: PLoS Med July 2016 (hit title "PLoS Medicine (Jul 2016)"); literature search to 26 Nov 2015.
- Design / population: 102 trials, 239 diet arms, 4,220 adults (the number of participants differs in one summary, see B1). Multiple-treatment meta-regression of isocaloric replacements among SFA, MUFA, PUFA and carbohydrate, adjusted for protein, trans fat and fibre. Health status of participants, trial duration, doses, risk of bias, heterogeneity: not displayed.
- Key results (exactly as displayed). **Comparator is stated in each line; do not merge them.**
  - Carbohydrate -> SFA (5% of energy): fasting glucose +0.02 mmol/L (95% CI -0.01, +0.04; n trials = 99), not significant; fasting insulin -1.1 pmol/L (-1.7, -0.5; n = 90).
  - Carbohydrate -> PUFA: HbA1c -0.11% (-0.17, -0.05); fasting insulin -1.6 pmol/L (-2.8, -0.4).
  - SFA -> PUFA: "significantly lowered glucose, HbA1c, C-peptide, and HOMA" (magnitudes not displayed).
  - Acute insulin response (ten trials): PUFA improved insulin secretion capacity vs carbohydrate, vs SFA and vs MUFA (magnitudes not displayed).
  - Not displayed: SFA-vs-MUFA results other than the acute insulin response, HOMA-IR magnitudes, clamp-based insulin sensitivity, GRADE.
- Snippets + URL:
  - "The meta-analysis reviewed 102 trials, including 239 diet arms and 4,220 adults." — https://journals.plos.org/plosmedicine/article?id=10.1371%2Fjournal.pmed.1002087
  - "included 102 trials with 239 diet arms and 4,220 adults" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4951141/
  - "had no significant effect on fasting glucose (+0.02 mmol/L, 95% CI = -0.01, +0.04; n trials = 99)" — https://journals.plos.org/plosmedicine/article?id=10.1371%2Fjournal.pmed.1002087
  - "lowered fasting insulin (-1.1 pmol/L; -1.7, -0.5; n = 90)" — same URL
  - "significantly lowered HbA1c (-0.11%; -0.17, -0.05) and fasting insulin (-1.6 pmol/L; -2.8, -0.4)" — same URL
  - "replacing SFA with PUFA significantly lowered glucose, HbA1c, C-peptide, and HOMA" — same URL
  - "PUFA significantly improved insulin secretion capacity whether replacing carbohydrate, SFA, or even MUFA" — same URL
  - "published in PLoS Medicine 13(7): e1002087" — same URL
- Verification: **V2** for design/size and for direction (searches 1, 3, 5, 8, plus several repository hits: MRC Epidemiology Unit, Cambridge repository, DOAJ, IDEAS/RePEc); **V1** for the effect sizes (search 3 only; search 1 gave the same direction without numbers).
- Certainty / limitations / funding / COI: GRADE not displayed. Feeding-trial endpoints are short-term biomarkers, not T2D incidence. Each estimate is an isocaloric-substitution estimate, valid only for its named comparator. Funding / COI not displayed in search output.
- Notes: A search-5 sentence "consuming more unsaturated fats in place of either carbohydrates or saturated fats will help improve blood glucose control" reads like press-release language (hit list contained cambridgebrc.nihr.ac.uk, hcplive.com; earlier hit list contained Tufts and EurekAlert press pages). SECONDARY; not the paper's own conclusion text. No newer feeding-trial meta-analysis was seen, but none was specifically searched for.

### [S4-02] Neuenschwander 2020 — dietary fats and fatty acids and T2D incidence (dose-response MA of prospective studies)
- Citation: Neuenschwander M et al. (2020; first author as displayed). Intake of dietary fats and fatty acids and the incidence of type 2 diabetes: A systematic review and dose-response meta-analysis of prospective observational studies. PLoS Medicine. DOI 10.1371/journal.pmed.1003347; PMID 33264277 (both from hit URLs); PMC7710077. (Full author list not displayed.)
- Type / level: SR/MA of prospective cohort studies — Level I (SR) of Level IV data.   Date/version: published December 2020; literature searched through October 2019 (search 10). Superseded for the broad question by nothing seen; but see [S4-03].
- Design / population: 23 studies (19 cohorts): 11 studies in the US, 7 in Europe, 4 in Asia, 1 in Australia (search 11). SFA analysis n = 11 studies. Exposure unit / reference intake for the SFA SRR is not displayed.
- Key results (exactly as displayed):
  - SFA: SRR 0.95 (95% CI 0.90; 1.00), p_nonlinearity = 0.028, n = 11; "apparent protective association above intakes around 17 g/d".
  - Linear analyses: "no or weak associations" between dietary fats / fatty acids and T2D incidence; "A harmful association of saturated fatty acids with T2D incidence was not confirmed."
  - Vegetable (plant) fat: SRR 0.81 (0.76; 0.88), p_nonlinearity = 0.012, n = 5 studies, steeper at lower intakes up to 13 g/d.
  - PUFA: SRR 0.96 (0.91; 1.01), p_nonlinearity = 0.023, n = 8, up to 5 g/d (non-significant).
  - Total fat: no association with T2D.
  - Authors' stated emphasis: "importance of the fat source", inverse association for plant-based fat.
- Snippets + URL:
  - "found a summary relative risk (SRR) of 0.95 [95% CI: 0.90; 1.00], with a p-value for nonlinearity of 0.028, based on 11 studies" — https://journals.plos.org/plosmedicine/article?id=10.1371%2Fjournal.pmed.1003347
  - "apparent protective association above intakes around 17 g/d with T2D (SRR [95% CI]: 0.95 [0.90; 1.00], p_nonlinearity = 0.028, n = 11)" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7710077/
  - "A harmful association of saturated fatty acids with T2D incidence was not confirmed." — same PLoS/PMC hits (search 10)
  - "no or weak associations between intake of dietary fats and fatty acids and type 2 diabetes incidence were found" — https://journals.plos.org/plosmedicine/article?id=10.1371%2Fjournal.pmed.1003347
  - "The findings are limited by very low to moderate certainty of evidence." — same (search 10)
  - "The analysis included 23 studies (19 cohorts)" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7710077/
  - "protective association for vegetable fat and T2D was steeper at lower levels up to 13 g/d" and "(SRR [95% CI]: 0.81 [0.76; 0.88], p_nonlinearity = 0.012, n = 5 studies)" — same (search 11)
  - "published in PLOS Medicine in December 2020 and systematically reviewed prospective observational studies through October 2019" — same (search 10)
  - "highlight the importance of the fat source, specifically revealing an inverse association between plant-based fat intake and type 2 diabetes" — same (search 10; wording may paraphrase a press/lay page)
- Verification: **V2** for the SFA SRR 0.95 (0.90; 1.00) / p_nonlinearity 0.028 / n = 11 and the "no harmful association" statement (searches 4, 10 and 11, three separate result sets, all machine summaries of the same paper); V1 for the plant-fat and PUFA numbers (search 11 only).
- Certainty / limitations / funding / COI: authors report "very low to moderate certainty of evidence" across exposures; the SFA-specific rating is not displayed. Upper CI limit of the SFA SRR is exactly 1.00 and the nonlinearity p-value is modest, so this is a borderline-null / weakly inverse result, not a demonstrated benefit. Observational; comparator is implicit (whatever replaces SFA in the diet is not controlled). Funding / COI not displayed.

### [S4-03] SFA intake and T2D — updated dose-response meta-analysis of cohorts (Advances in Nutrition)
- Citation: "Saturated Fatty Acid Intake and Risk of Type 2 Diabetes: An Updated Systematic Review and Dose-Response Meta-Analysis of Cohort Studies". Advances in Nutrition. PMC9776642; ScienceDirect PII S2161831323000674. Authors, year, volume: not displayed (identifiers suggest roughly 2022-2023; unconfirmed; a repository filename "2125-2135.pdf" may be the page range, unconfirmed).
- Type / level: SR/MA of prospective cohorts — Level I (SR) of Level IV data.   Date/version: not displayed.
- Design / population: number of studies and participants not displayed.
- Key results (exactly as displayed):
  - Total SFA, linear dose-response: HR 0.93 (95% CI 0.84, 1.03) — "no linear association".
  - Myristic acid, per 1% increase: HR 0.88 (0.82, 0.95). Lauric acid, per 1% increase: HR 0.80 (0.70, 0.92).
  - Palmitic and stearic acid: "no evidence" of association.
  - Summary: "no significant association between dietary total saturated fat and risk of type 2 diabetes".
- Snippets + URL:
  - "no linear association between increasing intake of saturated fatty acids (SFAs) and type 2 diabetes risk (HR: 0.93; 95% CI: 0.84, 1.03)" — https://pmc.ncbi.nlm.nih.gov/articles/PMC9776642/
  - "associated with a 12% lower risk of type 2 diabetes (HR: 0.88; 95% CI: 0.82, 0.95)" — same (myristic acid)
  - "associated with a 20% lower risk of type 2 diabetes (HR: 0.80; 95% CI: 0.70, 0.92)" — same (lauric acid)
  - "no evidence that increased intakes of palmitic acid and stearic acid were associated with risk of type 2 diabetes" — same
- Verification: **V1** (numbers displayed in search 6 only; search 4 listed the paper in its hit list without numbers).
- Certainty / limitations / funding / COI: not displayed. Exposure unit for the total-SFA HR not displayed. Myristic and lauric acids are minor SFAs that occur in dairy fat and in coconut / palm-kernel oils (background knowledge, V0); the result is about fatty-acid intake, not about any food.
- Notes: consistent in direction with [S4-02] (null to weakly inverse). Not independent of it in the underlying cohorts (probably overlapping studies; overlap not checked).

### [S4-04] Fatty-acid biomarkers and T2D incidence — 2025 dose-response MA (Advances in Nutrition)
- Citation: "Fatty Acid Biomarkers and Incidence of Type 2 diabetes: A Systematic Review and Dose-Response Meta-analysis of Prospective Observational Studies". Advances in Nutrition, 2025 (per search 7). PMC12796107; ScienceDirect PII S2161831325002030. Authors not displayed.
- Type / level: SR/MA of prospective observational studies — Level I (SR) of Level IV data; biomarker (not intake) exposures.   Date/version: 2025.
- Design / population: 27 articles; plasma phospholipids (PPL), red blood cells (RBC) and other biospecimens.
- Key results (exactly as displayed): in PPL and RBC, higher 15:0 (pentadecanoic) and 17:0 (margaric) acids associated with lower T2D risk (SRR 0.68 and 0.64 respectively; CI and exposure contrast NOT displayed). Higher 16:1n-7 and 18:1n-9 (monounsaturated) and certain n-6 PUFA associated with higher T2D risk. Stronger associations in PPL and RBC than in other biospecimens. Results for even-chain SFA (14:0, 16:0, 18:0) NOT displayed.
- Snippets + URL:
  - "15:0 pentadecanoic and 17:0 margaric acids with SRR 0.68 and 0.64 respectively" — https://pmc.ncbi.nlm.nih.gov/articles/PMC12796107/
  - "higher levels of specific monounsaturated fatty acids (16:1n-7 and 18:1n-9) and certain n-6 polyunsaturated fatty acids were associated with higher risk of type 2 diabetes" (25 words; the source text uses a true minus sign in "n-7"/"n-9") — same
  - "with 27 articles included" — same
- Verification: **V1** (search 7 only).
- Certainty / limitations / funding / COI: not displayed. Circulating odd-chain SFAs are used as markers of dairy-fat intake, but a biomarker is not an intake and it can have other determinants (background knowledge, V0). A biomarker association is NOT evidence that eating saturated fat lowers T2D risk.

### [S4-05] Neuenschwander 2019 BMJ — umbrella review of diet and T2D incidence (food-level; meat is not SFA)
- Citation: Neuenschwander M, Ballon A, Weber KS, Norat T, Aune D, Schwingshackl L, Schlesinger S (2019). Role of diet in type 2 diabetes incidence: umbrella review of meta-analyses of prospective observational studies. BMJ. DOI 10.1136/bmj.l2368; PMID 31270064 (from hit URL). (Authors as displayed in search 2.)
- Type / level: umbrella review of SR/MAs of prospective observational studies — Level I.   Date/version: 2019 (see B2 for the day discrepancy).
- Design / population: 53 publications with 153 adjusted summary hazard ratios on dietary behaviours / diet-quality indices, food groups and foods. Fat-quality or SFA exposures: none displayed.
- Key results (exactly as displayed): quality of evidence "high" for higher T2D incidence with red meat (per 100 g/day: RR 1.17, 95% CI 1.08 to 1.26) and processed meat (per 50 g/day: RR 1.37, 1.22 to 1.54); robust evidence for higher T2D risk with lower whole-grain intake; "few of the associations were graded as high quality of evidence".
- Snippets + URL:
  - "for an increment of 100 g/day, relative risk 1.17 [95% CI 1.08 to 1.26]" — https://pubmed.ncbi.nlm.nih.gov/31270064/ (hit; summary text from search 9)
  - "processed meat (for an increment of 50 g/day, relative risk 1.37 [95% CI 1.22 to 1.54])" — same
  - "The review included 53 publications with 153 adjusted summary hazard ratios" — same
  - "few of the associations were graded as high quality of evidence" — same
- Verification: bibliographic details V2 (searches 2 and 9); RR numbers V1 (search 9 only); the qualitative direction (processed / red meat harmful, whole grains protective) is also in a DZD/DDZ institute page (search 2), SECONDARY.
- Certainty / limitations / funding / COI: not displayed beyond the authors' own grading.
- Notes: **This is a meat signal, not a saturated-fat signal.** The same research group's SFA-specific analysis is [S4-02], and it is null to weakly inverse. These two facts should not be merged.

### Domain 1 — direction and certainty (verified material only)
Controlled-feeding trials (Level I MA, short-term biomarkers): replacing SFA with PUFA improves glycaemic markers; replacing carbohydrate with SFA is roughly neutral for fasting glucose with slightly lower fasting insulin (no HbA1c result for SFA displayed). Prospective cohorts (Level I MAs of observational data): total SFA intake is not associated with higher T2D incidence (SRR 0.95, 0.90-1.00; HR 0.93, 0.84-1.03), with possible inverse associations for myristic / lauric acid intake and for odd-chain biomarkers; red and processed meat are positively associated with T2D but that is a food signal. **Certainty: LOW** (authors rate the cohort evidence "very low to moderate"; the trial evidence is surrogate and short-term; no SFA-specific GRADE rating and no hard-outcome RCT on T2D incidence were found, though RCTs on incidence were not specifically searched).

---

### DOMAIN 2 — Liver fat / NAFLD / MASLD
**NOT SEARCHED (search cap).** No verified findings. Direction and certainty: **not assessed — no verified evidence in this ledger; this is not evidence of absence.** Seeds and planned queries are in Section D.

### DOMAIN 3 — Body weight, adiposity, ectopic fat, metabolic syndrome
**NOT SEARCHED (search cap).** No verified findings. Direction and certainty: **not assessed.** See Section D.

### DOMAIN 4 — Cancer (breast, prostate, colorectal, other); WCRF/AICR; IARC (red / processed meat is about meat, not SFA)
**NOT SEARCHED (search cap).** No verified findings. Direction and certainty: **not assessed.** The only cancer-adjacent fact verified is the T2D-side meat signal in [S4-05], which is not cancer evidence. See Section D.

### DOMAIN 5 — Cognition, dementia, Alzheimer disease (incl. Lancet Commission 2024 on LDL cholesterol)
**NOT SEARCHED (search cap).** No verified findings. Direction and certainty: **not assessed.** See Section D.

### DOMAIN 6 — Systemic inflammation, endotoxaemia, gut microbiota (human evidence only; animal / cell work to be labelled MECHANISTIC)
**NOT SEARCHED (search cap).** No verified findings, no MECHANISTIC material collected. Direction and certainty: **not assessed.** See Section D.

### DOMAIN 7 — Pregnancy, childhood / adolescence, older adults / frailty, depression, kidney disease, atrial fibrillation
**NOT SEARCHED (search cap).** No verified findings (and the brief says to report these only if strong evidence is found; none was looked for). Direction and certainty: **not assessed.**

### DOMAIN 8 — All-cause and cause-specific mortality outside CVD
**NOT SEARCHED (search cap).** No verified findings. Direction and certainty: **not assessed.** Suggestion: the CVD cohort / RCT streams may already hold all-cause-mortality results (for example from the Cochrane SFA-reduction review and large cohorts); merge from their ledgers rather than from this one.

---

## B. Disagreements and discrepancies between sources

- **B1. Imamura 2016, number of participants.** 4,220 adults (search 1, and again in search 8: "102 trials with 239 diet arms and 4,220 adults") versus "a total of 4,660 participants" (search 3). All three are machine-written summaries; no primary page was opened. 4,220 appears more often; neither number should be used in a final report until checked against the PLoS Med abstract.
- **B2. Neuenschwander 2019 (BMJ), publication day.** "published in BMJ on July 13, 2019" (search 2) versus "published in BMJ on July 3, 2019" (search 9). Year (2019) and DOI (10.1136/bmj.l2368) agree. Use the year only.
- **B3. Not a conflict but a comparator and endpoint mismatch.** Feeding trials ([S4-01]) show PUFA-for-SFA substitution improves glycaemic biomarkers, while cohorts ([S4-02], [S4-03]) show no harmful association of total SFA intake with incident T2D. The first measures a short-term biomarker under an isocaloric replacement; the second measures hard incidence with an uncontrolled, implicit replacement nutrient. They answer different questions.
- **B4. Total SFA versus subtypes and biomarkers.** Total SFA is null / weakly inverse ([S4-02], [S4-03]); myristic and lauric acid inverse ([S4-03]); odd-chain biomarkers inverse ([S4-04]); palmitic and stearic acid null ([S4-03]); even-chain biomarker results not displayed. The authors of [S4-02] emphasise fat source (plant vs animal) rather than SFA per se.
- **B5. Strength of the "protective" SFA signal.** [S4-02] SRR upper CI limit is 1.00 with p_nonlinearity 0.028 and the linear analysis is null; [S4-03] HR 0.93 (0.84, 1.03) is null. Do not describe SFA as protective against T2D on this evidence.

## C. Counter-evidence searched (what I looked for, found / not found)

- Looked for a harmful association of total SFA with T2D incidence (cohort meta-analyses, 3 queries): **not found** — null to weakly inverse. Harm was found only for red and processed meat ([S4-05]), which is food-level, not SFA-specific.
- Looked for benefit or null effects: found inverse associations for myristic / lauric acid intake and odd-chain SFA biomarkers; found that replacing SFA with PUFA improves glycaemic markers (a benefit of the replacement, not of SFA).
- **Not searched (cap):** RCTs with T2D incidence as the endpoint; insulin-sensitivity clamp trials (for example KANWU, LIPGENE); Mediterranean-diet trials (PREDIMED); dairy-food meta-analyses; EPIC-InterAct fatty-acid subtype work; the 2025 Chinese cohort and the 2025 Nutrition Reviews paper (titles seen only); glycaemic control in people who already have T2D; any contrary views on the feeding-trial meta-analysis.
- Domains 2-8: no searches, so no counter-evidence search either.

## D. Leads (V0 — background knowledge or existence-only; NOT verified; do NOT use as findings)

### D1. Existence seen in a search hit list (title/URL only; content NOT read or displayed)
- "Dietary intake of saturated fatty acids and the risk of incident diabetes: associations by isocaloric substitutions in a nationwide Chinese cohort" — Eur J Nutr (2025?) — https://link.springer.com/article/10.1007/s00394-025-03703-z (search 4)
- "Effect of Fatty Acids on Glucose Metabolism and Type 2 Diabetes" — Nutrition Reviews 83(5):897 (from URL) — https://academic.oup.com/nutritionreviews/article/83/5/897/7895736 (searches 4, 11)
- "Biomarkers of fatty acids and risk of type 2 diabetes: a systematic review and meta-analysis of prospective cohort studies" — PubMed 32598176 (search 7)
- "Circulating Saturated Fatty Acids and Incident Type 2 Diabetes: A Systematic Review and Meta-Analysis" — PMC6566227 (search 10)
- "Dietary fat and incidence of type 2 diabetes in older Iowa women" — PubMed 11522694; "Dietary Fat and Meat Intake in Relation to Risk of Type 2 Diabetes in Men" — Diabetes Care 25(3):417 (search 11)
- "Perspective on the health effects of unsaturated fatty acids and commonly consumed plant oils high in unsaturated fat" — Br J Nutr (Cambridge Core) (search 4) — relevant to the seed-oil / replacement questions, probably for another stream
- "Umbrella Review of Systematic Reviews and Meta-Analyses on Consumption of Different Food Groups and Risk of Type 2 Diabetes Mellitus and Metabolic Syndrome" — PMC12121416 (search 9); "Diet in the management of type 2 diabetes: umbrella review of systematic reviews with meta-analyses of randomised controlled trials" (search 9)
- Frontiers hits with no usable title: frontiersin.org/journals/public-health/articles/10.3389/fpubh.2024.1396576/full (search 1); frontiersin.org/journals/endocrinology/articles/10.3389/fendo.2026.1784917/full (search 7)
- SECONDARY press pages on Imamura 2016: Tufts Now (2016-07-19), EurekAlert 483552, ScienceDaily, HCPLive

### D2. Background-memory seeds for the unsearched domains (V0; citation details unchecked; no numbers recorded on purpose)
- **T2D:** Forouhi 2014 (EPIC-InterAct, plasma phospholipid SFA subtypes, Lancet Diabetes Endocrinol); Imamura 2018 (FORCE pooled analysis, dairy-fat biomarkers, PLoS Med); Yakoob 2016 (Circulation); de Souza 2015 (BMJ: SFA, trans fat, mortality, CVD and T2D in observational studies); Riserus / Willett / Hu 2009 review; KANWU (Vessby 2001), LIPGENE (Tierney 2011), Summers 2002; PREDIMED diabetes-incidence analyses; dairy-and-T2D meta-analyses (Aune 2013, Gijsbers 2016). Note: circulating 16:0 is influenced by endogenous lipogenesis, so biomarker associations are not intake associations.
- **Liver fat:** Luukkonen 2018 (Diabetes Care, 3-week overfeeding, SFA vs unsaturated fat vs simple sugars); Rosqvist 2014 (Diabetes, palm-oil vs sunflower-oil overfeeding, ectopic fat); Rosqvist 2019 (JCEM, SFA vs PUFA overfeeding, liver fat and ceramides); Bjermo 2012 (AJCN, n-6 PUFA vs SFA, liver fat, lipoproteins, inflammation); Parry and Hodson 2017 and Hodson / Rosqvist / Parry 2020 reviews; Mediterranean / MUFA liver-fat trials (Ryan 2013, Bozzetto 2012, Properzi 2018, Errazuriz 2017). Expected, unverified: these are small, short, MRI/MRS-surrogate studies; no hard-outcome trials.
- **Body weight / adiposity:** Hooper BMJ 2012 and Cochrane (2015, 2020) on total fat and body weight / fatness; Tobias 2015 (Lancet Diabetes Endocrinol) low-fat vs other diets; WHO 2023 guidelines (total fat; SFA and trans fat); Estruch 2019 (PREDIMED weight and waist); Piers 2003; Rosqvist 2014.
- **Cancer:** WCRF/AICR Continuous Update Project reports (colorectal, breast, prostate) and the 2018 Global Report — dietary-fat conclusions unknown to me; IARC Monograph 114 (Bouvard 2015, Lancet Oncol): red meat Group 2A, processed meat Group 1 — **about meat, not SFA**; WHI Dietary Modification Trial (Prentice 2006 JAMA; Chlebowski 2020 JCO) — total-fat reduction with other dietary changes, not an SFA-specific trial; Smith-Warner 2001 (JAMA) pooled analysis of fat and breast cancer; prostate cohorts (Crowe 2008 EPIC; Pelser 2013 NIH-AARP; Richman 2013 JAMA Intern Med); cancer secondary outcomes of Hooper 2020 Cochrane.
- **Cognition / dementia:** Lancet Commission 2024 (Livingston et al.; high LDL cholesterol added as a modifiable risk factor — an LDL claim, not a dietary SFA claim); Morris 2003 (Arch Neurol, CHAP); Rotterdam dietary-fat and dementia analysis (Kalmijn); Laitinen 2006 (CAIDE); Okereke 2012 (Ann Neurol, NHS cognitive change); Hanson 2013 (JAMA Neurol, 4-week RCT, SFA / glycaemic-index diet, CSF amyloid, APOE); Valls-Pedret 2015 (PREDIMED cognition); Barnes 2023 (NEJM, MIND diet trial); U.S. POINTER (2025, JAMA?).
- **Inflammation / endotoxaemia / microbiota:** Bjermo 2012; Santos 2013 (Nutr Res, SFA and inflammation review); Fritsche 2015 (Adv Nutr); Labonté 2013 (AJCN, dairy and inflammation RCTs); Bordoni 2017 (dairy and inflammation review); Erridge 2007 (AJCN, high-fat meal and low-grade endotoxaemia); Pendyala 2012 (Gastroenterology); Wolters 2019 (Clin Nutr, MyNewGut, dietary fat and microbiota); Wan 2019 (Gut, 6-month controlled-feeding high-fat vs low-fat, microbiota); David 2014 (Nature, short-term diet and microbiome); Lancaster 2018 (Cell Metab, TLR4 and SFA — **MECHANISTIC, cell / mouse**).
- **Other populations:** STRIP trial (infancy-onset low-SFA counselling, Finland); PREDIMED depression analysis; no strong leads for frailty, pregnancy, kidney disease or atrial fibrillation from memory.
- **Mortality outside CVD:** Wang 2016 (JAMA Intern Med, NHS / HPFS, fats and total / cause-specific mortality); Zhuang 2019 (Circ Res, NIH-AARP); Dehghan 2017 (Lancet, PURE); de Souza 2015 (BMJ); Mazidi 2020 (Clin Nutr); Hooper 2020 Cochrane (all-cause and cancer outcomes).

### D3. Planned queries NOT run (use `extended` unless noted; exact-title + first author + year + outcome terms)
1. Liver: Luukkonen 2018 "Saturated Fat Is More Metabolically Harmful for the Human Liver Than Unsaturated Fat or Simple Sugars" liver fat percent change; Rosqvist 2014 "Fatty acid composition of dietary fat determines ectopic fat deposition"; Bjermo 2012 "n-6 PUFAs compared with SFAs on liver fat" ; Rosqvist 2019 "Overeating saturated fat promotes fatty liver and ceramides"; MASLD dietary fat RCT meta-analysis 2023-2026; Mediterranean vs low-fat liver fat trials.
2. Adiposity: Hooper Cochrane 2020 "Effects of total fat intake on body fatness in adults"; WHO 2023 SFA / total-fat guideline evidence summary; PREDIMED weight / waist; SFA vs PUFA overfeeding body composition.
3. Cancer: WCRF/AICR CUP dietary fat conclusions (breast, colorectal, prostate); IARC Monograph 114 (standard mode is enough); WHI Dietary Modification Trial breast cancer incidence and mortality; SFA and prostate cancer cohorts / meta-analysis; SFA and colorectal cancer meta-analysis; cancer outcomes in Hooper 2020.
4. Cognition: Lancet Commission 2024 LDL cholesterol dementia; SFA and dementia / AD cohort meta-analysis; Morris 2003; Okereke 2012; Hanson 2013; MIND trial 2023; U.S. POINTER 2025 (standard mode for these single-paper lookups).
5. Inflammation / microbiota: SFA vs PUFA RCTs on CRP / IL-6 (systematic review); dairy and inflammation RCT reviews; postprandial endotoxaemia in humans; Wolters 2019; Wan 2019; Lancaster 2018 (label MECHANISTIC).
6. Other populations (standard mode): STRIP; SFA and depression; SFA and frailty; SFA and gestational diabetes; dietary fat and atrial fibrillation; SFA and chronic kidney disease.
7. Mortality: Wang 2016; Zhuang 2019; PURE 2017; Mazidi 2020; de Souza 2015; Hooper 2020 secondary outcomes.
8. T2D completion: Forouhi 2014; Imamura 2018 dairy biomarkers; de Souza 2015 T2D RR; KANWU; LIPGENE; PREDIMED T2D incidence; dairy-fat and T2D meta-analyses; 2025 DGAC Scientific Report on fats and T2D; open the 2025 Chinese cohort and Nutrition Reviews 2025 hits.
Estimated budget to finish the stream: about 35-45 searches.

## E. Search log (query | mode | useful Y/N)

1. Imamura 2016 PLoS Med "Effects of saturated fat, polyunsaturated fat, monounsaturated fat, and carbohydrate on glucose-insulin homeostasis" randomised controlled feeding trials | extended | Y
2. Neuenschwander 2019 BMJ "Role of diet in type 2 diabetes incidence: umbrella review..." | extended | Y (bibliographic details; no SFA content)
3. Imamura 2016 102 trials 4,220 adults replacing 5% energy carbohydrate with saturated fat HbA1c fasting insulin HOMA-IR 95% CI | extended | Y (effect sizes; participants-number discrepancy)
4. Neuenschwander 2020 PLoS Med "Intake of dietary fats and fatty acids and the incidence of type 2 diabetes" saturated fatty acids relative risk per 5% energy | extended | Y
5. Imamura Mozaffarian feeding trials abstract "Conclusions" replacing carbohydrate or saturated fat with PUFA | standard | partial (press-like text)
6. "Saturated Fatty Acid Intake and Risk of Type 2 Diabetes: An Updated Systematic Review and Dose-Response Meta-Analysis of Cohort Studies" relative risk | extended | Y
7. "Fatty Acid Biomarkers and Incidence of Type 2 diabetes" SR dose-response MA pentadecanoic heptadecanoic palmitic results | extended | Y (partial)
8. Imamura 2016 "239 diet arms" feeding trials participants | standard | Y (confirms size and search date)
9. Neuenschwander BMJ 2019 umbrella review T2D processed meat red meat whole grains certainty relative risk | extended | Y
10. Neuenschwander 2020 dietary fats T2D "saturated" "no or weak associations" certainty NutriGrade | standard | Y
11. "Intake of dietary fats and fatty acids and the incidence of type 2 diabetes" abstract findings plant fat SRR saturated | extended | Y
12. Circulating saturated fatty acids and incident T2D systematic review meta-analysis odd-chain / even-chain | extended | REFUSED — "this session has used its web search budget (200 of 200 WebSearch calls)"; no results

Counts: successful searches 11 (standard 3: #5, #8, #10; extended 8: #1, #2, #3, #4, #6, #7, #9, #11). No WebFetch, Bash/curl or proxy-configuration access was used for research.
