// heart: battle and economy data (PURE, TECH_PLAN 2.3, 7.1-7.3, 7.8, 12.5).
//
// The Ascent: the strongest regular foes of the game (art by the bestiary task in enemyart.js, art
// key = kind). Each one rehearses a piece of WARDEN (7.8), and each lesson is scripted (G2 bar rule 6):
//   warden_seraph    Lullaby on everyone with its first action (low sleep chance, at most two
//                    sleepers), then wards an ally (DEF/RES up)                    Warden form 1
//   dream_eater      drains what it bites, and bites a sleeper twice                 cleanse first
//   choir_guardian   raises cradle rings at the start of the fight: every other foe is shielded
//                    (untargetable 'shield') until the guardian is Broken or falls; its shield
//                    grows after each Break                                          Warden's shield
// The elites (7.8): four foes from earlier chapters as WARDEN remembers them, gilded with Choir
// light: base art + gold tint, elite numbers and one extra move each, met in two visible fights on
// the critical path (the Second Tier's lift, the Third Tier's processional).
// M3: the Bellwarden (optional elite at the Third Tier's dead end, guards eq_x_choir_bell) and a rare
// Lost Hymn formation (big drops).
//
// Zones: heart_ascent (the Dock's ring, the Second Tier), heart_crown (the Third Tier). Numbers come
// from statLine (balance.js); C10 tunes them through overrides.

import { statLine } from '../balance.js';

const act = (id, name, kind, desc, extra = {}) => ({
  id, name, kind, power: 0, type: null, target: 'one', anim: 'enemyMelee', weight: 0, desc, ...extra,
});
const hit = (id, name, type, power, weight, desc, extra = {}) => act(id, name, 'attack', desc, { type, power, weight, ...extra });
const SLEEP = { stats: ['sleep'], stage: 1, turns: 2 };
const MARK = { stats: ['marked'], stage: 1, turns: 2 };
const GILT = '#ffe0a0';   // the Choir's gold over an old foe

// ---------------------------------------------------------------- the Ascent's own

const LULLABY = (extra = {}) => act('seraph_lullaby', 'Lullaby', 'debuff', 'A hymn of gold rings. Sleep may follow.', {
  type: 'photon', power: 0.32, target: 'all', anim: 'enemyBeam', weight: 25, cooldown: 2, effect: { ...SLEEP, chance: 0.3, limit: 2 },
  fx: 'heart.lullaby', ...extra,
});

