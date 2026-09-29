# W8 · Coordinator supplement (searches run from the main thread after the subagent search pool was exhausted)

| Field | Value |
|---|---|
| Purpose | Fill the largest evidence gaps left when the seven workstream agents hit the session's shared 200-search cap: SQ1 baseline numbers, reference-class classes RC1, RC2, RC3, RC5 and RC6, and several ageing-biology and human-evidence cards |
| Date (`last_searched_at`) | 2026-09-29 for every query |
| Who searched | The coordinator (main thread, the same model instance that drafts the report). **This is not an independent check**: it cannot serve as the second-agent re-verification that Blueprint ladder v3 requires for load-bearing figures |
| Tool | WebSearch only; the main thread's calls were still accepted after the subagents' were refused. No workaround was used; the cap message told the subagents that only the user can raise `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` |
| Protocol | Ladder v3 (`../phase1_scoping/02_methodology_blueprint.md`). **All figures are summary-mediated**: each comes from a model-written search summary plus a link list, none from primary text |
| Leading queries | Q-12, Q-15 and Q-24 contained a figure taken from the coordinator's memory; the summary's echo of that figure is *not* counted as corroboration (marked "leading") |
| Phase 5 correction (after the claims audit) | Q-06 ("about 8 years"), Q-08 ("about 1 to 2 percent"), Q-23 ("1.5 percent per year") and Q-38 ("about 90 percent") also carried the figure they were meant to confirm and were not marked. They are now marked leading; the affected figures (W8-01, W8-02, W8-03, W8-16) are not independently corroborated |
| Phase 5 revision 2 (after the claims re-audit) | Q-29 (limit ages "65 70 75 85") and Q-36 ("9 men") also carried figures and are now marked leading; the affected details (the RC1 limit ages in W8-06; the count of nine in W8-23) are not independently corroborated |
| Levels reached | No card reaches figure-level V3 (each traces to one authorship origin or one query). V2 = existence at a primary source plus one attributing sentence; V1 = secondary only |

## Search log

