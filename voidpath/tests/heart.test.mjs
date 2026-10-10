// heart (C7): the finale's contracts the scenarios only sample. The ascent can only be climbed in
// order (each light bridge needs its pylon, the processional needs both), every placed thing stands
// on the floor, the dreams chain tier by tier, and the Ascent's foes teach their lessons by script:
// the Choir Guardian's cradle rings fall with a Break, the first seraph sings its Lullaby at once, the
// Dream Eater feeds on a sleeper, the gilded trooper paints its mark in round 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAllData, REG, getMap } from '../src/content/data.js';
import { ENEMIES, ENCOUNTERS } from '../src/battle/data.js';
import { BattleModel } from '../src/battle/model.js';
import { gameState } from '../src/core/state.js';
import { buildJumpState, applyJumpState } from '../src/story/jump.js';
import { makeRng } from '../src/core/util.js';
import { cellSpec, isWalkableSpec } from '../src/world/mapdef.js';
import { compileCond } from '../src/world/cond.js';

registerAllData();
const map = getMap('heart');

/** Walkable cells with the gates whose condition holds under `flags` open. */
function openCells(flags) {
  const env = { flags, test: (f) => !!flags[f] };
  const closed = new Set();
  for (const g of map.gates) {
    const open = compileCond(g.open);
    let isOpen;
    try { isOpen = open(env); } catch { isOpen = g.open.split('&').every((f) => flags[f.trim()]); }
    if (!isOpen) for (const [c, r] of g.cells) closed.add(`${c},${r}`);
  }
  return (c, r) => !closed.has(`${c},${r}`) && isWalkableSpec(cellSpec(map, c, r));
}

/** True when (bx, bz) is reachable from (ax, az) over 8-connected open cells. */
function reach(flags, [ax, az], [bx, bz]) {
  const open = openCells(flags);
  const start = [Math.floor(ax), Math.floor(az)], goal = `${Math.floor(bx)},${Math.floor(bz)}`;
  const seen = new Set([start.join(',')]);
  const queue = [start];
  while (queue.length) {
    const [c, r] = queue.shift();
    if (`${c},${r}` === goal) return true;
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const k = `${c + dc},${r + dr}`;
        if ((dc || dr) && !seen.has(k) && open(c + dc, r + dr) && (!dc || !dr || (open(c + dc, r) && open(c, r + dr)))) {
          seen.add(k);
          queue.push([c + dc, r + dr]);
        }
      }
    }
  }
  return false;
}

const onFloor = (x, z) => isWalkableSpec(cellSpec(map, Math.floor(x), Math.floor(z)));
const inter = (id) => map.interactables.find((i) => i.id === id);
const xz = (o) => [o.x, o.z];

test('heart: every spawn, viewpoint, chest, interactable and field fight stands on the floor', () => {
  for (const [id, s] of Object.entries(map.spawns)) assert.ok(onFloor(s.x, s.z), `spawn ${id}`);
  for (const [id, v] of Object.entries(map.viewpoints)) assert.ok(onFloor(v.x, v.z), `viewpoint ${id}`);
  for (const c of map.chests) assert.ok(onFloor(c.x, c.z), `chest ${c.id}`);
  for (const i of map.interactables) assert.ok(onFloor(i.x, i.z), `interactable ${i.id}`);
  for (const b of map.bosses) assert.ok(onFloor(b.x, b.z), `boss ${b.id}`);
  for (const id of ['dock', 'tier2', 'tier3', 'crown']) assert.ok(map.spawns[id], `binding spawn ${id}`);
});

test('heart: each tier climbs in order: a bridge needs its pylon, the processional both', () => {
  const T1 = { 'sw:heart:t1': true };
  const T2 = { ...T1, 'sw:heart:t2': true };
  const dock = xz(map.spawns.dock), tier2 = xz(map.spawns.tier2), tier3 = xz(map.spawns.tier3);
  // the Dock: the pylon is on the near arc, the lift beyond the chord
  assert.ok(reach({}, dock, xz(inter('pylon_t1'))));
  assert.ok(!reach({}, dock, xz(inter('lift_t1'))), 'the first lift waits for the chord');
  assert.ok(reach(T1, dock, xz(inter('lift_t1'))));
  // the Second Tier: the north chord is permanent, the span to the lift is the pylon's
  assert.ok(reach(T1, tier2, xz(inter('pylon_t2'))));
  assert.ok(!reach(T1, tier2, xz(inter('lift_t2'))), 'the second lift waits for its span');
  assert.ok(reach(T2, tier2, xz(inter('lift_t2'))));
  // the Third Tier: both pylons on the long arc, the processional needs both
  assert.ok(reach(T2, tier3, xz(inter('pylon_t3a'))));
  assert.ok(reach(T2, tier3, xz(inter('pylon_t3b'))));
  const sanctum = xz(inter('med_sanctum'));
  assert.ok(!reach({ ...T2, 'sw:heart:t3a': true }, tier3, sanctum));
  assert.ok(!reach({ ...T2, 'sw:heart:t3b': true }, tier3, sanctum));
  assert.ok(reach({ ...T2, 'sw:heart:t3a': true, 'sw:heart:t3b': true }, tier3, sanctum));
  // no tier walks into another: only the lifts join them
  assert.ok(!reach({ ...T2, 'sw:heart:t3a': true, 'sw:heart:t3b': true }, dock, tier2));
  assert.ok(!reach({ ...T2, 'sw:heart:t3a': true, 'sw:heart:t3b': true }, tier2, tier3));
  assert.ok(!reach({ ...T2, 'sw:heart:t3a': true, 'sw:heart:t3b': true }, sanctum, xz(map.spawns.crown)));
});

