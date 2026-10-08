// VOIDPATH game data: party, skills, items, enemies, encounters. Pure data, no logic.
// Numbers are tuned with tests/simulate.mjs (heuristic vs random policy, seeded).
//
// The exported tables keep exactly the POC keys (the unit tests pin them, TECH_PLAN 2.8). Content
// enters ENEMIES, ENCOUNTERS, ITEMS and ENCOUNTER_TABLES only at registration (content/registry.js
// merges in place), and content/balance.js applyBalance() mutates BATTLE_RULES, ENEMIES and
// PARTY_DEFS in place. Party skills are not content: every learnset skill and ultimate lives here.

export const DAMAGE_TYPES = ['blade', 'lance', 'rifle', 'gauntlet', 'thermal', 'cryo', 'volt', 'photon', 'void'];
export const PHYSICAL = ['blade', 'lance', 'rifle', 'gauntlet'];
export const ELEMENTAL = ['thermal', 'cryo', 'volt', 'photon', 'void'];

// Party-size scaling and difficulty (TECH_PLAN 5.2). partyScale is indexed by party length: enemy
// max HP and enemy damage multipliers. Four members on Normal are exactly the POC numbers.
export const BATTLE_RULES = {
  partyScale: { hp: [0, 0.45, 0.65, 0.85, 1], dmg: [0, 0.7, 0.82, 0.92, 1] },
  difficulty: { hp: 1, dmg: 1 },
  ultimateBp: 3,       // BP an ultimate costs (it always resolves at Boost 3)
};

// Settings presets for BATTLE_RULES.difficulty (battle/model.js setDifficulty).
export const DIFFICULTY = {
  normal: { hp: 1, dmg: 1 },
  story: { hp: 0.8, dmg: 0.7 },
};

// Ailments: statuses stored in combatant buffs at stage 1 (like taunt).
export const AILMENTS = ['sleep', 'jam', 'marked'];

// Basic-attack animation cue per weapon type.
export const WEAPON_ANIM = { blade: 'slash', lance: 'thrust', rifle: 'shot', gauntlet: 'punch' };

// growth: stat gains per level-up (see core/state.js gainXp).
export const PARTY_DEFS = {
  kade: {
    id: 'kade', name: 'KADE', cls: 'Vanguard', weapons: ['blade', 'lance'], level: 12,
    base: { maxHp: 520, maxEp: 72, atk: 64, def: 56, mag: 30, res: 38, spd: 42 },
    growth: { maxHp: 30, maxEp: 4, atk: 3, def: 3, mag: 1, res: 2, spd: 1 },
    skills: ['arc_slash', 'cross_edge', 'lance_charge', 'provoke'],
    accent: '#ffb54a',
  },
  nyx: {
    id: 'nyx', name: 'NYX', cls: 'Gunslinger', weapons: ['rifle', 'blade'], level: 11,
    base: { maxHp: 410, maxEp: 88, atk: 60, def: 38, mag: 42, res: 40, spd: 66 },
    growth: { maxHp: 22, maxEp: 5, atk: 3, def: 2, mag: 1, res: 2, spd: 2 },
    skills: ['scatter_shot', 'cryo_round', 'void_round', 'expose'],
    accent: '#3fd6d2',
  },
  orion: {
    id: 'orion', name: 'ORION', cls: 'Technomancer', weapons: ['gauntlet'], level: 11,
    base: { maxHp: 360, maxEp: 120, atk: 34, def: 32, mag: 70, res: 54, spd: 50 },
    growth: { maxHp: 20, maxEp: 6, atk: 1, def: 2, mag: 3, res: 2, spd: 1 },
    skills: ['thermal_burst', 'cryo_field', 'volt_chain', 'overclock'],
    accent: '#b98cff',
  },
  sera: {
    id: 'sera', name: 'SERA', cls: 'Medic', weapons: ['lance'], level: 11,
    base: { maxHp: 430, maxEp: 110, atk: 44, def: 42, mag: 58, res: 60, spd: 46 },
    growth: { maxHp: 24, maxEp: 6, atk: 2, def: 2, mag: 2, res: 3, spd: 1 },
    skills: ['nanoheal', 'restore_field', 'photon_lance', 'revive'],
    accent: '#ff7cbd',
  },
};

