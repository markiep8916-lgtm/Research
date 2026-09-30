/* Scenes 0-3: title, the idea, age-years, the pace gap. */
'use strict';
const SCENES = {};

function heading(title, sub, at = 0.2) {
  text(title, M, 172, { size: 60, weight: 600, fam: FR, at, dur: 0.7, maxW: W - 2 * M, color: C.fg });
  if (sub) text(sub, M, 220, { size: 30, color: C.mut, at: at + 0.2, dur: 0.7, maxW: W - 2 * M });
}

/* ------------------------------------------------------------------ 0 title */
SCENES.title = () => {
  // lifelines: 45-degree lines in the calendar-age plane; each one ends where a life ends, one keeps going
  const starts = [1024, 1119, 1214, 1309, 1404, 1499, 1594], lens = [280, 480, 380, 560, 330, 500, 300];
  starts.forEach((x0, i) => {
    const t0 = 0.4 + i * 0.28, u = pr(t0, 2.6, ease.io), L = lens[i] * u;
    const y0 = 880;
    line(x0, y0, x0 + L, y0 - L, C.faint, 3, null, 0.85);
    if (u >= 1) {
      const a = pr(t0 + 2.6, 0.5, ease.out);
      ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = C.faint; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x0 + lens[i], y0 - lens[i], 9, 0, 7); ctx.stroke(); ctx.restore();
    }
  });
  const u = pr(0.9, 5.2, ease.io), L = 700 * u;
  line(964, 880, 964 + L, 880 - L, C.teal, 6);
  if (u > 0.02) dot(964 + L, 880 - L, 10, C.tealL);
  if (u >= 1) { const a = pr(6.1, 0.6, ease.out); ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = C.tealL; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(1664, 180, 13, 0, 7); ctx.stroke(); ctx.restore(); }

  text('DEEP RESEARCH  ·  PRELIMINARY REVIEW', M, 300, { size: 26, weight: 600, ls: 3, color: C.mut, at: 0.6 });
  text('Longevity Escape Velocity', M, 430, { size: 118, weight: 600, fam: FR, at: 1.0, dur: 0.9, maxW: 1400 });
  text('What it would take, how far the evidence says we are,', M, 520, { size: 40, color: C.mut, at: 1.8 });
  text('and what can be said about when', M, 572, { size: 40, color: C.mut, at: 2.0 });
  chip('pre', M, 690, { at: 2.6, size: 24, label: 'PRELIMINARY EVIDENCE REVIEW' });
  text('Evidence searched 29 September 2026', M + 470, 690, { size: 28, color: C.mut, at: 2.8 });
  text('Illustrative arithmetic on placeholder inputs. Not forecasts.', M, 820, { size: 24, color: C.faint, at: 3.2 });
};

