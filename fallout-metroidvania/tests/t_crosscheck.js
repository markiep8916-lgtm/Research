// Cross-check tools/real_sim.js (the headless replica of the player controller) against the real game in the browser:
// replay the same scripted key frames for a sample of solver edges in both and compare landing cells.
//   node tests/t_crosscheck.js <edges.json from reach.js --certify --edges> [sample=40] [maxRound=3]
const { open } = require('./harness');
const fs = require('fs');
const R = require('../tools/reach.js'); const RS = require('../tools/real_sim.js')(R.CD, R.world);
(async () => {
  const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), N = +(process.argv[3] || 40), maxRound = +(process.argv[4] || 3);
  const pool = data.edges.filter((e) => e.round <= maxRound && !e.plan.walk && !e.plan.drop);
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const sample = []; while (sample.length < N && pool.length) sample.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  const h = await open('start=1&kit=0&god=1&abilities=jetboots,gecko,jetrush', { w: 960, h: 540 });
  let same = 0, diffs = [];
  for (const e of sample) {
    R.applyState(new Set(data.states[e.round]));
    const has = {}; for (const a of e.abilities) has[a] = true;
    const node = RS.run(e.from[0], e.from[1], e.plan, has, {});
    const abil = e.abilities;
    const web = await h.T((a) => {
      const G = window.__G, Pl = G.player, T = window.T, plan = a.plan; G.st.hp = G.st.maxHp = 99999; G.st.abilities = {}; for (const x of a.abil) G.st.abilities[x] = 1;
      Pl.x = (a.from[0] + 0.5) * 40 - 11; Pl.y = a.from[1] * 40 - Pl.h; Pl.vx = Pl.vy = 0; Pl.face = plan.dir || plan.fall || 1; Pl.airJumps = 0; Pl.airDashed = false; Pl.dashCd = 0; Pl.wallLock = 0; Pl.coyote = 0; Pl.jumpBuf = 0;
      G.snapCamera(); G.updateRooms(true); G.roomFade = 0;
      for (let i = 0; i < 6; i++) T.frame([], 1);
      const maxF = 156, dir = plan.dir || plan.fall || 0; let curDir = dir; const hold = plan.hold === undefined ? 1 : plan.hold, dj = plan.dj === undefined ? null : plan.dj, dash = plan.dash === undefined ? null : plan.dash;
      const djF = dj === null ? -1 : Math.max(1, Math.ceil(dj * 60 - 1e-6)), dashF = dash === null ? -1 : Math.max(1, Math.ceil(dash * 60 - 1e-6));
      const wj = plan.wj || null, jumping = !plan.fall && !plan.drop; let wjIdx = 0, prevSpace = false, airborne = false, landed = null, f = 0;
      for (; f < maxF; f++) {
        const t = f / 60, keys = []; let space = false;
        if (curDir < 0) keys.push('KeyA'); if (curDir > 0) keys.push('KeyD');
        if (plan.drop) { keys.push('KeyS'); space = f === 0; }
        else if (jumping) {
          if (f === 0) space = true; else if (djF > 0 && f === djF - 1) space = false; else if (djF > 0 && f === djF) space = true; else space = t <= hold + 1e-6;
          if (wj && Pl.wallCling && !Pl.onGround && wjIdx < wj.length && t >= wj[wjIdx]) { if (prevSpace) space = false; else { space = true; wjIdx++; if (plan.wjMode !== 'same') curDir = -Pl.wallDir; } }
          if (dashF > 0 && f === dashF) keys.push('ShiftLeft');
        }
        if (space) keys.push('Space'); prevSpace = space;
        T.frame(keys, 1);
        if (!Pl.onGround) airborne = true;
        if (Pl.y > 100000) break;
        if (Pl.onGround && (airborne || !jumping) && f >= 3) { landed = [Math.floor((Pl.x + Pl.w / 2) / 40), Math.round((Pl.y + Pl.h) / 40)]; break; }
        if (Pl.onGround && !airborne && jumping && f > 20) break;
      }
      return { landed, f };
    }, { from: e.from, plan: e.plan, abil });
    const a = node.landed ? node.landed.join(',') : 'none', b = web.landed ? web.landed.join(',') : 'none';
    if (a === b) same++; else diffs.push({ from: e.from, to: e.to, node: a, web: b, plan: e.plan, round: e.round });
  }
  console.log('cross-check: ' + same + '/' + sample.length + ' identical landing cells between the headless replica and the browser game');
  for (const d of diffs.slice(0, 12)) console.log('  DIFF ' + JSON.stringify(d.from) + ' -> expected ' + JSON.stringify(d.to) + ': node ' + d.node + '  browser ' + d.web + '  round ' + d.round + ' ' + JSON.stringify(d.plan));
  await h.browser.close();
  process.exit(diffs.length ? 1 : 0);
})();
