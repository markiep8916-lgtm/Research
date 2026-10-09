// spire: battle and economy data (PURE, TECH_PLAN 2.3, 7.1-7.3, 7.8, 7.9, 12.5).
//
// Regular enemies of chapter 3 (art by the bestiary task in enemyart.js, art key = kind). Each one
// teaches a piece of Commander Voss, and each lesson is scripted (G2 bar rule 6), never left to a roll:
//   sec_trooper   marks a target in round 1, then focuses it           Voss's Command: Focus Fire
//   riot_drone    jams a traveler's skills in round 1                    Stim, basic attacks
//   sentinel_mk3  locks on in round 1 and fires next round                Voss's escorts
//   laser_turret  charges a piercing beam on everyone                     Defend timing
// Boss COMMANDER VOSS (7.9) with two Sentinel Mk-III escorts (`voss_escort`): Halberd Sweep (all),
// Halberd Thrust, Command: Focus Fire (marked 2 rounds: the escorts follow the mark), Execution Arc
// (heavy, on the marked traveler; fx voss.execution). At 50% she overclocks (`voss_overclock`: her
// upload half shows through, new weaknesses, two actions, Rest Protocol) and Kade's ultimate awakens.
// `winOn: 'boss'`: the escorts shut down with her.
// M3: the Sentinel Mk-III Prime (optional elite of the firing range, guards eq_x_sentinel_core) and a
// rare Honour Guard formation (big drops).
//
// Zones: spire_barracks (Checkpoint, Barracks, Armory, the cell block until the cadets are free),
// spire_upper (Officers' Deck, Training Hall, Firing Range). Shop `quartermaster` opens when the
// cadets are freed. Numbers come from statLine (balance.js); C10 tunes them through overrides.
// Measured with tests/campaign.mjs (the ch3 route and the first-timer route): XP at 0.78 of the line
// lands the party on about 22 at Voss and 22-23 at the end; Voss's shield 4 (two Breaks a fight), HP 0.81
// and attack 1.05 of the boss line: the first-timer wins 79% in a median of 10 rounds with 2 Breaks.

import { statLine } from '../balance.js';

const CH3_XP = 0.78;
/** statLine with chapter 3's XP, optionally scaling HP and attack. */
const line = (level, archetype, { hp = 1, atk = 1 } = {}) => {
  const s = statLine(level, archetype);
  return {
    ...s,
    maxHp: Math.round((s.maxHp * hp) / 10) * 10,
    stats: { ...s.stats, atk: Math.round(s.stats.atk * atk) },
    xp: Math.round(s.xp * CH3_XP),
  };
};

const act = (id, name, kind, desc, extra = {}) => ({
  id, name, kind, power: 0, type: null, target: 'one', anim: 'enemyMelee', weight: 0, desc, ...extra,
});
const hit = (id, name, type, power, weight, desc, extra = {}) => act(id, name, 'attack', desc, { type, power, weight, ...extra });
const MARK = { stats: ['marked'], stage: 1, turns: 2 };

const TROOPER_ACTIONS = [
  hit('trooper_burst', 'Carbine Burst', 'rifle', 0.95, 60, 'Three rounds, tightly grouped.', { anim: 'enemyShot' }),
  act('trooper_mark', 'Target Lock', 'debuff', 'Paints one traveler with a laser sight. Every gun follows the mark.', {
    anim: 'enemyCharge', pose: 'special', effect: MARK, weight: 15, cooldown: 3,
  }),
  hit('trooper_focus', 'Focus Shot', 'rifle', 1.35, 0, 'An aimed shot at the marked target.', { anim: 'enemyShot' }),
];

const MK3_ACTIONS = [
  hit('mk3_cannon', 'Arm Cannon', 'void', 1.0, 60, 'A pulse from the arm cannon.', { anim: 'enemyShot' }),
  act('mk3_lock', 'Target Pod', 'lockOn', 'Its shoulder pod locks onto one traveler. It fires next round.', {
    anim: 'enemyCharge', fires: 'mk3_rail', weight: 40, minRound: 2, cooldown: 3,
  }),
  hit('mk3_rail', 'Pod Lance', 'photon', 2.0, 0, 'The locked shot. Heavy photon damage.', { anim: 'enemyBeam' }),
];

