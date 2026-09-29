# Longevity Escape Velocity: What It Would Take, How Far Evidence Says We Are, and What Can Be Said About When

**A preliminary deep-research report (draft v1)**

| | |
|---|---|
| Run | `deep-research` v2.12.1, `full` mode (Phases 1-4 complete; Phase 5 review pending at the time of writing) |
| Date | 2026-09-29 (search date for all evidence) |
| Question | Under what conditions, and by what dates if any, does the evidence support the arrival of longevity escape velocity (LEV) in human populations? |
| Status | **Preliminary.** Evidence collection stopped early when the session's shared web-search cap was reached, and every figure comes from search summaries, not primary texts (see §7). Read the confidence statements before relying on any number. |
| AI disclosure | Produced with AI-assisted research tools (Claude). Drafting, devil's-advocate, editorial and ethics roles are all the same model family; fresh contexts reduce anchoring, not shared blind spots. Not medical, financial, or legal advice. |

**How to read the labels.** `[ESTABLISHED]` replicated or definitional mathematics. `[SUPPORTED]` consistent evidence, limited replication or animal-only. `[CONTESTED]` credible sources disagree. `[SPECULATIVE]` reasoning without direct evidence. `[AUTHOR-JUDGMENT]` the research team's structured judgment, low confidence. Reference tags such as *W2-01 · V2* give the evidence card and verification level: **V2** = existence confirmed at a primary source plus one attributing sentence in a search summary; **V2-P** = the party's own claim about itself ("X reports that..."); **V1** = secondary sources only (pointer, not a finding). **No figure reached V3.** Card files are in `phase2_investigation/`.

---

## 1. The short answer

**What LEV is.** LEV is the state in which medicine extends people's remaining life expectancy at least as fast as they age, so that their expected remaining life stops shrinking. It is not immortality, and it is not the same as "life expectancy rising by a year every year" (that popular version is stricter at older ages; §3).

**What it would take.** Under a standard model of adult mortality, a population reaches LEV only if age-specific death rates fall by about **8% a year (about 7-9%, depending on how fast mortality rises with age)**, at every age from 50 to 90, for at least two decades. Observed declines are about **1-2% a year** (and slowing in some data), so the required pace is roughly **4-9 times** what medicine has delivered. `[ESTABLISHED]` for the arithmetic; `[SUPPORTED]` for the observed pace (§3, §4.1).

**How far the evidence says we are.** The best-demonstrated human effects on all-cause mortality are one-off shifts of roughly **1-5 "age-years"** each (intensive blood-pressure control about 3.6, lipid lowering about 1.2 per mmol/L, an SGLT2 inhibitor about 4.4 in diabetes); smoking cessation and lifestyle produce larger, observational level effects (about 10 and 12-14 years). LEV needs a new independent effect of that size **every 3-4 years, indefinitely, on top of each other**. Ageing-biology interventions extend mouse lifespan by up to about a quarter to a third at the median, with a smaller gain at the maximum. In humans they have so far produced safety data and biomarker changes, not mortality data. The first human dosing of a partial-reprogramming therapy (a small eye study) was reported on 9 June 2026 (§4.2-4.3). `[SUPPORTED]`

**Two structural obstacles.** Even a small share of hazard that does not improve ends an "escape" within one to two decades (5% unimproved and improving at 1% a year: about 15 years), and the brain is the hard case: the best disease-modifying Alzheimer's antibodies slow decline by about 27-36% (§4.4). `[SUPPORTED]` (model arithmetic, `[SPECULATIVE]` as a description of reality).

**When?** The evidence reviewed gives **no support for LEV onset before the mid-2030s**: no mortality-outcome human trial of an ageing-biology intervention was seen among the programmes reviewed that could report by 2030, and the search results indicate that no regulator recognises ageing as an indication or has qualified an ageing biomarker (V1 sources: trade press and a review; not checked at the regulators). Between roughly 2040 and 2100 the evidence neither supports nor rules out LEV: it is **conditional** on effects that have not yet been shown. "Not this century" (stagnation or acceleration short of LEV) is a live outcome, and nothing reviewed contradicts it. Published advocate timelines (about 2029-2040) rest on statements and company-reported results, not on data that could be converted into a required pace; sceptics' timelines carry their own stakes. **No probability band is offered: it is "not estimable" from this evidence** (§5). `[AUTHOR-JUDGMENT]`

**How?** Six conditions would all have to be met: (1) at least one class of intervention with a large, repeatable effect on all-cause hazard at older ages in humans; (2) several such effects stacked at the required cadence; (3) coverage of tissues that resist intervention, above all the brain; (4) a measurement and regulatory route that lets effects be proven and approved in years, not decades; (5) capital, delivery, and broad access (population-level LEV needs most of the population treated); (6) public and political acceptance (§5.3-5.4).

**What to watch by 2030** (leading indicators, §5.4): a hard-outcome human benefit of an ageing-biology intervention; systemic (not local) reprogramming or an equivalent in human trials; a regulator-accepted surrogate for ageing; independent replication of large-mammal lifespan extension; and post-2019 age-specific death-rate data showing an acceleration above about 2.6% a year.

**Confidence.** Moderate in the arithmetic; low-to-moderate in the empirical anchors (single-confirmation, summary-mediated); low in anything about dates. §7 lists what would change that.

---

## 2. Question, definitions, and method

**Question.** Under what conditions, and by what dates if any, does the evidence support the arrival of longevity escape velocity, as formally defined, in human populations? "If any" keeps "not before 2100" a live answer.

**Definitions (frozen before the search; `phase1_scoping/03_analysis_plan.md`).** Life-expectancy language hides three different criteria. Let μ be the death rate at an age and e the remaining life expectancy:

| Label | Condition | What it means |
|---|---|---|
| **D-N** (primary, "no-shrink") | e(x+1, t+1) ≥ e(x, t) at every age from 50 to 90, for at least 20 consecutive years | A person one year older, one year later, has at least the remaining life expectancy they had. Under standard mortality it requires progress of one age-year per calendar year at every age (v ≥ 1), which is a life-expectancy gain of 1 − μe per year (about 0.74 at 65 and 0.52 at 80). |
| **D-1** (popular "one-for-one") | Remaining life expectancy at a fixed age rises by at least 1 year per year | Requires v ≥ 1/(1 − μe): about 1.15 at 50, 1.4 at 65, 2.0 at 80. Much stricter than D-N at older ages. Popular statements of LEV read like this. |
| **D-H** ("hazard-stationarity") | The death rate a person faces stops rising as they and calendar time advance | Coincides with D-N under simple mortality; diverges under heterogeneity (§3). |

