// common: shared battle and economy data (PURE, TECH_PLAN 2.3, 5.5-5.7). Items, equipment, the
// jumpTo starter kits per chapter and the Halcyon `fabricator` shop. Owned by S3 in Wave S, then
// by C10 (names, stats and prices are C10's to tune; the ids are binding).
//
// Gear has personality (5.5): every tier 3-4 weapon and every accessory carries exactly one effect
// (boost, resist, immune, ailmentResist, startBp or encounterRate) and no two of them in the same
// slot share an effect signature (tests/progression.test.mjs). The four dream keepsakes share their
// sleep guard by design and differ in their stat.

const consumable = (id, name, desc, price, effect, target = 'ally', extra = {}) => ({
  id, name, desc, target, battle: true, key: false, price, effect, ...extra,
});
const keyItem = (id, name, desc) => ({ id, name, desc, target: null, battle: false, key: true, effect: {}, icon: 'key' });

// equip: { slot, for?, stats, ...one effect }. Weapons list their owner; armor and accessories fit anyone.
const gear = (id, name, desc, price, equip) => ({
  id, name, desc, target: null, battle: false, key: false, price, icon: equip.slot, effect: {},
  equip: { stats: {}, ...equip },
});
// A weapon's icon is its damage type (blade, rifle, gauntlet, lance), not the slot's sword.
const weapon = (id, name, desc, price, owner, type, stats, effect = {}) => ({
  ...gear(id, name, desc, price, { slot: 'weapon', for: [owner], stats, ...effect }), icon: type,
});
const armor = (id, name, desc, price, stats) => gear(id, name, desc, price, { slot: 'armor', stats });
const accessory = (id, name, desc, price, stats, effect) => gear(id, name, desc, price, { slot: 'accessory', stats, ...effect });

