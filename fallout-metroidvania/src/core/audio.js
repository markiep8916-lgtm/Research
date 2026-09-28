// Procedural audio: every sound is synthesised with WebAudio; ambient music is generated per region.
(function () {
'use strict';
const CD = window.CD;
const A = (CD.audio = { vol: { master: 0.8, sfx: 0.9, music: 0.55 }, muted: false, ready: false, track: null, geigerRate: 0 });
let ctx = null, master, sfxG, musG, verb, verbSend, comp, noiseBuf, lastT = {}, active = {};

function makeIR(seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return buf;
}
A.init = function () {
  if (ctx) return;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.25;
  master = ctx.createGain(); master.gain.value = A.muted ? 0 : A.vol.master; master.connect(comp); comp.connect(ctx.destination);
  sfxG = ctx.createGain(); sfxG.gain.value = A.vol.sfx; sfxG.connect(master);
  musG = ctx.createGain(); musG.gain.value = A.vol.music; musG.connect(master);
  verb = ctx.createConvolver(); verb.buffer = makeIR(1.9, 2.8); const vg = ctx.createGain(); vg.gain.value = 0.9; verb.connect(vg); vg.connect(master);
  verbSend = ctx.createGain(); verbSend.gain.value = 0.22; verbSend.connect(verb);
  const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  A.ready = true;
  if (A.pendingTrack) { const t = A.pendingTrack; A.pendingTrack = null; A.setTrack(t); }
};
A.resume = function () { if (!ctx) A.init(); if (ctx && ctx.state === 'suspended') ctx.resume(); };
A.setMuted = function (m) { A.muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : A.vol.master, ctx.currentTime, 0.05); };
A.setVolume = function (k, v) { A.vol[k] = v; if (!ctx) return; if (k === 'master' && !A.muted) master.gain.value = v; if (k === 'sfx') sfxG.gain.value = v; if (k === 'music') musG.gain.value = v; };
A.duck = function (s) { if (!ctx) return; const t = ctx.currentTime; musG.gain.cancelScheduledValues(t); musG.gain.setValueAtTime(musG.gain.value, t); musG.gain.linearRampToValueAtTime(0.05, t + 0.1); musG.gain.linearRampToValueAtTime(A.vol.music, t + (s || 1)); };

// ---------------------------------------------------------------- building blocks
function out(g, wet) { g.connect(sfxG); if (wet) { const s = ctx.createGain(); s.gain.value = wet; g.connect(s); s.connect(verbSend); } }
function tone(type, f0, f1, dur, vol, o) {
  o = o || {}; const t = ctx.currentTime + (o.delay || 0);
  const osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = type; osc.frequency.setValueAtTime(Math.max(1, f0), t);
  if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur * (o.sweep || 1));
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + (o.atk || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = osc;
  if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
  node.connect(g); out(g, o.wet); osc.start(t); osc.stop(t + dur + 0.05);
  if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
  return osc;
}
function noise(dur, vol, ftype, f0, f1, q, o) {
  o = o || {}; const t = ctx.currentTime + (o.delay || 0);
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.loopStart = Math.random(); const g = ctx.createGain();
  const f = ctx.createBiquadFilter(); f.type = ftype || 'bandpass'; f.frequency.setValueAtTime(f0 || 1000, t); if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); f.Q.value = q || 1;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + (o.atk || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); out(g, o.wet); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}
function limited(name, minGap, maxVoices) {
  const now = ctx.currentTime; if (lastT[name] && now - lastT[name] < minGap) return false;
  lastT[name] = now; return true;
}