const enemies = {
  warden_seraph: {
    kind: 'warden_seraph', name: 'Warden Seraph', script: 'warden_seraph', ...statLine(28, 'caster'), shield: 4,
    weaknesses: ['rifle', 'void', 'cryo'],
    stage: { hover: 0.1 },
    actions: [
      hit('seraph_feather', 'Gilt Feather', 'blade', 1.0, 55, 'A porcelain blade-feather, thrown true.', { anim: 'enemyShot' }),
      LULLABY(),
      // the lesson: the first seraph of a fight sings with its first action (Warden's Lullaby)
      LULLABY({ id: 'seraph_lullaby_first', weight: 0, cooldown: 0, effect: { ...SLEEP, chance: 0.4, limit: 2 } }),
      act('seraph_ward', 'Cradle Ward', 'buff', 'Folds its wings round an ally. Raises DEF and RES.', {
        anim: 'enemyCharge', pose: 'special', target: 'ally', weight: 20, cooldown: 3, effect: { stats: ['def', 'res'], stage: 2, turns: 2 },
      }),
    ],
    drops: [{ id: 'stim', chance: 0.15, n: 1 }],
  },
  dream_eater: {
    kind: 'dream_eater', name: 'Dream Eater', script: 'dream_eater', ...statLine(29, 'standard'), shield: 4,
    weaknesses: ['thermal', 'blade', 'photon'],
    stage: { hover: 0.08 },
    actions: [
      hit('eater_siphon', 'Dream Siphon', 'void', 1.05, 60, 'Drinks a little of someone. It heals by what it takes.'),
      hit('eater_dust', 'Moth Dust', 'photon', 0.42, 25, 'Glittering dust over everyone. Lowers SPD.', {
        target: 'all', anim: 'enemyBeam', cooldown: 2, effect: { stats: ['spd'], stage: -1, turns: 2 },
      }),
      // a sleeper is a feast: it bites them twice (the script picks this whenever someone sleeps)
      hit('eater_gorge', 'Gorge', 'void', 0.8, 0, 'It feeds on a sleeper. Twice.', { hits: 2, pose: 'special' }),
    ],
    drops: [{ id: 'ether_plus', chance: 0.12, n: 1 }],
  },
  choir_guardian: {
    kind: 'choir_guardian', name: 'Choir Guardian', script: 'choir_guardian', ...statLine(30, 'armored'), shield: 6,
    shieldGain: 2, maxShieldCap: 10,
    weaknesses: ['gauntlet', 'volt', 'lance'],
    stage: { slot: [-5.4, -2.4] },   // the back slot: the cradle shield is tall
    actions: [
      hit('guard_bash', 'Cradle Bash', 'gauntlet', 1.25, 60, 'The round shield, brought down hard.'),
      hit('guard_censer', 'Censer Swing', 'thermal', 0.5, 30, 'Embers of incense over everyone.', { target: 'all', anim: 'enemyBeam', cooldown: 1 }),
      act('guard_rings', 'Cradle Rings', 'buff', 'Throws rings of light over its allies. They cannot be struck.', {
        anim: 'enemyCharge', pose: 'special', target: 'self', weight: 0,
      }),
    ],
    drops: [{ id: 'medigel_max', chance: 0.1, n: 1 }],
  },

  // ---------------------------------------------------------------- the elites: what WARDEN remembers
  elite_rime_golem: {
    kind: 'elite_rime_golem', name: 'Choirlit Rime Golem', art: 'rime_golem', tint: GILT, ...statLine(31, 'elite'), shield: 7,
    weaknesses: ['thermal', 'gauntlet', 'lance'],
    stage: { slot: [-5.4, -2.4], scale: 1.12 },
    actions: [
      hit('egolem_fist', 'Rime Fist', 'gauntlet', 1.35, 50, 'A fist of packed ice and gilded steel.'),
      hit('egolem_stomp', 'Hoarfrost Stomp', 'cryo', 0.6, 25, 'Shakes gold rime over everyone.', { target: 'all', cooldown: 1 }),
      act('egolem_shell', 'Frost Shell', 'buff', 'Grows a shell of gold ice. Raises DEF and RES.', {
        anim: 'enemyCharge', pose: 'special', target: 'self', weight: 15, cooldown: 3, effect: { stats: ['def', 'res'], stage: 1, turns: 3 },
      }),
      // the extra move: the Choir's cold hymn
      act('egolem_hymn', 'Glacial Hymn', 'debuff', 'The ice sings. Cryo on everyone, and sleep may follow.', {
        type: 'cryo', power: 0.45, target: 'all', anim: 'enemyBeam', pose: 'special', weight: 20, cooldown: 3, effect: { ...SLEEP, chance: 0.3, limit: 1 }, fx: 'heart.lullaby',
      }),
    ],
    drops: [{ id: 'medigel_max', chance: 0.5, n: 1 }],
  },
  elite_bloom_mantis: {
    kind: 'elite_bloom_mantis', name: 'Choirlit Bloom Mantis', art: 'bloom_mantis', tint: GILT, ...statLine(31, 'elite'), shield: 5,
    actionsPerRound: 2,
    weaknesses: ['cryo', 'rifle', 'gauntlet'],
    actions: [
      hit('emantis_scythe', 'Leaf Scythe', 'blade', 0.72, 50, 'A sweep of gilded leaf-blades.'),
      hit('emantis_flurry', 'Petal Flurry', 'blade', 0.38, 25, 'Cuts too fast to count. Two of them.', { hits: 2 }),
      act('emantis_thorns', 'Thorn Crown', 'debuff', 'A spray of golden thorns. Lowers DEF.', {
        type: 'lance', power: 0.4, weight: 15, cooldown: 2, effect: { stats: ['def'], stage: -1, turns: 2 },
      }),
      // the extra move: pollen that sings
      act('emantis_pollen', 'Hymn Pollen', 'debuff', 'A golden cloud over the squad. Sleep may follow.', {
        type: 'photon', power: 0.3, target: 'all', anim: 'enemyBeam', weight: 15, cooldown: 3, effect: { ...SLEEP, chance: 0.3, limit: 1 },
        fx: 'heart.lullaby',
      }),
    ],
    drops: [{ id: 'ether_plus', chance: 0.5, n: 1 }],
  },
  elite_sec_trooper: {
    kind: 'elite_sec_trooper', name: 'Choirlit Trooper', art: 'sec_trooper', tint: GILT, script: 'elite_trooper', ...statLine(31, 'elite'), shield: 5,
    weaknesses: ['lance', 'thermal', 'volt'],
    actions: [
      hit('etrooper_burst', 'Carbine Burst', 'rifle', 0.95, 50, 'Three rounds, gold-tipped, tightly grouped.', { anim: 'enemyShot' }),
      act('etrooper_mark', 'Target Lock', 'debuff', 'Paints one traveler with a gold sight. Every blow follows the mark.', {
        anim: 'enemyCharge', pose: 'special', effect: MARK, weight: 0,
      }),
      hit('etrooper_focus', 'Focus Shot', 'rifle', 1.35, 0, 'An aimed shot at the marked target.', { anim: 'enemyShot' }),
      // the extra move: a volley sung across the squad
      hit('etrooper_volley', 'Choir Volley', 'rifle', 0.55, 20, 'Sweeps the whole squad, in time with the hymn.', { target: 'all', anim: 'enemyShot', cooldown: 2 }),
    ],
    drops: [{ id: 'revive_plus', chance: 0.4, n: 1 }],
  },
  elite_firewall_golem: {
    kind: 'elite_firewall_golem', name: 'Choirlit Firewall', art: 'firewall_golem', tint: GILT, script: 'firewall_golem', ...statLine(31, 'elite'),
    shield: 7,
    weaknesses: ['cryo', 'void', 'lance'],
    stage: { slot: [-5.4, -2.4] },
    actions: [
      hit('efw_slam', 'Firewall Slam', 'gauntlet', 1.3, 50, 'A fist of mortar and burning gold.'),
      hit('efw_burn', 'Hymn Fire', 'thermal', 0.55, 25, 'Its crenels pour gold fire over everyone.', { target: 'all', anim: 'enemyBeam', cooldown: 1 }),
      act('efw_wall', 'Raise the Wall', 'buff', 'Stacks new bricks of light. Raises DEF and RES.', {
        anim: 'enemyCharge', target: 'self', weight: 10, cooldown: 3, effect: { stats: ['def', 'res'], stage: 1, turns: 3 },
      }),
      // the extra move: a wall for everyone it stands with
      act('efw_choir', 'Choir Wall', 'buff', 'Raises the wall round every ally. Raises DEF.', {
        anim: 'enemyCharge', pose: 'special', target: 'allies', weight: 15, cooldown: 3, effect: { stats: ['def'], stage: 1, turns: 2 },
      }),
    ],
    drops: [{ id: 'medigel_max', chance: 0.5, n: 1 }],
  },

  // ---------------------------------------------------------------- M3: the optional elite, the rare formation
  choir_bellwarden: {
    kind: 'choir_bellwarden', name: 'Bellwarden', art: 'choir_guardian', tint: '#fff2c8', boss: true, ai: 'basic', script: 'choir_guardian',
    ...statLine(33, 'elite'), shield: 8, shieldGain: 2, maxShieldCap: 14,
    weaknesses: ['volt', 'lance'],
    stage: { slot: [-5.4, -2.4], scale: 1.3 },
    actions: [
      hit('bell_bash', 'Bell Strike', 'gauntlet', 1.35, 45, 'It rings the great bell on someone.'),
      hit('bell_toll', 'The Toll', 'photon', 0.6, 35, 'A note so low the floor hums. Hits everyone.', { target: 'all', anim: 'enemyBeam', cooldown: 1 }),
      act('bell_hush', 'Hush', 'debuff', 'The bell goes quiet, and so do you. Sleep may follow.', {
        type: 'photon', power: 0.3, target: 'all', anim: 'enemyBeam', pose: 'special', weight: 20, cooldown: 3, effect: { ...SLEEP, chance: 0.35, limit: 2 },
        fx: 'heart.lullaby',
      }),
      act('guard_rings', 'Cradle Rings', 'buff', 'Throws rings of light over its allies. They cannot be struck.', {
        anim: 'enemyCharge', pose: 'special', target: 'self', weight: 0,
      }),
    ],
    drops: [{ id: 'eq_x_choir_bell', chance: 1, n: 1 }, { id: 'medigel_max', chance: 1, n: 2 }],
  },
  lost_hymn: {
    kind: 'lost_hymn', name: 'Lost Hymn', art: 'warden_seraph', tint: '#e8f4ff', ...statLine(29, 'swarm'), shield: 2,
    weaknesses: ['void', 'rifle'],
    stage: { hover: 0.1, scale: 0.85 },
    xp: 1400, credits: 2400,
    actions: [hit('hymn_note', 'Stray Note', 'photon', 0.6, 100, 'A bar of a song nobody finished.', { anim: 'enemyShot' })],
    drops: [{ id: 'medigel_max', chance: 0.6, n: 1 }, { id: 'revive_plus', chance: 0.5, n: 1 }],
  },
};