| ID | Verbatim query (abridged only by the trailing quotation marks) | Notes |
|---|---|---|
| Q-01 | longevity escape velocity 2026 | orientation; not carded |
| Q-02 | Aubrey de Grey LEV Foundation robust mouse rejuvenation RMR2 results | orientation; not carded |
| Q-03 | Olshansky 2024 Nature Aging implausibility of radical life extension humans twenty-first century | orientation (W1-06 covers) |
| Q-04 | partial epigenetic reprogramming first human clinical trial 2026 Life Biosciences ER-100 | orientation (W4, W5 cover) |
| Q-05 | Oeppen Vaupel 2002 broken limits to life expectancy best-practice life expectancy | links: science.org, PubMed, ResearchGate, Semantic Scholar |
| Q-06 | Gompertz law mortality rate doubling time humans about 8 years adult mortality | **leading** ("about 8 years"; marked in Phase 5); links: PMC, Frontiers, PLOS ONE, Wikipedia |
| Q-07 | Debonneuil Loisel Planchet 2018 actuarial escape velocity longevity escape velocity mortality improvement rate needed | links: HAL, IDEAS/RePEc, ResearchGate, Wikipedia |
| Q-08 | annual rate of mortality decline at ages 65 to 85 developed countries about 1 to 2 percent per year mortality improvement older ages | **leading** ("about 1 to 2 percent"; marked in Phase 5); links: NBER, National Academies Press, PMC, Our World in Data |
| Q-09 | life expectancy at age 65 in 2019 Japan France Spain Switzerland South Korea Italy years OECD Health at a Glance | the tool ran four internal search rounds; links: OECD, MHLW Japan, CDC |
| Q-10 | Baker 2016 Nature clearance of p16Ink4a-positive senescent cells delays ageing-associated disorders median lifespan extension percent | links: nature.com (2011 paper), USPTO patents, Mayo |
| Q-11 | Xu 2018 Nature Medicine senolytics improve physical function and increase lifespan in old age dasatinib quercetin remaining lifespan | links: nature.com, PMC, eBioMedicine |
| Q-12 | Xu 2018 senolytics mice 36% higher average post-treatment remaining lifespan hazard of mortality dasatinib quercetin very old mice | **leading** (36%); links: PMC6082705, ScienceDaily/NIH, Sci.News |
| Q-13 | Naturally occurring p16Ink4a-positive cells shorten healthy lifespan Baker 2016 Nature INK-ATTAC median lifespan 24% 27% | **leading** (24%, 27%); links: nature.com/articles/nature16932, PubMed 26840489 |
| Q-14 | leading causes of death adults 85 and older Alzheimer's disease heart disease cancer percent of deaths CDC NCHS | links: news coverage of NCHS, USAFacts, CDC |
| Q-15 | lecanemab CLARITY-AD 27% slowing decline CDR-SB 18 months; donanemab TRAILBLAZER-ALZ 2 35% slowing | **leading**; links: PMC reviews, Wiley, eNeuro |
| Q-16 | rhesus monkey caloric restriction survival NIA Mattison 2017 no survival benefit Wisconsin Colman 2009 reduced age-related mortality | links: nature.com (two Nat Commun papers), PubMed, news.wisc.edu, NIA |
| Q-17 | clinical development success rates phase I to approval likelihood of approval percent BIO Informa QLS 2011-2020 report | links: bio.org, CPHI, Frontiers |
| Q-18 | Wong Siah Lo 2019 Biostatistics estimation of clinical trial success rates and related parameters overall probability of success | links: Oxford Academic, medRxiv, NBER, PMC corrigendum |
| Q-19 | US AIDS deaths decline 1995 to 1997 highly active antiretroviral therapy percent decrease in HIV death rate | links: NEJM, PubMed, CDC MMWR, Healthline |
| Q-20 | Ford 2007 New England Journal of Medicine explaining the decrease in US deaths from coronary disease 1980-2000 treatments and risk factor changes percent | links: NEJM, PubMed, Minnesota |
| Q-21 | Tetlock Expert Political Judgment accuracy of expert forecasts compared with chance and simple extrapolation | links: Princeton UP, Penn, JSTOR, Wikipedia |
| Q-22 | Rau Soroko Jasilionis Vaupel 2008 continued reductions in mortality at advanced ages Population and Development Review annual rate of decline | links: ResearchGate, IDEAS, arXiv |
| Q-23 | actuarial long-term mortality improvement assumption 1.5 percent per year CMI model ultimate rate of mortality improvement | **leading** ("1.5 percent"; marked in Phase 5); links: Institute and Faculty of Actuaries CMI pages, WTW, Isio |
| Q-24 | adult human mortality rate increases exponentially with age Gompertz slope about 0.085 per year doubling every 8 years | **leading**; links: PMC, eLife, PLOS ONE, GitHub |
| Q-25 | life expectancy at age 65 United States 2019 years National Center for Health Statistics both sexes | links: CDC NCHS reports; no figure returned |
| Q-26 | Actuarial escape velocity Debonneuil abstract "life extension velocity" sustained mortality improvements 4% longevity escape velocity insurance mathematics economics | **leading** (4%); links: ResearchGate, Wikipedia, PLOS Biology, ScienceDirect |
| Q-27 | PEARL trial low-dose rapamycin healthy older adults results safety visceral fat lean mass 48 weeks Aging 2025 | links: PMC, aging-us.com, medRxiv, EurekAlert |
| Q-28 | senolytic dasatinib quercetin pilot trial older adults results outcomes cognition mobility eBioMedicine 2025 participants | links: Lancet eBioMedicine, EurekAlert, Fight Aging |
| Q-29 | Oeppen Vaupel broken limits predicted maximum life expectancy 65 70 75 85 years earlier forecasts exceeded table of proposed limits | **leading** (limit ages "65 70 75 85"; marked in Phase 5 revision 2); two internal rounds; links: Science, Oxford Ageing PDF, SSA, OWID |
| Q-30 | official life expectancy forecasts underestimated actual gains United Nations national statistical offices forecast accuracy record life expectancy | links: SSA Social Security Bulletin, PNAS, PMC |
| Q-31 | resveratrol sirtuin activators GSK Sirtris clinical trials failed to show anti-aging effect history | links: MIT Technology Review, Pharmafile, Science blog, New Republic |
| Q-32 | expert survey biogerontologists demographers actuaries future life expectancy 2050 opinions survey results radical life extension | links: PMC, PNAS, Taylor and Francis, Wikipedia |
| Q-33 | annual percent decline in age-specific death rates ages 65-74 75-84 85 and older United States 2000 to 2019 age-adjusted death rate decline per year | links: CDC NCHS data briefs, Statista |
| Q-34 | Li 2018 Circulation impact of healthy lifestyle factors on life expectancies US population five low-risk lifestyle factors additional years at age 50 women men | links: PubMed, AHA Journals, Erasmus |
| Q-35 | therapeutic plasma exchange older adults biological age epigenetic clocks trial Buck Institute Kennedy 2025 Aging Cell albumin IVIG | links: Wiley (Aging Cell), Buck Institute, Fight Aging |
| Q-36 | Fahy 2019 Aging Cell reversal of epigenetic aging and immunosenescent trends in humans thymus regeneration growth hormone DHEA metformin 9 men | **leading** ("9 men"; marked in Phase 5 revision 2); links: Wiley, PMC, Semantic Scholar |
| Q-37 | pig kidney xenotransplantation clinical trial 2026 United Therapeutics EXPAND FDA patients status survival | links: PMC, United Therapeutics IR, NYU Langone |
| Q-38 | childhood acute lymphoblastic leukemia five-year survival rate 1960s versus today about 90 percent improvement over decades | **leading** ("about 90 percent"; marked in Phase 5); links: Our World in Data, PMC |
| Q-39 | López-Otín 2023 Hallmarks of aging an expanding universe Cell twelve hallmarks disabled macroautophagy chronic inflammation dysbiosis | links: cell.com, PMC |