**Progress in "age-years".** A one-off proportional cut in death rates to a fraction *k* is worth g = ln(1/k)/β age-years, where β ≈ 0.087 per year is the Gompertz slope (mortality doubles about every 8 years). A sustained rate of gain is *v* = (rate of decline)/β, in age-years per calendar year. LEV requires v ≥ 1.

**Method.** A structured evidence review over three linked sub-questions (requirement → gap → closure), a transparent demographic model with committed code, a competing-hypotheses analysis over four outcomes, reference classes fixed in advance, and adversarial review at each stage (the scoping design passed three rounds of devil's-advocate review; the report itself is in review). Four outcomes by 2100 were fixed in advance: **O1** stagnation; **O2** acceleration short of LEV; **O3** LEV with onset by 2060; **O4** LEV with onset 2061-2100.

**Evidence base (and its limits).** Seven search workstreams plus a coordinator supplement produced about 130 evidence cards. All were searched on 2026-09-29 through a web-search tool that returns a list of links and a model-written summary; direct access to scholarly sites (Crossref, PubMed, publishers, registries) was blocked by the environment's network policy, and the workstreams' shared 200-search cap ended collection early. No card reaches figure-level corroboration (V3), and the independent re-verification pass the plan required could not run. Every figure below is **summary-mediated**.

---

## 3. What LEV requires (sub-question 1)

**The arithmetic.** Adult death rates rise roughly exponentially with age, doubling about every 8 years [SUPPORTED; *W8-01 · V2*: the slope is about 0.07-0.09 per year in summaries, not a corroborated input, so it is treated as a range]. If death rates at every age fall by a fixed proportion each year, remaining life expectancy at any age shifts as if people were getting younger by v = r/β age-years per calendar year. Solving for v = 1 gives the required decline. The model (24 unit tests against analytic results) gives:

| Doubling time (years) | β | Required annual decline in death rates (D-N) | D-1 needs v ≥ (age 50 / 65 / 80) |
|---|---|---|---|
| 7 | 0.099 | 9.4% | 1.10 / 1.29 / 1.87 |
| 8 | 0.087 | 8.3% | 1.15 / 1.37 / 1.97 |
| 9 | 0.077 | 7.4% | 1.20 / 1.45 / 2.06 |
| 10 | 0.069 | 6.7% | 1.25 / 1.53 / 2.15 |

`[ESTABLISHED]` (definitional mathematics, verified analytically and numerically; the DA reviewer reproduced it independently). Because a person's death rate is not zero, holding remaining life expectancy constant needs only a gain of 1 − μe per year; the popular "one year per year" (D-1) therefore overstates the requirement at older ages. The threshold is the same at all ages between 50 and 90 in the D-N form.

![Life expectancy at 65 under different rates of progress](phase3_analysis/outputs/F1_e65_by_v.png)

**An extrinsic floor does not lower the threshold.** Deaths from causes that do not age (accidents, violence) neither raise nor lower the required pace; they cap expected remaining life at about 1 divided by their rate, however far ageing is defeated. `[ESTABLISHED]` (a first draft of the plan said otherwise; a numerical check corrected it before any result was produced, and the correction is logged).

**Escape is not survival.** At the moment D-H is reached, the death rate stops rising but does not fall. Expected remaining life after onset is about 1 divided by the death rate at onset: roughly 27 years for someone who is 80 at onset, if nothing improves after that. Long expected lifetimes require the decline to continue beyond the threshold, and the size of any such number depends on the extrinsic floor, which is an unverified placeholder here. The report therefore does not quote "thousand-year" figures. `[ESTABLISHED]` (arithmetic) / `[SPECULATIVE]` (any specific lifetime).

**Heterogeneity.** When people differ in frailty, the population's death rate rises more slowly at old ages (selection). Under the model's period convention the D-N threshold stays at about 8.3% at every age; the cohort-path condition D-H falls with age (about 6.6% at 90 and 5.1% at 100 with moderate heterogeneity; 3.7% at 100 with strong heterogeneity).

![Required pace by age](phase3_analysis/outputs/F5_threshold_by_age.png)

**A discrepancy in the literature.** A 2018 actuarial paper (Debonneuil et al.; *W1-02, W8-08 · V2*) is summarised as saying that sustained mortality improvements of 4% a year would also lead to LEV, but would need to start within a few years to match announced probabilities. That is about half the model's threshold. The paper's definition and age range were not seen. In this model, a 4% threshold appears only for the cohort-path criterion at very old ages under strong heterogeneity; whether that explains the paper is `[SPECULATIVE]` until it is read. The report treats the frozen definitions as its standard and flags the gap.

---

## 4. How far we are (sub-question 2)

### 4.1 The observed pace

| Source | Measure | Annual decline | Age-years per year (v) | Acceleration needed for v = 1 |
|---|---|---|---|---|
| Actuarial long-term assumption (CMI) *W8-02 · V2* | assumption | 1.5% | 0.17 | 5.8× |
| All-age mortality since 1900 (NBER) *W8-03 · V2* | observed, all ages | 1-2% | 0.12-0.23 | 4.3-8.7× |
| Older ages, Western Europe 1980s-90s (National Academies) *W8-03 · V2* | observed | about 1% | 0.12 | 8.7× |
| US ages 65+, crude, 2000-2019 *W8-04 · V1* | observed (secondary) | about 1.4% | 0.16 | 6.1× |
| US 2018 to 2019, ages 65-74 / 75-84 / 85+ *W8-04 · V2* | single year | 1.0% / 1.8% / 1.7% | 0.12 / 0.21 / 0.20 | 8.7× / 4.8× / 5.1× |

`[SUPPORTED]`. These are old, all-age, or single-year figures; the decade-by-sex tables the plan required (Human Mortality Database, Kannisto-Thatcher) were not retrievable. A single cause can move much faster: US coronary death rates fell about 3.4-3.6% a year for 20 years (v about 0.4; *W8-15 · V2*), and death rates in an advanced-HIV cohort fell about 70% in roughly two years after combination therapy (*W8-14 · V2*). No all-cause, all-age decline at that pace has occurred.

**Is progress slowing?** Sources disagree, and they measure different things. Record life expectancy at birth rose about 2.5 years per decade from 1840 (Oeppen & Vaupel, 2002; *W1-03 · V2*) and Vaupel et al. (2021; *W1-05*) argue the pace has been steady; Olshansky et al. (2024; *W1-06 · V2*) report deceleration since 1990 in ten populations and estimate survival to 100 at no more than 15% of women and 5% of men without new medical breakthroughs; Andrade et al. (2025; *W1-07 · V2*) forecast slower cohort gains, with over half of the slowdown from mortality under age 5; a 2026 preprint questions whether the slowdown is real (*W1-08 · V2*). US death rates at 65 and over stopped falling as fast after about 2010 (*W8-04 · V2*). `[CONTESTED]`. Two cautions: life expectancy at birth is not an age-band hazard, and an age-10 or age-70 slowdown matters differently for LEV. Official projections have repeatedly under-predicted gains (Social Security Administration review, 2005; *W8-07 · V2*), and every published "limit" to life expectancy was broken, on average within about five years (*W8-06 · V2*): an existence class, not a base rate (§5.2).

### 4.2 What medicine has demonstrated in humans: level effects, not a rate

Effects on all-cause mortality, converted to age-years (β = 0.087; range for β 0.069-0.099 in the file `phase3_analysis/outputs/T3_effects_in_age_years.csv`):

| Intervention (evidence) | All-cause hazard ratio (95% CI) | Age-years, once | Level |
|---|---|---|---|
| Intensive blood-pressure target, trial period (SPRINT; *W2-01*) | 0.73 (0.60-0.90) | 3.6 (1.2-5.9) | V2 |
| Same, incl. 8-year post-trial follow-up (an abstract with unattributed figures; *W2-03*) | 0.96 | 0.5 | V2, flagged |
| Blood-pressure lowering, per 10 mmHg systolic (meta-analysis; *W2-04*) | 0.87 (0.84-0.91) | 1.6 | V2 |
| LDL-cholesterol lowering, per 1.0 mmol/L (26 trials; *W2-06*) | 0.90 (0.87-0.93) | 1.2 | V2 |
| Semaglutide in obesity with cardiovascular disease (SELECT; *W2-15*) | 0.81 (0.71-0.93), nominal | 2.4 | V2 |
| Empagliflozin in type 2 diabetes (EMPA-REG; *W2-17*) | 0.68 (0.57-0.82) | 4.4 | V2 |
| Tirzepatide vs dulaglutide (active comparator; *W2-16*) | 0.84 (0.75-0.94), nominal | 2.0 | V2 |
| Smoking cessation at 25-34 (observational life-years; *W2-13*) | not a hazard ratio | about 10 | V2 |
| Five low-risk lifestyle factors vs none, age 50 (observational extremes; *W8-17*) | not a hazard ratio | 12-14 | V2 |

`[SUPPORTED]`. Three cautions. These are one-off shifts over trial durations of 2-6 years, in selected populations; the same interventions do not stack indefinitely. SPRINT's benefit appears to fade after the trial ended. And several are drug-trial results in people with disease.

**The cadence arithmetic.** Sustaining v = 1 by stacking independent effects of size *g* requires a new one every *g* years, compounding. At SPRINT's 3.6 age-years that is a new all-cause effect of that size about **every 3.6 years, indefinitely**. Summing every human effect above (they overlap and are not all additive) gives on the order of 10-20 age-years accumulated over decades, which is which is consistent with the roughly 0.12-0.23 age-years per year at which mortality has fallen: medicine's past contribution, in these terms, is roughly a tenth to a quarter of what LEV requires. `[AUTHOR-JUDGMENT]` (an accounting cross-check, not a result).

### 4.3 Ageing-biology pathways: animal effects, human evidence

| Pathway | Best animal evidence | Human evidence | Main constraint | Levels |
|---|---|---|---|---|
| **Geroprotective drugs** | Interventions Testing Program (three sites): rapamycin +9-14% (first dose) and +23-26% median (higher dose); acarbose +22% (males) and +5% (females); 17-alpha-estradiol about +12% (males); canagliflozin +14% (males); rapamycin plus acarbose +28-34% median. 13 of 164 trials positive across 54 compounds; effects often male-only; in every male result giving both, the gain at the 90th percentile is smaller than at the median (*W3-01 to W3-07*) | PEARL (114 adults 50-85, 48 weeks): no change in visceral fat, some lean-mass gain in women, safe (*W8-21, W5-11*). No mortality trial; TAME unresolved (*W5-12 · V1*) | Effects shift the middle of the distribution more than the maximum; sex-dependent; caloric restriction in monkeys gave conflicting survival results across two labs (*W8-26*) | V2 |
| **Senolytics** | Clearing p16-positive cells: median lifespan +24-27% (Baker et al. 2016; *W8-18*); dasatinib plus quercetin in very old mice: +36% remaining lifespan, hazard about 0.65 (Xu et al. 2018; *W8-19*) | Pilot in 12 older adults: feasible and safe, MoCA +1.0 (95% CI −0.7 to 2.7) (*W8-20*). A senolytic company dissolved in 2025 (*W5-06 · V1*) | Single-lab, patent-holding groups; human effects unknown | V2 |
| **Partial reprogramming** | Progeria mice: median +30-33%, maximum +18% (Ocampo et al. 2016; *W4-01*). Aged wild-type mice: company-authored report of +109% median *remaining* life, about +7% of total median lifespan (*W4-04 · V2-P*); a 2024 review found one peer-reviewed wild-type lifespan study (*W4-05*) | First dosing of ER-100 (local eye delivery, Phase 1 safety) reported 9 June 2026 by the company (*W4-09, W5-01 · V2-P*); no results. Teratoma risk with transient systemic reprogramming (*W4-06*) | Delivery, control, safety; nothing systemic in humans | V2 / V2-P |
| **Plasma exchange, thymic** | Parabiosis lineage | Biweekly plasma exchange plus IVIG lowered epigenetic "biological age" by 2.6 years vs 1.3 years for exchange alone (*W8-22*); a nine-to-ten-man thymic-regeneration study reported about 1.5 years (*W8-23*) | Biomarker change only; clocks are unreliable (replicate noise up to 9 years; *W5-20*) | V2, sponsor-linked |
| **Replacement** | n/a | Gene-edited pig-kidney trial cleared February 2025; first transplant 3 November 2025; record 271 days of function before rejection (*W8-24*) | Single organ, early phase | V2 / V2-P |
| **Combinations, AI-enabled discovery** | Four-intervention mouse study (RMR1, 1,000 mice): reported as a "qualified win", about 4 months in the best group, no radical maximum-lifespan extension (foundation-reported; one summary calls the combination additive, another reports synergy in males; *W3-10 · V2-P*) | An AI-designed drug entered Phase 3 for pulmonary fibrosis (a disease drug, not an ageing rate; *W5-03 · V2-P*) | Gains were modest at this scale | V2 / V2-P |

`[SUPPORTED]` for the animal effects; `[SPECULATIVE]` for any statement about human size. A thought experiment shows the scale: even the strongest animal hazard ratio above (0.65) would be worth about 5 age-years *if* it transferred to humans and stacked once, against a need of about one age-year every year. (The company-authored and foundation-reported items are self-reports; the ITP figures come from a review and one study each, not corroborated.)

**Reading.** Nothing reviewed shows an ageing-biology intervention reducing human all-cause mortality. The human anchors are cardiometabolic. The animal effects are modest at the maximum, sex-dependent, and mostly from single groups, and the translation record is mixed (caloric restriction; sirtuin activators, *W8-12 · V1*). Effect sizes at the maximum, not just the median, matter for LEV.

### 4.4 Composition, resistant hazard, and the brain

If a fraction of age-related hazard does not improve, the required decline cannot be met at all ages indefinitely. In the model, with progress ramping to 1.5 times the threshold by 2045, an escape (D-N held over ages 50-90) lasts:

| Share of hazard unimproved | improving at 0%/yr | 1%/yr | 2%/yr | 4%/yr |
|---|---|---|---|---|
| 0% | ≥ 48 years (end of horizon) | | | |
| 2% | 20 | 24 | 29 | 42 |
| 5% | 12 | 15 | 20 | 31 |
| 10% | 2 | 7 | 11 | 22 |
| 20% | 0 | 0 | 0 | 12 |
| 30% | 0 | 0 | 0 | 3 |

![Escape duration](phase3_analysis/outputs/F3_escape_duration.png)

`[SPECULATIVE]` as a description of real causes of death (the model applies the same share at every age; real shares differ by cause and age). The sensitivity analysis over the model's ranges ranks the pace and shape of the ramp and the resistant share far above the demographic parameters (the Gompertz slope, hazard level, floor). The brain is the obvious candidate for a resistant component: anti-amyloid antibodies slow decline by about 27% (lecanemab) and 35-36% (donanemab) at 18 months, described as modest with uncertain durability (*W8-25 · V2*); Alzheimer's disease was about 9% of US deaths at 85 and over in 2018, behind heart disease (about 29%) and cancer (about 12%) (news coverage of NCHS data; *W8-27 · V1*, a pointer only; dementia coding is unreliable at old ages). Conquering heart disease and cancer alone would not deliver LEV: deaths at old ages are spread over many causes, and the residual grows as others fall (`[ESTABLISHED]` arithmetic; the cause shares are a pointer).

---

## 5. Under what conditions, and by when (sub-question 3)

### 5.1 What forecasters say

| Forecaster (camp) | Statement (as seen) | Definition | Source level |
|---|---|---|---|
| de Grey (advocate) | 50% chance of LEV by 2035-36 (2021 statement); "12-15 years" in 2025 | ambiguous; a 20-year postponement | V1 |
| Kurzweil (advocate) | LEV "by the end of 2030" (2024), "early 2030s" | reads like D-1 plus D-H, for those with means | V1 |
| Church (advocate) | mid-to-late 2030s (pages 2021-23) | none | V1 |
| Sinclair (advocate) | reverse biological age in about 10 years (2024) | none | V1 |
| Diamandis (advocate) | "nearing" LEV; XPRIZE award in 2030 for restoring function 10-20 years | function, not LEV | V2-P |
| Olshansky (sceptic of radical extension) | implausible this century without markedly slower ageing | survivorship | V2-P |
| Vijg (sceptic) | lifespan limited to about 115 years (2016); contested | n/a | V2-P |
| Kaeberlein, Barzilai (cautious) | no LEV date retrieved | n/a | V1 |

`[SUPPORTED]` that these statements exist; none is a finding. No statement gives an age band and a duration, so **none can be converted into a required pace**. The advocates' targets cluster at 2029-2040; only de Grey attaches a probability. Every forecaster has a stake, sceptics included (companies, books, foundations, a longevity-dividend programme, a stalled trial's funding). The two expert surveys seen were old: actuaries and economists projected lower mortality decline than demographers in a 1998 Society of Actuaries survey (*W8-10 · V2*). Expert political and economic forecasts in Tetlock's tournaments (284 experts, about 28,000 predictions) were only slightly better than chance and usually beaten by extrapolation (*W8-11 · V2*, an analogy, not biomedical).

