// Procedural audio: every sound effect and every music track is synthesised with WebAudio at runtime.
// Music is a small look-ahead step sequencer (bass, lead, pad, drums) with a different feel per area.
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const degree = (scale, d) => scale[((d % scale.length) + scale.length) % scale.length] + 12 * Math.floor(d / scale.length);

// ------------------------------------------------------------------ music data
// drums: one 16-char string per bar: k kick, s snare, h hat, o open hat, b bongo, c clap, w wood block, t tom
const TRACKS = {
  jungle: {
    bpm: 118, root: 57, scale: [0, 2, 4, 7, 9], chords: [0, 0, 5, 7], padVol: 0.05,
    drums: ['k.h.b.h.k.hbb.h.', 'k.h.b.h.k.h.bbh.', 'k.hbb.h.k.h.b.hb', 'k.h.bbh.kchb.bh.'],
    bass: [[0, null, 0, null, 7, null, 0, null, 0, null, 0, null, 7, null, 5, null], [0, null, null, 0, null, 7, null, 0, 0, null, null, 7, null, 5, null, 7]],
    lead: [
      [4, null, null, 5, null, 4, null, 2, null, null, 0, null, 2, null, null, null],
      [2, null, null, 0, null, 2, null, 4, null, null, 5, null, 4, null, null, null],
      [5, null, null, 6, null, 5, null, 4, null, null, 2, null, 4, null, null, null],
      [4, null, 2, null, 0, null, 2, null, 4, null, null, null, null, null, null, null]],
    leadType: 'triangle', leadVol: 0.1,
  },
  title: {
    bpm: 100, root: 55, scale: [0, 2, 4, 7, 9], chords: [0, 5, 7, 0], padVol: 0.07,
    drums: ['k...b...k...b.b.', 'k...b...k.b.b...'],
    bass: [[0, null, null, null, 7, null, null, null, 0, null, null, null, 7, null, null, null]],
    lead: [
      [4, null, null, null, 5, null, 4, null, 2, null, null, null, null, null, null, null],
      [0, null, 2, null, 4, null, null, null, 2, null, null, null, null, null, null, null]],
    leadType: 'triangle', leadVol: 0.1,
  },
  temple: {
    bpm: 84, root: 50, scale: [0, 3, 5, 7, 10], chords: [0, 0, -2, -5], padVol: 0.055,
    drums: ['t...w...t.w.....', 'k...w.w.t...w...', 't...w...t.w.t...', 'k.w...w.t...w.t.'],
    bass: [[0, null, null, null, null, null, 7, null, 0, null, null, null, null, null, 5, null]],
    lead: [
      [null, null, 4, null, null, null, 2, null, null, null, 0, null, null, null, null, null],
      [null, null, 5, null, null, 4, null, null, 2, null, null, null, 0, null, null, null],
      [null, null, 4, null, null, null, 6, null, null, null, 5, null, null, null, 2, null],
      [0, null, null, null, 2, null, null, null, 0, null, null, null, null, null, null, null]],
    leadType: 'sine', leadVol: 0.13, pluck: true,
  },
  cavern: {
    bpm: 72, root: 52, scale: [0, 2, 4, 7, 9], chords: [0, 5, 7, 5], padVol: 0.075,
    drums: ['k.......t.......', '........t.....w.'],
    bass: [[0, null, null, null, null, null, null, null, 7, null, null, null, null, null, null, null]],
    lead: [
      [7, null, 9, null, 11, null, 9, null, 7, null, 4, null, 2, null, 4, null],
      [9, null, 11, null, 12, null, 11, null, 9, null, 7, null, 4, null, null, null]],
    leadType: 'sine', leadVol: 0.075, pluck: true, echo: true,
  },
  quarry: {
    bpm: 126, root: 45, scale: [0, 3, 5, 7, 10], chords: [0, 0, -2, 3], padVol: 0.04,
    drums: ['k.h.s.h.k.hks.h.', 'k.h.s.h.k.h.s.hk', 'k.hks.h.k.h.s.h.', 'k.h.s.hkk.h.s.o.'],
    bass: [[0, 0, null, 0, null, 0, 12, null, 0, 0, null, 0, null, 7, null, 5], [0, null, 0, 0, null, 7, null, 0, 0, null, 0, 0, null, 12, 10, null]],
    lead: [
      [null, null, null, null, 4, null, 3, null, null, null, 2, null, null, null, null, null],
      [4, null, null, 5, null, null, 4, null, 2, null, null, null, 3, null, null, null],
      [null, null, 6, null, 5, null, null, 4, null, null, 3, null, null, null, 2, null],
      [4, null, 4, null, null, 2, null, null, 0, null, null, null, null, null, null, null]],
    leadType: 'sawtooth', leadVol: 0.05, bassType: 'sawtooth',
  },
  tower: {
    bpm: 142, root: 53, scale: [0, 2, 4, 5, 7, 9, 11], chords: [0, 7, 9, 5], padVol: 0.035,
    drums: ['k.h.s.h.k.h.s.h.', 'k.hhs.h.k.h.s.hh', 'k.h.s.hhk.hhs.h.', 'kkh.s.h.k.hhs.sh'],
    bass: [[0, null, 7, null, 0, null, 7, null, 0, null, 7, null, 0, 7, 12, 7]],
    lead: [
      [7, null, 9, null, 11, null, 9, null, 7, null, 4, null, 7, null, null, null],
      [9, null, 11, null, 12, null, 11, null, 9, null, 7, null, 9, null, null, null],
      [11, null, 12, null, 14, null, 12, null, 11, null, 9, null, 7, null, 9, null],
      [7, 9, 11, 12, 11, 9, 7, 4, 7, null, null, null, null, null, null, null]],
    leadType: 'square', leadVol: 0.05, bassType: 'square',
  },
  boss: {
    bpm: 150, root: 40, scale: [0, 1, 3, 5, 7, 8, 10], chords: [0, 0, 1, -2], padVol: 0.05,
    drums: ['k.t.s.tkk.t.s.t.', 'k.tks.t.k.tts.tk', 'ktt.s.t.k.t.sttt', 'k.tks.tkktt.stss.'],
    bass: [[0, 0, null, 0, 0, null, 0, 12, 0, 0, null, 0, 0, null, 1, 0]],
    lead: [
      [null, null, 7, null, 8, null, 7, null, 4, null, null, null, 3, null, null, null],
      [7, null, 8, null, 9, null, 8, null, 7, null, 4, null, null, null, null, null],
      [null, null, 9, null, 10, null, 9, null, 7, null, 8, null, 7, null, 4, null],
      [4, null, 7, null, 4, null, 3, null, 0, null, null, null, null, null, null, null]],
    leadType: 'sawtooth', leadVol: 0.055, bassType: 'sawtooth',
  },
  victory: {
    bpm: 112, root: 60, scale: [0, 2, 4, 7, 9], chords: [0, 5, 7, 0], padVol: 0.08,
    drums: ['k...b.b.k...b.b.', 'k.b.b.b.k.c.b.b.'],
    bass: [[0, null, 7, null, 0, null, 7, null, 5, null, 7, null, 0, null, null, null]],
    lead: [
      [4, null, 5, null, 7, null, 9, null, 7, null, 5, null, 4, null, null, null],
      [5, null, 7, null, 9, null, 11, null, 9, null, 7, null, 5, null, null, null],
      [7, null, 9, null, 11, null, 14, null, 11, null, 9, null, 7, null, null, null],
      [9, null, 7, null, 5, null, 4, null, 2, null, 4, null, 0, null, null, null]],
    leadType: 'triangle', leadVol: 0.1,
  },
};

