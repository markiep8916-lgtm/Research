// Wall-jump bot: can the REAL player controller climb a shaft with Gecko Grips (+ Jet Boots)?  It plays like a human would: hold toward a wall,
// tap Jump when the grip catches, hold Jump while rising, double-jump near the apex when no wall is in reach.
//   node tests/t_chimney.js [room=s_ridge] [startCol=640] [startRow=56] [goalRow=30] [policy=same|alt|both] [abilities=jetboots,gecko]
// exit code 0 when the goal row is reached by every requested policy within the time limit.
const { open } = require('./harness');
(async () => {
  const room = process.argv[2] || 's_ridge', sc = +(process.argv[3] || 640), sr = +(process.argv[4] || 56), goalRow = +(process.argv[5] || 30);
  const policies = (process.argv[6] || 'both') === 'both' ? ['same-left', 'same-right', 'alt'] : [process.argv[6]];
  const abil = process.argv[7] || 'jetboots,gecko';
  const h = await open('start=1&kit=1&god=1&room=' + room + '&abilities=' + abil, { w: 960, h: 540 });
  let allOk = true;
  for (const policy of policies) {
    const r = await h.T((a) => {
      const G = window.__G, P = G.player, T = window.T; G.st.hp = G.st.maxHp = 99999;
      P.x = (a.sc + 0.5) * 40 - 11; P.y = a.sr * 40 - P.h; P.vx = P.vy = 0; G.snapCamera(); G.updateRooms(true); G.roomFade = 0;
      for (let i = 0; i < 30; i++) T.frame([], 1);
      let dirWant = a.policy === 'same-right' ? 1 : -1, prevSpace = false, best = P.y, reached = false, frames = 0, kicks = 0, djs = 0, lastClung = false; const log = [];
      const goalY = a.goalRow * 40;
      for (frames = 0; frames < 60 * 60; frames++) {
        const keys = []; let space = false, note = '';
        const clinging = P.wallCling && !P.onGround;
        if (P.onGround) { if (!prevSpace) space = true; }
        else if (clinging) { if (!prevSpace) { space = true; kicks++; note = 'K'; if (a.policy === 'alt') dirWant = -P.wallDir; } }
        else if (P.vy < -80 && prevSpace) space = true;                                           // keep Jump held while rising
        else if (a.useDouble && P.airJumps < 1 && P.vy > -40 && !prevSpace) { space = true; djs++; note = 'D'; }   // double jump near the apex
        if (clinging || (P.y + P.h) / 40 < a.enterRow) keys.push(dirWant < 0 ? 'KeyA' : 'KeyD');   // stay centred under the shaft until level with its mouth
        if (space) keys.push('Space'); prevSpace = space;
        T.frame(keys, 1);
        best = Math.min(best, P.y);
        if (frames % 30 === 0 || note) log.push('t' + (frames / 60).toFixed(2) + ' row' + (P.y / 40).toFixed(1) + ' x' + Math.round(P.x) + ' vy' + Math.round(P.vy) + (P.wallCling ? ' CL' : '') + (P.onGround ? ' G' : '') + ' ' + note);
        if (P.y < goalY) { reached = true; break; }
      }
      return { reached, secs: +(frames / 60).toFixed(1), bestRow: +(best / 40).toFixed(1), kicks, djs, log: log.slice(-14) };
    }, { sc, sr, goalRow, policy, useDouble: abil.indexOf('jetboots') >= 0, enterRow: +(process.env.ENTER || 51.5) });
    console.log(policy.padEnd(11) + (r.reached ? 'REACHED' : 'FAILED ') + ' goal row ' + goalRow + '  time ' + r.secs + 's  best row ' + r.bestRow + '  wall-kicks ' + r.kicks + '  double-jumps ' + r.djs);
    if (!r.reached) { allOk = false; console.log('   ' + r.log.join('\n   ')); }
  }
  await h.browser.close();
  process.exit(allOk ? 0 : 1);
})();
