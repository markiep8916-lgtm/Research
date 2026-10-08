// VOIDPATH audio: every sound effect and music track, synthesised with WebAudio.
// No samples, no network: oscillators, filtered noise, FM and a procedural reverb impulse.
//
// Graph (one "rig" per BaseAudioContext, see createRig):
//
//   sfx voices ----> sfx.dry ----------------------------\
//                \-> sfx.wet / sfx.echo --\               \
//   track strips --> bed (duck) --> music.dry ------------+--> master -> highpass -> limiter -> destination
//   sting strips -------------/ \-> music.wet / .echo --> reverb (2.2 s convolution) / ping-pong delay --/
//
// Synthesis functions take (rig, time) so the same code renders live (AudioContext) and offline
// (OfflineAudioContext, used by the preview bench to measure peaks/RMS). The `audio` singleton
// at the bottom is the game-facing API from CONTRACTS.md and TECH_PLAN 9. Nothing touches WebAudio
// at module level, so `compileTrack`, `TRACKS` and `MOTIFS` import in node (tests/audio.test.mjs).

import { clamp, makeRng } from './util.js';

// ------------------------------------------------------------------ levels

// Bus trims: sfx peaks land around -6 dBFS, music sits under them (~-22 dBFS RMS).
const SFX_TRIM = 1.0;
const MUSIC_TRIM = 0.62;
const VERB_RETURN = 0.55;
const ECHO_RETURN = 0.42;
const FADE = 0.8; // music crossfade seconds
const DUCK = 0.16; // bed level under a sting (about -16 dB)
const STING_TAIL = 4; // seconds a finished sting keeps its strips for the reverb tail
const LOOKAHEAD = 0.12; // seconds of music scheduled ahead of the audio clock
const TICK_MS = 25;

const DEFAULT_VOLUME = { master: 1, music: 0.8, sfx: 0.9 };
const PREFS_KEY = 'voidpath.audio';

/** Slider value (0-1) -> gain. Squared so the low end of a volume slider is usable. */
const volGain = (v) => clamp(v, 0, 1) ** 2;

// ------------------------------------------------------------------ small helpers

const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_RE = /^([A-G])(#|b)?(-?\d)$/;

/** 'A4' -> 69, 'C#5' -> 73, 'Bb1' -> 34. Returns NaN for anything else. */
export function noteMidi(name) {
  const m = NOTE_RE.exec(name);
  if (!m) return NaN;
  return 12 * (Number(m[3]) + 1) + NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
export const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const MAX_HZ = 20000; // keep every frequency under Nyquist (pitch-shifted FM modulators can exceed it)
const hz = (f) => clamp(f, 1, MAX_HZ);

function gainNode(ctx, v = 1) {
  const n = ctx.createGain();
  n.gain.value = v;
  return n;
}

function filterNode(ctx, type, f, q = 0.707) {
  const n = ctx.createBiquadFilter();
  n.type = type;
  n.frequency.value = hz(f);
  n.Q.value = q;
  return n;
}

function oscNode(r, type, f) {
  const o = r.ctx.createOscillator();
  if (type === 'pulse') o.setPeriodicWave(r.pulse);
  else o.type = type;
  o.frequency.value = hz(f);
  return o;
}

/** Stereo panner, or a plain gain where StereoPannerNode is missing (iOS Safari < 14.1). */
function panNode(ctx, v) {
  if (!ctx.createStereoPanner) return gainNode(ctx, 1);
  const p = ctx.createStereoPanner();
  p.pan.value = clamp(v, -1, 1);
  return p;
}

function noiseSource(r, t) {
  const s = r.ctx.createBufferSource();
  s.buffer = r.noise;
  s.loop = true;
  s.start(t, Math.random() * 1.8);
  return s;
}

/**
 * Percussive envelope on a gain param: 0 -> peak over `a` s, optional `hold` at peak,
 * then exponential decay that reaches about -54 dB after `d` s. Returns the time the
 * sound is inaudible (use it to stop the sources).
 */
function envAD(p, t, a, d, peak, hold = 0) {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  if (hold > 0) p.setValueAtTime(peak, t + a + hold);
  p.setTargetAtTime(0, t + a + hold, d / 6.2);
  return t + a + hold + d + 0.02;
}

/** Frequency sweep on a param: f0 -> f1 over `glide` s (exponential), then optional f2 over glide2. */
function sweep(p, t, f0, f1, glide, f2, glide2) {
  p.setValueAtTime(hz(f0), t);
  if (f1 != null && f1 !== f0) p.exponentialRampToValueAtTime(hz(f1), t + glide);
  if (f2 != null) p.exponentialRampToValueAtTime(hz(f2), t + glide + glide2);
}

// ------------------------------------------------------------------ cached sample data

const dataCache = new Map();

/** Stereo reverb impulse: decaying noise whose highs die faster (dark, ~2.2 s), cached per sample rate. */
function impulseData(sr, seconds = 2.2) {
  const key = `ir:${sr}`;
  if (dataCache.has(key)) return dataCache.get(key);
  const n = Math.floor(sr * seconds);
  const rng = makeRng(0x5eed);
  const chans = [new Float32Array(n), new Float32Array(n)];
  const pre = Math.floor(sr * 0.012);
  for (const out of chans) {
    let lp1 = 0;
    let lp2 = 0;
    for (let i = pre; i < n; i++) {
      const t = i / sr;
      const k = 0.55 * Math.exp(-t * 2.6) + 0.07; // one-pole coefficient falls => tail darkens
      lp1 += k * (rng() * 2 - 1 - lp1);
      lp2 += k * (lp1 - lp2);
      const env = Math.exp(-t * 2.1) * (1 - t / seconds) ** 1.5 * Math.min(1, (i - pre) / (sr * 0.02));
      out[i] = lp2 * env;
    }
  }
  // A few early reflections give the room a sense of size before the diffuse tail.
  const taps = [[0.017, 0.5, 0.2], [0.029, -0.3, 0.45], [0.041, 0.25, -0.35], [0.053, -0.2, 0.18]];
  for (const [dt, l, rr] of taps) {
    const i = Math.floor(dt * sr);
    chans[0][i] += l * 0.05;
    chans[1][i] += rr * 0.05;
  }
  dataCache.set(key, chans);
  return chans;
}

function noiseData(sr) {
  const key = `noise:${sr}`;
  if (dataCache.has(key)) return dataCache.get(key);
  const n = sr * 2;
  const d = new Float32Array(n);
  const rng = makeRng(77);
  for (let i = 0; i < n; i++) d[i] = rng() * 2 - 1;
  dataCache.set(key, d);
  return d;
}

let driveCurve = null;
/** Soft-clip curve for crunch layers. */
function getDriveCurve() {
  if (driveCurve) return driveCurve;
  driveCurve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1023) * 2 - 1;
    driveCurve[i] = Math.tanh(x * 3.2) / Math.tanh(3.2);
  }
  return driveCurve;
}

// ------------------------------------------------------------------ the rig (audio graph)

/**
 * Build the full graph on any BaseAudioContext. Live play uses one rig on the AudioContext;
 * the preview bench builds a fresh rig per OfflineAudioContext render.
 */
export function createRig(ctx, destination = ctx.destination, { volume = DEFAULT_VOLUME, muted = false } = {}) {
  const sr = ctx.sampleRate;
  const r = { ctx };

  r.master = gainNode(ctx, 1);
  const lowCut = filterNode(ctx, 'highpass', 24, 0.6);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3.5;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.14;
  r.master.connect(lowCut).connect(limiter).connect(destination);
  r.limiter = limiter;

  // Reverb: shared convolver, fed by the wet sends of both buses.
  const verb = ctx.createConvolver();
  const ir = impulseData(sr);
  const irBuf = ctx.createBuffer(2, ir[0].length, sr);
  irBuf.copyToChannel(ir[0], 0);
  irBuf.copyToChannel(ir[1], 1);
  verb.buffer = irBuf;
  const verbIn = gainNode(ctx, 1);
  const verbHp = filterNode(ctx, 'highpass', 180, 0.6); // keep lows out of the tail (no mud)
  verbIn.connect(verbHp).connect(verb).connect(gainNode(ctx, VERB_RETURN)).connect(r.master);

  // Ping-pong delay: L tap then R tap, feedback through a lowpass so repeats darken.
  const echoIn = gainNode(ctx, 1);
  const dl = ctx.createDelay(2);
  const dr = ctx.createDelay(2);
  dl.delayTime.value = dr.delayTime.value = 0.36;
  const fb = gainNode(ctx, 0.34);
  const fbLp = filterNode(ctx, 'lowpass', 2600, 0.5);
  const fbHp = filterNode(ctx, 'highpass', 260, 0.5);
  echoIn.connect(fbHp).connect(dl);
  dl.connect(dr);
  dr.connect(fbLp).connect(fb).connect(dl);
  const merger = ctx.createChannelMerger(2);
  dl.connect(merger, 0, 0);
  dr.connect(merger, 0, 1);
  const echoOut = gainNode(ctx, ECHO_RETURN);
  merger.connect(echoOut).connect(r.master);
  echoOut.connect(gainNode(ctx, 0.3)).connect(verbIn);
  r.delays = [dl, dr];

  const bus = () => {
    const b = { dry: gainNode(ctx, 1), wet: gainNode(ctx, 1), echo: gainNode(ctx, 1) };
    b.dry.connect(r.master);
    b.wet.connect(verbIn);
    b.echo.connect(echoIn);
    return b;
  };
  r.sfx = bus();
  r.music = bus();
  // Looping tracks play into the bed so a sting can duck them; stings go straight to r.music.
  r.bed = {};
  for (const k of ['dry', 'wet', 'echo']) (r.bed[k] = gainNode(ctx, 1)).connect(r.music[k]);

  const nb = ctx.createBuffer(1, sr * 2, sr);
  nb.copyToChannel(noiseData(sr), 0);
  r.noise = nb;

  // 25% pulse wave (brighter, nasal "chip" tone for plucks and leads).
  const H = 40;
  const re = new Float32Array(H);
  const im = new Float32Array(H);
  for (let k = 1; k < H; k++) {
    re[k] = Math.sin(2 * Math.PI * k * 0.25) / (k * Math.PI);
    im[k] = (1 - Math.cos(2 * Math.PI * k * 0.25)) / (k * Math.PI);
  }
  r.pulse = ctx.createPeriodicWave(re, im);

  r.setLevels = (vol, mute, when = ctx.currentTime, ramp = 0.05) => {
    const set = (p, v) => {
      p.cancelScheduledValues(when);
      p.setValueAtTime(p.value, when);
      p.linearRampToValueAtTime(v, when + ramp);
    };
    set(r.master.gain, mute ? 0 : volGain(vol.master));
    const m = volGain(vol.music) * MUSIC_TRIM;
    const s = volGain(vol.sfx) * SFX_TRIM;
    for (const k of ['dry', 'wet', 'echo']) {
      set(r.music[k].gain, m);
      set(r.sfx[k].gain, s);
    }
  };
  r.setDelay = (seconds, when = ctx.currentTime) => {
    for (const d of r.delays) d.delayTime.setTargetAtTime(clamp(seconds, 0.05, 1.9), when, 0.15);
  };
  /** Duck the bed from `when` until `until`, then bring it back over 1.4 s. A later call re-plans it. */
  r.duck = (when, until) => {
    for (const g of Object.values(r.bed)) {
      const p = g.gain;
      p.cancelScheduledValues(when);
      p.setValueAtTime(p.value, when);
      p.linearRampToValueAtTime(DUCK, when + 0.3);
      p.setValueAtTime(DUCK, Math.max(when + 0.3, until - 0.4));
      p.linearRampToValueAtTime(1, until + 1.4);
    }
  };
  r.setLevels(volume, muted, 0, 0.001);
  return r;
}

// ------------------------------------------------------------------ layer primitives
// Every primitive schedules one self-contained layer at time t into `out` and stops its sources.

/** Per-call output group for an sfx: volume -> pan -> sfx dry bus, plus reverb/delay sends. */
function sfxVoice(r, { vol = 1, pan = 0, wet = 0.15, echo = 0 }) {
  const ctx = r.ctx;
  const inp = gainNode(ctx, vol);
  let node = inp;
  if (pan) node = inp.connect(panNode(ctx, pan));
  node.connect(r.sfx.dry);
  if (wet > 0) node.connect(gainNode(ctx, wet)).connect(r.sfx.wet);
  if (echo > 0) node.connect(gainNode(ctx, echo)).connect(r.sfx.echo);
  return inp;
}

const crushCurves = new Map();
/** Staircase curve with `levels` steps: a bit-crusher's quantised, digital grit. */
function getCrushCurve(levels) {
  if (crushCurves.has(levels)) return crushCurves.get(levels);
  const c = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) c[i] = Math.round(((i / 1023) * 2 - 1) * levels) / levels;
  crushCurves.set(levels, c);
  return c;
}

/**
 * Oscillator layer. Options:
 *  type, f, f1 (glide target), glide, f2/glide2 (second leg), a, d, hold, vol, detune (cents),
 *  crush (staircase steps, applied to the raw wave), lp / lp1 / lpGlide / lpQ (lowpass + sweep), hp, bp/bpQ,
 *  drive (soft clip), trem / tremDepth (Hz / 0-1).
 */
function tone(r, out, t, o) {
  const ctx = r.ctx;
  const osc = oscNode(r, o.type || 'sine', o.f);
  if (o.detune) osc.detune.value = o.detune;
  sweep(osc.frequency, t, o.f, o.f1, o.glide ?? 0.1, o.f2, o.glide2 ?? 0.1);
  let node = osc;
  if (o.crush) {
    const ws = ctx.createWaveShaper();
    ws.curve = getCrushCurve(o.crush);
    node = node.connect(ws);
  }
  if (o.lp) {
    const f = filterNode(ctx, 'lowpass', o.lp, o.lpQ ?? 0.9);
    sweep(f.frequency, t, o.lp, o.lp1, o.lpGlide ?? o.glide ?? 0.1);
    node = node.connect(f);
  }
  if (o.hp) node = node.connect(filterNode(ctx, 'highpass', o.hp, 0.7));
  if (o.bp) node = node.connect(filterNode(ctx, 'bandpass', o.bp, o.bpQ ?? 2));
  if (o.drive) {
    const ws = ctx.createWaveShaper();
    ws.curve = getDriveCurve();
    node = node.connect(ws);
  }
  const v = gainNode(ctx, 0);
  node.connect(v);
  let last = v;
  let lfo = null;
  if (o.trem) {
    const tg = gainNode(ctx, 1 - (o.tremDepth ?? 0.5) / 2);
    lfo = oscNode(r, 'sine', o.trem);
    lfo.connect(gainNode(ctx, (o.tremDepth ?? 0.5) / 2)).connect(tg.gain);
    last = v.connect(tg);
  }
  last.connect(out);
  const end = envAD(v.gain, t, o.a ?? 0.003, o.d ?? 0.2, o.vol ?? 0.5, o.hold ?? 0);
  osc.start(t);
  osc.stop(end);
  if (lfo) { lfo.start(t); lfo.stop(end); }
  return end;
}

/** Filtered-noise layer: type (bandpass/highpass/lowpass), f, f1, glide, f2, glide2, q, a, d, hold, vol, drive. */
function noise(r, out, t, o) {
  const ctx = r.ctx;
  const src = noiseSource(r, t);
  const f = filterNode(ctx, o.type || 'bandpass', o.f ?? 2000, o.q ?? 1);
  sweep(f.frequency, t, o.f ?? 2000, o.f1, o.glide ?? 0.1, o.f2, o.glide2 ?? 0.1);
  let node = src.connect(f);
  if (o.drive) {
    const ws = ctx.createWaveShaper();
    ws.curve = getDriveCurve();
    node = node.connect(ws);
  }
  const v = gainNode(ctx, 0);
  node.connect(v).connect(out);
  const end = envAD(v.gain, t, o.a ?? 0.002, o.d ?? 0.1, o.vol ?? 0.5, o.hold ?? 0);
  src.stop(end);
  return end;
}

/**
 * FM bell / metallic ring: sine carrier modulated by a sine at f*ratio whose index decays
 * (bright strike -> mellow ring). ratio 2-4 = chime/celesta, 2.76 / 1.41 = clangy metal.
 */
function bell(r, out, t, o) {
  const ctx = r.ctx;
  const f = o.f;
  const car = oscNode(r, 'sine', f);
  const mod = oscNode(r, 'sine', f * (o.ratio ?? 3.5));
  const idx = gainNode(ctx, 0);
  const peakIdx = f * (o.index ?? 1.5);
  idx.gain.setValueAtTime(peakIdx, t);
  idx.gain.setTargetAtTime(peakIdx * (o.idxFloor ?? 0.08), t, o.idxDecay ?? 0.12);
  mod.connect(idx).connect(car.frequency);
  const v = gainNode(ctx, 0);
  car.connect(v).connect(out);
  const end = envAD(v.gain, t, o.a ?? 0.002, o.d ?? 1.0, o.vol ?? 0.3, o.hold ?? 0);
  car.start(t); mod.start(t);
  car.stop(end); mod.stop(end);
  return end;
}

/** Sine-sweep kick with a short click. */
function kick(r, out, t, vel = 1, o = {}) {
  tone(r, out, t, { f: o.f0 ?? 150, f1: o.f1 ?? 44, glide: o.sweep ?? 0.1, a: 0.001, d: o.d ?? 0.34, vol: vel * (o.vol ?? 0.95) });
  noise(r, out, t, { type: 'highpass', f: 2600, q: 0.7, d: 0.012, vol: vel * (o.click ?? 0.22) });
  if (o.punch) tone(r, out, t, { type: 'triangle', f: 320, f1: 120, glide: 0.03, d: 0.05, vol: vel * o.punch });
}

function snare(r, out, t, vel = 1, o = {}) {
  noise(r, out, t, { type: 'bandpass', f: o.f ?? 2300, q: 0.6, a: 0.001, d: o.d ?? 0.2, vol: vel * 0.55 });
  noise(r, out, t, { type: 'highpass', f: 6500, q: 0.7, d: 0.09, vol: vel * 0.22 });
  tone(r, out, t, { type: 'triangle', f: o.tone ?? 210, f1: (o.tone ?? 210) * 0.8, glide: 0.05, a: 0.001, d: 0.1, vol: vel * 0.42 });
}

/** Hi-hat; o.f / o.d retune it (a lower, shorter hat makes a shaker). */
function hat(r, out, t, vel = 1, open = false, o = {}) {
  noise(r, out, t, { type: 'highpass', f: o.f ?? 7600, q: 0.8, a: 0.001, d: open ? 0.32 : o.d ?? 0.05, vol: vel * 0.32 });
}

function crash(r, out, t, vel = 1) {
  noise(r, out, t, { type: 'highpass', f: 4200, q: 0.6, a: 0.002, d: 1.7, vol: vel * 0.3 });
  noise(r, out, t, { type: 'bandpass', f: 6800, q: 1.2, a: 0.001, d: 0.7, vol: vel * 0.18 });
  bell(r, out, t, { f: 523, ratio: 2.76, index: 4, idxDecay: 0.3, d: 1.0, vol: vel * 0.04 });
}

function tom(r, out, t, vel = 1, f = 110) {
  tone(r, out, t, { f: f * 1.7, f1: f, glide: 0.06, a: 0.001, d: 0.32, vol: vel * 0.75 });
  noise(r, out, t, { type: 'lowpass', f: 1600, q: 0.7, d: 0.04, vol: vel * 0.2 });
}

/** Brass chord: two detuned saws per note through a lowpass whose envelope gives the "blat". */
function brass(r, out, t, freqs, o = {}) {
  const ctx = r.ctx;
  const a = o.a ?? 0.012;
  const hold = o.hold ?? 0.06;
  const d = o.d ?? 0.35;
  const lp = filterNode(ctx, 'lowpass', 400, o.q ?? 1.4);
  const top = o.cutoff ?? 3600;
  lp.frequency.setValueAtTime(o.base ?? 500, t);
  lp.frequency.linearRampToValueAtTime(top, t + a + 0.02);
  lp.frequency.setTargetAtTime(o.sustainCut ?? 1100, t + a + 0.03, 0.08);
  const v = gainNode(ctx, 0);
  lp.connect(v).connect(out);
  const end = envAD(v.gain, t, a, d, (o.vol ?? 0.3) / Math.sqrt(freqs.length), hold);
  for (const f of freqs) {
    for (const cents of [-8, 7]) {
      const osc = oscNode(r, 'sawtooth', f);
      osc.detune.value = cents;
      osc.connect(lp);
      osc.start(t);
      osc.stop(end);
    }
  }
  return end;
}

// ------------------------------------------------------------------ sound effects
// Each entry: gain (overall level), wet / echo (reverb / delay sends), vary (random pitch
// spread per call so repeats never machine-gun) and play(rig, out, t, pitchMul, opts).
// Layers follow transient + body + tail.

