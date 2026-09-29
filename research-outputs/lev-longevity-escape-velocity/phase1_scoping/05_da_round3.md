# Devil's Advocate Checkpoint 1 — Round 3 Report (verbatim)

| Field | Value |
|---|---|
| Run | `deep-research` v2.12.1, `full` mode, Phase 1 |
| Date | 2026-09-29 |
| Reviewer | Same fresh-context subagent as Rounds 1 and 2 (same model family; a stated limitation) |
| Scope | Spot check of the Round 2 fixes (commit range `e7ca103..76ed958`) and the new model code |
| Verdict | **PASS** |
| Disposition | Applied in the plan's deviations log (entry dated after Round 3), the blueprint ladder, the protocol, and `lev_model.py`; see `04_da_checkpoint1.md` |

The text below is subagent output, reproduced verbatim. Its statements are the reviewer's, not verified findings.

## Devil's Advocate Report — Checkpoint 1, Round 3

### Verdict: PASS
No Critical or Major issues; the Round 2 fixes are substantively correct. The items below are Minor; two are time-sensitive for the running Phase 2 agents. I ran the 19 tests in a scratch copy (all pass) and probed `classify_outcome`; the repository was not touched. No rebuttals to log: every Round 2 disposition was accepted, and my held point (b) is closed by ladder v3. Frame-lock check: no new premise identified.

### 1. N1: a true partition
The ordered rule O3→O4→O2→O1 is exhaustive and exclusive by construction; the 2060/2061 boundary is right. Text-versus-code deviations:
- **Short episodes:** a 1–2-year D-N burst (v = 1.2, baseline r = 0.015, v_hi = 0.30) returns O1, so "includes a D-N episode shorter than W" is not implied. Add "or D-N holds in any year".
- **Post-2100:** acceleration starting 2102 is O2 in code (windows starting ≤ 2100 run to 2119) but O1 under "windows through 2100". State the convention.
- **v_hi basis:** the plan takes a maximum over age-decade cells; the code compares an age-mean, and the rule does not say which. With frailty (σ² = 0.4, r = 0.35β; paces at ages 50–90 of 0.31, 0.32, 0.32, 0.29, 0.23), mean 0.293 < 0.30 < max 0.322 flips O1/O2. Use one basis.
- **Code:** `v_hi` silently defaults to 0.30 (make it required); there is no access argument (use R_pop = −ln(1 − a(1 − e^{−R}))). Age-grid and ds sensitivity: identical in tested cases.

### 2. N2: closed in substance; workable, conservative
One source repeated across queries stays F2; sponsor-entered registry claims are E-P; V2-P sets no ranges (Blueprint and §8 agree). Residual holes (Minor, because company, foundation and news claims are separately capped at V2-P/V1):
- "Primary" is defined by domain, so science news on a publisher domain could qualify. Define by document type.
- Principals (founders, officers, funded labs) should share their organisation's origin.
- Attributing sentences must state the same figure; protocol rule 4's "otherwise F2" misgrades F-P and F1.

Single-study figures will mostly stay V2, which the ranged-input rule handles.

### 3. N3: mostly closed
The ACH structure is coherent. List defects: O3's "already above v_hi" is unsupportable from the 1990–2019 data that define v_hi (rating it I would be circular) and is not necessary for onset ≤ 2060; O4's expectations are permissive; no rule rates not-yet-due expectations N; scores are not normalised by expectation count (O3 has five, O4 three). Fix: state construction rules.
- **Reference classes:** pairs delivered, but RC1, RC2 and RC6 select on outcome; require denominators or label them existence classes. RC5 is unpaired though the Blueprint says each is paired.
- **K1–K5:** the Fréchet bounds and the route-union bounds (max P_j to min(1, ΣP_j)) are correct. The reported lower end (independence product) assumes non-negative dependence, but K5 is plausibly negatively dependent on K1/K2 (competing risks): keep the Fréchet floor visible, and add a "by 2100" index.

### 4. Mathematics
No errors remain in §1–3 and §7. Verified: ∂e/∂x = μe − 1; 1−μe = 0.74, 0.52, 0.34 (ages 65, 80, 90); D-1 needs v ≥ 1.13, 1.36, 1.96, 2.9 (ages 50, 65, 80, 90); P3 (margin 0 at v = 1 for c = 0.0004, 0.001); P4 (at r_a = β, D-H fails at once); P6 (1/h*); population factor 1−a(1−k); g = 3.50.

### 5. Leftovers
- Plan §12 still says "10% of load-bearing queries re-run"; Blueprint v3 re-verifies every one.
- Protocol W1(c) asks ages 60–90; the plan uses decades 50–89.
- Forecast grades F1–F5 still collide with figure levels F1–F3; §9 and §11 hold two "by 2030" lists.
- 04 says P3 was corrected "before the DA's read"; the file I read in Round 2 (matching ae297a7, 15:38) had the old P3, and e7ca103 is 15:44.

### Conditions carried forward
**Now (agents running):** message W1 the 50–89 decades and the three ladder points in section 2. **Before any rating or Phase 3 use, log in §13:** the O2 clause, window convention, v_hi basis and no default, expectation-construction rules, RC denominators, K-interval assumptions.
