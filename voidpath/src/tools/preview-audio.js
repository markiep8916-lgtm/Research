// Audio bench: renders every sfx and every track (intro + one whole loop) offline (OfflineAudioContext
// through the real graph: reverb, delay, limiter), measures peak / RMS, draws waveform + spectrogram strips and
// a piano roll per track from its compiled notes (with the motifs of TECH_PLAN 9 marked), and asserts levels:
// no clipping, no silence, and every track's loop RMS within 2 dB of both `explore` and `battle`.
// Buttons play everything live. Query filters for quick iteration: ?tracks=a,b (explore and battle always
// render as the reference) and ?sfx=a,b, or 'none'; ?stems=a,b also renders each line of those tracks solo and
// reports its loop RMS (mix balance). window.__PREVIEW = { ready, report }.
import { audio, renderOffline, compiledTrack, findMotif, SFX_NAMES, TRACK_NAMES, TRACKS } from '../core/audio.js';
import { injectCSS, el } from '../core/util.js';

const SR = 44100;
const SFX_SECONDS = {
  encounter: 3.2, break: 3.0, gameover: 4.6, save: 2.6, victory: 2.8, levelup: 2.6, charge: 2.2,
  enemyBeam: 2.2, heal: 2.2, ko: 2.0, cast: 2.0, door: 1.8, boost: 1.8, recover: 1.8, confirm: 1.6,
  transform: 4.0, awaken: 3.2, shard: 2.4, lift: 2.6, travel: 2.8, rumble: 3.0, choir: 3.0, sleep: 2.0,
  summon: 2.0, submerge: 2.2, emerge: 2.0, alarm: 2.4, card: 2.6, splash: 1.6, valve: 1.8,
};
const REFS = ['explore', 'battle']; // the loudness references of the acceptance (TECH_PLAN 13, C9)
const LIMITS = {
  silentDb: -45, // anything quieter is "silent"
  clipDb: -0.3, // peaks above this count as clipping
  refDb: 2, // a track's loop RMS may sit at most this far from each reference
};
const query = new URLSearchParams(location.search);
const pick = (key, all) => {
  const v = query.get(key);
  if (v == null) return all;
  return v === 'none' ? [] : all.filter((n) => v.split(',').includes(n));
};
const trackJobs = [...new Set([...REFS, ...pick('tracks', TRACK_NAMES)])].filter((n) => TRACK_NAMES.includes(n));
const sfxJobs = pick('sfx', SFX_NAMES);
// [label, sfx, opts]: WARDEN's 'choir' also renders once per track that gives it chords (choirSfx)
const sfxRuns = sfxJobs.flatMap((name) => [[name, name, {}],
  ...(name === 'choir' ? TRACK_NAMES.filter((t) => TRACKS[t].choirSfx).map((t) => [`choir @ ${t}`, 'choir', { chords: TRACKS[t].choirSfx }]) : [])]);
const stemJobs = (query.get('stems') || '').split(',').filter((n) => TRACK_NAMES.includes(n));