## Evidence cards

Card format is abbreviated: figures are as reported in the search output, unconverted. "Attr." quotes or paraphrases the attributing sentence (at most 25 words).

### W8-01 · Gompertz slope and mortality-rate doubling time (adults)
- **Level:** V2 [E2, F2] for existence; the figure is **not independently corroborated** (Phase 5: Q-06 also carried "about 8 years"). **Log:** Q-06 (leading); Q-24 (leading, not counted).
- **Attr.:** Q-06: adult human mortality "doubles about every 8 years" (Gompertz law; PMC and PLOS ONE pieces in the link list). Q-24 adds "0.07 to 0.09 per year" without a named source.
- **Sources listed:** PMC6206166 (Frontiers in Genetics, 2018); PLOS ONE 2014 (Gompertz-based life-expectancy estimates); eLife 2018 insight. Old-age deceleration after about age 80 is noted (PMC6386419).
- **Label:** [ESTABLISHED] for the roughly exponential rise of adult hazard; the exact slope is [SUPPORTED] (range 0.07-0.09, not a V3 input, so β stays a ranged parameter). **Use:** SQ1 baseline.

### W8-02 · Actuarial long-term mortality-improvement assumptions
- **Level:** V2 [E2, F2] for existence; the 1.5% figure is **not independently corroborated** (Phase 5: Q-23 carried "1.5 percent per year"). **Log:** Q-23 (leading).
- **Attr.:** the CMI model's illustrative long-term rate is 1.5% a year; market practice about 1.5% for funding and 1-1.25% for best estimate (Institute and Faculty of Actuaries, CMI FAQs; WTW).
- **Caveat:** these are assumptions set by users, "not based on data" (CMI wording in the output). **Label:** [SUPPORTED] as an assumption; not an observation. **Use:** SQ2 baseline range.

