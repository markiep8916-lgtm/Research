// prologue: battle data (PURE, TECH_PLAN 2.3, 7.8, 7.9, 11.7). Numbers come from content/balance.js
// statLine (C10 tunes them through balance.js overrides); the behaviour is binding.
//
//   enemies     pro_drone_glitch (the tutorial's malfunctioning Sec-Drone), pro_drone, pro_crawler,
//               pro_turret (POC art and behaviour, prologue numbers), sentinel_mk1 (charge, then a
//               heavy shot next round: teaches Defend), pro_sentinel (the boss: POC 'sentinel' AI),
//               pro_patrol_mk1 / pro_patrol_drone (the pro_late patrols after WARDEN speaks in ch1),
//               M3: pro_parade_drone (rare, big drops), pro_rigged_crawler (optional elite, Power Band)
//   encounters  pro_tutorial, pro_orion_rescue, pro_sentinel_squad, pro_boss_sentinel (scripted);
//               pro_c* (Spine Corridor, Kade and Sera), pro_e* (after Orion joins), pro_l* (late),
//               pro_elite_crawler (the berth's field elite, prologue.rigged)
//   zones       pro_corridor, pro_engineering, pro_late (areas pick them by story flags, halcyon.js)
//
// Encounter tips (WRITING.md 9.1): Sera's healing tip on her first fights, Orion's area tip on his,
// Nyx's Expose tip in the squad fight. The global tips (reveal, break, bp3, telegraph) are common's.

import { statLine } from '../balance.js';

const tip = (on, speaker, text, flag) => ({ on, lines: [{ speaker, text }], flag });

const TIP_SERA = tip('playerTurn', 'SERA', 'Hurt? *Nanoheal*, or a Medi-Gel from Items. I\'d rather you didn\'t bleed.', 'tut:pro_items');
const TIP_ORION = tip('playerTurn', 'ORION', 'My skills hit *every* foe at once. Thermal for the drones, cryo for the crawlers.', 'tut:pro_area');
const TIP_NYX = tip('playerTurn', 'NYX', '*Expose* strips their defences. Then everybody hits harder. You\'re welcome.', 'tut:pro_expose');