const C6 = 1046.5;
// WARDEN's per-box 'choir' sfx sings one of these chords of its F minor song (Fm, Db, Ab, Bbm), or one of
// the playing track's `choirSfx` chords, so WARDEN always sings in the key of the room it speaks in.
const CHOIR_SFX = [['F3', 'Ab3', 'C4', 'F4'], ['Db3', 'Ab3', 'C4', 'F4'], ['Ab2', 'Eb3', 'Ab3', 'C4'], ['Bb2', 'F3', 'Db4', 'F4']];
const SFX = {
  cursor: { gain: 0.36, wet: 0.08, vary: 0.03, play(r, o, t, p) {
    tone(r, o, t, { f: 2350 * p, f1: 2150 * p, glide: 0.03, a: 0.001, d: 0.05, vol: 0.3 });
    tone(r, o, t, { type: 'triangle', f: 1175 * p, a: 0.001, d: 0.035, vol: 0.14 });
    noise(r, o, t, { type: 'highpass', f: 6000, d: 0.008, vol: 0.09 });
  } },
  confirm: { gain: 0.53, wet: 0.22, echo: 0.1, vary: 0.012, play(r, o, t, p) {
    noise(r, o, t, { type: 'highpass', f: 5000, d: 0.012, vol: 0.12 });
    bell(r, o, t, { f: 1318.5 * p, ratio: 2, index: 1.1, d: 0.32, vol: 0.32 });
    bell(r, o, t + 0.065, { f: 1975.5 * p, ratio: 2, index: 0.9, d: 0.55, vol: 0.34 });
    tone(r, o, t + 0.065, { f: 3951 * p, a: 0.001, d: 0.12, vol: 0.05 });
  } },
  cancel: { gain: 0.53, wet: 0.14, vary: 0.02, play(r, o, t, p) {
    tone(r, o, t, { type: 'triangle', f: 880 * p, f1: 760 * p, glide: 0.06, a: 0.002, d: 0.09, vol: 0.34 });
    tone(r, o, t + 0.06, { type: 'triangle', f: 587 * p, f1: 540 * p, glide: 0.08, a: 0.002, d: 0.13, vol: 0.3 });
  } },
  error: { gain: 0.44, wet: 0.08, vary: 0.01, play(r, o, t, p) {
    for (const dt of [0, 0.11]) {
      tone(r, o, t + dt, { type: 'square', f: 155 * p, lp: 1500, a: 0.004, d: 0.09, hold: 0.03, vol: 0.24 });
      tone(r, o, t + dt, { type: 'sawtooth', f: 147 * p, lp: 1200, a: 0.004, d: 0.09, hold: 0.03, vol: 0.18 });
    }
  } },
  menuOpen: { gain: 0.73, wet: 0.2, vary: 0.02, play(r, o, t, p) {
    noise(r, o, t, { f: 700, f1: 4200, glide: 0.16, q: 1.2, a: 0.07, d: 0.12, vol: 0.32 });
    tone(r, o, t, { f: 520 * p, f1: 880 * p, glide: 0.09, a: 0.005, d: 0.15, vol: 0.24 });
    tone(r, o, t + 0.07, { f: 1760 * p, a: 0.002, d: 0.2, vol: 0.07 });
  } },
  menuClose: { gain: 0.66, wet: 0.16, vary: 0.02, play(r, o, t, p) {
    noise(r, o, t, { f: 3800, f1: 700, glide: 0.14, q: 1.2, a: 0.02, d: 0.12, vol: 0.3 });
    tone(r, o, t, { f: 880 * p, f1: 520 * p, glide: 0.09, a: 0.004, d: 0.12, vol: 0.22 });
  } },
  step: { gain: 0.21, wet: 0.05, vary: 0.08, play(r, o, t, p) {
    noise(r, o, t, { type: 'lowpass', f: 520 * p, q: 0.8, a: 0.002, d: 0.05, vol: 0.5 });
    tone(r, o, t, { f: 95 * p, f1: 60 * p, glide: 0.04, a: 0.001, d: 0.05, vol: 0.32 });
    noise(r, o, t + 0.004, { f: rand(2300, 3600) * p, q: 9, d: 0.045, vol: 0.32 });
  } },
  door: { gain: 0.6, wet: 0.25, vary: 0.02, play(r, o, t, p) {
    tone(r, o, t, { f: 110 * p, f1: 55, glide: 0.06, a: 0.001, d: 0.14, vol: 0.5 });
    noise(r, o, t, { type: 'lowpass', f: 900, d: 0.05, vol: 0.4 });
    noise(r, o, t + 0.03, { f: 6500, f1: 2200, glide: 0.5, q: 0.7, a: 0.03, d: 0.48, vol: 0.34 });
    noise(r, o, t + 0.03, { type: 'highpass', f: 3200, a: 0.02, d: 0.3, vol: 0.14 });
    tone(r, o, t + 0.05, { type: 'sawtooth', f: 70 * p, f1: 92 * p, glide: 0.35, lp: 420, a: 0.05, d: 0.32, vol: 0.14 });
    tone(r, o, t + 0.42, { f: 92 * p, f1: 50, glide: 0.05, a: 0.001, d: 0.12, vol: 0.36 });
    noise(r, o, t + 0.42, { type: 'lowpass', f: 650, d: 0.04, vol: 0.26 });
  } },
  pickup: { gain: 0.87, wet: 0.24, echo: 0.16, vary: 0.01, play(r, o, t, p) {
    const notes = [C6, 1318.5, 1568, 2093];
    notes.forEach((f, i) => {
      const last = i === notes.length - 1;
      tone(r, o, t + i * 0.055, { type: 'triangle', f: f * p, a: 0.002, d: last ? 0.4 : 0.11, vol: 0.26 });
      tone(r, o, t + i * 0.055, { f: f * 2 * p, a: 0.001, d: last ? 0.25 : 0.06, vol: 0.06 });
    });
    noise(r, o, t + 0.16, { type: 'highpass', f: 8000, a: 0.01, d: 0.25, vol: 0.05 });
  } },
  talk: { gain: 0.52, wet: 0.14, vary: 0.03, play(r, o, t, p) {
    tone(r, o, t, { f: 620 * p, f1: 900 * p, glide: 0.05, a: 0.005, d: 0.08, vol: 0.3 });
    tone(r, o, t + 0.075, { f: 760 * p, f1: 1040 * p, glide: 0.05, a: 0.005, d: 0.1, vol: 0.24 });
  } },
  text: { gain: 0.12, wet: 0, vary: 0.1, play(r, o, t, p) {
    tone(r, o, t, { type: 'square', f: 1900 * p, lp: 5000, a: 0.001, d: 0.018, vol: 0.3 });
    noise(r, o, t, { type: 'highpass', f: 4000, d: 0.006, vol: 0.2 });
  } },
  save: { gain: 0.55, wet: 0.45, echo: 0.2, vary: 0, play(r, o, t, p) {
    [523.3, 659.3, 784, 987.8, 1174.7, 1568].forEach((f, i) => {
      bell(r, o, t + i * 0.07, { f: f * p, ratio: 2, index: 0.8, d: 1.1, vol: 0.2 });
    });
    for (const f of [261.6, 392, 659.3]) tone(r, o, t, { type: 'triangle', f: f * p, a: 0.25, d: 1.3, vol: 0.08 });
    noise(r, o, t + 0.1, { type: 'highpass', f: 7000, a: 0.3, d: 0.6, vol: 0.04 });
  } },
  heal: { gain: 0.65, wet: 0.45, echo: 0.25, vary: 0.01, play(r, o, t, p) {
    [C6, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637].forEach((f, i) => {
      bell(r, o, t + i * 0.045, { f: f * p, ratio: 4, index: 0.6, d: 0.5, vol: 0.17 });
    });
    noise(r, o, t, { f: 9000, q: 2, a: 0.15, d: 0.5, vol: 0.12 });
    for (const f of [523.3, 659.3, 784]) tone(r, o, t, { f: f * p, a: 0.12, d: 0.8, vol: 0.07 });
  } },
  encounter: { gain: 0.3, wet: 0.35, vary: 0, play(r, o, t) {
    // rising whoosh + riser, then a minor brass stab with sub boom and crash
    noise(r, o, t, { f: 250, f1: 5200, glide: 0.56, q: 1.4, a: 0.52, d: 0.1, vol: 0.5 });
    noise(r, o, t, { type: 'highpass', f: 1500, f1: 7000, glide: 0.56, a: 0.54, d: 0.06, vol: 0.12 });
    tone(r, o, t, { type: 'sawtooth', f: 110, f1: 440, glide: 0.56, lp: 600, lp1: 3000, a: 0.5, d: 0.08, vol: 0.11 });
    const s = t + 0.56;
    brass(r, o, s, [82.4, 164.8, 246.9, 329.6, 392, 493.9], { vol: 0.62, hold: 0.12, d: 0.55, cutoff: 4200, sustainCut: 1400 });
    kick(r, o, s, 0.8, { f0: 120, f1: 32, sweep: 0.2, d: 0.8, vol: 0.9 });
    tom(r, o, s, 0.4, 70);
    crash(r, o, s, 0.9);
    bell(r, o, s, { f: 2960, ratio: 2.76, index: 1.2, d: 0.6, vol: 0.07 });
  } },
  slash: { gain: 1.0, wet: 0.18, vary: 0.05, play(r, o, t, p) {
    noise(r, o, t, { f: 1200 * p, f1: 5400 * p, glide: 0.07, f2: 1800 * p, glide2: 0.1, q: 2, a: 0.035, d: 0.11, vol: 0.62 });
    noise(r, o, t + 0.04, { type: 'highpass', f: 3000, d: 0.016, vol: 0.28 });
    bell(r, o, t + 0.04, { f: 2200 * p, ratio: 2.76, index: 1.4, idxDecay: 0.06, d: 0.42, vol: 0.1 });
    tone(r, o, t + 0.04, { f: 3300 * p, a: 0.001, d: 0.25, vol: 0.04 });
  } },
  thrust: { gain: 0.77, wet: 0.16, vary: 0.05, play(r, o, t, p) {
    noise(r, o, t, { f: 2500 * p, f1: 6500 * p, glide: 0.05, q: 3, a: 0.012, d: 0.075, vol: 0.6 });
    tone(r, o, t + 0.02, { f: 3600 * p, f1: 3400 * p, glide: 0.1, a: 0.001, d: 0.13, vol: 0.07 });
    bell(r, o, t + 0.02, { f: 1800 * p, ratio: 2.76, index: 1, d: 0.22, vol: 0.08 });
    tone(r, o, t + 0.03, { f: 180 * p, f1: 70, glide: 0.05, a: 0.001, d: 0.08, vol: 0.38 });
  } },
  shot: { gain: 0.39, wet: 0.18, echo: 0.12, vary: 0.04, play(r, o, t, p) {
    tone(r, o, t, { type: 'square', f: 2600 * p, f1: 180 * p, glide: 0.14, lp: 6000, a: 0.001, d: 0.17, vol: 0.24 });
    tone(r, o, t, { type: 'sawtooth', f: 3900 * p, f1: 260 * p, glide: 0.12, a: 0.001, d: 0.14, vol: 0.12 });
    noise(r, o, t, { type: 'highpass', f: 2500, d: 0.03, vol: 0.5 });
    tone(r, o, t, { f: 140 * p, f1: 40, glide: 0.08, a: 0.001, d: 0.13, vol: 0.6 });
    bell(r, o, t + 0.01, { f: 1450 * p, ratio: 1.5, index: 3, idxDecay: 0.05, d: 0.36, vol: 0.08 });
  } },
  punch: { gain: 0.33, wet: 0.12, vary: 0.05, play(r, o, t, p) {
    tone(r, o, t, { f: 170 * p, f1: 48, glide: 0.09, a: 0.001, d: 0.15, vol: 0.85 });
    noise(r, o, t, { type: 'lowpass', f: 1400, d: 0.055, vol: 0.45, drive: true });
    noise(r, o, t, { type: 'highpass', f: 3000, d: 0.006, vol: 0.2 });
  } },
  cast: { gain: 0.89, wet: 0.45, echo: 0.25, vary: 0.02, play(r, o, t, p) {
    noise(r, o, t, { f: 800, f1: 3200, glide: 0.5, q: 6, a: 0.25, d: 0.42, vol: 0.42 });
    bell(r, o, t, { f: 660 * p, ratio: 1.5, index: 0.5, a: 0.2, d: 0.6, vol: 0.15 });
    bell(r, o, t + 0.05, { f: 990 * p, ratio: 1.5, index: 0.5, a: 0.22, d: 0.6, vol: 0.12 });
    for (let i = 0; i < 6; i++) {
      tone(r, o, t + 0.08 + i * 0.075 + rand(0, 0.03), { f: rand(2000, 5200) * p, a: 0.001, d: 0.13, vol: 0.06 });
    }
  } },
  impact: { gain: 0.28, wet: 0.14, vary: 0.05, play(r, o, t, p) {
    tone(r, o, t, { f: 130 * p, f1: 42, glide: 0.1, a: 0.001, d: 0.2, vol: 0.85 });
    noise(r, o, t, { f: 1700 * p, q: 0.9, a: 0.001, d: 0.1, vol: 0.75, drive: true });
    noise(r, o, t, { type: 'highpass', f: 4000, d: 0.012, vol: 0.3 });
    tone(r, o, t, { type: 'triangle', f: 220 * p, f1: 110, glide: 0.05, a: 0.001, d: 0.07, vol: 0.3 });
  } },
  crit: { gain: 0.35, wet: 0.24, vary: 0.04, play(r, o, t, p) {
    tone(r, o, t, { f: 150 * p, f1: 36, glide: 0.14, a: 0.001, d: 0.32, vol: 0.85 });
    noise(r, o, t, { f: 1500 * p, q: 0.8, a: 0.001, d: 0.14, vol: 0.7, drive: true });
    noise(r, o, t, { type: 'highpass', f: 2000, d: 0.045, vol: 0.45 });
    bell(r, o, t + 0.01, { f: 2600 * p, ratio: 2.4, index: 1, d: 0.55, vol: 0.14 });
    tone(r, o, t + 0.01, { f: 5200 * p, a: 0.001, d: 0.3, vol: 0.05 });
  } },
  weak: { gain: 0.8, wet: 0.3, echo: 0.1, vary: 0.015, play(r, o, t, p) {
    bell(r, o, t, { f: 2093 * p, ratio: 2, index: 0.8, d: 0.36, vol: 0.3 });
    bell(r, o, t + 0.035, { f: 3136 * p, ratio: 2, index: 0.6, d: 0.42, vol: 0.22 });
    noise(r, o, t, { f: 8000, q: 3, d: 0.12, vol: 0.22 });
    tone(r, o, t, { type: 'square', f: C6 * p, lp: 4000, a: 0.001, d: 0.05, vol: 0.08 });
  } },
  shieldCrack: { gain: 0.54, wet: 0.3, vary: 0.04, play(r, o, t, p) {
    [3200, 4700, 6100].forEach((f, i) => tone(r, o, t + i * 0.008, { f: f * p * rand(0.97, 1.03), a: 0.001, d: 0.06 + i * 0.02, vol: 0.2 }));
    noise(r, o, t, { type: 'highpass', f: 5000, d: 0.012, vol: 0.4 });
    noise(r, o, t + 0.005, { f: 3500 * p, q: 8, d: 0.06, vol: 0.28 });
  } },
  break: { gain: 0.38, wet: 0.5, echo: 0.14, vary: 0.02, play(r, o, t, p) {
    // the showpiece: sub boom, crack, a cascade of glass bursts, falling pings, a bright wash
    tone(r, o, t, { f: 78, f1: 28, glide: 0.5, a: 0.002, d: 0.95, vol: 0.85 });
    noise(r, o, t, { type: 'highpass', f: 1500, d: 0.035, vol: 0.8 });
    noise(r, o, t, { type: 'lowpass', f: 2500, d: 0.09, vol: 0.45, drive: true });
    [0, 0.018, 0.045, 0.085, 0.13, 0.19, 0.27].forEach((dt, i) => {
      noise(r, o, t + dt, { f: rand(2200, 9000), q: rand(3, 9), a: 0.001, d: rand(0.07, 0.22), vol: 0.55 * (1 - i * 0.08) });
    });
    for (let i = 0; i < 10; i++) {
      const f = 5200 * 0.88 ** i * rand(0.95, 1.05) * p;
      bell(r, o, t + 0.02 + i * 0.058 + rand(0, 0.03), { f, ratio: i % 2 ? 2.76 : 3.5, index: 0.5, d: rand(0.35, 0.6), vol: 0.11 });
    }
    noise(r, o, t, { type: 'highpass', f: 4000, a: 0.004, d: 1.15, vol: 0.22 });
  } },
  recover: { gain: 1.26, wet: 0.35, vary: 0.02, play(r, o, t, p) {
    tone(r, o, t, { f: 900 * p, f1: 1800 * p, glide: 0.3, a: 0.06, d: 0.3, vol: 0.18 });
    noise(r, o, t, { f: 1500, f1: 6000, glide: 0.3, q: 4, a: 0.25, d: 0.1, vol: 0.16 });
    bell(r, o, t + 0.28, { f: 1800 * p, ratio: 3.5, index: 0.8, d: 0.5, vol: 0.2 });
    bell(r, o, t + 0.32, { f: 2700 * p, ratio: 3.5, index: 0.6, d: 0.5, vol: 0.12 });
  } },
  buff: { gain: 0.85, wet: 0.35, echo: 0.15, vary: 0.01, play(r, o, t, p) {
    [784, C6, 1318.5].forEach((f, i) => tone(r, o, t + i * 0.07, { type: 'triangle', f: f * 0.98 * p, f1: f * p, glide: 0.04, a: 0.003, d: 0.2, vol: 0.3 }));
    noise(r, o, t, { f: 2000, f1: 8000, glide: 0.3, q: 2, a: 0.2, d: 0.2, vol: 0.14 });
  } },
  debuff: { gain: 1.08, wet: 0.3, vary: 0.01, play(r, o, t, p) {
    [659.3, 554.4, 466.2].forEach((f, i) => tone(r, o, t + i * 0.08, { type: 'square', f: f * p, f1: f * 0.94 * p, glide: 0.18, lp: 1800, a: 0.003, d: 0.2, vol: 0.19 }));
    noise(r, o, t, { f: 3000, f1: 600, glide: 0.4, q: 2, a: 0.1, d: 0.3, vol: 0.14 });
  } },
  boost: { gain: 0.73, wet: 0.3, echo: 0.15, vary: 0.01, play(r, o, t, p, opts) {
    // boost level 1-3 (opts.level, or an integer opts.pitch) climbs a major third per level
    const arg = opts.level ?? opts.pitch ?? 1;
    const lvl = Number.isInteger(arg) ? clamp(arg, 1, 3) : 1;
    const m = 2 ** (((lvl - 1) * 4) / 12) * p;
    tone(r, o, t, { type: 'sawtooth', f: 220 * m, f1: 440 * m, glide: 0.3, lp: 400, lp1: 4200, lpGlide: 0.3, lpQ: 6, a: 0.02, d: 0.32, vol: 0.17 });
    tone(r, o, t, { type: 'sawtooth', f: 221.5 * m, f1: 443 * m, glide: 0.3, lp: 400, lp1: 4200, lpGlide: 0.3, lpQ: 6, a: 0.02, d: 0.32, vol: 0.14 });
    tone(r, o, t, { type: 'square', f: 110 * m, f1: 220 * m, glide: 0.3, lp: 900, a: 0.02, d: 0.3, vol: 0.09 });
    noise(r, o, t, { f: 2000, f1: 7000, glide: 0.3, q: 2, a: 0.25, d: 0.15, vol: 0.12 });
    bell(r, o, t + 0.3, { f: 1760 * m, ratio: 2, index: 1, d: 0.5, vol: 0.24 });
  } },
  boostDown: { gain: 1.02, wet: 0.2, vary: 0.02, play(r, o, t, p) {
    tone(r, o, t, { type: 'sawtooth', f: 440 * p, f1: 220 * p, glide: 0.2, lp: 3000, lp1: 500, a: 0.005, d: 0.25, vol: 0.18 });
    bell(r, o, t, { f: 880 * p, ratio: 2, index: 0.8, d: 0.2, vol: 0.1 });
  } },
  enemyShot: { gain: 0.41, wet: 0.2, vary: 0.05, play(r, o, t, p) {
    tone(r, o, t, { type: 'sawtooth', f: 1300 * p, f1: 110 * p, glide: 0.18, lp: 3500, a: 0.001, d: 0.21, vol: 0.3, drive: true });
    tone(r, o, t, { type: 'square', f: 650 * p, f1: 70 * p, glide: 0.2, lp: 2000, a: 0.001, d: 0.2, vol: 0.14 });
    noise(r, o, t, { f: 1200, q: 1, d: 0.05, vol: 0.4 });
    tone(r, o, t, { f: 120, f1: 35, glide: 0.1, a: 0.001, d: 0.15, vol: 0.5 });
  } },
  enemyMelee: { gain: 0.4, wet: 0.15, vary: 0.05, play(r, o, t, p) {
    noise(r, o, t, { f: 350 * p, f1: 1600 * p, glide: 0.12, q: 1.5, a: 0.07, d: 0.1, vol: 0.55 });
    tone(r, o, t + 0.1, { f: 110 * p, f1: 38, glide: 0.1, a: 0.001, d: 0.22, vol: 0.8 });
    noise(r, o, t + 0.1, { type: 'lowpass', f: 1800, d: 0.08, vol: 0.5, drive: true });
    noise(r, o, t + 0.1, { f: 3200, q: 6, a: 0.01, d: 0.15, vol: 0.15 });
  } },
  enemyBeam: { gain: 1.0, wet: 0.3, echo: 0.1, vary: 0.02, play(r, o, t, p) {
    tone(r, o, t, { f: 400 * p, f1: 2400 * p, glide: 0.33, a: 0.3, d: 0.06, vol: 0.12 });
    const b = t + 0.32;
    for (const [type, f, v] of [['sawtooth', 110, 0.3], ['sawtooth', 111.4, 0.26], ['square', 55, 0.18]]) {
      tone(r, o, b, { type, f: f * p, bp: 1200, bpQ: 1.6, a: 0.02, hold: 0.45, d: 0.3, vol: v, trem: 18, tremDepth: 0.6 });
    }
    noise(r, o, b, { type: 'highpass', f: 2500, a: 0.02, hold: 0.45, d: 0.3, vol: 0.12 });
    noise(r, o, b + 0.5, { type: 'lowpass', f: 2000, d: 0.12, vol: 0.32 });
  } },
  charge: { gain: 0.9, wet: 0.3, vary: 0.02, play(r, o, t, p) {
    tone(r, o, t, { f: 180 * p, f1: 1100 * p, glide: 1.0, a: 0.9, d: 0.15, vol: 0.24, trem: 9, tremDepth: 0.5 });
    tone(r, o, t, { type: 'sawtooth', f: 90 * p, f1: 550 * p, glide: 1.0, lp: 800, lp1: 3000, lpGlide: 1.0, a: 0.9, d: 0.1, vol: 0.08 });
    noise(r, o, t, { f: 400, f1: 5000, glide: 1.0, q: 3, a: 0.95, d: 0.1, vol: 0.2 });
  } },
  ko: { gain: 0.56, wet: 0.35, vary: 0.02, play(r, o, t, p) {
    tone(r, o, t, { f: 620 * p, f1: 70, glide: 0.6, a: 0.005, d: 0.65, vol: 0.34 });
    tone(r, o, t, { type: 'square', f: 310 * p, f1: 35, glide: 0.6, lp: 900, a: 0.005, d: 0.6, vol: 0.12 });
    tone(r, o, t + 0.45, { f: 90, f1: 40, glide: 0.08, a: 0.001, d: 0.2, vol: 0.5 });
    noise(r, o, t + 0.45, { type: 'lowpass', f: 700, d: 0.1, vol: 0.3 });
  } },
  defend: { gain: 0.71, wet: 0.3, vary: 0.02, play(r, o, t, p) {
    bell(r, o, t, { f: 520 * p, ratio: 1.41, index: 2.5, d: 0.5, vol: 0.3 });
    bell(r, o, t, { f: 780 * p, ratio: 2.76, index: 1, d: 0.35, vol: 0.14 });
    noise(r, o, t, { f: 600, f1: 2400, glide: 0.12, q: 2, a: 0.08, d: 0.1, vol: 0.24 });
    tone(r, o, t, { type: 'triangle', f: 220 * p, a: 0.05, d: 0.35, vol: 0.12 });
  } },
  flee: { gain: 1.49, wet: 0.15, vary: 0.03, play(r, o, t, p) {
    [0, 0.12, 0.24].forEach((dt, i) => noise(r, o, t + dt, { f: 900 * p, f1: 3600 * p, glide: 0.1, q: 1.6, a: 0.04, d: 0.09, vol: 0.4 - i * 0.08 }));
    [0, 0.08, 0.16, 0.24].forEach((dt) => noise(r, o, t + dt, { type: 'lowpass', f: 500, d: 0.04, vol: 0.3 }));
    tone(r, o, t + 0.2, { f: 600 * p, f1: 1600 * p, glide: 0.3, a: 0.02, d: 0.2, vol: 0.1 });
  } },
  victory: { gain: 0.34, wet: 0.35, echo: 0.15, vary: 0, play(r, o, t, p) {
    [392, 523.3, 659.3].forEach((f, i) => brass(r, o, t + i * 0.09, [f * p], { vol: 0.32, hold: 0.04, d: 0.14 }));
    const c = t + 0.3;
    brass(r, o, c, [523.3, 659.3, 784, C6].map((f) => f * p), { vol: 0.5, hold: 0.35, d: 0.6 });
    bell(r, o, c, { f: 2093 * p, ratio: 2, index: 0.8, d: 1.0, vol: 0.14 });
    crash(r, o, c, 0.5);
    kick(r, o, c, 0.6);
  } },
  levelup: { gain: 0.82, wet: 0.4, echo: 0.2, vary: 0, play(r, o, t, p) {
    [523.3, 659.3, 784, C6, 1318.5, 1568].forEach((f, i) => {
      tone(r, o, t + i * 0.06, { type: 'triangle', f: f * p, a: 0.002, d: 0.28, vol: 0.2 });
      bell(r, o, t + i * 0.06, { f: f * 2 * p, ratio: 2, index: 0.5, d: 0.25, vol: 0.06 });
    });
    for (const f of [C6, 1318.5, 1568, 2093]) bell(r, o, t + 0.38, { f: f * p, ratio: 2, index: 0.7, d: 1.2, vol: 0.12 });
    noise(r, o, t + 0.38, { type: 'highpass', f: 7000, a: 0.2, d: 0.8, vol: 0.05 });
  } },
  gameover: { gain: 0.56, wet: 0.55, echo: 0.2, vary: 0, play(r, o, t) {
    // A minor: falling bell phrase E-D-C-B -> A over a low pad
    for (const f of [220, 261.6, 329.6]) tone(r, o, t, { type: 'sawtooth', f, lp: 900, a: 0.4, hold: 1.4, d: 1.3, vol: 0.06 });
    tone(r, o, t, { f: 110, a: 0.3, hold: 1.5, d: 1.5, vol: 0.22 });
    [[659.3, 0], [587.3, 0.42], [523.3, 0.84], [493.9, 1.26], [440, 1.68]].forEach(([f, dt], i) => {
      bell(r, o, t + dt, { f, ratio: 2, index: 0.7, d: i === 4 ? 2.2 : 1.2, vol: 0.28 });
    });
  } },
  // ---- field, story and battle additions (TECH_PLAN 9)
  emote: { gain: 0.5, wet: 0.12, vary: 0.04, play(r, o, t, p) {
    // a bubble pops up over a head: a quick rising blip with a soft click
    tone(r, o, t, { f: 700 * p, f1: 1500 * p, glide: 0.05, a: 0.002, d: 0.09, vol: 0.32 });
    tone(r, o, t + 0.05, { type: 'triangle', f: 1500 * p, f1: 1700 * p, glide: 0.04, a: 0.001, d: 0.08, vol: 0.16 });
    noise(r, o, t, { type: 'highpass', f: 5000, d: 0.006, vol: 0.12 });
  } },
  splash: { gain: 0.6, wet: 0.3, vary: 0.05, play(r, o, t, p) {
    // a burst of water falling in pitch, a dull thump under it, then droplets plinking
    noise(r, o, t, { f: 2400 * p, f1: 700 * p, glide: 0.25, q: 0.9, a: 0.004, d: 0.35, vol: 0.55 });
    noise(r, o, t, { type: 'highpass', f: 3500, a: 0.002, d: 0.18, vol: 0.25 });
    tone(r, o, t, { f: 110 * p, f1: 55, glide: 0.08, a: 0.002, d: 0.16, vol: 0.4 });
    for (let i = 0; i < 6; i++) {
      const f = rand(900, 2400) * p;
      tone(r, o, t + 0.08 + i * rand(0.04, 0.08), { f, f1: f * 1.6, glide: 0.03, a: 0.001, d: 0.06, vol: rand(0.06, 0.12) });
    }
  } },
  valve: { gain: 0.6, wet: 0.25, vary: 0.04, play(r, o, t, p) {
    // a heavy wheel or lever: ratchet teeth, a clunk as it seats, then gas or water hissing through
    for (let i = 0; i < 4; i++) noise(r, o, t + i * 0.045, { f: 2600 * p, q: 6, a: 0.001, d: 0.025, vol: 0.32 });
    tone(r, o, t + 0.2, { f: 140 * p, f1: 62, glide: 0.06, a: 0.001, d: 0.16, vol: 0.55 });
    noise(r, o, t + 0.2, { type: 'lowpass', f: 900, d: 0.06, vol: 0.4 });
    bell(r, o, t + 0.2, { f: 410 * p, ratio: 1.41, index: 2.2, idxDecay: 0.04, d: 0.35, vol: 0.08 });
    noise(r, o, t + 0.24, { f: 3800, f1: 2200, glide: 0.6, q: 0.8, a: 0.06, hold: 0.15, d: 0.5, vol: 0.18 });
  } },
  laser_on: { gain: 0.95, wet: 0.2, vary: 0.02, play(r, o, t, p) {
    // a grid powers up: a buzzing hum swells in, a bright zap as the beams strike across
    for (const [f, v] of [[118, 0.26], [119.5, 0.22]]) {
      tone(r, o, t, { type: 'sawtooth', f: f * 0.6 * p, f1: f * p, glide: 0.25, bp: 1100, bpQ: 1.2, a: 0.18, hold: 0.25, d: 0.25, vol: v, trem: 32, tremDepth: 0.5 });
    }
    tone(r, o, t + 0.16, { type: 'square', f: 2600 * p, f1: 900 * p, glide: 0.09, lp: 5000, a: 0.001, d: 0.12, vol: 0.14 });
    noise(r, o, t + 0.16, { type: 'highpass', f: 4500, a: 0.001, d: 0.08, vol: 0.2 });
  } },
  laser_off: { gain: 0.55, wet: 0.2, vary: 0.02, play(r, o, t, p) {
    // a grid drops: a relay click, the hum sagging and fizzling out
    noise(r, o, t, { type: 'highpass', f: 5000, d: 0.01, vol: 0.3 });
    for (const [f, v] of [[118, 0.26], [119.5, 0.22]]) {
      tone(r, o, t, { type: 'sawtooth', f: f * p, f1: f * 0.35 * p, glide: 0.4, lp: 2400, lp1: 300, lpGlide: 0.4, a: 0.003, d: 0.45, vol: v, trem: 26, tremDepth: 0.6 });
    }
    tone(r, o, t, { f: 1600 * p, f1: 500 * p, glide: 0.2, a: 0.001, d: 0.2, vol: 0.06 });
  } },
  shard: { gain: 0.6, wet: 0.5, echo: 0.3, vary: 0, play(r, o, t, p) {
    // a memory shard: a glassy E major 7 arpeggio over a warm swell, then a soft data shimmer
    for (const f of [440, 659.3]) tone(r, o, t, { type: 'triangle', f: f * p, a: 0.3, hold: 0.2, d: 1.0, vol: 0.07 });
    [1318.5, 1661.2, 1975.5, 2489, 2637].forEach((f, i) => bell(r, o, t + 0.05 + i * 0.07, { f: f * p, ratio: 3.5, index: 0.9, d: 1.0, vol: 0.15 }));
    noise(r, o, t, { f: 3000, f1: 9000, glide: 0.5, q: 3, a: 0.3, d: 0.4, vol: 0.1 });
    for (let i = 0; i < 5; i++) tone(r, o, t + 0.45 + i * 0.05, { type: 'square', f: rand(2400, 4800) * p, lp: 6000, a: 0.001, d: 0.03, vol: 0.03 });
  } },
  transform: { gain: 0.28, wet: 0.5, echo: 0.15, vary: 0, play(r, o, t) {
    // a boss changes shape: a long dark riser, then a boom with a cracked, tritone-heavy bell chord
    for (const [f, v] of [[41, 0.22], [41.6, 0.2]]) {
      tone(r, o, t, { type: 'sawtooth', f, f1: f * 4, glide: 1.0, lp: 300, lp1: 2400, lpGlide: 1.0, a: 0.9, d: 0.08, vol: v });
    }
    noise(r, o, t, { f: 300, f1: 6000, glide: 1.0, q: 1.5, a: 0.95, d: 0.06, vol: 0.4 });
    const s = t + 1.05;
    kick(r, o, s, 1, { f0: 110, f1: 28, sweep: 0.35, d: 1.2, vol: 1 });
    crash(r, o, s, 0.8);
    for (const f of [110, 155.6, 233.1, 329.6]) bell(r, o, s, { f, ratio: 1.41, index: 3, idxDecay: 0.2, d: 2.2, vol: 0.12 });
    brass(r, o, s, [55, 82.4, 110, 155.6], { vol: 0.5, hold: 0.3, d: 0.9, cutoff: 2400, sustainCut: 900 });
  } },
  summon: { gain: 0.6, wet: 0.4, echo: 0.15, vary: 0.02, play(r, o, t, p) {
    // a rift opens: a swirling up-sweep, a soft whump as something arrives, sparks settling
    noise(r, o, t, { f: 400, f1: 3500, glide: 0.45, q: 4, a: 0.35, d: 0.15, vol: 0.4 });
    tone(r, o, t, { type: 'triangle', f: 300 * p, f1: 900 * p, glide: 0.45, a: 0.3, d: 0.1, vol: 0.14, trem: 14, tremDepth: 0.6 });
    const s = t + 0.45;
    tone(r, o, s, { f: 180 * p, f1: 60, glide: 0.18, a: 0.002, d: 0.3, vol: 0.6 });
    noise(r, o, s, { type: 'lowpass', f: 1200, d: 0.12, vol: 0.35 });
    for (let i = 0; i < 6; i++) bell(r, o, s + 0.05 + i * 0.06, { f: rand(1800, 3600) * p, ratio: 3.5, index: 0.6, d: 0.35, vol: 0.06 });
  } },
  submerge: { gain: 0.5, wet: 0.4, vary: 0.03, play(r, o, t, p) {
    // sinking into the ice: a crack, a deep falling whoosh, a muffled boom under the floor
    noise(r, o, t, { type: 'highpass', f: 3000, d: 0.03, vol: 0.4 });
    [3400, 4800].forEach((f, i) => tone(r, o, t + i * 0.012, { f: f * p, a: 0.001, d: 0.06, vol: 0.12 }));
    noise(r, o, t + 0.02, { type: 'lowpass', f: 2200, f1: 260, glide: 0.7, q: 1.2, a: 0.03, d: 0.75, vol: 0.55 });
    tone(r, o, t + 0.02, { f: 150 * p, f1: 38, glide: 0.7, a: 0.02, d: 0.85, vol: 0.5 });
    tone(r, o, t + 0.6, { f: 70, f1: 34, glide: 0.2, a: 0.004, d: 0.5, vol: 0.45 });
  } },
  emerge: { gain: 0.42, wet: 0.4, vary: 0.03, play(r, o, t) {
    // bursting back out: a rumble rising under the floor, a boom, the ice shattering
    noise(r, o, t, { type: 'lowpass', f: 250, f1: 2500, glide: 0.45, q: 1.2, a: 0.4, d: 0.08, vol: 0.5 });
    tone(r, o, t, { f: 40, f1: 110, glide: 0.45, a: 0.4, d: 0.06, vol: 0.4 });
    const s = t + 0.45;
    kick(r, o, s, 0.9, { f0: 130, f1: 34, sweep: 0.2, d: 0.6 });
    noise(r, o, s, { type: 'highpass', f: 2000, d: 0.05, vol: 0.5 });
    for (let i = 0; i < 6; i++) noise(r, o, s + i * 0.03 + rand(0, 0.02), { f: rand(2500, 7500), q: rand(4, 9), d: rand(0.05, 0.15), vol: 0.3 });
  } },
  sleep: { gain: 0.75, wet: 0.45, echo: 0.2, vary: 0.01, play(r, o, t, p) {
    // drowsy: three soft falling chimes (F E D, the lullaby's descent) over a breath of air
    [[1396.9, 0], [1318.5, 0.16], [1174.7, 0.32]].forEach(([f, dt]) => bell(r, o, t + dt, { f: f * p, ratio: 2, index: 0.5, a: 0.01, d: 0.8, vol: 0.18 }));
    noise(r, o, t, { f: 1800, f1: 900, glide: 0.6, q: 2, a: 0.2, d: 0.5, vol: 0.06 });
    tone(r, o, t, { type: 'triangle', f: 349.2 * p, a: 0.2, d: 0.9, vol: 0.08 });
  } },
  wake: { gain: 0.75, wet: 0.3, vary: 0.02, play(r, o, t, p) {
    // snapped awake: a tap and a quick bright upward pair
    noise(r, o, t, { type: 'highpass', f: 5000, d: 0.01, vol: 0.2 });
    tone(r, o, t, { type: 'triangle', f: 880 * p, f1: 1320 * p, glide: 0.05, a: 0.002, d: 0.12, vol: 0.28 });
    bell(r, o, t + 0.06, { f: 1760 * p, ratio: 2, index: 0.9, d: 0.45, vol: 0.2 });
  } },
  buy: { gain: 0.6, wet: 0.2, echo: 0.08, vary: 0.01, play(r, o, t, p) {
    // a Ringborn till: a drawer thunk, then two bright coins
    noise(r, o, t, { type: 'lowpass', f: 700, d: 0.05, vol: 0.35 });
    tone(r, o, t, { f: 160 * p, f1: 90, glide: 0.04, a: 0.001, d: 0.07, vol: 0.3 });
    bell(r, o, t + 0.06, { f: 2637 * p, ratio: 2.76, index: 1.2, d: 0.45, vol: 0.2 });
    bell(r, o, t + 0.14, { f: 3520 * p, ratio: 2.76, index: 1.0, d: 0.6, vol: 0.22 });
    noise(r, o, t + 0.06, { type: 'highpass', f: 7000, d: 0.02, vol: 0.1 });
  } },
  sell: { gain: 1.05, wet: 0.2, vary: 0.02, play(r, o, t, p) {
    // coins counted out onto the counter
    [0, 0.07, 0.12, 0.2].forEach((dt, i) => bell(r, o, t + dt, { f: (3100 - i * 260) * rand(0.97, 1.03) * p, ratio: 2.76, index: 1.1, idxDecay: 0.05, d: 0.25, vol: 0.14 }));
    noise(r, o, t + 0.22, { type: 'lowpass', f: 900, d: 0.04, vol: 0.25 });
  } },
  equip: { gain: 0.55, wet: 0.15, vary: 0.03, play(r, o, t, p) {
    // gear locks in: a short metal slide, a latch and a ring
    noise(r, o, t, { f: 2500 * p, f1: 5000 * p, glide: 0.08, q: 2, a: 0.03, d: 0.05, vol: 0.25 });
    noise(r, o, t + 0.09, { type: 'highpass', f: 3500, d: 0.012, vol: 0.4 });
    tone(r, o, t + 0.09, { f: 240 * p, f1: 120, glide: 0.04, a: 0.001, d: 0.08, vol: 0.4 });
    bell(r, o, t + 0.09, { f: 1250 * p, ratio: 1.41, index: 1.6, idxDecay: 0.05, d: 0.35, vol: 0.12 });
  } },
  travel: { gain: 0.55, wet: 0.3, vary: 0.01, play(r, o, t, p) {
    // the Moth's engines spool up and she pulls away
    for (const [f, v] of [[55, 0.2], [55.8, 0.18]]) {
      tone(r, o, t, { type: 'sawtooth', f: f * p, f1: f * 2 * p, glide: 1.2, lp: 200, lp1: 1400, lpGlide: 1.2, a: 0.5, hold: 0.5, d: 0.6, vol: v });
    }
    noise(r, o, t, { f: 300, f1: 2500, glide: 1.2, q: 0.7, a: 0.7, hold: 0.3, d: 0.6, vol: 0.4 });
    noise(r, o, t + 0.9, { f: 3000, f1: 800, glide: 0.8, q: 1, a: 0.1, d: 0.6, vol: 0.2 });
  } },
  rumble: { gain: 0.34, wet: 0.25, vary: 0.04, play(r, o, t, p) {
    // the deck shudders: a low growl that rolls in and out, loose debris rattling
    noise(r, o, t, { type: 'lowpass', f: 160 * p, q: 1.5, a: 0.25, hold: 0.9, d: 0.9, vol: 0.9, drive: true });
    tone(r, o, t, { f: 38 * p, a: 0.3, hold: 0.8, d: 0.9, vol: 0.5, trem: 7, tremDepth: 0.7 });
    noise(r, o, t + 0.15, { f: 600, q: 3, a: 0.05, d: 0.3, vol: 0.08 });
    noise(r, o, t + 0.7, { f: 900, q: 4, a: 0.02, d: 0.2, vol: 0.07 });
  } },
  choir: { gain: 0.36, wet: 0.6, echo: 0.1, vary: 0, play(r, o, t, p, opts) {
    // WARDEN's per-box voice: a soft 'oo' chord from its F minor song (or opts.chords) breathes in and fades
    const set = opts.chords || CHOIR_SFX;
    const chord = set[Math.floor(Math.random() * set.length)].map(noteMidi);
    choirVoice(r, o, t, chord, 0.45, 1, { attack: 0.25, release: 1.6, level: 0.5, oct: 12 * Math.log2(p) });
  } },
  glitch: { gain: 0.62, wet: 0.15, vary: 0.05, play(r, o, t, p) {
    // a data stutter: chopped square blips at random pitches over bursts of noise, then a falling tail
    for (let i = 0; i < 7; i++) {
      const dt = i * 0.045 + rand(0, 0.015);
      tone(r, o, t + dt, { type: 'square', f: rand(180, 2400) * p, lp: 6000, a: 0.001, hold: 0.02, d: 0.02, vol: rand(0.12, 0.22) });
      if (i % 2) noise(r, o, t + dt, { f: rand(1500, 6000), q: 2, a: 0.001, hold: 0.02, d: 0.01, vol: 0.25 });
    }
    tone(r, o, t + 0.33, { type: 'sawtooth', f: 900 * p, f1: 120 * p, glide: 0.12, lp: 3000, a: 0.001, d: 0.12, vol: 0.12 });
  } },
  page: { gain: 0.45, wet: 0.12, vary: 0.05, play(r, o, t, p) {
    // a page turns: a short papery swish and a soft tap
    noise(r, o, t, { f: 2200 * p, f1: 5200 * p, glide: 0.12, q: 1.2, a: 0.05, d: 0.12, vol: 0.32 });
    noise(r, o, t + 0.13, { type: 'lowpass', f: 1400, d: 0.03, vol: 0.18 });
  } },
  unlock: { gain: 0.55, wet: 0.18, vary: 0.02, play(r, o, t, p) {
    // a lock releases: two quick clicks, a latch drawn back, a small rising tone
    noise(r, o, t, { f: 3200 * p, q: 5, d: 0.02, vol: 0.4 });
    noise(r, o, t + 0.06, { f: 2600 * p, q: 5, d: 0.02, vol: 0.35 });
    tone(r, o, t + 0.1, { f: 180 * p, f1: 110, glide: 0.05, a: 0.001, d: 0.1, vol: 0.4 });
    noise(r, o, t + 0.1, { f: 900, f1: 2200, glide: 0.12, q: 2, a: 0.03, d: 0.08, vol: 0.18 });
    tone(r, o, t + 0.16, { type: 'triangle', f: 880 * p, f1: 1320 * p, glide: 0.08, a: 0.003, d: 0.18, vol: 0.16 });
  } },
  card: { gain: 0.5, wet: 0.5, echo: 0.2, vary: 0, play(r, o, t) {
    // the chapter title lands: a soft glassy 'shing' in the sting's D add9
    noise(r, o, t, { type: 'highpass', f: 6000, a: 0.002, d: 0.5, vol: 0.06 });
    for (const [f, dt] of [[1174.7, 0], [1760, 0.03], [2637, 0.06]]) bell(r, o, t + dt, { f, ratio: 3.5, index: 0.6, d: 1.8, vol: 0.1 });
  } },
  alarm: { gain: 0.9, wet: 0.35, echo: 0.1, vary: 0, play(r, o, t, p) {
    // a ship klaxon: two falling whoops
    for (const dt of [0, 0.7]) {
      for (const [type, det, v] of [['square', 0, 0.2], ['sawtooth', 8, 0.14]]) {
        tone(r, o, t + dt, { type, detune: det, f: 740 * p, f1: 520 * p, glide: 0.5, bp: 1200, bpQ: 1.5, a: 0.02, hold: 0.42, d: 0.12, vol: v });
      }
    }
  } },
  lift: { gain: 0.6, wet: 0.35, vary: 0.01, play(r, o, t, p) {
    // a light lift: a rising hum with a soft whoosh, a two-note chime at the top
    tone(r, o, t, { f: 196 * p, f1: 392 * p, glide: 1.1, a: 0.3, hold: 0.5, d: 0.5, vol: 0.18, trem: 11, tremDepth: 0.4 });
    tone(r, o, t, { type: 'triangle', f: 294 * p, f1: 588 * p, glide: 1.1, a: 0.3, hold: 0.5, d: 0.5, vol: 0.1 });
    noise(r, o, t, { f: 500, f1: 3000, glide: 1.1, q: 1, a: 0.6, d: 0.5, vol: 0.2 });
    bell(r, o, t + 1.05, { f: 1568 * p, ratio: 2, index: 0.8, d: 1.0, vol: 0.18 });
    bell(r, o, t + 1.12, { f: 2349.3 * p, ratio: 2, index: 0.6, d: 1.0, vol: 0.12 });
  } },
  pod_flip: { gain: 0.45, wet: 0.2, vary: 0.06, play(r, o, t, p) {
    // a stasis pod's status lamp changes: a relay tick and a short soft chirp
    noise(r, o, t, { f: 2800 * p, q: 4, d: 0.015, vol: 0.3 });
    tone(r, o, t + 0.02, { type: 'triangle', f: 990 * p, f1: 1320 * p, glide: 0.06, a: 0.002, d: 0.12, vol: 0.18 });
    noise(r, o, t + 0.02, { type: 'highpass', f: 4000, a: 0.02, d: 0.15, vol: 0.05 });
  } },
  awaken: { gain: 0.3, wet: 0.45, echo: 0.2, vary: 0, play(r, o, t, p) {
    // an ultimate awakens: a fast riser, then a bright D major brass chord with rising bells and a crash
    noise(r, o, t, { f: 400, f1: 7000, glide: 0.4, q: 1.4, a: 0.38, d: 0.05, vol: 0.4 });
    tone(r, o, t, { type: 'sawtooth', f: 147 * p, f1: 587 * p, glide: 0.4, lp: 800, lp1: 4000, lpGlide: 0.4, a: 0.36, d: 0.06, vol: 0.12 });
    const s = t + 0.42;
    brass(r, o, s, [146.8, 220, 293.7, 370, 440, 587.3].map((f) => f * p), { vol: 0.62, hold: 0.45, d: 0.9, cutoff: 4400, sustainCut: 1500 });
    kick(r, o, s, 0.9, { f0: 130, f1: 36, sweep: 0.2, d: 0.7 });
    crash(r, o, s, 0.9);
    for (const [f, dt] of [[1174.7, 0], [1480, 0.08], [1760, 0.16], [2349.3, 0.24]]) bell(r, o, s + dt, { f: f * p, ratio: 2, index: 0.8, d: 1.2, vol: 0.12 });
  } },
  skip: { gain: 0.45, wet: 0.1, vary: 0.02, play(r, o, t, p) {
    // fast-forward: a quick downward swish and a tick
    noise(r, o, t, { f: 6000 * p, f1: 900 * p, glide: 0.16, q: 1.4, a: 0.02, d: 0.14, vol: 0.32 });
    tone(r, o, t, { type: 'triangle', f: 1400 * p, f1: 500 * p, glide: 0.12, a: 0.001, d: 0.12, vol: 0.12 });
    noise(r, o, t + 0.17, { type: 'highpass', f: 5000, d: 0.008, vol: 0.2 });
  } },
};

