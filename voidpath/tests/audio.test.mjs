// Audio data and API checks (TECH_PLAN 9, and the C9 acceptance of section 13): every track compiles, loops
// are whole bars, the motifs of the section 9 table are present, stings are `once`, a malformed track fails
// alone, the new sfx exist and nothing throws before init(). Runs in node: audio.js touches no WebAudio at
// module level. Levels, renders and piano rolls are the preview bench's job (src/tools/preview-audio.js).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  audio, compileTrack, compiledTrack, findMotif, noteMidi, startTrack, pumpTrack, MOTIFS, TRACKS, TRACK_NAMES, SFX_NAMES,
} from '../src/core/audio.js';

// The POC tracks keep their shorter loops ("keep" in the section 9 table).
const POC_TRACKS = new Set(['title', 'explore', 'battle', 'boss', 'victory']);

// Section 9: tempo and metre per track id (tracks of later sub-waves are checked once they exist). The Choir
// is "free": it has no pulse, so only its tempo is pinned.
const TEMPO = {
  battle_2: [148, '4/4'], driftmarket: [92, '6/8'], shoals: [70, '4/4'], meridian: [60, '4/4'], arboretum: [84, '3/4'], choir: [56, null],
  spire: [112, '4/4'], vault: [120, '7/8'], heart: [66, '4/4'], warden: [72, '3/4'], final_boss: [132, '7/8'],
  final_boss_2: [144, '6/8'], lullaby: [76, '3/4'], ione: [80, '4/4'],
};

// Section 9: the motifs a track must carry, plus the C9-gamma brief: the WARDEN theme and the lullaby fight in
// final_boss, Theo's figure rises in final_boss_2, the credits recall WARDEN and the Choir too.
const MOTIF_TABLE = [
  ['title', 'lullaby'],
  ['driftmarket', 'ringborn'], ['meridian', 'ringborn'], ['arboretum', 'lullaby'], ['choir', 'choir'],
  ['vault', 'lullaby'], ['heart', 'warden'], ['warden', 'warden'], ['final_boss', 'warden'],
  ['final_boss_2', 'lullaby'], ['final_boss_2', 'choir'], ['lullaby', 'lullaby'], ['ione', 'ringborn'], ['ione', 'lullaby'],
  ['credits', 'lullaby'], ['credits', 'ringborn'],
  ['spire', 'warden:inverted'], // the WARDEN theme inverted in the alarm figure
  ['heart', 'choir'], ['final_boss', 'lullaby'], ['final_boss_2', 'theo'], ['credits', 'warden'], ['credits', 'choir'],
];

const NEW_SFX = ['emote', 'splash', 'valve', 'laser_on', 'laser_off', 'shard', 'transform', 'summon', 'submerge', 'emerge',
  'sleep', 'wake', 'buy', 'sell', 'equip', 'travel', 'rumble', 'choir', 'glitch', 'page', 'unlock', 'card', 'alarm', 'lift',
  'pod_flip', 'awaken', 'skip'];
const CONTRACT_SFX = ['cursor', 'confirm', 'cancel', 'error', 'menuOpen', 'menuClose', 'step', 'door', 'pickup', 'talk', 'text',
  'save', 'heal', 'encounter', 'slash', 'thrust', 'shot', 'punch', 'cast', 'impact', 'crit', 'weak', 'shieldCrack', 'break',
  'recover', 'buff', 'debuff', 'boost', 'boostDown', 'enemyShot', 'enemyMelee', 'enemyBeam', 'charge', 'ko', 'defend', 'flee',
  'victory', 'levelup', 'gameover'];

/** Swallow console.error while fn runs; returns the messages. */
function captureErrors(fn) {
  const seen = [];
  const orig = console.error;
  console.error = (...args) => seen.push(args.join(' '));
  try { fn(); } finally { console.error = orig; }
  return seen;
}

test('every track compiles', () => {
  for (const name of TRACK_NAMES) {
    assert.doesNotThrow(() => compileTrack(TRACKS[name], name), name);
    assert.ok(compiledTrack(name), `${name} compiles on the runtime path`);
  }
});

