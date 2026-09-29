// Persistence (localStorage) with graceful fallback when storage is unavailable.
(function () {
'use strict';
const CD = window.CD, U = CD.U;
const G = (CD.G = CD.G || {});
const KEY = 'cinderdeep.save.v1', OPT = 'cinderdeep.opts.v1';
let mem = {};
function get(k) { try { return window.localStorage.getItem(k); } catch (e) { return mem[k] || null; } }
function set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
function del(k) { try { window.localStorage.removeItem(k); } catch (e) { delete mem[k]; } }

G.hasSave = function () { const s = get(KEY); if (!s) return false; try { const o = JSON.parse(s); return !!(o && o.st); } catch (e) { return false; } };
G.saveInfo = function () { try { const o = JSON.parse(get(KEY)); return { time: o.st.time, level: o.st.level, room: o.room, ts: o.ts }; } catch (e) { return null; } };
G.autosave = function () {
  if (!G.st || !G.player) return false;
  const st = G.st; const p = G.player;
  const snap = { v: 1, ts: Date.now(), st, room: G.room && G.room.name, pos: { x: p.cx, y: p.bottom } };
  set(KEY, JSON.stringify(snap)); return true;
};
G.loadSave = function () {
  try {
    const o = JSON.parse(get(KEY)); if (!o || !o.st) return false;
    G.st = Object.assign(G.defaultState(), o.st);
    G.st.aid = Object.assign(G.defaultState().aid, o.st.aid);
    G.world.mapVer = (G.world.mapVer || 0) + 1;
    G.loadWorld(false);
    if (o.st.bed) { G.player.x = o.st.bed.x - G.player.w / 2; G.player.y = o.st.bed.y - G.player.h; G.snapCamera(); }
    G.st.hp = G.maxHP(); G.st.rad = Math.max(0, G.st.rad);
    G.setState('play'); return true;
  } catch (e) { console.warn('load failed', e); return false; }
};
G.deleteSave = function () { del(KEY); };
G.loadOptions = function () { try { const o = JSON.parse(get(OPT)); if (o) { if (o.vol) Object.assign(CD.audio.vol, o.vol); CD.audio.muted = !!o.muted; G.opts = o.opts || {}; } } catch (e) { } G.opts = G.opts || {}; };
G.saveOptions = function () { set(OPT, JSON.stringify({ vol: CD.audio.vol, muted: CD.audio.muted, opts: G.opts })); };

})();