export const SFX_NAMES = Object.keys(SFX);

/**
 * Play an sfx on a rig at audio time `when` (0 = now). opts: { volume, pitch, pan, chords ('choir') }.
 * pitch is a frequency multiplier (1 = normal); for 'boost' an integer pitch (1-3) is the boost level instead.
 * Returns false for unknown names.
 */
export function playSfx(r, name, opts = {}, when = 0) {
  const def = SFX[name];
  if (!def) return false;
  const t = Math.max(when, r.ctx.currentTime) + 0.004;
  const vary = 1 + (Math.random() * 2 - 1) * (def.vary ?? 0.03);
  const pitch = name === 'boost' && Number.isInteger(opts.pitch) ? 1 : opts.pitch; // boost: integer pitch = level
  const p = clamp(Number(pitch) || 1, 0.25, 4) * vary;
  const vol = clamp(opts.volume ?? 1, 0, 2) * def.gain;
  const out = sfxVoice(r, { vol, pan: opts.pan || 0, wet: def.wet, echo: def.echo || 0 });
  def.play(r, out, t, p, opts);
  return true;
}

// ------------------------------------------------------------------ music instruments
// Signature: (rig, out, t, midi | midi[], durSeconds, velocity, voiceOpts, glideFromMidi)

/** Pad: detuned saw pairs split hard L/R, each side through a lowpass that drifts slowly over time. */
function padVoice(r, out, t, notes, dur, vel, o) {
  const ctx = r.ctx;
  const a = Math.min(o.attack ?? 0.6, dur * 0.8);
  const rel = o.release ?? 1.0;
  const end = t + dur;
  const stop = end + rel * 1.3;
  const base = o.cutoff ?? 1100;
  const peak = (vel * (o.level ?? 0.16)) / Math.sqrt(notes.length);
  // cutoff follows a slow sine of absolute time, so consecutive chords drift continuously
  const cut = (x, side) => base * (1 + (o.drift ?? 0.45) * Math.sin(x * 0.68 + side * 1.3));
  for (const side of [-1, 1]) {
    const lp = filterNode(ctx, 'lowpass', cut(t, side), o.q ?? 0.9);
    lp.frequency.setValueAtTime(cut(t, side), t);
    for (let x = t + 0.8; x < stop + 0.8; x += 0.8) lp.frequency.linearRampToValueAtTime(cut(x, side), x);
    const pan = panNode(ctx, side * 0.6);
    const v = gainNode(ctx, 0);
    lp.connect(v).connect(pan).connect(out);
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(peak, t + a);
    v.gain.setValueAtTime(peak, end);
    v.gain.setTargetAtTime(0, end, rel / 5);
    for (const m of notes) {
      const osc = oscNode(r, o.wave ?? 'sawtooth', mtof(m + (o.oct ?? 0)));
      osc.detune.value = side * (6 + Math.random() * 4);
      osc.connect(lp);
      osc.start(t);
      osc.stop(stop);
    }
  }
  if (o.air) {
    // "air": resonant noise whistling two octaves above the top voice, swelling with the chord
    const src = noiseSource(r, t);
    const bp = filterNode(ctx, 'bandpass', mtof(notes[notes.length - 1] + 24), 9);
    bp.frequency.setTargetAtTime(mtof(notes[notes.length - 2] + 24), t + dur * 0.5, dur * 0.3);
    const v = gainNode(ctx, 0);
    src.connect(bp).connect(v).connect(out);
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(vel * o.air, t + Math.max(a, dur * 0.4));
    v.gain.setTargetAtTime(0, end, rel / 4);
    src.stop(stop);
  }
}

/**
 * Lead: saw stack (with an octave-down layer) through an enveloped lowpass, delayed vibrato, optional glide.
 * o.layers replaces the stack ([wave, cents, gain]); o.drive (pre-gain, ~0.5-2) saturates the stack before the
 * filter (a driven, distorted lead); o.hp thins it with a highpass after the filter (a nasal alarm tone).
 */
