"""Unit tests for the LEV threshold model.

They check the analytic predictions P1-P6 of ``phase1_scoping/03_analysis_plan.md``
against numerical life-table integration. Parameters here are test fixtures, not findings.
"""
import os
import sys

import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import lev_model as m  # noqa: E402

P = m.Params()  # placeholder parameters: beta 0.087, mu80 0.05, c 0.0004


def v_traj(v, p=P):
    return m.traj_constant(v * p.beta)


# ---------------------------------------------------------------- P1, P3: shift property
@pytest.mark.parametrize("c", [0.0, 0.0004, 0.001])
def test_shift_property_at_v1_with_or_without_extrinsic_floor(c):
    p = P.with_(c=c)
    R = v_traj(1.0, p)
    marg = m.dn_margin([50, 65, 80], 3, p, R)
    assert np.max(np.abs(marg)) < 1e-6  # e(x+1, t+1) == e(x, t) exactly at v = 1


def test_dn_sign_follows_v_minus_1():
    for v, sign in [(0.25, -1), (0.5, -1), (0.9, -1), (1.1, +1), (1.5, +1)]:
        marg = m.dn_margin([50, 65, 80], 2, P, v_traj(v))
        assert np.all(np.sign(marg) == sign), (v, marg)


def test_time_derivative_identity_without_floor():
    p = P.with_(c=0.0)
    for v in (0.5, 1.0):
        R = v_traj(v, p)
        for x in (50, 65):
            de = m.d1_gain(x, 5.0, p, R)
            mu = float(m.hazard(x, 5.0, p, R))
            e = m.e_period(x, 5.0, p, R)
            assert de == pytest.approx(v * (1 - mu * e), abs=3e-3)


def test_d1_is_stricter_than_dn_above_young_ages():
    R = v_traj(1.0)
    assert np.max(np.abs(m.dn_margin([65, 80], 2, P, R))) < 1e-6  # D-N met at v = 1
    # evaluate at t = 0, where every trajectory shares the same mu and e
    assert m.d1_gain(65, 0.0, P, R) < 0.9                          # D-1 (>= 1) not met
    assert m.d1_gain(80, 0.0, P, R) < 0.7
    # D-1 needs v >= 1 / (1 - mu e)
    mu = float(m.hazard(80, 0.0, P, R))
    e = m.e_period(80, 0.0, P, R)
    need = 1 / (1 - mu * e)
    assert 1.5 < need < 2.5
    assert m.d1_gain(80, 0.0, P, v_traj(need)) == pytest.approx(1.0, abs=0.02)


# ---------------------------------------------------------------- P2: required decline, conversion
def test_required_annual_decline_range():
    lo = m.required_annual_decline(np.log(2) / 10)
    hi = m.required_annual_decline(np.log(2) / 7)
    assert lo == pytest.approx(0.067, abs=5e-4)
    assert hi == pytest.approx(0.094, abs=5e-4)


def test_age_years_and_cadence():
    assert m.age_years(0.73, 0.09) == pytest.approx(3.5, abs=0.03)
    assert m.age_years(0.5, np.log(2) / 8) == pytest.approx(8.0)  # halving hazard = one MRDT
    assert m.cadence_years(0.73, 0.09, v=1.0) == pytest.approx(3.5, abs=0.03)


# ---------------------------------------------------------------- D-H
def test_path_hazard_frozen_at_v1_and_rising_below():
    assert np.all(m.dh_ok(60, P, v_traj(1.0), 40))
    assert not np.any(m.dh_ok(60, P, v_traj(0.5), 40))


def test_dn_and_dh_coincide_under_proportional_gompertz():
    for v in (0.8, 1.0, 1.2):
        dn = m.dn_margin([60], 1, P, v_traj(v))[0, 0] >= -1e-6
        dh = bool(np.all(m.dh_ok(60, P, v_traj(v), 10)))
        assert dn == dh, v


