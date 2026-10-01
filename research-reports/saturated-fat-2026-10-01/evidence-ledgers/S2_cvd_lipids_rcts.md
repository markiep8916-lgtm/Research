# S2 — Blood lipids and randomized-trial evidence on cardiovascular disease (SQ2a, SQ2b, SQ2d, SQ2e) — Evidence Ledger
Run date: 2026-10-01 | Searches run: 17 (standard 3 / extended 14) | WebFetch attempts: 1 (EGRESS_BLOCKED) | Search calls refused by the session cap: 2

## 0. STATUS AND COVERAGE (read first)

- **The session-wide WebSearch budget ran out.** After my 17th search the harness answered "this session has used its web search budget (200 of 200 WebSearch calls)" and refused my next two calls. The cap is session-wide and shared with the other streams, which is why my own count (17) is far below 200. The harness message says to ask the user to raise `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` if more searches are genuinely needed. I did not try any workaround (no curl, no further WebFetch). My one WebFetch (www.jmaj.jp) returned EGRESS_BLOCKED, so I stopped using WebFetch as instructed.
- **Consequence: this ledger is PARTIAL.** Only the Cochrane review (task item 2) and the JMAJ 2025 review with its 2025-2026 neighbours (task item 3) were searched. Task items 1, 4, 5, 6 and 7 have NO verified findings. Section D lists them as unverified background leads (V0) with first-pass queries for a re-run.
- **No page was read.** Every number below is copied from a machine-written search summary or from a link title. The summaries sometimes blend numbers from different versions of the same paper (see section B).

| Task item | Searched? | What is verified |
|---|---|---|
| 1. Lipid / apoB / Lp(a) meta-analyses by comparator (Mensink, Clarke, Hegsted/Keys, Krauss, Chiu) | No | Nothing |
| 2. Cochrane CD011737, all versions | Yes (most of the 17 searches) | Headline CV-event numbers for the 2015 and 2020 versions; mortality and some component numbers; NNT; version history. NOT retrieved: replacement-nutrient subgroup RRs, risk-of-bias findings, reasons the numbers changed, any post-2020 update |
| 3. JMAJ 2025 and other 2024-2026 SRs of SFA-reduction RCTs; NCT05778656 | Yes (same searches) | JMAJ basics; Annals 2025/26 risk-stratified review; 2024 umbrella review (title only); NCT05778656 (title only). NOT retrieved: JMAJ protocol registration, effect estimates, certainty ratings, COI, published critiques |
| 4. Landmark trials and reanalyses | No | Nothing (two incidental link-title hits, see S2-10) |
| 5. LDL-C / apoB causality (EAS, MR, drug trials, critiques) | No | Nothing |
| 6. Non-LDL pathways | No | Nothing |
| 7. Pooled per-5%-energy substitution estimates (Mozaffarian 2010) | No | Nothing |

---

## A. Findings ledger

### [S2-01] Cochrane CD011737, original 2015 version — combined CV events, mortality, MI
- Citation: Hooper L, Martin N, Abdelhamid A, Davey Smith G (2015). Reduction in saturated fat intake for cardiovascular disease. Cochrane Database of Systematic Reviews, 2015, Issue 6, CD011737. DOI 10.1002/14651858.CD011737 (shown in the page URL). Author names as displayed in a UEA repository entry in Search 10: "Hooper, Lee, Martin, Nicole, Abdelhamid, Asmaa and Davey Smith, George".
- Type / level: SR/MA of RCTs — Level I.   Date/version: first version, 2015 (Issue 6). Split on 27 March 2015 from CD002137.pub3 (see S2-05).
- Design / population: "15 randomised controlled trials" (Search 10); "15 studies with more than 59,000 participants" (Search 9). Long-term trials (at least two years, per Search 9 wording) of reduced or modified saturated-fat intake. Comparator and replacement nutrient are not stated in the displayed text.
- Key results (exactly as displayed):
  - Combined CV events: RR 0.83; 95% CI 0.72 to 0.96; 13 comparisons; 53,300 participants, 8% of whom had a CV event; I² 65%; GRADE moderate.
  - All-cause mortality: RR 0.97; 95% CI 0.90 to 1.05; 12 trials; 55,858 participants.
  - CV mortality: RR 0.95; 95% CI 0.80 to 1.12; 12 trials; 53,421 participants (both mortality outcomes "GRADE moderate" per the Heart summary).
  - MI (fatal and non-fatal): RR 0.90; 95% CI 0.80 to 1.01; 11 trials; 53,167 participants.
  - Out of stream, recorded because displayed: "no evidence of harmful effects of reducing saturated fat intakes on cancer mortality, cancer diagnoses or blood pressure, while there was some evidence of improvements in weight and BMI" (Search 14, V1).
- Snippets + URL:
  - "risk ratio (RR) 0.83; 95% confidence interval (CI) 0.72 to 0.96, 13 comparisons, 53,300 participants of whom 8% had a cardiovascular event" — https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD011737/full (Search 2 summary; same figures in Searches 10 and 14)
  - "Effects on all-cause mortality (RR 0.97; 95% CI 0.90 to 1.05; 12 trials, 55,858 participants)" — https://pubmed.ncbi.nlm.nih.gov/26453280/ (Search 14 summary of the Heart "Cochrane Corner")
  - "cardiovascular mortality (RR 0.95; 95% CI 0.80 to 1.12, 12 trials, 53,421 participants)" — same Search 14 / URL
  - "myocardial infarction (fatal and non-fatal, RR 0.90; 95% CI 0.80 to 1.01; 11 trials, 53,167 participants)" — same Search 14 / URL
  - "suggestive of a small but potentially important reduction in cardiovascular risk on reduction of saturated fat intake" — Search 2 summary, 2015 authors' conclusion — https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD011737/full
