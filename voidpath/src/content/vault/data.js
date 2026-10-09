// vault: battle and economy data (PURE, TECH_PLAN 2.3, 7.1-7.3, 7.8, 7.9, 12.5).
//
// Regular enemies of chapter 4 (art by the bestiary task in enemyart.js, art key = kind). Each one
// teaches one of ECHO's mechanics, by script in round 1 or 2 (G2 bar rule 6):
//   data_wraith       phases out of step (untargetable 'phase'), then strikes      Echo's Glitch Phase
//   firewall_golem    hardens against the last element that hit it (setResist)     Echo's Mirror
//   glitch_swarm      new weak points after each recovery (weaknessPool)            Warden form 2
//   corrupted_memory  charges Overwrite (all), cancelled by a break                 Echo's Severance
// Boss ECHO (7.9): two actions a round. Mirror: after each party action it resists that element for
// the rest of the round and the next (the old one lapses) and answers with it (override.type).
// Every 4th round it phases out of step with its first action and starts charging Severance with its
// second; Severance (heavy, all) lands with its last action of the next round unless a Break cancels
// it. At 50% Orion's ultimate awakens ("Grief isn't an error.").
// M3: the Overwrite Archon (optional elite of the Archive, guards eq_x_glitch_lens) and a rare
// Lost Packet (big drops).
//
// Zones: vault_grid (the Grid, the Stacks, the west fields and the Index), vault_core (the east
// fields, where the corruption seeps out of the core). Numbers come from statLine (balance.js).

import { statLine } from '../balance.js';

const act = (id, name, kind, desc, extra = {}) => ({
  id, name, kind, power: 0, type: null, target: 'one', anim: 'enemyMelee', weight: 0, desc, ...extra,
});
const hit = (id, name, type, power, weight, desc, extra = {}) => act(id, name, 'attack', desc, { type, power, weight, ...extra });

const TYPE_NAME = {
  blade: 'Blade', rifle: 'Rifle', gauntlet: 'Gauntlet', lance: 'Lance',
  thermal: 'Thermal', cryo: 'Cryo', volt: 'Volt', photon: 'Photon', void: 'Void',
};

// A phased foe comes back into step with its first blow (its phase may outlast the round).
function surfaceOnBlow(api, h) {
  const e = api.enemy(h.attackerId);
  if (e && e.side === 'enemy' && e.untargetable > 0) api.setUntargetable(e.id, false, { style: 'phase' });
}

// The nth action this enemy takes in the current round (1-based).
function nthAction(api, e) {
  const seen = (api.mem.acted ||= {});
  const key = `${api.round}:${e.id}`;
  seen[key] = (seen[key] || 0) + 1;
  return seen[key];
}