// ---------------------------------------------------------------- SFX
const S = {};
function gun(o) { // o: crack, body, thump, tail
  noise(o.crackDur || 0.05, o.crack, 'highpass', o.crackF || 2400, 900, 0.7, { wet: o.wet || 0.4 });
  noise(o.bodyDur || 0.12, o.body, 'bandpass', o.bodyF || 1800, o.bodyF2 || 500, 0.9, { wet: o.wet || 0.4 });
  tone('sine', o.thumpF || 150, 40, o.thumpDur || 0.14, o.thump, { wet: 0.1 });
  if (o.tail) noise(o.tail, o.tailV || 0.06, 'lowpass', 900, 200, 0.5, { delay: 0.02, wet: 0.8 });
}
S.pistol = () => gun({ crack: 0.5, body: 0.4, thump: 0.5, bodyF: 2200, bodyDur: 0.1, tail: 0.5, wet: 0.5 });
S.pipe = () => gun({ crack: 0.35, body: 0.4, thump: 0.5, bodyF: 1400, bodyF2: 400, bodyDur: 0.13, thumpF: 120, tail: 0.3 });
S.rifle = () => gun({ crack: 0.7, body: 0.5, thump: 0.7, bodyF: 1600, bodyF2: 300, bodyDur: 0.2, thumpF: 110, thumpDur: 0.2, tail: 0.9, tailV: 0.09, wet: 0.7 });
S.shotgun = () => gun({ crack: 0.7, body: 0.7, thump: 0.9, bodyF: 1200, bodyF2: 200, bodyDur: 0.24, thumpF: 90, thumpDur: 0.25, tail: 0.8, tailV: 0.1, wet: 0.7 });
S.assault = () => gun({ crack: 0.5, body: 0.35, thump: 0.4, bodyF: 2400, bodyDur: 0.08, thumpF: 140, tail: 0.25, wet: 0.35 });
S.minigun = () => gun({ crack: 0.32, body: 0.3, thump: 0.25, bodyF: 2000, bodyDur: 0.06, thumpF: 130, thumpDur: 0.08, wet: 0.2 });
S.laser = () => { tone('sawtooth', 2200, 260, 0.2, 0.18, { lp: 3600, wet: 0.35 }); tone('square', 1500, 180, 0.16, 0.08, { lp: 2400 }); noise(0.08, 0.16, 'highpass', 4200, 2000, 0.6, { wet: 0.2 }); };
S.plasma = () => { tone('sawtooth', 380, 110, 0.32, 0.2, { lp: 1800, vib: [38, 60], wet: 0.5 }); tone('sine', 900, 200, 0.28, 0.14, { wet: 0.4 }); noise(0.2, 0.14, 'bandpass', 1400, 400, 1.2, { wet: 0.4 }); };
S.explosion = () => { noise(1.1, 0.9, 'lowpass', 2600, 90, 0.6, { wet: 0.9 }); tone('sine', 90, 24, 0.9, 0.95, { wet: 0.3 }); noise(0.3, 0.5, 'highpass', 3000, 900, 0.5); noise(0.5, 0.3, 'bandpass', 600, 200, 1, { delay: 0.1, wet: 0.5 }); };
S.hit_flesh = () => { noise(0.09, 0.45, 'lowpass', 900, 250, 0.7); tone('sine', 160, 60, 0.1, 0.4); };
S.hit_metal = () => { tone('triangle', 1250, 1180, 0.16, 0.22, { wet: 0.3 }); tone('square', 1870, 1810, 0.11, 0.08, { lp: 4000 }); noise(0.03, 0.4, 'highpass', 3000, 3000, 0.5); };
S.ricochet = () => { tone('sine', 3200, 900, 0.22, 0.18, { wet: 0.3 }); noise(0.05, 0.2, 'highpass', 4000, 2000); };
S.impact_wall = () => { noise(0.06, 0.28, 'bandpass', 1800, 700, 1); };
S.hurt = () => { tone('sawtooth', 230, 110, 0.2, 0.26, { lp: 900 }); noise(0.12, 0.4, 'lowpass', 700, 200, 0.7); };
S.die = () => { tone('sawtooth', 200, 50, 0.45, 0.24, { lp: 700, wet: 0.3 }); noise(0.2, 0.3, 'lowpass', 600, 150, 0.6); };
S.player_die = () => { tone('sawtooth', 190, 40, 1.1, 0.3, { lp: 600, wet: 0.5 }); noise(0.5, 0.4, 'lowpass', 800, 100, 0.6, { wet: 0.5 }); tone('sine', 70, 28, 1.2, 0.5); };
S.robot_die = () => { tone('sawtooth', 700, 55, 0.9, 0.22, { lp: 2200, wet: 0.4 }); noise(0.5, 0.3, 'highpass', 2500, 800, 0.6, { wet: 0.3 }); for (let i = 0; i < 4; i++) noise(0.04, 0.25, 'highpass', 3500, 3500, 0.5, { delay: 0.12 + i * 0.09 }); };
S.jump = () => { noise(0.12, 0.13, 'bandpass', 500, 1100, 1.1); tone('sine', 220, 320, 0.08, 0.1); };
S.land = () => { noise(0.08, 0.2, 'lowpass', 500, 150, 0.7); };
S.land_hard = () => { noise(0.16, 0.42, 'lowpass', 600, 100, 0.7); tone('sine', 90, 40, 0.16, 0.4); };
S.step = () => { if (!limited('step', 0.07)) return; noise(0.05, 0.075 + Math.random() * 0.03, 'bandpass', 500 + Math.random() * 500, 200, 1.4); };
S.jet = () => { noise(0.34, 0.32, 'bandpass', 500, 2200, 0.9, { wet: 0.25 }); tone('sawtooth', 130, 260, 0.3, 0.1, { lp: 900 }); };
S.dash = () => { noise(0.22, 0.34, 'highpass', 800, 4200, 0.7, { wet: 0.2 }); tone('sine', 300, 800, 0.15, 0.1); };
S.splash = () => { noise(0.25, 0.3, 'bandpass', 900, 300, 0.8, { wet: 0.3 }); };
S.pickup = () => { tone('sine', 660, 990, 0.12, 0.2, { wet: 0.3 }); tone('sine', 990, 1320, 0.14, 0.14, { delay: 0.07, wet: 0.3 }); };
S.caps = () => { if (!limited('caps', 0.05)) return; tone('triangle', 2100 + Math.random() * 300, 2000, 0.16, 0.14, { wet: 0.3 }); tone('triangle', 2900, 2800, 0.12, 0.1, { delay: 0.05, wet: 0.3 }); };
S.ability = () => { [392, 523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.9, 0.16, { delay: i * 0.11, wet: 0.7, atk: 0.02 })); tone('sine', 196, 196, 1.6, 0.2, { wet: 0.5, atk: 0.1 }); noise(1.2, 0.08, 'bandpass', 3000, 6000, 3, { wet: 0.8, atk: 0.3 }); };
S.bobble = () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone('sine', f, f * 1.01, 0.28, 0.16, { delay: i * 0.06, wet: 0.5 })); };
S.levelup = () => { [523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.5, 0.15, { delay: i * 0.12, wet: 0.5 })); tone('triangle', 1046, 1046, 0.9, 0.15, { delay: 0.36, wet: 0.6 }); };
S.unlock = () => { tone('square', 300, 300, 0.05, 0.12, { lp: 1800 }); tone('square', 450, 450, 0.06, 0.12, { delay: 0.08, lp: 1800 }); noise(0.05, 0.2, 'highpass', 3000, 3000, 0.5, { delay: 0.14 }); };
S.stimpak = () => { noise(0.35, 0.22, 'highpass', 3000, 6000, 0.6); tone('sine', 500, 900, 0.14, 0.1, { delay: 0.28 }); tone('sine', 900, 1400, 0.1, 0.1, { delay: 0.38 }); };
S.chem = () => { noise(0.25, 0.22, 'highpass', 2500, 5000, 0.6); tone('sine', 400, 300, 0.2, 0.1); };
S.reload = () => { noise(0.04, 0.3, 'bandpass', 2400, 1800, 2); tone('square', 220, 160, 0.05, 0.08, { lp: 1600 }); noise(0.05, 0.3, 'bandpass', 3000, 2000, 2, { delay: 0.45 }); tone('square', 300, 200, 0.06, 0.09, { delay: 0.45, lp: 1600 }); };
S.empty = () => { noise(0.03, 0.25, 'bandpass', 2600, 2000, 2); };
S.switch = () => { noise(0.035, 0.22, 'bandpass', 2800, 2000, 2); tone('square', 500, 420, 0.04, 0.06, { lp: 1800 }); };
S.swing = () => { noise(0.16, 0.2, 'bandpass', 500, 1600, 0.9); };
S.swing_heavy = () => { noise(0.28, 0.32, 'bandpass', 300, 1200, 0.8, { wet: 0.2 }); tone('sine', 120, 70, 0.2, 0.15); };
S.melee_hit = () => { noise(0.08, 0.5, 'lowpass', 1200, 250, 0.7); tone('sine', 140, 55, 0.12, 0.5); noise(0.03, 0.3, 'highpass', 3000, 2000, 0.5); };
S.melee_heavy = () => { noise(0.16, 0.7, 'lowpass', 1400, 150, 0.7, { wet: 0.3 }); tone('sine', 100, 30, 0.35, 0.8); noise(0.05, 0.4, 'highpass', 2500, 1500, 0.5); };
S.wall_break = () => { noise(0.7, 0.7, 'lowpass', 1800, 120, 0.6, { wet: 0.7 }); tone('sine', 80, 30, 0.5, 0.6); for (let i = 0; i < 6; i++) noise(0.05, 0.25, 'bandpass', 1500 + Math.random() * 1500, 800, 2, { delay: 0.1 + i * 0.07 }); };
S.bounce = () => { tone('triangle', 900, 700, 0.05, 0.08, { lp: 2500 }); };
S.throw = () => { noise(0.14, 0.16, 'bandpass', 400, 1200, 0.9); };
S.plasma_hit = () => { noise(0.18, 0.3, 'bandpass', 1200, 300, 1.2, { wet: 0.4 }); tone('sine', 500, 100, 0.2, 0.22); };
S.door = () => { tone('sawtooth', 70, 90, 1.1, 0.16, { lp: 500 }); noise(1.0, 0.16, 'bandpass', 300, 500, 2, { wet: 0.3 }); tone('sine', 60, 30, 0.3, 0.6, { delay: 1.0 }); noise(0.2, 0.4, 'lowpass', 600, 150, 0.7, { delay: 1.0 }); };
S.door_lock = () => { tone('square', 200, 150, 0.08, 0.14, { lp: 900 }); tone('square', 200, 150, 0.08, 0.14, { delay: 0.12, lp: 900 }); };
S.beep = () => { tone('square', 880, 880, 0.06, 0.09, { lp: 3000 }); };
S.ui_move = () => { tone('square', 720, 720, 0.03, 0.06, { lp: 2600 }); };
S.ui_select = () => { tone('square', 640, 900, 0.07, 0.09, { lp: 3000 }); };
S.ui_back = () => { tone('square', 500, 340, 0.07, 0.08, { lp: 2600 }); };
S.pipboy_on = () => { tone('square', 200, 900, 0.18, 0.08, { lp: 2600 }); noise(0.2, 0.1, 'bandpass', 1500, 4000, 1); tone('sine', 60, 60, 0.25, 0.3); };
S.pipboy_off = () => { tone('square', 800, 160, 0.16, 0.08, { lp: 2400 }); };
S.hack_ok = () => { [500, 750, 1000].forEach((f, i) => tone('square', f, f, 0.08, 0.08, { delay: i * 0.07, lp: 3000 })); };
S.hack_bad = () => { tone('sawtooth', 160, 110, 0.3, 0.14, { lp: 900 }); };
S.key = () => { tone('square', 1200 + Math.random() * 400, 1000, 0.025, 0.05, { lp: 4000 }); };
S.alarm = () => { for (let i = 0; i < 3; i++) { tone('square', 660, 660, 0.18, 0.1, { delay: i * 0.4, lp: 2000 }); tone('square', 880, 880, 0.18, 0.1, { delay: i * 0.4 + 0.2, lp: 2000 }); } };
S.robot_alert = () => { tone('square', 1200, 1200, 0.06, 0.09, { lp: 3000 }); tone('square', 1600, 1600, 0.06, 0.09, { delay: 0.09, lp: 3000 }); };
S.servo = () => { tone('sawtooth', 300, 500, 0.12, 0.05, { lp: 1600 }); };
S.growl = () => { tone('sawtooth', 90, 60, 0.5, 0.2, { lp: 500, vib: [24, 12], wet: 0.3 }); noise(0.5, 0.2, 'bandpass', 400, 200, 2, { wet: 0.2 }); };
S.roar = () => { tone('sawtooth', 120, 55, 1.4, 0.3, { lp: 700, vib: [30, 20], wet: 0.6 }); noise(1.3, 0.3, 'bandpass', 500, 150, 1.5, { wet: 0.6 }); tone('sawtooth', 180, 80, 1.2, 0.15, { lp: 900, vib: [22, 10] }); };
S.screech = () => { tone('sawtooth', 900, 1500, 0.35, 0.14, { lp: 3000, vib: [40, 200], wet: 0.4 }); noise(0.3, 0.14, 'bandpass', 2500, 1500, 3); };
S.squelch = () => { noise(0.12, 0.3, 'bandpass', 500, 250, 1.5); tone('sine', 250, 90, 0.12, 0.2); };
S.buzz = () => { if (!limited('buzz', 0.2)) return; tone('sawtooth', 160, 150, 0.15, 0.03, { lp: 700, vib: [60, 25] }); };
S.zap = () => { noise(0.12, 0.25, 'bandpass', 3000, 1000, 2); tone('sawtooth', 120, 90, 0.12, 0.1); };
S.terminal_open = () => { tone('sine', 300, 600, 0.12, 0.1); tone('sine', 600, 900, 0.1, 0.1, { delay: 0.1 }); };
S.rest = () => { [261, 329, 392].forEach((f, i) => tone('sine', f, f, 1.3, 0.1, { delay: i * 0.25, wet: 0.7, atk: 0.1 })); };
S.save = () => { tone('sine', 880, 880, 0.12, 0.1, { wet: 0.4 }); tone('sine', 1320, 1320, 0.18, 0.1, { delay: 0.1, wet: 0.4 }); };
S.notify = () => { tone('sine', 880, 880, 0.1, 0.1); tone('sine', 1174, 1174, 0.14, 0.1, { delay: 0.08 }); };
S.geiger = () => { noise(0.006, 0.28, 'bandpass', 3800 + Math.random() * 1500, 2500, 1.4); };
S.boss = () => { tone('sawtooth', 55, 45, 2.2, 0.3, { lp: 400, wet: 0.7, atk: 0.3 }); tone('sawtooth', 82, 70, 2.2, 0.2, { lp: 500, wet: 0.7, atk: 0.3 }); noise(1.6, 0.25, 'lowpass', 600, 100, 0.6, { wet: 0.8, atk: 0.4 }); };
S.thud = () => { noise(0.12, 0.5, 'lowpass', 500, 100, 0.7); tone('sine', 80, 35, 0.2, 0.6); };
S.elevator = () => { tone('sawtooth', 60, 60, 0.4, 0.09, { lp: 300 }); };
S.drip = () => { tone('sine', 1500, 900, 0.08, 0.05, { wet: 0.8 }); };
S.shield = () => { tone('sine', 400, 1200, 0.3, 0.12, { wet: 0.5, vib: [20, 30] }); };

