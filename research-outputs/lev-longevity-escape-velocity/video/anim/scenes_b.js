/* Scenes 4-9: steps, lab results, what resists, when, one person, trust. */
'use strict';

function hatchPattern(fg, bg) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 16, 16);
  g.strokeStyle = fg; g.lineWidth = 4; g.beginPath();
  g.moveTo(-4, 20); g.lineTo(20, -4); g.moveTo(-4, 4); g.lineTo(4, -4); g.moveTo(12, 20); g.lineTo(20, 12); g.stroke();
  return ctx.createPattern(c, 'repeat');
}
const mix = (a, b, u) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], u)).toString(16).padStart(2, '0')).join('');
};
const VIR = [[0, '#440154'], [12, '#3B528B'], [24, '#21908C'], [36, '#5DC863'], [48, '#FDE725']];
const viridis = (v) => { for (let i = 1; i < VIR.length; i++) if (v <= VIR[i][0]) return mix(VIR[i - 1][1], VIR[i][1], (v - VIR[i - 1][0]) / (VIR[i][0] - VIR[i - 1][0])); return VIR[VIR.length - 1][1]; };

/* ------------------------------------------------------------------ 4 steps, not a rate */
SCENES.steps = () => {
  const E = DATA.effects;
  heading('What medicine has delivered: steps, not a rate', 'Age-years gained, once, in the best-demonstrated trials on all-cause mortality');
  const partA = 1 - pr(segT0(3, -1.0), 0.6, ease.io);
  const t0B = segT0(3, -0.5), partB = pr(t0B, 0.7, ease.io);
  if (partA > 0.01) {
    ctx.save(); ctx.globalAlpha *= partA;
    const TX0 = 900, TX1 = 1780, DOM = 5, X = scale(0, DOM, TX0, TX1);
    const rows = [
      ['Empagliflozin', 'type 2 diabetes trial', E.empagliflozin.age_years],
      ['Blood-pressure target', 'SPRINT trial, primary report (0.5 after 8 more years)', E.sprint.age_years],
      ['Semaglutide', 'obesity with heart disease', E.semaglutide.age_years],
      ['Tirzepatide vs dulaglutide', 'type 2 diabetes', E.tirzepatide.age_years],
      ['Blood-pressure lowering', 'per 10 mmHg, meta-analysis', E.bp10.age_years],
      ['LDL cholesterol lowering', 'per 1 mmol/L, 26 trials', E.ldl.age_years]
    ];
    const a0 = pr(0.5, 0.8, ease.out);
    for (let v = 0; v <= DOM; v++) { line(X(v), 290, X(v), 790, C.grid, 1.5, null, a0); text(String(v), X(v), 824, { size: 22, color: C.mut, align: 'center', alpha: a0 }); }
    line(TX0, 790, TX1, 790, C.rule, 2, null, a0);
    text('age-years gained, once', TX1, 862, { size: 24, weight: 600, color: C.mut, align: 'right', alpha: a0 });
    rows.forEach((r, i) => {
      const y = 328 + i * 76, at = segT0(0, 2.6 + i * 1.05), u = pr(at, 1.0, ease.io);
      text(r[0], M, y - 2, { size: 30, weight: 600, at, maxW: 760 });
      text(r[1], M, y + 28, { size: 23, color: C.mut, at: at + 0.1, maxW: 760 });
      if (u > 0.01) {
        box(TX0, y - 26, Math.max(2, X(r[2]) - TX0) * u, 40, { fill: C.teal, r: 7 });
        if (u > 0.9) text(fmt(r[2], 1), X(r[2]) * 1 + 16, y + 8, { size: 34, weight: 600, fam: FR, color: C.tealL, at: at + 0.9 });
      }
    });
    text('Each one is a one-off shift of roughly 1 to 5 age-years', TX0, 900 - 6, { size: 1, alpha: 0 });
    const b1 = pr(segT0(1, 0.6), 0.7, ease.out);
    if (b1 > 0.01) {
      line(X(1.2), 300, X(1.2), 776, C.amber, 2.5, [8, 8], b1 * 0.9); line(X(4.4), 300, X(4.4), 776, C.amber, 2.5, [8, 8], b1 * 0.9);
      text('1.2 to 4.4', (X(1.2) + X(4.4)) / 2, 276, { size: 26, weight: 600, color: C.amber, align: 'center', alpha: b1 });
    }
    const b2 = pr(segT0(2, 0.5), 0.8, ease.out);
    if (b2 > 0.01) {
      box(M, 790, 700, 74, { fill: C.panel, stroke: C.tealD, lw: 2, alpha: b2, r: 10 });
      text('To average one age-year a year:', M + 24, 822, { size: 26, color: C.mut, alpha: b2 });
      text('a new step every 1.2 to 4.4 years', M + 24, 854, { size: 34, weight: 600, fam: FR, alpha: b2 });
    }
    ctx.restore();
  }
  if (partB > 0.01) {
    ctx.save(); ctx.globalAlpha *= partB;
    const cL = 610, cR = 1810, cT = 290, cB = 598, X = scale(0, 60, cL, cR), Y = scale(0, 60, cB, cT);
    const t0 = t0B;
    const a0 = pr(t0 + 0.2, 0.6, ease.out);
    [0, 20, 40, 60].forEach((v) => { line(X(v), cB, X(v), cB + 8, C.rule, 2, null, a0); text(String(v), X(v), cB + 36, { size: 22, color: C.mut, align: 'center', alpha: a0 }); line(X(v), cT, X(v), cB, C.grid, 1.5, null, a0); });
    [0, 20, 40, 60].forEach((v) => { line(cL, Y(v), cL - 8, Y(v), C.rule, 2, null, a0); text(String(v), cL - 18, Y(v) + 8, { size: 22, color: C.mut, align: 'right', alpha: a0 }); line(cL, Y(v), cR, Y(v), C.grid, 1.5, null, a0); });
    line(cL, cB, cR, cB, C.rule, 2, null, a0); line(cL, cT, cL, cB, C.rule, 2, null, a0);
    text('years from now', (cL + cR) / 2, cB + 72, { size: 24, weight: 600, color: C.mut, align: 'center', alpha: a0 });
    ctx.save(); ctx.translate(cL - 72, (cT + cB) / 2); ctx.rotate(-Math.PI / 2); text('age-years of progress', 0, 0, { size: 24, weight: 600, color: C.mut, align: 'center', alpha: a0 }); ctx.restore();
    // legend column
    line(M, 338, M + 56, 338, C.teal, 5, [14, 10], pr(t0 + 0.4, 0.5));
    text('Needed: one age-year', M + 76, 336, { size: 28, weight: 600, color: C.tealL, at: t0 + 0.4, maxW: 380 });
    text('per calendar year', M + 76, 370, { size: 24, color: C.mut, at: t0 + 0.5, maxW: 380 });
    line(M, 440, M + 56, 440, C.amber, 5, null, pr(t0 + 1.4, 0.5));
    text('Mouse-scale steps of', M + 76, 432, { size: 28, weight: 600, color: C.amber, at: t0 + 1.4, maxW: 380 });
    text('20 age-years every 20 years', M + 76, 466, { size: 28, weight: 600, color: C.amber, at: t0 + 1.4, maxW: 380 });
    text('illustrative, plus the historical', M + 76, 500, { size: 24, color: C.mut, at: t0 + 1.5, maxW: 380 });
    text('background pace', M + 76, 530, { size: 24, color: C.mut, at: t0 + 1.5, maxW: 380 });
    polyline([[X(0), Y(0)], [X(60), Y(60)]], pr(t0 + 0.6, 1.4, ease.io), C.teal, 4, 1, [14, 10]);
    const rb = DATA.params.r_hist / DATA.params.beta, pts = [];
    for (let s = 0; s < 3; s++) { pts.push([X(20 * s), Y(20 * s + rb * 20 * s)]); pts.push([X(20 * (s + 1)), Y(20 * s + rb * 20 * (s + 1))]); if (s < 2) pts.push([X(20 * (s + 1)), Y(20 * (s + 1) + rb * 20 * (s + 1))]); }
    polyline(pts, pr(t0 + 1.6, 3.2, ease.io), C.amber, 6);
    // strips: years in which the yearly test is passed
    const S = DATA.steps['20'], cw = (cR - cL) / 60;
    const strips = [{ y: 700, d: S.raw, at: t0 + 5.4, label: 'No smoothing: ' + Math.round(S.raw.share * 100) + '% of years' },
                    { y: 776, d: S.smooth, at: t0 + 7.4, label: 'Five-year smoothing: ' + Math.round(S.smooth.share * 100) + '% of years' }];
    text('Does it pass the yearly test?', M, 678, { size: 28, weight: 600, color: C.mut, at: t0 + 5.0, maxW: 470 });
    strips.forEach((s) => {
      const u = pr(s.at, 1.8, ease.io);
      text(s.label, M, s.y + 32, { size: 28, weight: 600, color: C.fg, at: s.at, maxW: 480 });
      box(cL, s.y, cR - cL, 46, { fill: C.panel, r: 6, at: s.at });
      const n = Math.floor(u * s.d.n);
      for (let i = 0; i < n; i++) if (s.d.ok[i]) { ctx.fillStyle = C.green; ctx.fillRect(cL + i * cw + 1, s.y + 5, Math.max(2, cw - 2), 36); }
    });
    ctx.restore();
  }
};