/* ------------------------------------------------------------------ 1 the idea */
SCENES.idea = () => {
  const D = DATA.idea, X0 = 520, PX = 46, YEAR0 = 2026;
  heading('Does the horizon keep moving away?', 'Remaining life expectancy of a 70-year-old in the model (placeholder mortality level)');
  // elapsed years k(LT): 0, then one year, then ten
  const cueA = segAt(0, 0.66), cueB = segT0(1, 0.6);
  let k = 0;
  k += pr(cueA, 1.6, ease.io) * 1;
  k += pr(cueB, 8.0, ease.io) * 9;
  const interp = (arr) => { const i = Math.min(arr.length - 2, Math.floor(k)); return lerp(arr[i], arr[i + 1], k - i); };
  const lanes = [
    { y: 440, name: 'At the historical pace', sub: 'death rates falling 1.5% a year (assumed)', color: C.amber, e: interp(D.e_hist), delta: '−0.5 years in a year' },
    { y: 660, name: 'At escape velocity', sub: 'death rates falling 8.3% a year', color: C.teal, e: interp(D.e_lev), delta: 'no change' }
  ];
  const yc = pr(0.8, 0.7, ease.out);
  text('CALENDAR YEAR', W - M, 300, { size: 20, weight: 600, ls: 2.5, color: C.mut, align: 'right', alpha: yc });
  text(String(YEAR0 + Math.floor(k + 1e-6)), W - M, 372, { size: 84, weight: 600, fam: FR, align: 'right', alpha: yc });
  lanes.forEach((L, li) => {
    const at = 0.5 + li * 0.35, base = L.y + 64;
    text(L.name, M, L.y + 2, { size: 34, weight: 600, color: L.color, at, maxW: 380 });
    text(L.sub, M, L.y + 38, { size: 25, color: C.mut, at: at + 0.15, maxW: 380 });
    const a = pr(at, 0.6, ease.out);
    line(X0, base, X0 + 30 * PX, base, C.rule, 2, null, a);
    [2026, 2030, 2035, 2040, 2045, 2050, 2055].forEach((yr) => {
      const x = X0 + (yr - YEAR0) * PX; line(x, base, x, base + 8, C.rule, 2, null, a);
      text(String(yr), x, base + 34, { size: 21, color: C.mut, align: 'center', alpha: a });
    });
    const px = X0 + k * PX, fx = X0 + (k + L.e) * PX, u = pr(at + 0.2, 0.7, ease.out);
    if (u > 0.01) {
      // remaining life as a bar between the person and the expected end
      ctx.save(); ctx.globalAlpha *= u * 0.28; rrectPath(px, L.y - 6, fx - px, 28, 8); ctx.fillStyle = L.color; ctx.fill(); ctx.restore();
      line(px, L.y - 6, px, L.y + 22, L.color, 3, null, u);
      // person
      dot(px, L.y + 8, 19, C.fg, u);
      text('age ' + (70 + Math.floor(k + 1e-6)), px, L.y - 34, { size: 28, weight: 600, align: 'center', alpha: u });
      // flag at the expected end
      line(fx, L.y + 22, fx, L.y - 66, L.color, 4, null, u);
      ctx.save(); ctx.globalAlpha *= u; ctx.fillStyle = L.color; ctx.beginPath(); ctx.moveTo(fx, L.y - 66); ctx.lineTo(fx + 40, L.y - 52); ctx.lineTo(fx, L.y - 38); ctx.closePath(); ctx.fill(); ctx.restore();
      text('expected end', fx + 4, L.y - 80, { size: 22, color: C.mut, align: 'center', alpha: u });
      const mid = (px + fx) / 2;
      text(fmt(L.e, 1) + ' years left', mid, L.y - 30, { size: 46, weight: 600, fam: FR, color: L.color, align: 'center', alpha: u });
    }
    const d = pr(cueA + 1.5, 0.6, ease.out) * (1 - pr(cueB + 0.5, 0.6));
    if (d > 0.01) text(L.delta, (px + fx) / 2, L.y + 50, { size: 26, weight: 600, color: L.color, align: 'center', alpha: d });
  });
  const rule = pr(segT0(1, 1.2), 0.7, ease.out);
  if (rule > 0.01) {
    box(M, 792, W - 2 * M, 76, { fill: C.panel, stroke: C.tealD, lw: 2, at: segT0(1, 1.2) });
    const swap = pr(segT0(2, 0.2), 0.6, ease.io);
    text('Escape velocity: remaining life expectancy stops shrinking', W / 2, 843, { size: 42, weight: 600, fam: FR, color: C.fg, align: 'center', at: segT0(1, 1.4), until: segT0(2, 0.1), maxW: 1600 });
    text('Not immortality: the expected end just stops getting closer', W / 2, 843, { size: 42, weight: 600, fam: FR, color: C.tealL, align: 'center', at: segT0(2, 0.4), maxW: 1600 });
  }
};

