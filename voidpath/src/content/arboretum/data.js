// arboretum: battle and economy data (PURE, TECH_PLAN 2.3, 7.1-7.3, 7.8, 7.9, 12.5).
//
// Regular enemies of chapter 2 (art by the bestiary task in enemyart.js, art key = kind):
//   spore_drone      Pollen: a sleep spore over the squad; uses it in round 1 by script   teaches sleep
//   bloom_mantis     two actions a round                                                  multi-action bosses
//   rootling         weak swarm, only ever summoned                                       adds
//   feral_caretaker  sows a Rootling in round 1 by script, then sprays sap on its sprouts  the Gardener
// Boss THE GARDENER (MOTHER-7, 7.9): two actions a round; Thorn Lash, Pollen (sleep), Summon Rootlings
// (two, once, from round 3). The dome light opens every third round (cue 'domeLight'); under it her
// first action gathers the light (the telegraph band) and her last action of the NEXT round is
// Photosynthesis, a heal. Any Break in between cancels it (cue 'domeDim', her line): the squad has a
// full round to answer the telegraph (G3-05). At 50% she sows two Rootlings at once and Sera's
// ultimate awakens. winOn 'boss': the Rootlings fall with her.
//
// Scripted fights (a visible field encounter each, so their tips are deterministic, 7.7):
//   arb_spores     two Spore Drones in the Fern Walk (status:sleep tip)
//   arb_caretaker  a Feral Caretaker and its Bloom Mantis at the Stasis Gardens gate (summon tip)
// Zones: arb_fern (the Fern Walk, the first stretch: lighter formations, G3-03), arb_gardens (the Glasshouse,
// after the pump house's Med-Station: drones and mantises), arb_stasis (the Stasis Gardens: caretakers
// join). Rates follow the measured critical-path distance (11.7).
// M3: the Thorn Matriarch (optional elite of the Seed Vault, guards eq_x_bloom_crown) and a rare
// Gilded Spore in the gardens (big drops).

import { statLine } from '../balance.js';

const act = (id, name, kind, desc, extra = {}) => ({
  id, name, kind, power: 0, type: null, target: 'one', anim: 'enemyMelee', weight: 0, desc, ...extra,
});
const hit = (id, name, type, power, weight, desc, extra = {}) => act(id, name, 'attack', desc, { type, power, weight, ...extra });

/** A statLine with its HP scaled. */
const hpScaled = (line, hp) => ({ ...line, maxHp: Math.round(line.maxHp * hp) });

/** A statLine with its HP and its ATK / MAG scaled (the Gardener's lines, measured with the policy). */
function scaled(line, hp, power) {
  const { atk, mag } = line.stats;
  return { ...line, maxHp: Math.round(line.maxHp * hp), stats: { ...line.stats, atk: Math.round(atk * power), mag: Math.round(mag * power) } };
}

// Pollen: a light photon puff on everyone with a sleep chance. The first cloud of a battle (scripted)
// always puts one traveler under, so the sleep lesson never hangs on a roll. One sleeper at a time
// (G3-03): a cloud puts at most one traveler under, and nobody sows Pollen while someone sleeps.
const SLEEP = { stats: ['sleep'], stage: 1, turns: 2 };
const someoneSleeps = (api) => api.party().some((p) => p.buffs.sleep);