### W8-03 · Observed pace of mortality decline
- **Level:** V2 [E2, F2 each] for existence; the 1-2% figures are **not independently corroborated** (Phase 5: Q-08 carried "about 1 to 2 percent"). **Log:** Q-08 (leading).
- **Attr.:** NBER digest (2002): mortality rates fell at a fairly constant 1 to 2 percent per year since 1900, except 1955-1965. National Academies (2000): older-age rates in Western Europe fell about 1 percent a year in the 1980s-90s.
- **Caveat:** old sources; the first is an all-age figure. **Label:** [SUPPORTED]. **Use:** SQ2 baseline range (r_hist 1-2% per year).

### W8-04 · US death rates at 65 and over, and the post-2010 slowdown
- **Level:** V2 [E2, F2]. **Log:** Q-33.
- **Attr.:** NCHS data brief 395: 2018 to 2019 declines of 1.0% (65-74), 1.8% (75-84), 1.7% (85+); slowing of declines from about 2010 with stable or rising rates in some 65-74 groups. Statista (secondary): 5,144 per 100,000 in 2000 and 3,917 in 2019 for ages 65+ (crude; about 1.4% a year).
- **Label:** [SUPPORTED]. **Use:** SQ2 baseline; supports the deceleration reading.

### W8-05 · OECD life expectancy at 65
- **Level:** V2 [E2, F2]. **Log:** Q-09.
- **Attr.:** OECD Health at a Glance: on average across OECD countries in 2019, people aged 65 could expect 19.9 further years; women about 3.3 years more than men.
- **Not obtained:** country-level e(65) and the frontier ranking (protocol W1(g) unanswered); US e(65) (Q-25, no figure). **Use:** anchor for placeholder calibration (model e(65) about 19).

### W8-06 · Oeppen and Vaupel (2002) and the record of broken limits (RC1, existence class)
- **Level:** V2 [E2, F2]; the limit ages are **not independently corroborated** (Phase 5 revision 2: Q-29 carried "65 70 75 85"; Q-05 did not, but the card does not record which output named the limits). **Log:** Q-05, Q-29 (leading).
- **Attr.:** Science 296:1029-1031: best-practice (record) female life expectancy rose about 2.5 years per decade since 1840; every published limit broken, on average within about five years of publication. Limits named in the outputs: Dublin 1928 (under 65), Fries 1980 (85), Olshansky and Carnes 2001 (85; Olshansky et al. 1990 also cited).
- **Caveat:** a compiled list of failures, no denominator of all limit claims: an *existence class*, not a base rate. Best-practice life expectancy at birth is not an age-band hazard. **Label:** [ESTABLISHED] for the trend to 2000; [CONTESTED] for what it implies after 1990 (W1-06, W1-07).

### W8-07 · Official mortality projections under-predicted gains (RC1/RC5 context)
- **Level:** V2 [E2, F2]. **Log:** Q-30.
- **Attr.:** SSA Social Security Bulletin (2005) literature review: national statistical agencies, including Social Security, systematically under-predicted life-expectancy gains; UN projections for European and North American countries also did.
- **Caveat:** a 2005 review; recent accuracy differs (one output cites Lee-Carter under-estimating cohort life expectancy by 2.37 years, unattributed: not used). **Label:** [SUPPORTED].

