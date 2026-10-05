// Boot: wire the page, run the fixed-step loop.

// Plain arena used by the test tools when a stage module is missing.
const TEST_ARENA = {
  title: 'TEST ARENA', sub: 'SANDBOX', len: 1200, yMin: 134, yMax: 200, music: null,
  drawBg(ctx, camX) {
    Px.use(ctx);
    Px.rect(0, 0, W, 134, '#3a2a30'); Px.rect(0, 70, W, 64, '#4a3a36');
    for (let x = -(camX % 48); x < W; x += 48) Px.rect(x, 70, 1, 64, '#2a1e20');
    Px.rect(0, 134, W, 82, '#3e3530');
    for (let x = -(camX % 48); x < W; x += 48) Px.rect(x, 168, 16, 2, '#8a7a5a');
  },
  waves: [],
};

(function boot() {
  // Web fonts for the page chrome only (the game draws its own bitmap font). Inserted from
  // script so a slow or blocked font host never holds up the game.
  try {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Rubik+Dirt&family=Share+Tech+Mono&display=swap';
    document.head.appendChild(l);
  } catch (e) { /* fallback font stacks are fine */ }
  const view = document.getElementById('screen');
  Screen.init(view);
  Input.init(view);
  const pad = document.getElementById('pad');
  if (pad) Input.bindTouch(pad);

  const markTouch = () => {
    Input.lastDevice = 'touch';
    if (!document.body.classList.contains('touch')) { document.body.classList.add('touch'); Screen.fit(); }
  };
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) markTouch();
  window.addEventListener('touchstart', markTouch, { passive: true });

  // first interaction unlocks audio (Sound.unlock starts the pending song when it creates the context)
  const unlock = () => { Sound.unlock(); if (Game.state === 'boot') Game.toTitle(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  // A tap or click on the screen in the menus acts as one press of attack (confirm / next page).
  // Boot is left to the unlock listener above, which runs after this one.
  view.addEventListener('pointerdown', () => {
    view.focus({ preventScroll: true, focusVisible: false });
    if (['title', 'story', 'continue', 'gameover', 'results'].includes(Game.state)) Input.tap = true;
  });
  // Leaving the page mid-fight pauses instead of letting enemies beat on a hero with dead controls.
  const autoPause = () => { if (Game.state === 'play' && !(window.__wb && window.__wb.manual)) Game.pause(true); };
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

  const soundBtn = document.getElementById('btn-sound');
  const syncSound = () => { if (soundBtn) { soundBtn.textContent = Sound.muted ? 'Sound off' : 'Sound on'; soundBtn.setAttribute('aria-pressed', String(!Sound.muted)); } };
  syncSound();
  if (soundBtn) soundBtn.addEventListener('click', () => { Sound.unlock(); Sound.toggleMute(); syncSound(); view.focus({ preventScroll: true, focusVisible: false }); });
  window.addEventListener('keydown', e => { if (e.code === 'KeyM' && !e.repeat) { Sound.unlock(); Sound.toggleMute(); syncSound(); } });

  const fullBtn = document.getElementById('btn-full');
  if (fullBtn) {
    const canFull = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    if (!canFull) fullBtn.hidden = true;
    fullBtn.addEventListener('click', () => {
      const el = document.querySelector('.app');
      try {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } catch (err) { /* fullscreen not allowed here */ }
      view.focus({ preventScroll: true, focusVisible: false });
    });
  }

  Game.setState('boot');
  Game.hiscore = HiScores.top();
  Sound.songName = 'title';

  // Artifact viewer hot updates: keep the run (stage, score, lives) across a republish.
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    try {
      hot.snapshot(() => {
        const G = Game, p = G.player;
        if (!p || !['play', 'pause', 'stageintro', 'clear', 'continue'].includes(G.state)) return { diff: G.diffKey };
        return { diff: G.diffKey, run: { stage: G.stageIndex, score: G.score, lives: Math.max(1, G.lives), credits: G.credits, rage: G.rage, hp: Math.max(30, Math.round(p.hp)), stats: G.stats } };
      });
    } catch (e) { /* hot updates unavailable */ }
  }
  const resume = data => {
    if (!data || !data.run || !STAGES[data.run.stage]) return;
    const r = data.run;
    if (data.diff && DIFFS[data.diff]) Game.diffKey = data.diff;
    Game.newGame();
    Object.assign(Game, { score: r.score, shownScore: r.score, lives: r.lives, credits: r.credits, rage: r.rage, stats: r.stats || Game.stats });
    Game.startStage(r.stage);
    Game.player.hp = r.hp;
  };
  try { if (hot && hot.ready) hot.ready(resume); else if (hot && hot.data) resume(hot.data); } catch (e) { console.warn("hot resume failed", e); }

  let acc = 0, last = performance.now();
  function frame(now) {
    if (window.__wb && window.__wb.manual) { last = now; requestAnimationFrame(frame); return; }
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      Game.update();
      acc -= STEP;
      steps++;
    }
    if (steps === 5) acc = 0;
    Game.draw();
    Screen.present();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Test hook: lets automated playtests drive the simulation deterministically.
  window.__wb = {
    Game, Input, FX, Sound, STAGES, ENEMY_TYPES,
    manual: false,
    step(n = 1) { for (let i = 0; i < n; i++) Game.update(); Game.draw(); Screen.present(); },
    // Hold the given actions for n frames (then release), stepping the simulation.
    input(actions, n = 1, release = true) {
      const list = Array.isArray(actions) ? actions : [actions];
      for (const a of list) Input.key[a] = true;
      this.step(n);
      if (release) { for (const a of list) Input.key[a] = false; }
    },
    tap(a, gap = 1) { this.input(a, 1); this.step(gap); },
    snapshot() {
      const G = Game, p = G.player;
      return { state: G.state, stage: G.stageIndex, wave: G.waveIdx, camX: Math.round(G.cam.x), lock: G.cam.lock,
        hp: p && Math.round(p.hp), grey: p && Math.round(p.grey), pstate: p && p.state, px: p && Math.round(p.x), py: p && Math.round(p.y), pz: p && Math.round(p.z),
        rage: Math.round(G.rage), score: G.score, combo: p && p.comboHits, lives: G.lives,
        foes: G.foes().map(e => ({ type: e.type, hp: Math.round(e.hp), state: e.state, x: Math.round(e.x), y: Math.round(e.y), z: Math.round(e.z) })),
        ents: G.ents.length };
    },
    // Jump straight into a stage (optionally at a wave index) for testing.
    play(stage = 0, wave = 0) {
      Sound.unlock();
      if (!STAGES[stage]) STAGES[stage] = TEST_ARENA;
      Game.newGame();
      if (stage) Game.startStage(stage);
      Game.setState('play');
      if (wave) {
        const w = Game.stage.waves[wave];
        Game.waveIdx = wave; Game.cam.x = w.at; Game.player.x = w.at + 80;
      }
      return Game.state;
    },
    // Arena with the given enemy types in the given stage (or a plain test arena if it doesn't exist yet).
    sandbox(types, stage = 0) {
      if (!STAGES[stage]) STAGES[stage] = TEST_ARENA;
      this.play(stage);
      Game.stage = Object.assign({}, Game.stage, { waves: [] });
      Game.ents = Game.ents.filter(e => e.team === 'player');
      Game.cam.lock = Game.cam.x;
      return types.map((t, i) => Game.spawn({ type: t, side: 'in', x: 220 + (i % 3) * 40, y: Game.bounds.yMin + 10 + (i * 23) % 60 }).id);
    },
  };
})();
