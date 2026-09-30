#!/usr/bin/env python3
"""Export the model outputs and series the video animates. Everything shown as a number in the video comes from
this file (which reads the committed CSV outputs and calls the committed model), not from hand-typed values."""
import csv
import json
import os
import sys

import numpy as np

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = REPO + '/phase3_analysis/outputs'
sys.path.insert(0, REPO + '/phase3_analysis/model')
import lev_model as m  # noqa: E402

DEST = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'anim', 'data.js')

cfg = json.load(open(REPO + '/phase3_analysis/model/params.json'))
p = m.Params(**cfg['params'])
r_hist = cfg['r_hist']
beta = p.beta
AGES = [50, 60, 70, 80, 90]


def csv_rows(name):
    return list(csv.DictReader(open(os.path.join(OUT, name))))


D = {'params': {'beta': beta, 'mu80': p.mu80, 'c': p.c, 'A': p.A, 'r_hist': r_hist,
                'threshold_pct': 100 * (1 - np.exp(-beta)), 'hist_pct': 100 * (1 - np.exp(-r_hist))}}

# ---- scene 1: remaining life expectancy of a 70-year-old as time passes (period life tables)
Rh, Rl, R0 = m.traj_constant(r_hist), m.traj_constant(beta), m.traj_constant(0.0)
ks = list(range(0, 13))
D['idea'] = {
    'start_age': 70, 'start_year': 2026, 'k': ks,
    'e_hist': [round(float(m.e_period(70 + k, float(k), p, Rh)), 3) for k in ks],
    'e_lev': [round(float(m.e_period(70 + k, float(k), p, Rl)), 3) for k in ks],
    'e_frozen': [round(float(m.e_period(70 + k, float(k), p, R0)), 3) for k in ks],
}

# ---- scene 2: hazard curve (age-related part plus floor), shifted by s age-years
D['hazard'] = {'ages': list(range(30, 101)),
               'mu': [round(float(p.A * np.exp(beta * x) + p.c), 6) for x in range(30, 101)],
               'cut_3_age_years_pct': 100 * (1 - float(np.exp(-beta * 3))),
               'annual_v1_pct': 100 * (1 - float(np.exp(-beta)))}

# ---- scene 3: required versus observed (T1, T1c, T2)
t1c = csv_rows('T1c_cohort_D1_threshold.csv')
sel = [r for r in t1c if abs(float(r['extrinsic_floor_c']) - 0.0004) < 1e-9 and int(r['age']) in (50, 65, 80)]
coh = [100 * float(r['cohort_D1_annual_decline']) for r in sel]
pd1 = [100 * float(r['period_D1_annual_decline']) for r in sel]
pdn = [100 * float(r['period_DN_annual_decline']) for r in sel]
t1 = csv_rows('T1_required_decline.csv')
dn_central = [100 * float(r['annual_proportional_decline_for_v1']) for r in t1 if float(r['MRDT_years']) == 8.0][0]
t2 = csv_rows('T2_observed_vs_required.csv')
D['gap'] = {'observed': [1.0, 2.0],
            'cohort_d1': [round(min(coh), 2), round(max(coh), 2)],
            'period_dn': [round(min(pdn), 2), round(max(pdn), 2), round(dn_central, 2)],
            'period_d1': [round(min(pd1), 2), round(max(pd1), 2)],
            't2_labels': [r['label'][:60] + ' -> ' + r['annual_proportional_decline'] for r in t2]}

# ---- scene 4: human effects in age-years (T3) and the stepwise cadence versus the annual test (T3c)
t3 = csv_rows('T3_effects_in_age_years.csv')
col = [c for c in t3[0].keys() if c.startswith('age_years_once')][0]
wanted = {
    'empagliflozin': 'Empagliflozin (EMPA-REG)',
    'sprint': "SPRINT intensive BP target, all-cause, primary report",
    'semaglutide': 'Semaglutide (SELECT)',
    'tirzepatide': 'Tirzepatide vs dulaglutide',
    'bp10': 'BP lowering per 10 mmHg',
    'ldl': 'LDL-C lowering per 1.0 mmol/L',
}
eff = {}
for k, prefix in wanted.items():
    row = [r for r in t3 if r['intervention'].startswith(prefix)][0]
    eff[k] = {'age_years': float(row[col]), 'years_between': float(row['years_between_new_independent_effects_to_sustain_v1']),
              'hr': row['hazard_ratio_observed_or_implied']}
D['effects'] = eff

steps = {}
for g in (20.0, 5.0):
    R = m.traj_steps(g, g, beta, r_base=r_hist)
    out = {}
    for label, RR in (('raw', R), ('smooth', m.smooth_traj(R, 5))):
        ok = m.dn_ok_series(m.dn_margin(AGES, 60, p, RR, ds=0.25))
        out[label] = {'ok': [int(bool(v)) for v in ok], 'share': round(float(np.mean(ok)), 3),
                      'longest': int(m.longest_run(ok)[0]), 'n': int(len(ok))}
    ts = np.arange(0, 61, 1.0)
    out['progress_age_years'] = [round(float(R(t) / beta), 3) for t in ts]
    steps['%g' % g] = out
