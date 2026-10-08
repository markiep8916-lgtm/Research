// dev: test-only battle data (PURE, TECH_PLAN 12.5; S3). Reachable only through debug hooks and the
// preview pages (preview-battle.js?enc=<id>&party=<n>). Every enemy uses POC art (drone, crawler,
// turret, sentinel), some with a tint. Each encounter exercises one group of model mechanics:
//
//   dev_party1..3    party-size scaling (1, 2, 3 foes of growing toughness)
//   dev_summon       a caller that summons mites mid-round (max 4 alive)
//   dev_transform    phase at 50% -> transform (keepHp), then onDefeat -> form 2 with a weakness
//                    pool; retryPhase -> dev_transform_2 (form 2 alone)
//   dev_submerge     a diver (submerge, then breach) and a wraith (phase)
//   dev_sleep        sleep (chance + limit), marked, jam
//   dev_winon        winOn 'boss': the adds shut down with the caller
//   dev_charge       a charge that fires `fires` next round and a lock-on that fires a rail shot
//   dev_cue          scripted boss: cues, say, setResist mirror, override, shifting weaknesses,
//                    cleanse, heal, protect, immune and ailmentResist
//   dev_ultimate     scripted boss: grantUltimate at 50%, rechargeUltimates at 25%

import { statLine } from '../balance.js';

const L = 10; // level of the POC party's foes

const act = (id, name, kind, extra) => ({ id, name, kind, power: 0, type: null, target: 'one', anim: 'enemyShot', weight: 0, desc: name, ...extra });
const shot = (id, name, type, power, weight, extra = {}) => act(id, name, 'attack', { type, power, weight, ...extra });

