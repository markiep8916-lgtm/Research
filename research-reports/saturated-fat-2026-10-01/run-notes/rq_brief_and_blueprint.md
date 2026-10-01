# Phase 1 — Research Question Brief and Methodology Blueprint

Run: deep-research v2.12.1, `full` mode. Date of run: 2026-10-01.
User request (verbatim): "Can you do deep research on saturated fat, the health risks, if there's differences between artifical and natural, etc?"

## 1. Primary research question

What does the best available evidence (as of 2026-10-01) show about the health effects of dietary saturated fat (SFA), and do those effects depend on the form or source of the fat — in particular "natural" (found in whole foods) versus "artificial" (industrially produced, chemically modified, or synthetic)?

## 2. How "artificial vs natural" is interpreted

The user's phrase is ambiguous. Every plausible reading is in scope, and the report must say which reading each finding answers:

| Code | Reading | Why it matters |
|------|---------|----------------|
| R-a | Same fatty acid, different origin (synthetic/industrial vs nature) | Is a saturated fatty acid made in a factory any different from the identical molecule in butter? |
| R-b | Industrially modified fats: partially hydrogenated oils (industrial trans fat — unsaturated, not saturated, but often lumped in), fully hydrogenated fats, interesterified fats (chemical vs enzymatic; positional/sn-2 effects), refining, heating/frying | The main real-world "artificial fat" exposures |
| R-c | Lab-made / novel fats and fat substitutes: olestra, salatrim, DAG oil, structured lipids, precision-fermentation / CO2-derived fats, cell-cultivated animal fat | Emerging "artificial" fats |
| R-d | Ruminant (natural) trans fat vs industrial trans fat | Classic natural-vs-artificial comparison |
| R-e | Whole-food sources (dairy, meat, eggs, coconut, cocoa, palm) vs processed / ultra-processed products; the "food matrix" | Often what people mean by "natural" |
| R-f | Popular claims: butter / tallow / ghee / coconut oil ("natural") vs "seed oils" ("industrial") | Adjacent debate that shapes lay beliefs |

## 3. Sub-questions

- SQ1 Background: what SFA is, intake, and what major authorities recommend and why they differ (including the 2025–2030 US Dietary Guidelines released January 2026).
- SQ2 Cardiovascular disease (CVD): (a) blood lipids/apoB, (b) randomized-trial evidence, (c) cohort evidence incl. substitution analyses, (d) genetics/Mendelian randomization, (e) reconciling conflicting results.
- SQ3 Other outcomes: type 2 diabetes/insulin resistance, liver fat (NAFLD/MASLD), adiposity, cancer, cognition/dementia, inflammation/microbiome, all-cause mortality.
- SQ4 Source and fatty-acid specificity: dairy vs meat vs tropical oils vs cocoa; chain length (C4–C18), odd-chain and very-long-chain SFA; plant vs animal; food matrix; what replaces SFA.
- SQ5 Natural vs artificial (R-a to R-f above).
- SQ6 Susceptibility: familial hypercholesterolemia, "hyper-responders", diabetes, low-carbohydrate/ketogenic diets, age groups, genetics.
- SQ7 Evidence quality and controversy: history of the diet–heart hypothesis, industry influence, critiques and rebuttals, limits of nutritional epidemiology, "seed oil" claims.

## 4. Scope boundaries

In scope: human health outcomes; randomized trials (including controlled feeding trials with biomarker endpoints); prospective cohorts; Mendelian randomization; systematic reviews/meta-analyses; official guidelines and regulatory actions; 2025–2026 developments; credible critiques.
Out of scope: animal/in-vitro mechanisms (mention only as labelled mechanistic support); environmental sustainability; weight-loss diet brand comparisons; supplements; individualized medical advice.

## 5. Methodology blueprint

- Paradigm: pragmatist evidence synthesis — a rapid, systematic-style narrative review. It is NOT a registered PRISMA systematic review and must not be described as one.
- Evidence priority: systematic reviews/meta-analyses and RCTs > prospective cohorts and Mendelian randomization > guideline documents > mechanistic work. Grade with the 7-level hierarchy in `deep-research/references/source_quality_hierarchy.md`, plus GRADE certainty where the authors report it.
- Search channel constraint (important): the environment's network egress proxy blocks fetching nearly all scholarly and reference hosts (PubMed, PMC, Europe PMC, doi.org, BMJ, Cochrane Library, AHA journals, Nature, WHO, FDA, dietaryguidelines.gov, Wikipedia, Harvard Nutrition Source). Only the WebSearch tool works. Consequence: no database-level systematic search and no full-text reading. Facts are limited to what search results display.
- Verification levels (applied to every claim):
  - V2 = the same fact/numbers appear in at least two independent search results (at least one a primary or official source where possible);
  - V1 = seen in one search result only;
  - V0 = known from background knowledge but NOT seen in a search result this session — never stated as a finding.
- Anti-bias rules: for every sub-question search explicitly for contrary and null evidence; record funding/conflicts of interest; flag superseded work and version differences (for example, multiple versions of the same Cochrane review).
- Temporal integrity: state dates; anchor "latest/current" claims to a date or edition.
- Reporting: separate "established", "contested", and "unknown"; report effect sizes as published with confidence intervals; never merge different comparators (replacing SFA with PUFA is not the same as replacing it with refined carbohydrate).
- Interaction rule: the user delegated the research with a clear question; Phase 1 scope is recorded here and in the report so the user can redirect, rather than blocking the run on confirmation.
