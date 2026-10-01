# Saturated fat and health: deep-research run of 1 October 2026

**Question asked:** deep research on saturated fat: the health risks, and whether there are differences between artificial and natural forms.

**Status: interim.** The run used the whole 200-search allowance of its session (shared by eight search agents and the dispatcher) and could not fetch papers from PubMed, journals, WHO or similar sites. All numbers come from machine-written search summaries, and several parts of the question were never searched. The report says so on every page where it matters.

## Start here

| File | What it is |
|---|---|
| [`report.md`](report.md) | The report: key takeaways, abstract, findings by question, the natural-versus-artificial section, controversy and funding, limitations, references with verification levels, coverage map, and a claim ledger |
| [`resume_plan.md`](resume_plan.md) | What is missing, what to change in the environment, a prompt to paste into a new session, and the prioritised searches |
| `evidence-ledgers/S1…S8` | The raw evidence ledgers written by the eight search streams: every finding with its source URL, a short snippet, a V2/V1 verification level, disagreements, counter-evidence searched, background leads (V0, never used as findings), and the search log |
| `run-notes/` | The scoping brief, the instructions given to every search agent, the synthesis, and the review reports: three Devil's Advocate checkpoints, the claim audit, the editorial and ethics reviews, and the re-audit of the revised report |

## How to read the evidence labels

- **V2:** the same fact appeared in two or more independent search outputs.
- **V1:** it appeared in one search output.
- **V0:** known from memory, not seen in a search result; never used as a finding.
- **NOT SEARCHED:** the topic was not reached. This is different from "no evidence".

The labels measure how faithfully a number was transcribed from search output, not whether the finding has been replicated. No full text was read.

## Headline findings (full detail and caveats in the report)

1. What replaces saturated fat, and the food it comes in, may matter (certainty: low). Cohort studies that model a specific swap find lower heart-disease risk when polyunsaturated fat replaces saturated fat; pooled cohorts that leave the replacement unspecified find little; texts derived from Cochrane disagree on which replacement works best.
2. In controlled trials, butter raised LDL cholesterol relative to olive oil (certainty low to moderate) and coconut oil raised it relative to non-tropical vegetable oils (moderate); blood measures only, and no retrieved trial tested tallow or palm oil.
3. In randomized trials that reduced or modified saturated fat, combined cardiovascular events fell modestly (Cochrane 2020: relative risk 0.83, 95% confidence interval 0.70 to 0.98, replacement nutrients mixed) with little or no effect on deaths (Cochrane's own rating: moderate). One 2025 review reports the benefit is concentrated in higher-risk people; that is contested and graded low here.
4. The food matters: cheese raised LDL cholesterol less than butter but more than unsaturated fats; processed meat is consistently linked to harm in cohorts. No retrieved trial measured heart attacks or deaths by food source.
5. Natural versus artificial: industrial trans fat (an unsaturated fat) clearly worsens blood lipids and is mostly associated with more heart disease in cohorts; natural (ruminant) trans fat is not lipid-neutral per gram in feeding trials; nothing retrieved tests whether the *origin* of a saturated fatty acid changes its effect. Interesterified fats, fat substitutes, lab-made fats and most non-cardiovascular outcomes were not searched.
6. In 2026 US dietary guidance (keeps the 10%-of-calories cap but names butter and beef tallow) and the American Heart Association (advises unsaturated fat in place of saturated fat) point in different directions.

## Provenance

Produced by the `deep-research` skill (full mode, v2.12.1) with eight search agents; the first draft was reviewed by three Devil's Advocate checkpoints, an independent claim audit, an editorial review and an ethics review, and the revised report was re-audited once (`run-notes/reaudit.md`); the re-audit's findings were applied without a further audit. AI-assisted; no human expert has reviewed it. Not medical advice.