const enemies = {
  spore_drone: {
    kind: 'spore_drone', name: 'Spore Drone', script: 'spore_drone', ...statLine(13, 'caster'), shield: 3,
    weaknesses: ['thermal', 'rifle', 'volt'],
    stage: { hover: 0.08 },
    actions: [
      hit('spore_dart', 'Spore Dart', 'lance', 1.0, 65, 'A seed spike fired from the puffball.', { anim: 'enemyShot' }),
      act('spore_pollen', 'Pollen', 'debuff', 'A golden cloud over the squad. Sleep may follow.', {
        type: 'photon', power: 0.3, target: 'all', anim: 'enemyBeam', pose: 'special', weight: 35, cooldown: 2,
        effect: { ...SLEEP, chance: 0.35, limit: 1 },
      }),
      act('spore_pollen_first', 'Pollen', 'debuff', 'A golden cloud over the squad. Someone always breathes it in.', {
        type: 'photon', power: 0.3, target: 'all', anim: 'enemyBeam', pose: 'special', effect: { ...SLEEP, limit: 1 },
      }),
    ],
    drops: [{ id: 'stim', chance: 0.15, n: 1 }],
  },
  bloom_mantis: {
    // two actions a round (its lesson) on a lighter body, so it falls in 3-5 rounds (G3-03)
    kind: 'bloom_mantis', name: 'Bloom Mantis', ...hpScaled(statLine(14, 'brute'), 0.7), shield: 3, actionsPerRound: 2,
    weaknesses: ['cryo', 'rifle', 'gauntlet'],
    actions: [
      hit('mantis_scythe', 'Leaf Scythe', 'blade', 0.72, 60, 'A sweep of the leaf-blade arms.'),
      hit('mantis_flurry', 'Petal Flurry', 'blade', 0.38, 25, 'Cuts too fast to count. Two of them.', { hits: 2 }),
      act('mantis_thorns', 'Thorn Crown', 'debuff', 'A spray of thorns. Lowers DEF.', {
        type: 'lance', power: 0.4, weight: 15, cooldown: 2, effect: { stats: ['def'], stage: -1, turns: 2 },
      }),
    ],
    drops: [{ id: 'medigel_plus', chance: 0.12, n: 1 }],
  },
  rootling: {
    // a weak swarm: about two blows each, so adds never stall a fight for long (G3-05)
    kind: 'rootling', name: 'Rootling', ...hpScaled(statLine(13, 'swarm'), 0.6), shield: 2,
    weaknesses: ['blade', 'thermal', 'photon'],
    stage: { spawn: 'rise' },
    actions: [
      hit('root_nip', 'Root Nip', 'gauntlet', 0.8, 70, 'A knot of roots, swung hard.'),
      act('root_tangle', 'Tangle', 'debuff', 'Roots wind round an ankle. Lowers SPD.', {
        type: 'blade', power: 0.35, weight: 30, cooldown: 2, effect: { stats: ['spd'], stage: -1, turns: 2 },
      }),
    ],
    drops: [{ id: 'medigel', chance: 0.1, n: 1 }],
  },
  feral_caretaker: {
    kind: 'feral_caretaker', name: 'Feral Caretaker', script: 'feral_caretaker', ...statLine(15, 'standard'), shield: 5,
    weaknesses: ['volt', 'gauntlet', 'void'],
    actions: [
      hit('care_shears', 'Pruning Shears', 'blade', 1.1, 55, 'Pruning, with no idea what it is pruning.'),
      act('care_sow', 'Sow', 'summon', 'Plants a Rootling. It grows up fast.', {
        anim: 'enemyCharge', summon: { kind: 'rootling', count: 1 }, weight: 25, cooldown: 2,
      }),
      act('care_sap', 'Sap Spray', 'heal', 'Waters its sprouts with sap. Heals an ally.', {
        anim: 'enemyCharge', target: 'ally', heal: 0.3, weight: 35, cooldown: 1,
      }),
    ],
    drops: [{ id: 'ether_plus', chance: 0.12, n: 1 }, { id: 'thermal_charge', chance: 0.1, n: 1 }],
  },

  // ---- THE GARDENER (7.9): MOTHER-7 grown into her own vines
  gardener: {
    kind: 'gardener', name: 'The Gardener', art: 'gardener', boss: true, ai: 'basic', script: 'gardener',
    // a low shield that does not grow, so a squad that reads the dome light can Break her inside its
    // window; she hits hard, but every dome costs her two actions (G2 bar rule 7). G3-05: HP -9%, the
    // dome every third round, one sleeper at a time: 9-10 rounds at L17-19 (tools/boss-by-level.mjs)
    ...scaled(statLine(17, 'boss'), 1.05, 1.3), shield: 3, maxShieldCap: 3, shieldGain: 0, actionsPerRound: 2,
    weaknesses: ['thermal', 'blade', 'void'],
    actions: [
      hit('gardener_lash', 'Thorn Lash', 'blade', 1.3, 55, 'A whip of thorned vine across one traveler.', { pose: 'attack', fx: 'gardener.lash' }),
      act('gardener_pollen', 'Pollen', 'debuff', 'Gold dust drifts down from her blooms. Sleep may follow.', {
        type: 'photon', power: 0.5, target: 'all', anim: 'enemyBeam', pose: 'pollen', weight: 30, cooldown: 2,
        effect: { ...SLEEP, chance: 0.4, limit: 1 }, fx: 'gardener.pollen',
      }),
      act('gardener_sow', 'Summon Rootlings', 'summon', 'Seedlings climb out of the beds to keep the paths.', {
        anim: 'enemyCharge', pose: 'sow', summon: { kind: 'rootling', count: 2 }, weight: 0, fx: 'gardener.sow',
      }),
      act('gardener_gather', 'Gather Light', 'buff', 'She turns her leaves to the dome light. It heals her next round.', {
        anim: 'enemyCharge', pose: 'special', target: 'self', fx: 'gardener.gather',
      }),
      act('gardener_photo', 'Photosynthesis', 'heal', 'The dome light knits her vines back together.', {
        anim: 'enemyCharge', pose: 'special', target: 'self', heal: 0.06, fx: 'gardener.photosynthesis',
      }),
    ],
    drops: [{ id: 'revive', chance: 1, n: 1 }, { id: 'ether_plus', chance: 1, n: 2 }],
  },

  // ---- M3: the optional elite of the Seed Vault and the rare encounter of the gardens
  thorn_matriarch: {
    kind: 'thorn_matriarch', name: 'Thorn Matriarch', art: 'bloom_mantis', tint: '#ffd0e4', boss: true, ai: 'basic',
    ...statLine(17, 'elite'), shield: 7, maxShieldCap: 12, actionsPerRound: 2,
    weaknesses: ['cryo', 'thermal', 'gauntlet'],
    stage: { scale: 1.4 },
    actions: [
      hit('matriarch_scythe', 'Crown Scythe', 'blade', 0.9, 55, 'Both leaf-blades at once.'),
      hit('matriarch_flurry', 'Petal Storm', 'blade', 0.35, 30, 'A storm of cutting petals over everyone.', { target: 'all', cooldown: 1 }),
      act('matriarch_thorns', 'Thorn Crown', 'debuff', 'A ring of thorns. Lowers DEF.', {
        type: 'lance', power: 0.5, weight: 15, cooldown: 2, effect: { stats: ['def'], stage: -1, turns: 2 },
      }),
    ],
    drops: [{ id: 'eq_x_bloom_crown', chance: 1, n: 1 }, { id: 'medigel_max', chance: 1, n: 1 }],
  },
  gilded_spore: {
    kind: 'gilded_spore', name: 'Gilded Spore', art: 'spore_drone', tint: '#ffe39a', ...statLine(13, 'swarm'), shield: 2,
    weaknesses: ['thermal', 'rifle'],
    xp: 300, credits: 820,
    stage: { hover: 0.08 },
    actions: [hit('gilded_dart', 'Gold Dart', 'lance', 0.8, 100, 'A seed spike, gilded with pollen.', { anim: 'enemyShot' })],
    drops: [{ id: 'medigel_max', chance: 0.6, n: 1 }, { id: 'ether_plus', chance: 0.6, n: 1 }],
  },
};