// POC actions, reused by the prologue kinds
const DRONE_ACTIONS = [
  { id: 'laser_bolt', name: 'Laser Bolt', kind: 'attack', power: 1.1, type: 'thermal', target: 'one', anim: 'enemyShot', weight: 70,
    desc: 'Fires a focused laser bolt.' },
  { id: 'target_lock', name: 'Target Lock', kind: 'debuff', power: 0, type: null, target: 'one', anim: 'enemyBeam', weight: 30,
    effect: { stats: ['def'], stage: -1, turns: 2 }, desc: 'Paints a target. Lowers DEF.' },
];
const CRAWLER_ACTIONS = [
  { id: 'rend', name: 'Rend', kind: 'attack', power: 1.25, type: 'blade', target: 'one', anim: 'enemyMelee', weight: 60,
    desc: 'Tears in with cutting mandibles.' },
  { id: 'acid_spit', name: 'Acid Spit', kind: 'attack', power: 0.7, type: 'void', target: 'one', anim: 'enemySpit', weight: 40,
    effect: { stats: ['def'], stage: -1, turns: 2 }, desc: 'Corrosive nanite slurry. Damages and lowers DEF.' },
];
const TURRET_ACTIONS = [
  { id: 'suppressive_fire', name: 'Suppressive Fire', kind: 'attack', power: 0.75, type: 'rifle', target: 'all', anim: 'enemyShot', weight: 40,
    desc: 'Sprays the whole squad with fire.' },
  { id: 'piercing_round', name: 'Piercing Round', kind: 'attack', power: 1.5, type: 'rifle', target: 'one', anim: 'enemyShot', weight: 60,
    desc: 'An armor-piercing heavy slug.' },
];
// Sentinel Mk-I: a patrol walker whose rail cannon charges for a round (telegraph), then fires
const MK1_ACTIONS = [
  { id: 'mk1_burst', name: 'Burst Fire', kind: 'attack', power: 0.9, type: 'rifle', target: 'one', anim: 'enemyShot', weight: 60,
    desc: 'A three-round burst from the chin guns.' },
  { id: 'mk1_charge', name: 'Rail Charge', kind: 'charge', power: 0, type: null, target: 'one', anim: 'enemyCharge', pose: 'special',
    fires: 'mk1_rail', chargeRounds: 1, telegraph: 'Sentinel Mk-I is charging...', weight: 40, minRound: 1, cooldown: 3,
    desc: 'Spins up the rail cannon. It fires next round.' },
  { id: 'mk1_rail', name: 'Rail Shot', kind: 'attack', power: 2.3, type: 'thermal', target: 'one', anim: 'enemyBeam', pose: 'attack', weight: 0,
    desc: 'The charged rail cannon. Heavy thermal damage.' },
];
// the SENTINEL keeps the POC kit and AI: Lock-On, then the Annihilator Beam; Overcharge below 50%
const SENTINEL_ACTIONS = [
  { id: 'plasma_cannon', name: 'Plasma Cannon', kind: 'attack', power: 1.5, type: 'thermal', target: 'one', anim: 'enemyShot', weight: 50,
    desc: 'A searing plasma shell.' },
  { id: 'sweep_laser', name: 'Sweep Laser', kind: 'attack', power: 0.85, type: 'photon', target: 'all', anim: 'enemyBeam', weight: 38,
    desc: 'A cutting beam swept across the squad.' },
  { id: 'overcharge', name: 'Overcharge', kind: 'buff', power: 0, type: null, target: 'self', anim: 'enemyCharge', weight: 12,
    effect: { stats: ['atk', 'mag'], stage: 1, turns: 3 }, desc: 'Vents its limiters. Raises ATK and MAG.' },
  { id: 'lock_on', name: 'Lock-On', kind: 'lockOn', power: 0, type: null, target: 'one', anim: 'enemyCharge', weight: 0,
    desc: 'Locks targeting arrays onto one traveler.' },
  { id: 'annihilator_beam', name: 'Annihilator Beam', kind: 'attack', power: 3.2, type: 'void', target: 'one', anim: 'enemyBeam', weight: 0,
    desc: 'The main cannon. Fires at the locked target.' },
];