export class GameAudio {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.track = null;
    this.seq = null;
    this.timer = null;
    this.pending = null;
    this.duckOn = false;
    this.lastPlayed = {};
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch { return; }
      const c = this.ctx;
      this.master = c.createGain();
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -16; this.comp.ratio.value = 6; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
      this.master.connect(this.comp); this.comp.connect(c.destination);
      this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
      this.musicBus = c.createGain(); this.musicBus.connect(this.master);
      // echo send for music
      this.delay = c.createDelay(1); this.delay.delayTime.value = 0.3;
      const fb = c.createGain(); fb.gain.value = 0.34;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      this.echoSend = c.createGain(); this.echoSend.gain.value = 0;
      this.echoSend.connect(this.delay); this.delay.connect(lp); lp.connect(fb); fb.connect(this.delay); lp.connect(this.musicBus);
      const len = c.sampleRate;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.configure(this.settings);
      if (this.pending) { const p = this.pending; this.pending = null; this.track = null; this.music(p); }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  configure(s) {
    this.settings = s;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, s.volume)) * 0.9, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.music ? (this.duckOn ? 0.18 : 0.5) : 0, t, 0.15);
  }

  duck(on) { this.duckOn = on; this.configure(this.settings); }

  // ------------------------------------------------------------------ synth primitives
  tone(o) {
    const c = this.ctx;
    const t = c.currentTime + (o.when || 0);
    const osc = c.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.slide || o.dur));
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib; lg.gain.value = o.f * 0.03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + 0.1); }
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol), t + (o.att || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let out = g;
    osc.connect(g);
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); out = f; }
    out.connect(o.bus || this.sfxBus);
    if (o.echo && this.echoSend) { const s = c.createGain(); s.gain.value = o.echo; out.connect(s); s.connect(this.echoSend); }
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }

  noise(o) {
    const c = this.ctx;
    const t = c.currentTime + (o.when || 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.type || 'lowpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t + o.dur);
    f.Q.value = o.q || 0.7;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol), t + (o.att || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + o.dur + 0.05);
  }

  // ------------------------------------------------------------------ sound effects
  sfx(name, v = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const fn = SFX[name];
    if (!fn) return;
    const now = this.ctx.currentTime;
    const gap = SFX_GAP[name] ?? 0.03;
    if (now - (this.lastPlayed[name] || 0) < gap) return;
    this.lastPlayed[name] = now;
    fn(this, v);
  }

  // ------------------------------------------------------------------ music
  music(name) {
    if (!this.ctx) { this.pending = name; return; }
    if (this.track === name) return;
    this.track = name;
    if (this.timer) clearInterval(this.timer);
    const T = TRACKS[name];
    if (!T) { this.seq = null; return; }
    this.echoSend.gain.value = T.echo ? 0.5 : 0.18;
    this.seq = { T, step: 0, next: this.ctx.currentTime + 0.12 };
    this.timer = setInterval(() => this.pump(), 30);
  }

  pump() {
    const s = this.seq, c = this.ctx;
    if (!s || !c || c.state !== 'running') { if (s && c) s.next = Math.max(s.next, c.currentTime); return; }
    const stepDur = 60 / s.T.bpm / 4;
    while (s.next < c.currentTime + 0.14) { this.playStep(s.T, s.step, s.next - c.currentTime); s.next += stepDur; s.step++; }
  }

  playStep(T, step, when) {
    const bar = Math.floor(step / 16), st = step % 16;
    const chord = T.chords[bar % T.chords.length];
    const bus = this.musicBus;
    const stepDur = 60 / T.bpm / 4;
    // drums
    const d = T.drums[bar % T.drums.length][st];
    if (d === 'k') { this.tone({ f: 150, f2: 42, type: 'sine', dur: 0.2, vol: 0.5, when, bus }); }
    else if (d === 's') { this.noise({ dur: 0.14, vol: 0.2, f: 1900, type: 'bandpass', q: 0.8, when, bus }); this.tone({ f: 220, f2: 120, type: 'triangle', dur: 0.1, vol: 0.12, when, bus }); }
    else if (d === 'h') this.noise({ dur: 0.04, vol: 0.07, f: 7000, type: 'highpass', when, bus });
    else if (d === 'o') this.noise({ dur: 0.18, vol: 0.07, f: 6500, type: 'highpass', when, bus });
    else if (d === 'b') this.tone({ f: 420 + (st % 3) * 60, f2: 290 + (st % 3) * 40, type: 'sine', dur: 0.11, vol: 0.2, when, bus });
    else if (d === 'c') this.noise({ dur: 0.12, vol: 0.14, f: 1500, type: 'bandpass', q: 1.2, when, bus });
    else if (d === 'w') this.tone({ f: 900, f2: 700, type: 'square', dur: 0.04, vol: 0.06, when, bus, lp: 2500 });
    else if (d === 't') this.tone({ f: 130 + (st % 4) * 14, f2: 70, type: 'sine', dur: 0.22, vol: 0.34, when, bus });
    // bass
    const bp = T.bass[bar % T.bass.length][st];
    if (bp != null) this.tone({ f: midi(T.root - 12 + chord + bp), type: T.bassType || 'triangle', dur: stepDur * 1.7, vol: T.bassType ? 0.1 : 0.2, when, bus, lp: 700 });
    // lead
    const lp = T.lead[bar % T.lead.length][st];
    if (lp != null) {
      const n = T.root + 12 + chord + degree(T.scale, lp);
      this.tone({ f: midi(n), type: T.leadType, dur: T.pluck ? stepDur * 3 : stepDur * 1.6, vol: T.leadVol, att: T.pluck ? 0.003 : 0.01, when, bus, lp: 3200, echo: T.echo ? 0.7 : 0.3 });
    }
    // pad: a soft triad each bar
    if (st === 0) {
      const dur = stepDur * 16;
      for (const iv of [0, 7, 12]) this.tone({ f: midi(T.root + chord + iv + 12), type: 'sawtooth', dur, vol: T.padVol * 0.5, att: dur * 0.35, when, bus, lp: 900 });
    }
  }
}