/* ------------------------------------------------------------------ 5 lab results */
SCENES.mice = () => {
  const A = DATA.animal;
  heading('What about the lab results?', 'Age-years if the mouse gain carried over to people in full, an upper bound');
  chip('spe', W - M, 172, { align: 'right', at: 0.8, size: 24 });
  const TX0 = 940, TX1 = 1780, DOM = 30, X = scale(0, DOM, TX0, TX1);
  const dim = 1 - 0.45 * pr(segT0(2, 0.3), 0.8);
  const rows = [
    ['Rapamycin + acarbose, males', 'median lifespan +34%', A.rapa_acarb.age_years],
    ['Rapamycin (3× dose), females', 'median lifespan +26%', A.rapa3x.age_years],
    ['17-α-estradiol, males, 2021 cohort', 'median lifespan +19%', A.e2_2021_16.age_years],
    ['17-α-estradiol, males, 2014 cohort', 'median lifespan +12%', A.e2_2014.age_years],
    ['Dasatinib + quercetin, very old mice', 'hazard ratio 0.65 (hazard-ratio reading)', A.dq.age_years]
  ];
  const a0 = pr(segT0(1, 0.0), 0.8, ease.out) * dim;
  for (let v = 0; v <= DOM; v += 5) { line(X(v), 286, X(v), 640, C.grid, 1.5, null, a0); text(String(v), X(v), 672, { size: 22, color: C.mut, align: 'center', alpha: a0 }); }
  line(TX0, 640, TX1, 640, C.rule, 2, null, a0);
  text('age-years if transferred in full', TX1, 708, { size: 24, weight: 600, color: C.mut, align: 'right', alpha: a0 });
  const pat = hatchPattern('#C4A6EE', '#2B1F44');
  rows.forEach((r, i) => {
    const y = 322 + i * 68, at = segT0(0, 3.4 + i * 1.0), grow = pr(segT0(1, 0.8 + i * 0.75), 1.1, ease.io);
    text(r[0], M, y - 2, { size: 29, weight: 600, at, maxW: 830, alpha: dim });
    text(r[1], M, y + 26, { size: 22, color: C.mut, at: at + 0.1, maxW: 830, alpha: dim });
    if (grow > 0.01) {
      ctx.save(); ctx.globalAlpha *= dim;
      const w = Math.max(2, X(r[2]) - TX0) * grow;
      rrectPath(TX0, y - 24, w, 38, 7); ctx.fillStyle = pat; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.violet; ctx.stroke();
      ctx.restore();
      if (grow > 0.95) text(fmt(r[2], 1), X(r[2]) + 16, y + 8, { size: 32, weight: 600, fam: FR, color: C.violet, at: segT0(1, 0.8 + i * 0.75 + 1.0), alpha: dim });
    }
  });
  const u = pr(segT0(2, 0.3), 0.8, ease.out);
  if (u > 0.01) {
    box(M, 744, 640, 106, { fill: C.panel, stroke: C.violet, lw: 2, alpha: u });
    text('MICE', M + 22, 778, { size: 22, weight: 700, ls: 2.5, color: C.violet, alpha: u });
    text('median lifespan up to +34%', M + 22, 820, { size: 32, weight: 600, alpha: u, maxW: 600 });
    box(1080, 744, 744, 106, { fill: C.panel, stroke: C.amber, lw: 2, alpha: u });
    text('PEOPLE', 1102, 778, { size: 22, weight: 700, ls: 2.5, color: C.amber, alpha: u });
    text('no mortality result for an intervention presented as targeting ageing', 1102, 812, { size: 26, weight: 600, alpha: u, maxW: 700 });
    text('(the report counts heart and diabetes drugs as disease treatments)', 1102, 840, { size: 20, color: C.mut, alpha: u, maxW: 700 });
    arrow(760, 797, 1060, 797, C.mut, 3, 14, u);
    text('?', 910, 782, { size: 40, weight: 600, fam: FR, color: C.fg, align: 'center', alpha: u });
  }
};

