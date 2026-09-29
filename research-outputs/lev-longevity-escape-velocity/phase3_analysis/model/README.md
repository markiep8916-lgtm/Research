# LEV threshold model

Code for SQ1 and SQ2 of the LEV run, implementing the frozen specification in
`../../phase1_scoping/03_analysis_plan.md`.

| File | Purpose |
|---|---|
| `lev_model.py` | Hazard models M0 (Gompertz-Makeham with proportional progress), M1 (amenable and resistant components), M2 (gamma frailty, plateau cap); criteria D-N, D-1, D-H, and cohort D-1 (added after the Phase 5 review); selection damping; escape duration; outcome classifier (LEV window, O1-O4); race table; level-to-rate conversion including the animal upper-bound conversion and the effects-needed composition; Latin-hypercube sampling. Numpy only. |
| `tests/test_lev_model.py` | Unit tests that check the analytic predictions P1-P6 against numerical life-table integration, plus the Phase 5 additions (cohort D-1 limit of beta/2 at low hazard, ordering of the criteria, selection damping, conversions): 32 tests. |
| `run_analysis.py` | Produces tables T1-T6 (T1b: threshold by age; T1c: cohort D-1 threshold; T1d: selection damping; T3b: effects needed; T5b: race table across the hazard level; T5c: finite-escape variant; T6b: onset year by ramp duration), figures F1-F5, and Monte Carlo sensitivity (F2) with a run manifest. |
| `params.json` | Literature-informed inputs with their sources and levels. `mu80` and `c` remain placeholders and `v_hi` is a team-set bound; the manifest records this. |

## Status of the parameters

The defaults are **pre-Phase-2 placeholders** (plan section 5). Any output produced without a
`--params` file is stamped `PLACEHOLDER PARAMETERS` and is not a finding. Phase 3 replaces the
placeholders with values sourced from Phase 2 evidence (V3 inputs fixed; anything else a ranged free
parameter) and logs every change in the plan's deviations log.

## Reproduce

```
cd research-outputs/lev-longevity-escape-velocity/phase3_analysis/model
python3 -m pytest tests -q
python3 run_analysis.py --out ../outputs --params params.json --mc-n 300 --seed 20260929
```

Requires Python 3 with numpy and matplotlib (`pip install numpy matplotlib`).

## Conventions

- Time `t` is years from 2026; ages are in years; hazards are per year.
- `r` is a continuous (log) rate; an annual proportional decline `d` converts with `r = -ln(1 - d)`.
- `v = r / beta` is the age-equivalent pace (age-years gained per calendar year).
- D-N holds at year `t` when `e(x+1, t+1) >= e(x, t)` at every age in the band (default 50-90).
- The race table reports the probability of being alive at onset and the expected remaining life at onset.
  After onset the age-related part declines at `m * beta` per year (`m = 1` is exactly D-H: hazard frozen).
