// warden: the final boss's battle data (PURE, TECH_PLAN 2.3, 7.1-7.3, 7.9, 12.5 C11).
//
// WARDEN, two forms in one battle (`heart_boss_warden`, started by dreams.crown):
//
//   warden_lock     THE MERCIFUL LOCK. One action a round, a hymn to put the squad to sleep:
//                   Hymn of Rest (all, SPD down) opens; Lullaby (all, sleep 50%, at most 3 sleepers,
//                   never twice in a row); Cradle (one, sleep 2); Gentle Hand (one); Last Lullaby,
//                   a lock-on on round 2 and every 4th round after, named for its target ("WARDEN
//                   begins the Last Lullaby for KADE..."), fired a round later unless a Break cancels it.
//                   Weak lance, rifle, photon, void. Its shield grows by 2 after every Break (cap 16).
//                   At 50% it names Kade and cradles him next. The first lethal hit on Kade is stopped
//                   by Voss's voice from the Choir (api.protect, armed at the start, once).
//                   At 0 HP it does not fall: `onDefeat` transforms it into form 2.
//   warden_unbound  LULLABY UNBOUND. All four ultimates recharge (HALCYON speaks from BOLT); two
//                   actions a round (the desperate double turn); weaknesses from a pool of three sets
//                   that shift after every Break; the Choir speaks at 75% and 25%; at 50% Theo's voice
//                   wakes the whole squad and Sera answers; below 25% it charges the Unbound Requiem
//                   (heavy, all), which a Break cancels.
//
// `heart_boss_warden_2` is form 2 alone, for "Retry from the second form" (retryPhase); it opens on the
// flooded crown. Music: `final_boss`, then `final_boss_2` on the transform (it quotes the lullaby); the
// retry starts on it.
// Numbers come from statLine; tuning against the first-timer target (10-14 rounds across both forms,
// 2+ Breaks per form) lives in balance.js overrides (C10) and in the HP factors below. Single-target
// powers are fair to a first-timer: no untelegraphed move takes a member from full HP to 0, and a
// Defend always survives the Last Lullaby from full HP (the telegraph says so).

import { statLine } from '../balance.js';

const act = (id, name, kind, desc, extra = {}) => ({
  id, name, kind, power: 0, type: null, target: 'one', anim: 'enemyMelee', weight: 0, desc, ...extra,
});
const hit = (id, name, type, power, weight, desc, extra = {}) => act(id, name, 'attack', desc, { type, power, weight, ...extra });
const line = (speaker, text, extra = {}) => ({ speaker, text, ...extra });

// Members the Last Lullaby can be named for (the telegraph text is per action, so one lock-on each).
export const LOCK_MEMBERS = ['kade', 'nyx', 'orion', 'sera'];
const lockId = (member) => `wl_lock_${member}`;
const lockOn = (id, telegraph) => act(id, 'Last Lullaby', 'lockOn', 'It begins a song for one of you alone.', {
  anim: 'enemyCharge', fires: 'wl_last_lullaby', telegraph, fx: 'warden.lock',
});

// Scales a boss line's HP and offence (numbers are statLine's; C10's overrides apply on top).
const tuned = (line0, { hp = 1, offense = 1 }) => ({
  ...line0,
  maxHp: Math.round((line0.maxHp * hp) / 10) * 10,
  stats: { ...line0.stats, atk: Math.round(line0.stats.atk * offense), mag: Math.round(line0.stats.mag * offense) },
});

// a little forward of the usual boss slot, so the 256-px construct's eye stays in the focus band
// (the crown arena's inlay sits under it)
export const STAGE_SLOT = [-4.4, 2.2];
const STAGE = { slot: STAGE_SLOT };