// ---------------------------------------------------------------- boss scripts (7.3)

const alive = (api, kind) => api.enemies().filter((e) => e.key === kind);

const bossScripts = {
  // The first Pollen of a battle comes in round 1, from the first drone to act, and always lands.
  // While a traveler sleeps, the drones only shoot.
  spore_drone: {
    chooseAction(api, e) {
      if (someoneSleeps(api)) return { actionId: 'spore_dart' };
      if (api.mem.pollen || api.round > 2) return null;
      api.mem.pollen = true;
      return { actionId: 'spore_pollen_first' };
    },
  },
  // Each caretaker sows a Rootling with its first action, then gardens as usual.
  feral_caretaker: {
    chooseAction(api, e) {
      const sowed = (api.mem.sowed ||= {});
      if (sowed[e.id]) return null;
      sowed[e.id] = true;
      return alive(api, 'rootling').length < 2 ? { actionId: 'care_sow' } : null;
    },
  },
  gardener: {
    thresholds: [0.5],
    onBegin(api) {
      api.mem.acted = {};
      api.mem.gathered = 0;
      api.mem.cancelled = 0;
      api.mem.held = null;
    },
    // the dome irises open every third round (2, 5, 8, ...) and close once the light is spent
    onRoundStart(api, round) {
      const g = api.enemy('gardener');
      if (!g || !g.alive) return;
      if (round % 3 === 2) {
        api.mem.open = true;
        api.cue('domeLight', { targetId: g.id, value: true });
        if (!api.mem.domeSaid) {
          api.mem.domeSaid = true;
          api.say('MOTHER-7', 'Light. Good light. Grow.', { portrait: 'mother7' });
        }
      } else if (api.mem.open && !api.mem.held) {
        api.mem.open = false;
        api.cue('domeLight', { targetId: g.id, value: false });
      }
    },
    // Under the open dome her first action gathers the light (the telegraph band), and it heals her
    // with her last action of the NEXT round: the squad has a full round to Break her (G3-05)
    chooseAction(api, e) {
      if (e.key !== 'gardener') return null;
      const n = (api.mem.acted[api.round] = (api.mem.acted[api.round] || 0) + 1);
      if (api.mem.held && api.round > api.mem.held && n >= (e.actionsPerRound || 1)) {
        api.mem.held = null;
        return { actionId: 'gardener_photo', targetId: e.id };
      }
      if (api.mem.open && n === 1 && !api.mem.held && api.round % 3 === 2) {
        api.mem.held = api.round;
        api.mem.gathered++;
        api.telegraph(e.id, null, 'MOTHER-7 drinks in the dome light. Next round, it heals her...');
        return { actionId: 'gardener_gather', targetId: e.id };
      }
      // once, in round 3 or later, she sows two Rootlings (the 50% beat sows two more)
      if (api.round >= 3 && !api.mem.sowRound && alive(api, 'rootling').length === 0) {
        api.mem.sowRound = api.round;
        return { actionId: 'gardener_sow', targetId: e.id };
      }
      // one sleeper at a time: no Pollen while a traveler sleeps
      return someoneSleeps(api) ? { actionId: 'gardener_lash' } : null;
    },
    // any Break while she holds the light: the heal never comes
    onBreak(api, e) {
      if (e.key !== 'gardener' || !api.mem.held) return;
      api.mem.held = null;
      api.mem.cancelled++;
      api.cue('domeDim', { targetId: e.id });
      api.say('MOTHER-7', 'The light... it does not reach me.', { portrait: 'mother7' });
    },
    onThreshold(api, e) {
      if (e.key !== 'gardener') return;
      api.summon('rootling', { count: 2 });
      api.cue('gardener_rage', { targetId: e.id });
      api.say('SERA', 'They\'re not seedlings. They\'re people.', { expr: 'determined' });
      api.grantUltimate('sera');
    },
  },
};

