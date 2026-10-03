## Annotated Bibliography — SQ1

**Sub-question:** Through what cognitive and affective mechanisms do gut-feeling judgments arise? (families a–d)
**Agent:** bibliography_agent (Phase 2) · **Compiled:** 2026-10-03 · **Scope:** human adults; peer-reviewed empirical/theoretical work 1990–2026 plus justified seminal earlier works; English.

### Search Strategy

- **Databases / engines used:** Crossref REST API (`api.crossref.org/works/<DOI>`, deterministic existence + title check for every record); PubMed E-utilities (esearch by DOI → efetch abstract); Europe PMC REST; Semantic Scholar Graph API; OpenAlex; Unpaywall (open-access location check); general web search (standard mode, 6 queries); publisher / institutional pages via WebFetch (AOM, OUP, ScienceDirect, APA PsycNet, WUSTL profiles).
- **Seed handling:** all 20 seeds named in the task were resolved to a DOI and run through Crossref; 7 further candidates surfaced during search were verified the same way (30 records total).
- **Keywords / Boolean strings (web search):** `("intuition" OR "gut feeling") AND (mechanism OR "implicit learning" OR fluency OR coherence)`; `interoceptive accuracy AND decision making AND ("Iowa gambling task" OR heartbeat)`; `"Measuring intuition" Lufityanto Pearson replication`; `intuition expertise accuracy (systematic review OR meta-analysis) 2020..2023`; `Reber 1989 "Implicit learning and tacit knowledge" abstract`; `Bowers Regehr Balthazard Parker 1990 "Intuition in the context of discovery" abstract`.
- **Date range:** 1990–2026 for inclusion; pre-1990 works considered only when seminal and explicitly justified (none ultimately annotated, see Search Limitations).
- **last_searched_at:** 2026-10-03
- **Inclusion criteria:** (i) peer-reviewed journal article; (ii) directly addresses at least one of construct families a–d as a mechanism or boundary condition of judgments reached without conscious access to their basis; (iii) human adult participants or theory about them; (iv) English; (v) Crossref title match confirmed; (vi) a verbatim ≤25-word quote retrievable from the abstract or accessible full text.
- **Exclusion criteria:** child/adolescent samples; non-peer-reviewed; clinical populations only without a healthy-adult comparison relevant to mechanism; records whose existence verified but no abstract/full text was reachable (cannot carry a claim-faithfulness anchor → not annotated, listed under Search Limitations); redundancy with an already-annotated source from the same paradigm/lab line once the size cap was reached.
- **DISTRIBUTIONAL_SKEW_ADVISORY:** (1) Publication type: 18/18 (100%) journal articles — by design, given the ≥60% journal requirement, but readers should note no books/monographs (e.g., Damasio 1994, Klein 1998, Weiskrantz 1986) are annotated. (2) Sample provenance: 100% of empirical entries use Western (North American / Western European) laboratory or field samples, predominantly university students; no non-Western or community-representative samples. (3) Evidence level: 10/18 (56%) are reviews/theory (Levels V–VII) — below the 70% threshold, no advisory. Construct families: max concentration 6/18 (33%) — no advisory.

### PRISMA-style Flow

- **identified:** 30 records (20 task seeds resolved to DOIs + 7 additional candidates surfaced in search + 3 alternates checked when seed anchors proved unreachable; after de-duplication 30 unique DOIs)
- **screened (title/abstract against scope):** 30 → 29 retained (1 excluded: child-sample interoception study, 10.3389/fpsyg.2022.1070037, out of scope; not Crossref-verified because excluded before verification)
- **verified (Crossref title match):** 29 / 29 (100%); 0 failures
- **included (annotated below):** 18. Not annotated: 11 verified records — 3 with no reachable abstract/full text for a quote anchor (Reber 1989; Bowers et al. 1990; Weiskrantz et al. 1974) and 8 held back for redundancy/size cap (listed with DOIs under Search Limitations).

### Sources (N = 18)

#### lieberman2000intuition
- APA 7: Lieberman, M. D. (2000). Intuition: A social cognitive neuroscience approach. *Psychological Bulletin, 126*(1), 109–137. https://doi.org/10.1037/0033-2909.126.1.109
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/0033-2909.126.1.109 (abstract via PubMed PMID 10668352)
- Study type / Evidence level: Narrative integrative review (behavioural + neuropsychological + neuroimaging) / Level V (with Level VII theoretical proposal)
- Construct family: a
- Direction: mechanism-only
- Key findings:
  - Proposes implicit learning as the cognitive substrate of (social) intuition, linking the two via conceptual correspondence and converging neuropsychological data.
  - Identifies the basal ganglia (caudate, putamen) as central to both implicit learning and intuition; Huntington's/Parkinson's data support the mapping.
  - Notes that explicit attempts to learn a sequence can interfere with implicit learning — an early boundary condition on when intuitive knowledge forms.