const items = {
  // ---- consumables (5.7); the POC medigel, ether and revive live in battle/data.js
  medigel_plus: consumable('medigel_plus', 'Medi-Gel+', 'Concentrated sealant. Restores 600 HP to one ally.', 160, { heal: 600 }),
  medigel_max: consumable('medigel_max', 'Medi-Gel Max', 'Surgical-grade gel. Fully restores one ally\'s HP.', 420, { heal: 9999 }),
  nanomist: consumable('nanomist', 'Nanomist', 'A cloud of medical nanites. Restores 400 HP to all allies.', 380, { heal: 400 }, 'allies'),
  ether_plus: consumable('ether_plus', 'Ether Cell+', 'High-density cell. Restores 150 EP to one ally.', 260, { ep: 150 }),
  revive_plus: consumable('revive_plus', 'Revive Kit+', 'Full restart sequence. Revives a downed ally with full HP.', 620, { revive: 1 }, 'koAlly'),
  stim: consumable('stim', 'Stim', 'Adrenal spike. Wakes a sleeping ally and clears a jam.', 70, { cleanse: ['sleep', 'jam'] }),
  thermal_charge: consumable('thermal_charge', 'Thermal Charge', 'Plasma grenade. Fixed thermal damage to one foe.', 140,
    { damage: { amount: 420, type: 'thermal' } }, 'enemy', { icon: 'thermal' }),
  cryo_charge: consumable('cryo_charge', 'Cryo Charge', 'Flash-freeze canister. Fixed cryo damage to one foe.', 140,
    { damage: { amount: 420, type: 'cryo' } }, 'enemy', { icon: 'cryo' }),
  volt_charge: consumable('volt_charge', 'Volt Charge', 'Capacitor bomb. Fixed volt damage to one foe.', 140,
    { damage: { amount: 420, type: 'volt' } }, 'enemy', { icon: 'volt' }),
  photon_charge: consumable('photon_charge', 'Photon Charge', 'Hard-light flare. Fixed photon damage to one foe.', 140,
    { damage: { amount: 420, type: 'photon' } }, 'enemy', { icon: 'photon' }),
  void_charge: consumable('void_charge', 'Void Charge', 'A pocket of folded space. Fixed void damage to one foe.', 180,
    { damage: { amount: 420, type: 'void' } }, 'enemy', { icon: 'void' }),

  // ---- key items
  lattice_coil: keyItem('lattice_coil', 'Lattice Coil', 'The Meridian\'s jump-drive coil. Still cold to the touch.'),
  command_key: keyItem('command_key', 'Command Key', 'Commander Voss\'s key. Opens the AI core antechamber.'),

  // ---- weapons: tier 1 (starting kits), tier 2 (shops, ch1), tier 3-4 (one effect each)
  eq_w_kade_1: weapon('eq_w_kade_1', 'Service Blade', 'Security Corps issue. Reliable, unremarkable.', 100, 'kade', 'blade', { atk: 6 }),
  eq_w_nyx_1: weapon('eq_w_nyx_1', 'Salvage Carbine', 'Ringborn scrap, rebuilt three times. Shoots straight.', 100, 'nyx', 'rifle', { atk: 5, spd: 2 }),
  eq_w_orion_1: weapon('eq_w_orion_1', 'Field Gauntlet', 'A maintenance glove with a capacitor sewn in.', 100, 'orion', 'gauntlet', { atk: 2, mag: 6 }),
  eq_w_sera_1: weapon('eq_w_sera_1', 'Medic\'s Lance', 'A defibrillator staff with a sharpened tip.', 100, 'sera', 'lance', { atk: 3, mag: 4 }),
  eq_w_kade_2: weapon('eq_w_kade_2', 'Arc Saber', 'A ring-forged blade with a live arc in the edge.', 460, 'kade', 'blade', { atk: 14 }),
  eq_w_nyx_2: weapon('eq_w_nyx_2', 'Ring Rifle', 'Long barrel, iced sights. Ruse swears it is legal.', 460, 'nyx', 'rifle', { atk: 12, spd: 3 }),
  eq_w_orion_2: weapon('eq_w_orion_2', 'Coil Gauntlet', 'Fabricated from a spare reactor coil. Hums politely.', 460, 'orion', 'gauntlet', { atk: 4, mag: 14 }),
  eq_w_sera_2: weapon('eq_w_sera_2', 'Lumen Lance', 'Its tip glows the colour of a clean bill of health.', 460, 'sera', 'lance', { atk: 6, mag: 11 }),
  eq_w_kade_3: weapon('eq_w_kade_3', 'Ringforged Lance', 'Ringborn smiths folded wreck steel into it. Lance damage +12%.', 1300,
    'kade', 'lance', { atk: 24 }, { boost: { lance: 0.12 } }),
  eq_w_nyx_3: weapon('eq_w_nyx_3', 'Varo\'s Long Gun', 'Captain Ines Varo\'s rifle, eighty years cold. Rifle damage +12%.', 1800,
    'nyx', 'rifle', { atk: 22, spd: 4 }, { boost: { rifle: 0.12 } }),
  eq_w_orion_3: weapon('eq_w_orion_3', 'Lattice Fist', 'Built around a sliver of the lattice coil. Cryo damage +12%.', 1300,
    'orion', 'gauntlet', { atk: 6, mag: 24 }, { boost: { cryo: 0.12 } }),
  eq_w_sera_3: weapon('eq_w_sera_3', 'Seedling Spear', 'Grown, not forged, in the Arboretum. Photon damage +12%.', 1300,
    'sera', 'lance', { atk: 10, mag: 20 }, { boost: { photon: 0.12 } }),
  eq_w_kade_4: weapon('eq_w_kade_4', 'Oathkeeper', 'The blade he was sworn in with. Volt damage +15%.', 2600,
    'kade', 'blade', { atk: 36 }, { boost: { volt: 0.15 } }),
  eq_w_nyx_4: weapon('eq_w_nyx_4', 'Horizon Rifle', 'Fires rounds that never quite arrive. Void damage +15%.', 2600,
    'nyx', 'rifle', { atk: 33, spd: 5 }, { boost: { void: 0.15 } }),
  eq_w_orion_4: weapon('eq_w_orion_4', 'Empathy Engine', 'A gauntlet that feels the heat it makes. Thermal damage +15%.', 2600,
    'orion', 'gauntlet', { atk: 8, mag: 36 }, { boost: { thermal: 0.15 } }),
  eq_w_sera_4: weapon('eq_w_sera_4', 'Dawnspear', 'It wakes whoever carries it. Halves the chance of sleep.', 2600,
    'sera', 'lance', { atk: 14, mag: 32 }, { ailmentResist: { sleep: 0.5 } }),

  // ---- armor (anyone)
  eq_a_1: armor('eq_a_1', 'Crew Jumpsuit', 'Standard wake-crew coveralls. Many pockets.', 80, { def: 4, res: 4, maxHp: 20 }),
  eq_a_2: armor('eq_a_2', 'Pressure Suit', 'Rated for hard vacuum and soft landings.', 420, { def: 10, res: 8, maxHp: 60 }),
  eq_a_3: armor('eq_a_3', 'Ringborn Weave', 'Layered salvage cloth, patched with prayer ribbon.', 1200, { def: 18, res: 16, maxHp: 120 }),
  eq_a_4: armor('eq_a_4', 'Security Plate', 'Halcyon Security armor. Still smells of the armory.', 2200, { def: 28, res: 20, maxHp: 200 }),
  eq_a_5: armor('eq_a_5', 'Choir Mantle', 'Woven from the Choir\'s light. Warm, and very quiet.', 3200, { def: 34, res: 34, maxHp: 260 }),

  // ---- accessories (anyone; one effect each)
  eq_x_stim_chip: accessory('eq_x_stim_chip', 'Stimulus Chip', 'A combat stim on a timer. Start battles with +1 BP.', 600, {}, { startBp: 1 }),
  eq_x_swift_band: accessory('eq_x_swift_band', 'Swift Band', 'Servo-assisted reflexes. SPD up; cannot be marked.', 520, { spd: 6 }, { immune: ['marked'] }),
  eq_x_power_band: accessory('eq_x_power_band', 'Power Band', 'A grip amplifier. ATK up; blade damage +10%.', 600, { atk: 8 }, { boost: { blade: 0.1 } }),
  eq_x_focus_lens: accessory('eq_x_focus_lens', 'Focus Lens', 'Bends light to a point. MAG up; thermal damage +10%.', 600, { mag: 8 }, { boost: { thermal: 0.1 } }),
  eq_x_varo_compass: accessory('eq_x_varo_compass', 'Varo\'s Compass', 'It still points at the Meridian. Rifle damage +15%.', 900, { spd: 3 }, { boost: { rifle: 0.15 } }),
  eq_x_frost_charm: accessory('eq_x_frost_charm', 'Frost Charm', 'A Ringborn charm of blue ice. Cryo damage taken -30%.', 700, { res: 5 }, { resist: { cryo: 0.3 } }),
  eq_x_ghost_signal: accessory('eq_x_ghost_signal', 'Ghost Signal', 'Spoofs drone sensors. Halves random encounters.', 1000, {}, { encounterRate: 0.5 }),
  eq_x_ember_charm: accessory('eq_x_ember_charm', 'Ember Charm', 'A seed that never stopped smouldering. Thermal damage taken -30%.', 900, { res: 6 }, { resist: { thermal: 0.3 } }),
  eq_x_photon_prism: accessory('eq_x_photon_prism', 'Photon Prism', 'Splits dome light into spears. Photon damage +15%.', 1100, { mag: 10 }, { boost: { photon: 0.15 } }),
  eq_x_ground_coil: accessory('eq_x_ground_coil', 'Ground Coil', 'Bleeds charge into the deck. Volt damage taken -30%.', 1100, { def: 6 }, { resist: { volt: 0.3 } }),
  eq_x_vital_core: accessory('eq_x_vital_core', 'Vital Core', 'A trauma-rated chest core. Max HP up; rifle damage taken -20%.', 1400, { maxHp: 180 }, { resist: { rifle: 0.2 } }),
  eq_x_null_ward: accessory('eq_x_null_ward', 'Null Ward', 'Holds a small, stubborn emptiness. Void damage taken -30%.', 1500, { res: 10 }, { resist: { void: 0.3 } }),
  eq_x_ether_core: accessory('eq_x_ether_core', 'Ether Core', 'A sealed power reserve. Max EP up; immune to jam.', 1500, { maxEp: 30 }, { immune: ['jam'] }),
  eq_x_lullaby_ward: accessory('eq_x_lullaby_ward', 'Lullaby Ward', 'Hums a counter-melody. Immune to sleep.', 2000, { res: 8 }, { immune: ['sleep'] }),
  eq_x_keepsake_kade: accessory('eq_x_keepsake_kade', 'Voss\'s Insignia', 'Her rank pin. It does not ask him to sleep.', 0, { atk: 10 }, { ailmentResist: { sleep: 0.5 } }),
  eq_x_keepsake_nyx: accessory('eq_x_keepsake_nyx', 'Meridian Ribbon', 'A prayer ribbon from the wreck. It flutters awake.', 0, { spd: 10 }, { ailmentResist: { sleep: 0.5 } }),
  eq_x_keepsake_orion: accessory('eq_x_keepsake_orion', 'Lullaby Score', 'The song he taught her, annotated. It keeps him awake.', 0, { mag: 10 }, { ailmentResist: { sleep: 0.5 } }),
  eq_x_keepsake_sera: accessory('eq_x_keepsake_sera', 'Theo\'s Drawing', 'Two stick figures and a sun. Proof he will wake.', 0, { maxHp: 150 }, { ailmentResist: { sleep: 0.5 } }),
  eq_x_ice_heart: accessory('eq_x_ice_heart', 'Ice Heart', 'The rime golem\'s frozen core. Cryo damage +15%.', 1200, { def: 8 }, { boost: { cryo: 0.15 } }),
  eq_x_bloom_crown: accessory('eq_x_bloom_crown', 'Bloom Crown', 'Thorns that point the way. Lance damage +15%.', 1600, { mag: 8 }, { boost: { lance: 0.15 } }),
  eq_x_sentinel_core: accessory('eq_x_sentinel_core', 'Sentinel Core', 'A Mk-III heart, still charged. Volt damage +15%.', 2000, { atk: 10 }, { boost: { volt: 0.15 } }),
  eq_x_glitch_lens: accessory('eq_x_glitch_lens', 'Glitch Lens', 'Sees the seams in things. Void damage +15%.', 2400, { mag: 12 }, { boost: { void: 0.15 } }),
  eq_x_choir_bell: accessory('eq_x_choir_bell', 'Choir Bell', 'Rings with the sleepers\' light. Photon damage taken -30%.', 2800, { res: 12 }, { resist: { photon: 0.3 } }),
};