# ---------------------------------------------------------------- P4: resistant component
def test_resistant_component_makes_escape_finite_not_a_switch():
    p = P.with_(rho=0.05, r_r=0.0)
    R = v_traj(1.5, p)  # amenable part improves faster than ageing
    tau, h = m.path_hazard(60, p, R, 200, dt=0.1)
    i_min = int(np.argmin(h))
    assert 5 < i_min * 0.1 < 60            # hazard falls first ...
    assert h[-1] > h[i_min] * 1.5          # ... then rises: D-H fails asymptotically
    # over a finite window LEV can hold: D-N holds for a while, then fails
    marg = m.dn_margin([50, 60, 70], 40, p, R)
    run, start = m.longest_run(m.dn_ok_series(marg))
    assert start == 0 and 10 <= run <= 30  # an escape lasting one to two decades, not forever
    # a larger unimproved share shortens the escape
    p2 = p.with_(rho=0.20)
    run2, _ = m.longest_run(m.dn_ok_series(m.dn_margin([50, 60, 70], 40, p2, R)))
    assert run2 < run


# ---------------------------------------------------------------- P5: plateau
def test_plateau_makes_dn_hold_without_progress():
    p = P.with_(cap=0.5)
    marg = m.dn_margin([120], 2, p, m.traj_constant(0.0))
    assert np.max(np.abs(marg)) < 1e-9


def test_frailty_produces_population_plateau():
    p = P.with_(sigma2=0.2)
    h150 = float(m.hazard(150, 0.0, p, m.traj_constant(0.0))) - p.c
    assert h150 == pytest.approx(p.beta / p.sigma2, rel=0.1)
    # population hazard is below the individual hazard at old ages
    ind = float(m.ind_age_part(100, 0.0, p, m.traj_constant(0.0)))
    assert float(m.hazard(100, 0.0, p, m.traj_constant(0.0))) - p.c < ind


# ---------------------------------------------------------------- P6 and race table
def test_expected_remaining_life_at_onset_is_reciprocal_hazard():
    row = m.race_row(40.0, 30.0, P, r_pre=0.015, r_post_multiples=(1.0,))
    assert row["e_at_onset_m1"] == pytest.approx(1.0 / row["hazard_at_onset"], rel=2e-3)


def test_race_row_monotone_and_bounded():
    rows = [m.race_row(50.0, T, P, r_pre=0.0, r_post_multiples=(1.0,)) for T in (10, 20, 30, 40)]
    ps = [r["p_survive_to_onset"] for r in rows]
    assert all(0 < x <= 1 for x in ps)
    assert ps == sorted(ps, reverse=True)
    # continued improvement after onset raises expected remaining life
    r = m.race_row(50.0, 20.0, P, r_pre=0.015)
    assert r["e_at_onset_m2"] > r["e_at_onset_m1"] > 20


def test_period_and_path_expectancy_agree_without_progress():
    R0 = m.traj_constant(0.0)
    assert m.e_period(65, 0.0, P, R0) == pytest.approx(m.expected_remaining(65, P, R0), rel=2e-3)


# ---------------------------------------------------------------- escape duration
def test_ramp_reaches_dn_when_rate_crosses_beta():
    p = P
    r0, r1, t_ramp = 0.015, 1.5 * p.beta, 20.0
    R = m.traj_ramp(r0, r1, 0.0, t_ramp)
    marg = m.dn_margin([50, 60, 70, 80], 30, p, R)
    ok = m.dn_ok_series(marg)
    t_cross = t_ramp * (p.beta - r0) / (r1 - r0)  # instantaneous crossing time
    first = int(np.argmax(ok))
    assert abs(first - (t_cross - 0.5)) <= 1.5      # margin at year t uses the mean rate over [t, t+1]
    assert m.longest_run(ok)[0] >= 30 - first - 1


def test_latin_hypercube_and_spearman():
    rng = np.random.default_rng(0)
    s = m.latin_hypercube(200, {"a": (0, 1), "b": (2, 3)}, rng)
    assert 0 <= s["a"].min() and s["a"].max() <= 1
    assert 2 <= s["b"].min() and s["b"].max() <= 3
    # one point per stratum
    assert sorted((s["a"] * 200).astype(int)) == list(range(200))
    assert m.spearman(s["a"], s["a"]) == pytest.approx(1.0)
    assert abs(m.spearman(s["a"], s["b"])) < 0.2