// Skill fields beyond the contract:
//   scale     'atk' (ATK vs DEF, can crit) | 'mag' (MAG vs RES); attack/heal skills only
//   boostMode 'potency' (x1/1.5/2/2.5) | 'hits' (each boost level adds one hit per target)
//   effect    buff/debuff/taunt: { stats: [...], stage, turns }  (boost adds turns)
//             revive: { revive: fraction of max HP } (boost multiplies it, capped at full)
//             heal kind: { cleanse: true | [stats] } removes ailments and negative stages first;
//             { revive } on a heal also raises KO'd allies in its target set at that fraction
//   ultimate  true: learned from the ult:<member> flag; once per battle, costs EP plus
//             BATTLE_RULES.ultimateBp BP and always resolves at Boost 3 (TECH_PLAN 5.4)
//   fx        bespoke choreography id for the Director (battle/actionfx.js)
export const SKILLS = {
  // KADE: Vanguard
  arc_slash: {
    id: 'arc_slash', name: 'Arc Slash', user: 'kade', cost: 8, type: 'volt', power: 1.55, hits: 1, scale: 'atk',
    target: 'enemy', kind: 'attack', anim: 'slash', boostMode: 'potency',
    desc: 'A blade wreathed in arc current. Volt damage to one foe.',
  },
  cross_edge: {
    id: 'cross_edge', name: 'Cross Edge', user: 'kade', cost: 10, type: 'blade', power: 0.85, hits: 2, scale: 'atk',
    target: 'enemy', kind: 'attack', anim: 'slash', boostMode: 'hits',
    desc: 'Two crossing cuts. Boost adds more cuts.',
  },
  lance_charge: {
    id: 'lance_charge', name: 'Lance Charge', user: 'kade', cost: 16, type: 'lance', power: 2.3, hits: 1, scale: 'atk',
    target: 'enemy', kind: 'attack', anim: 'thrust', boostMode: 'potency',
    desc: 'Thruster-driven lunge. Heavy lance damage to one foe.',
  },
  provoke: {
    id: 'provoke', name: 'Provoke', user: 'kade', cost: 6, type: null, power: 0, hits: 0,
    target: 'self', kind: 'taunt', anim: 'buff', effect: { stats: ['taunt'], stage: 1, turns: 2 },
    desc: 'Draws single-target fire onto KADE. Boost lasts longer.',
  },

  // NYX: Gunslinger
  scatter_shot: {
    id: 'scatter_shot', name: 'Scatter Shot', user: 'nyx', cost: 12, type: 'rifle', power: 0.6, hits: 2, scale: 'atk',
    target: 'enemies', kind: 'attack', anim: 'shot', boostMode: 'potency',
    desc: 'Fans a double burst across every foe. Rifle damage.',
  },
  cryo_round: {
    id: 'cryo_round', name: 'Cryo Round', user: 'nyx', cost: 9, type: 'cryo', power: 1.75, hits: 1, scale: 'atk',
    target: 'enemy', kind: 'attack', anim: 'shot', boostMode: 'potency',
    desc: 'Supercooled slug. Cryo damage to one foe.',
  },
  void_round: {
    id: 'void_round', name: 'Void Round', user: 'nyx', cost: 12, type: 'void', power: 1.95, hits: 1, scale: 'atk',
    target: 'enemy', kind: 'attack', anim: 'shot', boostMode: 'potency',
    desc: 'A round that folds space on impact. Void damage to one foe.',
  },
  expose: {
    id: 'expose', name: 'Expose', user: 'nyx', cost: 10, type: null, power: 0, hits: 0,
    target: 'enemy', kind: 'debuff', anim: 'shot', effect: { stats: ['def', 'res'], stage: -1, turns: 3 },
    desc: 'Tags armor seams. Lowers a foe\'s DEF and RES.',
  },

  // ORION: Technomancer
  thermal_burst: {
    id: 'thermal_burst', name: 'Thermal Burst', user: 'orion', cost: 10, type: 'thermal', power: 2.0, hits: 1, scale: 'mag',
    target: 'enemy', kind: 'attack', anim: 'cast', boostMode: 'potency',
    desc: 'Detonates a plasma bloom. Thermal damage to one foe.',
  },
  cryo_field: {
    id: 'cryo_field', name: 'Cryo Field', user: 'orion', cost: 18, type: 'cryo', power: 1.1, hits: 1, scale: 'mag',
    target: 'enemies', kind: 'attack', anim: 'cast', boostMode: 'potency',
    desc: 'Flash-freezes the field. Cryo damage to all foes.',
  },
  volt_chain: {
    id: 'volt_chain', name: 'Volt Chain', user: 'orion', cost: 20, type: 'volt', power: 0.62, hits: 2, scale: 'mag',
    target: 'enemies', kind: 'attack', anim: 'cast', boostMode: 'potency',
    desc: 'Lightning arcs twice through every foe. Volt damage.',
  },
  overclock: {
    id: 'overclock', name: 'Overclock', user: 'orion', cost: 14, type: null, power: 0, hits: 0,
    target: 'ally', kind: 'buff', anim: 'buff', effect: { stats: ['atk', 'mag'], stage: 1, turns: 3 },
    desc: 'Overdrives an ally\'s systems. Raises ATK and MAG.',
  },

  // SERA: Medic
  nanoheal: {
    id: 'nanoheal', name: 'Nanoheal', user: 'sera', cost: 8, type: null, power: 1.3, hits: 0, scale: 'mag',
    target: 'ally', kind: 'heal', anim: 'heal', boostMode: 'potency',
    desc: 'A swarm of medical nanites. Restores one ally\'s HP.',
  },
  restore_field: {
    id: 'restore_field', name: 'Restore Field', user: 'sera', cost: 20, type: null, power: 0.8, hits: 0, scale: 'mag',
    target: 'allies', kind: 'heal', anim: 'heal', boostMode: 'potency',
    desc: 'A healing lattice over the squad. Restores all allies\' HP.',
  },
  photon_lance: {
    id: 'photon_lance', name: 'Photon Lance', user: 'sera', cost: 10, type: 'photon', power: 1.9, hits: 1, scale: 'mag',
    target: 'enemy', kind: 'attack', anim: 'thrust', boostMode: 'potency',
    desc: 'A spear of hard light. Photon damage to one foe.',
  },
  revive: {
    id: 'revive', name: 'Revive', user: 'sera', cost: 24, type: null, power: 0, hits: 0,
    target: 'koAlly', kind: 'revive', anim: 'heal', boostMode: 'potency', effect: { revive: 0.3 },
    desc: 'Defibrillator pulse. Revives a downed ally. Boost restores more HP.',
  },

  // ---- learnset skills (core/progression.js LEARNSETS, TECH_PLAN 5.4)
  // KADE
  rally: {
    id: 'rally', name: 'Rally', user: 'kade', cost: 18, type: null, power: 0, hits: 0,
    target: 'allies', kind: 'buff', anim: 'buff', effect: { stats: ['atk'], stage: 1, turns: 3 },
    desc: 'A lieutenant\'s battle cry. Raises every ally\'s ATK.',
  },
  storm_lance: {
    id: 'storm_lance', name: 'Storm Lance', user: 'kade', cost: 26, type: 'volt', power: 1.0, hits: 1, scale: 'atk',
    target: 'enemies', kind: 'attack', anim: 'thrust', boostMode: 'potency',
    desc: 'Lightning rides the lance. Volt damage to all foes.',
  },
  aegis_stance: {
    id: 'aegis_stance', name: 'Aegis Stance', user: 'kade', cost: 16, type: null, power: 0, hits: 0,
    target: 'self', kind: 'taunt', anim: 'buff', effect: { stats: ['taunt', 'def', 'res'], stage: 2, turns: 2 },
    desc: 'Plants his feet. Draws fire and sharply raises DEF and RES.',
  },
  thunder_rend: {
    id: 'thunder_rend', name: 'Thunder Rend', user: 'kade', cost: 30, type: 'blade', power: 0.9, hits: 3, scale: 'atk',
    target: 'enemy', kind: 'attack', anim: 'slash', boostMode: 'hits',
    desc: 'Three thunderous cuts. Boost adds more cuts.',
  },
  skyfall: {
    id: 'skyfall', name: 'Skyfall', user: 'kade', cost: 44, type: 'lance', power: 1.6, hits: 1, scale: 'atk',
    target: 'enemies', kind: 'attack', anim: 'thrust', boostMode: 'potency',
    desc: 'A thruster leap and a falling strike. Heavy lance damage to all.',
  },
  // NYX
  quickdraw: {
    id: 'quickdraw', name: 'Quickdraw', user: 'nyx', cost: 20, type: 'rifle', power: 0.55, hits: 4, scale: 'atk',
    target: 'randomEnemies', kind: 'attack', anim: 'shot', boostMode: 'potency',
    desc: 'Four snap shots at random foes. Rifle damage.',
  },
  frost_volley: {
    id: 'frost_volley', name: 'Frost Volley', user: 'nyx', cost: 26, type: 'cryo', power: 1.0, hits: 1, scale: 'atk',
    target: 'enemies', kind: 'attack', anim: 'shot', boostMode: 'potency',
    desc: 'A fan of supercooled slugs. Cryo damage to all foes.',
  },
  dead_eye: {
    id: 'dead_eye', name: 'Dead Eye', user: 'nyx', cost: 28, type: 'rifle', power: 2.8, hits: 1, scale: 'atk',
    target: 'enemy', kind: 'attack', anim: 'shot', boostMode: 'potency',
    desc: 'One breath, one perfect shot. Heavy rifle damage to one foe.',
  },
  event_horizon: {
    id: 'event_horizon', name: 'Event Horizon', user: 'nyx', cost: 40, type: 'void', power: 1.4, hits: 1, scale: 'atk',
    target: 'enemies', kind: 'attack', anim: 'shot', boostMode: 'potency',
    desc: 'Rounds that swallow light. Void damage to all foes.',
  },
  ringbreaker: {
    id: 'ringbreaker', name: 'Ringbreaker', user: 'nyx', cost: 42, type: 'rifle', power: 0.75, hits: 4, scale: 'atk',
    target: 'enemy', kind: 'attack', anim: 'shot', boostMode: 'hits',
    desc: 'Four rounds through one seam. Boost adds more rounds.',
  },
  // ORION
  static_field: {
    id: 'static_field', name: 'Static Field', user: 'orion', cost: 18, type: null, power: 0, hits: 0,
    target: 'enemies', kind: 'debuff', anim: 'cast', effect: { stats: ['spd'], stage: -1, turns: 3 },
    desc: 'Charged static clings to every foe. Lowers their SPD.',
  },
  inferno: {
    id: 'inferno', name: 'Inferno', user: 'orion', cost: 30, type: 'thermal', power: 1.25, hits: 1, scale: 'mag',
    target: 'enemies', kind: 'attack', anim: 'cast', boostMode: 'potency',
    desc: 'A wall of plasma. Thermal damage to all foes.',
  },
  recompile: {
    id: 'recompile', name: 'Recompile', user: 'orion', cost: 26, type: null, power: 0, hits: 0,
    target: 'allies', kind: 'buff', anim: 'buff', effect: { stats: ['mag', 'res'], stage: 1, turns: 3 },
    desc: 'Patches the squad\'s firmware. Raises allies\' MAG and RES.',
  },
  absolute_zero: {
    id: 'absolute_zero', name: 'Absolute Zero', user: 'orion', cost: 34, type: 'cryo', power: 3.0, hits: 1, scale: 'mag',
    target: 'enemy', kind: 'attack', anim: 'cast', boostMode: 'potency',
    desc: 'Every atom stops. Heavy cryo damage to one foe.',
  },
  entropy: {
    id: 'entropy', name: 'Entropy', user: 'orion', cost: 40, type: null, power: 0, hits: 0,
    target: 'enemies', kind: 'debuff', anim: 'cast', effect: { stats: ['atk', 'def', 'res'], stage: -1, turns: 3 },
    desc: 'Everything decays. Lowers every foe\'s ATK, DEF and RES.',
  },
  // SERA
  clarity: {
    id: 'clarity', name: 'Clarity', user: 'sera', cost: 16, type: null, power: 0.35, hits: 0, scale: 'mag',
    target: 'allies', kind: 'heal', anim: 'heal', boostMode: 'potency', effect: { cleanse: true },
    desc: 'Clears the squad\'s heads. Cures ailments and debuffs, small heal.',
  },
  radiant_spear: {
    id: 'radiant_spear', name: 'Radiant Spear', user: 'sera', cost: 28, type: 'photon', power: 1.25, hits: 1, scale: 'mag',
    target: 'enemies', kind: 'attack', anim: 'thrust', boostMode: 'potency',
    desc: 'Hard light rains down. Photon damage to all foes.',
  },
  aegis_field: {
    id: 'aegis_field', name: 'Aegis Field', user: 'sera', cost: 24, type: null, power: 0, hits: 0,
    target: 'allies', kind: 'buff', anim: 'buff', effect: { stats: ['def', 'res'], stage: 1, turns: 3 },
    desc: 'A shimmering ward. Raises allies\' DEF and RES.',
  },
  triage: {
    id: 'triage', name: 'Triage', user: 'sera', cost: 36, type: null, power: 1.4, hits: 0, scale: 'mag',
    target: 'allies', kind: 'heal', anim: 'heal', boostMode: 'potency',
    desc: 'Field triage for the whole squad. Restores a lot of HP.',
  },
  dawnsong: {
    id: 'dawnsong', name: 'Dawnsong', user: 'sera', cost: 40, type: null, power: 1.0, hits: 0, scale: 'mag',
    target: 'allies', kind: 'heal', anim: 'heal', boostMode: 'potency', effect: { cleanse: true },
    desc: 'A song at first light. Heals and cleanses every ally.',
  },

  // ---- ultimates (awakened in each traveler's own boss fight: api.grantUltimate, flag ult:<member>)
  oathblade: {
    id: 'oathblade', name: 'Oathblade', user: 'kade', cost: 30, type: 'volt', power: 3.2, hits: 1, scale: 'atk',
    target: 'enemy', kind: 'attack', anim: 'slash', boostMode: 'potency', ultimate: true, fx: 'ult.oathblade',
    desc: 'An oath, kept. Overwhelming volt damage to one foe.',
  },
  ringfire_barrage: {
    id: 'ringfire_barrage', name: 'Ringfire Barrage', user: 'nyx', cost: 30, type: 'rifle', power: 0.9, hits: 6, scale: 'atk',
    target: 'randomEnemies', kind: 'attack', anim: 'shot', boostMode: 'potency', ultimate: true, fx: 'ult.ringfire_barrage',
    desc: 'Every gun in the Ring answers. Rifle fire on random foes.',
  },
  singularity: {
    id: 'singularity', name: 'Singularity', user: 'orion', cost: 40, type: 'void', power: 2.0, hits: 1, scale: 'mag',
    target: 'enemies', kind: 'attack', anim: 'cast', boostMode: 'potency', ultimate: true, fx: 'ult.singularity',
    desc: 'A star collapses on command. Void damage to all foes.',
  },
  lifebloom: {
    id: 'lifebloom', name: 'Lifebloom', user: 'sera', cost: 40, type: null, power: 1.5, hits: 0, scale: 'mag',
    target: 'allies', kind: 'heal', anim: 'heal', boostMode: 'potency', ultimate: true, fx: 'ult.lifebloom',
    effect: { revive: 0.5, cleanse: true },
    desc: 'Life answers. Revives, heals and cleanses every ally.',
  },
};