injectCSS('preview-audio', `
html, body { height: auto !important; overflow: auto !important; touch-action: auto !important; user-select: text; }
#app { display: none; }
.ab { max-width: 1240px; margin: 0 auto; padding: 22px 16px 60px; font-family: var(--vp-font-ui); color: var(--vp-ink); }
.ab h1 { font: 800 26px/1 var(--vp-font-display); letter-spacing: .32em; margin: 0 0 6px; color: var(--vp-amber); }
.ab .sub { color: var(--vp-ink-dim); font-size: 13px; margin-bottom: 16px; }
.ab h2 { font: 700 13px/1 var(--vp-font-display); letter-spacing: .3em; text-transform: uppercase; color: var(--vp-cyan);
  margin: 26px 0 10px; padding-bottom: 6px; border-bottom: 1px solid var(--vp-line-dim); }
.ab .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ab button { font: 600 12px/1 var(--vp-font-ui); letter-spacing: .06em; color: var(--vp-ink); background: var(--vp-panel-hi);
  border: 1px solid var(--vp-line-dim); padding: 8px 11px; border-radius: 3px; cursor: pointer; }
.ab button:hover { border-color: var(--vp-line); background: rgba(40, 64, 110, .8); }
.ab button.on { border-color: var(--vp-amber); color: var(--vp-amber); }
.ab .chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 4px; }
.ab .chip { font: 600 12px/1 var(--vp-font-ui); padding: 6px 10px; border-radius: 99px; background: var(--vp-panel); border: 1px solid var(--vp-line-dim); color: var(--vp-ink-dim); }
.ab .chip b { color: var(--vp-ink); }
.ab .chip.bad { border-color: var(--vp-danger); color: #ffc4ca; }
.ab .chip.good { border-color: rgba(111, 240, 166, .5); }
.ab label { font-size: 12px; color: var(--vp-ink-dim); display: inline-flex; gap: 6px; align-items: center; }
.ab .grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(286px, 1fr)); }
.ab .card { background: var(--vp-panel); border: 1px solid var(--vp-line-dim); border-radius: 4px; padding: 9px 10px 10px; }
.ab .card.fail { border-color: var(--vp-danger); box-shadow: 0 0 0 1px rgba(255, 90, 106, .35) inset; }
.ab .head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.ab .name { font: 14px/1 var(--vp-font-pixel); color: var(--vp-ink); letter-spacing: .04em; }
.ab .stats { font: 11px/1.2 ui-monospace, monospace; color: var(--vp-ink-dim); margin: 0 0 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ab .head .play { margin-left: auto; }
.ab .badge { font: 700 10px/1 var(--vp-font-ui); letter-spacing: .1em; padding: 3px 5px; border-radius: 2px; background: rgba(111, 240, 166, .14); color: var(--vp-hp); }
.ab .badge.fail { background: rgba(255, 90, 106, .18); color: var(--vp-danger); }
.ab .badge.warn { background: rgba(255, 197, 96, .16); color: var(--vp-amber); }
.ab canvas { display: block; width: 100%; image-rendering: auto; border-radius: 2px; }
.ab .play { padding: 4px 9px; font-size: 11px; }
.ab .legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: var(--vp-ink-dim); margin: 0 0 8px; }
.ab .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.ab .meta { font-size: 11px; color: var(--vp-ink-faint); margin-top: 6px; }
@media (max-width: 620px) { .ab h1 { font-size: 20px; } .ab canvas.roll { height: 120px; } .ab .stats { white-space: normal; } }
`);

// ------------------------------------------------------------------ analysis

const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const fmt = (x) => (Number.isFinite(x) ? x.toFixed(1) : '-inf');

function analyze(buf, { skip = 0 } = {}) {
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  const n = L.length;
  let peak = 0;
  let clips = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    if (a > peak) peak = a;
    if (a >= 0.999) clips++;
  }
  // active region: where the signal is within 50 dB of its peak
  const floor = peak * 0.00316;
  let first = 0;
  let last = n - 1;
  while (first < n && Math.abs(L[first]) < floor && Math.abs(R[first]) < floor) first++;
  while (last > first && Math.abs(L[last]) < floor && Math.abs(R[last]) < floor) last--;
  const from = Math.max(first, Math.floor(skip * buf.sampleRate));
  let sum = 0;
  for (let i = from; i <= last; i++) sum += L[i] * L[i] + R[i] * R[i];
  const rms = Math.sqrt(sum / Math.max(1, 2 * (last - from + 1)));
  // loudest 50 ms window (short-term level, a better "how loud does it feel" for sfx)
  const win = Math.floor(0.05 * buf.sampleRate);
  let best = 0;
  for (let s = 0; s + win < n; s += win >> 1) {
    let w = 0;
    for (let i = s; i < s + win; i++) w += L[i] * L[i] + R[i] * R[i];
    if (w > best) best = w;
  }
  return {
    peakDb: db(peak), rmsDb: db(rms), shortDb: db(Math.sqrt(best / (2 * win))),
    dur: (last - first) / buf.sampleRate, clips,
  };
}