### 5.2 Reference classes (fixed before the search)

| Class | What was found | Direction |
|---|---|---|
| RC1 Declared limits later broken | Dublin 1928 (<65), Fries 1980 (85), Olshansky et al. 1990/2001 (85): "broken on average within about five years" (*W8-06*); an **existence class**: no denominator of all claims | Pessimists have been wrong before; this alone does not show acceleration |
| RC2 Anti-ageing claims that failed | Sirtuin activators: acquired for $270M in 2008; a trial suspended after kidney damage in 5 of 24 patients (*W8-12 · V1*); an **existence class** | Optimists have been wrong before |
| RC3 First-in-class chronic-disease drugs | Likelihood of approval from Phase I: 7.9% (BIO, 2011-2020) and 6.7% (2014-2023); Alzheimer's trials 0.4% success; median 8 years from first trials to approval (2010-14 approvals) (*W5-27, W5-28, W5-31, W5-32*) | Delay and attrition |
| RC4 Institutional stalls | TAME: status unresolved, sources contradict (*W5-12 · V1*); ICD-11 dropped "old age" (*W5-16 · V1*) | Institutional friction |
| RC5 Forecast accuracy | Tetlock (*W8-11*) | Weight on any stated date |
| RC6 Step-changes in cause-specific mortality | HIV after combination therapy (about −70% in two years in one cohort); coronary deaths halved in 20 years, about half from treatment and half from risk factors; childhood leukaemia five-year survival from about 10-14% to about 90-94% (*W8-14, W8-15, W8-16 · V2*) | Speed-up is real for single causes, not shown across all causes |

