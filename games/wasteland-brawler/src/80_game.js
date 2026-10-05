// Game: state machine, world simulation, camera and waves, screens.

const STAGES = [];          // filled by the stage modules
const STORY = { intro: [], between: [], ending: [] };

const DIFFS = {
  easy:   { name: 'EASY',   tokens: 1, dmg: 0.7, hp: 1.0, tele: 4,  credits: 99 },
  normal: { name: 'NORMAL', tokens: 2, dmg: 1.0, hp: 1.0, tele: 0,  credits: 3 },
  hard:   { name: 'HARD',   tokens: 3, dmg: 1.3, hp: 1.2, tele: -2, credits: 3 },
};

const Game = {
  state: 'boot', t: 0, frame: 0,
  hitstop: 0, superFreeze: 0, superText: '',
  slow: 0, slowScale: 1, slowAcc: 0,
  cam: { x: 0, lock: null },
  ents: [], player: null,
  stage: null, stageIndex: 0,
  bounds: { xMin: 0, xMax: 0, yMin: 124, yMax: 196, walls: false },
  score: 0, shownScore: 0, hiscore: Store.get('hiscore', 30000), lives: 3, credits: 3,
  rage: 0, rageReadyShown: false,
  waveIdx: 0, wave: null, waveSpawned: 0, waveT: 0,
  goT: 0, foe: null, foeT: 0, bossRef: null,
  fade: 0, fadeDir: 0, fadeCb: null,
  card: null,
  menuSel: 0, diffKey: Store.get('diff', 'normal'),
  playerGone: false,
  portraitHit: 0,
  stats: { kills: 0, time: 0 },
  letterbox: 0, letterboxTarget: 0,

  init() { this.setState('title'); },
  get diff() { return DIFFS[this.diffKey] || DIFFS.normal; },
  setState(s) { this.state = s; this.t = 0; },
  add(e) { this.ents.push(e); return e; },
  foes() { return this.ents.filter(e => e.team === 'enemy' && !e.remove); },
  livingFoes() { return this.ents.filter(e => e.team === 'enemy' && !e.remove && !e.dying && !e.ignoreForWave); },
  maxAttackers() { return this.diff.tokens + (this.stageIndex === 2 && this.diffKey !== 'easy' ? 1 : 0); },
  addScore(n) {
    const before = this.score;
    this.score += Math.round(n);
    for (const mark of [50000, 150000, 300000]) {
      if (before < mark && this.score >= mark) {
        this.lives++;
        Sound.sfx('oneUp');
        if (this.player) FX.text(this.player.x, this.player.y, 56, '1UP!', '#7fe07a', 70);
      }
    }
    if (this.score > this.hiscore) this.hiscore = this.score;
  },
  addRage(n) {
    const was = this.rage;
    this.rage = Math.min(100, this.rage + n);
    if (was < 100 && this.rage >= 100 && this.player) {
      FX.text(this.player.x, this.player.y, 58, 'OVERDRIVE READY', '#ffe066', 70);
      Sound.sfx('chime');
    }
  },
  slowmo(frames, scale) { if (frames > this.slow || scale < this.slowScale) { this.slow = frames; this.slowScale = scale; } },
  comboPitch() { const c = this.player ? this.player.comboHits : 0; return Math.pow(2, Math.min(c, 14) / 24); },
  isWaveFinalKill(e) {
    if (!this.wave || this.waveSpawned < this.wave.spawns.length) return false;
    return this.livingFoes().filter(f => f !== e).length === 0;
  },
  showFoe(e) { if (!e.boss) { this.foe = e; this.foeT = 120; } },
  itemUnder(pl) {
    return this.ents.find(e => e.team === 'item' && !e.remove && e.z < 2 && Math.abs(e.x - pl.x) < 12 && Math.abs(e.y - pl.y) < 7);
  },
  // Explosion that hurts everyone in range. opts: { r, depth, dmg, pdmg, palette }
  explode(x, y, src, opts = {}) {
    const r = opts.r || 36, depth = opts.depth || 16;
    FX.explosion(x, y, 8, r / 36, opts.palette);
    Sound.sfx('explode', x);
    let kos = 0;
    for (const v of this.ents.filter(e => (e.team === 'enemy' || e.team === 'player') && e.vulnerable)) {
      if (Math.abs(v.x - x) < r + v.w && Math.abs(v.y - y) < depth) {
        const before = v.dying;
        const dmg = v.team === 'player' ? (opts.pdmg != null ? opts.pdmg : 20) : (opts.dmg || 20);
        v.takeHit(v.team === 'player' ? { x, team: 'hazard' } : (src && src.team === 'player' ? src : this.player), { dmg, tier: 4, knock: true, kx: 3.2, kz: 4.0, zr: [0, 80], sfx: 'hitHeavy', burn: opts.burn != null ? opts.burn : 30 }, v.x < x ? -1 : 1);
        if (!before && v.dying && v.team === 'enemy') kos++;
      }
    }
    for (const b of this.ents.filter(e => e.team === 'prop' && !e.remove)) {
      if (Math.abs(b.x - x) < r && Math.abs(b.y - y) < depth) {
        if (b.kind === 'fuel') { if (!b.fuse) { b.fuse = 22; b.igniter = src; } }
        else b.smash(src);
      }
    }
    if (this.stage && this.stage.onExplosion) this.stage.onExplosion(this, x, y);
    return kos;
  },

  // ---------- run lifecycle ----------
  newGame() {
    seedRng(0xC0FFEE);
    this.score = 0; this.shownScore = 0; this.lives = 3; this.credits = this.diff.credits; this.rage = 0;
    this.stats = { kills: 0, time: 0 };
    this.player = null;
    this.startStage(0);
  },
  startStage(i) {
    this.stageIndex = i;
    const st = this.stage = STAGES[i];
    this.ents = [];
    FX.reset();
    timers.length = 0;
    this.cam = { x: st.camStart || 0, lock: null };
    this.bounds = { xMin: 8, xMax: st.len - 8, yMin: st.yMin, yMax: st.yMax, walls: false };
    const prev = this.player;
    this.player = this.add(new Player((st.camStart || 0) + 50, (st.yMin + st.yMax) / 2 + 6));
    if (prev) { this.player.hp = Math.max(prev.hp, 60); this.player.bestCombo = prev.bestCombo; this.player.damageTaken = prev.damageTaken; }
    this.waveIdx = 0; this.wave = null; this.goT = 0; this.foe = null; this.bossRef = null;
    this.playerGone = false;
    this.hitstop = 0; this.slow = 0; this.superFreeze = 0;
    for (const pr of st.props || []) this.add(new Breakable(pr.kind, pr.x, pr.y, pr.drop));
    for (const it of st.items || []) this.add(new Item(it.kind, it.x, it.y));
    if (st.setup) st.setup(this);
    this.card = { title: 'STAGE ' + (i + 1) + ' - ' + st.title, sub: st.sub };
    this.setState('stageintro');
    this.player.vx = 0;
    Sound.playSong(st.music);
  },
  playerDied() {
    if (this.playerGone) return;
    this.playerGone = true;
    this.lives--;
    if (this.lives > 0) setTimeoutFrames(30, () => this.respawn());
    else { this.setState('continue'); Sound.fadeOut(1.2); }
  },
  respawn() {
    const p = this.player;
    p.hp = p.maxHp; p.grey = 0; p.venom = 0; p.burn = 0;
    p.setState('jump');
    p.x = clamp(p.x, this.cam.x + 40, this.cam.x + W - 40);
    p.z = 110; p.vz = 0; p.vx = 0; p.jumpDir = 0; p.airUsed = true;
    p.inv = 120; p.blink = true;
    p.weapon = null;
    this.playerGone = false;
    this.respawnDrop = true;
    FX.flash('#ffffff', 4, 0.4);
  },
  respawnLanded() {
    this.respawnDrop = false;
    const p = this.player;
    FX.dustRing(p.x, p.y, 16);
    FX.shake(3, 12);
    Sound.sfx('thud', p.x);
    for (const e of this.livingFoes()) {
      if (Math.abs(e.x - p.x) < 80 && e.vulnerable) e.knockDown(e.x < p.x ? -1 : 1, 2.4 * e.weight, 3.0);
    }
  },
  doContinue() {
    if (this.credits < 99) this.credits--;
    this.lives = 3;
    this.rage = 50;
    this.playerGone = false;
    const p = this.player;
    p.dying = false;
    this.setState('play');
    this.respawn();
    Sound.playSong(this.stage.music, true);
  },

  // ---------- waves ----------
  updateWaves() {
    const st = this.stage, p = this.player;
    if (!this.wave) {
      const next = st.waves[this.waveIdx];
      if (next && this.cam.x >= next.at - 1) {
        this.wave = next; this.waveSpawned = 0; this.waveT = 0;
        this.cam.lock = next.at;
        this.goT = 0;
        if (next.onStart) next.onStart(this);
        if (next.music) Sound.playSong(next.music);
      }
    }
    if (this.wave) {
      const wv = this.wave;
      this.waveT++;
      while (this.waveSpawned < wv.spawns.length) {
        const s = wv.spawns[this.waveSpawned];
        if (this.waveT < (s.delay || 0)) break;
        if (s.whenBelow != null && this.livingFoes().length > s.whenBelow) break;
        if (s.cap != null && this.livingFoes().length >= s.cap) break;
        this.spawn(s);
        this.waveSpawned++;
      }
      if (wv.update) wv.update(this);
      const done = this.waveSpawned >= wv.spawns.length && this.livingFoes().length === 0 && (!wv.until || wv.until(this));
      if (done) {
        if (wv.onClear) wv.onClear(this);
        this.wave = null;
        this.waveIdx++;
        this.cam.lock = null;
        if (wv.boss) { setTimeoutFrames(wv.clearDelay || 120, () => this.stageClear()); this.bossDone = true; return; }
        if (wv.endsStage) { this.stageClear(); return; }
        if (!wv.noGo) { this.goT = 150; Sound.sfx('go'); }
      }
    }
    if (!this.wave && this.waveIdx >= st.waves.length && this.cam.x >= st.len - W - 1 && p.x > st.len - 50 && this.state === 'play' && !this.bossDone) {
      this.stageClear();
    }
  },
  // Spawn spec: { type, side: 'R'|'L'|'top'|'in'|<custom>, x (screen-relative), y, delay, variant, opts }
  spawn(s) {
    const cx = this.cam.x;
    const side = s.side || (chance(0.5) ? 'R' : 'L');
    const y = s.y != null ? s.y : rr(this.bounds.yMin + 4, this.bounds.yMax - 4);
    let x;
    if (side === 'R') x = cx + W + 18 + rr(0, 16);
    else if (side === 'L') x = cx - 18 - rr(0, 16);
    else x = cx + (s.x != null ? s.x : rr(60, W - 60));
    const e = new Enemy(s.type, x, y, Object.assign({ variant: s.variant || 0, enter: side }, s.opts || {}));
    e.facing = side === 'L' ? 1 : side === 'R' ? -1 : (this.player.x > x ? 1 : -1);
    if (side === 'L' || side === 'R') e.setState('enter');
    else if (side === 'top') { e.z = 120; e.vz = 0; e.setState('drop'); }
    else if (e.def.enterStyles && e.def.enterStyles[side]) e.def.enterStyles[side].call(e, s);
    if (e.boss) this.bossRef = e;
    this.add(e);
    if (s.onSpawn) s.onSpawn(e, this);
    return e;
  },
  stageClear() {
    if (this.state !== 'play') return;
    this.bossDone = false;
    this.setState('clear');
    Sound.playSong('fanfare');
    this.clearBonus = { hp: Math.round(this.player.hp) * 30, stage: (this.stageIndex + 1) * 5000 };
  },

  // ---------- simulation ----------
  update() {
    this.frame++;
    this.t++;
    Input.update();
    if (this.portraitHit > 0) this.portraitHit--;
    if (this.shownScore < this.score) this.shownScore = Math.min(this.score, this.shownScore + Math.max(1, Math.ceil((this.score - this.shownScore) / 8)));
    else this.shownScore = this.score;
    const fn = this['upd_' + this.state];
    if (fn) fn.call(this);
    this.letterbox = approach(this.letterbox, this.letterboxTarget, 1.2);
    if (this.fadeDir) {
      this.fade = clamp(this.fade + this.fadeDir * 0.06, 0, 1);
      if (this.fade >= 1 && this.fadeDir > 0) { this.fadeDir = 0; const cb = this.fadeCb; this.fadeCb = null; cb && cb(); }
      else if (this.fade <= 0 && this.fadeDir < 0) this.fadeDir = 0;
    }
  },
  transition(cb) { if (this.fadeDir) return; this.fadeDir = 1; this.fadeCb = () => { cb(); this.fadeDir = -1; }; },

  upd_boot() {},
  upd_title() {
    FX.update();
    if (this.t === 60) { FX.shake(4, 12); Sound.sfx('hitFinisher'); for (let i = 0; i < 12; i++) FX.add({ kind: 'spark', x: W / 2, y: 80, z: 0, vx: rr(-4, 4), vz: rr(-1, 4), life: 14, g: 0.1, drag: 0.9 }); }
    if (this.fadeDir) return;
    if (this.t < 20) return;
    if (this.t < 60 && (Input.pressed('start') || Input.pressed('attack'))) { this.t = 59; return; }
    const items = 4;
    if (Input.pressed('up')) { this.menuSel = (this.menuSel + items - 1) % items; Sound.sfx('menu'); }
    if (Input.pressed('down')) { this.menuSel = (this.menuSel + 1) % items; Sound.sfx('menu'); }
    const lr = Input.pressed('left') ? -1 : Input.pressed('right') ? 1 : 0;
    const go = Input.pressed('start') || Input.pressed('attack') || Input.pressed('jump');
    if (this.menuSel === 1 && (lr || go)) {
      const keys = Object.keys(DIFFS);
      const i = (keys.indexOf(this.diffKey) + (lr || 1) + keys.length) % keys.length;
      this.diffKey = keys[i]; Store.set('diff', this.diffKey); Sound.sfx('menu');
      return;
    }
    if (this.menuSel === 2 && (lr || go)) { Sound.unlock(); Sound.toggleMute(); syncSoundButton(); Sound.sfx('menu'); return; }
    if (this.menuSel === 3 && (lr || go)) { FX.reducedShake = !FX.reducedShake; Store.set('reducedShake', FX.reducedShake); Sound.sfx('menu'); return; }
    if (go) {
      Sound.unlock();
      Sound.sfx('select');
      this.transition(() => { this.storyPages = STORY.intro; this.storyIdx = 0; this.storyChar = 0; this.storyNext = () => this.newGame(); this.setState('story'); Sound.playSong('story'); });
    }
  },
  upd_story() {
    if (this.fadeDir) return;
    const pages = this.storyPages;
    const page = pages[this.storyIdx];
    const full = page ? page.text.length : 0;
    const before = Math.floor(this.storyChar);
    this.storyChar = Math.min(full, this.storyChar + 0.5);
    if (Math.floor(this.storyChar) !== before && before % 2 === 0 && this.storyChar < full) Sound.sfx('tick');
    const adv = Input.pressed('attack') || Input.pressed('jump');
    if (Input.pressed('start')) { this.transition(this.storyNext); return; }
    if (adv) {
      if (this.storyChar < full) { this.storyChar = full; return; }
      this.storyIdx++; this.storyChar = 0; this.t = 0;
      if (this.storyIdx >= pages.length) this.transition(this.storyNext);
      else Sound.sfx('menu');
    }
  },
  upd_stageintro() {
    this.simulate(false);
    const p = this.player;
    if (this.t < 40) { p.setState('walk'); p.vx = p.walkX; p.vy = 0; p.facing = 1; p.x += 0; }
    else if (p.state === 'walk') { p.setState('idle'); p.vx = 0; }
    if (this.t > 130 || (this.t > 50 && Input.anyPressed)) { this.setState('play'); p.setState('idle'); p.vx = 0; }
  },
  upd_play() {
    if (Input.pressed('start')) { this.setState('pause'); Sound.sfx('pause'); this.menuSel = 0; return; }
    // slow motion: run the simulation on a fraction of frames
    if (this.slow > 0) {
      this.slow--;
      const ease = this.slow < 12 ? lerp(1, this.slowScale, this.slow / 12) : this.slowScale;
      this.slowAcc += ease;
      if (this.slowAcc < 1) { FX.update(); return; }
      this.slowAcc -= 1;
    }
    this.simulate(true);
  },
  upd_pause() {
    if (Input.pressed('start')) { this.setState('play'); Sound.sfx('pause'); return; }
    const n = 4;
    if (Input.pressed('up')) { this.menuSel = (this.menuSel + n - 1) % n; Sound.sfx('menu'); }
    if (Input.pressed('down')) { this.menuSel = (this.menuSel + 1) % n; Sound.sfx('menu'); }
    if (Input.pressed('attack') || Input.pressed('jump')) {
      if (this.menuSel === 0) { this.setState('play'); Sound.sfx('pause'); }
      else if (this.menuSel === 1) { Sound.unlock(); Sound.toggleMute(); syncSoundButton(); }
      else if (this.menuSel === 2) { FX.reducedShake = !FX.reducedShake; Store.set('reducedShake', FX.reducedShake); Sound.sfx('menu'); }
      else { Sound.sfx('select'); Sound.fadeOut(0.6); this.transition(() => this.toTitle()); }
    }
  },
  toTitle() { this.player = null; this.ents = []; this.letterboxTarget = 0; this.letterbox = 0; this.menuSel = 0; this.setState('title'); Sound.playSong('title'); },
  upd_continue() {
    FX.update();
    if (this.credits <= 0) { if (this.t > 40) this.gameOver(); return; }
    const count = 9 - Math.floor(this.t / 60);
    if (this.t % 60 === 0 && count >= 0) Sound.sfx('thud');
    if ((Input.pressed('start') || Input.pressed('attack') || Input.pressed('jump')) && this.t > 20) { Sound.sfx('select'); this.doContinue(); return; }
    if (count < 0) this.gameOver();
  },
  gameOver() {
    this.setState('gameover');
    this.saveHi();
    Sound.playSong('gameover');
  },
  saveHi() { if (this.score >= Store.get('hiscore', 0)) Store.set('hiscore', this.hiscore); },
  upd_gameover() {
    if (this.t > 120 && (Input.pressed('start') || Input.pressed('attack') || Input.pressed('jump'))) this.transition(() => this.toTitle());
  },
  upd_clear() {
    this.simulate(false);
    const b = this.clearBonus;
    if (this.t === 100) { this.addScore(b.hp); Sound.sfx('pickup'); }
    if (this.t === 140) { this.addScore(b.stage); Sound.sfx('pickup'); }
    if (this.t > 250 && !this.fadeDir) {
      this.transition(() => {
        const next = this.stageIndex + 1;
        if (next < STAGES.length) {
          const pages = STORY.between[this.stageIndex];
          if (pages && pages.length) { this.storyPages = pages; this.storyIdx = 0; this.storyChar = 0; this.storyNext = () => this.startStage(next); this.setState('story'); Sound.playSong('story'); }
          else this.startStage(next);
        } else {
          this.saveHi();
          this.storyPages = STORY.ending; this.storyIdx = 0; this.storyChar = 0;
          this.storyNext = () => { this.setState('results'); Sound.playSong('title'); };
          this.setState('story');
          Sound.playSong('ending');
        }
      });
    }
  },
  upd_results() {
    FX.update();
    if (this.t < 120 && this.t >= 20 && (this.t - 20) % 20 === 0) Sound.sfx('tick');
    if (this.t === 130) { FX.shake(3, 10); Sound.sfx('hitFinisher'); }
    if (this.t > 200 && (Input.pressed('start') || Input.pressed('attack') || Input.pressed('jump'))) this.transition(() => this.toTitle());
  },

  // One world tick. `live` = player input and waves are active.
  simulate(live) {
    if (this.superFreeze > 0) {
      this.superFreeze--;
      FX.update();
      if (this.frame % 2 === 0) {
        const a = rr(0, TAU), r = rr(60, 140);
        FX.add({ kind: 'line', x: this.player.x + Math.cos(a) * r, y: this.player.y - 20, z: Math.sin(a) * r * 0.5, dx: -Math.cos(a) * 40, dy: -Math.sin(a) * 20, life: 6, g: 0, color: '#ffffff' });
      }
      return;
    }
    if (this.hitstop > 0) { this.hitstop--; FX.update(); for (const e of this.ents) if (e.hs > 0) e.hs--; return; }
    if (timers.length) runTimers();
    const p = this.player;
    const hittable = this.ents.filter(e => (e.team === 'enemy' || e.team === 'prop') && !e.remove);
    const lockWalls = this.cam.lock != null;
    this.bounds.walls = lockWalls;
    if (p) {
      if (p.hs > 0) p.hs--;
      else if (live) p.update(this.bounds, hittable);
      else this.autoPilot(p);
      if (this.respawnDrop && p.z <= 0 && p.state !== 'jump') this.respawnLanded();
      p.x = clamp(p.x, this.cam.x + 10, this.cam.x + W - 10);
    }
    if (live) { this.stats.time++; this.updateWaves(); }
    for (const e of this.ents) {
      if (e === p) continue;
      if (e.hs > 0) { e.hs--; continue; }
      if (e.team === 'enemy') {
        const inside = !(e.state === 'enter' || e.def.offscreenOk);
        const b = inside
          ? { xMin: this.cam.x + 6, xMax: this.cam.x + W - 6, yMin: this.bounds.yMin, yMax: this.bounds.yMax, walls: lockWalls }
          : { xMin: this.cam.x - 120, xMax: this.cam.x + W + 120, yMin: this.bounds.yMin, yMax: this.bounds.yMax, walls: false };
        e.update(b);
      } else e.update(this.bounds);
    }
    this.separate();
    for (const e of this.ents) if (e.remove && e.team === 'enemy' && !e.counted) { e.counted = true; this.stats.kills++; }
    this.ents = this.ents.filter(e => !e.remove);
    if (this.foe && (--this.foeT <= 0 || this.foe.remove)) this.foe = null;
    if (this.goT > 0) this.goT--;
    this.updateCamera(live);
    if (this.stage.update) this.stage.update(this);
    FX.update();
  },
  // Keep grounded, free-moving enemies from stacking on one another.
  separate() {
    const free = this.ents.filter(e => e.team === 'enemy' && !e.dying && e.z < 1 && (e.state === 'idle' || e.state === 'walk') && !e.def.noSeparate);
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        const a = free[i], b = free[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const minX = (a.w + b.w) * 0.9;
        if (Math.abs(dx) < minX && Math.abs(dy) < 6) {
          const push = (minX - Math.abs(dx)) * 0.08 + 0.1;
          const sx = dx === 0 ? (a.id < b.id ? 1 : -1) : sign(dx);
          a.x -= sx * push; b.x += sx * push;
          const sy = dy === 0 ? (a.id < b.id ? 1 : -1) : sign(dy);
          a.y = clamp(a.y - sy * 0.25, this.bounds.yMin, this.bounds.yMax);
          b.y = clamp(b.y + sy * 0.25, this.bounds.yMin, this.bounds.yMax);
        }
      }
    }
  },
  // Player behaviour while the game drives (intros, clears).
  autoPilot(p) {
    p.physics(this.bounds);
    if (['hurt', 'fall', 'down', 'getup'].includes(p.state)) { p.reactionStates(); if (p.state === 'getup' && p.t > 18) p.setState('idle'); return; }
    if (p.state === 'attack' && p.atkPhase() === 'done') { p.atk = null; p.setState('idle'); }
    if (p.state === 'jump' || p.state === 'land' || p.state === 'jumpsquat') { if (p.z <= 0 && p.state !== 'jumpsquat') p.setState('idle'); }
    if (p.state === 'run' || p.state === 'grab') { p.releaseHold && p.releaseHold(); p.setState('idle'); }
    if (p.state !== 'walk') { p.vx *= 0.7; p.vy = 0; }
  },
  updateCamera(live) {
    const p = this.player, st = this.stage;
    if (!p) return;
    const look = p.facing * 24;
    let target = p.x - W / 2 + look;
    const maxX = this.cam.lock != null ? this.cam.lock : st.len - W;
    target = clamp(target, this.cam.x, maxX);
    this.cam.x = Math.min(maxX, this.cam.x + Math.min(3, (target - this.cam.x) * 0.08 + (target > this.cam.x ? 0.2 : 0)));
    if (this.cam.x > target) this.cam.x = Math.max(this.cam.x, Math.min(target, this.cam.x));
    this.bounds.xMin = this.cam.x + 8;
    this.bounds.xMax = this.cam.x + W - 8;
  },

  // ---------- drawing ----------
  draw() {
    const ctx = Screen.ctx;
    Px.use(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    const fn = this['draw_' + this.state];
    if (fn) fn.call(this, ctx);
    if (this.fade > 0) {
      ctx.globalAlpha = this.fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  },
  drawWorld(ctx) {
    const st = this.stage, camX = Math.round(this.cam.x);
    ctx.save();
    ctx.translate(FX.offX(), FX.shakeY);
    st.drawBg(ctx, camX, this.frame, this);
    FX.drawDecals(ctx, camX);
    Px.use(ctx);
    for (const e of this.ents) {
      if (!e.shadowR || e.remove || e.noShadow) continue;
      const r = e.shadowR * clamp(1 - e.z / 80, 0.45, 1);
      groundShadow(ctx, e.x - camX, e.y, r, 0.35);
    }
    if (st.drawMarkers) st.drawMarkers(ctx, camX, this);
    for (const e of this.ents) if (e.drawMarker) e.drawMarker(ctx, camX);
    const order = this.ents.slice().sort((a, b) => a.sortY() - b.sortY() || (a.team === 'player' ? 1 : b.team === 'player' ? -1 : 0));
    for (const e of order) e.draw(ctx, camX);
    FX.draw(ctx, camX);
    if (st.drawFg) st.drawFg(ctx, camX, this.frame, this);
    ctx.restore();
    if (this.superFreeze > 0) {
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(FX.offX(), FX.shakeY);
      FX.draw(ctx, camX);
      this.player.draw(ctx, camX);
      ctx.restore();
      const k = clamp((24 - this.superFreeze) / 6, 0, 1);
      drawText(ctx, this.superText, W / 2, 70, '#ffe066', Math.round(lerp(4, 2, k)), 'center');
    }
    FX.drawOverlay(ctx);
    if (this.letterbox > 0) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, Math.round(this.letterbox));
      ctx.fillRect(0, H - Math.round(this.letterbox), W, Math.round(this.letterbox));
    }
  },
  draw_boot(ctx) {
    ctx.fillStyle = '#0e0a08'; ctx.fillRect(0, 0, W, H);
    drawText(ctx, (Input.lastDevice === 'touch' ? 'TAP' : 'CLICK OR PRESS ANY KEY'), W / 2, H / 2 - 3, '#e9d9bf', 1, 'center');
  },
  draw_title(ctx) { drawTitleScreen(ctx, this); },
  draw_story(ctx) { drawStoryScreen(ctx, this.storyPages[this.storyIdx], this.storyChar, this); },
  draw_results(ctx) { drawResults(ctx, this); },
  draw_stageintro(ctx) { this.drawWorld(ctx); drawHUD(ctx, this); drawStageCard(ctx, this.card, this.t); },
  draw_play(ctx) { this.drawWorld(ctx); drawHUD(ctx, this); },
  draw_pause(ctx) {
    this.drawWorld(ctx); drawHUD(ctx, this);
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    drawText(ctx, 'PAUSED', W / 2, 56, '#ffe066', 3, 'center');
    const opts = ['RESUME', 'SOUND: ' + (Sound.muted ? 'OFF' : 'ON'), 'SCREEN SHAKE: ' + (FX.reducedShake ? 'LOW' : 'FULL'), 'QUIT TO TITLE'];
    opts.forEach((o, i) => drawText(ctx, (this.menuSel === i ? '> ' : '  ') + o, W / 2 - 64, 100 + i * 14, this.menuSel === i ? '#ffffff' : '#9c8670'));
  },
  draw_continue(ctx) {
    this.drawWorld(ctx); drawHUD(ctx, this);
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    if (this.credits > 0) {
      const count = Math.max(0, 9 - Math.floor(this.t / 60));
      const k = (this.t % 60) / 8;
      drawText(ctx, 'CONTINUE?', W / 2, 52, '#ffe066', 3, 'center');
      drawText(ctx, String(count), W / 2, 92 - (k < 1 ? (1 - k) * 6 : 0), '#ffffff', k < 1 ? 7 : 6, 'center');
      drawText(ctx, Input.lastDevice === 'touch' ? 'TAP HIT' : 'PRESS ATTACK', W / 2, 150, (this.t >> 4) % 2 ? '#e9d9bf' : '#9c8670', 1, 'center');
      drawText(ctx, this.credits >= 99 ? 'FREE PLAY' : 'CREDITS ' + this.credits, W / 2, 164, '#9c8670', 1, 'center');
    }
  },
  draw_gameover(ctx) { drawGameOver(ctx, this); },
  draw_clear(ctx) { this.drawWorld(ctx); drawHUD(ctx, this); drawClearTally(ctx, this); },
};

// Frame-based timers so delays respect pause.
const timers = [];
function setTimeoutFrames(n, fn) { timers.push({ n, fn }); }
function runTimers() {
  for (let i = timers.length - 1; i >= 0; i--) {
    if (--timers[i].n <= 0) { const fn = timers[i].fn; timers.splice(i, 1); fn(); }
  }
}
function syncSoundButton() { const b = document.getElementById('btn-sound'); if (b) { b.textContent = Sound.muted ? 'Sound off' : 'Sound on'; b.setAttribute('aria-pressed', String(!Sound.muted)); } }
