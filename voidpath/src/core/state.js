// Global game state (party, roster, inventory, flags, story, stats) and the helpers that mutate it.
// Pure logic: no DOM. `gameState` is a single long-lived object; helpers mutate it in place, so
// references to gameState, gameState.party, gameState.roster, gameState.inventory and
// gameState.story stay valid after resetGame(), newGame() and save loads (TECH_PLAN 5.1).
//
//   gameState.roster   { id: PartyMember }: every recruited member; the only owner of member objects
//   gameState.party    PartyMember[] in formation order: the same objects as the roster entries
//   gameState.leader   member id walking in the field (always in the party)
//   gameState.story    { chapter, objective, done }   (story/story.js reads and writes it)
//   gameState.played   ids of completed scripts (never reverted by Retry)
//
// resetGame()  the POC party (PARTY_DEFS levels and skills, no learnsets): tests and the `poc` jump
// newGame()    the campaign start: KADE alone at level 1 with the prologue kit
// joinParty(id, { level }) -> PartyMember; leaveParty(id) -> bool; setLeader(id) -> bool;
// moveMember(id, toIndex) -> bool; gainXp(member, amount) -> [{ level, gains, learned? }]

import { PARTY_DEFS, ITEMS } from '../battle/data.js';
import common from '../content/common/data.js';
import { makeMemberAt, refreshMember, learnByLevel, emptyEquip, emptyMods, MAX_LEVEL } from './progression.js';

export const PARTY_ORDER = ['kade', 'nyx', 'orion', 'sera'];
export const START_INVENTORY = { medigel: 3, ether: 1, revive: 1 };
export const MAX_PARTY = 4;
export const DEFAULT_STORY = { chapter: 'prologue', objective: 'pro.wake' };

export const gameState = {
  party: [],
  roster: {},
  leader: 'kade',
  inventory: {},
  credits: 0,
  flags: {},
  checkpoint: null,
  stats: { battles: 0, breaks: 0, maxDamage: 0, steps: 0, playTime: 0 },
  // enemy kind -> weakness types already discovered (Octopath keeps them revealed across battles)
  bestiary: {},
  story: { chapter: DEFAULT_STORY.chapter, objective: DEFAULT_STORY.objective, done: [] },
  played: [],
};

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level) {
  return 30 * level + 70;
}

/** Fresh POC PartyMember (full HP/EP) from a PARTY_DEFS entry: no learnsets, no `campaign` flag. */
export function makeMember(def) {
  const b = def.base;
  return {
    id: def.id, name: def.name, cls: def.cls, level: def.level,
    xp: 0, xpNext: xpToNext(def.level),
    hp: b.maxHp, maxHp: b.maxHp, ep: b.maxEp, maxEp: b.maxEp,
    stats: { atk: b.atk, def: b.def, mag: b.mag, res: b.res, spd: b.spd },
    weapons: [...def.weapons], skills: [...def.skills], accent: def.accent, alive: true,
    equip: emptyEquip(), mods: emptyMods(),
  };
}

function clearObject(o) {
  for (const k of Object.keys(o)) delete o[k];
}

function resetStory() {
  const s = gameState.story;
  s.chapter = DEFAULT_STORY.chapter;
  s.objective = DEFAULT_STORY.objective;
  if (Array.isArray(s.done)) s.done.length = 0;
  else s.done = [];
}

export function resetGame() {
  gameState.party.length = 0;
  clearObject(gameState.roster);
  for (const id of PARTY_ORDER) {
    const m = makeMember(PARTY_DEFS[id]);
    gameState.party.push(m);
    gameState.roster[id] = m;
  }
  gameState.leader = 'kade';
  clearObject(gameState.inventory);
  Object.assign(gameState.inventory, START_INVENTORY);
  gameState.credits = 0;
  clearObject(gameState.flags);
  gameState.checkpoint = null;
  Object.assign(gameState.stats, { battles: 0, breaks: 0, maxDamage: 0, steps: 0, playTime: 0 });
  clearObject(gameState.bestiary);
  resetStory();
  gameState.played.length = 0;
}

/** Starter kit of a chapter (src/content/common/data.js `kits`, also REG.kits after registration). */
export function kitFor(chapter) {
  return common.kits?.[chapter] || null;
}

/** Equips a gear set directly (no inventory traffic) and refreshes the member at full HP/EP. */
export function outfitMember(member, gear) {
  member.equip = { ...emptyEquip(), ...(gear || {}) };
  refreshMember(member);
  member.alive = true;
  member.hp = member.maxHp;
  member.ep = member.maxEp;
  return member;
}