// ItemDef fields beyond the POC: price (credits; 0 or absent = not for sale), icon (UI icon name,
// defaults to the id), effect.cleanse, effect.damage { amount, type }, target 'allies' | 'enemy',
// equip (gear, TECH_PLAN 5.5). Content items (src/content/common/data.js) merge in at registration.
export const ITEMS = {
  medigel: {
    id: 'medigel', name: 'Medi-Gel', desc: 'Sealant gel. Restores 200 HP to one ally.',
    target: 'ally', battle: true, key: false, price: 60, effect: { heal: 200 },
  },
  ether: {
    id: 'ether', name: 'Ether Cell', desc: 'Charged power cell. Restores 50 EP to one ally.',
    target: 'ally', battle: true, key: false, price: 90, effect: { ep: 50 },
  },
  revive: {
    id: 'revive', name: 'Revive Kit', desc: 'Emergency restart. Revives a downed ally with half HP.',
    target: 'koAlly', battle: true, key: false, price: 180, effect: { revive: 0.5 },
  },
  keycard: {
    id: 'keycard', name: 'Bridge Keycard', desc: 'Command-level access. Opens the Observation Bridge.',
    target: null, battle: false, key: true, effect: {},
  },
};

// Enemy fields beyond the contract: level; boss-only actionsPerRound and maxShieldCap.
// Enemy action fields beyond the contract:
//   kind   'attack' | 'debuff' | 'buff' | 'lockOn'   (weight 0 = only chosen by scripted boss AI)
//   target also 'self' (buffs)
//   hits   hits per target (default 1)
//   effect { stats, stage, turns } status applied to the targets
export const ENEMIES = {
  drone: {
    kind: 'drone', name: 'Sec-Drone', level: 10, maxHp: 1500, shield: 3, boss: false,
    stats: { atk: 50, def: 30, mag: 64, res: 28, spd: 56 },
    weaknesses: ['rifle', 'lance', 'volt'],
    actions: [
      { id: 'laser_bolt', name: 'Laser Bolt', kind: 'attack', power: 1.1, type: 'thermal', target: 'one', anim: 'enemyShot', weight: 70,
        desc: 'Fires a focused laser bolt.' },
      { id: 'target_lock', name: 'Target Lock', kind: 'debuff', power: 0, type: null, target: 'one', anim: 'enemyBeam', weight: 30,
        effect: { stats: ['def'], stage: -1, turns: 2 }, desc: 'Paints a target. Lowers DEF.' },
    ],
    xp: 45, credits: 30, drops: [{ id: 'medigel', chance: 0.2, n: 1 }],
  },
  crawler: {
    kind: 'crawler', name: 'Hull Crawler', level: 11, maxHp: 2100, shield: 4, boss: false,
    stats: { atk: 68, def: 44, mag: 50, res: 26, spd: 34 },
    weaknesses: ['blade', 'gauntlet', 'thermal', 'cryo'],
    actions: [
      { id: 'rend', name: 'Rend', kind: 'attack', power: 1.25, type: 'blade', target: 'one', anim: 'enemyMelee', weight: 60,
        desc: 'Tears in with cutting mandibles.' },
      { id: 'acid_spit', name: 'Acid Spit', kind: 'attack', power: 0.7, type: 'void', target: 'one', anim: 'enemySpit', weight: 40,
        effect: { stats: ['def'], stage: -1, turns: 2 }, desc: 'Corrosive nanite slurry. Damages and lowers DEF.' },
    ],
    xp: 70, credits: 45, drops: [{ id: 'medigel', chance: 0.3, n: 1 }, { id: 'ether', chance: 0.15, n: 1 }],
  },
  turret: {
    kind: 'turret', name: 'Aegis Turret', level: 12, maxHp: 1900, shield: 5, boss: false,
    stats: { atk: 60, def: 62, mag: 40, res: 34, spd: 26 },
    weaknesses: ['lance', 'gauntlet', 'cryo', 'void'],
    actions: [
      { id: 'suppressive_fire', name: 'Suppressive Fire', kind: 'attack', power: 0.75, type: 'rifle', target: 'all', anim: 'enemyShot', weight: 40,
        desc: 'Sprays the whole squad with fire.' },
      { id: 'piercing_round', name: 'Piercing Round', kind: 'attack', power: 1.5, type: 'rifle', target: 'one', anim: 'enemyShot', weight: 60,
        desc: 'An armor-piercing heavy slug.' },
    ],
    xp: 85, credits: 60, drops: [{ id: 'ether', chance: 0.3, n: 1 }],
  },
  sentinel: {
    kind: 'sentinel', name: 'SENTINEL', level: 16, maxHp: 9500, shield: 6, maxShieldCap: 12, boss: true, actionsPerRound: 2,
    stats: { atk: 77, def: 58, mag: 80, res: 54, spd: 52 },
    weaknesses: ['lance', 'rifle', 'volt', 'photon'],
    actions: [
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
    ],
    xp: 600, credits: 500, drops: [{ id: 'revive', chance: 1, n: 1 }],
  },
};

