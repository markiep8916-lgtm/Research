## Annotated Bibliography — SQ2

**Sub-question (SQ2):** Under what conditions do gut-feeling / intuitive judgments outperform, match, or underperform deliberate analysis?

**Primary RQ context:** What mechanisms and boundary conditions explain when "gut feeling" judgments (judgments reached without conscious access to their basis) yield accurate knowledge?

### Search Strategy

- **Databases / engines:** Crossref REST API (`api.crossref.org/works/<DOI>` and `query.bibliographic`), PubMed E-utilities (esearch/efetch), Semantic Scholar Graph API, OpenAlex API, CORE v3 API (Radboud Repository / NARCIS mirror), Google Books (ISBN record), Princeton University Press catalogue, web search (standard mode) for open mirrors (ideas.repec.org, stafforini.com, dlab.sauder.ubc.ca SJDM archive).
- **Keywords:** intuition; intuitive expertise; gut feeling; deliberation; unconscious thought; deliberation-without-attention; heuristics; ecological rationality; kind vs wicked learning environments; expert competence; thin slices; clinical versus mechanical (statistical/actuarial) prediction; holistic vs mechanical data combination; dual process; System 1 / Type 1; clinical reasoning; expertise-based intuition.
- **Boolean strings (used against Crossref `query.bibliographic` and web search):**
  - `(intuition OR "intuitive judgment" OR "gut feeling") AND (deliberation OR analysis OR "conscious thought") AND (accuracy OR performance OR outperform)`
  - `("unconscious thought" OR "deliberation without attention") AND (meta-analysis OR replication)`
  - `("clinical versus mechanical" OR "clinical versus statistical" OR "holistic versus mechanical") AND (prediction OR "data combination") AND meta-analysis`
  - `("kind" AND "wicked") AND ("learning environment")` ; `"expertise-based intuition"` ; `"thin slices" AND meta-analysis`
  - `("dual process" OR "System 1") AND ("clinical reasoning" OR "diagnostic error")`
- **Date range:** 1990-01-01 to 2026-10-03 for empirical work; seminal earlier works permitted with justification (none ultimately required: the earliest included source is 1991).
- **last_searched_at:** 2026-10-03
- **Inclusion criteria:** human adults; English language; peer-reviewed journal article, or scholarly monograph from a university press with a verifiable catalogue record; directly addresses the comparative accuracy of intuitive/non-deliberative vs deliberate/analytic judgment, or the task/environment/expertise conditions that moderate it; existence verified deterministically (Crossref title match, or publisher/catalogue page for books); a verbatim quote anchor (≤25 words) obtainable from the abstract or accessible text.
- **Exclusion criteria:** children/animal samples; non-English; purely neuroscientific mechanism papers (reserved for SQ1/SQ3); sources whose existence could not be verified; verified sources for which no verbatim abstract/full-text anchor could be obtained (listed separately below); verified sources judged redundant with a stronger included source (listed under Search Limitations with reason).
- **DISTRIBUTIONAL_SKEW_ADVISORY:**
  - *Discipline:* 13/16 (81%) of included sources are from psychology / judgment-and-decision-making journals; the remainder are medicine (1), management (1) and political science (1). ≥70% concentration — advisory triggered. Mitigation: the medical (Norman et al. 2017), organisational (Dane et al. 2012; Salas et al. 2010) and forecasting (Tetlock 2005) sources were deliberately retained so that the environment-structure argument is tested outside laboratory psychology.
  - *Source type:* 14/16 (87.5%) peer-reviewed journal articles; 2 monographs. ≥70% concentration — advisory triggered, but this is a design consequence of the ≥60% journal-article requirement and is not treated as a bias.
  - *Geography (first-author affiliation at publication):* United States ≈ 9/16 (56%), Netherlands 3, Canada 1, Germany 1, Spain 1, Spain/US 1 — below the 70% threshold; no advisory.
  - *Decade:* 1990s 4; 2000s 5; 2010s 7 — no advisory.
  - *Direction:* supports 5; against 4; conditional 7 — no advisory; both pro-intuition and pro-deliberation evidence represented.

### PRISMA-style Flow

- **Identified:** 30 candidate records (22 seed items supplied in the brief, decomposed to individual works, + 8 additional records surfaced during searching: Mamede et al. 2010 JAMA; Norman et al. 2014 Acad Med; Dane & Pratt 2007 AMR; Dijksterhuis & Nordgren 2006 PoPS; Klein 2008 Human Factors; Waroquier et al. 2009 JDM; Vadillo et al. 2015 Front Psychol; Abadie & Waroquier 2016 unconscious-thought-beyond-choice meta-analysis).
- **Screened (title/abstract against inclusion criteria):** 30 → 26 retained (4 set aside as off-scope for SQ2: Dijksterhuis & Nordgren 2006 (theory, SQ1), Klein 2008 (NDM overview), Waroquier 2009 and Vadillo 2015 (superseded by / subsumed in Nieuwenstein 2015 and Strick 2011)).
- **Deterministic verification attempted:** 26. **Verified:** 26 (24 via Crossref DOI title match; 2 monographs via publisher/catalogue record). Two seed DOIs recalled from memory were wrong (Acker 2008; Nieuwenstein 2015) and were corrected via Crossref bibliographic search before verification; one guessed book DOI for Hogarth 2001 did not resolve and the book was verified via its Google Books ISBN record instead.
- **Included in main list:** 16. **Verified but not included:** 10 (reasons under Search Limitations). **Unverified — excluded:** 0 (Betsch & Glöckner 2010 is Crossref-verified but is listed in the exclusion section because no verbatim quote anchor was obtainable).

### Sources (N = 16)

#### kahneman2009conditions
- APA 7: Kahneman, D., & Klein, G. (2009). Conditions for intuitive expertise: A failure to disagree. *American Psychologist, 64*(6), 515–526. https://doi.org/10.1037/a0016755
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/a0016755 ; abstract via PubMed PMID 19739881
- Study type / Evidence level: Theoretical synthesis / adversarial-collaboration review (heuristics-and-biases vs naturalistic decision making) / Level VII
- Direction: conditional
- Key findings:
  - Genuine intuitive skill develops only when (a) the environment is sufficiently regular to be predictable and (b) the person has had adequate opportunity to learn those regularities through practice with feedback.
  - Confidence is not diagnostic of accuracy: "subjective experience is not a reliable indicator"; intuitions in low-validity environments (e.g., stock picking, long-range political forecasting) are overconfident and biased.
  - Both camps agree experts should be trusted in high-validity environments (chess, firefighting, medicine with rapid feedback) and distrusted in low-validity ones.