const enemies = {
  data_wraith: {
    kind: 'data_wraith', name: 'Data Wraith', script: 'data_wraith', ...statLine(23, 'caster'), shield: 4,
    weaknesses: ['photon', 'volt', 'thermal'],
    untargetableStyle: 'phase',
    actions: [
      hit('wraith_claw', 'Null Claw', 'blade', 1.05, 60, 'Talons of hard light rake one target.'),
      hit('wraith_wail', 'Static Wail', 'void', 0.5, 25, 'A scream of white noise through everyone.', { target: 'all', anim: 'enemyBeam', cooldown: 2 }),
      act('wraith_phase', 'Phase Out', 'submerge', 'Slips out of step with the world. It cannot be struck.', {
        anim: 'enemyCharge', weight: 15, cooldown: 3, untargetable: 1, style: 'phase', then: 'wraith_strike',
      }),
      hit('wraith_strike', 'Phase Strike', 'void', 1.35, 0, 'Steps back into the world through someone.'),
    ],
    drops: [{ id: 'ether_plus', chance: 0.12, n: 1 }],
  },
  firewall_golem: {
    kind: 'firewall_golem', name: 'Firewall Golem', script: 'firewall_golem', ...statLine(24, 'armored'), shield: 6,
    weaknesses: ['cryo', 'void', 'lance'],
    stage: { slot: [-5.4, -2.4] },   // the back slot: tall enough to hide anything behind it
    actions: [
      hit('fw_slam', 'Firewall Slam', 'gauntlet', 1.3, 60, 'A fist of mortar and burning data.'),
      hit('fw_burn', 'Data Fire', 'thermal', 0.55, 30, 'Its crenels pour fire over everyone.', { target: 'all', anim: 'enemyBeam', cooldown: 1 }),
      act('fw_wall', 'Raise the Wall', 'buff', 'Stacks new bricks of light. Raises DEF and RES.', {
        anim: 'enemyCharge', target: 'self', weight: 15, cooldown: 3, effect: { stats: ['def', 'res'], stage: 1, turns: 3 },
      }),
    ],
    drops: [{ id: 'medigel_plus', chance: 0.15, n: 1 }, { id: 'void_charge', chance: 0.06, n: 1 }],
  },
  glitch_swarm: {
    kind: 'glitch_swarm', name: 'Glitch Swarm', ...statLine(23, 'standard'), shield: 2,
    weaknesses: ['rifle', 'thermal'],
    weaknessPool: [['rifle', 'thermal'], ['volt', 'cryo'], ['photon', 'blade'], ['gauntlet', 'void']],
    shiftOnRecover: true,
    actions: [
      hit('swarm_bite', 'Bit Rot', 'blade', 0.55, 65, 'A cloud of little teeth. Two bites.', { hits: 2 }),
      hit('swarm_static', 'Static Bloom', 'volt', 0.45, 35, 'The swarm shorts out over everyone.', { target: 'all', anim: 'enemyBeam', cooldown: 2 }),
    ],
    drops: [{ id: 'stim', chance: 0.15, n: 1 }],
  },
  corrupted_memory: {
    kind: 'corrupted_memory', name: 'Corrupted Memory', script: 'corrupted_memory', ...statLine(25, 'caster'), shield: 5,
    weaknesses: ['photon', 'blade', 'lance'],
    actions: [
      hit('mem_shard', 'Splinter', 'cryo', 1.05, 60, 'A shard of somebody\'s birthday, very sharp.', { anim: 'enemyShot' }),
      hit('mem_static', 'Bad Sector', 'void', 0.5, 25, 'Static eats a little of everyone.', { target: 'all', anim: 'enemyBeam', cooldown: 2 }),
      act('mem_charge', 'Overwrite', 'charge', 'Fills its loading ring. When it completes, everything is rewritten.', {
        anim: 'enemyCharge', weight: 15, cooldown: 4, fires: 'mem_overwrite', chargeRounds: 1,
        telegraph: 'Corrupted Memory begins to Overwrite...',
      }),
      hit('mem_overwrite', 'Overwrite', 'void', 1.5, 0, 'Writes over everyone at once.', { target: 'all', anim: 'enemyBeam' }),
    ],
    drops: [{ id: 'revive', chance: 0.1, n: 1 }, { id: 'photon_charge', chance: 0.08, n: 1 }],
  },

  // ---- ECHO (7.9)
  echo: {
    kind: 'echo', name: 'Echo', art: 'echo', boss: true, ai: 'basic', script: 'echo',
    ...statLine(27, 'boss'), shield: 7, maxShieldCap: 11, actionsPerRound: 2,
    weaknesses: ['blade', 'gauntlet', 'photon', 'volt'],
    untargetableStyle: 'phase',
    actions: [
      hit('echo_mirror', 'Mirror', 'void', 1.3, 55, 'Your own strike, turned around and sent back.', { anim: 'enemyShot', fx: 'echo.mirror' }),
      hit('echo_twelve', 'Twelve Thousand', 'void', 0.62, 45, 'Every name she counted, at once.', { target: 'all', anim: 'enemyBeam', cooldown: 1, fx: 'echo.twelve' }),
      act('echo_phase', 'Glitch Phase', 'submerge', 'Slips out of step with everything. It cannot be struck.', {
        anim: 'enemyCharge', untargetable: 0, style: 'phase', fx: 'echo.phase',
      }),
      act('echo_charge', 'The Severance', 'charge', 'Relives the night the packet came.', {
        anim: 'enemyCharge', fires: 'echo_severance', chargeRounds: 1, telegraph: 'ECHO relives the Severance...', fx: 'echo.charge',
      }),
      hit('echo_severance', 'Severance', 'void', 1.8, 0, 'The night she split in two, all at once.', {
        target: 'all', anim: 'enemyBeam', fx: 'echo.severance',
      }),
    ],
    drops: [{ id: 'revive_plus', chance: 1, n: 1 }, { id: 'medigel_max', chance: 1, n: 1 }],
  },

  // ---- M3: the optional elite and the rare encounter
  memory_archon: {
    kind: 'memory_archon', name: 'Overwrite Archon', art: 'corrupted_memory', tint: '#ffb0f0', boss: true, ai: 'basic',
    script: 'corrupted_memory', ...statLine(28, 'elite'), shield: 8, maxShieldCap: 12,
    weaknesses: ['photon', 'lance'],
    stage: { scale: 1.3 },
    actions: [
      hit('archon_shard', 'Splinter Storm', 'cryo', 0.8, 50, 'Shards of a hundred lost moments.', { target: 'all', anim: 'enemyBeam', cooldown: 1 }),
      hit('archon_lance', 'Sealed Record', 'void', 1.4, 50, 'A memory nobody was meant to open.', { anim: 'enemyShot' }),
      act('mem_charge', 'Overwrite', 'charge', 'Fills its loading ring. When it completes, everything is rewritten.', {
        anim: 'enemyCharge', weight: 20, cooldown: 3, fires: 'mem_overwrite', chargeRounds: 1,
        telegraph: 'The Archon begins to Overwrite...',
      }),
      hit('mem_overwrite', 'Overwrite', 'void', 1.6, 0, 'Writes over everyone at once.', { target: 'all', anim: 'enemyBeam' }),
    ],
    drops: [{ id: 'eq_x_glitch_lens', chance: 1, n: 1 }, { id: 'ether_plus', chance: 1, n: 2 }],
  },
  lost_packet: {
    kind: 'lost_packet', name: 'Lost Packet', art: 'glitch_swarm', tint: '#ffe39a', ...statLine(24, 'swarm'), shield: 2,
    weaknesses: ['photon', 'volt'],
    xp: 900, credits: 1600,
    actions: [hit('packet_nip', 'Checksum', 'volt', 0.6, 100, 'It tastes of something that was never delivered.')],
    drops: [{ id: 'medigel_max', chance: 0.6, n: 1 }, { id: 'ether_plus', chance: 0.6, n: 1 }],
  },
};