/* ------------------------------------------------------------------ 2 age-years */
SCENES.ageyears = () => {
  const P = DATA.params, A = P.A, B = P.beta, CF = P.c;
  const mu = (age, s) => A * Math.exp(B * (age - s)) + CF;
  const L = 190, R = 1290, T = 285, Bt = 790;
  const X = scale(30, 100, L, R), lo = Math.log(3e-4), hi = Math.log(0.5);
  const Y = (v) => Bt - (Math.log(v) - lo) / (hi - lo) * (Bt - T);
  heading('Measuring progress in age-years', 'Yearly death rate against age, on a log scale (model, placeholder level)');
  const a0 = pr(0.5, 0.8, ease.out);
  [0.001, 0.01, 0.1].forEach((v) => { line(L, Y(v), R, Y(v), C.grid, 1, null, a0); text((v * 100) + '%', L - 14, Y(v) + 8, { size: 22, color: C.mut, align: 'right', alpha: a0 }); });
  for (let a = 30; a <= 100; a += 10) { line(X(a), Bt, X(a), Bt + 8, C.rule, 2, null, a0); text(String(a), X(a), Bt + 36, { size: 22, color: C.mut, align: 'center', alpha: a0 }); }
  line(L, Bt, R, Bt, C.rule, 2, null, a0); line(L, T, L, Bt, C.rule, 2, null, a0);
  text('Age', (L + R) / 2, Bt + 70, { size: 24, weight: 600, color: C.mut, align: 'center', alpha: a0 });
  ctx.save(); ctx.translate(L - 96, (T + Bt) / 2); ctx.rotate(-Math.PI / 2);
  text('Death rate per year', 0, 0, { size: 24, weight: 600, color: C.mut, align: 'center', alpha: a0 }); ctx.restore();

  const ages = []; for (let a = 30; a <= 100; a += 1) ages.push(a);
  const base = ages.map((a) => [X(a), Y(mu(a, 0))]);
  const s3 = pr(segT0(1, 0.5), 2.4, ease.io) * 3;                      // 0 -> 3 age-years
  const back = pr(segT0(2, 0.1), 0.6, ease.io);                         // fade the 3-year demonstration
  const yrs = pr(segT0(2, 1.6), 6.0, ease.io) * 5;                      // 0 -> 5 calendar years at 1 age-year each
  polyline(base, pr(segT0(0, 0.2), 3.2, ease.io), C.fg, 5, 0.95);

  // doubling annotation on the base curve
  const dA = pr(segT0(0, 3.4), 0.9, ease.out) * (1 - pr(segT0(1, 0.2), 0.6));
  if (dA > 0.01) {
    const a1 = 62, a2 = 70, y1 = Y(mu(a1, 0)), y2 = Y(mu(a2, 0));
    line(X(a1), y1, X(a2), y1, C.amber, 3, [8, 6], dA); line(X(a2), y1, X(a2), y2, C.amber, 3, [8, 6], dA);
    dot(X(a1), y1, 8, C.amber, dA); dot(X(a2), y2, 8, C.amber, dA);
    text('8 years', (X(a1) + X(a2)) / 2, y1 + 34, { size: 26, weight: 600, color: C.amber, align: 'center', alpha: dA });
    text('× 2', X(a2) + 16, (y1 + y2) / 2 + 9, { size: 36, weight: 600, fam: FR, color: C.amber, alpha: dA });
  }
  // the 3-year shift, with a zoom inset because the gap between the curves is small on a log axis
  const shiftAlpha = (s3 > 0.001 ? 1 : 0) * (1 - back);
  if (shiftAlpha > 0.01) {
    polyline(ages.map((a) => [X(a), Y(mu(a, s3))]), 1, C.teal, 6, shiftAlpha);
    const za = pr(segT0(1, 3.1), 0.7, ease.out) * (1 - back);
    if (za > 0.01 && s3 > 2.9) {
      const bx = 250, by = 318, bw = 420, bh = 240, x0 = 72, x1 = 78;
      const xi = scale(x0, x1, bx + 36, bx + bw - 60), m0 = mu(72, 0), dec = 400;
      const yi = (v) => by + 151 - (Math.log10(v) - Math.log10(m0)) * dec;
      box(bx, by, bw, bh, { fill: C.panel, stroke: C.tealD, lw: 2, alpha: za });
      text('Zoom on ages 72 to 78', bx + 18, by + 34, { size: 22, color: C.mut, alpha: za });
      const zb = [], zt = [];
      for (let a = x0; a <= x1 + 1e-9; a += 0.25) { zb.push([xi(a), yi(mu(a, 0))]); zt.push([xi(a), yi(mu(a, 3))]); }
      polyline(zb, 1, C.fg, 5, za); polyline(zt, 1, C.teal, 5, za);
      const y1 = yi(mu(75, 0)), yT = yi(mu(75, 3));
      arrow(xi(75), y1, xi(78), y1, C.amber, 4, 14, za);
      text('3 years', bx + bw - 14, y1 - 14, { size: 22, weight: 600, color: C.amber, align: 'right', alpha: za });
      arrow(xi(75), y1 + 4, xi(75), yT - 2, C.tealL, 4, 12, za);
      text('−23%', xi(75) + 12, yT + 44, { size: 30, weight: 600, fam: FR, color: C.tealL, alpha: za });
    }
  }
  // time-lapse: one age-year every calendar year
  if (yrs > 0.001 || back > 0.01) {
    polyline(ages.map((a) => [X(a), Y(mu(a, yrs))]), 1, C.teal, 6, back);
    const ax = 70, yv = mu(ax, yrs);
    dot(X(ax), Y(yv), 10, C.tealL, back);
    line(X(ax), Y(mu(ax, 0)), X(ax), Y(yv), C.tealL, 3, [6, 6], back * 0.8);
  }
  // legend in the empty lower right of the plot
  const lg = pr(segT0(1, 0.5), 0.6, ease.out);
  if (lg > 0.01) {
    line(820, 676, 876, 676, C.fg, 5, null, lg); line(820, 724, 876, 724, C.teal, 6, null, lg);
    const later = back > 0.5 ? String(2026 + Math.floor(yrs + 1e-6)) : '3 age-years of progress';
    text(back > 0.5 ? '2026' : 'today’s death rates', 892, 685, { size: 26, weight: 600, alpha: lg });
    text(later, 892, 733, { size: 26, weight: 600, color: C.tealL, alpha: lg });
  }
  // right-hand panel
  const RX = 1370;
  const p1 = pr(segT0(0, 0.4), 0.7, ease.out) * (1 - pr(segT0(1, 0.2), 0.6));
  if (p1 > 0.01) {
    text('Death rates roughly', RX, 380, { size: 36, weight: 600, alpha: p1 });
    text('double every 8 years', RX, 426, { size: 36, weight: 600, alpha: p1 });
    text('of age (Gompertz law)', RX, 470, { size: 28, color: C.mut, alpha: p1 });
  }
  const p2 = pr(segT0(1, 3.2), 0.7, ease.out) * (1 - back);
  if (p2 > 0.01) {
    text('−23%', RX, 470, { size: 130, weight: 600, fam: FR, color: C.teal, alpha: p2 });
    text('at every age', RX, 524, { size: 36, weight: 600, alpha: p2 });
    text('= 3 age-years of progress', RX, 572, { size: 30, color: C.mut, alpha: p2 });
  }
  const p3 = pr(segT0(2, 0.6), 0.7, ease.out);
  if (p3 > 0.01) {
    text('−8.3%', RX, 470, { size: 130, weight: 600, fam: FR, color: C.teal, alpha: p3 });
    text('a year, every year', RX, 524, { size: 36, weight: 600, alpha: p3 });
    text('1 age-year of progress per', RX, 572, { size: 28, color: C.mut, alpha: p3 });
    text('calendar year, ages 50 to 90', RX, 610, { size: 28, color: C.mut, alpha: p3 });
    const yr = 2026 + Math.floor(yrs + 1e-6), v70 = mu(70, yrs) * 100;
    text(String(yr), RX, 736, { size: 64, weight: 600, fam: FR, color: C.fg, alpha: p3 });
    text('death rate at 70: ' + v70.toFixed(1) + '% a year', RX, 784, { size: 28, weight: 600, color: C.tealL, alpha: p3 });
    text('(6.7% to 9.4% for doubling times of 10 to 7 years)', RX, 656, { size: 22, color: C.faint, alpha: p3, maxW: 460 });
  }
  para('Illustrative curve: placeholder mortality level (5% a year at age 80). Doubling time 7 to 10 years; 8 is the central value, not independently corroborated.', 1370, 826, 460, { size: 20, color: C.faint, at: 0.9, lh: 25 });
};

