// Swim bot: follow waypoints (global tile coords, player centre) through water with the REAL controller (Hazmat suit), report the path reached.
//   node tests/t_swim.js <room> "x,y x,y ..."  [startX,startY]   e.g. node tests/t_swim.js p_flood "846,124 849,124 849,110 ..." 841,124
const { open } = require('./harness');
(async () => {
  const room = process.argv[2], wps = process.argv[3].split(' ').map((s) => { const q = s.split(','); return [+q[0], +q[1], q[2] === 'J']; }), [sx, sy] = (process.argv[4] || wps[0].join(',')).split(',').map(Number);
  const h = await open('start=1&kit=1&god=1&room=' + room + '&abilities=hazmat,jetboots,gecko,jetrush', { w: 960, h: 540 });
  const r = await h.T((a) => {
    const G = window.__G, P = G.player, T = window.T; G.st.hp = G.st.maxHp = 99999;
    P.x = (a.sx + 0.5) * 40 - 11; P.y = (a.sy + 0.5) * 40 - P.h / 2; P.vx = P.vy = 0; G.snapCamera(); G.updateRooms(true); G.roomFade = 0;
    for (let i = 0; i < 20; i++) T.frame([], 1);
    const log = []; let wi = 0, f = 0, pickedBefore = G.st.bobbles ? JSON.stringify(G.st.bobbles) : '';
    for (; f < 60 * 90 && wi < a.wps.length; f++) {
      const [wx, wy] = a.wps[wi], cx = (P.x + P.w / 2) / 40, cy = (P.y + P.h / 2) / 40;
      const dx = wx - cx, dy = wy - cy; const keys = [];
      if (dx > 0.25) keys.push('KeyD'); else if (dx < -0.25) keys.push('KeyA');
      if (dy < -0.2) keys.push('KeyW'); else if (dy > 0.6) keys.push('KeyS');
      if (Math.abs(dx) <= 0.35 && Math.abs(dy) <= 0.6) {
        log.push('wp' + (wi + 1) + ' at t' + (f / 60).toFixed(1) + ' (' + cx.toFixed(1) + ',' + cy.toFixed(1) + ') swim=' + P.swimming);
        if (a.wps[wi][2] && a.wps[wi + 1]) { const dd = a.wps[wi + 1][0] > cx ? 'KeyD' : 'KeyA'; for (let k = 0; k < 50; k++) T.frame(k % 8 === 0 ? [dd, 'Space'] : [dd], 1); f += 50; log.push('  jump-out: y=' + (P.y / 40).toFixed(2) + ' g=' + P.onGround + ' swim=' + P.swimming); }
        wi++; continue;
      }
      T.frame(keys, 1);
      if (f % 120 === 0) log.push('t' + (f / 60).toFixed(0) + ' (' + cx.toFixed(1) + ',' + cy.toFixed(1) + ') target ' + wx + ',' + wy + ' swim=' + P.swimming + ' vy=' + Math.round(P.vy));
    }
    return { done: wi >= a.wps.length, wi, secs: +(f / 60).toFixed(1), log, rad: Math.round(G.st.rad || 0), bobbles: G.st.bobbles };
  }, { wps, sx, sy });
  console.log(JSON.stringify({ done: r.done, reachedWaypoints: r.wi + '/' + wps.length, secs: r.secs, rad: r.rad, bobbles: r.bobbles }));
  console.log(r.log.slice(0, 40).join('\n'));
  await h.browser.close();
  process.exit(r.done ? 0 : 1);
})();