- Quote anchor (≤25 words, verbatim): "Subjective experience is not a reliable indicator of judgment accuracy." — location: abstract
- Quality notes: Strengths — written jointly by the leading proponents of the two opposing traditions, so the boundary conditions it states represent an unusually robust consensus; most-cited framework for this sub-question. Limitations — no new data; the "validity of environment" criterion is partly circular unless operationalised (Hogarth 2001/2015 supplies the operationalisation). Not an empirical study, so replication status not applicable. No COI declared.

#### hogarth2001educating
- APA 7: Hogarth, R. M. (2001). *Educating intuition*. University of Chicago Press. (No DOI. ISBN 0-226-34860-1 / 978-0-226-34860-5; 335 pp.)
- Verification: Crossref title match N/A (monograph without DOI) | Google Books ISBN record https://books.google.com/books?vid=ISBN0226348601 confirms title, author, publisher, year, page count; existence further corroborated by Crossref-indexed book review 10.1002/acp.875 (*Applied Cognitive Psychology*, 2002). The guessed Chicago Scholarship Online DOI did not resolve and is not cited.
- Study type / Evidence level: Scholarly monograph synthesising the psychological literature on intuitive judgment / Level VII
- Direction: conditional
- Key findings:
  - Intuition is the output of tacit learning; its quality is bounded by the quality of the learning environment in which it was acquired.
  - "Kind" environments (frequent, immediate, accurate feedback) produce trustworthy intuitions; "wicked" environments (missing, delayed, or misleading feedback) produce confident but invalid intuitions.
  - Proposes concrete procedures for "educating" intuition: selecting/creating kind environments, seeking feedback, imposing circuit-breakers of deliberate checking.
- Quote anchor (≤25 words, verbatim): "intuition is a normal and important component of thought that has its roots in processes of tacit learning" — location: publisher description (Google Books record of the University of Chicago Press text)
- Quality notes: Strengths — origin of the kind/wicked distinction that Kahneman & Klein (2009) and Hogarth et al. (2015) later adopt; comprehensive literature coverage up to 2000. Limitations — book-length argument rather than a study; quote anchor is from the publisher's description because no chapter text was accessible in this run; pre-dates the unconscious-thought controversy and the modern replication literature. No COI identified.

#### hogarth2015two
- APA 7: Hogarth, R. M., Lejarraga, T., & Soyer, E. (2015). The two settings of kind and wicked learning environments. *Current Directions in Psychological Science, 24*(5), 379–385. https://doi.org/10.1177/0963721415591878
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1177/0963721415591878 (abstract present in Crossref record)
- Study type / Evidence level: Conceptual review with illustrative empirical examples / Level VII (theory) drawing on Level II–III studies
- Direction: conditional
- Key findings:
  - Formalises inference as two settings — learning (where information is acquired) and prediction (where it is applied); kindness = match between the informational elements of the two settings.
  - Kind environments are a *necessary* (not sufficient) condition for accurate intuitive inference; mismatches (selection effects, missing feedback, changed base rates) create wicked environments.
  - Shows that restructuring the learning environment to be kind improves probabilistic judgments, providing a lever for intervention.
- Quote anchor (≤25 words, verbatim): "Kind learning environments involve close matches between the informational elements in the two settings and are a necessary condition for accurate inferences." — location: abstract
- Quality notes: Strengths — gives the kind/wicked construct a testable structural definition usable across domains; short, peer-reviewed, widely cited. Limitations — review format; the examples are selected to illustrate rather than to test the framework; no systematic search. No COI declared.

#### gigerenzer2011heuristic
- APA 7: Gigerenzer, G., & Gaissmaier, W. (2011). Heuristic decision making. *Annual Review of Psychology, 62*, 451–482. https://doi.org/10.1146/annurev-psych-120709-145346
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1146/annurev-psych-120709-145346 (abstract present in Crossref record)
- Study type / Evidence level: Narrative review (Annual Review) / Level V
- Direction: supports intuitive accuracy (conditional on ecological rationality)
- Key findings:
  - Heuristics — fast, frugal, often unconscious rules that ignore part of the information — can match or outperform complex optimisation ("less-is-more" effects) when the environment's structure fits the heuristic (ecological rationality).
  - Provides the prescriptive counterweight to accuracy-effort trade-off thinking: ignoring information can *increase* accuracy under uncertainty, scarce data, or redundant cues.
  - Catalogues conditions (e.g., high cue redundancy, moderate-to-high uncertainty, small samples) under which recognition, take-the-best and 1/N heuristics beat multiple regression or mean–variance optimisation.
- Quote anchor (≤25 words, verbatim): "it is an empirical rather than an a priori issue how well cognitive heuristics function in an uncertain world" — location: abstract
- Quality notes: Strengths — synthesises formal models plus experimental and simulation evidence; explicitly specifies environment-structure conditions, which is exactly what SQ2 needs. Limitations — authored by the programme's founders (advocacy risk); many cited demonstrations are simulations or small lab studies; the Kahneman–Tversky tradition disputes several interpretations. No financial COI declared.

#### shanteau1992competence
- APA 7: Shanteau, J. (1992). Competence in experts: The role of task characteristics. *Organizational Behavior and Human Decision Processes, 53*(2), 252–266. https://doi.org/10.1016/0749-5978(92)90064-E
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1016/0749-5978(92)90064-E ; abstract text read from the open mirror https://stafforini.com/works/shanteau-1992-competence-experts-role/ (ScienceDirect returned HTTP 403)
- Study type / Evidence level: Theoretical review ("Theory of Expert Competence") synthesising prior empirical work / Level VII
- Direction: conditional
- Key findings:
  - Reconciles the "experts are biased" (JDM) and "experts are competent" (cognitive science) literatures by arguing both sampled different task types.
  - Competence depends on five components; the task characteristic component explains domain variation: experts perform well on static, decomposable, feedback-rich tasks (weather forecasters, livestock judges, chess) and poorly on dynamic human-behaviour prediction with poor feedback (clinical psychologists, stockbrokers, parole officers).
  - Supplies the "good vs poor expert-performance domains" list that later authors (Kahneman & Klein 2009) rely on.
- Quote anchor (≤25 words, verbatim): "the cognitive skills necessary to make tough decisions, the ability to use appropriate decision strategies, and a task with suitable characteristics" — location: abstract
- Quality notes: Strengths — first systematic task-characteristic account of expert accuracy; highly cited (>700 citations per Semantic Scholar). Limitations — the domain lists are compiled from secondary evidence rather than from a meta-analysis; single-author theory paper. No COI identified.

