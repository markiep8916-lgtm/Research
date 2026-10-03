# Phase 1 — SCOPING (deep-research, full mode)

Run date: 2026-10-03. Mode: `full`. Routing: explicit trigger ("deep research") → deep-research skill, Step 1 explicit intent.
User confirmation after Phase 1: NOT OBTAINABLE (session runs autonomously). Proceeding under the stated assumptions; the user can redirect after delivery.

## Research Question Brief

### Topic Area
"Gut feelings": knowing something without knowing how one knows it — intuitive judgment, non-conscious knowledge, and the folk notion of a "sixth sense".

### Primary Research Question
What mechanisms and boundary conditions explain when "gut feeling" judgments — judgments reached without conscious access to their basis — yield accurate knowledge?

### FINER Assessment
| Criterion | Score | Justification |
|-----------|-------|---------------|
| Feasible | 5/5 | Large, mature literature (dual-process theory, implicit learning, naturalistic decision making, interoception, metacognition) with meta-analyses and replication studies available |
| Interesting | 5/5 | Live scientific disagreement (Kahneman vs Klein; unconscious-thought replication failures; presentiment meta-analyses vs critiques) |
| Novel | 3/5 | Many reviews exist per sub-field; cross-field synthesis that also adjudicates the "sixth sense" reading against the replication record is less common |
| Ethical | 5/5 | Secondary literature only; no human subjects |
| Relevant | 4/5 | Informs expert training, decision policy, and public understanding of "trusting your gut" |
| **Average** | **4.4/5** | |

### Scope Boundaries
**In Scope:** Human adults; empirical peer-reviewed research (psychology, cognitive neuroscience, judgment and decision making, management/naturalistic decision making) from 1990–2026 plus seminal earlier works; four construct families: (a) implicit learning and expert pattern recognition, (b) affective/somatic signals (somatic marker hypothesis, interoception), (c) fluency and metacognitive feelings (feeling of knowing, déjà vu, coherence judgments), (d) claims of anomalous cognition ("sixth sense", presentiment, precognition) assessed on their replication record.
**Out of Scope:** Animal cognition; clinical training curricula for intuition (except as outcome evidence); religious or spiritual framings; parapsychology beyond the empirical replication record; consumer "intuition" self-help literature.
**Key Assumptions:** "Gut feeling" is operationalised as a judgment or feeling of knowing whose basis is not consciously reportable. "Accuracy" is judged against an external criterion (correct answer, later outcome, expert consensus). The user's "sixth sense" phrase is treated as a hypothesis to be evaluated, not a premise.

### Sub-questions
1. Through what cognitive and affective mechanisms do gut-feeling judgments arise (implicit learning, pattern recognition, somatic/interoceptive signals, processing fluency)?
2. Under what conditions do gut-feeling judgments outperform, match, or underperform deliberate analysis (environment structure, expertise, feedback, task type)?
3. How does the empirical record treat the "sixth sense" reading — anomalous cognition (presentiment/precognition) — relative to ordinary non-conscious explanations?