Pairs: RC1 with RC2; RC3 and RC4 with RC6; RC5 is general. The classes give priors on delay and speed-up, not dates. Two first-in-class chronic-disease therapies took 21 years (statins: discovery 1973, mortality trial 1994) and 31 years (GLP-1 agonists: discovery 1992, cardiovascular outcome trial 2023) from discovery to a hard-outcome result (the dates are V1 pointers).

### 5.3 Bottlenecks

- **Measurement.** No ageing biomarker or clock is reported qualified by the FDA (*W5-18 · V1*); clocks respond to interventions unevenly (a 2026 analysis of 51 studies found two clocks most responsive; *W5-22 · V2*) and replicate noise can be years (*W5-20 · V2*). Without a validated surrogate, proving an ageing effect means mortality trials of many years.
- **Regulation.** The FDA does not recognise ageing as an indication (a trade-press sentence; *W5-14 · V1*); the National Institute on Aging describes the ordinary IND route for geroscience drugs (*W5-13 · V2*); ICD-11 replaced "old age" with "ageing-associated decline in intrinsic capacity" (*W5-16 · V1*). ARPA-H funds up to $144 million over five years for seven teams, including a 726-person trial (rapamycin, dapagliflozin, semaglutide versus placebo; intrinsic-capacity endpoint) that aims to "establish a regulatory path" (*W5-07, W5-08 · V2-P*).
- **Capital.** Large private rounds are reported (a $1.8 billion valuation for Retro Biosciences; a $435 million round for NewLimit, V1), public and philanthropic streams (Hevolution more than $400 million committed; XPRIZE Healthspan $101 million, award in 2030; *W5-24, W5-09 · V2-P*), but sector totals conflict ($18.4 billion vs $8.49 billion vs "over $30 billion"; *W5 event log · V1*) and are not used.
- **Translation.** Base rates above. Company-reported programme status includes ER-100's first dosing, a dog lifespan drug whose efficacy and safety sections the FDA's veterinary centre reportedly accepted (approval not confirmed), a dissolved senolytic company, and a stopped azelaprag programme (*W5-01 to W5-06*, mostly V2-P or V1).
- **Demand and equity.** In 2013, 56% of Americans said they would not want treatments that let them live to 120 or more, 51% said it would be bad for society, 66% expected only the wealthy to get them and 79% said everyone should (Pew; *W7-08 · V2*). In 2025 the mean desired lifespan was 91 and 29% wanted to reach 100 (*W7-09 · V2*). Demand is framing-dependent (42% wanted unlimited life if good health was stipulated, from authors who run longevity companies; *W7-10, W7-13*). Population-level LEV needs most of the population treated: with a fixed 40% of the population on an intervention, the population death rate can fall at most 40% at a given time before selection, far short of what the model needs (arithmetic; `[SPECULATIVE]` for the real world). Between- and within-country inequality figures were not obtained.
- **Economics.** Delayed-ageing scenarios are valued at $7.1 trillion over 50 years for 2.2 extra years of US life expectancy (Goldman et al. 2013; *W7-01*) and $38 trillion per extra year (Scott et al. 2021; *W7-03*): they measure different things, come from groups with stakes, and are not ranked here.

