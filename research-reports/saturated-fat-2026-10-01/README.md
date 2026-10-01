# Saturated fat and health: deep-research run of 1 October 2026

**Question asked:** deep research on saturated fat: the health risks, and whether there are differences between artificial and natural forms.

**Status: interim.** The run used the whole 200-search allowance of its session (shared by nine parallel agents) and could not fetch papers from PubMed, journals, WHO or similar sites. All numbers come from machine-written search summaries, and several parts of the question were never searched. The report says so on every page where it matters.

## Start here

| File | What it is |
|---|---|
| [`report.md`](report.md) | The report: key takeaways, abstract, findings by question, the natural-versus-artificial section, controversy and funding, limitations, references with verification levels, coverage map, and a claim ledger |
| [`resume_plan.md`](resume_plan.md) | What is missing, what to change in the environment, a prompt to paste into a new session, and the prioritised searches |
| `evidence-ledgers/S1…S8` | The raw evidence ledgers written by the eight search streams: every finding with its source URL, a short snippet, a V2/V1 verification level, disagreements, counter-evidence searched, background leads (V0, never used as findings), and the search log |
| `run-notes/` | The scoping brief, the instructions given to every search agent, and the Devil's Advocate reports |

## How to read the evidence labels

- **V2:** the same fact appeared in two or more independent search outputs.
- **V1:** it appeared in one search output.
- **V0:** known from memory, not seen in a search result; never used as a finding.
- **NOT SEARCHED:** the topic was not reached. This is different from "no evidence".

The labels measure how faithfully a number was transcribed from search output, not whether the finding has been replicated. No full text was read.

## Headline findings (full detail and caveats in the report)

1. What replaces saturated fat matters most. Swapping it for polyunsaturated fat is where the benefit appears; swapping it for refined carbohydrate, or leaving the replacement unspecified, shows little.
2. Replacing butter, tallow or tropical oils with unsaturated plant oils lowers LDL cholesterol (well established).
3. In randomized trials, reducing saturated fat modestly lowers combined cardiovascular events (Cochrane 2020: relative risk 0.83, 95% confidence interval 0.70 to 0.98), concentrated in higher-risk people, with no clear effect on deaths.
4. The food matters: cheese raised LDL cholesterol less than butter but more than unsaturated fats; processed meat is consistently linked to harm.
5. Natural versus artificial: industrial trans fat (an unsaturated fat) is clearly harmful; natural trans fat is not lipid-neutral per gram; nothing retrieved shows that the *origin* of a saturated fatty acid changes its effect. Interesterified fats, fat substitutes, lab-made fats and several non-cardiovascular outcomes were not searched.
6. In 2026 US dietary guidance (keeps the 10%-of-calories cap but names butter and beef tallow) and the American Heart Association (advises unsaturated fat in place of saturated fat) point in different directions.

## Provenance

Produced by the `deep-research` skill (full mode, v2.12.1) with eight search agents, two Devil's Advocate checkpoints, an independent claim audit and an editorial review. AI-assisted; no human expert has reviewed it. Not medical advice.