// ---------------------------------------------------------------- encounters and zones

const enc = (id, list, backdrop, extra = {}) => ({ id, enemies: list, backdrop, boss: false, canFlee: true, music: 'battle', ...extra });

const encounters = {
  // the two lessons (scripted field encounters)
  arb_spores: enc('arb_spores', ['spore_drone', 'spore_drone'], 'arboretum', { canFlee: false }),
  arb_caretaker: enc('arb_caretaker', ['feral_caretaker', 'bloom_mantis'], 'arboretum', { canFlee: false }),
  // the Fern Walk (the first stretch, before the pump house's Med-Station): no mantis pairs, no
  // mantis-and-two-drones (G3-03; with the Glasshouse's three drones and the rare gilded drone)
  arb_f_drones: enc('arb_f_drones', ['spore_drone', 'spore_drone'], 'arboretum'),
  arb_f_mantis: enc('arb_f_mantis', ['bloom_mantis', 'spore_drone'], 'arboretum'),
  // the Glasshouse
  arb_g_spores: enc('arb_g_spores', ['spore_drone', 'spore_drone', 'spore_drone'], 'arboretum'),
  arb_g_mantis: enc('arb_g_mantis', ['spore_drone', 'bloom_mantis'], 'arboretum'),
  arb_g_mantis_pair: enc('arb_g_mantis_pair', ['bloom_mantis', 'bloom_mantis'], 'arboretum'),
  arb_g_swarm: enc('arb_g_swarm', ['spore_drone', 'bloom_mantis', 'spore_drone'], 'arboretum'),
  // the Stasis Gardens
  arb_s_caretakers: enc('arb_s_caretakers', ['feral_caretaker', 'spore_drone'], 'arboretum'),
  arb_s_mantis: enc('arb_s_mantis', ['bloom_mantis', 'rootling'], 'arboretum'),
  arb_s_spores: enc('arb_s_spores', ['spore_drone', 'bloom_mantis', 'spore_drone'], 'arboretum'),
  arb_s_keepers: enc('arb_s_keepers', ['rootling', 'feral_caretaker', 'rootling'], 'arboretum'),
  // M3: the rare one (a gilded drone, big drops)
  arb_g_gilded: enc('arb_g_gilded', ['gilded_spore', 'spore_drone', 'spore_drone'], 'arboretum'),

  // the boss
  arb_boss_gardener: {
    id: 'arb_boss_gardener', enemies: ['gardener'], backdrop: 'choir_gate', boss: true, canFlee: false, music: 'boss', winOn: 'boss',
    intro: { title: 'THE GARDENER', subtitle: 'MOTHER-7, Caretaker', lines: [{ speaker: 'MOTHER-7', text: 'Hush. You will wake the seedlings.', portrait: 'mother7' }] },
    outro: { lines: [{ speaker: 'MOTHER-7', text: 'The vines are so heavy. Thank you.', portrait: 'mother7' }] },
    tips: [{
      on: 'cue:domeLight', flag: 'tut:dome_light',
      lines: [{ speaker: 'SERA', text: 'That light heals her next round. *Break* her shield before then and the heal fails.' }],
    }],
  },
  // M3: the optional elite in the Seed Vault
  arb_elite_matriarch: {
    id: 'arb_elite_matriarch', enemies: ['thorn_matriarch'], backdrop: 'arboretum', boss: true, canFlee: false, music: 'boss',
    intro: { title: 'THORN MATRIARCH', subtitle: 'Keeper of the Seed Vault', lines: [] },
  },
};

