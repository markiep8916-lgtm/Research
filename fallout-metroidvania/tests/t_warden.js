// First-boss progression check with REAL triggers and REAL shooting: walk into the Vault Door Chamber, fight the Warden with the 10mm pistol only
// (mouse-aimed, key-fired, reloading when dry), pick up the Overseer keycard it drops and confirm the exit door opens.
//   node tests/t_warden.js [maxSeconds=150] [god=1]        (god=0: the bot only strafes, so expect it to take damage)
//   DRY=1 node tests/t_warden.js 400                      start with no ammo at all: only the boss's supply drops keep the fight winnable
const { open } = require('./harness');
(async () => {
  const maxS = +(process.argv[2] || 150), god = process.argv[3] !== '0';
  const h = await open('start=1&kit=1' + (god ? '&god=1' : '') + '&room=v_warden', { w: 1280, h: 720 });
  const r = await h.T((a) => {
    const G = window.__G, CD = window.__CD, P = G.player, T = window.T, I = CD.input;
    for (const k of Object.keys(G.st.ammo)) if (k !== '10mm') G.st.ammo[k] = 0;                 // pistol only
    const dryStart = !!a.dryStart; G.st.wi = G.st.weapons.indexOf('pistol10'); G.st.mag.pistol10 = dryStart ? 0 : 12; G.st.ammo['10mm'] = dryStart ? 0 : 60; if (dryStart) for (const k of Object.keys(G.st.mag)) G.st.mag[k] = 0;
    G.st.hp = G.st.maxHp; const hp0 = G.st.hp;
    const trig = G.world.spawns.find((s) => s.t === 'trigger' && s.boss === 'warden');
    P.x = (trig.tx - 5) * 40; P.y = (trig.ty + 1) * 40 - P.h; P.vx = P.vy = 0; G.snapCamera(); G.updateRooms(true); G.roomFade = 0;
    for (let i = 0; i < 20; i++) T.frame([], 1);
    let f = 0; for (; f < 60 * 6 && !G.boss; f++) T.frame(['KeyD'], 1);                        // walk into the trigger like a player
    if (!G.boss) return { err: 'boss never started', state: G.state };
    const gates = CD.bosses.gates.length, bossHp = G.boss.maxHp; let shots0 = G.st.ammo['10mm'] + G.st.mag.pistol10, t = 0, hpMin = G.st.hp;
    for (; t < a.maxS * 60; t++) {
      const b = G.boss; if (!b || b.dead) break;
      I.aimMode = 'mouse'; I.mouse.moved = true; I.mouse.x = (b.cx - G.cam.x) * G.zoom; I.mouse.y = (b.cy - G.cam.y) * G.zoom;
      let dir = Math.sin(t / 60 * 0.8) > 0 ? 'KeyD' : 'KeyA', fetchJump = false;
      if (G.st.ammo['10mm'] + G.st.mag.pistol10 < 12) {                                        // running low: go and fetch the supply drop
        const pk = G.ents.filter((q) => q.kind === 'pickup' && q.k === 'ammo' && Math.abs(q.y - P.cy) < 260 && q.x > G.room.px0 && q.x < G.room.px1).sort((u, v) => Math.abs(u.x - P.cx) - Math.abs(v.x - P.cx))[0];
        if (pk && Math.abs(pk.x - P.cx) > 18) dir = pk.x > P.cx ? 'KeyD' : 'KeyA';
        if (pk && pk.y < P.cy - 90 && Math.abs(pk.x - P.cx) < 60 && t % 20 === 0) fetchJump = true;
      }
      const keys = [dir]; if (t % 8 < 4) keys.push('KeyJ');      // semi-auto pistol: click, click, click
      if (G.st.mag.pistol10 <= 0 && P.reloading <= 0) keys.push('KeyR');
      if (t % 150 === 0 || fetchJump) keys.push('Space');
      T.frame(keys, 1); hpMin = Math.min(hpMin, G.st.hp);
    }
    const secs = +(t / 60).toFixed(1), killed = !G.boss || G.boss.dead, used = shots0 - (G.st.ammo['10mm'] + G.st.mag.pistol10), drops = G.notes ? G.notes.filter((n) => /SUPPL/.test(n.msg)).length : 0;
    if (!killed) return { killed, secs, bossHp: Math.round(G.boss.hp) + '/' + bossHp, used, hpMin: Math.round(hpMin) };
    for (let i = 0; i < 240; i++) T.frame([], 1);                                              // let the reward drop and the victory banner run
    const key = G.ents.filter((e) => e.kind === 'pickup' && e.k === 'key' && e.x > G.room.px0 && e.x < G.room.px1 && e.y > G.room.py0 && e.y < G.room.py1);
    if (key.length) { const k0 = key[0]; P.x = k0.cx - P.w / 2; P.y = k0.cy - P.h / 2; P.vx = P.vy = 0; for (let i = 0; i < 90; i++) T.frame([], 1); }
    const got = !!(G.st.keys && G.st.keys.overseer);
    const door = G.ents.find((e) => e.kind === 'door' && e.lock === 'flag:boss_warden');
    let f2 = 0; for (; f2 < 60 * 20 && G.room && G.room.id === 'v_warden'; f2++) T.frame(['KeyD'], 1);         // walk to the exit like a player
    return { killed, secs, gates, used, hpLost: Math.round(hp0 - G.st.hp), flag: !!G.st.flags.boss_warden, keyDropped: key.length > 0, gotKey: got, doorOpen: door ? !!door.open : 'n/a', nextRoom: G.room && G.room.id, walkSecs: +(f2 / 60).toFixed(1), ammoLeft: G.st.ammo['10mm'] + G.st.mag.pistol10 };
  }, { maxS, dryStart: process.env.DRY === '1' });
  console.log(JSON.stringify(r)); console.log(h.logs.filter((l) => !/warning/.test(l)).slice(0, 8).join('\n'));
  await h.browser.close();
  process.exit(r.killed && r.flag && r.gotKey && r.nextRoom !== 'v_warden' ? 0 : 1);
})();