/* ------------------------------------------------------------------ 6 what resists */
SCENES.resist = () => {
  const E = DATA.escape;
  heading('What if part of the risk will not improve?', 'Years a “no-shrink” escape lasts in the model (60-year horizon, 48 = to the end)');
  const GX = 660, GY = 366, CW = 200, CH = 68, GAP = 6;
  text('How fast the resistant share itself improves, per year', GX + (4 * CW + 3 * GAP) / 2, 312, { size: 26, weight: 600, color: C.mut, align: 'center', at: 0.7, maxW: 820 });
  E.cols.forEach((c, j) => text(Math.round(c * 100) + '%', GX + j * (CW + GAP) + CW / 2, 350, { size: 26, weight: 600, align: 'center', at: 0.8 + j * 0.1 }));
  para('Share of age-related death risk that resists treatment', M, 452, 400, { size: 28, weight: 600, color: C.mut, at: 0.8, lh: 36 });
  E.rho.forEach((r, i) => {
    const y = GY + i * (CH + GAP);
    text(Math.round(r * 100) + '%', GX - 22, y + CH / 2 + 10, { size: 30, weight: 600, align: 'right', at: 0.9 + i * 0.1 });
    E.years[i].forEach((v, j) => {
      const at = segT0(0, 0.9 + i * 0.45 + j * 0.08), u = pr(at, 0.5, ease.out);
      if (u <= 0.01) return;
      const x = GX + j * (CW + GAP);
      ctx.save(); ctx.globalAlpha *= u; rrectPath(x, y, CW, CH, 8); ctx.fillStyle = viridis(v); ctx.fill(); ctx.restore();
      text(String(v), x + CW / 2, y + CH / 2 + 11, { size: 34, weight: 700, color: v < 30 ? '#F2F6F8' : '#12202A', align: 'center', alpha: u, rise: 0 });
    });
  });
  // highlight rings and running callouts
  const marks = [
    { row: 2, frac: 0.05, tf: 0.42, big: '12 years', small: '5% resists and never improves', color: C.amber },
    { row: 3, frac: 0.60, tf: 0.72, big: '2 years', small: '10% resists and never improves', color: C.amber },
    { row: 4, frac: 0.83, tf: 0.93, big: 'none in 60 years', small: '20% resists and never improves', color: C.red }
  ];
  marks.forEach((m, k) => {
    const at = segAt(1, m.frac), u = pr(at, 0.5, ease.out);
    if (u > 0.01) {
      const y = GY + m.row * (CH + GAP);
      ctx.save(); ctx.globalAlpha *= u; rrectPath(GX - 5, y - 5, CW + 10, CH + 10, 12); ctx.lineWidth = 5; ctx.strokeStyle = m.color; ctx.stroke(); ctx.restore();
    }
    const tt = segAt(1, m.tf), by = 396 + k * 118;
    text(m.small, 1560, by, { size: 23, color: C.mut, at: tt, maxW: 280 });
    text(m.big, 1560, by + 52, { size: 54, weight: 600, fam: FR, color: m.color, at: tt + 0.1, maxW: 280 });
  });
  const b = segT0(2, 0.4);
  chip('jud', 1560, 776, { at: b, size: 22 });
  text('The brain is the hard case', 1560, 826, { size: 30, weight: 600, at: b + 0.3, maxW: 300 });
  text('Pace ramps to 1.5× the threshold over 20 years. Placeholder inputs; illustrative.', M, 846, { size: 21, color: C.faint, at: 1.4, maxW: 1300 });
};

