# Ethics and Integrity Review of the Report (draft v1)

| Field | Value |
|---|---|
| Reviewer | Fresh-context subagent of the same model family, role `ethics_review_agent` (`deep-research/agents/ethics_review_agent.md`); no web access; judged from the files |
| Reviewed | `../LEV_research_report.md`, draft v1 (commit `fc40bde`) |
| Verdict | **CONDITIONAL** (integrity only; no human subjects). No Critical issues |
| Dispositions | See the tables in the last two sections of this file (draft v1 points, then the verification of draft v2) |
| Verification | Re-review of draft v2 by the same reviewer: **CONDITIONAL**, close to PASS; no Critical or Major items; six small fixes, applied in draft v3 |

The review text below is subagent output, reproduced verbatim except for one redaction: the model's name in item 5, quoting the draft's disclosure line, is replaced by "[model name redacted]" (the repository's rule is that no artifact names a model). Its statements are the reviewer's, not verified findings.

## Ethics Review Report: LEV report, draft v1

**AI-Assisted Research-Integrity Verdict: CONDITIONAL.** Integrity only, not human-subjects clearance; no human subjects are involved and nothing here authorizes recruitment, consent, data access or collection. No reviewer-directed text found.

**Dimensions:** AI disclosure warn; Attribution warn; Dual-use pass (None; no dosing or operational detail); Fair representation warn; Data ethics pass; Conflict of interest warn.

**Critical:** none. Disclosure exists, no fabrication was demonstrated, and the misstatements below are isolated, not systematic.

### Major (must fix before delivery)

**1. Individual-level claims outrun the evidence (§4.3, §6).**
- "PEARL … safe"; "Pilot in 12 older adults: feasible and safe." Cards support only "adverse events similar across arms" (n=114, 48 weeks) and "no serious related adverse events" (n=12). Remove "safe" beside rapamycin and dasatinib+quercetin.
- "physical activity and diet), which are worth roughly 1-5 age-years each in trials." Exercise and diet trials were never searched (W2 §6a); age-years is the report's own conversion of trials in patient populations (SPRINT, SELECT, EMPA-REG).
- "consumer 'biological age' tests are unreliable (replicate noise up to years; W5-20)." W5-20 covers research clocks and reports a fix (<1 year); consumer tests and clinics were not searched, so "unproven longevity clinics" pre-judges them.
- The race table shows only the improving-mortality scenario; T5's frozen-mortality run is lower (age 50, onset in 40 years: 26% vs 42%). Add it, caption the table (conditional on an onset the evidence does not show; full access assumed; not a forecast), and cap "145 years." Qualify "Trial participation, where safe and eligible" (registered, ethics-reviewed trials; not a recommendation).

**2. Sponsor claims and V1 pointers used as findings.**
- §1 "The first human dosing of a partial-reprogramming therapy … was reported" and §8 "a first small partial-reprogramming trial": "first" is Life Biosciences' own description (W5-01, W4-09; V2-P). Attribute it.
- §5.5 rates O3 "I" on V1 items (FDA trade-press sentence, biomarker count) and on absence in a non-census, cap-truncated search (W5 Table P1). Blueprint: V1 is never a finding. Say "not observed."
- RC2 ("$270M", "kidney damage in 5 of 24 patients") is V1. The "31 years" GLP-1 lag uses SELECT (2023) though W2 §6b lists an eleven-trial GLP-1 outcome meta-analysis.

**3. Named studies and people not supported by cards.**
- Olshansky 2024, "no more than 15% of women and 5% of men without new medical breakthroughs," tagged W1-06 · V2: W1-06 lists those shares as "not returned, so not findings." Only W6-05 (single query, horizon unstated) has them. Report as V2-P and drop the condition.
- "Kaeberlein, Barzilai (cautious)": W6 §3A has Barzilai "not classified"; no statement retrieved.
- Diamandis "XPRIZE award in 2030": W6-03 says his XPRIZE role is "not stated in any retrieved sentence (lead: verify)."
- Debonneuil "4% a year … within a few years": sources say "4%" (unit unseen, W1-02) and "within a certain time" (W8-08).
- ITP "13 of 164 trials positive across 54 compounds": W3-01 says 13 compounds of 54 (single query, unattributed).
- "authors who run longevity companies": two of six Donner co-authors, per search-result pages, not the paper's disclosure (W7-10). "groups with stakes" for Goldman and Scott–Ellison–Sinclair: W7-03 stake "not established," W7-01 funder "not seen."

**4. Stakes are not disclosed symmetrically.** §5.1 lacks the stake column the plan (§11) requires; one sentence says "Every forecaster has a stake," which the cards do not show for Vijg ("not retrieved"). Add per-person stakes with card IDs ("not retrieved" where absent): de Grey–LEV Foundation (RMR1 is the evidence he can cite, W6-02); Church–Rejuvenate Bio and Sinclair–Life Biosciences (V1; they tie forecasters to §4.3 sponsor results); Diamandis–Fountain Life; Olshansky–Lapetus Solutions and longevity-dividend programme (W6 C-8); Kaeberlein–Optispan; Barzilai–TAME. Add W1 C5 ("Neither side is independent of its own thesis"; steady-pace sources share Vaupel) and that SELECT, SURPASS-CVOT and EMPA-REG are believed manufacturer-sponsored (W2 limitation 5).

**5. AI disclosure.** Same-family review and summary-mediated evidence are clearly disclosed (front matter, §2, §7). Scope is not: "Produced with AI-assisted research tools ([model name redacted])" should say AI agents searched, graded evidence, wrote the model and drafted; that no human verified any figure or citation; and the model version. Replace "the research team's structured judgment" with "AI-generated structured judgment." "passed three rounds of devil's-advocate review" was REVISE, REVISE, PASS (spot check); "the DA reviewer reproduced it independently" was a same-family re-derivation.

### Reference integrity
79 entries compared with their cards; all cited card IDs exist; no web access, so external existence is unverified.
- "Jaeger, et al. (2024)": surname appears in no logged result (W2-03 "attribution inferred"); use "[authors not displayed]."
- NBER (title, "March"), National Academies (title, "Ch. 7"), SSA (title, 66(1)), SOA (title, 2(4)): cards hold only source and year. Verify or reduce.
- Twelve entries are never cited in text (Bonnet, Vaupel 2010, Rau, López-Otín, Lu, Browder, Yang, Moqri, Belsky, Wong, OECD, Marín Penella); three are incomplete (leukaemia, xenotransplant, anti-amyloid).

### Minor
- Equity: the high-income scope appears only in §7.4; W7 found mostly US evidence (8 of 12 cards), none from low- or middle-income countries. State this in §1 and the confidence line; note §6 assumes US-like mortality and full access.
- de Grey, Kurzweil and Church quotes match the cards and carry V1; de Grey's "(2021 statement)" is unresolved (W6 C-1: 2021 or 2023).
- Tetlock: "tournaments" misdescribes the 1984-2003 study; typo "which is which is."

**Decision Log:** no rows yet.

## Dispositions

Author's disposition of each point (Accepted, Partly accepted, Not accepted), with what changed in draft v2 (`../LEV_research_report.md`). "v2 §" refers to sections of the revised report. The reviewer's verification of the revision is in the last section of this file.

| # | Point | Disposition | What changed in v2 |
|---|---|---|---|
| M1a | "safe" beside rapamycin (PEARL) and dasatinib plus quercetin | Accepted | Table 7 now says "adverse events similar across arms" (PEARL, n = 114, 48 weeks) and "no serious related adverse events" (pilot, n = 12). No "safe" remains. |
| M1b | "physical activity and diet ... 1-5 age-years each in trials" | Accepted | Removed. v2 §6 says trials of exercise and diet were not searched; the lifestyle figure (12-14 life-years at 50) is labelled an observational extreme-group contrast. |
| M1c | Consumer "biological age" tests and "unproven longevity clinics" | Accepted | v2 §6 and Table 7 restrict the noise finding to research clocks (Higgins-Chen et al., 2022) and state that consumer tests and clinics were not reviewed. |
| M1d | Race table: add the frozen-mortality run, caption it, cap "145 years", qualify trial participation | Accepted | Tables 18-20: both pre-onset scenarios, the ranges across μ(80) 0.035-0.070, a finite-escape variant with a resistant share, and an explicit list of the assumptions (conditional on an onset the evidence does not show; full access; frozen death rate; not a forecast). Large entries are described as "a century or more, if all of that holds". Trial participation is stated as a personal decision with a clinician and trial team, not a recommendation. |
| M2a | "first" partial-reprogramming dosing stated as fact | Accepted | v2 §1 no longer states it; Table 7 and §8 attribute it to the company ("reported dosing its first participant ... describes it as the first cleared trial of its kind"). |
| M2b | ACH rated O3 "I" on V1 items and on absence | Accepted | Table 15 rebuilt under plan §9: not-yet-due expectations N, V1 items not scored (see also the Editorial and Devil's-advocate dispositions). |
| M2c | RC2 ($270M; 5 of 24) as a finding; GLP-1 "31 years" lag | Accepted | RC2 is an existence class from secondary sources ("reportedly"); the lag statement uses discovery to first approval (about 13 years for GLP-1 receptor agonists; about 14 years and about 21 to the first mortality trial for statins), marked V1 with unattributed dates. |
| M3a | Olshansky 15%/5% tagged W1-06 · V2 | Accepted | v2 §4.1: "the authors' own [projection], from a single query with horizon and interval unstated (card W6-05)"; the condition "without breakthroughs" is dropped. |
| M3b | "Kaeberlein, Barzilai (cautious)" | Accepted | Separate rows in Table 10; Barzilai: "No LEV statement retrieved". |
| M3c | Diamandis and the XPRIZE award | Accepted | Table 10 separates "nearing LEV" from the XPRIZE terms and states that his role in the prize is not stated in any retrieved sentence. |
| M3d | Debonneuil "4% a year ... within a few years" | Accepted | v2 §3: the 4% was in a query (†); unit, ages and definition were not stated; "within a certain time". (Draft v3 withdrew the † after the claims re-audit: three queries that did not carry the figure also returned it; see `04_claims_audit.md`.) |
| M3e | ITP "13 of 164 trials" | Accepted | Table 7: "13 of 54 compounds (164 trials) ... a single-query count". |
| M3f | Donner co-authors; "groups with stakes" for Goldman and Scott | Accepted | v2 §5.3: two of six co-authors lead longevity companies "per search-result pages and not the paper's disclosure"; economics: "Stakes were not established for either". |
| M4 | Stakes not disclosed symmetrically; add a stake column | Accepted | Table 10 has a stake column with per-person stakes and levels (de Grey, Kurzweil, Church, Sinclair, Diamandis, Olshansky, Vijg "not retrieved", Kaeberlein, Barzilai); the W1 C5 note and the believed manufacturer sponsorship of the human-anchor trials are stated. |
| M5 | AI disclosure scope; "the research team's structured judgment"; "passed three rounds"; "reproduced independently" | Partly accepted | The disclosure now says AI agents searched, graded evidence, wrote and tested the code, drafted and reviewed, and that no human checked any figure, citation or calculation; `[AUTHOR-JUDGMENT]` is defined as the AI-generated structured judgment; the scoping review is described as revise, revise, pass on a spot check; the reproduction claims say "a reviewer's independent scratch code" and that all reviewers are one model family. **Not done:** naming the model version. The repository's rule for this run forbids model identifiers in repository artifacts, so the disclosure says "the same model family". |
| Ref | "Jaeger, et al." surname unseen | Accepted | Entry is now title-first with "[authors not displayed]". |
| Ref | NBER, National Academies, SSA, SOA titles, chapters, volumes unseen | Accepted | Reduced to "[title not recorded]" or marked ‡ where a detail comes from background knowledge. |
| Ref | Twelve uncited entries; three incomplete entries | Accepted | Each of Bonnet, Vaupel 2010, Rau, López-Otín, Lu, Browder, Yang, Moqri, Belsky, OECD and Marín Penella is now cited in the text; Wong et al. (2019), whose headline figure was unconfirmed, was removed. The leukaemia, xenotransplant and anti-amyloid entries are completed as descriptive bracketed entries. |
| Minor | Equity scope only in §7.4 | Accepted | Stated in the front-matter Scope row, §5.3, §6 and §7. |
| Minor | de Grey "(2021 statement)"; Tetlock "tournaments"; typo | Accepted | "2021 or 2023, sources conflict"; "study"; typo removed. |

## Verification of draft v2 (re-review by the same reviewer)

The reviewer (a fresh resume of the same `ethics_review_agent` context) re-checked draft v2 (commit `7735418`) against its v1 review. The text below is subagent output, reproduced verbatim except for one redaction: the model's name in item 6 is written as "the model name", following the repository's rule against model identifiers in artifacts. Its statements are the reviewer's, not verified findings. The author's disposition of the six remaining points follows it.

### Re-review of draft v2 (7735418) against my v1 review

**Verdict: CONDITIONAL, close to PASS.** No Critical or Major items remain. Six small fixes are ranked below.

#### 1. Status of v1 items

- **Major 1, individual-level claims: RESOLVED.** Table 7 says "adverse events similar across arms" and "no serious related adverse events". §6 says "Trials of exercise and diet were not searched", consumer tests and clinics "were not reviewed", and trial participation "is not a recommendation". Tables 18-20 add frozen mortality, μ(80) ranges, a conditional caption and a finite-escape variant. Every cell in Tables 17-20 matches T5, T5b, T5c and T6b.
- **Major 2, sponsor and V1 claims: RESOLVED.** ER-100 is "reported… describes it as the first cleared trial of its kind" (Table 7) and "reported by the company that runs it" (§8). Tables 15-16 leave V1 items unscored and rate not-yet-due expectations N; the 2035 statement is [AUTHOR-JUDGMENT], derived from Table 17. RC2 is "reportedly… a pointer"; the 31-year GLP-1 figure is gone.
- **Major 3, named people and studies: RESOLVED** for Olshansky ("the authors' own, from a single query"), Barzilai (no camp label), Debonneuil ("whether it is per year… not stated"), ITP ("13 of 54 compounds (164 trials)"), Donner ("not the paper's disclosure") and Goldman/Scott ("Stakes were not established"). **Diamandis: PARTLY.** The XPRIZE terms stay in his row, now flagged "his role in the prize is not stated in any retrieved sentence"; move them out.
- **Major 4, stakes: RESOLVED.** Table 10 has a stake column; W1 C5 and believed manufacturer sponsorship appear (§4.1, §4.2, §5.1).
- **Major 5, AI disclosure: RESOLVED.** "Produced entirely by AI agents… No human has checked any figure, citation or calculation"; "AI-generated structured judgment"; "revise, revise, then pass on a spot check". Withholding the version follows the repository rule; accepted.
- **References.** "Jaeger": RESOLVED ("authors not displayed"). NBER, National Academies, SSA: RESOLVED (bracketed or ‡). Uncited entries: RESOLVED; every entry is cited by name or card ID. Incomplete entries (leukaemia, xenotransplant, anti-amyloid): PARTLY, now bracketed "titles not recorded" but not locatable.
- **Minor items:** equity RESOLVED (Scope row, §5.3, §7.6); de Grey date RESOLVED ("2021 or 2023, sources conflict"); Tetlock and typo RESOLVED.

#### 2. Remaining problems, ranked

1. **Unmarked background-knowledge reference details.** These appear in no card and carry neither ‡ nor brackets: initials for Colman (R. J.), Mattison (J. A.), Rau, Soroko and Jasilionis, López-Otín and co-authors, Tetlock (P. E.); and the SOA bracketed title "Summary of a discussion among experts" (the card says "survey of 79 experts"). Add ‡.
2. **Olshansky row.** "Co-founder and Chief Scientist of Lapetus Solutions" beside "reportedly declares no competing interests" invites an inference of undisclosed conflict; W6 C-8 says relevance is not shown. Add that. Also say the camp labels are the report's classification (W6: "Camp labels are mine").
3. **Sponsor and V1 claims still worded as fact.** Barzilai "TAME, whose funding stalled" (status contested, V1; write "reportedly"). Church "Co-founder of Rejuvenate Bio" (V1; Sinclair's row is hedged, Church's is not). Kaeberlein "Dog Aging Institute, whose funding is at stake" (EV-11 concerns the Dog Aging Project's NIH grant). §5.3 Loyal "cuts against a blanket 'no regulator recognises ageing'" uses a self-report (W5-02: no regulator statement seen); write "if accurate". §5.3 "one review… counts 8 qualified biomarkers", though W5-18's count sentence names no source. Statins "first mortality trial" (card: "the 4S result").
4. **Table 13, first criterion** excludes "drugs not presented as ageing interventions", hard-coding the sponsor-framing classification that Table 16 shows decides O1 and O2. State each 2030 resolution under both classifications. The steel-man is fair and self-limiting, but the sceptical case (limits, deceleration) has no matching paragraph.
5. **"A reviewer's independent scratch code"** (§3): same family; say "separate".
6. **Repository rule and tone.** The model name remains in `phase1_scoping/01_rq_brief.md` line 10 and, quoted, in `phase5_review/01_ethics_review.md` line 43. The §6 heading "What the evidence supports doing now" reads as advice; retitle.

Checked and clean: no dosing or operational detail; "reported by" wording for the LEV Foundation, Rejuvenate Bio, Life Biosciences, Hevolution, XPRIZE, ARPA-H and Insilico; † marks match W8's leading queries (W3's acarbose and canagliflozin, from leading Q-05 and Q-09, remain unmarked).

### Author's disposition of the remaining points (revision 2)

| # | Disposition | What changed |
|---|---|---|
| Diamandis (Major 3) | Accepted | The XPRIZE terms are out of his row; a sentence under Table 10 states they are the sponsor's terms, not his forecast, and that his role in the prize is not stated in any retrieved sentence. |
| Incomplete entries | Partly accepted | The three descriptive entries stay bracketed ("titles not recorded"): the search results showed no titles or authors for them, so nothing more can be added without inventing details. They are identified by the evidence card and by what the summaries said (PubMed Central reviews; NYU Langone and company reports; Our World in Data and PubMed Central reviews). |
| 1 | Accepted | Initials, subtitles and titles the cards do not show are now bracketed as "not seen" or "from the search query" (Colman, Mattison, Rau and colleagues, López-Otín and colleagues, SOA, SSA) or marked ‡ (Tetlock's year). |
| 2 | Accepted | Olshansky's row states that whether the company bears on the paper's topic is not shown (W6 conflict C-8); Table 10's caption states that camp labels are the report's classification. |
| 3 | Accepted | Barzilai ("reportedly stalled"; draft v3, after the claims re-audit: "reported inconsistently in secondary sources"), Church ("reported co-founder ... secondary sources only"), Kaeberlein (Dog Aging Institute co-founder; the Dog Aging Project's funding reported at risk), Loyal ("if accurate; no regulator statement was seen"), the biomarker count ("reportedly ... names no source"; draft v3: "a secondary summary reports") and the statin lag ("the 4S mortality trial"; draft v3: "an approval, of lovastatin (1987†)") are re-worded. |
| 4 | Accepted | Table 13's first criterion is resolved under both the narrow and broad readings, and states that a 2030 claim should say which it relies on; §5.1 gains "The strongest case against an early LEV" beside the steel-man. |
| 5 | Accepted | "A reviewer's separate scratch code (same model family)". |
| 6 | Accepted | The model name is removed from the RQ brief's disclosure and redacted from the quoted disclosure in this file's v1 text (line 43, marked); the §6 heading is now "What the evidence says about ordinary prevention". |
| † marks | Accepted | The acarbose and canagliflozin lifespan gains are marked † (leading queries Q-05 and Q-09; each also appeared, unattributed, in a non-leading query), and §2 says so. |
