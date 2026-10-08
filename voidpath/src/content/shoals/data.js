// shoals: battle and economy data (PURE, TECH_PLAN 2.3, 7.1-7.3, 7.8, 7.9, 12.5).
//
// Regular enemies of chapter 1 (art by the bestiary task in enemyart.js, art key = kind):
//   ice_mite     packs of 4 with one-point shields              teaches Boost on many foes
//   void_eel     dives under the ice for a round, then lunges     teaches the Maw's Submerge
//   rime_golem   big shield, Frost Shell after every break        teaches Break timing
//   salvage_bot  repairs itself                                   teaches focus fire
// Boss THE MAW (7.9): two actions a round; Ice Breath (cryo, all), Tail Slam (one, DEF down); every
// third round it submerges (untargetable), circles under the ice behind the telegraph band and
// breaches at its next action (void, all), surfacing with the blow; at 50% it enrages and Nyx's
// ultimate awakens.
// M3: the Rime Colossus (optional elite of the Deep Ice, guards eq_x_ice_heart) and a rare Glimmer
// Mite (big drops).
//
// Zones: shoals_tunnels (Blue Tunnels), shoals_deep (The Deep Ice), meridian_spine (the wreck).
// Numbers come from statLine (balance.js); C10 tunes them through overrides.

import { statLine } from '../balance.js';

const act = (id, name, kind, desc, extra = {}) => ({
  id, name, kind, power: 0, type: null, target: 'one', anim: 'enemyMelee', weight: 0, desc, ...extra,
});
const hit = (id, name, type, power, weight, desc, extra = {}) => act(id, name, 'attack', desc, { type, power, weight, ...extra });

// A diver surfaces with its first blow: a dive lasts through the next round, so without this it would
// stay under after breaching. Shared by the eels and the Maw (any blow an enemy deals while under).
function surfaceOnBlow(api, h) {
  const e = api.enemy(h.attackerId);
  if (e && e.side === 'enemy' && e.untargetable > 0) api.setUntargetable(e.id, false);
}

