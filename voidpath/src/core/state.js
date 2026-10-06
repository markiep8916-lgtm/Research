// Global game state (party, inventory, flags, stats) and the helpers that mutate it.
// Pure logic: no DOM. `gameState` is a single long-lived object; helpers mutate it in place,
// so references to gameState, gameState.party and gameState.inventory stay valid after resetGame().

import { PARTY_DEFS, ITEMS } from '../battle/data.js';

export const PARTY_ORDER = ['kade', 'nyx', 'orion', 'sera'];
export const START_INVENTORY = { medigel: 3, ether: 1, revive: 1 };

export const gameState = {
  party: [],
  inventory: {},
  credits: 0,
  flags: {},
  checkpoint: null,
  stats: { battles: 0, breaks: 0, maxDamage: 0, steps: 0, playTime: 0 },
  // enemy kind -> weakness types already discovered (Octopath keeps them revealed across battles)
  bestiary: {},
};

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level) {
  return 30 * level + 70;
}

/** Fresh PartyMember (full HP/EP) from a PARTY_DEFS entry. */
export function makeMember(def) {
  const b = def.base;
  return {
    id: def.id, name: def.name, cls: def.cls, level: def.level,
    xp: 0, xpNext: xpToNext(def.level),
    hp: b.maxHp, maxHp: b.maxHp, ep: b.maxEp, maxEp: b.maxEp,
    stats: { atk: b.atk, def: b.def, mag: b.mag, res: b.res, spd: b.spd },
    weapons: [...def.weapons], skills: [...def.skills], accent: def.accent, alive: true,
  };
}

function clearObject(o) {
  for (const k of Object.keys(o)) delete o[k];
}

export function resetGame() {
  gameState.party.length = 0;
  for (const id of PARTY_ORDER) gameState.party.push(makeMember(PARTY_DEFS[id]));
  clearObject(gameState.inventory);
  Object.assign(gameState.inventory, START_INVENTORY);
  gameState.credits = 0;
  clearObject(gameState.flags);
  gameState.checkpoint = null;
  Object.assign(gameState.stats, { battles: 0, breaks: 0, maxDamage: 0, steps: 0, playTime: 0 });
  clearObject(gameState.bestiary);
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
 * Grants xp to one member, applying level-ups (stats grow by PARTY_DEFS[id].growth; current HP/EP
 * rise by the same amount). Returns [{ level, gains }] for each level gained.
 */
export function gainXp(member, amount) {
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

/** Field-menu item use. Never throws; nothing is consumed when ok is false. */
export function useItemOutOfBattle(itemId, memberId) {
  const item = ITEMS[itemId];
  if (!item) return { ok: false, message: 'Unknown item.' };
  if (item.key || !item.target) return { ok: false, message: `The ${item.name} can't be used here.` };
  if (!hasItem(itemId)) return { ok: false, message: `No ${item.name} left.` };
  const m = getMember(memberId);
  if (!m) return { ok: false, message: 'Choose a party member.' };
  const fx = item.effect;

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
  return { ok: false, message: `The ${item.name} has no effect.` };
}

/** pos: { x, z, facing } (copied). */
export function saveCheckpoint(pos) {
  gameState.checkpoint = { x: pos.x, z: pos.z, facing: pos.facing };
}

export function loadCheckpoint() {
  const c = gameState.checkpoint;
  return c ? { ...c } : null;
}

resetGame();