const enemies = {
  dev_drone: {
    kind: 'dev_drone', name: 'Test Drone', art: 'drone', ...statLine(L, 'standard'), shield: 3,
    weaknesses: ['rifle', 'lance', 'volt'],
    actions: [
      shot('dev_laser', 'Test Laser', 'thermal', 1.1, 70),
      act('dev_paint', 'Paint', 'debuff', { anim: 'enemyBeam', weight: 30, effect: { stats: ['def'], stage: -1, turns: 2 } }),
    ],
    drops: [{ id: 'medigel', chance: 0.2, n: 1 }],
  },
  dev_crawler: {
    kind: 'dev_crawler', name: 'Test Crawler', art: 'crawler', ...statLine(L, 'brute'), shield: 4,
    weaknesses: ['blade', 'gauntlet', 'thermal', 'cryo'],
    actions: [shot('dev_rend', 'Test Rend', 'blade', 1.2, 60, { anim: 'enemyMelee' }), shot('dev_spit', 'Test Spit', 'void', 0.8, 40, { anim: 'enemySpit' })],
    drops: [],
  },
  dev_turret: {
    kind: 'dev_turret', name: 'Test Turret', art: 'turret', ...statLine(L, 'armored'), shield: 5,
    weaknesses: ['lance', 'gauntlet', 'cryo', 'void'],
    actions: [shot('dev_spray', 'Test Spray', 'rifle', 0.7, 40, { target: 'all' }), shot('dev_slug', 'Test Slug', 'rifle', 1.4, 60)],
    drops: [],
  },

  // summons
  dev_caller: {
    kind: 'dev_caller', name: 'Test Caller', art: 'sentinel', tint: '#c8ffd8', ai: 'basic', boss: true,
    ...statLine(L, 'elite'), shield: 6, maxShieldCap: 10,
    weaknesses: ['lance', 'rifle', 'volt', 'photon'],
    actions: [
      act('dev_call', 'Call Mites', 'summon', { anim: 'enemyCharge', weight: 45, summon: { kind: 'dev_mite', count: 2 } }),
      shot('dev_cannon_shot', 'Test Cannon', 'thermal', 1.3, 55),
    ],
    drops: [{ id: 'revive', chance: 1, n: 1 }],
  },
  dev_mite: {
    kind: 'dev_mite', name: 'Test Mite', art: 'crawler', tint: '#9fe8ff', ...statLine(L, 'swarm'), shield: 1,
    weaknesses: ['blade', 'thermal'],
    actions: [shot('dev_nip', 'Nip', 'blade', 0.8, 100, { anim: 'enemyMelee' })],
    drops: [],
  },

  // phases, transforms, weakness pool
  dev_warden: {
    kind: 'dev_warden', name: 'Test Warden', art: 'sentinel', tint: '#ffe7b0', ai: 'basic', boss: true,
    ...statLine(L, 'elite'), shield: 6, maxShieldCap: 10,
    weaknesses: ['lance', 'rifle', 'photon', 'void'],
    phases: [{ at: 0.5, say: [{ speaker: 'TEST WARDEN', text: 'Overclocking. Please hold still.' }], transform: 'dev_warden_overclock', keepHp: true }],
    actions: [shot('dev_hymn', 'Test Hymn', 'photon', 0.8, 50, { target: 'all', anim: 'enemyBeam' }), shot('dev_cradle', 'Test Cradle', 'void', 1.3, 50)],
    drops: [],
  },
  dev_warden_overclock: {
    kind: 'dev_warden_overclock', name: 'Test Warden', art: 'sentinel', tint: '#9ff0ff', ai: 'basic', boss: true,
    ...statLine(L, 'elite'), shield: 6, maxShieldCap: 10, actionsPerRound: 2,
    weaknesses: ['blade', 'cryo', 'photon'],
    onDefeat: { transform: 'dev_warden_2', say: [{ speaker: 'TEST WARDEN', text: 'Not yet. I am not done keeping you.' }] },
    actions: [shot('dev_hymn_oc', 'Overclocked Hymn', 'photon', 0.9, 50, { target: 'all', anim: 'enemyBeam' }), shot('dev_cradle_oc', 'Overclocked Cradle', 'void', 1.4, 50)],
    drops: [],
  },
  dev_warden_2: {
    kind: 'dev_warden_2', name: 'Test Warden Unbound', art: 'sentinel', tint: '#ffb0e0', ai: 'basic', boss: true,
    ...statLine(L, 'elite'), shield: 6, maxShieldCap: 12, actionsPerRound: 2, shieldGain: 2,
    weaknesses: ['lance', 'volt'],
    weaknessPool: [['lance', 'volt'], ['blade', 'cryo'], ['rifle', 'photon']], shiftOnRecover: true,
    actions: [shot('dev_requiem', 'Test Requiem', 'void', 1.0, 60, { target: 'all', anim: 'enemyBeam' }), shot('dev_choir', 'Test Choir', 'photon', 1.4, 40)],
    xp: 300, credits: 300, drops: [{ id: 'revive', chance: 1, n: 1 }],
  },

  // untargetable
  dev_diver: {
    kind: 'dev_diver', name: 'Test Diver', art: 'crawler', tint: '#a8c8ff', script: 'dev_diver', ...statLine(L, 'standard'), shield: 3,
    weaknesses: ['thermal', 'lance', 'rifle'],
    actions: [
      shot('dev_bite', 'Test Bite', 'blade', 1.1, 100, { anim: 'enemyMelee' }),
      act('dev_dive', 'Dive', 'submerge', { anim: 'enemyCharge', untargetable: 1, then: 'dev_breach' }),
      shot('dev_breach', 'Breach', 'void', 0.9, 0, { target: 'all', anim: 'enemyBeam' }),
    ],
    drops: [],
  },
  dev_wraith: {
    kind: 'dev_wraith', name: 'Test Wraith', art: 'drone', tint: '#e6b8ff', script: 'dev_diver', untargetableStyle: 'phase',
    ...statLine(L, 'caster'), shield: 2,
    weaknesses: ['photon', 'volt'],
    actions: [
      shot('dev_static', 'Test Static', 'volt', 1.1, 100),
      act('dev_phase', 'Phase Out', 'submerge', { anim: 'enemyCharge', untargetable: 1, style: 'phase' }),
    ],
    drops: [],
  },

  // ailments
  dev_spore: {
    kind: 'dev_spore', name: 'Test Spore', art: 'drone', tint: '#c9ff9a', ...statLine(L, 'caster'), shield: 2,
    weaknesses: ['thermal', 'blade'],
    actions: [
      act('dev_pollen', 'Test Pollen', 'debuff', { type: 'void', power: 0.4, target: 'all', anim: 'enemySpit', weight: 60,
        effect: { stats: ['sleep'], stage: 1, turns: 2, chance: 0.6, limit: 2 } }),
      shot('dev_spore_shot', 'Spore Shot', 'void', 1.0, 40),
    ],
    drops: [],
  },
  dev_marker: {
    kind: 'dev_marker', name: 'Test Trooper', art: 'turret', tint: '#ffb0b0', ...statLine(L, 'standard'), shield: 3,
    weaknesses: ['gauntlet', 'volt', 'cryo'],
    actions: [
      act('dev_mark', 'Mark Target', 'debuff', { anim: 'enemyBeam', weight: 40, cooldown: 2, effect: { stats: ['marked'], stage: 1, turns: 2 } }),
      shot('dev_focus', 'Focus Shot', 'rifle', 1.2, 60),
    ],
    drops: [],
  },
  dev_jammer: {
    kind: 'dev_jammer', name: 'Test Jammer', art: 'drone', tint: '#ffd27a', ...statLine(L, 'swarm'), shield: 2,
    weaknesses: ['rifle', 'photon'],
    actions: [
      act('dev_jam', 'Jam Signal', 'debuff', { anim: 'enemyBeam', weight: 50, cooldown: 2, effect: { stats: ['jam'], stage: 1, turns: 2 } }),
      shot('dev_zap', 'Zap', 'volt', 0.9, 50),
    ],
    drops: [],
  },

  // telegraphs
  dev_cannon: {
    kind: 'dev_cannon', name: 'Test Cannon', art: 'turret', tint: '#ff9a7a', ...statLine(L, 'armored'), shield: 4,
    weaknesses: ['lance', 'cryo', 'void'],
    actions: [
      act('dev_overload', 'Overload', 'charge', { anim: 'enemyCharge', weight: 60, cooldown: 2, fires: 'dev_overload_beam', chargeRounds: 1,
        telegraph: 'The cannon\'s capacitors scream...' }),
      shot('dev_overload_beam', 'Overload Beam', 'thermal', 1.6, 0, { target: 'all', anim: 'enemyBeam', fx: 'dev.beam' }),
      shot('dev_cannon_slug', 'Slug', 'rifle', 1.0, 40),
    ],
    drops: [],
  },
  dev_locker: {
    kind: 'dev_locker', name: 'Test Locker', art: 'drone', tint: '#ff7b88', ...statLine(L, 'standard'), shield: 3,
    weaknesses: ['rifle', 'lance', 'volt'],
    actions: [
      act('dev_lock', 'Target Lock', 'lockOn', { anim: 'enemyCharge', weight: 50, cooldown: 2, fires: 'dev_rail' }),
      shot('dev_rail', 'Rail Shot', 'void', 2.0, 0, { anim: 'enemyBeam' }),
      shot('dev_tick', 'Tick', 'thermal', 0.9, 50),
    ],
    drops: [],
  },

  // scripted bosses
  dev_conductor: {
    kind: 'dev_conductor', name: 'Test Conductor', art: 'sentinel', tint: '#9ffff0', script: 'dev_conductor', boss: true,
    ...statLine(L, 'elite'), shield: 6, maxShieldCap: 10,
    weaknesses: ['lance', 'volt'],
    weaknessPool: [['lance', 'volt'], ['blade', 'cryo'], ['rifle', 'photon']], shiftOnRecover: true,
    resist: { thermal: 0.5 }, immune: ['sleep'], ailmentResist: { jam: 0.5 },
    actions: [
      shot('dev_answer', 'Answer', 'photon', 1.1, 60),
      shot('dev_chord', 'Chord', 'void', 0.7, 40, { target: 'all', anim: 'enemyBeam' }),
    ],
    drops: [],
  },
  dev_sentinel: {
    kind: 'dev_sentinel', name: 'Test Sentinel', art: 'sentinel', script: 'dev_awaken', boss: true, actionsPerRound: 2,
    ...statLine(L, 'elite'), shield: 6, maxShieldCap: 12,
    weaknesses: ['lance', 'rifle', 'volt', 'photon'],
    actions: [
      shot('dev_plasma', 'Test Plasma', 'thermal', 1.3, 60),
      shot('dev_sweep', 'Test Sweep', 'photon', 0.8, 40, { target: 'all', anim: 'enemyBeam' }),
    ],
    drops: [],
  },
};