// Starting gear of each traveler (core/state.js joinParty gives a new member these).
const TIER1 = {
  kade: { weapon: 'eq_w_kade_1', armor: 'eq_a_1', accessory: null },
  nyx: { weapon: 'eq_w_nyx_1', armor: 'eq_a_1', accessory: null },
  orion: { weapon: 'eq_w_orion_1', armor: 'eq_a_1', accessory: null },
  sera: { weapon: 'eq_w_sera_1', armor: 'eq_a_1', accessory: null },
};
const outfit = (armorId, gearByMember) => Object.fromEntries(Object.entries(gearByMember)
  .map(([id, [weaponId, accessoryId]]) => [id, { weapon: weaponId, armor: armorId, accessory: accessoryId }]));
const withArmor = (member, armorId, equip) => ({ ...equip, [member]: { ...equip[member], armor: armorId } });

// jumpTo starter kits (10.1): what a player following the critical path holds when the chapter starts.
// ch1 to the finale match how tests/campaign.mjs's route ends the chapter before (`npm run balance
// -- --verbose` prints kit and route side by side, and the route as a kit); the epilogue is first-pass.
const kits = {
  prologue: { equip: TIER1, items: { medigel: 3, ether: 1, revive: 1 }, credits: 0 },
  ch1: {
    equip: { ...TIER1, kade: { ...TIER1.kade, accessory: 'eq_x_stim_chip' } },
    items: { medigel: 4, ether: 4, revive: 1, stim: 2 }, credits: 1250,
  },
  ch2: {
    equip: outfit('eq_a_2', {
      kade: ['eq_w_kade_2', 'eq_x_stim_chip'], nyx: ['eq_w_nyx_3', 'eq_x_varo_compass'],
      orion: ['eq_w_orion_2', null], sera: ['eq_w_sera_2', 'eq_x_frost_charm'],
    }),
    items: { medigel: 5, medigel_plus: 2, ether: 4, ether_plus: 1, revive: 2, stim: 4, cryo_charge: 2 }, credits: 300,
  },
  ch3: {
    equip: outfit('eq_a_2', {
      kade: ['eq_w_kade_2', 'eq_x_stim_chip'], nyx: ['eq_w_nyx_3', 'eq_x_varo_compass'],
      orion: ['eq_w_orion_2', 'eq_x_ember_charm'], sera: ['eq_w_sera_3', 'eq_x_photon_prism'],
    }),
    items: { medigel: 2, medigel_plus: 1, ether: 2, ether_plus: 4, revive: 1, stim: 2, cryo_charge: 2, thermal_charge: 2 },
    credits: 4400,
  },
  ch4: {
    equip: withArmor('kade', 'eq_a_4', outfit('eq_a_2', {
      kade: ['eq_w_kade_4', 'eq_x_vital_core'], nyx: ['eq_w_nyx_3', 'eq_x_varo_compass'],
      orion: ['eq_w_orion_3', 'eq_x_stim_chip'], sera: ['eq_w_sera_3', 'eq_x_photon_prism'],
    })),
    items: {
      medigel: 2, medigel_plus: 3, ether: 1, ether_plus: 3, revive: 2, stim: 5, nanomist: 1,
      cryo_charge: 2, thermal_charge: 2, volt_charge: 2,
    },
    credits: 5700,
  },
  finale: {
    equip: withArmor('nyx', 'eq_a_2', outfit('eq_a_4', {
      kade: ['eq_w_kade_4', 'eq_x_vital_core'], nyx: ['eq_w_nyx_4', 'eq_x_varo_compass'],
      orion: ['eq_w_orion_4', 'eq_x_ether_core'], sera: ['eq_w_sera_3', 'eq_x_photon_prism'],
    })),
    items: {
      medigel: 1, medigel_plus: 1, medigel_max: 1, ether: 1, ether_plus: 3, revive: 1, revive_plus: 1, stim: 7,
      nanomist: 1, cryo_charge: 2, thermal_charge: 2, volt_charge: 2,
    },
    credits: 7400,
  },
  epilogue: {
    equip: outfit('eq_a_5', {
      kade: ['eq_w_kade_4', 'eq_x_keepsake_kade'], nyx: ['eq_w_nyx_4', 'eq_x_keepsake_nyx'],
      orion: ['eq_w_orion_4', 'eq_x_keepsake_orion'], sera: ['eq_w_sera_4', 'eq_x_keepsake_sera'],
    }),
    items: { medigel_plus: 3, ether_plus: 2, revive_plus: 1 }, credits: 2000,
  },
};