const enemies = {
  ice_mite: {
    kind: 'ice_mite', name: 'Ice Mite', ...statLine(8, 'swarm'), shield: 1,
    weaknesses: ['rifle', 'thermal', 'gauntlet'],
    actions: [
      hit('mite_nip', 'Ice Nip', 'cryo', 0.85, 70, 'Mandibles rimed with frost.'),
      hit('mite_skitter', 'Skitter Swarm', 'blade', 0.42, 30, 'A frenzy of little legs. Two cuts.', { hits: 2 }),
    ],
    drops: [{ id: 'medigel', chance: 0.12, n: 1 }],
  },
  void_eel: {
    kind: 'void_eel', name: 'Void Eel', script: 'void_eel', ...statLine(9, 'caster'), shield: 3,
    weaknesses: ['thermal', 'rifle', 'volt'],
    actions: [
      hit('eel_spit', 'Void Spit', 'void', 1.0, 70, 'Spits a knot of folded dark.', { anim: 'enemyShot' }),
      act('eel_dive', 'Submerge', 'submerge', 'Slides under the ice. It cannot be struck.', {
        anim: 'enemyCharge', weight: 30, cooldown: 3, untargetable: 1, then: 'eel_lunge',
      }),
      hit('eel_lunge', 'Lunge', 'void', 1.35, 0, 'Bursts from below, jaws first.'),
    ],
    drops: [{ id: 'ether', chance: 0.12, n: 1 }],
  },
  rime_golem: {
    kind: 'rime_golem', name: 'Rime Golem', script: 'rime_golem', ...statLine(10, 'armored'), shield: 6,
    weaknesses: ['thermal', 'gauntlet', 'lance'],
    stage: { slot: [-5.4, -2.4] },   // the back slot: it is tall enough to hide anything behind it
    actions: [
      hit('golem_fist', 'Rime Fist', 'gauntlet', 1.35, 65, 'A fist of packed ice and old steel.'),
      hit('golem_stomp', 'Hoarfrost Stomp', 'cryo', 0.6, 35, 'Shakes rime from the ceiling onto everyone.', { target: 'all', cooldown: 1 }),
      act('golem_shell', 'Frost Shell', 'buff', 'Grows a shell of new ice. Raises DEF and RES.', {
        anim: 'enemyCharge', target: 'self', effect: { stats: ['def', 'res'], stage: 1, turns: 3 },
      }),
    ],
    drops: [{ id: 'medigel_plus', chance: 0.15, n: 1 }],
  },
  salvage_bot: {
    kind: 'salvage_bot', name: 'Salvage Bot', ...statLine(11, 'standard'), shield: 4,
    weaknesses: ['volt', 'lance', 'thermal'],
    actions: [
      hit('bot_saw', 'Rust Saw', 'blade', 1.15, 60, 'A cutting wheel eighty years overdue for a service.'),
      hit('bot_scrap', 'Scrap Cannon', 'rifle', 0.95, 25, 'Fires whatever it last swallowed.', { anim: 'enemyShot' }),
      act('bot_repair', 'Self-Repair', 'heal', 'Welds its own plates back on.', {
        anim: 'enemyCharge', target: 'self', heal: 0.22, weight: 40, cooldown: 2,
      }),
    ],
    drops: [{ id: 'ether', chance: 0.15, n: 1 }, { id: 'volt_charge', chance: 0.08, n: 1 }],
  },

  // ---- THE MAW (7.9)
  maw: {
    kind: 'maw', name: 'The Maw', art: 'maw', boss: true, ai: 'basic', script: 'maw', stage: { scale: 1.12 },
    ...statLine(12, 'boss'), shield: 8, maxShieldCap: 14, actionsPerRound: 2,
    weaknesses: ['thermal', 'lance', 'rifle'],
    actions: [
      hit('maw_ice_breath', 'Ice Breath', 'cryo', 0.82, 40, 'A freezing exhalation across the whole squad.', {
        target: 'all', anim: 'enemyBeam', fx: 'maw.ice_breath',
      }),
      act('maw_tail_slam', 'Tail Slam', 'debuff', 'A tail like a falling girder. Lowers DEF.', {
        type: 'gauntlet', power: 1.45, weight: 60, effect: { stats: ['def'], stage: -1, turns: 2 }, pose: 'slam', fx: 'maw.tail_slam',
      }),
      act('maw_submerge', 'Submerge', 'submerge', 'Sinks into the black ice. It cannot be struck.', {
        anim: 'enemyCharge', untargetable: 1, fx: 'maw.submerge',
      }),
      act('maw_circle', 'Circling Below', 'buff', 'Something vast turns under the ice.', {
        anim: 'enemyCharge', target: 'self', then: 'maw_breach', fx: 'maw.circle',
      }),
      hit('maw_breach', 'Breach', 'void', 1.2, 0, 'Erupts through the ice beneath the squad.', {
        target: 'all', anim: 'enemyBeam', fx: 'maw.breach',
      }),
    ],
    drops: [{ id: 'revive', chance: 1, n: 1 }, { id: 'medigel_plus', chance: 1, n: 2 }],
  },

  // ---- M3: the optional elite and the rare encounter
  rime_colossus: {
    kind: 'rime_colossus', name: 'Rime Colossus', art: 'rime_golem', tint: '#b8e4ff', boss: true, ai: 'basic',
    script: 'rime_golem', ...statLine(12, 'elite'), shield: 8, maxShieldCap: 12,
    weaknesses: ['thermal', 'gauntlet'],
    stage: { scale: 1.3 },
    actions: [
      hit('colossus_fist', 'Glacier Fist', 'gauntlet', 1.5, 60, 'Old steel inside a mountain of ice.'),
      hit('colossus_stomp', 'Hoarfrost Stomp', 'cryo', 0.75, 40, 'Shakes rime from the ceiling onto everyone.', { target: 'all', cooldown: 1 }),
      act('golem_shell', 'Frost Shell', 'buff', 'Grows a shell of new ice. Raises DEF and RES.', {
        anim: 'enemyCharge', target: 'self', effect: { stats: ['def', 'res'], stage: 1, turns: 3 },
      }),
    ],
    drops: [{ id: 'eq_x_ice_heart', chance: 1, n: 1 }, { id: 'medigel_max', chance: 1, n: 1 }],
  },
  glimmer_mite: {
    kind: 'glimmer_mite', name: 'Glimmer Mite', art: 'ice_mite', tint: '#ffe39a', ...statLine(10, 'swarm'), shield: 2,
    weaknesses: ['photon', 'volt'],
    xp: 220, credits: 640,
    actions: [hit('glimmer_nip', 'Gilded Nip', 'cryo', 0.7, 100, 'It tastes of old credits.')],
    drops: [{ id: 'medigel_max', chance: 0.6, n: 1 }, { id: 'ether_plus', chance: 0.6, n: 1 }],
  },
};

