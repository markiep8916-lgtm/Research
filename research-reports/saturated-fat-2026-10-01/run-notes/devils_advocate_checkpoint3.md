# Devil's Advocate Report — Checkpoint 3 (complete draft)

Source: hand-back from the Devil's Advocate subagent, reproduced by the dispatcher. Model output, not evidence. No search access; read the draft report and the evidence ledgers.

## Verdict: REVISE

Strengths: NOT SEARCHED discipline, honest AI disclosure. The conditional, incomplete framing follows from the ledgers, but five claims overstep. Every fix below needs no new searching. No injection found.

### Critical issues
No critical issues identified.

### Major issues (ranked by impact)

1. **Dropped comparator** (Abstract, KT1, KT3, §4.4, §11, Table 4). RR 0.83 is Cochrane's pooled composite, replacement mixed (S2 §C; Annals: 11 of 17 trials PUFA), yet Abstract and §11 attach it to PUFA. KT1 says unspecified replacement "shows little"; KT3's mixed-replacement trials show 17%. The only PUFA-specific event figure is one Annals subgroup (non-fatal MI RR 0.75, 0.58–0.99). S2-06 holds Cochrane-derived text crediting "polyunsaturated fat or starchy foods" and a paraphrase that subgroups "do not vary significantly"; both omitted. Fix: label 0.83 mixed-replacement; add comparator column; state the conflict; reword KT1.

2. **Natural-versus-artificial overreach** (KT5, Abstract, §7.3, Table 6, §9.2, §11). "Nothing retrieved suggests origin matters; what differs is the replacement, the food and the processing": origin (R-a) was never searched and processing is "unknown" (§6.4, §7.4). "Usual intakes," "rarely eaten in doses that show population harm" and "minor contributor" need intake data §3 says was NOT SEARCHED; the only ledger ruminant-intake figure is V0 (S6 D3), and the report's own finding is equal per-gram lipid effects. "Largest" review is unsupported. Fix: delete or tag as inference; say "dose matters; intake not searched."

3. **"Concentrated in higher-risk people" over-certain** (KT3, Table 7, §4.4, §9.2). One December 2025 review carries it: its RRs cannot be tied to strata (S2-07), its authors rate certainty low-to-moderate, and its "V2" echoes one paper. The report cites Cochrane NNT 56 but omits secondary-prevention NNT 53 (S2-03), which shows little concentration, and quotes Forouhi's methods caveat but not her whole-population view (S8-07). Table 7 puts the 17%, "higher-risk" and "PUFA" claims under one "moderate" label. Fix: split the row; grade concentration low; add NNT 53 and Forouhi.

4. **Cohorts over-read** (Method; KT1, §4.3, §9.3). The report never mentions confounding, healthy-user bias or dietary measurement error. Wang 2016 implies mortality HR 0.73 per 5%-energy swap, far larger than trial mortality estimates (RR 0.93–0.96, CIs include 1). PURE authors' reading, carbohydrate as the harmful exposure (S3-11), bears on the thesis, yet §4.3 calls the divergence unexplained. Fix: add a confounding caveat and the PURE reading.

5. **Assertions beyond the ledgers** (KT2, Table 7, §11). "Processed meat is worse than its saturated fat would predict" contradicts §6.2/§6.4 (components NOT SEARCHED). KT2's trials of "beef tallow or tropical oils": retrieved trials cover butter and coconut; tallow rests on relayed AHA wording and a machine-summarised guide; palm unsearched. "Every professional body retrieved accepts this" is authority, and Table 7 files "guidance diverged sharply" under "Established (high certainty)". Fix: cut or restrict to butter/coconut; move guidance out of the evidence table.

### Minor issues
- COI accounting is one-sided by coverage: the cheese–butter trials behind KT4 lack funding flags (S5 D2); Krauss (dairy funding, S7-13) also authors Siri-Tarino 2010 and Bergeron 2019.
- Deaths "not distinguishable from none" hides CIs reaching about 10% benefit; KT3's "low for deaths" contradicts Cochrane GRADE moderate (Table 4); certainty labels lack a stated rule.
- Method, AI disclosure and README assert a DA review of "the synthesis", an "independent claim audit" and an "editorial review"; run-notes hold only checkpoint 1, Appendix C is a placeholder, and §9.3 counts nine agents against eight. Fill Appendix C; fix tenses; delete unlogged claims.

### Strongest counter-argument
"The thesis is a compromise neither the data nor either camp supports as stated. 'Replacement matters most' rests on one Annals subgroup, advisory prose and one Harvard cohort family whose implied mortality effect dwarfs the trials', a gap consistent with confounding. 'Concentrated in higher-risk people' is what any constant relative effect produces. 'Clear for trans fat only' reflects coverage: most 'artificial' readings were never searched."

### What's missing
Absolute numbers for lay readers (8% baseline event rate, NNT, 4.7-year follow-up); Cochrane's replacement conflict; Forouhi; PURE's carbohydrate reading; NIH-AARP (S3-14); low-carbohydrate items each camp would cite (S8-13, S8-14); statin-era applicability (S8-05).

### Hostile reviewers, lay reader, limitations
- Neither hostile reviewer finds a fatal flaw. The lipidologist would press the missing LDL causal chain; the guideline critic, the "moderate" composite over null components (definition unretrieved, S2-03), the absent confounding caveat, and Harcombe's meta-analyses dismissed as "not directly comparable" while the mixed-replacement composite is the headline.
- Lay "so what": "17% fewer events" is relative; the ledgers imply about one event avoided per 56 people over roughly 4.7 years. §9.2's "Swap, rather than only cut" rests on one subgroup; no food-level swap was tested on events.
- Limitations are genuine but process-focused; inferential limits are absent. Checkpoint-1 modes: dropped comparator (1), natural=safe (2), recency (3), over-reading (4), guideline-as-evidence (5); others mostly handled.

### Stress test results
| Test | Result |
|---|---|
| Remove strongest source (Cochrane 2020) | No: other event data cross 1, end at 0.99 or repeat Cochrane |
| Flip the research question | Yes for deaths and low-risk events; No for LDL |
| Apply to different context | No: PURE inverse; children, older adults unsearched |
| "So what?" | Partly: LDL and trans-fat points stand; lay impact overstated |

## Dispatcher's disposition
Accepted. All five major issues and the three minor issues are applied in the revised report: the 0.83 estimate is labelled mixed-replacement with a comparator column; natural-versus-artificial claims beyond trans fat are restated as not searched; the higher-risk concentration is graded low with both NNTs and both expert views; a confounding caveat and the PURE authors' carbohydrate reading are added; unsupported statements are removed; the review log is filled in.
