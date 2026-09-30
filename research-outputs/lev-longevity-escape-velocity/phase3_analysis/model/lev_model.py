"""LEV threshold model.

Implements the frozen specification in ``phase1_scoping/03_analysis_plan.md``:

* M0  Gompertz-Makeham hazard with proportional progress
      mu(x, t) = A e^{beta x} e^{-R(t)} + c
* M1  two components: an amenable part improving with R(t) and a resistant part
      (share ``rho``) improving at its own constant rate ``r_r``
* M2  gamma frailty (variance ``sigma2`` at age ``x_s``): population hazards
* criteria D-N (no-shrink), D-1 (one-for-one), D-H (hazard stationarity)
* cohort D-1 (added after the Phase 5 review, plan section 13): one-for-one on cohort life expectancy,
  which counts the person's own future improvement
* escape duration, race table, level-to-rate conversion (including the animal upper-bound conversion)

Numpy only. All ages are in years; time t is years from 2026 (t = 0).

The default parameters are PRE-PHASE-2 PLACEHOLDERS taken from the plan
(section 5). They are not findings. Phase 3 replaces them with values
sourced from Phase 2 evidence and logs each change in the plan's deviations log.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Callable

import numpy as np

Trajectory = Callable[[np.ndarray], np.ndarray]  # cumulative progress R(t)


@dataclass(frozen=True)
class Params:
    """Model parameters (placeholders until Phase 2 inputs are fixed)."""

    beta: float = 0.087      # Gompertz slope per year (MRDT = ln2/beta ~ 8 years)
    mu80: float = 0.050      # age-related hazard at age 80 in 2026 (excludes floor)
    c: float = 0.0004        # extrinsic-mortality floor, does not age or improve
    rho: float = 0.0         # share of the age-related hazard that resists intervention (M1)
    r_r: float = 0.0         # improvement rate of the resistant part (M1)
    sigma2: float = 0.0      # gamma-frailty variance at age x_s (M2); 0 disables
    x_s: float = 30.0        # age at which frailty is gamma(mean 1, variance sigma2)
    cap: float = float("inf")  # optional cap on the age-related hazard (plateau variant)

    @property
    def A(self) -> float:
        return self.mu80 * np.exp(-self.beta * 80.0)

    def with_(self, **kw) -> "Params":
        return replace(self, **kw)


# --------------------------------------------------------------------------
# progress trajectories: each returns the cumulative progress R(t) = integral of r
# --------------------------------------------------------------------------
def traj_constant(r: float) -> Trajectory:
    return lambda t: r * np.asarray(t, float)


def traj_ramp(r0: float, r1: float, t_start: float, t_ramp: float) -> Trajectory:
    """r(t) = r0 before t_start, linear to r1 over t_ramp years, then r1."""

    def R(t):
        t = np.asarray(t, float)
        out = r0 * np.minimum(t, t_start)
        tr = np.clip(t - t_start, 0.0, t_ramp)
        slope = (r1 - r0) / t_ramp if t_ramp > 0 else 0.0
        out = out + r0 * tr + 0.5 * slope * tr**2
        out = out + r1 * np.maximum(t - t_start - t_ramp, 0.0)
        return out

    return R


def traj_steps(g_age_years: float, every: float, beta: float, r_base: float = 0.0) -> Trajectory:
    """Discrete interventions of ``g`` age-years every ``every`` years (first at t = every),
    on top of a constant background decline ``r_base``."""

    def R(t):
        t = np.asarray(t, float)
        # no step before t = 0: a step function evaluated at negative times (as smoothing does) would otherwise
        # put a spurious step at t = 0
        return r_base * t + beta * g_age_years * np.floor(np.maximum(t, 0.0) / every)

    return R


def smooth_traj(Ra: Trajectory, window: int = 5) -> Trajectory:
    """Centred moving average of the cumulative progress ``Ra`` over ``window`` calendar years. Because the log
    death rate is linear in R(t), this is the plan's smoothing rule (a five-year centred moving average of log
    death rates, plan section 2) applied to a model trajectory. ``window = 1`` returns the trajectory unchanged."""
    half = window // 2
    offsets = np.arange(-half, half + 1, dtype=float)

    def R(t):
        t = np.asarray(t, float)
        return np.mean([Ra(t + k) for k in offsets], axis=0)

    return R


# --------------------------------------------------------------------------
# hazards
# --------------------------------------------------------------------------
def _mix(t, p: Params, Ra: Trajectory):
    t = np.asarray(t, float)
    return (1.0 - p.rho) * np.exp(-Ra(t)) + p.rho * np.exp(-p.r_r * t)


def ind_age_part(x, t, p: Params, Ra: Trajectory):
    """Individual age-related hazard (no frailty adjustment, no floor)."""
    x = np.asarray(x, float)
    return p.A * np.exp(p.beta * x) * _mix(t, p, Ra)


def hazard(x, t, p: Params, Ra: Trajectory):
    """Period hazard at age x, calendar time t.

    With frailty (sigma2 > 0) this is the population hazard of a synthetic cohort
    subjected to mortality frozen at time t (period-table convention).
    """
    h = ind_age_part(x, t, p, Ra)
    if p.sigma2 > 0:
        x = np.asarray(x, float)
        Hs = np.maximum(
            p.A * (np.exp(p.beta * x) - np.exp(p.beta * p.x_s)) / p.beta * _mix(t, p, Ra), 0.0
        )
        h = h / (1.0 + p.sigma2 * Hs)
    return np.minimum(h, p.cap) + p.c


# --------------------------------------------------------------------------
# life expectancy
# --------------------------------------------------------------------------
def _cumtrapz(y: np.ndarray, dx: float) -> np.ndarray:
    return np.concatenate([[0.0], np.cumsum(0.5 * (y[1:] + y[:-1]) * dx)])


def e_period(x: float, t: float, p: Params, Ra: Trajectory, ds: float = 0.1, s_max: float = 1500.0) -> float:
    """Period remaining life expectancy at age x with mortality frozen at time t."""
    # horizon: where the age-related hazard first reaches 60/yr (Gompertz explosion), capped
    mix = float(_mix(t, p, Ra))
    if mix > 0 and p.sigma2 == 0 and np.isinf(p.cap):
        a_h = np.log(60.0 / (p.A * mix)) / p.beta
        s_end = float(np.clip(a_h - x, 5.0, s_max))
    else:
        s_end = s_max
    s = np.arange(0.0, s_end + ds / 2, ds)
    h = hazard(x + s, t, p, Ra)
    S = np.exp(-_cumtrapz(h, ds))
    tail = S[-1] / h[-1]  # constant-hazard tail beyond the horizon
    return float(np.trapezoid(S, s) + tail)


def e_grid(ages, times, p: Params, Ra: Trajectory, ds: float = 0.1) -> np.ndarray:
    return np.array([[e_period(x, t, p, Ra, ds) for t in times] for x in ages])


# --------------------------------------------------------------------------
# criteria
# --------------------------------------------------------------------------
def dn_margin(ages, t_max: int, p: Params, Ra: Trajectory, ds: float = 0.1) -> np.ndarray:
    """D-N margin[i, j] = e(x_i + 1, t_j + 1) - e(x_i, t_j) for t_j = 0 .. t_max - 1.

    D-N holds where the margin is >= 0 (remaining life expectancy does not shrink
    when a person ages one year and one year of progress happens).
    """
    times = np.arange(0, t_max + 1)
    e0 = e_grid(ages, times, p, Ra, ds)                                # e(x, t)
    e1 = e_grid([a + 1 for a in ages], times, p, Ra, ds)               # e(x + 1, t)
    return e1[:, 1:] - e0[:, :-1]


def dn_ok_series(margin: np.ndarray, tol: float = 1e-6) -> np.ndarray:
    """True at year t if D-N holds at every age in the band."""
    return margin.min(axis=0) >= -tol


def longest_run(ok: np.ndarray):
    """Longest run of consecutive True; returns (length, start_index)."""
    best, best_start, cur, cur_start = 0, -1, 0, 0
    for i, v in enumerate(ok):
        if v:
            if cur == 0:
                cur_start = i
            cur += 1
            if cur > best:
                best, best_start = cur, cur_start
        else:
            cur = 0
    return best, best_start


def d1_gain(x: float, t: float, p: Params, Ra: Trajectory, h: float = 0.05, ds: float = 0.1) -> float:
    """D-1 quantity: partial derivative of period e(x, t) with respect to t."""
    return (e_period(x, t + h, p, Ra, ds) - e_period(x, max(t - h, 0.0), p, Ra, ds)) / (
        (t + h) - max(t - h, 0.0)
    )


def path_hazard(x0: float, p: Params, Ra: Trajectory, T: float, dt: float = 0.05):
    """Hazard along the life path of a person aged x0 at t = 0 (individual, M0/M1)."""
    tau = np.arange(0.0, T + dt / 2, dt)
    return tau, hazard(x0 + tau, tau, p, Ra)


def dh_ok(x0: float, p: Params, Ra: Trajectory, T: float, dt: float = 0.05, tol: float = 1e-12) -> np.ndarray:
    """D-H at each step along the path: True where the path hazard is not rising."""
    _, h = path_hazard(x0, p, Ra, T, dt)
    return np.diff(h) <= tol


def threshold_r(x: float, p: Params, iters: int = 26) -> float:
    """Smallest constant progress rate r for which D-N holds at age x in the first year
    (e(x+1, 1) >= e(x, 0)), by bisection, using period hazards. Under M0 this is beta at every age.
    With gamma frailty the synthetic-cohort period convention leaves it essentially unchanged
    (the whole period schedule just shifts in age), so heterogeneity does not lower the D-N threshold."""
    lo, hi = 0.0, 2.0 * p.beta
    for _ in range(iters):
        mid = 0.5 * (lo + hi)
        R = traj_constant(mid)
        marg = e_period(x + 1, 1.0, p, R) - e_period(x, 0.0, p, R)
        lo, hi = (mid, hi) if marg < 0 else (lo, mid)
    return 0.5 * (lo + hi)


def e_cohort(x: float, p: Params, r: float, t0: float = 0.0, ds: float = 0.05, s_max: float = 1500.0) -> float:
    """Cohort (forward-looking) remaining life expectancy of a person aged ``x`` at calendar time ``t0`` when
    death rates fall at the constant log-rate ``r`` from t = 0 on, counting the person's own future improvement.

    Model M0 only (no resistant component, no frailty, no cap): the age-related hazard along the path is
    h0 * exp((beta - r) s) with h0 = A exp(beta x - r t0), so its integral has a closed form and only the
    survival integral is numerical. The horizon (1500 years) is far beyond where survival vanishes for
    r < beta; for r >= beta the constant-hazard tail is added.
    """
    s = np.arange(0.0, s_max + ds / 2, ds)
    h0 = p.A * np.exp(p.beta * x - r * t0)
    g = p.beta - r
    H_age = h0 * s if abs(g) < 1e-12 else h0 * np.expm1(g * s) / g
    S = np.exp(-(H_age + p.c * s))
    tail = S[-1] / (h0 * np.exp(g * s[-1]) + p.c)
    return float(np.trapezoid(S, s) + tail)


def d1_gain_cohort(x: float, p: Params, r: float, h: float = 0.05, ds: float = 0.05) -> float:
    """Cohort D-1 quantity: d e_cohort(x, t0) / d t0 at fixed age x (years gained per calendar year)."""
    return (e_cohort(x, p, r, +h, ds) - e_cohort(x, p, r, -h, ds)) / (2.0 * h)


def threshold_r_d1_cohort(x: float, p: Params, target: float = 1.0, n_grid: int = 301, iters: int = 40) -> float:
    """Smallest constant progress rate r for which the cohort life expectancy at age x rises by at least
    ``target`` years per calendar year (D-1 on cohort tables). The gain is not monotone in r once the
    extrinsic floor bounds life expectancy, so the first crossing on a grid is refined by bisection.
    Returns nan if no r up to 3 beta reaches the target.

    With no floor and low hazard the threshold tends to beta / 2 (the gain is r / (beta - r)), which is
    why a cohort reading of "one year per year" needs about half the period D-N pace at young ages."""
    grid = np.linspace(0.0, 3.0 * p.beta, n_grid)
    gains = np.array([d1_gain_cohort(x, p, r) for r in grid])
    hit = np.where(gains >= target)[0]
    if len(hit) == 0:
        return float("nan")
    lo, hi = grid[max(hit[0] - 1, 0)], grid[hit[0]]
    for _ in range(iters):
        mid = 0.5 * (lo + hi)
        lo, hi = (mid, hi) if d1_gain_cohort(x, p, mid) < target else (lo, mid)
    return 0.5 * (lo + hi)


def selection_damping(x: float, p: Params) -> float:
    """Factor by which gamma-frailty selection damps the observed decline of the population death rate
    relative to the individual-level decline at age ``x``: 1 / (1 + sigma2 H(x)), H the cumulative
    age-related hazard from the frailty reference age. Equals 1 without frailty."""
    if p.sigma2 <= 0:
        return 1.0
    H = max(p.A * (np.exp(p.beta * x) - np.exp(p.beta * p.x_s)) / p.beta, 0.0)
    return float(1.0 / (1.0 + p.sigma2 * H))


def threshold_r_dh(x: float, p: Params, iters: int = 30, dt: float = 0.01) -> float:
    """Smallest constant r for which the population hazard along the cohort path (D-H) is not rising at
    age x, time 0. With gamma frailty, selection makes the cohort's population hazard decelerate
    (d ln h/dtau = beta - r - sigma2 * h_age), so the threshold falls with age: r >= beta - sigma2 * h_age(x)."""
    lo, hi = 0.0, 2.0 * p.beta
    for _ in range(iters):
        mid = 0.5 * (lo + hi)
        _, _, h = path_survival(x, p, traj_constant(mid), 2 * dt, dt)
        lo, hi = (mid, hi) if h[1] > h[0] else (lo, mid)
    return 0.5 * (lo + hi)


# --------------------------------------------------------------------------
# outcome classification (plan section 9: LEV window, ordered first-match rule)
# --------------------------------------------------------------------------
def traj_access(Ra: Trajectory, a: float) -> Trajectory:
    """Population-level cumulative progress when a fraction ``a`` of the population receives the
    individual progress ``Ra``: hazard factor 1 - a(1 - exp(-R)), i.e. R_pop = -ln(1 - a(1 - e^{-R}))."""
    return lambda t: -np.log(1.0 - a * (1.0 - np.exp(-Ra(t))))


def pace_by_age(ages, t_max: int, p: Params, Ra: Trajectory) -> np.ndarray:
    """Model 'observed' pace v(t) = -d ln hazard / dt / beta for each age (rows), t = 0 .. t_max - 1."""
    t = np.arange(0, t_max + 1, dtype=float)
    lnh = np.array([np.log(hazard(x, t, p, Ra)) for x in ages])  # ages x times
    return -(lnh[:, 1:] - lnh[:, :-1]) / p.beta


def classify_outcome(p: Params, Ra: Trajectory, v_hi: float, W: int = 20,
                     ages=(50, 60, 70, 80, 90), start_year: int = 2026, cutoff_year: int = 2100,
                     early_cutoff: int = 2060, ds: float = 0.25, access: float = 1.0) -> dict:
    """Classify a trajectory into O1-O4 by the ordered first-match rule (plan section 9).

    O3: a LEV window (>= W consecutive years of D-N at every age in the band) has onset by ``early_cutoff``.
    O4: the first window has onset in (early_cutoff, cutoff_year]; it may extend past the cutoff.
    O2: no window has onset by the cutoff, but D-N holds in at least one year, or in some W-year window the
        average pace of some age group exceeds ``v_hi``.
    O1: otherwise.

    Windows (and pace windows) count if they start no later than ``cutoff_year`` and may run up to W - 1 years
    beyond it. ``v_hi`` has no default: it must be fixed from evidence and logged before use. ``access`` < 1
    applies the population-level progress R_pop = -ln(1 - a(1 - e^{-R})).
    """
    Rp = traj_access(Ra, access) if access < 1.0 else Ra
    horizon = (cutoff_year - start_year) + W
    ok = dn_ok_series(dn_margin(list(ages), horizon, p, Rp, ds))
    onset = None
    for i in range(0, cutoff_year - start_year + 1):
        if ok[i:i + W].size == W and ok[i:i + W].all():
            onset = start_year + i
            break
    pace = pace_by_age(list(ages), horizon, p, Rp)                      # ages x years
    kernel = np.ones(W) / W
    roll = np.array([np.convolve(row, kernel, mode="valid") for row in pace])  # windows start at 0..horizon-W
    above = bool(roll.max() > v_hi)
    if onset is not None:
        outcome = "O3" if onset <= early_cutoff else "O4"
    else:
        outcome = "O2" if (bool(ok.any()) or above) else "O1"
    return {"outcome": outcome, "onset_year": onset, "max_rolling_pace": float(roll.max()),
            "longest_dn_run": longest_run(ok)[0], "dn_any_year": bool(ok.any())}


# --------------------------------------------------------------------------
# survival along a life path (used by the race table)
# --------------------------------------------------------------------------
def path_survival(x0: float, p: Params, Ra: Trajectory, T: float, dt: float = 0.05):
    """Survival S(tau) and hazard along the path (age x0 + tau at time tau).

    With frailty, the population hazard uses the gamma closed form, conditioning on
    survival to age x0 under 2026 mortality (approximation for the past).
    Returns (tau, S, h_pop)."""
    tau = np.arange(0.0, T + dt / 2, dt)
    ia = ind_age_part(x0 + tau, tau, p, Ra)
    if p.sigma2 > 0:
        H0 = max(p.A * (np.exp(p.beta * x0) - np.exp(p.beta * p.x_s)) / p.beta * float(_mix(0.0, p, Ra)), 0.0)
        Ht = _cumtrapz(ia, dt)
        k = 1.0 / p.sigma2
        S = ((1.0 + p.sigma2 * H0) / (1.0 + p.sigma2 * (H0 + Ht))) ** k * np.exp(-p.c * tau)
        h = np.minimum(ia / (1.0 + p.sigma2 * (H0 + Ht)), p.cap) + p.c
    else:
        h = np.minimum(ia, p.cap) + p.c
        S = np.exp(-_cumtrapz(h, dt))
    return tau, S, h


def expected_remaining(x0: float, p: Params, Ra: Trajectory, T: float = 1500.0, dt: float = 0.1) -> float:
    """Expected remaining life along the path, with a constant-hazard tail."""
    tau, S, h = path_survival(x0, p, Ra, T, dt)
    return float(np.trapezoid(S, tau) + S[-1] / h[-1])


# --------------------------------------------------------------------------
# level-to-rate conversion (plan section 7)
# --------------------------------------------------------------------------
def age_years(k: float, beta: float) -> float:
    """One-off proportional hazard ratio k -> age-equivalent years g = ln(1/k)/beta."""
    return float(np.log(1.0 / k) / beta)


def required_annual_decline(beta: float) -> float:
    """Annual proportional decline in death rates that equals v = 1 (r = beta)."""
    return float(1.0 - np.exp(-beta))


def cadence_years(k: float, beta: float, v: float = 1.0) -> float:
    """Years between new independent effects of size k needed to sustain rate v."""
    return age_years(k, beta) / v


def lifespan_gain_to_age_years(frac: float, human_lifespan: float = 80.0) -> float:
    """UPPER-BOUND thought experiment (plan section 7): an animal lifespan gain of ``frac`` (for example 0.25 for
    +25%) applied in the same proportion to a human lifespan of ``human_lifespan`` years is a level shift of
    frac * human_lifespan age-years. It assumes the whole animal effect transfers, in proportion, to humans."""
    return float(frac * human_lifespan)


def implied_hazard_ratio(g_age_years: float, beta: float) -> float:
    """Hazard ratio equivalent to a one-off shift of g age-years: k = exp(-beta g)."""
    return float(np.exp(-beta * g_age_years))


def effects_needed(g_age_years: float, window: float = 20.0, overlap: float = 0.0) -> float:
    """Number of independent effects of nominal size g needed to sustain v = 1 over ``window`` years when each
    new effect overlaps the earlier ones by the fraction ``overlap`` (its realised size is g (1 - overlap))."""
    return float(window / (g_age_years * (1.0 - overlap)))


# --------------------------------------------------------------------------
# race table (plan section 6, T5)
# --------------------------------------------------------------------------
def race_row(a0: float, onset: float, p: Params, r_pre: float, r_post_multiples=(1.0, 1.5, 2.0),
             horizon: float = 1500.0, dt: float = 0.1):
    """Probability of surviving to onset and expected remaining life at onset.

    Before onset, progress runs at ``r_pre`` per year. From onset, the age-related
    part declines at ``m * beta`` per year (m = 1 is exactly D-H: hazard frozen).
    Returns a dict with survival to onset, the hazard at onset, and for each m the
    expected remaining life at onset (for a survivor) and the unconditional
    expected remaining life from today. One survival path is used throughout, so
    frailty conditioning is handled exactly by the closed form.
    """
    out = {"a0": a0, "onset_years": onset}
    for m in r_post_multiples:
        r_post = m * p.beta

        def R(t, r_pre=r_pre, r_post=r_post, onset=onset):
            t = np.asarray(t, float)
            return r_pre * np.minimum(t, onset) + r_post * np.maximum(t - onset, 0.0)

        tau, S, h = path_survival(a0, p, R, onset + horizon, dt)
        i_on = int(round(onset / dt))
        S_on = float(S[i_on])
        out["p_survive_to_onset"] = S_on
        out["hazard_at_onset"] = float(h[i_on])
        tail = S[-1] / h[-1]
        e_from_now = float(np.trapezoid(S, tau) + tail)
        e_after = float(np.trapezoid(S[i_on:], tau[i_on:]) + tail)
        out[f"e_at_onset_m{m:g}"] = e_after / S_on if S_on > 0 else float("nan")
        out[f"e_from_now_m{m:g}"] = e_from_now
    return out


# --------------------------------------------------------------------------
# Latin hypercube sampling (numpy only) and rank correlation
# --------------------------------------------------------------------------
def latin_hypercube(n: int, ranges: dict, rng: np.random.Generator) -> dict:
    out = {}
    for name, (lo, hi) in ranges.items():
        u = (rng.permutation(n) + rng.random(n)) / n
        out[name] = lo + (hi - lo) * u
    return out


def spearman(x: np.ndarray, y: np.ndarray) -> float:
    rx = np.argsort(np.argsort(x)).astype(float)
    ry = np.argsort(np.argsort(y)).astype(float)
    if rx.std() == 0 or ry.std() == 0:
        return 0.0
    return float(np.corrcoef(rx, ry)[0, 1])