### 5.4 Scenarios and leading indicators

Each scenario's necessary conditions and its four expected observations by 2030 (fixed in the plan before any rating; `03_analysis_plan.md` §9):

| Outcome | Necessary conditions | Expected by 2030 |
|---|---|---|
| **S1 / O1** stagnation | No large, stackable effect appears; pace stays at or below about 2.6% a year | no human hard-outcome benefit from an ageing-biology intervention; no regulator accepts an ageing composite endpoint; large-mammal lifespan effects fail to replicate; post-2019 pace at or below the historical range |
| **S2 / O2** acceleration short of LEV | Cause-specific step-changes continue (cardiometabolic, cancer, infection) and lift the pace to about 3-4% a year for decades | at least one drug or programme with a large all-cause benefit in humans (already true: §4.2); no ageing-biology hard-outcome benefit; endpoints accepted for diseases, not ageing |
| **S3 / O3** LEV by 2060 | Human proof by about 2032; approval by about 2040; then serial effects of at least 3-4 age-years about every 3-4 years across all causes, with brain and other resistant hazard improving | hard-outcome or mortality-relevant human benefit reported; systemic reprogramming (or equivalent) in human trials; a regulator-accepted surrogate for ageing; independent replication of large-mammal lifespan extension |
| **S4 / O4** LEV 2061-2100 | The same chain shifted by two to four decades | at least one ageing-biology intervention in human trials; large-mammal proof of principle; a biomarker-validation roadmap; funding at or above today's |

The model's classifier applies the outcome rule to illustrative trajectories (`T6_scenario_classification.csv`): a historical pace continuing is O1; a ramp to 4% a year is O2; a ramp reaching the threshold by 2045 is O3 (onset 2040); the same ramp started in 2071 is O4 (onset 2085); a ramp to 1.5 times the threshold with 5% of hazard unimproved is O2 (a 13-year escape); with 1% unimproved it is O3 (a 26-year escape). These illustrate the machinery. **They are not forecasts and carry no probabilities.**

### 5.5 Weighing the evidence

The plan's analysis of competing hypotheses rates each item against each outcome's 2030 expectations (weights: 3 human mortality data, official statistics and multi-site lifespan data; 2 regulatory and institutional facts, single-lab data; 1 forecasts and company statements). Ordering is by weighted inconsistency only.

| Evidence item (weight) | O1 | O2 | O3 | O4 |
|---|---|---|---|---|
| No ageing indication and no qualified ageing biomarker; biomarker reliability problems (2; V1/V2 sources) | C | C | **I** (no accepted surrogate by 2030) | N |
| No mortality-outcome trial of an ageing-biology intervention seen that could report by 2030; human programmes are Phase 1/2 or function endpoints (2; V2/V2-P) | C | C | **I** (no hard-outcome benefit by 2030) | C (interventions are in human trials) |
| Caloric restriction in primates: two labs, conflicting survival results (2) | C (non-replication) | N | N | N |
| Large mouse effects are modest and mostly single-lab; ITP effects replicate but are modest (3 / 1) | N | N | N | N |
| Cardiometabolic human effects already large (§4.2) (3) | N | C | N | N |
| Biomarker-validation reviews published (2) | N | N | N | C |
| Funding: large private and prize capital; sector totals conflicting (1) | N | N | N | C |
| Advocates' forecasts (1) | N | N | C | N |
| **Weighted inconsistency** | 0 | 0 | **4** | 0 |
| **Expectations with any evidence** (of 4) | 3 | 3 | 2 | 3 |

**Reading.** Current evidence is not yet diagnostic among O1, O2 and O4. It is already inconsistent with two of O3's four preconditions for 2030 (no accepted surrogate; no hard-outcome trial in view), which is by construction the most demanding set. This does not make O3 impossible (a fast start after 2030 is compatible with the chain in §5.4); it says the evidence to date does not support an early-onset timeline. The plan's optional probability band was **not offered**: five conjunctive factors (a large human-relevant effect exists; effects stack at cadence; safe delivery including the brain; regulation, capital and access; no residual cause) have no V3 evidential anchor, so the band is "not estimable". `[AUTHOR-JUDGMENT]`

---

## 6. What this might mean for an individual (bounded, not medical advice)

The race to onset. If LEV arrived after a given number of years, what is the chance a person of a given age is alive, and what would their remaining life then look like? Illustrative model arithmetic with US-like placeholder mortality, before any LEV, with 1.5% a year improvement continuing until onset (`T5_race_table.csv`):

| Age now | Onset in 20 years | Onset in 30 years | Onset in 40 years | Expected remaining life at onset if the death rate then freezes (20 / 30 / 40 years) |
|---|---|---|---|---|
| 40 | 93% | 84% | 69% | 145 / 73 / 36 years |
| 50 | 84% | 67% | 42% | 63 / 31 / 15 years |
| 60 | 67% | 39% | 13% | 27 / 13 / 6 years |
| 70 | 39% | 11% | 1% | 11 / 6 / 3 years |

