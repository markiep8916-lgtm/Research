// Page-side kit of the human-pace tool (tools/human-pace.mjs installs it after boot; TECH_PLAN 10.2,
// G2 T-1). Exposes window.__PACE = { snap, steer, plan, targetOf, log, acc, boxes, battles,
// humanPolicy, setDelay, flag, ptalks, invalidate }.
// - acc: seconds per chapter in field-walk / field-idle / cutscene / battle / menu / transition, on the
//   virtual clock (each rendered frame = 0.1 s; the init script fakes rAF time, engine.timeScale = 2).
// - log: timeline of cutscenes (outermost `cs` / `csEnd` and every script, nested ones too, as
//   `script` start / end through cutscenes.onTrace), boxes, battle say lines, music, objectives, maps,
//   battles, toasts.
// - nav: grid BFS over the live World (walls, locked doors, closed gates, props, NPC colliders) and a
//   steering direction for the Node side, which holds the real arrow keys.
(() => {
  if (window.__PACE) return;
  const VP = window.__VP, ctx = VP.ctx, game = VP.game;
  const ex = () => game.states.explore;
  const bt = () => game.states.battle;
  const vt = () => window.__vt();
  const chap = () => (ctx.state.story && ctx.state.story.chapter) || 'prologue';
  const log = [];
  const acc = {};
  const boxes = [];
  const battles = [];
  let cmdDelay = 2.2;
  const push = (type, data) => log.push({ t: +vt().toFixed(1), ch: chap(), type, ...data });
  ctx.cutscenes.onTrace = (phase, id, depth) => push('script', { phase, id, depth });

  // ---------------------------------------------------------------- per-frame accounting
  let lastDlg = null, curBox = null, lastSay = null, lastMusic, lastCs, lastObj, lastMap, lastChapter, wasBattle = false;
  let battleRec = null, battleLog = null, staleModel = null, lastToasts = '', lastPrompt = null, lastScreen = null, lastCard = false, lastBanner = '';
  ctx.engine.onUpdate(() => {
    const dt = ctx.engine.realDt;
    const ch = chap();
    const a = (acc[ch] ||= { total: 0, walk: 0, fieldIdle: 0, cutscene: 0, battle: 0, menu: 0, transition: 0, title: 0, walkDist: 0 });
    a.total += dt;
    const e = ex();
    const inB = game.inBattle || game.name === 'battle';
    let k;
    if (game.name === 'title') k = 'title';
    else if (inB) k = 'battle';
    else if (ctx.engine.transitioning) k = 'transition';
    else if (ctx.cutscenes.active) k = 'cutscene';
    else if (ctx.ui.isBlocking()) k = 'menu';
    else k = e && e.player && e.player.moving ? 'walk' : 'fieldIdle';
    a[k] += dt;
    if (k === 'walk' && e && e.player) {
      const p = e.player;
      if (a._px != null && a._pm === e.mapId) a.walkDist += Math.hypot(p.x - a._px, p.z - a._pz);
      a._px = p.x; a._pz = p.z; a._pm = e.mapId;
    } else if (e && e.player) { a._px = e.player.x; a._pz = e.player.z; a._pm = e.mapId; }

    // battle: keep the dialog strip waiting for Confirm (the Node side reads, then presses Enter)
    const b = bt();
    if (b && b.ui && b.ui.autoAdvance) b.ui.autoAdvance = false;

    // dialog boxes
    const d = document.querySelector('.vp-dlg.is-open');
    const text = d ? (d.querySelector('.vp-dlg-text') || {}).textContent || '' : null;
    const speaker = d ? ((d.querySelector('.vp-dlg-name') || {}).textContent || '').trim() : null;
    const key = d ? `${speaker}|${text}|${d.classList.contains('has-choices')}` : null;
    if (key !== lastDlg) {
      if (curBox) { curBox.end = +vt().toFixed(1); curBox = null; }
      if (d && text) {
        curBox = { t: +vt().toFixed(1), ch, cs: ctx.cutscenes.current, speaker: d.classList.contains('has-name') ? speaker : '', text, choice: d.classList.contains('has-choices') };
        if (curBox.choice) curBox.options = [...d.querySelectorAll('.vp-dlg-choices .vp-row')].map((r) => r.textContent);
        boxes.push(curBox);
      }
      lastDlg = key;
    }
    // battle dialog strip (tips, boss lines)
    const say = document.querySelector('.vb-say.is-on');
    const sayWho = say ? ((say.querySelector('.who') || {}).textContent || '') : '';
    const sayText = say ? ((say.querySelector('.txt') || {}).textContent || say.textContent) : null;
    if (sayText !== lastSay) {
      if (sayText) {
        const prev = boxes[boxes.length - 1];
        if (prev && prev.battle && prev.speaker === sayWho && lastSay && sayText.startsWith(lastSay)) prev.text = sayText;
        else boxes.push({ t: +vt().toFixed(1), ch, cs: 'battle:' + (b && b._model ? b._model.encounter.id : '?'), speaker: sayWho, text: sayText, battle: true });
      }
      lastSay = sayText;
    }
    const music = ctx.audio.track;
    if (music !== lastMusic) { push('music', { track: music, map: e && e.mapId, area: e && e.area && e.area.id, battle: inB, cs: ctx.cutscenes.current }); lastMusic = music; }
    const cs = ctx.cutscenes.current;
    if (cs !== lastCs) { push(cs ? 'cs' : 'csEnd', { id: cs || lastCs }); lastCs = cs; }
    const obj = ctx.state.story.objective;
    if (obj !== lastObj) { push('objective', { id: obj, text: obj && ctx.content.objectives[obj] ? ctx.content.objectives[obj].text : null }); lastObj = obj; }
    const map = e && e.mapId;
    if (map !== lastMap) { push('map', { id: map }); lastMap = map; }
    if (ch !== lastChapter) { push('chapter', { id: ch }); lastChapter = ch; }
    const toasts = [...document.querySelectorAll('.vp-toast')].map((t) => t.textContent).join(' | ');
    if (toasts !== lastToasts) { if (toasts) push('toast', { text: toasts }); lastToasts = toasts; }
    const prompt = document.querySelector('.vp-prompt.is-on .vp-prompt-t')?.textContent || null;
    if (prompt !== lastPrompt) { lastPrompt = prompt; }
    const scr = ctx.ui.screens.isOpen && ctx.ui.screens.current ? ctx.ui.screens.current.getAttribute('aria-label') : null;
    if (scr !== lastScreen) { if (scr) push('screen', { id: scr }); lastScreen = scr; }
    const card = !!ctx.ui.cards.isBlocking;
    if (card !== lastCard) { if (card) push('card', { text: (document.querySelector('.vp-chap-title') || {}).textContent || '' }); lastCard = card; }
    const ban = [...document.querySelectorAll('.vp-loc.is-on, .vp-banner.is-on')].map((x) => x.textContent).join(' | ');
    if (ban !== lastBanner) { if (ban) push('banner', { text: ban }); lastBanner = ban; }

    // battles: the game is in battle from startBattle on, but its model only exists after the
    // transition midpoint, so the encounter is read once the battle state holds a new model
    if (inB && !wasBattle) {
      staleModel = b && b._model;
      battleRec = {
        t0: vt(), ch, enc: null, boss: false, map: e && e.mapId, area: e && e.area && e.area.id,
        party: ctx.state.party.map((p) => ({ id: p.id, lv: p.level, xp: p.xp, skills: p.skills.length })), credits: ctx.state.credits,
        cmds: 0, events: {},
      };
      push('battle', { enc: null });
      battleLog = log[log.length - 1];
    }
    if (inB && b && b._model && battleRec && b._model !== staleModel) {
      if (!battleRec.enc) {
        battleRec.enc = battleLog.enc = b._model.encounter.id;
        battleRec.boss = !!b._model.encounter.boss;
      }
      battleRec.rounds = b._model.round; battleRec.result = b._model.result || battleRec.result;
    }
    if (!inB && wasBattle && battleRec) {
      battleRec.dur = +(vt() - battleRec.t0).toFixed(1);
      battleRec.after = ctx.state.party.map((p) => ({ id: p.id, lv: p.level, xp: p.xp, skills: p.skills.slice() }));
      battleRec.creditsGained = ctx.state.credits - battleRec.credits;
      battles.push(battleRec);
      push('battleEnd', { enc: battleRec.enc, dur: battleRec.dur, rounds: battleRec.rounds, result: battleRec.result, cmds: battleRec.cmds, lv: battleRec.after.map((p) => p.id + p.lv).join(' ') });
      battleRec = null;
    }
    wasBattle = inB;
  });

  // battle events (Break, Boost, telegraphs, ultimates) per battle
  const prevOnEvent = game.onBattleEvent;
  game.onBattleEvent = (ev) => {
    if (prevOnEvent) prevOnEvent(ev);
    if (battleRec) {
      const k = ev.type === 'hit' && ev.weak ? 'weakHit' : ev.type;
      battleRec.events[k] = (battleRec.events[k] || 0) + 1;
      if (ev.type === 'say' || ev.type === 'learn' || ev.type === 'transform' || ev.type === 'telegraph' || ev.type === 'cue' || ev.type === 'untargetable' || ev.type === 'break') {
        (battleRec.beats ||= []).push({ t: +(vt() - battleRec.t0).toFixed(1), type: ev.type, text: ev.text || ev.name || ev.skill || ev.id || ev.target || '' });
      }
    }
  };

  /** Wrap the autoplay policy: a first-time player thinks ~cmdDelay s before each command. */
  function humanPolicy() {
    const st = bt();
    const pol = st.autoPolicy;
    if (!pol || pol.__human) return;
    const wrapped = (m, id) => {
      if (battleRec) battleRec.cmds++;
      const t0 = vt();
      return new Promise((res) => {
        const f = () => { if (vt() - t0 >= cmdDelay) res(pol(m, id)); else requestAnimationFrame(f); };
        f();
      });
    };
    wrapped.__human = true;
    st.autoPolicy = wrapped;
  }

  // ---------------------------------------------------------------- navigation
  const NAV = { R: 4, grid: null, gridAt: -1e9, path: null, pathAt: -1e9, goalKey: '', idx: 0 };
  function cellPass(w, c, r) {
    if (c < 0 || r < 0 || c >= w.map.w || r >= w.map.h) return false;
    const i = r * w.map.w + c;
    if (w.gateAt && w.gateAt[i] >= 0 && w.gates[w.gateAt[i]] && !w.gates[w.gateAt[i]].open) return false;
    const k = w.kind[i];
    if (k === 1) return true;
    if (k === 2) { const dd = w.doors[w.doorAt[i]]; return !!dd && !dd.locked; }
    if (k === 4) { const wt = w.waters && w.waters[w.waterAt[i]]; return !!(wt && wt.drained); }
    return false;
  }
  function buildGrid() {
    const e = ex(), w = e.world, R = NAV.R, W = w.map.w * R, H = w.map.h * R;
    const pr = (e.player.radius || 0.3) + 0.06;
    const ok = new Uint8Array(w.map.w * w.map.h);
    for (let r = 0; r < w.map.h; r++) for (let c = 0; c < w.map.w; c++) ok[r * w.map.w + c] = cellPass(w, c, r) ? 1 : 0;
    const free = new Uint8Array(W * H);
    const boxesC = (w.boxes || []).filter((b) => b.enabled !== false);
    const circ = (w.circles || []).filter((c) => c.enabled !== false);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const x = (i + 0.5) / R, z = (j + 0.5) / R;
        let good = true;
        const c0 = Math.floor(x - pr), c1 = Math.floor(x + pr), r0 = Math.floor(z - pr), r1 = Math.floor(z + pr);
        for (let rr = r0; rr <= r1 && good; rr++) {
          for (let cc = c0; cc <= c1 && good; cc++) {
            const pass = cc >= 0 && rr >= 0 && cc < w.map.w && rr < w.map.h && ok[rr * w.map.w + cc];
            if (!pass) {
              const qx = Math.max(cc, Math.min(x, cc + 1)), qz = Math.max(rr, Math.min(z, rr + 1));
              if ((qx - x) ** 2 + (qz - z) ** 2 < pr * pr) good = false;
            }
          }
        }
        if (good) for (const b of boxesC) { const qx = Math.max(b.x0, Math.min(x, b.x1)), qz = Math.max(b.z0, Math.min(z, b.z1)); if ((qx - x) ** 2 + (qz - z) ** 2 < pr * pr) { good = false; break; } }
        if (good) for (const c of circ) { if ((c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + pr) ** 2) { good = false; break; } }
        free[j * W + i] = good ? 1 : 0;
      }
    }
    NAV.grid = { W, H, R, free, map: e.mapId };
    NAV.gridAt = vt();
  }
  const freeAt = (x, z) => {
    const g = NAV.grid; const i = Math.floor(x * g.R), j = Math.floor(z * g.R);
    return i >= 0 && j >= 0 && i < g.W && j < g.H && g.free[j * g.W + i] === 1;
  };
  function los(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az); const n = Math.max(1, Math.ceil(d / 0.12));
    for (let k = 1; k <= n; k++) { const t = k / n; if (!freeAt(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
    return true;
  }
  /** goal: { x, z, tol } point, or { shape: { box } | { x, z, r }, reach } */
  function goalTest(goal) {
    if (goal.shape) {
      const s = goal.shape, reach = goal.reach;
      return (x, z) => {
        let d;
        if (s.box) { const qx = Math.max(s.box[0], Math.min(x, s.box[2])), qz = Math.max(s.box[1], Math.min(z, s.box[3])); d = Math.hypot(qx - x, qz - z); }
        else d = Math.max(0, Math.hypot(s.x - x, s.z - z) - (s.r || 0));
        return d <= reach;
      };
    }
    return (x, z) => Math.hypot(goal.x - x, goal.z - z) <= (goal.tol || 0.5);
  }
  function plan(goal) {
    const e = ex(); const p = e.player;
    if (!NAV.grid || NAV.grid.map !== e.mapId || vt() - NAV.gridAt > 4) buildGrid();
    const g = NAV.grid; const { W, H, R } = g;
    const test = goalTest(goal);
    let si = Math.floor(p.x * R), sj = Math.floor(p.z * R);
    if (!(si >= 0 && sj >= 0 && si < W && sj < H && g.free[sj * W + si])) {
      let best = null;
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
        const i = si + di, j = sj + dj;
        if (i >= 0 && j >= 0 && i < W && j < H && g.free[j * W + i]) { const dd = di * di + dj * dj; if (!best || dd < best[0]) best = [dd, i, j]; }
      }
      if (best) { si = best[1]; sj = best[2]; }
    }
    const prev = new Int32Array(W * H).fill(-1);
    const q = new Int32Array(W * H);
    let qh = 0, qt = 0; const s0 = sj * W + si;
    prev[s0] = s0; q[qt++] = s0;
    let found = -1;
    const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (qh < qt) {
      const cur = q[qh++]; const ci = cur % W, cj = (cur - ci) / W;
      if (test((ci + 0.5) / R, (cj + 0.5) / R)) { found = cur; break; }
      for (const [di, dj] of N8) {
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const n = nj * W + ni;
        if (prev[n] !== -1 || !g.free[n]) continue;
        if (di && dj && (!g.free[cj * W + ni] || !g.free[nj * W + ci])) continue;
        prev[n] = cur; q[qt++] = n;
      }
    }
    if (found < 0) return null;
    const path = [];
    for (let c = found; ; c = prev[c]) { const ci = c % W; path.push([(ci + 0.5) / R, ((c - ci) / W + 0.5) / R]); if (c === s0) break; }
    path.reverse();
    return path;
  }
  /** One steering step toward goal: { dx, dz, arrived, remaining, nopath }. */
  function steer(goal, { replan = false } = {}) {
    const e = ex();
    if (!e || !e.world || !e.player) return { nopath: true };
    const p = e.player;
    const key = JSON.stringify(goal) + '|' + e.mapId;
    const test = goalTest(goal);
    if (test(p.x, p.z)) return { arrived: true, dx: 0, dz: 0, remaining: 0 };
    if (replan) NAV.gridAt = -1e9;
    if (replan || key !== NAV.goalKey || !NAV.path || vt() - NAV.pathAt > 1.5) {
      NAV.path = plan(goal); NAV.pathAt = vt(); NAV.goalKey = key; NAV.idx = 0;
      if (!NAV.path) return { nopath: true };
    }
    const path = NAV.path;
    // closest node ahead
    let bi = NAV.idx, bd = Infinity;
    for (let k = NAV.idx; k < Math.min(path.length, NAV.idx + 40); k++) { const d = Math.hypot(path[k][0] - p.x, path[k][1] - p.z); if (d < bd) { bd = d; bi = k; } }
    NAV.idx = bi;
    let look = path[Math.min(path.length - 1, bi + 1)];
    for (let k = bi + 1; k < Math.min(path.length, bi + 16); k++) { if (los(p.x, p.z, path[k][0], path[k][1])) look = path[k]; else break; }
    const dx = look[0] - p.x, dz = look[1] - p.z; const n = Math.hypot(dx, dz) || 1;
    return { dx: dx / n, dz: dz / n, remaining: (path.length - bi) / NAV.R, arrived: false };
  }

  // ---------------------------------------------------------------- targets
  function targetOf(id) {
    const e = ex(); const w = e.world;
    const it = w.interactable(id);
    if (!it) return null;
    const npc = w.npc(id);
    if (it.kind === 'npc' && npc) return { shape: { x: npc.x, z: npc.z, r: 0.35 }, reach: 1.05, kind: it.kind, enabled: it.enabled !== false, cx: npc.x, cz: npc.z };
    if (it.box) return { shape: { box: it.box }, reach: Math.max(0.5, (it.reach || 1.3) - 0.45), kind: it.kind, enabled: it.enabled !== false, cx: (it.box[0] + it.box[2]) / 2, cz: (it.box[1] + it.box[3]) / 2 };
    return { shape: { x: it.x, z: it.z, r: it.r || 0 }, reach: Math.max(0.5, (it.reach || 1.3) - 0.45), kind: it.kind, enabled: it.enabled !== false, cx: it.x, cz: it.z };
  }

  function snap() {
    const e = ex(); const b = bt();
    const d = document.querySelector('.vp-dlg.is-open');
    const say = document.querySelector('.vb-say.is-on');
    const rows = d ? [...d.querySelectorAll('.vp-dlg-choices .vp-row')] : [];
    const p = e && e.player;
    const res = b && b.ui && b.ui.results;
    return {
      vt: +vt().toFixed(2), state: game.name, inBattle: !!game.inBattle, map: e ? e.mapId : null,
      x: p ? +p.x.toFixed(2) : null, z: p ? +p.z.toFixed(2) : null, facing: p ? p.facing : null, moving: !!(p && p.moving),
      cs: ctx.cutscenes.current, csActive: !!ctx.cutscenes.active, trans: !!ctx.engine.transitioning,
      blocking: ctx.ui.isBlocking(), free: game.name === 'explore' && !game.inBattle && !!e && !!e.world && !e._blocked(),
      dlg: d ? {
        waiting: d.classList.contains('is-waiting'), choice: d.classList.contains('has-choices'),
        text: (d.querySelector('.vp-dlg-text') || {}).textContent || '', speaker: ((d.querySelector('.vp-dlg-name') || {}).textContent || '').trim(),
        rows: rows.map((r) => r.textContent), sel: rows.findIndex((r) => r.classList.contains('is-sel')),
      } : null,
      say: say ? { done: say.classList.contains('is-done'), text: say.textContent } : null,
      results: !!(res && res.ready), resultsUp: !!res,
      screen: ctx.ui.screens.isOpen && ctx.ui.screens.current ? ctx.ui.screens.current.getAttribute('aria-label') : null,
      screenRows: ctx.ui.screens.isOpen ? [...document.querySelectorAll('.vp-scr.is-on .vp-row')].map((r) => r.textContent + (r.classList.contains('is-sel') ? '*' : '')) : null,
      card: !!ctx.ui.cards.isBlocking, menu: !!ctx.ui.menu.isOpen, shop: !!ctx.ui.shop.isOpen, equip: !!(ctx.ui.equipBox && ctx.ui.equipBox.isOpen), star: !!ctx.ui.starchart.isOpen, saves: !!ctx.ui.saves.isOpen,
      title: ctx.ui.title.isOpen ? ctx.ui.title.phase : null,
      prompt: document.querySelector('.vp-prompt.is-on .vp-prompt-t')?.textContent || null,
      target: e && e._target ? e._target.id : null,
      objective: ctx.state.story.objective, chapter: ctx.state.story.chapter, leader: ctx.state.leader,
      party: ctx.state.party.map((m) => `${m.id}:${m.level}:${m.hp}/${m.maxHp}`),
      battleRound: b && b._model && game.name === 'battle' ? b._model.round : null,
    };
  }

  window.__PACE = {
    snap, steer, plan, targetOf, log, acc, boxes, battles, humanPolicy,
    setDelay: (s) => { cmdDelay = s; },
    flag: (f) => !!ctx.state.flags[f],
    ptalks: () => (ex() && ex()._partyTalks ? ex()._partyTalks().map(([id, pt]) => id + ':' + pt.title) : []),
    invalidate: () => { NAV.gridAt = -1e9; NAV.path = null; },
  };
})();