### W8-08 · Debonneuil, Loisel and Planchet (2018): "Do actuaries believe in longevity deceleration?"
- **Level:** V2 [E2, F2]. **Log:** Q-07 (unled), Q-26 (leading, not counted).
- **Attr.:** Insurance: Mathematics and Economics 78:325-338. Per the abstract as summarised: sustained mortality improvements of 4% would also lead to LEV, but would need to start within a certain time to match announced probabilities; models include a "life extension velocity".
- **Unresolved:** the paper's LEV definition and age range were not seen. A 4% figure differs from the threshold of about 8% a year that the frozen model gives for D-N over ages 50-90. Two candidate explanations, both [SPECULATIVE] until the paper is read: LEV defined at very old ages, where population hazard decelerates (population-level threshold falls with age under frailty; tested in Phase 3), or a different definition. **Use:** SQ1 cross-check; flagged in the report.

### W8-09 · Rau, Soroko, Jasilionis and Vaupel (2008): mortality at advanced ages
- **Level:** V2 for existence only [E2, no figure]. **Log:** Q-22. Population and Development Review 34(4):747-768; Kannisto-Thatcher database, 30 mostly developed countries, death rates at 80+. No number retrieved. **Use:** pointer for the age-specific decline rates a full run should extract.

### W8-10 · Expert disagreement on future longevity
- **Level:** V2 [E2, F2]. **Log:** Q-32. **Attr.:** Society of Actuaries survey of 79 experts (Canada, Mexico, US): actuaries and economists projected lower mortality decline than demographers (North American Actuarial Journal, 1998).
- **Caveat:** 1998; a claim that biogerontologists predicted lifespans over three centuries for people born after 2100 came only from an encyclopaedia summary (V1; not used). **Use:** SQ3 forecast context.

### W8-11 · Expert forecast accuracy (RC5)
- **Level:** V2 [E2, F2]. **Log:** Q-21. **Attr.:** Tetlock's *Expert Political Judgment* (Princeton University Press): 284 experts, about 28,000 predictions, 1984-2003; forecasters only slightly better than chance and usually beaten by simple extrapolation, overconfident; fame inversely related to accuracy (secondary summaries).
- **Caveat:** political and economic forecasts, not biomedical timelines. **Label:** [SUPPORTED]. **Use:** SQ3, weight on any stated date.

### W8-12 · Sirtuin activators (RC2, existence class)
- **Level:** V1 [E1, F1]. **Log:** Q-31. **Attr.:** MIT Technology Review (2010), Pharmafile, Science blog, New Republic: GSK bought Sirtris for $270 million in 2008; a resveratrol formulation trial (SRT501) was suspended after kidney damage in 5 of 24 patients; a Pfizer study questioned SIRT1 activation; by 2011 one Sirtris compound remained in study.
- **Use:** an example of an anti-ageing programme that failed in the clinic; news and blog sources only, so a pointer, not a finding.

### W8-13 · Clinical-development success rate (RC3), second look
- **Level:** V2 [E2, F2]. **Log:** Q-17. **Attr.:** BIO/Informa/QLS (2021): likelihood of approval from Phase I 7.9% for all modalities; biologics 9.1%, new molecular entities 5.7%, vaccines 9.7%; 9,704 programmes, 2011-2020. Corroborates W5-27 (same origin).
- **Wong, Siah and Lo (2019):** existence at Oxford Academic (Q-18); the overall figure was not returned.

### W8-14 · HIV: step-change in a cause-specific death rate (RC6)
- **Level:** V2 [E2, F2]. **Log:** Q-19. **Attr.:** the US AIDS death rate fell 47% in 1997 (NCHS, via PubMed and press summaries); a cohort of advanced HIV patients (NEJM 1998) went from 29.4 deaths per 100 person-years in 1995 to 16.7 in 1996 and 8.8 by the second quarter of 1997.
- **Note:** a single-cause hazard ratio of about 0.3 in two years, in a small population, delivered to those with access. **Label:** [SUPPORTED]. **Pair:** RC3, RC4.

