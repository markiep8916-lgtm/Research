# Can Sleep Be Eliminated Safely? Theories, Technologies, Human Limits, and Animals That Barely Sleep

**Type:** Multi-strand evidence review (web-sourced; four parallel literature sweeps, then a synthesis). Not a systematic review.
**Date:** 2026-09-26
**Companion reports:** [`sleep-need-and-reduction.md`](sleep-need-and-reduction.md) · [`amyloid-beta-function-and-clearance-without-sleep.md`](amyloid-beta-function-and-clearance-without-sleep.md)
**Question:** What theories exist for safely eliminating sleep entirely? How do they compare with animals that need no sleep or very little?

---

## Executive summary

1. **No organism has been shown to live without sleep.** Four standards together would establish true sleeplessness: EEG, arousal threshold, homeostatic rebound, and long-term health. Nothing meets all four. Every "sleepless" case, animal or human, turned out on closer study to be one of five things:
   - **split** sleep: one brain hemisphere at a time (dolphins, frigatebirds)
   - **fragmented** sleep: thousands of micro-naps (penguins)
   - **deferred** sleep: repaid later (frigatebirds, elephant seals)
   - **reduced** sleep with hidden costs (cavefish)
   - **unmeasured** or misperceived sleep (bullfrog, swifts, the human "never sleeps" claims)
2. **Sleep's *amount* is flexible; sleep's *existence* does not appear to be.** Genes, ecology and season can move sleep need by hours. In one case (migrating sparrows) resistance to sleep loss switches on seasonally. No mechanism takes need to zero.
3. **Almost every current technology acts on the signal (feeling sleepy), not the need.** That applies to orexin drugs, stimulants, brain stimulation and adenosine blockers. Where researchers measured the underlying debt, it persisted, and in some cases the treatment made it harder to repay. That makes these tools **safety hazards when used as sleep substitutes**: they remove the warning while the impairment continues.
4. **Sleep predates brains.** Jellyfish and Hydra have homeostatically regulated sleep. The newest mechanistic work traces sleep pressure to universal cellular costs: DNA damage, mitochondrial oxidative leak, and lipid peroxidation. Sleep looks less like a removable brain feature and more like a maintenance window for aerobic cells.
5. **Realistic ceiling (5–15 years): compression, not elimination.** Plausibly 4–6 hours of *augmented* sleep for some people. Two convergent routes could get there: (a) drugs aimed at short-sleep gene pathways such as SIK3 and DEC2; (b) closed-loop deepening of slow-wave sleep. Either would need a molecular readout proving the need was actually discharged.
6. **Total elimination would require replacing *every* function of sleep at once, while the brain stays awake.** Those functions include synaptic renormalisation, DNA repair, redox balance, waste clearance, immune and endocrine regulation, and memory. Only one function (memory consolidation) has a demonstrated partial waking substitute (quiet rest).

---

## Part A: What would "eliminating sleep" have to achieve?

### A1. Two separable things