/* ------------------------------------------------------------------ 7 when */
SCENES.when = () => {
  const Wn = DATA.when, TH = DATA.params.threshold_pct, HI = DATA.params.hist_pct;
  heading('So when?', 'Four outcomes fixed in advance; what each date demands of the pace');
  // part A: outcome cards
  const cardsA = 1 - pr(segT1(0, 0.9), 0.6, ease.io);
  const cards = [
    ['O1', 'Stagnation', 'The pace stays at or below about 2.6% a year (a team-set bound).', C.faint, 3.0],
    ['O2', 'Acceleration short of escape', 'Faster than today, but never enough to escape.', C.amber, 5.0],
    ['O3', 'Escape starts by 2060', 'The pace reaches the threshold in time for a 20-year window.', C.teal, 8.0],
    ['O4', 'Escape starts 2061–2100', 'The same chain, later or slower.', C.tealD, 10.0]
  ];
  if (cardsA > 0.01) {
    ctx.save(); ctx.globalAlpha *= cardsA;
    cards.forEach((c, i) => {
      const x = 115 + i * 430, y = 330, at = segT0(0, c[4]);
      box(x, y, 400, 300, { fill: C.panel, stroke: C.rule, lw: 2, at });
      box(x, y, 400, 12, { fill: c[3], r: 6, at });
      text(c[0], x + 28, y + 62, { size: 26, weight: 700, ls: 3, color: c[3] === C.faint ? C.mut : c[3], at: at + 0.1 });
      para(c[1], x + 28, y + 118, 350, { size: 40, weight: 600, fam: FR, at: at + 0.2, lh: 46 });
      para(c[2], x + 28, y + 224, 350, { size: 25, color: C.mut, at: at + 0.4, lh: 32 });
    });
    ctx.restore();
  }
  // part B: onset against ramp duration
  const chartA = pr(segT1(0, 0.9), 0.8, ease.io);
  if (chartA > 0.01) {
    ctx.save(); ctx.globalAlpha *= chartA;
    const L = 200, R = 1400, T = 300, Bt = 770, X = scale(2026, 2070, L, R), Y = scale(0, 14, Bt, T);
    const t0 = segT0(1, 0.0);
    const a0 = pr(t0, 0.6, ease.out);
    for (let v = 0; v <= 14; v += 2) { line(L, Y(v), R, Y(v), C.grid, 1.5, null, a0); text(v + '%', L - 14, Y(v) + 8, { size: 22, color: C.mut, align: 'right', alpha: a0 }); }
    for (let yr = 2030; yr <= 2070; yr += 10) { line(X(yr), Bt, X(yr), Bt + 8, C.rule, 2, null, a0); text(String(yr), X(yr), Bt + 36, { size: 22, color: C.mut, align: 'center', alpha: a0 }); }
    line(L, Bt, R, Bt, C.rule, 2, null, a0); line(L, T, L, Bt, C.rule, 2, null, a0);
    ctx.save(); ctx.translate(L - 88, (T + Bt) / 2); ctx.rotate(-Math.PI / 2); text('yearly fall in death rates', 0, 0, { size: 24, weight: 600, color: C.mut, align: 'center', alpha: a0 }); ctx.restore();
    // threshold and today
    line(L, Y(TH), R, Y(TH), C.teal, 3.5, [16, 10], a0);
    text('Needed: 8.3% a year', R - 6, Y(TH) - 14, { size: 26, weight: 600, color: C.tealL, align: 'right', alpha: a0 });
    line(L, Y(HI), R, Y(HI), C.amber, 4, null, a0);
    text('Historical pace: 1.5%', R - 6, Y(HI) - 14, { size: 26, weight: 600, color: C.amber, align: 'right', alpha: a0 });
    const hl = pr(segT0(1, 3.4), 0.8, ease.io);          // highlight the 15-year ramp
    Wn.ramps.forEach((rp, i) => {
      const at = t0 + 0.4 + i * 0.5, u = pr(at, 1.3, ease.io), isHi = rp.years === 15;
      const nPts = Math.min(rp.pace_pct.length, Math.round((2070 - 2026) / 0.25) + 1);
      const pts = []; for (let k = 0; k < nPts; k++) pts.push([X(2026 + Wn.ts[k]), Y(rp.pace_pct[k])]);
      const dimA = isHi ? 1 : 1 - 0.62 * hl;
      polyline(pts, u, isHi ? C.tealL : C.teal, isHi ? 7 : 4, dimA);
      if (u >= 1) {
        const tg = pr(at + 1.3, 0.5, ease.out), cx = X(rp.cross);
        if (tg > 0.01) {
          dot(cx, Y(TH), 8, isHi ? C.tealL : C.teal, tg * dimA);
          line(cx, Y(TH) + 8, cx, Bt - 44, isHi ? C.tealL : C.teal, 2, [5, 6], tg * 0.7 * dimA);
          ctx.save(); ctx.globalAlpha *= tg * dimA; rrectPath(cx - 33, Bt - 44, 66, 32, 8); ctx.fillStyle = C.panel; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = isHi ? C.tealL : C.tealD; ctx.stroke(); ctx.restore();
          text(String(rp.onset), cx, Bt - 21, { size: 23, weight: 700, color: isHi ? C.tealL : C.fg, align: 'center', alpha: tg * dimA });
        }
      }
    });
    text('year the pace first reaches the threshold', L, Bt + 84, { size: 22, color: C.faint, at: t0 + 4.5 });
    // 9-year bracket
    if (hl > 0.01) {
      const x1 = X(2026), x2 = X(2035.3), yb = Bt - 88;
      line(x1, yb, x2, yb, C.fg, 3, null, hl); line(x1, yb - 9, x1, yb + 9, C.fg, 3, null, hl); line(x2, yb - 9, x2, yb + 9, C.fg, 3, null, hl);
      text('about 9 years', (x1 + x2) / 2 + 60, yb - 16, { size: 26, weight: 600, align: 'center', alpha: hl });
    }
    ctx.restore();
    // right-hand statements
    const RX = 1470;
    text('Start around 2035', RX, 350, { size: 46, weight: 600, fam: FR, at: segT0(1, 3.4), maxW: 350 });
    para('needs the pace to climb from 1.5% to 8.3% a year in about 9 years, then stay at or above it', RX, 396, 352, { size: 28, color: C.mut, at: segT0(1, 3.7), lh: 36 });
    chip('jud', RX, 580, { at: segT0(2, 0.3), size: 22 });
    text('Judged unsupported', RX, 632, { size: 36, weight: 600, fam: FR, at: segT0(2, 0.6), maxW: 350 });
    text('a judgment, not a measurement', RX, 668, { size: 26, color: C.mut, at: segT0(2, 0.9), maxW: 350 });
    const pills = [['By 2060: not contradicted', 0.4], ['Not this century: not contradicted', 2.6], ['No probability offered', 5.4]];
    pills.forEach((p, i) => {
      const at = segT0(3, p[1]), y = 738 + i * 58;
      box(RX - 6, y - 32, 372, 46, { fill: C.panel, stroke: i === 2 ? C.amber : C.tealD, lw: 2, at, r: 10 });
      text(p[0], RX + 12, y + 2, { size: 25, weight: 600, at: at + 0.1, maxW: 340 });
    });
  }
};