/** Campaign start: KADE alone at level 1 with the prologue kit, story at the prologue. */
export function newGame() {
  resetGame();
  gameState.party.length = 0;
  clearObject(gameState.roster);
  const kit = kitFor('prologue');
  const kade = outfitMember(makeMemberAt('kade', 1, { flags: gameState.flags }), kit?.equip?.kade);
  gameState.roster.kade = kade;
  gameState.party.push(kade);
  gameState.leader = 'kade';
  clearObject(gameState.inventory);
  Object.assign(gameState.inventory, kit?.items || {});
  gameState.credits = kit?.credits || 0;
}

/**
 * Adds a member to the end of the formation. A roster entry is reused (raised to `level` when that
 * is higher); a new member is built at `level` (default max(2, round(average party level))) with
 * every skill up to it, flag-granted ultimates and its tier-1 gear. Either way it joins at full HP/EP.
 */
export function joinParty(id, { level } = {}) {
  if (!PARTY_DEFS[id]) {
    console.error(`joinParty: unknown member "${id}"`);
    return null;
  }
  const { party, roster } = gameState;
  let m = roster[id];
  if (!m) {
    const avg = party.length ? party.reduce((s, p) => s + p.level, 0) / party.length : 1;
    m = makeMemberAt(id, level ?? Math.max(2, Math.round(avg)), { flags: gameState.flags });
    outfitMember(m, kitFor('prologue')?.equip?.[id]);
    roster[id] = m;
  } else {
    if (level != null && level > m.level) {
      m.level = Math.min(MAX_LEVEL, Math.round(level));
      m.xp = 0;
      refreshMember(m);
      learnByLevel(m);
    }
    m.alive = true;
    m.hp = m.maxHp;
    m.ep = m.maxEp;
  }
  if (!party.includes(m)) {
    if (party.length >= MAX_PARTY) console.error(`joinParty: the party is full; ${id} stays in the roster`);
    else party.push(m);
  }
  if (!party.some((p) => p.id === gameState.leader)) gameState.leader = party[0]?.id ?? id;
  return m;
}

/** Removes a member from the party (they stay in the roster). The last member cannot leave. */
export function leaveParty(id) {
  const { party } = gameState;
  const i = party.findIndex((m) => m.id === id);
  if (i < 0 || party.length <= 1) return false;
  party.splice(i, 1);
  if (gameState.leader === id) gameState.leader = party[0].id;
  return true;
}

export function setLeader(id) {
  if (!gameState.party.some((m) => m.id === id)) {
    console.warn(`setLeader: ${id} is not in the party`);
    return false;
  }
  gameState.leader = id;
  return true;
}

/** Moves a party member to another formation slot (splices the party array in place). */
export function moveMember(id, toIndex) {
  const { party } = gameState;
  const i = party.findIndex((m) => m.id === id);
  if (i < 0) return false;
  const to = Math.max(0, Math.min(party.length - 1, Math.round(toIndex)));
  if (to === i) return true;
  const [m] = party.splice(i, 1);
  party.splice(to, 0, m);
  return true;
}

export function healParty() {
  for (const m of gameState.party) {
    m.hp = m.maxHp;
    m.ep = m.maxEp;
    m.alive = true;
  }
}

export function getMember(id) {
  return gameState.party.find((m) => m.id === id) || null;
}

export function itemCount(id) {
  return gameState.inventory[id] || 0;
}

/** How many copies of a gear id roster members wear (shops show owned = held + worn). */
export function equippedCount(id) {
  let n = 0;
  for (const m of Object.values(gameState.roster)) {
    const e = m.equip;
    if (e && (e.weapon === id || e.armor === id || e.accessory === id)) n++;
  }
  return n;
}

export function addItem(id, n = 1) {
  gameState.inventory[id] = itemCount(id) + n;
}

/** Removes up to n; returns false (and changes nothing) if fewer than n are held. */
export function removeItem(id, n = 1) {
  const have = itemCount(id);
  if (have < n) return false;
  if (have === n) delete gameState.inventory[id];
  else gameState.inventory[id] = have - n;
  return true;
}

export function hasItem(id) {
  return itemCount(id) > 0;
}

/**
 * Grants xp to one member. POC members (no `campaign` flag) keep the POC path: stats grow by
 * PARTY_DEFS growth and current HP/EP rise with them; returns [{ level, gains }]. Campaign members
 * level up to MAX_LEVEL, are refreshed from statsAt + gear (keeping the HP/EP deficit) and learn
 * their learnset skills; each entry also carries `learned` (skill ids, reported as `learn` events).
 */