#### ambady1992thin
- APA 7: Ambady, N., & Rosenthal, R. (1992). Thin slices of expressive behavior as predictors of interpersonal consequences: A meta-analysis. *Psychological Bulletin, 111*(2), 256–274. https://doi.org/10.1037/0033-2909.111.2.256
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/0033-2909.111.2.256 ; abstract sentences confirmed verbatim in two independent indexing records surfaced by search (ProQuest docview/614385174; Epistemonikos document 23c89f4b…), but neither page could be fetched directly (403 / redirect loop) — see Search Limitations
- Study type / Evidence level: Meta-analysis (38 independent results; 44 studies screened) / Level I
- Direction: supports intuitive accuracy
- Key findings:
  - Predictions of objective outcomes (teacher effectiveness, therapist competence, deception, etc.) from under-5-minute observations of expressive behaviour reach a mean effect size of r = .39.
  - Observation length does not matter: slices under 30 s predict as well as 4–5 min slices, suggesting rapid, non-deliberative extraction of diagnostic cues.
  - Behavioural channel (face, voice, body) is unrelated to accuracy.
- Quote anchor (≤25 words, verbatim): "Studies using longer periods of behavioral observation did not yield greater predictive accuracy" — location: abstract
- Quality notes: Strengths — meta-analytic; large and consistent effect; foundational for the "accurate snap judgment" literature. Limitations — outcomes are mostly social/interpersonal where intuitive social perception is expected to be strong; later individual thin-slice effects (e.g., some teacher-rating studies) have shown shrinkage; publication-bias correction methods used were those available in 1992; quote-anchor provenance is indirect (indexed abstract, not a fetched page). No COI identified.

#### dijksterhuis2006making
- APA 7: Dijksterhuis, A., Bos, M. W., Nordgren, L. F., & van Baaren, R. B. (2006). On making the right choice: The deliberation-without-attention effect. *Science, 311*(5763), 1005–1007. https://doi.org/10.1126/science.1121629
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1126/science.1121629 (abstract present in Crossref record)
- Study type / Evidence level: Four randomised laboratory/field experiments / Level II
- Direction: supports intuitive accuracy (for complex choices)
- Key findings:
  - Simple choices (towels, oven mitts) were better after conscious deliberation, but complex multi-attribute choices (cars, apartments) were better after a period of distraction — the "deliberation-without-attention" hypothesis.
  - Field study of shoppers: post-purchase satisfaction with complex products was higher among those who had deliberated less.
  - Proposed as evidence for Unconscious Thought Theory (unconscious processing has larger capacity and weights attributes more appropriately).
- Quote anchor (≤25 words, verbatim): "purchases of complex products were viewed more favorably when decisions had been made in the absence of attentive deliberation" — location: abstract
- Quality notes: Strengths — randomised design, published in *Science*, triggered a decade of research. Limitations — small samples (lab Ns in the tens per cell); field study is correlational; the effect has failed in multiple pre-registered and large-N replications (Acker 2008; Nieuwenstein et al. 2015 — see below), and the pooled effect is non-significant after publication-bias correction. Authors are the theory's originators (intellectual COI). **Replication status: not replicated at scale.**

#### strick2011meta
- APA 7: Strick, M., Dijksterhuis, A., Bos, M. W., Sjoerdsma, A., van Baaren, R. B., & Nordgren, L. F. (2011). A meta-analysis on unconscious thought effects. *Social Cognition, 29*(6), 738–762. https://doi.org/10.1521/soco.2011.29.6.738
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1521/soco.2011.29.6.738 ; abstract read from the CORE record mirroring the Radboud Repository open-access publisher's version (CORE work search `title:"A meta-analysis on unconscious thought effects"`, file 99760.pdf). Guilford Press page blocked by bot wall.
- Study type / Evidence level: Meta-analysis (92 studies, published and unpublished) / Level I
- Direction: supports intuitive accuracy (conditional on moderators)
- Key findings:
  - Pooled unconscious-thought effect g = .224 (95% CI .145–.303) relative to conscious thought and immediate decision.
  - About 66% of effect-size variance attributed to between-study differences; moderators (mindset, pictorial presentation, complexity, goal, distraction type, deliberation duration) identified.
  - Authors conclude the effect is real but not universal.
- Quote anchor (≤25 words, verbatim): "Across a total of 92 studies, the overall aggregated effect size was g = .224, with a 95% confidence interval from .145 to .303." — location: abstract
- Quality notes: Strengths — the most inclusive pro-UTT synthesis; includes unpublished data. Limitations — conducted by the theory's originators (COI: all six authors are UTT proponents; many included studies are their own); Nieuwenstein et al. (2015) report that the effect is confined to underpowered studies and vanishes under trim-and-fill (g = 0.018); moderator analyses are post hoc. Included here specifically so the pro-intuition meta-analytic claim is represented alongside its refutation.

#### nieuwenstein2015making
- APA 7: Nieuwenstein, M. R., Wierenga, T., Morey, R. D., Wicherts, J. M., Blom, T. N., Wagenmakers, E.-J., & van Rijn, H. (2015). On making the right choice: A meta-analysis and large-scale replication attempt of the unconscious thought advantage. *Judgment and Decision Making, 10*(1), 1–17. https://doi.org/10.1017/S1930297500003144
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1017/s1930297500003144 (abstract present); full text read at https://dlab.sauder.ubc.ca/sjdm/journal/14/14321/jdm14321.html
- Study type / Evidence level: Meta-analysis + pre-specified large-scale randomised replication (N = 399) / Level I (meta-analysis) and Level II (replication)
- Direction: against intuitive (unconscious-thought) accuracy
- Key findings:
  - Large-N replication under conditions deemed optimal for the UTA found no effect: 58.2% correct after deliberation vs 61.9% after distraction, not significant.
  - Meta-analysis: reported UTA effects were confined to small-sample studies; after trim-and-fill, pooled Hedges' g = 0.018 (95% CI −0.10 to 0.14), p = .77.
  - Supports the "reliability account" (no effect; prior findings spurious) over the "moderator account".
- Quote anchor (≤25 words, verbatim): "the large-scale replication study yielded no evidence for the UTA, and the meta-analysis showed that previous reports of the UTA were confined to underpowered studies" — location: abstract
- Quality notes: Strengths — large pre-specified sample, Bayesian and frequentist analyses, independent authors, open journal; directly tests the moderators Strick et al. (2011) proposed. Limitations — tests only the multi-attribute choice paradigm (Abadie & Waroquier 2016 later extended the null to other UTT paradigms); the "best choice" criterion is normative/decomposable, which UTT proponents argue is not where unconscious thought should excel. No COI declared. **Replication status: this is the replication.**