/* ------------------------------------------------------------------ 8 one person */
SCENES.person = () => {
  const R = DATA.race;
  heading('For one person, a race', 'Chance of being alive when escape starts, by age today');
  const L = 210, Rt = 1450, T = 284, Bt = 748, X = scale(0, 60, L, Rt), Y = scale(0, 1, Bt, T);
  const a0 = pr(0.5, 0.8, ease.out);
  for (let v = 0; v <= 100; v += 20) { line(L, Y(v / 100), Rt, Y(v / 100), C.grid, 1.5, null, a0); text(v + '%', L - 14, Y(v / 100) + 8, { size: 22, color: C.mut, align: 'right', alpha: a0 }); }
  for (let y = 0; y <= 60; y += 10) { line(X(y), Bt, X(y), Bt + 8, C.rule, 2, null, a0); text(String(y), X(y), Bt + 36, { size: 22, color: C.mut, align: 'center', alpha: a0 }); }
  line(L, Bt, Rt, Bt, C.rule, 2, null, a0); line(L, T, L, Bt, C.rule, 2, null, a0);
  text('years until escape starts', (L + Rt) / 2, Bt + 70, { size: 24, weight: 600, color: C.mut, align: 'center', alpha: a0 });
  const ages = ['30', '40', '50', '60', '70', '80'];
  const cols = { 30: '#62C2E0', 40: '#7FD3A4', 50: '#C9D97A', 60: '#E8C069', 70: '#F09A6E', 80: '#F08A7E' };
  const draw = pr(0.9, 3.2, ease.io);
  ages.forEach((a) => {
    const pts = R[a].map((v, i) => [X(i), Y(v)]);
    polyline(pts, draw, cols[a], 5);
  });
  // legend
  const lg = pr(1.2, 0.6, ease.out);
  text('Age today', 1530, 330, { size: 24, weight: 600, color: C.mut, alpha: lg });
  ages.forEach((a, i) => { line(1530, 372 + i * 44, 1580, 372 + i * 44, cols[a], 6, null, lg); text(a, 1600, 382 + i * 44, { size: 28, weight: 600, alpha: lg }); });
  // marker at 30 years
  const m = pr(segT0(0, 3.6), 0.8, ease.out);
  if (m > 0.01) {
    line(X(30), T, X(30), Bt, C.fg, 2.5, [8, 8], m * 0.9);
    text('escape starts in 30 years', X(30), T - 12, { size: 24, weight: 600, align: 'center', alpha: m });
  }
  const tags = [['40', 0.30], ['50', 0.55], ['60', 0.74], ['70', 0.90]];
  tags.forEach(([a, f]) => {
    const at = segAt(1, f), u = pr(at, 0.6, ease.out);
    if (u <= 0.01) return;
    const v = R[a][30], px = X(30), py = Y(v);
    dot(px, py, 11, cols[a], u); ctx.save(); ctx.globalAlpha *= u; ctx.lineWidth = 3; ctx.strokeStyle = C.bg; ctx.beginPath(); ctx.arc(px, py, 11, 0, 7); ctx.stroke(); ctx.restore();
    const wv = text(Math.round(v * 100) + '%', px + 22, py + 12, { size: 40, weight: 600, fam: FR, color: cols[a], alpha: u });
    const rg = DATA.race_range30[a];
    text('(' + Math.round(rg[0] * 100) + '–' + Math.round(rg[1] * 100) + '%)', px + 22 + wv + 10, py + 11, { size: 24, color: C.mut, alpha: u });
  });
  const dm = pr(segT0(2, 0.2), 0.8, ease.out);
  text('Illustrative: placeholder mortality (ranges: mortality level 0.035–0.07 at age 80), improving 1.5% a year until then, full access. Not a forecast. Not medical advice.', M, 858, { size: 21, color: C.faint, at: 1.6, maxW: W - 2 * M });
  if (dm > 0.01) { text('Age at onset', 1530, 700, { size: 34, weight: 600, fam: FR, alpha: dm, maxW: 300 }); text('matters a great deal', 1530, 742, { size: 34, weight: 600, fam: FR, alpha: dm, maxW: 300 }); }
};

