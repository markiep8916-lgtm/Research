// dreams and epilogue (C8): the contracts the scenarios only sample. Every dream, under either answer,
// ends with its flag, its keepsake and a goto back to the exact spot it began; the crown fights WARDEN
// once, then merges the two halves in the binding order and lands the save on the Cryo Deck; the night
// before is asked once and never leaves BOLT parked; the epilogue clears the game on Ione's shore with
// Kade's last line before the credits; the dream sets and the shore stand on their own floors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAllData, REG, getMap } from '../src/content/data.js';
import { ITEMS } from '../src/battle/data.js';
import { cellSpec, isWalkableSpec } from '../src/world/mapdef.js';
import { SLOTS } from '../src/content/epilogue/maps/ione.js';

registerAllData();

/**
 * A recording `cs`: every call is logged as [name, ...args]; choices answer from `answers`; tests
 * read flags; actors stand at `at`. Promises resolve at once.
 */
function recorder({ answers = [], flags = {}, at = { x: 10.5, z: 42.5, facing: 'right' }, party = ['kade', 'nyx', 'orion', 'sera'], leader = 'kade' } = {}) {
  const log = [];
  const st = { flags: { ...flags } };
  const rec = (name) => (...args) => { log.push([name, ...args]); return Promise.resolve(); };
  const test = (cond) => {
    if (cond.startsWith('party:')) return party.includes(cond.slice(6));
    if (cond.startsWith('leader:')) return cond.slice(7) === leader;
    return !!st.flags[cond];
  };
  const cs = new Proxy({}, {
    get(_, name) {
      if (name === 'then') return undefined;
      if (name === 'camera') return new Proxy({}, { get: (__, k) => rec(`camera.${String(k)}`) });
      if (name === 'flag') return (f, v = true) => { log.push(['flag', f, v]); st.flags[f] = v; };
      if (name === 'test') return (c) => test(c);
      if (name === 'choice') return (...args) => { log.push(['choice', ...args]); return Promise.resolve(answers.length ? answers.shift() : 0); };
      if (name === 'actor') return (id) => ({ id, x: at.x, z: at.z, facing: at.facing, world: { map: { id: 'heart' } }, setVisible: () => Promise.resolve() });
      if (name === 'spawn') return (id, o) => { log.push(['spawn', id, o]); return Promise.resolve({ id, actor: null }); };
      if (name === 'ending') return () => { log.push(['ending']); return Promise.resolve('ione'); };
      if (['scene', 'face', 'anim', 'music', 'sfx', 'fx', 'flash', 'shake', 'light', 'particles', 'objective', 'save', 'checkpoint', 'screens', 'memory'].includes(name)) {
        return (...args) => { log.push([name, ...args]); };
      }
      return rec(String(name));
    },
  });
  return { cs, log, flags: st.flags };
}

const run = async (id, opts) => {
  const r = recorder(opts);
  const ret = await REG.scripts[id](r.cs, {});
  return { ...r, ret };
};
const says = (log) => log.filter(([n]) => n === 'say').flatMap(([, a, b]) => (typeof a === 'string' ? [{ speaker: a, text: b }] : [].concat(a)));
const idx = (log, pred) => log.findIndex(pred);

for (const m of ['kade', 'nyx', 'orion', 'sera']) {
  test(`dreams.${m}: under either answer, the keepsake, the flag and the way back to the exact spot`, async () => {
    for (const answer of [0, 1]) {
      const at = { x: 12.25, z: 40.75, facing: 'left' };
      const { log, flags } = await run(`dreams.${m}`, { answers: [answer], at });
      assert.equal(flags[`story:dream_${m}`], true);
      const give = log.find(([n, item]) => n === 'give' && item === `eq_x_keepsake_${m}`);
      assert.ok(give, 'keepsake given');
      assert.ok(ITEMS[`eq_x_keepsake_${m}`], 'keepsake item exists');
      const gotos = log.filter(([n]) => n === 'goto');
      assert.deepEqual(gotos[0].slice(1, 3), ['dreams', m]);
      assert.equal(gotos[0][3].scene, true, 'the dream is a scene goto');
      const back = gotos[gotos.length - 1];
      assert.equal(back[1], 'heart');
      assert.deepEqual(back[2], at, 'back to the exact spot');
      const choice = log.find(([n]) => n === 'choice');
      assert.deepEqual(choice[2], ['Stay.', 'Wake up.']);
      assert.ok(log.some(([n, o]) => n === 'scene' && o.leader === m), 'the dreamer leads');
      assert.ok(log.some(([n, t]) => n === 'music' && t === 'lullaby'), 'the dream plays the lullaby');
      // Stay plays one more beat, then the refusal anyway
      const lines = says(log).map((l) => l.text);
      const after = lines.slice(lines.length - 6);
      assert.ok(lines.length >= (answer === 0 ? 10 : 8));
      assert.ok(after.length);
    }
  });
}

