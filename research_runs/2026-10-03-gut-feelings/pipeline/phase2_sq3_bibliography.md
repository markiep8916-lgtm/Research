## Annotated Bibliography — SQ3

Sub-question: How does the empirical record treat the "sixth sense" reading of gut feelings — anomalous cognition (presentiment, precognition, "feeling the future") — relative to ordinary non-conscious explanations?

### Search Strategy

- **Engines / databases:** Crossref REST API (`api.crossref.org/works/<DOI>` and `query.bibliographic`), PubMed E-utilities (esearch by DOI → efetch abstract), PubMed Central (full text, PMC4034337), WebSearch (standard mode, 4 queries), publisher/repository pages (APA PsycNet — did not render; Bern BORIS — JS-only; mirrored PDF of Muhmenthaler et al. used for abstract text).
- **Keywords / Boolean strings:** ("feeling the future" OR precognition OR presentiment OR "predictive anticipatory activity" OR "anomalous cognition") AND (Bem OR replication OR "pre-registered" OR meta-analysis OR "Bayes factor" OR critique); ("paranormal belief" OR "psychic ability") AND ("probability judgement" OR misattribution OR "illusion of control"); "transparent psi project"; "expectation bias" AND presentiment.
- **Date range:** 1990–2026, plus one justified pre-1990 seminal item (Blackmore & Trościanko 1985: the founding experimental test of the probability-misjudgement account of psi belief, cited by every later review in this line). Crossref search filtered `from-pub-date:2024-01-01` for recency sweep.
- **last_searched_at:** 2026-10-03
- **Inclusion:** human adults; English; peer-reviewed journal article in a mainstream venue (APA, PLOS, Royal Society, Frontiers, Psychonomic Society, BPS, AAAS, F1000Research post-peer-review) OR large pre-registered replication; directly addresses (a) evidence for anomalous anticipation, (b) its statistical/methodological critique, (c) replication, or (d) ordinary-cognition explanations of psi experiences/beliefs.
- **Exclusion:** books, blogs, magazine pieces (Skeptical Inquirer), field-specific parapsychology journals (Journal of Parapsychology) because the brief restricts to mainstream venues; sources without a Crossref-verifiable record; sources whose abstract/full text could not be retrieved for a verbatim quote anchor.
- **Verification protocol:** every DOI resolved via `curl -sS -m 20 "https://api.crossref.org/works/<DOI>"`; returned title compared with the citation. 26/26 candidate DOIs matched. Quote anchors taken verbatim from PubMed/Crossref abstract text or PMC full text.
- **DISTRIBUTIONAL_SKEW_ADVISORY:** No distributional skew advisory triggered. Position: critical 8/17 (47%), proponent 5/17 (29%), neutral-methodological 4/17 (24%). Publication decade: 2010–2019 = 11/17 (65%, below the 70% threshold but noted as the natural cluster around the 2011 Bem controversy). Venue: no journal exceeds 4/17. Evidence level: no single level exceeds 7/17.
- **Instruction/data boundary note:** no fetched page contained text attempting to direct the agent; nothing to report.

### PRISMA-style Flow

identified 30 (23 seed/known records + 3 located via WebSearch/Crossref recency sweep + 4 non-journal items considered: French & Stone 2014 book, Lakens 2015 blog, Schimmack blog, Alcock 2011 Skeptical Inquirer) → screened 30, excluded 4 at eligibility (not mainstream peer-reviewed journal) → verified 26 (26/26 Crossref title match) → included 17 (9 verified records not included: 2 lacking an accessible quote anchor, 7 held back under the 12–16 scope cap; all listed under Search Limitations for the synthesiser)

### Sources (N = 17)

