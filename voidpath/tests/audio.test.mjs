// Audio data and API checks (TECH_PLAN 9, and the C9 acceptance of section 13): every track compiles, loops
// are whole bars, the motifs of the section 9 table are present, stings are `once`, a malformed track fails
// alone, the new sfx exist and nothing throws before init(). Runs in node: audio.js touches no WebAudio at
// module level. Levels, renders and piano rolls are the preview bench's job (src/tools/preview-audio.js).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  audio, compileTrack, compiledTrack, findMotif, noteMidi, MOTIFS, TRACKS, TRACK_NAMES, SFX_NAMES,
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

// Section 9: the motifs a track must carry. The third column names the sub-wave that delivers a motif that
// an existing track does not carry yet (skipped until then).
const MOTIF_TABLE = [
  ['title', 'lullaby', 'C9-gamma adds the lullaby phrase'],
  ['driftmarket', 'ringborn'], ['meridian', 'ringborn'], ['arboretum', 'lullaby'], ['choir', 'choir'],
  ['vault', 'lullaby'], ['heart', 'warden'], ['warden', 'warden'], ['final_boss', 'warden'],
  ['final_boss_2', 'lullaby'], ['final_boss_2', 'choir'], ['lullaby', 'lullaby'], ['ione', 'ringborn'], ['ione', 'lullaby'],
  ['credits', 'lullaby'], ['credits', 'ringborn'],
  ['spire', 'warden:inverted'], // the WARDEN theme inverted in the alarm figure
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
      assert.equal(part.steps.length, part.bars * c.barSteps, `${name}.${k} is ${part.bars} whole bars`);
    }
    const barSec = c.barSteps * c.stepDur;
    assert.ok(Math.abs(c.loopSeconds - c.loopBars * barSec) < 1e-9, `${name} loop length is a whole number of bars`);
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

for (const [name, motif, later] of MOTIF_TABLE) {
  const skip = !TRACKS[name] ? `track ${name} arrives in a later sub-wave` : later || false;
  test(`${name} carries the ${motif} motif`, { skip }, () => {
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