#### wilson1991thinking
- APA 7: Wilson, T. D., & Schooler, J. W. (1991). Thinking too much: Introspection can reduce the quality of preferences and decisions. *Journal of Personality and Social Psychology, 60*(2), 181–192. https://doi.org/10.1037/0022-3514.60.2.181
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/0022-3514.60.2.181 ; abstract via PubMed PMID 2016668
- Study type / Evidence level: Two randomised laboratory experiments / Level II
- Direction: supports intuitive accuracy (deliberation degrades judgment)
- Key findings:
  - Students who analysed *why* they liked strawberry jams agreed less with *Consumer Reports* expert panels than controls who simply rated them.
  - Analysing reasons or evaluating all attributes of college courses reduced correspondence with expert opinion; introspection shifts attention to verbalisable but non-optimal criteria and flattens discrimination between options.
  - Early experimental support for the claim that affect-based "gut" preferences can carry valid information that verbal analysis destroys.
- Quote anchor (≤25 words, verbatim): "Analyzing reasons can focus people's attention on nonoptimal criteria, causing them to base their subsequent choices on these criteria." — location: abstract
- Quality notes: Strengths — randomised, clear mechanism (criterion shift), foundational citation for the "thinking too much" literature. Limitations — small undergraduate samples (Ns in the tens per condition); accuracy criterion is agreement with experts; a large-scale direct replication was not located in this search, so replication status is **unknown/mixed**; effects are on preferences, which may not generalise to factual judgment. No COI identified.

#### dane2012trust
- APA 7: Dane, E., Rockmann, K. W., & Pratt, M. G. (2012). When should I trust my gut? Linking domain expertise to intuitive decision-making effectiveness. *Organizational Behavior and Human Decision Processes, 119*(2), 187–194. https://doi.org/10.1016/j.obhdp.2012.07.009
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1016/j.obhdp.2012.07.009 ; abstract confirmed at https://ideas.repec.org/a/eee/jobhdp/v119y2012i2p187-194.html (ScienceDirect returned HTTP 403)
- Study type / Evidence level: Two randomised laboratory experiments (intuition vs analysis instruction × expertise) / Level II
- Direction: conditional (expertise moderates)
- Key findings:
  - Study 1 (basketball shot-legality judgments) and Study 2 (designer-handbag authenticity) used non-decomposable tasks with objective answers.
  - Intuitive judgment was *more* accurate than analytical judgment for high-expertise participants and no better (or worse) for low-expertise participants.
  - Provides a direct experimental test of the Kahneman–Klein / Shanteau claim that domain expertise is the key moderator of intuitive accuracy.
- Quote anchor (≤25 words, verbatim): "the effectiveness of intuition relative to analysis is amplified at a high level of domain expertise" — location: abstract
- Quality notes: Strengths — objective accuracy criteria; manipulated decision mode; two divergent domains. Limitations — modest samples (undergraduate / collector samples; exact Ns not retrievable in this run); expertise measured, not manipulated; tasks are perceptual-classification rather than forecasting; no pre-registration; independent replication not located. No COI declared.

#### grove2000clinical
- APA 7: Grove, W. M., Zald, D. H., Lebow, B. S., Snitz, B. E., & Nelson, C. (2000). Clinical versus mechanical prediction: A meta-analysis. *Psychological Assessment, 12*(1), 19–30. https://doi.org/10.1037/1040-3590.12.1.19
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/1040-3590.12.1.19 ; abstract via PubMed PMID 10752360
- Study type / Evidence level: Meta-analysis (136 studies) / Level I
- Direction: against intuitive (clinical/holistic) judgment
- Key findings:
  - Mechanical (statistical) prediction was on average about 10% more accurate than clinical judgment across human health and behaviour outcomes.
  - Mechanical methods substantially outperformed clinicians in 33–47% of studies; clinicians substantially outperformed formulas in only 6–16%.
  - Superiority held regardless of task, judge type, or judge experience; clinical judgment did relatively worse when clinicians had interview data (a "noise" channel).
- Quote anchor (≤25 words, verbatim): "On average, mechanical-prediction techniques were about 10% more accurate than clinical predictions." — location: abstract
- Quality notes: Strengths — large meta-analysis settling the Meehl (1954) debate; robust across moderators. Limitations — "clinical judgment" conflates intuition with unaided deliberate reasoning (both are holistic); many primary studies are older and in forensic/psychiatric prediction; effect sizes small in absolute terms. Replicated and extended by Ægisdóttir et al. (2006; 67 studies, ~13% statistical advantage) and Kuncel et al. (2013). No COI identified.

#### kuncel2013mechanical
- APA 7: Kuncel, N. R., Klieger, D. M., Connelly, B. S., & Ones, D. S. (2013). Mechanical versus clinical data combination in selection and admissions decisions: A meta-analysis. *Journal of Applied Psychology, 98*(6), 1060–1072. https://doi.org/10.1037/a0034156
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/a0034156 ; abstract via PubMed PMID 24041118
- Study type / Evidence level: Meta-analysis / Level I
- Direction: against intuitive (holistic) judgment
- Key findings:
  - Across work criteria (advancement, supervisory ratings, training performance) and academic GPA, mechanical combination of the *same* predictor data outperformed holistic (expert) combination.
  - For job performance, the validity gap translated into >50% improvement in prediction for mechanical methods.
  - Loss of validity occurred even for experts knowledgeable about the specific jobs/organisations — expertise did not rescue holistic judgment in this (wicked, low-feedback) domain.
- Quote anchor (≤25 words, verbatim): "There was consistent and substantial loss of validity when data were combined holistically—even by experts who are knowledgeable about the jobs and organizations in question" — location: abstract
- Quality notes: Strengths — isolates the *combination* step (same inputs), so the comparison is clean; modern meta-analytic methods; applied high-stakes domain. Limitations — holistic judgment here is deliberate expert integration rather than rapid gut feeling, so it bounds "unaided human judgment" more than "intuition" per se; number of studies and k per criterion not captured in this run. No COI declared beyond authors' academic roles in selection research.

