// VOIDPATH audio: every sound effect and music track, synthesised with WebAudio.
// No samples, no network: oscillators, filtered noise, FM and a procedural reverb impulse.
//
// Graph (one "rig" per BaseAudioContext, see createRig):
//
//   sfx voices ----> sfx.dry ----------------------------\
//                \-> sfx.wet / sfx.echo --\               \
//   music strips --> music.dry -----------+----------------+--> master -> highpass -> limiter -> destination
//                \-> music.wet / .echo --> reverb (2.2 s convolution) / ping-pong delay (tempo-synced) --/
//
// Synthesis functions take (rig, time) so the same code renders live (AudioContext) and offline
// (OfflineAudioContext, used by the preview bench to measure peaks/RMS). The `audio` singleton
// at the bottom is the game-facing API from CONTRACTS.md.

import { clamp, makeRng } from './util.js';

// ------------------------------------------------------------------ levels

// Bus trims: sfx peaks land around -6 dBFS, music sits under them (~-22 dBFS RMS).
const SFX_TRIM = 1.0;
const MUSIC_TRIM = 0.62;
const VERB_RETURN = 0.55;
const ECHO_RETURN = 0.42;
const FADE = 0.8; // music crossfade seconds
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

/**
 * Oscillator layer. Options:
 *  type, f, f1 (glide target), glide, f2/glide2 (second leg), a, d, hold, vol, detune (cents),
 *  lp / lp1 / lpGlide / lpQ (lowpass + sweep), hp, bp/bpQ, drive (soft clip), trem / tremDepth (Hz / 0-1).
 */
function tone(r, out, t, o) {
  const ctx = r.ctx;
  const osc = oscNode(r, o.type || 'sine', o.f);
  if (o.detune) osc.detune.value = o.detune;
  sweep(osc.frequency, t, o.f, o.f1, o.glide ?? 0.1, o.f2, o.glide2 ?? 0.1);
  let node = osc;
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

function hat(r, out, t, vel = 1, open = false) {
  noise(r, out, t, { type: 'highpass', f: 7600, q: 0.8, a: 0.001, d: open ? 0.32 : 0.05, vol: vel * 0.32 });
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
};

export const SFX_NAMES = Object.keys(SFX);

/**
 * Play an sfx on a rig at audio time `when` (0 = now). opts: { volume, pitch, pan }.
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
      const osc = oscNode(r, 'sawtooth', mtof(m + (o.oct ?? 0)));
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

/** Lead: saw stack (with an octave-down layer) through an enveloped lowpass, delayed vibrato, optional glide. */
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
  lp.connect(v).connect(out);
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
    osc.connect(gainNode(ctx, gain)).connect(lp);
    osc.start(t);
    osc.stop(stop);
  }
  vib.start(t);
  vib.stop(stop);
}
const LEAD_LAYERS = [['sawtooth', 0, 1], ['sawtooth', 9, 0.75], ['sawtooth', -1197, 0.55]];

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

function pluckVoice(r, out, t, m, dur, vel, o) {
  const d = o.decay ?? 0.25;
  const cut = o.cutoff ?? 3600;
  tone(r, out, t, { type: o.wave ?? 'square', f: mtof(m + (o.oct ?? 0)), lp: cut, lp1: cut * 0.2, lpGlide: d * 0.6, lpQ: 2, a: 0.002, d, vol: vel * (o.level ?? 0.15) });
}