const enc = (id, list, extra = {}) => ({ id, enemies: list, backdrop: 'corridor', boss: false, canFlee: true, music: 'battle', ...extra });
const boss = (id, list, extra = {}) => enc(id, list, { backdrop: 'bridge', boss: true, canFlee: false, music: 'boss', ...extra });

const encounters = {
  dev_party1: enc('dev_party1', ['dev_drone']),
  dev_party2: enc('dev_party2', ['dev_drone', 'dev_crawler'], { backdrop: 'engineering' }),
  dev_party3: enc('dev_party3', ['dev_drone', 'dev_turret', 'dev_drone'], { backdrop: 'engineering' }),
  dev_summon: boss('dev_summon', ['dev_caller'], {
    intro: { title: 'TEST CALLER', subtitle: 'Summons on demand', lines: [{ speaker: 'BOLT', text: 'It is calling friends. I would like it to stop.' }] },
  }),
  dev_transform: boss('dev_transform', ['dev_warden'], {
    intro: { title: 'TEST WARDEN', subtitle: 'Two-form dev boss', lines: [{ speaker: 'TEST WARDEN', text: 'Please. Go back to sleep.' }] },
    outro: { lines: [{ speaker: 'TEST WARDEN', text: 'I only wanted you safe.' }] },
    phaseMusic: { dev_warden_2: 'boss' },
    retryPhase: { encounter: 'dev_transform_2' },
    tips: [{ on: 'transform', lines: [{ speaker: 'BOLT', text: 'It changed shape. Its weak points changed too.' }], flag: 'tut:dev_transform' }],
  }),
  dev_transform_2: boss('dev_transform_2', ['dev_warden_2'], { music: 'boss' }),
  dev_submerge: enc('dev_submerge', ['dev_diver', 'dev_wraith'], { backdrop: 'engineering' }),
  dev_sleep: enc('dev_sleep', ['dev_spore', 'dev_marker', 'dev_jammer'], { backdrop: 'cryo' }),
  dev_winon: boss('dev_winon', ['dev_mite', 'dev_caller', 'dev_mite'], { winOn: 'boss' }),
  dev_charge: enc('dev_charge', ['dev_cannon', 'dev_locker'], { backdrop: 'engineering' }),
  dev_cue: boss('dev_cue', ['dev_conductor']),
  dev_ultimate: boss('dev_ultimate', ['dev_sentinel'], {
    intro: { title: 'TEST SENTINEL', subtitle: 'Ultimate awakening', lines: [] },
  }),
};