// ---------------------------------------------------------------- scripts (7.3)

const alive = (api, kinds) => api.enemies().filter((e) => e.alive && kinds.includes(e.key));
const GUARDS = ['choir_guardian', 'choir_bellwarden'];

/** Throw (or drop) the cradle rings of guardian `g` over every other foe. */
function rings(api, g, on) {
  const held = (api.mem.rings ||= {});
  if (!!held[g.id] === on) return;
  held[g.id] = on;
  const others = api.enemies().filter((e) => e.alive && e.id !== g.id && !GUARDS.includes(e.key));
  if (on && !others.length) {
    held[g.id] = false;
    return;
  }
  // a ring stays up while any guardian still holds one
  const holders = alive(api, GUARDS).filter((x) => held[x.id]);
  for (const e of others) {
    if (on) api.setUntargetable(e.id, true, { rounds: 99, style: 'shield' });
    else if (!holders.length) api.setUntargetable(e.id, false, { style: 'shield' });
  }
  api.cue(on ? 'cradle_up' : 'cradle_down', { targetId: g.id });
}

const bossScripts = {
  // The first seraph of a fight sings its Lullaby with its first action (the lesson), then by weight.
  warden_seraph: {
    chooseAction(api, e) {
      if (api.mem.sang) return null;
      const first = alive(api, ['warden_seraph'])[0];
      if (!first || first.id !== e.id) return null;
      api.mem.sang = true;
      return { actionId: 'seraph_lullaby_first' };
    },
  },

  // It feeds on sleepers (two bites; the first feast cues the lesson), and every bite heals it by half
  // of what it took.
  dream_eater: {
    chooseAction(api, e) {
      const sleeper = api.party().find((m) => m.alive && m.buffs.sleep);
      if (!sleeper) return null;
      if (!api.mem.fed) {
        api.mem.fed = true;
        api.cue('gorge', { targetId: e.id });
      }
      return { actionId: 'eater_gorge', targetId: sleeper.id };
    },
    onHit(api, h) {
      const e = api.enemy(h.attackerId);
      if (!e || e.key !== 'dream_eater' || !e.alive || !(h.amount > 0)) return;
      const t = api.member(h.targetId);
      if (!t) return;
      api.heal(e.id, Math.round(h.amount * 0.5));
    },
  },

  // The guardian throws its rings over the others as the fight opens and again after each recovery;
  // a Break or its fall drops them. It never casts Cradle Rings by weight.
  choir_guardian: {
    onRoundStart(api, round) {
      for (const g of alive(api, GUARDS)) {
        if (round === 1 && !g.broken) rings(api, g, true);
      }
    },
    onBreak(api, e) {
      if (GUARDS.includes(e.key)) rings(api, e, false);
    },
    onRecover(api, e) {
      if (GUARDS.includes(e.key)) rings(api, e, true);
    },
    onDefeat(api, e) {
      if (GUARDS.includes(e.key)) rings(api, e, false);
      return false;
    },
  },

  // The gilded trooper paints a target in round 1 and every three rounds, and fires at the mark while
  // it lasts (Voss's drill, remembered).
  elite_trooper: {
    chooseAction(api, e) {
      const marked = api.party().some((m) => m.alive && m.buffs.marked);
      if (marked) return { actionId: 'etrooper_focus' };
      if (api.round === 1 || api.round >= (api.mem.nextMark ?? 99)) {
        api.mem.nextMark = api.round + 3;
        return { actionId: 'etrooper_mark' };
      }
      return null;
    },
  },
};