export function gainXp(member, amount) {
  if (member.campaign) return gainXpCampaign(member, amount);
  const growth = PARTY_DEFS[member.id]?.growth;
  const ups = [];
  member.xp += amount;
  while (growth && member.xp >= member.xpNext) {
    member.xp -= member.xpNext;
    member.level += 1;
    member.xpNext = xpToNext(member.level);
    const gains = { ...growth };
    member.maxHp += gains.maxHp;
    member.maxEp += gains.maxEp;
    if (member.alive) {
      member.hp += gains.maxHp;
      member.ep += gains.maxEp;
    }
    for (const k of ['atk', 'def', 'mag', 'res', 'spd']) member.stats[k] += gains[k];
    ups.push({ level: member.level, gains });
  }
  return ups;
}

function gainXpCampaign(member, amount) {
  const ups = [];
  if (member.level >= MAX_LEVEL) return ups;
  member.xp += amount;
  while (member.level < MAX_LEVEL && member.xp >= member.xpNext) {
    member.xp -= member.xpNext;
    const before = { maxHp: member.maxHp, maxEp: member.maxEp, ...member.stats };
    member.level += 1;
    refreshMember(member);
    const gains = { maxHp: member.maxHp - before.maxHp, maxEp: member.maxEp - before.maxEp };
    for (const k of ['atk', 'def', 'mag', 'res', 'spd']) gains[k] = member.stats[k] - before[k];
    ups.push({ level: member.level, gains, learned: learnByLevel(member) });
  }
  if (member.level >= MAX_LEVEL) member.xp = 0;
  return ups;
}

/** Field-menu item use. Never throws; nothing is consumed when ok is false. */
export function useItemOutOfBattle(itemId, memberId) {
  const item = ITEMS[itemId];
  if (!item) return { ok: false, message: 'Unknown item.' };
  if (item.key || !item.target) return { ok: false, message: `The ${item.name} can't be used here.` };
  if (!hasItem(itemId)) return { ok: false, message: `No ${item.name} left.` };
  const fx = item.effect || {};
  if (item.target === 'enemy' || fx.damage) return { ok: false, message: `The ${item.name} only works in battle.` };
  if (item.target === 'allies') return useOnAllies(item);
  const m = getMember(memberId);
  if (!m) return { ok: false, message: 'Choose a party member.' };

  if (fx.revive) {
    if (m.alive) return { ok: false, message: `${m.name} doesn't need reviving.` };
    removeItem(itemId);
    m.alive = true;
    m.hp = Math.max(1, Math.round(m.maxHp * fx.revive));
    return { ok: true, message: `${m.name} is back up with ${m.hp} HP.` };
  }
  if (!m.alive) return { ok: false, message: `${m.name} is down. Use a Revive Kit first.` };
  if (fx.heal) {
    if (m.hp >= m.maxHp) return { ok: false, message: `${m.name}'s HP is already full.` };
    const amount = Math.min(fx.heal, m.maxHp - m.hp);
    removeItem(itemId);
    m.hp += amount;
    return { ok: true, message: `${m.name} recovered ${amount} HP.` };
  }
  if (fx.ep) {
    if (m.ep >= m.maxEp) return { ok: false, message: `${m.name}'s EP is already full.` };
    const amount = Math.min(fx.ep, m.maxEp - m.ep);
    removeItem(itemId);
    m.ep += amount;
    return { ok: true, message: `${m.name} recovered ${amount} EP.` };
  }
  // Ailments only exist in battle, so a cure has nothing to do in the field.
  if (fx.cleanse) return { ok: false, message: `${m.name} has nothing to cure.` };
  return { ok: false, message: `The ${item.name} has no effect.` };
}

function useOnAllies(item) {
  const fx = item.effect || {};
  const living = gameState.party.filter((m) => m.alive);
  if (fx.heal) {
    const hurt = living.filter((m) => m.hp < m.maxHp);
    if (!hurt.length) return { ok: false, message: 'Everyone\'s HP is already full.' };
    removeItem(item.id);
    for (const m of hurt) m.hp = Math.min(m.maxHp, m.hp + fx.heal);
    return { ok: true, message: `The squad recovered up to ${fx.heal} HP each.` };
  }
  if (fx.ep) {
    const low = living.filter((m) => m.ep < m.maxEp);
    if (!low.length) return { ok: false, message: 'Everyone\'s EP is already full.' };
    removeItem(item.id);
    for (const m of low) m.ep = Math.min(m.maxEp, m.ep + fx.ep);
    return { ok: true, message: `The squad recovered up to ${fx.ep} EP each.` };
  }
  return { ok: false, message: `The ${item.name} has no effect here.` };
}

/** pos: { x, z, facing } (copied); `map` is kept only when the caller passes one. */
export function saveCheckpoint(pos) {
  gameState.checkpoint = { x: pos.x, z: pos.z, facing: pos.facing };
  if (pos.map != null) gameState.checkpoint.map = pos.map;
}

export function loadCheckpoint() {
  const c = gameState.checkpoint;
  return c ? { ...c } : null;
}

resetGame();
