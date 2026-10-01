# S3 — Cohort studies, observational meta-analyses, biomarker studies and Mendelian randomization (all-cause mortality focus) — Evidence Ledger
Run date: 2026-10-01 | Searches run: 30 (standard 3 / extended 27)

> **STATUS: PARTIAL. The session-wide web-search budget ran out.** The WebSearch tool refused my 31st-33rd calls with: "this session has used its web search budget (200 of 200 WebSearch calls) ... ask the user to raise CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION." The refused calls were: umbrella reviews of SFA; the 2023 *Systematic Reviews* overview of reviews; 2025 meta-analyses. The 200-call budget is shared across streams, so my 30 searches are below the 40-80 planned. I did not work around the limit (no WebFetch, no Bash web access).
>
> **Coverage map against the assignment**
> | Task item | Status |
> |---|---|
> | 1. Cohort meta-analyses | Siri-Tarino, Chowdhury, de Souza, Zhu searched. Not retrieved: de Souza SFA estimates for CHD, CVD, stroke and T2D; Zhu effect sizes; Chowdhury circulating-SFA (biomarker) estimates. |
> | 2. Substitution analyses | Jakobsen, Li 2015, Zong 2016, Wang 2016, Guasch-Ferré 2015 searched. **Not searched:** Praagman, Japanese cohorts, Chinese cohorts. Seed "Li 2020 (BMJ) dietary fat and mortality" **not located** (see B8). |
> | 3. PURE | Searched. Headline numbers V1. Critiques only as titles plus fragments. |
> | 4. Newer evidence 2022-2026 | Only three papers read at summary level (Zhang 2025 butter vs plant oils; NIH-AARP 2024 plant vs animal fat; Li AJCN 2024/25, narrative only). UK Biobank, umbrella reviews, 2025-26 meta-analyses: hit-list titles only (D2). **GBD: not searched. Mendelian randomization: not searched.** |
> | 5. Biomarker studies (FORCE, Imamura 2018, EPIC-InterAct) | **ZERO searches. Nothing verified.** |
> | 6. Methodological critique | Fragments only (S3-02, S3-03 corrections, S3-12). **Nothing retrieved on FFQ error, healthy-user bias, reverse causality, or secular dietary change.** |
>
> **Conventions used below**
> - V2 needs two independent search results. A result from a query that itself contained the number being checked is **not** counted. The summarizer repeats numbers it is given; for Jakobsen it wrote that 0.87 "aligns with the specific hazard ratio value you mentioned".
> - Every entry gives the comparator. "Extreme quantiles" means highest vs lowest category of intake with no named replacement nutrient.
> - Levels follow `deep-research/references/source_quality_hierarchy.md` (I = SR/MA, IV = cohort, VII = comment/guideline).
> - URLs are from result link lists. Summaries are machine-written and unreliable in places (see B).
> - No instruction-like text was found inside retrieved web content. Each tool result carried the tool wrapper's standard "include sources as markdown hyperlinks" reminder, which matches the tool's own description. That reminder and the budget notice came from the tool, not from a web page.

---

## A. Findings ledger

### [S3-01] Siri-Tarino 2010 — pooled prospective cohorts, SFA and CHD / stroke / CVD
- Citation: Siri-Tarino PW, Sun Q, Hu FB, Krauss RM (2010). Meta-analysis of prospective cohort studies evaluating the association of saturated fat with cardiovascular disease. Am J Clin Nutr 91(3):535-546. DOI 10.3945/ajcn.2009.27725 (all displayed in results). A PMC copy is listed: PMC2824152.
- Type / level: SR/MA of prospective cohorts — Level I design built on Level IV studies. Date: 2010 (trade press dated 2010-02-12).
- Design / population: 21 studies, "almost 350,000 subjects". One result gave "347,747 subjects for 5-23 years", 11,006 developed CHD or stroke. A different result gave 214,182 subjects and 8,644 CHD cases (see B2).
- Comparator / contrast: extreme quantiles of SFA intake. No replacement nutrient named. Covariate adjustment varied by cohort (see S3-02).
- Key results (as displayed): pooled RR CHD 1.07 (95% CI 0.96, 1.19; P = 0.22); stroke 0.81 (0.62, 1.05; P = 0.11); CVD 1.00 (0.89, 1.11; P = 0.95). Authors' conclusion as displayed: no significant evidence that SFA is associated with CHD or CVD.
- Snippets + URL:
  - "1.07 (95% CI: 0.96, 1.19; P = 0.22) for CHD, 0.81 (95% CI: 0.62, 1.05; P = 0.11) for stroke" — https://www.semanticscholar.org/paper/Meta-analysis-of-prospective-cohort-studies-the-of-Siri-Tarino-Sun/9746bf668307afb09476a3320dc2dfc18fbbb87b (in the result list for query 4; the summary did not say which link the text came from)
  - "there is no significant evidence for concluding that dietary saturated fat is associated with an increased risk of CHD or CVD" — same result set
  - "insufficient evidence from prospective epidemiologic studies to conclude that dietary saturated fat is associated with an increased risk of CHD, stroke, or CVD" — https://www.dairyreporter.com/Article/2010/02/12/Saturated-fats-not-linked-to-heart-disease-Meta-analysis/ (SECONDARY, dairy trade press)