![The race to onset](phase3_analysis/outputs/F4_race_to_onset.png)

Two things follow, both `[SPECULATIVE]` as predictions and `[ESTABLISHED]` as arithmetic: the age at which you meet an onset matters more than almost anything else, and onset at an advanced age gives decades, not millennia. Whether or when onset happens is the unknown. The best-evidenced human levers for being alive and well at any future date are the same cardiometabolic and behavioural ones in §4.2 (blood pressure, lipids, smoking, diabetes and weight management, physical activity and diet), which are worth roughly 1-5 age-years each in trials and more in observational contrasts. They are ordinary preventive medicine to discuss with a clinician, not a route to LEV. Cautions: consumer "biological age" tests are unreliable (replicate noise up to years; *W5-20*), unproven longevity clinics were not reviewed, and nothing here supports buying any product or protocol. Trial participation, where safe and eligible, is a way to contribute to the evidence; cryonics and similar routes are out of scope (no revival has been demonstrated).

---

## 7. Limitations and how to strengthen this report

1. **Evidence base.** Web-search summaries only; no primary texts; no figure at V3; the shared search cap ended workstreams at 17-51 searches each of 60-120 planned. Whole areas are thin or unsearched: senolytic and thymic human data beyond pilots, long-lived species, vaccines and screening, life-expectancy-at-65 rankings, decade-by-sex hazard tables, official projections, inequality within and between countries, surveys and prediction markets. The workstream files list ready resume queries (W1: 40; W4: 43; W6: 50; W7 about 30).
2. **Verification.** The independent second-agent re-verification required for load-bearing figures could not run. The coordinator's own supplement (`W8`) is not independent. Several figures rest on a single summary and some summaries conflict (the origin of the term "actuarial escape velocity"; TAME status; ER-100 timing; the 4% actuarial figure).
3. **Same-family review.** Drafting, review and ethics roles are one model family. Independent review of the model specification by a biodemographer is recommended before any reliance on §3-§4.
4. **Model.** A Gompertz-type description of adult mortality with two-component, frailty and plateau extensions; the hazard level, floor and resistant shares are placeholders or ranges; cause structure and cohort effects are omitted; the frontier-set rule (countries ranked by life expectancy at 65) could not be executed, so results are stated for generic high-income populations; the D-N and D-1 conclusions rest on arithmetic, while the pace comparison rests on old or all-age figures.
5. **Bias.** Advocate material dominates the accessible forecast literature; stakes are recorded for both camps.
6. **What would change the conclusions.** Age-specific decline rates by decade from Human Mortality Database-type tables (they would sharpen the 4-9× gap, up or down); the Debonneuil paper's definition (it might reconcile the 4% figure); a human mortality result for any ageing-biology intervention; an independent replication of the RMR1-type combination effect; regulatory recognition of an ageing endpoint.

