// Human-pace route of chapter 1's Driftmarket parts (tools/human-pace.mjs, G2 T-1): the flight
// from the Halcyon bridge, the town, Ruse and her shop, the inn, out the Shoals hatch; then, after the
// Maw (shoals.mjs), the return, the flight home and the coil install up to the CHAPTER TWO card.
// Ported from the G2 design review. Chain: ch1 -> ch1.shoals (shoals.mjs) ... ch1.return -> ch1.coil -> ch2.

export default {
  segments: {
    ch1: {
      next: 'ch1.shoals',
      async run(d) {
        // a word with HALCYON at her projector, then the Starchart
        await d.use('halcyon', { optional: true });
        await d.fly('starchart', 'Driftmarket');
        await d.pump(d.F('story:ruse_met'), { maxVt: 3600 });
        d.milestone('driftmarket arrival');
        await d.shot('c01-driftmarket', { hi: true });
        // the docks: townsfolk and the suit chest
        for (const id of ['juno', 'marta', 'dock_suit', 'oona', 'harl']) await d.use(id, { optional: true });
        // the Row on the way to Ruse
        for (const id of ['bao', 'pip', 'ama', 'favours', 'sorrel_a', 'sorrel_b']) await d.use(id, { optional: true });
        for (const id of ['rook', 'ilo']) await d.use(id, { optional: true });
        await d.journal('journal-ch1-ask-ruse');
        // Ruse and the Maw, then her stock
        await d.use('ruse', { after: d.F('story:maw_lore') });
        d.milestone('maw lore');
        await d.shopWeapons('ruse_shop');
        d.milestone('shopped');
        // the Beacon: Tobin and the legend of the Lock, the pier cache
        await d.use('tobin', { optional: true });
        await d.use('pier_cache', { optional: true });
        // the inn: rest, Party Talk
        await d.med('inn_rest');
        await d.shot('c02-row', { hi: true });
        // the Shoals hatch at the east end of the Row
        await d.go(59.6, 13.8, { until: 'window.__PACE.snap().map === "shoals"' });
      },
    },
    // back at the docks after the Maw (driftmarket.return plays nested in shoals.maw, or on the jump's load)
    'ch1.return': {
      level: 12,
      next: 'ch1.coil',
      async run(d) {
        await d.pump(d.F('story:nyx_for_real'), { maxVt: 600 });
        d.milestone('maw + return');
        await d.shot('c06-after-return', { hi: true });
        await d.fly('starchart', 'Halcyon');
        d.milestone('halcyon');
      },
    },
    // the coil in the Halcyon's reactor: WARDEN's first words, the CHAPTER TWO card
    'ch1.coil': {
      level: 12,
      next: 'ch2',
      async run(d) {
        if (d.jumped) {
          // walk in from the berth, where the Moth lands
          await d.teleport(40.1, 23.8, 'up');
          d.note("coil install from jumpTo('ch1.coil'), placed at the berth spawn where the Moth lands");
        }
        await d.use('dm.coil_socket', { after: d.F('story:ch1_done') });
        await d.pump(`${d.F('story:ch1_done')} && window.__VP.ctx.state.story.chapter === "ch2"`, { maxVt: 1200 });
        d.milestone('ch2 card');
        await d.vwait(2);
        await d.shot('c07-ch2', { hi: true });
        await d.journal('journal-ch2-start');
      },
    },
  },

  plan: {
    ch1: {
      // travel.flight runs twice in chapter 1: to Driftmarket (6 s) and home (5 s)
      scenes: {
        'travel.flight': 11, 'driftmarket.arrival': 50, 'driftmarket.ruse_maw': 35, 'driftmarket.return': 50,
        'driftmarket.coil_install': 60,
      },
    },
  },
};