test('dreams: the four dream sets stand on their own floor, apart from each other', () => {
  const map = getMap('dreams');
  assert.equal(map.scene, true);
  const onFloor = (x, z) => isWalkableSpec(cellSpec(map, Math.floor(x), Math.floor(z)));
  for (const [id, s] of Object.entries(map.spawns)) assert.ok(onFloor(s.x, s.z), `spawn ${id}`);
  for (const n of map.npcs) assert.ok(onFloor(n.x, n.z), `npc ${n.id}`);
  const xs = ['kade', 'nyx', 'orion', 'sera'].map((m) => map.spawns[m].x);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 17, 'one set per 17+ columns');
  // no map NPC takes a party member's id (C-alpha cross-file rule)
  for (const n of map.npcs) assert.ok(!['kade', 'nyx', 'orion', 'sera', 'bolt'].includes(n.id));
});

test('dreams.crown: one battle, then the resolution in the binding order, the card and a real-map goto', async () => {
  const { log, flags } = await run('dreams.crown', { flags: { 'story:dream_sera': true }, at: { x: 12, z: 17, facing: 'up' } });
  const battles = log.filter(([n]) => n === 'battle');
  assert.deepEqual(battles.map((b) => b[1]), ['heart_boss_warden']);
  const b = idx(log, ([n]) => n === 'battle');
  const at = (pred) => idx(log, pred);
  const line = (text) => at(([n, a, t]) => n === 'say' && (t === text || (Array.isArray(a) && a.some((l) => l.text === text))));
  const nar = (re) => at(([n, a]) => n === 'narrate' && re.test(a));
  // the approach: Nyx names the Lock before the battle
  assert.ok(line('That\'s you. You\'re the Lock.') < b);
  // (2) the fold, (3) HALCYON out of BOLT, (4) the embrace, (5) Orion, (6) the merge, (7) morning, (8) the lullaby
  const beats = [
    nar(/no taller than a woman/), at(([n, id]) => n === 'spawn' && id === 'crown_halcyon'), line('I was so afraid for them.'),
    line('I know. Me too.'), at(([n, a]) => n === 'say' && a === 'ORION'), nar(/Two lights become one/),
    nar(/white of morning/), at(([n, t]) => n === 'music' && t === 'lullaby'),
  ];
  for (let i = 0; i < beats.length; i++) assert.ok(beats[i] > b, `beat ${i + 2} after the battle`);
  for (let i = 1; i < beats.length; i++) assert.ok(beats[i] > beats[i - 1], `beat ${i + 2} after beat ${i + 1}`);
  // no lullaby before beat 8; silence from the approach on
  assert.equal(at(([n, t]) => n === 'music' && t === 'lullaby'), beats[7]);
  assert.equal(flags['story:warden_merged'], true);
  assert.equal(flags['story:finale_done'], true);
  const card = at(([n, c]) => n === 'card' && c === 'epilogue');
  const merged = at(([n, f]) => n === 'flag' && f === 'story:warden_merged');
  assert.ok(merged > beats[5] && card > merged);
  const gotos = log.filter(([n]) => n === 'goto');
  const last = gotos[gotos.length - 1];
  assert.deepEqual(last.slice(1, 3), ['halcyon', 'cryo']);
  assert.ok(!last[3] || !last[3].scene, 'the post-battle save lands on a real map');
  assert.ok(at(([n, o]) => n === 'objective' && o === 'epi.wake') > card);
});

test('dreams.night_before: asked once; "Go now." goes straight on; BOLT is never left parked', async () => {
  const no = await run('dreams.night_before', { answers: [1] });
  assert.equal(no.ret, true);
  assert.equal(no.flags['dream:night_before'], true);
  assert.equal(no.log.filter(([n]) => n === 'goto').length, 0);
  const yes = await run('dreams.night_before', { answers: [0] });
  assert.equal(yes.ret, true);
  assert.equal(yes.flags['dream:night_before'], true);
  assert.equal(yes.flags['story:bolt_away'], false);
  assert.equal(yes.log.filter(([n]) => n === 'goto').length, 4, 'four vignettes');
  assert.ok(yes.log.filter(([n]) => n === 'goto').every(([, map, , o]) => map === 'halcyon' && o.scene));
  const again = await run('dreams.night_before', { flags: { 'dream:night_before': true } });
  assert.equal(again.ret, true);
  assert.equal(again.log.filter(([n]) => n === 'choice').length, 0, 'asked once');
  const choice = yes.log.find(([n]) => n === 'choice');
  assert.equal(choice[1], 'Spend the night aboard first?');
});

