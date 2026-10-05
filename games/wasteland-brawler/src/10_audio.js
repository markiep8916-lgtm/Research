// Audio: synthesized SFX and a small step sequencer for music. Everything is WebAudio; no samples.

const Sound = {
  ctx: null, master: null, sfxBus: null, musicBus: null, comp: null,
  noiseBuf: null, shaper: null,
  muted: Store.get('muted', false),
  song: null, songName: null, nextStepTime: 0, step: 0, timer: null,
  lastPlay: {},
  pm: 1,             // pitch multiplier applied to SFX voices

  // Must be called from a user gesture.
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.7;
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.32;
    this.musicLP = c.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 20000;
    this.sfxBus.connect(this.comp); this.musicBus.connect(this.musicLP); this.musicLP.connect(this.comp);
    this.comp.connect(this.master); this.master.connect(c.destination);
    // 1s of white noise shared by every noise voice
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // soft clipper for crunchy hits
    this.shaper = c.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); }
    this.shaper.curve = curve;
    this.shaper.connect(this.sfxBus);
    if (this.songName) this.playSong(this.songName, true);
  },
  toggleMute() {
    this.muted = !this.muted;
    Store.set('muted', this.muted);
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.02);
    return this.muted;
  },
  ok() { return this.ctx && this.ctx.state === 'running'; },

  // ---- voices ----
  out(pan, crunch) {
    const c = this.ctx;
    const dest = crunch ? this.shaper : this.sfxBus;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      p.connect(dest);
      return p;
    }
    return dest;
  },
  tone(f0, f1, dur, type = 'square', vol = 0.3, t = 0, dest = null, attack = 0.003) {
    const c = this.ctx, now = c.currentTime + t;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    const pm = this.pm;
    o.frequency.setValueAtTime(Math.max(20, f0 * pm), now);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * pm), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(dest || this.sfxBus);
    o.start(now); o.stop(now + dur + 0.02);
    return o;
  },
  noise(dur, vol = 0.3, freq = 1000, q = 1, ftype = 'bandpass', t = 0, dest = null, f1 = 0) {
    const c = this.ctx, now = c.currentTime + t;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = ftype; f.frequency.setValueAtTime(freq * this.pm, now); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1 * this.pm), now + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxBus);
    s.start(now, Math.random() * 0.5); s.stop(now + dur + 0.02);
  },

  // ---- sound effects ----
  // x: world-space x of the source, used for stereo pan relative to the camera.
  // pitch: extra multiplier (combo climb); every SFX also gets +/-6% random pitch.
  sfx(name, x, pitch = 1) {
    if (!this.ok()) return;
    const now = this.ctx.currentTime;
    if (this.lastPlay[name] && now - this.lastPlay[name] < 0.035) return;
    this.lastPlay[name] = now;
    const pan = x == null || !Game.cam ? 0 : clamp((x - Game.cam.x - W / 2) / (W / 2), -1, 1) * 0.6;
    const fn = SFX[name];
    if (!fn) return;
    this.pm = pitch * (0.94 + Math.random() * 0.12);
    try { fn(this, pan); } finally { this.pm = 1; }
  },
  // Sweep the music lowpass (sandstorm, pause). 20000 = open.
  musicFilter(freq, sec = 1) {
    if (!this.ctx) return;
    const f = this.musicLP.frequency, t = this.ctx.currentTime;
    f.cancelScheduledValues(t); f.setValueAtTime(f.value, t); f.exponentialRampToValueAtTime(Math.max(60, freq), t + sec);
  },
  // Duck the music bus briefly (heavy hits).
  duck(level = 0.5, sec = 0.15) {
    if (!this.ok() || !this.song) return;
    const g = this.musicBus.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.32 * level, t);
    g.linearRampToValueAtTime(0.32, t + sec + 0.35);
  },

  // ---- music sequencer ----
  playSong(name, force) {
    if (this.songName === name && !force) return;
    this.songName = name;
    if (!this.ctx) return;
    this.stopSong(true);
    this.songName = name;
    this.song = SONGS[name];
    if (!this.song) return;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.08;
    this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicBus.gain.setValueAtTime(0.32, this.ctx.currentTime);
    this.timer = setInterval(() => this.schedule(), 25);
  },
  stopSong(keepName) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.song = null;
    if (!keepName) this.songName = null;
  },
  fadeOut(sec = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.musicBus.gain.linearRampToValueAtTime(0, t + sec);
    setTimeout(() => { if (this.musicBus.gain.value < 0.01) this.stopSong(); }, sec * 1000 + 50);
  },
  schedule() {
    const s = this.song;
    if (!s || !this.ctx) return;
    const stepDur = 60 / s.bpm / 4;
    while (this.nextStepTime < this.ctx.currentTime + 0.12) {
      const totalSteps = s.length * 16;
      const st = this.step % totalSteps;
      const bar = Math.floor(st / 16), pos = st % 16;
      for (const tr of s.tracks) {
        const bars = tr.bars;
        const pat = bars[bar % bars.length];
        const tok = pat[pos];
        if (tok && tok !== '.') Instruments[tr.inst](this, tok, this.nextStepTime, stepDur, tr);
      }
      this.nextStepTime += stepDur * (pos % 2 === 0 ? 1 + (s.swing || 0) : 1 - (s.swing || 0));
      this.step++;
    }
  },
};

