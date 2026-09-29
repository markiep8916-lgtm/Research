# Longevity escape velocity (LEV): deep-research run

A `deep-research` `full`-mode run (v2.12.1) on the question: **under what conditions, and by what dates if any, does the evidence support the arrival of longevity escape velocity in human populations?** Run date 2026-09-29.

**Start here:** [`LEV_research_report.md`](LEV_research_report.md), the report. Its section 1 is a one-page answer.

**Status: preliminary; draft v3, revised after two rounds of review.** Evidence collection stopped early when the session's shared web-search cap was reached, direct access to scholarly sites was blocked by the environment's network policy, every figure comes from a search summary (not primary text), some figures were present in the search queries themselves (marked with a dagger in the report), and the independent re-verification pass could not run. Every role, including the eight reviews (four of draft v1, then the same four reviewers verifying draft v2), was performed by AI agents of one model family, and no human has checked any figure, citation or calculation. The report says this at the top and in section 7, and lists what would strengthen it.

## Layout

| Path | Contents |
|---|---|
| `LEV_research_report.md` | The report (answer, arithmetic, evidence, forecasts, scenarios, limitations, references with verification levels) |
| `phase1_scoping/` | Research-question brief, methodology blueprint, the analysis plan (frozen definitions, model, weighting rules, reference classes, deviations log, including the changes made after the Phase 5 reviews), and the devil's-advocate reports (three rounds: revise, revise, pass on a spot check) |
| `phase2_investigation/` | The search protocol and the evidence files W1-W7 (workstream agents, partial), and W8 (coordinator supplement). About 130 evidence cards, none at figure-level V3 |
| `phase3_analysis/model/` | Python model (`lev_model.py`), 34 unit tests, driver (`run_analysis.py`), and `params.json` |
| `phase3_analysis/outputs/` | Tables T1-T6b (including the cohort threshold T1c, composition T3b, race-table sensitivities T5b and T5c, stepwise cadence T3c, and onset-by-ramp T6b), figures F1-F5, Monte Carlo samples, run manifest |
| `phase5_review/` | Editorial, ethics, devil's-advocate, and claims-audit reviews of report draft v1 (verbatim), each reviewer's verification of draft v2 (verbatim), and the author's disposition of every point |

## Reproduce the numbers

```
cd phase3_analysis/model
pip install numpy matplotlib pytest
python3 -m pytest tests -q
python3 run_analysis.py --out ../outputs --params params.json --mc-n 300 --seed 20260929
```

## Resume with more evidence

The workstream files end with ready-to-run query queues (W1 about 40 queries, W4 43, W6 50, W7 about 30, W3 and W5 priorities in their section 9). To continue: raise the session search cap (environment variable `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` in the environment settings; a new session picks it up) or allow the scholarly hosts (Crossref, PubMed/PMC, Europe PMC, doi.org, ClinicalTrials.gov, arXiv, bioRxiv, publisher sites) in the environment's network access; then run the queues, the independent second-agent re-verification required by the ladder, and log any changes to the plan in its deviations log.

## Not medical advice

Nothing here is medical, financial, or legal advice.