export const ENCOUNTERS = {
  drone_single: { id: 'drone_single', enemies: ['drone'], backdrop: 'corridor', boss: false, canFlee: true, music: 'battle' },
  drone_pair: { id: 'drone_pair', enemies: ['drone', 'drone'], backdrop: 'corridor', boss: false, canFlee: true, music: 'battle' },
  crawler_drone: { id: 'crawler_drone', enemies: ['crawler', 'drone'], backdrop: 'engineering', boss: false, canFlee: true, music: 'battle' },
  crawler_pair: { id: 'crawler_pair', enemies: ['crawler', 'crawler'], backdrop: 'engineering', boss: false, canFlee: true, music: 'battle' },
  turret_squad: { id: 'turret_squad', enemies: ['drone', 'turret', 'drone'], backdrop: 'engineering', boss: false, canFlee: true, music: 'battle' },
  boss_sentinel: { id: 'boss_sentinel', enemies: ['sentinel'], backdrop: 'bridge', boss: true, canFlee: false, music: 'boss' },
};

// Zone -> encounter ids rolled uniformly (a repeated id is more likely).
export const ENCOUNTER_TABLES = {
  corridor: ['drone_single', 'drone_pair', 'drone_single'],
  engineering: ['crawler_drone', 'crawler_pair', 'turret_squad', 'drone_pair'],
};