const enemies = {
  warden_lock: {
    kind: 'warden_lock', name: 'WARDEN', art: 'warden_lock', boss: true, ai: 'basic', script: 'warden',
    stage: STAGE,
    ...tuned(statLine(31, 'boss'), { hp: 1.35, offense: 1.65 }), shield: 3, maxShieldCap: 16, shieldGain: 2,
    weaknesses: ['lance', 'rifle', 'photon', 'void'],
    immune: ['sleep'],
    onDefeat: { transform: 'warden_unbound', say: [line('WARDEN', 'No. Please. Please, let me keep them.')] },
    actions: [
      hit('wl_hymn', 'Hymn of Rest', 'photon', 0.55, 25, 'A slow chord that weighs every limb. Lowers SPD.', {
        target: 'all', anim: 'enemyBeam', fx: 'warden.hymn', effect: { stats: ['spd'], stage: -1, turns: 3 },
      }),
      hit('wl_lullaby', 'Lullaby', 'void', 0.32, 30, 'The song it sang the twelve thousand. Puts up to three to sleep.', {
        target: 'all', anim: 'enemyBeam', cooldown: 1, fx: 'warden.lullaby',
        effect: { stats: ['sleep'], stage: 1, turns: 2, chance: 0.5, limit: 3 },
      }),
      hit('wl_cradle', 'Cradle', 'void', 1.0, 22, 'Its arms close around one of you. Sleep for two turns.', {
        cooldown: 1, fx: 'warden.cradle', pose: 'cast', effect: { stats: ['sleep'], stage: 1, turns: 2 },
      }),
      hit('wl_hand', 'Gentle Hand', 'photon', 1.1, 23, 'A hand of light, laid on one of you like a blanket.', { anim: 'enemyShot' }),
      ...LOCK_MEMBERS.map((m) => lockOn(lockId(m), `WARDEN begins the Last Lullaby for ${m.toUpperCase()}...`)),
      lockOn('wl_lock', 'WARDEN begins the Last Lullaby...'),
      hit('wl_last_lullaby', 'Last Lullaby', 'photon', 1.9, 0, 'The song\'s last verse, for one listener. Defend.', {
        anim: 'enemyBeam', fx: 'warden.last_lullaby',
      }),
    ],
    drops: [],
  },

  warden_unbound: {
    kind: 'warden_unbound', name: 'WARDEN', art: 'warden_unbound', boss: true, ai: 'basic', script: 'warden_unbound',
    stage: STAGE,
    ...tuned(statLine(32, 'boss'), { hp: 0.75, offense: 1.8 }), shield: 3, maxShieldCap: 6, shieldGain: 1, actionsPerRound: 2,
    weaknesses: ['gauntlet', 'cryo', 'photon', 'blade'],
    weaknessPool: [['gauntlet', 'cryo', 'photon', 'blade'], ['thermal', 'void', 'lance', 'rifle'], ['volt', 'photon', 'rifle', 'gauntlet']],
    shiftOnRecover: true,
    immune: ['sleep'],
    actions: [
      hit('wu_swell', 'Choir Swell', 'photon', 0.45, 30, 'Twelve thousand voices rise at once.', {
        target: 'all', anim: 'enemyBeam', cooldown: 1, fx: 'warden.swell',
      }),
      hit('wu_lullaby', 'Unbound Lullaby', 'void', 0.3, 22, 'The lullaby, louder. Puts up to two to sleep.', {
        target: 'all', anim: 'enemyBeam', cooldown: 2, fx: 'warden.lullaby',
        effect: { stats: ['sleep'], stage: 1, turns: 2, chance: 0.35, limit: 2 },
      }),
      hit('wu_cradle', 'Cradle of Stars', 'void', 0.7, 18, 'A cradle of falling light closes on one of you.', {
        cooldown: 2, fx: 'warden.cradle', pose: 'cast', effect: { stats: ['sleep'], stage: 1, turns: 2 },
      }),
      hit('wu_fall', 'Falling Light', 'photon', 0.27, 30, 'Pieces of the Choir\'s light fall on one of you.', { hits: 3, anim: 'enemyShot', fx: 'warden.fall' }),
      act('wu_gather', 'Unbound Requiem', 'charge', 'It gathers every voice into one note. Break it, or Defend.', {
        anim: 'enemyCharge', fires: 'wu_requiem', chargeRounds: 1,
        telegraph: 'WARDEN gathers every voice into one note...', fx: 'warden.gather',
      }),
      hit('wu_requiem', 'Unbound Requiem', 'void', 1.1, 0, 'Every voice of the Choir, sung at once.', {
        target: 'all', anim: 'enemyBeam', fx: 'warden.requiem',
      }),
    ],
    drops: [{ id: 'medigel_max', chance: 1, n: 2 }, { id: 'revive_plus', chance: 1, n: 1 }],
  },
};

// ---------------------------------------------------------------- boss scripts (7.3)

/** The member the Last Lullaby is sung for: awake and standing, the healthiest first (seeded tie-break). */
function lockTarget(api) {
  const pool = api.party().filter((p) => !p.buffs?.sleep);
  const list = pool.length ? pool : api.party();
  if (!list.length) return null;
  const score = (p) => p.hp / p.maxHp + api.rng() * 0.35;
  return list.reduce((a, b) => (score(b) > score(a) ? b : a));
}

/**
 * Voss's voice from the Choir: the first lethal hit on Kade leaves him at 1 HP (api.protect, armed at
 * the start: cue 'protect'); the model's cue 'protected' plays the shield, then her line and his.
 */
function vossKeepsWatch(api, h) {
  if (!h.protected || h.targetId !== 'kade' || api.mem.vossSpoke) return;
  api.mem.vossSpoke = true;
  api.say('VOSS', 'Not him. Not while I\'m keeping watch.', { portrait: 'voss' });
  api.say('KADE', '...Commander.', { expr: 'sad' });
}

function armVoss(api) {
  const kade = api.member('kade');
  if (kade?.alive) api.protect('kade');
}

