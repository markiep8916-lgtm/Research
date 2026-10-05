// Boot: wire the page, run the fixed-step loop.

(function boot() {
  const view = document.getElementById('screen');
  Screen.init(view);
  Input.init(view);
  const pad = document.getElementById('pad');
  if (pad) Input.bindTouch(pad);

  const markTouch = () => {
    if (!document.body.classList.contains('touch')) { document.body.classList.add('touch'); Screen.fit(); }
  };
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) markTouch();
  window.addEventListener('touchstart', markTouch, { passive: true, once: true });

  // first interaction unlocks audio
  const unlock = () => { Sound.unlock(); if (Game.state === 'boot') Game.setState('title'); if (Sound.ok() && !Sound.timer && Sound.songName) Sound.playSong(Sound.songName, true); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  view.addEventListener('pointerdown', () => view.focus({ preventScroll: true }));

  const soundBtn = document.getElementById('btn-sound');
  const syncSound = () => { if (soundBtn) { soundBtn.textContent = Sound.muted ? 'Sound off' : 'Sound on'; soundBtn.setAttribute('aria-pressed', String(!Sound.muted)); } };
  syncSound();
  if (soundBtn) soundBtn.addEventListener('click', () => { Sound.unlock(); Sound.toggleMute(); syncSound(); view.focus({ preventScroll: true }); });
  window.addEventListener('keydown', e => { if (e.code === 'KeyM') { Sound.unlock(); Sound.toggleMute(); syncSound(); } });

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
      view.focus({ preventScroll: true });
    });
  }

  Game.setState('boot');
  Sound.songName = 'title';

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
      Game.newGame();
      if (stage) Game.startStage(stage);
      Game.setState('play');
      if (wave) {
        const w = Game.stage.waves[wave];
        Game.waveIdx = wave; Game.cam.x = w.at; Game.player.x = w.at + 80;
      }
      return Game.state;
    },
    // Arena with the given enemy types in the current stage.
    sandbox(types, stage = 0) {
      this.play(stage);
      Game.stage = Object.assign({}, Game.stage, { waves: [] });
      Game.ents = Game.ents.filter(e => e.team === 'player');
      Game.cam.lock = Game.cam.x;
      return types.map((t, i) => Game.spawn({ type: t, side: 'in', x: 220 + (i % 3) * 40, y: Game.bounds.yMin + 10 + (i * 23) % 60 }).id);
    },
  };
})();
