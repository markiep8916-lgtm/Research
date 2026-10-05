// Game: state machine, world simulation, camera and waves, screens.


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
  score: 0, shownScore: 0, hiscore: 50000, lives: 3, credits: 3, time: 99, timeTick: 0,
  titleIdle: 0, showTop: 0, titleReady: false, howto: false, entry: null, results: null,
  rage: 0, rageReadyShown: false,
  solids: [], silhouetteDist: 0, bossCardInfo: null, warning: null,
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
  aliveWeight() { let n = 0; for (const e of this.livingFoes()) n += e.def.spawnWeight != null ? e.def.spawnWeight : 1; return n; },
  livingFoes() { return this.ents.filter(e => e.team === 'enemy' && !e.remove && !e.dying && !e.ignoreForWave); },
  maxAttackers() { return this.diff.tokens + (this.stageIndex === 2 && this.diffKey !== 'easy' ? 1 : 0); },
  stageMult() { return [1, 0.85, 0.75][this.stageIndex] || 1; },
  // Boss intro card: darkens the screen, slides letterbox bars in, shows the name for 90f.
  bossCard(name, epithet) { this.bossCardInfo = { name, epithet, t: 0 }; this.letterboxTarget = 20; Sound.sfx('bossSting'); Sound.duck(0.3, 0.3); },
  // Red warning band that flashes 3 times (e.g. SANDSTORM!).
  warn(text, frames = 180) { this.warning = { text, t: 0, life: frames }; Sound.sfx('alarm'); },
  addScore(n) {
    const before = this.score;
    this.score += Math.round(n);
    for (const mark of [50000, 150000]) {
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
    this.stats = { kills: 0, time: 0, continues: 0 };
    this.hiscore = HiScores.top();
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
    this.solids = []; this.silhouetteDist = 0; this.bossCardInfo = null; this.warning = null; this.letterboxTarget = 0;
    Sound.musicFilter(20000, 0.1);
    for (const pr of st.props || []) this.add(new Breakable(pr.kind, pr.x, pr.y, pr.drop));
    for (const it of st.items || []) this.add(new Item(it.kind, it.x, it.y));
    if (st.setup) st.setup(this);
    this.card = { num: 'STAGE ' + (i + 1), title: st.title, sub: st.sub };
    this.time = 99; this.timeTick = 0;
    this.stageDmg0 = this.player.damageTaken;
    this.finaleDone = false; this.bossDone = false; this.resumeSong = null; this.respawnDrop = false; this.hudTopBusy = false;
    this.setState('stageintro');
    this.player.vx = 0;
    Sound.playSong(st.music);
  },
  playerDied() {
    if (this.playerGone) return;
    this.playerGone = true;
    this.lives--;
    if (this.lives > 0) setTimeoutFrames(30, () => this.respawn());
    else {
      // remember the boss or wave song so a continue resumes it (not during a boss's own death fade)
      if (!this.bossDone && Sound.songName && !(SONGS[Sound.songName] || {}).once) this.resumeSong = Sound.songName;
      this.setState('continue'); Sound.fadeOut(1.2);
    }
  },
  respawn() {
    const p = this.player;
    p.hp = p.maxHp; p.grey = 0; p.venom = 0; p.burn = 0;
    p.setState('jump');
    p.x = clamp(p.x, this.cam.x + 40, this.cam.x + W - 40);
    p.z = 110; p.vz = 0; p.vx = 0; p.jumpDir = 0; p.airUsed = true;
    p.inv = 120; p.blink = true;
    p.weapon = null;
    p.deathFx = false;
    p.chainT = 0; p.chainNext = null;
    this.playerGone = false;
    this.respawnDrop = true;
    this.time = 99; this.timeTick = 0;              // a new life refills TIME (else DEHYDRATED again at once)
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
    this.stats.continues++;
    this.time = 99;
    this.lives = 3;
    this.rage = 50;
    this.playerGone = false;
    const p = this.player;
    p.dying = false;
    this.setState('play');
    this.respawn();
    Sound.playSong(this.resumeSong || (this.wave && this.wave.music) || this.stage.music, true);
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
        if (next.boss) this.time = 99;
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
        if (this.aliveWeight() >= 6 && !s.force) break;          // never more than 6 enemies at once
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
        this.time = 99; this.timeTick = 0;
        if (!wv.noGo) { this.goT = 600; this.goFrom = this.cam.x; Sound.sfx('go'); }
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
    else if (side === 'top') { e.z = 60; e.vz = 0; e.y = s.y != null ? s.y : this.bounds.yMin + 4; e.setState('drop'); }
    else if (side === 'door') { e.y = this.bounds.yMin; e.setState('door'); }
    else if (e.def.enterStyles && e.def.enterStyles[side]) e.def.enterStyles[side].call(e, s);
    if (e.boss) this.bossRef = e;
    this.add(e);
    if (s.onSpawn) s.onSpawn(e, this);
    return e;
  },
  stageClear() {
    if (this.state !== 'play') return;
    // a hero dying in the boss's clear delay resolves her death and respawn first
    if (this.playerGone || this.respawnDrop || !this.player || this.player.hp <= 0) { setTimeoutFrames(30, () => this.stageClear()); return; }
    this.bossDone = false;
    this.setState('clear');
    if (!(this.finaleDone && Sound.songName === 'ending')) Sound.playSong('fanfare');
    const p = this.player;
    if (p.state !== 'down' && p.state !== 'fall') { p.setState('victory'); p.vx = p.vy = 0; }
    this.clearBonus = { rows: [
      ['TIME BONUS', this.time * 100],
      ['VITALITY BONUS', Math.round(p.hp) * 50],
      ['NO-DAMAGE BONUS', p.damageTaken === this.stageDmg0 ? 5000 : 0],
    ], shown: [0, 0, 0], line: ['NEXT.', "WATER'S THAT WAY.", "STINGS. DIDN'T KILL ME."][this.stageIndex] || 'NEXT.' };
  },
  dehydrate() {
    const p = this.player;
    if (!p || p.hp <= 0 || this.playerGone) return;
    p.hp = 0; p.grey = 0;
    if (p.heldBy) { const h = p.heldBy; p.heldBy = null; h.holding = false; h.releaseClutch && h.releaseClutch(); }
    if (p.grabbing) p.releaseHold();
    p.knockDown(-p.facing, 1.0, 2.0);
    FX.showBanner('DEHYDRATED', '#e2591e', 120);
    Sound.sfx('death', p.x);
  },

  // ---------- simulation ----------
  update() {
    this.frame++;
    this.t++;
    Input.update();
    if (this.state === 'play' && this.player) this.player.recordInput();
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

  upd_boot() { if (Input.anyPressed) this.toTitle(); },
  upd_title() {
    FX.update();
    if (this.t === 20) { this.hitstop = 0; FX.shake(3, 10); Sound.sfx('hitFinisher'); for (let i = 0; i < 12; i++) FX.add({ kind: 'spark', x: W / 2, y: 54, z: 0, vx: rr(-4, 4), vz: rr(-1, 4), life: 14, g: 0.1, drag: 0.9 }); }
    if (this.fadeDir) return;
    if (this.howto) { if (++this.howtoT > 10 && Input.anyPressed) { this.howto = false; Sound.sfx('menu'); } return; }
    if (Input.anyPressed) this.titleIdle = 0;
    else if (++this.titleIdle > 60 * 20 && !this.titleReady) { this.showTop = 360; this.titleIdle = 0; }
    if (this.showTop > 0) { this.showTop--; if (Input.anyPressed) this.showTop = 0; return; }
    if (this.t < 26) return;
    if (!this.titleReady) { if (Input.pressed('start') || Input.pressed('attack') || Input.pressed('jump')) { this.titleReady = true; Sound.unlock(); Sound.sfx('select'); } return; }
    const items = 4;
    if (Input.pressed('up')) { this.menuSel = (this.menuSel + items - 1) % items; Sound.sfx('menu'); }
    if (Input.pressed('down')) { this.menuSel = (this.menuSel + 1) % items; Sound.sfx('menu'); }
    const lr = Input.pressed('left') ? -1 : Input.pressed('right') ? 1 : 0;
    const go = Input.pressed('start') || Input.pressed('attack') || Input.pressed('jump');
    if (this.menuSel === 1 && go) { this.howto = true; this.howtoT = 0; Sound.sfx('select'); return; }
    if (this.menuSel === 2 && (lr || go)) {
      const keys = Object.keys(DIFFS);
      const i = (keys.indexOf(this.diffKey) + (lr || 1) + keys.length) % keys.length;
      this.diffKey = keys[i]; Store.set('diff', this.diffKey); Sound.sfx('menu');
      return;
    }
    if (this.menuSel === 3 && (lr || go)) { Sound.unlock(); Sound.toggleMute(); syncSoundButton(); Sound.sfx('menu'); return; }
    if (this.menuSel === 0 && go) {
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
    // Enter pages like J (the title teaches Enter); holding it for 40 f skips the story
    if (Input.down('start') && this.storyHeld) { if (++this.skipHold >= 40) { this.skipHold = 0; this.transition(this.storyNext); return; } }
    else this.skipHold = 0;
    if (Input.pressed('start')) this.storyHeld = true;
    if (!Input.down('start')) this.storyHeld = false;
    const adv = this.t >= 8 && (Input.pressed('attack') || Input.pressed('jump') || Input.pressed('start'));
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
    if (this.t > 130 || (this.t > 50 && Input.anyPressed)) {
      this.setState('play'); p.setState('idle'); p.vx = 0;
      // the player looked away during the intro (or the run was just hot-resumed): start paused
      if (this.pauseOnPlay) { this.pauseOnPlay = false; this.resumeHold = false; this.pause(true); }
    }
  },
  upd_play() {
    if (Input.pressed('start')) { this.pause(); return; }
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
  pause(quiet) { this.setState('pause'); if (!quiet) Sound.sfx('pause'); this.menuSel = 0; Sound.musicFilter(600, 0.15, true); Sound.setMusicLevel(0.4); },
  resume() { this.setState('play'); Sound.sfx('pause'); Sound.musicFilter(Sound.baseHz, 0.15); Sound.setMusicLevel(1); },
  upd_pause() {
    if (this.fadeDir) return;
    if (this.howto) { if (++this.howtoT > 10 && Input.anyPressed) { this.howto = false; Sound.sfx('menu'); } return; }
    if (Input.pressed('start')) { this.resume(); return; }
    const n = 5;
    if (Input.pressed('up')) { this.menuSel = (this.menuSel + n - 1) % n; Sound.sfx('menu'); }
    if (Input.pressed('down')) { this.menuSel = (this.menuSel + 1) % n; Sound.sfx('menu'); }
    if (Input.pressed('attack') || Input.pressed('jump')) {
      if (this.menuSel === 0) this.resume();
      else if (this.menuSel === 1) { Sound.unlock(); Sound.toggleMute(); syncSoundButton(); }
      else if (this.menuSel === 2) { FX.reducedShake = !FX.reducedShake; Store.set('reducedShake', FX.reducedShake); Sound.sfx('menu'); }
      else if (this.menuSel === 3) { this.howto = true; this.howtoT = 0; Sound.sfx('select'); }
      else { Sound.sfx('select'); Sound.fadeOut(0.6); this.transition(() => this.toTitle()); }
    }
  },
  toTitle() {
    this.player = null; this.ents = []; this.solids = []; this.letterboxTarget = 0; this.letterbox = 0; this.menuSel = 0;
    this.silhouetteDist = 0; this.titleReady = false; this.howto = false; this.titleIdle = 0; this.showTop = 0; this.respawnDrop = false; this.pauseOnPlay = false; this.resumeHold = false;
    FX.reset(); Sound.musicFilter(20000, 0.1); Sound.setMusicLevel(1, 0.05);
    this.setState('title'); Sound.playSong('title');
  },
  upd_continue() {
    FX.update();
    if (this.credits <= 0) { if (this.t > 40) this.gameOver(); return; }
    const count = 9 - Math.floor(this.t / 60);
    if (this.t % 60 === 0 && count >= 0) Sound.sfx('beep');
    if ((Input.pressed('start') || Input.pressed('attack') || Input.pressed('jump')) && this.t > 20) { Sound.sfx('select'); this.doContinue(); return; }
    if (count < 0) this.gameOver();
  },
  gameOver() {
    this.setState('gameover');
    Sound.playSong('gameover');
  },
  saveHi() {},
  upd_gameover() {
    if (this.t > 150 || (this.t > 60 && (Input.pressed('start') || Input.pressed('attack') || Input.pressed('jump')))) this.transition(() => this.afterRun());
  },
  // After game over or the results: initials entry if the score makes the top 5, then the title.
  afterRun() {
    if (HiScores.qualifies(this.score)) { this.entry = { letters: [0, 0, 0], pos: 0 }; this.setState('entry'); Sound.playSong('title'); }
    else this.toTitle();
  },
  upd_entry() {
    const e = this.entry, CH = HiScores.CHARS;
    if (this.fadeDir || e.pos >= 3) return;      // the score is saved exactly once
    if (Input.pressed('up')) { e.letters[e.pos] = (e.letters[e.pos] + 1) % CH.length; Sound.sfx('menu'); }
    if (Input.pressed('down')) { e.letters[e.pos] = (e.letters[e.pos] + CH.length - 1) % CH.length; Sound.sfx('menu'); }
    if (Input.pressed('left') && e.pos > 0) { e.pos--; Sound.sfx('menu'); }
    if (Input.pressed('attack') || Input.pressed('start') || Input.pressed('right')) {
      Sound.sfx('select');
      if (++e.pos >= 3) {
        HiScores.add(e.letters.map(i => CH[i]).join(''), this.score);
        this.hiscore = HiScores.top();
        this.transition(() => { this.toTitle(); this.showTop = 300; });
      }
    }
  },
  upd_clear() {
    this.simulate(false);
    const b = this.clearBonus;
    if (this.t > 70 && this.t % 5 === 0) {
      const i = b.shown.findIndex((v, k) => v < b.rows[k][1]);
      if (i >= 0) {
        const step = Math.max(100, Math.ceil(b.rows[i][1] / 20 / 100) * 100);
        const add = Math.min(step, b.rows[i][1] - b.shown[i]);
        b.shown[i] += add; this.addScore(add); Sound.sfx('tick');
      } else if (!b.doneAt) b.doneAt = this.t;
    }
    if (b.doneAt && this.t > b.doneAt + 90 && !this.fadeDir) {
      this.transition(() => {
        const next = this.stageIndex + 1;
        if (next < STAGES.length) {
          const pages = STORY.between[this.stageIndex];
          if (pages && pages.length) { this.storyPages = pages; this.storyIdx = 0; this.storyChar = 0; this.storyNext = () => this.startStage(next); this.setState('story'); Sound.playSong('story'); }
          else this.startStage(next);
        } else {
          this.storyPages = STORY.ending; this.storyIdx = 0; this.storyChar = 0;
          this.storyNext = () => this.showResults();
          this.setState('story');
          Sound.playSong('ending');
        }
      });
    }
  },
  showResults() {
    const noCont = this.stats.continues === 0;
    const rows = [['NO-CONTINUE BONUS', noCont ? 30000 : 0], ['LIFE BONUS', this.lives * 10000]];
    for (const r of rows) this.addScore(r[1]);
    let rank = this.score >= 200000 && noCont ? 'S' : this.score >= 140000 ? 'A' : this.score >= 80000 ? 'B' : 'C';
    if (!noCont && (rank === 'S' || rank === 'A')) rank = 'B';
    this.results = { rows, rank };
    this.setState('results');
    Sound.playSong('ending');
  },
  upd_results() {
    FX.update();
    if (this.t < 120 && this.t >= 20 && (this.t - 20) % 20 === 0) Sound.sfx('tick');
    if (this.t === 130) { FX.shake(3, 10); Sound.sfx('hitFinisher'); }
    if (this.t > 220 && (Input.pressed('start') || Input.pressed('attack') || Input.pressed('jump'))) this.transition(() => this.afterRun());
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
    if (live) {
      this.stats.time++;
      this.updateWaves();
      if (!this.bossCardInfo && !this.finaleRunning && p && p.hp > 0 && !this.playerGone) {
        if (++this.timeTick >= 60) {
          this.timeTick = 0;
          if (this.time > 0) this.time--;
          if (this.time > 0 && this.time <= 10) Sound.sfx('beep');
          if (this.time === 0) this.dehydrate();
        }
      }
      if (this.goT > 0) {
        if (this.cam.x > (this.goFrom || 0) + 40) this.goT = 0;
        else if (this.goT % 120 === 0) Sound.sfx('go');
      }
    }
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
    if (this.bossCardInfo && ++this.bossCardInfo.t > 110) { this.bossCardInfo = null; this.letterboxTarget = 0; }
    if (this.warning && ++this.warning.t > this.warning.life) this.warning = null;
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
    if (st.drawFg) {
      ctx.save(); ctx.beginPath(); ctx.rect(-32, 23, W + 64, H); ctx.clip();
      st.drawFg(ctx, camX, this.frame, this);
      ctx.restore();
    }
    if (st.drawFgOverlay) st.drawFgOverlay(ctx, camX, this.frame, this);
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
    if (this.warning) {
      const w = this.warning, on = Math.floor(w.t / 20) % 2 === 0 && w.t < 120;
      if (on || w.t >= 120) {
        ctx.globalAlpha = w.t >= 120 ? Math.max(0, 1 - (w.t - 120) / 30) * 0.9 : 0.9;
        ctx.fillStyle = '#b8322a'; ctx.fillRect(0, 100, W, 16);
        ctx.globalAlpha = 1;
        if (on) drawText(ctx, w.text, W / 2, 104, '#ffffff', 1, 'center');
      }
    }
    if (this.bossCardInfo) {
      const b = this.bossCardInfo, k = Math.min(1, b.t / 12) * (b.t > 96 ? Math.max(0, 1 - (b.t - 96) / 14) : 1);
      ctx.globalAlpha = 0.3 * k; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      if (k > 0.05) {
        drawText(ctx, b.name, lerp(-120, W / 2, easeOut(k)), 86, '#ffe08a', 2, 'center');
        drawText(ctx, b.epithet, lerp(W + 120, W / 2, easeOut(k)), 106, '#e8e0d0', 1, 'center');
      }
    }
    if (this.letterbox > 0) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, Math.round(this.letterbox));
      ctx.fillRect(0, H - Math.round(this.letterbox), W, Math.round(this.letterbox));
    }
  },
  draw_boot(ctx) {
    ctx.fillStyle = '#0e0a08'; ctx.fillRect(0, 0, W, H);
    drawText(ctx, (Input.lastDevice === 'touch' ? 'TAP TO START' : 'CLICK OR PRESS ANY KEY'), W / 2, H / 2 - 3, '#e9d9bf', 1, 'center');
  },
  draw_title(ctx) { drawTitleScreen(ctx, this); },
  draw_story(ctx) { drawStoryScreen(ctx, this.storyPages[this.storyIdx], this.storyChar, this); },
  draw_results(ctx) { drawResults(ctx, this); },
  draw_entry(ctx) { drawEntry(ctx, this); },
  draw_stageintro(ctx) { this.drawWorld(ctx); drawHUD(ctx, this); drawStageCard(ctx, this.card, this.t); },
  draw_play(ctx) { this.drawWorld(ctx); drawHUD(ctx, this); },
  draw_pause(ctx) {
    this.drawWorld(ctx); drawHUD(ctx, this);
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    drawText(ctx, 'PAUSED', W / 2, 56, '#ffe066', 3, 'center');
    const opts = ['RESUME', 'SOUND: ' + (Sound.muted ? 'OFF' : 'ON'), 'SCREEN SHAKE: ' + (FX.reducedShake ? 'LOW' : 'FULL'), 'MOVES', 'QUIT TO TITLE'];
    opts.forEach((o, i) => drawText(ctx, (this.menuSel === i ? '> ' : '  ') + o, W / 2 - 64, 94 + i * 14, this.menuSel === i ? '#ffffff' : '#9c8670'));
    if (this.howto) drawHowTo(ctx, this);
  },
  draw_continue(ctx) {
    this.drawWorld(ctx); drawHUD(ctx, this);
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    if (this.credits > 0) {
      const count = Math.max(0, 9 - Math.floor(this.t / 60));
      const k = (this.t % 60) / 8;
      drawText(ctx, 'CONTINUE?', W / 2, 52, '#ffe066', 3, 'center');
      drawText(ctx, String(count), W / 2, 92 - (k < 1 ? (1 - k) * 6 : 0), '#ffffff', k < 1 ? 7 : 6, 'center');
      drawVultures(ctx, this);
      drawText(ctx, Input.lastDevice === 'touch' ? 'TAP THE SCREEN' : 'PRESS ' + devKeys().a + ' TO CONTINUE', W / 2, 150, (this.t >> 4) % 2 ? '#e9d9bf' : '#9c8670', 1, 'center');
      drawText(ctx, this.credits >= 99 ? 'FREE PLAY' : 'CREDITS ' + this.credits, W / 2, 164, '#9c8670', 1, 'center');
    } else {
      drawText(ctx, 'NO CREDITS', W / 2, 90, '#e83b3b', 2, 'center');
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

// Top-5 high scores, kept in localStorage when it is available (a convenience; the game works without it).
const HiScores = {
  KEY: 'rustfist_hi',
  CHARS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ. ',
  defaults: [['JNO', 50000], ['TEO', 40000], ['VLV', 30000], ['DSL', 20000], ['MTR', 10000]],
  list() {
    try { const v = JSON.parse(localStorage.getItem(this.KEY)); if (Array.isArray(v) && v.length) return v; } catch (e) { /* storage blocked */ }
    return this.mem || this.defaults.slice();
  },
  top() { return this.list()[0][1]; },
  qualifies(score) { const l = this.list(); return score > 0 && (l.length < 5 || score > l[l.length - 1][1]); },
  add(name, score) {
    const l = this.list().concat([[name, score]]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    this.mem = l;
    try { localStorage.setItem(this.KEY, JSON.stringify(l)); } catch (e) { /* storage blocked */ }
  },
};