// ---------------------------------------------------------------- boss scripts (7.3)

const bossScripts = {
  // Every third round the Maw dives with its first action; with its second it circles under the ice
  // (the band warns the squad) and its next action breaches, surfacing with the blow. So everyone
  // gets a turn while it is under. Otherwise it mixes Ice Breath and Tail Slam, never two breaths in
  // one round. At 50% it enrages and Nyx's ultimate awakens.
  maw: {
    thresholds: [0.5],
    onBegin(api) {
      api.mem.nextDive = 3;
      api.mem.acted = {};
    },
    chooseAction(api, e) {
      const n = (api.mem.acted[api.round] = (api.mem.acted[api.round] || 0) + 1);
      if (api.mem.diving) {
        api.mem.diving = false;
        api.telegraph(e.id, null, 'The ice groans beneath the squad...');
        return { actionId: 'maw_circle', targetId: e.id };
      }
      if (api.round >= api.mem.nextDive && n === 1 && !e.broken) {
        api.mem.nextDive = api.round + 3;
        api.mem.diving = true;
        return { actionId: 'maw_submerge', targetId: e.id };
      }
      if (api.mem.breathRound === api.round) return { actionId: 'maw_tail_slam' };
      if (api.rng() < (api.mem.enraged ? 0.5 : 0.4)) {
        api.mem.breathRound = api.round;
        return { actionId: 'maw_ice_breath' };
      }
      return { actionId: 'maw_tail_slam' };
    },
    onHit: surfaceOnBlow,
    onThreshold(api, e) {
      api.mem.enraged = true;
      api.cue('maw_enrage', { targetId: e.id });
      api.say('NYX', 'Great-grandma fought worse than you. I read her log.', { expr: 'determined' });
      api.grantUltimate('nyx');
      api.status(e.id, { stats: ['atk'], stage: 1, turns: 3 });
    },
  },
  // Eels surface with their lunge (their dive lasts through the next round).
  void_eel: { onHit: surfaceOnBlow },
  // Frost Shell on round 2 and again after every recovery from a break: break it before it hardens.
  rime_golem: {
    onRecover(api, e) {
      (api.mem.shell ||= {})[e.id] = true;
    },
    chooseAction(api, e) {
      const due = api.mem.shell?.[e.id] || (api.round === 2 && !api.mem.opened?.[e.id]);
      if (!due || e.buffs.def?.stage > 0) return null;
      (api.mem.shell ||= {})[e.id] = false;
      (api.mem.opened ||= {})[e.id] = true;
      return { actionId: 'golem_shell', targetId: e.id };
    },
  },
};

// ---------------------------------------------------------------- encounters and zones

const enc = (id, list, backdrop, extra = {}) => ({ id, enemies: list, backdrop, boss: false, canFlee: true, music: 'battle', ...extra });

