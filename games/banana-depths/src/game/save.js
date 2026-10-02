// Save state + persistence (localStorage, always guarded: the page may run where storage is unavailable).
const KEY = 'banana-depths-save-v1';

export function newSave(start) {
  return {
    version: 1,
    hp: 3, hpMax: 3,
    abilities: { roll: false, pound: false, grip: false, boom: false },
    bananas: 0,
    collected: {},
    broken: {},
    flags: {},
    visited: {},
    spawn: { room: start.room, x: start.x, y: start.y },
    playtime: 0, deaths: 0, kills: 0,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !s.spawn) return null;
    return s;
  } catch { return null; }
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); return true; } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function saveSettings(o) { try { localStorage.setItem('banana-depths-settings', JSON.stringify(o)); } catch { /* ignore */ } }
export function loadSettings() { try { return JSON.parse(localStorage.getItem('banana-depths-settings') || '{}'); } catch { return {}; } }