- Verification: combined CV events **V2** (Searches 2, 10, 14: Cochrane Library 2015 page and the Heart Cochrane Corner). All-cause mortality **V2** (Searches 14, 17). CV mortality **V1** (Search 14; Search 10 shows the same RR, CI and N but "10 trials"). MI **V1** (Search 14).
- Certainty / limitations / funding / COI: GRADE moderate for CV events and both mortality outcomes. Risk of bias, funding and COI not displayed in any result.
- Notes: superseded by the 2020 versions (S2-02, S2-03). The Heart "Cochrane Corner" (PubMed 26453280; a file name in Search 11 suggests "Hooper et al", Sept 2015) restates the 2015 numbers; it is a second publication of the same analysis, not independent data.

### [S2-02] Cochrane CD011737, 2020 update (pub2 May 2020; pub3 Aug 2020) — combined CV events
- Citation: Hooper L, Martin N, Jimoh OF, Kirk C, Foster E, Abdelhamid AS (2020). Reduction in saturated fat intake for cardiovascular disease. Cochrane Database of Systematic Reviews 2020. pub2 = Issue 5, PubMed 32428300, DOI 10.1002/14651858.CD011737.pub2. pub3 = Issue 8, DOI 10.1002/14651858.CD011737.pub3. Authors as displayed in Search 12: "Lee Hooper, Nicole Martin, Oluseyi F Jimoh, Christian Kirk, Eve Foster, and Asmaa S Abdelhamid".
- Type / level: SR/MA of RCTs — Level I.   Date/version: 2020. pub3 is the later of two 2020 versions and is described as "edited (no change to conclusions)" (Search 8). No later version appeared in any result (I did not run a query specifically for a post-2020 update).
- Design / population: objective as displayed (Search 12): "the effect of reducing saturated fat intake and replacing it with carbohydrate, polyunsaturated, monounsaturated fat and/or protein on mortality and cardiovascular morbidity, using all available randomised clinical trials". AAFP summary (Search 13): reduction "for a minimum of two years (average = 4.7 years)".
- Key results (exactly as displayed): combined CV events RR 0.83; 95% CI 0.70 to 0.98; 12 trials; 53,758 participants, 8% of whom had a CV event (AAFP: "4,538 of whom had CVD events"); described as a 17% reduction; GRADE moderate.
- Snippets + URL:
  - "risk ratio 0.83; 95% confidence interval 0.70 to 0.98), based on 12 trials with 53,758 participants, of whom 8% had a cardiovascular event" — https://pubmed.ncbi.nlm.nih.gov/32428300/ (Search 12 summary; Cochrane Library pub3 page also linked: https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD011737.pub3/full)
  - "RR = 0.83; 95% CI, 0.70 to 0.98; 53,758 participants, 4,538 of whom had CVD events; 12 RCTs" — https://www.aafp.org/pubs/afp/issues/2022/0100/od2.html (Search 13; SECONDARY summary of the review)
- Verification: **V2** (Searches 1, 5, 7, 12, 13: PubMed-record summary, Cochrane Library page, AAFP summary).
- Certainty / limitations / funding / COI: "moderate-quality evidence" (Search 1). Search 1 also says "no benefit was noted when analyzing individual components of the combined cardiovascular events outcome" (machine paraphrase, V1). Funding and COI not displayed.
- Notes: compared with 2015 (S2-01) the point estimate is unchanged (0.83) but the CI is 0.70 to 0.98 instead of 0.72 to 0.96, the unit counted is "12 trials" instead of "13 comparisons", and N is 53,758 instead of 53,300. Why it changed was not retrieved (no "What's new" text seen).

### [S2-03] Cochrane CD011737, 2020 — mortality, component outcomes, GRADE, NNT
- Citation: as S2-02.   Type / level: Level I.   Date/version: 2020 (pub2/pub3; version attribution of the mortality numbers is probable, not certain, see section B).
- Key results (exactly as displayed):
  - All-cause mortality: RR 0.96; 95% CI 0.90 to 1.03; 11 trials; 55,858 participants (GRADE moderate).
  - CV mortality: RR 0.95; 95% CI 0.80 to 1.12; 10 trials; 53,421 participants (GRADE moderate).
  - Non-fatal MI: RR 0.97, 95% CI 0.87 to 1.07. CHD mortality: RR 0.97, 95% CI 0.82 to 1.16 (both Search 7 only).
  - "Effects on total (fatal or non-fatal) myocardial infarction, stroke and CHD events were all unclear as the evidence was of very low quality" (Search 7 only).
  - NNT for an additional beneficial outcome: 56 in primary-prevention trials (Searches 5, 13, 15). Secondary-prevention NNT: 53 (AAFP, Search 13) versus 32 (NZ Cochrane Pearls 655, Search 15) — see section B.
- Snippets + URL:
  - "all-cause mortality (RR 0.96; 95% CI 0.90 to 1.03; 11 trials, 55,858 participants)" — https://pmc.ncbi.nlm.nih.gov/articles/PMC7388853/ (first link in Search 6; same figures in Search 7, first link https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD011737.pub3/full)
  - "cardiovascular mortality (RR 0.95; 95% CI 0.80 to 1.12, 10 trials, 53,421 participants)" — Search 6, same links
  - "Non-fatal Myocardial Infarction: RR 0.97, 95% CI 0.87 to 1.07" — Search 7
  - "Effects on total (fatal or non-fatal) myocardial infarction, stroke and CHD events were all unclear as the evidence was of very low quality" — Search 7
  - "The number needed to treat for an additional beneficial outcome was 56 in primary prevention trials" — Search 5
  - "The NNT in secondary prevention trials was 53" — https://www.aafp.org/pubs/afp/issues/2022/0100/od2.html (Search 13)