#### norman2017causes
- APA 7: Norman, G. R., Monteiro, S. D., Sherbino, J., Ilgen, J. S., Schmidt, H. G., & Mamede, S. (2017). The causes of errors in clinical reasoning: Cognitive biases, knowledge deficits, and dual process thinking. *Academic Medicine, 92*(1), 23–30. https://doi.org/10.1097/ACM.0000000000001421
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1097/ACM.0000000000001421 (abstract present in Crossref record)
- Study type / Evidence level: Narrative review of empirical medical-education literature / Level V
- Direction: conditional / mechanism-only
- Key findings:
  - Reviews evidence that diagnostic errors arise from both Type 1 (associative, bias-prone) and Type 2 (working-memory-limited) processing; errors are not uniquely a product of fast intuitive reasoning.
  - Instructing clinicians to "slow down and be systematic" does not reliably improve accuracy (cites Norman et al. 2014 controlled trial, Acad Med 89:277–284, Crossref-verified in this run: speed vs thorough instructions produced no accuracy difference), whereas knowledge/expertise strongly reduces error.
  - Concludes that bias-inoculation strategies have weak effects compared with knowledge acquisition, i.e., accurate medical intuition is knowledge-based pattern recognition.
- Quote anchor (≤25 words, verbatim): "with increasing expertise (and knowledge), the likelihood of errors decreases" — location: abstract
- Quality notes: Strengths — authored by the principal empirical group in clinical-reasoning research; integrates controlled trials (Norman 2014; Mamede 2010 JAMA — both DOI-verified) with theory; applied, high-stakes domain. Limitations — non-systematic review; authors review largely their own trials (intellectual COI); medical diagnosis is a comparatively kind environment (eventual feedback), limiting generalisation to wicked domains. 

#### salas2010expertise
- APA 7: Salas, E., Rosen, M. A., & DiazGranados, D. (2010). Expertise-based intuition and decision making in organizations. *Journal of Management, 36*(4), 941–973. https://doi.org/10.1177/0149206309350084
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1177/0149206309350084 (abstract present in Crossref record; Crossref issued-date 2009 = online-first; print volume 2010)
- Study type / Evidence level: Narrative integrative review / Level V
- Direction: supports intuitive accuracy (expertise-based intuition only)
- Key findings:
  - Defines expertise-based intuition (rooted in extensive domain experience) and distinguishes it from naive intuition; argues only the former is of organisational value.
  - Integrates NDM, expertise, and organisational literatures to specify how expertise-based intuition develops (deliberate practice, feedback-rich exposure) and when it should be used (time pressure, ill-structured but regular tasks).
  - Proposes a research agenda and practical levers (training, decision-support design) for cultivating trustworthy intuition.
- Quote anchor (≤25 words, verbatim): "researchers have found that intuition plays a critical role in expert decision making" — location: abstract
- Quality notes: Strengths — cross-disciplinary synthesis in a leading management journal; complements Kahneman & Klein (2009) from the NDM/organisational side. Limitations — review, non-systematic; favourable framing toward NDM; organisational evidence base is thinner and less controlled than the lab literature. No COI declared.

#### tetlock2005expert
- APA 7: Tetlock, P. E. (2005). *Expert political judgment: How good is it? How can we know?* Princeton University Press. https://doi.org/10.1515/9781400830312 (Crossref monograph record, 2009 digital edition of the 2005 book; new-edition ISBN 978-0-691-17597-3)
- Verification: Crossref title match YES ("Expert Political Judgment", Tetlock, monograph) | https://api.crossref.org/works/10.1515/9781400830312 ; publisher page https://press.princeton.edu/books/paperback/9780691175973/expert-political-judgment confirms title, author, 2005 original date
- Study type / Evidence level: Longitudinal prospective forecasting study (≈284 experts, tens of thousands of probability forecasts over ~20 years) / Level IV
- Direction: against intuitive/expert judgment accuracy (in a wicked environment)
- Key findings:
  - Experts' probabilistic political/economic forecasts barely beat simple extrapolation algorithms and were often worse than dilettantes; confidence and fame were inversely related to accuracy.
  - Cognitive style mattered more than expertise: integrative "foxes" outperformed "hedgehogs" who applied a single big idea.
  - Demonstrates the Kahneman–Klein/Hogarth prediction that in low-validity, slow- or no-feedback environments, experience does not generate accurate intuition.
- Quote anchor (≤25 words, verbatim): "is better able to improvise in response to changing events—is more successful in predicting the future than the hedgehog" — location: publisher description (Princeton University Press page)
- Quality notes: Strengths — unusually large, long-duration, real-world forecasting dataset with scoring rules; the canonical field demonstration of expert failure in wicked environments. Limitations — monograph (not peer-reviewed in the journal sense); forecasts were deliberate, not strictly "gut" judgments, so it bounds expert judgment broadly rather than intuition narrowly; quote anchor comes from publisher text because chapter text was not accessible in this run. No COI identified.

### Recency Sweep Additions 2018–2026 (N = 8)

*Extended-mode sweep run 2026-10-03 (last_searched_at: 2026-10-03) across Crossref (`filter=from-pub-date:2018-01-01`), PubMed, CORE and web search for 2018–2026 peer-reviewed work on (a) comparative accuracy of intuitive vs deliberate judgment (SQ2) and (b) mechanisms of intuition (SQ1). Clusters searched: thin-slice accuracy; unconscious thought; expert intuition in medicine / firefighting / aviation; interoceptive accuracy and decision quality; fluency / coherence intuition; management reviews (Sadler-Smith, Hodgkinson, Akinci, Sinclair); Lufityanto et al. (2016) follow-ups; direct tests of the Kahneman–Klein boundary conditions and Hogarth's kind/wicked distinction. Same verification and quote rules as the main list.*

#### murphy2019predictive
- APA 7: Murphy, N. A., Hall, J. A., Ruben, M. A., Frauendorfer, D., Schmid Mast, M., Johnson, K. E., & Nguyen, L. (2019). Predictive validity of thin-slice nonverbal behavior from social interactions. *Personality and Social Psychology Bulletin, 45*(7), 983–993. https://doi.org/10.1177/0146167218802834
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1177/0146167218802834 (abstract present; online-first 2018-11-07, print July 2019); abstract also via PubMed PMID 30400748
- Study type / Evidence level: Five non-randomised observational studies comparing coded thin slices with full 5-min interactions / Level III
- Direction: supports intuitive accuracy (conditional — thin slices retain most predictive validity)
- Key findings:
  - Across six nonverbal behaviours, 1-min slices showed some loss of predictive validity relative to full 5-min coding, but combining the first two 1-min slices recovered most validity for five of six behaviours.
  - Provides the first systematic post-Ambady & Rosenthal (1992) quantification of how much information is lost by slicing, with effect-size guidance for power analysis.
  - Companion review (Murphy & Hall, 2021, *Frontiers in Psychology*, 10.3389/fpsyg.2021.667326 — Crossref-verified title) surveys comparative thin-slice research across social domains.
