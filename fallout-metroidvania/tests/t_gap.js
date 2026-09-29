// Gap-crossing bot for the REAL player controller: run at a gap, jump, optionally double-jump and dash at a grid of timings, and count how many
// timings land on the far side. Used to prove that ability-gated gaps are (a) crossable with the intended abilities by a wide range of human
// timings and (b) NOT crossable without the gating ability.
//   node tests/t_gap.js --room s_over --edge 567 --far 581 --row 44 --abil jetboots,jetrush [--dir 1] [--farRow 44] [--want many|none] [--dj 0.3,0.5] [--dash 0.1,0.3]
//   --edge / --far are tile columns (global): the LAST solid column of the near platform and the FIRST solid column of the far one (dir=1).
//   For dir=-1 pass --edge = the first column of the near platform (its left edge) and --far = the last column of the far platform.
const { open } = require('./harness');
const A = process.argv.slice(2), arg = (n, d) => { const i = A.indexOf('--' + n); return i >= 0 ? A[i + 1] : d; };
(async () => {
  const room = arg('room'), edge = +arg('edge'), far = +arg('far'), row = +arg('row'), farRow = +arg('farRow', row), dir = +arg('dir', 1), abil = arg('abil', 'jetboots,jetrush');
  const want = arg('want', 'many');
  const djs = arg('dj', abil.indexOf('jetboots') >= 0 ? 'none,0.3,0.45,0.6,0.75' : 'none').split(',').map((s) => (s === 'none' ? null : +s));
  const dashes = arg('dash', abil.indexOf('jetrush') >= 0 ? 'none,0.1,0.25,0.4,0.55,0.7,0.85' : 'none').split(',').map((s) => (s === 'none' ? null : +s));
  const overs = arg('over', '-18,4,22,40').split(',').map(Number);
  const h = await open('start=1&kit=1&god=1&room=' + room + '&abilities=' + abil, { w: 960, h: 540 });
  const edgeX = dir > 0 ? (edge + 1) * 40 : edge * 40, farX = dir > 0 ? far * 40 : (far + 1) * 40;
  const res = [];
  for (const over of overs) for (const dj of djs) for (const dash of dashes) {
    const r = await h.T((a) => {
      const G = window.__G, P = G.player, T = window.T; G.st.hp = G.st.maxHp = 99999;
      P.x = a.edgeX - a.dir * a.runup - 11; P.y = a.row * 40 - P.h; P.vx = P.vy = 0; P.face = a.dir; P.airJumps = 0; P.airDashed = false; P.dashCd = 0; P.dashT = 0; P.wallLock = 0;
      G.snapCamera(); G.updateRooms(true); G.roomFade = 0;
      for (let i = 0; i < 12; i++) T.frame([], 1);
      const key = a.dir > 0 ? 'KeyD' : 'KeyA'; let took = -1, prevSpace = false, prevShift = false, djDone = false, dashDone = false, out = 'timeout', tk = 0;
      for (let f = 0; f < 60 * 5; f++) {
        const keys = [key]; let space = false, shift = false;
        const pos = a.dir > 0 ? P.x + P.w : P.x;                             // leading edge of the body
        const past = a.dir > 0 ? pos - a.edgeX : a.edgeX - pos;             // px beyond the platform edge
        if (took < 0) { if ((P.onGround || P.coyote > 0) && past >= a.over) { space = true; took = f; } }
        else {
          const t = (f - took) / 60;
          if (P.vy < 0 && !djDone && prevSpace && t < (a.dj !== null ? Math.min(a.dj - 0.03, 0.45) : 0.45)) space = true;   // hold Jump for the first jump, release just before the double jump
          if (a.dj !== null && !djDone && t >= a.dj && !P.onGround && !prevSpace) { space = true; djDone = true; }
          if (a.dash !== null && !dashDone && t >= a.dash && !prevShift) { shift = true; dashDone = true; }
        }
        if (space) keys.push('Space'); if (shift) keys.push('ShiftLeft'); prevSpace = space; prevShift = shift;
        T.frame(keys, 1);
        if (took >= 0 && f - took > 6 && P.onGround) { const cx = P.x + P.w / 2, rowNow = Math.round((P.y + P.h) / 40); out = ((a.dir > 0 ? cx >= a.farX : cx <= a.farX) && rowNow === a.farRow) ? 'far' : ((a.dir > 0 ? cx < a.edgeX : cx > a.edgeX) ? 'near' : 'other:' + rowNow); break; }
        if (P.y > (a.row + 8) * 40) { out = 'fell'; break; }
        if (P.dead) { out = 'dead'; break; }
      }
      return { out, tk: took };
    }, { edgeX, farX, row, farRow, dir, over, dj, dash, runup: +arg('runup', 150) });
    res.push({ over, dj, dash, out: r.out });
  }
  const ok = res.filter((x) => x.out === 'far');
  const hist = {}; for (const x of res) hist[x.out] = (hist[x.out] || 0) + 1; console.log('  outcomes ' + JSON.stringify(hist));
  console.log('gap ' + room + '  edge col ' + edge + ' -> far col ' + far + '  (' + Math.abs(far - edge - 1) + ' tiles)  abilities [' + abil + ']  trials ' + res.length + '  crossed ' + ok.length);
  const byOver = {}; for (const x of res) { byOver[x.over] = byOver[x.over] || { n: 0, ok: 0 }; byOver[x.over].n++; if (x.out === 'far') byOver[x.over].ok++; }
  console.log('  by takeoff offset (px past edge): ' + Object.keys(byOver).map((k) => k + ':' + byOver[k].ok + '/' + byOver[k].n).join('  '));
  if (ok.length) console.log('  e.g. ' + ok.slice(0, 6).map((x) => 'over' + x.over + ' dj' + x.dj + ' dash' + x.dash).join(' | '));
  await h.browser.close();
  const pass = want === 'none' ? ok.length === 0 : ok.length >= Math.max(3, res.length * 0.15);
  console.log(pass ? 'PASS' : 'FAIL');
  process.exit(pass ? 0 : 1);
})();