// ------------------------------------------------------------------ drawing

const fftN = 1024;
const re = new Float32Array(fftN);
const im = new Float32Array(fftN);
const hann = Float32Array.from({ length: fftN }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (fftN - 1)));

function fft(xr, xi) {
  const n = xr.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [xr[i], xr[j]] = [xr[j], xr[i]];
      [xi[i], xi[j]] = [xi[j], xi[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = xr[b] * cr - xi[b] * ci;
        const ti = xr[b] * ci + xi[b] * cr;
        xr[b] = xr[a] - tr; xi[b] = xi[a] - ti;
        xr[a] += tr; xi[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

// heat palette: void -> indigo -> cyan -> amber -> white
const HEAT = [[5, 7, 13], [36, 26, 92], [24, 120, 190], [96, 226, 255], [255, 190, 90], [255, 248, 230]];
function heat(v) {
  const x = Math.min(0.999, Math.max(0, v)) * (HEAT.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = HEAT[i];
  const b = HEAT[i + 1];
  return `rgb(${a[0] + (b[0] - a[0]) * f | 0},${a[1] + (b[1] - a[1]) * f | 0},${a[2] + (b[2] - a[2]) * f | 0})`;
}

/**
 * Mirrored peak envelope. 'db' scale (-48..0 dBFS) keeps quiet ticks and long tails readable (sfx);
 * 'linear' shows the dynamics of dense music.
 */
function drawWave(cv, buf, color, scale = 'db') {
  const W = cv.width;
  const H = cv.height;
  const g = cv.getContext('2d');
  g.fillStyle = '#060a14';
  g.fillRect(0, 0, W, H);
  const mid = H / 2;
  const toY = scale === 'db' ? (a) => Math.max(0, (db(a) + 48) / 48) * (mid - 1) : (a) => Math.min(1, a * 2) * (mid - 1);
  g.fillStyle = 'rgba(140,214,255,.12)';
  for (const d of [-6, -12, -24]) {
    const y = toY(10 ** (d / 20));
    g.fillRect(0, mid - y, W, 1);
    g.fillRect(0, mid + y, W, 1);
  }
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  const per = L.length / W;
  g.fillStyle = color;
  for (let x = 0; x < W; x++) {
    let pk = 0;
    const e = Math.min(L.length, Math.floor((x + 1) * per));
    for (let i = Math.floor(x * per); i < e; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    const y = toY(pk);
    if (y > 0) g.fillRect(x, mid - y, 1, y * 2);
  }
}

function drawSpectrogram(cv, buf) {
  const W = cv.width;
  const H = cv.height;
  const g = cv.getContext('2d');
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  const bands = 32;
  const lo = Math.log(50);
  const hi = Math.log(16000);
  const binHz = buf.sampleRate / fftN;
  const bh = H / bands;
  const cols = Math.floor(W / 2);
  const mags = new Float32Array(cols * bands);
  let top = 1e-9;
  for (let c = 0; c < cols; c++) {
    const center = Math.floor((c / cols) * L.length);
    for (let i = 0; i < fftN; i++) {
      const k = center - fftN / 2 + i;
      re[i] = k >= 0 && k < L.length ? (L[k] + R[k]) * 0.5 * hann[i] : 0;
      im[i] = 0;
    }
    fft(re, im);
    for (let b = 0; b < bands; b++) {
      const k0 = Math.max(1, Math.floor(Math.exp(lo + ((hi - lo) * b) / bands) / binHz));
      const k1 = Math.max(k0 + 1, Math.ceil(Math.exp(lo + ((hi - lo) * (b + 1)) / bands) / binHz));
      let m = 0;
      for (let k = k0; k < k1 && k < fftN / 2; k++) m = Math.max(m, Math.hypot(re[k], im[k]));
      mags[c * bands + b] = m;
      if (m > top) top = m;
    }
  }
  const topDb = db(top);
  for (let c = 0; c < cols; c++) {
    for (let b = 0; b < bands; b++) {
      g.fillStyle = heat((db(mags[c * bands + b]) - topDb + 66) / 66);
      g.fillRect(c * 2, H - (b + 1) * bh, 2, Math.ceil(bh));
    }
  }
}

// Piano roll of a whole track straight from the compiled note data (intro + one loop), motifs marked in gold.
const ROLL = {
  pad: '#5b4fa8', choir: '#d9a94a', swell: '#b48cff', bass: '#4fd889', harp: '#3fd6d2', arp: '#3fd6d2', stab: '#ff63b6',
  bell: '#7fe3ff', lead: '#ffc560',
};
const LAYERS = ['pad', 'swell', 'choir', 'bass', 'harp', 'arp', 'stab', 'bell', 'lead'];
const MOTIF_COLOR = '#ff6fd8';

function drawRoll(cv, c, hits) {
  const order = [...c.intro, ...c.loop];
  let labelEnd = -Infinity; // motif labels never overlap: a crowded marker keeps its line and drops its text
  const total = order.reduce((n, k) => n + c.parts[k].steps.length, 0);
  const W = cv.width;
  const H = cv.height;
  const g = cv.getContext('2d');
  g.fillStyle = '#060a14';
  g.fillRect(0, 0, W, H);
  const drumH = 14;
  const top = 22;
  let lo = 127;
  let hi = 0;
  for (const k of order) {
    for (const evs of c.parts[k].steps) {
      for (const e of evs) {
        if (e.m == null) continue;
        for (const m of [].concat(e.m)) { lo = Math.min(lo, m); hi = Math.max(hi, m); }
      }
    }
  }
  lo -= 2;
  hi += 3;
  const noteH = (H - drumH - 4 - top) / (hi - lo);
  const y = (m) => H - drumH - 4 - (m - lo + 1) * noteH;
  const sx = W / total;
  let at = 0;
  for (const k of order) {
    const part = c.parts[k];
    g.fillStyle = 'rgba(140,214,255,.07)';
    for (let b = 0; b < part.bars; b++) g.fillRect((at + b * part.barSteps) * sx, top, 1, H - top);
    g.fillStyle = 'rgba(140,214,255,.5)';
    g.fillRect(at * sx, 0, 1, H);
    g.font = '600 15px ui-monospace, monospace';
    g.fillText(k, at * sx + 6, 16);
    for (const layer of LAYERS) {
      part.steps.forEach((evs, s) => {
        for (const e of evs) {
          if (e.b !== layer) continue;
          const notes = Array.isArray(e.m) ? e.m : [e.m];
          g.fillStyle = ROLL[layer];
          g.globalAlpha = layer === 'pad' || layer === 'swell' ? 0.45 : layer === 'stab' || layer === 'choir' ? 0.8 : 1;
          const tall = layer === 'lead' || layer === 'bell' ? 2.2 : 1;
          // a ratchet (stutter) draws each of its hits; the last one carries the note's extension
          const hits = e.rat ? Array.from({ length: e.rat }, (_, h) => [h * e.span / e.rat, h === e.rat - 1 ? e.len - h * e.span / e.rat : e.span / e.rat]) : [[0, e.len]];
          for (const m of notes) {
            for (const [off, len] of hits) g.fillRect((at + s + off) * sx, y(m) - (tall - 1) * noteH * 0.5, Math.max(1.5, len * sx - 1), Math.max(2, noteH * tall));
          }
        }
      });
    }
    g.globalAlpha = 1;
    part.steps.forEach((evs, s) => {
      for (const e of evs) {
        if (e.i === 'kick') { g.fillStyle = '#ff5a6a'; g.fillRect((at + s) * sx, H - drumH, 1.5, drumH * e.v); }
        else if (e.i === 'snare' || e.i === 'tom') { g.fillStyle = '#ffe066'; g.fillRect((at + s) * sx, H - drumH * 0.75, 1.5, drumH * 0.75 * e.v); }
        else if (e.i === 'hat' || e.i === 'ohat') { g.fillStyle = 'rgba(233,242,255,.5)'; g.fillRect((at + s) * sx, H - drumH * 0.4, 1, drumH * 0.4 * e.v); }
      }
    });
    // motif markers: a gold flag at the bar where each statement starts
    for (const h of hits.filter((x) => x.part === k)) {
      const x = (at + (h.bar - 1) * part.barSteps) * sx;
      g.fillStyle = MOTIF_COLOR;
      g.fillRect(x, top - 4, 2, H - top - drumH);
      g.font = '700 13px ui-monospace, monospace';
      const label = `♪ ${h.motif} (${h.line})`;
      if (x + 5 > labelEnd) {
        g.fillText(label, x + 5, top + 9);
        labelEnd = x + 5 + g.measureText(label).width + 8;
      }
    }
    at += part.steps.length;
  }
}

// ------------------------------------------------------------------ page

const root = el('div', { class: 'ab' });
document.body.appendChild(root);
document.getElementById('vp-boot')?.classList.add('vp-hide');

const status = el('span', { class: 'chip', text: 'rendering...' });
const chips = el('div', { class: 'chips' }, [status]);

function liveButton(label, fn) {
  return el('button', { text: label, onclick: () => { audio.init(); fn(); } });
}

const musicButtons = TRACK_NAMES.map((name) => {
  const b = liveButton(`♪ ${name}`, () => { audio.music(name); refreshButtons(); });
  b.dataset.track = name;
  return b;
});
const muteBtn = liveButton('mute', () => { audio.toggleMute(); refreshButtons(); });
function refreshButtons() {
  for (const b of musicButtons) b.classList.toggle('on', audio.track === b.dataset.track);
  muteBtn.textContent = audio.muted ? 'unmute' : 'mute';
  muteBtn.classList.toggle('on', audio.muted);
}

const combo = [
  [0, 'encounter'], [1400, 'cursor'], [1550, 'cursor'], [1700, 'confirm'], [2000, 'boost', { pitch: 1 }], [2350, 'boost', { pitch: 2 }],
  [2700, 'boost', { pitch: 3 }], [3100, 'slash'], [3180, 'impact'], [3180, 'weak'], [3200, 'shieldCrack'], [3500, 'slash'],
  [3580, 'impact'], [3580, 'weak'], [3600, 'shieldCrack'], [3900, 'thrust'], [3960, 'impact'], [3960, 'weak'], [3960, 'break'],
  [5200, 'shot'], [5260, 'crit'], [5700, 'enemyBeam'], [6900, 'heal'],
];
const comboBtn = liveButton('battle combo', () => {
  audio.music('battle');
  refreshButtons();
  for (const [ms, name, opts] of combo) setTimeout(() => audio.sfx(name, opts), ms);
});
// the chapter card as the game plays it: the sting over the current track, the 'card' shing as the title lands
const cardBtn = liveButton('chapter card', () => {
  audio.music('sting_chapter');
  audio.sfx('card');
  setTimeout(() => audio.sfx('card'), 1150);
});

const sliders = ['master', 'music', 'sfx'].map((k) => {
  const input = el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: audio.volume[k] });
  input.addEventListener('input', () => { audio.init(); audio.setVolume({ [k]: Number(input.value) }); });
  return el('label', {}, [k, input]);
});

root.append(
  el('h1', { text: 'VOIDPATH AUDIO' }),
  el('div', { class: 'sub', text: 'Every sound is synthesised live with WebAudio: no samples. Strips are offline renders through the real mix bus (reverb, delay, limiter). Music strips cover the intro and one whole loop; waveforms are linear (full height = -6 dBFS), sfx waveforms are peak envelopes in dB (guides at -6, -12, -24 dBFS). Spectrograms span 50 Hz to 16 kHz. A track passes when nothing clips and its loop RMS sits within 2 dB of both explore and battle.' }),
  el('div', { class: 'bar' }, [...musicButtons, liveButton('■ stop', () => { audio.music(null); refreshButtons(); }), comboBtn, cardBtn, muteBtn, ...sliders]),
  chips,
);

const rollGrid = el('div', { class: 'grid', style: { gridTemplateColumns: '1fr' } });
const legend = el('div', { class: 'legend' }, Object.entries({ lead: 'lead', bell: 'bell / music box', choir: 'choir', pad: 'pad chords', swell: 'swell', bass: 'bass / sub', arp: 'arp / harp', stab: 'stabs' })
  .map(([k, label]) => el('span', {}, [el('i', { style: { background: ROLL[k] } }), label]))
  .concat([[MOTIF_COLOR, 'motif statement'], ['#ff5a6a', 'kick'], ['#ffe066', 'snare / toms'], ['rgba(233,242,255,.5)', 'hats']].map(([c, label]) => el('span', {}, [el('i', { style: { background: c } }), label]))));
const musicGrid = el('div', { class: 'grid', style: { gridTemplateColumns: '1fr' } });
const sfxGrid = el('div', { class: 'grid' });
root.append(el('h2', { text: 'Scores (intro + one full loop, from the track data)' }), legend, rollGrid,
  el('h2', { text: 'Music renders (intro + one full loop)' }), musicGrid, el('h2', { text: `Sound effects (${sfxRuns.length})` }), sfxGrid);

function makeCard(grid, title, playFn, w, h1, h2) {
  const wave = el('canvas', { width: w, height: h1 });
  const spec = el('canvas', { width: w, height: h2 });
  const badge = el('span', { class: 'badge', text: '...' });
  const stats = el('div', { class: 'stats', text: '' });
  const meta = el('div', { class: 'meta' });
  const card = el('div', { class: 'card' }, [
    el('div', { class: 'head' }, [el('span', { class: 'name', text: title }), badge, liveButton('▶', playFn)]),
    stats, wave, spec, meta,
  ]);
  card.querySelector('button').classList.add('play');
  grid.appendChild(card);
  return { card, wave, spec, badge, stats, meta };
}

function verdict(ui, problems, warns) {
  const fail = problems.length > 0;
  ui.card.classList.toggle('fail', fail);
  ui.badge.className = `badge${fail ? ' fail' : warns.length ? ' warn' : ''}`;
  ui.badge.textContent = fail ? problems.join(' ') : warns.length ? warns.join(' ') : 'OK';
}

/** RMS in dBFS of a buffer between two times (seconds). */
function rmsDb(buf, t0, t1) {
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  const a = Math.max(0, Math.floor(t0 * buf.sampleRate));
  const b = Math.min(L.length, Math.floor(t1 * buf.sampleRate));
  let sum = 0;
  for (let i = a; i < b; i++) sum += L[i] * L[i] + R[i] * R[i];
  return db(Math.sqrt(sum / Math.max(1, 2 * (b - a))));
}

const describe = (tr, c) => [tr.key, `${tr.bpm} bpm`, tr.meter || '4/4', c.once ? 'once' : `${c.loopBars}-bar loop (${c.loopSeconds.toFixed(1)} s)`]
  .filter(Boolean).join(' · ');

function rollCard(name, c, hits) {
  const cv = el('canvas', { class: 'roll', width: 2200, height: 190 });
  const motifs = TRACKS[name].motifs || [];
  rollGrid.appendChild(el('div', { class: 'card', id: `roll-${name}` }, [
    el('div', { class: 'head' }, [el('span', { class: 'name', text: name }), el('span', { class: 'stats', text: describe(TRACKS[name], c) }),
      motifs.length ? el('span', { class: `badge${motifs.every((m) => hits.some((h) => h.motif === m)) ? '' : ' fail'}`, text: `motif ${motifs.join(', ')}` }) : null,
      liveButton('▶', () => { audio.music(name); refreshButtons(); })]),
    cv,
  ]));
  drawRoll(cv, c, hits);
}

async function renderTrack(name, c, refs) {
  const tr = TRACKS[name];
  const ui = makeCard(musicGrid, name, () => { audio.music(name); refreshButtons(); }, 2200, 110, 110);
  ui.card.id = `music-${name}`;
  status.textContent = `rendering ${name}...`;
  const seconds = c.introSeconds + c.loopSeconds;
  const buf = await renderOffline('music', name, { seconds: seconds + (c.once ? 2.5 : 0), sampleRate: SR }); // a sting rings on
  const a = analyze(buf);
  // the loop's level, and each section's, measured on the loop that follows the intro
  const t0 = c.once ? 0 : c.introSeconds;
  const loopRms = c.once ? a.rmsDb : rmsDb(buf, t0, seconds);
  const barSec = c.barSteps * c.stepDur;
  let at = t0;
  const sections = c.loop.map((k) => {
    const len = c.parts[k].bars * barSec;
    const row = { part: k, rmsDb: +fmt(rmsDb(buf, at, at + len)) };
    at += len;
    return row;
  });
  drawWave(ui.wave, buf, '#7fe3ff', 'linear');
  drawSpectrogram(ui.spec, buf);
  const problems = [];
  if (a.peakDb < LIMITS.silentDb) problems.push('SILENT');
  if (a.peakDb > LIMITS.clipDb) problems.push('CLIP');
  const off = refs.map((r) => loopRms - r);
  if (off.some((d) => d > LIMITS.refDb)) problems.push('LOUD');
  if (off.some((d) => d < -LIMITS.refDb)) problems.push('QUIET');
  verdict(ui, problems, []);
  ui.stats.textContent = `peak ${fmt(a.peakDb)} dB · loop rms ${fmt(loopRms)} dB (${off.map((d) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}`).join(' / ')} vs ${REFS.join(' / ')}) · sections ${sections.map((x) => `${x.part} ${fmt(x.rmsDb)}`).join(', ')}`;
  ui.meta.textContent = `${describe(tr, c)}${c.intro.length ? ` after a ${c.introSeconds.toFixed(1)} s intro` : ''} · sections ${[...c.intro, ...c.loop].join(' ')}`;
  const row = { name, peakDb: +fmt(a.peakDb), rmsDb: +fmt(loopRms), sections, loopBars: c.loopBars, loopSeconds: +c.loopSeconds.toFixed(1), ok: !problems.length, problems };
  if (stemJobs.includes(name)) {
    // each line solo over the loop (the intro skipped): how loud the melody sits over its accompaniment
    const lines = [...new Set(c.loop.flatMap((k) => c.parts[k].steps.flat().map((e) => e.i)))];
    row.stems = {};
    for (const line of lines) {
      status.textContent = `rendering ${name} / ${line}...`;
      const stem = await renderOffline('music', name, { seconds: c.loopSeconds, sampleRate: 22050, part: c.loop[0], only: [line] }); // balance only: half rate for speed
      row.stems[line] = +fmt(rmsDb(stem, 0, c.loopSeconds));
    }
    ui.meta.textContent += ` \u00b7 stems ${Object.entries(row.stems).map(([k, v]) => `${k} ${v}`).join(', ')}`;
  }
  return row;
}

async function run() {
  const report = { sfx: [], music: [], motifs: {}, failures: [], limits: LIMITS, refs: {} };
  const tracks = [];
  for (const name of trackJobs) {
    const c = compiledTrack(name); // null (and a console.error) for a malformed track
    if (!c) {
      report.failures.push(`${name}: malformed`);
      continue;
    }
    const motifs = TRACKS[name].motifs || [];
    const hits = motifs.flatMap((m) => findMotif(c, m).map((h) => ({ ...h, motif: m })));
    report.motifs[name] = Object.fromEntries(motifs.map((m) => [m, hits.filter((h) => h.motif === m).map((h) => `${h.line} ${h.part}:${h.bar}`)]));
    for (const m of motifs) if (!hits.some((h) => h.motif === m)) report.failures.push(`${name}: motif ${m} missing`);
    rollCard(name, c, hits);
    tracks.push([name, c]);
  }

  // the references first: every other track is measured against them
  const refs = [];
  for (const [name, c] of tracks.filter(([n]) => REFS.includes(n))) {
    const row = await renderTrack(name, c, []);
    report.refs[name] = row.rmsDb;
    refs.push(row.rmsDb);
    report.music.push(row);
  }
  for (const [name, c] of tracks.filter(([n]) => !REFS.includes(n))) {
    const row = await renderTrack(name, c, refs);
    report.music.push(row);
    if (!row.ok) report.failures.push(`${name}: ${row.problems.join(',')}`);
  }

  for (const [label, name, opts] of sfxRuns) {
    const ui = makeCard(sfxGrid, label, () => audio.sfx(name, name === 'boost' ? { pitch: 1 + Math.floor(Math.random() * 3) } : opts), 560, 64, 56);
    ui.card.id = `sfx-${label.replace(/\W+/g, '-')}`;
    status.textContent = `rendering ${label}...`;
    const buf = await renderOffline('sfx', name, { seconds: SFX_SECONDS[name] || 1.4, sampleRate: SR, opts });
    const a = analyze(buf);
    drawWave(ui.wave, buf, '#ffc560');
    drawSpectrogram(ui.spec, buf);
    const problems = [];
    const warns = [];
    if (a.peakDb < LIMITS.silentDb) problems.push('SILENT');
    if (a.peakDb > LIMITS.clipDb) problems.push('CLIP');
    if (a.peakDb > -3) warns.push('HOT');
    verdict(ui, problems, warns);
    ui.stats.textContent = `pk ${fmt(a.peakDb)} · st ${fmt(a.shortDb)} · ${a.dur.toFixed(2)}s`;
    const row = { name: label, peakDb: +fmt(a.peakDb), shortDb: +fmt(a.shortDb), rmsDb: +fmt(a.rmsDb), dur: +a.dur.toFixed(2), ok: !problems.length };
    report.sfx.push(row);
    if (problems.length) report.failures.push(`${label}: ${problems.join(',')}`);
  }

  const sfxPeaks = report.sfx.map((r) => r.peakDb);
  const musicRms = report.music.map((r) => r.rmsDb);
  report.summary = {
    sfxOk: report.sfx.filter((r) => r.ok).length,
    sfxTotal: report.sfx.length,
    musicOk: report.music.filter((r) => r.ok).length,
    musicTotal: report.music.length,
    sfxPeakMax: sfxPeaks.length ? Math.max(...sfxPeaks) : null,
    sfxPeakMin: sfxPeaks.length ? Math.min(...sfxPeaks) : null,
    musicRmsRange: musicRms.length ? [Math.min(...musicRms), Math.max(...musicRms)] : null,
  };
  const s = report.summary;
  status.remove();
  const chip = (ok, label, value) => el('span', { class: `chip${ok == null ? '' : ok ? ' good' : ' bad'}` }, [label, el('b', { text: value })]);
  chips.append(
    chip(s.sfxOk === s.sfxTotal, 'sfx ', `${s.sfxOk}/${s.sfxTotal} pass`),
    chip(s.musicOk === s.musicTotal, 'music ', `${s.musicOk}/${s.musicTotal} pass`),
    chip(Object.values(report.motifs).every((m) => Object.values(m).every((l) => l.length)), 'motifs ', `${Object.values(report.motifs).reduce((n, m) => n + Object.keys(m).length, 0)} found`),
    chip(null, 'reference rms ', REFS.map((r) => `${r} ${fmt(report.refs[r])}`).join(' · ')),
  );
  if (s.sfxPeakMin != null) chips.append(chip(null, 'sfx peaks ', `${fmt(s.sfxPeakMin)} .. ${fmt(s.sfxPeakMax)} dBFS`));
  if (s.musicRmsRange) chips.append(chip(null, 'music rms ', `${fmt(s.musicRmsRange[0])} .. ${fmt(s.musicRmsRange[1])} dBFS`));
  console.table(report.music);
  console.table(report.sfx);
  if (report.failures.length) console.warn('[audio bench] failures:', report.failures.join('; '));
  window.__PREVIEW = { ready: true, report };
}

window.__audio = audio;
run().catch((e) => {
  status.textContent = `bench failed: ${e.message}`;
  status.classList.add('bad');
  console.error(e);
  window.__PREVIEW = { ready: true, report: { error: String(e && e.stack || e) } };
});