// ---------------------------------------------------------------- boss scripts (7.3)

const bossScripts = {
  // The first wraith of a fight phases out with its first action of round 1 (the lesson, by script);
  // afterwards wraiths phase by weight. A phased wraith surfaces with its Phase Strike.
  data_wraith: {
    chooseAction(api, e) {
      if (api.round === 1 && !api.mem.taught) {
        api.mem.taught = true;
        return { actionId: 'wraith_phase', targetId: e.id };
      }
      return null;
    },
    onHit: surfaceOnBlow,
  },

  // Each hit hardens the golem against that element for the rest of the round and the next; a new
  // element replaces the old one (one cue per change, so the arena and the tip follow it).
  firewall_golem: {
    onHit(api, h) {
      const e = api.enemy(h.targetId);
      if (!e || e.side !== 'enemy' || e.script !== 'firewall_golem' || !h.type || !e.alive) return;
      const held = (api.mem.held ||= {});
      if (held[e.id] === h.type) return;
      const map = { [h.type]: 0.3 };
      if (held[e.id]) map[held[e.id]] = 1;
      held[e.id] = h.type;
      api.setResist(e.id, map, { rounds: 1 });
    },
  },

  // Overwrite on its first action of round 1 (the lesson: break it before it lands), then by weight.
  corrupted_memory: {
    chooseAction(api, e) {
      if (api.round === 1 && !(api.mem.opened ||= {})[e.id]) {
        api.mem.opened[e.id] = true;
        return { actionId: 'mem_charge', targetId: e.id };
      }
      return null;
    },
  },

  echo: {
    thresholds: [0.5],
    onBegin(api) {
      api.mem.nextPhase = 4;
      api.mem.mirror = null;
    },
    // Mirror: hold the element of the last party action; answer with it
    onPartyAction(api, actor, action) {
      const type = action && action.damageType;
      const e = api.enemies().find((x) => x.key === 'echo');
      if (!type || !e) return;
      const was = api.mem.mirror;
      if (was === type) return;
      api.mem.mirror = type;
      const map = { [type]: 0.5 };
      if (was) map[was] = 1;
      api.setResist(e.id, map, { rounds: 1 });
      if (!api.mem.saidMirror) {
        api.mem.saidMirror = true;
        api.say('ECHO', `${TYPE_NAME[type] || 'That'}. I learn it. I learn everything. It does not help.`);
      }
    },
    chooseAction(api, e) {
      const n = nthAction(api, e);
      if (api.mem.chargeNext) {
        api.mem.chargeNext = false;
        return { actionId: 'echo_charge', targetId: e.id };
      }
      if (n === 1 && api.round >= api.mem.nextPhase && !e.broken) {
        api.mem.nextPhase = api.round + 4;
        api.mem.chargeNext = true;
        if (!api.mem.saidPhase) {
          api.mem.saidPhase = true;
          api.say('ECHO', 'Not here. Not here. Not anywhere.');
        }
        return { actionId: 'echo_phase', targetId: e.id };
      }
      const type = api.mem.mirror;
      if (type && api.rng() < 0.6) {
        return { actionId: 'echo_mirror', override: { type, name: `Mirror: ${TYPE_NAME[type] || type}` } };
      }
      return null;
    },
    onThreshold(api, e) {
      api.cue('echo_falter', { targetId: e.id });
      api.say('ORION', 'You\'re not broken. You\'re grieving.', { expr: 'determined' });
      api.say('ORION', 'Grief isn\'t an error.', { expr: 'determined' });
      api.grantUltimate('orion');
    },
  },
};

