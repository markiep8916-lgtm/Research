"""Produce the Phase 3 tables and figures from the frozen model specification.

Usage:
    python3 run_analysis.py --out ../outputs [--params params.json] [--mc-n 300] [--seed 20260929] [--smoke]

``params.json`` (optional) may contain:
    {"params": {...Params overrides...},
     "r_hist": 0.015,                      # historical proportional decline per year
     "ranges": {"beta": [lo, hi], ...},    # Monte Carlo ranges (override plan section 5)
     "effects": [{"name": ..., "hr": ..., "source": "W2-03", "level": "V3"}],   # for T3
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
    rows = []
    for e in effects:
        g = m.age_years(e["hr"], p.beta)
        rows.append([e["name"], e["hr"], round(g, 2), round(m.cadence_years(e["hr"], p.beta), 2),
                     e.get("source", ""), e.get("level", "")])
    write_csv(os.path.join(out, "T3_effects_in_age_years.csv"),
              ["intervention", "hazard_ratio", "age_years_once", "years_between_new_effects_to_sustain_v1",
               "source_card", "verification_level"], rows)


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
    fig.text(0.01, 0.01, STAMP_PLACEHOLDER, fontsize=6, color="gray")
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
    fig.text(0.01, 0.01, STAMP_PLACEHOLDER, fontsize=6, color="gray")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "F4_race_to_onset.png"), dpi=150)
    plt.close(fig)
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
    fig.text(0.01, 0.01, STAMP_PLACEHOLDER, fontsize=6, color="gray")
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
    ax.set_ylabel("period remaining life expectancy at a fixed age of 65 (years)")
    ax.legend(fontsize=7)
    ax.set_title("Life expectancy at 65 under proportional progress v = r/beta", fontsize=9)
    fig.text(0.01, 0.01, STAMP_PLACEHOLDER, fontsize=6, color="gray")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "F1_e65_by_v.png"), dpi=150)
    plt.close(fig)


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
    t0 = time.time()

    t1 = table_t1(a.out, p, placeholder)
    figure_f1(a.out, p)
    if cfg.get("observed"):
        table_t2(a.out, p, cfg["observed"])
    if cfg.get("effects"):
        table_t3(a.out, p, cfg["effects"])
    table_t4(a.out, p, r_hist, a.smoke)
    table_t5(a.out, p, r_hist)
    mc = monte_carlo(a.out, p, ranges, 40 if a.smoke else a.mc_n, a.seed)

    manifest = {
        "placeholder_parameters": placeholder,
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