# ---------------------------------------------------------------- outcome classification (plan section 9)
def test_classification_ordered_first_match_rule():
    b = P.beta
    # steady historical-like pace: O1
    assert m.classify_outcome(P, m.traj_constant(0.015), v_hi=0.30)["outcome"] == "O1"
    # sustained acceleration well short of LEV: O2
    assert m.classify_outcome(P, m.traj_constant(0.5 * b), v_hi=0.30)["outcome"] == "O2"
    # ramp that reaches the threshold within ten years and stays there: O3
    early = m.classify_outcome(P, m.traj_ramp(0.015, 1.3 * b, 0.0, 10.0), v_hi=0.30)
    assert early["outcome"] == "O3" and early["onset_year"] <= 2060
    # ramp that starts late (onset after 2060, before 2100): O4
    late = m.classify_outcome(P, m.traj_ramp(0.015, 1.3 * b, 55.0, 10.0), v_hi=0.30)
    assert late["outcome"] == "O4" and 2060 < late["onset_year"] <= 2100
    # a large unimproved share ends the D-N episode before a full window: O2, not O3/O4
    short = m.classify_outcome(P.with_(rho=0.2, r_r=0.0), m.traj_constant(1.5 * b), v_hi=0.30)
    assert short["outcome"] == "O2" and 0 < short["longest_dn_run"] < 20


def test_classification_short_burst_is_o2_and_v_hi_is_required():
    b = P.beta
    # a brief burst above the threshold (two years at v = 1.3), otherwise the historical pace
    def R_burst(t):
        t = np.asarray(t, float)
        return 0.015 * t + (1.3 * b - 0.015) * np.clip(t - 10.0, 0.0, 2.0)
    out = m.classify_outcome(P, R_burst, v_hi=0.30)
    assert out["outcome"] == "O2" and out["dn_any_year"]
    with pytest.raises(TypeError):
        m.classify_outcome(P, m.traj_constant(0.015))  # v_hi has no default


def test_classification_uses_per_age_group_pace():
    # frailty makes the old-age pace lower and the middle-age pace higher; the rule must look at the maximum
    p = P.with_(sigma2=0.4)
    R = m.traj_constant(0.35 * p.beta)
    pace = m.pace_by_age([50, 60, 70, 80, 90], 30, p, R)
    v_mid = float(pace[:, :20].mean(axis=1).mean())
    v_max = float(pace[:, :20].mean(axis=1).max())
    assert v_max > v_mid
    v_hi = 0.5 * (v_mid + v_max)  # between mean and max: max-over-ages rule must fire, mean rule would not
    assert m.classify_outcome(p, R, v_hi=v_hi)["outcome"] == "O2"


def test_access_reduces_population_progress():
    R = m.traj_constant(0.5)
    Rp = m.traj_access(R, 0.4)
    assert Rp(10.0) < R(10.0)
    assert m.traj_access(R, 1.0)(10.0) == pytest.approx(R(10.0))
    k = np.exp(-R(10.0))
    assert np.exp(-Rp(10.0)) == pytest.approx(1 - 0.4 * (1 - k))


def test_dn_threshold_is_beta_at_every_age_even_with_frailty():
    for x in (50, 70, 90):
        assert m.threshold_r(x, P) == pytest.approx(P.beta, rel=2e-3)
    q = P.with_(sigma2=0.2)
    for x in (50, 70, 90, 100):
        assert m.threshold_r(x, q) == pytest.approx(P.beta, rel=0.02)   # period schedule just shifts


def test_dh_threshold_falls_with_age_under_frailty_and_matches_closed_form():
    for x in (50, 90):
        assert m.threshold_r_dh(x, P) == pytest.approx(P.beta, rel=1e-3)   # no frailty: hazard slope = beta
    q = P.with_(sigma2=0.2)
    rs = [m.threshold_r_dh(x, q) for x in (50, 70, 90, 100)]
    assert rs == sorted(rs, reverse=True) and rs[-1] < 0.8 * P.beta
    # closed form: r* = beta - sigma2 * (population age-related hazard at x)
    for x in (70, 90):
        h_age = float(m.hazard(x, 0.0, q, m.traj_constant(0.0))) - q.c
        assert m.threshold_r_dh(x, q) == pytest.approx(P.beta - q.sigma2 * h_age, rel=0.03)


# ---------------------------------------------------------------- Phase 5 additions (plan section 13, Round 4)
def test_cohort_gain_matches_low_hazard_closed_form():
    # Without a floor and at low hazard the cohort D-1 gain is r / (beta - r): the expected remaining life
    # of a young cohort grows with the log of the hazard reduction it will experience.
    p = P.with_(c=0.0)
    r = 0.03
    assert m.d1_gain_cohort(20.0, p, r) == pytest.approx(r / (p.beta - r), rel=0.05)