test('loops are whole bars, and new loops run 32 bars or more', () => {
  for (const name of TRACK_NAMES) {
    const c = compileTrack(TRACKS[name], name);
    assert.ok(Number.isInteger(c.loopBars) && c.loopBars >= 1, `${name} loop bars`);
    for (const [k, part] of Object.entries(c.parts)) {
      assert.equal(part.steps.length, part.bars * part.barSteps, `${name}.${k} is ${part.bars} whole bars`);
      assert.ok(Math.abs(part.seconds - part.steps.length * part.stepDur) < 1e-9, `${name}.${k} lasts its whole bars`);
    }
    const sum = c.loop.reduce((t, k) => t + c.parts[k].bars * c.parts[k].barSteps * c.parts[k].stepDur, 0);
    assert.ok(Math.abs(c.loopSeconds - sum) < 1e-9, `${name} loop length is a whole number of bars`);
    if (!POC_TRACKS.has(name) && !c.once) assert.ok(c.loopBars >= 32, `${name}: ${c.loopBars}-bar loop (32+)`);
    if (name === 'credits') assert.ok(c.introSeconds + c.loopSeconds >= 120, 'credits run 2+ minutes');
  }
});

test('metres map to steps per bar and tempo as documented', () => {
  const bar = (meter, bpm = 60) => compileTrack({ bpm, meter, loop: ['A'], parts: { A: { bars: 1 } } }, meter);
  assert.equal(bar('4/4').barSteps, 16);
  assert.equal(bar('3/4').barSteps, 12);
  assert.equal(bar('6/8').barSteps, 12);
  assert.equal(bar('7/8').barSteps, 14);
  // quarter = bpm in simple metres; dotted quarter = bpm in compound ones
  assert.ok(Math.abs(bar('3/4', 60).loopSeconds - 3) < 1e-9);
  assert.ok(Math.abs(bar('6/8', 60).loopSeconds - 2) < 1e-9);
  assert.ok(Math.abs(bar('7/8', 60).loopSeconds - 3.5) < 1e-9);
});

test('a part may set its own tempo and metre (a suite); a bad part tempo or metre fails naming the part', () => {
  const c = compileTrack({ bpm: 60, meter: '3/4', loop: ['A', 'B'], parts: { A: { bars: 2 }, B: { bars: 1, bpm: 120, meter: '7/8', bell: 'C5 . . . . . .' } } }, 'suite');
  assert.deepEqual([c.parts.A.barSteps, c.parts.B.barSteps], [12, 14]);
  assert.ok(Math.abs(c.parts.A.seconds - 6) < 1e-9 && Math.abs(c.parts.B.seconds - 1.75) < 1e-9);
  assert.ok(Math.abs(c.loopSeconds - 7.75) < 1e-9);
  assert.equal(c.loopBars, 3);
  assert.throws(() => compileTrack({ bpm: 60, loop: ['A'], parts: { A: { bars: 1, bpm: -1 } } }, 'suite'), /suite\.A: bpm/);
  assert.throws(() => compileTrack({ bpm: 60, loop: ['A'], parts: { A: { bars: 1, meter: '5/16' } } }, 'suite'), /suite\.A: bad meter/);
});

test('the sequencer times each part at its own tempo and re-syncs the echo when the tempo changes', () => {
  // a rig with no WebAudio: gains are inert and `only: []` plays no line, so only the clock runs
  const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ gain: param(), connect: (x) => x, disconnect() {} });
  const bus = () => ({ dry: node(), wet: node(), echo: node() });
  const delays = [];
  const rig = { ctx: { createGain: node }, music: bus(), bed: bus(), setDelay: (sec, when) => delays.push([+sec.toFixed(4), +when.toFixed(4)]) };
  const c = compiledTrack('credits');
  const rt = startTrack(rig, 'credits', 0, { only: [] });
  const [L, T] = c.loop;
  pumpTrack(rt, c.parts[L].seconds + 0.001);
  assert.equal(rt.seqIdx, 1, `${L} is done after its own ${c.parts[L].seconds.toFixed(2)} s`);
  assert.ok(Math.abs(rt.next - (c.parts[L].seconds + c.parts[T].stepDur)) < 1e-6, `${T} steps at its own tempo`);
  const tempo = (k) => TRACKS.credits.parts[k].bpm ?? TRACKS.credits.bpm;
  assert.deepEqual(delays.map((d) => d[0]), [0.75 * 60 / tempo(L), 0.75 * 60 / tempo(T)].map((x) => +x.toFixed(4)), 'the echo follows each part');
  pumpTrack(rt, c.loopSeconds + 0.001);
  assert.equal(rt.seqIdx, c.loop.length, 'one whole loop takes loopSeconds');
});