const zones = {
  arb_fern: ['arb_f_mantis', 'arb_f_drones', 'arb_g_spores', 'arb_f_mantis', 'arb_f_drones', 'arb_g_gilded'],
  arb_gardens: ['arb_g_spores', 'arb_g_mantis', 'arb_g_mantis_pair', 'arb_g_swarm', 'arb_g_mantis', 'arb_g_swarm', 'arb_g_spores', 'arb_g_gilded'],
  arb_stasis: ['arb_s_caretakers', 'arb_s_mantis', 'arb_s_spores', 'arb_s_keepers', 'arb_s_mantis', 'arb_s_spores'],
};

// From the measured critical path (the shortest walk through the beds, as tests/campaign.mjs joins it):
// about 192 units of garden walking (the Fern Walk and the Glasshouse) and 86 in the Stasis Gardens,
// for about five random fights beside the two lessons and the Gardener (11.7: 8-10 in all), at the
// 11.7 default rate.
const zoneRates = {
  arb_fern: { grace: 12, sigma: 24 },
  // a little denser past the pump house, so the party meets the Gardener at its plan level 17
  arb_gardens: { grace: 11, sigma: 22 },
  arb_stasis: { grace: 11, sigma: 22 },
};

export default { enemies, encounters, zones, zoneRates, bossScripts };