function leadVoice(r, out, t, m, dur, vel, o, from) {
  const ctx = r.ctx;
  const oct = o.oct ?? 0;
  const f = mtof(m + oct);
  const rel = o.release ?? 0.09;
  const end = t + dur;
  const stop = end + rel * 1.4 + 0.02;
  const lp = filterNode(ctx, 'lowpass', 600, o.q ?? 1.6);
  const bright = o.cutoff ?? 3000;
  lp.frequency.setValueAtTime(o.base ?? 550, t);
  lp.frequency.linearRampToValueAtTime(bright * (0.55 + 0.45 * vel), t + 0.05);
  lp.frequency.setTargetAtTime(bright * 0.5, t + 0.06, 0.18);
  const v = gainNode(ctx, 0);
  (o.hp ? lp.connect(filterNode(ctx, 'highpass', o.hp, 0.7)) : lp).connect(v).connect(out);
  let into = lp;
  if (o.drive) {
    const ws = ctx.createWaveShaper();
    ws.curve = getDriveCurve();
    ws.oversample = '2x';
    into = gainNode(ctx, o.drive);
    into.connect(ws).connect(lp);
  }
  const lvl = vel * (o.level ?? 0.2);
  const atk = o.attack ?? 0.018;
  v.gain.setValueAtTime(0, t);
  v.gain.linearRampToValueAtTime(lvl, t + atk);
  v.gain.setTargetAtTime(lvl * 0.8, t + atk, 0.12);
  v.gain.setTargetAtTime(0, end, rel / 5);
  // delayed vibrato: nothing for the first ~0.22 s, then eases in (only long notes get it)
  const vib = oscNode(r, 'sine', o.vibRate ?? 5.4);
  const depth = gainNode(ctx, 0);
  depth.gain.setValueAtTime(0, t + 0.22);
  depth.gain.linearRampToValueAtTime(o.vib ?? 16, t + 0.6);
  vib.connect(depth);
  const g0 = from != null ? mtof(from + oct) : 0;
  for (const [wave, det, gain] of o.layers ?? LEAD_LAYERS) {
    const osc = oscNode(r, wave, f);
    osc.detune.value = det;
    if (g0) {
      osc.frequency.setValueAtTime(g0, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + (o.glide ?? 0.07));
    }
    depth.connect(osc.detune);
    osc.connect(gainNode(ctx, gain)).connect(into);
    osc.start(t);
    osc.stop(stop);
  }
  vib.start(t);
  vib.stop(stop);
}
const LEAD_LAYERS = [['sawtooth', 0, 1], ['sawtooth', 9, 0.75], ['sawtooth', -1197, 0.55]];
const FLUTE_LAYERS = [['sine', 0, 1], ['triangle', 4, 0.32], ['sine', 1202, 0.07]];

/** Flute: a breathy sine lead with a chiff of air at the onset and a thin airy band under the tone. */
function fluteVoice(r, out, t, m, dur, vel, o, from) {
  const lvl = o.level ?? 0.16;
  leadVoice(r, out, t, m, dur, vel, {
    layers: FLUTE_LAYERS, cutoff: o.cutoff ?? 2600, base: 1500, q: 0.7, level: lvl, attack: o.attack ?? 0.07,
    release: o.release ?? 0.28, vib: o.vib ?? 13, vibRate: o.vibRate ?? 4.8, glide: o.glide ?? 0.12, oct: o.oct,
  }, from);
  const f = mtof(m + (o.oct ?? 0));
  noise(r, out, t, { f: hz(f * 2.2), q: 2.2, a: 0.012, d: 0.11, vol: vel * lvl * 0.45 });
  noise(r, out, t, { f: hz(f * 1.5), q: 1.2, a: 0.08, hold: Math.max(0, dur - 0.1), d: 0.25, vol: vel * lvl * (o.breath ?? 0.14) });
}

/**
 * Strings: three detuned saws per note through a lowpass with a bowed bite and delayed vibrato. A short
 * o.attack and o.gate play spiccato (march ostinati), a long attack plays legato chords; o.bow adds rosin noise.
 */
function stringsVoice(r, out, t, m, dur, vel, o) {
  const ctx = r.ctx;
  const f = mtof(m + (o.oct ?? 0));
  const lvl = vel * (o.level ?? 0.16);
  const a = Math.min(o.attack ?? 0.04, dur * 0.6);
  const rel = o.release ?? 0.18;
  const end = t + Math.max(a + 0.02, dur * (o.gate ?? 0.95));
  const stop = end + rel * 1.4 + 0.02;
  const cut = o.cutoff ?? 1600;
  const lp = filterNode(ctx, 'lowpass', cut, o.q ?? 0.8);
  lp.frequency.setValueAtTime(cut * 1.7, t);
  lp.frequency.setTargetAtTime(cut, t + a, 0.12);
  const v = gainNode(ctx, 0);
  lp.connect(v).connect(out);
  v.gain.setValueAtTime(0, t);
  v.gain.linearRampToValueAtTime(lvl, t + a);
  v.gain.setValueAtTime(lvl, end);
  v.gain.setTargetAtTime(0, end, rel / 5);
  const vib = oscNode(r, 'sine', o.vibRate ?? 5.2);
  const depth = gainNode(ctx, 0);
  depth.gain.setValueAtTime(0, t + 0.15);
  depth.gain.linearRampToValueAtTime(o.vib ?? 10, t + 0.5);
  vib.connect(depth);
  for (const det of [-11, 0, 9]) {
    const osc = oscNode(r, 'sawtooth', f);
    osc.detune.value = det + (Math.random() - 0.5) * 3;
    depth.connect(osc.detune);
    osc.connect(lp);
    osc.start(t);
    osc.stop(stop);
  }
  vib.start(t);
  vib.stop(stop);
  if (o.bow) noise(r, out, t, { f: hz(Math.min(5000, f * 7)), q: 1.4, a: 0.004, d: 0.07, vol: lvl * o.bow });
}

/** Water drop: a sine that chirps up onto its pitch (a drop's bubble rings rising), a glassy overtone, a tick. */
function dripVoice(r, out, t, m, dur, vel, o) {
  const f = mtof(m + (o.oct ?? 0));
  const lvl = vel * (o.level ?? 0.18);
  const d = o.decay ?? 0.45;
  tone(r, out, t, { f: f * (o.rise ?? 0.6), f1: f, glide: o.chirp ?? 0.03, a: 0.001, d, vol: lvl });
  tone(r, out, t, { type: 'triangle', f: f * 2, a: 0.001, d: d * 0.22, vol: lvl * 0.16 });
  noise(r, out, t, { type: 'highpass', f: 6000, d: 0.004, vol: lvl * 0.25 });
}

/** Bass: saw + square through a resonant lowpass with a fast filter envelope; or a soft round bass. */
function bassVoice(r, out, t, m, dur, vel, o) {
  const ctx = r.ctx;
  const f = mtof(m);
  const lvl = vel * (o.level ?? 0.36);
  if (o.soft) {
    tone(r, out, t, { type: 'triangle', f, lp: 650, a: 0.04, hold: dur * 0.75, d: 0.7, vol: lvl });
    tone(r, out, t, { f, a: 0.04, hold: dur * 0.75, d: 0.7, vol: lvl * 0.7 });
    return;
  }
  const end = t + Math.max(0.05, dur * (o.gate ?? 0.9));
  const lp = filterNode(ctx, 'lowpass', 300, o.q ?? 5);
  const cut = o.cutoff ?? 1700;
  lp.frequency.setValueAtTime(cut * (0.6 + 0.4 * vel), t);
  lp.frequency.setTargetAtTime(o.floor ?? 260, t + 0.005, o.fdecay ?? 0.06);
  const v = gainNode(ctx, 0);
  lp.connect(v).connect(out);
  v.gain.setValueAtTime(0, t);
  v.gain.linearRampToValueAtTime(lvl, t + 0.004);
  v.gain.setTargetAtTime(lvl * 0.75, t + 0.004, 0.08);
  v.gain.setTargetAtTime(0, end, 0.018);
  for (const [wave, det] of [['sawtooth', 0], ['square', -7]]) {
    const osc = oscNode(r, wave, f);
    osc.detune.value = det;
    osc.connect(lp);
    osc.start(t);
    osc.stop(end + 0.12);
  }
}

/** Pluck: one enveloped wave through a closing lowpass; o.spread (cents) doubles it detuned, o.crush quantises it. */
function pluckVoice(r, out, t, m, dur, vel, o) {
  const d = o.decay ?? 0.25;
  const cut = o.cutoff ?? 3600;
  const f = mtof(m + (o.oct ?? 0));
  const lvl = vel * (o.level ?? 0.15);
  for (const det of o.spread ? [-o.spread, o.spread] : [0]) {
    tone(r, out, t, { type: o.wave ?? 'square', f, detune: det, crush: o.crush, lp: cut, lp1: cut * 0.2, lpGlide: d * 0.6, lpQ: 2, a: 0.002, d, vol: o.spread ? lvl * 0.7 : lvl });
  }
}

function harpVoice(r, out, t, m, dur, vel, o) {
  const f = mtof(m + (o.oct ?? 0));
  const d = o.decay ?? 1.4;
  const lvl = vel * (o.level ?? 0.2);
  tone(r, out, t, { type: 'triangle', f, lp: o.cutoff ?? 3200, lp1: 800, lpGlide: d * 0.5, a: 0.002, d, vol: lvl });
  tone(r, out, t, { f: f * 2, a: 0.001, d: d * 0.35, vol: lvl * 0.3 });
}

/** Melodic bell: FM celesta tone + a faint two-octave ping + a detuned unmodulated layer for warmth. */
function bellVoice(r, out, t, m, dur, vel, o) {
  const f = mtof(m + (o.oct ?? 0));
  const d = o.decay ?? 1.8;
  const lvl = vel * (o.level ?? 0.22);
  bell(r, out, t, { f, ratio: o.ratio ?? 2, index: o.index ?? 1.3, idxDecay: 0.15, d, vol: lvl });
  tone(r, out, t, { f, detune: 6, a: 0.004, d: d * 0.8, vol: lvl * 0.35 });
  tone(r, out, t, { f: f * 4, a: 0.001, d: 0.28, vol: lvl * 0.1 });
}

function stabVoice(r, out, t, notes, dur, vel, o) {
  brass(r, out, t, notes.map((m) => mtof(m + (o.oct ?? 12))), {
    vol: vel * (o.level ?? 0.3), hold: Math.min(dur * 0.5, 0.07), d: o.decay ?? 0.2, cutoff: o.cutoff ?? 4200, sustainCut: 1300,
  });
}

/**
 * Music box: a sine tine with a slowly beating twin, a faint octave, the tine's quick inharmonic ping and a
 * mechanical tick. High tines ring shorter. o.droop (cents) sags each note like a box winding down.
 */
function boxVoice(r, out, t, m, dur, vel, o) {
  const f = mtof(m + (o.oct ?? 0));
  const lvl = vel * (o.level ?? 0.2);
  const d = (o.decay ?? 1.8) * clamp(Math.sqrt(1000 / f), 0.55, 1.3);
  const f1 = o.droop ? f * 2 ** (-o.droop / 1200) : f;
  const twin = 1 + (o.beat ?? 3.5) / 1000;
  tone(r, out, t, { f, f1, glide: d, a: 0.002, d, vol: lvl });
  tone(r, out, t, { f: f * twin, f1: f1 * twin, glide: d, a: 0.002, d: d * 0.8, vol: lvl * 0.45 });
  tone(r, out, t, { f: f * 2, a: 0.001, d: d * 0.3, vol: lvl * 0.12 });
  tone(r, out, t, { f: f * 5.93, a: 0.0005, d: 0.07, vol: lvl * 0.3 });
  noise(r, out, t, { type: 'highpass', f: 5200, d: 0.006, vol: lvl * 0.35 });
}

// Formant centres (Hz) and gains of the first three formants, per vowel.
const VOWELS = {
  oo: [[320, 1], [800, 0.3], [2500, 0.06]],
  oh: [[460, 1], [820, 0.45], [2700, 0.08]],
  ah: [[760, 1], [1150, 0.55], [2800, 0.14]],
  ee: [[300, 1], [2200, 0.35], [3000, 0.14]],
  mm: [[250, 1], [1050, 0.1], [2500, 0.03]], // a closed-mouth hum
};

/**
 * Choir: two slightly detuned saw "singers" per note, each pair on its own slow vibrato, through a
 * three-formant vowel filter (o.vowel: oo / oh / ah / ee). Swells in over o.attack.
 */
function choirVoice(r, out, t, notes, dur, vel, o) {
  const ctx = r.ctx;
  const a = Math.min(o.attack ?? 0.5, dur * 0.8);
  const rel = o.release ?? 1.2;
  const end = t + dur;
  const stop = end + rel * 1.3;
  const peak = (vel * (o.level ?? 0.5)) / Math.sqrt(notes.length);
  const v = gainNode(ctx, 0);
  v.gain.setValueAtTime(0, t);
  v.gain.linearRampToValueAtTime(peak, t + a);
  v.gain.setValueAtTime(peak, end);
  v.gain.setTargetAtTime(0, end, rel / 5);
  v.connect(out);
  const src = gainNode(ctx, 1);
  for (const [f, g] of VOWELS[o.vowel] || VOWELS.oo) {
    src.connect(filterNode(ctx, 'bandpass', f, o.formantQ ?? 5)).connect(gainNode(ctx, g * 1.6)).connect(v);
  }
  const lfos = [4.6, 5.3].map((rate) => {
    const lfo = oscNode(r, 'sine', rate * (0.95 + Math.random() * 0.1));
    const depth = gainNode(ctx, o.vib ?? 9);
    lfo.connect(depth);
    lfo.start(t);
    lfo.stop(stop);
    return depth;
  });
  for (const m of notes) {
    const f = mtof(m + (o.oct ?? 0));
    [-7, 6].forEach((det, k) => {
      const osc = oscNode(r, 'sawtooth', f);
      osc.detune.value = det + (Math.random() - 0.5) * 4;
      lfos[k].connect(osc.detune);
      osc.connect(src);
      osc.start(t);
      osc.stop(stop);
    });
  }
}

/** Sub pulse: a sine that drops onto its pitch (a soft thump) with a faint octave so small speakers hear it. */
function subVoice(r, out, t, m, dur, vel, o) {
  const f = mtof(m + (o.oct ?? 0));
  const lvl = vel * (o.level ?? 0.4);
  const hold = Math.max(0, dur * (o.gate ?? 0.5) - 0.02);
  const d = o.decay ?? 0.9;
  tone(r, out, t, { f: f * 1.5, f1: f, glide: 0.07, a: o.attack ?? 0.012, hold, d, vol: lvl });
  tone(r, out, t, { type: 'triangle', f: f * 2, lp: 500, a: 0.02, hold, d: d * 0.6, vol: lvl * (o.harm ?? 0.25) });
}

/** Rising gain for a swell: from silence to `peak` at `end`, then cut. */
function rise(p, t, end, peak) {
  p.setValueAtTime(0.0001, t);
  p.exponentialRampToValueAtTime(Math.max(0.0002, peak), end - 0.01);
  p.linearRampToValueAtTime(0, end + 0.05);
}

/**
 * Swell: a reverse-cymbal riser over the whole note (noise sweeping o.from -> o.to Hz), plus the chord
 * fading in on saws through an opening filter (o.tonal 0-1); cut dead at the end, ready for a strike.
 */
function swellVoice(r, out, t, notes, dur, vel, o) {
  const ctx = r.ctx;
  const end = t + dur;
  const lvl = vel * (o.level ?? 0.3);
  const src = noiseSource(r, t);
  const bp = filterNode(ctx, 'bandpass', o.from ?? 500, o.q ?? 0.8);
  sweep(bp.frequency, t, o.from ?? 500, o.to ?? 8000, dur);
  const v = gainNode(ctx, 0);
  src.connect(bp).connect(v).connect(out);
  rise(v.gain, t, end, lvl);
  src.stop(end + 0.1);
  if (!o.tonal) return;
  const lp = filterNode(ctx, 'lowpass', 300, 0.8);
  sweep(lp.frequency, t, 300, 4000, dur);
  const g = gainNode(ctx, 0);
  lp.connect(g).connect(out);
  rise(g.gain, t, end, (lvl * o.tonal) / Math.sqrt(notes.length));
  for (const m of notes) {
    const osc = oscNode(r, 'sawtooth', mtof(m + (o.oct ?? 0)));
    osc.connect(lp);
    osc.start(t);
    osc.stop(end + 0.1);
  }
}

// Every pitched synth by name; a line may borrow another line's synth with voices.<line>.synth.
// Chord synths take every note of the event at once; the others play each note on its own.
const SYNTHS = {
  pad: padVoice, lead: leadVoice, bell: bellVoice, bass: bassVoice, arp: pluckVoice, harp: harpVoice,
  stab: stabVoice, box: boxVoice, choir: choirVoice, sub: subVoice, swell: swellVoice,
  flute: fluteVoice, strings: stringsVoice, drip: dripVoice,
};
const CHORD_SYNTHS = new Set(['pad', 'stab', 'choir', 'swell']);

function playNote(r, out, t, e, dur, v, vo) {
  const kind = vo.synth || e.b;
  const fn = SYNTHS[kind];
  if (CHORD_SYNTHS.has(kind)) fn(r, out, t, [].concat(e.m), dur, v, vo);
  else for (const m of [].concat(e.m)) fn(r, out, t, m, dur, v, vo, e.from);
}

const TOM_PITCH = { h: 165, m: 125, l: 92, x: 125, X: 125, o: 125 };

// ------------------------------------------------------------------ channel strips
// Per track and instrument: level -> pan -> track dry, with reverb/delay sends. Values: [level, pan, wet, echo].
const STRIPS = {
  pad: [1, 0, 0.35, 0], bell: [1, 0.12, 0.45, 0.3], lead: [1, 0, 0.22, 0.12], bass: [1, 0, 0.02, 0],
  arp: [1, -0.25, 0.2, 0.34], harp: [1, -0.18, 0.4, 0.2], stab: [1, 0.08, 0.2, 0.05],
  choir: [1, 0, 0.45, 0.06], swell: [1, 0, 0.3, 0.05],
  kick: [1, 0, 0.03, 0], snare: [1, 0.03, 0.2, 0], hat: [1, 0.24, 0.06, 0], crash: [1, -0.2, 0.22, 0], tom: [1, -0.05, 0.18, 0],
};

function makeStrip(rt, name, base) {
  const ctx = rt.r.ctx;
  const [lvl, pan, wet, echo] = STRIPS[base];
  const sends = rt.track.sends?.[name] || {};
  const inp = gainNode(ctx, lvl * (rt.track.mix?.[name] ?? 1));
  const p = panNode(ctx, sends.pan ?? pan);
  inp.connect(p).connect(rt.out.dry);
  const w = sends.wet ?? wet;
  const e = sends.echo ?? echo;
  if (w > 0) p.connect(gainNode(ctx, w)).connect(rt.out.wet);
  if (e > 0) p.connect(gainNode(ctx, e)).connect(rt.out.echo);
  return inp;
}

// ------------------------------------------------------------------ pattern compiler
// A track is { key, bpm, meter, gain, delay, voices, mix, sends, intro?, loop, parts, once?, motifs? }.
//   meter: '4/4' (default), '3/4', '6/8', '7/8'... A bar holds beats * 16 / unit sixteenth steps (4/4: 16,
//   3/4 and 6/8: 12, 7/8: 14). bpm counts quarter notes, or dotted quarters in compound metres (6/8, 9/8, 12/8).
//   delay: echo time in beats. once: a sting, played one time over the ducked current track.
//   choirSfx: chords (note-name arrays) WARDEN's 'choir' sfx sings while this track plays (default: F minor).
//   voices.<line>: synth options; voices.<line>.synth borrows another synth (a 'bell' line on the music box).
// A part is { bars, chords, <instrument>: pattern | pattern[] (one per bar, cycled) }.
// A numbered line ('lead2', 'bell2') is an extra voice of the base instrument with its own channel strip.
// Pattern = whitespace tokens; their count must divide the bar's steps (4/4: 1 2 4 8 16; 3/4 and 6/8:
// 1 2 3 4 6 12). '.' rest, '-' extend the previous note.
//   melodic (lead, bell, bass, choir): note names 'E5', '~G5' glides from the previous note, 'E5!' accent,
//   'E5?' ghost; bass also: R root, O octave, F fifth, f fifth below, b flat 2nd, t tritone, L octave down
//   (of the chord's bass note);
//   arp / harp: digits index the chord voicing (4 notes: 4 = first note + 12 ...), or note names;
//   stab, swell: x / X play the chord; choir: x / X sing the chord, or note names;
//   drums (kick snare hat ohat crash tom): X accent, x normal, o ghost; tom also h / m / l pitch.
//   Any note or drum token may end in '*N' (N = 2-9): a ratchet that retriggers it N times evenly inside its
//   own step span ('x*2' a snare drag, 'D#5*4' a glitch stutter); earlier hits are softer, the last one keeps
//   any '-' extensions.
// Chord = 'BASS: voicing notes', or an array of chords splitting the bar evenly.

const DRUMS = new Set(['kick', 'snare', 'hat', 'ohat', 'crash', 'tom']);
const CHORD_LINES = new Set(['stab', 'swell', 'choir']);
const BASS_TOK = { R: 0, O: 12, F: 7, f: -5, b: 1, t: 6, L: -12 };

/** Steps per bar and seconds per step of a track's metre. */
function meterOf(def, name) {
  const m = /^(\d+)\/(4|8)$/.exec(def.meter || '4/4');
  if (!m || Number(m[1]) < 1) throw new Error(`${name}: bad meter "${def.meter}"`);
  const beats = Number(m[1]);
  const unit = Number(m[2]);
  const compound = unit === 8 && beats % 3 === 0;
  return { barSteps: (beats * 16) / unit, stepDur: (compound ? 10 : 15) / def.bpm };
}

function parseChord(s, where) {
  const [root, rest] = typeof s === 'string' ? s.split(':') : [];
  const c = rest == null ? null : { root: noteMidi(root.trim()), notes: rest.trim().split(/\s+/).map(noteMidi) };
  if (!c || Number.isNaN(c.root) || !c.notes.length || c.notes.some(Number.isNaN)) throw new Error(`bad chord "${s}" ${where}`);
  return c;
}

function makeEvent(inst, base, tok, chord, len, prev, where) {
  const rat = /^(.+)\*([2-9])$/.exec(tok);
  if (rat) return { ...makeEvent(inst, base, rat[1], chord, len, prev, where), rat: Number(rat[2]), span: len };
  if (DRUMS.has(base)) {
    const v = { X: 1, x: 0.72, o: 0.38, h: 0.85, m: 0.85, l: 0.85 }[tok];
    if (!v) throw new Error(`bad drum token "${tok}" ${where}`);
    return { i: inst, b: base, v, tok, len };
  }
  let s = tok;
  let v = 0.82;
  const glide = s[0] === '~';
  if (glide) s = s.slice(1);
  if (s.endsWith('!')) { v = 1; s = s.slice(0, -1); } else if (s.endsWith('?')) { v = 0.55; s = s.slice(0, -1); }
  if (CHORD_LINES.has(base) && (s === 'x' || s === 'X')) {
    if (!chord) throw new Error(`"${tok}" without a chord ${where}`);
    return { i: inst, b: base, m: chord.notes, len, v: s === 'X' ? 1 : 0.78 };
  }
  let m = NaN;
  if ((base === 'arp' || base === 'harp') && /^\d+$/.test(s)) {
    const idx = Number(s);
    const n = chord ? chord.notes.length : 0;
    if (n) m = chord.notes[idx % n] + 12 * Math.floor(idx / n);
  } else if (base === 'bass' && s in BASS_TOK) {
    if (chord) m = chord.root + BASS_TOK[s];
  } else if (base !== 'stab' && base !== 'swell') m = noteMidi(s);
  if (Number.isNaN(m)) throw new Error(`bad token "${tok}" ${where}`);
  return { i: inst, b: base, m, len, v, from: glide && prev ? prev.m : null };
}

function compilePart(part, label, barSteps) {
  if (!part || !Number.isInteger(part.bars) || part.bars < 1) throw new Error(`${label}: bars must be a whole number`);
  const n = part.bars * barSteps;
  const steps = Array.from({ length: n }, () => []);
  const chordAt = new Array(n).fill(null);
  let prevStr = null;
  let prevPad = null;
  for (let b = 0; b < part.bars && part.chords; b++) {
    const entry = part.chords[b % part.chords.length];
    const split = Array.isArray(entry) ? entry : [entry];
    const len = barSteps / split.length;
    if (!Number.isInteger(len)) throw new Error(`${label} bar ${b + 1}: ${split.length} chords do not split the bar`);
    split.forEach((cs, h) => {
      const at = b * barSteps + h * len;
      const c = parseChord(cs, `in ${label} bar ${b + 1}`);
      chordAt.fill(c, at, at + len);
      if (cs === prevStr) prevPad.len += len; // same chord again: hold the pad instead of retriggering
      else {
        prevPad = { i: 'pad', b: 'pad', m: c.notes, len, v: 1 };
        steps[at].push(prevPad);
        prevStr = cs;
      }
    });
  }
  for (const [inst, val] of Object.entries(part)) {
    if (inst === 'bars' || inst === 'chords') continue;
    const base = inst.replace(/\d+$/, '');
    if (!(base in STRIPS) && base !== 'ohat') throw new Error(`${label}: unknown instrument "${inst}"`);
    const bars = Array.isArray(val) ? val : [val];
    let last = null;
    for (let b = 0; b < part.bars; b++) {
      const pat = bars[b % bars.length];
      if (!pat) { last = null; continue; }
      const toks = pat.trim().split(/\s+/);
      const per = barSteps / toks.length;
      if (!Number.isInteger(per)) throw new Error(`${label}.${inst} bar ${b + 1}: ${toks.length} tokens in a ${barSteps}-step bar`);
      toks.forEach((tok, k) => {
        const at = b * barSteps + k * per;
        if (tok === '.') { last = null; return; }
        if (tok === '-') { if (last) last.len += per; return; }
        const ev = makeEvent(inst, base, tok, chordAt[at], per, last, `in ${label}.${inst} bar ${b + 1}`);
        steps[at].push(ev);
        last = DRUMS.has(base) ? null : ev;
      });
    }
  }
  return { bars: part.bars, barSteps, steps };
}