test('section 9 tempos and metres; locations never share key and tempo', () => {
  for (const [name, [bpm, meter]] of Object.entries(TEMPO)) {
    if (!TRACKS[name]) continue;
    assert.equal(TRACKS[name].bpm, bpm, `${name} bpm`);
    if (meter) assert.equal(TRACKS[name].meter || '4/4', meter, `${name} meter`);
  }
  const located = Object.keys(TEMPO).filter((n) => TRACKS[n] && !['battle_2', 'final_boss', 'final_boss_2'].includes(n));
  for (const a of located) {
    for (const b of located) {
      if (a < b) assert.ok(TRACKS[a].key !== TRACKS[b].key || TRACKS[a].bpm !== TRACKS[b].bpm, `${a} / ${b} share key and tempo`);
    }
  }
});

for (const [name, motif] of MOTIF_TABLE) {
  test(`${name} carries the ${motif} motif`, () => {
    const hits = findMotif(compileTrack(TRACKS[name], name), motif);
    assert.ok(hits.length > 0, `${name} lacks MOTIFS.${motif}`);
    assert.ok((TRACKS[name].motifs || []).includes(motif), `${name} lists ${motif} in its motifs`);
  });
}

test('every motif a track lists is present in its notes', () => {
  for (const name of TRACK_NAMES) {
    for (const m of TRACKS[name].motifs || []) {
      assert.ok(MOTIFS[m.split(':')[0]], `${name} lists unknown motif ${m}`);
      assert.ok(findMotif(compileTrack(TRACKS[name], name), m).length > 0, `${name} lists ${m} but never plays it`);
    }
  }
});

test('MOTIFS: the WARDEN theme is the lullaby in the parallel minor; the Choir motif is a chord', () => {
  const lullaby = MOTIFS.lullaby.map(noteMidi);
  const warden = MOTIFS.warden.map(noteMidi);
  assert.equal(warden.length, lullaby.length);
  // F major -> F minor: the third (A), sixth (D) and seventh (E) fall a semitone, everything else stays
  lullaby.forEach((m, i) => assert.equal(warden[i], [9, 2, 4].includes(m % 12) ? m - 1 : m, `note ${i + 1}`));
  for (const seq of Object.values(MOTIFS)) assert.ok(seq.every((n) => Number.isFinite(noteMidi(n))), 'note names');
  const choir = MOTIFS.choir.map(noteMidi);
  assert.ok(choir.length >= 3 && choir.every((m, i) => i === 0 || m > choir[i - 1]), 'the Choir motif is a chord voicing, low to high');
});

test('findMotif matches transposed statements with rests between notes, and nothing else', () => {
  const def = (bell) => ({ bpm: 90, loop: ['A'], parts: { A: { bars: 2, bell } } });
  // the Ringborn motif transposed to A (as the Meridian plays it), broken up by rests
  const hit = findMotif(compileTrack(def(['E5 . A5 G5 . E5 D5 .', 'B4 - . . A4 - - -'])), 'ringborn');
  assert.deepEqual(hit, [{ line: 'bell', part: 'A', bar: 1 }]);
  assert.equal(findMotif(compileTrack(def(['E5 . A5 G5 . E5 D5 .', 'C5 - . . A4 - - -'])), 'ringborn').length, 0);
  const chord = { bpm: 90, loop: ['A'], parts: { A: { bars: 1, chords: ['F1: F2 C3 G3 Bb3 D4'] } } };
  assert.equal(findMotif(compileTrack(chord), 'choir').length, 1, 'the Choir chord, transposed to F');
});

test('findMotif finds a motif upside down only when asked for the inversion', () => {
  const def = (lead) => ({ bpm: 112, loop: ['A'], parts: { A: { bars: 1, lead } } });
  // WARDEN is +4 +5 -2 -2 +2; the spire's alarm from C6 is -4 -5 +2 +2 -2
  const alarm = compileTrack(def('C6 . Ab5 . Eb5 . F5 . G5 . F5 . . . . .'));
  assert.deepEqual(findMotif(alarm, 'warden:inverted'), [{ line: 'lead', part: 'A', bar: 1 }]);
  assert.equal(findMotif(alarm, 'warden').length, 0);
  const upright = compileTrack(def('Eb4 . G4 . C5 . Bb4 . Ab4 . Bb4 . . . . .'));
  assert.equal(findMotif(upright, 'warden').length, 1);
  assert.equal(findMotif(upright, 'warden:inverted').length, 0);
  assert.throws(() => findMotif(alarm, 'choir:inverted'), /unknown motif/);
  assert.throws(() => findMotif(alarm, 'warden:backwards'), /unknown motif/);
});