// ---------------------------------------------------------------- encounters and zones

const enc = (id, list, extra = {}) => ({ id, enemies: list, backdrop: 'vault', boss: false, canFlee: true, music: 'battle_2', ...extra });
const line = (speaker, text) => ({ speaker, text });

const encounters = {
  // the four lessons: visible encounters on the critical path (field bosses with scripts)
  vault_wraiths: enc('vault_wraiths', ['data_wraith', 'data_wraith'], {
    tips: [{ on: 'untargetable', flag: 'tut:phase', lines: [line('ORION', 'It\'s *phasing*. Out of step with us. It can\'t hold that for long.')] }],
  }),
  vault_firewall: enc('vault_firewall', ['firewall_golem', 'data_wraith'], {
    tips: [{ on: 'cue:resist', flag: 'tut:adapt', lines: [line('ORION', 'It hardens against whatever hit it last. *Change elements*, and it can\'t keep up.')] }],
  }),
  vault_swarm: enc('vault_swarm', ['glitch_swarm', 'firewall_golem', 'glitch_swarm']),
  vault_overwrite: enc('vault_overwrite', ['corrupted_memory', 'data_wraith', 'glitch_swarm'], {
    tips: [{ on: 'telegraph', flag: 'tut:overwrite', lines: [line('SERA', 'It\'s rewriting itself. *Break* it before it finishes, or we all *Defend*.')] }],
  }),

  // The Grid, the Stacks, the west fields and the Index
  vault_g_wraiths: enc('vault_g_wraiths', ['data_wraith', 'glitch_swarm', 'data_wraith']),
  vault_g_golem: enc('vault_g_golem', ['firewall_golem', 'data_wraith']),
  vault_g_swarms: enc('vault_g_swarms', ['glitch_swarm', 'glitch_swarm', 'glitch_swarm']),
  vault_g_golem_swarm: enc('vault_g_golem_swarm', ['firewall_golem', 'glitch_swarm']),
  vault_g_packet: enc('vault_g_packet', ['lost_packet', 'glitch_swarm', 'glitch_swarm']),
  // the east fields: the corruption seeps out of the core
  vault_c_memory: enc('vault_c_memory', ['glitch_swarm', 'corrupted_memory', 'glitch_swarm']),
  vault_c_memory_wraith: enc('vault_c_memory_wraith', ['corrupted_memory', 'data_wraith']),
  vault_c_memories: enc('vault_c_memories', ['corrupted_memory', 'glitch_swarm']),
  vault_c_golem_memory: enc('vault_c_golem_memory', ['firewall_golem', 'corrupted_memory']),

  // the boss
  vault_boss_echo: {
    id: 'vault_boss_echo', enemies: ['echo'], backdrop: 'vault_core', boss: true, canFlee: false, music: 'boss',
    intro: { title: 'ECHO', subtitle: 'The Severance', lines: [line('ECHO', 'Twelve thousand. Twelve thousand. None.')] },
    outro: { lines: [line('ECHO', '...Grieving. Not broken. ...Oh.')] },
    tips: [
      { on: 'untargetable', flag: 'tut:echo_phase', lines: [line('ORION', 'She\'s out of step. Build your *Boost* while she\'s gone.')] },
      { on: 'telegraph', flag: 'tut:severance', lines: [line('KADE', 'That\'s the Severance. *Break* her before it lands, or everyone *Defends*.')] },
    ],
  },
  // M3: the optional elite of the Archive
  vault_elite_archon: {
    id: 'vault_elite_archon', enemies: ['memory_archon'], backdrop: 'vault', boss: true, canFlee: false, music: 'boss',
    intro: { title: 'OVERWRITE ARCHON', subtitle: 'Keeper of Sealed Records', lines: [] },
  },
};

const zones = {
  vault_grid: [
    'vault_g_wraiths', 'vault_g_golem', 'vault_g_swarms', 'vault_g_golem_swarm',
    'vault_g_wraiths', 'vault_g_golem', 'vault_g_swarms', 'vault_g_golem_swarm', 'vault_g_packet',
  ],
  vault_core: ['vault_c_memory', 'vault_c_memory_wraith', 'vault_c_memories', 'vault_c_golem_memory'],
};

// Measured with tools/expected-fights.mjs on tests/routes/vault.mjs: 244 critical-path zone units give
// 3.7 random fights at these rates; with the four lessons and Echo, 8-9 fights (11.7: 8-10)
const zoneRates = { vault_grid: { grace: 11, sigma: 24 }, vault_core: { grace: 11, sigma: 24 } };

export default { enemies, encounters, zones, zoneRates, bossScripts };
