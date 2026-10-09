// Driftmarket (C2): the map validates with every extension merged, the 12.4 quotas hold, the
// binding ids exist, and the favours and hub additions land on walkable cells of the maps they extend.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAllData, REG, getMap } from '../src/content/data.js';
import { validateMap, cellSpec, isWalkableSpec } from '../src/world/mapdef.js';
import { testCond } from '../src/world/cond.js';
import { ITEMS } from '../src/battle/data.js';

registerAllData();

const walkable = (map, x, z) => isWalkableSpec(cellSpec(map, Math.floor(x), Math.floor(z)));
/** The script a talk spec runs (a normalized talk is a list of { when, script }). */
const scriptOf = (talk) => (typeof talk === 'string' ? talk : talk?.at(-1)?.script);

test('driftmarket validates, with its binding spawns, anchor and exit', () => {
  const m = getMap('driftmarket');
  assert.deepEqual(validateMap(m), []);
  for (const s of ['dock', 'from_shoals']) assert.ok(m.spawns[s], `spawn ${s}`);
  assert.ok(m.anchors.ruse_stall);
  const exit = m.exits.find((e) => e.to.map === 'shoals');
  assert.equal(exit.to.spawn, 'from_driftmarket');
  assert.ok(REG.shops.ruse && REG.destinations.some((d) => d.id === 'driftmarket'));
});

test('quotas (12.4): 12+ NPCs, 6+ looks, 3+ walking paths, a gear chest, a secret, a leader-gated interaction', () => {
  const m = getMap('driftmarket');
  const ids = ['ruse', 'tobin', 'pip', 'marta', 'hesper', 'ama', 'bao', 'sorrel_a', 'sorrel_b', 'oona', 'harl', 'rook', 'juno', 'ilo'];
  for (const id of ids) assert.ok(m.npcs.some((n) => n.id === id), `NPC ${id} (WRITING 7)`);
  assert.ok(m.npcs.length >= 12);
  assert.ok(new Set(m.npcs.map((n) => n.sprite)).size >= 6);
  assert.ok(m.npcs.filter((n) => n.idle?.path?.length > 1).length >= 3);
  assert.ok(m.chests.some((c) => /^eq_/.test(c.item)), 'a gear chest');
  assert.ok(m.chests.length >= 2, 'the gear chest and the pier cache');
  assert.ok(m.interactables.some((i) => i.leader), 'a leader-gated interaction');
  for (const n of m.npcs) assert.ok(walkable(m, n.x, n.z), `NPC ${n.id} stands on a floor`);
  for (const c of m.chests) assert.ok(walkable(m, c.x, c.z), `chest ${c.id} stands on a floor`);
});

test('the favours: three side objectives, finished on the Halcyon, in the Shoals and on the Meridian', () => {
  const side = Object.entries(REG.objectives).filter(([id, o]) => o.side && id.startsWith('ch1.favour_'));
  assert.equal(side.length, 3);
  const flags = { 'dm:favours_read': true };
  for (const [id, o] of side) {
    assert.ok(testCond(o.when, { flags, story: { chapter: 'ch1' } }), `${id} shows once the board is read`);
    const map = getMap(o.target.map);
    assert.deepEqual(validateMap(map), [], `${o.target.map} with the extensions`);
    const it = map.interactables.find((i) => i.id.startsWith('dm.') && /favour/.test(scriptOf(i.talk)));
    assert.ok(it, `${id}: an interactable on ${o.target.map}`);
    assert.ok(walkable(map, it.x, it.z), `${it.id} stands on a floor`);
    assert.ok(REG.scripts[scriptOf(it.talk)], it.id);
  }
});

test('the Halcyon after ch1: the trader stall at hub_stall, the coil socket at the reactor', () => {
  const h = getMap('halcyon');
  const trader = h.npcs.find((n) => n.id === 'dm.trader');
  assert.ok(trader && trader.when === 'story:ch1_done' && REG.scripts[scriptOf(trader.talk)]);
  assert.ok(Math.hypot(trader.x - h.anchors.hub_stall.x, trader.z - h.anchors.hub_stall.z) < 0.5);
  assert.ok(walkable(h, trader.x, trader.z));
  const socket = h.interactables.find((i) => i.id === 'dm.coil_socket');
  assert.equal(scriptOf(socket.talk), 'driftmarket.coil_install');
});

test('two Party Talks and the chapter-one recap', () => {
  const talks = Object.values(REG.partyTalks).filter((t) => t.chapter === 'ch1' && /^driftmarket\./.test(t.script));
  assert.equal(talks.length, 2);
  assert.ok(REG.recaps.ch1 && REG.recaps.ch1.length > 120);
});