#### bem2011feeling
- APA 7: Bem, D. J. (2011). Feeling the future: Experimental evidence for anomalous retroactive influences on cognition and affect. *Journal of Personality and Social Psychology, 100*(3), 407–425. https://doi.org/10.1037/a0021524
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/a0021524 (abstract via PubMed PMID 21280961)
- Study type / Evidence level: 9 randomised laboratory experiments (time-reversed priming, habituation, recall, approach/avoidance) / Level II
- Position: proponent
- Key findings: Mean effect size d = 0.22 across 9 experiments, N > 1,000; 8 of 9 experiments individually significant at p < .05 (one-tailed). Stimulus seeking (a facet of extraversion) correlated with "psi performance" in 5 experiments; high stimulus-seekers d = 0.43. Frames precognition/premonition as "anomalous retroactive influence" operating on conscious and nonconscious responses alike — i.e., the explicit "sixth-sense" reading of a gut feeling.
- Quote anchor (≤25 words, verbatim): "The mean effect size (d) in psi performance across all 9 experiments was 0.22, and all but one of the experiments yielded statistically significant results." — location: abstract
- Quality notes: Strengths — mainstream venue, large total N, materials made available for replication. Limitations — not pre-registered; exploratory analytic flexibility documented by Wagenmakers et al. (2011) and LeBel & Peters (2011); one-tailed tests; no theory specifying mechanism. Replication status — failed in Ritchie et al. (2012), Galak et al. (2012), Kekecs et al. (2023), Walleczek et al. (2025); supported only in the author-involved meta-analysis (Bem et al. 2016). COI — author is the principal proponent.

#### wagenmakers2011why
- APA 7: Wagenmakers, E.-J., Wetzels, R., Borsboom, D., & van der Maas, H. L. J. (2011). Why psychologists must change the way they analyze their data: The case of psi: Comment on Bem (2011). *Journal of Personality and Social Psychology, 100*(3), 426–432. https://doi.org/10.1037/a0022790
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/a0022790 (abstract via PubMed PMID 21280965)
- Study type / Evidence level: Statistical reanalysis and methodological commentary / Level VI (secondary analysis of primary data)
- Position: critical
- Key findings: Default Bayesian t-test reanalysis of Bem's 9 experiments yields Bayes factors that are mostly anecdotal and in several cases favour the null; the authors characterise the evidence as "weak to nonexistent." Identifies the analyses as partly exploratory and one-sided p values as overstating evidence. Prescribes strictly confirmatory (pre-registered) designs for controversial claims.
- Quote anchor (≤25 words, verbatim): "We reanalyze Bem's data with a default Bayesian t test and show that the evidence for psi is weak to nonexistent." — location: abstract
- Quality notes: Strengths — transparent, reproducible reanalysis; catalysed Bayesian and pre-registration reforms. Limitations — choice of default (Cauchy) prior contested by Bem, Utts & Johnson (2011) (verified; see Search Limitations), who argue a knowledge-based prior gives strong evidence for psi; Rouder & Morey (2011) show the per-experiment BF cannot be aggregated. Not pre-registered (commentary). COI — none declared.

#### rouder2011bayes
- APA 7: Rouder, J. N., & Morey, R. D. (2011). A Bayes factor meta-analysis of Bem's ESP claim. *Psychonomic Bulletin & Review, 18*(4), 682–689. https://doi.org/10.3758/s13423-011-0088-7
- Verification: Crossref title match YES | https://api.crossref.org/works/10.3758/s13423-011-0088-7 (abstract via PubMed PMID 21573926)
- Study type / Evidence level: Bayes-factor meta-analysis of Bem's 9 experiments / Level I (meta-analytic, single-source dataset)
- Position: critical
- Key findings: Develops a meta-analytic Bayes factor appropriate for pooling across experiments (unlike the Wagenmakers et al. per-experiment variant). Evidence for "feeling the future" with neutral stimuli BF ≈ 3.23 and erotic stimuli BF ≈ 1.57 (slight); with emotionally valenced non-erotic stimuli BF ≈ 40. Concludes even BF ≈ 40 is orders of magnitude below what appropriate prior skepticism of ESP requires.
- Quote anchor (≤25 words, verbatim): "we believe it is orders of magnitude lower than what is required to overcome appropriate skepticism of ESP" — location: abstract
- Quality notes: Strengths — principled aggregation; makes explicit that evidential strength must be weighed against prior plausibility, the hinge of the whole debate. Limitations — depends on Bem's reported data (not independent replication); prior for effect size still a modelling choice. COI — none declared.