/**
 * Compile a track definition (pure: no WebAudio, runs in node). Throws an Error naming the track and
 * the place on malformed data. Returns { name, parts, intro, loop, once, barSteps, stepDur, introBars,
 * loopBars, introSeconds, loopSeconds }.
 */
export function compileTrack(def, name = 'track') {
  if (!def || typeof def !== 'object') throw new Error(`${name}: not a track definition`);
  if (!(def.bpm > 0)) throw new Error(`${name}: bpm must be a positive number`);
  const { barSteps, stepDur } = meterOf(def, name);
  for (const [line, vo] of Object.entries(def.voices || {})) {
    if (vo.synth && !SYNTHS[vo.synth]) throw new Error(`${name}: voice "${line}" uses unknown synth "${vo.synth}"`);
  }
  const parts = {};
  for (const [k, p] of Object.entries(def.parts || {})) parts[k] = compilePart(p, `${name}.${k}`, barSteps);
  const intro = def.intro || [];
  const loop = def.loop || [];
  if (!loop.length) throw new Error(`${name}: empty loop`);
  for (const k of [...intro, ...loop]) if (!parts[k]) throw new Error(`${name}: unknown part "${k}"`);
  const bars = (list) => list.reduce((s, k) => s + parts[k].bars, 0);
  const barSec = barSteps * stepDur;
  return {
    name, parts, intro, loop, once: !!def.once, barSteps, stepDur,
    introBars: bars(intro), loopBars: bars(loop), introSeconds: bars(intro) * barSec, loopSeconds: bars(loop) * barSec,
  };
}

const compiled = new Map();
/**
 * The compiled data of TRACKS[name] (cached), or null for an unknown name. A malformed track fails alone:
 * it is reported once with console.error and skipped, so every other track keeps working.
 */
export function compiledTrack(name) {
  if (compiled.has(name)) return compiled.get(name);
  if (!Object.hasOwn(TRACKS, name)) return null;
  let c = null;
  try {
    c = compileTrack(TRACKS[name], name);
  } catch (e) {
    console.error(`[audio] track "${name}" is malformed and skipped: ${e.message}`);
  }
  compiled.set(name, c);
  return c;
}

// ------------------------------------------------------------------ sequencer runtime

function partAt(rt) {
  const { intro, loop } = rt.c;
  const i = rt.seqIdx;
  return i < intro.length ? intro[i] : loop[(i - intro.length) % loop.length];
}

function advance(rt) {
  rt.step++;
  if (rt.step >= rt.c.parts[partAt(rt)].steps.length) {
    rt.step = 0;
    rt.seqIdx++;
  }
  rt.next += rt.stepDur;
}

function playEvent(r, out, t, e, dur, v, vo) {
  switch (e.b) {
    case 'kick': kick(r, out, t, v, vo); break;
    case 'snare': snare(r, out, t, v, vo); break;
    case 'hat': hat(r, out, t, v, false, vo); break;
    case 'ohat': hat(r, out, t, v, true, vo); break;
    case 'crash': crash(r, out, t, v); break;
    case 'tom': tom(r, out, t, v, TOM_PITCH[e.tok] * (vo.pitch ?? 1)); break;
    default: playNote(r, out, t, e, dur, v, vo);
  }
}

function playStep(rt, t) {
  const evs = rt.c.parts[partAt(rt)].steps[rt.step];
  for (let k = 0; k < evs.length; k++) {
    const e = evs[k];
    if (rt.only && !rt.only.has(e.i)) continue;
    const name = e.i === 'ohat' ? 'hat' : e.i;
    const out = rt.strips[name] || (rt.strips[name] = makeStrip(rt, name, e.b === 'ohat' ? 'hat' : e.b));
    const vo = rt.track.voices?.[e.i] || rt.track.voices?.[e.b] || {};
    const dur = e.len * rt.stepDur;
    if (!e.rat) {
      playEvent(rt.r, out, t, e, dur, e.v, vo);
      continue;
    }
    // ratchet: e.rat hits across the token's own span; the last one carries the rest of the note
    const sub = (e.span * rt.stepDur) / e.rat;
    for (let h = 0; h < e.rat; h++) {
      const last = h === e.rat - 1;
      playEvent(rt.r, out, t + h * sub, e, last ? dur - h * sub : sub * 0.8, last ? e.v : e.v * 0.62, vo);
    }
  }
}

/**
 * Start a track on a rig at audio time `when`. Returns a runtime handle for pumpTrack/stopTrack.
 * opts.fade: fade-in seconds; opts.part: start at this loop part (skips the intro); opts.only: play just these
 * lines (the bench's stems; chords are the line 'pad'). Looping tracks play into
 * the duckable bed; a `once` track (sting) plays straight into the music bus and stops scheduling after
 * its intro and loop have played one time. Throws for an unknown or malformed track.
 */
export function startTrack(r, name, when, { fade = 0, part = null, only = null } = {}) {
  const c = compiledTrack(name);
  if (!c) throw new Error(`track "${name}" is unknown or malformed`);
  const tr = TRACKS[name];
  const ctx = r.ctx;
  const dest = c.once ? r.music : r.bed;
  const out = { dry: gainNode(ctx, 0), wet: gainNode(ctx, 0), echo: gainNode(ctx, 0) };
  for (const k of ['dry', 'wet', 'echo']) {
    out[k].connect(dest[k]);
    const p = out[k].gain;
    const level = tr.gain ?? 1;
    p.setValueAtTime(fade > 0 ? 0.0001 : level, when);
    if (fade > 0) p.linearRampToValueAtTime(level, when + fade);
  }
  const rt = { r, name, track: tr, c, out, strips: {}, seqIdx: 0, step: 0, next: when, stepDur: c.stepDur, stopAt: Infinity, only: only && new Set(only) };
  if (c.once) rt.stopAt = when + c.introSeconds + c.loopSeconds;
  else {
    const i = part ? c.loop.indexOf(part) : -1;
    if (i >= 0) rt.seqIdx = c.intro.length + i;
    // a sting borrows the shared delay as it is; a looping track syncs it to its own tempo
    r.setDelay((tr.delay ?? 0.75) * (60 / tr.bpm), when);
  }
  return rt;
}

/** Schedule every step that starts before `until` (audio time). Steps already in the past are skipped. */
export function pumpTrack(rt, until, now = -Infinity) {
  while (rt.next < now - 0.02 && rt.next < rt.stopAt) advance(rt); // stalled main thread: drop, keep the grid
  const end = Math.min(until, rt.stopAt);
  while (rt.next < end) {
    playStep(rt, rt.next);
    advance(rt);
  }
}

/** Fade a running track out from `when` over `fade` seconds; it stops scheduling at the end of the fade. */
export function stopTrack(rt, when, fade = FADE) {
  rt.stopAt = when + fade;
  for (const k of ['dry', 'wet', 'echo']) {
    const p = rt.out[k].gain;
    p.cancelScheduledValues(when);
    p.setValueAtTime(p.value, when);
    p.linearRampToValueAtTime(0.0001, when + fade);
  }
}

function disposeTrack(rt) {
  for (const k of ['dry', 'wet', 'echo']) rt.out[k].disconnect();
}

// ------------------------------------------------------------------ tracks (data)

const rep = (n, p) => Array(n).fill(p);
const firstOnly = (n, p) => [p, ...rep(n - 1, '')];
const lastDiff = (n, p, last) => [...rep(n - 1, p), last];

const GALLOP = 'R . R R R . R R R . R R R . R R';
const GALLOP_TURN = 'R . R R R . R R O . R R F . R R';

// Phrases shared by a track's sections (a theme and its variation keep the same chords and tune).
// HALCYON's lullaby, F major. A: I - I - ii7 - V | IV - ii7 - V7 - I. B: vi7 - bVII - ii7 - V7 | I - vi7 -
// ii7 V7 - I; the borrowed bVII (Eb) foreshadows WARDEN's minor.
const LULLABY_A = {
  chords: ['F2: F3 A3 C4', 'F2: F3 A3 C4', 'G1: F3 Bb3 D4', 'C2: E3 G3 C4', 'Bb1: F3 Bb3 D4', 'G1: F3 Bb3 D4', 'C2: E3 G3 Bb3', 'F2: F3 A3 C4'],
  tune: ['A4 - C5', 'F5 - E5', 'D5 E5 D5', 'C5 - -', 'Bb4 - D5', 'G5 - F5', 'E5 D5 E5', 'F5 - -'],
  descant: ['F5 - -', 'C5 - -', 'D5 - -', 'E5 - -', 'F5 - -', 'D5 - -', 'C5 - -', 'A4 - -'],
};
const LULLABY_B = {
  chords: ['D2: F3 A3 C4', 'Eb2: G3 Bb3 Eb4', 'G1: F3 Bb3 D4', 'C2: E3 G3 Bb3', 'F2: F3 A3 C4', 'D2: F3 A3 C4',
    ['G1: F3 Bb3 D4', 'G1: F3 Bb3 D4', 'C2: E3 G3 Bb3'], 'F2: F3 A3 C4'],
  tune: ['C5 - A5', 'G5 - F5', 'Bb5 - A5', 'G5 - -', 'A4 - C5', 'F5 - E5', 'D5 C5 G4', 'F4 - -'],
  descant: ['F5 - -', 'Eb5 - -', 'D5 - -', 'E5 - -', 'F5 - -', 'D5 - -', 'Bb4 - E5', 'A4 - -'],
};

// WARDEN's theme: the same lullaby in F natural minor (A, D, E lowered), on the same bar plan.
const WARDEN_A = {
  chords: ['F2: F3 Ab3 C4', 'F2: F3 Ab3 C4', 'Bb1: F3 Ab3 Db4', 'C2: Eb3 G3 C4', 'Bb1: F3 Bb3 Db4', 'Eb2: G3 Bb3 Eb4', 'Db2: F3 Ab3 Db4', 'F2: F3 Ab3 C4'],
  tune: ['Ab4 - C5', 'F5 - Eb5', 'Db5 Eb5 Db5', 'C5 - -', 'Bb4 - Db5', 'G5 - F5', 'Eb5 Db5 Eb5', 'F5 - -'],
};
const WARDEN_B = {
  chords: ['Db2: F3 Ab3 C4', 'Bb1: F3 Bb3 Db4', 'Ab1: Eb3 Ab3 C4', 'C2: E3 G3 C4', 'F2: F3 Ab3 C4', 'Db2: F3 Ab3 Db4',
    ['Bb1: F3 Bb3 Db4', 'Bb1: F3 Bb3 Db4', 'C2: E3 G3 C4'], 'F2: F3 Ab3 C4'],
  tune: ['C5 - Ab5', 'G5 - F5', 'Bb5 - Ab5', 'G5 - -', 'Ab4 - C5', 'F5 - Eb5', 'Db5 C5 G4', 'F4 - -'],
};

// Driftmarket, G Mixolydian jig (6/8: six eighths a bar, the lilt is quarter-eighth). The Ringborn motif opens
// the tune; F natural (the flat seventh) and the F -> G cadence give the Mixolydian colour.
const DRIFT_A = {
  chords: ['G2: G3 B3 D4', ['F2: F3 A3 C4', 'G2: G3 B3 D4'], 'E2: E3 G3 B3', 'C2: E3 G3 C4', 'G2: G3 B3 D4', 'F2: F3 A3 C4',
    ['C2: E3 G3 C4', 'D2: D3 F3 A3'], 'G2: G3 B3 D4'],
  tune: ['D5 - G5 F5 - D5', 'C5 - A4 G4 - -', 'B4 - E5 G5 - E5', 'G5 - E5 C5 - -', 'D5 - G5 F5 - D5', 'C5 - A4 F4 - A4',
    'E5 - C5 D5 - F5', 'G5 - D5 B4 - G4'],
  descant: ['B5 - - A5 - -', 'A5 - - B5 - -', 'G5 - - B5 - -', 'C6 - - G5 - -', 'B5 - - A5 - -', 'A5 - - C6 - -', 'G5 - - A5 - -', 'B5 - - - - -'],
};

// Shoals, C# minor: glass-bell melody over m9 / maj7 colours.
const SHOALS_A = {
  chords: ['C#2: E3 G#3 B3 D#4', 'A1: E3 G#3 C#4 E4', 'F#1: E3 A3 C#4', ['G#1: D#3 G#3 C#4', 'G#1: D#3 G#3 B#3'],
    'C#2: E3 G#3 B3', 'A1: E3 A3 C#4 D#4', 'E2: E3 G#3 B3', 'B1: D#3 F#3 B3 C#4'],
  tune: ['G#5 - - - B5 - D#6 -', 'C#6 - - - - - B5 -', 'A5 - - - G#5 - E5 -', 'D#5 - - - - - - -',
    'G#5 - - - B5 - E6 -', 'D#6 - - - C#6 - - -', 'B5 - - - G#5 - D#5 -', 'F#5 - - - - - - -'],
};

// The Meridian, F# Phrygian: everything hangs over an F# pedal; G over it is the Phrygian dread.
const FSM = 'F#1: C#3 F#3 A3';
const G_FS = 'F#1: B2 D3 G3';
const D_FS = 'F#1: A2 D3 F#3';
const EM_FS = 'F#1: B2 E3 G3';
const BM_FS = 'F#1: B2 D3 F#3';

// The Arboretum, D Dorian 3/4. The lullaby's opening fits D Dorian at its own pitches (A C F E D E), so the
// flute states it untransposed over Dm7 - Fmaj7 - G - Cadd9, then wanders down a sequence onto A.
const ARB_A = {
  chords: ['D2: D3 F3 A3 C4', 'F2: F3 A3 C4 E4', 'G1: D3 G3 B3 D4', 'C2: E3 G3 C4 D4',
    'A1: E3 A3 C4 E4', 'G1: D3 G3 B3 D4', 'E2: D3 G3 B3 E4', ['A1: D3 E3 A3 D4', 'A1: C3 E3 A3 C4']],
  tune: ['A4 - C5', 'F5 - E5', 'D5 E5 D5', 'C5 - -', 'E5 - - - C5 D5', 'B4 - - - G4 A4', 'G4 - - - A4 B4', 'A4 - - - - -'],
};
// Drips: chord tones two octaves up, never on the same steps twice in a row, so they fall like water.
const DRIPS = ['0 . . 2 . . . 4 . 1 . .', '. . 3 . . 5 . . . . 2 .', '1 . . . 4 . 2 . . . . 5', '. 3 . . . . 0 . . 4 . .'];
const DRIPS_HI = ['', '. . . . . . . . 6 . . .', '', '. . . . 7 . . . . . . .'];
const RAIN = ['o . . o . o . . o . . o', '. o . . o . . o . o . .', 'o . o . . . o . . o . .', '. . o . o . . o . . o o'];

// The Choir: every voicing of the Choir chord (A E B D F#, a pentatonic cluster over A) and its golden turns.
const CHOIR_CHORD = 'A1: A2 E3 B3 D4 F#4';
const CHOIR_GOLD = 'A1: A2 E3 C#4 E4 B4';
const CHOIR_D = 'A1: A2 D3 F#3 B3 E4';
const CHOIR_G = 'A1: G2 D3 B3 E4 F#4';

// The Security Spire, C minor march. The alarm is WARDEN's theme upside down (+4 +5 -2 -2 +2 becomes
// -4 -5 +2 +2 -2): from C6 it fits Cm, Ab and Fm, from G5 it fits Cm. The low strings saw a dotted ostinato.
const ALARM_C = 'C6 . Ab5 . Eb5 . F5 . G5 . F5 . . . . .';
const ALARM_C4 = 'C5 . Ab4 . Eb4 . F4 . G4 . F4 . . . . .';
const ALARM_G = 'G5 . Eb5 . Bb4 . C5 . D5 . C5 . . . . .';
const MARCH = 'R . R R R . O . R . R R R . F .';
const SNARE_MARCH = 'X . . o x . o . X . . o x . o o';
const SPIRE_A = ['C2: G3 C4 Eb4', 'C2: G3 C4 Eb4', 'Ab1: Ab3 C4 Eb4', 'Ab1: Ab3 C4 Eb4', 'F1: Ab3 C4 F4', 'F1: Ab3 C4 F4', 'G1: G3 B3 D4', 'G1: G3 B3 D4'];
const SPIRE_B = {
  chords: ['C2: G3 C4 Eb4', 'Eb2: G3 Bb3 Eb4', 'Ab1: Ab3 C4 Eb4', 'G1: G3 B3 D4', 'C2: G3 C4 Eb4', 'Bb1: F3 Bb3 D4', 'Ab1: Ab3 C4 Eb4', 'G1: G3 B3 D4'],
  cello: ['G3 - - - C4 - - -', 'Bb3 - - - G3 - Eb3 -', 'C4 - - - Ab3 - C4 -', 'B3 - - - - - G3 -',
    'Eb4 - - - D4 - C4 -', 'D4 - - - F4 - D4 -', 'Eb4 - - - C4 - Ab3 -', 'G3 - - - B3 - D4 -'],
};

// battle_2, E Phrygian: octave bass in sixteenths; every strain ends on the Phrygian cadence (F -> Em) or on
// E major with its F above (the Phrygian dominant).
const OCT16 = 'R O R O R O R O R O R O R O R O';

// The Memory Vault, B Lydian 7/8 (2+2+3). The lullaby moves to B (D# F# B A# G# A#) and stutters; the
// Lydian II (C# major over B) and the raised fourth (E#) keep it floating.
const VAULT_A = ['B1: F#3 A#3 D#4 F#4', 'B1: G#3 C#4 E#4 G#4', 'B1: F#3 A#3 D#4 F#4', 'B1: G#3 C#4 E#4 G#4',
  'G#1: G#3 B3 D#4 F#4', 'C#2: G#3 C#4 E#4 G#4', 'D#2: F#3 A#3 C#4 F#4', 'F#1: F#3 A#3 C#4 E#4'];
const VAULT_ARP = ['0 2 1 3 2 4 3 5 4 6 5 3 4 2', '7 5 6 4 5 3 4 2 3 1 2 0 1 3'];
const VAULT_LEAD = ['D#5 - - - E#5 - F#5', 'G#5 - - - E#5 - -', 'F#5 - - - D#5 - B4', 'C#5 - - - E#5 - G#5',
  'B5 - - - A#5 - G#5', 'E#5 - - - G#5 - C#6', 'A#5 - - - F#5 - D#5', 'E#5 - - - - - -'];
const GLITCH_HAT = ['x . x . x . x . x . x x*2 x .', 'x . x*3 . x . x . x . x . x*2 x*2'];