const enemies = {
  sec_trooper: {
    kind: 'sec_trooper', name: 'Security Trooper', script: 'sec_trooper', ...line(18, 'standard'), shield: 4,
    weaknesses: ['lance', 'thermal', 'volt'],
    actions: TROOPER_ACTIONS,
    drops: [{ id: 'medigel_plus', chance: 0.12, n: 1 }],
  },
  riot_drone: {
    kind: 'riot_drone', name: 'Riot Drone', script: 'riot_drone', ...line(18, 'caster'), shield: 4,
    weaknesses: ['rifle', 'cryo', 'gauntlet'],
    actions: [
      hit('riot_ram', 'Shield Ram', 'gauntlet', 1.05, 60, 'Drives its riot shield into one traveler.'),
      hit('riot_shock', 'Shock Baton', 'volt', 0.75, 40, 'A crackling sweep across the squad.', { target: 'all', cooldown: 1, anim: 'enemyShot' }),
      act('riot_jam', 'Static Flood', 'debuff', 'Floods the air with red static. One traveler\'s skills are jammed.', {
        anim: 'enemyCharge', pose: 'special', effect: { stats: ['jam'], stage: 1, turns: 2 }, weight: 0,
      }),
    ],
    drops: [{ id: 'stim', chance: 0.2, n: 1 }],
  },
  laser_turret: {
    kind: 'laser_turret', name: 'Laser Turret', ...line(19, 'armored'), shield: 5,
    weaknesses: ['cryo', 'void', 'blade'],
    actions: [
      hit('turret_sweep', 'Sweep Shot', 'photon', 0.9, 60, 'A short burst from the focusing barrel.', { anim: 'enemyShot' }),
      act('turret_charge', 'Focus Barrel', 'charge', 'The barrel glows white. It fires through everyone next round.', {
        anim: 'enemyCharge', fires: 'turret_pierce', chargeRounds: 1, telegraph: 'The Laser Turret\'s barrel glows white...',
        weight: 40, minRound: 1, cooldown: 3,
      }),
      hit('turret_pierce', 'Piercing Beam', 'photon', 1.45, 0, 'A white beam through the whole squad.', { target: 'all', anim: 'enemyBeam' }),
    ],
    drops: [{ id: 'volt_charge', chance: 0.15, n: 1 }],
  },
  sentinel_mk3: {
    kind: 'sentinel_mk3', name: 'Sentinel Mk-III', script: 'sentinel_mk3', ...line(20, 'brute'), shield: 5,
    weaknesses: ['gauntlet', 'volt', 'void'],
    actions: MK3_ACTIONS,
    drops: [{ id: 'ether_plus', chance: 0.2, n: 1 }],
  },

  // ---- COMMANDER VOSS (7.9) and her escorts
  voss: {
    kind: 'voss', name: 'Commander Voss', art: 'voss', boss: true, ai: 'basic', script: 'voss', stage: { scale: 1.2 },
    ...line(22, 'boss', { hp: 0.81, atk: 1.05 }), shield: 4, maxShieldCap: 13,
    weaknesses: ['blade', 'rifle', 'cryo', 'photon'],
    actions: [
      hit('voss_sweep', 'Halberd Sweep', 'blade', 0.85, 45, 'The energy halberd sweeps the whole squad.', { target: 'all', fx: 'voss.sweep' }),
      hit('voss_thrust', 'Halberd Thrust', 'lance', 1.25, 55, 'A straight, fast thrust. She never wastes one.'),
      act('voss_command', 'Command: Focus Fire', 'debuff', 'Marks one traveler. Her escorts fire where she points.', {
        anim: 'enemyCharge', pose: 'special', effect: MARK,
      }),
      hit('voss_execution', 'Execution Arc', 'volt', 2.1, 0, 'A falling arc of light on the marked traveler.', { fx: 'voss.execution', pose: 'special' }),
    ],
    drops: [{ id: 'revive_plus', chance: 1, n: 1 }, { id: 'medigel_max', chance: 1, n: 1 }],
  },
  voss_overclock: {
    kind: 'voss_overclock', name: 'Commander Voss', art: 'voss_overclock', boss: true, ai: 'basic', script: 'voss', stage: { scale: 1.2 },
    ...line(22, 'boss', { hp: 0.81, atk: 1.05 }), shield: 4, maxShieldCap: 13, actionsPerRound: 2,
    weaknesses: ['lance', 'volt', 'thermal', 'void'],
    actions: [
      hit('voss_sweep', 'Halberd Sweep', 'blade', 0.85, 45, 'The energy halberd sweeps the whole squad.', { target: 'all', fx: 'voss.sweep' }),
      hit('voss_thrust', 'Halberd Thrust', 'lance', 1.2, 55, 'A straight, fast thrust. She never wastes one.'),
      act('voss_command', 'Command: Focus Fire', 'debuff', 'Marks one traveler. Her escorts fire where she points.', {
        anim: 'enemyCharge', pose: 'special', effect: MARK,
      }),
      hit('voss_execution', 'Execution Arc', 'volt', 2.0, 0, 'A falling arc of light on the marked traveler.', { fx: 'voss.execution', pose: 'special' }),
      act('voss_rest', 'Rest Protocol', 'debuff', 'WARDEN\'s voice in hers. One traveler may fall asleep.', {
        anim: 'enemyCharge', pose: 'special', effect: { stats: ['sleep'], stage: 1, turns: 2, chance: 0.5 },
      }),
    ],
    drops: [],
  },
  voss_escort: {
    kind: 'voss_escort', name: 'Sentinel Mk-III', art: 'sentinel_mk3', script: 'sentinel_mk3', ...line(20, 'standard'), shield: 4,
    weaknesses: ['gauntlet', 'volt', 'void'],
    actions: MK3_ACTIONS,
    drops: [],
  },

  // ---- M3: the optional elite of the firing range and the rare honour guard
  mk3_prime: {
    kind: 'mk3_prime', name: 'Sentinel Mk-III Prime', art: 'sentinel_mk3', tint: '#ffd9a0', boss: true, ai: 'basic',
    script: 'sentinel_mk3', ...line(23, 'elite'), shield: 8, maxShieldCap: 12, actionsPerRound: 2,
    weaknesses: ['gauntlet', 'void'],
    stage: { scale: 1.2 },
    actions: [
      ...MK3_ACTIONS,
      hit('prime_sweep', 'Grav Sweep', 'void', 0.8, 30, 'Its grav ring pulses across the squad.', { target: 'all', cooldown: 1, anim: 'enemyBeam' }),
    ],
    drops: [{ id: 'eq_x_sentinel_core', chance: 1, n: 1 }, { id: 'ether_plus', chance: 1, n: 1 }],
  },
  honour_guard: {
    kind: 'honour_guard', name: 'Honour Guard', art: 'sec_trooper', tint: '#ffe08a', script: 'sec_trooper', ...line(19, 'swarm'),
    shield: 3, weaknesses: ['photon', 'thermal'],
    xp: 520, credits: 900,
    actions: TROOPER_ACTIONS,
    drops: [{ id: 'medigel_max', chance: 0.5, n: 1 }, { id: 'revive_plus', chance: 0.4, n: 1 }],
  },
};

