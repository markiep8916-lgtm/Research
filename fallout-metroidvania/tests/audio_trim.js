// Computes per-SFX gain trims so every effect lands near a target peak level. node tests/audio_trim.js  -> prints a TRIM literal
const { open } = require('./harness');
const TARGET = { pistol: .55, pipe: .5, rifle: .7, shotgun: .8, assault: .5, minigun: .38, laser: .45, plasma: .5, explosion: .85, hit_flesh: .4, hit_metal: .38, ricochet: .3, impact_wall: .22, hurt: .5, die: .5, player_die: .6, robot_die: .6, jump: .22, land: .18, land_hard: .4, step: .11, jet: .3, dash: .34, splash: .3, pickup: .34, caps: .26, ability: .6, bobble: .5, levelup: .5, unlock: .4, stimpak: .34, chem: .3, reload: .3, empty: .2, switch: .2, swing: .24, swing_heavy: .38, melee_hit: .5, melee_heavy: .7, wall_break: .8, bounce: .15, throw: .22, plasma_hit: .35, door: .6, door_lock: .35, beep: .2, ui_move: .16, ui_select: .26, ui_back: .2, pipboy_on: .36, pipboy_off: .22, hack_ok: .3, hack_bad: .25, key: .1, alarm: .34, robot_alert: .3, servo: .12, growl: .4, roar: .7, screech: .35, squelch: .3, buzz: .08, zap: .3, terminal_open: .3, rest: .34, save: .3, notify: .3, geiger: .12, boss: .8, thud: .45, elevator: .2, drip: .14, shield: .25 };
(async () => {
  const h = await open('start=1');
  const res = await h.T(async () => {
    const A = window.__CD.audio, out = {};
    for (const n of A.sfxNames()) { let s = 0; const k = 4; for (let i = 0; i < k; i++) { const r = await A.audit('sfx', n, 2.2); s += r ? r.peak : 0; } out[n] = s / k; }
    return out;
  });
  const trim = {};
  for (const n in res) { const t = TARGET[n]; if (!t || !res[n]) continue; trim[n] = +Math.min(24, Math.max(0.25, t / res[n])).toFixed(2); }
  console.log(JSON.stringify(trim));
  await h.browser.close();
})();