- Verification: conclusion of no significant association = **V2** (queries 1 and 4). RR and CI figures = **V1** (query 4 only; query 8 had them in the prompt, so it doesn't count). N = unresolved discrepancy.
- Certainty / limitations / funding / COI: GRADE not reported. Funding and COI not displayed in any result (unverified recollection in D1).
- Notes: Subject of the overadjustment critique (S3-02). Chowdhury 2014 (S3-03) and de Souza 2015 (S3-04) are later pooled analyses of overlapping questions.

### [S3-02] Overadjustment critique of Siri-Tarino and the authors' sensitivity analysis
- Citation: Letter titled "Meta-analysis of effect of saturated fat intake on cardiovascular disease: overadjustment obscures true associations." Am J Clin Nutr, August 2010, 92(2):458-459 (as displayed). First author **not shown** in the output (the ResearchGate copy sits under a Mike Rayner profile; "Scarborough" came from my query). A second AJCN item, "Saturated fat and heart disease" (PubMed 20534745 is also listed), is probably the authors' reply. Unconfirmed.
- Type / level: letter plus reply — Level VII. Date: 2010.
- Argument: including serum cholesterol in regression models (a mediator) may attenuate the SFA-CVD association. Reply as displayed: a subset of studies not adjusting for blood cholesterol (9 CHD studies and 6 stroke studies, n = 291,126) "did not differ significantly" from the full analysis of all 21 studies.
- Comparator: n/a.
- Snippets + URL:
  - "whether including serum cholesterol concentrations in multiple regression models may attenuate the relationship between saturated fat and cardiovascular disease" — https://ajcn.nutrition.org/article/S0002-9165(23)01920-2/fulltext
  - "did not include blood cholesterol concentration (9 coronary heart disease studies and 6 stroke studies with n = 291,126)" — same result set (query 9)
- Verification: **V1** (query 9). The summarizer's wording about who wrote which piece is internally inconsistent.
- Limitations: the sensitivity analysis is the original authors' own, not independent. This is the only mediator-adjustment critique I found.

### [S3-03] Chowdhury 2014 — dietary, circulating and supplemental fatty acids and coronary risk
- Citation: Chowdhury R, Warnakula S, et al. (2014). Association of dietary, circulating, and supplement fatty acids with coronary risk: a systematic review and meta-analysis. Ann Intern Med 160(6):398-406. https://doi.org/10.7326/m13-1788 (author list beyond the first two not displayed).
- Type / level: SR/MA of prospective observational studies (dietary and circulating fatty acids) plus RCTs of fatty-acid supplements — Level I. Date: online 17 March 2014 per Science news. **A corrected version was posted shortly afterwards.**
- Design / population: 32 observational studies, 530,525 participants (dietary intake), as displayed. The circulating-fatty-acid section exists, but I **did not retrieve** its SFA estimates.
- Comparator / contrast: not displayed.
- Key results (as displayed): observational RR for coronary disease, SFA **1.03 (95% CI 0.98 to 1.07)**; MUFA 1.00; long-chain omega-3 0.87. RCT supplement RRs (not SFA): alpha-linolenic 0.97 (0.69 to 1.36); long-chain omega-3 0.94 (0.86 to 1.03); omega-6 0.89 (0.71 to 1.12).
- Snippets + URL:
  - "In observational studies, relative risks for coronary disease were 1.03 (95% CI, 0.98 to 1.07) for saturated fatty acids" — https://www.acpjournals.org/doi/10.7326/m13-1788 (in result list, query 5)
  - "relative risks for coronary disease were 0.97 (CI, 0.69 to 1.36) for α-linolenic, 0.94 (CI, 0.86 to 1.03) for long-chain ω-3 polyunsaturated" — query 2 result set
  - "a new version of the publication had to be posted shortly after it appeared on the website to correct several errors" — https://www.science.org/content/article/scientists-fix-errors-controversial-paper-about-saturated-fats (SECONDARY, news)
  - "two of the six studies included in the analysis of N-6 polyunsaturated fat were wrong" — https://hsph.harvard.edu/nutritionsource/2014/03/19/dietary-fat-and-heart-disease-study-is-seriously-misleading (Harvard critique by Willett; the summary did not tie the sentence to a single link)
- Verification: SFA 1.03 (0.98-1.07) = **V1** (query 5 only, and I had put "1.03" and the N in that prompt, so treat as weakly supported; the CI was new information). RCT RRs = **V1** (query 2). Existence of errors and a corrected version = **V1** (query 7).
- Certainty / limitations / funding / COI: GRADE not displayed. Funding and COI not displayed. The critique comes from a named opponent (Willett) and is commentary (SECONDARY / Level VII).
- Notes (version issue): I cannot tie any displayed number to the pre- or post-correction version. The omega-3 observational association is described as "now significant" after correction, which fits the displayed 0.87. Annals correspondence appears in hit lists under the paper's own title (DOIs 10.7326/l14-5018, -6, -9, -11; contents unread). A summarizer sentence that Chowdhury found "insufficient evidence ... SFA ... CHD, stroke or overall CVD" repeats Siri-Tarino's wording and is **not** used.

### [S3-04] de Souza 2015 — SFA and trans fat vs mortality, CVD and T2D (observational MA)
- Citation: de Souza RJ, et al. (2015). Intake of saturated and trans unsaturated fatty acids and risk of all cause mortality, cardiovascular disease, and type 2 diabetes: systematic review and meta-analysis of observational studies. BMJ 351:h3978. DOI 10.1136/bmj.h3978; PMID 26268692 (all displayed). Only the first author is displayed.
- Type / level: SR/MA of observational studies — Level I design on Level IV studies. Date: 2015.
- Design / population: "50 observational studies" assessing SFA and/or trans fat in adults (query 27). My seed said 73; **not confirmed**.
- Comparator / contrast: the displayed text gives no contrast. Usually highest vs lowest intake category; **not displayed**.
- Key results (as displayed):
  - SFA: all-cause mortality RR 0.99 (0.91 to 1.09). Authors: not associated with all-cause mortality, CVD, CHD, ischemic stroke or T2D, "but the evidence is heterogeneous with methodological limitations". GRADE certainty for SFA associations: "very low".
  - Total trans fat: all-cause mortality 1.34 (1.16 to 1.56); CHD mortality 1.28 (1.09 to 1.50); total CHD 1.21 (1.10 to 1.33).
  - Industrial vs ruminant trans fat (cross-stream relevance, natural vs artificial): CHD mortality 1.18 (1.04 to 1.33) vs 1.01 (0.71 to 1.43); CHD 1.42 (1.05 to 1.92) vs 0.93 (0.73 to 1.18).
- Snippets + URL:
  - "all cause mortality showing a relative risk of 0.99 (0.91 to 1.09)" — query 3 result set (ACC and PubMed in list): https://pubmed.ncbi.nlm.nih.gov/26268692/
  - "Saturated fats are not associated with all cause mortality, CVD, CHD, ischemic stroke, or type 2 diabetes, but the evidence is heterogeneous with methodological limitations" — https://pubmed.ncbi.nlm.nih.gov/26268692/
  - "The certainty of associations between saturated fat and all outcomes was assessed as 'very low.'" — query 10 result set, https://pubmed.ncbi.nlm.nih.gov/26268692/
  - "all cause mortality (1.34, 1.16 to 1.56), CHD mortality (1.28, 1.09 to 1.50), and total CHD (1.21, 1.10 to 1.33)" — query 27 result set, same PubMed link
  - "Industrial, but not ruminant, trans fats were associated with CHD mortality (1.18 (1.04 to 1.33) v 1.01 (0.71 to 1.43))" — same
  - "a 34 per cent increase in death for any reason, a 28 per cent increased risk of CHD mortality" — https://www.sciencedaily.com/releases/2015/08/150811215545.htm (SECONDARY; its "industrial" label looks like the summarizer's, because the abstract text calls these total trans fat)
- Verification: SFA all-cause RR 0.99 (0.91-1.09) = **V1** (query 3). SFA conclusion text = **V2** (queries 3, 10). GRADE "very low" = **V1** (query 10). Total trans-fat RRs = **V2** (percentages in query 3; exact RR and CI in query 27). Industrial vs ruminant split = **V1** (query 27).
- Certainty / limitations / funding / COI: GRADE very low for SFA. Funding and COI not displayed.
- Notes: I did **not** retrieve de Souza's SFA estimates for CHD, CHD mortality, CVD, stroke or T2D. A query-6 summary reported "saturated fat intake and CHD deaths ... 1.08 (95% CI 0.94 to 1.25)" with no source. I did not attribute it to de Souza (see B4).

### [S3-05] Zhu 2019 — dose-response meta-analysis of cohorts, fat subtypes and CVD
- Citation: Zhu Y, Bo Y, Liu Y (2019). Dietary total fat, fatty acids intake, and risk of cardiovascular disease: a dose-response meta-analysis of cohort studies. Lipids Health Dis 18, article 91. DOI 10.1186/s12944-019-1035-2; PubMed link ends 30954077 (displayed).
- Type / level: SR/MA of cohorts with dose-response — Level I design on Level IV studies. Date: 6 April 2019.
- Design / population: number of studies and N **not displayed**.
- Comparator / contrast: dose-response per unit of energy intake; the SFA unit was not displayed.
- Key results (as displayed): total fat, SFA, MUFA and PUFA not associated with CVD risk. Trans fat: CVD risk up 16% per 2% energy/day increment. PUFA cardio-protective in studies with more than 10 years of follow-up. **No SFA effect size shown.**
- Snippets + URL:
  - "total fat, SFA, MUFA, and PUFA intake were not associated with the risk of cardiovascular disease" — https://lipidworld.biomedcentral.com/articles/10.1186/s12944-019-1035-2
  - "the risk of CVDs increased 16% for an increment of 2% energy/day of TFA intake" — same
- Verification: **V1** (query 11).
- Certainty / limitations / funding / COI: not displayed.

### [S3-06] Jakobsen 2009 — pooled analysis of 11 cohorts, substitution of SFA
- Citation: Jakobsen MU, O'Reilly EJ, Heitmann BL, Pereira MA, Bälter K, Fraser GE, et al. (2009). Major types of dietary fat and risk of coronary heart disease: a pooled analysis of 11 cohort studies. Am J Clin Nutr 89(5):1425-1432. DOI 10.3945/ajcn.2008.27124 (displayed).
- Type / level: pooled analysis of individual cohorts — Level IV (pooled, Level I-style synthesis). Date: 2009.
- Design / population: 11 cohorts, 344,696 persons, 5,249 coronary events, 2,155 coronary deaths (as displayed in a secondary text; the passage's own source was not identified).
- Comparator / contrast: **substitution model**: 5% of energy from SFA replaced by PUFA; also replacement by carbohydrate and MUFA.
- Key results (as displayed): SFA to PUFA: coronary events HR 0.87 (0.77 to 0.97); coronary deaths "by 16 percent" (HR not displayed). Replacing SFA with carbohydrate: more nonfatal MI but not fatal CHD, per the summarizer's wording. **MUFA and carbohydrate HRs not retrieved.**
- Snippets + URL:
  - "reduced risk of coronary events by 13 percent (hazard ratio [HR] = 0.87; 95% CI = 0.77 to 0.97) and coronary deaths by 16 percent" — query 26 result set (candidate sources in list: https://pubmed.ncbi.nlm.nih.gov/28125802 ; https://odphp.health.gov/sites/default/files/2019-09/Appendix-E-2.43.pdf)
  - "344,696 persons with 5,249 coronary events and 2,155 coronary deaths" — same
  - primary record: https://experts.umn.edu/en/publications/major-types-of-dietary-fat-and-risk-of-coronary-heart-disease-a-p/
- Verification: **V1** (query 26). Query 12 produced 0.87 only after I put it in the prompt, so it doesn't count.
- Certainty / limitations / funding / COI: not displayed.

### [S3-07] Li 2015 (JACC) — SFA vs unsaturated fats and carbohydrate sources, CHD
- Citation: Li Y, Hruby A, Bernstein AM, Hu FB, et al. (2015). Saturated fats compared with unsaturated fats and sources of carbohydrates in relation to risk of coronary heart disease: a prospective cohort study. J Am Coll Cardiol. DOI 10.1016/j.jacc.2015.07.055; PMID 26429077 (both in URLs). The year 2015 is from the seed and the DOI string; volume and pages not displayed.
- Type / level: prospective cohort — Level IV. Cohort names and N **not displayed** (D1 recollection: Nurses' Health Study / Health Professionals Follow-up Study).
- Comparator / contrast: **substitution model**: 5% of energy from SFA replaced by PUFA, MUFA or whole-grain carbohydrate.
- Key results (as displayed): replacing SFA with PUFA, HR 0.75 (95% CI 0.67 to 0.84), "25% lower risk of CHD". Replacing with MUFA: 15% lower. Replacing with whole-grain carbohydrate: 9% lower (CIs not displayed). **Refined-carbohydrate and animal-protein results not retrieved.**
- Snippets + URL:
  - "associated with a 25% lower risk of CHD (HR: 0.75, 95% CI: 0.67 to 0.84)" — https://www.jacc.org/doi/10.1016/j.jacc.2015.07.055
  - "monounsaturated fatty acids or carbohydrates from whole grains was associated with a 15% and 9% lower risk of CHD, respectively" — same result set
  - Press release in the list: https://www.eurekalert.org/news-releases/860990 ("Butter is not back: Limiting saturated fat still best for heart health"; SECONDARY)
- Verification: **V1** (query 13).
- Certainty / limitations / funding / COI: not displayed.

### [S3-08] Zong 2016 (BMJ) — individual saturated fatty acids and CHD
- Citation: Zong G, et al. (2016). Intake of individual saturated fatty acids and risk of coronary heart disease in US men and women: two prospective longitudinal cohort studies. BMJ. The title and year come from the seed; authors, volume and pages are **not displayed**. The paper is identified by the displayed description and a Harvard page dated 2016-12-19.
- Type / level: two prospective cohorts — Level IV. Date: 2016.
- Design / population: "more than 73,000 women from the Nurses' Health Study and 42,000 men from the Health Professionals Follow-Up Study"; lauric (12:0), myristic (14:0), palmitic (16:0) and stearic (18:0) acids.
- Comparator / contrast: SFA increments; **isocaloric replacement of 1% of energy** from the four SFAs by PUFA, MUFA, whole-grain carbohydrate (and plant protein).
- Key results (as displayed): CHD incidence higher by 7% (12:0), 13% (14:0), 18% (16:0), 18% (18:0) and 18% (all four combined). Replacing 1% of energy from 12:0-18:0: CHD 8% lower with PUFA, 5% with MUFA, 6% with whole-grain carbohydrate. **The exposure contrast and the HRs and CIs were not displayed** (the quantile vs per-increment question is unresolved).
- Snippets + URL:
  - "The increased incidence of CHD was 7% for 12:0, 13% for 14:0, 18% for 16:0, 18% for 18:0, and 18% for all four SFAs combined" — https://nutritionsource.hsph.harvard.edu/2016/12/19/saturated-fat-regardless-of-type-found-linked-with-increased-heart-disease-risk/
  - "The reduction in CHD after isocaloric replacement of 1% energy from 12:0-18:0 was 8% for PUFA, 5% for MUFA, and 6% for whole grain carbohydrates" — same result set (query 14)
- Verification: **V1** (query 14).
- Certainty / limitations / funding / COI: not displayed. The NHS / HPFS cohorts also appear in S3-09, S3-13 and S3-15 (as displayed), so these are not independent replications of one another (see B9).

### [S3-09] Wang 2016 (JAMA Intern Med) — specific dietary fats and mortality
- Citation: Wang DD, Li Y, Chiuve SE, et al. (2016). Association of specific dietary fats with total and cause-specific mortality. JAMA Intern Med 176(8):1134-1145. PMID 27379574 (in URL); DOI not displayed. Correspondence and a reply are listed (PubMed 27918809 and 27918810; contents unread).
- Type / level: two prospective cohorts — Level IV. Date: 2016.
- Design / population: Nurses' Health Study and Health Professionals Follow-up Study, 126,233 participants, follow-up up to 32 years; 20,314 deaths in the NHS (32 y) and 12,990 in the HPFS (26 y); 33,304 deaths total over 3,439,954 person-years.
- Comparator / contrast: two analyses: (a) extreme quintiles of each fat; (b) **substitution of 5% of energy from SFA** by PUFA or MUFA.
- Key results (as displayed): total mortality, extreme quintiles: SFA HR 1.08 (1.03-1.14); PUFA 0.81 (0.78-0.84); MUFA 0.89 (0.84-0.94). Replacing 5% of energy from SFA with PUFA: HR 0.73 (0.70-0.77), "27%" reduction; with MUFA: HR 0.87 (0.82-0.93), "13%". Authors (summary): higher SFA and trans fat associated with higher mortality; PUFA and MUFA with lower.
- Snippets + URL:
  - "27% (HR =0.73, 95% CI, 0.70-0.77) and 13% (HR =0.87, 95% CI, 0.82-0.93) estimated reductions in total mortality, respectively" — https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2530902
  - "During 32 years of follow-up in the NHS, 20,314 deaths were documented; during 26 years of follow-up in the HPFS, 12,990 deaths were documented" — same result set (query 19)
  - "Higher intakes of saturated fat and trans-fat were associated with increased mortality" — same
  - full text copy: https://dash.harvard.edu/server/api/core/bitstreams/1f78727c-4df1-456a-a788-70d4335d9798/content
- Verification: substitution HRs, MUFA quintile HR, death counts = **V1** (query 19, where the prompt did not contain them). SFA 1.08 (1.03-1.14) and PUFA 0.81 (0.78-0.84) were echoed after I put them in the prompt (queries 15, 19), so I count them **V1 / unconfirmed**. Query 16 returned no numbers.
- Certainty / limitations / funding / COI: not displayed.

### [S3-10] Guasch-Ferré 2015 (AJCN) — fat intake in PREDIMED participants
- Citation: Guasch-Ferré M, et al. (2015). Dietary fat intake and risk of cardiovascular disease and all-cause mortality in a population at high risk of cardiovascular disease. Am J Clin Nutr 102:1563-1573 (as displayed). PMID 26561617 (in URL).
- Type / level: prospective analysis within a dietary-intervention trial cohort — Level IV. Date: 2015.
- Design / population: 7,038 PREDIMED participants at high CV risk. The "follow-up from 2003 to 2010 and expanded analysis through 2012" wording is from the summarizer.
- Comparator / contrast: extreme quintiles of intake; substitution of SFA by MUFA or PUFA also examined.
- Key results (as displayed): SFA, Q5 vs Q1, CVD HR 1.81 (95% CI 1.05, 3.13). Q5 vs Q1 for total fat, MUFA and PUFA, CVD HRs 0.58, 0.50 and 0.68 (CIs not displayed). Authors: MUFA and PUFA associated with lower CVD and death; SFA and trans fat with higher CVD; replacing SFA with MUFA/PUFA inversely associated with CVD. **All-cause mortality HRs not displayed.**
- Snippets + URL:
  - "higher saturated fatty acid (SFA) intake was associated with an 81% higher risk of cardiovascular disease (HR: 1.81; 95% CI: 1.05, 3.13)" — https://pubmed.ncbi.nlm.nih.gov/26561617/
  - "replacement of SFAs with MUFAs and PUFAs was inversely associated with CVD" — same result set
- Verification: **V1** (query 24).
- Certainty / limitations / funding / COI: not displayed. The lower CI bound is close to 1 (1.05). A trial cohort analysed observationally; see D1 for an unverified note on PREDIMED's 2018 retraction and republication.

### [S3-11] PURE — Dehghan 2017 (Lancet), 18 countries
- Citation: Dehghan M, et al. (2017). Associations of fats and carbohydrate intake with cardiovascular disease and mortality in 18 countries from five continents (PURE): a prospective cohort study. Lancet. Volume, pages and DOI not displayed.
- Type / level: prospective cohort — Level IV. Date: 2017.
- Design / population: 18 countries (3 high-, 11 middle- and 4 low-income) on five continents; 5,796 deaths and 4,784 major CVD events. Diet from a baseline food frequency questionnaire.
- Comparator / contrast: Q5 vs Q1 of SFA intake. Replacement nutrient **not displayed**. The summary says carbohydrate intake was the harmful exposure in the authors' interpretation.
- Key results (as displayed): SFA Q5 vs Q1, total mortality HR 0·86 (95% CI 0·76-0·99); stroke HR 0·79 (0·64-0·98), ptrend = 0·0498. SFA not associated with major CVD, MI or CVD mortality. Authors (summary): high carbohydrate intake associated with higher total mortality; total fat and types of fat with lower total mortality.
- Snippets + URL:
  - "Higher saturated fat intake was associated with lower risk of stroke (quintile 5 vs quintile 1, HR 0·79 [95% CI 0·64-0·98], ptrend=0·0498)" — https://www.researchgate.net/publication/319363211_Associations_of_fats_and_carbohydrate_intake_with_cardiovascular_disease_and_mortality_in_18_countries_from_five_continents_PURE_A_prospective_cohort_study
  - "Saturated fat intake was associated with lower risk of total mortality (quintile 5 vs quintile 1, HR 0·86 [95% CI 0·76-0·99])" — same result set (query 25)
  - "During follow-up, the study documented 5796 deaths and 4784 major cardiovascular disease events." — same
  - "saturated fatty acid intake was not associated with major cardiovascular disease, myocardial infarction, or cardiovascular disease mortality" — query 22 result set
- Verification: direction and no-association findings = **V2** (queries 22 and 25). Exact HRs: stroke 0.79 = V1 (query 22); total mortality 0.86 = V1 (query 25); query 30 repeated both after I put them in the prompt, so it does not count.
- Certainty / limitations / funding / COI: funding and COI not displayed. See S3-12 for critiques.

### [S3-12] PURE — critiques, limitations, responses
- Items found (contents mostly unread):
  - Lancet Comment, Ramsden CE and Domenichiello AF, 29 Aug 2017, "PURE study challenges the definition of a healthy diet: but key questions remain": https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(17)32241-9/fulltext. Level VII. It argues that restriction advice "is largely based on selective emphasis on some observational and clinical data". It takes a position favourable to PURE.
  - Harvard Nutrition Source, "PURE study makes headlines, but the conclusions are misleading" (2017-09-08): https://nutritionsource.hsph.harvard.edu/2017/09/08/pure-study-makes-headlines-but-the-conclusions-are-misleading/ (title only).
  - Lancet correspondence, "Associations of fats and carbohydrates with cardiovascular disease and mortality—PURE and simple?": https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(18)30787-6/fulltext (title only). Also listed: https://www.thelancet.com/pdfs/journals/lancet/PIIS0140-6736(18)30805-5.pdf.
  - Am J Med, "How Pure is PURE? Dietary Lessons Learned and Not Learned From the PURE Trials": https://www.amjmed.com/article/S0002-9343(17)31216-0/pdf (title only).
  - SECONDARY, title only: natap.org "Fats/Carbohydrates PURE Study Refuted by AHA"; CBC "second opinion: the demise of a dietary dogma"; tabledebates.org list of criticised Lancet papers.
- Limitation statements as displayed (query 28; the source passage was not identified, so attribution to the PURE authors is uncertain):
  - "mean contribution of saturated fat to total energy intake was only 8.1% and diet assessment was only done at baseline" — https://onlinelibrary.wiley.com/doi/10.1111/nbu.12585 (one of several candidate links in the list). The 8.1% could not be reconciled with other data; treat as doubtful.
  - "it is not known if increased MUFA and PUFA intake replaced SFA or whether all were independent changes" — query 28 result set. Source passage also unidentified.
- Verification: Lancet Comment authors, date and quote = **V1** (query 29). Limitation statements = **V1**, doubtful. Other items = existence only (V1 as hit titles).
- Notes: the critiques and the pro-PURE comment come from authors and institutions that hold positions in this debate. Their interests are not displayed in any output (background recollections are in D1).

### [S3-13] Zhang 2025 (JAMA Intern Med) — butter and plant-based oils vs mortality
- Citation: Zhang Y, et al. (2025). Butter and plant-based oils intake and mortality. JAMA Intern Med, published 6 March 2025. DOI 10.1001/jamainternmed.2025.0205 (displayed); PubMed https://pubmed.ncbi.nlm.nih.gov/40048719/. Earlier AHA conference abstract: "Abstract MP01: Butter and Plant-Based Oils Intakes and Mortality in Three Large Prospective Cohorts of US Women and Men" (https://www.ahajournals.org/doi/10.1161/cir.151.suppl_1.MP01).
- Type / level: prospective cohorts — Level IV. Date: March 2025.
- Design / population: Nurses' Health Study, NHS II, Health Professionals Follow-up Study; 221,054 adults followed up to 33 years; 50,932 deaths (12,241 cancer, 11,240 CVD). Result list wording also says "more than 200,000 people over 30 years".
- Comparator / contrast: highest vs lowest butter intake; highest vs lowest total plant-based oils; **substitution of 10 g/day butter by plant-based oils**. Butter is a food, not SFA, and plant oils carry other changes (PUFA, MUFA, tocopherols, ALA), so this is not a pure SFA comparison.
- Key results (as displayed): highest vs lowest butter, total mortality HR 1.15 (CI not displayed). Highest vs lowest plant oils, HR 0.84. Per 10 g/day plant oils: cancer mortality 11% lower, CVD mortality 6% lower. Butter: higher cancer mortality, "but not cardiovascular disease mortality". Substituting 10 g/day butter with plant oils: total mortality HR 0.83 and cancer mortality HR 0.83. Among people who add butter to food or bread, +4% total mortality per 5 g/day. Benefit was strongest for soybean, canola and olive oils.
- Snippets + URL:
  - "the highest butter intake was associated with a significantly increased risk for total mortality (hazard ratio, 1.15)" — https://www.healio.com/news/primary-care/20250306/replacing-butter-with-plant-based-oil-may-have-significant-longterm-health-benefits (SECONDARY; the primary page https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2831265 is in the same list)
  - "Substituting 10-g/day intake of total butter with an equivalent amount of plant-based oils was associated with significant reductions in total mortality" — same result set (hazard ratios 0.83 for total and cancer mortality)
  - "There were 50,932 deaths documented during up to 33 years of follow-up: 12,241 and 11,240 were due to cancer and cardiovascular disease, respectively" — query 20 result set
  - "Butter was associated with an increased risk of cancer mortality but not cardiovascular disease mortality" — same
- Verification: HR 1.15 and substitution HR 0.83 = **V2** (queries 17 and 20; multiple press pages; no echo from the prompt). Other figures = V1 (query 20). Query 20 had the N and follow-up in the prompt, so those are not independent.
- Certainty / limitations / funding / COI: not displayed. Observational design; dietary assessment method not displayed. Critique and commentary items found, unread: https://www.sciencemediacentre.org/expert-reaction-to-study-looking-at-butter-or-vegetable-oils-and-mortality/ ; PubMed 41645999 ("Association of butter and plant-based oils with mortality: Further clarifying the butter ..."); https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12333795/ ("The role of high-fat diets in cancer mortality: is butter to blame?").
- Notes: same NHS / HPFS cohorts as S3-08 and S3-09 (as displayed), so not an independent replication. It does not test SFA per se. Key result for the "reverse or null" question: butter was not associated with CVD mortality.

### [S3-14] NIH-AARP 2024 (JAMA Intern Med) — plant and animal fat vs mortality
- Citation: "Plant and Animal Fat Intake and Overall and Cardiovascular Disease Mortality." JAMA Intern Med, 2024 (news dated August 2024). Authors, volume, pages and DOI not displayed. https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2821738
- Type / level: prospective cohort — Level IV. Date: 2024.
- Design / population: NIH-AARP Diet and Health Study, US, 1995 to 2019; 407,531 participants, mean follow-up 24 years; 185,111 deaths, 58,526 from CVD.
- Comparator / contrast: Q5 vs Q1 of fat from each source; **replacement of 5% of energy** from animal fat, red-meat fat, dairy fat or egg fat by plant fat, grain fat or vegetable-oil fat. SFA is not analysed as such.
- Key results (as displayed):
  - Plant fat, Q5 vs Q1: HR 0.91 (overall) and 0.86 (CVD).
  - Total animal fat: HR 1.16 (overall) and 1.14 (CVD); dairy fat 1.09 and 1.07; egg fat, stroke mortality HR 1.22.
  - Replacement: 4% to 24% lower overall mortality and 5% to 30% lower CVD mortality.
  - **A different query returned conflicting animal-fat values** (see B3).
- Snippets + URL:
  - "The study followed 407,531 participants for an average of 24 years, documenting 185,111 deaths, including 58,526 from cardiovascular disease." — https://www.news-medical.net/news/20240813/Greater-plant-fat-intake-associated-with-lower-overall-and-cardiovascular-disease-mortality.aspx (SECONDARY; in list for query 21)
  - "A higher intake of total animal fat was associated with hazard ratios of 1.16 and 1.14 for overall and CVD mortality respectively" — same result set
  - "associated with a 4% to 24% lower risk of death overall and a 5% to 30% lower risk of death from cardiovascular disease" — same
  - "lower risk for overall and CVD mortality with hazard ratios of 0.91 and 0.86, respectively" — query 18 result set
- Verification: replacement ranges = **V2** (queries 18 and 21). Plant-fat HRs = V1 (query 18). Animal-fat HRs 1.16/1.14 and N = V1 (query 21).
- Certainty / limitations / funding / COI: not displayed.

### [S3-15] Li et al. (AJCN, 2024/25) — changes in fatty acid intake and mortality (narrative only)
- Citation: "Changes in fatty acid intake and subsequent risk of all-cause and cause-specific mortality in males and females: a prospective cohort study." Am J Clin Nutr. Year not stated in output (PII S0002-9165(24)00883-9; PMC11748121). Authors: Yanping Li is among them. https://ajcn.nutrition.org/article/S0002-9165(24)00883-9/fulltext ; https://pmc.ncbi.nlm.nih.gov/articles/PMC11748121/
- Type / level: prospective cohort — Level IV.
- Design / population: summary describes the Health Professionals Follow-up Study (51,529 men aged 40-75, diet from 1986, follow-up to January 2020), although the title says "males and females" (see B6).
- Comparator / contrast: change in intake; substitution of SFA by unsaturated fats.
- Key results (as displayed, narrative only, no effect sizes): findings "support replacing saturated fatty acids with unsaturated fatty acids (especially from plant sources) and eliminating dietary trans fatty acids".
- Snippets + URL: "increases in intakes of linoleic acid, marine n-3 PUFA, and MUFA from plant sources were each significantly associated with lower all-cause mortality" — query 23 result set
- Verification: **V1**, narrative only.
- Certainty / limitations / funding / COI: not displayed.

---

## B. Disagreements and discrepancies between sources

**B1. The direction of SFA findings depends on the comparator and adjustment, not only on the cohort.** I record each result under its own comparator and do not merge them:

| Result | Contrast | Estimate (as displayed) | Entry |
|---|---|---|---|
| Pooled cohorts, null | SFA extreme quantiles, replacement unspecified | CHD 1.07 (0.96-1.19); CVD 1.00 (0.89-1.11) | S3-01 |
| Pooled cohorts, null | same | CHD RR 1.03 (0.98-1.07) | S3-03 |
| Pooled cohorts, null | same | all-cause mortality 0.99 (0.91-1.09); GRADE very low | S3-04 |
| Substitution, benefit | 5% energy SFA to PUFA | coronary events 0.87 (0.77-0.97) | S3-06 |
| Substitution, benefit | 5% energy SFA to PUFA | CHD 0.75 (0.67-0.84) | S3-07 |
| Substitution, benefit | 5% energy SFA to PUFA / MUFA | total mortality 0.73 (0.70-0.77) / 0.87 (0.82-0.93) | S3-09 |
| Higher SFA, harm | Q5 vs Q1 in high-risk trial cohort | CVD 1.81 (1.05-3.13) | S3-10 |
| Higher SFA, inverse | Q5 vs Q1 in 18 countries | total mortality 0.86 (0.76-0.99); stroke 0.79 (0.64-0.98) | S3-11 |

- The Harvard-cohort total-mortality estimate for SFA is 1.08 (1.03-1.14; echoed, unconfirmed) while PURE shows 0.86 for the same-direction contrast. The displayed texts do not explain this. Candidate explanations (population, measurement, replacement nutrient, adjustment) were not retrieved.
- The Siri-Tarino-vs-Scarborough dispute is about whether adjustment for serum cholesterol hides an effect (S3-02). The authors' non-adjusting subset gave a result not significantly different from the full analysis. That is the authors' own sensitivity check.

**B2. Siri-Tarino sample size.** "347,747 subjects ... 11,006 developed CHD or stroke" (query 4; N was in my prompt) vs "214,182 subjects ... 8,644 cases of CHD" (query 8). Possibly CHD-only vs combined. Unresolved. "Almost 350,000 subjects ... 21 studies" in query 1 fits the first.

**B3. NIH-AARP animal-fat HRs.** Query 21: total animal fat 1.16 / 1.14, dairy fat 1.09 / 1.07. Query 18: total animal fat "0.96 for overall mortality and 0.95 for CVD mortality", dairy 0.92/0.92, egg 0.84/0.80, red-meat fat 0.91/0.90. The query-18 values are below 1, yet the same summary says animal fat was associated with elevated risk. I think they are garbled or belong to another model. Not used. Resolve against the JAMA table.

**B4. De Souza figures.** My seed gave 73 studies; the output says 50 observational studies. A query-6 summary gave "CHD deaths ... 1.08 (95% CI 0.94 to 1.25)" with no source. The paper's own SFA CHD estimates were not retrieved. Do not use 1.08 (0.94-1.25) as de Souza's.

**B5. Chowdhury versions.** An original and a corrected version existed (Science news, query 7). I cannot tell which version the displayed numbers come from. The "insufficient evidence ... SFA" sentence in a summary repeats Siri-Tarino's words and was discarded. The 1.03 figure was in my prompt when it came back.

**B6. Li AJCN 2024/25.** The title says "males and females", but the summary describes only the male Health Professionals Follow-up Study.

**B7. Summarizer reliability.** Echoed prompt numbers in queries 12 (Jakobsen 0.87), 15 and 19 (Wang 1.08 / 0.81), 5 (Chowdhury 1.03), 30 (PURE). It also invented "as the authors mention" and "the study's authors" attributions (S3-12) and garbled the NIH-AARP results (B3).

**B8. Seeds not matched.** "Li 2020 (BMJ) dietary fat and mortality" was not found. Closest hits: two Clinical Nutrition 2020 papers (D2) and the AJCN 2024/25 paper (S3-15). Zong 2016 and Guasch-Ferré 2015 matched. The Imamura / FORCE and EPIC-InterAct seeds were never searched.

**B9. Overlapping cohorts.** S3-08, S3-09, S3-13 and S3-15 use the Nurses' Health Study and/or Health Professionals Follow-up Study as displayed. S3-07 is likely the same cohorts (V0, D1). They should not be counted as independent replications of one another. PURE (S3-11) and NIH-AARP (S3-14) are different cohorts.

**B10. The 8.1% energy figure for PURE (S3-12)** was not reconciled with any other displayed number.

---

## C. Counter-evidence searched (what I looked for)

| Question | What I looked for | Found? |
|---|---|---|
| Is SFA harmful? | Substitution analyses and harm findings in large cohorts | Yes: S3-06 to S3-10, S3-13, S3-14. All depend on the replacement nutrient; the comparator is rarely refined carbohydrate. |
| Is there no association? | Pooled cohort meta-analyses | Yes: S3-01, S3-03, S3-04, S3-05. |
| Is there an inverse / protective signal? | Large cohorts with inverse SFA findings | Yes: PURE (stroke, total mortality), S3-11. Siri-Tarino stroke point estimate 0.81 had a CI that included 1. |
| Is the null pooled evidence biased? | Critiques of Siri-Tarino and Chowdhury | Partly: S3-02, S3-03 (errors, corrected version). |
| Is PURE biased? | Critiques of PURE | Titles and fragments only (S3-12). |
| Natural vs artificial angle | Industrial vs ruminant trans fat | Yes, one paper: S3-04 (CHD 1.42 vs 0.93; CIs wide for ruminant). |
| 2025-26 reverse or null findings | New large cohorts | Only S3-13 and S3-14 (both show harm for animal fat or butter; butter and CVD mortality null). 2025-26 meta-analyses: **not searched (budget)**. |
| Biomarker studies (circulating SFA, FORCE, EPIC-InterAct) | | **Not searched.** |
| Mendelian randomization of SFA, LDL, dairy | | **Not searched.** |
| GBD diet-attributable burden | | **Not searched.** |
| Asian cohorts (Japan, China) with inverse SFA findings | | **Not searched.** |
| Reverse causality, healthy-user bias, FFQ measurement error, secular change | | **Not searched.** |

---

## D. Leads

### D1. V0 — background knowledge, NOT verified this session, do NOT use as findings
- **Biomarkers (seed item 5).** FORCE consortium pooled analyses (Imamura and colleagues, PLoS Medicine, about 2018) on dairy-fat fatty-acid biomarkers (15:0, 17:0, trans-16:1n-7) and T2D, and on de novo lipogenesis fatty acids and T2D; exact titles, years and results unverified. EPIC-InterAct (Forouhi and colleagues, about 2014, Lancet Diabetes Endocrinol): plasma phospholipid even-chain SFAs positively and odd-chain SFAs inversely related to incident T2D. Chowdhury 2014 pooled circulating-SFA results for CHD. The task statement notes that circulating SFAs partly reflect de novo lipogenesis from carbohydrate; I did not see this confirmed in a result.
- **Mendelian randomization.** LDL-C causal for CHD (genetic and consensus papers, Ference and the EAS consensus, about 2017); lactase-persistence (LCT-13910) MR of milk intake and CVD / T2D; MR of plasma SFA or palmitic acid and CAD / T2D. Unverified.
- **GBD.** The GBD 2017 risk list (Afshin et al., Lancet 2019) includes trans fat but, as I recall, not saturated fat. Unverified.
- **Asian and Dutch cohorts.** Yamagishi and colleagues (AJCN 2010, Japan Collaborative Cohort) on SFA and stroke / CVD mortality; JPHC; Praagman and colleagues (EPIC-NL / Rotterdam, 2015-16). Unverified.
- **Funding and COI recollections.** Siri-Tarino 2010 supported by the National Dairy Council; de Souza 2015 funded via WHO; PURE funded by PHRI plus pharma and other grants; the NHS / HPFS cohorts funded by NIH. Unverified.
- **PREDIMED.** The primary NEJM report was retracted and republished in 2018 over randomization irregularities. Check whether the observational PREDIMED analyses (S3-10) were affected.
- **Li 2015 JACC cohorts (S3-07).** My recollection is the Nurses' Health Study and the Health Professionals Follow-up Study, which would make it overlap with S3-08, S3-09 and S3-13. Not shown in any result.
- **Positions of the PURE commentators (S3-12).** Ramsden (Lancet Comment) has published re-analyses of older diet-heart trials that question the SFA-restriction case. The Harvard Nutrition Source is the communication arm of the Harvard T.H. Chan School, whose investigators run the Nurses' Health Study and Health Professionals Follow-up Study cohorts. Both are therefore interested commentators on PURE. Neither fact was shown in a result.
- **Dietary assessment in the NHS / HPFS cohorts (S3-13).** Food frequency questionnaires, repeated every few years. Not shown in a result.
- **Chowdhury 2014 conclusion text.** My recollection is that it says current evidence does not clearly support guidelines encouraging high PUFA and low total SFA consumption. Unverified.
- **Methodological authorities to retrieve for item 6.** Willett on nutritional epidemiology; Ioannidis (JAMA 2018); Satija (Adv Nutr 2015); Mozaffarian (BMJ 2018, history of nutrition science); regression dilution and energy adjustment. None retrieved.

### D2. Hit-list titles seen (existence V1 as search hits; contents NOT read, not findings)
- Cohorts and mortality:
  - Circ Res, "Dietary Fats in Relation to Total and Cause-Specific Mortality in a Prospective Cohort of 521 120 Individuals With 16 Years of Follow-Up" — https://www.ahajournals.org/doi/10.1161/CIRCRESAHA.118.314038
  - NHANES: https://pubmed.ncbi.nlm.nih.gov/29498349/ ; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9884296/ ; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11879808/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC12065306/
  - Clinical Nutrition 2020, "Association of types of dietary fats and all-cause and cause-specific mortality: A prospective cohort study and meta-analysis of prospective studies with 1,164,029 participants" — https://www.sciencedirect.com/science/article/abs/pii/S0261561420301461
  - Clinical Nutrition 2020, "Association between dietary fat intake and mortality from all-causes, cardiovascular disease, and cancer: A systematic review and meta-analysis of prospective cohort studies" — https://www.sciencedirect.com/science/article/abs/pii/S0261561420303551
  - Br J Nutr, "Saturated fatty acids and total and CVD mortality in Norway: a prospective cohort study with up to 45 years of follow-up" — https://www.cambridge.org/core/journals/british-journal-of-nutrition/article/saturated-fatty-acids-and-total-and-cvd-mortality-in-norway-a-prospective-cohort-study-with-up-to-45-years-of-followup/4905CE5BBC5A004CB0658B56A71C9441
  - Dutch / other CHD cohorts: https://www.ahajournals.org/doi/10.1161/atvbaha.116.307578 ; https://www.ahajournals.org/doi/10.1161/ATVBAHA.114.304082
- Newer evidence:
  - UK Biobank, "Associations between saturated fatty acids from different dietary sources and cardiovascular disease risk in 114,285 UK Biobank study participants" — https://academic.oup.com/eurheartj/article/42/Supplement_1/ehab724.2418/6394452 ; "Associations of circulating fatty acids with incident coronary heart disease: a prospective study of 89,242 individuals in UK Biobank" — https://bmccardiovascdisord.biomedcentral.com/articles/10.1186/s12872-023-03394-6
  - Overview of systematic reviews, "Saturated fat, the estimated absolute risk and certainty of risk for mortality and major cancer and cardiometabolic outcomes" — https://systematicreviewsjournal.biomedcentral.com/articles/10.1186/s13643-023-02312-3 (high priority: it is the closest thing to an umbrella review that I saw)
  - Stroke meta-analysis, "Dietary saturated fat intake and risk of stroke: Systematic review and dose-response meta-analysis of prospective cohort studies" — https://www.nmcd-journal.com/article/S0939-4753(19)30380-1/abstract
  - JACC, "Effect of Low-Carbohydrate and Low-Fat Diets on Metabolomic Indices and Coronary Heart Disease in U.S. Individuals" — https://www.jacc.org/doi/abs/10.1016/j.jacc.2025.12.038
- Reviews, rebuttals, official documents:
  - JACC State-of-the-Art, "Saturated Fats and Health: A Reassessment and Proposal for Food-Based Recommendations" — https://www.jacc.org/doi/10.1016/j.jacc.2020.05.077
  - "Convincing evidence supports reducing saturated fat to decrease cardiovascular disease risk" — https://pmc.ncbi.nlm.nih.gov/articles/PMC7678478
  - MJA 2015, "Sceptics undermine effective dietary and heart health advice" — https://www.mja.com.au/journal/2015/202/8/sceptics-undermine-effective-dietary-and-heart-health-advice
  - AHA Presidential Advisory, "Dietary Fats and Cardiovascular Disease" — https://www.ahajournals.org/doi/abs/10.1161/CIR.0000000000000510
  - "Saturated Fat Consumption and Risk of Coronary Heart Disease and Ischemic Stroke: A Science Update" — https://pmc.ncbi.nlm.nih.gov/articles/PMC5475232/
  - Official-body evidence portfolio, "Appendix E-2.43: Saturated Fat and Risk of CVD Evidence Portfolio" — https://odphp.health.gov/sites/default/files/2019-09/Appendix-E-2.43.pdf (year not displayed)
- Secular change: a correction notice, "United States dietary trends since 1800: lack of association between saturated fatty acid consumption and non-communicable diseases" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12766976/
- Food source (other stream): "Saturated fats, dairy foods and cardiovascular health: No longer a curious paradox?" — https://pmc.ncbi.nlm.nih.gov/articles/PMC10091990/
- **For the RCT stream:** Ann Intern Med Vol 179 No 2, "Effect of Interventions Aimed at Reducing or Modifying Saturated Fat Intake on Cholesterol, Mortality, and Major Cardiovascular Events: A Risk Stratified Systematic Review of Randomized Trials" — https://www.acpjournals.org/doi/10.7326/ANNALS-25-02229 ; JMA J 2024, "Saturated Fat Restriction for Cardiovascular Disease Prevention: A Systematic Review and Meta-analysis of Randomized Controlled Trials" — https://pmc.ncbi.nlm.nih.gov/articles/PMC12095860/
- Correspondence: Wang 2016 letters (PubMed 27918809, 27918810); Annals correspondence on Chowdhury (DOIs 10.7326/l14-5018 and suffixes -6, -9, -11).

---

## E. Search log (30 performed; 3 refused for budget)
Mode: std = standard, ext = extended. "Echo" = my prompt contained the numbers returned, so the result does not count as confirmation.

| # | Query (shortened) | Mode | Useful |
|---|---|---|---|
| 1 | Siri-Tarino 2010 meta-analysis prospective cohort SFA CVD AJCN | std | Y (existence, DOI, qualitative conclusion) |
| 2 | Chowdhury 2014 Annals title, RR 95% CI saturated | ext | Y (citation, RCT RRs; no SFA figure) |
| 3 | de Souza 2015 BMJ title, RR 95% CI | ext | Y (all-cause RR, conclusion, trans %) |
| 4 | Siri-Tarino title, RR CHD stroke CVD, "347,747 subjects" | ext | Y (RR figures; N echo) |
| 5 | Chowdhury 2014, "1.03", 32 studies, 530,525 | ext | Partly (echo; CI new) |
| 6 | de Souza BMJ 2015, "1.06" "0.99", 73 studies, trans 1.34 | ext | N (echo; unattributed 1.08 CHD-death figure) |
| 7 | Chowdhury correction, errata, Willett, Hu | ext | Y (corrected version, critique) |
| 8 | Siri-Tarino "1.07" "0.96" "1.19" "0.81" | ext | Partly (echo; alternative N) |
| 9 | Scarborough "overadjustment obscures true associations" | std | Y |
| 10 | de Souza abstract, RR 0.99, 1.06, 0.95 | ext | Partly (GRADE "very low", citation fields) |
| 11 | Zhu Bo Liu 2019 dose-response meta-analysis | ext | Y (qualitative; no SFA ES) |
| 12 | Jakobsen 2009, HR 0.87 | ext | N (echo) |
| 13 | Li Hruby Bernstein Hu 2015 JACC | ext | Y |
| 14 | Zong 2016 BMJ individual SFAs | ext | Y |
| 15 | Wang 2016 JAMA IM, 1.08 / 0.81 | ext | Partly (echo) |
| 16 | Wang 2016 JAMA IM, no numbers | ext | N (citation only) |
| 17 | Butter and plant-based oils JAMA IM 2025 | ext | Y |
| 18 | Plant and animal fat JAMA IM 2024 | ext | Partly (garbled animal-fat HRs) |
| 19 | Wang 2016 126,233 participants, 33,304 deaths, 1.08, 0.81 | ext | Y (substitution HRs, death counts) |
| 20 | Zhang Hu 2025 butter, 221,054, 33 years | ext | Y |
| 21 | Plant and animal fat NIH-AARP 2024 details | ext | Y |
| 22 | Dehghan 2017 PURE, SFA stroke HR | ext | Y |
| 23 | Li Yanping 2020 BMJ dietary fat mortality | ext | N for seed; surfaced AJCN 2024/25 and cohort titles |
| 24 | Guasch-Ferré 2015 PREDIMED | ext | Y |
| 25 | PURE SFA total mortality, MI, CVD mortality, 135,335 | ext | Y |
| 26 | Jakobsen 2009 replacing SFA with PUFA, 5% energy | ext | Y |
| 27 | de Souza 2015 trans fat industrial ruminant | ext | Y |
| 28 | PURE critique, limitations, FFQ, reverse causality | ext | Partly (unattributed limitations) |
| 29 | "PURE study challenges the definition of a healthy diet" Lancet Comment | std | Y |
| 30 | Dehghan PURE "0.86" "0.76" "0.79" | ext | N (echo; critique link titles) |

**Refused, not performed (budget):** (31) umbrella review SFA all-cause mortality / CVD certainty; (32) Syst Rev 2023 overview of systematic reviews, results; (33) 2025 meta-analysis SFA cohort dose-response.

### Searches NOT run — suggested plan if the budget is raised (about 30 calls, priority order)
1. Biomarkers (extended x3): FORCE / Imamura PLoS Med 2018 dairy-fat biomarkers and T2D, and DNL fatty acids and T2D; EPIC-InterAct Forouhi 2014 plasma phospholipid SFAs and T2D; Chowdhury 2014 circulating-SFA pooled RR.
2. Mendelian randomization (extended x3): plasma SFA / palmitic acid and CAD or T2D; LDL-C genetic score and CHD; lactase persistence (LCT-13910) milk intake and CVD.
3. GBD (extended x1): whether saturated fat is a GBD dietary risk; trans-fat burden.
4. 2022-2026 syntheses (extended x4): the 2023 Systematic Reviews overview; any umbrella review of SFA; "2026 meta-analysis saturated fat"; UK Biobank SFA / food-source analyses.
5. Methodological critique (extended x4): FFQ measurement error and energy adjustment; healthy-user bias; reverse causality (illness-driven diet change); comparator ambiguity and secular dietary change. Include the Science Media Centre reaction to Zhang 2025.
6. Asian and Dutch cohorts (extended x3): JACC Study / JPHC SFA and stroke or CVD mortality; Shanghai / China cohorts; Praagman.
7. Seed repair (extended x6): de Souza SFA estimates (CHD, CHD mortality, CVD, stroke, T2D); Zhu 2019 SFA estimate; Siri-Tarino second independent confirmation; Zong HR contrast; Li 2015 MUFA / refined-carbohydrate results and cohorts; Wang 2016 SFA quintile HR without echo; Guasch-Ferré all-cause mortality; the "Li 2020" seed.
8. NIH-AARP 2024 and Zhuang 2019 numbers without echo (extended x2).