export const TRACKS = {
  // D minor, i-VI-III-VII colour; celesta bell melody over drifting pads and a slow harp. Melancholy, wistful.
  title: {
    key: 'D minor',
    bpm: 72,
    gain: 0.95,
    delay: 0.75,
    voices: {
      pad: { cutoff: 950, attack: 1.4, release: 2.0, level: 0.15, air: 0.03 },
      bell: { decay: 2.4, level: 0.24 },
      harp: { decay: 1.6, level: 0.15 },
      bass: { soft: true, level: 0.24 },
    },
    sends: { bell: { wet: 0.55, echo: 0.32 } },
    loop: ['A', 'B'],
    parts: {
      A: {
        bars: 8,
        chords: ['D2: F3 A3 C4 E4', 'Bb1: F3 A3 C4 D4', 'F2: F3 A3 C4 E4', 'C2: E3 G3 C4 D4',
          'G1: F3 A3 Bb3 D4', 'F2: F3 A3 C4 D4', 'Bb1: F3 A3 Bb3 D4', ['A1: E3 G3 A3 D4', 'A1: E3 G3 A3 C#4']],
        bell: ['D5 - - - A4 - C5 D5', 'F5 - - - E5 - D5 -', 'C5 - - - - - A4 C5', 'E5 - - - D5 - - -',
          'D5 - - - C5 - Bb4 -', 'A4 - - - F4 - G4 A4', 'Bb4 - - - A4 - G4 -', 'A4 - - - - - . .'],
        harp: '0 . 2 . 3 . 2 .',
        bass: 'R - - - - - - -',
      },
      B: {
        bars: 8,
        chords: ['Bb1: F3 A3 Bb3 D4', 'C2: E3 G3 C4 E4', 'A1: E3 G3 C4 E4', 'D2: F3 A3 C4 D4',
          'G1: F3 A3 Bb3 D4', 'C2: E3 G3 Bb3 D4', 'F2: F3 A3 C4 E4', ['A1: E3 G3 A3 D4', 'A1: E3 G3 A3 C#4']],
        bell: ['D5 - F5 - A5 - - -', 'G5 - - - E5 - C5 -', 'E5 - - - - - D5 C5', 'D5 - - - A4 - - -',
          'Bb4 - D5 - G5 - F5 -', 'E5 - - - G5 - Bb5 -', 'A5 - - - - - G5 F5', 'E5 - - - - - . .'],
        harp: '0 1 2 3 4 3 2 1',
        bass: 'R - - - F - - -',
      },
    },
  },

  // D Lydian (E/D shimmer): wide pads, an echoing triangle arpeggio, sparse bells. Wonder, adrift.
  explore: {
    key: 'D Lydian',
    bpm: 84,
    gain: 0.95,
    delay: 0.75,
    voices: {
      pad: { cutoff: 1250, attack: 1.6, release: 2.2, level: 0.14, air: 0.05 },
      bell: { decay: 2.0, level: 0.2, ratio: 3, index: 1 },
      arp: { wave: 'triangle', decay: 0.4, level: 0.13, oct: 12, cutoff: 3000 },
      bass: { soft: true, level: 0.22 },
      kick: { vol: 0.5, click: 0.05 },
    },
    mix: { hat: 0.35, kick: 0.6 },
    sends: { bell: { wet: 0.55, echo: 0.38 }, arp: { wet: 0.3, echo: 0.45 } },
    loop: ['A', 'B'],
    parts: {
      A: {
        bars: 8,
        chords: ['D2: F#3 A3 C#4 E4', 'D2: E3 G#3 B3 E4', 'D2: F#3 A3 C#4 E4', 'D2: E3 G#3 B3 E4',
          'B1: F#3 A3 C#4 D4', 'G1: F#3 A3 B3 D4', 'E2: F#3 G3 B3 D4', ['A1: E3 G3 B3 D4', 'A1: E3 G3 A3 C#4']],
        bell: ['. . . . A5 - - -', 'G#5 - - - F#5 - E5 -', 'F#5 - - - - - - -', '. . . . E5 - B4 -',
          'D5 - - - C#5 - D5 F#5', 'A5 - - - F#5 - D5 -', 'E5 - - - F#5 - G5 -', 'E5 - - - - - . .'],
        arp: '0 1 2 3 4 3 2 1',
        bass: 'R - - - - - - -',
      },
      B: {
        bars: 8,
        chords: ['G1: F#3 A3 B3 D4', 'A1: E3 F#3 A3 C#4', 'F#2: E3 A3 C#4 F#4', 'B1: F#3 A3 B3 D4',
          'G1: F#3 A3 B3 E4', 'E2: G3 B3 D4 F#4', 'A1: E3 G3 B3 D4', 'A1: E3 G3 A3 C#4'],
        bell: ['B5 - - - A5 - F#5 -', 'E5 - - - - - C#5 -', 'C#5 - - - - - E5 -', 'D5 - - - - - F#5 -',
          'B5 - - - A5 - F#5 -', 'G5 - - - F#5 - E5 -', 'D5 - - - E5 - - -', 'C#5 - - - - - . .'],
        arp: '0 2 4 3 5 4 6 5',
        bass: 'R - - - - - F -',
        hat: '. . x . . . x . . . x . . . x .',
        kick: 'x . . . . . . . . . x . . . . .',
      },
    },
  },

  // E minor, 148 bpm: galloping bass, brass lead with 3-3-2 pushes, chord stabs. Heroic.
  battle: {
    key: 'E minor',
    bpm: 148,
    gain: 0.66,
    delay: 0.5,
    voices: {
      lead: { cutoff: 3400, level: 0.2, vib: 18 },
      lead2: { cutoff: 2600, level: 0.13, vib: 14 },
      bass: { cutoff: 1900, level: 0.34, q: 5 },
      stab: { level: 0.3, oct: 12 },
      pad: { cutoff: 1400, attack: 0.3, release: 0.6, level: 0.1 },
      arp: { wave: 'pulse', decay: 0.14, level: 0.11, oct: 12, cutoff: 4000 },
      kick: { vol: 1, punch: 0.3 },
    },
    mix: { hat: 0.7, crash: 0.8 },
    sends: { lead: { wet: 0.25, echo: 0.16 }, lead2: { pan: -0.3, wet: 0.28 }, arp: { echo: 0.2 } },
    intro: ['I'],
    loop: ['A', 'B', 'C'],
    parts: {
      // call to arms: stab + tom build, B4 - D#5 pickup into the theme
      I: {
        bars: 2,
        chords: ['E2: E3 G3 B3 E4', 'B1: D#3 F#3 A3 D#4'],
        stab: ['X . . X . . X . . . X . X . . .', 'X . . . . . . . X . . . X . . .'],
        bass: ['R . . R . . R . . . R . R . . .', 'R . . . . . . . R . O . R O R O'],
        lead: ['', '. . . . . . . . . . . . B4 - D#5 -'],
        kick: ['X . . X . . X . . . X . X . . .', 'X . . . . . . . X . . . X . . .'],
        snare: ['. . . . . . . . . . . . o o x x', 'X . . . . . . . X . o o x x X X'],
        tom: ['', '. . . . . . . . h . h . m m l l'],
        crash: ['X', ''],
      },
      A: {
        bars: 8,
        chords: ['E2: E3 G3 B3 E4', 'E2: E3 G3 B3 E4', 'C2: E3 G3 C4 E4', 'D2: D3 F#3 A3 D4',
          'E2: E3 G3 B3 E4', 'E2: E3 G3 B3 E4', 'C2: E3 G3 C4 E4', 'B1: D#3 F#3 B3 D#4'],
        lead: ['E5 - - B4 - - E5 - G5 - - - - - F#5 -', 'G5 - - F#5 - - E5 - D5 - - - E5 - - -',
          'C5 - - E5 - - G5 - C6 - - - - - B5 -', 'A5 - - - - - - - F#5 - G5 - A5 - - -',
          'B5 - - G5 - - E5 - B5 - - - - - A5 -', 'G5 - - F#5 - - E5 - F#5 - - - G5 - A5 -',
          'G5 - - - - - - - E5 - - - C5 - E5 -', 'D#5 - - - - - - - F#5 - - - B5 - - -'],
        bass: [GALLOP, GALLOP, GALLOP, GALLOP_TURN, GALLOP, GALLOP, GALLOP, GALLOP_TURN],
        stab: ['X . . . . . . . . . . . x . . .', '. . . . . . x . . . x . . . . .'],
        kick: 'X . . . . . x . X . . . . . x .',
        snare: lastDiff(8, '. . . . X . . . . . . . X . . .', '. . . . X . . . X . o x X x X X'),
        hat: 'x . x . X . x . x . x . X . x .',
        crash: firstOnly(8, 'X'),
      },
      B: {
        bars: 8,
        chords: ['C2: E3 G3 C4 E4', 'D2: D3 F#3 A3 D4', 'B1: D3 F#3 B3 D4', 'E2: E3 G3 B3 E4',
          'C2: E3 G3 C4 E4', 'D2: D3 F#3 A3 D4', 'B1: D#3 F#3 B3 D#4', 'B1: D#3 F#3 A3 D#4'],
        lead: ['G5 - - - - - - - - - - - E5 - G5 -', 'A5 - - - - - - - - - - - F#5 - A5 -',
          'B5 - - - - - - - A5 - - - F#5 - - -', 'G5 - - - - - - - - - - - . . . .',
          'E5 - - G5 - - C6 - - - - - B5 - - -', 'A5 - - F#5 - - D5 - - - - - E5 - F#5 -',
          'F#5 - - - - - - - D#5 - - - F#5 - - -', 'A5 - - - - - - - - - - - ~B5 - - -'],
        lead2: ['E5 - - - - - - - - - - - C5 - E5 -', 'F#5 - - - - - - - - - - - D5 - F#5 -',
          'D5 - - - - - - - F#5 - - - D5 - - -', 'E5 - - - - - - - - - - - . . . .',
          'C5 - - E5 - - G5 - - - - - G5 - - -', 'F#5 - - D5 - - A4 - - - - - B4 - D5 -',
          'D#5 - - - - - - - B4 - - - D#5 - - -', 'D#5 - - - - - - - - - - - F#5 - - -'],
        bass: 'R . R R O . R R R . R R O . F R',
        stab: 'X . . . . . . . . . . . . . . .',
        arp: '0 . 1 . 2 . 3 . 4 . 3 . 2 . 1 .',
        kick: 'X . . . . . x . X . . . . . x .',
        snare: lastDiff(8, '. . . . X . . . . . . . X . . .', '. . . . X . . . X x X x X X X X'),
        hat: 'x o x o X o x o x o x o X o x o',
        crash: ['X', '', '', '', 'X', '', '', ''],
      },
      C: {
        bars: 8,
        chords: ['A1: E3 A3 C4 E4', 'A1: E3 A3 C4 E4', 'E2: E3 G3 B3 E4', 'E2: E3 G3 B3 E4',
          'F2: F3 A3 C4 F4', 'D2: D3 F#3 A3 D4', 'B1: D#3 F#3 B3 D#4', 'B1: D#3 F#3 A3 D#4'],
        lead: ['', '', '', '', 'C6 - - - - - - - B5 - - - A5 - - -', 'A5 - - - - - - - F#5 - - - D5 - - -',
          'D#5 - - - - - - - F#5 - - - A5 - - -', 'B5 - - - - - - - - - - - - - - -'],
        arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1',
        stab: 'X . . x . . x . . . x . x . . .',
        bass: 'R R O R R R O R R R O R R O R O',
        kick: 'X . . X . . X . . . X . X . . .',
        snare: lastDiff(8, '. . . . X . . . . . . . X . . .', '. . . . X . . . . . . . X . . .'),
        tom: lastDiff(8, '', '. . . . . . . . h . h . m m l l'),
        hat: 'X . x . X . x . X . x . X . x .',
        crash: ['X', '', '', '', 'X', '', '', ''],
      },
    },
  },

  // D minor, 160 bpm: b2 / tritone colour (Eb, G#, Ab), driving 16th bass, heavier kit, half-time section.
  boss: {
    key: 'D minor',
    bpm: 160,
    gain: 0.49,
    delay: 0.75,
    voices: {
      lead: { cutoff: 2600, level: 0.2, vib: 22, q: 2.2 },
      bass: { cutoff: 1500, level: 0.36, q: 6, floor: 200 },
      stab: { level: 0.32, oct: 0, cutoff: 3200 },
      pad: { cutoff: 800, attack: 0.4, release: 0.8, level: 0.12 },
      arp: { wave: 'sawtooth', decay: 0.12, level: 0.09, oct: 12, cutoff: 3000 },
      bell: { level: 0.16, ratio: 3.5, index: 2, decay: 2.2 },
      kick: { vol: 1, punch: 0.45, d: 0.4 },
      snare: { tone: 180, d: 0.24 },
    },
    mix: { hat: 0.65, tom: 1.1 },
    intro: ['I'],
    loop: ['A', 'B', 'C'],
    parts: {
      // ominous opening: pedal D, tritone bells, a diminished stab figure and a tom roll
      I: {
        bars: 2,
        chords: ['D2: D3 F3 A3 D4', 'D2: D3 F3 G#3 B3'],
        stab: ['X . . . . . X . . . X . . . . .', 'X . . . . . X . . . X . X . X .'],
        bell: ['D6', 'G#5'],
        bass: ['R - - - - - R - - - R - - - - -', 'R - - - - - R - - - R - R - R -'],
        kick: ['X . . . . . X . . . X . . . . .', 'X . . . . . X . . . X . X . X .'],
        snare: ['', '. . . . . . . . . . . . X X X X'],
        tom: ['', '. . . . . . . . h h m m l l l l'],
        crash: ['X', ''],
      },
      A: {
        bars: 8,
        chords: ['D2: D3 F3 A3 D4', 'D2: D3 F3 A3 D4', 'Bb1: D3 F3 Bb3 D4', 'A1: C#3 E3 G3 A3',
          'D2: D3 F3 A3 D4', 'D2: D3 F3 A3 D4', 'Eb2: Eb3 G3 Bb3 Eb4', 'A1: C#3 E3 G3 A3'],
        lead: ['D5 - - A4 - - D5 - Eb5 - - - D5 - - -', 'C5 - - A4 - - C5 - G#4 - - - - - - -',
          'Bb4 - - D5 - - F5 - A5 - - - - - - -', 'G5 - - - F5 - - - E5 - - - C#5 - - -',
          'D5 - - A4 - - D5 - Eb5 - - - D5 - - -', 'F5 - - E5 - - F5 - G#5 - - - A5 - - -',
          'Bb5 - - - - - - - G5 - - - Eb5 - - -', 'A5 - - - - - - - - - - - . . . .'],
        bass: 'R R O R R R O R R R O R R O R O',
        stab: '. . . . . . x . . . x . . . . .',
        kick: 'X . x . X . . x X . x . X . . x',
        snare: lastDiff(8, '. . . . X . . . . . . . X . . o', '. . . . X . . . . . . . X X X X'),
        tom: lastDiff(8, '', '. . . . . . . . h h m m . . . .'),
        hat: 'x o x o X o x o x o x o X o x o',
        crash: firstOnly(8, 'X'),
      },
      B: {
        bars: 8,
        chords: ['G1: D3 G3 Bb3 D4', 'G#1: D3 G#3 B3 D4', 'A1: C#3 E3 A3 C#4', 'D2: D3 F3 A3 D4',
          'G1: D3 G3 Bb3 D4', 'Ab1: Eb3 Ab3 C4 Eb4', 'E2: E3 G3 Bb3 D4', 'A1: C#3 E3 G3 Bb3'],
        lead: ['G5 - - - - - - - Bb5 - - - A5 - G5 -', 'G#5 - - - - - - - F5 - - - D5 - - -',
          'E5 - - - - - - - C#5 - D5 - E5 - - -', 'F5 - - - - - - - D5 - - - A4 - - -',
          'G5 - - D5 - - G5 - Bb5 - - - - - - -', 'C6 - - - - - - - Bb5 - Ab5 - Eb5 - - -',
          'Bb5 - - - - - - - G5 - - - E5 - - -', 'C#5 - - - E5 - - - A5 - - - ~Bb5 - A5 -'],
        bell: ['D6', 'G#5', '', '', 'D6', 'Ab5', '', ''],
        bass: 'R . R R R . R R R . R R R . b R',
        stab: 'X . . . . . . . . . . . . . . .',
        kick: 'X . X x X . X x X . X x X . X x',
        snare: lastDiff(8, '. . . . X . . . . . . . X . . .', '. . . . X . . . X . X . X X X X'),
        hat: 'X . x . X . x . X . x . X . x .',
        crash: ['X', '', '', '', 'X', '', '', ''],
      },
      C: {
        bars: 8,
        chords: ['D2: D3 F3 A3 D4', 'D2: Eb3 G3 Bb3 Eb4', 'D2: D3 F3 A3 D4', 'D2: D3 F3 G#3 B3',
          'Bb1: D3 F3 Bb3 D4', 'C2: E3 G3 C4 E4', 'A1: C#3 E3 A3 C#4', 'A1: C#3 E3 G3 Bb3'],
        lead: ['', '', '', '', 'D6 - - - - - - - C6 - - - Bb5 - - -', 'C6 - - - - - - - E5 - - - G5 - - -',
          'A5 - - - - - - - E5 - - - C#5 - - -', 'E5 - - - F5 - - - G5 - - - Bb5 - - -'],
        bell: ['D6', 'Eb6', 'D6', 'G#5', '', '', '', ''],
        arp: '0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1',
        bass: 'R R R b R R R t R R R b R R O R',
        stab: 'X . . X . . X . . . . . X . . .',
        kick: [...rep(4, 'X . . . . . . . X . . X . . . .'), ...rep(3, 'X . x . X . x . X . x . X . x .'), 'X . x . X . x . X . . . X . . .'],
        snare: [...rep(4, '. . . . . . . . X . . . . . . .'), ...rep(3, '. . . . X . . . . . . . X . . .'), '. . . . X . . . X . X X X X X X'],
        tom: [...rep(4, '. . . . . . . . . . . . . . m l'), '', '', '', ''],
        hat: 'x . x . x . x . x . x . x . x .',
        crash: ['X', '', '', '', 'X', '', '', ''],
      },
    },
  },

  // C major fanfare (I - bVI bVII - I), then a gentle 16-bar loop to sit under the results screen.
  victory: {
    key: 'C major',
    bpm: 116,
    gain: 1.01,
    delay: 0.75,
    voices: {
      lead: { cutoff: 3800, level: 0.2, vib: 14 },
      lead2: { cutoff: 3000, level: 0.14, vib: 12 },
      stab: { level: 0.34, oct: 0 },
      pad: { cutoff: 1300, attack: 0.9, release: 1.6, level: 0.13 },
      bell: { level: 0.2, decay: 2.0 },
      arp: { wave: 'triangle', decay: 0.35, level: 0.12, oct: 12, cutoff: 3000 },
      bass: { soft: true, level: 0.22 },
      kick: { vol: 0.9 },
    },
    sends: { bell: { wet: 0.5, echo: 0.35 }, arp: { echo: 0.4 }, lead2: { pan: -0.3 } },
    intro: ['F'],
    loop: ['A', 'B'],
    parts: {
      F: {
        bars: 3,
        chords: ['C2: C4 E4 G4', ['Ab1: C4 Eb4 Ab4', 'Bb1: D4 F4 Bb4'], 'C2: C4 E4 G4 C5'],
        lead: ['G4 - - C5 - - E5 - G5 - - - E5 - G5 -', 'C5 - - Eb5 - - Ab5 - D5 - - F5 - - Bb5 -',
          'C6 - - - - - - - - - - - - - . .'],
        lead2: ['E4 - - G4 - - C5 - E5 - - - C5 - E5 -', 'Ab4 - - C5 - - Eb5 - Bb4 - - D5 - - F5 -',
          'G5 - - - - - - - - - - - - - . .'],
        stab: ['X . . . . . . . . . . . . . . .', 'X . . . . . . . X . . . . . . .', 'X . . . . . . . . . . . . . . .'],
        bass: ['R', 'R R', 'R'],
        kick: ['X . . . . . . . . . . . . . . .', 'X . . . . . . . X . . . . . . .', 'X . . . . . . . . . . . . . . .'],
        snare: ['. . . . . . . . . . . . o x x X', 'X . . . . . . . X . . . x x X X', ''],
        crash: ['X', '', 'X'],
      },
      A: {
        bars: 8,
        chords: ['F2: E3 A3 C4 E4', 'G2: D3 G3 B3 E4', 'E2: D3 G3 B3 E4', 'A1: E3 G3 C4 E4',
          'D2: F3 A3 C4 E4', 'G1: F3 G3 B3 D4', 'C2: E3 G3 B3 D4', 'C2: E3 G3 C4 D4'],
        bell: ['A5 - - - G5 - - -', 'D5 - - - E5 - - -', 'B4 - - - - - D5 -', 'C5 - - - - - . .',
          'F5 - - - E5 - D5 -', 'B4 - - - D5 - - -', 'E5 - - - - - - -', '. . . . G5 - - -'],
        arp: '0 1 2 3 2 1 2 3',
        bass: 'R - - - - - - -',
      },
      B: {
        bars: 8,
        chords: ['F2: E3 A3 C4 E4', 'G2: D3 G3 B3 E4', 'E2: D3 G3 B3 E4', 'A1: E3 G3 C4 E4',
          'D2: F3 A3 C4 E4', 'G1: F3 G3 B3 D4', 'C2: E3 G3 B3 D4', 'C2: E3 G3 C4 D4'],
        bell: ['C6 - - - B5 - A5 -', 'B5 - - - - - G5 -', 'G5 - - - - - - -', 'E5 - - - - - . .',
          'A5 - - - G5 - F5 -', 'D5 - - - - - G5 -', 'G5 - - - E5 - D5 -', 'C5 - - - - - . .'],
        arp: '0 2 1 3 2 4 3 5',
        bass: 'R - - - F - - -',
        hat: '. . x . . . x . . . x . . . x .',
      },
    },
  },

  // Driftmarket: a Ringborn jig in G Mixolydian, 6/8. Plucked harp tune over harp arpeggios, a frame drum and a
  // shaker; bells take the minor B strain, a descant over the tune's return, then a lantern-lit interlude where
  // they ring the Ringborn motif slowly before the drum calls the dance back.
  driftmarket: {
    key: 'G Mixolydian',
    bpm: 92,
    meter: '6/8',
    gain: 0.93,
    delay: 0.5,
    motifs: ['ringborn'],
    voices: {
      lead: { synth: 'harp', decay: 1.1, level: 0.3, cutoff: 4200 },
      bell: { decay: 1.8, level: 0.16, ratio: 3, index: 1.1 },
      harp: { decay: 0.8, level: 0.09 },
      pad: { cutoff: 900, attack: 0.6, release: 1.2, level: 0.06 },
      bass: { soft: true, level: 0.26 },
      kick: { f0: 170, f1: 78, sweep: 0.05, d: 0.26, vol: 0.6, click: 0.1 },
      hat: { f: 6000, d: 0.035 },
    },
    mix: { hat: 0.55, kick: 0.85 },
    sends: { lead: { wet: 0.3, echo: 0.12, pan: 0.1 }, bell: { wet: 0.45, echo: 0.25, pan: 0.25 }, harp: { pan: -0.3 } },
    loop: ['A', 'B', 'A2', 'C'],
    parts: {
      A: {
        bars: 8,
        chords: DRIFT_A.chords,
        lead: DRIFT_A.tune,
        harp: '0 1 2 3 2 1',
        bass: 'R - - F - -',
        kick: lastDiff(8, 'X . o x . .', 'X . o x o o'),
        hat: 'x o o x o o',
      },
      B: {
        bars: 8,
        chords: ['A2: E3 A3 C4', 'E2: E3 G3 B3', 'F2: F3 A3 C4', 'C2: E3 G3 C4', 'A2: E3 A3 C4', 'E2: E3 G3 B3', 'F2: F3 A3 C4', 'G2: G3 B3 D4'],
        bell: ['A4 - - E5 - -', 'D5 - C5 B4 - -', 'C5 - - A4 - C5', 'G4 - - - - -', 'A4 - - E5 - -', 'G5 - - E5 - D5', 'C5 - - F5 - -', 'D5 - - - - -'],
        harp: '0 2 1 3 2 1',
        bass: 'R - - F - -',
        kick: 'X . . . . .',
        hat: 'x . . x . .',
      },
      A2: {
        bars: 8,
        chords: DRIFT_A.chords,
        lead: DRIFT_A.tune,
        bell: DRIFT_A.descant,
        harp: '0 1 2 3 2 1',
        bass: 'R - F R - F',
        kick: lastDiff(8, 'X . o x . o', 'X . x x x X'),
        hat: 'x o o x o o',
      },
      // the lantern interlude: the motif rung slowly (D G F D C A G), then a drum pickup back into A
      C: {
        bars: 8,
        chords: ['G2: G3 B3 D4', 'F2: F3 A3 C4', 'A2: E3 A3 C4', 'C2: E3 G3 C4', 'G2: G3 B3 D4', 'F2: F3 A3 C4', 'D2: D3 F3 A3', 'G2: G3 B3 D4'],
        bell: ['D5 G5', 'F5 D5', 'C5 A4', 'G4 -', 'B4 D5', 'C5 A4', 'F4 A4', 'G4 -'],
        harp: '0 . 2 . 3 .',
        bass: 'R - - - - -',
        kick: [...rep(7, ''), '. . . x o X'],
        hat: [...rep(7, ''), '. . . x x x'],
      },
    },
  },

  // The Shoals, C# minor: glass bells in an ice cave, sub pulses like pressure in the ice, a cold airy pad. The B
  // strain is the ice "singing" (a sine voice that glides), C thins to drips and crystals, A2 brings it all back.
  shoals: {
    key: 'C# minor',
    bpm: 70,
    gain: 1.3,
    delay: 0.75,
    voices: {
      bell: { ratio: 3.5, index: 1.6, decay: 3.2, level: 0.17 },
      bell2: { ratio: 5, index: 0.8, decay: 1.4, level: 0.09 },
      lead: { layers: [['sine', 0, 1], ['triangle', 5, 0.25]], cutoff: 2400, level: 0.13, vib: 22, vibRate: 4.2, attack: 0.25, release: 0.6, glide: 0.35 },
      lead2: { layers: [['sine', 0, 1], ['triangle', 5, 0.25]], cutoff: 2000, level: 0.065, vib: 18, vibRate: 4.2, attack: 0.6, release: 1, glide: 0.35 },
      bass: { synth: 'sub', level: 0.5, gate: 0.5, decay: 1.2, harm: 0.35 },
      pad: { cutoff: 1500, attack: 2.2, release: 3, level: 0.1, air: 0.06, drift: 0.6 },
      arp: { wave: 'sine', decay: 0.3, level: 0.08, oct: 24 },
    },
    sends: { bell: { wet: 0.7, echo: 0.4 }, bell2: { wet: 0.6, echo: 0.5, pan: 0.35 }, lead: { wet: 0.55, echo: 0.3 }, lead2: { wet: 0.6, echo: 0.2, pan: -0.2 }, arp: { wet: 0.5, echo: 0.6 } },
    loop: ['A', 'B', 'C', 'A2'],
    parts: {
      A: {
        bars: 8,
        chords: SHOALS_A.chords,
        bell: SHOALS_A.tune,
        bass: 'R! . R? . R . R? .',
      },
      B: {
        bars: 8,
        chords: ['A1: E3 A3 C#4', 'B1: D#3 F#3 B3', 'G#1: D#3 G#3 B3', 'C#2: E3 G#3 C#4', 'F#1: F#3 A3 C#4', 'B1: D#3 F#3 A3', 'E2: E3 G#3 B3', 'G#1: D#3 G#3 B#3'],
        lead: ['E5 - ~A5 -', 'F#5 - - ~D#5', 'D#5 - ~B4 -', 'C#5 - - -', 'C#5 - ~F#5 -', 'A5 - - ~F#5', 'G#5 - ~E5 -', 'D#5 - - B#4'],
        bell: ['', '', '', '. . . . G#5 - E5 -', '', '', '', '. . . . . . G#5 -'],
        bass: 'R . . . R . . .',
      },
      C: {
        bars: 8,
        chords: ['C#2: G#3 B3 D#4', 'C#2: G#3 B3 D#4', 'A1: E3 G#3 B3', 'A1: E3 G#3 B3', 'F#1: E3 A3 C#4', 'F#1: E3 A3 C#4', 'G#1: D#3 G#3 C#4', 'G#1: D#3 G#3 B#3'],
        bell: ['. . . . G#5 - D#6 -', '', '. . E6 - . . B5 -', '', 'A5 - - - . . . .', '. . . . C#6 - - -', '', '. . . . D#5 - - -'],
        bell2: ['', 'D#6 . G#6 . . . B6 .', '', '. . E6 . G#6 . . B6', '', '. . . . A6 . C#7 .', '', ''],
        bass: 'R . . . . . . .',
      },
      A2: {
        bars: 8,
        chords: SHOALS_A.chords,
        bell: SHOALS_A.tune,
        lead2: ['B4 - - - - - - -', 'E5 - - - - - - -', 'C#5 - - - - - - -', 'C#5 - - - ~B#4 - - -', 'E5 - - - - - - -', 'C#5 - - - - - - -', 'B4 - - - - - - -', 'D#5 - - - - - - -'],
        arp: '3 1 2 0 3 2 1 2',
        bass: 'R! . R? . R . R? .',
      },
    },
  },

  // The Meridian wreck, F# Phrygian, 60 bpm: a low drone on an F# pedal, cracked bells, the hull groaning far
  // off and an emergency beacon still pulsing. The bells try the Ringborn motif (on A, so it stays in the mode),
  // break off, then get through it slowly; the last strain tries again an octave down.
  meridian: {
    key: 'F# Phrygian',
    bpm: 60,
    gain: 0.85,
    delay: 1.5,
    motifs: ['ringborn'],
    voices: {
      pad: { cutoff: 520, attack: 3, release: 4, level: 0.16, drift: 0.5, air: 0.035 },
      bass: { soft: true, level: 0.3 },
      bell: { ratio: 2.76, index: 1.8, decay: 4.5, level: 0.26 },
      bell2: { ratio: 1.41, index: 3.4, decay: 6, level: 0.09 },
      arp: { wave: 'sine', decay: 0.5, level: 0.08 },
    },
    sends: { pad: { wet: 0.5 }, bell: { wet: 0.7, echo: 0.35 }, bell2: { wet: 0.9, echo: 0.2, pan: -0.4 }, arp: { wet: 0.6, echo: 0.6, pan: 0.35 } },
    loop: ['A', 'B', 'C', 'D'],
    parts: {
      A: {
        bars: 8,
        chords: [FSM, FSM, FSM, FSM, FSM, G_FS, FSM, FSM],
        bell: ['', '', '', '', 'E5 - - - . . A5 -', '. . . . G5 - - -', '', ''],
        bell2: ['', '', '. . F#2 - - - - -', '', '', '', 'B2 - - - - - - -', ''],
        arp: ['C#6 . C#6 .', ''],
        bass: 'O - - -',
      },
      B: {
        bars: 8,
        chords: [FSM, G_FS, EM_FS, D_FS, BM_FS, FSM, FSM, FSM],
        bell: ['E5 - - - . . A5 -', '. . . . G5 - - -', 'E5 - - - - - . .', '. . D5 - - - . .', 'B4 - - - - - - -', '. . . . . . A4 -', '', ''],
        bell2: ['', '', '', 'D3 - - - - - - -', '', '', '. . . . F#2 - - -', ''],
        bass: 'O - - -',
      },
      C: {
        bars: 8,
        chords: [D_FS, D_FS, EM_FS, EM_FS, G_FS, G_FS, FSM, FSM],
        bell: ['', '. . . . F#5 - - -', '', 'B4 - - - . . . .', '', '. . . . B4 - - -', '', ''],
        bell2: ['A2 - - - - - - -', '', '. . . . . . E3 -', '', 'B2 - - - - - - -', '. . . . D3 - - -', '', 'C#3 - - - - - - -'],
        arp: 'C#6 . C#6 .',
        bass: 'O - - -',
      },
      D: {
        bars: 8,
        chords: [FSM, FSM, G_FS, EM_FS, D_FS, BM_FS, FSM, G_FS],
        bell: ['. . . . E4 - - -', 'A4 - - - . . . .', 'G4 - - - . . E4 -', '', 'D4 - - - - - . .', 'B3 - - - - - - -', '. . A3 - - - - -', ''],
        bell2: ['', '', '', '. . . . . . A2 -', '', '', '', 'D3 - - - - - - -'],
        arp: ['C#6 . . .', ''],
        bass: 'O - - -',
      },
    },
  },

  // HALCYON's lullaby, F major 3/4: the canonical statement of MOTIFS.lullaby. Verse one is the music box alone
  // over a warm bed; verse two adds a harp, a descant on soft bells and a walking bass.
  lullaby: {
    key: 'F major',
    bpm: 76,
    meter: '3/4',
    gain: 1.12,
    delay: 1,
    motifs: ['lullaby'],
    choirSfx: [['F3', 'A3', 'C4', 'F4'], ['Bb2', 'F3', 'Bb3', 'D4'], ['D3', 'F3', 'A3', 'D4'], ['C3', 'G3', 'C4', 'E4']],
    voices: {
      bell: { synth: 'box', oct: 12, level: 0.26, decay: 2.2 },
      harp: { synth: 'box', oct: 12, level: 0.085, decay: 1.3 },
      harp2: { decay: 1.8, level: 0.11 },
      bell2: { decay: 2.4, level: 0.09, ratio: 3, index: 0.7 },
      pad: { cutoff: 760, attack: 1.8, release: 2.4, level: 0.12, air: 0.02 },
      bass: { soft: true, level: 0.2 },
    },
    sends: { bell: { wet: 0.5, echo: 0.22 }, harp: { wet: 0.4, echo: 0.1 }, bell2: { wet: 0.55, echo: 0.2, pan: 0.2 }, harp2: { pan: -0.25 } },
    intro: ['I'],
    loop: ['A', 'B', 'A2', 'B2'],
    parts: {
      I: { bars: 1, chords: ['F2: F3 A3 C4'], harp: '0 1 2 3 2 1' },
      A: { bars: 8, chords: LULLABY_A.chords, bell: LULLABY_A.tune, harp: '0 . 2 . 1 .', bass: 'R - -' },
      B: { bars: 8, chords: LULLABY_B.chords, bell: LULLABY_B.tune, harp: '0 . 2 . 1 .', bass: 'R - -' },
      A2: { bars: 8, chords: LULLABY_A.chords, bell: LULLABY_A.tune, bell2: LULLABY_A.descant, harp2: '0 1 2 3 2 1', bass: 'R - F' },
      B2: { bars: 8, chords: LULLABY_B.chords, bell: LULLABY_B.tune, bell2: LULLABY_B.descant, harp2: '0 1 2 3 2 1', bass: lastDiff(8, 'R - F', 'R - -') },
    },
  },

  // WARDEN, F minor 3/4: the lullaby in the parallel minor (MOTIFS.warden) on a music box that sags as it winds
  // down, over a soft 'oo' choir and a sub pulse; a far cathedral bell marks the phrases. The second time
  // the choir sings the theme itself while the box turns to arpeggios, and the box rejoins it an octave up.
  warden: {
    key: 'F minor',
    bpm: 72,
    meter: '3/4',
    gain: 1,
    delay: 1,
    motifs: ['warden'],
    voices: {
      pad: { synth: 'choir', vowel: 'oo', attack: 1.6, release: 2.6, level: 0.24 },
      bell: { synth: 'box', oct: 12, level: 0.24, decay: 2.6, droop: 12, beat: 5 },
      harp: { synth: 'box', oct: 12, level: 0.075, decay: 1.6, droop: 12, beat: 5 },
      choir: { vowel: 'oo', attack: 0.35, release: 1.4, level: 0.34 },
      bass: { synth: 'sub', level: 0.3, gate: 0.85, decay: 1.8, attack: 0.08 },
      bell2: { ratio: 1.41, index: 2.4, decay: 6, level: 0.11 },
    },
    sends: { pad: { wet: 0.6 }, bell: { wet: 0.6, echo: 0.3 }, harp: { wet: 0.5, echo: 0.15 }, choir: { wet: 0.65, echo: 0.12 }, bell2: { wet: 0.9, echo: 0.25, pan: -0.3 } },
    intro: ['I'],
    loop: ['A', 'B', 'A2', 'B2'],
    parts: {
      I: { bars: 2, chords: ['F2: F3 Ab3 C4'], bell2: ['F3 - -', ''], bass: 'R - -', harp: ['', '. . . . 2 1'] },
      A: { bars: 8, chords: WARDEN_A.chords, bell: WARDEN_A.tune, harp: '. . 1 . 2 .', bass: 'R - -' },
      B: { bars: 8, chords: WARDEN_B.chords, bell: WARDEN_B.tune, harp: '. . 1 . 2 .', bass: 'R - -', bell2: ['Ab2 - -', '', '', 'C3 - -', '', '', '', ''] },
      A2: { bars: 8, chords: WARDEN_A.chords, choir: WARDEN_A.tune, harp: '0 1 2 3 2 1', bass: 'R - -', bell2: firstOnly(8, 'F3 - -') },
      B2: { bars: 8, chords: WARDEN_B.chords, choir: WARDEN_B.tune, bell: WARDEN_B.tune, harp: '0 1 2 3 2 1', bass: 'R - -', bell2: ['Ab2 - -', '', '', 'C3 - -', '', '', '', ''] },
    },
  },

  // The Arboretum, D Dorian 3/4, 84: overgrown, wistful, Sera's chapter. Water drips off the leaves (a rising
  // 'plink' on the chord tones, echoing), the room hums, and a wooden flute remembers the opening of HALCYON's
  // lullaby before it wanders off down a sequence. B is the hope (the Dorian B natural, a lift to A major); C is
  // the grief: only drips, the hum, sprinkler rain and a glass chime falling E D C B A; A2 brings the flute back
  // over a harp.
  arboretum: {
    key: 'D Dorian',
    bpm: 84,
    meter: '3/4',
    gain: 0.96,
    delay: 0.75,
    motifs: ['lullaby'],
    choirSfx: [['D3', 'F3', 'A3', 'D4'], ['G2', 'D3', 'G3', 'B3'], ['F3', 'A3', 'C4', 'F4'], ['A2', 'E3', 'A3', 'C4']],
    voices: {
      pad: { synth: 'choir', vowel: 'mm', attack: 1.8, release: 2.6, level: 0.3, vib: 5 },
      lead: { synth: 'flute', level: 0.15 },
      arp: { synth: 'drip', oct: 24, level: 0.26, decay: 0.5 },
      arp2: { synth: 'drip', oct: 24, level: 0.18, decay: 0.7, rise: 0.5 },
      harp: { decay: 1.6, level: 0.11 },
      bell: { ratio: 3.5, index: 0.8, decay: 3.4, level: 0.16 },
      bass: { soft: true, level: 0.2 },
      hat: { f: 7500, d: 0.035 },
    },
    mix: { hat: 2 },
    sends: {
      pad: { wet: 0.5 }, lead: { wet: 0.42, echo: 0.16 }, arp: { wet: 0.45, echo: 0.55, pan: -0.3 },
      arp2: { wet: 0.6, echo: 0.6, pan: 0.4 }, harp: { pan: -0.2 }, bell: { wet: 0.7, echo: 0.3, pan: 0.25 }, hat: { wet: 0.5, pan: 0.15 },
    },
    loop: ['A', 'B', 'C', 'A2'],
    parts: {
      A: { bars: 8, chords: ARB_A.chords, lead: ARB_A.tune, arp: DRIPS, bass: 'R - -' },
      B: {
        bars: 8,
        chords: ['G1: D3 G3 B3 D4', 'A1: E3 A3 C4 E4', 'F2: F3 A3 C4 E4', 'C2: E3 G3 C4 D4',
          'G1: D3 G3 B3 D4', 'A1: E3 A3 C4 E4', 'D2: D3 F3 A3 C4', ['A1: D3 E3 A3', 'A1: C#3 E3 A3']],
        lead: ['B4 - - - D5 -', 'E5 - - - A5 -', 'F5 - - - E5 C5', 'D5 - - - - -', 'D5 - - - B4 D5', 'C5 - - - E5 A5', 'A5 - - - G5 F5', 'E5 - - - - -'],
        harp: '0 . 2 . 1 .',
        arp: DRIPS,
        arp2: DRIPS_HI,
        bass: 'R - -',
        hat: RAIN,
      },
      C: {
        bars: 8,
        chords: ['D2: F3 A3 C4 E4', 'C2: E3 G3 C4 D4', 'G1: F3 G3 B3 D4', 'D2: F3 A3 C4 E4',
          'F2: F3 A3 C4 E4', 'C2: E3 G3 C4 D4', 'E2: D3 G3 B3 E4', ['A1: D3 E3 A3 D4', 'A1: C3 E3 A3 C4']],
        bell: ['', 'E5 - -', '', 'D5 - -', '', 'C5 - -', 'B4 - -', 'A4 - -'],
        arp: [...DRIPS.slice(2), ...DRIPS.slice(0, 2)],
        arp2: ['. . . . 5 . . . . . . .', '. . . . . . . . . . 7 .', '', '. . 6 . . . . . . . . .'],
        bass: 'R - -',
        hat: RAIN,
      },
      A2: { bars: 8, chords: ARB_A.chords, lead: ARB_A.tune, harp: '0 1 2 3 2 1', arp: DRIPS, arp2: DRIPS_HI, bass: lastDiff(8, 'R - F', 'R - -') },
    },
  },

  // The Choir Chamber, A, 56, free: the cathedral of dreaming sleepers singing one chord (MOTIFS.choir). No
  // pulse: voices swell in on their own breaths over a sub drone. A lets the chord settle and voices enter one by
  // one; B blooms gold (A add9, the dream of Elysia) with a treble voice above; C thins to an open fifth and one
  // child-like voice, then the chord is rebuilt note by note; D sings it whole and ebbs.
  choir: {
    key: 'A sus',
    bpm: 56,
    gain: 1,
    delay: 1.5,
    motifs: ['choir'],
    choirSfx: [['A2', 'E3', 'B3', 'D4'], ['D3', 'F#3', 'B3', 'E4'], ['E3', 'A3', 'B3', 'F#4'], ['A2', 'D3', 'E3', 'B3']],
    voices: {
      pad: { synth: 'choir', vowel: 'oo', attack: 4, release: 5, level: 0.34, vib: 6 },
      choir: { vowel: 'ah', attack: 2.4, release: 3.2, level: 0.15, vib: 8 },
      choir2: { vowel: 'oh', attack: 2.8, release: 3.6, level: 0.17, vib: 7 },
      choir3: { vowel: 'ee', attack: 1.8, release: 2.8, level: 0.08, vib: 10 },
      bass: { synth: 'sub', level: 0.24, gate: 1, attack: 2.5, decay: 4, harm: 0.15 },
      bell: { ratio: 3.5, index: 0.9, decay: 5, level: 0.06 },
    },
    sends: {
      pad: { wet: 0.7 }, choir: { wet: 0.8, echo: 0.15, pan: 0.25 }, choir2: { wet: 0.75, echo: 0.1, pan: -0.25 },
      choir3: { wet: 0.85, echo: 0.25, pan: 0.1 }, bell: { wet: 0.9, echo: 0.35, pan: -0.35 },
    },
    loop: ['A', 'B', 'C', 'D'],
    parts: {
      A: {
        bars: 8,
        chords: [CHOIR_CHORD],
        choir2: ['', '. . E3 -', '- - - -', '- . . .', '. B3 - -', '- - - -', '- - . .', ''],
        choir: ['', '', '', '. . . F#4', '- - - -', '- - . .', '. . D4 -', '- - - .'],
        bell: ['', '. . . . . . . . . . . . . . E5 -', '', '', '. . . . . . B5 - . . . . . . . .', '', '', '. . . . . . . . . . F#5 - . . . .'],
        bass: ['R - - -', '-'],
      },
      B: {
        bars: 8,
        chords: [CHOIR_CHORD, CHOIR_CHORD, CHOIR_GOLD, CHOIR_GOLD, CHOIR_D, CHOIR_D, CHOIR_CHORD, CHOIR_CHORD],
        choir: ['. . F#4 -', '- - E4 -', '- . A4 -', '- - B4 -', '- - - -', '- . A4 -', '- - F#4 -', '- - - .'],
        choir2: ['E3 - - -', '-', '-', '- - . .', 'D3 - - -', '- - - -', 'E3 - - -', '- - . .'],
        choir3: ['', '', '. . . E5', '- - C#5 -', '- - . .', '', '', ''],
        bell: ['', '', '. . . . . . . . C#6 - . . . . . .', '', '', '. . . . . . . . . . . . A5 - . .', '', ''],
        bass: ['R - - -', '-'],
      },
      C: {
        bars: 8,
        chords: ['A1: A2 E3', 'A1: A2 E3', 'A1: A2 E3', 'A1: A2 E3', 'A1: A2 E3 B3', 'A1: A2 E3 B3 D4', CHOIR_CHORD, CHOIR_CHORD],
        choir3: ['', '. . B4 -', '- - A4 -', '- - F#4 -', '- - - -', '- . E4 -', '- - - -', '- - . .'],
        choir2: ['', '', '', '', '', '', '. . D4 -', '- - - .'],
        bell: ['. . . . . . . . . . B4 - . . . . ', '', '', '', '. . . . E5 - . . . . . . . . . .', '', '', ''],
        bass: ['R - - -', '-'],
      },
      D: {
        bars: 8,
        chords: [CHOIR_CHORD, CHOIR_CHORD, CHOIR_CHORD, CHOIR_CHORD, CHOIR_G, CHOIR_G, CHOIR_CHORD, CHOIR_CHORD],
        choir: ['. . . .', 'F#4 - - -', '- - - -', '. . E4 -', '- - - -', '. . D4 -', 'E4 - - -', '- - . .'],
        choir2: ['E3 - - -', '-', '-', '- - . .', 'D3 - - -', '- - - -', 'E3 - - -', '- - . .'],
        choir3: ['', '', '. . . B4', '- - - -', '- - . .', '', '', ''],
        bell: ['. . . . . . . . . . . . F#5 - . .', '', '', '. . . . . . . . D5 - . . . . . .', '', '', '. . . . . . E5 - . . . . . . . .', ''],
        bass: ['R - - -', '-'],
      },
    },
  },

  // The Security Spire, C minor 4/4 march at 112: militarised, tense, cold. Low strings saw a dotted spiccato
  // ostinato over a field drum; the alarm figure (MOTIFS.warden inverted) pierces it on a nasal square tone. B
  // gives the cellos a stern march tune; in C the march sinks to a snare whisper and WARDEN's calm theme loops
  // on a soft choir like the propaganda screens; D is the whole regiment with the alarm in two registers.
  spire: {
    key: 'C minor',
    bpm: 112,
    gain: 1,
    delay: 0.5,
    motifs: ['warden:inverted', 'warden'],
    choirSfx: [['C3', 'G3', 'C4', 'Eb4'], ['F3', 'Ab3', 'C4', 'F4'], ['Ab2', 'Eb3', 'Ab3', 'C4'], ['C3', 'G3', 'C4', 'G4']],
    voices: {
      bass: { synth: 'strings', level: 0.19, attack: 0.012, release: 0.07, gate: 0.55, cutoff: 1100, bow: 0.5, vib: 0 },
      bass2: { synth: 'strings', level: 0.15, attack: 0.09, release: 0.35, cutoff: 1400, vib: 12, bow: 0.25 },
      pad: { synth: 'strings', oct: 12, attack: 0.9, release: 1.4, level: 0.045, cutoff: 2400, vib: 9 },
      lead: { layers: [['square', 0, 1], ['square', 7, 0.6]], cutoff: 3600, base: 2600, hp: 700, level: 0.07, attack: 0.004, release: 0.05, vib: 0 },
      choir: { vowel: 'oo', attack: 0.5, release: 1.6, level: 0.22 },
      snare: { f: 2900, tone: 250, d: 0.15 },
      kick: { f0: 105, f1: 42, sweep: 0.14, d: 0.55, vol: 0.85, click: 0.08 },
      tom: { pitch: 0.55 },
    },
    mix: { tom: 1.1, crash: 0.7 },
    sends: {
      bass: { wet: 0.12 }, bass2: { wet: 0.3, pan: -0.15 }, pad: { wet: 0.5 }, lead: { wet: 0.35, echo: 0.32, pan: 0.2 },
      choir: { wet: 0.7, echo: 0.15 }, snare: { wet: 0.22 }, tom: { wet: 0.3 },
    },
    intro: ['I'],
    loop: ['A', 'B', 'C', 'D'],
    parts: {
      // a buzz roll swells over a timpani pulse, the march falls in under the first alarm
      I: {
        bars: 2,
        chords: ['C2: G3 C4 Eb4'],
        snare: ['o*2 o*2 o*2 o*2 o*2 o*2 o*2 o*2 x*2 x*2 x*2 x*2 x*2 x*2 X*2 X', SNARE_MARCH],
        tom: ['l . . . . . . . l . . . l . l l', ''],
        kick: ['X . . . . . . . . . . . . . . .', 'X . . . . . . . X . . . . . . .'],
        bass: ['', MARCH],
        lead: ['', ALARM_C],
        crash: ['', 'X'],
      },
      A: {
        bars: 8,
        chords: SPIRE_A,
        bass: MARCH,
        lead: [ALARM_C, '', ALARM_C, '', ALARM_C4, '', 'G5 - - - - - - - . . . . . . . .', ''],
        snare: lastDiff(8, SNARE_MARCH, 'X . . o x . o . x*2 . x*2 . X x X X'),
        kick: 'X . . . . . . . X . . . . . . .',
        tom: lastDiff(8, '', '. . . . . . . . . . . . l . l l'),
        crash: firstOnly(8, 'X'),
      },
      B: {
        bars: 8,
        chords: SPIRE_B.chords,
        bass: MARCH,
        bass2: SPIRE_B.cello,
        lead: [ALARM_G, '', '', '', ALARM_G, '', '', ''],
        snare: lastDiff(8, SNARE_MARCH, 'X . . o x . o . X . x*2 . X X X X'),
        kick: 'X . . . . . . . X . . . . . . .',
        crash: ['X', '', '', '', 'X', '', '', ''],
      },
      C: {
        bars: 8,
        chords: ['C2: G3 C4 Eb4', 'C2: G3 C4 Eb4', 'F1: F3 Ab3 C4', 'G1: G3 B3 D4', 'F1: F3 Ab3 C4', 'Bb1: F3 Bb3 D4', 'Ab1: Ab3 C4 Eb4', 'C2: G3 C4 Eb4'],
        choir: ['Eb4 - - G4', 'C5 - - Bb4', 'Ab4 Bb4 Ab4 -', 'G4 - - -', 'F4 - - Ab4', 'D5 - - C5', 'Bb4 Ab4 Bb4 -', 'C5 - - -'],
        bass2: ['C3 - - -', '- - - -', 'F2 - - -', 'G2 - - -', 'F2 - - -', 'Bb2 - - -', 'Ab2 - - -', 'C3 - - -'],
        lead: ['', '', '', '', '', '', '', ALARM_G],
        snare: 'o . o o o . o . o . o o o . o .',
        tom: ['l . . . . . . . . . . . . . . .', '', '', 'l . . . . . . . l . . . . . . .'],
      },
      D: {
        bars: 8,
        chords: SPIRE_B.chords,
        bass: MARCH,
        bass2: SPIRE_B.cello,
        lead: [ALARM_G, '', ALARM_C, 'G5 - - - - - - - . . . . . . . .', ALARM_G, ALARM_C4, ALARM_C, 'B5 . G5 . B5 . G5 . D6 - - - - - . .'],
        snare: lastDiff(8, 'X . x*2 o x . o . X . . o x x*2 o o', 'x*2 . x*2 . x*2 . x*2 . X x X x X X X X'),
        kick: 'X . . . . . . . X . . x . . . .',
        tom: lastDiff(8, '', '. . . . . . . . l . l . l l l l'),
        crash: ['X', '', '', '', 'X', '', '', ''],
      },
    },
  },

  // battle_2, E Phrygian 148 (battles from ch3 on): as driving as 'battle' but darker and more mechanical.
  // Octave bass in sixteenths under a driven, distorted saw lead; four-on-the-floor kick; the flat second (F)
  // colours every strain. A states the theme, B harmonises an Andalusian descent (Am G F E), C is a half-time
  // breakdown with rising arpeggio cells and a snare build, D is a run-heavy solo that cadences F -> Em back to A.
  battle_2: {
    key: 'E Phrygian',
    bpm: 148,
    gain: 0.66,
    delay: 0.75,
    voices: {
      lead: { cutoff: 3200, level: 0.12, vib: 16, drive: 1.6, q: 2 },
      lead2: { cutoff: 2400, level: 0.075, vib: 12, drive: 1 },
      bass: { cutoff: 1400, level: 0.3, q: 4, gate: 0.7 },
      stab: { level: 0.22, oct: 12, cutoff: 3400 },
      pad: { cutoff: 1100, attack: 0.25, release: 0.6, level: 0.08 },
      arp: { wave: 'pulse', decay: 0.09, level: 0.07, oct: 24, cutoff: 3800 },
      swell: { level: 0.22, tonal: 0.35, from: 300, to: 7000 },
      kick: { vol: 1, punch: 0.4, d: 0.3 },
      snare: { tone: 190, d: 0.22, f: 2000 },
    },
    mix: { hat: 0.6, crash: 0.75 },
    sends: { lead: { wet: 0.2, echo: 0.14 }, lead2: { pan: 0.3, wet: 0.25 }, arp: { pan: -0.3, echo: 0.25 } },
    intro: ['I'],
    loop: ['A', 'B', 'C', 'D'],
    parts: {
      // the octave bass starts alone under a riser; stabs and a lead pickup land on the theme
      I: {
        bars: 2,
        chords: ['E2: E3 G3 B3', 'F2: F3 A3 C4'],
        bass: OCT16,
        swell: ['x - - - - - - - - - - - - - - -', ''],
        kick: ['X . . . X . . . X . . . X . . .', 'X . . . X . . . X . . . X X X X'],
        hat: ['. . x . . . x . . . x . . . x .', ''],
        stab: ['', 'X . . . . . . . X . . . X . . .'],
        snare: ['', '. . . . . . . . x x x x X X X X'],
        lead: ['', '. . . . . . . . . . . . B4 C5 D5 F5'],
      },
      A: {
        bars: 8,
        chords: ['E2: E3 G3 B3 E4', 'F2: F3 A3 C4 F4', 'G2: G3 B3 D4 G4', 'F2: F3 A3 C4 F4',
          'E2: E3 G3 B3 E4', 'F2: F3 A3 C4 F4', 'D2: D3 F3 A3 D4', 'E2: E3 G#3 B3 E4'],
        lead: ['E5 - E5 - F5 - E5 - D5 - E5 - B4 - - -', 'C5 - D5 - E5 - F5 - A5 - - - G5 - F5 -',
          'G5 - - - D5 - G5 - B5 - - - A5 - G5 -', 'A5 - - - - - - - F5 - G5 - A5 - C6 -',
          'B5 - - - G5 - E5 - B5 - - - C6 - B5 -', 'A5 - - - F5 - C5 - A5 - - - G5 - F5 -',
          'F5 - - - E5 - D5 - A4 - D5 - F5 - A5 -', 'G#5 - - - - - - - F5 - - - E5 - - -'],
        bass: OCT16,
        stab: 'X . . . . . . . . . X . . . . .',
        kick: 'X . . . X . . x X . . . X . . .',
        snare: lastDiff(8, '. . . . X . . . . . . . X . . .', '. . . . X . . . X . X x X X X X'),
        ohat: '. . x . . . x . . . x . . . x .',
        crash: firstOnly(8, 'X'),
      },
      B: {
        bars: 8,
        chords: ['A1: E3 A3 C4 E4', 'G1: D3 G3 B3 D4', 'F1: F3 A3 C4 F4', 'E2: E3 G#3 B3 E4',
          'A1: E3 A3 C4 E4', 'G1: D3 G3 B3 D4', 'F1: F3 A3 C4 F4', 'E2: E3 G#3 B3 E4'],
        lead: ['A5 - - - - - - - E5 - - - A5 - C6 -', 'B5 - - - - - - - D5 - - - G5 - B5 -',
          'A5 - - - - - - - C6 - - - A5 - F5 -', 'G#5 - - - - - - - - - - - E5 - F5 -',
          'E6 - - - D6 - C6 - B5 - - - A5 - - -', 'D6 - - - C6 - B5 - A5 - - - G5 - - -',
          'C6 - - - A5 - F5 - C6 - - - D6 - - -', 'E6 - - - - - - - - - - - - - - -'],
        lead2: ['E5 - - - - - - - C5 - - - E5 - A5 -', 'D5 - - - - - - - B4 - - - D5 - G5 -',
          'F5 - - - - - - - A5 - - - F5 - C5 -', 'E5 - - - - - - - - - - - B4 - D5 -',
          'C6 - - - B5 - A5 - G5 - - - E5 - - -', 'B5 - - - A5 - G5 - D5 - - - B4 - - -',
          'A5 - - - F5 - C5 - A5 - - - - - - -', 'B5 - - - - - - - - - - - - - - -'],
        bass: 'R - O - R - O - R - O - R - O -',
        stab: 'X . . . . . . . . . . . . . . .',
        kick: 'X . . . X . . . X . . . X . . .',
        snare: lastDiff(8, '. . . . X . . . . . . . X . . .', '. . . . X . . . X x X x X X X X'),
        hat: 'x o x o X o x o x o x o X o x o',
        crash: ['X', '', '', '', 'X', '', '', ''],
      },
      // half time: the bass stretches out, arpeggio cells climb, the lead holds long notes and a snare build
      // and a riser hand over to the solo
      C: {
        bars: 8,
        chords: ['E2: E3 G3 B3', 'C2: E3 G3 C4', 'A1: E3 A3 C4', 'B1: D3 F3 B3', 'E2: E3 G3 B3', 'C2: E3 G3 C4', 'D2: D3 F3 A3', 'F2: F3 A3 C4'],
        arp: '0 1 2 0 1 2 3 1 2 3 4 2 3 4 5 3',
        lead: ['', '', '', '', 'E5 - - - - - - - - - - - - - - -', 'E5 - - - - - - - G5 - - - - - - -',
          'F5 - - - - - - - A5 - - - - - - -', 'A5 - - - - - - - C6 - - - - - - -'],
        bass: 'R - - - - - O - R - - - - - O -',
        kick: lastDiff(8, 'X . . . . . . . . . X . . . . .', 'X . . . X . . . X . X . X X X X'),
        snare: [...rep(6, '. . . . . . . . X . . . . . . .'), 'x . x . x . x . x x x x x x x x', 'X x X x X X X X X*2 X*2 X*2 X*2 X X X X'],
        hat: '. . . . . . . . x . . . . . . .',
        swell: [...rep(7, ''), 'x - - - - - - - - - - - - - - -'],
        tom: lastDiff(8, '', '. . . . . . . . h h m m l l l l'),
        crash: firstOnly(8, 'X'),
      },
      D: {
        bars: 8,
        chords: ['E2: E3 G3 B3 E4', 'F2: F3 A3 C4 F4', 'E2: E3 G3 B3 E4', 'F2: F3 A3 C4 F4',
          'C2: E3 G3 C4 E4', 'D2: D3 F3 A3 D4', 'E2: E3 G3 B3 E4', 'F2: F3 A3 C4 F4'],
        lead: ['E5 F5 G5 B5 E6 - B5 G5 F5 E5 F5 G5 B5 - - -', 'C6 - A5 F5 C5 - F5 A5 C6 - D6 - C6 - A5 -',
          'B5 - G5 E5 B4 - E5 G5 B5 - C6 - B5 - G5 -', 'A5 - - - - - - - C6 - - - F6 - - -',
          'E6 - - - D6 - C6 - G5 - - - C6 - E6 -', 'F6 - - - E6 - D6 - A5 - - - D6 - F6 -',
          'E6 - - - - - B5 - G5 - - - E5 - - -', 'F5 - - - - - - - A5 - G5 - F5 - - -'],
        lead2: ['', '', '', '', 'E5 - - - D5 - C5 - G4 - - - C5 - E5 -', 'F5 - - - E5 - D5 - A4 - - - D5 - F5 -',
          'E5 - - - - - B4 - G4 - - - E4 - - -', 'C5 - - - - - - - F5 - E5 - D5 - - -'],
        arp: '0 1 2 0 1 2 3 1 2 3 4 2 3 4 5 3',
        bass: OCT16,
        stab: '. . . . . . . . . . X . . . . .',
        kick: 'X . . . X . . x X . . . X . x .',
        snare: lastDiff(8, '. . o . X . . o . . o . X . o .', 'X . . . X . . . X x X x X X X X'),
        hat: 'x x X x x x X x x x X x x x X x',
        crash: ['X', '', '', '', 'X', '', '', ''],
      },
    },
  },

  // The Memory Vault, B Lydian 7/8 (2+2+3) at 120: cyberspace inside HALCYON's mind, crystalline and strange.
  // Detuned, bit-crushed arpeggios run in sevens over a sub pulse and stuttering hats. B plays the lullaby on its
  // own music box, but the memory is corrupted: notes stutter (ratchets) and drop out. C is a crystal cave where
  // the box plays the tune's notes backwards, one per bar; A2 adds a square-wave lead on the raised fourth; D is
  // the full stream with the lullaby again, glitchier, until the last bar freezes into stutters.
  vault: {
    key: 'B Lydian',
    bpm: 120,
    meter: '7/8',
    gain: 1.45,
    delay: 0.75,
    motifs: ['lullaby'],
    choirSfx: [['B2', 'F#3', 'B3', 'D#4'], ['C#3', 'G#3', 'C#4', 'E#4'], ['G#2', 'D#3', 'G#3', 'B3'], ['F#3', 'A#3', 'C#4', 'F#4']],
    voices: {
      pad: { cutoff: 1500, attack: 1.2, release: 1.8, level: 0.1, air: 0.05, drift: 0.6 },
      arp: { wave: 'triangle', decay: 0.18, level: 0.18, oct: 12, cutoff: 5200, spread: 14, crush: 5 },
      arp2: { wave: 'sawtooth', decay: 0.07, level: 0.09, oct: 24, cutoff: 7000, spread: 22, crush: 3 },
      bell: { synth: 'box', oct: 12, level: 0.2, decay: 2, droop: 8, beat: 6 },
      bell2: { ratio: 3.5, index: 1.4, decay: 2.8, level: 0.08 },
      lead: { layers: [['square', 0, 1], ['square', -16, 0.7], ['triangle', 1200, 0.25]], cutoff: 2800, level: 0.075, vib: 8, attack: 0.01, release: 0.12 },
      bass: { synth: 'sub', level: 0.42, gate: 0.4, decay: 0.5, harm: 0.4 },
      swell: { level: 0.2, tonal: 0.3, from: 400, to: 9000 },
      kick: { vol: 0.7, punch: 0.25, d: 0.25 },
      hat: { f: 9000, d: 0.025 },
    },
    mix: { hat: 1.2, kick: 0.8 },
    sends: {
      arp: { wet: 0.3, echo: 0.35, pan: -0.3 }, arp2: { wet: 0.4, echo: 0.5, pan: 0.4 }, bell: { wet: 0.55, echo: 0.3 },
      bell2: { wet: 0.7, echo: 0.45, pan: -0.2 }, lead: { wet: 0.3, echo: 0.25, pan: 0.1 }, hat: { pan: 0.2 },
    },
    intro: ['I'],
    loop: ['A', 'B', 'C', 'A2', 'D'],
    parts: {
      // boot: crushed blips stutter in over a riser
      I: { bars: 1, chords: [VAULT_A[0]], arp2: '7*4 . . . 5*3 . . . 4*2 . 2*3 . 0 .', swell: 'x - - - - - - - - - - - - -', bass: '. . . . . . . . R . . . . .' },
      A: {
        bars: 8,
        chords: VAULT_A,
        arp: VAULT_ARP,
        arp2: ['', '. . . . . . . . . . 9*3 . . .', '', '. . . . 8*2 . . . . . . . 6*4 .'],
        bass: 'R! . . . R . . . R . . . . .',
        kick: 'X . x . X . .',
        hat: GLITCH_HAT,
      },
      B: {
        bars: 8,
        chords: ['B1: F#3 B3 D#4', 'B1: F#3 A#3 D#4', 'C#2: G#3 C#4 E#4', 'F#1: F#3 A#3 C#4', 'G#1: G#3 B3 D#4', 'C#2: G#3 C#4 E#4', 'F#1: F#3 A#3 C#4', 'B1: F#3 B3 D#4'],
        bell: ['D#5*3 - - - F#5 - -', 'B5 - - - A#5*2 - -', 'G#5 - A#5 - G#5*4 - -', 'F#5 - - - - . .',
          'E#5 - - - G#5 - -', 'C#6 - - - B5*3 - -', 'A#5 - G#5 - A#5 - -', 'B5 - - - . . B5*4'],
        arp2: ['. . . . . . . . . . 7*2 . . .', '', '. . . . 9*3 . . . . . . . . .', ''],
        bass: 'R . . . R . . . R . . . . .',
        kick: 'X . . . x . .',
        hat: 'x . . . x . . . x . . . x*2 .',
      },
      C: {
        bars: 8,
        chords: ['B1: F#3 B3 D#4 E#4', 'B1: F#3 B3 D#4 E#4', 'C#2: G#3 C#4 E#4', 'C#2: G#3 C#4 E#4', 'G#1: G#3 B3 D#4', 'G#1: G#3 B3 D#4', 'F#1: F#3 A#3 C#4 E#4', 'F#1: F#3 A#3 C#4 E#4'],
        bell: ['A#5 - - - - - -', 'G#5 - - - - - -', 'A#5 - - - - - -', 'B5 - - - - - -', 'F#5 - - - - - -', 'D#5 - - - - - -', '', '. . . . E#5*3 - -'],
        bell2: ['. . . . . . . . . . D#6 . . .', '. . . . E#6 . . . . . . . . .', '. . . . . . . . G#6 . . . . .', '. . C#6 . . . . . . . . . . .',
          '. . . . . . . . . . B5 . . .', '. . . . D#6 . . . . . . . . .', '. . . . . . . . A#5 . . . . .', ''],
        arp2: ['', '', '. . . . . . . . . . 9*2 . . .', '', '', '. . 5*3 . . . . . . . . . . .', '', ''],
        bass: 'R - - . . . .',
        swell: [...rep(7, ''), 'x - - - - - -'],
      },
      A2: {
        bars: 8,
        chords: VAULT_A,
        arp: VAULT_ARP,
        lead: VAULT_LEAD,
        bass: 'R! . . . R . . . R . . . . .',
        kick: 'X . x . X . .',
        hat: GLITCH_HAT,
      },
      D: {
        bars: 8,
        chords: VAULT_A,
        arp: lastDiff(8, VAULT_ARP[0], '7*3 . 5*2 . 4*4 . 2*3 . . . 0*4 . . .'),
        arp2: ['. . . . . . . . . . 9*3 . . .', '. . . . 8*2 . . . . . . . 6*4 .'],
        bell: ['D#5 - - - F#5 - -', 'B5*3 - - - A#5 - -', 'G#5*2 - A#5 - G#5 . .', 'F#5*4 . . . . . .', '', '', '', ''],
        lead: ['', '', '', '', ...VAULT_LEAD.slice(4)],
        bass: lastDiff(8, 'R! . . . R . . . R . R . . .', 'R*4 . . . . . . . . . . . . .'),
        kick: lastDiff(8, 'X . x . X . x', 'X*3 . . . . . .'),
        hat: lastDiff(8, GLITCH_HAT[1], 'x*4 x*4 x*3 x*3 x*2 x*2 x . . . . . . .'),
      },
    },
  },

  // Chapter card sting (once): a riser and tom roll swell on A sus into a strike on D add9 as the title lands
  // (~1.2 s, with the card's own 'card' sfx), then the chord rings out under three bells. 2 bars, ~4.6 s.
  sting_chapter: {
    key: 'D major',
    bpm: 104,
    gain: 0.92,
    delay: 0.75,
    once: true,
    voices: {
      swell: { level: 0.3, tonal: 0.5, from: 300, to: 7000 },
      pad: { cutoff: 1800, attack: 0.9, release: 2.6, level: 0.14 },
      stab: { level: 0.4, oct: 0, cutoff: 3600 },
      bell: { decay: 3, level: 0.2 },
      bass: { soft: true, level: 0.32 },
      kick: { f0: 120, f1: 30, sweep: 0.3, d: 1.2, vol: 1 },
      tom: { pitch: 0.7 },
    },
    sends: { bell: { wet: 0.6, echo: 0.35 } },
    loop: ['S'],
    parts: {
      S: {
        bars: 2,
        chords: [['A1: D3 E3 A3', 'D2: A3 D4 E4 F#4'], 'D2: A3 D4 E4 F#4'],
        swell: ['x - - - - - - - . . . . . . . .', ''],
        tom: ['. . o o o x x X . . . . . . . .', ''],
        kick: ['. . . . . . . . X . . . . . . .', ''],
        crash: ['. . . . . . . . X . . . . . . .', ''],
        stab: ['. . . . . . . . X . . . . . . .', ''],
        bass: ['. . . . . . . . R - - - - - - -', 'R - - - - - - - - - - - - - - -'],
        bell: ['. . . . . . . . D6 - - - A6 - - -', 'E6 - - - - - - - - - - - . . . .'],
      },
    },
  },
};