test('G2 C2-2: Ruse sells a tier-2 weapon for each traveler in chapter 1', () => {
  const stock = REG.shops.ruse.stock.filter((s) => testCond(s.when || '', { flags: {}, story: { chapter: 'ch1' } }));
  for (const m of ['kade', 'nyx', 'orion', 'sera']) assert.ok(stock.some((s) => s.item === `eq_w_${m}_2`), `eq_w_${m}_2`);
});

test('G2 C2-5: the data spike is a key item, given at the viewport and taken at the coil', () => {
  const spike = ITEMS.data_spike;
  assert.ok(spike && spike.key && spike.name === 'Ringborn Data Spike');
  const src = (id) => REG.scripts[id].toString();
  assert.match(src('driftmarket.return'), /cs\.give\('data_spike'\)/);
  assert.match(src('driftmarket.return'), /Eighty years of soundings, on this spike\. Ask your ship what it carries\./);
  assert.match(src('driftmarket.coil_install'), /cs\.take\('data_spike'\)/);
  assert.equal(REG.jumps['ch1.coil'].items.data_spike, 1, 'jumpTo(ch1.coil) carries the spike');
});

test('G2 C2-3: WARDEN speaks over sigil screens and a gold light, then the screens and lights come back', () => {
  const src = REG.scripts['driftmarket.coil_install'].toString();
  const sigil = src.indexOf("cs.screens('warden_sigil')"), light = src.indexOf("cs.flag('dm:warden_light')");
  const warden = src.indexOf("speaker: 'WARDEN'"), off = src.indexOf('cs.screens(null)');
  assert.ok(sigil > 0 && light > sigil && warden > light && off > warden, 'sigil and gold light on through the WARDEN beat, off after');
  assert.ok(src.indexOf("cs.flag('dm:warden_light', false)") > warden);
  const gold = getMap('halcyon').lights.find((l) => l.when === 'dm:warden_light & !story:coil_installed');
  assert.ok(gold && gold.color === '#ffd27a' && gold.mode === 'pulse', 'a soft-gold pulsing light by the reactor');
  assert.ok(getMap('halcyon').props.filter((p) => p.t === 'screen' && p.group === 'eng').length >= 2, 'C1-5 screens in Engineering');
});

test('G2 C2-4: Nyx gives the leader tip in her own words; the menu path is a caption', () => {
  const src = REG.scripts['driftmarket.arrival'].toString();
  assert.match(src, /Out here, anyone can lead\./);
  assert.match(src, /cs\.caption\('Pause menu · Party · Leader'\)/);
  assert.doesNotMatch(src, /Make it me|Pause menu, Party/);
});

test('G2 C2-8: every scenes entry names where the contact sheet stands (jump and at)', () => {
  const scenes = REG.scenes.filter((s) => s.loc === 'driftmarket');
  assert.ok(scenes.length >= 6);
  for (const s of scenes) {
    assert.ok(s.jump && REG.jumps[s.jump] || s.jump === s.chapter, `${s.id}: jump`);
    const [map, spawn] = s.at.split(':');
    assert.ok(getMap(map).spawns[spawn], `${s.id}: at ${s.at}`);
  }
  const at = (id) => scenes.find((s) => s.id === id);
  assert.equal(at('driftmarket.arrival').at, 'driftmarket:dock');
  assert.equal(at('driftmarket.coil_install').jump, 'ch1.coil');
});

test('G2 C2-6 / C2-7: cold light on the Row, the gate and the inn; the viewport keeps its NPCs clear of the leader', () => {
  const m = getMap('driftmarket');
  const cold = (l) => /^#[0-9a-f]{6}$/i.test(l.color) && parseInt(l.color.slice(5, 7), 16) > parseInt(l.color.slice(1, 3), 16) + 40;
  const near = (x, z, r) => m.lights.filter((l) => cold(l) && Math.hypot(l.x - x, l.z - z) < r).length;
  for (const vp of ['row', 'gate', 'inn', 'viewport']) assert.ok(near(m.viewpoints[vp].x, m.viewpoints[vp].z, 5) >= 1, `${vp}: a cold light within 5 units`);
  const vp = m.viewpoints.viewport;
  for (const n of m.npcs) {
    const spots = [[n.x, n.z], ...(n.idle?.path || [])];
    for (const [x, z] of spots) assert.ok(Math.hypot(x - vp.x, z - vp.z) >= 1 && Math.abs(x - vp.x) >= 1 || Math.abs(z - vp.z) > 4,
      `${n.id} stands clear of the viewport viewpoint`);
  }
  // the frost is one world-space sheet; the '.' deck's patch plates stay near one cell in six
  assert.equal(m.legend.i.tex, 'dm_deck_a');
  assert.ok(m.props.some((p) => p.t === 'floorPlane' && p.tex === 'dm_frost'));
  const patches = m.legend['.'].mix.reduce((s, [, c]) => s + c, 0);
  assert.ok(patches > 0.13 && patches < 0.2, `patch plates ${patches}`);
});
