// Runtime sweep: enter every room, play ~N seconds of pseudo-random input, report exceptions, NaN positions and stuck states.
// usage: node tests/t_sweep.js [seconds=4] [roomIds,comma]   (god mode + all abilities)
const { open } = require('./harness');
const secs = +(process.argv[2] || 4), only = process.argv[3] ? process.argv[3].split(',') : null;
(async () => {
  const h = await open('start=1&kit=1&abilities=all&god=1', { w: 960, h: 540 });
  const rooms = await h.T(() => window.__G.world.rooms.map((r) => r.id));
  const bad = [], summary = [];
  for (const id of rooms) {
    if (only && !only.includes(id)) continue;
    const before = h.logs.length;
    const r = await h.T((a) => {
      const G = window.__G, T = window.T, P = G.player; G.teleportToRoom(a.id); G.updateRooms(true); G.snapCamera(); G.roomFade = 0; G.st.hp = G.st.maxHp = 99999;
      let seed = a.id.length * 7919; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      const start = { x: P.x, y: P.y }; let maxDist = 0, nan = 0, k = 0; const keys = [];
      for (let i = 0; i < a.secs * 12; i++) {                       // 12 decisions per second, 5 frames each
        const ks = []; const d = rnd(); if (d < 0.4) ks.push('KeyD'); else if (d < 0.75) ks.push('KeyA'); if (rnd() < 0.25) ks.push('Space'); if (rnd() < 0.12) ks.push('ShiftLeft'); if (rnd() < 0.3) ks.push('KeyJ'); if (rnd() < 0.06) ks.push('KeyK'); if (rnd() < 0.05) ks.push('KeyE');
        T.frame(ks, 5);
        if (!isFinite(P.x) || !isFinite(P.y)) { nan++; break; }
        maxDist = Math.max(maxDist, Math.hypot(P.x - start.x, P.y - start.y));
        if (G.state !== 'play') { if (G.state === 'overlay' || G.state === 'pipboy') { try { window.__CD.overlay.close(); } catch (e) {} } G.setState('play'); }
      }
      let badEnt = 0; for (const e of G.ents) if (e.kind === 'enemy' && (!isFinite(e.x) || !isFinite(e.y))) badEnt++;
      return { room: G.room && G.room.id, nan, badEnt, moved: Math.round(maxDist), ents: G.ents.length, hp: G.st.hp };
    }, { id, secs });
    const errs = h.logs.slice(before).filter((l) => /error|exception/i.test(l) && !/willReadFrequently|getImageData/.test(l));
    summary.push(id + ':' + r.moved);
    if (r.nan || r.badEnt || errs.length || r.room !== id) bad.push({ id, r, errs: errs.slice(0, 3) });
  }
  console.log('rooms swept:', summary.length, ' issues:', bad.length);
  for (const b of bad) console.log(JSON.stringify(b));
  console.log('moved (px) per room:', summary.join(' '));
  await h.browser.close();
})();