export const TRACK_NAMES = Object.keys(TRACKS);

// ------------------------------------------------------------------ motifs (TECH_PLAN 9)
// Note sequences that give the score its identity; the Choir motif is a chord. The WARDEN theme is the
// lullaby in the parallel minor. A track that carries one lists it in its `motifs`.
export const MOTIFS = {
  lullaby: ['A4', 'C5', 'F5', 'E5', 'D5', 'E5'],
  ringborn: ['D5', 'G5', 'F5', 'D5', 'C5', 'A4', 'G4'],
  warden: ['Ab4', 'C5', 'F5', 'Eb5', 'Db5', 'Eb5'],
  choir: ['A2', 'E3', 'B3', 'D4', 'F#4'],
};
const CHORD_MOTIFS = new Set(['choir']);

/**
 * Where a motif sounds in a compiled track (transposition allowed): [{ line, part, bar }] at its first note.
 * A melodic motif must be consecutive pitches of one line in play order (intro, then the loop); rests and
 * repeated notes in between are allowed. The chord motif matches any chord holding its pitch classes.
 * '<name>:inverted' looks for the melodic motif upside down (every interval mirrored), as in the spire's alarm.
 */
export function findMotif(c, motif) {
  const [name, form] = motif.split(':');
  if (!MOTIFS[name] || (form && (form !== 'inverted' || CHORD_MOTIFS.has(name)))) throw new Error(`unknown motif "${motif}"`);
  const notes = MOTIFS[name].map(noteMidi);
  const hits = [];
  const lines = {};
  for (const k of [...c.intro, ...c.loop]) {
    const part = c.parts[k];
    part.steps.forEach((evs, s) => {
      const bar = Math.floor(s / part.barSteps) + 1;
      for (const e of evs) {
        if (e.m == null) continue;
        if (CHORD_MOTIFS.has(name)) {
          if (Array.isArray(e.m) && hasPitchClasses(e.m, notes)) hits.push({ line: e.i, part: k, bar });
        } else if (!Array.isArray(e.m)) {
          const seq = lines[e.i] || (lines[e.i] = []);
          if (!seq.length || seq[seq.length - 1].m !== e.m) seq.push({ m: e.m, part: k, bar });
        }
      }
    });
  }
  const want = intervals(notes.filter((m, i) => i === 0 || m !== notes[i - 1])).map((d) => (form ? -d : d));
  for (const [line, seq] of Object.entries(lines)) {
    const got = intervals(seq.map((n) => n.m));
    for (let i = 0; i + want.length <= got.length; i++) {
      if (want.every((d, j) => got[i + j] === d)) hits.push({ line, part: seq[i].part, bar: seq[i].bar });
    }
  }
  return hits;
}