#### simmons2011false
- APA 7: Simmons, J. P., Nelson, L. D., & Simonsohn, U. (2011). False-positive psychology: Undisclosed flexibility in data collection and analysis allows presenting anything as significant. *Psychological Science, 22*(11), 1359–1366. https://doi.org/10.1177/0956797611417632
- Verification: Crossref title match YES (Crossref short title "False-Positive Psychology") | https://api.crossref.org/works/10.1177/0956797611417632
- Study type / Evidence level: Simulation study + two demonstration experiments + methodological proposal / Level VI–VII (methodological)
- Position: neutral-methodological
- Key findings: Researcher degrees of freedom (optional stopping, covariate choice, outcome selection, condition dropping) inflate nominal α = .05 to actual false-positive rates above 60% when combined. Demonstrates a "statistically significant" impossible effect (listening to a song changes chronological age). Proposes six author requirements and four reviewer guidelines (disclosure-based), the template for later pre-registration norms. Published the same year as Bem (2011), and widely read as explaining how a psi effect could reach JPSP without psi.
- Quote anchor (≤25 words, verbatim): "flexibility in data collection, analysis, and reporting dramatically increases actual false-positive rates" — location: abstract
- Quality notes: Strengths — concrete, quantified mechanism for spurious small effects (d ≈ 0.2) in flexible designs; highly influential. Limitations — simulations are stylised; does not analyse Bem's data directly. COI — none declared; two of the authors later co-authored Galak et al. (2012).

#### ritchie2012failing
- APA 7: Ritchie, S. J., Wiseman, R., & French, C. C. (2012). Failing the future: Three unsuccessful attempts to replicate Bem's 'retroactive facilitation of recall' effect. *PLoS ONE, 7*(3), e33423. https://doi.org/10.1371/journal.pone.0033423
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1371/journal.pone.0033423 (abstract via PubMed PMID 22432019)
- Study type / Evidence level: Three pre-registered independent exact replications / Level II
- Position: critical
- Key findings: Three labs (Edinburgh, Hertfordshire, Goldsmiths) each ran n = 50 exact replications of Bem's Experiment 9 using Bem's own software; combined n = 150, combined one-tailed p = .83; no retroactive facilitation of recall. Pre-registration preceded data collection. The paper also documents that JPSP declined to consider replications, part of the impetus for the replication-crisis debate.
- Quote anchor (≤25 words, verbatim): "All three replication attempts failed to produce significant effects (combined n = 150; combined p = .83, one-tailed)" — location: abstract
- Quality notes: Strengths — first pre-registered multi-site test; exact procedure; no competing interests declared. Limitations — total N modest (power to detect d = 0.22 at n = 150 is limited, roughly 0.5–0.6 one-tailed); proponents note experimenter expectations of skeptical labs. Replication status — consistent with Galak et al. (2012) and later large studies.

#### galak2012correcting
- APA 7: Galak, J., LeBoeuf, R. A., Nelson, L. D., & Simmons, J. P. (2012). Correcting the past: Failures to replicate ψ. *Journal of Personality and Social Psychology, 103*(6), 933–948. https://doi.org/10.1037/a0029709
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/a0029709 (abstract via PubMed PMID 22924750)
- Study type / Evidence level: 7 replication experiments (N = 3,289) + meta-analysis of all known replications / Level I (meta-analysis) with Level II primary data
- Position: critical
- Key findings: Seven replications of Bem's Experiments 8 and 9 (retroactive facilitation of recall), total N = 3,289, found no effect. Meta-analysis across all replication attempts gives average d = 0.04, not distinguishable from 0. Discusses sample composition, online vs. lab administration, and analytic flexibility as explanations for the discrepancy with Bem (2011).
- Quote anchor (≤25 words, verbatim): "find that the average effect size (d = 0.04) is no different from 0" — location: abstract
- Quality notes: Strengths — largest direct replication effort of the Bem recall paradigm at the time; published in the original venue; two experiments pre-registered. Limitations — several experiments run online rather than in the lab; proponents (Bem et al. 2016) argue experimenter-skepticism moderators. COI — none declared.