**Recommended next steps.** Raise the session search cap (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`, set in the environment's settings; a new session picks it up) or widen network access to the scholarly hosts, then run the resume queues and the independent re-verification; commission a demographer's review of `03_analysis_plan.md` and `lev_model.py`.

---

## 8. Conclusion

LEV is a demanding and precisely definable target: sustained death-rate declines of about 8% a year at every age from 50 to 90. Medicine has delivered roughly a tenth to a quarter of that pace, in the form of one-off gains of 1-5 age-years from cardiometabolic control plus larger observational lifestyle effects. Ageing-biology interventions are early: modest, sex-dependent, and mostly single-lab effects in mice; safety and biomarker results in humans; and a first small partial-reprogramming trial in the eye. The route to LEV would need repeated, stackable, safe effects across all causes, including the brain, with a regulatory and access path that does not yet exist. On the evidence reviewed, an onset before the mid-2030s is unsupported; a later onset is possible but conditional on steps not yet shown; and "not this century" cannot be excluded. The most useful things a reader can do with this report are to watch the 2030 indicators in §5.4 and to treat any timeline that cannot state its definition, band, and duration as a claim, not a forecast.

---

## References

Verification-level tags are as defined at the top; **all figures are summary-mediated**. Bibliographic details are as seen in search results, and page numbers are omitted where not seen. Items marked (V2-P) are the party's own report.

**Definitions, demography, forecasts**
- de Grey, A. D. N. J. (2004). Escape velocity: Why the prospect of extreme human life extension matters now. *PLoS Biology, 2*(6), 723-726. https://doi.org/10.1371/journal.pbio.0020187 [W1-01, W6-01 · V2]
- Debonneuil, E., Loisel, S., & Planchet, F. (2018). Do actuaries believe in longevity deceleration? *Insurance: Mathematics and Economics, 78*, 325-338. [W1-02, W8-08 · V2]
- Oeppen, J., & Vaupel, J. W. (2002). Broken limits to life expectancy. *Science, 296*(5570), 1029-1031. https://doi.org/10.1126/science.1069675 [W1-03, W8-06 · V2]
- Vaupel, J. W. (2010). Biodemography of human ageing. *Nature, 464*, 536-542. [W1-04 · V2]
- Vaupel, J. W., Villavicencio, F., & Bergeron Boucher, M. P. (2021). Demographic perspectives on the rise of longevity. *Proceedings of the National Academy of Sciences, 118*(9), e2019536118. https://doi.org/10.1073/pnas.2019536118 [W1-05 · V2]
- Olshansky, S. J., Willcox, B. J., Demetrius, L., & Beltrán-Sánchez, H. (2024). Implausibility of radical life extension in humans in the twenty-first century. *Nature Aging, 4*(11), 1635-1642. https://doi.org/10.1038/s43587-024-00702-3 [W1-06, W6-05 · V2 / V2-P]
- Andrade, Camarda, & Pifarré i Arolas. (2025). Cohort mortality forecasts indicate signs of deceleration in life expectancy gains. *Proceedings of the National Academy of Sciences.* https://doi.org/10.1073/pnas.2519179122 [W1-07 · V2; initials, volume and pages not seen]
- Patricio, S. C., & Baudisch, A. (2026). *Evidence on slowing progress in longevity: Is it misleading?* (arXiv:2608.07223). https://arxiv.org/abs/2608.07223 [W1-08 · V2]
- Bonnet, F., et al. (2026). Potential and challenges for sustainable progress in human longevity. *Nature Communications, 17*, Article 996. [W1-09 · V2]
- Rau, R., Soroko, E., Jasilionis, D., & Vaupel, J. W. (2008). Continued reductions in mortality at advanced ages. *Population and Development Review, 34*(4), 747-768. [W8-09 · V2, existence only]
- Dong, X., Milholland, B., & Vijg, J. (2016). Evidence for a limit to human lifespan. *Nature, 538*(7624), 257-259. https://doi.org/10.1038/nature19793 [W6-07 · V2-P]
- Institute and Faculty of Actuaries, Continuous Mortality Investigation. (n.d.). *Mortality improvements and CMI model: Frequently asked questions*. [W8-02 · V2]
- National Bureau of Economic Research. (2002, March). Why do death rates decline? *NBER Digest*. [W8-03 · V2]
- National Academies Press. (2000). *Beyond six billion: Forecasting the world's population* (Ch. 7). [W8-03 · V2]
- National Center for Health Statistics. (2020). *Mortality in the United States, 2019* (NCHS Data Brief No. 395). [W8-04 · V2]
- Organisation for Economic Co-operation and Development. (2019/2021). *Health at a glance*. [W8-05 · V2]
- Social Security Administration. (2005). Literature review of long-term mortality projections. *Social Security Bulletin, 66*(1). [W8-07 · V2]
- Society of Actuaries. (1998). Life expectancy in the future: A summary of a discussion among experts. *North American Actuarial Journal, 2*(4). [W8-10 · V2]
- Tetlock, P. E. (2005). *Expert political judgment: How good is it? How can we know?* Princeton University Press. [W8-11 · V2]
- Longevity Escape Velocity Foundation. (n.d.). *Robust Mouse Rejuvenation: Study 1 and updates*. https://www.levf.org/ [W3-10, W6-02 · V2-P]
- Diamandis, P. H. (2024). *Longevity escape velocity: Nearing immortality?* https://www.diamandis.com/blog/longevity-escape-velocity [W6-04 · V2-P]
- XPRIZE Foundation. (2023; 2026). *XPRIZE Healthspan* (competition page; finalist announcement). [W6-03, W5-09 · V2-P]

**Human hazard reductions**
- Wright, J. T., et al. (2015). A randomized trial of intensive versus standard blood-pressure control. *New England Journal of Medicine.* https://doi.org/10.1056/NEJMoa1511939 [W2-01 · V2; initials, volume and pages not seen]
- Jaeger, et al. (2024). Long-term mortality in the SPRINT cohort. *Alzheimer's & Dementia.* https://doi.org/10.1002/alz.095416 [W2-03 · V2, flagged: appears to be an abstract; figures unattributed]
- Ettehad, D., et al. (2016). Blood pressure lowering for prevention of cardiovascular disease and death: A systematic review and meta-analysis. *The Lancet.* [W2-04 · V2]
- Cholesterol Treatment Trialists' Collaboration. (2010). Efficacy and safety of more intensive lowering of LDL cholesterol: A meta-analysis of data from 170,000 participants in 26 randomised trials. *The Lancet, 376*, 1670-1681. [W2-06 · V2]
- Lincoff, A. M., et al. (2023). Semaglutide and cardiovascular outcomes in obesity without diabetes. *New England Journal of Medicine.* https://doi.org/10.1056/NEJMoa2307563 [W2-15 · V2]
- Zinman, B., et al. (2015). Empagliflozin, cardiovascular outcomes, and mortality in type 2 diabetes. *New England Journal of Medicine.* https://doi.org/10.1056/NEJMoa1504720 [W2-17 · V2]
- (2025). Cardiovascular outcomes with tirzepatide versus dulaglutide in type 2 diabetes. *New England Journal of Medicine, 393*, 2409-2420. https://doi.org/10.1056/NEJMoa2505928 [W2-16 · V2; authors not displayed]
- Jha, P., et al. (2013). 21st-century hazards of smoking and benefits of cessation in the United States. *New England Journal of Medicine, 368*, 341-350. [W2-13 · V2]
- Li, Y., et al. (2018). Impact of healthy lifestyle factors on life expectancies in the US population. *Circulation, 138*(4), 345-355. [W8-17 · V2]
- Ford, E. S., et al. (2007). Explaining the decrease in U.S. deaths from coronary disease, 1980-2000. *New England Journal of Medicine.* https://doi.org/10.1056/NEJMsa053935 [W8-15 · V2]
- Palella, F. J., et al. (1998). Declining morbidity and mortality among patients with advanced human immunodeficiency virus infection. *New England Journal of Medicine.* https://doi.org/10.1056/NEJM199803263381301 [W8-14 · V2]
- Improvements in the survival of children and adolescents with acute lymphoblastic leukemia; Our World in Data, *Childhood leukemia: How a deadly cancer became treatable*. [W8-16 · V2]

**Ageing biology and interventions**
- López-Otín, C., Blasco, M. A., Partridge, L., Serrano, M., & Kroemer, G. (2023). Hallmarks of aging: An expanding universe. *Cell, 186*, 243-278. [W8-28 · V2]
- Jiang, N., et al. (2025). Sex as a major determinant of pro-longevity drug efficacy: A review of two decades of the NIA Interventions Testing Program. *The Journals of Gerontology: Series A, 80*(8), glaf138. [W3-01 · V2]
- Harrison, D. E., et al. (2009). Rapamycin fed late in life extends lifespan in genetically heterogeneous mice. *Nature, 460*(7253), 392-395. [W3-02 · V2]
- Miller, R. A., et al. (2014). Rapamycin-mediated lifespan increase in mice is dose and sex dependent and metabolically distinct from dietary restriction. *Aging Cell, 13*(3), 468-477. [W3-03 · V2]
- Harrison, D. E., et al. (2014). Acarbose, 17-alpha-estradiol, and nordihydroguaiaretic acid extend mouse lifespan preferentially in males. *Aging Cell.* [W3-04 · V2]
- Miller, R. A., et al. (2020). Canagliflozin extends life span in genetically heterogeneous male but not female mice. *JCI Insight, 5*(21), e140019. [W3-06 · V2]
- Strong, R., et al. (2022). Lifespan benefits for the combination of rapamycin plus acarbose and for captopril in genetically heterogeneous mice. *Aging Cell.* https://doi.org/10.1111/acel.13724 [W3-07 · V2]
- Baker, D. J., et al. (2016). Naturally occurring p16Ink4a-positive cells shorten healthy lifespan. *Nature, 530*, 184-189. [W8-18 · V2]
- Xu, M., et al. (2018). Senolytics improve physical function and increase lifespan in old age. *Nature Medicine, 24*, 1246-1256. [W8-19 · V2]
- Pilot study of senolytics to improve cognition and mobility in older adults at risk for Alzheimer's disease. (2025). *eBioMedicine.* [W8-20 · V2]
- Influence of rapamycin on safety and healthspan metrics after one year: PEARL trial results. (2025). *Aging, 17*(4). [W5-11, W8-21 · V2]
- Colman, R. J., et al. (2014). Caloric restriction reduces age-related and all-cause mortality in rhesus monkeys. *Nature Communications, 5*; Mattison, J. A., et al. (2017). Caloric restriction improves health and survival of rhesus monkeys. *Nature Communications, 8*, 14063. [W8-26 · V2]
- Fuentealba, M., et al. (2025). Multi-omics analysis reveals biomarkers that contribute to biological age rejuvenation in response to therapeutic plasma exchange. *Aging Cell.* https://doi.org/10.1111/acel.70103 [W8-22 · V2, sponsor-linked]
- Fahy, G. M., et al. (2019). Reversal of epigenetic aging and immunosenescent trends in humans. *Aging Cell.* https://doi.org/10.1111/acel.13028 [W8-23 · V2]
- Ocampo, A., et al. (2016). In vivo amelioration of age-associated hallmarks by partial reprogramming. *Cell.* [W4-01 · V2]
- Lu, Y., et al. (2020). Reprogramming to recover youthful epigenetic information and restore vision. *Nature, 588*, 124-129. [W4-02 · V2]
- Browder, K. C., et al. (2022). In vivo partial reprogramming alters age-associated molecular changes during physiological aging in mice. *Nature Aging.* [W4-03 · V2]
- Macip, C. C., et al. (2024). Gene therapy-mediated partial reprogramming extends lifespan and reverses age-related changes in aged mice. *Cellular Reprogramming.* [W4-04 · V2-P, company-authored]
- Yucel, & Gladyshev. (2024). The long and winding road of reprogramming-induced rejuvenation. *Nature Communications.* [W4-05 · V2]
- Abad, M., et al. (2013). Reprogramming in vivo produces teratomas and iPS cells with totipotency features. *Nature, 502*, 340-345. [W4-06 · V2]
- Yang, J.-H., et al. (2023). Loss of epigenetic information as a cause of mammalian aging. *Cell, 186*(2), 305-326. [W4-10 · V2]
- Life Biosciences. (2026, June 9). *First patient dosed in Phase 1 trial of ER-100 for optic neuropathies* [Press release]; ClinicalTrials.gov NCT07290244. [W4-08, W4-09, W5-01 · V2 / V2-P]
- Kidney xenotransplantation enters the clinical trial era; United Therapeutics (2025). EXPAND first transplant [Press release]. [W8-24 · V2 / V2-P]
- Anti-amyloid therapies for Alzheimer disease (PMC review) and related reviews of lecanemab and donanemab. [W8-25 · V2, leading query]

**Translation, regulation, funding, base rates**
- Moqri, M., et al. (2024). Validation of biomarkers of aging. *Nature Medicine, 30*, 360-372. https://doi.org/10.1038/s41591-023-02784-9 [W5-19 · V2]
- Higgins-Chen, A. T., et al. (2022). A computational solution for bolstering reliability of epigenetic clocks. *Nature Aging.* [W5-20 · V2]
- Belsky, D. W., et al. (2022). DunedinPACE, a DNA methylation biomarker of the pace of aging. *eLife, 11.* [W5-21 · V2]
- (2026). Responsiveness of epigenetic aging biomarkers to longevity interventions in humans. *Nature Medicine.* [W5-22 · V2]
- National Institute on Aging. (n.d.). *Information on FDA review of geroscience-related IND applications*. [W5-13 · V2]
- ARPA-H. (2026). PROSPR research teams (news release); UT Health San Antonio. (2026). VITAL-H trial (news release). [W5-07, W5-08 · V2-P]
- Hevolution Foundation. (2024). *$400M funding surge* [Press release]. [W5-24 · V2-P]
- BIO, Informa, & QLS Advisors. (2021). *Clinical development success rates and contributing factors 2011-2020*. [W5-27, W8-13 · V2 / V2-P]
- Norstella / Citeline. (n.d.). *Why are clinical development success rates falling?* [W5-28 · V2-P]
- Wong, C. H., Siah, K. W., & Lo, A. W. (2019). Estimation of clinical trial success rates and related parameters. *Biostatistics, 20*(2), 273-286. [W5-29 · V2; headline figure not confirmed]
- Cummings, J. L., et al. (2014). Alzheimer's disease drug-development pipeline: Few candidates, frequent failures. *Alzheimer's Research & Therapy.* [W5-31 · V2]
- (2017). Timelines of translational science: From technology initiation to FDA approval. *PLOS ONE.* https://doi.org/10.1371/journal.pone.0177371 [W5-32 · V2]
- Marín Penella. (2024). Should the European Medicines Agency consider ageing a disease? *Bioethics.* [W5-15 · V1]; How "old age" was withdrawn as a diagnosis from ICD-11. (2022). *The Lancet Healthy Longevity.* [W5-16 · V1]; American Federation for Aging Research, *TAME* [W5-12 · V1].
- MIT Technology Review (2010) and Pharmafile on GSK/Sirtris. [W8-12 · V1]

**Economics, attitudes, policy**
- Goldman, D. P., et al. (2013). Substantial health and economic returns from delayed aging may warrant a new focus for medical research. *Health Affairs, 32*(10), 1698-1705. [W7-01 · V2]
- Scott, A. J., Ellison, M., & Sinclair, D. A. (2021). The economic value of targeting aging. *Nature Aging, 1*, 616-623. https://doi.org/10.1038/s43587-021-00080-0 [W7-03 · V2]
- Olshansky, S. J., Perry, D., Miller, R. A., & Butler, R. N. (2006). In pursuit of the longevity dividend. *The Scientist, 20*(3), 28-36. [W6-06, W7-06 · V2-P]
- Pew Research Center. (2013, August 6). *Living to 120 and beyond: Americans' views on aging, medical advances and radical life extension*. [W7-08 · V2]
- Pew Research Center. (2025, November 6). *How Americans are thinking about aging*. [W7-09 · V2]
- Donner, Y., et al. (2016). Great desire for extended life and health amongst the American public. *Frontiers in Genetics, 6*, Article 353. [W7-10 · V2]
- Aparicio, A. (2025). Public alignment with longevity biotechnology: An analysis of framing in surveys and opinion studies. *Biogerontology, 26*, Article 13. [W7-13 · V2]

**Analysis materials** (this repository, `research-outputs/lev-longevity-escape-velocity/`): `phase1_scoping/` (question, blueprint, analysis plan, reviews); `phase2_investigation/` (protocol, workstream evidence files W1-W8); `phase3_analysis/model/` (code and 24 tests) and `phase3_analysis/outputs/` (tables T1-T6, figures F1-F5, run manifest).