test('epilogue.main: the vignettes, the shore, the last line, the clear, the save and the credits', async () => {
  const { log, flags } = await run('epilogue.main', { leader: 'nyx' });
  const gotos = log.filter(([n]) => n === 'goto');
  assert.deepEqual(gotos.map(([, m]) => m), ['halcyon', 'halcyon', 'arboretum', 'driftmarket', 'halcyon', 'exterior', 'ione']);
  assert.ok(gotos.slice(0, -1).every(([, , , o]) => o.scene), 'vignettes 1-5 are scene gotos');
  const shore = gotos[gotos.length - 1];
  assert.deepEqual(shore.slice(1, 3), ['ione', 'shore']);
  assert.ok(!shore[3].scene, 'the shore is an ordinary goto so the save lands there');
  for (const f of ['story:revival_authorized', 'story:game_clear', 'unlock:ione']) assert.equal(flags[f], true, f);
  const lines = says(log);
  assert.deepEqual(lines[lines.length - 1], { speaker: 'KADE', text: 'Then we\'ll build a world worth waking for.' });
  for (const fixed of ['Did I miss anything?', 'Ship-people. Always late.']) assert.ok(lines.some((l) => l.text === fixed), fixed);
  const i = (n) => log.findIndex(([k]) => k === n);
  assert.ok(i('save') > log.findIndex(([n, f]) => n === 'flag' && f === 'story:game_clear'));
  assert.ok(i('ending') > i('save'));
  // the shore is led by whoever led before the epilogue
  const scenes = log.filter(([n]) => n === 'scene').map(([, o]) => o.leader);
  assert.equal(scenes[scenes.length - 1], 'nyx');
  assert.equal(flags['story:bolt_away'], false);
});

test('ione: the shore, the berth, the post-game cast and the credits', () => {
  const map = getMap('ione');
  const onFloor = (x, z) => isWalkableSpec(cellSpec(map, Math.floor(x), Math.floor(z)));
  for (const [id, s] of Object.entries(map.spawns)) assert.ok(onFloor(s.x, s.z), `spawn ${id}`);
  for (const [id, [x, z]] of Object.entries(SLOTS)) assert.ok(onFloor(x, z), `slot ${id}`);
  assert.ok(map.interactables.some((it) => it.kind === 'starchart'), 'a Starchart at the berth');
  assert.ok(map.sky && map.sky.texture === 'bd_ione_dawn');
  for (const n of map.npcs) assert.match(n.when, /story:game_clear/);
  const dest = REG.destinations.find((d) => d.id === 'ione');
  assert.equal(dest.lockedText, 'After the Heart');
  assert.equal(dest.unlock, 'unlock:ione');
  // credits: the UI prints the closing line and THE END itself (8.6)
  assert.ok(REG.credits.length > 10);
  assert.ok(!REG.credits.some((l) => /generated by code|THE END/i.test(l.text || '')));
  assert.equal(REG.credits[0].head, 'VOIDPATH');
});

test('staging: every goto, walk and spawn of the night before, the dreams and the epilogue lands on a floor', async () => {
  const floor = (mapId, x, z) => {
    const map = getMap(mapId);
    return !!map && isWalkableSpec(cellSpec(map, Math.floor(x), Math.floor(z)));
  };
  const runs = [
    ['dreams.night_before', { answers: [0] }],
    ...['kade', 'nyx', 'orion', 'sera'].map((m) => [`dreams.${m}`, { answers: [0] }]),
    ['epilogue.main', {}],
  ];
  for (const [id, opts] of runs) {
    const { log } = await run(id, opts);
    let map = 'heart';
    for (const [name, a, b] of log) {
      // the Heart's spots come from where the dreamer stood (C7's layout), not from these scripts
      if (map === 'heart' && name !== 'goto') continue;
      if (name === 'goto' && a === 'heart') { map = a; continue; }
      if (name === 'goto') {
        map = a;
        if (b && typeof b === 'object') assert.ok(floor(map, b.x, b.z), `${id}: goto ${map} (${b.x}, ${b.z})`);
        else if (typeof b === 'string') assert.ok(getMap(map).spawns[b], `${id}: spawn ${map}:${b}`);
      } else if (name === 'move' && Array.isArray(b)) {
        for (const [x, z] of b) assert.ok(floor(map, x, z), `${id}: ${a} walks to ${map} (${x}, ${z})`);
      } else if (name === 'spawn' && b && b.x != null && map !== 'exterior') {
        assert.ok(floor(map, b.x, b.z), `${id}: ${a} spawns on ${map} (${b.x}, ${b.z})`);
      }
    }
  }
});
