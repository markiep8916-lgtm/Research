// Human-pace route of chapter 1's dungeon (tools/human-pace.mjs, G2 T-1): the Shoals, the Meridian
// wreck and its power puzzle, Varo's log, THE MAW. Ported from the G2 design review.
// Chain: ch1 (driftmarket.mjs) -> ch1.shoals -> ch1.wreck -> ch1.maw -> ch1.return (driftmarket.mjs).

export default {
  segments: {
    // the Shoals: grotto chest, Nyx's lockbox, the west cache, down to the Deep Ice and the wreck
    'ch1.shoals': {
      next: 'ch1.wreck',
      async run(d) {
        await d.pump(null, { minVt: 1 });
        d.milestone('shoals');
        await d.use('ledge_view', { optional: true });
        await d.use('grotto', { optional: true });
        await d.use('lockbox', { optional: true });
        await d.use('west_cache', { optional: true });
        await d.use('dm.marble', { optional: true });
        await d.use('deep_rim', { optional: true });
        await d.shot('c03-shoals', { hi: true });
        await d.go(63.8, 35.5, { until: 'window.__PACE.snap().map === "meridian"' });
      },
    },
    // the Meridian: the hold lever, ribbons, the engineering lever, Varo's log, the footlocker
    'ch1.wreck': {
      next: 'ch1.maw',
      async run(d) {
        await d.pump(d.F('seen:meridian:arrival'), { minVt: 1 });
        d.milestone('meridian');
        await d.use('dm.berth_plate', { optional: true });
        await d.use('hold_cache', { optional: true });
        await d.use('lever_a');
        await d.pump();
        await d.journal('journal-ch1-one-lever');
        await d.use('ribbons', { optional: true });
        await d.use('eng_cache', { optional: true });
        await d.use('lever_b');
        await d.pump(d.F('story:meridian_power'));
        d.milestone('power');
        await d.journal('journal-ch1-quarters');
        // Varo's quarters: the log, then her rifle (the footlocker offers "Equip now?")
        await d.use('varo_log');
        await d.pump(d.F('story:varo_log'));
        d.milestone('varo log');
        await d.use('long_gun', { optional: true });
        await d.use('compass', { optional: true });
        // the landing Med-Station, then the reactor hall
        await d.med('med');
        await d.go(46.5, 8.4);
        await d.shot('c05-reactor-hall', { hi: true });
      },
    },
    // THE MAW (Retry after a loss); the aftermath runs driftmarket.return
    'ch1.maw': {
      level: 12,
      next: 'ch1.return',
      async run(d) {
        await d.fightBoss({
          at: [48.5, 7.0], script: 'shoals.maw', done: d.F('story:nyx_for_real'),
          onLoss: async () => { if ((await d.snap()).map === 'meridian') await d.med('med', { talk: false }); },
        });
      },
    },
  },

  plan: {
    ch1: {
      scenes: {
        'shoals.enter': 10, 'shoals.meridian_arrival': 30, 'shoals.power_restored': 12, 'shoals.varo_log': 60, 'shoals.maw': 40,
      },
      bosses: { shoals_boss_maw: 12 },
    },
  },

  legs: [
    {
      chapter: 'ch1', label: 'Shoals: entry -> Meridian exit', map: 'shoals', flags: [],
      points: [[1.4, 5.5], [16.6, 5.5], { fight: 'shoals_eels' }, [36.5, 5.5], [37, 15.5], [11, 18], [10.5, 30], [62.5, 35.5]],
    },
    {
      chapter: 'ch1', label: 'Meridian spine: entry -> hold -> engineering -> quarters -> landing', map: 'meridian', flags: [],
      points: [[1.4, 14.6], [7.5, 12.5], [7.5, 10.5], [7.5, 12.5], [23.5, 16.5], [23.5, 19.5], [23.5, 16.5], [21.5, 12.5],
        [21.5, 10.5], [21.5, 12.5], [43, 12.5], [46.5, 10.5]],
    },
  ],
};