### W8-15 · Coronary heart disease mortality 1980-2000 (RC6)
- **Level:** V2 [E2, F2]. **Log:** Q-20. **Attr.:** Ford et al., NEJM 2007: US age-adjusted coronary death rate fell from 542.9 to 266.8 per 100,000 (men) and 263.3 to 134.4 (women), ages 25-84; roughly half attributed to treatments, half to risk-factor reductions.
- **Arithmetic (coordinator, not from the source):** about 3.4-3.6% a year log-rate over 20 years for one cause. **Label:** [SUPPORTED].

### W8-16 · Childhood leukaemia survival (RC6)
- **Level:** V2 [E2, F2] for existence; the 90-94% figure is **not independently corroborated** (Phase 5: Q-38 carried "about 90 percent"). **Log:** Q-38 (leading). **Attr.:** Our World in Data and PMC reviews: five-year survival of childhood acute lymphoblastic leukaemia about 14% (some sources under 10%) in the 1960s to about 90-94% in the 2010s.

### W8-17 · Healthy lifestyle and life expectancy at 50
- **Level:** V2 [E2, F2]. **Log:** Q-34. **Attr.:** Li et al., Circulation 2018;138:345-355: at age 50, women with five low-risk lifestyle factors had projected life expectancy 14.0 years (95% CI 11.8-16.2) longer than women with none; men 12.2 years (10.1-14.2).
- **Caveat:** observational, extreme-group contrast (five vs zero low-risk factors), a level effect. **Label:** [SUPPORTED].

### W8-18 · p16Ink4a-positive cell clearance in mice (Baker et al. 2016)
- **Level:** V2 [E2, F2]. **Log:** Q-10, Q-13 (leading, not counted). **Attr.:** Nature 2016 (nature.com/articles/nature16932; PubMed 26840489): clearing p16Ink4a-positive cells with INK-ATTAC from one year of age extended median lifespan in two genetic backgrounds; Q-10 gave "27% and 24%" from a patent-family or abstract source.
- **Stake:** authors and Mayo Clinic hold senolytic patents (patent documents appeared in the link lists). **Label:** [SUPPORTED] (single-lab, genetic model).

### W8-19 · Senolytic drugs in very old mice (Xu et al. 2018)
- **Level:** V2 [E2, F2]. **Log:** Q-11, Q-12 (leading for 36%). **Attr.:** Nature Medicine 2018 (PMC6082705): dasatinib plus quercetin every other week from 24-27 months gave 36% higher average post-treatment lifespan and a mortality hazard of 65% of control (NIH release, ScienceDaily, Sci.News).
- **Stake:** Mayo Clinic senolytic patents. **Label:** [SUPPORTED] (single lab). The 65% hazard figure was not in the query; the 36% was.

### W8-20 · Senolytics in humans (pilot)
- **Level:** V2 [E2, F2]. **Log:** Q-28. **Attr.:** eBioMedicine 2025: single-arm pilot, 12 older adults at risk of Alzheimer's disease, dasatinib 100 mg and quercetin 1250 mg for two days every two weeks for 12 weeks; no serious related adverse events; MoCA change +1.0 (95% CI -0.7 to 2.7), +2.0 in the lowest-baseline group.
- **Label:** [SUPPORTED] for feasibility and safety; nothing about mortality.

### W8-21 · PEARL trial of low-dose rapamycin (cross-reference W5-11)
- **Level:** V2 [E2, F2]. **Log:** Q-27. **Attr.:** Aging 17(4), April 2025: 114 participants aged 50-85, 48 weeks, placebo vs 5 mg vs 10 mg weekly; visceral fat unchanged; lean mass improved in women on 10 mg; adverse events similar across arms.

### W8-22 · Therapeutic plasma exchange and biological age
- **Level:** V2 [E2, F2]. **Log:** Q-35. **Attr.:** Aging Cell, May 2025 (Buck Institute and Circulate Health): biweekly exchange plus IVIG lowered biological age by 2.61 years across 36 epigenetic clocks, exchange alone by 1.32; one mild allergic reaction in 240 procedures.
- **Stake:** sponsor-affiliated authors and a company. **Label:** [SUPPORTED] for biomarker change only; no mortality or function outcome.