// ---------------------------------------------------------------- encounters and zones

const enc = (id, list, extra = {}) => ({ id, enemies: list, backdrop: 'heart', boss: false, canFlee: true, music: 'battle_2', ...extra });
const line = (speaker, text) => ({ speaker, text });
const ELITE = { boss: true, canFlee: false, music: 'boss' };

const encounters = {
  // the first fight of the Ascent: a visible pair at the first lift (the cradle rings lesson)
  heart_wardens: enc('heart_wardens', ['choir_guardian', 'warden_seraph'], {
    canFlee: false,
    tips: [{ on: 'untargetable', flag: 'tut:cradle', lines: [line('ORION', 'It\'s holding a *ward* over the other one. *Break* the guardian and the ward falls.')] }],
  }),
  // the Second Tier's north chord: a seraph sings them under, a Dream Eater feeds (cleanse first)
  heart_choir: enc('heart_choir', ['warden_seraph', 'dream_eater', 'warden_seraph'], {
    canFlee: false,
    tips: [{ on: 'cue:gorge', flag: 'tut:gorge', lines: [line('SERA', 'It feeds on whoever sleeps. Wake them first: a *Stim*, or any hit.')] }],
  }),
  // the two elite fights (visible, on the critical path)
  heart_elite_rings: enc('heart_elite_rings', ['elite_rime_golem', 'elite_bloom_mantis'], {
    ...ELITE, intro: { title: 'CHOIRLIT ECHOES', subtitle: 'The Rings and the Garden', lines: [] },
  }),
  heart_elite_spire: enc('heart_elite_spire', ['elite_sec_trooper', 'elite_firewall_golem'], {
    ...ELITE, intro: { title: 'CHOIRLIT ECHOES', subtitle: 'The Spire and the Vault', lines: [] },
  }),
  // M3: the optional elite at the Third Tier's dead end
  heart_elite_bell: enc('heart_elite_bell', ['choir_bellwarden', 'warden_seraph'], {
    ...ELITE, intro: { title: 'BELLWARDEN', subtitle: 'Keeper of the Choir Bell', lines: [] },
  }),

  // heart_ascent: the Dock's ring and the Second Tier
  heart_a_seraphs: enc('heart_a_seraphs', ['warden_seraph', 'warden_seraph']),
  heart_a_eater: enc('heart_a_eater', ['dream_eater', 'warden_seraph']),     // she sings them under, it feeds
  heart_a_guardian: enc('heart_a_guardian', ['choir_guardian', 'dream_eater']),
  heart_a_eaters: enc('heart_a_eaters', ['dream_eater', 'dream_eater']),
  heart_a_rare: enc('heart_a_rare', ['lost_hymn', 'warden_seraph']),
  // heart_crown: the Third Tier
  heart_c_trio: enc('heart_c_trio', ['warden_seraph', 'choir_guardian', 'dream_eater']),
  heart_c_eaters: enc('heart_c_eaters', ['dream_eater', 'choir_guardian', 'dream_eater']),
  heart_c_choir: enc('heart_c_choir', ['warden_seraph', 'dream_eater', 'warden_seraph']),
  heart_c_guards: enc('heart_c_guards', ['choir_guardian', 'warden_seraph', 'warden_seraph']),
};

const zones = {
  heart_ascent: [
    'heart_a_seraphs', 'heart_a_eater', 'heart_a_guardian', 'heart_a_eaters',
    'heart_a_seraphs', 'heart_a_eater', 'heart_a_guardian', 'heart_a_eaters', 'heart_a_rare',
  ],
  heart_crown: ['heart_c_trio', 'heart_c_eaters', 'heart_c_choir', 'heart_c_guards'],
};

// Measured with tools/expected-fights.mjs on tests/routes/heart.mjs: the critical path walks 100 units
// in heart_ascent and 35 in heart_crown (the rings fill their quadrants, so the ascent is short and
// dense): 2.48 + 1.30 random fights expected, with the Wardens, the Choir, two Echoes and WARDEN on the
// way, 8.8 in all (target 8-10, 2 elites included)
const zoneRates = { heart_ascent: { grace: 6, sigma: 12 }, heart_crown: { grace: 5, sigma: 10 } };

export default { enemies, encounters, zones, zoneRates, bossScripts };