| | **Sleep signal (pressure)** | **Sleep need (substrate)** |
|---|---|---|
| What it is | The drive and feeling of sleepiness: adenosine, orexin gating, Process S in Borbély's two-process model | The underlying deficit that sleep repairs |
| Measurable by | Subjective sleepiness, the Maintenance of Wakefulness Test | Slow-wave activity (SWA) rebound; SNIPP phosphorylation (sleep-need-index phosphoproteins) in mice ([Wang et al. 2018, *Nature*](https://www.nature.com/articles/s41586-018-0218-8)) |
| Easy to suppress? | **Yes**: caffeine, modafinil, orexin agonists, tDCS | **No intervention shown to discharge it without sleep** |

A true substitute must shrink the *recovery* rebound, not just postpone it. Almost no candidate has been tested against that standard. Those that were tested failed it (§C2).

### A2. What sleep appears to do (and how hard each function is to replace)

| Theory | Core claim | Evidence strength | Replace while awake? |
|---|---|---|---|
| **Adaptive inactivity / energy allocation** ([Siegel 2009](https://www.nature.com/articles/nrn2697); [Schmidt 2014](https://www.sciencedirect.com/science/article/pii/S0149763414001997)) | Sleep mostly schedules inactivity; "investment" tasks such as repair and growth are bundled into it | Solid comparative data; the inference is contested | **Moderate**: duration can shrink, but investment work must move elsewhere ([Rattenborg 2025, *Sleep*](https://pubmed.ncbi.nlm.nih.gov/41045131/): functions can run during wake, just less cheaply) |
| **Synaptic homeostasis (SHY)** ([Tononi & Cirelli 2014](https://www.cell.com/neuron/fulltext/S0896-6273(13)01186-0)) | Wake strengthens synapses; slow-wave sleep scales them back down | Moderate; contested ([Frank 2012](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3317003/)) | **Hard**: conflicts with ongoing waking learning |
| **Glymphatic clearance** ([Xie 2013](https://pmc.ncbi.nlm.nih.gov/articles/PMC3880190/); [Hauglund 2025, *Cell*](https://pubmed.ncbi.nlm.nih.gov/39788123/)) | Sleep speeds removal of waste from brain fluid | **Actively contested**: [Miao 2024](https://www.nature.com/articles/s41593-024-01638-y) found clearance *lower* in sleep; a 2026 human crossover study ([*Nat Commun*](https://www.nature.com/articles/s41467-026-68374-8)) supports sleep-linked clearance | **Moderate**: a fluid-mechanics problem, possibly engineerable (40 Hz, see §C) |
| **DNA repair** ([Zada 2019](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6401120/); [Zada 2021, *Mol Cell*](https://www.cell.com/molecular-cell/fulltext/S1097-2765(21)00933-3)) | Neurons build up DNA breaks while awake; sleep lets them repair; the Parp1 repair-sensor enzyme drives sleep pressure | Moderate; zebrafish and mouse only | **Hard** |
| **Mitochondrial / oxidative cost** ([Kempf 2019](https://www.nature.com/articles/s41586-019-1034-5); [Sarnataro 2025, *Nature*](https://www.nature.com/articles/s41586-025-09261-y); [Nature 2025 lipid peroxidation](https://pmc.ncbi.nlm.nih.gov/articles/PMC12043502/)) | Sleep pressure *is* electron-transport leak and lipid-peroxidation stress in the neurons that trigger sleep | Strong mechanism in flies; unproven in mammals | **Hard, but the most "bug-like" and tractable**: in flies, an electron "overflow" route blunted the pressure |
| **Memory consolidation** ([Diekelmann & Born 2010](https://www.nature.com/articles/nrn2762); [TMR meta-analysis, 2020](https://pubmed.ncbi.nlm.nih.gov/32027149/)) | Slow-wave and REM sleep replay and reorganise memories | Strong that sleep *helps*; weak that it is *necessary* | **Partial**: quiet wakeful rest boosts retention (d ≈ 0.38, [2025 meta-analysis](https://link.springer.com/article/10.3758/s13423-025-02665-x)) |
| **Pre-neural origin** ([Cassiopea, Nath 2017](https://pubmed.ncbi.nlm.nih.gov/28943083/); [Hydra, Kanaya 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7541080/); [Anafi et al. 2019](https://www.nature.com/articles/s41583-018-0098-9)) | Sleep predates brains; its original function was likely metabolic | Good for jellyfish and Hydra; speculative beyond them | **Very hard to impossible** |
| **Multi-function bundle** ([Rosenblum & Dresler 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13163177/); [*Physiol Rev* 2025](https://journals.physiology.org/doi/full/10.1152/physrev.00007.2025)) | Sleep serves many functions at once | Broad consensus | **Very hard**: each function needs its own replacement, all simultaneously |

---

## Part B: Animals with minimal or unusual sleep

### B1. Comparison table

| Species | Sleep amount (condition) | How they cope | Repaid later? | Known costs | Evidence quality | Lesson for humans |
|---|---|---|---|---|---|---|
| **Bottlenose dolphin / orca newborns** | "Little or no typical sleep" for about 1 month ([Lyamin 2005](https://pubmed.ncbi.nlm.nih.gov/15988513/)) | Sleep while swimming, one hemisphere at a time, one eye closed ([Sekiguchi 2006](https://www.nature.com/articles/nature04898); [Gnone 2006](https://www.nature.com/articles/nature04899)) | No rebound | None reported | **Contested**; no EEG. The "baby dolphins never sleep" myth is not supported | Low |
| **Adult dolphin** | 5–15 days of continuous echolocation vigilance ([Branstetter 2012](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0047478)) | One-hemisphere sleep (inferred) | Not measured | No performance decline | n = 2, no EEG | Low: humans can't sustain one-hemisphere sleep |
| **Northern fur seal** | REM cut about 96% (80 → 3 min/day) for ≥ 2 weeks in water ([Lyamin 2018](https://www.cell.com/current-biology/fulltext/S0960-9822(18)30624-9)) | One-hemisphere slow-wave sleep takes the place of REM | Little or no REM rebound (2 of 4 seals) | None seen | EEG, n = 4 | Challenges the idea that REM is essential; mechanism unavailable to humans |
| **Northern elephant seal** | < 2 h/day at sea for months ([Kendall-Bar 2023, *Science*](https://www.science.org/doi/10.1126/science.adf0566)) | 10–20 min naps during deep dives, including REM | About 10 h/day on land | Unknown | EEG, wild animals | Sleep is compressed and timed for safety, not removed |
| **Great frigatebird** | About 42 min/day in flight vs 12.8 h on land ([Rattenborg 2016](https://www.nature.com/articles/ncomms12468)) | Bouts of about 12 s, one or both hemispheres | **Yes**: deeper, longer sleep once on land | Unknown | EEG, wild | **Postponement, not elimination** |
| **Pectoral sandpiper (males)** | Awake > 95% of the time for 19 days ([Lesku 2012, *Science*](https://www.science.org/doi/10.1126/science.1220939)) | More intense slow-wave sleep in the sleep that remains | Partly, through intensity | Possible delayed survival costs | EEG, wild | Sleep loss can pay off reproductively; the mechanism is unknown |
| **Chinstrap penguin** | > 10,000 microsleeps/day of about 4 s, totalling > 11 h per hemisphere ([Libourel 2023, *Science*](https://www.science.org/doi/10.1126/science.adh0771)) | Fragmentation | Not applicable (total is normal) | Unknown | EEG, wild | They sleep a *normal* amount, just in fragments. In humans, microsleeps are dangerous lapses |
| **White-crowned sparrow** | About ⅔ less sleep during migration, with cognition maintained ([Rattenborg 2004](https://journals.plos.org/plosbiology/article?id=10.1371%2Fjournal.pbio.0020212)) | **A seasonal resistance state** | None during migration | Outside migration, **one night of restriction impairs them** | EEG, captive | **Most promising lead**: resistance to sleep loss is a switchable, regulated state. The mechanism is unknown; DARPA funded work on it |
| **Common swift** | Airborne > 99% of the time for 10 months ([Hedenström 2016](https://www.sciencedirect.com/science/article/pii/S0960982216310636)) | Unknown | Unknown | Unknown | **Sleep never measured** | Speculative |
| **African elephant** | About 2 h/day; 46 h awake during a disturbance ([Gravett 2017](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0171903)) | Unknown | No rebound reported | Unknown | Trunk-movement actigraphy, n = 2, no EEG | Suggestive only |
| **Giraffe** | About 4.6 h (zoo) ([Tobler 1996](https://pubmed.ncbi.nlm.nih.gov/8795798/)) | Short bouts | — | — | Behavioural only; the "30 min/day" figure is a myth | Low |
| **Horse** | Needs to lie down for REM | — | **REM forces its way through: horses collapse** ([UC Davis](https://compneuro.vetmed.ucdavis.edu/research/equine-sleep-and-sleep-disorders)) | Injury | Clinical | **Counterexample**: REM need can be strict |
| **Bullfrog** | "No sleep" ([Hobson 1967](https://pubmed.ncbi.nlm.nih.gov/4163680/)) | "Alert rest" | — | — | **One unreplicated 1967 study** | Unreliable |
| **Mexican cavefish** | About 80% less sleep, permanently, in 3 separately evolved populations ([Duboué 2011](https://www.cell.com/current-biology/fulltext/S0960-9822(11)00292-2)) | **More orexin (hypocretin) signalling**; blocking it restores sleep ([Jaggard 2018](https://elifesciences.org/articles/32637)) | Some sleep homeostasis retained | **More brain DNA damage and gut oxidative stress, fatty liver, high blood glucose**, but no faster ageing ([*eLife* 2024–25](https://elifesciences.org/articles/99191)) | Strong, replicated | **Best model of evolved permanent reduction.** Costs exist but are tolerated through compensating adaptations (low metabolism). The lever, orexin, is conserved in humans |
| **Drosophila (wild-type)** | Some sleep 4–15 min/day; lifelong forced restriction costs females about 3 days of lifespan and males none ([Geissmann 2019](https://www.science.org/doi/10.1126/sciadv.aau9253)) | Individual variation | Small rebound | Minimal | Strong | "Most sleep does not serve a vital function," in flies |
| **Drosophila sleep mutants** (*sleepless*, *Shaker*, *Hyperkinetic*) | 60–80%+ less sleep | Excitability mutations | — | **Lifespan halved; memory deficits** ([Koh 2008](https://www.science.org/doi/10.1126/science.1155942); [Cirelli 2005](https://www.nature.com/articles/nature03486)) | Strong; confounded because these genes do many things | Mixed |
| **C. elegans** (sleepless mutants) | Little developmental sleep | — | — | **Survival halved under stress**; normal lifespan otherwise ([*Curr Biol* 2018](https://www.cell.com/current-biology/fulltext/S0960-9822(18)31338-1)) | Strong | Sleep matters most under stress |
| **Cassiopea / Hydra** | Sleep-like state *without a brain* | — | **Rebound present** | Hydra: less cell proliferation | Good | Sleep is ancient and deeply embedded |
| **Tuna / ram-ventilating sharks** | Claimed never to sleep | Claims of one-hemisphere sleep are **unverified** (blogs only) | — | — | Weak | None |

### B2. The central debate: "Do all animals sleep?"

- **Siegel ([2008, *Trends Neurosci*](https://pubmed.ncbi.nlm.nih.gov/18682212/)):** some animals may not meet the criteria for sleep, several suspend it for weeks without paying it back, and lethality is proven only in rats.
- **Cirelli & Tononi ([2008, *PLoS Biol*](https://journals.plos.org/plosbiology/article?id=10.1371%2Fjournal.pbio.0060216)):** there is no clear evidence of any sleepless species. Siegel's examples reflect gaps in method (the bullfrog is one old study; dolphins sleep one hemisphere at a time; reef fish sleep while swimming).
- **Field review ([Lesku & Rattenborg 2022, *SLEEP Advances*](https://pmc.ncbi.nlm.nih.gov/articles/PMC10104415/)):** animals that sleep very little "are indeed performing well on little sleep, with the costs remaining unclear." Either they have "evolved an undescribed ability to supplant sleep needs," or they "endure an undescribed cost."
- **Status as of 2026:** unresolved. No species has had the *absence* of sleep shown by EEG, arousal threshold and homeostasis together.

### B3. How animals cope, and whether humans can do the same

| Animal strategy | Examples | Available to humans? |
|---|---|---|
| One hemisphere sleeps while the other stays awake | Dolphins, fur seals, frigatebirds | **No.** Humans show only a slight "first-night effect" asymmetry within full sleep ([Tamaki 2016](https://www.cell.com/current-biology/fulltext/S0960-9822(16)30174-9)) |
| Micro-fragmentation | Penguins | **No.** Human microsleeps are lapses that cause errors and crashes |
| Postponing sleep and repaying it later | Frigatebirds, elephant seals | Partly (all-nighters followed by recovery sleep), with cognitive costs in the meantime |
| Deeper sleep in less time | Sandpipers, SIK3-variant mice | **Plausible target** (closed-loop stimulation, SIK3 pathway) |
| Seasonal resistance switch | Migrating sparrows | **Unknown mechanism: the best research lead** |
| Evolved higher orexin plus metabolic compensation | Cavefish | Orexin drugs exist, but they mask the need; the costs in cavefish are real |

---

## Part C: Theories and technologies for eliminating human sleep

### C1. Comparison table

| Approach | Rationale | Best evidence | Stage | **Removes need or masks it?** | Main risk |
|---|---|---|---|---|---|
| **Orexin-2 receptor agonists**: oveporexton (TAK-861), alixorexton, danavorexton | Orexin controls the switch that holds the brain awake | Phase 3 success in narcolepsy type 1 ([Takeda 2025](https://www.takeda.com/newsroom/newsreleases/2025/positive-results-phase-3-oveporexton-narcolepsy-type-1/)); reported FDA approval in 2026 ([AJMC](https://www.ajmc.com/view/fda-approves-first-orexin-agonist-narcolepsy-type-1)). Danavorexton kept sleep-deprived healthy volunteers awake ([*J Sleep Res* 2023](https://onlinelibrary.wiley.com/doi/10.1111/jsr.13878)) | Approved for narcolepsy; phase 1b in healthy sleep-deprived people | **Masks** | TAK-994 caused **liver toxicity** that two animal species and healthy-volunteer trials all missed ([*Toxicol Sci*](https://academic.oup.com/toxsci/article/204/2/143/7950696)); chronic use in healthy people is untested |
| **Nasal orexin-A** (DARPA-funded) | Same | Restored memory-task performance in sleep-deprived monkeys ([Deadwyler 2007](https://www.jneurosci.org/content/27/52/14239)) | Animal | Masks | Never advanced |
| **Ampakine CX717** (DARPA CAP) | Boosts glutamate signalling | Worked in monkeys ([*PLOS Biol* 2005](https://journals.plos.org/plosbiology/article?id=10.1371%2Fjournal.pbio.0030299)); human trials were null ([2007](https://pubmed.ncbi.nlm.nih.gov/17955941/)) or partial and **interfered with recovery sleep** ([2011](https://pubmed.ncbi.nlm.nih.gov/21940760/)) | Failed in humans | Masks, and obstructs repayment of the debt | Did not work |
| **Modafinil / solriamfetol / pitolisant / caffeine** | Offset the consequences of sleep loss | Recovery sleep still required ([Buguet 1995](https://onlinelibrary.wiley.com/doi/10.1111/j.1365-2869.1995.tb00173.x)); **caffeine lowers slow-wave activity, degrading the marker used to measure the debt** ([Landolt](https://www.nature.com/articles/1380255)) | Approved | **Masks** | Impairment hidden from the person |
| **tDCS / rTMS / vagus-nerve stimulation** | Restore underactive cortex | tDCS held vigilance for 30 h ([McIntire 2014](https://pubmed.ncbi.nlm.nih.gov/25047826/)); rTMS helped **only in sleep-deprived subjects** ([Luber 2008](https://pubmed.ncbi.nlm.nih.gov/18203694/)) | Small human pilots | **Masks** (the effect is defined by the deprived state) | Small samples, hard to blind; impairment hidden |
| **Closed-loop acoustic slow-wave enhancement** | Slow-wave activity is the "currency" of restoration, so more per hour means fewer hours needed | Strengthens slow oscillations ([*Nat Commun* 2017](https://www.nature.com/articles/s41467-017-02170-3)) but with no memory benefit ([*eNeuro* 2019](https://www.eneuro.org/content/6/6/ENEURO.0306-19.2019)) and a **built-in ceiling** ([*J Neurosci* 2015](https://www.jneurosci.org/content/35/17/6630)). Mis-timed tones *harm* sleep ([bioRxiv 2025](https://www.biorxiv.org/content/10.1101/2025.02.06.636865v1.full)) | Human pilots | **Possibly a modest genuine reduction; unproven** | Ceiling effect; easy to get backwards |
| **Short-sleep genes** (DEC2, ADRB1, NPSR1, GRM1, SIK3) | Sleep duration has an adjustable set point | Mice with the human SIK3-N783Y variant sleep less but have *higher* delta power ([*PNAS* 2025](https://www.pnas.org/doi/10.1073/pnas.2500356122)); FNSS (familial natural short sleep) mutations reduced amyloid and tau in Alzheimer's-model mice ([*iScience* 2022](https://www.cell.com/iscience/fulltext/S2589-0042(22)00234-6)). But **UK Biobank carriers do not sleep less** ([Weedon 2022, *PLOS Genet*](https://journals.plos.org/plosgenetics/article?id=10.1371%2Fjournal.pgen.1010356)) | Human genetics plus animal models; no intervention exists | **Reduces need by hours; never to zero** | Genes with many effects; no ethical basis for editing them as enhancement |
| **Kinase / phosphoproteome** (LKB1→SIK3→HDAC4, SNIPPs) | Sleep need *is* a synaptic phosphorylation state | [Wang 2018](https://www.nature.com/articles/s41586-018-0218-8); [*Nature* 2022](https://www.nature.com/articles/s41586-022-05510-6) | Theory / animal | **Unknown, and the key open question**: blocking the signal could let damage build up | No selective drug exists |
| **Adenosine / astrocyte blockade** | Adenosine released by astrocytes drives sleep pressure | Blocking astrocyte signalling (dnSNARE mice) blunted pressure **and** spared some cognition ([Halassa 2009](https://www.cell.com/fulltext/S0896-6273(08)01017-9)) | Animal | Unresolved (caffeine, the human equivalent, masks) | One result, narrow set of outcomes |
| **40 Hz gamma stimulation for waking clearance** | Clear brain waste without sleep | Amyloid cleared through the glymphatic route in mice ([Murdock 2024](https://www.nature.com/articles/s41586-024-07132-6)) | Animal | Would replace one function; never tested as a sleep substitute | The sleep–clearance link itself is contested |
| **Gut antioxidants** | Sleep prevents lethal oxidative stress | Rescued survival in sleep-deprived flies ([Vaccaro 2020](https://www.cell.com/cell/fulltext/S0092-8674(20)30555-9)). **Challenged**: when deprivation avoided extra stress, neither death nor gut ROS appeared after 240 h ([Gilestro lab bioRxiv 2025, preprint](https://www.biorxiv.org/content/10.1101/2025.09.05.674430v1)) | Animal, contested | Claimed replacement; the premise is in doubt | The stress confound undermines both the claim and its premise |
| **Wakeful rest / awake replay** | Sleep consolidates memory | d ≈ 0.38 ([2025 meta-analysis](https://link.springer.com/article/10.3758/s13423-025-02665-x)) | Established in humans | **Genuinely replaces one function** | Covers only consolidation |
| **Inducing local or one-hemisphere sleep** | Rotate brain regions through sleep while awake | No proposal or study found. Local sleep in awake humans *is* the impairment ([Nir 2017](https://www.nature.com/articles/nm.4433); [Vyazovskiy 2011](https://www.nature.com/articles/nature10009)) | Speculative | Neither | Uncontrolled offline periods cause errors |
| **Synthetic torpor** (Q neurons) | Lower metabolic demand | Hibernation-like state in mice ([Takahashi 2020](https://www.nature.com/articles/s41586-020-2163-6)); **but hibernators must warm up to sleep, and build up debt during torpor** ([Trachsel 1991](https://pubmed.ncbi.nlm.nih.gov/2058740/)) | Animal | Neither: *more* unconsciousness, not less | Hypothermia |
| **Polyphasic schedules** | Nap-only schedules are "more efficient" | Uberman gave less real sleep than a single block of the same length; most participants dropped out ([*Sleep* 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13163185/)) | Tested; failed | Neither: produces a deficit | Harm |
| **Nanotech / brain-computer interfaces** | Clear waste or renormalise synapses in place | None | **Speculative, not yet science** | Unknown | Not testable as posed |

### C2. The decisive pattern

Where an intervention suppressed the signal *and* researchers measured the need:
- **Caffeine** suppressed slow-wave activity, degrading the debt marker itself.
- **CX717** interfered with recovery sleep.
- **rTMS** helped *only* in the sleep-deprived state.

In each case the deficit persisted beneath an improved surface. This is the strongest argument that current "anti-sleep" technology is **concealment, not substitution**.

---

## Part D: Human limits: has anyone lived without sleep?

| Case | What happened | What it shows |
|---|---|---|
| **Fatal familial insomnia** (a PRNP prion disease) | Sleep spindles collapse and sleep is lost over months; death after about 18 months (range 7–36) ([NEJM 1992](https://www.nejm.org/doi/full/10.1056/NEJM199202133260704)) | Prion degeneration is the accepted cause of death, not sleep loss alone. Sleep *loss* still seems to worsen the course: **Schenkein & Montagna 2006**, one uncontrolled case, extended survival to about 26 months with ketamine- and nitrous-oxide-induced sleep ([MedGenMed](https://pubmed.ncbi.nlm.nih.gov/17406188/)) |
| **Morvan syndrome** (Fischer-Perroudon 1974) | About 4 months without organised sleep on EEG ([abstract](https://www.sciencedirect.com/science/article/abs/pii/0013469474901321)) | Not healthy: nightly hallucinations, and **REM-like fragments pushing into waking**. Sleep broke through in abnormal form rather than disappearing |
| **Randy Gardner** (1964, 264 h) | Hallucinations by days 4–5; severe memory and concentration problems by day 11; slept about 15 h afterwards ([summary](https://en.wikipedia.org/wiki/Randy_Gardner_sleep_deprivation_experiment)) | Microsleeps can't be ruled out. Guinness stopped recognising these records over health risks |
| **Longer "records"** (McDonald 453 h; Weston 449 h) | Unmonitored ([The Conversation](https://theconversation.com/no-sleep-challenge-the-dangers-of-sleep-deprivation-236608)) | Microsleeps probable |
| **"Never sleeps" claims** (Thai Ngoc, Al Herpin, Paul Kern, Yakov Tsiperovich) | None had a polysomnogram (overnight sleep study); all "rest" for hours ([VietNamNet](https://vietnamnet.vn/en/a-man-sleepless-for-39-years-E16969.html)) | Consistent with **paradoxical insomnia**: real sleep, not perceived ([Sleep Foundation](https://www.sleepfoundation.org/insomnia/paradoxical-insomnia)) |
| **Local sleep in awake humans** ([Nir 2017](https://www.nature.com/articles/nm.4433); [Hung 2013](https://pubmed.ncbi.nlm.nih.gov/23288972)) | Neurons slow down and go offline just before attention lapses | **Sleep pressure is displaced, not defeated**: it leaks into wakefulness |
| **Controlled deprivation** | Hallucinations in 90% of studies, progressing toward psychosis ([Waters 2018](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2018.00303/full)); glucose tolerance impaired after 6 nights of 4 h ([Spiegel 1999](https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(99)01376-8/abstract)); total deprivation is fatal to rats in 11–32 days ([Rechtschaffen](https://academic.oup.com/sleep/article-abstract/12/1/13/2742633)) | The experiment that would test elimination in humans **cannot ethically be run** |

**Conclusion: no human has ever been verified to live healthily without sleep.** Every *recorded* case of near-zero sleep involved severe brain disease. Every *healthy* claim is self-reported and was never recorded.

---

## Part E: Synthesis

### E1. How the three bodies of evidence line up

| Question | Animals | Humans | Mechanism research |
|---|---|---|---|
| Can sleep be *reduced*? | Yes, a lot (seasonal, ecological, evolved) | Yes, modestly (short-sleep genes: about 4–6 h, but biobank data don't replicate it) | Yes (SIK3, DEC2; slow-wave enhancement) |
| Can it be *eliminated*? | No verified case | No verified case | No mechanism |
| What happens when it is pushed out? | Split, fragmented, deferred, or hidden costs | Microsleeps, local sleep, hallucinations, psychosis | Masking; debt persists |
| Are there costs? | Yes where measured (cavefish DNA and gut damage; mutant lifespan; sensitivity to stress) | Yes (cognitive, metabolic, mortality associations) | Unknown long-term; one liver-toxicity precedent |

### E2. Ranked research directions toward *reduction* (not elimination)

1. **Seasonal resistance to sleep loss (sparrow model).** Find out what switches it on. This is the only case of cognition staying intact on much less sleep where the same animal is impaired outside that state, which makes it a clean experimental contrast.
2. **The SIK3 / SNIPP pathway.** It offers both a lever and a *biomarker of need* against which any intervention could be honestly tested.
3. **Closed-loop slow-wave enhancement.** Non-drug, mechanistically grounded, but with a ceiling.
4. **Mitochondrial and oxidative sources of sleep pressure.** The most "bug-like" account, but so far only in flies.
5. **Offloading individual functions while awake** (wakeful rest for memory; possibly 40 Hz stimulation for clearance). This works one function at a time.

### E3. Why "safe elimination" fails on current evidence

- **Conceptual problem:** the field has no agreed, measurable account of *all* of what sleep does. You cannot engineer a substitute for a function you cannot specify.
- **Biological problem:** sleep is tied to universal cellular costs of being active (DNA breaks, oxidative leak), predates brains, and shows up in every animal examined, including hibernators that have to warm up in order to sleep.
- **Safety problem:** the tools that exist hide impairment, and chronic safety in healthy people is untested (the TAK-994 liver toxicity is the precedent).
- **Ethical problem:** the validating experiment (prolonged total sleep deprivation in humans) cannot be run. Sleep-reduction technology also invites coercion in military, medical-residency and shift-work settings.

---

## Evidence-quality notes and contradictions disclosed

- **Contested:**
  - glymphatic clearance during sleep (Xie 2013 / Hauglund 2025 / *Nat Commun* 2026 vs Miao 2024)
  - gut-ROS lethality (Vaccaro 2020 vs Gilestro-lab 2025 preprint)
  - dolphin newborn sleeplessness (Lyamin vs Sekiguchi and Gnone)
  - human short-sleep genes (family studies vs UK Biobank)
  - SHY (Tononi vs Frank)
  - interpretation of hibernation slow-wave activity as sleep debt
  - tDCS outperforming caffeine
- **Weak or unreplicated:** bullfrog "no sleep" (1967); elephants (n = 2, actigraphy); swift sleep (never measured); the four human "never sleeps" claims (all self-reported).
- **Not independently confirmed here:** the 2026 FDA approval of oveporexton, reported by trade press (AJMC, Pharmacy Times) and not checked against an FDA source. A research strand also mentioned a small randomised crossover trial (about 25 adults) in which an acoustic slow-wave device partly offset chronic-restriction deficits; no citation could be recovered, so it is **omitted from the tables**.
- **Mechanistic depth:** the mitochondrial and DNA-repair mechanisms come mainly from flies and zebrafish; their relevance to humans is untested.

---

## Safety note

Nothing here supports trying to eliminate or drastically cut your own sleep. Stimulants, brain stimulation and polyphasic schedules hide impairment rather than removing it. The first objective sign of deficit can be a crash, a clinical error or a psychotic episode. Prescription wake-promoting drugs belong under medical supervision.

---

*AI disclosure: This report was compiled by an AI assistant (Claude Code) on 2026-09-26. Four AI research sub-agents ran parallel web searches; the lead agent then synthesised their findings. Many full-text hosts (nature.com, PubMed/PMC, OUP, Springer, plos.org, mpg.de) were blocked by the network proxy, so many figures come from abstracts, publisher summaries and science-news coverage rather than full papers. Verify key numbers against the primary sources before academic use. This is not medical advice.*
