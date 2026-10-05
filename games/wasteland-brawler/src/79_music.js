// RUSTFIST soundtrack (SONGS) and story cards (STORY). Module prefix: mus_
//
// Everything lives inside one IIFE. The module only adds keys to shared registries:
//   Instruments: pulse, tri, dist, sawbass, strings, kit, drone, wind, siren, fx
//   SONGS: title, story, stage1, bikerun, stage2, stage3, boss, finalboss, finalboss2, finalboss3,
//          fanfare, gameover, ending (+ an `elevator` alias of stage3 for the old required-key list)
//   STORY: intro (2 cards), between[0], between[1], ending. STORY is declared by 80_game.js, which is
//          concatenated after this file, so the cards are registered once the whole script has run.
//
// Token grammar of this module's instruments (the engine sequencer hands tokens over untouched):
//   'A4'           a note lasting tr.hold steps (default 1 sixteenth)
//   'A4:6'         a note held 6 sixteenth steps; mus seq() builds these from '-' ties (DESIGN 11.1)
//   'A3+C4+E4:16'  a chord (pulse, tri, strings)
//   kit letters    k kick, s snare, h hat, H accented hat, r 32nd hats, o open hat, c crash, t tom,
//                  d hand drum, D hand slap, m clank, n industrial noise tick, z shaker, Z shaker accent
//   'W:32' wind voice, 'S:16' siren voice, 'close:24' / 'open' moves a named bus lowpass (fx)
(function mus_module() {
  'use strict';
  try {
    // =====================================================================================
    // Pattern helpers
    // =====================================================================================
    const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const midiOf = n => { const f = noteFreq(n); return f ? Math.round(69 + 12 * Math.log2(f / 440)) : null; };
    const nameOf = m => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
    const tpTok = (tok, k) => {
      if (tok === '.' || tok === '-') return tok;
      const i = tok.indexOf(':');
      const body = i < 0 ? tok : tok.slice(0, i), len = i < 0 ? '' : tok.slice(i);
      return body.split('+').map(n => { const m = midiOf(n); return m == null ? n : nameOf(m + k); }).join('+') + len;
    };
    // transpose every note token of a pattern string
    const tp = (str, k) => str.trim().split(/\s+/).map(t => tpTok(t, k)).join(' ');
    // 16-step bar with an overflow check (the engine's bar() silently drops extra steps)
    const B = s => {
      const n = s.trim().split(/\s+/).length;
      if (n > 16) console.error('[music] bar has ' + n + ' steps: ' + s);
      return bar(s);
    };
    // 8 eighth-note tokens -> 16 steps (legato ties the 2nd sixteenth; staccato rests it)
    const e8 = (str, legato = true) => str.trim().split(/\s+/)
      .map(t => (t === '-' ? '- -' : t === '.' ? '. .' : legato ? t + ' -' : t + ' .')).join(' ');
    // 4 quarter-note tokens -> 16 steps
    const q4 = str => str.trim().split(/\s+/)
      .map(t => (t === '-' ? '- - - -' : t === '.' ? '. . . .' : t + ' - - -')).join(' ');
    const W1 = n => n + ' -'.repeat(15);                     // whole note
    const R = '.';                                            // empty bar
    const rep = (arr, n) => { let o = []; for (let i = 0; i < n; i++) o = o.concat(arr); return o; };
    // Build a track's bars from 16-step strings (or token arrays whose length is a multiple of 16).
    // '-' ties extend the previous note, across bar lines too; the result uses 'NOTE:steps' tokens.
    function seq(list) {
      const flat = [];
      for (const s of list) flat.push(...(Array.isArray(s) ? s : B(s)));
      const out = flat.map(t => (t === '-' ? '.' : t));
      for (let i = 0; i < flat.length; i++) {
        const t = flat[i];
        if (t === '.' || t === '-') continue;
        let n = 1;
        while (i + n < flat.length && flat[i + n] === '-') n++;
        if (n > 1) out[i] = t + ':' + n;
      }
      const bars = [];
      for (let i = 0; i < out.length; i += 16) {
        const b = out.slice(i, i + 16);
        while (b.length < 16) b.push('.');
        bars.push(b);
      }
      return bars;
    }
    const bars = list => list.map(s => B(s));                 // plain bars (no tie processing)
    const cyc = (notes, steps) => { const o = []; for (let i = 0; i < steps; i++) o.push(notes[i % notes.length]); return o; };

    // =====================================================================================
    // Synthesis helpers
    // =====================================================================================
    const RES = new WeakMap();                                // per-AudioContext shared resources
    function res(c) {
      let r = RES.get(c);
      if (r) return r;
      r = {};
      // 25% pulse wave (DESIGN 11.1 LEAD)
      const N = 48, re = new Float32Array(N), im = new Float32Array(N);
      for (let n = 1; n < N; n++) {
        re[n] = Math.sin(2 * Math.PI * n * 0.25) / (n * Math.PI);
        im[n] = 2 * Math.pow(Math.sin(Math.PI * n * 0.25), 2) / (n * Math.PI);
      }
      r.pulse = c.createPeriodicWave(re, im);
      // DIST soft clipper, k = 20
      const k = 20, curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
      r.curve = curve;
      // 4 s of noise for wind (longer than the engine's 1 s buffer, so the loop does not pulse)
      const len = Math.floor(c.sampleRate * 4);
      r.wind = c.createBuffer(1, len, c.sampleRate);
      const d = r.wind.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      RES.set(c, r);
      return r;
    }

    // Named buses with their own lowpass (the game over track closes its filter).
    const BUSES = new Map();
    function busIn(a, name) {
      if (!name) return a.musicBus;
      let b = BUSES.get(name);
      if (!b || b.ctx !== a.ctx) {
        const c = a.ctx;
        b = { ctx: c, input: c.createGain(), lp: c.createBiquadFilter() };
        b.lp.type = 'lowpass'; b.lp.frequency.value = 20000; b.lp.Q.value = 0.8;
        b.input.connect(b.lp); b.lp.connect(a.musicBus);
        BUSES.set(name, b);
      }
      return b.input;
    }
    // Per-track effect chain (echo), cached on the track object per AudioContext.
    function chainOf(a, tr, sd) {
      const c = a.ctx;
      if (tr._mus && tr._mus.ctx === c) return tr._mus.input;
      const out = busIn(a, tr.bus);
      const input = c.createGain();
      input.connect(out);
      if (tr.echo) {
        const e = tr.echo;
        const d = c.createDelay(2), fb = c.createGain(), wet = c.createGain(), damp = c.createBiquadFilter();
        d.delayTime.value = e.time || sd * (e.steps || 3);
        fb.gain.value = e.fb != null ? e.fb : 0.3;
        wet.gain.value = e.mix != null ? e.mix : 0.6;
        damp.type = 'lowpass'; damp.frequency.value = e.damp || 3000;
        input.connect(d); d.connect(damp); damp.connect(fb); fb.connect(d); damp.connect(wet); wet.connect(out);
      }
      tr._mus = { ctx: c, input };
      return input;
    }
    // DESIGN 11.1 note envelope: 5 ms attack, decay to 60% over 80 ms, hold, 40 ms release.
    function adsr(p, t, v, dur, rel = 0.04, sus = 0.6, atk = 0.005, dec = 0.08) {
      p.setValueAtTime(0, t);
      p.linearRampToValueAtTime(v, t + atk);
      const e = t + Math.max(dur, atk + 0.002);
      if (e > t + atk + dec) { p.exponentialRampToValueAtTime(v * sus, t + atk + dec); p.setValueAtTime(v * sus, e); }
      else p.linearRampToValueAtTime(v * (1 - (1 - sus) * (e - t - atk) / dec), e);
      p.linearRampToValueAtTime(0, e + rel);
      return e + rel;
    }
    function parse(tok, tr) {
      const i = tok.indexOf(':');
      return i < 0 ? { body: tok, steps: tr.hold || 1 } : { body: tok.slice(0, i), steps: parseFloat(tok.slice(i + 1)) || 1 };
    }

    // Long voices (pads, drones, wind, whole notes) fade out when a different song starts, so a
    // held chord never bleeds into the next screen's music. A song that simply ends lets them ring.
    // Each long voice plays through its own fader node, so the fade never fights its envelope.
    const live = [];
    let watchTimer = null;
    const LONG = 0.45;
    function fader(a, dest, long) {
      if (!long || a !== Sound) return dest;
      const k = a.ctx.createGain();
      k.connect(dest);
      return k;
    }
    function watch(a, k, srcs, end, dest) {
      if (a !== Sound || !Sound.song || k === dest) return;
      live.push({ k, srcs, end, song: Sound.song, step: Sound.step });
      if (!watchTimer) watchTimer = setInterval(sweep, 60);
    }
    function sweep() {
      const c = Sound.ctx, now = c ? c.currentTime : 0;
      for (let i = live.length - 1; i >= 0; i--) {
        const v = live[i];
        const replaced = Sound.song && (Sound.song !== v.song || Sound.step < v.step);
        if (replaced && v.end > now && c) {
          try { v.k.gain.setValueAtTime(1, now); v.k.gain.linearRampToValueAtTime(0, now + 0.12); } catch (e) { /* ignore */ }
          for (const s of v.srcs) { try { s.stop(now + 0.15); } catch (e) { /* already stopped */ } }
        }
        if (replaced || v.end < now) live.splice(i, 1);
      }
      if (!live.length) { clearInterval(watchTimer); watchTimer = null; }
    }

    // An instrument that throws inside the sequencer's setInterval would stall the music forever;
    // contain it and report once.
    const failed = {};
    const safe = (name, fn) => function (a, tok, t, sd, tr) {
      try { fn(a, tok, t, sd, tr); } catch (e) {
        if (!failed[name]) { failed[name] = 1; console.error('[music] ' + name + ' failed on "' + tok + '": ' + e.message); }
      }
    };

    function noiseHit(a, dest, t, dur, vol, type, f, q, f1, atk = 0.001, buf) {
      const c = a.ctx, s = c.createBufferSource();
      s.buffer = buf || a.noiseBuf; s.loop = true;
      const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
      if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(fl); fl.connect(g); g.connect(dest);
      s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.02);
    }
    function oscHit(a, dest, t, type, f0, f1, fdur, vol, dur) {
      const c = a.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + fdur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
    }

    // =====================================================================================
    // Instruments (DESIGN 11.1)
    // =====================================================================================
    // Tonal voice shared by LEAD (square / 25% pulse / doubled saw) and TRI.
    // Track fields: vol, wave, cutoff, gate, rel, sus, dbl (cents, second detuned oscillator),
    // vib [rate Hz, depth cents, delay s], vibHz [rate Hz, depth Hz, delay s], echo, bus.
    function toneVoice(a, tok, t, sd, tr, waveDefault) {
      const { body, steps } = parse(tok, tr);
      const freqs = body.split('+').map(n => noteFreq(n)).filter(Boolean);
      if (!freqs.length) return;
      const c = a.ctx, dest = chainOf(a, tr, sd);
      const dur = Math.max(0.03, steps * sd * (tr.gate || 0.9));
      const wave = tr.wave || waveDefault;
      const dets = tr.dbl ? [0, tr.dbl] : [0];
      const vol = (tr.vol || 0.12) / Math.sqrt(freqs.length * dets.length);
      const out = fader(a, dest, dur > LONG);
      const g = c.createGain(), fl = c.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.value = tr.cutoff || 5000; fl.Q.value = 0.6;
      fl.connect(g); g.connect(out);
      const end = adsr(g.gain, t, vol, dur, tr.rel || 0.04, tr.sus || 0.6);
      const vib = tr.vibHz || tr.vib;
      let lg = null;
      const srcs = [];
      if (vib && dur > vib[2] + 0.06) {
        const lfo = c.createOscillator(); lfo.frequency.value = vib[0];
        lg = c.createGain();
        lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + vib[2]);
        lg.gain.linearRampToValueAtTime(vib[1], t + vib[2] + 0.12);
        lfo.connect(lg); lfo.start(t); lfo.stop(end + 0.03);
        srcs.push(lfo);
      }
      for (const f of freqs) for (const det of dets) {
        const o = c.createOscillator();
        if (wave === 'pulse25') o.setPeriodicWave(res(c).pulse); else o.type = wave;
        o.frequency.value = f; o.detune.value = det;
        if (lg) lg.connect(tr.vibHz ? o.frequency : o.detune);
        o.connect(fl); o.start(t); o.stop(end + 0.03);
        srcs.push(o);
      }
      watch(a, out, srcs, end, dest);
    }
    Instruments.pulse = safe('pulse', (a, tok, t, sd, tr) => toneVoice(a, tok, t, sd, tr, 'square'));
    Instruments.tri = safe('tri', (a, tok, t, sd, tr) => toneVoice(a, tok, t, sd, tr, 'triangle'));

    // BASS: sawtooth (+ sine body) -> lowpass 900 Hz with a short filter blip.
    Instruments.sawbass = safe('sawbass', (a, tok, t, sd, tr) => {
      const { body, steps } = parse(tok, tr);
      const f = noteFreq(body);
      if (!f) return;
      const c = a.ctx, dest = chainOf(a, tr, sd);
      const dur = Math.max(0.04, steps * sd * (tr.gate || 0.92));
      const o = c.createOscillator(), sub = c.createOscillator(), sg = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      sub.type = 'sine'; sub.frequency.value = f; sg.gain.value = tr.sub != null ? tr.sub : 0.45;
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = tr.q || 3;
      const cut = tr.cutoff || 900;
      fl.frequency.setValueAtTime(cut * 2, t); fl.frequency.exponentialRampToValueAtTime(cut, t + (tr.fenv || 0.09));
      const g = c.createGain(), out = fader(a, dest, dur > LONG);
      o.connect(fl); fl.connect(g); sub.connect(sg); sg.connect(g); g.connect(out);
      const end = adsr(g.gain, t, tr.vol || 0.3, dur, tr.rel || 0.05, tr.sus || 0.6);
      o.start(t); sub.start(t); o.stop(end + 0.02); sub.stop(end + 0.02);
      watch(a, out, [o, sub], end, dest);
    });

    // DIST: sawtooth -> WaveShaper (k = 20) -> lowpass 1.2 kHz, plus a clean sine for weight.
    Instruments.dist = safe('dist', (a, tok, t, sd, tr) => {
      const { body, steps } = parse(tok, tr);
      const f = noteFreq(body);
      if (!f) return;
      const c = a.ctx, dest = chainOf(a, tr, sd);
      const dur = Math.max(0.03, steps * sd * (tr.gate || 0.85));
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const pre = c.createGain(); pre.gain.value = tr.drive || 0.9;
      const ws = c.createWaveShaper(); ws.curve = res(c).curve; ws.oversample = '2x';
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.2;
      const cut = tr.cutoff || 1200;
      fl.frequency.setValueAtTime(cut * 1.7, t); fl.frequency.exponentialRampToValueAtTime(cut, t + 0.06);
      const sub = c.createOscillator(), sg = c.createGain();
      sub.type = 'sine'; sub.frequency.value = f; sg.gain.value = tr.sub != null ? tr.sub : 0.7;
      const g = c.createGain();
      o.connect(pre); pre.connect(ws); ws.connect(fl); fl.connect(g); sub.connect(sg); sg.connect(g); g.connect(dest);
      const end = adsr(g.gain, t, tr.vol || 0.18, dur, 0.03, 0.7);
      o.start(t); sub.start(t); o.stop(end + 0.02); sub.stop(end + 0.02);
    });

    // PAD: two detuned sawtooths per note -> lowpass 1.2 kHz, 300 ms attack, held for the token length.
    Instruments.strings = safe('strings', (a, tok, t, sd, tr) => {
      const { body, steps } = parse(tok, tr);
      const freqs = body.split('+').map(n => noteFreq(n)).filter(Boolean);
      if (!freqs.length) return;
      const c = a.ctx, dest = chainOf(a, tr, sd);
      const dur = steps * sd, atk = Math.min(tr.atk || 0.3, dur * 0.5), rel = tr.rel || 0.35;
      const g = c.createGain(), fl = c.createBiquadFilter(), out = fader(a, dest, dur > LONG);
      fl.type = 'lowpass'; fl.frequency.value = tr.cutoff || 1200; fl.Q.value = 0.5;
      fl.connect(g); g.connect(out);
      const v = tr.vol || 0.03;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + atk);
      g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + rel);
      const srcs = [];
      const det = tr.det || 9;
      for (const f of freqs) for (const d of [-det, det]) {
        const o = c.createOscillator(); o.type = tr.wave || 'sawtooth';
        o.frequency.value = f; o.detune.value = d;
        o.connect(fl); o.start(t); o.stop(t + dur + rel + 0.05);
        srcs.push(o);
      }
      watch(a, out, srcs, t + dur + rel, dest);
    });

    // Drum kit (DESIGN 11.1 KICK, SNARE, HAT, TOM, CLANK, CRASH + extras).
    const KIT = {
      k(a, d, t, v) { oscHit(a, d, t, 'sine', 150, 40, 0.12, 0.85 * v, 0.26); noiseHit(a, d, t, 0.012, 0.22 * v, 'lowpass', 3500, 0.7); },
      s(a, d, t, v) {
        noiseHit(a, d, t, 0.12, 0.42 * v, 'bandpass', 1800, 0.9);
        noiseHit(a, d, t, 0.07, 0.12 * v, 'highpass', 5000, 0.7);
        oscHit(a, d, t, 'triangle', 180, 150, 0.06, 0.32 * v, 0.06);
      },
      h(a, d, t, v) { noiseHit(a, d, t, 0.03, 0.07 * v, 'highpass', 7000, 0.8); },
      H(a, d, t, v) { noiseHit(a, d, t, 0.035, 0.12 * v, 'highpass', 7000, 0.8); },
      r(a, d, t, v, sd) { KIT.h(a, d, t, v); KIT.h(a, d, t + sd / 2, v * 0.75); },
      o(a, d, t, v) { noiseHit(a, d, t, 0.18, 0.08 * v, 'highpass', 6500, 0.8); },
      c(a, d, t, v) { noiseHit(a, d, t, 0.6, 0.16 * v, 'highpass', 4000, 0.6); noiseHit(a, d, t, 1.1, 0.05 * v, 'highpass', 7500, 0.6); },
      t(a, d, t, v) { oscHit(a, d, t, 'sine', 200, 100, 0.2, 0.55 * v, 0.24); },
      d(a, d, t, v) { oscHit(a, d, t, 'sine', 140, 70, 0.2, 0.55 * v, 0.26); noiseHit(a, d, t, 0.025, 0.1 * v, 'bandpass', 800, 1.2); },
      D(a, d, t, v) { oscHit(a, d, t, 'sine', 300, 190, 0.05, 0.28 * v, 0.09); noiseHit(a, d, t, 0.035, 0.18 * v, 'bandpass', 1500, 1.4); },
      m(a, d, t, v) {
        oscHit(a, d, t, 'square', 523, 0, 0, 0.07 * v, 0.08); oscHit(a, d, t, 'square', 740, 0, 0, 0.06 * v, 0.08);
        noiseHit(a, d, t, 0.02, 0.12 * v, 'highpass', 3000, 1);
      },
      n(a, d, t, v) { noiseHit(a, d, t, 0.06, 0.5 * v, 'bandpass', 3200, 8); },
      z(a, d, t, v) { noiseHit(a, d, t, 0.045, 0.04 * v, 'highpass', 5000, 0.7, 0, 0.012); },
      Z(a, d, t, v) { noiseHit(a, d, t, 0.06, 0.065 * v, 'highpass', 5000, 0.7, 0, 0.015); },
    };
    Instruments.kit = safe('kit', (a, tok, t, sd, tr) => {
      const d = chainOf(a, tr, sd), v = tr.vol || 1;
      for (const ch of tok) if (KIT[ch]) KIT[ch](a, d, t, v, sd);
    });

    // TRI drone. Consecutive voices start a whole number of cycles after the previous one and
    // crossfade, so the drone is seamless across bar lines.
    Instruments.drone = safe('drone', (a, tok, t, sd, tr) => {
      const { body, steps } = parse(tok, tr);
      const f = noteFreq(body);
      if (!f) return;
      const c = a.ctx, dest = chainOf(a, tr, sd), dur = steps * sd, X = 0.06, v = tr.vol || 0.1;
      const p = tr._drone;
      const cont = p && p.ctx === c && p.f === f && Math.abs(p.end - t) < 0.02;
      const o = c.createOscillator(), g = c.createGain();
      o.type = tr.wave || 'triangle'; o.frequency.value = f;
      let s = t;
      if (cont) {
        s = Math.max(c.currentTime + 0.005, p.t0 + Math.floor((t - p.t0) * f) / f);
        try {
          p.g.gain.cancelScheduledValues(s); p.g.gain.setValueAtTime(v, s); p.g.gain.linearRampToValueAtTime(0, s + X);
          p.o.stop(s + X + 0.02);
        } catch (e) { /* previous voice already gone */ }
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + X);
      } else {
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + 0.25);
      }
      g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + X);
      const out = fader(a, dest, true);
      o.connect(g); g.connect(out); o.start(s); o.stop(t + dur + X + 0.02);
      tr._drone = { ctx: c, f, t0: s, end: t + dur, g, o };
      watch(a, out, [o], t + dur + X, dest);
    });

    // Wind: noise -> bandpass sweeping f0 +/- f1 on a slow LFO (DESIGN 11.2 title: 300-900 Hz, 0.1 Hz).
    // tr.vol is the gain before the bandpass, which keeps only ~2% of white noise power, so 0.22
    // lands near the spec's 0.06 bed level. Each voice has an equal-power sine window and voices
    // overlap by half, so a token every bar with a two-bar length gives a constant bed.
    Instruments.wind = safe('wind', (a, tok, t, sd, tr) => {
      const { steps } = parse(tok, tr);
      const c = a.ctx, dest = chainOf(a, tr, sd), dur = steps * sd;
      const s = c.createBufferSource(); s.buffer = res(c).wind; s.loop = true;
      const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = tr.q || 1.2;
      const N = 64, fc = new Float32Array(N), gc = new Float32Array(N);
      const f0 = tr.f0 || 600, f1 = tr.f1 || 300, lfo = tr.lfo || 0.1, v = tr.vol || 0.06;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        fc[i] = f0 + f1 * Math.sin(2 * Math.PI * lfo * (t + u * dur));
        gc[i] = v * Math.sin(Math.PI * u);
      }
      fl.frequency.setValueCurveAtTime(fc, t, dur);
      const g = c.createGain(), out = fader(a, dest, true);
      g.gain.value = 0; g.gain.setValueCurveAtTime(gc, t, dur);
      s.connect(fl); fl.connect(g); g.connect(out);
      s.start(t, Math.random() * 3); s.stop(t + dur + 0.03);
      watch(a, out, [s], t + dur, dest);
    });

    // Siren: sine 600 <-> 900 Hz on a 1 Hz LFO (absolute time, so consecutive voices line up), gain 0.06.
    Instruments.siren = safe('siren', (a, tok, t, sd, tr) => {
      const { steps } = parse(tok, tr);
      const c = a.ctx, dest = chainOf(a, tr, sd), dur = steps * sd, X = 0.04;
      const o = c.createOscillator(); o.type = 'sine';
      const N = Math.max(24, Math.ceil((dur + X) * 48)), fc = new Float32Array(N);
      const lo = tr.lo || 600, hi = tr.hi || 900, rate = tr.lfo || 1;
      for (let i = 0; i < N; i++) {
        const ta = t + (i / (N - 1)) * (dur + X);
        fc[i] = (lo + hi) / 2 - (hi - lo) / 2 * Math.cos(2 * Math.PI * rate * ta);
      }
      o.frequency.setValueCurveAtTime(fc, t, dur + X);
      const g = c.createGain(), v = tr.vol || 0.06;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + X);
      g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + X);
      const out = fader(a, dest, true);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + X + 0.02);
      watch(a, out, [o], t + dur + X, dest);
    });

    // fx: moves a named bus's lowpass. 'close:N' sweeps tr.from -> tr.to over N steps; 'open' resets.
    Instruments.fx = safe('fx', (a, tok, t, sd, tr) => {
      const { body, steps } = parse(tok, tr);
      busIn(a, tr.bus);
      const b = BUSES.get(tr.bus);
      if (!b) return;
      const f = b.lp.frequency;
      f.cancelScheduledValues(t);
      if (body === 'close') { f.setValueAtTime(tr.from || 4000, t); f.exponentialRampToValueAtTime(tr.to || 250, t + steps * sd); }
      else f.setValueAtTime(20000, t);
    });

    // =====================================================================================
    // Songs (DESIGN 11.2)
    // =====================================================================================

    // ---- TITLE, "Dust on the Wind": 84 BPM, A minor, 8 bars ----
    const TITLE_MEL = ['A4 C5 E5 D5', 'C5 B4 A4 -', 'F4 A4 C5 B4', 'G4 E4 - -'];
    const TITLE_ECHO = { time: 0.33, fb: 0.35, mix: 0.55, damp: 2600 };
    const titleBass = { inst: 'sawbass', vol: 0.2, cutoff: 650, q: 1.5, fenv: 0.6, sus: 0.75, rel: 0.4, gate: 0.97,
      bars: seq([W1('A2'), W1('F2'), W1('G2'), W1('E2')]) };
    SONGS.title = {
      bpm: 84, length: 8, swing: 0, tracks: [
        { inst: 'tri', vol: 0.22, gate: 0.94, rel: 0.12, vib: [5, 9, 0.3], echo: TITLE_ECHO,
          bars: seq([...TITLE_MEL.map(q4), R, R, R, R]) },
        { inst: 'tri', vol: 0.16, gate: 0.94, rel: 0.12, vib: [5, 9, 0.3], echo: TITLE_ECHO,
          bars: seq([R, R, R, R, ...TITLE_MEL.map(s => q4(tp(s, 12)))]) },
        titleBass,
        { inst: 'wind', vol: 0.22, bars: bars(['W:32']) },
        { inst: 'strings', vol: 0.022, cutoff: 900, atk: 0.9, rel: 0.9,
          bars: bars([R, R, R, R, 'A3+C4+E4:16', 'F3+A3+C4:16', 'G3+B3+D4:16', 'E3+G3+B3:16']) },
      ],
    };

    // ---- STORY: a sparse "Dust on the Wind" under the story cards ----
    SONGS.story = {
      bpm: 84, length: 8, swing: 0, tracks: [
        { inst: 'tri', vol: 0.17, gate: 0.9, rel: 0.15, vib: [5, 9, 0.3], echo: { time: 0.33, fb: 0.45, mix: 0.7, damp: 2000 },
          bars: seq(['A4 . E5 .', 'C5 . A4 -', '. . . .', '. . . .', '. . . .', 'F4 A4 C5 .', 'B4 . G4 .', 'E4 - - -'].map(q4)) },
        { inst: 'sawbass', vol: 0.17, cutoff: 520, q: 1.2, fenv: 0.8, sus: 0.75, rel: 0.5, gate: 0.97,
          bars: seq([W1('A2'), W1('F2'), W1('G2'), W1('E2')]) },
        { inst: 'wind', vol: 0.26, q: 1.1, bars: bars(['W:32']) },
      ],
    };

    // ---- STAGE 1, "Rust Row": 132 BPM, E minor, Em-C-D-B (2 bars each); 2nd pass up an octave + harmony ----
    const S1_LEAD = [
      'E4 G4 A4 B4 D5 - B4 -', 'A4 G4 E4 - - - - -', 'E4 G4 A4 B4 C5 - B4 -', 'G4 E4 G4 - - - - -',
      'F#4 A4 B4 D5 E5 - D5 -', 'B4 A4 F#4 - - - - -', 'D#4 F#4 B4 D#5 F#5 - E5 D#5', 'B4 - - - F#4 - D#4 -',
    ];
    // a diatonic third under the octave-up lead (chord tones where a third would clash on a held note)
    const S1_HARM = [
      'B4 E5 F#5 G5 B5 - G5 -', 'F#5 E5 B4 - - - - -', 'C5 E5 F#5 G5 A5 - G5 -', 'E5 C5 E5 - - - - -',
      'D5 F#5 G5 B5 C6 - B5 -', 'G5 F#5 D5 - - - - -', 'B4 D#5 F#5 B5 D#6 - C#6 B5', 'F#5 - - - D#5 - B4 -',
    ];
    const pump = (lo, hi) => (lo + ' . ' + hi + ' . ').repeat(4).trim();
    const S1_BASS = [pump('E2', 'E3'), pump('E2', 'E3'), pump('C2', 'C3'), pump('C2', 'C3'),
      pump('D2', 'D3'), pump('D2', 'D3'), pump('B1', 'B2'), 'B1 . B2 . B1 . B2 . B1 . B2 . D#2 . F#2 .'];
    const s1Bass = { inst: 'sawbass', vol: 0.24, cutoff: 900, hold: 1.6, gate: 0.9, bars: bars(S1_BASS) };
    const S1D = 'kH h h h sH h kh h kH h h h sH h h h';
    const S1D_CR = 'kcH h h h sH h kh h kH h h h sH h h h';
    const S1D_F1 = 'kH h h h sH h kh h kH h s h s s t t';
    const S1D_F2 = 'kH h h h sH h kh h kH h h h s s s s';
    const s1Drums = { inst: 'kit', vol: 1, bars: bars([S1D_CR, S1D, S1D, S1D, S1D, S1D, S1D, S1D_F1, S1D_CR, S1D, S1D, S1D, S1D, S1D, S1D, S1D_F2]) };
    const S1_PAD = ['E3+G3+B3:32', R, 'C3+E3+G3:32', R, 'D3+F#3+A3:32', R, 'B2+D#3+F#3:32', R];
    SONGS.stage1 = {
      bpm: 132, length: 16, swing: 0, tracks: [
        { inst: 'pulse', wave: 'pulse25', vol: 0.14, gate: 0.88, cutoff: 4200, vib: [6, 12, 0.18],
          bars: seq([...S1_LEAD.map(s => e8(s)), ...rep([R], 8)]) },
        { inst: 'pulse', wave: 'pulse25', vol: 0.12, gate: 0.88, cutoff: 3600, vib: [6, 12, 0.18],
          bars: seq([...rep([R], 8), ...S1_LEAD.map(s => e8(tp(s, 12)))]) },
        { inst: 'pulse', wave: 'square', vol: 0.07, gate: 0.88, cutoff: 2600,
          bars: seq([...rep([R], 8), ...S1_HARM.map(s => e8(s))]) },
        s1Bass,
        { inst: 'strings', vol: 0.018, cutoff: 1000, bars: bars(rep(S1_PAD, 2)) },
        s1Drums,
      ],
    };

    // ---- BIKER RUN: the Rust Row variant with the lead and hats muted (bass and kick only) ----
    SONGS.bikerun = {
      bpm: 132, length: 8, swing: 0, tracks: [
        s1Bass,
        { inst: 'kit', vol: 1.1, bars: bars(['k . . . . . k . k . . . . . . .']) },
      ],
    };

    // ---- STAGE 2, "Glass Flats": 112 BPM, D Phrygian dominant, 4-bar loop (played twice, 2nd with a
    // high echo double) ----
    const S2_LEAD = ['D4 Eb4 F#4 G4 A4 Bb4 A4 G4', 'F#4 Eb4 D4 - - - - -', 'A4 Bb4 C5 Bb4 A4 G4 F#4 G4', 'A4 - - - Eb4 - D4 -'];
    const S2D = 'dz z Z dz z z dZ z dz z Z z dz z Z z';
    const S2D_B = 'dz z Z dz z z dZ z dz z DZ z dz z Z z';
    const S2D_F = 'dz z Z dz z z dZ z dz z Z z dz Dz DZ Dz';
    SONGS.stage2 = {
      bpm: 112, length: 8, swing: 0, tracks: [
        { inst: 'drone', vol: 0.11, bars: bars(['D2:16']) },
        { inst: 'pulse', wave: 'square', vol: 0.11, cutoff: 900, hold: 1.5, gate: 0.9, bars: bars([e8('D2 D2 A2 D2 D2 Eb2 D2 A1', false)]) },
        { inst: 'tri', vol: 0.27, gate: 0.95, rel: 0.06, vibHz: [5.5, 4, 0.12], bars: seq(rep(S2_LEAD.map(s => e8(s)), 2)) },
        { inst: 'pulse', wave: 'pulse25', vol: 0.035, gate: 0.85, cutoff: 2800, vibHz: [5.5, 8, 0.12], echo: { steps: 3, fb: 0.3, mix: 0.6 },
          bars: seq([R, R, R, R, ...S2_LEAD.map(s => e8(tp(s, 12)))]) },
        { inst: 'kit', vol: 1.15, bars: bars([S2D, S2D, S2D, S2D_F, S2D, S2D_B, S2D, S2D_F]) },
      ],
    };

    // ---- STAGE 3, "Thirsty Dam": 144 BPM, C minor, industrial, Cm-Ab-Bb-G (2 bars each) ----
    const S3_BASS = [
      'C2 C2 C3 C2 C2 C2 Eb2 C2 C2 C2 C3 C2 G1 G1 Bb1 C2',
      'Ab1 Ab1 Ab2 Ab1 Ab1 Ab1 C2 Ab1 Ab1 Ab1 Ab2 Ab1 Eb1 Eb1 G1 Ab1',
      'Bb1 Bb1 Bb2 Bb1 Bb1 Bb1 D2 Bb1 Bb1 Bb1 Bb2 Bb1 F1 F1 Ab1 Bb1',
      'G1 G1 G2 G1 G1 G1 B1 G1 G1 G1 G2 G1 D1 D1 F1 G1',
    ];
    const S3_ARP = [['C4', 'Eb4', 'G4', 'C5', 'G4', 'Eb4'], ['Ab3', 'C4', 'Eb4', 'Ab4', 'Eb4', 'C4'],
      ['Bb3', 'D4', 'F4', 'Bb4', 'F4', 'D4'], ['G3', 'B3', 'D4', 'G4', 'D4', 'B3']];
    const s3ArpBars = seq(S3_ARP.map(n => cyc(n, 32)));
    const S3D = 'k . n . ks . n . k . n . ksm . n .';
    const S3D_CR = 'kc . n . ks . n . k . n . ksm . n .';
    const S3D2 = 'k h n h ks h n h k h n h ksm h n h';
    const S3D2_CR = 'kc h n h ks h n h k h n h ksm h n h';
    const S3D_F = 'k h n h ks h n h k h n h ksm s s s';
    SONGS.stage3 = {
      bpm: 144, length: 16, swing: 0, tracks: [
        { inst: 'dist', vol: 0.15, cutoff: 1200, gate: 0.8,
          bars: bars(rep([S3_BASS[0], S3_BASS[0], S3_BASS[1], S3_BASS[1], S3_BASS[2], S3_BASS[2], S3_BASS[3], S3_BASS[3]], 2)) },
        { inst: 'pulse', wave: 'square', vol: 0.09, gate: 0.7, cutoff: 3000, echo: { steps: 3, fb: 0.22, mix: 0.4 }, bars: rep(s3ArpBars, 2) },
        { inst: 'strings', vol: 0.02, cutoff: 1000,
          bars: bars([...rep([R], 8), 'C4+Eb4+G4:32', R, 'C4+Eb4+Ab4:32', R, 'D4+F4+Bb4:32', R, 'D4+G4+B4:32', R]) },
        { inst: 'kit', vol: 1, bars: bars([S3D_CR, S3D, S3D, S3D, S3D, S3D, S3D, S3D, S3D2_CR, S3D2, S3D2, S3D2, S3D2, S3D2, S3D2, S3D_F]) },
      ],
    };
    SONGS.elevator = SONGS.elevator || SONGS.stage3;           // cut set piece; alias for safety

    // ---- BOSS, "Warchief": 152 BPM, B minor, 4 bars (2nd pass adds hats and a rising brass line) ----
    const BOSS_BASS = [pump('B1', 'B2'), pump('C2', 'C3'), pump('C#2', 'C#3'), pump('D2', 'D3')];
    const dimArp = oct => cyc(['B3', 'D4', 'F4', 'G#4'].map(n => tpTok(n, oct)), 16);
    const BD = 'k . . . ks . . . k . . . ks . . .';
    const BD_CR = 'kc . . . ks . . . k . . . ks . . .';
    const BD_F = 'k . . . ks . . . k . . . t t t t';
    const BD2 = 'kh . h . ksh . h . kh . h . ksh . h .';
    const BD2_CR = 'kch . h . ksh . h . kh . h . ksh . h .';
    const BD2_F = 'kh . h . ksh . h . kh . h . t t t t';
    SONGS.boss = {
      bpm: 152, length: 8, swing: 0, tracks: [
        { inst: 'sawbass', vol: 0.25, cutoff: 1000, hold: 1.5, gate: 0.9, bars: bars(rep(BOSS_BASS, 2)) },
        { inst: 'pulse', wave: 'square', vol: 0.085, gate: 0.6, cutoff: 3600,
          bars: seq(rep([dimArp(0), dimArp(0), dimArp(12), dimArp(12)], 2)) },
        { inst: 'pulse', wave: 'sawtooth', dbl: 7, vol: 0.09, cutoff: 2400, gate: 0.97, rel: 0.08, vib: [5.5, 14, 0.3],
          bars: seq([R, R, R, R, W1('B4'), W1('C5'), W1('C#5'), W1('D5')]) },
        { inst: 'kit', vol: 1, bars: bars([BD_CR, BD, BD, BD_F, BD2_CR, BD2, BD2, BD2_F]) },
      ],
    };

    // ---- FINAL BOSS, "The Thirst King": 164 BPM, C# minor, C#m-A-F#m-G# (1 bar each) ----
    // phase 2 adds 16th hats; phase 3 adds 32nd hats and a siren, a semitone up and faster.
    const FB_LEAD = ['C#5 - E5 G#5 G#5 F#5 E5 -', 'C#5 - B4 A4 E5 - - -', 'A4 - C#5 F#5 F#5 E5 C#5 -', 'G#4 - B#4 D#5 G#5 - - -'];
    const FB_BASS = [pump('C#2', 'C#3'), pump('A1', 'A2'), pump('F#1', 'F#2'), pump('G#1', 'G#2')];
    const FB_PAD = ['G#3+C#4+E4:16', 'A3+C#4+E4:16', 'F#3+A3+C#4:16', 'G#3+B#3+D#4:16'];
    const FB_ARP = [['C#4', 'E4', 'G#4', 'C#5'], ['A3', 'C#4', 'E4', 'A4'], ['F#3', 'A3', 'C#4', 'F#4'], ['G#3', 'B#3', 'D#4', 'G#4']];
    function finalSong(phase) {
      const k = phase === 3 ? 1 : 0;
      const T = s => (k ? tp(s, k) : s);
      const hat = phase === 2 ? 'H h h h ' : phase === 3 ? 'r r r r ' : '';
      // drums (the spec leaves the base phase's drums open: a driving rock beat, kick 1, 3, 3+)
      const drum = (base, crash, fill) => {
        const steps = base.split(' ');
        if (crash) steps[0] += 'c';
        if (fill) { steps[12] = 'ks'; steps[13] = 's'; steps[14] = 's'; steps[15] = 'st'; }
        if (hat) { const hs = hat.trim().split(' '); for (let i = 0; i < 16; i++) steps[i] = (steps[i] === '.' ? '' : steps[i]) + hs[i % 4]; }
        return steps.join(' ');
      };
      const DB = 'k . . . s . . . k . k . s . . .';
      const tracks = [
        { inst: 'dist', vol: 0.15, cutoff: 1300, hold: 1.5, gate: 0.85, bars: bars(rep(FB_BASS.map(T), 2)) },
        { inst: 'pulse', wave: 'sawtooth', dbl: 7, vol: 0.15, cutoff: 3600, gate: 0.92, rel: 0.06, vib: [5.5, 14, 0.2],
          bars: seq(rep(FB_LEAD.map(s => T(e8(s))), 2)) },
        { inst: 'strings', vol: 0.026, cutoff: 1200, atk: 0.3, rel: 0.3, bars: bars(rep(FB_PAD.map(T), 2)) },
        { inst: 'pulse', wave: 'pulse25', vol: 0.045, gate: 0.6, cutoff: 3000,
          bars: seq([R, R, R, R, ...FB_ARP.map(n => T(cyc(n, 16).join(' ')))]) },
        { inst: 'kit', vol: 1, bars: bars([drum(DB, true), drum(DB), drum(DB), drum(DB, false, true), drum(DB, true), drum(DB), drum(DB), drum(DB, false, true)]) },
      ];
      if (phase === 3) tracks.push({ inst: 'siren', vol: 0.06, bars: bars(['S:16']) });
      return { bpm: phase === 3 ? 172 : 164, length: 8, swing: 0, tracks };
    }
    SONGS.finalboss = finalSong(1);
    SONGS.finalboss2 = finalSong(2);
    SONGS.finalboss3 = finalSong(3);

    // ---- Jingles ----
    // Stage Clear: square C5 E5 G5 C6 in 16ths, then a C5/E5/G5 chord held 600 ms (about 1.6 s with the tail).
    SONGS.fanfare = {
      bpm: 100, length: 1, once: true, swing: 0, tracks: [
        { inst: 'pulse', wave: 'square', vol: 0.13, gate: 0.95, rel: 0.38, cutoff: 5000, bars: bars(['C5 E5 G5 C6 C5+E5+G5:4']) },
        { inst: 'pulse', wave: 'pulse25', vol: 0.05, gate: 0.95, rel: 0.38, cutoff: 6000, vib: [6, 10, 0.2], bars: bars(['. . . . C6:4']) },
        { inst: 'sawbass', vol: 0.24, cutoff: 1100, rel: 0.3, bars: bars(['C3 . G2 . C2:4']) },
        { inst: 'kit', vol: 0.8, bars: bars(['k . . . kc']) },
      ],
    };
    // Game Over: TRI A4 F4 D4 A3, 400 ms each, as the lowpass closes.
    SONGS.gameover = {
      bpm: 150, length: 2, once: true, swing: 0, tracks: [
        { inst: 'fx', bus: 'mus_gameover', from: 3600, to: 200, bars: bars(['close:26']) },
        { inst: 'tri', bus: 'mus_gameover', vol: 0.24, gate: 0.96, rel: 0.1, vibHz: [5, 3, 0.2],
          bars: seq(['A4 - - - F4 - - - D4 - - - A3 - - -', '- - - - - - - - . . . .']) },
        { inst: 'tri', bus: 'mus_gameover', vol: 0.16, gate: 0.96, rel: 0.2,
          bars: seq(['D3 - - - - - - - - - - - A2 - - -', '- - - - - - - - - - . .']) },
        { inst: 'kit', bus: 'mus_gameover', vol: 0.7, bars: bars(['t . . . t . . . t . . . kt']) },
      ],
    };
    // Victory (Ending card): C major, 132 BPM, 8 bars, lead twice, Stage 1 drums, loops gently.
    const END_LEAD = ['C5 E5 G5 C6', 'B5 G5 E5 G5', 'A5 F5 C5 F5', 'G5 - - -'];
    const END_HARM = ['G4 C5 E5 G5', 'G5 E5 B4 E5', 'F5 C5 A4 C5', 'D5 - - -'];
    SONGS.ending = {
      bpm: 132, length: 8, swing: 0, tracks: [
        { inst: 'pulse', wave: 'pulse25', vol: 0.14, gate: 0.9, rel: 0.1, cutoff: 4200, vib: [5.5, 12, 0.25], echo: { steps: 3, fb: 0.25, mix: 0.35 },
          bars: seq(rep(END_LEAD.map(q4), 2)) },
        { inst: 'pulse', wave: 'square', vol: 0.07, gate: 0.9, rel: 0.1, cutoff: 2600, bars: seq([R, R, R, R, ...END_HARM.map(q4)]) },
        { inst: 'sawbass', vol: 0.2, cutoff: 800, hold: 1.6, gate: 0.9,
          bars: bars(rep([pump('C2', 'C3'), pump('E2', 'E3'), pump('F2', 'F3'), pump('G2', 'G3')], 2)) },
        { inst: 'strings', vol: 0.024, cutoff: 1100, bars: bars(rep(['C4+E4+G4:16', 'B3+E4+G4:16', 'A3+C4+F4:16', 'B3+D4+G4:16'], 2)) },
        { inst: 'kit', vol: 0.6, bars: bars([S1D_CR, S1D, S1D, S1D, S1D_CR, S1D, S1D, S1D_F2]) },
      ],
    };

    // =====================================================================================
    // Story cards (DESIGN 10.4): 200x96 vignettes, silhouettes in 2-3 colours, animated
    // =====================================================================================
    const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
    // horizontal colour bands with a dithered seam between them
    function bands(x, y, w, h, cols) {
      const n = cols.length, bh = h / n;
      for (let i = 0; i < n; i++) Px.rect(x, y + Math.round(i * bh), w, Math.ceil(bh) + 1, cols[i]);
      for (let i = 1; i < n; i++) {
        const yy = y + Math.round(i * bh);
        for (let xx = 0; xx < w; xx += 2) { Px.dot(x + xx, yy - 1, cols[i]); Px.dot(x + xx + 1, yy, cols[i - 1]); }
      }
    }
    // concentric glow, outer colour first
    function glow(cx, cy, r, cols, sq = 1) {
      const n = cols.length;
      for (let i = 0; i < n; i++) { const rr = r * (1 - i / n); Px.oval(cx, cy, rr, Math.max(1, rr * sq), cols[i]); }
    }
    function withAlpha(ctx, a, fn) { const o = ctx.globalAlpha; ctx.globalAlpha = o * a; fn(); ctx.globalAlpha = o; }

    // ---- 1. Intro A: the burning convoy ----
    function artConvoy(ctx, x, y, t, f) {
      Px.use(ctx);
      const SIL = '#0a0404', FIRE = ['#e2591e', '#ffb347', '#ffe08a'];
      const HZ = y + 72;
      bands(x, y, 200, 72, ['#140606', '#200a08', '#30100a', '#45180c', '#5e2210', '#7a3014']);
      // far mesas
      Px.poly([x - 2, HZ, x - 2, y + 62, x + 8, y + 61, x + 12, y + 57, x + 30, y + 57, x + 34, y + 62, x + 46, y + 64, x + 46, HZ], '#2a0e0a');
      Px.poly([x + 150, HZ, x + 156, y + 60, x + 160, y + 53, x + 184, y + 53, x + 189, y + 61, x + 202, y + 63, x + 202, HZ], '#2a0e0a');
      // smoke plume (oldest first)
      const puffs = [];
      for (let i = 0; i < 14; i++) puffs.push((f * 0.0035 + i / 14) % 1);
      puffs.sort((a, b) => b - a);
      puffs.forEach((u, i) => {
        const px = x + 104 + u * 78 + Math.sin(u * 7 + i) * 4, py = y + 34 - u * 58;
        Px.disc(px, py, 5 + u * 18, u < 0.15 ? '#4a1a0c' : u < 0.5 ? '#341409' : '#26100a');
      });
      // ground, fire light on it
      Px.rect(x, HZ, 200, 24, SIL);
      const gl = 66 + Math.sin(f * 0.3) * 3 + hash(f >> 2) * 3;
      Px.oval(x + 100, y + 80, gl, 5, '#2a0d07');
      Px.oval(x + 102, y + 79, gl * 0.6, 3, '#4a1709');
      // Jackal bikes riding off along the horizon, tail lights winking
      for (let i = 0; i < 2; i++) {
        const bx = x + ((f * 0.35 + i * 26) % 250) - 30, by = HZ;
        Px.disc(bx, by - 2, 2, SIL); Px.disc(bx + 7, by - 2, 2, SIL);
        Px.rect(bx, by - 5, 8, 2, SIL); Px.rect(bx + 2, by - 9, 3, 4, SIL); Px.disc(bx + 3.5, by - 10, 1.5, SIL);
        if ((f >> 3) % 3) Px.dot(bx - 1, by - 5, '#ff3b30');
      }
      // second wreck, on its side
      Px.poly([x + 158, y + 76, x + 160, y + 66, x + 186, y + 64, x + 192, y + 70, x + 190, y + 76], SIL);
      Px.disc(x + 166, y + 64, 3, SIL); Px.disc(x + 182, y + 62, 3, SIL);
      // tanker truck, cab facing left
      Px.rect(x + 22, y + 74, 132, 5, SIL);                          // chassis
      Px.poly([x + 16, y + 79, x + 16, y + 68, x + 30, y + 66, x + 32, y + 54, x + 54, y + 54, x + 56, y + 79], SIL); // hood + cab
      Px.rect(x + 50, y + 50, 3, 6, SIL);                            // exhaust stack
      Px.rect(x + 58, y + 52, 92, 22, SIL);                          // tank
      Px.disc(x + 60, y + 63, 11, SIL); Px.disc(x + 148, y + 63, 11, SIL);
      for (const rx of [74, 132]) Px.rect(x + rx, y + 51, 2, 24, SIL);
      Px.poly([x + 92, y + 53, x + 94, y + 46, x + 97, y + 52], SIL); // torn plates
      Px.poly([x + 116, y + 53, x + 120, y + 45, x + 121, y + 53], SIL);
      for (const wx of [30, 44, 86, 98, 128, 142]) Px.disc(x + wx, y + 80, 5, SIL);
      // cab window lit from inside
      const wf = hash((f >> 2) + 3) > 0.3 ? FIRE[0] : FIRE[1];
      Px.poly([x + 33, y + 65, x + 36, y + 58, x + 47, y + 58, x + 47, y + 65], wf);       // windshield, cab burning inside
      Px.rect(x + 34, y + 63, 13, 2, FIRE[0]);
      for (let u = 66; u < 146; u += 2) if (Math.abs(u - 106) < 34 + Math.sin(f * 0.3) * 3) Px.dot(x + u, y + 52, u % 4 ? '#7a3014' : '#a8401a'); // fire light on the tank
      // flames bursting from the ruptured tank
      const flame = (cx, by, w, h, ph) => {
        const sw = Math.sin(f * 0.11 + ph) * w * 0.25;
        [[1, FIRE[0]], [0.66, FIRE[1]], [0.38, FIRE[2]]].forEach(([k, col], j) => {
          const fl = 0.82 + 0.18 * Math.sin(f * 0.37 + ph * 3.1 + j) + 0.16 * (hash((f >> 2) * 7 + ph * 13 + j) - 0.5);
          const hh = h * k * fl, ww = w * (0.55 + 0.45 * k);
          Px.poly([cx - ww / 2, by, cx - ww * 0.3 + sw * 0.3, by - hh * 0.45, cx + sw, by - hh, cx + ww * 0.28 + sw * 0.45, by - hh * 0.5, cx + ww / 2, by], col);
        });
      };
      [[94, 20, 0], [101, 34, 1.3], [108, 26, 2.1], [114, 30, 3.7], [121, 18, 4.4]].forEach(([fx, fh, ph]) => flame(x + fx, y + 54, 12, fh, ph));
      flame(x + 41, y + 55, 9, 13, 5.2);
      flame(x + 176, y + 65, 10, 15, 6.1);
      // embers
      for (let i = 0; i < 16; i++) {
        const u = (f * 0.011 + hash(i)) % 1;
        const ex = x + 94 + hash(i + 7) * 26 + u * 30 + Math.sin(f * 0.06 + i) * 3, ey = y + 44 - u * 44;
        Px.dot(ex, ey, u < 0.5 ? FIRE[2] : FIRE[1]);
      }
    }

    // ---- 2. Intro B: the Rustfist gauntlet clenching against a forge glow ----
    const easeIO = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    function clenchAt(t) {
      if (t < 36) return { c: 0.03 + Math.sin(t * 0.4) * 0.015, slam: 999 };
      if (t < 76) {                                                  // ratchets shut in 5 clicks
        const k = (t - 36) / 40, j = Math.floor(k * 5), fr = k * 5 - j;
        return { c: (j + easeIO(Math.min(1, fr * 2.2))) / 5, slam: 999 };
      }
      const u = (t - 76) % 210;                                      // flexes and slams every 210 f
      const c = u < 150 ? 1 : u < 185 ? 1 - 0.32 * easeIO((u - 150) / 35) : 0.68 + 0.32 * Math.pow((u - 185) / 25, 2);
      return { c, slam: u };
    }
    function artGauntlet(ctx, x, y, t, f) {
      Px.use(ctx);
      const SIL = '#0c0605', RIM = '#ffb347', RIM2 = '#b8441a', SEAM = '#2c150c', HOT = '#ffe08a';
      const { c, slam } = clenchAt(t);
      const hot = slam < 10 ? 1 - slam / 10 : 0;
      Px.rect(x, y, 200, 96, '#0e0706');
      const gr = 86 + Math.sin(f * 0.07) * 2 + (hash(f >> 2) - 0.5) * 2 + hot * 8;
      glow(x + 100, y + 38, gr, ['#1a0a06', '#2a1007', '#3f1709', '#5c200b', '#80300e', hot > 0.3 ? '#e2591e' : '#a83f14'], 0.72);
      const sh = slam < 8 ? ((slam & 1) ? 1 : -1) : 0;
      const cx = x + 100 + sh, slide = c * 4;
      // fingers: [centre x, width, open length]; index beside the thumb on the left (back of the right hand)
      const FING = [[-13, 8, 24], [-4.5, 8, 28], [4.5, 8, 26], [13, 7, 20]];
      const SEG = [0.45, 0.3, 0.25];
      // the fingers fold away from the viewer: projected height of each joint above the knuckle line
      const joints = L => { const o = []; let h = 0, th = 0; for (let j = 0; j < 3; j++) { th += c * Math.PI / 2; h += L * SEG[j] * Math.cos(th); o.push(h); } return o; };
      const vis = L => Math.max(0, ...joints(L));
      const KY = y + 34;
      const shape = (dx, dy, col) => {
        const X = cx + dx, Y = dy;
        Px.poly([X - 17, y + 99 + Y, X - 14, y + 62 + Y, X + 14, y + 62 + Y, X + 17, y + 99 + Y], col);   // forearm
        for (const s of [-1, 1]) {                                                                      // pistons
          const px = X + s * 22;
          Px.rect(px - 2, y + 70 + Y, 5, 24, col);
          Px.rect(px - 1, y + 46 + slide + Y, 3, 26, col);
          Px.rect(px - 3, y + 88 + Y, 7, 3, col);
          Px.rect(s < 0 ? px + 2 : px - 6, y + 79 + Y, 5, 2, col);
          Px.rect(s < 0 ? px + 1 : px - 4, y + 45 + slide + Y, 4, 3, col);
        }
        Px.rect(X - 20, y + 55 + Y, 40, 9, col);                                                          // wrist ring
        Px.rect(X - 26, y + 57 + Y, 6, 3, col); Px.rect(X + 20, y + 57 + Y, 6, 3, col);                  // vent pipes
        Px.poly([X - 17, y + 57 + Y, X - 19, y + 43 + Y, X - 18, KY - 1 + Y, X + 18, KY - 1 + Y, X + 19, y + 43 + Y, X + 17, y + 57 + Y], col);
        for (const [fx, fw, L] of FING) {
          const h = vis(L) + 3 + 3 * c, k = h / (L + 3);
          const tx = X + fx + fx * 0.22 * k, ty = KY - h + Y;
          Px.quad(X + fx, KY + 2 + Y, tx, ty + fw / 2, fw, fw - 1, col);
          Px.disc(tx, ty + fw / 2, (fw - 1) / 2, col);
        }
        // thumb: sticks out up-left when open, tucks into a stub when shut
        const ta = lerp(-2.55, -3.95, c), tl = lerp(17, 9, c);
        const bx = X - 17, byy = y + 50 + Y;
        Px.limb(bx, byy, bx + Math.cos(ta) * tl, byy + Math.sin(ta) * tl, 8, 6, col);
        Px.disc(bx + Math.cos(ta) * tl, byy + Math.sin(ta) * tl, 3, col);
      };
      const rimTop = hot > 0 ? HOT : RIM;
      shape(-1, 0, RIM2); shape(1, 0, RIM2); shape(0, -1, rimTop);
      shape(0, 0, SIL);
      // plating detail: finger joints, knuckle plate, forearm seams, rivets
      for (const [fx, fw, L] of FING) {
        const js = joints(L), h = vis(L) + 3 + 3 * c, k = h / (L + 3);
        for (let j = 0; j < 2; j++) {
          if (js[j] <= 1 || js[j] >= h - 2) continue;
          const jx = cx + fx + fx * 0.22 * (js[j] / (L + 3));
          Px.rect(jx - fw / 2 + 2, KY - js[j], fw - 3, 1, SEAM);
        }
        Px.rect(cx + fx - fw / 2 + 2, KY + 1, fw - 3, 1, SEAM);
        if (c > 0.8) Px.dot(cx + fx + fx * 0.22 * k, KY - h + 2, hot > 0 ? HOT : RIM2);     // knuckle glints
      }
      Px.rect(cx - 16, y + 47, 32, 1, SEAM);
      Px.rect(cx - 15, y + 72, 30, 1, SEAM); Px.rect(cx - 16, y + 85, 32, 1, SEAM);
      for (let i = 0; i < 5; i++) Px.dot(cx - 16 + i * 8, y + 59, RIM2);
      for (const ry of [67, 78, 91]) { Px.dot(cx - 12, y + ry, SEAM); Px.dot(cx + 12, y + ry, SEAM); }
      // steam: a lazy trickle from the left vent, a burst from both vents on every slam
      const puff = (px, py, r, k) => withAlpha(ctx, Math.max(0, 1 - k) * 0.85, () => Px.disc(px, py, r, k < 0.4 ? '#e8dccb' : '#a89888'));
      for (let n = Math.floor((f - 60) / 14); n <= Math.floor(f / 14); n++) {
        const age = f - n * 14;
        if (age < 0 || age > 60) continue;
        const k = age / 60;
        puff(cx - 27 - age * 0.3 + Math.sin(age * 0.15 + n) * 2, y + 57 - age * 0.8, 1.5 + age * 0.1, k);
      }
      if (slam < 46) {
        const k = slam / 46;
        for (let j = 0; j < 12; j++) {
          const s = j % 2 ? 1 : -1, a = -Math.PI / 2 + s * (0.5 + (j >> 1) * 0.22) + (hash(j) - 0.5) * 0.2, sp = 20 + hash(j + 3) * 14;
          const d = sp * easeOut(k);
          puff(cx + s * 27 + Math.cos(a) * d, y + 58 + Math.sin(a) * d * 0.7 - k * 4, 2 + k * 6, k);
        }
        for (let j = 0; j < 14 && slam < 24; j++) {
          const a = -Math.PI + hash(j + 11) * Math.PI, sp = 1.4 + hash(j + 21) * 2;
          const sx = cx - 14 + hash(j + 31) * 28 + Math.cos(a) * sp * slam, sy = KY - 4 + Math.sin(a) * sp * slam + 0.13 * slam * slam;
          Px.dot(sx, sy, slam < 10 ? HOT : RIM);
        }
      }
    }

    // ---- 3. Before Stage 2: a scorpion on the dune crest, red eyes ----
    const CREST = 104;
    const duneY = (y, u) => (u < CREST ? y + 60 + Math.pow((CREST - u) / CREST, 1.6) * 26 : y + 60 + Math.pow((u - CREST) / (200 - CREST), 1.8) * 20);
    function artScorpion(ctx, x, y, t, f) {
      Px.use(ctx);
      const SIL = '#0e0806', EYE = '#ff3b30';
      bands(x, y, 200, 96, ['#180a08', '#24100b', '#36170e', '#4c2112', '#682d16', '#863c1a']);
      // low striped sun, right behind where the tail rises
      const sx = x + 146, sy = y + 40;
      Px.disc(sx, sy, 24, '#a8501e');
      Px.disc(sx, sy - 1, 21, '#d06a2c');
      [6, 11, 15, 18, 21].forEach((d, i) => Px.rect(sx - 26, sy + d, 52, 1 + (i >> 1), '#863c1a'));
      // far dune line
      const far = [x, y + 96];
      for (let u = 0; u <= 200; u += 8) far.push(x + u, y + 67 + Math.sin(u * 0.045 + 1.2) * 4);
      far.push(x + 200, y + 96);
      Px.poly(far, '#2e140c');
      // main dune
      const dune = [x, y + 96];
      for (let u = 0; u <= 200; u += 4) dune.push(x + u, duneY(y, u));
      dune.push(x + 200, y + 96);
      Px.poly(dune, SIL);
      // the King's Road: a leaning sign half buried in the slope
      const gy = duneY(y, 30);
      Px.line(x + 30, gy + 1, x + 27, gy - 17, 2, SIL);
      Px.poly([x + 19, gy - 22, x + 35, gy - 20, x + 34, gy - 12, x + 18, gy - 14], SIL);
      // the stinger on the crest, facing the road
      const blink = (f % 170) < 7 || ((f + 40) % 300) < 5;
      const S = 1.9;
      Sprite.begin(176, 112, 88, 100);
      drawScorpion({
        s: S, shell: SIL, plate: SIL, hi: SIL, belly: SIL, leg: SIL, sting: SIL, eye: blink ? SIL : EYE,
        legPhase: 0.6 + Math.sin(f * 0.02) * 0.3, clawOpen: 0.3 + 0.3 * Math.max(0, Math.sin(f * 0.045)),
        clawRaise: 0.55 + 0.2 * Math.sin(f * 0.03), tailCurl: 0.55 + 0.1 * Math.sin(f * 0.025),
      });
      const fx0 = x + CREST + 6, fy0 = duneY(y, CREST + 6) + 1;
      Sprite.end(ctx, fx0, fy0, -1, { outline: null });
      Px.use(ctx);
      if (!blink) {
        const ex = fx0 - 12 * S, ey = fy0 - 10 * S;
        withAlpha(ctx, 0.28 + 0.12 * Math.sin(f * 0.2), () => Px.disc(ex - 0.5, ey + 0.5, 4, EYE));
        Px.dot(ex, ey, '#ffb0a0');
      }
      // blowing sand skimming the dune
      for (let i = 0; i < 20; i++) {
        const u = ((hash(i) * 240 + f * (1.2 + hash(i + 3) * 1.6)) % 240) - 20;
        const py = duneY(y, clamp(u, 0, 200)) - 1 - hash(i + 9) * 7 - Math.sin(f * 0.05 + i) * 1.5;
        Px.rect(x + u, py, 2 + (i % 3), 1, i % 4 ? '#863c1a' : '#a8501e');
      }
      // and something else watches from the near dune
      const g2 = f % 260;
      if (g2 > 120 && g2 < 215 && !(g2 >= 160 && g2 < 165)) {
        const ex = x + 172, ey = y + 90;
        Px.dot(ex, ey, EYE); Px.dot(ex + 3, ey, EYE); Px.dot(ex - 2, ey + 1, '#a02018'); Px.dot(ex + 5, ey + 1, '#a02018');
      }
    }

    // ---- 4. Before Stage 3: Hollow Dam against a toxic green glow ----
    function artDam(ctx, x, y, t, f) {
      Px.use(ctx);
      const SIL = '#020302', G = ['#9be15d', '#3e8a2a', '#1e4a1a'];
      bands(x, y, 200, 96, ['#030504', '#050806', '#080d09', '#0b130c']);
      const pulse = 0.5 + 0.5 * Math.sin(f * 0.05);
      glow(x + 100, y + 34, 96 + pulse * 6, ['#0a120a', '#0e1a0d', '#132410', '#183014', '#1e3e18', '#264e1d'], 0.45);
      // steam plumes from the stacks, lit green from below
      const stacks = [[34, 20], [44, 27], [56, 16], [140, 18], [151, 28], [162, 21]];
      stacks.forEach(([sxu, sh], si) => {
        for (let i = 0; i < 6; i++) {
          const u = (f * 0.004 + i / 6 + si * 0.13) % 1;
          const px = x + sxu + 1 + u * 24 + Math.sin(u * 6 + si) * 3, py = y + 36 - sh - u * 36;
          Px.disc(px, py, 2 + u * 6, u < 0.3 ? '#1e3e18' : '#142a12');
        }
      });
      // refinery skyline on the crest
      stacks.forEach(([sxu, sh]) => { Px.rect(x + sxu, y + 38 - sh, 4, sh + 2, SIL); Px.rect(x + sxu - 1, y + 38 - sh, 6, 2, SIL); });
      Px.disc(x + 80, y + 31, 7, SIL); Px.rect(x + 73, y + 31, 14, 7, SIL);
      Px.disc(x + 119, y + 32, 5, SIL); Px.rect(x + 114, y + 32, 10, 6, SIL);
      Px.rect(x + 87, y + 28, 27, 2, SIL); Px.rect(x + 124, y + 30, 16, 2, SIL); Px.rect(x + 60, y + 30, 13, 2, SIL);
      Px.line(x + 172, y + 38, x + 180, y + 10, 2, SIL); Px.line(x + 180, y + 10, x + 197, y + 16, 1, SIL);
      Px.line(x + 197, y + 16, x + 197, y + 24, 1, SIL);
      // dam wall: a curved crest, the face lit green from the poisoned pool below
      const crest = u => y + 38 + Math.pow((u - 100) / 100, 2) * 4;
      const wall = [x - 4, y + 96];
      for (let u = -4; u <= 204; u += 8) wall.push(x + u, crest(u));
      wall.push(x + 204, y + 96);
      Px.poly(wall, SIL);
      const face = ['#030603', '#050a05', '#071007', '#0a170a', '#0e200d'];
      for (let i = 0; i < face.length; i++) {
        const yy = y + 54 + i * 8;
        Px.rect(x, yy, 200, 8, face[i]);
        if (i) for (let xx = 0; xx < 200; xx += 2) Px.dot(x + xx + (i & 1), yy, face[i - 1]);
      }
      Px.rect(x, y + 43, 200, 2, SIL);                                                        // crest walkway lip
      for (let u = 4; u < 200; u += 2) Px.dot(x + u, crest(u) - 1, '#1e3e18');                // rim light on the crest
      for (const u of [16, 44, 156, 184]) Px.quad(x + u, y + 45, x + u + (u - 100) * 0.06, y + 96, 3, 5, SIL); // buttresses
      // stack tops and walkway lights blink
      stacks.forEach(([sxu, sh], i) => { if (((f >> 4) + i) % 3) Px.dot(x + sxu + 1, y + 37 - sh, G[0]); });
      for (let i = 0; i < 9; i++) if (((f >> 5) + i) % 4) Px.dot(x + 14 + i * 21, y + 47, G[1]);
      // the spillway: one wide sluice slot pours a curtain of poison down the face into a glowing pool
      const flick = hash(f >> 2) > 0.2;
      Px.rect(x + 76, y + 55, 48, 8, SIL);
      Px.rect(x + 78, y + 57, 44, 3, flick ? G[0] : G[1]);
      for (const dx of [92, 107]) Px.rect(x + dx, y + 55, 2, 7, SIL);                   // sluice piers
      withAlpha(ctx, 0.8, () => Px.poly([x + 78, y + 60, x + 122, y + 60, x + 127, y + 90, x + 73, y + 90], G[2]));
      Px.rect(x + 78, y + 60, 44, 1, G[1]);
      for (let s = 0; s < 16; s++) {                                                     // streaks racing down
        const u = (s + 0.5) / 16, len = 3 + (s % 3) * 2, sy0 = y + 61 + ((f * 1.8 + hash(s) * 30) % 28);
        const sx = x + 78 + u * 44 + (u - 0.5) * (sy0 - y - 60) * 0.35;
        Px.rect(sx, sy0, 1, len, s % 3 ? G[1] : G[0]);
      }
      Px.oval(x + 100, y + 92, 48 + pulse * 3, 6, G[2]);
      Px.oval(x + 100, y + 92, 30 + pulse * 2, 3, G[1]);
      Px.rect(x + 86, y + 91, 28, 1, G[0]);
      for (let i = 0; i < 7; i++) {                                                           // rising toxic mist
        const u = (f * 0.008 + i / 7) % 1;
        withAlpha(ctx, 0.6 * (1 - u), () => Px.disc(x + 80 + i * 7 + Math.sin(f * 0.03 + i) * 3, y + 90 - u * 22, 2 + u * 4, G[2]));
      }
      // rocky foreground
      Px.poly([x - 2, y + 97, x - 2, y + 80, x + 14, y + 84, x + 26, y + 90, x + 40, y + 97], SIL);
      Px.poly([x + 202, y + 97, x + 202, y + 78, x + 186, y + 84, x + 170, y + 92, x + 160, y + 97], SIL);
    }

    // ---- 5. Ending: Juno and Teo at the floodgate wheel, rain, the first blue water ----
    const VICTORY = () => pose({ rot: 0, fThigh: 0.1, fKnee: 0, bThigh: -0.1, bKnee: 0, fUpper: 3.05, fElbow: 0.1, bUpper: 0.3, bElbow: 1.6, head: -0.15 });
    const fakeJuno = { id: 7, vx: -2.6, facing: 1, state: 'victory', airborne: false, weapon: null, t: 0, atk: null };
    const TEO = {
      s: 0.86, skin: '#555', top: '#444', sleeve: '#444', pants: '#333', boots: '#222', hipW: 8, shW: 10, limbW: 4,
      head(Hd) {
        Px.disc(Hd.x, Hd.y, 4, '#555');
        Px.poly([Hd.x - 6, Hd.y + 1, Hd.x - 4, Hd.y - 6, Hd.x + 2, Hd.y - 7, Hd.x + 5, Hd.y - 3, Hd.x + 1, Hd.y - 4, Hd.x - 2, Hd.y + 2], '#333');
      },
    };
    function artEnding(ctx, x, y, t, f) {
      Px.use(ctx);
      const SIL = '#08080a', RAIN = '#8ec8ff', WATER = '#2e7fd8', FOAM = '#e8f4ff';
      const flash = (f % 420) < 3 || ((f % 420) > 7 && (f % 420) < 9);
      bands(x, y, 200, 96, flash ? ['#3a3e46', '#454850', '#50525a', '#5a5a60'] : ['#0d0f12', '#14161a', '#1b1e22', '#25272b', '#34302f']);
      if (!flash) { Px.oval(x + 60, y + 52, 50, 3, '#3a3433'); Px.oval(x + 56, y + 52, 28, 1.5, '#4a403c'); }   // dawn breaking
      // distant broken dam and towers
      Px.poly([x - 2, y + 66, x - 2, y + 50, x + 10, y + 48, x + 14, y + 52, x + 34, y + 51, x + 38, y + 58, x + 44, y + 66], '#101114');
      Px.line(x + 182, y + 66, x + 188, y + 36, 2, '#101114'); Px.line(x + 196, y + 66, x + 189, y + 36, 2, '#101114');
      for (let k = 0; k < 4; k++) Px.line(x + 183 + k * 1.5, y + 60 - k * 7, x + 195 - k * 1.5, y + 56 - k * 7, 1, '#101114');
      // released water fills the river below the walkway
      Px.rect(x, y + 79, 200, 17, WATER);
      for (let u = 0; u < 200; u += 2) Px.dot(x + u, y + 79 + ((Math.sin(u * 0.2 + f * 0.15) > 0.3) ? 0 : 1), '#8ec8ff');
      for (let i = 0; i < 18; i++) {
        const fx = x + ((hash(i) * 230 - f * (1.3 + hash(i + 2) * 1.4)) % 230 + 230) % 230 - 15;
        Px.rect(fx, y + 82 + hash(i + 5) * 13, 4 + (i % 3) * 2, 1, FOAM);
      }
      // floodgate spout under the wheel
      for (let s = 0; s < 6; s++) {
        const sy0 = y + 74 + ((f * 2 + s * 3) % 8);
        Px.rect(x + 160 + s * 3, sy0, 2, 3, s % 2 ? FOAM : RAIN);
      }
      // walkway, pillars and railing
      Px.rect(x, y + 68, 200, 6, SIL);
      for (const px of [24, 94, 186]) Px.rect(x + px, y + 74, 5, 6, SIL);
      Px.rect(x, y + 60, 200, 1, SIL);
      for (let px = 4; px < 200; px += 16) Px.rect(x + px, y + 60, 1, 8, SIL);
      // floodgate wheel turning
      const wcx = x + 158, wcy = y + 42, wr = 12, ang = f * 0.035;
      Px.rect(wcx - 2, wcy, 4, 26, SIL);
      for (let i = 0; i < 24; i++) {
        const a0 = i / 24 * TAU, a1 = (i + 1) / 24 * TAU;
        Px.line(wcx + Math.cos(a0) * wr, wcy + Math.sin(a0) * wr, wcx + Math.cos(a1) * wr, wcy + Math.sin(a1) * wr, 2, SIL);
      }
      for (let i = 0; i < 6; i++) {
        const a = ang + i * TAU / 6;
        Px.line(wcx, wcy, wcx + Math.cos(a) * wr, wcy + Math.sin(a) * wr, 1, SIL);
        Px.disc(wcx + Math.cos(a) * (wr + 2), wcy + Math.sin(a) * (wr + 2), 1.5, SIL);
      }
      Px.disc(wcx, wcy, 3, SIL);
      // Teo hauling on the wheel
      const push = Math.sin(f * 0.07);
      Sprite.begin(112, 96, 56, 88);
      drawHumanoid(pose({ hy: -20, rot: 0.18, fThigh: 0.35, fKnee: -0.2, bThigh: -0.35, bKnee: -0.1, head: -0.25,
        fUpper: 2.2 + push * 0.15, fElbow: 0.35, bUpper: 2.0 - push * 0.15, bElbow: 0.5 }), TEO);
      Sprite.end(ctx, x + 138, y + 68, 1, { outline: null, flash: SIL });
      // Juno, gauntlet raised, scarf streaming
      Sprite.begin(112, 96, 56, 88);
      const p = VICTORY(); p.hy = -20 + Math.sin(f * 0.06) * 0.4;
      const Rg = drawHumanoid(p, HERO_STYLE(fakeJuno, true));
      Sprite.end(ctx, x + 66, y + 68, 1, { outline: null, flash: SIL });
      Px.use(ctx);
      // steam from the gauntlet
      const fx0 = x + 66 + Rg.fa.H.x, fy0 = y + 68 + Rg.fa.H.y - 3;
      for (let i = 0; i < 6; i++) {
        const u = (f * 0.015 + i / 6) % 1;
        withAlpha(ctx, 0.75 * (1 - u), () => Px.disc(fx0 - u * 10 + Math.sin(u * 8 + i) * 2, fy0 - u * 22, 1.5 + u * 4, u < 0.3 ? '#c8ccd2' : '#7a7e86'));
      }
      // rain, 1x4 streaks
      for (let i = 0; i < 90; i++) {
        const sp = 3.2 + hash(i + 40) * 1.6;
        const ry = ((hash(i + 80) * 110 + f * sp) % 110) - 8;
        const rx = ((hash(i) * 230 - ry * 0.3 - f * 0.4) % 230 + 230) % 230 - 15;
        Px.rect(x + rx, y + ry, 1, 4, RAIN);
        if (ry > 80 && ry < 84) Px.dot(x + rx - 1, y + 79, FOAM);
      }
    }

    const CARD_TEXT = {
      a: ['YEAR 2097. FORTY YEARS AFTER THE FLASH.', 'WATER IS MONEY. MONEY IS BLOOD.', 'KING VALVE OWNS THE LAST DAM.'],
      b: ['HIS JACKALS BURNED MY CONVOY.', 'TOOK MY BROTHER. TOOK MY ARM.', 'SO I BUILT A NEW ONE.'],
      c: ["THE KING'S ROAD CROSSES THE GLASS FLATS.", 'NOTHING LIVES OUT THERE.', 'NOTHING BUT THE STINGERS.'],
      d: ['HOLLOW DAM. HIS REFINERY BOILS THE', 'POISON OUT OF THE RIVER... AND INTO', 'THE PEOPLE WHO WORK IT.'],
      e: ['THE WATER FLOWS FREE.', 'TEO TURNED THE WHEEL.', 'THE FIST NEEDS OIL. IT CAN WAIT.'],
    };
    // A failing vignette must never take the story screen down with it.
    const card = (lines, art) => ({
      text: lines.join('\n'),
      art(ctx, x, y, t, frame) {
        ctx.save();
        try { art(ctx, Math.round(x), Math.round(y), t | 0, frame | 0); }
        catch (e) { if (!card.failed) { card.failed = true; console.error('[music] story art failed: ' + e.message); } }
        ctx.restore();
        ctx.globalAlpha = 1;
        Px.use(ctx);
      },
    });
    function registerStory() {
      STORY.intro = [card(CARD_TEXT.a, artConvoy), card(CARD_TEXT.b, artGauntlet)];
      STORY.between[0] = [card(CARD_TEXT.c, artScorpion)];
      STORY.between[1] = [card(CARD_TEXT.d, artDam)];
      STORY.ending = [card(CARD_TEXT.e, artEnding)];
    }
    // STORY is declared in 80_game.js, after this file: register once the whole script has run.
    const later = typeof queueMicrotask === 'function' ? queueMicrotask : fn => Promise.resolve().then(fn);
    later(() => { try { registerStory(); } catch (e) { console.error('[music] story registration failed', e); } });
  } catch (e) {
    console.error('[music] module failed to load', e);
  }
})();