// ------------------------------------------------------------------ SFX table
const SFX_GAP = { step: 0.12, land: 0.08, banana: 0.04, hit: 0.05, tick: 0.02, boomerang: 0.15, pop: 0.05 };
const SFX = {
  jump: (a, v) => a.tone({ f: 300, f2: 640, type: 'square', dur: 0.16, vol: 0.09 * v, lp: 3000 }),
  rolljump: (a, v) => { a.tone({ f: 240, f2: 760, type: 'triangle', dur: 0.24, vol: 0.14 * v }); a.noise({ dur: 0.2, vol: 0.06 * v, f: 1500, f2: 400, type: 'bandpass' }); },
  land: (a, v) => { a.noise({ dur: 0.1, vol: 0.14 * v, f: 500 }); a.tone({ f: 120, f2: 55, type: 'sine', dur: 0.13, vol: 0.22 * v }); },
  step: (a, v) => a.noise({ dur: 0.04, vol: 0.05 * v, f: 900, type: 'bandpass' }),
  roll: (a, v) => { a.noise({ dur: 0.4, vol: 0.14 * v, f: 700, f2: 250, type: 'lowpass', q: 1 }); a.tone({ f: 150, f2: 90, type: 'triangle', dur: 0.3, vol: 0.1 * v }); },
  spring: (a, v) => { a.tone({ f: 180, f2: 900, type: 'sine', dur: 0.32, vol: 0.2 * v, vib: 22 }); a.tone({ f: 360, f2: 1300, type: 'triangle', dur: 0.2, vol: 0.06 * v }); },
  poundWind: (a, v) => a.tone({ f: 200, f2: 520, type: 'sawtooth', dur: 0.2, vol: 0.06 * v, lp: 1200 }),
  poundFall: (a, v) => a.noise({ dur: 0.3, vol: 0.12 * v, f: 2200, f2: 300, type: 'bandpass' }),
  pound: (a, v) => { a.tone({ f: 130, f2: 30, type: 'sine', dur: 0.6, vol: 0.55 * v }); a.noise({ dur: 0.5, vol: 0.3 * v, f: 500, f2: 120 }); },
  drop: (a, v) => a.tone({ f: 500, f2: 250, type: 'square', dur: 0.08, vol: 0.05 * v }),
  grab: (a, v) => a.tone({ f: 600, type: 'square', dur: 0.04, vol: 0.05 * v }),
  hurt: (a, v) => { a.tone({ f: 420, f2: 80, type: 'sawtooth', dur: 0.4, vol: 0.18 * v, lp: 1800 }); a.noise({ dur: 0.18, vol: 0.12 * v, f: 1200 }); },
  lava: (a, v) => { a.noise({ dur: 0.6, vol: 0.2 * v, f: 1800, f2: 300, type: 'bandpass' }); a.tone({ f: 300, f2: 60, type: 'sawtooth', dur: 0.5, vol: 0.12 * v }); },
  splash: (a, v) => a.noise({ dur: 0.5, vol: 0.2 * v, f: 2400, f2: 500, type: 'bandpass', q: 0.5 }),
  respawn: (a, v) => [0, 4, 7, 12].forEach((n, i) => a.tone({ f: midi(72 + n), type: 'triangle', dur: 0.15, vol: 0.09 * v, when: i * 0.05 })),
  slap: (a, v) => { a.noise({ dur: 0.13, vol: 0.18 * v, f: 1600, type: 'bandpass', q: 0.9 }); a.tone({ f: 200, f2: 80, type: 'triangle', dur: 0.12, vol: 0.14 * v }); },
  boomerang: (a, v) => a.tone({ f: 520, f2: 640, type: 'triangle', dur: 0.2, vol: 0.05 * v, vib: 30 }),
  throw: (a, v) => a.noise({ dur: 0.18, vol: 0.1 * v, f: 900, f2: 2500, type: 'bandpass' }),
  catch: (a, v) => a.tone({ f: 700, f2: 1000, type: 'sine', dur: 0.1, vol: 0.12 * v }),
  banana: (a, v) => { a.tone({ f: 988, type: 'square', dur: 0.07, vol: 0.06 * v, lp: 4000 }); a.tone({ f: 1319, type: 'square', dur: 0.14, vol: 0.06 * v, when: 0.06, lp: 4000 }); },
  heart: (a, v) => [0, 4, 7, 12, 16].forEach((n, i) => a.tone({ f: midi(67 + n), type: 'triangle', dur: 0.3, vol: 0.13 * v, when: i * 0.08 })),
  item: (a, v) => [0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => { a.tone({ f: midi(60 + n), type: 'square', dur: 0.28, vol: 0.07 * v, when: i * 0.11, lp: 3000 }); a.tone({ f: midi(48 + n), type: 'triangle', dur: 0.3, vol: 0.12 * v, when: i * 0.11 }); }),
  save: (a, v) => [0, 7, 12, 19].forEach((n, i) => a.tone({ f: midi(76 + n), type: 'sine', dur: 0.5, vol: 0.14 * v, when: i * 0.08, echo: 0.5 })),
  switch: (a, v) => { a.tone({ f: 300, f2: 1400, type: 'sawtooth', dur: 0.3, vol: 0.1 * v, lp: 3000 }); a.noise({ dur: 0.3, vol: 0.1 * v, f: 4000, type: 'highpass' }); },
  door: (a, v) => a.noise({ dur: 0.3, vol: 0.1 * v, f: 500, f2: 1800, type: 'bandpass' }),
  crate: (a, v) => { a.noise({ dur: 0.25, vol: 0.25 * v, f: 1400, f2: 300, type: 'bandpass', q: 0.6 }); a.tone({ f: 200, f2: 90, type: 'square', dur: 0.1, vol: 0.1 * v, lp: 800 }); },
  slab: (a, v) => { a.noise({ dur: 0.3, vol: 0.2 * v, f: 700, f2: 150 }); a.tone({ f: 100, f2: 50, type: 'sine', dur: 0.25, vol: 0.2 * v }); },
  clang: (a, v) => { a.tone({ f: 1500, type: 'square', dur: 0.1, vol: 0.06 * v }); a.tone({ f: 2100, type: 'square', dur: 0.08, vol: 0.04 * v }); a.noise({ dur: 0.06, vol: 0.08 * v, f: 6000, type: 'highpass' }); },
  hit: (a, v) => { a.noise({ dur: 0.08, vol: 0.15 * v, f: 1800, type: 'bandpass' }); a.tone({ f: 260, f2: 120, type: 'triangle', dur: 0.08, vol: 0.12 * v }); },
  pop: (a, v) => { a.tone({ f: 700, f2: 180, type: 'sine', dur: 0.18, vol: 0.2 * v }); a.noise({ dur: 0.1, vol: 0.1 * v, f: 3000, type: 'highpass' }); },
  stomp: (a, v) => { a.tone({ f: 260, f2: 90, type: 'sine', dur: 0.12, vol: 0.2 * v }); a.noise({ dur: 0.05, vol: 0.1 * v, f: 2000 }); },
  snap: (a, v) => { a.noise({ dur: 0.05, vol: 0.12 * v, f: 3000, type: 'highpass' }); a.noise({ dur: 0.05, vol: 0.12 * v, f: 3000, type: 'highpass', when: 0.1 }); },
  bat: (a, v) => a.tone({ f: 1500, f2: 900, type: 'square', dur: 0.14, vol: 0.04 * v, vib: 40 }),
  fire: (a, v) => { a.noise({ dur: 0.3, vol: 0.14 * v, f: 1200, f2: 500, type: 'bandpass' }); a.tone({ f: 260, f2: 110, type: 'sawtooth', dur: 0.25, vol: 0.08 * v, lp: 1200 }); },
  fizz: (a, v) => a.noise({ dur: 0.15, vol: 0.08 * v, f: 5000, type: 'highpass' }),
  reflect: (a, v) => { a.tone({ f: 600, f2: 1500, type: 'triangle', dur: 0.18, vol: 0.14 * v }); a.noise({ dur: 0.08, vol: 0.08 * v, f: 5000, type: 'highpass' }); },
  blob: (a, v) => a.tone({ f: 120, f2: 320, type: 'sine', dur: 0.2, vol: 0.18 * v }),
  rock: (a, v) => { a.noise({ dur: 0.35, vol: 0.25 * v, f: 600, f2: 150 }); a.tone({ f: 90, f2: 45, type: 'sine', dur: 0.25, vol: 0.2 * v }); },
  cannon: (a, v) => { a.tone({ f: 110, f2: 40, type: 'sine', dur: 0.35, vol: 0.4 * v }); a.noise({ dur: 0.3, vol: 0.2 * v, f: 900, f2: 200 }); },
  menu: (a, v) => { a.tone({ f: 660, type: 'square', dur: 0.06, vol: 0.06 * v, lp: 3000 }); a.tone({ f: 990, type: 'square', dur: 0.1, vol: 0.06 * v, when: 0.05, lp: 3000 }); },
  tick: (a, v) => a.tone({ f: 800, type: 'square', dur: 0.025, vol: 0.04 * v, lp: 3000 }),
  die: (a, v) => [0, -3, -7, -12, -15].forEach((n, i) => a.tone({ f: midi(64 + n), type: 'sawtooth', dur: 0.3, vol: 0.12 * v, when: i * 0.14, lp: 1500 })),
  roar: (a, v) => { a.tone({ f: 110, f2: 55, type: 'sawtooth', dur: 0.9, vol: 0.3 * v, lp: 900, vib: 14 }); a.noise({ dur: 0.9, vol: 0.14 * v, f: 700, f2: 200 }); },
  bossHit: (a, v) => { a.noise({ dur: 0.18, vol: 0.25 * v, f: 1200, f2: 300, type: 'bandpass' }); a.tone({ f: 150, f2: 60, type: 'square', dur: 0.2, vol: 0.14 * v, lp: 900 }); },
  bossDie: (a, v) => { a.noise({ dur: 1.6, vol: 0.3 * v, f: 900, f2: 60 }); [0, -2, -5, -9, -12, -16].forEach((n, i) => a.tone({ f: midi(60 + n), type: 'sawtooth', dur: 0.4, vol: 0.12 * v, when: i * 0.2, lp: 1500 })); },
  warn: (a, v) => { a.tone({ f: 880, type: 'square', dur: 0.08, vol: 0.06 * v }); a.tone({ f: 880, type: 'square', dur: 0.08, vol: 0.06 * v, when: 0.14 }); },
  shockwave: (a, v) => a.tone({ f: 90, f2: 40, type: 'sine', dur: 0.5, vol: 0.4 * v }),
  web: (a, v) => a.noise({ dur: 0.25, vol: 0.1 * v, f: 3000, f2: 6000, type: 'bandpass' }),
};
