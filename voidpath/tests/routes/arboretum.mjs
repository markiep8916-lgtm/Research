// Human-pace route of chapter 2 (tools/human-pace.mjs, G2 T-1): the Halcyon after the coil, the
// Moth's flight to the Arboretum, the valve puzzle (introduce, twist, combine), the Stasis Gardens,
// THE GARDENER, Theo in the Choir and the CHAPTER THREE card.
// Chain: ch2 -> ch2.channels -> ch2.stasis -> ch2.gardener -> ch2.choir.

// The Fern Walk, the Glasshouse and the Stasis Gardens are serpentines of raised beds: each bed is open
// at one end only, so the path weaves round them, cutting the corners as a player does (the legs below
// pass half a unit off each bed's open end, about the shortest walk tests/campaign.mjs measures).
const weave = (ends, a, b, step, z0, z1) => ends.flatMap((x, i) => {
  const z = i % 2 ? z1 : z0;
  return [[x + a * step, z], [x + b * step, z]];
});
// weave(near sides of the beds in walking order, ...): two points past each open end, alternating z0 / z1
// The lessons' drones and caretaker stand in a corridor and block it until they are fought, so the
// path walks up to each one first (inside its trigger radius of 2.4).
const fernWeave = weave([18, 23, 28, 33, 38, 43, 48, 53], -0.4, 2.4, 1, 52.5, 45.5);
const FERN = [[16, 50], ...fernWeave.slice(0, 2), [21.5, 48.4], ...fernWeave.slice(2), [56, 47.5]];
// the Glasshouse runs west, so its near sides are the beds' east edges (the start is already under the first)
const GLASS = [[64.5, 41], ...weave([65, 60, 55, 50, 45, 40, 35, 30, 25], -0.4, 2.4, -1, 39.5, 31.5).slice(1), [21, 35.5]];
const stasisWeave = weave([21, 26, 31, 36, 41, 46, 51], -0.4, 2.4, 1, 25.5, 17.5);
const STASIS = [...stasisWeave.slice(0, 2), [24.0, 22.6], ...stasisWeave.slice(2), [54, 20]];