/* ------------------------------------------------------------------ 3 the pace gap */
SCENES.gap = () => {
  const G = DATA.gap, TX0 = 700, TX1 = 1780, DOM = 20;
  const X = scale(0, DOM, TX0, TX1);
  heading('How far is that from reality?', 'Yearly fall in death rates that each definition requires, against what has been observed');
  const a0 = pr(0.5, 0.8, ease.out);
  for (let v = 0; v <= DOM; v += 5) { line(X(v), 290, X(v), 772, C.grid, 1.5, null, a0); text(v + '%', X(v), 806, { size: 22, color: C.mut, align: 'center', alpha: a0 }); }
  line(TX0, 772, TX1, 772, C.rule, 2, null, a0);
  text('fall in death rates per year', TX1, 806, { size: 1, alpha: 0 });
  const rows = [
    { y: 336, name: 'Observed', sub: 'all-cause death rates, historical pace', lo: G.observed[0], hi: G.observed[1], color: C.amber, label: '1–2% a year', side: 'r', at: segT0(0, 1.0) },
    { y: 466, name: 'Required: “no-shrink”', sub: 'the report’s main definition, at every age 50–90', sub2: '(range 6.7–9.4%)', lo: G.period_dn[0], hi: G.period_dn[1], mid: G.period_dn[2], color: C.teal, label: 'about 8% a year', side: 'r', at: segT0(1, 0.4) },
    { y: 596, name: 'Cohort reading', sub: 'counts a cohort’s own future progress, ages 50–80', lo: G.cohort_d1[0], hi: G.cohort_d1[1], color: C.tealD, label: '4.1–7.8%', side: 'r', at: segT0(2, 0.4) },
    { y: 726, name: 'Popular “one year per year”', sub: 'life expectancy at a fixed age rises 1 year a year, ages 50–80', lo: G.period_d1[0], hi: G.period_d1[1], color: C.tealD, label: '8.3–16.9%', side: 'l', at: segT0(2, 3.8) }
  ];
  rows.forEach((r) => {
    const u = pr(r.at, 0.9, ease.out), uu = pr(r.at + 0.1, 1.1, ease.io);
    text(r.name, M, r.y - 4, { size: 32, weight: 600, at: r.at, maxW: 570, color: r.color === C.tealD ? C.tealL : r.color });
    para(r.sub, M, r.y + 28, 580, { size: 23, color: C.mut, at: r.at + 0.15, lh: 28, maxW: 580 });
    if (r.sub2) text(r.sub2, M, r.y + 56, { size: 23, color: C.mut, at: r.at + 0.25, maxW: 580 });
    if (u > 0.01) {
      const x1 = X(r.lo), x2 = lerp(x1, X(r.hi), uu);
      box(x1, r.y - 24, Math.max(2, x2 - x1), 48, { fill: r.color, r: 8, alpha: u });
      if (r.mid !== undefined && uu > 0.95) line(X(r.mid), r.y - 34, X(r.mid), r.y + 34, C.fg, 4, null, u);
      if (uu > 0.9) {
        const f = pr(r.at + 1.0, 0.5, ease.out);
        if (r.side === 'r') text(r.label, X(r.hi) + 18, r.y + 13, { size: 38, weight: 600, fam: FR, color: r.color === C.tealD ? C.tealL : r.color, alpha: f });
        else text(r.label, X(r.lo) - 18, r.y + 13, { size: 38, weight: 600, fam: FR, color: C.tealL, align: 'right', alpha: f });
      }
    }
  });
  // ratio badges
  const b1 = pr(segT0(1, 3.6), 0.8, ease.out);
  if (b1 > 0.01) {
    arrow(X(1.5), 368, X(1.5), 438, C.fg, 3, 14, b1 * 0.8);
    const wb = text('4 to 8 times faster', X(1.5) + 26, 412, { size: 44, weight: 600, fam: FR, color: C.fg, alpha: b1 });
    text('(3 to 9 across doubling times)', X(1.5) + 26 + wb + 18, 412, { size: 22, color: C.mut, alpha: b1 });
  }
  const b2 = pr(segT0(2, 6.0), 0.9, ease.out);
  if (b2 > 0.01) text('2 to 17 times, depending on the definition', TX1, 664, { size: 34, weight: 600, fam: FR, color: C.fg, align: 'right', alpha: b2, maxW: 700 });
  para('Observed: US ages 65+ 2018–19: 1.0–1.8%; all ages since 1900: 1–2%†; actuarial assumption: 1.5%†.   † the figure was in our search query. Rates are old or assumed; decade-by-age tables could move the gap either way.', M, 846, W - 2 * M, { size: 21, color: C.faint, at: segT0(0, 2.0), lh: 26 });
};