- Quote anchor (≤25 words, verbatim): "Results indicate some loss in predictive validity with 1-min slices, but relatively little loss when Slices 1 and 2 were combined" — location: abstract
- Quality notes: Strengths — multiple datasets, direct comparison against full-length criterion, modern effect-size reporting. Limitations — concerns validity of *coded behaviour* slices rather than perceivers' holistic snap judgments, so it bounds the information available to thin-slice intuition rather than intuition itself; samples are laboratory interactions; not a meta-analysis. No COI declared.

#### abadie2019evaluating
- APA 7: Abadie, M., & Waroquier, L. (2019). Evaluating the benefits of conscious and unconscious thought in complex decision making. *Policy Insights from the Behavioral and Brain Sciences, 6*(1), 72–78. https://doi.org/10.1177/2372732218816998
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1177/2372732218816998 (abstract present in Crossref record)
- Study type / Evidence level: Narrative review of experimental literature comparing deliberation, distraction and immediate choice / Level V
- Direction: conditional (against unreflective gut choice; for deliberation with verbatim detail, for distraction with gist)
- Key findings:
  - Post-Nieuwenstein (2015) status of the unconscious-thought literature: deliberation helps when precise verbatim attribute information is in memory; a distraction period helps when only meaning-based gist representations are accessible (fuzzy-trace account).
  - Immediate "snap" choice without either deliberation or distraction is never the best-performing mode in the reviewed studies.
  - Reframes the UTA debate from "does the unconscious think?" to "which memory representations are available at choice?".
- Quote anchor (≤25 words, verbatim): "a distraction period is more useful when meaning-based gist representations of the alternatives are accessible" — location: abstract
- Quality notes: Strengths — written by independent (non-UTT-founder) authors who have run both positive and null UTE studies; integrates the 2015–2016 null meta-analyses; policy-oriented clarity. Limitations — non-systematic review; short format; the gist/verbatim moderator rests mainly on the authors' own experiments and awaits independent large-N replication. No COI declared.

#### lejarraga2021experimental
- APA 7: Lejarraga, T., & Hertwig, R. (2021). How experimental methods shaped views on human competence and rationality. *Psychological Bulletin, 147*(6), 535–564. https://doi.org/10.1037/bul0000324
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/bul0000324 ; abstract via PubMed PMID 34843298
- Study type / Evidence level: Systematic methodological review and coding of 604 experiments / Level V
- Direction: conditional / mechanism (learning environment determines apparent intuitive competence)
- Key findings:
  - Codes 604 behavioural-decision experiments and shows that after 1974 the heuristics-and-biases protocol relied overwhelmingly on *described* scenarios rather than *experienced* feedback.
  - Where participants learn from experience (a kind-environment analogue), statistical intuitions (Bayesian reasoning, compound events) look far more competent than in description-based tasks.
  - Directly operationalises Hogarth's two-settings argument at the level of the research literature: conclusions about intuitive error-proneness depend on whether the learning setting was present at all.
- Quote anchor (≤25 words, verbatim): "the focus on description at the expense of learning has profoundly shaped the influential view of the error-proneness of human cognition" — location: abstract
- Quality notes: Strengths — large systematic corpus; first author is Hogarth's co-author on the kind/wicked framework, giving a direct bridge; published in a top review journal. Limitations — it is a review of methods, not a new test of intuitive accuracy; experience-based tasks may improve performance through explicit as well as intuitive learning; authors are proponents of the ecological-rationality programme (intellectual COI). Companion piece: Hertwig et al. (2021) *Cognition* 10.1016/j.cognition.2020.104580 (Crossref-verified, not separately listed).

#### hickman2020relationship
- APA 7: Hickman, L., Seyedsalehi, A., Cook, J. L., Bird, G., & Murphy, J. (2020). The relationship between heartbeat counting and heartbeat discrimination: A meta-analysis. *Biological Psychology, 156*, 107949. https://doi.org/10.1016/j.biopsycho.2020.107949
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1016/j.biopsycho.2020.107949 ; abstract via PubMed PMID 32911018
- Study type / Evidence level: Meta-analysis (22 studies) / Level I
- Direction: mechanism-only (measurement caution for interoception-based accounts of gut feeling)
- Key findings:
  - The two dominant cardiac interoceptive-accuracy tasks (heartbeat counting, heartbeat discrimination) correlate only weakly, questioning their interchangeable use.
  - Confidence ratings across tasks correlate moderately; metacognitive "interoceptive awareness" indices do not correlate at all.
  - Implication for SQ1/SQ2: claims that "better interoceptors make better intuitive decisions" (e.g., Dunn et al. 2010; Kandasamy et al. 2016) rest on a construct whose standard measures do not converge; effect direction may depend on task choice.
- Quote anchor (≤25 words, verbatim): "Pooled findings from 22 studies revealed a small relationship between accuracy scores on the measures." — location: abstract
- Quality notes: Strengths — meta-analytic; addresses the measurement foundation of the interoception–intuition link; authors include leading interoception methodologists. Limitations — does not itself test decision quality; heartbeat-counting confounds (time estimation, heart-rate knowledge) documented elsewhere are not resolved here. No COI declared. This search found no 2018–2026 Level I–II synthesis directly linking interoceptive accuracy to adult decision *quality*; the only recent empirical work surfaced was in children (out of scope).

#### remmers2020intuitive
- APA 7: Remmers, C., Zimmermann, J., Topolinski, S., Richter, M., Zander-Schellenberg, T., Weiler, L., & Knaevelsrud, C. (2020). Intuitive judgments in depression and the role of processing fluency and positive valence: A preregistered replication study. *Clinical Psychology in Europe, 2*(4), Article e2593. https://doi.org/10.32872/cpe.v2i4.2593
- Verification: Crossref title match YES | https://api.crossref.org/works/10.32872/cpe.v2i4.2593 ; open-access full text and abstract at https://cpe.psychopen.eu/index.php/cpe/article/view/2593
- Study type / Evidence level: Preregistered case–control replication (35 patients with depression, 35 healthy controls; Judgment of Semantic Coherence Task, three versions) / Level III
- Direction: mechanism-only (tests fluency and valence as triggers of coherence intuition)
- Key findings:
  - Did not replicate earlier reports of impaired intuitive coherence detection in depression; patients and controls performed equally on the JSCT.
  - Processing fluency did not significantly drive coherence judgments in patients, and its effect was not moderated by depression — a partial failure for the fluency–affect intuition model in this sample.
  - Positive valence increased "coherent" responses in both groups, supporting affect (not fluency) as a robust cue for coherence intuitions.
