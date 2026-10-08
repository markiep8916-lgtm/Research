// driftmarket: battle and economy data (PURE, TECH_PLAN 2.3). Driftmarket has no battles; it owns
// Old Mother Ruse's shop `ruse` (5.5, 5.6), whose stock grows by chapter: ch1 gear, the Ringborn kit
// from ch2, the Lullaby Ward after ch4.
export default {
  shops: {
    ruse: {
      name: 'Ruse\'s Salvage', keeper: 'RUSE', portrait: 'ruse', greeting: 'Credits first. Questions never.',
      sellRate: 0.5,
      stock: [
        { item: 'medigel' },
        { item: 'ether' },
        { item: 'revive' },
        { item: 'stim' },
        { item: 'eq_w_kade_2', when: 'chapter>=ch1' },
        { item: 'eq_w_nyx_2', when: 'chapter>=ch1' },
        { item: 'eq_a_2', when: 'chapter>=ch1' },
        { item: 'eq_x_swift_band', when: 'chapter>=ch1' },
        { item: 'eq_w_kade_3', when: 'chapter>=ch2' },
        { item: 'eq_w_orion_3', when: 'chapter>=ch2' },
        { item: 'eq_a_3', when: 'chapter>=ch2' },
        { item: 'eq_x_ghost_signal', when: 'chapter>=ch2' },
        { item: 'eq_x_lullaby_ward', when: 'chapter>=finale' },
      ],
    },
  },
};