- Verification: all-cause and CV mortality **V2** (Searches 6, 7) with the version caveat. Non-fatal MI, CHD mortality, "very low quality" sentence **V1** (Search 7). NNT primary 56 **V2** (Searches 5, 13, 15). Secondary NNT 53 **V1**; 32 **V1**.
- Certainty / limitations: GRADE moderate for the two mortality outcomes; "very low" for MI, stroke and CHD events (V1). The definition of the "combined CV events" composite was not retrieved.
- Notes: the participant totals (55,858 and 53,421) are identical in the 2015 and 2020 summaries while trial counts differ (12 to 11; 12 to 10). Inference only, not displayed: the units counted may have changed from comparisons to trials.

### [S2-04] UNRESOLVED: "RR 0.79; 95% CI 0.66 to 0.93; 11 trials; 53,300 participants" (the seed figure)
- Citation: text found in Cochrane-derived material; one result ties it to the NZ Cochrane "Pearls" document #655, "Reducing saturated fat for CVD" (PDF). Version and date of that document not displayed.
- Type / level: SECONDARY summary of a Level I review.
- Key results (exactly as displayed): "reduced the risk of combined cardiovascular events by 21% (risk ratio (RR) 0.79; 95% confidence interval (CI) 0.66 to 0.93, 11 trials, 53,300 participants of whom 8% had a cardiovascular event, I² = 65%, GRADE moderate-quality evidence)". The same text also gives all-cause mortality RR 0.96 (0.90 to 1.03; 11 trials; 55,858) and CV mortality RR 0.95 (0.80 to 1.12; 10 trials; 53,421), plus NNTB 56 (primary) and 32 (secondary).
- Snippets + URL:
  - "reducing dietary saturated fat reduced the risk of combined cardiovascular events by 21% (risk ratio (RR) 0.79; 95% confidence interval (CI) 0.66 to 0.93)" — https://nz.cochrane.org/sites/nz.cochrane.org/files/public/uploads/pearls_655_reducing_saturated_fat_for_cvd.pdf (Search 15 summary)
  - "11 trials, 53,300 participants of whom 8% had a cardiovascular event, I² = 65%, GRADE moderate-quality evidence" — Search 6 summary (link list led by https://pmc.ncbi.nlm.nih.gov/articles/PMC7388853/; which link carried the text is not shown)
  - Search 9 summary repeats the 21% / 0.79 text and adds "The review included 15 studies with more than 59,000 participants".
- Verification: the TEXT exists — **V2** (Searches 6, 9, 15). Its attribution to a specific Cochrane version — **UNRESOLVED**.
- What can be said: it shares N (53,300), the 8% event rate, I² (65%) and GRADE with the 2015 abstract as displayed (S2-01), but with a different RR, CI and trial count (0.79 / 0.66-0.93 / 11 trials versus 0.83 / 0.72-0.96 / 13 comparisons). It does not match the 2020 abstract as displayed (0.83; 0.70-0.98; 12 trials; 53,758). It cannot be the 2020 result. It is either an earlier or alternative specification of the 2015-era analysis or an error in a secondary summary; I could not tell which. Do NOT cite 0.79 as the current Cochrane estimate.
- Certainty / limitations / funding / COI: not applicable.

### [S2-05] Cochrane CD011737 version history (what is established)
- Citation: Search 8 summary. Its link list included the Cochrane Library pub3 "information" page, the pub3 abstract PDF, PMC pages, and the NZ Pearls PDF; the summary does not say which link carried each statement.
- Type / level: bibliographic facts.
- Key results (exactly as displayed): "On 27 March 2015, the review was split from a previously published review on 'Reduced or modified dietary fat for preventing cardiovascular disease' (CD002137.pub3)"; pub2 = Issue 5, 2020; pub3 = Issue 8, 2020 and "edited (no change to conclusions)".
- Snippets + URL:
  - "the review was split from a previously published review on 'Reduced or modified dietary fat for preventing cardiovascular disease' (CD002137.pub3)" — Search 8 summary; candidate source page in its link list: https://cochranelibrary.com/cdsr/doi/10.1002/14651858.CD011737.pub3/information
  - "The pub3 version was edited (no change to conclusions), published in Issue 8, 2020" — same Search 8 summary and link list
- Verification: **V1** (Search 8). The existence of pub2 (PubMed 32428300, May 2020, Search 12) and pub3 (Searches 5, 7) is **V2**.
- Not retrieved: the "What's new" or history text, the reason for the CI change from 2015 to 2020, and any update after 2020. The same Search 8 summary says pub2 contains "15 trials with a total of 15,509 participants"; this conflicts with every other N shown (53,758; 55,858) and is treated as a misreading and not used.

### [S2-06] Replacement-nutrient statements in Cochrane-derived texts (version attribution uncertain; subgroup RRs NOT retrieved)
- Citation: texts attributed by the search summaries to the Cochrane review (2015 and 2020) and to the NZ Pearls document.
- Type / level: SECONDARY restatements of Level I content.
- Key results (exactly as displayed):
  - 2015 authors' conclusion text (Search 2): "Replacing the energy from saturated fat with polyunsaturated fat appears to be a useful strategy, and replacement with carbohydrate appears less useful."
  - Cochrane-derived plain-language text (Searches 6 and 9; version unknown): "the health benefits arose from replacing saturated fats with polyunsaturated fat or starchy foods".
  - Search 11 summary: "It is unclear whether the energy from saturated fats eliminated from the diet are more helpfully replaced by polyunsaturated fats, monounsaturated fats, carbohydrate or protein." The same summary adds "Hooper's subgroup analysis in Cochrane shows that the conclusions do not vary significantly according to the type of replacement macronutrient" (machine paraphrase, may be wrong).
  - Meta-regression (Search 11): "Meta-regression suggested that greater reductions in saturated fat (reflected in greater reductions in serum cholesterol) resulted in greater reductions in risk of CVD events".
- Snippets + URL: as quoted above; Search 2 link https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD011737/full; Search 11 link list led by https://ueaeprints.uea.ac.uk/id/eprint/75272/ and https://nz.cochrane.org/sites/nz.cochrane.org/files/public/uploads/pearls_655_reducing_saturated_fat_for_cvd.pdf; Searches 6/9 as in S2-04.
- Verification: each statement **V1**, except the "PUFA or starchy foods" wording, which is **V2** as text (Searches 6, 9) but of unknown version.
- Notes: the three statements pull in different directions on carbohydrate (see section B). The comparator-specific subgroup estimates (SFA replaced by PUFA, MUFA, carbohydrate, protein) are the key missing numbers for this stream.

### [S2-07] Annals of Internal Medicine, risk-stratified systematic review of SFA-reduction trials (Steen et al., online December 2025)
- Citation: Steen JP and colleagues (Search 4 says "led by Jeremy P. Steen and colleagues"; full author list not displayed). Effect of Interventions Aimed at Reducing or Modifying Saturated Fat Intake on Cholesterol, Mortality, and Major Cardiovascular Events: A Risk Stratified Systematic Review of Randomized Trials. Annals of Internal Medicine, Vol 179, No 2 (link title); "published December 16, 2025" (Search 4 summary). DOI 10.7326/ANNALS-25-02229 (shown in the URL). Full author list not displayed.
- Type / level: SR/MA of RCTs with risk stratification — Level I.   Date/version: online Dec 2025; the most recent SR of these RCTs found in my searches.
- Design / population: "17 eligible trials with 66,337 participants"; searched MEDLINE, Embase and CENTRAL "from inception to July 2025" (this is the review the dispatcher recalled as searching to July 2025). Stratified by baseline cardiovascular risk.
- Key results (exactly as displayed in the Search 4 summary; stratum NOT identifiable): "low to moderate certainty" that reducing SFA "may result in a reduction in" all-cause mortality (RR 0.96 [95% CI 0.88 to 1.06]), cardiovascular mortality (RR 0.93 [CI 0.77 to 1.11]), nonfatal MI (RR 0.86 [CI 0.70 to 1.06]) and fatal and nonfatal stroke (RR 0.83; CI not shown). Replacing SFA with PUFA, nonfatal MI RR 0.75 [CI 0.58 to 0.99]. Qualitatively: benefit signal in high-CV-risk individuals; "little or no benefit over five years" at low-to-intermediate risk.
- Snippets + URL:
  - "17 eligible trials with 66,337 participants, and searched MEDLINE, Embase, and Cochrane Central Register of Controlled Trials from inception to July 2025" — https://www.acpjournals.org/doi/10.7326/ANNALS-25-02229 (Search 4 summary)
  - "may result in a reduction in all-cause mortality (RR, 0.96 [95% CI, 0.88 to 1.06]), cardiovascular mortality (RR, 0.93 [CI, 0.77 to 1.11])" — same
  - "nonfatal myocardial infarction (MI) (RR, 0.86 [CI, 0.70 to 1.06]), and fatal and nonfatal stroke (RR, 0.83)" — same
  - "replacing saturated fat with polyunsaturated fat for nonfatal MI (RR, 0.75 [CI, 0.58 to 0.99])" — same
  - "for people at low to intermediate cardiovascular risk, cutting or replacing saturated fat intake offered little or no benefit over five years" — same
  - Link title (ACC journal scan): "Reducing Saturated Fat May Reduce Mortality, NFMI, Stroke in High-Risk Individuals" — https://www.acc.org/latest-in-cardiology/journal-scans/2026/01/07/14/20/reducing-saturated-fat
  - Link title (MedicalXpress): "Reducing saturated fat intake shows mortality benefit, but only in high-risk individuals, review suggests" — https://medicalxpress.com/news/2025-12-saturated-fat-intake-mortality-benefit.html
- Verification: existence and the high-risk-only qualitative pattern **V2** (acpjournals page, ACC scan headline, MedicalXpress headline, Search 4 summary). All numbers **V1** (Search 4 summary only).
- Certainty / limitations / funding / COI: authors' stated certainty "low to moderate". Risk-of-bias findings, stratum definitions, PROSPERO registration, funding and COI not displayed. The three CIs shown for all-cause mortality, CV mortality and nonfatal MI all include 1.0 although the summary says "may result in a reduction"; which stratum these RRs belong to cannot be told from the output. Do not quote them as "overall" or "high-risk" without checking the abstract.
- Notes: link-list items also name an accompanying editorial, "Saturated Fats and Cardiovascular Disease: From Avoidance to a Nuanced Recommendation" (https://www.acpjournals.org/doi/10.7326/ANNALS-25-04971), a Science Media Centre page "expert reaction to systematic review study looking at saturated fat intake and cardiovascular disease events" (https://www.sciencemediacentre.org/expert-reaction-to-systematic-review-study-looking-at-saturated-fat-intake-and-cardiovascular-disease-events/), a Cardiology Advisor news item and an Annals video summary. Titles only; none read. These are the first places to look for published responses.

### [S2-08] JMAJ 2025 systematic review and meta-analysis of SFA-restriction RCTs (Yamada et al.)
- Citation: Yamada S, Shirai T, Inaba S, Inoue G, Torigoe M, Fukuyama N (2025). Saturated Fat Restriction for Cardiovascular Disease Prevention: A Systematic Review and Meta-analysis of Randomized Controlled Trials. JMA Journal 8(2):395-407 (volume, issue and pages as in the Search 3 summary). DOI 10.31662/jmaj.2024-0324 (shown in the URL). PMC12095860.
- Type / level: SR/MA of RCTs — Level I.   Date/version: 2025.
- Design / population: searched Cochrane CENTRAL, PubMed and Ichu-shi (a Japanese-language database) "for articles up to April 2023" (Search 3). Nine trials, 13,532 participants, of which 2 primary-prevention and 7 secondary-prevention trials.
- Key results (exactly as displayed): "no significant differences in cardiovascular mortality, all-cause mortality, myocardial infarction, and coronary artery events were observed between the groups." Pooled effect sizes and CIs were NOT displayed. Background rationale as displayed: recommendations to limit SFA come "primarily drawn from observational studies rather than randomized controlled trials".
- Snippets + URL:
  - "Nine eligible trials with 13,532 participants were identified (2 were primary and 7 were secondary prevention studies)" — https://www.jmaj.jp/detail.php?id=10.31662%2Fjmaj.2024-0324 (Search 3 summary; PMC copy https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12095860/)
  - "no significant differences in cardiovascular mortality, all-cause mortality, myocardial infarction, and coronary artery events were observed between the groups" — same
  - "searched Cochrane CENTRAL, PubMed, and Ichu-shi databases for articles up to April 2023" — same
  - "(Volume 8, Issue 2, pages 395-407) by Yamada S, Shirai T, Inaba S, Inoue G, Torigoe M, and Fukuyama N" — same
- Verification: existence **V2** (page appears in Searches 1, 3, 5, 7, 13). Details and numbers **V1** (Search 3 summary only).
- Certainty / limitations / funding / COI: NOT retrieved — protocol registration (PROSPERO or other), inclusion criteria beyond "randomized controlled trials on saturated fat reduction", risk-of-bias tool, GRADE ratings, funding, COI.
- Notes on how it differs from Cochrane (what the output supports versus what it does not): (1) JMAJ's 13,532 participants are far fewer than Cochrane 2020's 53,758 (CV events) and 55,858 (all-cause mortality), which implies one or more very large trials were not included, but WHICH trials were included is not displayed (a Women's Health Initiative exclusion is a plausible but unverified explanation, V0). (2) Cochrane's headline benefit is on the composite "combined cardiovascular events", while JMAJ's displayed outcome list names cardiovascular mortality, all-cause mortality, MI and coronary artery events and does not mention a composite. (3) On mortality both reviews report no significant effect. So the displayed text does not show a direct contradiction on mortality; the difference lies in the composite endpoint and in how conclusions are framed. Why the JMAJ authors framed the conclusion differently was not retrieved.

### [S2-09] Commentary and press attached to the JMAJ review (existence only; stance unknown)
- Citation: "There Is More Than Meets the Label: Rethinking Saturated Fat and Cardiovascular Health", JMA Journal editorial. DOI 10.31662/jmaj.2025-0120 (in URL). PMC12095710; PubMed 40416005. Authors not displayed.
- Type / level: Level VII (editorial/commentary).
- Key results: none read. Title only.
- Snippets + URL: link title "There Is More Than Meets the Label: Rethinking Saturated Fat and Cardiovascular Health" — https://www.jmaj.jp/detail.php?id=10.31662%2Fjmaj.2025-0120 ; https://pubmed.ncbi.nlm.nih.gov/40416005/ ; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12095710/ (Searches 3 and 5)
- Verification: existence **V2** (Searches 3, 5). Content unknown.
- Press and social hits, SECONDARY, discovery only, none read: icns.es "Reducing saturated fat intake does not lower mortality" (https://www.icns.es/en/news/reducing_saturated_fats_does_not_reduce_mortality) ; People's Pharmacy "Rethinking Saturated Fat: Were Nutrition Experts Wrong?" (https://www.peoplespharmacy.com/articles/rethinking-saturated-fat-were-nutrition-experts-wrong) ; an X post from "CME INDIA" titled "Saturated Fat & Heart: Observations Say Yes, Trials Say No" (https://x.com/CMEINDIA1/status/1967204303560724553). These amplify the null result; none is a scholarly critique. A published letter or critique of the JMAJ paper was not specifically searched for and none surfaced.

### [S2-10] Other 2024-2026 reviews, registered trials and incidental link-title hits (existence only)
- 2024 umbrella review: "Effect of reducing saturated fat intake on cardiovascular disease in adults: an umbrella review" — PubMed https://pubmed.ncbi.nlm.nih.gov/38887252 ; PMC https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11180890/ (Search 13 link list). Level I (umbrella). Authors, date, findings not displayed. **V1**.
- Registered trial NCT05778656, "Cardiovascular Risk Prevention With a Mediterranean Dietary Pattern Reduced in Saturated Fat" — https://clinicaltrials.gov/study/NCT05778656 (link title; appeared in the link lists of Searches 1, 5, 7, 10, 12, 13, all the same page). Sponsor, design, comparator, size, status, and results NOT displayed. **V1**.
- Other registry/link titles seen, not examined: ClinicalTrials.gov NCT00000611 "Women's Health Initiative (WHI)" (Search 12); NCT02062424 "Diet and Prevention of Ischemic Heart Disease: a Translational Approach" (Searches 1, 12; relevance to this question unverified).
- PubMed 727035 "Low fat, low cholesterol diet in secondary prevention of coronary heart disease" (Search 12 link title; authors and year not displayed; my belief that this is the original Sydney Diet Heart Study report is V0).
- "A systematic review of the effect of dietary saturated and polyunsaturated fat on heart disease", Nutrition, Metabolism and Cardiovascular Diseases (https://www.nmcd-journal.com/article/S0939-4753(17)30237-5/abstract; Searches 10 and 14 link lists; authors, year and findings not displayed). **V1**, existence only.

### [S2-11] SECONDARY discovery hits (not relied on for any number)
- Zoe Harcombe, "Cochrane saturated fat reviews" (June 2020 post) — https://www.zoeharcombe.com/2020/06/cochrane-saturated-fat-reviews/ . A critic-blogger; not read. The Search 16 summary quotes a combined CV-events RR of 0.86 (95% CI 0.77 to 0.96) and says it "appears to be from the 2015 report"; I believe that figure belongs to the earlier CD002137 mega-review rather than to CD011737 (V0), so the attribution looks wrong.
- Celine Gounder Substack "Fact Check: Does Saturated Fat Really Cause Heart Disease?" (https://www.celinegounder.com/p/fact-check-does-saturated-fat-really) — link title only.
- Andeal.org (Academy of Nutrition and Dietetics Evidence Analysis Library) worksheet for the Hooper 2020 review (https://www.andeal.org/worksheet.cfm?worksheet_id=260318) and healthevidence.org "Evidence Summary" of the 2015 review (https://www.healthevidence.org/documents/byid/28821/Hooper2015_EvidenceSummary_ENv2.pdf) — appraisals/summaries not read; useful for risk-of-bias and critical-appraisal details in a re-run.

---

## B. Disagreements and discrepancies between sources

1. **Three different combined-CV-event estimates tied to "the Cochrane review".** 2015 abstract: RR 0.83, 95% CI 0.72 to 0.96, 13 comparisons, 53,300 (S2-01, V2). 2020 abstract: RR 0.83, 95% CI 0.70 to 0.98, 12 trials, 53,758 (S2-02, V2). Unattributed text: RR 0.79, 95% CI 0.66 to 0.93, 11 trials, 53,300 (S2-04; text exists V2; version unresolved). The seed in the task message ("RR 0.79 ... 11 trials, 53,300") is real text but is not the 2020 result. The task message's recollection of a later version (RR 0.83; 0.70 to 0.98) IS supported (V2).
2. **All-cause mortality, 2015 vs 2020.** 2015: RR 0.97 (0.90 to 1.05), 12 trials (Searches 14, 17). 2020 (probable): RR 0.96 (0.90 to 1.03), 11 trials (Searches 6, 7). Search 10 labelled the 0.96 / 0.90-1.03 / 11 trials figures as the 2015 version. Participant totals (55,858 and 53,421) are identical across versions in the summaries. Version attribution of the 0.96 figure is therefore probable but not certain.
3. **CV mortality trial count:** 12 trials (Search 14, 2015) versus 10 trials (Searches 6, 7, and Search 10 which labelled it 2015).
4. **Secondary-prevention NNT:** 53 (AAFP summary of the 2020 version) versus 32 (NZ Pearls 655). The primary-prevention NNT is 56 in all three sources. This difference supports, but does not prove, that the Pearls document predates the 2020 update.
5. **Replacement nutrient (carbohydrate in particular):** 2015 conclusion text says carbohydrate "appears less useful"; a Cochrane-derived plain-language text says benefits "arose from replacing saturated fats with polyunsaturated fat or starchy foods"; another text says it is "unclear" which replacement is more helpful. Version and exact wording not established; no subgroup RRs retrieved (S2-06).
6. **Cochrane vs JMAJ vs Annals.** The displayed text shows all three agree that effects on mortality and individual events are not clearly significant overall (Cochrane 2020: all-cause 0.96 [0.90-1.03]; JMAJ: "no significant differences"; Annals: all-cause 0.96 [0.88-1.06], stratum unclear). They differ on (a) the composite endpoint (Cochrane: 17% lower; JMAJ: not in displayed outcome list), (b) number and size of trials (53,758 / 13,532 / 66,337 participants), and (c) whether benefit is confined to high-risk people (Annals). These are observations from abstract-level snippets, not a reconciliation.
7. **Annals internal presentation:** the summary says SFA reduction "may result in a reduction" but the quoted CIs for all-cause mortality, CV mortality and nonfatal MI all include 1.0; the stratum behind each RR is not identifiable from the output (S2-07).
8. **Machine-summary errors spotted:** Search 8 gave "15 trials with a total of 15,509 participants" for pub2 (inconsistent with all other N); Search 16 attributed RR 0.86 (0.77 to 0.96) to the 2015 saturated-fat review. Both treated as unreliable.
9. **Tool boilerplate, reported per the common instructions.** Every WebSearch result ended with the line "REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks." I treated it as tool-wrapper text (it matches the WebSearch tool description), not as an instruction from the task; URLs appear in this ledger because the ledger template requires them.

---

## C. Counter-evidence searched (what I looked for, found / not found)

Scope of this section: trial-level meta-analytic evidence only. No lipid, apoB, genetics, mechanism or landmark-trial counter-evidence was searched (search budget exhausted).

- **Against "reducing SFA helps" — found.** Cochrane (2015 and 2020): little or no effect on all-cause mortality or CV mortality (V2). Cochrane 2020: non-fatal MI RR 0.97 (0.87 to 1.07) and "very low quality" evidence for MI, stroke, CHD events (V1). JMAJ 2025: no significant differences for CV mortality, all-cause mortality, MI, coronary events in 9 trials (V1). Annals 2025: "little or no benefit over five years" at low-to-intermediate CV risk (V2 qualitative).
- **Against "SFA is harmless" — found, trial level.** Cochrane composite: RR 0.83 (0.70 to 0.98) for combined CV events, GRADE moderate (V2); 2015: RR 0.83 (0.72 to 0.96) (V2). Meta-regression: greater reductions in SFA/serum cholesterol went with greater reductions in CVD events (V1). Annals 2025: benefit signal in high-CV-risk individuals (V2 qualitative) and PUFA replacement nonfatal MI RR 0.75 (0.58 to 0.99) (V1).
- **Comparators:** the Cochrane composite pools trials that replaced SFA with different nutrients or reduced SFA/total fat; the displayed text never gives a comparator-specific CV-event RR except the Annals PUFA-replacement MI figure. Treat all Cochrane figures as "reduced/modified SFA vs control, replacement nutrient mixed".
- **Searched for, not found:** a published response or critique of the JMAJ paper (not run as a dedicated query; the only hits were an editorial of unknown stance and press/social posts); a post-2020 Cochrane update (not run as a dedicated query; none surfaced).
- **Not searched at all:** the critique that composite CV endpoints are driven by softer events; critiques of multi-component or institutional trials; trans-fat contamination of margarines in trials; Sydney/Minnesota reanalyses; LDL-C causality critiques; Mendelian randomization; non-LDL pathways; Lp(a); LDL particle size.

---

## D. Leads (V0 — background knowledge, NOT verified this session, do NOT use as findings)

### D0. Seed check against the task message
| Seed | Status |
|---|---|
| Cochrane CD011737 combined CV events "RR 0.79 (0.66-0.93), 11 trials, 53,300" | Text exists; not the 2020 version (S2-04). Later-version "RR 0.83 (0.70-0.98)" supported, 12 trials, 53,758 (S2-02) |
| JMAJ 2025, 9 trials, 13,532, PMC12095860 | Supported (S2-08); V1 for the counts |
| One review searched to July 2025 | Found: Annals Dec 2025 (S2-07) |
| NCT05778656 | Exists, title only (S2-10) |
| Mensink 2003 AJCN; Mensink 2016 WHO review; Clarke 1997 BMJ; Hegsted/Keys equations | Not searched |
| "Chiu 2017 AJCN" | Not searched. My recollection is that the Chiu, Williams, Krauss very-high-SFA-diet LDL-particle RCT (2017) appeared in PLoS One, not AJCN; verify the journal |
| "Hamley 2017 BMJ" | Not searched. My recollection is Hamley 2017 appeared in Nutrition Journal, not BMJ; verify |
| Ramsden 2013 and 2016 (BMJ); Harcombe 2015 (Open Heart); LA VA; Finnish Mental Hospital; Oslo; MRC soya-oil; DART; WHI DM; PREDIMED; Lyon | Not searched (WHI registry title seen only) |
| EAS statements (Ference 2017; Borén 2020); Mozaffarian 2010 | Not searched |

### D1. Lipids and lipoproteins (task item 1) — all from memory
- Mensink, Zock, Kester, Katan 2003 (AJCN): meta-analysis of 60 controlled feeding trials of fatty acids and carbohydrate versus total:HDL ratio, LDL-C, HDL-C, triglycerides, apoA-I and apoB; isocaloric comparators. Verify the numbers per comparator.
- Mensink 2016, WHO-commissioned systematic review and regression analysis of SFA and serum lipids/lipoproteins. Verify.
- Clarke et al. 1997 (BMJ): metabolic-ward meta-analysis of dietary lipids and blood cholesterol. Keys (1950s-60s) and Hegsted (1965) prediction equations. Verify before quoting any coefficient.
- Krauss group work on LDL particle size/number after SFA, including Chiu 2017; individual variability ("hyper-responders", baseline LDL phenotype, APOE genotype). Lp(a) response to SFA replacement: I have no reliable recollection; needs searching.
- First-pass queries (extended): `"60 controlled trials" Mensink 2003 total to HDL cholesterol ratio fatty acids apolipoprotein B`; `Mensink WHO 2016 saturated fatty acids serum lipids lipoproteins regression analysis apoB`; `Clarke 1997 "metabolic ward" dietary lipids blood cholesterol meta-analysis`; `Chiu Krauss very high saturated fat diet LDL particle size randomized`; `saturated fat apolipoprotein B Lp(a) randomized feeding trial replacement carbohydrate MUFA PUFA`.

### D2. Cochrane details still to retrieve (task item 2)
- Summary-of-findings tables appear as separate PMC pages in link lists (PMC8092457 "CD011737 tbl 0001" and "tblf 0002"; PMC7388853 table-wrap8); a query that targets those tables may return the GRADE ratings. Needed: "What's new" or history text; risk-of-bias summary; subgroup RRs for PUFA / MUFA / carbohydrate / protein replacement; stroke, CHD-events, angina numbers; funding (my recollection: the 2020 update was linked to WHO guideline work; unverified); whether any update after 2020 exists.
- First-pass queries (extended): `Cochrane CD011737 pub3 "summary of findings" combined cardiovascular events GRADE risk of bias`; `Hooper 2020 saturated fat Cochrane "replacement" polyunsaturated carbohydrate subgroup risk ratio cardiovascular events`; `Cochrane CD011737 "What's new" 2020 update new trials included`.

### D3. Landmark trials and reanalyses (task item 4) — all from memory; each needs searching
- Sydney Diet Heart Study (Ramsden 2013 BMJ recovered-data reanalysis; safflower-oil margarine replacing SFA; trans fat in the margarine not measured), Minnesota Coronary Experiment (Ramsden 2016 BMJ; institutionalised population, corn-oil diet), Hamley meta-analysis of n-6 PUFA replacement (verify journal), Harcombe 2015 Open Heart (pre-1983 RCTs), Los Angeles Veterans Administration trial, Finnish Mental Hospital study (cluster cross-over, non-randomised), Oslo Diet-Heart, MRC soya-oil trial, DART (Burr 1989), Women's Health Initiative Dietary Modification trial (low-fat pattern, not SFA-specific), PREDIMED (published 2013, retracted and republished 2018), Lyon Diet Heart (multi-component).
- For each, what to extract: diet change (SFA/PUFA/trans/total fat), outcome RR or HR with CI, population (institutional, post-MI), adherence, trans-fat exposure, multi-component confounding.
- First-pass queries (extended): `Ramsden 2013 BMJ Sydney Diet Heart Study recovered data linoleic acid hazard ratio all-cause mortality`; `Ramsden 2016 BMJ Minnesota Coronary Experiment recovered data serum cholesterol mortality`; `Hamley 2017 replacing saturated fat with n-6 polyunsaturated fat coronary heart disease meta-analysis randomised`; `Harcombe 2015 Open Heart randomised controlled trials dietary fat guidelines 1977 1983`; `PREDIMED 2018 retraction republished Estruch hazard ratio`.

### D4. LDL-C / apoB causality (task item 5) — from memory
- EAS consensus statements: Ference et al. 2017 (Eur Heart J) and Borén et al. 2020 (Eur Heart J); Cholesterol Treatment Trialists' meta-analyses of statin trials; Mendelian-randomization work by Ference and colleagues; PCSK9 and ezetimibe outcome trials; apoB-versus-LDL-C discordance literature (e.g., Sniderman). Critiques: Ravnskov and colleagues (e.g., an Expert Review of Clinical Pharmacology paper arguing LDL-C is not causal) and low-LDL-C/mortality-in-the-elderly analyses. All V0; authors and years need confirmation.
- First-pass queries: `EAS consensus statement "Low-density lipoproteins cause atherosclerotic cardiovascular disease" Ference 2017 Borén 2020 genetic evidence`; `Ravnskov LDL-C does not cause cardiovascular disease critique rebuttal`; `Mendelian randomization LDL apoB lifetime exposure coronary heart disease risk per mmol/L`.

### D5. Pathways other than LDL (task item 6) — from memory
- Candidates to search: inflammation markers after SFA vs unsaturated fat feeding; endothelial function (flow-mediated dilation; DIVAS trial); thrombosis/haemostasis (factor VII, PAI-1); glycaemia and insulin sensitivity (KANWU, LIPGENE); liver and visceral fat (Rosqvist 2014); postprandial lipaemia. Several belong to the non-CVD streams. Nothing verified.

### D6. Pooled trial-based substitution estimates (task item 7) — from memory
- Mozaffarian, Micha, Wallace 2010 (PLoS Medicine): meta-analysis of 8 RCTs replacing SFA with PUFA; recalled as roughly a 10% lower CHD event risk per 5% of energy substituted. Numbers unverified. Cohort-based substitution analyses (Jakobsen, Li, Zhu) belong to the cohort stream.
- First-pass query: `Mozaffarian 2010 PLoS Medicine "polyunsaturated fat in place of saturated fat" randomized controlled trials 5% energy coronary heart disease`.

### D7. JMAJ and Annals follow-ups (task item 3)
- JMAJ: find PROSPERO or other registration; included-trial list; effect estimates; GRADE; COI; the editorial's argument; any letters. Queries: `Yamada Shirai Inaba Inoue Torigoe Fukuyama saturated fat restriction meta-analysis registered PROSPERO`; `"Saturated Fat Restriction for Cardiovascular Disease Prevention" JMA Journal risk ratio 95% CI cardiovascular mortality certainty of evidence`.
- Annals: find the abstract's full results by risk stratum, risk-of-bias findings, SFA reduction achieved, LDL-C change, and the editorials/responses (Science Media Centre page, "From Avoidance to a Nuanced Recommendation"). Queries: `Steen Annals of Internal Medicine 2025 saturated fat risk stratified "high cardiovascular risk" risk ratio all-cause mortality`; `expert reaction systematic review saturated fat intake cardiovascular disease events Science Media Centre Annals`.
- NCT05778656: `NCT05778656 Mediterranean dietary pattern reduced in saturated fat sponsor design enrollment primary outcome`.

---

## E. Search log (query | mode | useful Y/N)

| # | Query (shortened) | Mode | Useful |
|---|---|---|---|
| 1 | "Reduction in saturated fat intake for cardiovascular disease" Hooper 2020 Cochrane RR 95% CI combined CV events | extended | Y (2020 numbers; Annals/JMAJ/NCT hits) |
| 2 | same title, Cochrane 2015 Hooper, CV events RR 0.83, all-cause mortality | extended | Y (2015 numbers) |
| 3 | "Saturated Fat Restriction for Cardiovascular Disease Prevention" SR/MA RCTs JMAJ 2025 | extended | Y (JMAJ basics, editorial) |
| 4 | "Effect of Interventions Aimed at Reducing or Modifying Saturated Fat Intake on Cholesterol, Mortality, and Major Cardiovascular Events" Annals | extended | Y (Annals 2025 review) |
| 5 | Cochrane Hooper 2020 CD011737.pub3 OR pub2 "12 trials" 53,758 RR 0.83 0.70 to 0.98 | extended | Y (confirms 2020; NNT) |
| 6 | saturated fat CV events "RR 0.79" "0.66 to 0.93" 11 trials 53,300 | extended | Y (text exists; attribution unclear) |
| 7 | Hooper Cochrane 2020 all-cause mortality, CV mortality, CHD, non-fatal MI, stroke | extended | Y (2020 mortality and component numbers) |
| 8 | Cochrane CD011737 pub2 pub3 correction update 2020 changes | standard | Y (version history; one bad figure) |
| 9 | "reduced the risk of combined cardiovascular events by 21%" Cochrane | extended | partial (repeats 0.79 text) |
| 10 | Hooper 2015 "15 randomised controlled trials" participants 24 months conclusions | extended | partial (mixes versions) |
| 11 | Cochrane Pearls reducing saturated fat Hooper 2020 meta-regression replacement | standard | partial (replacement and meta-regression text) |
| 12 | Hooper Martin Jimoh Kirk Foster Abdelhamid 2020 PubMed 32428300 abstract | extended | Y (authors, May 2020, 12 trials) |
| 13 | AAFP Cochrane for Clinicians 2022 combined CV events NNT | extended | Y (4,538 events; NNT 56 / 53; 2024 umbrella review hit) |
| 14 | "Cochrane Corner" Heart 2015 Hooper | extended | Y (2015 mortality and MI numbers) |
| 15 | NZ Cochrane Pearls 655 "RR 0.79" 21% | standard | Y (ties 0.79 text to Pearls PDF) |
| 16 | Zoe Harcombe Cochrane saturated fat reviews 2015 vs 2020 | extended | N (secondary; likely misattributed figure) |
| 17 | Cochrane 2015 Hooper "RR 0.97" "0.90 to 1.05" "55,858" "12 trials" | extended | Y (confirms 2015 all-cause mortality) |
| — | WebFetch www.jmaj.jp detail page | WebFetch | N — EGRESS_BLOCKED; WebFetch not used again |
| — | Query on 2015 erratum / "21% vs 17%" | extended | NOT RUN — session cap (200 of 200) |
| — | Query on Cochrane 2020 "What's new" | extended | NOT RUN — session cap (200 of 200) |

End of ledger (partial: task items 1, 4, 5, 6, 7 unsearched because the session search budget was exhausted).