// ---------------------------------------------------------------- boss and teaching scripts (7.3)

const alive = (api, kinds) => api.enemies().filter((e) => kinds.includes(e.key));
const someoneMarked = (api) => api.party().some((m) => m.alive && m.buffs.marked);

const bossScripts = {
  // The first trooper paints a target with its first action; then every trooper fires at the mark
  // while it lasts, and paints a new one when it fades.
  sec_trooper: {
    chooseAction(api, e) {
      const troopers = alive(api, ['sec_trooper', 'honour_guard']);
      if (someoneMarked(api)) return { actionId: 'trooper_focus' };
      if (troopers[0] && troopers[0].id === e.id && (api.round === 1 || api.round >= (api.mem.nextMark ?? 99))) {
        api.mem.nextMark = api.round + 3;
        return { actionId: 'trooper_mark' };
      }
      return null;
    },
  },
  // The first riot drone jams a traveler with its first action (the Stim lesson), then fights.
  riot_drone: {
    chooseAction(api, e) {
      const drones = alive(api, ['riot_drone']);
      if (api.mem.jammed || !drones[0] || drones[0].id !== e.id) return null;
      api.mem.jammed = true;
      return { actionId: 'riot_jam' };
    },
  },
  // A Mk-III locks on with its first action, so its telegraph lands in round 1 (Voss's escorts).
  sentinel_mk3: {
    chooseAction(api, e) {
      const sents = alive(api, ['sentinel_mk3', 'voss_escort', 'mk3_prime']);
      if (api.mem.locked || !sents[0] || sents[0].id !== e.id || api.round > 1) return null;
      api.mem.locked = true;
      return { actionId: 'mk3_lock' };
    },
  },
  // Voss runs a three-round drill: Command (mark), Execution Arc on the mark, then the halberd. At 50%
  // she overclocks: her upload half shows through, WARDEN speaks in her voice, and Kade answers.
  voss: {
    thresholds: [0.5],
    onBegin(api) {
      api.mem.drill = 0;
      api.mem.acted = {};
    },
    chooseAction(api, e) {
      const n = (api.mem.acted[api.round] = (api.mem.acted[api.round] || 0) + 1);
      if (n > 1) {
        // the overclock's second action: Rest Protocol every third round, else the halberd
        if (api.round % 3 === 0 && !api.mem.restRound) {
          api.mem.restRound = api.round;
          return { actionId: 'voss_rest' };
        }
        api.mem.restRound = 0;
        return null;
      }
      const step = api.mem.drill++ % 3;
      if (step === 0) {
        if (!api.mem.commanded) {
          api.mem.commanded = true;
          api.say('VOSS', 'Command: focus fire.', { expr: 'determined' });
        }
        return { actionId: 'voss_command' };
      }
      if (step === 1 && someoneMarked(api)) return { actionId: 'voss_execution' };
      return null;
    },
    onPartyAction(api, actor, action) {
      if (action.skillId !== 'provoke' || api.mem.provoked || !someoneMarked(api)) return;
      api.mem.provoked = true;
      api.say('VOSS', 'Still stepping in front of them. I taught you that too.');
    },
    onThreshold(api, e) {
      api.cue('voss_overclock', { targetId: e.id });
      api.transform(e.id, 'voss_overclock', { keepHp: true });
      api.say('VOSS', 'Rest, Kade. There is nowhere. Rest.', { expr: 'sad' });
      api.say('KADE', 'Then we make somewhere.', { expr: 'determined' });
      api.grantUltimate('kade');
    },
  },
};