export default {
  segments: {
    // the Halcyon after the CHAPTER TWO card: a word with BOLT, the Starchart, the dock
    ch2: {
      level: 12,
      next: 'ch2.channels',
      async run(d) {
        await d.use('bolt', { optional: true });
        await d.fly('starchart', 'The Arboretum');
        await d.pump(d.F('seen:arboretum:arrival'), { maxVt: 900 });
        d.milestone('arboretum arrival');
        await d.shot('c01-dock', { hi: true });
        await d.use('log_1', { optional: true });
        // valve A (introduce): the dock canal drains toward the Fern Walk
        await d.use('valve_a');
        await d.pump(d.F('arb:valve_a_said'));
        await d.journal('journal-ch2-valve-a');
        // the Fern Walk east: the spore drones' lesson waits on the path
        for (const [x, z] of FERN.slice(0, 4)) await d.go(x, z);
        await d.pump(d.F('arb:spores'));
        await d.vwait(1);
        await d.eval(() => window.__PACE.invalidate());
        for (const [x, z] of FERN.slice(4)) await d.go(x, z);
        d.milestone('fern walk');
        await d.use('fern_cache', { optional: true });
        // valve B (twist): the pump canal drains, and the hall's basin floods
        await d.use('valve_b');
        await d.pump(d.F('arb:valve_b_said'));
        await d.journal('journal-ch2-valve-b');
        await d.use('tender_a', { optional: true });
        await d.use('prism', { optional: true });
        // the Glasshouse west: the Seedling Spear grows in a bed on the way
        for (const [x, z] of GLASS.slice(0, 7)) await d.go(x, z);
        await d.use('spear', { optional: true });
        await d.use('log_2', { optional: true });
        for (const [x, z] of GLASS.slice(7)) await d.go(x, z);
        d.milestone('glasshouse');
        await d.go(8.5, 33.6, { label: 'channels' });
      },
    },
    // the Channels (combine): left, then right
    'ch2.channels': {
      level: 14,
      next: 'ch2.stasis',
      async run(d) {
        await d.shot('c02-channels', { hi: true });
        await d.use('sluice_plate', { optional: true });
        await d.use('valve_c');
        await d.pump();
        await d.use('valve_d');
        await d.pump(d.F('story:channels_drained'));
        d.milestone('channels drained');
        await d.journal('journal-ch2-stasis');
        await d.med('med_hall');
        await d.go(17, 18.5, { label: 'stasis gate' });
      },
    },
    // the Stasis Gardens: the caretaker's lesson, Esme's pod (Sera), the last log, the court
    'ch2.stasis': {
      level: 15,
      next: 'ch2.gardener',
      async run(d) {
        if (d.jumped) await d.pump(null, { minVt: 1 });
        await d.pump(d.F('seen:arboretum:stasis'), { maxVt: 300 });
        d.milestone('stasis gardens');
        await d.shot('c03-stasis', { hi: true });
        for (const [x, z] of STASIS.slice(0, 3)) await d.go(x, z);
        await d.pump(d.F('arb:caretaker'));
        await d.vwait(1);
        await d.eval(() => window.__PACE.invalidate());
        for (const [x, z] of STASIS.slice(3, 8)) await d.go(x, z);
        await d.use('esme', { optional: true });
        await d.use('stasis_cache', { optional: true });
        for (const [x, z] of STASIS.slice(8)) await d.go(x, z);
        await d.use('log_3', { optional: true });
        await d.med('med_court');
        d.milestone('court');
      },
    },
    // THE GARDENER (Retry after a loss), then MOTHER-7 freed and the Choir door
    'ch2.gardener': {
      level: 17,
      next: 'ch2.choir',
      async run(d) {
        await d.fightBoss({
          at: [60.5, 20.5], script: 'arboretum.gardener', done: d.F('defeated:arb_boss_gardener'),
          onLoss: async () => { if ((await d.snap()).map === 'arboretum') await d.med('med_court', { talk: false }); },
        });
        await d.pump(`${d.F('arb:mother7_freed')} && window.__PACE.snap().map === "arboretum"`, { maxVt: 600 });
        d.milestone('gardener');
      },
    },
    // the Choir: up the aisle to pod 2271, WARDEN's offer, the CHAPTER THREE card
    'ch2.choir': {
      level: 17,
      next: 'ch3',
      async run(d) {
        await d.shot('c04-choir', { hi: true });
        await d.go(64, 6.2, { until: d.F('seen:arboretum:theo') });
        await d.pump(`${d.F('story:ch2_done')} && window.__VP.ctx.state.story.chapter === "ch3"`, { maxVt: 1200 });
        d.milestone('ch3 card');
        await d.vwait(2);
      },
    },
  },

  plan: {
    ch2: {
      scenes: {
        'arboretum.arrival': 70, 'arboretum.spores': 10, 'arboretum.channels_drained': 15, 'arboretum.stasis_gardens': 45,
        'arboretum.caretaker': 10, 'arboretum.gardener': 120, 'arboretum.theo': 150,
      },
      bosses: { arb_boss_gardener: 17 },
    },
  },

  // expected-fights walks floor cells only, so the legs start past the drained canals (the walking it
  // drops there is in puzzle areas, where no fights come anyway)
  legs: [
    {
      chapter: 'ch2', label: 'Fern Walk: dock canal -> pump house', map: 'arboretum', flags: ['sw:arboretum:valve_a'],
      points: [[14.5, 47], { fight: 'arb_spores' }, ...FERN, [61, 47]],
    },
    {
      chapter: 'ch2', label: 'Glasshouse: pump canal -> the Channels', map: 'arboretum', flags: ['sw:arboretum:valve_a', 'sw:arboretum:valve_b'],
      points: GLASS.concat([[15, 35.5]]),
    },
    {
      chapter: 'ch2', label: 'Stasis Gardens: the hall -> Choir Gate', map: 'arboretum', flags: ['arb:sluice', 'story:channels_drained'],
      points: [[17, 18.5], { fight: 'arb_caretaker' }, ...STASIS, [58, 20]],
    },
  ],
};