test('heart: the dreams chain tier by tier, the crown lift is the point of no return', () => {
  const trig = Object.fromEntries(map.triggers.map((t) => [t.id, t]));
  assert.equal(trig.dream_kade.script, 'dreams.kade');
  assert.equal(trig.dream_nyx.when, 'story:dream_kade & !story:dream_nyx');
  assert.equal(trig.dream_orion.when, 'story:dream_nyx & !story:dream_orion');
  assert.equal(trig.dream_sera.when, 'story:dream_orion & !story:dream_sera');
  assert.equal(trig.crown.script, 'dreams.crown');
  assert.equal(trig.crown.when, 'story:dream_sera & !story:finale_done');
  for (const t of map.triggers) if (t.script) assert.ok(REG.scripts[t.script], t.script);
  const lift = inter('crown_lift');
  assert.equal(lift.talk[0].script, 'heart.crown_lift');
  assert.ok(map.interactables.some((i) => i.kind === 'med' && i.id === 'med_sanctum'));
  assert.ok(map.interactables.some((i) => i.kind === 'shop' && i.shop === 'fabricator'));
  const dest = REG.destinations.find((d) => d.id === 'heart');
  assert.equal(dest.warn, 'The way back closes at the crown.');
  assert.equal(dest.before, 'dreams.night_before');
  assert.equal(map.music, 'heart');
  for (const id of ['warden', 'crown_party', 'crown_halcyon']) assert.ok(map.anchors[id], id);
});

/** Starts an encounter at the finale's level and returns the model. */
function battle(encounterId, seed = 3) {
  applyJumpState(buildJumpState('fin.tier2', REG));
  const m = new BattleModel({ party: gameState.party, encounterId, rng: makeRng(seed) });
  m.begin();
  return m;
}

/** Runs enemy turns until `done` or the round passes `rounds`; party members only Defend. */
function play(m, done, rounds = 3) {
  for (let g = 0; g < 400 && !m.isOver() && m.round <= rounds; g++) {
    const ev = m.nextTurn();
    if (done(ev)) return ev;
    if (m.phase === 'enemyTurn') {
      const out = m.enemyTurn();
      if (done(out)) return out;
    } else if (m.phase === 'playerInput') m.act({ actorId: m.current.id, kind: 'defend' });
  }
  return null;
}

test('heart: the Choir Guardian\'s cradle rings shield the others until it is Broken', () => {
  const m = battle('heart_wardens');
  const seraph = m.enemies.find((e) => e.key === 'warden_seraph');
  const guard = m.enemies.find((e) => e.key === 'choir_guardian');
  play(m, () => seraph.untargetable, 1);
  assert.ok(seraph.untargetable, 'the seraph stands behind the rings from round 1');
  assert.ok(!guard.untargetable, 'the guardian itself can be struck');
  const events = [];
  m._withEvents(events, () => m._break(guard, events));
  assert.ok(!seraph.untargetable, 'a Break drops the rings');
  assert.ok(events.some((e) => e.type === 'cue' && e.name === 'cradle_down'));
  assert.ok(ENCOUNTERS.heart_wardens.tips.some((t) => t.flag === 'tut:cradle'));
});

test('heart: the first seraph sings its Lullaby with its first action', () => {
  const m = battle('heart_choir');
  const ev = play(m, (e) => e && e.some((x) => x.type === 'action' && x.actorId && m.enemies.find((n) => n.id === x.actorId)?.key === 'warden_seraph'));
  assert.ok(ev, 'a seraph acted');
  const act = ev.find((x) => x.type === 'action');
  assert.equal(act.actionId, 'seraph_lullaby_first');
});

test('heart: the Dream Eater feeds on a sleeper, and the elites carry their kits', () => {
  const eater = ENEMIES.dream_eater;
  assert.ok(eater.actions.some((a) => a.id === 'eater_gorge' && a.hits === 2));
  assert.ok(ENCOUNTERS.heart_choir.tips.some((t) => t.on === 'cue:gorge'));
  for (const [kind, art] of [['elite_rime_golem', 'rime_golem'], ['elite_bloom_mantis', 'bloom_mantis'], ['elite_sec_trooper', 'sec_trooper'], ['elite_firewall_golem', 'firewall_golem']]) {
    assert.equal(ENEMIES[kind].art, art, kind);
    assert.ok(ENEMIES[kind].tint, `${kind} is tinted`);
  }
  for (const id of ['heart_elite_rings', 'heart_elite_spire']) {
    assert.equal(ENCOUNTERS[id].boss, true, id);
    assert.equal(ENCOUNTERS[id].backdrop, 'heart', id);
  }
  for (const zone of ['heart_ascent', 'heart_crown']) {
    const r = REG.zoneRates[zone];
    assert.ok(r.grace >= 6 && r.sigma >= 10, `${zone} keeps fights apart`);
  }
});