def test_cohort_d1_threshold_is_about_half_beta_at_young_ages():
    p = P.with_(c=0.0)
    assert m.threshold_r_d1_cohort(20.0, p) == pytest.approx(p.beta / 2, rel=0.05)


def test_cohort_d1_threshold_rises_with_age_and_crosses_dn_only_at_very_old_ages():
    ages = (40, 50, 65, 80, 90)
    thr = [m.threshold_r_d1_cohort(x, P) for x in ages]
    assert all(b > a for a, b in zip(thr, thr[1:]))            # rises with age
    assert all(t < P.beta for t in thr[:4])                     # below the period D-N pace through age 80
    assert thr[-1] > P.beta                                     # above it at 90 (hazard exceeds the pace)


def test_criteria_order_at_age_50_cohort_d1_below_dn_below_period_d1():
    x = 50
    cohort = m.threshold_r_d1_cohort(x, P)
    dn = m.threshold_r(x, P)
    R0 = m.traj_constant(0.0)
    mu = float(m.hazard(x, 0.0, P, R0))
    period_d1 = P.beta / (1.0 - mu * m.e_period(x, 0.0, P, R0))  # v >= 1 / (1 - mu e), r = v beta
    assert cohort < dn < period_d1


def test_cohort_gain_is_zero_without_progress_and_e_cohort_matches_period_at_r_zero():
    assert m.d1_gain_cohort(60.0, P, 0.0) == pytest.approx(0.0, abs=1e-6)
    assert m.e_cohort(60.0, P, 0.0) == pytest.approx(m.e_period(60.0, 0.0, P, m.traj_constant(0.0)), rel=1e-3)


def test_selection_damping_closed_form_and_monotone():
    q = P.with_(sigma2=0.2)
    H80 = q.A * (np.exp(q.beta * 80) - np.exp(q.beta * q.x_s)) / q.beta
    assert m.selection_damping(80.0, q) == pytest.approx(1.0 / (1.0 + 0.2 * H80))
    assert m.selection_damping(90.0, q) < m.selection_damping(80.0, q) < 1.0
    assert m.selection_damping(90.0, P) == 1.0                  # no frailty, no damping


def test_lifespan_upper_bound_conversion_and_cadence():
    g = m.lifespan_gain_to_age_years(0.25, 80.0)
    assert g == pytest.approx(20.0)
    k = m.implied_hazard_ratio(g, P.beta)
    assert k == pytest.approx(np.exp(-P.beta * 20.0))
    assert m.age_years(k, P.beta) == pytest.approx(g)           # round trip
    assert m.cadence_years(k, P.beta) == pytest.approx(20.0)    # one such effect every g years sustains v = 1


def test_effects_needed_scales_with_overlap():
    assert m.effects_needed(3.6, 20.0, 0.0) == pytest.approx(20.0 / 3.6)
    assert m.effects_needed(3.6, 20.0, 0.5) == pytest.approx(2.0 * 20.0 / 3.6)


def test_smoothing_is_identity_for_window_one_and_for_a_constant_pace():
    R = m.traj_constant(0.05)
    tt = np.array([0.0, 3.0, 10.0])
    assert np.allclose(m.smooth_traj(R, 1)(tt), R(tt))
    assert np.allclose(m.smooth_traj(R, 5)(tt), R(tt))       # a linear R is unchanged by a centred average


def test_stepwise_progress_meets_annual_dn_only_in_step_years():
    # One step of g age-years every g years averages v = 1, but the annual D-N criterion holds only in the
    # years that contain a step; smoothing over five years fixes steps that come at least every five years
    # and leaves a 20-year cadence without a 20-year window.
    ages = [50, 70, 90]
    for g, every in ((20.0, 20.0), (5.0, 5.0)):
        R = m.traj_steps(g, every, P.beta, r_base=0.0)
        ok = m.dn_ok_series(m.dn_margin(ages, 40, P, R, ds=0.25))
        assert m.longest_run(ok)[0] == 1
        assert ok.mean() == pytest.approx(1.0 / every, abs=0.03)
    ok20 = m.dn_ok_series(m.dn_margin(ages, 40, P, m.smooth_traj(m.traj_steps(20.0, 20.0, P.beta), 5), ds=0.25))
    assert m.longest_run(ok20)[0] <= 6
    ok5 = m.dn_ok_series(m.dn_margin(ages, 40, P, m.smooth_traj(m.traj_steps(5.0, 5.0, P.beta), 5), ds=0.25))
    assert ok5.all()