- Quote anchor (≤25 words, verbatim): "This review proposes that implicit learning processes are the cognitive substrate of social intuition." — location: abstract
- Quality notes: Strengths: multilevel (social/cognitive/neural) synthesis, highly cited anchor for family (a). Limitations: narrative not systematic; neural claims predate modern meta-analytic imaging; no direct test of judgment accuracy. Replication status: framework widely adopted; specific basal-ganglia claim partially supported in later work but not formally replicated as a whole. COI: none declared.

#### dane2007exploring
- APA 7: Dane, E., & Pratt, M. G. (2007). Exploring intuition and its role in managerial decision making. *Academy of Management Review, 32*(1), 33–54. https://doi.org/10.5465/amr.2007.23463682
- Verification: Crossref title match YES | https://api.crossref.org/works/10.5465/amr.2007.23463682 (abstract via https://profiles.wustl.edu/en/publications/exploring-intuition-and-its-role-in-managerial-decision-making/; AOM page returned HTTP 403)
- Study type / Evidence level: Conceptual/theoretical review with propositions / Level VII
- Construct family: a (with explicit affective component bridging to b)
- Direction: conditional
- Key findings:
  - Defines intuition as affectively charged judgments produced by rapid, nonconscious, holistic associations — the most-cited working definition in management research.
  - Separates intuition from insight and from rational analysis; proposes that intuition effectiveness depends on domain knowledge, implicit vs. explicit learning history, and task characteristics (judgmental vs. intellective).
  - Supplies testable propositions on when expert intuition should outperform analysis (complex, holistic tasks in domains with learned schemas).
- Quote anchor (≤25 words, verbatim): "defining intuitions as affectively charged judgments that arise through rapid, nonconscious, and holistic associations" — location: abstract
- Quality notes: Strengths: integrative definition reused across disciplines; clear boundary-condition propositions relevant to the primary RQ. Limitations: no data; management-oriented; propositions only partly tested in later empirical work. Replication status: n/a (theory). COI: none declared.

#### hodgkinson2008intuition
- APA 7: Hodgkinson, G. P., Langan-Fox, J., & Sadler-Smith, E. (2008). Intuition: A fundamental bridging construct in the behavioural sciences. *British Journal of Psychology, 99*(1), 1–27. https://doi.org/10.1348/000712607X216666
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1348/000712607X216666 (abstract in Crossref record)
- Study type / Evidence level: Narrative review / Level V
- Construct family: a (cross-cutting to b and c)
- Direction: mechanism-only
- Key findings:
  - Positions intuition within dual-process frameworks and reviews models that unify cognition and affect.
  - Distinguishes intuition from insight and related constructs; surveys social-cognitive-neuroscience evidence for separable systems.
  - Identifies a dispersed, conceptually underdeveloped literature and sets a research agenda.
- Quote anchor (≤25 words, verbatim): "we clarify and distinguish intuition from related constructs, such as insight, and review a number of theoretical models that attempt to unify cognition and affect" — location: abstract
- Quality notes: Strengths: broad cross-domain coverage (education, management, health); useful construct map. Limitations: not systematic; no quantitative synthesis; neural section now dated. Replication status: n/a. COI: none declared.