test('ratchets retrigger a token inside its own span and keep its extensions', () => {
  const c = compileTrack({ bpm: 120, meter: '7/8', loop: ['A'], parts: { A: { bars: 1, bell: 'D#5*3 - - F#5 . . B5*2', hat: 'x*4 . . . . . . . . . . . . x*2' } } }, 'stutter');
  const evs = c.parts.A.steps.flat();
  const bell = evs.filter((e) => e.i === 'bell');
  assert.deepEqual(bell.map((e) => [e.m, e.len, e.rat ?? 1, e.span ?? e.len]), [[noteMidi('D#5'), 6, 3, 2], [noteMidi('F#5'), 2, 1, 2], [noteMidi('B5'), 2, 2, 2]]);
  assert.deepEqual(evs.filter((e) => e.i === 'hat').map((e) => e.rat), [4, 2]);
  // a stuttered statement still counts as the motif (repeats collapse)
  assert.equal(findMotif(compileTrack({ bpm: 76, meter: '3/4', loop: ['A'], parts: { A: { bars: 2, bell: ['A4*3 - C5*2', 'F5 E5*4 D5 E5 . .'] } } }), 'lullaby').length, 1);
  for (const bad of ['C5*1', 'C5*10', 'x*', '*3']) {
    assert.throws(() => compileTrack({ bpm: 90, loop: ['A'], parts: { A: { bars: 1, [bad.startsWith('x') ? 'hat' : 'bell']: bad } } }, 'wonky'), /bad (drum )?token/, bad);
  }
});

// Section 9: each C-beta location's lead instrument, as the track data names it.
test('section 9 leads: arboretum drips and hums, the choir sings, spire saws low strings, battle_2 drives, vault glitches', () => {
  const v = (name, line) => TRACKS[name].voices[line];
  const lines = (name) => new Set(Object.values(TRACKS[name].parts).flatMap((p) => Object.keys(p)));
  const tokens = (name) => Object.values(TRACKS[name].parts).flatMap((p) => Object.values(p)).flat().filter((x) => typeof x === 'string').join(' ');
  if (TRACKS.arboretum) {
    assert.equal(v('arboretum', 'arp').synth, 'drip');
    assert.equal(v('arboretum', 'pad').synth, 'choir');
    assert.equal(v('arboretum', 'pad').vowel, 'mm');
  }
  if (TRACKS.choir) {
    assert.equal(v('choir', 'pad').synth, 'choir');
    assert.ok(!['kick', 'snare', 'hat', 'ohat', 'tom'].some((d) => lines('choir').has(d)), 'the Choir has no pulse');
  }
  if (TRACKS.spire) {
    assert.equal(v('spire', 'bass').synth, 'strings');
    assert.ok(lines('spire').has('snare'));
  }
  if (TRACKS.battle_2) {
    assert.ok(v('battle_2', 'lead').drive > 0, 'driven saw lead');
    assert.ok(Object.values(TRACKS.battle_2.parts).some((p) => /R O R O/.test([].concat(p.bass).join(' '))), 'octave bass');
    assert.notEqual(TRACKS.battle_2.key, TRACKS.battle.key, 'distinct from battle');
  }
  if (TRACKS.vault) {
    assert.ok(v('vault', 'arp').spread && v('vault', 'arp').crush, 'detuned, crushed digital arps');
    assert.ok(/\*[2-9]/.test(tokens('vault')), 'glitch stutters');
  }
});