// Note name -> frequency. Accepts C2, C#3, Db4 ...
const _noteCache = {};
function noteFreq(n) {
  if (_noteCache[n]) return _noteCache[n];
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return 0;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const midi = 12 * (parseInt(m[3], 10) + 1) + base + acc;
  return (_noteCache[n] = 440 * Math.pow(2, (midi - 69) / 12));
}
// Parse "A2 . . A2 C3 . ..." into a 16-slot array.
function bar(str) {
  const t = str.trim().split(/\s+/);
  while (t.length < 16) t.push('.');
  return t.slice(0, 16);
}

// Music instruments. Each receives (audio, token, time, stepDuration, track).
const Instruments = {
  bass(a, tok, t, sd, tr) {
    const c = a.ctx, f = noteFreq(tok);
    if (!f) return;
    const len = sd * (tr.len || 1.8);
    const o = c.createOscillator(), o2 = c.createOscillator();
    o.type = tr.wave || 'sawtooth'; o2.type = 'square';
    o.frequency.value = f; o2.frequency.value = f / 2;
    const fl = c.createBiquadFilter();
    fl.type = 'lowpass'; fl.Q.value = 6;
    fl.frequency.setValueAtTime(tr.cutoff || 900, t);
    fl.frequency.exponentialRampToValueAtTime(140, t + len);
    const g = c.createGain(), g2 = c.createGain();
    g2.gain.value = 0.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((tr.vol || 0.5), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(a.musicBus);
    o.start(t); o2.start(t); o.stop(t + len + 0.02); o2.stop(t + len + 0.02);
  },
  lead(a, tok, t, sd, tr) {
    const c = a.ctx, f = noteFreq(tok);
    if (!f) return;
    const len = sd * (tr.len || 3.5);
    const o = c.createOscillator();
    o.type = tr.wave || 'square';
    o.frequency.value = f;
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 5.5; lg.gain.value = f * 0.012;
    lfo.connect(lg); lg.connect(o.frequency);
    const g = c.createGain();
    const v = tr.vol || 0.16;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.setValueAtTime(v, t + len * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = tr.cutoff || 3200;
    o.connect(fl); fl.connect(g); g.connect(a.musicBus);
    if (tr.echo) {
      const dl = c.createDelay(); dl.delayTime.value = sd * 3;
      const fb = c.createGain(); fb.gain.value = 0.3;
      g.connect(dl); dl.connect(fb); fb.connect(a.musicBus);
    }
    o.start(t); lfo.start(t); o.stop(t + len + 0.05); lfo.stop(t + len + 0.05);
  },
  arp(a, tok, t, sd, tr) {
    const f = noteFreq(tok);
    if (!f) return;
    const c = a.ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = tr.wave || 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(tr.vol || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sd * (tr.len || 0.9));
    o.connect(g); g.connect(a.musicBus);
    o.start(t); o.stop(t + sd + 0.02);
  },
  pad(a, tok, t, sd, tr) {
    // token like "A3+C4+E4"
    const c = a.ctx, len = sd * (tr.len || 16);
    for (const n of tok.split('+')) {
      const f = noteFreq(n);
      if (!f) continue;
      for (const det of [-6, 6]) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = tr.wave || 'sawtooth'; o.frequency.value = f; o.detune.value = det;
        const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = tr.cutoff || 1100;
        const v = (tr.vol || 0.05);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(v, t + len * 0.25);
        g.gain.linearRampToValueAtTime(0.0001, t + len);
        o.connect(fl); fl.connect(g); g.connect(a.musicBus);
        o.start(t); o.stop(t + len + 0.05);
      }
    }
  },
  drums(a, tok, t, sd, tr) {
    const c = a.ctx, v = tr.vol || 1;
    for (const ch of tok) {
      if (ch === 'k') { // kick
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g); g.connect(a.musicBus); o.start(t); o.stop(t + 0.25);
      } else if (ch === 's') { // snare
        a.noise(0.16, 0.45 * v, 1800, 0.8, 'bandpass', t - c.currentTime, a.musicBus);
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
        g.gain.setValueAtTime(0.35 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        o.connect(g); g.connect(a.musicBus); o.start(t); o.stop(t + 0.12);
      } else if (ch === 'h') { // closed hat
        a.noise(0.04, 0.14 * v, 9000, 1, 'highpass', t - c.currentTime, a.musicBus);
      } else if (ch === 'o') { // open hat
        a.noise(0.2, 0.12 * v, 8000, 1, 'highpass', t - c.currentTime, a.musicBus);
      } else if (ch === 'c') { // crash
        a.noise(1.0, 0.18 * v, 6000, 0.5, 'highpass', t - c.currentTime, a.musicBus);
      } else if (ch === 'm') { // metal clank (industrial)
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(1260, t);
        g.gain.setValueAtTime(0.06 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        o.connect(g); g.connect(a.musicBus); o.start(t); o.stop(t + 0.1);
        a.noise(0.06, 0.08 * v, 3000, 6, 'bandpass', t - c.currentTime, a.musicBus);
      } else if (ch === 't') { // low tom
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.2);
        g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.connect(g); g.connect(a.musicBus); o.start(t); o.stop(t + 0.26);
      }
    }
  },
};

// Sound effects. Each receives (audio, pan).
const SFX = {
  whoosh(a, p) { a.noise(0.12, 0.18, 2600, 1.2, 'bandpass', 0, a.out(p), 700); },
  whooshBig(a, p) { a.noise(0.2, 0.25, 1800, 1.0, 'bandpass', 0, a.out(p), 300); },
  hitLight(a, p) {
    const d = a.out(p, true);
    a.noise(0.06, 0.5, 2200, 0.7, 'bandpass', 0, d);
    a.tone(240, 70, 0.08, 'square', 0.35, 0, d);
  },
  hitMid(a, p) {
    const d = a.out(p, true);
    a.noise(0.09, 0.6, 1500, 0.7, 'bandpass', 0, d);
    a.tone(190, 55, 0.11, 'square', 0.45, 0, d);
  },
  hitHeavy(a, p) {
    const d = a.out(p, true);
    a.noise(0.18, 0.7, 900, 0.6, 'lowpass', 0, d);
    a.tone(160, 38, 0.2, 'sawtooth', 0.55, 0, d);
    a.noise(0.05, 0.4, 4000, 1, 'highpass', 0, d);
  },
  hitFinisher(a, p) {
    const d = a.out(p, true);
    a.noise(0.11, 0.7, 3000, 0.6, 'lowpass', 0, d, 600);
    a.tone(110, 40, 0.14, 'triangle', 0.6, 0, d);
    a.tone(660, 0, 0.25, 'square', 0.12, 0, d);
    a.tone(989, 0, 0.25, 'square', 0.08, 0, d);
    a.tone(1320, 0, 0.25, 'sine', 0.1, 0, d);
    a.tone(55, 0, 0.18, 'sine', 0.5, 0, d);
    a.duck(0.5, 0.15);
  },
  hitCrit(a, p) {
    SFX.hitFinisher(a, p);
    const d = a.out(p, true);
    a.noise(0.4, 0.6, 4000, 0.6, 'lowpass', 0, d, 150);
    a.tone(70, 30, 0.4, 'sine', 0.6, 0, d);
    a.duck(0.2, 0.5);
  },
  matGang(a, p) { a.noise(0.02, 0.25, 2500, 0.8, 'highpass', 0, a.out(p)); },
  matMutant(a, p) { const d = a.out(p); a.noise(0.09, 0.3, 900, 1.2, 'lowpass', 0, d, 200); a.tone(90, 70, 0.09, 'sine', 0.2, 0, d); },
  matChitin(a, p) { const d = a.out(p); a.noise(0.025, 0.35, 3500, 1, 'highpass', 0, d); a.noise(0.025, 0.3, 3500, 1, 'highpass', 0.015, d); },
  matMetal(a, p) { const d = a.out(p); a.tone(1200, 0, 0.06, 'square', 0.06, 0, d); a.tone(1800, 0, 0.06, 'square', 0.05, 0, d); },
  clank(a, p) { const d = a.out(p); a.tone(620, 0, 0.12, 'square', 0.08, 0, d); a.tone(873, 0, 0.12, 'square', 0.06, 0, d); a.noise(0.02, 0.2, 3000, 1, 'highpass', 0, d); },
  tink(a, p) { a.tone(1800, 0, 0.03, 'square', 0.12, 0, a.out(p)); },
  hitMetal(a, p) {
    const d = a.out(p, true);
    a.tone(1480, 1100, 0.18, 'triangle', 0.25, 0, d);
    a.tone(2210, 1900, 0.12, 'square', 0.08, 0, d);
    a.noise(0.08, 0.5, 2500, 1.5, 'bandpass', 0, d);
  },
  hitShell(a, p) { // chitin crack
    const d = a.out(p, true);
    a.noise(0.05, 0.6, 3500, 2, 'bandpass', 0, d);
    a.tone(520, 180, 0.07, 'square', 0.3, 0, d);
    a.noise(0.04, 0.3, 6000, 3, 'bandpass', 0.03, d);
  },
  thud(a, p) {
    const d = a.out(p);
    a.tone(110, 38, 0.22, 'sine', 0.7, 0, d);
    a.noise(0.18, 0.35, 400, 0.7, 'lowpass', 0, d);
  },
  jump(a, p) { a.tone(180, 360, 0.09, 'square', 0.1, 0, a.out(p)); },
  land(a, p) { a.noise(0.07, 0.2, 500, 0.8, 'lowpass', 0, a.out(p)); },
  grab(a, p) { a.tone(140, 90, 0.08, 'square', 0.25, 0, a.out(p)); a.noise(0.05, 0.2, 800, 1, 'bandpass', 0, a.out(p)); },
  special(a, p) {
    const d = a.out(p, true);
    a.noise(0.5, 0.6, 3000, 0.6, 'bandpass', 0, d, 200);
    a.tone(880, 60, 0.45, 'sawtooth', 0.35, 0, d);
    a.tone(110, 40, 0.5, 'sine', 0.6, 0, d);
  },
  hurt(a, p) { a.tone(420, 150, 0.16, 'square', 0.25, 0, a.out(p)); },
  ko(a, p) {
    const d = a.out(p);
    a.tone(330, 60, 0.5, 'sawtooth', 0.3, 0, d);
    a.tone(165, 30, 0.6, 'square', 0.2, 0.05, d);
  },
  pickup(a) { [0, 0.06, 0.12].forEach((t, i) => a.tone([523, 659, 784][i], 0, 0.1, 'square', 0.15, t)); },
  food(a) { [0, 0.07, 0.14, 0.21].forEach((t, i) => a.tone([392, 523, 659, 1046][i], 0, 0.12, 'triangle', 0.25, t)); },
  weapon(a) { a.tone(330, 0, 0.08, 'square', 0.15); a.tone(660, 0, 0.12, 'square', 0.15, 0.07); },
  crate(a, p) {
    const d = a.out(p, true);
    a.noise(0.25, 0.6, 1200, 0.6, 'bandpass', 0, d, 300);
    for (let i = 0; i < 4; i++) a.tone(300 + i * 120, 120, 0.04, 'square', 0.12, i * 0.03, d);
  },
  glass(a, p) {
    const d = a.out(p);
    a.noise(0.3, 0.4, 7000, 2, 'highpass', 0, d);
    for (let i = 0; i < 5; i++) a.tone(2400 + Math.random() * 2400, 0, 0.05, 'triangle', 0.08, i * 0.025, d);
  },
  explode(a, p) {
    const d = a.out(p, true);
    a.noise(0.9, 0.9, 1400, 0.5, 'lowpass', 0, d, 80);
    a.tone(90, 30, 0.7, 'sine', 0.8, 0, d);
  },
  fire(a, p) { a.noise(0.35, 0.25, 900, 0.5, 'lowpass', 0, a.out(p), 2400); },
  hiss(a, p) {
    const d = a.out(p);
    a.noise(0.35, 0.22, 5000, 1.5, 'highpass', 0, d);
    for (let i = 0; i < 4; i++) a.tone(1800, 1200, 0.025, 'square', 0.05, i * 0.06, d);
  },
  click(a, p) { const d = a.out(p); for (let i = 0; i < 3; i++) a.tone(2600, 1800, 0.02, 'square', 0.06, i * 0.045, d); },
  burrow(a, p) { a.noise(0.5, 0.35, 300, 0.7, 'lowpass', 0, a.out(p), 900); },
  roar(a, p) {
    const d = a.out(p, true);
    const o = a.tone(95, 60, 0.7, 'sawtooth', 0.4, 0, d, 0.06);
    void o;
    a.tone(142, 80, 0.6, 'square', 0.15, 0.02, d, 0.06);
    a.noise(0.6, 0.25, 500, 1, 'bandpass', 0, d, 200);
  },
  taunt(a, p) { const d = a.out(p); a.tone(300, 220, 0.09, 'square', 0.12, 0, d); a.tone(360, 260, 0.11, 'square', 0.12, 0.11, d); },
  shot(a, p) { const d = a.out(p, true); a.noise(0.14, 0.6, 2500, 0.5, 'lowpass', 0, d, 400); a.tone(300, 60, 0.08, 'square', 0.3, 0, d); },
  throwObj(a, p) { a.noise(0.16, 0.15, 1200, 1, 'bandpass', 0, a.out(p), 2400); },
  go(a) { [0, 0.12].forEach(t => { a.tone(784, 0, 0.1, 'square', 0.18, t); a.tone(1046, 0, 0.1, 'square', 0.1, t + 0.05); }); },
  menu(a) { a.tone(660, 0, 0.05, 'square', 0.12); },
  select(a) { a.tone(523, 0, 0.06, 'square', 0.15); a.tone(1046, 0, 0.12, 'square', 0.15, 0.06); },
  pause(a) { a.tone(880, 440, 0.12, 'triangle', 0.2); },
  alarm(a) { for (let i = 0; i < 3; i++) { a.tone(880, 0, 0.14, 'square', 0.14, i * 0.3); a.tone(660, 0, 0.14, 'square', 0.14, i * 0.3 + 0.15); } },
  oneUp(a) { [523, 659, 784, 1046, 1318].forEach((f, i) => a.tone(f, 0, 0.1, 'square', 0.14, i * 0.06)); },
  step(a, p) { a.noise(0.015, 0.08, 300, 0.7, 'lowpass', 0, a.out(p)); },
  chime(a) { [784, 988, 1319].forEach((f, i) => a.tone(f, 0, 0.1, 'square', 0.12, i * 0.07)); },
  whistle(a, p) { a.tone(1200, 300, 0.15, 'sine', 0.2, 0, a.out(p)); },
  shing(a) { a.tone(2000, 0, 0.3, 'sine', 0.15); a.tone(3000, 0, 0.3, 'sine', 0.1); a.noise(0.3, 0.15, 6000, 2, 'highpass'); },
  weaponBreak(a, p) { const d = a.out(p); a.noise(0.15, 0.4, 2500, 1, 'bandpass', 0, d); [0, 0.06, 0.12].forEach((t, i) => a.tone(900 - i * 200, 0, 0.04, 'square', 0.1, t + 0.1, d)); },
  boing(a, p) { const d = a.out(p, true); a.tone(520, 500, 0.3, 'square', 0.15, 0, d); a.tone(780, 760, 0.3, 'square', 0.1, 0, d); SFX.hitHeavy(a, p); },
  shout(a, p) { const d = a.out(p); a.tone(220, 200, 0.12, 'sawtooth', 0.12, 0, d); a.noise(0.12, 0.15, 1000, 3, 'bandpass', 0, d); },
  groan(a, p) { const d = a.out(p); a.tone(90, 130, 0.4, 'sawtooth', 0.18, 0, d, 0.05); a.noise(0.4, 0.1, 500, 1, 'lowpass', 0, d); },
  rattle(a, p) { const d = a.out(p); for (let i = 0; i < 6; i++) a.tone(2600, 1800, 0.02, 'square', 0.06, i * (0.08 - i * 0.008), d); },
  bossSting(a) { const d = a.out(0, true); ['C2', 'C#2', 'D2'].forEach(n => a.tone(noteFreq(n), 0, 1.0, 'sawtooth', 0.12, 0, d, 0.05)); a.noise(1.0, 0.25, 200, 0.7, 'lowpass', 0, d, 2000); },
  rumble(a, p) { const d = a.out(p); a.noise(0.6, 0.4, 120, 0.7, 'lowpass', 0, d); a.tone(40, 0, 0.6, 'sine', 0.4, 0, d, 0.05); },
  steam(a, p) { a.noise(0.5, 0.25, 2000, 0.6, 'highpass', 0, a.out(p), 4000); },
  water(a, p) { const d = a.out(p); a.noise(0.7, 0.35, 900, 0.6, 'lowpass', 0, d); a.tone(200, 260, 0.7, 'sine', 0.1, 0, d); },
  shingKnife(a, p) { const d = a.out(p); a.tone(3200, 0, 0.15, 'sine', 0.08, 0, d); a.tone(4100, 0, 0.15, 'sine', 0.06, 0, d); },
  whine(a, p) { a.tone(400, 1200, 0.35, 'sine', 0.08, 0, a.out(p)); },
  inflate(a, p) { a.tone(200, 600, 0.4, 'sine', 0.12, 0, a.out(p)); },
  flame(a, p) { const d = a.out(p); a.noise(0.18, 0.25, 1200, 0.6, 'lowpass', 0, d); a.noise(0.02, 0.15, 3000, 2, 'bandpass', 0.05, d); },
  tick(a) { a.tone(1200, 0, 0.01, 'square', 0.05); },
  beep(a, p) { a.tone(800, 0, 0.05, 'square', 0.12, 0, a.out(p)); },
  zap(a, p) { const d = a.out(p); a.tone(1200, 300, 0.2, 'sawtooth', 0.15, 0, d); a.noise(0.2, 0.2, 5000, 4, 'bandpass', 0, d); },
  engine(a, p) { const d = a.out(p); a.tone(70, 110, 0.5, 'sawtooth', 0.25, 0, d); a.noise(0.5, 0.2, 400, 1, 'lowpass', 0, d); },
};

const SONGS = {};