#### kahneman2009conditions
- APA 7: Kahneman, D., & Klein, G. (2009). Conditions for intuitive expertise: A failure to disagree. *American Psychologist, 64*(6), 515–526. https://doi.org/10.1037/a0016755
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/a0016755 (abstract via PubMed PMID 19739881)
- Study type / Evidence level: Expert position paper reconciling heuristics-and-biases and naturalistic decision making (incl. Klein's recognition-primed decision model) / Level VII
- Construct family: a
- Direction: conditional
- Key findings:
  - Intuitive expertise is genuine only where the environment is sufficiently regular (high-validity cues) and the person has had adequate opportunity to learn those regularities through feedback.
  - Where these conditions fail, confident intuitions are typically overconfident and biased; subjective confidence does not index accuracy.
  - Provides the canonical boundary-condition statement used in later intuition research; frames RPD as skilled pattern recognition.
- Quote anchor (≤25 words, verbatim): "Subjective experience is not a reliable indicator of judgment accuracy." — location: abstract
- Quality notes: Strengths: joint statement by the two leading opposing-tradition authors; directly specifies boundary conditions for the primary RQ. Limitations: no new data; criteria are qualitative and hard to operationalise ex ante. Replication status: n/a (conceptual), but the environment-validity criterion is consistent with later forecasting/expert-judgment reviews. COI: none declared.

#### shanks1994characteristics
- APA 7: Shanks, D. R., & St. John, M. F. (1994). Characteristics of dissociable human learning systems. *Behavioral and Brain Sciences, 17*(3), 367–395. https://doi.org/10.1017/S0140525X00035032
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1017/S0140525X00035032 (abstract in Crossref record)
- Study type / Evidence level: Critical review (target article with open peer commentary) / Level V
- Construct family: a
- Direction: against (challenges the unconscious-learning basis claimed for implicit pattern recognition)
- Key findings:
  - Reviews subliminal learning, conditioning, artificial grammar learning, instrumental learning and sequence-learning RTs; argues none satisfactorily establishes learning without awareness.
  - Introduces the information and sensitivity criteria for awareness tests, which later implicit-learning work (incl. Reber's paradigm) had to meet.
  - Reframes "implicit" knowledge as potentially fragment/instance-based and partially conscious — a direct constraint on how family (a) mechanisms should be described.
- Quote anchor (≤25 words, verbatim): "We conclude that unconscious learning has not been satisfactorily established in any of these areas." — location: abstract
- Quality notes: Strengths: methodologically rigorous critique that set awareness-measurement standards; extensive commentary. Limitations: pre-dates process-dissociation and subjective-measure advances (e.g., Dienes); conclusion contested in subsequent decades. Replication status: the methodological criteria remain standard; the strong negative conclusion is not the current consensus. COI: none declared. Included in place of Reber (1989), whose abstract/full text could not be accessed for an anchor (see Search Limitations).

#### bechara1997deciding
- APA 7: Bechara, A., Damasio, H., Tranel, D., & Damasio, A. R. (1997). Deciding advantageously before knowing the advantageous strategy. *Science, 275*(5304), 1293–1295. https://doi.org/10.1126/science.275.5304.1293
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1126/science.275.5304.1293 (abstract in Crossref record)
- Study type / Evidence level: Controlled non-randomised lesion-vs-control experiment with concurrent psychophysiology / Level III
- Construct family: b
- Direction: supports intuitive accuracy
- Key findings:
  - Healthy participants on the Iowa Gambling Task shifted toward advantageous decks before they could verbalise why ("pre-hunch" period).
  - Anticipatory skin-conductance responses preceded disadvantageous choices in healthy participants but were absent in ventromedial-prefrontal patients, who kept choosing badly even once they knew the correct strategy.
  - Interpreted as a nonconscious somatic biasing step preceding overt reasoning (somatic marker hypothesis).
- Quote anchor (≤25 words, verbatim): "Normals began to choose advantageously before they realized which strategy worked best" — location: abstract
- Quality notes: Strengths: landmark multi-measure design (behaviour + SCR + self-report); seeded the entire family (b). Limitations: very small samples (10 controls, 6 patients); coarse knowledge probes every 10 trials; knowledge assessed by open-ended questions only. Replication status: core behavioural pattern replicated, but the "deciding before knowing" claim was directly challenged by Maia & McClelland (2004) and the SMH critiqued by Dunn et al. (2006). COI: none declared.

#### maia2004reexamination
- APA 7: Maia, T. V., & McClelland, J. L. (2004). A reexamination of the evidence for the somatic marker hypothesis: What participants really know in the Iowa gambling task. *Proceedings of the National Academy of Sciences, 101*(45), 16075–16080. https://doi.org/10.1073/pnas.0406666101
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1073/pnas.0406666101 (abstract in Crossref record)
- Study type / Evidence level: Behavioural experiment with healthy adults using more sensitive knowledge probes; direct conceptual replication/critique / Level III
- Construct family: b
- Direction: against (the nonconscious-guidance reading of Bechara et al. 1997)
- Key findings:
  - With quantitative, trial-by-trial knowledge questions, participants reported conscious knowledge of the advantageous strategy at least as reliably as they behaved advantageously.
  - When participants behaved advantageously their verbal reports nearly always contained enough information to account for the behaviour.
  - Concludes that the IGT does not demonstrate decision guidance by nonconscious somatic markers; conscious knowledge suffices.
- Quote anchor (≤25 words, verbatim): "participants report knowledge of the advantageous strategy more reliably than they behave advantageously" — location: abstract
- Quality notes: Strengths: methodologically targeted replication with improved awareness measures; strongly cited counterpoint. Limitations: no psychophysiology; healthy sample only; reactivity of frequent probing debated (Bechara et al. 2005 reply). Replication status: key finding (knowledge precedes/accompanies advantageous choice) replicated in later studies with sensitive probes. COI: none declared.

#### dunn2006somatic
- APA 7: Dunn, B. D., Dalgleish, T., & Lawrence, A. D. (2006). The somatic marker hypothesis: A critical evaluation. *Neuroscience & Biobehavioral Reviews, 30*(2), 239–271. https://doi.org/10.1016/j.neubiorev.2005.07.001
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1016/j.neubiorev.2005.07.001 (abstract via PubMed PMID 16197997)
- Study type / Evidence level: Comprehensive critical review of IGT, lesion and psychophysiological literatures / Level V
- Construct family: b
- Direction: conditional (SMH under-specified; body-feedback mechanism not established)
- Key findings:
  - IGT evidence is weakened by cognitive penetrability of the reward schedule, ambiguous psychophysiology, and a lack of causal tests of peripheral feedback.
  - Lesion data implicating VMPFC are consistent with alternative, more parsimonious accounts (e.g., reversal-learning deficits).
  - Calls for direct manipulation/measurement of interoceptive signals — the agenda taken up by Dunn et al. (2010) and Kandasamy et al. (2016).
- Quote anchor (≤25 words, verbatim): "their interpretation is undermined by the cognitive penetrability of the reward/punishment schedule, ambiguity surrounding interpretation of the psychophysiological data, and a shortage of causal evidence" — location: abstract
- Quality notes: Strengths: most thorough critical synthesis of the SMH literature; explicit evaluation of each causal link. Limitations: narrative (no meta-analysis); pre-2006 literature only. Replication status: n/a (review). COI: none declared.

#### dunn2010listening
- APA 7: Dunn, B. D., Galton, H. C., Morgan, R., Evans, D., Oliver, C., Meyer, M., Cusack, R., & Lawrence, A. D. (2010). Listening to your heart: How interoception shapes emotion experience and intuitive decision making. *Psychological Science, 21*(12), 1835–1844. https://doi.org/10.1177/0956797610389191
- Verification: Crossref title match YES (Crossref short title "Listening to Your Heart") | https://api.crossref.org/works/10.1177/0956797610389191 (abstract in Crossref record)
- Study type / Evidence level: Two individual-differences studies combining heartbeat-tracking, psychophysiology and an intuitive decision task / Level IV
- Construct family: b
- Direction: conditional
- Key findings:
  - Study 1: better heartbeat perception strengthened the coupling between heart-rate reactions and subjective arousal ratings.
  - Study 2: interoceptive ability amplified the influence of anticipatory bodily signals on decisions — improving choices when the signals favoured good options and worsening them when they favoured bad ones.
  - Establishes that both generation and perception of bodily signals matter; bodily guidance is not uniformly beneficial.
- Quote anchor (≤25 words, verbatim): "increasing interoception ability either helped or hindered adaptive intuitive decision making, depending on whether the anticipatory bodily signals generated favored advantageous or disadvantageous choices" — location: abstract
- Quality notes: Strengths: first direct test of the interoception moderator predicted by SMH; valence/arousal dissociation. Limitations: correlational individual-differences design; modest samples (reported in paper, not re-extracted here); heartbeat-counting task has known validity concerns (see Garfinkel et al. 2015 and later critiques). Replication status: moderation pattern partially replicated (e.g., Werner et al. 2009 direction; mixed later findings). COI: none declared.

#### kandasamy2016interoceptive
- APA 7: Kandasamy, N., Garfinkel, S. N., Page, L., Hardy, B., Critchley, H. D., Gurnell, M., & Coates, J. M. (2016). Interoceptive ability predicts survival on a London trading floor. *Scientific Reports, 6*, Article 32986. https://doi.org/10.1038/srep32986
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1038/srep32986 (abstract in Crossref record)
- Study type / Evidence level: Field comparison of professional traders vs. matched controls with predictive correlations / Level IV
- Construct family: b
- Direction: supports intuitive accuracy (in a real-world, high-feedback environment)
- Key findings:
  - Traders showed higher heartbeat-detection accuracy than matched non-trader controls.
  - Among traders, interoceptive accuracy predicted relative profitability and years of survival in the industry.
  - Links laboratory interoception–risk findings to real-world performance consistent with somatic/affective guidance.
- Quote anchor (≤25 words, verbatim): "the interoceptive ability of traders predicted their relative profitability" — location: abstract
- Quality notes: Strengths: rare ecological field test with objective performance outcome; team includes leading interoception researchers (Garfinkel, Critchley). Limitations: small trader sample (reported as 18 traders), cross-sectional, survivorship/selection confounds, heartbeat-counting validity concerns. Replication status: no direct replication located. COI: none declared.

#### bolte2005speed
- APA 7: Bolte, A., & Goschke, T. (2005). On the speed of intuition: Intuitive judgments of semantic coherence under different response deadlines. *Memory & Cognition, 33*(7), 1248–1255. https://doi.org/10.3758/BF03193226
- Verification: Crossref title match YES | https://api.crossref.org/works/10.3758/BF03193226 (abstract via PubMed PMID 16532857)
- Study type / Evidence level: Two within-subject experiments with manipulated response deadlines (Bowers-type semantic coherence/DOT paradigm) / Level II
- Construct family: c
- Direction: supports intuitive accuracy
- Key findings:
  - Participants discriminated coherent from incoherent word triads above chance even when they could not retrieve the common associate.
  - Above-chance discrimination held with response lags as short as 1.5 s, showing intuitive coherence judgments are fast and do not require extended deliberation.
  - Supports a spreading-activation account in which partial semantic activation yields a coherence feeling before explicit retrieval.
- Quote anchor (≤25 words, verbatim): "participants discriminated coherent and incoherent triads reliably better than chance, even when they did not consciously retrieve the solution word" — location: abstract
- Quality notes: Strengths: tight timing control; direct test of a defining property (speed). Limitations: student samples; semantic-triad paradigm has limited ecological validity; accuracy above chance is modest. Replication status: core effect widely replicated across the Bolte/Goschke, Topolinski/Strack and Volz lab lines. COI: none declared.

#### topolinski2009architecture
- APA 7: Topolinski, S., & Strack, F. (2009). The architecture of intuition: Fluency and affect determine intuitive judgments of semantic and visual coherence and judgments of grammaticality in artificial grammar learning. *Journal of Experimental Psychology: General, 138*(1), 39–63. https://doi.org/10.1037/a0014678
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/a0014678 (abstract via PubMed PMID 19203169)
- Study type / Evidence level: Eleven randomised laboratory experiments with fluency and affect manipulations / Level II
- Construct family: c (bridging to b via affect)
- Direction: conditional (identifies the mechanism and shows it can be hijacked to produce false intuitions)
- Key findings:
  - Semantic coherence increases processing fluency, which triggers brief positive affect; this affect is the experiential basis of coherence intuitions.
  - Experimentally induced fluency and positive affect independently and additively raised "coherent" judgments regardless of true coherence, even reversing accuracy.
  - Effects generalised to visual coherence and to grammaticality judgments in artificial grammar learning; participants could not correct for affect even when aware of it.
- Quote anchor (≤25 words, verbatim): "high fluency and positive affect independently and additively increased the probability that triads would be judged as coherent, irrespective of actual coherence" — location: abstract
- Quality notes: Strengths: large multi-experiment programme with converging manipulations; the most complete mechanistic account in family (c). Limitations: student samples; subliminal priming manipulations have since faced replicability scrutiny; facial-feedback manipulation later questioned (Wagenmakers et al. 2016 RRR). Replication status: fluency→coherence link replicated in multiple labs; specific affect-induction routes less consistently. COI: none declared.

#### horr2014feeling
- APA 7: Horr, N. K., Braun, C., & Volz, K. G. (2014). Feeling before knowing why: The role of the orbitofrontal cortex in intuitive judgments—an MEG study. *Cognitive, Affective, & Behavioral Neuroscience, 14*(4), 1271–1285. https://doi.org/10.3758/s13415-014-0286-7
- Verification: Crossref title match YES | https://api.crossref.org/works/10.3758/s13415-014-0286-7 (abstract via PubMed PMID 24789812)
- Study type / Evidence level: Within-subject MEG experiment, visual coherence judgment task / Level III
- Construct family: c
- Direction: mechanism-only
- Key findings:
  - Builds directly on Bowers et al.'s (1990) two-stage model; proposes the orbitofrontal cortex (OFC) as an early integrator producing a coarse "gist" representation experienced as a gut feeling.
  - OFC activation on coherent trials began earlier than activation in temporal object-recognition areas, and was independent of physical stimulus properties.
  - Supports a feed-forward "feeling-before-knowing" mechanism rather than a post-recognition evaluation.
- Quote anchor (≤25 words, verbatim): "this increase in activation began earlier in the OFC than in temporal object recognition areas" — location: abstract
- Quality notes: Strengths: temporal resolution of MEG addresses the ordering question fMRI (Volz & von Cramon 2006) could not. Limitations: small neuroimaging sample; source localisation of OFC with MEG is challenging; no accuracy-outcome manipulation. Replication status: converges with Volz & von Cramon (2006) fMRI and Zander et al. (2015) fMRI from the same lab line; no independent-lab replication located. COI: none declared.

#### lufityanto2016measuring
- APA 7: Lufityanto, G., Donkin, C., & Pearson, J. (2016). Measuring intuition: Nonconscious emotional information boosts decision accuracy and confidence. *Psychological Science, 27*(5), 622–634. https://doi.org/10.1177/0956797616629403
- Verification: Crossref title match YES (Crossref short title "Measuring Intuition") | https://api.crossref.org/works/10.1177/0956797616629403 (abstract in Crossref record)
- Study type / Evidence level: Four laboratory experiments with randomised subliminal-prime conditions plus evidence-accumulation modelling / Level II
- Construct family: c (nonconscious affective input to a conscious perceptual decision; bridges to b)
- Direction: supports intuitive accuracy
- Key findings:
  - Subliminal emotional images presented during a conscious motion-discrimination task increased accuracy and confidence and reduced response times when valence predicted the correct response.
  - Effects depended on the specific predictive pairing of valence and motion direction, implying learning of the contingency.
  - A model accumulating both skin-conductance (physiological) and decisional evidence fit the data, operationalising "intuition" as nonconscious emotional evidence feeding a decision.
- Quote anchor (≤25 words, verbatim): "nonconscious emotional information can boost accuracy and confidence in a concurrent emotion-free decision task, while also speeding up response times" — location: abstract
- Quality notes: Strengths: novel measurable paradigm; combines behaviour, physiology and computational modelling. Limitations: small samples per experiment; subliminality established by awareness checks that are debated; valence–direction pairing could permit implicit learning rather than "intuition" per se. Replication status: no independent direct replication located (searched 2026-10-03); the broader masked-affective-priming literature is reviewed by Rohr & Wentura (2021). COI: none declared.

#### zander2016intuition
- APA 7: Zander, T., Öllinger, M., & Volz, K. G. (2016). Intuition and insight: Two processes that build on each other or fundamentally differ? *Frontiers in Psychology, 7*, Article 1395. https://doi.org/10.3389/fpsyg.2016.01395
- Verification: Crossref title match YES | https://api.crossref.org/works/10.3389/fpsyg.2016.01395 (abstract via Semantic Scholar record)
- Study type / Evidence level: Theoretical review / Level V (with Level VII integrative proposal)
- Construct family: c
- Direction: mechanism-only
- Key findings:
  - Contrasts intuition (experience-based, gradual, coherence-sensing) with insight (sudden, discontinuous restructuring) and reviews the paradigms of each tradition.
  - Grounds the intuition account in Bowers et al. (1990) and the subsequent coherence-judgment literature (Bolte & Goschke; Topolinski & Strack; Volz).
  - Proposes an integrative framework in which intuitive coherence detection can precede and feed insight.
- Quote anchor (≤25 words, verbatim): "intuition has been understood as an experience-based and gradual process, whereas insight is regarded as a genuinely discontinuous phenomenon" — location: abstract
- Quality notes: Strengths: clear conceptual mapping of family (c) mechanisms and paradigms; open access. Limitations: narrative; same-lab perspective (Volz group). Replication status: n/a. COI: none declared.

#### koriat1993how
- APA 7: Koriat, A. (1993). How do we know that we know? The accessibility model of the feeling of knowing. *Psychological Review, 100*(4), 609–639. https://doi.org/10.1037/0033-295X.100.4.609
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/0033-295X.100.4.609 (abstract via PubMed PMID 8255951)
- Study type / Evidence level: Theoretical model with three supporting experiments / Level VII (theory) incorporating Level II experiments
- Construct family: d
- Direction: conditional (FOK is inferential; its accuracy tracks the validity of accessible partial information)
- Key findings:
  - Feeling-of-knowing judgments are computed from the amount and intensity of partial information accessed during a retrieval attempt, not from privileged access to a memory monitor.
  - Because FOK is parasitic on accessibility, it is accurate to the extent that accessible partial information is itself correct — explaining both FOK validity and its illusions.
  - Provides the template "metacognitive feelings are heuristic inferences" later applied to intuition and fluency research.
- Quote anchor (≤25 words, verbatim): "The results challenge the view that FOK is based on a direct, privileged access to an internal monitor." — location: abstract
- Quality notes: Strengths: foundational, formally specified model; empirical tests included. Limitations: laboratory memory tasks only; experiments modest in size. Replication status: accessibility effects on FOK extensively replicated; cue-familiarity accounts (Metcalfe; Reder) coexist as complementary. COI: none declared.

#### brown2003review
- APA 7: Brown, A. S. (2003). A review of the déjà vu experience. *Psychological Bulletin, 129*(3), 394–413. https://doi.org/10.1037/0033-2909.129.3.394
- Verification: Crossref title match YES | https://api.crossref.org/works/10.1037/0033-2909.129.3.394 (abstract via PubMed PMID 12784936)
- Study type / Evidence level: Review of descriptive (survey and case) studies / Level V
- Construct family: d
- Direction: against (déjà vu is a familiarity feeling that is, by definition, not veridical)
- Key findings:
  - Roughly 60% of people report déjà vu; frequency declines with age and rises with stress, fatigue, education and SES.
  - Four explanatory classes: dual processing, neurological (seizure/transmission), memory (implicit familiarity of unrecognised stimuli), attentional.
  - Argues for laboratory models of déjà vu as an "illusion of recognition" — a knowing-feeling dissociated from accurate knowledge.
- Quote anchor (≤25 words, verbatim): "About 60% of the population has experienced déjà vu, and its frequency decreases with age." — location: abstract
- Quality notes: Strengths: definitive synthesis of a century of reports; sets up experimental déjà vu research (Cleary 2008; Cleary & Claxton 2018). Limitations: evidence base is retrospective self-report; no mechanism tested directly. Replication status: prevalence and age pattern replicated in later surveys. COI: none declared.

#### cowey2010blindsight
- APA 7: Cowey, A. (2010). The blindsight saga. *Experimental Brain Research, 200*(1), 3–24. https://doi.org/10.1007/s00221-009-1914-2
- Verification: Crossref title match YES (Crossref issued 2009 online-first; print volume 200, 2010) | https://api.crossref.org/works/10.1007/s00221-009-1914-2 (abstract via Europe PMC, PMID 19568736)
- Study type / Evidence level: Narrative review of human and monkey blindsight / Level V
- Construct family: d
- Direction: conditional (genuine knowledge without awareness exists, but artefacts are frequent and everyday usefulness is unresolved)
- Key findings:
  - Blindsight: patients with V1 lesions detect, localise and discriminate stimuli they deny seeing — a paradigmatic case of implicit knowledge (Weiskrantz et al. 1974 origin).
  - Catalogues methodological artefacts (light scatter, criterion shifts, spared islands) that are often ignored and leave several claimed properties uncertain.
  - Monkey lesion work now directly informs human blindsight; whether blindsight is useful outside the lab is an open question.
- Quote anchor (≤25 words, verbatim): "detect, localise and even discriminate visual stimuli that they deny seeing" — location: abstract
- Quality notes: Strengths: authoritative, artefact-aware review by a leading figure; integrates primate and human data. Limitations: narrative; author is an insider to the debates. Replication status: core blindsight phenomenon replicated across patients (e.g., GY, DB) and monkeys, with ongoing criterion/response-bias debates. COI: none declared. Substitutes for Weiskrantz et al. (1974), which verified but has no accessible abstract/summary text for an anchor.

### UNVERIFIED — EXCLUDED

None. All 29 records that passed scope screening resolved through the Crossref API with an exact or near-exact title match (Crossref returns short-form titles for Dunn et al. 2010 "Listening to Your Heart" and Lufityanto et al. 2016 "Measuring Intuition"; subtitles confirmed on the publisher landing pages). No seed named in the task failed existence verification.

(Screened out before verification, not a verification failure: Pollatos et al., 10.3389/fpsyg.2022.1070037, interoceptive accuracy and IGT in children aged 6–11 — out of the human-adult scope.)

### Search Limitations

1. **Verified but not annotated — no accessible text for a quote anchor (3).** Existence confirmed via Crossref, but the abstract/full text was unreachable through every route tried (APA PsycNet renders only via JavaScript; ScienceDirect returned HTTP 403; OUP shows PDF-only; Unpaywall lists no open copy; PubMed/Europe PMC/Semantic Scholar/OpenAlex carry no abstract): Reber, A. S. (1989). Implicit learning and tacit knowledge. *JEP: General, 118*(3), 219–235, https://doi.org/10.1037/0096-3445.118.3.219 (seminal, pre-1990 — would be justified as the founding implicit-learning synthesis); Bowers, K. S., Regehr, G., Balthazard, C., & Parker, K. (1990). Intuition in the context of discovery. *Cognitive Psychology, 22*(1), 72–110, https://doi.org/10.1016/0010-0285(90)90004-N (founding paradigm for family c; its content is carried here via Bolte & Goschke 2005, Topolinski & Strack 2009, Horr et al. 2014 and Zander et al. 2016, all of which build on it explicitly); Weiskrantz, L., Warrington, E. K., Sanders, M. D., & Marshall, J. (1974). Visual capacity in the hemianopic field following a restricted occipital ablation. *Brain, 97*(1), 709–728, https://doi.org/10.1093/brain/97.1.709 (seminal pre-1990 blindsight report; represented via Cowey 2010). The synthesis agent may cite these only with a locator obtained from the full text.
2. **Verified but held back for redundancy / size cap (8).** Damasio, A. R. (1996). The somatic marker hypothesis and the possible functions of the prefrontal cortex. *Phil. Trans. R. Soc. B, 351*(1346), 1413–1420, https://doi.org/10.1098/rstb.1996.0125 (theory; covered by Bechara 1997 / Dunn 2006). Klein, G. (2008). Naturalistic decision making. *Human Factors, 50*(3), 456–460, https://doi.org/10.1518/001872008X288385 (RPD overview; covered by Kahneman & Klein 2009). Werner, N. S., Jung, K., Duschek, S., & Schandry, R. (2009). Enhanced cardiac perception is associated with benefits in decision-making. *Psychophysiology, 46*(6), 1123–1129, https://doi.org/10.1111/j.1469-8986.2009.00855.x (supports; convergent with Dunn 2010 — useful for replication-status claims). Garfinkel, S. N., Seth, A. K., Barrett, A. B., Suzuki, K., & Critchley, H. D. (2015). Knowing your own heart. *Biological Psychology, 104*, 65–74, https://doi.org/10.1016/j.biopsycho.2014.11.004 (measurement model of interoception, N=80; relevant to interpreting Dunn 2010 / Kandasamy 2016). Volz, K. G., & von Cramon, D. Y. (2006). What neuroscience can tell about intuitive processes in the context of perceptual discovery. *J. Cognitive Neuroscience, 18*(12), 2077–2087, https://doi.org/10.1162/jocn.2006.18.12.2077 (fMRI, OFC; superseded in temporal detail by Horr 2014). Zander, T., Horr, N. K., Bolte, A., & Volz, K. G. (2016). Intuitive decision making as a gradual process. *Brain and Behavior, 6*(1), e00420, https://doi.org/10.1002/brb3.420. Topolinski, S., & Reber, R. (2010). Gaining insight into the "Aha" experience. *Current Directions in Psychological Science, 19*(6), 402–405, https://doi.org/10.1177/0963721410388803 (fluency account of insight). Rohr, M., & Wentura, D. (2021). Degree and complexity of non-conscious emotional information processing – A review of masked priming studies. *Frontiers in Human Neuroscience, 15*, 689369, https://doi.org/10.3389/fnhum.2021.689369 (context for Lufityanto 2016 replicability). Cleary, A. M. (2008). Recognition memory, familiarity, and déjà vu experiences. *Current Directions in Psychological Science, 17*(5), 353–357, https://doi.org/10.1111/j.1467-8721.2008.00605.x (experimental déjà vu; complements Brown 2003). Cleeremans, A., Destrebecqz, A., & Boyer, M. (1998). Implicit learning: News from the front. *TICS, 2*(10), 406–416, https://doi.org/10.1016/S1364-6613(98)01232-7 (Crossref-verified; no abstract retrieved).
3. **No quantitative meta-analysis located** for any of the four families within the search; Level I evidence is therefore absent from the annotated set. Candidate meta-analyses on IGT/interoception and on expert-intuition accuracy should be sought in a targeted follow-up (e.g., Scopus/PsycINFO, which were not accessible here).
4. **Sample sizes** were extracted only where stated in the abstract or confidently known (Bechara 1997; Garfinkel 2015; Kandasamy 2016 flagged "as reported"); other entries defer to the full text.
5. **Replication status** is based on the literature retrieved in this pass; absence of a located replication (Lufityanto 2016; Kandasamy 2016) is not evidence that none exists.
6. **Access limitations:** APA journals' abstracts were obtained only where PubMed indexes them; AOM, Elsevier (pre-1995) and OUP (1974) landing pages blocked automated retrieval. Quote anchors are therefore all abstract-level; no page-level anchors were minted.
7. **Instruction/data boundary:** No fetched page contained text attempting to direct the agent; one search-tool reminder to "include sources as hyperlinks" was tool scaffolding, not source content, and was disregarded.