const encounters = {
  // Blue Tunnels
  shoals_mites: enc('shoals_mites', ['ice_mite', 'ice_mite', 'ice_mite', 'ice_mite'], 'shoals'),
  shoals_mites_eel: enc('shoals_mites_eel', ['ice_mite', 'void_eel', 'ice_mite'], 'shoals'),
  shoals_eels: enc('shoals_eels', ['void_eel', 'void_eel'], 'shoals'),
  shoals_eel_trio: enc('shoals_eel_trio', ['ice_mite', 'void_eel', 'ice_mite', 'ice_mite'], 'shoals'),
  // The Deep Ice
  shoals_golem: enc('shoals_golem', ['rime_golem', 'ice_mite', 'ice_mite'], 'shoals'),
  shoals_golem_eel: enc('shoals_golem_eel', ['rime_golem', 'void_eel'], 'shoals'),
  shoals_deep_eels: enc('shoals_deep_eels', ['void_eel', 'ice_mite', 'void_eel'], 'shoals'),
  shoals_deep_pack: enc('shoals_deep_pack', ['ice_mite', 'ice_mite', 'ice_mite', 'void_eel'], 'shoals'),
  shoals_glimmer: enc('shoals_glimmer', ['glimmer_mite', 'ice_mite', 'ice_mite'], 'shoals'),
  // The Broken Spine
  meridian_bots: enc('meridian_bots', ['salvage_bot', 'salvage_bot'], 'meridian'),
  meridian_bot_golem: enc('meridian_bot_golem', ['rime_golem', 'salvage_bot'], 'meridian'),
  meridian_bot_mites: enc('meridian_bot_mites', ['ice_mite', 'salvage_bot', 'ice_mite'], 'meridian'),
  meridian_scrap: enc('meridian_scrap', ['salvage_bot', 'void_eel', 'salvage_bot'], 'meridian'),

  // the boss
  shoals_boss_maw: {
    id: 'shoals_boss_maw', enemies: ['maw'], backdrop: 'maw_lair', boss: true, canFlee: false, music: 'boss',
    intro: { title: 'THE MAW', subtitle: 'Void Leviathan', lines: [{ speaker: 'NYX', text: 'That\'s the Maw. Ruse undersold it.', expr: 'surprised' }] },
    outro: { lines: [{ speaker: 'NYX', text: 'Go on. Sink. Tell the others we\'re coming through.', expr: 'determined' }] },
    tips: [{ on: 'untargetable', flag: 'tut:maw_dive', lines: [{ speaker: 'NYX', text: 'It\'s diving. When it comes up, it hits all of us. *Defend*.' }] }],
  },
  // M3: the optional elite of the Deep Ice
  shoals_elite_colossus: {
    id: 'shoals_elite_colossus', enemies: ['rime_colossus'], backdrop: 'shoals', boss: true, canFlee: false, music: 'boss',
    intro: { title: 'RIME COLOSSUS', subtitle: 'Heart of the Deep Ice', lines: [] },
  },
};

const zones = {
  shoals_tunnels: ['shoals_mites', 'shoals_mites_eel', 'shoals_eels', 'shoals_eel_trio', 'shoals_mites', 'shoals_mites_eel'],
  shoals_deep: [
    'shoals_golem', 'shoals_golem_eel', 'shoals_deep_eels', 'shoals_deep_pack',
    'shoals_golem', 'shoals_golem_eel', 'shoals_deep_eels', 'shoals_deep_pack', 'shoals_glimmer',
  ],
  meridian_spine: ['meridian_bots', 'meridian_bot_golem', 'meridian_bot_mites', 'meridian_scrap', 'meridian_bots', 'meridian_bot_mites'],
};

// The spine is short and dense: a little more often than the default (about one fight per 30 units).
const zoneRates = { meridian_spine: { grace: 8, sigma: 18 } };

export default { enemies, encounters, zones, zoneRates, bossScripts };