A.play = function (name, o) {
  if (!ctx || !A.ready || A.muted || ctx.state !== 'running') { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
  const f = S[name]; if (!f) return;
  // limit polyphony for spammy sounds
  const now = ctx.currentTime; const n = active[name] || 0; if (n > 6) return; active[name] = n + 1; setTimeout(() => { active[name]--; }, 120);
  try { f(o); } catch (e) { /* audio must never break the game */ }
};

// ---------------------------------------------------------------- geiger
let geigerT = 0;
A.updateGeiger = function (dt, rate) {   // rate = clicks/sec
  if (!ctx || A.muted || rate <= 0) return; geigerT -= dt;
  if (geigerT <= 0) { S.geiger(); geigerT = -Math.log(1 - Math.random()) / rate * 1.0; }
};

// ---------------------------------------------------------------- ambient music (generative)
const TRACKS = {};
function drone(freq, type, vol, lp, lfoRate, lfoDepth, detune) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = type || 'sawtooth'; o.frequency.value = freq; o.detune.value = detune || 0;
  f.type = 'lowpass'; f.frequency.value = lp || 300; g.gain.value = vol; o.connect(f); f.connect(g); g.connect(musG); o.start();
  let l = null;
  if (lfoRate) { l = ctx.createOscillator(); const lg = ctx.createGain(); l.frequency.value = lfoRate; lg.gain.value = lfoDepth || lp * 0.4; l.connect(lg); lg.connect(f.frequency); l.start(); }
  return { stop() { const t = ctx.currentTime; g.gain.setTargetAtTime(0, t, 0.6); o.stop(t + 3); if (l) l.stop(t + 3); } };
}
function windNoise(vol, lp) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = lp || 500; f.Q.value = 0.6; g.gain.value = vol;
  const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.11; lg.gain.value = (lp || 500) * 0.5; l.connect(lg); lg.connect(f.frequency); l.start();
  const l2 = ctx.createOscillator(), lg2 = ctx.createGain(); l2.frequency.value = 0.07; lg2.gain.value = vol * 0.6; l2.connect(lg2); lg2.connect(g.gain); l2.start();
  s.connect(f); f.connect(g); g.connect(musG); s.start();
  return { stop() { const t = ctx.currentTime; g.gain.setTargetAtTime(0, t, 0.5); s.stop(t + 3); l.stop(t + 3); l2.stop(t + 3); } };
}
function mnote(freq, dur, vol, type, lp, wet) {
  const t = ctx.currentTime; const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = type || 'triangle'; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.value = lp || 1600;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(f); f.connect(g); g.connect(musG);
  const s = ctx.createGain(); s.gain.value = wet === undefined ? 0.7 : wet; g.connect(s); s.connect(verbSend); o.start(t); o.stop(t + dur + 0.1);
}
const PENT = [0, 3, 5, 7, 10];   // minor pentatonic
function pent(root, deg, oct) { const n = PENT[((deg % 5) + 5) % 5] + 12 * (Math.floor(deg / 5) + (oct || 0)); return root * Math.pow(2, n / 12); }

