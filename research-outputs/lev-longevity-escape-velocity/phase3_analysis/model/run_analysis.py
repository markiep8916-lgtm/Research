"""Produce the Phase 3 tables and figures from the frozen model specification.

Usage:
    python3 run_analysis.py --out ../outputs [--params params.json] [--mc-n 300] [--seed 20260929] [--smoke]

``params.json`` (optional) may contain:
    {"params": {...Params overrides...},
     "placeholder_parameters": ["mu80", "c"],   # inputs still placeholders; recorded in the manifest
     "team_set_bounds": {...}, "parameter_sources": {...},   # recorded in the manifest
     "r_hist": 0.015,                      # historical proportional decline per year
     "ranges": {"beta": [lo, hi], ...},    # Monte Carlo ranges (override plan section 5)
     "effects": [{"name": ..., "hr": ..., "source": "W2-03", "level": "V3"},                   # for T3; "kind" is optional
                 {"name": ..., "lifespan_gain": 0.25, "L": 80, "kind": "animal_lifespan_proportional_upper_bound"}],
     "observed": [{"label": ..., "r_per_year": ..., "source": "W1-05", "level": "V3"}]}   # for T2

Without ``params.json`` the placeholder parameters from the plan are used and every
output file is stamped PLACEHOLDER PARAMETERS. Outputs are never findings until
Phase 3 fixes the inputs from Phase 2 evidence.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import subprocess
import time

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

import lev_model as m  # noqa: E402

AGES = [50, 60, 70, 80, 90]  # age band B (default 50-90)
STAMP_PLACEHOLDER = "PLACEHOLDER PARAMETERS (plan section 5); not findings"
STAMP = [STAMP_PLACEHOLDER]  # replaced in main() when a params file is supplied

DEFAULT_RANGES = {
    "beta": (0.069, 0.099),
    "mu80": (0.035, 0.070),
    "c": (0.0002, 0.0010),
    "rho": (0.0, 0.30),
    "r_r": (0.0, 0.04),
    "r_hist": (0.010, 0.025),
    "r_max_mult": (0.5, 2.0),
    "t_ramp": (10.0, 40.0),
    "t_start": (0.0, 20.0),
}


def write_csv(path, header, rows):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def git_commit():
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return "unknown"


# ------------------------------------------------------------------ T1
def table_t1(out, p, placeholder):
    rows = []
    for mrdt in (7.0, 8.0, 9.0, 10.0):
        beta = np.log(2) / mrdt
        q = p.with_(beta=beta)
        R = m.traj_constant(0.0)
        need = {}
        for x in (50, 65, 80):
            mu = float(m.hazard(x, 0.0, q, R))
            e = m.e_period(x, 0.0, q, R)
            need[x] = 1.0 / (1.0 - mu * e)
        # numeric check of the D-N threshold by bisection on v
        lo, hi = 0.5, 1.5
        for _ in range(30):
            mid = 0.5 * (lo + hi)
            marg = m.dn_margin([65], 1, q, m.traj_constant(mid * beta))
            lo, hi = (mid, hi) if marg[0, 0] < 0 else (lo, mid)
        rows.append([mrdt, round(beta, 4), round(m.required_annual_decline(beta), 4), round(0.5 * (lo + hi), 4),
                     round(need[50], 3), round(need[65], 3), round(need[80], 3)])
    write_csv(os.path.join(out, "T1_required_decline.csv"),
              ["MRDT_years", "beta", "annual_proportional_decline_for_v1", "numeric_v_threshold_D-N_age65",
               "D-1_required_v_age50", "D-1_required_v_age65", "D-1_required_v_age80"], rows)
    return rows


# ------------------------------------------------------------------ T2
def table_t2(out, p, observed):
    rows = []
    for o in observed:
        r = -np.log(1.0 - o["r_per_year"]) if o["r_per_year"] < 1 else o["r_per_year"]  # proportional/yr -> rate
        v = r / p.beta
        rows.append([o["label"], o["r_per_year"], round(v, 3), round(1.0 / v, 2) if v > 0 else "inf",
                     o.get("source", ""), o.get("level", "")])
    write_csv(os.path.join(out, "T2_observed_vs_required.csv"),
              ["label", "annual_proportional_decline", "v_age_years_per_year", "acceleration_needed_for_v1",
               "source_card", "verification_level"], rows)


# ------------------------------------------------------------------ T3
def table_t3(out, p, effects):
    """Effects in age-years. ``kind`` separates hazard-derived human results, observational life-year contrasts,
    the one animal hazard ratio, and the UPPER-BOUND lifespan-proportional reading of animal results (plan
    section 7): the last assumes the whole proportional animal gain transfers to a human lifespan of ``L`` years."""
    rows = []
    for e in effects:
        kind = e.get("kind", "human_hazard_ratio" if "hr" in e else "observational_life_years")
        if "hr" in e:
            g = m.age_years(e["hr"], p.beta)
            g_lo = m.age_years(e["hr"], 0.099)   # steeper Gompertz slope: fewer age-years
            g_hi = m.age_years(e["hr"], 0.069)
            hr = e["hr"]
        elif "lifespan_gain" in e:
            L = float(e.get("L", 80.0))
            g = m.lifespan_gain_to_age_years(e["lifespan_gain"], L)
            g_lo = g_hi = g
            hr = round(m.implied_hazard_ratio(g, p.beta), 3)   # implied, not observed
        else:
            g = g_lo = g_hi = float(e["age_years"])
            hr = ""
        rows.append([e["name"], kind, hr, round(g, 2), f"{g_lo:.2f} to {g_hi:.2f}", round(g, 2),
                     e.get("source", ""), e.get("level", "")])
    write_csv(os.path.join(out, "T3_effects_in_age_years.csv"),
              ["intervention", "kind", "hazard_ratio_observed_or_implied", "age_years_once_at_central_beta",
               "age_years_range_beta_0.099_to_0.069", "years_between_new_independent_effects_to_sustain_v1",
               "source_card", "verification_level"], rows)


def table_t3b(out, sizes=(2.1, 3.6, 4.4, 10.0, 20.0), overlaps=(0.0, 0.25, 0.5), window=20.0):
    """Composition (plan section 7): independent effects of nominal size g needed to sustain v = 1 over a window,
    when each new effect overlaps the earlier ones by 0, 25 or 50% (realised size g (1 - overlap))."""
    rows = [[g, ov, round(m.effects_needed(g, window, ov), 2)] for g in sizes for ov in overlaps]
    write_csv(os.path.join(out, "T3b_effects_needed_in_20_years.csv"),
              ["nominal_effect_size_age_years", "overlap_with_earlier_effects", f"independent_effects_needed_in_{int(window)}_years"],
              rows)
    return rows


# ------------------------------------------------------------------ T4 and F3
def table_t4(out, p, r_hist, smoke):
    rhos = [0.0, 0.02, 0.05, 0.10, 0.20, 0.30]
    rrs = [0.0, 0.01, 0.02, 0.04, p.beta]
    horizon = 40 if smoke else 60
    R = m.traj_ramp(r_hist, 1.5 * p.beta, 0.0, 20.0)  # ramp to 1.5 beta over 20 years, from 2026
    grid = np.zeros((len(rhos), len(rrs)))
    for i, rho in enumerate(rhos):
        for j, rr in enumerate(rrs):
            q = p.with_(rho=rho, r_r=rr)
            marg = m.dn_margin(AGES, horizon, q, R)
            grid[i, j] = m.longest_run(m.dn_ok_series(marg))[0]
    write_csv(os.path.join(out, "T4_escape_duration.csv"), ["rho_share_resistant"] + [f"r_r={x:.3f}" for x in rrs],
              [[rho] + list(map(int, grid[i])) for i, rho in enumerate(rhos)])
    fig, ax = plt.subplots(figsize=(6.4, 4.2))
    im = ax.imshow(grid, origin="lower", aspect="auto", cmap="viridis")
    ax.set_xticks(range(len(rrs)), [f"{x:.2f}" for x in rrs])
    ax.set_yticks(range(len(rhos)), [f"{x:.2f}" for x in rhos])
    ax.set_xlabel("improvement rate of the resistant part, r_r (per year)")
    ax.set_ylabel("resistant share of age-related hazard")
    for i in range(len(rhos)):
        for j in range(len(rrs)):
            ax.text(j, i, int(grid[i, j]), ha="center", va="center", color="w", fontsize=8)
    fig.colorbar(im, label=f"years D-N holds (of {horizon})")
    ax.set_title("Escape duration (D-N, ages 50-90)", fontsize=10)
    fig.text(0.01, 0.01, STAMP[0], fontsize=6, color="gray")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "F3_escape_duration.png"), dpi=150)
    plt.close(fig)
    return grid


# ------------------------------------------------------------------ T5
def table_t5(out, p, r_hist):
    rows = []
    for r_pre, label in ((0.0, "frozen 2026 mortality"), (r_hist, f"historical improvement {r_hist:.3f}/yr")):
        for a0 in (30, 40, 50, 60, 70, 80):
            for onset in (10, 20, 30, 40, 50):
                r = m.race_row(float(a0), float(onset), p, r_pre)
                rows.append([label, a0, onset, round(r["p_survive_to_onset"], 4), round(r["hazard_at_onset"], 5),
                             round(r["e_at_onset_m1"], 1), round(r["e_at_onset_m1.5"], 1),
                             round(r["e_at_onset_m2"], 1)])
    write_csv(os.path.join(out, "T5_race_table.csv"),
              ["pre_onset_scenario", "current_age", "onset_in_years", "p_survive_to_onset", "hazard_at_onset",
               "expected_remaining_life_at_onset_if_hazard_frozen", "..._if_decline_continues_at_1.5beta",
               "..._if_decline_continues_at_2beta"], rows)
    fig, ax = plt.subplots(figsize=(6.4, 4.0))
    for a0 in (30, 40, 50, 60, 70, 80):
        ys = [m.race_row(float(a0), float(T), p, r_hist, r_post_multiples=(1.0,))["p_survive_to_onset"]
              for T in range(0, 61, 5)]
        ax.plot(range(0, 61, 5), ys, label=f"age {a0} now")
    ax.set_xlabel("years until LEV onset")
    ax.set_ylabel("probability of being alive at onset")
    ax.legend(fontsize=7)
    ax.set_title("The race to onset (historical improvement continues until onset)", fontsize=9)
    fig.text(0.01, 0.01, STAMP[0], fontsize=6, color="gray")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "F4_race_to_onset.png"), dpi=150)
    plt.close(fig)
    return rows


def table_t5b(out, p, mu80_range, r_hist):
    """Race table sensitivity to the placeholder hazard level mu80 (low, central, high)."""
    rows = []
    for mu80 in (mu80_range[0], p.mu80, mu80_range[1]):
        q = p.with_(mu80=mu80)
        for r_pre, label in ((0.0, "frozen 2026 mortality"), (r_hist, "historical improvement")):
            for a0 in (40, 50, 60, 70):
                for onset in (20, 30, 40):
                    r = m.race_row(float(a0), float(onset), q, r_pre, r_post_multiples=(1.0,))
                    rows.append([mu80, label, a0, onset, round(r["p_survive_to_onset"], 4),
                                 round(r["e_at_onset_m1"], 1)])
    write_csv(os.path.join(out, "T5b_race_mu80_sensitivity.csv"),
              ["mu80", "pre_onset_scenario", "current_age", "onset_in_years", "p_survive_to_onset",
               "expected_remaining_life_at_onset_if_hazard_frozen"], rows)
    return rows


def table_t5c(out, p, r_hist, r_r=0.01, rhos=(0.02, 0.05, 0.10)):
    """Finite-escape variant of the race table (added after the Phase 5 review). After onset the amenable part of
    the age-related hazard keeps declining at 1.5 beta while a resistant share ``rho`` improves only at ``r_r``,
    so the hazard eventually turns up again. Compare with the frozen-hazard column of T5."""
    rows = []
    for a0 in (40, 50, 60, 70):
        for onset in (20, 30, 40):
            base = m.race_row(float(a0), float(onset), p, r_hist)
            row = [a0, onset, round(base["p_survive_to_onset"], 4), round(base["e_at_onset_m1"], 1),
                   round(base["e_at_onset_m1.5"], 0)]
            for rho in rhos:
                r = m.race_row(float(a0), float(onset), p.with_(rho=rho, r_r=r_r), r_hist)
                row.append(round(r["e_at_onset_m1.5"], 1))
            rows.append(row)
    write_csv(os.path.join(out, "T5c_race_finite_escape.csv"),
              ["current_age", "onset_in_years", "p_survive_to_onset_historical_improvement",
               "e_at_onset_if_hazard_frozen", "e_at_onset_if_decline_continues_at_1.5beta_no_resistant_share"]
              + [f"e_at_onset_if_decline_continues_at_1.5beta_resistant_share_{rho:g}_improving_{r_r:g}" for rho in rhos], rows)
    return rows


# ------------------------------------------------------------------ Monte Carlo and F2
def monte_carlo(out, p, ranges, n, seed):
    rng = np.random.default_rng(seed)
    s = m.latin_hypercube(n, ranges, rng)
    outcome = np.zeros(n)
    onset = np.full(n, np.nan)
    for i in range(n):
        q = p.with_(beta=s["beta"][i], mu80=s["mu80"][i], c=s["c"][i], rho=s["rho"][i], r_r=s["r_r"][i])
        R = m.traj_ramp(s["r_hist"][i], s["r_max_mult"][i] * q.beta, s["t_start"][i], s["t_ramp"][i])
        marg = m.dn_margin([50, 70, 90], 60, q, R, ds=0.25)
        ok = m.dn_ok_series(marg)
        run, start = m.longest_run(ok)
        outcome[i] = run
        if run > 0:
            onset[i] = start
    names = list(ranges)
    rho_s = {k: m.spearman(s[k], outcome) for k in names}
    write_csv(os.path.join(out, "MC_samples.csv"), names + ["longest_D-N_run_years", "onset_year"],
              [[s[k][i] for k in names] + [outcome[i], onset[i]] for i in range(n)])
    order = sorted(names, key=lambda k: abs(rho_s[k]))
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    ax.barh(order, [rho_s[k] for k in order], color="#4477aa")
    ax.axvline(0, color="k", lw=0.5)
    ax.set_xlabel("Spearman correlation with longest D-N run (years)")
    ax.set_title(f"Sensitivity (Latin hypercube, n={n}, seed={seed})", fontsize=9)
    fig.text(0.01, 0.01, STAMP[0], fontsize=6, color="gray")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "F2_tornado.png"), dpi=150)
    plt.close(fig)
    q = np.percentile(outcome, [5, 25, 50, 75, 95])
    return {"n": n, "seed": seed, "share_run_ge_20": float(np.mean(outcome >= 20)),
            "run_percentiles_5_25_50_75_95": [float(v) for v in q], "spearman": rho_s}


# ------------------------------------------------------------------ F1
def figure_f1(out, p):
    fig, ax = plt.subplots(figsize=(6.4, 4.0))
    t = np.arange(0, 41)
    for v in (0.25, 0.5, 1.0, 1.5):
        R = m.traj_constant(v * p.beta)
        ax.plot(t, [m.e_period(65, float(tt), p, R) for tt in t], label=f"v = {v} age-years per year")
    ax.set_xlabel("calendar years from 2026")
    ax.set_ylabel("remaining life expectancy at 65 (years)")
    ax.legend(fontsize=7)
    ax.set_title("Life expectancy at 65 under proportional progress v = r/beta", fontsize=9)
    fig.text(0.01, 0.01, STAMP[0], fontsize=6, color="gray")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "F1_e65_by_v.png"), dpi=150)
    plt.close(fig)


# ------------------------------------------------------------------ T1b and F5
def table_t1b(out, p):
    """Required constant progress rate by age: D-N (period) vs D-H (population cohort path), by frailty variance."""
    rows = []
    ages = (50, 60, 70, 80, 90, 100)
    fig, ax = plt.subplots(figsize=(6.4, 4.0))
    for s2 in (0.0, 0.1, 0.2, 0.4):
        q = p.with_(sigma2=s2)
        dn = [m.threshold_r(x, q) for x in ages]
        dh = [m.threshold_r_dh(x, q) for x in ages]
        for x, a, b in zip(ages, dn, dh):
            rows.append([s2, x, round(a, 4), round(1 - np.exp(-a), 4), round(a / q.beta, 3),
                         round(b, 4), round(1 - np.exp(-b), 4), round(b / q.beta, 3)])
        ax.plot(ages, [1 - np.exp(-b) for b in dh], marker="o", label=f"D-H population, frailty variance {s2}")
    ax.axhline(1 - np.exp(-p.beta), color="k", ls="--", lw=0.8, label="D-N (period), any frailty")
    ax.set_xlabel("age")
    ax.set_ylabel("required annual proportional decline in death rates")
    ax.legend(fontsize=7)
    ax.set_title("Required pace by age: period no-shrink vs cohort hazard-stationarity", fontsize=9)
    fig.text(0.01, 0.01, STAMP[0], fontsize=6, color="gray")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "F5_threshold_by_age.png"), dpi=150)
    plt.close(fig)
    write_csv(os.path.join(out, "T1b_threshold_by_age.csv"),
              ["frailty_variance", "age", "DN_r", "DN_annual_decline", "DN_v", "DH_pop_r", "DH_pop_annual_decline", "DH_pop_v"], rows)
    return rows


# ------------------------------------------------------------------ T1c and T1d
def table_t1c(out, p):
    """Cohort D-1 threshold by age (added after the Phase 5 review): the smallest constant progress rate at which
    cohort life expectancy at a fixed age rises by one year per year, counting the person's own future
    improvement (M0, no frailty). Shown beside the period D-N and period D-1 requirements."""
    rows = []
    for mrdt in (7.0, 8.0, 9.0, 10.0):          # the same slopes as T1 (beta = ln 2 / doubling time)
        beta = float(np.log(2) / mrdt)
        for c in (0.0002, 0.0004, 0.0010):
            q = p.with_(beta=beta, c=c)
            for x in (30, 40, 50, 65, 80, 90):
                r = m.threshold_r_d1_cohort(x, q)
                mu = float(m.hazard(x, 0.0, q, m.traj_constant(0.0)))
                v_period = 1.0 / (1.0 - mu * m.e_period(x, 0.0, q, m.traj_constant(0.0)))
                rows.append([mrdt, round(beta, 4), c, x, round(r, 4), round(1 - np.exp(-r), 4), round(r / beta, 3),
                             round(1 - np.exp(-beta), 4), round(1 - np.exp(-beta * v_period), 4)])
    write_csv(os.path.join(out, "T1c_cohort_D1_threshold.csv"),
              ["MRDT_years", "beta", "extrinsic_floor_c", "age", "cohort_D1_r", "cohort_D1_annual_decline",
               "cohort_D1_v", "period_DN_annual_decline", "period_D1_annual_decline"], rows)
    return rows


def table_t1d(out, p):
    """Selection damping of the observed (population) decline relative to the individual-level decline."""
    rows = []
    for s2 in (0.1, 0.2, 0.4):
        q = p.with_(sigma2=s2)
        for x in (60, 70, 80, 90):
            f = m.selection_damping(x, q)
            rows.append([s2, x, round(f, 3), round(1.0 / f, 2)])
    write_csv(os.path.join(out, "T1d_selection_damping.csv"),
              ["frailty_variance", "age", "observed_decline_as_share_of_individual_decline",
               "individual_decline_as_multiple_of_observed"], rows)
    return rows


# ------------------------------------------------------------------ T6
def table_t6(out, p, v_his, r_hist):
    """Illustrative trajectories. Every ramp starts at the historical rate ``r_hist`` and rises linearly over 20
    years (the same ramp as T4), so the S-E and S-F rows use the same trajectory as the 5% and 1% cells of T4
    (harmonised after the Phase 5 review; the first draft used 19-year ramps and 0.015)."""
    b = p.beta
    scen = [
        ("S-A historical pace continues (1.5%/yr)", p, m.traj_constant(-np.log(1 - 0.015))),
        ("S-B ramp to 4%/yr by 2036, then constant (the actuarial 4% claim)", p, m.traj_ramp(r_hist, -np.log(1 - 0.04), 0, 10)),
        ("S-C ramp to 1.3 beta over 20 years (by 2046), then constant (early LEV)", p, m.traj_ramp(r_hist, 1.3 * b, 0, 20)),
        ("S-D same ramp starting 2071 (late LEV)", p, m.traj_ramp(r_hist, 1.3 * b, 45, 20)),
        ("S-E ramp to 1.5 beta over 20 years, 5% of hazard unimproved", p.with_(rho=0.05, r_r=0.0), m.traj_ramp(r_hist, 1.5 * b, 0, 20)),
        ("S-F ramp to 1.5 beta over 20 years, 1% of hazard unimproved", p.with_(rho=0.01, r_r=0.0), m.traj_ramp(r_hist, 1.5 * b, 0, 20)),
    ]
    rows = []
    for label, q, R in scen:
        for vh in v_his:
            r = m.classify_outcome(q, R, v_hi=vh)  # individual level, full access
            rows.append([label, vh, r["outcome"], r["onset_year"] if r["onset_year"] else "", r["longest_dn_run"],
                         round(r["max_rolling_pace"], 3)])
    write_csv(os.path.join(out, "T6_scenario_classification.csv"),
              ["illustrative_trajectory", "v_hi", "outcome", "LEV_window_onset_year", "longest_DN_run_years",
               "max_rolling_20yr_pace_v"], rows)
    return rows


def table_t6b(out, p, r_hist, v_hi):
    """Onset year against ramp duration (full access, individual level): how quickly the pace must climb from the
    historical rate to 1.3 or 1.5 times the D-N threshold for a LEV window to start by a given year. This is the
    explicit basis of the report's lead-time statement; it says nothing about which ramp durations are plausible."""
    rows = []
    for mult in (1.3, 1.5):
        for T in (5, 10, 15, 20, 30, 40):
            R = m.traj_ramp(r_hist, mult * p.beta, 0.0, float(T))
            r = m.classify_outcome(p, R, v_hi=v_hi)
            rows.append([mult, T, r["outcome"], r["onset_year"] if r["onset_year"] else "", r["longest_dn_run"]])
    write_csv(os.path.join(out, "T6b_onset_by_ramp_duration.csv"),
              ["ramp_target_multiple_of_beta", "ramp_years_from_2026", "outcome", "LEV_window_onset_year",
               "longest_DN_run_years"], rows)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="../outputs")
    ap.add_argument("--params")
    ap.add_argument("--mc-n", type=int, default=300)
    ap.add_argument("--seed", type=int, default=20260929)
    ap.add_argument("--smoke", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    cfg = json.load(open(a.params)) if a.params else {}
    p = m.Params(**cfg.get("params", {}))
    r_hist = float(cfg.get("r_hist", 0.015))
    ranges = {k: tuple(v) for k, v in {**DEFAULT_RANGES, **cfg.get("ranges", {})}.items()}
    placeholder = not a.params
    if not placeholder:
        STAMP[0] = "Illustrative arithmetic with literature-informed parameters (Phase 2, V2 not V3); not a forecast"
    t0 = time.time()

    t1 = table_t1(a.out, p, placeholder)
    t1b = table_t1b(a.out, p)
    table_t1c(a.out, p)
    table_t1d(a.out, p)
    figure_f1(a.out, p)
    if cfg.get("observed"):
        table_t2(a.out, p, cfg["observed"])
    if cfg.get("effects"):
        table_t3(a.out, p, cfg["effects"])
    table_t4(a.out, p, r_hist, a.smoke)
    table_t3b(a.out)
    table_t5(a.out, p, r_hist)
    table_t5b(a.out, p, ranges["mu80"], r_hist)
    table_t5c(a.out, p, r_hist)
    table_t6(a.out, p, cfg.get("v_hi_sensitivity", [0.20, 0.30, 0.40]), r_hist)
    table_t6b(a.out, p, r_hist, cfg.get("team_set_bounds", {}).get("v_hi", {}).get("value", 0.30))
    mc = monte_carlo(a.out, p, ranges, 40 if a.smoke else a.mc_n, a.seed)

    placeholders = list(cfg.get("placeholder_parameters", [])) if not placeholder else ["all (no params file)"]
    manifest = {
        "placeholder_parameters": bool(placeholders),
        "placeholder_parameter_names": placeholders,
        "team_set_bounds": cfg.get("team_set_bounds", {}),
        "parameter_sources": cfg.get("parameter_sources", {}),
        "params": p.__dict__ | {"cap": None if np.isinf(p.cap) else p.cap},
        "r_hist": r_hist,
        "ranges": ranges,
        "mc": mc,
        "git_commit": git_commit(),
        "runtime_seconds": round(time.time() - t0, 1),
        "numpy": np.__version__,
    }
    json.dump(manifest, open(os.path.join(a.out, "run_manifest.json"), "w"), indent=1, default=float)
    print(json.dumps({k: manifest[k] for k in ("placeholder_parameters", "runtime_seconds")}))
    print("T1 rows:", *t1, sep="\n  ")
    print("MC:", json.dumps({k: v for k, v in mc.items() if k != "spearman"}))


if __name__ == "__main__":
    main()