// ---------------------------------------------------------------- encounters and zones

const enc = (id, list, extra = {}) => ({ id, enemies: list, backdrop: 'spire', boss: false, canFlee: true, music: 'battle_2', ...extra });

const encounters = {
  // scripted lessons (one new mechanic each, G2 rule 6)
  spire_troopers: enc('spire_troopers', ['sec_trooper', 'sec_trooper'], { canFlee: false }),
  spire_riot: enc('spire_riot', ['riot_drone', 'sec_trooper'], {
    canFlee: false,
    // the trooper's mark was this squad's last lesson: hold its tip back, teach only the jam
    tips: [{ on: 'status:marked', lines: [] }],
  }),
  spire_mk3_guard: enc('spire_mk3_guard', ['sec_trooper', 'sentinel_mk3', 'riot_drone'], {
    canFlee: false,
    tips: [{
      on: 'telegraph', flag: 'tut:mk3_lock',
      lines: [{ speaker: 'KADE', text: 'Mk-III. It locked on to one of us. *Defend*, or Break it before it fires.' }],
    }],
  }),
  // Checkpoint, Barracks, Armory, the cell block
  spire_cp_pair: enc('spire_cp_pair', ['sec_trooper', 'riot_drone']),
  spire_cp_turret: enc('spire_cp_turret', ['sec_trooper', 'laser_turret', 'sec_trooper']),
  spire_cp_riot: enc('spire_cp_riot', ['riot_drone', 'riot_drone']),
  spire_cp_squad: enc('spire_cp_squad', ['sec_trooper', 'sec_trooper', 'riot_drone']),
  // Officers' Deck, Training Hall, Firing Range
  spire_up_mk3: enc('spire_up_mk3', ['sec_trooper', 'sentinel_mk3']),
  spire_up_turret: enc('spire_up_turret', ['laser_turret', 'riot_drone']),
  spire_up_lock: enc('spire_up_lock', ['sentinel_mk3', 'laser_turret']),
  spire_up_squad: enc('spire_up_squad', ['sec_trooper', 'riot_drone', 'sec_trooper']),
  spire_honour: enc('spire_honour', ['honour_guard', 'honour_guard', 'honour_guard']),

  // the boss
  spire_boss_voss: {
    id: 'spire_boss_voss', enemies: ['voss_escort', 'voss', 'voss_escort'], backdrop: 'spire_command', boss: true, canFlee: false,
    music: 'boss', winOn: 'boss',
    intro: { title: 'COMMANDER VOSS', subtitle: 'Security Command', lines: [{ speaker: 'VOSS', text: 'Show me you\'re right, Lieutenant.', expr: 'determined' }] },
    outro: { lines: [{ speaker: 'VOSS', text: '...Good. That\'s... good.', expr: 'sad' }] },
    tips: [{
      on: 'status:marked', flag: 'tut:voss_mark',
      lines: [{ speaker: 'KADE', text: 'She marked one of us. The escorts follow. *Provoke* pulls them to me.' }],
    }],
  },
  // M3: the optional elite of the firing range
  spire_elite_prime: {
    id: 'spire_elite_prime', enemies: ['mk3_prime'], backdrop: 'spire', boss: true, canFlee: false, music: 'boss',
    intro: { title: 'MK-III PRIME', subtitle: 'Range Warden', lines: [] },
  },
};