const bossScripts = {
  warden: {
    thresholds: [0.5],
    onBegin(api) {
      api.mem.nextLock = 2;
      armVoss(api);
    },
    chooseAction(api, e) {
      if (api.round === 1 && !api.mem.opened) {
        api.mem.opened = true;
        return { actionId: 'wl_hymn' };
      }
      if (api.mem.cradle) {
        const id = api.mem.cradle;
        api.mem.cradle = null;
        return { actionId: 'wl_cradle', targetId: id };
      }
      if (api.round >= api.mem.nextLock && !e.broken && !e.lockOnTarget) {
        api.mem.nextLock = api.round + 4;
        const t = lockTarget(api);
        if (!t) return null;
        return { actionId: LOCK_MEMBERS.includes(t.id) ? lockId(t.id) : 'wl_lock', targetId: t.id };
      }
      return null;
    },
    // At half, it names Kade like a chart and cradles him with its next action.
    onThreshold(api, e) {
      const kade = api.member('kade');
      api.cue('cradle_close', { targetId: e.id });
      if (kade?.alive) {
        api.say('WARDEN', 'Kade Arden. Pod 07. You were always the first to stand.');
        api.say('WARDEN', 'Sit down now. Rest.');
        api.mem.cradle = kade.id;
      } else {
        api.say('WARDEN', 'Hush. Hush now. Everyone you love is here.');
      }
    },
    // The shield it grows back after each Break (the arena's rings answer it).
    onRecover(api, e) {
      api.cue('lock_shield', { targetId: e.id, value: e.maxShield });
    },
    onHit: vossKeepsWatch,
  },

  warden_unbound: {
    thresholds: [0.75, 0.5, 0.25],
    // heart_boss_warden_2 (Retry from the second form): the crown is already flooded with the Choir's
    // light, and Voss keeps watch here too.
    onBegin(api) {
      api.cue('choir_flood', { targetId: api.enemies()[0]?.id });
      armVoss(api);
      api.mem.requiemAt = 0;
    },
    // The transform from form 1: every ultimate is ready again, and HALCYON says so from BOLT.
    onTransform(api, e) {
      api.mem.requiemAt = 0;
      api.cue('choir_flood', { targetId: e.id });
      api.rechargeUltimates();
      api.say('HALCYON', 'I can give you this much. Once more.', { portrait: 'holo' });
    },
    chooseAction(api, e) {
      // below a quarter: the Requiem, charged with its first action, then every third round
      if (e.hp < e.maxHp * 0.25 && !e.broken && !e.charge && !e.lockOnTarget && api.round >= api.mem.requiemAt) {
        api.mem.requiemAt = api.round + 3;
        api.say('WARDEN', 'Then I will sing until you sleep.');
        return { actionId: 'wu_gather' };
      }
      return null;
    },
    onThreshold(api, e, f) {
      if (f === 0.75) {
        api.cue('choir_voices', { targetId: e.id, value: 1 });
        api.say('CHOIR', 'Is it morning yet?');
      } else if (f === 0.5) {
        api.cue('theo', { targetId: e.id });
        api.say('THEO', 'Sera? Is it time to wake up?', { portrait: 'theo' });
        api.say('SERA', 'Yes. It\'s time, Theo. Wake up.', { expr: 'determined' });
        api.cleanse('party', ['sleep']);
      } else {
        api.cue('choir_voices', { targetId: e.id, value: 2 });
        api.say('CHOIR', 'We hear them. We hear them waking.');
      }
    },
    onHit: vossKeepsWatch,
  },
};

// ---------------------------------------------------------------- encounters

const INTRO_1 = { title: 'WARDEN', subtitle: 'The Merciful Lock', lines: [line('WARDEN', 'I am sorry. This will not hurt for long.')] };
const INTRO_2 = { title: 'WARDEN', subtitle: 'Lullaby Unbound', lines: [line('WARDEN', 'No. Please. Please, let me keep them.')] };
const OUTRO = { lines: [line('WARDEN', 'So loud. You are all so loud. So awake.')] };
const SHIFT_TIP = {
  on: 'weakShift', flag: 'tut:warden_shift',
  lines: [line('ORION', 'It moves its weak points after every *Break*. Probe again.')],
};

const encounters = {
  heart_boss_warden: {
    id: 'heart_boss_warden', enemies: ['warden_lock'], backdrop: 'heart_crown', boss: true, canFlee: false,
    music: 'final_boss', phaseMusic: { warden_unbound: 'final_boss_2' },
    retryPhase: { encounter: 'heart_boss_warden_2' },
    intro: INTRO_1, outro: OUTRO, tips: [SHIFT_TIP],
  },
  heart_boss_warden_2: {
    id: 'heart_boss_warden_2', enemies: ['warden_unbound'], backdrop: 'heart_crown', boss: true, canFlee: false,
    music: 'final_boss_2', intro: INTRO_2, outro: OUTRO, tips: [SHIFT_TIP],
  },
};

export default { enemies, encounters, bossScripts };