const enemies = {
  pro_drone_glitch: {
    kind: 'pro_drone_glitch', name: 'Glitching Sec-Drone', art: 'drone', tint: '#ffd6c8', ...statLine(1, 'swarm'), shield: 2,
    weaknesses: ['lance', 'volt', 'rifle'], actions: DRONE_ACTIONS.map((a) => ({ ...a, power: a.power * 0.8 })),
    drops: [{ id: 'medigel', chance: 1, n: 1 }],
  },
  pro_drone: {
    kind: 'pro_drone', name: 'Sec-Drone', art: 'drone', ...statLine(3, 'standard'), shield: 3,
    weaknesses: ['rifle', 'lance', 'volt'], actions: DRONE_ACTIONS, drops: [{ id: 'medigel', chance: 0.2, n: 1 }],
  },
  // the drones battering the reactor-control shutters: light frames built for ramming
  pro_drone_ram: {
    kind: 'pro_drone_ram', name: 'Ram-Drone', art: 'drone', tint: '#ffc9a8', ...statLine(3, 'swarm'), shield: 2,
    weaknesses: ['rifle', 'lance', 'volt'], actions: DRONE_ACTIONS, drops: [{ id: 'medigel', chance: 0.3, n: 1 }],
  },
  pro_crawler: {
    kind: 'pro_crawler', name: 'Hull Crawler', art: 'crawler', ...statLine(4, 'brute'), shield: 4,
    weaknesses: ['blade', 'gauntlet', 'thermal', 'cryo'], actions: CRAWLER_ACTIONS,
    drops: [{ id: 'medigel', chance: 0.3, n: 1 }, { id: 'ether', chance: 0.15, n: 1 }],
  },
  pro_turret: {
    kind: 'pro_turret', name: 'Aegis Turret', art: 'turret', ...statLine(5, 'armored'), shield: 5,
    weaknesses: ['lance', 'gauntlet', 'cryo', 'void'], actions: TURRET_ACTIONS, drops: [{ id: 'ether', chance: 0.3, n: 1 }],
  },
  sentinel_mk1: {
    kind: 'sentinel_mk1', name: 'Sentinel Mk-I', art: 'sentinel_mk1', ...statLine(6, 'brute'), shield: 4,
    weaknesses: ['rifle', 'volt', 'photon'], actions: MK1_ACTIONS, drops: [{ id: 'ether', chance: 0.25, n: 1 }],
  },
  pro_sentinel: {
    kind: 'pro_sentinel', name: 'SENTINEL', art: 'sentinel', ai: 'sentinel', boss: true, ...statLine(7, 'boss'),
    shield: 6, maxShieldCap: 12, actionsPerRound: 2,
    weaknesses: ['lance', 'rifle', 'volt', 'photon'], actions: SENTINEL_ACTIONS, drops: [{ id: 'revive', chance: 1, n: 1 }],
  },
  // after WARDEN speaks (ch1) the Halcyon's patrols tighten their hold: tougher variants
  pro_patrol_mk1: {
    kind: 'pro_patrol_mk1', name: 'Sentinel Mk-I', art: 'sentinel_mk1', tint: '#ffe4c8', ...statLine(14, 'brute'), shield: 5,
    weaknesses: ['rifle', 'volt', 'photon'], actions: MK1_ACTIONS, drops: [{ id: 'ether_plus', chance: 0.2, n: 1 }],
  },
  pro_patrol_drone: {
    kind: 'pro_patrol_drone', name: 'Patrol Drone', art: 'drone', tint: '#ffd27a', ...statLine(13, 'standard'), shield: 4,
    weaknesses: ['rifle', 'lance', 'volt'], actions: DRONE_ACTIONS, drops: [{ id: 'medigel_plus', chance: 0.2, n: 1 }],
  },
  // ---- M3: a rare launch-day parade drone (Engineering) and the crawler Nyx rigged to guard her stash (berth)
  pro_parade_drone: {
    kind: 'pro_parade_drone', name: 'Parade Drone', art: 'drone', tint: '#ffe08a', ...statLine(4, 'swarm'), shield: 2,
    weaknesses: ['rifle', 'lance', 'volt'], xp: 90, credits: 420,
    actions: [{ id: 'confetti_flare', name: 'Confetti Flare', kind: 'attack', power: 0.6, type: 'photon', target: 'one', anim: 'enemyShot',
      weight: 100, desc: 'Launch-day fireworks. Still loaded.' }],
    drops: [{ id: 'medigel_plus', chance: 0.6, n: 1 }, { id: 'ether', chance: 0.6, n: 1 }],
  },
  pro_rigged_crawler: {
    kind: 'pro_rigged_crawler', name: 'Rigged Crawler', art: 'crawler', tint: '#ffcf6a', boss: true, ai: 'basic',
    ...statLine(8, 'elite'), shield: 6, maxShieldCap: 10, weaknesses: ['volt', 'cryo', 'gauntlet'],
    stage: { scale: 1.3 },
    actions: [
      { id: 'rigged_bite', name: 'Vice Bite', kind: 'attack', power: 1.35, type: 'blade', target: 'one', anim: 'enemyMelee', weight: 55,
        desc: 'Mandibles welded into a vice. Someone was proud of that.' },
      { id: 'rigged_toss', name: 'Salvage Toss', kind: 'attack', power: 0.7, type: 'gauntlet', target: 'all', anim: 'enemySpit', weight: 30, cooldown: 1,
        desc: 'Throws salvage. At everyone.' },
      { id: 'rigged_brace', name: 'Brace', kind: 'buff', power: 0, type: null, target: 'self', anim: 'enemyCharge', weight: 15,
        effect: { stats: ['def'], stage: 1, turns: 3 }, desc: 'Locks its legs to the deck. Raises DEF.' },
    ],
    drops: [{ id: 'eq_x_power_band', chance: 1, n: 1 }, { id: 'medigel_plus', chance: 1, n: 1 }],
  },
};

const enc = (id, list, backdrop, extra = {}) => ({ id, enemies: list, backdrop, boss: false, canFlee: true, music: 'battle', ...extra });