const intervals = (ms) => ms.slice(1).map((m, i) => m - ms[i]);

function hasPitchClasses(chord, motif) {
  const have = new Set(chord.map((m) => ((m % 12) + 12) % 12));
  for (let k = 0; k < 12; k++) if (motif.every((m) => have.has((m + k) % 12))) return true;
  return false;
}

// ------------------------------------------------------------------ offline rendering

/**
 * Render an sfx (kind 'sfx') or the first `seconds` of a track (kind 'music') into an AudioBuffer
 * with an OfflineAudioContext, through the full graph (reverb, delay, limiter). Used by the preview bench;
 * `only` (music) renders just those lines. The sound starts after a short silent warm-up (a fresh
 * DynamicsCompressor over-attenuates for its first ~0.5 s, which live play never hears); the warm-up is
 * trimmed from the result.
 */
export async function renderOffline(kind, name, { seconds = 2, sampleRate = 44100, part = null, only = null, opts = {} } = {}) {
  const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const lead = 0.6;
  const ctx = new OAC(2, Math.ceil((seconds + lead) * sampleRate), sampleRate);
  const rig = createRig(ctx);
  if (kind === 'sfx') playSfx(rig, name, opts, lead);
  else pumpTrack(startTrack(rig, name, lead, { part, only }), seconds + lead);
  const full = await ctx.startRendering();
  const skip = Math.floor(lead * sampleRate);
  const out = new AudioBuffer({ numberOfChannels: 2, length: full.length - skip, sampleRate });
  for (let ch = 0; ch < 2; ch++) out.copyToChannel(full.getChannelData(ch).subarray(skip), ch);
  return out;
}

// ------------------------------------------------------------------ game-facing singleton

const S = {
  ctx: null,
  rig: null,
  failed: false,
  muted: false,
  volume: { ...DEFAULT_VOLUME },
  want: null, // requested track (remembered before init)
  cur: null, // running track runtime
  fading: [], // runtimes fading out: still scheduled until their fade ends
  stings: [], // one-shot runtimes over the ducked bed, kept until their tail has rung out
  kickAt: 0, // performance.now() of the last resume request
};

try {
  const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
  if (p && typeof p.muted === 'boolean') S.muted = p.muted;
  if (p && p.volume) for (const k of ['master', 'music', 'sfx']) if (Number.isFinite(p.volume[k])) S.volume[k] = clamp(p.volume[k], 0, 1);
} catch { /* storage blocked, absent or corrupt: keep defaults */ }

function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ muted: S.muted, volume: S.volume })); } catch { /* ignore */ }
}

const pageHidden = () => typeof document !== 'undefined' && document.hidden;

/** Run the context only while it is audible: suspended when the tab is hidden or the game is muted. */
function syncRunning() {
  const ctx = S.ctx;
  if (!ctx || ctx.state === 'closed') return;
  const run = !S.muted && !pageHidden();
  if (run && ctx.state !== 'running') {
    S.kickAt = performance.now();
    ctx.resume().catch(() => {});
  } else if (!run && ctx.state === 'running') ctx.suspend().catch(() => {});
}

// Sounds are only scheduled on a running clock (or right after a resume request, so the very first
// confirm still plays): queuing onto a suspended clock would burst out all at once later.
const clockLive = () => S.ctx.state === 'running' || performance.now() - S.kickAt < 800;

/** Pump one runtime; a runtime that throws is reported, dropped and disposed alone (the rest keeps playing). */
function pumpSafe(rt, now) {
  try {
    pumpTrack(rt, now + LOOKAHEAD, now);
    return true;
  } catch (e) {
    console.error(`[audio] track "${rt.name}" stopped: ${e && e.message}`);
    disposeTrack(rt);
    return false;
  }
}

/** Keep pumping a stopping runtime until `tail` seconds after its end, then dispose it. Returns whether it stays. */
function retire(rt, now, tail) {
  if (now > rt.stopAt + tail) {
    disposeTrack(rt);
    return false;
  }
  return pumpSafe(rt, now);
}

function tick() {
  const ctx = S.ctx;
  if (ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (S.cur && !pumpSafe(S.cur, now)) S.cur = null;
  S.fading = S.fading.filter((rt) => retire(rt, now, 0.1));
  S.stings = S.stings.filter((rt) => retire(rt, now, STING_TAIL));
}

function switchTrack(name, fade) {
  const now = S.ctx.currentTime;
  const had = !!S.cur;
  if (S.cur) {
    stopTrack(S.cur, now, Math.max(0.02, fade ?? FADE));
    S.fading.push(S.cur);
    S.cur = null;
  }
  // the incoming track reaches full level quickly so its downbeat keeps its punch; the old one fades over FADE
  if (name) S.cur = startTrack(S.rig, name, now + 0.05, { fade: fade ?? (had ? 0.4 : 0.3) });
  tick();
}

/** A sting cuts any sting still playing, ducks the bed for its length and plays once over it. */
function playSting(name) {
  if (!S.rig || S.muted || pageHidden() || !clockLive()) return;
  const now = S.ctx.currentTime;
  for (const rt of S.stings) if (rt.stopAt > now) stopTrack(rt, now, 0.12);
  const rt = startTrack(S.rig, name, now + 0.05);
  S.stings.push(rt);
  S.rig.duck(now, rt.stopAt);
  tick();
}

export const audio = {
  /** Create / resume the AudioContext. Call on the first user gesture; safe to call repeatedly. */
  init() {
    if (S.failed) return;
    try {
      if (!S.ctx) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) { S.failed = true; return; }
        S.ctx = new AC({ latencyHint: 'interactive' });
        S.rig = createRig(S.ctx, S.ctx.destination, { volume: S.volume, muted: S.muted });
        // iOS unlock: start one silent buffer from inside the gesture.
        const b = S.ctx.createBufferSource();
        b.buffer = S.ctx.createBuffer(1, 1, S.ctx.sampleRate);
        b.connect(S.ctx.destination);
        b.start(0);
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', syncRunning);
        setInterval(tick, TICK_MS);
        if (S.want) switchTrack(S.want);
      }
      syncRunning();
    } catch (e) {
      S.failed = true;
      console.warn('[audio] disabled:', e && e.message);
    }
  },

  /**
   * Play a sound effect. opts: { volume (0-2, default 1), pitch (multiplier; for 'boost' an integer 1-3 = boost
   * level), pan (-1..1), chords ('choir' only: note-name chords to sing; default the wanted track's choirSfx) }.
   */
  sfx(name, opts = {}) {
    if (!S.rig || S.muted || !SFX[name] || pageHidden() || !clockLive()) return;
    let o = opts || {};
    // WARDEN's voice follows the music: the wanted track's choirSfx chords, if it has any
    if (name === 'choir' && !o.chords && S.want && TRACKS[S.want]?.choirSfx) o = { ...o, chords: TRACKS[S.want].choirSfx };
    try { playSfx(S.rig, name, o); } catch { /* a sound must never break gameplay */ }
  },

  /**
   * Crossfade to a track, or to silence (null). opts.fade: crossfade seconds (default: the old track fades
   * over 0.8 s, the new one comes in over 0.3-0.4 s); opts.restart: replay even when `track` is already
   * playing. A `once` track (sting) plays one time over the ducked current track and leaves it wanted.
   * Unknown and malformed names are ignored.
   */
  music(track, opts) {
    const { fade, restart } = opts || {};
    const c = track ? compiledTrack(track) : null;
    if (track && !c) return;
    try {
      if (c && c.once) { playSting(track); return; }
      if (c ? track === S.want && !restart : S.want === null) return;
      S.want = track || null;
      if (S.rig) switchTrack(S.want, fade); // otherwise init() starts it
    } catch (e) { console.warn('[audio] music:', e && e.message); }
  },

  setMuted(b) {
    S.muted = !!b;
    savePrefs();
    if (!S.rig) return;
    if (!S.muted) syncRunning();
    S.rig.setLevels(S.volume, S.muted, S.ctx.currentTime, 0.12);
    if (S.muted) setTimeout(syncRunning, 160);
  },
  toggleMute() {
    audio.setMuted(!S.muted);
    return S.muted;
  },
  get muted() { return S.muted; },

  /** Volumes 0-1 (any subset). Persisted. */
  setVolume({ master, music, sfx } = {}) {
    for (const [k, v] of [['master', master], ['music', music], ['sfx', sfx]]) if (Number.isFinite(v)) S.volume[k] = clamp(v, 0, 1);
    savePrefs();
    if (S.rig) S.rig.setLevels(S.volume, S.muted, S.ctx.currentTime, 0.08);
  },
  get volume() { return { ...S.volume }; },

  /** Requested track name (or null). */
  get track() { return S.want; },
  /** Debug: the sting playing right now (or null). */
  get sting() {
    const now = S.ctx ? S.ctx.currentTime : 0;
    const rt = S.stings.find((x) => x.stopAt > now);
    return rt ? rt.name : null;
  },
  get context() { return S.ctx; },
  get ready() { return !!S.rig; },
  /** Debug: current music position { track, part, bar } or null. */
  position() {
    const rt = S.cur;
    return rt ? { track: rt.name, part: partAt(rt), bar: Math.floor(rt.step / rt.c.barSteps) + 1, time: S.ctx.currentTime } : null;
  },
};