// Boss scripts (TECH_PLAN 7.3). Pure functions over the api.
const bossScripts = {
  // Dives (or phases) every third round starting in round 1, then lets `then` breach.
  dev_diver: {
    chooseAction(api, e) {
      const dive = e.key === 'dev_wraith' ? 'dev_phase' : 'dev_dive';
      if (api.round % 3 === 1 && !e.untargetable && api.mem[e.id] !== api.round) {
        api.mem[e.id] = api.round;
        api.telegraph(e.id, null, `${e.name} slips out of reach...`);
        return { actionId: dive };
      }
      return null;
    },
  },
  // Every hook and most api calls, for the model tests and the preview cues.
  dev_conductor: {
    thresholds: [0.75, 0.5, 0.25],
    onBegin(api) {
      api.say('TEST CONDUCTOR', 'Every note you play, I will play back.', { portrait: 'holo' });
      api.protect(api.party()[0].id);
    },
    onRoundStart(api, round) {
      if (round % 2 === 0) api.cue('domeLight', { value: true });
    },
    onPartyAction(api, actor, action) {
      if (!action.damageType) return;
      api.mem.last = action.damageType;
      api.setResist(api.enemy('dev_conductor').id, { [action.damageType]: 0.5 }, { rounds: 1 });
    },
    chooseAction(api) {
      if (!api.mem.last) return null;
      return { actionId: 'dev_answer', override: { type: api.mem.last, name: 'Mirror' } };
    },
    onThreshold(api, e, f) {
      if (f === 0.75) api.shiftWeaknesses(e.id, ['blade', 'gauntlet']);
      if (f === 0.5) {
        api.say('BOLT', 'Everyone up. Nap time is over.', { portrait: 'bolt' });
        api.cleanse('party', ['sleep']);
      }
      if (f === 0.25) api.heal(e.id, Math.round(e.maxHp * 0.1));
    },
    onBreak(api, e) {
      api.cue('domeLight', { targetId: e.id, value: false });
    },
  },
  // Ultimate awakening at 50%, recharge at 25%.
  dev_awaken: {
    thresholds: [0.5, 0.25],
    onThreshold(api, e, f) {
      if (f === 0.5) {
        const first = api.party()[0];
        if (first) {
          api.say(first.name, 'Not here. Not like this.', { expr: 'determined' });
          for (const p of api.party()) api.grantUltimate(p.id);
        }
      } else {
        api.rechargeUltimates();
      }
    },
  },
};

export default { enemies, encounters, zones: {}, items: {}, shops: {}, bossScripts };