const encounters = {
  // ---- scripted
  pro_tutorial: enc('pro_tutorial', ['pro_drone_glitch'], 'cryo', { canFlee: false }),
  pro_orion_rescue: enc('pro_orion_rescue', ['pro_drone_ram', 'pro_drone_ram', 'pro_drone_ram'], 'engineering', { canFlee: false, tips: [TIP_SERA] }),
  pro_sentinel_squad: enc('pro_sentinel_squad', ['sentinel_mk1', 'pro_drone', 'sentinel_mk1'], 'corridor', { canFlee: false, tips: [TIP_NYX] }),
  pro_boss_sentinel: {
    id: 'pro_boss_sentinel', enemies: ['pro_sentinel'], backdrop: 'bridge', boss: true, canFlee: false, music: 'boss',
    intro: { title: 'SENTINEL', subtitle: 'Bridge Guardian', lines: [{ speaker: 'SENTINEL', text: 'NONCOMPLIANCE LOGGED. I AM SORRY.' }] },
    outro: { lines: [{ speaker: 'SENTINEL', text: 'PLEASE... RETURN... TO YOUR...' }] },
  },
  // ---- Spine Corridor (Kade and Sera)
  pro_c_drone: enc('pro_c_drone', ['pro_drone'], 'corridor', { tips: [TIP_SERA] }),
  pro_c_drones: enc('pro_c_drones', ['pro_drone', 'pro_drone'], 'corridor', { tips: [TIP_SERA] }),
  pro_c_crawler: enc('pro_c_crawler', ['pro_crawler'], 'corridor', { tips: [TIP_SERA] }),
  pro_c_mixed: enc('pro_c_mixed', ['pro_drone', 'pro_crawler'], 'corridor', { tips: [TIP_SERA] }),
  // ---- Engineering and the corridor once Orion leads the way (three or four travelers)
  pro_e_pair: enc('pro_e_pair', ['pro_crawler', 'pro_drone'], 'engineering', { tips: [TIP_ORION] }),
  pro_e_crawlers: enc('pro_e_crawlers', ['pro_crawler', 'pro_crawler'], 'engineering', { tips: [TIP_ORION] }),
  pro_e_turret: enc('pro_e_turret', ['pro_drone', 'pro_turret', 'pro_drone'], 'engineering', { tips: [TIP_ORION] }),
  pro_e_patrol: enc('pro_e_patrol', ['sentinel_mk1', 'pro_drone'], 'engineering', { tips: [TIP_ORION] }),
  // ---- the late patrols (from ch1, after WARDEN speaks)
  pro_l_mk1: enc('pro_l_mk1', ['pro_patrol_mk1'], 'corridor'),
  pro_l_pair: enc('pro_l_pair', ['pro_patrol_mk1', 'pro_patrol_drone'], 'corridor'),
  pro_l_drones: enc('pro_l_drones', ['pro_patrol_drone', 'pro_patrol_drone', 'pro_patrol_drone'], 'engineering'),
  pro_l_squad: enc('pro_l_squad', ['pro_patrol_drone', 'pro_patrol_mk1', 'pro_patrol_drone'], 'engineering'),
  // ---- M3: the rare parade drone, the optional elite
  pro_e_parade: enc('pro_e_parade', ['pro_parade_drone', 'pro_drone'], 'engineering'),
  pro_elite_crawler: {
    id: 'pro_elite_crawler', enemies: ['pro_rigged_crawler'], backdrop: 'corridor', boss: true, canFlee: false, music: 'boss',
    intro: { title: 'RIGGED CRAWLER', subtitle: 'Elite' },
  },
};

export default {
  enemies,
  encounters,
  zones: {
    pro_corridor: ['pro_c_drone', 'pro_c_drones', 'pro_c_crawler', 'pro_c_mixed', 'pro_c_drones'],
    // the parade drone is one roll in nine
    pro_engineering: ['pro_e_pair', 'pro_e_pair', 'pro_e_crawlers', 'pro_e_crawlers', 'pro_e_turret', 'pro_e_turret',
      'pro_e_patrol', 'pro_e_patrol', 'pro_e_parade'],
    pro_late: ['pro_l_mk1', 'pro_l_pair', 'pro_l_drones', 'pro_l_squad'],
  },
};
