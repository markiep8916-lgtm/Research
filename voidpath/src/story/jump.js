// jumpTo state builder (TECH_PLAN 10.1, PURE): the state a chapter or jump point starts from, as if
// the game had been played up to it. Used by __VP.debug.jumpTo, debug.startBattle({ jump }), the
// script dry-run and the balance simulator.
//
// export function buildJumpState(target, REG) -> JumpState
//   target: chapter id | jump id from REG.jumps | 'poc'
//   JumpState = { target, chapter, poc, party: [ids], leader, level, flags: { [flag]: true },
//                 items: { [id]: n }, equip: { [memberId]: { weapon, armor, accessory } }, credits,
//                 story: { chapter, objective, done }, map, spawn }
//   flags = CHAPTER_FLAGS and REG.doneFlags of every earlier chapter, plus jump.flags; party =
//   CHAPTER_START[chapter].party (or jump.party) at CHAPTERS[chapter].levels[0] (jump.level wins);
//   kit REG.kits[chapter] (+ jump.items / jump.credits); leader = the chapter's traveler when in the
//   party (jump.leader wins), else the first member. A missing map or spawn falls back to
//   halcyon:bridge_starchart with a console.warn. Throws on an unknown target.
//   'poc': the resetGame() party (POC levels) at REG.jumps.poc's map and spawn (default halcyon:start)
//   with REG.jumps.poc's flags (none in Wave S).
// export function applyJumpState(js)     writes a JumpState into gameState (party array identity kept)
// export function setMemberLevel(m, level)   extra: level, stats and skills for that level, full HP/EP

import { CHAPTER_START, CHAPTER_FLAGS, CHAPTER_IDS, chapterIndex, chapterDef, startParty } from '../content/chapters.js';
import {
  gameState, PARTY_ORDER, START_INVENTORY, xpToNext, resetGame, newGame, joinParty, leaveParty, moveMember,
  setLeader, addItem,
} from '../core/state.js';
import { refreshMember, learnByLevel, learnFromFlags, equip } from '../core/progression.js';
import { ITEMS } from '../battle/data.js';

const SLOTS = ['weapon', 'armor', 'accessory'];
const FALLBACK = { map: 'halcyon', spawn: 'bridge_starchart' };

function hasSpawn(REG, map, spawn) {
  const def = REG.maps?.[map];
  if (!def) return false;
  return typeof spawn !== 'string' || !!def.spawns?.[spawn];
}

export function buildJumpState(target, REG) {
  const jumps = REG.jumps || {};
  if (target === 'poc') {
    const j = jumps.poc || {};
    return {
      target, chapter: 'prologue', poc: true, party: [...PARTY_ORDER], leader: 'kade', level: null,
      flags: Object.fromEntries((j.flags || []).map((f) => [f, true])),
      items: { ...START_INVENTORY, ...(j.items || {}) }, equip: {}, credits: j.credits || 0,
      story: { chapter: 'prologue', objective: j.objective || CHAPTER_START.prologue.objective, done: [] },
      map: j.map || 'halcyon', spawn: j.spawn || 'start',
    };
  }
  const jump = chapterIndex(target) >= 0 ? null : jumps[target];
  if (chapterIndex(target) < 0 && !jump) throw new Error(`jumpTo: unknown target "${target}"`);
  const chapter = jump ? jump.chapter : target;
  const ci = chapterIndex(chapter);
  if (ci < 0) throw new Error(`jumpTo: jump "${target}" names unknown chapter "${chapter}"`);
  const start = CHAPTER_START[chapter];

  const flags = {};
  for (const ch of CHAPTER_IDS.slice(0, ci)) {
    for (const f of CHAPTER_FLAGS[ch] || []) flags[f] = true;
    for (const f of REG.doneFlags?.[ch] || []) flags[f] = true;
  }
  for (const f of jump?.flags || []) flags[f] = true;

  const party = jump?.party ? [...jump.party] : startParty(chapter);
  const traveler = chapterDef(chapter).traveler;
  const leader = jump?.leader || (party.includes(traveler) ? traveler : party[0]);

  const kit = REG.kits?.[chapter] || {};
  const items = { ...(kit.items || {}) };
  for (const [id, n] of Object.entries(jump?.items || {})) items[id] = (items[id] || 0) + n;
  const equipOut = {};
  for (const id of party) if (kit.equip?.[id]) equipOut[id] = { ...kit.equip[id] };

  const done = Object.entries(REG.objectives || {})
    .filter(([, d]) => !d.side && chapterIndex(d.chapter) >= 0 && chapterIndex(d.chapter) < ci).map(([id]) => id);

  let map = jump?.map || start.map;
  let spawn = jump?.spawn || start.spawn;
  if (!hasSpawn(REG, map, spawn)) {
    console.warn(`jumpTo: ${map}:${typeof spawn === 'string' ? spawn : 'pos'} is missing; using ${FALLBACK.map}:${FALLBACK.spawn}`);
    ({ map, spawn } = FALLBACK);
  }

  return {
    target, chapter, poc: false, party, leader, level: jump?.level ?? chapterDef(chapter).levels[0],
    flags, items, equip: equipOut, credits: (kit.credits || 0) + (jump?.credits || 0),
    story: { chapter, objective: jump?.objective || start.objective, done }, map, spawn,
  };
}

/** Set a member's level: stats and level-learned skills for it, flag-gated skills, full HP and EP. */
export function setMemberLevel(m, level) {
  m.level = level;
  m.xp = 0;
  m.xpNext = xpToNext(level);
  refreshMember(m);
  learnByLevel(m);
  learnFromFlags(m, gameState.flags);
  m.alive = true;
  m.hp = m.maxHp;
  m.ep = m.maxEp;
}

function clear(o) {
  for (const k of Object.keys(o)) delete o[k];
}

export function applyJumpState(js) {
  if (js.poc) {
    resetGame();
    Object.assign(gameState.flags, js.flags);
    clear(gameState.inventory);
    Object.assign(gameState.inventory, js.items);
    gameState.credits = js.credits;
    Object.assign(gameState.story, js.story, { done: [...js.story.done] });
    return gameState;
  }
  newGame();
  // flags first, so members joining now learn their flag-gated skills (ultimates)
  clear(gameState.flags);
  Object.assign(gameState.flags, js.flags);
  for (const id of js.party) joinParty(id, { level: js.level });
  for (const m of [...gameState.party]) if (!js.party.includes(m.id)) leaveParty(m.id);
  js.party.forEach((id, i) => moveMember(id, i));
  // gear: everything off, then the kit's pieces on (equip() moves them out of the inventory)
  for (const m of gameState.party) for (const slot of SLOTS) if (m.equip?.[slot]) equip(m, slot, null);
  clear(gameState.inventory);
  for (const m of gameState.party) {
    setMemberLevel(m, js.level);
    for (const slot of SLOTS) {
      const id = js.equip[m.id]?.[slot];
      if (!id) continue;
      if (!ITEMS[id]) { console.warn(`jumpTo: unknown equipment "${id}"`); continue; }
      addItem(id);
      equip(m, slot, id);
    }
    refreshMember(m);
    m.hp = m.maxHp;
    m.ep = m.maxEp;
  }
  for (const [id, n] of Object.entries(js.items)) {
    if (ITEMS[id]) addItem(id, n);
    else console.warn(`jumpTo: unknown item "${id}"`);
  }
  gameState.credits = js.credits;
  Object.assign(gameState.story, js.story, { done: [...js.story.done] });
  setLeader(js.leader);
  gameState.checkpoint = null;
  return gameState;
}