TRACKS.vault = { init() { return [drone(55, 'sawtooth', 0.05, 220, 0.05, 90), drone(82.4, 'sine', 0.06, 300), drone(110.5, 'triangle', 0.02, 260, 0.03, 60), windNoise(0.018, 220)]; }, ev(t) { if (Math.random() < 0.28) mnote(pent(220, Math.floor(Math.random() * 5), 1), 3.5, 0.045, 'sine', 1400, 1.0); if (Math.random() < 0.15) S.drip(); } };
TRACKS.wasteland = { init() { return [windNoise(0.06, 700), drone(73.4, 'sine', 0.05, 240), drone(110, 'triangle', 0.02, 300, 0.04, 80)]; }, ev(t) { if (Math.random() < 0.5) { const d = Math.floor(Math.random() * 5); mnote(pent(146.8, d, Math.random() < 0.4 ? 1 : 0), 2.6, 0.075, 'triangle', 1500, 0.8); if (Math.random() < 0.4) setTimeout(() => A.track && mnote(pent(146.8, d + 2, 0), 2.4, 0.05, 'triangle', 1300, 0.8), 500 + Math.random() * 400); } } };
TRACKS.rustyard = { init() { return [drone(49, 'sawtooth', 0.05, 200, 0.06, 80), windNoise(0.05, 900), drone(73.4, 'square', 0.015, 180, 0.09, 60)]; }, ev(t) { if (Math.random() < 0.3) { mnote(pent(98, Math.floor(Math.random() * 5), 0), 2.0, 0.06, 'sawtooth', 700, 0.6); } if (Math.random() < 0.18) { tone('triangle', 400 + Math.random() * 200, 380, 0.7, 0.06, { wet: 0.9, lp: 2500 }); } } };
TRACKS.metro = { init() { return [drone(58, 'sawtooth', 0.045, 200, 0.05, 80), drone(61.7, 'sawtooth', 0.03, 200, 0.07, 60), windNoise(0.03, 300)]; }, ev(t) { if (Math.random() < 0.3) S.drip(); if (Math.random() < 0.12) { tone('sine', 300 + Math.random() * 200, 200, 2.5, 0.05, { wet: 1, lp: 1200 }); } if (Math.random() < 0.15) mnote(pent(116.5, Math.floor(Math.random() * 5), 1), 3, 0.05, 'sine', 1200, 1); } };
TRACKS.plant = { init() { return [drone(60, 'sawtooth', 0.045, 300, 8, 0.03 * 300), drone(120, 'square', 0.012, 250, 0.2, 100), windNoise(0.03, 600), drone(45, 'sine', 0.07, 200)]; }, ev(t) { if (Math.random() < 0.25) mnote(pent(174.6, Math.floor(Math.random() * 5), 0), 2.6, 0.05, 'square', 900, 0.9); } };
TRACKS.deep = { init() { return [drone(65.4, 'sine', 0.07, 300), drone(98, 'sine', 0.05, 300, 0.05, 40), drone(130.8, 'triangle', 0.02, 500, 0.04, 60), windNoise(0.015, 1200)]; }, ev(t) { if (Math.random() < 0.4) mnote(pent(261.6, Math.floor(Math.random() * 5), Math.floor(Math.random() * 2)), 4, 0.05, 'sine', 3000, 1.2); } };
TRACKS.title = { init() { return [drone(55, 'sawtooth', 0.05, 250, 0.04, 100), drone(82.4, 'sine', 0.06, 300), windNoise(0.04, 500)]; }, ev(t) { if (Math.random() < 0.6) mnote(pent(146.8, Math.floor(Math.random() * 6), 0), 3, 0.085, 'triangle', 1400, 1.0); } };
TRACKS.boss = { init() { return [drone(55, 'sawtooth', 0.06, 260, 0.2, 100), drone(82.4, 'sawtooth', 0.04, 240, 0.1, 60), drone(41.2, 'sine', 0.1, 150)]; }, evFast: true,
  ev(t, beat) { const b = beat % 8; if (b % 2 === 0) { tone('sine', 120, 38, 0.22, 0.5); noise(0.05, 0.16, 'lowpass', 800, 300, 1); } if (b === 4 || b === 0) noise(0.09, 0.12, 'highpass', 5000, 3000, 0.6); if (b % 4 === 3) mnote(pent(55, [0, 2, 3, 1][Math.floor(beat / 4) % 4], 1), 0.4, 0.09, 'sawtooth', 500, 0.3); if (b === 7) mnote(pent(110, 4, 1), 0.5, 0.05, 'sawtooth', 700, 0.4); } };
TRACKS.silence = { init() { return []; }, ev() { } };

let cur = null, evTimer = null, beat = 0;
A.setTrack = function (name) {
  if (!ctx || !A.ready) { A.pendingTrack = name; return; }
  if (A.track === name) return;
  if (cur) cur.forEach((d) => d.stop()); cur = null; if (evTimer) clearInterval(evTimer);
  A.track = name; const tr = TRACKS[name] || TRACKS.silence;
  try { cur = tr.init(); } catch (e) { cur = []; }
  beat = 0;
  const period = tr.evFast ? 260 : 2400;
  evTimer = setInterval(() => { if (!ctx || ctx.state !== 'running' || A.muted) return; try { tr.ev(ctx.currentTime, beat++); } catch (e) { } }, period);
};
A.stopMusic = function () { A.setTrack('silence'); };

})();