function harpVoice(r, out, t, m, dur, vel, o) {
  const f = mtof(m + (o.oct ?? 0));
  const d = o.decay ?? 1.4;
  const lvl = vel * (o.level ?? 0.2);
  tone(r, out, t, { type: 'triangle', f, lp: 3200, lp1: 800, lpGlide: d * 0.5, a: 0.002, d, vol: lvl });
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

const TOM_PITCH = { h: 165, m: 125, l: 92, x: 125, X: 125, o: 125 };

// ------------------------------------------------------------------ channel strips
// Per track and instrument: level -> pan -> track dry, with reverb/delay sends. Values: [level, pan, wet, echo].
const STRIPS = {
  pad: [1, 0, 0.35, 0], bell: [1, 0.12, 0.45, 0.3], lead: [1, 0, 0.22, 0.12], bass: [1, 0, 0.02, 0],
  arp: [1, -0.25, 0.2, 0.34], harp: [1, -0.18, 0.4, 0.2], stab: [1, 0.08, 0.2, 0.05],
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
// A part is { bars, chords, <instrument>: pattern | pattern[] (one per bar, cycled) }.
// A numbered line ('lead2', 'bell2') is an extra voice of the base instrument with its own channel strip.
// Pattern = whitespace tokens, 1/2/4/8/16 per bar. '.' rest, '-' extend previous note.
//   melodic (lead, bell, bass): note names 'E5', '~G5' glides from the previous note, 'E5!' accent;
//   bass also: R root, O octave, F fifth, f fifth below, b flat 2nd, t tritone, L octave down (of the chord's bass note);
//   arp / harp: digits index the chord voicing (4 notes: 4 = first note + 12 ...); stab: x / X;
//   drums (kick snare hat ohat crash tom): X accent, x normal, o ghost; tom also h / m / l pitch.
// Chord = 'BASS: voicing notes', or [chord, chord] for two half-bar chords.

const DRUMS = new Set(['kick', 'snare', 'hat', 'ohat', 'crash', 'tom']);
const BASS_TOK = { R: 0, O: 12, F: 7, f: -5, b: 1, t: 6, L: -12 };

function parseChord(s) {
  const [root, rest] = s.split(':');
  return { root: noteMidi(root.trim()), notes: rest.trim().split(/\s+/).map(noteMidi) };
}

function makeEvent(inst, base, tok, chord, len, prev, where) {
  if (DRUMS.has(base)) {
    const v = { X: 1, x: 0.72, o: 0.38, h: 0.85, m: 0.85, l: 0.85 }[tok];
    if (!v) throw new Error(`bad drum token "${tok}" ${where}`);
    return { i: inst, b: base, v, tok, len };
  }
  let s = tok;
  let v = 0.82;
  const glide = s[0] === '~';
  if (glide) s = s.slice(1);
  if (s.endsWith('!')) { v = 1; s = s.slice(0, -1); }
  if (base === 'stab') return { i: inst, b: base, m: chord.notes, len, v: s === 'X' ? 1 : 0.78 };
  let m;
  if (base === 'arp' || base === 'harp') {
    const idx = Number(s);
    const n = chord ? chord.notes.length : 0;
    m = n ? chord.notes[idx % n] + 12 * Math.floor(idx / n) : NaN;
  } else if (base === 'bass' && s in BASS_TOK) {
    m = chord ? chord.root + BASS_TOK[s] : NaN;
  } else m = noteMidi(s);
  if (Number.isNaN(m)) throw new Error(`bad token "${tok}" ${where}`);
  return { i: inst, b: base, m, len, v, from: glide && prev ? prev.m : null };
}

function compilePart(part, label) {
  const n = part.bars * 16;
  const steps = Array.from({ length: n }, () => []);
  const chordAt = new Array(n).fill(null);
  let prevStr = null;
  let prevPad = null;
  for (let b = 0; b < part.bars && part.chords; b++) {
    const entry = part.chords[b % part.chords.length];
    const halves = Array.isArray(entry) ? entry : [entry];
    const len = 16 / halves.length;
    halves.forEach((cs, h) => {
      const at = b * 16 + h * len;
      const c = parseChord(cs);
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
      const per = 16 / toks.length;
      if (!Number.isInteger(per)) throw new Error(`${label}.${inst} bar ${b + 1}: ${toks.length} tokens`);
      toks.forEach((tok, k) => {
        const at = b * 16 + k * per;
        if (tok === '.') { last = null; return; }
        if (tok === '-') { if (last) last.len += per; return; }
        const ev = makeEvent(inst, base, tok, chordAt[at], per, last, `in ${label}.${inst} bar ${b + 1}`);
        steps[at].push(ev);
        last = DRUMS.has(base) ? null : ev;
      });
    }
  }
  return { bars: part.bars, steps };
}

const compiled = new Map();
/** Compile (and cache) a track's parts. Throws with a readable message on malformed data. */
export function compileTrack(name) {
  if (compiled.has(name)) return compiled.get(name);
  const tr = TRACKS[name];
  const parts = {};
  for (const [k, p] of Object.entries(tr.parts)) parts[k] = compilePart(p, `${name}.${k}`);
  const intro = tr.intro || [];
  const loop = tr.loop;
  const barSec = 240 / tr.bpm;
  const c = {
    parts, intro, loop,
    introSeconds: intro.reduce((s, k) => s + parts[k].bars * barSec, 0),
    loopSeconds: loop.reduce((s, k) => s + parts[k].bars * barSec, 0),
    loopBars: loop.reduce((s, k) => s + parts[k].bars, 0),
  };
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
  if (rt.step >= rt.c.parts[partAt(rt)].bars * 16) {
    rt.step = 0;
    rt.seqIdx++;
  }
  rt.next += rt.stepDur;
}

function playStep(rt, t) {
  const evs = rt.c.parts[partAt(rt)].steps[rt.step];
  for (let k = 0; k < evs.length; k++) {
    const e = evs[k];
    const name = e.i === 'ohat' ? 'hat' : e.i;
    const out = rt.strips[name] || (rt.strips[name] = makeStrip(rt, name, e.b === 'ohat' ? 'hat' : e.b));
    const vo = rt.track.voices?.[e.i] || rt.track.voices?.[e.b] || {};
    const dur = e.len * rt.stepDur;
    const r = rt.r;
    switch (e.b) {
      case 'pad': padVoice(r, out, t, e.m, dur, e.v, vo); break;
      case 'lead': leadVoice(r, out, t, e.m, dur, e.v, vo, e.from); break;
      case 'bell': bellVoice(r, out, t, e.m, dur, e.v, vo); break;
      case 'bass': bassVoice(r, out, t, e.m, dur, e.v, vo); break;
      case 'arp': pluckVoice(r, out, t, e.m, dur, e.v, vo); break;
      case 'harp': harpVoice(r, out, t, e.m, dur, e.v, vo); break;
      case 'stab': stabVoice(r, out, t, e.m, dur, e.v, vo); break;
      case 'kick': kick(r, out, t, e.v, vo); break;
      case 'snare': snare(r, out, t, e.v, vo); break;
      case 'hat': hat(r, out, t, e.v, false); break;
      case 'ohat': hat(r, out, t, e.v, true); break;
      case 'crash': crash(r, out, t, e.v); break;
      case 'tom': tom(r, out, t, e.v, TOM_PITCH[e.tok]); break;
      default: break;
    }
  }
}

/**
 * Start a track on a rig at audio time `when`. Returns a runtime handle for pumpTrack/stopTrack.
 * opts.fade: fade-in seconds; opts.part: start at this part (skips the intro).
 */
export function startTrack(r, name, when, { fade = 0, part = null } = {}) {
  const tr = TRACKS[name];
  const c = compileTrack(name);
  const ctx = r.ctx;
  const out = { dry: gainNode(ctx, 0), wet: gainNode(ctx, 0), echo: gainNode(ctx, 0) };
  for (const k of ['dry', 'wet', 'echo']) {
    out[k].connect(r.music[k]);
    const p = out[k].gain;
    const level = tr.gain ?? 1;
    p.setValueAtTime(fade > 0 ? 0.0001 : level, when);
    if (fade > 0) p.linearRampToValueAtTime(level, when + fade);
  }
  const rt = { r, name, track: tr, c, out, strips: {}, seqIdx: 0, step: 0, next: when, stepDur: 15 / tr.bpm, stopAt: Infinity };
  if (part) {
    const i = c.loop.indexOf(part);
    if (i >= 0) rt.seqIdx = c.intro.length + i;
  }
  r.setDelay((tr.delay ?? 0.75) * (60 / tr.bpm), when);
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

export const TRACKS = {
  // D minor, i-VI-III-VII colour; celesta bell melody over drifting pads and a slow harp. Melancholy, wistful.
  title: {
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
    bpm: 160,
    gain: 0.6,
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
    bpm: 116,
    gain: 0.82,
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
};

export const TRACK_NAMES = Object.keys(TRACKS);

// ------------------------------------------------------------------ offline rendering

/**
 * Render an sfx (kind 'sfx') or the first `seconds` of a track (kind 'music') into an AudioBuffer
 * with an OfflineAudioContext, through the full graph (reverb, delay, limiter). Used by the preview bench.
 * The sound starts after a short silent warm-up (a fresh DynamicsCompressor over-attenuates for its
 * first ~0.5 s, which live play never hears); the warm-up is trimmed from the result.
 */
export async function renderOffline(kind, name, { seconds = 2, sampleRate = 44100, part = null, opts = {} } = {}) {
  const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const lead = 0.6;
  const ctx = new OAC(2, Math.ceil((seconds + lead) * sampleRate), sampleRate);
  const rig = createRig(ctx);
  if (kind === 'sfx') playSfx(rig, name, opts, lead);
  else pumpTrack(startTrack(rig, name, lead, { part }), seconds + lead);
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

function tick() {
  const ctx = S.ctx;
  if (ctx.state !== 'running') return;
  const now = ctx.currentTime;
  try {
    if (S.cur) pumpTrack(S.cur, now + LOOKAHEAD, now);
    for (let i = S.fading.length - 1; i >= 0; i--) {
      const rt = S.fading[i];
      if (now > rt.stopAt + 0.1) {
        disposeTrack(rt);
        S.fading.splice(i, 1);
      } else pumpTrack(rt, now + LOOKAHEAD, now);
    }
  } catch (e) {
    // never throw from the timer every 25 ms: drop the music, keep sfx working
    console.warn('[audio] music disabled:', e && e.message);
    if (S.cur) disposeTrack(S.cur);
    for (const rt of S.fading) disposeTrack(rt);
    S.cur = null;
    S.fading.length = 0;
  }
}

function switchTrack(name) {
  const now = S.ctx.currentTime;
  const had = !!S.cur;
  if (S.cur) {
    stopTrack(S.cur, now, FADE);
    S.fading.push(S.cur);
    S.cur = null;
  }
  // the incoming track reaches full level quickly so its downbeat keeps its punch; the old one fades over FADE
  if (name) S.cur = startTrack(S.rig, name, now + 0.05, { fade: had ? 0.4 : 0.3 });
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

  /** Play a sound effect. opts: { volume (0-2, default 1), pitch (multiplier; for 'boost' an integer 1-3 = boost level), pan (-1..1) }. */
  sfx(name, opts = {}) {
    if (!S.rig || S.muted || !SFX[name] || pageHidden() || !clockLive()) return;
    try { playSfx(S.rig, name, opts || {}); } catch { /* a sound must never break gameplay */ }
  },

  /** Crossfade to a track ('title' | 'explore' | 'battle' | 'boss' | 'victory') or to silence (null). */
  music(track) {
    const name = track && TRACKS[track] ? track : null;
    if (track && !name) return;
    if (name === S.want) return;
    S.want = name;
    if (!S.rig) return; // started by init()
    try { switchTrack(name); } catch (e) { console.warn('[audio] music:', e && e.message); }
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
  get context() { return S.ctx; },
  get ready() { return !!S.rig; },
  /** Debug: current music position { track, part, bar } or null. */
  position() {
    const rt = S.cur;
    return rt ? { track: rt.name, part: partAt(rt), bar: Math.floor(rt.step / 16) + 1, time: S.ctx.currentTime } : null;
  },
};