- Quote anchor (≤25 words, verbatim): "depressed patients and healthy controls did not differ in their general intuitive performance" — location: abstract (Results)
- Quality notes: Strengths — preregistered, open access, uses the canonical coherence-intuition paradigm (Bowers et al. 1990) with its originators (Topolinski) as co-authors. Limitations — modest N (70), clinical rather than general sample, accuracy measured as coherence detection (a perceptual-semantic intuition) rather than real-world decision quality. No COI declared.

#### hu2025intuition
- APA 7: Hu, T., Leppänen, I., & Franco, L. A. (2025). Intuition in decision making: Insights from drift diffusion modeling. *Journal of Behavioral Decision Making, 38*(3), Article e70033. https://doi.org/10.1002/bdm.70033
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1002/bdm.70033 (abstract present in Crossref record)
- Study type / Evidence level: Two behavioural studies with computational (drift-diffusion) modelling of choice and response time / Level III
- Direction: supports intuitive accuracy (conditional — reflective individuals rely more on intuition and perform better)
- Key findings:
  - Estimating a latent "intuitive position" from DDM parameters, Study 1 found that high Cognitive Reflection Test scorers performed better in risky choice *and* relied more on intuition, contradicting the view that reflection means less intuition.
  - Study 2 showed reliance on intuition is domain-specific (higher in social than risky decisions) and uncorrelated across domains, challenging trait-style self-report measures.
  - Offers a process-model alternative to self-report for measuring when intuition is used, relevant to how SQ1 mechanisms are operationalised.
- Quote anchor (≤25 words, verbatim): "individuals with high CRT scores had superior performance and relied more on intuition" — location: abstract
- Quality notes: Strengths — recent, model-based, addresses the measurement problem that plagues intuition research; peer-reviewed in a core JDM journal. Limitations — DDM "intuition" is an inferred starting-point/drift bias, not phenomenological gut feeling; no preregistration reported in the abstract; sample sizes not captured in this run; single lab, no independent replication yet. No COI declared.

#### norman2024dual
- APA 7: Norman, G., Pelaccia, T., Wyer, P., & Sherbino, J. (2024). Dual process models of clinical reasoning: The central role of knowledge in diagnostic expertise. *Journal of Evaluation in Clinical Practice, 30*(5), 788–796. https://doi.org/10.1111/jep.13998
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1111/jep.13998 ; abstract via PubMed PMID 38825755
- Study type / Evidence level: Critical literature review (fundamental cognition + clinical studies) / Level V
- Direction: conditional (accuracy tracks knowledge, not processing mode)
- Key findings:
  - Reviews evidence against the claim that diagnostic errors originate in System 1 biases and are corrected by System 2: errors arise in both modes and stem from lack of accessible knowledge.
  - Argues the two modes are better understood as consequences of the kind of knowledge retrieved (experiential vs formal) than as independent processes — a reframing of the dual-process account used in SQ1.
  - Updates the Norman et al. (2017) position (main list) with post-2017 trials; companion critical review Monteiro et al. (2020, *Medical Education* 54:66–73, 10.1111/medu.13872, Crossref-verified) attacks "generalisable thinking skills" and locates expertise in experiential knowledge.
- Quote anchor (≤25 words, verbatim): "they arise from lack of access to the appropriate knowledge, not from errors of processing" — location: abstract (Results)
- Quality notes: Strengths — most recent synthesis from the leading clinical-reasoning research group; explicitly adjudicates the bias-vs-knowledge debate; open access. Limitations — non-systematic; authors review largely their own trials (intellectual COI); medicine is a comparatively kind environment, so generalisation to wicked domains is limited. The search found no 2018–2026 randomised trial directly testing the Kahneman–Klein boundary conditions; this review and Lejarraga & Hertwig (2021) are the closest indirect tests.

#### hodgkinson2018dynamics
- APA 7: Hodgkinson, G. P., & Sadler-Smith, E. (2018). The dynamics of intuition and analysis in managerial and organizational decision making. *Academy of Management Perspectives, 32*(4), 473–492. https://doi.org/10.5465/amp.2016.0140
- Verification: Crossref title match YES | https://api.crossref.org/works/10.5465/amp.2016.0140 ; abstract read from the CORE record mirroring Surrey Research Insight / University of Manchester repository (AOM page returned HTTP 403; Crossref record carries no abstract)
- Study type / Evidence level: Theoretical review / Level VII
- Direction: mechanism-only
- Key findings:
  - Distinguishes default-interventionist from parallel-competitive dual-process theories and argues management research has conflated them, risking incoherent foundations.
  - Advocates parallel-competitive models in which intuition and analysis operate concurrently and interact, rather than intuition being merely a default that analysis overrides.
  - Sets the agenda for the "intuition in management" literature (Sadler-Smith; Akinci & Sadler-Smith) after 2018; no new accuracy data.
- Quote anchor (≤25 words, verbatim): "parallel-competitive formulations offer a more nuanced and realistic depiction of organizational decision makers as thinking and feeling beings" — location: abstract
- Quality notes: Strengths — authoritative cross-disciplinary review in a leading management journal; clarifies a conceptual confusion relevant to SQ1. Limitations — purely conceptual (Level VII); authors are long-standing advocates of intuition research (intellectual COI); no accuracy evidence. Included to satisfy the management-review cluster of the sweep; empirical management studies of intuition accuracy from 2018–2026 at Level I–III were not found.

**Verified in this sweep but not added (reasons):** Okoli & Watt (2018) *Management Decision* 56(5):1122–1134, 10.1108/md-04-2017-0333 — Crossref-verified, firefighting-derived model, but a conceptual paper (Level VII) duplicating hodgkinson2018dynamics at the theory level; Murphy & Hall (2021) *Front. Psychol.* 10.3389/fpsyg.2021.667326 — review subsumed under murphy2019predictive; Monteiro et al. (2020) *Med. Educ.* 10.1111/medu.13872 — subsumed under norman2024dual; Hertwig et al. (2021) *Cognition* 10.1016/j.cognition.2020.104580 — subsumed under lejarraga2021experimental; Quadt, Critchley & Garfinkel (2018) *Ann. N.Y. Acad. Sci.* 10.1111/nyas.13915 — Crossref title match confirmed via bibliographic search, neurobiological review (SQ1/SQ3 territory), no decision-accuracy data. **Not peer-reviewed, therefore not eligible:** Lufityanto & Pearson (2022) "Evaluating the Spidey sense: The metacognition of intuition", Research Square preprint 10.21203/rs.3.rs-1538076/v1 — no journal version located; the preregistered intuition-vs-prediction-market forecasting report (OSF preprint 10.31234/osf.io/4g5me_v1, 2026) — preprint only. No direct 2018–2026 replication of Lufityanto et al. (2016) was found.