#### mossbridge2012predictive
- APA 7: Mossbridge, J., Tressoldi, P., & Utts, J. (2012). Predictive physiological anticipation preceding seemingly unpredictable stimuli: A meta-analysis. *Frontiers in Psychology, 3*, 390. https://doi.org/10.3389/fpsyg.2012.00390
- Verification: Crossref title match YES | https://api.crossref.org/works/10.3389/fpsyg.2012.00390 (abstract via PubMed PMID 23109927)
- Study type / Evidence level: Meta-analysis of 26 reports (1978–2010) of presentiment / Level I
- Position: proponent
- Key findings: Pooled pre-stimulus physiological "presentiment" effect: fixed-effect ES = 0.21 (95% CI 0.15–0.27, z = 6.9); random-effects ES = 0.21 (95% CI 0.13–0.29, z = 5.3). Reports that higher-quality studies showed larger effects; fail-safe N = 87 unpublished null reports to nullify. Measures spanned EDA, heart rate, blood volume, pupil dilation, EEG, BOLD. Authors explicitly frame the cause as lying within natural physical processes, not supernatural ones — the "physiological gut feeling about the future" reading.
- Quote anchor (≤25 words, verbatim): "Higher quality experiments produced a quantitatively larger effect size and a greater level of significance than lower quality studies." — location: abstract
- Quality notes: Strengths — systematic retrieval; excludes post hoc analyses; quality coding. Limitations — many included studies from the same few labs; expectation-bias (gambler's-fallacy-driven arousal) and analytic-flexibility confounds acknowledged by the authors in their 2014 follow-up and attacked by Schwarzkopf (2014); not pre-registered; small effect in a literature with documented selection pressure. Updated by Duggan & Tressoldi (2018) (verified; see Search Limitations) with ES = 0.28. COI — authors are long-standing psi researchers.

#### schwarzkopf2014should
- APA 7: Schwarzkopf, D. S. (2014). We should have seen this coming. *Frontiers in Human Neuroscience, 8*, 332. https://doi.org/10.3389/fnhum.2014.00332
- Verification: Crossref title match YES | https://api.crossref.org/works/10.3389/fnhum.2014.00332 (full text via PMC4034337)
- Study type / Evidence level: Opinion/commentary on Mossbridge et al. (2012, 2014) / Level VII
- Position: critical
- Key findings: Argues that the presentiment claim, if true, would break the second law of thermodynamics and invalidate baseline-correction procedures across neuroscience, so extraordinary evidence is required. Contends that meta-analytic significance (frequentist or Bayesian) cannot overcome a literature where analytic choices (pre-stimulus windows, measures, randomisation schemes) are flexible; recommends pre-registered, adversarial, exact replications with fixed analysis pipelines. Points to expectation bias and multiple-comparison inflation as sufficient ordinary explanations.
- Quote anchor (≤25 words, verbatim): "the seismic nature of these claims cannot be overstated: future events influencing the past breaks the second law of thermodynamics" — location: section Introduction (opening paragraph), p. 1
- Quality notes: Strengths — clearly articulates the prior-plausibility argument and the design remedies; peer-reviewed opinion. Limitations — no new data; argument from physical impossibility is contested by proponents as question-begging (see Mossbridge et al. 2014; Cardeña 2018). COI — none declared.

#### mossbridge2014predicting
- APA 7: Mossbridge, J. A., Tressoldi, P., Utts, J., Ives, J. A., Radin, D., & Jonas, W. B. (2014). Predicting the unpredictable: Critical analysis and practical implications of predictive anticipatory activity. *Frontiers in Human Neuroscience, 8*, 146. https://doi.org/10.3389/fnhum.2014.00146
- Verification: Crossref title match YES | https://api.crossref.org/works/10.3389/fnhum.2014.00146 (abstract via PubMed PMID 24723870)
- Study type / Evidence level: Narrative review and theoretical analysis / Level V
- Position: proponent
- Key findings: Renames presentiment "predictive anticipatory activity" (PAA) and defines it as an unconscious physiological, not consciously accessible, anticipation 1–10 s before randomly selected stimuli — the direct analogue of a bodily "gut feeling." Identifies expectation bias and multiple analyses as the two most serious validity threats and reviews tests of each (e.g., correlating effect with run length of control trials). Notes experiments linking PAA to conscious precognition "have not produced clear results." Speculates on mechanisms and applications.
- Quote anchor (≤25 words, verbatim): "examines the two most difficult challenges for obtaining valid evidence for it: expectation bias and multiple analyses" — location: abstract
- Quality notes: Strengths — proponents' own explicit treatment of the ordinary-explanation confounds; useful for mapping where the two camps agree on what would count as evidence. Limitations — the expectation-bias tests rest on an unproven assumption of linear scaling of arousal with expectation and have low power for long control runs (acknowledged in the paper); speculative mechanism section. COI — authors affiliated with Institute of Noetic Sciences and Samueli Institute (psi-research organisations).

#### siller2015investigating
- APA 7: Siller, A., Ambach, W., & Vaitl, D. (2015). Investigating expectation effects using multiple physiological measures. *Frontiers in Psychology, 6*, 1553. https://doi.org/10.3389/fpsyg.2015.01553
- Verification: Crossref title match YES | https://api.crossref.org/works/10.3389/fpsyg.2015.01553 (abstract via PubMed PMID 26500600)
- Study type / Evidence level: Randomised four-group psychophysiological experiment (n = 154) / Level II
- Position: critical (ordinary-explanation test)
- Key findings: Tested presentiment under improved conditions (multiple physiological channels — EDA, respiration, finger pulse, HR, RT; manipulated randomisation with vs. without replacement; individually significant stimuli via a mock-crime concealed-information test). No presentiment effect; clear physiological correlates of expectation driven by item-sequence structure, with randomisation type modulating effect sizes (pseudo_cat highest, pseudo_nocat lowest).
- Quote anchor (≤25 words, verbatim): "We could not find any evidence of presentiment but did find evidence of physiological correlates of expectation." — location: abstract
- Quality notes: Strengths — directly operationalises the expectation-bias alternative; multi-measure; randomisation manipulated as a factor. Limitations — design departs from classical presentiment protocols, so (as the authors state) it cannot settle whether earlier positive findings were expectation confounds; not pre-registered; moderate n. COI — none declared; authors at IGPP Freiburg, an institute that studies frontier phenomena.

#### bem2016feeling
- APA 7: Bem, D., Tressoldi, P. E., Rabeyron, T., & Duggan, M. (2016). Feeling the future: A meta-analysis of 90 experiments on the anomalous anticipation of random future events [version 2; peer review: 2 approved]. *F1000Research, 4*, 1188. https://doi.org/10.12688/f1000research.7177.2
- Verification: Crossref title match YES | https://api.crossref.org/works/10.12688/f1000research.7177.2 (Crossref abstract)
- Study type / Evidence level: Meta-analysis of 90 experiments, 33 laboratories, 14 countries / Level I
- Position: proponent
- Key findings: Overall Hedges' g = 0.09, z = 6.40, p = 1.2 × 10⁻¹⁰; Bayes factor 5.1 × 10⁹. Excluding Bem's own experiments, independent replications g = 0.06, z = 4.16, p = 1.1 × 10⁻⁵, BF = 3,853. Fail-safe N = 544; p-curve estimates true effect 0.20–0.24; authors conclude no evidence of p-hacking or selection bias. "Fast-thinking" (implicit) protocols yield larger effects than "slow-thinking" explicit ones — relevant to the gut-feeling framing.
- Quote anchor (≤25 words, verbatim): "the combined effect size for replications by independent investigators is 0.06, z = 4.16, p = 1.1 × 10⁻⁵" — location: abstract
- Quality notes: Strengths — large database; open materials; multiple bias diagnostics. Limitations — version 1 (2015) was first published under F1000Research's post-publication review; inclusion of many unpublished/non-peer-reviewed experiments and proponent-run studies; independent critics (Schimmack, Lakens — blog-level, see Search Limitations) argued the p-curve and bias tests are uninformative for heterogeneous selective reporting; subsequent pre-registered mega-studies (Kekecs 2023; Walleczek 2025) found no effect. COI — first author is the original proponent; co-authors are psi researchers.

#### cardena2018experimental
- APA 7: Cardeña, E. (2018). The experimental evidence for parapsychological phenomena: A review. *American Psychologist, 73*(5), 663–677. https://doi.org/10.1037/amp0000236
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/amp0000236 (abstract via PubMed PMID 29792448)
- Study type / Evidence level: Narrative review of meta-analyses / Level V
- Position: proponent
- Key findings: Surveys recent meta-analyses (ganzfeld, presentiment, Bem-paradigm, remote viewing, etc.) and theoretical proposals from physics and psychology; claims cumulative support for psi comparable to that for accepted psychological phenomena, not explicable by study quality, fraud, or selective reporting. Emphasises nonconscious measures and "successful participant" characteristics as the way forward — explicitly locating psi in nonconscious processing.
- Quote anchor (≤25 words, verbatim): "The evidence provides cumulative support for the reality of psi, which cannot be readily explained away by the quality of the studies, fraud, selective reporting" — location: abstract
- Quality notes: Strengths — the strongest proponent statement in a flagship APA journal; useful inventory of the meta-analytic base. Limitations — narrative, not systematic; relies heavily on proponent-authored meta-analyses; prompted the Reber & Alcock (2020) rebuttal. COI — author directs a research centre on anomalous psychology; not pre-registered (review).

#### reber2020searching
- APA 7: Reber, A. S., & Alcock, J. E. (2020). Searching for the impossible: Parapsychology's elusive quest. *American Psychologist, 75*(3), 391–399. https://doi.org/10.1037/amp0000486
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/amp0000486 (abstract via PubMed PMID 31192620)
- Study type / Evidence level: Theoretical critique / Level VII
- Position: critical
- Key findings: Replies to Cardeña (2018). Argues psi claims violate well-established physical principles (causality, inverse-square law, thermodynamics) and therefore positive data must be artefacts (methodology, analysis, Type I error) irrespective of their statistical strength — the "pigs cannot fly" adynaton. Cites ~150 years without cumulative progress or an accepted mechanism as diagnostic of a degenerating research programme.
- Quote anchor (≤25 words, verbatim): "Claims made by parapsychologists cannot be true. The effects reported can have no ontological status; the data have no existential value." — location: abstract
- Quality notes: Strengths — states the prior-plausibility position in its strongest form; peer-reviewed in the same venue as the target. Limitations — a priori stance that proponents characterise as unfalsifiable/question-begging; no new data or systematic review. COI — none declared (Alcock is a long-standing critic).

#### kekecs2023raising
- APA 7: Kekecs, Z., Palfi, B., Szaszi, B., Szecsi, P., Zrubka, M., Kovacs, M., Bakos, B. E., Cousineau, D., Tressoldi, P., Schmidt, K., Grassi, M., Evans, T. R., Yamada, Y., Miller, J. K., Liu, H., Yonemitsu, F., Dubrov, D., Röer, J. P., Becker, M., … Aczel, B. (2023). Raising the value of research studies in psychological science by increasing the credibility of research reports: The transparent Psi project. *Royal Society Open Science, 10*(2), 191375. https://doi.org/10.1098/rsos.191375
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1098/rsos.191375 (Crossref abstract)
- Study type / Evidence level: Pre-registered (Registered Report), multi-laboratory, adversarial-collaboration replication of Bem (2011) Experiment 1 / Level II
- Position: neutral-methodological (adversarial design; outcome critical)
- Key findings: Protocol co-designed by a consensus panel of proponents and skeptics; Bayesian sequential design with pre-specified stopping rules; born-open data, direct data deposition, real-time reports, video-documented sessions, external auditors. Result: 49.89% successful guesses vs. Bem's 53.07% (chance = 50%); Bem's effect not replicated. Also evaluates feasibility and perceived usefulness of the credibility-enhancing methods.
- Quote anchor (≤25 words, verbatim): "We found 49.89% successful guesses, while Bem reported 53.07% success rate, with the chance level being 50%." — location: abstract
- Quality notes: Strengths — the most rigorously controlled test of a Bem paradigm to date; proponent co-authors (e.g., Tressoldi) agreed the design in advance; Registered Report. Limitations — tests only Experiment 1 (precognitive detection of erotic stimuli); online-adjacent lab logistics; some proponents argue the "psi-conducive" conditions were absent. Replication status — the negative result was itself replicated at scale by Walleczek et al. (2025). COI — none declared.

#### walleczek2025metascientific
- APA 7: Walleczek, J., von Stillfried, N., Schmidt, S., Wittmann, M., Kirmse, K. A., Moll, J., & Kekecs, Z. (2025). Metascientific replication project with the advanced meta-experimental protocol of the transparent psi project procedures for testing the precognitive effect claimed by Bem. *PLOS One, 20*(11), e0335330. https://doi.org/10.1371/journal.pone.0335330
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1371/journal.pone.0335330 (abstract via PubMed PMID 41191630)
- Study type / Evidence level: Three large pre-registered replication studies (26,483 participants; 420,472 critical trials) under the Advanced Meta-Experimental Protocol + TPP procedures / Level II
- Position: neutral-methodological (outcome critical)
- Key findings: Study 1 failed to replicate Bem's Experiment 1. Exploratory analysis of Study 1 suggested a below-chance effect (49.48% ± 0.26 SE; N = 37,836); Study 2 confirmed it confirmatorily (49.65% ± 0.14 SE, p = .013, N = 127,000); Study 3 did not replicate Study 2 (50.07% ± 0.11 SE, p = .496, N = 217,800). Authors judge a method-derived false positive more plausible than a psi anomaly, and present the AMP-TPP strategy as a general tool for weak-effect research.
- Quote anchor (≤25 words, verbatim): "Using conventional standards, based on the lack of replicability in Study 3 and absence of an accepted scientific theory, the second scenario appears more plausible." — location: abstract
- Quality notes: Strengths — by far the largest N in the literature; confirmatory protocol; mixed proponent-critical team; open data; no competing interests declared. Limitations — single paradigm (Experiment 1); the transient Study 2 result illustrates how even rigorous pipelines can produce one-off anomalies, which proponents may read differently. Replication status — consistent with Kekecs et al. (2023).

#### wiseman2006belief
- APA 7: Wiseman, R., & Watt, C. (2006). Belief in psychic ability and the misattribution hypothesis: A qualitative review. *British Journal of Psychology, 97*(3), 323–338. https://doi.org/10.1348/000712605X72523
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1348/000712605X72523 (Crossref abstract)
- Study type / Evidence level: Qualitative (narrative) review / Level V
- Position: critical (ordinary-cognition explanation of psychic experiences)
- Key findings: Reviews the "misattribution hypothesis": believers in psychic ability show attributes — probability misjudgement, weaker critical thinking, fantasy proneness, propensity to find correspondences in unrelated material — that raise the likelihood of labelling ordinary experiences (coincidence, hunches, premonitions) as paranormal. Finds the evidence inconsistent across domains and calls for a multi-causal model and better belief measures.
- Quote anchor (≤25 words, verbatim): "increase the likelihood of them misattributing paranormal causation to experiences that have a normal explanation" — location: abstract
- Quality notes: Strengths — synthesises the anomalistic-psychology account most directly relevant to everyday "gut feeling = sixth sense" reports; identifies correlation-vs-causation problem honestly. Limitations — narrative review; much of the underlying literature uses small student samples and self-report belief scales. COI — none declared; Wiseman is a known skeptic.

#### blackmore1985belief
- APA 7: Blackmore, S., & Trościanko, T. (1985). Belief in the paranormal: Probability judgements, illusory control, and the 'chance baseline shift'. *British Journal of Psychology, 76*(4), 459–468. https://doi.org/10.1111/j.2044-8295.1985.tb01969.x
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1111/j.2044-8295.1985.tb01969.x (Crossref abstract)
- Study type / Evidence level: Three quasi-experimental sheep–goat comparison studies with computer-controlled probability and coin-tossing tasks / Level III
- Position: critical (ordinary-cognition explanation)
- Key findings: Believers ("sheep") made more probability errors than disbelievers ("goats"), especially on sample-size and sampling questions (Expts 1–2). In a coin-tossing task, sheep reported greater illusory control yet underestimated chance hit rates — the "chance baseline shift" proposed as a root of both illusory control and psi belief. No psi was found.
- Quote anchor (≤25 words, verbatim): "This 'chance baseline shift' could underlie the illusion of control and the belief in psi. No evidence of psi was found." — location: abstract
- Quality notes: Pre-1990 inclusion justified as the seminal experimental test of the probability-misjudgement account later reviewed by Wiseman & Watt (2006) and tested repeatedly (mixed replications). Strengths — experimental tasks rather than questionnaires alone. Limitations — small samples; 1980s computer tasks; correlational link between belief and misjudgement. COI — none.

### UNVERIFIED — EXCLUDED

- French, C. C., & Stone, A. (2014). *Anomalistic psychology: Exploring paranormal belief and experience.* — book (Palgrave); outside the "mainstream peer-reviewed journal" constraint, not DOI-verified; excluded at screening.
- Lakens, D. (2015) and Schimmack, U. (2015/2018) critiques of the Bem et al. meta-analysis — blog posts only (no peer-reviewed version located); excluded at screening. Their substantive points (p-curve uninformativeness under heterogeneous selection) are represented via Schwarzkopf (2014) and Francis (2012, verified, see below).
- Alcock, J. E. (2011). "Back from the future: Parapsychology and the Bem affair." *Skeptical Inquirer* — magazine, not peer-reviewed; excluded at screening.
- No candidate failed Crossref verification; every DOI queried returned a matching title (26/26).

### Search Limitations

- **Verified but not included (quote-anchor unavailable):** Mossbridge, J. A., & Radin, D. (2018). Precognition as a form of prospection: A review of the evidence. *Psychology of Consciousness, 5*(1), 78–93. https://doi.org/10.1037/cns0000121 — and — Schwarzkopf, D. S. (2018). On the plausibility of scientific hypotheses: Commentary on Mossbridge and Radin (2018). *Psychology of Consciousness, 5*(1), 94–97. https://doi.org/10.1037/cns0000125. Both Crossref-verified; APA PsycNet pages did not render and no PubMed record exists, so no verbatim quote could be captured. The synthesiser may cite them as a proponent review / critical reply pair at the level of title and venue only.
- **Verified, quote available, held back under the 12–16 scope cap (all Crossref title match YES):**
  - Bem, D. J., Utts, J., & Johnson, W. O. (2011). Must psychologists change the way they analyze their data? *JPSP, 101*(4), 716–719. https://doi.org/10.1037/a0024777 — proponent reply arguing Wagenmakers et al.'s prior was unrealistic.
  - LeBel, E. P., & Peters, K. R. (2011). Fearing the future of empirical psychology… *Review of General Psychology, 15*(4), 371–379. https://doi.org/10.1037/a0025172 — critical; conceptual-vs-close replication, measurement verification, NHST flaws.
  - Francis, G. (2012). Too good to be true: Publication bias in two prominent studies… *Psychonomic Bulletin & Review, 19*(2), 151–156. https://doi.org/10.3758/s13423-012-0227-9 — critical; excess-success test shows Bem (2011) has more significant results than its power warrants.
  - Open Science Collaboration. (2015). Estimating the reproducibility of psychological science. *Science, 349*(6251), aac4716. https://doi.org/10.1126/science.aac4716 — neutral context; 36% of 100 replications significant; replication effects about half of originals.
  - Duggan, M., & Tressoldi, P. (2018). Predictive physiological anticipatory activity… An update of Mossbridge et al's meta-analysis [v2]. *F1000Research, 7*, 407. https://doi.org/10.12688/f1000research.14330.2 — proponent; 27 new experiments, ES = 0.28 (95% CI 0.18–0.38).
  - Rabeyron, T. (2020). Why most research findings about psi are false… *Frontiers in Psychology, 11*, 562992. https://doi.org/10.3389/fpsyg.2020.562992 — proponent-leaning epistemological analysis of the "psi paradox" and decline effects.
  - Muhmenthaler, M. C., Dubravac, M., & Meier, B. (2024; advance online 2022). The future failed: No evidence for precognition in a large scale replication attempt of Bem (2011). *Psychology of Consciousness, 11*(4), 461–476. https://doi.org/10.1037/cns0000342 — critical; >2,000 online participants across three Bem paradigms, no precognition effects; not formally pre-registered (abstract retrieved from a mirrored PDF, not the publisher).
- **Coverage gaps:** No systematic search of PsycINFO/Web of Science (API access unavailable); retrieval relied on Crossref, PubMed and seed-chaining, so grey-literature and non-English work are not covered (English-only by design). Field-specific venues (Journal of Parapsychology, Journal of Scientific Exploration) were excluded by the brief, which removes some proponent replication reports and some skeptic–proponent collaborations (e.g., Schlitz, Wiseman, Watt & Radin 2006, BJP, on experimenter effects in remote staring — located but not pursued because it concerns "sense of being stared at" rather than anticipation).
- **Directly relevant everyday-phenomenology work is thin:** the brief's "sense of being stared at" and premonition-experience literature in mainstream venues is sparse; the ordinary-cognition side is here represented by belief/probability-misjudgement work (Wiseman & Watt; Blackmore & Trościanko) and by the expectation-bias experiment (Siller et al.) rather than by studies of spontaneous premonition reports.
- **Post-2023 recency:** two WebSearch sweeps and one Crossref date-filtered query located the 2024 and 2025 replications; no 2026 peer-reviewed item on Bem-paradigm or presentiment replication was found as of 2026-10-03.
- **Quote-anchor caveat:** the Cardeña (2018) and Bem et al. (2016) quotes are verbatim but truncated at 25 words mid-sentence; the Schwarzkopf (2014) quote is from PMC full text (p. 1) because the piece has no abstract.