D['steps'] = steps

# ---- scene 5: animal upper-bound readings (T3)
animal = {}
for key, prefix in {'dq': 'MOUSE: dasatinib+quercetin', 'rapa_acarb': 'UPPER BOUND: ITP rapamycin plus acarbose',
                    'rapa3x': 'UPPER BOUND: ITP rapamycin at 3x dose', 'e2_2021_16': 'UPPER BOUND: ITP 17-alpha-estradiol (2021 cohort, start at 16',
                    'e2_2014': 'UPPER BOUND: ITP 17-alpha-estradiol (2014 cohort)'}.items():
    row = [r for r in t3 if r['intervention'].startswith(prefix)][0]
    animal[key] = {'age_years': float(row[col]), 'name': row['intervention']}
D['animal'] = animal

# ---- scene 6: escape duration grid (T4)
t4 = csv_rows('T4_escape_duration.csv')
heads = [h for h in t4[0].keys() if h.startswith('r_r=')]
D['escape'] = {'rho': [float(r['rho_share_resistant']) for r in t4],
               'cols': [float(h.split('=')[1]) for h in heads[:4]],
               'years': [[int(float(r[h])) for h in heads[:4]] for r in t4]}

# ---- scene 7: onset by ramp duration (T6b) and the pace series behind it
t6b = [r for r in csv_rows('T6b_onset_by_ramp_duration.csv') if float(r['ramp_target_multiple_of_beta']) == 1.5]
ramps = []
ts = np.arange(0, 45.01, 0.25)
for r in t6b:
    T = float(r['ramp_years_from_2026'])
    r1 = 1.5 * beta
    rt = np.where(ts >= T, r1, r_hist + (r1 - r_hist) * ts / T)
    pct = 100 * (1 - np.exp(-rt))
    ramps.append({'years': T, 'onset': int(float(r['LEV_window_onset_year'])), 'cross': float(r['year_pace_first_reaches_DN_threshold']),
                  'pace_pct': [round(float(v), 3) for v in pct]})
D['when'] = {'ts': [float(t) for t in ts], 'ramps': ramps, 'peak_pct': 100 * (1 - float(np.exp(-1.5 * beta)))}

# ---- scene 8: probability of being alive at onset, mortality improving at the historical pace until onset
race = {}
for a0 in (30, 40, 50, 60, 70, 80):
    race[str(a0)] = [round(float(m.race_row(float(a0), float(T), p, r_hist, r_post_multiples=(1.0,))['p_survive_to_onset']), 4)
                     for T in range(0, 61)]
D['race'] = race
t5b = csv_rows('T5b_race_mu80_sensitivity.csv')
rr = {}
for a0 in ('40', '50', '60', '70'):
    vals = [float(r['p_survive_to_onset']) for r in t5b if r['onset_in_years'] == '30' and r['current_age'] == a0 and 'historical' in r['pre_onset_scenario']]
    rr[a0] = [round(min(vals), 4), round(max(vals), 4)]
D['race_range30'] = rr
D['race_frozen'] = {str(a0): [round(float(m.race_row(float(a0), float(T), p, 0.0, r_post_multiples=(1.0,))['p_survive_to_onset']), 4)
                              for T in (20, 30, 40)] for a0 in (40, 50, 60, 70)}

os.makedirs(os.path.dirname(DEST), exist_ok=True)
open(DEST, 'w').write('window.DATA = ' + json.dumps(D) + ';\n')

# ---- printed summary for a quick check against the report
print('threshold %.2f%%, hist %.2f%%' % (D['params']['threshold_pct'], D['params']['hist_pct']))
print('idea e_hist[0:3]', D['idea']['e_hist'][:3], 'e_hist[10]', D['idea']['e_hist'][10], 'e_lev[1]', D['idea']['e_lev'][1])
print('cut 3 age-years %.2f%%' % D['hazard']['cut_3_age_years_pct'])
print('gap', {k: D['gap'][k] for k in ('observed', 'cohort_d1', 'period_dn', 'period_d1')})
print('effects', {k: v['age_years'] for k, v in eff.items()}, {k: v['years_between'] for k, v in eff.items()})
for g, o in steps.items():
    print('steps', g, 'raw share', o['raw']['share'], 'longest', o['raw']['longest'], '| smooth share', o['smooth']['share'], 'longest', o['smooth']['longest'])
print('animal', {k: v['age_years'] for k, v in animal.items()})
print('escape rows', D['escape']['years'])
print('ramps', [(r['years'], r['onset'], round(r['cross'], 2)) for r in ramps], 'peak %.2f' % D['when']['peak_pct'])
print('race range 30y', D['race_range30'])
print('race@30y', {a: v[30] for a, v in race.items()}, 'frozen (20,30,40y)', D['race_frozen'])