### Sub-Question Bindings (#547)
1. inherits: population=human adults; timeframe=1990–2026 (+ seminal earlier); domain=psychology/neuroscience/JDM; deviations: none
2. inherits: same; deviations: none
3. inherits: same; domain extended to parapsychology ONLY via published replications/meta-analyses/critiques in mainstream peer-reviewed journals; deviations: none (user-approved deviation not obtainable; extension is within the user's own "sixth sense" framing)

### Candidate Questions Considered
| # | Candidate | FINER Avg | Why not selected |
|---|-----------|-----------|-----------------|
| 1 | What mechanisms and boundary conditions explain when gut-feeling judgments yield accurate knowledge? | 4.4 | Selected |
| 2 | Is there scientific evidence for a human "sixth sense"? | 3.6 | Narrower than the user's framing ("knowing without knowing"); risks a yes/no answer that ignores the ordinary mechanisms producing the same phenomenology |
| 3 | Should people trust their gut feelings? | 3.2 | Prescriptive and compound; not answerable without first settling mechanisms and conditions |
| 4 | How accurate are intuitive judgments compared with deliberate ones? | 3.8 | Good, but drops the mechanism half that explains WHY accuracy varies |

## Methodology Blueprint

### Research Paradigm
**Selected**: Pragmatist
**Justification**: The RQ mixes mechanism (explanatory) and boundary conditions (evaluative); the evidence base spans experimental, neuroimaging, meta-analytic and field studies.

### Method
**Type**: Qualitative (secondary)
**Specific Method**: Critical interpretive narrative synthesis of existing reviews, meta-analyses and key primary studies, organised by sub-question
**Justification**: The question is cross-field; a systematic review of one construct would miss the comparison between construct families that the user's framing requires.

### Data Strategy
**Data Type**: Secondary
**Sources**: Web search over publisher sites, PubMed/PMC, Semantic Scholar, OpenAlex, Crossref, arXiv/PsyArXiv; Google Scholar-style discovery via WebSearch
**Sampling**: Purposive — meta-analyses and systematic reviews first, then landmark primary studies and their replications, then critiques
**Time Frame**: Search executed 2026-10-03

### Analytical Framework
**Technique**: Thematic synthesis with contradiction mapping
**Steps**: (1) corpus by sub-question; (2) grade each source on the 7-level hierarchy; (3) map convergence/divergence; (4) resolve or record contradictions with evidence-quality comparison; (5) gap analysis
**Tools**: Repo resolvers (`scripts/crossref_client.py`, `scripts/openalex_client.py`, `scripts/semantic_scholar_client.py`) for citation-existence verification

### Validity Criteria
| Criterion | Strategy to Ensure |
|-----------|-------------------|
| Citation existence | Every DOI resolved against Crossref/OpenAlex before inclusion |
| Claim faithfulness | Every in-text citation carries a quote/page/section anchor |
| Balance | Each sub-question must include evidence for AND against intuitive accuracy; replication failures are reported alongside originals |
| Evidence hierarchy | Meta-analyses > RCT/experiments > observational > single studies > opinion; contradictions resolved by evidence quality |

### Limitations (By Design)
- Not a PRISMA systematic review; purposive sampling may miss sources — mitigated by search documentation and gap analysis
- Web-accessible full texts only; some locators will be abstract-level

### Ethical Considerations
- Secondary literature; no human subjects. AI disclosure mandatory in the report.

### Human-Subjects Administrative Status
Not applicable (no human subjects).

### Reporting Standard
- Recommended guideline: PRISMA-informed search documentation (narrative review)

### Preregistration
- Recommended: No. Platform: N/A. Status: Not applicable. Completed artifact declaration: not_provided. Companion handle: none.

## Devil's Advocate Report — Checkpoint 1

### Verdict: PASS (with Major issues to carry into Phase 2–4)

### Critical Issues (Blocks Progression)
None.

### Major Issues
1. **Construct ambiguity.** "Intuition" names at least four distinct constructs (implicit learning, affective signal, fluency/metacognitive feeling, insight). The report must keep them separated; otherwise evidence for one will be read as evidence for another. → Required: a definitional table early in the report.
2. **Direction bias risk.** The user's framing ("knowing without knowing", "sixth sense") invites a sympathetic reading. The synthesis must give equal weight to replication failures (unconscious-thought effect, Bem precognition, somatic-marker critiques) and to conditions where intuition is demonstrably unreliable.
3. **Psi handling.** Sub-question 3 must be adjudicated on the published replication and meta-analytic record (both pro and con), not dismissed or endorsed by fiat.

### Minor Issues
- 1990–2026 window plus "seminal earlier" is loose; the bibliography should justify any pre-1990 inclusion.
- "Accuracy against an external criterion" excludes purely preference judgments; state this limitation.

### Observations
- Kahneman–Klein (2009) is a natural organising frame for sub-question 2 but should not be the only one; Hogarth's kind/wicked environments and Gigerenzer's ecological rationality offer alternative framings.

### Strongest Counter-Argument
"Gut feelings are just fast cognition with confabulated introspection; there is nothing to research beyond ordinary memory and perception." → The report must show whether the evidence supports a distinct functional category (e.g., coherence judgments, somatic markers) or only ordinary processes experienced differently.

### What's Missing
- A clear statement of what would count as evidence FOR a "sixth sense" beyond ordinary mechanisms (pre-registered, replicated, effect robust to analytic flexibility).

### Stress Test Results
RQ answerable: yes. Scope: broad but bounded by the four construct families. Method fits question: yes. Paradigm assumption surfaced: the report treats accuracy as the criterion of "knowledge", which is a pragmatist choice; a phenomenological tradition would object. Noted as a limitation.