### W8-23 · TRIIM (thymus regeneration; Fahy et al. 2019)
- **Level:** V2 [E2, F2]. **Log:** Q-36 (leading for "9 men"; the "ten" is from the output). **Attr.:** Aging Cell 2019: nine to ten men aged 51-65, growth hormone with DHEA and metformin for one year; mean epigenetic age about 1.5 years below baseline; GrimAge about 2 years lower, persisting six months.
- **Caveat:** tiny uncontrolled cohort. **Label:** [SPECULATIVE] as evidence of rejuvenation.

### W8-24 · Xenotransplantation enters trials
- **Level:** V2 [E2, F2; sponsor claims V2-P]. **Log:** Q-37. **Attr.:** PMC reviews and NYU Langone: FDA cleared United Therapeutics' UKidney IND in February 2025; first EXPAND transplant on 3 November 2025; Phase 1/2/3 single-arm, about 6 then up to about 50 patients; one 2025 recipient's pig kidney worked a record 271 days before rejection and he received a human kidney in January 2026.
- **Label:** [SUPPORTED]; organ replacement is an early clinical programme, not an ageing-rate intervention.

### W8-25 · Anti-amyloid antibodies as a benchmark for neurodegeneration
- **Level:** V2 [E2, F2, leading query]. **Log:** Q-15. **Attr.:** PMC reviews: lecanemab (CLARITY-AD) slowed decline on CDR-SB by 27% at 18 months; donanemab (TRAILBLAZER-ALZ 2) 35-36%; reviewers describe roughly 25-35% relative slowing, "modest", durability uncertain.
- **Label:** [SUPPORTED]. **Use:** how hard the brain is: the best disease-modifying antibodies slow decline by a quarter to a third.

### W8-26 · Caloric restriction in rhesus monkeys
- **Level:** V2 [E2, F2]. **Log:** Q-16. **Attr.:** Colman et al. (Wisconsin) reported reduced age-related and all-cause mortality (Nature Communications 2014); the NIA study reported no significant survival effect (2012); a 2017 joint analysis (Mattison et al., Nature Communications) attributes differences to design, diet, and age at onset.
- **Label:** [CONTESTED] for effect on survival; a caution about translating animal lifespan effects.

### W8-27 · Causes of death at 85 and over (US)
- **Level:** V1 [E1, F1]. **Log:** Q-14. **Attr.:** news coverage of NCHS data: 2018 shares for ages 85+: heart disease 28.6%, cancer 11.7%, Alzheimer's disease 9.1%, stroke 7.3%; heart disease and cancer together over 39% in 2024.
- **Caveat:** news summary, and dementia coding is unreliable at old ages (a linked story says Alzheimer's deaths are under-reported). Pointer only.

### W8-28 · Hallmarks of ageing
- **Level:** V2 [E2, F2]. **Log:** Q-39. **Attr.:** López-Otín, Blasco, Partridge, Serrano, Kroemer, Cell 186:243-278 (2023): twelve hallmarks, five added to the original nine of 2013, including compromised autophagy, disturbed microbiome, and inflammation.

## Not cited (V0) and unresolved

- Country-level life expectancy at 65 and the frontier ranking; US e(65); Wong, Siah and Lo's headline success rate; age-specific decline rates by decade of age from the Human Mortality Database or the Kannisto-Thatcher data; the Debonneuil paper's LEV definition.
- Anything from the encyclopaedia or blog summaries not listed above.

## Limitations

- One agent (the coordinator) ran and logged these; nothing was re-run independently.
- The tool's summaries can be wrong or self-contradictory; several figures were the only ones given.
- Roughly 40 searches, about a fifth of the cap that the workstreams shared; more were not run, in respect of the cap.