// The Halcyon fabricator (antechamber; the interactable is placed by the prologue). Stock grows by chapter.
const shops = {
  fabricator: {
    name: 'Halcyon Fabricator', keeper: 'FABRICATOR', portrait: 'fabricator',
    greeting: 'Fabricator online. Specify your desires. Within reason.',
    sellRate: 0.5,
    stock: [
      { item: 'medigel' },
      { item: 'ether' },
      { item: 'revive' },
      { item: 'stim', when: 'chapter>=ch1' },
      { item: 'eq_w_orion_2', when: 'chapter>=ch1' },
      { item: 'eq_w_sera_2', when: 'chapter>=ch1' },
      { item: 'eq_x_power_band', when: 'chapter>=ch1' },
      { item: 'eq_x_focus_lens', when: 'chapter>=ch1' },
      { item: 'medigel_plus', when: 'chapter>=ch2' },
      { item: 'ether_plus', when: 'chapter>=ch2' },
      { item: 'thermal_charge', when: 'chapter>=ch2' },
      { item: 'cryo_charge', when: 'chapter>=ch2' },
      { item: 'volt_charge', when: 'chapter>=ch3' },
      { item: 'photon_charge', when: 'chapter>=ch3' },
      { item: 'nanomist', when: 'chapter>=ch3' },
      { item: 'revive_plus', when: 'chapter>=ch4' },
      { item: 'void_charge', when: 'chapter>=ch4' },
      { item: 'medigel_max', when: 'chapter>=finale' },
    ],
  },
};

export default { enemies: {}, encounters: {}, zones: {}, items, shops, bossScripts: {}, kits };