const zones = {
  spire_barracks: ['spire_cp_pair', 'spire_cp_turret', 'spire_cp_riot', 'spire_cp_squad', 'spire_cp_pair', 'spire_cp_squad'],
  spire_upper: [
    'spire_up_mk3', 'spire_up_turret', 'spire_up_lock', 'spire_up_squad',
    'spire_up_mk3', 'spire_up_turret', 'spire_up_lock', 'spire_up_squad', 'spire_honour',
  ],
};

// ---------------------------------------------------------------- the quartermaster (opens with the cadets)

const shops = {
  quartermaster: {
    name: 'Quartermaster', keeper: 'MIKA OKAFOR', portrait: 'cadet_mika',
    greeting: 'Quartermaster\'s open, sir. Voss kept the shelves stocked. Just in case.',
    sellRate: 0.5,
    stock: [
      { item: 'medigel_plus' },
      { item: 'ether_plus' },
      { item: 'revive' },
      { item: 'stim' },
      { item: 'nanomist' },
      { item: 'volt_charge' },
      { item: 'eq_a_4' },
      { item: 'eq_x_vital_core' },
      { item: 'eq_x_ground_coil' },
      { item: 'revive_plus', when: 'chapter>=ch4' },
    ],
  },
};

// From the critical path with its chest detours (tests/routes/spire.mjs legs): about 190 units in the
// lower decks and 146 on Deck 5, for four or five random fights beside the troopers, the riot drone, the
// Mk-III and Voss (the human-pace walker steers round props and covers a little more ground).
const zoneRates = {
  spire_barracks: { grace: 18, sigma: 36 },
  spire_upper: { grace: 18, sigma: 36 },
};

export default { enemies, encounters, zones, zoneRates, bossScripts, shops };