### UNVERIFIED — EXCLUDED

- **None of the 26 candidates failed existence verification.** All 24 journal items returned matching Crossref titles; both monographs were confirmed from publisher/catalogue records.
- **betsch2010intuition** — Betsch, T., & Glöckner, A. (2010). Intuition in judgment and decision making: Extensive thinking without effort. *Psychological Inquiry, 21*(4), 279–294. https://doi.org/10.1080/1047840X.2010.517737. *Existence verified* (Crossref title match YES) but **excluded from the main list** because no verbatim abstract or full-text anchor could be obtained: Taylor & Francis page blocked by bot wall (HTTP 403 / "Just a moment" interstitial), and no abstract was available from Crossref, Semantic Scholar, OpenAlex or CORE. Its thesis (intuition as parallel-constraint-satisfaction that integrates large amounts of information without effort) is relevant to SQ1 mechanisms; recommend retrieval through institutional access in a later phase.
- **Seed DOI corrections (reported for transparency, not exclusions):** the DOI initially recalled for Acker (2008), 10.1017/S1930297500000486, resolves to Parker et al. (2007) "Maximizers versus satisficers" — the correct Acker DOI is 10.1017/s1930297500000863; the DOI initially recalled for Nieuwenstein et al. (2015), 10.1017/S1930297500003192, did not resolve — the correct DOI is 10.1017/S1930297500003144. A guessed Chicago Scholarship Online DOI for Hogarth (2001) did not resolve; the book was verified via its ISBN record instead.

### Search Limitations

1. **Access barriers to publisher pages.** ScienceDirect, Taylor & Francis, Guilford Press, SAGE, Epistemonikos and ProQuest all returned HTTP 403 or bot-wall interstitials to both the fetch tool and curl; APA PsycNet renders only via JavaScript. Abstracts were therefore sourced from Crossref, PubMed, CORE/Radboud Repository, ideas.repec.org, and publisher book pages. For **ambady1992thin** the quote anchor's verbatim status rests on identical text returned by two independent indexing records (ProQuest, Epistemonikos) surfaced through search, not on a directly fetched page; downstream consumers should treat this anchor as `abstract_only` with indirect provenance and re-verify against the PDF when institutional access is available.
2. **Verified-but-not-included sources (10), with reasons:**
   - acker2008new — Acker (2008) JDM 3(4):292–303, 10.1017/s1930297500000863 — superseded by the larger Nieuwenstein et al. (2015) meta-analysis, which incorporates its 17 experiments.
   - aegisdottir2006meta — Ægisdóttir et al. (2006) *The Counseling Psychologist* 34(3):341–382, 10.1177/0011000005285875 — redundant with Grove et al. (2000) (same direction, overlapping primary studies; 13% statistical advantage); cited in grove2000clinical quality notes.
   - evans2013dual — Evans & Stanovich (2013) *Perspectives on Psychological Science* 8(3):223–241, 10.1177/1745691612460685 — verified, Crossref abstract available; pure theory of dual processing (Level VII) better placed under SQ1 (mechanisms); excluded to hold N at 16.
   - phillips2004expertise — Phillips, Klein & Sieck (2004) chapter in *Blackwell Handbook of Judgment and Decision Making*, 10.1002/9780470752937.ch15 — book chapter, overlaps Kahneman & Klein (2009) and Salas et al. (2010).
   - mamede2010effect — Mamede et al. (2010) *JAMA* 304(11):1198–1203, 10.1001/jama.2010.1276 — randomised-order experiment (n = 36 residents) showing reflection corrects availability bias in second-year residents; summarised within norman2017causes; small N.
   - norman2014etiology — Norman et al. (2014) *Academic Medicine* 89(2):277–284, 10.1097/ACM.0000000000000105 — controlled trial (n = 204) of speed vs thoroughness instruction; summarised within norman2017causes.
   - dane2007exploring — Dane & Pratt (2007) *Academy of Management Review* 32(1):33–54, 10.5465/AMR.2007.23463682 — conceptual; superseded for SQ2 by the empirical dane2012trust.
   - dijksterhuis2006theory — Dijksterhuis & Nordgren (2006) *PoPS* 1(2), 10.1111/j.1745-6916.2006.00007.x — theory statement; SQ1 scope.
   - klein2008naturalistic — Klein (2008) *Human Factors* 50(3), 10.1518/001872008x288385 — overview of NDM; covered by kahneman2009conditions and salas2010expertise.
   - waroquier2009unconscious — Waroquier et al. (2009) JDM 4(7), 10.1017/s1930297500001765 — further failed UTA replication; subsumed in nieuwenstein2015making.
3. **Recency gap.** No included source is dated after 2017. Searches for 2018–2026 meta-analyses directly comparing intuitive vs deliberate accuracy (standard mode) surfaced only secondary discussions (e.g., Abadie & Waroquier 2016 CORE record extending the UTA null to other paradigms; replicationindex.com 2022 commentary). An extended-mode search for post-2018 syntheses (e.g., on intuition–expertise interactions or "wisdom of the inner crowd") is recommended before synthesis.
4. **Construct heterogeneity.** The clinical-vs-mechanical literature (Grove; Kuncel) compares *unaided human judgment* (which includes deliberate integration) against formulas, not gut feeling against deliberation per se; it bounds human holistic judgment rather than intuition narrowly. This is flagged in each entry.
5. **Sample sizes** for dane2012trust and the per-criterion k for kuncel2013mechanical could not be retrieved from accessible text and are marked as not captured rather than estimated.
6. **Instruction/data boundary note.** No fetched page contained text attempting to direct the agent; bot-wall interstitials ("Just a moment…", "Performing security verification") were treated as access failures, not instructions.

*AI disclosure: this bibliography was compiled by an AI agent (bibliography_agent) using deterministic DOI verification; all quotes are verbatim from the locations stated; synthesis and interpretation are deferred to later phases.*