// Section 9 and the C9-gamma brief for the finale's tracks.
test('C-gamma leads: the heart ascends on choral pads, the Warden fights on organ and choir, Ione is pad and piano', () => {
  const v = (name, line) => TRACKS[name].voices[line];
  const c = (name) => compileTrack(TRACKS[name], name);
  const top = (chord) => Math.max(...chord.split(':')[1].trim().split(/\s+/).map(noteMidi));
  // the heart: choir pads whose ascent climbs bar by bar over the Ab pedal, the WARDEN theme sung
  assert.equal(v('heart', 'pad').synth, 'choir');
  const ascent = TRACKS.heart.parts.A.chords.map(top);
  assert.ok(ascent.every((m, i) => i === 0 || m > ascent[i - 1]), 'the ascent climbs');
  assert.ok(findMotif(c('heart'), 'warden').some((h) => h.line.startsWith('choir')), 'the choir sings the WARDEN theme');
  // form 1: organ-like pads (a square-wave pad on the stab line) and a hymn, the lullaby answering on another line
  for (const name of ['final_boss', 'final_boss_2']) {
    assert.equal(v(name, 'stab').synth, 'pad');
    assert.equal(v(name, 'stab').wave, 'square');
    assert.ok(Object.keys(TRACKS[name].voices).some((l) => l.startsWith('choir')), `${name} has a choir`);
  }
  const fb = c('final_boss');
  const lines = (motif) => new Set(findMotif(fb, motif).map((h) => h.line));
  assert.ok([...lines('lullaby')].every((l) => !lines('warden').has(l)), 'the lullaby and the WARDEN theme fight on different voices');
  // form 2: F minor, ending in F major on the Choir chord (an F 6/9)
  const f2 = TRACKS.final_boss_2;
  const last = f2.parts[f2.loop.at(-1)].chords.at(-1);
  assert.match(last, /^F1:/);
  const pcs = new Set(last.split(':')[1].trim().split(/\s+/).map((n) => noteMidi(n) % 12));
  assert.ok(pcs.has(9) && !pcs.has(8), 'the last chord is F major (A, not Ab)');
  assert.ok(f2.parts[f2.loop[0]].chords.some((ch) => /^F2: F3 Ab3/.test(ch)), 'it starts in F minor');
  // Ione: a warm pad and a piano
  assert.equal(v('ione', 'bell').synth, 'piano');
  assert.ok(!v('ione', 'pad').synth && v('ione', 'pad').cutoff < 1200, 'a warm pad');
});