/* ------------------------------------------------------------------ 9 how sure are we */
SCENES.trust = () => {
  const outEnd = 1 - pr(segT1(2, 3.0), 0.8, ease.io);
  ctx.save(); ctx.globalAlpha *= outEnd;
  heading('How sure are we?', 'What to keep in mind before relying on any of this');
  ctx.restore();
  const items = [
    ['Preliminary review', C.amber, segT0(0, 1.0), 0],
    ['Confidence: high in the arithmetic, low to moderate in the evidence, low on dates', C.mut, segT0(0, 3.2), 0],
    ['Built from web-search summaries, not primary papers', C.mut, segT0(0, 10.0), 0],
    ['Some figures were present in the search queries themselves (marked † in the report)', C.mut, segT0(0, 12.4), 0],
    ['Every step by AI agents of one model family', C.mut, segT0(1, 0.4), 0],
    ['No human has checked any figure, citation or calculation', C.amber, segT0(1, 3.4), 1],
    ['Two model inputs are placeholders; results are illustrative and assume full access', C.mut, segT0(1, 6.0), 0]
  ];
  ctx.save(); ctx.globalAlpha *= outEnd;
  let y = 308;
  items.forEach((it) => {
    const u = pr(it[2], 0.5, ease.out);
    if (u > 0.01) { ctx.save(); ctx.globalAlpha *= u; ctx.fillStyle = it[1]; ctx.fillRect(M, y - 20, 14, 14); ctx.restore(); }
    const lines = wrap(it[0], 820, 31, it[3] ? 700 : 500);
    lines.forEach((ln, k) => text(ln, M + 36, y + k * 38, { size: 31, weight: it[3] ? 700 : 500, color: it[3] ? C.amber : C.fg, at: it[2], maxW: 820 }));
    y += lines.length * 38 + 30;
  });
  const cx = 1080, cy = 318, at = segT0(2, 0.4);
  box(cx, cy - 40, 744, 520, { fill: C.panel, stroke: C.tealD, lw: 2, at });
  text('WHAT WOULD CHANGE THE CONCLUSIONS', cx + 32, cy + 8, { size: 22, weight: 700, ls: 2.5, color: C.tealL, at: at + 0.1 });
  const pts = [['A human mortality result for a treatment that targets ageing itself', segT0(2, 2.0)], ['Better death-rate data by age and decade', segT0(2, 6.4)], ['A regulator accepting an ageing-related endpoint', segT0(2, 8.8)]];
  let yy = cy + 66;
  pts.forEach((p) => { yy = para(p[0], cx + 32, yy, 670, { size: 31, weight: 500, at: p[1], lh: 39 }) + 24; });
  line(cx + 32, yy + 4, cx + 712, yy + 4, C.rule, 2, null, pr(segT1(2, 0.2), 0.5, ease.out));
  para('Recommended next: independent review by a biodemographer', cx + 32, yy + 44, 670, { size: 27, weight: 600, color: C.tealL, at: segT1(2, 0.4), lh: 34 });
  ctx.restore();
  // end card
  const e = pr(segT1(2, 3.2), 0.9, ease.io);
  if (e > 0.01) {
    ctx.save(); ctx.globalAlpha *= e;
    text('Longevity Escape Velocity', W / 2, 500, { size: 92, weight: 600, fam: FR, align: 'center', maxW: 1500 });
    text('Preliminary evidence review  ·  evidence searched 29 September 2026', W / 2, 580, { size: 34, color: C.mut, align: 'center' });
    text('Full report: research-outputs/lev-longevity-escape-velocity/LEV_research_report.md', W / 2, 670, { size: 28, color: C.tealL, align: 'center', maxW: 1600 });
    text('Illustrative arithmetic on placeholder inputs. Not forecasts. Not medical, financial or legal advice.', W / 2, 730, { size: 24, color: C.faint, align: 'center', maxW: 1600 });
    ctx.restore();
  }
};