test('the credits are a 2+ minute suite through every chapter, from F major to D major', () => {
  const tr = TRACKS.credits;
  const c = compileTrack(tr, 'credits');
  assert.ok(c.introSeconds + c.loopSeconds >= 120);
  const first = tr.parts[tr.loop[0]];
  const last = tr.parts[tr.loop.at(-1)];
  assert.match([].concat(first.chords[0])[0], /^F2:/, 'opens in F major');
  assert.match([].concat(last.chords.at(-1)).at(-1), /^D2:.*F#/, 'ends in D major');
  // each chapter's tempo and metre: title, driftmarket, arboretum, choir, spire, vault, warden, ione
  const tempos = tr.loop.map((k) => `${tr.parts[k].bpm ?? tr.bpm} ${tr.parts[k].meter ?? tr.meter}`);
  for (const name of ['title', 'driftmarket', 'arboretum', 'choir', 'spire', 'vault', 'warden', 'ione']) {
    const want = `${TRACKS[name].bpm} ${TRACKS[name].meter || '4/4'}`;
    assert.ok(tempos.includes(want) || (name === 'choir' && tempos.some((t) => t.startsWith('56 '))), `the credits visit ${name} (${want})`);
  }
});

test("WARDEN's choir sfx sings in the room's key: choirSfx chords parse and fit their track", () => {
  const pcs = (notes) => new Set(notes.map((n) => noteMidi(n) % 12));
  // the scale (pitch classes) each track's choirSfx must stay inside
  const SCALE = {
    choir: MOTIFS.choir, lullaby: ['F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5'], arboretum: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    spire: ['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4'], vault: ['B4', 'C#5', 'D#5', 'E#5', 'F#5', 'G#5', 'A#5'],
  };
  for (const name of TRACK_NAMES) {
    const set = TRACKS[name].choirSfx;
    if (!set) continue;
    assert.ok(Array.isArray(set) && set.length > 0, `${name} choirSfx`);
    for (const chord of set) {
      assert.ok(chord.length >= 3 && chord.every((n) => Number.isFinite(noteMidi(n))), `${name}: ${chord}`);
      if (SCALE[name]) {
        const scale = pcs(SCALE[name]);
        assert.ok([...pcs(chord)].every((pc) => scale.has(pc)), `${name}: ${chord} leaves the key`);
      }
    }
  }
  for (const name of ['choir', 'spire', 'lullaby']) if (TRACKS[name]) assert.ok(TRACKS[name].choirSfx, `WARDEN speaks over ${name}`);
  // over HALCYON's lullaby (the dreams) WARDEN keeps a minor colour: every chord holds a minor triad
  const minor = (chord) => {
    const p = new Set(chord.map((n) => noteMidi(n) % 12));
    return [...p].some((r) => p.has((r + 3) % 12) && p.has((r + 7) % 12));
  };
  assert.ok(TRACKS.lullaby.choirSfx.every(minor), 'minor colour over lullaby');
});

test("MOTIFS.theo is the lullaby's opening that climbs on instead of settling", () => {
  const lullaby = MOTIFS.lullaby.map(noteMidi);
  const theo = MOTIFS.theo.map(noteMidi);
  assert.deepEqual(theo.slice(0, 3), lullaby.slice(0, 3));
  assert.ok(theo.every((m, i) => i === 0 || m > theo[i - 1]), 'it only rises');
  // in final_boss_2 the child's voice states it from ever higher notes
  const starts = findMotif(compileTrack(TRACKS.final_boss_2, 'final_boss_2'), 'theo').filter((h) => h.line === 'choir3' && h.part === 'D');
  assert.ok(starts.length >= 3, 'three or more statements in the rise');
});

test('stings are once and every once track is a sting', () => {
  assert.ok(TRACKS.sting_chapter, 'sting_chapter exists');
  for (const name of TRACK_NAMES) {
    const c = compileTrack(TRACKS[name], name);
    assert.equal(c.once, name.startsWith('sting_'), `${name} once`);
  }
  const sting = compileTrack(TRACKS.sting_chapter, 'sting_chapter');
  assert.ok(sting.loopSeconds > 3 && sting.loopSeconds < 6, 'the chapter sting fits the ~4.5 s card');
});

test('a malformed track throws a message naming it, and fails alone at runtime', () => {
  const ok = { bpm: 90, loop: ['A'], parts: { A: { bars: 1, bell: 'C5 - - -' } } };
  const broken = [
    [{ ...ok, bpm: 0 }, /bpm/],
    [{ ...ok, meter: '5/16' }, /meter/],
    [{ ...ok, loop: ['B'] }, /unknown part "B"/],
    [{ ...ok, parts: { A: { bars: 1, bell: 'C5 - -' } } }, /3 tokens/],
    [{ ...ok, parts: { A: { bars: 1, bell: 'Q9 - - -' } } }, /bad token "Q9"/],
    [{ ...ok, parts: { A: { bars: 1, chords: ['C2 E3'] } } }, /bad chord/],
    [{ ...ok, parts: { A: { bars: 1.5 } } }, /whole number/],
    [{ ...ok, parts: { A: { bars: 1, kazoo: 'x' } } }, /unknown instrument "kazoo"/],
    [{ ...ok, voices: { bell: { synth: 'theremin' } } }, /unknown synth "theremin"/],
    [{ ...ok, meter: '3/4', parts: { A: { bars: 1, bell: 'C5 - - - - - - -' } } }, /8 tokens in a 12-step bar/],
  ];
  for (const [def, re] of broken) {
    assert.throws(() => compileTrack(def, 'wonky'), (e) => /wonky/.test(e.message) && re.test(e.message), re.source);
  }

  TRACKS.__wonky = { ...ok, parts: { A: { bars: 1, bell: 'Q9 - - -' } } };
  try {
    const before = audio.track;
    const errors = captureErrors(() => {
      assert.equal(compiledTrack('__wonky'), null);
      audio.music('__wonky');
    });
    assert.equal(errors.length, 1, 'reported once');
    assert.match(errors[0], /__wonky/);
    assert.equal(audio.track, before, 'a malformed track is ignored like an unknown one');
    assert.ok(compiledTrack('explore'), 'the other tracks keep working');
  } finally {
    delete TRACKS.__wonky;
  }
});

test('the new sfx exist and the contract sfx are kept', () => {
  for (const n of [...CONTRACT_SFX, ...NEW_SFX]) assert.ok(SFX_NAMES.includes(n), n);
});

test('nothing throws before init()', () => {
  assert.equal(audio.ready, false);
  for (const n of [...SFX_NAMES, 'no_such_sfx']) audio.sfx(n, { volume: 0.5, pitch: 1.2, pan: -0.3 });
  audio.sfx('boost', { pitch: 2 });
  audio.sfx('step', null);
  for (const n of TRACK_NAMES) audio.music(n, { fade: 1.5, restart: true });
  audio.music('lullaby');
  audio.music('sting_chapter');
  assert.equal(audio.track, 'lullaby', 'a sting never replaces the wanted track');
  audio.music('lullaby', { restart: true });
  audio.music('no_such_track');
  audio.music('lullaby', null);
  audio.music(null, { fade: 1.5 });
  assert.equal(audio.track, null);
  audio.setVolume({ master: 0.9, music: 0.7, sfx: 2 });
  assert.equal(audio.volume.sfx, 1);
  const muted = audio.muted;
  audio.setMuted(!muted);
  audio.toggleMute();
  assert.equal(audio.muted, muted);
  assert.equal(audio.position(), null);
  assert.equal(audio.context, null);
});
